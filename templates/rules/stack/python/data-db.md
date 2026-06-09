# Python — 데이터 & DB

### FastAPI
- 요청/응답 스키마는 Pydantic 모델로 정의. `Create`, `Update`, `Response` 모델을 분리한다.
- Pydantic `model_config`에 `from_attributes = True` 설정으로 ORM 객체 변환을 지원한다.

### Django
- ForeignKey/OneToOne은 `select_related()`, ManyToMany/reverse FK는 `prefetch_related()`로 N+1 쿼리를 방지한다.
- 일부 필드만 필요하면 `values()` 또는 `only()`를 사용한다.
- 함께 성공/실패해야 하는 작업은 `@transaction.atomic`으로 감싼다.
- Django 캐시 프레임워크(Redis/Memcached)로 자주 조회하는 데이터를 캐싱한다.
