/**
 * Gemini CLI 어댑터
 *
 * GEMINI.md + .gemini/settings.json (BeforeTool/AfterTool hooks)
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildFullContent } from './shared.js';

export const geminiAdapter: AgentAdapter = {
  name: 'Gemini CLI',
  type: 'gemini',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules) {
    const files = [];
    const content = buildFullContent(config, stackRules);

    files.push({
      path: 'GEMINI.md',
      content,
    });

    return { files, skipped: [] };
  },
};
