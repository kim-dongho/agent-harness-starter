/**
 * @fileoverview 모노레포 공유 패키지 생성기
 *
 * TypeScript 설정, ESLint/Biome 설정 등 모노레포 내 공유 패키지를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { UserChoices } from '../prompts/types.js';

/**
 * 모노레포 공유 패키지를 생성한다.
 *
 * JS/TS 스택이 포함된 경우 typescript-config, eslint-config/biome 등의 공유 패키지를 생성한다.
 *
 * @param projectDir - 모노레포 루트 디렉토리 절대 경로
 * @param choices - 사용자 선택 결과
 */
export async function setupMonorepoSharedPackages(
  projectDir: string,
  choices: UserChoices,
): Promise<void> {
  const stacks = choices.stacks ?? [];
  const hasJsTs = stacks.some((s) =>
    !['go-gin', 'go-echo', 'java-spring', 'python-fastapi', 'python-django', 'flutter'].includes(s.stack)
  );

  if (!hasJsTs) return;

  // 린트/포맷터 설정에서 가장 먼저 나오는 스택의 옵션을 기준으로
  const jsStack = stacks.find((s) => s.linter);
  const linter = jsStack?.linter;
  const language = jsStack?.language ?? 'typescript';
  const pm = jsStack?.packageManager ?? 'pnpm';

  // pnpm이면 pnpm-workspace.yaml 생성
  if (pm === 'pnpm') {
    await fs.writeFile(
      path.join(projectDir, 'pnpm-workspace.yaml'),
      `packages:\n  - "apps/*"\n  - "packages/*"\n`,
    );
    // pnpm은 workspaces 필드 대신 pnpm-workspace.yaml 사용
    const pkg = await fs.readJson(path.join(projectDir, 'package.json'));
    delete pkg.workspaces;
    await fs.writeJson(path.join(projectDir, 'package.json'), pkg, { spaces: 2 });
  }

  // .npmrc
  if (pm === 'pnpm') {
    await fs.writeFile(path.join(projectDir, '.npmrc'), 'auto-install-peers=true\n');
  }

  // TypeScript 선택 시 공유 tsconfig 생성
  if (language === 'typescript') {
    await setupSharedTsConfig(projectDir);
  }

  // 린터 선택에 따라 공유 설정 생성
  if (linter === 'eslint-prettier') {
    await setupSharedEslint(projectDir);
  } else if (linter === 'biome') {
    await setupSharedBiome(projectDir);
  }
}

// ─── 공유 TypeScript 설정 ───

async function setupSharedTsConfig(projectDir: string): Promise<void> {
  const pkgDir = path.join(projectDir, 'packages', 'typescript-config');
  await fs.ensureDir(pkgDir);

  await fs.writeJson(path.join(pkgDir, 'package.json'), {
    name: '@repo/typescript-config',
    version: '0.0.0',
    private: true,
    files: ['*.json'],
  }, { spaces: 2 });

  // base.json
  await fs.writeJson(path.join(pkgDir, 'base.json'), {
    $schema: 'https://json.schemastore.org/tsconfig',
    compilerOptions: {
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      incremental: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    exclude: ['node_modules'],
  }, { spaces: 2 });

  // nextjs.json
  await fs.writeJson(path.join(pkgDir, 'nextjs.json'), {
    $schema: 'https://json.schemastore.org/tsconfig',
    extends: './base.json',
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      noEmit: true,
      module: 'esnext',
      jsx: 'preserve',
      plugins: [{ name: 'next' }],
    },
  }, { spaces: 2 });

  // react.json
  await fs.writeJson(path.join(pkgDir, 'react.json'), {
    $schema: 'https://json.schemastore.org/tsconfig',
    extends: './base.json',
    compilerOptions: {
      target: 'ES2020',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      jsx: 'react-jsx',
    },
  }, { spaces: 2 });

  // node.json
  await fs.writeJson(path.join(pkgDir, 'node.json'), {
    $schema: 'https://json.schemastore.org/tsconfig',
    extends: './base.json',
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      lib: ['ES2022'],
      outDir: 'dist',
    },
  }, { spaces: 2 });
}

// ─── 공유 ESLint + Prettier 설정 ───

async function setupSharedEslint(projectDir: string): Promise<void> {
  const pkgDir = path.join(projectDir, 'packages', 'eslint-config');
  await fs.ensureDir(pkgDir);

  await fs.writeJson(path.join(pkgDir, 'package.json'), {
    name: '@repo/eslint-config',
    version: '0.0.0',
    private: true,
    files: ['*.js'],
    devDependencies: {
      eslint: '^9',
      'eslint-config-prettier': '^10',
      'eslint-plugin-prettier': '^5',
      '@eslint/js': '^9',
      'typescript-eslint': '^8',
      prettier: '^3',
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(pkgDir, 'base.js'), `import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.next/', 'build/'],
  },
];
`);

  await fs.writeFile(path.join(pkgDir, 'react.js'), `import base from './base.js';

export default [
  ...base,
  {
    settings: {
      react: { version: 'detect' },
    },
  },
];
`);

  // 루트 prettier 설정
  await fs.writeJson(path.join(projectDir, '.prettierrc'), {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 2,
  }, { spaces: 2 });
}

// ─── 공유 Biome 설정 ───

async function setupSharedBiome(projectDir: string): Promise<void> {
  // Biome는 루트에 하나만 두면 됨 (모노레포 지원 내장)
  await fs.writeJson(path.join(projectDir, 'biome.json'), {
    $schema: 'https://biomejs.dev/schemas/1.9.0/schema.json',
    vcs: {
      enabled: true,
      clientKind: 'git',
      useIgnoreFile: true,
    },
    organizeImports: { enabled: true },
    formatter: {
      enabled: true,
      indentStyle: 'space',
      indentWidth: 2,
      lineWidth: 100,
    },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
        complexity: {
          noExcessiveCognitiveComplexity: 'warn',
        },
        suspicious: {
          noExplicitAny: 'error',
        },
      },
    },
    javascript: {
      formatter: {
        quoteStyle: 'single',
        trailingCommas: 'all',
        semicolons: 'always',
      },
    },
    files: {
      ignore: ['node_modules', 'dist', '.next', 'build', '.turbo'],
    },
  }, { spaces: 2 });
}
