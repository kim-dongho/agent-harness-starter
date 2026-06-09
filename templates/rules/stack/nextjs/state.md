# Next.js — 상태관리
- 공유/북마크 가능한 상태는 `useState` 대신 URL 상태(`nuqs` 등)로 관리한다.
- 데이터 fetching은 필요한 Server Component에서 직접 수행한다 — Next.js가 동일 fetch를 자동 중복 제거.
- mutation/폼 제출은 Server Actions(`"use server"`)를 사용한다. Route Handler는 공개 API, webhook용.
