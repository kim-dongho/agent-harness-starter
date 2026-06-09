# Move — 접근 제어
- `public entry fun`과 `public fun`의 차이를 이해한다 — `entry`는 트랜잭션에서 직접 호출 가능.
- 관리자 전용 함수에 capability 패턴(`AdminCap`)을 사용한다.
- 모듈 초기화는 `init` 함수(Sui) 또는 `init_module` 함수(Aptos)에서 한 번만 수행한다.
