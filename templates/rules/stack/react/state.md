# React — 상태관리
- state를 직접 mutate하지 않는다 — 항상 새 객체/배열을 반환한다.
- 서버 상태는 `useState`가 아닌 서버 상태 관리 도구(react-query, SWR 등) 사용.
- `useEffect`는 실제 사이드이펙트(구독, DOM 조작, 타이머)에만 사용한다. 파생 값은 `useMemo`나 렌더 중 계산.
- `useEffect`에서 구독/이벤트리스너/타이머 설정 시 반드시 cleanup 함수를 반환한다.
