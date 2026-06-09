---
description: 코드 네이밍 컨벤션을 적용한다. 변수, 함수, 파일, 컴포넌트 이름 관련 작업에 자동 적용.
---

## 네이밍 컨벤션

### 일반 원칙

- 이름만으로 의도가 드러나야 한다 — `data` X, `activeUsers` O
- 축약어를 피한다 — `btn` X, `button` O (널리 통용되는 것 제외: `id`, `url`, `api`)
- 맥락 중복을 피한다 — `User.userName` X, `User.name` O

### boolean

- `is`, `has`, `can`, `should` 접두사 사용
- `isLoading`, `hasError`, `canSubmit`, `shouldRefresh`

### 함수

- 동사로 시작한다 — `getUser`, `createOrder`, `validateEmail`
- 이벤트 핸들러는 `handle` + 이벤트명 — `handleClick`, `handleSubmit`
- 반환 타입이 boolean이면 `is/has/can` — `isValid()`, `hasPermission()`

### 상수

- `UPPER_SNAKE_CASE` — `MAX_RETRY_COUNT`, `API_BASE_URL`
- 매직 넘버를 상수로 추출한다 — `3` X, `MAX_RETRY_COUNT = 3` O

### 파일

- 프로젝트 네이밍 규칙({{NAMING_CONVENTION}})을 따른다
- 테스트 파일: `*.test.ts` 또는 `*.spec.ts`
- 타입 파일: `*.types.ts` 또는 `types.ts`

### 금지 패턴

- `temp`, `data`, `info`, `item`, `stuff` 같은 모호한 이름
- `handleClick2`, `processDataNew` 같은 번호/수식어 붙이기
- 한 글자 변수 (`i`, `j` 루프 인덱스 제외)
