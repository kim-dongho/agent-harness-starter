---
description: REST API 설계 시 일관된 패턴과 베스트 프랙티스를 적용한다. 라우터, 컨트롤러, 엔드포인트 관련 작업에 자동 적용.
paths:
  - "src/api/**"
  - "src/routes/**"
  - "src/controllers/**"
  - "internal/handler/**"
  - "app/routers/**"
---

## API 설계 가이드

### URL 설계
- 리소스 기반 URL을 사용한다 — `/api/users`, `/api/orders/{id}`.
- URL에 동사를 넣지 않는다 — `/api/createUser` X, `POST /api/users` O.
- 복수형 명사를 사용한다 — `/api/user` X, `/api/users` O.
- 중첩은 2단계까지 — `/api/users/{id}/orders` O, `/api/users/{id}/orders/{oid}/items` X.

### HTTP 메서드
- `GET` — 조회 (멱등)
- `POST` — 생성
- `PUT` — 전체 수정 (멱등)
- `PATCH` — 부분 수정
- `DELETE` — 삭제 (멱등)

### 응답 형식
- 일관된 응답 래퍼를 사용한다 — `{ data, error, meta }`.
- 목록 API에 페이지네이션을 포함한다 — `{ data, meta: { page, limit, total } }`.
- 에러 응답에 에러 코드, 메시지, 상세를 포함한다.
- 적절한 HTTP 상태 코드를 사용한다 (200, 201, 400, 401, 403, 404, 409, 422, 500).

### 버전 관리
- URL 경로에 버전을 포함한다 — `/api/v1/users`.
- 또는 헤더로 관리한다 — `Accept: application/vnd.api.v1+json`.

### 입력 검증
- 모든 입력을 시스템 경계에서 검증한다.
- 스키마 기반 검증을 사용한다 — Zod, Joi, Pydantic, Bean Validation.
- 검증 실패 시 422 + 어떤 필드가 왜 실패했는지 상세 반환.

### 인증 & 인가
- 보호된 엔드포인트에 인증을 강제한다.
- 리소스 소유권/역할 기반 인가를 확인한다.
- API 키/토큰을 URL에 노출하지 않는다 — 헤더를 사용한다.
