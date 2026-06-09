# Rust — 구조 & 아키텍처
- 소유권(ownership)과 빌림(borrowing) 규칙을 준수하고, 불필요한 `clone()`을 피한다.
- 에러 처리는 `Result<T, E>`와 `Option<T>`을 사용하고, `unwrap()`은 프로덕션 코드에서 사용하지 않는다.
- `thiserror`로 도메인 에러 타입을 정의하고, `anyhow`는 애플리케이션 최상위에서만 사용한다.
- trait을 인터페이스로 활용하고, trait 객체(`dyn Trait`)보다 제네릭을 우선 사용한다.
- 모듈 구조는 `mod.rs` 대신 파일명 기반 모듈(`module_name.rs`)을 사용한다.
- `pub` 가시성은 최소한으로 노출하고, `pub(crate)`를 적극 활용한다.

## 프로젝트 구조
- `src/main.rs`는 진입점만 담당하고, 비즈니스 로직은 `src/lib.rs`나 하위 모듈로 분리한다.
- 설정(config)은 환경변수 기반으로 `dotenvy` + 구조체 파싱을 사용한다.
- 의존성 주입은 trait + 제네릭 또는 `Arc<dyn Trait>`로 구현한다.
- `unsafe` 블록을 정당한 사유 없이 사용하지 않는다 — 사유를 `// SAFETY:` 주석으로 명시한다.
- `String`을 함수 인자로 받지 않는다 — `&str`로 받아 불필요한 할당을 방지한다.
- `Box<dyn Error>`를 라이브러리 코드에서 반환하지 않는다 — 구체적인 에러 타입 또는 `thiserror`를 사용한다.
