#!/usr/bin/env bash
# harness: session-init — injects project context on session start
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

CONFIG="$PROJECT_DIR/harness.config.json"

if [ ! -f "$CONFIG" ]; then
  exit 0
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
    # ts가 WEEK_AGO 이후인 라인만 추출
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

# SDLC Pipeline status
echo ""
echo "=== SDLC Pipeline ==="
echo "1. /plan    → 기능, 우선순위, 마일스톤"
echo "2. /analyze → 도메인 용어집 + 기능 스펙"
echo "3. /design  → 인터페이스, API 계약, 컴포넌트 구조"
echo "4. /generate <type> <name> → 파일 생성 (직접 Write 금지)"
echo "5. /start <이슈번호> → 이슈 기반 작업 시작"
echo "6. /done    → 품질 게이트 + 커밋 + MR"
echo ""

PLAN="no"; GLOSSARY_EXISTS="no"; DESIGN="no"
[ -f "$PROJECT_DIR/docs/plan.json" ] && PLAN="yes"
[ -f "$PROJECT_DIR/domain-glossary.json" ] && GLOSSARY_EXISTS="yes"
[ -d "$PROJECT_DIR/docs/designs" ] && [ "$(ls -A "$PROJECT_DIR/docs/designs" 2>/dev/null)" ] && DESIGN="yes"

# Learnings
LEARNINGS="$PROJECT_DIR/.harness/learnings.json"
if [ -f "$LEARNINGS" ]; then
  LEARN_COUNT=$(jq '.learnings | length' "$LEARNINGS" 2>/dev/null || echo 0)
  if [ "$LEARN_COUNT" -gt 0 ]; then
    echo ""
    echo "=== Learnings ($LEARN_COUNT) ==="
    jq -r '.learnings[-5:][] | "⚠️ \(.rule)"' "$LEARNINGS" 2>/dev/null
  fi
fi

echo ""
echo "Status: Plan=$PLAN | Glossary=$GLOSSARY_EXISTS | Design=$DESIGN"

if [ "$PLAN" = "no" ]; then
  echo "→ Next: /plan"
elif [ "$GLOSSARY_EXISTS" = "no" ]; then
  echo "→ Next: /analyze"
elif [ "$DESIGN" = "no" ]; then
  echo "→ Next: /design"
else
  echo "→ Ready: /generate 또는 /start 로 구현 시작"
fi

echo ""
exit 0
