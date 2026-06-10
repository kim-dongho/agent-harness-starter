/**
 * Windsurf 어댑터
 *
 * .windsurf/rules/*.md (trigger frontmatter)
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildFullContent } from './shared.js';

function wrapWindsurf(content: string): string {
  return `---
trigger: always
---

${content}`;
}

export const windsurfAdapter: AgentAdapter = {
  name: 'Windsurf',
  type: 'windsurf',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules) {
    const files = [];
    const content = buildFullContent(config, stackRules);

    files.push({
      path: '.windsurf/rules/harness.md',
      content: wrapWindsurf(content),
    });

    return { files, skipped: [] };
  },
};
