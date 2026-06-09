# Vue — 컴포넌트
- `<script setup>` 문법을 기본으로 사용한다 — 짧고 TypeScript 추론이 좋다.
- `defineProps()`와 `defineEmits()`에 TypeScript 제네릭을 사용한다.
- 템플릿에서 `.value` 접근하지 않는다 — Vue가 자동 unwrap한다.
- 깊은 prop drilling 대신 `provide`/`inject`를 사용한다.
- 모달/오버레이는 `<Teleport to="body">`로 z-index/overflow 문제를 회피한다.
- 재사용 로직은 `useSomething()` composable로 추출한다.
- `v-if`와 `v-for`를 같은 요소에 사용하지 않는다 — `computed`로 필터링한다.
- `v-html`에 사용자 입력을 직접 바인딩하지 않는다 — XSS 위험.
- `$forceUpdate()` 사용 금지 — 반응형 시스템으로 해결한다.
