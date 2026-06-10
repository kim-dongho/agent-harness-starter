/**
 * Cline 어댑터
 *
 * .clinerules/*.md (YAML frontmatter)
 * hooks 미지원 — rules로 가이드만 제공
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildFullContent } from './shared.js';

function wrapCline(content: string): string {
  return `---
description: Agent Harness — 프로젝트 규칙 및 워크플로우
globs: "**/*"
---

${content}`;
}

export const clineAdapter: AgentAdapter = {
  name: 'Cline',
  type: 'cline',
  supportsHooks: false,
  supportsSkills: true,

  async generate(_root, config, stackRules) {
    const files = [];
    const content = buildFullContent(config, stackRules);

    files.push({
      path: '.clinerules/harness.md',
      content: wrapCline(content),
    });

    return { files, skipped: ['hooks (Cline은 hooks 미지원 — 수동 승인 게이트 사용)'] };
  },
};
