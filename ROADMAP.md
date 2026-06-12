# Roadmap — Agent Harness

---

## Phase 1 — 스캐폴더 ✅

- [x] 20개 스택 보일러플레이트 (FE 8 + BE 8 + Blockchain 4)
- [x] 모노레포 (Turborepo) + 폴리레포
- [x] Docker, Graphify, README, .env.example 동적 생성
- [x] Jira + GitLab 연동
- [x] GitLab Private Package Registry 배포

---

## Phase 2 — 런타임 하네스 엔진 ✅

### 2-1. Policy Engine (강제 검증) ✅
- [x] **Scope Guard** — 에이전트가 허용된 폴더 밖 수정 시 차단 (PreToolUse)
- [x] **Scaffold Guard** — 파일 직접 생성 금지, `/generate`로만 가능 (PreToolUse)
- [x] **Import Checker** — 아키텍처 경계 위반 자동 감지 (PostToolUse)
- [x] **harness.config.json** — 프로젝트 설정 단일 소스 (아키텍처, 스코프, 규칙)

### 2-2. Feedback Loop (자동 검증 + 피드백) ✅
- [x] **PostToolUse → lint + type-check** — 파일 수정할 때마다 자동 실행, 에러 시 피드백
- [x] **Stop → 최종 검증** — 빌드 + lint + 테스트 + 범위 전체 검사
- [x] **Self-healing** — 단순 에러 즉시 자동 수정, 보안 에러는 컨펌 후 수정
- [x] **Log Transpiler** — raw 에러 로그를 구조화 포맷으로 변환

### 2-3. Agent Adapter ✅
- [x] `harness.config.json` → 에이전트별 설정 동적 생성
- [x] 8개 어댑터: Claude, Cursor, Windsurf, Cline, Copilot, Aider, Gemini, Codex CLI
- [x] 하나의 config로 모든 에이전트 규칙 통일 (single source of truth)
- [x] 스택별 rules 파일 분리 + 에이전트별 포맷 변환
- [x] 기존 에이전트 템플릿 제거 → adapter 동적 생성으로 전환

### 2-4. 멀티 에이전트 Hooks ✅
- [x] 7개 에이전트별 hook 설정 자동 생성 (Claude/Gemini/Codex/Cursor/Windsurf/Cline/Copilot)
- [x] 환경변수 `PROJECT_DIR` 통합 폴백 (CLAUDE → GEMINI → CODEX → CURSOR → PWD)
- [x] Gemini: `write_file|replace` matcher + `/commands/*.toml` 커스텀 커맨드
- [x] Codex: `Bash|apply_patch` matcher + `apply_patch` 파싱 지원
- [x] init 재실행 시 adapters 배열 merge (기존 에이전트 유지)

### 2-5. 템플릿 최적화 ✅
- [x] core rules → adapter로 이관 (중복 제거)
- [x] stack rules 최적화 — 1줄 파일 병합, References URL 제거
- [x] skills 중복 제거 (common/code-review 삭제 → workflow/code-review로 통합)

---

## Phase 3 — 고도화

### 3-1. Learnings Loop ✅
- [x] post-write에서 에러 즉시 학습 — `learnings.json`에 바로 기록 (세션 끝까지 안 기다림)
- [x] session-init에서 최근 learnings 자동 주입
- [x] learnings-recorder (Stop hook) — errors.log → learnings.json 변환

### 3-2. AutoHarness ✅
- [x] 반복 에러 3회 이상 감지 → `harness.config.json`에 codingStandards 규칙 자동 추가
- [x] systemMessage로 사용자에게 알림
- [x] session-init에서도 반복 패턴 감지 + 자동 추가
- [x] 에러 코드 → 규칙 매핑 테이블 (TS2322, TS7006, SWC-115 등)

### 3-3. 메트릭 시스템 ✅
- [x] hooks에서 `metrics.jsonl` 자동 수집 (block/error/clean 이벤트)
- [x] self-heal 성공률 — 같은 파일에서 error → clean 추적
- [x] first-pass 성공률 — 파일의 첫 이벤트가 clean인 비율
- [x] `/metrics` skill + CLI 명령어 (`harness metrics`)
- [x] session-init에 최근 7일 메트릭 요약 주입

### 3-4. 블록체인 보안 검사 ✅
- [x] `.sol` — tx.origin(SWC-115), selfdestruct(SWC-106), delegatecall(SWC-112), floating pragma(SWC-103), reentrancy
- [x] `.rs` (Anchor) — unchecked arithmetic, unwrap() in production
- [x] `.move` — public entry without assert!

### 3-5. Progressive Context Loading ✅
- [x] `getStackRuleDirs()`로 config 스택만 필터하여 점진적 로드

### 3-6. Adversarial Multi-Agent ✅
- [x] Stop hook agent가 변경 코드 자동 리뷰 (git diff 기반)
- [x] 리뷰 서브에이전트 자동 생성 — 5개 에이전트
- [x] feedback.md 기반 리뷰 결과 기록 + 이전 피드백 반영 확인

### 3-7. 기존 프로젝트 감지 (init) ✅
- [x] 모노레포 멀티 언어 동시 감지 (TypeScript + Python + Go 등)
- [x] 워크스페이스 하위 패키지 + 루트 1depth 전체 스캔
- [x] languages/stacks/linters 복수 지원
- [x] 패키지 매니저 자동 감지 (npm/pnpm/yarn/bun/go/cargo/pip/poetry/maven/gradle/forge/sui)

### 3-8. 에이전트별 커맨드/스킬 ✅
- [x] Claude: `.claude/skills/*/SKILL.md` → `/code-review`, `/metrics`
- [x] Gemini: `.gemini/commands/*.toml` → `/code-review`, `/metrics`
- [x] Codex: `.codex/skills/*/SKILL.md` → `$code-review`, `$metrics`
- [x] Cursor/Windsurf/Copilot: skills 복사로 자동 포함

---

## Phase 4 — SDLC Pipeline 연동

### 4-1. 워크플로우 스킬 검증
- [ ] `/plan` — 기능 계획 수립 테스트
- [ ] `/analyze` — 도메인 용어집 + 기능 스펙 생성 테스트
- [ ] `/design` — 인터페이스, API 계약 설계 테스트
- [ ] `/generate` — 아키텍처 준수 파일 생성 테스트
- [ ] `/start` — 이슈 조회 → 브랜치 생성 → 구현 계획 테스트
- [ ] `/done` — 품질 게이트 → 커밋 → PR 생성 테스트

### 4-2. 이슈 트래커 연동
- [ ] Jira MCP 연동 — `/start`에서 이슈 조회 + 상태 변경
- [ ] GitLab MCP 연동 — `/done`에서 MR 자동 생성
- [ ] GitHub Issues 연동

### 4-3. CI/CD 통합
- [ ] CI 실패 로그 → Log Transpiler → 에이전트 자동 피드백
- [ ] Coverage gate — 커버리지 미달 시 MR 차단
- [ ] semantic-release 자동 배포 (Runner 확보 후)

---

## Phase 5 — 장기 연구

- [ ] **Trellis 통합** — 멀티 에이전트 워크플로우 프레임워크와 하네스 연동
- [ ] **State Machine Guardrails** — SDLC 단계별 도구 제한 (plan 단계에서 Write 금지 등)
- [ ] **Defect Tagging** — 에이전트 코드 vs 사람 코드 분리 추적
