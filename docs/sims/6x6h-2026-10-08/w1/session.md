# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.34–$0.43 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T18:00 → 2026-10-08T00:00 UTC. Engine: Base 1286/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 364/19072 · PF 1.58 · Micro 153/5900 · PF 2.25 · Short 661/8176 · PF 1.54 · General 467/8176 · PF 1.55 · Long 571/8176 · PF 1.54 · Signals 126/126; Main 1235 pairs, 204702 tapes, Real seats: 8000 engine configs + 3780 signal configs (every config of the active signals), compute 291 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $19.74 (-1.32 %, closed orders) · equity at end $16.91 (open at end: 39 positions / 3662 orders, MTM -$2.82 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 0.73 (gross profit $ ÷ gross loss $ as sized) · PF unit 0.40 (every order at one unit: the engine's PF) · 27 positions / 943 orders (incl. 90 capped to $0) · WR 41.99 % · DDT (closed trades, $) 4.50 h · DDR – (net ≤ 0) · equity max drawdown $3.61 (17.73 %) · margin used max $14.12 · open avg 15.21 pos / 240.08 orders (peak 22 / 493)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 90 orders capped to $0, 758 scaled down (open at end: 288 capped, 3199 scaled) · binding: position cap 2417, gross cap 3966. **Without the caps:** balance $20.00 → $14.98 (-25.12 %) · PF $ 0.39 · equity at end -$6.37 · equity max drawdown $27.77 (136.51 %) · margin used max $144.53 · infeasible: margin exceeded equity for 286 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 467 | 1094  | 4.4 % | 1.568 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 467 | 1094 (+0) | 4.4 % | 1.568 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 467 | 1094 (+0) | 4.4 % | 1.568 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 435 | 958 (-136) | 3.8 % | 1.602 |
| closes ≥ 6 | 1.00 | 6 | 1 | 657 | 1468 (+374) | 5.9 % | 1.766 |
| closes ≥ 20 | 1.00 | 20 | 1 | 345 | 816 (-278) | 3.3 % | 1.469 |
| closes ≥ 30 | 1.00 | 30 | 1 | 250 | 632 (-462) | 2.5 % | 1.391 |
| DDR off | 1.00 | 12 | off | 1617 | 2694 (+1600) | 10.8 % | 1.154 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 836 | 1690 (+596) | 6.8 % | 1.373 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 160 | 502 (-592) | 2.0 % | 1.914 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1617 | 2694 (+1600) | 10.8 % | 1.154 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2044 | 3196 (+2102) | 12.8 % | 1.202 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 0 / 81 | 66 / 15 | 1.06 | 1.71 | 81 % | $0.01 | $20.01 | $19.65 | $19.39 | 4.66 % | 0.68 | $10.02 | 15 / 435 |
| 19:00 | 0 / 21 | 17 / 4 | 8.65 | 4.58 | 81 % | $0.14 | $20.16 | $18.97 | $18.42 | 9.44 % | 1.68 | $14.12 | 24 / 1044 |
| 20:00 | 0 / 84 | 46 / 38 | 0.29 | 0.68 | 55 % | -$0.10 | $20.06 | $18.28 | $18.21 | 10.44 % | 2.68 | $14.11 | 29 / 2012 |
| 21:00 | 0 / 179 | 142 / 37 | 2.51 | 3.47 | 79 % | $0.11 | $20.17 | $18.76 | $18.27 | 10.44 % | 3.68 | $14.12 | 31 / 2776 |
| 22:00 | 2 / 344 | 77 / 267 | 0.16 | 0.14 | 22 % | -$0.35 | $19.82 | $17.15 | $17.15 | 15.66 % | 4.68 | $14.12 | 36 / 3528 |
| 23:00 | 1 / 234 | 48 / 186 | 0.16 | 0.05 | 21 % | -$0.08 | $19.74 | $16.91 | $16.73 | 17.73 % | 5.68 | $13.87 | 39 / 3662 |

**Last hour (23:00):** open at end: 39 positions / 3662 orders, MTM -$2.82 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $16.91 = balance $19.74 + MTM -$2.82.

**Hours positive:** 3 of 6 full hours · flat 0 · negative 3

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 18:00 | – | – | 24 · 1.01 · $0.00 | 57 · 1.10 · $0.01 | – |
| 19:00 | – | 3 · ∞ (no loss) · $0.00 | 6 · 43.88 · $0.10 | 9 · ∞ (no loss) · $0.05 | 3 · 0.00 · -$0.02 |
| 20:00 | – | – | 11 · 55.82 · $0.03 | 41 · 0.03 · -$0.05 | 32 · 0.04 · -$0.09 |
| 21:00 | – | 3 · ∞ (no loss) · $0.00 | 160 · 3.10 · $0.13 | 12 · 0.03 · -$0.01 | 4 · 12.01 · $0.00 |
| 22:00 | – | 3 · 0.00 · -$0.02 | 225 · 0.28 · -$0.16 | 75 · 0.04 · -$0.07 | 41 · 0.00 · -$0.10 |
| 23:00 | 3 · 0.00 · -$0.00 | – | 133 · 0.31 · -$0.03 | 80 · 0.00 · -$0.02 | 18 · 0.00 · -$0.03 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 81 | 22 · 0.43 · 64 % · -$0.08 | 35 · ∞ (no loss) · 100 % · $0.09 | 6 · 0.09 · 17 % · -$0.10 | 18 · 123.17 · 89 % · $0.10 | – | 24 · 1.01 · 71 % · $0.00 |
| 19:00 | 21 | 8 · 0.89 · 63 % · -$0.00 | 7 · ∞ (no loss) · 100 % · $0.04 | 1 · 0.00 · 0 % · -$0.00 | 5 · ∞ (no loss) · 100 % · $0.10 | – | 6 · 43.88 · 83 % · $0.10 |
| 20:00 | 84 | 29 · 0.00 · 28 % · -$0.12 | 46 · 0.28 · 72 % · -$0.01 | 3 · – · 0 % · $0.00 | 6 · 59.39 · 83 % · $0.03 | – | 9 · 59.39 · 56 % · $0.03 |
| 21:00 | 179 | 15 · 72.99 · 60 % · $0.01 | 30 · 1.34 · 40 % · $0.01 | 91 · 2.04 · 88 % · $0.06 | 43 · 97.79 · 95 % · $0.04 | – | 134 · 2.66 · 90 % · $0.10 |
| 22:00 | 344 | 69 · 0.02 · 7 % · -$0.11 | 156 · 0.14 · 12 % · -$0.10 | 69 · 0.12 · 12 % · -$0.10 | 50 · 0.46 · 92 % · -$0.04 | – | 119 · 0.25 · 45 % · -$0.14 |
| 23:00 | 234 | 51 · 0.00 · 0 % · -$0.02 | 114 · 0.00 · 15 % · -$0.05 | 36 · 0.12 · 17 % · -$0.02 | 33 · 3.02 · 76 % · $0.01 | – | 69 · 0.52 · 45 % · -$0.01 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1160 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (204702 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (11069); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 14914 · 1.32 | 2823 · 1.23 | 4569 · 1.73 | 1229 · 7.51 | 81 · 1.71 | 22 · 0.77 | 35 · ∞ (no loss) | – | 24 · 1.01 |
| 19:00 | 16605 · 1.36 | 3007 · 1.55 | 4563 · 2.10 | 725 · 2.00 | 21 · 4.58 | 8 · 0.97 | 7 · ∞ (no loss) | – | 6 · 6.58 |
| 20:00 | 27028 · 0.35 | 5396 · 0.50 | 7160 · 0.48 | 979 · 0.95 | 84 · 0.68 | 29 · 0.27 | 46 · 1.25 | – | 9 · 0.68 |
| 21:00 | 31534 · 0.60 | 7869 · 0.90 | 9314 · 0.59 | 1577 · 1.36 | 179 · 3.47 | 15 · 1.59 | 30 · 0.27 | – | 134 · 6.79 |
| 22:00 | 42399 · 0.45 | 9897 · 0.46 | 15486 · 0.53 | 2569 · 0.28 | 344 · 0.14 | 69 · 0.05 | 156 · 0.08 | – | 119 · 0.27 |
| 23:00 | 36509 · 0.42 | 7459 · 0.54 | 11363 · 0.39 | 1442 · 0.52 | 234 · 0.05 | 51 · 0.00 | 114 · 0.01 | – | 69 · 0.14 |
| **total** | **168989 · 0.56** | **36451 · 0.66** | **52455 · 0.61** | **8521 · 0.90** | **943 · 0.40** | **194 · 0.15** | **388 · 0.21** | **–** | **361 · 0.83** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 194 | 41 / 153 | 0.21 | 0.15 | -$0.32 | 21.13 % | 6.00 |
| Trailing | 388 | 122 / 266 | 0.92 | 0.21 | -$0.02 | 31.44 % | 4.50 |
| Signal · Normal | 206 | 95 / 111 | 0.47 | 0.45 | -$0.16 | 46.12 % | 6.00 |
| Signal · Trailing | 155 | 138 / 17 | 3.97 | 4.33 | $0.24 | 89.03 % | 1.50 |
| total | 943 | 396 / 547 | 0.73 | 0.40 | -$0.26 | 41.99 % | 4.50 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 361 | 233 / 128 | 1.19 | 0.83 | $0.07 | 64.54 % | 1.50 |
| of which Engine (no signals) | 582 | 163 / 419 | 0.44 | 0.19 | -$0.34 | 28.01 % | 4.50 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 3 | 0.00 | 0.00 | -$0.00 |
| 5m+ | 9 | 0.22 | 0.33 | -$0.02 |
| 15m | 559 | 1.15 | 0.47 | $0.06 |
| 15m+ | 274 | 0.73 | 0.31 | -$0.08 |
| 30m | 98 | 0.02 | 0.20 | -$0.23 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 12 | 6 / 6 | 0.22 | 0.31 | -$0.02 | 50.00 % | 2.50 |
| Short | 509 | 148 / 361 | 0.64 | 0.20 | -$0.15 | 29.08 % | 2.25 |
| General | 44 | 6 / 38 | 0.00 | 0.13 | -$0.14 | 13.64 % | 5.50 |
| Long | 17 | 3 / 14 | 0.00 | 0.01 | -$0.04 | 17.65 % | 5.50 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 361 | 233 / 128 | 1.19 | 0.83 | $0.07 | 64.54 % | 1.50 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 19921 | sig:confirm 10173 · sig:signalPf 4556 · sig:duplicate 3670 · sig:signalCluster 1080 · sig:signalSide 442 |
| Short | 4675 | lastN 3118 · symPf 903 · engineSide 492 · duplicate 162 |
| Long | 1002 | lastN 691 · symPf 188 · engineSide 97 · duplicate 26 |
| Micro | 768 | lastN 418 · engineSide 234 · crowd 116 |
| General | 743 | lastN 548 · symPf 101 · engineSide 88 · duplicate 6 |
| Wide | 534 | engineSide 214 · symPf 185 · lastN 135 |

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
| Micro | 2.25 | 0.31 | 0.14 | 0.22 | 0.69 | 12 |
| Short | 1.54 | 0.20 | 0.13 | 0.64 | 3.23 | 509 |
| General | 1.55 | 0.13 | 0.08 | 0.00 | 0.00 | 44 |
| Long | 1.54 | 0.01 | 0.01 | 0.00 | 0.03 | 17 |
| Wide | 1.58 | – | – | – | – | 0 |
| Signals | – | 0.83 | – | 1.19 | 1.44 | 361 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (9076 of 167801 evaluated, 200922 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3342 units active at the run start, 3789 over the run, 1993 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 927 | 26 (3 %) | 315 | 63 % | 0.27 | -180.11 |
| Micro | trailing | 1224 | 18 (1 %) | 420 | 49 % | 0.19 | -291.11 |
| Short | normal | 1209 | 74 (6 %) | 499 | 37 % | 0.37 | -671.50 |
| Short | trailing | 3009 | 214 (7 %) | 1643 | 40 % | 0.30 | -1929.67 |
| General | normal | 526 | 10 (2 %) | 138 | 9 % | 0.11 | -327.40 |
| General | trailing | 506 | 7 (1 %) | 133 | 24 % | 0.08 | -337.48 |
| Long | normal | 830 | 9 (1 %) | 120 | 16 % | 0.23 | -316.60 |
| Long | trailing | 525 | 1 (0 %) | 61 | 34 % | 0.23 | -166.29 |
| Wide | axis | 320 | 33 (10 %) | 556 | 33 % | 0.83 | -45.54 |
| Signals | normal | 1002 | 582 (58 %) | 2530 | 66 % | 1.02 | 88.50 |
| Signals | trailing | 991 | 843 (85 %) | 2106 | 84 % | 3.04 | 2950.95 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 2151 | 44 (2 %) | 735 | 55 % | 0.23 | -471.22 |
| Short | active | 102 | 0 (0 %) | 28 | 0 % | 0.00 | -72.00 |
| Short | bollinger | 61 | 3 (5 %) | 15 | 73 % | 1.38 | 4.15 |
| Short | break | 507 | 81 (16 %) | 534 | 32 % | 0.19 | -875.86 |
| Short | channel | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | direction | 226 | 12 (5 %) | 41 | 59 % | 0.65 | -18.19 |
| Short | ema | 247 | 0 (0 %) | 139 | 0 % | 0.00 | -340.17 |
| Short | ichimoku | 51 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 274 | 51 (19 %) | 57 | 91 % | 4.30 | 72.69 |
| Short | move | 414 | 65 (16 %) | 132 | 58 % | 0.77 | -29.32 |
| Short | osc | 995 | 34 (3 %) | 866 | 44 % | 0.34 | -984.40 |
| Short | rsi | 633 | 0 (0 %) | 63 | 6 % | 0.01 | -209.66 |
| Short | sar | 11 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | smooth | 61 | 2 (3 %) | 3 | 100 % | ∞ (no loss) | 6.95 |
| Short | trend | 206 | 22 (11 %) | 188 | 50 % | 0.78 | -58.76 |
| Short | volume | 428 | 18 (4 %) | 76 | 37 % | 0.22 | -96.62 |
| General | active | 39 | 0 (0 %) | 12 | 0 % | 0.00 | -31.60 |
| General | bollinger | 2 | 0 (0 %) | 3 | 67 % | 0.24 | -2.88 |
| General | break | 69 | 1 (1 %) | 75 | 9 % | 0.03 | -227.14 |
| General | channel | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 64 | 4 (6 %) | 4 | 100 % | ∞ (no loss) | 1.00 |
| General | ema | 47 | 0 (0 %) | 23 | 0 % | 0.00 | -75.40 |
| General | ichimoku | 25 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | macd | 61 | 7 (11 %) | 8 | 100 % | ∞ (no loss) | 26.40 |
| General | move | 78 | 2 (3 %) | 5 | 40 % | 0.11 | -7.67 |
| General | osc | 167 | 0 (0 %) | 67 | 10 % | 0.02 | -186.01 |
| General | rsi | 250 | 0 (0 %) | 21 | 0 % | 0.00 | -78.90 |
| General | sar | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 24 | 3 (13 %) | 3 | 100 % | ∞ (no loss) | 12.20 |
| General | trend | 59 | 0 (0 %) | 36 | 31 % | 0.26 | -54.89 |
| General | volume | 145 | 0 (0 %) | 14 | 0 % | 0.00 | -40.00 |
| Long | active | 7 | 0 (0 %) | 2 | 0 % | 0.00 | -5.20 |
| Long | bollinger | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 96 | 0 (0 %) | 64 | 23 % | 0.31 | -161.93 |
| Long | channel | 5 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 106 | 1 (1 %) | 2 | 50 % | 0.11 | -0.22 |
| Long | ema | 20 | 0 (0 %) | 16 | 0 % | 0.00 | -54.20 |
| Long | ichimoku | 19 | 0 (0 %) | 2 | 0 % | 0.00 | -7.60 |
| Long | macd | 77 | 1 (1 %) | 2 | 100 % | ∞ (no loss) | 9.20 |
| Long | move | 153 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | osc | 232 | 0 (0 %) | 30 | 7 % | 0.00 | -140.42 |
| Long | rsi | 238 | 0 (0 %) | 16 | 0 % | 0.00 | -69.50 |
| Long | sar | 5 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 44 | 6 (14 %) | 6 | 100 % | ∞ (no loss) | 30.00 |
| Long | trend | 99 | 2 (2 %) | 38 | 37 % | 0.31 | -68.82 |
| Long | volume | 248 | 0 (0 %) | 3 | 0 % | 0.00 | -14.20 |
| Wide | active | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | bollinger | 37 | 9 (24 %) | 207 | 39 % | 0.91 | -7.79 |
| Wide | break | 15 | 0 (0 %) | 24 | 0 % | 0.00 | -14.89 |
| Wide | direction | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | macd | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 73 | 9 (12 %) | 57 | 26 % | 0.81 | -5.81 |
| Wide | osc | 104 | 9 (9 %) | 219 | 38 % | 0.89 | -11.65 |
| Wide | rsi | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | sar | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | smooth | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 6 | 6 (100 %) | 12 | 50 % | 5.69 | 26.24 |
| Wide | volume | 37 | 0 (0 %) | 37 | 0 % | 0.00 | -31.64 |
| Signals | signal:act-burst | 25 | 24 (96 %) | 50 | 94 % | 28.33 | 157.35 |
| Signals | signal:act-hf | 56 | 47 (84 %) | 141 | 89 % | 4.38 | 328.28 |
| Signals | signal:adx | 17 | 11 (65 %) | 26 | 73 % | 1.78 | 20.62 |
| Signals | signal:atr-break | 55 | 44 (80 %) | 121 | 84 % | 3.42 | 277.60 |
| Signals | signal:bollinger | 47 | 26 (55 %) | 129 | 58 % | 0.67 | -105.84 |
| Signals | signal:cci | 40 | 32 (80 %) | 108 | 77 % | 2.27 | 123.64 |
| Signals | signal:cmf | 33 | 18 (55 %) | 84 | 69 % | 1.01 | 1.08 |
| Signals | signal:donchian | 30 | 4 (13 %) | 76 | 43 % | 0.24 | -208.97 |
| Signals | signal:ema-cross | 35 | 27 (77 %) | 52 | 79 % | 2.06 | 43.09 |
| Signals | signal:ema-cross-fast | 26 | 22 (85 %) | 63 | 84 % | 3.14 | 70.11 |
| Signals | signal:ema-pullback | 33 | 32 (97 %) | 96 | 90 % | 12.84 | 179.77 |
| Signals | signal:ema-slope | 13 | 8 (62 %) | 27 | 67 % | 0.79 | -6.62 |
| Signals | signal:ema-trend | 33 | 10 (30 %) | 102 | 59 % | 0.41 | -178.92 |
| Signals | signal:heikin-ashi | 46 | 41 (89 %) | 123 | 81 % | 3.46 | 215.34 |
| Signals | signal:hma | 35 | 27 (77 %) | 75 | 76 % | 1.88 | 63.83 |
| Signals | signal:ichimoku | 42 | 41 (98 %) | 68 | 94 % | 345.39 | 190.41 |
| Signals | signal:impulse | 55 | 46 (84 %) | 80 | 74 % | 2.94 | 138.28 |
| Signals | signal:kama | 39 | 39 (100 %) | 129 | 91 % | 9.41 | 218.81 |
| Signals | signal:keltner | 60 | 56 (93 %) | 77 | 91 % | 17.05 | 246.64 |
| Signals | signal:macd-cross | 44 | 43 (98 %) | 94 | 91 % | 9.78 | 238.28 |
| Signals | signal:macd-hist | 51 | 50 (98 %) | 204 | 91 % | 8.78 | 508.06 |
| Signals | signal:macd-slow | 39 | 38 (97 %) | 63 | 95 % | 34.72 | 140.69 |
| Signals | signal:mfi | 16 | 14 (88 %) | 19 | 84 % | 2.46 | 18.43 |
| Signals | signal:obv | 36 | 35 (97 %) | 113 | 88 % | 6.66 | 231.25 |
| Signals | signal:r-awesome | 29 | 28 (97 %) | 46 | 96 % | 10.34 | 122.77 |
| Signals | signal:r-connors | 8 | 4 (50 %) | 10 | 60 % | 0.22 | -7.80 |
| Signals | signal:r-fractal | 45 | 26 (58 %) | 66 | 68 % | 0.81 | -26.40 |
| Signals | signal:r-inside | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -27.70 |
| Signals | signal:r-linreg | 41 | 30 (73 %) | 100 | 78 % | 1.81 | 78.05 |
| Signals | signal:r-nr-break | 18 | 18 (100 %) | 22 | 100 % | ∞ (no loss) | 59.65 |
| Signals | signal:r-vol-regime | 22 | 20 (91 %) | 31 | 84 % | 6.23 | 74.04 |
| Signals | signal:reclaim | 48 | 29 (60 %) | 131 | 73 % | 0.73 | -73.49 |
| Signals | signal:rsi-mid | 41 | 24 (59 %) | 77 | 57 % | 0.77 | -40.44 |
| Signals | signal:rsi-reversal | 12 | 1 (8 %) | 12 | 8 % | 0.00 | -63.68 |
| Signals | signal:s2-active-hf | 58 | 30 (52 %) | 172 | 63 % | 0.91 | -32.98 |
| Signals | signal:s2-adx-gate | 26 | 25 (96 %) | 58 | 95 % | 30.06 | 117.66 |
| Signals | signal:s2-atr-break | 57 | 37 (65 %) | 124 | 72 % | 1.37 | 80.05 |
| Signals | signal:s2-bb-bounce | 47 | 22 (47 %) | 109 | 53 % | 0.46 | -187.88 |
| Signals | signal:s2-block-scale | 21 | 12 (57 %) | 50 | 60 % | 0.72 | -32.06 |
| Signals | signal:s2-block-stack | 43 | 43 (100 %) | 63 | 95 % | 13.97 | 179.70 |
| Signals | signal:s2-confluence | 48 | 27 (56 %) | 151 | 67 % | 0.86 | -35.53 |
| Signals | signal:s2-ema-cross | 14 | 13 (93 %) | 14 | 93 % | 122.43 | 26.33 |
| Signals | signal:s2-range-shift | 37 | 23 (62 %) | 68 | 63 % | 0.89 | -16.83 |
| Signals | signal:s2-rsi-revert | 38 | 17 (45 %) | 85 | 54 % | 0.61 | -90.75 |
| Signals | signal:s2-st-trail | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -27.70 |
| Signals | signal:s2-stoch-swing | 47 | 14 (30 %) | 122 | 43 % | 0.31 | -326.08 |
| Signals | signal:s2-vol-break | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.17 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 44 | 33 (75 %) | 127 | 84 % | 2.59 | 181.66 |
| Signals | signal:st-slow | 23 | 7 (30 %) | 26 | 27 % | 0.08 | -102.13 |
| Signals | signal:stoch-rsi | 28 | 20 (71 %) | 103 | 72 % | 1.20 | 25.18 |
| Signals | signal:supertrend | 33 | 29 (88 %) | 47 | 91 % | 9.79 | 127.01 |
| Signals | signal:swing | 58 | 34 (59 %) | 153 | 70 % | 1.30 | 79.71 |
| Signals | signal:thrust | 31 | 30 (97 %) | 88 | 88 % | 9.37 | 175.15 |
| Signals | signal:trix | 22 | 14 (64 %) | 45 | 69 % | 1.17 | 7.86 |
| Signals | signal:vwap | 35 | 31 (89 %) | 94 | 82 % | 2.60 | 72.88 |
| Signals | signal:williams-r | 44 | 17 (39 %) | 187 | 62 % | 0.71 | -128.92 |
| Signals | signal:zscore | 53 | 32 (60 %) | 119 | 63 % | 0.83 | -45.04 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 48582 | 40794 | 2151 | 0.81 | 4.00 | 78.75–163.33 (median 163.33) | 7460 | 20028 | 841 | 5615 | 2686 | 442 | 1416 | 0 | 155 | 0 | 0 | 0 | 7788 |  |
| Short | 48574 | 41986 | 4218 | 1.35 | 2.20 | 163.33–163.33 (median 163.33) | 3579 | 6252 | 1613 | 8541 | 4229 | 3050 | 9900 | 71 | 528 | 5 | 0 | 0 | 6588 |  |
| General | 15581 | 13141 | 1032 | 1.37 | 2.19 | 163.33–163.33 (median 163.33) | 1173 | 1576 | 443 | 2458 | 1537 | 929 | 3779 | 0 | 178 | 36 | 0 | 0 | 2440 |  |
| Long | 22730 | 19680 | 1355 | 1.32 | 2.19 | 163.33–163.33 (median 163.33) | 1458 | 3342 | 941 | 4296 | 2076 | 978 | 4904 | 0 | 281 | 49 | 0 | 0 | 3050 |  |
| Wide | 65455 | 52200 | 320 | 0.63 | 2.35 | 20.42–163.33 (median 163.33) | 13320 | 32179 | 868 | 3481 | 811 | 255 | 723 | 0 | 192 | 51 | 0 | 9880 | 3375 |  |
| Signals | 3780 | – | 3342 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 3342 units (pair × symbol × direction) active at the run start, 3789 over the run; 1993 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 16182 | 1520 (9 %) | 7764 | 59 % | 0.29 | -3345.00 |
| Micro | trailing | 32400 | 2876 (9 %) | 15772 | 49 % | 0.28 | -6057.09 |
| Short | normal | 16186 | 1538 (10 %) | 12063 | 45 % | 0.53 | -9768.30 |
| Short | trailing | 32388 | 2891 (9 %) | 26436 | 45 % | 0.46 | -21242.50 |
| General | normal | 9331 | 445 (5 %) | 5380 | 22 % | 0.38 | -7001.90 |
| General | trailing | 6250 | 310 (5 %) | 2710 | 40 % | 0.42 | -3438.35 |
| Long | normal | 13621 | 376 (3 %) | 4675 | 22 % | 0.40 | -8399.10 |
| Long | trailing | 9109 | 263 (3 %) | 2183 | 34 % | 0.27 | -5908.29 |
| Wide | axis | 55575 | 4600 (8 %) | 71892 | 24 % | 0.44 | -28894.86 |
| Wide | dca | 4940 | 598 (12 %) | 4461 | 57 % | 0.35 | -5792.51 |
| Wide | dca-active | 4940 | 182 (4 %) | 3730 | 18 % | 0.18 | -3285.85 |
| Signals | normal | 1890 | 1199 (63 %) | 6569 | 80 % | 2.11 | 8586.45 |
| Signals | trailing | 1890 | 1394 (74 %) | 5354 | 89 % | 7.46 | 12081.08 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 2151 | 44 (2 %) | 735 | 55 % | 0.23 | -471.22 |
| Short | active | 102 | 0 (0 %) | 28 | 0 % | 0.00 | -72.00 |
| Short | bollinger | 61 | 3 (5 %) | 15 | 73 % | 1.38 | 4.15 |
| Short | break | 507 | 81 (16 %) | 534 | 32 % | 0.19 | -875.86 |
| Short | channel | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | direction | 226 | 12 (5 %) | 41 | 59 % | 0.65 | -18.19 |
| Short | ema | 247 | 0 (0 %) | 139 | 0 % | 0.00 | -340.17 |
| Short | ichimoku | 51 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 274 | 51 (19 %) | 57 | 91 % | 4.30 | 72.69 |
| Short | move | 414 | 65 (16 %) | 132 | 58 % | 0.77 | -29.32 |
| Short | osc | 995 | 34 (3 %) | 866 | 44 % | 0.34 | -984.40 |
| Short | rsi | 633 | 0 (0 %) | 63 | 6 % | 0.01 | -209.66 |
| Short | sar | 11 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | smooth | 61 | 2 (3 %) | 3 | 100 % | ∞ (no loss) | 6.95 |
| Short | trend | 206 | 22 (11 %) | 188 | 50 % | 0.78 | -58.76 |
| Short | volume | 428 | 18 (4 %) | 76 | 37 % | 0.22 | -96.62 |
| General | active | 39 | 0 (0 %) | 12 | 0 % | 0.00 | -31.60 |
| General | bollinger | 2 | 0 (0 %) | 3 | 67 % | 0.24 | -2.88 |
| General | break | 69 | 1 (1 %) | 75 | 9 % | 0.03 | -227.14 |
| General | channel | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 64 | 4 (6 %) | 4 | 100 % | ∞ (no loss) | 1.00 |
| General | ema | 47 | 0 (0 %) | 23 | 0 % | 0.00 | -75.40 |
| General | ichimoku | 25 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | macd | 61 | 7 (11 %) | 8 | 100 % | ∞ (no loss) | 26.40 |
| General | move | 78 | 2 (3 %) | 5 | 40 % | 0.11 | -7.67 |
| General | osc | 167 | 0 (0 %) | 67 | 10 % | 0.02 | -186.01 |
| General | rsi | 250 | 0 (0 %) | 21 | 0 % | 0.00 | -78.90 |
| General | sar | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 24 | 3 (13 %) | 3 | 100 % | ∞ (no loss) | 12.20 |
| General | trend | 59 | 0 (0 %) | 36 | 31 % | 0.26 | -54.89 |
| General | volume | 145 | 0 (0 %) | 14 | 0 % | 0.00 | -40.00 |
| Long | active | 7 | 0 (0 %) | 2 | 0 % | 0.00 | -5.20 |
| Long | bollinger | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 96 | 0 (0 %) | 64 | 23 % | 0.31 | -161.93 |
| Long | channel | 5 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 106 | 1 (1 %) | 2 | 50 % | 0.11 | -0.22 |
| Long | ema | 20 | 0 (0 %) | 16 | 0 % | 0.00 | -54.20 |
| Long | ichimoku | 19 | 0 (0 %) | 2 | 0 % | 0.00 | -7.60 |
| Long | macd | 77 | 1 (1 %) | 2 | 100 % | ∞ (no loss) | 9.20 |
| Long | move | 153 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | osc | 232 | 0 (0 %) | 30 | 7 % | 0.00 | -140.42 |
| Long | rsi | 238 | 0 (0 %) | 16 | 0 % | 0.00 | -69.50 |
| Long | sar | 5 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 44 | 6 (14 %) | 6 | 100 % | ∞ (no loss) | 30.00 |
| Long | trend | 99 | 2 (2 %) | 38 | 37 % | 0.31 | -68.82 |
| Long | volume | 248 | 0 (0 %) | 3 | 0 % | 0.00 | -14.20 |
| Wide | active | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | bollinger | 37 | 9 (24 %) | 207 | 39 % | 0.91 | -7.79 |
| Wide | break | 15 | 0 (0 %) | 24 | 0 % | 0.00 | -14.89 |
| Wide | direction | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | macd | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 73 | 9 (12 %) | 57 | 26 % | 0.81 | -5.81 |
| Wide | osc | 104 | 9 (9 %) | 219 | 38 % | 0.89 | -11.65 |
| Wide | rsi | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | sar | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | smooth | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 6 | 6 (100 %) | 12 | 50 % | 5.69 | 26.24 |
| Wide | volume | 37 | 0 (0 %) | 37 | 0 % | 0.00 | -31.64 |
| Signals | signal:act-burst | 25 | 24 (96 %) | 50 | 94 % | 28.33 | 157.35 |
| Signals | signal:act-hf | 56 | 47 (84 %) | 141 | 89 % | 4.38 | 328.28 |
| Signals | signal:adx | 17 | 11 (65 %) | 26 | 73 % | 1.78 | 20.62 |
| Signals | signal:atr-break | 55 | 44 (80 %) | 121 | 84 % | 3.42 | 277.60 |
| Signals | signal:bollinger | 47 | 26 (55 %) | 129 | 58 % | 0.67 | -105.84 |
| Signals | signal:cci | 40 | 32 (80 %) | 108 | 77 % | 2.27 | 123.64 |
| Signals | signal:cmf | 33 | 18 (55 %) | 84 | 69 % | 1.01 | 1.08 |
| Signals | signal:donchian | 30 | 4 (13 %) | 76 | 43 % | 0.24 | -208.97 |
| Signals | signal:ema-cross | 35 | 27 (77 %) | 52 | 79 % | 2.06 | 43.09 |
| Signals | signal:ema-cross-fast | 26 | 22 (85 %) | 63 | 84 % | 3.14 | 70.11 |
| Signals | signal:ema-pullback | 33 | 32 (97 %) | 96 | 90 % | 12.84 | 179.77 |
| Signals | signal:ema-slope | 13 | 8 (62 %) | 27 | 67 % | 0.79 | -6.62 |
| Signals | signal:ema-trend | 33 | 10 (30 %) | 102 | 59 % | 0.41 | -178.92 |
| Signals | signal:heikin-ashi | 46 | 41 (89 %) | 123 | 81 % | 3.46 | 215.34 |
| Signals | signal:hma | 35 | 27 (77 %) | 75 | 76 % | 1.88 | 63.83 |
| Signals | signal:ichimoku | 42 | 41 (98 %) | 68 | 94 % | 345.39 | 190.41 |
| Signals | signal:impulse | 55 | 46 (84 %) | 80 | 74 % | 2.94 | 138.28 |
| Signals | signal:kama | 39 | 39 (100 %) | 129 | 91 % | 9.41 | 218.81 |
| Signals | signal:keltner | 60 | 56 (93 %) | 77 | 91 % | 17.05 | 246.64 |
| Signals | signal:macd-cross | 44 | 43 (98 %) | 94 | 91 % | 9.78 | 238.28 |
| Signals | signal:macd-hist | 51 | 50 (98 %) | 204 | 91 % | 8.78 | 508.06 |
| Signals | signal:macd-slow | 39 | 38 (97 %) | 63 | 95 % | 34.72 | 140.69 |
| Signals | signal:mfi | 16 | 14 (88 %) | 19 | 84 % | 2.46 | 18.43 |
| Signals | signal:obv | 36 | 35 (97 %) | 113 | 88 % | 6.66 | 231.25 |
| Signals | signal:r-awesome | 29 | 28 (97 %) | 46 | 96 % | 10.34 | 122.77 |
| Signals | signal:r-connors | 8 | 4 (50 %) | 10 | 60 % | 0.22 | -7.80 |
| Signals | signal:r-fractal | 45 | 26 (58 %) | 66 | 68 % | 0.81 | -26.40 |
| Signals | signal:r-inside | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -27.70 |
| Signals | signal:r-linreg | 41 | 30 (73 %) | 100 | 78 % | 1.81 | 78.05 |
| Signals | signal:r-nr-break | 18 | 18 (100 %) | 22 | 100 % | ∞ (no loss) | 59.65 |
| Signals | signal:r-vol-regime | 22 | 20 (91 %) | 31 | 84 % | 6.23 | 74.04 |
| Signals | signal:reclaim | 48 | 29 (60 %) | 131 | 73 % | 0.73 | -73.49 |
| Signals | signal:rsi-mid | 41 | 24 (59 %) | 77 | 57 % | 0.77 | -40.44 |
| Signals | signal:rsi-reversal | 12 | 1 (8 %) | 12 | 8 % | 0.00 | -63.68 |
| Signals | signal:s2-active-hf | 58 | 30 (52 %) | 172 | 63 % | 0.91 | -32.98 |
| Signals | signal:s2-adx-gate | 26 | 25 (96 %) | 58 | 95 % | 30.06 | 117.66 |
| Signals | signal:s2-atr-break | 57 | 37 (65 %) | 124 | 72 % | 1.37 | 80.05 |
| Signals | signal:s2-bb-bounce | 47 | 22 (47 %) | 109 | 53 % | 0.46 | -187.88 |
| Signals | signal:s2-block-scale | 21 | 12 (57 %) | 50 | 60 % | 0.72 | -32.06 |
| Signals | signal:s2-block-stack | 43 | 43 (100 %) | 63 | 95 % | 13.97 | 179.70 |
| Signals | signal:s2-confluence | 48 | 27 (56 %) | 151 | 67 % | 0.86 | -35.53 |
| Signals | signal:s2-ema-cross | 14 | 13 (93 %) | 14 | 93 % | 122.43 | 26.33 |
| Signals | signal:s2-range-shift | 37 | 23 (62 %) | 68 | 63 % | 0.89 | -16.83 |
| Signals | signal:s2-rsi-revert | 38 | 17 (45 %) | 85 | 54 % | 0.61 | -90.75 |
| Signals | signal:s2-st-trail | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -27.70 |
| Signals | signal:s2-stoch-swing | 47 | 14 (30 %) | 122 | 43 % | 0.31 | -326.08 |
| Signals | signal:s2-vol-break | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.17 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 44 | 33 (75 %) | 127 | 84 % | 2.59 | 181.66 |
| Signals | signal:st-slow | 23 | 7 (30 %) | 26 | 27 % | 0.08 | -102.13 |
| Signals | signal:stoch-rsi | 28 | 20 (71 %) | 103 | 72 % | 1.20 | 25.18 |
| Signals | signal:supertrend | 33 | 29 (88 %) | 47 | 91 % | 9.79 | 127.01 |
| Signals | signal:swing | 58 | 34 (59 %) | 153 | 70 % | 1.30 | 79.71 |
| Signals | signal:thrust | 31 | 30 (97 %) | 88 | 88 % | 9.37 | 175.15 |
| Signals | signal:trix | 22 | 14 (64 %) | 45 | 69 % | 1.17 | 7.86 |
| Signals | signal:vwap | 35 | 31 (89 %) | 94 | 82 % | 2.60 | 72.88 |
| Signals | signal:williams-r | 44 | 17 (39 %) | 187 | 62 % | 0.71 | -128.92 |
| Signals | signal:zscore | 53 | 32 (60 %) | 119 | 63 % | 0.83 | -45.04 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Micro | 1.25 | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Micro | 1.35 | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Micro | 1.5 | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | 1.1 | 1713 | 228 (13 %) | 1913 | 39 % | 0.31 | -2355.40 |
| Short | 1.25 | 1585 | 212 (13 %) | 1722 | 39 % | 0.31 | -2130.78 |
| Short | 1.35 | 1458 | 199 (14 %) | 1551 | 39 % | 0.31 | -1910.89 |
| Short | 1.5 | 1239 | 167 (13 %) | 1253 | 38 % | 0.31 | -1529.82 |
| Short | 1.75 | 795 | 97 (12 %) | 765 | 39 % | 0.33 | -866.13 |
| Short | 2 | 505 | 57 (11 %) | 472 | 39 % | 0.32 | -536.18 |
| General | 1.1 | 366 | 10 (3 %) | 206 | 15 % | 0.07 | -526.51 |
| General | 1.25 | 330 | 10 (3 %) | 169 | 15 % | 0.07 | -429.41 |
| General | 1.35 | 300 | 7 (2 %) | 145 | 14 % | 0.06 | -369.41 |
| General | 1.5 | 250 | 5 (2 %) | 111 | 17 % | 0.08 | -267.81 |
| General | 1.75 | 152 | 4 (3 %) | 53 | 25 % | 0.14 | -102.82 |
| General | 2 | 73 | 2 (3 %) | 20 | 30 % | 0.13 | -38.29 |
| Long | 1.1 | 398 | 7 (2 %) | 133 | 23 % | 0.24 | -355.48 |
| Long | 1.25 | 351 | 2 (1 %) | 107 | 20 % | 0.18 | -307.31 |
| Long | 1.35 | 316 | 0 (0 %) | 85 | 14 % | 0.11 | -279.74 |
| Long | 1.5 | 260 | 0 (0 %) | 60 | 13 % | 0.10 | -202.29 |
| Long | 1.75 | 152 | 0 (0 %) | 37 | 19 % | 0.12 | -123.11 |
| Long | 2 | 70 | 0 (0 %) | 18 | 22 % | 0.03 | -68.78 |
| Wide | 1.1 | 76 | 18 (24 %) | 433 | 38 % | 0.86 | -27.69 |
| Wide | 1.25 | 76 | 18 (24 %) | 433 | 38 % | 0.86 | -27.69 |
| Wide | 1.35 | 76 | 18 (24 %) | 433 | 38 % | 0.86 | -27.69 |
| Wide | 1.5 | 73 | 18 (25 %) | 421 | 38 % | 0.87 | -23.83 |
| Wide | 1.75 | 19 | 0 (0 %) | 7 | 0 % | 0.00 | -8.25 |
| Wide | 2 | 9 | 0 (0 %) | 3 | 0 % | 0.00 | -4.04 |
| Signals | 1.1 | 442 | 324 (73 %) | 859 | 73 % | 1.25 | 317.02 |
| Signals | 1.25 | 285 | 210 (74 %) | 508 | 74 % | 1.29 | 205.52 |
| Signals | 1.35 | 219 | 167 (76 %) | 393 | 75 % | 1.47 | 222.21 |
| Signals | 1.5 | 152 | 112 (74 %) | 251 | 73 % | 1.18 | 65.90 |
| Signals | 1.75 | 79 | 61 (77 %) | 123 | 72 % | 1.10 | 17.68 |
| Signals | 2 | 41 | 36 (88 %) | 67 | 79 % | 1.99 | 55.43 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | sandwich | mc-lag-12@m5 | 26 | 26 (100 %) | 26 | 100 % | ∞ (no loss) | 9.69 | – |
| Micro | pulse | mc-lag-12@m5 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 3.00 | – |
| Micro | sweep | mc-z-20@m5c | 10 | 0 (0 %) | 30 | 67 % | 0.25 | -22.23 | – |
| Micro | follow | mc-macdh@m5c | 26 | 0 (0 %) | 91 | 43 % | 0.20 | -58.17 | – |
| Micro | sweep | mc-rsi3-10@m5c | 54 | 0 (0 %) | 54 | 0 % | 0.00 | -102.70 | – |
| Micro | revert | mc-tpull-13@m5c | 176 | 8 (5 %) | 522 | 59 % | 0.26 | -300.60 | – |
| Short | sweep | r-td@m30 | 52 | 48 (92 %) | 56 | 93 % | 7.65 | 58.50 | – |
| Short | revert | trend-ema-50-200@m30 | 14 | 9 (64 %) | 53 | 77 % | 1.65 | 33.83 | tp2.6 sl3.9 tr0 h32 sh (5 · 2.34 · 5.50) |
| Short | ribbon | macd-hist-19-39-9@m15c | 25 | 13 (52 %) | 13 | 100 % | ∞ (no loss) | 26.60 | – |
| Short | ribbon | macd-hist-19-39-9@m30 | 24 | 14 (58 %) | 14 | 100 % | ∞ (no loss) | 26.60 | – |
| Short | pivot | macd-hist-5-35-5@m30 | 52 | 14 (27 %) | 14 | 100 % | ∞ (no loss) | 23.29 | – |
| Short | revert | r-pdhl-m@m15c | 23 | 19 (83 %) | 63 | 78 % | 2.00 | 21.10 | – |
| Short | ribbon | dir-thrust@m30 | 12 | 12 (100 %) | 18 | 100 % | ∞ (no loss) | 17.67 | – |
| Short | ribbon | macd-cross-19-39-9@m30 | 22 | 9 (41 %) | 9 | 100 % | ∞ (no loss) | 16.20 | – |
| Short | clamp | r-zdist@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 15.13 | – |
| Short | revert | trend-ema-50-200@m15c | 18 | 11 (61 %) | 63 | 71 % | 1.17 | 14.73 | tp2.4 sl3.6 tr0 h64 sh (5 · 2.32 · 5.00) |
| Short | ribbon | trend-st-28-6@m15 | 2 | 2 (100 %) | 10 | 80 % | 2.20 | 10.22 | tp2.6 sl3.9 tr1.3 h96 sh (5 · 2.29 · 5.30) |
| Short | sweep | break-squeeze-120@m30 | 17 | 9 (53 %) | 9 | 100 % | ∞ (no loss) | 10.00 | – |
| Short | pivot | willr-28-90@m30 | 4 | 4 (100 %) | 12 | 33 % | 3.66 | 6.41 | – |
| Short | pivot | bb-bounce-50-2@m15c | 3 | 3 (100 %) | 15 | 73 % | 1.38 | 4.15 | tp2.2 sl3.3 tr1.1 h64 sh (5 · 1.40 · 1.41) |
| Short | pivot | z-50-2@m15c | 3 | 3 (100 %) | 15 | 73 % | 1.38 | 4.15 | tp2.2 sl3.3 tr1.1 h64 sh (5 · 1.40 · 1.41) |
| Short | pivot | cci-40-200@m15c | 1 | 1 (100 %) | 5 | 80 % | 1.14 | 0.63 | tp2.2 sl4.4 tr1.1 h64 sh (5 · 1.14 · 0.63) |
| Short | sweep | willr-14-90@m30 | 3 | 1 (33 %) | 8 | 75 % | 1.03 | 0.19 | – |
| Short | follow | r-valuearea-m@m15c | 25 | 5 (20 %) | 11 | 45 % | 0.58 | -0.11 | – |
| Short | revert | move-impulse-20-2.5@m15c | 1 | 0 (0 %) | 6 | 67 % | 0.75 | -1.42 | tp2.8 sl5.6 tr1.4 h96 sh (6 · 0.75 · -1.42) |
| Short | pivot | cci-20-200@m15c | 6 | 0 (0 %) | 18 | 67 % | 0.64 | -6.24 | – |
| Short | sweep | willr-7-90@m30 | 4 | 0 (0 %) | 8 | 38 % | 0.54 | -6.40 | – |
| Short | revert | r-pdhl-m@m30 | 14 | 2 (14 %) | 50 | 68 % | 0.91 | -6.46 | – |
| Short | ribbon | willr-14-90@m30 | 3 | 0 (0 %) | 7 | 57 % | 0.51 | -7.33 | – |
| Short | sweep | r-sweep@m15 | 77 | 9 (12 %) | 24 | 38 % | 0.08 | -9.09 | – |
| Short | sweep | willr-28-90@m30 | 14 | 5 (36 %) | 24 | 54 % | 0.68 | -9.23 | – |
| Short | ribbon | dir-vwap-120@m15 | 3 | 0 (0 %) | 8 | 38 % | 0.29 | -10.52 | – |
| Short | revert | r-chop-m@m15 | 16 | 8 (50 %) | 18 | 67 % | 0.32 | -12.02 | – |
| Short | pivot | mfi-14-20@m15c | 11 | 6 (55 %) | 16 | 44 % | 0.37 | -12.22 | – |
| Short | clamp | cci-20-200@m15c | 8 | 0 (0 %) | 20 | 60 % | 0.52 | -12.96 | – |
| Short | pivot | rsi-extreme@m15c | 2 | 0 (0 %) | 8 | 25 % | 0.05 | -13.63 | – |
| Short | revert | break-vol-2@m30 | 20 | 0 (0 %) | 6 | 0 % | 0.00 | -15.40 | – |
| Short | pivot | rsi-extreme@m15 | 2 | 0 (0 %) | 10 | 20 % | 0.05 | -16.72 | tp2 sl2 tr1 h64 sh (5 · 0.05 · -8.36) |
| Short | clamp | z-50-2.5@m15c | 10 | 0 (0 %) | 20 | 50 % | 0.51 | -17.00 | – |
| Short | sweep | willr-21-95@m30 | 8 | 0 (0 %) | 5 | 0 % | 0.00 | -17.60 | – |
| Short | follow | r-pin-m@m15 | 11 | 0 (0 %) | 6 | 0 % | 0.00 | -17.60 | – |
| Short | ribbon | willr-14-90@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.21 | -18.60 | – |
| Short | pivot | willr-50-80@m15c | 3 | 0 (0 %) | 21 | 48 % | 0.47 | -19.98 | tp2.6 sl3.9 tr1.3 h96 sh (7 · 0.56 · -5.40) |
| Short | sweep | macd-cross-19-39-9@m15 | 7 | 0 (0 %) | 6 | 17 % | 0.08 | -20.20 | – |
| Short | revert | r-klinger-m@m15c | 28 | 6 (21 %) | 19 | 32 % | 0.08 | -21.14 | – |
| Short | follow | mfi-14-20@m15 | 5 | 1 (20 %) | 15 | 47 % | 0.40 | -21.18 | – |
| Short | revert | r-orb-m@m30 | 3 | 0 (0 %) | 21 | 57 % | 0.48 | -24.72 | tp2.2 sl4.4 tr1.1 h48 sh (7 · 0.55 · -6.25) |
| Short | sweep | willr-50-90@m30 | 21 | 6 (29 %) | 39 | 59 % | 0.58 | -24.83 | – |
| Short | ribbon | dir-emax-20-50@m15c | 3 | 0 (0 %) | 15 | 20 % | 0.33 | -25.34 | tp2.8 sl2.8 tr1.4 h96 sh (5 · 0.35 · -7.85) |
| Short | sweep | willr-50-90@m15 | 19 | 4 (21 %) | 32 | 56 % | 0.53 | -25.72 | – |
| Short | sweep | mfi-14-20@m15 | 5 | 0 (0 %) | 8 | 0 % | 0.00 | -27.60 | – |
| Short | sweep | willr-50-95@m15 | 14 | 0 (0 %) | 8 | 0 % | 0.00 | -31.00 | – |
| Short | ribbon | willr-14-90@m15c | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -32.00 | – |
| Short | ribbon | willr-21-90@m15c | 6 | 0 (0 %) | 24 | 42 % | 0.24 | -37.34 | – |
| Short | pivot | willr-21-90@m15c | 5 | 0 (0 %) | 12 | 0 % | 0.00 | -39.10 | – |
| Short | ribbon | trend-st@m15c | 73 | 0 (0 %) | 25 | 0 % | 0.00 | -42.96 | – |
| Short | pivot | z-50-2.5@m15c | 32 | 0 (0 %) | 64 | 50 % | 0.54 | -47.00 | – |
| Short | revert | break-retest@m15c | 62 | 40 (65 %) | 91 | 57 % | 0.56 | -47.45 | – |
| Short | clamp | willr-50-80@m15c | 11 | 0 (0 %) | 61 | 52 % | 0.60 | -51.64 | tp2.6 sl3.9 tr0 h64 sh (7 · 0.78 · -2.70) |
| Short | sweep | r-pin-m@m15 | 16 | 0 (0 %) | 21 | 0 % | 0.00 | -61.40 | – |
| Short | ribbon | trend-st-21-3@m15c | 46 | 0 (0 %) | 33 | 0 % | 0.00 | -65.38 | – |
| Short | follow | r-ultimate@m15 | 16 | 2 (13 %) | 94 | 45 % | 0.48 | -68.03 | tp2.2 sl4.4 tr1.1 h64 sh (5 · 1.62 · 2.83) |
| Short | ribbon | ema-slope@m15 | 74 | 0 (0 %) | 38 | 0 % | 0.00 | -71.84 | – |
| Short | sweep | act-burst-2.5@x4@m30 | 56 | 0 (0 %) | 28 | 0 % | 0.00 | -72.00 | – |
| Short | ribbon | ema-slope@m15c | 78 | 0 (0 %) | 42 | 0 % | 0.00 | -76.19 | – |
| Short | sweep | willr-50-90@m15c | 41 | 6 (15 %) | 70 | 53 % | 0.38 | -86.05 | – |
| Short | pivot | r-ultimate@m15 | 25 | 0 (0 %) | 96 | 46 % | 0.18 | -103.91 | tp1.8 sl1.8 tr0.9 h64 sh (5 · 0.44 · -2.23) |
| Short | ribbon | r-ultimate@m15 | 18 | 0 (0 %) | 64 | 16 % | 0.04 | -129.10 | tp1.8 sl1.8 tr0 h64 sh (5 · 0.20 · -6.40) |
| Short | follow | r-rsi2-m@m15c | 37 | 0 (0 %) | 37 | 0 % | 0.00 | -161.70 | – |
| Short | clamp | r-ultimate@m15 | 38 | 0 (0 %) | 108 | 38 % | 0.15 | -173.21 | – |
| Short | ribbon | ema-slope-100@m15 | 33 | 0 (0 %) | 59 | 0 % | 0.00 | -192.15 | – |
| Short | revert | r-chop@m30 | 96 | 0 (0 %) | 264 | 0 % | 0.00 | -774.40 | – |
| General | revert | trend-ema-50-200@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.59 | -5.55 | – |
| General | revert | trend-ema-50-200@m30 | 5 | 0 (0 %) | 14 | 50 % | 0.52 | -10.04 | – |
| General | pivot | mfi-14-20@m15c | 3 | 0 (0 %) | 5 | 0 % | 0.00 | -10.20 | – |
| General | sweep | willr-7-90@m30 | 3 | 0 (0 %) | 6 | 17 % | 0.22 | -10.80 | – |
| General | ribbon | ema-slope@m15 | 13 | 0 (0 %) | 5 | 0 % | 0.00 | -12.90 | – |
| General | sweep | willr-50-90@m15 | 4 | 0 (0 %) | 6 | 33 % | 0.01 | -13.48 | – |
| General | revert | r-pdhl-m@m15c | 5 | 1 (20 %) | 10 | 60 % | 0.16 | -14.14 | – |
| General | ribbon | ema-slope@m15c | 14 | 0 (0 %) | 6 | 0 % | 0.00 | -14.70 | – |
| General | sweep | willr-14-90@m15c | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -17.40 | – |
| General | revert | r-qh-flow@m15c | 1 | 0 (0 %) | 5 | 0 % | 0.00 | -19.00 | tp3.6 sl3.6 tr1.8 h64 gn (5 · 0.00 · -19.00) |
| General | ribbon | trend-st-14-4@m15c | 7 | 0 (0 %) | 8 | 0 % | 0.00 | -21.00 | – |
| General | sweep | willr-50-95@m15 | 10 | 0 (0 %) | 6 | 0 % | 0.00 | -21.20 | – |
| General | clamp | r-ultimate@m15 | 4 | 0 (0 %) | 10 | 0 % | 0.00 | -22.80 | – |
| General | sweep | act-burst-2.5@x4@m30 | 16 | 0 (0 %) | 12 | 0 % | 0.00 | -31.60 | – |
| General | revert | break-vol-2@m30 | 19 | 0 (0 %) | 12 | 0 % | 0.00 | -33.60 | – |
| General | ribbon | ema-slope-100@m15 | 9 | 0 (0 %) | 10 | 0 % | 0.00 | -39.40 | – |
| General | sweep | willr-50-90@m30 | 16 | 0 (0 %) | 22 | 18 % | 0.02 | -59.53 | – |
| General | follow | r-rsi2-m@m15c | 21 | 0 (0 %) | 21 | 0 % | 0.00 | -78.90 | – |
| General | revert | r-chop@m30 | 12 | 0 (0 %) | 42 | 0 % | 0.00 | -147.60 | – |
| Long | ribbon | trix-15@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 30.00 | – |
| Long | ribbon | trend-st-28-6@m15 | 3 | 2 (67 %) | 8 | 63 % | 1.67 | 9.70 | – |
| Long | ribbon | trend-st-14-4@m15c | 13 | 0 (0 %) | 6 | 0 % | 0.00 | -16.80 | – |
| Long | ribbon | trend-st-14-4@m15 | 12 | 0 (0 %) | 6 | 0 % | 0.00 | -16.80 | – |
| Long | revert | break-don55@m15c | 6 | 0 (0 %) | 10 | 40 % | 0.54 | -16.96 | – |
| Long | revert | break-vol-1.3@m15c | 4 | 0 (0 %) | 5 | 0 % | 0.00 | -21.40 | – |
| Long | revert | break-vol-2@m30 | 31 | 0 (0 %) | 9 | 0 % | 0.00 | -26.60 | – |
| Long | revert | trend-ema-50-200@m30 | 6 | 0 (0 %) | 14 | 57 % | 0.15 | -29.04 | – |
| Long | ribbon | ema-slope-100@m15 | 7 | 0 (0 %) | 9 | 0 % | 0.00 | -34.00 | – |
| Long | ribbon | willr-50-90@m30 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -37.10 | – |
| Long | sweep | willr-50-90@m30 | 31 | 0 (0 %) | 12 | 0 % | 0.00 | -46.69 | – |
| Long | ribbon | willr-7-80@m30 | 8 | 0 (0 %) | 10 | 20 % | 0.01 | -51.62 | – |
| Long | revert | r-orb-m@m30 | 7 | 0 (0 %) | 30 | 33 % | 0.46 | -59.20 | tp4.8 sl4.8 tr0 h32 lg (5 · 0.61 · -5.80) |
| Long | follow | r-rsi2-m@m15c | 17 | 0 (0 %) | 16 | 0 % | 0.00 | -69.50 | – |
| Wide | clamp | trend-st-21-3@m30 | 6 | 6 (100 %) | 12 | 50 % | 5.69 | 26.24 | – |
| Wide | clamp | r-zdist-m@m5c | 9 | 9 (100 %) | 36 | 25 % | 1.58 | 8.33 | – |
| Wide | ribbon | bb-bounce-50-2@m1c | 9 | 3 (33 %) | 72 | 42 % | 1.01 | 0.23 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (8 · 1.57 · 1.59) |
| Wide | ribbon | z-50-2@m1c | 9 | 3 (33 %) | 72 | 42 % | 1.01 | 0.23 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (8 · 1.57 · 1.59) |
| Wide | pivot | bb-bounce-50-2@m1c | 9 | 3 (33 %) | 72 | 42 % | 1.01 | 0.23 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (8 · 1.57 · 1.59) |
| Wide | pivot | z-50-2@m1c | 9 | 3 (33 %) | 72 | 42 % | 1.01 | 0.23 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (8 · 1.57 · 1.59) |
| Wide | pivot | cci-20-200@m15c | 3 | 0 (0 %) | 12 | 25 % | 0.74 | -3.86 | – |
| Wide | revert | r-klinger@m15c | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -8.25 | – |
| Wide | clamp | bb-bounce-50-2@m1c | 9 | 3 (33 %) | 63 | 33 % | 0.72 | -8.26 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (7 · 1.23 · 0.65) |
| Wide | clamp | z-50-2@m1c | 9 | 3 (33 %) | 63 | 33 % | 0.72 | -8.26 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (7 · 1.23 · 0.65) |
| Wide | magnet | r-sweep@m5 | 9 | 0 (0 %) | 18 | 33 % | 0.17 | -10.92 | – |
| Wide | sweep | break-vol-2@m1 | 6 | 0 (0 %) | 24 | 0 % | 0.00 | -14.89 | – |
| Wide | follow | r-cvd-div-m@m1c | 15 | 0 (0 %) | 30 | 0 % | 0.00 | -23.39 | – |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 29 (97 %) | 147 | 92 % | 10.74 | 378.67 | tp3 sl6 tr0 h96 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 30 (100 %) | 78 | 97 % | 394.38 | 278.41 | tp3 sl4.5 tr0 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-sar-s@m15 | 25 | 24 (96 %) | 79 | 92 % | 11.41 | 191.69 | tp2.5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-obv-s@m15 | 24 | 24 (100 %) | 85 | 89 % | 6.23 | 183.26 | tp2.5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 20 (67 %) | 87 | 79 % | 2.42 | 162.26 | tp2.5 sl7.5 tr0 h96 (5 · 1.19 · 1.50) |
| Signals | follow | sig-kama-m@m15 | 26 | 26 (100 %) | 90 | 92 % | 13.02 | 159.44 | tp3 sl9 tr1.8 h96 (6 · ∞ (no loss) · 12.20) |
| Signals | follow | sig-act-burst-s@m15 | 24 | 24 (100 %) | 48 | 98 % | 41.29 | 159.15 | – |
| Signals | follow | sig-ema-pullback-s@m15 | 20 | 20 (100 %) | 71 | 90 % | 82.68 | 153.55 | tp2.5 sl3.75 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-reclaim-s@m15 | 26 | 26 (100 %) | 70 | 96 % | 35.89 | 144.13 | tp3 sl9 tr1.8 h96 (6 · ∞ (no loss) · 12.27) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 29 (97 %) | 44 | 98 % | 235.54 | 140.86 | – |
| Signals | follow | sig-macd-cross-s@m15 | 21 | 21 (100 %) | 57 | 89 % | 5.90 | 129.39 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-macd-hist-s@m15 | 21 | 21 (100 %) | 57 | 89 % | 5.90 | 129.39 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-keltner-s@m15 | 30 | 27 (90 %) | 44 | 86 % | 9.55 | 126.33 | – |
| Signals | follow | sig-s2-confluence-s@m15 | 26 | 25 (96 %) | 76 | 87 % | 4.61 | 124.66 | tp3 sl9 tr1.8 h96 (5 · ∞ (no loss) · 12.10) |
| Signals | follow | sig-keltner-m@m15 | 30 | 29 (97 %) | 33 | 97 % | 201.32 | 120.31 | – |
| Signals | follow | sig-impulse-s@m15 | 29 | 28 (97 %) | 38 | 95 % | 164.65 | 115.82 | tp3 sl9 tr1.2 h96 (5 · 32.78 · 3.41) |
| Signals | follow | sig-atr-break-m@m15 | 25 | 24 (96 %) | 34 | 97 % | 193.05 | 115.34 | – |
| Signals | follow | sig-heikin-ashi-m@m15 | 22 | 22 (100 %) | 44 | 89 % | 9.55 | 113.99 | tp3 sl9 tr1.2 h96 (5 · 25.27 · 5.79) |
| Signals | follow | sig-ichimoku-m@m15 | 28 | 28 (100 %) | 29 | 100 % | ∞ (no loss) | 113.78 | – |
| Signals | follow | sig-thrust-m@m15 | 16 | 16 (100 %) | 67 | 88 % | 7.09 | 112.22 | tp2.5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-macd-cross-m@m15 | 23 | 22 (96 %) | 37 | 95 % | 152.11 | 108.89 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 19 | 19 (100 %) | 49 | 98 % | 28.07 | 106.92 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-heikin-ashi-s@m15 | 24 | 19 (79 %) | 79 | 77 % | 2.37 | 101.35 | tp3 sl9 tr1.2 h96 (10 · 123.04 · 11.35) |
| Signals | follow | sig-zscore-m@m15 | 30 | 23 (77 %) | 51 | 84 % | 3.19 | 99.64 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 4.49) |
| Signals | follow | sig-s2-block-stack-s@m15 | 22 | 22 (100 %) | 39 | 92 % | 8.04 | 97.50 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-cci-m@m15 | 24 | 18 (75 %) | 64 | 75 % | 2.63 | 97.34 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 19 | 19 (100 %) | 50 | 94 % | 20.40 | 95.57 | tp3 sl9 tr1.2 h96 (6 · 44.15 · 9.80) |
| Signals | follow | sig-s2-atr-break-m@m15 | 27 | 21 (78 %) | 75 | 80 % | 1.92 | 88.85 | tp4 sl8 tr0 h96 (5 · 1.85 · 7.00) |
| Signals | follow | sig-macd-slow-s@m15 | 18 | 18 (100 %) | 39 | 97 % | 23.44 | 88.65 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-r-awesome-s@m15 | 18 | 17 (94 %) | 31 | 97 % | 10.24 | 85.05 | – |
| Signals | follow | sig-s2-block-stack-m@m15 | 21 | 21 (100 %) | 24 | 100 % | ∞ (no loss) | 82.20 | – |
| Signals | follow | sig-ichimoku-s@m15 | 14 | 13 (93 %) | 39 | 90 % | 139.60 | 76.63 | – |
| Signals | follow | sig-r-vol-regime-s@m15 | 22 | 20 (91 %) | 31 | 84 % | 6.23 | 74.04 | – |
| Signals | follow | sig-hma-s@m15 | 13 | 13 (100 %) | 41 | 85 % | 3.12 | 63.96 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-vwap-s@m15 | 19 | 18 (95 %) | 59 | 88 % | 3.86 | 62.94 | tp3 sl9 tr1.8 h96 (6 · 118.00 · 7.38) |
| Signals | follow | sig-thrust-s@m15 | 15 | 14 (93 %) | 21 | 86 % | 26.38 | 62.93 | tp3 sl9 tr1.2 h96 (5 · 2.99 · 3.73) |
| Signals | follow | sig-swing-s@m15 | 28 | 18 (64 %) | 81 | 73 % | 1.49 | 61.31 | tp2.5 sl7.5 tr0 h96 (5 · 1.19 · 1.50) |
| Signals | follow | sig-kama-s@m15 | 13 | 13 (100 %) | 39 | 90 % | 5.66 | 59.37 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 8.18) |
| Signals | follow | sig-s2-range-shift-m@m15 | 13 | 13 (100 %) | 20 | 100 % | ∞ (no loss) | 57.00 | – |
| Signals | follow | sig-stoch-rsi-s@m15 | 15 | 13 (87 %) | 73 | 78 % | 1.87 | 53.02 | tp2.5 sl5 tr0 h96 (7 · 2.65 · 8.60) |
| Signals | follow | sig-macd-slow-m@m15 | 21 | 20 (95 %) | 24 | 92 % | 235.68 | 52.04 | – |
| Signals | follow | sig-act-hf-m@m15 | 26 | 17 (65 %) | 63 | 78 % | 1.52 | 49.87 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-trix-s@m15 | 14 | 13 (93 %) | 37 | 81 % | 10.43 | 49.48 | – |
| Signals | follow | sig-obv-m@m15 | 12 | 11 (92 %) | 28 | 86 % | 9.23 | 47.99 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 23 | 17 (74 %) | 36 | 81 % | 2.21 | 47.80 | – |
| Signals | follow | sig-r-linreg-m@m15 | 22 | 15 (68 %) | 41 | 76 % | 1.74 | 40.93 | – |
| Signals | follow | sig-bollinger-m@m15 | 24 | 17 (71 %) | 61 | 70 % | 1.39 | 38.84 | tp3 sl4.5 tr0 h96 (5 · 0.40 · -8.50) |
| Signals | follow | sig-r-nr-break-s@m15 | 11 | 11 (100 %) | 14 | 100 % | ∞ (no loss) | 38.20 | – |
| Signals | follow | sig-r-awesome-m@m15 | 11 | 11 (100 %) | 15 | 93 % | 10.55 | 37.72 | – |
| Signals | follow | sig-r-linreg-s@m15 | 19 | 15 (79 %) | 59 | 80 % | 1.90 | 37.12 | tp3 sl9 tr1.2 h96 (6 · ∞ (no loss) · 6.06) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 22 | 14 (64 %) | 31 | 74 % | 1.71 | 35.27 | – |
| Signals | follow | sig-s2-ema-cross-s@m15 | 14 | 13 (93 %) | 14 | 93 % | 122.43 | 26.33 | – |
| Signals | follow | sig-cci-s@m15 | 16 | 14 (88 %) | 44 | 80 % | 1.69 | 26.31 | tp2.5 sl3.75 tr0 h96 (6 · 1.16 · 1.30) |
| Signals | follow | sig-ema-pullback-m@m15 | 13 | 12 (92 %) | 25 | 88 % | 2.97 | 26.21 | – |
| Signals | follow | sig-ema-cross-m@m15 | 21 | 16 (76 %) | 28 | 79 % | 2.00 | 26.20 | – |
| Signals | follow | sig-impulse-m@m15 | 26 | 18 (69 %) | 42 | 55 % | 1.32 | 22.46 | – |
| Signals | follow | sig-r-nr-break-m@m15 | 7 | 7 (100 %) | 8 | 100 % | ∞ (no loss) | 21.45 | – |
| Signals | follow | sig-adx-m@m15 | 15 | 10 (67 %) | 23 | 74 % | 1.74 | 19.55 | – |
| Signals | follow | sig-mfi-m@m15 | 16 | 14 (88 %) | 19 | 84 % | 2.46 | 18.43 | – |
| Signals | follow | sig-swing-m@m15 | 30 | 16 (53 %) | 72 | 67 % | 1.13 | 18.40 | tp3 sl9 tr1.2 h96 (5 · 0.69 · -2.90) |
| Signals | follow | sig-r-fractal-s@m15 | 22 | 16 (73 %) | 32 | 75 % | 1.41 | 17.30 | – |
| Signals | follow | sig-ema-cross-s@m15 | 14 | 11 (79 %) | 24 | 79 % | 2.19 | 16.88 | – |
| Signals | follow | sig-cmf-m@m15 | 27 | 15 (56 %) | 74 | 72 % | 1.09 | 11.72 | tp4 sl6 tr0 h96 (5 · 0.92 · -1.00) |
| Signals | follow | sig-ema-slope-s@m15 | 10 | 8 (80 %) | 23 | 78 % | 1.79 | 11.18 | tp3 sl9 tr1.2 h96 (5 · 11.04 · 1.81) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 7 | 6 (86 %) | 9 | 78 % | 110.18 | 10.74 | – |
| Signals | follow | sig-vwap-m@m15 | 16 | 13 (81 %) | 35 | 71 % | 1.42 | 9.95 | tp3 sl9 tr1.2 h96 (6 · 21.13 · 4.32) |
| Signals | follow | sig-st-slow-m@m15 | 10 | 7 (70 %) | 10 | 70 % | 7.69 | 7.57 | – |
| Signals | follow | sig-rsi-mid-s@m15 | 11 | 8 (73 %) | 18 | 83 % | 1.51 | 7.10 | – |
| Signals | follow | sig-s2-block-scale-m@m15 | 13 | 9 (69 %) | 34 | 68 % | 1.05 | 2.81 | tp2.5 sl3.75 tr0 h96 (6 · 0.58 · -4.95) |
| Signals | follow | sig-hma-m@m15 | 22 | 14 (64 %) | 34 | 65 % | 1.00 | -0.13 | – |
| Signals | follow | sig-r-connors-m@m15 | 7 | 3 (43 %) | 9 | 56 % | 0.21 | -7.83 | – |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 16 (53 %) | 49 | 59 % | 0.93 | -8.80 | – |
| Signals | follow | sig-sar-m@m15 | 19 | 9 (47 %) | 48 | 71 % | 0.90 | -10.03 | tp3 sl9 tr1.2 h96 (5 · 0.77 · -2.12) |
| Signals | follow | sig-cmf-s@m15 | 6 | 3 (50 %) | 10 | 50 % | 0.41 | -10.64 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 29 | 15 (52 %) | 87 | 63 % | 0.93 | -12.69 | tp2.5 sl7.5 tr0 h96 (6 · 0.60 · -6.20) |
| Signals | follow | sig-s2-active-hf-m@m15 | 29 | 15 (52 %) | 85 | 62 % | 0.89 | -20.29 | tp2.5 sl7.5 tr0 h96 (6 · 0.60 · -6.20) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 7 | 3 (43 %) | 13 | 46 % | 0.08 | -25.46 | – |
| Signals | follow | sig-stoch-rsi-m@m15 | 13 | 7 (54 %) | 30 | 57 % | 0.57 | -27.84 | tp3 sl9 tr1.2 h96 (5 · 0.51 · -4.53) |
| Signals | follow | sig-ema-trend-s@m15 | 7 | 3 (43 %) | 22 | 59 % | 0.15 | -31.72 | tp3 sl9 tr1.2 h96 (5 · 0.28 · -6.61) |
| Signals | follow | sig-s2-block-scale-s@m15 | 8 | 3 (38 %) | 16 | 44 % | 0.34 | -34.87 | – |
| Signals | follow | sig-williams-r-m@m15 | 24 | 10 (42 %) | 97 | 64 % | 0.84 | -36.45 | tp4 sl12 tr1.6 h96 (5 · 90.36 · 11.69) |
| Signals | follow | sig-trix-m@m15 | 8 | 1 (13 %) | 8 | 13 % | 0.00 | -41.63 | – |
| Signals | follow | sig-r-fractal-m@m15 | 23 | 10 (43 %) | 34 | 62 % | 0.54 | -43.70 | – |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 16 (53 %) | 59 | 49 % | 0.71 | -47.54 | tp2.5 sl3.75 tr0 h96 (5 · 0.15 · -13.50) |
| Signals | follow | sig-rsi-reversal-m@m15 | 9 | 1 (11 %) | 9 | 11 % | 0.00 | -49.83 | – |
| Signals | follow | sig-donchian-s@m15 | 17 | 4 (24 %) | 53 | 62 % | 0.53 | -57.62 | tp3 sl9 tr1.2 h96 (7 · 0.75 · -2.26) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 23 | 9 (39 %) | 48 | 52 % | 0.48 | -72.43 | tp3 sl9 tr1.2 h96 (5 · 0.52 · -4.40) |
| Signals | follow | sig-s2-range-shift-s@m15 | 24 | 10 (42 %) | 48 | 48 % | 0.51 | -73.83 | tp3 sl9 tr1.2 h96 (5 · 0.31 · -6.38) |
| Signals | follow | sig-williams-r-s@m15 | 20 | 7 (35 %) | 90 | 60 % | 0.56 | -92.48 | tp4 sl12 tr1.6 h96 (6 · 81.95 · 10.59) |
| Signals | follow | sig-st-slow-s@m15 | 13 | 0 (0 %) | 16 | 0 % | 0.00 | -109.70 | – |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 16 | 3 (19 %) | 54 | 43 % | 0.31 | -126.02 | tp3 sl9 tr1.2 h96 (5 · 0.48 · -4.76) |
| Signals | follow | sig-bollinger-s@m15 | 23 | 9 (39 %) | 68 | 47 % | 0.35 | -144.68 | tp2.5 sl5 tr0 h96 (5 · 0.29 · -11.00) |
| Signals | follow | sig-zscore-s@m15 | 23 | 9 (39 %) | 68 | 47 % | 0.35 | -144.68 | tp2.5 sl5 tr0 h96 (5 · 0.29 · -11.00) |
| Signals | follow | sig-ema-trend-m@m15 | 26 | 7 (27 %) | 80 | 59 % | 0.45 | -147.20 | tp2.5 sl5 tr0 h96 (5 · 0.66 · -3.50) |
| Signals | follow | sig-donchian-m@m15 | 13 | 0 (0 %) | 23 | 0 % | 0.00 | -151.35 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 22 | 2 (9 %) | 75 | 47 % | 0.28 | -160.19 | tp3 sl9 tr1.8 h96 (7 · 0.71 · -2.74) |
| Signals | follow | sig-reclaim-m@m15 | 22 | 3 (14 %) | 61 | 46 % | 0.18 | -217.63 | tp2.5 sl5 tr0 h96 (5 · 0.66 · -3.50) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 24 | 5 (21 %) | 73 | 40 % | 0.24 | -235.68 | tp3 sl9 tr1.8 h96 (5 · 0.18 · -15.03) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 24 | 5 (21 %) | 74 | 38 % | 0.24 | -253.65 | tp2.5 sl5 tr0 h96 (6 · 0.22 · -16.20) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 87 | 86 (99 %) | 184 | 93 % | 332.41 | 416.41 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 93 | 87 (94 %) | 257 | 82 % | 6.97 | 393.48 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 79 | 76 (96 %) | 127 | 94 % | 207.82 | 332.55 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 84 | 76 (90 %) | 151 | 91 % | 5.81 | 302.07 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 69 | 64 (93 %) | 94 | 93 % | 198.89 | 272.07 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 51 | 49 (96 %) | 57 | 96 % | 569.17 | 237.70 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 67 | 62 (93 %) | 99 | 95 % | 4.87 | 235.99 |
| Signals | tp 4.000% | sl 3.00× | tr off | 59 | 54 (92 %) | 80 | 94 % | 4.67 | 224.00 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 41 | 41 (100 %) | 47 | 100 % | ∞ (no loss) | 212.65 |
| Signals | tp 5.000% | sl 3.00× | tr off | 31 | 31 (100 %) | 36 | 100 % | ∞ (no loss) | 172.80 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 57 | 57 (100 %) | 69 | 100 % | ∞ (no loss) | 155.22 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 26 | 26 (100 %) | 29 | 100 % | ∞ (no loss) | 140.28 |
| Signals | tp 6.000% | sl 3.00× | tr off | 20 | 20 (100 %) | 22 | 100 % | ∞ (no loss) | 127.60 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 97 | 65 (67 %) | 283 | 80 % | 1.28 | 106.31 |
| Signals | tp 5.000% | sl 2.00× | tr off | 41 | 31 (76 %) | 50 | 80 % | 1.88 | 90.00 |
| Signals | tp 6.000% | sl 2.00× | tr off | 27 | 22 (81 %) | 30 | 83 % | 2.38 | 84.00 |
| Signals | tp 2.500% | sl 3.00× | tr off | 93 | 58 (62 %) | 279 | 80 % | 1.19 | 81.70 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 90 | 59 (66 %) | 213 | 77 % | 1.19 | 68.25 |
| Signals | tp 3.000% | sl 3.00× | tr off | 82 | 55 (67 %) | 170 | 79 % | 1.17 | 56.00 |
| Signals | tp 4.000% | sl 2.00× | tr off | 70 | 44 (63 %) | 130 | 72 % | 1.16 | 50.00 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 26 | 26 (100 %) | 29 | 100 % | ∞ (no loss) | 47.62 |
| Wide | tp 1.130% | sl 1.00× | tr off | 40 | 6 (15 %) | 12 | 50 % | 5.69 | 26.24 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 103 | 66 (64 %) | 444 | 73 % | 1.04 | 18.96 |
| Signals | tp 3.000% | sl 2.00× | tr off | 88 | 48 (55 %) | 241 | 70 % | 1.04 | 17.80 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 21 | 3 (14 %) | 23 | 13 % | 1.95 | 11.39 |
| Short | tp 2.600% | sl 2.00× | tr off | 91 | 13 (14 %) | 36 | 72 % | 1.16 | 8.40 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 87 | 4 (5 %) | 16 | 69 % | 1.19 | 3.44 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 122 | 22 (18 %) | 54 | 76 % | 1.00 | 0.03 |
| Micro | tp 0.600% (net 0.400%) | sl 5.00× | tr 0.75× | 29 | 4 (14 %) | 10 | 70 % | 0.96 | -0.13 |
| Micro | tp 0.500% (net 0.300%) | sl 4.00× | tr off | 24 | 4 (17 %) | 10 | 80 % | 0.55 | -2.00 |
| Micro | tp 0.500% (net 0.300%) | sl 4.25× | tr off | 28 | 4 (14 %) | 10 | 80 % | 0.52 | -2.25 |
| Micro | tp 0.500% (net 0.300%) | sl 4.50× | tr off | 28 | 4 (14 %) | 10 | 80 % | 0.49 | -2.50 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 102 | 9 (9 %) | 33 | 67 % | 0.92 | -2.51 |
| Wide | tp 0.760% | sl 0.89× | tr off | 62 | 9 (15 %) | 54 | 28 % | 0.91 | -2.59 |
| Micro | tp 0.500% (net 0.300%) | sl 4.75× | tr off | 28 | 4 (14 %) | 10 | 80 % | 0.47 | -2.75 |
| Micro | tp 0.500% (net 0.300%) | sl 5.00× | tr off | 28 | 4 (14 %) | 10 | 80 % | 0.44 | -3.00 |
| Micro | tp 0.600% (net 0.400%) | sl 3.50× | tr off | 30 | 2 (7 %) | 11 | 73 % | 0.46 | -3.70 |
| Micro | tp 0.600% (net 0.400%) | sl 3.50× | tr 0.75× | 29 | 2 (7 %) | 12 | 58 % | 0.47 | -3.83 |
| Micro | tp 0.600% (net 0.400%) | sl 3.75× | tr 0.75× | 29 | 2 (7 %) | 12 | 58 % | 0.44 | -4.28 |
| Micro | tp 0.550% (net 0.350%) | sl 3.75× | tr 0.75× | 23 | 0 (0 %) | 10 | 50 % | 0.34 | -4.59 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 1.50× | tr off | 106 | 49 (46 %) | 447 | 56 % | 0.75 | -196.90 |
| Signals | tp 5.000% | sl 1.50× | tr off | 59 | 24 (41 %) | 94 | 48 % | 0.57 | -161.30 |
| Short | tp 1.800% | sl 2.00× | tr 0.75× | 120 | 6 (5 %) | 95 | 39 % | 0.23 | -157.78 |
| Signals | tp 3.000% | sl 1.50× | tr off | 104 | 43 (41 %) | 347 | 57 % | 0.79 | -145.90 |
| Signals | tp 2.500% | sl 2.00× | tr off | 105 | 48 (46 %) | 377 | 64 % | 0.80 | -137.90 |
| Short | tp 2.000% | sl 1.50× | tr 0.75× | 86 | 4 (5 %) | 62 | 15 % | 0.13 | -136.13 |
| Short | tp 2.000% | sl 2.00× | tr 0.75× | 136 | 5 (4 %) | 80 | 33 % | 0.25 | -131.82 |
| Signals | tp 6.000% | sl 1.50× | tr off | 40 | 14 (35 %) | 57 | 47 % | 0.57 | -119.40 |
| Short | tp 2.000% | sl 1.00× | tr 0.75× | 67 | 0 (0 %) | 68 | 12 % | 0.12 | -104.46 |
| Short | tp 1.800% | sl 2.00× | tr 0.50× | 95 | 8 (8 %) | 96 | 43 % | 0.27 | -103.90 |
| Short | tp 2.800% | sl 1.50× | tr off | 76 | 0 (0 %) | 38 | 29 % | 0.24 | -90.20 |
| Short | tp 2.800% | sl 1.00× | tr 0.50× | 70 | 2 (3 %) | 36 | 14 % | 0.07 | -84.16 |
| Short | tp 2.400% | sl 1.50× | tr 0.50× | 86 | 5 (6 %) | 61 | 36 % | 0.30 | -77.67 |
| General | tp 3.200% | sl 1.00× | tr off | 64 | 1 (2 %) | 26 | 8 % | 0.07 | -75.60 |
| Short | tp 2.600% | sl 1.00× | tr 0.75× | 59 | 2 (3 %) | 33 | 15 % | 0.01 | -74.70 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 59 (59) | 38704 | 16182 | 16182 | 0 | baseTarget 22522 |
| Micro | trailing | 59 (59) | 77408 | 32364 | 32364 | 0 | baseTarget 45044 |
| Short | normal | 255 (227) | 38448 | 16068 | 16068 | 0 | baseTarget 9924 · baseRange 12456 |
| Short | trailing | 255 (227) | 76896 | 32136 | 32136 | 0 | baseTarget 19848 · baseRange 24912 |
| General | normal | 255 (193) | 25632 | 9282 | 9282 | 0 | baseTarget 3390 · baseRange 12960 |
| General | trailing | 255 (193) | 17088 | 6188 | 6188 | 0 | baseTarget 2260 · baseRange 8640 |
| Long | normal | 255 (215) | 32040 | 13536 | 13536 | 0 | baseRange 13080 · baseTarget 5424 |
| Long | trailing | 255 (215) | 21360 | 9024 | 9024 | 0 | baseRange 8720 · baseTarget 3616 |
| Wide | axis | 314 (314) | 55575 | 55575 | 55575 | 0 | – |
| Wide | dca | 314 (314) | 4940 | 4940 | 4940 | 0 | – |
| Wide | dca-active | 314 (314) | 4940 | 4940 | 4940 | 0 | – |

Engine indications Base evaluated that built no set: 77 (bb-bounce-20-3, bb-walk, break-atr-0.9, cci-14-100, cci-20-100, dir-emax-5-13, dir-vwap-30, ema-slope-20-3, ema-stoch, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-burst-3, mc-engulf-20, mc-ivwapd-2, mc-mturn-10, mc-qburst-2, mc-qrsi2-5, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-20, mc-rsi3-30, mc-rsi4-15, mc-rsi4-25, mc-rsi4-30, mc-rsi4-5, mc-rsi5-25, mc-rsi5-30, mc-rsi7-20, mc-rsi7-30, mc-rsi9-15, mc-rsimid-14, mc-rsit14-25, mc-rsit14-30, mc-rsit2-5, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.19 (180) | 0.31 (210) | 0.31 (270) | 0.27 (348) | 0.47 (370) |
| 1.14× | – | 0.15 (116) | – | – | – | – | – |
| 1.25× | – | 0.15 (116) | 0.18 (180) | 0.29 (210) | 0.31 (258) | 0.29 (330) | 0.49 (348) |
| 1.33× | 0.12 (98) | – | – | – | – | – | – |
| 1.5× | 0.12 (98) | 0.13 (116) | 0.19 (174) | 0.28 (198) | 0.32 (248) | 0.27 (322) | 0.43 (348) |
| 1.75× | 0.10 (98) | 0.13 (110) | 0.19 (170) | 0.26 (194) | 0.29 (248) | 0.24 (322) | 0.41 (348) |
| 2× | 0.10 (92) | 0.14 (106) | 0.17 (168) | 0.27 (194) | 0.29 (248) | 0.26 (316) | 0.41 (342) |
| 2.25× | 0.12 (92) | 0.13 (104) | 0.18 (168) | 0.28 (194) | 0.31 (242) | 0.24 (316) | 0.39 (342) |
| 2.5× | 0.11 (92) | 0.12 (104) | 0.17 (168) | 0.28 (188) | 0.28 (242) | 0.23 (316) | 0.41 (328) |
| 2.75× | 0.11 (92) | 0.15 (104) | 0.20 (162) | 0.26 (188) | 0.26 (242) | 0.25 (296) | 0.41 (328) |
| 3× | 0.13 (92) | 0.19 (104) | 0.18 (162) | 0.24 (188) | 0.28 (228) | 0.24 (296) | 0.40 (322) |
| 3.25× | 0.13 (92) | 0.20 (98) | 0.17 (162) | 0.24 (182) | 0.29 (228) | 0.24 (290) | 0.38 (322) |
| 3.5× | 0.16 (92) | 0.19 (98) | 0.18 (156) | 0.23 (182) | 0.29 (222) | 0.23 (290) | 0.48 (296) |
| 3.75× | 0.18 (86) | 0.18 (98) | 0.17 (156) | 0.22 (182) | 0.28 (222) | 0.28 (264) | 0.45 (296) |
| 4× | 0.18 (86) | 0.17 (98) | 0.16 (156) | 0.22 (176) | 0.26 (222) | 0.27 (264) | 0.54 (290) |
| 4.25× | 0.17 (86) | 0.16 (98) | 0.15 (156) | 0.21 (176) | 0.33 (204) | 0.27 (258) | 0.51 (290) |
| 4.5× | 0.16 (86) | 0.16 (98) | 0.14 (156) | 0.20 (176) | 0.32 (204) | 0.29 (258) | 0.48 (290) |
| 4.75× | 0.15 (86) | 0.15 (98) | 0.14 (156) | 0.24 (164) | 0.30 (204) | 0.28 (258) | 0.46 (290) |
| 5× | 0.15 (86) | 0.14 (98) | 0.13 (156) | 0.23 (164) | 0.29 (204) | 0.27 (258) | 0.56 (278) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | 0.21 (6) | 0.23 (6) | 1.00 (6) |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | 0.73 (6) | 0.79 (6) | 0.84 (6) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | 0.73 (6) |
| 1.75× | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | – |
| 2.25× | – | – | – | – | – | – | – |
| 2.5× | – | – | – | – | – | – | – |
| 2.75× | – | – | – | – | – | – | – |
| 3× | – | – | – | – | – | – | – |
| 3.25× | – | – | – | – | – | – | 0.36 (18) |
| 3.5× | – | – | – | – | – | 0.27 (18) | 0.40 (31) |
| 3.75× | – | – | 0.00 (6) | – | 0.23 (18) | 0.25 (25) | 0.34 (27) |
| 4× | – | – | 0.00 (6) | – | 0.31 (22) | 0.23 (25) | 0.32 (27) |
| 4.25× | – | 0.00 (4) | 0.00 (6) | 0.19 (18) | 0.29 (22) | 0.22 (25) | 0.30 (27) |
| 4.5× | – | 0.00 (4) | 0.00 (6) | 0.18 (18) | 0.28 (22) | 0.21 (25) | 0.28 (33) |
| 4.75× | – | 0.00 (4) | 0.08 (24) | 0.17 (18) | 0.27 (22) | 0.21 (31) | 0.27 (33) |
| 5× | 0.00 (2) | 0.00 (4) | 0.08 (24) | 0.17 (18) | 0.25 (22) | 0.20 (31) | 0.64 (27) |

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
| 3× | – | – | – | – | – | – | – |
| 3.25× | – | – | – | – | – | – | – |
| 3.5× | – | – | – | – | – | – | 0.32 (5) |
| 3.75× | – | – | – | – | – | – | 0.31 (4) |
| 4× | – | – | – | – | – | – | 0.31 (3) |
| 4.25× | – | – | – | – | – | – | – |
| 4.5× | – | – | – | – | – | – | – |
| 4.75× | – | – | – | – | – | – | – |
| 5× | – | – | – | – | – | – | – |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.41 (3300) | 0.40 (3450) | 0.40 (2563) | 0.39 (2318) | 0.39 (2284) | 0.37 (2410) |
| 1.5× | 0.45 (2656) | 0.47 (2724) | 0.53 (1898) | 0.56 (1638) | 0.54 (1599) | 0.57 (1569) |
| 2× | 0.51 (2297) | 0.53 (2253) | 0.65 (1523) | 0.67 (1341) | 0.61 (1347) | 0.63 (1329) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.22 (108) | 0.19 (169) | 0.12 (106) | 0.12 (72) | 0.06 (93) | 0.04 (82) |
| 1.5× | 0.30 (114) | 0.23 (139) | 0.30 (95) | 0.31 (123) | 0.44 (145) | 0.28 (84) |
| 2× | 0.27 (218) | 0.36 (187) | 0.55 (102) | 0.85 (89) | 0.81 (123) | 0.77 (93) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.08 (23) | 0.16 (51) | 0.11 (34) | 0.00 (19) | 0.00 (13) | 0.00 (10) |
| 1.5× | 0.22 (21) | 0.23 (28) | 0.34 (15) | 0.16 (37) | 0.34 (43) | 0.22 (21) |
| 2× | 0.27 (55) | 0.12 (42) | 0.26 (37) | 0.22 (17) | 0.14 (20) | 0.68 (23) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.33 (718) | 0.31 (639) | 0.29 (561) | 0.36 (541) |
| 0.75× | 0.31 (544) | 0.35 (466) | 0.31 (408) | 0.49 (333) |
| 1× | 0.40 (1273) | 0.44 (979) | 0.47 (856) | 0.49 (772) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.42 (15) | 0.00 (7) | 0.00 (6) | 0.50 (9) |
| 0.75× | 0.09 (28) | 0.00 (6) | 0.00 (14) | 0.00 (12) |
| 1× | 0.07 (76) | 0.06 (48) | 0.07 (22) | 0.26 (28) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.00 (5) | – | 0.00 (2) | – |
| 0.75× | 0.00 (5) | 0.00 (6) | 0.00 (5) | 0.00 (2) |
| 1× | 0.22 (11) | 0.00 (4) | ∞ (1) | 1.01 (3) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.35 (537) | 0.38 (517) | 0.31 (531) | 0.25 (414) | 0.28 (426) |
| 0.75× | 0.57 (293) | 0.54 (282) | 0.51 (254) | 0.40 (196) | 0.37 (225) |
| 1× | 0.43 (715) | 0.36 (724) | 0.29 (647) | 0.33 (513) | 0.24 (584) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.21 (19) | 0.00 (8) | 0.00 (11) | 0.00 (5) | 0.00 (3) |
| 0.75× | 0.30 (10) | 0.61 (12) | 0.61 (6) | 0.00 (4) | 0.00 (6) |
| 1× | 0.33 (27) | 0.31 (23) | 0.38 (17) | 0.26 (11) | 0.06 (19) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (4) | 0.00 (1) | 0.00 (2) | – | – |
| 0.75× | 0.00 (1) | – | – | 0.00 (1) | – |
| 1× | ∞ (1) | 0.01 (2) | – | 0.00 (2) | 0.01 (3) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.39 (5287) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.38 (206) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.58 (8501) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.39 (189) | 0.22 (296) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.36 (182) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.28 (270) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.29 (259) | – | – | – | – |
| 1× | – | – | – | 0.42 (49926) | – | – | – | 0.41 (10723) | 0.29 (1519) | – | 0.45 (337) | – | 0.31 (1228) | 0.22 (860) | 0.23 (185) | 0.28 (115) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.75 (468) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.91 (54) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.41 (22) | – | – | – | 5.69 (12) | – | – | – | – | – | – | – | – |

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
