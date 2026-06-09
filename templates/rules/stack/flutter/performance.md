# Flutter — 성능
- 가능한 곳에 `const` 생성자를 사용한다 — 리빌드 스킵 최적화.
- CPU 집약적 작업(JSON 파싱, 이미지 처리)은 `Isolate.run()` 또는 `compute()`로 분리한다.
- 자주 리페인팅되는 위젯(애니메이션, 캔버스)은 `RepaintBoundary`로 격리한다.
