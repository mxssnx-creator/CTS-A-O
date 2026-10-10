# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.40–$0.80 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T00:00 → 2026-10-07T06:00 UTC. Engine: Base 1142/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 302/19072 · PF 1.54 · Micro 73/5900 · PF 3.46 · Short 490/8176 · PF 1.48 · General 428/8176 · PF 1.47 · Long 498/8176 · PF 1.42 · Signals 126/126; Main 1068 pairs, 152974 tapes, Real seats: 5301 engine configs + 3780 signal configs (every config of the active signals), compute 241 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $22.94 (14.68 %, closed orders) · equity at end $20.29 (open at end: 40 positions / 2542 orders, MTM -$2.64 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 2.31 (gross profit $ ÷ gross loss $ as sized) · PF unit 3.35 (every order at one unit: the engine's PF) · 51 positions / 2713 orders (incl. 34 capped to $0) · WR 82.42 % · DDT (closed trades, $) 1.50 h · DDR 0.12 · equity max drawdown $1.81 (8.33 %) · margin used max $16.22 · open avg 19.67 pos / 630.63 orders (peak 31 / 1101)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 34 orders capped to $0, 2484 scaled down (open at end: 35 capped, 2465 scaled) · binding: position cap 3473, gross cap 4594. **Without the caps:** balance $20.00 → $41.00 (104.99 %) · PF $ 3.56 · equity at end $30.69 · equity max drawdown $10.48 (27.14 %) · margin used max $157.95 · infeasible: margin exceeded equity for 301 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 422 | 967  | 3.9 % | 1.542 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 422 | 967 (+0) | 3.9 % | 1.542 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 422 | 966 (-1) | 3.9 % | 1.542 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 372 | 845 (-122) | 3.4 % | 1.579 |
| closes ≥ 6 | 1.00 | 6 | 1 | 645 | 1317 (+350) | 5.3 % | 1.835 |
| closes ≥ 20 | 1.00 | 20 | 1 | 321 | 742 (-225) | 3.0 % | 1.424 |
| closes ≥ 30 | 1.00 | 30 | 1 | 258 | 615 (-352) | 2.5 % | 1.355 |
| DDR off | 1.00 | 12 | off | 1572 | 2400 (+1433) | 9.6 % | 1.136 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 782 | 1418 (+451) | 5.7 % | 1.315 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 169 | 436 (-531) | 1.7 % | 1.954 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1572 | 2400 (+1433) | 9.6 % | 1.136 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1990 | 2917 (+1950) | 11.7 % | 1.175 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 1 / 12 | 4 / 8 | 0.11 | 0.11 | 33 % | -$0.18 | $19.82 | $19.47 | $19.06 | 4.71 % | 1.00 | $12.54 | 14 / 516 |
| 01:00 | 2 / 218 | 170 / 48 | 5.62 | 4.39 | 78 % | $1.11 | $20.93 | $20.68 | $18.85 | 5.74 % | 0.02 | $14.65 | 25 / 1136 |
| 02:00 | 6 / 805 | 666 / 139 | 2.43 | 3.14 | 83 % | $1.42 | $22.35 | $20.69 | $20.36 | 6.29 % | 0.97 | $15.65 | 40 / 2087 |
| 03:00 | 3 / 356 | 285 / 71 | 1.61 | 3.54 | 80 % | $0.13 | $22.48 | $20.41 | $20.10 | 7.49 % | 1.97 | $15.76 | 41 / 2463 |
| 04:00 | 1 / 837 | 742 / 95 | 8.93 | 6.67 | 89 % | $0.51 | $22.99 | $21.33 | $20.31 | 7.49 % | 2.97 | $16.09 | 40 / 2567 |
| 05:00 | 1 / 485 | 369 / 116 | 0.89 | 1.91 | 76 % | -$0.05 | $22.94 | $20.29 | $19.91 | 8.33 % | 3.97 | $16.22 | 40 / 2542 |

**Last hour (05:00):** open at end: 40 positions / 2542 orders, MTM -$2.64 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $20.29 = balance $22.94 + MTM -$2.64.

**Hours positive:** 4 of 6 full hours · flat 0 · negative 2

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 00:00 | – | 3 · ∞ (no loss) · $0.00 | 8 · 0.00 · -$0.20 | 1 · ∞ (no loss) · $0.02 | – |
| 01:00 | – | – | 178 · 5.20 · $0.97 | 14 · 0.19 · -$0.01 | 26 · 10623.81 · $0.15 |
| 02:00 | 3 · – · $0.00 | – | 654 · 3.50 · $1.62 | 91 · 0.27 · -$0.21 | 57 · 1.08 · $0.01 |
| 03:00 | 3 · ∞ (no loss) · $0.00 | 3 · – · $0.00 | 248 · 1.94 · $0.15 | 30 · 0.12 · -$0.05 | 72 · 103.76 · $0.02 |
| 04:00 | – | – | 647 · 7.81 · $0.43 | 59 · ∞ (no loss) · $0.05 | 131 · 464.63 · $0.02 |
| 05:00 | 3 · – · $0.00 | – | 340 · 0.92 · -$0.04 | 117 · 0.52 · -$0.02 | 25 · 5.08 · $0.01 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 12 | 4 · ∞ (no loss) · 100 % · $0.02 | – | 8 · 0.00 · 0 % · -$0.20 | – | – | 8 · 0.00 · 0 % · -$0.20 |
| 01:00 | 218 | 20 · 2.27 · 55 % · $0.04 | 31 · 5.31 · 65 % · $0.07 | 82 · 2.99 · 82 % · $0.36 | 85 · 42.19 · 85 % · $0.65 | – | 167 · 6.15 · 83 % · $1.00 |
| 02:00 | 805 | 82 · 0.38 · 71 % · -$0.13 | 160 · 0.96 · 79 % · -$0.01 | 270 · 1.75 · 76 % · $0.38 | 293 · 10.20 · 94 % · $1.18 | – | 563 · 3.46 · 85 % · $1.56 |
| 03:00 | 356 | 56 · 1.60 · 88 % · $0.02 | 184 · 3.08 · 80 % · $0.04 | 60 · 0.98 · 72 % · -$0.00 | 56 · 83.47 · 82 % · $0.08 | – | 116 · 1.45 · 77 % · $0.07 |
| 04:00 | 837 | 141 · 2.15 · 82 % · $0.02 | 384 · 2.66 · 83 % · $0.05 | 181 · 21.10 · 98 % · $0.26 | 131 · ∞ (no loss) · 100 % · $0.17 | – | 312 · 34.58 · 99 % · $0.43 |
| 05:00 | 485 | 72 · 1.06 · 85 % · $0.00 | 152 · 0.65 · 69 % · -$0.02 | 108 · 0.54 · 65 % · -$0.18 | 153 · 3.19 · 87 % · $0.14 | – | 261 · 0.91 · 78 % · -$0.04 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1016 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (152974 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (8841); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 11892 · 1.45 | 1870 · 2.97 | 2176 · 2.96 | 635 · 5.01 | 12 · 0.11 | 4 · ∞ (no loss) | – | – | 8 · 0.00 |
| 01:00 | 40775 · 0.77 | 8644 · 0.98 | 10699 · 1.01 | 2191 · 0.96 | 218 · 4.39 | 20 · 0.83 | 31 · 1.51 | – | 167 · 6.46 |
| 02:00 | 84823 · 0.99 | 22342 · 0.99 | 31065 · 1.33 | 8703 · 1.41 | 805 · 3.14 | 82 · 1.21 | 160 · 3.18 | – | 563 · 3.52 |
| 03:00 | 47307 · 1.90 | 10750 · 1.94 | 15116 · 2.30 | 3648 · 8.42 | 356 · 3.54 | 56 · 6.72 | 184 · 7.28 | – | 116 · 1.97 |
| 04:00 | 41842 · 1.51 | 9778 · 1.62 | 14115 · 2.57 | 3617 · 8.31 | 837 · 6.67 | 141 · 3.16 | 384 · 3.26 | – | 312 · 56.71 |
| 05:00 | 46354 · 0.93 | 12509 · 1.13 | 13216 · 1.32 | 4680 · 1.58 | 485 · 1.91 | 72 · 3.39 | 152 · 1.22 | – | 261 · 2.08 |
| **total** | **272993 · 1.11** | **65893 · 1.22** | **86387 · 1.53** | **23474 · 1.93** | **2713 · 3.35** | **375 · 2.56** | **911 · 2.56** | **–** | **1427 · 3.90** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 375 | 299 / 76 | 0.91 | 2.56 | -$0.03 | 79.73 % | 4.50 |
| Trailing | 911 | 717 / 194 | 1.52 | 2.56 | $0.14 | 78.70 % | 1.00 |
| Signal · Normal | 709 | 562 / 147 | 1.42 | 2.13 | $0.61 | 79.27 % | 2.75 |
| Signal · Trailing | 718 | 658 / 60 | 11.59 | 16.25 | $2.22 | 91.64 % | 0.50 |
| total | 2713 | 2236 / 477 | 2.31 | 3.35 | $2.94 | 82.42 % | 1.50 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 1427 | 1220 / 207 | 2.70 | 3.90 | $2.83 | 85.49 % | 1.75 |
| of which Engine (no signals) | 1286 | 1016 / 270 | 1.19 | 2.56 | $0.11 | 79.00 % | 4.50 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 9 | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 5m+ | 6 | ∞ (no loss) | 0.06 | $0.00 |
| 15m | 2075 | 2.65 | 3.48 | $2.94 |
| 15m+ | 312 | 0.45 | 1.09 | -$0.21 |
| 30m | 311 | 4.08 | 22.04 | $0.21 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 18 | 15 / 3 | ∞ (no loss) | 0.58 | $0.00 | 83.33 % | 0.00 |
| Short | 1148 | 917 / 231 | 1.75 | 2.77 | $0.28 | 79.88 % | 1.50 |
| General | 21 | 21 / 0 | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| Long | 99 | 63 / 36 | 0.16 | 1.37 | -$0.17 | 63.64 % | 5.00 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 1427 | 1220 / 207 | 2.70 | 3.90 | $2.83 | 85.49 % | 1.75 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 39994 | sig:confirm 14260 · sig:duplicate 10087 · sig:signalPf 6350 · sig:signalSide 5046 · sig:signalCluster 4251 |
| Short | 3073 | lastN 2319 · symPf 501 · engineSide 192 · duplicate 61 |
| Long | 1225 | lastN 857 · engineSide 242 · symPf 110 · duplicate 16 |
| General | 865 | lastN 520 · engineSide 248 · symPf 96 · duplicate 1 |
| Micro | 546 | crowd 255 · engineSide 225 · lastN 66 |
| Wide | 368 | lastN 169 · engineSide 151 · symPf 48 |

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
| Micro | 3.46 | 0.58 | 0.17 | – | – | 18 |
| Short | 1.48 | 2.77 | 1.87 | 1.75 | 0.63 | 1148 |
| General | 1.47 | – | – | – | – | 21 |
| Long | 1.42 | 1.37 | 0.97 | 0.16 | 0.11 | 99 |
| Wide | 1.54 | – | – | – | – | 0 |
| Signals | – | 3.90 | – | 2.70 | 0.69 | 1427 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (5758 of 125320 evaluated, 149194 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2874 units active at the run start, 3818 over the run, 3083 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 730 | 198 (27 %) | 208 | 99 % | 30.34 | 60.15 |
| Micro | trailing | 920 | 257 (28 %) | 355 | 89 % | 1.45 | 34.28 |
| Short | normal | 681 | 347 (51 %) | 1046 | 81 % | 2.57 | 1090.90 |
| Short | trailing | 1476 | 696 (47 %) | 2313 | 76 % | 2.18 | 1467.82 |
| General | normal | 317 | 105 (33 %) | 205 | 62 % | 2.07 | 242.10 |
| General | trailing | 292 | 119 (41 %) | 251 | 74 % | 2.57 | 292.91 |
| Long | normal | 676 | 132 (20 %) | 344 | 48 % | 1.20 | 147.30 |
| Long | trailing | 401 | 128 (32 %) | 246 | 82 % | 3.45 | 454.75 |
| Wide | axis | 265 | 94 (35 %) | 418 | 48 % | 1.02 | 5.64 |
| Signals | normal | 1567 | 983 (63 %) | 9185 | 73 % | 1.36 | 5778.25 |
| Signals | trailing | 1516 | 1295 (85 %) | 8903 | 83 % | 3.36 | 14091.46 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1650 | 455 (28 %) | 563 | 93 % | 2.22 | 94.43 |
| Short | active | 66 | 62 (94 %) | 124 | 100 % | ∞ (no loss) | 265.85 |
| Short | bollinger | 49 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | break | 280 | 212 (76 %) | 942 | 79 % | 3.10 | 891.91 |
| Short | channel | 43 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | direction | 153 | 3 (2 %) | 12 | 83 % | 3.74 | 10.31 |
| Short | ema | 77 | 39 (51 %) | 65 | 60 % | 0.29 | -45.87 |
| Short | macd | 49 | 12 (24 %) | 125 | 43 % | 0.56 | -91.72 |
| Short | move | 315 | 182 (58 %) | 312 | 85 % | 7.36 | 331.33 |
| Short | osc | 692 | 263 (38 %) | 760 | 74 % | 1.61 | 350.48 |
| Short | rsi | 107 | 9 (8 %) | 12 | 83 % | 5.30 | 16.48 |
| Short | sar | 8 | 0 (0 %) | 6 | 0 % | 0.00 | -18.20 |
| Short | smooth | 53 | 53 (100 %) | 53 | 100 % | ∞ (no loss) | 112.20 |
| Short | trend | 166 | 132 (80 %) | 686 | 79 % | 2.29 | 529.07 |
| Short | volume | 99 | 76 (77 %) | 262 | 77 % | 2.20 | 206.88 |
| General | active | 15 | 15 (100 %) | 30 | 100 % | ∞ (no loss) | 107.60 |
| General | bollinger | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 37 | 15 (41 %) | 55 | 62 % | 1.56 | 28.96 |
| General | channel | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 63 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | ema | 57 | 2 (4 %) | 28 | 7 % | 0.00 | -73.18 |
| General | macd | 7 | 0 (0 %) | 12 | 25 % | 0.25 | -24.42 |
| General | move | 70 | 22 (31 %) | 34 | 68 % | 3.46 | 41.95 |
| General | osc | 148 | 84 (57 %) | 141 | 69 % | 2.29 | 175.68 |
| General | rsi | 40 | 2 (5 %) | 3 | 100 % | ∞ (no loss) | 8.93 |
| General | smooth | 55 | 45 (82 %) | 45 | 100 % | ∞ (no loss) | 166.60 |
| General | trend | 70 | 33 (47 %) | 90 | 73 % | 2.45 | 106.78 |
| General | volume | 14 | 6 (43 %) | 18 | 56 % | 0.86 | -3.88 |
| Long | active | 37 | 18 (49 %) | 49 | 71 % | 2.52 | 101.87 |
| Long | bollinger | 12 | 0 (0 %) | 7 | 43 % | 0.25 | -19.85 |
| Long | break | 127 | 28 (22 %) | 119 | 39 % | 0.63 | -105.52 |
| Long | channel | 85 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 84 | 4 (5 %) | 11 | 64 % | 1.98 | 19.49 |
| Long | ema | 71 | 0 (0 %) | 30 | 10 % | 0.12 | -94.69 |
| Long | ichimoku | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | macd | 40 | 5 (13 %) | 7 | 71 % | 1.64 | 4.83 |
| Long | move | 144 | 39 (27 %) | 82 | 72 % | 2.45 | 136.87 |
| Long | osc | 186 | 100 (54 %) | 152 | 70 % | 2.62 | 314.67 |
| Long | rsi | 47 | 12 (26 %) | 15 | 87 % | 9.20 | 59.02 |
| Long | smooth | 119 | 26 (22 %) | 26 | 100 % | ∞ (no loss) | 99.04 |
| Long | trend | 87 | 24 (28 %) | 88 | 66 % | 1.59 | 62.33 |
| Long | volume | 31 | 4 (13 %) | 4 | 100 % | ∞ (no loss) | 24.00 |
| Wide | active | 35 | 9 (26 %) | 20 | 90 % | 14.62 | 20.02 |
| Wide | break | 31 | 0 (0 %) | 42 | 14 % | 0.05 | -35.84 |
| Wide | channel | 15 | 3 (20 %) | 12 | 50 % | 1.14 | 1.14 |
| Wide | ichimoku | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 |
| Wide | macd | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 3.14 |
| Wide | move | 76 | 52 (68 %) | 218 | 48 % | 0.93 | -9.49 |
| Wide | osc | 36 | 0 (0 %) | 9 | 0 % | 0.00 | -9.15 |
| Wide | rsi | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -3.10 |
| Wide | sar | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 8.16 |
| Wide | smooth | 12 | 12 (100 %) | 60 | 55 % | 3.30 | 39.06 |
| Wide | trend | 18 | 3 (17 %) | 3 | 100 % | ∞ (no loss) | 4.80 |
| Wide | volume | 18 | 0 (0 %) | 30 | 50 % | 0.53 | -8.91 |
| Signals | signal:act-burst | 60 | 55 (92 %) | 539 | 82 % | 2.75 | 793.95 |
| Signals | signal:act-hf | 55 | 25 (45 %) | 377 | 68 % | 0.89 | -84.10 |
| Signals | signal:adx | 60 | 57 (95 %) | 275 | 91 % | 8.25 | 693.63 |
| Signals | signal:atr-break | 59 | 54 (92 %) | 491 | 79 % | 2.37 | 650.18 |
| Signals | signal:bollinger | 60 | 52 (87 %) | 332 | 76 % | 2.67 | 524.80 |
| Signals | signal:cci | 57 | 43 (75 %) | 422 | 75 % | 1.88 | 412.34 |
| Signals | signal:cmf | 58 | 25 (43 %) | 311 | 68 % | 1.03 | 21.17 |
| Signals | signal:donchian | 55 | 37 (67 %) | 274 | 77 % | 1.76 | 250.77 |
| Signals | signal:ema-cross | 45 | 27 (60 %) | 158 | 72 % | 1.06 | 18.51 |
| Signals | signal:ema-cross-fast | 60 | 46 (77 %) | 336 | 83 % | 2.49 | 547.88 |
| Signals | signal:ema-pullback | 59 | 44 (75 %) | 461 | 74 % | 1.74 | 444.92 |
| Signals | signal:ema-slope | 57 | 47 (82 %) | 276 | 79 % | 1.90 | 316.89 |
| Signals | signal:ema-trend | 60 | 45 (75 %) | 390 | 75 % | 2.00 | 517.43 |
| Signals | signal:heikin-ashi | 60 | 52 (87 %) | 645 | 84 % | 3.28 | 1069.37 |
| Signals | signal:hma | 56 | 42 (75 %) | 383 | 76 % | 1.43 | 240.28 |
| Signals | signal:ichimoku | 46 | 24 (52 %) | 155 | 68 % | 0.81 | -57.03 |
| Signals | signal:impulse | 59 | 40 (68 %) | 401 | 76 % | 1.62 | 348.60 |
| Signals | signal:kama | 59 | 58 (98 %) | 463 | 87 % | 3.96 | 898.49 |
| Signals | signal:keltner | 51 | 24 (47 %) | 186 | 71 % | 1.05 | 14.75 |
| Signals | signal:macd-cross | 59 | 51 (86 %) | 422 | 81 % | 2.45 | 615.00 |
| Signals | signal:macd-hist | 60 | 56 (93 %) | 579 | 82 % | 3.19 | 1043.90 |
| Signals | signal:macd-slow | 59 | 54 (92 %) | 472 | 83 % | 2.75 | 777.07 |
| Signals | signal:obv | 60 | 59 (98 %) | 574 | 88 % | 7.32 | 1336.44 |
| Signals | signal:r-awesome | 51 | 26 (51 %) | 235 | 73 % | 1.13 | 51.65 |
| Signals | signal:r-connors | 55 | 49 (89 %) | 149 | 80 % | 3.38 | 247.75 |
| Signals | signal:r-fractal | 45 | 11 (24 %) | 150 | 63 % | 0.59 | -160.18 |
| Signals | signal:r-inside | 42 | 8 (19 %) | 67 | 46 % | 0.22 | -247.25 |
| Signals | signal:r-linreg | 58 | 46 (79 %) | 370 | 75 % | 1.80 | 365.44 |
| Signals | signal:r-nr-break | 54 | 43 (80 %) | 256 | 77 % | 1.57 | 184.32 |
| Signals | signal:r-session-trend | 56 | 19 (34 %) | 250 | 60 % | 0.60 | -259.73 |
| Signals | signal:r-vol-regime | 35 | 17 (49 %) | 61 | 56 % | 0.61 | -56.43 |
| Signals | signal:reclaim | 60 | 57 (95 %) | 606 | 84 % | 3.67 | 1225.79 |
| Signals | signal:rsi-mid | 58 | 46 (79 %) | 440 | 79 % | 1.85 | 497.12 |
| Signals | signal:rsi-reversal | 15 | 8 (53 %) | 23 | 39 % | 0.53 | -10.79 |
| Signals | signal:s2-active-hf | 60 | 45 (75 %) | 685 | 73 % | 1.55 | 546.35 |
| Signals | signal:s2-adx-gate | 60 | 44 (73 %) | 395 | 77 % | 1.80 | 411.85 |
| Signals | signal:s2-atr-break | 40 | 24 (60 %) | 177 | 68 % | 0.85 | -41.95 |
| Signals | signal:s2-bb-bounce | 56 | 47 (84 %) | 175 | 83 % | 3.58 | 407.44 |
| Signals | signal:s2-block-scale | 53 | 24 (45 %) | 426 | 66 % | 0.86 | -133.35 |
| Signals | signal:s2-block-stack | 43 | 6 (14 %) | 166 | 43 % | 0.26 | -501.87 |
| Signals | signal:s2-confluence | 59 | 50 (85 %) | 420 | 79 % | 2.43 | 560.92 |
| Signals | signal:s2-ema-cross | 26 | 25 (96 %) | 35 | 89 % | 16.48 | 71.96 |
| Signals | signal:s2-range-break | 35 | 28 (80 %) | 65 | 69 % | 1.48 | 29.90 |
| Signals | signal:s2-range-shift | 45 | 18 (40 %) | 171 | 64 % | 0.60 | -148.72 |
| Signals | signal:s2-rsi-revert | 57 | 57 (100 %) | 128 | 92 % | 71.26 | 393.18 |
| Signals | signal:s2-st-trail | 43 | 38 (88 %) | 191 | 87 % | 5.68 | 412.88 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 198 | 91 % | 19.95 | 635.46 |
| Signals | signal:s2-vol-break | 49 | 36 (73 %) | 103 | 70 % | 1.98 | 120.44 |
| Signals | signal:s2-vwap-axis | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.11 |
| Signals | signal:sar | 56 | 38 (68 %) | 452 | 78 % | 1.43 | 299.80 |
| Signals | signal:squeeze | 16 | 2 (13 %) | 25 | 24 % | 0.05 | -113.41 |
| Signals | signal:st-slow | 53 | 48 (91 %) | 176 | 85 % | 2.93 | 314.31 |
| Signals | signal:stoch-rsi | 54 | 47 (87 %) | 420 | 75 % | 1.96 | 432.38 |
| Signals | signal:supertrend | 46 | 41 (89 %) | 249 | 88 % | 4.77 | 535.98 |
| Signals | signal:swing | 60 | 40 (67 %) | 415 | 78 % | 1.41 | 255.51 |
| Signals | signal:thrust | 50 | 27 (54 %) | 255 | 69 % | 1.03 | 14.10 |
| Signals | signal:trix | 34 | 19 (56 %) | 94 | 66 % | 0.80 | -34.01 |
| Signals | signal:volume-break | 21 | 16 (76 %) | 34 | 74 % | 3.65 | 48.76 |
| Signals | signal:vwap | 60 | 60 (100 %) | 404 | 89 % | 4.87 | 931.53 |
| Signals | signal:williams-r | 60 | 52 (87 %) | 442 | 81 % | 3.00 | 776.15 |
| Signals | signal:zscore | 43 | 40 (93 %) | 257 | 78 % | 3.17 | 411.29 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 28712 | 23048 | 1650 | 0.92 | 4.00 | 78.75–163.33 (median 163.33) | 4272 | 9585 | 389 | 3616 | 1485 | 362 | 1419 | 4 | 266 | 0 | 0 | 0 | 5664 |  |
| Short | 32980 | 28984 | 2157 | 1.26 | 1.82 | 163.33–163.33 (median 163.33) | 2556 | 5640 | 1383 | 5843 | 3706 | 2062 | 5218 | 7 | 412 | 0 | 0 | 0 | 3996 |  |
| General | 12234 | 10754 | 609 | 1.32 | 2.19 | 163.33–163.33 (median 163.33) | 1151 | 1335 | 439 | 1842 | 1573 | 909 | 2690 | 0 | 193 | 13 | 0 | 0 | 1480 |  |
| Long | 18664 | 16814 | 1077 | 1.24 | 2.26 | 163.33–163.33 (median 163.33) | 1152 | 3213 | 993 | 3383 | 2041 | 1331 | 3278 | 0 | 300 | 46 | 0 | 0 | 1850 |  |
| Wide | 56604 | 45720 | 265 | 0.65 | 2.66 | 20.42–163.33 (median 163.33) | 10894 | 28276 | 859 | 3608 | 733 | 76 | 821 | 0 | 161 | 27 | 0 | 8544 | 2340 |  |
| Signals | 3780 | – | 2874 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2874 units (pair × symbol × direction) active at the run start, 3818 over the run; 3083 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 9572 | 2126 (22 %) | 9872 | 74 % | 0.59 | -1456.60 |
| Micro | trailing | 19140 | 4680 (24 %) | 19736 | 63 % | 0.73 | -2093.92 |
| Short | normal | 10995 | 4345 (40 %) | 16789 | 69 % | 1.46 | 7729.90 |
| Short | trailing | 21985 | 8214 (37 %) | 36227 | 66 % | 1.27 | 8232.03 |
| General | normal | 7330 | 1962 (27 %) | 8576 | 47 % | 1.15 | 1869.00 |
| General | trailing | 4904 | 1523 (31 %) | 5439 | 64 % | 1.41 | 2737.07 |
| Long | normal | 11198 | 2414 (22 %) | 10630 | 41 % | 0.92 | -2111.70 |
| Long | trailing | 7466 | 2153 (29 %) | 7546 | 62 % | 1.00 | 3.63 |
| Wide | axis | 48060 | 9369 (19 %) | 105257 | 33 % | 0.65 | -25542.20 |
| Wide | dca | 4272 | 1660 (39 %) | 8731 | 75 % | 0.97 | -322.77 |
| Wide | dca-active | 4272 | 613 (14 %) | 6725 | 28 % | 0.47 | -3517.40 |
| Signals | normal | 1890 | 1303 (69 %) | 20026 | 73 % | 1.42 | 14256.05 |
| Signals | trailing | 1890 | 1680 (89 %) | 17439 | 83 % | 3.77 | 28625.67 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1650 | 455 (28 %) | 563 | 93 % | 2.22 | 94.43 |
| Short | active | 66 | 62 (94 %) | 124 | 100 % | ∞ (no loss) | 265.85 |
| Short | bollinger | 49 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | break | 280 | 212 (76 %) | 942 | 79 % | 3.10 | 891.91 |
| Short | channel | 43 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | direction | 153 | 3 (2 %) | 12 | 83 % | 3.74 | 10.31 |
| Short | ema | 77 | 39 (51 %) | 65 | 60 % | 0.29 | -45.87 |
| Short | macd | 49 | 12 (24 %) | 125 | 43 % | 0.56 | -91.72 |
| Short | move | 315 | 182 (58 %) | 312 | 85 % | 7.36 | 331.33 |
| Short | osc | 692 | 263 (38 %) | 760 | 74 % | 1.61 | 350.48 |
| Short | rsi | 107 | 9 (8 %) | 12 | 83 % | 5.30 | 16.48 |
| Short | sar | 8 | 0 (0 %) | 6 | 0 % | 0.00 | -18.20 |
| Short | smooth | 53 | 53 (100 %) | 53 | 100 % | ∞ (no loss) | 112.20 |
| Short | trend | 166 | 132 (80 %) | 686 | 79 % | 2.29 | 529.07 |
| Short | volume | 99 | 76 (77 %) | 262 | 77 % | 2.20 | 206.88 |
| General | active | 15 | 15 (100 %) | 30 | 100 % | ∞ (no loss) | 107.60 |
| General | bollinger | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 37 | 15 (41 %) | 55 | 62 % | 1.56 | 28.96 |
| General | channel | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 63 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | ema | 57 | 2 (4 %) | 28 | 7 % | 0.00 | -73.18 |
| General | macd | 7 | 0 (0 %) | 12 | 25 % | 0.25 | -24.42 |
| General | move | 70 | 22 (31 %) | 34 | 68 % | 3.46 | 41.95 |
| General | osc | 148 | 84 (57 %) | 141 | 69 % | 2.29 | 175.68 |
| General | rsi | 40 | 2 (5 %) | 3 | 100 % | ∞ (no loss) | 8.93 |
| General | smooth | 55 | 45 (82 %) | 45 | 100 % | ∞ (no loss) | 166.60 |
| General | trend | 70 | 33 (47 %) | 90 | 73 % | 2.45 | 106.78 |
| General | volume | 14 | 6 (43 %) | 18 | 56 % | 0.86 | -3.88 |
| Long | active | 37 | 18 (49 %) | 49 | 71 % | 2.52 | 101.87 |
| Long | bollinger | 12 | 0 (0 %) | 7 | 43 % | 0.25 | -19.85 |
| Long | break | 127 | 28 (22 %) | 119 | 39 % | 0.63 | -105.52 |
| Long | channel | 85 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 84 | 4 (5 %) | 11 | 64 % | 1.98 | 19.49 |
| Long | ema | 71 | 0 (0 %) | 30 | 10 % | 0.12 | -94.69 |
| Long | ichimoku | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | macd | 40 | 5 (13 %) | 7 | 71 % | 1.64 | 4.83 |
| Long | move | 144 | 39 (27 %) | 82 | 72 % | 2.45 | 136.87 |
| Long | osc | 186 | 100 (54 %) | 152 | 70 % | 2.62 | 314.67 |
| Long | rsi | 47 | 12 (26 %) | 15 | 87 % | 9.20 | 59.02 |
| Long | smooth | 119 | 26 (22 %) | 26 | 100 % | ∞ (no loss) | 99.04 |
| Long | trend | 87 | 24 (28 %) | 88 | 66 % | 1.59 | 62.33 |
| Long | volume | 31 | 4 (13 %) | 4 | 100 % | ∞ (no loss) | 24.00 |
| Wide | active | 35 | 9 (26 %) | 20 | 90 % | 14.62 | 20.02 |
| Wide | break | 31 | 0 (0 %) | 42 | 14 % | 0.05 | -35.84 |
| Wide | channel | 15 | 3 (20 %) | 12 | 50 % | 1.14 | 1.14 |
| Wide | ichimoku | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 |
| Wide | macd | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 3.14 |
| Wide | move | 76 | 52 (68 %) | 218 | 48 % | 0.93 | -9.49 |
| Wide | osc | 36 | 0 (0 %) | 9 | 0 % | 0.00 | -9.15 |
| Wide | rsi | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -3.10 |
| Wide | sar | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 8.16 |
| Wide | smooth | 12 | 12 (100 %) | 60 | 55 % | 3.30 | 39.06 |
| Wide | trend | 18 | 3 (17 %) | 3 | 100 % | ∞ (no loss) | 4.80 |
| Wide | volume | 18 | 0 (0 %) | 30 | 50 % | 0.53 | -8.91 |
| Signals | signal:act-burst | 60 | 55 (92 %) | 539 | 82 % | 2.75 | 793.95 |
| Signals | signal:act-hf | 55 | 25 (45 %) | 377 | 68 % | 0.89 | -84.10 |
| Signals | signal:adx | 60 | 57 (95 %) | 275 | 91 % | 8.25 | 693.63 |
| Signals | signal:atr-break | 59 | 54 (92 %) | 491 | 79 % | 2.37 | 650.18 |
| Signals | signal:bollinger | 60 | 52 (87 %) | 332 | 76 % | 2.67 | 524.80 |
| Signals | signal:cci | 57 | 43 (75 %) | 422 | 75 % | 1.88 | 412.34 |
| Signals | signal:cmf | 58 | 25 (43 %) | 311 | 68 % | 1.03 | 21.17 |
| Signals | signal:donchian | 55 | 37 (67 %) | 274 | 77 % | 1.76 | 250.77 |
| Signals | signal:ema-cross | 45 | 27 (60 %) | 158 | 72 % | 1.06 | 18.51 |
| Signals | signal:ema-cross-fast | 60 | 46 (77 %) | 336 | 83 % | 2.49 | 547.88 |
| Signals | signal:ema-pullback | 59 | 44 (75 %) | 461 | 74 % | 1.74 | 444.92 |
| Signals | signal:ema-slope | 57 | 47 (82 %) | 276 | 79 % | 1.90 | 316.89 |
| Signals | signal:ema-trend | 60 | 45 (75 %) | 390 | 75 % | 2.00 | 517.43 |
| Signals | signal:heikin-ashi | 60 | 52 (87 %) | 645 | 84 % | 3.28 | 1069.37 |
| Signals | signal:hma | 56 | 42 (75 %) | 383 | 76 % | 1.43 | 240.28 |
| Signals | signal:ichimoku | 46 | 24 (52 %) | 155 | 68 % | 0.81 | -57.03 |
| Signals | signal:impulse | 59 | 40 (68 %) | 401 | 76 % | 1.62 | 348.60 |
| Signals | signal:kama | 59 | 58 (98 %) | 463 | 87 % | 3.96 | 898.49 |
| Signals | signal:keltner | 51 | 24 (47 %) | 186 | 71 % | 1.05 | 14.75 |
| Signals | signal:macd-cross | 59 | 51 (86 %) | 422 | 81 % | 2.45 | 615.00 |
| Signals | signal:macd-hist | 60 | 56 (93 %) | 579 | 82 % | 3.19 | 1043.90 |
| Signals | signal:macd-slow | 59 | 54 (92 %) | 472 | 83 % | 2.75 | 777.07 |
| Signals | signal:obv | 60 | 59 (98 %) | 574 | 88 % | 7.32 | 1336.44 |
| Signals | signal:r-awesome | 51 | 26 (51 %) | 235 | 73 % | 1.13 | 51.65 |
| Signals | signal:r-connors | 55 | 49 (89 %) | 149 | 80 % | 3.38 | 247.75 |
| Signals | signal:r-fractal | 45 | 11 (24 %) | 150 | 63 % | 0.59 | -160.18 |
| Signals | signal:r-inside | 42 | 8 (19 %) | 67 | 46 % | 0.22 | -247.25 |
| Signals | signal:r-linreg | 58 | 46 (79 %) | 370 | 75 % | 1.80 | 365.44 |
| Signals | signal:r-nr-break | 54 | 43 (80 %) | 256 | 77 % | 1.57 | 184.32 |
| Signals | signal:r-session-trend | 56 | 19 (34 %) | 250 | 60 % | 0.60 | -259.73 |
| Signals | signal:r-vol-regime | 35 | 17 (49 %) | 61 | 56 % | 0.61 | -56.43 |
| Signals | signal:reclaim | 60 | 57 (95 %) | 606 | 84 % | 3.67 | 1225.79 |
| Signals | signal:rsi-mid | 58 | 46 (79 %) | 440 | 79 % | 1.85 | 497.12 |
| Signals | signal:rsi-reversal | 15 | 8 (53 %) | 23 | 39 % | 0.53 | -10.79 |
| Signals | signal:s2-active-hf | 60 | 45 (75 %) | 685 | 73 % | 1.55 | 546.35 |
| Signals | signal:s2-adx-gate | 60 | 44 (73 %) | 395 | 77 % | 1.80 | 411.85 |
| Signals | signal:s2-atr-break | 40 | 24 (60 %) | 177 | 68 % | 0.85 | -41.95 |
| Signals | signal:s2-bb-bounce | 56 | 47 (84 %) | 175 | 83 % | 3.58 | 407.44 |
| Signals | signal:s2-block-scale | 53 | 24 (45 %) | 426 | 66 % | 0.86 | -133.35 |
| Signals | signal:s2-block-stack | 43 | 6 (14 %) | 166 | 43 % | 0.26 | -501.87 |
| Signals | signal:s2-confluence | 59 | 50 (85 %) | 420 | 79 % | 2.43 | 560.92 |
| Signals | signal:s2-ema-cross | 26 | 25 (96 %) | 35 | 89 % | 16.48 | 71.96 |
| Signals | signal:s2-range-break | 35 | 28 (80 %) | 65 | 69 % | 1.48 | 29.90 |
| Signals | signal:s2-range-shift | 45 | 18 (40 %) | 171 | 64 % | 0.60 | -148.72 |
| Signals | signal:s2-rsi-revert | 57 | 57 (100 %) | 128 | 92 % | 71.26 | 393.18 |
| Signals | signal:s2-st-trail | 43 | 38 (88 %) | 191 | 87 % | 5.68 | 412.88 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 198 | 91 % | 19.95 | 635.46 |
| Signals | signal:s2-vol-break | 49 | 36 (73 %) | 103 | 70 % | 1.98 | 120.44 |
| Signals | signal:s2-vwap-axis | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.11 |
| Signals | signal:sar | 56 | 38 (68 %) | 452 | 78 % | 1.43 | 299.80 |
| Signals | signal:squeeze | 16 | 2 (13 %) | 25 | 24 % | 0.05 | -113.41 |
| Signals | signal:st-slow | 53 | 48 (91 %) | 176 | 85 % | 2.93 | 314.31 |
| Signals | signal:stoch-rsi | 54 | 47 (87 %) | 420 | 75 % | 1.96 | 432.38 |
| Signals | signal:supertrend | 46 | 41 (89 %) | 249 | 88 % | 4.77 | 535.98 |
| Signals | signal:swing | 60 | 40 (67 %) | 415 | 78 % | 1.41 | 255.51 |
| Signals | signal:thrust | 50 | 27 (54 %) | 255 | 69 % | 1.03 | 14.10 |
| Signals | signal:trix | 34 | 19 (56 %) | 94 | 66 % | 0.80 | -34.01 |
| Signals | signal:volume-break | 21 | 16 (76 %) | 34 | 74 % | 3.65 | 48.76 |
| Signals | signal:vwap | 60 | 60 (100 %) | 404 | 89 % | 4.87 | 931.53 |
| Signals | signal:williams-r | 60 | 52 (87 %) | 442 | 81 % | 3.00 | 776.15 |
| Signals | signal:zscore | 43 | 40 (93 %) | 257 | 78 % | 3.17 | 411.29 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 6 | 6 (100 %) | 24 | 92 % | 16.59 | 8.02 |
| Micro | 1.25 | 6 | 6 (100 %) | 24 | 92 % | 16.59 | 8.02 |
| Micro | 1.35 | 6 | 6 (100 %) | 24 | 92 % | 16.59 | 8.02 |
| Micro | 1.5 | 6 | 6 (100 %) | 24 | 92 % | 16.59 | 8.02 |
| Micro | 1.75 | 6 | 6 (100 %) | 24 | 92 % | 16.59 | 8.02 |
| Micro | 2 | 6 | 6 (100 %) | 24 | 92 % | 16.59 | 8.02 |
| Short | 1.1 | 1168 | 554 (47 %) | 2014 | 74 % | 1.82 | 1128.93 |
| Short | 1.25 | 1060 | 504 (48 %) | 1787 | 75 % | 1.91 | 1074.25 |
| Short | 1.35 | 971 | 474 (49 %) | 1654 | 75 % | 2.01 | 1054.54 |
| Short | 1.5 | 843 | 437 (52 %) | 1485 | 76 % | 2.13 | 1008.32 |
| Short | 1.75 | 597 | 323 (54 %) | 1035 | 77 % | 2.28 | 735.51 |
| Short | 2 | 352 | 212 (60 %) | 643 | 79 % | 2.44 | 489.53 |
| General | 1.1 | 162 | 49 (30 %) | 140 | 54 % | 1.02 | 4.70 |
| General | 1.25 | 156 | 47 (30 %) | 131 | 53 % | 1.02 | 4.04 |
| General | 1.35 | 140 | 43 (31 %) | 107 | 56 % | 1.18 | 26.00 |
| General | 1.5 | 110 | 33 (30 %) | 78 | 62 % | 1.46 | 43.63 |
| General | 1.75 | 71 | 23 (32 %) | 55 | 67 % | 2.08 | 58.57 |
| General | 2 | 49 | 20 (41 %) | 45 | 71 % | 2.04 | 48.38 |
| Long | 1.1 | 261 | 100 (38 %) | 285 | 52 % | 1.11 | 65.75 |
| Long | 1.25 | 245 | 96 (39 %) | 250 | 54 % | 1.20 | 100.99 |
| Long | 1.35 | 220 | 87 (40 %) | 212 | 55 % | 1.30 | 124.32 |
| Long | 1.5 | 187 | 75 (40 %) | 160 | 57 % | 1.54 | 154.02 |
| Long | 1.75 | 117 | 52 (44 %) | 87 | 72 % | 3.01 | 207.52 |
| Long | 2 | 50 | 13 (26 %) | 28 | 68 % | 2.28 | 49.12 |
| Wide | 1.1 | 33 | 0 (0 %) | 69 | 30 % | 0.20 | -49.19 |
| Wide | 1.25 | 33 | 0 (0 %) | 69 | 30 % | 0.20 | -49.19 |
| Wide | 1.35 | 30 | 0 (0 %) | 66 | 32 % | 0.21 | -44.48 |
| Wide | 1.5 | 28 | 0 (0 %) | 62 | 34 % | 0.24 | -37.89 |
| Wide | 1.75 | 19 | 0 (0 %) | 50 | 38 % | 0.29 | -26.74 |
| Wide | 2 | 15 | 0 (0 %) | 36 | 42 % | 0.35 | -17.83 |
| Signals | 1.1 | 402 | 264 (66 %) | 2269 | 76 % | 1.61 | 1701.18 |
| Signals | 1.25 | 197 | 133 (68 %) | 1103 | 76 % | 1.69 | 869.19 |
| Signals | 1.35 | 139 | 95 (68 %) | 746 | 77 % | 1.76 | 616.23 |
| Signals | 1.5 | 65 | 44 (68 %) | 372 | 78 % | 1.60 | 247.53 |
| Signals | 1.75 | 25 | 19 (76 %) | 173 | 81 % | 1.90 | 134.46 |
| Signals | 2 | 10 | 8 (80 %) | 64 | 83 % | 2.37 | 63.83 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | pivot | mc-lag-3@m15 | 160 | 160 (100 %) | 160 | 100 % | ∞ (no loss) | 54.60 | – |
| Micro | follow | mc-rsit2-15@m5c | 148 | 148 (100 %) | 148 | 100 % | ∞ (no loss) | 46.80 | – |
| Micro | sweep | mc-rsit2-20@m5c | 80 | 80 (100 %) | 80 | 100 % | ∞ (no loss) | 25.30 | – |
| Micro | magnet | mc-trsi2-10@m5 | 17 | 17 (100 %) | 34 | 100 % | ∞ (no loss) | 12.80 | – |
| Micro | sweep | mc-rsi4-10@m5 | 6 | 6 (100 %) | 24 | 92 % | 16.59 | 8.02 | – |
| Micro | sweep | mc-streak-6@m5 | 8 | 8 (100 %) | 16 | 100 % | ∞ (no loss) | 6.40 | – |
| Micro | sweep | mc-rsi3-10@m5c | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 5.00 | – |
| Micro | sweep | mc-rsi5-10@m5 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 4.20 | – |
| Micro | ribbon | mc-trsi2-10@m5 | 2 | 0 (0 %) | 10 | 60 % | 0.35 | -4.37 | tp0.6 sl2.85 tr0.45 h192 mc (5 · 0.36 · -2.11) |
| Micro | clamp | mc-trsi2-10@m5 | 2 | 0 (0 %) | 10 | 60 % | 0.35 | -4.37 | tp0.6 sl2.85 tr0.45 h192 mc (5 · 0.36 · -2.11) |
| Micro | sweep | mc-rsrev-12@m5c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -6.15 | – |
| Micro | pivot | mc-trsi2-10@m5 | 3 | 0 (0 %) | 15 | 60 % | 0.36 | -6.33 | tp0.6 sl2.7 tr0.45 h192 mc (5 · 0.38 · -1.96) |
| Micro | revert | mc-tpull-13@m5c | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -47.47 | – |
| Short | revert | r-chop@m30 | 63 | 63 (100 %) | 398 | 79 % | 2.62 | 317.89 | tp2.6 sl2.6 tr0 h48 sh (6 · 4.29 · 9.20) |
| Short | revert | r-chop-m@m15 | 46 | 42 (91 %) | 264 | 81 % | 3.04 | 278.36 | tp2.8 sl5.6 tr0 h64 sh (6 · ∞ (no loss) · 15.60) |
| Short | sweep | act-burst-2.5@x4@m30 | 44 | 44 (100 %) | 106 | 100 % | ∞ (no loss) | 228.65 | – |
| Short | magnet | r-chand@m15 | 80 | 66 (83 %) | 437 | 77 % | 1.72 | 214.15 | tp2.6 sl2.6 tr0 h64 sh (5 · 3.43 · 6.80) |
| Short | revert | r-klinger@m15c | 68 | 68 (100 %) | 247 | 79 % | 2.42 | 211.78 | – |
| Short | ribbon | r-chand-m@m15 | 22 | 22 (100 %) | 92 | 89 % | 144.70 | 163.99 | tp2.6 sl2.6 tr1.95 h96 sh (5 · 44.02 · 8.69) |
| Short | sweep | r-vol-regime@m30 | 24 | 24 (100 %) | 48 | 100 % | ∞ (no loss) | 104.00 | – |
| Short | magnet | hma-16@m15c | 46 | 46 (100 %) | 46 | 100 % | ∞ (no loss) | 95.60 | – |
| Short | sweep | r-sweep@m15 | 47 | 47 (100 %) | 94 | 93 % | 158.52 | 91.31 | – |
| Short | magnet | willr-50-90@m15c | 79 | 47 (59 %) | 158 | 76 % | 1.86 | 80.45 | – |
| Short | clamp | r-chand-m@m15 | 13 | 13 (100 %) | 50 | 92 % | 6.24 | 79.66 | – |
| Short | pivot | move-impulse-4-1.2@m15c | 76 | 58 (76 %) | 58 | 100 % | ∞ (no loss) | 72.68 | – |
| Short | ribbon | r-ultimate@m15c | 37 | 37 (100 %) | 37 | 100 % | ∞ (no loss) | 69.60 | – |
| Short | sweep | r-td@m30 | 45 | 28 (62 %) | 40 | 70 % | 39.30 | 63.77 | – |
| Short | magnet | break-don10@m15c | 13 | 13 (100 %) | 26 | 100 % | ∞ (no loss) | 61.20 | – |
| Short | pivot | r-fvg-m@m15 | 14 | 14 (100 %) | 28 | 100 % | ∞ (no loss) | 48.73 | – |
| Short | magnet | break-don20@m15 | 8 | 8 (100 %) | 16 | 100 % | ∞ (no loss) | 40.00 | – |
| Short | magnet | willr-50-90@m15 | 44 | 24 (55 %) | 83 | 77 % | 1.73 | 38.52 | – |
| Short | sweep | cci-20-200@m30 | 4 | 4 (100 %) | 20 | 100 % | ∞ (no loss) | 35.09 | tp2.4 sl4.8 tr1.2 h32 sh (5 · ∞ (no loss) · 9.48) |
| Short | magnet | act-shift@m15c | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 33.60 | – |
| Short | clamp | cci-40-200@m15c | 13 | 13 (100 %) | 26 | 100 % | ∞ (no loss) | 30.91 | – |
| Short | ribbon | trend-adx-20@m15c | 22 | 19 (86 %) | 20 | 95 % | 539.25 | 30.26 | – |
| Short | pivot | r-chand-m@m15 | 15 | 11 (73 %) | 71 | 70 % | 1.34 | 27.62 | tp2.6 sl3.9 tr0 h96 sh (5 · 2.34 · 5.50) |
| Short | magnet | willr-21-90@m15c | 13 | 11 (85 %) | 25 | 92 % | 5.50 | 26.12 | – |
| Short | revert | break-squeeze-t10@m15c | 5 | 5 (100 %) | 13 | 100 % | ∞ (no loss) | 25.85 | – |
| Short | ribbon | willr-28-95@m15 | 16 | 14 (88 %) | 16 | 88 % | 4.99 | 25.52 | – |
| Short | ribbon | break-squeeze-30@m30 | 13 | 12 (92 %) | 25 | 92 % | 8.94 | 24.73 | – |
| Short | ribbon | r-td@m30 | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 24.21 | – |
| Short | ribbon | willr-14-90@m15c | 5 | 5 (100 %) | 14 | 100 % | ∞ (no loss) | 21.76 | – |
| Short | ribbon | willr-28-95@m15c | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 19.92 | – |
| Short | ribbon | willr-14-90@m15 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 19.32 | – |
| Short | magnet | willr-28-95@m15c | 11 | 10 (91 %) | 11 | 91 % | 7.42 | 19.25 | – |
| Short | ribbon | move-impulse-20-2.5@m30 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 19.20 | – |
| Short | pivot | willr-50-95@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 18.98 | – |
| Short | sweep | willr-7-90@m30 | 38 | 16 (42 %) | 23 | 70 % | 3.02 | 18.20 | – |
| Short | revert | trend-st-28-6@m15 | 1 | 1 (100 %) | 15 | 80 % | 2.36 | 18.00 | tp2.8 sl4.2 tr0 h64 sh (15 · 2.36 · 18.00) |
| Short | pivot | macd-cross@m30 | 4 | 4 (100 %) | 7 | 100 % | ∞ (no loss) | 17.98 | – |
| Short | magnet | hma-16@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 16.60 | – |
| Short | magnet | willr-14-90@m15c | 9 | 7 (78 %) | 18 | 89 % | 3.55 | 15.32 | – |
| Short | sweep | rsi-fast@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 14.40 | – |
| Short | pivot | macd-cross-19-39-9@m30 | 3 | 3 (100 %) | 5 | 100 % | ∞ (no loss) | 13.00 | – |
| Short | revert | move-impulse-20-2.5@m15c | 1 | 1 (100 %) | 5 | 100 % | ∞ (no loss) | 13.00 | tp2.8 sl5.6 tr0 h96 sh (5 · ∞ (no loss) · 13.00) |
| Short | sweep | r-pin-m@m15 | 16 | 4 (25 %) | 32 | 59 % | 2.20 | 11.72 | – |
| Short | sweep | willr-50-95@m15 | 11 | 7 (64 %) | 15 | 73 % | 1.74 | 9.81 | – |
| Short | ribbon | dir-vwap-240@m15c | 1 | 1 (100 %) | 9 | 89 % | 12.22 | 9.61 | tp2.8 sl5.6 tr1.4 h96 sh (9 · 12.22 · 9.61) |
| Short | sweep | break-vol@x4@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 9.60 | – |
| Short | pivot | mfi-14-10@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 9.40 | – |
| Short | pivot | break-squeeze-t25@m15 | 8 | 6 (75 %) | 32 | 75 % | 1.36 | 9.06 | – |
| Short | revert | r-inside-m@m30 | 3 | 3 (100 %) | 11 | 82 % | 2.48 | 8.60 | – |
| Short | magnet | willr-28-95@m15 | 17 | 11 (65 %) | 17 | 65 % | 1.46 | 8.30 | – |
| Short | pivot | break-squeeze@m15 | 6 | 6 (100 %) | 18 | 67 % | 1.46 | 5.20 | – |
| Short | pivot | break-squeeze-t10@m15 | 6 | 6 (100 %) | 18 | 67 % | 1.25 | 3.60 | – |
| Short | magnet | willr-28-90@m15c | 8 | 2 (25 %) | 16 | 63 % | 1.17 | 2.32 | – |
| Short | follow | r-nr-break@m15c | 4 | 3 (75 %) | 12 | 58 % | 1.78 | 2.28 | – |
| Short | sweep | r-fvg-m@m30 | 4 | 0 (0 %) | 8 | 50 % | 0.81 | -1.60 | – |
| Short | follow | r-fvg-m@m30 | 3 | 0 (0 %) | 9 | 67 % | 0.86 | -1.80 | – |
| Short | ribbon | ema-slope@m15 | 10 | 7 (70 %) | 10 | 70 % | 0.46 | -3.18 | – |
| Short | sweep | break-squeeze-t25@m15c | 16 | 4 (25 %) | 16 | 25 % | 0.57 | -4.18 | – |
| Short | sweep | z-50-2.5@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.59 | -7.00 | – |
| Short | sweep | willr-14-95@m15 | 21 | 8 (38 %) | 34 | 62 % | 0.85 | -7.29 | – |
| Short | pivot | cci-20-200@m15c | 11 | 4 (36 %) | 66 | 65 % | 0.84 | -9.10 | tp1.8 sl3.6 tr1.35 h64 sh (6 · 1.57 · 2.18) |
| Short | revert | r-awesome-m@m15c | 5 | 0 (0 %) | 10 | 50 % | 0.49 | -11.40 | – |
| Short | sweep | break-squeeze@m15c | 20 | 1 (5 %) | 20 | 5 % | 0.12 | -13.56 | – |
| Short | sweep | cci-20-200@m15 | 9 | 0 (0 %) | 31 | 58 % | 0.75 | -13.60 | – |
| Short | ribbon | sar-0.01@m15 | 8 | 0 (0 %) | 6 | 0 % | 0.00 | -18.20 | – |
| Short | sweep | willr-14-90@m30 | 11 | 2 (18 %) | 15 | 27 % | 0.24 | -20.68 | – |
| Short | sweep | willr-21-95@m15 | 31 | 6 (19 %) | 56 | 55 % | 0.74 | -21.51 | – |
| Short | revert | r-klinger-m@m15c | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -22.10 | – |
| Short | sweep | willr-21-90@m30 | 9 | 0 (0 %) | 8 | 0 % | 0.00 | -24.80 | – |
| Short | ribbon | ema-slope@m15c | 55 | 32 (58 %) | 55 | 58 % | 0.28 | -42.69 | – |
| Short | revert | r-stc@m15c | 37 | 0 (0 %) | 108 | 34 % | 0.36 | -134.10 | – |
| General | sweep | act-burst-2.5@x4@m30 | 15 | 15 (100 %) | 30 | 100 % | ∞ (no loss) | 107.60 | – |
| General | magnet | hma-16@m15c | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 59.60 | – |
| General | pivot | hma-16@m15c | 15 | 15 (100 %) | 15 | 100 % | ∞ (no loss) | 55.80 | – |
| General | magnet | hma-16@m15 | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 51.20 | – |
| General | pivot | r-ultimate@m15c | 28 | 22 (79 %) | 28 | 79 % | 3.16 | 45.30 | – |
| General | ribbon | trend-adx-20@m15c | 21 | 13 (62 %) | 14 | 93 % | 806.52 | 45.28 | – |
| General | sweep | r-td@m30 | 14 | 12 (86 %) | 12 | 100 % | ∞ (no loss) | 44.26 | – |
| General | ribbon | r-chand-m@m15 | 11 | 10 (91 %) | 31 | 74 % | 2.82 | 39.46 | – |
| General | revert | r-chop@m30 | 3 | 3 (100 %) | 20 | 70 % | 3.21 | 24.24 | tp3.6 sl3.6 tr1.8 h48 gn (6 · 3.15 · 8.42) |
| General | ribbon | r-ultimate@m15c | 9 | 8 (89 %) | 9 | 89 % | 11.00 | 24.00 | – |
| General | pivot | mfi-14-10@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 22.40 | – |
| General | ribbon | willr-28-95@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 21.60 | – |
| General | magnet | willr-28-95@m15c | 34 | 18 (53 %) | 34 | 53 % | 1.44 | 21.00 | – |
| General | clamp | cci-40-200@m15c | 4 | 4 (100 %) | 8 | 88 % | 145.45 | 15.98 | – |
| General | magnet | willr-28-95@m15 | 15 | 8 (53 %) | 15 | 53 % | 1.47 | 9.80 | – |
| General | clamp | r-chand-m@m15 | 7 | 4 (57 %) | 21 | 62 % | 1.36 | 9.70 | – |
| General | revert | r-bos-m@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 8.57 | – |
| General | magnet | r-chand@m15 | 5 | 5 (100 %) | 21 | 71 % | 1.35 | 7.44 | tp3.6 sl3.6 tr1.8 h96 gn (5 · 1.66 · 2.54) |
| General | sweep | willr-21-95@m15 | 11 | 5 (45 %) | 19 | 58 % | 1.09 | 2.30 | – |
| General | sweep | willr-14-95@m15 | 7 | 3 (43 %) | 11 | 64 % | 1.16 | 2.30 | – |
| General | pivot | move-impulse-4-1.2@m15c | 40 | 6 (15 %) | 14 | 43 % | 0.15 | -10.42 | – |
| General | ribbon | break-squeeze-30@m30 | 14 | 3 (21 %) | 11 | 36 % | 0.15 | -11.08 | – |
| General | revert | r-klinger@m15c | 7 | 0 (0 %) | 11 | 36 % | 0.08 | -22.88 | – |
| General | revert | r-stc@m15c | 7 | 0 (0 %) | 12 | 25 % | 0.25 | -24.42 | – |
| General | ribbon | ema-slope@m15 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -24.44 | – |
| General | ribbon | ema-slope@m15c | 19 | 2 (11 %) | 19 | 11 % | 0.00 | -48.74 | – |
| Long | sweep | act-burst-2.5@x4@m30 | 17 | 17 (100 %) | 34 | 100 % | ∞ (no loss) | 167.60 | – |
| Long | magnet | willr-28-95@m15c | 30 | 25 (83 %) | 30 | 83 % | 8.85 | 124.00 | – |
| Long | sweep | r-td@m30 | 30 | 19 (63 %) | 19 | 100 % | ∞ (no loss) | 100.20 | – |
| Long | ribbon | willr-28-95@m15 | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 99.20 | – |
| Long | ribbon | willr-14-95@m15c | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 67.20 | – |
| Long | magnet | willr-28-95@m15 | 20 | 15 (75 %) | 20 | 75 % | 5.35 | 65.20 | – |
| Long | magnet | break-don10@m15c | 8 | 8 (100 %) | 13 | 100 % | ∞ (no loss) | 59.18 | – |
| Long | follow | r-rsi2-m@m15c | 12 | 12 (100 %) | 15 | 87 % | 9.20 | 59.02 | – |
| Long | ribbon | willr-50-95@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 58.00 | – |
| Long | pivot | hma-16@m15c | 38 | 10 (26 %) | 10 | 100 % | ∞ (no loss) | 41.10 | – |
| Long | magnet | hma-16@m15c | 25 | 9 (36 %) | 9 | 100 % | ∞ (no loss) | 31.21 | – |
| Long | magnet | hma-16@m15 | 23 | 7 (30 %) | 7 | 100 % | ∞ (no loss) | 26.73 | – |
| Long | ribbon | r-chand-m@m15 | 16 | 13 (81 %) | 26 | 73 % | 2.45 | 25.71 | – |
| Long | clamp | r-chand-m@m15 | 4 | 3 (75 %) | 12 | 67 % | 3.17 | 25.35 | – |
| Long | ribbon | trend-adx-20@m15c | 28 | 5 (18 %) | 5 | 100 % | ∞ (no loss) | 24.20 | – |
| Long | magnet | break-don20@m15 | 3 | 3 (100 %) | 5 | 100 % | ∞ (no loss) | 23.40 | – |
| Long | sweep | r-sweep@m15 | 10 | 9 (90 %) | 20 | 95 % | 69.97 | 21.47 | – |
| Long | follow | r-chand-m@m15c | 3 | 3 (100 %) | 8 | 63 % | 2.52 | 14.60 | – |
| Long | ribbon | dir-vwap-240@m15c | 3 | 3 (100 %) | 10 | 60 % | 1.73 | 14.49 | – |
| Long | sweep | break-atr-2@m30 | 2 | 2 (100 %) | 10 | 60 % | 1.84 | 14.20 | tp5.6 sl4.2 tr0 h32 lg (5 · 1.84 · 7.40) |
| Long | sweep | r-vol-regime@m30 | 8 | 6 (75 %) | 16 | 50 % | 1.27 | 8.49 | – |
| Long | ribbon | ema-slope-100@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.64 | -4.78 | – |
| Long | revert | r-sweep@m30 | 14 | 5 (36 %) | 34 | 41 % | 0.85 | -12.60 | – |
| Long | ribbon | break-squeeze-30@m30 | 33 | 5 (15 %) | 11 | 45 % | 0.12 | -14.80 | – |
| Long | pivot | break-squeeze-t25@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.20 | -16.17 | – |
| Long | magnet | bb-bounce@m15 | 4 | 0 (0 %) | 7 | 43 % | 0.25 | -19.85 | – |
| Long | magnet | z-20-2@m15 | 4 | 0 (0 %) | 7 | 43 % | 0.25 | -19.85 | – |
| Long | sweep | break-squeeze-30@m30 | 6 | 0 (0 %) | 8 | 25 % | 0.06 | -22.91 | – |
| Long | magnet | r-chand@m15 | 11 | 0 (0 %) | 36 | 58 % | 0.63 | -23.13 | – |
| Long | ribbon | ema-slope@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -28.20 | – |
| Long | sweep | cci-20-200@m15 | 5 | 0 (0 %) | 9 | 44 % | 0.09 | -28.57 | – |
| Long | revert | break-vol-2@m15c | 9 | 0 (0 %) | 13 | 0 % | 0.00 | -49.30 | – |
| Long | ribbon | ema-slope@m15c | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -58.80 | – |
| Long | ribbon | act-hf-5@m15 | 15 | 1 (7 %) | 15 | 7 % | 0.02 | -65.73 | – |
| Long | pivot | r-ultimate@m15c | 33 | 6 (18 %) | 29 | 21 % | 0.01 | -95.86 | – |
| Long | revert | break-vol-2@m30 | 24 | 0 (0 %) | 30 | 0 % | 0.00 | -121.50 | – |
| Wide | magnet | trix-15@m30 | 12 | 12 (100 %) | 60 | 55 % | 3.30 | 39.06 | tp1.13 sl1.13 tr0 h16 axd-geo2 axis (5 · 5.01 · 5.61) |
| Wide | sweep | r-pin-m@m30 | 9 | 9 (100 %) | 39 | 100 % | ∞ (no loss) | 35.62 | tp1.13 sl1.13 tr0 h16 ax-atr2 axis (5 · ∞ (no loss) · 3.46) |
| Wide | magnet | mc-rsit4-25@m30 | 9 | 9 (100 %) | 18 | 100 % | ∞ (no loss) | 21.49 | – |
| Wide | ribbon | move-impulse-20-2.5@m30 | 33 | 27 (82 %) | 66 | 41 % | 1.41 | 15.23 | – |
| Wide | ribbon | move-cont@m1 | 10 | 10 (100 %) | 53 | 62 % | 2.17 | 15.12 | tp0.64 sl0.54 tr0 h480 axd-geo3 axis (5 · 2.35 · 2.38) |
| Wide | sweep | r-pin-m@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 8.59 | – |
| Wide | pivot | sar-0.03@m15c | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 8.16 | – |
| Wide | magnet | r-camarilla@m15 | 6 | 3 (50 %) | 12 | 50 % | 1.14 | 1.14 | – |
| Wide | ribbon | ichi-cloud-9@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 | – |
| Wide | sweep | willr-50-95@m5c | 9 | 0 (0 %) | 6 | 0 % | 0.00 | -4.44 | – |
| Wide | revert | r-chop@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -5.01 | – |
| Wide | pivot | r-sweep-m@m5 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -6.52 | – |
| Wide | revert | r-klinger@m15c | 15 | 0 (0 %) | 30 | 50 % | 0.53 | -8.91 | – |
| Wide | clamp | r-sweep-m@m5 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -10.15 | – |
| Wide | ribbon | break-squeeze-30@m30 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -11.94 | – |
| Wide | revert | break-vol-2@m30 | 6 | 0 (0 %) | 24 | 25 % | 0.10 | -18.90 | – |
| Wide | pulse | move-impulse-10-2@m15 | 12 | 0 (0 %) | 42 | 0 % | 0.00 | -67.36 | – |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 415 | 88 % | 6.11 | 905.94 | tp3 sl9 tr2.4 h96 (20 · 2761.00 · 53.18) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 30 (100 %) | 303 | 88 % | 7.89 | 782.42 | tp4 sl12 tr2.4 h96 (13 · ∞ (no loss) · 39.23) |
| Signals | follow | sig-obv-s@m15 | 30 | 30 (100 %) | 276 | 89 % | 7.56 | 670.99 | tp4 sl6 tr0 h96 (11 · ∞ (no loss) · 41.80) |
| Signals | follow | sig-obv-m@m15 | 30 | 29 (97 %) | 298 | 86 % | 7.11 | 665.46 | tp4 sl12 tr3.2 h96 (12 · 163.13 · 37.88) |
| Signals | follow | sig-vwap-s@m15 | 30 | 30 (100 %) | 308 | 88 % | 3.64 | 621.62 | tp5 sl15 tr2 h96 (14 · 488.64 · 41.64) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 30 (100 %) | 326 | 83 % | 3.43 | 609.39 | tp6 sl12 tr0 h96 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 30 (100 %) | 285 | 85 % | 3.62 | 576.29 | tp4 sl12 tr2.4 h96 (11 · ∞ (no loss) · 35.29) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 28 (93 %) | 281 | 84 % | 3.60 | 555.53 | tp4 sl12 tr1.6 h96 (15 · 22.09 · 36.62) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 30 (100 %) | 143 | 97 % | 100.18 | 496.39 | tp5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-kama-s@m15 | 30 | 29 (97 %) | 246 | 87 % | 4.24 | 494.97 | tp4 sl12 tr1.6 h96 (17 · 22.58 · 37.48) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 29 (97 %) | 206 | 84 % | 5.28 | 493.69 | tp4 sl12 tr2.4 h96 (8 · ∞ (no loss) · 24.44) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 192 | 91 % | 5.19 | 482.28 | tp5 sl15 tr3 h96 (6 · ∞ (no loss) · 24.81) |
| Signals | follow | sig-adx-s@m15 | 30 | 30 (100 %) | 198 | 90 % | 8.04 | 478.06 | tp6 sl18 tr3.6 h96 (6 · 58.36 · 22.80) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 30 (100 %) | 192 | 89 % | 9.16 | 449.05 | tp5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 29 (97 %) | 241 | 86 % | 3.03 | 444.48 | tp4 sl12 tr1.6 h96 (12 · ∞ (no loss) · 35.28) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 27 (90 %) | 303 | 81 % | 2.28 | 443.37 | tp4 sl12 tr1.6 h96 (16 · ∞ (no loss) · 39.32) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 26 (87 %) | 253 | 81 % | 2.92 | 434.51 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 26 (87 %) | 253 | 81 % | 2.92 | 434.51 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 27 (90 %) | 252 | 83 % | 2.43 | 403.67 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 37.44) |
| Signals | follow | sig-kama-m@m15 | 29 | 29 (100 %) | 217 | 87 % | 3.67 | 403.52 | tp4 sl12 tr1.6 h96 (11 · ∞ (no loss) · 30.76) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 28 (93 %) | 149 | 91 % | 9.33 | 397.88 | tp5 sl15 tr2 h96 (8 · 551.88 · 24.83) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 29 (97 %) | 225 | 83 % | 3.06 | 356.41 | tp4 sl12 tr1.6 h96 (12 · ∞ (no loss) · 23.11) |
| Signals | follow | sig-atr-break-s@m15 | 29 | 27 (93 %) | 259 | 78 % | 2.58 | 354.18 | tp4 sl12 tr1.6 h96 (15 · ∞ (no loss) · 31.44) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 27 (90 %) | 205 | 78 % | 2.92 | 352.76 | tp6 sl18 tr3.6 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-zscore-s@m15 | 30 | 27 (90 %) | 205 | 78 % | 2.92 | 352.76 | tp6 sl18 tr3.6 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 25 (83 %) | 347 | 79 % | 1.87 | 344.90 | tp3 sl9 tr0 h96 (16 · 4.57 · 32.80) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 27 (90 %) | 195 | 79 % | 3.34 | 319.64 | tp4 sl12 tr3.2 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-cci-s@m15 | 27 | 24 (89 %) | 255 | 79 % | 2.35 | 318.82 | tp5 sl15 tr3 h96 (11 · 32.94 · 31.34) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 28 (93 %) | 113 | 87 % | 4.99 | 314.73 | tp5 sl15 tr2 h96 (5 · 185.65 · 19.10) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 96 | 92 % | 63.12 | 309.91 | tp4 sl12 tr1.6 h96 (6 · ∞ (no loss) · 13.64) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 27 (90 %) | 232 | 81 % | 2.19 | 296.00 | tp5 sl15 tr2 h96 (11 · ∞ (no loss) · 21.37) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 28 (93 %) | 180 | 82 % | 2.72 | 283.93 | tp4 sl12 tr2.4 h96 (6 · ∞ (no loss) · 20.30) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 30 (100 %) | 101 | 90 % | 51.59 | 283.08 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 16.27) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 23 (77 %) | 347 | 73 % | 1.56 | 278.02 | tp4 sl12 tr1.6 h96 (19 · 12.66 · 36.26) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 22 (73 %) | 338 | 73 % | 1.55 | 268.33 | tp4 sl12 tr1.6 h96 (18 · 12.55 · 35.91) |
| Signals | follow | sig-donchian-s@m15 | 30 | 26 (87 %) | 173 | 83 % | 2.71 | 266.73 | tp5 sl15 tr2 h96 (7 · 162.10 · 21.07) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 24 (80 %) | 195 | 75 % | 2.44 | 265.57 | tp4 sl12 tr2.4 h96 (8 · ∞ (no loss) · 23.99) |
| Signals | follow | sig-stoch-rsi-m@m15 | 26 | 24 (92 %) | 210 | 77 % | 2.31 | 253.52 | tp3 sl9 tr0 h96 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-thrust-m@m15 | 29 | 26 (90 %) | 174 | 80 % | 2.58 | 242.59 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 24.69) |
| Signals | follow | sig-s2-confluence-s@m15 | 29 | 23 (79 %) | 225 | 79 % | 1.95 | 241.28 | tp4 sl12 tr1.6 h96 (12 · 283.86 · 27.36) |
| Signals | follow | sig-hma-s@m15 | 30 | 27 (90 %) | 246 | 78 % | 1.71 | 240.66 | tp3 sl9 tr1.8 h96 (14 · 3.45 · 22.51) |
| Signals | follow | sig-impulse-s@m15 | 30 | 22 (73 %) | 276 | 75 % | 1.61 | 228.69 | tp4 sl12 tr1.6 h96 (20 · 826.80 · 35.39) |
| Signals | follow | sig-macd-slow-m@m15 | 29 | 26 (90 %) | 191 | 81 % | 1.96 | 221.55 | tp2.5 sl7.5 tr0 h96 (12 · 3.29 · 17.60) |
| Signals | follow | sig-adx-m@m15 | 30 | 27 (90 %) | 77 | 92 % | 8.78 | 215.57 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 26 (87 %) | 139 | 83 % | 2.32 | 214.41 | tp3 sl9 tr1.2 h96 (12 · 47.30 · 20.01) |
| Signals | follow | sig-sar-s@m15 | 26 | 20 (77 %) | 234 | 79 % | 1.67 | 211.60 | tp5 sl15 tr2 h96 (9 · ∞ (no loss) · 23.55) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 24 (80 %) | 198 | 80 % | 1.71 | 202.83 | tp5 sl15 tr3 h96 (7 · 97.16 · 24.86) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 22 (73 %) | 157 | 75 % | 2.18 | 199.86 | tp5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-macd-cross-m@m15 | 29 | 25 (86 %) | 169 | 82 % | 1.91 | 180.49 | tp4 sl12 tr1.6 h96 (10 · 3176.91 · 23.86) |
| Signals | follow | sig-ema-pullback-s@m15 | 29 | 20 (69 %) | 266 | 73 % | 1.43 | 179.35 | tp5 sl15 tr2 h96 (9 · 6084.02 · 26.73) |
| Signals | follow | sig-stoch-rsi-s@m15 | 28 | 23 (82 %) | 210 | 74 % | 1.70 | 178.85 | tp8 sl24 tr3.2 h96 (6 · 66.51 · 17.56) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 25 (83 %) | 127 | 73 % | 2.33 | 172.05 | tp5 sl15 tr2 h96 (8 · 51.81 · 10.18) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 22 (73 %) | 230 | 76 % | 1.56 | 163.42 | tp4 sl12 tr1.6 h96 (13 · 7.15 · 19.12) |
| Signals | follow | sig-swing-s@m15 | 30 | 21 (70 %) | 267 | 77 % | 1.39 | 162.74 | tp5 sl15 tr2 h96 (12 · 142.21 · 26.57) |
| Signals | follow | sig-cmf-s@m15 | 30 | 19 (63 %) | 139 | 76 % | 1.70 | 158.64 | tp3 sl9 tr1.2 h96 (12 · 1.65 · 6.11) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 29 (97 %) | 55 | 76 % | 5.88 | 139.08 | tp2.5 sl3.75 tr0 h96 (6 · 1.16 · 1.30) |
| Signals | follow | sig-r-connors-s@m15 | 28 | 28 (100 %) | 40 | 98 % | 198.86 | 124.83 | – |
| Signals | follow | sig-r-connors-m@m15 | 27 | 21 (78 %) | 109 | 73 % | 2.19 | 122.93 | tp2.5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-impulse-m@m15 | 29 | 18 (62 %) | 125 | 77 % | 1.63 | 119.91 | tp5 sl7.5 tr0 h96 (5 · 2.49 · 11.50) |
| Signals | follow | sig-ema-slope-m@m15 | 27 | 23 (85 %) | 78 | 78 % | 2.70 | 114.06 | tp3 sl9 tr1.2 h96 (6 · 15.25 · 6.52) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 27 | 27 (100 %) | 27 | 100 % | ∞ (no loss) | 110.10 | – |
| Signals | follow | sig-r-awesome-s@m15 | 26 | 19 (73 %) | 137 | 77 % | 1.62 | 103.63 | tp4 sl12 tr1.6 h96 (9 · 99.66 · 14.79) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 17 (57 %) | 95 | 76 % | 1.69 | 103.41 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 14.67) |
| Signals | follow | sig-r-nr-break-s@m15 | 25 | 21 (84 %) | 95 | 80 % | 2.14 | 101.79 | tp3 sl9 tr1.2 h96 (10 · 32.53 · 15.71) |
| Signals | follow | sig-st-slow-m@m15 | 23 | 22 (96 %) | 37 | 92 % | 183.50 | 99.90 | – |
| Signals | follow | sig-cci-m@m15 | 30 | 19 (63 %) | 167 | 69 % | 1.40 | 93.52 | tp4 sl12 tr3.2 h96 (5 · 74.73 · 15.00) |
| Signals | follow | sig-rsi-mid-m@m15 | 28 | 19 (68 %) | 188 | 75 % | 1.31 | 93.45 | tp4 sl12 tr1.6 h96 (10 · ∞ (no loss) · 25.88) |
| Signals | follow | sig-swing-m@m15 | 30 | 19 (63 %) | 148 | 79 % | 1.45 | 92.77 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 9.42) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 26 | 19 (73 %) | 62 | 76 % | 2.18 | 92.71 | tp3 sl9 tr1.2 h96 (6 · 53.07 · 8.95) |
| Signals | follow | sig-sar-m@m15 | 30 | 18 (60 %) | 218 | 77 % | 1.23 | 88.19 | tp5 sl15 tr2 h96 (10 · 185.64 · 18.92) |
| Signals | follow | sig-r-nr-break-m@m15 | 29 | 22 (76 %) | 161 | 75 % | 1.35 | 82.53 | tp3 sl9 tr1.2 h96 (15 · 1.93 · 9.06) |
| Signals | follow | sig-r-linreg-m@m15 | 28 | 18 (64 %) | 190 | 69 % | 1.28 | 81.51 | tp6 sl18 tr2.4 h96 (9 · 16.81 · 23.00) |
| Signals | follow | sig-s2-vol-break-s@m15 | 23 | 19 (83 %) | 52 | 77 % | 2.84 | 80.98 | – |
| Signals | follow | sig-keltner-s@m15 | 30 | 18 (60 %) | 118 | 75 % | 1.40 | 74.37 | tp3 sl9 tr1.2 h96 (12 · 2.06 · 9.90) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 26 | 25 (96 %) | 35 | 89 % | 16.48 | 71.96 | – |
| Signals | follow | sig-zscore-m@m15 | 13 | 13 (100 %) | 52 | 79 % | 12.14 | 58.54 | tp2.5 sl3.75 tr0 h96 (6 · 2.91 · 7.55) |
| Signals | follow | sig-volume-break-m@m15 | 17 | 16 (94 %) | 30 | 83 % | 7.28 | 57.94 | – |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 15 (50 %) | 170 | 69 % | 1.16 | 55.44 | tp6 sl18 tr2.4 h96 (5 · 249.71 · 19.69) |
| Signals | follow | sig-supertrend-m@m15 | 16 | 11 (69 %) | 57 | 81 % | 2.98 | 53.70 | tp3 sl9 tr1.8 h96 (5 · ∞ (no loss) · 6.85) |
| Signals | follow | sig-s2-vol-break-m@m15 | 26 | 17 (65 %) | 51 | 63 % | 1.50 | 39.46 | – |
| Signals | follow | sig-s2-atr-break-s@m15 | 16 | 14 (88 %) | 65 | 80 % | 1.62 | 33.85 | tp3 sl9 tr1.8 h96 (7 · 253.59 · 9.00) |
| Signals | follow | sig-s2-range-break-s@m15 | 19 | 15 (79 %) | 42 | 69 % | 1.66 | 25.63 | – |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 16 (53 %) | 184 | 65 % | 1.06 | 23.73 | tp5 sl15 tr2 h96 (8 · 299.93 · 25.53) |
| Signals | follow | sig-s2-block-scale-s@m15 | 27 | 16 (59 %) | 252 | 70 % | 1.04 | 19.62 | tp6 sl18 tr2.4 h96 (9 · 35.55 · 27.71) |
| Signals | follow | sig-ema-cross-m@m15 | 15 | 12 (80 %) | 25 | 84 % | 2.28 | 17.95 | – |
| Signals | follow | sig-trix-m@m15 | 11 | 9 (82 %) | 21 | 67 % | 2.74 | 16.33 | tp3 sl9 tr1.2 h96 (5 · 12.31 · 3.62) |
| Signals | follow | sig-s2-st-trail-m@m15 | 13 | 10 (77 %) | 42 | 74 % | 1.37 | 15.00 | tp2.5 sl5 tr0 h96 (5 · 0.66 · -3.50) |
| Signals | follow | sig-s2-range-break-m@m15 | 16 | 13 (81 %) | 23 | 70 % | 1.19 | 4.26 | – |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 15 (50 %) | 133 | 69 % | 1.00 | 0.57 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 15.79) |
| Signals | follow | sig-hma-m@m15 | 26 | 15 (58 %) | 137 | 74 % | 1.00 | -0.38 | tp3 sl9 tr1.2 h96 (12 · 92.65 · 17.05) |
| Signals | follow | sig-r-vol-regime-s@m15 | 27 | 17 (63 %) | 52 | 65 % | 0.96 | -3.91 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-rsi-reversal-s@m15 | 15 | 8 (53 %) | 23 | 39 % | 0.53 | -10.79 | – |
| Signals | follow | sig-donchian-m@m15 | 25 | 11 (44 %) | 101 | 66 % | 0.91 | -15.96 | tp3 sl9 tr1.2 h96 (7 · 511.25 · 10.10) |
| Signals | follow | sig-ichimoku-m@m15 | 21 | 13 (62 %) | 49 | 61 % | 0.77 | -16.51 | – |
| Signals | follow | sig-r-fractal-s@m15 | 24 | 9 (38 %) | 93 | 69 % | 0.83 | -34.16 | tp2.5 sl3.75 tr0 h96 (6 · 2.91 · 7.55) |
| Signals | follow | sig-act-hf-m@m15 | 27 | 12 (44 %) | 159 | 66 % | 0.88 | -37.89 | tp4 sl12 tr1.6 h96 (11 · ∞ (no loss) · 21.35) |
| Signals | follow | sig-s2-range-shift-m@m15 | 25 | 12 (48 %) | 103 | 66 % | 0.79 | -40.51 | tp3 sl9 tr1.2 h96 (11 · 1.62 · 5.99) |
| Signals | follow | sig-ichimoku-s@m15 | 25 | 11 (44 %) | 106 | 72 % | 0.82 | -40.51 | tp2.5 sl5 tr0 h96 (7 · 2.65 · 8.60) |
| Signals | follow | sig-act-hf-s@m15 | 28 | 13 (46 %) | 218 | 69 % | 0.89 | -46.22 | tp6 sl18 tr2.4 h96 (9 · ∞ (no loss) · 27.34) |
| Signals | follow | sig-trix-s@m15 | 23 | 10 (43 %) | 73 | 66 % | 0.69 | -50.34 | tp3 sl9 tr1.2 h96 (7 · 49.13 · 8.19) |
| Signals | follow | sig-r-awesome-m@m15 | 25 | 7 (28 %) | 98 | 67 % | 0.76 | -51.98 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 9.22) |
| Signals | follow | sig-r-vol-regime-m@m15 | 8 | 0 (0 %) | 9 | 0 % | 0.00 | -52.52 | – |
| Signals | follow | sig-keltner-m@m15 | 21 | 6 (29 %) | 68 | 63 % | 0.56 | -59.62 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-r-session-trend-s@m15 | 28 | 11 (39 %) | 92 | 63 % | 0.73 | -62.51 | tp4 sl12 tr1.6 h96 (6 · ∞ (no loss) · 12.35) |
| Signals | follow | sig-s2-atr-break-m@m15 | 24 | 10 (42 %) | 112 | 62 % | 0.66 | -75.80 | tp4 sl12 tr1.6 h96 (11 · 241.70 · 12.03) |
| Signals | follow | sig-r-inside-s@m15 | 23 | 7 (30 %) | 48 | 63 % | 0.43 | -89.52 | – |
| Signals | follow | sig-squeeze-s@m15 | 13 | 2 (15 %) | 22 | 27 % | 0.06 | -99.56 | – |
| Signals | follow | sig-s2-range-shift-s@m15 | 20 | 6 (30 %) | 68 | 60 % | 0.38 | -108.21 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 6.52) |
| Signals | follow | sig-r-fractal-m@m15 | 21 | 2 (10 %) | 57 | 54 % | 0.32 | -126.02 | tp3 sl9 tr1.8 h96 (5 · 0.65 · -3.21) |
| Signals | follow | sig-s2-block-stack-s@m15 | 23 | 5 (22 %) | 101 | 56 % | 0.54 | -134.69 | tp4 sl12 tr1.6 h96 (5 · 0.94 · -0.73) |
| Signals | follow | sig-cmf-m@m15 | 28 | 6 (21 %) | 172 | 62 % | 0.69 | -137.48 | tp5 sl15 tr2 h96 (7 · 97.54 · 16.61) |
| Signals | follow | sig-s2-block-scale-m@m15 | 26 | 8 (31 %) | 174 | 60 % | 0.66 | -152.97 | tp6 sl18 tr2.4 h96 (7 · 32.99 · 25.65) |
| Signals | follow | sig-r-inside-m@m15 | 19 | 1 (5 %) | 19 | 5 % | 0.00 | -157.73 | – |
| Signals | follow | sig-r-session-trend-m@m15 | 28 | 8 (29 %) | 158 | 58 % | 0.53 | -197.22 | tp5 sl15 tr3 h96 (5 · 4.11 · 5.90) |
| Signals | follow | sig-thrust-s@m15 | 21 | 1 (5 %) | 81 | 44 % | 0.19 | -228.49 | tp3 sl4.5 tr0 h96 (5 · 0.40 · -8.50) |
| Signals | follow | sig-s2-block-stack-m@m15 | 20 | 1 (5 %) | 65 | 22 % | 0.05 | -367.18 | tp2.5 sl3.75 tr0 h96 (5 · 0.00 · -19.75) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 113 | 108 (96 %) | 828 | 87 % | 13.46 | 1690.64 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 108 | 101 (94 %) | 486 | 89 % | 20.33 | 1475.10 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 111 | 104 (94 %) | 558 | 85 % | 13.03 | 1374.13 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 116 | 95 (82 %) | 1077 | 86 % | 3.30 | 1371.99 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 93 | 93 (100 %) | 320 | 94 % | 596.95 | 1325.98 |
| Signals | tp 5.000% | sl 3.00× | tr off | 91 | 91 (100 %) | 246 | 100 % | ∞ (no loss) | 1180.80 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 92 | 91 (99 %) | 301 | 88 % | 14.32 | 1020.05 |
| Signals | tp 4.000% | sl 3.00× | tr off | 101 | 79 (78 %) | 421 | 90 % | 2.67 | 895.80 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 114 | 82 (72 %) | 687 | 81 % | 2.11 | 867.00 |
| Signals | tp 6.000% | sl 3.00× | tr off | 71 | 71 (100 %) | 141 | 100 % | ∞ (no loss) | 817.80 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 115 | 86 (75 %) | 1060 | 79 % | 1.84 | 790.65 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 82 | 79 (96 %) | 203 | 89 % | 12.53 | 789.81 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 118 | 90 (76 %) | 1396 | 74 % | 1.71 | 782.84 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 111 | 79 (71 %) | 548 | 81 % | 1.93 | 701.16 |
| Signals | tp 3.000% | sl 3.00× | tr off | 115 | 84 (73 %) | 708 | 85 % | 1.69 | 686.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 115 | 80 (70 %) | 819 | 81 % | 1.58 | 634.02 |
| Signals | tp 5.000% | sl 2.00× | tr off | 103 | 66 (64 %) | 368 | 78 % | 1.67 | 551.40 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 101 | 87 (86 %) | 365 | 83 % | 5.52 | 544.04 |
| Signals | tp 2.500% | sl 3.00× | tr off | 115 | 79 (69 %) | 912 | 83 % | 1.44 | 527.60 |
| Signals | tp 6.000% | sl 2.00× | tr off | 86 | 57 (66 %) | 216 | 81 % | 1.97 | 496.80 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 54 | 53 (98 %) | 93 | 92 % | 28.48 | 378.01 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 73 | 67 (92 %) | 162 | 82 % | 4.94 | 346.03 |
| Signals | tp 3.000% | sl 2.00× | tr off | 116 | 72 (62 %) | 834 | 73 % | 1.19 | 274.20 |
| Signals | tp 2.500% | sl 2.00× | tr off | 118 | 68 (58 %) | 1104 | 72 % | 1.15 | 236.70 |
| Signals | tp 4.000% | sl 2.00× | tr off | 106 | 62 (58 %) | 554 | 71 % | 1.16 | 209.20 |
| Short | tp 2.800% | sl 2.00× | tr off | 47 | 30 (64 %) | 65 | 95 % | 9.26 | 143.80 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 50 | 35 (70 %) | 79 | 86 % | 6.67 | 128.80 |
| Short | tp 2.600% | sl 2.00× | tr off | 41 | 25 (61 %) | 72 | 92 % | 4.89 | 126.00 |
| Signals | tp 6.000% | sl 1.50× | tr off | 97 | 48 (49 %) | 277 | 64 % | 1.13 | 121.60 |
| Short | tp 2.400% | sl 2.00× | tr off | 45 | 28 (62 %) | 78 | 91 % | 4.46 | 121.20 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 72 | 40 (56 %) | 95 | 95 % | 7.30 | 116.58 |
| Short | tp 2.800% | sl 1.50× | tr 0.50× | 55 | 37 (67 %) | 99 | 90 % | 5.07 | 107.86 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 49 | 30 (61 %) | 62 | 92 % | 7.04 | 106.18 |
| Short | tp 2.800% | sl 1.50× | tr off | 36 | 22 (61 %) | 65 | 86 % | 3.68 | 106.00 |
| Short | tp 2.200% | sl 2.00× | tr off | 50 | 31 (62 %) | 75 | 91 % | 4.22 | 103.80 |
| Short | tp 2.400% | sl 2.00× | tr 0.75× | 44 | 28 (64 %) | 66 | 79 % | 9.75 | 99.11 |
| Short | tp 2.200% | sl 2.00× | tr 0.50× | 51 | 29 (57 %) | 79 | 92 % | 6.44 | 91.78 |
| Short | tp 2.600% | sl 1.50× | tr off | 36 | 19 (53 %) | 75 | 81 % | 2.55 | 89.00 |
| Long | tp 5.200% | sl 1.00× | tr 0.50× | 42 | 18 (43 %) | 42 | 76 % | 4.46 | 79.09 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 58 | 27 (47 %) | 84 | 87 % | 4.26 | 78.69 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 4.000% | sl 1.50× | tr off | 108 | 50 (46 %) | 645 | 60 % | 0.92 | -129.00 |
| Signals | tp 5.000% | sl 1.50× | tr off | 105 | 46 (44 %) | 434 | 60 % | 0.93 | -91.80 |
| Wide | tp 0.800% | sl 1.00× | tr off | 130 | 27 (21 %) | 117 | 38 % | 0.43 | -58.54 |
| Signals | tp 2.500% | sl 1.50× | tr off | 118 | 59 (50 %) | 1301 | 63 % | 0.98 | -38.95 |
| Wide | tp 0.760% | sl 0.89× | tr off | 38 | 0 (0 %) | 23 | 0 % | 0.00 | -27.30 |
| Long | tp 6.000% | sl 0.50× | tr off | 39 | 3 (8 %) | 16 | 19 % | 0.42 | -24.20 |
| Long | tp 5.600% | sl 0.50× | tr off | 32 | 3 (9 %) | 22 | 23 % | 0.53 | -24.00 |
| Long | tp 6.400% | sl 0.50× | tr off | 40 | 3 (8 %) | 15 | 20 % | 0.46 | -22.20 |
| Long | tp 5.200% | sl 0.50× | tr off | 26 | 4 (15 %) | 23 | 26 % | 0.63 | -17.60 |
| Micro | tp 0.600% (net 0.400%) | sl 4.75× | tr 0.75× | 38 | 5 (13 %) | 23 | 65 % | 0.37 | -10.03 |
| Micro | tp 0.600% (net 0.400%) | sl 5.00× | tr 0.75× | 40 | 7 (18 %) | 31 | 74 % | 0.55 | -7.58 |
| Long | tp 4.800% | sl 0.50× | tr off | 24 | 5 (21 %) | 24 | 33 % | 0.88 | -4.80 |
| Long | tp 5.600% | sl 1.00× | tr off | 53 | 9 (17 %) | 18 | 50 % | 0.93 | -3.60 |
| Micro | tp 0.600% (net 0.400%) | sl 5.00× | tr 0.50× | 32 | 6 (19 %) | 14 | 71 % | 0.60 | -2.78 |
| General | tp 3.200% | sl 1.00× | tr 0.50× | 32 | 10 (31 %) | 37 | 62 % | 0.93 | -2.38 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 40 (40) | 19116 | 9560 | 9560 | 0 | baseTarget 9556 |
| Micro | trailing | 40 (40) | 38232 | 19120 | 19120 | 0 | baseTarget 19112 |
| Short | normal | 253 (205) | 35280 | 10878 | 10878 | 0 | baseRange 16308 · baseTarget 8094 |
| Short | trailing | 253 (205) | 70560 | 21756 | 21756 | 0 | baseRange 32616 · baseTarget 16188 |
| General | normal | 253 (197) | 23520 | 7278 | 7278 | 0 | baseRange 12360 · baseTarget 3882 |
| General | trailing | 253 (197) | 15680 | 4852 | 4852 | 0 | baseRange 8240 · baseTarget 2588 |
| Long | normal | 253 (216) | 29400 | 11142 | 11142 | 0 | baseRange 13350 · baseTarget 4908 |
| Long | trailing | 253 (216) | 19600 | 7428 | 7428 | 0 | baseRange 8900 · baseTarget 3272 |
| Wide | axis | 293 (293) | 48060 | 48060 | 48060 | 0 | – |
| Wide | dca | 293 (293) | 4272 | 4272 | 4272 | 0 | – |
| Wide | dca-active | 293 (293) | 4272 | 4272 | 4272 | 0 | – |

Engine indications Base evaluated that built no set: 98 (dir-emax-20-50, dir-emax-5-13, ema-21-55, ema-stoch, ichi-cloud-20, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-20, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-iz-25, mc-mrsi2-10, mc-qrsi2-5, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi2-5, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-25, mc-rsi4-30, mc-rsi5-25, mc-rsi5-30, mc-rsi7-20, mc-rsi7-25, mc-rsi7-30, mc-rsi9-15, mc-rsi9-25, mc-rsi9-30, mc-rsidiv-14, mc-rsimid-14, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.62 (216) | 0.70 (270) | 0.54 (264) | 0.50 (348) | 0.59 (444) |
| 1.14× | – | 0.63 (180) | – | – | – | – | – |
| 1.25× | – | 0.64 (180) | 0.65 (210) | 0.64 (270) | 0.50 (264) | 0.63 (348) | 0.76 (426) |
| 1.33× | 0.14 (156) | – | – | – | – | – | – |
| 1.5× | 0.17 (150) | 0.65 (174) | 0.62 (210) | 0.56 (270) | 0.83 (240) | 0.63 (324) | 0.71 (426) |
| 1.75× | 0.18 (150) | 0.58 (174) | 0.79 (210) | 0.89 (246) | 0.84 (240) | 0.60 (324) | 0.63 (426) |
| 2× | 0.16 (150) | 0.77 (174) | 0.75 (204) | 0.98 (246) | 0.76 (240) | 0.54 (324) | 0.68 (426) |
| 2.25× | 0.15 (150) | 0.75 (168) | 0.85 (204) | 0.89 (246) | 0.69 (240) | 0.62 (324) | 0.66 (426) |
| 2.5× | 0.19 (150) | 0.89 (168) | 0.78 (204) | 0.82 (246) | 0.72 (240) | 0.62 (324) | 0.85 (408) |
| 2.75× | 0.17 (150) | 0.83 (168) | 0.72 (204) | 0.84 (246) | 0.76 (240) | 0.70 (324) | 0.79 (408) |
| 3× | 0.19 (150) | 0.77 (168) | 0.67 (204) | 0.87 (246) | 0.82 (240) | 0.65 (324) | 0.85 (408) |
| 3.25× | 0.18 (150) | 0.72 (168) | 0.71 (204) | 0.93 (246) | 0.77 (240) | 0.71 (324) | 0.80 (408) |
| 3.5× | 0.17 (150) | 0.68 (168) | 0.74 (204) | 0.88 (246) | 0.83 (240) | 0.67 (324) | 0.75 (408) |
| 3.75× | 0.16 (150) | 0.64 (168) | 0.81 (204) | 0.83 (246) | 0.79 (240) | 0.63 (324) | 0.71 (408) |
| 4× | 0.15 (150) | 0.68 (168) | 0.77 (204) | 0.89 (246) | 0.75 (240) | 0.60 (324) | 0.68 (408) |
| 4.25× | 0.14 (150) | 0.77 (168) | 0.73 (204) | 0.84 (246) | 0.71 (240) | 0.57 (326) | 0.85 (390) |
| 4.5× | 0.17 (150) | 0.73 (168) | 0.78 (204) | 0.80 (246) | 0.68 (240) | 0.55 (326) | 1.04 (378) |
| 4.75× | 0.19 (150) | 0.70 (168) | 0.75 (204) | 0.76 (246) | 0.65 (240) | 1.17 (288) | 1.00 (378) |
| 5× | 0.19 (150) | 0.77 (168) | 0.72 (204) | 0.73 (246) | 1.14 (222) | 1.13 (288) | 0.96 (378) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | ∞ (2) | ∞ (4) | ∞ (2) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | ∞ (2) | 0.23 (10) | ∞ (2) |
| 1.75× | – | – | ∞ (4) | – | ∞ (2) | ∞ (2) | ∞ (2) |
| 2× | – | – | ∞ (2) | – | – | ∞ (2) | ∞ (2) |
| 2.25× | – | – | – | ∞ (2) | – | ∞ (2) | ∞ (2) |
| 2.5× | – | – | – | ∞ (2) | – | ∞ (4) | ∞ (2) |
| 2.75× | – | – | – | – | ∞ (2) | ∞ (2) | ∞ (10) |
| 3× | – | – | – | – | – | ∞ (8) | ∞ (12) |
| 3.25× | – | – | – | – | – | ∞ (8) | 0.93 (12) |
| 3.5× | – | – | – | – | ∞ (6) | 0.99 (14) | 0.70 (10) |
| 3.75× | – | – | ∞ (2) | ∞ (6) | ∞ (6) | 0.93 (14) | ∞ (14) |
| 4× | – | – | ∞ (2) | ∞ (6) | ∞ (6) | 1.31 (20) | ∞ (14) |
| 4.25× | – | ∞ (4) | ∞ (8) | ∞ (6) | ∞ (12) | ∞ (14) | ∞ (18) |
| 4.5× | – | ∞ (4) | ∞ (8) | ∞ (6) | ∞ (12) | ∞ (14) | 2.66 (23) |
| 4.75× | – | ∞ (8) | ∞ (8) | ∞ (12) | ∞ (12) | ∞ (14) | 0.49 (37) |
| 5× | ∞ (2) | ∞ (8) | ∞ (8) | ∞ (12) | ∞ (12) | ∞ (22) | 0.70 (53) |

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
| 2.5× | – | – | – | – | – | – | – |
| 2.75× | – | – | – | – | – | – | – |
| 3× | – | – | – | – | – | – | ∞ (2) |
| 3.25× | – | – | – | – | – | – | – |
| 3.5× | – | – | – | – | – | – | – |
| 3.75× | – | – | ∞ (2) | – | – | – | ∞ (2) |
| 4× | – | – | ∞ (1) | – | – | – | ∞ (1) |
| 4.25× | – | – | – | – | – | – | – |
| 4.5× | – | – | – | – | – | – | – |
| 4.75× | – | – | – | – | – | – | 0.26 (6) |
| 5× | – | – | – | – | – | – | 0.37 (4) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.93 (3131) | 1.08 (3250) | 1.19 (3180) | 1.16 (2997) | 1.11 (3170) | 1.12 (3499) |
| 1.5× | 1.04 (2995) | 1.04 (2939) | 1.30 (2864) | 1.33 (2708) | 1.39 (2853) | 1.61 (3080) |
| 2× | 1.34 (2857) | 1.35 (2819) | 1.51 (2707) | 2.04 (2465) | 1.96 (2598) | 2.22 (2904) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.93 (106) | 2.25 (141) | 2.10 (131) | 1.26 (180) | 1.38 (170) | 1.48 (146) |
| 1.5× | 1.04 (242) | 1.11 (153) | 1.53 (149) | 1.93 (164) | 2.26 (214) | 4.00 (213) |
| 2× | 2.74 (253) | 1.85 (212) | 4.43 (220) | 5.24 (228) | 5.09 (215) | 7.85 (222) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 2.26 (38) | 2.47 (43) | 6.03 (49) | 2.54 (63) | 2.71 (69) | 3.16 (44) |
| 1.5× | 1.61 (59) | 0.94 (48) | 1.36 (59) | 2.15 (51) | 2.44 (78) | 5.48 (65) |
| 2× | 2.07 (78) | 1.96 (79) | 4.62 (96) | 3.40 (78) | 5.78 (77) | 3.66 (74) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.91 (811) | 0.82 (751) | 1.06 (936) | 1.05 (903) |
| 0.75× | 1.22 (680) | 1.03 (612) | 1.14 (761) | 1.11 (719) |
| 1× | 1.29 (1867) | 1.28 (1713) | 1.37 (2212) | 1.62 (2050) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.67 (8) | 1.70 (12) | 2.42 (12) | 1.50 (13) |
| 0.75× | 1.85 (26) | 1.43 (20) | 1.29 (25) | 1.60 (28) |
| 1× | 0.94 (70) | 2.92 (97) | 4.33 (68) | 5.69 (77) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | – | – | ∞ (1) | ∞ (2) |
| 0.75× | ∞ (2) | ∞ (2) | ∞ (2) | ∞ (2) |
| 1× | ∞ (4) | ∞ (2) | – | ∞ (4) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.06 (954) | 0.75 (913) | 0.70 (868) | 0.56 (750) | 0.64 (906) |
| 0.75× | 1.18 (752) | 1.00 (720) | 1.11 (635) | 1.00 (546) | 0.96 (681) |
| 1× | 1.40 (2033) | 1.09 (2126) | 1.02 (2002) | 0.92 (1856) | 0.79 (2434) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.88 (24) | 0.63 (23) | 0.53 (22) | 0.42 (16) | 0.46 (15) |
| 0.75× | 1.34 (40) | 1.92 (36) | 1.90 (28) | 1.35 (23) | 1.77 (17) |
| 1× | 4.63 (73) | 2.55 (76) | 2.16 (64) | 2.15 (52) | 1.38 (81) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 3.54 (3) | 3.57 (3) | 2.70 (5) | 0.00 (3) | 0.00 (3) |
| 0.75× | 3.63 (4) | 3.66 (4) | ∞ (3) | – | 0.00 (1) |
| 1× | 3.71 (16) | 2.77 (20) | 1.32 (16) | 0.31 (11) | 0.12 (7) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.64 (5212) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.51 (217) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.68 (17737) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.69 (207) | 1.16 (683) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.57 (201) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 1.06 (563) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 1.13 (541) | – | – | – | – |
| 1× | – | – | – | 0.66 (62955) | – | – | – | 0.59 (23836) | 0.66 (2420) | – | 0.68 (940) | – | 0.78 (2102) | 0.82 (1866) | 0.80 (718) | 1.06 (515) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 2.17 (53) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.00 (23) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.43 (117) | – | – | – | 1.84 (225) | – | – | – | – | – | – | – | – |

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
