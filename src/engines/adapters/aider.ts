/**
 * Aider 어댑터
 *
 * CONVENTIONS.md + .aider.conf.yml
 * hooks 미지원 — auto-lint/auto-test 내장 기능 활용
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildFullContent } from './shared.js';

export const aiderAdapter: AgentAdapter = {
  name: 'Aider',
  type: 'aider',
  supportsHooks: false,
  supportsSkills: false,

  async generate(_root, config, stackRules) {
    const files = [];
    const content = buildFullContent(config, stackRules);

    // CONVENTIONS.md — 전체 규칙 (skills 미지원이라 여기에 전부 포함)
    files.push({
      path: 'CONVENTIONS.md',
      content,
    });

    // .aider.conf.yml — auto-lint/auto-test 활성화
    const lintCmd = config.development.linter === 'biome'
      ? 'npx biome check --write'
      : 'npx eslint --fix';

    files.push({
      path: '.aider.conf.yml',
      content: [
        '# Aider configuration — harness auto-generated',
        'auto-lint: true',
        'auto-test: true',
        `lint-cmd: "${lintCmd}"`,
        `test-cmd: "npx ${config.testing.runner} run"`,
        '',
      ].join('\n'),
    });

    return { files, skipped: ['hooks (Aider는 auto-lint/auto-test 내장 기능 사용)'] };
  },
};
