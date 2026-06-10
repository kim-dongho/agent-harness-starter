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

echo ""
exit 0
