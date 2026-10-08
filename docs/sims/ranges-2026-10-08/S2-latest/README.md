# Range switch S2 — latest 12 h

Desk: `docs/sims/ranges-2026-10-08/desks/S2.json` — R1 with `wf.engineSideAccept.enabled` **false**
(engine direction acceptance off). Window: pre-historic 2026-10-06 00:00 → 2026-10-07 00:00 UTC (24 h), run
2026-10-07 00:00 → 2026-10-08 00:00 UTC (12 h). 20 symbols, balance $20.00, focus all, branch `claude/sim3h-fixes`
(72b54dc).

**Checks: `checks: 57/57 ok`.** Variants baseline "reproduces the session run". `src/core/report-page.test.ts`
2/2 pass. The report HTML loads in headless Chromium with 0 page errors (112 tables).
**Wall time:** 2 h 02 min (03:22:59 → 05:25:10 UTC), 2 compute workers (see the note on the run below).

## Per range

Base = the engine's Base stage (pairs passed / evaluated, from the writeup). Seated = configs that took a seat
(session.md, "Seated configs"). Skipped = entry candidates of seated configs the run skipped
("Why candidates did not execute, per range"). PF is on the unit basis, the same as the engine's gates; PF $ is the
sized figure. PF incl. open counts the orders still open at the end at their mark-to-market R as if closed (computed
from `raw.json`; the report does not print it).

| range | Base passed / evaluated | seated | skipped (top reasons) | orders closed | PF closed unit / $ | open at end | PF incl. open (unit) | net $ |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| Micro | 233 / 5900 | 2165 | 1170 (crowd 940 · lastN 224) | 97 | 0.26 / 0.50 | 6 | 0.26 | -$0.01 |
| Minimal | 1767 / 24972 | 10257 | 56325 (lastN 33348 · symPf 12460 · duplicate 10517) | 34584 | 0.63 / 0.76 | 2892 | 0.59 | -$1.29 |
| Short | 632 / 8176 | 3459 | 11025 (lastN 7978 · symPf 1972 · duplicate 1075) | 2509 | 0.59 / 0.32 | 779 | 0.56 | -$0.72 |
| General | 489 / 8176 | 778 | 4410 (lastN 3273 · symPf 845 · duplicate 292) | 728 | 0.76 / 1.23 | 278 | 0.77 | $0.03 |
| Long | 523 / 8176 | 1145 | 4853 (lastN 3425 · symPf 1228 · duplicate 200) | 819 | 0.90 / 1.02 | 643 | 0.88 | $0.01 |
| Wide | 326 / 19072 | 691 | 3395 (lastN 2744 · symPf 415 · duplicate 236) | 765 | 0.59 / 0.85 | 6 | 0.58 | -$0.02 |
| Signals | 126 / 126 | 3579 | 77412 (duplicate 23340 · signalPf 19638 · signalCluster 18019 · signalSide 12554) | 6364 | 0.61 / 0.93 | 4997 | 0.37 | -$0.20 |

Total: 9601 orders open at the end (MTM −$2.47 in dollars; −25.63 R in Minimal, −141.93 R in Signals).

## Goal check

The goal was every range with high order counts and PF including open > 1. **Not met in this run.** No range has PF
incl. open above 1. General (0.77) and Long (0.88) are closest but have only 728 and 819 closed orders. Micro has 97
closed orders at PF 0.26. Minimal, the only range with high order counts, is at 0.59 incl. open.

## Run note

The first attempt used `CTS_CORE_WORKERS=3` with the otherwise identical command. Process memory peaked at about
12.9 GB on this 16 GB host. The engine aborted two tape computes on memory pressure (1188–1190 MB available, hard
1200 MB), and they fell back to a lighter level that left out Micro and Minimal. Its checks line read
`checks: 56/57 ok — FAILED: memory`, so it was not published. That attempt is not in this folder.
The reported run uses `CTS_CORE_WORKERS=2`, with everything else as specified. It had no memory aborts.

## Files

- `session.md` — the session report (funnel, per-range tables, skip reasons, seated configs, heatmaps).
- `writeup.md` — the summary (result, findings, hour by hour).
- The HTML report and `raw.json` are not committed here (the HTML is generated under `runs/S2-latest/`, which is
  not in git; `raw.json` is 11 MB).
