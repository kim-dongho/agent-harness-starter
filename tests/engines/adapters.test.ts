import { describe, it, expect } from 'vitest';
import { getAdapter, getAllAdapterTypes } from '../../src/engines/adapters/index.js';
import { buildFullContent, buildProjectContext, buildConventionRules, buildCodingPrinciples, buildCodingStandards, buildWorkflowRules } from '../../src/engines/adapters/shared.js';
import type { HarnessConfig } from '../../src/engines/adapters/types.js';

const mockConfig: HarnessConfig = {
  project: {
    name: 'test-project',
    framework: 'nextjs',
    packageManager: 'pnpm',
    language: 'typescript',
  },
  architecture: {
    style: 'fsd',
    enforceIndexGen: true,
    forbiddenImports: {
      shared: ['features', 'pages', 'app'],
      entities: ['features', 'pages', 'app'],
    },
  },
  development: {
    linter: 'biome',
    formatter: 'biome',
    styling: 'tailwind',
  },
  testing: {
    runner: 'vitest',
    minCoverage: { statements: 80, branches: 75, functions: 80, lines: 80 },
    requireTestFileWithImplementation: false,
  },
  agent: {
    persona: 'senior-developer',
    allowedScopes: ['src/**/*', 'tests/**/*'],
    adapters: ['claude'],
  },
  rules: {
    fileNaming: {
      components: 'PascalCase',
      hooks: 'camelCase',
      utils: 'camelCase',
      services: 'camelCase',
      models: 'camelCase',
      testSuffix: '.test',
    },
    codingStandards: [
      { id: 'no-any', description: 'any 타입 사용 금지', severity: 'error' },
      { id: 'no-console', description: 'console.log 금지', severity: 'warn' },
    ],
  },
};

// ─── 공통 빌더 테스트 ───

describe('shared builders', () => {
  it('buildProjectContext — 프로젝트 정보를 포함한다', () => {
    const result = buildProjectContext(mockConfig);
    expect(result).toContain('test-project');
    expect(result).toContain('nextjs');
    expect(result).toContain('typescript');
    expect(result).toContain('pnpm');
  });

  it('buildConventionRules — 아키텍처와 네이밍 규칙을 포함한다', () => {
    const result = buildConventionRules(mockConfig);
    expect(result).toContain('fsd');
    expect(result).toContain('barrel export');
    expect(result).toContain('PascalCase');
    expect(result).toContain('Import Restrictions');
    expect(result).toContain('shared');
  });

  it('buildConventionRules — forbiddenImports가 없으면 Import Restrictions 생략', () => {
    const noImports = { ...mockConfig, architecture: { ...mockConfig.architecture, forbiddenImports: {} } };
    const result = buildConventionRules(noImports);
    expect(result).not.toContain('Import Restrictions');
  });

  it('buildCodingPrinciples — 4개 원칙을 포함한다', () => {
    const result = buildCodingPrinciples();
    expect(result).toContain('Think Before Coding');
    expect(result).toContain('Simplicity First');
    expect(result).toContain('Surgical Changes');
    expect(result).toContain('Goal-Driven Execution');
  });

  it('buildCodingStandards — codingStandards를 포함한다', () => {
    const result = buildCodingStandards(mockConfig);
    expect(result).toContain('no-any');
    expect(result).toContain('no-console');
    expect(result).toContain('🚫');
    expect(result).toContain('⚠️');
  });

  it('buildCodingStandards — 비어있으면 빈 문자열', () => {
    const empty = { ...mockConfig, rules: { ...mockConfig.rules, codingStandards: [] } };
    expect(buildCodingStandards(empty)).toBe('');
  });

  it('buildWorkflowRules — SDLC 파이프라인과 테스트 설정을 포함한다', () => {
    const result = buildWorkflowRules(mockConfig);
    expect(result).toContain('/plan');
    expect(result).toContain('/generate');
    expect(result).toContain('vitest');
    expect(result).toContain('80%');
    expect(result).toContain('senior-developer');
    expect(result).toContain('src/**/*');
    expect(result).toContain('biome');
  });

  it('buildFullContent — 모든 섹션을 합친다', () => {
    const result = buildFullContent(mockConfig, '# React Rules\n- hooks 규칙');
    expect(result).toContain('test-project');
    expect(result).toContain('Think Before Coding');
    expect(result).toContain('fsd');
    expect(result).toContain('no-any');
    expect(result).toContain('/plan');
    expect(result).toContain('React Rules');
  });
});

// ─── 어댑터 레지스트리 테스트 ───

describe('adapter registry', () => {
  it('7개 에이전트를 모두 지원한다', () => {
    const types = getAllAdapterTypes();
    expect(types).toContain('claude');
    expect(types).toContain('cursor');
    expect(types).toContain('windsurf');
    expect(types).toContain('cline');
    expect(types).toContain('copilot');
    expect(types).toContain('aider');
    expect(types).toContain('gemini');
    expect(types).toHaveLength(7);
  });

  it('getAdapter — 각 타입에 대해 어댑터를 반환한다', () => {
    for (const type of getAllAdapterTypes()) {
      const adapter = getAdapter(type);
      expect(adapter).toBeDefined();
      expect(adapter.name).toBeTruthy();
      expect(adapter.type).toBe(type);
      expect(typeof adapter.supportsHooks).toBe('boolean');
      expect(typeof adapter.supportsSkills).toBe('boolean');
    }
  });
});

// ─── 에이전트별 어댑터 테스트 ───

describe('Claude adapter', () => {
  it('CLAUDE.md와 rules 파일을 생성한다', async () => {
    const adapter = getAdapter('claude');
    const output = await adapter.generate('/tmp', mockConfig, '# Stack Rules');

    const paths = output.files.map(f => f.path);
    expect(paths).toContain('.claude/CLAUDE.md');
    expect(paths).toContain('.claude/rules/conventions.md');
    expect(paths).toContain('.claude/rules/workflow.md');
    expect(paths).toContain('.claude/rules/stack.md');
  });

  it('hooks와 skills를 지원한다', () => {
    const adapter = getAdapter('claude');
    expect(adapter.supportsHooks).toBe(true);
    expect(adapter.supportsSkills).toBe(true);
  });

  it('CLAUDE.md에 프로젝트 정보와 verify 섹션이 있다', async () => {
    const adapter = getAdapter('claude');
    const output = await adapter.generate('/tmp', mockConfig, '');
    const claudeMd = output.files.find(f => f.path === '.claude/CLAUDE.md');

    expect(claudeMd).toBeDefined();
    expect(claudeMd!.content).toContain('test-project');
    expect(claudeMd!.content).toContain('Verify');
    expect(claudeMd!.content).toContain('빌드');
  });
});

describe('Cursor adapter', () => {
  it('.cursor/rules/harness.mdc를 생성한다', async () => {
    const adapter = getAdapter('cursor');
    const output = await adapter.generate('/tmp', mockConfig, '');

    const paths = output.files.map(f => f.path);
    expect(paths).toContain('.cursor/rules/harness.mdc');
  });

  it('mdc frontmatter(alwaysApply)가 포함된다', async () => {
    const adapter = getAdapter('cursor');
    const output = await adapter.generate('/tmp', mockConfig, '');
    const mdc = output.files[0];

    expect(mdc.content).toContain('alwaysApply: true');
  });
});

describe('Windsurf adapter', () => {
  it('.windsurf/rules/harness.md를 생성한다', async () => {
    const adapter = getAdapter('windsurf');
    const output = await adapter.generate('/tmp', mockConfig, '');

    expect(output.files[0].path).toBe('.windsurf/rules/harness.md');
    expect(output.files[0].content).toContain('trigger: always');
  });
});

describe('Cline adapter', () => {
  it('.clinerules/harness.md를 생성한다', async () => {
    const adapter = getAdapter('cline');
    const output = await adapter.generate('/tmp', mockConfig, '');

    expect(output.files[0].path).toBe('.clinerules/harness.md');
    expect(output.files[0].content).toContain('globs:');
  });

  it('hooks 미지원으로 skipped에 안내가 있다', async () => {
    const adapter = getAdapter('cline');
    const output = await adapter.generate('/tmp', mockConfig, '');

    expect(adapter.supportsHooks).toBe(false);
    expect(output.skipped.length).toBeGreaterThan(0);
    expect(output.skipped[0]).toContain('hooks');
  });
});

describe('Copilot adapter', () => {
  it('.github/copilot-instructions.md를 생성한다', async () => {
    const adapter = getAdapter('copilot');
    const output = await adapter.generate('/tmp', mockConfig, '');

    expect(output.files[0].path).toBe('.github/copilot-instructions.md');
  });
});

describe('Aider adapter', () => {
  it('CONVENTIONS.md와 .aider.conf.yml을 생성한다', async () => {
    const adapter = getAdapter('aider');
    const output = await adapter.generate('/tmp', mockConfig, '');

    const paths = output.files.map(f => f.path);
    expect(paths).toContain('CONVENTIONS.md');
    expect(paths).toContain('.aider.conf.yml');
  });

  it('auto-lint와 auto-test가 활성화된다', async () => {
    const adapter = getAdapter('aider');
    const output = await adapter.generate('/tmp', mockConfig, '');
    const conf = output.files.find(f => f.path === '.aider.conf.yml');

    expect(conf!.content).toContain('auto-lint: true');
    expect(conf!.content).toContain('auto-test: true');
    expect(conf!.content).toContain('biome');
    expect(conf!.content).toContain('vitest');
  });

  it('skills 미지원이다', () => {
    const adapter = getAdapter('aider');
    expect(adapter.supportsSkills).toBe(false);
    expect(adapter.supportsHooks).toBe(false);
  });
});

describe('Gemini adapter', () => {
  it('GEMINI.md를 생성한다', async () => {
    const adapter = getAdapter('gemini');
    const output = await adapter.generate('/tmp', mockConfig, '');

    expect(output.files[0].path).toBe('GEMINI.md');
    expect(output.files[0].content).toContain('test-project');
  });
});

// ─── config 변경 시 출력 변경 확인 ───

describe('config 변경 반영', () => {
  it('linter를 eslint로 바꾸면 출력도 바뀐다', async () => {
    const eslintConfig = {
      ...mockConfig,
      development: { ...mockConfig.development, linter: 'eslint', formatter: 'prettier' },
    };

    const adapter = getAdapter('claude');
    const biomeOutput = await adapter.generate('/tmp', mockConfig, '');
    const eslintOutput = await adapter.generate('/tmp', eslintConfig, '');

    const biomeWorkflow = biomeOutput.files.find(f => f.path === '.claude/rules/workflow.md');
    const eslintWorkflow = eslintOutput.files.find(f => f.path === '.claude/rules/workflow.md');

    expect(biomeWorkflow!.content).toContain('biome');
    expect(eslintWorkflow!.content).toContain('eslint');
  });

  it('아키텍처를 clean으로 바꾸면 import restrictions도 바뀐다', async () => {
    const cleanConfig = {
      ...mockConfig,
      architecture: {
        style: 'clean',
        enforceIndexGen: true,
        forbiddenImports: { domain: ['infrastructure', 'presentation'] },
      },
    };

    const adapter = getAdapter('cursor');
    const output = await adapter.generate('/tmp', cleanConfig, '');
    const content = output.files[0].content;

    expect(content).toContain('clean');
    expect(content).toContain('domain');
    expect(content).toContain('infrastructure');
  });

  it('aider의 linter가 eslint면 lint-cmd도 eslint로 된다', async () => {
    const eslintConfig = {
      ...mockConfig,
      development: { ...mockConfig.development, linter: 'eslint' },
    };

    const adapter = getAdapter('aider');
    const output = await adapter.generate('/tmp', eslintConfig, '');
    const conf = output.files.find(f => f.path === '.aider.conf.yml');

    expect(conf!.content).toContain('eslint');
    expect(conf!.content).not.toContain('biome');
  });
});
