# Kotlin — 구조 & 아키텍처
- 코루틴(`suspend fun`, `CoroutineScope`)으로 비동기 처리를 수행하고, 콜백을 피한다.
- Ktor 라우팅은 `routing {}` DSL로 정의하고, 기능별로 라우트 파일을 분리한다.
- 의존성 주입은 Koin 또는 Ktor의 `DI` 플러그인을 사용한다.
- 설정은 `application.conf`(HOCON) 또는 환경변수 기반으로 관리한다.
- 패키지 구조는 기능(feature) 기반으로 분리한다 (`com.example.user`, `com.example.auth`).

## Ktor 패턴
- 플러그인(Plugin)으로 공통 기능(로깅, 인증, CORS)을 캡슐화한다.
- `ContentNegotiation` 플러그인으로 JSON 직렬화를 처리한다 (kotlinx.serialization).
- `StatusPages` 플러그인으로 예외를 HTTP 응답으로 변환한다.
- 요청 검증은 `RequestValidation` 플러그인을 사용한다.
