/**
 * harness hooks 생성기
 *
 * scope-guard, scaffold-guard, post-write, session-init 훅 스크립트를
 * 프로젝트에 복사하고 .claude/settings.json에 등록한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import { TEMPLATES_DIR } from '../scaffolder/utils.js';

/**
 * harness hooks를 프로젝트에 세팅한다.
 *
 * 1. templates/hooks/*.sh → .claude/hooks/ 복사
 * 2. .claude/settings.json에 hook 등록
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @param agent - 선택된 에이전트 (claude만 hooks 지원)
 */
export async function setupHarnessHooks(projectDir: string, agent: string): Promise<number> {
  // Claude만 hooks 지원
  if (agent !== 'claude') return 0;

  const hooksSrc = path.join(TEMPLATES_DIR, 'hooks');
  const hooksDest = path.join(projectDir, '.claude', 'hooks');

  if (!(await fs.pathExists(hooksSrc))) return 0;

  // 1. hook 스크립트 복사
  await fs.ensureDir(hooksDest);
  const hookFiles = await fs.readdir(hooksSrc);
  let count = 0;

  for (const file of hookFiles) {
    if (!file.endsWith('.sh')) continue;
    const src = path.join(hooksSrc, file);
    const dest = path.join(hooksDest, file);
    await fs.copy(src, dest);
    await fs.chmod(dest, 0o755);
    count++;
  }

  // 2. .claude/settings.json에 hook 등록
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  let settings: Record<string, unknown> = {};

  if (await fs.pathExists(settingsPath)) {
    settings = await fs.readJson(settingsPath);
  }

  settings.hooks = {
    PreToolUse: [
      {
        matcher: 'Write|Edit',
        hooks: [
          {
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/scope-guard.sh',
            statusMessage: 'Checking file scope...',
          },
        ],
      },
      {
        matcher: 'Write',
        hooks: [
          {
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/scaffold-guard.sh',
            statusMessage: 'Checking scaffolder usage...',
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: 'Write|Edit',
        hooks: [
          {
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/post-write.sh',
            statusMessage: 'Checking architecture rules...',
          },
        ],
      },
    ],
    SessionStart: [
      {
        hooks: [
          {
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/session-init.sh',
            once: true,
          },
        ],
      },
    ],
    Stop: [
      {
        hooks: [
          {
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/stop-review.sh',
            statusMessage: 'Running final harness review...',
          },
          {
            type: 'agent',
            prompt: [
              '아래를 순서대로 수행하라.',
              '',
              '## 0. 무한 루프 방지',
              '`.harness/review-count` 파일을 읽어라. 숫자가 3 이상이면 "리뷰 3회 초과 — 스킵합니다"를 출력하고 ok: true를 반환하라.',
              '파일이 없으면 0으로 간주한다. 리뷰 실행 후 숫자를 +1하여 저장한다.',
              '리뷰 통과(ok: true) 시 파일을 삭제하여 카운터를 초기화한다.',
              '',
              '## 1. Adversarial Code Review',
              '`git diff HEAD`로 변경된 파일을 확인하고, 변경된 코드만 리뷰하라.',
              '변경이 없으면 스킵한다.',
              '리뷰 기준:',
              '- 정확성: 로직 에러, 엣지 케이스 누락',
              '- 보안: 미검증 입력, 하드코딩 시크릿',
              '- 성능: N+1, 불필요한 루프',
              '- 컨벤션: harness.config.json의 codingStandards 위반',
              '- 스코프: 요청 범위 밖 변경',
              '',
              '문제 발견 시 ok: false를 반환하고 구체적 수정 사항을 제시하라.',
              '문제 없으면 ok: true를 반환하고 .harness/review-count를 삭제하라.',
              '',
              '## 2. Learnings Loop',
              '.harness/errors.log 파일이 존재하고 내용이 있으면 분석하여 .harness/learnings.json에 학습 기록을 추가하라.',
              '파일이 없거나 비어있으면 스킵한다.',
              '기록 형식: { "id": "learn-NNN", "date": "YYYY-MM-DD", "category": "code-pattern|architecture|convention|testing|scope", "mistake": "한 줄 요약", "correction": "올바른 방법", "rule": "앞으로 지켜야 할 규칙" }',
              '분석 후 errors.log를 비운다.',
            ].join('\n'),
            timeout: 60,
          },
        ],
      },
    ],
  };

  await fs.writeJson(settingsPath, settings, { spaces: 2 });

  return count;
}
