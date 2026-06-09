# TON — TON 보안 체크리스트

- `sender()` 검증을 모든 권한 필요 함수에서 수행한다.
- 외부 메시지 수신 시 replay attack을 방지한다 (seqno 패턴 사용).
- 컨트랙트 잔액이 스토리지 비용 이하로 내려가지 않도록 보호한다 (storage fee로 인한 삭제 방지).
- `require()` 문으로 사전 조건을 검증한다.

### 비동기 메시지
- **Message ordering** — 메시지 도착 순서가 보장되지 않는다. 순서에 의존하는 로직을 작성하지 않는다.
- **Bounce handling** — 실패한 메시지의 bounce를 처리하지 않으면 자금이 유실될 수 있다. `bounced` 핸들러를 구현한다.
- **Partial execution** — 메시지 체인 중간에 실패하면 이전 상태 변경은 롤백되지 않는다. 각 단계를 독립적으로 안전하게 설계.

### 가스 & 자금
- **Gas estimation** — 가스 부족 시 트랜잭션이 중간에 실패한다. 충분한 TON을 메시지에 첨부한다.
- **Storage fee drain** — 잔액이 스토리지 비용 이하로 내려가면 컨트랙트가 삭제된다. 최소 잔액을 유지한다.
- **Carry remaining value** — 메시지 전달 시 남은 가스를 적절히 처리한다 (`SendRemainingValue` 등).

### 데이터
- **Cell overflow** — 단일 Cell 최대 1023 bits. 초과 시 직렬화 실패.
- **Address format mismatch** — TEP-74 표준과 Tact의 주소 포맷 불일치로 토큰 전송 실패 가능. 주소 형식을 검증.
- **Parameter mutation** — 수신 메시지의 파라미터를 직접 수정하지 않는다.

### 랜덤 & 보안
- **Unsafe randomness** — `randomInt()`/`random()` 대신 `nativeRandom()`/`nativeRandomInterval()`을 사용한다.
- **Replay attack** — 외부 메시지에 seqno 패턴을 적용하여 재실행 공격을 방지한다.
