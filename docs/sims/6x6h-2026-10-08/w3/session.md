# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 15m, 15m+), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.39–$0.53 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T06:00 → 2026-10-07T12:00 UTC. Engine: Base 1375/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 328/19072 · PF 1.56 · Micro 122/5900 · PF 2.13 · Short 663/8176 · PF 1.54 · General 557/8176 · PF 1.48 · Long 647/8176 · PF 1.47 · Signals 126/126; Main 1358 pairs, 211760 tapes, Real seats: 4437 engine configs + 3780 signal configs (every config of the active signals), compute 303 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.95 (4.77 %, closed orders) · equity at end $20.55 (open at end: 29 positions / 2347 orders, MTM -$0.40 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 2.00 (gross profit $ ÷ gross loss $ as sized) · PF unit 3.93 (every order at one unit: the engine's PF) · 33 positions / 918 orders (incl. 221 capped to $0) · WR 87.58 % · DDT (closed trades, $) 4.17 h · DDR 0.69 · equity max drawdown $1.96 (9.78 %) · margin used max $14.65 · open avg 16.88 pos / 351.58 orders (peak 24 / 679)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 221 orders capped to $0, 571 scaled down (open at end: 287 capped, 1923 scaled) · binding: position cap 1758, gross cap 2858. **Without the caps:** balance $20.00 → $26.69 (33.44 %) · PF $ 3.96 · equity at end $27.52 · equity max drawdown $5.26 (21.23 %) · margin used max $105.70 · infeasible: margin exceeded equity for 286 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 445 | 1223  | 4.9 % | 1.535 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 445 | 1223 (+0) | 4.9 % | 1.535 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 445 | 1221 (-2) | 4.9 % | 1.535 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 383 | 1078 (-145) | 4.3 % | 1.590 |
| closes ≥ 6 | 1.00 | 6 | 1 | 642 | 1563 (+340) | 6.3 % | 1.779 |
| closes ≥ 20 | 1.00 | 20 | 1 | 329 | 951 (-272) | 3.8 % | 1.410 |
| closes ≥ 30 | 1.00 | 30 | 1 | 245 | 748 (-475) | 3.0 % | 1.345 |
| DDR off | 1.00 | 12 | off | 1605 | 2785 (+1562) | 11.2 % | 1.134 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 765 | 1790 (+567) | 7.2 % | 1.330 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 178 | 537 (-686) | 2.2 % | 2.050 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1605 | 2785 (+1562) | 11.2 % | 1.134 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1992 | 3262 (+2039) | 13.1 % | 1.165 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 0 / 17 | 8 / 9 | 0.27 | 0.27 | 47 % | -$0.16 | $19.84 | $18.91 | $18.67 | 6.77 % | 0.97 | $11.07 | 14 / 390 |
| 07:00 | 1 / 14 | 6 / 8 | 0.77 | 0.24 | 43 % | -$0.01 | $19.83 | $18.32 | $18.26 | 8.79 % | 1.97 | $13.90 | 22 / 1110 |
| 08:00 | 1 / 29 | 10 / 19 | 0.01 | 0.15 | 34 % | -$0.47 | $19.36 | $18.78 | $18.06 | 9.78 % | 2.97 | $13.88 | 26 / 1595 |
| 09:00 | 3 / 282 | 253 / 29 | 12.37 | 6.87 | 90 % | $0.54 | $19.90 | $19.33 | $18.73 | 9.78 % | 0.32 | $13.93 | 28 / 1977 |
| 10:00 | 1 / 290 | 270 / 20 | 21.80 | 16.12 | 93 % | $0.34 | $20.24 | $19.58 | $19.21 | 9.78 % | 1.32 | $14.17 | 28 / 2112 |
| 11:00 | 2 / 286 | 257 / 29 | 5.30 | 4.39 | 90 % | $0.71 | $20.95 | $20.55 | $19.45 | 9.78 % | 0.33 | $14.65 | 29 / 2347 |

**Last hour (11:00):** open at end: 29 positions / 2347 orders, MTM -$0.40 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $20.55 = balance $20.95 + MTM -$0.40.

**Hours positive:** 3 of 6 full hours · flat 0 · negative 3

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 15m | 15m+ |
|---|---:|---:|---:|
| 06:00 | 3 · ∞ (no loss) · $0.00 | 14 · 0.26 · -$0.17 | – |
| 07:00 | 3 · ∞ (no loss) · $0.00 | 11 · 0.71 · -$0.01 | – |
| 08:00 | – | 29 · 0.01 · -$0.47 | – |
| 09:00 | 6 · 0.00 · -$0.00 | 264 · 16.66 · $0.49 | 12 · 4.10 · $0.05 |
| 10:00 | 9 · 0.10 · -$0.01 | 263 · 28.40 · $0.30 | 18 · ∞ (no loss) · $0.05 |
| 11:00 | 3 · – · $0.00 | 279 · 5.00 · $0.67 | 4 · ∞ (no loss) · $0.05 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 17 | 3 · ∞ (no loss) · 100 % · $0.00 | – | 10 · 0.13 · 20 % · -$0.17 | 4 · 1.29 · 75 % · $0.01 | – | 14 · 0.26 · 36 % · -$0.17 |
| 07:00 | 14 | 3 · ∞ (no loss) · 100 % · $0.00 | – | 6 · 0.72 · 17 % · -$0.01 | 5 · 0.00 · 40 % · -$0.00 | – | 11 · 0.71 · 27 % · -$0.01 |
| 08:00 | 29 | – | – | 16 · 0.00 · 19 % · -$0.26 | 13 · 0.01 · 54 % · -$0.22 | – | 29 · 0.01 · 34 % · -$0.47 |
| 09:00 | 282 | 12 · 8.02 · 67 % · $0.06 | 6 · 0.00 · 33 % · -$0.01 | 164 · 9.48 · 90 % · $0.25 | 100 · 153.75 · 96 % · $0.24 | – | 264 · 16.66 · 92 % · $0.49 |
| 10:00 | 290 | 17 · 6.34 · 82 % · $0.03 | 10 · ∞ (no loss) · 100 % · $0.01 | 90 · 12.50 · 93 % · $0.11 | 173 · 183.37 · 94 % · $0.19 | – | 263 · 28.40 · 94 % · $0.30 |
| 11:00 | 286 | 7 · ∞ (no loss) · 100 % · $0.05 | – | 167 · 4.13 · 87 % · $0.35 | 112 · 6.85 · 94 % · $0.31 | – | 279 · 5.00 · 90 % · $0.67 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1249 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (211760 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (8536); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 26103 · 0.77 | 5219 · 0.70 | 8960 · 0.70 | 1542 · 1.58 | 17 · 0.27 | 3 · ∞ (no loss) | – | – | 14 · 0.26 |
| 07:00 | 24576 · 0.90 | 3923 · 1.08 | 6417 · 1.32 | 1139 · 3.96 | 14 · 0.24 | 3 · ∞ (no loss) | – | – | 11 · 0.22 |
| 08:00 | 37027 · 0.53 | 9147 · 0.69 | 11081 · 0.58 | 1881 · 0.84 | 29 · 0.15 | – | – | – | 29 · 0.15 |
| 09:00 | 67999 · 1.01 | 18927 · 1.15 | 25502 · 1.06 | 5897 · 1.19 | 282 · 6.87 | 12 · 3.15 | 6 · 0.39 | – | 264 · 8.06 |
| 10:00 | 45220 · 0.82 | 8296 · 0.84 | 16710 · 1.10 | 2964 · 1.61 | 290 · 16.12 | 17 · 4.91 | 10 · ∞ (no loss) | – | 263 · 17.25 |
| 11:00 | 55242 · 0.86 | 16261 · 1.21 | 18196 · 0.82 | 4308 · 1.50 | 286 · 4.39 | 7 · ∞ (no loss) | – | – | 279 · 4.31 |
| **total** | **256167 · 0.83** | **61773 · 1.00** | **86866 · 0.89** | **17731 · 1.33** | **918 · 3.93** | **42 · 5.06** | **16 · 3.70** | **–** | **860 · 3.91** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 42 | 35 / 7 | 11.31 | 5.06 | $0.14 | 83.33 % | 2.17 |
| Trailing | 16 | 12 / 4 | 1.67 | 3.70 | $0.01 | 75.00 % | 4.50 |
| Signal · Normal | 453 | 382 / 71 | 1.45 | 2.73 | $0.29 | 84.33 % | 5.50 |
| Signal · Trailing | 407 | 375 / 32 | 2.75 | 8.09 | $0.53 | 92.14 % | 3.00 |
| total | 918 | 804 / 114 | 2.00 | 3.93 | $0.95 | 87.58 % | 4.17 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 860 | 757 / 103 | 1.87 | 3.91 | $0.81 | 88.02 % | 4.25 |
| of which Engine (no signals) | 58 | 47 / 11 | 7.69 | 4.54 | $0.14 | 81.03 % | 2.17 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 24 | 0.87 | 0.29 | -$0.00 |
| 15m | 860 | 1.87 | 3.91 | $0.81 |
| 15m+ | 34 | 10.38 | 13.28 | $0.14 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 24 | 15 / 9 | 0.87 | 0.29 | -$0.00 | 62.50 % | 2.25 |
| Short | 0 | 0 / 0 | – | – | $0.00 | – | – |
| General | 34 | 32 / 2 | 10.38 | 13.28 | $0.14 | 94.12 % | 3.75 |
| Long | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 860 | 757 / 103 | 1.87 | 3.91 | $0.81 | 88.02 % | 4.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 34645 | sig:confirm 16618 · sig:duplicate 6699 · sig:signalCluster 5178 · sig:signalPf 5004 · sig:signalSide 1146 |
| Micro | 2120 | crowd 1722 · engineSide 292 · lastN 106 |
| Short | 1783 | lastN 1026 · engineSide 540 · symPf 217 |
| Long | 1257 | lastN 779 · engineSide 411 · symPf 67 |
| General | 385 | lastN 238 · engineSide 85 · symPf 62 |
| Wide | 116 | engineSide 78 · lastN 29 · symPf 9 |

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
| Micro | 2.13 | 0.29 | 0.14 | 0.87 | 2.98 | 24 |
| Short | 1.54 | – | – | – | – | 0 |
| General | 1.48 | 13.28 | 9.01 | 10.38 | 0.78 | 34 |
| Long | 1.47 | – | – | – | – | 0 |
| Wide | 1.56 | – | – | – | – | 0 |
| Signals | – | 3.91 | – | 1.87 | 0.48 | 860 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (5732 of 158641 evaluated, 207980 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3430 units active at the run start, 3978 over the run, 2804 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 733 | 55 (8 %) | 927 | 56 % | 0.19 | -611.55 |
| Micro | trailing | 1185 | 178 (15 %) | 2183 | 55 % | 0.25 | -987.60 |
| Short | normal | 664 | 55 (8 %) | 420 | 50 % | 0.59 | -329.20 |
| Short | trailing | 1228 | 105 (9 %) | 914 | 47 % | 0.55 | -666.86 |
| General | normal | 354 | 5 (1 %) | 151 | 30 % | 0.43 | -219.60 |
| General | trailing | 263 | 3 (1 %) | 130 | 38 % | 0.33 | -211.27 |
| Long | normal | 580 | 26 (4 %) | 205 | 20 % | 0.29 | -544.50 |
| Long | trailing | 466 | 24 (5 %) | 218 | 38 % | 0.21 | -593.10 |
| Wide | axis | 259 | 18 (7 %) | 131 | 27 % | 0.41 | -55.15 |
| Signals | normal | 1461 | 831 (57 %) | 6852 | 70 % | 1.20 | 2491.85 |
| Signals | trailing | 1343 | 1142 (85 %) | 5600 | 84 % | 3.97 | 9154.06 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1918 | 233 (12 %) | 3110 | 55 % | 0.23 | -1599.15 |
| Short | active | 52 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | bollinger | 56 | 0 (0 %) | 16 | 50 % | 0.34 | -16.31 |
| Short | break | 379 | 38 (10 %) | 42 | 98 % | 16.42 | 83.29 |
| Short | channel | 51 | 6 (12 %) | 10 | 60 % | 4.85 | 1.45 |
| Short | direction | 65 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | ema | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 14.76 |
| Short | ichimoku | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -5.80 |
| Short | macd | 53 | 0 (0 %) | 47 | 40 % | 0.36 | -71.15 |
| Short | move | 446 | 36 (8 %) | 146 | 53 % | 0.94 | -8.40 |
| Short | osc | 458 | 65 (14 %) | 395 | 53 % | 0.65 | -211.18 |
| Short | rsi | 58 | 2 (3 %) | 24 | 17 % | 0.09 | -51.76 |
| Short | sar | 4 | 0 (0 %) | 20 | 20 % | 0.12 | -67.40 |
| Short | trend | 138 | 6 (4 %) | 160 | 50 % | 0.58 | -132.13 |
| Short | volume | 124 | 0 (0 %) | 466 | 39 % | 0.43 | -531.43 |
| General | active | 41 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 37 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 115 | 1 (1 %) | 1 | 100 % | ∞ (no loss) | 4.20 |
| General | channel | 34 | 0 (0 %) | 18 | 39 % | 0.69 | -12.60 |
| General | direction | 20 | 2 (10 %) | 3 | 67 % | 5.02 | 2.75 |
| General | ema | 1 | 1 (100 %) | 5 | 60 % | 1.36 | 3.00 |
| General | ichimoku | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -8.10 |
| General | macd | 32 | 0 (0 %) | 3 | 0 % | 0.00 | -11.90 |
| General | move | 134 | 1 (1 %) | 10 | 10 % | 0.04 | -30.33 |
| General | osc | 103 | 3 (3 %) | 30 | 43 % | 0.71 | -16.45 |
| General | rsi | 35 | 0 (0 %) | 2 | 0 % | 0.00 | -0.19 |
| General | sar | 13 | 0 (0 %) | 47 | 2 % | 0.00 | -184.60 |
| General | trend | 21 | 0 (0 %) | 29 | 45 % | 0.32 | -44.38 |
| General | volume | 29 | 0 (0 %) | 131 | 42 % | 0.55 | -132.27 |
| Long | active | 18 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | bollinger | 30 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 181 | 10 (6 %) | 40 | 40 % | 0.52 | -66.15 |
| Long | channel | 71 | 4 (6 %) | 15 | 60 % | 1.23 | 5.86 |
| Long | direction | 53 | 2 (4 %) | 2 | 100 % | ∞ (no loss) | 12.00 |
| Long | ichimoku | 12 | 0 (0 %) | 8 | 0 % | 0.00 | -39.00 |
| Long | macd | 74 | 0 (0 %) | 4 | 0 % | 0.00 | -20.40 |
| Long | move | 147 | 11 (7 %) | 34 | 41 % | 0.99 | -0.42 |
| Long | osc | 338 | 19 (6 %) | 142 | 32 % | 0.17 | -436.39 |
| Long | rsi | 30 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | sar | 19 | 0 (0 %) | 73 | 7 % | 0.01 | -341.16 |
| Long | smooth | 2 | 0 (0 %) | 3 | 33 % | 0.13 | -10.80 |
| Long | trend | 31 | 0 (0 %) | 27 | 30 % | 0.06 | -93.42 |
| Long | volume | 40 | 4 (10 %) | 75 | 32 % | 0.39 | -147.72 |
| Wide | active | 27 | 0 (0 %) | 11 | 0 % | 0.00 | -9.18 |
| Wide | break | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | channel | 39 | 6 (15 %) | 54 | 17 % | 0.30 | -27.25 |
| Wide | direction | 3 | 3 (100 %) | 18 | 67 % | 1.61 | 5.53 |
| Wide | ema | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 59 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | osc | 65 | 6 (9 %) | 9 | 67 % | 1.70 | 1.47 |
| Wide | rsi | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -15.33 |
| Wide | sar | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | smooth | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 6 | 3 (50 %) | 9 | 67 % | 2.57 | 3.30 |
| Wide | volume | 3 | 0 (0 %) | 15 | 20 % | 0.22 | -13.69 |
| Signals | signal:act-burst | 37 | 34 (92 %) | 137 | 85 % | 4.87 | 275.48 |
| Signals | signal:act-hf | 53 | 45 (85 %) | 263 | 86 % | 3.01 | 399.76 |
| Signals | signal:adx | 39 | 8 (21 %) | 100 | 46 % | 0.32 | -239.68 |
| Signals | signal:atr-break | 48 | 28 (58 %) | 229 | 75 % | 1.20 | 71.86 |
| Signals | signal:bollinger | 50 | 50 (100 %) | 176 | 88 % | 7.24 | 424.27 |
| Signals | signal:cci | 45 | 34 (76 %) | 184 | 72 % | 1.78 | 161.03 |
| Signals | signal:cmf | 52 | 13 (25 %) | 301 | 61 % | 0.59 | -328.26 |
| Signals | signal:donchian | 51 | 36 (71 %) | 255 | 78 % | 1.81 | 236.70 |
| Signals | signal:ema-cross | 41 | 16 (39 %) | 137 | 62 % | 0.85 | -46.32 |
| Signals | signal:ema-cross-fast | 60 | 34 (57 %) | 316 | 65 % | 1.08 | 49.66 |
| Signals | signal:ema-pullback | 51 | 30 (59 %) | 172 | 67 % | 1.24 | 65.54 |
| Signals | signal:ema-slope | 35 | 16 (46 %) | 160 | 64 % | 0.87 | -39.87 |
| Signals | signal:ema-trend | 57 | 41 (72 %) | 209 | 73 % | 1.95 | 267.58 |
| Signals | signal:heikin-ashi | 55 | 35 (64 %) | 339 | 74 % | 1.49 | 203.84 |
| Signals | signal:hma | 60 | 55 (92 %) | 293 | 84 % | 3.70 | 516.65 |
| Signals | signal:ichimoku | 41 | 20 (49 %) | 147 | 67 % | 0.75 | -77.02 |
| Signals | signal:impulse | 48 | 41 (85 %) | 263 | 86 % | 3.93 | 423.63 |
| Signals | signal:kama | 56 | 53 (95 %) | 406 | 83 % | 3.00 | 716.72 |
| Signals | signal:keltner | 50 | 45 (90 %) | 144 | 90 % | 4.34 | 258.19 |
| Signals | signal:macd-cross | 56 | 52 (93 %) | 325 | 89 % | 6.15 | 695.56 |
| Signals | signal:macd-hist | 57 | 50 (88 %) | 423 | 81 % | 2.64 | 629.64 |
| Signals | signal:macd-slow | 55 | 49 (89 %) | 318 | 82 % | 3.03 | 518.30 |
| Signals | signal:mfi | 21 | 16 (76 %) | 31 | 77 % | 2.87 | 49.65 |
| Signals | signal:obv | 48 | 23 (48 %) | 273 | 70 % | 0.97 | -15.15 |
| Signals | signal:r-awesome | 54 | 40 (74 %) | 165 | 79 % | 2.52 | 266.66 |
| Signals | signal:r-connors | 50 | 40 (80 %) | 162 | 86 % | 2.66 | 205.85 |
| Signals | signal:r-fractal | 46 | 37 (80 %) | 152 | 84 % | 2.51 | 204.55 |
| Signals | signal:r-linreg | 43 | 40 (93 %) | 179 | 83 % | 4.61 | 296.26 |
| Signals | signal:r-nr-break | 43 | 38 (88 %) | 163 | 81 % | 2.98 | 228.62 |
| Signals | signal:r-vol-regime | 42 | 29 (69 %) | 77 | 77 % | 1.13 | 15.76 |
| Signals | signal:reclaim | 60 | 51 (85 %) | 416 | 76 % | 2.52 | 608.31 |
| Signals | signal:rsi-mid | 52 | 29 (56 %) | 262 | 71 % | 1.02 | 10.97 |
| Signals | signal:rsi-reversal | 31 | 30 (97 %) | 67 | 91 % | 281.01 | 203.68 |
| Signals | signal:s2-active-hf | 60 | 45 (75 %) | 467 | 73 % | 1.48 | 339.49 |
| Signals | signal:s2-adx-gate | 50 | 22 (44 %) | 255 | 65 % | 0.86 | -65.64 |
| Signals | signal:s2-atr-break | 45 | 15 (33 %) | 142 | 58 % | 0.55 | -166.64 |
| Signals | signal:s2-bb-bounce | 60 | 59 (98 %) | 202 | 90 % | 8.19 | 578.31 |
| Signals | signal:s2-block-scale | 46 | 12 (26 %) | 228 | 57 % | 0.57 | -240.05 |
| Signals | signal:s2-block-stack | 49 | 32 (65 %) | 199 | 71 % | 1.30 | 94.72 |
| Signals | signal:s2-confluence | 58 | 54 (93 %) | 389 | 79 % | 3.69 | 657.52 |
| Signals | signal:s2-ema-cross | 19 | 0 (0 %) | 25 | 24 % | 0.06 | -153.71 |
| Signals | signal:s2-range-break | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.10 |
| Signals | signal:s2-range-shift | 44 | 14 (32 %) | 152 | 49 % | 0.23 | -481.72 |
| Signals | signal:s2-rsi-revert | 50 | 43 (86 %) | 84 | 86 % | 8.31 | 195.80 |
| Signals | signal:s2-st-trail | 47 | 27 (57 %) | 133 | 73 % | 1.69 | 112.04 |
| Signals | signal:s2-stoch-swing | 60 | 56 (93 %) | 367 | 86 % | 4.93 | 797.00 |
| Signals | signal:s2-vol-break | 38 | 18 (47 %) | 55 | 56 % | 0.77 | -28.33 |
| Signals | signal:s2-vwap-axis | 10 | 10 (100 %) | 20 | 100 % | ∞ (no loss) | 43.74 |
| Signals | signal:sar | 59 | 52 (88 %) | 443 | 81 % | 2.01 | 570.64 |
| Signals | signal:squeeze | 27 | 20 (74 %) | 68 | 81 % | 1.70 | 66.85 |
| Signals | signal:st-slow | 47 | 30 (64 %) | 127 | 77 % | 2.64 | 199.73 |
| Signals | signal:stoch-rsi | 56 | 35 (63 %) | 259 | 78 % | 1.59 | 199.13 |
| Signals | signal:supertrend | 53 | 19 (36 %) | 187 | 63 % | 0.77 | -99.69 |
| Signals | signal:swing | 55 | 30 (55 %) | 266 | 65 % | 0.88 | -62.62 |
| Signals | signal:thrust | 46 | 37 (80 %) | 204 | 84 % | 3.23 | 325.36 |
| Signals | signal:trix | 60 | 28 (47 %) | 167 | 61 % | 0.81 | -77.12 |
| Signals | signal:volume-break | 7 | 5 (71 %) | 8 | 75 % | 22.95 | 4.62 |
| Signals | signal:vwap | 45 | 28 (62 %) | 183 | 64 % | 1.22 | 56.47 |
| Signals | signal:williams-r | 60 | 60 (100 %) | 399 | 91 % | 10.51 | 1055.66 |
| Signals | signal:zscore | 60 | 58 (97 %) | 173 | 89 % | 7.28 | 455.80 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 47040 | 27924 | 1918 | 0.83 | 4.00 | 78.75–163.33 (median 163.33) | 2940 | 15728 | 528 | 3549 | 1751 | 141 | 1274 | 0 | 95 | 0 | 0 | 0 | 19116 |  |
| Short | 46852 | 38968 | 1892 | 1.25 | 1.95 | 163.33–163.33 (median 163.33) | 3688 | 7982 | 1830 | 7460 | 5763 | 4158 | 5676 | 45 | 472 | 2 | 0 | 0 | 7884 |  |
| General | 16618 | 13698 | 617 | 1.30 | 2.21 | 163.33–163.33 (median 163.33) | 1322 | 2100 | 628 | 2782 | 2109 | 1256 | 2701 | 0 | 173 | 10 | 0 | 0 | 2920 |  |
| Long | 25496 | 21846 | 1046 | 1.23 | 2.24 | 163.33–163.33 (median 163.33) | 1753 | 5130 | 1170 | 5100 | 2365 | 1770 | 3192 | 0 | 289 | 31 | 0 | 0 | 3650 |  |
| Wide | 71974 | 56205 | 259 | 0.64 | 3.19 | 20.42–163.33 (median 163.33) | 12603 | 35426 | 964 | 4612 | 1043 | 203 | 984 | 0 | 91 | 20 | 0 | 10864 | 4905 |  |
| Signals | 3780 | – | 3430 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 3430 units (pair × symbol × direction) active at the run start, 3978 over the run; 2804 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 15714 | 1510 (10 %) | 12444 | 68 % | 0.40 | -3273.85 |
| Micro | trailing | 31326 | 2486 (8 %) | 25270 | 54 % | 0.39 | -5618.82 |
| Short | normal | 15611 | 1710 (11 %) | 17030 | 52 % | 0.72 | -7245.10 |
| Short | trailing | 31241 | 3561 (11 %) | 40411 | 51 % | 0.61 | -19116.91 |
| General | normal | 9963 | 1061 (11 %) | 9173 | 38 % | 0.81 | -2939.60 |
| General | trailing | 6655 | 515 (8 %) | 5065 | 48 % | 0.54 | -4081.10 |
| Long | normal | 15287 | 1625 (11 %) | 8773 | 39 % | 0.88 | -2392.50 |
| Long | trailing | 10209 | 758 (7 %) | 4070 | 52 % | 0.59 | -4246.49 |
| Wide | axis | 61110 | 7352 (12 %) | 96220 | 29 % | 0.58 | -28878.09 |
| Wide | dca | 5432 | 884 (16 %) | 6197 | 66 % | 0.63 | -3746.98 |
| Wide | dca-active | 5432 | 602 (11 %) | 5111 | 30 % | 0.47 | -2594.69 |
| Signals | normal | 1890 | 1246 (66 %) | 14353 | 77 % | 1.84 | 16260.90 |
| Signals | trailing | 1890 | 1544 (82 %) | 12050 | 86 % | 6.80 | 24192.29 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1918 | 233 (12 %) | 3110 | 55 % | 0.23 | -1599.15 |
| Short | active | 52 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | bollinger | 56 | 0 (0 %) | 16 | 50 % | 0.34 | -16.31 |
| Short | break | 379 | 38 (10 %) | 42 | 98 % | 16.42 | 83.29 |
| Short | channel | 51 | 6 (12 %) | 10 | 60 % | 4.85 | 1.45 |
| Short | direction | 65 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | ema | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 14.76 |
| Short | ichimoku | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -5.80 |
| Short | macd | 53 | 0 (0 %) | 47 | 40 % | 0.36 | -71.15 |
| Short | move | 446 | 36 (8 %) | 146 | 53 % | 0.94 | -8.40 |
| Short | osc | 458 | 65 (14 %) | 395 | 53 % | 0.65 | -211.18 |
| Short | rsi | 58 | 2 (3 %) | 24 | 17 % | 0.09 | -51.76 |
| Short | sar | 4 | 0 (0 %) | 20 | 20 % | 0.12 | -67.40 |
| Short | trend | 138 | 6 (4 %) | 160 | 50 % | 0.58 | -132.13 |
| Short | volume | 124 | 0 (0 %) | 466 | 39 % | 0.43 | -531.43 |
| General | active | 41 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 37 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 115 | 1 (1 %) | 1 | 100 % | ∞ (no loss) | 4.20 |
| General | channel | 34 | 0 (0 %) | 18 | 39 % | 0.69 | -12.60 |
| General | direction | 20 | 2 (10 %) | 3 | 67 % | 5.02 | 2.75 |
| General | ema | 1 | 1 (100 %) | 5 | 60 % | 1.36 | 3.00 |
| General | ichimoku | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -8.10 |
| General | macd | 32 | 0 (0 %) | 3 | 0 % | 0.00 | -11.90 |
| General | move | 134 | 1 (1 %) | 10 | 10 % | 0.04 | -30.33 |
| General | osc | 103 | 3 (3 %) | 30 | 43 % | 0.71 | -16.45 |
| General | rsi | 35 | 0 (0 %) | 2 | 0 % | 0.00 | -0.19 |
| General | sar | 13 | 0 (0 %) | 47 | 2 % | 0.00 | -184.60 |
| General | trend | 21 | 0 (0 %) | 29 | 45 % | 0.32 | -44.38 |
| General | volume | 29 | 0 (0 %) | 131 | 42 % | 0.55 | -132.27 |
| Long | active | 18 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | bollinger | 30 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 181 | 10 (6 %) | 40 | 40 % | 0.52 | -66.15 |
| Long | channel | 71 | 4 (6 %) | 15 | 60 % | 1.23 | 5.86 |
| Long | direction | 53 | 2 (4 %) | 2 | 100 % | ∞ (no loss) | 12.00 |
| Long | ichimoku | 12 | 0 (0 %) | 8 | 0 % | 0.00 | -39.00 |
| Long | macd | 74 | 0 (0 %) | 4 | 0 % | 0.00 | -20.40 |
| Long | move | 147 | 11 (7 %) | 34 | 41 % | 0.99 | -0.42 |
| Long | osc | 338 | 19 (6 %) | 142 | 32 % | 0.17 | -436.39 |
| Long | rsi | 30 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | sar | 19 | 0 (0 %) | 73 | 7 % | 0.01 | -341.16 |
| Long | smooth | 2 | 0 (0 %) | 3 | 33 % | 0.13 | -10.80 |
| Long | trend | 31 | 0 (0 %) | 27 | 30 % | 0.06 | -93.42 |
| Long | volume | 40 | 4 (10 %) | 75 | 32 % | 0.39 | -147.72 |
| Wide | active | 27 | 0 (0 %) | 11 | 0 % | 0.00 | -9.18 |
| Wide | break | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | channel | 39 | 6 (15 %) | 54 | 17 % | 0.30 | -27.25 |
| Wide | direction | 3 | 3 (100 %) | 18 | 67 % | 1.61 | 5.53 |
| Wide | ema | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 59 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | osc | 65 | 6 (9 %) | 9 | 67 % | 1.70 | 1.47 |
| Wide | rsi | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -15.33 |
| Wide | sar | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | smooth | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 6 | 3 (50 %) | 9 | 67 % | 2.57 | 3.30 |
| Wide | volume | 3 | 0 (0 %) | 15 | 20 % | 0.22 | -13.69 |
| Signals | signal:act-burst | 37 | 34 (92 %) | 137 | 85 % | 4.87 | 275.48 |
| Signals | signal:act-hf | 53 | 45 (85 %) | 263 | 86 % | 3.01 | 399.76 |
| Signals | signal:adx | 39 | 8 (21 %) | 100 | 46 % | 0.32 | -239.68 |
| Signals | signal:atr-break | 48 | 28 (58 %) | 229 | 75 % | 1.20 | 71.86 |
| Signals | signal:bollinger | 50 | 50 (100 %) | 176 | 88 % | 7.24 | 424.27 |
| Signals | signal:cci | 45 | 34 (76 %) | 184 | 72 % | 1.78 | 161.03 |
| Signals | signal:cmf | 52 | 13 (25 %) | 301 | 61 % | 0.59 | -328.26 |
| Signals | signal:donchian | 51 | 36 (71 %) | 255 | 78 % | 1.81 | 236.70 |
| Signals | signal:ema-cross | 41 | 16 (39 %) | 137 | 62 % | 0.85 | -46.32 |
| Signals | signal:ema-cross-fast | 60 | 34 (57 %) | 316 | 65 % | 1.08 | 49.66 |
| Signals | signal:ema-pullback | 51 | 30 (59 %) | 172 | 67 % | 1.24 | 65.54 |
| Signals | signal:ema-slope | 35 | 16 (46 %) | 160 | 64 % | 0.87 | -39.87 |
| Signals | signal:ema-trend | 57 | 41 (72 %) | 209 | 73 % | 1.95 | 267.58 |
| Signals | signal:heikin-ashi | 55 | 35 (64 %) | 339 | 74 % | 1.49 | 203.84 |
| Signals | signal:hma | 60 | 55 (92 %) | 293 | 84 % | 3.70 | 516.65 |
| Signals | signal:ichimoku | 41 | 20 (49 %) | 147 | 67 % | 0.75 | -77.02 |
| Signals | signal:impulse | 48 | 41 (85 %) | 263 | 86 % | 3.93 | 423.63 |
| Signals | signal:kama | 56 | 53 (95 %) | 406 | 83 % | 3.00 | 716.72 |
| Signals | signal:keltner | 50 | 45 (90 %) | 144 | 90 % | 4.34 | 258.19 |
| Signals | signal:macd-cross | 56 | 52 (93 %) | 325 | 89 % | 6.15 | 695.56 |
| Signals | signal:macd-hist | 57 | 50 (88 %) | 423 | 81 % | 2.64 | 629.64 |
| Signals | signal:macd-slow | 55 | 49 (89 %) | 318 | 82 % | 3.03 | 518.30 |
| Signals | signal:mfi | 21 | 16 (76 %) | 31 | 77 % | 2.87 | 49.65 |
| Signals | signal:obv | 48 | 23 (48 %) | 273 | 70 % | 0.97 | -15.15 |
| Signals | signal:r-awesome | 54 | 40 (74 %) | 165 | 79 % | 2.52 | 266.66 |
| Signals | signal:r-connors | 50 | 40 (80 %) | 162 | 86 % | 2.66 | 205.85 |
| Signals | signal:r-fractal | 46 | 37 (80 %) | 152 | 84 % | 2.51 | 204.55 |
| Signals | signal:r-linreg | 43 | 40 (93 %) | 179 | 83 % | 4.61 | 296.26 |
| Signals | signal:r-nr-break | 43 | 38 (88 %) | 163 | 81 % | 2.98 | 228.62 |
| Signals | signal:r-vol-regime | 42 | 29 (69 %) | 77 | 77 % | 1.13 | 15.76 |
| Signals | signal:reclaim | 60 | 51 (85 %) | 416 | 76 % | 2.52 | 608.31 |
| Signals | signal:rsi-mid | 52 | 29 (56 %) | 262 | 71 % | 1.02 | 10.97 |
| Signals | signal:rsi-reversal | 31 | 30 (97 %) | 67 | 91 % | 281.01 | 203.68 |
| Signals | signal:s2-active-hf | 60 | 45 (75 %) | 467 | 73 % | 1.48 | 339.49 |
| Signals | signal:s2-adx-gate | 50 | 22 (44 %) | 255 | 65 % | 0.86 | -65.64 |
| Signals | signal:s2-atr-break | 45 | 15 (33 %) | 142 | 58 % | 0.55 | -166.64 |
| Signals | signal:s2-bb-bounce | 60 | 59 (98 %) | 202 | 90 % | 8.19 | 578.31 |
| Signals | signal:s2-block-scale | 46 | 12 (26 %) | 228 | 57 % | 0.57 | -240.05 |
| Signals | signal:s2-block-stack | 49 | 32 (65 %) | 199 | 71 % | 1.30 | 94.72 |
| Signals | signal:s2-confluence | 58 | 54 (93 %) | 389 | 79 % | 3.69 | 657.52 |
| Signals | signal:s2-ema-cross | 19 | 0 (0 %) | 25 | 24 % | 0.06 | -153.71 |
| Signals | signal:s2-range-break | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.10 |
| Signals | signal:s2-range-shift | 44 | 14 (32 %) | 152 | 49 % | 0.23 | -481.72 |
| Signals | signal:s2-rsi-revert | 50 | 43 (86 %) | 84 | 86 % | 8.31 | 195.80 |
| Signals | signal:s2-st-trail | 47 | 27 (57 %) | 133 | 73 % | 1.69 | 112.04 |
| Signals | signal:s2-stoch-swing | 60 | 56 (93 %) | 367 | 86 % | 4.93 | 797.00 |
| Signals | signal:s2-vol-break | 38 | 18 (47 %) | 55 | 56 % | 0.77 | -28.33 |
| Signals | signal:s2-vwap-axis | 10 | 10 (100 %) | 20 | 100 % | ∞ (no loss) | 43.74 |
| Signals | signal:sar | 59 | 52 (88 %) | 443 | 81 % | 2.01 | 570.64 |
| Signals | signal:squeeze | 27 | 20 (74 %) | 68 | 81 % | 1.70 | 66.85 |
| Signals | signal:st-slow | 47 | 30 (64 %) | 127 | 77 % | 2.64 | 199.73 |
| Signals | signal:stoch-rsi | 56 | 35 (63 %) | 259 | 78 % | 1.59 | 199.13 |
| Signals | signal:supertrend | 53 | 19 (36 %) | 187 | 63 % | 0.77 | -99.69 |
| Signals | signal:swing | 55 | 30 (55 %) | 266 | 65 % | 0.88 | -62.62 |
| Signals | signal:thrust | 46 | 37 (80 %) | 204 | 84 % | 3.23 | 325.36 |
| Signals | signal:trix | 60 | 28 (47 %) | 167 | 61 % | 0.81 | -77.12 |
| Signals | signal:volume-break | 7 | 5 (71 %) | 8 | 75 % | 22.95 | 4.62 |
| Signals | signal:vwap | 45 | 28 (62 %) | 183 | 64 % | 1.22 | 56.47 |
| Signals | signal:williams-r | 60 | 60 (100 %) | 399 | 91 % | 10.51 | 1055.66 |
| Signals | signal:zscore | 60 | 58 (97 %) | 173 | 89 % | 7.28 | 455.80 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 24 | 22 (92 %) | 84 | 100 % | ∞ (no loss) | 32.70 |
| Micro | 1.25 | 24 | 22 (92 %) | 84 | 100 % | ∞ (no loss) | 32.70 |
| Micro | 1.35 | 24 | 22 (92 %) | 84 | 100 % | ∞ (no loss) | 32.70 |
| Micro | 1.5 | 22 | 20 (91 %) | 72 | 100 % | ∞ (no loss) | 28.50 |
| Micro | 1.75 | 10 | 9 (90 %) | 34 | 100 % | ∞ (no loss) | 13.60 |
| Micro | 2 | 3 | 3 (100 %) | 14 | 100 % | ∞ (no loss) | 5.60 |
| Short | 1.1 | 835 | 115 (14 %) | 1005 | 45 % | 0.52 | -866.09 |
| Short | 1.25 | 770 | 101 (13 %) | 921 | 45 % | 0.52 | -800.61 |
| Short | 1.35 | 693 | 84 (12 %) | 832 | 44 % | 0.50 | -753.77 |
| Short | 1.5 | 553 | 69 (12 %) | 694 | 45 % | 0.51 | -628.28 |
| Short | 1.75 | 352 | 43 (12 %) | 476 | 44 % | 0.47 | -488.95 |
| Short | 2 | 239 | 23 (10 %) | 293 | 43 % | 0.44 | -327.14 |
| General | 1.1 | 134 | 7 (5 %) | 219 | 34 % | 0.40 | -331.95 |
| General | 1.25 | 118 | 6 (5 %) | 183 | 36 % | 0.42 | -259.85 |
| General | 1.35 | 101 | 6 (6 %) | 149 | 42 % | 0.54 | -148.85 |
| General | 1.5 | 86 | 5 (6 %) | 103 | 42 % | 0.50 | -108.26 |
| General | 1.75 | 51 | 2 (4 %) | 56 | 41 % | 0.45 | -67.61 |
| General | 2 | 28 | 1 (4 %) | 32 | 41 % | 0.40 | -42.69 |
| Long | 1.1 | 331 | 46 (14 %) | 286 | 32 % | 0.34 | -644.37 |
| Long | 1.25 | 299 | 35 (12 %) | 232 | 32 % | 0.32 | -535.43 |
| Long | 1.35 | 258 | 28 (11 %) | 183 | 36 % | 0.33 | -408.73 |
| Long | 1.5 | 203 | 22 (11 %) | 141 | 38 % | 0.33 | -300.85 |
| Long | 1.75 | 135 | 12 (9 %) | 84 | 42 % | 0.32 | -175.28 |
| Long | 2 | 77 | 7 (9 %) | 55 | 38 % | 0.26 | -131.03 |
| Wide | 1.1 | 6 | 3 (50 %) | 33 | 45 % | 0.69 | -8.16 |
| Wide | 1.25 | 6 | 3 (50 %) | 33 | 45 % | 0.69 | -8.16 |
| Wide | 1.35 | 6 | 3 (50 %) | 33 | 45 % | 0.69 | -8.16 |
| Wide | 1.5 | 6 | 3 (50 %) | 33 | 45 % | 0.69 | -8.16 |
| Wide | 1.75 | 3 | 0 (0 %) | 15 | 20 % | 0.22 | -13.69 |
| Wide | 2 | 3 | 0 (0 %) | 15 | 20 % | 0.22 | -13.69 |
| Signals | 1.1 | 1239 | 996 (80 %) | 5231 | 82 % | 2.82 | 7901.31 |
| Signals | 1.25 | 786 | 664 (84 %) | 3332 | 83 % | 3.71 | 5602.08 |
| Signals | 1.35 | 587 | 508 (87 %) | 2555 | 84 % | 4.33 | 4354.16 |
| Signals | 1.5 | 386 | 339 (88 %) | 1807 | 84 % | 5.04 | 3096.37 |
| Signals | 1.75 | 191 | 169 (88 %) | 1028 | 82 % | 4.57 | 1530.08 |
| Signals | 2 | 124 | 108 (87 %) | 665 | 80 % | 4.86 | 975.13 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | sweep | mc-streak-6@m5 | 10 | 10 (100 %) | 60 | 100 % | ∞ (no loss) | 23.40 | tp0.6 sl2.55 tr0 h192 mc (6 · ∞ (no loss) · 2.40) |
| Micro | sweep | mc-tvwapd-3@m5 | 12 | 12 (100 %) | 24 | 100 % | ∞ (no loss) | 9.30 | – |
| Micro | sandwich | mc-ibrk@m5 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 4.02 | – |
| Micro | pulse | mc-ibrk@m5 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 4.02 | – |
| Micro | ribbon | mc-trsi2-10@m5 | 12 | 6 (50 %) | 12 | 50 % | 4.50 | 1.63 | – |
| Micro | clamp | mc-trsi2-10@m5 | 5 | 2 (40 %) | 5 | 40 % | 3.43 | 0.57 | – |
| Micro | pivot | mc-trsi2-10@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -0.47 | – |
| Micro | sweep | mc-rsi5-10@m5 | 16 | 0 (0 %) | 16 | 0 % | 0.00 | -35.10 | – |
| Micro | pulse | mc-rsi2-5@m5 | 64 | 0 (0 %) | 244 | 31 % | 0.10 | -167.36 | – |
| Micro | snap | mc-rsi2-5@m5 | 112 | 8 (7 %) | 316 | 35 % | 0.11 | -252.08 | – |
| Micro | ribbon | mc-rsi3-5@m5 | 234 | 54 (23 %) | 798 | 59 % | 0.24 | -395.83 | – |
| Micro | clamp | mc-rsi3-5@m5 | 234 | 54 (23 %) | 798 | 59 % | 0.24 | -395.83 | – |
| Micro | pivot | mc-rsi3-5@m5 | 234 | 54 (23 %) | 798 | 59 % | 0.24 | -395.83 | – |
| Short | sweep | break-squeeze-t10@m30 | 19 | 16 (84 %) | 16 | 100 % | ∞ (no loss) | 31.33 | – |
| Short | ribbon | r-fisher-m@m30 | 19 | 14 (74 %) | 57 | 67 % | 2.01 | 24.96 | – |
| Short | sweep | break-squeeze@m30 | 16 | 12 (75 %) | 12 | 100 % | ∞ (no loss) | 24.77 | – |
| Short | follow | r-capit@m15 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 20.00 | – |
| Short | sweep | break-squeeze-t25@m30 | 11 | 8 (73 %) | 8 | 100 % | ∞ (no loss) | 19.79 | – |
| Short | sweep | r-fvg@m30 | 6 | 6 (100 %) | 10 | 60 % | 30.57 | 18.83 | – |
| Short | clamp | willr-14-80@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 13.00 | – |
| Short | pivot | willr-50-95@m15 | 7 | 4 (57 %) | 20 | 70 % | 1.63 | 12.21 | – |
| Short | ribbon | ema-slope@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 10.46 | – |
| Short | pivot | willr-21-95@m15 | 9 | 4 (44 %) | 23 | 74 % | 1.33 | 9.06 | – |
| Short | ribbon | srsi-14-10@m15c | 1 | 1 (100 %) | 5 | 80 % | 1.79 | 4.60 | tp2.8 sl5.6 tr0 h96 sh (5 · 1.79 · 4.60) |
| Short | ribbon | willr-28-95@m15c | 11 | 7 (64 %) | 17 | 65 % | 1.14 | 2.82 | – |
| Short | magnet | r-camarilla@m15 | 25 | 6 (24 %) | 10 | 60 % | 4.85 | 1.45 | – |
| Short | revert | move-impulse-20-2.5@m15c | 9 | 5 (56 %) | 58 | 66 % | 1.01 | 0.36 | tp2.4 sl3.6 tr1.2 h64 sh (11 · 1.06 · 0.44) |
| Short | clamp | willr-7-90@m15c | 5 | 3 (60 %) | 7 | 71 % | 0.97 | -0.33 | – |
| Short | pivot | willr-7-90@m15c | 1 | 0 (0 %) | 5 | 60 % | 0.64 | -3.00 | tp2 sl4 tr1.5 h96 sh (5 · 0.64 · -3.00) |
| Short | follow | r-fvg@m30 | 4 | 0 (0 %) | 14 | 57 % | 0.73 | -5.22 | – |
| Short | ribbon | willr-14-90@m15 | 6 | 0 (0 %) | 18 | 67 % | 0.82 | -5.93 | – |
| Short | magnet | willr-28-95@m15c | 5 | 2 (40 %) | 10 | 50 % | 0.60 | -7.04 | – |
| Short | ribbon | willr-28-95@m15 | 19 | 9 (47 %) | 29 | 66 % | 0.83 | -7.96 | – |
| Short | sweep | r-fisher@m30 | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -9.70 | – |
| Short | ribbon | macd-hist-5-35-5@m30 | 2 | 0 (0 %) | 7 | 43 % | 0.27 | -10.12 | – |
| Short | ribbon | willr-21-95@m15 | 10 | 4 (40 %) | 19 | 53 % | 0.63 | -12.12 | – |
| Short | clamp | r-ultimate@m15 | 17 | 0 (0 %) | 51 | 47 % | 0.72 | -15.34 | – |
| Short | revert | bb-walk-50@m15 | 2 | 0 (0 %) | 16 | 50 % | 0.34 | -16.31 | tp2.6 sl3.9 tr1.3 h64 sh (8 · 0.34 · -8.15) |
| Short | ribbon | willr-50-95@m15c | 9 | 3 (33 %) | 29 | 45 % | 0.48 | -21.79 | – |
| Short | sweep | rsi-fast@m15 | 9 | 0 (0 %) | 10 | 0 % | 0.00 | -26.40 | – |
| Short | follow | r-td-m@m30 | 51 | 12 (24 %) | 51 | 24 % | 0.26 | -53.71 | – |
| Short | ribbon | willr-14-90@m30 | 15 | 0 (0 %) | 11 | 0 % | 0.00 | -55.80 | – |
| Short | sweep | r-tsi@m30 | 20 | 0 (0 %) | 40 | 40 % | 0.37 | -61.03 | – |
| Short | ribbon | sar-0.01@m15 | 4 | 0 (0 %) | 20 | 20 % | 0.12 | -67.40 | tp2.6 sl3.9 tr0 h64 sh (5 · 0.15 · -14.00) |
| Short | ribbon | r-chand-m@m15 | 78 | 4 (5 %) | 156 | 50 % | 0.59 | -125.73 | – |
| Short | ribbon | willr-7-90@m15c | 18 | 0 (0 %) | 63 | 29 % | 0.19 | -147.10 | – |
| Short | revert | r-klinger@m15c | 99 | 0 (0 %) | 466 | 39 % | 0.43 | -531.43 | tp2 sl2 tr1.5 h64 sh (5 · 0.68 · -2.13) |
| General | revert | ema-50-100@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.36 | 3.00 | tp4 sl4 tr0 h64 gn (5 · 1.36 · 3.00) |
| General | clamp | r-ultimate@m15 | 3 | 1 (33 %) | 8 | 38 % | 0.92 | -0.80 | – |
| General | pivot | willr-21-95@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.74 | -2.95 | – |
| General | sweep | squeeze-20@m15 | 7 | 0 (0 %) | 16 | 44 % | 0.79 | -7.40 | – |
| General | revert | r-qh-flow-m@m15c | 4 | 0 (0 %) | 24 | 50 % | 0.77 | -12.55 | tp4 sl4 tr0 h64 gn (6 · 0.90 · -1.20) |
| General | ribbon | willr-28-95@m15 | 5 | 0 (0 %) | 14 | 36 % | 0.40 | -20.70 | – |
| General | ribbon | r-chand-m@m15 | 16 | 0 (0 %) | 29 | 45 % | 0.32 | -44.38 | – |
| General | revert | r-klinger@m15c | 23 | 0 (0 %) | 107 | 40 % | 0.50 | -119.72 | tp3.2 sl2.4 tr0 h64 gn (5 · 0.77 · -1.80) |
| General | ribbon | sar-0.01@m15 | 11 | 0 (0 %) | 45 | 2 % | 0.00 | -177.00 | tp4 sl4 tr3 h96 gn (5 · 0.04 · -16.20) |
| Long | revert | move-impulse-20-2.5@m15c | 13 | 11 (85 %) | 22 | 64 % | 2.06 | 37.77 | – |
| Long | revert | break-vol-2@m30 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 26.60 | – |
| Long | revert | r-qh-flow-m@m15c | 1 | 0 (0 %) | 5 | 40 % | 0.82 | -2.50 | tp6 sl4.5 tr0 h64 lg (5 · 0.82 · -2.50) |
| Long | sweep | cci-20-100@m15c | 4 | 2 (50 %) | 16 | 50 % | 0.76 | -10.37 | – |
| Long | sweep | squeeze-20@m15 | 11 | 2 (18 %) | 11 | 45 % | 0.54 | -11.89 | – |
| Long | pivot | willr-50-95@m15c | 8 | 2 (25 %) | 6 | 50 % | 0.15 | -12.75 | – |
| Long | ribbon | willr-21-95@m15 | 9 | 1 (11 %) | 5 | 40 % | 0.12 | -13.24 | – |
| Long | ribbon | willr-28-95@m15c | 11 | 2 (18 %) | 5 | 40 % | 0.08 | -13.82 | – |
| Long | sweep | r-td-m@m15 | 9 | 0 (0 %) | 5 | 0 % | 0.00 | -18.00 | – |
| Long | follow | r-capit@m15 | 33 | 0 (0 %) | 7 | 0 % | 0.00 | -20.19 | – |
| Long | ribbon | willr-50-95@m15c | 5 | 0 (0 %) | 6 | 17 % | 0.04 | -25.53 | – |
| Long | revert | r-choch@m30 | 8 | 1 (13 %) | 11 | 27 % | 0.37 | -29.50 | – |
| Long | ribbon | willr-28-95@m15 | 21 | 5 (24 %) | 15 | 47 % | 0.16 | -30.74 | – |
| Long | ribbon | willr-7-90@m15c | 3 | 0 (0 %) | 10 | 30 % | 0.08 | -33.77 | – |
| Long | ribbon | ichi-tk-9@m15c | 12 | 0 (0 %) | 8 | 0 % | 0.00 | -39.00 | – |
| Long | revert | r-bos-m@m15 | 15 | 0 (0 %) | 20 | 20 % | 0.05 | -85.25 | – |
| Long | ribbon | r-chand-m@m15 | 18 | 0 (0 %) | 26 | 31 % | 0.07 | -86.82 | – |
| Long | magnet | willr-21-95@m15 | 24 | 0 (0 %) | 28 | 14 % | 0.02 | -137.44 | – |
| Long | revert | r-klinger@m15c | 39 | 4 (10 %) | 70 | 31 % | 0.36 | -145.22 | – |
| Long | magnet | willr-28-95@m15c | 32 | 0 (0 %) | 40 | 20 % | 0.03 | -177.75 | – |
| Long | ribbon | sar-0.01@m15 | 19 | 0 (0 %) | 73 | 7 % | 0.01 | -341.16 | tp5.2 sl5.2 tr2.6 h96 lg (5 · 0.05 · -20.58) |
| Wide | ribbon | dir-thrust-4@m5 | 3 | 3 (100 %) | 18 | 67 % | 1.61 | 5.53 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (6 · 1.61 · 1.84) |
| Wide | magnet | trend-adx-30@m5c | 3 | 3 (100 %) | 9 | 67 % | 2.57 | 3.30 | – |
| Wide | sweep | mc-z-20@m5c | 11 | 0 (0 %) | 11 | 0 % | 0.00 | -9.18 | – |
| Wide | revert | r-klinger@m15c | 3 | 0 (0 %) | 15 | 20 % | 0.22 | -13.69 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (5 · 0.22 · -4.56) |
| Wide | sweep | rsi-div@m15c | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -15.33 | – |
| Wide | ribbon | aroon-14@m5 | 21 | 3 (14 %) | 51 | 12 % | 0.18 | -31.91 | – |
| Signals | follow | sig-williams-r-m@m15 | 30 | 30 (100 %) | 189 | 93 % | 20.64 | 555.15 | tp3 sl6 tr0 h96 (8 · ∞ (no loss) · 22.40) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 30 (100 %) | 242 | 89 % | 6.41 | 540.46 | tp4 sl12 tr2.4 h96 (11 · 116.93 · 28.56) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 30 (100 %) | 210 | 89 % | 7.05 | 500.51 | tp4 sl8 tr0 h96 (7 · ∞ (no loss) · 26.60) |
| Signals | follow | sig-macd-slow-s@m15 | 29 | 29 (100 %) | 164 | 92 % | 10.77 | 431.13 | tp4 sl6 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 27 (90 %) | 234 | 79 % | 2.96 | 393.42 | tp5 sl15 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-kama-m@m15 | 28 | 26 (93 %) | 190 | 86 % | 4.13 | 393.26 | tp4 sl12 tr1.6 h96 (10 · 54.99 · 23.36) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 177 | 80 % | 7.12 | 382.56 | tp2.5 sl7.5 tr0 h96 (10 · ∞ (no loss) · 23.00) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 29 (97 %) | 155 | 88 % | 7.54 | 375.94 | tp4 sl8 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 29 (97 %) | 155 | 88 % | 7.54 | 375.94 | tp4 sl8 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-hma-s@m15 | 30 | 30 (100 %) | 172 | 88 % | 5.06 | 366.56 | tp3 sl9 tr1.8 h96 (9 · ∞ (no loss) · 21.00) |
| Signals | follow | sig-impulse-m@m15 | 28 | 28 (100 %) | 159 | 94 % | 9.24 | 364.05 | tp2.5 sl7.5 tr0 h96 (11 · ∞ (no loss) · 25.30) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 30 (100 %) | 136 | 89 % | 6.74 | 344.14 | tp4 sl12 tr1.6 h96 (6 · ∞ (no loss) · 14.24) |
| Signals | follow | sig-zscore-s@m15 | 30 | 30 (100 %) | 136 | 89 % | 6.74 | 344.14 | tp4 sl12 tr1.6 h96 (6 · ∞ (no loss) · 14.24) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 28 (93 %) | 158 | 91 % | 6.00 | 342.02 | tp2.5 sl5 tr0 h96 (9 · ∞ (no loss) · 20.70) |
| Signals | follow | sig-act-hf-s@m15 | 27 | 26 (96 %) | 163 | 90 % | 5.92 | 332.83 | tp4 sl12 tr3.2 h96 (7 · ∞ (no loss) · 26.60) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 30 (100 %) | 111 | 90 % | 8.03 | 323.65 | tp3 sl4.5 tr0 h96 (6 · 2.98 · 9.30) |
| Signals | follow | sig-kama-s@m15 | 28 | 27 (96 %) | 216 | 81 % | 2.38 | 323.46 | tp5 sl15 tr3 h96 (6 · ∞ (no loss) · 20.93) |
| Signals | follow | sig-macd-cross-m@m15 | 26 | 23 (88 %) | 170 | 89 % | 5.12 | 319.63 | tp3 sl9 tr1.2 h96 (13 · ∞ (no loss) · 23.30) |
| Signals | follow | sig-thrust-m@m15 | 28 | 26 (93 %) | 150 | 86 % | 4.88 | 314.68 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 20.10) |
| Signals | follow | sig-sar-m@m15 | 29 | 27 (93 %) | 189 | 86 % | 2.68 | 307.70 | tp3 sl4.5 tr0 h96 (10 · 5.36 · 20.50) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 104 | 91 % | 20.58 | 299.47 | tp4 sl12 tr1.6 h96 (6 · 88.72 · 12.72) |
| Signals | follow | sig-r-awesome-m@m15 | 26 | 26 (100 %) | 92 | 93 % | 273.21 | 286.11 | tp3 sl9 tr2.4 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-s2-confluence-m@m15 | 28 | 24 (86 %) | 212 | 78 % | 2.51 | 274.96 | tp4 sl12 tr2.4 h96 (8 · ∞ (no loss) · 24.16) |
| Signals | follow | sig-heikin-ashi-m@m15 | 25 | 22 (88 %) | 166 | 87 % | 4.77 | 274.60 | tp2.5 sl7.5 tr0 h96 (11 · ∞ (no loss) · 25.30) |
| Signals | follow | sig-sar-s@m15 | 30 | 25 (83 %) | 254 | 78 % | 1.68 | 262.95 | tp5 sl15 tr2 h96 (8 · ∞ (no loss) · 23.99) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 26 (87 %) | 125 | 81 % | 3.50 | 256.54 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 10.85) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 29 (97 %) | 91 | 90 % | 8.41 | 254.66 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-macd-hist-m@m15 | 27 | 21 (78 %) | 268 | 78 % | 1.78 | 253.70 | tp3 sl9 tr1.2 h96 (27 · 3.76 · 24.16) |
| Signals | follow | sig-act-burst-s@m15 | 27 | 25 (93 %) | 124 | 84 % | 4.53 | 250.89 | tp3 sl9 tr0 h96 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 24 (80 %) | 182 | 71 % | 2.07 | 214.89 | tp3 sl9 tr2.4 h96 (8 · 17.00 · 18.45) |
| Signals | follow | sig-rsi-reversal-s@m15 | 30 | 30 (100 %) | 66 | 92 % | 433.06 | 203.94 | tp3 sl9 tr1.2 h96 (5 · 18.53 · 5.02) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 24 (80 %) | 242 | 74 % | 1.58 | 201.47 | tp5 sl15 tr3 h96 (5 · 56.75 · 14.51) |
| Signals | follow | sig-donchian-s@m15 | 28 | 22 (79 %) | 166 | 81 % | 2.18 | 196.86 | tp3 sl9 tr1.8 h96 (10 · ∞ (no loss) · 19.63) |
| Signals | follow | sig-r-linreg-s@m15 | 22 | 22 (100 %) | 85 | 88 % | 11.26 | 193.85 | tp2.5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-r-nr-break-m@m15 | 25 | 23 (92 %) | 107 | 85 % | 4.18 | 181.52 | tp4 sl12 tr1.6 h96 (7 · ∞ (no loss) · 14.50) |
| Signals | follow | sig-r-fractal-s@m15 | 27 | 25 (93 %) | 99 | 88 % | 3.64 | 179.39 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 15.98) |
| Signals | follow | sig-ema-trend-m@m15 | 27 | 23 (85 %) | 79 | 82 % | 4.55 | 175.02 | tp3 sl9 tr1.2 h96 (6 · 21.11 · 5.70) |
| Signals | follow | sig-ichimoku-s@m15 | 21 | 20 (95 %) | 101 | 89 % | 4.96 | 173.24 | tp2.5 sl7.5 tr0 h96 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 28 (93 %) | 64 | 89 % | 8.21 | 163.81 | tp3 sl9 tr1.2 h96 (6 · 19.20 · 4.22) |
| Signals | follow | sig-keltner-m@m15 | 27 | 27 (100 %) | 52 | 98 % | 1484.91 | 156.24 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 5.42) |
| Signals | follow | sig-hma-m@m15 | 30 | 25 (83 %) | 121 | 78 % | 2.49 | 150.08 | tp3 sl9 tr2.4 h96 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-cci-s@m15 | 25 | 21 (84 %) | 162 | 72 % | 1.72 | 138.20 | tp5 sl15 tr2 h96 (11 · 3.78 · 14.27) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 21 (70 %) | 225 | 72 % | 1.37 | 138.02 | tp5 sl15 tr3 h96 (5 · 56.75 · 14.51) |
| Signals | follow | sig-s2-st-trail-s@m15 | 24 | 21 (88 %) | 83 | 78 % | 3.05 | 133.55 | tp4 sl12 tr1.6 h96 (5 · 62.51 · 8.92) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 22 (73 %) | 210 | 71 % | 1.42 | 130.91 | tp4 sl12 tr2.4 h96 (10 · 2.26 · 15.36) |
| Signals | follow | sig-atr-break-s@m15 | 29 | 22 (76 %) | 173 | 79 % | 1.51 | 116.11 | tp2.5 sl7.5 tr0 h96 (12 · 3.29 · 17.60) |
| Signals | follow | sig-rsi-mid-s@m15 | 27 | 19 (70 %) | 116 | 76 % | 1.74 | 115.45 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 12.98) |
| Signals | follow | sig-r-connors-m@m15 | 25 | 20 (80 %) | 92 | 86 % | 2.84 | 114.29 | tp2.5 sl3.75 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-zscore-m@m15 | 30 | 28 (93 %) | 37 | 89 % | 9.84 | 111.65 | tp3 sl9 tr1.2 h96 (5 · 52.95 · 1.62) |
| Signals | follow | sig-r-linreg-m@m15 | 21 | 18 (86 %) | 94 | 78 % | 2.62 | 102.42 | tp3 sl9 tr2.4 h96 (6 · ∞ (no loss) · 11.80) |
| Signals | follow | sig-keltner-s@m15 | 23 | 18 (78 %) | 92 | 85 % | 2.32 | 101.95 | tp3 sl9 tr1.8 h96 (8 · ∞ (no loss) · 13.94) |
| Signals | follow | sig-obv-m@m15 | 25 | 16 (64 %) | 149 | 76 % | 1.60 | 101.42 | tp3 sl9 tr1.2 h96 (16 · 89.93 · 17.62) |
| Signals | follow | sig-vwap-s@m15 | 30 | 21 (70 %) | 152 | 66 % | 1.54 | 100.56 | tp3 sl9 tr0 h96 (8 · 2.13 · 10.40) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 18 (60 %) | 130 | 67 % | 1.40 | 92.56 | tp5 sl15 tr2 h96 (5 · 10.81 · 11.31) |
| Signals | follow | sig-r-connors-s@m15 | 25 | 20 (80 %) | 70 | 87 % | 2.49 | 91.56 | tp3 sl9 tr1.2 h96 (5 · 149.29 · 5.69) |
| Signals | follow | sig-macd-slow-m@m15 | 26 | 20 (77 %) | 154 | 72 % | 1.41 | 87.16 | tp4 sl12 tr2.4 h96 (6 · ∞ (no loss) · 19.78) |
| Signals | follow | sig-bollinger-m@m15 | 20 | 20 (100 %) | 40 | 85 % | 10.99 | 80.12 | – |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 19 (63 %) | 126 | 72 % | 1.42 | 79.64 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 10.66) |
| Signals | follow | sig-s2-block-stack-s@m15 | 27 | 15 (56 %) | 135 | 74 % | 1.34 | 74.79 | tp4 sl12 tr1.6 h96 (6 · ∞ (no loss) · 16.57) |
| Signals | follow | sig-act-hf-m@m15 | 26 | 19 (73 %) | 100 | 78 % | 1.51 | 66.93 | tp4 sl12 tr2.4 h96 (5 · ∞ (no loss) · 9.99) |
| Signals | follow | sig-squeeze-s@m15 | 27 | 20 (74 %) | 68 | 81 % | 1.70 | 66.85 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-swing-m@m15 | 28 | 16 (57 %) | 138 | 72 % | 1.24 | 60.38 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 12.60) |
| Signals | follow | sig-impulse-s@m15 | 20 | 13 (65 %) | 104 | 75 % | 1.59 | 59.57 | tp3 sl9 tr1.2 h96 (13 · 67.07 · 14.22) |
| Signals | follow | sig-r-vol-regime-s@m15 | 18 | 13 (72 %) | 53 | 81 % | 1.97 | 52.58 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 10.06) |
| Signals | follow | sig-mfi-m@m15 | 21 | 16 (76 %) | 31 | 77 % | 2.87 | 49.65 | – |
| Signals | follow | sig-r-nr-break-s@m15 | 18 | 15 (83 %) | 56 | 73 % | 1.81 | 47.10 | tp3 sl9 tr1.2 h96 (7 · 63.86 · 6.74) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 10 | 10 (100 %) | 20 | 100 % | ∞ (no loss) | 43.74 | – |
| Signals | follow | sig-donchian-m@m15 | 23 | 14 (61 %) | 89 | 74 % | 1.31 | 39.84 | tp3 sl9 tr1.8 h96 (6 · ∞ (no loss) · 10.15) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 20 | 15 (75 %) | 20 | 75 % | 8.86 | 31.99 | – |
| Signals | follow | sig-ema-slope-s@m15 | 26 | 14 (54 %) | 145 | 69 % | 1.11 | 27.32 | tp4 sl12 tr2.4 h96 (7 · ∞ (no loss) · 19.58) |
| Signals | follow | sig-r-fractal-m@m15 | 19 | 12 (63 %) | 53 | 77 % | 1.37 | 25.16 | tp2.5 sl3.75 tr0 h96 (5 · 0.87 · -1.00) |
| Signals | follow | sig-act-burst-m@m15 | 10 | 9 (90 %) | 13 | 92 % | 234.49 | 24.58 | – |
| Signals | follow | sig-cci-m@m15 | 20 | 13 (65 %) | 22 | 68 % | 2.73 | 22.84 | – |
| Signals | follow | sig-s2-block-stack-m@m15 | 22 | 17 (77 %) | 64 | 64 % | 1.22 | 19.93 | tp3 sl9 tr1.2 h96 (6 · 1.26 · 0.79) |
| Signals | follow | sig-s2-atr-break-s@m15 | 23 | 12 (52 %) | 79 | 68 % | 1.09 | 12.29 | tp3 sl9 tr2.4 h96 (5 · 0.91 · -0.86) |
| Signals | follow | sig-thrust-s@m15 | 18 | 11 (61 %) | 54 | 78 % | 1.17 | 10.68 | tp2.5 sl3.75 tr0 h96 (7 · 0.78 · -2.65) |
| Signals | follow | sig-trix-m@m15 | 30 | 16 (53 %) | 48 | 67 % | 1.10 | 10.59 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.10 | – |
| Signals | follow | sig-volume-break-m@m15 | 4 | 3 (75 %) | 5 | 80 % | 40.48 | 4.16 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 11 | 9 (82 %) | 12 | 83 % | 1.42 | 3.63 | – |
| Signals | follow | sig-supertrend-m@m15 | 25 | 10 (40 %) | 55 | 67 % | 1.03 | 3.34 | – |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 12 (40 %) | 126 | 64 % | 0.97 | -8.98 | tp4 sl12 tr3.2 h96 (5 · 1.25 · 3.00) |
| Signals | follow | sig-ema-pullback-m@m15 | 21 | 11 (52 %) | 46 | 52 % | 0.83 | -14.10 | tp3 sl9 tr1.2 h96 (5 · 0.08 · -2.92) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 25 | 8 (32 %) | 73 | 60 % | 0.86 | -18.31 | tp4 sl12 tr1.6 h96 (5 · 31.47 · 3.21) |
| Signals | follow | sig-r-awesome-s@m15 | 28 | 14 (50 %) | 73 | 62 % | 0.89 | -19.44 | tp2.5 sl5 tr0 h96 (5 · 0.29 · -11.00) |
| Signals | follow | sig-s2-st-trail-m@m15 | 23 | 6 (26 %) | 50 | 64 % | 0.78 | -21.52 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 27 | 9 (33 %) | 43 | 49 % | 0.72 | -31.96 | – |
| Signals | follow | sig-adx-s@m15 | 19 | 7 (37 %) | 70 | 60 % | 0.75 | -35.66 | tp4 sl12 tr1.6 h96 (5 · 13.83 · 4.44) |
| Signals | follow | sig-r-vol-regime-m@m15 | 24 | 16 (67 %) | 24 | 67 % | 0.44 | -36.83 | – |
| Signals | follow | sig-s2-block-scale-s@m15 | 24 | 9 (38 %) | 127 | 65 % | 0.85 | -36.87 | tp3 sl9 tr2.4 h96 (7 · 1.83 · 7.60) |
| Signals | follow | sig-ema-cross-m@m15 | 11 | 4 (36 %) | 11 | 36 % | 0.10 | -37.35 | – |
| Signals | follow | sig-s2-range-shift-m@m15 | 20 | 13 (65 %) | 25 | 72 % | 0.43 | -37.54 | – |
| Signals | follow | sig-vwap-m@m15 | 15 | 7 (47 %) | 31 | 55 % | 0.37 | -44.09 | tp3 sl9 tr1.2 h96 (5 · 2.42 · 2.93) |
| Signals | follow | sig-atr-break-m@m15 | 19 | 6 (32 %) | 56 | 63 % | 0.68 | -44.25 | tp2.5 sl3.75 tr0 h96 (5 · 0.87 · -1.00) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 25 | 14 (56 %) | 182 | 66 % | 0.86 | -47.34 | tp3 sl9 tr2.4 h96 (9 · 2.43 · 13.20) |
| Signals | follow | sig-ema-slope-m@m15 | 9 | 2 (22 %) | 15 | 13 % | 0.06 | -67.18 | – |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 13 (43 %) | 173 | 62 % | 0.80 | -70.76 | tp3 sl4.5 tr0 h96 (14 · 1.49 · 9.20) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 12 (40 %) | 106 | 53 % | 0.73 | -81.25 | tp3 sl9 tr1.2 h96 (5 · 0.22 · -5.59) |
| Signals | follow | sig-trix-s@m15 | 30 | 12 (40 %) | 119 | 59 % | 0.70 | -87.71 | tp3 sl9 tr1.2 h96 (8 · 1.13 · 0.83) |
| Signals | follow | sig-cmf-m@m15 | 28 | 9 (32 %) | 172 | 69 % | 0.76 | -93.82 | tp4 sl12 tr2.4 h96 (7 · 1.34 · 4.16) |
| Signals | follow | sig-st-slow-m@m15 | 17 | 0 (0 %) | 23 | 13 % | 0.06 | -99.73 | – |
| Signals | follow | sig-supertrend-s@m15 | 28 | 9 (32 %) | 132 | 61 % | 0.70 | -103.03 | tp4 sl12 tr1.6 h96 (9 · 0.77 · -2.96) |
| Signals | follow | sig-rsi-mid-m@m15 | 25 | 10 (40 %) | 146 | 66 % | 0.68 | -104.48 | tp5 sl15 tr2 h96 (7 · 60.43 · 8.11) |
| Signals | follow | sig-obv-s@m15 | 23 | 7 (30 %) | 124 | 64 % | 0.56 | -116.57 | tp2.5 sl7.5 tr0 h96 (6 · 1.49 · 3.80) |
| Signals | follow | sig-swing-s@m15 | 27 | 14 (52 %) | 128 | 58 % | 0.57 | -123.00 | tp4 sl12 tr1.6 h96 (8 · 60.77 · 6.29) |
| Signals | follow | sig-stoch-rsi-s@m15 | 26 | 7 (27 %) | 101 | 57 % | 0.47 | -142.89 | tp3 sl9 tr2.4 h96 (6 · 0.96 · -0.36) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 19 | 0 (0 %) | 25 | 24 % | 0.06 | -153.71 | – |
| Signals | follow | sig-s2-atr-break-m@m15 | 22 | 3 (14 %) | 63 | 44 % | 0.23 | -178.94 | tp2.5 sl3.75 tr0 h96 (9 · 0.73 · -4.30) |
| Signals | follow | sig-s2-block-scale-m@m15 | 22 | 3 (14 %) | 101 | 47 % | 0.35 | -203.18 | tp3 sl9 tr1.2 h96 (6 · 0.71 · -2.69) |
| Signals | follow | sig-adx-m@m15 | 20 | 1 (5 %) | 30 | 13 % | 0.04 | -204.02 | – |
| Signals | follow | sig-cmf-s@m15 | 24 | 4 (17 %) | 129 | 50 % | 0.44 | -234.43 | tp4 sl12 tr1.6 h96 (5 · 0.70 · -4.12) |
| Signals | follow | sig-ichimoku-m@m15 | 20 | 0 (0 %) | 46 | 17 % | 0.04 | -250.26 | tp2.5 sl3.75 tr0 h96 (6 · 0.12 · -17.45) |
| Signals | follow | sig-s2-range-shift-s@m15 | 24 | 1 (4 %) | 127 | 44 % | 0.21 | -444.18 | tp2.5 sl3.75 tr0 h96 (11 · 0.70 · -5.95) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 94 | 88 (94 %) | 269 | 91 % | 23.11 | 843.55 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 107 | 100 (93 %) | 482 | 88 % | 14.48 | 833.78 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 108 | 89 (82 %) | 499 | 86 % | 3.10 | 830.39 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 83 | 79 (95 %) | 190 | 89 % | 23.15 | 762.84 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 104 | 86 (83 %) | 364 | 88 % | 3.03 | 746.86 |
| Signals | tp 5.000% | sl 3.00× | tr off | 80 | 78 (98 %) | 159 | 99 % | 24.79 | 723.20 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 114 | 88 (77 %) | 732 | 78 % | 2.62 | 687.45 |
| Signals | tp 4.000% | sl 3.00× | tr off | 103 | 81 (79 %) | 319 | 90 % | 2.70 | 684.20 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 104 | 94 (90 %) | 312 | 86 % | 23.49 | 641.52 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 109 | 77 (71 %) | 593 | 84 % | 2.01 | 615.20 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 77 | 72 (94 %) | 148 | 86 % | 129.35 | 595.13 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 115 | 85 (74 %) | 969 | 79 % | 2.06 | 588.63 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 113 | 81 (72 %) | 722 | 82 % | 2.04 | 573.82 |
| Signals | tp 3.000% | sl 3.00× | tr off | 106 | 71 (67 %) | 484 | 86 % | 1.89 | 551.20 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 61 | 60 (98 %) | 100 | 98 % | 3177.32 | 540.44 |
| Signals | tp 6.000% | sl 3.00× | tr off | 49 | 49 (100 %) | 82 | 100 % | ∞ (no loss) | 475.60 |
| Signals | tp 2.500% | sl 3.00× | tr off | 112 | 77 (69 %) | 707 | 83 % | 1.45 | 416.10 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 75 | 69 (92 %) | 129 | 84 % | 77.40 | 348.74 |
| Signals | tp 5.000% | sl 2.00× | tr off | 92 | 59 (64 %) | 212 | 79 % | 1.75 | 342.60 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 46 | 44 (96 %) | 53 | 96 % | 1736.23 | 295.24 |
| Signals | tp 4.000% | sl 2.00× | tr off | 106 | 57 (54 %) | 386 | 74 % | 1.33 | 266.80 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 33 | 30 (91 %) | 38 | 92 % | 158.71 | 250.48 |
| Signals | tp 6.000% | sl 2.00× | tr off | 69 | 40 (58 %) | 121 | 73 % | 1.27 | 107.80 |
| Signals | tp 3.000% | sl 2.00× | tr off | 109 | 57 (52 %) | 624 | 69 % | 1.02 | 28.20 |
| Short | tp 2.800% | sl 2.00× | tr off | 67 | 17 (25 %) | 43 | 72 % | 1.16 | 11.00 |
| Micro | tp 0.600% (net 0.400%) | sl 5.00× | tr off | 34 | 8 (24 %) | 19 | 100 % | ∞ (no loss) | 7.60 |
| Micro | tp 0.600% (net 0.400%) | sl 4.25× | tr off | 23 | 5 (22 %) | 16 | 100 % | ∞ (no loss) | 6.40 |
| Micro | tp 0.600% (net 0.400%) | sl 4.50× | tr off | 25 | 5 (20 %) | 16 | 100 % | ∞ (no loss) | 6.40 |
| Micro | tp 0.600% (net 0.400%) | sl 4.75× | tr off | 23 | 5 (22 %) | 16 | 100 % | ∞ (no loss) | 6.40 |
| Micro | tp 0.550% (net 0.350%) | sl 4.75× | tr off | 25 | 7 (28 %) | 18 | 100 % | ∞ (no loss) | 6.30 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 64 | 19 (30 %) | 38 | 68 % | 1.12 | 4.96 |
| Micro | tp 0.600% (net 0.400%) | sl 3.75× | tr 0.75× | 12 | 8 (67 %) | 14 | 100 % | ∞ (no loss) | 4.87 |
| Micro | tp 0.600% (net 0.400%) | sl 4.00× | tr 0.75× | 12 | 8 (67 %) | 14 | 100 % | ∞ (no loss) | 4.87 |
| Micro | tp 0.600% (net 0.400%) | sl 4.25× | tr 0.75× | 12 | 8 (67 %) | 14 | 100 % | ∞ (no loss) | 4.87 |
| Micro | tp 0.550% (net 0.350%) | sl 4.75× | tr 0.75× | 13 | 7 (54 %) | 13 | 100 % | ∞ (no loss) | 4.55 |
| Micro | tp 0.550% (net 0.350%) | sl 5.00× | tr 0.75× | 13 | 7 (54 %) | 13 | 100 % | ∞ (no loss) | 4.55 |
| Micro | tp 0.550% (net 0.350%) | sl 4.25× | tr 0.50× | 12 | 8 (67 %) | 16 | 88 % | 12.90 | 4.52 |
| Micro | tp 0.550% (net 0.350%) | sl 4.50× | tr 0.50× | 14 | 8 (57 %) | 16 | 88 % | 12.90 | 4.52 |
| Micro | tp 0.550% (net 0.350%) | sl 4.75× | tr 0.50× | 14 | 8 (57 %) | 16 | 88 % | 12.90 | 4.52 |
| Micro | tp 0.550% (net 0.350%) | sl 5.00× | tr 0.50× | 14 | 8 (57 %) | 16 | 88 % | 12.90 | 4.52 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 1.50× | tr off | 113 | 46 (41 %) | 1106 | 59 % | 0.83 | -299.95 |
| Signals | tp 3.000% | sl 1.50× | tr off | 110 | 40 (36 %) | 794 | 58 % | 0.82 | -289.30 |
| Signals | tp 6.000% | sl 1.50× | tr off | 89 | 37 (42 %) | 165 | 55 % | 0.76 | -168.00 |
| Signals | tp 5.000% | sl 1.50× | tr off | 103 | 38 (37 %) | 286 | 57 % | 0.83 | -164.70 |
| Signals | tp 2.500% | sl 2.00× | tr off | 112 | 52 (46 %) | 929 | 67 % | 0.92 | -128.30 |
| Long | tp 6.400% | sl 0.75× | tr off | 63 | 2 (3 %) | 26 | 8 % | 0.10 | -107.60 |
| Long | tp 5.600% | sl 1.00× | tr 0.50× | 56 | 6 (11 %) | 41 | 49 % | 0.21 | -93.21 |
| Long | tp 5.600% | sl 0.75× | tr off | 46 | 4 (9 %) | 36 | 22 % | 0.35 | -80.00 |
| Long | tp 5.200% | sl 1.00× | tr 0.75× | 44 | 0 (0 %) | 18 | 11 % | 0.12 | -76.40 |
| Long | tp 4.800% | sl 1.00× | tr off | 43 | 0 (0 %) | 20 | 15 % | 0.16 | -71.20 |
| Short | tp 2.400% | sl 2.00× | tr 0.75× | 49 | 2 (4 %) | 51 | 43 % | 0.41 | -70.75 |
| Long | tp 6.000% | sl 0.75× | tr off | 56 | 6 (11 %) | 32 | 25 % | 0.41 | -66.40 |
| Long | tp 6.400% | sl 1.00× | tr 0.75× | 42 | 0 (0 %) | 10 | 0 % | 0.00 | -66.00 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 57 | 3 (5 %) | 60 | 38 % | 0.45 | -61.80 |
| Long | tp 4.800% | sl 1.00× | tr 0.50× | 51 | 2 (4 %) | 34 | 50 % | 0.28 | -61.35 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 61 (61) | 35164 | 15634 | 15634 | 0 | baseTarget 19530 |
| Micro | trailing | 61 (61) | 70328 | 31268 | 31268 | 0 | baseTarget 39060 |
| Short | normal | 253 (212) | 43200 | 15510 | 15510 | 0 | baseTarget 10986 · baseRange 16704 |
| Short | trailing | 253 (212) | 86400 | 31020 | 31020 | 0 | baseTarget 21972 · baseRange 33408 |
| General | normal | 253 (205) | 28800 | 9906 | 9906 | 0 | baseTarget 5214 · baseRange 13680 |
| General | trailing | 253 (205) | 19200 | 6604 | 6604 | 0 | baseTarget 3476 · baseRange 9120 |
| Long | normal | 253 (230) | 36000 | 15144 | 15144 | 0 | baseTarget 6456 · baseRange 14400 |
| Long | trailing | 253 (230) | 24000 | 10096 | 10096 | 0 | baseTarget 4304 · baseRange 9600 |
| Wide | axis | 314 (314) | 61110 | 61110 | 61110 | 0 | – |
| Wide | dca | 314 (314) | 5432 | 5432 | 5432 | 0 | – |
| Wide | dca-active | 314 (314) | 5432 | 5432 | 5432 | 0 | – |

Engine indications Base evaluated that built no set: 77 (bb-bounce-20-3, break-atr, break-atr-2@x4, dir-emax-5-13, ema-pullback, ha-3, ichi-cloud-20, macd-hist, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-burst-3, mc-engulf-20, mc-lag-12, mc-macdh, mc-rsi14-30, mc-rsi2-10, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-30, mc-rsi4-10, mc-rsi4-25, mc-rsi4-30, mc-rsi5-30, mc-rsi7-15, mc-rsi7-20, mc-rsi7-30, mc-rsi9-25, mc-rsi9-30, mc-rsidiv-14, mc-rsimid-14, mc-rsit14-25, mc-rsit2-30, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.31 (326) | 0.38 (324) | 0.42 (280) | 0.46 (434) | 0.50 (480) |
| 1.14× | – | 0.28 (338) | – | – | – | – | – |
| 1.25× | – | 0.26 (338) | 0.27 (324) | 0.41 (318) | 0.52 (274) | 0.45 (422) | 0.47 (468) |
| 1.33× | 0.23 (340) | – | – | – | – | – | – |
| 1.5× | 0.22 (340) | 0.26 (338) | 0.34 (318) | 0.39 (312) | 0.48 (268) | 0.45 (416) | 0.43 (462) |
| 1.75× | 0.21 (340) | 0.27 (332) | 0.29 (312) | 0.41 (306) | 0.46 (262) | 0.44 (410) | 0.40 (456) |
| 2× | 0.23 (334) | 0.24 (326) | 0.30 (306) | 0.37 (306) | 0.48 (256) | 0.41 (404) | 0.45 (450) |
| 2.25× | 0.21 (328) | 0.25 (320) | 0.28 (306) | 0.39 (300) | 0.52 (244) | 0.46 (404) | 0.46 (440) |
| 2.5× | 0.21 (328) | 0.23 (320) | 0.28 (300) | 0.41 (288) | 0.48 (244) | 0.50 (394) | 0.42 (440) |
| 2.75× | 0.21 (322) | 0.23 (316) | 0.30 (288) | 0.38 (288) | 0.43 (238) | 0.46 (394) | 0.41 (434) |
| 3× | 0.20 (322) | 0.22 (316) | 0.28 (290) | 0.35 (282) | 0.40 (238) | 0.45 (388) | 0.41 (422) |
| 3.25× | 0.20 (318) | 0.22 (310) | 0.26 (290) | 0.33 (282) | 0.37 (238) | 0.47 (376) | 0.48 (398) |
| 3.5× | 0.21 (318) | 0.21 (310) | 0.24 (284) | 0.31 (282) | 0.39 (232) | 0.60 (352) | 0.45 (398) |
| 3.75× | 0.21 (312) | 0.20 (310) | 0.23 (284) | 0.32 (276) | 0.46 (220) | 0.56 (352) | 0.74 (356) |
| 4× | 0.20 (312) | 0.19 (304) | 0.22 (284) | 0.34 (268) | 0.51 (214) | 0.53 (352) | 0.80 (356) |
| 4.25× | 0.20 (312) | 0.18 (304) | 0.22 (276) | 0.54 (244) | 0.48 (214) | 1.09 (328) | 0.76 (356) |
| 4.5× | 0.19 (306) | 0.17 (304) | 0.24 (270) | 0.51 (244) | 0.67 (202) | 1.04 (328) | 0.72 (356) |
| 4.75× | 0.18 (306) | 0.17 (298) | 0.23 (270) | 0.49 (244) | 0.64 (202) | 0.99 (328) | 0.68 (356) |
| 5× | 0.17 (306) | 0.17 (298) | 0.33 (246) | 0.85 (228) | 0.61 (202) | 0.95 (328) | 0.65 (356) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | – |
| 2.25× | – | – | – | – | – | – | 0.26 (16) |
| 2.5× | – | – | – | – | 0.10 (6) | 0.13 (18) | 0.20 (102) |
| 2.75× | – | – | – | – | 0.10 (6) | 0.18 (86) | 0.18 (102) |
| 3× | – | – | – | 0.27 (24) | – | 0.17 (86) | 0.16 (100) |
| 3.25× | – | – | 0.22 (24) | 0.17 (72) | – | 0.17 (80) | 0.26 (74) |
| 3.5× | – | – | 0.21 (24) | 0.16 (72) | – | 0.26 (44) | 0.27 (68) |
| 3.75× | – | 0.11 (82) | 0.14 (72) | 0.15 (72) | – | 0.25 (44) | 1.18 (38) |
| 4× | – | 0.11 (82) | 0.13 (72) | 0.15 (72) | – | 0.23 (44) | 1.19 (40) |
| 4.25× | 0.15 (30) | 0.10 (114) | 0.12 (72) | 0.33 (54) | – | 1.92 (34) | 1.55 (52) |
| 4.5× | 0.15 (30) | 0.09 (114) | 0.12 (72) | 0.31 (54) | – | 1.83 (34) | 1.43 (57) |
| 4.75× | 0.08 (62) | 0.09 (114) | 0.11 (72) | 0.30 (54) | – | 41.48 (47) | 1.36 (57) |
| 5× | 0.08 (62) | 0.09 (114) | 0.25 (54) | 4.54 (42) | – | 28.57 (33) | 1.39 (60) |

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
| 2.75× | – | – | – | – | – | 0.00 (2) | – |
| 3× | – | – | – | – | – | 0.00 (1) | – |
| 3.25× | – | – | – | 0.15 (4) | – | – | – |
| 3.5× | – | – | – | 0.14 (2) | – | – | – |
| 3.75× | – | – | – | – | – | – | ∞ (1) |
| 4× | – | – | – | 0.00 (2) | – | – | ∞ (1) |
| 4.25× | – | ∞ (2) | – | 0.00 (1) | – | – | ∞ (1) |
| 4.5× | – | ∞ (1) | – | – | – | – | – |
| 4.75× | – | – | – | – | – | – | ∞ (4) |
| 5× | – | – | – | – | – | – | ∞ (2) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.51 (3944) | 0.47 (4120) | 0.43 (3704) | 0.57 (3745) | 0.53 (3601) | 0.63 (3454) |
| 1.5× | 0.54 (3374) | 0.56 (3414) | 0.61 (2897) | 0.67 (3165) | 0.69 (2898) | 0.87 (2799) |
| 2× | 0.64 (3022) | 0.68 (3000) | 0.69 (2617) | 0.84 (2819) | 0.93 (2464) | 1.15 (2404) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.45 (42) | 0.73 (44) | 0.50 (59) | 0.65 (69) | 0.57 (72) | 0.50 (48) |
| 1.5× | 0.76 (54) | 0.45 (43) | 0.52 (43) | 0.56 (84) | 0.50 (90) | 0.53 (83) |
| 2× | 0.38 (70) | 0.37 (61) | 0.38 (71) | 0.44 (148) | 0.74 (144) | 0.92 (109) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.59 (1074) | 0.71 (1008) | 0.77 (986) | 0.72 (881) |
| 0.75× | 0.62 (818) | 0.75 (764) | 0.86 (720) | 0.92 (612) |
| 1× | 0.65 (2079) | 0.68 (1949) | 0.75 (1851) | 0.68 (1496) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.83 (6) | – | – | – |
| 0.75× | 0.64 (14) | 0.47 (7) | 0.11 (12) | 0.18 (15) |
| 1× | 0.47 (35) | 0.41 (64) | 0.35 (60) | 0.40 (68) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | – | – | – | – |
| 0.75× | ∞ (4) | – | – | – |
| 1× | ∞ (9) | 3.20 (5) | 4.26 (6) | ∞ (10) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.71 (916) | 0.74 (912) | 0.52 (785) | 0.63 (685) | 0.61 (767) |
| 0.75× | 0.89 (635) | 1.09 (609) | 0.84 (502) | 0.94 (442) | 0.85 (487) |
| 1× | 0.72 (1465) | 0.82 (1411) | 0.70 (1255) | 0.91 (1054) | 0.95 (918) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | – | – | – | 0.00 (2) | 0.00 (10) |
| 0.75× | 0.27 (11) | 0.29 (26) | 0.35 (36) | 0.41 (32) | 0.10 (26) |
| 1× | 0.23 (67) | 0.23 (53) | 0.27 (67) | 0.49 (58) | 0.03 (35) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | – | – | – | – | – |
| 0.75× | – | – | – | – | – |
| 1× | – | – | – | – | – |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.62 (772) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.40 (38) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.74 (15147) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.32 (32) | 0.54 (497) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.30 (32) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.65 (424) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.70 (392) | – | – | – | – |
| 1× | – | – | – | 0.55 (70469) | – | – | – | 0.54 (13323) | 0.50 (2141) | – | 0.71 (553) | – | 0.60 (1730) | 0.65 (1365) | 0.59 (388) | 0.79 (225) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.50 (98) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.26 (33) | – | – | – | – | – | – | – | – | – | – | – | – |

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
