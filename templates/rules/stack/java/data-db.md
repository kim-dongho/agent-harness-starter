# Java (Spring Boot) — 데이터 & DB
- JPA Entity를 REST 응답으로 직접 반환하지 않는다 — 서비스 계층에서 DTO로 변환.
- JPA 관계는 기본 `FetchType.LAZY`. 필요할 때만 `JOIN FETCH`나 Entity Graph 사용.
- 읽기 전용 메서드는 `@Transactional(readOnly = true)`, 쓰기는 `@Transactional`. 트랜잭션 경계는 서비스 계층에서.
- 목록 조회 API는 `PagingAndSortingRepository`로 페이징한다. 무제한 리스트 반환 금지.
- JPA Entity의 `equals()`/`hashCode()`를 비즈니스 키 또는 DB ID로 오버라이드한다.
- DB 마이그레이션은 Flyway 또는 Liquibase 사용. `ddl-auto=update`는 프로덕션에서 사용 금지.
- N+1 방지가 필요한 레포지토리 메서드에 `@EntityGraph(attributePaths={...})`를 선언한다.
