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
