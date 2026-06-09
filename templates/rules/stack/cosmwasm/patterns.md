# CosmWasm — 패턴
- `cw2`로 컨트랙트 버전 정보를 저장한다 (마이그레이션 호환성).
- `cw-ownable` 또는 `cw-controllers`로 권한 관리를 표준화한다.
- 마이그레이션 시 `#[entry_point] migrate()`를 구현하고 스토리지 스키마 변경을 처리한다.
