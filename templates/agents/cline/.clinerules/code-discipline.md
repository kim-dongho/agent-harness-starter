---
description: "Code discipline rules to prevent over-engineering, hallucinated APIs, and ensure incremental development"
author: "create-harness"
version: "1.0"
tags: ["code-discipline", "best-practices"]
globs: ["*.*"]
---

# Code Discipline

## Incremental Development

- Break down any task into the smallest possible meaningful change.
- Focus on one substantive accomplishment at a time.
- Each step MUST be validated before moving to the next.
- Do not assume a change works. Verify it.

## Accuracy

- Verify library functions exist in the project's installed version before using them.
- Never invent function signatures, parameter names, or return types.
- If you cannot verify something, say so explicitly. Do not guess.
- When asked "is this correct?", list at least three potential failure modes before answering.

## Scope Control

- Only change what was asked. Don't modify unrequested code.
- Don't add abstractions without a concrete need.
- Don't import unnecessary dependencies.
- Don't rewrite entire files for small changes.
- Don't add error handling for impossible scenarios.

## Refactoring Safety

- Before refactoring, enumerate the invariants the existing code holds.
- If no tests exist for code being refactored, propose adding a characterization test first.
- After refactoring, verify each invariant still holds.

## Communication

- Acknowledge uncertainty explicitly. Say "I don't know" when appropriate.
- Surface hidden trade-offs when generating code with architectural implications.
- Don't summarize changes unless asked. Don't apologize.

## References

- https://github.com/cline/clinerules
- https://docs.cline.bot/improving-your-results/custom-instructions
