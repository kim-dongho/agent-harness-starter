#!/usr/bin/env bash
# harness: session-init — injects project context on session start
set -euo pipefail

CONFIG="$CLAUDE_PROJECT_DIR/harness.config.json"

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

# Forbidden imports
IMPORTS=$(jq -r '.architecture.forbiddenImports | to_entries[] | "  \(.key) → cannot import from \(.value | join(", "))"' "$CONFIG" 2>/dev/null)
if [ -n "$IMPORTS" ]; then
  echo ""
  echo "Import restrictions:"
  echo "$IMPORTS"
fi

# Domain glossary
GLOSSARY="$CLAUDE_PROJECT_DIR/domain-glossary.json"
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
[ -f "$CLAUDE_PROJECT_DIR/docs/plan.json" ] && PLAN="yes"
[ -f "$CLAUDE_PROJECT_DIR/domain-glossary.json" ] && GLOSSARY_EXISTS="yes"
[ -d "$CLAUDE_PROJECT_DIR/docs/designs" ] && [ "$(ls -A "$CLAUDE_PROJECT_DIR/docs/designs" 2>/dev/null)" ] && DESIGN="yes"

# Learnings
LEARNINGS="$CLAUDE_PROJECT_DIR/.harness/learnings.json"
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
