---
description: 프론트엔드 코드 작성 시 웹 접근성(WCAG) 패턴을 적용한다. UI 컴포넌트, 폼, 모달 관련 작업에 자동 적용.
paths:
  - "src/components/**"
  - "src/app/**"
  - "src/pages/**"
  - "**/*.tsx"
  - "**/*.jsx"
---

## 접근성 체크리스트

### 시맨틱 HTML
- `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, `<footer>` 등 시맨틱 태그를 사용한다.
- 클릭 가능한 `<div>`, `<span>`에 `role`, `tabindex`, `onKeyDown`을 추가한다.
- 제목 레벨(`h1`~`h6`)은 순서대로 사용한다. 건너뛰지 않는다.

### 인터랙티브 요소
- 모든 인터랙티브 요소에 키보드 접근이 가능해야 한다 (`Tab`, `Enter`, `Space`, `Escape`).
- 커스텀 버튼에 `aria-label` 또는 visible text를 제공한다.
- 모달은 focus trap을 구현한다. `Escape`로 닫을 수 있어야 한다.
- 네이티브 `<dialog>` 사용을 우선 고려한다 — focus trap이 자동 처리됨.

### 폼
- 모든 `<input>`에 `<label>`을 연결한다 (`for`/`id` 또는 wrapping).
- 에러 메시지에 `role="alert"`과 `aria-describedby`를 사용한다.
- submit 실패 시 첫 번째 에러 필드에 focus를 이동한다.
- `aria-invalid="true"`로 잘못된 필드를 표시한다.

### 이미지 & 미디어
- 의미 있는 이미지에 `alt` 텍스트를 제공한다.
- 장식용 이미지에 `alt=""`와 `aria-hidden="true"`를 사용한다.
- 동영상에 자막/캡션을 제공한다.

### 동적 콘텐츠
- 실시간 업데이트에 `aria-live="polite"` (일반) 또는 `aria-live="assertive"` (긴급)를 사용한다.
- 로딩 상태에 `aria-busy="true"`를 사용한다.
- Skip navigation 링크를 제공한다.

### 드래그 대안
- 드래그로만 가능한 동작에 반드시 단일 포인터 대안을 제공한다 (WCAG 2.5.7).
- 정렬 목록: ↑/↓ 버튼 제공, 슬라이더: 입력 필드 제공.

### 색상 & 대비
- 텍스트 대비: 일반 4.5:1, 큰 텍스트 3:1 이상 (WCAG AA).
- 색상만으로 정보를 전달하지 않는다 — 아이콘, 텍스트, 패턴을 병행한다.
