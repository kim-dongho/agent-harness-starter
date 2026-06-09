# Next.js — 성능
- `fetch()`에 `{ next: { tags: ['tag'] } }` 캐시 태깅 + `revalidateTag()`로 온디맨드 무효화.
- `cache: 'no-store'`는 진짜 요청마다 달라지는 데이터에만 사용. 그 외에는 `revalidate` 사용.
- non-fetch 데이터 소스에 `React.cache()`를 사용하여 렌더 패스 내 중복 호출을 제거한다.
- `next/image`를 사용한다 — WebP 포맷, 명시적 사이즈, lazy loading으로 LCP를 최적화.
- SEO는 `generateMetadata()` 또는 `metadata` export를 사용한다.
