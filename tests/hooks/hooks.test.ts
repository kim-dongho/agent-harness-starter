/**
 * @fileoverview Hook 스크립트 통합 테스트
 *
 * scaffolder로 프로젝트를 생성한 후, 생성된 hook 셸 스크립트에
 * JSON을 stdin으로 넣고 exit code와 출력을 검증한다.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import { execSync } from 'node:child_process';
import { scaffold } from '../../src/scaffolder/index.js';

const TEST_DIR = path.resolve(import.meta.dirname, '..', '..', '.test-hooks');
const PROJECT_DIR = path.join(TEST_DIR, 'hook-test');

/** hook 스크립트를 실행하고 결과를 반환한다 */
function runHook(hookName: string, input: object): { code: number; stdout: string; stderr: string } {
  const hookPath = path.join(PROJECT_DIR, '.claude', 'hooks', hookName);
  const inputJson = JSON.stringify(input);

  try {
    const stdout = execSync(`bash "${hookPath}"`, {
      cwd: PROJECT_DIR,
      input: inputJson,
      env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_DIR },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    }).toString();
    return { code: 0, stdout, stderr: '' };
  } catch (e: any) {
    return {
      code: e.status ?? 1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
    };
  }
}

// ─── 테스트 프로젝트 생성 ───

beforeAll(async () => {
  await fs.remove(TEST_DIR);
  await fs.ensureDir(TEST_DIR);
  const orig = process.cwd();
  process.chdir(TEST_DIR);

  await scaffold({
    projectName: 'hook-test',
    agent: 'claude',
    repoStructure: 'polyrepo',
    stack: 'react-vite',
    language: 'typescript',
    packageManager: 'npm',
    linter: 'eslint-prettier',
    namingConvention: 'kebab-case',
    architecture: 'fsd',
    graphify: false,
    docker: false,
    autoInstall: false,
  }, { silent: true });

  process.chdir(orig);

  // hook 스크립트가 minimatch를 사용하므로 설치
  execSync('npm install minimatch', { cwd: PROJECT_DIR, stdio: 'pipe' });
}, 60000);

afterAll(async () => {
  await fs.remove(TEST_DIR);
});

// ─── 파일 생성 확인 ───

describe('hook 파일 생성', () => {
  it('harness.config.json이 생성된다', () => {
    expect(fs.existsSync(path.join(PROJECT_DIR, 'harness.config.json'))).toBe(true);
  });

  it('.claude/settings.json이 생성된다', () => {
    expect(fs.existsSync(path.join(PROJECT_DIR, '.claude', 'settings.json'))).toBe(true);
  });

  it('hook 스크립트 4개가 생성된다', () => {
    const hooks = ['scope-guard.sh', 'scaffold-guard.sh', 'post-write.sh', 'session-init.sh', 'stop-review.sh'];
    for (const hook of hooks) {
      expect(fs.existsSync(path.join(PROJECT_DIR, '.claude', 'hooks', hook))).toBe(true);
    }
  });

  it('.claude/settings.json에 hooks가 등록되어 있다', () => {
    const settings = fs.readJsonSync(path.join(PROJECT_DIR, '.claude', 'settings.json'));
    expect(settings.hooks).toBeDefined();
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.Stop).toBeDefined();
  });
});

// ─── harness.config.json 검증 ───

describe('harness.config.json', () => {
  it('프로젝트 설정이 올바르다', () => {
    const config = fs.readJsonSync(path.join(PROJECT_DIR, 'harness.config.json'));
    expect(config.project.name).toBe('hook-test');
    expect(config.project.framework).toBe('vite-react');
    expect(config.project.language).toBe('typescript');
    expect(config.architecture.style).toBe('fsd');
  });

  it('FSD forbiddenImports가 설정되어 있다', () => {
    const config = fs.readJsonSync(path.join(PROJECT_DIR, 'harness.config.json'));
    expect(config.architecture.forbiddenImports.shared).toContain('features');
    expect(config.architecture.forbiddenImports.entities).toContain('pages');
  });

  it('codingStandards가 포함되어 있다', () => {
    const config = fs.readJsonSync(path.join(PROJECT_DIR, 'harness.config.json'));
    const ids = config.rules.codingStandards.map((s: any) => s.id);
    expect(ids).toContain('no-hardcoded-secrets');
    expect(ids).toContain('no-console-log');
  });
});

// ─── scope-guard 테스트 ───

describe('scope-guard.sh', () => {
  it('src/ 안의 파일은 허용한다 (exit 0)', () => {
    const result = runHook('scope-guard.sh', {
      tool_input: { file_path: 'src/utils/test.ts' },
    });
    expect(result.code).toBe(0);
  });

  it('tests/ 안의 파일은 허용한다 (exit 0)', () => {
    const result = runHook('scope-guard.sh', {
      tool_input: { file_path: 'tests/test.ts' },
    });
    expect(result.code).toBe(0);
  });

  it('허용 범위 밖 파일은 차단한다 (exit 2)', () => {
    const result = runHook('scope-guard.sh', {
      tool_input: { file_path: 'random/file.ts' },
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('outside allowed scopes');
  });

  it('설정 파일(package.json)은 허용한다', () => {
    const result = runHook('scope-guard.sh', {
      tool_input: { file_path: 'package.json' },
    });
    expect(result.code).toBe(0);
  });

  it('file_path가 비어있으면 허용한다', () => {
    const result = runHook('scope-guard.sh', {
      tool_input: {},
    });
    expect(result.code).toBe(0);
  });
});

// ─── scaffold-guard 테스트 ───

describe('scaffold-guard.sh', () => {
  it('Edit은 무시한다 (exit 0)', () => {
    const result = runHook('scaffold-guard.sh', {
      tool_name: 'Edit',
      tool_input: { file_path: 'src/components/Button.tsx' },
    });
    expect(result.code).toBe(0);
  });

  it('기존 파일 Write(덮어쓰기)는 허용한다', async () => {
    const filePath = path.join(PROJECT_DIR, 'src', 'test-existing.ts');
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, 'export const x = 1;');

    const result = runHook('scaffold-guard.sh', {
      tool_name: 'Write',
      tool_input: { file_path: filePath },
    });
    expect(result.code).toBe(0);

    await fs.remove(filePath);
  });

  it('src/components에 새 파일 Write는 차단한다 (exit 2)', () => {
    const result = runHook('scaffold-guard.sh', {
      tool_name: 'Write',
      tool_input: { file_path: 'src/components/NewComponent.tsx' },
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('/generate');
  });

  it('src/hooks에 새 파일 Write는 차단한다 (exit 2)', () => {
    const result = runHook('scaffold-guard.sh', {
      tool_name: 'Write',
      tool_input: { file_path: 'src/hooks/useAuth.ts' },
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('/generate');
  });
});

// ─── session-init 테스트 ───

describe('session-init.sh', () => {
  it('프로젝트 정보를 출력한다', () => {
    const result = runHook('session-init.sh', {});
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('hook-test');
    expect(result.stdout).toContain('vite-react');
    expect(result.stdout).toContain('SDLC Pipeline');
  });

  it('FSD import restrictions를 출력한다', () => {
    const result = runHook('session-init.sh', {});
    expect(result.stdout).toContain('Import restrictions');
    expect(result.stdout).toContain('shared');
  });
});

// ─── adapter 생성 파일 검증 ───

describe('Claude adapter 생성 파일', () => {
  it('CLAUDE.md가 생성된다', () => {
    const content = fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('hook-test');
    expect(content).toContain('Verify');
  });

  it('rules/conventions.md가 생성된다', () => {
    const content = fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'rules', 'conventions.md'), 'utf-8');
    expect(content).toContain('fsd');
    expect(content).toContain('Import Restrictions');
  });

  it('rules/workflow.md가 생성된다', () => {
    const content = fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'rules', 'workflow.md'), 'utf-8');
    expect(content).toContain('SDLC Pipeline');
    expect(content).toContain('/generate');
  });

  it('스택별 rules가 분리 생성된다', () => {
    expect(fs.existsSync(path.join(PROJECT_DIR, '.claude', 'rules', 'stack', 'react.md'))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_DIR, '.claude', 'rules', 'stack', 'general-ts.md'))).toBe(true);
  });
});

// ─── Computational Sensors 검증 ───

describe('dependency-cruiser', () => {
  it('.dependency-cruiser.cjs가 생성된다', () => {
    expect(fs.existsSync(path.join(PROJECT_DIR, '.dependency-cruiser.cjs'))).toBe(true);
  });

  it('FSD forbiddenImports가 규칙으로 변환된다', () => {
    const content = fs.readFileSync(path.join(PROJECT_DIR, '.dependency-cruiser.cjs'), 'utf-8');
    expect(content).toContain('forbidden');
    expect(content).toContain('src/shared');
    expect(content).toContain('src/features');
  });

  it('package.json에 dependency-cruiser devDependency가 추가된다', () => {
    const pkg = fs.readJsonSync(path.join(PROJECT_DIR, 'package.json'));
    expect(pkg.devDependencies['dependency-cruiser']).toBeDefined();
  });
});
