# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1324/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 328/19072 · PF 1.60 · Micro 257/5900 · PF 2.43 · Short 630/8176 · PF 1.51 · General 511/8176 · PF 1.52 · Long 535/8176 · PF 1.55 · Signals 126/126 · PF 1.11; Main 1198 pairs, 235132 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 206 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.00 (0.00 %, closed orders) · equity at end $20.00 (open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ – (gross profit $ ÷ gross loss $ as sized) · PF unit – (every order at one unit: the engine's PF) · 0 positions / 0 orders · WR 0.00 % · DDT (closed trades, $) 0.00 h · DDR – (net ≤ 0) · equity max drawdown $0.00 (0.00 %) · margin used max $0.00 · open avg 0.00 pos / 0.00 orders (peak 0 / 0)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 0 orders capped to $0, 0 scaled down · binding: position cap 0, gross cap 0. **Without the caps:** balance $20.00 → $20.00 (0.00 %) · PF $ – · equity at end $20.00 · equity max drawdown $0.00 (0.00 %) · margin used max $0.00.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 411 | 1149  | 4.6 % | 1.581 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 411 | 1149 (+0) | 4.6 % | 1.581 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 411 | 1149 (+0) | 4.6 % | 1.581 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 373 | 1026 (-123) | 4.1 % | 1.651 |
| closes ≥ 6 | 1.00 | 6 | 1 | 604 | 1567 (+418) | 6.3 % | 1.837 |
| closes ≥ 20 | 1.00 | 20 | 1 | 285 | 865 (-284) | 3.5 % | 1.432 |
| closes ≥ 30 | 1.00 | 30 | 1 | 192 | 641 (-508) | 2.6 % | 1.319 |
| DDR off | 1.00 | 12 | off | 1558 | 2662 (+1513) | 10.7 % | 1.149 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 774 | 1683 (+534) | 6.7 % | 1.361 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 154 | 609 (-540) | 2.4 % | 2.004 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1558 | 2662 (+1513) | 10.7 % | 1.149 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2028 | 3251 (+2102) | 13.0 % | 1.185 |

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1198 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (235132 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3345); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 23757 · 0.72 | 6097 · 0.80 | 8103 · 0.90 | 1332 · 0.59 | – | – | – | – | – |
| 13:00 | 40499 · 0.44 | 7111 · 0.69 | 13608 · 0.67 | 1244 · 3.93 | – | – | – | – | – |
| 14:00 | 29930 · 1.91 | 7548 · 2.05 | 10969 · 1.91 | 2505 · 6.11 | – | – | – | – | – |
| 15:00 | 32885 · 1.26 | 7682 · 0.96 | 11821 · 1.33 | 3284 · 0.60 | – | – | – | – | – |
| 16:00 | 25241 · 1.23 | 4654 · 1.06 | 9896 · 1.63 | 1136 · 1.16 | – | – | – | – | – |
| 17:00 | 18790 · 1.54 | 3948 · 1.12 | 7162 · 1.34 | 1533 · 1.51 | – | – | – | – | – |
| 18:00 | 18075 · 1.73 | 2844 · 2.60 | 5092 · 1.88 | 1042 · 0.78 | – | – | – | – | – |
| 19:00 | 19913 · 0.97 | 5135 · 1.48 | 6494 · 0.91 | 1092 · 0.96 | – | – | – | – | – |
| 20:00 | 30723 · 0.68 | 8324 · 1.13 | 6584 · 0.57 | 1088 · 0.17 | – | – | – | – | – |
| 21:00 | 42855 · 0.56 | 12131 · 0.81 | 13698 · 0.50 | 2683 · 0.51 | – | – | – | – | – |
| 22:00 | 45451 · 0.36 | 11928 · 0.39 | 17965 · 0.35 | 3359 · 0.10 | – | – | – | – | – |
| 23:00 | 30615 · 0.41 | 6013 · 0.49 | 7957 · 0.31 | 1389 · 0.17 | – | – | – | – | – |
| **total** | **358734 · 0.76** | **83415 · 0.86** | **119349 · 0.72** | **21687 · 0.50** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 43041 | sig:confirm 43041 |

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
| Micro | 2.43 | – | – | – | – | 0 |
| Short | 1.51 | – | – | – | – | 0 |
| General | 1.52 | – | – | – | – | 0 |
| Long | 1.55 | – | – | – | – | 0 |
| Wide | 1.60 | – | – | – | – | 0 |
| Signals | 1.11 | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 231352 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2247 units active at the run start, 2997 over the run, 3345 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1634 | 355 (22 %) | 9046 | 52 % | 0.50 | -15258.70 |
| Signals | trailing | 1711 | 537 (31 %) | 12641 | 59 % | 0.49 | -13294.27 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 49 (83 %) | 371 | 76 % | 1.79 | 321.80 |
| Signals | signal:act-hf | 59 | 10 (17 %) | 521 | 55 % | 0.48 | -677.22 |
| Signals | signal:adx | 60 | 16 (27 %) | 336 | 60 % | 0.58 | -377.93 |
| Signals | signal:atr-break | 59 | 34 (58 %) | 354 | 61 % | 0.96 | -25.15 |
| Signals | signal:bollinger | 60 | 6 (10 %) | 433 | 54 % | 0.52 | -692.91 |
| Signals | signal:cci | 60 | 0 (0 %) | 541 | 55 % | 0.41 | -1015.22 |
| Signals | signal:cmf | 57 | 2 (4 %) | 409 | 47 % | 0.25 | -1025.92 |
| Signals | signal:donchian | 44 | 11 (25 %) | 187 | 57 % | 0.60 | -171.82 |
| Signals | signal:ema-cross | 50 | 38 (76 %) | 140 | 84 % | 3.71 | 214.80 |
| Signals | signal:ema-cross-fast | 60 | 39 (65 %) | 356 | 73 % | 1.19 | 96.72 |
| Signals | signal:ema-pullback | 60 | 7 (12 %) | 488 | 58 % | 0.39 | -797.35 |
| Signals | signal:ema-slope | 58 | 14 (24 %) | 243 | 65 % | 0.63 | -199.81 |
| Signals | signal:ema-trend | 60 | 8 (13 %) | 530 | 59 % | 0.45 | -799.97 |
| Signals | signal:heikin-ashi | 59 | 1 (2 %) | 644 | 54 % | 0.38 | -1170.81 |
| Signals | signal:hma | 59 | 5 (8 %) | 434 | 52 % | 0.41 | -724.65 |
| Signals | signal:ichimoku | 49 | 16 (33 %) | 209 | 53 % | 0.44 | -310.58 |
| Signals | signal:impulse | 60 | 2 (3 %) | 404 | 42 % | 0.22 | -1069.44 |
| Signals | signal:kama | 59 | 4 (7 %) | 674 | 57 % | 0.45 | -938.09 |
| Signals | signal:keltner | 50 | 17 (34 %) | 133 | 50 % | 0.76 | -75.06 |
| Signals | signal:macd-cross | 60 | 4 (7 %) | 465 | 55 % | 0.48 | -661.62 |
| Signals | signal:macd-hist | 60 | 12 (20 %) | 645 | 61 % | 0.65 | -484.21 |
| Signals | signal:macd-slow | 60 | 9 (15 %) | 439 | 56 % | 0.52 | -579.54 |
| Signals | signal:mfi | 30 | 29 (97 %) | 73 | 90 % | 8.58 | 127.79 |
| Signals | signal:obv | 60 | 44 (73 %) | 604 | 74 % | 1.46 | 347.31 |
| Signals | signal:r-awesome | 58 | 6 (10 %) | 323 | 42 % | 0.23 | -850.75 |
| Signals | signal:r-connors | 45 | 20 (44 %) | 190 | 58 % | 0.39 | -362.83 |
| Signals | signal:r-fractal | 44 | 6 (14 %) | 97 | 22 % | 0.04 | -408.08 |
| Signals | signal:r-inside | 19 | 0 (0 %) | 27 | 7 % | 0.00 | -156.14 |
| Signals | signal:r-linreg | 60 | 4 (7 %) | 572 | 54 % | 0.38 | -1044.33 |
| Signals | signal:r-nr-break | 55 | 1 (2 %) | 319 | 39 % | 0.21 | -995.72 |
| Signals | signal:r-session-trend | 60 | 5 (8 %) | 453 | 49 % | 0.33 | -1085.98 |
| Signals | signal:r-vol-regime | 33 | 22 (67 %) | 59 | 58 % | 1.80 | 46.83 |
| Signals | signal:reclaim | 60 | 6 (10 %) | 655 | 62 % | 0.57 | -694.76 |
| Signals | signal:rsi-mid | 58 | 3 (5 %) | 385 | 42 % | 0.22 | -961.80 |
| Signals | signal:rsi-momentum | 25 | 23 (92 %) | 25 | 92 % | 3.39 | 40.46 |
| Signals | signal:rsi-reversal | 40 | 12 (30 %) | 45 | 31 % | 0.09 | -198.25 |
| Signals | signal:s2-active-hf | 58 | 4 (7 %) | 607 | 56 % | 0.56 | -623.86 |
| Signals | signal:s2-adx-gate | 60 | 13 (22 %) | 442 | 64 % | 0.62 | -380.03 |
| Signals | signal:s2-atr-break | 60 | 2 (3 %) | 403 | 41 % | 0.24 | -1077.63 |
| Signals | signal:s2-bb-bounce | 60 | 16 (27 %) | 319 | 49 % | 0.42 | -586.83 |
| Signals | signal:s2-block-scale | 60 | 8 (13 %) | 622 | 59 % | 0.50 | -757.14 |
| Signals | signal:s2-block-stack | 58 | 6 (10 %) | 300 | 50 % | 0.41 | -591.02 |
| Signals | signal:s2-confluence | 60 | 16 (27 %) | 711 | 62 % | 0.66 | -497.04 |
| Signals | signal:s2-ema-cross | 30 | 24 (80 %) | 33 | 82 % | 8.42 | 105.26 |
| Signals | signal:s2-range-break | 47 | 34 (72 %) | 73 | 74 % | 1.67 | 67.93 |
| Signals | signal:s2-range-shift | 52 | 5 (10 %) | 191 | 35 % | 0.21 | -587.07 |
| Signals | signal:s2-rsi-revert | 57 | 21 (37 %) | 146 | 51 % | 0.42 | -257.18 |
| Signals | signal:s2-st-trail | 44 | 27 (61 %) | 49 | 55 % | 0.39 | -64.36 |
| Signals | signal:s2-stoch-swing | 60 | 41 (68 %) | 607 | 75 % | 1.53 | 442.77 |
| Signals | signal:s2-vol-break | 54 | 29 (54 %) | 131 | 72 % | 0.83 | -49.04 |
| Signals | signal:sar | 59 | 2 (3 %) | 554 | 52 % | 0.41 | -915.77 |
| Signals | signal:squeeze | 52 | 18 (35 %) | 53 | 34 % | 0.05 | -295.83 |
| Signals | signal:st-slow | 47 | 15 (32 %) | 73 | 47 % | 0.30 | -152.14 |
| Signals | signal:stoch-rsi | 60 | 7 (12 %) | 762 | 58 % | 0.45 | -953.15 |
| Signals | signal:supertrend | 50 | 26 (52 %) | 221 | 61 % | 0.69 | -142.74 |
| Signals | signal:swing | 59 | 1 (2 %) | 522 | 50 % | 0.30 | -1054.77 |
| Signals | signal:thrust | 59 | 1 (2 %) | 560 | 51 % | 0.36 | -1044.01 |
| Signals | signal:trix | 55 | 12 (22 %) | 150 | 49 % | 0.26 | -345.89 |
| Signals | signal:volume-break | 55 | 50 (91 %) | 56 | 89 % | 10.21 | 159.48 |
| Signals | signal:vwap | 60 | 16 (27 %) | 436 | 63 % | 0.66 | -310.98 |
| Signals | signal:williams-r | 60 | 12 (20 %) | 548 | 56 % | 0.65 | -494.70 |
| Signals | signal:zscore | 60 | 1 (2 %) | 335 | 48 % | 0.38 | -786.99 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 94830 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 94830 | 0 |  |
| Short | 40068 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 40068 | 0 |  |
| General | 13980 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13980 | 0 |  |
| Long | 18980 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18980 | 0 |  |
| Wide | 63494 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 63494 | 0 |  |
| Signals | 3780 | – | 2247 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2247 units (pair × symbol × direction) active at the run start, 2997 over the run; 3345 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 31610 | 1670 (5 %) | 10640 | 61 % | 0.31 | -4276.58 |
| Micro | trailing | 63220 | 3280 (5 %) | 21396 | 55 % | 0.27 | -8855.30 |
| Short | normal | 13356 | 3086 (23 %) | 25421 | 55 % | 0.77 | -8727.40 |
| Short | trailing | 26712 | 6189 (23 %) | 55482 | 53 % | 0.63 | -25526.81 |
| General | normal | 8388 | 1350 (16 %) | 13088 | 38 % | 0.80 | -4592.20 |
| General | trailing | 5592 | 1006 (18 %) | 7806 | 49 % | 0.68 | -4429.23 |
| Long | normal | 11388 | 1701 (15 %) | 13454 | 42 % | 0.97 | -1042.90 |
| Long | trailing | 7592 | 1062 (14 %) | 7392 | 51 % | 0.73 | -5188.57 |
| Wide | axis | 53910 | 8405 (16 %) | 136465 | 30 % | 0.69 | -31874.81 |
| Wide | dca | 4792 | 1143 (24 %) | 12158 | 62 % | 0.68 | -5857.99 |
| Wide | dca-active | 4792 | 685 (14 %) | 7347 | 34 % | 0.61 | -2577.10 |
| Signals | normal | 1890 | 911 (48 %) | 20812 | 66 % | 0.97 | -1681.40 |
| Signals | trailing | 1890 | 979 (52 %) | 27273 | 67 % | 1.00 | -44.36 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 49 (83 %) | 371 | 76 % | 1.79 | 321.80 |
| Signals | signal:act-hf | 59 | 10 (17 %) | 521 | 55 % | 0.48 | -677.22 |
| Signals | signal:adx | 60 | 16 (27 %) | 336 | 60 % | 0.58 | -377.93 |
| Signals | signal:atr-break | 59 | 34 (58 %) | 354 | 61 % | 0.96 | -25.15 |
| Signals | signal:bollinger | 60 | 6 (10 %) | 433 | 54 % | 0.52 | -692.91 |
| Signals | signal:cci | 60 | 0 (0 %) | 541 | 55 % | 0.41 | -1015.22 |
| Signals | signal:cmf | 57 | 2 (4 %) | 409 | 47 % | 0.25 | -1025.92 |
| Signals | signal:donchian | 44 | 11 (25 %) | 187 | 57 % | 0.60 | -171.82 |
| Signals | signal:ema-cross | 50 | 38 (76 %) | 140 | 84 % | 3.71 | 214.80 |
| Signals | signal:ema-cross-fast | 60 | 39 (65 %) | 356 | 73 % | 1.19 | 96.72 |
| Signals | signal:ema-pullback | 60 | 7 (12 %) | 488 | 58 % | 0.39 | -797.35 |
| Signals | signal:ema-slope | 58 | 14 (24 %) | 243 | 65 % | 0.63 | -199.81 |
| Signals | signal:ema-trend | 60 | 8 (13 %) | 530 | 59 % | 0.45 | -799.97 |
| Signals | signal:heikin-ashi | 59 | 1 (2 %) | 644 | 54 % | 0.38 | -1170.81 |
| Signals | signal:hma | 59 | 5 (8 %) | 434 | 52 % | 0.41 | -724.65 |
| Signals | signal:ichimoku | 49 | 16 (33 %) | 209 | 53 % | 0.44 | -310.58 |
| Signals | signal:impulse | 60 | 2 (3 %) | 404 | 42 % | 0.22 | -1069.44 |
| Signals | signal:kama | 59 | 4 (7 %) | 674 | 57 % | 0.45 | -938.09 |
| Signals | signal:keltner | 50 | 17 (34 %) | 133 | 50 % | 0.76 | -75.06 |
| Signals | signal:macd-cross | 60 | 4 (7 %) | 465 | 55 % | 0.48 | -661.62 |
| Signals | signal:macd-hist | 60 | 12 (20 %) | 645 | 61 % | 0.65 | -484.21 |
| Signals | signal:macd-slow | 60 | 9 (15 %) | 439 | 56 % | 0.52 | -579.54 |
| Signals | signal:mfi | 30 | 29 (97 %) | 73 | 90 % | 8.58 | 127.79 |
| Signals | signal:obv | 60 | 44 (73 %) | 604 | 74 % | 1.46 | 347.31 |
| Signals | signal:r-awesome | 58 | 6 (10 %) | 323 | 42 % | 0.23 | -850.75 |
| Signals | signal:r-connors | 45 | 20 (44 %) | 190 | 58 % | 0.39 | -362.83 |
| Signals | signal:r-fractal | 44 | 6 (14 %) | 97 | 22 % | 0.04 | -408.08 |
| Signals | signal:r-inside | 19 | 0 (0 %) | 27 | 7 % | 0.00 | -156.14 |
| Signals | signal:r-linreg | 60 | 4 (7 %) | 572 | 54 % | 0.38 | -1044.33 |
| Signals | signal:r-nr-break | 55 | 1 (2 %) | 319 | 39 % | 0.21 | -995.72 |
| Signals | signal:r-session-trend | 60 | 5 (8 %) | 453 | 49 % | 0.33 | -1085.98 |
| Signals | signal:r-vol-regime | 33 | 22 (67 %) | 59 | 58 % | 1.80 | 46.83 |
| Signals | signal:reclaim | 60 | 6 (10 %) | 655 | 62 % | 0.57 | -694.76 |
| Signals | signal:rsi-mid | 58 | 3 (5 %) | 385 | 42 % | 0.22 | -961.80 |
| Signals | signal:rsi-momentum | 25 | 23 (92 %) | 25 | 92 % | 3.39 | 40.46 |
| Signals | signal:rsi-reversal | 40 | 12 (30 %) | 45 | 31 % | 0.09 | -198.25 |
| Signals | signal:s2-active-hf | 58 | 4 (7 %) | 607 | 56 % | 0.56 | -623.86 |
| Signals | signal:s2-adx-gate | 60 | 13 (22 %) | 442 | 64 % | 0.62 | -380.03 |
| Signals | signal:s2-atr-break | 60 | 2 (3 %) | 403 | 41 % | 0.24 | -1077.63 |
| Signals | signal:s2-bb-bounce | 60 | 16 (27 %) | 319 | 49 % | 0.42 | -586.83 |
| Signals | signal:s2-block-scale | 60 | 8 (13 %) | 622 | 59 % | 0.50 | -757.14 |
| Signals | signal:s2-block-stack | 58 | 6 (10 %) | 300 | 50 % | 0.41 | -591.02 |
| Signals | signal:s2-confluence | 60 | 16 (27 %) | 711 | 62 % | 0.66 | -497.04 |
| Signals | signal:s2-ema-cross | 30 | 24 (80 %) | 33 | 82 % | 8.42 | 105.26 |
| Signals | signal:s2-range-break | 47 | 34 (72 %) | 73 | 74 % | 1.67 | 67.93 |
| Signals | signal:s2-range-shift | 52 | 5 (10 %) | 191 | 35 % | 0.21 | -587.07 |
| Signals | signal:s2-rsi-revert | 57 | 21 (37 %) | 146 | 51 % | 0.42 | -257.18 |
| Signals | signal:s2-st-trail | 44 | 27 (61 %) | 49 | 55 % | 0.39 | -64.36 |
| Signals | signal:s2-stoch-swing | 60 | 41 (68 %) | 607 | 75 % | 1.53 | 442.77 |
| Signals | signal:s2-vol-break | 54 | 29 (54 %) | 131 | 72 % | 0.83 | -49.04 |
| Signals | signal:sar | 59 | 2 (3 %) | 554 | 52 % | 0.41 | -915.77 |
| Signals | signal:squeeze | 52 | 18 (35 %) | 53 | 34 % | 0.05 | -295.83 |
| Signals | signal:st-slow | 47 | 15 (32 %) | 73 | 47 % | 0.30 | -152.14 |
| Signals | signal:stoch-rsi | 60 | 7 (12 %) | 762 | 58 % | 0.45 | -953.15 |
| Signals | signal:supertrend | 50 | 26 (52 %) | 221 | 61 % | 0.69 | -142.74 |
| Signals | signal:swing | 59 | 1 (2 %) | 522 | 50 % | 0.30 | -1054.77 |
| Signals | signal:thrust | 59 | 1 (2 %) | 560 | 51 % | 0.36 | -1044.01 |
| Signals | signal:trix | 55 | 12 (22 %) | 150 | 49 % | 0.26 | -345.89 |
| Signals | signal:volume-break | 55 | 50 (91 %) | 56 | 89 % | 10.21 | 159.48 |
| Signals | signal:vwap | 60 | 16 (27 %) | 436 | 63 % | 0.66 | -310.98 |
| Signals | signal:williams-r | 60 | 12 (20 %) | 548 | 56 % | 0.65 | -494.70 |
| Signals | signal:zscore | 60 | 1 (2 %) | 335 | 48 % | 0.38 | -786.99 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1095 | 277 (25 %) | 8205 | 60 % | 0.52 | -9962.55 |
| Signals | 1.25 | 676 | 170 (25 %) | 5328 | 62 % | 0.53 | -6184.76 |
| Signals | 1.35 | 495 | 126 (25 %) | 4017 | 63 % | 0.53 | -4471.29 |
| Signals | 1.5 | 336 | 94 (28 %) | 2792 | 65 % | 0.55 | -2869.81 |
| Signals | 1.75 | 160 | 43 (27 %) | 1357 | 66 % | 0.52 | -1496.43 |
| Signals | 2 | 94 | 27 (29 %) | 874 | 67 % | 0.58 | -735.32 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 279 | 83 % | 3.07 | 428.77 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-obv-m@m15 | 30 | 27 (90 %) | 215 | 82 % | 2.81 | 305.08 | tp5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 28 (93 %) | 280 | 77 % | 2.00 | 279.03 | tp5 sl15 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 111 | 87 % | 7.69 | 230.31 | tp8 sl16 tr2 h96 (5 · ∞ (no loss) · 10.77) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 27 (90 %) | 82 | 88 % | 5.84 | 135.19 | tp3 sl6 tr0.75 h96 (5 · ∞ (no loss) · 5.46) |
| Signals | follow | sig-mfi-m@m15 | 30 | 29 (97 %) | 73 | 90 % | 8.58 | 127.79 | tp3 sl6 tr0.75 h96 (5 · 191.10 · 3.83) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 27 (90 %) | 31 | 87 % | 285.70 | 119.02 | – |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 24 (80 %) | 33 | 82 % | 8.42 | 105.26 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 18 | 18 (100 %) | 30 | 87 % | 66.52 | 87.30 | – |
| Signals | follow | sig-r-vol-regime-s@m15 | 24 | 21 (88 %) | 46 | 67 % | 5.01 | 78.86 | tp3 sl6 tr0.75 h96 (6 · 3.33 · 2.37) |
| Signals | follow | sig-s2-vol-break-m@m15 | 25 | 23 (92 %) | 37 | 86 % | 4.39 | 57.92 | tp3 sl6 tr0.75 h96 (5 · 30.47 · 3.04) |
| Signals | follow | sig-act-burst-m@m15 | 29 | 21 (72 %) | 91 | 73 % | 1.34 | 42.77 | – |
| Signals | follow | sig-r-connors-s@m15 | 17 | 17 (100 %) | 21 | 95 % | 2299.40 | 42.47 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 17 (57 %) | 389 | 70 % | 1.07 | 42.22 | tp5 sl7.5 tr0 h96 (7 · 3.74 · 21.10) |
| Signals | follow | sig-rsi-momentum-s@m15 | 25 | 23 (92 %) | 25 | 92 % | 3.39 | 40.46 | – |
| Signals | follow | sig-volume-break-s@m15 | 25 | 23 (92 %) | 25 | 92 % | 3.39 | 40.46 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 20 | 20 (100 %) | 22 | 91 % | 107.35 | 21.76 | – |
| Signals | follow | sig-ichimoku-m@m15 | 19 | 16 (84 %) | 35 | 71 % | 2.15 | 16.01 | – |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 13 (43 %) | 328 | 67 % | 1.02 | 14.00 | tp8 sl16 tr2 h96 (7 · ∞ (no loss) · 22.68) |
| Signals | follow | sig-vwap-m@m15 | 30 | 13 (43 %) | 134 | 70 % | 1.06 | 12.32 | tp4 sl8 tr1 h96 (7 · 52.81 · 6.76) |
| Signals | follow | sig-supertrend-m@m15 | 20 | 17 (85 %) | 23 | 87 % | 1.59 | 8.11 | – |
| Signals | follow | sig-atr-break-s@m15 | 30 | 14 (47 %) | 282 | 62 % | 1.01 | 7.31 | tp5 sl10 tr3 h96 (7 · 2.43 · 14.63) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 14 (47 %) | 331 | 69 % | 1.01 | 3.77 | tp8 sl16 tr3.2 h96 (6 · 487.74 · 15.36) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 30 | 16 (53 %) | 44 | 66 % | 0.86 | -13.86 | – |
| Signals | follow | sig-ema-cross-m@m15 | 20 | 11 (55 %) | 29 | 69 % | 0.66 | -15.50 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 29 | 16 (55 %) | 43 | 65 % | 0.81 | -19.37 | – |
| Signals | follow | sig-trix-s@m15 | 25 | 12 (48 %) | 88 | 59 % | 0.73 | -30.35 | tp3 sl6 tr0.75 h96 (8 · 8.22 · 4.76) |
| Signals | follow | sig-r-vol-regime-m@m15 | 9 | 1 (11 %) | 13 | 23 % | 0.18 | -32.04 | – |
| Signals | follow | sig-atr-break-m@m15 | 29 | 20 (69 %) | 72 | 57 % | 0.74 | -32.47 | tp3 sl6 tr0.75 h96 (5 · 2.40 · 1.63) |
| Signals | follow | sig-keltner-s@m15 | 27 | 11 (41 %) | 93 | 47 % | 0.80 | -36.62 | tp4 sl8 tr1 h96 (5 · 1.68 · 0.22) |
| Signals | follow | sig-adx-m@m15 | 30 | 11 (37 %) | 121 | 69 % | 0.83 | -37.63 | tp8 sl16 tr2 h96 (5 · 18.48 · 4.71) |
| Signals | follow | sig-keltner-m@m15 | 23 | 6 (26 %) | 40 | 55 % | 0.70 | -38.44 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 12 (40 %) | 274 | 68 % | 0.92 | -38.47 | tp8 sl16 tr3.2 h96 (5 · ∞ (no loss) · 18.76) |
| Signals | follow | sig-squeeze-m@m15 | 22 | 14 (64 %) | 22 | 64 % | 0.20 | -58.40 | – |
| Signals | follow | sig-st-slow-s@m15 | 24 | 7 (29 %) | 35 | 40 % | 0.34 | -69.26 | – |
| Signals | follow | sig-donchian-m@m15 | 14 | 2 (14 %) | 42 | 38 % | 0.33 | -72.57 | tp3 sl6 tr0.75 h96 (8 · 0.04 · -6.87) |
| Signals | follow | sig-st-slow-m@m15 | 23 | 8 (35 %) | 38 | 53 % | 0.26 | -82.88 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 24 | 7 (29 %) | 27 | 26 % | 0.18 | -86.12 | – |
| Signals | follow | sig-ema-slope-m@m15 | 28 | 5 (18 %) | 81 | 63 % | 0.59 | -91.89 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-rsi-reversal-m@m15 | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -93.05 | – |
| Signals | follow | sig-donchian-s@m15 | 30 | 9 (30 %) | 145 | 63 % | 0.69 | -99.25 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 11 (37 %) | 142 | 56 % | 0.72 | -102.14 | tp5 sl10 tr1.25 h96 (5 · 0.98 · -0.22) |
| Signals | follow | sig-rsi-reversal-s@m15 | 26 | 12 (46 %) | 31 | 45 % | 0.15 | -105.20 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 29 | 6 (21 %) | 94 | 66 % | 0.60 | -106.96 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 9 (30 %) | 162 | 65 % | 0.66 | -107.92 | tp8 sl16 tr2 h96 (5 · ∞ (no loss) · 3.35) |
| Signals | follow | sig-r-fractal-m@m15 | 19 | 4 (21 %) | 20 | 25 % | 0.01 | -109.29 | – |
| Signals | follow | sig-act-hf-s@m15 | 30 | 9 (30 %) | 311 | 64 % | 0.81 | -111.00 | tp8 sl16 tr2 h96 (7 · 448.37 · 13.48) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 9 (30 %) | 322 | 68 % | 0.80 | -122.09 | tp2.5 sl7.5 tr0 h96 (14 · 1.79 · 12.20) |
| Signals | follow | sig-r-inside-s@m15 | 16 | 0 (0 %) | 24 | 8 % | 0.00 | -142.29 | – |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 9 (30 %) | 385 | 65 % | 0.79 | -144.62 | tp3 sl9 tr0 h96 (10 · 2.74 · 16.00) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 9 (30 %) | 198 | 58 % | 0.66 | -150.85 | tp8 sl16 tr2 h96 (6 · 259.97 · 11.33) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 7 (23 %) | 221 | 66 % | 0.66 | -180.69 | tp8 sl16 tr2 h96 (6 · ∞ (no loss) · 6.94) |
| Signals | follow | sig-s2-range-shift-s@m15 | 22 | 5 (23 %) | 96 | 33 % | 0.18 | -196.57 | tp4 sl8 tr1 h96 (8 · 0.04 · -8.29) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 5 (17 %) | 177 | 59 % | 0.64 | -206.70 | tp5 sl10 tr1.25 h96 (6 · 1.54 · 5.52) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 6 (20 %) | 216 | 58 % | 0.63 | -213.65 | tp3 sl6 tr0 h96 (8 · 1.35 · 4.40) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 9 (30 %) | 146 | 56 % | 0.50 | -218.61 | tp4 sl8 tr1 h96 (7 · 6.63 · 7.45) |
| Signals | follow | sig-hma-m@m15 | 30 | 5 (17 %) | 206 | 54 % | 0.55 | -219.54 | tp8 sl16 tr2 h96 (5 · 17.20 · 7.65) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 7 (23 %) | 211 | 53 % | 0.56 | -235.03 | tp8 sl16 tr2 h96 (5 · 57.32 · 17.39) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 4 (13 %) | 31 | 13 % | 0.00 | -237.43 | – |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 27 | 5 (19 %) | 102 | 45 % | 0.29 | -243.33 | tp3 sl6 tr0.75 h96 (8 · 0.18 · -10.59) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 4 (13 %) | 120 | 53 % | 0.35 | -257.94 | tp2.5 sl5 tr0 h96 (5 · 0.66 · -3.50) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 5 (17 %) | 337 | 59 % | 0.70 | -259.67 | tp8 sl16 tr2 h96 (11 · 2.44 · 23.46) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 2 (7 %) | 408 | 65 % | 0.70 | -260.39 | tp8 sl16 tr2 h96 (12 · 148.87 · 18.45) |
| Signals | follow | sig-r-fractal-s@m15 | 25 | 2 (8 %) | 77 | 21 % | 0.05 | -298.78 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 79 | 42 % | 0.21 | -300.78 | tp3 sl6 tr1.2 h96 (5 · 0.16 · -15.67) |
| Signals | follow | sig-kama-m@m15 | 30 | 3 (10 %) | 346 | 60 % | 0.62 | -303.95 | tp6 sl12 tr3.6 h96 (5 · 1.17 · 2.06) |
| Signals | follow | sig-s2-active-hf-s@m15 | 29 | 2 (7 %) | 304 | 56 % | 0.56 | -311.82 | tp8 sl16 tr2 h96 (5 · 67.16 · 8.79) |
| Signals | follow | sig-s2-active-hf-m@m15 | 29 | 2 (7 %) | 303 | 56 % | 0.56 | -312.04 | tp8 sl16 tr2 h96 (5 · 67.16 · 8.79) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 4 (13 %) | 225 | 60 % | 0.46 | -313.77 | tp8 sl16 tr2 h96 (7 · 78.94 · 7.03) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 62 | 34 % | 0.11 | -315.54 | – |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 4 (13 %) | 338 | 63 % | 0.54 | -317.98 | tp5 sl10 tr1.25 h96 (22 · 1.11 · 2.41) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 1 (3 %) | 205 | 56 % | 0.43 | -322.03 | tp3 sl6 tr0 h96 (10 · 1.05 · 1.00) |
| Signals | follow | sig-vwap-s@m15 | 30 | 3 (10 %) | 302 | 60 % | 0.54 | -323.30 | tp8 sl16 tr2 h96 (9 · 103.46 · 12.78) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 0 (0 %) | 174 | 49 % | 0.39 | -326.60 | tp2.5 sl7.5 tr0 h96 (7 · 0.75 · -3.90) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 3 (10 %) | 260 | 55 % | 0.51 | -339.59 | tp3 sl6 tr1.2 h96 (17 · 1.34 · 4.79) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 3 (10 %) | 260 | 55 % | 0.51 | -339.59 | tp3 sl6 tr1.2 h96 (17 · 1.34 · 4.79) |
| Signals | follow | sig-adx-s@m15 | 30 | 5 (17 %) | 215 | 56 % | 0.49 | -340.29 | tp8 sl16 tr2 h96 (6 · ∞ (no loss) · 19.62) |
| Signals | follow | sig-cci-m@m15 | 30 | 0 (0 %) | 194 | 52 % | 0.48 | -342.64 | tp8 sl16 tr2 h96 (6 · 0.81 · -3.06) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 0 (0 %) | 293 | 57 % | 0.53 | -360.93 | tp3 sl6 tr1.2 h96 (22 · 0.89 · -2.89) |
| Signals | follow | sig-r-nr-break-m@m15 | 27 | 1 (4 %) | 150 | 43 % | 0.27 | -363.53 | tp2.5 sl3.75 tr0 h96 (9 · 0.73 · -4.30) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 3 (10 %) | 283 | 58 % | 0.48 | -367.90 | tp2.5 sl7.5 tr0 h96 (13 · 1.00 · -0.10) |
| Signals | follow | sig-s2-block-stack-m@m15 | 28 | 0 (0 %) | 84 | 30 % | 0.11 | -377.37 | tp2.5 sl3.75 tr0 h96 (6 · 0.58 · -4.95) |
| Signals | follow | sig-thrust-m@m15 | 29 | 0 (0 %) | 316 | 59 % | 0.45 | -389.21 | tp2.5 sl7.5 tr0 h96 (13 · 1.00 · -0.10) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 5 (17 %) | 339 | 60 % | 0.51 | -389.24 | tp4 sl6 tr0 h96 (8 · 1.84 · 10.40) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 0 (0 %) | 95 | 37 % | 0.22 | -390.50 | tp3 sl6 tr1.2 h96 (5 · 0.45 · -6.89) |
| Signals | follow | sig-r-connors-m@m15 | 28 | 3 (11 %) | 169 | 54 % | 0.32 | -405.30 | tp3 sl4.5 tr0 h96 (6 · 0.60 · -5.70) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 2 (7 %) | 218 | 49 % | 0.35 | -419.53 | tp5 sl10 tr2 h96 (5 · 0.97 · -0.26) |
| Signals | follow | sig-sar-m@m15 | 29 | 1 (3 %) | 283 | 52 % | 0.44 | -425.18 | tp5 sl10 tr3 h96 (5 · 1.12 · 1.26) |
| Signals | follow | sig-r-awesome-s@m15 | 28 | 4 (14 %) | 105 | 30 % | 0.08 | -431.22 | tp4 sl8 tr1 h96 (6 · 0.07 · -15.22) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 4 (13 %) | 247 | 56 % | 0.43 | -434.37 | tp8 sl16 tr2 h96 (6 · 65.92 · 5.86) |
| Signals | follow | sig-swing-s@m15 | 29 | 1 (3 %) | 218 | 52 % | 0.28 | -440.63 | tp2.5 sl3.75 tr0 h96 (12 · 0.82 · -3.65) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 2 (7 %) | 205 | 51 % | 0.26 | -443.98 | tp8 sl16 tr2 h96 (7 · 21.63 · 4.13) |
| Signals | follow | sig-impulse-s@m15 | 30 | 1 (3 %) | 285 | 51 % | 0.36 | -467.57 | tp6 sl12 tr2.4 h96 (6 · 0.58 · -5.72) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 3 (10 %) | 332 | 57 % | 0.44 | -467.64 | tp8 sl16 tr3.2 h96 (5 · 8.55 · 5.09) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 3 (10 %) | 263 | 56 % | 0.33 | -483.58 | tp6 sl12 tr2.4 h96 (5 · 0.58 · -5.17) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 5 (17 %) | 177 | 43 % | 0.26 | -484.70 | tp6 sl12 tr1.5 h96 (6 · 0.40 · -7.40) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 1 (3 %) | 256 | 50 % | 0.45 | -486.21 | tp8 sl16 tr2 h96 (6 · 1.03 · 0.42) |
| Signals | follow | sig-zscore-s@m15 | 30 | 1 (3 %) | 256 | 50 % | 0.45 | -486.21 | tp8 sl16 tr2 h96 (6 · 1.03 · 0.42) |
| Signals | follow | sig-sar-s@m15 | 30 | 1 (3 %) | 271 | 52 % | 0.38 | -490.59 | tp3 sl6 tr0.75 h96 (26 · 0.57 · -11.81) |
| Signals | follow | sig-cmf-s@m15 | 27 | 0 (0 %) | 212 | 49 % | 0.28 | -494.79 | tp3 sl9 tr0 h96 (5 · 0.46 · -10.00) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 2 (7 %) | 380 | 56 % | 0.47 | -500.81 | tp8 sl16 tr2 h96 (11 · 1.20 · 3.29) |
| Signals | follow | sig-hma-s@m15 | 29 | 0 (0 %) | 228 | 49 % | 0.31 | -505.11 | tp6 sl12 tr1.5 h96 (7 · 0.71 · -3.54) |
| Signals | follow | sig-rsi-mid-m@m15 | 28 | 1 (4 %) | 180 | 32 % | 0.18 | -517.81 | tp5 sl10 tr1.25 h96 (8 · 0.37 · -6.71) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 2 (7 %) | 205 | 46 % | 0.28 | -524.13 | tp8 sl16 tr2 h96 (5 · 0.68 · -5.20) |
| Signals | follow | sig-cmf-m@m15 | 30 | 2 (7 %) | 197 | 45 % | 0.22 | -531.13 | tp4 sl8 tr1 h96 (12 · 1.07 · 0.67) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 0 (0 %) | 157 | 31 % | 0.18 | -534.34 | tp6 sl12 tr1.5 h96 (6 · 0.48 · -6.58) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 2 (7 %) | 246 | 47 % | 0.29 | -543.29 | tp3 sl6 tr0 h96 (10 · 0.68 · -8.00) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 3 (10 %) | 248 | 51 % | 0.37 | -561.85 | tp8 sl16 tr2 h96 (6 · 1.12 · 1.90) |
| Signals | follow | sig-act-hf-m@m15 | 29 | 1 (3 %) | 210 | 40 % | 0.20 | -566.21 | tp4 sl8 tr1 h96 (17 · 0.35 · -11.18) |
| Signals | follow | sig-heikin-ashi-m@m15 | 29 | 0 (0 %) | 260 | 48 % | 0.30 | -573.60 | tp3 sl4.5 tr0 h96 (13 · 0.95 · -1.10) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 1 (3 %) | 240 | 50 % | 0.32 | -576.68 | tp4 sl8 tr2.4 h96 (8 · 0.53 · -11.63) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 1 (3 %) | 384 | 58 % | 0.44 | -597.22 | tp5 sl7.5 tr0 h96 (8 · 1.04 · 0.90) |
| Signals | follow | sig-impulse-m@m15 | 30 | 1 (3 %) | 119 | 18 % | 0.05 | -601.87 | tp3 sl6 tr1.8 h96 (6 · 0.45 · -6.97) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 304 | 48 % | 0.31 | -614.14 | tp4 sl8 tr2.4 h96 (9 · 0.68 · -5.33) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 1 (3 %) | 309 | 55 % | 0.33 | -619.28 | tp3 sl6 tr0 h96 (10 · 0.68 · -8.00) |
| Signals | follow | sig-r-nr-break-s@m15 | 28 | 0 (0 %) | 169 | 37 % | 0.17 | -632.18 | tp2.5 sl3.75 tr0 h96 (10 · 0.58 · -8.25) |
| Signals | follow | sig-kama-s@m15 | 29 | 1 (3 %) | 328 | 54 % | 0.30 | -634.14 | tp8 sl16 tr2 h96 (6 · ∞ (no loss) · 6.64) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 3 (10 %) | 424 | 54 % | 0.39 | -635.17 | tp8 sl16 tr2 h96 (14 · 0.69 · -7.24) |
| Signals | follow | sig-thrust-s@m15 | 30 | 1 (3 %) | 244 | 42 % | 0.29 | -654.80 | tp4 sl8 tr1.6 h96 (10 · 0.48 · -12.91) |
| Signals | follow | sig-cci-s@m15 | 30 | 0 (0 %) | 347 | 56 % | 0.36 | -672.58 | tp8 sl16 tr3.2 h96 (6 · 0.43 · -9.19) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 3.00× | tr off | 75 | 44 (59 %) | 121 | 73 % | 0.85 | -90.20 |
| Signals | tp 8.000% | sl 2.00× | tr 0.25× | 116 | 62 (53 %) | 550 | 74 % | 0.81 | -199.50 |
| Signals | tp 8.000% | sl 2.00× | tr 0.40× | 109 | 53 (49 %) | 309 | 78 % | 0.65 | -356.73 |
| Signals | tp 8.000% | sl 2.00× | tr 0.60× | 90 | 38 (42 %) | 173 | 65 % | 0.62 | -360.80 |
| Signals | tp 6.000% | sl 2.00× | tr 0.60× | 103 | 33 (32 %) | 319 | 65 % | 0.48 | -693.23 |
| Signals | tp 5.000% | sl 3.00× | tr off | 100 | 33 (33 %) | 257 | 62 % | 0.51 | -726.40 |
| Signals | tp 6.000% | sl 2.00× | tr 0.40× | 115 | 42 (37 %) | 492 | 68 % | 0.50 | -776.72 |
| Signals | tp 5.000% | sl 2.00× | tr 0.60× | 116 | 38 (33 %) | 480 | 63 % | 0.51 | -822.36 |
| Signals | tp 6.000% | sl 2.00× | tr off | 91 | 16 (18 %) | 220 | 46 % | 0.40 | -866.00 |
| Signals | tp 6.000% | sl 2.00× | tr 0.25× | 116 | 40 (34 %) | 815 | 67 % | 0.48 | -885.01 |
| Signals | tp 4.000% | sl 1.50× | tr off | 113 | 26 (23 %) | 669 | 48 % | 0.56 | -957.80 |
| Signals | tp 3.000% | sl 2.00× | tr off | 120 | 29 (24 %) | 822 | 56 % | 0.57 | -974.40 |
| Signals | tp 5.000% | sl 2.00× | tr 0.25× | 116 | 31 (27 %) | 1088 | 57 % | 0.46 | -1016.14 |
| Signals | tp 2.500% | sl 3.00× | tr off | 120 | 29 (24 %) | 841 | 65 % | 0.55 | -1035.70 |
| Signals | tp 4.000% | sl 2.00× | tr 0.25× | 119 | 33 (28 %) | 1443 | 59 % | 0.49 | -1044.00 |
| Signals | tp 3.000% | sl 2.00× | tr 0.60× | 120 | 25 (21 %) | 1119 | 57 % | 0.53 | -1065.76 |
| Signals | tp 3.000% | sl 2.00× | tr 0.40× | 120 | 27 (23 %) | 1430 | 53 % | 0.50 | -1070.14 |
| Signals | tp 6.000% | sl 1.50× | tr off | 102 | 18 (18 %) | 304 | 38 % | 0.38 | -1071.80 |
| Signals | tp 5.000% | sl 1.50× | tr off | 110 | 20 (18 %) | 454 | 42 % | 0.46 | -1095.80 |
| Signals | tp 5.000% | sl 2.00× | tr off | 105 | 22 (21 %) | 354 | 47 % | 0.42 | -1120.80 |
| Signals | tp 2.500% | sl 2.00× | tr off | 121 | 23 (19 %) | 1104 | 55 % | 0.55 | -1158.30 |
| Signals | tp 3.000% | sl 2.00× | tr 0.25× | 120 | 32 (27 %) | 2001 | 54 % | 0.45 | -1163.90 |
| Signals | tp 2.500% | sl 1.50× | tr off | 121 | 14 (12 %) | 1266 | 48 % | 0.54 | -1175.70 |
| Signals | tp 3.000% | sl 3.00× | tr off | 118 | 28 (24 %) | 627 | 61 % | 0.47 | -1184.40 |
| Signals | tp 4.000% | sl 3.00× | tr off | 107 | 20 (19 %) | 417 | 58 % | 0.43 | -1215.40 |
| Signals | tp 4.000% | sl 2.00× | tr off | 110 | 18 (16 %) | 540 | 49 % | 0.45 | -1236.00 |
| Signals | tp 5.000% | sl 2.00× | tr 0.40× | 117 | 32 (27 %) | 713 | 59 % | 0.39 | -1245.57 |
| Signals | tp 4.000% | sl 2.00× | tr 0.60× | 117 | 25 (21 %) | 725 | 57 % | 0.42 | -1264.67 |
| Signals | tp 4.000% | sl 2.00× | tr 0.40× | 117 | 26 (22 %) | 984 | 58 % | 0.41 | -1329.73 |
| Signals | tp 3.000% | sl 1.50× | tr off | 121 | 15 (12 %) | 1050 | 46 % | 0.50 | -1350.00 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 77 (77) | 60652 | 31610 | 31610 | 0 | baseTarget 29042 |
| Micro | trailing | 77 (77) | 121304 | 63220 | 63220 | 0 | baseTarget 58084 |
| Short | normal | 243 (214) | 33876 | 13356 | 13356 | 0 | baseTarget 9324 · baseRange 11196 |
| Short | trailing | 243 (214) | 67752 | 26712 | 26712 | 0 | baseTarget 18648 · baseRange 22392 |
| General | normal | 243 (197) | 22584 | 8388 | 8388 | 0 | baseTarget 3876 · baseRange 10320 |
| General | trailing | 243 (197) | 15056 | 5592 | 5592 | 0 | baseTarget 2584 · baseRange 6880 |
| Long | normal | 243 (206) | 28230 | 11388 | 11388 | 0 | baseRange 12180 · baseTarget 4662 |
| Long | trailing | 243 (206) | 18820 | 7592 | 7592 | 0 | baseRange 8120 · baseTarget 3108 |
| Wide | axis | 320 (320) | 53910 | 53910 | 53910 | 0 | – |
| Wide | dca | 320 (320) | 4792 | 4792 | 4792 | 0 | – |
| Wide | dca-active | 320 (320) | 4792 | 4792 | 4792 | 0 | – |

Engine indications Base evaluated that built no set: 71 (act-burst, bb-bounce, bb-walk, break-atr, break-atr-0.9, break-atr-1.5, break-atr-2, cci-20-100, cci-20-200, dir-reclaim-50, ema-pullback-50, ema-slope-10, ema-slope-20, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-brk-10, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-ivwapd-2, mc-lag-3, mc-mrsi2-10, mc-qrsi2-5, mc-rsi4-5, mc-rsi9-15, mc-rsimid-14, mc-rsit14-30, mc-rsit3-20, mc-rsit3-30, mc-rsit4-20, mc-rsit4-25, mc-rsit4-30, mc-rsit5-20, mc-rsit5-25, mc-rsit5-30, mc-rsit7-15, mc-rsit7-20, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.24 (258) | 0.20 (324) | 0.23 (228) | 0.21 (348) | 0.33 (594) |
| 1.14× | – | 0.10 (144) | – | – | – | – | – |
| 1.25× | – | 0.10 (144) | 0.21 (258) | 0.21 (288) | 0.22 (228) | 0.42 (338) | 0.40 (594) |
| 1.33× | 0.04 (120) | – | – | – | – | – | – |
| 1.5× | 0.04 (120) | 0.09 (144) | 0.23 (240) | 0.22 (288) | 0.34 (222) | 0.40 (338) | 0.38 (594) |
| 1.75× | 0.03 (120) | 0.09 (144) | 0.39 (240) | 0.36 (288) | 0.30 (222) | 0.38 (338) | 0.39 (582) |
| 2× | 0.04 (120) | 0.20 (144) | 0.35 (240) | 0.32 (288) | 0.27 (222) | 0.37 (326) | 0.38 (576) |
| 2.25× | 0.04 (120) | 0.18 (144) | 0.32 (240) | 0.29 (288) | 0.26 (216) | 0.34 (326) | 0.34 (576) |
| 2.5× | 0.09 (120) | 0.16 (144) | 0.29 (240) | 0.28 (282) | 0.24 (216) | 0.31 (326) | 0.36 (568) |
| 2.75× | 0.08 (120) | 0.15 (144) | 0.29 (234) | 0.26 (282) | 0.22 (216) | 0.29 (324) | 0.41 (568) |
| 3× | 0.07 (120) | 0.16 (138) | 0.27 (234) | 0.24 (282) | 0.21 (216) | 0.32 (324) | 0.39 (562) |
| 3.25× | 0.07 (120) | 0.15 (138) | 0.25 (234) | 0.23 (282) | 0.24 (216) | 0.31 (318) | 0.42 (562) |
| 3.5× | 0.07 (114) | 0.14 (138) | 0.24 (234) | 0.21 (282) | 0.24 (210) | 0.33 (318) | 0.44 (562) |
| 3.75× | 0.07 (114) | 0.13 (138) | 0.22 (234) | 0.20 (282) | 0.26 (210) | 0.31 (318) | 0.41 (562) |
| 4× | 0.06 (114) | 0.12 (138) | 0.21 (234) | 0.20 (276) | 0.25 (210) | 0.33 (318) | 0.44 (556) |
| 4.25× | 0.06 (114) | 0.12 (138) | 0.20 (234) | 0.25 (276) | 0.31 (210) | 0.31 (318) | 0.42 (556) |
| 4.5× | 0.06 (114) | 0.13 (138) | 0.19 (234) | 0.24 (276) | 0.29 (210) | 0.29 (318) | 0.46 (556) |
| 4.75× | 0.06 (114) | 0.13 (138) | 0.23 (234) | 0.29 (276) | 0.28 (210) | 0.28 (318) | 0.44 (556) |
| 5× | 0.05 (114) | 0.12 (138) | 0.22 (234) | 0.28 (276) | 0.27 (210) | 0.33 (318) | 0.47 (544) |

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
| 1× | 0.57 (3560) | 0.49 (4742) | 0.59 (5238) | 0.61 (4962) | 0.61 (5522) | 0.58 (6520) |
| 1.5× | 0.69 (3278) | 0.59 (4236) | 0.66 (4636) | 0.72 (4204) | 0.66 (4674) | 0.78 (5349) |
| 2× | 0.77 (3018) | 0.67 (3702) | 0.79 (4158) | 0.89 (3822) | 0.83 (4314) | 0.84 (4968) |

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
| 0.5× | 0.77 (1576) | 0.61 (1130) | 0.67 (1282) | 0.82 (1196) |
| 0.75× | 0.77 (1384) | 0.73 (926) | 0.71 (1058) | 0.89 (954) |
| 1× | 0.72 (3806) | 0.69 (2432) | 0.67 (2690) | 0.96 (2460) |

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
| 0.5× | 0.89 (1200) | 0.87 (1160) | 0.84 (1177) | 0.85 (888) | 0.97 (1105) |
| 0.75× | 0.97 (915) | 0.91 (894) | 1.01 (888) | 1.00 (672) | 1.10 (841) |
| 1× | 0.89 (2410) | 0.84 (2370) | 0.83 (2315) | 0.83 (1725) | 0.77 (2286) |

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
| 0.84× | 0.61 (17287) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.44 (613) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.67 (8821) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.47 (583) | 0.55 (342) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.42 (568) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.62 (319) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.65 (314) | – | – | – | – |
| 1× | – | – | – | 0.67 (88270) | – | – | – | 0.74 (27542) | 0.52 (3152) | – | 0.68 (1125) | – | 0.68 (2796) | 0.72 (2477) | 0.89 (937) | 1.40 (824) |

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
