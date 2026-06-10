# Roadmap — Agent Harness

두 프로젝트로 구성:
- **agent-harness-starter** — 프로젝트 스캐폴더 (보일러플레이트 + 초기 하네스 세팅)
- **harness-core** — 런타임 하네스 엔진 (SDLC 파이프라인 + 강제 검증)

---

## Phase 1 — 스캐폴더 ✅

> agent-harness-starter

- [x] 20개 스택 보일러플레이트 (FE 8 + BE 8 + Blockchain 4)
- [x] 모노레포 (Turborepo) + 폴리레포
- [x] Docker, Graphify, README, .env.example 동적 생성
- [x] 7개 에이전트 룰/스킬 템플릿
- [x] 워크플로우 Skills (/start, /done, /review)
- [x] Jira + GitLab 연동
- [x] GitLab Package Registry 배포 (`@frontend-playground/agent-harness-starter`)

---

## Phase 2 — 런타임 하네스 엔진 (진행 중)

> harness-core 기반 + 고도화

### 2-1. Policy Engine (강제 검증)
- [ ] **Scope Guard** — 에이전트가 허용된 폴더 밖 수정 시 차단 (PreToolUse hook)
- [ ] **Scaffold Guard** — 파일 직접 생성 금지, `harness generate`로만 가능
- [ ] **Import Checker** — 아키텍처 경계 위반 자동 감지 (FSD, Clean 등)
- [ ] **Protected Files** — .env, lock 파일, CI 설정 등 수정 차단

### 2-2. Feedback Loop (자동 검증 + 피드백)
- [ ] **PostToolUse → lint + type-check** — 파일 수정할 때마다 자동 실행
- [ ] **Stop → 에이전트 리뷰** — 작업 끝날 때 별도 에이전트가 코드 리뷰
- [ ] **Self-healing Test** — 테스트 실패 → 에러 피드백 → 자동 수정 → 재시도 (최대 3회)
- [ ] **Log Transpiler** — raw 에러 로그를 AI가 읽을 수 있는 구조화 포맷으로 변환

### 2-3. SDLC Pipeline
- [ ] `harness init` — 프로젝트 설정 (harness.config.json 생성)
- [ ] `harness plan` — 기능, 우선순위, 마일스톤 정의
- [ ] `harness analyze` — 도메인 용어집 + 기능 스펙
- [ ] `harness design` — 인터페이스, 목업, API 계약
- [ ] `harness generate` — 아키텍처 준수 파일 생성 (component, hook, util, service, model)
- [ ] `harness test` — self-healing 테스트 실행
- [ ] `harness sync` — config 변경 시 에이전트 설정 자동 재생성

### 2-4. Agent Adapter
- [ ] harness.config.json → 각 에이전트 형식으로 자동 변환
- [ ] Claude, Cursor, Windsurf, Copilot, Aider 어댑터
- [ ] 하나의 config로 모든 에이전트 규칙 통일

---

## Phase 3 — 고도화

### 3-1. Learnings Loop
- [ ] 에이전트 실수 시 자동으로 rules 업데이트 — 같은 실수 구조적 반복 방지
- [ ] 수정 이력을 learnings DB에 축적
- [ ] 프로젝트별 학습된 패턴을 하네스에 반영

### 3-2. Adversarial Multi-Agent
- [ ] Planner → Plan Reviewer (격리된 컨텍스트) → 최대 3회 반복
- [ ] Implementer → Code Reviewer (격리된 컨텍스트) → 최대 3회 반복
- [ ] GO/NO-GO 시그널 — NO-GO 시 롤백
- [ ] filesystem-as-message-bus (feedback.md + git commits)

### 3-3. Intent Verification
- [ ] Spec + 테스트 + 코드 변경 3개 신호 동시 비교 — 의도 이탈 감지
- [ ] Spec-Driven Development — 스펙이 원본, 코드가 빌드 산출물
- [ ] Intent Drift 알림 — 구현이 스펙에서 벗어나면 자동 경고

### 3-4. Computational Sensors
- [ ] `dependency-cruiser` — 아키텍처 위반 자동 감지
- [ ] Coupling 메트릭 추출 — TypeScript Compiler API
- [ ] Mutation Testing (Stryker) — 테스트 품질 검증
- [ ] Inferential Sensors — LLM 기반 모듈성/보안 분석

### 3-5. Progressive Context Loading
- [ ] 전체 rules 한 번에 로드 → 단계별 필요한 것만 로드
- [ ] 토큰 60-95% 절약
- [ ] Trellis 패턴 — monolithic CLAUDE.md → 점진적 스펙 로딩

---

## Phase 4 — Observability & Production

### 4-1. 메트릭
- [ ] OpenTelemetry GenAI 규격 — 토큰 사용량, 지연 시간, 재시도 횟수
- [ ] Task resolution rate, Code churn rate, Defect escape rate
- [ ] Defect tagging — 에이전트 코드 vs 사람 코드 분리 추적

### 4-2. CI/CD 통합
- [ ] CI 실패 로그 → Log Transpiler → 에이전트 자동 피드백
- [ ] Coverage gate — 커버리지 미달 시 MR 차단
- [ ] semantic-release 자동 배포 (Runner 확보 후)

### 4-3. Dashboard
- [ ] 에이전트 행동 대시보드 — 어떤 파일을 얼마나 수정했는지
- [ ] 하네스 효과 측정 — 차단된 위반 수, 자동 수정 성공률
- [ ] 팀별 에이전트 사용 패턴 분석

---

## Phase 5 — 장기 연구

- [ ] **Formal Verification** — Dafny/Verus로 핵심 로직 증명 (82% 성공률)
- [ ] **State Machine Guardrails** — 워크플로우 단계별 도구 제한 (statewright)
- [ ] **AutoHarness** — 에이전트가 자기 하네스를 스스로 생성/개선 (Google DeepMind)
- [ ] **Constitutional SDD** — CWE 취약점 매핑이 포함된 보안 스펙
