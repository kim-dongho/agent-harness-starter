/**
 * 스택별 CLI 커맨드 매핑
 *
 * 각 스택에 대해 공식 CLI 도구(create-next-app, anchor init 등)의
 * 커맨드와 인자를 반환한다. CLI가 없는 스택은 null을 반환하고,
 * manual.ts의 보일러플레이트 생성기가 대신 처리한다.
 */
import type { StackConfig } from '../prompts/types.js';
import type { StackValue } from '../constants.js';

/** CLI 프로젝트 생성 커맨드 정보 */
interface GenerateCommand {
  /** 실행할 CLI 커맨드 (예: 'npx', 'npm', 'forge') */
  cmd: string;
  /** 커맨드 인자 배열 */
  args: string[];
  /** 'parent': 상위 디렉토리에서 실행 (CLI가 폴더 생성), 'project': 프로젝트 디렉토리 안에서 실행 */
  cwd: 'parent' | 'project';
}

/**
 * 스택별 프로젝트 생성 CLI 커맨드를 반환한다.
 *
 * CLI 도구가 없는 스택은 null을 반환하며, manual.ts가 대신 처리한다.
 *
 * @param config - 스택 설정 옵션
 * @param projectName - 생성할 프로젝트 이름
 * @returns CLI 커맨드 정보 또는 CLI가 없는 경우 null
 */
export function getGenerateCommand(config: StackConfig, projectName: string): GenerateCommand | null {
  const pm = config.packageManager ?? 'npm';
  // CLI 실행 시 yarn은 설치 안 되어 있을 수 있으므로 npm으로 fallback
  const cliPm = pm === 'yarn' ? 'npm' : pm;
  const ts = config.language !== 'javascript';

  switch (config.stack) {
    // ─── Frontend ───
    case 'nextjs-app':
      return {
        cmd: 'npx',
        args: [
          'create-next-app@latest', projectName,
          '--app', '--src-dir',
          ts ? '--ts' : '--js',
          config.style === 'tailwind' ? '--tailwind' : '--no-tailwind',
          '--eslint', '--no-turbopack',
          `--use-${cliPm === 'bun' ? 'bun' : cliPm === 'pnpm' ? 'pnpm' : 'npm'}`,
          '--no-import-alias',
        ],
        cwd: 'parent',
      };

    case 'nextjs-pages':
      return {
        cmd: 'npx',
        args: [
          'create-next-app@latest', projectName,
          '--no-app', '--src-dir',
          ts ? '--ts' : '--js',
          config.style === 'tailwind' ? '--tailwind' : '--no-tailwind',
          '--eslint',
          `--use-${cliPm === 'bun' ? 'bun' : cliPm === 'pnpm' ? 'pnpm' : 'npm'}`,
          '--no-import-alias',
        ],
        cwd: 'parent',
      };

    case 'react-vite':
      return {
        cmd: 'npm',
        args: [
          'create', 'vite@latest', projectName, '--',
          '--template', ts ? 'react-ts' : 'react',
        ],
        cwd: 'parent',
      };

    case 'vue-vite':
      return {
        cmd: 'npm',
        args: [
          'create', 'vue@latest', projectName, '--',
          ...(ts ? ['--ts'] : []),
          '--router', '--pinia',
        ],
        cwd: 'parent',
      };

    case 'nuxt':
      return {
        cmd: 'npx',
        args: ['nuxi@latest', 'init', projectName, '--no-install', '--no-gitInit', '--template', 'v4-compat', '--packageManager', cliPm],
        cwd: 'parent',
      };

    case 'sveltekit':
      return {
        cmd: 'npx',
        args: ['sv', 'create', projectName, '--template', 'minimal', '--types', ts ? 'ts' : 'jsdoc', '--no-add-ons', '--no-install'],
        cwd: 'parent',
      };

    case 'angular':
      return {
        cmd: 'npx',
        args: ['@angular/cli@latest', 'new', projectName, '--style=css', '--ssr=false', '--skip-git', '--skip-install'],
        cwd: 'parent',
      };

    case 'astro':
      return {
        cmd: 'npm',
        args: ['create', 'astro@latest', projectName, '--', '--template', 'minimal', '--no-install', '--no-git'],
        cwd: 'parent',
      };

    case 'remix':
      // Remix v2는 React Router로 통합됨
      return {
        cmd: 'npx',
        args: ['create-react-router@latest', projectName, '--no-install', '--no-git-init'],
        cwd: 'parent',
      };

    case 'solid-start':
      return {
        cmd: 'npx',
        args: ['create-solid', projectName, '--solidstart', '--v2', ts ? '--ts' : '--js', '-t', 'basic'],
        cwd: 'parent',
      };

    case 'qwik':
      return {
        cmd: 'npx',
        args: ['create-qwik', 'empty', projectName],
        cwd: 'parent',
      };

    // ─── Backend Node ───
    case 'node-express':
      return null; // 직접 생성

    case 'node-nestjs':
      return {
        cmd: 'npx',
        args: [
          '@nestjs/cli@latest', 'new', projectName,
          '--package-manager', cliPm,
          '--skip-git',
          ...(ts ? [] : ['--language', 'javascript']),
        ],
        cwd: 'parent',
      };

    case 'node-hono':
      return null; // 직접 생성 (CLI가 interactive)

    case 'node-fastify':
      return null; // 직접 생성 (CLI가 interactive)

    // ─── Backend Go ───
    case 'go-gin':
    case 'go-echo':
    case 'go-fiber':
      return null; // 직접 생성

    // ─── Backend Java ───
    case 'java-spring':
      return null; // Spring Initializr API 또는 직접 생성

    // ─── Backend Python ───
    case 'python-fastapi':
    case 'python-django':
    case 'python-flask':
      return null; // 직접 생성

    // ─── Backend Rust ───
    case 'rust-axum':
    case 'rust-actix':
      return null; // 직접 생성

    // ─── Backend Kotlin ───
    case 'kotlin-ktor':
      return null; // 직접 생성

    // ─── Backend .NET ───
    case 'dotnet':
      return {
        cmd: 'dotnet',
        args: ['new', 'webapi', '-n', projectName],
        cwd: 'parent',
      };

    // ─── Blockchain ───
    case 'solidity-hardhat':
      return {
        cmd: 'npx',
        args: ['hardhat', 'init'],
        cwd: 'project',
      };

    case 'solidity-foundry':
      return {
        cmd: 'forge',
        args: ['init', projectName],
        cwd: 'parent',
      };

    case 'solana-anchor':
      return {
        cmd: 'anchor',
        args: ['init', projectName],
        cwd: 'parent',
      };

    case 'move-sui':
      return {
        cmd: 'sui',
        args: ['move', 'new', projectName],
        cwd: 'parent',
      };

    case 'move-aptos':
      return {
        cmd: 'aptos',
        args: ['move', 'init', '--name', projectName],
        cwd: 'project',
      };

    case 'ton-tact':
      return {
        cmd: 'npm',
        args: ['create', 'ton@latest', projectName],
        cwd: 'parent',
      };

    case 'cosmwasm':
      return null; // 직접 생성

    // ─── Mobile ───
    case 'react-native':
      return {
        cmd: 'npx',
        args: ['@react-native-community/cli@latest', 'init', projectName],
        cwd: 'parent',
      };

    case 'flutter':
      return {
        cmd: 'flutter',
        args: ['create', projectName],
        cwd: 'parent',
      };

    default:
      return null;
  }
}

/**
 * 해당 스택이 수동 보일러플레이트 생성이 필요한지 확인한다.
 *
 * CLI 도구가 없거나 직접 생성이 필요한 스택에 대해 true를 반환한다.
 *
 * @param stack - 스택 식별자
 * @returns 수동 생성이 필요하면 true
 */
export function needsManualSetup(stack: StackValue): boolean {
  return [
    'node-express', 'node-hono', 'node-fastify',
    'go-gin', 'go-echo', 'go-fiber',
    'java-spring', 'python-fastapi', 'python-django', 'python-flask',
    'rust-axum', 'rust-actix', 'kotlin-ktor', 'dotnet',
    'angular', 'astro', 'solid-start', 'qwik',
    'solidity-hardhat', 'solidity-foundry',
    'solana-anchor', 'move-sui', 'move-aptos',
    'ton-tact', 'cosmwasm',
  ].includes(stack);
}
