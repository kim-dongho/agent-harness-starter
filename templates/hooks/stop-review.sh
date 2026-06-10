#!/usr/bin/env bash
# harness: stop-review — final verification when agent finishes work
# 에러 발견 시 .harness/errors.log에 축적하여 learnings loop에 활용
set -euo pipefail

CONFIG="$CLAUDE_PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

CONTEXT=""
HAS_ERRORS=false

# 1. Build check
LANGUAGE=$(jq -r '.project.language // "typescript"' "$CONFIG")
if [ "$LANGUAGE" = "typescript" ]; then
  BUILD_RESULT=$(npx tsc --noEmit --pretty false 2>&1) || true
  ERROR_COUNT=$(echo "$BUILD_RESULT" | grep -c "error TS" || true)
  if [ "$ERROR_COUNT" -gt 0 ]; then
    ERRORS=$(echo "$BUILD_RESULT" | grep "error TS" | head -10)
    CONTEXT="$CONTEXT\n❌ Build failed — $ERROR_COUNT type errors:\n$ERRORS"
    HAS_ERRORS=true
  fi
fi

# 2. Lint check
LINTER=$(jq -r '.development.linter // "eslint"' "$CONFIG")
if [ "$LINTER" = "biome" ]; then
  LINT_RESULT=$(npx biome check src/ 2>&1) || true
else
  LINT_RESULT=$(npx eslint src/ --no-error-on-unmatched-pattern 2>&1) || true
fi

LINT_ERRORS=$(echo "$LINT_RESULT" | grep -c "error" || true)
if [ "$LINT_ERRORS" -gt 0 ]; then
  LINT_SUMMARY=$(echo "$LINT_RESULT" | grep -iE "error|✖|×" | head -5)
  CONTEXT="$CONTEXT\n⚠️ Lint errors ($LINT_ERRORS):\n$LINT_SUMMARY"
  HAS_ERRORS=true
fi

# 3. Test check
RUNNER=$(jq -r '.testing.runner // "vitest"' "$CONFIG")
if command -v npx &>/dev/null; then
  TEST_RESULT=$(npx $RUNNER run --reporter=verbose 2>&1) || true
  if echo "$TEST_RESULT" | grep -qiE "FAIL|failed|✗|×"; then
    FAILED=$(echo "$TEST_RESULT" | grep -iE "FAIL|✗|×" | head -5)
    CONTEXT="$CONTEXT\n❌ Tests failed:\n$FAILED"
    HAS_ERRORS=true
  fi
fi

# 4. Scope check
CHANGED=$(git diff --name-only HEAD 2>/dev/null || true)
if [ -n "$CHANGED" ]; then
  SCOPE_VIOLATIONS=$(node -e "
const fs = require('fs');
const {minimatch} = require('minimatch');
const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf-8'));
const scopes = config.agent?.allowedScopes ?? ['src/**/*', 'tests/**/*'];
const alwaysAllow = ['harness.config.json', 'package.json', 'tsconfig.json', '.gitignore', '.env.example', 'README.md'];
const files = process.argv.slice(2);
const violations = files.filter(f => {
  if (alwaysAllow.some(a => f === a || f.endsWith('/' + a))) return false;
  return !scopes.some(s => minimatch(f, s));
});
if (violations.length > 0) console.log(violations.join('\n'));
" "$CONFIG" $CHANGED 2>/dev/null || true)

  if [ -n "$SCOPE_VIOLATIONS" ]; then
    CONTEXT="$CONTEXT\n⚠️ Files modified outside allowed scopes:\n$SCOPE_VIOLATIONS"
    HAS_ERRORS=true
  fi
fi

# 5. 에러 있으면 .harness/errors.log에 축적 (learnings loop용)
if [ "$HAS_ERRORS" = true ]; then
  mkdir -p "$CLAUDE_PROJECT_DIR/.harness"
  echo -e "--- $(date -u +%Y-%m-%dT%H:%M:%SZ) ---$CONTEXT\n" >> "$CLAUDE_PROJECT_DIR/.harness/errors.log"
fi

if [ -n "$CONTEXT" ]; then
  echo -e "=== Harness Final Review ===$CONTEXT"
fi

exit 0
