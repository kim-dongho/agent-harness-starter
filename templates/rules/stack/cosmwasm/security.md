# CosmWasm — CosmWasm 보안 체크리스트

- `info.sender` 검증으로 접근 제어를 구현한다. `deps.api.addr_validate()`로 주소를 검증한다.
- 자금 전송 시 `BankMsg::Send`를 사용하고, 전송 금액을 사전에 검증한다.
- `Deps`(읽기 전용)와 `DepsMut`(읽기/쓰기)를 구분하여 query에서 상태 변경을 방지한다.
- overflow 방지를 위해 `Uint128`의 checked 연산(`checked_add`, `checked_sub`)을 사용한다.

### 접근 제어
- **Privilege escalation** — 관리자 함수에 `info.sender` 검증을 누락하지 않는다.
- **Address validation** — `deps.api.addr_validate()`로 주소를 검증한다. 대소문자 정규화 이슈 주의 (CVE 패치 적용 확인).
- **Migration guard** — `migrate()` 함수에 admin 검증을 추가한다. 무단 마이그레이션으로 컨트랙트 탈취 가능.

### 크로스 컨트랙트 & IBC
- **Reply handling** — `SubMsg`의 `Reply`에서 에러를 적절히 처리한다. 무시하면 상태 불일치 발생.
- **IBC channel validation** — IBC 메시지 수신 시 채널과 포트를 검증한다.
- **Reentrancy via SubMsg** — CosmWasm은 기본적으로 reentrancy를 방지하지만, `ReplyOn::Always` 사용 시 상태 일관성을 확인.

### 데이터 & 산술
- **Storage key collision** — 스토리지 키를 상수로 정의하고, 컨트랙트 간 키 충돌을 방지한다.
- **Uint128 overflow** — `checked_add`, `checked_sub` 등 checked 연산을 사용한다. 일반 연산은 overflow 시 panic.
- **Rounding direction** — 토큰 분배 시 반올림 방향이 프로토콜에 불리하지 않도록 한다.

### 가스 & DoS
- **Unbounded iteration** — `range()` 쿼리에 `limit`을 설정하여 가스 초과를 방지한다.
- **Large state read** — 큰 상태를 한 번에 읽지 않는다. 페이지네이션을 사용.
