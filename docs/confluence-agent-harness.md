# Agent Harness Starter — 기술 문서

| 일자 | 버전 | 변경 내용 | 변경 사유 |
|------|------|----------|----------|
| 2026-06-16 | v1.0 | 최초 작성 | - |

## 1. 개요 (Overview)

AI 코딩 에이전트(Claude Code, Gemini CLI, Cursor 등)가 프로젝트 규칙을 무시하고 코드를 생성하면 타입 에러, lint 위반, 아키텍처 위반이 누적됩니다. 이를 해결하기 위해 **Agent Harness** 시스템을 구축하였습니다. 에이전트가 파일을 수정할 때마다 Hook이 자동으로 검증하고, 에러에서 학습하여 반복 실수를 방지합니다. 본 문서는 시스템 아키텍처, 설정 방법, 운영 정책을 기록합니다.

운영 방식: `npx @frontend-playground/agent-harness-starter`로 프로젝트를 생성하거나, `npx @frontend-playground/agent-harness-starter init`으로 기존 프로젝트에 하네스를 추가합니다. Hook 스크립트가 에이전트의 파일 수정을 실시간으로 검증하며, Skills(SKILL.md)가 이슈 기반 개발 워크플로우를 자동화합니다.

## 2. 시작하기 (Getting Started)

### 2.1 환경변수 설정 (최초 1회)

GitLab npm registry에서 패키지를 설치(pull)하기 위한 인증 토큰 설정입니다. 토큰값은 [Passbolt](https://passbolt.dtechlab.com/)에 등록되어 있습니다.

**macOS / Linux:**

```bash
echo 'export GITLAB_FP_NPM_DEPLOY_TOKEN=토큰값' >> ~/.zshrc
source ~/.zshrc
```

**Windows (PowerShell):**

```powershell
[System.Environment]::SetEnvironmentVariable('GITLAB_FP_NPM_DEPLOY_TOKEN', '토큰값', 'User')
```

### 2.2 npm registry 설정 (최초 1회)

```bash
echo -e '@frontend-playground:registry=https://gitlab.dtechlab.com/api/v4/projects/128/packages/npm/\n//gitlab.dtechlab.com/api/v4/projects/128/packages/npm/:_authToken=${GITLAB_FP_NPM_DEPLOY_TOKEN}' >> ~/.npmrc
```

### 2.3 새 프로젝트 생성

```bash
npx @frontend-playground/agent-harness-starter@latest
```

인터랙티브 프롬프트로 에이전트, 스택, 옵션을 선택합니다.

### 2.4 기존 프로젝트에 하네스 추가

```bash
npx @frontend-playground/agent-harness-starter@latest init
```

프로젝트를 자동 스캔하여 언어/프레임워크/린터를 감지하고, 선택한 에이전트에 맞는 hooks + rules + skills를 생성합니다. 기존 `.env.example`이 있으면 하네스 변수(Jira/GitLab)만 append합니다.

## 3. 아키텍처 (Architecture)

### 3.1 시스템 구성

![하네스 플로우](docs/harness-flow.excalidraw.png)
[그림 1] Agent Harness 전체 플로우

### 3.2 주요 파일 구조

```
my-project/
├── harness.config.json              # 하네스 설정 (single source of truth)
├── .env.example                     # 환경변수 템플릿 (Jira, GitLab)
├── .claude/                         # Claude Code 선택 시
│   ├── settings.json                #   hook 등록
│   ├── hooks/                       #   hook 스크립트
│   │   ├── scope-guard.sh           #     허용 범위 밖 파일 차단
│   │   ├── scaffold-guard.sh        #     파일 네이밍 검증
│   │   ├── post-write.sh            #     lint + 타입체크 + 보안검사
│   │   ├── session-init.sh          #     세션 시작 컨텍스트 주입
│   │   └── stop-review.sh           #     빌드 + 테스트 + 스코프 검증
│   ├── rules/                       #   에이전트 룰 (스택별)
│   └── skills/                      #   워크플로우 스킬 (SKILL.md)
├── .harness/                        # 런타임 상태 (.gitignore 대상)
│   ├── metrics.jsonl                #   메트릭 이벤트 로그
│   ├── learnings.json               #   자동 학습 규칙
│   └── errors.log                   #   에러 로그
└── docs/features/                   # SDLC 산출물
    └── <기능명>/
        ├── plan.json                #   /plan 산출물
        ├── spec.md                  #   /analyze 산출물
        └── design.md               #   /design 산출물
```

### 3.3 지원 에이전트

| 에이전트 | Hooks | 설정 파일 | Pre/Post 매핑 |
|---------|:-----:|----------|--------------|
| Claude Code | O | `.claude/settings.json` | PreToolUse / PostToolUse |
| Gemini CLI | O | `.gemini/settings.json` | BeforeTool / AfterTool |
| Codex CLI | O | `.codex/hooks.json` | PreToolUse / PostToolUse |

> **Claude Code에서 가장 완전하게 동작합니다.** PostToolUse의 `additionalContext`를 에이전트 컨텍스트에 자동 주입하여 self-heal 자동 수정, AutoHarness 규칙 추가가 에이전트 루프 안에서 자동으로 처리됩니다. 다른 에이전트는 hook 실행 + 메트릭 수집은 되지만, 에러 감지 후 자동 수정 지시 전달 방식이 에이전트마다 다릅니다.

## 4. Hook 시스템 (Hook System)

모든 에이전트가 동일한 hook 스크립트를 사용합니다. 설정 파일 포맷만 에이전트별로 다릅니다.

### 4.1 Hook 동작 흐름

| Hook | 시점 | 동작 | exit code |
|------|------|------|----------|
| **scope-guard** | 파일 수정 전 (PreToolUse) | `allowedScopes` 밖 파일 수정 차단 | 2 = 차단 |
| **scaffold-guard** | 파일 생성 전 (PreToolUse) | 파일 네이밍 규칙 검증 + 언어별 예외 처리 | 2 = 차단 |
| **post-write** | 파일 수정 후 (PostToolUse) | lint + 타입체크 + 블록체인 보안검사 + 즉시 학습 | 0 (항상) |
| **session-init** | 세션 시작 (SessionStart) | 프로젝트 컨텍스트 + 메트릭 요약 + AutoHarness | 0 |
| **stop-review** | 응답 종료 (Stop) | 빌드 + 테스트 + 스코프 검증 (변경 없으면 스킵) | 0 |

### 4.2 post-write 상세

에이전트가 파일을 수정할 때마다 실행됩니다. 가장 핵심적인 hook입니다.

```
에이전트 Write → post-write 실행
                  │
                  ├── 0. Auto-format (biome/prettier)
                  ├── 1. Lint 검사 (biome/eslint)
                  ├── 2. TypeScript type-check
                  ├── 3. Import 위반 검사 (forbiddenImports)
                  ├── 4. 블록체인 보안 검사 (.sol/.rs/.move)
                  ├── 5. codingStandards 위반 검사
                  │
                  ├── clean → 메트릭 기록
                  └── error → 에러코드 수집
                              → learnings.json에 즉시 기록
                              → 에이전트에 수정 지시 (additionalContext)
                              → self-heal 루프
```

### 4.3 Self-heal 자동 수정

post-write가 에러를 감지하면 에러 종류에 따라 동작이 다릅니다.

| 에러 종류 | 동작 | 예시 |
|----------|------|------|
| 단순 에러 | 즉시 자동 수정 (컨펌 없음) | TS2322, organizeImports, lint 에러 |
| 보안 에러 | 원인 설명 + 수정 계획 + 컨펌 후 수정 | SWC-115, Reentrancy, delegatecall |

### 4.4 블록체인 보안 검사

| 파일 | 검사 항목 |
|------|----------|
| `.sol` | tx.origin (SWC-115), selfdestruct (SWC-106), delegatecall (SWC-112), floating pragma (SWC-103), reentrancy |
| `.rs` (Anchor) | unchecked arithmetic, unwrap() in production |
| `.move` | public entry without assert! |

### 4.5 AutoHarness 자동 학습

같은 에러코드가 3회 이상 반복되면 `harness.config.json`의 `codingStandards`에 규칙을 자동 추가합니다.

```
🔧 [AutoHarness] organizeImports 4회 반복 → 자동 추가됨
```

에러코드를 그대로 규칙 ID로 사용합니다. 매핑 테이블 없이 모든 linter/타입체커 에러코드를 수용합니다.

발생 시점:
- **session-init** (세션 시작): learnings.json에서 빈도 집계 → config에 추가
- **post-write** (파일 수정 후): 에러 발생 시 즉시 learnings.json에 기록 + 3회 이상이면 config에 추가

### 4.6 파일 네이밍 (scaffold-guard)

스택 카테고리별로 언어 규약에 따라 강제됩니다. 사용자가 선택할 수 없는 스택은 프롬프트에서 질문하지 않습니다.

| 카테고리 | 네이밍 | 비고 |
|---------|--------|------|
| Go | `snake_case` | 언어 강제 |
| Python | `snake_case` | PEP 8 |
| Java | `PascalCase` | 클래스 = 파일명 |
| Rust | `snake_case` | 언어 강제 |
| Solidity | `PascalCase` | 컨트랙트 = 파일명 |
| Frontend (JS/TS) | 사용자 선택 | kebab-case / camelCase / PascalCase |

언어 규약으로 강제되는 파일명 패턴은 검증을 스킵합니다: `*_test.go`, `test_*.py`, `mod.rs`, `__init__.py`, `*.module.css` 등.

## 5. 스킬 시스템 (Skills)

SKILL.md 기반의 워크플로우 안내 시스템입니다. Hook과 달리 강제가 아닌 가이드이며, 에이전트가 슬래시 명령으로 호출합니다.

### 5.1 워크플로우

두 가지 트랙으로 사용합니다.

**이슈 기반 (Jira + Figma)**

```
/start <이슈번호> → 이슈 조회 → Figma 분석 → 구현 계획 → 구현
/done              → /code-review → 품질 게이트 → /commit → /create-mr
```

**기획부터 (Jira/Figma 없이)**

```
/plan → /analyze → /design → /generate → 구현 → /done
```

### 5.2 `/start` 워크플로우 상세

이슈 번호를 주면 자동으로 수행합니다:

1. **이슈 조회** (`/fetch-issue`) — Jira API로 제목/설명/타입 가져오기
2. **티켓 검증** — 필수 항목 (수락 기준, Figma 링크 등) 체크
3. **이슈 상태 변경** — "해야할 일(To Do)" 상태인 경우에만 "진행 중"으로 변경
4. **브랜치 생성** (`/branch`) — 이슈 타입에 따라 prefix 자동 결정
5. **Figma 분석** (`/figma`) — 기획 + 디자인 MCP로 읽기 (토큰 절약 전략 적용)
6. **변경 대상 분석** — 코드베이스 탐색 + 복잡도 판단
7. **구현 계획** — 단계별 계획 제시 → 사용자 확인 후 진행

브랜치 prefix 규칙:

| 이슈 타입 | prefix | 비고 |
|----------|--------|------|
| Bug / Bugfix | `fix/` | |
| Feature / Story / Task | `feature/` | Task는 대부분 구현이므로 feature |
| Chore (설정/CI/배포) | `chore/` | 비기능 작업에만 |
| Refactor | `refactor/` | |

브랜치명: 이슈번호가 있으면 `feature/VM2026-82`, 없으면 `feature/login-page-ui`

### 5.3 `/done` 워크플로우 상세

```
/code-review (1회) → 수정 → Gate 1~5 → /commit → /create-mr
```

| 단계 | 스킬 | 검증 항목 |
|------|------|----------|
| 0 | `/code-review` | 변경 코드 리뷰 (1회, 무한루프 방지) |
| Gate 1 | `/lint` | lint + type-check |
| Gate 2 | `/test` | 테스트 실행 (실패 시 3회 self-heal 루프) |
| Gate 3 | — | 정책 키워드 변경 시 테스트 존재 확인 |
| Gate 4 | — | 의도하지 않은 파일 변경 없는지 확인 |
| Gate 5 | — | 불필요 파일(.env 등) 제외 |
| 커밋 | `/commit` | staged 기반 커밋 (브랜치에서 이슈번호 자동 추출) |
| MR | `/create-mr` | push → GitLab MR 생성 |

MR 생성 시 이슈 상태를 "완료"로 변경하지 않습니다 — MR 머지는 리뷰어가 수행하므로 하네스 범위 밖입니다.

### 5.4 `/create-mr` 상세

- 브랜치 확인 (main/devel이면 차단)
- 워킹 트리 확인 → 커밋 안 된 변경 있으면 `/commit` 안내
- 브랜치명에서 Jira 키 자동 추출 → MR 제목에 포함
- 브랜치 prefix별 Description 분기 (fix: 원인/조치, feature: 구현 방법 등)
- 개조식 · 명사구 종결, 리뷰어가 30초 이내로 훑을 수 있는 분량
- 중복 MR 존재 시 기존 MR URL 안내

### 5.5 `/figma` 토큰 절약 전략

Figma MCP 호출 시 토큰 소모를 최소화하는 단계적 접근:

1. `get_metadata` + `get_screenshot`으로 구조 파악 (경량)
2. 의미있는 최소 단위 노드만 선별
3. `get_design_context`는 확정된 노드에만 호출 (`excludeScreenshot: true` 기본)
4. 400 에러 시 하위 노드 단위로 분할 호출

### 5.6 개별 스킬 목록

| 스킬 | 역할 | 단독 사용 |
|------|------|:--------:|
| `/fetch-issue <이슈번호>` | Jira 이슈 조회 | O |
| `/branch <이슈번호>` | 이슈 기반 브랜치 생성 | O |
| `/figma <URL>` | Figma 디자인 분석 | O |
| `/lint` | lint + type-check | O |
| `/test` | 테스트 + self-heal 3회 루프 | O |
| `/commit` | staged 기반 커밋 | O |
| `/create-mr` | push + GitLab MR 생성 | O |
| `/code-review` | 코드 리뷰 | O |
| `/metrics` | 하네스 메트릭 확인 | O |
| `/plan` | 기능 기획 | O |
| `/analyze` | 도메인 용어집 + 기능 스펙 | O |
| `/design` | 인터페이스, API 계약, 컴포넌트 구조 | O |
| `/generate <type> <name>` | 파일 스캐폴딩 | O |

## 6. 설정 상세 (Configuration)

### 6.1 harness.config.json

```json
{
  "project": {
    "name": "my-project",
    "framework": { "web": "nextjs", "api": "fiber", "contracts": "hardhat" },
    "packageManager": "pnpm",
    "language": "typescript"
  },
  "architecture": {
    "style": { "web": "fsd", "api": "clean", "contracts": "modular" },
    "enforceIndexGen": true,
    "forbiddenImports": {
      "shared": ["features", "pages", "app"],
      "entities": ["features", "pages", "app"]
    }
  },
  "development": {
    "linter": "biome",
    "formatter": "biome",
    "styling": "styled-components"
  },
  "testing": {
    "runner": { "web": "jest", "api": "go test", "contracts": "hardhat test" },
    "minCoverage": { "statements": 80, "branches": 75, "functions": 80, "lines": 80 },
    "requireTestFileWithImplementation": true
  },
  "agent": {
    "persona": "senior-developer",
    "allowedScopes": ["apps/**/*", "packages/**/*", "tests/**/*", "docs/**/*"],
    "adapters": ["claude"]
  },
  "rules": {
    "fileNaming": { "web": "camelCase", "api": "snake_case", "contracts": "PascalCase" },
    "codingStandards": [
      { "id": "no-hardcoded-secrets", "description": "시크릿을 코드에 하드코딩하지 않는다", "severity": "error" },
      { "id": "no-console-log", "description": "console.log를 디버깅 용도로 남기지 않는다", "severity": "error" }
    ]
  }
}
```

| 설정 | 설명 |
|------|------|
| `project.framework` | 모노레포: 앱별 맵 (`web`/`api`/`contracts`), 폴리레포: 문자열 |
| `architecture.style` | 모노레포: 앱별 맵, 폴리레포: 문자열 |
| `architecture.forbiddenImports` | FSD/Clean 아키텍처 import 제한 — grep 기반 검증 |
| `development.styling` | 에이전트에 스타일링 방식 안내 (룰 파일에 `{{STYLING}}` 플레이스홀더) |
| `testing.runner` | 모노레포: 앱별 맵, 폴리레포: 문자열 |
| `rules.fileNaming` | 모노레포: 앱별 맵, 폴리레포: `{ convention, testSuffix }` |
| `rules.codingStandards` | post-write에서 검증, AutoHarness가 자동 추가 |

### 6.2 외부 서비스 연동

프로젝트 루트의 `.env`에 설정합니다 (`.env.example` 참고). session-init에서 자동 로드됩니다.

| 서비스 | 환경변수 | 용도 |
|--------|---------|------|
| Jira Cloud | `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` | `/start` 이슈 조회 + 상태 변경 |
| GitLab | `GITLAB_URL`, `GITLAB_TOKEN` | `/create-mr` MR 생성 |
| GitLab 프로젝트 | `GITLAB_PROJECT_ID` (선택) | git remote에서 자동 감지, 실패 시 fallback |
| Figma | MCP 연동 | `/figma`에서 기획/디자인 분석 |

**Jira Cloud**: Scoped API Token(ATATT)은 `api.atlassian.com/ex/jira/{cloudId}/rest/api/3/` 경로에서만 동작합니다. `{org}.atlassian.net/rest/api/3/`에 직접 호출하면 401 에러가 발생합니다.

**GitLab 프로젝트 감지**: `git remote get-url origin`에서 `group/project` 경로를 자동 추출합니다 (SSH/HTTPS 둘 다 지원, `sed` 없이 bash 문자열 처리). remote가 없는 경우 `.env`의 `GITLAB_PROJECT_ID`를 사용합니다.

## 7. 메트릭 (Metrics)

### 7.1 수집 데이터

`.harness/metrics.jsonl`에 JSONL 형태로 기록됩니다.

```jsonl
{"ts":"2026-06-16T10:48:27+09:00","hook":"post-write","event":"clean","file":"src/ui/button.tsx","codes":[]}
{"ts":"2026-06-16T10:48:38+09:00","hook":"post-write","event":"error","file":"src/ui/input.tsx","codes":["organizeImports"]}
{"ts":"2026-06-16T10:49:00+09:00","hook":"scope-guard","event":"block","file":"package.json","codes":[]}
```

### 7.2 메트릭 정의

| 메트릭 | 설명 |
|--------|------|
| **차단율** | scope-guard/scaffold-guard가 차단한 횟수 |
| **first-pass** | 파일의 첫 post-write 이벤트가 에러 없이 통과한 비율 |
| **self-heal** | 에러 감지 후 같은 파일이 수정되어 clean으로 전환된 비율 |

### 7.3 확인 방법

세션 시작 시 자동 요약:

```
📊 차단: 12회 | first-pass: 65% | 에러감지: 28회 (최근 7일)
```

`/metrics` 스킬로 상세 확인:

```
📊 Harness Metrics (최근 7일)
─────────────────────────
scope-guard 차단:    12회
scaffold-guard 차단:  3회
post-write 에러 감지: 28회
self-heal 성공:      22/28 (79%)
first-pass 성공:     18/28 (64%)

🔥 가장 많은 에러:
  organizeImports: 9회
  TS2322: 5회
```

## 8. 지원 스택 (Supported Stacks)

### Frontend (8)

Next.js App Router, Next.js Pages Router, React (Vite), Vue (Vite), Nuxt, SvelteKit, Angular, Remix

### Backend (8)

Go (Gin), Go (Fiber), Java (Spring Boot), Python (FastAPI), Python (Django), Node (Express), Node (NestJS), Rust (Axum)

### Blockchain (4)

Solidity (Hardhat), Solidity (Foundry), Solana (Anchor), Move (Sui)

## 9. 트러블슈팅 (Troubleshooting)

### 9.1 stop-review hook 에러 (초기 커밋 없는 프로젝트)

`git diff HEAD`가 exit 128로 실패합니다. 초기 커밋이 없으면 `HEAD`가 존재하지 않기 때문입니다. v0.1.0에서 `git rev-parse HEAD`로 먼저 체크하고, HEAD가 없으면 `git status --short`로 fallback하도록 수정되었습니다.

### 9.2 post-write 에러코드가 비어있음 (`codes":[]`)

biome/eslint 에러코드 추출이 누락되는 경우. v0.1.0에서 linter별 포맷에 맞게 직접 파싱하도록 변경되었다:
- biome: `awk '/━━/ && /\.(ts|tsx)/ {print $2}'`
- eslint: `awk '/error/ {print $NF}'`
- TypeScript: `grep -oE 'TS[0-9]+'`

### 9.3 styled-components 선택했는데 CSS Module로 생성됨

`harness.config.json`의 `development.styling`이 빈 문자열이거나, 룰 파일에 스타일링 방식이 명시되지 않은 경우. v0.1.0에서 모노레포 FE 스택의 style 값을 fallback으로 가져오고, 룰 파일에 `{{STYLING}}` 플레이스홀더를 추가하여 해결되었습니다.

### 9.4 Jest `ts-node` 에러

Jest + TypeScript 조합에서 `jest.config.ts`를 읽으려면 `ts-node`이 필요하다. v0.1.0에서 devDependencies에 `ts-node`을 자동 추가하도록 수정되었습니다. `setupFilesAfterEnv: ['@testing-library/jest-dom']`도 FE jest.config에 자동 포함됩니다.

### 9.5 Go 테스트 파일명 충돌 (`_test.go`)

Go의 `_test.go` 접미사가 fileNaming 규칙(kebab-case)과 충돌합니다. v0.1.0에서 언어 규약으로 강제되는 파일명 패턴(`*_test.go`, `test_*.py`, `mod.rs` 등)은 scaffold-guard 검증을 스킵하도록 수정되었습니다.

### 9.6 Jira API 401 에러

Scoped API Token(ATATT)은 `{org}.atlassian.net/rest/api/3/`에 직접 호출하면 401이 발생합니다. `api.atlassian.com/ex/jira/{cloudId}/rest/api/3/` 경로를 사용해야 합니다. cloudId는 `$JIRA_BASE_URL/_edge/tenant_info`에서 조회합니다.

## 10. 참고문헌 (References)

| 문서 | 설명 | 링크 |
|------|------|------|
| Claude Code Hooks | Claude Code Hook 시스템 공식 문서 | [Hooks Guide](https://docs.anthropic.com/en/docs/claude-code/hooks) |
| Gemini CLI Hooks | Gemini CLI Hook 설정 | [Hooks Reference](https://geminicli.com/docs/hooks/reference/) |
| SWC Registry | Solidity 보안 취약점 목록 | [swcregistry.io](https://swcregistry.io/) |
| Sealevel Attacks | Solana 보안 취약점 목록 | [GitHub](https://github.com/coral-xyz/sealevel-attacks) |
| Agent Skills Standard | SKILL.md 오픈 스탠다드 | [agentskills.io](https://agentskills.io) |
| GitLab Package Registry | npm 패키지 배포 | 내부 인프라 |
| Passbolt | 토큰 관리 | [passbolt.dtechlab.com](https://passbolt.dtechlab.com/) |
