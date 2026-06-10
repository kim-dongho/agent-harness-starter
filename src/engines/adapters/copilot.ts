/**
 * GitHub Copilot 어댑터
 *
 * .github/copilot-instructions.md + .github/instructions/stack-*.md
 * .github/agents/reviewer.md — 코드 리뷰 서브에이전트
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

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
      content: [
        '---',
        'name: reviewer',
        'description: 코드 리뷰 — 정확성, 보안, 성능, 컨벤션 위반을 검사한다.',
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
