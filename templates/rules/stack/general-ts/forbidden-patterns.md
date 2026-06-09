# TypeScript — 금지 패턴

- `any` 타입을 사용하지 않는다 — `unknown`으로 받고 타입 가드로 좁힌다.
- `!` non-null assertion을 사용하지 않는다 — optional chaining 또는 null 체크를 사용한다.
- `enum`을 사용하지 않는다 — `as const` 객체 + 유니온 타입으로 대체한다.
- `@ts-ignore`/`@ts-expect-error`를 사용하지 않는다 — 타입을 올바르게 수정한다.
- 빈 catch 블록을 남기지 않는다 — 에러를 로깅하거나 명시적으로 무시 사유를 주석으로 남긴다.
