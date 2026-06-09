# agent-harness-starter

프로젝트 스캐폴딩 + AI 에이전트 하네스를 한번에 세팅하는 CLI 도구.

스택 선택 → 보일러플레이트 생성 → 에이전트 룰/스킬/워크플로우 세팅 → Docker/Graphify → 의존성 설치까지 원스톱.

## Quick Start

```bash
npx @scope/create-ahs
# 또는
node dist/cli.js
```

## 지원 에이전트

| 에이전트       | 룰                                | 스킬 (SKILL.md)     |
| -------------- | --------------------------------- | ------------------- |
| Claude Code    | `.claude/rules/`                  | `.claude/skills/`   |
| Cursor         | `.cursor/rules/*.mdc`             | `.cursor/skills/`   |
| Windsurf       | `.windsurf/rules/*.md`            | `.windsurf/skills/` |
| Cline          | `.clinerules/*.md`                | `.cline/skills/`    |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/skills/`   |
| Aider          | `CONVENTIONS.md`                  | -                   |
| Gemini CLI     | `GEMINI.md`                       | `.gemini/skills/`   |

> SKILL.md는 [Agent Skills 오픈 스탠다드](https://agentskills.io)로, Aider를 제외한 모든 에이전트가 동일한 포맷을 지원합니다.

## 지원 스택 (31개)

### Frontend

Next.js (App/Pages) · React (Vite) · Vue (Vite) · Nuxt · SvelteKit · Angular · Astro · Remix · SolidStart · Qwik

### Backend

Go (Gin/Echo/Fiber) · Java (Spring Boot) · Python (FastAPI/Django/Flask) · Node (Express/NestJS/Hono/Fastify) · Rust (Axum/Actix) · Kotlin (Ktor) · C# (.NET)

### Blockchain

Solidity (Hardhat/Foundry) · Solana (Anchor) · Move (Sui/Aptos) · TON (Tact) · CosmWasm

### Mobile

React Native · Flutter

## 선택 플로우

```
1. 프로젝트 이름
2. AI 에이전트 (Claude / Cursor / Windsurf / Cline / Copilot / Aider / Gemini)
3. Graphify Knowledge Graph (Y/N)
4. Docker (Y/N)
5. 의존성 자동 설치 (Y/N)
6. 이슈 트래커 (Jira / None)
7. 레포 구조 (모노레포 Turborepo / 폴리레포)
8. 스택 선택 (카테고리 → 스택, 모노레포면 복수 선택)
9. 스택별 세부 옵션
   - 언어 (TS/JS)
   - 아키텍처 (FSD, Atomic, Clean, Layered, DDD 등)
   - 패키지 매니저 (npm/pnpm/bun/yarn)
   - 린트 (ESLint+Prettier / Biome)
   - 네이밍 규칙 (kebab-case / PascalCase / camelCase)
   - 스타일링, 상태관리, 테스트, 폼, i18n (FE)
   - ORM, DB, API 스타일, API 문서화 (BE)
   - 네트워크 (Blockchain)
   - 상태관리, 네비게이션 (Mobile)
```

## 생성되는 구조

### 폴리레포

```
my-project/
├── src/                        # 스택 보일러플레이트
├── .claude/                    # AI 에이전트 룰 + 스킬 (Claude 선택 시)
│   ├── CLAUDE.md
│   ├── rules/
│   │   ├── core/               # 공통 규칙 (thinking-model, verify, forbidden-patterns, policy-test)
│   │   └── react/              # 스택별 규칙
│   └── skills/
│       ├── code-review/        # 공통 스킬
│       ├── accessibility/      # FE 스킬
│       ├── start/              # 워크플로우 — 작업 시작
│       ├── done/               # 워크플로우 — 작업 완료
│       └── review/             # 워크플로우 — 코드 리뷰
├── Dockerfile                  # Docker 선택 시
├── docker-compose.yml
├── .graphifyrc                 # Graphify 선택 시
├── .env.example                # 환경변수 템플릿 (Jira 토큰 등)
├── README.md                   # 동적 생성
└── vitest.config.ts            # 테스트 프레임워크 선택 시
```

### 모노레포

```
my-project/
├── apps/
│   ├── web/                    # FE 스택
│   ├── api/                    # BE 스택
│   └── contracts/              # 블록체인 스택
├── packages/
│   ├── typescript-config/      # 공유 tsconfig
│   └── eslint-config/          # 공유 린트 (또는 biome.json)
├── .claude/                    # AI 에이전트 룰
├── turbo.json
├── pnpm-workspace.yaml         # pnpm 선택 시
└── docker-compose.yml          # Docker 선택 시
```

## 워크플로우 Skills

프로젝트 생성 시 워크플로우 스킬이 자동으로 포함됩니다. 이슈 트래커(Jira)와 Git 플랫폼(GitLab)에 맞게 커맨드가 세팅됩니다.

| 스킬                | 설명                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| `/start <이슈번호>` | 이슈 조회 → 상태 변경 → 브랜치 생성 → 분석 → 복잡도 판단 → 구현 계획           |
| `/done`             | 품질 게이트 5단계 (lint → test → 정책 → 범위 → 컨벤션) → 커밋 → push → MR 생성 |
| `/review`           | 금지 패턴 체크 → 정책 검증 → 코드 리뷰 → 심각도별 리포트                       |

### 품질 게이트 (/done)

1. **코드 품질** — lint, type-check 통과
2. **테스트** — 관련 테스트 통과
3. **정책 보호** — 정책 키워드 변경 시 테스트 존재 확인
4. **범위 검증** — 의도하지 않은 파일 변경 없음
5. **컨벤션** — 커밋 메시지, 불필요한 파일 제외

## 에이전트별 동작 차이

### skills 지원 에이전트 (Claude, Cursor, Windsurf, Cline, Copilot, Gemini)

- **rules**: 핵심 규칙만 (짧게, 항상 로드)
- **skills**: 상세 가이드 + 워크플로우 (필요할 때만 로드, 토큰 절약)
- 블록체인 보안 체크리스트는 체인 특화이므로 rules에 포함

### Aider

- **rules**: 보안 포함 전체 규칙 (`CONVENTIONS.md`에 모든 내용 포함)
- skills 미지원이므로 rules에 전부 포함

## 스킬 목록

### 공통

- `code-review` — 코드 리뷰 체크리스트 (보안/성능/에러/유지보수)
- `testing` — 테스트 작성 가이드 (AAA 패턴, 커버리지)
- `commit-convention` — Conventional Commits
- `naming-convention` — 네이밍 컨벤션

### Frontend

- `accessibility` — 웹 접근성 WCAG 체크리스트
- `performance` — Core Web Vitals 최적화
- `seo` — SEO 체크리스트
- `component-convention` — 컴포넌트 작성 컨벤션

### Backend

- `api-design` — REST API 설계 가이드
- `error-handling` — 에러 처리 패턴
- `db-convention` — DB 쿼리/스키마 컨벤션

### Blockchain

- `security-audit` — 스마트 컨트랙트 보안 감사

### Workflow

- `start` — 이슈 기반 작업 시작
- `done` — 품질 게이트 + 커밋 + MR
- `review` — 코드 리뷰 + 정책 검증

## 룰 파일 출처

| 스택        | 출처                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Solidity    | [SWC Registry](https://swcregistry.io/)                                                                                                |
| Solana      | [Sealevel Attacks](https://github.com/coral-xyz/sealevel-attacks)                                                                      |
| Move        | [Hacken Audit Checklist](https://hacken.io/discover/move-smart-contract-audit-checklist/)                                              |
| TON         | [CertiK Tact Security](https://www.certik.com/resources/blog/secure-smart-contract-programming-in-tact-popular-mistakes-in-the-ton)    |
| CosmWasm    | [jcsec Security Spotlight](https://github.com/jcsec-security/cosmwasm-security-spotlight)                                              |
| React       | [React Docs](https://react.dev/)                                                                                                       |
| Agent Rules | [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules), [block/ai-rules](https://github.com/block/ai-rules) |

## 설치 (패키지 사용자)

글로벌 `~/.npmrc`에 registry 설정이 필요합니다. (최초 1회)

```bash
echo -e '@frontend-playground:registry=https://gitlab.dtechlab.com/api/v4/projects/128/packages/npm/\n//gitlab.dtechlab.com/api/v4/projects/128/packages/npm/:_authToken=${GITLAB_FP_NPM_DEPLOY_TOKEN}' >> ~/.npmrc
```

환경변수 `GITLAB_FP_NPM_DEPLOY_TOKEN`은 Passbolt에 등록되어 있습니다. `~/.zshrc`에 추가하세요.

```bash
npx @frontend-playground/agent-harness-starter
```

## 개발

```bash
# 의존성 설치
npm install

# 개발 모드
npm run dev

# 빌드
npm run build

# 로컬 테스트
node dist/cli.js

# Docker 테스트 (95개)
npm run test:docker

# Docker 테스트 (필터)
npx tsx scripts/test-docker.ts monorepo
npx tsx scripts/test-docker.ts go
npx tsx scripts/test-docker.ts astro
```

## 배포

`GITLAB_FP_PROJECT_TOKEN` 환경변수가 필요합니다. Passbolt에 등록되어 있습니다.

```bash
npm version patch && npm run publish:gitlab
```

## 프로젝트 구조

```
src/
├── cli.ts                      # 진입점
├── constants.ts                # 상수 + 매핑
├── prompts/                    # 인터랙티브 프롬프트
│   ├── common.ts               # 공통 (이름, 에이전트, 이슈 트래커, 레포)
│   ├── frontend.ts             # FE 세부 옵션
│   ├── backend.ts              # BE 세부 옵션
│   ├── blockchain.ts           # 블록체인 옵션
│   ├── mobile.ts               # 모바일 옵션
│   └── types.ts                # 타입 정의
├── scaffolder/                 # 스캐폴더 (순서대로)
│   ├── index.ts                # 오케스트레이터
│   ├── project.ts              # Step 1. 프로젝트 생성
│   ├── agent-rules.ts          # Step 2. 에이전트 룰 + 스킬 + 워크플로우
│   ├── graphify.ts             # Graphify 세팅
│   └── utils.ts                # 공통 헬퍼
├── generators/                 # 생성기
│   ├── commands.ts             # CLI 커맨드 매핑
│   ├── manual.ts               # 수동 생성 라우터
│   ├── monorepo.ts             # 모노레포 공유 패키지
│   ├── docker.ts               # Docker 생성
│   ├── readme.ts               # README 생성
│   ├── env.ts                  # .env.example 생성
│   ├── post-process.ts         # 아키텍처/테스트/라이브러리 후처리
│   └── stacks/                 # 스택별 보일러플레이트
│       ├── node.ts
│       ├── go.ts
│       ├── java.ts
│       ├── python.ts
│       ├── rust.ts
│       ├── kotlin.ts
│       ├── dotnet.ts
│       ├── angular.ts
│       ├── frontend.ts
│       └── blockchain.ts
templates/
├── agents/                     # 에이전트별 기본 템플릿 (7개)
├── rules/
│   ├── core/                   # 공통 룰 (5개)
│   └── stack/                  # 스택별 룰 (19개 폴더)
└── skills/                     # SKILL.md 오픈 스탠다드
    ├── common/                 # 공통 스킬 (4개)
    ├── frontend/               # FE 스킬 (4개)
    ├── backend/                # BE 스킬 (3개)
    ├── blockchain/             # 블록체인 스킬 (1개)
    └── workflow/               # 워크플로우 스킬 (3개)
```
