# WebCatalog

This is a web UI for a WinCatalog database.

WinCatalog is a Windows utility that scans external drives, and offers a search bar to locate content within these drives; you can see its features at https://www.wincatalog.com/features.html.
WinCatalog stores its data as a SQLite DB with a proprietary schema.

This project offers a simple web-based UI that reads the SQLite save-file DB, and lets you perform a text-based search. The app is dockerized, for easy deployment. It uses React as web framework, and an backend using Express.js.

## Development process

- Claude is in charge of implementation, while the author provides requirements and acts as a thorough code reviewer.
- The project should aim at 100% test coverage, where applicable.
- Generally, the outcome of a prompt should be a self-contained change, git commit sized, with updated test coverage where applicable.
- The code will be formatted by auto-formatters. The git origin will reject commits that don't match the auto-formatter style.

### Implementation workflow

1. **Read documentation first:** Before reading source files, read the relevant documentation. Key docs:
   - [README.md](README.md) — features and deployment guide
   - [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) — WinCatalog SQLite schema
   - [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — architecture, testing, contributing
2. **Work from GitHub issues:** All implementation work is driven by GitHub issues. Read the issue carefully before starting.
3. **Run tools:** At the end of each coding step, execute the following commands in order to validate edits and ensure code quality:

   ```bash
   # Load Node environment (required for all npm commands)
   source ~/.nvm/nvm.sh && nvm use

   # Install/update dependencies if package.json changed
   npm install

   # Validate code quality (these must all pass for CI to succeed)
   npm run lint           # ESLint checks
   npm run typecheck      # TypeScript type checking
   npm run format         # Auto-format code with Prettier
   npm run format:check   # Verify formatting matches (CI uses this)

   # Run tests and validate coverage thresholds
   npm run test:coverage
   ```

   Address any error messages and repeat the validation commands until all checks pass.

   **Note:** The GitHub Actions CI workflow runs these same checks. If they pass locally, they should pass in CI.

4. **Update the changelog:** Add user-visible changes to the `[Unreleased]` section of [CHANGELOG.md](CHANGELOG.md). Only include changes that are meaningful to end users (new features, behavior changes, bug fixes) — omit dependency upgrades, test improvements, and internal refactors.
5. **Update documentation:** Update the relevant documentation files (README.md, docs/) to reflect any changed behavior.
6. **Review before proceeding:** After completing the work, STOP and wait for author review before starting anything else.
