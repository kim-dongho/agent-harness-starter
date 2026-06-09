# Project: {{PROJECT_NAME}}

## General Instructions

- Stack: {{STACK}}
- `{{BUILD_COMMAND}}` to build
- `{{TEST_COMMAND}}` to run tests
- `{{LINT_COMMAND}}` to lint

## Coding Style

- Use strict typing. No `any` types without justification.
- Prefer named exports over default exports.
- Use descriptive, semantic variable names.
- Keep functions small and single-purpose.
- Match existing coding style. Don't introduce new patterns unless already present.

## Code Discipline

- Only change what was requested. Don't modify unrequested code.
- Don't add abstractions for single-use code.
- Don't add error handling for impossible scenarios.
- Verify library functions exist in the installed version before using them.
- Never invent function signatures or return types.
- If uncertain, state assumptions and ask. Don't guess silently.
- Before refactoring, enumerate invariants. After refactoring, verify each still holds.
- If no tests exist for code being refactored, propose a characterization test first.
- Enumerate edge cases (empty inputs, boundary values) before confirming correctness.
- Surface hidden trade-offs when generating code with architectural implications.

## Security

- Never hardcode secrets or credentials.
- Sanitize all user input at system boundaries.
- Validate authentication and authorization on all protected endpoints.

## References

- https://github.com/google-gemini/gemini-cli
- https://googlegemini.github.io/gemini-cli/docs/cli/gemini-md
