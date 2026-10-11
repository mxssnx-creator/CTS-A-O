# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1324/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 328/19072 · PF 1.60 · Micro 257/5900 · PF 2.43 · Short 630/8176 · PF 1.51 · General 511/8176 · PF 1.52 · Long 535/8176 · PF 1.55 · Signals 126/126 · PF 1.11; Main 1198 pairs, 235762 tapes, Real seats: 0 engine configs + 4410 signal configs (every config of the active signals), compute 196 s. Causal: Base / Main / Real ranked on the history before the run.

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
| closes ≥ 6 | 1.00 | 6 | 1 | 603 | 1567 (+418) | 6.3 % | 1.830 |
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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1198 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (235762 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3514); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 23458 · 0.79 | 6097 · 0.80 | 7804 · 1.12 | 1212 · 0.58 | – | – | – | – | – |
| 13:00 | 39593 · 0.45 | 7111 · 0.69 | 12702 · 0.73 | 652 · 5.22 | – | – | – | – | – |
| 14:00 | 28750 · 2.00 | 7548 · 2.05 | 9789 · 2.25 | 1781 · 11.68 | – | – | – | – | – |
| 15:00 | 32249 · 1.18 | 7682 · 0.96 | 11185 · 1.13 | 2971 · 0.45 | – | – | – | – | – |
| 16:00 | 23747 · 1.21 | 4654 · 1.06 | 8402 · 1.58 | 624 · 1.83 | – | – | – | – | – |
| 17:00 | 17687 · 1.53 | 3948 · 1.12 | 6059 · 1.31 | 1028 · 1.41 | – | – | – | – | – |
| 18:00 | 17052 · 1.82 | 2844 · 2.60 | 4069 · 2.44 | 337 · 0.95 | – | – | – | – | – |
| 19:00 | 19187 · 1.05 | 5135 · 1.48 | 5768 · 1.27 | 903 · 1.84 | – | – | – | – | – |
| 20:00 | 30262 · 0.74 | 8324 · 1.13 | 6123 · 0.80 | 718 · 0.32 | – | – | – | – | – |
| 21:00 | 42091 · 0.63 | 12131 · 0.81 | 12934 · 0.66 | 2373 · 1.09 | – | – | – | – | – |
| 22:00 | 44617 · 0.40 | 11928 · 0.39 | 17131 · 0.43 | 2411 · 0.10 | – | – | – | – | – |
| 23:00 | 30109 · 0.41 | 6013 · 0.49 | 7451 · 0.32 | 1172 · 0.14 | – | – | – | – | – |
| **total** | **348802 · 0.79** | **83415 · 0.86** | **109417 · 0.81** | **16182 · 0.56** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 41630 | sig:confirm 41630 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 231352 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2263 units active at the run start, 3016 over the run, 3514 of 4410 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1637 | 386 (24 %) | 9259 | 54 % | 0.53 | -14323.80 |
| Signals | trailing | 1877 | 789 (42 %) | 6923 | 66 % | 0.60 | -10271.67 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 64 | 50 (78 %) | 344 | 83 % | 2.16 | 537.93 |
| Signals | signal:act-hf | 61 | 22 (36 %) | 409 | 57 % | 0.57 | -570.56 |
| Signals | signal:adx | 64 | 19 (30 %) | 221 | 52 % | 0.40 | -552.50 |
| Signals | signal:atr-break | 62 | 36 (58 %) | 307 | 74 % | 1.20 | 134.76 |
| Signals | signal:bollinger | 70 | 4 (6 %) | 388 | 56 % | 0.54 | -736.38 |
| Signals | signal:cci | 67 | 3 (4 %) | 434 | 54 % | 0.46 | -976.40 |
| Signals | signal:cmf | 58 | 3 (5 %) | 256 | 42 % | 0.24 | -974.47 |
| Signals | signal:donchian | 45 | 14 (31 %) | 153 | 59 % | 0.57 | -221.32 |
| Signals | signal:ema-cross | 49 | 41 (84 %) | 110 | 88 % | 6.21 | 302.86 |
| Signals | signal:ema-cross-fast | 67 | 51 (76 %) | 263 | 80 % | 1.55 | 239.44 |
| Signals | signal:ema-pullback | 67 | 21 (31 %) | 362 | 64 % | 0.65 | -362.81 |
| Signals | signal:ema-slope | 49 | 8 (16 %) | 150 | 57 % | 0.47 | -281.67 |
| Signals | signal:ema-trend | 67 | 22 (33 %) | 393 | 63 % | 0.65 | -434.94 |
| Signals | signal:heikin-ashi | 58 | 2 (3 %) | 499 | 54 % | 0.41 | -1188.20 |
| Signals | signal:hma | 61 | 16 (26 %) | 353 | 58 % | 0.56 | -518.73 |
| Signals | signal:ichimoku | 48 | 15 (31 %) | 158 | 61 % | 0.59 | -219.20 |
| Signals | signal:impulse | 63 | 2 (3 %) | 278 | 38 % | 0.22 | -1171.01 |
| Signals | signal:kama | 62 | 16 (26 %) | 477 | 61 % | 0.58 | -623.40 |
| Signals | signal:keltner | 49 | 20 (41 %) | 101 | 57 % | 0.71 | -87.79 |
| Signals | signal:macd-cross | 63 | 7 (11 %) | 324 | 56 % | 0.39 | -825.76 |
| Signals | signal:macd-hist | 67 | 27 (40 %) | 439 | 66 % | 0.70 | -401.93 |
| Signals | signal:macd-slow | 63 | 3 (5 %) | 350 | 54 % | 0.37 | -965.84 |
| Signals | signal:mfi | 35 | 34 (97 %) | 59 | 93 % | 10.96 | 164.91 |
| Signals | signal:obv | 70 | 52 (74 %) | 411 | 76 % | 1.52 | 366.23 |
| Signals | signal:r-awesome | 62 | 11 (18 %) | 255 | 46 % | 0.35 | -688.59 |
| Signals | signal:r-connors | 39 | 17 (44 %) | 102 | 61 % | 0.54 | -164.27 |
| Signals | signal:r-fractal | 37 | 0 (0 %) | 64 | 9 % | 0.03 | -418.41 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -117.60 |
| Signals | signal:r-linreg | 70 | 18 (26 %) | 427 | 56 % | 0.53 | -697.25 |
| Signals | signal:r-nr-break | 50 | 4 (8 %) | 223 | 36 % | 0.22 | -932.94 |
| Signals | signal:r-session-trend | 70 | 15 (21 %) | 368 | 51 % | 0.41 | -943.15 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 67 | 88 % | 6.13 | 194.35 |
| Signals | signal:reclaim | 70 | 20 (29 %) | 481 | 63 % | 0.66 | -524.98 |
| Signals | signal:rsi-mid | 57 | 11 (19 %) | 279 | 43 % | 0.27 | -894.25 |
| Signals | signal:rsi-momentum | 22 | 19 (86 %) | 22 | 86 % | 3.13 | 36.67 |
| Signals | signal:rsi-reversal | 30 | 0 (0 %) | 47 | 13 % | 0.03 | -319.34 |
| Signals | signal:s2-active-hf | 60 | 31 (52 %) | 490 | 71 % | 1.04 | 40.88 |
| Signals | signal:s2-adx-gate | 66 | 24 (36 %) | 322 | 66 % | 0.70 | -282.14 |
| Signals | signal:s2-atr-break | 63 | 2 (3 %) | 235 | 34 % | 0.17 | -1088.91 |
| Signals | signal:s2-bb-bounce | 70 | 42 (60 %) | 290 | 59 % | 0.75 | -217.28 |
| Signals | signal:s2-block-scale | 64 | 12 (19 %) | 376 | 59 % | 0.50 | -605.57 |
| Signals | signal:s2-block-stack | 61 | 17 (28 %) | 278 | 63 % | 0.62 | -365.02 |
| Signals | signal:s2-confluence | 67 | 19 (28 %) | 502 | 64 % | 0.72 | -385.74 |
| Signals | signal:s2-ema-cross | 35 | 32 (91 %) | 38 | 92 % | 11.44 | 144.65 |
| Signals | signal:s2-range-break | 47 | 34 (72 %) | 65 | 80 % | 1.11 | 16.43 |
| Signals | signal:s2-range-shift | 54 | 10 (19 %) | 151 | 38 % | 0.23 | -625.07 |
| Signals | signal:s2-rsi-revert | 55 | 27 (49 %) | 108 | 53 % | 0.51 | -183.70 |
| Signals | signal:s2-st-trail | 39 | 25 (64 %) | 42 | 60 % | 0.60 | -47.18 |
| Signals | signal:s2-stoch-swing | 70 | 51 (73 %) | 472 | 77 % | 1.93 | 687.34 |
| Signals | signal:s2-vol-break | 49 | 26 (53 %) | 81 | 64 % | 0.62 | -95.82 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 63 | 8 (13 %) | 428 | 59 % | 0.52 | -710.62 |
| Signals | signal:squeeze | 49 | 6 (12 %) | 49 | 12 % | 0.02 | -455.26 |
| Signals | signal:st-slow | 42 | 14 (33 %) | 60 | 48 % | 0.40 | -135.81 |
| Signals | signal:stoch-rsi | 67 | 17 (25 %) | 481 | 59 % | 0.55 | -663.17 |
| Signals | signal:supertrend | 46 | 28 (61 %) | 181 | 73 % | 0.89 | -48.05 |
| Signals | signal:swing | 65 | 0 (0 %) | 401 | 44 % | 0.24 | -1520.88 |
| Signals | signal:thrust | 62 | 1 (2 %) | 374 | 45 % | 0.26 | -1312.37 |
| Signals | signal:trix | 60 | 11 (18 %) | 116 | 45 % | 0.23 | -474.95 |
| Signals | signal:volume-break | 57 | 54 (95 %) | 57 | 95 % | 12.33 | 195.17 |
| Signals | signal:vwap | 68 | 25 (37 %) | 305 | 64 % | 0.74 | -220.31 |
| Signals | signal:williams-r | 70 | 16 (23 %) | 388 | 59 % | 0.63 | -514.41 |
| Signals | signal:zscore | 70 | 2 (3 %) | 297 | 51 % | 0.39 | -877.26 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 94830 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 94830 | 0 |  |
| Short | 40068 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 40068 | 0 |  |
| General | 13980 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13980 | 0 |  |
| Long | 18980 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18980 | 0 |  |
| Wide | 63494 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 63494 | 0 |  |
| Signals | 4410 | – | 2263 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 4410 signal tapes, 2263 units (pair × symbol × direction) active at the run start, 3016 over the run; 3514 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 2520 | 1629 (65 %) | 17341 | 78 % | 1.40 | 15215.35 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 64 | 50 (78 %) | 344 | 83 % | 2.16 | 537.93 |
| Signals | signal:act-hf | 61 | 22 (36 %) | 409 | 57 % | 0.57 | -570.56 |
| Signals | signal:adx | 64 | 19 (30 %) | 221 | 52 % | 0.40 | -552.50 |
| Signals | signal:atr-break | 62 | 36 (58 %) | 307 | 74 % | 1.20 | 134.76 |
| Signals | signal:bollinger | 70 | 4 (6 %) | 388 | 56 % | 0.54 | -736.38 |
| Signals | signal:cci | 67 | 3 (4 %) | 434 | 54 % | 0.46 | -976.40 |
| Signals | signal:cmf | 58 | 3 (5 %) | 256 | 42 % | 0.24 | -974.47 |
| Signals | signal:donchian | 45 | 14 (31 %) | 153 | 59 % | 0.57 | -221.32 |
| Signals | signal:ema-cross | 49 | 41 (84 %) | 110 | 88 % | 6.21 | 302.86 |
| Signals | signal:ema-cross-fast | 67 | 51 (76 %) | 263 | 80 % | 1.55 | 239.44 |
| Signals | signal:ema-pullback | 67 | 21 (31 %) | 362 | 64 % | 0.65 | -362.81 |
| Signals | signal:ema-slope | 49 | 8 (16 %) | 150 | 57 % | 0.47 | -281.67 |
| Signals | signal:ema-trend | 67 | 22 (33 %) | 393 | 63 % | 0.65 | -434.94 |
| Signals | signal:heikin-ashi | 58 | 2 (3 %) | 499 | 54 % | 0.41 | -1188.20 |
| Signals | signal:hma | 61 | 16 (26 %) | 353 | 58 % | 0.56 | -518.73 |
| Signals | signal:ichimoku | 48 | 15 (31 %) | 158 | 61 % | 0.59 | -219.20 |
| Signals | signal:impulse | 63 | 2 (3 %) | 278 | 38 % | 0.22 | -1171.01 |
| Signals | signal:kama | 62 | 16 (26 %) | 477 | 61 % | 0.58 | -623.40 |
| Signals | signal:keltner | 49 | 20 (41 %) | 101 | 57 % | 0.71 | -87.79 |
| Signals | signal:macd-cross | 63 | 7 (11 %) | 324 | 56 % | 0.39 | -825.76 |
| Signals | signal:macd-hist | 67 | 27 (40 %) | 439 | 66 % | 0.70 | -401.93 |
| Signals | signal:macd-slow | 63 | 3 (5 %) | 350 | 54 % | 0.37 | -965.84 |
| Signals | signal:mfi | 35 | 34 (97 %) | 59 | 93 % | 10.96 | 164.91 |
| Signals | signal:obv | 70 | 52 (74 %) | 411 | 76 % | 1.52 | 366.23 |
| Signals | signal:r-awesome | 62 | 11 (18 %) | 255 | 46 % | 0.35 | -688.59 |
| Signals | signal:r-connors | 39 | 17 (44 %) | 102 | 61 % | 0.54 | -164.27 |
| Signals | signal:r-fractal | 37 | 0 (0 %) | 64 | 9 % | 0.03 | -418.41 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -117.60 |
| Signals | signal:r-linreg | 70 | 18 (26 %) | 427 | 56 % | 0.53 | -697.25 |
| Signals | signal:r-nr-break | 50 | 4 (8 %) | 223 | 36 % | 0.22 | -932.94 |
| Signals | signal:r-session-trend | 70 | 15 (21 %) | 368 | 51 % | 0.41 | -943.15 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 67 | 88 % | 6.13 | 194.35 |
| Signals | signal:reclaim | 70 | 20 (29 %) | 481 | 63 % | 0.66 | -524.98 |
| Signals | signal:rsi-mid | 57 | 11 (19 %) | 279 | 43 % | 0.27 | -894.25 |
| Signals | signal:rsi-momentum | 22 | 19 (86 %) | 22 | 86 % | 3.13 | 36.67 |
| Signals | signal:rsi-reversal | 30 | 0 (0 %) | 47 | 13 % | 0.03 | -319.34 |
| Signals | signal:s2-active-hf | 60 | 31 (52 %) | 490 | 71 % | 1.04 | 40.88 |
| Signals | signal:s2-adx-gate | 66 | 24 (36 %) | 322 | 66 % | 0.70 | -282.14 |
| Signals | signal:s2-atr-break | 63 | 2 (3 %) | 235 | 34 % | 0.17 | -1088.91 |
| Signals | signal:s2-bb-bounce | 70 | 42 (60 %) | 290 | 59 % | 0.75 | -217.28 |
| Signals | signal:s2-block-scale | 64 | 12 (19 %) | 376 | 59 % | 0.50 | -605.57 |
| Signals | signal:s2-block-stack | 61 | 17 (28 %) | 278 | 63 % | 0.62 | -365.02 |
| Signals | signal:s2-confluence | 67 | 19 (28 %) | 502 | 64 % | 0.72 | -385.74 |
| Signals | signal:s2-ema-cross | 35 | 32 (91 %) | 38 | 92 % | 11.44 | 144.65 |
| Signals | signal:s2-range-break | 47 | 34 (72 %) | 65 | 80 % | 1.11 | 16.43 |
| Signals | signal:s2-range-shift | 54 | 10 (19 %) | 151 | 38 % | 0.23 | -625.07 |
| Signals | signal:s2-rsi-revert | 55 | 27 (49 %) | 108 | 53 % | 0.51 | -183.70 |
| Signals | signal:s2-st-trail | 39 | 25 (64 %) | 42 | 60 % | 0.60 | -47.18 |
| Signals | signal:s2-stoch-swing | 70 | 51 (73 %) | 472 | 77 % | 1.93 | 687.34 |
| Signals | signal:s2-vol-break | 49 | 26 (53 %) | 81 | 64 % | 0.62 | -95.82 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 63 | 8 (13 %) | 428 | 59 % | 0.52 | -710.62 |
| Signals | signal:squeeze | 49 | 6 (12 %) | 49 | 12 % | 0.02 | -455.26 |
| Signals | signal:st-slow | 42 | 14 (33 %) | 60 | 48 % | 0.40 | -135.81 |
| Signals | signal:stoch-rsi | 67 | 17 (25 %) | 481 | 59 % | 0.55 | -663.17 |
| Signals | signal:supertrend | 46 | 28 (61 %) | 181 | 73 % | 0.89 | -48.05 |
| Signals | signal:swing | 65 | 0 (0 %) | 401 | 44 % | 0.24 | -1520.88 |
| Signals | signal:thrust | 62 | 1 (2 %) | 374 | 45 % | 0.26 | -1312.37 |
| Signals | signal:trix | 60 | 11 (18 %) | 116 | 45 % | 0.23 | -474.95 |
| Signals | signal:volume-break | 57 | 54 (95 %) | 57 | 95 % | 12.33 | 195.17 |
| Signals | signal:vwap | 68 | 25 (37 %) | 305 | 64 % | 0.74 | -220.31 |
| Signals | signal:williams-r | 70 | 16 (23 %) | 388 | 59 % | 0.63 | -514.41 |
| Signals | signal:zscore | 70 | 2 (3 %) | 297 | 51 % | 0.39 | -877.26 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1245 | 401 (32 %) | 5743 | 62 % | 0.55 | -9737.84 |
| Signals | 1.25 | 719 | 218 (30 %) | 3288 | 62 % | 0.52 | -6131.68 |
| Signals | 1.35 | 524 | 154 (29 %) | 2344 | 63 % | 0.51 | -4650.80 |
| Signals | 1.5 | 334 | 90 (27 %) | 1552 | 63 % | 0.50 | -3113.13 |
| Signals | 1.75 | 163 | 43 (26 %) | 712 | 64 % | 0.45 | -1614.13 |
| Signals | 2 | 77 | 28 (36 %) | 337 | 68 % | 0.53 | -563.06 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-act-burst-s@m15 | 35 | 33 (94 %) | 261 | 86 % | 2.89 | 537.95 | tp5 sl15 tr0 h96 (8 · ∞ (no loss) · 38.40) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 35 | 33 (94 %) | 210 | 87 % | 4.11 | 537.28 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-obv-m@m15 | 35 | 33 (94 %) | 154 | 86 % | 3.76 | 345.05 | tp5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-ema-cross-s@m15 | 35 | 32 (91 %) | 92 | 91 % | 10.47 | 301.77 | tp3 sl9 tr1.8 h96 (5 · ∞ (no loss) · 8.84) |
| Signals | follow | sig-atr-break-s@m15 | 35 | 22 (63 %) | 244 | 75 % | 1.41 | 201.62 | tp5 sl15 tr3 h96 (6 · ∞ (no loss) · 24.83) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 32 | 29 (91 %) | 65 | 91 % | 7.25 | 173.15 | – |
| Signals | follow | sig-mfi-m@m15 | 35 | 34 (97 %) | 59 | 93 % | 10.96 | 164.91 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-volume-break-m@m15 | 35 | 35 (100 %) | 35 | 100 % | ∞ (no loss) | 158.50 | – |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 35 | 18 (51 %) | 262 | 69 % | 1.26 | 150.06 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-ema-trend-m@m15 | 35 | 16 (46 %) | 172 | 76 % | 1.46 | 149.55 | tp5 sl15 tr3 h96 (5 · 668.61 · 5.21) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 35 | 28 (80 %) | 154 | 71 % | 1.52 | 149.52 | tp4 sl8 tr0 h96 (5 · 1.85 · 7.00) |
| Signals | follow | sig-r-vol-regime-s@m15 | 27 | 27 (100 %) | 48 | 92 % | 9.28 | 147.40 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 35 | 32 (91 %) | 38 | 92 % | 11.44 | 144.65 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 20 | 20 (100 %) | 26 | 100 % | ∞ (no loss) | 90.30 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 35 | 22 (63 %) | 198 | 77 % | 1.16 | 66.29 | tp5 sl15 tr3 h96 (6 · ∞ (no loss) · 11.28) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 31 | 23 (74 %) | 39 | 77 % | 2.12 | 60.00 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 23 | 20 (87 %) | 28 | 89 % | 4.39 | 58.47 | – |
| Signals | follow | sig-r-vol-regime-m@m15 | 15 | 11 (73 %) | 19 | 79 % | 3.34 | 46.95 | – |
| Signals | follow | sig-macd-hist-m@m15 | 35 | 24 (69 %) | 261 | 74 % | 1.07 | 37.18 | tp3 sl9 tr0 h96 (11 · 3.04 · 18.80) |
| Signals | follow | sig-rsi-momentum-s@m15 | 22 | 19 (86 %) | 22 | 86 % | 3.13 | 36.67 | – |
| Signals | follow | sig-volume-break-s@m15 | 22 | 19 (86 %) | 22 | 86 % | 3.13 | 36.67 | – |
| Signals | follow | sig-r-connors-s@m15 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 30.30 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 35 | 18 (51 %) | 268 | 69 % | 1.04 | 25.56 | tp5 sl15 tr3 h96 (7 · 130.47 · 19.86) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 16 (53 %) | 247 | 71 % | 1.05 | 24.55 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-s2-st-trail-m@m15 | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 23.92 | – |
| Signals | follow | sig-obv-s@m15 | 35 | 19 (54 %) | 257 | 70 % | 1.04 | 21.19 | tp4 sl12 tr2.4 h96 (8 · 1.93 · 11.33) |
| Signals | follow | sig-vwap-m@m15 | 33 | 15 (45 %) | 101 | 69 % | 1.09 | 19.81 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 15 (50 %) | 243 | 71 % | 1.03 | 16.33 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-ichimoku-m@m15 | 13 | 11 (85 %) | 17 | 76 % | 2.15 | 14.61 | – |
| Signals | follow | sig-supertrend-m@m15 | 14 | 11 (79 %) | 17 | 82 % | 1.73 | 10.07 | – |
| Signals | follow | sig-ema-cross-m@m15 | 14 | 9 (64 %) | 18 | 72 % | 1.04 | 1.09 | – |
| Signals | follow | sig-act-burst-m@m15 | 29 | 17 (59 %) | 83 | 75 % | 1.00 | -0.02 | – |
| Signals | follow | sig-trix-s@m15 | 25 | 11 (44 %) | 58 | 62 % | 0.85 | -18.24 | tp2.5 sl3.75 tr0 h96 (5 · 0.87 · -1.00) |
| Signals | follow | sig-keltner-s@m15 | 27 | 15 (56 %) | 62 | 58 % | 0.85 | -22.74 | tp2.5 sl5 tr0 h96 (6 · 0.44 · -8.70) |
| Signals | follow | sig-donchian-m@m15 | 13 | 5 (38 %) | 28 | 54 % | 0.52 | -36.85 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-rsi-reversal-m@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -49.85 | – |
| Signals | follow | sig-st-slow-s@m15 | 25 | 11 (44 %) | 33 | 48 % | 0.52 | -57.10 | – |
| Signals | follow | sig-supertrend-s@m15 | 32 | 17 (53 %) | 164 | 73 % | 0.86 | -58.12 | tp2.5 sl5 tr0 h96 (8 · 3.10 · 10.90) |
| Signals | follow | sig-keltner-m@m15 | 22 | 5 (23 %) | 39 | 56 % | 0.56 | -65.05 | – |
| Signals | follow | sig-hma-m@m15 | 35 | 16 (46 %) | 186 | 65 % | 0.86 | -65.52 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 12.99) |
| Signals | follow | sig-atr-break-m@m15 | 27 | 14 (52 %) | 63 | 68 % | 0.61 | -66.86 | – |
| Signals | follow | sig-act-hf-s@m15 | 35 | 18 (51 %) | 252 | 65 % | 0.89 | -71.01 | tp4 sl12 tr2.4 h96 (8 · 1.56 · 6.96) |
| Signals | follow | sig-s2-st-trail-s@m15 | 25 | 11 (44 %) | 28 | 39 % | 0.40 | -71.10 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 27 | 14 (52 %) | 39 | 67 % | 0.51 | -73.87 | – |
| Signals | follow | sig-ema-pullback-s@m15 | 32 | 12 (38 %) | 215 | 69 % | 0.84 | -77.56 | tp5 sl15 tr3 h96 (5 · 110.33 · 9.87) |
| Signals | follow | sig-st-slow-m@m15 | 17 | 3 (18 %) | 27 | 48 % | 0.26 | -78.71 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 35 | 16 (46 %) | 227 | 70 % | 0.86 | -80.21 | tp2.5 sl7.5 tr0 h96 (13 · 1.64 · 9.90) |
| Signals | follow | sig-kama-m@m15 | 35 | 14 (40 %) | 288 | 69 % | 0.86 | -100.24 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-r-inside-s@m15 | 11 | 0 (0 %) | 15 | 0 % | 0.00 | -103.75 | – |
| Signals | follow | sig-s2-range-shift-s@m15 | 21 | 8 (38 %) | 68 | 49 % | 0.48 | -103.88 | tp2.5 sl3.75 tr0 h96 (10 · 0.58 · -8.25) |
| Signals | follow | sig-r-fractal-m@m15 | 13 | 0 (0 %) | 14 | 0 % | 0.00 | -108.14 | – |
| Signals | follow | sig-squeeze-m@m15 | 18 | 6 (33 %) | 18 | 33 % | 0.07 | -108.97 | – |
| Signals | follow | sig-ema-slope-m@m15 | 28 | 5 (18 %) | 76 | 63 % | 0.57 | -112.70 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-s2-block-stack-s@m15 | 35 | 14 (40 %) | 197 | 66 % | 0.78 | -128.82 | tp3 sl6 tr0 h96 (9 · 1.58 · 7.20) |
| Signals | follow | sig-s2-vol-break-s@m15 | 26 | 6 (23 %) | 53 | 51 % | 0.35 | -154.28 | – |
| Signals | follow | sig-ema-slope-s@m15 | 21 | 3 (14 %) | 74 | 51 % | 0.38 | -168.97 | tp2.5 sl5 tr0 h96 (8 · 0.74 · -4.10) |
| Signals | follow | sig-adx-m@m15 | 33 | 13 (39 %) | 75 | 47 % | 0.43 | -170.04 | tp3 sl9 tr1.8 h96 (6 · 0.05 · -17.54) |
| Signals | follow | sig-donchian-s@m15 | 32 | 9 (28 %) | 125 | 61 % | 0.58 | -184.47 | tp4 sl12 tr2.4 h96 (5 · 1.02 · 0.25) |
| Signals | follow | sig-r-connors-m@m15 | 28 | 6 (21 %) | 91 | 56 % | 0.45 | -194.57 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 31 | 8 (26 %) | 95 | 57 % | 0.45 | -201.93 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-reclaim-s@m15 | 35 | 11 (31 %) | 266 | 67 % | 0.71 | -220.80 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-williams-r-s@m15 | 35 | 14 (40 %) | 123 | 49 % | 0.50 | -221.99 | tp4 sl12 tr2.4 h96 (5 · 0.72 · -3.49) |
| Signals | follow | sig-stoch-rsi-m@m15 | 32 | 7 (22 %) | 218 | 62 % | 0.63 | -225.37 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 11.37) |
| Signals | follow | sig-s2-block-scale-m@m15 | 32 | 10 (31 %) | 180 | 61 % | 0.58 | -230.06 | tp3 sl6 tr0 h96 (8 · 1.35 · 4.40) |
| Signals | follow | sig-ichimoku-s@m15 | 35 | 4 (11 %) | 141 | 59 % | 0.55 | -233.80 | tp2.5 sl3.75 tr0 h96 (8 · 0.97 · -0.35) |
| Signals | follow | sig-r-linreg-s@m15 | 35 | 9 (26 %) | 246 | 60 % | 0.67 | -235.21 | tp5 sl10 tr0 h96 (5 · 0.71 · -6.00) |
| Signals | follow | sig-s2-block-stack-m@m15 | 26 | 3 (12 %) | 81 | 53 % | 0.36 | -236.20 | tp2.5 sl7.5 tr0 h96 (5 · 1.19 · 1.50) |
| Signals | follow | sig-vwap-s@m15 | 35 | 10 (29 %) | 204 | 62 % | 0.62 | -240.12 | tp3 sl6 tr0 h96 (9 · 0.90 · -1.80) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 24 | 4 (17 %) | 69 | 39 % | 0.24 | -243.70 | tp2.5 sl5 tr0 h96 (5 · 0.29 · -11.00) |
| Signals | follow | sig-bollinger-m@m15 | 35 | 2 (6 %) | 167 | 60 % | 0.63 | -245.12 | tp4 sl12 tr2.4 h96 (5 · 0.94 · -0.68) |
| Signals | follow | sig-rsi-reversal-s@m15 | 22 | 0 (0 %) | 39 | 15 % | 0.03 | -269.49 | – |
| Signals | follow | sig-sar-s@m15 | 35 | 6 (17 %) | 230 | 61 % | 0.63 | -270.21 | tp4 sl6 tr0 h96 (12 · 0.86 · -4.40) |
| Signals | follow | sig-ema-pullback-m@m15 | 35 | 9 (26 %) | 147 | 58 % | 0.49 | -285.25 | tp3 sl4.5 tr0 h96 (7 · 0.79 · -2.90) |
| Signals | follow | sig-williams-r-m@m15 | 35 | 2 (6 %) | 265 | 63 % | 0.69 | -292.42 | tp4 sl6 tr0 h96 (13 · 0.98 · -0.60) |
| Signals | follow | sig-reclaim-m@m15 | 35 | 9 (26 %) | 215 | 59 % | 0.60 | -304.18 | tp6 sl12 tr0 h96 (5 · 0.71 · -7.00) |
| Signals | follow | sig-r-fractal-s@m15 | 24 | 0 (0 %) | 50 | 12 % | 0.04 | -310.27 | tp2.5 sl3.75 tr0 h96 (6 · 0.29 · -11.20) |
| Signals | follow | sig-cci-m@m15 | 35 | 2 (6 %) | 192 | 57 % | 0.58 | -320.85 | tp4 sl8 tr0 h96 (6 · 0.93 · -1.20) |
| Signals | follow | sig-r-awesome-m@m15 | 35 | 9 (26 %) | 167 | 51 % | 0.46 | -337.12 | tp4 sl12 tr2.4 h96 (5 · 0.94 · -0.71) |
| Signals | follow | sig-squeeze-s@m15 | 31 | 0 (0 %) | 31 | 0 % | 0.00 | -346.29 | – |
| Signals | follow | sig-r-awesome-s@m15 | 27 | 2 (7 %) | 88 | 36 % | 0.20 | -351.47 | tp3 sl9 tr1.8 h96 (5 · 0.30 · -13.04) |
| Signals | follow | sig-r-nr-break-m@m15 | 25 | 4 (16 %) | 99 | 39 % | 0.26 | -359.82 | tp2.5 sl3.75 tr0 h96 (10 · 0.58 · -8.25) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 35 | 14 (40 %) | 136 | 44 % | 0.36 | -366.80 | tp2.5 sl7.5 tr0 h96 (6 · 0.30 · -16.20) |
| Signals | follow | sig-s2-block-scale-s@m15 | 32 | 2 (6 %) | 196 | 57 % | 0.45 | -375.51 | tp4 sl6 tr0 h96 (7 · 1.53 · 6.60) |
| Signals | follow | sig-adx-s@m15 | 31 | 6 (19 %) | 146 | 54 % | 0.39 | -382.46 | tp3 sl6 tr0 h96 (6 · 0.90 · -1.20) |
| Signals | follow | sig-rsi-mid-m@m15 | 26 | 6 (23 %) | 136 | 42 % | 0.29 | -382.47 | tp4 sl12 tr2.4 h96 (5 · 45.18 · 8.84) |
| Signals | follow | sig-zscore-m@m15 | 35 | 0 (0 %) | 76 | 41 % | 0.23 | -386.00 | – |
| Signals | follow | sig-macd-cross-m@m15 | 31 | 4 (13 %) | 146 | 57 % | 0.37 | -386.65 | tp3 sl4.5 tr0 h96 (10 · 1.39 · 5.50) |
| Signals | follow | sig-cmf-s@m15 | 26 | 1 (4 %) | 124 | 46 % | 0.28 | -406.45 | tp3 sl9 tr1.8 h96 (10 · 0.79 · -3.85) |
| Signals | follow | sig-s2-confluence-s@m15 | 32 | 1 (3 %) | 234 | 58 % | 0.49 | -411.30 | tp5 sl15 tr3 h96 (6 · 0.71 · -4.41) |
| Signals | follow | sig-r-session-trend-m@m15 | 35 | 10 (29 %) | 150 | 47 % | 0.36 | -413.75 | tp3 sl9 tr1.8 h96 (9 · 0.43 · -15.73) |
| Signals | follow | sig-thrust-m@m15 | 31 | 1 (3 %) | 211 | 57 % | 0.42 | -416.56 | tp2.5 sl7.5 tr0 h96 (13 · 1.00 · -0.10) |
| Signals | follow | sig-stoch-rsi-s@m15 | 35 | 10 (29 %) | 263 | 57 % | 0.49 | -437.80 | tp5 sl15 tr3 h96 (5 · 1.06 · 0.32) |
| Signals | follow | sig-macd-cross-s@m15 | 32 | 3 (9 %) | 178 | 54 % | 0.41 | -439.11 | tp4 sl6 tr0 h96 (8 · 1.84 · 10.40) |
| Signals | follow | sig-macd-hist-s@m15 | 32 | 3 (9 %) | 178 | 54 % | 0.41 | -439.11 | tp4 sl6 tr0 h96 (8 · 1.84 · 10.40) |
| Signals | follow | sig-sar-m@m15 | 28 | 2 (7 %) | 198 | 56 % | 0.42 | -440.41 | tp2.5 sl3.75 tr0 h96 (16 · 0.97 · -0.70) |
| Signals | follow | sig-hma-s@m15 | 26 | 0 (0 %) | 167 | 50 % | 0.35 | -453.20 | tp4 sl6 tr0 h96 (12 · 0.86 · -4.40) |
| Signals | follow | sig-trix-m@m15 | 35 | 0 (0 %) | 58 | 28 % | 0.08 | -456.71 | – |
| Signals | follow | sig-r-linreg-m@m15 | 35 | 9 (26 %) | 181 | 52 % | 0.41 | -462.04 | tp5 sl15 tr3 h96 (5 · 0.53 · -7.07) |
| Signals | follow | sig-macd-slow-s@m15 | 32 | 2 (6 %) | 188 | 55 % | 0.39 | -463.33 | tp4 sl6 tr0 h96 (10 · 0.92 · -2.00) |
| Signals | follow | sig-s2-atr-break-m@m15 | 32 | 2 (6 %) | 145 | 47 % | 0.28 | -475.82 | tp3 sl6 tr0 h96 (10 · 0.68 · -8.00) |
| Signals | follow | sig-bollinger-s@m15 | 35 | 2 (6 %) | 221 | 54 % | 0.48 | -491.26 | tp4 sl12 tr0 h96 (6 · 0.62 · -9.20) |
| Signals | follow | sig-zscore-s@m15 | 35 | 2 (6 %) | 221 | 54 % | 0.48 | -491.26 | tp4 sl12 tr0 h96 (6 · 0.62 · -9.20) |
| Signals | follow | sig-act-hf-m@m15 | 26 | 4 (15 %) | 157 | 44 % | 0.27 | -499.56 | tp3 sl6 tr0 h96 (9 · 0.56 · -10.80) |
| Signals | follow | sig-macd-slow-m@m15 | 31 | 1 (3 %) | 162 | 53 % | 0.34 | -502.51 | tp2.5 sl5 tr0 h96 (8 · 1.33 · 3.40) |
| Signals | follow | sig-rsi-mid-s@m15 | 31 | 5 (16 %) | 143 | 45 % | 0.25 | -511.78 | tp2.5 sl3.75 tr0 h96 (13 · 0.68 · -7.60) |
| Signals | follow | sig-s2-range-shift-m@m15 | 33 | 2 (6 %) | 83 | 30 % | 0.15 | -521.19 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-kama-s@m15 | 27 | 2 (7 %) | 189 | 48 % | 0.31 | -523.16 | tp3 sl6 tr0 h96 (10 · 0.68 · -8.00) |
| Signals | follow | sig-r-session-trend-s@m15 | 35 | 5 (14 %) | 218 | 53 % | 0.45 | -529.40 | tp4 sl12 tr2.4 h96 (7 · 1.07 · 0.84) |
| Signals | follow | sig-impulse-s@m15 | 32 | 2 (6 %) | 177 | 49 % | 0.32 | -548.83 | tp4 sl6 tr0 h96 (6 · 0.61 · -7.20) |
| Signals | follow | sig-heikin-ashi-m@m15 | 26 | 1 (4 %) | 186 | 48 % | 0.31 | -562.00 | tp3 sl4.5 tr0 h96 (14 · 1.07 · 1.70) |
| Signals | follow | sig-cmf-m@m15 | 32 | 2 (6 %) | 132 | 39 % | 0.21 | -568.02 | tp3 sl9 tr1.8 h96 (6 · 0.18 · -15.16) |
| Signals | follow | sig-r-nr-break-s@m15 | 25 | 0 (0 %) | 124 | 34 % | 0.19 | -573.12 | tp2.5 sl3.75 tr0 h96 (11 · 0.70 · -5.95) |
| Signals | follow | sig-ema-trend-s@m15 | 32 | 6 (19 %) | 221 | 53 % | 0.36 | -584.49 | tp3 sl6 tr0 h96 (10 · 0.68 · -8.00) |
| Signals | follow | sig-swing-s@m15 | 30 | 0 (0 %) | 165 | 45 % | 0.24 | -604.79 | tp2.5 sl3.75 tr0 h96 (15 · 0.87 · -3.00) |
| Signals | follow | sig-s2-atr-break-s@m15 | 31 | 0 (0 %) | 90 | 14 % | 0.06 | -613.09 | tp2.5 sl3.75 tr0 h96 (10 · 0.25 · -20.75) |
| Signals | follow | sig-impulse-m@m15 | 31 | 0 (0 %) | 101 | 21 % | 0.10 | -622.19 | tp3 sl9 tr1.8 h96 (7 · 0.31 · -12.89) |
| Signals | follow | sig-heikin-ashi-s@m15 | 32 | 1 (3 %) | 313 | 57 % | 0.48 | -626.21 | tp5 sl7.5 tr0 h96 (11 · 0.75 · -9.70) |
| Signals | follow | sig-cci-s@m15 | 32 | 1 (3 %) | 242 | 52 % | 0.37 | -655.55 | tp6 sl18 tr3.6 h96 (5 · 0.97 · -0.49) |
| Signals | follow | sig-thrust-s@m15 | 31 | 0 (0 %) | 163 | 29 % | 0.14 | -895.81 | tp3 sl4.5 tr0 h96 (11 · 0.34 · -21.70) |
| Signals | follow | sig-swing-m@m15 | 35 | 0 (0 %) | 236 | 44 % | 0.24 | -916.09 | tp2.5 sl5 tr0 h96 (17 · 0.50 · -20.90) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 1.00× | 45 | 42 (93 %) | 60 | 95 % | 6.12 | 372.00 |
| Signals | tp 8.000% | sl 3.00× | tr 1.20× | 45 | 42 (93 %) | 60 | 95 % | 6.12 | 372.00 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 71 | 63 (89 %) | 114 | 91 % | 2.77 | 343.06 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 49 | 41 (84 %) | 78 | 86 % | 2.43 | 277.64 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 95 | 73 (77 %) | 217 | 88 % | 1.49 | 195.89 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 84 | 53 (63 %) | 157 | 78 % | 1.03 | 18.55 |
| Signals | tp 6.000% | sl 3.00× | tr off | 74 | 43 (58 %) | 119 | 72 % | 0.83 | -101.80 |
| Signals | tp 6.000% | sl 3.00× | tr 1.00× | 74 | 43 (58 %) | 119 | 72 % | 0.83 | -101.80 |
| Signals | tp 6.000% | sl 3.00× | tr 1.20× | 74 | 43 (58 %) | 119 | 72 % | 0.83 | -101.80 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 116 | 55 (47 %) | 395 | 74 % | 0.60 | -522.37 |
| Signals | tp 5.000% | sl 3.00× | tr off | 100 | 32 (32 %) | 262 | 62 % | 0.52 | -722.40 |
| Signals | tp 5.000% | sl 3.00× | tr 1.00× | 100 | 32 (32 %) | 262 | 62 % | 0.52 | -722.40 |
| Signals | tp 5.000% | sl 3.00× | tr 1.20× | 100 | 32 (32 %) | 262 | 62 % | 0.52 | -722.40 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 108 | 37 (34 %) | 314 | 64 % | 0.50 | -780.87 |
| Signals | tp 3.000% | sl 2.00× | tr off | 120 | 33 (28 %) | 841 | 58 % | 0.62 | -831.20 |
| Signals | tp 4.000% | sl 1.50× | tr off | 114 | 31 (27 %) | 686 | 50 % | 0.61 | -833.20 |
| Signals | tp 6.000% | sl 2.00× | tr off | 90 | 15 (17 %) | 217 | 46 % | 0.40 | -865.40 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 116 | 42 (36 %) | 566 | 69 % | 0.51 | -875.34 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 114 | 34 (30 %) | 456 | 66 % | 0.49 | -938.19 |
| Signals | tp 2.500% | sl 3.00× | tr off | 119 | 31 (26 %) | 872 | 66 % | 0.58 | -944.40 |
| Signals | tp 2.500% | sl 2.00× | tr off | 122 | 24 (20 %) | 1142 | 58 % | 0.60 | -1010.90 |
| Signals | tp 5.000% | sl 1.50× | tr off | 111 | 24 (22 %) | 472 | 44 % | 0.49 | -1046.90 |
| Signals | tp 2.500% | sl 1.50× | tr off | 122 | 20 (16 %) | 1304 | 50 % | 0.59 | -1050.80 |
| Signals | tp 5.000% | sl 2.00× | tr off | 107 | 28 (26 %) | 361 | 48 % | 0.43 | -1087.20 |
| Signals | tp 6.000% | sl 1.50× | tr off | 101 | 16 (16 %) | 306 | 37 % | 0.37 | -1105.20 |
| Signals | tp 3.000% | sl 3.00× | tr off | 118 | 29 (25 %) | 634 | 61 % | 0.48 | -1164.80 |
| Signals | tp 3.000% | sl 3.00× | tr 1.00× | 118 | 29 (25 %) | 634 | 61 % | 0.48 | -1164.80 |
| Signals | tp 3.000% | sl 3.00× | tr 1.20× | 118 | 29 (25 %) | 634 | 61 % | 0.48 | -1164.80 |
| Signals | tp 4.000% | sl 2.00× | tr off | 110 | 18 (16 %) | 550 | 51 % | 0.47 | -1174.00 |
| Signals | tp 4.000% | sl 3.00× | tr off | 107 | 21 (20 %) | 417 | 59 % | 0.44 | -1183.40 |
| Signals | tp 4.000% | sl 3.00× | tr 1.00× | 107 | 21 (20 %) | 417 | 59 % | 0.44 | -1183.40 |
| Signals | tp 4.000% | sl 3.00× | tr 1.20× | 107 | 21 (20 %) | 417 | 59 % | 0.44 | -1183.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 118 | 27 (23 %) | 920 | 62 % | 0.48 | -1184.68 |
| Signals | tp 3.000% | sl 1.50× | tr off | 122 | 21 (17 %) | 1076 | 48 % | 0.54 | -1202.20 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 118 | 30 (25 %) | 722 | 60 % | 0.47 | -1204.58 |

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
