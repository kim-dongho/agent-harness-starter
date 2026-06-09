# TypeScript — 에러 처리
- `!` non-null assertion 지양 — optional chaining(`?.`)과 nullish coalescing(`??`)을 사용한다.
- `catch` 블록에서 에러는 `unknown`으로 처리 — `instanceof`로 좁힌 후 접근한다.
- `@ts-ignore` 대신 `@ts-expect-error`를 사용하고 이유를 주석으로 남긴다.
- 에러 처리에 `Result<T, E>` 패턴을 고려한다 — throw보다 타입 안전한 명시적 에러 처리.
- 커스텀 에러 클래스를 정의한다 — `Error`나 문자열을 직접 throw하지 않는다.
- 빈 `catch` 블록을 남기지 않는다 — 에러를 로깅하거나 명시적으로 무시 사유를 주석으로 남긴다.
