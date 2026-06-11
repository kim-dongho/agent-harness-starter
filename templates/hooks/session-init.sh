#!/usr/bin/env bash
# harness: session-init — injects project context on session start
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

CONFIG="$PROJECT_DIR/harness.config.json"

if [ ! -f "$CONFIG" ]; then
  exit 0
fi

OUT=""
OUT="${OUT}=== Agent Harness Active ===\n\n"

# Project summary
FRAMEWORK=$(jq -r '.project.framework' "$CONFIG")
LANGUAGE=$(jq -r '.project.language' "$CONFIG")
ARCH=$(jq -r '.architecture.style' "$CONFIG")
RUNNER=$(jq -r '.testing.runner' "$CONFIG")
PERSONA=$(jq -r '.agent.persona' "$CONFIG")

OUT="${OUT}Project: $(jq -r '.project.name' "$CONFIG")\n"
OUT="${OUT}Stack: $FRAMEWORK / $LANGUAGE / $ARCH\n"
OUT="${OUT}Test runner: $RUNNER | Persona: $PERSONA\n\n"

# Allowed scopes
SCOPES=$(jq -r '.agent.allowedScopes[]' "$CONFIG" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
OUT="${OUT}Allowed scopes: $SCOPES\n"

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
        OUT="${OUT}\n📊 차단: ${BLOCKS}회 | first-pass: ${FP_PCT}% | 에러감지: ${ERRORS}회 (최근 7일)\n"
      fi
    fi
  fi
fi

# Forbidden imports
IMPORTS=$(jq -r '.architecture.forbiddenImports | to_entries[] | "  \(.key) → cannot import from \(.value | join(", "))"' "$CONFIG" 2>/dev/null)
if [ -n "$IMPORTS" ]; then
  OUT="${OUT}\nImport restrictions:\n${IMPORTS}\n"
fi

# Domain glossary
GLOSSARY="$PROJECT_DIR/domain-glossary.json"
if [ -f "$GLOSSARY" ]; then
  TERM_COUNT=$(jq '.terms | length' "$GLOSSARY")
  TERMS=$(jq -r '.terms | keys[]' "$GLOSSARY" | tr '\n' ', ' | sed 's/,$//')
  OUT="${OUT}\nDomain glossary ($TERM_COUNT terms): $TERMS\n"
fi

# SDLC Pipeline status
OUT="${OUT}\n=== SDLC Pipeline ===\n"
OUT="${OUT}1. /plan    → 기능, 우선순위, 마일스톤\n"
OUT="${OUT}2. /analyze → 도메인 용어집 + 기능 스펙\n"
OUT="${OUT}3. /design  → 인터페이스, API 계약, 컴포넌트 구조\n"
OUT="${OUT}4. /generate <type> <name> → 파일 생성 (직접 Write 금지)\n"
OUT="${OUT}5. /start <이슈번호> → 이슈 기반 작업 시작\n"
OUT="${OUT}6. /done    → 품질 게이트 + 커밋 + MR\n"

PLAN="no"; GLOSSARY_EXISTS="no"; DESIGN="no"
[ -f "$PROJECT_DIR/docs/plan.json" ] && PLAN="yes"
[ -f "$PROJECT_DIR/domain-glossary.json" ] && GLOSSARY_EXISTS="yes"
[ -d "$PROJECT_DIR/docs/designs" ] && [ "$(ls -A "$PROJECT_DIR/docs/designs" 2>/dev/null)" ] && DESIGN="yes"

# Learnings
LEARNINGS="$PROJECT_DIR/.harness/learnings.json"
AUTOHARNESS_MSG=""
if [ -f "$LEARNINGS" ]; then
  LEARN_COUNT=$(jq '.learnings | length' "$LEARNINGS" 2>/dev/null || echo 0)
  if [ "$LEARN_COUNT" -gt 0 ]; then
    OUT="${OUT}\n=== Learnings ($LEARN_COUNT) ===\n"
    OUT="${OUT}$(jq -r '.learnings[-5:][] | "⚠️ \(.rule)"' "$LEARNINGS" 2>/dev/null)\n"
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

      RULE_ID=""; RULE_DESC=""
      case "$CODE" in
        TS2322) RULE_ID="strict-return-type"; RULE_DESC="함수 반환 타입을 반드시 명시한다" ;;
        TS7006) RULE_ID="no-implicit-any"; RULE_DESC="파라미터에 타입을 반드시 명시한다" ;;
        TS2345) RULE_ID="strict-arg-type"; RULE_DESC="함수 호출 시 인자 타입을 확인한다" ;;
        TS2339) RULE_ID="strict-property-access"; RULE_DESC="존재하지 않는 속성 접근을 금지한다" ;;
        TS2532) RULE_ID="strict-null-check"; RULE_DESC="null/undefined 가능성을 반드시 처리한다" ;;
        TS6133) RULE_ID="no-unused-vars"; RULE_DESC="미사용 변수를 선언하지 않는다" ;;
        SWC-115) RULE_ID="no-tx-origin"; RULE_DESC="tx.origin 대신 msg.sender를 사용한다" ;;
        SWC-103) RULE_ID="fixed-pragma"; RULE_DESC="Solidity pragma 버전을 고정한다" ;;
        *) continue ;;
      esac

      if echo "$EXISTING_RULES" | grep -q "$RULE_ID" 2>/dev/null; then continue; fi

      SUGGESTIONS="${SUGGESTIONS}\n  💡 ${CODE} (${COUNT}회) → +\"${RULE_ID}\" (${RULE_DESC})"
    done <<< "$FREQ"

    if [ -n "$SUGGESTIONS" ]; then
      OUT="${OUT}\n=== AutoHarness ===$(printf '%b' "$SUGGESTIONS")\n"
      AUTOHARNESS_MSG="→ 위 규칙을 codingStandards에 추가하시겠습니까?"
    fi
  fi
fi

OUT="${OUT}\nStatus: Plan=$PLAN | Glossary=$GLOSSARY_EXISTS | Design=$DESIGN\n"

if [ "$PLAN" = "no" ]; then
  OUT="${OUT}→ Next: /plan\n"
elif [ "$GLOSSARY_EXISTS" = "no" ]; then
  OUT="${OUT}→ Next: /analyze\n"
elif [ "$DESIGN" = "no" ]; then
  OUT="${OUT}→ Next: /design\n"
else
  OUT="${OUT}→ Ready: /generate 또는 /start 로 구현 시작\n"
fi

# JSON 출력 — systemMessage(사용자 화면) + additionalContext(에이전트 컨텍스트)
USER_MSG=$(printf '%b' "$OUT")
AGENT_MSG="${USER_MSG}"
if [ -n "$AUTOHARNESS_MSG" ]; then
  AGENT_MSG="${AGENT_MSG}\n\n${AUTOHARNESS_MSG}"
fi

jq -n \
  --arg sm "$USER_MSG" \
  --arg ac "$AGENT_MSG" \
  '{ "systemMessage": $sm, "additionalContext": $ac }'

exit 0
