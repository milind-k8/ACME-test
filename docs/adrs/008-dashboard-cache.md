# ADR-008: Cache dashboard responses, invalidated by SQLite's own change counters

**Status:** Accepted · 2026-10-13

## Context
HR opens the dashboard often and flips between the same few filters. Each response takes about 5 ms to compute at 10,000 employees ([ADR-007](007-dashboard-aggregation.md)) and grows with the data. A cache must **never return stale figures**: a salary edit, a new hire, or a re-seed has to show up on the very next request.

Three things change the answer:
1. Writes through the API (create, update, delete).
2. Writes from another process: `bun run seed`, `docker compose exec api … seed`, a manual `sqlite3` session, while the API is running.
3. The date: "hires in the last 12 months" and "average tenure" change at midnight with no write at all.

## Decision
- An in-process cache of dashboard responses, keyed by the **normalised filters + today's date**, holding at most 100 entries (least recently used evicted).
- The whole cache is tagged with a **data version** and cleared when the version changes:
  `version = total_changes() + ":" + PRAGMA data_version`
  - `total_changes()` counts every row this connection has changed since it opened, so any write through the API moves it, including future write paths nobody remembers to wire up.
  - `PRAGMA data_version` changes whenever **another** connection commits, which covers seed scripts and manual edits.
  - Reading both costs about 1.6 µs.
- **The version is read before the query runs, and the result is stored under that version.** If another process writes in between, the next request sees a newer version and recomputes. Reading it afterwards could file pre-write figures under the post-write version, which is exactly the stale case.
- Bun runs the API on one thread and `bun:sqlite` is synchronous, so a request's read-version → query → store can't interleave with another request's write in this process.

## Verified behaviour (prototype, then tests)
| Event | Version moves? | Effect |
|---|---|---|
| Read-only request | No | Cache hit |
| Insert / update / delete through the API | Yes | Recompute |
| Update that writes the same value | Yes | Extra recompute (safe) |
| Update matching no rows | No | Hit (nothing changed) |
| Write from another connection | Yes | Recompute |
| Rolled-back write | Yes | Extra recompute (safe) |

Every mistake the counters can make is an unnecessary recompute, never stale data.

## Alternatives considered
- **A version counter bumped in each write function.** Simple, but misses writes from other processes and any write path that forgets to call it.
- **A `data_version` table maintained by triggers.** Catches every writer, but needs a schema change, and SQLite triggers are row-level, so a 10,000-row re-seed fires 20,000 trigger updates. The built-in counters give the same guarantee for free.
- **Time-based expiry (TTL).** Returns stale data for up to the TTL. Ruled out by the requirement.
- **HTTP caching (`ETag` = version, `304 Not Modified`).** Saves the payload on the wire but still needs the server-side version check; a possible follow-up, not needed for one user.
- **Redis or another external cache.** One API process and one user: an extra service with nothing to share.

## Consequences
- Memory: at most 100 responses of a few KB each.
- The cache lives in one process. If the API ever ran as several processes, each would have its own cache; correctness still holds (every process checks the shared SQLite file's counters), only the hit rate drops.
- Tests prove: a hit doesn't query; an API write, a write from a second connection on the same file, and a date change each produce fresh figures.
