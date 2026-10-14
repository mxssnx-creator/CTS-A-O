# 12 h simulated session — 30 symbols, 24 h pre-historic + 12 h run

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-09 13:00 → 2026-10-10 13:00 UTC, run 2026-10-10 13:00 → 2026-10-11 01:00 UTC. Symbols: CFX-USDT, STRK-USDT, TIA-USDT, NIL-USDT, MAGIC-USDT, WAL-USDT, S-USDT, ERA-USDT, LA-USDT, ZK-USDT, KAIA-USDT, APT-USDT, BTR-USDT, GRASS-USDT, ORCA-USDT, INJ-USDT, W-USDT, NIGHT-USDT, 0G-USDT, ON-USDT, BANK-USDT, SYRUP-USDT, AIN-USDT, PLUME-USDT, ILV-USDT, ETHFI-USDT, SAFE-USDT, YB-USDT, BOME-USDT, BNLIFE-USDT.

Settings (desk, flags): stage gate min PF 1.05, focus 16 pairs, disabled kinds none, toggles normal / trailing / axis, ranges minimal / short / general / long (micro off), caps: positions none, signal positions 100, coordination on, signals validated on their last 25. Block overall, 8 levels, Active from 2, ratio 0.5, max 8× per source, the stack up to 8×. Balance $20.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [docs/sims/sig12h-30sym-2026-10-11/index.html](sims/sig12h-30sym-2026-10-11/index.html) · numbers: `docs/sims/sig12h-30sym-2026-10-11/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $20.00 → $22.49 | $21.58 | $2.49 (12.43 %) | 2.33 | 2.26 | 2.48 | 0.18 | $0.78 (3.65 %) | 1647 | 55 | 77.66 % | 9 / 12 | $13.70 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 11 positions / 202 orders, MTM -$0.91 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 24 orders capped to $0, 807 scaled down (open at end: 0 capped, 30 scaled) · binding: position cap 861, gross cap 0. **Without the caps:** balance $20.00 → $23.28 (16.39 %) · PF $ 2.26 · equity at end $22.32 · equity max drawdown $1.75 (7.98 %) · margin used max $19.96.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.40 (no compounding) the same orders net $3.12 (15.59 %), closed-order max drawdown $0.44.

Engine: Base 154/259 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 3/133 · PF 1.56 · Minimal 22/133 · PF 1.61 · Short 3/68 · PF 1.85 · General 4/68 · PF 1.77 · Long 6/68 · PF 1.62 · Signals 126/126 · PF 1.77), Main 36 pairs, 8230 tapes, Real seats: 168 engine configs + 1890 signal configs (every config of the active signals), compute 31 s, peak RSS 3044 MB. Consistency checks: 50 of 55 pass.

## Findings

- **Strategy types positive:** Trailing $1.43 (PF 2.70, 954 orders) · Normal $1.06 (PF 2.03, 693 orders).
- **Strategy types losing:** none.
- **Engine vs signals:** Engine $2.49 (PF 2.33, 1647 orders).
- **Indication kinds positive:** rsi $1.68 (PF 2.21, 1250 orders) · osc $0.61 (PF 2.67, 303 orders) · break $0.19 (PF 2.85, 94 orders).
- **Indication kinds losing:** none.
- **Signal sources positive:** none.
- **Signal sources losing:** none.
- **Symbols:** best TIA-USDT $0.57 (PF 23.57, 200 orders) · STRK-USDT $0.34 (PF 2.41, 145 orders) · INJ-USDT $0.29 (PF 7.97, 128 orders); worst CFX-USDT -$0.40 (PF 0.13, 46 orders) · AIN-USDT -$0.19 (PF 0.34, 46 orders) · ERA-USDT -$0.06 (PF 0.00, 3 orders).
- **Block volume:** ×1 $2.49 (unit PF 2.26, 1647).
- **Lanes:** 1m $2.38 (PF 2.99, 1339) · 5m $0.17 (PF 1.30, 292) · 5m+ -$0.06 (PF 0.36, 16); **ranges:** Minimal $2.49 (PF 2.33, 1647); **sides:** Long $2.49 (PF 2.33, 1647).
- **Hours:** 9 green / 3 red / 0 flat of 12 full hours; first order opened 13:00 UTC; best hour 18:00 $0.72, worst hour 13:00 -$0.31.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 13:00 | $19.69 | $19.68 | 1.88 % | $1.56 | 56 | 4 / 1 / 3 | 27 | 0.30 | 0.30 | -$0.31 | 0.57 | – | -$0.31 | 0.30 |
| 14:00 | $19.92 | $19.85 | 1.01 % | $2.37 | 75 | 13 / 8 / 8 | 66 | 3.76 | 3.81 | $0.23 | 1.57 | 0.27 | -$0.08 | 0.85 |
| 15:00 | $20.07 | $20.02 | 0.78 % | $5.08 | 46 | 6 / 5 / 9 | 34 | 7.51 | 7.52 | $0.15 | 0.07 | 0.14 | $0.07 | 1.13 |
| 16:00 | $20.27 | $19.88 | 1.97 % | $7.34 | 136 | 8 / 6 / 11 | 86 | 2.10 | 2.09 | $0.20 | 0.72 | 0.43 | $0.27 | 1.37 |
| 17:00 | $20.60 | $20.15 | 0.77 % | $7.77 | 90 | 3 / 2 / 12 | 84 | 84.89 | 92.41 | $0.33 | 0.43 | 0.01 | $0.60 | 1.81 |
| 18:00 | $21.32 | $20.82 | 0.97 % | $9.36 | 471 | 8 / 6 / 14 | 367 | 2.52 | 2.81 | $0.72 | 0.20 | 0.36 | $1.32 | 2.09 |
| 19:00 | $21.31 | $20.85 | 0.83 % | $6.67 | 123 | 3 / 5 / 12 | 94 | 0.97 | 1.06 | -$0.01 | 1.20 | – | $1.31 | 1.89 |
| 20:00 | $21.53 | $21.17 | 1.48 % | $6.14 | 55 | 1 / 1 / 12 | 47 | 58.47 | 40.44 | $0.22 | 0.13 | 0.01 | $1.53 | 2.04 |
| 21:00 | $21.47 | $20.74 | 3.47 % | $8.99 | 109 | 4 / 1 / 15 | 50 | 0.50 | 0.28 | -$0.06 | 1.13 | – | $1.47 | 1.93 |
| 22:00 | $21.65 | $20.86 | 2.89 % | $8.30 | 91 | 2 / 3 / 14 | 79 | 2.85 | 4.03 | $0.17 | 2.13 | 0.53 | $1.65 | 1.98 |
| 23:00 | $21.78 | $21.20 | 1.32 % | $8.74 | 54 | 2 / 3 / 13 | 45 | 3.95 | 1.71 | $0.13 | 3.13 | 0.34 | $1.78 | 2.03 |
| 00:00 | $22.49 | $21.58 | 2.17 % | $13.70 | 341 | 5 / 7 / 11 | 300 | 6.11 | 7.45 | $0.71 | 0.75 | 0.08 | $2.49 | 2.33 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 693 | 46 | 2.03 | 1.95 | 83.84 % | $1.06 | 2.62 | 0.25 | 1.31 % | 9 / 12 |
| Trailing | 954 | 57 | 2.70 | 2.67 | 73.17 % | $1.43 | 1.62 | 0.13 | 0.93 % | 10 / 12 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Plain | 693 | 46 | 2.03 | 1.95 | 83.84 % | $1.06 | 2.62 | 0.25 | 1.31 % | 9 / 12 |
| Trailing · Plain | 954 | 57 | 2.70 | 2.67 | 73.17 % | $1.43 | 1.62 | 0.13 | 0.93 % | 10 / 12 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rsi | 1250 | 41 | 2.21 | 2.06 | 76.48 % | $1.68 | 2.88 | 0.26 | 2.20 % | 10 / 12 |
| osc | 303 | 26 | 2.67 | 3.09 | 83.50 % | $0.61 | 3.97 | 0.28 | 0.86 % | 8 / 11 |
| break | 94 | 16 | 2.85 | 3.23 | 74.47 % | $0.19 | 4.52 | 0.51 | 0.49 % | 7 / 9 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
