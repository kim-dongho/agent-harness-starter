#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# log-transpiler.sh — raw 에러 로그를 AI가 읽기 쉬운 구조화 포맷으로 변환
#
# 실행 시점: 다른 hook에서 직접 호출하는 유틸리티 스크립트 (자동 실행 아님)
# 사용법: echo "raw error log" | .claude/hooks/log-transpiler.sh <source>
# source: lint | typecheck | test | build
#
# 동작:
#   1. stdin으로 raw 에러 로그를 받음
#   2. source 타입에 따라 파싱 (ESLint, TypeScript, 테스트 등)
#   3. 구조화된 마크다운 리포트로 변환
#
# 변환 예시:
#   입력: src/foo.ts(10,5): error TS2322: Type 'string' is not assignable
#   출력: ❌ src/foo.ts:10 — [TS2322] Type 'string' is not assignable
# ──────────────────────────────────────────────────────────────
set -euo pipefail

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
    const m = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)/);
    if (m) entry = { file: m[1], line: +m[2], col: +m[3], severity: m[4], rule: m[5], message: m[6] };
  }

  if (source === 'lint') {
    const m = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning)\s+(.+?)\s+\(?([\w\/@-]+)\)?$/);
    if (m) entry = { file: m[1], line: +m[2], col: +m[3], severity: m[4], message: m[5], rule: m[6] };
    const b = line.match(/^(.+?):(\d+):(\d+)\s+(lint\/.+?)\s+(.+)/);
    if (!entry && b) entry = { file: b[1], line: +b[2], col: +b[3], severity: 'error', rule: b[4], message: b[5] };
  }

  if (source === 'test') {
    const m = line.match(/^(FAIL|✗|×)\s+(.+)/);
    if (m) entry = { file: m[2].trim(), severity: 'error', message: 'Test failed' };
    const a = line.match(/^\s*(Expected|Received|AssertionError|Error):\s*(.+)/);
    if (a) entry = { severity: 'error', message: a[1] + ': ' + a[2] };
  }

  if (entry) entries.push(entry);
}

if (entries.length === 0) process.exit(0);

const errors = entries.filter(e => e.severity === 'error');
const warnings = entries.filter(e => e.severity === 'warning');

let output = '## ' + source.toUpperCase() + ' Report\\\n';
output += 'Errors: ' + errors.length + ' | Warnings: ' + warnings.length + '\\\n\\\n';

for (const e of entries) {
  const loc = e.file ? e.file + (e.line ? ':' + e.line : '') : '';
  const icon = e.severity === 'error' ? '❌' : '⚠️';
  output += icon + ' ' + loc + ' — ' + (e.rule ? '[' + e.rule + '] ' : '') + e.message + '\\\n';
}

console.log(output);
" "$RAW" "$SOURCE"
