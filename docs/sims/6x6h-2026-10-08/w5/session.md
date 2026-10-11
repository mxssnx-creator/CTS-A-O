# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.40–$0.47 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-06T18:00 → 2026-10-07T00:00 UTC. Engine: Base 1103/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 235/19072 · PF 1.59 · Micro 68/5900 · PF 2.31 · Short 504/8176 · PF 1.54 · General 443/8176 · PF 1.48 · Long 523/8176 · PF 1.52 · Signals 126/126; Main 1036 pairs, 151932 tapes, Real seats: 3967 engine configs + 3780 signal configs (every config of the active signals), compute 226 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.23 (1.16 %, closed orders) · equity at end $19.27 (open at end: 37 positions / 2665 orders, MTM -$0.96 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.24 (gross profit $ ÷ gross loss $ as sized) · PF unit 2.47 (every order at one unit: the engine's PF) · 33 positions / 658 orders (incl. 31 capped to $0) · WR 77.96 % · DDT (closed trades, $) 3.33 h · DDR 2.14 · equity max drawdown $1.25 (6.24 %) · margin used max $14.20 · open avg 14.47 pos / 156.61 orders (peak 21 / 235)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 31 orders capped to $0, 519 scaled down (open at end: 106 capped, 2414 scaled) · binding: position cap 1846, gross cap 2957. **Without the caps:** balance $20.00 → $23.43 (17.14 %) · PF $ 2.41 · equity at end $16.30 · equity max drawdown $6.62 (30.93 %) · margin used max $115.91 · infeasible: margin exceeded equity for 301 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 319 | 919  | 3.7 % | 1.592 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 319 | 919 (+0) | 3.7 % | 1.592 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 319 | 918 (-1) | 3.7 % | 1.592 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 300 | 823 (-96) | 3.3 % | 1.641 |
| closes ≥ 6 | 1.00 | 6 | 1 | 551 | 1258 (+339) | 5.0 % | 2.045 |
| closes ≥ 20 | 1.00 | 20 | 1 | 212 | 695 (-224) | 2.8 % | 1.462 |
| closes ≥ 30 | 1.00 | 30 | 1 | 148 | 499 (-420) | 2.0 % | 1.387 |
| DDR off | 1.00 | 12 | off | 1305 | 2204 (+1285) | 8.8 % | 1.128 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 585 | 1353 (+434) | 5.4 % | 1.353 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 134 | 415 (-504) | 1.7 % | 2.152 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1305 | 2204 (+1285) | 8.8 % | 1.128 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1776 | 2722 (+1803) | 10.9 % | 1.188 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 1 / 29 | 20 / 9 | 1.70 | 1.45 | 69 % | $0.03 | $20.03 | $19.17 | $19.17 | 4.16 % | 1.00 | $14.02 | 16 / 519 |
| 19:00 | 0 / 129 | 91 / 38 | 0.40 | 1.00 | 71 % | -$0.30 | $19.73 | $18.96 | $18.86 | 5.68 % | 2.00 | $14.12 | 25 / 927 |
| 20:00 | 3 / 161 | 144 / 17 | 1.87 | 7.00 | 89 % | $0.14 | $19.87 | $19.31 | $18.75 | 6.24 % | 3.00 | $13.91 | 30 / 1604 |
| 21:00 | 1 / 80 | 71 / 9 | 1.27 | 8.56 | 89 % | $0.03 | $19.90 | $19.28 | $19.09 | 6.24 % | 4.00 | $13.94 | 31 / 2013 |
| 22:00 | 2 / 55 | 48 / 7 | 73.58 | 20.67 | 87 % | $0.22 | $20.11 | $19.30 | $19.29 | 6.24 % | 5.00 | $14.08 | 35 / 2353 |
| 23:00 | 1 / 204 | 139 / 65 | 1.71 | 1.39 | 68 % | $0.12 | $20.23 | $19.27 | $19.09 | 6.24 % | 6.00 | $14.20 | 37 / 2665 |

**Last hour (23:00):** open at end: 37 positions / 2665 orders, MTM -$0.96 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $19.27 = balance $20.23 + MTM -$0.96.

**Hours positive:** 5 of 6 full hours · flat 0 · negative 1

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 18:00 | 2 · ∞ (no loss) · $0.00 | 3 · ∞ (no loss) · $0.00 | 21 · 7.09 · $0.06 | – | 3 · 0.00 · -$0.04 |
| 19:00 | – | 3 · ∞ (no loss) · $0.00 | 56 · 2.59 · $0.07 | 49 · 1.40 · $0.03 | 21 · 0.00 · -$0.40 |
| 20:00 | 6 · ∞ (no loss) · $0.00 | 3 · 0.00 · -$0.00 | 137 · 8.65 · $0.25 | 12 · 0.19 · -$0.05 | 3 · 0.00 · -$0.06 |
| 21:00 | – | – | 72 · 0.93 · -$0.01 | 5 · ∞ (no loss) · $0.01 | 3 · ∞ (no loss) · $0.02 |
| 22:00 | – | – | 47 · 157.48 · $0.17 | 4 · ∞ (no loss) · $0.02 | 4 · 17.27 · $0.03 |
| 23:00 | 2 · 0.00 · -$0.00 | – | 173 · 4.85 · $0.20 | 22 · 0.01 · -$0.07 | 7 · 0.77 · -$0.01 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 29 | 6 · 0.47 · 83 % · -$0.01 | 2 · 0.00 · 0 % · -$0.02 | 7 · 8.61 · 86 % · $0.05 | 14 · 3.98 · 64 % · $0.01 | – | 21 · 7.09 · 71 % · $0.06 |
| 19:00 | 129 | 42 · 0.25 · 67 % · -$0.18 | 59 · 0.40 · 75 % · -$0.14 | 16 · 0.99 · 69 % · -$0.00 | 12 · 21.31 · 67 % · $0.01 | – | 28 · 1.30 · 68 % · $0.01 |
| 20:00 | 161 | 27 · 0.17 · 63 % · -$0.09 | 9 · 0.18 · 56 % · -$0.02 | 77 · 6.93 · 97 % · $0.16 | 48 · 415.45 · 98 % · $0.09 | – | 125 · 9.97 · 98 % · $0.25 |
| 21:00 | 80 | 9 · ∞ (no loss) · 100 % · $0.03 | 6 · ∞ (no loss) · 100 % · $0.01 | 18 · 0.27 · 83 % · -$0.06 | 47 · 9.69 · 87 % · $0.05 | – | 65 · 0.87 · 86 % · -$0.01 |
| 22:00 | 55 | 4 · ∞ (no loss) · 100 % · $0.05 | 8 · 1.23 · 75 % · $0.00 | 20 · 135.19 · 95 % · $0.12 | 23 · 887.15 · 83 % · $0.05 | – | 43 · 177.63 · 88 % · $0.17 |
| 23:00 | 204 | 20 · 0.47 · 20 % · -$0.04 | 17 · 0.02 · 47 % · -$0.04 | 80 · 2.68 · 60 % · $0.08 | 87 · 28.95 · 91 % · $0.12 | – | 167 · 4.85 · 76 % · $0.20 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 977 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (151932 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (5987); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 12390 · 2.23 | 2657 · 3.59 | 3833 · 3.16 | 459 · 1.92 | 29 · 1.45 | 6 · 0.47 | 2 · 0.00 | – | 21 · 3.92 |
| 19:00 | 23801 · 1.07 | 5133 · 1.33 | 9253 · 1.85 | 1070 · 1.81 | 129 · 1.00 | 42 · 0.79 | 59 · 1.04 | – | 28 · 1.39 |
| 20:00 | 31612 · 1.45 | 7668 · 1.52 | 8481 · 1.53 | 1797 · 11.58 | 161 · 7.00 | 27 · 0.73 | 9 · 0.63 | – | 125 · 27.45 |
| 21:00 | 21507 · 1.94 | 4429 · 1.72 | 7371 · 4.52 | 1919 · 1.06 | 80 · 8.56 | 9 · ∞ (no loss) | 6 · ∞ (no loss) | – | 65 · 6.91 |
| 22:00 | 18566 · 0.89 | 4109 · 0.95 | 5882 · 1.37 | 1875 · 3.45 | 55 · 20.67 | 4 · ∞ (no loss) | 8 · 4.74 | – | 43 · 24.02 |
| 23:00 | 25050 · 0.78 | 6216 · 0.87 | 9533 · 0.93 | 1980 · 0.76 | 204 · 1.39 | 20 · 0.17 | 17 · 0.09 | – | 167 · 1.98 |
| **total** | **132926 · 1.26** | **30212 · 1.34** | **44353 · 1.69** | **9100 · 1.64** | **658 · 2.47** | **108 · 0.73** | **101 · 0.93** | **–** | **449 · 4.16** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 108 | 67 / 41 | 0.46 | 0.73 | -$0.23 | 62.04 % | 4.75 |
| Trailing | 101 | 69 / 32 | 0.34 | 0.93 | -$0.22 | 68.32 % | 4.25 |
| Signal · Normal | 218 | 174 / 44 | 2.66 | 2.23 | $0.35 | 79.82 % | 1.75 |
| Signal · Trailing | 231 | 203 / 28 | 23.39 | 23.93 | $0.33 | 87.88 % | 0.50 |
| total | 658 | 513 / 145 | 1.24 | 2.47 | $0.23 | 77.96 % | 3.33 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 449 | 377 / 72 | 3.99 | 4.16 | $0.68 | 83.96 % | 1.25 |
| of which Engine (no signals) | 209 | 136 / 73 | 0.41 | 0.82 | -$0.45 | 65.07 % | 4.08 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 10 | 371528334577.85 | 0.58 | $0.00 |
| 5m+ | 9 | 2.88 | 0.73 | $0.00 |
| 15m | 506 | 4.19 | 4.13 | $0.74 |
| 15m+ | 92 | 0.69 | 1.06 | -$0.06 |
| 30m | 41 | 0.15 | 0.19 | -$0.46 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 22 | 17 / 5 | 4.23 | 0.81 | $0.01 | 77.27 % | 3.92 |
| Short | 114 | 102 / 12 | 1.63 | 4.62 | $0.08 | 89.47 % | 4.25 |
| General | 41 | 13 / 28 | 0.31 | 0.32 | -$0.19 | 31.71 % | 6.00 |
| Long | 32 | 4 / 28 | 0.04 | 0.16 | -$0.34 | 12.50 % | 6.00 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 449 | 377 / 72 | 3.99 | 4.16 | $0.68 | 83.96 % | 1.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 26695 | sig:confirm 15839 · sig:duplicate 4087 · sig:signalPf 3142 · sig:signalSide 1962 · sig:signalCluster 1665 |
| Short | 694 | lastN 515 · duplicate 79 · symPf 72 · engineSide 28 |
| Long | 567 | lastN 433 · symPf 85 · duplicate 31 · engineSide 18 |
| Micro | 539 | crowd 302 · lastN 232 · duplicate 3 · engineSide 2 |
| General | 296 | lastN 236 · symPf 26 · duplicate 21 · engineSide 13 |
| Wide | 93 | engineSide 54 · lastN 36 · symPf 3 |

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
| Micro | 2.31 | 0.81 | 0.35 | 4.23 | 5.21 | 22 |
| Short | 1.54 | 4.62 | 3.00 | 1.63 | 0.35 | 114 |
| General | 1.48 | 0.32 | 0.22 | 0.31 | 0.97 | 41 |
| Long | 1.52 | 0.16 | 0.10 | 0.04 | 0.25 | 32 |
| Wide | 1.59 | – | – | – | – | 0 |
| Signals | – | 4.16 | – | 3.99 | 0.96 | 449 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (3670 of 121897 evaluated, 148152 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3054 units active at the run start, 3462 over the run, 2317 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 779 | 286 (37 %) | 386 | 98 % | 11.70 | 113.95 |
| Micro | trailing | 427 | 114 (27 %) | 144 | 97 % | 9.72 | 41.00 |
| Short | normal | 437 | 118 (27 %) | 158 | 89 % | 4.31 | 222.00 |
| Short | trailing | 732 | 188 (26 %) | 315 | 75 % | 2.80 | 224.37 |
| General | normal | 269 | 19 (7 %) | 56 | 38 % | 0.58 | -54.60 |
| General | trailing | 140 | 36 (26 %) | 58 | 69 % | 1.27 | 17.87 |
| Long | normal | 404 | 26 (6 %) | 94 | 38 % | 0.74 | -67.10 |
| Long | trailing | 253 | 23 (9 %) | 56 | 54 % | 1.17 | 16.29 |
| Wide | axis | 229 | 9 (4 %) | 32 | 28 % | 3.74 | 24.78 |
| Signals | normal | 1173 | 776 (66 %) | 4030 | 73 % | 1.29 | 2067.00 |
| Signals | trailing | 1144 | 949 (83 %) | 3771 | 79 % | 2.89 | 3748.51 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1206 | 400 (33 %) | 530 | 98 % | 11.09 | 154.95 |
| Short | active | 39 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | bollinger | 63 | 6 (10 %) | 6 | 100 % | ∞ (no loss) | 10.60 |
| Short | break | 235 | 51 (22 %) | 66 | 88 % | 10.97 | 80.20 |
| Short | channel | 17 | 0 (0 %) | 8 | 0 % | 0.00 | -34.50 |
| Short | direction | 132 | 47 (36 %) | 47 | 100 % | ∞ (no loss) | 77.76 |
| Short | ema | 53 | 34 (64 %) | 34 | 100 % | ∞ (no loss) | 60.86 |
| Short | ichimoku | 2 | 1 (50 %) | 1 | 100 % | ∞ (no loss) | 2.00 |
| Short | macd | 25 | 3 (12 %) | 23 | 65 % | 1.20 | 3.87 |
| Short | move | 164 | 30 (18 %) | 33 | 91 % | 5.54 | 50.45 |
| Short | osc | 189 | 50 (26 %) | 143 | 59 % | 1.39 | 41.08 |
| Short | rsi | 36 | 1 (3 %) | 2 | 50 % | 64.73 | 2.28 |
| Short | smooth | 21 | 2 (10 %) | 4 | 50 % | 6.09 | 2.15 |
| Short | trend | 129 | 51 (40 %) | 58 | 97 % | 204.29 | 85.72 |
| Short | volume | 64 | 30 (47 %) | 48 | 90 % | 6.42 | 63.90 |
| General | active | 13 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 26 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 82 | 20 (24 %) | 29 | 69 % | 1.88 | 32.63 |
| General | channel | 9 | 0 (0 %) | 3 | 0 % | 0.00 | -12.20 |
| General | direction | 6 | 5 (83 %) | 5 | 100 % | ∞ (no loss) | 9.10 |
| General | ema | 14 | 4 (29 %) | 4 | 100 % | ∞ (no loss) | 10.53 |
| General | macd | 4 | 0 (0 %) | 1 | 0 % | 0.00 | -3.20 |
| General | move | 24 | 3 (13 %) | 3 | 100 % | ∞ (no loss) | 5.93 |
| General | osc | 134 | 7 (5 %) | 41 | 32 % | 0.34 | -67.01 |
| General | rsi | 20 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | trend | 33 | 6 (18 %) | 6 | 100 % | ∞ (no loss) | 9.09 |
| General | volume | 40 | 10 (25 %) | 22 | 45 % | 0.49 | -21.61 |
| Long | active | 20 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | bollinger | 25 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 118 | 18 (15 %) | 30 | 60 % | 1.57 | 30.45 |
| Long | channel | 33 | 1 (3 %) | 7 | 14 % | 0.01 | -27.17 |
| Long | direction | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | ema | 21 | 4 (19 %) | 4 | 100 % | ∞ (no loss) | 20.00 |
| Long | macd | 3 | 0 (0 %) | 1 | 0 % | 0.00 | -3.20 |
| Long | move | 101 | 0 (0 %) | 15 | 0 % | 0.00 | -72.60 |
| Long | osc | 197 | 16 (8 %) | 73 | 45 % | 0.95 | -7.89 |
| Long | rsi | 24 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 19 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | trend | 56 | 1 (2 %) | 1 | 100 % | ∞ (no loss) | 6.20 |
| Long | volume | 34 | 9 (26 %) | 19 | 47 % | 1.09 | 3.42 |
| Wide | active | 40 | 0 (0 %) | 6 | 0 % | 0.00 | -4.64 |
| Wide | bollinger | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | break | 6 | 0 (0 %) | 3 | 0 % | 0.00 | -0.60 |
| Wide | channel | 20 | 0 (0 %) | 2 | 0 % | 0.00 | -1.40 |
| Wide | direction | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | ema | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 12 | 3 (25 %) | 3 | 100 % | ∞ (no loss) | 3.40 |
| Wide | osc | 63 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | rsi | 21 | 6 (29 %) | 18 | 33 % | 12.67 | 28.02 |
| Wide | smooth | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | volume | 39 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | signal:act-burst | 29 | 6 (21 %) | 74 | 49 % | 0.38 | -126.64 |
| Signals | signal:act-hf | 60 | 39 (65 %) | 389 | 72 % | 1.27 | 135.53 |
| Signals | signal:adx | 43 | 35 (81 %) | 69 | 81 % | 2.43 | 73.85 |
| Signals | signal:atr-break | 45 | 31 (69 %) | 128 | 75 % | 1.27 | 47.18 |
| Signals | signal:bollinger | 21 | 11 (52 %) | 29 | 66 % | 0.95 | -2.64 |
| Signals | signal:cci | 28 | 19 (68 %) | 84 | 73 % | 1.24 | 25.90 |
| Signals | signal:cmf | 60 | 52 (87 %) | 194 | 83 % | 3.64 | 393.51 |
| Signals | signal:donchian | 40 | 38 (95 %) | 107 | 85 % | 10.84 | 222.14 |
| Signals | signal:ema-cross | 17 | 17 (100 %) | 60 | 90 % | 5.76 | 125.47 |
| Signals | signal:ema-cross-fast | 34 | 30 (88 %) | 102 | 81 % | 2.95 | 108.14 |
| Signals | signal:ema-pullback | 31 | 26 (84 %) | 138 | 76 % | 2.52 | 199.41 |
| Signals | signal:ema-slope | 38 | 38 (100 %) | 99 | 98 % | 1360.88 | 282.94 |
| Signals | signal:ema-trend | 40 | 40 (100 %) | 55 | 98 % | 1474.51 | 153.29 |
| Signals | signal:heikin-ashi | 59 | 24 (41 %) | 341 | 62 % | 0.69 | -222.83 |
| Signals | signal:hma | 60 | 42 (70 %) | 181 | 74 % | 1.40 | 113.04 |
| Signals | signal:ichimoku | 25 | 23 (92 %) | 42 | 90 % | 256.29 | 82.39 |
| Signals | signal:impulse | 59 | 56 (95 %) | 213 | 85 % | 4.71 | 386.02 |
| Signals | signal:kama | 53 | 30 (57 %) | 186 | 70 % | 1.07 | 18.91 |
| Signals | signal:keltner | 59 | 38 (64 %) | 133 | 71 % | 1.05 | 11.29 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 205 | 84 % | 7.40 | 354.24 |
| Signals | signal:macd-hist | 60 | 45 (75 %) | 238 | 74 % | 1.74 | 170.94 |
| Signals | signal:macd-slow | 60 | 55 (92 %) | 199 | 79 % | 3.16 | 287.43 |
| Signals | signal:mfi | 30 | 29 (97 %) | 57 | 89 % | 14.74 | 144.79 |
| Signals | signal:obv | 40 | 35 (88 %) | 109 | 83 % | 3.33 | 139.18 |
| Signals | signal:r-awesome | 60 | 42 (70 %) | 234 | 72 % | 1.41 | 117.87 |
| Signals | signal:r-connors | 30 | 30 (100 %) | 75 | 92 % | 26.87 | 233.07 |
| Signals | signal:r-fractal | 51 | 26 (51 %) | 162 | 65 % | 0.77 | -71.42 |
| Signals | signal:r-inside | 10 | 9 (90 %) | 11 | 91 % | 2.74 | 6.87 |
| Signals | signal:r-linreg | 57 | 44 (77 %) | 207 | 78 % | 2.12 | 275.76 |
| Signals | signal:r-nr-break | 60 | 49 (82 %) | 275 | 79 % | 1.83 | 253.97 |
| Signals | signal:r-vol-regime | 16 | 14 (88 %) | 25 | 84 % | 151.24 | 33.76 |
| Signals | signal:reclaim | 43 | 41 (95 %) | 104 | 92 % | 11.45 | 240.16 |
| Signals | signal:rsi-mid | 60 | 54 (90 %) | 233 | 82 % | 2.57 | 297.94 |
| Signals | signal:rsi-reversal | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 15.64 |
| Signals | signal:s2-active-hf | 58 | 28 (48 %) | 260 | 72 % | 0.97 | -12.93 |
| Signals | signal:s2-adx-gate | 49 | 33 (67 %) | 176 | 75 % | 1.55 | 110.51 |
| Signals | signal:s2-atr-break | 60 | 46 (77 %) | 406 | 73 % | 1.40 | 199.26 |
| Signals | signal:s2-bb-bounce | 9 | 0 (0 %) | 11 | 0 % | 0.00 | -49.02 |
| Signals | signal:s2-block-scale | 48 | 31 (65 %) | 227 | 79 % | 1.41 | 123.55 |
| Signals | signal:s2-block-stack | 46 | 32 (70 %) | 145 | 75 % | 1.29 | 52.03 |
| Signals | signal:s2-confluence | 51 | 32 (63 %) | 188 | 76 % | 1.30 | 89.67 |
| Signals | signal:s2-ema-cross | 10 | 9 (90 %) | 10 | 90 % | 176.56 | 18.26 |
| Signals | signal:s2-range-break | 48 | 15 (31 %) | 111 | 60 % | 0.47 | -163.12 |
| Signals | signal:s2-range-shift | 41 | 32 (78 %) | 94 | 73 % | 2.14 | 84.97 |
| Signals | signal:s2-rsi-revert | 17 | 13 (76 %) | 20 | 70 % | 4.72 | 17.02 |
| Signals | signal:s2-st-trail | 12 | 11 (92 %) | 14 | 93 % | 647.67 | 15.62 |
| Signals | signal:s2-stoch-swing | 32 | 20 (63 %) | 60 | 72 % | 1.02 | 1.53 |
| Signals | signal:sar | 59 | 24 (41 %) | 236 | 67 % | 0.70 | -158.88 |
| Signals | signal:squeeze | 14 | 13 (93 %) | 15 | 87 % | 135.48 | 23.39 |
| Signals | signal:st-slow | 7 | 7 (100 %) | 9 | 100 % | ∞ (no loss) | 8.34 |
| Signals | signal:stoch-rsi | 53 | 31 (58 %) | 203 | 64 % | 0.86 | -49.89 |
| Signals | signal:supertrend | 35 | 32 (91 %) | 67 | 87 % | 25.78 | 128.69 |
| Signals | signal:swing | 60 | 41 (68 %) | 240 | 68 % | 1.18 | 67.57 |
| Signals | signal:thrust | 60 | 54 (90 %) | 341 | 78 % | 2.31 | 419.71 |
| Signals | signal:trix | 24 | 23 (96 %) | 56 | 95 % | 464.44 | 129.08 |
| Signals | signal:vwap | 17 | 17 (100 %) | 26 | 96 % | 447.04 | 46.40 |
| Signals | signal:williams-r | 39 | 36 (92 %) | 90 | 87 % | 4.61 | 182.88 |
| Signals | signal:zscore | 22 | 13 (59 %) | 30 | 67 % | 1.09 | 3.77 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 27502 | 19714 | 1206 | 0.91 | 4.00 | 78.75–163.33 (median 163.33) | 2226 | 9660 | 449 | 2779 | 1636 | 107 | 1558 | 0 | 93 | 0 | 0 | 0 | 7788 |  |
| Short | 33967 | 29863 | 1169 | 1.26 | 2.32 | 163.33–163.33 (median 163.33) | 3894 | 5996 | 1410 | 6137 | 4153 | 1442 | 5145 | 13 | 504 | 0 | 0 | 0 | 4104 |  |
| General | 12473 | 10953 | 409 | 1.27 | 2.00 | 163.33–163.33 (median 163.33) | 1353 | 2078 | 571 | 2258 | 1320 | 831 | 1934 | 0 | 179 | 20 | 0 | 0 | 1520 |  |
| Long | 19302 | 17402 | 657 | 1.19 | 1.88 | 163.33–163.33 (median 163.33) | 1485 | 4544 | 1026 | 4164 | 1902 | 1095 | 2235 | 0 | 249 | 45 | 0 | 0 | 1900 |  |
| Wide | 54908 | 43965 | 229 | 0.74 | 2.59 | 20.42–163.33 (median 163.33) | 10596 | 23570 | 985 | 6050 | 1115 | 225 | 1065 | 0 | 114 | 16 | 0 | 8288 | 2655 |  |
| Signals | 3780 | – | 3054 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 3054 units (pair × symbol × direction) active at the run start, 3462 over the run; 2317 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 9210 | 2478 (27 %) | 5396 | 84 % | 1.13 | 155.07 |
| Micro | trailing | 18292 | 4644 (25 %) | 10934 | 71 % | 0.96 | -106.00 |
| Short | normal | 11329 | 3797 (34 %) | 9144 | 75 % | 1.93 | 6780.60 |
| Short | trailing | 22638 | 7942 (35 %) | 21466 | 70 % | 1.71 | 8893.19 |
| General | normal | 7496 | 1122 (15 %) | 4001 | 41 % | 0.90 | -639.00 |
| General | trailing | 4977 | 1218 (24 %) | 2678 | 67 % | 1.18 | 493.42 |
| Long | normal | 11591 | 1575 (14 %) | 4517 | 47 % | 1.31 | 2783.70 |
| Long | trailing | 7711 | 1341 (17 %) | 2667 | 67 % | 1.79 | 2770.67 |
| Wide | axis | 46620 | 8457 (18 %) | 51391 | 35 % | 0.91 | -3151.57 |
| Wide | dca | 4144 | 1247 (30 %) | 3831 | 80 % | 1.17 | 633.37 |
| Wide | dca-active | 4144 | 584 (14 %) | 3139 | 38 % | 0.65 | -948.39 |
| Signals | normal | 1890 | 938 (50 %) | 7154 | 73 % | 1.26 | 3426.70 |
| Signals | trailing | 1890 | 1106 (59 %) | 6608 | 77 % | 2.23 | 6155.80 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1206 | 400 (33 %) | 530 | 98 % | 11.09 | 154.95 |
| Short | active | 39 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | bollinger | 63 | 6 (10 %) | 6 | 100 % | ∞ (no loss) | 10.60 |
| Short | break | 235 | 51 (22 %) | 66 | 88 % | 10.97 | 80.20 |
| Short | channel | 17 | 0 (0 %) | 8 | 0 % | 0.00 | -34.50 |
| Short | direction | 132 | 47 (36 %) | 47 | 100 % | ∞ (no loss) | 77.76 |
| Short | ema | 53 | 34 (64 %) | 34 | 100 % | ∞ (no loss) | 60.86 |
| Short | ichimoku | 2 | 1 (50 %) | 1 | 100 % | ∞ (no loss) | 2.00 |
| Short | macd | 25 | 3 (12 %) | 23 | 65 % | 1.20 | 3.87 |
| Short | move | 164 | 30 (18 %) | 33 | 91 % | 5.54 | 50.45 |
| Short | osc | 189 | 50 (26 %) | 143 | 59 % | 1.39 | 41.08 |
| Short | rsi | 36 | 1 (3 %) | 2 | 50 % | 64.73 | 2.28 |
| Short | smooth | 21 | 2 (10 %) | 4 | 50 % | 6.09 | 2.15 |
| Short | trend | 129 | 51 (40 %) | 58 | 97 % | 204.29 | 85.72 |
| Short | volume | 64 | 30 (47 %) | 48 | 90 % | 6.42 | 63.90 |
| General | active | 13 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 26 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 82 | 20 (24 %) | 29 | 69 % | 1.88 | 32.63 |
| General | channel | 9 | 0 (0 %) | 3 | 0 % | 0.00 | -12.20 |
| General | direction | 6 | 5 (83 %) | 5 | 100 % | ∞ (no loss) | 9.10 |
| General | ema | 14 | 4 (29 %) | 4 | 100 % | ∞ (no loss) | 10.53 |
| General | macd | 4 | 0 (0 %) | 1 | 0 % | 0.00 | -3.20 |
| General | move | 24 | 3 (13 %) | 3 | 100 % | ∞ (no loss) | 5.93 |
| General | osc | 134 | 7 (5 %) | 41 | 32 % | 0.34 | -67.01 |
| General | rsi | 20 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | trend | 33 | 6 (18 %) | 6 | 100 % | ∞ (no loss) | 9.09 |
| General | volume | 40 | 10 (25 %) | 22 | 45 % | 0.49 | -21.61 |
| Long | active | 20 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | bollinger | 25 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 118 | 18 (15 %) | 30 | 60 % | 1.57 | 30.45 |
| Long | channel | 33 | 1 (3 %) | 7 | 14 % | 0.01 | -27.17 |
| Long | direction | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | ema | 21 | 4 (19 %) | 4 | 100 % | ∞ (no loss) | 20.00 |
| Long | macd | 3 | 0 (0 %) | 1 | 0 % | 0.00 | -3.20 |
| Long | move | 101 | 0 (0 %) | 15 | 0 % | 0.00 | -72.60 |
| Long | osc | 197 | 16 (8 %) | 73 | 45 % | 0.95 | -7.89 |
| Long | rsi | 24 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 19 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | trend | 56 | 1 (2 %) | 1 | 100 % | ∞ (no loss) | 6.20 |
| Long | volume | 34 | 9 (26 %) | 19 | 47 % | 1.09 | 3.42 |
| Wide | active | 40 | 0 (0 %) | 6 | 0 % | 0.00 | -4.64 |
| Wide | bollinger | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | break | 6 | 0 (0 %) | 3 | 0 % | 0.00 | -0.60 |
| Wide | channel | 20 | 0 (0 %) | 2 | 0 % | 0.00 | -1.40 |
| Wide | direction | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | ema | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 12 | 3 (25 %) | 3 | 100 % | ∞ (no loss) | 3.40 |
| Wide | osc | 63 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | rsi | 21 | 6 (29 %) | 18 | 33 % | 12.67 | 28.02 |
| Wide | smooth | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | volume | 39 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | signal:act-burst | 29 | 6 (21 %) | 74 | 49 % | 0.38 | -126.64 |
| Signals | signal:act-hf | 60 | 39 (65 %) | 389 | 72 % | 1.27 | 135.53 |
| Signals | signal:adx | 43 | 35 (81 %) | 69 | 81 % | 2.43 | 73.85 |
| Signals | signal:atr-break | 45 | 31 (69 %) | 128 | 75 % | 1.27 | 47.18 |
| Signals | signal:bollinger | 21 | 11 (52 %) | 29 | 66 % | 0.95 | -2.64 |
| Signals | signal:cci | 28 | 19 (68 %) | 84 | 73 % | 1.24 | 25.90 |
| Signals | signal:cmf | 60 | 52 (87 %) | 194 | 83 % | 3.64 | 393.51 |
| Signals | signal:donchian | 40 | 38 (95 %) | 107 | 85 % | 10.84 | 222.14 |
| Signals | signal:ema-cross | 17 | 17 (100 %) | 60 | 90 % | 5.76 | 125.47 |
| Signals | signal:ema-cross-fast | 34 | 30 (88 %) | 102 | 81 % | 2.95 | 108.14 |
| Signals | signal:ema-pullback | 31 | 26 (84 %) | 138 | 76 % | 2.52 | 199.41 |
| Signals | signal:ema-slope | 38 | 38 (100 %) | 99 | 98 % | 1360.88 | 282.94 |
| Signals | signal:ema-trend | 40 | 40 (100 %) | 55 | 98 % | 1474.51 | 153.29 |
| Signals | signal:heikin-ashi | 59 | 24 (41 %) | 341 | 62 % | 0.69 | -222.83 |
| Signals | signal:hma | 60 | 42 (70 %) | 181 | 74 % | 1.40 | 113.04 |
| Signals | signal:ichimoku | 25 | 23 (92 %) | 42 | 90 % | 256.29 | 82.39 |
| Signals | signal:impulse | 59 | 56 (95 %) | 213 | 85 % | 4.71 | 386.02 |
| Signals | signal:kama | 53 | 30 (57 %) | 186 | 70 % | 1.07 | 18.91 |
| Signals | signal:keltner | 59 | 38 (64 %) | 133 | 71 % | 1.05 | 11.29 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 205 | 84 % | 7.40 | 354.24 |
| Signals | signal:macd-hist | 60 | 45 (75 %) | 238 | 74 % | 1.74 | 170.94 |
| Signals | signal:macd-slow | 60 | 55 (92 %) | 199 | 79 % | 3.16 | 287.43 |
| Signals | signal:mfi | 30 | 29 (97 %) | 57 | 89 % | 14.74 | 144.79 |
| Signals | signal:obv | 40 | 35 (88 %) | 109 | 83 % | 3.33 | 139.18 |
| Signals | signal:r-awesome | 60 | 42 (70 %) | 234 | 72 % | 1.41 | 117.87 |
| Signals | signal:r-connors | 30 | 30 (100 %) | 75 | 92 % | 26.87 | 233.07 |
| Signals | signal:r-fractal | 51 | 26 (51 %) | 162 | 65 % | 0.77 | -71.42 |
| Signals | signal:r-inside | 10 | 9 (90 %) | 11 | 91 % | 2.74 | 6.87 |
| Signals | signal:r-linreg | 57 | 44 (77 %) | 207 | 78 % | 2.12 | 275.76 |
| Signals | signal:r-nr-break | 60 | 49 (82 %) | 275 | 79 % | 1.83 | 253.97 |
| Signals | signal:r-vol-regime | 16 | 14 (88 %) | 25 | 84 % | 151.24 | 33.76 |
| Signals | signal:reclaim | 43 | 41 (95 %) | 104 | 92 % | 11.45 | 240.16 |
| Signals | signal:rsi-mid | 60 | 54 (90 %) | 233 | 82 % | 2.57 | 297.94 |
| Signals | signal:rsi-reversal | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 15.64 |
| Signals | signal:s2-active-hf | 58 | 28 (48 %) | 260 | 72 % | 0.97 | -12.93 |
| Signals | signal:s2-adx-gate | 49 | 33 (67 %) | 176 | 75 % | 1.55 | 110.51 |
| Signals | signal:s2-atr-break | 60 | 46 (77 %) | 406 | 73 % | 1.40 | 199.26 |
| Signals | signal:s2-bb-bounce | 9 | 0 (0 %) | 11 | 0 % | 0.00 | -49.02 |
| Signals | signal:s2-block-scale | 48 | 31 (65 %) | 227 | 79 % | 1.41 | 123.55 |
| Signals | signal:s2-block-stack | 46 | 32 (70 %) | 145 | 75 % | 1.29 | 52.03 |
| Signals | signal:s2-confluence | 51 | 32 (63 %) | 188 | 76 % | 1.30 | 89.67 |
| Signals | signal:s2-ema-cross | 10 | 9 (90 %) | 10 | 90 % | 176.56 | 18.26 |
| Signals | signal:s2-range-break | 48 | 15 (31 %) | 111 | 60 % | 0.47 | -163.12 |
| Signals | signal:s2-range-shift | 41 | 32 (78 %) | 94 | 73 % | 2.14 | 84.97 |
| Signals | signal:s2-rsi-revert | 17 | 13 (76 %) | 20 | 70 % | 4.72 | 17.02 |
| Signals | signal:s2-st-trail | 12 | 11 (92 %) | 14 | 93 % | 647.67 | 15.62 |
| Signals | signal:s2-stoch-swing | 32 | 20 (63 %) | 60 | 72 % | 1.02 | 1.53 |
| Signals | signal:sar | 59 | 24 (41 %) | 236 | 67 % | 0.70 | -158.88 |
| Signals | signal:squeeze | 14 | 13 (93 %) | 15 | 87 % | 135.48 | 23.39 |
| Signals | signal:st-slow | 7 | 7 (100 %) | 9 | 100 % | ∞ (no loss) | 8.34 |
| Signals | signal:stoch-rsi | 53 | 31 (58 %) | 203 | 64 % | 0.86 | -49.89 |
| Signals | signal:supertrend | 35 | 32 (91 %) | 67 | 87 % | 25.78 | 128.69 |
| Signals | signal:swing | 60 | 41 (68 %) | 240 | 68 % | 1.18 | 67.57 |
| Signals | signal:thrust | 60 | 54 (90 %) | 341 | 78 % | 2.31 | 419.71 |
| Signals | signal:trix | 24 | 23 (96 %) | 56 | 95 % | 464.44 | 129.08 |
| Signals | signal:vwap | 17 | 17 (100 %) | 26 | 96 % | 447.04 | 46.40 |
| Signals | signal:williams-r | 39 | 36 (92 %) | 90 | 87 % | 4.61 | 182.88 |
| Signals | signal:zscore | 22 | 13 (59 %) | 30 | 67 % | 1.09 | 3.77 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Short | 1.1 | 283 | 119 (42 %) | 252 | 70 % | 1.82 | 136.32 |
| Short | 1.25 | 249 | 107 (43 %) | 232 | 70 % | 1.87 | 129.57 |
| Short | 1.35 | 230 | 101 (44 %) | 218 | 70 % | 1.90 | 124.04 |
| Short | 1.5 | 197 | 89 (45 %) | 187 | 68 % | 1.85 | 101.28 |
| Short | 1.75 | 129 | 53 (41 %) | 112 | 63 % | 1.54 | 41.80 |
| Short | 2 | 83 | 28 (34 %) | 66 | 55 % | 1.06 | 3.56 |
| General | 1.1 | 141 | 33 (23 %) | 67 | 58 % | 1.05 | 5.54 |
| General | 1.25 | 128 | 32 (25 %) | 61 | 61 % | 1.18 | 16.58 |
| General | 1.35 | 119 | 31 (26 %) | 59 | 61 % | 1.18 | 16.38 |
| General | 1.5 | 101 | 29 (29 %) | 54 | 63 % | 1.30 | 22.58 |
| General | 1.75 | 50 | 14 (28 %) | 30 | 50 % | 0.78 | -13.10 |
| General | 2 | 24 | 8 (33 %) | 20 | 45 % | 0.75 | -10.31 |
| Long | 1.1 | 292 | 46 (16 %) | 134 | 47 % | 0.94 | -17.92 |
| Long | 1.25 | 262 | 38 (15 %) | 113 | 43 % | 0.81 | -51.61 |
| Long | 1.35 | 235 | 32 (14 %) | 100 | 40 % | 0.69 | -75.84 |
| Long | 1.5 | 196 | 29 (15 %) | 82 | 44 % | 0.80 | -36.34 |
| Long | 1.75 | 135 | 20 (15 %) | 59 | 41 % | 0.73 | -36.57 |
| Long | 2 | 88 | 14 (16 %) | 38 | 47 % | 0.89 | -8.47 |
| Wide | 1.1 | 6 | 0 (0 %) | 3 | 0 % | 0.00 | -0.60 |
| Wide | 1.25 | 6 | 0 (0 %) | 3 | 0 % | 0.00 | -0.60 |
| Wide | 1.35 | 6 | 0 (0 %) | 3 | 0 % | 0.00 | -0.60 |
| Wide | 1.5 | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -0.60 |
| Signals | 1.1 | 478 | 351 (73 %) | 1706 | 76 % | 1.59 | 1219.87 |
| Signals | 1.25 | 231 | 174 (75 %) | 825 | 78 % | 1.77 | 683.00 |
| Signals | 1.35 | 152 | 112 (74 %) | 561 | 78 % | 1.66 | 407.70 |
| Signals | 1.5 | 79 | 62 (78 %) | 291 | 77 % | 1.85 | 224.26 |
| Signals | 1.75 | 37 | 29 (78 %) | 135 | 79 % | 2.23 | 114.91 |
| Signals | 2 | 16 | 13 (81 %) | 58 | 81 % | 3.04 | 51.96 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | ribbon | mc-mturn-10@m15c | 116 | 116 (100 %) | 232 | 100 % | ∞ (no loss) | 79.20 | – |
| Micro | magnet | mc-rsi2-5@m5 | 104 | 104 (100 %) | 104 | 100 % | ∞ (no loss) | 28.20 | – |
| Micro | ribbon | mc-trsi2-10@m15c | 70 | 70 (100 %) | 70 | 100 % | ∞ (no loss) | 24.10 | – |
| Micro | ribbon | mc-trsi2-10@m15 | 54 | 54 (100 %) | 54 | 100 % | ∞ (no loss) | 17.70 | – |
| Micro | sandwich | mc-ibrk@m5 | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 8.05 | – |
| Micro | pulse | mc-ibrk@m5 | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 8.05 | – |
| Micro | revert | mc-tpull-8@m5c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 2.40 | – |
| Micro | revert | mc-rsimid-14@m5c | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -11.45 | – |
| Short | revert | r-klinger-m@m15c | 29 | 29 (100 %) | 42 | 100 % | ∞ (no loss) | 73.90 | – |
| Short | sandwich | dir-vwap-120@m15c | 41 | 41 (100 %) | 41 | 100 % | ∞ (no loss) | 68.13 | – |
| Short | sandwich | trend-st-14-4@m15c | 31 | 31 (100 %) | 31 | 100 % | ∞ (no loss) | 53.69 | – |
| Short | sandwich | move-impulse@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 38.15 | – |
| Short | sandwich | break-don10@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 37.15 | – |
| Short | pivot | willr-28-95@m15 | 11 | 11 (100 %) | 20 | 100 % | ∞ (no loss) | 35.24 | – |
| Short | sandwich | ema-slope-10@m15 | 19 | 19 (100 %) | 19 | 100 % | ∞ (no loss) | 34.82 | – |
| Short | revert | r-bos@m15c | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 21.60 | – |
| Short | ribbon | willr-28-95@m15 | 6 | 6 (100 %) | 11 | 100 % | ∞ (no loss) | 18.59 | – |
| Short | ribbon | ema-slope@m15c | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 16.88 | – |
| Short | sandwich | trend-st-21-5@m15 | 10 | 10 (100 %) | 16 | 94 % | 77.53 | 16.14 | – |
| Short | sweep | willr-21-90@m15c | 6 | 5 (83 %) | 19 | 63 % | 2.99 | 14.02 | tp2.8 sl2.8 tr2.1 h96 sh (5 · 0.52 · -2.98) |
| Short | revert | r-roofing@m15 | 35 | 8 (23 %) | 8 | 100 % | ∞ (no loss) | 12.31 | – |
| Short | ribbon | move-swing@m30 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 12.20 | – |
| Short | ribbon | r-bb-adx@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.60 | – |
| Short | ribbon | macd-cross@m15 | 3 | 3 (100 %) | 19 | 68 % | 2.12 | 9.87 | tp1.8 sl2.7 tr1.35 h64 sh (6 · 2.17 · 3.45) |
| Short | magnet | cci-14-200@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 9.46 | – |
| Short | revert | break-squeeze-120@m30 | 8 | 6 (75 %) | 6 | 100 % | ∞ (no loss) | 7.06 | – |
| Short | ribbon | willr-7-90@m30 | 3 | 1 (33 %) | 7 | 71 % | 2.97 | 6.77 | – |
| Short | pivot | willr-50-90@m30 | 10 | 8 (80 %) | 23 | 48 % | 1.46 | 5.28 | – |
| Short | sweep | willr-7-95@m15 | 2 | 2 (100 %) | 6 | 67 % | 2.91 | 4.61 | – |
| Short | pivot | break-squeeze-t10@m30 | 6 | 2 (33 %) | 11 | 64 % | 13.28 | 3.25 | – |
| Short | sweep | r-td-m@m15 | 8 | 5 (63 %) | 8 | 63 % | 1.01 | 0.10 | – |
| Short | follow | r-fisher-m@m15c | 4 | 0 (0 %) | 6 | 0 % | 0.00 | -0.54 | – |
| Short | follow | r-nr-break@m15c | 2 | 0 (0 %) | 5 | 40 % | 0.47 | -4.10 | – |
| Short | sweep | willr-28-95@m30 | 7 | 0 (0 %) | 14 | 7 % | 0.11 | -20.28 | – |
| Short | pivot | aroon-14@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -34.50 | – |
| Short | sweep | willr-7-90@m30 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -45.24 | – |
| General | revert | r-bos@m15c | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 43.80 | – |
| General | revert | r-klinger-m@m15c | 10 | 9 (90 %) | 10 | 90 % | 5.55 | 14.55 | – |
| General | sandwich | trend-st-14-4@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 9.09 | – |
| General | ribbon | r-fisher-m@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -28.50 | – |
| General | ribbon | r-klinger@m30 | 11 | 1 (9 %) | 12 | 8 % | 0.08 | -36.17 | – |
| General | pivot | break-don55@m15c | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -37.10 | – |
| General | sweep | willr-7-90@m30 | 8 | 0 (0 %) | 11 | 0 % | 0.00 | -43.40 | – |
| Long | sweep | willr-21-90@m15c | 12 | 11 (92 %) | 20 | 80 % | 7.71 | 54.49 | – |
| Long | revert | r-bos@m15c | 17 | 11 (65 %) | 11 | 100 % | ∞ (no loss) | 52.46 | – |
| Long | sweep | willr-50-90@m30 | 6 | 5 (83 %) | 17 | 65 % | 1.73 | 26.20 | – |
| Long | revert | r-klinger-m@m15c | 7 | 6 (86 %) | 7 | 86 % | 6.44 | 18.48 | – |
| Long | ribbon | r-klinger-m@m15 | 4 | 3 (75 %) | 6 | 50 % | 1.86 | 8.40 | – |
| Long | sweep | willr-21-90@m30 | 3 | 0 (0 %) | 6 | 50 % | 0.93 | -1.20 | – |
| Long | ribbon | r-klinger@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -23.47 | – |
| Long | pivot | aroon-14@m15c | 7 | 0 (0 %) | 6 | 0 % | 0.00 | -27.40 | – |
| Long | pivot | break-don55@m15c | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -46.40 | – |
| Long | pivot | move-impulse@m15c | 14 | 0 (0 %) | 13 | 0 % | 0.00 | -60.20 | – |
| Long | sweep | willr-7-90@m30 | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -70.70 | – |
| Wide | sweep | rsi-div@m15c | 12 | 6 (50 %) | 18 | 33 % | 12.67 | 28.02 | – |
| Signals | follow | sig-hma-m@m15 | 30 | 30 (100 %) | 84 | 96 % | 1047.79 | 250.74 | tp3 sl9 tr1.2 h96 (7 · 44.01 · 6.81) |
| Signals | follow | sig-ema-slope-s@m15 | 28 | 28 (100 %) | 79 | 99 % | 2352.48 | 244.62 | tp3 sl4.5 tr0 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 30 (100 %) | 75 | 92 % | 26.87 | 233.07 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-cmf-m@m15 | 30 | 30 (100 %) | 82 | 88 % | 11.97 | 219.39 | tp2.5 sl3.75 tr0 h96 (6 · 2.91 · 7.55) |
| Signals | follow | sig-thrust-m@m15 | 30 | 27 (90 %) | 186 | 79 % | 2.28 | 214.22 | tp2.5 sl7.5 tr0 h96 (10 · ∞ (no loss) · 23.00) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 29 (97 %) | 114 | 87 % | 9.38 | 211.18 | tp2.5 sl7.5 tr0 h96 (7 · ∞ (no loss) · 16.10) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 29 (97 %) | 89 | 92 % | 12.01 | 209.48 | tp3 sl9 tr1.2 h96 (7 · ∞ (no loss) · 11.81) |
| Signals | follow | sig-donchian-s@m15 | 29 | 28 (97 %) | 88 | 88 % | 12.47 | 208.47 | tp2.5 sl5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-thrust-s@m15 | 30 | 27 (90 %) | 155 | 76 % | 2.35 | 205.49 | tp4 sl12 tr0 h96 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 26 (87 %) | 137 | 77 % | 2.60 | 203.36 | tp4 sl12 tr3.2 h96 (5 · ∞ (no loss) · 11.73) |
| Signals | follow | sig-impulse-m@m15 | 29 | 29 (100 %) | 87 | 89 % | 7.20 | 199.58 | tp2.5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-impulse-s@m15 | 30 | 27 (90 %) | 126 | 82 % | 3.60 | 186.43 | tp3 sl9 tr1.2 h96 (12 · 35.09 · 13.70) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 27 (90 %) | 135 | 81 % | 2.45 | 175.41 | tp2.5 sl3.75 tr0 h96 (13 · 1.94 · 11.15) |
| Signals | follow | sig-cmf-s@m15 | 30 | 22 (73 %) | 112 | 79 % | 2.35 | 174.12 | tp4 sl12 tr1.6 h96 (6 · 23.61 · 11.26) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 27 (90 %) | 118 | 81 % | 3.06 | 173.35 | tp3 sl9 tr1.2 h96 (10 · 8.04 · 8.99) |
| Signals | follow | sig-swing-s@m15 | 30 | 27 (90 %) | 134 | 77 % | 2.36 | 170.86 | tp4 sl12 tr1.6 h96 (7 · ∞ (no loss) · 8.92) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 28 (93 %) | 75 | 89 % | 4.94 | 164.90 | tp3 sl9 tr1.8 h96 (5 · ∞ (no loss) · 11.23) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 30 (100 %) | 76 | 84 % | 11.79 | 159.85 | tp3 sl9 tr1.8 h96 (5 · 22.77 · 5.54) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 27 (90 %) | 153 | 80 % | 2.12 | 152.08 | tp2.5 sl7.5 tr0 h96 (9 · 2.39 · 10.70) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 19 (63 %) | 161 | 75 % | 1.65 | 148.91 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 14.86) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 27 (90 %) | 80 | 85 % | 3.69 | 145.85 | tp3 sl9 tr1.2 h96 (6 · 1274.85 · 7.10) |
| Signals | follow | sig-mfi-m@m15 | 30 | 29 (97 %) | 57 | 89 % | 14.74 | 144.79 | – |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 27 (90 %) | 91 | 81 % | 5.75 | 143.06 | tp2.5 sl3.75 tr0 h96 (8 · 4.08 · 12.15) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 27 (90 %) | 91 | 81 % | 5.75 | 143.06 | tp2.5 sl3.75 tr0 h96 (8 · 4.08 · 12.15) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 26 (87 %) | 112 | 79 % | 2.99 | 139.97 | tp3 sl9 tr0 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 23 (77 %) | 197 | 77 % | 1.67 | 139.49 | tp3 sl4.5 tr0 h96 (11 · 2.68 · 15.80) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 24 (80 %) | 141 | 76 % | 1.98 | 135.64 | tp3 sl9 tr1.2 h96 (14 · 40.77 · 17.17) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 30 (100 %) | 41 | 98 % | 1291.40 | 134.24 | – |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 25 (83 %) | 123 | 76 % | 2.08 | 127.58 | tp3 sl9 tr1.2 h96 (12 · 5.08 · 8.29) |
| Signals | follow | sig-r-linreg-m@m15 | 27 | 25 (93 %) | 46 | 89 % | 8.08 | 126.85 | tp2.5 sl3.75 tr0 h96 (5 · 0.87 · -1.00) |
| Signals | follow | sig-ema-cross-s@m15 | 17 | 17 (100 %) | 60 | 90 % | 5.76 | 125.47 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-trix-s@m15 | 18 | 18 (100 %) | 50 | 96 % | 700.67 | 121.70 | – |
| Signals | follow | sig-supertrend-s@m15 | 30 | 28 (93 %) | 61 | 87 % | 24.48 | 121.38 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-keltner-s@m15 | 30 | 28 (93 %) | 63 | 86 % | 11.44 | 108.84 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-obv-s@m15 | 30 | 25 (83 %) | 88 | 78 % | 2.77 | 105.56 | tp3 sl9 tr1.2 h96 (12 · 20.00 · 9.39) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 23 (77 %) | 165 | 73 % | 1.53 | 102.37 | tp3 sl9 tr0 h96 (9 · 2.43 · 13.20) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 23 (77 %) | 241 | 73 % | 1.31 | 96.89 | tp3 sl9 tr0 h96 (11 · 3.04 · 18.80) |
| Signals | follow | sig-kama-s@m15 | 30 | 23 (77 %) | 131 | 76 % | 1.65 | 96.39 | tp2.5 sl3.75 tr0 h96 (10 · 2.33 · 10.50) |
| Signals | follow | sig-s2-range-shift-m@m15 | 29 | 24 (83 %) | 75 | 76 % | 2.23 | 81.75 | tp3 sl9 tr1.8 h96 (6 · 3.03 · 4.03) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 22 (73 %) | 140 | 76 % | 1.43 | 78.56 | tp5 sl15 tr2 h96 (7 · ∞ (no loss) · 7.72) |
| Signals | follow | sig-adx-m@m15 | 29 | 26 (90 %) | 30 | 90 % | 14.22 | 76.52 | – |
| Signals | follow | sig-s2-block-scale-m@m15 | 23 | 15 (65 %) | 109 | 81 % | 1.48 | 66.55 | tp3 sl9 tr1.8 h96 (8 · ∞ (no loss) · 16.09) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 13 | 13 (100 %) | 33 | 97 % | 628.07 | 65.23 | – |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 19 (63 %) | 119 | 73 % | 1.42 | 64.43 | tp4 sl12 tr2.4 h96 (6 · ∞ (no loss) · 13.68) |
| Signals | follow | sig-s2-block-scale-s@m15 | 25 | 16 (64 %) | 118 | 78 % | 1.34 | 57.01 | tp3 sl9 tr1.2 h96 (13 · 194.86 · 16.74) |
| Signals | follow | sig-ichimoku-s@m15 | 13 | 12 (92 %) | 30 | 90 % | 276.70 | 54.62 | tp3 sl9 tr1.2 h96 (5 · 19.11 · 2.87) |
| Signals | follow | sig-s2-confluence-s@m15 | 23 | 14 (61 %) | 109 | 76 % | 1.29 | 50.58 | tp3 sl9 tr1.8 h96 (6 · ∞ (no loss) · 15.00) |
| Signals | follow | sig-s2-block-stack-s@m15 | 23 | 18 (78 %) | 78 | 76 % | 1.64 | 50.13 | tp2.5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 14 | 13 (93 %) | 20 | 90 % | 13.07 | 47.99 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 21 | 17 (81 %) | 69 | 74 % | 1.78 | 42.91 | tp3 sl9 tr1.2 h96 (6 · 690.63 · 3.84) |
| Signals | follow | sig-s2-confluence-m@m15 | 28 | 18 (64 %) | 79 | 76 % | 1.32 | 39.09 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 6.41) |
| Signals | follow | sig-ema-slope-m@m15 | 10 | 10 (100 %) | 20 | 95 % | 369.28 | 38.31 | – |
| Signals | follow | sig-cci-m@m15 | 10 | 9 (90 %) | 23 | 83 % | 5.37 | 38.05 | – |
| Signals | follow | sig-r-vol-regime-s@m15 | 16 | 14 (88 %) | 25 | 84 % | 151.24 | 33.76 | – |
| Signals | follow | sig-obv-m@m15 | 10 | 10 (100 %) | 21 | 100 % | ∞ (no loss) | 33.62 | – |
| Signals | follow | sig-vwap-m@m15 | 13 | 13 (100 %) | 15 | 100 % | ∞ (no loss) | 33.23 | – |
| Signals | follow | sig-reclaim-m@m15 | 13 | 12 (92 %) | 15 | 93 % | 8.77 | 30.68 | – |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 18 (60 %) | 147 | 69 % | 1.14 | 27.88 | tp2.5 sl5 tr0 h96 (10 · 3.98 · 15.50) |
| Signals | follow | sig-ichimoku-m@m15 | 12 | 11 (92 %) | 12 | 92 % | 223.84 | 27.77 | – |
| Signals | follow | sig-atr-break-m@m15 | 16 | 14 (88 %) | 18 | 83 % | 128.87 | 24.23 | – |
| Signals | follow | sig-squeeze-s@m15 | 14 | 13 (93 %) | 15 | 87 % | 135.48 | 23.39 | – |
| Signals | follow | sig-atr-break-s@m15 | 29 | 17 (59 %) | 110 | 74 % | 1.13 | 22.95 | tp2.5 sl5 tr0 h96 (7 · 2.65 · 8.60) |
| Signals | follow | sig-zscore-m@m15 | 10 | 9 (90 %) | 12 | 83 % | 181.44 | 21.46 | – |
| Signals | follow | sig-ema-trend-m@m15 | 10 | 10 (100 %) | 14 | 100 % | ∞ (no loss) | 19.05 | – |
| Signals | follow | sig-s2-ema-cross-s@m15 | 10 | 9 (90 %) | 10 | 90 % | 176.56 | 18.26 | – |
| Signals | follow | sig-williams-r-m@m15 | 9 | 8 (89 %) | 15 | 73 % | 3.05 | 17.98 | – |
| Signals | follow | sig-bollinger-m@m15 | 9 | 7 (78 %) | 11 | 82 % | 2.74 | 15.05 | – |
| Signals | follow | sig-donchian-m@m15 | 11 | 10 (91 %) | 19 | 74 % | 4.11 | 13.67 | – |
| Signals | follow | sig-vwap-s@m15 | 4 | 4 (100 %) | 11 | 91 % | 127.58 | 13.17 | – |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 7 | 7 (100 %) | 10 | 80 % | 170.08 | 9.71 | – |
| Signals | follow | sig-st-slow-s@m15 | 7 | 7 (100 %) | 9 | 100 % | ∞ (no loss) | 8.34 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 7 | 7 (100 %) | 8 | 100 % | ∞ (no loss) | 8.32 | – |
| Signals | follow | sig-trix-m@m15 | 6 | 5 (83 %) | 6 | 83 % | 71.49 | 7.37 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 10 | 6 (60 %) | 10 | 60 % | 2.62 | 7.31 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 5 | 4 (80 %) | 6 | 83 % | 303.44 | 7.31 | – |
| Signals | follow | sig-supertrend-m@m15 | 5 | 4 (80 %) | 6 | 83 % | 303.44 | 7.31 | – |
| Signals | follow | sig-r-inside-s@m15 | 10 | 9 (90 %) | 11 | 91 % | 2.74 | 6.87 | – |
| Signals | follow | sig-s2-range-shift-s@m15 | 12 | 8 (67 %) | 19 | 63 % | 1.39 | 3.22 | – |
| Signals | follow | sig-s2-block-stack-m@m15 | 23 | 14 (61 %) | 67 | 75 % | 1.02 | 1.90 | tp3 sl9 tr1.2 h96 (5 · 61.96 · 5.27) |
| Signals | follow | sig-adx-s@m15 | 14 | 9 (64 %) | 39 | 74 % | 0.94 | -2.67 | tp3 sl9 tr1.2 h96 (7 · 105.30 · 6.35) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 16 (53 %) | 192 | 66 % | 0.99 | -3.95 | tp4 sl12 tr1.6 h96 (9 · 67.43 · 10.17) |
| Signals | follow | sig-s2-active-hf-m@m15 | 29 | 14 (48 %) | 130 | 72 % | 0.97 | -6.46 | tp2.5 sl3.75 tr0 h96 (12 · 1.75 · 8.85) |
| Signals | follow | sig-s2-active-hf-s@m15 | 29 | 14 (48 %) | 130 | 72 % | 0.97 | -6.46 | tp2.5 sl3.75 tr0 h96 (12 · 1.75 · 8.85) |
| Signals | follow | sig-cci-s@m15 | 18 | 10 (56 %) | 61 | 69 % | 0.88 | -12.14 | tp3 sl9 tr1.2 h96 (8 · 58.57 · 8.27) |
| Signals | follow | sig-bollinger-s@m15 | 12 | 4 (33 %) | 18 | 56 % | 0.58 | -17.69 | – |
| Signals | follow | sig-zscore-s@m15 | 12 | 4 (33 %) | 18 | 56 % | 0.58 | -17.69 | – |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 16 (53 %) | 122 | 66 % | 0.90 | -22.11 | tp4 sl12 tr2.4 h96 (5 · 12.47 · 6.07) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 18 | 7 (39 %) | 40 | 63 % | 0.52 | -46.46 | tp3 sl9 tr1.2 h96 (5 · 30.75 · 4.53) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 8 | 0 (0 %) | 10 | 0 % | 0.00 | -48.86 | – |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 14 (47 %) | 184 | 66 % | 0.83 | -59.37 | tp4 sl12 tr1.6 h96 (8 · 18.28 · 6.47) |
| Signals | follow | sig-s2-range-break-s@m15 | 24 | 9 (38 %) | 63 | 65 % | 0.62 | -59.39 | – |
| Signals | follow | sig-s2-adx-gate-m@m15 | 19 | 6 (32 %) | 58 | 64 % | 0.46 | -62.84 | tp2.5 sl3.75 tr0 h96 (7 · 1.46 · 3.60) |
| Signals | follow | sig-sar-m@m15 | 29 | 11 (38 %) | 107 | 65 % | 0.73 | -71.60 | tp2.5 sl3.75 tr0 h96 (8 · 1.75 · 5.90) |
| Signals | follow | sig-kama-m@m15 | 23 | 7 (30 %) | 55 | 58 % | 0.39 | -77.48 | tp3 sl9 tr1.2 h96 (5 · 0.35 · -5.99) |
| Signals | follow | sig-sar-s@m15 | 30 | 13 (43 %) | 129 | 67 % | 0.67 | -87.28 | tp2.5 sl3.75 tr0 h96 (12 · 1.75 · 8.85) |
| Signals | follow | sig-keltner-m@m15 | 29 | 10 (34 %) | 70 | 57 % | 0.51 | -97.55 | tp2.5 sl3.75 tr0 h96 (5 · 0.87 · -1.00) |
| Signals | follow | sig-swing-m@m15 | 30 | 14 (47 %) | 106 | 58 % | 0.57 | -103.29 | tp4 sl12 tr1.6 h96 (5 · 593.33 · 4.37) |
| Signals | follow | sig-s2-range-break-m@m15 | 24 | 6 (25 %) | 48 | 54 % | 0.33 | -103.73 | – |
| Signals | follow | sig-act-burst-s@m15 | 25 | 3 (12 %) | 70 | 47 % | 0.35 | -133.38 | tp2.5 sl7.5 tr0 h96 (6 · 1.49 · 3.80) |
| Signals | follow | sig-r-fractal-m@m15 | 21 | 7 (33 %) | 43 | 42 % | 0.13 | -135.85 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-hma-s@m15 | 30 | 12 (40 %) | 97 | 55 % | 0.51 | -137.70 | tp2.5 sl3.75 tr0 h96 (9 · 1.16 · 1.95) |
| Signals | follow | sig-heikin-ashi-m@m15 | 29 | 10 (34 %) | 157 | 58 % | 0.55 | -163.46 | tp5 sl15 tr2 h96 (7 · 3.14 · 5.29) |
| Signals | follow | sig-stoch-rsi-m@m15 | 23 | 7 (30 %) | 62 | 35 % | 0.18 | -185.53 | tp4 sl12 tr1.6 h96 (5 · 2.82 · 0.88) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 91 | 89 (98 %) | 321 | 89 % | 33.95 | 394.26 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 54 | 54 (100 %) | 74 | 97 % | 484.08 | 392.86 |
| Signals | tp 5.000% | sl 3.00× | tr off | 56 | 56 (100 %) | 81 | 100 % | ∞ (no loss) | 388.80 |
| Signals | tp 6.000% | sl 3.00× | tr off | 54 | 54 (100 %) | 67 | 100 % | ∞ (no loss) | 388.60 |
| Signals | tp 2.500% | sl 3.00× | tr off | 103 | 80 (78 %) | 463 | 85 % | 1.68 | 364.90 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 60 | 59 (98 %) | 102 | 94 % | 248.89 | 304.95 |
| Signals | tp 2.500% | sl 1.50× | tr off | 105 | 84 (80 %) | 632 | 71 % | 1.42 | 303.60 |
| Signals | tp 2.500% | sl 2.00× | tr off | 103 | 83 (81 %) | 544 | 77 % | 1.45 | 298.70 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 51 | 51 (100 %) | 66 | 97 % | 355.99 | 288.69 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 80 | 80 (100 %) | 238 | 80 % | 20.61 | 261.70 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 102 | 79 (77 %) | 462 | 80 % | 2.36 | 259.68 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 86 | 73 (85 %) | 301 | 80 % | 2.50 | 257.93 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 107 | 80 (75 %) | 678 | 73 % | 1.69 | 252.50 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 62 | 51 (82 %) | 108 | 71 % | 56.70 | 247.14 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 41 | 29 (71 %) | 47 | 70 % | 36.03 | 243.08 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 93 | 63 (68 %) | 372 | 73 % | 1.52 | 230.79 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 72 | 68 (94 %) | 156 | 85 % | 67.14 | 210.88 |
| Signals | tp 4.000% | sl 3.00× | tr off | 69 | 49 (71 %) | 159 | 84 % | 1.67 | 204.20 |
| Signals | tp 3.000% | sl 3.00× | tr off | 88 | 59 (67 %) | 311 | 82 % | 1.39 | 198.80 |
| Signals | tp 6.000% | sl 2.00× | tr off | 60 | 42 (70 %) | 88 | 80 % | 1.85 | 186.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 102 | 69 (68 %) | 496 | 75 % | 1.38 | 171.15 |
| Signals | tp 3.000% | sl 1.50× | tr off | 90 | 58 (64 %) | 420 | 67 % | 1.22 | 141.00 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 67 | 59 (88 %) | 128 | 78 % | 33.69 | 130.25 |
| Signals | tp 3.000% | sl 2.00× | tr off | 90 | 58 (64 %) | 381 | 72 % | 1.16 | 103.80 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 76 | 45 (59 %) | 222 | 72 % | 1.33 | 102.65 |
| Wide | tp 0.800% | sl 1.00× | tr off | 79 | 6 (8 %) | 21 | 29 % | 10.14 | 27.42 |
| Short | tp 2.200% | sl 1.50× | tr off | 29 | 13 (45 %) | 16 | 94 % | 8.57 | 26.50 |
| Short | tp 2.600% | sl 2.00× | tr off | 39 | 11 (28 %) | 17 | 88 % | 3.33 | 25.20 |
| Short | tp 2.000% | sl 2.00× | tr off | 38 | 15 (39 %) | 17 | 94 % | 6.86 | 24.60 |
| Short | tp 2.200% | sl 2.00× | tr off | 29 | 11 (38 %) | 12 | 100 % | ∞ (no loss) | 24.00 |
| Short | tp 2.000% | sl 1.00× | tr off | 17 | 7 (41 %) | 10 | 100 % | ∞ (no loss) | 18.00 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 19 | 7 (37 %) | 10 | 80 % | 2.55 | 14.26 |
| Short | tp 2.400% | sl 1.50× | tr 0.75× | 21 | 10 (48 %) | 10 | 100 % | ∞ (no loss) | 13.63 |
| General | tp 3.200% | sl 1.00× | tr 0.50× | 21 | 10 (48 %) | 12 | 92 % | 4.69 | 12.55 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 50 | 13 (26 %) | 19 | 84 % | 2.13 | 12.26 |
| Short | tp 2.400% | sl 1.50× | tr off | 21 | 7 (33 %) | 11 | 82 % | 2.61 | 12.20 |
| Short | tp 1.800% | sl 1.50× | tr 0.75× | 15 | 5 (33 %) | 15 | 73 % | 2.93 | 11.37 |
| Short | tp 2.600% | sl 2.00× | tr 0.50× | 28 | 8 (29 %) | 17 | 65 % | 9.41 | 10.96 |
| Short | tp 2.200% | sl 1.00× | tr 0.75× | 29 | 9 (31 %) | 18 | 67 % | 2.05 | 10.30 |
| Short | tp 2.800% | sl 1.50× | tr 0.75× | 23 | 9 (39 %) | 14 | 79 % | 2.99 | 10.11 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 5.000% | sl 1.50× | tr off | 74 | 29 (39 %) | 165 | 54 % | 0.73 | -158.00 |
| Signals | tp 4.000% | sl 1.50× | tr off | 76 | 35 (46 %) | 246 | 57 % | 0.82 | -115.20 |
| Signals | tp 4.000% | sl 2.00× | tr off | 71 | 30 (42 %) | 214 | 64 % | 0.82 | -110.80 |
| Signals | tp 6.000% | sl 1.50× | tr off | 66 | 30 (45 %) | 129 | 57 % | 0.85 | -76.80 |
| Signals | tp 5.000% | sl 2.00× | tr off | 68 | 29 (43 %) | 130 | 65 % | 0.89 | -51.00 |
| Long | tp 5.200% | sl 1.00× | tr off | 37 | 3 (8 %) | 16 | 44 % | 0.72 | -13.60 |
| Long | tp 4.800% | sl 0.75× | tr off | 35 | 4 (11 %) | 14 | 36 % | 0.67 | -11.20 |
| General | tp 3.600% | sl 1.00× | tr 0.50× | 17 | 6 (35 %) | 10 | 70 % | 0.72 | -3.14 |
| Wide | tp 0.760% | sl 0.89× | tr off | 95 | 3 (3 %) | 11 | 27 % | 0.56 | -2.64 |
| Long | tp 5.600% | sl 1.00× | tr off | 28 | 3 (11 %) | 10 | 50 % | 0.93 | -2.00 |
| Short | tp 2.600% | sl 1.50× | tr 0.75× | 28 | 10 (36 %) | 13 | 77 % | 0.98 | -0.23 |
| Short | tp 2.800% | sl 1.00× | tr 0.75× | 14 | 3 (21 %) | 10 | 60 % | 1.07 | 0.69 |
| Micro | tp 0.600% (net 0.400%) | sl 1.75× | tr off | 10 | 6 (60 %) | 10 | 80 % | 1.28 | 0.70 |
| Micro | tp 0.450% (net 0.250%) | sl 4.50× | tr off | 12 | 8 (67 %) | 10 | 100 % | ∞ (no loss) | 2.50 |
| Micro | tp 0.450% (net 0.250%) | sl 4.75× | tr off | 18 | 8 (44 %) | 10 | 100 % | ∞ (no loss) | 2.50 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 42 (42) | 18644 | 9146 | 9146 | 0 | baseTarget 9498 |
| Micro | trailing | 42 (42) | 37288 | 18292 | 18292 | 0 | baseTarget 18996 |
| Short | normal | 248 (203) | 34092 | 11244 | 11244 | 0 | baseRange 14580 · baseTarget 8268 |
| Short | trailing | 248 (203) | 68184 | 22488 | 22488 | 0 | baseRange 29160 · baseTarget 16536 |
| General | normal | 248 (194) | 22728 | 7416 | 7416 | 0 | baseRange 11184 · baseTarget 4128 |
| General | trailing | 248 (194) | 15152 | 4944 | 4944 | 0 | baseRange 7456 · baseTarget 2752 |
| Long | normal | 248 (212) | 28410 | 11514 | 11514 | 0 | baseRange 11580 · baseTarget 5316 |
| Long | trailing | 248 (212) | 18940 | 7676 | 7676 | 0 | baseRange 7720 · baseTarget 3544 |
| Wide | axis | 290 (290) | 46620 | 46620 | 46620 | 0 | – |
| Wide | dca | 290 (290) | 4144 | 4144 | 4144 | 0 | – |
| Wide | dca-active | 290 (290) | 4144 | 4144 | 4144 | 0 | – |

Engine indications Base evaluated that built no set: 101 (bb-bounce-20-3, bb-walk, cci-14-100, cci-20-100, cci-20-200, cmf-20-0.05, ha-1, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-20, mc-burst-2, mc-burst-3, mc-engulf-20, mc-iz-25, mc-lag-6, mc-macdh, mc-rsi14-25, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-20, mc-rsi4-25, mc-rsi4-30, mc-rsi4-5, mc-rsi5-20, mc-rsi5-25, mc-rsi5-30, mc-rsi7-15, mc-rsi7-20, mc-rsi7-25, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.86 (108) | 0.75 (142) | 1.08 (172) | 1.78 (190) | 1.45 (214) |
| 1.14× | – | 0.34 (90) | – | – | – | – | – |
| 1.25× | – | 0.33 (90) | 0.73 (108) | 0.91 (142) | 1.06 (172) | 1.51 (190) | 1.45 (214) |
| 1.33× | 0.22 (72) | – | – | – | – | – | – |
| 1.5× | 0.20 (72) | 0.35 (90) | 0.79 (108) | 0.80 (142) | 1.15 (172) | 1.61 (190) | 1.26 (214) |
| 1.75× | 0.23 (72) | 0.32 (90) | 0.71 (108) | 0.87 (142) | 1.04 (172) | 1.41 (186) | 1.37 (210) |
| 2× | 0.21 (72) | 0.29 (90) | 0.87 (108) | 0.78 (142) | 0.93 (168) | 1.68 (186) | 1.23 (210) |
| 2.25× | 0.20 (72) | 0.35 (90) | 0.80 (108) | 0.98 (138) | 0.98 (168) | 1.53 (186) | 1.12 (210) |
| 2.5× | 0.24 (72) | 0.33 (90) | 0.75 (106) | 1.01 (138) | 0.91 (168) | 1.41 (186) | 1.22 (210) |
| 2.75× | 0.22 (72) | 0.34 (88) | 0.82 (106) | 0.94 (138) | 0.85 (168) | 1.70 (186) | 1.13 (210) |
| 3× | 0.21 (72) | 0.33 (88) | 0.77 (106) | 0.90 (138) | 1.04 (168) | 1.58 (186) | 1.05 (210) |
| 3.25× | 0.32 (72) | 0.31 (88) | 0.76 (106) | 1.26 (138) | 0.98 (168) | 1.48 (186) | 1.21 (204) |
| 3.5× | 0.31 (72) | 0.29 (88) | 0.72 (106) | 1.20 (138) | 0.93 (168) | 2.01 (180) | 1.14 (204) |
| 3.75× | 0.29 (72) | 0.29 (88) | 1.19 (106) | 1.15 (138) | 0.99 (168) | 1.90 (180) | 1.07 (204) |
| 4× | 0.28 (72) | 0.28 (88) | 1.15 (106) | 1.10 (138) | 1.19 (164) | 1.81 (180) | 1.01 (204) |
| 4.25× | 0.26 (72) | 0.40 (88) | 1.15 (108) | 1.05 (138) | 1.13 (164) | 1.72 (180) | 0.96 (204) |
| 4.5× | 0.27 (72) | 0.38 (88) | 1.12 (108) | 1.01 (138) | 1.09 (164) | 1.64 (180) | 1.73 (192) |
| 4.75× | 0.27 (72) | 0.38 (90) | 1.09 (108) | 0.97 (138) | 1.04 (164) | 1.56 (180) | 1.66 (192) |
| 5× | 0.58 (72) | 0.37 (90) | 1.06 (108) | 0.94 (138) | 1.01 (164) | 2.76 (174) | 1.59 (192) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | ∞ (4) | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | 0.68 (6) | 0.18 (6) |
| 1.75× | – | – | – | – | – | ∞ (4) | 0.64 (12) |
| 2× | – | – | – | – | ∞ (4) | ∞ (12) | ∞ (8) |
| 2.25× | – | – | – | ∞ (4) | ∞ (4) | ∞ (8) | ∞ (12) |
| 2.5× | – | – | – | ∞ (4) | ∞ (4) | ∞ (8) | ∞ (4) |
| 2.75× | – | – | – | ∞ (4) | ∞ (4) | ∞ (8) | ∞ (4) |
| 3× | – | – | – | – | ∞ (4) | ∞ (8) | ∞ (4) |
| 3.25× | – | – | – | – | – | ∞ (12) | ∞ (10) |
| 3.5× | – | – | – | ∞ (4) | ∞ (4) | ∞ (16) | ∞ (10) |
| 3.75× | – | – | – | ∞ (4) | ∞ (8) | ∞ (16) | ∞ (12) |
| 4× | – | – | ∞ (4) | ∞ (4) | ∞ (8) | ∞ (16) | ∞ (12) |
| 4.25× | – | – | ∞ (4) | ∞ (8) | ∞ (8) | ∞ (18) | ∞ (12) |
| 4.5× | – | ∞ (4) | ∞ (4) | ∞ (12) | ∞ (10) | ∞ (18) | ∞ (13) |
| 4.75× | – | ∞ (4) | ∞ (8) | ∞ (12) | ∞ (10) | ∞ (18) | ∞ (14) |
| 5× | – | 0.23 (8) | ∞ (8) | ∞ (14) | ∞ (10) | ∞ (20) | ∞ (13) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | 0.00 (3) |
| 1.75× | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | – |
| 2.25× | – | – | – | – | – | – | ∞ (4) |
| 2.5× | – | – | – | – | – | – | – |
| 2.75× | – | – | – | – | – | – | – |
| 3× | – | – | – | – | – | – | – |
| 3.25× | – | – | – | – | – | – | ∞ (2) |
| 3.5× | – | – | – | ∞ (2) | – | – | ∞ (1) |
| 3.75× | – | – | – | ∞ (1) | – | – | ∞ (1) |
| 4× | – | – | – | – | – | – | ∞ (1) |
| 4.25× | – | – | – | – | – | – | ∞ (1) |
| 4.5× | – | – | – | – | – | – | ∞ (1) |
| 4.75× | – | – | – | – | – | – | ∞ (1) |
| 5× | – | 0.08 (4) | – | – | – | – | – |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.26 (2248) | 1.43 (2134) | 1.51 (2130) | 1.30 (1886) | 1.43 (1698) | 1.15 (1474) |
| 1.5× | 1.74 (1936) | 1.77 (1853) | 1.96 (1825) | 1.70 (1546) | 2.25 (1434) | 2.02 (1252) |
| 2× | 2.39 (1764) | 2.48 (1678) | 2.44 (1711) | 1.82 (1501) | 3.18 (1363) | 2.78 (1177) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 4.35 (14) | 5.70 (28) | 2.57 (33) | ∞ (2) | ∞ (4) | 0.99 (14) |
| 1.5× | 1.99 (35) | 11.17 (26) | 14.55 (29) | 4.50 (22) | 3.53 (28) | 2.18 (31) |
| 2× | 2.25 (29) | 3.01 (32) | 96.77 (23) | ∞ (17) | 3.11 (53) | 1.58 (53) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | ∞ (12) | ∞ (7) | 37.94 (5) | ∞ (1) | – | 0.78 (5) |
| 1.5× | ∞ (6) | ∞ (6) | 2.29 (5) | ∞ (3) | 2.23 (7) | ∞ (6) |
| 2× | ∞ (6) | ∞ (3) | 37.94 (5) | ∞ (5) | 2.59 (11) | 1.82 (21) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.26 (478) | 0.34 (410) | 0.44 (430) | 0.55 (387) |
| 0.75× | 1.67 (365) | 0.42 (288) | 0.45 (321) | 1.08 (274) |
| 1× | 1.92 (1125) | 1.12 (840) | 1.24 (950) | 1.13 (811) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | – | – | ∞ (1) | ∞ (1) |
| 0.75× | 3.46 (4) | 0.00 (2) | 0.15 (9) | 1.20 (8) |
| 1× | 3.08 (29) | 0.29 (24) | 0.33 (16) | 1.09 (20) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | – | – | ∞ (1) | ∞ (1) |
| 0.75× | – | – | 0.00 (6) | 1.20 (2) |
| 1× | 0.89 (9) | 0.05 (11) | 0.29 (5) | 0.18 (6) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.55 (388) | 0.58 (374) | 0.72 (350) | 0.58 (411) | 0.66 (437) |
| 0.75× | 1.11 (284) | 1.46 (264) | 1.30 (245) | 2.03 (288) | 2.11 (324) |
| 1× | 1.32 (877) | 1.68 (735) | 1.41 (646) | 3.43 (761) | 3.49 (800) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | – | 0.89 (3) | 0.00 (1) | 0.00 (6) | 0.91 (6) |
| 0.75× | 0.67 (14) | 0.49 (7) | 0.92 (7) | 0.31 (5) | 0.83 (5) |
| 1× | 0.91 (20) | 0.83 (30) | 0.83 (19) | 1.68 (16) | 2.10 (11) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | – | – | – | 0.00 (1) | – |
| 0.75× | 0.00 (4) | 0.00 (1) | 1.23 (2) | 0.00 (1) | 0.00 (1) |
| 1× | 0.00 (3) | 0.15 (7) | 0.00 (5) | 0.94 (4) | 0.00 (3) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.59 (3314) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.66 (160) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.83 (5608) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.72 (151) | 0.76 (191) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.79 (142) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 1.11 (154) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 1.00 (133) | – | – | – | – |
| 1× | – | – | – | 1.02 (34473) | – | – | – | 0.73 (10275) | 0.95 (1254) | – | 0.88 (422) | – | 1.10 (984) | 1.32 (670) | 0.58 (240) | 0.75 (190) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.56 (11) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 10.14 (21) | – | – | – | – | – | – | – | – | – | – | – | – |

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
