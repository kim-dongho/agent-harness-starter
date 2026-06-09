# Next.js — 코드 품질
- 서버 전용 코드(DB, 시크릿)를 Client Component에서 import하지 않는다 — `server-only` 패키지로 빌드 타임에 방지.
- 민감한 환경변수는 `NEXT_PUBLIC_` prefix 없이 서버 코드에서만 접근한다.

## References
- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/guides/caching
