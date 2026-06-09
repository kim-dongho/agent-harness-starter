# Flutter — 상태관리
- 깊은 위젯 트리에서 `setState()` 호출을 피한다 — state를 상위로 올리거나 상태관리 도구를 사용.
- 상태 객체는 불변 데이터 클래스(`freezed` 또는 Dart 3 records)를 사용한다.
- 상태관리: 단순 앱은 Provider, 중간은 Riverpod, 복잡한 비동기는 Bloc/Cubit.
