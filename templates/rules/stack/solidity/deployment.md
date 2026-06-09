# Solidity — 배포 & 감사

- 프록시 컨트랙트는 배포와 초기화를 단일 트랜잭션으로 수행한다 (front-running 방지).
- 메인넷 배포 전 전문 보안 감사를 받고, CI에서 Slither/Mythril을 실행한다.
- 배포 전 자동 secrets 스캔을 실행하여 프라이빗 키/크레덴셜 커밋을 방지한다.
- `constructor` 키워드를 사용한다 (컨트랙트명 함수 방식 금지). (SWC-118)

## References

- https://swcregistry.io/
- https://docs.soliditylang.org/
- https://docs.openzeppelin.com/contracts/
- https://ethereum-contract-security-techniques-and-tips.readthedocs.io/
- https://github.com/SmartContractSecurity/SWC-registry
