# Vue — 성능
- 큰 데이터 구조에는 `shallowRef()`, `shallowReactive()`로 불필요한 깊은 추적을 피한다.
- `v-for`에 안정적인 고유 `key`를 사용한다. index 사용 금지.
- 빈번한 토글은 `v-show`, 드물게 변하는 조건은 `v-if`를 사용한다.
- 거의 변하지 않는 리스트/서브트리에 `v-memo`로 가상 DOM diffing을 건너뛴다.
