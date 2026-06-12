/**
 * harness hooks 생성기
 *
 * scope-guard, scaffold-guard, post-write, session-init 훅 스크립트를
 * 프로젝트에 복사하고 에이전트별 설정 파일에 등록한다.
 *
 * 지원 에이전트: Claude Code, Gemini CLI, Codex CLI, Cursor, Windsurf, Cline, Copilot, Aider
 */
import path from 'node:path';
import fs from 'fs-extra';
import { TEMPLATES_DIR } from '../scaffolder/utils.js';

/** 에이전트별 hooks 디렉토리 매핑 */
const HOOKS_DIR_MAP: Record<string, string> = {
  claude: '.claude/hooks',
  gemini: '.gemini/hooks',
  codex: '.codex/hooks',
  cursor: '.cursor/hooks',
  windsurf: '.windsurf/hooks',
  cline: '.clinerules/hooks',
  copilot: '.github/hooks',
  aider: '.aider/hooks',
};

/**
 * hook 스크립트를 에이전트별 디렉토리에 복사한다.
 */
async function copyHookScripts(projectDir: string, agent: string): Promise<number> {
  const hooksSrc = path.join(TEMPLATES_DIR, 'hooks');
  const hooksDir = HOOKS_DIR_MAP[agent];
  if (!hooksDir) return 0;

  const hooksDest = path.join(projectDir, hooksDir);
  if (!(await fs.pathExists(hooksSrc))) return 0;

  await fs.ensureDir(hooksDest);
  const hookFiles = await fs.readdir(hooksSrc);
  let count = 0;

  for (const file of hookFiles) {
    if (!file.endsWith('.sh')) continue;
    await fs.copy(path.join(hooksSrc, file), path.join(hooksDest, file));
    await fs.chmod(path.join(hooksDest, file), 0o755);
    count++;
  }
  return count;
}

/** Stop hook의 agent 프롬프트 (Claude/Codex/Gemini 공통) */
const STOP_AGENT_PROMPT = [
  '아래를 순서대로 수행하라.',
  '',
  '## 0. 무한 루프 방지',
  '`.harness/review-count` 파일을 읽어라. 숫자가 3 이상이면 "리뷰 3회 초과 — 스킵합니다"를 출력하고 ok: true를 반환하라.',
  '파일이 없으면 0으로 간주한다. 리뷰 실행 후 숫자를 +1하여 저장한다.',
  '리뷰 통과(ok: true) 시 파일을 삭제하여 카운터를 초기화한다.',
  '',
  '## 1. Adversarial Code Review (feedback.md 기반)',
  '',
  '### 이전 피드백 확인',
  '`.harness/feedback.md`가 존재하면 이전 리뷰 피드백이 있다.',
  '이전 피드백에서 지적한 사항이 수정되었는지 `git diff HEAD`로 확인한다.',
  '수정되지 않은 항목이 있으면 다시 지적한다.',
  '',
  '### 코드 리뷰',
  '`git diff HEAD`로 변경된 파일을 확인하고, 변경된 코드만 리뷰한다.',
  '변경이 없으면 스킵한다.',
  '리뷰 기준:',
  '- 정확성: 로직 에러, 엣지 케이스 누락',
  '- 보안: 미검증 입력, 하드코딩 시크릿',
  '- 성능: N+1, 불필요한 루프',
  '- 컨벤션: harness.config.json의 codingStandards 위반',
  '- 스코프: 요청 범위 밖 변경',
  '',
  '## 2. Intent Verification',
  '',
  '`docs/features/*.md` 또는 `docs/designs/*.md`가 존재하면 수행한다. 없으면 스킵.',
  '',
  '`git diff HEAD`로 변경된 파일 목록을 스펙과 대조한다:',
  '- 스펙에 정의된 기능인데 테스트가 없으면 → "테스트 누락" 경고',
  '- 스펙에 없는 파일이 변경됐으면 → "스코프 벗어남" 경고',
  '- 스펙의 인터페이스(input/output)와 구현이 다르면 → "의도 이탈" 경고',
  '',
  '### 결과 기록',
  '코드 리뷰 + Intent Verification을 종합하여 판정한다.',
  '',
  '문제 발견 시:',
  '  1. `.harness/feedback.md`에 리뷰 + 의도 검증 결과를 기록한다 (날짜, 파일, 지적 사항)',
  '  2. ok: false를 반환한다',
  '',
  '문제 없으면:',
  '  1. `.harness/feedback.md`를 삭제한다',
  '  2. `.harness/review-count`를 삭제한다',
  '  3. ok: true를 반환한다',
  '',
  '## 3. Learnings Loop',
  '.harness/errors.log 파일이 존재하고 내용이 있으면 분석하여 .harness/learnings.json에 학습 기록을 추가하라.',
  '파일이 없거나 비어있으면 스킵한다.',
  '기록 형식: { "id": "learn-NNN", "date": "YYYY-MM-DD", "category": "code-pattern|architecture|convention|testing|scope", "mistake": "한 줄 요약", "correction": "올바른 방법", "rule": "앞으로 지켜야 할 규칙" }',
  '분석 후 errors.log를 비운다.',
].join('\n');

/** hook 경로 헬퍼 — 에이전트별 환경변수 또는 상대경로 */
function hookCmd(agent: string, hookFile: string): string {
  const dir = HOOKS_DIR_MAP[agent];
  switch (agent) {
    case 'claude': return `\${CLAUDE_PROJECT_DIR}/${dir}/${hookFile}`;
    case 'gemini': return `$GEMINI_PROJECT_DIR/${dir}/${hookFile}`;
    default: return `${dir}/${hookFile}`;
  }
}

// ── 에이전트별 settings 생성 ──

function generateClaudeSettings(projectDir: string) {
  const dir = HOOKS_DIR_MAP.claude;
  const h = (f: string) => `\${CLAUDE_PROJECT_DIR}/${dir}/${f}`;
  return {
    PreToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('scope-guard.sh'), statusMessage: 'Checking file scope...' }] },
      { matcher: 'Write', hooks: [{ type: 'command', command: h('scaffold-guard.sh'), statusMessage: 'Checking scaffolder usage...' }] },
    ],
    PostToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('post-write.sh'), statusMessage: 'Checking architecture rules...' }] },
    ],
    SessionStart: [
      { hooks: [{ type: 'command', command: h('session-init.sh'), once: true }] },
    ],
    Stop: [
      { hooks: [
        { type: 'command', command: h('stop-review.sh'), statusMessage: 'Running final harness review...' },
        { type: 'agent', prompt: STOP_AGENT_PROMPT, timeout: 60 },
      ] },
    ],
  };
}

function generateGeminiSettings(_projectDir: string) {
  const h = (f: string) => hookCmd('gemini', f);
  return {
    BeforeTool: [
      { matcher: 'write_file|replace', hooks: [{ name: 'scope-guard', type: 'command', command: h('scope-guard.sh') }] },
      { matcher: 'write_file', hooks: [{ name: 'scaffold-guard', type: 'command', command: h('scaffold-guard.sh') }] },
    ],
    AfterTool: [
      { matcher: 'write_file|replace', hooks: [{ name: 'post-write', type: 'command', command: h('post-write.sh') }] },
    ],
    SessionStart: [
      { hooks: [{ name: 'session-init', type: 'command', command: h('session-init.sh') }] },
    ],
  };
}

function generateCodexSettings(_projectDir: string) {
  const h = (f: string) => hookCmd('codex', f);
  return {
    PreToolUse: [
      { matcher: 'Bash', hooks: [{ type: 'command', command: h('scope-guard.sh'), statusMessage: 'Checking file scope...', timeout: 30 }] },
    ],
    PostToolUse: [
      { matcher: 'Bash', hooks: [{ type: 'command', command: h('post-write.sh'), statusMessage: 'Checking architecture rules...', timeout: 30 }] },
    ],
  };
}

function generateCursorSettings(_projectDir: string) {
  const h = (f: string) => hookCmd('cursor', f);
  return {
    PreToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('scope-guard.sh') }] },
      { matcher: 'Write', hooks: [{ type: 'command', command: h('scaffold-guard.sh') }] },
    ],
    PostToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('post-write.sh') }] },
    ],
  };
}

function generateWindsurfSettings(_projectDir: string) {
  const h = (f: string) => hookCmd('windsurf', f);
  return {
    PreToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('scope-guard.sh') }] },
      { matcher: 'Write', hooks: [{ type: 'command', command: h('scaffold-guard.sh') }] },
    ],
    PostToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('post-write.sh') }] },
    ],
  };
}

function generateClineSettings(_projectDir: string) {
  const h = (f: string) => hookCmd('cline', f);
  return {
    PreToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('scope-guard.sh') }] },
      { matcher: 'Write', hooks: [{ type: 'command', command: h('scaffold-guard.sh') }] },
    ],
    PostToolUse: [
      { matcher: 'Write|Edit', hooks: [{ type: 'command', command: h('post-write.sh') }] },
    ],
  };
}

function generateCopilotSettings(_projectDir: string) {
  const h = (f: string) => hookCmd('copilot', f);
  return {
    version: 1,
    hooks: {
      preToolUse: [
        { type: 'command', bash: h('scope-guard.sh'), timeoutSec: 30 },
        { type: 'command', bash: h('scaffold-guard.sh'), timeoutSec: 30 },
      ],
      postToolUse: [
        { type: 'command', bash: h('post-write.sh'), timeoutSec: 30 },
      ],
      sessionStart: [
        { type: 'command', bash: h('session-init.sh'), timeoutSec: 30 },
      ],
    },
  };
}

/** 에이전트별 settings 파일 경로 */
const SETTINGS_PATH_MAP: Record<string, string> = {
  claude: '.claude/settings.json',
  gemini: '.gemini/settings.json',
  codex: '.codex/hooks.json',
  cursor: '.cursor/hooks.json',
  windsurf: '.windsurf/hooks.json',
  cline: '.clinerules/hooks.json',
  copilot: '.github/hooks/harness.json',
};

/**
 * harness hooks를 프로젝트에 세팅한다.
 *
 * 1. templates/hooks/*.sh → 에이전트별 hooks 디렉토리에 복사
 * 2. 에이전트별 settings 파일에 hook 등록
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @param agent - 선택된 에이전트
 */
export async function setupHarnessHooks(projectDir: string, agent: string): Promise<number> {
  // Aider는 lint-cmd만 지원 — hook 스크립트 불필요
  if (agent === 'aider') return 0;

  const count = await copyHookScripts(projectDir, agent);
  if (count === 0) return 0;

  // 에이전트별 settings 생성
  const settingsRelPath = SETTINGS_PATH_MAP[agent];
  if (!settingsRelPath) return count;

  const settingsPath = path.join(projectDir, settingsRelPath);
  await fs.ensureDir(path.dirname(settingsPath));

  let settings: Record<string, unknown> = {};
  if (await fs.pathExists(settingsPath)) {
    settings = await fs.readJson(settingsPath);
  }

  switch (agent) {
    case 'claude':
      settings.hooks = generateClaudeSettings(projectDir);
      break;
    case 'gemini':
      settings.hooks = generateGeminiSettings(projectDir);
      break;
    case 'codex':
      settings.hooks = generateCodexSettings(projectDir);
      break;
    case 'cursor':
      settings.hooks = generateCursorSettings(projectDir);
      break;
    case 'windsurf':
      settings.hooks = generateWindsurfSettings(projectDir);
      break;
    case 'cline':
      settings.hooks = generateClineSettings(projectDir);
      break;
    case 'copilot':
      // Copilot은 독자적 포맷 — 전체 덮어쓰기
      settings = generateCopilotSettings(projectDir);
      break;
  }

  await fs.writeJson(settingsPath, settings, { spaces: 2 });
  return count;
}
