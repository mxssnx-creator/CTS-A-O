# Five-range 24 h sessions — r5-latest and r5-v3b (7 Oct)

The operator's goal: a 24 h trade simulation with the five ranges Micro (mc), Minimal (mn), Short (sh), General (gn) and Long (lg) all on.
Every config runs and is evaluated, and the report gives orders and PF per range. The reported PF was checked against the raw trades.
Simulation only: real BingX 1m data, paper book, no orders placed.

- Desk: `/tmp/desk-5ranges.json` (the operator's 7 Oct desk; all five grids on, Wide excluded from live, Block / DCA off, Axis on, signals on with confirmation and acceptance).
- Command (each window, run one after the other): `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=2 node --max-old-space-size=7168 --expose-gc --experimental-strip-types --no-warnings scripts/core-session.mjs --symbols 30 --pre 24 --run 24 --focus all --desk /tmp/desk-5ranges.json --max-wait-min 300 --end-at <END> …`
- **r5-latest**: run 2026-10-06T21:00 → 2026-10-07T21:00 UTC (the latest 24 h, a falling market).
- **r5-v3b**: run 2026-10-05T15:00 → 2026-10-06T15:00 UTC (the v3b rally window).
- Each folder holds `session.md`, `writeup.md` and `html/` (raw.json is not committed because it is too large).
- The first r5-latest attempt was killed by a container restart at variant 54/108 and was re-run from scratch. The numbers below are from the completed re-run.

## Per range — executed book

PF closed = gross profit ÷ gross loss of the closed orders. Unit PF (r) is the engine's PF, each order at one unit; $ PF is as the live caps size it.
PF incl. open adds the orders still open at the run end, marked to market (`raw.openEnd`, exact rule: executed by the engine through every gate). This is unit r, recomputed here; the report does not print a per-range PF incl. open.
Net is in $ for the closed orders (start balance $10) and in r (sum of unit returns) closed / incl. open.

### r5-latest (falling market)

| range | Base passed / evaluated | seated (configEval) | orders | PF closed unit | PF closed $ | PF incl. open (unit) | net $ closed | net r closed → incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 169 / 5900 | 5720 | 56 | 50.02 | 24.47 | 50.02 (0 open) | $0.00 | 0.17 → 0.17 |
| Minimal | 2102 / 24972 | 5396 | 21904 | 1.88 | 2.35 | 1.35 (3606 open) | $0.82 | 88.95 → 50.63 |
| Short | 693 / 8176 | 2890 | 1587 | 0.51 | 0.51 | 0.49 (87 open) | −$0.18 | −10.95 → −12.02 |
| General | 570 / 8176 | 624 | 224 | 0.36 | 0.25 | 0.35 (36 open) | −$0.04 | −3.05 → −3.26 |
| Long | 618 / 8176 | 971 | 254 | 0.40 | 0.39 | 0.41 (61 open) | −$0.13 | −5.38 → −5.71 |
| Wide (axis) | 362 / 19072 | 319 | 0 | – | – | – | $0.00 | 0 |
| Signals | 126 / 126 | 3366 units at start (5604 over the run; 2417 / 2520 configs entered) | 5217 | 1.35 | 1.06 | 0.53 (7582 open) | $0.08 | 28.88 → −123.03 |
| **Total** | 2704 / 25098 | 15920 engine + 2520 signal | 29242 | 1.45 | 1.22 | 0.79 (11372 open) | $0.55 | 98.62 → −93.22 |

Balance $10.00 → $10.55 (closed). Equity at end $8.60: 56 positions / 11372 orders still open, MTM −$1.94. Equity max drawdown 21.0 %.

### r5-v3b (rally)

| range | Base passed / evaluated | seated (configEval) | orders | PF closed unit | PF closed $ | PF incl. open (unit) | net $ closed | net r closed → incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 104 / 5900 | 1723 | 100 | 0.67 | 0.33 | 0.65 (6 open) | −$0.01 | −0.12 → −0.13 |
| Minimal | 1806 / 24972 | 9756 | 15453 | 1.21 | 1.40 | 1.24 (821 open) | $0.41 | 21.48 → 24.42 |
| Short | 627 / 8176 | 2334 | 1324 | 2.71 | 1.18 | 2.66 (325 open) | $0.02 | 17.29 → 18.18 |
| General | 537 / 8176 | 847 | 508 | 2.13 | 1.01 | 2.39 (136 open) | $0.00 | 6.26 → 8.12 |
| Long | 668 / 8176 | 1438 | 590 | 2.40 | 1.18 | 3.09 (387 open) | $0.01 | 11.81 → 19.28 |
| Wide (axis) | 269 / 19072 | 440 | 0 | – | – | – | $0.00 | 0 |
| Signals | 126 / 126 | 3395 units at start (2520 configs) | 9036 | 6.77 | 4.73 | 2.43 (4422 open) | $2.79 | 223.05 → 171.95 |
| **Total** | 2441 / 25098 | 16538 engine + 2520 signal | 27011 | 2.71 | 2.59 | 1.97 (6097 open) | $3.22 | 279.77 → 241.80 |

Balance $10.00 → $13.22 (closed). Equity at end $12.42: 36 positions / 6097 orders still open, MTM −$0.81. Equity max drawdown 15.4 %.

Every range is on and evaluated in both windows. All five ranges and Signals executed orders. Wide (the Axis configs; Wide is excluded from live) seated configs but executed none. Its candidates were skipped by engineSide / lastN / symPf, so the report's check "strategy type axis executed orders" fails in both windows.

## PF check — recomputed from raw.json

Method: each executed trade of `raw.trades` was assigned to a range by its config id's range tag (`|mc|mn|sh|gn|lg|`). Ids with no tag go to Wide and signal indications to Signals. Each bucket's gross profit and gross loss of `r` were summed and compared with the report's `gpR` / `glR` / `pfU` (session.json `ranges`, `strategies.total`).

| | r5-latest | r5-v3b |
|---|---|---|
| order count per range | all equal | all equal |
| unit PF per range and total | all equal (to 1e-6 on gp and gl) | all equal |
| $ PF: ranges summed vs total vs hours summed | 1.2174 = 1.2174 = 1.2174 (29242 orders each way) | 2.5924 = 2.5924 = 2.5924 (27011 orders each way) |

**No mismatch.** The reported PF is correct: per range and overall, the unit PF equals the recomputation from the raw trades. The $ gross profit and loss of the ranges add up exactly to the total and to the hour rows.
The $ PF itself depends on the report's causal sizing (caps), so it was checked for consistency rather than re-sized independently.

Read with care: the open orders at the end weigh heavily. In r5-latest the closed PF 1.45 becomes 0.79 including the open orders (11372 open; Signals alone have 7582 open at −151.9 r). In r5-v3b the closed PF 2.71 becomes 1.97 including them.

## Completeness and checks

| | r5-latest | r5-v3b |
|---|---|---|
| report checks | `checks: 54/57 ok` — FAILED: config sets: every built config kept or dropped for too few closes; execution: strategy type axis executed orders; memory: the reported compute ran at the full level (no memory fallback) | `checks: 55/57 ok` — FAILED: config sets: every built config kept or dropped for too few closes; execution: strategy type axis executed orders |
| sets table | Short, General, Long, Wide only. **Micro and Minimal are missing**: the reported compute hit memory pressure (1130 MB available, process 12.5 GB) and carried Micro and Minimal over from the earlier compute (`fallback micro and minimal carried`) | all ranges present |
| built vs kept (built − kept, too few closes = 0) | Short 186 / 437 · General 103 / 102 · Long 76 / 77 (normal / trailing); Wide all kept | Micro 230 / 74 · Minimal 140 / 228 · Short 59 / 129 · General 17 / 29 · Long 31 / 27; Wide all kept |
| indications Base evaluated that built no set | 16 | 19 |

The built − kept gap is not explained by "too few closes" (0 everywhere), and that is the failing config-sets check in both windows.

`node --experimental-strip-types --no-warnings --test src/core/report-page.test.ts`: 2 / 2 pass. typescript 5.9.3, the lockfile's version, was installed outside the repo because the clone had no node_modules.
