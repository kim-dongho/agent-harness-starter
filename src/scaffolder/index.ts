/**
 * 스캐폴더 오케스트레이터
 *
 * 사용자 선택(UserChoices)을 받아서 순서대로 실행한다:
 *   Step 1. 프로젝트 생성 (단일/모노레포 + 보일러플레이트)
 *   Step 2. AI 에이전트 룰 세팅 (core + stack 룰)
 *   Step 3. Docker 설정 (선택 시)
 *   Step 4. Graphify Knowledge Graph (선택 시)
 *   Step 5. 의존성 설치 (선택 시)
 *   Step 6. 결과 요약 출력
 */
import path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getStackCategory } from '../constants.js';
import { createProject } from './project.js';
import { setupAgentRules } from './agent-rules.js';
import { setupDocker } from '../generators/docker.js';
import { generateReadme } from '../generators/readme.js';
import { generateEnvExample } from '../generators/env.js';
import { setupGraphify } from './graphify.js';
import { generateHarnessConfig } from '../generators/harness-config.js';
import { setupHarnessHooks } from '../generators/harness-hooks.js';
import { setupSensors } from '../generators/sensors.js';
import type { UserChoices } from '../prompts/types.js';

/**
 * 사용자 선택을 기반으로 프로젝트 스캐폴딩을 실행한다.
 *
 * 프로젝트 생성, 에이전트 룰, README, Docker, Graphify, 의존성 설치를 순서대로 수행한다.
 *
 * @param choices - 프롬프트에서 수집한 사용자 선택 결과
 */
/** silent: true이면 clack UI 출력 없이 실행 (테스트용) */
export async function scaffold(choices: UserChoices, opts?: { silent?: boolean }): Promise<void> {
  const silent = opts?.silent ?? false;
  const projectDir = path.resolve(process.cwd(), choices.projectName);

  if (await fs.pathExists(projectDir)) {
    if (!silent) p.log.error(`디렉토리가 이미 존재합니다: ${projectDir}`);
    throw new Error(`디렉토리가 이미 존재합니다: ${projectDir}`);
  }

  // silent 모드: spinner를 no-op으로 대체
  const noop = { start: () => {}, stop: () => {}, message: () => {} };
  const spinner = silent ? (noop as ReturnType<typeof p.spinner>) : p.spinner();
  const steps: string[] = [];

  try {
  // Step 0. Node 버전 체크 + 자동 전환
  await ensureNodeVersion(choices, spinner, steps);

  // Step 1. 프로젝트 생성
  await createProject(projectDir, choices, spinner, steps);

  // Step 1.5. git init + .nvmrc
  try {
    execSync('git init', { cwd: projectDir, stdio: 'pipe' });
  } catch {
    // git 미설치 시 무시
  }
  // .nvmrc 생성 — 스택이 요구하는 Node 버전 또는 기본값(22) 명시
  const requiredNode = getRequiredNodeVersion(choices) ?? '22';
  await fs.writeFile(path.join(projectDir, '.nvmrc'), requiredNode + '\n');

  // Step 1.5. harness.config.json 생성
  spinner.start('harness.config.json 생성 중...');
  await generateHarnessConfig(projectDir, choices);
  spinner.stop('harness.config.json 생성 완료');
  steps.push(`${pc.green('✓')} harness.config.json`);

  // Step 2. 에이전트 룰 + hooks 세팅
  spinner.start('에이전트 룰 세팅 중');
  const ruleCount = await setupAgentRules(projectDir, choices);
  const hookCount = await setupHarnessHooks(projectDir, choices.agent);
  spinner.stop(`에이전트 룰 세팅 완료 — ${ruleCount}개 룰 + ${hookCount}개 hooks`);
  steps.push(`${pc.green('✓')} 에이전트 룰 (${choices.agent}) — ${ruleCount}개 파일`);
  if (hookCount > 0) steps.push(`${pc.green('✓')} Harness hooks — scope-guard, scaffold-guard, post-write, session-init`);

  // Step 2.5. Computational Sensors
  const sensorCount = await setupSensors(projectDir, choices);
  if (sensorCount > 0) steps.push(`${pc.green('✓')} Sensors — dependency-cruiser${sensorCount > 1 ? ' + Stryker' : ''}`);

  // Step 3. README + .env.example
  spinner.start('README + .env.example 생성 중...');
  await generateReadme(projectDir, choices);
  await generateEnvExample(projectDir, choices);
  spinner.stop('README + .env.example 생성 완료');
  steps.push(`${pc.green('✓')} README.md + .env.example`);

  // Step 4. Docker 설정
  if (choices.docker) {
    const NO_DOCKER_CATEGORIES = ['blockchain', 'mobile'];
    const stacks = choices.stacks ?? [choices];
    const unsupported = stacks.filter((s) => NO_DOCKER_CATEGORIES.includes(getStackCategory(s.stack)));
    const supported = stacks.filter((s) => !NO_DOCKER_CATEGORIES.includes(getStackCategory(s.stack)));

    if (unsupported.length > 0) {
      const names = unsupported.map((s) => s.stack).join(', ');
      if (!silent) p.log.warn(`${names} — Docker를 지원하지 않습니다 (블록체인은 온체인 배포, 모바일은 네이티브 빌드 필요)`);
    }

    if (supported.length > 0) {
      spinner.start('Docker 설정 생성 중...');
      await setupDocker(projectDir, choices);
      spinner.stop('Docker 설정 생성 완료');
      steps.push(`${pc.green('✓')} Docker — Dockerfile + docker-compose.yml`);
    }
  }

  // Step 4. Graphify Knowledge Graph
  if (choices.graphify) {
    await setupGraphify(projectDir, choices, spinner, steps);
  }

  // Step 5. 의존성 설치
  if (choices.autoInstall) {
    await installDependencies(projectDir, choices, spinner, steps);
  }

  // Step 6. 결과 요약
  if (!silent) {
    p.log.message('');
    p.log.message(pc.bold('📋 생성 완료 요약'));
    for (const step of steps) {
      p.log.message(`  ${step}`);
    }
    p.log.message('');

    const nextSteps = [`cd ${choices.projectName}`];
    if (!choices.autoInstall && choices.packageManager) {
      nextSteps.push(`${choices.packageManager} install`);
    }
    p.note(nextSteps.join('\n'), '다음 단계');
    p.outro('프로젝트 생성 완료!');
  }

  } catch (err) {
    p.log.error(`오류 발생: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      p.log.error(err.stack);
    }
    process.exit(1);
  }
}

// ─── Node 버전 관리 ───

/** 스택별 최소 요구 Node 버전 (semver) */
const STACK_NODE_REQUIREMENTS: Record<string, string> = {
  'angular': '22.22.3',
  'nextjs-app': '18.18.0',
  'nextjs-pages': '18.18.0',
  'astro': '20.0.0',
  'remix': '20.0.0',
  'qwik': '20.0.0',
  'solid-start': '20.0.0',
  'sveltekit': '18.0.0',
  'nuxt': '18.0.0',
};

/** semver 비교: a >= b 이면 true */
function semverGte(current: string, required: string): boolean {
  const c = current.replace(/^v/, '').split('.').map(Number);
  const r = required.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] ?? 0) > (r[i] ?? 0)) return true;
    if ((c[i] ?? 0) < (r[i] ?? 0)) return false;
  }
  return true; // 같으면 true
}

/** 선택한 스택 중 가장 높은 요구 버전을 반환 */
function getRequiredNodeVersion(choices: UserChoices): string | null {
  const stacks = choices.stacks
    ? choices.stacks.map((s) => s.stack)
    : [choices.stack];

  let highest: string | null = null;
  for (const stack of stacks) {
    const req = STACK_NODE_REQUIREMENTS[stack];
    if (req && (!highest || !semverGte(highest, req))) {
      highest = req;
    }
  }
  return highest;
}

/**
 * 현재 Node 버전이 스택 요구사항에 맞는지 확인한다.
 * 안 맞으면 경고만 출력하고 진행. .nvmrc로 프로젝트별 관리.
 */
async function ensureNodeVersion(
  choices: UserChoices,
  spinner: ReturnType<typeof p.spinner>,
  steps: string[],
): Promise<void> {
  const required = getRequiredNodeVersion(choices);
  if (!required) return;

  if (semverGte(process.version, required)) return;

  p.log.warn(`현재 Node ${process.version}, 스택 요구: v${required}+`);
  p.log.warn(`프로젝트에 .nvmrc가 생성됩니다. 프로젝트 디렉토리에서:`);
  p.log.warn(`  nvm install && nvm use`);
  steps.push(`${pc.yellow('⚠')} Node v${required}+ 필요 (현재 ${process.version}) — .nvmrc 참고`);
}

/**
 * 패키지 매니저가 설치되어 있는지 확인하고, 없으면 자동 설치한다.
 */
async function ensurePackageManager(
  pm: string,
  spinner: ReturnType<typeof p.spinner>,
): Promise<boolean> {
  try {
    execSync(`${pm} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    // npm은 Node.js에 내장
    if (pm === 'npm') return true;

    spinner.start(`${pm} 설치 중...`);
    try {
      if (pm === 'pnpm') {
        execSync('npm install -g pnpm', { stdio: 'pipe', timeout: 60000 });
      } else if (pm === 'yarn') {
        execSync('npm install -g yarn', { stdio: 'pipe', timeout: 60000 });
      } else if (pm === 'bun') {
        execSync('npm install -g bun', { stdio: 'pipe', timeout: 60000 });
      }
      spinner.stop(`${pm} 설치 완료`);
      return true;
    } catch {
      spinner.stop(`${pm} 설치 실패`);
      p.log.warn(`${pm}을 수동으로 설치하세요`);
      return false;
    }
  }
}

/** 의존성 자동 설치 */
async function installDependencies(
  projectDir: string,
  choices: UserChoices,
  spinner: ReturnType<typeof p.spinner>,
  steps: string[],
): Promise<void> {
  const pm = choices.packageManager ?? 'npm';
  const category = getStackCategory(choices.stack);

  // JS/TS 스택: npm/pnpm/bun/yarn install
  if (['frontend', 'node-backend'].includes(category) || choices.repoStructure === 'monorepo') {
    // 패키지 매니저 존재 확인 + 자동 설치
    const pmReady = await ensurePackageManager(pm, spinner);
    if (!pmReady) {
      steps.push(`${pc.red('✗')} 의존성 설치 실패 — ${pm} 미설치`);
      return;
    }

    spinner.start(`${pm} install 실행 중...`);
    try {
      // pnpm은 빌드 스크립트 경고로 exit code != 0 일 수 있어서 stderr 무시
      execSync(`${pm} install 2>/dev/null || ${pm} install --ignore-scripts`, {
        cwd: projectDir, stdio: 'pipe', timeout: 300000,
      });
      spinner.stop(`${pm} install 완료`);
      steps.push(`${pc.green('✓')} 의존성 설치 (${pm})`);
    } catch {
      spinner.stop(`${pm} install 실패`);
      steps.push(`${pc.yellow('⚠')} 의존성 설치 실패 — 수동 실행: ${pm} install`);
    }
    return;
  }

  // Go: go mod tidy
  if (category === 'go') {
    spinner.start('go mod tidy 실행 중...');
    try {
      execSync('go mod tidy', { cwd: projectDir, stdio: 'pipe', timeout: 120000 });
      spinner.stop('go mod tidy 완료');
      steps.push(`${pc.green('✓')} 의존성 설치 (go mod tidy)`);
    } catch {
      spinner.stop('go mod tidy 실패');
      steps.push(`${pc.yellow('⚠')} 의존성 설치 실패 — 수동 실행: go mod tidy`);
    }
    return;
  }

  // Python: uv/poetry/pip install
  if (category === 'python') {
    const pythonPm = choices.pythonPackageManager ?? 'pip';
    let cmd: string;
    if (pythonPm === 'uv') cmd = 'uv sync';
    else if (pythonPm === 'poetry') cmd = 'poetry install';
    else cmd = 'pip install -r requirements.txt';

    spinner.start(`${cmd} 실행 중...`);
    try {
      execSync(cmd, { cwd: projectDir, stdio: 'pipe', timeout: 300000 });
      spinner.stop(`${cmd} 완료`);
      steps.push(`${pc.green('✓')} 의존성 설치 (${pythonPm})`);
    } catch {
      spinner.stop(`${cmd} 실패`);
      steps.push(`${pc.yellow('⚠')} 의존성 설치 실패 — 수동 실행: ${cmd}`);
    }
    return;
  }

  // Java: gradle/maven
  if (category === 'java') {
    const isGradle = choices.buildTool !== 'maven';
    const cmd = isGradle ? 'gradle build -x test --no-daemon' : 'mvn dependency:resolve';

    spinner.start(`${cmd} 실행 중...`);
    try {
      execSync(cmd, { cwd: projectDir, stdio: 'pipe', timeout: 300000 });
      spinner.stop('의존성 다운로드 완료');
      steps.push(`${pc.green('✓')} 의존성 설치 (${isGradle ? 'gradle' : 'maven'})`);
    } catch {
      spinner.stop('의존성 다운로드 실패');
      steps.push(`${pc.yellow('⚠')} 의존성 설치 실패 — 수동 실행: ${cmd}`);
    }
  }
}
