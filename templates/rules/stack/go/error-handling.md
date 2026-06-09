# Go — 에러 처리
- 에러는 반드시 즉시 처리한다. `_`로 무시하지 않는다.
- `fmt.Errorf("context: %w", err)`로 에러를 감싸서 체인을 유지한다. `errors.Is()`/`errors.As()`로 검사 가능.
- 포인터 역참조 전에 nil 체크를 수행한다.
- `panic()`을 비즈니스 로직에서 사용하지 않는다 — error를 반환한다. `panic`은 불변 위반에만 사용한다.
- `sync.Mutex`를 값으로 복사하지 않는다 — 포인터로 전달한다.
- SQL 쿼리에 `fmt.Sprintf`로 값을 삽입하지 않는다 — prepared statement 또는 플레이스홀더를 사용한다.
