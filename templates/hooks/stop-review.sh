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

# 5. 테스트 파일 존재 여부 체크 (requireTestFileWithImplementation이 true일 때)
REQUIRE_TEST=$(jq -r '.testing.requireTestFileWithImplementation // false' "$CONFIG" 2>/dev/null)
if [ "$REQUIRE_TEST" = "true" ] && [ -n "$CHANGED" ]; then
  TEST_SUFFIX=$(jq -r '.rules.fileNaming.testSuffix // ".test"' "$CONFIG" 2>/dev/null)
  MISSING_TESTS=""
  while IFS= read -r file; do
    # 테스트 불필요 파일 제외
    case "$file" in
      # 테스트 파일 자체
      *"${TEST_SUFFIX}"*) continue ;;
      # 설정/메타 파일
      *.config.*|*/index.*|*.json|*.md|*.sh|*.yml|*.yaml|*.toml|*.css|*.scss) continue ;;
      # FE: 페이지, 레이아웃, UI 컴포넌트 — 통합/E2E로 테스트
      */page.*|*/layout.*|*/loading.*|*/error.*|*/not-found.*) continue ;;
      */components/*|*/ui/*) continue ;;
      # BE: DTO, types, interfaces
      */dto/*|*/dtos/*|*/types/*|*/interfaces/*) continue ;;
      # Blockchain: deploy 스크립트
      */scripts/*) continue ;;
    esac
    # 테스트 대상 파일만 (.ts/.tsx/.js/.jsx)
    case "$file" in
      *.ts|*.tsx|*.js|*.jsx) ;;
      *) continue ;;
    esac
    # 테스트 파일 경로 추정
    BASE=$(echo "$file" | sed "s/\.[^.]*$/${TEST_SUFFIX}&/")
    if [ ! -f "$PROJECT_DIR/$BASE" ]; then
      MISSING_TESTS="$MISSING_TESTS\n  $file → $BASE"
    fi
  done <<< "$CHANGED"

  if [ -n "$MISSING_TESTS" ]; then
    CONTEXT="$CONTEXT\n⚠️ 테스트 파일 누락:$MISSING_TESTS"
    HAS_ERRORS=true
  fi
fi

# 6. 에러 있으면 errors.log에 축적
if [ "$HAS_ERRORS" = true ]; then
  mkdir -p "$PROJECT_DIR/.harness"
  printf -- "--- %s ---\n%b\n\n" "$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00)" "$CONTEXT" >> "$PROJECT_DIR/.harness/errors.log"
fi

if [ -n "$CONTEXT" ]; then
  printf "=== Harness Review ===%b\n" "$CONTEXT"
fi

exit 0
