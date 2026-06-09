# Svelte — 상태관리
- `$state`는 UI를 구동하는 값에만 사용한다. 렌더링에 무관한 값은 일반 변수.
- 파생 값은 `$derived`로 처리한다. `$effect`는 DOM 조작, 로깅 등 사이드이펙트 전용.
- SSR 환경에서 모듈 레벨 `$state`는 요청 간 공유된다 — `setContext()`/`getContext()` 사용.
- store 값을 컴포넌트 로컬 변수에 복사해서 사용하지 않는다 — `$store` 구문으로 직접 구독한다.
