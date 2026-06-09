# C# (.NET) — 구조 & 아키텍처
- Minimal API 또는 Controller 기반 라우팅을 일관되게 사용한다.
- 의존성 주입(DI)은 내장 `IServiceCollection`을 사용하고, 생성자 주입을 기본으로 한다.
- 미들웨어 파이프라인 순서: 예외 처리 -> CORS -> 인증 -> 인가 -> 라우팅.
- 설정은 `appsettings.json` + 환경변수 + `IOptions<T>` 패턴을 사용한다.
- 프로젝트 구조는 레이어별 또는 기능별로 분리한다.

## 프로젝트 패턴
- `Program.cs`에서 서비스 등록과 미들웨어 설정을 수행한다.
- Repository 패턴으로 데이터 접근을 추상화한다.
- `MediatR`로 CQRS 패턴을 구현할 수 있다.
- `FluentValidation`으로 요청 검증을 처리한다.
