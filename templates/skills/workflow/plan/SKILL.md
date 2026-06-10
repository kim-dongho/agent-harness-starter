---
description: 기능 계획 수립. `/plan` 으로 호출하면 프로젝트를 스캔하고 기능, 우선순위, 마일스톤을 정의한다.
---

## /plan 워크플로우

`/plan` 으로 호출한다. 프로젝트 컨텍스트를 분석하여 구현 계획을 수립한다.

### 1. 프로젝트 스캔

아래 파일들을 읽고 현재 상태를 파악한다:
- `harness.config.json` — 프로젝트 설정
- `package.json` — 의존성, 스크립트
- `README.md` — 프로젝트 개요
- `src/` — 현재 구현된 코드 구조

### 2. 기능 정의

사용자와 함께 기능 목록을 정의한다:

```json
{
  "goals": ["프로젝트의 핵심 목표"],
  "features": [
    {
      "name": "기능명",
      "description": "설명",
      "priority": "high | medium | low",
      "status": "planned | in-progress | done"
    }
  ],
  "milestones": [
    {
      "name": "v1.0",
      "targetDate": "2026-07-01",
      "features": ["기능명1", "기능명2"]
    }
  ]
}
```

### 3. 산출물

- `docs/plan.json` — 구조화된 계획 데이터
- `docs/plan.md` — 사람이 읽을 수 있는 계획 문서

### 4. 다음 단계

계획 수립 후 → `/analyze` 로 도메인 분석을 진행한다.
