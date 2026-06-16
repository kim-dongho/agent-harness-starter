---
description: Jira 이슈 조회. `/fetch-issue <이슈번호>` 로 호출하면 이슈 제목, 설명, 타입, 라벨을 가져온다.
---

## /fetch-issue 워크플로우

`/fetch-issue <이슈번호>` 로 호출한다.

### 1. 이슈 조회

{{ISSUE_FETCH_COMMAND}}

### 2. 출력

- 이슈 제목
- 이슈 타입 (Bug / Feature / Chore 등)
- 상세 설명
- Figma 링크가 있으면 별도 표시
- 수락 기준 (Acceptance Criteria)이 있으면 체크리스트로 표시
