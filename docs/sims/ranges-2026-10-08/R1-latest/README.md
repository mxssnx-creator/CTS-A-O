# Range round 1 — R1 (V3 desk with the Minimum grid on), latest 12 h

Desk: `docs/sims/ranges-2026-10-08/desks/R1.json` (V3, `grid.minimal` on; `live.excludeRanges: ["wide"]`,
`live.kinds: ["trailing"]` as on the desk). Run: 20 symbols, 24 h pre-history + 12 h run, window
2026-10-07T00:00 → 2026-10-08T00:00 UTC, balance $20.00, `CTS_CORE_WORKERS=2`, `CTS_CORE_VARIANTS=1`,
`MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`.

## Checks

`checks: 56/57 ok — FAILED: execution: strategy type axis executed orders`

The report is published as it was produced (explicitly allowed by the operator). The one failing check is correct
to fail: the Wide-grid Axis configs (691 seated) traded nothing, because every one of their candidates was stopped by
a gate (see *Wide* below). Nothing was relaxed to make it pass.

Run wall time: 4230 s (≈ 70 min), started 2026-10-08 02:38:58 UTC. The full-level run had no memory aborts.

## Per range

PF is unit PF (per-order return, unsized), computed from `raw.json`; "incl. open" adds the 6,705 open positions at
their mark-to-market. Net is in trade units (sum of R × 100). The report's dollar PF is in `session.md`.

| Range | Base eval / passed | Seated configs | Skipped: gate / crowd / rangeOff / toggle / lastN / other | Orders closed | PF closed | Open at end | PF incl. open | Net (trade units) |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| Micro | 5,900 / 233 | 2,165 | 257 / 700 / 0 / 0 / 270 / 0 | 43 | 0.13 | 3 | 0.12 | −47.9 % |
| **Minimal** | 24,972 / 1,767 | 10,254 (normal 3,943 · trailing 6,311) | 33,316 / 0 / 0 / 0 / 34,430 / 6,106 | **19,156** | 0.47 | 782 | 0.45 | −12,421 % |
| Short | 8,176 / 632 | 3,460 | 3,357 / 0 / 0 / 0 / 8,018 / 990 | 1,584 | 0.44 | 369 | 0.40 | −1,590 % |
| General | 8,176 / 489 | 779 | 1,286 / 0 / 0 / 0 / 3,297 / 245 | 445 | 0.55 | 147 | 0.54 | −390 % |
| Long | 8,176 / 523 | 1,145 | 1,855 / 0 / 0 / 0 / 3,444 / 157 | 450 | 0.32 | 407 | 0.33 | −926 % |
| Wide (Axis) | 19,072 / 326 | 691 (Axis) | 1,416 / 0 / 0 / 0 / 2,750 / 0 | **0** | – | 0 | – | 0 |
| Signals | 126 / 126 | 3,579 | 36,053 / 18,019 (cluster) / 0 / 0 / 0 / 23,340 (duplicate) | 6,364 | 0.61 | 4,997 | 0.37 | −7,054 % |
| **Total** | | | | **28,042** | **0.52** | **6,705** | **0.40** | |

Distinct configs that traded: Minimal 6,800 (trailing 12,667 orders, normal 6,489), Short 1,116, Long 472,
General 313, Micro 33, Signals 3,177.

Skip mapping: *gate* = symPf + engineSide (signals: signalPf, signalSide, signalGuard, confirm); *crowd* = crowd
(signals: signalCluster); *lastN* = lastN; *other* = duplicate. The report does not print rangeOff or toggle
reasons, so those are 0 here.

## Minimum (the range this round tests)

- The Minimum grid traded: 19,156 closed orders, 67 % of the book, from 6,800 distinct configs. It was the largest
  source of orders of any range, which is the operator's "high order counts" goal for this range.
- It did not earn: PF 0.47 closed, −12,421 % net in trade units. The Minimum seats lost (normal PF 0.76, trailing PF
  0.71 across their closes).
- Minimal+ (`mp`) evaluated 0 cells: it is off on this desk.

## Why Wide executed nothing

All 4,166 Wide candidates were skipped by gates: last-N 2,750 (the config's last closes fail the range gate),
engine direction acceptance 1,000, symbol PF 416. The seated Wide Axis configs closed 8,056 orders at PF 0.64 (net
−1,576 %), so the gates stopped losing trades. The check reports this as a failure by design. An earlier run with
memory fallbacks (`runs/R1-attempt1-3workers`, not published) traded 296 Wide orders, so the Wide result depends on
the compute level.

## Caveats

- The report counts the full engine book; `live.kinds: ["trailing"]` and `live.excludeRanges: ["wide"]` are not
  applied to the executed book (a report design choice, not changed here).
- A 12 h window is a short sample (`session.md`, *Timeframe lanes*).
- Attempt 1 (3 workers) hit memory aborts at Tapes and Base and fell back to lighter compute; its result (PF 1.12,
  +3.8 % closed) is not comparable and is not published.
