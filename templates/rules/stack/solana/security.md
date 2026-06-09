# Solana — Sealevel 보안 체크리스트

### 인증 & 접근 제어
- **Missing signer check** — 모든 권한 필요 instruction에서 `is_signer` 플래그를 검증한다. (Wormhole $320M 해킹 원인)
- **Missing owner check** — 계정의 owner가 예상 프로그램인지 확인한다. 수동 역직렬화 시 필수.
- **Arbitrary CPI caller** — CPI 호출자를 제한한다. 아무 프로그램이나 호출 가능하면 안 된다.

### 계정 검증
- **Account data matching** — 계정 데이터의 discriminator가 예상 타입과 일치하는지 확인한다.
- **PDA seed collision** — PDA seed 설계 시 사용자 간 충돌이 불가능하도록 고유 식별자를 포함한다.
- **Duplicate mutable accounts** — 같은 계정이 두 번 전달되어 이중 적용되는 케이스를 방지한다.
- **Account reloading after CPI** — CPI 후 계정 데이터가 변경됐을 수 있으므로 재로드한다.

### 산술 & 정밀도
- **Integer overflow/underflow** — checked 연산(`checked_add`, `checked_sub`, `checked_mul`)을 사용한다.
- **Precision loss** — 나눗셈에서 소수점 이하 절삭으로 인한 자금 손실을 방지한다. 곱셈을 나눗셈보다 먼저 수행.
- **Token decimal mismatch** — 토큰의 decimal을 고려하여 금액을 계산한다.

### 런타임 & 동시성
- **Write-lock contention** — 단일 글로벌 PDA 대신 사용자별 sharded PDA를 사용한다.
- **Remaining compute units** — 복잡한 로직은 compute budget을 초과할 수 있다. `sol_remaining_compute_units()`로 확인.
