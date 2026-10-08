# H2 — V3 with signal hold 6 h (signal round 2)

Desk `docs/sims/sigstop-2026-10-08/desks/H2.json` = V3 (`signals.normal.slOfTp [1.5, 2, 3]`, `signals.trailing.slOfTp
3`) with `signals.holdH 6` (V3: 24). Branch `claude/sim3h-fixes` at 3e11cdc (desks from 11053c8), 30 symbols, 24 h
pre-historic + 24 h simulated, focus all, balance $20, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=3`,
4 cores / 16 GB, the two sessions run one after the other.

Unit basis (every order at one unit, Σ trade r in %, 0.2 % round trip included). *PF incl. open* = (gross profit of
the closed orders + of the open orders marked at the end) ÷ (gross loss of both), computed from raw.json (`trades` r,
`openEnd` mtmR; `openEndRule` exact: the engine's own open orders). Signals split by config id: `tr0` = fixed stop,
`tr>0` = trailing; by side on the order's `side`.

## Verdict

| window | V0 total / Signals PF incl. open | V3 | **H2** |
|---|---|---|---|
| falling (7 Oct) | 0.40 / 0.39 | 0.34 / 0.33 | **0.58 / 0.67** |
| rally (5–6 Oct) | 2.78 / 2.81 | 2.82 / 2.85 | **1.28 / 1.12** |

**H2 does not beat V0 in both windows.** In the falling market it beats V0 clearly (total 0.58 vs 0.40, Signals 0.67
vs 0.39, net incl. open −12,224 % vs V3's −32,741 %): the 6 h hold leaves 299 signal orders open at the end instead of
V3's 7,530. In the rally it loses badly (total 1.28 vs 2.78, Signals 1.12 vs 2.81; Signals closed PF 1.18 vs V3's
5.76): the 6 h hold closes the rally's long signal winners before they reach the target, and Signals net incl. open
drops from V3's +20,681 % to +2,296 %.

## Window 1 — the latest 24 h (7 Oct 00:00 → 8 Oct 00:00 UTC, falling market)

Run log: `checks: 55/55 ok`; variants baseline "reproduces the session run"; session wall time 4,602 s (76 min 42 s;
runSeconds 4,537, of it the 108 variant re-runs).

| group | orders closed | PF closed | open at end | PF incl. open | net closed % | net incl. open % |
|---|---|---|---|---|---|---|
| Total | 17724 | 0.62 | 1150 | 0.58 | -10255 | -12224 |
| Micro | 87 | 0.37 | 5 | 0.37 | -34 | -34 |
| Short | 3825 | 0.46 | 672 | 0.39 | -3610 | -4827 |
| General | 363 | 0.65 | 56 | 0.61 | -246 | -295 |
| Long | 267 | 0.56 | 118 | 0.51 | -337 | -462 |
| Wide | 104 | 0.39 | 0 | 0.39 | -48 | -48 |
| Signals | 13078 | 0.69 | 299 | 0.67 | -5980 | -6558 |
| Signals trailing (tr>0) | 6709 | 0.70 | 154 | 0.67 | -2827 | -3219 |
| Signals fixed (tr0) | 6369 | 0.67 | 145 | 0.66 | -3153 | -3339 |
| Signals long | 744 | 0.06 | 0 | 0.06 | -2886 | -2886 |
| Signals short | 12334 | 0.81 | 299 | 0.78 | -3093 | -3672 |
| Total long | 3465 | 0.25 | 177 | 0.25 | -6563 | -6750 |
| Total short | 14259 | 0.80 | 973 | 0.73 | -3693 | -5475 |

Report (as live sizes it): balance $20.00 → $16.65 closed (−16.74 %), equity at end $14.86 (40 positions / 1,150
orders open, MTM −$1.79), PF $ 0.68, PF unit 0.62.

## Window 2 — the 6 Oct rally (5 Oct 15:00 → 6 Oct 15:00 UTC)

Run log: `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` (the session exits 1 on it, as
V3's rally run did); variants baseline "reproduces the session run"; session wall time 3,662 s (61 min 2 s;
runSeconds 3,616). Axis (Wide) seated configs but all 402 Wide candidates were skipped (engineSide 207 · lastN 141 ·
symPf 54), so no Wide row below.

| group | orders closed | PF closed | open at end | PF incl. open | net closed % | net incl. open % |
|---|---|---|---|---|---|---|
| Total | 14448 | 1.31 | 4213 | 1.28 | 5768 | 6096 |
| Micro | 111 | 0.79 | 3 | 0.79 | -8 | -8 |
| Short | 1125 | 2.82 | 249 | 2.77 | 1541 | 1643 |
| General | 519 | 1.86 | 131 | 2.12 | 524 | 713 |
| Long | 568 | 1.89 | 361 | 2.46 | 825 | 1452 |
| Signals | 12125 | 1.18 | 3469 | 1.12 | 2885 | 2296 |
| Signals trailing (tr>0) | 6080 | 1.16 | 1733 | 1.09 | 1211 | 825 |
| Signals fixed (tr0) | 6045 | 1.20 | 1736 | 1.15 | 1675 | 1471 |
| Signals long | 12008 | 1.20 | 3469 | 1.13 | 3105 | 2515 |
| Signals short | 117 | 0.16 | 0 | 0.16 | -220 | -220 |
| Total long | 14303 | 1.33 | 4213 | 1.30 | 6006 | 6334 |
| Total short | 145 | 0.17 | 0 | 0.17 | -238 | -238 |

Report (as live sizes it): balance $20.00 → $22.91 closed (+14.57 %), equity at end $23.33 (29 positions / 4,213
orders open, MTM +$0.42), PF $ 1.37, PF unit 1.31.

## Variants touching signals (CTS_CORE_VARIANTS=1, H2 as the baseline)

Each row is the session's walk-forward re-run on its own tapes with one switch flipped (docs/report-integrity.md).
The variant dump keeps each row's open-at-end count and net but not their gross split, so *PF incl. open* here is
the net-of-open approximation (gp + max(openNet, 0)) ÷ (gl + max(−openNet, 0)). On the baseline it gives 0.58 in the
falling window (exact 0.58) and 1.33 in the rally (exact 1.28), so compare the rows with each other, not with the
exact tables above.

| row | falling: orders | PF closed | Signals PF closed | open | PF incl. open ≈ | net incl. open % | rally: orders | PF closed | Signals PF closed | open | PF incl. open ≈ | net incl. open % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Baseline (as run) | 17724 | 0.62 | 0.69 | 1150 | 0.58 | -12224 | 14448 | 1.31 | 1.18 | 4213 | 1.33 | 6096 |
| Signals: at most 1 per bar | 5195 | 0.49 | 0.63 | 860 | 0.43 | -5957 | 2864 | 1.97 | 1.11 | 852 | 2.27 | 3836 |
| Signals: at most 3 per bar | 6236 | 0.51 | 0.60 | 878 | 0.45 | -6646 | 3885 | 1.75 | 1.15 | 1072 | 1.94 | 3957 |
| Signals: at most 10 per bar | 9658 | 0.55 | 0.62 | 945 | 0.50 | -8656 | 7179 | 1.46 | 1.15 | 1872 | 1.53 | 4315 |
| Signals off | 4646 | 0.48 | – | 851 | 0.41 | -5666 | 2323 | 2.19 | – | 744 | 2.57 | 3801 |
| Signal confirmation off | 23449 | 0.62 | 0.65 | 1164 | 0.59 | -17037 | 22031 | 1.25 | 1.17 | 4871 | 1.20 | 6148 |
| Signal acceptance off | 23059 | 0.75 | 0.83 | 1314 | 0.70 | -10943 | 19103 | 1.38 | 1.29 | 5662 | 1.42 | 9339 |
| Signal acceptance and confirmation off | 32048 | 0.74 | 0.78 | 1378 | 0.70 | -15832 | 29434 | 1.27 | 1.21 | 6373 | 1.24 | 9137 |
| Active signals 100 | 4995 | 0.48 | 0.53 | 870 | 0.42 | -6042 | 3215 | 1.70 | 0.67 | 744 | 1.96 | 3419 |
| Active signals 200 | 5426 | 0.44 | 0.27 | 915 | 0.38 | -7286 | 4318 | 1.56 | 0.97 | 758 | 1.75 | 3749 |
| Signal ranking drawdown | 8914 | 0.54 | 0.60 | 1259 | 0.47 | -9522 | 7659 | 1.61 | 1.39 | 2069 | 1.69 | 6212 |
| Signal ranking lowdd | 7301 | 0.52 | 0.59 | 1037 | 0.46 | -7822 | 6234 | 1.70 | 1.45 | 1791 | 1.82 | 5755 |
| Coordination off | 23449 | 0.62 | 0.65 | 1164 | 0.59 | -17037 | 22031 | 1.25 | 1.17 | 4871 | 1.20 | 6148 |
| Cooldown signals | 11170 | 0.49 | 0.50 | 851 | 0.46 | -11113 | 11151 | 1.02 | 0.82 | 3005 | 1.04 | 677 |
| Validation last-N off | 25087 | 0.56 | 0.67 | 2296 | 0.53 | -21560 | 18812 | 1.34 | 1.19 | 5629 | 1.36 | 8441 |
| Validation last 10 | 18014 | 0.57 | 0.69 | 1283 | 0.53 | -14402 | 14221 | 1.36 | 1.28 | 4176 | 1.36 | 6099 |
| Validation last 20 | 18038 | 0.66 | 0.73 | 1339 | 0.63 | -10740 | 14450 | 1.38 | 1.27 | 4647 | 1.42 | 7411 |
| Validation last 25 | 19322 | 0.67 | 0.78 | 1371 | 0.64 | -11185 | 15651 | 1.36 | 1.25 | 5140 | 1.38 | 7261 |
| Validation last 35 | 20609 | 0.61 | 0.75 | 1523 | 0.58 | -14353 | 15838 | 1.43 | 1.31 | 5065 | 1.45 | 8642 |
| Validation last 50 | 20223 | 0.58 | 0.72 | 1579 | 0.55 | -15474 | 15409 | 1.47 | 1.38 | 5044 | 1.49 | 8756 |
| Validation last 75 | 20245 | 0.57 | 0.69 | 1621 | 0.54 | -15867 | 16183 | 1.31 | 1.19 | 5126 | 1.33 | 6763 |
| Validation last 100 | 19930 | 0.57 | 0.67 | 1556 | 0.54 | -16129 | 16448 | 1.30 | 1.16 | 5135 | 1.31 | 6640 |
| Signals last 5 | 9623 | 0.45 | 0.42 | 914 | 0.41 | -11070 | 6731 | 1.53 | 1.25 | 2290 | 1.59 | 4947 |
| Signals last 10 | 8643 | 0.44 | 0.39 | 883 | 0.40 | -10230 | 5548 | 1.59 | 1.25 | 1972 | 1.68 | 4594 |
| Signals last 15 | 8257 | 0.47 | 0.45 | 881 | 0.43 | -9266 | 4900 | 1.61 | 1.22 | 1885 | 1.67 | 4072 |
| Signals last 25 | 7928 | 0.53 | 0.60 | 900 | 0.48 | -7771 | 4874 | 1.64 | 1.26 | 1849 | 1.73 | 4309 |

Reading the signal rows:

- **Raised PF incl. open in both windows:** validation last 20 (0.58 → 0.63 / 1.33 → 1.42, net better in both) and
  last 25 (0.64 / 1.38); signal acceptance off (0.70 / 1.42) — it switches off a positive coordination
  (docs/positive-coordinations.md), so it only means acceptance at 48 h / PF 1.3 is not what holds H2 back.
- **Raised the rally, lowered the falling window:** ranking drawdown / lowdd, the per-bar caps, active-signal caps,
  signals last-N 5–25, validation last 35 / 50. These trade fewer signals, which in the rally lifts the total
  (signals at PF ~1.2 dilute the engine ranges at ~2–2.8) and in the falling window removes signal orders that were
  better than the engine's ranges.
- No signal row takes the rally near V0's 2.78 incl. open; the gap is the hold itself (Signals closed PF 1.18 vs
  V3's 5.76 on the same window), not a gate.

Raw runs (not committed): `runs/w-latest/`, `runs/w-rally/` (session.md, html, writeup.md, raw.json, log.txt).
