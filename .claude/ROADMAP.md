# Roadmap — Agent Harness

두 프로젝트로 구성:
- **agent-harness-starter** — 프로젝트 스캐폴더 (보일러플레이트 + 하네스 세팅)
- **harness-core** — 런타임 하네스 엔진 (참고용)

---

## Phase 1 — 스캐폴더 ✅

- [x] 20개 스택 보일러플레이트 (FE 8 + BE 8 + Blockchain 4)
- [x] 모노레포 (Turborepo) + 폴리레포
- [x] Docker, Graphify, README, .env.example 동적 생성
- [x] Jira + GitLab 연동
- [x] GitLab Package Registry 배포 (`@frontend-playground/agent-harness-starter@0.1.0`)

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
- [x] **Self-healing Test** — /done에서 테스트 실패 → 자동 수정 루프 (최대 3회)
- [x] **Log Transpiler** — raw 에러 로그를 구조화 포맷으로 변환

### 2-3. SDLC Pipeline ✅
- [x] `/plan` skill — 기능, 우선순위, 마일스톤
- [x] `/analyze` skill — 도메인 용어집 + 기능 스펙
- [x] `/design` skill — 인터페이스, API 계약, 컴포넌트 구조
- [x] `/generate` skill — 아키텍처 준수 파일 생성
- [x] `/start` skill — 이슈 기반 작업 시작 (Jira + Figma MCP)
- [x] `/done` skill — 품질 게이트 5단계 + 커밋 + MR
- [x] `/review` skill — 코드 리뷰 + 정책 검증
- [x] **session-init** — 세션 시작 시 파이프라인 상태 표시 + 다음 단계 안내

### 2-4. Agent Adapter ✅
- [x] `harness.config.json` → 에이전트별 설정 동적 생성
- [x] 8개 어댑터: Claude, Cursor, Windsurf, Cline, Copilot, Aider, Gemini, **Codex CLI**
- [x] 하나의 config로 모든 에이전트 규칙 통일 (single source of truth)
- [x] 스택별 rules 파일 분리 (stack.md → stack/{name}.md)
- [x] Aider: `.aider.conf.yml` read 옵션으로 스택별 파일 분리
- [x] Gemini: `@import` 문법으로 스택별 파일 모듈화
- [x] 5개 에이전트에 리뷰 서브에이전트 자동 생성 (Claude, Codex, Gemini, Cursor, Copilot)
- [x] 기존 에이전트 템플릿 제거 → adapter 동적 생성으로 전환

### 2-5. 템플릿 최적화 ✅
- [x] core rules 5개 → adapter로 이관 (중복 제거)
- [x] stack rules 최적화 — 1줄 파일 병합, References URL 제거
- [x] skills 21개 → 10개 정리 (중복/stack rules 이관)
- [x] vitest 단위 테스트 29개 (어댑터 + 서브에이전트 검증)

---

## Phase 3 — 고도화

### 3-1. Learnings Loop ✅
- [x] Stop hook에서 에러 발생 시 `.harness/errors.log`에 자동 축적
- [x] agent hook이 errors.log 분석 → `.harness/learnings.json`에 규칙 기록
- [x] session-init에서 최근 learnings 자동 주입
- [x] `/learn` skill — 수동 학습 기록도 가능
- [x] 에러 없으면 토큰 0 (조건부 실행)

### 3-2. Adversarial Multi-Agent ✅ (기본) / ⬜ (고도화)
- [x] Stop hook agent가 변경 코드 자동 리뷰 (git diff 기반) — Claude
- [x] 리뷰 서브에이전트 자동 생성 — Codex(.toml), Gemini/Cursor/Copilot(.md)
- [x] 문제 발견 시 ok: false → 원래 에이전트가 수정
- [x] 무한 루프 방지 — review-count 3회 초과 시 스킵
- [x] learnings loop과 하나의 agent hook에 통합 (토큰 절약)
- [x] **고도화: filesystem-as-message-bus** — feedback.md 기반 리뷰 결과 기록 + 이전 피드백 반영 확인
- [x] **고도화: Plan Review** — /plan skill에 리뷰 단계 추가 + 5개 에이전트에 plan-reviewer 서브에이전트 생성

### 3-3. Intent Verification ✅
- [x] Spec + 테스트 + 코드 변경 3개 신호 동시 비교 — 의도 이탈 감지
- [x] Intent Drift 알림 — 구현이 스펙에서 벗어나면 자동 경고

### 3-4. Computational Sensors ✅
- [x] `dependency-cruiser` — 아키텍처 위반 자동 감지 (설정 파일 + devDependency + post-write hook 연동)
- [x] Coupling 메트릭 추출 (dependency-cruiser에 포함)
- [x] Mutation Testing (Stryker) — 설정 파일 + devDependency 자동 생성 (JS/TS 스택)

### 3-5. Progressive Context Loading ✅
- [x] 단계별 필요한 규칙만 로드 (토큰 60-95% 절약)
- [x] Trellis 패턴 — getStackRuleDirs()로 config 스택만 필터하여 점진적 로드

### 3-6. Skills 최적화 ✅
- [x] 21개 → 10개 정리 (중복/stack rules 이관)
- [x] frontend/, backend/ skills 폴더 제거

---

## Phase 4 — Observability & Production

### 4-1. 메트릭
- [ ] 하네스 차단율, self-healing 성공률, first-pass 성공률
- [ ] Defect tagging — 에이전트 코드 vs 사람 코드 분리 추적

### 4-2. CI/CD 통합
- [ ] CI 실패 로그 → Log Transpiler → 에이전트 자동 피드백
- [ ] Coverage gate — 커버리지 미달 시 MR 차단
- [ ] semantic-release 자동 배포 (Runner 확보 후)

---

## Phase 5 — 장기 연구

- [ ] **Formal Verification** — Dafny/Verus로 핵심 로직 증명
- [ ] **AutoHarness** — 에이전트가 자기 하네스를 스스로 생성/개선
- [ ] **State Machine Guardrails** — 워크플로우 단계별 도구 제한
