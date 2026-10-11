# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m+, 5m, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.10–$0.45 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1294/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 324/19072 · PF 1.55 · Micro 220/5900 · PF 2.26 · Short 646/8176 · PF 1.50 · General 499/8176 · PF 1.50 · Long 568/8176 · PF 1.50 · Signals 126/126; Main 1238 pairs, 228986 tapes, Real seats: 5986 engine configs + 3780 signal configs (every config of the active signals), compute 161 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $18.58 (-7.10 %, closed orders) · equity at end $14.79 (open at end: 35 positions / 2799 orders, MTM -$3.79 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 0.69 (gross profit $ ÷ gross loss $ as sized) · PF unit 0.39 (every order at one unit: the engine's PF) · 47 positions / 2932 orders (incl. 51 capped to $0) · WR 41.13 % · DDT (closed trades, $) 9.25 h · DDR – (net ≤ 0) · equity max drawdown $8.79 (37.30 %) · margin used max $15.08 · open avg 19.66 pos / 591.17 orders (peak 26 / 1137)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 51 orders capped to $0, 2558 scaled down (open at end: 99 capped, 2574 scaled) · binding: position cap 3300, gross cap 4748. **Without the caps:** balance $20.00 → $2.31 (-88.46 %) · PF $ 0.40 · equity at end -$18.18 · equity max drawdown $42.28 (179.20 %) · margin used max $114.40 · infeasible: margin exceeded equity for 586 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 405 | 1143  | 4.6 % | 1.529 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 405 | 1143 (+0) | 4.6 % | 1.529 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 405 | 1143 (+0) | 4.6 % | 1.529 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 362 | 1020 (-123) | 4.1 % | 1.586 |
| closes ≥ 6 | 1.00 | 6 | 1 | 575 | 1524 (+381) | 6.1 % | 1.699 |
| closes ≥ 20 | 1.00 | 20 | 1 | 288 | 862 (-281) | 3.5 % | 1.418 |
| closes ≥ 30 | 1.00 | 30 | 1 | 214 | 653 (-490) | 2.6 % | 1.349 |
| DDR off | 1.00 | 12 | off | 1438 | 2587 (+1444) | 10.4 % | 1.152 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 723 | 1666 (+523) | 6.7 % | 1.369 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 153 | 559 (-584) | 2.2 % | 1.872 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1438 | 2587 (+1444) | 10.4 % | 1.152 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1895 | 3151 (+2008) | 12.6 % | 1.187 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 3 / 77 | 62 / 15 | 4.73 | 4.74 | 81 % | $0.81 | $20.81 | $20.96 | $19.73 | 11.31 % | 0.28 | $7.60 | 14 / 276 |
| 13:00 | 0 / 55 | 53 / 2 | 327.52 | 403.99 | 96 % | $0.29 | $21.10 | $21.49 | $20.56 | 12.71 % | 1.28 | $10.80 | 17 / 496 |
| 14:00 | 3 / 98 | 84 / 14 | 14.72 | 11.31 | 86 % | $0.72 | $21.83 | $21.40 | $21.25 | 12.71 % | 2.28 | $13.67 | 17 / 676 |
| 15:00 | 4 / 231 | 104 / 127 | 0.14 | 0.46 | 45 % | -$0.88 | $20.94 | $19.97 | $18.80 | 20.17 % | 3.28 | $15.08 | 24 / 1279 |
| 16:00 | 2 / 124 | 54 / 70 | 0.63 | 0.58 | 44 % | -$0.04 | $20.90 | $20.11 | $19.20 | 20.17 % | 4.28 | $14.66 | 27 / 1514 |
| 17:00 | 1 / 209 | 177 / 32 | 1.89 | 8.57 | 85 % | $0.08 | $20.98 | $19.92 | $19.41 | 20.17 % | 5.28 | $14.69 | 27 / 1514 |
| 18:00 | 1 / 62 | 41 / 21 | 0.62 | 1.32 | 66 % | -$0.02 | $20.97 | $19.25 | $19.00 | 20.17 % | 6.28 | $14.70 | 27 / 1863 |
| 19:00 | 0 / 114 | 59 / 55 | 0.44 | 0.66 | 52 % | -$0.09 | $20.88 | $19.00 | $18.58 | 21.12 % | 7.28 | $14.68 | 28 / 2224 |
| 20:00 | 0 / 413 | 108 / 305 | 0.62 | 0.31 | 26 % | -$0.11 | $20.77 | $17.94 | $17.89 | 24.06 % | 8.28 | $14.62 | 29 / 2426 |
| 21:00 | 0 / 364 | 117 / 247 | 1.13 | 0.34 | 32 % | $0.03 | $20.80 | $17.74 | $17.57 | 25.43 % | 9.28 | $14.61 | 30 / 2872 |
| 22:00 | 2 / 928 | 289 / 639 | 0.08 | 0.17 | 31 % | -$1.47 | $19.33 | $15.63 | $15.63 | 33.66 % | 10.28 | $14.56 | 32 / 2603 |
| 23:00 | 0 / 257 | 58 / 199 | 0.03 | 0.05 | 23 % | -$0.75 | $18.58 | $14.79 | $14.77 | 37.30 % | 11.28 | $13.53 | 35 / 2799 |

**Last hour (23:00):** open at end: 35 positions / 2799 orders, MTM -$3.79 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $14.79 = balance $18.58 + MTM -$3.79.

**Hours positive:** 5 of 12 full hours · flat 0 · negative 7

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m+ | 5m | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 12:00 | 4 · 0.00 · -$0.02 | – | 63 · 9.40 · $0.88 | 9 · 0.59 · -$0.03 | 1 · 0.00 · -$0.02 |
| 13:00 | – | – | 55 · 327.52 · $0.29 | – | – |
| 14:00 | – | – | 88 · 14.70 · $0.71 | 6 · ∞ (no loss) · $0.01 | 4 · 3.51 · $0.00 |
| 15:00 | 1 · 0.00 · -$0.00 | – | 53 · 0.22 · -$0.28 | 82 · 0.08 · -$0.42 | 95 · 0.12 · -$0.19 |
| 16:00 | 13 · 0.00 · -$0.00 | – | 92 · 0.66 · -$0.03 | 13 · 0.73 · -$0.00 | 6 · 0.10 · -$0.00 |
| 17:00 | – | – | 175 · 1.75 · $0.07 | 33 · 495.32 · $0.01 | 1 · ∞ (no loss) · $0.00 |
| 18:00 | – | – | 46 · 3.67 · $0.02 | 4 · 493.36 · $0.00 | 12 · 0.04 · -$0.04 |
| 19:00 | – | – | 92 · 0.46 · -$0.08 | 22 · 0.10 · -$0.01 | – |
| 20:00 | – | – | 238 · 1.29 · $0.04 | 163 · 0.00 · -$0.12 | 12 · 0.00 · -$0.03 |
| 21:00 | – | – | 271 · 1.13 · $0.03 | 78 · 0.31 · -$0.01 | 15 · 4645.01 · $0.01 |
| 22:00 | – | 165 · ∞ (no loss) · $0.01 | 626 · 0.07 · -$1.42 | 105 · 0.08 · -$0.04 | 32 · 0.40 · -$0.01 |
| 23:00 | – | – | 190 · 0.03 · -$0.73 | 55 · 0.04 · -$0.01 | 12 · 0.27 · -$0.00 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Axis, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Axis | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 77 | 8 · 1.54 · 63 % · $0.03 | 4 · 0.30 · 50 % · -$0.03 | 5 · 0.98 · 20 % · -$0.00 | 30 · 3.92 · 83 % · $0.31 | 30 · 1338.60 · 97 % · $0.51 | – | 60 · 8.74 · 90 % · $0.81 |
| 13:00 | 55 | – | – | – | 33 · ∞ (no loss) · 100 % · $0.21 | 22 · 93.63 · 91 % · $0.08 | – | 55 · 327.52 · 96 % · $0.29 |
| 14:00 | 98 | – | 10 · 16.45 · 80 % · $0.01 | – | 36 · 8.42 · 89 % · $0.37 | 52 · 174.21 · 85 % · $0.34 | – | 88 · 14.70 · 86 % · $0.71 |
| 15:00 | 231 | 64 · 0.04 · 28 % · -$0.34 | 118 · 0.14 · 59 % · -$0.29 | 4 · 0.00 · 0 % · -$0.01 | 23 · 0.08 · 9 % · -$0.24 | 22 · 0.84 · 64 % · -$0.01 | – | 45 · 0.24 · 36 % · -$0.25 |
| 16:00 | 124 | 23 · 0.67 · 39 % · -$0.00 | 31 · 0.67 · 52 % · -$0.00 | 16 · 0.00 · 0 % · -$0.00 | 33 · 0.27 · 30 % · -$0.05 | 21 · 46.24 · 90 % · $0.02 | – | 54 · 0.62 · 54 % · -$0.03 |
| 17:00 | 209 | 32 · ∞ (no loss) · 100 % · $0.02 | 80 · 1245.92 · 81 % · $0.03 | 14 · ∞ (no loss) · 100 % · $0.01 | 52 · 0.89 · 85 % · -$0.01 | 31 · 25.81 · 71 % · $0.02 | – | 83 · 1.17 · 80 % · $0.02 |
| 18:00 | 62 | 7 · ∞ (no loss) · 100 % · $0.02 | 21 · 0.13 · 38 % · -$0.03 | – | 2 · 0.00 · 0 % · -$0.01 | 32 · 10.27 · 81 % · $0.01 | – | 34 · 0.92 · 76 % · -$0.00 |
| 19:00 | 114 | 16 · 0.00 · 0 % · -$0.00 | 19 · 0.13 · 32 % · -$0.00 | 3 · 0.00 · 0 % · -$0.00 | 48 · 0.47 · 69 % · -$0.06 | 28 · 0.50 · 71 % · -$0.01 | – | 76 · 0.47 · 70 % · -$0.08 |
| 20:00 | 413 | 144 · 0.00 · 0 % · -$0.11 | 124 · 0.00 · 0 % · -$0.09 | – | 112 · 1.68 · 67 % · $0.07 | 33 · ∞ (no loss) · 100 % · $0.02 | – | 145 · 1.83 · 74 % · $0.08 |
| 21:00 | 364 | 96 · 1.27 · 40 % · $0.00 | 134 · 0.64 · 22 % · -$0.01 | – | 79 · 0.78 · 22 % · -$0.04 | 55 · 5.07 · 58 % · $0.07 | – | 134 · 1.16 · 37 % · $0.03 |
| 22:00 | 928 | 333 · 0.19 · 35 % · -$0.03 | 414 · 0.26 · 27 % · -$0.04 | – | 81 · 0.09 · 28 % · -$0.39 | 100 · 0.07 · 39 % · -$1.01 | – | 181 · 0.07 · 34 % · -$1.40 |
| 23:00 | 257 | 34 · 0.00 · 0 % · -$0.07 | 93 · 0.08 · 18 % · -$0.03 | – | 54 · 0.04 · 37 % · -$0.39 | 76 · 0.02 · 28 % · -$0.26 | – | 130 · 0.03 · 32 % · -$0.65 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1168 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (228986 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (10779); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 25016 · 0.61 | 6463 · 0.64 | 8312 · 0.81 | 1388 · 0.62 | 77 · 4.74 | 8 · 1.54 | 4 · 0.30 | – | 60 · 8.74 |
| 13:00 | 40231 · 0.61 | 7359 · 0.93 | 11530 · 0.91 | 1182 · 4.43 | 55 · 403.99 | – | – | – | 55 · 403.99 |
| 14:00 | 36387 · 1.96 | 9849 · 2.07 | 12609 · 2.06 | 2435 · 6.25 | 98 · 11.31 | – | 10 · 15.91 | – | 88 · 11.26 |
| 15:00 | 47367 · 1.63 | 13199 · 1.39 | 17518 · 1.78 | 4114 · 0.81 | 231 · 0.46 | 64 · 0.32 | 118 · 1.12 | – | 45 · 0.09 |
| 16:00 | 39655 · 1.25 | 8673 · 1.12 | 17314 · 1.68 | 1374 · 1.82 | 124 · 0.58 | 23 · 0.70 | 31 · 0.73 | – | 54 · 0.56 |
| 17:00 | 22763 · 1.85 | 5048 · 1.41 | 8898 · 1.76 | 1736 · 2.05 | 209 · 8.57 | 32 · ∞ (no loss) | 80 · 119.32 | – | 83 · 4.03 |
| 18:00 | 20975 · 1.50 | 3896 · 2.58 | 6533 · 1.88 | 1034 · 1.31 | 62 · 1.32 | 7 · ∞ (no loss) | 21 · 0.26 | – | 34 · 1.09 |
| 19:00 | 22137 · 0.74 | 6414 · 1.45 | 5654 · 0.62 | 1369 · 1.43 | 114 · 0.66 | 16 · 0.00 | 19 · 0.05 | – | 76 · 1.02 |
| 20:00 | 46183 · 0.64 | 16250 · 0.99 | 11521 · 0.49 | 3379 · 0.87 | 413 · 0.31 | 144 · 0.00 | 124 · 0.00 | – | 145 · 1.61 |
| 21:00 | 54665 · 0.66 | 17243 · 0.88 | 17941 · 0.66 | 3840 · 0.84 | 364 · 0.34 | 96 · 0.56 | 134 · 0.24 | – | 134 · 0.33 |
| 22:00 | 55349 · 0.41 | 16575 · 0.44 | 23165 · 0.42 | 4516 · 0.13 | 928 · 0.17 | 333 · 0.08 | 414 · 0.20 | – | 181 · 0.20 |
| 23:00 | 40723 · 0.42 | 9085 · 0.48 | 12200 · 0.30 | 2109 · 0.16 | 257 · 0.05 | 34 · 0.00 | 93 · 0.02 | – | 130 · 0.06 |
| **total** | **451451 · 0.82** | **120054 · 0.94** | **153195 · 0.81** | **28476 · 0.68** | **2932 · 0.39** | **757 · 0.23** | **1048 · 0.28** | **–** | **1085 · 0.51** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 757 | 225 / 532 | 0.24 | 0.23 | -$0.49 | 29.72 % | 8.50 |
| Trailing | 1048 | 333 / 715 | 0.24 | 0.28 | -$0.48 | 31.77 % | 12.00 |
| Axis | 42 | 15 / 27 | 1.08 | 1.89 | $0.00 | 35.71 % | 6.25 |
| Signal · Normal | 583 | 314 / 269 | 0.87 | 0.52 | -$0.23 | 53.86 % | 9.25 |
| Signal · Trailing | 502 | 319 / 183 | 0.85 | 0.49 | -$0.22 | 63.55 % | 2.00 |
| total | 2932 | 1206 / 1726 | 0.69 | 0.39 | -$1.42 | 41.13 % | 9.25 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 1085 | 633 / 452 | 0.86 | 0.51 | -$0.45 | 58.34 % | 9.25 |
| of which Engine (no signals) | 1847 | 573 / 1274 | 0.26 | 0.27 | -$0.96 | 31.02 % | 9.00 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m+ | 18 | 0.00 | 0.00 | -$0.02 |
| 5m | 165 | ∞ (no loss) | ∞ (no loss) | $0.01 |
| 15m | 1989 | 0.86 | 0.42 | -$0.50 |
| 15m+ | 570 | 0.15 | 0.26 | -$0.63 |
| 30m | 190 | 0.15 | 0.31 | -$0.28 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 582 | 167 / 415 | 0.07 | 0.07 | -$0.13 | 28.69 % | 9.75 |
| Short | 836 | 287 / 549 | 0.25 | 0.32 | -$0.49 | 34.33 % | 12.00 |
| General | 238 | 60 / 178 | 0.18 | 0.25 | -$0.12 | 25.21 % | 11.50 |
| Long | 149 | 44 / 105 | 0.31 | 0.33 | -$0.22 | 29.53 % | 8.25 |
| Wide | 42 | 15 / 27 | 1.08 | 1.89 | $0.00 | 35.71 % | 6.25 |
| Signals | 1085 | 633 / 452 | 0.86 | 0.51 | -$0.45 | 58.34 % | 9.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 36380 | sig:confirm 9561 · sig:signalPf 8432 · sig:signalCluster 7082 · sig:signalSide 6948 · sig:duplicate 4357 |
| Short | 7970 | lastN 4888 · symPf 1569 · duplicate 827 · engineSide 686 |
| Long | 4203 | lastN 2484 · symPf 1092 · engineSide 386 · duplicate 241 |
| General | 3301 | lastN 2158 · symPf 683 · duplicate 238 · engineSide 222 |
| Wide | 771 | lastN 338 · symPf 269 · engineSide 161 · duplicate 3 |
| Micro | 217 | lastN 109 · engineSide 94 · symPf 14 |

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
| Micro | 2.26 | 0.07 | 0.03 | 0.07 | 1.01 | 582 |
| Short | 1.50 | 0.32 | 0.21 | 0.25 | 0.78 | 836 |
| General | 1.50 | 0.25 | 0.17 | 0.18 | 0.74 | 238 |
| Long | 1.50 | 0.33 | 0.22 | 0.31 | 0.95 | 149 |
| Wide | 1.55 | 1.89 | 1.21 | 1.08 | 0.57 | 42 |
| Signals | – | 0.51 | – | 0.86 | 1.70 | 1085 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (7517 of 194380 evaluated, 225206 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2273 units active at the run start, 2983 over the run, 3262 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 839 | 143 (17 %) | 470 | 50 % | 0.16 | -385.96 |
| Micro | trailing | 471 | 39 (8 %) | 491 | 34 % | 0.08 | -569.81 |
| Short | normal | 1038 | 192 (18 %) | 1820 | 47 % | 0.58 | -1382.00 |
| Short | trailing | 2221 | 398 (18 %) | 3718 | 46 % | 0.50 | -2619.36 |
| General | normal | 660 | 89 (13 %) | 1206 | 35 % | 0.63 | -879.90 |
| General | trailing | 463 | 98 (21 %) | 713 | 50 % | 0.70 | -368.47 |
| Long | normal | 1003 | 188 (19 %) | 1191 | 56 % | 1.59 | 1326.30 |
| Long | trailing | 603 | 116 (19 %) | 597 | 68 % | 1.53 | 548.83 |
| Wide | axis | 219 | 61 (28 %) | 631 | 39 % | 0.94 | -19.43 |
| Signals | normal | 1674 | 482 (29 %) | 9936 | 57 % | 0.61 | -11664.95 |
| Signals | trailing | 1588 | 799 (50 %) | 7703 | 71 % | 0.74 | -4756.57 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1310 | 182 (14 %) | 961 | 42 % | 0.12 | -955.77 |
| Short | active | 25 | 4 (16 %) | 4 | 100 % | ∞ (no loss) | 7.54 |
| Short | bollinger | 48 | 2 (4 %) | 336 | 35 % | 0.24 | -457.86 |
| Short | break | 369 | 74 (20 %) | 279 | 54 % | 0.77 | -73.06 |
| Short | channel | 11 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | direction | 211 | 11 (5 %) | 568 | 26 % | 0.24 | -958.77 |
| Short | ema | 330 | 0 (0 %) | 1270 | 19 % | 0.16 | -2651.27 |
| Short | ichimoku | 56 | 0 (0 %) | 150 | 16 % | 0.13 | -335.42 |
| Short | macd | 51 | 40 (78 %) | 179 | 78 % | 6.03 | 211.02 |
| Short | move | 832 | 63 (8 %) | 246 | 67 % | 1.60 | 120.88 |
| Short | osc | 513 | 140 (27 %) | 747 | 67 % | 1.19 | 129.35 |
| Short | rsi | 14 | 3 (21 %) | 9 | 56 % | 1.06 | 0.70 |
| Short | sar | 20 | 0 (0 %) | 9 | 0 % | 0.00 | -43.63 |
| Short | smooth | 67 | 2 (3 %) | 117 | 39 % | 0.51 | -89.07 |
| Short | trend | 491 | 226 (46 %) | 1069 | 67 % | 1.60 | 498.95 |
| Short | volume | 221 | 25 (11 %) | 555 | 52 % | 0.58 | -360.73 |
| General | active | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 10 | 4 (40 %) | 42 | 38 % | 0.66 | -23.99 |
| General | break | 97 | 23 (24 %) | 314 | 45 % | 0.91 | -47.62 |
| General | channel | 1 | 0 (0 %) | 6 | 17 % | 0.23 | -10.00 |
| General | direction | 157 | 10 (6 %) | 272 | 22 % | 0.28 | -483.23 |
| General | ema | 145 | 0 (0 %) | 388 | 16 % | 0.16 | -900.58 |
| General | ichimoku | 21 | 1 (5 %) | 1 | 100 % | ∞ (no loss) | 0.34 |
| General | macd | 4 | 4 (100 %) | 8 | 88 % | 2.23 | 5.65 |
| General | move | 298 | 7 (2 %) | 74 | 42 % | 0.63 | -53.85 |
| General | osc | 100 | 56 (56 %) | 323 | 63 % | 1.85 | 307.49 |
| General | rsi | 5 | 0 (0 %) | 4 | 0 % | 0.00 | -13.20 |
| General | smooth | 43 | 0 (0 %) | 70 | 37 % | 0.54 | -62.95 |
| General | trend | 187 | 75 (40 %) | 314 | 59 % | 1.33 | 123.61 |
| General | volume | 34 | 7 (21 %) | 103 | 45 % | 0.56 | -90.05 |
| Long | bollinger | 12 | 0 (0 %) | 7 | 29 % | 0.49 | -10.50 |
| Long | break | 137 | 41 (30 %) | 297 | 53 % | 1.03 | 24.54 |
| Long | channel | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -4.10 |
| Long | direction | 141 | 19 (13 %) | 286 | 44 % | 0.78 | -151.08 |
| Long | ema | 58 | 2 (3 %) | 68 | 13 % | 0.24 | -165.00 |
| Long | ichimoku | 28 | 5 (18 %) | 24 | 54 % | 1.32 | 17.50 |
| Long | macd | 30 | 7 (23 %) | 29 | 83 % | 5.56 | 104.47 |
| Long | move | 437 | 10 (2 %) | 123 | 50 % | 1.06 | 15.83 |
| Long | osc | 319 | 118 (37 %) | 455 | 78 % | 3.40 | 1296.37 |
| Long | rsi | 42 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | sar | 28 | 0 (0 %) | 2 | 0 % | 0.00 | -11.60 |
| Long | smooth | 34 | 1 (3 %) | 19 | 32 % | 0.62 | -18.50 |
| Long | trend | 190 | 59 (31 %) | 284 | 68 % | 2.09 | 442.70 |
| Long | volume | 149 | 42 (28 %) | 193 | 66 % | 2.01 | 334.50 |
| Wide | active | 33 | 9 (27 %) | 12 | 75 % | 13.32 | 25.87 |
| Wide | bollinger | 24 | 1 (4 %) | 192 | 33 % | 0.59 | -35.79 |
| Wide | break | 6 | 6 (100 %) | 12 | 75 % | 5.60 | 28.17 |
| Wide | channel | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 3 | 0 (0 %) | 39 | 46 % | 0.76 | -6.16 |
| Wide | ema | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -18.48 |
| Wide | move | 24 | 6 (25 %) | 15 | 60 % | 0.76 | -1.56 |
| Wide | osc | 47 | 13 (28 %) | 217 | 35 % | 0.75 | -23.73 |
| Wide | rsi | 30 | 6 (20 %) | 12 | 50 % | 0.15 | -6.06 |
| Wide | trend | 29 | 17 (59 %) | 50 | 64 % | 2.08 | 31.09 |
| Wide | volume | 11 | 3 (27 %) | 70 | 33 % | 0.78 | -12.77 |
| Signals | signal:act-burst | 58 | 48 (83 %) | 344 | 83 % | 2.32 | 493.01 |
| Signals | signal:act-hf | 59 | 22 (37 %) | 444 | 63 % | 0.73 | -307.20 |
| Signals | signal:adx | 60 | 21 (35 %) | 273 | 63 % | 0.66 | -266.95 |
| Signals | signal:atr-break | 56 | 42 (75 %) | 358 | 77 % | 1.73 | 381.14 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 363 | 56 % | 0.52 | -698.28 |
| Signals | signal:cci | 59 | 2 (3 %) | 423 | 59 % | 0.52 | -740.27 |
| Signals | signal:cmf | 54 | 5 (9 %) | 271 | 45 % | 0.25 | -883.75 |
| Signals | signal:donchian | 53 | 27 (51 %) | 201 | 68 % | 0.90 | -49.48 |
| Signals | signal:ema-cross | 51 | 46 (90 %) | 158 | 91 % | 7.29 | 366.46 |
| Signals | signal:ema-cross-fast | 59 | 50 (85 %) | 345 | 82 % | 1.99 | 398.80 |
| Signals | signal:ema-pullback | 59 | 18 (31 %) | 396 | 67 % | 0.67 | -305.75 |
| Signals | signal:ema-slope | 54 | 20 (37 %) | 224 | 72 % | 0.86 | -68.89 |
| Signals | signal:ema-trend | 59 | 26 (44 %) | 429 | 67 % | 0.74 | -279.82 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 458 | 56 % | 0.45 | -866.84 |
| Signals | signal:hma | 54 | 13 (24 %) | 367 | 60 % | 0.64 | -360.48 |
| Signals | signal:ichimoku | 58 | 32 (55 %) | 203 | 68 % | 0.90 | -47.84 |
| Signals | signal:impulse | 57 | 5 (9 %) | 310 | 45 % | 0.29 | -904.41 |
| Signals | signal:kama | 56 | 16 (29 %) | 531 | 65 % | 0.67 | -441.57 |
| Signals | signal:keltner | 50 | 28 (56 %) | 156 | 69 % | 1.24 | 71.69 |
| Signals | signal:macd-cross | 57 | 9 (16 %) | 341 | 59 % | 0.48 | -607.34 |
| Signals | signal:macd-hist | 59 | 20 (34 %) | 459 | 66 % | 0.72 | -332.81 |
| Signals | signal:macd-slow | 57 | 10 (18 %) | 350 | 61 % | 0.51 | -577.57 |
| Signals | signal:mfi | 30 | 29 (97 %) | 51 | 92 % | 8.11 | 117.68 |
| Signals | signal:obv | 60 | 48 (80 %) | 443 | 77 % | 1.66 | 404.59 |
| Signals | signal:r-awesome | 56 | 13 (23 %) | 282 | 52 % | 0.42 | -536.04 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 116 | 64 % | 0.51 | -186.50 |
| Signals | signal:r-fractal | 45 | 14 (31 %) | 117 | 46 % | 0.29 | -289.29 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -120.60 |
| Signals | signal:r-linreg | 60 | 14 (23 %) | 408 | 57 % | 0.49 | -639.10 |
| Signals | signal:r-nr-break | 46 | 2 (4 %) | 236 | 40 % | 0.24 | -827.46 |
| Signals | signal:r-session-trend | 60 | 15 (25 %) | 384 | 57 % | 0.50 | -670.13 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 69 | 87 % | 7.14 | 210.19 |
| Signals | signal:reclaim | 60 | 21 (35 %) | 530 | 68 % | 0.74 | -343.32 |
| Signals | signal:rsi-mid | 55 | 10 (18 %) | 311 | 47 % | 0.29 | -770.78 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 29 | 8 (28 %) | 32 | 31 % | 0.08 | -149.56 |
| Signals | signal:s2-active-hf | 54 | 31 (57 %) | 475 | 69 % | 1.08 | 67.74 |
| Signals | signal:s2-adx-gate | 58 | 27 (47 %) | 381 | 72 % | 0.89 | -91.62 |
| Signals | signal:s2-atr-break | 57 | 6 (11 %) | 301 | 47 % | 0.32 | -790.77 |
| Signals | signal:s2-bb-bounce | 60 | 35 (58 %) | 307 | 62 % | 0.86 | -114.45 |
| Signals | signal:s2-block-scale | 58 | 19 (33 %) | 420 | 64 % | 0.57 | -476.48 |
| Signals | signal:s2-block-stack | 54 | 15 (28 %) | 299 | 63 % | 0.64 | -327.36 |
| Signals | signal:s2-confluence | 59 | 17 (29 %) | 533 | 64 % | 0.75 | -293.68 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 |
| Signals | signal:s2-range-break | 45 | 33 (73 %) | 62 | 81 % | 1.60 | 58.77 |
| Signals | signal:s2-range-shift | 53 | 13 (25 %) | 181 | 49 % | 0.37 | -450.07 |
| Signals | signal:s2-rsi-revert | 52 | 27 (52 %) | 108 | 56 % | 0.54 | -148.36 |
| Signals | signal:s2-st-trail | 46 | 31 (67 %) | 69 | 71 % | 1.11 | 12.50 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 471 | 78 % | 1.88 | 587.43 |
| Signals | signal:s2-vol-break | 52 | 30 (58 %) | 109 | 73 % | 0.91 | -22.62 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 59 | 15 (25 %) | 497 | 65 % | 0.73 | -344.05 |
| Signals | signal:squeeze | 45 | 11 (24 %) | 45 | 24 % | 0.03 | -333.69 |
| Signals | signal:st-slow | 42 | 17 (40 %) | 69 | 52 % | 0.43 | -108.43 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 556 | 62 % | 0.57 | -584.50 |
| Signals | signal:supertrend | 53 | 40 (75 %) | 232 | 79 % | 1.37 | 130.97 |
| Signals | signal:swing | 58 | 2 (3 %) | 454 | 56 % | 0.39 | -931.59 |
| Signals | signal:thrust | 55 | 2 (4 %) | 390 | 49 % | 0.29 | -1099.42 |
| Signals | signal:trix | 55 | 16 (29 %) | 145 | 56 % | 0.39 | -315.80 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 26 (43 %) | 325 | 68 % | 0.80 | -142.86 |
| Signals | signal:williams-r | 60 | 15 (25 %) | 404 | 61 % | 0.69 | -398.43 |
| Signals | signal:zscore | 60 | 0 (0 %) | 279 | 51 % | 0.37 | -803.44 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 75992 | 68912 | 1310 | 0.84 | 4.00 | 75.83–163.33 (median 163.33) | 16344 | 32799 | 1496 | 3494 | 8527 | 138 | 4598 | 0 | 206 | 0 | 0 | 0 | 7080 |  |
| Short | 46340 | 40508 | 3259 | 1.31 | 2.14 | 163.33–163.33 (median 163.33) | 4359 | 5870 | 1837 | 7810 | 4789 | 4131 | 7520 | 106 | 818 | 9 | 0 | 0 | 5832 |  |
| General | 15457 | 13297 | 1123 | 1.32 | 2.10 | 163.33–163.33 (median 163.33) | 1430 | 1531 | 624 | 2398 | 1715 | 1525 | 2635 | 0 | 244 | 72 | 0 | 0 | 2160 |  |
| Long | 21803 | 19103 | 1606 | 1.29 | 2.25 | 163.33–163.33 (median 163.33) | 2030 | 3024 | 945 | 3621 | 1976 | 1966 | 3550 | 0 | 322 | 63 | 0 | 0 | 2700 |  |
| Wide | 65614 | 52560 | 219 | 0.60 | 2.42 | 18.00–163.33 (median 163.33) | 13425 | 33025 | 789 | 3063 | 822 | 153 | 834 | 0 | 199 | 31 | 0 | 9904 | 3150 |  |
| Signals | 3780 | – | 2273 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2273 units (pair × symbol × direction) active at the run start, 2983 over the run; 3262 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 25344 | 2082 (8 %) | 14238 | 59 % | 0.29 | -5873.43 |
| Micro | trailing | 50648 | 3812 (8 %) | 28996 | 52 % | 0.26 | -11595.91 |
| Short | normal | 15439 | 4044 (26 %) | 38459 | 56 % | 0.81 | -10618.70 |
| Short | trailing | 30901 | 8008 (26 %) | 81662 | 53 % | 0.74 | -26454.38 |
| General | normal | 9237 | 2228 (24 %) | 21849 | 43 % | 0.97 | -1152.60 |
| General | trailing | 6220 | 1507 (24 %) | 12898 | 51 % | 0.81 | -4325.90 |
| Long | normal | 13096 | 3018 (23 %) | 24036 | 47 % | 1.16 | 8427.70 |
| Long | trailing | 8707 | 1756 (20 %) | 12648 | 54 % | 0.82 | -5694.41 |
| Wide | axis | 55710 | 8743 (16 %) | 156350 | 30 % | 0.68 | -36826.94 |
| Wide | dca | 4952 | 1219 (25 %) | 13802 | 61 % | 0.65 | -7771.85 |
| Wide | dca-active | 4952 | 585 (12 %) | 8050 | 28 % | 0.47 | -4226.17 |
| Signals | normal | 1890 | 914 (48 %) | 21472 | 66 % | 0.95 | -2395.65 |
| Signals | trailing | 1890 | 1224 (65 %) | 16991 | 76 % | 1.39 | 11187.64 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1310 | 182 (14 %) | 961 | 42 % | 0.12 | -955.77 |
| Short | active | 25 | 4 (16 %) | 4 | 100 % | ∞ (no loss) | 7.54 |
| Short | bollinger | 48 | 2 (4 %) | 336 | 35 % | 0.24 | -457.86 |
| Short | break | 369 | 74 (20 %) | 279 | 54 % | 0.77 | -73.06 |
| Short | channel | 11 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | direction | 211 | 11 (5 %) | 568 | 26 % | 0.24 | -958.77 |
| Short | ema | 330 | 0 (0 %) | 1270 | 19 % | 0.16 | -2651.27 |
| Short | ichimoku | 56 | 0 (0 %) | 150 | 16 % | 0.13 | -335.42 |
| Short | macd | 51 | 40 (78 %) | 179 | 78 % | 6.03 | 211.02 |
| Short | move | 832 | 63 (8 %) | 246 | 67 % | 1.60 | 120.88 |
| Short | osc | 513 | 140 (27 %) | 747 | 67 % | 1.19 | 129.35 |
| Short | rsi | 14 | 3 (21 %) | 9 | 56 % | 1.06 | 0.70 |
| Short | sar | 20 | 0 (0 %) | 9 | 0 % | 0.00 | -43.63 |
| Short | smooth | 67 | 2 (3 %) | 117 | 39 % | 0.51 | -89.07 |
| Short | trend | 491 | 226 (46 %) | 1069 | 67 % | 1.60 | 498.95 |
| Short | volume | 221 | 25 (11 %) | 555 | 52 % | 0.58 | -360.73 |
| General | active | 21 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 10 | 4 (40 %) | 42 | 38 % | 0.66 | -23.99 |
| General | break | 97 | 23 (24 %) | 314 | 45 % | 0.91 | -47.62 |
| General | channel | 1 | 0 (0 %) | 6 | 17 % | 0.23 | -10.00 |
| General | direction | 157 | 10 (6 %) | 272 | 22 % | 0.28 | -483.23 |
| General | ema | 145 | 0 (0 %) | 388 | 16 % | 0.16 | -900.58 |
| General | ichimoku | 21 | 1 (5 %) | 1 | 100 % | ∞ (no loss) | 0.34 |
| General | macd | 4 | 4 (100 %) | 8 | 88 % | 2.23 | 5.65 |
| General | move | 298 | 7 (2 %) | 74 | 42 % | 0.63 | -53.85 |
| General | osc | 100 | 56 (56 %) | 323 | 63 % | 1.85 | 307.49 |
| General | rsi | 5 | 0 (0 %) | 4 | 0 % | 0.00 | -13.20 |
| General | smooth | 43 | 0 (0 %) | 70 | 37 % | 0.54 | -62.95 |
| General | trend | 187 | 75 (40 %) | 314 | 59 % | 1.33 | 123.61 |
| General | volume | 34 | 7 (21 %) | 103 | 45 % | 0.56 | -90.05 |
| Long | bollinger | 12 | 0 (0 %) | 7 | 29 % | 0.49 | -10.50 |
| Long | break | 137 | 41 (30 %) | 297 | 53 % | 1.03 | 24.54 |
| Long | channel | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -4.10 |
| Long | direction | 141 | 19 (13 %) | 286 | 44 % | 0.78 | -151.08 |
| Long | ema | 58 | 2 (3 %) | 68 | 13 % | 0.24 | -165.00 |
| Long | ichimoku | 28 | 5 (18 %) | 24 | 54 % | 1.32 | 17.50 |
| Long | macd | 30 | 7 (23 %) | 29 | 83 % | 5.56 | 104.47 |
| Long | move | 437 | 10 (2 %) | 123 | 50 % | 1.06 | 15.83 |
| Long | osc | 319 | 118 (37 %) | 455 | 78 % | 3.40 | 1296.37 |
| Long | rsi | 42 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | sar | 28 | 0 (0 %) | 2 | 0 % | 0.00 | -11.60 |
| Long | smooth | 34 | 1 (3 %) | 19 | 32 % | 0.62 | -18.50 |
| Long | trend | 190 | 59 (31 %) | 284 | 68 % | 2.09 | 442.70 |
| Long | volume | 149 | 42 (28 %) | 193 | 66 % | 2.01 | 334.50 |
| Wide | active | 33 | 9 (27 %) | 12 | 75 % | 13.32 | 25.87 |
| Wide | bollinger | 24 | 1 (4 %) | 192 | 33 % | 0.59 | -35.79 |
| Wide | break | 6 | 6 (100 %) | 12 | 75 % | 5.60 | 28.17 |
| Wide | channel | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 3 | 0 (0 %) | 39 | 46 % | 0.76 | -6.16 |
| Wide | ema | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -18.48 |
| Wide | move | 24 | 6 (25 %) | 15 | 60 % | 0.76 | -1.56 |
| Wide | osc | 47 | 13 (28 %) | 217 | 35 % | 0.75 | -23.73 |
| Wide | rsi | 30 | 6 (20 %) | 12 | 50 % | 0.15 | -6.06 |
| Wide | trend | 29 | 17 (59 %) | 50 | 64 % | 2.08 | 31.09 |
| Wide | volume | 11 | 3 (27 %) | 70 | 33 % | 0.78 | -12.77 |
| Signals | signal:act-burst | 58 | 48 (83 %) | 344 | 83 % | 2.32 | 493.01 |
| Signals | signal:act-hf | 59 | 22 (37 %) | 444 | 63 % | 0.73 | -307.20 |
| Signals | signal:adx | 60 | 21 (35 %) | 273 | 63 % | 0.66 | -266.95 |
| Signals | signal:atr-break | 56 | 42 (75 %) | 358 | 77 % | 1.73 | 381.14 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 363 | 56 % | 0.52 | -698.28 |
| Signals | signal:cci | 59 | 2 (3 %) | 423 | 59 % | 0.52 | -740.27 |
| Signals | signal:cmf | 54 | 5 (9 %) | 271 | 45 % | 0.25 | -883.75 |
| Signals | signal:donchian | 53 | 27 (51 %) | 201 | 68 % | 0.90 | -49.48 |
| Signals | signal:ema-cross | 51 | 46 (90 %) | 158 | 91 % | 7.29 | 366.46 |
| Signals | signal:ema-cross-fast | 59 | 50 (85 %) | 345 | 82 % | 1.99 | 398.80 |
| Signals | signal:ema-pullback | 59 | 18 (31 %) | 396 | 67 % | 0.67 | -305.75 |
| Signals | signal:ema-slope | 54 | 20 (37 %) | 224 | 72 % | 0.86 | -68.89 |
| Signals | signal:ema-trend | 59 | 26 (44 %) | 429 | 67 % | 0.74 | -279.82 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 458 | 56 % | 0.45 | -866.84 |
| Signals | signal:hma | 54 | 13 (24 %) | 367 | 60 % | 0.64 | -360.48 |
| Signals | signal:ichimoku | 58 | 32 (55 %) | 203 | 68 % | 0.90 | -47.84 |
| Signals | signal:impulse | 57 | 5 (9 %) | 310 | 45 % | 0.29 | -904.41 |
| Signals | signal:kama | 56 | 16 (29 %) | 531 | 65 % | 0.67 | -441.57 |
| Signals | signal:keltner | 50 | 28 (56 %) | 156 | 69 % | 1.24 | 71.69 |
| Signals | signal:macd-cross | 57 | 9 (16 %) | 341 | 59 % | 0.48 | -607.34 |
| Signals | signal:macd-hist | 59 | 20 (34 %) | 459 | 66 % | 0.72 | -332.81 |
| Signals | signal:macd-slow | 57 | 10 (18 %) | 350 | 61 % | 0.51 | -577.57 |
| Signals | signal:mfi | 30 | 29 (97 %) | 51 | 92 % | 8.11 | 117.68 |
| Signals | signal:obv | 60 | 48 (80 %) | 443 | 77 % | 1.66 | 404.59 |
| Signals | signal:r-awesome | 56 | 13 (23 %) | 282 | 52 % | 0.42 | -536.04 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 116 | 64 % | 0.51 | -186.50 |
| Signals | signal:r-fractal | 45 | 14 (31 %) | 117 | 46 % | 0.29 | -289.29 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -120.60 |
| Signals | signal:r-linreg | 60 | 14 (23 %) | 408 | 57 % | 0.49 | -639.10 |
| Signals | signal:r-nr-break | 46 | 2 (4 %) | 236 | 40 % | 0.24 | -827.46 |
| Signals | signal:r-session-trend | 60 | 15 (25 %) | 384 | 57 % | 0.50 | -670.13 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 69 | 87 % | 7.14 | 210.19 |
| Signals | signal:reclaim | 60 | 21 (35 %) | 530 | 68 % | 0.74 | -343.32 |
| Signals | signal:rsi-mid | 55 | 10 (18 %) | 311 | 47 % | 0.29 | -770.78 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 29 | 8 (28 %) | 32 | 31 % | 0.08 | -149.56 |
| Signals | signal:s2-active-hf | 54 | 31 (57 %) | 475 | 69 % | 1.08 | 67.74 |
| Signals | signal:s2-adx-gate | 58 | 27 (47 %) | 381 | 72 % | 0.89 | -91.62 |
| Signals | signal:s2-atr-break | 57 | 6 (11 %) | 301 | 47 % | 0.32 | -790.77 |
| Signals | signal:s2-bb-bounce | 60 | 35 (58 %) | 307 | 62 % | 0.86 | -114.45 |
| Signals | signal:s2-block-scale | 58 | 19 (33 %) | 420 | 64 % | 0.57 | -476.48 |
| Signals | signal:s2-block-stack | 54 | 15 (28 %) | 299 | 63 % | 0.64 | -327.36 |
| Signals | signal:s2-confluence | 59 | 17 (29 %) | 533 | 64 % | 0.75 | -293.68 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 |
| Signals | signal:s2-range-break | 45 | 33 (73 %) | 62 | 81 % | 1.60 | 58.77 |
| Signals | signal:s2-range-shift | 53 | 13 (25 %) | 181 | 49 % | 0.37 | -450.07 |
| Signals | signal:s2-rsi-revert | 52 | 27 (52 %) | 108 | 56 % | 0.54 | -148.36 |
| Signals | signal:s2-st-trail | 46 | 31 (67 %) | 69 | 71 % | 1.11 | 12.50 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 471 | 78 % | 1.88 | 587.43 |
| Signals | signal:s2-vol-break | 52 | 30 (58 %) | 109 | 73 % | 0.91 | -22.62 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 59 | 15 (25 %) | 497 | 65 % | 0.73 | -344.05 |
| Signals | signal:squeeze | 45 | 11 (24 %) | 45 | 24 % | 0.03 | -333.69 |
| Signals | signal:st-slow | 42 | 17 (40 %) | 69 | 52 % | 0.43 | -108.43 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 556 | 62 % | 0.57 | -584.50 |
| Signals | signal:supertrend | 53 | 40 (75 %) | 232 | 79 % | 1.37 | 130.97 |
| Signals | signal:swing | 58 | 2 (3 %) | 454 | 56 % | 0.39 | -931.59 |
| Signals | signal:thrust | 55 | 2 (4 %) | 390 | 49 % | 0.29 | -1099.42 |
| Signals | signal:trix | 55 | 16 (29 %) | 145 | 56 % | 0.39 | -315.80 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 26 (43 %) | 325 | 68 % | 0.80 | -142.86 |
| Signals | signal:williams-r | 60 | 15 (25 %) | 404 | 61 % | 0.69 | -398.43 |
| Signals | signal:zscore | 60 | 0 (0 %) | 279 | 51 % | 0.37 | -803.44 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Short | 1.1 | 1296 | 398 (31 %) | 4800 | 44 % | 0.50 | -3804.50 |
| Short | 1.25 | 1206 | 363 (30 %) | 4208 | 42 % | 0.47 | -3605.68 |
| Short | 1.35 | 1152 | 342 (30 %) | 3828 | 41 % | 0.45 | -3473.63 |
| Short | 1.5 | 1040 | 301 (29 %) | 3305 | 40 % | 0.42 | -3151.90 |
| Short | 1.75 | 758 | 216 (28 %) | 2250 | 37 % | 0.38 | -2336.62 |
| Short | 2 | 494 | 144 (29 %) | 1344 | 33 % | 0.32 | -1667.48 |
| General | 1.1 | 405 | 105 (26 %) | 1407 | 35 % | 0.52 | -1402.00 |
| General | 1.25 | 371 | 88 (24 %) | 1208 | 32 % | 0.45 | -1403.89 |
| General | 1.35 | 343 | 74 (22 %) | 1063 | 30 % | 0.40 | -1390.51 |
| General | 1.5 | 287 | 60 (21 %) | 841 | 27 % | 0.34 | -1268.37 |
| General | 1.75 | 208 | 41 (20 %) | 602 | 25 % | 0.29 | -999.31 |
| General | 2 | 133 | 23 (17 %) | 387 | 24 % | 0.25 | -677.88 |
| Long | 1.1 | 471 | 209 (44 %) | 1309 | 56 % | 1.39 | 1032.64 |
| Long | 1.25 | 392 | 151 (39 %) | 963 | 53 % | 1.25 | 516.51 |
| Long | 1.35 | 349 | 124 (36 %) | 799 | 51 % | 1.19 | 318.20 |
| Long | 1.5 | 274 | 80 (29 %) | 605 | 46 % | 0.98 | -25.13 |
| Long | 1.75 | 191 | 47 (25 %) | 369 | 42 % | 0.87 | -112.86 |
| Long | 2 | 125 | 29 (23 %) | 221 | 41 % | 0.84 | -79.17 |
| Wide | 1.1 | 22 | 3 (14 %) | 124 | 36 % | 0.81 | -21.47 |
| Wide | 1.25 | 22 | 3 (14 %) | 124 | 36 % | 0.81 | -21.47 |
| Wide | 1.35 | 19 | 3 (16 %) | 85 | 32 % | 0.83 | -15.31 |
| Wide | 1.5 | 13 | 3 (23 %) | 49 | 43 % | 1.25 | 10.72 |
| Wide | 1.75 | 13 | 3 (23 %) | 49 | 43 % | 1.25 | 10.72 |
| Wide | 2 | 6 | 0 (0 %) | 3 | 0 % | 0.00 | -3.23 |
| Signals | 1.1 | 1187 | 434 (37 %) | 6915 | 66 % | 0.65 | -6701.34 |
| Signals | 1.25 | 721 | 257 (36 %) | 4488 | 66 % | 0.64 | -4368.83 |
| Signals | 1.35 | 510 | 183 (36 %) | 3166 | 68 % | 0.64 | -3072.00 |
| Signals | 1.5 | 304 | 112 (37 %) | 1916 | 69 % | 0.64 | -1820.25 |
| Signals | 1.75 | 140 | 54 (39 %) | 929 | 72 % | 0.64 | -809.58 |
| Signals | 2 | 72 | 29 (40 %) | 526 | 74 % | 0.62 | -461.40 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | pulse | mc-ibrk@m5 | 73 | 73 (100 %) | 73 | 100 % | ∞ (no loss) | 25.20 | – |
| Micro | clamp | mc-rsit9-20@m30 | 46 | 46 (100 %) | 92 | 100 % | ∞ (no loss) | 18.80 | – |
| Micro | sandwich | mc-ibrk@m5 | 42 | 42 (100 %) | 42 | 100 % | ∞ (no loss) | 14.75 | – |
| Micro | clamp | mc-trsi2-10@m5 | 5 | 5 (100 %) | 15 | 100 % | ∞ (no loss) | 5.27 | – |
| Micro | pulse | mc-lag-6@m5 | 14 | 14 (100 %) | 28 | 71 % | 4.65 | 4.71 | – |
| Micro | ribbon | mc-qburst-2@m5 | 3 | 0 (0 %) | 9 | 22 % | 0.08 | -9.11 | – |
| Micro | revert | mc-rsidiv-14@m5c | 6 | 0 (0 %) | 30 | 67 % | 0.48 | -9.18 | tp0.6 sl2.55 tr0.45 h192 mc (5 · 0.52 · -1.33) |
| Micro | sweep | mc-rsi5-10@m5 | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -17.95 | – |
| Micro | sweep | mc-spike-2.5@m5 | 6 | 0 (0 %) | 18 | 33 % | 0.08 | -25.88 | – |
| Micro | pivot | mc-lag-12@m15 | 24 | 0 (0 %) | 48 | 50 % | 0.21 | -34.65 | – |
| Micro | sweep | mc-z-20@m5c | 29 | 0 (0 %) | 87 | 36 % | 0.07 | -113.95 | – |
| Micro | ribbon | mc-ibrk@m30 | 74 | 0 (0 %) | 148 | 50 % | 0.13 | -163.10 | – |
| Micro | pivot | mc-tvwapd-3@m15 | 82 | 0 (0 %) | 82 | 0 % | 0.00 | -166.20 | – |
| Micro | clamp | mc-tvwapd-3@m15 | 272 | 0 (0 %) | 272 | 0 % | 0.00 | -474.98 | – |
| Short | revert | trend-ema-50-200@m15c | 51 | 35 (69 %) | 435 | 70 % | 1.84 | 267.64 | tp2.2 sl4.4 tr1.65 h96 sh (6 · 4.31 · 15.24) |
| Short | revert | trend-ema-50-200@m30 | 25 | 25 (100 %) | 253 | 74 % | 1.94 | 159.14 | tp2.8 sl5.6 tr0 h32 sh (9 · 3.59 · 15.00) |
| Short | pivot | r-vortex@m15 | 88 | 79 (90 %) | 88 | 90 % | 8.90 | 148.53 | – |
| Short | sweep | willr-50-90@m15c | 13 | 13 (100 %) | 69 | 90 % | 4.69 | 116.84 | tp2.8 sl5.6 tr1.4 h96 sh (5 · ∞ (no loss) · 15.90) |
| Short | sweep | r-td@m30 | 21 | 21 (100 %) | 76 | 87 % | 6.63 | 110.43 | – |
| Short | sweep | willr-14-95@m30 | 39 | 39 (100 %) | 78 | 99 % | 688.65 | 104.65 | – |
| Short | sweep | willr-21-95@m15 | 13 | 13 (100 %) | 39 | 100 % | ∞ (no loss) | 87.60 | – |
| Short | pivot | move-impulse-20-2.5@m15c | 16 | 16 (100 %) | 40 | 95 % | 332.42 | 81.95 | – |
| Short | sweep | willr-50-90@m15 | 4 | 4 (100 %) | 31 | 97 % | 12.62 | 58.12 | tp2.6 sl5.2 tr0 h64 sh (7 · ∞ (no loss) · 16.80) |
| Short | ribbon | macd-hist-5-35-5@m30 | 7 | 7 (100 %) | 40 | 80 % | 36.87 | 54.89 | tp2.4 sl4.8 tr0 h48 sh (6 · ∞ (no loss) · 13.20) |
| Short | ribbon | macd-cross-5-35-5@m30 | 6 | 6 (100 %) | 34 | 82 % | 42.59 | 49.80 | tp2.4 sl4.8 tr0 h48 sh (6 · ∞ (no loss) · 13.20) |
| Short | revert | break-retest@m15c | 5 | 5 (100 %) | 23 | 83 % | 78.34 | 41.35 | tp2.8 sl5.6 tr0 h64 sh (5 · ∞ (no loss) · 13.00) |
| Short | sweep | macd-cross@m15 | 4 | 4 (100 %) | 33 | 67 % | 7.75 | 39.27 | tp2.8 sl5.6 tr0 h64 sh (7 · ∞ (no loss) · 18.20) |
| Short | sweep | break-squeeze-30@m30 | 10 | 6 (60 %) | 34 | 88 % | 2.67 | 37.36 | – |
| Short | revert | r-pdhl-m@m15c | 22 | 22 (100 %) | 38 | 84 % | 160.17 | 34.38 | – |
| Short | follow | mfi-14-20@m15 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 31.20 | – |
| Short | sweep | macd-cross-19-39-9@m15 | 11 | 11 (100 %) | 33 | 76 % | 2.25 | 27.35 | tp2 sl4 tr0 h64 sh (5 · 1.71 · 3.00) |
| Short | sweep | break-squeeze-t25@m15c | 33 | 23 (70 %) | 31 | 74 % | 30.84 | 26.50 | – |
| Short | revert | r-session-trend-m@m15c | 3 | 3 (100 %) | 30 | 73 % | 1.73 | 25.44 | tp2.8 sl5.6 tr0 h64 sh (12 · 2.24 · 14.40) |
| Short | sweep | r-stc-m@m15 | 5 | 5 (100 %) | 14 | 100 % | ∞ (no loss) | 22.60 | – |
| Short | ribbon | willr-14-95@m30 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 21.80 | – |
| Short | revert | break-vol-2@x4@m15 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 20.80 | – |
| Short | pivot | cci-40-200@m15c | 12 | 8 (67 %) | 92 | 65 % | 1.29 | 20.75 | tp2.2 sl3.3 tr1.1 h64 sh (7 · 2.47 · 5.13) |
| Short | ribbon | r-td@m30 | 17 | 12 (71 %) | 22 | 77 % | 2.61 | 20.10 | – |
| Short | sweep | willr-28-90@m15c | 3 | 3 (100 %) | 12 | 92 % | 7.52 | 19.56 | – |
| Short | follow | r-td-m@m30 | 6 | 4 (67 %) | 30 | 60 % | 2.32 | 17.09 | tp2 sl2 tr0 h32 sh (5 · 3.27 · 5.00) |
| Short | sweep | willr-21-95@m15c | 13 | 13 (100 %) | 13 | 100 % | ∞ (no loss) | 16.57 | – |
| Short | ribbon | r-ultimate@m30 | 8 | 6 (75 %) | 17 | 59 % | 2.50 | 15.23 | – |
| Short | sweep | willr-50-90@m30 | 3 | 3 (100 %) | 15 | 73 % | 2.50 | 13.76 | tp2.6 sl2.6 tr0 h48 sh (5 · 3.43 · 6.80) |
| Short | clamp | move-impulse-20-2.5@m15c | 2 | 2 (100 %) | 8 | 75 % | 91.89 | 13.39 | tp2.6 sl5.2 tr1.3 h64 sh (5 · 43.02 · 6.19) |
| Short | follow | r-sweep-m@m15 | 8 | 7 (88 %) | 9 | 89 % | 5.59 | 13.30 | – |
| Short | ribbon | trend-st@m15 | 8 | 6 (75 %) | 10 | 80 % | 3.32 | 13.00 | – |
| Short | revert | z-50-2.5@x4@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 12.60 | – |
| Short | ribbon | trend-st-21-3@m15 | 53 | 31 (58 %) | 75 | 65 % | 1.18 | 12.49 | – |
| Short | sweep | willr-14-95@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 12.44 | – |
| Short | pivot | bb-bounce-50-2@m15c | 2 | 2 (100 %) | 14 | 86 % | 3.46 | 11.82 | tp2.2 sl2.2 tr1.1 h64 sh (7 · 3.46 · 5.91) |
| Short | pivot | z-50-2@m15c | 2 | 2 (100 %) | 14 | 86 % | 3.46 | 11.82 | tp2.2 sl2.2 tr1.1 h64 sh (7 · 3.46 · 5.91) |
| Short | sweep | r-ultimate@m15 | 4 | 4 (100 %) | 10 | 90 % | 4.37 | 10.10 | – |
| Short | sweep | break-squeeze-120@m30 | 14 | 7 (50 %) | 7 | 100 % | ∞ (no loss) | 5.50 | – |
| Short | ribbon | mfi-14-20@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 4.93 | – |
| Short | ribbon | macd-hist-19-39-9@m30 | 2 | 2 (100 %) | 10 | 80 % | 1.58 | 4.90 | tp2 sl4 tr0 h48 sh (5 · 1.71 · 3.00) |
| Short | ribbon | trend-st-21-3@m15c | 84 | 49 (58 %) | 131 | 56 % | 1.04 | 4.72 | – |
| Short | revert | move-impulse-20-2.5@m15c | 1 | 1 (100 %) | 12 | 58 % | 1.30 | 3.53 | tp2.8 sl5.6 tr2.1 h96 sh (12 · 1.30 · 3.53) |
| Short | clamp | r-cvd-div-m@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 3.42 | – |
| Short | follow | r-cvd-div-m@m15c | 2 | 2 (100 %) | 12 | 67 % | 1.16 | 2.40 | tp2.4 sl3.6 tr0 h64 sh (6 · 1.16 · 1.20) |
| Short | ribbon | macd-cross@m15 | 1 | 1 (100 %) | 5 | 60 % | 1.32 | 0.93 | tp1.8 sl2.7 tr1.35 h64 sh (5 · 1.32 · 0.93) |
| Short | sweep | willr-50-80@m30 | 1 | 0 (0 %) | 6 | 67 % | 0.89 | -1.24 | tp2.6 sl5.2 tr1.3 h32 sh (6 · 0.89 · -1.24) |
| Short | follow | willr-50-90@m30 | 1 | 0 (0 %) | 12 | 58 % | 0.82 | -3.70 | tp2.6 sl3.9 tr0 h32 sh (12 · 0.82 · -3.70) |
| Short | revert | r-qh-flow@m15c | 8 | 3 (38 %) | 144 | 66 % | 0.98 | -4.78 | tp2.8 sl5.6 tr2.1 h64 sh (16 · 1.25 · 5.78) |
| Short | clamp | willr-50-80@m15c | 1 | 0 (0 %) | 6 | 50 % | 0.59 | -5.40 | tp2.8 sl4.2 tr0 h64 sh (6 · 0.59 · -5.40) |
| Short | sweep | willr-7-80@m15c | 1 | 0 (0 %) | 13 | 46 % | 0.69 | -6.57 | tp2.8 sl2.8 tr2.1 h64 sh (13 · 0.69 · -6.57) |
| Short | sweep | rsi-fast@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.38 | -6.90 | – |
| Short | revert | break-vol-2@m30 | 3 | 0 (0 %) | 7 | 43 % | 0.44 | -8.20 | – |
| Short | pivot | willr-50-90@m15 | 7 | 2 (29 %) | 24 | 54 % | 0.66 | -10.11 | – |
| Short | ribbon | trend-st-14-4@m15c | 4 | 0 (0 %) | 20 | 40 % | 0.57 | -14.40 | tp2.4 sl2.4 tr0 h64 sh (5 · 0.56 · -3.40) |
| Short | clamp | willr-14-90@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.29 | -18.20 | – |
| Short | ribbon | trend-st-35-7@m15 | 1 | 0 (0 %) | 14 | 29 % | 0.35 | -19.60 | tp2.8 sl2.8 tr0 h64 sh (14 · 0.35 · -19.60) |
| Short | sweep | r-engulf-m@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -20.60 | – |
| Short | revert | dir-thrust-4@m15c | 4 | 0 (0 %) | 38 | 53 % | 0.62 | -21.05 | tp2.4 sl4.8 tr1.2 h64 sh (9 · 0.78 · -2.32) |
| Short | pivot | r-ultimate@m15 | 17 | 2 (12 %) | 57 | 58 % | 0.53 | -23.73 | – |
| Short | ribbon | srsi-14-10@m15c | 2 | 0 (0 %) | 32 | 44 % | 0.42 | -26.95 | tp2.4 sl2.4 tr1.2 h64 sh (16 · 0.42 · -13.47) |
| Short | magnet | break-retest@m15c | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -28.10 | – |
| Short | sandwich | obv-50@m15c | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -29.80 | – |
| Short | ribbon | ichi-tk-20@m15c | 2 | 0 (0 %) | 20 | 20 % | 0.21 | -30.20 | tp2.2 sl2.2 tr1.65 h96 sh (10 · 0.22 · -15.00) |
| Short | ribbon | ema-50-100@m15c | 3 | 0 (0 %) | 35 | 49 % | 0.56 | -31.41 | tp2.8 sl4.2 tr0 h64 sh (11 · 0.71 · -6.40) |
| Short | ribbon | dir-vwap@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -33.40 | – |
| Short | magnet | move-impulse@m15 | 4 | 0 (0 %) | 12 | 33 % | 0.02 | -40.59 | – |
| Short | revert | r-chop@m30 | 14 | 2 (14 %) | 66 | 35 % | 0.50 | -40.85 | tp1.8 sl2.7 tr0.9 h32 sh (5 · 0.54 · -2.75) |
| Short | magnet | sar-std@m15c | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -43.63 | – |
| Short | clamp | willr-14-90@m15c | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -46.40 | – |
| Short | revert | r-qh-flow-m@m15c | 5 | 0 (0 %) | 63 | 43 % | 0.45 | -50.62 | tp2.8 sl5.6 tr1.4 h96 sh (11 · 0.85 · -1.80) |
| Short | clamp | cci-40-200@m15c | 12 | 0 (0 %) | 30 | 30 % | 0.12 | -51.68 | – |
| Short | ribbon | dir-vwap-120@m15c | 6 | 0 (0 %) | 24 | 0 % | 0.00 | -67.20 | – |
| Short | sweep | break-vol@x4@m15 | 22 | 0 (0 %) | 22 | 0 % | 0.00 | -72.33 | – |
| Short | ribbon | trend-st@m15c | 94 | 0 (0 %) | 42 | 0 % | 0.00 | -74.59 | – |
| Short | sweep | r-pin-m@m15 | 30 | 0 (0 %) | 27 | 0 % | 0.00 | -74.73 | – |
| Short | revert | r-choch-m@m30 | 5 | 0 (0 %) | 17 | 6 % | 0.00 | -76.60 | tp2.4 sl4.8 tr1.2 h32 sh (5 · 0.01 · -14.80) |
| Short | clamp | cci-40-200@m15 | 5 | 0 (0 %) | 22 | 9 % | 0.00 | -83.68 | tp2 sl4 tr1 h64 sh (5 · 0.01 · -16.64) |
| Short | ribbon | ema-21-55@m15 | 6 | 0 (0 %) | 60 | 27 % | 0.29 | -84.94 | tp2.6 sl2.6 tr0 h64 sh (10 · 0.37 · -12.40) |
| Short | ribbon | dir-vwap-240@m15 | 4 | 0 (0 %) | 34 | 24 % | 0.19 | -85.20 | tp2.8 sl4.2 tr0 h96 sh (7 · 0.24 · -16.80) |
| Short | ribbon | r-ultimate@m15 | 18 | 0 (0 %) | 94 | 41 % | 0.26 | -86.16 | tp1.8 sl1.8 tr1.35 h64 sh (5 · 0.83 · -0.66) |
| Short | ribbon | trix-15@m15c | 17 | 1 (6 %) | 115 | 38 % | 0.51 | -90.13 | tp2.6 sl3.9 tr1.3 h64 sh (6 · 1.36 · 1.56) |
| Short | clamp | dir-thrust@m15c | 38 | 6 (16 %) | 38 | 16 % | 0.01 | -99.70 | – |
| Short | ribbon | ichi-tk-20@m15 | 8 | 0 (0 %) | 80 | 25 % | 0.26 | -115.82 | tp1.8 sl2.7 tr1.35 h64 sh (10 · 0.37 · -11.09) |
| Short | revert | r-qh-flow-m@m30 | 8 | 0 (0 %) | 118 | 42 % | 0.35 | -136.62 | tp2.4 sl3.6 tr1.8 h32 sh (17 · 0.43 · -15.23) |
| Short | ribbon | obv-20@m30 | 31 | 3 (10 %) | 181 | 44 % | 0.38 | -185.32 | tp2.6 sl5.2 tr1.3 h48 sh (6 · 1.45 · 2.45) |
| Short | ribbon | ichi-cloud-20@m15c | 15 | 0 (0 %) | 50 | 0 % | 0.00 | -189.40 | – |
| Short | ribbon | ema-50-100@m15 | 14 | 0 (0 %) | 208 | 46 % | 0.52 | -207.57 | tp2.8 sl4.2 tr2.1 h64 sh (14 · 0.77 · -6.03) |
| Short | ribbon | dir-vwap-120@m15 | 25 | 0 (0 %) | 188 | 24 % | 0.21 | -313.43 | tp2.6 sl2.6 tr1.3 h64 sh (8 · 0.14 · -9.79) |
| Short | ribbon | ema-21-55@m15c | 22 | 0 (0 %) | 189 | 21 % | 0.21 | -346.47 | tp1.8 sl3.6 tr1.35 h64 sh (7 · 0.31 · -10.49) |
| Short | ribbon | dir-emax-20-50@m15c | 23 | 0 (0 %) | 198 | 22 % | 0.21 | -355.31 | tp2.2 sl3.3 tr1.1 h64 sh (9 · 0.37 · -8.94) |
| Short | ribbon | ema-slope-100@m15c | 37 | 0 (0 %) | 173 | 19 % | 0.12 | -375.74 | tp2 sl2 tr1.5 h64 sh (5 · 0.20 · -7.00) |
| Short | revert | bb-walk-50@m15 | 31 | 0 (0 %) | 316 | 32 % | 0.21 | -456.48 | tp2.8 sl5.6 tr1.4 h64 sh (9 · 0.45 · -9.71) |
| Short | ribbon | ema-slope-100@m15 | 43 | 0 (0 %) | 218 | 17 % | 0.11 | -515.49 | tp2 sl2 tr1.5 h64 sh (6 · 0.16 · -9.20) |
| Short | ribbon | ema-slope@m15c | 73 | 0 (0 %) | 187 | 2 % | 0.00 | -535.19 | – |
| Short | ribbon | ema-slope@m15 | 76 | 0 (0 %) | 200 | 0 % | 0.00 | -554.46 | – |
| General | sweep | willr-50-90@m15c | 14 | 14 (100 %) | 73 | 77 % | 3.89 | 157.00 | tp3.2 sl3.2 tr2.4 h96 gn (6 · 5.21 · 14.31) |
| General | revert | trend-ema-50-200@m30 | 19 | 19 (100 %) | 111 | 72 % | 1.98 | 116.55 | tp4.4 sl4.4 tr0 h32 gn (5 · 3.65 · 12.20) |
| General | sweep | willr-21-95@m15 | 7 | 7 (100 %) | 21 | 100 % | ∞ (no loss) | 75.91 | – |
| General | sweep | willr-50-90@m30 | 10 | 10 (100 %) | 41 | 76 % | 3.17 | 71.96 | tp3.2 sl3.2 tr1.6 h48 gn (5 · 2.13 · 3.86) |
| General | revert | r-session-trend-m@m15c | 3 | 3 (100 %) | 31 | 71 % | 2.22 | 36.83 | tp4.4 sl4.4 tr0 h96 gn (10 · 3.65 · 24.40) |
| General | revert | trend-ema-50-200@m15c | 9 | 9 (100 %) | 58 | 67 % | 1.51 | 35.97 | tp3.6 sl3.6 tr0 h64 gn (7 · 2.24 · 9.40) |
| General | revert | break-don55@m30 | 11 | 8 (73 %) | 94 | 54 % | 1.20 | 29.56 | tp4.4 sl4.4 tr3.3 h32 gn (5 · 3.25 · 10.36) |
| General | sweep | willr-28-90@m15c | 4 | 4 (100 %) | 17 | 76 % | 3.26 | 28.91 | tp3.2 sl3.2 tr2.4 h96 gn (5 · 4.33 · 11.31) |
| General | pivot | move-impulse-20-2.5@m15c | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 26.57 | – |
| General | sweep | r-ultimate@m15 | 4 | 4 (100 %) | 8 | 88 % | 7.65 | 23.26 | – |
| General | ribbon | trend-st-21-3@m15 | 13 | 11 (85 %) | 13 | 85 % | 97.74 | 19.31 | – |
| General | revert | r-session-trend-m@m15 | 1 | 1 (100 %) | 12 | 50 % | 2.00 | 18.78 | tp4.4 sl4.4 tr3.3 h64 gn (12 · 2.00 · 18.78) |
| General | ribbon | trend-st-21-3@m15c | 13 | 13 (100 %) | 15 | 87 % | 4.10 | 18.01 | – |
| General | revert | break-don55@m15c | 10 | 6 (60 %) | 80 | 53 % | 1.13 | 17.67 | tp4.4 sl4.4 tr3.3 h64 gn (5 · 3.32 · 10.67) |
| General | ribbon | trend-st@m15 | 7 | 7 (100 %) | 10 | 70 % | 2.74 | 14.10 | – |
| General | follow | r-cvd-div-m@m15c | 2 | 2 (100 %) | 14 | 71 % | 1.82 | 12.43 | tp3.6 sl3.6 tr1.8 h64 gn (7 · 1.82 · 6.22) |
| General | pivot | r-vortex@m15 | 32 | 16 (50 %) | 22 | 73 % | 2.01 | 12.16 | – |
| General | sweep | willr-50-90@m15 | 1 | 1 (100 %) | 9 | 67 % | 2.31 | 10.20 | tp3.2 sl2.4 tr0 h64 gn (9 · 2.31 · 10.20) |
| General | sweep | break-squeeze-30@m30 | 3 | 3 (100 %) | 12 | 75 % | 1.69 | 9.30 | tp4 sl4 tr2 h32 gn (5 · 1.97 · 4.06) |
| General | revert | break-vol-2@m15c | 4 | 2 (50 %) | 10 | 50 % | 1.62 | 7.90 | – |
| General | sweep | bb-bounce-50-2@m15 | 4 | 4 (100 %) | 26 | 46 % | 1.20 | 6.00 | tp3.2 sl1.6 tr0 h64 gn (7 · 1.25 · 1.80) |
| General | sweep | z-50-2@m15 | 4 | 4 (100 %) | 26 | 46 % | 1.20 | 6.00 | tp3.2 sl1.6 tr0 h64 gn (7 · 1.25 · 1.80) |
| General | follow | willr-50-90@m30 | 1 | 1 (100 %) | 12 | 58 % | 1.27 | 5.60 | tp4 sl4 tr0 h32 gn (12 · 1.27 · 5.60) |
| General | follow | mfi-14-20@m15 | 2 | 2 (100 %) | 8 | 75 % | 1.37 | 3.43 | – |
| General | ribbon | willr-14-95@m30 | 6 | 5 (83 %) | 6 | 83 % | 16.79 | 3.21 | – |
| General | sweep | willr-14-80@m15c | 2 | 2 (100 %) | 24 | 50 % | 1.04 | 1.82 | tp3.2 sl3.2 tr2.4 h64 gn (12 · 1.04 · 0.91) |
| General | revert | move-impulse-20-2.5@m15c | 1 | 1 (100 %) | 12 | 58 % | 1.08 | 1.07 | tp4.4 sl4.4 tr2.2 h96 gn (12 · 1.08 · 1.07) |
| General | ribbon | dir-thrust@m30 | 10 | 6 (60 %) | 6 | 100 % | ∞ (no loss) | 1.06 | – |
| General | pivot | cci-40-200@m15c | 1 | 0 (0 %) | 8 | 38 % | 1.00 | -0.00 | tp3.2 sl1.6 tr0 h64 gn (8 · 1.00 · -0.00) |
| General | ribbon | trend-st-14-4@m15 | 1 | 0 (0 %) | 5 | 40 % | 0.77 | -1.80 | tp3.2 sl2.4 tr0 h64 gn (5 · 0.77 · -1.80) |
| General | revert | r-fractal@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.70 | -2.80 | – |
| General | revert | ema-slope-200@m30 | 1 | 0 (0 %) | 11 | 64 % | 0.79 | -3.13 | tp3.6 sl3.6 tr1.8 h48 gn (11 · 0.79 · -3.13) |
| General | sweep | willr-7-80@m15c | 2 | 0 (0 %) | 25 | 44 % | 0.80 | -8.20 | tp3.2 sl2.4 tr0 h64 gn (14 · 0.87 · -2.80) |
| General | revert | break-vol@m30 | 1 | 0 (0 %) | 5 | 0 % | 0.00 | -10.00 | tp3.6 sl1.8 tr0 h48 gn (5 · 0.00 · -10.00) |
| General | follow | r-camarilla@m15c | 1 | 0 (0 %) | 6 | 17 % | 0.23 | -10.00 | tp3.2 sl2.4 tr0 h96 gn (6 · 0.23 · -10.00) |
| General | pivot | mfi-14-20@m15c | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -10.20 | – |
| General | revert | ema-slope-200@m15c | 2 | 0 (0 %) | 23 | 48 % | 0.71 | -12.24 | tp3.6 sl3.6 tr1.8 h96 gn (13 · 0.84 · -3.04) |
| General | revert | move-impulse-20-2.5@m15 | 1 | 0 (0 %) | 17 | 35 % | 0.65 | -13.30 | tp4.4 sl3.3 tr0 h64 gn (17 · 0.65 · -13.30) |
| General | revert | break-vol-1.3@m15c | 1 | 0 (0 %) | 7 | 0 % | 0.00 | -14.00 | tp3.6 sl1.8 tr0 h96 gn (7 · 0.00 · -14.00) |
| General | ribbon | trend-ema-50-200@m15 | 1 | 0 (0 %) | 9 | 22 % | 0.34 | -14.80 | tp4 sl3 tr0 h64 gn (9 · 0.34 · -14.80) |
| General | ribbon | trend-st@m15c | 32 | 0 (0 %) | 6 | 0 % | 0.00 | -17.40 | – |
| General | magnet | move-impulse@m15 | 2 | 0 (0 %) | 5 | 0 % | 0.00 | -18.46 | – |
| General | ribbon | move-impulse-10-2@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -18.60 | – |
| General | ribbon | dir-vwap@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -19.30 | – |
| General | revert | move-impulse-20-2.5@m30 | 2 | 0 (0 %) | 14 | 43 % | 0.46 | -19.77 | tp4.4 sl4.4 tr3.3 h32 gn (7 · 0.46 · -9.89) |
| General | ribbon | trend-st-35-7@m15 | 2 | 0 (0 %) | 28 | 21 % | 0.45 | -21.60 | tp3.2 sl1.6 tr0 h64 gn (14 · 0.45 · -10.80) |
| General | ribbon | dir-vwap-240@m15 | 1 | 0 (0 %) | 12 | 17 % | 0.24 | -24.40 | tp4 sl3 tr0 h64 gn (12 · 0.24 · -24.40) |
| General | revert | break-vol-2@m30 | 16 | 1 (6 %) | 46 | 37 % | 0.72 | -24.60 | – |
| General | ribbon | obv-20@m30 | 4 | 0 (0 %) | 24 | 33 % | 0.42 | -26.94 | tp3.2 sl3.2 tr1.6 h32 gn (7 · 0.62 · -4.20) |
| General | ribbon | dir-vwap@m15 | 11 | 0 (0 %) | 11 | 0 % | 0.00 | -27.40 | – |
| General | follow | r-bb-adx@m30 | 2 | 0 (0 %) | 16 | 25 % | 0.24 | -29.99 | tp3.2 sl3.2 tr2.4 h32 gn (9 · 0.29 · -14.62) |
| General | ribbon | trend-st-14-4@m15c | 10 | 0 (0 %) | 36 | 28 % | 0.52 | -32.30 | – |
| General | clamp | willr-50-80@m15c | 5 | 0 (0 %) | 20 | 25 % | 0.35 | -33.70 | – |
| General | ribbon | r-ultimate@m15 | 5 | 0 (0 %) | 25 | 32 % | 0.21 | -37.90 | tp3.6 sl3.6 tr0 h96 gn (5 · 0.60 · -4.60) |
| General | ribbon | trix-15@m15c | 12 | 0 (0 %) | 68 | 38 % | 0.55 | -58.95 | tp4.4 sl3.3 tr0 h64 gn (5 · 0.80 · -2.10) |
| General | revert | r-bos@m15 | 9 | 0 (0 %) | 47 | 19 % | 0.33 | -62.30 | tp3.6 sl1.8 tr0 h64 gn (7 · 0.28 · -8.60) |
| General | revert | r-qh-flow-m@m15c | 4 | 0 (0 %) | 47 | 38 % | 0.35 | -78.57 | tp4 sl4 tr0 h96 gn (11 · 0.52 · -14.20) |
| General | ribbon | ema-50-100@m15 | 6 | 0 (0 %) | 87 | 37 % | 0.55 | -89.05 | tp4.4 sl4.4 tr0 h64 gn (11 · 0.76 · -6.60) |
| General | ribbon | ema-21-55@m15c | 6 | 0 (0 %) | 46 | 17 % | 0.18 | -97.20 | tp3.2 sl2.4 tr0 h64 gn (8 · 0.16 · -15.20) |
| General | ribbon | dir-vwap-120@m15c | 10 | 0 (0 %) | 38 | 0 % | 0.00 | -116.00 | – |
| General | ribbon | ema-slope@m15 | 19 | 0 (0 %) | 45 | 0 % | 0.00 | -141.70 | – |
| General | ribbon | dir-emax-20-50@m15c | 9 | 0 (0 %) | 66 | 17 % | 0.18 | -150.20 | tp3.2 sl2.4 tr0 h64 gn (8 · 0.16 · -15.20) |
| General | ribbon | ema-slope@m15c | 23 | 0 (0 %) | 55 | 0 % | 0.00 | -170.50 | – |
| General | ribbon | ema-slope-100@m15c | 15 | 0 (0 %) | 58 | 3 % | 0.00 | -184.13 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 0.02 · -13.26) |
| General | ribbon | dir-vwap-120@m15 | 14 | 0 (0 %) | 86 | 14 % | 0.17 | -195.80 | tp3.6 sl3.6 tr0 h64 gn (5 · 0.22 · -11.80) |
| General | ribbon | ema-slope-100@m15 | 15 | 0 (0 %) | 63 | 3 % | 0.00 | -202.63 | tp3.2 sl2.4 tr0 h64 gn (5 · 0.00 · -13.00) |
| Long | sweep | willr-50-90@m15c | 28 | 28 (100 %) | 98 | 89 % | 10.46 | 426.12 | tp6.4 sl4.8 tr0 h96 lg (5 · 4.96 · 19.80) |
| Long | revert | trend-ema-50-200@m30 | 29 | 24 (83 %) | 98 | 83 % | 4.20 | 267.21 | tp4.8 sl3.6 tr0 h48 lg (5 · 4.84 · 14.60) |
| Long | follow | mfi-14-20@m15 | 28 | 28 (100 %) | 71 | 92 % | 10.86 | 266.35 | – |
| Long | revert | trend-ema-50-200@m15c | 30 | 30 (100 %) | 131 | 75 % | 2.62 | 261.49 | tp5.2 sl5.2 tr0 h96 lg (5 · 3.70 · 14.60) |
| Long | sweep | willr-50-90@m30 | 18 | 18 (100 %) | 61 | 85 % | 7.18 | 248.60 | – |
| Long | revert | r-session-trend-m@m15c | 23 | 17 (74 %) | 159 | 69 % | 1.78 | 207.59 | tp4.8 sl4.8 tr0 h64 lg (10 · 3.68 · 26.80) |
| Long | sweep | willr-21-95@m15 | 13 | 13 (100 %) | 39 | 100 % | ∞ (no loss) | 168.67 | – |
| Long | revert | break-vol-2@m30 | 20 | 15 (75 %) | 45 | 69 % | 3.59 | 118.40 | – |
| Long | sweep | r-ultimate@m15 | 22 | 20 (91 %) | 32 | 97 % | 30.48 | 112.04 | – |
| Long | sweep | willr-14-80@m15c | 5 | 5 (100 %) | 28 | 68 % | 2.80 | 100.96 | tp6 sl6 tr3 h64 lg (6 · 3.17 · 26.95) |
| Long | sweep | willr-14-95@m30 | 11 | 11 (100 %) | 18 | 100 % | ∞ (no loss) | 90.62 | – |
| Long | sweep | macd-cross@m15 | 4 | 4 (100 %) | 19 | 89 % | 10.18 | 80.77 | tp5.6 sl5.6 tr0 h96 lg (5 · ∞ (no loss) · 27.00) |
| Long | revert | move-impulse-20-2.5@m15c | 5 | 5 (100 %) | 43 | 70 % | 2.04 | 73.92 | tp5.6 sl5.6 tr0 h64 lg (8 · 2.79 · 20.80) |
| Long | revert | break-don55@m30 | 5 | 5 (100 %) | 25 | 80 % | 3.25 | 68.79 | tp6.4 sl6.4 tr3.2 h32 lg (5 · 3.23 · 14.70) |
| Long | follow | willr-50-95@m15c | 4 | 4 (100 %) | 27 | 70 % | 2.88 | 67.20 | tp6.4 sl4.8 tr0 h64 lg (6 · 6.20 · 26.00) |
| Long | sweep | willr-28-90@m30 | 3 | 3 (100 %) | 12 | 100 % | ∞ (no loss) | 64.80 | – |
| Long | revert | r-qh-flow-m@m15c | 13 | 11 (85 %) | 88 | 52 % | 1.26 | 58.84 | tp5.6 sl5.6 tr4.2 h96 lg (7 · 1.64 · 11.16) |
| Long | revert | break-don55@m15c | 5 | 5 (100 %) | 26 | 73 % | 2.57 | 58.77 | tp6.4 sl6.4 tr3.2 h64 lg (5 · 3.28 · 15.03) |
| Long | revert | break-vol-2@m15c | 7 | 7 (100 %) | 14 | 79 % | 5.29 | 45.04 | – |
| Long | sweep | r-td@m30 | 5 | 4 (80 %) | 10 | 100 % | ∞ (no loss) | 36.29 | – |
| Long | ribbon | willr-14-95@m30 | 11 | 6 (55 %) | 6 | 100 % | ∞ (no loss) | 32.71 | – |
| Long | sweep | willr-28-80@m30 | 3 | 3 (100 %) | 5 | 100 % | ∞ (no loss) | 30.20 | – |
| Long | revert | ema-slope-200@m30 | 1 | 1 (100 %) | 5 | 80 % | 3.76 | 18.20 | tp6.4 sl6.4 tr0 h48 lg (5 · 3.76 · 18.20) |
| Long | revert | ichi-cloud-20@m15c | 7 | 5 (71 %) | 24 | 54 % | 1.32 | 17.50 | – |
| Long | follow | willr-50-90@m30 | 1 | 1 (100 %) | 12 | 58 % | 1.71 | 14.50 | tp5.2 sl3.9 tr0 h32 lg (12 · 1.71 · 14.50) |
| Long | follow | r-cvd-div-m@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.82 | 6.20 | tp4.8 sl3.6 tr0 h64 lg (5 · 1.82 · 6.20) |
| Long | ribbon | ema-50-100@m15 | 1 | 1 (100 %) | 10 | 50 % | 1.23 | 5.00 | tp5.6 sl4.2 tr0 h64 lg (10 · 1.23 · 5.00) |
| Long | revert | break-vol-1.3@m30 | 1 | 1 (100 %) | 5 | 60 % | 1.39 | 4.20 | tp5.2 sl5.2 tr0 h32 lg (5 · 1.39 · 4.20) |
| Long | revert | break-vol@m30 | 5 | 0 (0 %) | 10 | 50 % | 0.93 | -2.00 | – |
| Long | revert | r-tsi-m@m30 | 1 | 0 (0 %) | 5 | 40 % | 0.82 | -2.50 | tp6 sl4.5 tr0 h48 lg (5 · 0.82 · -2.50) |
| Long | ribbon | trend-st-14-4@m15c | 5 | 3 (60 %) | 14 | 36 % | 0.86 | -3.90 | – |
| Long | ribbon | willr-7-80@m30 | 14 | 3 (21 %) | 61 | 59 % | 0.97 | -4.56 | tp6 sl6 tr3 h32 lg (5 · 0.67 · -4.14) |
| Long | revert | r-qh-flow@m15c | 1 | 0 (0 %) | 15 | 40 % | 0.81 | -6.90 | tp5.2 sl3.9 tr0 h64 lg (15 · 0.81 · -6.90) |
| Long | revert | r-qh-flow-m@m30 | 1 | 0 (0 %) | 9 | 44 % | 0.74 | -7.00 | tp5.2 sl5.2 tr2.6 h48 lg (9 · 0.74 · -7.00) |
| Long | revert | break-vol-1.3@m15 | 5 | 0 (0 %) | 29 | 48 % | 0.92 | -7.40 | tp6 sl6 tr0 h64 lg (6 · 0.94 · -1.20) |
| Long | revert | break-vol-1.3@m15c | 9 | 3 (33 %) | 38 | 50 % | 0.92 | -8.35 | tp5.6 sl5.6 tr4.2 h64 lg (5 · 0.53 · -5.45) |
| Long | sweep | willr-50-80@m30 | 3 | 0 (0 %) | 8 | 38 % | 0.65 | -9.60 | – |
| Long | follow | r-bb-adx@m30 | 1 | 0 (0 %) | 7 | 29 % | 0.49 | -10.50 | tp5.2 sl3.9 tr0 h32 lg (7 · 0.49 · -10.50) |
| Long | ribbon | move-impulse-10-2@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -13.80 | – |
| Long | revert | move-impulse-20-2.5@m30 | 2 | 0 (0 %) | 13 | 54 % | 0.59 | -13.88 | tp4.8 sl4.8 tr2.4 h32 lg (7 · 0.62 · -5.71) |
| Long | sweep | willr-50-80@m15c | 3 | 0 (0 %) | 8 | 38 % | 0.54 | -14.31 | – |
| Long | revert | move-impulse@m30 | 1 | 0 (0 %) | 13 | 38 % | 0.57 | -17.00 | tp4.8 sl4.8 tr0 h32 lg (13 · 0.57 · -17.00) |
| Long | pivot | willr-7-80@m15 | 3 | 0 (0 %) | 25 | 40 % | 0.74 | -19.50 | tp6 sl4.5 tr0 h64 lg (8 · 0.74 · -6.10) |
| Long | revert | break-vol@m15 | 2 | 0 (0 %) | 8 | 25 % | 0.36 | -21.60 | – |
| Long | ribbon | trix-15@m15c | 4 | 0 (0 %) | 18 | 28 % | 0.51 | -23.90 | tp4.8 sl3.6 tr0 h64 lg (5 · 0.81 · -2.20) |
| Long | revert | r-bos@m15 | 7 | 0 (0 %) | 23 | 30 % | 0.61 | -25.40 | – |
| Long | revert | move-impulse-20-2.5@m15 | 2 | 0 (0 %) | 33 | 24 % | 0.58 | -31.80 | tp5.6 sl2.8 tr0 h96 lg (16 · 0.60 · -14.40) |
| Long | ribbon | trend-st-21-5@m15 | 8 | 2 (25 %) | 30 | 33 % | 0.61 | -32.60 | tp4.8 sl3.6 tr0 h64 lg (5 · 1.82 · 6.20) |
| Long | ribbon | ema-slope@m15 | 4 | 0 (0 %) | 12 | 0 % | 0.00 | -34.80 | – |
| Long | ribbon | ema-slope-100@m15c | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -40.50 | – |
| Long | clamp | cci-40-100@m15c | 3 | 0 (0 %) | 7 | 0 % | 0.00 | -41.40 | – |
| Long | revert | r-roofing@m15 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -43.50 | – |
| Long | ribbon | ema-slope-100@m15 | 4 | 0 (0 %) | 14 | 0 % | 0.00 | -53.50 | tp4.8 sl2.4 tr0 h64 lg (5 · 0.00 · -13.00) |
| Long | ribbon | ema-slope@m15c | 7 | 0 (0 %) | 18 | 0 % | 0.00 | -59.40 | – |
| Long | ribbon | dir-vwap-120@m15c | 5 | 0 (0 %) | 17 | 0 % | 0.00 | -62.30 | – |
| Long | revert | r-choch-m@m30 | 4 | 0 (0 %) | 12 | 0 % | 0.00 | -62.70 | – |
| Long | ribbon | dir-emax-20-50@m15c | 6 | 0 (0 %) | 42 | 14 % | 0.25 | -94.50 | tp5.2 sl2.6 tr0 h96 lg (8 · 0.26 · -14.60) |
| Long | sweep | break-squeeze-30@m30 | 23 | 2 (9 %) | 53 | 36 % | 0.15 | -160.70 | – |
| Long | ribbon | dir-vwap-120@m15 | 12 | 0 (0 %) | 61 | 11 % | 0.13 | -187.13 | tp4.8 sl3.6 tr0 h64 lg (5 · 0.30 · -10.60) |
| Wide | pivot | r-chand@m15 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 39.17 | – |
| Wide | sweep | mc-ivwapd-2@m15c | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 27.97 | – |
| Wide | revert | break-vol-2@m30 | 3 | 3 (100 %) | 6 | 50 % | 4.61 | 22.15 | – |
| Wide | sweep | willr-14-95@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 12.41 | – |
| Wide | revert | break-retest@m5c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.02 | – |
| Wide | magnet | r-sweep@m5 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 3.26 | – |
| Wide | ribbon | trend-st-21-3@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 3.14 | – |
| Wide | pivot | rsi-div@m15c | 9 | 3 (33 %) | 6 | 50 % | 0.33 | -1.10 | – |
| Wide | sandwich | bb-bounce-50-2@m1c | 6 | 1 (17 %) | 48 | 38 % | 0.84 | -2.83 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (8 · 1.16 · 0.57) |
| Wide | sandwich | z-50-2@m1c | 6 | 1 (17 %) | 48 | 38 % | 0.84 | -2.83 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (8 · 1.16 · 0.57) |
| Wide | snap | bb-bounce-50-2@m1c | 6 | 0 (0 %) | 48 | 44 % | 0.81 | -3.26 | tp0.64 sl0.54 tr0 h480 axd-volume2h axis (8 · 0.88 · -0.29) |
| Wide | snap | z-50-2@m1c | 6 | 0 (0 %) | 48 | 44 % | 0.81 | -3.26 | tp0.64 sl0.54 tr0 h480 axd-volume2h axis (8 · 0.88 · -0.29) |
| Wide | snap | obv-50@m1c | 4 | 3 (75 %) | 36 | 39 % | 0.82 | -4.00 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (8 · 1.00 · 0.01) |
| Wide | revert | r-session-trend-m@m15c | 3 | 0 (0 %) | 39 | 46 % | 0.76 | -6.16 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (13 · 0.76 · -2.05) |
| Wide | sweep | willr-50-95@m5c | 14 | 3 (21 %) | 16 | 19 % | 0.23 | -6.38 | – |
| Wide | ribbon | trend-st-21-5@m15 | 3 | 0 (0 %) | 30 | 50 % | 0.72 | -6.99 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (10 · 0.72 · -2.33) |
| Wide | follow | mfi-14-20@m15 | 4 | 0 (0 %) | 34 | 26 % | 0.76 | -8.77 | tp0.8 sl0.8 tr0 h32 ax-geo4 axis (10 · 0.85 · -1.22) |
| Wide | ribbon | ema-slope@m15c | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -18.48 | – |
| Wide | magnet | bb-bounce-50-2@m1c | 12 | 0 (0 %) | 96 | 26 % | 0.43 | -29.71 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (8 · 0.63 · -1.61) |
| Wide | magnet | z-50-2@m1c | 12 | 0 (0 %) | 96 | 26 % | 0.43 | -29.71 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (8 · 0.63 · -1.61) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 226 | 86 % | 3.90 | 476.81 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 27 (90 %) | 234 | 84 % | 2.53 | 380.73 | tp5 sl15 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-obv-m@m15 | 30 | 28 (93 %) | 176 | 84 % | 3.60 | 329.76 | tp5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 24 (80 %) | 266 | 77 % | 1.81 | 326.82 | tp5 sl15 tr3 h96 (7 · ∞ (no loss) · 29.63) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 28 (93 %) | 116 | 91 % | 10.77 | 313.02 | tp4 sl12 tr1.6 h96 (6 · ∞ (no loss) · 13.07) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 24 (80 %) | 176 | 74 % | 1.89 | 242.39 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 26.96) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 29 | 26 (90 %) | 91 | 92 % | 8.63 | 211.95 | tp3 sl9 tr1.2 h96 (6 · ∞ (no loss) · 7.27) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 24 (80 %) | 254 | 78 % | 1.50 | 186.85 | tp8 sl24 tr3.2 h96 (6 · ∞ (no loss) · 18.97) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 20 (67 %) | 191 | 79 % | 1.57 | 167.56 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 14.25) |
| Signals | follow | sig-r-vol-regime-s@m15 | 26 | 26 (100 %) | 49 | 90 % | 11.91 | 154.44 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 | – |
| Signals | follow | sig-ichimoku-m@m15 | 28 | 27 (96 %) | 51 | 90 % | 10.88 | 128.27 | – |
| Signals | follow | sig-mfi-m@m15 | 30 | 29 (97 %) | 51 | 92 % | 8.11 | 117.68 | – |
| Signals | follow | sig-act-burst-m@m15 | 28 | 21 (75 %) | 110 | 79 % | 1.89 | 112.28 | tp4 sl12 tr2.4 h96 (5 · 64.03 · 12.61) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 16 (53 %) | 245 | 70 % | 1.22 | 110.62 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 26.24) |
| Signals | follow | sig-s2-range-break-s@m15 | 19 | 18 (95 %) | 25 | 96 % | 147.33 | 85.12 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 24 | 23 (96 %) | 44 | 93 % | 6.95 | 82.34 | – |
| Signals | follow | sig-supertrend-m@m15 | 24 | 23 (96 %) | 44 | 93 % | 6.95 | 82.34 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 20 (67 %) | 267 | 72 % | 1.15 | 74.84 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 17.97) |
| Signals | follow | sig-trix-s@m15 | 25 | 16 (64 %) | 89 | 70 % | 1.57 | 60.80 | tp3 sl9 tr1.2 h96 (7 · 12.13 · 6.45) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 16 (53 %) | 253 | 70 % | 1.12 | 58.03 | tp5 sl7.5 tr0 h96 (6 · 3.12 · 16.30) |
| Signals | follow | sig-r-vol-regime-m@m15 | 16 | 12 (75 %) | 20 | 80 % | 3.78 | 55.75 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 24 | 21 (88 %) | 29 | 90 % | 4.22 | 55.45 | – |
| Signals | follow | sig-atr-break-m@m15 | 26 | 18 (69 %) | 92 | 76 % | 1.45 | 54.31 | tp2.5 sl3.75 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-ema-cross-m@m15 | 21 | 18 (86 %) | 42 | 88 % | 3.04 | 53.44 | – |
| Signals | follow | sig-supertrend-s@m15 | 29 | 17 (59 %) | 188 | 76 % | 1.14 | 48.63 | tp3 sl6 tr0 h96 (8 · 3.16 · 13.40) |
| Signals | follow | sig-keltner-s@m15 | 26 | 15 (58 %) | 96 | 65 % | 1.28 | 46.77 | tp3 sl9 tr1.8 h96 (5 · 34.73 · 8.16) |
| Signals | follow | sig-s2-active-hf-s@m15 | 27 | 17 (63 %) | 248 | 70 % | 1.09 | 42.30 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-vwap-m@m15 | 30 | 15 (50 %) | 110 | 71 % | 1.19 | 36.96 | tp3 sl9 tr1.2 h96 (7 · 58.33 · 7.48) |
| Signals | follow | sig-rsi-momentum-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-volume-break-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-r-connors-s@m15 | 13 | 13 (100 %) | 14 | 100 % | ∞ (no loss) | 33.34 | – |
| Signals | follow | sig-donchian-m@m15 | 23 | 17 (74 %) | 51 | 71 % | 1.40 | 30.99 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 27 | 19 (70 %) | 35 | 74 % | 1.58 | 30.97 | – |
| Signals | follow | sig-s2-active-hf-m@m15 | 27 | 14 (52 %) | 227 | 69 % | 1.06 | 25.44 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-keltner-m@m15 | 24 | 13 (54 %) | 60 | 75 % | 1.20 | 24.92 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 17 (57 %) | 265 | 74 % | 1.05 | 24.16 | tp6 sl18 tr2.4 h96 (9 · ∞ (no loss) · 15.30) |
| Signals | follow | sig-ema-slope-m@m15 | 29 | 12 (41 %) | 101 | 75 % | 1.07 | 16.34 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 16 (53 %) | 267 | 72 % | 0.99 | -4.11 | tp3 sl9 tr0 h96 (10 · 2.74 · 16.00) |
| Signals | follow | sig-hma-m@m15 | 30 | 13 (43 %) | 186 | 65 % | 0.95 | -17.29 | tp5 sl15 tr4 h96 (5 · 46.76 · 14.34) |
| Signals | follow | sig-s2-range-break-m@m15 | 26 | 15 (58 %) | 37 | 70 % | 0.73 | -26.35 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -49.85 | – |
| Signals | follow | sig-kama-m@m15 | 30 | 12 (40 %) | 291 | 71 % | 0.92 | -51.52 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 19.17) |
| Signals | follow | sig-st-slow-m@m15 | 20 | 9 (45 %) | 39 | 59 % | 0.41 | -52.59 | – |
| Signals | follow | sig-st-slow-s@m15 | 22 | 8 (36 %) | 30 | 43 % | 0.45 | -55.84 | – |
| Signals | follow | sig-squeeze-m@m15 | 18 | 10 (56 %) | 18 | 56 % | 0.14 | -63.66 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 12 (40 %) | 252 | 67 % | 0.87 | -64.86 | tp5 sl15 tr3 h96 (7 · 130.47 · 19.86) |
| Signals | follow | sig-s2-range-shift-s@m15 | 23 | 10 (43 %) | 96 | 56 % | 0.68 | -66.19 | tp3 sl9 tr1.8 h96 (5 · 0.59 · -3.94) |
| Signals | follow | sig-ema-pullback-s@m15 | 29 | 11 (38 %) | 238 | 71 % | 0.84 | -69.26 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 13.75) |
| Signals | follow | sig-s2-st-trail-s@m15 | 22 | 8 (36 %) | 25 | 32 % | 0.31 | -69.84 | – |
| Signals | follow | sig-r-fractal-m@m15 | 21 | 9 (43 %) | 39 | 59 % | 0.43 | -70.71 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 28 | 9 (32 %) | 80 | 68 % | 0.67 | -78.08 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-donchian-s@m15 | 30 | 10 (33 %) | 150 | 67 % | 0.80 | -80.47 | tp3 sl6 tr0 h96 (7 · 1.13 · 1.60) |
| Signals | follow | sig-ema-slope-s@m15 | 25 | 8 (32 %) | 123 | 69 % | 0.70 | -85.23 | tp4 sl6 tr0 h96 (5 · 2.45 · 9.00) |
| Signals | follow | sig-adx-m@m15 | 30 | 12 (40 %) | 103 | 60 % | 0.66 | -91.79 | tp5 sl15 tr2 h96 (5 · 19.45 · 4.97) |
| Signals | follow | sig-rsi-reversal-s@m15 | 21 | 8 (38 %) | 24 | 42 % | 0.11 | -99.71 | – |
| Signals | follow | sig-r-inside-s@m15 | 11 | 0 (0 %) | 15 | 0 % | 0.00 | -106.75 | – |
| Signals | follow | sig-reclaim-s@m15 | 30 | 13 (43 %) | 302 | 72 % | 0.82 | -115.52 | tp3 sl6 tr0 h96 (13 · 1.51 · 9.40) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 28 | 10 (36 %) | 116 | 66 % | 0.64 | -115.78 | tp3 sl4.5 tr0 h96 (6 · 2.98 · 9.30) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 13 (43 %) | 142 | 58 % | 0.69 | -124.24 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 20.77) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 11 (37 %) | 191 | 65 % | 0.73 | -147.63 | tp3 sl6 tr0 h96 (9 · 1.58 · 7.20) |
| Signals | follow | sig-sar-s@m15 | 30 | 7 (23 %) | 252 | 65 % | 0.74 | -168.60 | tp5 sl15 tr0 h96 (5 · 1.26 · 4.00) |
| Signals | follow | sig-stoch-rsi-m@m15 | 29 | 7 (24 %) | 245 | 68 % | 0.69 | -170.99 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 11.37) |
| Signals | follow | sig-adx-s@m15 | 30 | 9 (30 %) | 170 | 65 % | 0.66 | -175.16 | tp3 sl6 tr0 h96 (7 · 1.13 · 1.60) |
| Signals | follow | sig-sar-m@m15 | 29 | 8 (28 %) | 245 | 65 % | 0.73 | -175.45 | tp2.5 sl3.75 tr0 h96 (18 · 1.16 · 3.90) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 5 (17 %) | 152 | 61 % | 0.61 | -176.10 | tp2.5 sl3.75 tr0 h96 (10 · 1.36 · 4.25) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 25 | 8 (32 %) | 73 | 47 % | 0.33 | -179.33 | tp3 sl9 tr1.2 h96 (5 · 0.22 · -7.52) |
| Signals | follow | sig-s2-block-stack-m@m15 | 24 | 4 (17 %) | 108 | 59 % | 0.51 | -179.74 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-vwap-s@m15 | 30 | 11 (37 %) | 215 | 66 % | 0.65 | -179.82 | tp5 sl15 tr2 h96 (9 · 49.06 · 6.00) |
| Signals | follow | sig-s2-block-scale-m@m15 | 29 | 11 (38 %) | 187 | 64 % | 0.59 | -202.31 | tp6 sl18 tr2.4 h96 (6 · 67.70 · 9.27) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 7 (23 %) | 250 | 63 % | 0.65 | -210.92 | tp8 sl24 tr3.2 h96 (5 · 8.55 · 5.09) |
| Signals | follow | sig-r-fractal-s@m15 | 24 | 5 (21 %) | 78 | 40 % | 0.23 | -218.58 | tp3 sl9 tr1.2 h96 (7 · 5.55 · 2.92) |
| Signals | follow | sig-r-connors-m@m15 | 27 | 5 (19 %) | 102 | 59 % | 0.42 | -219.84 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 8 (27 %) | 228 | 64 % | 0.66 | -227.80 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 10.32) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 2 (7 %) | 154 | 61 % | 0.61 | -228.71 | tp3 sl9 tr1.2 h96 (6 · 1.07 · 0.62) |
| Signals | follow | sig-s2-confluence-s@m15 | 29 | 5 (17 %) | 281 | 62 % | 0.67 | -228.82 | tp6 sl18 tr2.4 h96 (6 · 30.33 · 7.91) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 7 (23 %) | 158 | 62 % | 0.51 | -236.49 | tp3 sl4.5 tr0 h96 (7 · 0.79 · -2.90) |
| Signals | follow | sig-r-awesome-s@m15 | 26 | 5 (19 %) | 103 | 48 % | 0.34 | -251.43 | tp3 sl9 tr0 h96 (5 · 0.46 · -10.00) |
| Signals | follow | sig-squeeze-s@m15 | 27 | 1 (4 %) | 27 | 4 % | 0.00 | -270.03 | – |
| Signals | follow | sig-s2-block-scale-s@m15 | 29 | 8 (28 %) | 233 | 64 % | 0.56 | -274.17 | tp4 sl6 tr0 h96 (8 · 1.84 · 10.40) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 2 (7 %) | 262 | 62 % | 0.68 | -274.19 | tp6 sl18 tr2.4 h96 (6 · 1.47 · 8.49) |
| Signals | follow | sig-macd-cross-m@m15 | 28 | 5 (18 %) | 149 | 61 % | 0.45 | -278.63 | tp3 sl4.5 tr0 h96 (11 · 1.59 · 8.30) |
| Signals | follow | sig-macd-slow-m@m15 | 28 | 5 (18 %) | 131 | 57 % | 0.43 | -282.36 | tp2.5 sl5 tr0 h96 (7 · 2.65 · 8.60) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 8 (27 %) | 179 | 55 % | 0.48 | -284.61 | tp4 sl12 tr3.2 h96 (5 · 1.25 · 3.00) |
| Signals | follow | sig-macd-slow-s@m15 | 29 | 5 (17 %) | 219 | 63 % | 0.56 | -295.20 | tp4 sl6 tr0 h96 (11 · 1.07 · 1.80) |
| Signals | follow | sig-cci-m@m15 | 30 | 0 (0 %) | 179 | 58 % | 0.56 | -311.67 | tp4 sl8 tr0 h96 (6 · 0.93 · -1.20) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 7 (23 %) | 226 | 61 % | 0.58 | -319.05 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 15.50) |
| Signals | follow | sig-r-nr-break-m@m15 | 23 | 2 (9 %) | 109 | 43 % | 0.30 | -323.12 | tp3 sl9 tr1.2 h96 (11 · 0.87 · -1.36) |
| Signals | follow | sig-macd-cross-s@m15 | 29 | 4 (14 %) | 192 | 57 % | 0.51 | -328.71 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-macd-hist-s@m15 | 29 | 4 (14 %) | 192 | 57 % | 0.51 | -328.71 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 70 | 43 % | 0.20 | -333.88 | – |
| Signals | follow | sig-hma-s@m15 | 24 | 0 (0 %) | 181 | 55 % | 0.44 | -343.19 | tp3 sl4.5 tr0 h96 (16 · 0.99 · -0.20) |
| Signals | follow | sig-thrust-m@m15 | 28 | 2 (7 %) | 227 | 62 % | 0.46 | -343.51 | tp2.5 sl7.5 tr0 h96 (13 · 1.00 · -0.10) |
| Signals | follow | sig-s2-atr-break-m@m15 | 29 | 5 (17 %) | 182 | 54 % | 0.41 | -346.24 | tp4 sl12 tr2.4 h96 (5 · 0.73 · -3.37) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 8 (27 %) | 158 | 51 % | 0.39 | -351.08 | tp5 sl15 tr2 h96 (6 · 0.61 · -5.99) |
| Signals | follow | sig-rsi-mid-s@m15 | 28 | 6 (21 %) | 159 | 53 % | 0.33 | -355.44 | tp5 sl15 tr2 h96 (7 · 21.63 · 4.13) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 11 (37 %) | 131 | 44 % | 0.32 | -356.84 | tp2.5 sl7.5 tr0 h96 (6 · 0.30 · -16.20) |
| Signals | follow | sig-act-hf-m@m15 | 29 | 6 (21 %) | 191 | 52 % | 0.44 | -365.23 | tp3 sl6 tr0 h96 (10 · 0.68 · -8.00) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 56 | 34 % | 0.09 | -376.60 | – |
| Signals | follow | sig-cmf-s@m15 | 25 | 2 (8 %) | 136 | 49 % | 0.29 | -381.93 | tp3 sl9 tr1.8 h96 (10 · 0.79 · -3.85) |
| Signals | follow | sig-heikin-ashi-s@m15 | 28 | 2 (7 %) | 273 | 60 % | 0.56 | -383.49 | tp5 sl7.5 tr0 h96 (10 · 1.45 · 10.50) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 3 (10 %) | 85 | 41 % | 0.24 | -383.88 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-kama-s@m15 | 26 | 4 (15 %) | 240 | 58 % | 0.44 | -390.05 | tp5 sl15 tr2 h96 (8 · ∞ (no loss) · 13.91) |
| Signals | follow | sig-swing-s@m15 | 28 | 2 (7 %) | 189 | 56 % | 0.39 | -393.14 | tp2.5 sl3.75 tr0 h96 (15 · 0.87 · -3.00) |
| Signals | follow | sig-impulse-s@m15 | 29 | 3 (10 %) | 199 | 53 % | 0.40 | -409.02 | tp4 sl6 tr0 h96 (7 · 0.82 · -3.40) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 8 (27 %) | 311 | 58 % | 0.50 | -413.52 | tp6 sl18 tr2.4 h96 (12 · 2.56 · 9.33) |
| Signals | follow | sig-rsi-mid-m@m15 | 27 | 4 (15 %) | 152 | 40 % | 0.26 | -415.33 | tp4 sl12 tr2.4 h96 (5 · 0.42 · -7.16) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 7 (23 %) | 158 | 49 % | 0.35 | -428.18 | tp5 sl15 tr2 h96 (6 · 0.56 · -6.75) |
| Signals | follow | sig-cci-s@m15 | 29 | 2 (7 %) | 244 | 60 % | 0.48 | -428.59 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 14.06) |
| Signals | follow | sig-s2-atr-break-s@m15 | 28 | 1 (4 %) | 119 | 35 % | 0.22 | -444.53 | tp4 sl12 tr1.6 h96 (5 · 0.31 · -8.61) |
| Signals | follow | sig-ema-trend-s@m15 | 29 | 6 (21 %) | 238 | 58 % | 0.42 | -447.38 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 6.57) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 0 (0 %) | 209 | 53 % | 0.46 | -469.57 | tp6 sl18 tr2.4 h96 (5 · 0.93 · -1.32) |
| Signals | follow | sig-zscore-s@m15 | 30 | 0 (0 %) | 209 | 53 % | 0.46 | -469.57 | tp6 sl18 tr2.4 h96 (5 · 0.93 · -1.32) |
| Signals | follow | sig-heikin-ashi-m@m15 | 25 | 2 (8 %) | 185 | 49 % | 0.32 | -483.35 | tp3 sl4.5 tr0 h96 (14 · 1.07 · 1.70) |
| Signals | follow | sig-impulse-m@m15 | 28 | 2 (7 %) | 111 | 31 % | 0.17 | -495.40 | tp4 sl12 tr1.6 h96 (5 · 68.32 · 8.79) |
| Signals | follow | sig-cmf-m@m15 | 29 | 3 (10 %) | 135 | 41 % | 0.21 | -501.82 | tp3 sl9 tr1.2 h96 (9 · 0.48 · -4.91) |
| Signals | follow | sig-r-nr-break-s@m15 | 23 | 0 (0 %) | 127 | 38 % | 0.21 | -504.35 | tp2.5 sl3.75 tr0 h96 (13 · 0.93 · -1.35) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 265 | 55 % | 0.39 | -538.45 | tp5 sl15 tr2 h96 (10 · 0.55 · -6.95) |
| Signals | follow | sig-thrust-s@m15 | 27 | 0 (0 %) | 163 | 33 % | 0.16 | -755.91 | tp4 sl12 tr1.6 h96 (8 · 0.33 · -16.51) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 104 | 96 (92 %) | 286 | 95 % | 3.46 | 537.31 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 74 | 66 (89 %) | 122 | 93 % | 3.10 | 406.57 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 53 | 45 (85 %) | 85 | 87 % | 2.71 | 332.24 |
| Long | tp 5.600% | sl 1.00× | tr off | 90 | 24 (27 %) | 113 | 76 % | 2.97 | 307.80 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 104 | 82 (79 %) | 254 | 90 % | 1.74 | 299.11 |
| Long | tp 6.000% | sl 1.00× | tr off | 91 | 25 (27 %) | 122 | 70 % | 2.23 | 275.60 |
| Long | tp 5.200% | sl 1.00× | tr off | 75 | 18 (24 %) | 84 | 77 % | 3.17 | 222.40 |
| Long | tp 6.400% | sl 1.00× | tr off | 91 | 21 (23 %) | 83 | 72 % | 2.45 | 220.20 |
| Long | tp 4.800% | sl 1.00× | tr off | 71 | 18 (25 %) | 105 | 69 % | 2.01 | 166.20 |
| Long | tp 6.000% | sl 0.75× | tr off | 77 | 18 (23 %) | 90 | 62 % | 2.03 | 165.00 |
| Long | tp 6.000% | sl 1.00× | tr 0.50× | 70 | 16 (23 %) | 98 | 71 % | 1.84 | 140.94 |
| Short | tp 2.600% | sl 2.00× | tr off | 89 | 23 (26 %) | 148 | 80 % | 1.75 | 121.20 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 88 | 29 (33 %) | 135 | 79 % | 1.91 | 116.60 |
| Long | tp 6.400% | sl 0.75× | tr off | 76 | 16 (21 %) | 89 | 56 % | 1.59 | 115.00 |
| General | tp 4.400% | sl 1.00× | tr off | 53 | 15 (28 %) | 72 | 69 % | 2.08 | 108.80 |
| Short | tp 2.800% | sl 2.00× | tr off | 95 | 25 (26 %) | 153 | 76 % | 1.46 | 95.40 |
| Long | tp 5.600% | sl 1.00× | tr 0.50× | 66 | 16 (24 %) | 76 | 71 % | 1.89 | 92.55 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 86 | 55 (64 %) | 169 | 80 % | 1.14 | 83.84 |
| Short | tp 2.400% | sl 2.00× | tr off | 70 | 20 (29 %) | 80 | 84 % | 2.27 | 82.40 |
| Long | tp 6.400% | sl 1.00× | tr 0.50× | 68 | 10 (15 %) | 64 | 67 % | 1.68 | 80.77 |
| Long | tp 4.800% | sl 0.75× | tr off | 58 | 14 (24 %) | 85 | 55 % | 1.50 | 71.80 |
| Long | tp 5.600% | sl 0.75× | tr off | 82 | 16 (20 %) | 106 | 51 % | 1.27 | 62.80 |
| Long | tp 5.200% | sl 1.00× | tr 0.50× | 57 | 11 (19 %) | 72 | 72 % | 1.61 | 62.35 |
| Long | tp 4.800% | sl 1.00× | tr 0.50× | 59 | 18 (31 %) | 87 | 75 % | 1.55 | 60.17 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 86 | 30 (35 %) | 168 | 59 % | 1.51 | 59.34 |
| General | tp 4.400% | sl 1.00× | tr 0.75× | 52 | 9 (17 %) | 57 | 61 % | 1.39 | 36.19 |
| General | tp 4.400% | sl 0.75× | tr off | 50 | 9 (18 %) | 76 | 51 % | 1.26 | 34.30 |
| Wide | tp 0.800% | sl 1.00× | tr off | 108 | 35 (32 %) | 162 | 48 % | 1.29 | 33.93 |
| Long | tp 5.200% | sl 1.00× | tr 0.75× | 45 | 8 (18 %) | 19 | 74 % | 2.25 | 33.83 |
| Long | tp 6.400% | sl 1.00× | tr 0.75× | 69 | 8 (12 %) | 39 | 59 % | 1.31 | 30.39 |
| Long | tp 6.000% | sl 1.00× | tr 0.75× | 62 | 10 (16 %) | 47 | 64 % | 1.27 | 28.55 |
| Long | tp 5.200% | sl 0.75× | tr off | 81 | 17 (21 %) | 138 | 47 % | 1.09 | 25.70 |
| Wide | tp 1.130% | sl 1.00× | tr off | 33 | 9 (27 %) | 15 | 60 % | 2.70 | 19.80 |
| Long | tp 5.600% | sl 1.00× | tr 0.75× | 52 | 9 (17 %) | 48 | 60 % | 1.13 | 13.91 |
| General | tp 3.600% | sl 1.00× | tr 0.75× | 42 | 8 (19 %) | 57 | 58 % | 1.15 | 12.34 |
| Short | tp 2.800% | sl 1.50× | tr 0.75× | 51 | 11 (22 %) | 57 | 67 % | 1.12 | 9.34 |
| General | tp 4.000% | sl 1.00× | tr 0.75× | 36 | 3 (8 %) | 23 | 65 % | 1.18 | 5.91 |
| Long | tp 4.800% | sl 1.00× | tr 0.75× | 55 | 10 (18 %) | 47 | 55 % | 1.05 | 5.37 |
| Wide | tp 0.760% | sl 0.89× | tr off | 26 | 12 (46 %) | 34 | 53 % | 1.23 | 2.43 |
| Micro | tp 0.550% (net 0.350%) | sl 4.75× | tr off | 28 | 3 (11 %) | 12 | 75 % | 0.37 | -5.29 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 4.000% | sl 3.00× | tr off | 113 | 28 (25 %) | 449 | 62 % | 0.50 | -1045.80 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 118 | 32 (27 %) | 757 | 63 % | 0.54 | -1024.06 |
| Signals | tp 6.000% | sl 1.50× | tr off | 103 | 19 (18 %) | 315 | 40 % | 0.41 | -1023.00 |
| Signals | tp 3.000% | sl 3.00× | tr off | 118 | 31 (26 %) | 678 | 65 % | 0.56 | -981.60 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 118 | 35 (30 %) | 959 | 65 % | 0.56 | -968.21 |
| Signals | tp 3.000% | sl 1.50× | tr off | 122 | 31 (25 %) | 1153 | 52 % | 0.64 | -949.10 |
| Signals | tp 5.000% | sl 2.00× | tr off | 111 | 31 (28 %) | 386 | 52 % | 0.51 | -937.20 |
| Signals | tp 4.000% | sl 2.00× | tr off | 116 | 26 (22 %) | 600 | 55 % | 0.57 | -936.00 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 118 | 32 (27 %) | 1267 | 58 % | 0.54 | -935.89 |
| Signals | tp 2.500% | sl 2.00× | tr off | 122 | 32 (26 %) | 1223 | 60 % | 0.67 | -832.10 |
| Signals | tp 2.500% | sl 1.50× | tr off | 122 | 27 (22 %) | 1393 | 54 % | 0.68 | -827.35 |
| Signals | tp 6.000% | sl 2.00× | tr off | 93 | 18 (19 %) | 227 | 48 % | 0.44 | -807.40 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 115 | 37 (32 %) | 491 | 69 % | 0.57 | -785.56 |
| Signals | tp 5.000% | sl 1.50× | tr off | 115 | 32 (28 %) | 513 | 50 % | 0.62 | -750.10 |
| Signals | tp 2.500% | sl 3.00× | tr off | 119 | 36 (30 %) | 947 | 69 % | 0.67 | -731.90 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 75 (75) | 54280 | 25310 | 25310 | 0 | baseTarget 28970 |
| Micro | trailing | 75 (75) | 108560 | 50620 | 50620 | 0 | baseTarget 57940 |
| Short | normal | 244 (222) | 36072 | 15324 | 15324 | 0 | baseTarget 9876 · baseRange 10872 |
| Short | trailing | 244 (222) | 72144 | 30648 | 30648 | 0 | baseTarget 19752 · baseRange 21744 |
| General | normal | 244 (210) | 24048 | 9162 | 9162 | 0 | baseTarget 4110 · baseRange 10776 |
| General | trailing | 244 (210) | 16032 | 6108 | 6108 | 0 | baseTarget 2740 · baseRange 7184 |
| Long | normal | 244 (217) | 30060 | 12906 | 12906 | 0 | baseRange 11400 · baseTarget 5754 |
| Long | trailing | 244 (217) | 20040 | 8604 | 8604 | 0 | baseRange 7600 · baseTarget 3836 |
| Wide | axis | 319 (319) | 55710 | 55710 | 55710 | 0 | – |
| Wide | dca | 319 (319) | 4952 | 4952 | 4952 | 0 | – |
| Wide | dca-active | 319 (319) | 4952 | 4952 | 4952 | 0 | – |

Engine indications Base evaluated that built no set: 72 (act-burst-1.5, bb-bounce, bb-walk, break-atr, break-atr-0.9, break-atr-2, cci-14-100, cci-20-100, cci-20-200, dir-reclaim-50, dir-vwap-30, ema-slope-10, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-burst-3, mc-engulf-20, mc-mrsi2-10, mc-mturn-10, mc-mturn-5, mc-qrsi2-5, mc-rsi3-5, mc-rsi4-5, mc-rsi9-15, mc-rsimid-14, mc-rsit14-30, mc-rsit2-30, mc-rsit2-5, mc-rsit3-15, mc-rsit3-20, mc-rsit3-25, mc-rsit3-30, mc-rsit3-5, mc-rsit4-10, mc-rsit4-20, mc-rsit4-25, mc-rsit4-30, mc-rsit4-5, mc-rsit5-20, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.20 (336) | 0.30 (468) | 0.30 (474) | 0.27 (450) | 0.34 (660) |
| 1.14× | – | 0.10 (300) | – | – | – | – | – |
| 1.25× | – | 0.12 (294) | 0.22 (330) | 0.31 (426) | 0.32 (458) | 0.28 (434) | 0.33 (646) |
| 1.33× | 0.06 (234) | – | – | – | – | – | – |
| 1.5× | 0.08 (228) | 0.12 (282) | 0.25 (312) | 0.33 (422) | 0.30 (440) | 0.29 (426) | 0.36 (642) |
| 1.75× | 0.08 (216) | 0.12 (282) | 0.22 (308) | 0.30 (414) | 0.27 (436) | 0.26 (422) | 0.35 (630) |
| 2× | 0.07 (216) | 0.12 (280) | 0.20 (304) | 0.27 (410) | 0.24 (436) | 0.27 (388) | 0.36 (600) |
| 2.25× | 0.07 (214) | 0.11 (276) | 0.19 (296) | 0.25 (410) | 0.25 (408) | 0.25 (388) | 0.36 (600) |
| 2.5× | 0.06 (214) | 0.11 (268) | 0.18 (296) | 0.26 (388) | 0.25 (408) | 0.26 (388) | 0.39 (594) |
| 2.75× | 0.06 (214) | 0.10 (268) | 0.19 (274) | 0.24 (388) | 0.26 (408) | 0.27 (388) | 0.39 (594) |
| 3× | 0.05 (202) | 0.09 (268) | 0.18 (274) | 0.25 (388) | 0.29 (402) | 0.27 (388) | 0.37 (592) |
| 3.25× | 0.05 (202) | 0.10 (248) | 0.20 (274) | 0.27 (388) | 0.27 (402) | 0.26 (386) | 0.41 (580) |
| 3.5× | 0.05 (202) | 0.09 (248) | 0.19 (274) | 0.26 (388) | 0.27 (400) | 0.30 (374) | 0.43 (580) |
| 3.75× | 0.05 (182) | 0.11 (248) | 0.22 (274) | 0.25 (388) | 0.34 (400) | 0.30 (374) | 0.41 (576) |
| 4× | 0.05 (182) | 0.10 (248) | 0.21 (274) | 0.24 (386) | 0.38 (400) | 0.32 (370) | 0.44 (570) |
| 4.25× | 0.06 (182) | 0.12 (248) | 0.20 (274) | 0.32 (386) | 0.43 (400) | 0.30 (370) | 0.46 (558) |
| 4.5× | 0.06 (182) | 0.12 (248) | 0.19 (282) | 0.34 (386) | 0.41 (396) | 0.35 (358) | 0.47 (558) |
| 4.75× | 0.08 (182) | 0.11 (248) | 0.28 (282) | 0.36 (386) | 0.40 (396) | 0.34 (358) | 0.45 (558) |
| 5× | 0.07 (182) | 0.11 (256) | 0.30 (282) | 0.34 (382) | 0.50 (384) | 0.36 (358) | 0.55 (534) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | 0.00 (6) | ∞ (4) | ∞ (4) |
| 2× | – | – | – | 0.00 (6) | 0.17 (10) | ∞ (4) | ∞ (4) |
| 2.25× | – | – | 0.00 (6) | 0.14 (10) | 0.15 (10) | ∞ (4) | 0.52 (12) |
| 2.5× | – | 0.00 (2) | 0.08 (6) | 0.06 (8) | 0.14 (10) | 0.67 (8) | 0.47 (12) |
| 2.75× | – | 0.00 (2) | 0.00 (4) | 0.06 (8) | 0.10 (6) | 0.61 (8) | 0.24 (17) |
| 3× | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.00 (4) | 0.04 (12) | 0.38 (6) | 0.40 (6) |
| 3.25× | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.00 (8) | 0.02 (16) | 0.35 (6) | 0.14 (7) |
| 3.5× | 0.00 (2) | 0.00 (2) | 0.00 (8) | 0.07 (15) | 0.02 (16) | ∞ (1) | 0.22 (9) |
| 3.75× | 0.00 (2) | 0.00 (2) | 0.12 (16) | 0.07 (18) | 0.02 (16) | 0.19 (9) | 0.41 (7) |
| 4× | 0.00 (2) | 0.00 (6) | 0.11 (16) | 0.06 (18) | 0.05 (24) | 0.18 (9) | 0.38 (7) |
| 4.25× | 0.00 (2) | 0.00 (8) | 0.11 (16) | 0.06 (18) | 0.07 (30) | 0.24 (11) | 0.42 (12) |
| 4.5× | 0.00 (4) | 0.04 (12) | 0.10 (16) | 0.07 (26) | 0.08 (32) | 0.23 (11) | 0.50 (15) |
| 4.75× | 0.00 (4) | 0.04 (12) | 0.10 (16) | 0.07 (26) | 0.09 (34) | 0.27 (16) | 0.48 (15) |
| 5× | 0.04 (10) | 0.04 (12) | 0.09 (24) | 0.08 (28) | 0.11 (34) | 0.26 (16) | 0.23 (44) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | 0.00 (6) | ∞ (4) | ∞ (6) |
| 2× | – | – | – | 0.00 (6) | 0.25 (12) | ∞ (4) | ∞ (6) |
| 2.25× | – | – | 0.00 (6) | 0.21 (12) | 0.15 (10) | ∞ (4) | ∞ (4) |
| 2.5× | – | 0.00 (2) | 0.08 (6) | 0.13 (10) | 0.14 (10) | ∞ (4) | ∞ (4) |
| 2.75× | – | 0.00 (2) | 0.00 (4) | 0.12 (10) | 0.10 (6) | ∞ (4) | ∞ (4) |
| 3× | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.00 (4) | 0.04 (12) | ∞ (2) | ∞ (2) |
| 3.25× | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.00 (8) | 0.00 (10) | ∞ (2) | ∞ (1) |
| 3.5× | 0.00 (2) | 0.00 (2) | 0.00 (8) | 0.00 (8) | 0.00 (10) | ∞ (1) | ∞ (1) |
| 3.75× | 0.00 (2) | 0.00 (2) | 0.00 (8) | 0.00 (8) | 0.00 (10) | 0.04 (5) | ∞ (5) |
| 4× | 0.00 (2) | 0.00 (6) | 0.00 (8) | 0.00 (8) | 0.02 (16) | 0.04 (5) | ∞ (5) |
| 4.25× | 0.00 (2) | 0.00 (6) | 0.00 (8) | 0.03 (10) | 0.02 (16) | 0.14 (8) | ∞ (5) |
| 4.5× | 0.00 (4) | 0.00 (6) | 0.00 (8) | 0.02 (14) | 0.03 (18) | 0.13 (8) | ∞ (5) |
| 4.75× | 0.00 (4) | 0.00 (6) | 0.02 (10) | 0.02 (14) | 0.03 (18) | 0.12 (8) | ∞ (5) |
| 5× | 0.00 (4) | 0.00 (6) | 0.02 (14) | 0.03 (16) | 0.03 (18) | 0.12 (8) | 0.87 (8) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.64 (6337) | 0.65 (7308) | 0.70 (7486) | 0.70 (7894) | 0.72 (7522) | 0.72 (8705) |
| 1.5× | 0.73 (5761) | 0.71 (6532) | 0.72 (6629) | 0.74 (6689) | 0.76 (6370) | 0.86 (7212) |
| 2× | 0.77 (5234) | 0.74 (5746) | 0.78 (5970) | 0.87 (6090) | 0.90 (5953) | 0.94 (6683) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.29 (133) | 0.28 (222) | 0.40 (381) | 0.25 (360) | 0.26 (401) | 0.26 (470) |
| 1.5× | 0.32 (206) | 0.25 (316) | 0.42 (277) | 0.66 (332) | 0.68 (327) | 0.83 (289) |
| 2× | 0.35 (185) | 0.37 (221) | 0.79 (178) | 1.02 (348) | 1.00 (436) | 1.60 (456) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.18 (29) | 0.28 (31) | 0.33 (49) | 0.27 (68) | 0.17 (73) | 0.18 (77) |
| 1.5× | 0.26 (37) | 0.22 (43) | 0.25 (45) | 0.30 (54) | 0.34 (58) | 0.40 (63) |
| 2× | 0.47 (22) | 0.49 (26) | 0.27 (14) | 0.49 (22) | 0.59 (48) | 0.45 (77) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.88 (2446) | 0.86 (1912) | 0.91 (1992) | 1.14 (1992) |
| 0.75× | 0.92 (2138) | 0.96 (1662) | 0.90 (1758) | 1.06 (1736) |
| 1× | 0.85 (5815) | 0.87 (4405) | 0.76 (4423) | 1.01 (4468) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.60 (87) | 0.15 (48) | 0.23 (59) | 0.47 (19) |
| 0.75× | 0.47 (207) | 0.55 (103) | 0.42 (148) | 1.26 (76) |
| 1× | 0.43 (428) | 0.87 (318) | 0.71 (197) | 1.36 (229) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.15 (12) | 0.00 (5) | 0.00 (9) | 0.00 (2) |
| 0.75× | 0.19 (28) | 0.14 (19) | 0.08 (16) | 0.12 (11) |
| 1× | 0.35 (61) | 0.67 (26) | 0.26 (16) | 0.22 (33) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.11 (2123) | 1.02 (1910) | 1.03 (2031) | 1.21 (1605) | 1.15 (1902) |
| 0.75× | 1.09 (1739) | 1.04 (1559) | 1.16 (1599) | 1.22 (1330) | 1.24 (1495) |
| 1× | 0.98 (4459) | 0.93 (4084) | 0.88 (4061) | 1.08 (3097) | 0.98 (3690) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.25 (41) | 0.18 (22) | 0.30 (90) | 0.42 (16) | 0.73 (7) |
| 0.75× | 1.50 (85) | 1.09 (138) | 1.27 (106) | 2.03 (90) | 1.59 (89) |
| 1× | 1.61 (239) | 2.37 (175) | 2.13 (237) | 1.90 (267) | 1.90 (186) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (2) | 0.00 (4) | 0.00 (11) | 0.00 (5) | 0.00 (2) |
| 0.75× | 0.13 (10) | 0.12 (11) | 0.61 (6) | 1.23 (6) | 0.93 (7) |
| 1× | 0.31 (31) | 0.30 (19) | 0.59 (14) | 0.52 (9) | 0.30 (12) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.56 (11708) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.37 (443) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.66 (9357) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.40 (418) | 0.57 (387) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.34 (406) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.64 (358) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.68 (350) | – | – | – | – |
| 1× | – | – | – | 0.66 (99115) | – | – | – | 0.73 (42368) | 0.48 (3395) | – | 0.63 (1678) | – | 0.54 (3005) | 0.58 (2656) | 0.77 (1368) | 1.17 (1190) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.62 (420) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 1.23 (34) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 1.29 (162) | – | – | – | 2.70 (15) | – | – | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.00 (18) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 3.77 (24) | – | – | – | – | – | – | – | – | – | – | – | – |
