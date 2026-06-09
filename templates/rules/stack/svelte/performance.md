# Svelte — 성능
- 전체 교체만 하는 값은 `$state.raw()`로 프록시 오버헤드를 줄인다.
- SvelteKit에서 데이터는 `+page.server.ts` load 함수에서 fetch한다. `onMount`에서 fetch하지 않는다.
- API 엔드포인트는 `+server.ts`, 페이지 데이터+폼은 `+page.server.ts`의 actions를 사용한다.
