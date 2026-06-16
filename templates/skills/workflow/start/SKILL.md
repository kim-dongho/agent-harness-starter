---
description: 이슈 기반 작업 시작. `/start ISSUE-123` 으로 호출하면 이슈 조회 → 브랜치 생성 → 분석 → 구현 계획까지 자동 수행.
---

## /start 워크플로우

`/start <이슈번호>` 로 호출한다. 아래 단계를 순서대로 수행한다.

### 1. 이슈 조회 (`/fetch-issue`)

{{ISSUE_FETCH_COMMAND}}

이슈 제목, 설명, 라벨/타입을 확인한다.

#### 티켓 정보 검증

아래 항목이 이슈에 포함되어 있는지 확인한다. 부족하면 사용자에게 채워달라고 요청한 후 진행한다.

**공통 필수:**
- [ ] 이슈 타입 (Bug / Feature / Chore / Refactor)
- [ ] 요약 — 무엇을 해야 하는지 한 줄 설명
- [ ] 상세 설명 — 배경, 이유, 기대 결과
- [ ] 수락 기준 (Acceptance Criteria) — 완료 조건 목록

**Frontend 추가:**
- [ ] Figma 링크 (UI 변경이 있는 경우)
- [ ] 대상 페이지/컴포넌트
- [ ] 반응형 요구사항 (모바일/태블릿/데스크탑)

**Backend 추가:**
- [ ] API 스펙 또는 엔드포인트 정의
- [ ] 요청/응답 형식 (JSON 예시)
- [ ] DB 스키마 변경 여부

**Blockchain 추가:**
- [ ] 대상 컨트랙트/프로그램
- [ ] 온체인 상태 변경 범위
- [ ] 보안 고려사항 (권한, 자금 이동 등)

**Bug 전용:**
- [ ] 재현 절차 (Steps to Reproduce)
- [ ] 기대 동작 vs 실제 동작
- [ ] 환경 정보 (브라우저, OS, 네트워크 등)

### 2. 이슈 상태 변경

이슈의 현재 상태를 먼저 확인한다. **"해야할 일(To Do)" 상태인 경우에만** "진행 중(In Progress)"으로 변경한다.
이미 "진행 중", "완료", "리뷰 중" 등 다른 상태이면 상태를 변경하지 않는다.

{{ISSUE_STATUS_COMMAND}}

### 3. 브랜치 생성 (`/branch`)

이슈 타입에 따라 브랜치 prefix를 결정한다:

| 이슈 타입 | prefix |
|----------|--------|
| Bug / Bugfix | `fix/` |
| Feature / Story | `feature/` |
| Chore / Task | `chore/` |
| Refactor | `refactor/` |

이슈번호가 있으면 번호만으로, 없으면 설명으로 브랜치를 생성한다:

```bash
# 이슈번호 있을 때
git checkout -b <prefix><이슈번호>
# 예: feature/VM2026-82

# 이슈번호 없을 때
git checkout -b <prefix><간략한-설명>
# 예: feature/login-page-ui
```

### 4. 변경 대상 분석

이슈 내용을 기반으로 변경이 필요한 파일/모듈을 탐색한다:
- 키워드로 코드베이스를 검색한다
- 관련 파일 목록을 사용자에게 제시한다

**스택별 추가 분석:**

| 스택 | 분석 항목 |
|------|----------|
| Frontend | Figma 링크가 있으면 `/figma`로 디자인 분석 → 컴포넌트 구조 도출 |
| Backend | Swagger/OpenAPI 스펙, DB 스키마(Prisma/migration), 기존 유사 엔드포인트 참고 |
| Blockchain | 기존 컨트랙트 인터페이스, 보안 체크리스트(SWC/Sealevel 등) 자동 로드 |

#### Figma 분석

Figma 링크가 있으면 `/figma` 스킬의 토큰 절약 전략을 따른다:
1. `get_metadata` + `get_screenshot`으로 구조 파악 (이 단계)
2. `get_design_context`는 구현 단계에서 최소 단위 노드에만 호출

### 5. 복잡도 판단

| 복잡도 | 기준 | 접근 |
|--------|------|------|
| LOW | 파일 1~2개, 단순 수정 | READ → IMPLEMENT → VERIFY |
| MEDIUM | 파일 3~5개, 로직 변경 | READ → ANALYZE → IMPLEMENT → VERIFY |
| HIGH | 파일 6개+ 또는 비즈니스 로직 변경 | READ → ANALYZE → PLAN(확인) → IMPLEMENT → VERIFY |

### 6. 구현 계획 제시

복잡도 판단 결과와 함께 단계별 구현 계획을 사용자에게 제시한다.
HIGH인 경우 반드시 사용자 확인을 받은 후 진행한다.

```
## 구현 계획
- 복잡도: MEDIUM
- 변경 파일: 3개
1. [파일] — [변경 내용] → verify: [확인 방법]
2. [파일] — [변경 내용] → verify: [확인 방법]
3. [파일] — [변경 내용] → verify: [확인 방법]
```
