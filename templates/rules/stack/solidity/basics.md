# Solidity — 기본 규칙

- Checks-Effects-Interactions(CEI) 패턴: 입력 검증 → 상태 변경 → 외부 호출 순서를 지킨다. (SWC-107)
- pragma를 특정 버전으로 고정한다 (`pragma solidity 0.8.24;`). floating pragma(`^0.8.0`) 사용 금지. (SWC-103)
- 최신 안정 Solidity 컴파일러를 사용한다 (0.8.x+ 내장 오버플로우 보호). (SWC-102)
- ERC20, ERC721, AccessControl 등은 OpenZeppelin Contracts를 사용한다.
- 단일 `owner` 대신 OpenZeppelin `AccessControl`로 역할 기반 접근 제어를 구현한다.
- 외부 호출/ETH 전송 함수에 `ReentrancyGuard`(`nonReentrant`)를 적용한다. (SWC-107)
- ERC20 토큰 상호작용에 `SafeERC20`을 사용한다.
- `require()` 문자열 대신 custom error를 사용한다 (가스 절약, Solidity 0.8.4+).
- 모든 상태 변경에 이벤트를 emit한다.
- struct와 storage 변수를 연속 배치하여 슬롯을 최소화한다 (가스 최적화).
