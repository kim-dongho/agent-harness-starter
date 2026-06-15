---
description: 파일 생성. `/generate <type> <name>` 으로 호출하면 아키텍처에 맞는 위치에 파일을 생성한다.
---

## /generate 워크플로우

`/generate <type> <name>` 으로 호출한다. 아키텍처 규칙에 맞게 파일을 생성한다.

### 사용법

```
/generate component UserProfile
/generate hook useAuth
/generate util formatDate
/generate service userService
/generate model User
```

### barrel export 규칙

- **FSD**: slice별 1개만 (`features/auth/index.ts`). 레이어 전체 barrel(`features/index.ts`)이나 segment barrel(`features/auth/ui/index.ts`)은 만들지 않는다.
- **기타 아키텍처**: 디렉토리별 1개 (`components/index.ts`, `hooks/index.ts`)

불필요한 index.ts를 만들지 않는다. 실제로 re-export가 필요한 곳에만 생성한다.

### 주의사항

- **파일을 직접 생성(Write)하지 않는다** — 반드시 `/generate`를 통해 생성한다
- scaffold-guard hook이 직접 생성을 차단하고, 파일 네이밍 규칙도 자동 검증한다
- 생성 후 Edit으로 구현 코드를 추가하는 것은 허용된다
