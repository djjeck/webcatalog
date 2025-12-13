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
2. **One task at a time:** Work on one task from PLAN.md at a time, completing it fully before moving to the next.
3. **Mark progress:** Update PLAN.md to mark tasks as:
   - ⬜ Not started
   - 🔄 In progress
   - ✅ Completed
4. **Run tools:** At the end of each coding step, execute the following commands in order to validate edits and ensure code quality:

   ```bash
   # Load Node environment (required for all npm commands)
   source ~/.nvm/nvm.sh && nvm use

   # Install/update dependencies if package.json changed
   npm install

   # Validate code quality
   npm run lint && npm run typecheck && npm run format

   # Run tests and validate coverage thresholds
   npm run test:coverage
   ```

   Address any error messages and repeat the validation commands until all checks pass.

5. **Review before proceeding:** After completing each task, pause for author review before starting the next task.
6. **Adapt the plan:** If implementation reveals new requirements or better approaches, update PLAN.md accordingly before proceeding.
7. **Commit-sized changes:** Each completed task should result in a self-contained, reviewable change with tests and documentation.
