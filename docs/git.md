# Git Setup

## Branch strategy

- main: production-ready, protected
- develop: integration branch
- feature/*: short-lived feature branches
- hotfix/*: urgent fixes

## Commit conventions (Conventional Commits)

Use the following format:

- feat(scope): short description
- fix(scope): short description
- docs(scope): short description
- chore(scope): short description

Examples:
- feat(auth): add refresh token flow
- fix(api): handle missing task id

## Pre-commit hooks

1) Run the hook setup script:

- PowerShell:
  - scripts/setup-githooks.ps1

- Bash:
  - scripts/setup-githooks.sh

2) The pre-commit hook blocks secrets and private keys from being committed.
