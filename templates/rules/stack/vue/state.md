# Vue — 상태관리
- `ref()`는 원시값, `reactive()`는 객체에 사용한다. `reactive()` 객체를 구조분해하면 반응성이 깨진다 — `toRefs()` 사용.
- 파생 값은 `computed()`로 처리한다. `watch()`는 사이드이펙트 전용.
- `reactive()` 객체 전체를 재할당하지 않는다 — `Object.assign(state, newObj)`로 속성을 갱신한다.
- 컴포넌트당 watcher 2~3개 이상이면 computed나 composable로 구조를 재검토한다.
- `onUnmounted()`에서 이벤트 리스너, 구독, 타이머를 반드시 정리한다.
- Pinia store에서 state를 직접 변경하지 않는다 — action을 통해 변경한다.
