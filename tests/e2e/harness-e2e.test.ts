import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { execSync } from 'node:child_process';

// ── 테스트 프로젝트 설정 ──
const TMP = path.join(os.tmpdir(), 'harness-e2e-test');
const HOOKS_DIR = path.resolve('templates/hooks');

/** hook 실행 헬퍼 */
function runHook(hookName: string, projectDir: string, input: string): { stdout: string; exitCode: number } {
  const hookPath = path.join(HOOKS_DIR, hookName);
  try {
    const stdout = execSync(`echo '${input}' | CLAUDE_PROJECT_DIR=${projectDir} bash ${hookPath}`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { stdout, exitCode: 0 };
  } catch (e: any) {
    return { stdout: e.stdout ?? '', exitCode: e.status ?? 1 };
  }
}

/** 최소 프로젝트 구조 생성 */
async function createTestProject(name: string, extra?: Record<string, string | object>): Promise<string> {
  const dir = path.join(TMP, name);
  await fs.ensureDir(dir);
  await fs.ensureDir(path.join(dir, 'src'));
  await fs.ensureDir(path.join(dir, 'tests'));
  await fs.ensureDir(path.join(dir, '.harness'));

  // 최소 harness.config.json
  await fs.writeJson(path.join(dir, 'harness.config.json'), {
    project: { name, framework: 'unknown', language: 'typescript', packageManager: 'npm' },
    architecture: { style: 'modular', enforceIndexGen: true, forbiddenImports: {} },
    testing: { runner: 'vitest', minCoverage: { statements: 80, branches: 70 }, requireTestFileWithImplementation: false },
    agent: { persona: 'senior-developer', allowedScopes: ['src/**/*', 'tests/**/*'] },
    development: { linter: 'none', formatter: 'prettier' },
    rules: { codingStandards: [] },
  }, { spaces: 2 });

  // tsconfig.json
  await fs.writeJson(path.join(dir, 'tsconfig.json'), {
    compilerOptions: { target: 'ES2020', module: 'ESNext', strict: true, noEmit: true },
    include: ['src'],
  });

  // 추가 파일
  if (extra) {
    for (const [filePath, content] of Object.entries(extra)) {
      const full = path.join(dir, filePath);
      await fs.ensureDir(path.dirname(full));
      if (typeof content === 'string') await fs.writeFile(full, content);
      else await fs.writeJson(full, content, { spaces: 2 });
    }
  }

  return dir;
}

beforeAll(async () => { await fs.ensureDir(TMP); });
afterAll(async () => { await fs.remove(TMP); });

// ══════════════════════════════════════════════════════════════
// 2. scope-guard
// ══════════════════════════════════════════════════════════════
describe('scope-guard', () => {
  let dir: string;
  beforeAll(async () => { dir = await createTestProject('scope-test'); });

  it('src/ 안 파일 허용', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${dir}/src/index.ts`, content: '' } });
    const { exitCode } = runHook('scope-guard.sh', dir, input);
    expect(exitCode).toBe(0);
  });

  it('프로젝트 외부 경로 차단', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '/etc/passwd', content: '' } });
    const { exitCode } = runHook('scope-guard.sh', dir, input);
    expect(exitCode).toBe(2);
  });

  it('루트 설정 파일 허용 (package.json)', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${dir}/package.json`, content: '' } });
    const { exitCode } = runHook('scope-guard.sh', dir, input);
    expect(exitCode).toBe(0);
  });

  it('path traversal 차단', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${dir}/src/../../../etc/passwd`, content: '' } });
    const { exitCode } = runHook('scope-guard.sh', dir, input);
    expect(exitCode).toBe(2);
  });

  it('allowedScopes 없으면 기본값 사용', async () => {
    // allowedScopes 없는 config
    const dir2 = await createTestProject('scope-no-scopes');
    const config = await fs.readJson(path.join(dir2, 'harness.config.json'));
    delete config.agent.allowedScopes;
    await fs.writeJson(path.join(dir2, 'harness.config.json'), config, { spaces: 2 });

    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${dir2}/src/foo.ts`, content: '' } });
    const { exitCode } = runHook('scope-guard.sh', dir2, input);
    expect(exitCode).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. scaffold-guard
// ══════════════════════════════════════════════════════════════
describe('scaffold-guard', () => {
  let dir: string;
  beforeAll(async () => { dir = await createTestProject('scaffold-test'); });

  it('Edit 도구는 항상 통과', () => {
    const input = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: `${dir}/src/components/Foo.tsx` } });
    const { exitCode } = runHook('scaffold-guard.sh', dir, input);
    expect(exitCode).toBe(0);
  });

  it('기존 파일 Write는 통과', async () => {
    await fs.writeFile(path.join(dir, 'src/existing.ts'), 'export const x = 1;');
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${dir}/src/existing.ts`, content: 'updated' } });
    const { exitCode } = runHook('scaffold-guard.sh', dir, input);
    expect(exitCode).toBe(0);
  });

  it('새 파일 src/components/Foo.tsx Write → 차단', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${dir}/src/components/Foo.tsx`, content: '' } });
    const { exitCode } = runHook('scaffold-guard.sh', dir, input);
    // exit 2 = 차단, stderr에 /generate 안내 (stdout은 비어있을 수 있음)
    expect(exitCode).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. post-write
// ══════════════════════════════════════════════════════════════
describe('post-write', () => {
  it('에러 없는 파일 → 출력 없음', async () => {
    const dir = await createTestProject('pw-clean', {
      'src/clean.ts': 'export const x: number = 1;\n',
    });
    const input = JSON.stringify({ tool_input: { file_path: `${dir}/src/clean.ts` } });
    const { stdout, exitCode } = runHook('post-write.sh', dir, input);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('Solidity — tx.origin + floating pragma 감지', async () => {
    const dir = await createTestProject('pw-sol', {
      'src/Vault.sol': `pragma solidity ^0.8.0;\ncontract V { function f() public { require(tx.origin == msg.sender); } }\n`,
    });
    const input = JSON.stringify({ tool_input: { file_path: `${dir}/src/Vault.sol` } });
    const { stdout } = runHook('post-write.sh', dir, input);
    const json = JSON.parse(stdout);
    expect(json.systemMessage).toContain('tx.origin');
    expect(json.systemMessage).toContain('SWC-115');
    expect(json.systemMessage).toContain('floating pragma');
    expect(json.additionalContext).toContain('자동 검증');
  });

  it('Rust/Anchor — unwrap 감지', async () => {
    const dir = await createTestProject('pw-rs', {
      'src/program.rs': `use anchor_lang::prelude::*;\npub fn process() { let x = some_fn().unwrap(); }\n`,
    });
    const input = JSON.stringify({ tool_input: { file_path: `${dir}/src/program.rs` } });
    const { stdout } = runHook('post-write.sh', dir, input);
    const json = JSON.parse(stdout);
    expect(json.systemMessage).toContain('unwrap');
  });

  it('일반 Rust (anchor 없음) → 스킵', async () => {
    const dir = await createTestProject('pw-rs-normal', {
      'src/main.rs': `fn main() { let x = 1 + 2; let d = std::fs::read_to_string("f").unwrap(); }\n`,
    });
    const input = JSON.stringify({ tool_input: { file_path: `${dir}/src/main.rs` } });
    const { stdout, exitCode } = runHook('post-write.sh', dir, input);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('Move — public entry fun assert 없음 감지', async () => {
    const dir = await createTestProject('pw-move', {
      'src/token.move': `module t::v { public entry fun withdraw(a: &signer, amt: u64) { transfer(a, amt); } }\n`,
    });
    const input = JSON.stringify({ tool_input: { file_path: `${dir}/src/token.move` } });
    const { stdout } = runHook('post-write.sh', dir, input);
    const json = JSON.parse(stdout);
    expect(json.systemMessage).toContain('public entry');
    expect(json.systemMessage).toContain('assert!');
  });

  it('errors.log에 기록됨', async () => {
    const dir = await createTestProject('pw-errlog', {
      'src/Bad.sol': `pragma solidity ^0.8.0;\ncontract B { function f() public { require(tx.origin == msg.sender); } }\n`,
    });
    const input = JSON.stringify({ tool_input: { file_path: `${dir}/src/Bad.sol` } });
    runHook('post-write.sh', dir, input);
    const log = await fs.readFile(path.join(dir, '.harness/errors.log'), 'utf-8');
    expect(log).toContain('tx.origin');
  });

  it('프로젝트 외부 경로 → 무시', async () => {
    const dir = await createTestProject('pw-outside');
    const input = JSON.stringify({ tool_input: { file_path: '/etc/passwd' } });
    const { stdout, exitCode } = runHook('post-write.sh', dir, input);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('JSON 출력 형식 검증 (systemMessage + additionalContext)', async () => {
    const dir = await createTestProject('pw-json', {
      'src/Proxy.sol': `pragma solidity ^0.8.0;\ncontract P { function f(address t, bytes calldata d) public { t.delegatecall(d); } }\n`,
    });
    const input = JSON.stringify({ tool_input: { file_path: `${dir}/src/Proxy.sol` } });
    const { stdout } = runHook('post-write.sh', dir, input);
    const json = JSON.parse(stdout);
    expect(json).toHaveProperty('systemMessage');
    expect(json).toHaveProperty('additionalContext');
    expect(typeof json.systemMessage).toBe('string');
    expect(typeof json.additionalContext).toBe('string');
  });
});

// ══════════════════════════════════════════════════════════════
// 5. session-init
// ══════════════════════════════════════════════════════════════
describe('session-init', () => {
  it('프로젝트 정보 출력', async () => {
    const dir = await createTestProject('si-test');
    const { stdout } = runHook('session-init.sh', dir, '{}');
    expect(stdout).toContain('Agent Harness Active');
    expect(stdout).toContain('si-test');
  });

  it('learnings 있으면 표시', async () => {
    const dir = await createTestProject('si-learnings');
    await fs.writeJson(path.join(dir, '.harness/learnings.json'), {
      learnings: [{ id: 'l1', date: '2026-01-01', mistake: 'TS2322', rule: '타입 불일치 — 확인한다' }],
    });
    const { stdout } = runHook('session-init.sh', dir, '{}');
    expect(stdout).toContain('타입 불일치');
  });
});

// ══════════════════════════════════════════════════════════════
// 7. learnings-recorder
// ══════════════════════════════════════════════════════════════
describe('learnings-recorder', () => {
  it('errors.log → learnings.json 규칙 생성', async () => {
    const dir = await createTestProject('lr-test');
    await fs.writeFile(path.join(dir, '.harness/errors.log'),
      'src/foo.ts(2,3): error TS2322: Type \'number\' is not assignable to type \'string\'.\n');
    runHook('learnings-recorder.sh', dir, '');
    const learnings = await fs.readJson(path.join(dir, '.harness/learnings.json'));
    expect(learnings.learnings.length).toBeGreaterThan(0);
    expect(learnings.learnings[0].rule).toContain('타입 불일치');
  });

  it('중복 규칙 스킵', async () => {
    const dir = await createTestProject('lr-dup');
    // 같은 파일 같은 에러 2번 기록 → 규칙이 동일하므로 중복 스킵
    await fs.writeFile(path.join(dir, '.harness/errors.log'),
      'src/a.ts(1,1): error TS2322: Type mismatch\nsrc/a.ts(5,1): error TS2322: Another mismatch\n');
    runHook('learnings-recorder.sh', dir, '');
    const learnings = await fs.readJson(path.join(dir, '.harness/learnings.json'));
    // 같은 파일의 TS2322 → 같은 rule 문자열 → 중복 스킵
    const ts2322Rules = learnings.learnings.filter((l: any) => l.rule.includes('타입 불일치'));
    expect(ts2322Rules.length).toBe(1);
  });

  it('errors.log 비어있으면 스킵 (exit 0)', async () => {
    const dir = await createTestProject('lr-empty');
    await fs.writeFile(path.join(dir, '.harness/errors.log'), '');
    const { exitCode } = runHook('learnings-recorder.sh', dir, '');
    expect(exitCode).toBe(0);
    // learnings.json 생성 안 됨
    expect(await fs.pathExists(path.join(dir, '.harness/learnings.json'))).toBe(false);
  });

  it('처리 후 errors.log 비워짐', async () => {
    const dir = await createTestProject('lr-clear');
    await fs.writeFile(path.join(dir, '.harness/errors.log'),
      '⚠️ Type errors\nsrc/x.ts(1,1): error TS2322: mismatch\n');
    runHook('learnings-recorder.sh', dir, '');
    const remaining = await fs.readFile(path.join(dir, '.harness/errors.log'), 'utf-8');
    expect(remaining.trim()).toBe('');
  });

  it('20개 초과 시 오래된 것 삭제', async () => {
    const dir = await createTestProject('lr-max');
    // 기존 20개 learnings
    const existing = Array.from({ length: 20 }, (_, i) => ({
      id: `old-${i}`, date: '2026-01-01', mistake: `error-${i}`, rule: `rule-${i}`,
    }));
    await fs.writeJson(path.join(dir, '.harness/learnings.json'), { learnings: existing });
    await fs.writeFile(path.join(dir, '.harness/errors.log'),
      'src/new.ts(1,1): error TS7006: Parameter implicitly has an any type.\n');
    runHook('learnings-recorder.sh', dir, '');
    const learnings = await fs.readJson(path.join(dir, '.harness/learnings.json'));
    expect(learnings.learnings.length).toBeLessThanOrEqual(20);
    // 새 규칙이 들어가고 old-0이 밀려남
    const hasNew = learnings.learnings.some((l: any) => l.rule.includes('암시적 any'));
    expect(hasNew).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 8. E2E 전체 루프
// ══════════════════════════════════════════════════════════════
describe('E2E: 에러 감지 → 기록 → 학습 → 세션 주입', () => {
  it('전체 사이클 검증', async () => {
    const dir = await createTestProject('e2e-loop', {
      'src/Bad.sol': `pragma solidity ^0.8.0;\ncontract B { function f() public { require(tx.origin == msg.sender); } }\n`,
    });

    // Step 1: post-write → 에러 감지
    const pwInput = JSON.stringify({ tool_input: { file_path: `${dir}/src/Bad.sol` } });
    const pw = runHook('post-write.sh', dir, pwInput);
    expect(pw.exitCode).toBe(0);
    const json = JSON.parse(pw.stdout);
    expect(json.systemMessage).toContain('tx.origin');

    // Step 2: errors.log에 기록 확인
    const errLog = await fs.readFile(path.join(dir, '.harness/errors.log'), 'utf-8');
    expect(errLog).toContain('tx.origin');

    // Step 3: learnings-recorder → learnings.json 생성
    runHook('learnings-recorder.sh', dir, '');
    const learnings = await fs.readJson(path.join(dir, '.harness/learnings.json'));
    expect(learnings.learnings.length).toBeGreaterThan(0);

    // Step 4: errors.log 비워짐
    const errLogAfter = await fs.readFile(path.join(dir, '.harness/errors.log'), 'utf-8');
    expect(errLogAfter.trim()).toBe('');

    // Step 5: session-init → learnings 주입 확인
    const si = runHook('session-init.sh', dir, '{}');
    expect(si.stdout).toContain('Learnings');
  });
});
