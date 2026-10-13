# Instructions for AI assistants

I'm committing this file on purpose. It's the standing prompt I used with Claude Code on this project.

## Before doing anything
Read `docs/development-process.md` (core rules for everyone), then the area doc for the work at hand: `docs/frontend.md`, `docs/backend.md`, or `docs/devops.md`. Put every new file where the area doc says it goes, and follow its import rules. For feature work, also read that feature's spec in `docs/specs/` and plan in `docs/plans/`. Only build from a spec and plan marked `[x] Reviewed`. Don't add anything outside the spec. Suggest it instead.

## Non-negotiables
- **Strict TDD.** Write one failing test, run it, and show me the failure. Then write the minimum code to pass, then refactor. No production code without a failing test first (wiring and config are the only exceptions).
- **Never commit without asking me.** At each red, green, or refactor checkpoint, show a summary of the diff and propose a Conventional Commit message (`test:`, `feat:`, `refactor:`, `fix:`, `docs:`, `chore:`). Wait for my approval.
- **Stop and ask** before changing the schema, the API contract, scope, or a dependency. Those decisions are mine. If one changes, update the plan or ADR as well.
- **Simplicity.** YAGNI. No interface with a single implementation, and no new library when a few lines will do. Routes contain no SQL, and the domain has no I/O.
- **Money** is stored as an integer in minor units together with its `currency`. Never use a float for a stored amount. Reports convert to USD via `fx_rates`.
- **Tests are deterministic.** Use `:memory:` SQLite, a seeded RNG, an injected clock, and no network calls.

## Commands
See [docs/devops.md](docs/devops.md#commands).

## After each feature
Update the plan's "As built" section. Then draft an `docs/ai-log.md` entry for me to edit.
