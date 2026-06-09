---
description: 커밋 메시지 작성 시 Conventional Commits 규칙을 적용한다. git 커밋 관련 작업에 자동 적용.
---

## Conventional Commits

### 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### type

| type | 설명 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 포맷팅, 세미콜론 등 코드 의미에 영향 없는 변경 |
| `refactor` | 리팩토링 (기능 변경 없음) |
| `perf` | 성능 개선 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, CI, 의존성 등 |

### 규칙

- subject는 50자 이하, 소문자 시작, 마침표 없음
- body는 72자에서 줄바꿈, **왜** 변경했는지 설명
- breaking change는 footer에 `BREAKING CHANGE:` 기재
- scope는 선택사항 — 변경 영역을 명시 (`auth`, `api`, `ui`)

### 예시

```
feat(auth): add OAuth2 login with Google

Add Google OAuth2 provider using next-auth. Includes
callback handling and session management.

Closes #123
```

```
fix(api): handle null response from payment gateway

The gateway returns null instead of error object when
timeout occurs. Added null check before accessing fields.
```
