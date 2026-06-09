# Angular — 상태관리
- 동기 상태는 Signal, 복잡한 비동기 스트림(HTTP, WebSocket, debounce)은 RxJS. `toSignal()`/`toObservable()`로 브릿지.
- 파생 값은 `computed()`로. `effect()`는 사이드이펙트(로깅, 분석, DOM)에만 사용.
- RxJS flattening 연산자를 용도에 맞게 선택: `switchMap`(검색), `concatMap`(순차), `exhaustMap`(중복 방지), `mergeMap`(병렬).
- `takeUntilDestroyed()` 또는 `async` 파이프로 구독 해제를 보장한다.
- 복잡한 폼은 타입 있는 Reactive Forms를 사용한다.
