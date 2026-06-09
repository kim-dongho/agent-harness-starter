# Coding Conventions

## Project

- Name: {{PROJECT_NAME}}
- Stack: {{STACK}}

## General

When writing code, you MUST follow these principles:

- Code should be easy to read and understand.
- Keep the code as simple as possible. Avoid unnecessary complexity.
- Use meaningful names for variables, functions, etc. Names should reveal intent.
- Functions should be small and do one thing well.
- Prefer fewer arguments in functions. Aim for no more than three.
- Only use comments when necessary. Strive to make the code self-explanatory.
- Properly handle errors and exceptions to ensure robustness.
- Consider security implications. Implement best practices against common vulnerabilities.

## Scope Control

- Only change what was requested. Don't modify unrequested code.
- Match existing coding style. Don't introduce new patterns unless asked.
- Don't add abstractions for single-use code.
- Don't add error handling for impossible scenarios.
- Before refactoring, verify existing tests pass. After refactoring, verify again.

## Verification

- Verify library functions exist in the project's installed version before using them.
- Never invent function signatures or return types.
- If you cannot verify something, say so explicitly.
- Enumerate edge cases before confirming correctness.

## References

- https://github.com/Aider-AI/conventions
- https://aider.chat/docs/usage/conventions.html
