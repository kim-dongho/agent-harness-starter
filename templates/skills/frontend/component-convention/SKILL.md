---
description: 프론트엔드 컴포넌트 작성 컨벤션을 적용한다. 컴포넌트 파일 생성/수정 시 자동 적용.
paths:
  - "src/components/**"
  - "src/app/**"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
---

## 컴포넌트 컨벤션

### 구조

- 컴포넌트당 하나의 파일
- 300줄 넘으면 분리를 검토한다
- 파일 내 순서: 타입 → 훅/로직 → 렌더링 → export

### Props

- props 타입을 명시한다 (interface 또는 type)
- optional props에 기본값을 설정한다
- props가 5개 넘으면 객체로 묶는다
- children은 명시적으로 타이핑한다

### 조건부 렌더링

- 단순 조건: `&&` 또는 삼항 연산자
- 복잡한 조건: early return 또는 별도 컴포넌트로 추출
- `{count && <div>...</div>}` — count가 0이면 `0`이 렌더됨. `{count > 0 && ...}` 사용

### 이벤트 핸들러

- `handle` + 동작 — `handleSubmit`, `handleDelete`
- props로 전달 시 `on` + 동작 — `onSubmit`, `onDelete`
- 인라인 핸들러는 1줄 이하일 때만

### 스타일

- 인라인 스타일 지양 — CSS Module, Tailwind, styled-components 등 사용
- 레이아웃/스타일 관심사를 컴포넌트 로직과 분리한다

### 금지 패턴

- 컴포넌트 안에서 컴포넌트 정의하지 않는다 (매 렌더마다 재생성)
- `useEffect`로 파생 값을 계산하지 않는다 — `useMemo` 또는 렌더 중 계산
- `index`를 리스트 `key`로 사용하지 않는다
