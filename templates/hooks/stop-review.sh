#!/usr/bin/env bash
# harness: stop-review — build + lint + 변경분 테스트 + scope check
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

CONFIG="$PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

CONTEXT=""
HAS_ERRORS=false

# 1. Build check (TypeScript만)
LANGUAGE=$(jq -r '.project.language // "typescript"' "$CONFIG")
if [ "$LANGUAGE" = "typescript" ]; then
  BUILD_RESULT=$(npx tsc --noEmit --pretty false 2>&1) || true
  ERROR_COUNT=$(echo "$BUILD_RESULT" | grep -c "error TS" || true)
  if [ "$ERROR_COUNT" -gt 0 ]; then
    ERRORS=$(echo "$BUILD_RESULT" | grep "error TS" | head -5)
    CONTEXT="$CONTEXT\n❌ Build: $ERROR_COUNT type errors\n$ERRORS"
    HAS_ERRORS=true
  fi
fi

# 2. Lint check (기본값 none — post-write.sh와 통일)
LINTER=$(jq -r '.development.linter // "none"' "$CONFIG")
case "$LINTER" in
  biome)  LINT_RESULT=$(npx biome check src/ 2>&1) || true ;;
  eslint) LINT_RESULT=$(npx eslint src/ --no-error-on-unmatched-pattern 2>&1) || true ;;
  none)   LINT_RESULT="" ;;
  *)      LINT_RESULT="" ;; # 알 수 없는 linter는 스킵
esac

if [ -n "$LINT_RESULT" ]; then
  LINT_ERRORS=$(echo "$LINT_RESULT" | grep -c "error" || true)
  if [ "$LINT_ERRORS" -gt 0 ]; then
    LINT_SUMMARY=$(echo "$LINT_RESULT" | grep -iE "error|✖|×" | head -3)
    CONTEXT="$CONTEXT\n⚠️ Lint: $LINT_ERRORS errors\n$LINT_SUMMARY"
    HAS_ERRORS=true
  fi
fi

# 3. 변경분 테스트 — runner 화이트리스트 + runner별 분기
RUNNER=$(jq -r '.testing.runner // "vitest"' "$CONFIG")
case "$RUNNER" in
  vitest)
    TEST_RESULT=$(npx vitest run --changed HEAD 2>&1) || true ;;
  jest)
    TEST_RESULT=$(npx jest --changedSince=HEAD 2>&1) || true ;;
  mocha|playwright)
    TEST_RESULT=$(npx "$RUNNER" 2>&1) || true ;;
  *)
    # 알 수 없는 runner는 스킵
    TEST_RESULT="" ;;
esac

if [ -n "$TEST_RESULT" ] && echo "$TEST_RESULT" | grep -qiE "FAIL|failed|✗|×"; then
  FAILED=$(echo "$TEST_RESULT" | grep -iE "FAIL|✗|×" | head -5)
  CONTEXT="$CONTEXT\n❌ Tests failed:\n$FAILED"
  HAS_ERRORS=true
fi

# 4. Scope check
CHANGED=$(git diff --name-only HEAD 2>/dev/null || true)
if [ -n "$CHANGED" ]; then
  set -f
  ALLOWED=$(jq -r '(.agent.allowedScopes // ["src/**/*","tests/**/*"])[]' "$CONFIG" 2>/dev/null || echo "src/**/*")
  ALWAYS_ALLOW="harness.config.json package.json package-lock.json tsconfig.json .gitignore .env.example README.md .npmrc"
  VIOLATIONS=""
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    # 항상 허용 파일
    SKIP=false
    for allow in $ALWAYS_ALLOW; do
      if [ "$file" = "$allow" ]; then SKIP=true; break; fi
    done
    if [ "$SKIP" = true ]; then continue; fi

    # allowedScopes 매칭
    MATCHED=false
    for scope in $ALLOWED; do
      PREFIX="${scope%%/**/*}"
      if [ "$PREFIX" != "$scope" ]; then
        if [[ "$file" == "$PREFIX/"* ]]; then MATCHED=true; break; fi
      else
        if [[ "$file" == $scope ]]; then MATCHED=true; break; fi
      fi
    done
    if [ "$MATCHED" = false ]; then
      VIOLATIONS="$VIOLATIONS\n  $file"
    fi
  done <<< "$CHANGED"
  set +f

  if [ -n "$VIOLATIONS" ]; then
    CONTEXT="$CONTEXT\n⚠️ Scope violations:$VIOLATIONS"
    HAS_ERRORS=true
  fi
fi

# 5. 에러 있으면 errors.log에 축적
if [ "$HAS_ERRORS" = true ]; then
  mkdir -p "$PROJECT_DIR/.harness"
  printf -- "--- %s ---\n%b\n\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$CONTEXT" >> "$PROJECT_DIR/.harness/errors.log"
fi

if [ -n "$CONTEXT" ]; then
  printf "=== Harness Review ===%b\n" "$CONTEXT"
fi

exit 0
