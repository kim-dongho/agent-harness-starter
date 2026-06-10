---
description: 학습 기록. `/learn` 으로 호출하면 에이전트의 실수를 기록하여 같은 실수가 반복되지 않게 한다.
---

## /learn 워크플로우

에이전트가 실수했을 때 `/learn` 으로 호출한다. 실수 패턴을 기록하여 다음 세션부터 자동으로 방지한다.

### 사용법

```
/learn
```

사용자가 `/learn`을 호출하면 아래 절차를 따른다.

### 1. 실수 분석

직전 대화에서 무엇이 잘못됐는지 분석한다:
- **무엇을 잘못했는가** — 잘못된 코드, 규칙 위반, 잘못된 판단
- **왜 잘못됐는가** — 컨텍스트 부족, 규칙 미인지, 잘못된 가정
- **어떻게 수정했는가** — 사용자의 수정 내용

### 2. 학습 기록

`.harness/learnings.json`에 기록한다:

```json
{
  "learnings": [
    {
      "id": "learn-001",
      "date": "2026-06-10",
      "category": "code-pattern | architecture | convention | testing | scope",
      "mistake": "무엇을 잘못했는지 한 줄 요약",
      "correction": "올바른 방법",
      "rule": "앞으로 지켜야 할 규칙",
      "files": ["관련 파일 경로"]
    }
  ]
}
```

### 3. 확인

기록 후 사용자에게 보여준다:

```
📝 학습 기록됨:
- 실수: {mistake}
- 교정: {correction}
- 규칙: {rule}

다음 세션부터 이 패턴을 자동으로 방지합니다.
```

### 4. 자동 적용

세션 시작 시 `session-init` hook이 `.harness/learnings.json`을 읽고 에이전트에게 주입한다.
에이전트는 기록된 실수를 반복하지 않는다.

### 예시

```
사용자: 아니 왜 useState로 서버 데이터 관리하냐? react-query 쓰라고 했잖아
에이전트: 죄송합니다. 수정하겠습니다.
사용자: /learn

→ 기록:
  mistake: "서버 상태를 useState로 관리"
  correction: "서버 상태는 react-query(TanStack Query) 사용"
  rule: "API 응답 데이터는 반드시 react-query로 관리한다. useState 금지."
```
