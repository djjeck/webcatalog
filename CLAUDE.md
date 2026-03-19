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

1. **Follow the plan:** All implementation work follows [PLAN.md](PLAN.md), which contains a detailed task breakdown organized into phases.
2. **One sub-task at a time:** Work on ONE sub-task from PLAN.md at a time (e.g., 1.1, 1.2, etc.), completing it fully before moving to the next. Wait for author review between sub-tasks.
3. **Read documentation first:** Before reading source files, read the relevant documentation. Key docs:
   - [README.md](README.md) — features and deployment guide
   - [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) — WinCatalog SQLite schema
   - [docs/DEVELOPER.md](docs/DEVELOPER.md) — architecture, testing, contributing
4. **Mark progress:** Update PLAN.md to mark tasks as:
   - ⬜ Not started
   - 🔄 In progress
   - ✅ Completed
5. **Run tools:** At the end of each coding step, execute the following commands in order to validate edits and ensure code quality:

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

6. **Update documentation:** Before marking a phase complete, update the relevant documentation files (README.md, docs/) to reflect any changed behavior.
7. **Review before proceeding:** After completing each sub-task, STOP and wait for author review before starting the next sub-task. Do not proceed to the next sub-task without explicit approval.
8. **Compact completed phases:** When all sub-tasks in a phase are complete and the phase is marked `✅`, replace the full phase section in PLAN.md with a single compact entry: the phase heading, status `✅`, and a one-sentence summary of what was delivered. Remove the sub-task details, task checklists, and acceptance criteria. The full record is in git history.
9. **Adapt the plan:** If implementation reveals new requirements or better approaches, update PLAN.md accordingly before proceeding.
