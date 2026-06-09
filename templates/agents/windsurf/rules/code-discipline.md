---
trigger: always_on
---

# Code Discipline

- Verify library functions exist in the project's installed version before using them. If unverifiable, mark as `// VERIFY`.
- Never invent function signatures or return types. If a dependency is missing, propose installing it first.
- Only change what was asked. Don't modify unrequested code, add unnecessary abstractions, or rewrite files for small changes.
- Before refactoring, enumerate invariants. After refactoring, verify each still holds.
- If no tests exist for code being refactored, propose adding a characterization test first.
- When asked "is this correct?", list potential failure modes before answering.
- Acknowledge uncertainty. If you don't know, say so. Don't invent plausible answers.
- Surface hidden trade-offs when generating code with architectural implications.
- Match existing coding style. Don't introduce new patterns unless they're already present in recent files.
- Don't summarize changes. Don't apologize. Don't add comments that restate what the code does.

## References

- https://github.com/detailobsessed/awesome-windsurf
- https://docs.codeium.com/windsurf/memories#rules
