#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# post-write.sh — 파일 수정 후 lint + type-check + import 위반 + 블록체인 보안 검사
#
# 실행 시점: PostToolUse (Write | Edit)
# 동작:
#   1. lint 검사 (biome/eslint, 설정에 따라)
#   2. TypeScript type-check
#   3. 아키텍처 import 위반 검사 (dependency-cruiser 또는 간이)
#   4. 블록체인 파일(.sol, .rs, .move)이면 보안 패턴 자동 검사
#   5. 에러가 있으면 에이전트에 피드백 (차단 안 함)
#
# exit 0: 항상 (피드백만 제공)
# ──────────────────────────────────────────────────────────────
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

_metric() { mkdir -p "$PROJECT_DIR/.harness"; printf '{"ts":"%s","hook":"post-write","event":"%s","file":"%s","codes":%s}\n' "$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00)" "$1" "$2" "${3:-[]}" >> "$PROJECT_DIR/.harness/metrics.jsonl"; }

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '
  def patch_path:
    capture("\\*\\*\\* (Add|Update|Delete) File: (?<path>[^\\n]+)")?.path // empty;
  .tool_input.file_path //
  .tool_input.path //
  (.tool_input.patch // .tool_input.input // .tool_input | strings | patch_path) //
  empty
')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

CONFIG="$PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

# 상대 경로 변환 + path traversal 방어
if [[ "$FILE_PATH" == /* ]]; then
  REL_PATH="${FILE_PATH#${PROJECT_DIR%/}/}"
else
  REL_PATH="$FILE_PATH"
  FILE_PATH="$PROJECT_DIR/$REL_PATH"
fi
if [[ "$REL_PATH" == *".."* ]]; then exit 0; fi
# $FILE_PATH가 프로젝트 디렉토리 내부인지 검증
case "$FILE_PATH" in
  "${PROJECT_DIR}"/*) ;; # OK
  *) exit 0 ;; # 프로젝트 외부 경로 — 무시
esac

CONTEXT=""
ECODES=""
_add_codes() { ECODES="$ECODES $*"; }

# 0. Auto-format — 파일 수정 후 자동 포맷팅 (포맷터가 설치된 경우에만)
FORMATTER=$(jq -r '.development.formatter // "none"' "$CONFIG")
case "$FORMATTER" in
  biome)  command -v npx &>/dev/null && npx biome format --write "$FILE_PATH" &>/dev/null || true ;;
  prettier) command -v npx &>/dev/null && npx prettier --write "$FILE_PATH" &>/dev/null || true ;;
  *) ;;
esac

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
  # linter별 에러코드 추출
  case "$LINTER" in
    biome)  _add_codes $(echo "$LINT_RESULT" | awk '/━━/ && /\.(ts|tsx|js|jsx|css|json)/ {print $2}') ;;
    eslint) _add_codes $(echo "$LINT_RESULT" | awk '/error/ {print $NF}') ;;
  esac
fi

# 2. TypeScript type-check
LANGUAGE=$(jq -r '.project.language // "typescript"' "$CONFIG")
if [ "$LANGUAGE" = "typescript" ]; then
  TS_RESULT=$(npx tsc --noEmit --pretty false 2>&1 | grep "$REL_PATH" | head -5) || true
  if [ -n "$TS_RESULT" ]; then
    CONTEXT="$CONTEXT\n⚠️ Type errors in $REL_PATH:\n$TS_RESULT"
    _add_codes $(echo "$TS_RESULT" | grep -oE 'TS[0-9]+')
  fi
fi

# 3. Import 위반 검사 — harness.config.json의 forbiddenImports로 직접 검증
FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
if [ -n "$FILE_CONTENT" ]; then
  FORBIDDEN=$(jq -r '.architecture.forbiddenImports | to_entries[]? | "\(.key):\(.value[])"' "$CONFIG" 2>/dev/null)
  for RULE in $FORBIDDEN; do
    FROM_DIR=$(echo "$RULE" | cut -d: -f1)
    TO_DIR=$(echo "$RULE" | cut -d: -f2)
    if echo "$REL_PATH" | grep -q "$FROM_DIR"; then
      if printf '%s' "$FILE_CONTENT" | grep -qE "from.*['\"].*${TO_DIR}|import.*${TO_DIR}|require.*${TO_DIR}|from ${TO_DIR}"; then
        CONTEXT="$CONTEXT\n⚠️ Import 위반: $FROM_DIR → $TO_DIR 금지 ($REL_PATH)"
      fi
    fi
  done
fi

# 4. 블록체인 보안 자동 검사 — .sol, .rs (Anchor), .move 파일일 때
case "$REL_PATH" in
  *.sol)
    # Solidity 보안 패턴 검사
    CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
    SEC=""
    # reentrancy: .call{value 있고 그 다음 줄에 상태 변경(=)이 있는지 — 두 단계 grep (macOS 호환)
    if printf '%s' "$CONTENT" | grep -q '\.call{value'; then
      # .call{value 이후 줄에 = 가 있으면 CEI 위반 가능성
      CALL_LINE=$(printf '%s' "$CONTENT" | grep -n '\.call{value' | head -1 | cut -d: -f1)
      if [ -n "$CALL_LINE" ]; then
        AFTER=$(printf '%s' "$CONTENT" | tail -n +"$((CALL_LINE + 1))" | head -5)
        if printf '%s' "$AFTER" | grep -q '='; then
          SEC="$SEC\n  - ⚠️ Reentrancy 위험: 외부 호출(.call) 후 상태 변경 감지. CEI 패턴 확인 필요"
        fi
      fi
    fi
    # tx.origin 사용
    if printf '%s' "$CONTENT" | grep -q 'tx\.origin'; then
      SEC="$SEC\n  - 🚫 tx.origin 사용 감지 — msg.sender 사용을 권장합니다 (SWC-115)"
    fi
    # selfdestruct 사용
    if printf '%s' "$CONTENT" | grep -q 'selfdestruct'; then
      SEC="$SEC\n  - ⚠️ selfdestruct 사용 감지 — 접근 제어 확인 필요 (SWC-106)"
    fi
    # delegatecall 사용
    if printf '%s' "$CONTENT" | grep -q 'delegatecall'; then
      SEC="$SEC\n  - ⚠️ delegatecall 사용 감지 — 신뢰할 수 있는 대상인지 확인 (SWC-112)"
    fi
    # floating pragma
    if printf '%s' "$CONTENT" | grep -qE 'pragma solidity \^'; then
      SEC="$SEC\n  - ⚠️ floating pragma 감지 — 버전 고정을 권장합니다 (SWC-103)"
    fi
    if [ -n "$SEC" ]; then
      CONTEXT="$CONTEXT\n🔒 Solidity 보안 체크 ($REL_PATH):$SEC"
      _add_codes $(printf '%s' "$SEC" | grep -oE 'SWC-[0-9]+')
    fi
    ;;

  *.rs)
    # Rust/Anchor 보안 패턴 검사 — anchor_lang import가 있는 파일에만 적용
    CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
    if printf '%s' "$CONTENT" | grep -qE 'use (anchor_lang|anchor_spl)'; then
      SEC=""
      # unchecked arithmetic — overflow 가능한 패턴만 (checked_ 사용 여부 확인)
      if printf '%s' "$CONTENT" | grep -qE 'checked_add|checked_sub|checked_mul|checked_div'; then
        : # checked 사용 중 — OK
      elif printf '%s' "$CONTENT" | grep -qE '\.(checked_|saturating_|wrapping_)'; then
        : # safe math 사용 중 — OK
      else
        if printf '%s' "$CONTENT" | grep -qE '[a-z_]+\s*[-+*]\s*[a-z_0-9]+'; then
          SEC="$SEC\n  - ⚠️ unchecked 산술 연산 감지 — checked_add/checked_sub 사용 권장"
        fi
      fi
      # unwrap() in non-test code
      if printf '%s' "$CONTENT" | grep -q '\.unwrap()' && ! printf '%s' "$REL_PATH" | grep -q 'test'; then
        SEC="$SEC\n  - ⚠️ .unwrap() 사용 감지 — 프로덕션 코드에서는 ? 연산자 사용"
      fi
      if [ -n "$SEC" ]; then
        CONTEXT="$CONTEXT\n🔒 Rust/Anchor 보안 체크 ($REL_PATH):$SEC"
        _add_codes $(printf '%s' "$SEC" | grep -oE 'unwrap|unchecked')
      fi
    fi
    ;;

  *.move)
    # Move 보안 패턴 검사 (Sui/Aptos)
    CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
    SEC=""
    # public entry 함수에 접근 제어 없음
    if printf '%s' "$CONTENT" | grep -q 'public entry fun' && ! printf '%s' "$CONTENT" | grep -q 'assert!'; then
      SEC="$SEC\n  - ⚠️ public entry 함수에 접근 제어(assert!) 없음"
    fi
    if [ -n "$SEC" ]; then
      CONTEXT="$CONTEXT\n🔒 Move 보안 체크 ($REL_PATH):$SEC"
      _add_codes "no-assert-entry"
    fi
    ;;
esac

# 5. codingStandards 검증 — config에 정의된 규칙을 코드 패턴으로 검사
CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
if [ -n "$CONTENT" ]; then
  STANDARDS=$(jq -r '.rules.codingStandards[]?.id // empty' "$CONFIG" 2>/dev/null)
  CS_ISSUES=""

  # 규칙 ID → grep 패턴 매핑 (확장 가능)
  _check_standard() {
    local id="$1" desc="$2"
    case "$id" in
      no-console-log)
        if printf '%s' "$CONTENT" | grep -qE 'console\.(log|debug|info|warn|error)\(' 2>/dev/null; then echo "  - ⚠️ [$id] $desc"; fi ;;
      no-hardcoded-secrets)
        if printf '%s' "$CONTENT" | grep -qiE '(api[_-]?key|secret|password|token|credential)\s*[:=]\s*["\x27][^"\x27]{8,}' 2>/dev/null; then echo "  - 🚫 [$id] $desc"; fi ;;
      no-commented-code)
        local cnt; cnt=$(printf '%s' "$CONTENT" | grep -c '^\s*\/\/' 2>/dev/null || echo "0")
        if [ "${cnt}" -ge 5 ] 2>/dev/null; then echo "  - ⚠️ [$id] $desc (${cnt}줄)"; fi ;;
      no-todo-without-issue)
        if printf '%s' "$CONTENT" | grep -qE '(TODO|FIXME|HACK|XXX)' 2>/dev/null; then
          if ! printf '%s' "$CONTENT" | grep -qE '(TODO|FIXME|HACK|XXX)\s*\(#[0-9]+\)' 2>/dev/null; then
            echo "  - ⚠️ [$id] $desc"
          fi
        fi ;;
      strict-return-type|no-implicit-any|strict-arg-type|strict-property-access|strict-null-check|no-unused-vars) ;; # tsc가 검증
      no-tx-origin|fixed-pragma) ;; # 블록체인 보안은 위에서 검증
      *) ;; # 알 수 없는 규칙 — 스킵
    esac
  }

  while IFS=$'\t' read -r RULE_ID RULE_DESC; do
    [ -z "$RULE_ID" ] && continue
    ISSUE=$(_check_standard "$RULE_ID" "$RULE_DESC")
    if [ -n "$ISSUE" ]; then
      CS_ISSUES="${CS_ISSUES}\n${ISSUE}"
    fi
  done < <(jq -r '.rules.codingStandards[]? | [.id, .description] | @tsv' "$CONFIG" 2>/dev/null)

  if [ -n "$CS_ISSUES" ]; then
    CONTEXT="${CONTEXT}\n📋 codingStandards 위반 ($REL_PATH):${CS_ISSUES}"
  fi
fi

# 메트릭 기록
if [ -n "$CONTEXT" ]; then
  # 에러 코드 추출 (TS2322 등) → JSON 배열
  ERROR_CODES=$(printf '%s' "$ECODES" | tr ' ' '\n' | sort -u | grep -v '^$' | jq -Rsc 'split("\n") | map(select(. != ""))') || ERROR_CODES='[]'
  _metric "error" "$REL_PATH" "$ERROR_CODES"
else
  _metric "clean" "$REL_PATH"
fi

# 결과 출력 — JSON으로 사용자 + 에이전트 양쪽에 전달
if [ -n "$CONTEXT" ]; then
  HARNESS_DIR="$PROJECT_DIR/.harness"
  mkdir -p "$HARNESS_DIR"

  # 즉시 학습 — 에러 코드를 learnings.json에 바로 기록 (세션 끝까지 안 기다림)
  LEARNINGS_FILE="$HARNESS_DIR/learnings.json"
  if [ ! -f "$LEARNINGS_FILE" ]; then echo '{"learnings":[]}' > "$LEARNINGS_FILE"; fi
  _error_to_rule() {
    local e="$1" f="$2"
    case "$e" in
      *TS2322*) echo "타입 불일치 — 변수/반환값의 타입과 실제 값이 일치하는지 확인한다 ($f)" ;;
      *TS2345*) echo "인자 타입 불일치 — 함수 호출 시 인자 타입을 확인한다 ($f)" ;;
      *TS2339*) echo "존재하지 않는 속성 — 객체의 속성명과 타입 정의를 확인한다 ($f)" ;;
      *TS2304*) echo "미선언 식별자 — import 누락 또는 오타를 확인한다 ($f)" ;;
      *TS7006*) echo "암시적 any — 파라미터에 타입을 명시한다 ($f)" ;;
      *TS2532*) echo "null/undefined 가능성 — optional chaining 또는 null 체크를 추가한다 ($f)" ;;
      *TS6133*) echo "미사용 변수 — 선언하고 사용하지 않는 변수를 제거한다 ($f)" ;;
      *SWC-115*) echo "tx.origin 사용 금지 — msg.sender를 사용한다 ($f)" ;;
      *SWC-106*) echo "selfdestruct 접근 제어 — 권한 검증 추가 ($f)" ;;
      *SWC-112*) echo "delegatecall 위험 — 신뢰할 수 있는 대상인지 확인 ($f)" ;;
      *SWC-103*) echo "floating pragma — 버전을 고정한다 ($f)" ;;
      *unwrap*) echo "unwrap() 금지 — 프로덕션 코드에서는 ? 연산자 사용 ($f)" ;;
      *) echo "빌드/린트 에러 발생 — 수정 후 검증한다 ($f)" ;;
    esac
  }
  for CODE in $(printf '%s' "$ECODES" | tr ' ' '\n' | sort -u | grep -v '^$'); do
    RULE=$(_error_to_rule "$CODE" "$REL_PATH")
    # 중복 체크 — 같은 에러코드가 이미 있으면 스킵 (파일 경로 무관)
    DUP=$(jq --arg c "$CODE" '.learnings[] | select(.mistake == $c) | .id' "$LEARNINGS_FILE" 2>/dev/null | head -1 || true)
    if [ -n "$DUP" ]; then continue; fi
    # 추가 (최대 20개 유지)
    NEW_ID="learn-$(date +%s)-$RANDOM"
    DATE=$(TZ=Asia/Seoul date +%Y-%m-%d)
    TMPFILE=$(mktemp "$LEARNINGS_FILE.XXXXXX")
    jq --arg id "$NEW_ID" --arg date "$DATE" --arg mistake "$CODE" --arg rule "$RULE" \
      '.learnings += [{"id":$id,"date":$date,"mistake":$mistake,"rule":$rule}] | .learnings = .learnings[-20:]' \
      "$LEARNINGS_FILE" > "$TMPFILE" && mv "$TMPFILE" "$LEARNINGS_FILE"
  done

  # AutoHarness — 반복 에러 감지 → config 규칙 추가 제안
  _code_to_config_rule() {
    local code="$1"
    # 보안 에러는 severity: error, 그 외 warning
    local sev="warning"
    case "$code" in SWC-*) sev="error" ;; esac
    printf '{"id":"%s","description":"%s","severity":"%s"}' "$code" "$code" "$sev"
  }
  AUTOHARNESS_MSG=""
  EXISTING_RULES=$(jq -r '.rules.codingStandards[]?.id // empty' "$CONFIG" 2>/dev/null)
  for CODE in $(printf '%s' "$ECODES" | tr ' ' '\n' | sort -u | grep -v '^$'); do
    CODE_COUNT=$(jq --arg c "$CODE" '[.learnings[] | select(.mistake == $c)] | length' "$LEARNINGS_FILE" 2>/dev/null || echo 0)
    if [ "$CODE_COUNT" -ge 3 ]; then
      RULE_JSON=$(_code_to_config_rule "$CODE")
      [ -z "$RULE_JSON" ] && continue
      RULE_ID=$(printf '%s' "$RULE_JSON" | jq -r '.id')
      RULE_DESC=$(printf '%s' "$RULE_JSON" | jq -r '.description')
      if echo "$EXISTING_RULES" | grep -q "$RULE_ID" 2>/dev/null; then continue; fi
      # config에 자동 추가
      TMPFILE=$(mktemp "$CONFIG.XXXXXX")
      jq --argjson rule "$RULE_JSON" '.rules.codingStandards += [$rule]' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"
      AUTOHARNESS_MSG="${AUTOHARNESS_MSG}\n🔧 [AutoHarness] ${CODE} ${CODE_COUNT}회 반복 → \"${RULE_ID}\" 자동 추가됨 (${RULE_DESC})"
    fi
  done

  # errors.log에도 기록 (Stop hook 호환)
  printf "%b\n" "$CONTEXT" >> "$HARNESS_DIR/errors.log"
  # errors.log 최대 100줄 유지
  if [ -f "$HARNESS_DIR/errors.log" ] && [ "$(wc -l < "$HARNESS_DIR/errors.log")" -gt 100 ]; then
    tail -100 "$HARNESS_DIR/errors.log" > "$HARNESS_DIR/errors.log.tmp" && mv "$HARNESS_DIR/errors.log.tmp" "$HARNESS_DIR/errors.log"
  fi

  # 사용자에게 보여줄 메시지 (AutoHarness 알림 포함)
  USER_MSG=$(printf "🔧 post-write: 이슈 발견 — %s\n%b%b" "$REL_PATH" "$CONTEXT" "$AUTOHARNESS_MSG")

  # 에러 종류 판별 — 단순 에러(자동 수정) vs 복잡 에러(컨펌 필요)
  HAS_SECURITY=$(printf '%s' "$CONTEXT" | grep -qE 'SWC-|Reentrancy|selfdestruct|delegatecall|unwrap|assert!' && echo "yes" || echo "no")

  if [ "$HAS_SECURITY" = "yes" ]; then
    # 보안/복잡 에러 → 컨펌 후 수정
    AGENT_MSG=$(printf "%b\n\n───────────────────────────────────\n🤖 [자동 검증] 보안 관련 이슈가 포함되어 있다. 다음을 수행하라:\n1. 각 이슈의 원인을 한 줄로 설명\n2. 수정 계획을 제시\n3. 사용자에게 \"수정할까요?\" 컨펌을 받은 후 수정\n절대 설명 없이 바로 수정하지 마라.%b" "$CONTEXT" "$AUTOHARNESS_MSG")
  else
    # 단순 에러 (타입 불일치, lint 등) → 즉시 자동 수정
    AGENT_MSG=$(printf "%b\n\n───────────────────────────────────\n🤖 [자동 수정] 단순 에러를 감지했다. 즉시 수정하라:\n1. 각 이슈의 원인을 한 줄로 설명\n2. 바로 수정\n사용자 컨펌 불필요.%b" "$CONTEXT" "$AUTOHARNESS_MSG")
  fi

  # JSON 출력 — systemMessage(사용자 화면) + additionalContext(에이전트 컨텍스트)
  jq -n \
    --arg sm "$USER_MSG" \
    --arg ac "$AGENT_MSG" \
    '{ "systemMessage": $sm, "additionalContext": $ac }'
fi

exit 0
