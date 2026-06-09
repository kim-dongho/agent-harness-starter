# Rust — 테스트
- `cargo test`로 모든 테스트를 실행한다. 유닛 테스트는 같은 파일의 `#[cfg(test)]` 모듈에 작성한다.
- 통합 테스트는 `tests/` 디렉토리에 배치한다.
- `#[should_panic]`보다 `Result`를 반환하는 테스트를 선호한다.
- mock은 `mockall` 크레이트를 사용하고, trait 기반으로 의존성을 주입한다.
- `proptest` 또는 `quickcheck`로 속성 기반 테스트를 작성한다.
- 픽스처 데이터는 `rstest`의 `#[fixture]`를 활용한다.

## CI 통합
- `cargo test --all-features`로 모든 피처 조합을 테스트한다.
- `cargo clippy -- -D warnings`를 CI에 포함한다.
- `cargo fmt --check`로 포매팅을 검증한다.
