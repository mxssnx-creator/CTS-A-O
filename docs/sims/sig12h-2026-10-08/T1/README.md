# T1 — signals only, 12 h, 20 symbols (V3 as live: Normal stops 1.5/2/3×, Trailing trail 0.4/0.6/0.8 stop 3×, hold 24 h)

Desk `../desks/T1.json`, window 2026-10-07T12:00 → 2026-10-08T00:00 UTC (24 h pre-history), balance $20, `CTS_CORE_VARIANTS=1`. Wall time 555 s (compute 101 s, 107 variant runs).

**Checks: 40/41 ok — FAILED: execution: signals executed orders.** The HTML report was not published as an Artifact (the report-page test passes, 2/2, but the run check fails).

## Result: the desk executed 0 orders

Signals: 0 orders closed, 0 open at the end, PF closed – / PF incl. open –, net 0 / net incl. open 0, WR –, max drawdown 0. No engine config traded either (Normal off, every engine grid off and excluded: 0 engine configs evaluated). The per-type, trail, stop, source, symbol and hour tables of the executed book are therefore empty (see session.md).

**Cause:** every one of the 38,775 signal entry candidates was skipped at `sig:confirm`. Signal confirmation (`wf.coord.confirm`, a positive coordination) lets a signal enter only while an engine candidate is open on its symbol in its direction. With every engine range off there is never an engine candidate, so no signal can ever enter. A "signals only" desk needs an engine candidate source left on, or confirmation off, and turning confirmation off loses heavily here (variants below). T0, T2 and T3 share the same engine-off base and should hit the same wall.

## Variants (same tapes, one switch each; the baseline reproduces the session run)

Only the rows that produced orders are shown (every other row: 0 orders, no effect). Net in % of one unit, unit basis.

| variant | orders | PF unit closed | net closed (%) | open at end / net (%) | net incl. open (%) |
|---|---:|---:|---:|---:|---:|
| Baseline (as run) | 0 | – | 0 | 0 / 0 | 0 |
| DCA on | 407 | 0.73 | -230 | 865 / -1110 | -1341 |
| ↳ of which Signals | 303 | 0.70 | -226 | – | – |
| Axis on | 121 | 4.79 | 163 | 494 / -505 | -342 |
| ↳ of which Signals | 63 | 17.59 | 157 | – | – |
| Signal confirmation off | 1925 | 0.27 | -6143 | 2940 / -6888 | -13030 |
| Signal acceptance and confirmation off | 2826 | 0.39 | -6298 | 4023 / -9315 | -15613 |
| Coordination off | 1925 | 0.27 | -6143 | 2940 / -6888 | -13030 |

- **Axis on** is the only row that beats the baseline on closed PF and net: Axis provides the engine candidates that confirm signals, and the 63 confirmed signal orders closed at PF 17.6 (+157 %). It still holds 494 open orders marked at −505 % at the end, so net incl. open is −342 %. The open orders' gross split is not dumped, so PF incl. open cannot be computed exactly (≥ 0.36: the value if all of the −505 % is loss).
- Confirmation off (1,925 orders, PF 0.27, −13,030 % incl. open) and acceptance + confirmation off (PF 0.39) confirm that confirmation must stay on.
- Normal on (`type:normal`) is listed as a recompute row (it needs new tapes) and was not run. Signal ranking net / drawdown / lowdd, acceptance off and own last-N rows all had no effect (0 orders).

## What the signals would have done without the confirmation gate (not executed)

These are the closes of the signal configs while their unit (pair × symbol × direction) was active, each config at one unit, with no confirmation, caps or duplicate gates. It is the seated pool from session.md, an upper bound on activity, not a book. Net in % of one unit.

| split | configs | closes | WR | PF unit | net (% of a unit) |
|---|---:|---:|---:|---:|---:|
| all signals | 3193 | 16475 | 60 % | 0.58 | -20445 |
| Normal (tr0) | 1640 | 9237 | 54 % | 0.53 | -14064 |
| Trailing | 1553 | 7238 | 68 % | 0.65 | -6381 |
| trail 0.40× | 564 | 3287 | 68 % | 0.67 | -2022 |
| trail 0.60× | 516 | 2220 | 71 % | 0.68 | -1867 |
| trail 0.80× | 473 | 1731 | 66 % | 0.61 | -2492 |
| stop 1.50× (Normal (tr0)) | 571 | 3829 | 48 % | 0.53 | -5168 |
| stop 2.00× (Normal (tr0)) | 550 | 3105 | 55 % | 0.52 | -4900 |
| stop 3.00× (Normal (tr0)) | 519 | 2303 | 64 % | 0.54 | -3996 |
| stop 3.00× (Trailing) | 1553 | 7238 | 68 % | 0.65 | -6381 |

Trailing beat Normal (PF 0.65 vs 0.53). Trail 0.4–0.6× did best (PF 0.67–0.68) and 0.8× worst (0.61). Among Normal stops, 3× lost least.

### Per source (seated pool, ≥ 20 closes): best 5 / worst 5

| source | configs | closes | PF unit | net (% of a unit) |
|---|---:|---:|---:|---:|
| sig-s2-stoch-swing-m@m15 | 30 | 230 | 3.91 | 478 |
| sig-act-burst-s@m15 | 30 | 217 | 2.34 | 332 |
| sig-obv-m@m15 | 30 | 160 | 3.68 | 312 |
| sig-atr-break-s@m15 | 30 | 254 | 1.72 | 290 |
| sig-ema-cross-s@m15 | 30 | 92 | 8.41 | 238 |
| … | | | | |
| sig-s2-atr-break-s@m15 | 27 | 96 | 0.09 | -524 |
| sig-r-nr-break-s@m15 | 23 | 120 | 0.17 | -525 |
| sig-swing-m@m15 | 30 | 220 | 0.33 | -547 |
| sig-impulse-m@m15 | 27 | 88 | 0.05 | -566 |
| sig-thrust-s@m15 | 27 | 159 | 0.15 | -762 |

### Hour by hour (seated pool, by close hour)

| hour (UTC) | closes | PF unit | net (%) | cumulative net (%) |
|---|---:|---:|---:|---:|
| 12:00 | 1143 | 0.57 | -1927 | -1927 |
| 13:00 | 776 | 4.46 | 1386 | -541 |
| 14:00 | 1891 | 9.62 | 4066 | 3525 |
| 15:00 | 2778 | 0.59 | -3994 | -469 |
| 16:00 | 761 | 1.74 | 448 | -22 |
| 17:00 | 1112 | 1.59 | 771 | 749 |
| 18:00 | 575 | 0.98 | -10 | 739 |
| 19:00 | 940 | 1.67 | 648 | 1387 |
| 20:00 | 741 | 0.25 | -1880 | -493 |
| 21:00 | 2183 | 0.91 | -431 | -924 |
| 22:00 | 2425 | 0.11 | -13270 | -14193 |
| 23:00 | 1150 | 0.15 | -6251 | -20445 |

## Optimal per source × symbol (hindsight)

Not computable from this run. The system traded nothing on any source × symbol, and the dump stores per-config results only for executed orders (per-source aggregates are over all symbols). A hindsight best config per source × symbol needs per-config × symbol closes, which the report does not record.

Files: session.md, writeup.md and html/ (report data) from `scripts/core-session.mjs`; raw.json not committed.
