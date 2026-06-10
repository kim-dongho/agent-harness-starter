/**
 * GitHub Copilot 어댑터
 *
 * .github/copilot-instructions.md
 * .github/hooks/ (preToolUse — fail-closed)
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildFullContent } from './shared.js';

export const copilotAdapter: AgentAdapter = {
  name: 'GitHub Copilot',
  type: 'copilot',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules) {
    const files = [];
    const content = buildFullContent(config, stackRules);

    files.push({
      path: '.github/copilot-instructions.md',
      content,
    });

    return { files, skipped: [] };
  },
};
