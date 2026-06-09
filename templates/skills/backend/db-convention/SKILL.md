---
description: 데이터베이스 쿼리 및 스키마 설계 컨벤션을 적용한다. DB 관련 코드 작성 시 자동 적용.
paths:
  - "src/repositories/**"
  - "src/models/**"
  - "src/entities/**"
  - "internal/repository/**"
  - "app/models/**"
  - "prisma/**"
  - "drizzle/**"
---

## DB 컨벤션

### 스키마 네이밍

- 테이블: 복수형 snake_case — `users`, `order_items`
- 컬럼: snake_case — `created_at`, `user_id`
- 인덱스: `idx_{table}_{columns}` — `idx_users_email`
- FK: `fk_{table}_{ref_table}` — `fk_orders_users`

### 쿼리 패턴

- N+1 쿼리를 피한다 — JOIN, eager loading, batch query 사용
- `SELECT *`를 피한다 — 필요한 컬럼만 명시
- 목록 조회에 항상 페이지네이션을 적용한다
- 큰 테이블에 인덱스 없는 WHERE를 피한다

### 트랜잭션

- 함께 성공/실패해야 하는 작업은 트랜잭션으로 감싼다
- 트랜잭션은 최대한 짧게 유지한다
- 트랜잭션 안에서 외부 API를 호출하지 않는다

### 마이그레이션

- 마이그레이션 파일은 순서가 보장되어야 한다 (타임스탬프 prefix)
- 마이그레이션은 되돌릴 수 있어야 한다 (up + down)
- 프로덕션에서 auto-migrate 사용 금지 — 명시적 마이그레이션만

### 보안

- SQL injection 방지 — 항상 parameterized query 사용
- 민감 데이터 (비밀번호, 토큰) 는 해시/암호화하여 저장
- 개인정보는 로그에 남기지 않는다
