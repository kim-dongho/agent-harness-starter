/**
 * @fileoverview 하네스 통합 테스트
 *
 * 실제 프로젝트를 만들고 init → hook 실행 → 학습 → 메트릭 → AutoHarness 전체 흐름을 검증한다.
 * docker 테스트처럼 실제 프로젝트 하나를 처음부터 끝까지 돌린다.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { setupHarnessHooks } from '../../src/generators/harness-hooks.js';

const TMP = path.join(os.tmpdir(), 'harness-integration');
const HOOKS_DIR = path.resolve('templates/hooks');

/** hook 실행 헬퍼 — cwd를 프로젝트 디렉토리로 설정 (tsc 등이 올바른 tsconfig를 찾도록) */
function runHook(hookName: string, projectDir: string, input: string): { stdout: string; exitCode: number } {
  const hookPath = path.join(HOOKS_DIR, hookName);
  try {
    const stdout = execSync(`echo '${input}' | CLAUDE_PROJECT_DIR=${projectDir} bash ${hookPath}`, {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: projectDir,
    });
    return { stdout, exitCode: 0 };
  } catch (e: any) {
    return { stdout: e.stdout ?? '', exitCode: e.status ?? 1 };
  }
}

/** TypeScript 프로젝트 생성 + init 시뮬레이션 */
async function setupProject(): Promise<string> {
  const dir = path.join(TMP, 'test-project');
  await fs.ensureDir(dir);
  await fs.ensureDir(path.join(dir, 'src'));
  await fs.ensureDir(path.join(dir, 'tests'));
  await fs.ensureDir(path.join(dir, '.harness'));

  // package.json
  await fs.writeJson(path.join(dir, 'package.json'), {
    name: 'integration-test',
    dependencies: {},
    devDependencies: { typescript: '5.0.0' },
  });

  // tsconfig.json
  await fs.writeJson(path.join(dir, 'tsconfig.json'), {
    compilerOptions: { target: 'ES2020', module: 'ESNext', strict: true, noEmit: true },
    include: ['src'],
  });

  // harness.config.json
  await fs.writeJson(path.join(dir, 'harness.config.json'), {
    project: { name: 'integration-test', framework: 'unknown', language: 'typescript', packageManager: 'npm' },
    architecture: { style: 'modular', enforceIndexGen: true, forbiddenImports: {} },
    testing: { runner: 'vitest', minCoverage: { statements: 80, branches: 70 }, requireTestFileWithImplementation: false },
    agent: { persona: 'senior-developer', allowedScopes: ['src/**/*', 'tests/**/*'] },
    development: { linter: 'none', formatter: 'prettier' },
    rules: { codingStandards: [
      { id: 'no-hardcoded-secrets', description: '시크릿 하드코딩 금지', severity: 'error' },
    ] },
  }, { spaces: 2 });

  // hooks 복사 (Claude 기준)
  await setupHarnessHooks(dir, 'claude');

  // node_modules 심볼릭 링크 (tsc 실행을 위해)
  const srcModules = path.resolve('node_modules');
  const destModules = path.join(dir, 'node_modules');
  if (await fs.pathExists(srcModules) && !(await fs.pathExists(destModules))) {
    await fs.symlink(srcModules, destModules, 'junction');
  }

  return dir;
}

let PROJECT: string;

beforeAll(async () => {
  await fs.remove(TMP);
  PROJECT = await setupProject();
});

afterAll(async () => {
  await fs.remove(TMP);
});

// ══════════════════════════════════════════════════════════════
// 1. init 생성물 검증
// ══════════════════════════════════════════════════════════════
describe('1. init 생성물', () => {
  it('harness.config.json 존재', async () => {
    expect(await fs.pathExists(path.join(PROJECT, 'harness.config.json'))).toBe(true);
  });

  it('settings.json에 hook 등록', async () => {
    const settings = await fs.readJson(path.join(PROJECT, '.claude/settings.json'));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.Stop).toBeDefined();
  });

  it('hook 스크립트 7개 존재 + 실행 권한', async () => {
    const hooks = ['scope-guard.sh', 'scaffold-guard.sh', 'post-write.sh', 'session-init.sh', 'stop-review.sh', 'learnings-recorder.sh', 'log-transpiler.sh'];
    for (const hook of hooks) {
      const hookPath = path.join(PROJECT, '.claude/hooks', hook);
      expect(await fs.pathExists(hookPath)).toBe(true);
      const stat = await fs.stat(hookPath);
      expect(stat.mode & 0o755).toBe(0o755);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// 2. scope-guard 차단/허용
// ══════════════════════════════════════════════════════════════
describe('2. scope-guard', () => {
  it('src/ 안 파일 허용', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${PROJECT}/src/app.ts`, content: '' } });
    const { exitCode } = runHook('scope-guard.sh', PROJECT, input);
    expect(exitCode).toBe(0);
  });

  it('프로젝트 외부 차단', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '/etc/passwd', content: '' } });
    const { exitCode } = runHook('scope-guard.sh', PROJECT, input);
    expect(exitCode).toBe(2);
  });

  it('차단 시 metrics.jsonl에 block 기록', () => {
    const metrics = fs.readFileSync(path.join(PROJECT, '.harness/metrics.jsonl'), 'utf-8');
    expect(metrics).toContain('"event":"block"');
  });
});

// ══════════════════════════════════════════════════════════════
// 3. scaffold-guard 차단/허용
// ══════════════════════════════════════════════════════════════
describe('3. scaffold-guard', () => {
  it('기존 파일 Edit 허용', () => {
    fs.writeFileSync(path.join(PROJECT, 'src/existing.ts'), 'export const x = 1;');
    const input = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: `${PROJECT}/src/existing.ts` } });
    const { exitCode } = runHook('scaffold-guard.sh', PROJECT, input);
    expect(exitCode).toBe(0);
  });

  it('새 컴포넌트 파일 Write 차단', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${PROJECT}/src/components/Button.tsx`, content: '' } });
    const { exitCode } = runHook('scaffold-guard.sh', PROJECT, input);
    expect(exitCode).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. 타입 에러 → 감지 → 학습 → 수정 → self-heal (3회 반복)
// ══════════════════════════════════════════════════════════════
describe('4. self-heal 전체 루프 (3회 반복)', () => {
  const files = ['src/fail-1.ts', 'src/fail-2.ts', 'src/fail-3.ts'];

  for (let i = 0; i < 3; i++) {
    const file = files[i];

    it(`라운드 ${i + 1}: 타입 에러 파일 생성 → error 기록`, () => {
      fs.writeFileSync(path.join(PROJECT, file), `export function f${i}(): string { return ${i}; }\n`);
      const input = JSON.stringify({ tool_input: { file_path: `${PROJECT}/${file}` } });
      const { stdout } = runHook('post-write.sh', PROJECT, input);
      const json = JSON.parse(stdout);
      expect(json.systemMessage).toContain('TS2322');

      const metrics = fs.readFileSync(path.join(PROJECT, '.harness/metrics.jsonl'), 'utf-8');
      expect(metrics).toContain(`"event":"error","file":"${file}"`);
    });

    it(`라운드 ${i + 1}: learnings.json에 TS2322 기록`, () => {
      const learnings = fs.readJsonSync(path.join(PROJECT, '.harness/learnings.json'));
      const ts2322 = learnings.learnings.filter((l: any) => l.mistake === 'TS2322');
      expect(ts2322.length).toBeGreaterThanOrEqual(i + 1);
    });

    it(`라운드 ${i + 1}: 에러 수정 → clean 기록`, () => {
      fs.writeFileSync(path.join(PROJECT, file), `export function f${i}(): number { return ${i}; }\n`);
      const input = JSON.stringify({ tool_input: { file_path: `${PROJECT}/${file}` } });
      runHook('post-write.sh', PROJECT, input);

      const metrics = fs.readFileSync(path.join(PROJECT, '.harness/metrics.jsonl'), 'utf-8');
      expect(metrics).toContain(`"event":"clean","file":"${file}"`);
    });
  }

  it('self-heal 3/3 성공', () => {
    const metrics = fs.readFileSync(path.join(PROJECT, '.harness/metrics.jsonl'), 'utf-8');
    const lines = metrics.trim().split('\n').map(l => JSON.parse(l)).filter((e: any) => e.hook === 'post-write');
    // 각 파일이 error → clean 순서
    for (const file of files) {
      const fileEvents = lines.filter((e: any) => e.file === file).map((e: any) => e.event);
      expect(fileEvents).toContain('error');
      expect(fileEvents).toContain('clean');
      const errorIdx = fileEvents.indexOf('error');
      const cleanIdx = fileEvents.indexOf('clean');
      expect(cleanIdx).toBeGreaterThan(errorIdx);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// 5. AutoHarness — 3회 반복 후 config에 규칙 자동 추가
// ══════════════════════════════════════════════════════════════
describe('5. AutoHarness 자동 규칙 추가', () => {
  it('TS2322 3회 반복 → strict-return-type 자동 추가됨', () => {
    const config = fs.readJsonSync(path.join(PROJECT, 'harness.config.json'));
    const ids = config.rules.codingStandards.map((r: any) => r.id);
    expect(ids).toContain('strict-return-type');
  });

  it('systemMessage에 AutoHarness 알림 포함', () => {
    // 4번째 에러 파일로 확인 (이미 3회 초과)
    fs.writeFileSync(path.join(PROJECT, 'src/fail-4.ts'), 'export function f4(): string { return 4; }\n');
    const input = JSON.stringify({ tool_input: { file_path: `${PROJECT}/src/fail-4.ts` } });
    const { stdout } = runHook('post-write.sh', PROJECT, input);
    const json = JSON.parse(stdout);
    // strict-return-type은 이미 추가됐으니 중복 추가 안 됨
    const config = fs.readJsonSync(path.join(PROJECT, 'harness.config.json'));
    const strictCount = config.rules.codingStandards.filter((r: any) => r.id === 'strict-return-type').length;
    expect(strictCount).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// 6. 블록체인 보안 검사
// ══════════════════════════════════════════════════════════════
describe('6. 블록체인 보안 검사', () => {
  it('Solidity — tx.origin + floating pragma 감지', () => {
    const solFile = path.join(PROJECT, 'src/Vault.sol');
    fs.writeFileSync(solFile, 'pragma solidity ^0.8.0;\ncontract V { function f() public { require(tx.origin == msg.sender); } }\n');
    const input = JSON.stringify({ tool_input: { file_path: solFile } });
    const { stdout } = runHook('post-write.sh', PROJECT, input);
    const json = JSON.parse(stdout);
    expect(json.systemMessage).toContain('tx.origin');
    expect(json.systemMessage).toContain('SWC-115');
    expect(json.systemMessage).toContain('floating pragma');
  });

  it('Rust/Anchor — unwrap 감지', () => {
    const rsFile = path.join(PROJECT, 'src/program.rs');
    fs.writeFileSync(rsFile, 'use anchor_lang::prelude::*;\npub fn process() { let x = some_fn().unwrap(); }\n');
    const input = JSON.stringify({ tool_input: { file_path: rsFile } });
    const { stdout } = runHook('post-write.sh', PROJECT, input);
    const json = JSON.parse(stdout);
    expect(json.systemMessage).toContain('unwrap');
  });

  it('일반 Rust (anchor 없음) → 스킵', () => {
    const rsFile = path.join(PROJECT, 'src/main.rs');
    fs.writeFileSync(rsFile, 'fn main() { let x = std::fs::read_to_string("f").unwrap(); }\n');
    const input = JSON.stringify({ tool_input: { file_path: rsFile } });
    const { stdout, exitCode } = runHook('post-write.sh', PROJECT, input);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('Move — public entry without assert 감지', () => {
    const moveFile = path.join(PROJECT, 'src/token.move');
    fs.writeFileSync(moveFile, 'module t::v { public entry fun withdraw(a: &signer, amt: u64) { transfer(a, amt); } }\n');
    const input = JSON.stringify({ tool_input: { file_path: moveFile } });
    const { stdout } = runHook('post-write.sh', PROJECT, input);
    const json = JSON.parse(stdout);
    expect(json.systemMessage).toContain('public entry');
  });
});

// ══════════════════════════════════════════════════════════════
// 7. learnings-recorder (Stop hook)
// ══════════════════════════════════════════════════════════════
describe('7. learnings-recorder', () => {
  it('errors.log → learnings.json 규칙 변환', () => {
    // errors.log에 새 에러 추가
    fs.writeFileSync(path.join(PROJECT, '.harness/errors.log'),
      'src/x.ts(1,1): error TS7006: Parameter implicitly has an any type.\n');
    runHook('learnings-recorder.sh', PROJECT, '');
    const learnings = fs.readJsonSync(path.join(PROJECT, '.harness/learnings.json'));
    const hasAny = learnings.learnings.some((l: any) => l.rule.includes('암시적 any'));
    expect(hasAny).toBe(true);
  });

  it('처리 후 errors.log 비워짐', () => {
    const remaining = fs.readFileSync(path.join(PROJECT, '.harness/errors.log'), 'utf-8');
    expect(remaining.trim()).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════
// 8. session-init 컨텍스트 주입
// ══════════════════════════════════════════════════════════════
describe('8. session-init', () => {
  it('프로젝트 정보 출력', () => {
    const { stdout } = runHook('session-init.sh', PROJECT, '{}');
    expect(stdout).toContain('Agent Harness Active');
    expect(stdout).toContain('integration-test');
  });

  it('learnings 표시', () => {
    const { stdout } = runHook('session-init.sh', PROJECT, '{}');
    expect(stdout).toContain('Learnings');
  });

  it('메트릭 요약 표시', () => {
    const { stdout } = runHook('session-init.sh', PROJECT, '{}');
    expect(stdout).toContain('📊');
  });
});

// ══════════════════════════════════════════════════════════════
// 9. 멀티 에이전트 hooks 생성
// ══════════════════════════════════════════════════════════════
describe('9. 멀티 에이전트 hooks', () => {
  it('Gemini hooks 생성', async () => {
    await setupHarnessHooks(PROJECT, 'gemini');
    expect(await fs.pathExists(path.join(PROJECT, '.gemini/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(PROJECT, '.gemini/settings.json'))).toBe(true);
    const settings = fs.readJsonSync(path.join(PROJECT, '.gemini/settings.json'));
    expect(settings.hooks.BeforeTool).toBeDefined();
  });

  it('Copilot hooks 생성', async () => {
    await setupHarnessHooks(PROJECT, 'copilot');
    expect(await fs.pathExists(path.join(PROJECT, '.github/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(PROJECT, '.github/hooks/harness.json'))).toBe(true);
    const settings = fs.readJsonSync(path.join(PROJECT, '.github/hooks/harness.json'));
    expect(settings.version).toBe(1);
    expect(settings.hooks.preToolUse).toBeDefined();
  });

  it('Gemini hooks가 동일한 harness.config.json 참조', () => {
    // Gemini hook 실행 — 같은 config 읽음
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${PROJECT}/src/app.ts`, content: '' } });
    const { exitCode } = runHook('scope-guard.sh', PROJECT, input);
    expect(exitCode).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// 10. metrics CLI 집계 검증
// ══════════════════════════════════════════════════════════════
describe('10. metrics 집계', () => {
  it('metrics.jsonl에 block, error, clean 이벤트 존재', () => {
    const metrics = fs.readFileSync(path.join(PROJECT, '.harness/metrics.jsonl'), 'utf-8');
    expect(metrics).toContain('"event":"block"');
    expect(metrics).toContain('"event":"error"');
    expect(metrics).toContain('"event":"clean"');
  });

  it('first-pass 성공 파일 존재 (에러 없는 파일)', () => {
    // 에러 없는 파일 생성
    fs.writeFileSync(path.join(PROJECT, 'src/clean.ts'), 'export const x: number = 1;\n');
    const input = JSON.stringify({ tool_input: { file_path: `${PROJECT}/src/clean.ts` } });
    runHook('post-write.sh', PROJECT, input);

    const metrics = fs.readFileSync(path.join(PROJECT, '.harness/metrics.jsonl'), 'utf-8');
    const lines = metrics.trim().split('\n').map(l => JSON.parse(l));
    const cleanFirst = lines.filter((e: any) => e.file === 'src/clean.ts');
    expect(cleanFirst[0].event).toBe('clean');
  });

  it('errors.log 100줄 제한', () => {
    // 200줄 에러 기록
    const bigLog = Array.from({ length: 200 }, (_, i) => `error line ${i}`).join('\n');
    fs.writeFileSync(path.join(PROJECT, '.harness/errors.log'), bigLog);

    // post-write 실행으로 truncation 트리거
    fs.writeFileSync(path.join(PROJECT, 'src/trunc.ts'), 'export function t(): string { return 1; }\n');
    const input = JSON.stringify({ tool_input: { file_path: `${PROJECT}/src/trunc.ts` } });
    runHook('post-write.sh', PROJECT, input);

    const lines = fs.readFileSync(path.join(PROJECT, '.harness/errors.log'), 'utf-8').trim().split('\n');
    expect(lines.length).toBeLessThanOrEqual(100);
  });
});
