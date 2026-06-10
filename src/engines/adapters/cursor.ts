/**
 * Cursor 어댑터
 *
 * .cursor/rules/*.mdc (frontmatter: alwaysApply: true)
 * .cursor/hooks.json (preToolUse/postToolUse)
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildFullContent } from './shared.js';

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

  async generate(_root, config, stackRules) {
    const files = [];
    const content = buildFullContent(config, stackRules);

    // .cursor/rules/harness.mdc
    files.push({
      path: '.cursor/rules/harness.mdc',
      content: wrapMdc('Agent Harness — 프로젝트 규칙 및 워크플로우', content),
    });

    return { files, skipped: [] };
  },
};
