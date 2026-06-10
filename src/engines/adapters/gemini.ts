/**
 * Gemini CLI 어댑터
 *
 * GEMINI.md + @import로 스택별 파일 모듈화
 * .gemini/agents/reviewer.md — 코드 리뷰 서브에이전트
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

    // .gemini/agents/reviewer.md — 코드 리뷰 서브에이전트
    files.push({
      path: '.gemini/agents/reviewer.md',
      content: [
        '---',
        'name: reviewer',
        'description: 코드 리뷰 — 정확성, 보안, 성능, 컨벤션 위반을 검사한다.',
        'tools:',
        '  - read_file',
        '  - grep_search',
        'temperature: 0.2',
        'max_turns: 10',
        '---',
        '',
        '변경된 코드를 리뷰한다.',
        '',
        '## 리뷰 기준',
        '- 정확성: 로직 에러, 엣지 케이스 누락',
        '- 보안: 미검증 입력, 하드코딩 시크릿',
        '- 성능: N+1, 불필요한 루프',
        '- 컨벤션: codingStandards 위반',
        '- 스코프: 요청 범위 밖 변경',
        '',
        '구체적 수정 사항을 제시하고, 문제 없으면 승인한다.',
      ].join('\n'),
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
