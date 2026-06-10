/**
 * Gemini CLI 어댑터
 *
 * GEMINI.md + @import로 스택별 파일 모듈화
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

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

    // GEMINI.md — 프로젝트 규칙 + @import로 스택 파일 참조
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
