# CTS-A-O — standing instructions

- Keep the positive coordinations in every change: read `docs/positive-coordinations.md` first. Code defaults,
  presets, desk settings and patches keep them on; turning one off needs a causal comparison that beats it, recorded
  in that file. `src/core/positive-defaults.test.ts` pins the defaults.
- Long-running processes (desks, sessions, test runs) start with `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`.
