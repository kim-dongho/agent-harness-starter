/**
 * OpenAI Codex CLI 어댑터
 *
 * AGENTS.md + .codex/agents/reviewer.toml + .codex/rules/
 * 서브에이전트로 코드 리뷰 지원
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from './shared.js';

export const codexAdapter: AgentAdapter = {
  name: 'OpenAI Codex CLI',
  type: 'codex',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];

    // AGENTS.md — 프로젝트 규칙
    files.push({
      path: 'AGENTS.md',
      content: [
        buildProjectContext(config),
        buildCodingPrinciples(),
        buildConventionRules(config),
        buildCodingStandards(config),
        buildWorkflowRules(config),
      ].join('\n'),
    });

    // .codex/agents/reviewer.toml — 코드 리뷰 서브에이전트
    files.push({
      path: '.codex/agents/reviewer.toml',
      content: [
        'name = "reviewer"',
        'description = "코드 리뷰 — 정확성, 보안, 성능, 컨벤션 위반을 검사한다."',
        'model_reasoning_effort = "high"',
        'sandbox_mode = "read-only"',
        'developer_instructions = """',
        '변경된 코드를 리뷰한다.',
        '정확성: 로직 에러, 엣지 케이스 누락',
        '보안: 미검증 입력, 하드코딩 시크릿',
        '성능: N+1, 불필요한 루프',
        '컨벤션: codingStandards 위반',
        '스코프: 요청 범위 밖 변경',
        '구체적 수정 사항을 제시하고, 문제 없으면 승인한다.',
        '"""',
      ].join('\n'),
    });

    // .codex/agents/explorer.toml — 코드베이스 탐색 서브에이전트
    files.push({
      path: '.codex/agents/explorer.toml',
      content: [
        'name = "explorer"',
        'description = "Read-only 코드베이스 탐색 — 변경 대상 파일과 의존 관계를 파악한다."',
        'model_reasoning_effort = "medium"',
        'sandbox_mode = "read-only"',
        'developer_instructions = """',
        '코드베이스를 탐색하여 변경 대상 파일, 의존 관계, 영향 범위를 파악한다.',
        '코드를 수정하지 않는다. 탐색 결과만 보고한다.',
        '"""',
      ].join('\n'),
    });

    // .codex/rules/stack-{name}.md — 스택별 분리
    if (stackRulesByDir && Object.keys(stackRulesByDir).length > 0) {
      for (const [dir, content] of Object.entries(stackRulesByDir)) {
        files.push({
          path: `.codex/rules/stack-${dir}.md`,
          content,
        });
      }
    } else if (stackRules) {
      files.push({
        path: '.codex/rules/stack.md',
        content: stackRules,
      });
    }

    return { files, skipped: [] };
  },
};
