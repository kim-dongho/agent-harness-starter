#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# learnings-recorder.sh — 에러 로그를 분석하여 학습 규칙을 자동 생성
#
# 실행 시점: Stop (stop-review.sh 직후)
# 동작:
#   1. .harness/errors.log를 읽음 (stop-review가 에러를 축적한 파일)
#   2. 에러 코드(TS2322, no-explicit-any 등)를 매핑 테이블로 규칙 변환
#   3. .harness/learnings.json에 규칙 추가 (최대 20개, 초과 시 오래된 것 삭제)
#   4. 중복 규칙은 스킵
#   5. errors.log를 비움
#   6. 다음 세션 시작 시 session-init이 learnings.json을 읽어서 에이전트에 주입
#
# 매핑 테이블:
#   TS2322 → "타입 불일치 — 변수/반환값의 타입과 실제 값이 일치하는지 확인"
#   TS7006 → "암시적 any — 파라미터에 타입을 명시한다"
#   no-explicit-any → "any 타입 사용 금지 — unknown + 타입 가드를 사용"
#   등등...
#
# 입력: 없음 (errors.log 파일을 직접 읽음)
# 출력: 🔧 learnings: N개 규칙 자동 기록 / 새 에러 없음
# ──────────────────────────────────────────────────────────────
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

HARNESS_DIR="$PROJECT_DIR/.harness"
ERRORS_LOG="$HARNESS_DIR/errors.log"
LEARNINGS="$HARNESS_DIR/learnings.json"
MAX_LEARNINGS=20

# errors.log 없거나 비어있으면 스킵
if [ ! -f "$ERRORS_LOG" ] || [ ! -s "$ERRORS_LOG" ]; then
  echo "🔧 learnings: 새 에러 없음"
  exit 0
fi

mkdir -p "$HARNESS_DIR"

# learnings.json 없으면 초기화
if [ ! -f "$LEARNINGS" ]; then
  echo '{"learnings":[]}' > "$LEARNINGS"
fi

DATE=$(date -u +%Y-%m-%d)

# ── 에러 코드 → 규칙 매핑 테이블 ──
# TypeScript 에러, lint 규칙, 테스트 실패 등을 사람이 읽을 수 있는 규칙으로 변환
error_to_rule() {
  local error="$1"
  local file="$2"

  case "$error" in
    # TypeScript 에러 코드
    *TS2322*) echo "타입 불일치 — 변수/반환값의 타입과 실제 값이 일치하는지 확인한다 ($file)" ;;
    *TS2345*) echo "인자 타입 불일치 — 함수 호출 시 인자 타입을 확인한다 ($file)" ;;
    *TS2339*) echo "존재하지 않는 속성 — 객체의 속성명과 타입 정의를 확인한다 ($file)" ;;
    *TS2304*) echo "미선언 식별자 — import 누락 또는 오타를 확인한다 ($file)" ;;
    *TS7006*) echo "암시적 any — 파라미터에 타입을 명시한다 ($file)" ;;
    *TS2532*) echo "null/undefined 가능성 — optional chaining 또는 null 체크를 추가한다 ($file)" ;;
    *TS2551*) echo "비슷한 속성명 존재 — 오타를 확인한다 ($file)" ;;
    *TS6133*) echo "미사용 변수 — 선언하고 사용하지 않는 변수를 제거한다 ($file)" ;;
    *TS1005*|*TS1128*) echo "문법 에러 — 괄호, 세미콜론 등 누락을 확인한다 ($file)" ;;
    # Lint 규칙
    *no-explicit-any*) echo "any 타입 사용 금지 — unknown + 타입 가드를 사용한다 ($file)" ;;
    *no-unused-vars*) echo "미사용 변수 — 사용하지 않는 import/변수를 제거한다 ($file)" ;;
    *no-console*) echo "console.log 금지 — 구조화된 로거를 사용한다 ($file)" ;;
    *prefer-const*) echo "재할당 없으면 const — let 대신 const를 사용한다 ($file)" ;;
    # 테스트 실패
    *FAIL*|*failed*) echo "테스트 실패 — 변경 후 관련 테스트가 통과하는지 확인한다 ($file)" ;;
    # 스코프 위반
    *"outside allowed"*) echo "허용 범위 밖 파일 수정 — allowedScopes 안에서만 작업한다" ;;
    # 매칭 안 되면 기본 규칙
    *) echo "빌드/린트 에러 발생 — 수정 후 검증한다 ($file)" ;;
  esac
}

# errors.log 한 줄씩 읽으면서 규칙 생성
EXISTING=$(cat "$LEARNINGS")
ADDED=0

while IFS= read -r line; do
  # 에러 관련 라인만 처리
  case "$line" in
    *"❌"*|*"⚠️"*|*"error TS"*|*"error"*|*"FAIL"*|*"no-"*|*"prefer-"*) ;;
    *) continue ;;
  esac
  # 구분선/빈 줄 스킵
  case "$line" in "---"*|"") continue ;; esac

  # 파일 경로 추출 (ts/tsx/js/jsx 파일명)
  FILE=$(echo "$line" | grep -oE '[a-zA-Z0-9/_.-]+\.(ts|tsx|js|jsx)' | head -1 || echo "")

  # 에러 → 규칙 변환
  MISTAKE=$(echo "$line" | sed 's/^[[:space:]]*//' | sed 's/"/\\"/g' | cut -c1-100)
  RULE=$(error_to_rule "$line" "$FILE")

  # 중복 체크 — 같은 rule이 이미 있으면 스킵
  DUPLICATE=$(echo "$EXISTING" | jq --arg r "$RULE" '.learnings[] | select(.rule == $r) | .id' 2>/dev/null || true)
  if [ -n "$DUPLICATE" ]; then continue; fi

  # 고유 ID 생성 (타임스탬프 + 카운터)
  COUNT=$(echo "$EXISTING" | jq '.learnings | length')
  NEW_ID="learn-$(date +%s)-$COUNT"

  # learnings 배열에 추가 + 최대 개수 유지
  EXISTING=$(echo "$EXISTING" | jq \
    --arg id "$NEW_ID" --arg date "$DATE" --arg mistake "$MISTAKE" --arg rule "$RULE" \
    --argjson max "$MAX_LEARNINGS" \
    '.learnings += [{"id": $id, "date": $date, "mistake": $mistake, "rule": $rule}] | .learnings = .learnings[-$max:]')

  ADDED=$((ADDED + 1))
done < "$ERRORS_LOG"

# 결과 저장
if [ "$ADDED" -gt 0 ]; then
  echo "$EXISTING" > "$LEARNINGS"
  echo "🔧 learnings: ${ADDED}개 규칙 자동 기록"
else
  echo "🔧 learnings: 새 에러 없음"
fi

# errors.log 비우기 (처리 완료)
> "$ERRORS_LOG"
exit 0
