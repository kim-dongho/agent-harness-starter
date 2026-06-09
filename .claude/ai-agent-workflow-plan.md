# AI 에이전트 워크플로우 체계화 계획

> 참고: [FE 최적화, 비즈니스로 시작해서 엔지니어링으로 끝내기 (당근)](https://medium.com/daangn/fe-%EC%B5%9C%EC%A0%81%ED%99%94-%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4%EB%A1%9C-%EC%8B%9C%EC%9E%91%ED%95%B4%EC%84%9C-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4%EB%A7%81%EC%9C%BC%EB%A1%9C-%EB%81%9D%EB%82%B4%EA%B8%B0-75029185363e)

## 현재 vs 목표 비교

| 영역 | 당근 (글) | ssp-front (현재) | 상태 |
| --- | --- | --- | --- |
| 규칙 체계 | `.claude/rules/` 3-Tier | `.claude/rules/` + `CLAUDE.md` | ✅ 이미 있음 |
| 커밋 자동화 | /done 내 포함 | `/commit` 별도 커맨드 | ✅ 이미 있음 |
| MR 자동화 | /done 내 포함 | `/create-mr` + 영향 분석 | ✅ 더 잘 되어있음 |
| Jira 연동 | /start로 티켓 조회+상태 변경 | MR 생성 시 Jira 제목 자동 조회 | 🔶 부분 적용 |
| Figma 연동 | MCP로 디자인 분석 | Figma MCP 연결됨 (미활용) | 🔶 연결만 됨 |
| 인지 흐름 모델 | 6단계 (READ→REFLECT) | 없음 | ❌ 미적용 |
| 복잡도 기반 라우팅 | LOW/MEDIUM/HIGH → 모델 선택 | 없음 | ❌ 미적용 |
| 에이전트 페르소나 | 6개 전문 에이전트 | 없음 (범용 사용) | ❌ 미적용 |
| 품질 게이트 | /done 5단계 게이트 | lint + type-check (pre-commit) | 🔶 부분 적용 |
| 금지 패턴 | 명시적 규칙 파일 | CLAUDE.md에 일부 포함 | 🔶 부분 적용 |
| 정책 보호 테스트 | 비즈니스 규칙 회귀 테스트 | 단위 테스트 있음 (정책 특화 아님) | 🔶 부분 적용 |
| Agent Teams | 병렬 협업 | 없음 | ❌ 미적용 |
| /start 워크플로우 | 티켓→분석→계획→구현 | 없음 | ❌ 미적용 |

## 적용 계획

### Phase 1 — 규칙 강화 (즉시 적용 가능)

#### 1. 인지 흐름 모델 추가

- 파일: `rules/core/thinking-model.md`
- 6단계 흐름: READ → ANALYZE → PLAN → IMPLEMENT → VERIFY → REFLECT
- 복잡도별 단계 조절
  - LOW: READ → IMPLEMENT → VERIFY (빠르게)
  - MEDIUM: READ → ANALYZE → IMPLEMENT → VERIFY
  - HIGH: 전체 6단계 + 서브태스크 분리
- 현재 CLAUDE.md의 산발적 지시를 구조화

#### 2. 금지 패턴 명시화

- 파일: `rules/core/forbidden-patterns.md`
- 현재 CLAUDE.md에 흩어진 금지 사항을 한 곳으로 통합
  - `any` 타입 사용
  - `!` non-null assertion
  - `enum` 사용
  - `style={{}}` 인라인 스타일
  - 하드코딩 문자열 (i18n 미사용)
  - 서버 상태에 `useState` 사용
  - 기존 정책 임의 변경
  - 요청 없이 "더 나은 패턴"으로 코드 변경

#### 3. 정책 보호 테스트 가이드

- 파일: `rules/core/policy-test.md`
- 비즈니스 규칙 회귀 테스트 패턴 정의
  - 날짜 계산, 필터 조건, 상태 전이 등
- 정책 키워드 탐지 시 테스트 강제 요구

### Phase 2 — 워크플로우 커맨드

#### 4. `/start` 커맨드 구축

```
/start VM2026-XXX

→ Jira 티켓 조회 + 상태 "진행 중" 변경
→ 브랜치 자동 생성 (fix/VM2026-XXX)
→ 변경 대상 파일 탐색
→ 복잡도 판단 (LOW / MEDIUM / HIGH)
→ 구현 계획 제시
```

- Jira API 연동 (`scripts/gitlab/.env`의 Jira 토큰 활용)
- 브랜치 prefix는 티켓 타입에 따라 자동 결정 (Bug→fix, Story→feature 등)

#### 5. `/done` 커맨드 구축

기존 `/commit` + `/create-mr` 통합 + 품질 게이트 추가

```
/done

→ 변경 내용 분석 + 정책 키워드 탐지
→ lint / type-check / test 검증
→ 품질 게이트 (5단계) 통과 확인
  1. 코드 품질 — lint, type-check 통과
  2. 테스트 — 관련 테스트 통과
  3. 정책 보호 — 정책 키워드 변경 시 테스트 존재 확인
  4. 범위 검증 — 의도하지 않은 파일 변경 없음
  5. 컨벤션 — 커밋 메시지, SPDX 헤더 등
→ 커밋 → push → MR 생성 → Jira 완료
```

### Phase 3 — 에이전트 전문화 (선택적)

#### 6. 페르소나 정의

- 파일: `agents/` 디렉토리
- `explorer` — 코드 탐색 전용 (수정 불가)
- `implementer` — 기능 구현 담당
- `reviewer` — 코드 리뷰 + 정책 검증
- `refactorer` — 리팩토링 + 회귀 테스트

#### 7. 복잡도 기반 모델 라우팅

| 복잡도 | 기준 | 모델 |
| --- | --- | --- |
| LOW | 파일 1~2개, 단순 수정 | haiku / sonnet |
| MEDIUM | 파일 3~5개, 로직 변경 | sonnet |
| HIGH | 파일 6개+ 또는 정책 관련 | opus |

- 정책 키워드 포함 시 자동으로 한 단계 상향

### Phase 4 — 병렬 협업 (선택적)

#### 8. Agent Teams 적용

- HIGH 복잡도 작업 시 서브태스크 자동 분리
- 페르소나별 에이전트가 병렬 처리
- 팀 리드가 결과 검증 + 병합

## 우선순위

| 순위 | 항목 | 효과 | 공수 |
| --- | --- | --- | --- |
| 1 | `/start` 커맨드 | 매 티켓 반복 동선 자동화 | 중 |
| 2 | 인지 흐름 모델 | 에이전트 응답 품질 향상 | 소 |
| 3 | `/done` 커맨드 | 기존 커맨드 통합, 품질 게이트 추가 | 중 |
| 4 | 금지 패턴 명시화 | 규칙 파일 하나 추가 | 소 |
| 5 | 정책 보호 테스트 | 비즈니스 규칙 회귀 방지 | 중 |
| 6~8 | 페르소나 / 모델 라우팅 / Agent Teams | 확장성 | 대 |

> Phase 1~2를 먼저 적용하고, Phase 3~4는 팀 규모 확대 시 검토
