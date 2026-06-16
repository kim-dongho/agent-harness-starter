---
description: MR 생성. `/create-mr` 으로 호출하면 현재 브랜치를 push하고 GitLab MR을 생성한다.
---

## /create-mr 워크플로우

`/create-mr` 으로 호출한다.

### 1. 브랜치 확인

```bash
git branch --show-current
```

- `main` / `devel` 이면 "브랜치 체크아웃 후 다시 실행하세요" 안내 후 종료

### 2. 워킹 트리 확인

```bash
git status --short
```

- 커밋 안 된 변경사항이 있으면 → "먼저 `/commit`을 실행할까요?" 질문
  - 동의하면 `/commit` 실행 후 계속
  - 거절하면 현재 커밋된 내용만으로 진행

### 3. 변경 범위 파악

```bash
git diff --stat origin/{{BASE_BRANCH}}...HEAD
git log origin/{{BASE_BRANCH}}..HEAD --format='%s%n%b%n---'
```

- diff가 비어있으면 "변경사항이 없습니다" 안내 후 종료
- 커밋 메시지를 수집하여 MR 제목/본문 초안에 활용

### 4. MR 제목

기본 형식: `[JIRA-KEY] <요약>`

- 브랜치명에서 `[A-Z0-9]+-\d+` 패턴의 Jira 키 추출 (예: `fix/VM2026-379` → `VM2026-379`)
- Jira 키가 있으면 이슈 summary를 조회하여 제목 자동 생성
- 없으면 커밋 메시지 기반으로 제목 작성

### 5. MR Description

브랜치 prefix에 따라 내용을 구성한다:

| 브랜치 prefix | 주요 섹션 |
|--------------|----------|
| `fix/*` | 원인 · 조치 |
| `hotfix/*` | 원인 · 조치 · 영향 범위 |
| `feature/*` | 구현 방법 |
| `refactor/*` | 리팩토링 이유 · 변경 사항 |
| `test/*` | 테스트 대상 |
| `chore/*` | 변경 이유 |

**작성 규칙:**
- diff · 커밋 메시지에서 확인 가능한 사실만 기술. 추측 금지
- 개조식 · 명사구 종결 (`~했다` / `~합니다` 금지)
- 리뷰어가 30초 이내로 훑을 수 있는 분량
- 불확실하면 `<!-- 확인 필요: ... -->` 마커로 남긴다

**원인/조치 (fix/hotfix):**
- 원인: 증상이 아닌 근본 원인을 명사구로 요약
  - ✅ `토큰 만료 비교 시 timezone 미반영 → 만료된 토큰이 유효로 판정`
  - ❌ `버그 수정`, `로그인이 안 됨`
- 조치: "무엇을 → 어떻게"만 명사구로 요약
  - ✅ `토큰 만료 비교를 UTC 기준으로 통일 + 경계 케이스 단위 테스트 추가`
  - ❌ `버그 수정`, `로직 개선`

### 6. 사용자 승인

MR 제목 + Description 초안을 사용자에게 제시한다.
- 수정 요청 시 반영 후 재제시
- 승인 시 다음 단계 진행

### 7. Push

```bash
git push -u origin $(git branch --show-current)
```

source 브랜치가 origin에 push 되었는지 확인. 미푸시면 push 실행.

### 8. MR 생성

{{PR_CREATE_COMMAND}}

### 9. 중복 MR 처리

동일 source 브랜치로 이미 열린 MR이 있으면 기존 MR URL을 안내하고 종료한다.

### 10. 결과

MR URL을 사용자에게 제시한다.
