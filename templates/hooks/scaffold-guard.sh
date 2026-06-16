#!/usr/bin/env bash
# harness: scaffold-guard — nudges AI to use scaffolder for new files
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

_log() { mkdir -p "$PROJECT_DIR/.harness"; printf "[%s] scaffold-guard: %s\n" "$(TZ=Asia/Seoul date +%H:%M:%S)" "$1" >> "$PROJECT_DIR/.harness/harness.log"; }
_metric() { mkdir -p "$PROJECT_DIR/.harness"; printf '{"ts":"%s","hook":"scaffold-guard","event":"%s","file":"%s"}\n' "$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00)" "$1" "$2" >> "$PROJECT_DIR/.harness/metrics.jsonl"; }

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '
  def patch_path:
    capture("\\*\\*\\* (Add|Update|Delete) File: (?<path>[^\\n]+)")?.path // empty;
  .tool_input.file_path //
  .tool_input.path //
  (.tool_input.patch // .tool_input.input // .tool_input | strings | patch_path) //
  empty
')

if [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "apply_patch" ]; then
  exit 0
fi

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

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

CONFIG="$PROJECT_DIR/harness.config.json"
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

# 아키텍처 — 문자열이면 그대로, 맵(모노레포)이면 파일 경로에서 앱 디렉토리명으로 조회
APP_DIR=$(echo "$REL_PATH" | sed -n 's|^apps/\([^/]*\)/.*|\1|p')
if [ -n "$APP_DIR" ]; then
  # 모노레포: apps/web/... → .architecture.style.web
  ARCH=$(jq -r ".architecture.style.\"${APP_DIR}\" // .architecture.style // \"flat\"" "$CONFIG" 2>/dev/null)
else
  ARCH=$(jq -r '.architecture.style // "flat"' "$CONFIG" 2>/dev/null)
fi
# 맵 전체가 반환된 경우 flat으로 폴백
if echo "$ARCH" | grep -q '{'; then ARCH="flat"; fi

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

# ── fileNaming 검증 — 새 파일의 이름이 config 규칙에 맞는지 확인 ──
# 언어 규약으로 강제되는 파일명 패턴은 스킵
case "$(basename "$REL_PATH")" in
  *_test.go|*_test.rs)   exit 0 ;; # Go/Rust 테스트
  test_*.py|conftest.py) exit 0 ;; # Python 테스트
  mod.rs|lib.rs|main.rs) exit 0 ;; # Rust 필수 파일
  *.module.css|*.module.scss) exit 0 ;; # CSS Module
  __init__.py)           exit 0 ;; # Python 패키지
esac
FILENAME=$(basename "$REL_PATH" | sed 's/\.[^.]*$//')
EXT=$(basename "$REL_PATH" | grep -o '\.[^.]*$' || true)

# fileNaming 규칙 조회 — 모노레포: apps/<app> 기준, 폴리레포: convention 필드
NAMING_RULE=""
APP_DIR=$(echo "$REL_PATH" | sed -n 's#^apps/\([^/]*\)/.*#\1#p')
if [ -n "$APP_DIR" ]; then
  NAMING_RULE=$(jq -r ".rules.fileNaming.\"${APP_DIR}\" // empty" "$CONFIG" 2>/dev/null)
fi
if [ -z "$NAMING_RULE" ]; then
  NAMING_RULE=$(jq -r '.rules.fileNaming.convention // empty' "$CONFIG" 2>/dev/null)
fi

if [ -n "$NAMING_RULE" ]; then

  if [ -n "$NAMING_RULE" ]; then
    IS_VALID="yes"
    SUGGESTED=""

    case "$NAMING_RULE" in
      kebab-case)
        # kebab-case: 소문자 + 하이픈만 허용 (예: password-input)
        if echo "$FILENAME" | grep -qE '[A-Z]|_'; then
          IS_VALID="no"
          SUGGESTED=$(echo "$FILENAME" | sed 's/\([A-Z]\)/-\L\1/g' | sed 's/^-//' | sed 's/_/-/g' | tr '[:upper:]' '[:lower:]')
        fi
        ;;
      camelCase)
        # camelCase: 첫 글자 소문자 + 하이픈/언더스코어 없음 (예: passwordInput)
        if echo "$FILENAME" | grep -qE '^[A-Z]|[-_]'; then
          IS_VALID="no"
          # PascalCase → camelCase
          SUGGESTED=$(echo "$FILENAME" | sed 's/^./\L&/' | sed 's/[-_]\(.\)/\U\1/g')
        fi
        ;;
      PascalCase)
        # PascalCase: 첫 글자 대문자 + 하이픈/언더스코어 없음 (예: PasswordInput)
        if echo "$FILENAME" | grep -qE '^[a-z]|[-_]'; then
          IS_VALID="no"
          SUGGESTED=$(echo "$FILENAME" | sed 's/[-_]\(.\)/\U\1/g' | sed 's/^./\U&/')
        fi
        ;;
    esac

    if [ "$IS_VALID" = "no" ] && [ -n "$SUGGESTED" ]; then
      _log "BLOCK (naming): $FILENAME → $SUGGESTED ($NAMING_RULE)"
      _metric "block" "$REL_PATH"
      echo "harness: 파일명 '$FILENAME$EXT'이 naming 규칙($NAMING_RULE)에 맞지 않습니다." >&2
      echo "  → '$SUGGESTED$EXT'로 변경하세요." >&2
      exit 2
    fi
  fi
fi

_log "ALLOW: $REL_PATH"
exit 0
