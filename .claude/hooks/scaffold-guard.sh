#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# scaffold-guard.sh — 에이전트가 파일을 직접 생성하지 못하게 차단하고 /generate 사용을 안내
#
# 실행 시점: PreToolUse (Write만, Edit은 무시)
# 동작:
#   1. 에이전트가 새 파일을 Write로 생성하려 할 때 자동 실행
#   2. 기존 파일 덮어쓰기(overwrite)는 허용
#   3. src/components, src/hooks 등 scaffoldable 디렉토리에 새 파일이면 차단
#   4. 아키텍처(FSD, Clean, Modular 등)에 따라 디렉토리 매핑이 달라짐
#   5. 차단 시 "/generate component Button" 같은 대안 명령을 안내
#
# 입력: stdin으로 JSON — { "tool_name": "Write", "tool_input": { "file_path": "..." } }
# 출력: 🔧 scaffold-guard: ALLOW/BLOCK 로그
# exit 0: 허용 / exit 2: 차단 + scaffolder 안내
# ──────────────────────────────────────────────────────────────
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

_metric() { mkdir -p "$PROJECT_DIR/.harness"; printf '{"ts":"%s","hook":"scaffold-guard","event":"%s","file":"%s"}\n' "$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00)" "$1" "$2" >> "$PROJECT_DIR/.harness/metrics.jsonl"; }

_notify() {
  local msg="$1"
  mkdir -p "$PROJECT_DIR/.harness"
  printf "[%s] scaffold-guard: %s\n" "$(date -u +%H:%M:%S)" "$msg" >> "$PROJECT_DIR/.harness/harness.log"
  echo "🔧 scaffold-guard: $msg"
}

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Write가 아니면 무시 (Edit은 기존 파일 수정이라 허용)
if [ "$TOOL_NAME" != "Write" ] || [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 이미 존재하는 파일이면 덮어쓰기 — 허용
if [ -f "$FILE_PATH" ]; then
  exit 0
fi

# 상대 경로 변환 + path traversal 방어
if [[ "$FILE_PATH" == /* ]]; then
  REL_PATH="${FILE_PATH#${PROJECT_DIR%/}/}"
else
  REL_PATH="$FILE_PATH"
fi
if [[ "$REL_PATH" == *".."* ]]; then exit 0; fi

# harness.config.json에서 아키텍처 스타일 읽기
CONFIG="$PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi
ARCH=$(jq -r '.architecture.style // "flat"' "$CONFIG" 2>/dev/null)

# ── scaffoldable 디렉토리 매칭 ──
# 공통 (모든 아키텍처): src/components, src/hooks, src/utils, src/services, src/models
# FSD 전용: src/features/*/ui, src/features/*/model, src/widgets, src/shared, src/entities
# Clean 전용: src/presentation, src/application, src/domain, src/infrastructure

SUGGESTION=""

# 공통 scaffoldable 디렉토리
case "$REL_PATH" in
  src/components/*|src/*/components/*) SUGGESTION="component" ;;
  src/hooks/*|src/*/hooks/*)           SUGGESTION="hook" ;;
  src/utils/*|src/*/utils/*)           SUGGESTION="util" ;;
  src/services/*|src/*/services/*)     SUGGESTION="service" ;;
  src/models/*|src/*/models/*)         SUGGESTION="model" ;;
esac

# FSD 전용
if [ -z "$SUGGESTION" ] && [ "$ARCH" = "fsd" ]; then
  case "$REL_PATH" in
    src/features/*/ui/*)    SUGGESTION="component" ;;
    src/features/*/model/*) SUGGESTION="model" ;;
    src/features/*/api/*)   SUGGESTION="service" ;;
    src/widgets/*)          SUGGESTION="component" ;;
    src/shared/ui/*)        SUGGESTION="component" ;;
    src/shared/lib/*)       SUGGESTION="util" ;;
    src/shared/api/*)       SUGGESTION="service" ;;
    src/entities/*)         SUGGESTION="model" ;;
  esac
fi

# Clean Architecture 전용
if [ -z "$SUGGESTION" ] && [ "$ARCH" = "clean" ]; then
  case "$REL_PATH" in
    src/presentation/*) SUGGESTION="component" ;;
    src/application/*)  SUGGESTION="service" ;;
    src/domain/*)       SUGGESTION="model" ;;
    src/infrastructure/*) SUGGESTION="service" ;;
  esac
fi

# scaffoldable 디렉토리면 차단 + /generate 안내
if [ -n "$SUGGESTION" ]; then
  FILENAME=$(basename "$REL_PATH" | sed 's/\.[^.]*$//')
  _notify "BLOCK (scaffold): $REL_PATH → /generate $SUGGESTION $FILENAME"
  _metric "block" "$REL_PATH"
  echo "harness: Instead of creating '$REL_PATH' manually, use the scaffolder:" >&2
  echo "  /generate $SUGGESTION $FILENAME" >&2
  echo "This ensures correct directory structure, naming conventions, and barrel exports." >&2
  exit 2
fi

# scaffoldable 아닌 디렉토리면 허용
_notify "ALLOW: $REL_PATH"
exit 0
