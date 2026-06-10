/**
 * Cursor 어댑터
 *
 * .cursor/rules/*.mdc (frontmatter: alwaysApply: true)
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

function wrapMdc(title: string, content: string): string {
  return `---
description: "${title}"
alwaysApply: true
---

${content}`;
}

export const cursorAdapter: AgentAdapter = {
  name: 'Cursor',
  type: 'cursor',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];

    files.push({
      path: '.cursor/rules/harness.mdc',
      content: wrapMdc('Agent Harness — 프로젝트 규칙 및 워크플로우', [
        buildProjectContext(config),
        buildCodingPrinciples(),
        buildConventionRules(config),
        buildCodingStandards(config),
        buildWorkflowRules(config),
      ].join('\n')),
    });

    if (stackRulesByDir && Object.keys(stackRulesByDir).length > 0) {
      for (const [dir, content] of Object.entries(stackRulesByDir)) {
        files.push({
          path: `.cursor/rules/stack-${dir}.mdc`,
          content: wrapMdc(`Stack Rules — ${dir}`, content),
        });
      }
    }

    return { files, skipped: [] };
  },
};
