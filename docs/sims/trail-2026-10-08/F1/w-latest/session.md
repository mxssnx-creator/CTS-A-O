# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1354/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 351/19072 · PF 1.54 · Micro 233/5900 · PF 2.26 · Short 642/8176 · PF 1.47 · General 514/8176 · PF 1.50 · Long 570/8176 · PF 1.51 · Signals 126/126; Main 1228 pairs, 215798 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 293 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.00 (0.00 %, closed orders) · equity at end $20.00 (open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ – (gross profit $ ÷ gross loss $ as sized) · PF unit – (every order at one unit: the engine's PF) · 0 positions / 0 orders · WR 0.00 % · DDT (closed trades, $) 0.00 h · DDR – (net ≤ 0) · equity max drawdown $0.00 (0.00 %) · margin used max $0.00 · open avg 0.00 pos / 0.00 orders (peak 0 / 0)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 0 orders capped to $0, 0 scaled down · binding: position cap 0, gross cap 0. **Without the caps:** balance $20.00 → $20.00 (0.00 %) · PF $ – · equity at end $20.00 · equity max drawdown $0.00 (0.00 %) · margin used max $0.00.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 427 | 1161  | 4.6 % | 1.532 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 427 | 1161 (+0) | 4.6 % | 1.532 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 427 | 1159 (-2) | 4.6 % | 1.532 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 389 | 1026 (-135) | 4.1 % | 1.585 |
| closes ≥ 6 | 1.00 | 6 | 1 | 597 | 1564 (+403) | 6.3 % | 1.707 |
| closes ≥ 20 | 1.00 | 20 | 1 | 302 | 856 (-305) | 3.4 % | 1.447 |
| closes ≥ 30 | 1.00 | 30 | 1 | 216 | 645 (-516) | 2.6 % | 1.343 |
| DDR off | 1.00 | 12 | off | 1578 | 2673 (+1512) | 10.7 % | 1.143 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 782 | 1674 (+513) | 6.7 % | 1.363 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 151 | 557 (-604) | 2.2 % | 1.903 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1578 | 2673 (+1512) | 10.7 % | 1.143 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2024 | 3233 (+2072) | 12.9 % | 1.182 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 13:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 14:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 15:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 16:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 17:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 18:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 19:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 20:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 21:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 22:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 23:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |

**Last hour (23:00):** open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $20.00 = balance $20.00 + MTM $0.00.

**Hours positive:** 0 of 12 full hours · flat 12 · negative 0

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) |  |
|---||
| 12:00 |  |
| 13:00 |  |
| 14:00 |  |
| 15:00 |  |
| 16:00 |  |
| 17:00 |  |
| 18:00 |  |
| 19:00 |  |
| 20:00 |  |
| 21:00 |  |
| 22:00 |  |
| 23:00 |  |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns () are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | of which Block-raised | of which Signals |
|---|---:|---:|---:|
| 12:00 | 0 | – | – |
| 13:00 | 0 | – | – |
| 14:00 | 0 | – | – |
| 15:00 | 0 | – | – |
| 16:00 | 0 | – | – |
| 17:00 | 0 | – | – |
| 18:00 | 0 | – | – |
| 19:00 | 0 | – | – |
| 20:00 | 0 | – | – |
| 21:00 | 0 | – | – |
| 22:00 | 0 | – | – |
| 23:00 | 0 | – | – |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1228 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (215798 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3424); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 28030 · 0.72 | 6894 · 0.80 | 10053 · 0.94 | 1435 · 0.74 | – | – | – | – | – |
| 13:00 | 48098 · 0.41 | 8282 · 0.68 | 16757 · 0.64 | 1780 · 2.80 | – | – | – | – | – |
| 14:00 | 29992 · 2.01 | 7111 · 2.13 | 10674 · 2.20 | 2875 · 5.69 | – | – | – | – | – |
| 15:00 | 37742 · 1.42 | 9237 · 1.13 | 13921 · 1.67 | 3865 · 0.78 | – | – | – | – | – |
| 16:00 | 28366 · 1.20 | 4531 · 1.07 | 10597 · 1.82 | 1452 · 1.32 | – | – | – | – | – |
| 17:00 | 18939 · 1.70 | 3672 · 1.16 | 7428 · 1.49 | 1773 · 1.67 | – | – | – | – | – |
| 18:00 | 18946 · 1.81 | 2959 · 2.86 | 5708 · 1.56 | 1249 · 0.96 | – | – | – | – | – |
| 19:00 | 22269 · 0.97 | 5572 · 1.61 | 7488 · 0.90 | 1253 · 0.92 | – | – | – | – | – |
| 20:00 | 41968 · 0.59 | 12349 · 0.90 | 10349 · 0.48 | 2594 · 0.96 | – | – | – | – | – |
| 21:00 | 49509 · 0.66 | 13164 · 0.96 | 16504 · 0.66 | 2916 · 0.60 | – | – | – | – | – |
| 22:00 | 48922 · 0.39 | 12131 · 0.43 | 18878 · 0.37 | 4047 · 0.15 | – | – | – | – | – |
| 23:00 | 31096 · 0.45 | 5791 · 0.46 | 9371 · 0.34 | 1738 · 0.19 | – | – | – | – | – |
| **total** | **403877 · 0.78** | **91693 · 0.90** | **137728 · 0.77** | **26977 · 0.63** | **–** | **–** | **–** | **–** | **–** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| total | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Engine (no signals) | 0 | 0 / 0 | – | – | $0.00 | – | – |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Short | 0 | 0 / 0 | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 50514 | sig:confirm 50514 |

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
| Micro | 2.26 | – | – | – | – | 0 |
| Short | 1.47 | – | – | – | – | 0 |
| General | 1.50 | – | – | – | – | 0 |
| Long | 1.51 | – | – | – | – | 0 |
| Wide | 1.54 | – | – | – | – | 0 |
| Signals | – | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 212018 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2154 units active at the run start, 2971 over the run, 3424 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1668 | 517 (31 %) | 10197 | 57 % | 0.62 | -11640.52 |
| Signals | trailing | 1756 | 683 (39 %) | 16780 | 62 % | 0.63 | -9654.17 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 46 (78 %) | 412 | 72 % | 1.64 | 278.71 |
| Signals | signal:act-hf | 60 | 6 (10 %) | 582 | 53 % | 0.43 | -782.13 |
| Signals | signal:adx | 60 | 16 (27 %) | 431 | 56 % | 0.54 | -591.81 |
| Signals | signal:atr-break | 59 | 29 (49 %) | 400 | 56 % | 0.72 | -191.83 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 426 | 53 % | 0.50 | -646.99 |
| Signals | signal:cci | 60 | 23 (38 %) | 622 | 65 % | 0.73 | -347.27 |
| Signals | signal:cmf | 57 | 0 (0 %) | 481 | 52 % | 0.29 | -996.89 |
| Signals | signal:donchian | 47 | 10 (21 %) | 285 | 58 % | 0.66 | -189.82 |
| Signals | signal:ema-cross | 60 | 55 (92 %) | 212 | 88 % | 6.36 | 425.86 |
| Signals | signal:ema-cross-fast | 60 | 48 (80 %) | 512 | 79 % | 1.94 | 471.68 |
| Signals | signal:ema-pullback | 60 | 5 (8 %) | 580 | 55 % | 0.34 | -1001.25 |
| Signals | signal:ema-slope | 60 | 30 (50 %) | 346 | 70 % | 1.12 | 68.92 |
| Signals | signal:ema-trend | 60 | 9 (15 %) | 653 | 63 % | 0.59 | -603.40 |
| Signals | signal:heikin-ashi | 59 | 1 (2 %) | 865 | 57 % | 0.40 | -1223.04 |
| Signals | signal:hma | 60 | 12 (20 %) | 533 | 51 % | 0.48 | -687.43 |
| Signals | signal:ichimoku | 43 | 5 (12 %) | 230 | 54 % | 0.51 | -263.27 |
| Signals | signal:impulse | 59 | 3 (5 %) | 552 | 46 % | 0.29 | -1089.03 |
| Signals | signal:kama | 60 | 12 (20 %) | 879 | 60 % | 0.62 | -688.15 |
| Signals | signal:keltner | 60 | 37 (62 %) | 236 | 67 % | 1.63 | 190.60 |
| Signals | signal:macd-cross | 58 | 6 (10 %) | 537 | 55 % | 0.53 | -553.44 |
| Signals | signal:macd-hist | 59 | 18 (31 %) | 887 | 64 % | 0.78 | -336.26 |
| Signals | signal:macd-slow | 60 | 17 (28 %) | 535 | 62 % | 0.72 | -283.57 |
| Signals | signal:mfi | 22 | 22 (100 %) | 44 | 91 % | 15.09 | 59.42 |
| Signals | signal:obv | 60 | 45 (75 %) | 701 | 73 % | 1.62 | 486.18 |
| Signals | signal:r-awesome | 60 | 4 (7 %) | 474 | 50 % | 0.35 | -927.68 |
| Signals | signal:r-connors | 48 | 20 (42 %) | 216 | 63 % | 0.43 | -349.60 |
| Signals | signal:r-fractal | 48 | 14 (29 %) | 152 | 42 % | 0.19 | -366.41 |
| Signals | signal:r-inside | 18 | 0 (0 %) | 22 | 18 % | 0.01 | -146.34 |
| Signals | signal:r-linreg | 60 | 7 (12 %) | 620 | 60 % | 0.47 | -748.82 |
| Signals | signal:r-nr-break | 60 | 15 (25 %) | 401 | 53 % | 0.48 | -532.53 |
| Signals | signal:r-session-trend | 60 | 8 (13 %) | 559 | 54 % | 0.43 | -889.20 |
| Signals | signal:r-vol-regime | 36 | 19 (53 %) | 84 | 51 % | 1.10 | 11.04 |
| Signals | signal:reclaim | 60 | 20 (33 %) | 854 | 66 % | 0.78 | -352.13 |
| Signals | signal:rsi-mid | 60 | 4 (7 %) | 493 | 50 % | 0.36 | -799.20 |
| Signals | signal:rsi-momentum | 26 | 24 (92 %) | 26 | 92 % | 3.71 | 45.83 |
| Signals | signal:rsi-reversal | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -16.64 |
| Signals | signal:s2-active-hf | 60 | 10 (17 %) | 709 | 56 % | 0.61 | -573.89 |
| Signals | signal:s2-adx-gate | 60 | 14 (23 %) | 553 | 65 % | 0.75 | -270.79 |
| Signals | signal:s2-atr-break | 60 | 6 (10 %) | 546 | 52 % | 0.46 | -701.72 |
| Signals | signal:s2-bb-bounce | 57 | 24 (42 %) | 253 | 49 % | 0.51 | -358.16 |
| Signals | signal:s2-block-scale | 60 | 7 (12 %) | 749 | 61 % | 0.49 | -901.22 |
| Signals | signal:s2-block-stack | 59 | 2 (3 %) | 369 | 47 % | 0.34 | -735.08 |
| Signals | signal:s2-confluence | 60 | 30 (50 %) | 874 | 65 % | 0.93 | -90.93 |
| Signals | signal:s2-ema-cross | 30 | 22 (73 %) | 33 | 76 % | 7.54 | 93.04 |
| Signals | signal:s2-range-break | 51 | 35 (69 %) | 78 | 68 % | 2.01 | 88.30 |
| Signals | signal:s2-range-shift | 59 | 14 (24 %) | 324 | 52 % | 0.49 | -433.54 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 111 | 59 % | 0.81 | -37.58 |
| Signals | signal:s2-st-trail | 58 | 48 (83 %) | 122 | 81 % | 2.51 | 137.53 |
| Signals | signal:s2-stoch-swing | 60 | 43 (72 %) | 732 | 75 % | 1.67 | 559.34 |
| Signals | signal:s2-vol-break | 56 | 30 (54 %) | 149 | 72 % | 0.85 | -46.26 |
| Signals | signal:s2-vwap-axis | 27 | 25 (93 %) | 27 | 93 % | 430.73 | 78.17 |
| Signals | signal:sar | 60 | 5 (8 %) | 741 | 59 % | 0.61 | -608.90 |
| Signals | signal:squeeze | 54 | 24 (44 %) | 55 | 44 % | 0.08 | -234.61 |
| Signals | signal:st-slow | 58 | 37 (64 %) | 132 | 70 % | 1.27 | 50.50 |
| Signals | signal:stoch-rsi | 60 | 5 (8 %) | 943 | 56 % | 0.42 | -1147.46 |
| Signals | signal:supertrend | 60 | 44 (73 %) | 261 | 70 % | 1.18 | 71.45 |
| Signals | signal:swing | 58 | 2 (3 %) | 730 | 56 % | 0.44 | -951.41 |
| Signals | signal:thrust | 60 | 2 (3 %) | 664 | 52 % | 0.33 | -1150.55 |
| Signals | signal:trix | 60 | 24 (40 %) | 269 | 65 % | 1.11 | 56.80 |
| Signals | signal:volume-break | 56 | 48 (86 %) | 61 | 85 % | 9.69 | 152.72 |
| Signals | signal:vwap | 60 | 28 (47 %) | 567 | 66 % | 0.99 | -11.01 |
| Signals | signal:williams-r | 60 | 21 (35 %) | 734 | 59 % | 0.81 | -276.26 |
| Signals | signal:zscore | 60 | 19 (32 %) | 342 | 54 % | 0.50 | -487.26 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 75768 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75768 | 0 |  |
| Short | 39456 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39456 | 0 |  |
| General | 13080 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13080 | 0 |  |
| Long | 18630 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18630 | 0 |  |
| Wide | 65084 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 65084 | 0 |  |
| Signals | 3780 | – | 2154 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2154 units (pair × symbol × direction) active at the run start, 2971 over the run; 3424 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 25256 | 2786 (11 %) | 13086 | 67 % | 0.41 | -3724.17 |
| Micro | trailing | 50512 | 5206 (10 %) | 26258 | 58 % | 0.35 | -8181.31 |
| Short | normal | 13152 | 3012 (23 %) | 25894 | 53 % | 0.70 | -12316.20 |
| Short | trailing | 26304 | 6323 (24 %) | 56855 | 52 % | 0.63 | -27120.46 |
| General | normal | 7848 | 1348 (17 %) | 12988 | 38 % | 0.78 | -5106.60 |
| General | trailing | 5232 | 1050 (20 %) | 7898 | 49 % | 0.65 | -5069.43 |
| Long | normal | 11178 | 1844 (16 %) | 14999 | 43 % | 0.99 | -339.20 |
| Long | trailing | 7452 | 1142 (15 %) | 8121 | 51 % | 0.73 | -5627.97 |
| Wide | axis | 55260 | 8538 (15 %) | 152840 | 29 % | 0.65 | -40788.12 |
| Wide | dca | 4912 | 1260 (26 %) | 13310 | 61 % | 0.67 | -6800.26 |
| Wide | dca-active | 4912 | 771 (16 %) | 8306 | 33 % | 0.59 | -3052.02 |
| Signals | normal | 1890 | 1086 (57 %) | 24726 | 69 % | 1.12 | 6409.06 |
| Signals | trailing | 1890 | 1144 (61 %) | 38596 | 68 % | 1.19 | 8081.24 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 46 (78 %) | 412 | 72 % | 1.64 | 278.71 |
| Signals | signal:act-hf | 60 | 6 (10 %) | 582 | 53 % | 0.43 | -782.13 |
| Signals | signal:adx | 60 | 16 (27 %) | 431 | 56 % | 0.54 | -591.81 |
| Signals | signal:atr-break | 59 | 29 (49 %) | 400 | 56 % | 0.72 | -191.83 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 426 | 53 % | 0.50 | -646.99 |
| Signals | signal:cci | 60 | 23 (38 %) | 622 | 65 % | 0.73 | -347.27 |
| Signals | signal:cmf | 57 | 0 (0 %) | 481 | 52 % | 0.29 | -996.89 |
| Signals | signal:donchian | 47 | 10 (21 %) | 285 | 58 % | 0.66 | -189.82 |
| Signals | signal:ema-cross | 60 | 55 (92 %) | 212 | 88 % | 6.36 | 425.86 |
| Signals | signal:ema-cross-fast | 60 | 48 (80 %) | 512 | 79 % | 1.94 | 471.68 |
| Signals | signal:ema-pullback | 60 | 5 (8 %) | 580 | 55 % | 0.34 | -1001.25 |
| Signals | signal:ema-slope | 60 | 30 (50 %) | 346 | 70 % | 1.12 | 68.92 |
| Signals | signal:ema-trend | 60 | 9 (15 %) | 653 | 63 % | 0.59 | -603.40 |
| Signals | signal:heikin-ashi | 59 | 1 (2 %) | 865 | 57 % | 0.40 | -1223.04 |
| Signals | signal:hma | 60 | 12 (20 %) | 533 | 51 % | 0.48 | -687.43 |
| Signals | signal:ichimoku | 43 | 5 (12 %) | 230 | 54 % | 0.51 | -263.27 |
| Signals | signal:impulse | 59 | 3 (5 %) | 552 | 46 % | 0.29 | -1089.03 |
| Signals | signal:kama | 60 | 12 (20 %) | 879 | 60 % | 0.62 | -688.15 |
| Signals | signal:keltner | 60 | 37 (62 %) | 236 | 67 % | 1.63 | 190.60 |
| Signals | signal:macd-cross | 58 | 6 (10 %) | 537 | 55 % | 0.53 | -553.44 |
| Signals | signal:macd-hist | 59 | 18 (31 %) | 887 | 64 % | 0.78 | -336.26 |
| Signals | signal:macd-slow | 60 | 17 (28 %) | 535 | 62 % | 0.72 | -283.57 |
| Signals | signal:mfi | 22 | 22 (100 %) | 44 | 91 % | 15.09 | 59.42 |
| Signals | signal:obv | 60 | 45 (75 %) | 701 | 73 % | 1.62 | 486.18 |
| Signals | signal:r-awesome | 60 | 4 (7 %) | 474 | 50 % | 0.35 | -927.68 |
| Signals | signal:r-connors | 48 | 20 (42 %) | 216 | 63 % | 0.43 | -349.60 |
| Signals | signal:r-fractal | 48 | 14 (29 %) | 152 | 42 % | 0.19 | -366.41 |
| Signals | signal:r-inside | 18 | 0 (0 %) | 22 | 18 % | 0.01 | -146.34 |
| Signals | signal:r-linreg | 60 | 7 (12 %) | 620 | 60 % | 0.47 | -748.82 |
| Signals | signal:r-nr-break | 60 | 15 (25 %) | 401 | 53 % | 0.48 | -532.53 |
| Signals | signal:r-session-trend | 60 | 8 (13 %) | 559 | 54 % | 0.43 | -889.20 |
| Signals | signal:r-vol-regime | 36 | 19 (53 %) | 84 | 51 % | 1.10 | 11.04 |
| Signals | signal:reclaim | 60 | 20 (33 %) | 854 | 66 % | 0.78 | -352.13 |
| Signals | signal:rsi-mid | 60 | 4 (7 %) | 493 | 50 % | 0.36 | -799.20 |
| Signals | signal:rsi-momentum | 26 | 24 (92 %) | 26 | 92 % | 3.71 | 45.83 |
| Signals | signal:rsi-reversal | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -16.64 |
| Signals | signal:s2-active-hf | 60 | 10 (17 %) | 709 | 56 % | 0.61 | -573.89 |
| Signals | signal:s2-adx-gate | 60 | 14 (23 %) | 553 | 65 % | 0.75 | -270.79 |
| Signals | signal:s2-atr-break | 60 | 6 (10 %) | 546 | 52 % | 0.46 | -701.72 |
| Signals | signal:s2-bb-bounce | 57 | 24 (42 %) | 253 | 49 % | 0.51 | -358.16 |
| Signals | signal:s2-block-scale | 60 | 7 (12 %) | 749 | 61 % | 0.49 | -901.22 |
| Signals | signal:s2-block-stack | 59 | 2 (3 %) | 369 | 47 % | 0.34 | -735.08 |
| Signals | signal:s2-confluence | 60 | 30 (50 %) | 874 | 65 % | 0.93 | -90.93 |
| Signals | signal:s2-ema-cross | 30 | 22 (73 %) | 33 | 76 % | 7.54 | 93.04 |
| Signals | signal:s2-range-break | 51 | 35 (69 %) | 78 | 68 % | 2.01 | 88.30 |
| Signals | signal:s2-range-shift | 59 | 14 (24 %) | 324 | 52 % | 0.49 | -433.54 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 111 | 59 % | 0.81 | -37.58 |
| Signals | signal:s2-st-trail | 58 | 48 (83 %) | 122 | 81 % | 2.51 | 137.53 |
| Signals | signal:s2-stoch-swing | 60 | 43 (72 %) | 732 | 75 % | 1.67 | 559.34 |
| Signals | signal:s2-vol-break | 56 | 30 (54 %) | 149 | 72 % | 0.85 | -46.26 |
| Signals | signal:s2-vwap-axis | 27 | 25 (93 %) | 27 | 93 % | 430.73 | 78.17 |
| Signals | signal:sar | 60 | 5 (8 %) | 741 | 59 % | 0.61 | -608.90 |
| Signals | signal:squeeze | 54 | 24 (44 %) | 55 | 44 % | 0.08 | -234.61 |
| Signals | signal:st-slow | 58 | 37 (64 %) | 132 | 70 % | 1.27 | 50.50 |
| Signals | signal:stoch-rsi | 60 | 5 (8 %) | 943 | 56 % | 0.42 | -1147.46 |
| Signals | signal:supertrend | 60 | 44 (73 %) | 261 | 70 % | 1.18 | 71.45 |
| Signals | signal:swing | 58 | 2 (3 %) | 730 | 56 % | 0.44 | -951.41 |
| Signals | signal:thrust | 60 | 2 (3 %) | 664 | 52 % | 0.33 | -1150.55 |
| Signals | signal:trix | 60 | 24 (40 %) | 269 | 65 % | 1.11 | 56.80 |
| Signals | signal:volume-break | 56 | 48 (86 %) | 61 | 85 % | 9.69 | 152.72 |
| Signals | signal:vwap | 60 | 28 (47 %) | 567 | 66 % | 0.99 | -11.01 |
| Signals | signal:williams-r | 60 | 21 (35 %) | 734 | 59 % | 0.81 | -276.26 |
| Signals | signal:zscore | 60 | 19 (32 %) | 342 | 54 % | 0.50 | -487.26 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1104 | 362 (33 %) | 9877 | 62 % | 0.66 | -7303.62 |
| Signals | 1.25 | 697 | 230 (33 %) | 6651 | 63 % | 0.66 | -4760.89 |
| Signals | 1.35 | 503 | 166 (33 %) | 4812 | 63 % | 0.67 | -3333.59 |
| Signals | 1.5 | 302 | 97 (32 %) | 2962 | 64 % | 0.66 | -2087.23 |
| Signals | 1.75 | 154 | 57 (37 %) | 1650 | 65 % | 0.72 | -851.89 |
| Signals | 2 | 87 | 35 (40 %) | 961 | 66 % | 0.79 | -329.89 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 325 | 83 % | 3.50 | 502.45 | tp8 sl16 tr2.4 h48 (8 · ∞ (no loss) · 29.50) |
| Signals | follow | sig-obv-m@m15 | 30 | 28 (93 %) | 269 | 81 % | 3.76 | 445.35 | tp8 sl16 tr1.6 h48 (12 · 456.27 · 30.83) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 151 | 95 % | 23.40 | 365.72 | tp8 sl16 tr1.6 h48 (6 · ∞ (no loss) · 15.98) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 129 | 88 % | 9.01 | 274.85 | tp8 sl16 tr1.6 h48 (5 · ∞ (no loss) · 13.83) |
| Signals | follow | sig-cci-m@m15 | 30 | 23 (77 %) | 178 | 80 % | 3.27 | 274.19 | tp5 sl10 tr1 h48 (9 · 251.35 · 16.87) |
| Signals | follow | sig-trix-s@m15 | 30 | 24 (80 %) | 175 | 71 % | 2.62 | 237.42 | tp8 sl16 tr1.6 h48 (8 · 37.91 · 19.89) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 24 (80 %) | 313 | 73 % | 1.69 | 220.42 | tp5 sl15 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-keltner-s@m15 | 30 | 24 (80 %) | 159 | 66 % | 2.12 | 156.53 | tp6 sl12 tr1.8 h48 (6 · 62.40 · 14.85) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 28 (93 %) | 83 | 88 % | 4.35 | 151.02 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 20 (67 %) | 409 | 70 % | 1.28 | 149.14 | tp8 sl16 tr2.4 h48 (10 · 748.23 · 24.41) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 58 | 98 % | 712.17 | 123.56 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 29 (97 %) | 62 | 92 % | 8.72 | 109.54 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 24 (80 %) | 33 | 82 % | 208.99 | 106.93 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 18 (60 %) | 361 | 72 % | 1.22 | 105.95 | tp8 sl16 tr3.2 h48 (6 · ∞ (no loss) · 26.56) |
| Signals | follow | sig-s2-range-break-s@m15 | 22 | 21 (95 %) | 36 | 81 % | 49.97 | 104.47 | tp3 sl6 tr0.6 h48 (5 · 4.50 · 2.57) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 22 (73 %) | 33 | 76 % | 7.54 | 93.04 | – |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 27 | 25 (93 %) | 27 | 93 % | 430.73 | 78.17 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 19.78 | 74.18 | – |
| Signals | follow | sig-vwap-m@m15 | 30 | 18 (60 %) | 162 | 73 % | 1.35 | 65.60 | tp4 sl8 tr0.8 h48 (8 · 64.43 · 12.00) |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 17 (57 %) | 104 | 76 % | 1.35 | 62.11 | tp2.5 sl3.75 tr0 h48 (5 · 0.87 · -1.00) |
| Signals | follow | sig-s2-vol-break-m@m15 | 26 | 24 (92 %) | 43 | 84 % | 4.49 | 60.86 | tp3 sl6 tr0.6 h48 (6 · 16.83 · 3.43) |
| Signals | follow | sig-mfi-m@m15 | 22 | 22 (100 %) | 44 | 91 % | 15.09 | 59.42 | – |
| Signals | follow | sig-act-burst-m@m15 | 29 | 22 (76 %) | 99 | 68 % | 1.52 | 58.29 | tp4 sl8 tr0.8 h48 (5 · 10.18 · 7.18) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 15 (50 %) | 407 | 69 % | 1.09 | 56.89 | tp5 sl15 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-rsi-momentum-s@m15 | 26 | 24 (92 %) | 26 | 92 % | 3.71 | 45.83 | – |
| Signals | follow | sig-volume-break-s@m15 | 26 | 24 (92 %) | 28 | 89 % | 3.69 | 45.80 | – |
| Signals | follow | sig-r-vol-regime-s@m15 | 26 | 18 (69 %) | 68 | 57 % | 1.65 | 43.11 | tp4 sl8 tr0.8 h48 (5 · 4.57 · 3.39) |
| Signals | follow | sig-obv-s@m15 | 30 | 17 (57 %) | 432 | 68 % | 1.07 | 40.83 | tp6 sl12 tr1.8 h48 (16 · 2.67 · 20.37) |
| Signals | follow | sig-keltner-m@m15 | 30 | 13 (43 %) | 77 | 69 % | 1.21 | 34.08 | tp3 sl6 tr0.6 h48 (5 · 0.11 · -5.97) |
| Signals | follow | sig-r-connors-s@m15 | 20 | 18 (90 %) | 29 | 90 % | 3.60 | 32.49 | – |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 16 (53 %) | 191 | 69 % | 1.10 | 31.55 | tp4 sl6 tr0 h48 (6 · 3.06 · 12.80) |
| Signals | follow | sig-st-slow-s@m15 | 28 | 19 (68 %) | 60 | 70 % | 1.36 | 27.99 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 28 | 19 (68 %) | 60 | 70 % | 1.36 | 27.99 | – |
| Signals | follow | sig-st-slow-m@m15 | 30 | 18 (60 %) | 72 | 71 % | 1.21 | 22.51 | – |
| Signals | follow | sig-atr-break-m@m15 | 29 | 21 (72 %) | 90 | 57 % | 1.08 | 8.66 | tp3 sl6 tr1.2 h48 (5 · 8.48 · 5.84) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 13 (43 %) | 242 | 67 % | 1.02 | 6.81 | tp8 sl16 tr1.6 h48 (9 · ∞ (no loss) · 17.10) |
| Signals | follow | sig-adx-m@m15 | 30 | 12 (40 %) | 152 | 69 % | 0.99 | -4.11 | tp8 sl16 tr1.6 h48 (6 · 179.87 · 9.67) |
| Signals | follow | sig-ichimoku-m@m15 | 13 | 3 (23 %) | 21 | 33 % | 0.04 | -14.12 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 29 | 14 (48 %) | 42 | 57 % | 0.81 | -16.17 | – |
| Signals | follow | sig-rsi-reversal-s@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -16.64 | – |
| Signals | follow | sig-zscore-m@m15 | 30 | 18 (60 %) | 55 | 67 % | 0.83 | -16.76 | tp3 sl6 tr0.6 h48 (5 · 0.12 · -10.98) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 27 | 19 (70 %) | 61 | 52 % | 0.79 | -25.49 | tp3 sl6 tr0.6 h48 (7 · 0.20 · -5.29) |
| Signals | follow | sig-r-vol-regime-m@m15 | 10 | 1 (10 %) | 16 | 25 % | 0.18 | -32.07 | – |
| Signals | follow | sig-squeeze-m@m15 | 24 | 17 (71 %) | 24 | 71 % | 0.29 | -44.89 | – |
| Signals | follow | sig-supertrend-s@m15 | 30 | 14 (47 %) | 203 | 62 % | 0.87 | -52.10 | tp8 sl16 tr2.4 h48 (5 · ∞ (no loss) · 19.90) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 13 (43 %) | 555 | 68 % | 0.93 | -63.61 | tp8 sl16 tr1.6 h48 (19 · 18.40 · 23.78) |
| Signals | follow | sig-vwap-s@m15 | 30 | 10 (33 %) | 405 | 64 % | 0.89 | -76.61 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-donchian-s@m15 | 30 | 8 (27 %) | 234 | 64 % | 0.80 | -84.39 | tp4 sl8 tr0.8 h48 (15 · 1.05 · 0.47) |
| Signals | follow | sig-hma-m@m15 | 30 | 11 (37 %) | 276 | 59 % | 0.84 | -84.54 | tp8 sl16 tr2.4 h48 (6 · 108.21 · 21.44) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 13 (43 %) | 451 | 62 % | 0.89 | -95.84 | tp8 sl16 tr2.4 h48 (9 · 2.53 · 24.76) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 12 (40 %) | 573 | 69 % | 0.89 | -96.27 | tp2.5 sl5 tr0 h48 (22 · 1.50 · 13.10) |
| Signals | follow | sig-donchian-m@m15 | 17 | 2 (12 %) | 51 | 31 % | 0.22 | -105.43 | tp2.5 sl5 tr0 h48 (5 · 0.29 · -11.00) |
| Signals | follow | sig-s2-vol-break-s@m15 | 30 | 6 (20 %) | 106 | 68 % | 0.62 | -107.11 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 26 | 10 (38 %) | 81 | 46 % | 0.43 | -111.76 | tp3 sl6 tr0.9 h48 (7 · 0.10 · -11.71) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 9 (30 %) | 403 | 67 % | 0.83 | -118.38 | tp2.5 sl7.5 tr0 h48 (15 · 1.94 · 14.50) |
| Signals | follow | sig-r-fractal-m@m15 | 21 | 8 (38 %) | 44 | 45 % | 0.07 | -123.78 | tp3 sl6 tr0.6 h48 (6 · 1.15 · 0.23) |
| Signals | follow | sig-r-inside-s@m15 | 18 | 0 (0 %) | 22 | 18 % | 0.01 | -146.34 | – |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 5 (17 %) | 150 | 61 % | 0.60 | -152.41 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 1 (3 %) | 139 | 55 % | 0.59 | -176.49 | tp4 sl8 tr1.2 h48 (5 · 0.99 · -0.11) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 8 (27 %) | 283 | 55 % | 0.67 | -180.42 | tp8 sl16 tr2.4 h48 (5 · 247.78 · 17.32) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 94 | 54 % | 0.49 | -180.62 | – |
| Signals | follow | sig-kama-m@m15 | 30 | 9 (30 %) | 405 | 63 % | 0.77 | -187.85 | tp8 sl16 tr3.2 h48 (7 · 1.66 · 10.77) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 7 (23 %) | 31 | 23 % | 0.01 | -189.72 | – |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 5 (17 %) | 170 | 61 % | 0.60 | -190.39 | tp8 sl16 tr1.6 h48 (5 · 36.06 · 7.40) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 8 (27 %) | 310 | 55 % | 0.66 | -200.49 | tp6 sl12 tr1.2 h48 (12 · 3.09 · 6.22) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 6 (20 %) | 298 | 66 % | 0.69 | -202.34 | tp8 sl16 tr3.2 h48 (5 · ∞ (no loss) · 14.25) |
| Signals | follow | sig-macd-cross-s@m15 | 29 | 6 (21 %) | 314 | 57 % | 0.63 | -240.00 | tp4 sl8 tr0 h48 (8 · 1.39 · 6.40) |
| Signals | follow | sig-macd-hist-s@m15 | 29 | 6 (21 %) | 314 | 57 % | 0.63 | -240.00 | tp4 sl8 tr0 h48 (8 · 1.39 · 6.40) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 10 (33 %) | 465 | 60 % | 0.70 | -240.07 | tp8 sl16 tr3.2 h48 (6 · 708.36 · 22.33) |
| Signals | follow | sig-r-fractal-s@m15 | 27 | 6 (22 %) | 108 | 41 % | 0.24 | -242.63 | tp4 sl8 tr0.8 h48 (6 · 0.57 · -3.62) |
| Signals | follow | sig-s2-range-shift-s@m15 | 29 | 9 (31 %) | 154 | 42 % | 0.34 | -243.15 | tp4 sl8 tr0.8 h48 (9 · 0.13 · -7.39) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 2 (7 %) | 209 | 56 % | 0.52 | -249.15 | tp4 sl12 tr0 h48 (5 · 1.25 · 3.00) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 5 (17 %) | 231 | 59 % | 0.51 | -251.07 | tp8 sl16 tr1.6 h48 (5 · ∞ (no loss) · 5.36) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 7 (23 %) | 190 | 54 % | 0.49 | -253.06 | tp6 sl12 tr1.2 h48 (7 · 35.42 · 10.03) |
| Signals | follow | sig-sar-s@m15 | 30 | 4 (13 %) | 378 | 63 % | 0.63 | -273.69 | tp4 sl8 tr0.8 h48 (24 · 1.11 · 2.04) |
| Signals | follow | sig-swing-s@m15 | 28 | 2 (7 %) | 312 | 62 % | 0.55 | -274.37 | tp2.5 sl3.75 tr0 h48 (14 · 1.46 · 7.20) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 8 (27 %) | 211 | 53 % | 0.47 | -279.47 | tp6 sl12 tr1.2 h48 (8 · 10.68 · 8.90) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 5 (17 %) | 355 | 56 % | 0.61 | -285.05 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 7 (23 %) | 299 | 63 % | 0.59 | -288.52 | tp8 sl16 tr2.4 h48 (6 · ∞ (no loss) · 12.32) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 5 (17 %) | 354 | 56 % | 0.60 | -288.85 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 4 (13 %) | 252 | 60 % | 0.47 | -296.77 | tp8 sl16 tr1.6 h48 (9 · 28.97 · 7.84) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 6 (20 %) | 309 | 56 % | 0.53 | -298.24 | tp6 sl12 tr1.2 h48 (13 · 13.97 · 9.65) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 3 (10 %) | 265 | 57 % | 0.46 | -300.85 | tp8 sl16 tr1.6 h48 (8 · 19.00 · 6.65) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 2 (7 %) | 246 | 54 % | 0.52 | -301.64 | tp3 sl6 tr0 h48 (7 · 1.13 · 1.60) |
| Signals | follow | sig-macd-cross-m@m15 | 29 | 0 (0 %) | 223 | 53 % | 0.41 | -313.45 | tp4 sl8 tr0.8 h48 (14 · 0.98 · -0.17) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 1 (3 %) | 344 | 59 % | 0.56 | -315.12 | tp6 sl12 tr1.8 h48 (7 · 0.92 · -1.00) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 3 (10 %) | 243 | 51 % | 0.49 | -325.61 | tp6 sl12 tr1.8 h48 (5 · 36.19 · 8.51) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 5 (17 %) | 192 | 48 % | 0.46 | -332.67 | tp5 sl10 tr0 h48 (5 · 0.71 · -6.00) |
| Signals | follow | sig-sar-m@m15 | 30 | 1 (3 %) | 363 | 54 % | 0.59 | -335.21 | tp8 sl16 tr3.2 h48 (5 · 1.05 · 0.87) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 4 (13 %) | 156 | 47 % | 0.30 | -345.82 | tp6 sl12 tr1.2 h48 (6 · 0.39 · -7.49) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 3 (10 %) | 303 | 53 % | 0.43 | -376.11 | tp3 sl6 tr0 h48 (10 · 1.05 · 1.00) |
| Signals | follow | sig-r-connors-m@m15 | 28 | 2 (7 %) | 187 | 58 % | 0.36 | -382.09 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-thrust-m@m15 | 30 | 1 (3 %) | 410 | 60 % | 0.51 | -383.31 | tp2.5 sl7.5 tr0 h48 (14 · 1.10 · 2.20) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 3 (10 %) | 355 | 61 % | 0.50 | -401.06 | tp3 sl6 tr0 h48 (10 · 1.05 · 1.00) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 3 (10 %) | 388 | 62 % | 0.52 | -408.80 | tp3 sl6 tr0 h48 (10 · 1.81 · 10.00) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 5 (17 %) | 297 | 56 % | 0.49 | -422.82 | tp6 sl12 tr1.8 h48 (8 · 1.35 · 4.38) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 3 (10 %) | 412 | 59 % | 0.49 | -424.48 | tp5 sl10 tr1 h48 (25 · 1.11 · 2.37) |
| Signals | follow | sig-s2-block-stack-m@m15 | 29 | 0 (0 %) | 123 | 35 % | 0.13 | -433.44 | tp2.5 sl3.75 tr0 h48 (6 · 0.58 · -4.95) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 3 (10 %) | 262 | 52 % | 0.36 | -466.38 | tp8 sl16 tr2.4 h48 (5 · ∞ (no loss) · 10.97) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 1 (3 %) | 287 | 52 % | 0.46 | -470.49 | tp8 sl16 tr2.4 h48 (5 · 1.05 · 0.74) |
| Signals | follow | sig-zscore-s@m15 | 30 | 1 (3 %) | 287 | 52 % | 0.46 | -470.49 | tp8 sl16 tr2.4 h48 (5 · 1.05 · 0.74) |
| Signals | follow | sig-cmf-s@m15 | 27 | 0 (0 %) | 257 | 55 % | 0.34 | -472.86 | tp4 sl8 tr1.2 h48 (11 · 0.71 · -4.82) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 0 (0 %) | 273 | 50 % | 0.36 | -483.89 | tp5 sl10 tr1 h48 (14 · 0.80 · -2.25) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 4 (13 %) | 361 | 59 % | 0.46 | -492.42 | tp8 sl16 tr2.4 h48 (7 · 29.77 · 6.26) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 2 (7 %) | 389 | 60 % | 0.44 | -497.74 | tp8 sl16 tr3.2 h48 (5 · 8.55 · 5.09) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 1 (3 %) | 228 | 41 % | 0.29 | -498.35 | tp6 sl12 tr1.2 h48 (7 · 19.40 · 6.74) |
| Signals | follow | sig-kama-s@m15 | 30 | 3 (10 %) | 474 | 58 % | 0.50 | -500.30 | tp8 sl16 tr3.2 h48 (6 · 1.24 · 3.84) |
| Signals | follow | sig-cmf-m@m15 | 30 | 0 (0 %) | 224 | 48 % | 0.23 | -524.03 | tp4 sl8 tr0.8 h48 (15 · 0.94 · -0.54) |
| Signals | follow | sig-impulse-s@m15 | 29 | 0 (0 %) | 344 | 51 % | 0.33 | -533.25 | tp6 sl12 tr2.4 h48 (6 · 0.58 · -5.72) |
| Signals | follow | sig-impulse-m@m15 | 30 | 3 (10 %) | 208 | 38 % | 0.25 | -555.78 | tp6 sl12 tr1.2 h48 (7 · 28.26 · 9.04) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 1 (3 %) | 523 | 63 % | 0.50 | -580.48 | tp5 sl7.5 tr0 h48 (8 · 1.04 · 0.90) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 0 (0 %) | 318 | 51 % | 0.38 | -581.86 | tp6 sl12 tr2.4 h48 (5 · 0.85 · -1.77) |
| Signals | follow | sig-adx-s@m15 | 30 | 4 (13 %) | 279 | 49 % | 0.41 | -587.70 | tp8 sl16 tr3.2 h48 (6 · 1.54 · 8.67) |
| Signals | follow | sig-hma-s@m15 | 30 | 1 (3 %) | 257 | 44 % | 0.24 | -602.89 | tp6 sl12 tr1.2 h48 (11 · 0.41 · -8.54) |
| Signals | follow | sig-cci-s@m15 | 30 | 0 (0 %) | 444 | 59 % | 0.47 | -621.46 | tp8 sl16 tr3.2 h48 (9 · 0.74 · -6.20) |
| Signals | follow | sig-heikin-ashi-m@m15 | 29 | 0 (0 %) | 342 | 48 % | 0.29 | -642.56 | tp6 sl12 tr1.8 h48 (6 · 0.21 · -9.71) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 418 | 52 % | 0.37 | -677.04 | tp8 sl16 tr1.6 h48 (12 · 0.72 · -4.64) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 1 (3 %) | 328 | 51 % | 0.26 | -704.47 | tp8 sl16 tr1.6 h48 (8 · 0.15 · -13.84) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 2 (7 %) | 531 | 53 % | 0.38 | -722.98 | tp8 sl16 tr2.4 h48 (13 · 0.64 · -7.89) |
| Signals | follow | sig-thrust-s@m15 | 30 | 1 (3 %) | 254 | 38 % | 0.18 | -767.23 | tp8 sl16 tr1.6 h48 (5 · 8.90 · 3.22) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 3.00× | tr off | 89 | 65 (73 %) | 188 | 84 % | 1.87 | 418.76 |
| Signals | tp 8.000% | sl 2.00× | tr 0.30× | 115 | 69 (60 %) | 515 | 80 % | 1.10 | 96.79 |
| Signals | tp 8.000% | sl 2.00× | tr 0.20× | 115 | 73 (63 %) | 759 | 75 % | 1.10 | 91.54 |
| Signals | tp 8.000% | sl 2.00× | tr 0.40× | 113 | 68 (60 %) | 394 | 82 % | 1.05 | 46.64 |
| Signals | tp 6.000% | sl 2.00× | tr 0.30× | 117 | 53 (45 %) | 779 | 72 % | 0.75 | -371.28 |
| Signals | tp 5.000% | sl 3.00× | tr off | 107 | 47 (44 %) | 335 | 70 % | 0.75 | -372.06 |
| Signals | tp 6.000% | sl 2.00× | tr 0.20× | 117 | 49 (42 %) | 1124 | 64 % | 0.73 | -411.60 |
| Signals | tp 6.000% | sl 2.00× | tr 0.40× | 116 | 48 (41 %) | 579 | 72 % | 0.68 | -484.82 |
| Signals | tp 6.000% | sl 2.00× | tr off | 98 | 31 (32 %) | 275 | 57 % | 0.64 | -507.24 |
| Signals | tp 5.000% | sl 2.00× | tr 0.20× | 119 | 43 (36 %) | 1364 | 63 % | 0.63 | -672.99 |
| Signals | tp 4.000% | sl 2.00× | tr 0.20× | 120 | 36 (30 %) | 1730 | 59 % | 0.59 | -806.67 |
| Signals | tp 5.000% | sl 2.00× | tr off | 108 | 32 (30 %) | 433 | 55 % | 0.58 | -823.46 |
| Signals | tp 4.000% | sl 3.00× | tr off | 110 | 32 (29 %) | 488 | 65 % | 0.59 | -838.53 |
| Signals | tp 4.000% | sl 2.00× | tr 0.30× | 117 | 36 (31 %) | 1278 | 58 % | 0.58 | -851.27 |
| Signals | tp 4.000% | sl 1.50× | tr off | 114 | 36 (32 %) | 757 | 51 % | 0.63 | -851.40 |
| Signals | tp 3.000% | sl 2.00× | tr off | 118 | 36 (31 %) | 898 | 58 % | 0.63 | -862.19 |
| Signals | tp 2.500% | sl 3.00× | tr off | 118 | 38 (32 %) | 919 | 68 % | 0.62 | -867.19 |
| Signals | tp 6.000% | sl 1.50× | tr off | 107 | 25 (23 %) | 372 | 45 % | 0.52 | -892.64 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 34 (29 %) | 707 | 66 % | 0.58 | -926.80 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 29 (24 %) | 1183 | 59 % | 0.63 | -954.99 |
| Signals | tp 5.000% | sl 2.00× | tr 0.40× | 116 | 37 (32 %) | 783 | 63 % | 0.52 | -959.19 |
| Signals | tp 2.500% | sl 1.50× | tr off | 120 | 27 (23 %) | 1350 | 52 % | 0.62 | -964.64 |
| Signals | tp 5.000% | sl 1.50× | tr off | 112 | 29 (26 %) | 546 | 47 % | 0.56 | -971.74 |
| Signals | tp 5.000% | sl 2.00× | tr 0.30× | 116 | 40 (34 %) | 939 | 65 % | 0.51 | -976.68 |
| Signals | tp 4.000% | sl 2.00× | tr off | 111 | 29 (26 %) | 619 | 55 % | 0.56 | -1000.41 |
| Signals | tp 3.000% | sl 2.00× | tr 0.40× | 119 | 34 (29 %) | 1485 | 54 % | 0.54 | -1012.00 |
| Signals | tp 3.000% | sl 2.00× | tr 0.30× | 120 | 31 (26 %) | 1794 | 56 % | 0.52 | -1049.87 |
| Signals | tp 3.000% | sl 2.00× | tr 0.20× | 120 | 33 (28 %) | 2209 | 54 % | 0.47 | -1126.18 |
| Signals | tp 4.000% | sl 2.00× | tr 0.40× | 116 | 33 (28 %) | 1048 | 59 % | 0.49 | -1166.59 |
| Signals | tp 3.000% | sl 1.50× | tr off | 120 | 27 (23 %) | 1127 | 48 % | 0.55 | -1225.99 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 72 (72) | 54988 | 25256 | 25256 | 0 | baseTarget 29732 |
| Micro | trailing | 72 (72) | 109976 | 50512 | 50512 | 0 | baseTarget 59464 |
| Short | normal | 251 (217) | 35820 | 13152 | 13152 | 0 | baseRange 12708 · baseTarget 9960 |
| Short | trailing | 251 (217) | 71640 | 26304 | 26304 | 0 | baseRange 25416 · baseTarget 19920 |
| General | normal | 251 (199) | 23880 | 7848 | 7848 | 0 | baseRange 11544 · baseTarget 4488 |
| General | trailing | 251 (199) | 15920 | 5232 | 5232 | 0 | baseRange 7696 · baseTarget 2992 |
| Long | normal | 251 (213) | 29850 | 11178 | 11178 | 0 | baseTarget 5922 · baseRange 12750 |
| Long | trailing | 251 (213) | 19900 | 7452 | 7452 | 0 | baseTarget 3948 · baseRange 8500 |
| Wide | axis | 323 (323) | 55260 | 55260 | 55260 | 0 | – |
| Wide | dca | 323 (323) | 4912 | 4912 | 4912 | 0 | – |
| Wide | dca-active | 323 (323) | 4912 | 4912 | 4912 | 0 | – |

Engine indications Base evaluated that built no set: 68 (bb-bounce, bb-walk, break-atr, break-atr-0.9, cci-14-100, cci-14-200, cci-20-100, cci-20-200, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-ivwapd-2, mc-lag-3, mc-mturn-10, mc-mturn-5, mc-qrsi2-5, mc-rsi4-5, mc-rsi9-15, mc-rsimid-14, mc-rsit14-30, mc-rsit2-30, mc-rsit3-15, mc-rsit3-20, mc-rsit3-25, mc-rsit3-30, mc-rsit3-5, mc-rsit4-10, mc-rsit4-20, mc-rsit4-25, mc-rsit4-30, mc-rsit4-5, mc-rsit5-20, mc-rsit5-25, mc-rsit5-30, mc-rsit7-15, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.23 (300) | 0.27 (444) | 0.38 (450) | 0.31 (426) | 0.40 (600) |
| 1.14× | – | 0.10 (150) | – | – | – | – | – |
| 1.25× | – | 0.09 (150) | 0.20 (300) | 0.27 (408) | 0.38 (450) | 0.53 (410) | 0.51 (594) |
| 1.33× | 0.06 (96) | – | – | – | – | – | – |
| 1.5× | 0.05 (96) | 0.10 (150) | 0.24 (282) | 0.28 (408) | 0.44 (440) | 0.46 (410) | 0.54 (594) |
| 1.75× | 0.06 (96) | 0.10 (150) | 0.36 (282) | 0.42 (408) | 0.42 (440) | 0.44 (410) | 0.51 (588) |
| 2× | 0.06 (96) | 0.21 (150) | 0.32 (282) | 0.40 (408) | 0.38 (440) | 0.42 (398) | 0.48 (576) |
| 2.25× | 0.05 (96) | 0.19 (150) | 0.32 (282) | 0.37 (408) | 0.38 (424) | 0.41 (398) | 0.44 (576) |
| 2.5× | 0.11 (96) | 0.18 (150) | 0.30 (282) | 0.35 (402) | 0.37 (424) | 0.38 (398) | 0.45 (570) |
| 2.75× | 0.10 (96) | 0.16 (150) | 0.29 (276) | 0.32 (402) | 0.34 (424) | 0.36 (392) | 0.54 (570) |
| 3× | 0.09 (96) | 0.17 (144) | 0.27 (276) | 0.30 (402) | 0.36 (412) | 0.41 (392) | 0.50 (570) |
| 3.25× | 0.09 (96) | 0.16 (144) | 0.25 (276) | 0.29 (396) | 0.41 (412) | 0.38 (392) | 0.52 (570) |
| 3.5× | 0.09 (90) | 0.15 (144) | 0.24 (276) | 0.29 (396) | 0.39 (412) | 0.39 (392) | 0.58 (570) |
| 3.75× | 0.09 (90) | 0.14 (144) | 0.25 (276) | 0.27 (396) | 0.40 (412) | 0.39 (392) | 0.55 (570) |
| 4× | 0.08 (90) | 0.13 (144) | 0.24 (276) | 0.26 (396) | 0.44 (412) | 0.40 (392) | 0.61 (564) |
| 4.25× | 0.08 (90) | 0.12 (144) | 0.22 (276) | 0.33 (396) | 0.56 (412) | 0.38 (392) | 0.57 (564) |
| 4.5× | 0.07 (90) | 0.14 (144) | 0.21 (276) | 0.37 (396) | 0.53 (412) | 0.40 (392) | 0.65 (564) |
| 4.75× | 0.07 (90) | 0.13 (144) | 0.28 (276) | 0.43 (396) | 0.51 (412) | 0.38 (392) | 0.62 (564) |
| 5× | 0.07 (90) | 0.13 (144) | 0.27 (276) | 0.41 (396) | 0.49 (412) | 0.44 (392) | 0.69 (552) |

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
| 2.25× | – | – | – | – | – | – | – |
| 2.5× | – | – | – | – | – | – | – |
| 2.75× | – | – | – | – | – | – | – |
| 3× | – | – | – | – | – | – | – |
| 3.25× | – | – | – | – | – | – | – |
| 3.5× | – | – | – | – | – | – | – |
| 3.75× | – | – | – | – | – | – | – |
| 4× | – | – | – | – | – | – | – |
| 4.25× | – | – | – | – | – | – | – |
| 4.5× | – | – | – | – | – | – | – |
| 4.75× | – | – | – | – | – | – | – |
| 5× | – | – | – | – | – | – | – |

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
| 3.75× | – | – | – | – | – | – | – |
| 4× | – | – | – | – | – | – | – |
| 4.25× | – | – | – | – | – | – | – |
| 4.5× | – | – | – | – | – | – | – |
| 4.75× | – | – | – | – | – | – | – |
| 5× | – | – | – | – | – | – | – |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.51 (4006) | 0.47 (5070) | 0.58 (5122) | 0.61 (4682) | 0.62 (5450) | 0.58 (6616) |
| 1.5× | 0.65 (3680) | 0.58 (4580) | 0.65 (4552) | 0.72 (4008) | 0.66 (4688) | 0.72 (5507) |
| 2× | 0.69 (3394) | 0.62 (4102) | 0.73 (4142) | 0.82 (3702) | 0.78 (4352) | 0.74 (5096) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.69 (1418) | 0.60 (986) | 0.66 (1348) | 0.86 (1350) |
| 0.75× | 0.72 (1240) | 0.70 (826) | 0.73 (1104) | 0.90 (1100) |
| 1× | 0.72 (3460) | 0.66 (2176) | 0.65 (2889) | 0.82 (2989) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | – | – | – | – |
| 0.75× | – | – | – | – |
| 1× | – | – | – | – |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | – | – | – | – |
| 0.75× | – | – | – | – |
| 1× | – | – | – | – |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.93 (1349) | 0.92 (1244) | 0.91 (1265) | 0.89 (1020) | 1.00 (1237) |
| 0.75× | 0.98 (1063) | 0.92 (986) | 1.05 (990) | 0.93 (799) | 1.05 (953) |
| 1× | 0.87 (2855) | 0.81 (2566) | 0.82 (2515) | 0.85 (1884) | 0.87 (2394) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | – | – | – | – | – |
| 0.75× | – | – | – | – | – |
| 1× | – | – | – | – | – |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | – | – | – | – | – |
| 0.75× | – | – | – | – | – |
| 1× | – | – | – | – | – |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.54 (13368) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.42 (504) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.60 (15455) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.47 (483) | 0.55 (584) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.38 (467) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.66 (542) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.74 (533) | – | – | – | – |
| 1× | – | – | – | 0.63 (99453) | – | – | – | 0.72 (30649) | 0.52 (3477) | – | 0.69 (1243) | – | 0.63 (3063) | 0.66 (2719) | 0.91 (1015) | 1.43 (901) |

### Wide — configs that passed their evaluation

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
