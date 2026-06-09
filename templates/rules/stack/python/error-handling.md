# Python — 에러 처리

### FastAPI
- guard clause / early return으로 에러를 함수 초반에 처리한다. 깊은 중첩 금지.
- 커스텀 예외 핸들러로 에러 응답 포맷을 통일한다.

### 공통 금지 패턴
- bare `except:` 사용 금지 — `except Exception as e:` 이상으로 구체적으로 잡는다.
- mutable 기본 인자(`def f(items=[])`) 사용 금지 — `None`을 기본값으로 쓰고 함수 내에서 생성한다.
- `*` import 사용 금지 — 명시적으로 필요한 이름만 import한다.
- SQL 쿼리에 f-string/format으로 값을 삽입하지 않는다 — 파라미터 바인딩을 사용한다.
- `os.system()` 사용 금지 — `subprocess.run()`을 사용한다.
