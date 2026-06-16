---
description: 린트 + 타입 체크. `/lint` 로 호출하면 lint와 type-check를 실행하고 에러를 수정한다.
---

## /lint 워크플로우

`/lint` 로 호출한다.

### 1. Lint

```bash
{{LINT_COMMAND}}
```

### 2. Type-check

```bash
npx tsc --noEmit
```

### 3. 에러 수정

에러가 있으면 수정한다. 수정 후 다시 lint + type-check를 실행하여 통과를 확인한다.

최대 3회 반복. 3회 실패 시 사용자에게 보고하고 중단한다.
