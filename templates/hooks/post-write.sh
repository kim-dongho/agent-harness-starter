#!/usr/bin/env bash
# harness: post-write — lint + type-check + architecture check after file write
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

CONFIG="$CLAUDE_PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

REL_PATH=$(realpath --relative-to="$CLAUDE_PROJECT_DIR" "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
CONTEXT=""

# 1. Lint check (non-blocking — context feedback)
LINTER=$(jq -r '.development.linter // "eslint"' "$CONFIG")
if [ "$LINTER" = "biome" ]; then
  LINT_RESULT=$(npx biome check "$FILE_PATH" 2>&1) || true
else
  LINT_RESULT=$(npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1) || true
fi

if echo "$LINT_RESULT" | grep -qiE "error|✖|×"; then
  LINT_ERRORS=$(echo "$LINT_RESULT" | grep -iE "error|✖|×" | head -5)
  CONTEXT="$CONTEXT\n⚠️ Lint errors in $REL_PATH:\n$LINT_ERRORS"
fi

# 2. Type check (non-blocking — context feedback)
LANGUAGE=$(jq -r '.project.language // "typescript"' "$CONFIG")
if [ "$LANGUAGE" = "typescript" ]; then
  TS_RESULT=$(npx tsc --noEmit --pretty false 2>&1 | grep "$REL_PATH" | head -5) || true
  if [ -n "$TS_RESULT" ]; then
    CONTEXT="$CONTEXT\n⚠️ Type errors in $REL_PATH:\n$TS_RESULT"
  fi
fi

# 3. Import violation check (non-blocking — context feedback)
# dependency-cruiser가 있으면 정적 분석, 없으면 간이 검사
if [ -f "$CLAUDE_PROJECT_DIR/.dependency-cruiser.cjs" ] && command -v npx &>/dev/null; then
  DEP_RESULT=$(npx depcruise --config "$CLAUDE_PROJECT_DIR/.dependency-cruiser.cjs" "$FILE_PATH" 2>&1) || true
  if echo "$DEP_RESULT" | grep -q "error"; then
    DEP_ERRORS=$(echo "$DEP_RESULT" | grep "error" | head -3)
    CONTEXT="$CONTEXT\n⚠️ Architecture violation in $REL_PATH:\n$DEP_ERRORS"
  fi
else
  VIOLATIONS=$(node -e "
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf-8'));
const forbidden = config.architecture?.forbiddenImports ?? {};
if (Object.keys(forbidden).length === 0) process.exit(0);
const filePath = process.argv[2];
try {
  const content = fs.readFileSync(path.resolve(process.argv[3], filePath), 'utf-8');
  const imports = [...content.matchAll(/from\s+['\"]\.?\/?([^'\"]+)['\"]/g)].map(m => m[1]);
  const dir = filePath.split('/').find(d => forbidden[d]);
  if (!dir) process.exit(0);
  const blocked = forbidden[dir];
  const violations = imports.filter(imp => blocked.some(b => imp.includes(b)));
  if (violations.length > 0) {
    console.log(dir + ' cannot import from: ' + violations.join(', '));
  }
} catch {}
" "$CONFIG" "$REL_PATH" "$CLAUDE_PROJECT_DIR" 2>/dev/null || true)

  if [ -n "$VIOLATIONS" ]; then
    CONTEXT="$CONTEXT\n⚠️ Import violation in $REL_PATH: $VIOLATIONS"
  fi
fi

if [ -n "$CONTEXT" ]; then
  echo -e "$CONTEXT"
fi

exit 0
