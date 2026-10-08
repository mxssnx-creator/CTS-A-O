# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.35–$0.45 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-07T18:00 UTC. Engine: Base 1386/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 345/19072 · PF 1.45 · Micro 110/5900 · PF 2.78 · Short 591/8176 · PF 1.47 · General 584/8176 · PF 1.39 · Long 686/8176 · PF 1.43 · Signals 126/126 · PF 1.09; Main 1310 pairs, 193723 tapes, Real seats: 9796 engine configs + 3780 signal configs (every config of the active signals), compute 300 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.77 (3.84 %, closed orders) · equity at end $17.54 (open at end: 41 positions / 2365 orders, MTM -$3.22 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.47 (gross profit $ ÷ gross loss $ as sized) · PF unit 0.82 (every order at one unit: the engine's PF) · 38 positions / 843 orders (incl. 36 capped to $0) · WR 66.79 % · DDT (closed trades, $) 3.00 h · DDR 1.22 · equity max drawdown $4.54 (20.94 %) · margin used max $15.13 · open avg 15.07 pos / 182.46 orders (peak 22 / 311)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 36 orders capped to $0, 606 scaled down (open at end: 76 capped, 2140 scaled) · binding: position cap 1785, gross cap 2408. **Without the caps:** balance $20.00 → $18.44 (-7.79 %) · PF $ 0.78 · equity at end $7.57 · equity max drawdown $21.05 (87.80 %) · margin used max $93.07 · infeasible: margin exceeded equity for 271 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 519 | 1247  | 5.0 % | 1.473 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 519 | 1247 (+0) | 5.0 % | 1.473 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 519 | 1247 (+0) | 5.0 % | 1.473 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 457 | 1068 (-179) | 4.3 % | 1.528 |
| closes ≥ 6 | 1.00 | 6 | 1 | 745 | 1583 (+336) | 6.3 % | 1.694 |
| closes ≥ 20 | 1.00 | 20 | 1 | 405 | 1026 (-221) | 4.1 % | 1.375 |
| closes ≥ 30 | 1.00 | 30 | 1 | 322 | 844 (-403) | 3.4 % | 1.316 |
| DDR off | 1.00 | 12 | off | 1678 | 2793 (+1546) | 11.2 % | 1.149 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 876 | 1784 (+537) | 7.1 % | 1.311 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 205 | 570 (-677) | 2.3 % | 1.763 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1678 | 2793 (+1546) | 11.2 % | 1.149 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2103 | 3295 (+2048) | 13.2 % | 1.184 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 1 / 57 | 53 / 4 | 6.22 | 6.22 | 93 % | $0.58 | $20.58 | $20.19 | $19.67 | 3.16 % | 0.27 | $11.00 | 15 / 325 |
| 13:00 | 1 / 63 | 45 / 18 | 1.32 | 1.24 | 71 % | $0.09 | $20.67 | $20.32 | $19.91 | 4.50 % | 0.20 | $14.48 | 19 / 736 |
| 14:00 | 3 / 192 | 179 / 13 | 12.33 | 10.07 | 93 % | $0.95 | $21.62 | $21.34 | $20.19 | 4.50 % | 0.18 | $15.13 | 20 / 1044 |
| 15:00 | 2 / 176 | 62 / 114 | 0.14 | 0.05 | 35 % | -$0.59 | $21.03 | $18.65 | $18.18 | 16.11 % | 0.97 | $15.13 | 30 / 1381 |
| 16:00 | 0 / 191 | 88 / 103 | 0.25 | 0.44 | 46 % | -$0.33 | $20.70 | $17.94 | $17.13 | 20.94 % | 1.97 | $14.72 | 40 / 2173 |
| 17:00 | 1 / 164 | 136 / 28 | 2.66 | 3.86 | 83 % | $0.07 | $20.77 | $17.54 | $17.54 | 20.94 % | 2.97 | $14.55 | 41 / 2365 |

**Last hour (17:00):** open at end: 41 positions / 2365 orders, MTM -$3.22 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $17.54 = balance $20.77 + MTM -$3.22.

**Hours positive:** 4 of 6 full hours · flat 0 · negative 2

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|
| 12:00 | – | 39 · 4.89 · $0.43 | 18 · ∞ (no loss) · $0.15 | – |
| 13:00 | – | 60 · 1.27 · $0.08 | 3 · ∞ (no loss) · $0.01 | – |
| 14:00 | 3 · ∞ (no loss) · $0.00 | 149 · 12.40 · $0.89 | 1 · 0.00 · -$0.01 | 39 · ∞ (no loss) · $0.07 |
| 15:00 | 3 · ∞ (no loss) · $0.00 | 155 · 0.09 · -$0.56 | 8 · 0.24 · -$0.03 | 10 · 1.09 · $0.00 |
| 16:00 | – | 171 · 0.30 · -$0.25 | 15 · 0.00 · -$0.08 | 5 · 0.00 · -$0.00 |
| 17:00 | – | 136 · 2.91 · $0.07 | 23 · 0.00 · -$0.00 | 5 · ∞ (no loss) · $0.00 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 57 | 4 · ∞ (no loss) · 100 % · $0.08 | 20 · ∞ (no loss) · 100 % · $0.17 | 15 · ∞ (no loss) · 100 % · $0.23 | 18 · 1.89 · 78 % · $0.10 | – | 33 · 4.00 · 88 % · $0.33 |
| 13:00 | 63 | 2 · ∞ (no loss) · 100 % · $0.04 | 4 · ∞ (no loss) · 100 % · $0.02 | 29 · 1.30 · 69 % · $0.04 | 28 · 0.90 · 68 % · -$0.01 | – | 57 · 1.09 · 68 % · $0.03 |
| 14:00 | 192 | 25 · 1.72 · 84 % · $0.02 | 21 · ∞ (no loss) · 100 % · $0.03 | 74 · 7.78 · 93 % · $0.40 | 72 · 281.15 · 94 % · $0.50 | – | 146 · 15.79 · 94 % · $0.90 |
| 15:00 | 176 | 16 · 0.04 · 19 % · -$0.06 | 15 · 0.93 · 60 % · -$0.00 | 71 · 0.03 · 4 % · -$0.47 | 74 · 0.43 · 64 % · -$0.05 | – | 145 · 0.09 · 34 % · -$0.52 |
| 16:00 | 191 | 34 · 0.05 · 44 % · -$0.12 | 27 · 0.14 · 44 % · -$0.04 | 85 · 0.16 · 34 % · -$0.18 | 45 · 1.03 · 71 % · $0.00 | – | 130 · 0.35 · 47 % · -$0.18 |
| 17:00 | 164 | 28 · 0.74 · 89 % · -$0.00 | 21 · 0.59 · 86 % · -$0.00 | 62 · 1.92 · 82 % · $0.03 | 53 · 125.64 · 79 % · $0.04 | – | 115 · 3.11 · 81 % · $0.07 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1260 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (193723 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (12270); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 32112 · 1.56 | 7033 · 1.95 | 8483 · 2.13 | 1460 · 0.65 | 57 · 6.22 | 4 · ∞ (no loss) | 20 · ∞ (no loss) | – | 33 · 4.00 |
| 13:00 | 51825 · 1.11 | 9651 · 1.62 | 16296 · 1.66 | 2019 · 2.92 | 63 · 1.24 | 2 · ∞ (no loss) | 4 · ∞ (no loss) | – | 57 · 1.05 |
| 14:00 | 42956 · 1.25 | 11537 · 1.37 | 12285 · 1.94 | 2828 · 6.32 | 192 · 10.07 | 25 · 3.05 | 21 · ∞ (no loss) | – | 146 · 12.61 |
| 15:00 | 67489 · 1.12 | 16262 · 0.83 | 17569 · 1.37 | 4593 · 0.82 | 176 · 0.05 | 16 · 0.01 | 15 · 0.59 | – | 145 · 0.04 |
| 16:00 | 75046 · 0.80 | 18826 · 0.98 | 22429 · 0.92 | 3623 · 0.72 | 191 · 0.44 | 34 · 0.58 | 27 · 0.37 | – | 130 · 0.42 |
| 17:00 | 58001 · 0.95 | 12622 · 0.72 | 16076 · 1.24 | 3016 · 1.34 | 164 · 3.86 | 28 · 4.95 | 21 · 2.58 | – | 115 · 3.88 |
| **total** | **327429 · 1.06** | **75931 · 1.06** | **93138 · 1.37** | **17539 · 1.15** | **843 · 0.82** | **109 · 1.27** | **108 · 1.95** | **–** | **626 · 0.72** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 109 | 70 / 39 | 0.79 | 1.27 | -$0.04 | 64.22 % | 3.00 |
| Trailing | 108 | 84 / 24 | 3.01 | 1.95 | $0.18 | 77.78 % | 2.00 |
| Signal · Normal | 336 | 187 / 149 | 1.06 | 0.54 | $0.06 | 55.65 % | 3.25 |
| Signal · Trailing | 290 | 222 / 68 | 2.40 | 1.21 | $0.58 | 76.55 % | 2.25 |
| total | 843 | 563 / 280 | 1.47 | 0.82 | $0.77 | 66.79 % | 3.00 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 626 | 409 / 217 | 1.47 | 0.72 | $0.63 | 65.34 % | 3.00 |
| of which Engine (no signals) | 217 | 154 / 63 | 1.44 | 1.51 | $0.14 | 70.97 % | 2.50 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m+ | 6 | ∞ (no loss) | ∞ (no loss) | $0.01 |
| 15m | 710 | 1.43 | 0.75 | $0.65 |
| 15m+ | 68 | 1.40 | 1.19 | $0.05 |
| 30m | 59 | 3.40 | 2.96 | $0.07 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 6 | 6 / 0 | ∞ (no loss) | ∞ (no loss) | $0.01 | 100.00 % | 0.00 |
| Short | 165 | 125 / 40 | 1.46 | 1.88 | $0.08 | 75.76 % | 2.75 |
| General | 27 | 12 / 15 | 0.27 | 0.63 | -$0.07 | 44.44 % | 2.50 |
| Long | 19 | 11 / 8 | 4.75 | 1.42 | $0.11 | 57.89 % | 4.00 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 626 | 409 / 217 | 1.47 | 0.72 | $0.63 | 65.34 % | 3.00 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 36448 | sig:confirm 16006 · sig:signalCluster 6832 · sig:signalPf 5496 · sig:signalSide 4122 · sig:duplicate 3992 |
| Short | 6375 | lastN 3901 · symPf 1280 · engineSide 627 · duplicate 567 |
| Long | 2293 | lastN 1071 · symPf 690 · duplicate 403 · engineSide 129 |
| General | 2092 | lastN 766 · symPf 688 · duplicate 528 · engineSide 110 |
| Micro | 1402 | engineSide 1018 · lastN 285 · crowd 58 · symPf 41 |
| Wide | 527 | engineSide 241 · lastN 219 · symPf 67 |

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
| Micro | 2.78 | – | – | – | – | 6 |
| Short | 1.47 | 1.88 | 1.28 | 1.46 | 0.78 | 165 |
| General | 1.39 | 0.63 | 0.45 | 0.27 | 0.44 | 27 |
| Long | 1.43 | 1.42 | 0.99 | 4.75 | 3.34 | 19 |
| Wide | 1.45 | – | – | – | – | 0 |
| Signals | 1.09 | 0.72 | 0.66 | 1.47 | 2.04 | 626 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (9230 of 165837 evaluated, 189943 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3342 units active at the run start, 3885 over the run, 3040 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 1817 | 259 (14 %) | 522 | 91 % | 1.47 | 49.00 |
| Micro | trailing | 2360 | 397 (17 %) | 738 | 80 % | 1.48 | 60.62 |
| Short | normal | 1051 | 332 (32 %) | 1044 | 77 % | 2.35 | 1024.70 |
| Short | trailing | 1890 | 603 (32 %) | 1717 | 77 % | 2.33 | 1399.96 |
| General | normal | 520 | 51 (10 %) | 320 | 36 % | 0.65 | -214.00 |
| General | trailing | 307 | 30 (10 %) | 141 | 57 % | 1.27 | 46.41 |
| Long | normal | 657 | 62 (9 %) | 277 | 34 % | 0.70 | -216.90 |
| Long | trailing | 316 | 34 (11 %) | 96 | 70 % | 1.28 | 41.49 |
| Wide | axis | 312 | 75 (24 %) | 345 | 38 % | 1.98 | 216.91 |
| Signals | normal | 1533 | 717 (47 %) | 6834 | 65 % | 0.87 | -2016.80 |
| Signals | trailing | 1507 | 1104 (73 %) | 5505 | 79 % | 1.53 | 3702.38 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 4177 | 656 (16 %) | 1260 | 84 % | 1.47 | 109.62 |
| Short | active | 71 | 28 (39 %) | 32 | 94 % | 14.46 | 64.60 |
| Short | bollinger | 278 | 128 (46 %) | 284 | 95 % | 11.76 | 510.06 |
| Short | break | 424 | 101 (24 %) | 146 | 88 % | 4.10 | 122.49 |
| Short | channel | 127 | 2 (2 %) | 17 | 47 % | 0.57 | -11.49 |
| Short | direction | 183 | 14 (8 %) | 161 | 27 % | 0.28 | -241.71 |
| Short | ema | 340 | 41 (12 %) | 263 | 36 % | 0.42 | -272.38 |
| Short | ichimoku | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 41 | 2 (5 %) | 26 | 23 % | 0.20 | -38.00 |
| Short | move | 144 | 46 (32 %) | 164 | 76 % | 2.29 | 121.03 |
| Short | osc | 1184 | 533 (45 %) | 1509 | 85 % | 4.18 | 2033.10 |
| Short | rsi | 43 | 31 (72 %) | 118 | 86 % | 3.49 | 139.24 |
| Short | smooth | 31 | 4 (13 %) | 30 | 53 % | 0.88 | -5.10 |
| Short | trend | 28 | 5 (18 %) | 9 | 78 % | 1.95 | 6.81 |
| Short | volume | 43 | 0 (0 %) | 2 | 0 % | 0.00 | -4.00 |
| General | active | 18 | 8 (44 %) | 16 | 50 % | 1.71 | 12.00 |
| General | bollinger | 17 | 0 (0 %) | 5 | 0 % | 0.00 | -11.36 |
| General | break | 107 | 12 (11 %) | 47 | 55 % | 1.61 | 33.73 |
| General | channel | 38 | 2 (5 %) | 12 | 50 % | 0.81 | -4.19 |
| General | direction | 114 | 0 (0 %) | 68 | 0 % | 0.00 | -205.20 |
| General | ema | 99 | 0 (0 %) | 63 | 0 % | 0.00 | -187.90 |
| General | ichimoku | 5 | 1 (20 %) | 13 | 54 % | 1.72 | 7.51 |
| General | macd | 8 | 0 (0 %) | 2 | 0 % | 0.00 | -4.80 |
| General | move | 70 | 6 (9 %) | 39 | 56 % | 0.99 | -0.82 |
| General | osc | 254 | 47 (19 %) | 151 | 77 % | 4.38 | 299.48 |
| General | rsi | 12 | 4 (33 %) | 9 | 78 % | 2.51 | 10.27 |
| General | smooth | 31 | 0 (0 %) | 13 | 0 % | 0.00 | -41.20 |
| General | trend | 37 | 1 (3 %) | 17 | 12 % | 0.08 | -57.42 |
| General | volume | 17 | 0 (0 %) | 6 | 0 % | 0.00 | -17.70 |
| Long | active | 14 | 3 (21 %) | 15 | 20 % | 0.40 | -21.00 |
| Long | bollinger | 19 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 173 | 33 (19 %) | 111 | 61 % | 1.27 | 57.85 |
| Long | channel | 34 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 113 | 0 (0 %) | 60 | 0 % | 0.00 | -248.60 |
| Long | ema | 74 | 0 (0 %) | 24 | 0 % | 0.00 | -67.80 |
| Long | ichimoku | 18 | 8 (44 %) | 35 | 54 % | 1.32 | 22.46 |
| Long | macd | 18 | 0 (0 %) | 6 | 0 % | 0.00 | -17.00 |
| Long | move | 127 | 19 (15 %) | 27 | 78 % | 4.71 | 79.34 |
| Long | osc | 261 | 31 (12 %) | 46 | 98 % | 62.04 | 183.13 |
| Long | rsi | 8 | 0 (0 %) | 5 | 20 % | 0.03 | -13.99 |
| Long | smooth | 48 | 0 (0 %) | 7 | 0 % | 0.00 | -20.20 |
| Long | trend | 62 | 2 (3 %) | 37 | 11 % | 0.15 | -129.60 |
| Long | volume | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | active | 24 | 6 (25 %) | 18 | 83 % | 7.63 | 35.68 |
| Wide | bollinger | 30 | 3 (10 %) | 30 | 10 % | 0.21 | -10.21 |
| Wide | break | 14 | 0 (0 %) | 3 | 0 % | 0.00 | -2.34 |
| Wide | direction | 32 | 9 (28 %) | 24 | 63 % | 1.07 | 0.64 |
| Wide | ema | 13 | 0 (0 %) | 8 | 50 % | 0.28 | -9.89 |
| Wide | macd | 1 | 0 (0 %) | 2 | 0 % | 0.00 | -2.37 |
| Wide | move | 27 | 15 (56 %) | 120 | 39 % | 1.99 | 54.81 |
| Wide | osc | 62 | 8 (13 %) | 47 | 23 % | 0.62 | -8.62 |
| Wide | rsi | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | smooth | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 51 | 16 (31 %) | 24 | 71 % | 0.48 | -11.74 |
| Wide | volume | 43 | 18 (42 %) | 69 | 26 % | 3.26 | 170.96 |
| Signals | signal:act-burst | 56 | 41 (73 %) | 330 | 77 % | 1.93 | 342.26 |
| Signals | signal:act-hf | 49 | 13 (27 %) | 303 | 58 % | 0.56 | -335.69 |
| Signals | signal:adx | 56 | 44 (79 %) | 230 | 80 % | 1.74 | 216.70 |
| Signals | signal:atr-break | 56 | 30 (54 %) | 296 | 65 % | 0.95 | -25.49 |
| Signals | signal:bollinger | 60 | 23 (38 %) | 249 | 72 % | 0.85 | -111.69 |
| Signals | signal:cci | 59 | 27 (46 %) | 331 | 76 % | 1.07 | 49.64 |
| Signals | signal:cmf | 47 | 8 (17 %) | 182 | 55 % | 0.42 | -334.11 |
| Signals | signal:donchian | 41 | 19 (46 %) | 128 | 52 % | 0.76 | -62.29 |
| Signals | signal:ema-cross | 46 | 46 (100 %) | 101 | 99 % | 3591.02 | 283.22 |
| Signals | signal:ema-cross-fast | 57 | 44 (77 %) | 261 | 83 % | 2.23 | 342.50 |
| Signals | signal:ema-pullback | 50 | 38 (76 %) | 212 | 76 % | 1.51 | 128.81 |
| Signals | signal:ema-slope | 44 | 34 (77 %) | 94 | 80 % | 1.79 | 79.23 |
| Signals | signal:ema-trend | 58 | 48 (83 %) | 302 | 82 % | 1.71 | 266.10 |
| Signals | signal:heikin-ashi | 52 | 18 (35 %) | 327 | 65 % | 0.71 | -219.72 |
| Signals | signal:hma | 54 | 27 (50 %) | 247 | 60 % | 0.79 | -113.62 |
| Signals | signal:ichimoku | 47 | 16 (34 %) | 127 | 53 % | 0.44 | -253.12 |
| Signals | signal:impulse | 55 | 14 (25 %) | 188 | 41 % | 0.27 | -564.92 |
| Signals | signal:kama | 56 | 38 (68 %) | 316 | 73 % | 1.17 | 92.50 |
| Signals | signal:keltner | 47 | 29 (62 %) | 129 | 62 % | 1.02 | 3.97 |
| Signals | signal:macd-cross | 52 | 35 (67 %) | 268 | 75 % | 1.45 | 172.15 |
| Signals | signal:macd-hist | 50 | 40 (80 %) | 257 | 77 % | 1.70 | 214.31 |
| Signals | signal:macd-slow | 54 | 34 (63 %) | 246 | 69 % | 1.07 | 29.70 |
| Signals | signal:mfi | 26 | 25 (96 %) | 26 | 96 % | 18.08 | 67.45 |
| Signals | signal:obv | 60 | 57 (95 %) | 315 | 87 % | 4.73 | 651.96 |
| Signals | signal:r-awesome | 53 | 21 (40 %) | 209 | 60 % | 0.54 | -242.43 |
| Signals | signal:r-connors | 45 | 28 (62 %) | 112 | 75 % | 1.17 | 34.90 |
| Signals | signal:r-fractal | 38 | 5 (13 %) | 95 | 37 % | 0.19 | -314.79 |
| Signals | signal:r-inside | 30 | 27 (90 %) | 60 | 87 % | 5.72 | 149.39 |
| Signals | signal:r-linreg | 53 | 39 (74 %) | 267 | 77 % | 1.92 | 242.19 |
| Signals | signal:r-nr-break | 39 | 5 (13 %) | 172 | 50 % | 0.32 | -350.27 |
| Signals | signal:r-session-trend | 60 | 34 (57 %) | 421 | 74 % | 1.17 | 136.96 |
| Signals | signal:r-vol-regime | 40 | 38 (95 %) | 52 | 92 % | 42.25 | 177.68 |
| Signals | signal:reclaim | 59 | 55 (93 %) | 309 | 85 % | 3.03 | 484.42 |
| Signals | signal:rsi-mid | 52 | 31 (60 %) | 203 | 67 % | 0.94 | -21.44 |
| Signals | signal:rsi-momentum | 21 | 20 (95 %) | 21 | 95 % | 154.22 | 50.55 |
| Signals | signal:rsi-reversal | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 9.48 |
| Signals | signal:s2-active-hf | 54 | 38 (70 %) | 394 | 72 % | 1.37 | 218.30 |
| Signals | signal:s2-adx-gate | 56 | 28 (50 %) | 268 | 72 % | 1.09 | 39.10 |
| Signals | signal:s2-atr-break | 56 | 10 (18 %) | 281 | 51 % | 0.37 | -568.43 |
| Signals | signal:s2-bb-bounce | 60 | 55 (92 %) | 151 | 88 % | 8.23 | 402.40 |
| Signals | signal:s2-block-scale | 56 | 22 (39 %) | 341 | 70 % | 0.77 | -157.89 |
| Signals | signal:s2-block-stack | 49 | 20 (41 %) | 192 | 66 % | 0.60 | -198.55 |
| Signals | signal:s2-confluence | 53 | 38 (72 %) | 302 | 75 % | 1.63 | 225.22 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 |
| Signals | signal:s2-range-break | 48 | 38 (79 %) | 92 | 85 % | 2.13 | 110.15 |
| Signals | signal:s2-range-shift | 52 | 18 (35 %) | 159 | 52 % | 0.48 | -245.11 |
| Signals | signal:s2-rsi-revert | 46 | 43 (93 %) | 82 | 94 % | 12.22 | 204.62 |
| Signals | signal:s2-st-trail | 30 | 17 (57 %) | 35 | 49 % | 0.18 | -92.21 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 325 | 94 % | 16.64 | 1041.25 |
| Signals | signal:s2-vol-break | 50 | 28 (56 %) | 107 | 70 % | 0.98 | -3.60 |
| Signals | signal:sar | 55 | 40 (73 %) | 278 | 75 % | 1.53 | 189.40 |
| Signals | signal:squeeze | 45 | 9 (20 %) | 59 | 19 % | 0.03 | -400.18 |
| Signals | signal:st-slow | 29 | 16 (55 %) | 44 | 52 % | 0.36 | -80.65 |
| Signals | signal:stoch-rsi | 57 | 47 (82 %) | 399 | 78 % | 2.05 | 382.57 |
| Signals | signal:supertrend | 48 | 31 (65 %) | 163 | 74 % | 1.39 | 101.10 |
| Signals | signal:swing | 51 | 17 (33 %) | 280 | 66 % | 0.57 | -272.12 |
| Signals | signal:thrust | 55 | 18 (33 %) | 267 | 65 % | 0.52 | -347.27 |
| Signals | signal:trix | 43 | 0 (0 %) | 66 | 29 % | 0.08 | -426.09 |
| Signals | signal:volume-break | 51 | 44 (86 %) | 56 | 88 % | 6.81 | 154.93 |
| Signals | signal:vwap | 59 | 45 (76 %) | 172 | 76 % | 1.42 | 112.15 |
| Signals | signal:williams-r | 60 | 43 (72 %) | 217 | 77 % | 1.55 | 230.83 |
| Signals | signal:zscore | 60 | 12 (20 %) | 188 | 64 % | 0.54 | -341.46 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 39860 | 35612 | 4177 | 1.00 | 4.00 | 78.75–163.33 (median 163.33) | 3558 | 16274 | 693 | 5532 | 2343 | 416 | 2326 | 0 | 293 | 0 | 0 | 0 | 4248 |  |
| Short | 39114 | 35226 | 2941 | 1.25 | 1.94 | 163.33–163.33 (median 163.33) | 2998 | 7342 | 1611 | 6486 | 4442 | 3386 | 5525 | 30 | 458 | 7 | 0 | 0 | 3888 |  |
| General | 15756 | 14316 | 827 | 1.24 | 2.09 | 163.33–163.33 (median 163.33) | 951 | 2980 | 912 | 2639 | 1752 | 1013 | 2864 | 0 | 298 | 80 | 0 | 0 | 1440 |  |
| Long | 25783 | 23983 | 973 | 1.15 | 2.21 | 163.33–163.33 (median 163.33) | 1474 | 6768 | 1853 | 4424 | 3098 | 1076 | 3950 | 0 | 273 | 94 | 0 | 0 | 1800 |  |
| Wide | 69430 | 56700 | 312 | 0.64 | 2.57 | 20.42–163.33 (median 163.33) | 11304 | 38385 | 972 | 3342 | 1040 | 389 | 794 | 0 | 139 | 23 | 0 | 10480 | 2250 |  |
| Signals | 3780 | – | 3342 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 3342 units (pair × symbol × direction) active at the run start, 3885 over the run; 3040 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 13302 | 2586 (19 %) | 10568 | 75 % | 0.79 | -696.47 |
| Micro | trailing | 26558 | 4460 (17 %) | 21992 | 60 % | 0.61 | -2730.32 |
| Short | normal | 13061 | 4354 (33 %) | 19673 | 71 % | 1.64 | 11419.40 |
| Short | trailing | 26053 | 9056 (35 %) | 42824 | 69 % | 1.66 | 22014.81 |
| General | normal | 9449 | 1908 (20 %) | 13912 | 45 % | 1.02 | 505.50 |
| General | trailing | 6307 | 1311 (21 %) | 7394 | 59 % | 1.11 | 1237.54 |
| Long | normal | 15460 | 2737 (18 %) | 16981 | 39 % | 0.86 | -5896.70 |
| Long | trailing | 10323 | 1868 (18 %) | 8353 | 57 % | 0.95 | -915.07 |
| Wide | axis | 58950 | 11464 (19 %) | 139281 | 30 % | 0.84 | -15895.87 |
| Wide | dca | 5240 | 1582 (30 %) | 11074 | 72 % | 0.86 | -2075.63 |
| Wide | dca-active | 5240 | 1092 (21 %) | 8005 | 37 % | 0.75 | -1647.26 |
| Signals | normal | 1890 | 995 (53 %) | 14797 | 69 % | 1.06 | 1769.35 |
| Signals | trailing | 1890 | 1346 (71 %) | 12575 | 78 % | 1.82 | 11944.18 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 4177 | 656 (16 %) | 1260 | 84 % | 1.47 | 109.62 |
| Short | active | 71 | 28 (39 %) | 32 | 94 % | 14.46 | 64.60 |
| Short | bollinger | 278 | 128 (46 %) | 284 | 95 % | 11.76 | 510.06 |
| Short | break | 424 | 101 (24 %) | 146 | 88 % | 4.10 | 122.49 |
| Short | channel | 127 | 2 (2 %) | 17 | 47 % | 0.57 | -11.49 |
| Short | direction | 183 | 14 (8 %) | 161 | 27 % | 0.28 | -241.71 |
| Short | ema | 340 | 41 (12 %) | 263 | 36 % | 0.42 | -272.38 |
| Short | ichimoku | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 41 | 2 (5 %) | 26 | 23 % | 0.20 | -38.00 |
| Short | move | 144 | 46 (32 %) | 164 | 76 % | 2.29 | 121.03 |
| Short | osc | 1184 | 533 (45 %) | 1509 | 85 % | 4.18 | 2033.10 |
| Short | rsi | 43 | 31 (72 %) | 118 | 86 % | 3.49 | 139.24 |
| Short | smooth | 31 | 4 (13 %) | 30 | 53 % | 0.88 | -5.10 |
| Short | trend | 28 | 5 (18 %) | 9 | 78 % | 1.95 | 6.81 |
| Short | volume | 43 | 0 (0 %) | 2 | 0 % | 0.00 | -4.00 |
| General | active | 18 | 8 (44 %) | 16 | 50 % | 1.71 | 12.00 |
| General | bollinger | 17 | 0 (0 %) | 5 | 0 % | 0.00 | -11.36 |
| General | break | 107 | 12 (11 %) | 47 | 55 % | 1.61 | 33.73 |
| General | channel | 38 | 2 (5 %) | 12 | 50 % | 0.81 | -4.19 |
| General | direction | 114 | 0 (0 %) | 68 | 0 % | 0.00 | -205.20 |
| General | ema | 99 | 0 (0 %) | 63 | 0 % | 0.00 | -187.90 |
| General | ichimoku | 5 | 1 (20 %) | 13 | 54 % | 1.72 | 7.51 |
| General | macd | 8 | 0 (0 %) | 2 | 0 % | 0.00 | -4.80 |
| General | move | 70 | 6 (9 %) | 39 | 56 % | 0.99 | -0.82 |
| General | osc | 254 | 47 (19 %) | 151 | 77 % | 4.38 | 299.48 |
| General | rsi | 12 | 4 (33 %) | 9 | 78 % | 2.51 | 10.27 |
| General | smooth | 31 | 0 (0 %) | 13 | 0 % | 0.00 | -41.20 |
| General | trend | 37 | 1 (3 %) | 17 | 12 % | 0.08 | -57.42 |
| General | volume | 17 | 0 (0 %) | 6 | 0 % | 0.00 | -17.70 |
| Long | active | 14 | 3 (21 %) | 15 | 20 % | 0.40 | -21.00 |
| Long | bollinger | 19 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 173 | 33 (19 %) | 111 | 61 % | 1.27 | 57.85 |
| Long | channel | 34 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 113 | 0 (0 %) | 60 | 0 % | 0.00 | -248.60 |
| Long | ema | 74 | 0 (0 %) | 24 | 0 % | 0.00 | -67.80 |
| Long | ichimoku | 18 | 8 (44 %) | 35 | 54 % | 1.32 | 22.46 |
| Long | macd | 18 | 0 (0 %) | 6 | 0 % | 0.00 | -17.00 |
| Long | move | 127 | 19 (15 %) | 27 | 78 % | 4.71 | 79.34 |
| Long | osc | 261 | 31 (12 %) | 46 | 98 % | 62.04 | 183.13 |
| Long | rsi | 8 | 0 (0 %) | 5 | 20 % | 0.03 | -13.99 |
| Long | smooth | 48 | 0 (0 %) | 7 | 0 % | 0.00 | -20.20 |
| Long | trend | 62 | 2 (3 %) | 37 | 11 % | 0.15 | -129.60 |
| Long | volume | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | active | 24 | 6 (25 %) | 18 | 83 % | 7.63 | 35.68 |
| Wide | bollinger | 30 | 3 (10 %) | 30 | 10 % | 0.21 | -10.21 |
| Wide | break | 14 | 0 (0 %) | 3 | 0 % | 0.00 | -2.34 |
| Wide | direction | 32 | 9 (28 %) | 24 | 63 % | 1.07 | 0.64 |
| Wide | ema | 13 | 0 (0 %) | 8 | 50 % | 0.28 | -9.89 |
| Wide | macd | 1 | 0 (0 %) | 2 | 0 % | 0.00 | -2.37 |
| Wide | move | 27 | 15 (56 %) | 120 | 39 % | 1.99 | 54.81 |
| Wide | osc | 62 | 8 (13 %) | 47 | 23 % | 0.62 | -8.62 |
| Wide | rsi | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | smooth | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 51 | 16 (31 %) | 24 | 71 % | 0.48 | -11.74 |
| Wide | volume | 43 | 18 (42 %) | 69 | 26 % | 3.26 | 170.96 |
| Signals | signal:act-burst | 56 | 41 (73 %) | 330 | 77 % | 1.93 | 342.26 |
| Signals | signal:act-hf | 49 | 13 (27 %) | 303 | 58 % | 0.56 | -335.69 |
| Signals | signal:adx | 56 | 44 (79 %) | 230 | 80 % | 1.74 | 216.70 |
| Signals | signal:atr-break | 56 | 30 (54 %) | 296 | 65 % | 0.95 | -25.49 |
| Signals | signal:bollinger | 60 | 23 (38 %) | 249 | 72 % | 0.85 | -111.69 |
| Signals | signal:cci | 59 | 27 (46 %) | 331 | 76 % | 1.07 | 49.64 |
| Signals | signal:cmf | 47 | 8 (17 %) | 182 | 55 % | 0.42 | -334.11 |
| Signals | signal:donchian | 41 | 19 (46 %) | 128 | 52 % | 0.76 | -62.29 |
| Signals | signal:ema-cross | 46 | 46 (100 %) | 101 | 99 % | 3591.02 | 283.22 |
| Signals | signal:ema-cross-fast | 57 | 44 (77 %) | 261 | 83 % | 2.23 | 342.50 |
| Signals | signal:ema-pullback | 50 | 38 (76 %) | 212 | 76 % | 1.51 | 128.81 |
| Signals | signal:ema-slope | 44 | 34 (77 %) | 94 | 80 % | 1.79 | 79.23 |
| Signals | signal:ema-trend | 58 | 48 (83 %) | 302 | 82 % | 1.71 | 266.10 |
| Signals | signal:heikin-ashi | 52 | 18 (35 %) | 327 | 65 % | 0.71 | -219.72 |
| Signals | signal:hma | 54 | 27 (50 %) | 247 | 60 % | 0.79 | -113.62 |
| Signals | signal:ichimoku | 47 | 16 (34 %) | 127 | 53 % | 0.44 | -253.12 |
| Signals | signal:impulse | 55 | 14 (25 %) | 188 | 41 % | 0.27 | -564.92 |
| Signals | signal:kama | 56 | 38 (68 %) | 316 | 73 % | 1.17 | 92.50 |
| Signals | signal:keltner | 47 | 29 (62 %) | 129 | 62 % | 1.02 | 3.97 |
| Signals | signal:macd-cross | 52 | 35 (67 %) | 268 | 75 % | 1.45 | 172.15 |
| Signals | signal:macd-hist | 50 | 40 (80 %) | 257 | 77 % | 1.70 | 214.31 |
| Signals | signal:macd-slow | 54 | 34 (63 %) | 246 | 69 % | 1.07 | 29.70 |
| Signals | signal:mfi | 26 | 25 (96 %) | 26 | 96 % | 18.08 | 67.45 |
| Signals | signal:obv | 60 | 57 (95 %) | 315 | 87 % | 4.73 | 651.96 |
| Signals | signal:r-awesome | 53 | 21 (40 %) | 209 | 60 % | 0.54 | -242.43 |
| Signals | signal:r-connors | 45 | 28 (62 %) | 112 | 75 % | 1.17 | 34.90 |
| Signals | signal:r-fractal | 38 | 5 (13 %) | 95 | 37 % | 0.19 | -314.79 |
| Signals | signal:r-inside | 30 | 27 (90 %) | 60 | 87 % | 5.72 | 149.39 |
| Signals | signal:r-linreg | 53 | 39 (74 %) | 267 | 77 % | 1.92 | 242.19 |
| Signals | signal:r-nr-break | 39 | 5 (13 %) | 172 | 50 % | 0.32 | -350.27 |
| Signals | signal:r-session-trend | 60 | 34 (57 %) | 421 | 74 % | 1.17 | 136.96 |
| Signals | signal:r-vol-regime | 40 | 38 (95 %) | 52 | 92 % | 42.25 | 177.68 |
| Signals | signal:reclaim | 59 | 55 (93 %) | 309 | 85 % | 3.03 | 484.42 |
| Signals | signal:rsi-mid | 52 | 31 (60 %) | 203 | 67 % | 0.94 | -21.44 |
| Signals | signal:rsi-momentum | 21 | 20 (95 %) | 21 | 95 % | 154.22 | 50.55 |
| Signals | signal:rsi-reversal | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 9.48 |
| Signals | signal:s2-active-hf | 54 | 38 (70 %) | 394 | 72 % | 1.37 | 218.30 |
| Signals | signal:s2-adx-gate | 56 | 28 (50 %) | 268 | 72 % | 1.09 | 39.10 |
| Signals | signal:s2-atr-break | 56 | 10 (18 %) | 281 | 51 % | 0.37 | -568.43 |
| Signals | signal:s2-bb-bounce | 60 | 55 (92 %) | 151 | 88 % | 8.23 | 402.40 |
| Signals | signal:s2-block-scale | 56 | 22 (39 %) | 341 | 70 % | 0.77 | -157.89 |
| Signals | signal:s2-block-stack | 49 | 20 (41 %) | 192 | 66 % | 0.60 | -198.55 |
| Signals | signal:s2-confluence | 53 | 38 (72 %) | 302 | 75 % | 1.63 | 225.22 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 |
| Signals | signal:s2-range-break | 48 | 38 (79 %) | 92 | 85 % | 2.13 | 110.15 |
| Signals | signal:s2-range-shift | 52 | 18 (35 %) | 159 | 52 % | 0.48 | -245.11 |
| Signals | signal:s2-rsi-revert | 46 | 43 (93 %) | 82 | 94 % | 12.22 | 204.62 |
| Signals | signal:s2-st-trail | 30 | 17 (57 %) | 35 | 49 % | 0.18 | -92.21 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 325 | 94 % | 16.64 | 1041.25 |
| Signals | signal:s2-vol-break | 50 | 28 (56 %) | 107 | 70 % | 0.98 | -3.60 |
| Signals | signal:sar | 55 | 40 (73 %) | 278 | 75 % | 1.53 | 189.40 |
| Signals | signal:squeeze | 45 | 9 (20 %) | 59 | 19 % | 0.03 | -400.18 |
| Signals | signal:st-slow | 29 | 16 (55 %) | 44 | 52 % | 0.36 | -80.65 |
| Signals | signal:stoch-rsi | 57 | 47 (82 %) | 399 | 78 % | 2.05 | 382.57 |
| Signals | signal:supertrend | 48 | 31 (65 %) | 163 | 74 % | 1.39 | 101.10 |
| Signals | signal:swing | 51 | 17 (33 %) | 280 | 66 % | 0.57 | -272.12 |
| Signals | signal:thrust | 55 | 18 (33 %) | 267 | 65 % | 0.52 | -347.27 |
| Signals | signal:trix | 43 | 0 (0 %) | 66 | 29 % | 0.08 | -426.09 |
| Signals | signal:volume-break | 51 | 44 (86 %) | 56 | 88 % | 6.81 | 154.93 |
| Signals | signal:vwap | 59 | 45 (76 %) | 172 | 76 % | 1.42 | 112.15 |
| Signals | signal:williams-r | 60 | 43 (72 %) | 217 | 77 % | 1.55 | 230.83 |
| Signals | signal:zscore | 60 | 12 (20 %) | 188 | 64 % | 0.54 | -341.46 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 16 | 12 (75 %) | 64 | 94 % | 12.70 | 20.82 |
| Micro | 1.25 | 12 | 8 (67 %) | 44 | 91 % | 8.20 | 12.82 |
| Micro | 1.35 | 12 | 8 (67 %) | 44 | 91 % | 8.20 | 12.82 |
| Micro | 1.5 | 6 | 6 (100 %) | 32 | 100 % | ∞ (no loss) | 11.40 |
| Micro | 1.75 | 2 | 2 (100 %) | 14 | 100 % | ∞ (no loss) | 4.90 |
| Short | 1.1 | 1394 | 553 (40 %) | 2202 | 74 % | 2.00 | 1633.82 |
| Short | 1.25 | 1230 | 475 (39 %) | 1907 | 73 % | 1.89 | 1295.44 |
| Short | 1.35 | 1086 | 429 (40 %) | 1705 | 74 % | 1.99 | 1227.65 |
| Short | 1.5 | 854 | 353 (41 %) | 1346 | 75 % | 2.08 | 1007.00 |
| Short | 1.75 | 550 | 242 (44 %) | 867 | 79 % | 2.54 | 768.65 |
| Short | 2 | 328 | 155 (47 %) | 492 | 82 % | 3.01 | 481.05 |
| General | 1.1 | 296 | 53 (18 %) | 346 | 45 % | 0.84 | -97.00 |
| General | 1.25 | 235 | 49 (21 %) | 288 | 48 % | 0.97 | -15.81 |
| General | 1.35 | 185 | 45 (24 %) | 234 | 53 % | 1.17 | 57.78 |
| General | 1.5 | 132 | 41 (31 %) | 181 | 61 % | 1.65 | 138.79 |
| General | 1.75 | 51 | 16 (31 %) | 60 | 60 % | 1.64 | 49.05 |
| General | 2 | 25 | 7 (28 %) | 25 | 60 % | 1.39 | 14.73 |
| Long | 1.1 | 307 | 73 (24 %) | 271 | 47 % | 0.99 | -4.01 |
| Long | 1.25 | 258 | 62 (24 %) | 229 | 47 % | 1.02 | 9.79 |
| Long | 1.35 | 217 | 55 (25 %) | 189 | 49 % | 1.12 | 42.55 |
| Long | 1.5 | 142 | 43 (30 %) | 124 | 57 % | 1.42 | 91.09 |
| Long | 1.75 | 73 | 25 (34 %) | 65 | 68 % | 1.87 | 86.53 |
| Long | 2 | 43 | 19 (44 %) | 48 | 65 % | 1.64 | 49.53 |
| Wide | 1.1 | 47 | 22 (47 %) | 56 | 73 % | 2.02 | 21.55 |
| Wide | 1.25 | 47 | 22 (47 %) | 56 | 73 % | 2.02 | 21.55 |
| Wide | 1.35 | 47 | 22 (47 %) | 56 | 73 % | 2.02 | 21.55 |
| Wide | 1.5 | 38 | 16 (42 %) | 47 | 74 % | 2.08 | 20.27 |
| Wide | 1.75 | 21 | 10 (48 %) | 39 | 72 % | 1.97 | 16.90 |
| Wide | 2 | 5 | 2 (40 %) | 10 | 60 % | 1.00 | 0.02 |
| Signals | 1.1 | 1497 | 992 (66 %) | 6105 | 76 % | 1.37 | 3610.21 |
| Signals | 1.25 | 1082 | 753 (70 %) | 4421 | 78 % | 1.50 | 3268.45 |
| Signals | 1.35 | 830 | 575 (69 %) | 3374 | 78 % | 1.49 | 2496.60 |
| Signals | 1.5 | 588 | 411 (70 %) | 2392 | 79 % | 1.56 | 1968.63 |
| Signals | 1.75 | 325 | 226 (70 %) | 1379 | 79 % | 1.58 | 1141.63 |
| Signals | 2 | 191 | 135 (71 %) | 831 | 79 % | 1.57 | 690.04 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | magnet | mc-rsit4-25@m30 | 396 | 340 (86 %) | 396 | 86 % | 32.12 | 76.73 | – |
| Micro | magnet | mc-lag-12@m5 | 54 | 54 (100 %) | 170 | 95 % | 13.68 | 56.97 | – |
| Micro | pivot | mc-lag-3@m15 | 48 | 48 (100 %) | 96 | 100 % | ∞ (no loss) | 36.00 | – |
| Micro | ribbon | mc-lag-6@m15 | 26 | 26 (100 %) | 52 | 100 % | ∞ (no loss) | 19.60 | – |
| Micro | pulse | mc-lag-6@m5 | 24 | 24 (100 %) | 58 | 86 % | 5.64 | 16.72 | – |
| Micro | sweep | mc-rsi3-10@m15c | 6 | 6 (100 %) | 30 | 100 % | ∞ (no loss) | 12.00 | tp0.6 sl2.7 tr0 h64 mc (5 · ∞ (no loss) · 2.00) |
| Micro | revert | mc-trsi2-10@m5c | 4 | 4 (100 %) | 28 | 100 % | ∞ (no loss) | 9.80 | tp0.55 sl2.6125 tr0 h192 mc (7 · ∞ (no loss) · 2.45) |
| Micro | pivot | mc-trsi2-10@m15c | 32 | 32 (100 %) | 32 | 100 % | ∞ (no loss) | 8.11 | – |
| Micro | sweep | mc-rsi4-10@m5 | 21 | 21 (100 %) | 21 | 100 % | ∞ (no loss) | 7.35 | – |
| Micro | sweep | mc-lag-6@m15 | 8 | 8 (100 %) | 32 | 81 % | 2.43 | 3.58 | – |
| Micro | sweep | mc-rsi2-5@m15c | 8 | 4 (50 %) | 16 | 75 % | 2.70 | 3.02 | – |
| Micro | clamp | mc-trsi2-10@m5 | 36 | 24 (67 %) | 72 | 83 % | 0.69 | -10.25 | – |
| Micro | follow | mc-rsit5-30@m5c | 34 | 12 (35 %) | 34 | 35 % | 0.28 | -10.40 | – |
| Micro | ribbon | mc-trsi2-10@m5 | 30 | 18 (60 %) | 60 | 80 % | 0.55 | -15.05 | – |
| Micro | pivot | mc-trsi2-10@m5 | 31 | 18 (58 %) | 62 | 79 % | 0.52 | -17.38 | – |
| Micro | sweep | mc-rsi3-10@m5c | 30 | 12 (40 %) | 44 | 50 % | 0.14 | -22.42 | – |
| Micro | magnet | mc-trsi2-10@m5 | 19 | 5 (26 %) | 38 | 63 % | 0.26 | -25.41 | – |
| Micro | sweep | mc-qrsi2-5@m5 | 19 | 0 (0 %) | 19 | 0 % | 0.00 | -39.37 | – |
| Short | sweep | willr-21-95@m15 | 34 | 34 (100 %) | 178 | 96 % | 73.84 | 348.31 | tp2.8 sl4.2 tr0 h64 sh (5 · ∞ (no loss) · 13.00) |
| Short | magnet | bb-bounce-50-2@m15c | 39 | 39 (100 %) | 156 | 100 % | ∞ (no loss) | 340.80 | – |
| Short | magnet | z-50-2@m15c | 39 | 39 (100 %) | 156 | 100 % | ∞ (no loss) | 340.80 | – |
| Short | magnet | bb-bounce-50-2@m30 | 62 | 62 (100 %) | 62 | 100 % | ∞ (no loss) | 122.00 | – |
| Short | magnet | cci-40-200@m30 | 62 | 62 (100 %) | 62 | 100 % | ∞ (no loss) | 122.00 | – |
| Short | magnet | z-50-2@m30 | 62 | 62 (100 %) | 62 | 100 % | ∞ (no loss) | 122.00 | – |
| Short | ribbon | willr-28-95@m15c | 25 | 25 (100 %) | 47 | 100 % | ∞ (no loss) | 121.43 | – |
| Short | sweep | willr-28-95@m15 | 10 | 10 (100 %) | 52 | 100 % | ∞ (no loss) | 107.24 | tp2.8 sl5.6 tr0 h64 sh (5 · ∞ (no loss) · 13.00) |
| Short | magnet | willr-50-80@m15c | 24 | 24 (100 %) | 71 | 86 % | 4.90 | 104.61 | – |
| Short | sweep | willr-21-95@m15c | 15 | 15 (100 %) | 44 | 98 % | 5729.84 | 90.19 | – |
| Short | revert | rsi-mom-10-25@m30 | 7 | 7 (100 %) | 45 | 93 % | 6.74 | 83.80 | tp2.8 sl4.2 tr0 h32 sh (6 · ∞ (no loss) · 15.60) |
| Short | ribbon | willr-21-95@m15c | 16 | 16 (100 %) | 30 | 100 % | ∞ (no loss) | 69.80 | – |
| Short | magnet | cci-40-100@m15c | 5 | 5 (100 %) | 28 | 96 % | 22.94 | 65.83 | tp2.8 sl5.6 tr1.4 h64 sh (7 · ∞ (no loss) · 16.83) |
| Short | sweep | act-burst-2.5@x4@m30 | 29 | 27 (93 %) | 31 | 94 % | 13.92 | 62.00 | – |
| Short | pivot | r-zdist@m15c | 6 | 6 (100 %) | 50 | 92 % | 8.17 | 61.54 | tp2 sl4 tr1 h64 sh (8 · ∞ (no loss) · 12.02) |
| Short | ribbon | willr-50-95@m15 | 9 | 9 (100 %) | 26 | 100 % | ∞ (no loss) | 59.92 | – |
| Short | sweep | willr-50-95@m15 | 9 | 9 (100 %) | 33 | 100 % | ∞ (no loss) | 57.56 | – |
| Short | magnet | willr-28-80@m15c | 31 | 23 (74 %) | 78 | 72 % | 1.91 | 52.88 | – |
| Short | magnet | r-pin-m@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 46.20 | – |
| Short | magnet | willr-50-90@m15c | 43 | 29 (67 %) | 57 | 75 % | 1.90 | 42.41 | – |
| Short | magnet | willr-50-90@m15 | 26 | 20 (77 %) | 34 | 76 % | 2.44 | 32.81 | – |
| Short | sweep | cci-20-200@m30 | 12 | 12 (100 %) | 22 | 91 % | 50.87 | 32.12 | – |
| Short | magnet | rsi-21-30-70@m15 | 6 | 6 (100 %) | 18 | 100 % | ∞ (no loss) | 31.20 | – |
| Short | pivot | break-squeeze-t25@m15c | 99 | 52 (53 %) | 62 | 84 % | 4.15 | 31.09 | – |
| Short | sweep | willr-7-90@m15 | 3 | 3 (100 %) | 24 | 88 % | 3.29 | 30.45 | tp2.6 sl3.9 tr0 h64 sh (8 · 4.10 · 12.70) |
| Short | sweep | willr-14-95@m15 | 3 | 3 (100 %) | 15 | 100 % | ∞ (no loss) | 28.90 | tp2.4 sl4.8 tr0 h64 sh (5 · ∞ (no loss) · 11.00) |
| Short | sweep | z-50-2.5@m15 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 28.80 | – |
| Short | revert | break-vol-2@x4@m15 | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 26.00 | – |
| Short | ribbon | willr-50-95@m15c | 4 | 4 (100 %) | 11 | 100 % | ∞ (no loss) | 25.74 | – |
| Short | follow | break-vol-2@x4@m15c | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 25.20 | – |
| Short | magnet | willr-21-80@m15c | 37 | 19 (51 %) | 127 | 69 % | 1.22 | 25.08 | – |
| Short | clamp | cci-20-200@m15c | 12 | 12 (100 %) | 16 | 100 % | ∞ (no loss) | 23.87 | – |
| Short | magnet | rsi-div@m15 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 22.06 | – |
| Short | magnet | r-zdist@m15c | 4 | 4 (100 %) | 20 | 80 % | 5.05 | 21.81 | tp1.8 sl3.6 tr0.9 h64 sh (5 · 12.95 · 5.91) |
| Short | ribbon | ema-slope-100@m15 | 63 | 28 (44 %) | 78 | 64 % | 1.26 | 21.70 | – |
| Short | revert | break-don55@m15c | 1 | 1 (100 %) | 9 | 100 % | ∞ (no loss) | 20.49 | tp2.8 sl5.6 tr1.4 h64 sh (9 · ∞ (no loss) · 20.49) |
| Short | sweep | willr-14-80@m15c | 3 | 3 (100 %) | 22 | 73 % | 1.77 | 20.45 | tp2.8 sl4.2 tr2.1 h64 sh (7 · 1.78 · 6.83) |
| Short | sweep | bb-bounce@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 19.20 | – |
| Short | sweep | z-20-2@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 19.20 | – |
| Short | clamp | bb-bounce@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 18.99 | – |
| Short | clamp | z-20-2@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 18.99 | – |
| Short | pivot | willr-50-95@m15 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 18.00 | – |
| Short | magnet | willr-14-80@m15c | 14 | 9 (64 %) | 19 | 74 % | 2.08 | 16.40 | – |
| Short | magnet | willr-14-80@m15 | 12 | 8 (67 %) | 16 | 75 % | 2.34 | 16.40 | – |
| Short | pivot | break-squeeze-t10@m15 | 19 | 18 (95 %) | 18 | 100 % | ∞ (no loss) | 16.29 | – |
| Short | sweep | willr-7-95@m15 | 7 | 7 (100 %) | 19 | 74 % | 2.06 | 15.81 | – |
| Short | pivot | z-50-2.5@x4@m15 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 15.32 | – |
| Short | sweep | willr-14-95@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 13.85 | – |
| Short | magnet | willr-21-80@m15 | 11 | 6 (55 %) | 31 | 81 % | 1.48 | 13.57 | – |
| Short | sweep | willr-14-95@m30 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 12.81 | – |
| Short | follow | r-td-m@m30 | 1 | 1 (100 %) | 6 | 100 % | ∞ (no loss) | 10.80 | tp2 sl2 tr0 h48 sh (6 · ∞ (no loss) · 10.80) |
| Short | ribbon | willr-28-95@m15 | 2 | 2 (100 %) | 6 | 67 % | 334.99 | 10.52 | – |
| Short | magnet | r-zdist-m@m15 | 2 | 2 (100 %) | 10 | 80 % | 3.27 | 10.00 | tp2 sl2 tr1 h64 sh (5 · 3.27 · 5.00) |
| Short | sweep | macd-hist@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 9.60 | – |
| Short | ribbon | willr-28-90@m15c | 1 | 1 (100 %) | 7 | 86 % | 3.34 | 8.91 | tp1.8 sl3.6 tr1.35 h96 sh (7 · 3.34 · 8.91) |
| Short | pivot | break-squeeze-t25@m15 | 25 | 16 (64 %) | 18 | 89 % | 36.83 | 8.08 | – |
| Short | sweep | r-session-trend@m15c | 1 | 1 (100 %) | 5 | 80 % | 29.15 | 5.63 | tp2.6 sl5.2 tr1.3 h96 sh (5 · 29.15 · 5.63) |
| Short | sweep | r-bb-adx@m15 | 46 | 14 (30 %) | 14 | 100 % | ∞ (no loss) | 4.28 | – |
| Short | pivot | willr-50-90@m15c | 2 | 1 (50 %) | 5 | 80 % | 1.92 | 3.51 | – |
| Short | sweep | r-pin-m@m15 | 19 | 8 (42 %) | 9 | 89 % | 22.34 | 3.50 | – |
| Short | ribbon | dir-emax-20-50@m15c | 33 | 12 (36 %) | 44 | 59 % | 1.04 | 2.00 | – |
| Short | revert | bb-walk-50@m15 | 5 | 3 (60 %) | 34 | 62 % | 1.03 | 1.20 | tp2.6 sl5.2 tr0 h64 sh (6 · 2.22 · 6.60) |
| Short | magnet | willr-28-80@m15 | 10 | 4 (40 %) | 29 | 66 % | 1.02 | 0.77 | – |
| Short | follow | rsi-21-30-70@m30 | 2 | 0 (0 %) | 8 | 50 % | 0.87 | -1.60 | – |
| Short | sweep | break-squeeze-30@m30 | 7 | 3 (43 %) | 14 | 71 % | 0.90 | -2.33 | – |
| Short | ribbon | trix-15@m15c | 19 | 4 (21 %) | 30 | 53 % | 0.88 | -5.10 | – |
| Short | clamp | srsi-14-10@m15c | 20 | 11 (55 %) | 60 | 58 % | 0.91 | -6.90 | – |
| Short | ribbon | ema-slope-100@m15c | 41 | 11 (27 %) | 55 | 55 % | 0.88 | -8.80 | – |
| Short | sweep | rsi-fast@m15 | 7 | 1 (14 %) | 28 | 68 % | 0.58 | -12.31 | tp2 sl3 tr1 h64 sh (5 · 1.17 · 0.55) |
| Short | sweep | r-linreg@m15c | 6 | 0 (0 %) | 14 | 43 % | 0.45 | -14.90 | – |
| Short | ribbon | r-star@m15 | 12 | 4 (33 %) | 18 | 22 % | 0.29 | -15.32 | – |
| Short | ribbon | ema-21-55@m15c | 18 | 2 (11 %) | 30 | 47 % | 0.64 | -17.30 | – |
| Short | sweep | r-td@m30 | 8 | 0 (0 %) | 28 | 50 % | 0.64 | -17.80 | tp2.2 sl2.2 tr1.65 h32 sh (5 · 0.56 · -3.20) |
| Short | ribbon | macd-zero@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -18.00 | – |
| Short | ribbon | dir-emax-12-26@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -18.00 | – |
| Short | clamp | ema-stoch@m15c | 44 | 0 (0 %) | 7 | 0 % | 0.00 | -23.20 | – |
| Short | ribbon | dir-vwap-120@m15 | 20 | 1 (5 %) | 35 | 40 % | 0.57 | -23.34 | – |
| Short | ribbon | macd-zero@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -29.60 | – |
| Short | ribbon | dir-emax-12-26@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -29.60 | – |
| Short | magnet | willr-28-90@m15c | 31 | 0 (0 %) | 13 | 0 % | 0.00 | -33.99 | – |
| Short | magnet | willr-21-90@m15c | 59 | 0 (0 %) | 25 | 0 % | 0.00 | -72.79 | – |
| Short | magnet | r-session-trend-m@m15 | 23 | 0 (0 %) | 23 | 0 % | 0.00 | -81.60 | – |
| Short | ribbon | dir-vwap@m15 | 38 | 0 (0 %) | 34 | 0 % | 0.00 | -96.80 | – |
| Short | ribbon | ema-slope@m15 | 81 | 0 (0 %) | 44 | 0 % | 0.00 | -114.59 | – |
| Short | ribbon | ema-slope@m15c | 83 | 0 (0 %) | 46 | 0 % | 0.00 | -119.39 | – |
| General | sweep | willr-21-95@m15 | 9 | 9 (100 %) | 38 | 89 % | 12.24 | 98.91 | tp3.2 sl3.2 tr0 h96 gn (5 · ∞ (no loss) · 15.00) |
| General | sweep | willr-7-95@m15 | 13 | 13 (100 %) | 29 | 86 % | 7.52 | 79.60 | – |
| General | ribbon | willr-21-95@m15c | 13 | 9 (69 %) | 16 | 88 % | 149.02 | 49.89 | – |
| General | revert | break-vol-2@m30 | 7 | 7 (100 %) | 19 | 74 % | 3.26 | 38.00 | – |
| General | sweep | willr-14-95@m30 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 29.40 | – |
| General | sweep | willr-7-80@m15c | 1 | 1 (100 %) | 9 | 78 % | 4.00 | 20.37 | tp3.2 sl3.2 tr2.4 h64 gn (9 · 4.00 · 20.37) |
| General | follow | break-vol-2@x4@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 19.09 | – |
| General | revert | r-camarilla-m@m30 | 2 | 2 (100 %) | 7 | 86 % | 141.25 | 17.61 | tp4.4 sl4.4 tr2.2 h32 gn (5 · 74.37 · 9.21) |
| General | pivot | r-zdist@m15c | 2 | 2 (100 %) | 16 | 88 % | 3.02 | 15.38 | tp3.6 sl3.6 tr1.8 h64 gn (8 · 3.02 · 7.69) |
| General | revert | ichi-cloud-20@m30 | 1 | 1 (100 %) | 11 | 64 % | 4.03 | 13.51 | tp3.6 sl3.6 tr1.8 h48 gn (11 · 4.03 · 13.51) |
| General | sweep | act-burst-2.5@x4@m30 | 8 | 8 (100 %) | 16 | 50 % | 1.71 | 12.00 | – |
| General | magnet | willr-50-80@m15c | 4 | 4 (100 %) | 12 | 67 % | 2.00 | 12.00 | – |
| General | sweep | break-squeeze-30@m30 | 3 | 0 (0 %) | 6 | 50 % | 0.91 | -1.20 | – |
| General | magnet | bb-bounce-50-2@m30 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -11.36 | – |
| General | magnet | cci-40-200@m30 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -11.36 | – |
| General | magnet | z-50-2@m30 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -11.36 | – |
| General | pivot | break-squeeze-t25@m15c | 40 | 2 (5 %) | 12 | 17 % | 0.01 | -16.86 | – |
| General | pivot | trend-adx@m15 | 3 | 0 (0 %) | 5 | 0 % | 0.00 | -20.60 | – |
| General | pivot | trend-adx-30@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -20.60 | – |
| General | ribbon | r-star@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -21.20 | – |
| General | sweep | r-linreg@m15c | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -21.80 | – |
| General | ribbon | dir-emax-20-50@m15c | 16 | 0 (0 %) | 9 | 0 % | 0.00 | -28.40 | – |
| General | ribbon | ema-slope@m15 | 15 | 0 (0 %) | 11 | 0 % | 0.00 | -31.90 | – |
| General | ribbon | dir-vwap-120@m15 | 18 | 0 (0 %) | 11 | 0 % | 0.00 | -33.60 | – |
| General | ribbon | ema-slope@m15c | 16 | 0 (0 %) | 12 | 0 % | 0.00 | -35.40 | – |
| General | ribbon | trix-15@m15c | 22 | 0 (0 %) | 12 | 0 % | 0.00 | -38.00 | – |
| General | ribbon | dir-vwap@m15 | 26 | 0 (0 %) | 16 | 0 % | 0.00 | -46.60 | – |
| General | ribbon | ema-slope-100@m15 | 28 | 0 (0 %) | 15 | 0 % | 0.00 | -47.00 | – |
| General | ribbon | ema-slope-100@m15c | 32 | 0 (0 %) | 18 | 0 % | 0.00 | -53.60 | – |
| General | magnet | r-session-trend-m@m15 | 26 | 0 (0 %) | 26 | 0 % | 0.00 | -82.00 | – |
| Long | revert | break-vol-2@m30 | 14 | 14 (100 %) | 28 | 75 % | 4.44 | 83.20 | – |
| Long | sweep | r-fvg@m15 | 17 | 15 (88 %) | 15 | 100 % | ∞ (no loss) | 81.80 | – |
| Long | sweep | willr-21-95@m15 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 46.10 | – |
| Long | revert | r-bos-m@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 35.60 | – |
| Long | revert | break-vol-2@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 30.80 | – |
| Long | sweep | willr-7-95@m15 | 6 | 6 (100 %) | 7 | 86 % | 11.24 | 30.71 | – |
| Long | ribbon | willr-28-95@m15c | 13 | 6 (46 %) | 8 | 100 % | ∞ (no loss) | 28.50 | – |
| Long | sweep | willr-28-95@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 23.05 | – |
| Long | revert | ichi-cloud-20@m30 | 3 | 3 (100 %) | 12 | 75 % | 1.96 | 16.66 | tp5.2 sl5.2 tr2.6 h48 lg (6 · 2.14 · 6.13) |
| Long | revert | trend-ema-50-200@m15 | 2 | 2 (100 %) | 6 | 67 % | 2.47 | 13.80 | – |
| Long | revert | break-vol-1.3@m15 | 2 | 2 (100 %) | 9 | 56 % | 1.32 | 7.00 | tp5.6 sl5.6 tr0 h64 lg (5 · 1.40 · 4.60) |
| Long | magnet | ichi-tk-20@m15 | 3 | 3 (100 %) | 12 | 50 % | 1.24 | 6.80 | – |
| Long | magnet | ichi-tk-20@m15c | 2 | 2 (100 %) | 9 | 44 % | 1.22 | 4.40 | tp6.4 sl3.2 tr0 h96 lg (5 · 1.22 · 2.20) |
| Long | follow | break-vol-2@x4@m15c | 13 | 10 (77 %) | 23 | 70 % | 0.95 | -1.25 | – |
| Long | revert | break-vol@m15 | 2 | 0 (0 %) | 7 | 43 % | 0.80 | -4.60 | – |
| Long | ribbon | trix-15@m15c | 15 | 0 (0 %) | 5 | 0 % | 0.00 | -14.80 | – |
| Long | ribbon | dir-vwap@m15 | 15 | 0 (0 %) | 5 | 0 % | 0.00 | -15.00 | – |
| Long | ribbon | ema-slope-100@m15c | 18 | 0 (0 %) | 6 | 0 % | 0.00 | -16.80 | – |
| Long | ribbon | ema-slope@m15c | 16 | 0 (0 %) | 6 | 0 % | 0.00 | -17.40 | – |
| Long | sweep | act-burst-2.5@x4@m30 | 7 | 2 (29 %) | 14 | 14 % | 0.26 | -26.00 | – |
| Long | pivot | trend-adx-30@m15 | 8 | 0 (0 %) | 7 | 0 % | 0.00 | -32.40 | – |
| Long | pivot | trend-adx@m15c | 8 | 0 (0 %) | 7 | 0 % | 0.00 | -33.20 | – |
| Long | pivot | trend-adx@m15 | 7 | 0 (0 %) | 8 | 0 % | 0.00 | -37.30 | – |
| Long | pivot | trend-adx-20@m15c | 6 | 0 (0 %) | 9 | 0 % | 0.00 | -40.50 | – |
| Long | sweep | break-squeeze-30@m30 | 15 | 0 (0 %) | 30 | 30 % | 0.15 | -101.45 | – |
| Long | magnet | r-session-trend-m@m15 | 46 | 0 (0 %) | 41 | 0 % | 0.00 | -193.40 | – |
| Wide | magnet | obv-20@m30 | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 123.27 | – |
| Wide | magnet | obv-50@m30 | 15 | 9 (60 %) | 30 | 30 % | 2.75 | 78.51 | – |
| Wide | ribbon | r-zdist-m@m5c | 3 | 3 (100 %) | 15 | 47 % | 6.75 | 35.67 | tp0.76 sl0.68 tr0 h96 axd-volume2h axis (5 · 7.17 · 13.75) |
| Wide | pivot | r-zdist-m@m5c | 3 | 3 (100 %) | 15 | 47 % | 6.75 | 35.67 | tp0.76 sl0.68 tr0 h96 axd-volume2h axis (5 · 7.17 · 13.75) |
| Wide | sweep | mc-rsi3-10@m15c | 3 | 3 (100 %) | 15 | 80 % | 3.88 | 15.52 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (5 · 3.88 · 5.17) |
| Wide | pulse | dir-vwap-120@m15 | 12 | 6 (50 %) | 6 | 100 % | ∞ (no loss) | 4.81 | – |
| Wide | pivot | trend-adx@m15 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 4.75 | – |
| Wide | sweep | willr-28-95@m5c | 5 | 5 (100 %) | 10 | 50 % | 2.31 | 4.59 | – |
| Wide | magnet | move-impulse-20-2.5@m15 | 3 | 3 (100 %) | 12 | 75 % | 1.85 | 3.60 | – |
| Wide | pivot | trend-adx-20@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 3.03 | – |
| Wide | ribbon | move-impulse-20-2.5@m15c | 6 | 6 (100 %) | 12 | 50 % | 1.15 | 0.78 | – |
| Wide | magnet | willr-28-80@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.58 | -2.29 | – |
| Wide | snap | r-star-m@m1 | 3 | 0 (0 %) | 12 | 25 % | 0.43 | -3.60 | – |
| Wide | ribbon | dir-reclaim-50@m15 | 12 | 3 (25 %) | 18 | 50 % | 0.53 | -4.17 | – |
| Wide | magnet | ema-slope-10@m15c | 4 | 0 (0 %) | 8 | 50 % | 0.28 | -9.89 | – |
| Wide | pulse | bb-bounce-50-2@m1c | 30 | 3 (10 %) | 30 | 10 % | 0.21 | -10.21 | – |
| Wide | pulse | z-50-2@m1c | 30 | 3 (10 %) | 30 | 10 % | 0.21 | -10.21 | – |
| Wide | snap | r-star@m1 | 9 | 0 (0 %) | 54 | 28 % | 0.37 | -17.32 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (6 · 0.64 · -1.00) |
| Wide | magnet | trend-st-28-6@m30 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -21.18 | – |
| Wide | magnet | r-vwap-reclaim@m1 | 15 | 0 (0 %) | 30 | 0 % | 0.00 | -30.82 | – |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 30 (100 %) | 166 | 96 % | 22.75 | 566.63 | tp6 sl9 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 29 (97 %) | 159 | 92 % | 12.71 | 474.62 | tp5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-obv-m@m15 | 30 | 29 (97 %) | 144 | 92 % | 12.31 | 386.38 | tp5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 30 (100 %) | 118 | 97 % | 81.41 | 330.79 | tp2.5 sl5 tr0 h96 (7 · ∞ (no loss) · 16.10) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 28 (93 %) | 213 | 80 % | 2.71 | 319.14 | tp2.5 sl7.5 tr0 h96 (13 · 3.58 · 19.90) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 28 (93 %) | 115 | 87 % | 7.46 | 317.40 | tp4 sl12 tr1.6 h96 (7 · 104.86 · 16.25) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 27 (90 %) | 200 | 85 % | 2.73 | 313.96 | tp4 sl12 tr2.4 h96 (8 · ∞ (no loss) · 20.63) |
| Signals | follow | sig-stoch-rsi-m@m15 | 27 | 27 (100 %) | 158 | 88 % | 7.98 | 280.83 | tp3 sl9 tr1.2 h96 (17 · 126.13 · 22.39) |
| Signals | follow | sig-reclaim-s@m15 | 29 | 25 (86 %) | 192 | 86 % | 2.87 | 271.67 | tp2.5 sl7.5 tr0 h96 (11 · ∞ (no loss) · 25.30) |
| Signals | follow | sig-obv-s@m15 | 30 | 28 (93 %) | 171 | 82 % | 2.89 | 265.58 | tp4 sl8 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-kama-m@m15 | 30 | 30 (100 %) | 151 | 83 % | 2.98 | 263.74 | tp4 sl12 tr1.6 h96 (8 · ∞ (no loss) · 17.59) |
| Signals | follow | sig-r-linreg-s@m15 | 29 | 26 (90 %) | 186 | 79 % | 3.12 | 252.27 | tp3 sl9 tr2.4 h96 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 30 (100 %) | 79 | 99 % | 3124.66 | 246.43 | tp3 sl9 tr2.4 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 30 (100 %) | 117 | 83 % | 3.29 | 212.75 | tp3 sl9 tr1.2 h96 (10 · 5.62 · 9.40) |
| Signals | follow | sig-adx-m@m15 | 30 | 30 (100 %) | 90 | 87 % | 5.43 | 189.67 | tp2.5 sl7.5 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 28 (93 %) | 70 | 84 % | 6.73 | 175.37 | tp3 sl9 tr1.2 h96 (5 · 13.91 · 1.10) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 47 | 98 % | 991.91 | 168.99 | tp3 sl9 tr1.2 h96 (5 · 49.71 · 8.31) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 21 (70 %) | 163 | 78 % | 1.87 | 165.11 | tp4 sl12 tr1.6 h96 (9 · ∞ (no loss) · 20.25) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 27 (90 %) | 106 | 86 % | 2.71 | 158.38 | tp4 sl12 tr1.6 h96 (7 · ∞ (no loss) · 14.98) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 20 (67 %) | 177 | 79 % | 1.79 | 156.55 | tp2.5 sl7.5 tr0 h96 (10 · ∞ (no loss) · 23.00) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 27 (90 %) | 60 | 87 % | 5.72 | 149.39 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-s2-active-hf-m@m15 | 27 | 20 (74 %) | 203 | 72 % | 1.46 | 137.05 | tp3 sl9 tr1.2 h96 (17 · 27.88 · 24.48) |
| Signals | follow | sig-sar-m@m15 | 26 | 20 (77 %) | 149 | 78 % | 1.74 | 131.64 | tp2.5 sl7.5 tr0 h96 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-macd-hist-s@m15 | 26 | 21 (81 %) | 130 | 75 % | 1.80 | 131.08 | tp2.5 sl7.5 tr0 h96 (10 · 2.69 · 13.00) |
| Signals | follow | sig-macd-cross-s@m15 | 26 | 21 (81 %) | 130 | 75 % | 1.80 | 131.08 | tp2.5 sl7.5 tr0 h96 (10 · 2.69 · 13.00) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 25 | 24 (96 %) | 45 | 98 % | 31.03 | 118.60 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 22 | 21 (95 %) | 40 | 95 % | 165.16 | 110.81 | – |
| Signals | follow | sig-supertrend-s@m15 | 30 | 18 (60 %) | 141 | 74 % | 1.46 | 106.62 | tp3 sl6 tr0 h96 (8 · 1.35 · 4.40) |
| Signals | follow | sig-r-vol-regime-s@m15 | 24 | 23 (96 %) | 35 | 91 % | 297.27 | 105.83 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 24 (80 %) | 35 | 83 % | 4.96 | 104.37 | – |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 20 (67 %) | 241 | 72 % | 1.31 | 101.75 | tp3 sl9 tr2.4 h96 (14 · 3.39 · 21.94) |
| Signals | follow | sig-macd-slow-s@m15 | 26 | 21 (81 %) | 141 | 73 % | 1.51 | 97.44 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 13.03) |
| Signals | follow | sig-ema-slope-m@m15 | 21 | 21 (100 %) | 43 | 98 % | 567.49 | 96.61 | – |
| Signals | follow | sig-rsi-mid-s@m15 | 26 | 19 (73 %) | 110 | 80 % | 1.84 | 94.20 | tp2.5 sl5 tr0 h96 (7 · ∞ (no loss) · 16.10) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 20 (67 %) | 165 | 76 % | 1.39 | 93.96 | tp3 sl9 tr1.8 h96 (10 · 2.21 · 11.14) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 21 | 19 (90 %) | 37 | 89 % | 7.02 | 86.02 | – |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 27 (90 %) | 36 | 92 % | 14.05 | 85.00 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 4.09) |
| Signals | follow | sig-macd-hist-m@m15 | 24 | 19 (79 %) | 127 | 79 % | 1.59 | 83.23 | tp3 sl9 tr0 h96 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-s2-active-hf-s@m15 | 27 | 18 (67 %) | 191 | 71 % | 1.28 | 81.25 | tp3 sl9 tr1.2 h96 (16 · 21.81 · 18.96) |
| Signals | follow | sig-keltner-m@m15 | 21 | 16 (76 %) | 62 | 79 % | 2.38 | 78.09 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 9.23) |
| Signals | follow | sig-r-connors-s@m15 | 18 | 18 (100 %) | 27 | 100 % | ∞ (no loss) | 73.27 | – |
| Signals | follow | sig-r-vol-regime-m@m15 | 16 | 15 (94 %) | 17 | 94 % | 19.19 | 71.85 | – |
| Signals | follow | sig-mfi-m@m15 | 26 | 25 (96 %) | 26 | 96 % | 18.08 | 67.45 | – |
| Signals | follow | sig-s2-confluence-s@m15 | 23 | 17 (74 %) | 139 | 73 % | 1.36 | 60.11 | tp4 sl12 tr1.6 h96 (10 · 84.73 · 11.33) |
| Signals | follow | sig-sar-s@m15 | 29 | 20 (69 %) | 129 | 72 % | 1.32 | 57.76 | tp2.5 sl7.5 tr0 h96 (9 · 2.39 · 10.70) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 15 (50 %) | 147 | 74 % | 1.14 | 55.46 | tp4 sl6 tr0 h96 (6 · 3.06 · 12.80) |
| Signals | follow | sig-rsi-momentum-s@m15 | 21 | 20 (95 %) | 21 | 95 % | 154.22 | 50.55 | – |
| Signals | follow | sig-volume-break-s@m15 | 21 | 20 (95 %) | 21 | 95 % | 154.22 | 50.55 | – |
| Signals | follow | sig-cci-s@m15 | 29 | 14 (48 %) | 188 | 76 % | 1.15 | 50.36 | tp3 sl9 tr1.2 h96 (20 · 3.31 · 22.38) |
| Signals | follow | sig-s2-vol-break-m@m15 | 22 | 19 (86 %) | 32 | 81 % | 2.73 | 46.10 | – |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 14 (47 %) | 256 | 72 % | 1.08 | 43.01 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 23.99) |
| Signals | follow | sig-macd-cross-m@m15 | 26 | 14 (54 %) | 138 | 74 % | 1.19 | 41.07 | tp3 sl9 tr0 h96 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-ema-cross-m@m15 | 16 | 16 (100 %) | 22 | 100 % | ∞ (no loss) | 36.79 | – |
| Signals | follow | sig-swing-s@m15 | 21 | 15 (71 %) | 111 | 74 % | 1.26 | 33.29 | tp3 sl9 tr1.2 h96 (12 · 11.40 · 9.26) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 17 (57 %) | 211 | 67 % | 1.08 | 32.90 | tp3 sl9 tr1.2 h96 (14 · 7.19 · 15.42) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 27 | 17 (63 %) | 61 | 77 % | 1.30 | 28.55 | – |
| Signals | follow | sig-st-slow-m@m15 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 27.54 | – |
| Signals | follow | sig-adx-s@m15 | 26 | 14 (54 %) | 140 | 75 % | 1.11 | 27.03 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 14.44) |
| Signals | follow | sig-act-burst-m@m15 | 26 | 13 (50 %) | 117 | 71 % | 1.13 | 23.12 | tp3 sl9 tr0 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-s2-st-trail-m@m15 | 17 | 17 (100 %) | 17 | 100 % | ∞ (no loss) | 20.73 | – |
| Signals | follow | sig-s2-range-shift-s@m15 | 22 | 13 (59 %) | 74 | 59 % | 1.14 | 12.75 | tp3 sl9 tr1.8 h96 (5 · 3.95 · 4.18) |
| Signals | follow | sig-rsi-reversal-s@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 9.48 | – |
| Signals | follow | sig-ichimoku-m@m15 | 17 | 13 (76 %) | 24 | 79 % | 1.31 | 8.19 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 26 | 17 (65 %) | 52 | 77 % | 0.99 | -0.66 | – |
| Signals | follow | sig-cci-m@m15 | 30 | 13 (43 %) | 143 | 76 % | 1.00 | -0.72 | tp3 sl4.5 tr0 h96 (6 · 2.98 · 9.30) |
| Signals | follow | sig-supertrend-m@m15 | 18 | 13 (72 %) | 22 | 77 % | 0.79 | -5.52 | – |
| Signals | follow | sig-act-hf-s@m15 | 26 | 13 (50 %) | 180 | 68 % | 0.98 | -7.30 | tp4 sl12 tr2.4 h96 (7 · 67.43 · 13.29) |
| Signals | follow | sig-r-linreg-m@m15 | 24 | 13 (54 %) | 81 | 73 % | 0.93 | -10.09 | tp3 sl9 tr1.8 h96 (5 · ∞ (no loss) · 9.09) |
| Signals | follow | sig-donchian-m@m15 | 14 | 4 (29 %) | 43 | 49 % | 0.80 | -13.81 | tp2.5 sl5 tr0 h96 (5 · 0.66 · -3.50) |
| Signals | follow | sig-ema-slope-s@m15 | 23 | 13 (57 %) | 51 | 65 % | 0.83 | -17.38 | tp2.5 sl5 tr0 h96 (6 · 0.88 · -1.20) |
| Signals | follow | sig-thrust-m@m15 | 28 | 16 (57 %) | 168 | 74 % | 0.93 | -21.03 | tp3 sl9 tr1.2 h96 (14 · ∞ (no loss) · 22.69) |
| Signals | follow | sig-ema-pullback-s@m15 | 20 | 11 (55 %) | 106 | 67 % | 0.82 | -29.58 | tp3 sl9 tr1.8 h96 (8 · 63.90 · 10.23) |
| Signals | follow | sig-impulse-s@m15 | 28 | 13 (46 %) | 119 | 61 % | 0.84 | -38.22 | tp4 sl12 tr1.6 h96 (5 · 31.63 · 6.13) |
| Signals | follow | sig-r-connors-m@m15 | 27 | 10 (37 %) | 85 | 67 % | 0.81 | -38.38 | tp3 sl9 tr1.2 h96 (8 · 1.01 · 0.12) |
| Signals | follow | sig-hma-s@m15 | 24 | 12 (50 %) | 144 | 64 % | 0.85 | -40.83 | tp4 sl12 tr1.6 h96 (7 · 1559.91 · 13.03) |
| Signals | follow | sig-s2-block-stack-s@m15 | 25 | 13 (52 %) | 118 | 71 % | 0.81 | -48.30 | tp3 sl9 tr1.8 h96 (9 · 2.43 · 13.20) |
| Signals | follow | sig-donchian-s@m15 | 27 | 15 (56 %) | 85 | 54 % | 0.75 | -48.47 | tp3 sl9 tr1.2 h96 (7 · 4.93 · 3.53) |
| Signals | follow | sig-s2-vol-break-s@m15 | 28 | 9 (32 %) | 75 | 65 % | 0.75 | -49.70 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 13 (43 %) | 127 | 73 % | 0.86 | -53.95 | tp3 sl9 tr1.2 h96 (9 · 1.82 · 7.51) |
| Signals | follow | sig-vwap-s@m15 | 29 | 15 (52 %) | 125 | 68 % | 0.79 | -56.83 | tp3 sl4.5 tr0 h96 (7 · 1.49 · 4.60) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 10 (33 %) | 122 | 70 % | 0.85 | -57.75 | tp2.5 sl3.75 tr0 h96 (7 · 3.49 · 9.85) |
| Signals | follow | sig-zscore-s@m15 | 30 | 10 (33 %) | 122 | 70 % | 0.85 | -57.75 | tp2.5 sl3.75 tr0 h96 (7 · 3.49 · 9.85) |
| Signals | follow | sig-atr-break-m@m15 | 26 | 13 (50 %) | 85 | 60 % | 0.65 | -58.38 | tp3 sl6 tr0 h96 (5 · 0.68 · -4.00) |
| Signals | follow | sig-ema-trend-s@m15 | 28 | 18 (64 %) | 184 | 72 % | 0.83 | -64.69 | tp3 sl4.5 tr0 h96 (10 · 2.38 · 13.00) |
| Signals | follow | sig-heikin-ashi-s@m15 | 28 | 11 (39 %) | 177 | 69 % | 0.83 | -67.12 | tp3 sl9 tr0 h96 (10 · 2.74 · 16.00) |
| Signals | follow | sig-macd-slow-m@m15 | 28 | 13 (46 %) | 105 | 63 % | 0.74 | -67.74 | tp2.5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-s2-block-scale-m@m15 | 27 | 11 (41 %) | 140 | 69 % | 0.75 | -72.08 | tp2.5 sl7.5 tr0 h96 (10 · 2.69 · 13.00) |
| Signals | follow | sig-hma-m@m15 | 30 | 15 (50 %) | 103 | 54 % | 0.72 | -72.79 | tp3 sl9 tr1.2 h96 (8 · 1.55 · 1.40) |
| Signals | follow | sig-keltner-s@m15 | 26 | 13 (50 %) | 67 | 46 % | 0.61 | -74.11 | tp2.5 sl3.75 tr0 h96 (7 · 0.23 · -15.15) |
| Signals | follow | sig-r-awesome-s@m15 | 25 | 12 (48 %) | 72 | 60 % | 0.53 | -76.99 | tp3 sl9 tr1.2 h96 (8 · 8.70 · 4.48) |
| Signals | follow | sig-s2-block-scale-s@m15 | 29 | 11 (38 %) | 201 | 71 % | 0.79 | -85.81 | tp2.5 sl7.5 tr0 h96 (14 · 1.79 · 12.20) |
| Signals | follow | sig-squeeze-m@m15 | 18 | 8 (44 %) | 23 | 43 % | 0.10 | -89.91 | – |
| Signals | follow | sig-trix-s@m15 | 13 | 0 (0 %) | 17 | 0 % | 0.00 | -91.14 | – |
| Signals | follow | sig-st-slow-s@m15 | 13 | 0 (0 %) | 28 | 25 % | 0.15 | -108.20 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-s2-st-trail-s@m15 | 13 | 0 (0 %) | 18 | 0 % | 0.00 | -112.95 | – |
| Signals | follow | sig-rsi-mid-m@m15 | 26 | 12 (46 %) | 93 | 51 % | 0.49 | -115.64 | tp3 sl9 tr1.2 h96 (7 · 2.26 · 1.74) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 26 | 8 (31 %) | 91 | 60 % | 0.50 | -117.46 | tp3 sl9 tr1.8 h96 (6 · 0.96 · -0.37) |
| Signals | follow | sig-cmf-s@m15 | 24 | 6 (25 %) | 118 | 62 % | 0.56 | -138.37 | tp3 sl9 tr1.8 h96 (11 · 2.09 · 10.33) |
| Signals | follow | sig-s2-block-stack-m@m15 | 24 | 7 (29 %) | 74 | 58 % | 0.40 | -150.25 | tp3 sl9 tr1.2 h96 (9 · 9.54 · 8.86) |
| Signals | follow | sig-r-nr-break-s@m15 | 19 | 3 (16 %) | 91 | 56 % | 0.39 | -150.99 | tp3 sl9 tr1.2 h96 (11 · 97.36 · 13.52) |
| Signals | follow | sig-heikin-ashi-m@m15 | 24 | 7 (29 %) | 150 | 61 % | 0.57 | -152.60 | tp4 sl12 tr1.6 h96 (5 · 38.86 · 3.47) |
| Signals | follow | sig-r-fractal-s@m15 | 22 | 3 (14 %) | 70 | 47 % | 0.32 | -156.57 | tp3 sl9 tr1.2 h96 (8 · 8.89 · 4.43) |
| Signals | follow | sig-r-fractal-m@m15 | 16 | 2 (13 %) | 25 | 8 % | 0.00 | -158.22 | – |
| Signals | follow | sig-r-awesome-m@m15 | 28 | 9 (32 %) | 137 | 60 % | 0.55 | -165.44 | tp3 sl9 tr2.4 h96 (6 · 1.52 · 4.80) |
| Signals | follow | sig-kama-s@m15 | 26 | 8 (31 %) | 165 | 63 % | 0.58 | -171.25 | tp4 sl12 tr1.6 h96 (8 · 84.91 · 10.71) |
| Signals | follow | sig-cmf-m@m15 | 23 | 2 (9 %) | 64 | 44 % | 0.25 | -195.74 | tp3 sl9 tr1.2 h96 (9 · 12.54 · 6.74) |
| Signals | follow | sig-r-nr-break-m@m15 | 20 | 2 (10 %) | 81 | 43 % | 0.25 | -199.28 | tp3 sl9 tr1.2 h96 (10 · 11.70 · 8.88) |
| Signals | follow | sig-s2-atr-break-m@m15 | 29 | 9 (31 %) | 156 | 55 % | 0.45 | -239.32 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 5.75) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 5 (17 %) | 85 | 45 % | 0.31 | -257.86 | tp2.5 sl3.75 tr0 h96 (8 · 0.35 · -12.85) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 3 (10 %) | 103 | 47 % | 0.39 | -261.31 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-zscore-m@m15 | 30 | 2 (7 %) | 66 | 53 % | 0.24 | -283.71 | – |
| Signals | follow | sig-swing-m@m15 | 30 | 2 (7 %) | 169 | 60 % | 0.40 | -305.41 | tp2.5 sl5 tr0 h96 (12 · 1.33 · 5.10) |
| Signals | follow | sig-squeeze-s@m15 | 27 | 1 (4 %) | 36 | 3 % | 0.00 | -310.27 | – |
| Signals | follow | sig-thrust-s@m15 | 27 | 2 (7 %) | 99 | 48 % | 0.25 | -326.24 | tp3 sl9 tr1.2 h96 (9 · 1.01 · 0.12) |
| Signals | follow | sig-act-hf-m@m15 | 23 | 0 (0 %) | 123 | 45 % | 0.27 | -328.39 | tp3 sl9 tr1.2 h96 (12 · 0.69 · -3.13) |
| Signals | follow | sig-s2-atr-break-s@m15 | 27 | 1 (4 %) | 125 | 45 % | 0.29 | -329.10 | tp4 sl12 tr1.6 h96 (5 · 13.71 · 4.58) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 49 | 39 % | 0.10 | -334.95 | – |
| Signals | follow | sig-impulse-m@m15 | 27 | 1 (4 %) | 69 | 7 % | 0.02 | -526.70 | tp2.5 sl3.75 tr0 h96 (5 · 0.00 · -19.75) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 118 | 88 (75 %) | 980 | 67 % | 2.00 | 548.54 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 115 | 94 (82 %) | 592 | 79 % | 2.60 | 507.34 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 117 | 83 (71 %) | 709 | 79 % | 1.63 | 458.52 |
| Signals | tp 2.500% | sl 3.00× | tr off | 118 | 84 (71 %) | 670 | 84 % | 1.52 | 441.00 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 114 | 86 (75 %) | 391 | 87 % | 1.95 | 365.41 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 99 | 89 (90 %) | 218 | 87 % | 2.64 | 360.11 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 77 (66 %) | 494 | 82 % | 1.38 | 315.20 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 65 | 57 (88 %) | 97 | 92 % | 2.63 | 315.04 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 117 | 79 (68 %) | 552 | 80 % | 1.37 | 300.25 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 112 | 75 (67 %) | 307 | 78 % | 1.63 | 276.83 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 115 | 84 (73 %) | 479 | 78 % | 1.45 | 220.88 |
| Wide | tp 1.130% | sl 1.00× | tr off | 48 | 21 (44 %) | 48 | 44 % | 4.04 | 200.76 |
| Short | tp 2.600% | sl 2.00× | tr off | 86 | 35 (41 %) | 113 | 91 % | 4.58 | 193.20 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 41 | 33 (80 %) | 64 | 84 % | 1.91 | 176.39 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 76 | 25 (33 %) | 84 | 95 % | 29.61 | 169.03 |
| Short | tp 2.800% | sl 2.00× | tr off | 72 | 25 (35 %) | 76 | 95 % | 8.07 | 164.00 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 94 | 74 (79 %) | 178 | 87 % | 1.42 | 159.47 |
| Short | tp 2.800% | sl 1.50× | tr off | 66 | 26 (39 %) | 69 | 96 % | 13.00 | 158.40 |
| Short | tp 2.600% | sl 2.00× | tr 0.50× | 80 | 32 (40 %) | 84 | 99 % | 792.92 | 158.38 |
| Short | tp 2.600% | sl 1.50× | tr off | 77 | 34 (44 %) | 79 | 94 % | 8.66 | 157.10 |
| Short | tp 2.400% | sl 2.00× | tr off | 69 | 29 (42 %) | 77 | 97 % | 16.50 | 155.00 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 115 | 86 (75 %) | 326 | 86 % | 1.29 | 147.87 |
| Short | tp 2.000% | sl 2.00× | tr 0.50× | 80 | 44 (55 %) | 93 | 99 % | 35.46 | 144.72 |
| Short | tp 2.200% | sl 2.00× | tr 0.75× | 71 | 38 (54 %) | 89 | 92 % | 6.71 | 131.40 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 80 | 33 (41 %) | 70 | 100 % | ∞ (no loss) | 121.42 |
| Short | tp 2.200% | sl 2.00× | tr 0.50× | 65 | 29 (45 %) | 82 | 94 % | 11.45 | 108.79 |
| Short | tp 2.200% | sl 2.00× | tr off | 58 | 26 (45 %) | 65 | 94 % | 6.63 | 103.60 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 58 | 20 (34 %) | 54 | 94 % | 6.90 | 102.74 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 74 | 20 (27 %) | 63 | 89 % | 3.48 | 93.83 |
| Short | tp 1.800% | sl 2.00× | tr 0.50× | 52 | 22 (42 %) | 79 | 76 % | 12.42 | 84.04 |
| Short | tp 2.000% | sl 2.00× | tr off | 69 | 26 (38 %) | 53 | 96 % | 10.93 | 83.40 |
| Short | tp 2.600% | sl 1.50× | tr 0.75× | 58 | 19 (33 %) | 35 | 100 % | ∞ (no loss) | 82.42 |
| Short | tp 2.800% | sl 1.50× | tr 0.75× | 51 | 13 (25 %) | 41 | 90 % | 5.37 | 76.91 |
| Short | tp 2.800% | sl 1.50× | tr 0.50× | 55 | 14 (25 %) | 43 | 88 % | 9.29 | 73.86 |
| Short | tp 2.000% | sl 2.00× | tr 0.75× | 54 | 25 (46 %) | 46 | 96 % | 9.71 | 73.18 |
| Wide | tp 0.760% | sl 0.89× | tr off | 43 | 11 (26 %) | 44 | 43 % | 4.85 | 72.90 |
| Short | tp 2.400% | sl 2.00× | tr 0.75× | 69 | 20 (29 %) | 39 | 82 % | 7.63 | 70.16 |
| Short | tp 2.600% | sl 1.50× | tr 0.50× | 52 | 17 (33 %) | 36 | 97 % | 17.28 | 66.76 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 71 | 50 (70 %) | 109 | 81 % | 1.17 | 65.57 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 113 | 79 (70 %) | 301 | 84 % | 1.12 | 62.68 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 1.50× | tr off | 88 | 28 (32 %) | 166 | 45 % | 0.52 | -402.20 |
| Signals | tp 4.000% | sl 1.50× | tr off | 115 | 48 (42 %) | 516 | 55 % | 0.74 | -369.20 |
| Signals | tp 2.500% | sl 1.50× | tr off | 119 | 48 (40 %) | 1106 | 58 % | 0.81 | -343.70 |
| Signals | tp 5.000% | sl 3.00× | tr off | 92 | 40 (43 %) | 161 | 66 % | 0.63 | -307.20 |
| Signals | tp 3.000% | sl 1.50× | tr off | 118 | 49 (42 %) | 849 | 58 % | 0.83 | -285.30 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 101 | 47 (47 %) | 202 | 68 % | 0.68 | -262.52 |
| Signals | tp 6.000% | sl 2.00× | tr off | 73 | 25 (34 %) | 119 | 56 % | 0.61 | -245.80 |
| Signals | tp 5.000% | sl 1.50× | tr off | 102 | 45 (44 %) | 255 | 55 % | 0.76 | -213.50 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 52 (44 %) | 945 | 66 % | 0.87 | -211.50 |
| Signals | tp 5.000% | sl 2.00× | tr off | 96 | 40 (42 %) | 179 | 62 % | 0.77 | -160.80 |
| Signals | tp 4.000% | sl 2.00× | tr off | 108 | 46 (43 %) | 349 | 66 % | 0.88 | -113.80 |
| Long | tp 5.200% | sl 0.50× | tr off | 43 | 0 (0 %) | 26 | 0 % | 0.00 | -72.80 |
| Wide | tp 0.640% | sl 0.84× | tr off | 87 | 6 (7 %) | 156 | 15 % | 0.20 | -72.17 |
| General | tp 4.000% | sl 0.75× | tr off | 56 | 5 (9 %) | 41 | 22 % | 0.33 | -68.20 |
| Signals | tp 6.000% | sl 3.00× | tr off | 51 | 30 (59 %) | 76 | 72 % | 0.83 | -63.20 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 48 (48) | 27376 | 13228 | 13228 | 0 | baseTarget 14148 |
| Micro | trailing | 48 (48) | 54752 | 26456 | 26456 | 0 | baseTarget 28296 |
| Short | normal | 258 (214) | 42696 | 12972 | 12972 | 0 | baseTarget 9600 · baseRange 20124 |
| Short | trailing | 258 (214) | 85392 | 25944 | 25944 | 0 | baseTarget 19200 · baseRange 40248 |
| General | normal | 258 (222) | 28464 | 9426 | 9426 | 0 | baseTarget 5454 · baseRange 13584 |
| General | trailing | 258 (222) | 18976 | 6284 | 6284 | 0 | baseTarget 3636 · baseRange 9056 |
| Long | normal | 258 (228) | 35580 | 15438 | 15438 | 0 | baseRange 13920 · baseTarget 6222 |
| Long | trailing | 258 (228) | 23720 | 10292 | 10292 | 0 | baseRange 9280 · baseTarget 4148 |
| Wide | axis | 306 (306) | 58950 | 58950 | 58950 | 0 | – |
| Wide | dca | 306 (306) | 5240 | 5240 | 5240 | 0 | – |
| Wide | dca-active | 306 (306) | 5240 | 5240 | 5240 | 0 | – |

Engine indications Base evaluated that built no set: 85 (bb-bounce-20-3, bb-walk, dir-vwap-240, ha-1, ha-3, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-20, mc-burst-2, mc-burst-3, mc-engulf-20, mc-ivwapd-2, mc-iz-25, mc-macdh, mc-rsi14-25, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-20, mc-rsi4-25, mc-rsi4-30, mc-rsi5-20, mc-rsi5-25, mc-rsi5-30, mc-rsi7-15, mc-rsi7-25, mc-rsi7-30, mc-rsi9-15, mc-rsi9-20, mc-rsi9-25, mc-rsi9-30, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.06 (114) | 0.11 (216) | 0.19 (504) | 0.25 (608) | 0.32 (554) |
| 1.14× | – | 0.05 (72) | – | – | – | – | – |
| 1.25× | – | 0.05 (72) | 0.05 (114) | 0.11 (212) | 0.26 (482) | 0.38 (586) | 0.44 (554) |
| 1.33× | 0.03 (72) | – | – | – | – | – | – |
| 1.5× | 0.03 (72) | 0.07 (72) | 0.20 (114) | 0.29 (212) | 0.38 (476) | 0.66 (576) | 0.62 (524) |
| 1.75× | 0.05 (72) | 0.13 (72) | 0.22 (114) | 0.40 (206) | 0.40 (470) | 0.88 (550) | 0.61 (524) |
| 2× | 0.09 (72) | 0.12 (72) | 0.45 (108) | 0.45 (198) | 0.48 (464) | 0.97 (532) | 0.69 (512) |
| 2.25× | 0.08 (72) | 0.21 (72) | 0.41 (108) | 0.41 (198) | 0.59 (446) | 0.96 (532) | 0.63 (512) |
| 2.5× | 0.10 (72) | 0.20 (72) | 0.38 (108) | 0.44 (198) | 0.59 (446) | 0.88 (532) | 0.70 (512) |
| 2.75× | 0.14 (72) | 0.19 (72) | 0.36 (108) | 0.40 (198) | 0.55 (446) | 1.12 (532) | 0.92 (500) |
| 3× | 0.13 (72) | 0.18 (72) | 0.41 (108) | 0.38 (198) | 0.69 (446) | 1.42 (520) | 0.86 (498) |
| 3.25× | 0.12 (72) | 0.22 (72) | 0.38 (108) | 0.55 (198) | 0.65 (446) | 1.35 (518) | 0.78 (480) |
| 3.5× | 0.12 (72) | 0.21 (72) | 0.50 (108) | 0.52 (198) | 0.82 (434) | 1.28 (512) | 0.78 (482) |
| 3.75× | 0.15 (72) | 0.20 (72) | 0.73 (108) | 0.68 (190) | 0.77 (428) | 1.27 (512) | 0.91 (468) |
| 4× | 0.14 (72) | 0.31 (72) | 0.69 (108) | 0.82 (184) | 0.76 (428) | 1.43 (506) | 1.25 (458) |
| 4.25× | 0.14 (74) | 0.29 (72) | 1.09 (104) | 0.78 (178) | 0.85 (422) | 1.44 (506) | 1.19 (458) |
| 4.5× | 0.13 (74) | 0.28 (72) | 1.05 (104) | 0.75 (178) | 0.81 (422) | 1.37 (502) | 4.04 (458) |
| 4.75× | 0.20 (74) | 0.44 (68) | 1.02 (98) | 0.99 (172) | 0.77 (422) | 1.32 (502) | 3.95 (458) |
| 5× | 0.20 (74) | 0.42 (68) | 0.98 (98) | 0.95 (172) | 0.74 (422) | 3.72 (502) | 3.90 (462) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | – | 4.54 (6) |
| 2× | – | – | – | – | ∞ (4) | ∞ (6) | 4.54 (6) |
| 2.25× | – | – | – | ∞ (6) | ∞ (4) | ∞ (4) | 4.54 (6) |
| 2.5× | – | – | – | ∞ (6) | ∞ (4) | ∞ (4) | 0.00 (4) |
| 2.75× | – | – | ∞ (6) | ∞ (6) | 0.76 (5) | ∞ (4) | 9.08 (8) |
| 3× | – | ∞ (6) | ∞ (6) | 0.97 (7) | 0.71 (5) | ∞ (8) | 0.74 (18) |
| 3.25× | – | ∞ (6) | ∞ (6) | 0.90 (7) | 0.66 (5) | 1.00 (20) | 0.94 (22) |
| 3.5× | ∞ (6) | ∞ (6) | ∞ (6) | 0.85 (7) | 0.62 (5) | 2.31 (15) | 1.78 (16) |
| 3.75× | ∞ (6) | ∞ (6) | 0.47 (10) | 1.37 (11) | 1.45 (11) | ∞ (18) | 0.76 (10) |
| 4× | ∞ (6) | ∞ (6) | 0.44 (10) | 1.29 (11) | 0.55 (5) | ∞ (18) | 1.87 (18) |
| 4.25× | ∞ (6) | 0.17 (14) | ∞ (10) | 1.22 (11) | 1.03 (9) | 0.83 (14) | 0.48 (78) |
| 4.5× | ∞ (6) | 0.16 (14) | ∞ (10) | 1.33 (19) | 0.49 (5) | 0.89 (52) | 14.47 (86) |
| 4.75× | ∞ (6) | 2.44 (10) | ∞ (10) | 1.29 (19) | 1.03 (13) | 0.41 (90) | 11.08 (94) |
| 5× | 0.24 (10) | 2.44 (10) | ∞ (18) | 1.24 (19) | 2.78 (31) | 57.42 (90) | 11.08 (94) |

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
| 3.5× | – | – | – | – | – | – | – |
| 3.75× | – | – | ∞ (2) | – | – | – | – |
| 4× | – | – | ∞ (1) | – | – | – | – |
| 4.25× | – | – | – | – | – | – | – |
| 4.5× | – | – | – | – | – | ∞ (2) | – |
| 4.75× | – | – | – | – | – | ∞ (1) | – |
| 5× | – | – | – | – | – | – | – |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.28 (3696) | 1.51 (4230) | 0.94 (3812) | 1.14 (4065) | 1.23 (3994) | 1.24 (4021) |
| 1.5× | 1.58 (3468) | 1.49 (3901) | 0.97 (3404) | 1.81 (3329) | 1.97 (3223) | 2.02 (3160) |
| 2× | 2.60 (3106) | 3.37 (3290) | 1.78 (2774) | 2.45 (3072) | 2.78 (3011) | 3.42 (2941) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.95 (70) | 1.32 (112) | 0.58 (121) | 0.80 (151) | 0.76 (141) | 0.65 (149) |
| 1.5× | 1.13 (71) | 0.92 (110) | 0.63 (114) | 1.20 (126) | 13.45 (150) | 8.79 (153) |
| 2× | 3.44 (205) | 15.35 (192) | 7.63 (236) | 17.84 (186) | 5.84 (260) | 10.37 (214) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | ∞ (2) | 0.00 (1) | ∞ (5) | 0.97 (15) | 1.14 (12) | 1.10 (11) |
| 1.5× | ∞ (4) | 0.77 (6) | 0.29 (12) | 1.73 (9) | 0.78 (14) | 5.72 (12) |
| 2× | ∞ (6) | 2.46 (8) | ∞ (15) | ∞ (12) | 4.73 (12) | 2.41 (9) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.14 (1216) | 0.96 (1325) | 0.96 (1334) | 0.84 (1638) |
| 0.75× | 1.21 (1055) | 0.96 (1176) | 0.91 (1120) | 0.78 (1379) |
| 1× | 1.24 (2893) | 1.39 (2673) | 1.12 (2512) | 0.98 (2985) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.88 (17) | 1.42 (22) | 0.25 (16) | 0.23 (17) |
| 0.75× | 0.78 (52) | 0.28 (36) | 0.33 (41) | 0.76 (44) |
| 1× | 0.57 (77) | 1.57 (58) | 0.95 (36) | 2.50 (45) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | ∞ (2) | ∞ (2) | ∞ (2) | ∞ (2) |
| 0.75× | 0.58 (3) | – | 0.00 (1) | 0.00 (2) |
| 1× | 0.14 (2) | 0.07 (8) | 0.00 (3) | – |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.85 (1492) | 0.78 (1610) | 0.61 (1430) | 0.65 (1403) | 0.69 (1699) |
| 0.75× | 1.11 (1040) | 0.97 (1114) | 0.85 (906) | 0.82 (910) | 0.87 (1128) |
| 1× | 1.04 (2753) | 1.04 (2868) | 0.86 (2344) | 0.75 (2388) | 1.23 (2249) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.46 (29) | 0.00 (26) | 0.08 (23) | 0.36 (12) | 0.68 (11) |
| 0.75× | 0.37 (17) | 0.54 (13) | 0.31 (10) | 1.08 (30) | 0.85 (27) |
| 1× | 2.59 (54) | 1.36 (47) | 1.12 (31) | 0.39 (25) | 1.36 (18) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | ∞ (2) | 0.00 (2) | 0.00 (2) | – | – |
| 0.75× | – | ∞ (1) | 1.23 (2) | 0.62 (3) | 1.24 (2) |
| 1× | ∞ (1) | ∞ (3) | ∞ (1) | – | – |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.46 (7438) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.80 (309) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 1.18 (15067) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.92 (299) | 1.33 (541) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 1.05 (290) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 1.74 (478) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 2.15 (468) | – | – | – | – |
| 1× | – | – | – | 0.80 (106696) | – | – | – | 0.88 (15857) | 0.70 (3835) | – | 0.86 (664) | – | 0.78 (3074) | 0.94 (2599) | 0.83 (448) | 1.25 (297) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.20 (156) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 4.85 (44) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 1.33 (97) | – | – | – | 4.04 (48) | – | – | – | – | – | – | – | – |

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
