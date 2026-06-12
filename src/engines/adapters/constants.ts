/**
 * @fileoverview 서브에이전트 지시문 상수
 *
 * 각 어댑터(Codex, Cursor, Copilot, Gemini)에서 서브에이전트 정의 시
 * 공통으로 사용하는 프롬프트 텍스트.
 *
 * Claude는 Stop hook의 agent 프롬프트에서 직접 사용하고,
 * 나머지 에이전트는 agents/ 폴더의 서브에이전트 파일에 포함된다.
 */

/**
 * code-reviewer 서브에이전트 지시문
 *
 * 변경된 코드의 정확성, 보안, 성능, 컨벤션, 스코프를 검사한다.
 */
export const CODE_REVIEWER_INSTRUCTIONS = [
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
].join('\n');

/**
 * plan-reviewer 서브에이전트 지시문
 *
 * `/plan`으로 생성된 docs/plan.json의 기능 간 충돌, 우선순위, 누락, 일정을 검증한다.
 */
/**
 * code-review 스킬 — 3관점 병렬 리뷰
 */
export const CODE_REVIEW_SKILL = [
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
].join('\n');

/**
 * metrics 스킬 — 하네스 메트릭 집계
 */
export const METRICS_SKILL = [
  '`.harness/metrics.jsonl`을 읽어서 최근 7일간 메트릭을 집계한다.',
  '파일이 없으면 "메트릭 데이터가 없습니다"를 출력하고 종료한다.',
  '',
  '집계 항목:',
  '1. 차단 횟수: scope-guard, scaffold-guard의 block 이벤트 수',
  '2. 에러 감지: post-write의 error 이벤트 수',
  '3. first-pass 성공률: 파일별 첫 post-write 이벤트가 clean인 비율',
  '4. self-heal 성공률: 같은 파일에서 error → clean 순서로 나온 비율',
  '5. 에러 코드 Top 5',
  '',
  'first-pass: 파일의 첫 이벤트가 clean이면 성공',
  'self-heal: 같은 파일에 error 다음 clean이면 성공',
].join('\n');

export const PLAN_REVIEWER_INSTRUCTIONS = [
  '계획(docs/plan.json)을 리뷰한다.',
  '',
  '## 리뷰 기준',
  '- 기능 간 의존성 충돌이 없는지',
  '- 우선순위가 합리적인지',
  '- 누락된 기능이 없는지',
  '- 마일스톤 일정이 현실적인지',
  '- 기능 설명이 구현 가능한 수준으로 구체적인지',
  '',
  '문제 발견 시 구체적 수정 사항을 제시한다.',
  '문제 없으면 승인하고 docs/plan-review.md에 승인 결과를 기록한다.',
].join('\n');
