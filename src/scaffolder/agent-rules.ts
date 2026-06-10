/**
 * Step 2 — AI 에이전트 룰 세팅 (Adapter 패턴)
 *
 * harness.config.json → 어댑터가 에이전트별 포맷으로 변환한다.
 * 단일 config에서 7개 에이전트 설정을 동적 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import { getStackRuleDirs, getStackCategory, type AgentValue } from '../constants.js';
import { TEMPLATES_DIR } from './utils.js';
import { getAdapter, type AgentType } from '../engines/adapters/index.js';
import { loadStackRules, loadStackRulesByDir } from '../engines/adapters/loaders.js';
import type { HarnessConfig } from '../engines/adapters/types.js';
import type { UserChoices } from '../prompts/types.js';

/**
 * AI 에이전트 룰 파일을 프로젝트에 세팅한다.
 *
 * 1. harness.config.json 읽기
 * 2. 스택별 rules 로드
 * 3. 어댑터로 에이전트 설정 파일 동적 생성
 * 4. skills 복사 (SKILL.md 공통 포맷)
 * 5. skills 내 플레이스홀더 치환
 *
 * @param projectDir - 프로젝트 루트 디렉토리 절대 경로
 * @param choices - 사용자 선택 결과
 * @returns 생성된 총 파일 수
 */
export async function setupAgentRules(projectDir: string, choices: UserChoices): Promise<number> {
  let fileCount = 0;

  // 1. harness.config.json 읽기
  const configPath = path.join(projectDir, 'harness.config.json');
  if (!(await fs.pathExists(configPath))) return 0;
  const config: HarnessConfig = await fs.readJson(configPath);

  // 2. 스택별 rules 로드
  const stacksToProcess = choices.stacks
    ? choices.stacks.map((s) => s.stack)
    : [choices.stack];
  const stackDirs = [...new Set(stacksToProcess.flatMap((s) => getStackRuleDirs(s as any)))];
  const stackRules = await loadStackRules(TEMPLATES_DIR, stackDirs);
  const stackRulesByDir = await loadStackRulesByDir(TEMPLATES_DIR, stackDirs);

  // 3. 어댑터로 에이전트 설정 파일 동적 생성
  const adapter = getAdapter(choices.agent as AgentType);
  const output = await adapter.generate(projectDir, config, stackRules, stackRulesByDir);

  for (const file of output.files) {
    const dest = path.join(projectDir, file.path);
    await fs.ensureDir(path.dirname(dest));
    await fs.writeFile(dest, file.content);
    if (file.executable) await fs.chmod(dest, 0o755);
    fileCount++;
  }

  // 4. skills 복사 (Aider 제외 — SKILL.md 미지원)
  if (adapter.supportsSkills) {
    fileCount += await copySkills(projectDir, stacksToProcess, choices.agent);
  }

  // 5. skills 내 플레이스홀더 치환
  await replaceSkillPlaceholders(projectDir, choices);

  return fileCount;
}

// ─── Skills 복사 (SKILL.md 오픈 스탠다드) ───

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

  if (categories.has('blockchain')) {
    const bcSrc = path.join(skillsSrc, 'blockchain');
    if (await fs.pathExists(bcSrc)) {
      await fs.copy(bcSrc, skillsDest, { overwrite: false });
      fileCount += await countFiles(bcSrc);
    }
  }

  // workflow skills는 항상 복사
  const wfSrc = path.join(skillsSrc, 'workflow');
  if (await fs.pathExists(wfSrc)) {
    await fs.copy(wfSrc, skillsDest, { overwrite: false });
    fileCount += await countFiles(wfSrc);
  }

  return fileCount;
}

async function countFiles(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) count += await countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

function getSkillsTargetDir(projectDir: string, agent: AgentValue): string {
  const map: Record<string, string> = {
    claude: '.claude/skills',
    cursor: '.cursor/skills',
    windsurf: '.windsurf/skills',
    cline: '.cline/skills',
    copilot: '.github/skills',
    gemini: '.gemini/skills',
  };
  return path.join(projectDir, map[agent] ?? '.agents/skills');
}

// ─── 플레이스홀더 치환 (skills 전용) ───

async function replaceSkillPlaceholders(projectDir: string, choices: UserChoices): Promise<void> {
  const commands = getStackCommands(choices);
  const wf = getWorkflowCommands(choices);

  const replacements: Record<string, string> = {
    '{{PROJECT_NAME}}': choices.projectName,
    '{{STACK}}': choices.stack,
    '{{BUILD_COMMAND}}': commands.build,
    '{{TEST_COMMAND}}': commands.test,
    '{{LINT_COMMAND}}': commands.lint,
    '{{ISSUE_FETCH_COMMAND}}': wf.issueFetch,
    '{{ISSUE_STATUS_COMMAND}}': wf.issueStatus,
    '{{ISSUE_DONE_COMMAND}}': wf.issueDone,
    '{{PR_CREATE_COMMAND}}': wf.prCreate,
    '{{BASE_BRANCH}}': wf.baseBranch,
  };

  // skills 디렉토리 내 모든 md 파일 치환
  const skillDirs = ['.claude/skills', '.cursor/skills', '.windsurf/skills', '.cline/skills', '.github/skills', '.gemini/skills'];
  for (const dir of skillDirs) {
    const fullDir = path.join(projectDir, dir);
    if (await fs.pathExists(fullDir)) {
      await replaceInDirRecursive(fullDir, replacements);
    }
  }

  // 루트 파일 (CONVENTIONS.md, GEMINI.md 등) 치환
  for (const file of ['CONVENTIONS.md', 'GEMINI.md']) {
    const filePath = path.join(projectDir, file);
    if (await fs.pathExists(filePath)) {
      await replaceInFile(filePath, replacements);
    }
  }
}

async function replaceInDirRecursive(dir: string, replacements: Record<string, string>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await replaceInDirRecursive(fullPath, replacements);
    else if (/\.(md|mdc|yml|yaml|json|toml|txt)$/.test(entry.name)) await replaceInFile(fullPath, replacements);
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
  if (changed) await fs.writeFile(filePath, content);
}

// ─── 커맨드 매핑 (기존 유지) ───

function getStackCommands(choices: UserChoices): { build: string; test: string; lint: string } {
  const pm = choices.packageManager ?? 'npm';
  const category = getStackCategory(choices.stack);
  const linter = choices.linter;

  switch (category) {
    case 'frontend':
    case 'node-backend':
      return {
        build: `${pm} run build`,
        test: `${pm} run test`,
        lint: linter === 'biome' ? `${pm} run biome check .` : `${pm} run lint`,
      };
    case 'go':
      return { build: 'go build ./...', test: 'go test ./...', lint: 'golangci-lint run' };
    case 'python':
      return { build: '-', test: 'pytest', lint: 'ruff check .' };
    case 'java':
      return {
        build: choices.buildTool === 'maven' ? 'mvn package' : 'gradle build',
        test: choices.buildTool === 'maven' ? 'mvn test' : 'gradle test',
        lint: 'checkstyle',
      };
    case 'rust':
      return { build: 'cargo build', test: 'cargo test', lint: 'cargo clippy' };
    case 'blockchain':
      if (choices.stack === 'solidity-hardhat') return { build: 'npx hardhat compile', test: 'npx hardhat test', lint: 'npx solhint .' };
      if (choices.stack === 'solidity-foundry') return { build: 'forge build', test: 'forge test', lint: 'forge fmt --check' };
      if (choices.stack === 'solana-anchor') return { build: 'anchor build', test: 'anchor test', lint: 'cargo clippy' };
      if (choices.stack === 'move-sui') return { build: 'sui move build', test: 'sui move test', lint: '-' };
      return { build: '-', test: '-', lint: '-' };
    default:
      return { build: `${pm} run build`, test: `${pm} run test`, lint: `${pm} run lint` };
  }
}

function getWorkflowCommands(choices: UserChoices) {
  const tracker = choices.issueTracker ?? 'none';

  const issueFetchMap: Record<string, string> = {
    jira: '```bash\ncurl -s -u "$JIRA_EMAIL:$JIRA_TOKEN" "$JIRA_URL/rest/api/3/issue/<이슈번호>" | jq .fields.summary,.fields.description,.fields.issuetype.name\n```',
    none: '이슈 트래커가 설정되지 않았다. 사용자에게 작업 내용을 직접 확인한다.',
  };
  const issueStatusMap: Record<string, string> = {
    jira: '```bash\ncurl -s -X POST -u "$JIRA_EMAIL:$JIRA_TOKEN" "$JIRA_URL/rest/api/3/issue/<이슈번호>/transitions" -H "Content-Type: application/json" -d \'{"transition":{"id":"21"}}\'\n```',
    none: '생략.',
  };
  const issueDoneMap: Record<string, string> = {
    jira: '```bash\ncurl -s -X POST -u "$JIRA_EMAIL:$JIRA_TOKEN" "$JIRA_URL/rest/api/3/issue/<이슈번호>/transitions" -H "Content-Type: application/json" -d \'{"transition":{"id":"31"}}\'\n```',
    none: 'MR 본문에 "Closes #<이슈번호>" 포함.',
  };

  return {
    issueFetch: issueFetchMap[tracker] ?? issueFetchMap.none,
    issueStatus: issueStatusMap[tracker] ?? issueStatusMap.none,
    issueDone: issueDoneMap[tracker] ?? issueDoneMap.none,
    prCreate: '```bash\nglab mr create --title "<제목>" --description "<본문>"\n```',
    baseBranch: 'main',
  };
}
