/**
 * Cursor 어댑터
 *
 * .cursor/rules/*.mdc + .cursor/agents/reviewer.md
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

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
      content: [
        '---',
        'name: reviewer',
        'description: 코드 리뷰 — 정확성, 보안, 성능, 컨벤션 위반을 검사한다.',
        'model: inherit',
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
          path: `.cursor/rules/stack-${dir}.mdc`,
          content: wrapMdc(`Stack Rules — ${dir}`, content),
        });
      }
    }

    return { files, skipped: [] };
  },
};
