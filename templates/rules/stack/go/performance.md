# Go — 성능
- `context.Context`는 I/O 함수의 첫 번째 파라미터로 전달하고 호출 체인 전체에 전파한다.
- 고루틴은 반드시 종료 조건을 명시한다 — `context.WithCancel`, `sync.WaitGroup`, `errgroup.Group` 사용.
- 실패할 수 있는 고루틴 그룹은 `errgroup.Group`으로 관리한다.
- 고루틴 간 통신은 공유 메모리 + mutex보다 채널을 선호한다.
- 리소스 획득 직후 `defer`로 정리(파일 닫기, 뮤텍스 해제)한다.
