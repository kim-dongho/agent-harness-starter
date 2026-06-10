/**
 * Aider 어댑터
 *
 * CONVENTIONS.md + rules/{stack}.md + .aider.conf.yml
 * hooks 미지원 — auto-lint/auto-test 내장 기능 활용
 * .aider.conf.yml의 read 옵션으로 스택별 파일 분리 가능
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

export const aiderAdapter: AgentAdapter = {
  name: 'Aider',
  type: 'aider',
  supportsHooks: false,
  supportsSkills: false,

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];
    const readFiles: string[] = ['CONVENTIONS.md'];

    // CONVENTIONS.md — 프로젝트 규칙 (스택 제외)
    files.push({
      path: 'CONVENTIONS.md',
      content: [
        buildProjectContext(config),
        buildCodingPrinciples(),
        buildConventionRules(config),
        buildCodingStandards(config),
        buildWorkflowRules(config),
      ].join('\n'),
    });

    // rules/{name}.md — 스택별 분리
    if (stackRulesByDir && Object.keys(stackRulesByDir).length > 0) {
      for (const [dir, content] of Object.entries(stackRulesByDir)) {
        const filePath = `rules/${dir}.md`;
        files.push({ path: filePath, content });
        readFiles.push(filePath);
      }
    } else if (stackRules) {
      files.push({ path: 'rules/stack.md', content: stackRules });
      readFiles.push('rules/stack.md');
    }

    // .aider.conf.yml — auto-lint/auto-test + read 목록
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
        'read:',
        ...readFiles.map(f => `  - ${f}`),
        '',
      ].join('\n'),
    });

    return { files, skipped: ['hooks (Aider는 auto-lint/auto-test 내장 기능 사용)'] };
  },
};
