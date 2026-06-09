#!/usr/bin/env tsx

/**
 * 모든 스택 × Docker 영향 옵션 브루트포스 테스트
 *
 * 사용법:
 *   npx tsx scripts/test-docker.ts              # 전체
 *   npx tsx scripts/test-docker.ts go           # 카테고리/스택 필터
 *   npx tsx scripts/test-docker.ts monorepo     # 모노레포만
 *   npx tsx scripts/test-docker.ts --skip-build # 빌드 스킵
 *   npx tsx scripts/test-docker.ts --clean      # 정리
 */
import path from 'node:path';
import fs from 'fs-extra';
import { execSync } from 'node:child_process';
import { scaffold } from '../src/scaffolder/index.js';
import type { UserChoices, StackConfig } from '../src/prompts/types.js';

const TEST_DIR = path.resolve(import.meta.dirname, '..', '.test-docker');
const SKIP_BUILD = process.argv.includes('--skip-build');

// ─── 타입 ───

interface DockerTestCase {
  name: string;
  category: string;
  choices: UserChoices;
  healthUrl: string;
  port: string;
  expectedResponse: string;
}

interface TestResult {
  name: string;
  scaffoldOk: boolean;
  filesOk: boolean;
  dockerBuildOk: boolean;
  dockerRunOk: boolean;
  healthCheckOk: boolean;
  errors: string[];
  duration: number;
}

// ─── 포트 관리 ───

let portCounter = 4000;
function nextPort(containerPort: number): string {
  return `${portCounter++}:${containerPort}`;
}

/** 모노레포 테스트별 고유 포트 오프셋 (포트 충돌 방지) */
let monoPortOffset = 0;
function nextMonoPortOffset(): number {
  return monoPortOffset++ * 100; // 각 테스트마다 100씩 오프셋
}

/** docker-compose.yml의 호스트 포트를 오프셋만큼 밀어서 충돌 방지 */
function rewriteComposePorts(projectDir: string, offset: number): void {
  const composePath = path.join(projectDir, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) return;
  let content = fs.readFileSync(composePath, 'utf-8');
  // "3000:3000" → "(3000+offset):3000" 등
  content = content.replace(/"(\d+):(\d+)"/g, (_match, hostPort, containerPort) => {
    return `"${Number(hostPort) + offset}:${containerPort}"`;
  });
  fs.writeFileSync(composePath, content);
}

// ─── 전체 테스트 케이스 생성 ───

function generateAllTests(): DockerTestCase[] {
  const tests: DockerTestCase[] = [];
  const PMs = ['npm', 'pnpm', 'bun', 'yarn'] as const;
  const PY_PMs = ['pip', 'uv', 'poetry'] as const;

  // ════════════════════════════════════
  // Frontend × 패키지매니저
  // ════════════════════════════════════

  const FE_STACKS = [
    'nextjs-app', 'nextjs-pages', 'react-vite', 'vue-vite',
    'nuxt', 'sveltekit', 'angular', 'astro', 'remix', 'solid-start', 'qwik',
  ] as const;

  for (const stack of FE_STACKS) {
    for (const pm of PMs) {
      tests.push(makeFrontendTest(stack, pm));
    }
  }

  // ════════════════════════════════════
  // Backend Node × 패키지매니저
  // ════════════════════════════════════

  const NODE_STACKS = ['node-express', 'node-nestjs', 'node-hono', 'node-fastify'] as const;

  for (const stack of NODE_STACKS) {
    for (const pm of PMs) {
      tests.push(makeNodeBackendTest(stack, pm));
    }
  }

  // ════════════════════════════════════
  // Backend Go
  // ════════════════════════════════════

  for (const stack of ['go-gin', 'go-echo', 'go-fiber'] as const) {
    tests.push(makeGoTest(stack));
  }

  // ════════════════════════════════════
  // Backend Python × 패키지매니저 × 프레임워크
  // ════════════════════════════════════

  for (const stack of ['python-fastapi', 'python-django', 'python-flask'] as const) {
    for (const pm of PY_PMs) {
      tests.push(makePythonTest(stack, pm));
    }
  }

  // ════════════════════════════════════
  // Backend Java × 빌드도구
  // ════════════════════════════════════

  for (const bt of ['gradle', 'maven'] as const) {
    tests.push(makeJavaTest(bt));
  }

  // ════════════════════════════════════
  // Backend Rust
  // ════════════════════════════════════

  for (const stack of ['rust-axum', 'rust-actix'] as const) {
    tests.push(makeRustTest(stack));
  }

  // ════════════════════════════════════
  // Backend Kotlin
  // ════════════════════════════════════

  tests.push({
    name: 'kotlin-ktor',
    category: 'backend-kotlin',
    choices: {
      projectName: 'test-kotlin-ktor', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'kotlin-ktor', architecture: 'layered',
      database: 'none', apiStyle: 'rest', apiDocs: 'none',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: `http://localhost:${portCounter}/health`,
    port: nextPort(8080),
    expectedResponse: 'ok',
  });

  // ════════════════════════════════════
  // Backend .NET
  // ════════════════════════════════════

  tests.push({
    name: 'dotnet',
    category: 'backend-dotnet',
    choices: {
      projectName: 'test-dotnet', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'dotnet', architecture: 'layered',
      database: 'none', apiStyle: 'rest', apiDocs: 'none',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: `http://localhost:${portCounter}/health`,
    port: nextPort(8080),
    expectedResponse: 'ok',
  });

  // ════════════════════════════════════
  // Blockchain (생성 + 파일 검증만)
  // ════════════════════════════════════

  for (const stack of [
    'solidity-hardhat', 'solidity-foundry', 'solana-anchor',
    'move-sui', 'move-aptos', 'ton-tact', 'cosmwasm',
  ] as const) {
    tests.push({
      name: stack,
      category: 'blockchain',
      choices: {
        projectName: `test-${stack}`, agent: 'claude', repoStructure: 'polyrepo',
        stack, network: 'ethereum',
        graphify: false, docker: false, autoInstall: false,
      },
      healthUrl: '', port: '', expectedResponse: '',
    });
  }

  // ════════════════════════════════════
  // Mobile (생성 + 파일 검증만)
  // ════════════════════════════════════

  tests.push({
    name: 'react-native',
    category: 'mobile',
    choices: {
      projectName: 'test-react-native', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'react-native', architecture: 'feature-first', packageManager: 'npm',
      graphify: false, docker: false, autoInstall: false,
    },
    healthUrl: '', port: '', expectedResponse: '',
  });

  tests.push({
    name: 'flutter',
    category: 'mobile',
    choices: {
      projectName: 'test-flutter', agent: 'claude', repoStructure: 'polyrepo',
      stack: 'flutter', architecture: 'feature-first',
      graphify: false, docker: false, autoInstall: false,
    },
    healthUrl: '', port: '', expectedResponse: '',
  });

  // ════════════════════════════════════
  // 모노레포 조합
  // ════════════════════════════════════

  tests.push(...generateMonorepoTests());

  return tests;
}

// ─── 헬퍼: 테스트 케이스 생성 ───

function makeFrontendTest(stack: string, pm: string): DockerTestCase {
  return {
    name: `${stack}-${pm}`,
    category: 'frontend',
    choices: {
      projectName: `test-${stack}-${pm}`, agent: 'claude', repoStructure: 'polyrepo',
      stack: stack as any, language: 'typescript', architecture: 'fsd',
      packageManager: pm, linter: 'eslint-prettier', namingConvention: 'kebab-case',
      style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest',
      formLibrary: 'none', i18n: 'none',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: '', // FE는 health check 어려움 (SSR 빌드 필요)
    port: nextPort(3000),
    expectedResponse: '',
  };
}

function makeNodeBackendTest(stack: string, pm: string): DockerTestCase {
  // NestJS is CLI-generated — we don't control routes, so skip health check
  const isNest = stack === 'node-nestjs';
  const hostPort = portCounter;
  return {
    name: `${stack}-${pm}`,
    category: 'backend-node',
    choices: {
      projectName: `test-${stack}-${pm}`, agent: 'claude', repoStructure: 'polyrepo',
      stack: stack as any, language: 'typescript', architecture: 'layered',
      packageManager: pm, linter: 'eslint-prettier', namingConvention: 'kebab-case',
      orm: 'none', database: 'none', apiStyle: 'rest', apiDocs: 'none',
      testFramework: 'vitest',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: isNest ? '' : `http://localhost:${hostPort}/health`,
    port: nextPort(3000),
    expectedResponse: isNest ? '' : 'ok',
  };
}

function makeGoTest(stack: string): DockerTestCase {
  return {
    name: stack,
    category: 'backend-go',
    choices: {
      projectName: `test-${stack}`, agent: 'claude', repoStructure: 'polyrepo',
      stack: stack as any, architecture: 'layered',
      orm: 'none', database: 'none', apiStyle: 'rest', apiDocs: 'none',
      goLinter: 'golangci-lint',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: `http://localhost:${portCounter}/health`,
    port: nextPort(8080),
    expectedResponse: 'ok',
  };
}

function makePythonTest(stack: string, pm: string): DockerTestCase {
  return {
    name: `${stack}-${pm}`,
    category: 'backend-python',
    choices: {
      projectName: `test-${stack}-${pm}`, agent: 'claude', repoStructure: 'polyrepo',
      stack: stack as any, architecture: 'modular', pythonPackageManager: pm,
      orm: 'none', database: 'none', apiStyle: 'rest', apiDocs: 'none',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: `http://localhost:${portCounter}/health`,
    port: nextPort(8000),
    expectedResponse: 'ok',
  };
}

function makeJavaTest(buildTool: string): DockerTestCase {
  return {
    name: `java-spring-${buildTool}`,
    category: 'backend-java',
    choices: {
      projectName: `test-spring-${buildTool}`, agent: 'claude', repoStructure: 'polyrepo',
      stack: 'java-spring', architecture: 'layered', buildTool,
      database: 'none', apiStyle: 'rest', apiDocs: 'none',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: `http://localhost:${portCounter}/health`,
    port: nextPort(8080),
    expectedResponse: 'ok',
  };
}

function makeRustTest(stack: string): DockerTestCase {
  return {
    name: stack,
    category: 'backend-rust',
    choices: {
      projectName: `test-${stack}`, agent: 'claude', repoStructure: 'polyrepo',
      stack: stack as any, architecture: 'layered',
      database: 'none', apiStyle: 'rest', apiDocs: 'none',
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: `http://localhost:${portCounter}/health`,
    port: nextPort(8080),
    expectedResponse: 'ok',
  };
}

function generateMonorepoTests(): DockerTestCase[] {
  const combos: { name: string; stacks: StackConfig[] }[] = [
    {
      name: 'mono-next-go',
      stacks: [
        { stack: 'nextjs-app', language: 'typescript', architecture: 'fsd', packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case', style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest', formLibrary: 'none', i18n: 'none' },
        { stack: 'go-gin', architecture: 'layered', orm: 'none', database: 'postgresql', apiStyle: 'rest', apiDocs: 'none', goLinter: 'golangci-lint' },
      ],
    },
    {
      name: 'mono-next-express',
      stacks: [
        { stack: 'nextjs-app', language: 'typescript', architecture: 'fsd', packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case', style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest', formLibrary: 'none', i18n: 'none' },
        { stack: 'node-express', language: 'typescript', architecture: 'layered', packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case', orm: 'none', database: 'none', apiStyle: 'rest', apiDocs: 'none', testFramework: 'vitest' },
      ],
    },
    {
      name: 'mono-next-fastapi',
      stacks: [
        { stack: 'nextjs-app', language: 'typescript', architecture: 'fsd', packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case', style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest', formLibrary: 'none', i18n: 'none' },
        { stack: 'python-fastapi', architecture: 'modular', pythonPackageManager: 'pip', orm: 'none', database: 'none', apiStyle: 'rest', apiDocs: 'none' },
      ],
    },
    {
      name: 'mono-next-spring',
      stacks: [
        { stack: 'nextjs-app', language: 'typescript', architecture: 'fsd', packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case', style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest', formLibrary: 'none', i18n: 'none' },
        { stack: 'java-spring', architecture: 'layered', buildTool: 'gradle', database: 'none', apiStyle: 'rest', apiDocs: 'none' },
      ],
    },
    {
      name: 'mono-next-go-solidity',
      stacks: [
        { stack: 'nextjs-app', language: 'typescript', architecture: 'fsd', packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case', style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest', formLibrary: 'none', i18n: 'none' },
        { stack: 'go-gin', architecture: 'clean', orm: 'gorm', database: 'postgresql', apiStyle: 'rest', apiDocs: 'swagger', goLinter: 'golangci-lint' },
        { stack: 'solidity-foundry', network: 'ethereum' },
      ],
    },
    {
      name: 'mono-next-go-anchor',
      stacks: [
        { stack: 'nextjs-app', language: 'typescript', architecture: 'fsd', packageManager: 'pnpm', linter: 'eslint-prettier', namingConvention: 'kebab-case', style: 'tailwind', stateManagement: 'react-query', testFramework: 'vitest', formLibrary: 'none', i18n: 'none' },
        { stack: 'go-fiber', architecture: 'layered', orm: 'none', database: 'postgresql', apiStyle: 'rest', apiDocs: 'none', goLinter: 'golangci-lint' },
        { stack: 'solana-anchor', network: 'other' },
      ],
    },
    {
      name: 'mono-vue-express',
      stacks: [
        { stack: 'vue-vite', language: 'typescript', architecture: 'colocation', packageManager: 'pnpm', linter: 'biome', namingConvention: 'kebab-case', style: 'css-module', stateManagement: 'pinia', testFramework: 'vitest', formLibrary: 'vee-validate', i18n: 'vue-i18n' },
        { stack: 'node-express', language: 'typescript', architecture: 'modular', packageManager: 'pnpm', linter: 'biome', namingConvention: 'kebab-case', orm: 'prisma', database: 'postgresql', apiStyle: 'rest', apiDocs: 'swagger', testFramework: 'vitest' },
      ],
    },
    {
      name: 'mono-svelte-rust',
      stacks: [
        { stack: 'sveltekit', language: 'typescript', architecture: 'flat', packageManager: 'npm', linter: 'eslint-prettier', namingConvention: 'kebab-case', style: 'tailwind', stateManagement: '', testFramework: 'vitest', formLibrary: 'none', i18n: 'none' },
        { stack: 'rust-axum', architecture: 'layered', database: 'none', apiStyle: 'rest', apiDocs: 'none' },
      ],
    },
  ];

  return combos.map((c) => ({
    name: c.name,
    category: 'monorepo',
    choices: {
      projectName: `test-${c.name}`, agent: 'claude', repoStructure: 'monorepo' as const,
      stack: c.stacks[0].stack,
      packageManager: 'pnpm', linter: 'eslint-prettier', language: 'typescript', namingConvention: 'kebab-case',
      stacks: c.stacks,
      graphify: false, docker: true, autoInstall: false,
    },
    healthUrl: 'http://localhost:8080/health',
    port: '',
    expectedResponse: 'ok',
  }));
}

// ─── 유틸 ───

function exec(cmd: string, opts: { cwd?: string; timeout?: number } = {}): string {
  try {
    return execSync(cmd, { stdio: 'pipe', timeout: opts.timeout ?? 120000, cwd: opts.cwd }).toString().trim();
  } catch (e: any) {
    // Attach stderr to the error message so callers get useful output
    if (e.stderr && e.stderr.length > 0) {
      const stderr = e.stderr.toString().trim();
      if (stderr && (!e.message || !e.message.includes(stderr))) {
        e.message = `${e.message || ''}\n${stderr}`.trim();
      }
    }
    throw e;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getAppName(stack: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'web', 'nextjs-pages': 'web', 'react-vite': 'web',
    'vue-vite': 'web', 'nuxt': 'web', 'sveltekit': 'web', 'angular': 'web',
    'astro': 'web', 'remix': 'web', 'solid-start': 'web', 'qwik': 'web',
    'go-gin': 'api', 'go-echo': 'api', 'go-fiber': 'api',
    'java-spring': 'api', 'kotlin-ktor': 'api', 'dotnet': 'api',
    'python-fastapi': 'api', 'python-django': 'api', 'python-flask': 'api',
    'node-express': 'api', 'node-nestjs': 'api', 'node-hono': 'api', 'node-fastify': 'api',
    'rust-axum': 'api', 'rust-actix': 'api',
    'solidity-hardhat': 'contracts', 'solidity-foundry': 'contracts',
    'solana-anchor': 'contracts', 'move-sui': 'contracts', 'move-aptos': 'contracts',
    'ton-tact': 'contracts', 'cosmwasm': 'contracts',
    'react-native': 'mobile', 'flutter': 'mobile',
  };
  return map[stack] ?? stack;
}

/**
 * 생성된 docker-compose.yml에서 실제 포트를 파싱하여 health URL을 만든다.
 * compose 파일을 직접 읽으므로 포트 매핑 로직과 항상 동기화된다.
 */
function getMonorepoHealthUrls(projectDir: string): { service: string; url: string }[] {
  const composePath = path.join(projectDir, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) return [];
  const content = fs.readFileSync(composePath, 'utf-8');
  const urls: { service: string; url: string }[] = [];

  // "  api:" 또는 "  web:" 등 서비스명 + ports 파싱
  const serviceRegex = /^ {2}(\w+):\n([\s\S]*?)(?=^ {2}\w+:|\nvolumes:|\Z)/gm;
  let match: RegExpExecArray | null;
  while ((match = serviceRegex.exec(content)) !== null) {
    const serviceName = match[1];
    const block = match[2];
    // 포트: - "3001:3000" 형식에서 호스트 포트 추출
    const portMatch = block.match(/- "(\d+):\d+"/);
    if (portMatch && serviceName !== 'db') {
      const hostPort = portMatch[1];
      urls.push({ service: serviceName, url: `http://localhost:${hostPort}/health` });
    }
  }

  // web(frontend)은 health 엔드포인트가 없으므로 제거
  return urls.filter((u) => u.service !== 'web');
}

// ─── 파일 검증 ───

async function verifyFiles(projectDir: string, tc: DockerTestCase): Promise<string[]> {
  const errs: string[] = [];
  const isM = tc.choices.repoStructure === 'monorepo';

  // 공통
  for (const f of ['README.md', '.env.example']) {
    if (!(await fs.pathExists(path.join(projectDir, f)))) errs.push(`없음: ${f}`);
  }
  if (isM) {
    for (const f of ['package.json', 'turbo.json']) {
      if (!(await fs.pathExists(path.join(projectDir, f)))) errs.push(`없음: ${f}`);
    }
  }
  if (tc.choices.docker) {
    if (!(await fs.pathExists(path.join(projectDir, 'docker-compose.yml')))) errs.push('없음: docker-compose.yml');
    if (!isM && !(await fs.pathExists(path.join(projectDir, 'Dockerfile')))) errs.push('없음: Dockerfile');
  }

  // 에이전트
  const ad: Record<string, string> = { claude: '.claude', cursor: '.cursor', windsurf: '.windsurf', cline: '.clinerules', copilot: '.github', aider: '.aider', gemini: '.gemini' };
  if (ad[tc.choices.agent] && !(await fs.pathExists(path.join(projectDir, ad[tc.choices.agent])))) {
    errs.push(`없음: ${ad[tc.choices.agent]}`);
  }

  // skills
  if (tc.choices.agent !== 'aider') {
    const sd: Record<string, string> = { claude: '.claude/skills', cursor: '.cursor/skills', windsurf: '.windsurf/skills', cline: '.cline/skills', copilot: '.github/skills', gemini: '.gemini/skills' };
    if (sd[tc.choices.agent] && !(await fs.pathExists(path.join(projectDir, sd[tc.choices.agent])))) {
      errs.push(`없음: ${sd[tc.choices.agent]}`);
    }
  }

  // 모노레포 앱
  if (isM && tc.choices.stacks) {
    for (const s of tc.choices.stacks) {
      const an = getAppName(s.stack);
      if (!(await fs.pathExists(path.join(projectDir, 'apps', an)))) errs.push(`없음: apps/${an}`);
    }
  }

  // .nvmrc
  if (!(await fs.pathExists(path.join(projectDir, '.nvmrc')))) errs.push('없음: .nvmrc');

  return errs;
}

// ─── 테스트 실행 ───

async function runTest(tc: DockerTestCase): Promise<TestResult> {
  const start = Date.now();
  const errors: string[] = [];
  const projectDir = path.join(TEST_DIR, tc.choices.projectName);
  const containerName = `harness-${tc.name}`.replace(/[^a-z0-9-]/g, '-');
  const isM = tc.choices.repoStructure === 'monorepo';
  const hasDocker = tc.choices.docker === true;
  const hasHealth = tc.healthUrl !== '';
  const monoOffset = isM ? nextMonoPortOffset() : 0;

  let scaffoldOk = false;
  let filesOk = false;
  let dockerBuildOk = !hasDocker;
  let dockerRunOk = !hasDocker;
  let healthCheckOk = !hasHealth;

  const steps = ['⬜⬜⬜⬜⬜', '🟨⬜⬜⬜⬜', '🟩🟨⬜⬜⬜', '🟩🟩🟨⬜⬜', '🟩🟩🟩🟨⬜', '🟩🟩🟩🟩🟨'];
  let stepIdx = 0;
  const stepLabels = ['생성 중', '파일 검증', 'Docker 빌드', 'Docker 실행', 'Health check'];

  const log = (msg: string) => {
    process.stdout.write(`\r  ${tc.name.padEnd(30)} ${steps[stepIdx]} ${msg.padEnd(25)}`);
  };
  const nextStep = (msg: string) => {
    stepIdx++;
    log(msg);
  };
  const stopSpinner = () => {};

  log(stepLabels[0]);

  try {
    // 1. Scaffold
    log('생성 중...');
    await fs.remove(projectDir);
    const orig = process.cwd();
    process.chdir(TEST_DIR);
    await scaffold(tc.choices, { silent: true });
    process.chdir(orig);
    scaffoldOk = true;

    // 2. 파일 검증
    nextStep('파일 검증');
    const fe = await verifyFiles(projectDir, tc);
    if (fe.length > 0) errors.push(...fe);
    else filesOk = true;

    if (!hasDocker) return { name: tc.name, scaffoldOk, filesOk, dockerBuildOk, dockerRunOk, healthCheckOk, errors, duration: Date.now() - start };

    // 3. Docker 빌드
    if (!SKIP_BUILD) {
      nextStep('Docker 빌드');
      try {
        if (isM) exec('docker compose build', { cwd: projectDir, timeout: 600000 });
        else exec(`docker build -t ${containerName} .`, { cwd: projectDir, timeout: 300000 });
        dockerBuildOk = true;
      } catch (e) {
        errors.push(`빌드❌: ${e instanceof Error ? e.message.split('\n').slice(-2).join(' ') : String(e)}`);
        return { name: tc.name, scaffoldOk, filesOk, dockerBuildOk, dockerRunOk, healthCheckOk, errors, duration: Date.now() - start };
      }
    } else {
      dockerBuildOk = true;
    }

    // 4. Docker 실행
    nextStep('Docker 실행');
    try {
      if (isM) {
        try { exec('docker compose down -v', { cwd: projectDir }); } catch {}
        if (monoOffset > 0) rewriteComposePorts(projectDir, monoOffset);
        exec('docker compose up -d', { cwd: projectDir, timeout: 60000 });
      } else {
        try { exec(`docker rm -f ${containerName}`); } catch {}
        exec(`docker run -d --name ${containerName} -p ${tc.port} ${containerName}`);
      }
      dockerRunOk = true;
    } catch (e) {
      errors.push(`실행❌: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
      return { name: tc.name, scaffoldOk, filesOk, dockerBuildOk, dockerRunOk, healthCheckOk, errors, duration: Date.now() - start };
    }

    // 5. Health check
    if (hasHealth) {
      nextStep('Health check');
      const urls = isM ? getMonorepoHealthUrls(projectDir) : [{ service: tc.name, url: tc.healthUrl }];
      let allOk = true;
      for (const { service, url } of urls) {
        let ok = false;
        for (let i = 0; i < 20; i++) {
          log(`Health ${service} (${i + 1}/20)`);
          await sleep(1000);
          try {
            const res = exec(`curl -sf ${url}`, { timeout: 5000 });
            if (res.includes(tc.expectedResponse)) { ok = true; break; }
          } catch {}
        }
        if (!ok) {
          allOk = false;
          try {
            const cmd = isM ? `docker compose logs ${service} 2>&1 | tail -3` : `docker logs ${containerName} 2>&1 | tail -3`;
            errors.push(`${service} health❌: ${exec(cmd, { cwd: projectDir })}`);
          } catch { errors.push(`${service} health❌ (20s)`); }
        }
      }
      healthCheckOk = allOk;
    }
  } catch (e) {
    errors.push(`예외: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    stopSpinner();
    try {
      if (isM) {
        exec('docker compose down -v --remove-orphans', { cwd: path.join(TEST_DIR, tc.choices.projectName), timeout: 30000 });
      } else {
        exec(`docker rm -f ${containerName}`);
      }
    } catch {}
  }

  return { name: tc.name, scaffoldOk, filesOk, dockerBuildOk, dockerRunOk, healthCheckOk, errors, duration: Date.now() - start };
}

// ─── Main ───

async function main() {
  const filter = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);

  const allTests = generateAllTests();

  let testsToRun = allTests;
  if (filter) {
    testsToRun = allTests.filter((t) =>
      t.name === filter ||
      t.name.startsWith(filter) ||
      t.category === filter ||
      t.category.includes(filter),
    );
  }

  if (testsToRun.length === 0) {
    console.log(`\n❌ "${filter}" 매칭 없음`);
    const cats = [...new Set(allTests.map((t) => t.category))];
    console.log('카테고리:', cats.join(', '));
    console.log(`전체 ${allTests.length}개 테스트`);
    process.exit(1);
  }

  console.log(`\n🐳 브루트포스 테스트: ${testsToRun.length}/${allTests.length}개\n`);

  await fs.ensureDir(TEST_DIR);

  const results: TestResult[] = [];
  let lastCategory = '';

  for (const tc of testsToRun) {
    if (tc.category !== lastCategory) {
      console.log(`\n  ── ${tc.category.toUpperCase()} ──`);
      lastCategory = tc.category;
    }

    const r = await runTest(tc);
    results.push(r);

    const flags = [
      r.scaffoldOk ? '✅' : '❌',
      r.filesOk ? '✅' : '❌',
      r.dockerBuildOk ? '✅' : '❌',
      r.dockerRunOk ? '✅' : '❌',
      r.healthCheckOk ? '✅' : '❌',
    ].join('');

    // 진행 표시를 지우고 결과 출력
    process.stdout.write(`\r  ${tc.name.padEnd(35)} ${flags} (${Math.round(r.duration / 1000)}s)\n`);

    for (const err of r.errors) {
      console.log(`      └─ ${err.split('\n')[0]}`);
    }
  }

  // 요약
  const t = results.length;
  const pass = results.filter((r) => r.scaffoldOk && r.filesOk && r.dockerBuildOk && r.dockerRunOk && r.healthCheckOk).length;
  const sf = results.filter((r) => !r.scaffoldOk).length;
  const ff = results.filter((r) => r.scaffoldOk && !r.filesOk).length;
  const bf = results.filter((r) => r.filesOk && !r.dockerBuildOk).length;
  const hf = results.filter((r) => r.dockerRunOk && !r.healthCheckOk).length;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`범례: 생성|파일|빌드|실행|health`);
  console.log(`총 ${t}개: ✅${pass} 통과 | 생성❌${sf} 파일❌${ff} 빌드❌${bf} health❌${hf}`);
  console.log(`출력: ${TEST_DIR}\n`);

  // ── 로그 파일 저장 ──
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logDir = path.join(TEST_DIR, 'logs');
  await fs.ensureDir(logDir);

  // JSON 로그 (프로그래밍용)
  await fs.writeJson(path.join(logDir, `${timestamp}.json`), {
    timestamp: new Date().toISOString(),
    total: t, passed: pass,
    failures: { scaffold: sf, files: ff, build: bf, health: hf },
    results: results.map((r) => ({
      name: r.name,
      scaffoldOk: r.scaffoldOk, filesOk: r.filesOk,
      dockerBuildOk: r.dockerBuildOk, dockerRunOk: r.dockerRunOk,
      healthCheckOk: r.healthCheckOk,
      errors: r.errors, duration: r.duration,
    })),
  }, { spaces: 2 });

  // 텍스트 로그 (읽기용)
  const logLines: string[] = [
    `Docker Test Report — ${new Date().toISOString()}`,
    `${'═'.repeat(70)}`,
    `총 ${t}개: ✅${pass} 통과 | 생성❌${sf} 파일❌${ff} 빌드❌${bf} health❌${hf}`,
    '',
  ];

  // 실패한 것만 상세
  const failed = results.filter((r) => !(r.scaffoldOk && r.filesOk && r.dockerBuildOk && r.dockerRunOk && r.healthCheckOk));
  if (failed.length > 0) {
    logLines.push('── 실패 목록 ──', '');
    for (const r of failed) {
      const flags = [
        r.scaffoldOk ? '✅' : '❌',
        r.filesOk ? '✅' : '❌',
        r.dockerBuildOk ? '✅' : '❌',
        r.dockerRunOk ? '✅' : '❌',
        r.healthCheckOk ? '✅' : '❌',
      ].join('');
      logLines.push(`  ${r.name.padEnd(35)} ${flags} (${Math.round(r.duration / 1000)}s)`);
      for (const err of r.errors) {
        logLines.push(`      └─ ${err}`);
      }
      logLines.push('');
    }
  }

  // 통과한 것 요약
  const passed_ = results.filter((r) => r.scaffoldOk && r.filesOk && r.dockerBuildOk && r.dockerRunOk && r.healthCheckOk);
  if (passed_.length > 0) {
    logLines.push('── 통과 목록 ──', '');
    for (const r of passed_) {
      logLines.push(`  ✅ ${r.name} (${Math.round(r.duration / 1000)}s)`);
    }
  }

  await fs.writeFile(path.join(logDir, `${timestamp}.txt`), logLines.join('\n'));

  console.log(`📝 로그 저장: ${logDir}/${timestamp}.{json,txt}\n`);

  if (process.argv.includes('--clean')) {
    for (const tc of testsToRun) {
      try { exec(`docker rmi harness-${tc.name.replace(/[^a-z0-9-]/g, '-')}`); } catch {}
    }
    await fs.remove(TEST_DIR);
    console.log('정리 완료\n');
  }

  process.exit(pass === t ? 0 : 1);
}

main().catch(console.error);
