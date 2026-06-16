#!/usr/bin/env bash
# harness: session-init — injects project context on session start
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

CONFIG="$PROJECT_DIR/harness.config.json"

if [ ! -f "$CONFIG" ]; then
  exit 0
fi

# .env 로드 — 환경변수(JIRA_TOKEN 등) 사용 가능하게
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

echo "=== Agent Harness Active ==="
echo ""

# Project summary
FRAMEWORK=$(jq -r '.project.framework' "$CONFIG")
LANGUAGE=$(jq -r '.project.language' "$CONFIG")
ARCH=$(jq -r '.architecture.style' "$CONFIG")
RUNNER=$(jq -r '.testing.runner' "$CONFIG")
PERSONA=$(jq -r '.agent.persona' "$CONFIG")

echo "Project: $(jq -r '.project.name' "$CONFIG")"
echo "Stack: $FRAMEWORK / $LANGUAGE / $ARCH"
echo "Test runner: $RUNNER | Persona: $PERSONA"
echo ""

# Allowed scopes
SCOPES=$(jq -r '.agent.allowedScopes[]' "$CONFIG" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
echo "Allowed scopes: $SCOPES"

# 메트릭 요약 (최근 7일) — WEEK_AGO 이후 라인만 필터
METRICS_FILE="$PROJECT_DIR/.harness/metrics.jsonl"
if [ -f "$METRICS_FILE" ] && [ -s "$METRICS_FILE" ]; then
  WEEK_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d 2>/dev/null || echo "")
  if [ -n "$WEEK_AGO" ]; then
    RECENT=$(awk -v cutoff="$WEEK_AGO" -F'"ts":"' '{split($2,a,"\""); if(a[1]>=cutoff) print}' "$METRICS_FILE")
    if [ -n "$RECENT" ]; then
      BLOCKS=$(printf '%s' "$RECENT" | grep -c '"event":"block"' 2>/dev/null || true)
      ERRORS=$(printf '%s' "$RECENT" | grep -c '"event":"error"' 2>/dev/null || true)
      CLEANS=$(printf '%s' "$RECENT" | grep -c '"event":"clean"' 2>/dev/null || true)
      BLOCKS=${BLOCKS:-0}; ERRORS=${ERRORS:-0}; CLEANS=${CLEANS:-0}
      TOTAL=$((ERRORS + CLEANS))
      if [ "$TOTAL" -gt 0 ]; then
        FP_PCT=$((CLEANS * 100 / TOTAL))
        echo ""
        echo "📊 차단: ${BLOCKS}회 | first-pass: ${FP_PCT}% | 에러감지: ${ERRORS}회 (최근 7일)"
      fi
    fi
  fi
fi

# Forbidden imports
IMPORTS=$(jq -r '.architecture.forbiddenImports | to_entries[] | "  \(.key) → cannot import from \(.value | join(", "))"' "$CONFIG" 2>/dev/null)
if [ -n "$IMPORTS" ]; then
  echo ""
  echo "Import restrictions:"
  echo "$IMPORTS"
fi

# Domain glossary
GLOSSARY="$PROJECT_DIR/domain-glossary.json"
if [ -f "$GLOSSARY" ]; then
  TERM_COUNT=$(jq '.terms | length' "$GLOSSARY")
  TERMS=$(jq -r '.terms | keys[]' "$GLOSSARY" | tr '\n' ', ' | sed 's/,$//')
  echo ""
  echo "Domain glossary ($TERM_COUNT terms): $TERMS"
fi

# GitLab 프로젝트 감지 — git remote → fallback .env
GITLAB_PROJECT=""
if [ -n "${GITLAB_URL:-}" ]; then
  REMOTE_URL=$(git -C "$PROJECT_DIR" remote get-url origin 2>/dev/null || true)
  if [ -n "$REMOTE_URL" ]; then
    # .git 접미사 제거 + group/project 추출 (sed 없이 bash 문자열 처리)
    _R="${REMOTE_URL%.git}"
    # SSH(git@host:group/project) → : 이후 / HTTPS(https://host/group/project) → 호스트 이후
    case "$_R" in
      *://*) _NS="${_R#*://}"; GITLAB_PROJECT="${_NS#*/}" ;;
      *:*)   GITLAB_PROJECT="${_R##*:}" ;;
    esac
  fi
  if [ -z "$GITLAB_PROJECT" ] && [ -n "${GITLAB_PROJECT_ID:-}" ]; then
    GITLAB_PROJECT="$GITLAB_PROJECT_ID"
  fi
  if [ -n "$GITLAB_PROJECT" ]; then
    echo ""
    echo "GitLab: $GITLAB_URL/$GITLAB_PROJECT"
  fi
fi

# SDLC Pipeline status
echo ""
echo "=== 이슈 기반 ==="
echo "/start <이슈번호> → 이슈 조회 → Figma 분석 → 구현 → /done"
echo "/done              → 품질 게이트 → 커밋 → MR 생성"
echo ""
echo "=== 기획부터 ==="
echo "/plan → /analyze → /design → /generate → /done"
echo ""
echo "=== 개별 스킬 ==="
echo "/fetch-issue  /branch  /figma  /lint  /test  /commit  /create-mr"
echo ""

# SDLC 상태 — docs/features/ 기반
FEATURES_DIR="$PROJECT_DIR/docs/features"
FEATURE_COUNT=0; PLAN_COUNT=0; DESIGN_COUNT=0
if [ -d "$FEATURES_DIR" ]; then
  for fd in "$FEATURES_DIR"/*/; do
    [ -d "$fd" ] || continue
    FEATURE_COUNT=$((FEATURE_COUNT + 1))
    [ -f "${fd}plan.json" ] && PLAN_COUNT=$((PLAN_COUNT + 1))
    [ -f "${fd}design.md" ] && DESIGN_COUNT=$((DESIGN_COUNT + 1))
  done
fi

# Learnings
LEARNINGS="$PROJECT_DIR/.harness/learnings.json"
if [ -f "$LEARNINGS" ]; then
  LEARN_COUNT=$(jq '.learnings | length' "$LEARNINGS" 2>/dev/null || echo 0)
  if [ "$LEARN_COUNT" -gt 0 ]; then
    echo ""
    echo "=== Learnings ($LEARN_COUNT) ==="
    jq -r '.learnings[-5:][] | "⚠️ \(.rule)"' "$LEARNINGS" 2>/dev/null
  fi

  # AutoHarness — 반복 에러 패턴 감지 → 규칙 추가 제안
  if [ "$LEARN_COUNT" -ge 3 ]; then
    EXISTING_RULES=$(jq -r '.rules.codingStandards[]?.id // empty' "$CONFIG" 2>/dev/null)
    SUGGESTIONS=""

    FREQ=$(jq -r '.learnings[].mistake' "$LEARNINGS" 2>/dev/null | sort | uniq -c | sort -rn)

    while IFS= read -r line; do
      COUNT=$(echo "$line" | awk '{print $1}')
      CODE=$(echo "$line" | awk '{$1=""; print $0}' | sed 's/^ //')
      [ -z "$CODE" ] && continue
      [ "$COUNT" -lt 3 ] && continue

      RULE_ID="$CODE"
      # 보안 에러는 severity: error, 그 외 warning
      SEV="warning"
      case "$CODE" in SWC-*) SEV="error" ;; esac

      if echo "$EXISTING_RULES" | grep -q "$RULE_ID" 2>/dev/null; then continue; fi

      # config에 자동 추가 — 에러코드를 그대로 ID로 사용
      RULE_JSON="{\"id\":\"${RULE_ID}\",\"description\":\"${RULE_ID}\",\"severity\":\"${SEV}\"}"
      TMPFILE=$(mktemp "$CONFIG.XXXXXX")
      jq --argjson rule "$RULE_JSON" '.rules.codingStandards += [$rule]' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"
      SUGGESTIONS="${SUGGESTIONS}\n  🔧 ${CODE} (${COUNT}회) → \"${RULE_ID}\" 자동 추가됨"
    done <<< "$FREQ"

    if [ -n "$SUGGESTIONS" ]; then
      echo ""
      echo "=== AutoHarness ==="
      printf '%b\n' "$SUGGESTIONS"
    fi
  fi
fi

echo ""
if [ "$FEATURE_COUNT" -gt 0 ]; then
  echo "Features: ${FEATURE_COUNT}개 | Plan: ${PLAN_COUNT} | Design: ${DESIGN_COUNT}"
else
  echo "→ /plan <기능명> 으로 시작하세요"
fi

echo ""
exit 0
