/**
 * GitHub Copilot 어댑터
 *
 * .github/copilot-instructions.md + .github/instructions/stack-*.md
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

export const copilotAdapter: AgentAdapter = {
  name: 'GitHub Copilot',
  type: 'copilot',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];

    files.push({
      path: '.github/copilot-instructions.md',
      content: [
        buildProjectContext(config),
        buildCodingPrinciples(),
        buildConventionRules(config),
        buildCodingStandards(config),
        buildWorkflowRules(config),
      ].join('\n'),
    });

    if (stackRulesByDir && Object.keys(stackRulesByDir).length > 0) {
      for (const [dir, content] of Object.entries(stackRulesByDir)) {
        files.push({
          path: `.github/instructions/stack-${dir}.md`,
          content,
        });
      }
    }

    return { files, skipped: [] };
  },
};
