# Move — Move 보안 체크리스트

### 접근 제어 & 권한
- **Unrestricted capability access** — capability 객체의 생성/전달 범위를 최소화한다. 유출 시 전체 권한 탈취 가능.
- **Missing reinitialization guard** — `init` 함수가 두 번 호출되지 않도록 보장한다.
- **Signer check bypass** — 모든 entry function에서 signer 검증을 수행한다.

### 리소스 & 객체
- **Resource duplication** — 리소스가 의도치 않게 복제되지 않도록 ability를 최소 부여한다.
- **Resource leakage** — 함수 종료 시 모든 리소스가 저장/전송/소멸되는지 확인한다. drop ability 없는 리소스 누락 시 컴파일 에러.
- **Shared object contention** (Sui) — 공유 오브젝트는 합의 필요. 가능하면 소유 오브젝트를 사용한다.
- **Object wrapping escape** (Sui) — 래핑된 오브젝트가 의도치 않게 언래핑되지 않도록 한다.

### 산술 & 로직
- **Abort-based DoS** — `assert!` 남용으로 정상 트랜잭션이 abort되지 않도록 에러 처리를 신중하게 설계.
- **Integer overflow** — Move는 overflow 시 abort하지만, 이로 인한 DoS를 고려한다.
- **Rounding errors** — 토큰 분배 시 나눗셈 순서와 반올림 방향을 검증한다.

### 크로스 모듈
- **Oracle manipulation** — 외부 가격 피드를 사용할 때 TWAP/중앙값 등 조작 방지 메커니즘을 적용한다.
- **Flash loan attack** — 단일 트랜잭션 내 가격 조작이 가능한지 검토한다.
