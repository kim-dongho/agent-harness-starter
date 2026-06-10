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

### 타입별 생성 규칙

`harness.config.json`의 architecture.style과 rules.fileNaming을 참조한다.

| 타입 | 디렉토리 | 네이밍 | 생성 파일 |
|------|----------|--------|----------|
| component | `src/components/` | PascalCase | `{Name}/{Name}.tsx` + `index.ts` |
| hook | `src/hooks/` | camelCase | `use{Name}.ts` |
| util | `src/utils/` | camelCase | `{name}.ts` |
| service | `src/services/` | camelCase | `{name}.ts` |
| model | `src/models/` | camelCase | `{name}.ts` |

### 아키텍처별 디렉토리

| 아키텍처 | component | hook | service |
|---------|-----------|------|---------|
| FSD | `src/features/{feature}/ui/` | `src/features/{feature}/model/` | `src/features/{feature}/api/` |
| Clean | `src/presentation/components/` | `src/presentation/hooks/` | `src/application/services/` |
| Modular | `src/modules/{module}/components/` | `src/modules/{module}/hooks/` | `src/modules/{module}/services/` |
| Flat | `src/components/` | `src/hooks/` | `src/services/` |

### 생성 후 자동 처리

1. **barrel export** — 디렉토리의 `index.ts`에 자동 추가
2. **네이밍 검증** — `harness.config.json`의 fileNaming 규칙 적용
3. **생성 후 Edit** — 생성된 파일을 수정하여 구현 코드를 작성한다

### 주의사항

- **파일을 직접 생성(Write)하지 않는다** — 반드시 `/generate`를 통해 생성한다
- scaffold-guard hook이 직접 생성을 차단한다
- 생성 후 Edit으로 구현 코드를 추가하는 것은 허용된다
