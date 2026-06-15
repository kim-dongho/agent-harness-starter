/**
 * Step 1 — 프로젝트 생성
 *
 * 폴리레포: 단일 스택 CLI 실행 또는 수동 보일러플레이트 생성
 * 모노레포: Turborepo 루트 + 각 스택별 apps/ 생성 + 공유 패키지
 */
import path from 'node:path';
import { execSync, exec } from 'node:child_process';
import fs from 'fs-extra';

/** execSync 대신 비동기로 실행 — spinner 애니메이션이 블로킹되지 않도록 */
function execAsync(cmd: string, opts: { cwd?: string; timeout?: number } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: opts.cwd, timeout: opts.timeout ?? 300000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout.toString());
    });
  });
}
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getGenerateCommand, needsManualSetup } from '../generators/commands.js';
import { manualSetup } from '../generators/manual.js';
import { setupTestFramework, installSelectedLibraries, scaffoldArchitecture } from '../generators/post-process.js';
import { setupMonorepoSharedPackages } from '../generators/monorepo.js';
import { getStackLabel, getAppName } from './utils.js';
import { getStackCategory } from '../constants.js';
import type { UserChoices, StackConfig } from '../prompts/types.js';

/**
 * 프로젝트 구조를 생성한다 (단일 또는 모노레포).
 *
 * 모노레포인 경우 Turborepo 루트 구조 + 각 스택별 앱을 생성하고,
 * 폴리레포인 경우 단일 프로젝트를 생성한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리 절대 경로
 * @param choices - 사용자 선택 결과
 * @param spinner - clack 스피너 인스턴스
 * @param steps - 진행 단계를 기록하는 문자열 배열
 */
export async function createProject(
  projectDir: string,
  choices: UserChoices,
  spinner: ReturnType<typeof p.spinner>,
  steps: string[],
): Promise<void> {
  if (choices.repoStructure === 'monorepo' && choices.stacks) {
    await createMonorepo(projectDir, choices, spinner, steps);
  } else {
    await createSingleProject(projectDir, choices, spinner, steps);
  }
}

// ─── 단일 프로젝트 ───

async function createSingleProject(
  projectDir: string,
  config: StackConfig & { projectName?: string },
  spinner: ReturnType<typeof p.spinner>,
  steps: string[],
): Promise<void> {
  const projectName = config.projectName ?? path.basename(projectDir);
  const stackLabel = getStackLabel(config.stack);
  const command = getGenerateCommand(config, projectName);

  if (command) {
    // CLI 도구로 생성 시도
    spinner.start(`${stackLabel} 프로젝트 생성 중... (시간이 걸릴 수 있습니다)`);
    const cwd = command.cwd === 'parent' ? path.dirname(projectDir) : projectDir;
    if (command.cwd === 'project') await fs.ensureDir(projectDir);

    try {
      await execAsync(`${command.cmd} ${command.args.join(' ')}`, { cwd, timeout: 300000 });
      spinner.stop(`${stackLabel} 프로젝트 생성 완료`);
      steps.push(`${pc.green('✓')} ${stackLabel} — CLI로 생성`);
    } catch {
      // CLI 실패 시 fallback
      spinner.stop(`${stackLabel} CLI 실패 — fallback 생성 중`);
      if (needsManualSetup(config.stack)) {
        await fs.ensureDir(projectDir);
        await manualSetup(projectDir, config);
        steps.push(`${pc.yellow('⚠')} ${stackLabel} — fallback 보일러플레이트로 생성`);
      } else {
        p.log.warn(`수동으로 생성해주세요: ${command.cmd} ${command.args.join(' ')}`);
        await fs.ensureDir(projectDir);
        steps.push(`${pc.red('✗')} ${stackLabel} — 수동 생성 필요`);
      }
    }
  } else if (needsManualSetup(config.stack)) {
    // 수동 보일러플레이트 생성
    spinner.start(`${stackLabel} 보일러플레이트 생성 중...`);
    await fs.ensureDir(projectDir);
    await manualSetup(projectDir, config);
    spinner.stop(`${stackLabel} 보일러플레이트 생성 완료`);
    steps.push(`${pc.green('✓')} ${stackLabel} — 보일러플레이트 생성`);
  } else {
    await fs.ensureDir(projectDir);
    steps.push(`${pc.green('✓')} ${stackLabel} — 디렉토리 생성`);
  }

  // 후처리
  await scaffoldArchitecture(projectDir, config);
  await setupTestFramework(projectDir, config);
  await installSelectedLibraries(projectDir, config);

  // 모바일/블록체인은 build 스크립트가 없으므로 turbo 호환용 빈 스크립트 추가
  const category = getStackCategory(config.stack);
  if (['mobile', 'blockchain'].includes(category)) {
    const pkgPath = path.join(projectDir, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts = pkg.scripts ?? {};
      if (!pkg.scripts.build) pkg.scripts.build = 'echo "No build step"';
      if (!pkg.scripts.dev) pkg.scripts.dev = pkg.scripts.start ?? 'echo "No dev step"';
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }
  }
}

// ─── 모노레포 ───

async function createMonorepo(
  projectDir: string,
  choices: UserChoices,
  spinner: ReturnType<typeof p.spinner>,
  steps: string[],
): Promise<void> {
  // 루트 구조 생성
  spinner.start('모노레포 루트 구조 생성 중...');
  await fs.ensureDir(projectDir);
  await fs.ensureDir(path.join(projectDir, 'apps'));

  const pm = choices.packageManager ?? 'npm';
  const pmVersions: Record<string, string> = {
    pnpm: 'pnpm@9.15.0',
    yarn: 'yarn@4.6.0',
    bun: 'bun@1.2.0',
    npm: 'npm@10.9.0',
  };

  await fs.writeJson(path.join(projectDir, 'package.json'), {
    name: choices.projectName,
    private: true,
    packageManager: pmVersions[pm] ?? pmVersions.npm,
    workspaces: pm !== 'pnpm' ? ['apps/*'] : undefined,
    scripts: {
      dev: 'turbo dev',
      build: 'turbo build',
      lint: 'turbo lint',
      test: 'turbo test',
    },
    devDependencies: { turbo: '^2' },
  }, { spaces: 2 });

  await fs.writeJson(path.join(projectDir, 'turbo.json'), {
    $schema: 'https://turbo.build/schema.json',
    tasks: {
      build: { dependsOn: ['^build'], outputs: ['dist/**', '.next/**', 'build/**'] },
      dev: { cache: false, persistent: true },
      lint: { dependsOn: ['^build'] },
      test: { dependsOn: ['build'] },
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(projectDir, '.gitignore'), 'node_modules\ndist\n.turbo\n.env\n');
  spinner.stop('모노레포 루트 구조 생성 완료');
  steps.push(`${pc.green('✓')} Turborepo 루트 구조`);

  // 각 스택별 앱 생성
  if (choices.stacks) {
    for (let i = 0; i < choices.stacks.length; i++) {
      const stackConfig = choices.stacks[i];
      const appName = getAppName(stackConfig.stack);
      const appDir = path.join(projectDir, 'apps', appName);

      p.log.step(`[${i + 1}/${choices.stacks.length}] ${getStackLabel(stackConfig.stack)}`);
      await createSingleProject(appDir, { ...stackConfig, projectName: appName }, spinner, steps);
    }
  }

  // 공유 패키지 생성 (tsconfig, eslint/biome 등)
  spinner.start('공유 패키지 생성 중 (tsconfig, lint 등)...');
  await setupMonorepoSharedPackages(projectDir, choices);
  spinner.stop('공유 패키지 생성 완료');
  steps.push(`${pc.green('✓')} 공유 패키지 (typescript-config, eslint-config 등)`);
}
