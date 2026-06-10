/**
 * Windsurf 어댑터
 *
 * .windsurf/rules/*.md (trigger frontmatter)
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

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

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];

    // .windsurf/rules/harness.md — 프로젝트 컨텍스트 + 원칙 + 컨벤션 + 워크플로우
    files.push({
      path: '.windsurf/rules/harness.md',
      content: wrapWindsurf([
        buildProjectContext(config),
        buildCodingPrinciples(),
        buildConventionRules(config),
        buildCodingStandards(config),
        buildWorkflowRules(config),
      ].join('\n')),
    });

    // .windsurf/rules/stack/{name}.md — 스택별 분리
    if (stackRulesByDir && Object.keys(stackRulesByDir).length > 0) {
      for (const [dir, content] of Object.entries(stackRulesByDir)) {
        files.push({
          path: `.windsurf/rules/stack/${dir}.md`,
          content: wrapWindsurf(content),
        });
      }
    }

    return { files, skipped: [] };
  },
};
