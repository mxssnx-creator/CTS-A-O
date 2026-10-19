# Range and Signal trailing validation — 2026-10-16

> Historical baseline: this report covers the earlier Signal arrays before the lower TP, SL/TP, and trail/TP values were added. The expanded defaults and matching replay are recorded in [`trailing-signal-expanded-grid-20261016.md`](trailing-signal-expanded-grid-20261016.md).

## Result

The standard Signal grid now builds every effective lane-scaled configuration that the progress report counts. A mismatch had caused the tape builder to drop 5 effective configurations per Signal pair: two capped-trailing cells and three merged trailing-only cells. Progress still reported those cells. The fix applies the configured minimum-trail floor to standard Signal protections after lane scaling, then deduplicates by effective config identity. Historical/custom Signal protections remain subject to their exact lane-distance floor; a custom trail that scales below its floor stays disabled. A regression covers both paths and the local/worker builders.

No default TP, SL, trail, range-floor, or acceptance-gate values changed. The fix restores standard Signal cells from the existing arrays; their configured trail values remain unchanged, with the existing minimum-trail floor applied after lane scaling. The configured trail-share grid remains `[0, 0.25, 0.5, 0.75]` of TP across the five tagged ranges. Existing lower-range values and floors were preserved. The simulated results do **not** show stable hourly gains across every range; they do not justify promoting or changing a numeric profile.

## Configured range grids

Each count below is TP × SL-ratio × trail-share × hold before aliases collapse. It describes the tagged range's configured cells, not how many cells pass a Base gate in a particular market window.

| Range | Grid dimensions | Configured cells | Trail / TP ratios |
|---|---:|---:|---|
| Micro | 7 × 17 × 4 × 2 | 952 | 0, 0.25, 0.5, 0.75 |
| Minimal | 9 × 7 × 4 × 2 | 504 | 0, 0.25, 0.5, 0.75 |
| Short | 6 × 7 × 4 × 2 | 336 | 0, 0.25, 0.5, 0.75 |
| General | 8 × 6 × 4 × 2 | 384 | 0, 0.25, 0.5, 0.75 |
| Long | 10 × 6 × 4 × 2 | 480 | 0, 0.25, 0.5, 0.75 |

The untagged Wide grid remains part of the engine and is reported separately in the replay results. The unchanged range-specific stops, trailing floors, lower-range boundaries, and minimum-lane rules are defined in `src/core/minimal-coord.ts`; the standard Signal values are in `src/core/signal-config.ts`.

Signal value arrays in the run were the defaults: Normal TP `[2.5%, 3%, 4%, 5%, 6%]` × SL/TP `[1.5, 2, 3]`; capped Trailing TP `[3%, 4%, 5%, 6%, 8%]` × trail/TP `[0.4, 0.6, 0.8]` at SL/TP `3`; and Trailing-only hard SL `[1.5%, 3%, 6%]` × trail gap `[0.5%, 1%, 2%]`, with no TP and a 1× step. The standard grid is 15 + 15 + 9 requested configs per pair. Lane-scaled aliases deduplicate by effective config identity; custom historic configs keep their own qualification and floor behavior.

## Signal build and coverage

The configured Signal universe requested 39 cells per source/range pair (15 Normal, 15 capped Trailing, 9 Trailing-only), or 19,656 requested IDs. Lane scaling produced 19,278 unique effective IDs; 378 requested IDs alias another effective lane config. Every requested ID was represented, and every effective configured ID was built in both completed runs. Captured inventories also include historical configs: 19,809 rows for 12h (531 historical) and 19,811 for 24h (533 historical). The configured subset was not dropped or qualified based on a sibling type.

| Window | Runtime steps processed | Range-coverage rows | Requested engine cells | Built/kept | Excluded by Base target | Excluded by Base range | Signal progress steps | Peak RSS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 12h | 12/12 | 405 | 105,744 | 30,360 | 41,280 | 34,104 | 12/12 | 877 MB |
| 24h | 24/24 | 434 | 113,688 | 33,224 | 41,696 | 38,768 | 24/24 | 997 MB |

For both engine runs, built/kept plus the two explicit gate-exclusion reasons equals the requested engine cells; no requested cell has an unexplained omission. `allSets` was false: this was the normal gated admission path, not forced generation of every theoretical candidate outside the selected focus and Base gates. The corresponding raw captures and preflights are under `runs/trailing-range-hourly-20261016/`.

## Replay protocol and outcome

Both runs used the same cached historical 1m feed, four symbols (ATOM, APT, NEAR, DOT), the full 1/5/15/30m runtime lanes, 48h of prehistory, simulated orders only, 0.20% round-trip costs, unchanged settings/gates, and a $10 starting balance. They covered 2026-10-14 09:00–21:00 UTC (12h) and 2026-10-13 21:00–2026-10-14 21:00 UTC (24h). The 12h window is inside the 24h window, so these are not independent validation samples. Open end-of-window positions are marked separately from settled closes.

Return-based PF is primary and uses the same funded settled orders as the reported order count. Cash PF is a separate sizing/reconciliation diagnostic.

| Window | Funded settled orders | Return PF | Net | Hourly outcome | Complete checks |
|---|---:|---:|---:|---|---:|
| 12h | 1,805 | 15.69 | +$0.4197 | 8 green, 1 red, 3 flat | 65/65 |
| 24h | 2,212 | 4.96 | +$0.3826 | 13 green, 5 red, 6 flat | 65/65 |

Per-range funded settled performance:

| Range | 12h orders | 12h Return PF | 12h net | 24h orders | 24h Return PF | 24h net |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 288 | 108.03 | +$0.0218 | 434 | 1.54 | −$0.0320 |
| Minimal | 1,463 | 13.32 | +$0.3612 | 1,717 | 7.34 | +$0.3858 |
| Short | 0 | unavailable | $0.0000 | 0 | unavailable | $0.0000 |
| General | 0 | unavailable | $0.0000 | 0 | unavailable | $0.0000 |
| Long | 0 | unavailable | $0.0000 | 1 | 0.00 | −$0.0073 |
| Wide | 11 | 290.63 | +$0.0045 | 17 | 11.34 | +$0.0039 |
| Signals | 43 | 51.27 | +$0.0323 | 43 | 51.27 | +$0.0321 |

High PFs in Wide and Signals come from small samples (11–17 and 43 orders). Short and General had no funded closes, so their PF is unavailable. No Trailing-only Signal order was funded in either run. The large Micro PF change as the overlapping window extends, the losing 24h Micro result, and the red/flat hours show that hourly positivity is **not achieved** and that this short replay is not stable evidence for numeric tuning.

The full tracked hourly and range summaries are [`12-hour replay`](sims/trailing-config-hourly-12h-20261016.md) and [`24-hour replay`](sims/trailing-config-hourly-24h-20261016.md). Raw engine captures, signal-progress inventories, preflights, and HTML tables remain in the local ignored run folder for reproducibility within this workspace.

## Verification

- Focused range, builder, Signal, admission, and processing bundle: **125/125 passed** (`focused-tests-final.txt`).
- Signal discovery regression retest: **4/4 passed**; Signal progress tests: **3/3 passed**.
- `npm run typecheck`: passed.
- Scoped ESLint on changed TypeScript files: **0 errors**, 4 unused-variable warnings.
- Both full-engine hourly simulations completed with **65/65 consistency checks**; compute time was about 12s and 16s, respectively.
- Feed SHA256: `50605bcacd8a97d3074ba8501c1497d92abf24d90f99ce7979c98ff5f81b9a79`.
- Baseline: `ec30c30c80c9d5531e368ac7de5084d41ac79d23`. Tested source changes add the Signal grid/floor parity fix only; a later commit reference will be recorded in the operations handoff.

This is retrospective, simulated evidence on four symbols. It is not a held-out market study or venue-owned execution evidence, does not establish durable positive hourly PF, and does not justify live promotion. Existing prior range studies also remain a reason not to select trailing values on these overlapping outcomes. Keep all configured lower-range values and current qualification gates until a predeclared, independent, held-out comparison supports a change.
