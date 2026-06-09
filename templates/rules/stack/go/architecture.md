# Go — 구조 & 아키텍처
- `internal/` 디렉토리로 구현 세부사항을 외부 모듈에서 접근 불가하게 한다.
- 인터페이스는 사용처(consumer)에서 정의하고 작게 유지한다 (1~3 메서드).
- 상속을 흉내내지 않는다 — struct 임베딩과 인터페이스 합성을 사용한다.
- `init()` 함수는 드라이버 등록 같은 패키지 수준 초기화에만 사용한다.
- 네이밍: exported는 `UpperCamelCase`, unexported는 `lowerCamelCase`. 패키지명은 소문자 단일 단어.
