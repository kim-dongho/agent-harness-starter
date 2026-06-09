# Kotlin — 코드 품질
- Null 안전성을 활용한다 — `!!` 연산자 사용을 피하고, `?.`, `?:`, `let`을 사용한다.
- `data class`로 DTO와 도메인 모델을 정의한다.
- `sealed class`로 유한한 상태를 표현한다 (API 응답, 에러 타입 등).
- 확장 함수(extension function)로 유틸리티를 구현하되, 남용하지 않는다.
- `when` 표현식은 `sealed class`와 함께 사용하여 exhaustive 검사를 보장한다.

## 컨벤션
- 네이밍: 클래스는 `PascalCase`, 함수/변수는 `camelCase`, 상수는 `UPPER_SNAKE_CASE`.
- `var`보다 `val`을 우선 사용한다 (불변 참조).
- `catch (e: Exception)`으로 모든 예외를 잡지 않는다 — 구체적인 예외 타입을 사용한다.
- `GlobalScope`에서 코루틴을 시작하지 않는다 — 구조화된 동시성(`viewModelScope`, `lifecycleScope`)을 사용한다.
- Java 컬렉션 팩토리(`Arrays.asList`)를 사용하지 않는다 — `listOf`, `mutableListOf` 등 Kotlin stdlib을 사용한다.
- 컬렉션 처리는 `map`, `filter`, `fold` 등 함수형 API를 사용한다.
- `ktlint` 또는 `detekt`를 CI에서 실행한다.
