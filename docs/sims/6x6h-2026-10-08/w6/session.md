# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.38–$0.51 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-06T12:00 → 2026-10-06T18:00 UTC. Engine: Base 1230/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 314/19072 · PF 1.56 · Micro 85/5900 · PF 2.31 · Short 504/8176 · PF 1.56 · General 473/8176 · PF 1.55 · Long 603/8176 · PF 1.50 · Signals 126/126; Main 1167 pairs, 163077 tapes, Real seats: 3976 engine configs + 3780 signal configs (every config of the active signals), compute 251 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $19.83 (-0.83 %, closed orders) · equity at end $18.37 (open at end: 46 positions / 3632 orders, MTM -$1.46 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 0.90 (gross profit $ ÷ gross loss $ as sized) · PF unit 1.58 (every order at one unit: the engine's PF) · 34 positions / 1718 orders (incl. 177 capped to $0) · WR 67.58 % · DDT (closed trades, $) 3.17 h · DDR – (net ≤ 0) · equity max drawdown $2.55 (12.61 %) · margin used max $14.13 · open avg 18.57 pos / 502.75 orders (peak 29 / 873)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 177 orders capped to $0, 1424 scaled down (open at end: 49 capped, 3427 scaled) · binding: position cap 3030, gross cap 4579. **Without the caps:** balance $20.00 → $25.63 (28.14 %) · PF $ 1.60 · equity at end $11.72 · equity max drawdown $12.32 (60.90 %) · margin used max $161.21 · infeasible: margin exceeded equity for 316 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 421 | 1029  | 4.1 % | 1.530 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 421 | 1029 (+0) | 4.1 % | 1.530 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 421 | 1028 (-1) | 4.1 % | 1.530 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 392 | 923 (-106) | 3.7 % | 1.564 |
| closes ≥ 6 | 1.00 | 6 | 1 | 678 | 1410 (+381) | 5.6 % | 1.880 |
| closes ≥ 20 | 1.00 | 20 | 1 | 309 | 783 (-246) | 3.1 % | 1.441 |
| closes ≥ 30 | 1.00 | 30 | 1 | 220 | 588 (-441) | 2.4 % | 1.343 |
| DDR off | 1.00 | 12 | off | 1433 | 2422 (+1393) | 9.7 % | 1.164 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 734 | 1536 (+507) | 6.2 % | 1.369 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 151 | 420 (-609) | 1.7 % | 1.977 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1433 | 2422 (+1393) | 9.7 % | 1.164 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1903 | 2977 (+1948) | 11.9 % | 1.235 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 0 / 32 | 7 / 25 | 0.14 | 0.04 | 22 % | -$0.08 | $19.92 | $19.12 | $18.72 | 7.44 % | 0.82 | $11.51 | 12 / 604 |
| 13:00 | 0 / 125 | 68 / 57 | 0.09 | 0.85 | 54 % | -$0.23 | $19.70 | $18.41 | $17.68 | 12.57 % | 1.82 | $13.79 | 20 / 1355 |
| 14:00 | 0 / 241 | 204 / 37 | 1.76 | 3.69 | 85 % | $0.16 | $19.86 | $19.05 | $17.67 | 12.61 % | 2.82 | $13.90 | 29 / 2288 |
| 15:00 | 0 / 369 | 303 / 66 | 2.45 | 3.22 | 82 % | $0.28 | $20.14 | $18.24 | $18.23 | 12.61 % | 3.82 | $14.13 | 36 / 2645 |
| 16:00 | 2 / 509 | 241 / 268 | 0.20 | 0.63 | 47 % | -$0.58 | $19.56 | $18.27 | $18.05 | 12.61 % | 4.82 | $14.10 | 44 / 3389 |
| 17:00 | 1 / 442 | 338 / 104 | 3.23 | 2.57 | 76 % | $0.28 | $19.83 | $18.37 | $17.95 | 12.61 % | 5.82 | $13.86 | 46 / 3632 |

**Last hour (17:00):** open at end: 46 positions / 3632 orders, MTM -$1.46 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $18.37 = balance $19.83 + MTM -$1.46.

**Hours positive:** 3 of 6 full hours · flat 0 · negative 3

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 12:00 | 3 · ∞ (no loss) · $0.00 | – | 12 · 0.13 · -$0.05 | 6 · 0.00 · -$0.01 | 11 · 0.00 · -$0.02 |
| 13:00 | – | 3 · 0.00 · -$0.00 | 81 · 0.13 · -$0.14 | 15 · 0.06 · -$0.03 | 26 · 0.03 · -$0.06 |
| 14:00 | – | – | 217 · 1.75 · $0.16 | 14 · 3.15 · $0.00 | 10 · ∞ (no loss) · $0.00 |
| 15:00 | 2 · ∞ (no loss) · $0.00 | – | 337 · 2.37 · $0.25 | 3 · 81.31 · $0.04 | 27 · 0.67 · -$0.00 |
| 16:00 | – | – | 337 · 0.41 · -$0.20 | 59 · 0.00 · -$0.32 | 113 · 0.00 · -$0.05 |
| 17:00 | 2 · ∞ (no loss) · $0.00 | – | 391 · 3.91 · $0.28 | 7 · 2.11 · $0.00 | 42 · 0.62 · -$0.01 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 32 | 18 · 0.12 · 17 % · -$0.04 | 4 · 0.00 · 0 % · -$0.00 | 5 · 0.00 · 0 % · -$0.04 | 5 · 9.36 · 80 % · $0.01 | – | 10 · 0.18 · 40 % · -$0.04 |
| 13:00 | 125 | 30 · 0.08 · 30 % · -$0.06 | 17 · 0.00 · 0 % · -$0.04 | 46 · 0.06 · 72 % · -$0.14 | 32 · 2.60 · 81 % · $0.01 | – | 78 · 0.13 · 76 % · -$0.14 |
| 14:00 | 241 | 20 · 3.19 · 85 % · $0.00 | 4 · ∞ (no loss) · 100 % · $0.00 | 129 · 1.12 · 81 % · $0.03 | 88 · 173.85 · 89 % · $0.13 | – | 217 · 1.75 · 84 % · $0.16 |
| 15:00 | 369 | 31 · 2.83 · 19 % · $0.03 | 5 · 10.28 · 40 % · $0.01 | 146 · 1.21 · 86 % · $0.03 | 187 · 9.25 · 90 % · $0.21 | – | 333 · 2.37 · 89 % · $0.24 |
| 16:00 | 509 | 141 · 0.00 · 0 % · -$0.44 | 45 · 0.06 · 2 % · -$0.09 | 181 · 0.97 · 72 % · -$0.00 | 142 · 0.54 · 77 % · -$0.04 | – | 323 · 0.77 · 74 % · -$0.04 |
| 17:00 | 442 | 38 · 0.52 · 24 % · -$0.01 | 19 · 2.35 · 58 % · $0.00 | 179 · 2.08 · 73 % · $0.10 | 206 · 28.29 · 91 % · $0.18 | – | 385 · 3.90 · 83 % · $0.28 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1104 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (163077 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (8442); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 23229 · 0.46 | 5467 · 0.50 | 5338 · 0.74 | 626 · 3.52 | 32 · 0.04 | 18 · 0.02 | 4 · 0.00 | – | 10 · 0.09 |
| 13:00 | 31346 · 1.16 | 5765 · 0.90 | 9956 · 0.80 | 1713 · 4.04 | 125 · 0.85 | 30 · 0.15 | 17 · 0.00 | – | 78 · 2.21 |
| 14:00 | 36880 · 1.04 | 8614 · 1.32 | 11477 · 1.25 | 3596 · 4.65 | 241 · 3.69 | 20 · 2.87 | 4 · ∞ (no loss) | – | 217 · 3.72 |
| 15:00 | 69972 · 0.69 | 17052 · 0.68 | 22636 · 0.75 | 5687 · 1.58 | 369 · 3.22 | 31 · 0.28 | 5 · 0.45 | – | 333 · 4.10 |
| 16:00 | 52651 · 0.98 | 15701 · 1.09 | 14878 · 1.07 | 5388 · 2.44 | 509 · 0.63 | 141 · 0.00 | 45 · 0.01 | – | 323 · 1.82 |
| 17:00 | 62969 · 0.83 | 20051 · 0.87 | 24833 · 0.98 | 7202 · 3.20 | 442 · 2.57 | 38 · 0.33 | 19 · 2.14 | – | 385 · 3.19 |
| **total** | **277047 · 0.84** | **72650 · 0.88** | **89118 · 0.92** | **24212 · 2.69** | **1718 · 1.58** | **278 · 0.12** | **94 · 0.20** | **–** | **1346 · 2.89** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 278 | 44 / 234 | 0.12 | 0.12 | -$0.51 | 15.83 % | 5.92 |
| Trailing | 94 | 18 / 76 | 0.17 | 0.20 | -$0.12 | 19.15 % | 6.00 |
| Signal · Normal | 686 | 526 / 160 | 0.96 | 1.86 | -$0.03 | 76.68 % | 6.00 |
| Signal · Trailing | 660 | 573 / 87 | 5.21 | 7.21 | $0.50 | 86.82 % | 1.25 |
| total | 1718 | 1161 / 557 | 0.90 | 1.58 | -$0.17 | 67.58 % | 3.17 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 1346 | 1099 / 247 | 1.55 | 2.89 | $0.47 | 81.65 % | 3.00 |
| of which Engine (no signals) | 372 | 62 / 310 | 0.13 | 0.14 | -$0.64 | 16.67 % | 5.92 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 7 | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 5m+ | 3 | 0.00 | 0.00 | -$0.00 |
| 15m | 1375 | 1.27 | 2.75 | $0.29 |
| 15m+ | 104 | 0.13 | 0.19 | -$0.33 |
| 30m | 229 | 0.16 | 0.11 | -$0.13 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 13 | 7 / 6 | 0.83 | 0.40 | -$0.00 | 53.85 % | 5.92 |
| Short | 160 | 30 / 130 | 0.01 | 0.12 | -$0.36 | 18.75 % | 6.00 |
| General | 103 | 12 / 91 | 0.15 | 0.14 | -$0.16 | 11.65 % | 3.25 |
| Long | 96 | 13 / 83 | 0.33 | 0.16 | -$0.12 | 13.54 % | 5.75 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 1346 | 1099 / 247 | 1.55 | 2.89 | $0.47 | 81.65 % | 3.00 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 36462 | sig:confirm 19332 · sig:duplicate 7860 · sig:signalPf 3698 · sig:signalCluster 3165 · sig:signalSide 2407 |
| Short | 2013 | lastN 983 · engineSide 647 · symPf 333 · duplicate 50 |
| Long | 1351 | lastN 579 · engineSide 571 · symPf 150 · duplicate 51 |
| General | 833 | lastN 542 · symPf 144 · engineSide 116 · duplicate 31 |
| Micro | 723 | crowd 333 · lastN 276 · engineSide 102 · symPf 12 |
| Wide | 387 | engineSide 188 · lastN 102 · symPf 97 |

## Base said, the book did — the same ranges on the same basis

The gates judge a set on its **unit** PF (per-order return, unsized). The headline result is in **dollars**, after
the live sizing and its caps. So a range has three numbers that must be read together, and only the first two are
on the same basis: the median unit PF of the sets Base passed, the unit PF those sets actually traded at, and the
dollar PF after sizing. "Base → book" is the second divided by the first: how much of the validated edge survived
out of sample. "sizing" is the third divided by the second: what the live caps did to it — above 1 they flattered
the range, below 1 they ate the edge. A row where Base is high and "Base → book" is low is selection, not sizing;
a row where "Base → book" is near 1 and "sizing" is far from it is the caps.

| range | Base passed (median PF unit) | traded PF unit | Base → book | traded PF $ | sizing | orders |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 2.31 | 0.40 | 0.17 | 0.83 | 2.09 | 13 |
| Short | 1.56 | 0.12 | 0.08 | 0.01 | 0.12 | 160 |
| General | 1.55 | 0.14 | 0.09 | 0.15 | 1.04 | 103 |
| Long | 1.50 | 0.16 | 0.10 | 0.33 | 2.10 | 96 |
| Wide | 1.56 | – | – | – | – | 0 |
| Signals | – | 2.89 | – | 1.55 | 0.53 | 1346 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (5110 of 132894 evaluated, 159297 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3235 units active at the run start, 3814 over the run, 3332 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 835 | 134 (16 %) | 292 | 65 % | 0.30 | -154.93 |
| Micro | trailing | 881 | 116 (13 %) | 429 | 44 % | 0.15 | -363.49 |
| Short | normal | 619 | 84 (14 %) | 676 | 44 % | 0.46 | -764.40 |
| Short | trailing | 935 | 223 (24 %) | 1155 | 56 % | 0.82 | -260.16 |
| General | normal | 358 | 48 (13 %) | 491 | 32 % | 0.52 | -547.90 |
| General | trailing | 245 | 58 (24 %) | 292 | 53 % | 0.67 | -177.68 |
| Long | normal | 577 | 54 (9 %) | 572 | 29 % | 0.45 | -1063.30 |
| Long | trailing | 372 | 61 (16 %) | 285 | 42 % | 0.28 | -665.72 |
| Wide | axis | 288 | 65 (23 %) | 328 | 39 % | 0.96 | -8.09 |
| Signals | normal | 1671 | 1363 (82 %) | 10185 | 82 % | 2.60 | 17869.00 |
| Signals | trailing | 1661 | 1572 (95 %) | 9507 | 89 % | 9.01 | 24242.37 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1716 | 250 (15 %) | 721 | 53 % | 0.20 | -518.41 |
| Short | active | 48 | 0 (0 %) | 8 | 0 % | 0.00 | -21.60 |
| Short | bollinger | 65 | 8 (12 %) | 26 | 62 % | 1.18 | 4.73 |
| Short | break | 259 | 11 (4 %) | 35 | 63 % | 0.92 | -3.65 |
| Short | channel | 11 | 0 (0 %) | 9 | 0 % | 0.00 | -28.90 |
| Short | direction | 43 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | ema | 17 | 2 (12 %) | 9 | 44 % | 0.31 | -9.07 |
| Short | macd | 41 | 18 (44 %) | 26 | 73 % | 1.16 | 2.71 |
| Short | move | 410 | 103 (25 %) | 684 | 60 % | 0.91 | -82.59 |
| Short | osc | 386 | 103 (27 %) | 888 | 44 % | 0.49 | -847.50 |
| Short | rsi | 10 | 3 (30 %) | 11 | 45 % | 0.46 | -11.90 |
| Short | sar | 2 | 0 (0 %) | 4 | 50 % | 0.82 | -0.80 |
| Short | smooth | 41 | 17 (41 %) | 17 | 100 % | ∞ (no loss) | 26.20 |
| Short | trend | 141 | 26 (18 %) | 46 | 74 % | 2.10 | 44.70 |
| Short | volume | 80 | 16 (20 %) | 68 | 35 % | 0.30 | -96.89 |
| General | active | 24 | 3 (13 %) | 19 | 16 % | 0.24 | -39.00 |
| General | bollinger | 8 | 2 (25 %) | 6 | 33 % | 0.61 | -4.90 |
| General | break | 115 | 9 (8 %) | 54 | 52 % | 1.03 | 2.44 |
| General | channel | 9 | 7 (78 %) | 35 | 63 % | 1.90 | 43.80 |
| General | direction | 2 | 1 (50 %) | 6 | 67 % | 1.00 | 0.03 |
| General | ema | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | macd | 11 | 5 (45 %) | 7 | 71 % | 34.82 | 9.24 |
| General | move | 141 | 41 (29 %) | 265 | 51 % | 0.85 | -67.92 |
| General | osc | 171 | 13 (8 %) | 313 | 24 % | 0.26 | -629.54 |
| General | rsi | 17 | 7 (41 %) | 26 | 46 % | 0.96 | -1.60 |
| General | smooth | 35 | 9 (26 %) | 9 | 100 % | ∞ (no loss) | 28.14 |
| General | trend | 41 | 5 (12 %) | 15 | 67 % | 1.69 | 13.41 |
| General | volume | 27 | 4 (15 %) | 28 | 14 % | 0.01 | -79.68 |
| Long | active | 35 | 2 (6 %) | 12 | 17 % | 0.23 | -30.60 |
| Long | bollinger | 33 | 0 (0 %) | 4 | 0 % | 0.00 | -13.40 |
| Long | break | 191 | 28 (15 %) | 113 | 49 % | 0.92 | -23.08 |
| Long | channel | 11 | 8 (73 %) | 44 | 64 % | 2.17 | 86.50 |
| Long | direction | 8 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | ema | 9 | 2 (22 %) | 2 | 100 % | ∞ (no loss) | 1.29 |
| Long | ichimoku | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | macd | 11 | 1 (9 %) | 1 | 100 % | ∞ (no loss) | 0.82 |
| Long | move | 220 | 4 (2 %) | 348 | 22 % | 0.17 | -1081.36 |
| Long | osc | 170 | 31 (18 %) | 190 | 34 % | 0.40 | -406.78 |
| Long | rsi | 14 | 4 (29 %) | 30 | 47 % | 1.07 | 6.03 |
| Long | smooth | 85 | 3 (4 %) | 9 | 33 % | 0.45 | -21.00 |
| Long | trend | 40 | 12 (30 %) | 32 | 56 % | 1.11 | 6.97 |
| Long | volume | 121 | 20 (17 %) | 72 | 28 % | 0.05 | -254.40 |
| Wide | active | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -12.46 |
| Wide | bollinger | 6 | 3 (50 %) | 27 | 44 % | 0.93 | -1.43 |
| Wide | break | 26 | 0 (0 %) | 3 | 0 % | 0.00 | -2.83 |
| Wide | channel | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 13 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | ema | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 89 | 3 (3 %) | 48 | 19 % | 0.23 | -56.84 |
| Wide | osc | 32 | 20 (63 %) | 38 | 76 % | 5.25 | 44.78 |
| Wide | rsi | 29 | 9 (31 %) | 151 | 32 % | 0.76 | -18.91 |
| Wide | smooth | 16 | 9 (56 %) | 9 | 100 % | ∞ (no loss) | 18.93 |
| Wide | trend | 18 | 9 (50 %) | 9 | 100 % | ∞ (no loss) | 15.08 |
| Wide | volume | 22 | 12 (55 %) | 34 | 35 % | 1.20 | 5.59 |
| Signals | signal:act-burst | 60 | 58 (97 %) | 520 | 87 % | 4.53 | 1195.75 |
| Signals | signal:act-hf | 60 | 60 (100 %) | 649 | 91 % | 7.40 | 1694.68 |
| Signals | signal:adx | 49 | 44 (90 %) | 113 | 90 % | 9.55 | 303.45 |
| Signals | signal:atr-break | 60 | 59 (98 %) | 513 | 90 % | 8.70 | 1454.48 |
| Signals | signal:bollinger | 34 | 28 (82 %) | 106 | 67 % | 1.37 | 40.92 |
| Signals | signal:cci | 47 | 37 (79 %) | 157 | 76 % | 2.61 | 207.10 |
| Signals | signal:cmf | 60 | 59 (98 %) | 337 | 92 % | 12.18 | 1019.44 |
| Signals | signal:donchian | 60 | 59 (98 %) | 464 | 88 % | 4.22 | 1033.78 |
| Signals | signal:ema-cross | 36 | 15 (42 %) | 77 | 66 % | 0.62 | -61.74 |
| Signals | signal:ema-cross-fast | 52 | 41 (79 %) | 197 | 84 % | 3.63 | 326.21 |
| Signals | signal:ema-pullback | 40 | 32 (80 %) | 235 | 81 % | 3.01 | 437.75 |
| Signals | signal:ema-slope | 53 | 39 (74 %) | 167 | 81 % | 1.96 | 188.19 |
| Signals | signal:ema-trend | 59 | 56 (95 %) | 199 | 87 % | 11.15 | 515.75 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 614 | 88 % | 6.50 | 1542.85 |
| Signals | signal:hma | 60 | 58 (97 %) | 374 | 85 % | 3.61 | 777.28 |
| Signals | signal:ichimoku | 53 | 48 (91 %) | 176 | 86 % | 5.82 | 439.36 |
| Signals | signal:impulse | 60 | 46 (77 %) | 503 | 79 % | 1.85 | 577.85 |
| Signals | signal:kama | 60 | 60 (100 %) | 464 | 91 % | 11.29 | 1337.05 |
| Signals | signal:keltner | 60 | 41 (68 %) | 356 | 76 % | 1.77 | 392.84 |
| Signals | signal:macd-cross | 60 | 42 (70 %) | 505 | 73 % | 1.21 | 200.59 |
| Signals | signal:macd-hist | 60 | 59 (98 %) | 654 | 82 % | 2.80 | 1147.45 |
| Signals | signal:macd-slow | 60 | 52 (87 %) | 449 | 79 % | 1.97 | 541.53 |
| Signals | signal:mfi | 15 | 9 (60 %) | 29 | 72 % | 0.47 | -24.64 |
| Signals | signal:obv | 60 | 56 (93 %) | 411 | 87 % | 3.80 | 900.83 |
| Signals | signal:r-awesome | 60 | 60 (100 %) | 491 | 91 % | 8.95 | 1368.91 |
| Signals | signal:r-connors | 44 | 35 (80 %) | 110 | 83 % | 2.52 | 160.93 |
| Signals | signal:r-fractal | 60 | 60 (100 %) | 485 | 96 % | 15.52 | 1517.06 |
| Signals | signal:r-inside | 51 | 50 (98 %) | 109 | 93 % | 20.28 | 296.18 |
| Signals | signal:r-linreg | 60 | 59 (98 %) | 283 | 89 % | 7.99 | 820.14 |
| Signals | signal:r-nr-break | 60 | 60 (100 %) | 614 | 88 % | 7.02 | 1678.06 |
| Signals | signal:r-session-trend | 60 | 52 (87 %) | 661 | 85 % | 3.98 | 1415.78 |
| Signals | signal:r-vol-regime | 60 | 60 (100 %) | 324 | 90 % | 6.73 | 906.26 |
| Signals | signal:reclaim | 58 | 56 (97 %) | 253 | 86 % | 5.15 | 595.45 |
| Signals | signal:rsi-mid | 60 | 57 (95 %) | 420 | 89 % | 6.26 | 1043.22 |
| Signals | signal:rsi-momentum | 60 | 58 (97 %) | 166 | 87 % | 4.70 | 469.88 |
| Signals | signal:rsi-reversal | 40 | 24 (60 %) | 80 | 64 % | 0.90 | -14.88 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 777 | 87 % | 5.75 | 2010.11 |
| Signals | signal:s2-adx-gate | 60 | 59 (98 %) | 313 | 90 % | 10.18 | 856.30 |
| Signals | signal:s2-atr-break | 60 | 58 (97 %) | 777 | 85 % | 4.16 | 1713.89 |
| Signals | signal:s2-bb-bounce | 59 | 23 (39 %) | 218 | 66 % | 0.88 | -65.58 |
| Signals | signal:s2-block-scale | 60 | 56 (93 %) | 678 | 85 % | 4.23 | 1561.59 |
| Signals | signal:s2-block-stack | 60 | 48 (80 %) | 311 | 80 % | 2.29 | 432.42 |
| Signals | signal:s2-confluence | 60 | 49 (82 %) | 213 | 81 % | 2.97 | 382.08 |
| Signals | signal:s2-ema-cross | 12 | 10 (83 %) | 14 | 71 % | 2.70 | 7.42 |
| Signals | signal:s2-range-break | 60 | 60 (100 %) | 138 | 94 % | 22.98 | 395.91 |
| Signals | signal:s2-range-shift | 60 | 59 (98 %) | 611 | 89 % | 8.02 | 1691.96 |
| Signals | signal:s2-rsi-revert | 41 | 18 (44 %) | 73 | 49 % | 0.40 | -119.13 |
| Signals | signal:s2-st-trail | 53 | 36 (68 %) | 163 | 75 % | 1.29 | 80.75 |
| Signals | signal:s2-stoch-swing | 58 | 51 (88 %) | 159 | 86 % | 5.32 | 327.49 |
| Signals | signal:s2-vol-break | 51 | 51 (100 %) | 110 | 98 % | 79.12 | 313.58 |
| Signals | signal:s2-vwap-axis | 17 | 16 (94 %) | 17 | 94 % | 288.56 | 28.99 |
| Signals | signal:sar | 60 | 60 (100 %) | 454 | 93 % | 17.56 | 1413.41 |
| Signals | signal:squeeze | 46 | 42 (91 %) | 82 | 85 % | 3.88 | 155.65 |
| Signals | signal:st-slow | 31 | 18 (58 %) | 105 | 71 % | 1.33 | 60.66 |
| Signals | signal:stoch-rsi | 60 | 56 (93 %) | 280 | 88 % | 5.58 | 669.88 |
| Signals | signal:supertrend | 58 | 55 (95 %) | 201 | 87 % | 4.48 | 412.23 |
| Signals | signal:swing | 60 | 57 (95 %) | 611 | 85 % | 4.32 | 1408.95 |
| Signals | signal:thrust | 60 | 60 (100 %) | 484 | 88 % | 4.67 | 1124.46 |
| Signals | signal:trix | 52 | 35 (67 %) | 161 | 75 % | 1.54 | 123.24 |
| Signals | signal:volume-break | 51 | 51 (100 %) | 70 | 99 % | 1079.03 | 226.11 |
| Signals | signal:vwap | 43 | 42 (98 %) | 177 | 89 % | 10.10 | 457.49 |
| Signals | signal:williams-r | 44 | 25 (57 %) | 111 | 64 % | 0.72 | -68.44 |
| Signals | signal:zscore | 45 | 32 (71 %) | 119 | 68 % | 1.38 | 64.20 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 25980 | 22440 | 1716 | 0.95 | 4.00 | 78.75–163.33 (median 78.75) | 1326 | 11129 | 554 | 3174 | 2406 | 209 | 1828 | 0 | 98 | 0 | 0 | 0 | 3540 |  |
| Short | 35162 | 29330 | 1554 | 1.28 | 2.12 | 163.33–163.33 (median 163.33) | 2765 | 5690 | 1324 | 6789 | 3848 | 1417 | 5445 | 17 | 481 | 0 | 0 | 0 | 5832 |  |
| General | 14041 | 11881 | 603 | 1.33 | 2.07 | 163.33–163.33 (median 163.33) | 782 | 1921 | 498 | 3028 | 1359 | 877 | 2538 | 0 | 252 | 23 | 0 | 0 | 2160 |  |
| Long | 22263 | 19563 | 949 | 1.26 | 2.30 | 163.33–163.33 (median 163.33) | 1074 | 3986 | 1076 | 4515 | 2226 | 1358 | 4105 | 0 | 236 | 38 | 0 | 0 | 2700 |  |
| Wide | 61851 | 49680 | 288 | 0.70 | 2.76 | 20.42–163.33 (median 163.33) | 11001 | 28879 | 1016 | 5732 | 974 | 457 | 1140 | 0 | 151 | 42 | 0 | 9336 | 2835 |  |
| Signals | 3780 | – | 3235 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 3235 units (pair × symbol × direction) active at the run start, 3814 over the run; 3332 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 8684 | 1620 (19 %) | 6146 | 54 % | 0.25 | -3366.95 |
| Micro | trailing | 17296 | 2578 (15 %) | 12322 | 43 % | 0.21 | -6963.42 |
| Short | normal | 11707 | 3468 (30 %) | 21108 | 56 % | 0.81 | -6029.60 |
| Short | trailing | 23455 | 6918 (29 %) | 44649 | 55 % | 0.77 | -12129.86 |
| General | normal | 8416 | 2235 (27 %) | 13863 | 40 % | 0.84 | -3876.30 |
| General | trailing | 5625 | 1484 (26 %) | 7863 | 50 % | 0.75 | -3543.63 |
| Long | normal | 13340 | 1499 (11 %) | 13503 | 27 % | 0.48 | -21133.40 |
| Long | trailing | 8923 | 1248 (14 %) | 7844 | 42 % | 0.44 | -13991.74 |
| Wide | axis | 52515 | 11239 (21 %) | 100590 | 31 % | 0.70 | -24467.54 |
| Wide | dca | 4668 | 1610 (34 %) | 8286 | 68 % | 0.77 | -2965.84 |
| Wide | dca-active | 4668 | 557 (12 %) | 6403 | 27 % | 0.45 | -3518.72 |
| Signals | normal | 1890 | 1398 (74 %) | 18030 | 77 % | 1.70 | 19379.50 |
| Signals | trailing | 1890 | 1549 (82 %) | 16440 | 84 % | 2.74 | 27430.58 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1716 | 250 (15 %) | 721 | 53 % | 0.20 | -518.41 |
| Short | active | 48 | 0 (0 %) | 8 | 0 % | 0.00 | -21.60 |
| Short | bollinger | 65 | 8 (12 %) | 26 | 62 % | 1.18 | 4.73 |
| Short | break | 259 | 11 (4 %) | 35 | 63 % | 0.92 | -3.65 |
| Short | channel | 11 | 0 (0 %) | 9 | 0 % | 0.00 | -28.90 |
| Short | direction | 43 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | ema | 17 | 2 (12 %) | 9 | 44 % | 0.31 | -9.07 |
| Short | macd | 41 | 18 (44 %) | 26 | 73 % | 1.16 | 2.71 |
| Short | move | 410 | 103 (25 %) | 684 | 60 % | 0.91 | -82.59 |
| Short | osc | 386 | 103 (27 %) | 888 | 44 % | 0.49 | -847.50 |
| Short | rsi | 10 | 3 (30 %) | 11 | 45 % | 0.46 | -11.90 |
| Short | sar | 2 | 0 (0 %) | 4 | 50 % | 0.82 | -0.80 |
| Short | smooth | 41 | 17 (41 %) | 17 | 100 % | ∞ (no loss) | 26.20 |
| Short | trend | 141 | 26 (18 %) | 46 | 74 % | 2.10 | 44.70 |
| Short | volume | 80 | 16 (20 %) | 68 | 35 % | 0.30 | -96.89 |
| General | active | 24 | 3 (13 %) | 19 | 16 % | 0.24 | -39.00 |
| General | bollinger | 8 | 2 (25 %) | 6 | 33 % | 0.61 | -4.90 |
| General | break | 115 | 9 (8 %) | 54 | 52 % | 1.03 | 2.44 |
| General | channel | 9 | 7 (78 %) | 35 | 63 % | 1.90 | 43.80 |
| General | direction | 2 | 1 (50 %) | 6 | 67 % | 1.00 | 0.03 |
| General | ema | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | macd | 11 | 5 (45 %) | 7 | 71 % | 34.82 | 9.24 |
| General | move | 141 | 41 (29 %) | 265 | 51 % | 0.85 | -67.92 |
| General | osc | 171 | 13 (8 %) | 313 | 24 % | 0.26 | -629.54 |
| General | rsi | 17 | 7 (41 %) | 26 | 46 % | 0.96 | -1.60 |
| General | smooth | 35 | 9 (26 %) | 9 | 100 % | ∞ (no loss) | 28.14 |
| General | trend | 41 | 5 (12 %) | 15 | 67 % | 1.69 | 13.41 |
| General | volume | 27 | 4 (15 %) | 28 | 14 % | 0.01 | -79.68 |
| Long | active | 35 | 2 (6 %) | 12 | 17 % | 0.23 | -30.60 |
| Long | bollinger | 33 | 0 (0 %) | 4 | 0 % | 0.00 | -13.40 |
| Long | break | 191 | 28 (15 %) | 113 | 49 % | 0.92 | -23.08 |
| Long | channel | 11 | 8 (73 %) | 44 | 64 % | 2.17 | 86.50 |
| Long | direction | 8 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | ema | 9 | 2 (22 %) | 2 | 100 % | ∞ (no loss) | 1.29 |
| Long | ichimoku | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | macd | 11 | 1 (9 %) | 1 | 100 % | ∞ (no loss) | 0.82 |
| Long | move | 220 | 4 (2 %) | 348 | 22 % | 0.17 | -1081.36 |
| Long | osc | 170 | 31 (18 %) | 190 | 34 % | 0.40 | -406.78 |
| Long | rsi | 14 | 4 (29 %) | 30 | 47 % | 1.07 | 6.03 |
| Long | smooth | 85 | 3 (4 %) | 9 | 33 % | 0.45 | -21.00 |
| Long | trend | 40 | 12 (30 %) | 32 | 56 % | 1.11 | 6.97 |
| Long | volume | 121 | 20 (17 %) | 72 | 28 % | 0.05 | -254.40 |
| Wide | active | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -12.46 |
| Wide | bollinger | 6 | 3 (50 %) | 27 | 44 % | 0.93 | -1.43 |
| Wide | break | 26 | 0 (0 %) | 3 | 0 % | 0.00 | -2.83 |
| Wide | channel | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 13 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | ema | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 89 | 3 (3 %) | 48 | 19 % | 0.23 | -56.84 |
| Wide | osc | 32 | 20 (63 %) | 38 | 76 % | 5.25 | 44.78 |
| Wide | rsi | 29 | 9 (31 %) | 151 | 32 % | 0.76 | -18.91 |
| Wide | smooth | 16 | 9 (56 %) | 9 | 100 % | ∞ (no loss) | 18.93 |
| Wide | trend | 18 | 9 (50 %) | 9 | 100 % | ∞ (no loss) | 15.08 |
| Wide | volume | 22 | 12 (55 %) | 34 | 35 % | 1.20 | 5.59 |
| Signals | signal:act-burst | 60 | 58 (97 %) | 520 | 87 % | 4.53 | 1195.75 |
| Signals | signal:act-hf | 60 | 60 (100 %) | 649 | 91 % | 7.40 | 1694.68 |
| Signals | signal:adx | 49 | 44 (90 %) | 113 | 90 % | 9.55 | 303.45 |
| Signals | signal:atr-break | 60 | 59 (98 %) | 513 | 90 % | 8.70 | 1454.48 |
| Signals | signal:bollinger | 34 | 28 (82 %) | 106 | 67 % | 1.37 | 40.92 |
| Signals | signal:cci | 47 | 37 (79 %) | 157 | 76 % | 2.61 | 207.10 |
| Signals | signal:cmf | 60 | 59 (98 %) | 337 | 92 % | 12.18 | 1019.44 |
| Signals | signal:donchian | 60 | 59 (98 %) | 464 | 88 % | 4.22 | 1033.78 |
| Signals | signal:ema-cross | 36 | 15 (42 %) | 77 | 66 % | 0.62 | -61.74 |
| Signals | signal:ema-cross-fast | 52 | 41 (79 %) | 197 | 84 % | 3.63 | 326.21 |
| Signals | signal:ema-pullback | 40 | 32 (80 %) | 235 | 81 % | 3.01 | 437.75 |
| Signals | signal:ema-slope | 53 | 39 (74 %) | 167 | 81 % | 1.96 | 188.19 |
| Signals | signal:ema-trend | 59 | 56 (95 %) | 199 | 87 % | 11.15 | 515.75 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 614 | 88 % | 6.50 | 1542.85 |
| Signals | signal:hma | 60 | 58 (97 %) | 374 | 85 % | 3.61 | 777.28 |
| Signals | signal:ichimoku | 53 | 48 (91 %) | 176 | 86 % | 5.82 | 439.36 |
| Signals | signal:impulse | 60 | 46 (77 %) | 503 | 79 % | 1.85 | 577.85 |
| Signals | signal:kama | 60 | 60 (100 %) | 464 | 91 % | 11.29 | 1337.05 |
| Signals | signal:keltner | 60 | 41 (68 %) | 356 | 76 % | 1.77 | 392.84 |
| Signals | signal:macd-cross | 60 | 42 (70 %) | 505 | 73 % | 1.21 | 200.59 |
| Signals | signal:macd-hist | 60 | 59 (98 %) | 654 | 82 % | 2.80 | 1147.45 |
| Signals | signal:macd-slow | 60 | 52 (87 %) | 449 | 79 % | 1.97 | 541.53 |
| Signals | signal:mfi | 15 | 9 (60 %) | 29 | 72 % | 0.47 | -24.64 |
| Signals | signal:obv | 60 | 56 (93 %) | 411 | 87 % | 3.80 | 900.83 |
| Signals | signal:r-awesome | 60 | 60 (100 %) | 491 | 91 % | 8.95 | 1368.91 |
| Signals | signal:r-connors | 44 | 35 (80 %) | 110 | 83 % | 2.52 | 160.93 |
| Signals | signal:r-fractal | 60 | 60 (100 %) | 485 | 96 % | 15.52 | 1517.06 |
| Signals | signal:r-inside | 51 | 50 (98 %) | 109 | 93 % | 20.28 | 296.18 |
| Signals | signal:r-linreg | 60 | 59 (98 %) | 283 | 89 % | 7.99 | 820.14 |
| Signals | signal:r-nr-break | 60 | 60 (100 %) | 614 | 88 % | 7.02 | 1678.06 |
| Signals | signal:r-session-trend | 60 | 52 (87 %) | 661 | 85 % | 3.98 | 1415.78 |
| Signals | signal:r-vol-regime | 60 | 60 (100 %) | 324 | 90 % | 6.73 | 906.26 |
| Signals | signal:reclaim | 58 | 56 (97 %) | 253 | 86 % | 5.15 | 595.45 |
| Signals | signal:rsi-mid | 60 | 57 (95 %) | 420 | 89 % | 6.26 | 1043.22 |
| Signals | signal:rsi-momentum | 60 | 58 (97 %) | 166 | 87 % | 4.70 | 469.88 |
| Signals | signal:rsi-reversal | 40 | 24 (60 %) | 80 | 64 % | 0.90 | -14.88 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 777 | 87 % | 5.75 | 2010.11 |
| Signals | signal:s2-adx-gate | 60 | 59 (98 %) | 313 | 90 % | 10.18 | 856.30 |
| Signals | signal:s2-atr-break | 60 | 58 (97 %) | 777 | 85 % | 4.16 | 1713.89 |
| Signals | signal:s2-bb-bounce | 59 | 23 (39 %) | 218 | 66 % | 0.88 | -65.58 |
| Signals | signal:s2-block-scale | 60 | 56 (93 %) | 678 | 85 % | 4.23 | 1561.59 |
| Signals | signal:s2-block-stack | 60 | 48 (80 %) | 311 | 80 % | 2.29 | 432.42 |
| Signals | signal:s2-confluence | 60 | 49 (82 %) | 213 | 81 % | 2.97 | 382.08 |
| Signals | signal:s2-ema-cross | 12 | 10 (83 %) | 14 | 71 % | 2.70 | 7.42 |
| Signals | signal:s2-range-break | 60 | 60 (100 %) | 138 | 94 % | 22.98 | 395.91 |
| Signals | signal:s2-range-shift | 60 | 59 (98 %) | 611 | 89 % | 8.02 | 1691.96 |
| Signals | signal:s2-rsi-revert | 41 | 18 (44 %) | 73 | 49 % | 0.40 | -119.13 |
| Signals | signal:s2-st-trail | 53 | 36 (68 %) | 163 | 75 % | 1.29 | 80.75 |
| Signals | signal:s2-stoch-swing | 58 | 51 (88 %) | 159 | 86 % | 5.32 | 327.49 |
| Signals | signal:s2-vol-break | 51 | 51 (100 %) | 110 | 98 % | 79.12 | 313.58 |
| Signals | signal:s2-vwap-axis | 17 | 16 (94 %) | 17 | 94 % | 288.56 | 28.99 |
| Signals | signal:sar | 60 | 60 (100 %) | 454 | 93 % | 17.56 | 1413.41 |
| Signals | signal:squeeze | 46 | 42 (91 %) | 82 | 85 % | 3.88 | 155.65 |
| Signals | signal:st-slow | 31 | 18 (58 %) | 105 | 71 % | 1.33 | 60.66 |
| Signals | signal:stoch-rsi | 60 | 56 (93 %) | 280 | 88 % | 5.58 | 669.88 |
| Signals | signal:supertrend | 58 | 55 (95 %) | 201 | 87 % | 4.48 | 412.23 |
| Signals | signal:swing | 60 | 57 (95 %) | 611 | 85 % | 4.32 | 1408.95 |
| Signals | signal:thrust | 60 | 60 (100 %) | 484 | 88 % | 4.67 | 1124.46 |
| Signals | signal:trix | 52 | 35 (67 %) | 161 | 75 % | 1.54 | 123.24 |
| Signals | signal:volume-break | 51 | 51 (100 %) | 70 | 99 % | 1079.03 | 226.11 |
| Signals | signal:vwap | 43 | 42 (98 %) | 177 | 89 % | 10.10 | 457.49 |
| Signals | signal:williams-r | 44 | 25 (57 %) | 111 | 64 % | 0.72 | -68.44 |
| Signals | signal:zscore | 45 | 32 (71 %) | 119 | 68 % | 1.38 | 64.20 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 149 | 14 (9 %) | 131 | 11 % | 0.01 | -189.99 |
| Micro | 1.25 | 131 | 2 (2 %) | 113 | 2 % | 0.00 | -185.62 |
| Micro | 1.35 | 123 | 2 (2 %) | 105 | 2 % | 0.00 | -184.49 |
| Micro | 1.5 | 97 | 0 (0 %) | 87 | 0 % | 0.00 | -175.89 |
| Micro | 1.75 | 50 | 0 (0 %) | 48 | 0 % | 0.00 | -106.35 |
| Micro | 2 | 40 | 0 (0 %) | 40 | 0 % | 0.00 | -95.37 |
| Short | 1.1 | 432 | 149 (34 %) | 816 | 44 % | 0.47 | -744.08 |
| Short | 1.25 | 403 | 142 (35 %) | 752 | 45 % | 0.49 | -654.70 |
| Short | 1.35 | 352 | 128 (36 %) | 643 | 46 % | 0.51 | -519.39 |
| Short | 1.5 | 261 | 107 (41 %) | 450 | 50 % | 0.60 | -265.39 |
| Short | 1.75 | 144 | 63 (44 %) | 243 | 54 % | 0.71 | -93.50 |
| Short | 2 | 53 | 25 (47 %) | 89 | 58 % | 0.88 | -11.30 |
| General | 1.1 | 182 | 26 (14 %) | 376 | 30 % | 0.43 | -524.39 |
| General | 1.25 | 168 | 23 (14 %) | 351 | 31 % | 0.44 | -484.08 |
| General | 1.35 | 155 | 22 (14 %) | 324 | 31 % | 0.44 | -436.28 |
| General | 1.5 | 103 | 17 (17 %) | 207 | 35 % | 0.54 | -219.84 |
| General | 1.75 | 41 | 9 (22 %) | 77 | 47 % | 0.85 | -22.97 |
| General | 2 | 20 | 4 (20 %) | 41 | 46 % | 0.85 | -12.53 |
| Long | 1.1 | 205 | 63 (31 %) | 264 | 49 % | 0.97 | -16.69 |
| Long | 1.25 | 168 | 45 (27 %) | 195 | 47 % | 0.91 | -44.11 |
| Long | 1.35 | 140 | 36 (26 %) | 160 | 47 % | 0.88 | -51.35 |
| Long | 1.5 | 109 | 29 (27 %) | 132 | 45 % | 0.81 | -65.45 |
| Long | 1.75 | 57 | 16 (28 %) | 73 | 44 % | 0.76 | -49.25 |
| Long | 2 | 19 | 4 (21 %) | 25 | 40 % | 0.50 | -40.09 |
| Wide | 1.1 | 21 | 9 (43 %) | 51 | 65 % | 2.04 | 29.10 |
| Wide | 1.25 | 18 | 9 (50 %) | 39 | 85 % | 4.51 | 44.50 |
| Wide | 1.35 | 12 | 3 (25 %) | 9 | 100 % | ∞ (no loss) | 16.55 |
| Wide | 1.5 | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | 1.75 | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | 1.1 | 896 | 795 (89 %) | 6592 | 85 % | 3.54 | 12961.06 |
| Signals | 1.25 | 510 | 450 (88 %) | 4011 | 84 % | 3.18 | 6975.52 |
| Signals | 1.35 | 332 | 292 (88 %) | 2770 | 84 % | 3.05 | 4529.80 |
| Signals | 1.5 | 193 | 166 (86 %) | 1657 | 83 % | 2.81 | 2478.53 |
| Signals | 1.75 | 72 | 59 (82 %) | 762 | 80 % | 2.48 | 871.87 |
| Signals | 2 | 38 | 29 (76 %) | 426 | 80 % | 2.35 | 416.08 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-rsit2-15@m5c | 76 | 62 (82 %) | 76 | 82 % | 8.38 | 18.76 | – |
| Micro | sandwich | mc-rsi14-25@m5c | 4 | 4 (100 %) | 16 | 100 % | ∞ (no loss) | 6.40 | – |
| Micro | snap | mc-rsi14-25@m5c | 4 | 4 (100 %) | 16 | 100 % | ∞ (no loss) | 6.40 | – |
| Micro | sandwich | mc-tstreak-4@m5 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 6.10 | – |
| Micro | revert | mc-trsi2-10@m5c | 44 | 14 (32 %) | 44 | 32 % | 0.28 | -3.15 | – |
| Micro | sandwich | mc-rsit5-20@m15 | 30 | 22 (73 %) | 30 | 73 % | 0.47 | -9.38 | – |
| Micro | pulse | mc-rsit5-20@m15 | 30 | 22 (73 %) | 30 | 73 % | 0.47 | -9.38 | – |
| Micro | sweep | mc-rsi7-15@m5 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -13.09 | – |
| Micro | sweep | mc-rsi9-20@m5 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -13.09 | – |
| Micro | sweep | mc-rsi5-15@m5 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -14.83 | – |
| Micro | sweep | mc-rsi5-10@m5 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -16.88 | – |
| Micro | ribbon | mc-lag-12@m5 | 22 | 0 (0 %) | 106 | 79 % | 0.56 | -22.18 | tp0.55 sl1.7875 tr0 h192 mc (5 · 0.70 · -0.59) |
| Micro | magnet | mc-lag-12@m5 | 20 | 0 (0 %) | 40 | 50 % | 0.12 | -47.30 | – |
| Micro | sandwich | mc-rsit7-20@m15 | 114 | 50 (44 %) | 114 | 44 % | 0.12 | -118.70 | – |
| Micro | pulse | mc-rsit7-20@m15 | 114 | 50 (44 %) | 114 | 44 % | 0.12 | -118.70 | – |
| Micro | sweep | mc-rsi4-10@m5 | 72 | 0 (0 %) | 72 | 0 % | 0.00 | -162.92 | – |
| Short | clamp | r-ultimate@m15 | 14 | 14 (100 %) | 42 | 100 % | ∞ (no loss) | 77.68 | – |
| Short | magnet | willr-50-90@m15c | 29 | 26 (90 %) | 29 | 90 % | 23.05 | 48.21 | – |
| Short | revert | r-roofing@m15 | 25 | 17 (68 %) | 33 | 76 % | 2.16 | 36.94 | – |
| Short | follow | r-fisher-m@m15c | 17 | 17 (100 %) | 30 | 57 % | 8.68 | 34.15 | – |
| Short | pulse | hma-55@m15 | 15 | 15 (100 %) | 15 | 100 % | ∞ (no loss) | 24.87 | – |
| Short | sweep | r-sweep@m15 | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 21.35 | – |
| Short | sandwich | r-cvd-div@m15c | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 20.20 | – |
| Short | pulse | r-cvd-div@m15c | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 20.20 | – |
| Short | pulse | move-impulse-10-2@m15 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 20.18 | – |
| Short | ribbon | macd-hist-19-39-9@m15c | 20 | 18 (90 %) | 20 | 90 % | 251.37 | 19.42 | – |
| Short | magnet | r-zdist@m15 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 18.62 | – |
| Short | pivot | r-chand-m@m15 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 16.20 | – |
| Short | pivot | r-bb-adx@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 13.44 | – |
| Short | sweep | break-squeeze-30@m30 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 10.83 | – |
| Short | clamp | cci-40-200@m15c | 2 | 2 (100 %) | 10 | 60 % | 1.65 | 3.11 | tp2 sl2 tr1 h64 sh (5 · 1.65 · 1.56) |
| Short | ribbon | ema-slope@m15c | 2 | 2 (100 %) | 5 | 80 % | 2.07 | 2.13 | – |
| Short | sandwich | bb-bounce-50-2@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.84 | -1.57 | – |
| Short | sandwich | z-50-2@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.84 | -1.57 | – |
| Short | pulse | bb-bounce-50-2@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.84 | -1.57 | – |
| Short | pulse | z-50-2@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.84 | -1.57 | – |
| Short | ribbon | willr-7-90@m30 | 13 | 6 (46 %) | 37 | 54 % | 0.91 | -4.50 | – |
| Short | ribbon | willr-50-95@m15c | 7 | 4 (57 %) | 7 | 57 % | 0.28 | -11.06 | – |
| Short | sweep | willr-50-95@m15 | 4 | 0 (0 %) | 11 | 27 % | 0.28 | -14.40 | – |
| Short | sweep | willr-7-90@m15c | 4 | 0 (0 %) | 18 | 44 % | 0.58 | -14.80 | tp2.8 sl2.8 tr2.1 h64 sh (5 · 0.58 · -3.80) |
| Short | sandwich | z-50-2.5@x4@m15 | 23 | 5 (22 %) | 69 | 64 % | 0.87 | -15.77 | – |
| Short | snap | z-50-2.5@x4@m15 | 23 | 5 (22 %) | 69 | 64 % | 0.87 | -15.77 | – |
| Short | pulse | z-50-2.5@x4@m15 | 23 | 5 (22 %) | 69 | 64 % | 0.87 | -15.77 | – |
| Short | sweep | macd-hist@m15c | 3 | 0 (0 %) | 6 | 17 % | 0.01 | -16.71 | – |
| Short | magnet | break-don40@m15 | 3 | 0 (0 %) | 6 | 33 % | 0.00 | -16.75 | – |
| Short | magnet | break-don55@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -17.40 | – |
| Short | sandwich | r-zdist@m15c | 63 | 22 (35 %) | 189 | 59 % | 0.93 | -18.60 | – |
| Short | snap | r-zdist@m15c | 63 | 22 (35 %) | 189 | 59 % | 0.93 | -18.60 | – |
| Short | pulse | r-zdist@m15c | 63 | 22 (35 %) | 189 | 59 % | 0.93 | -18.60 | – |
| Short | sweep | willr-7-90@m30 | 5 | 0 (0 %) | 11 | 45 % | 0.41 | -19.00 | – |
| Short | sweep | r-clv-thrust-m@m30 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -21.60 | – |
| Short | revert | r-klinger-m@m15c | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -25.60 | – |
| Short | sweep | r-pin-m@m15 | 21 | 7 (33 %) | 55 | 58 % | 0.58 | -25.84 | – |
| Short | sweep | kelt-20-2.5@m15c | 10 | 0 (0 %) | 9 | 0 % | 0.00 | -28.90 | – |
| Short | sweep | willr-14-95@m30 | 13 | 4 (31 %) | 33 | 27 % | 0.26 | -38.05 | – |
| Short | sweep | willr-21-90@m30 | 7 | 0 (0 %) | 24 | 29 % | 0.30 | -40.00 | – |
| Short | ribbon | willr-21-95@m30 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -41.00 | – |
| Short | sweep | willr-21-95@m15c | 10 | 2 (20 %) | 24 | 25 % | 0.20 | -44.40 | – |
| Short | sweep | r-td-m@m15 | 28 | 0 (0 %) | 18 | 0 % | 0.00 | -46.40 | – |
| Short | ribbon | willr-28-95@m30 | 15 | 0 (0 %) | 18 | 0 % | 0.00 | -46.98 | – |
| Short | sweep | mfi-14-20@m15c | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -53.80 | – |
| Short | ribbon | r-klinger@m30 | 16 | 0 (0 %) | 32 | 25 % | 0.01 | -57.89 | – |
| Short | sweep | willr-50-95@m30 | 22 | 7 (32 %) | 58 | 38 % | 0.33 | -60.85 | – |
| Short | sweep | willr-28-95@m15 | 10 | 0 (0 %) | 20 | 0 % | 0.00 | -69.20 | – |
| Short | sweep | willr-50-95@m15c | 21 | 0 (0 %) | 44 | 27 % | 0.15 | -96.31 | – |
| Short | sweep | willr-21-95@m15 | 40 | 2 (5 %) | 119 | 39 % | 0.44 | -137.19 | – |
| Short | sweep | willr-28-95@m30 | 24 | 1 (4 %) | 56 | 20 % | 0.07 | -139.49 | – |
| Short | sweep | willr-21-90@m15c | 16 | 0 (0 %) | 49 | 2 % | 0.01 | -163.10 | tp2.2 sl2.2 tr0 h96 sh (5 · 0.21 · -7.60) |
| General | sweep | break-don40@m30 | 6 | 6 (100 %) | 33 | 70 % | 2.16 | 45.36 | tp4.4 sl4.4 tr0 h32 gn (5 · 3.65 · 12.20) |
| General | sweep | kelt-20-2@m30 | 4 | 4 (100 %) | 22 | 73 % | 2.90 | 44.00 | tp4.4 sl4.4 tr0 h32 gn (5 · 3.65 · 12.20) |
| General | ribbon | hma-55@m15c | 12 | 9 (75 %) | 9 | 100 % | ∞ (no loss) | 28.14 | – |
| General | revert | r-roofing@m15 | 10 | 5 (50 %) | 15 | 67 % | 1.69 | 13.41 | – |
| General | magnet | rsi-fast@m30 | 7 | 7 (100 %) | 13 | 54 % | 2.05 | 12.60 | – |
| General | ribbon | macd-hist-19-39-9@m15c | 7 | 5 (71 %) | 7 | 71 % | 34.82 | 9.24 | – |
| General | sweep | kelt-20-2.5@m30 | 3 | 3 (100 %) | 11 | 55 % | 1.35 | 6.60 | – |
| General | ribbon | willr-7-90@m30 | 6 | 2 (33 %) | 11 | 55 % | 1.29 | 4.60 | – |
| General | sweep | r-session-trend@m15 | 1 | 1 (100 %) | 6 | 67 % | 1.00 | 0.03 | tp3.6 sl3.6 tr1.8 h96 gn (6 · 1.00 · 0.03) |
| General | sweep | willr-7-90@m15c | 3 | 2 (67 %) | 10 | 60 % | 0.90 | -1.68 | – |
| General | revert | r-laguerre@m15c | 5 | 0 (0 %) | 13 | 38 % | 0.58 | -14.20 | – |
| General | sweep | willr-7-90@m30 | 7 | 0 (0 %) | 17 | 41 % | 0.65 | -15.40 | – |
| General | sweep | willr-21-90@m15c | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -15.60 | – |
| General | ribbon | r-klinger@m30 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -16.20 | – |
| General | sweep | willr-50-95@m15 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -17.80 | – |
| General | sweep | r-clv-thrust-m@m30 | 13 | 3 (23 %) | 13 | 23 % | 0.41 | -18.00 | – |
| General | sandwich | z-50-2.5@x4@m15 | 6 | 2 (33 %) | 16 | 50 % | 0.49 | -18.72 | – |
| General | snap | z-50-2.5@x4@m15 | 6 | 2 (33 %) | 16 | 50 % | 0.49 | -18.72 | – |
| General | pulse | z-50-2.5@x4@m15 | 6 | 2 (33 %) | 16 | 50 % | 0.49 | -18.72 | – |
| General | follow | act-burst-2.5@x4@m15c | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -21.00 | – |
| General | ribbon | willr-21-95@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -23.80 | – |
| General | sandwich | r-zdist@m15c | 31 | 13 (42 %) | 87 | 51 % | 0.82 | -26.91 | – |
| General | snap | r-zdist@m15c | 31 | 13 (42 %) | 87 | 51 % | 0.82 | -26.91 | – |
| General | pulse | r-zdist@m15c | 31 | 13 (42 %) | 87 | 51 % | 0.82 | -26.91 | – |
| General | magnet | break-don55@m15 | 11 | 0 (0 %) | 11 | 0 % | 0.00 | -46.80 | – |
| General | revert | r-klinger-m@m15c | 8 | 0 (0 %) | 16 | 0 % | 0.00 | -55.20 | – |
| General | sweep | willr-28-95@m15 | 12 | 0 (0 %) | 20 | 0 % | 0.00 | -70.80 | – |
| General | sweep | willr-21-95@m15 | 27 | 0 (0 %) | 76 | 36 % | 0.55 | -81.60 | – |
| General | sweep | willr-14-95@m30 | 14 | 0 (0 %) | 28 | 0 % | 0.00 | -95.60 | – |
| General | sweep | willr-21-95@m15c | 15 | 0 (0 %) | 30 | 0 % | 0.00 | -102.80 | – |
| General | sweep | willr-28-95@m30 | 17 | 0 (0 %) | 45 | 7 % | 0.01 | -136.69 | – |
| Long | revert | r-awesome-m@m15c | 20 | 17 (85 %) | 40 | 75 % | 2.96 | 89.21 | – |
| Long | ribbon | willr-7-90@m30 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 56.40 | – |
| Long | sweep | kelt-20-1.5@m30 | 3 | 3 (100 %) | 15 | 80 % | 4.09 | 56.20 | tp6.4 sl4.8 tr0 h48 lg (5 · 4.96 · 19.80) |
| Long | sweep | kelt-20-2@m30 | 5 | 5 (100 %) | 21 | 71 % | 2.80 | 52.10 | tp5.2 sl3.9 tr0 h32 lg (5 · 1.83 · 6.80) |
| Long | revert | r-roofing@m15 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 33.27 | – |
| Long | sweep | break-don55@m15c | 13 | 7 (54 %) | 29 | 55 % | 1.25 | 17.00 | – |
| Long | sweep | break-retest@m30 | 3 | 3 (100 %) | 6 | 50 % | 1.37 | 4.50 | – |
| Long | revert | r-laguerre@m15c | 13 | 3 (23 %) | 29 | 45 % | 1.02 | 1.43 | – |
| Long | sweep | break-don40@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.94 | -1.20 | – |
| Long | sweep | break-don40@m15c | 12 | 5 (42 %) | 24 | 50 % | 0.98 | -1.53 | – |
| Long | sweep | break-don55@m15 | 3 | 1 (33 %) | 7 | 57 % | 0.86 | -2.52 | – |
| Long | sweep | r-clv-thrust-m@m30 | 6 | 2 (33 %) | 6 | 33 % | 0.72 | -3.60 | – |
| Long | sweep | break-don20@m15c | 5 | 0 (0 %) | 10 | 50 % | 0.74 | -7.83 | – |
| Long | revert | r-camarilla-m@m30 | 1 | 0 (0 %) | 6 | 17 % | 0.36 | -9.00 | tp5.2 sl2.6 tr0 h32 lg (6 · 0.36 · -9.00) |
| Long | sweep | willr-21-95@m15 | 8 | 0 (0 %) | 19 | 42 % | 0.77 | -11.40 | – |
| Long | sweep | trend-adx-30@m15c | 6 | 0 (0 %) | 18 | 33 % | 0.59 | -22.80 | – |
| Long | ribbon | willr-28-95@m30 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -24.80 | – |
| Long | sweep | willr-28-95@m30 | 4 | 0 (0 %) | 6 | 0 % | 0.00 | -26.20 | – |
| Long | sandwich | act-burst@m15 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -27.00 | – |
| Long | sweep | willr-14-95@m30 | 4 | 0 (0 %) | 6 | 0 % | 0.00 | -27.20 | – |
| Long | ribbon | hma-16@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -38.40 | – |
| Long | clamp | cci-40-200@x4@m15 | 18 | 3 (17 %) | 24 | 38 % | 0.41 | -47.35 | – |
| Long | magnet | break-don55@m15 | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -66.90 | – |
| Long | sandwich | z-50-2.5@x4@m15 | 8 | 0 (0 %) | 16 | 13 % | 0.01 | -85.35 | – |
| Long | snap | z-50-2.5@x4@m15 | 8 | 0 (0 %) | 16 | 13 % | 0.01 | -85.35 | – |
| Long | pulse | z-50-2.5@x4@m15 | 8 | 0 (0 %) | 16 | 13 % | 0.01 | -85.35 | – |
| Long | ribbon | willr-21-95@m30 | 17 | 0 (0 %) | 17 | 0 % | 0.00 | -91.40 | – |
| Long | sandwich | r-cvd-div@m15c | 36 | 10 (28 %) | 36 | 28 % | 0.05 | -127.20 | – |
| Long | pulse | r-cvd-div@m15c | 36 | 10 (28 %) | 36 | 28 % | 0.05 | -127.20 | – |
| Long | sandwich | r-zdist@m15c | 50 | 0 (0 %) | 114 | 21 % | 0.17 | -357.14 | – |
| Long | snap | r-zdist@m15c | 50 | 0 (0 %) | 114 | 21 % | 0.17 | -357.14 | – |
| Long | pulse | r-zdist@m15c | 50 | 0 (0 %) | 114 | 21 % | 0.17 | -357.14 | – |
| Wide | sweep | z-50-2.5@x4@m5 | 18 | 12 (67 %) | 12 | 100 % | ∞ (no loss) | 24.63 | – |
| Wide | ribbon | hma-55@m15c | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 18.93 | – |
| Wide | magnet | r-zdist@m15 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 16.55 | – |
| Wide | magnet | bb-bounce-50-2@m15c | 3 | 3 (100 %) | 15 | 80 % | 3.20 | 13.97 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (5 · 3.20 · 4.66) |
| Wide | magnet | z-50-2@m15c | 3 | 3 (100 %) | 15 | 80 % | 3.20 | 13.97 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (5 · 3.20 · 4.66) |
| Wide | sweep | mfi-14-10@m30 | 12 | 12 (100 %) | 24 | 50 % | 1.59 | 12.59 | – |
| Wide | sweep | willr-28-95@m5c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 10.37 | – |
| Wide | sweep | r-elder@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 9.57 | – |
| Wide | ribbon | rsi-21-30-70@m1c | 3 | 3 (100 %) | 30 | 50 % | 1.74 | 9.13 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (10 · 1.92 · 3.44) |
| Wide | pivot | rsi-21-30-70@m1c | 3 | 3 (100 %) | 30 | 50 % | 1.74 | 9.13 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (10 · 1.92 · 3.44) |
| Wide | revert | rsi-mom-21-25@m5c | 3 | 3 (100 %) | 6 | 50 % | 1.32 | 0.81 | – |
| Wide | sweep | cci-40-200@m5c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 | – |
| Wide | magnet | r-vwap-reclaim@m1 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -6.30 | – |
| Wide | magnet | rsi-14-25-75@m1c | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -7.00 | – |
| Wide | sandwich | mc-tstreak-4@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -10.36 | – |
| Wide | pulse | bb-wick@m5c | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -15.40 | – |
| Wide | magnet | rsi-21-30-70@m1c | 15 | 0 (0 %) | 75 | 20 % | 0.30 | -30.98 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (5 · 0.32 · -1.90) |
| Wide | ribbon | move-impulse-20-2.5@m30 | 18 | 0 (0 %) | 34 | 0 % | 0.00 | -65.14 | – |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 30 (100 %) | 397 | 89 % | 7.78 | 1075.00 | tp6 sl18 tr4.8 h96 (10 · ∞ (no loss) · 46.82) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 30 (100 %) | 386 | 88 % | 6.37 | 1028.32 | tp8 sl24 tr4.8 h96 (7 · ∞ (no loss) · 54.60) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 30 (100 %) | 391 | 86 % | 5.24 | 981.79 | tp8 sl24 tr4.8 h96 (7 · ∞ (no loss) · 54.60) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 30 (100 %) | 361 | 91 % | 10.89 | 947.78 | tp4 sl12 tr0 h96 (12 · ∞ (no loss) · 45.60) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 347 | 90 % | 7.97 | 947.13 | tp3 sl9 tr0 h96 (14 · ∞ (no loss) · 39.20) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 30 (100 %) | 343 | 91 % | 8.05 | 928.53 | tp4 sl6 tr0 h96 (15 · 8.58 · 47.00) |
| Signals | follow | sig-sar-s@m15 | 30 | 30 (100 %) | 301 | 93 % | 14.27 | 928.43 | tp4 sl12 tr2.4 h96 (13 · 35665.00 · 42.13) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 352 | 90 % | 7.67 | 924.15 | tp5 sl15 tr4 h96 (10 · ∞ (no loss) · 43.20) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 29 (97 %) | 288 | 91 % | 9.29 | 853.49 | tp8 sl24 tr3.2 h96 (7 · ∞ (no loss) · 40.69) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 29 (97 %) | 350 | 87 % | 4.80 | 846.17 | tp4 sl12 tr3.2 h96 (13 · ∞ (no loss) · 49.40) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 30 (100 %) | 284 | 89 % | 7.89 | 845.23 | tp6 sl18 tr3.6 h96 (8 · ∞ (no loss) · 41.87) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 30 (100 %) | 323 | 88 % | 7.07 | 838.47 | tp8 sl24 tr4.8 h96 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 30 (100 %) | 330 | 87 % | 6.33 | 832.83 | tp5 sl15 tr2 h96 (13 · 38.91 · 43.43) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 29 (97 %) | 378 | 84 % | 3.80 | 801.77 | tp6 sl18 tr0 h96 (7 · ∞ (no loss) · 40.60) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 30 (100 %) | 291 | 90 % | 8.63 | 796.17 | tp4 sl8 tr0 h96 (11 · ∞ (no loss) · 41.80) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 274 | 94 % | 9.21 | 784.96 | tp8 sl24 tr4.8 h96 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 30 (100 %) | 306 | 90 % | 6.75 | 766.15 | tp6 sl12 tr0 h96 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 30 (100 %) | 211 | 98 % | 83.29 | 732.09 | tp4 sl6 tr0 h96 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-kama-m@m15 | 30 | 30 (100 %) | 227 | 94 % | 56.28 | 730.51 | tp4 sl6 tr0 h96 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 27 (90 %) | 328 | 84 % | 3.75 | 715.42 | tp4 sl12 tr3.2 h96 (12 · ∞ (no loss) · 45.60) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 30 (100 %) | 340 | 87 % | 3.88 | 714.98 | tp3 sl6 tr0 h96 (14 · ∞ (no loss) · 39.20) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 30 (100 %) | 239 | 92 % | 13.05 | 684.91 | tp8 sl24 tr6.4 h96 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 30 (100 %) | 252 | 90 % | 6.93 | 684.00 | tp8 sl24 tr6.4 h96 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 29 (97 %) | 247 | 91 % | 10.82 | 665.01 | tp5 sl15 tr2 h96 (12 · 33.11 · 32.72) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 29 (97 %) | 222 | 91 % | 8.78 | 658.30 | tp4 sl6 tr0 h96 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 29 (97 %) | 203 | 91 % | 8.49 | 642.68 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 33.30) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 28 (93 %) | 380 | 81 % | 2.66 | 638.90 | tp5 sl15 tr3 h96 (11 · 34.86 · 38.79) |
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 319 | 85 % | 3.30 | 626.53 | tp8 sl24 tr3.2 h96 (8 · 35.99 · 40.08) |
| Signals | follow | sig-obv-s@m15 | 30 | 30 (100 %) | 187 | 95 % | 26.56 | 624.39 | tp6 sl9 tr0 h96 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 29 (97 %) | 262 | 85 % | 5.35 | 618.69 | tp4 sl12 tr0 h96 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-kama-s@m15 | 30 | 30 (100 %) | 237 | 88 % | 6.20 | 606.54 | tp6 sl9 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 232 | 91 % | 6.25 | 597.19 | tp4 sl12 tr0 h96 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-hma-s@m15 | 30 | 30 (100 %) | 282 | 87 % | 3.49 | 593.92 | tp5 sl15 tr0 h96 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 215 | 89 % | 9.38 | 591.47 | tp5 sl10 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-cmf-m@m15 | 30 | 29 (97 %) | 154 | 95 % | 21.11 | 526.43 | tp8 sl24 tr3.2 h96 (7 · ∞ (no loss) · 41.43) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 165 | 94 % | 15.69 | 497.93 | tp4 sl8 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 30 (100 %) | 196 | 90 % | 6.51 | 494.13 | tp4 sl8 tr0 h96 (7 · ∞ (no loss) · 26.60) |
| Signals | follow | sig-cmf-s@m15 | 30 | 30 (100 %) | 183 | 90 % | 8.59 | 493.01 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 24.95) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 27 (90 %) | 212 | 86 % | 4.22 | 491.33 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 27.56) |
| Signals | follow | sig-sar-m@m15 | 30 | 30 (100 %) | 153 | 92 % | 32.47 | 484.98 | tp6 sl9 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 28 (93 %) | 180 | 87 % | 6.36 | 480.76 | tp5 sl15 tr4 h96 (6 · ∞ (no loss) · 24.54) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 173 | 90 % | 6.70 | 475.34 | tp4 sl8 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 22 (73 %) | 300 | 78 % | 2.24 | 468.00 | tp8 sl24 tr4.8 h96 (6 · ∞ (no loss) · 39.69) |
| Signals | follow | sig-swing-m@m15 | 30 | 27 (90 %) | 264 | 79 % | 2.60 | 461.82 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 34.19) |
| Signals | follow | sig-donchian-s@m15 | 30 | 29 (97 %) | 232 | 84 % | 3.10 | 436.59 | tp4 sl12 tr0 h96 (7 · ∞ (no loss) · 26.60) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 302 | 81 % | 2.16 | 433.39 | tp4 sl8 tr0 h96 (13 · 2.55 · 25.40) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 30 (100 %) | 151 | 90 % | 6.77 | 430.92 | tp5 sl15 tr4 h96 (5 · ∞ (no loss) · 19.74) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 28 (93 %) | 176 | 84 % | 3.96 | 398.64 | tp4 sl12 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-vwap-s@m15 | 30 | 29 (97 %) | 138 | 88 % | 8.91 | 393.49 | tp4 sl12 tr2.4 h96 (5 · ∞ (no loss) · 15.33) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 28 (93 %) | 173 | 84 % | 3.90 | 378.21 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 19.72) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 28 (93 %) | 135 | 87 % | 9.13 | 367.11 | tp3 sl9 tr2.4 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 30 (100 %) | 276 | 80 % | 1.98 | 345.68 | tp3 sl4.5 tr0 h96 (16 · 2.58 · 22.30) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 30 (100 %) | 276 | 80 % | 1.98 | 345.68 | tp3 sl4.5 tr0 h96 (16 · 2.58 · 22.30) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 29 (97 %) | 129 | 87 % | 6.34 | 341.74 | tp4 sl12 tr1.6 h96 (7 · 330.24 · 9.82) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 28 (93 %) | 136 | 84 % | 3.65 | 336.38 | tp5 sl15 tr2 h96 (5 · 14.04 · 14.94) |
| Signals | follow | sig-impulse-s@m15 | 30 | 26 (87 %) | 255 | 83 % | 1.98 | 321.09 | tp6 sl18 tr2.4 h96 (7 · ∞ (no loss) · 20.80) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 29 (97 %) | 112 | 88 % | 6.81 | 320.06 | tp4 sl12 tr1.6 h96 (5 · 4704.69 · 13.18) |
| Signals | follow | sig-keltner-s@m15 | 30 | 25 (83 %) | 199 | 81 % | 2.55 | 316.83 | tp6 sl18 tr2.4 h96 (7 · ∞ (no loss) · 21.27) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 29 (97 %) | 123 | 91 % | 17.87 | 306.76 | tp2.5 sl5 tr0 h96 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-obv-m@m15 | 30 | 26 (87 %) | 224 | 81 % | 1.93 | 276.44 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 24.23) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 106 | 88 % | 12.99 | 268.29 | tp2.5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 29 (97 %) | 98 | 93 % | 12.65 | 264.83 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 13.32) |
| Signals | follow | sig-adx-m@m15 | 30 | 28 (93 %) | 85 | 93 % | 12.65 | 263.43 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-impulse-m@m15 | 30 | 20 (67 %) | 248 | 76 % | 1.72 | 256.76 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 28.43) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 29 (97 %) | 88 | 91 % | 16.74 | 241.75 | – |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 25 (83 %) | 139 | 84 % | 2.87 | 240.60 | tp4 sl12 tr3.2 h96 (5 · ∞ (no loss) · 15.23) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 28 | 26 (93 %) | 104 | 88 % | 7.31 | 231.05 | tp4 sl12 tr1.6 h96 (7 · ∞ (no loss) · 14.77) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 29 (97 %) | 123 | 86 % | 3.21 | 221.77 | tp4 sl12 tr1.6 h96 (7 · ∞ (no loss) · 13.52) |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 30 (100 %) | 67 | 99 % | 54.17 | 210.02 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 30 (100 %) | 69 | 94 % | 23.03 | 198.44 | tp3 sl9 tr1.2 h96 (5 · 48.43 · 6.93) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 30 (100 %) | 69 | 94 % | 22.93 | 197.46 | tp3 sl9 tr1.2 h96 (6 · 49.58 · 7.10) |
| Signals | follow | sig-reclaim-m@m15 | 28 | 28 (100 %) | 77 | 92 % | 23.26 | 196.82 | tp3 sl9 tr2.4 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 23 (77 %) | 172 | 76 % | 1.93 | 191.82 | tp4 sl12 tr3.2 h96 (6 · 73.97 · 15.30) |
| Signals | follow | sig-hma-m@m15 | 30 | 28 (93 %) | 92 | 82 % | 4.05 | 183.35 | tp3 sl9 tr1.8 h96 (5 · 19.22 · 7.96) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 30 (100 %) | 80 | 86 % | 6.62 | 177.46 | tp3 sl9 tr1.8 h96 (9 · 53.64 · 12.14) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 26 (87 %) | 84 | 85 % | 4.10 | 175.75 | tp3 sl9 tr1.8 h96 (5 · 80.05 · 8.39) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 30 (100 %) | 48 | 98 % | 818.78 | 171.53 | – |
| Signals | follow | sig-cci-s@m15 | 30 | 23 (77 %) | 101 | 76 % | 2.51 | 150.97 | tp4 sl12 tr1.6 h96 (6 · 429.49 · 12.04) |
| Signals | follow | sig-ema-trend-m@m15 | 29 | 28 (97 %) | 64 | 89 % | 27.14 | 148.65 | tp4 sl12 tr1.6 h96 (7 · ∞ (no loss) · 11.16) |
| Signals | follow | sig-supertrend-m@m15 | 28 | 25 (89 %) | 95 | 85 % | 2.50 | 143.94 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 11.51) |
| Signals | follow | sig-rsi-momentum-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 | – |
| Signals | follow | sig-r-connors-m@m15 | 28 | 22 (79 %) | 90 | 83 % | 2.48 | 130.01 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 13.64) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 26 (87 %) | 66 | 82 % | 3.38 | 128.88 | tp2.5 sl3.75 tr0 h96 (6 · 1.16 · 1.30) |
| Signals | follow | sig-trix-s@m15 | 30 | 25 (83 %) | 103 | 78 % | 1.97 | 112.22 | tp4 sl12 tr1.6 h96 (6 · 8.89 · 8.04) |
| Signals | follow | sig-s2-st-trail-m@m15 | 25 | 21 (84 %) | 89 | 84 % | 2.17 | 111.95 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 22 (73 %) | 147 | 74 % | 1.59 | 108.14 | tp5 sl15 tr2 h96 (7 · 656.93 · 12.10) |
| Signals | follow | sig-s2-vol-break-s@m15 | 21 | 21 (100 %) | 43 | 98 % | 1622.89 | 103.55 | – |
| Signals | follow | sig-ichimoku-m@m15 | 23 | 19 (83 %) | 47 | 85 % | 4.60 | 97.62 | – |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 25 (83 %) | 55 | 80 % | 3.46 | 96.44 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 9.21) |
| Signals | follow | sig-keltner-m@m15 | 30 | 16 (53 %) | 157 | 69 % | 1.25 | 76.01 | tp4 sl12 tr1.6 h96 (7 · 100.66 · 16.15) |
| Signals | follow | sig-vwap-m@m15 | 13 | 13 (100 %) | 39 | 90 % | 120.95 | 63.99 | – |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 20 (67 %) | 101 | 73 % | 1.45 | 62.02 | tp5 sl15 tr2 h96 (5 · 162.43 · 9.30) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 18 (60 %) | 104 | 72 % | 1.33 | 60.80 | tp4 sl12 tr1.6 h96 (5 · 41.32 · 6.53) |
| Signals | follow | sig-cci-m@m15 | 17 | 14 (82 %) | 56 | 75 % | 2.99 | 56.13 | tp3 sl9 tr1.2 h96 (6 · 18.66 · 7.49) |
| Signals | follow | sig-volume-break-s@m15 | 21 | 21 (100 %) | 22 | 100 % | ∞ (no loss) | 54.59 | – |
| Signals | follow | sig-r-inside-m@m15 | 21 | 21 (100 %) | 21 | 100 % | ∞ (no loss) | 54.44 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 24 | 18 (75 %) | 57 | 72 % | 1.72 | 51.57 | tp3 sl9 tr1.2 h96 (5 · 0.43 · -5.72) |
| Signals | follow | sig-zscore-m@m15 | 28 | 18 (64 %) | 74 | 68 % | 1.43 | 48.92 | tp3 sl9 tr1.2 h96 (6 · 8.02 · 6.18) |
| Signals | follow | sig-williams-r-m@m15 | 24 | 18 (75 %) | 59 | 78 % | 1.62 | 41.63 | tp3 sl9 tr1.2 h96 (7 · 57.60 · 8.94) |
| Signals | follow | sig-adx-s@m15 | 19 | 16 (84 %) | 28 | 82 % | 4.10 | 40.02 | – |
| Signals | follow | sig-r-connors-s@m15 | 16 | 13 (81 %) | 20 | 80 % | 2.74 | 30.93 | – |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 17 | 16 (94 %) | 17 | 94 % | 288.56 | 28.99 | – |
| Signals | follow | sig-squeeze-m@m15 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 26.77 | – |
| Signals | follow | sig-bollinger-m@m15 | 17 | 14 (82 %) | 61 | 66 % | 1.47 | 25.63 | tp2.5 sl5 tr0 h96 (6 · 2.21 · 6.30) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 22 | 12 (55 %) | 74 | 73 % | 1.18 | 19.45 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 10.05) |
| Signals | follow | sig-bollinger-s@m15 | 17 | 14 (82 %) | 45 | 69 % | 1.27 | 15.28 | tp2.5 sl5 tr0 h96 (6 · 0.88 · -1.20) |
| Signals | follow | sig-zscore-s@m15 | 17 | 14 (82 %) | 45 | 69 % | 1.27 | 15.28 | tp2.5 sl5 tr0 h96 (6 · 0.88 · -1.20) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 11.79 | – |
| Signals | follow | sig-trix-m@m15 | 22 | 10 (45 %) | 58 | 69 % | 1.10 | 11.02 | tp3 sl9 tr1.2 h96 (5 · 0.67 · -3.02) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 23 | 13 (57 %) | 40 | 57 % | 0.89 | -7.84 | – |
| Signals | follow | sig-ema-cross-m@m15 | 15 | 7 (47 %) | 29 | 69 % | 0.84 | -8.51 | – |
| Signals | follow | sig-mfi-m@m15 | 15 | 9 (60 %) | 29 | 72 % | 0.47 | -24.64 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 8 (27 %) | 127 | 69 % | 0.91 | -28.30 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 15.10) |
| Signals | follow | sig-s2-st-trail-s@m15 | 28 | 15 (54 %) | 74 | 65 % | 0.83 | -31.21 | tp2.5 sl3.75 tr0 h96 (5 · 0.87 · -1.00) |
| Signals | follow | sig-ema-slope-m@m15 | 23 | 10 (43 %) | 44 | 68 % | 0.65 | -33.58 | – |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 29 | 15 (52 %) | 91 | 60 % | 0.83 | -37.28 | tp4 sl12 tr1.6 h96 (5 · 141.96 · 6.99) |
| Signals | follow | sig-ema-cross-s@m15 | 21 | 8 (38 %) | 48 | 65 % | 0.51 | -53.23 | tp2.5 sl3.75 tr0 h96 (6 · 0.58 · -4.95) |
| Signals | follow | sig-ema-pullback-m@m15 | 10 | 5 (50 %) | 23 | 35 % | 0.18 | -53.57 | tp2.5 sl3.75 tr0 h96 (5 · 0.15 · -13.50) |
| Signals | follow | sig-rsi-reversal-s@m15 | 16 | 6 (38 %) | 23 | 43 % | 0.11 | -66.45 | – |
| Signals | follow | sig-williams-r-s@m15 | 20 | 7 (35 %) | 52 | 48 % | 0.37 | -110.07 | tp2.5 sl3.75 tr0 h96 (8 · 0.35 · -12.85) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 18 | 5 (28 %) | 33 | 39 % | 0.12 | -111.29 | tp2.5 sl3.75 tr0 h96 (6 · 0.12 · -17.45) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 12 (40 %) | 229 | 64 % | 0.75 | -145.09 | tp6 sl18 tr2.4 h96 (6 · 300.31 · 12.26) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 4.000% | sl 3.00× | tr off | 112 | 110 (98 %) | 572 | 98 % | 13.39 | 1965.60 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 115 | 113 (98 %) | 634 | 92 % | 17.21 | 1858.20 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 90 | 89 (99 %) | 256 | 95 % | 560.07 | 1855.29 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 104 | 103 (99 %) | 430 | 94 % | 188.50 | 1832.97 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 121 | 118 (98 %) | 720 | 93 % | 17.09 | 1824.05 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 120 | 118 (98 %) | 616 | 92 % | 46.93 | 1818.09 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 122 | 120 (98 %) | 950 | 84 % | 11.72 | 1730.46 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 108 | 107 (99 %) | 562 | 94 % | 15.26 | 1726.62 |
| Signals | tp 6.000% | sl 3.00× | tr off | 96 | 96 (100 %) | 297 | 100 % | ∞ (no loss) | 1722.60 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 122 | 120 (98 %) | 762 | 89 % | 11.20 | 1721.77 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 89 | 86 (97 %) | 267 | 96 % | 1129.19 | 1689.12 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 103 | 96 (93 %) | 456 | 96 % | 9.40 | 1669.37 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 96 | 94 (98 %) | 339 | 93 % | 41.50 | 1646.10 |
| Signals | tp 5.000% | sl 3.00× | tr off | 96 | 93 (97 %) | 418 | 94 % | 5.18 | 1526.40 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 104 | 100 (96 %) | 420 | 93 % | 68.01 | 1497.85 |
| Signals | tp 6.000% | sl 2.00× | tr off | 96 | 95 (99 %) | 323 | 93 % | 5.92 | 1441.40 |
| Signals | tp 5.000% | sl 2.00× | tr off | 101 | 93 (92 %) | 428 | 90 % | 4.44 | 1439.40 |
| Signals | tp 4.000% | sl 2.00× | tr off | 116 | 91 (78 %) | 666 | 85 % | 2.59 | 1318.80 |
| Signals | tp 4.000% | sl 1.50× | tr off | 118 | 96 (81 %) | 730 | 80 % | 2.41 | 1294.00 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 100 (85 %) | 779 | 90 % | 2.77 | 1257.20 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 121 | 103 (85 %) | 846 | 87 % | 2.71 | 1189.54 |
| Signals | tp 3.000% | sl 2.00× | tr off | 121 | 94 (78 %) | 853 | 84 % | 2.40 | 1173.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 122 | 100 (82 %) | 999 | 83 % | 2.49 | 1117.46 |
| Signals | tp 2.500% | sl 3.00× | tr off | 122 | 97 (80 %) | 941 | 89 % | 2.35 | 1104.30 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 124 | 105 (85 %) | 1250 | 81 % | 2.81 | 1065.50 |
| Signals | tp 6.000% | sl 1.50× | tr off | 103 | 80 (78 %) | 413 | 78 % | 2.23 | 1030.40 |
| Signals | tp 2.500% | sl 2.00× | tr off | 122 | 96 (79 %) | 1025 | 83 % | 2.10 | 1022.50 |
| Signals | tp 5.000% | sl 1.50× | tr off | 107 | 76 (71 %) | 524 | 77 % | 2.03 | 977.70 |
| Signals | tp 3.000% | sl 1.50× | tr off | 121 | 77 (64 %) | 977 | 71 % | 1.43 | 583.10 |
| Wide | tp 0.800% | sl 1.00× | tr off | 103 | 21 (20 %) | 56 | 80 % | 3.90 | 60.69 |
| General | tp 3.600% | sl 0.50× | tr off | 16 | 9 (56 %) | 18 | 67 % | 3.40 | 28.80 |
| General | tp 3.200% | sl 0.50× | tr off | 17 | 6 (35 %) | 10 | 80 % | 6.67 | 20.40 |
| Short | tp 1.800% | sl 1.00× | tr 0.75× | 16 | 10 (63 %) | 25 | 72 % | 1.98 | 13.67 |
| Signals | tp 2.500% | sl 1.50× | tr off | 123 | 69 (56 %) | 1239 | 63 % | 1.01 | 12.20 |
| Short | tp 2.000% | sl 1.00× | tr 0.50× | 18 | 7 (39 %) | 23 | 70 % | 1.96 | 10.96 |
| Short | tp 2.000% | sl 2.00× | tr 0.50× | 19 | 6 (32 %) | 12 | 75 % | 3.17 | 9.24 |
| Short | tp 2.200% | sl 1.00× | tr 0.50× | 28 | 9 (32 %) | 39 | 51 % | 1.27 | 6.56 |
| Short | tp 2.000% | sl 1.00× | tr 0.75× | 13 | 2 (15 %) | 10 | 70 % | 1.96 | 6.34 |
| Short | tp 1.800% | sl 1.00× | tr 0.50× | 20 | 4 (20 %) | 32 | 50 % | 1.35 | 6.03 |
| Micro | tp 0.550% (net 0.350%) | sl 4.50× | tr off | 22 | 12 (55 %) | 12 | 100 % | ∞ (no loss) | 4.20 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Long | tp 6.400% | sl 1.00× | tr 0.75× | 58 | 3 (5 %) | 44 | 16 % | 0.11 | -217.37 |
| Long | tp 6.400% | sl 1.00× | tr off | 70 | 5 (7 %) | 66 | 30 % | 0.41 | -179.60 |
| Long | tp 6.400% | sl 0.75× | tr off | 56 | 8 (14 %) | 59 | 22 % | 0.35 | -149.40 |
| Short | tp 2.800% | sl 1.50× | tr off | 52 | 10 (19 %) | 62 | 32 % | 0.28 | -132.80 |
| General | tp 4.000% | sl 1.00× | tr off | 42 | 0 (0 %) | 54 | 22 % | 0.26 | -130.80 |
| Long | tp 5.600% | sl 1.00× | tr 0.75× | 34 | 1 (3 %) | 23 | 9 % | 0.09 | -111.00 |
| Long | tp 6.000% | sl 1.00× | tr 0.75× | 40 | 4 (10 %) | 28 | 21 % | 0.26 | -101.60 |
| Long | tp 6.000% | sl 1.00× | tr off | 43 | 4 (9 %) | 35 | 29 % | 0.37 | -97.00 |
| Short | tp 2.600% | sl 1.00× | tr off | 36 | 3 (8 %) | 51 | 18 % | 0.18 | -96.00 |
| Long | tp 5.600% | sl 0.75× | tr off | 48 | 7 (15 %) | 48 | 25 % | 0.41 | -93.60 |
| General | tp 3.200% | sl 1.00× | tr off | 28 | 0 (0 %) | 33 | 9 % | 0.09 | -93.00 |
| Long | tp 5.200% | sl 1.00× | tr 0.75× | 28 | 1 (4 %) | 20 | 10 % | 0.06 | -90.99 |
| General | tp 4.400% | sl 0.75× | tr off | 47 | 5 (11 %) | 78 | 31 % | 0.53 | -88.20 |
| Long | tp 6.000% | sl 0.75× | tr off | 37 | 4 (11 %) | 32 | 19 % | 0.28 | -87.40 |
| Long | tp 5.200% | sl 1.00× | tr off | 49 | 2 (4 %) | 56 | 38 % | 0.56 | -84.00 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 43 (43) | 21240 | 8584 | 8584 | 0 | baseTarget 12656 |
| Micro | trailing | 43 (43) | 42480 | 17168 | 17168 | 0 | baseTarget 25312 |
| Short | normal | 254 (206) | 38628 | 11640 | 11640 | 0 | baseTarget 8448 · baseRange 18540 |
| Short | trailing | 254 (206) | 77256 | 23280 | 23280 | 0 | baseTarget 16896 · baseRange 37080 |
| General | normal | 254 (194) | 25752 | 8364 | 8364 | 0 | baseTarget 4284 · baseRange 13104 |
| General | trailing | 254 (194) | 17168 | 5576 | 5576 | 0 | baseTarget 2856 · baseRange 8736 |
| Long | normal | 254 (225) | 32190 | 13320 | 13320 | 0 | baseTarget 6390 · baseRange 12480 |
| Long | trailing | 254 (225) | 21460 | 8880 | 8880 | 0 | baseTarget 4260 · baseRange 8320 |
| Wide | axis | 297 (297) | 52515 | 52515 | 52515 | 0 | – |
| Wide | dca | 297 (297) | 4668 | 4668 | 4668 | 0 | – |
| Wide | dca-active | 297 (297) | 4668 | 4668 | 4668 | 0 | – |

Engine indications Base evaluated that built no set: 94 (bb-bounce-20-3, ema-21-55, ha-3, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-10, mc-brk-20, mc-burst-2, mc-burst-3, mc-engulf-20, mc-ivwapd-2, mc-iz-25, mc-macdh, mc-mturn-5, mc-qrsi2-5, mc-rsi14-30, mc-rsi2-10, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-20, mc-rsi4-25, mc-rsi4-30, mc-rsi5-20, mc-rsi5-25, mc-rsi5-30, mc-rsi7-25, mc-rsi7-30, mc-rsi9-30, mc-rsidiv-14, mc-rsit14-25, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.05 (66) | 0.11 (134) | 0.10 (186) | 0.26 (282) | 0.34 (432) |
| 1.14× | – | 0.03 (24) | – | – | – | – | – |
| 1.25× | – | 0.02 (24) | 0.04 (66) | 0.09 (134) | 0.10 (186) | 0.24 (282) | 0.38 (426) |
| 1.33× | 0.18 (6) | – | – | – | – | – | – |
| 1.5× | 0.18 (6) | 0.02 (24) | 0.04 (66) | 0.08 (134) | 0.11 (180) | 0.22 (284) | 0.39 (426) |
| 1.75× | 0.18 (6) | 0.02 (24) | 0.03 (66) | 0.07 (134) | 0.14 (180) | 0.28 (284) | 0.35 (426) |
| 2× | 0.18 (6) | 0.02 (24) | 0.03 (66) | 0.08 (134) | 0.14 (180) | 0.26 (280) | 0.35 (420) |
| 2.25× | 0.18 (6) | 0.02 (24) | 0.03 (66) | 0.07 (134) | 0.14 (174) | 0.27 (280) | 0.33 (420) |
| 2.5× | 0.18 (6) | 0.01 (24) | 0.03 (66) | 0.07 (128) | 0.19 (176) | 0.27 (282) | 0.35 (420) |
| 2.75× | 0.18 (6) | 0.01 (24) | 0.02 (66) | 0.08 (128) | 0.21 (178) | 0.25 (282) | 0.33 (418) |
| 3× | 0.18 (6) | 0.01 (24) | 0.02 (66) | 0.08 (128) | 0.19 (176) | 0.24 (276) | 0.30 (418) |
| 3.25× | 0.18 (6) | 0.01 (24) | 0.02 (66) | 0.09 (128) | 0.18 (174) | 0.22 (274) | 0.28 (418) |
| 3.5× | 0.18 (6) | 0.01 (24) | 0.02 (66) | 0.08 (128) | 0.17 (174) | 0.21 (272) | 0.30 (400) |
| 3.75× | 0.18 (6) | 0.02 (30) | 0.02 (66) | 0.08 (128) | 0.16 (174) | 0.20 (266) | 0.41 (400) |
| 4× | 0.18 (6) | 0.02 (30) | 0.02 (66) | 0.08 (128) | 0.15 (174) | 0.34 (270) | 0.39 (400) |
| 4.25× | 0.24 (10) | 0.02 (30) | 0.02 (66) | 0.07 (128) | 0.15 (176) | 0.32 (270) | 0.39 (396) |
| 4.5× | 0.24 (10) | 0.02 (30) | 0.02 (66) | 0.07 (128) | 0.22 (176) | 0.30 (270) | 0.59 (360) |
| 4.75× | 0.24 (10) | 0.02 (30) | 0.02 (66) | 0.07 (128) | 0.21 (176) | 0.29 (272) | 0.57 (360) |
| 5× | 0.24 (10) | 0.02 (30) | 0.02 (66) | 0.12 (128) | 0.20 (176) | 0.54 (236) | 0.95 (360) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | – | 0.00 (3) |
| 2× | – | – | – | – | – | – | 0.00 (2) |
| 2.25× | – | – | – | – | – | 0.00 (2) | 0.00 (4) |
| 2.5× | – | – | – | – | ∞ (2) | – | 0.00 (2) |
| 2.75× | – | – | – | ∞ (2) | – | 0.00 (6) | 0.00 (6) |
| 3× | – | – | – | ∞ (2) | ∞ (2) | 0.00 (4) | 0.00 (14) |
| 3.25× | – | – | – | ∞ (2) | – | 0.22 (29) | 0.00 (16) |
| 3.5× | – | – | – | – | 0.00 (4) | 0.16 (32) | 0.00 (18) |
| 3.75× | – | – | – | 0.00 (12) | 0.23 (26) | 0.07 (26) | 0.32 (20) |
| 4× | – | – | – | 0.00 (14) | 0.14 (16) | 0.53 (28) | 0.52 (20) |
| 4.25× | – | – | 0.00 (4) | 0.00 (13) | 0.00 (10) | 0.60 (24) | 1.06 (36) |
| 4.5× | – | – | 0.00 (4) | 0.00 (14) | 0.80 (18) | 0.63 (26) | 1.01 (36) |
| 4.75× | – | – | 0.00 (4) | 0.02 (16) | 0.76 (18) | 0.60 (26) | 0.19 (36) |
| 5× | – | 0.00 (4) | 0.00 (4) | ∞ (18) | 0.73 (18) | 0.35 (34) | 0.98 (44) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | – |
| 2.25× | – | – | – | – | – | – | – |
| 2.5× | – | – | – | – | – | – | 0.00 (1) |
| 2.75× | – | – | – | – | – | – | – |
| 3× | – | – | – | – | – | – | – |
| 3.25× | – | – | – | – | – | – | 0.00 (2) |
| 3.5× | – | – | – | – | – | – | 0.00 (1) |
| 3.75× | – | – | – | – | – | – | – |
| 4× | – | – | – | – | – | – | ∞ (1) |
| 4.25× | – | – | – | – | – | – | ∞ (1) |
| 4.5× | – | – | – | – | – | – | ∞ (1) |
| 4.75× | – | – | – | – | – | – | – |
| 5× | – | – | – | – | – | – | 5.33 (6) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.68 (4362) | 0.68 (3984) | 0.68 (3872) | 0.75 (4195) | 0.71 (4473) | 0.72 (4139) |
| 1.5× | 0.85 (3858) | 0.83 (3498) | 0.77 (3249) | 0.79 (3557) | 0.75 (3781) | 0.71 (3535) |
| 2× | 0.94 (3511) | 0.92 (3160) | 0.86 (2906) | 0.89 (3225) | 0.90 (3337) | 0.84 (3115) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.41 (72) | 1.31 (68) | 0.92 (95) | 0.58 (103) | 0.44 (122) | 0.47 (153) |
| 1.5× | 0.65 (33) | 0.44 (44) | 0.59 (77) | 0.44 (93) | 0.53 (120) | 0.52 (192) |
| 2× | 0.89 (25) | 0.68 (58) | 0.77 (99) | 0.72 (165) | 0.75 (151) | 0.86 (161) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.00 (5) | 0.00 (6) | 0.00 (3) | 0.00 (11) | 0.00 (16) | 0.00 (21) |
| 1.5× | 0.32 (10) | 0.63 (17) | 0.04 (10) | 0.00 (9) | 0.00 (4) | 0.05 (13) |
| 2× | 1.63 (10) | 0.51 (11) | ∞ (1) | 0.00 (3) | 0.00 (3) | 0.00 (7) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.81 (1359) | 0.93 (1393) | 0.82 (1244) | 0.71 (1431) |
| 0.75× | 0.82 (1166) | 1.00 (1155) | 0.86 (1018) | 0.71 (1165) |
| 1× | 0.74 (3148) | 0.91 (3091) | 0.84 (2524) | 0.70 (3032) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 6.67 (10) | 3.40 (18) | 1.04 (24) | 0.82 (22) |
| 0.75× | 0.53 (60) | 0.19 (29) | 0.34 (45) | 0.53 (78) |
| 1× | 0.47 (92) | 0.55 (116) | 0.37 (112) | 0.74 (177) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | – | – | – | 0.00 (3) |
| 0.75× | 0.00 (10) | 0.00 (7) | 0.00 (8) | 0.17 (24) |
| 1× | 0.00 (17) | 0.11 (16) | 0.00 (6) | 0.91 (12) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.59 (1086) | 0.46 (1121) | 0.46 (1038) | 0.44 (1064) | 0.45 (1189) |
| 0.75× | 0.58 (854) | 0.47 (847) | 0.45 (802) | 0.45 (833) | 0.45 (963) |
| 1× | 0.63 (2287) | 0.46 (2296) | 0.48 (2123) | 0.43 (2218) | 0.38 (2626) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.83 (22) | 0.69 (25) | 0.13 (15) | 0.00 (14) | 0.12 (16) |
| 0.75× | 0.71 (46) | 0.63 (50) | 0.41 (48) | 0.28 (32) | 0.35 (59) |
| 1× | 0.55 (103) | 0.39 (96) | 0.38 (87) | 0.40 (90) | 0.29 (154) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (3) | 0.00 (2) | 0.00 (3) | 0.00 (3) | 0.00 (4) |
| 0.75× | 0.61 (15) | 0.35 (9) | 0.00 (7) | 0.00 (5) | 0.00 (7) |
| 1× | 0.31 (8) | 0.00 (5) | 0.46 (4) | 0.16 (7) | 0.10 (14) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.57 (2345) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.77 (131) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.98 (17451) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 1.00 (127) | 1.28 (719) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 1.11 (120) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.83 (637) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.86 (599) | – | – | – | – |
| 1× | – | – | – | 0.76 (65096) | – | – | – | 0.40 (19928) | 0.58 (2357) | – | 0.45 (801) | – | 0.72 (2102) | 0.71 (1867) | 0.53 (594) | 0.71 (405) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.68 (155) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 1.02 (53) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 3.90 (56) | – | – | – | 0.50 (64) | – | – | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
