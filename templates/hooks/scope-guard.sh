#!/usr/bin/env bash
# harness: scope-guard — blocks file writes outside allowed scopes
set -euo pipefail

_log() { mkdir -p "$CLAUDE_PROJECT_DIR/.harness"; printf "[%s] scope-guard: %s\n" "$(date -u +%H:%M:%S)" "$1" >> "$CLAUDE_PROJECT_DIR/.harness/harness.log"; }
_metric() { mkdir -p "$CLAUDE_PROJECT_DIR/.harness"; printf '{"ts":"%s","hook":"scope-guard","event":"%s","file":"%s"}\n' "$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00)" "$1" "$2" >> "$CLAUDE_PROJECT_DIR/.harness/metrics.jsonl"; }

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

CONFIG="$CLAUDE_PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

# 상대 경로 변환 + .. 방어
if [[ "$FILE_PATH" == /* ]]; then
  REL_PATH="${FILE_PATH#${CLAUDE_PROJECT_DIR%/}/}"
else
  REL_PATH="$FILE_PATH"
fi

if [[ "$REL_PATH" == *".."* ]]; then
  _log "BLOCK path traversal: $REL_PATH"
  _metric "block" "$REL_PATH"
  echo "harness: path traversal detected in '$REL_PATH'" >&2
  exit 2
fi

# 루트 설정 파일은 항상 허용
case "$REL_PATH" in
  harness.config.json|package.json|package-lock.json|tsconfig.json|.gitignore|.env.example|README.md|.npmrc)
    _log "ALLOW (config): $REL_PATH"
    exit 0 ;;
esac

# allowedScopes 읽기 (fallback: src tests)
set -f
ALLOWED=$(jq -r '(.agent.allowedScopes // ["src/**/*","tests/**/*"])[]' "$CONFIG" 2>/dev/null || echo "src/**/*")
if [ -z "$ALLOWED" ]; then
  ALLOWED="src/**/*
tests/**/*"
fi

for scope in $ALLOWED; do
  PREFIX="${scope%%/**/*}"
  if [ "$PREFIX" != "$scope" ]; then
    if [[ "$REL_PATH" == "$PREFIX/"* ]]; then
      _log "ALLOW (scope $scope): $REL_PATH"
      exit 0
    fi
  else
    if [[ "$REL_PATH" == $scope ]]; then
      _log "ALLOW (scope $scope): $REL_PATH"
      exit 0
    fi
  fi
done
set +f

SCOPES=$(jq -r '(.agent.allowedScopes // ["src/**/*","tests/**/*"]) | join(", ")' "$CONFIG" 2>/dev/null || echo "src/**/*")
_log "BLOCK (outside scope): $REL_PATH"
_metric "block" "$REL_PATH"
echo "harness: '$REL_PATH' is outside allowed scopes ($SCOPES)" >&2
exit 2
