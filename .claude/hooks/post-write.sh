#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# post-write.sh — 에이전트가 파일을 수정한 후 lint + type-check + import 위반을 검사
#
# 실행 시점: PostToolUse (Write | Edit)
# 동작:
#   1. 에이전트가 파일을 수정하거나 생성한 직후 자동 실행
#   2. 수정된 파일에 대해 lint 실행 (biome 또는 eslint, 설정에 따라)
#   3. TypeScript면 tsc --noEmit으로 해당 파일의 타입 에러 검사
#   4. dependency-cruiser가 있으면 아키텍처 위반(forbiddenImports) 감지
#   5. 에러가 있으면 에이전트에 피드백 (차단은 안 함, exit 0)
#
# 입력: stdin으로 JSON — { "tool_input": { "file_path": "..." } }
# 출력: 🔧 post-write: OK / 이슈 발견
# exit 0: 항상 (PostToolUse는 차단하지 않고 피드백만)
# ──────────────────────────────────────────────────────────────
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

# 상대 경로 변환 + path traversal 방어
if [[ "$FILE_PATH" == /* ]]; then
  REL_PATH="${FILE_PATH#${CLAUDE_PROJECT_DIR%/}/}"
else
  REL_PATH="$FILE_PATH"
fi
if [[ "$REL_PATH" == *".."* ]]; then exit 0; fi

CONTEXT=""

# 1. Lint 검사
LINTER=$(jq -r '.development.linter // "none"' "$CONFIG")
case "$LINTER" in
  biome)  LINT_RESULT=$(npx biome check "$FILE_PATH" 2>&1) || true ;;
  eslint) LINT_RESULT=$(npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1) || true ;;
  *)      LINT_RESULT="" ;;
esac

if [ -n "$LINT_RESULT" ] && echo "$LINT_RESULT" | grep -qiE "error|✖|×"; then
  LINT_ERRORS=$(echo "$LINT_RESULT" | grep -iE "error|✖|×" | head -5)
  CONTEXT="$CONTEXT\n⚠️ Lint errors in $REL_PATH:\n$LINT_ERRORS"
fi

# 2. TypeScript 타입 검사
LANGUAGE=$(jq -r '.project.language // "typescript"' "$CONFIG")
if [ "$LANGUAGE" = "typescript" ]; then
  TS_RESULT=$(npx tsc --noEmit --pretty false 2>&1 | grep "$REL_PATH" | head -5) || true
  if [ -n "$TS_RESULT" ]; then
    CONTEXT="$CONTEXT\n⚠️ Type errors in $REL_PATH:\n$TS_RESULT"
  fi
fi

# 3. Import 위반 검사 (dependency-cruiser)
if [ -f "$CLAUDE_PROJECT_DIR/.dependency-cruiser.cjs" ] && command -v npx &>/dev/null; then
  DEP_RESULT=$(npx depcruise --config "$CLAUDE_PROJECT_DIR/.dependency-cruiser.cjs" "$FILE_PATH" 2>&1) || true
  if echo "$DEP_RESULT" | grep -q "error"; then
    DEP_ERRORS=$(echo "$DEP_RESULT" | grep "error" | head -3)
    CONTEXT="$CONTEXT\n⚠️ Architecture violation in $REL_PATH:\n$DEP_ERRORS"
  fi
fi

# 결과 출력
if [ -n "$CONTEXT" ]; then
  echo "🔧 post-write: 이슈 발견 — $REL_PATH"
  echo -e "$CONTEXT"
else
  echo "🔧 post-write: OK — $REL_PATH"
fi

exit 0
