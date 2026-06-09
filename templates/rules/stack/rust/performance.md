# Rust — 성능
- 제로 코스트 추상화를 활용한다 — 이터레이터, 제네릭, trait 디스패치.
- 비동기 코드는 `tokio` 런타임을 사용하고, `block_on`을 async 컨텍스트 안에서 호출하지 않는다.
- `String` 대신 `&str`, `Vec<T>` 대신 `&[T]`를 파라미터로 받아 불필요한 할당을 줄인다.
- `Arc`와 `Mutex`는 필요할 때만 사용하고, 가능하면 소유권 이전이나 채널을 사용한다.
- 핫 패스에서 힙 할당을 최소화한다 — `SmallVec`, `Cow`, 스택 기반 버퍼를 고려한다.
- `cargo clippy`를 CI에서 필수로 실행하고, 경고를 에러로 처리한다.

## 비동기 패턴
- CPU 바운드 작업은 `tokio::task::spawn_blocking`을 사용한다.
- `async fn`의 반환 타입이 커지면 `Box::pin`을 고려한다.
- 동시 작업은 `tokio::join!` 또는 `FuturesUnordered`를 사용한다.
