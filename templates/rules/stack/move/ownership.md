# Move — 소유권 & 리소스
- Move의 리소스 모델을 활용한다 — 리소스는 복사/삭제할 수 없고, 이동만 가능하다 (linear type).
- `key` ability가 있는 struct는 글로벌 스토리지에 저장 가능한 리소스다. 신중하게 설계한다.
- `copy`, `drop`, `store`, `key` ability를 최소한으로 부여한다 — 불필요한 ability는 보안 위험.
- 오브젝트를 전송할 때 소유권 변경을 명시적으로 처리한다.
