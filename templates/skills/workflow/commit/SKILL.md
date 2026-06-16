---
description: 커밋. `/commit` 으로 호출하면 staged 파일을 기반으로 프로젝트 컨벤션에 맞게 커밋한다.
---

## /commit 워크플로우

`/commit` 으로 호출한다.

### 1. staged 파일 확인

```bash
git diff --staged --stat
```

staged 파일이 없으면 "커밋할 staged 파일이 없습니다. 먼저 `git add`를 실행해주세요." 메시지 출력 후 종료한다.

`.env`, credentials 등 민감 파일이 staged에 포함되면 경고 후 중단한다.

### 2. 이슈 번호 추출

```bash
git branch --show-current
```

브랜치명에서 이슈 번호를 추출한다:
- `feature/VM2026-82` → `VM2026-82`
- `fix/VM2026-325-some-desc` → `VM2026-325`
- `feature/login-page-ui` → 이슈 번호 없음

### 3. 커밋 메시지 작성

- `git diff --staged`로 변경 내용을 분석한다
- 프로젝트에 `commitlint.config.js`가 있으면 해당 규칙을 따른다
- 없으면 Conventional Commits (`type(scope): message`) 형식을 사용한다
- 이슈 번호가 있으면 메시지에 포함한다

### 4. 사용자 확인

커밋 메시지 초안을 제시하고 사용자 확인 후 커밋한다.

### 주의사항

- `git add`는 사용자가 직접 실행 — 이 스킬에서 `git add`를 실행하지 않는다
- push는 하지 않는다 (push가 필요하면 `/create-mr` 사용)
