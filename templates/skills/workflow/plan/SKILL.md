---
description: 기능 계획 수립. `/plan <기능명>` 으로 호출하면 프로젝트를 스캔하고 해당 기능의 계획을 수립한다.
---

## /plan 워크플로우

`/plan <기능명>` 으로 호출한다. 기능별 폴더에 계획을 생성한다.

### 사용법

```
/plan login        → docs/features/login/plan.json
/plan dashboard    → docs/features/dashboard/plan.json
```

### 1. 프로젝트 스캔

아래 파일들을 읽고 현재 상태를 파악한다:
- `harness.config.json` — 프로젝트 설정 (아키텍처, 스택)
- `package.json` — 의존성
- 현재 구현된 코드 구조

### 2. 기능 정의

사용자와 함께 기능을 정의한다:

```json
{
  "feature": "login",
  "description": "로그인 페이지 구현",
  "priority": "high",
  "tasks": [
    { "name": "로그인 폼 UI", "layer": "features/auth", "status": "planned" },
    { "name": "인증 API 연동", "layer": "shared/api", "status": "planned" },
    { "name": "테스트", "layer": "tests", "status": "planned" }
  ]
}
```

### 3. 산출물

```
docs/features/<기능명>/
├── plan.json      ← 구조화된 계획
└── plan.md        ← 사람이 읽을 수 있는 문서
```

### 4. 기능 완료 후

`/done` 실행 시 해당 기능의 `plan.json`에 `status: "done"`으로 업데이트된다.

### 5. 다음 단계

계획 수립 후 → `/analyze <기능명>` 으로 도메인 분석을 진행한다.
