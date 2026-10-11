# V3 — signal Normal stops 1.5 / 2 / 3× target, Trailing stops 3×, hold 24 h

Desk `docs/sims/sigstop-2026-10-08/desks/V3.json` (x01 of 7 Oct with `signals.normal.slOfTp [1.5, 2, 3]`,
`signals.trailing.slOfTp 3`, `signals.holdH 24`; signal config ids carry `h96` = 96 × 15 min). Commit 4fd24f6,
30 symbols, 24 h pre-historic + 24 h simulated, focus all, balance $20, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0
CTS_CORE_WORKERS=3`, 4 cores / 16 GB, the two sessions run one after the other.

Unit basis (every order at one unit, Σ trade r in %, 0.2 % round trip included). *PF incl. open* = (gross profit of
the closed orders + of the open orders marked at the end) ÷ (gross loss of both), computed from raw.json (`trades` r,
`openEnd` mtmR; the open orders are the engine's exact ones). Signals split by config id: `tr0` = fixed stop,
`tr>0` = trailing.

## Window 1 — the latest 24 h (7 Oct 00:00 → 8 Oct 00:00 UTC, falling market)

Run log: `checks: 55/55 ok`; session wall time 1,587 s (26 min 27 s; the report's runSeconds 1,529).

| group | orders closed | PF closed | open at end | PF incl. open | net closed % | net incl. open % |
|---|---|---|---|---|---|---|
| Total | 11372 | 0.59 | 8382 | 0.34 | -10859 | -32741 |
| Micro | 87 | 0.37 | 5 | 0.37 | -34 | -34 |
| Short | 3825 | 0.46 | 673 | 0.39 | -3610 | -4826 |
| General | 363 | 0.65 | 56 | 0.61 | -246 | -295 |
| Long | 267 | 0.56 | 118 | 0.51 | -337 | -462 |
| Wide | 104 | 0.39 | 0 | 0.39 | -48 | -48 |
| Signals | 6726 | 0.63 | 7530 | 0.33 | -6584 | -27075 |
| Signals trailing (tr>0) | 3187 | 0.86 | 4049 | 0.32 | -868 | -13633 |
| Signals fixed (tr0) | 3539 | 0.51 | 3481 | 0.33 | -5716 | -13442 |

Report (as live sizes it): balance $20.00 → $19.05 closed (−4.75 %), equity at end $15.74 (53 positions / 8,382 orders open, MTM −$3.31), PF $ 0.87, PF unit 0.59.

## Window 2 — the 6 Oct rally (5 Oct 15:00 → 6 Oct 15:00 UTC)

Run log: `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` (the session exits 1 on it); session wall time 1,282 s (21 min 22 s; runSeconds 1,250). Axis (Wide) seated configs but all 670 Wide candidates were skipped (lastN 345 · engineSide 256 · symPf 69), so no Wide row below.

| group | orders closed | PF closed | open at end | PF incl. open | net closed % | net incl. open % |
|---|---|---|---|---|---|---|
| Total | 11709 | 4.65 | 5665 | 2.82 | 26937 | 25212 |
| Micro | 108 | 0.50 | 6 | 0.49 | -26 | -27 |
| Short | 1324 | 2.71 | 325 | 2.66 | 1729 | 1818 |
| General | 508 | 2.13 | 136 | 2.39 | 626 | 812 |
| Long | 590 | 2.40 | 387 | 3.09 | 1181 | 1928 |
| Signals | 9179 | 5.76 | 4811 | 2.85 | 23427 | 20681 |
| Signals trailing (tr>0) | 4484 | 11.24 | 2493 | 3.23 | 12315 | 10736 |
| Signals fixed (tr0) | 4695 | 3.99 | 2318 | 2.56 | 11112 | 9945 |

Report (as live sizes it): balance $20.00 → $30.65 closed (+53.26 %), equity at end $29.70 (30 positions / 5,665 orders open, MTM −$0.95), PF unit 4.65.

## Reading

- Falling market: signals lose closed (PF 0.63) and the open book at the end is about as large as the closed one
  (7,530 open vs 6,726 closed) at PF 0.33 including open; trailing and fixed stops end at the same PF incl. open
  (0.32 / 0.33) although trailing is far better closed (0.86 vs 0.51).
- Rally: signals PF 5.76 closed, 2.85 including the 4,811 orders still open; trailing stops lead both closed
  (11.24) and including open (3.23 vs 2.56 fixed).
- Compare with V0–V2 on the same two windows (PF incl. open) before any setting changes
  (docs/positive-coordinations.md).

Raw runs (not committed): `runs/w-latest/`, `runs/w-rally/` (session.md, html, writeup.md, raw.json, log.txt).
