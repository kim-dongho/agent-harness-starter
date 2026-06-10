#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# scope-guard.sh — 에이전트가 허용된 범위 밖 파일을 수정하지 못하게 차단
#
# 실행 시점: PreToolUse (Write | Edit)
# 동작:
#   1. Claude Code가 파일을 수정(Edit)하거나 생성(Write)하려 할 때 자동 실행
#   2. harness.config.json의 agent.allowedScopes에 정의된 경로만 허용
#   3. 허용 범위 밖이면 exit 2로 차단 (에이전트에 차단 사유 피드백)
#   4. package.json 등 루트 설정 파일은 항상 허용
#   5. path traversal (..) 공격 방어
#
# 입력: stdin으로 JSON — { "tool_input": { "file_path": "..." } }
# 출력: 🔧 scope-guard: ALLOW/BLOCK 로그
# exit 0: 허용 / exit 2: 차단
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# 로그 + 화면 출력 함수
_notify() {
  local msg="$1"
  mkdir -p "$CLAUDE_PROJECT_DIR/.harness"
  printf "[%s] scope-guard: %s\n" "$(date -u +%H:%M:%S)" "$msg" >> "$CLAUDE_PROJECT_DIR/.harness/harness.log"
  echo "🔧 scope-guard: $msg"
}

# stdin에서 JSON 입력 읽기
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# 파일 경로가 없으면 스킵
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# harness.config.json이 없으면 스킵 (하네스 미설정 프로젝트)
CONFIG="$CLAUDE_PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

# 절대 경로 → 상대 경로 변환
# CLAUDE_PROJECT_DIR 끝에 / 가 있을 수 있으므로 %/ 로 정규화
if [[ "$FILE_PATH" == /* ]]; then
  REL_PATH="${FILE_PATH#${CLAUDE_PROJECT_DIR%/}/}"
else
  REL_PATH="$FILE_PATH"
fi

# path traversal 방어 — .. 포함 경로는 무조건 차단
if [[ "$REL_PATH" == *".."* ]]; then
  _notify "BLOCK path traversal: $REL_PATH"
  echo "harness: path traversal detected in '$REL_PATH'" >&2
  exit 2
fi

# 루트 설정 파일은 항상 허용 (에이전트가 수정해야 하는 공통 파일)
case "$REL_PATH" in
  harness.config.json|package.json|package-lock.json|tsconfig.json|.gitignore|.env.example|README.md|.npmrc)
    _notify "ALLOW (config): $REL_PATH"
    exit 0 ;;
esac

# harness.config.json에서 allowedScopes 읽기
# 키가 없거나 빈 배열이면 기본값 src/**/* + tests/**/* 사용
set -f  # glob 확장 방지 — src/**/* 등이 실제 파일로 확장되지 않도록
ALLOWED=$(jq -r '(.agent.allowedScopes // ["src/**/*","tests/**/*"])[]' "$CONFIG" 2>/dev/null || echo "src/**/*")
if [ -z "$ALLOWED" ]; then
  ALLOWED="src/**/*
tests/**/*"
fi

# 각 scope 패턴과 매칭
for scope in $ALLOWED; do
  PREFIX="${scope%%/**/*}"
  if [ "$PREFIX" != "$scope" ]; then
    # dir/**/* 형태 → dir/ 하위 전부 허용 (prefix 매칭)
    if [[ "$REL_PATH" == "$PREFIX/"* ]]; then
      _notify "ALLOW (scope $scope): $REL_PATH"
      exit 0
    fi
  else
    # 그 외 패턴 (*.config.js 등) → bash glob 매칭
    if [[ "$REL_PATH" == $scope ]]; then
      _notify "ALLOW (scope $scope): $REL_PATH"
      exit 0
    fi
  fi
done
set +f

# 어떤 scope에도 매칭 안 됨 → 차단
SCOPES=$(jq -r '(.agent.allowedScopes // ["src/**/*","tests/**/*"]) | join(", ")' "$CONFIG" 2>/dev/null || echo "src/**/*")
_notify "BLOCK (outside scope): $REL_PATH"
echo "harness: '$REL_PATH' is outside allowed scopes ($SCOPES)" >&2
exit 2
