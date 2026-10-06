# CTS-A-O — standing instructions

- Keep the positive coordinations in every change: read `docs/positive-coordinations.md` first. Code defaults,
  presets, desk settings and patches keep them on; turning one off needs a causal comparison that beats it, recorded
  in that file. `src/core/positive-defaults.test.ts` pins the defaults.
- Long-running processes (desks, sessions, test runs) start with `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`.
- Session reports (`scripts/core-session.mjs`): read `docs/report-integrity.md` before changing them. The page code
  (`clientMain`) never calls a top-level helper of the script; `src/core/report-page.test.ts` and the report's own
  `checks: N/N ok` must pass before a report is published.
