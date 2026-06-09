# Roadmap — agent-harness-starter

## Phase 1 — 스캐폴딩 ✅

### 프로젝트 생성
- [x] 31개 스택 보일러플레이트 (CLI + 수동 fallback)
  - Frontend: Next.js(App/Pages), React(Vite), Vue(Vite), Nuxt, SvelteKit, Angular, Astro, Remix, SolidStart, Qwik
  - Backend: Go(Gin/Echo/Fiber), Java(Spring), Python(FastAPI/Django/Flask), Node(Express/NestJS/Hono/Fastify), Rust(Axum/Actix), Kotlin(Ktor), C#(.NET)
  - Blockchain: Solidity(Hardhat/Foundry), Solana(Anchor), Move(Sui/Aptos), TON(Tact), CosmWasm
  - Mobile: React Native, Flutter
- [x] 모노레포 (Turborepo + 공유 패키지)
- [x] 폴리레포
- [x] 스택별 세부 옵션 (아키텍처, 린트, 테스트, 스타일, ORM, DB, API 문서 등)
- [x] Docker (Dockerfile + docker-compose.yml, 모노레포 포트 충돌 방지)
- [x] Graphify Knowledge Graph (자동 설치 + 훅)
- [x] 의존성 자동 설치
- [x] README 동적 생성 (Graphify 섹션 포함)
- [x] .env.example 동적 생성 (스택/DB/이슈 트래커별)
- [x] 테스트 프레임워크 설정 (vitest/jest)
- [x] 아키텍처 폴더 생성 (FSD, Atomic, Colocation, Flat, Layered, Clean, DDD, Modular)
- [x] 후처리 — 라이브러리 설치, 아키텍처 스캐폴딩, CLI 기본 폴더 정리

### 에이전트 하네스
- [x] 7개 에이전트 룰 템플릿 (Claude, Cursor, Windsurf, Cline, Copilot, Aider, Gemini)
- [x] 코어 룰 (thinking-model, surgical-changes, verify, forbidden-patterns, policy-test)
- [x] 스택별 룰 19개 폴더 (금지 패턴 포함)
- [x] 블록체인 보안 룰 (SWC, Sealevel, Move, TON, CosmWasm) — 블록체인 스택은 security.md 항상 포함
- [x] SKILL.md 오픈 스탠다드 스킬 (Aider 제외 전 에이전트 지원)
  - common: code-review, testing, commit-convention, naming-convention
  - frontend: accessibility, performance, seo, component-convention
  - backend: api-design, error-handling, db-convention
  - blockchain: security-audit
  - workflow: start, done, review
- [x] 플레이스홀더 치환 ({{PROJECT_NAME}}, {{STACK}}, {{ISSUE_FETCH_COMMAND}}, {{PR_CREATE_COMMAND}} 등)

### 워크플로우 Skills
- [x] `/start` — 이슈 조회 → 브랜치 생성 → 분석 → 복잡도 판단 → 구현 계획
- [x] `/done` — 품질 게이트 5단계 → 커밋 → push → MR 생성 → 이슈 상태 변경
- [x] `/review` — 금지 패턴 체크 → 정책 검증 → 코드 리뷰 → 심각도별 리포트
- [x] 이슈 트래커 연동 (Jira / None)
- [x] Git 플랫폼 (GitLab)
- [x] Jira API 토큰 .env.example 자동 추가

### 검증
- [x] 파일 검증 테스트 (scripts/test-stacks.ts)
- [x] Docker 브루트포스 테스트 95개 (scripts/test-docker.ts)
- [x] 모노레포 Docker 포트 충돌 해결 (테스트별 고유 포트 오프셋)

---

## Phase 2 — 가드레일 & 품질 게이트

- [ ] 에이전트가 못 건드리는 파일 보호 (`.claudeignore` 등)
- [ ] 컨텍스트 최적화 — 에이전트가 안 봐도 되는 파일 제외
- [ ] Git hooks (husky + lint-staged) 자동 세팅
- [ ] CI/CD 파이프라인 자동 생성 (GitLab CI)
- [ ] `.editorconfig` + `.vscode/settings.json` 생성

---

## Phase 3 — 배포 & 확장

- [ ] GitLab Package Registry 배포 (`@scope/agent-harness-starter`)
- [ ] `npx @scope/create-ahs` 로 바로 실행
- [ ] 프리셋 시스템 (팀별 기본 옵션 저장)
- [ ] 플러그인 시스템 (커스텀 스택/룰 추가)
