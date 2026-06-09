---
description: 이슈 기반 작업 시작. `/start ISSUE-123` 으로 호출하면 이슈 조회 → 브랜치 생성 → 분석 → 구현 계획까지 자동 수행.
---

## /start 워크플로우

`/start <이슈번호>` 로 호출한다. 아래 단계를 순서대로 수행한다.

### 1. 이슈 조회

{{ISSUE_FETCH_COMMAND}}

이슈 제목, 설명, 라벨/타입을 확인한다.

### 2. 이슈 상태 변경

{{ISSUE_STATUS_COMMAND}}

### 3. 브랜치 생성

이슈 타입에 따라 브랜치 prefix를 결정한다:

| 이슈 타입 | prefix |
|----------|--------|
| Bug / Bugfix | `fix/` |
| Feature / Story | `feature/` |
| Chore / Task | `chore/` |
| Refactor | `refactor/` |

```bash
git checkout -b <prefix><이슈번호>-<간략한-설명>
```

### 4. 변경 대상 분석

이슈 내용을 기반으로 변경이 필요한 파일/모듈을 탐색한다:
- 키워드로 코드베이스를 검색한다
- 관련 파일 목록을 사용자에게 제시한다

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
