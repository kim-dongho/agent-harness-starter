/**
 * GitHub Copilot 어댑터
 *
 * .github/copilot-instructions.md + .github/instructions/stack-*.md
 * .github/agents/reviewer.md — 코드 리뷰 서브에이전트
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from '../types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from '../builders.js';
import { CODE_REVIEWER_INSTRUCTIONS, PLAN_REVIEWER_INSTRUCTIONS } from '../constants.js';

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

    // .github/agents/reviewer.md — 코드 리뷰 서브에이전트
    files.push({
      path: '.github/agents/reviewer.md',
      content: `---\nname: reviewer\ndescription: 코드 리뷰 — 정확성, 보안, 성능, 컨벤션 위반을 검사한다.\n---\n\n${CODE_REVIEWER_INSTRUCTIONS}`,
    });

    // .github/agents/plan-reviewer.md — 계획 리뷰 서브에이전트
    files.push({
      path: '.github/agents/plan-reviewer.md',
      content: `---\nname: plan-reviewer\ndescription: 계획 리뷰 — 기능 간 충돌, 우선순위, 누락, 일정을 검증한다.\n---\n\n${PLAN_REVIEWER_INSTRUCTIONS}`,
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
