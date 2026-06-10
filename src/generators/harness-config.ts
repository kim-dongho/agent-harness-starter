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
    'angular': 'unknown', 'astro': 'astro',
    'node-express': 'express', 'node-nestjs': 'nest', 'node-fastify': 'fastify',
    'node-hono': 'unknown',
  };
  return map[stack] ?? 'unknown';
}

/** 아키텍처 → harness style 매핑 */
function toArchStyle(arch?: string): string {
  const map: Record<string, string> = {
    'fsd': 'fsd', 'atomic': 'custom', 'colocation': 'modular', 'flat': 'flat',
    'layered': 'modular', 'clean': 'clean', 'ddd': 'custom', 'modular': 'modular',
    'clean-mobile': 'clean', 'mvvm': 'custom', 'feature-first': 'modular',
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

  const config: HarnessConfig = {
    project: {
      name: choices.projectName,
      framework: toFramework(choices.stack),
      packageManager: choices.packageManager ?? 'npm',
      language: choices.language ?? 'typescript',
    },
    architecture: {
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
      runner: choices.testFramework ?? 'vitest',
      minCoverage: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      requireTestFileWithImplementation: !isFrontend,
    },
    agent: {
      persona: 'senior-developer',
      allowedScopes: ['src/**/*', 'tests/**/*'],
      adapters: [toAdapter(choices.agent)],
    },
    rules: {
      fileNaming: {
        components: 'PascalCase' as const,
        hooks: 'camelCase' as const,
        utils: 'camelCase' as const,
        services: 'camelCase' as const,
        models: 'camelCase' as const,
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
