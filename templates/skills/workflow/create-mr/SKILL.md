---
description: MR 생성. `/create-mr` 으로 호출하면 현재 브랜치를 push하고 GitLab MR을 생성한다.
---

## /create-mr 워크플로우

`/create-mr` 으로 호출한다. 커밋되지 않은 변경이 있으면 먼저 `/commit`을 안내한다.

### 1. 상태 확인

```bash
git status
```

커밋되지 않은 변경이 있으면 "먼저 `/commit`으로 커밋하세요"를 안내하고 종료한다.

### 2. Push

```bash
git push -u origin $(git branch --show-current)
```

### 3. MR 생성

{{PR_CREATE_COMMAND}}

- MR 제목: 브랜치의 커밋 내용 기반
- MR 본문: 변경 요약 포함

### 4. 결과

MR URL을 사용자에게 제시한다.
