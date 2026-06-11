#!/usr/bin/env bash
# harness: learnings-recorder — errors.log → learnings.json (에러코드 기반 규칙 자동 생성)
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

HARNESS_DIR="$PROJECT_DIR/.harness"
ERRORS_LOG="$HARNESS_DIR/errors.log"
LEARNINGS="$HARNESS_DIR/learnings.json"
MAX_LEARNINGS=20

if [ ! -f "$ERRORS_LOG" ] || [ ! -s "$ERRORS_LOG" ]; then
  exit 0
fi

mkdir -p "$HARNESS_DIR"

if [ ! -f "$LEARNINGS" ]; then
  echo '{"learnings":[]}' > "$LEARNINGS"
fi

DATE=$(date -u +%Y-%m-%d)

# 에러 코드 → 규칙 매핑
error_to_rule() {
  local error="$1"
  local file="$2"

  # TypeScript 에러 코드 매핑
  case "$error" in
    *TS2322*) echo "타입 불일치 — 변수/반환값의 타입과 실제 값이 일치하는지 확인한다 ($file)" ;;
    *TS2345*) echo "인자 타입 불일치 — 함수 호출 시 인자 타입을 확인한다 ($file)" ;;
    *TS2339*) echo "존재하지 않는 속성 — 객체의 속성명과 타입 정의를 확인한다 ($file)" ;;
    *TS2304*) echo "미선언 식별자 — import 누락 또는 오타를 확인한다 ($file)" ;;
    *TS7006*) echo "암시적 any — 파라미터에 타입을 명시한다 ($file)" ;;
    *TS2532*) echo "null/undefined 가능성 — optional chaining 또는 null 체크를 추가한다 ($file)" ;;
    *TS2551*) echo "비슷한 속성명 존재 — 오타를 확인한다 ($file)" ;;
    *TS6133*) echo "미사용 변수 — 선언하고 사용하지 않는 변수를 제거한다 ($file)" ;;
    *TS1005*|*TS1128*) echo "문법 에러 — 괄호, 세미콜론 등 누락을 확인한다 ($file)" ;;
    # Lint 에러 매핑
    *no-explicit-any*) echo "any 타입 사용 금지 — unknown + 타입 가드를 사용한다 ($file)" ;;
    *no-unused-vars*) echo "미사용 변수 — 사용하지 않는 import/변수를 제거한다 ($file)" ;;
    *no-console*) echo "console.log 금지 — 구조화된 로거를 사용한다 ($file)" ;;
    *prefer-const*) echo "재할당 없으면 const — let 대신 const를 사용한다 ($file)" ;;
    # 테스트 실패
    *FAIL*|*failed*) echo "테스트 실패 — 변경 후 관련 테스트가 통과하는지 확인한다 ($file)" ;;
    # 스코프 위반
    *"outside allowed"*) echo "허용 범위 밖 파일 수정 — allowedScopes 안에서만 작업한다" ;;
    # 기본
    *) echo "빌드/린트 에러 발생 — 수정 후 검증한다 ($file)" ;;
  esac
}

# errors.log에서 에러 추출 + 규칙 생성
EXISTING=$(cat "$LEARNINGS")
ADDED=0

while IFS= read -r line; do
  # 에러 라인만 처리
  case "$line" in
    *"❌"*|*"⚠️"*|*"error TS"*|*"error"*|*"FAIL"*|*"no-"*|*"prefer-"*) ;;
    *) continue ;;
  esac
  # 구분선/빈 줄/헤더 줄 스킵
  case "$line" in "---"*|"") continue ;; esac
  case "$line" in *"Type errors in"*|*"Lint errors in"*|*"Architecture violation in"*|*"보안 체크"*) continue ;; esac

  # 파일 경로 추출 (있으면)
  FILE=$(echo "$line" | grep -oE '[a-zA-Z0-9/_.-]+\.(ts|tsx|js|jsx)' | head -1 || echo "")

  # 에러 → 규칙 변환
  MISTAKE=$(echo "$line" | sed 's/^[[:space:]]*//' | sed 's/"/\\"/g' | cut -c1-100)
  RULE=$(error_to_rule "$line" "$FILE")

  # 중복 체크
  DUPLICATE=$(echo "$EXISTING" | jq --arg r "$RULE" '.learnings[] | select(.rule == $r) | .id' 2>/dev/null || true)
  if [ -n "$DUPLICATE" ]; then continue; fi

  COUNT=$(echo "$EXISTING" | jq '.learnings | length')
  NEW_ID="learn-$(date +%s)-$COUNT"

  EXISTING=$(echo "$EXISTING" | jq \
    --arg id "$NEW_ID" --arg date "$DATE" --arg mistake "$MISTAKE" --arg rule "$RULE" \
    --argjson max "$MAX_LEARNINGS" \
    '.learnings += [{"id": $id, "date": $date, "mistake": $mistake, "rule": $rule}] | .learnings = .learnings[-$max:]')

  ADDED=$((ADDED + 1))
done < "$ERRORS_LOG"

if [ "$ADDED" -gt 0 ]; then
  echo "$EXISTING" > "$LEARNINGS"
fi

> "$ERRORS_LOG"
exit 0
