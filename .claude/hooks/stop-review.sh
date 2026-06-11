#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# stop-review.sh — 에이전트가 응답을 끝내려 할 때 빌드/lint/범위를 최종 검사
#
# 실행 시점: Stop (에이전트가 응답 완료할 때마다)
# 동작:
#   1. TypeScript면 tsc --noEmit으로 전체 빌드 에러 체크
#   2. linter 설정이 있으면 lint 실행 (biome/eslint)
#   3. git diff로 변경 파일이 allowedScopes 안에 있는지 범위 체크
#   4. 에러 있으면 .harness/errors.log에 축적 (learnings-recorder가 이어서 처리)
#   5. 테스트는 여기서 안 돌림 (/done에서만 실행 — 매번 돌리면 너무 느림)
#
# 입력: 없음 (Stop hook은 stdin이 비어있음)
# 출력: 🔧 stop-review: OK / 이슈 발견
# exit 0: 항상 (Stop hook은 차단하지 않고 피드백만)
# ──────────────────────────────────────────────────────────────
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

CONFIG="$PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

CONTEXT=""
HAS_ERRORS=false

# 1. 빌드 체크 — TypeScript일 때만 tsc --noEmit 실행 (~1초)
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

# 2. Lint 체크 — harness.config.json의 linter 설정에 따라
#    biome/eslint만 허용, 그 외 값은 무시 (command injection 방지)
LINTER=$(jq -r '.development.linter // "none"' "$CONFIG")
case "$LINTER" in
  biome)  LINT_RESULT=$(npx biome check src/ 2>&1) || true ;;
  eslint) LINT_RESULT=$(npx eslint src/ --no-error-on-unmatched-pattern 2>&1) || true ;;
  none)   LINT_RESULT="" ;;
  *)      LINT_RESULT="" ;;
esac

if [ -n "$LINT_RESULT" ]; then
  LINT_ERRORS=$(echo "$LINT_RESULT" | grep -c "error" || true)
  if [ "$LINT_ERRORS" -gt 0 ]; then
    LINT_SUMMARY=$(echo "$LINT_RESULT" | grep -iE "error|✖|×" | head -3)
    CONTEXT="$CONTEXT\n⚠️ Lint: $LINT_ERRORS errors\n$LINT_SUMMARY"
    HAS_ERRORS=true
  fi
fi

# 3. 테스트는 /done에서만 실행 (stop-review에서는 빌드+lint+범위만 체크)

# 4. 범위 체크 — 변경 파일이 allowedScopes 안에 있는지 확인
#    git diff --name-only HEAD로 uncommitted 변경 파일 목록을 가져옴
CHANGED=$(git diff --name-only HEAD 2>/dev/null || true)
if [ -n "$CHANGED" ]; then
  set -f  # glob 확장 방지
  ALLOWED=$(jq -r '(.agent.allowedScopes // ["src/**/*","tests/**/*"])[]' "$CONFIG" 2>/dev/null || echo "src/**/*")
  # 루트 설정 파일은 scope 체크에서 제외
  ALWAYS_ALLOW="harness.config.json package.json package-lock.json tsconfig.json .gitignore .env.example README.md .npmrc"
  VIOLATIONS=""
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    # 항상 허용 목록 체크
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
        # dir/**/* 형태 → prefix 매칭
        if [[ "$file" == "$PREFIX/"* ]]; then MATCHED=true; break; fi
      else
        # 그 외 → bash glob 매칭
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

# 5. 에러가 하나라도 있으면 .harness/errors.log에 축적
#    learnings-recorder.sh가 이 파일을 읽어서 learnings.json에 규칙으로 변환
if [ "$HAS_ERRORS" = true ]; then
  mkdir -p "$PROJECT_DIR/.harness"
  printf -- "--- %s ---\n%b\n\n" "$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00)" "$CONTEXT" >> "$PROJECT_DIR/.harness/errors.log"
fi

# 결과 출력
if [ -n "$CONTEXT" ]; then
  echo "🔧 stop-review: 이슈 발견"
  printf "=== Harness Review ===%b\n" "$CONTEXT"
else
  echo "🔧 stop-review: OK — 빌드/린트 통과"
fi

exit 0
