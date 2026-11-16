# Saved simulated-session results

Every real `scripts/core-session.mjs` session saves a compact record here when it finishes (window, symbols, settings,
total, per strategy, per timeframe lane, one row per hour, engine stage counts, commit and command). Replays, synthetic
markets and `--no-archive` runs are not saved. `index.json` lists the records.

```bash
node scripts/sim-compare.mjs list
node scripts/sim-compare.mjs compare docs/session-12h-v6.json docs/sim-results/<new record>.json --out diff.md
node scripts/sim-compare.mjs archive docs/session-24h.json --label legacy-session-24h   # save an older report
```

The seven `legacy-session-*` records are the earlier September 2026 reports (5 symbols with data each). A comparison
across different symbol counts, windows or settings is shown with those differences listed, but is not like-for-like.
Hours are aligned by index, not by date. A non-numeric PF such as `no loss` is shown as is and never subtracted.
