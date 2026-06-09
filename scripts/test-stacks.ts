#!/usr/bin/env tsx

/**
 * 스택별 자동 테스트 스크립트
 *
 * 각 스택 조합으로 프로젝트를 생성하고 결과를 검증한다.
 * 인터랙티브 프롬프트를 우회하여 프로그래밍 방식으로 scaffold를 호출.
 *
 * 사용법:
 *   npx tsx scripts/test-stacks.ts              # 전체 테스트
 *   npx tsx scripts/test-stacks.ts frontend     # 카테고리별
 *   npx tsx scripts/test-stacks.ts nextjs-app    # 단일 스택
 *   npx tsx scripts/test-stacks.ts monorepo      # 모노레포 테스트
 */
import path from 'node:path';
import fs from 'fs-extra';
import { execSync } from 'node:child_process';
import { scaffold } from '../src/scaffolder/index.js';
import type { UserChoices } from '../src/prompts/types.js';

const TEST_DIR = path.resolve(import.meta.dirname, '..', '.test-output');

// ─── 테스트 케이스 정의 ───

interface TestCase {
  name: string;
  category: 'frontend' | 'backend' | 'blockchain' | 'mobile' | 'monorepo';
  choices: UserChoices;
  /** 생성 후 존재해야 하는 파일들 */
  expectedFiles: string[];
  /** package.json에 포함되어야 하는 의존성 (JS/TS만) */
  expectedDeps?: string[];
}

const FRONTEND_TESTS: TestCase[] = [
  {
    name: 'nextjs-app',
    category: 'frontend',
    choices: {
      projectName: 'test-nextjs', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'nextjs-app', language: 'typescript', architecture: 'fsd',
      packageManager: 'npm', linter: 'eslint-prettier', namingConvention: 'kebab-case',
      style: 'styled-components', stateManagement: 'react-query,zustand',
      testFramework: 'vitest', formLibrary: 'react-hook-form', i18n: 'react-i18next',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['package.json', '.claude/CLAUDE.md', '.claude/rules', '.claude/skills', 'README.md', '.env.example', 'vitest.config.ts'],
    expectedDeps: ['styled-components', '@tanstack/react-query', 'zustand', 'react-hook-form', 'react-i18next'],
  },
  {
    name: 'react-vite',
    category: 'frontend',
    choices: {
      projectName: 'test-react', agent: 'cursor', repoStructure: 'polyrepo',
      stack: 'react-vite', language: 'typescript', architecture: 'atomic',
      packageManager: 'npm', linter: 'biome', namingConvention: 'PascalCase',
      style: 'tailwind', stateManagement: 'zustand', testFramework: 'jest',
      formLibrary: 'none', i18n: 'none',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['package.json', '.cursor/rules', '.cursor/skills', 'jest.config.ts'],
    expectedDeps: ['zustand'],
  },
  {
    name: 'vue-vite',
    category: 'frontend',
    choices: {
      projectName: 'test-vue', agent: 'windsurf', repoStructure: 'polyrepo',
      stack: 'vue-vite', language: 'typescript', architecture: 'colocation',
      packageManager: 'npm', linter: 'eslint-prettier', namingConvention: 'kebab-case',
      style: 'css-module', stateManagement: 'pinia', testFramework: 'vitest',
      formLibrary: 'vee-validate', i18n: 'vue-i18n',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['package.json', '.windsurf/rules', '.windsurf/skills'],
    expectedDeps: ['pinia', 'vee-validate', 'vue-i18n'],
  },
];

const BACKEND_TESTS: TestCase[] = [
  {
    name: 'node-express',
    category: 'backend',
    choices: {
      projectName: 'test-express', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'node-express', language: 'typescript', architecture: 'layered',
      packageManager: 'npm', linter: 'eslint-prettier', namingConvention: 'kebab-case',
      orm: 'prisma', database: 'postgresql', apiStyle: 'rest', apiDocs: 'swagger',
      testFramework: 'vitest',
      graphify: false, docker: true, autoInstall: false,
    },
    expectedFiles: ['package.json', 'src/index.ts', 'tsconfig.json', 'Dockerfile', 'docker-compose.yml', '.env.example'],
    expectedDeps: ['@prisma/client', 'swagger-ui-express'],
  },
  {
    name: 'go-gin',
    category: 'backend',
    choices: {
      projectName: 'test-go-gin', agent: 'gemini', repoStructure: 'polyrepo',
      stack: 'go-gin', architecture: 'clean', orm: 'gorm', database: 'postgresql',
      apiStyle: 'rest', apiDocs: 'swagger', goLinter: 'golangci-lint',
      graphify: false, docker: true, autoInstall: false,
    },
    expectedFiles: ['go.mod', 'cmd/server/main.go', 'internal/handler/health.go', 'Dockerfile', '.env.example'],
  },
  {
    name: 'python-fastapi',
    category: 'backend',
    choices: {
      projectName: 'test-fastapi', agent: 'cline', repoStructure: 'polyrepo',
      stack: 'python-fastapi', architecture: 'modular', pythonPackageManager: 'uv',
      orm: 'sqlalchemy', database: 'postgresql', apiStyle: 'rest', apiDocs: 'scalar',
      graphify: false, docker: true, autoInstall: false,
    },
    expectedFiles: ['pyproject.toml', 'app/main.py', 'Dockerfile', '.env.example'],
  },
  {
    name: 'java-spring',
    category: 'backend',
    choices: {
      projectName: 'test-spring', agent: 'copilot', repoStructure: 'polyrepo',
      stack: 'java-spring', architecture: 'layered', buildTool: 'gradle',
      database: 'postgresql', apiStyle: 'rest', apiDocs: 'swagger',
      graphify: false, docker: true, autoInstall: false,
    },
    expectedFiles: ['build.gradle.kts', 'src/main/java/com/example/app/Application.java', 'Dockerfile'],
  },
  {
    name: 'rust-axum',
    category: 'backend',
    choices: {
      projectName: 'test-axum', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'rust-axum', architecture: 'layered', database: 'postgresql',
      apiStyle: 'rest', apiDocs: 'none',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['Cargo.toml', 'src/main.rs'],
  },
];

const BLOCKCHAIN_TESTS: TestCase[] = [
  {
    name: 'solidity-hardhat',
    category: 'blockchain',
    choices: {
      projectName: 'test-hardhat', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'solidity-hardhat', network: 'ethereum',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['package.json', 'hardhat.config.ts', 'contracts/Lock.sol', '.env.example'],
  },
  {
    name: 'solana-anchor',
    category: 'blockchain',
    choices: {
      projectName: 'test-anchor', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'solana-anchor', network: 'other',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['Anchor.toml', 'Cargo.toml'],
  },
  {
    name: 'move-sui',
    category: 'blockchain',
    choices: {
      projectName: 'test-sui', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'move-sui', network: 'other',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['Move.toml'],
  },
  {
    name: 'ton-tact',
    category: 'blockchain',
    choices: {
      projectName: 'test-ton', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'ton-tact', network: 'other',
      graphify: false, docker: false, autoInstall: false,
    },
    expectedFiles: ['package.json', 'contracts/counter.tact', 'tact.config.json'],
  },
];

const MONOREPO_TEST: TestCase = {
  name: 'monorepo-full',
  category: 'monorepo',
  choices: {
    projectName: 'test-monorepo', agent: 'claude', repoStructure: 'monorepo',
    stack: 'nextjs-app', // primary
    packageManager: 'pnpm', linter: 'eslint-prettier', language: 'typescript', namingConvention: 'kebab-case',
    stacks: [
      {
        stack: 'nextjs-app', language: 'typescript', architecture: 'fsd',
        packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case',
        style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest',
        formLibrary: 'none', i18n: 'none',
      },
      {
        stack: 'go-gin', architecture: 'layered', orm: 'gorm', database: 'postgresql',
        apiStyle: 'rest', apiDocs: 'swagger', goLinter: 'golangci-lint',
      },
      {
        stack: 'solidity-foundry', network: 'ethereum',
      },
    ],
    graphify: false, docker: true, autoInstall: false,
  },
  expectedFiles: [
    'package.json', 'turbo.json', 'docker-compose.yml', '.env.example', 'README.md',
    'apps/web/package.json',
    'apps/api/go.mod',
    'apps/contracts/foundry.toml',
    '.claude/CLAUDE.md',
    '.claude/skills',
    'packages/typescript-config/package.json',
    'packages/eslint-config/package.json',
  ],
};

// ─── 테스트 실행 ───

const ALL_TESTS: TestCase[] = [
  ...FRONTEND_TESTS,
  ...BACKEND_TESTS,
  ...BLOCKCHAIN_TESTS,
  MONOREPO_TEST,
];

interface TestResult {
  name: string;
  passed: boolean;
  errors: string[];
  duration: number;
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const start = Date.now();
  const errors: string[] = [];
  const projectDir = path.join(TEST_DIR, testCase.choices.projectName);

  try {
    // 기존 폴더 제거
    await fs.remove(projectDir);

    // 원래 cwd를 저장하고 TEST_DIR로 이동
    const originalCwd = process.cwd();
    process.chdir(TEST_DIR);

    // scaffold 실행
    await scaffold(testCase.choices, { silent: true });

    // cwd 복원
    process.chdir(originalCwd);

    // 1. 기대 파일 존재 확인
    for (const file of testCase.expectedFiles) {
      const filePath = path.join(projectDir, file);
      if (!(await fs.pathExists(filePath))) {
        errors.push(`파일 없음: ${file}`);
      }
    }

    // 2. 의존성 확인 (JS/TS 스택)
    if (testCase.expectedDeps) {
      const pkgPath = path.join(projectDir, 'package.json');
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJson(pkgPath);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const dep of testCase.expectedDeps) {
          if (!allDeps[dep]) {
            errors.push(`의존성 없음: ${dep}`);
          }
        }
      }
    }

    // 3. 에이전트 룰 존재 확인
    const agentDirs: Record<string, string> = {
      claude: '.claude', cursor: '.cursor', windsurf: '.windsurf',
      cline: '.clinerules', copilot: '.github', aider: '.aider', gemini: '.gemini',
    };
    const agentDir = agentDirs[testCase.choices.agent];
    if (agentDir && !(await fs.pathExists(path.join(projectDir, agentDir)))) {
      errors.push(`에이전트 디렉토리 없음: ${agentDir}`);
    }

    // 4. .env.example 존재 확인
    if (!(await fs.pathExists(path.join(projectDir, '.env.example')))) {
      errors.push('.env.example 없음');
    }

    // 5. README.md 존재 확인
    if (!(await fs.pathExists(path.join(projectDir, 'README.md')))) {
      errors.push('README.md 없음');
    }

    // 6. 아키텍처 폴더 구조 확인
    const arch = testCase.choices.architecture;
    const srcDir = path.join(projectDir, 'src');
    if (arch && await fs.pathExists(srcDir)) {
      const archDirs: Record<string, string[]> = {
        fsd: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'],
        atomic: ['components/atoms', 'components/molecules', 'components/organisms'],
        layered: ['controllers', 'services', 'repositories'],
        clean: ['domain/entities', 'domain/usecases', 'infrastructure'],
        ddd: ['modules', 'shared/domain'],
        modular: ['modules', 'common', 'config'],
      };
      const expected = archDirs[arch];
      if (expected) {
        for (const dir of expected) {
          if (!(await fs.pathExists(path.join(srcDir, dir)))) {
            errors.push(`아키텍처 폴더 없음: src/${dir}`);
          }
        }
      }
    }

    // 7. skills 존재 확인 (aider 제외)
    if (testCase.choices.agent !== 'aider') {
      const skillsDirs: Record<string, string> = {
        claude: '.claude/skills', cursor: '.cursor/skills', windsurf: '.windsurf/skills',
        cline: '.cline/skills', copilot: '.github/skills', gemini: '.gemini/skills',
      };
      const skillsDir = skillsDirs[testCase.choices.agent];
      if (skillsDir && !(await fs.pathExists(path.join(projectDir, skillsDir)))) {
        errors.push(`skills 디렉토리 없음: ${skillsDir}`);
      }
    }

    // 8. Docker 파일 확인 (docker: true인 경우)
    if (testCase.choices.docker) {
      if (!(await fs.pathExists(path.join(projectDir, 'Dockerfile')))) {
        errors.push('Dockerfile 없음');
      }
      if (!(await fs.pathExists(path.join(projectDir, 'docker-compose.yml')))) {
        errors.push('docker-compose.yml 없음');
      }
    }

    // 9. .nvmrc 확인
    if (!(await fs.pathExists(path.join(projectDir, '.nvmrc')))) {
      errors.push('.nvmrc 없음');
    }

    // 10. vitest/jest config 확인 (선택한 경우)
    if (testCase.choices.testFramework === 'vitest') {
      const hasConfig = await fs.pathExists(path.join(projectDir, 'vitest.config.ts'))
        || await fs.pathExists(path.join(projectDir, 'vitest.config.js'));
      if (!hasConfig) errors.push('vitest.config 없음');
    }
    if (testCase.choices.testFramework === 'jest') {
      if (!(await fs.pathExists(path.join(projectDir, 'jest.config.ts')))) {
        errors.push('jest.config.ts 없음');
      }
    }

  } catch (err) {
    errors.push(`scaffold 에러: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    name: testCase.name,
    passed: errors.length === 0,
    errors,
    duration: Date.now() - start,
  };
}

async function main() {
  const filter = process.argv[2]; // 카테고리 또는 스택명 필터

  let testsToRun = ALL_TESTS;
  if (filter) {
    if (['frontend', 'backend', 'blockchain', 'mobile', 'monorepo'].includes(filter)) {
      testsToRun = ALL_TESTS.filter((t) => t.category === filter);
    } else {
      testsToRun = ALL_TESTS.filter((t) => t.name === filter);
    }
  }

  console.log(`\n🧪 ${testsToRun.length}개 테스트 실행\n`);

  // 테스트 디렉토리 준비
  await fs.ensureDir(TEST_DIR);

  const results: TestResult[] = [];

  for (const testCase of testsToRun) {
    process.stdout.write(`  ${testCase.name} ... `);
    const result = await runTest(testCase);
    results.push(result);

    if (result.passed) {
      console.log(`✅ (${result.duration}ms)`);
    } else {
      console.log(`❌ (${result.duration}ms)`);
      for (const err of result.errors) {
        console.log(`    └─ ${err}`);
      }
    }
  }

  // 요약
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`총 ${results.length}개: ✅ ${passed} 통과, ❌ ${failed} 실패`);
  console.log(`테스트 출력: ${TEST_DIR}\n`);

  // 정리 (선택)
  if (process.argv.includes('--clean')) {
    await fs.remove(TEST_DIR);
    console.log('테스트 출력 정리 완료\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
