#!/usr/bin/env bash
# harness: scaffold-guard — nudges AI to use scaffolder for new files
set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check Write (new file creation), not Edit
if [ "$TOOL_NAME" != "Write" ] || [ -z "$FILE_PATH" ]; then
  exit 0
fi

# If file already exists, it's an overwrite — allow
if [ -f "$FILE_PATH" ]; then
  exit 0
fi

REL_PATH=$(realpath --relative-to="$CLAUDE_PROJECT_DIR" "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")

# Check if the new file is in a scaffoldable directory
SUGGESTION=$(node -e "
const dirs = {
  'src/components': 'component',
  'src/hooks': 'hook',
  'src/utils': 'util',
  'src/services': 'service',
  'src/models': 'model'
};
const rel = process.argv[1];
for (const [dir, type] of Object.entries(dirs)) {
  if (rel.startsWith(dir + '/')) {
    const name = rel.split('/').pop().replace(/\.[^.]+$/, '');
    console.log('harness generate ' + type + ' ' + name);
    process.exit(0);
  }
}
" "$REL_PATH" 2>/dev/null || true)

if [ -n "$SUGGESTION" ]; then
  echo "harness: Instead of creating '$REL_PATH' manually, use the scaffolder:" >&2
  echo "  $SUGGESTION" >&2
  echo "This ensures correct directory structure, naming conventions, and barrel exports." >&2
  exit 2
fi

exit 0
