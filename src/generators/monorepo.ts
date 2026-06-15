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

  // 린터 — Biome은 루트 설정만 (ESLint는 각 앱이 자체 설정 사용)
  if (linter === 'biome') {
    await setupSharedBiome(projectDir);
  }
}

// ─── 공유 Biome 설정 ───

async function setupSharedBiome(projectDir: string): Promise<void> {
  // 루트 devDependencies에 @biomejs/biome 추가
  const rootPkgPath = path.join(projectDir, 'package.json');
  const rootPkg = await fs.readJson(rootPkgPath);
  rootPkg.devDependencies = rootPkg.devDependencies ?? {};
  rootPkg.devDependencies['@biomejs/biome'] = '^1.9.0';
  rootPkg.scripts = rootPkg.scripts ?? {};
  rootPkg.scripts.lint = 'biome check .';
  rootPkg.scripts.format = 'biome check --write .';
  await fs.writeJson(rootPkgPath, rootPkg, { spaces: 2 });

  // apps 내 package.json의 lint 스크립트를 biome으로 변경
  const appsDir = path.join(projectDir, 'apps');
  if (await fs.pathExists(appsDir)) {
    const apps = await fs.readdir(appsDir);
    for (const app of apps) {
      const appPkgPath = path.join(appsDir, app, 'package.json');
      if (await fs.pathExists(appPkgPath)) {
        const appPkg = await fs.readJson(appPkgPath);
        if (appPkg.scripts?.lint) {
          appPkg.scripts.lint = 'biome check .';
        }
        await fs.writeJson(appPkgPath, appPkg, { spaces: 2 });
      }
    }
  }

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
