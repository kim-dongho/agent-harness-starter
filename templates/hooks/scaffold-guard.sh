#!/usr/bin/env bash
# harness: scaffold-guard — nudges AI to use scaffolder for new files
set -euo pipefail

_log() { mkdir -p "$CLAUDE_PROJECT_DIR/.harness"; printf "[%s] scaffold-guard: %s\n" "$(date -u +%H:%M:%S)" "$1" >> "$CLAUDE_PROJECT_DIR/.harness/harness.log"; }
_metric() { mkdir -p "$CLAUDE_PROJECT_DIR/.harness"; printf '{"ts":"%s","hook":"scaffold-guard","event":"%s","file":"%s"}\n' "$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00)" "$1" "$2" >> "$CLAUDE_PROJECT_DIR/.harness/metrics.jsonl"; }

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ "$TOOL_NAME" != "Write" ] || [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [ -f "$FILE_PATH" ]; then
  exit 0
fi

# 상대 경로 변환 + path traversal 방어
if [[ "$FILE_PATH" == /* ]]; then
  REL_PATH="${FILE_PATH#${CLAUDE_PROJECT_DIR%/}/}"
else
  REL_PATH="$FILE_PATH"
fi
if [[ "$REL_PATH" == *".."* ]]; then exit 0; fi

CONFIG="$CLAUDE_PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

ARCH=$(jq -r '.architecture.style // "flat"' "$CONFIG" 2>/dev/null)

# 공통 scaffoldable 디렉토리 (모든 아키텍처)
SUGGESTION=""
case "$REL_PATH" in
  src/components/*|src/*/components/*) SUGGESTION="component" ;;
  src/hooks/*|src/*/hooks/*)           SUGGESTION="hook" ;;
  src/utils/*|src/*/utils/*)           SUGGESTION="util" ;;
  src/services/*|src/*/services/*)     SUGGESTION="service" ;;
  src/models/*|src/*/models/*)         SUGGESTION="model" ;;
esac

# FSD 전용 디렉토리
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

# Clean 전용 디렉토리
if [ -z "$SUGGESTION" ] && [ "$ARCH" = "clean" ]; then
  case "$REL_PATH" in
    src/presentation/*) SUGGESTION="component" ;;
    src/application/*)  SUGGESTION="service" ;;
    src/domain/*)       SUGGESTION="model" ;;
    src/infrastructure/*) SUGGESTION="service" ;;
  esac
fi

if [ -n "$SUGGESTION" ]; then
  FILENAME=$(basename "$REL_PATH" | sed 's/\.[^.]*$//')
  _log "BLOCK (scaffold): $REL_PATH → /generate $SUGGESTION $FILENAME"
  _metric "block" "$REL_PATH"
  echo "harness: Instead of creating '$REL_PATH' manually, use the scaffolder:" >&2
  echo "  /generate $SUGGESTION $FILENAME" >&2
  echo "This ensures correct directory structure, naming conventions, and barrel exports." >&2
  exit 2
fi

_log "ALLOW: $REL_PATH"
exit 0
