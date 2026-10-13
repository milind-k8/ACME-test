# Spec: Seed an empty database on boot
Risk: LOW
Requirement: [requirements.md → Must have](../requirements.md#must-have-mvp) ("A seed script…" and "deployed at a URL that anyone reviewing can log into"), [devops.md → Docker Compose](../devops.md) ("On first boot the API … seeds 10,000 employees if the database is empty")

## Overview
A fresh `docker compose up` should show 10,000 employees without a manual `bun run seed`. Seeding on boot is opt-in through an env var, so a real deployment can never have demo data written into it.

## Slice 1: The API seeds an empty database when asked to
- [x] With `SEED_IF_EMPTY=true` and no employees, startup inserts the same 10,000 employees as `bun run seed`
- [x] With `SEED_IF_EMPTY=true` and at least one employee, startup leaves the employees unchanged
- [x] With `SEED_IF_EMPTY` unset, startup never inserts employees, even into an empty database
- [x] Any value other than `true` or `false` stops the server at startup with an error naming `SEED_IF_EMPTY`
- [x] The API logs one line when it seeds, and nothing when it doesn't
- [x] `docker compose up` on a new volume shows 10,000 employees after login

## Out of scope
- Re-seeding or resetting from the UI.
- Seeding anything other than employees (the FX snapshot already comes from a migration).
- Changing `bun run seed`, which still wipes and reloads on demand.

## Decision
- **Opt-in flag**, not always-seed-when-empty. Always-on is simpler, but once HR can delete employees (CRUD spec), deleting everyone and restarting would bring back 10,000 fake people. The flag defaults to off; only `docker-compose.yml` turns it on for the demo.

---
- [x] Reviewed
