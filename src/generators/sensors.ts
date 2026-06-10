/**
 * @fileoverview Computational Sensors 설정 생성기
 *
 * dependency-cruiser와 Stryker 설정 파일을 harness.config.json 기반으로 생성한다.
 *
 * - dependency-cruiser: 아키텍처 경계 위반을 정적 분석으로 감지
 * - Stryker: mutation testing으로 테스트 품질 검증
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { UserChoices } from '../prompts/types.js';
import { getStackCategory } from '../constants.js';

/**
 * dependency-cruiser 설정 파일을 생성한다.
 *
 * harness.config.json의 forbiddenImports를 dependency-cruiser 규칙으로 변환한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @param choices - 사용자 선택 결과
 */
export async function generateDepCruiserConfig(projectDir: string, choices: UserChoices): Promise<void> {
  const configPath = path.join(projectDir, 'harness.config.json');
  if (!(await fs.pathExists(configPath))) return;

  const config = await fs.readJson(configPath);
  const forbidden = config.architecture?.forbiddenImports ?? {};

  if (Object.keys(forbidden).length === 0) return;

  // forbiddenImports → dependency-cruiser forbidden rules
  const rules = Object.entries(forbidden).map(([source, blocked]) => ({
    name: `no-${source}-to-${(blocked as string[]).join('-')}`,
    severity: 'error',
    from: { path: `^src/${source}` },
    to: { path: (blocked as string[]).map(b => `^src/${b}`).join('|') },
  }));

  const depCruiserConfig = `/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: ${JSON.stringify(rules, null, 4)},
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
`;

  await fs.writeFile(path.join(projectDir, '.dependency-cruiser.cjs'), depCruiserConfig);
}

/**
 * Stryker 설정 파일을 생성한다.
 *
 * JS/TS 스택에서만 생성한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @param choices - 사용자 선택 결과
 */
export async function generateStrykerConfig(projectDir: string, choices: UserChoices): Promise<void> {
  const category = getStackCategory(choices.stack);

  // JS/TS 스택만
  if (!['frontend', 'node-backend'].includes(category)) return;

  const configPath = path.join(projectDir, 'harness.config.json');
  if (!(await fs.pathExists(configPath))) return;

  const config = await fs.readJson(configPath);
  const runner = config.testing?.runner ?? 'vitest';

  const strykerConfig = `/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: '${runner === 'vitest' ? 'vitest' : 'jest'}',
  mutate: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
  thresholds: { high: 80, low: 60, break: 50 },
};
`;

  await fs.writeFile(path.join(projectDir, 'stryker.config.mjs'), strykerConfig);
}

/**
 * Computational Sensors를 프로젝트에 세팅한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리
 * @param choices - 사용자 선택 결과
 * @returns 생성된 설정 파일 수
 */
export async function setupSensors(projectDir: string, choices: UserChoices): Promise<number> {
  let count = 0;
  const devDeps: Record<string, string> = {};

  await generateDepCruiserConfig(projectDir, choices);
  if (await fs.pathExists(path.join(projectDir, '.dependency-cruiser.cjs'))) {
    count++;
    devDeps['dependency-cruiser'] = '^16';
  }

  await generateStrykerConfig(projectDir, choices);
  if (await fs.pathExists(path.join(projectDir, 'stryker.config.mjs'))) {
    count++;
    const config = await fs.readJson(path.join(projectDir, 'harness.config.json'));
    const runner = config.testing?.runner ?? 'vitest';
    devDeps['@stryker-mutator/core'] = '^8';
    devDeps[`@stryker-mutator/${runner === 'vitest' ? 'vitest' : 'jest'}-runner`] = '^8';
  }

  // package.json에 devDependencies 추가
  if (Object.keys(devDeps).length > 0) {
    const pkgPath = path.join(projectDir, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.devDependencies = { ...pkg.devDependencies, ...devDeps };
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }
  }

  return count;
}
