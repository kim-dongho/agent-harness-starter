# Java (Spring Boot) — 에러 처리
- 예외는 `@ControllerAdvice` + `@ExceptionHandler`로 전역 처리. 도메인 예외는 커스텀 클래스로 정의.
- API 응답은 `ResponseEntity<ApiResponse<T>>` 표준 래퍼로 통일한다.
- 존재 확인에 `findById().orElseThrow()`를 사용한다. `isPresent()` + `get()` 패턴 지양.
- `NullPointerException`을 catch하지 않는다 — null 체크 또는 `Optional`로 방어한다.
- `Exception`/`Throwable`을 광범위하게 catch하지 않는다 — 구체적인 예외 타입을 사용한다.
- SQL 쿼리에 문자열 연결로 값을 삽입하지 않는다 — `PreparedStatement` 또는 JPA 파라미터를 사용한다.
- `System.out.println`으로 로깅하지 않는다 — SLF4J/Logback 로거를 사용한다.
