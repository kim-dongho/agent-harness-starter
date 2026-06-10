# Python — 구조 & 아키텍처

### 공통
- 타입 힌트를 반드시 사용한다.
- 변수명은 snake_case, 클래스는 PascalCase.
- f-string을 문자열 포맷팅에 사용한다.

### FastAPI
- CORS 미들웨어를 명시적으로 설정한다.
- 코드는 도메인 기능별로 구조화한다 (`users/router.py`, `users/models.py`, `users/schemas.py`).
- `async def`는 async I/O를 호출할 때만. 동기/CPU-bound는 `def`로 (FastAPI가 자동 threadpool 실행).
- DB 세션, 인증 등은 `Depends()`로 의존성 주입한다. `yield`로 cleanup 처리.
- startup/shutdown은 `lifespan` 컨텍스트 매니저로 처리한다.
- RORO 패턴 — 함수는 Pydantic 모델을 받고 Pydantic 모델을 반환한다. 원시 파라미터 나열 지양.

### Django
- 비즈니스 로직은 모델 또는 매니저에 둔다. 뷰와 시리얼라이저에 분산 금지.
- Django Signal 남용 금지 — 명시적 서비스 함수를 사용한다.
- 관계 필드에 명시적 `related_name`을 지정한다.
