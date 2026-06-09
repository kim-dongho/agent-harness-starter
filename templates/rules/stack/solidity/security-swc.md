# Solidity — SWC 기반 보안 규칙

### 가시성 & 접근 제어
- 함수와 상태변수의 가시성을 항상 명시적으로 선언한다 (`public`, `external`, `internal`, `private`). (SWC-100, SWC-108)
- ETH 인출 함수에 반드시 접근 제어를 구현한다. (SWC-105)
- `selfdestruct`는 엄격한 접근 제어 또는 multisig로 보호한다. 불필요하면 제거. (SWC-106)
- 인가에 `tx.origin`을 절대 사용하지 않는다 — `msg.sender`를 사용한다. (SWC-115)

### 외부 호출 & Reentrancy
- low-level call(`call`, `send`, `delegatecall`)의 반환값을 반드시 확인한다. (SWC-104)
- 신뢰할 수 없는 주소에 `delegatecall`하지 않는다. (SWC-112)
- 외부 호출 실패가 전체 컨트랙트를 막지 않도록 pull-payment 패턴을 사용한다. (SWC-113)
- `transfer()`/`send()` 대신 `.call{value: ...}("")` + reentrancy guard를 사용한다 (가스 비용 변동 대응). (SWC-134)

### 데이터 & 저장소
- 로컬 struct/array 변수에 `memory` 또는 `storage`를 명시적으로 지정한다. (SWC-109)
- storage write 인덱스를 검증하여 임의 슬롯 덮어쓰기를 방지한다. (SWC-124)
- `private` 변수도 온체인에서 공개적으로 읽을 수 있다 — 시크릿을 상태변수에 저장하지 않는다. (SWC-136)
- 엄격한 Ether 잔액 체크(`address(this).balance == X`) 금지 — `selfdestruct`로 강제 전송 가능. (SWC-132)

### 랜덤성 & 타이밍
- `block.timestamp`, `blockhash`, `block.difficulty`를 랜덤 소스로 사용하지 않는다 — VRF 또는 오라클 사용. (SWC-120)
- `block.timestamp`/`block.number`는 근사값으로만 사용한다. 정밀 타이밍에 의존 금지. (SWC-116)

### 서명 & 암호화
- 서명 replay 방지: nonce, chainId, 컨트랙트 주소를 서명 메시지에 포함하고, 처리된 해시를 추적한다. (SWC-121)
- `ecrecover()`로 서명자를 암호학적으로 검증한다. (SWC-122)
- 서명 가변성 방지: `s` 값을 정규화하고 `v` 값을 검증한다. (SWC-117)
- 가변 길이 인자 해싱에 `abi.encodePacked()` 대신 `abi.encode()`를 사용한다 (충돌 방지). (SWC-133)

### 가스 & DoS
- 동적 배열의 무제한 루프를 피한다 — 페이지네이션 또는 고정 크기 배치 처리. (SWC-128)
- 릴레이 호출 시 충분한 가스가 전달되는지 검증한다. (SWC-126)

### 코드 품질
- deprecated 함수를 사용하지 않는다 (`sha3` → `keccak256`, `throw` → `revert`). (SWC-111)
- 자식 컨트랙트에서 부모의 상태변수와 같은 이름 선언 금지. (SWC-119)
- 상속 순서는 일반적인 것에서 구체적인 것 순서(왼쪽→오른쪽)로 지정한다. (SWC-125)
- 미사용 변수를 제거한다. (SWC-131)
- `assert()`는 불변식에만 사용하고, 입력 검증에는 `require()`를 사용한다. (SWC-110)
- 소스 코드에 유니코드 방향 오버라이드 문자(U+202E)가 없는지 확인한다. (SWC-130)
