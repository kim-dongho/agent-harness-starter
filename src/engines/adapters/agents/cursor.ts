/**
 * Cursor 어댑터
 *
 * .cursor/rules/*.mdc + .cursor/agents/reviewer.md
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from '../types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from '../builders.js';
import { CODE_REVIEWER_INSTRUCTIONS, PLAN_REVIEWER_INSTRUCTIONS } from '../constants.js';

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

    // .cursor/agents/reviewer.md — 코드 리뷰 서브에이전트
    files.push({
      path: '.cursor/agents/reviewer.md',
      content: `---\nname: reviewer\ndescription: 코드 리뷰 — 정확성, 보안, 성능, 컨벤션 위반을 검사한다.\nmodel: inherit\n---\n\n${CODE_REVIEWER_INSTRUCTIONS}`,
    });

    // .cursor/agents/plan-reviewer.md — 계획 리뷰 서브에이전트
    files.push({
      path: '.cursor/agents/plan-reviewer.md',
      content: `---\nname: plan-reviewer\ndescription: 계획 리뷰 — 기능 간 충돌, 우선순위, 누락, 일정을 검증한다.\nmodel: inherit\n---\n\n${PLAN_REVIEWER_INSTRUCTIONS}`,
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
