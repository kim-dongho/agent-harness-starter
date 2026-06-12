/**
 * Gemini CLI 어댑터
 *
 * GEMINI.md + @import로 스택별 파일 모듈화
 * .gemini/agents/reviewer.md — 코드 리뷰 서브에이전트
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from '../types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from '../builders.js';
import { CODE_REVIEWER_INSTRUCTIONS, PLAN_REVIEWER_INSTRUCTIONS, CODE_REVIEW_SKILL, METRICS_SKILL } from '../constants.js';

export const geminiAdapter: AgentAdapter = {
  name: 'Gemini CLI',
  type: 'gemini',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];
    const imports: string[] = [];

    // .gemini/rules/{name}.md — 스택별 분리
    if (stackRulesByDir && Object.keys(stackRulesByDir).length > 0) {
      for (const [dir, content] of Object.entries(stackRulesByDir)) {
        files.push({ path: `.gemini/rules/${dir}.md`, content });
        imports.push(`@./.gemini/rules/${dir}.md`);
      }
    }

    // .gemini/agents/reviewer.md — 코드 리뷰 서브에이전트
    files.push({
      path: '.gemini/agents/reviewer.md',
      content: `---\nname: reviewer\ndescription: 코드 리뷰 — 정확성, 보안, 성능, 컨벤션 위반을 검사한다.\ntools:\n  - read_file\n  - grep_search\ntemperature: 0.2\nmax_turns: 10\n---\n\n${CODE_REVIEWER_INSTRUCTIONS}`,
    });

    // .gemini/agents/plan-reviewer.md — 계획 리뷰 서브에이전트
    files.push({
      path: '.gemini/agents/plan-reviewer.md',
      content: `---\nname: plan-reviewer\ndescription: 계획 리뷰 — 기능 간 충돌, 우선순위, 누락, 일정을 검증한다.\ntools:\n  - read_file\n  - grep_search\ntemperature: 0.2\nmax_turns: 10\n---\n\n${PLAN_REVIEWER_INSTRUCTIONS}`,
    });

    // .gemini/agents/code-review.md — 코드 리뷰 스킬
    files.push({
      path: '.gemini/agents/code-review.md',
      content: `---\nname: code-review\ndescription: 3관점 병렬 코드 리뷰 (보안/아키텍처/품질)\ntools:\n  - read_file\n  - grep_search\n  - shell\ntemperature: 0.2\nmax_turns: 15\n---\n\n${CODE_REVIEW_SKILL}`,
    });

    // .gemini/agents/metrics.md — 메트릭 스킬
    files.push({
      path: '.gemini/agents/metrics.md',
      content: `---\nname: metrics\ndescription: 하네스 메트릭 집계 (차단율, self-heal, first-pass)\ntools:\n  - read_file\n  - shell\ntemperature: 0.0\nmax_turns: 5\n---\n\n${METRICS_SKILL}`,
    });

    // GEMINI.md
    files.unshift({
      path: 'GEMINI.md',
      content: [
        buildProjectContext(config),
        buildCodingPrinciples(),
        buildConventionRules(config),
        buildCodingStandards(config),
        buildWorkflowRules(config),
        imports.length > 0 ? `## Stack Rules\n\n${imports.join('\n')}` : (stackRules ? `## Stack Rules\n\n${stackRules}` : ''),
      ].filter(Boolean).join('\n'),
    });

    return { files, skipped: [] };
  },
};
