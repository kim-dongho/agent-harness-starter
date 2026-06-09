# CosmWasm — 기본 구조
- 컨트랙트는 `instantiate`, `execute`, `query` 세 가지 진입점으로 구성한다.
- `#[entry_point]` 매크로로 진입점을 정의한다.
- 메시지 타입(`InstantiateMsg`, `ExecuteMsg`, `QueryMsg`)을 명확히 분리한다.
- `cosmwasm_std`의 타입을 활용한다 — `Uint128`, `Addr`, `Coin` 등.
