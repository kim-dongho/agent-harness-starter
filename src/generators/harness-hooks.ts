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


/** Codex PostToolUse agent hook prompt — command hook stdout 미주입 환경 보완 */
const POST_WRITE_AGENT_PROMPT = [
  '아래를 순서대로 수행하라.',
  '',
  '## 1. 입력 확인',
  '`.harness/errors.log`와 `.harness/metrics.jsonl`를 읽어라.',
  '최근 post-write 실행에서 감지된 오류가 없으면 변경 없이 종료하라.',
  '',
  '## 2. 자동 수정 원칙',
  '- 타입 오류, lint 오류, import 위반 등 단순 오류는 즉시 수정한다.',
  '- Solidity 보안 이슈(tx.origin, selfdestruct, delegatecall, floating pragma, reentrancy 가능성)는',
  '  원인과 수정 계획을 먼저 정리하고, 사용자 확인이 필요한 경우에만 멈춘다.',
  '- 수정 후에는 같은 오류가 남지 않도록 현재 파일과 연관 파일을 함께 점검한다.',
  '',
  '## 3. 출력',
  '수정이 필요하면 간결하게 수정 내용을 설명하고, 추가 조치가 없으면 ok: true에 준하는 짧은 확인만 남긴다.',
].join('\n');

/** hook 경로 헬퍼 — 에이전트별 환경변수 또는 상대경로 */
function hookCmd(agent: string, hookFile: string): string {
  const dir = HOOKS_DIR_MAP[agent];
  switch (agent) {
    case 'claude': return `\${CLAUDE_PROJECT_DIR}/${dir}/${hookFile}`;
    case 'gemini': return `$GEMINI_PROJECT_DIR/${dir}/${hookFile}`;
    case 'codex': return `bash "$(git rev-parse --show-toplevel)/${dir}/${hookFile}"`;
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
      { matcher: 'Bash|apply_patch', hooks: [{ type: 'command', command: h('scope-guard.sh'), statusMessage: 'Checking file scope...', timeout: 30 }] },
      { matcher: 'apply_patch', hooks: [{ type: 'command', command: h('scaffold-guard.sh'), statusMessage: 'Checking scaffolder usage...', timeout: 30 }] },
    ],
    PostToolUse: [
      { matcher: 'Bash|apply_patch', hooks: [{ type: 'command', command: h('post-write.sh'), statusMessage: 'Checking architecture rules...', timeout: 30 }] },
      { matcher: 'Bash|apply_patch', hooks: [{ type: 'agent', prompt: POST_WRITE_AGENT_PROMPT, timeout: 60 }] },
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
