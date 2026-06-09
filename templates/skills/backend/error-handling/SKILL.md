---
description: 백엔드 에러 처리 패턴을 적용한다. try/catch, 에러 응답, 로깅 관련 작업에 자동 적용.
paths:
  - "src/**"
  - "internal/**"
  - "app/**"
---

## 에러 처리 가이드

### 원칙
- 에러를 삼키지 않는다 — catch 후 반드시 로깅하거나 상위로 전파한다.
- 에러 메시지는 디버깅에 도움이 되어야 한다 — 무엇이 실패했고, 왜, 어떤 맥락에서.
- 내부 에러 상세를 클라이언트에 노출하지 않는다 — 스택 트레이스, DB 쿼리 등.

### 에러 계층
- 커스텀 에러 클래스를 정의한다 — `NotFoundError`, `ValidationError`, `UnauthorizedError`.
- 도메인 에러와 인프라 에러를 구분한다.
- HTTP 상태 코드와 매핑한다 — 400 (검증), 401 (인증), 403 (인가), 404 (미존재), 500 (내부).

### 전역 에러 핸들러
- 프레임워크의 전역 에러 핸들러를 사용한다.
  - Express: `(err, req, res, next)` 미들웨어
  - NestJS: `@Catch()` ExceptionFilter
  - FastAPI: `@app.exception_handler()`
  - Spring: `@ControllerAdvice`
  - Go: 미들웨어에서 recover()

### 로깅
- 구조화된 로그를 사용한다 (JSON 형태).
- 로그에 request ID / trace ID를 포함한다.
- 에러 로그에 스택 트레이스를 포함한다.
- 민감 정보 (패스워드, 토큰, 개인정보)를 로깅하지 않는다.

### 재시도 & 복구
- 외부 서비스 호출에 재시도 로직을 구현한다 — exponential backoff + jitter.
- 실패 시 적절한 fallback 값을 반환하거나 circuit breaker를 적용한다.
- 타임아웃을 반드시 설정한다 — 무한 대기 방지.
