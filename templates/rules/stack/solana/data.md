# Solana — 데이터 & 직렬화
- Anchor의 `#[account]` 매크로를 사용하여 계정 데이터 구조를 정의한다.
- 계정 크기를 정확히 계산한다 — 8바이트 discriminator + 데이터 크기.
- `remaining_accounts`를 사용할 때 각 계정의 소유자와 타입을 수동으로 검증한다.
