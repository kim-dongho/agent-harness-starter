# React — 컴포넌트
- Hooks는 컴포넌트 최상위에서만 호출한다. 조건문, 반복문, 중첩 함수 안에서 호출 금지.
- 컴포넌트는 단일 책임. 데이터 fetching, 비즈니스 로직, UI를 분리한다.
- 리스트의 `key`에 배열 index 사용 금지 — 안정적인 고유 ID를 사용한다.
- 폼은 controlled component를 기본으로 하고, state는 사용되는 곳에 최대한 가까이 둔다.
- 컴포넌트는 300줄 이하로 유지한다. 넘으면 분리를 검토한다.
- `ErrorBoundary`로 렌더링 에러를 잡고 fallback UI를 보여준다.
- `style={{}}` 인라인 스타일 사용 금지 — CSS Module, Tailwind, styled-components 등을 사용한다.
- `document.querySelector` 등 직접 DOM 조작 금지 — `useRef`를 사용한다.
- props를 5개 이상 전달하지 않는다 — 객체로 묶거나 컴포넌트를 분리한다.
