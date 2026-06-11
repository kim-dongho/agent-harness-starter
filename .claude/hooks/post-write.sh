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
# $FILE_PATH가 프로젝트 디렉토리 내부인지 검증
case "$FILE_PATH" in
  "${CLAUDE_PROJECT_DIR}"/*) ;; # OK
  *) exit 0 ;; # 프로젝트 외부 경로 — 무시
esac

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

# 2. TypeScript type-check
LANGUAGE=$(jq -r '.project.language // "typescript"' "$CONFIG")
if [ "$LANGUAGE" = "typescript" ]; then
  TS_RESULT=$(npx tsc --noEmit --pretty false 2>&1 | grep "$REL_PATH" | head -5) || true
  if [ -n "$TS_RESULT" ]; then
    CONTEXT="$CONTEXT\n⚠️ Type errors in $REL_PATH:\n$TS_RESULT"
  fi
fi

# 3. Import 위반 검사
if [ -f "$CLAUDE_PROJECT_DIR/.dependency-cruiser.cjs" ] && command -v npx &>/dev/null; then
  DEP_RESULT=$(npx depcruise --config "$CLAUDE_PROJECT_DIR/.dependency-cruiser.cjs" "$FILE_PATH" 2>&1) || true
  if echo "$DEP_RESULT" | grep -q "error"; then
    DEP_ERRORS=$(echo "$DEP_RESULT" | grep "error" | head -3)
    CONTEXT="$CONTEXT\n⚠️ Architecture violation in $REL_PATH:\n$DEP_ERRORS"
  fi
fi

# 4. 블록체인 보안 자동 검사 — .sol, .rs (Anchor), .move 파일일 때
case "$REL_PATH" in
  *.sol)
    # Solidity 보안 패턴 검사
    CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
    SEC=""
    # reentrancy: .call{value 있고 그 다음 줄에 상태 변경(=)이 있는지 — 두 단계 grep (macOS 호환)
    if printf '%s' "$CONTENT" | grep -q '\.call{value'; then
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
      SEC="$SEC\n  - 🚫 tx.origin 사용 감지 — msg.sender를 사용하라 (SWC-115)"
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
      SEC="$SEC\n  - ⚠️ floating pragma 감지 — 버전을 고정하라 (SWC-103)"
    fi
    if [ -n "$SEC" ]; then
      CONTEXT="$CONTEXT\n🔒 Solidity 보안 체크 ($REL_PATH):$SEC"
    fi
    ;;

  *.rs)
    # Rust/Anchor 보안 패턴 검사 — anchor_lang import가 있는 파일에만 적용
    CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
    if printf '%s' "$CONTENT" | grep -qE 'use (anchor_lang|anchor_spl)'; then
      SEC=""
      if printf '%s' "$CONTENT" | grep -qE 'checked_add|checked_sub|checked_mul|checked_div'; then
        :
      elif printf '%s' "$CONTENT" | grep -qE '\.(checked_|saturating_|wrapping_)'; then
        :
      else
        if printf '%s' "$CONTENT" | grep -qE '[a-z_]+\s*[-+*]\s*[a-z_0-9]+'; then
          SEC="$SEC\n  - ⚠️ unchecked 산술 연산 감지 — checked_add/checked_sub 사용 권장"
        fi
      fi
      if printf '%s' "$CONTENT" | grep -q '\.unwrap()' && ! printf '%s' "$REL_PATH" | grep -q 'test'; then
        SEC="$SEC\n  - ⚠️ .unwrap() 사용 감지 — 프로덕션 코드에서는 ? 연산자 사용"
      fi
      if [ -n "$SEC" ]; then
        CONTEXT="$CONTEXT\n🔒 Rust/Anchor 보안 체크 ($REL_PATH):$SEC"
      fi
    fi
    ;;

  *.move)
    # Move 보안 패턴 검사 (Sui/Aptos)
    CONTENT=$(cat "$FILE_PATH" 2>/dev/null || true)
    SEC=""
    if printf '%s' "$CONTENT" | grep -q 'public entry fun' && ! printf '%s' "$CONTENT" | grep -q 'assert!'; then
      SEC="$SEC\n  - ⚠️ public entry 함수에 접근 제어(assert!) 없음"
    fi
    if [ -n "$SEC" ]; then
      CONTEXT="$CONTEXT\n🔒 Move 보안 체크 ($REL_PATH):$SEC"
    fi
    ;;
esac

# 결과 출력 — JSON으로 사용자 + 에이전트 양쪽에 전달
if [ -n "$CONTEXT" ]; then
  # errors.log에 기록 — learnings-recorder가 Stop 시점에 읽어서 학습 규칙으로 변환
  HARNESS_DIR="$CLAUDE_PROJECT_DIR/.harness"
  mkdir -p "$HARNESS_DIR"
  printf "%b\n" "$CONTEXT" >> "$HARNESS_DIR/errors.log"
  # errors.log 최대 100줄 유지
  if [ -f "$HARNESS_DIR/errors.log" ] && [ "$(wc -l < "$HARNESS_DIR/errors.log")" -gt 100 ]; then
    tail -100 "$HARNESS_DIR/errors.log" > "$HARNESS_DIR/errors.log.tmp" && mv "$HARNESS_DIR/errors.log.tmp" "$HARNESS_DIR/errors.log"
  fi

  # 사용자에게 보여줄 메시지
  USER_MSG=$(printf "🔧 post-write: 이슈 발견 — %s\n%b" "$REL_PATH" "$CONTEXT")
  # 에이전트에게 전달할 지시
  AGENT_MSG=$(printf "%b\n\n───────────────────────────────────\n🤖 [자동 검증] 위 이슈에 대해 다음을 수행하라:\n1. 각 이슈의 원인을 한 줄로 설명\n2. 수정 계획을 제시\n3. 사용자에게 \"수정할까요?\" 컨펌을 받은 후 수정\n절대 설명 없이 바로 수정하지 마라." "$CONTEXT")

  # JSON 출력 — systemMessage(사용자 화면) + additionalContext(에이전트 컨텍스트)
  jq -n \
    --arg sm "$USER_MSG" \
    --arg ac "$AGENT_MSG" \
    '{ "systemMessage": $sm, "additionalContext": $ac }'
fi

exit 0
