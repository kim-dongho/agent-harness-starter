# TON — 데이터 & 직렬화
- TON은 Cell 기반 저장소를 사용한다 — 데이터 크기와 Cell 깊이 제한을 인지한다.
- 큰 데이터는 여러 Cell에 나눠 저장한다 (단일 Cell 최대 1023 bits).
- `map<>` 타입으로 key-value 저장소를 구현한다.
