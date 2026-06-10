---
description: 설계. `/design` 으로 호출하면 인터페이스, 목업, API 계약을 정의한다.
---

## /design 워크플로우

`/design` 으로 호출한다. 구현 전에 인터페이스와 계약을 먼저 정의한다.

### 전제 조건

- `docs/plan.json`이 존재해야 한다
- `domain-glossary.json`이 존재해야 한다
- 없으면 `/plan` → `/analyze` 순서를 안내한다

### 1. 인터페이스 정의

기능 스펙을 기반으로 TypeScript 인터페이스를 정의한다:

```typescript
// src/types/{feature}.ts
export interface CreateUserInput {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface CreateUserOutput {
  id: string;
  createdAt: Date;
}
```

### 2. API 계약 (Backend인 경우)

REST/GraphQL 엔드포인트를 정의한다:

```markdown
## POST /api/users
- Request: CreateUserInput
- Response: CreateUserOutput
- Errors: 400 (validation), 409 (duplicate email)
```

### 3. 컴포넌트 구조 (Frontend인 경우)

Figma 링크가 있으면 `get_metadata` + `get_screenshot`으로 구조를 파악하고 컴포넌트 트리를 정의한다:

```
UserPage
├── UserForm (props: onSubmit)
│   ├── EmailInput
│   └── RoleSelect
└── UserList (props: users)
    └── UserCard (props: user)
```

### 4. 산출물

- `src/types/{feature}.ts` — 인터페이스 정의
- `docs/designs/{feature}.md` — 설계 문서 (API 계약, 컴포넌트 구조)

### 5. 다음 단계

설계 후 → `/generate` 로 파일을 생성한다. **직접 파일을 만들지 않는다.**
