# Signal stop variant V2 — two windows (8 Oct)

Desk `docs/sims/sigstop-2026-10-08/desks/V2.json` (x01 desk of 7 Oct with signal Normal stops `[1.5, 2, 3]`× target,
signal Trailing stops 2× target, hold 48 h). Simulation only: 30 symbols, 24 h pre-historic + 24 h run, focus all,
balance $20, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`, branch `claude/sim3h-fixes` at 4fd24f6,
4 cores / 16 GB. The two sessions ran one after the other.

Unit basis: every order at one unit after the 0.20 % round-trip cost (the engine's PF unit). *PF incl. open* = gross
profit ÷ gross loss over the closed orders' `r` plus the open orders' end mark (`openEnd[].mtmR`, raw.json: the orders
the engine executed and still open at the end, marked at the last close). Net = Σ trade % (sum of `r` × 100). Ranges as
the report assigns them (`rangeOfId`; signal configs are the Signals range). Signals trailing / fixed = signal config
id with `tr>0` / `tr0` (identical to the order's kind trailing / normal in both windows).

## w-latest — window 2026-10-07 00:00 → 2026-10-08 00:00 UTC (falling market)

Report: `checks: 55/55 ok`. Wall time 1,254 s (session `runSeconds` 1,217). As sized: balance $20.00 → $18.42 (−7.88 %),
equity at end $15.67 (6,413 orders open, MTM −$2.75), PF $ 0.78.

| group | orders closed | PF closed | open at end | PF incl. open | net closed (Σ %) | net incl. open (Σ %) |
|---|---:|---:|---:|---:|---:|---:|
| Total | 10566 | 0.49 | 6413 | 0.37 | -13384 | -26131 |
| Micro | 87 | 0.37 | 5 | 0.37 | -34 | -34 |
| Short | 3826 | 0.46 | 672 | 0.39 | -3609 | -4825 |
| General | 363 | 0.65 | 56 | 0.61 | -246 | -295 |
| Long | 267 | 0.56 | 118 | 0.51 | -337 | -462 |
| Wide | 104 | 0.39 | 0 | 0.39 | -48 | -48 |
| Signals | 5919 | 0.49 | 5562 | 0.36 | -9110 | -20467 |
| Signals · trailing | 3046 | 0.52 | 2675 | 0.36 | -3973 | -9817 |
| Signals · fixed | 2873 | 0.48 | 2887 | 0.35 | -5137 | -10650 |

## w-rally — window 2026-10-05 15:00 → 2026-10-06 15:00 UTC (the 6 Oct rally of the positive v3b run)

Report: `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders`. Axis (on this desk it trades in
Wide) executed no order in this window: every Wide candidate was skipped (670 skips: lastN 345 · engineSide 256 ·
symPf 69), so Wide has 0 orders. The failed check is that execution check, not a report defect. Wall time 1,013 s
(session `runSeconds` 992). As sized: balance $20.00 → $28.38 (+41.89 %), equity at end $27.83 (5,398 orders open,
MTM −$0.55), PF $ 3.09.

| group | orders closed | PF closed | open at end | PF incl. open | net closed (Σ %) | net incl. open (Σ %) |
|---|---:|---:|---:|---:|---:|---:|
| Total | 11179 | 3.80 | 5398 | 2.52 | 22787 | 21049 |
| Micro | 108 | 0.50 | 6 | 0.49 | -26 | -27 |
| Short | 1324 | 2.71 | 325 | 2.66 | 1729 | 1818 |
| General | 508 | 2.13 | 136 | 2.39 | 626 | 812 |
| Long | 590 | 2.40 | 387 | 3.09 | 1181 | 1928 |
| Wide | 0 | – | 0 | – | 0 | 0 |
| Signals | 8649 | 4.39 | 4544 | 2.48 | 19276 | 16518 |
| Signals · trailing | 4485 | 5.76 | 2312 | 2.79 | 10249 | 8960 |
| Signals · fixed | 4164 | 3.56 | 2232 | 2.23 | 9027 | 7559 |

## Reading

- Falling market (w-latest): the book loses on every range; Signals PF 0.49 closed → 0.36 incl. open, with 5,562 signal
  orders still open at the end (about as many as closed). Trailing signals (2× stop) and fixed signals end at the same
  PF incl. open (0.36 / 0.35).
- Rally (w-rally): Signals PF 4.39 closed → 2.48 incl. open (4,544 open). Trailing signals at the 2× stop lead the
  fixed ones closed (5.76 vs 3.56) and incl. open (2.79 vs 2.23).
- The V0 / V1 / V3 runs of the same two windows are the comparison; this file holds V2 alone.
