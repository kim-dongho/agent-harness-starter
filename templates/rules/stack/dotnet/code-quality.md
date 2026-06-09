# C# (.NET) — 코드 품질
- `async`/`await`를 일관되게 사용하고, `.Result`나 `.Wait()`로 동기 블록을 만들지 않는다.
- LINQ를 활용하되 쿼리 구문보다 메서드 구문을 선호한다.
- Nullable Reference Type(`#nullable enable`)을 활성화하고, `null` 검사를 명시적으로 수행한다.
- `record` 타입으로 불변 DTO를 정의한다.
- `IDisposable`/`IAsyncDisposable` 패턴을 준수하고, `using` 선언을 사용한다.

## 컨벤션
- 네이밍: 클래스/메서드는 `PascalCase`, 지역변수/파라미터는 `camelCase`, 인터페이스는 `I` 접두사.
- async 메서드명은 `Async` 접미사를 붙인다 (예: `GetUserAsync`).
- `var`는 타입이 명확할 때만 사용한다.
- `dotnet format`과 `.editorconfig`로 코드 스타일을 통일한다.
- `CancellationToken`을 async 메서드에 전파한다.
- `async void` 메서드를 사용하지 않는다 — `async Task`를 반환한다. 이벤트 핸들러만 예외.
- `catch (Exception)` 으로 모든 예외를 잡지 않는다 — 구체적인 예외 타입을 사용한다.
- SQL 쿼리에 문자열 보간으로 값을 삽입하지 않는다 — EF Core 파라미터 또는 `SqlParameter`를 사용한다.
- `Console.WriteLine`으로 로깅하지 않는다 — `ILogger<T>`를 사용한다.
- `static` 필드에 상태를 저장하지 않는다 — DI 컨테이너의 생명주기를 사용한다.
