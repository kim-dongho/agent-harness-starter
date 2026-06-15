---
description: 설계. `/design <기능명>` 으로 호출하면 인터페이스, API 계약, 컴포넌트 구조를 정의한다.
---

## /design 워크플로우

`/design <기능명>` 으로 호출한다. 구현 전에 인터페이스와 계약을 먼저 정의한다.

### 전제 조건

`docs/features/<기능명>/spec.md`가 존재해야 한다. 없으면 `/analyze <기능명>`을 먼저 실행하라고 안내한다.

### 1. 인터페이스 정의

기능 스펙을 기반으로 인터페이스를 정의한다.

### 2. API 계약 (Backend인 경우)

REST/GraphQL 엔드포인트를 정의한다.

### 3. 컴포넌트 구조 (Frontend인 경우)

컴포넌트 트리를 정의한다.

### 4. 산출물

```
docs/features/<기능명>/
├── plan.json      ← /plan에서 생성
├── plan.md
├── glossary.json  ← /analyze에서 생성
├── spec.md
└── design.md      ← 설계 문서 (API 계약, 컴포넌트 구조, 인터페이스)
```

### 5. 다음 단계

설계 후 → `/generate` 로 파일을 생성한다. **직접 파일을 만들지 않는다.**
