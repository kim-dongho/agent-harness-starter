/**
 * Gemini CLI 어댑터
 *
 * GEMINI.md + @import로 스택별 파일 모듈화
 * .gemini/agents/reviewer.md — 코드 리뷰 서브에이전트
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from '../types.js';
import { buildProjectContext, buildCodingPrinciples, buildConventionRules, buildCodingStandards, buildWorkflowRules } from '../builders.js';
import { CODE_REVIEWER_INSTRUCTIONS, PLAN_REVIEWER_INSTRUCTIONS } from '../constants.js';

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

    // .gemini/commands/code-review.toml — /code-review 커맨드
    files.push({
      path: '.gemini/commands/code-review.toml',
      content: [
        'description = "3관점 병렬 코드 리뷰 (보안/아키텍처/품질)"',
        'prompt = """',
        '`git diff HEAD --stat`으로 변경 파일을 확인하고, 변경이 없으면 종료한다.',
        '',
        '3가지 관점에서 리뷰한다:',
        '',
        '### 보안 리뷰',
        '- path traversal, 미검증 입력, 하드코딩 시크릿, 명령 주입, 권한 문제',
        '',
        '### 아키텍처 리뷰',
        '- OS 호환성, 외부 의존성, 설정 기본값 일관성',
        '',
        '### 품질 리뷰',
        '- 엣지 케이스 누락, 중복 코드, 에러 처리 누락, 네이밍/가독성',
        '',
        '각 항목을 Critical/Important/Suggestion으로 분류하고, 파일:라인 번호를 포함한다.',
        '종합 결과를 테이블로 정리하고, 2개 이상 관점에서 동일 이슈를 지적하면 심각도를 한 단계 올린다.',
        '',
        '```diff',
        '!{git diff HEAD}',
        '```',
        '"""',
      ].join('\n'),
    });

    // .gemini/commands/metrics.toml — /metrics 커맨드
    files.push({
      path: '.gemini/commands/metrics.toml',
      content: [
        'description = "하네스 메트릭 집계 (차단율, self-heal, first-pass)"',
        'prompt = """',
        '.harness/metrics.jsonl을 읽어서 최근 7일간 메트릭을 집계하라.',
        '파일이 없으면 "메트릭 데이터가 없습니다"를 출력하고 종료한다.',
        '',
        '집계 항목:',
        '1. 차단 횟수: scope-guard, scaffold-guard의 block 이벤트 수',
        '2. 에러 감지: post-write의 error 이벤트 수',
        '3. first-pass 성공률: 파일별 첫 post-write 이벤트가 clean인 비율',
        '4. self-heal 성공률: 같은 파일에서 error → clean 순서로 나온 비율',
        '5. 에러 코드 Top 5',
        '',
        '```',
        '!{cat .harness/metrics.jsonl 2>/dev/null || echo "NO_DATA"}',
        '```',
        '"""',
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
