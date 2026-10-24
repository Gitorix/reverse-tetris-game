# Security policy

## Supported version

Only the latest version deployed from the `main` branch is supported.

## Reporting a vulnerability

Do not include API keys, tokens, passwords, or personal information in a public issue.
Use GitHub's private vulnerability reporting form from the repository Security tab when available.
If a credential may have been exposed, revoke and rotate it immediately before investigating further.

## Secret handling

This game is a static client application and does not require API keys.
Never place secrets in source files, `VITE_*` variables, build artifacts, issues, or workflow logs.
Use GitHub Actions secrets only for future services that explicitly require credentials.
