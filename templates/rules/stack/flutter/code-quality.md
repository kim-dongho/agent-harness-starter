# Flutter — 코드 품질
- 네이밍: 클래스/enum은 `UpperCamelCase`, 변수/함수는 `lowerCamelCase`, 파일/폴더는 `snake_case`.
- `late`는 접근 전 초기화를 보장할 수 있을 때만 사용한다. 그 외에는 nullable + null 체크.
- null safety를 일관되게 사용한다 — `Type?` + null 체크 선호. `!` 강제 언래핑 지양.
