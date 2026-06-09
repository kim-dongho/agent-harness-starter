# Java (Spring Boot) — 구조 & 아키텍처
- 생성자 주입만 사용한다. 필드 주입(`@Autowired`) 금지. Lombok `@RequiredArgsConstructor` 활용.
- Controller는 라우팅/요청-응답 매핑만. 비즈니스 로직은 `@Service`에서.
- URL은 리소스 기반으로 설계한다. 동사 사용 금지 (`/api/users` O, `/api/createUser` X).
- 설정은 `application.yml` 프로파일 + `@ConfigurationProperties`로 외부화한다. 하드코딩 금지.
- DTO는 Record 클래스를 사용한다.
