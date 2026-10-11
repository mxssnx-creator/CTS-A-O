# Range switch S2 — rally 12 h (8 Oct)

Desk: `docs/sims/ranges-2026-10-08/desks/S2.json` = R1 with `wf.engineSideAccept.enabled` **false** (the only
difference from R1; S2's `why` field says so). Window 2026-10-05T03:00 → 2026-10-06T03:00 UTC: 24 h pre-history,
12 h run, 20 symbols, balance $20.00, focus all, signals on, variants on (baseline reproduces the session run).

Command: `scripts/core-session.mjs --symbols 20 --pre 24 --run 12 --focus all --desk …/S2.json --balance 20
--max-wait-min 240 --end-at 2026-10-06T03:00:00Z` with `CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=3`, `MALLOC_ARENA_MAX=2
MALLOC_MMAP_THRESHOLD_=1048576`, `--max-old-space-size=8192`.

**Checks: `checks: 57/57 ok`.** Report-page test (`src/core/report-page.test.ts`): 2/2 pass.
**Wall time:** started 01:37:04 UTC, finished 03:15:00 UTC (≈ 1 h 38 min; engine run time 5,672 s, compute 579 s,
peak RSS 9,026 MB).

Files: `session.md` (the full report), `writeup.md` (the summary). The raw dump (`raw.json`, 18 MB) is not committed.

## Per range

Base passed / evaluated: pairs that passed Base in the range, of pairs evaluated (median Base PF of the passed in
brackets, from the run's writeup). Seated: engine configs that passed the seat evaluation and traded in the run
window (signals: signal configs with an entry while their unit was active). Skips: every entry candidate of a seated
config the run skipped, by first gate missed. Closed orders, PF and net are the report's dollar figures (after
the live sizing and caps). "Open at end" is the executed book still open at the run end; "PF incl. open" is on the
unit basis (unsized, from `raw.json`: closed r and open mtmR), so it is comparable across ranges but not the
dollar figure.

| range | Base passed / evaluated | seated | skip reasons (count of skipped candidates) | orders closed | PF closed ($) | PF closed (unit) | open at end | PF incl. open (unit) | net closed ($) |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| Micro | 80 / 5,900 (PF 2.76) | 1,088 | crowd 1,892 · lastN 323 · duplicate 52 · symPf 4 (total 2,271) | 78 | 1.75 | 0.57 | 3 | 0.53 | $0.00 |
| Minimal | 1,630 / 24,972 (PF 1.75) | 9,510 | lastN 19,712 · duplicate 15,455 · symPf 4,656 (total 39,823) | 25,390 | 0.75 | 0.68 | 2,550 | 0.66 | −$1.51 |
| Short | 474 / 8,176 (PF 1.65) | 2,253 | lastN 1,853 · duplicate 910 · symPf 321 (total 3,084) | 1,480 | 0.51 | 0.98 | 236 | 0.88 | −$0.13 |
| General | 492 / 8,176 (PF 1.54) | 1,106 | lastN 1,231 · duplicate 598 · symPf 216 (total 2,045) | 745 | 0.84 | 1.22 | 151 | 1.13 | −$0.02 |
| Long | 608 / 8,176 (PF 1.51) | 1,331 | lastN 2,663 · duplicate 994 · symPf 357 (total 4,014) | 742 | 0.83 | 1.24 | 314 | 1.13 | −$0.03 |
| Wide | 290 / 19,072 (PF 1.62) | 671 | lastN 313 · symPf 195 · duplicate 165 (total 673) | 1,017 | 0.48 | 0.58 | 9 | 0.57 | −$0.11 |
| Signals | 126 / 126 | 3,634 (normal 1,821 · trailing 1,813) | sig:duplicate 29,213 · sig:signalPf 13,998 · sig:signalCluster 12,046 · sig:signalSide 10,622 · sig:confirm 2,860 · sig:signalGuard 26 (total 68,765) | 8,759 | 1.25 | 1.51 | 5,922 | 0.77 | $0.71 |
| **Book** | 2,304 / 25,098 | 9,395 engine + 3,750 signal (real seats) | | **38,211** | **0.89** | **0.99** | **9,185** | — | **−$1.11** |

Book at the run end: balance $18.89 closed (−5.53 %), equity $16.63 with the open book marked to market at MTM −$2.27
(exact, sized, every gate and cap applied). Caps bind: 3,061 orders capped to $0, 34,810 scaled down.

## Against the operator's goal

Goal: every range works with high order counts and PF including open > 1.

- **Not met in this run.** No range has PF closed ($) above 1 with high counts. Micro has PF 1.75 but only 78 orders.
  Minimal has 25,390 orders at PF 0.75 — the high-count range, and the losing one.
- General and Long have unit PF above 1 (1.22 / 1.24 closed, 1.13 incl. open) on 700–800 orders, but their dollar PF
  is 0.84 / 0.83 — the live sizing takes the edge (sizing 0.67–0.69 of unit, see the "Base said, the book did" table
  in session.md).
- Short (PF unit 0.98 closed, 0.88 incl. open) and Wide (0.58) are below 1.
- Base → book: the Base-validated median PF (1.5–1.7 for General/Long/Short) falls to 0.6–0.8 of its unit value
  out of sample; Micro's Base median (2.76) falls to 0.21.

## Notes

- The S2 switch (engine direction acceptance off) is the only change from R1. Compare against R1's run to read its
  effect on the ranges; this README does not claim one.
- "Seated" uses the report's per-range config counts (configs that traded in the window), not the 9,395 real seats.
- The 12 h window is a short sample (the report says so); the goal is measured on it, not on a durable result.
