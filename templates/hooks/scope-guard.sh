#!/usr/bin/env bash
# harness: scope-guard — blocks file writes outside allowed scopes
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

REL_PATH=$(realpath --relative-to="$CLAUDE_PROJECT_DIR" "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")

# harness.config.json에서 allowedScopes 읽기
MATCH=$(node -e "
const fs = require('fs');
const {minimatch} = require('minimatch');
const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf-8'));
const scopes = config.agent?.allowedScopes ?? ['src/**/*', 'tests/**/*'];
const rel = process.argv[2];
// config 파일, 루트 설정 파일은 항상 허용
const alwaysAllow = ['harness.config.json', 'package.json', 'tsconfig.json', '.gitignore', '.env.example', 'README.md'];
if (alwaysAllow.some(f => rel === f || rel.endsWith('/' + f))) { console.log('yes'); process.exit(0); }
const ok = scopes.some(s => minimatch(rel, s));
console.log(ok ? 'yes' : 'no');
" "$CONFIG" "$REL_PATH" 2>/dev/null || echo "yes")

if [ "$MATCH" = "no" ]; then
  SCOPES=$(jq -r '.agent.allowedScopes | join(", ")' "$CONFIG" 2>/dev/null || echo "src/**/*")
  echo "harness: '$REL_PATH' is outside allowed scopes ($SCOPES)" >&2
  exit 2
fi

exit 0
