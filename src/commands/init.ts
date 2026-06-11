/**
 * @fileoverview `harness init` 명령어
 *
 * 기존 프로젝트에 하네스만 세팅한다.
 * 보일러플레이트 생성 없이 harness.config.json + hooks + rules + skills만 추가.
 *
 * 동작:
 *   1. 프로젝트 자동 감지 (package.json, tsconfig.json 등 스캔)
 *   2. 인터랙티브 프롬프트로 에이전트/옵션 선택
 *   3. harness.config.json 생성
 *   4. adapter로 에이전트 설정 파일 동적 생성
 *   5. hooks 복사 + settings.json 등록
 *   6. skills 복사
 */
import path from 'node:path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { AGENTS, ISSUE_TRACKERS } from '../constants.js';
import { getAdapter, type AgentType } from '../engines/adapters/index.js';
import { loadStackRules, loadStackRulesByDir } from '../engines/adapters/loaders.js';
import { setupHarnessHooks } from '../generators/harness-hooks.js';
import { TEMPLATES_DIR } from '../scaffolder/utils.js';
import { getStackCategory, getStackRuleDirs, type StackValue } from '../constants.js';
import type { HarnessConfig } from '../engines/adapters/types.js';
import type { IssueTrackerValue } from '../constants.js';

/** 프로젝트 자동 감지 결과 */
interface DetectedProject {
  name: string;
  framework: string;
  language: string;
  packageManager: string;
  linter: string;
  testRunner: string;
  architecture: string;
  stacks: string[];
}

/**
 * 기존 프로젝트를 스캔하여 프레임워크, 언어, 패키지 매니저 등을 자동 감지한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @returns 감지된 프로젝트 정보
 */
async function detectProject(projectDir: string): Promise<DetectedProject> {
  const result: DetectedProject = {
    name: path.basename(projectDir),
    framework: 'unknown',
    language: 'typescript',
    packageManager: 'npm',
    linter: 'none',
    testRunner: 'vitest',
    architecture: 'modular',
    stacks: [],
  };

  // package.json 읽기
  const pkgPath = path.join(projectDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    result.name = pkg.name ?? result.name;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // 프레임워크 감지
    if (deps['next']) result.framework = 'nextjs';
    else if (deps['nuxt']) result.framework = 'nuxt';
    else if (deps['svelte'] || deps['@sveltejs/kit']) result.framework = 'svelte';
    else if (deps['@angular/core']) result.framework = 'unknown'; // angular
    else if (deps['react'] && deps['vite']) result.framework = 'vite-react';
    else if (deps['vue'] && deps['vite']) result.framework = 'vite-vue';
    else if (deps['express']) result.framework = 'express';
    else if (deps['@nestjs/core']) result.framework = 'nest';
    else if (deps['fastify']) result.framework = 'fastify';
    else if (deps['hono']) result.framework = 'unknown';

    // 스택 감지
    if (deps['next']) result.stacks.push('nextjs-app');
    else if (deps['nuxt']) result.stacks.push('nuxt');
    else if (deps['@sveltejs/kit']) result.stacks.push('sveltekit');
    else if (deps['@angular/core']) result.stacks.push('angular');
    else if (deps['react'] && deps['vite']) result.stacks.push('react-vite');
    else if (deps['vue'] && deps['vite']) result.stacks.push('vue-vite');
    else if (deps['express']) result.stacks.push('node-express');
    else if (deps['@nestjs/core']) result.stacks.push('node-nestjs');

    // 린터 감지
    if (deps['@biomejs/biome'] || deps['biome']) result.linter = 'biome';
    else if (deps['eslint']) result.linter = 'eslint';

    // 테스트 러너 감지
    if (deps['vitest']) result.testRunner = 'vitest';
    else if (deps['jest']) result.testRunner = 'jest';

    // 언어 감지
    if (deps['typescript'] || await fs.pathExists(path.join(projectDir, 'tsconfig.json'))) {
      result.language = 'typescript';
    } else {
      result.language = 'javascript';
    }
  }

  // 패키지 매니저 감지 (lock 파일 기준)
  if (await fs.pathExists(path.join(projectDir, 'bun.lockb'))) result.packageManager = 'bun';
  else if (await fs.pathExists(path.join(projectDir, 'pnpm-lock.yaml'))) result.packageManager = 'pnpm';
  else if (await fs.pathExists(path.join(projectDir, 'yarn.lock'))) result.packageManager = 'yarn';

  // 아키텍처 감지 (디렉토리 구조 기준)
  const srcDir = path.join(projectDir, 'src');
  if (await fs.pathExists(srcDir)) {
    const dirs: string[] = await fs.readdir(srcDir).catch(() => [] as string[]);
    if (dirs.includes('features') && dirs.includes('shared')) result.architecture = 'fsd';
    else if (dirs.includes('domain') && dirs.includes('application')) result.architecture = 'clean';
    else if (dirs.includes('modules')) result.architecture = 'modular';
    else if (dirs.includes('controllers') && dirs.includes('services')) result.architecture = 'modular';
  }

  return result;
}

/**
 * `harness init` 명령어를 실행한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리 (기본: 현재 디렉토리)
 */
export async function initHarness(projectDir?: string): Promise<void> {
  const root = path.resolve(projectDir ?? process.cwd());

  if (!await fs.pathExists(root) || !(await fs.stat(root)).isDirectory()) {
    p.log.error(`디렉토리가 존재하지 않습니다: ${root}`);
    return;
  }

  p.intro('agent-harness init');

  // 1. 프로젝트 자동 감지
  const spinner = p.spinner();
  spinner.start('프로젝트 스캔 중...');
  const detected = await detectProject(root);
  spinner.stop('프로젝트 스캔 완료');

  p.log.info(`감지 결과: ${detected.framework} / ${detected.language} / ${detected.packageManager} / ${detected.linter} / ${detected.testRunner}`);

  // 2. 에이전트 선택
  const agent = await p.select({
    message: 'AI 에이전트를 선택하세요',
    options: AGENTS.map((a) => ({ value: a.value, label: a.label })),
  });
  if (p.isCancel(agent)) { p.outro('취소됨'); return; }

  // 3. 이슈 트래커 선택
  const issueTracker = await p.select({
    message: '이슈 트래커를 선택하세요',
    options: ISSUE_TRACKERS.map((t) => ({ value: t.value, label: t.label })),
  });
  if (p.isCancel(issueTracker)) { p.outro('취소됨'); return; }

  // 4. 감지 결과 확인
  const confirm = await p.confirm({
    message: `${detected.framework} / ${detected.language} / ${detected.linter} / ${detected.testRunner} — 맞습니까?`,
    initialValue: true,
  });
  if (p.isCancel(confirm)) { p.outro('취소됨'); return; }

  // 5. harness.config.json 생성
  spinner.start('harness.config.json 생성 중...');

  const archForbiddenImports: Record<string, Record<string, string[]>> = {
    fsd: { shared: ['features', 'pages', 'app'], entities: ['features', 'pages', 'app'], features: ['widgets', 'pages', 'app'] },
    clean: { domain: ['infrastructure', 'presentation'], application: ['infrastructure', 'presentation'] },
  };

  const config: HarnessConfig = {
    project: {
      name: detected.name,
      framework: detected.framework,
      packageManager: detected.packageManager,
      language: detected.language,
    },
    architecture: {
      style: detected.architecture,
      enforceIndexGen: true,
      forbiddenImports: archForbiddenImports[detected.architecture] ?? {},
    },
    development: {
      linter: detected.linter,
      formatter: detected.linter === 'biome' ? 'biome' : detected.linter === 'eslint' ? 'prettier' : 'none',
      styling: '',
    },
    testing: {
      runner: detected.testRunner,
      minCoverage: { statements: 80, branches: 75, functions: 80, lines: 80 },
      requireTestFileWithImplementation: false,
    },
    agent: {
      persona: 'senior-developer',
      allowedScopes: ['src/**/*', 'tests/**/*'],
      adapters: [agent as string],
    },
    rules: {
      fileNaming: {
        components: 'PascalCase',
        hooks: 'camelCase',
        utils: 'camelCase',
        services: 'camelCase',
        models: 'camelCase',
        testSuffix: '.test',
      },
      codingStandards: [
        { id: 'no-hardcoded-secrets', description: '시크릿/크리덴셜을 코드에 하드코딩하지 않는다', severity: 'error' as const },
        { id: 'no-console-log', description: 'console.log를 디버깅 용도로 남기지 않는다', severity: 'error' as const },
        { id: 'no-commented-code', description: '주석 처리된 코드 블록을 커밋하지 않는다', severity: 'error' as const },
      ],
    },
  };

  await fs.writeJson(path.join(root, 'harness.config.json'), config, { spaces: 2 });
  spinner.stop('harness.config.json 생성 완료');

  // 6. adapter로 에이전트 설정 파일 생성
  spinner.start('에이전트 설정 파일 생성 중...');
  const stackDirs = [...new Set(detected.stacks.flatMap((s) => getStackRuleDirs(s as StackValue)))];
  const stackRules = await loadStackRules(TEMPLATES_DIR, stackDirs);
  const stackRulesByDir = await loadStackRulesByDir(TEMPLATES_DIR, stackDirs);

  const adapter = getAdapter(agent as AgentType);
  const output = await adapter.generate(root, config, stackRules, stackRulesByDir);

  let fileCount = 0;
  for (const file of output.files) {
    const dest = path.join(root, file.path);
    await fs.ensureDir(path.dirname(dest));
    await fs.writeFile(dest, file.content);
    if (file.executable) await fs.chmod(dest, 0o755);
    fileCount++;
  }
  spinner.stop(`에이전트 설정 파일 ${fileCount}개 생성 완료`);

  // 7. hooks 복사
  spinner.start('Harness hooks 세팅 중...');
  const hookCount = await setupHarnessHooks(root, agent as string);
  spinner.stop(`Hooks ${hookCount}개 세팅 완료`);

  // 8. skills 복사
  spinner.start('Skills 복사 중...');
  const skillsSrc = path.join(TEMPLATES_DIR, 'skills');
  const agentConfig = AGENTS.find((a) => a.value === agent);
  const skillsDest = agentConfig
    ? path.join(root, agentConfig.dir === '.github' ? '.github/skills' : `${agentConfig.dir}/skills`)
    : path.join(root, '.agents/skills');

  // common + workflow는 항상 (하위 디렉토리 구조 보존)
  for (const dir of ['common', 'workflow']) {
    const src = path.join(skillsSrc, dir);
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(skillsDest, dir), { overwrite: false });
    }
  }

  // blockchain이면 blockchain skills도
  const categories = new Set(detected.stacks.map((s) => getStackCategory(s as StackValue)));
  if (categories.has('blockchain')) {
    const bcSrc = path.join(skillsSrc, 'blockchain');
    if (await fs.pathExists(bcSrc)) {
      await fs.copy(bcSrc, skillsDest, { overwrite: false });
    }
  }
  spinner.stop('Skills 복사 완료');

  // 9. 결과 요약
  p.log.success(`${pc.green('✓')} harness.config.json`);
  p.log.success(`${pc.green('✓')} 에이전트 설정 (${adapter.name}) — ${fileCount}개 파일`);
  if (hookCount > 0) p.log.success(`${pc.green('✓')} Hooks — ${hookCount}개`);
  p.log.success(`${pc.green('✓')} Skills`);

  if (output.skipped.length > 0) {
    for (const s of output.skipped) {
      p.log.warn(`⚠️ ${s}`);
    }
  }

  p.outro('하네스 세팅 완료!');
}
