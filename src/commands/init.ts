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

/**
 * 모노레포 워크스페이스 하위 패키지 경로를 감지한다.
 * pnpm-workspace.yaml, package.json workspaces 지원.
 */
export async function detectWorkspacePackages(projectDir: string): Promise<string[]> {
  const results: string[] = [];

  // pnpm-workspace.yaml
  const pnpmWs = path.join(projectDir, 'pnpm-workspace.yaml');
  if (await fs.pathExists(pnpmWs)) {
    const content = await fs.readFile(pnpmWs, 'utf-8');
    // packages: 아래의 - "pattern" 줄을 파싱
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);
      if (match) {
        const pattern = match[1].replace(/\/\*$/, '');
        const dir = path.join(projectDir, pattern);
        if (await fs.pathExists(dir)) {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) results.push(path.join(dir, entry.name));
          }
        }
      }
    }
    return results;
  }

  // npm/yarn workspaces (package.json)
  const pkgPath = path.join(projectDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    const workspaces: string[] = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces?.packages ?? [];
    for (const ws of workspaces) {
      const pattern = ws.replace(/\/\*$/, '');
      const dir = path.join(projectDir, pattern);
      if (await fs.pathExists(dir)) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) results.push(path.join(dir, entry.name));
        }
      }
    }
  }

  return results;
}

/** 프로젝트 자동 감지 결과 */
interface DetectedProject {
  name: string;
  language: string;
  languages: string[];
  packageManager: string;
  linters: string[];
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
export async function detectProject(projectDir: string): Promise<DetectedProject> {
  const result: DetectedProject = {
    name: path.basename(projectDir),
    language: 'unknown',
    languages: [],
    packageManager: 'npm',
    linters: [],
    testRunner: 'vitest',
    architecture: 'modular',
    stacks: [],
  };

  // 모든 package.json에서 deps 수집 (루트 + 워크스페이스 하위)
  const allDeps: Record<string, string> = {};
  const pkgPath = path.join(projectDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    result.name = pkg.name ?? result.name;
    Object.assign(allDeps, pkg.dependencies ?? {}, pkg.devDependencies ?? {});
  }

  // 모노레포: 워크스페이스 하위 package.json도 스캔
  const workspacePaths = await detectWorkspacePackages(projectDir);
  for (const wpPath of workspacePaths) {
    const wpPkg = path.join(wpPath, 'package.json');
    if (await fs.pathExists(wpPkg)) {
      const pkg = await fs.readJson(wpPkg);
      Object.assign(allDeps, pkg.dependencies ?? {}, pkg.devDependencies ?? {});
    }
  }

  // ── JS/TS deps 기반 스택 감지 (독립 if — 모노레포에서 복수 스택 가능) ──
  if (allDeps['next']) {

    let hasAppDir = await fs.pathExists(path.join(projectDir, 'app'))
      || await fs.pathExists(path.join(projectDir, 'src', 'app'));
    if (!hasAppDir) {
      for (const wp of workspacePaths) {
        if (await fs.pathExists(path.join(wp, 'app')) || await fs.pathExists(path.join(wp, 'src', 'app'))) {
          hasAppDir = true; break;
        }
      }
    }
    result.stacks.push(hasAppDir ? 'nextjs-app' : 'nextjs-pages');
  }
  if (allDeps['@remix-run/react'] || allDeps['remix']) {

    result.stacks.push('remix');
  }
  if (allDeps['nuxt']) {
    result.stacks.push('nuxt');
  }
  if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
    result.stacks.push('sveltekit');
  }
  if (allDeps['@angular/core']) {
    result.stacks.push('angular');
  }
  if (allDeps['react'] && allDeps['vite'] && !allDeps['next'] && !allDeps['@remix-run/react']) {
    result.stacks.push('react-vite');
  }
  if (allDeps['vue'] && allDeps['vite'] && !allDeps['nuxt']) {
    result.stacks.push('vue-vite');
  }
  if (allDeps['@nestjs/core']) {
    result.stacks.push('node-nestjs');
  }
  if (allDeps['express']) {
    result.stacks.push('node-express');
  }
  if (allDeps['hardhat']) {
    result.stacks.push('solidity-hardhat');
  }

  // JS/TS 언어 감지
  if (allDeps['typescript'] || await fs.pathExists(path.join(projectDir, 'tsconfig.json'))) {
    result.languages.push('typescript');
  } else if (Object.keys(allDeps).length > 0) {
    result.languages.push('javascript');
  }

  // 린터 감지 (복수 가능)
  if (allDeps['@biomejs/biome'] || allDeps['biome']) result.linters.push('biome');
  if (allDeps['eslint']) result.linters.push('eslint');

  // 테스트 러너 감지
  if (allDeps['vitest']) result.testRunner = 'vitest';
  else if (allDeps['jest']) result.testRunner = 'jest';

  // 패키지 매니저 감지 (lock 파일 기준)
  if (await fs.pathExists(path.join(projectDir, 'bun.lockb'))) result.packageManager = 'bun';
  else if (await fs.pathExists(path.join(projectDir, 'pnpm-lock.yaml'))) result.packageManager = 'pnpm';
  else if (await fs.pathExists(path.join(projectDir, 'yarn.lock'))) result.packageManager = 'yarn';

  // ── Non-JS 프로젝트 감지 (루트 + 워크스페이스 + 루트 하위 1depth 전체 스캔) ──
  // 워크스페이스에 포함 안 된 디렉토리도 스캔 (예: python/, go-api/ 등)
  const rootEntries = await fs.readdir(projectDir, { withFileTypes: true }).catch(() => [] as fs.Dirent[]);
  const rootSubDirs = rootEntries
    .filter((e): e is fs.Dirent => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => path.join(projectDir, e.name));
  const scanDirs = [...new Set([projectDir, ...workspacePaths, ...rootSubDirs])];
  for (const dir of scanDirs) {
    const goMod = path.join(dir, 'go.mod');
    if (await fs.pathExists(goMod)) {
      if (!result.languages.includes('go')) result.languages.push('go');
      const goModContent = await fs.readFile(goMod, 'utf-8');
      if (goModContent.includes('github.com/gofiber/fiber')) {
        if (!result.stacks.includes('go-fiber')) result.stacks.push('go-fiber');
      } else if (goModContent.includes('github.com/gin-gonic/gin')) {
        if (!result.stacks.includes('go-gin')) result.stacks.push('go-gin');
      }
      const golangci = path.join(dir, '.golangci.yml');
      const golangciYaml = path.join(dir, '.golangci.yaml');
      if ((await fs.pathExists(golangci) || await fs.pathExists(golangciYaml)) && !result.linters.includes('golangci-lint')) result.linters.push('golangci-lint');
    }

    const cargoToml = path.join(dir, 'Cargo.toml');
    if (await fs.pathExists(cargoToml)) {
      if (!result.languages.includes('rust')) result.languages.push('rust');
      const cargoContent = await fs.readFile(cargoToml, 'utf-8');
      if (cargoContent.includes('axum') && !result.stacks.includes('rust-axum')) {
        result.stacks.push('rust-axum');
      } else if (cargoContent.includes('anchor-lang') && !result.stacks.includes('solana-anchor')) {
        result.stacks.push('solana-anchor');
      }
    }

    const pyProject = path.join(dir, 'pyproject.toml');
    const reqTxt = path.join(dir, 'requirements.txt');
    if (await fs.pathExists(pyProject) || await fs.pathExists(reqTxt)) {
      if (!result.languages.includes('python')) result.languages.push('python');
      // pyproject.toml 또는 requirements.txt에서 프레임워크 감지
      const pyFile = await fs.pathExists(pyProject) ? pyProject : await fs.pathExists(reqTxt) ? reqTxt : null;
      if (pyFile) {
        const pyContent = await fs.readFile(pyFile, 'utf-8');
        if (pyContent.includes('fastapi') && !result.stacks.includes('python-fastapi')) {
          result.stacks.push('python-fastapi');
        } else if (pyContent.includes('django') && !result.stacks.includes('python-django')) {
          result.stacks.push('python-django');
        }
      }
      if ((await fs.pathExists(path.join(dir, 'ruff.toml')) || await fs.pathExists(path.join(dir, '.ruff.toml'))) && !result.linters.includes('ruff')) result.linters.push('ruff');
    }

    const pomXml = path.join(dir, 'pom.xml');
    const buildGradle = path.join(dir, 'build.gradle');
    if (await fs.pathExists(pomXml) || await fs.pathExists(buildGradle)) {
      if (!result.languages.includes('java')) result.languages.push('java');
      const buildContent = await fs.pathExists(pomXml)
        ? await fs.readFile(pomXml, 'utf-8')
        : await fs.readFile(buildGradle, 'utf-8');
      if ((buildContent.includes('spring-boot') || buildContent.includes('org.springframework')) && !result.stacks.includes('java-spring')) {
        result.stacks.push('java-spring');
      }
    }

    if (await fs.pathExists(path.join(dir, 'foundry.toml'))) {
      if (!result.languages.includes('solidity')) result.languages.push('solidity');
      if (!result.stacks.includes('solidity-foundry')) {
        result.stacks.push('solidity-foundry');
      }
    }

    if (await fs.pathExists(path.join(dir, 'Move.toml'))) {
      if (!result.languages.includes('move')) result.languages.push('move');
      if (!result.stacks.includes('move-sui')) {
        result.stacks.push('move-sui');
      }
    }
  }

  // language = 대표 언어 (첫 번째)
  if (result.languages.length > 0) {
    result.language = result.languages[0];
  }

  // non-JS 단독 프로젝트일 때 packageManager/testRunner 보정
  const hasJsDeps = Object.keys(allDeps).length > 0;
  if (!hasJsDeps && result.languages.length > 0) {
    const lang = result.languages[0];
    if (lang === 'go') { result.packageManager = 'go'; result.testRunner = 'go test'; }
    else if (lang === 'rust') { result.packageManager = 'cargo'; result.testRunner = 'cargo test'; }
    else if (lang === 'python') {
      result.testRunner = 'pytest';
      // poetry lock 있으면 poetry, 아니면 pip
      for (const dir of scanDirs) {
        if (await fs.pathExists(path.join(dir, 'poetry.lock'))) { result.packageManager = 'poetry'; break; }
      }
      if (result.packageManager === 'npm') result.packageManager = 'pip';
    }
    else if (lang === 'java') {
      result.testRunner = 'junit';
      for (const dir of scanDirs) {
        if (await fs.pathExists(path.join(dir, 'build.gradle'))) { result.packageManager = 'gradle'; break; }
        if (await fs.pathExists(path.join(dir, 'pom.xml'))) { result.packageManager = 'maven'; break; }
      }
    }
    else if (lang === 'solidity') { result.packageManager = 'forge'; result.testRunner = 'forge test'; }
    else if (lang === 'move') { result.packageManager = 'sui'; result.testRunner = 'sui move test'; }
  }

  // 아키텍처 감지 (디렉토리 구조 기준) — 루트 + 워크스페이스 하위
  const dirsToCheck = [projectDir, ...workspacePaths];
  for (const dir of dirsToCheck) {
    const srcDir = path.join(dir, 'src');
    if (await fs.pathExists(srcDir)) {
      const entries: string[] = await fs.readdir(srcDir).catch(() => [] as string[]);
      if (entries.includes('features') && entries.includes('shared')) { result.architecture = 'fsd'; break; }
      else if (entries.includes('domain') && entries.includes('application')) { result.architecture = 'clean'; break; }
      else if (entries.includes('modules')) { result.architecture = 'modular'; break; }
      else if (entries.includes('controllers') && entries.includes('services')) { result.architecture = 'modular'; break; }
    }
    // Go/Rust/Python — src 없이 루트에 직접 구조가 있는 경우
    const rootEntries: string[] = await fs.readdir(dir).catch(() => [] as string[]);
    if (rootEntries.includes('internal') && rootEntries.includes('cmd')) { result.architecture = 'clean'; break; }
    else if (rootEntries.includes('domain') && rootEntries.includes('handler')) { result.architecture = 'clean'; break; }
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

  p.log.info([
    `  languages:  ${detected.languages.length > 0 ? detected.languages.join(', ') : 'unknown'}`,
    `  stacks:     ${detected.stacks.length > 0 ? detected.stacks.join(', ') : 'none'}`,
    `  package:    ${detected.packageManager}`,
    `  linters:    ${detected.linters.length > 0 ? detected.linters.join(', ') : 'none'}`,
    `  test:       ${detected.testRunner}`,
    `  arch:       ${detected.architecture}`,
  ].join('\n'));

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
    message: `${detected.stacks.join(', ') || 'unknown'} / ${detected.languages.join(', ')} — 맞습니까?`,
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
      framework: detected.stacks[0] ?? 'unknown',
      packageManager: detected.packageManager,
      language: detected.language,
    },
    architecture: {
      style: detected.architecture,
      enforceIndexGen: true,
      forbiddenImports: archForbiddenImports[detected.architecture] ?? {},
    },
    development: {
      linter: detected.linters[0] ?? 'none',
      formatter: detected.linters.includes('biome') ? 'biome' : detected.linters.includes('eslint') ? 'prettier' : 'none',
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
