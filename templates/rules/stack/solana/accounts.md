# Solana — 계정 & 보안
- 모든 계정에 owner 체크를 수행한다. Anchor의 `Account<>` 타입은 자동으로 처리하지만, 수동 역직렬화 시 반드시 확인.
- signer 검증을 누락하지 않는다 — 권한이 필요한 instruction에 `Signer` 제약을 반드시 추가.
- PDA(Program Derived Address) 생성 시 seeds를 명확하게 정의하고, bump를 저장하여 재계산을 피한다.
- 계정 초기화 시 `init` 제약과 `payer`를 명시한다. 이미 초기화된 계정 재초기화를 방지한다.
- 계정 닫기 시 lamports를 수신자에게 전송하고 데이터를 0으로 채운다 (revival attack 방지).
