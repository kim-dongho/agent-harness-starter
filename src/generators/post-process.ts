/**
 * 프로젝트 생성 후 후처리
 *
 * CLI가 생성한 파일에 사용자 선택을 반영한다:
 * - 테스트 프레임워크 설정 (vitest/jest config + devDependencies)
 * - 파일 네이밍 규칙 적용 (PascalCase → kebab-case 등)
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { StackConfig } from '../prompts/types.js';
import { getStackCategory } from '../constants.js';

// ─── 테스트 프레임워크 설정 ───

/**
 * 테스트 프레임워크를 설정한다 (vitest 또는 jest).
 *
 * package.json에 devDependencies와 scripts를 추가하고 설정 파일을 생성한다.
 *
 * @param projectDir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션
 */
export async function setupTestFramework(projectDir: string, config: StackConfig): Promise<void> {
  if (!config.testFramework) return;

  const category = getStackCategory(config.stack);
  if (!['frontend', 'node-backend'].includes(category)) return;

  const pkgPath = path.join(projectDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) return;

  const pkg = await fs.readJson(pkgPath);
  if (!pkg.devDependencies) pkg.devDependencies = {};
  if (!pkg.scripts) pkg.scripts = {};

  if (config.testFramework === 'vitest') {
    pkg.devDependencies['vitest'] = '^3';
    pkg.devDependencies['@testing-library/react'] = '^16';
    pkg.devDependencies['@testing-library/jest-dom'] = '^6';
    pkg.scripts['test'] = 'vitest';
    pkg.scripts['test:run'] = 'vitest run';

    await fs.writeJson(pkgPath, pkg, { spaces: 2 });

    // vitest.config.ts
    const ts = config.language !== 'javascript';
    await fs.writeFile(
      path.join(projectDir, `vitest.config.${ts ? 'ts' : 'js'}`),
      `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: '${category === 'frontend' ? 'jsdom' : 'node'}',
    globals: true,${category === 'frontend' ? `
    setupFiles: ['./vitest.setup.${ts ? 'ts' : 'js'}'],` : ''}
  },
});
`,
    );

    // tsconfig.json에서 vitest 파일 제외 (Next.js 빌드 시 타입 에러 방지)
    const tsconfigPath = path.join(projectDir, 'tsconfig.json');
    if (await fs.pathExists(tsconfigPath)) {
      try {
        const tsconfig = await fs.readJson(tsconfigPath);
        if (!tsconfig.exclude) tsconfig.exclude = [];
        if (!tsconfig.exclude.includes('vitest.config.ts')) {
          tsconfig.exclude.push('vitest.config.ts', 'vitest.setup.ts');
        }
        await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
      } catch {
        // tsconfig 파싱 실패 시 무시 (주석 포함 등)
      }
    }

    // frontend면 setup 파일도 생성
    if (category === 'frontend') {
      await fs.writeFile(
        path.join(projectDir, `vitest.setup.${ts ? 'ts' : 'js'}`),
        `import '@testing-library/jest-dom/vitest';\n`,
      );
    }
  } else if (config.testFramework === 'jest') {
    pkg.devDependencies['jest'] = '^29';
    pkg.devDependencies['@types/jest'] = '^29';
    pkg.devDependencies['ts-jest'] = '^29';
    if (category === 'frontend') {
      pkg.devDependencies['@testing-library/react'] = '^16';
      pkg.devDependencies['@testing-library/jest-dom'] = '^6';
      pkg.devDependencies['jest-environment-jsdom'] = '^29';
    }
    pkg.scripts['test'] = 'jest';
    pkg.scripts['test:watch'] = 'jest --watch';

    await fs.writeJson(pkgPath, pkg, { spaces: 2 });

    // jest.config.ts
    await fs.writeFile(
      path.join(projectDir, 'jest.config.ts'),
      `import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: '${category === 'frontend' ? 'jsdom' : 'node'}',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
`,
    );
  }
}

// ─── 아키텍처 폴더 구조 생성 ───

/**
 * 선택한 아키텍처에 맞는 폴더 구조를 src/ 안에 생성한다.
 *
 * @param projectDir - 프로젝트 디렉토리
 * @param config - 스택 설정 옵션
 */
export async function scaffoldArchitecture(projectDir: string, config: StackConfig): Promise<void> {
  if (!config.architecture) return;

  const category = getStackCategory(config.stack);
  const srcDir = path.join(projectDir, 'src');

  // src가 없으면 생성
  await fs.ensureDir(srcDir);

  if (['frontend', 'mobile'].includes(category)) {
    await scaffoldFrontendArchitecture(srcDir, config.architecture);
  } else {
    await scaffoldBackendArchitecture(srcDir, config.architecture);
  }
}

/** 프론트엔드 아키텍처 폴더 구조 */
async function scaffoldFrontendArchitecture(srcDir: string, arch: string): Promise<void> {
  switch (arch) {
    case 'fsd': {
      // Feature-Sliced Design
      // CLI가 만든 기본 폴더 중 FSD와 충돌하는 것 제거
      for (const obsolete of ['views', 'stores', 'components', 'router']) {
        const target = path.join(srcDir, obsolete);
        if (await fs.pathExists(target)) await fs.remove(target);
      }

      const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
      for (const layer of layers) {
        await fs.ensureDir(path.join(srcDir, layer));
      }
      // shared 하위 구조
      for (const sub of ['ui', 'lib', 'api', 'config', 'types']) {
        await fs.ensureDir(path.join(srcDir, 'shared', sub));
      }
      // 가이드 파일
      await fs.writeFile(path.join(srcDir, 'shared', 'README.md'), `# FSD (Feature-Sliced Design)

## 레이어 구조 (상위 → 하위)
- \`app/\` — 앱 진입점, 프로바이더, 라우팅
- \`pages/\` — 페이지 컴포넌트 (라우트 단위)
- \`widgets/\` — 독립적인 UI 블록 (헤더, 사이드바 등)
- \`features/\` — 사용자 시나리오 (로그인, 검색 등)
- \`entities/\` — 비즈니스 엔티티 (User, Product 등)
- \`shared/\` — 공유 유틸, UI 컴포넌트, 타입, 설정

## 규칙
- 상위 레이어만 하위 레이어를 import할 수 있다
- 같은 레이어 간 import 금지
- 각 slice는 public API(index.ts)를 통해서만 접근
`);
      break;
    }

    case 'atomic': {
      // Atomic Design
      for (const level of ['atoms', 'molecules', 'organisms', 'templates', 'pages']) {
        await fs.ensureDir(path.join(srcDir, 'components', level));
      }
      await fs.ensureDir(path.join(srcDir, 'hooks'));
      await fs.ensureDir(path.join(srcDir, 'utils'));
      await fs.ensureDir(path.join(srcDir, 'types'));
      await fs.ensureDir(path.join(srcDir, 'styles'));
      break;
    }

    case 'colocation': {
      // Colocation — 기능별 배치
      await fs.ensureDir(path.join(srcDir, 'components'));
      await fs.ensureDir(path.join(srcDir, 'hooks'));
      await fs.ensureDir(path.join(srcDir, 'utils'));
      await fs.ensureDir(path.join(srcDir, 'types'));
      await fs.ensureDir(path.join(srcDir, 'styles'));
      await fs.ensureDir(path.join(srcDir, 'api'));
      break;
    }

    case 'flat': {
      // Flat — 최소 구조
      await fs.ensureDir(path.join(srcDir, 'components'));
      await fs.ensureDir(path.join(srcDir, 'utils'));
      break;
    }
  }
}

/** 백엔드 아키텍처 폴더 구조 */
async function scaffoldBackendArchitecture(srcDir: string, arch: string): Promise<void> {
  switch (arch) {
    case 'layered': {
      // Layered (Controller → Service → Repository)
      for (const layer of ['controllers', 'services', 'repositories', 'models', 'middlewares', 'config']) {
        await fs.ensureDir(path.join(srcDir, layer));
      }
      break;
    }

    case 'clean': {
      // Clean Architecture (Hexagonal)
      // Domain
      await fs.ensureDir(path.join(srcDir, 'domain', 'entities'));
      await fs.ensureDir(path.join(srcDir, 'domain', 'repositories'));
      await fs.ensureDir(path.join(srcDir, 'domain', 'usecases'));
      // Application
      await fs.ensureDir(path.join(srcDir, 'application', 'services'));
      await fs.ensureDir(path.join(srcDir, 'application', 'dtos'));
      // Infrastructure
      await fs.ensureDir(path.join(srcDir, 'infrastructure', 'database'));
      await fs.ensureDir(path.join(srcDir, 'infrastructure', 'http'));
      await fs.ensureDir(path.join(srcDir, 'infrastructure', 'config'));
      break;
    }

    case 'ddd': {
      // Domain-Driven Design
      await fs.ensureDir(path.join(srcDir, 'modules'));
      // 예시 모듈
      for (const sub of ['domain', 'application', 'infrastructure', 'presentation']) {
        await fs.ensureDir(path.join(srcDir, 'modules', 'example', sub));
      }
      await fs.ensureDir(path.join(srcDir, 'shared', 'domain'));
      await fs.ensureDir(path.join(srcDir, 'shared', 'infrastructure'));
      break;
    }

    case 'modular': {
      // Modular — 도메인별 모듈 분리
      await fs.ensureDir(path.join(srcDir, 'modules'));
      await fs.ensureDir(path.join(srcDir, 'common', 'middlewares'));
      await fs.ensureDir(path.join(srcDir, 'common', 'utils'));
      await fs.ensureDir(path.join(srcDir, 'common', 'types'));
      await fs.ensureDir(path.join(srcDir, 'config'));
      break;
    }
  }
}

// ─── 선택한 라이브러리 의존성 추가 ───

/** 선택한 옵션에 따른 라이브러리를 devDependencies/dependencies에 추가 */
const DEPS_MAP: Record<string, { dep?: string; devDep?: string }> = {
  // 스타일링
  'styled-components': { dep: 'styled-components', devDep: '@types/styled-components' },
  'tailwind': { devDep: 'tailwindcss @tailwindcss/postcss postcss' },
  'vanilla-extract': { devDep: '@vanilla-extract/css @vanilla-extract/vite-plugin' },
  'panda-css': { devDep: '@pandacss/dev' },
  // css-module은 별도 의존성 불필요

  // 상태관리
  'react-query': { dep: '@tanstack/react-query' },
  'swr': { dep: 'swr' },
  'zustand': { dep: 'zustand' },
  'redux-toolkit': { dep: '@reduxjs/toolkit react-redux' },
  'jotai': { dep: 'jotai' },
  'pinia': { dep: 'pinia' },
  'ngrx': { dep: '@ngrx/store @ngrx/effects' },

  // 폼
  'react-hook-form': { dep: 'react-hook-form' },
  'formik': { dep: 'formik' },
  'vee-validate': { dep: 'vee-validate' },

  // i18n
  'next-intl': { dep: 'next-intl' },
  'react-i18next': { dep: 'react-i18next i18next' },
  'vue-i18n': { dep: 'vue-i18n' },

  // ORM (Node)
  'prisma': { dep: '@prisma/client', devDep: 'prisma' },
  'drizzle': { dep: 'drizzle-orm', devDep: 'drizzle-kit' },
  'typeorm': { dep: 'typeorm reflect-metadata' },

  // API 문서화
  'swagger': { dep: 'swagger-ui-express swagger-jsdoc', devDep: '@types/swagger-ui-express @types/swagger-jsdoc' },
  'scalar': { dep: '@scalar/express-api-reference' },
};

/**
 * 사용자가 선택한 라이브러리를 package.json에 추가한다.
 *
 * @param projectDir - 프로젝트 디렉토리
 * @param config - 스택 설정 옵션
 */
export async function installSelectedLibraries(projectDir: string, config: StackConfig): Promise<void> {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) return;

  const pkg = await fs.readJson(pkgPath);
  if (!pkg.dependencies) pkg.dependencies = {};
  if (!pkg.devDependencies) pkg.devDependencies = {};

  let changed = false;

  // 선택된 옵션들을 수집
  const selections = [
    config.style,
    ...(config.stateManagement?.split(',') ?? []),
    config.formLibrary,
    config.i18n,
    config.orm,
    config.apiDocs,
  ].filter((v) => v && v !== 'none' && v !== 'css-module');

  for (const selection of selections) {
    const entry = DEPS_MAP[selection!];
    if (!entry) continue;

    if (entry.dep) {
      for (const d of entry.dep.split(' ')) {
        pkg.dependencies[d] = '*';
        changed = true;
      }
    }
    if (entry.devDep) {
      for (const d of entry.devDep.split(' ')) {
        pkg.devDependencies[d] = '*';
        changed = true;
      }
    }
  }

  if (changed) {
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  }
}

// ─── 파일 네이밍 규칙 적용 ───

/**
 * 파일 네이밍 규칙을 src/ 디렉토리에 재귀적으로 적용한다.
 *
 * Next.js 라우팅 파일(page.tsx, layout.tsx 등)은 보호되어 이름이 변경되지 않는다.
 *
 * @param projectDir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션 (namingConvention 필드 사용)
 */
export async function applyNamingConvention(projectDir: string, config: StackConfig): Promise<void> {
  if (!config.namingConvention || config.namingConvention === 'PascalCase') return;

  const category = getStackCategory(config.stack);
  if (!['frontend', 'node-backend'].includes(category)) return;

  const srcDir = path.join(projectDir, 'src');
  if (!(await fs.pathExists(srcDir))) return;

  // Next.js 라우팅 파일은 이름 변경 불가 (page.tsx, layout.tsx 등)
  const PROTECTED_FILES = new Set([
    'page.tsx', 'page.jsx', 'page.ts', 'page.js',
    'layout.tsx', 'layout.jsx', 'layout.ts', 'layout.js',
    'loading.tsx', 'error.tsx', 'not-found.tsx',
    'route.ts', 'route.js',
    'middleware.ts', 'middleware.js',
    'index.tsx', 'index.ts', 'index.js', 'index.jsx',
    'main.tsx', 'main.ts', 'main.js',
    'App.tsx', 'App.ts', 'App.jsx', 'App.js',
    'vite-env.d.ts',
  ]);

  await renameFilesRecursive(srcDir, config.namingConvention, PROTECTED_FILES);
}

async function renameFilesRecursive(
  dir: string,
  convention: string,
  protectedFiles: Set<string>,
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 폴더도 네이밍 변환
      const newName = convertName(entry.name, convention);
      if (newName !== entry.name) {
        const newPath = path.join(dir, newName);
        await fs.rename(fullPath, newPath);
        await renameFilesRecursive(newPath, convention, protectedFiles);
      } else {
        await renameFilesRecursive(fullPath, convention, protectedFiles);
      }
    } else if (!protectedFiles.has(entry.name)) {
      const ext = path.extname(entry.name);
      const base = path.basename(entry.name, ext);

      // 이미 올바른 컨벤션이면 스킵
      const newBase = convertName(base, convention);
      if (newBase !== base) {
        const newPath = path.join(dir, `${newBase}${ext}`);
        await fs.rename(fullPath, newPath);
      }
    }
  }
}

function convertName(name: string, convention: string): string {
  // PascalCase나 camelCase를 분리 → 단어 배열
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase/PascalCase 분리
    .replace(/[-_]/g, ' ') // 기존 구분자 분리
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return name;

  switch (convention) {
    case 'kebab-case':
      return words.join('-');
    case 'camelCase':
      return words[0] + words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
    case 'PascalCase':
      return words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
    default:
      return name;
  }
}
