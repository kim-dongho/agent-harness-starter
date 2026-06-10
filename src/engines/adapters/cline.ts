/**
 * Cline 어댑터
 *
 * .clinerules/*.md (YAML frontmatter)
 * hooks 미지원 — rules로 가이드만 제공
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

function wrapCline(title: string, content: string): string {
  return `---
description: ${title}
globs: "**/*"
---

${content}`;
}

export const clineAdapter: AgentAdapter = {
  name: 'Cline',
  type: 'cline',
  supportsHooks: false,
  supportsSkills: true,

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];

    files.push({
      path: '.clinerules/harness.md',
      content: wrapCline('Agent Harness — 프로젝트 규칙 및 워크플로우', [
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
          path: `.clinerules/stack-${dir}.md`,
          content: wrapCline(`Stack Rules — ${dir}`, content),
        });
      }
    }

    return { files, skipped: ['hooks (Cline은 hooks 미지원 — 수동 승인 게이트 사용)'] };
  },
};
