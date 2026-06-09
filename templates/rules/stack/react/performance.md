# React — 성능
- `useCallback`, `useMemo`를 무조건 감싸지 않는다 — `React.memo` 자식이나 의존성 배열에 필요할 때만 사용.
- `React.lazy()`와 `Suspense`로 라우트/무거운 컴포넌트를 코드 스플리팅한다.
