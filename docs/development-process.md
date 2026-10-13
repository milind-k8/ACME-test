# Development Process

The core rules every area follows: how code gets into this repo, and the conventions shared by frontend, backend, and devops. Area-specific rules live in [frontend.md](frontend.md), [backend.md](backend.md), and [devops.md](devops.md). They link here and never repeat it.

Much of the vocabulary here (vertical slices, risk-based depth, Tidy First, the four rules of simple design) comes from Incubyte's [Bee](https://github.com/incubyte/ai-plugins/tree/main/bee) workflow. I adopted its conventions rather than installing the plugin, so I stay in control of every step.

## The flow for every feature

```
requirements.md
   → spec    docs/specs/NN-<feature>-spec.md    WHAT: acceptance criteria, risk, out of scope
   → plan    docs/plans/NN-<feature>-plan.md    HOW: per slice: API contract → backend → frontend
   → build   one slice at a time, red → green → refactor
   → review  run the full test suite, review the diff myself, tick the spec's ACs
   → record  update the plan with what was actually built, plus a short ai-log.md entry
```

The spec and the plan each end with `- [ ] Reviewed`. I tick it after reading and editing the document, and nothing gets built from an unreviewed doc.

## Slicing

- **Slice by user-visible capability, not by layer.** "HR can log in" is a slice. "Create all the tables" is not. Specs and plans are vertical even though the area docs are horizontal.
- **The first slice is a walking skeleton**: the thinnest path through UI, API, and DB. Each later slice adds one capability on top of the ones before.
- A slice is small enough to finish in one sitting and can be tested on its own.
- **Contract first.** Each slice starts by adding its request/response types to `src/shared/api-types.ts`. Backend and frontend work then proceed against those types.

## Depth depends on risk

| Risk | Examples here | Spec depth | Test depth |
|------|---------------|-----------|-----------|
| HIGH | Login, auth middleware | 8–12 ACs, including security and failure modes | Happy path, edge cases, failure modes, security (tampered/expired token, timing-safe compare) |
| MODERATE | Creating and editing salaries, insights maths | 5–8 ACs | Happy path, edge cases, error cases, boundaries |
| LOW | Seed script, list view | 3–5 ACs | Happy path plus one or two edge cases |

## TDD rules

1. **Red.** Write one failing test for the next acceptance criterion. Run it and watch it fail *for the right reason*.
2. **Green.** Write the minimum code that makes it pass, and nothing speculative.
3. **Refactor.** Improve names, remove duplication, and fix structure while the tests stay green.

- No production code without a failing test first. Wiring, config, and pure styling are the only exceptions.
- **Test behaviour, not implementation.** A rename shouldn't break a test.
- **One reason to fail per test.** Test names describe the scenario: `it('returns 401 when the token has expired')`.
- **Fast and deterministic.** In-memory SQLite, a seeded RNG, an injected clock, and no network calls.
- **Tests sit next to the code they test** (`money.ts` → `money.test.ts`), named the same plus `.test`.
- **A bug fix starts with a test that reproduces the bug.**
- Runner: `bun test` everywhere. Area docs say what each kind of test covers.

## Clean code

- **YAGNI.** If no test or acceptance criterion needs it now, don't build it. No interface with a single implementation.
- **Dependencies are a cost.** Before adding a library, check whether the platform already does it (Bun built-ins, Web APIs, browser HTML/CSS) or whether we can write it in a few tested lines. Security-critical code (JWT, crypto) is the exception: use a well-audited library. Every new dependency is justified in the plan. Each area doc lists its allowed dependencies.
- **DRY applies to knowledge, not syntax.** Extract on the third duplicate, not the second.
- **SRP.** A function does one thing. If its name needs an "and", split it. If a file goes past about 200 lines, split it.
- **Group by feature, not by layer.** Don't create a folder before there's something to put in it.
- **Fail fast at the boundary.** Validate at the route, so inner code can trust its inputs. Never swallow an error.
- **No `any`.** Not as a type, not as a cast (`as any`), and not implicitly. Data from outside (request bodies, `JSON.parse`, DB rows, `fetch` responses) is typed `unknown` and narrowed by validation or a typed mapper. `@ts-ignore` is banned; `@ts-expect-error` is allowed only in tests, with a comment saying why. ESLint enforces this (`@typescript-eslint/no-explicit-any`, `no-unsafe-*`, `ban-ts-comment`) as errors.
- **Names explain intent**, so comments are only for the *why*.
- **Tidy First.** If the code I'm about to change needs cleanup, do it in its own `refactor:` commit before the feature commits.
- When rules conflict, Kent Beck's four rules of simple design decide, in this order: passes the tests → reveals intention → no duplication → fewest elements.

Tooling enforces formatting and obvious mistakes: TypeScript strict mode, ESLint (including `no-restricted-imports` for the import rules), and Prettier. `bun audit` catches vulnerable dependencies. All of these run in `bun run check`.

## Cross-cutting conventions

- **`src/shared/`** is pure code used by both sides (no Bun APIs, no DOM): `api-types.ts` (the API contract, one source of truth) and `money.ts` (`toMinor` / `fromMinor` / `formatMoney`). **Server and web never import each other; they only meet through `shared/`.** If the API changes, the types change and TypeScript flags every caller.
- **Money**: integer minor units plus an ISO 4217 currency code. Never a float for a stored amount. Reports convert to USD through the `fx_rates` table, and every USD figure shows the rate date. ([ADR-002](adrs/002-salary-currency-and-usd-reporting.md))
- **Error shape**: every error response is `{ error: { code, message, details? } }`. `400` validation (with `details` mapping each field to a message, e.g. `{ salary: "must be greater than 0" }`), `401` unauthenticated, `404` not found, `500` unexpected (logged, generic message).
- **Dates**: stored as ISO strings, shown in the user's locale.
- **Naming**: TS/JSON fields are camelCase; DB columns are snake_case (mapped in repositories, never leaked).

## Commits

- Small and intentional, one idea each, using Conventional Commits:
  - `test:` the red step (a failing test)
  - `feat:` the green step (makes the test pass)
  - `refactor:` no behaviour change
  - `fix:` a bug fix, after a `test:` commit that reproduces it
  - `docs:`, `chore:`, `build:` for docs, tooling, and config
- A typical cycle is `test:` → `feat:` → `refactor:`. If the refactor step changes nothing, there's no commit for it.
- Every commit except a deliberate `test:` (red) commit leaves the suite green.
- **I review and approve every commit myself.** The AI proposes the message and I decide.
- Never commit secrets or the `.db` file.

## Definition of done (per feature)

- [ ] Every acceptance criterion in the spec is ticked and has a passing test
- [ ] `bun run check` passes: lint, typecheck, tests, production build, and no high/critical vulnerabilities ([devops.md](devops.md#quality-gates))
- [ ] The plan is updated with what was actually built (files, migrations, libraries)
- [ ] There's an ADR for any significant decision that changed
- [ ] There's an ai-log entry if AI output was corrected or a decision was overridden

## Working with AI

I use Claude Code as a pair partner. I do the driving.

| I decide | AI helps with |
|----------|---------------|
| Scope, acceptance criteria, risk level | Drafting specs and plans for me to edit |
| Architecture, data model, API contract | Boilerplate, config, syntax |
| The test list and the edge cases | Writing test code from my list |
| Accepting or rejecting every diff and commit | Suggesting implementations and refactors |

The standing instructions for the AI are in [`/CLAUDE.md`](../CLAUDE.md). An agent reads this doc, then the area doc for the work at hand, then the feature's spec and plan. Notable prompts and corrections go in [ai-log.md](ai-log.md).

## Templates

### Spec (`docs/specs/NN-<feature>-spec.md`)

```markdown
# Spec: <Feature>
Risk: LOW | MODERATE | HIGH
Requirement: link to requirements.md section

## Overview
1–2 sentences: what and why.

## Slice 1: <walking skeleton>
- [ ] <one observable behaviour; no implementation details>
- [ ] Shows error when <...>

## Slice 2: <...>
- [ ] ...

## API shape (indicative)
POST /api/... { ... } → 201 { ... }

## Out of scope
- ...

---
- [ ] Reviewed
```

The test for a good acceptance criterion: could I write a test from it without asking a question? It describes one behaviour with no "and", gives an observable outcome, includes error cases, and never uses vague words like "correctly".

### Plan (`docs/plans/NN-<feature>-plan.md`)

```markdown
# Plan: <Feature>
Spec: link

## Slice 1: <name>
- Design intent: 1–2 lines, including what this slice is responsible for
- API contract: types added to shared/api-types.ts
- Backend: migration (if any), files with function names and signatures (no bodies)
- Frontend: files with component/function names and props (no bodies)
- Libraries added: name + why (or "none")
- Test list: [ ] unit ... [ ] integration ... [ ] component ...   (ticked during red → green)
- Quality checks: e.g. "routes contain no SQL", "money never stored as a float"

## As built
What actually changed versus the plan, and why.

---
- [x] Reviewed
```
