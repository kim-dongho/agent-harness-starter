---
description: 브랜치 생성. `/branch <이슈번호>` 로 호출하면 이슈 타입에 맞는 prefix로 브랜치를 생성한다.
---

## /branch 워크플로우

`/branch <이슈번호>` 로 호출한다. 이슈번호 없이 `/branch <설명>`으로도 사용 가능하다.

### 1. 이슈 타입 확인

이슈번호가 있으면 이슈를 조회하여 타입을 확인한다.

| 이슈 타입 | prefix |
|----------|--------|
| Bug / Bugfix | `fix/` |
| Feature / Story / Task | `feature/` |
| Chore (설정/CI/배포) | `chore/` |
| Refactor | `refactor/` |

> "Task"는 대부분 구현이므로 `feature/`를 사용한다. 이슈 타입을 확인할 수 없으면 `feature/`를 기본값으로 사용한다.

### 2. 브랜치 생성

이슈번호가 있으면 번호만으로, 없으면 설명으로 브랜치를 생성한다:

```bash
# 이슈번호 있을 때
git checkout -b <prefix><이슈번호>
# 예: feature/VM2026-82

# 이슈번호 없을 때
git checkout -b <prefix><간략한-설명>
# 예: feature/login-page-ui
```
