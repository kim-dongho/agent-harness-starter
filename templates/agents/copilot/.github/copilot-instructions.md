This is a {{STACK}} project called {{PROJECT_NAME}}.

## Build & Test

- `{{BUILD_COMMAND}}` to build
- `{{TEST_COMMAND}}` to run tests
- `{{LINT_COMMAND}}` to lint

## Conventions

- Use strict typing. No `any` types without explicit justification.
- Prefer named exports over default exports.
- Use descriptive, semantic variable names. `activeUsers` > `x`.
- Define constants for magic numbers. `MAX_RETRY_ATTEMPTS = 3` > `3`.
- Keep functions small and single-purpose.
- Only change what was requested. Don't modify unrequested code.
- Match existing coding style. Don't introduce new patterns unless already present.

## Code Quality

- Verify library functions exist in the installed version before using them.
- Never invent function signatures or return types.
- Enumerate edge cases (empty inputs, boundary values, concurrency) before validating correctness.
- Before refactoring, enumerate invariants. After refactoring, verify each still holds.
- If no tests exist for code being refactored, propose a characterization test first.

## Context Hints

- Keep relevant files open in tabs for better context.
- Colocate related code: components, tests, types, and hooks together.
- Use strategic comments at the top of complex modules to describe purpose.

## Security

- Never hardcode secrets or credentials.
- Sanitize all user input at system boundaries.
- Validate authentication and authorization on all protected endpoints.

## References

- https://github.com/github/awesome-copilot
- https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
