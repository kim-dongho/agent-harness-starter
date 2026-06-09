/**
 * Step 2 — AI 에이전트 룰 세팅
 *
 * 선택한 에이전트에 맞는 포맷으로 룰 파일을 복사한다:
 * - 에이전트 기본 템플릿 (CLAUDE.md, .cursorrules 등)
 * - 코어 룰 (thinking-model, surgical-changes, verify)
 * - 스택별 룰 (react/, go/, solidity/ 등)
 */
import path from 'node:path';
import fs from 'fs-extra';
import { AGENTS, getStackRuleDirs, getStackCategory, type AgentValue } from '../constants.js';
import { TEMPLATES_DIR, getStackLabel } from './utils.js';
import type { UserChoices } from '../prompts/types.js';

/**
 * AI 에이전트 룰 파일을 프로젝트에 세팅한다.
 *
 * 에이전트 기본 템플릿, 코어 룰, 스택별 룰을 순서대로 복사한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리 절대 경로
 * @param choices - 사용자 선택 결과
 * @returns 복사된 총 파일 수
 */
export async function setupAgentRules(projectDir: string, choices: UserChoices): Promise<number> {
  const agentConfig = AGENTS.find((a) => a.value === choices.agent);
  if (!agentConfig) return 0;

  let fileCount = 0;
  const agentDir = path.join(projectDir, agentConfig.dir);

  // 1. 에이전트 기본 템플릿 복사
  fileCount += await copyAgentTemplate(projectDir, agentDir, choices.agent);

  // 2. 코어 룰 복사
  const rulesTargetDir = getRulesTargetDir(agentDir, choices.agent);
  await fs.ensureDir(rulesTargetDir);
  fileCount += await copyCoreRules(rulesTargetDir);

  // 3. 스택별 룰 폴더 복사 (모노레포면 모든 스택의 룰)
  const stacksToProcess = choices.stacks
    ? choices.stacks.map((s) => s.stack)
    : [choices.stack];
  fileCount += await copyStackRules(rulesTargetDir, stacksToProcess, choices.agent);

  // 4. skills 복사 (Aider 제외 — SKILL.md 미지원)
  if (choices.agent !== 'aider') {
    fileCount += await copySkills(projectDir, stacksToProcess, choices.agent);
  }

  // 5. 플레이스홀더를 실제 값으로 치환
  await replacePlaceholders(projectDir, choices);

  return fileCount;
}

/** 에이전트별 기본 템플릿 복사 */
async function copyAgentTemplate(projectDir: string, agentDir: string, agent: AgentValue): Promise<number> {
  const agentTemplateDir = path.join(TEMPLATES_DIR, 'agents', agent);
  if (!(await fs.pathExists(agentTemplateDir))) return 0;

  if (agent === 'copilot') {
    await fs.copy(path.join(agentTemplateDir, '.github'), path.join(projectDir, '.github'));
  } else if (agent === 'cline') {
    await fs.copy(path.join(agentTemplateDir, '.clinerules'), path.join(projectDir, '.clinerules'));
  } else {
    await fs.copy(agentTemplateDir, agentDir);
  }

  return 2;
}

/** core 룰 복사 (thinking-model, surgical-changes, verify) */
async function copyCoreRules(rulesTargetDir: string): Promise<number> {
  const coreRulesDir = path.join(TEMPLATES_DIR, 'rules', 'core');
  if (!(await fs.pathExists(coreRulesDir))) return 0;

  const coreFiles = await fs.readdir(coreRulesDir);
  for (const file of coreFiles) {
    await fs.copy(path.join(coreRulesDir, file), path.join(rulesTargetDir, file));
  }
  return coreFiles.length;
}

/**
 * 스택별 룰 폴더 복사 (중복 방지)
 *
 * Claude 선택 시: 보안 상세 파일은 스킵 (skills에서 커버)
 * 다른 에이전트: 전체 복사 (skills 미지원이므로 rules에 모든 내용 포함)
 */
async function copyStackRules(rulesTargetDir: string, stacks: string[], agent: AgentValue): Promise<number> {
  const stackRulesDir = path.join(TEMPLATES_DIR, 'rules', 'stack');
  const copiedDirs = new Set<string>();
  let fileCount = 0;

  // 블록체인 스택의 security.md는 체인 특화(Sealevel, Move 등)이므로 항상 포함
  // 그 외 스택(Go, Python 등)의 security.md는 skills의 security-audit과 중복되므로 스킵
  // Aider는 skills 미지원이라 전부 포함
  const blockchainRuleDirs = new Set(['solidity', 'solana', 'move', 'ton', 'cosmwasm']);

  for (const stack of stacks) {
    const stackDirs = getStackRuleDirs(stack as any);
    for (const dir of stackDirs) {
      if (copiedDirs.has(dir)) continue;
      const src = path.join(stackRulesDir, dir);
      if (await fs.pathExists(src)) {
        const destDir = path.join(rulesTargetDir, dir);
        await fs.ensureDir(destDir);

        // 블록체인 디렉토리는 security.md 포함, 그 외는 스킵 (Aider는 전부 포함)
        const skipPatterns = (agent !== 'aider' && !blockchainRuleDirs.has(dir))
          ? ['security.md']
          : [];

        const files = await fs.readdir(src);
        for (const file of files) {
          if (skipPatterns.some((p) => file === p)) continue;
          await fs.copy(path.join(src, file), path.join(destDir, file));
          fileCount++;
        }
        copiedDirs.add(dir);
      }
    }
  }

  return fileCount;
}

// ─── Skills 복사 (SKILL.md 오픈 스탠다드) ───

/**
 * 스택 카테고리에 맞는 skills를 에이전트별 경로에 복사한다.
 *
 * SKILL.md는 오픈 스탠다드(agentskills.io)로 Claude, Cursor, Windsurf,
 * Cline, Copilot, Gemini가 모두 지원한다. 경로만 에이전트별로 다르다.
 *
 * common은 항상, frontend/backend/blockchain은 해당 스택 선택 시에만.
 */
async function copySkills(projectDir: string, stacks: string[], agent: AgentValue): Promise<number> {
  const skillsSrc = path.join(TEMPLATES_DIR, 'skills');
  const skillsDest = getSkillsTargetDir(projectDir, agent);
  if (!(await fs.pathExists(skillsSrc))) return 0;

  let fileCount = 0;

  // common은 항상 복사
  const commonSrc = path.join(skillsSrc, 'common');
  if (await fs.pathExists(commonSrc)) {
    await fs.copy(commonSrc, skillsDest);
    fileCount += await countFiles(commonSrc);
  }

  // 스택 카테고리별 skills 복사
  const categories = new Set(stacks.map((s) => getStackCategory(s as any)));

  if (categories.has('frontend') || categories.has('mobile')) {
    const feSrc = path.join(skillsSrc, 'frontend');
    if (await fs.pathExists(feSrc)) {
      await fs.copy(feSrc, skillsDest, { overwrite: false });
      fileCount += await countFiles(feSrc);
    }
  }

  if (categories.has('node-backend') || categories.has('go') || categories.has('python') || categories.has('java')) {
    const beSrc = path.join(skillsSrc, 'backend');
    if (await fs.pathExists(beSrc)) {
      await fs.copy(beSrc, skillsDest, { overwrite: false });
      fileCount += await countFiles(beSrc);
    }
  }

  if (categories.has('blockchain')) {
    const bcSrc = path.join(skillsSrc, 'blockchain');
    if (await fs.pathExists(bcSrc)) {
      await fs.copy(bcSrc, skillsDest, { overwrite: false });
      fileCount += await countFiles(bcSrc);
    }
  }

  // workflow skills는 항상 복사 (/start, /done, /review)
  const wfSrc = path.join(skillsSrc, 'workflow');
  if (await fs.pathExists(wfSrc)) {
    await fs.copy(wfSrc, skillsDest, { overwrite: false });
    fileCount += await countFiles(wfSrc);
  }

  return fileCount;
}

/** 디렉토리 내 파일 수 재귀 카운트 */
async function countFiles(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

/**
 * 에이전트별 skills 디렉토리 경로를 반환한다.
 *
 * SKILL.md 오픈 스탠다드: 같은 포맷, 경로만 다름.
 * .agents/skills/ 도 지원하지만, 에이전트 고유 경로를 우선 사용.
 */
function getSkillsTargetDir(projectDir: string, agent: AgentValue): string {
  switch (agent) {
    case 'claude':
      return path.join(projectDir, '.claude', 'skills');
    case 'cursor':
      return path.join(projectDir, '.cursor', 'skills');
    case 'windsurf':
      return path.join(projectDir, '.windsurf', 'skills');
    case 'cline':
      return path.join(projectDir, '.cline', 'skills');
    case 'copilot':
      return path.join(projectDir, '.github', 'skills');
    case 'gemini':
      return path.join(projectDir, '.gemini', 'skills');
    default:
      return path.join(projectDir, '.agents', 'skills');
  }
}

// ─── 플레이스홀더 치환 ───

/**
 * 에이전트 템플릿 파일의 플레이스홀더를 실제 값으로 치환한다.
 *
 * 대상: {{PROJECT_NAME}}, {{STACK}}, {{BUILD_COMMAND}}, {{TEST_COMMAND}}, {{LINT_COMMAND}}
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @param choices - 사용자 선택 결과
 */
async function replacePlaceholders(projectDir: string, choices: UserChoices): Promise<void> {
  const stackLabel = getStackLabel(choices.stack);
  const commands = getStackCommands(choices);

  const namingLabels: Record<string, string> = {
    'kebab-case': 'kebab-case (user-profile.tsx)',
    'PascalCase': 'PascalCase (UserProfile.tsx)',
    'camelCase': 'camelCase (userProfile.tsx)',
  };

  const wf = getWorkflowCommands(choices);

  const replacements: Record<string, string> = {
    '{{PROJECT_NAME}}': choices.projectName,
    '{{STACK}}': stackLabel,
    '{{BUILD_COMMAND}}': commands.build,
    '{{TEST_COMMAND}}': commands.test,
    '{{LINT_COMMAND}}': commands.lint,
    '{{NAMING_CONVENTION}}': namingLabels[choices.namingConvention ?? 'kebab-case'] ?? 'kebab-case',
    '{{ISSUE_FETCH_COMMAND}}': wf.issueFetch,
    '{{ISSUE_STATUS_COMMAND}}': wf.issueStatus,
    '{{ISSUE_DONE_COMMAND}}': wf.issueDone,
    '{{PR_CREATE_COMMAND}}': wf.prCreate,
    '{{BASE_BRANCH}}': wf.baseBranch,
  };

  // 에이전트 디렉토리 내 모든 md/mdc/yml/json 파일을 탐색
  await replaceInDir(projectDir, replacements);
}

/**
 * 디렉토리 내 모든 텍스트 파일에서 플레이스홀더를 치환한다.
 */
async function replaceInDir(dir: string, replacements: Record<string, string>): Promise<void> {
  const AGENT_DIRS = ['.claude', '.cursor', '.windsurf', '.cline', '.clinerules', '.github', '.aider', '.gemini'];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && AGENT_DIRS.includes(entry.name)) {
      await replaceInDirRecursive(fullPath, replacements);
    } else if (entry.isFile() && isReplaceable(entry.name)) {
      await replaceInFile(fullPath, replacements);
    }
  }
}

async function replaceInDirRecursive(dir: string, replacements: Record<string, string>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await replaceInDirRecursive(fullPath, replacements);
    } else if (isReplaceable(entry.name)) {
      await replaceInFile(fullPath, replacements);
    }
  }
}

async function replaceInFile(filePath: string, replacements: Record<string, string>): Promise<void> {
  let content = await fs.readFile(filePath, 'utf-8');
  let changed = false;

  for (const [placeholder, value] of Object.entries(replacements)) {
    if (content.includes(placeholder)) {
      content = content.replaceAll(placeholder, value);
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(filePath, content);
  }
}

/** 치환 대상 파일 확장자 */
function isReplaceable(filename: string): boolean {
  return /\.(md|mdc|yml|yaml|json|toml|txt)$/.test(filename);
}

/**
 * 스택별 빌드/테스트/린트 커맨드를 반환한다.
 */
function getStackCommands(choices: UserChoices): { build: string; test: string; lint: string } {
  const pm = choices.packageManager ?? 'npm';
  const category = getStackCategory(choices.stack);
  const linter = choices.linter;

  switch (category) {
    case 'frontend':
    case 'node-backend':
      return {
        build: `${pm} run build`,
        test: choices.testFramework === 'vitest' ? `${pm} run test` : `${pm} run test`,
        lint: linter === 'biome' ? `${pm} run biome check .` : `${pm} run lint`,
      };
    case 'go':
      return {
        build: 'go build ./...',
        test: 'go test ./...',
        lint: choices.goLinter === 'staticcheck' ? 'staticcheck ./...' : 'golangci-lint run',
      };
    case 'python':
      return {
        build: '-',
        test: 'pytest',
        lint: 'ruff check .',
      };
    case 'java':
      return {
        build: choices.buildTool === 'maven' ? 'mvn package' : 'gradle build',
        test: choices.buildTool === 'maven' ? 'mvn test' : 'gradle test',
        lint: 'checkstyle',
      };
    case 'blockchain':
      if (['solidity-hardhat'].includes(choices.stack)) {
        return { build: 'npx hardhat compile', test: 'npx hardhat test', lint: 'npx solhint .' };
      }
      if (['solidity-foundry'].includes(choices.stack)) {
        return { build: 'forge build', test: 'forge test', lint: 'forge fmt --check' };
      }
      if (choices.stack === 'solana-anchor') {
        return { build: 'anchor build', test: 'anchor test', lint: 'cargo clippy' };
      }
      if (['move-sui'].includes(choices.stack)) {
        return { build: 'sui move build', test: 'sui move test', lint: '-' };
      }
      if (['move-aptos'].includes(choices.stack)) {
        return { build: 'aptos move compile', test: 'aptos move test', lint: '-' };
      }
      if (choices.stack === 'ton-tact') {
        return { build: 'npx tact --config tact.config.json', test: 'npx jest', lint: '-' };
      }
      if (choices.stack === 'cosmwasm') {
        return { build: 'cargo wasm', test: 'cargo test', lint: 'cargo clippy' };
      }
      return { build: '-', test: '-', lint: '-' };
    case 'mobile':
      if (choices.stack === 'flutter') {
        return { build: 'flutter build', test: 'flutter test', lint: 'flutter analyze' };
      }
      return { build: `${pm} run build`, test: `${pm} run test`, lint: `${pm} run lint` };
    default:
      return { build: `${pm} run build`, test: `${pm} run test`, lint: `${pm} run lint` };
  }
}

/**
 * 이슈 트래커 + Git 플랫폼에 따른 워크플로우 CLI 커맨드를 반환한다.
 */
function getWorkflowCommands(choices: UserChoices): {
  issueFetch: string;
  issueStatus: string;
  issueDone: string;
  prCreate: string;
  baseBranch: string;
} {
  const tracker = choices.issueTracker ?? 'none';
  const platform = choices.gitPlatform ?? 'github';

  // 이슈 조회
  const issueFetchMap: Record<string, string> = {
    'jira': '```bash\n# Jira API — JIRA_URL, JIRA_TOKEN, JIRA_EMAIL 환경변수 필요\ncurl -s -u "$JIRA_EMAIL:$JIRA_TOKEN" "$JIRA_URL/rest/api/3/issue/<이슈번호>" | jq .fields.summary,.fields.description,.fields.issuetype.name\n```',
    'none': '이슈 트래커가 설정되지 않았다. 사용자에게 작업 내용을 직접 확인한다.',
  };

  // 이슈 상태 → 진행 중
  const issueStatusMap: Record<string, string> = {
    'jira': '```bash\ncurl -s -X POST -u "$JIRA_EMAIL:$JIRA_TOKEN" \\\n  "$JIRA_URL/rest/api/3/issue/<이슈번호>/transitions" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"transition":{"id":"21"}}\' # 21 = In Progress (프로젝트별 상이)\n```',
    'none': '이슈 트래커가 설정되지 않았다. 생략.',
  };

  // 이슈 상태 → 완료/리뷰 대기
  const issueDoneMap: Record<string, string> = {
    'jira': '```bash\ncurl -s -X POST -u "$JIRA_EMAIL:$JIRA_TOKEN" \\\n  "$JIRA_URL/rest/api/3/issue/<이슈번호>/transitions" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"transition":{"id":"31"}}\' # 31 = Done (프로젝트별 상이)\n```',
    'none': 'MR 본문에 "Closes #<이슈번호>" 포함하면 머지 시 자동 닫힘.',
  };

  // MR 생성 (GitLab 고정)
  const prCreate = '```bash\nglab mr create --title "<제목>" --description "<본문>"\n```';

  return {
    issueFetch: issueFetchMap[tracker] ?? issueFetchMap['none'],
    issueStatus: issueStatusMap[tracker] ?? issueStatusMap['none'],
    issueDone: issueDoneMap[tracker] ?? issueDoneMap['none'],
    prCreate,
    baseBranch: 'main',
  };
}

/** 에이전트별 룰 파일이 들어갈 디렉토리 경로 */
function getRulesTargetDir(agentDir: string, agent: AgentValue): string {
  switch (agent) {
    case 'claude':
    case 'cursor':
    case 'windsurf':
    case 'gemini':
      return path.join(agentDir, 'rules');
    case 'cline':
      return path.join(agentDir, '..', '.clinerules');
    case 'copilot':
      return path.join(agentDir, '..', '.github', 'instructions');
    case 'aider':
      return agentDir;
    default:
      return path.join(agentDir, 'rules');
  }
}
