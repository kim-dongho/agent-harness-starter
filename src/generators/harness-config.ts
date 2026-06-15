/**
 * harness.config.json 생성기
 *
 * 사용자 선택(UserChoices)을 harness-core 호환 config로 변환한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import { getStackCategory } from '../constants.js';
import type { UserChoices, StackConfig } from '../prompts/types.js';

/** harness-core 호환 config 타입 */
interface HarnessConfig {
  project: {
    name: string;
    framework: string;
    packageManager: string;
    language: string;
  };
  architecture: {
    style: string;
    enforceIndexGen: boolean;
    forbiddenImports: Record<string, string[]>;
  };
  development: {
    linter: string;
    formatter: string;
    styling: string;
  };
  testing: {
    runner: string;
    minCoverage: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    requireTestFileWithImplementation: boolean;
  };
  agent: {
    persona: string;
    allowedScopes: string[];
    adapters: string[];
  };
  rules: {
    fileNaming: {
      components: string;
      hooks: string;
      utils: string;
      services: string;
      models: string;
      testSuffix: string;
    };
    codingStandards: Array<{
      id: string;
      description: string;
      severity: 'error' | 'warn' | 'info';
    }>;
  };
}

/** 스택 → framework 매핑 */
function toFramework(stack: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'nextjs', 'nextjs-pages': 'nextjs',
    'react-vite': 'vite-react', 'vue-vite': 'vite-vue',
    'nuxt': 'nuxt', 'sveltekit': 'svelte', 'remix': 'remix',
    'angular': 'angular', 'astro': 'astro',
    'node-express': 'express', 'node-nestjs': 'nest', 'node-fastify': 'fastify',
    'node-hono': 'hono',
    'go-gin': 'gin', 'go-fiber': 'fiber', 'go-echo': 'echo',
    'java-spring': 'spring',
    'python-fastapi': 'fastapi', 'python-django': 'django', 'python-flask': 'flask',
    'rust-axum': 'axum', 'rust-actix': 'actix',
    'kotlin-ktor': 'ktor', 'dotnet': 'dotnet',
    'solidity-hardhat': 'hardhat', 'solidity-foundry': 'foundry',
    'solana-anchor': 'anchor', 'move-sui': 'sui',
  };
  return map[stack] ?? stack;
}

/** 아키텍처 → harness style 매핑 */
function toArchStyle(arch?: string): string {
  const map: Record<string, string> = {
    'fsd': 'fsd', 'atomic': 'atomic', 'colocation': 'colocation', 'flat': 'flat',
    'layered': 'layered', 'clean': 'clean', 'ddd': 'ddd', 'modular': 'modular',
    'clean-mobile': 'clean', 'mvvm': 'mvvm', 'feature-first': 'feature-first',
  };
  return map[arch ?? ''] ?? 'modular';
}

/** 아키텍처별 forbiddenImports 기본값 */
function getForbiddenImports(arch?: string): Record<string, string[]> {
  switch (arch) {
    case 'fsd':
      return {
        'shared': ['features', 'widgets', 'pages', 'app'],
        'entities': ['features', 'widgets', 'pages', 'app'],
        'features': ['widgets', 'pages', 'app'],
        'widgets': ['pages', 'app'],
        'pages': ['app'],
      };
    case 'clean':
      return {
        'domain': ['infrastructure', 'presentation'],
        'application': ['infrastructure', 'presentation'],
      };
    case 'layered':
      return {
        'repository': ['controller', 'route'],
        'service': ['controller', 'route'],
      };
    default:
      return {};
  }
}

/** 에이전트 → adapter 매핑 */
function toAdapter(agent: string): string {
  const map: Record<string, string> = {
    'claude': 'claude', 'cursor': 'cursor', 'windsurf': 'windsurf',
    'copilot': 'copilot', 'aider': 'aider', 'cline': 'generic', 'gemini': 'generic',
  };
  return map[agent] ?? 'generic';
}

/** 스택별 기본 테스트 러너 */
function getDefaultTestRunner(config: { stack: string; testFramework?: string }): string {
  if (config.testFramework) return config.testFramework;
  const defaults: Record<string, string> = {
    'go-gin': 'go test', 'go-fiber': 'go test', 'go-echo': 'go test',
    'python-fastapi': 'pytest', 'python-django': 'pytest', 'python-flask': 'pytest',
    'java-spring': 'junit',
    'rust-axum': 'cargo test', 'rust-actix': 'cargo test',
    'kotlin-ktor': 'junit',
    'dotnet': 'dotnet test',
    'solidity-hardhat': 'hardhat test', 'solidity-foundry': 'forge test',
    'solana-anchor': 'anchor test',
    'move-sui': 'sui move test',
  };
  return defaults[config.stack] ?? 'vitest';
}

/** 스택 → 앱 디렉토리명 매핑 */
function toAppDir(stack: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'web', 'nextjs-pages': 'web', 'react-vite': 'web',
    'vue-vite': 'web', 'nuxt': 'web', 'sveltekit': 'web', 'angular': 'web',
    'remix': 'web',
    'go-gin': 'api', 'go-fiber': 'api', 'go-echo': 'api',
    'java-spring': 'api', 'kotlin-ktor': 'api', 'dotnet': 'api',
    'python-fastapi': 'api', 'python-django': 'api', 'python-flask': 'api',
    'node-express': 'api', 'node-nestjs': 'api',
    'rust-axum': 'api', 'rust-actix': 'api',
    'solidity-hardhat': 'contracts', 'solidity-foundry': 'contracts',
    'solana-anchor': 'contracts', 'move-sui': 'contracts',
  };
  return map[stack] ?? stack;
}

/** linter → formatter 매핑 */
function toFormatter(linter?: string): string {
  if (linter === 'biome') return 'biome';
  return 'prettier';
}

/**
 * harness.config.json을 생성한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @param choices - 사용자 선택 결과
 */
export async function generateHarnessConfig(projectDir: string, choices: UserChoices): Promise<void> {
  const category = getStackCategory(choices.stack);
  const isFrontend = category === 'frontend';

  const stacks = choices.stacks ?? [choices];
  const isMulti = stacks.length > 1;

  const config: HarnessConfig = {
    project: {
      name: choices.projectName,
      framework: isMulti
        ? Object.fromEntries(stacks.map((s) => [toAppDir(s.stack), toFramework(s.stack)])) as unknown as string
        : toFramework(choices.stack),
      packageManager: choices.packageManager ?? 'npm',
      language: choices.language ?? 'typescript',
    },
    architecture: isMulti
      ? {
        style: Object.fromEntries(stacks.map((s) => [toAppDir(s.stack), toArchStyle(s.architecture)])) as unknown as string,
        enforceIndexGen: true,
        forbiddenImports: Object.assign({}, ...stacks.map((s) => getForbiddenImports(s.architecture))),
      }
      : {
        style: toArchStyle(choices.architecture),
        enforceIndexGen: true,
        forbiddenImports: getForbiddenImports(choices.architecture),
      },
    development: {
      linter: choices.linter === 'biome' ? 'biome' : 'eslint',
      formatter: toFormatter(choices.linter),
      styling: choices.style ?? '',
    },
    testing: {
      runner: isMulti
        ? Object.fromEntries(stacks.map((s) => [toAppDir(s.stack), getDefaultTestRunner(s)])) as unknown as string
        : getDefaultTestRunner(choices),
      minCoverage: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      requireTestFileWithImplementation: stacks.some((s) => getStackCategory(s.stack) !== 'frontend'),
    },
    agent: {
      persona: 'senior-developer',
      allowedScopes: choices.repoStructure === 'monorepo'
        ? ['apps/**/*', 'packages/**/*', 'tests/**/*']
        : ['src/**/*', 'tests/**/*'],
      adapters: [toAdapter(choices.agent)],
    },
    rules: {
      fileNaming: {
        components: (choices.namingConvention ?? 'PascalCase') as string,
        hooks: (choices.namingConvention ?? 'camelCase') as string,
        utils: (choices.namingConvention ?? 'camelCase') as string,
        services: (choices.namingConvention ?? 'camelCase') as string,
        models: (choices.namingConvention ?? 'camelCase') as string,
        testSuffix: '.test',
      },
      codingStandards: [
        { id: 'no-hardcoded-secrets', description: '시크릿/크리덴셜을 코드에 하드코딩하지 않는다 — 환경변수를 사용한다', severity: 'error' as const },
        { id: 'no-console-log', description: 'console.log를 디버깅 용도로 남기지 않는다 — 구조화된 로거를 사용한다', severity: 'error' as const },
        { id: 'no-commented-code', description: '주석 처리된 코드 블록을 커밋하지 않는다', severity: 'error' as const },
        { id: 'no-todo-without-issue', description: 'TODO/FIXME는 이슈 번호 없이 남기지 않는다 — TODO(#123) 형태', severity: 'warn' as const },
        { id: 'no-scope-creep', description: '요청 범위 밖의 코드를 개선하지 않는다', severity: 'error' as const },
        { id: 'no-policy-change', description: '기존 비즈니스 정책을 확인 없이 변경하지 않는다', severity: 'error' as const },
      ],
    },
  };

  await fs.writeJson(path.join(projectDir, 'harness.config.json'), config, { spaces: 2 });
}
