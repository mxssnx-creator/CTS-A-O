# Range switch S1 — rally 12 h (8 Oct)

Desk: `docs/sims/ranges-2026-10-08/desks/S1.json` (R1 with `wf.validLastN` 15 → **5**; `lastNFloor` 5).
Run: 20 symbols, 24 h pre + 12 h run, balance $20, focus all, `CTS_CORE_VARIANTS=1`, workers 3.
Started 2026-10-08 01:36:47 UTC; report written 02:46:55 UTC (engine `runSeconds` 4,137 ≈ 69 min wall).
Files: `session.md`, `writeup.md`. The raw dump (`raw.json`) and HTML are not committed.

## Checks

`checks: 56/57 ok — FAILED: execution: strategy type axis executed orders`

The one failing check: Axis is on in the desk (`toggles.axis: true`), but no Axis order executed in the run.
This report is therefore **not a clean pass** under `docs/report-integrity.md`; it is kept as the record of this switch.
Other guards: `report-page.test.ts` 2/2 pass; variants baseline "reproduces the session run"; the HTML page loads
in Chromium with 0 `pageerror` and 0 console errors (112 tables, 29 charts).

## Per range

Base = the Base stage (`engine.baseByRange`: passed / evaluated). Seated = seated configs (the type rows of
"Seated configs over the run window"). Closed = orders closed (the run's `trades`). PF = unit PF (per-order return,
0.20 % cost). PF incl. open = the same PF with the 8,177 orders still open at the end added at their mark-to-market.
Net = Σ trade % (unit), closed and closed + open. Open = orders open at end (`openEnd`).

| range | Base passed / evaluated | seated | orders closed | PF closed | open at end | PF incl. open | net (closed) | net (incl. open) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 80 / 5,900 | 2,084 | 52 | 0.75 | 3 | 0.67 | −5.75 % | −8.44 % |
| Minimal | 1,630 / 24,972 | 18,128 | 11,471 | 0.95 | 1,514 | 0.82 | −428.09 % | −2,007.39 % |
| Short | 474 / 8,176 | 3,654 | 1,021 | 0.83 | 271 | 0.69 | −237.03 % | −502.60 % |
| General | 492 / 8,176 | 1,748 | 545 | 1.17 | 187 | 0.98 | +139.60 % | −24.08 % |
| Long | 608 / 8,176 | 2,628 | 450 | 0.86 | 248 | 0.79 | −154.88 % | −285.08 % |
| Wide | 290 / 19,072 | 1,032 | **0** | – | 0 | – | 0 | 0 |
| Signals | 126 / 126 (signal tapes) | 3,634 signal configs (1,822 units active at start) | 8,746 | 1.49 | 5,954 | 0.75 | +7,229.00 % | −7,716.45 % |
| **Total** | 2,304 / 25,098 | | 22,285 | 1.24 (report) | 8,177 | | | |

## Why candidates did not execute, per range

From the report's "Why candidates did not execute, per range" table (skipped candidates, first gate failed).

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 68,746 | sig:duplicate 29,288 · sig:signalPf 13,675 · sig:signalCluster 11,908 · sig:signalSide 10,570 · sig:confirm 3,279 · sig:signalGuard 26 |
| Minimal | 52,477 | lastN 26,261 · engineSide 13,970 · duplicate 7,914 · symPf 4,332 |
| Short | 5,836 | lastN 4,715 · engineSide 519 · duplicate 320 · symPf 282 |
| Long | 4,628 | lastN 3,526 · engineSide 468 · duplicate 378 · symPf 256 |
| General | 3,227 | lastN 2,452 · duplicate 439 · symPf 179 · engineSide 157 |
| Micro | 2,397 | crowd 1,510 · engineSide 465 · lastN 378 · duplicate 30 · symPf 14 |
| Wide | 1,584 | engineSide 716 · lastN 692 · symPf 176 |

## Read against the operator's goal

Goal: every range works with high order counts and PF including open > 1.

- **No range meets it in this run.** PF incl. open is below 1 for every range; General is closest at 0.98 (closed PF 1.17).
- Minimal is the only range with high order counts (11,471 closed) — but its PF is 0.95 closed and 0.82 incl. open.
- **Wide traded nothing** and its Axis / DCA sets are the cause of the failing check; the Axis trades that would have
  come from Wide and the Axis toggle need a look before the next switch.
- Lowering `validLastN` 15 → 5 cut the largest skip reason in every range (`lastN`), but the executed books did not
  turn PF above 1 incl. open. Signals are the largest book (8,746 closed at PF 1.49) yet, with 5,954 open at the end,
  PF incl. open is 0.75.

Not a conclusion about live trading: a 12 h simulation on 20 symbols with one balance, one desk and one window.
