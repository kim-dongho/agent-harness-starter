#!/usr/bin/env bash
# harness: log-transpiler — converts raw error logs into structured AI-readable format
# 다른 hooks에서 호출되는 유틸리티 스크립트
set -euo pipefail
# 에이전트 환경변수 통합 — Claude/Gemini/Codex/Cursor 호환
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${GEMINI_PROJECT_DIR:-${CODEX_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}}}"

# Usage: echo "raw error log" | .claude/hooks/log-transpiler.sh <source>
# source: lint | typecheck | test | build

SOURCE="${1:-unknown}"
RAW=$(cat)

if [ -z "$RAW" ]; then
  exit 0
fi

node -e "
const raw = process.argv[1];
const source = process.argv[2];
const lines = raw.split('\n').filter(Boolean);
const entries = [];

for (const line of lines) {
  let entry = null;

  if (source === 'typecheck') {
    // TS error: src/foo.ts(10,5): error TS2322: Type 'string' is not assignable
    const m = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)/);
    if (m) entry = { file: m[1], line: +m[2], col: +m[3], severity: m[4], rule: m[5], message: m[6] };
  }

  if (source === 'lint') {
    // ESLint: src/foo.ts:10:5: error message (rule-name)
    const m = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning)\s+(.+?)\s+\(?([\w\/@-]+)\)?$/);
    if (m) entry = { file: m[1], line: +m[2], col: +m[3], severity: m[4], message: m[5], rule: m[6] };
    // Biome: path/file.ts:10:5 lint/rule description
    const b = line.match(/^(.+?):(\d+):(\d+)\s+(lint\/.+?)\s+(.+)/);
    if (!entry && b) entry = { file: b[1], line: +b[2], col: +b[3], severity: 'error', rule: b[4], message: b[5] };
  }

  if (source === 'test') {
    // FAIL src/foo.test.ts
    const m = line.match(/^(FAIL|✗|×)\s+(.+)/);
    if (m) entry = { file: m[2].trim(), severity: 'error', message: 'Test failed' };
    // AssertionError / expect(...)
    const a = line.match(/^\s*(Expected|Received|AssertionError|Error):\s*(.+)/);
    if (a) entry = { severity: 'error', message: a[1] + ': ' + a[2] };
  }

  if (entry) entries.push(entry);
}

if (entries.length === 0) {
  process.exit(0);
}

// Structured output
const errors = entries.filter(e => e.severity === 'error');
const warnings = entries.filter(e => e.severity === 'warning');

let output = '## ' + source.toUpperCase() + ' Report\\n';
output += 'Errors: ' + errors.length + ' | Warnings: ' + warnings.length + '\\n\\n';

for (const e of entries) {
  const loc = e.file ? e.file + (e.line ? ':' + e.line : '') : '';
  const icon = e.severity === 'error' ? '❌' : '⚠️';
  output += icon + ' ' + loc + ' — ' + (e.rule ? '[' + e.rule + '] ' : '') + e.message + '\\n';
}

console.log(output);
" "$RAW" "$SOURCE"
