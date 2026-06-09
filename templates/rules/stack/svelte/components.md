# Svelte — 컴포넌트
- Svelte 5 runes(`$state`, `$derived`, `$effect`, `$props()`)를 사용한다. 레거시 `$:`, `export let` 지양.
- runes(`$state`, `$derived` 등)는 컴파일러 매크로다. import하지 않는다.
- Svelte 5 이벤트 문법(`onclick={handler}`) 사용. 레거시 `on:click` 지양.
- Svelte 5에서 이벤트 수정자(`|preventDefault` 등)가 제거됐다 — 핸들러 함수 내에서 직접 처리.
- 재사용 템플릿은 `{#snippet}` 블록으로 처리한다.
- `{#each}` 블록에 반드시 안정적 key를 지정한다 — `{#each items as item (item.id)}`.
- 진입/퇴장 애니메이션은 내장 `transition:`, `in:`, `out:` 디렉티브를 사용한다.
- `{@html ...}`에 사용자 입력을 직접 전달하지 않는다 — XSS 위험. 반드시 새니타이즈한다.
