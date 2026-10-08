# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 554/27458 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 428/27332 · PF 1.59 · Signals 126/126 · PF 1.11; Main 428 pairs, 27094 tapes, Real seats: 0 engine configs + 4410 signal configs (every config of the active signals), compute 91 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.00 (0.00 %, closed orders) · equity at end $20.00 (open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ – (gross profit $ ÷ gross loss $ as sized) · PF unit – (every order at one unit: the engine's PF) · 0 positions / 0 orders · WR 0.00 % · DDT (closed trades, $) 0.00 h · DDR – (net ≤ 0) · equity max drawdown $0.00 (0.00 %) · margin used max $0.00 · open avg 0.00 pos / 0.00 orders (peak 0 / 0)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 0 orders capped to $0, 0 scaled down · binding: position cap 0, gross cap 0. **Without the caps:** balance $20.00 → $20.00 (0.00 %) · PF $ – · equity at end $20.00 · equity max drawdown $0.00 (0.00 %) · margin used max $0.00.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 428 | 0  | 0.0 % | 1.586 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 428 | 0 (+0) | 0.0 % | 1.586 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 428 | 0 (+0) | 0.0 % | 1.586 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 390 | 0 (+0) | 0.0 % | 1.652 |
| closes ≥ 6 | 1.00 | 6 | 1 | 639 | 0 (+0) | 0.0 % | 1.842 |
| closes ≥ 20 | 1.00 | 20 | 1 | 292 | 0 (+0) | 0.0 % | 1.435 |
| closes ≥ 30 | 1.00 | 30 | 1 | 195 | 0 (+0) | 0.0 % | 1.319 |
| DDR off | 1.00 | 12 | off | 1622 | 0 (+0) | 0.0 % | 1.151 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 802 | 0 (+0) | 0.0 % | 1.365 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 161 | 0 (+0) | 0.0 % | 2.004 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1622 | 0 (+0) | 0.0 % | 1.151 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2121 | 0 (+0) | 0.0 % | 1.188 |

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

Base (full history, each pair at its default protect and its ranges' cells): 27332 engine pairs evaluated, 428 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (27094 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3514); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 10123 · 1.37 | 2567 · 1.15 | 2532 · 2.39 | 1212 · 0.58 | – | – | – | – | – |
| 13:00 | 10262 · 0.80 | 653 · 1.52 | 584 · 1.74 | 652 · 5.22 | – | – | – | – | – |
| 14:00 | 7320 · 2.72 | 1656 · 1.80 | 1161 · 15.79 | 1781 · 11.68 | – | – | – | – | – |
| 15:00 | 11090 · 0.63 | 2748 · 0.48 | 2755 · 0.65 | 2971 · 0.45 | – | – | – | – | – |
| 16:00 | 6148 · 1.17 | 796 · 1.11 | 664 · 0.97 | 624 · 1.83 | – | – | – | – | – |
| 17:00 | 4909 · 1.17 | 1252 · 0.94 | 1042 · 1.08 | 1028 · 1.41 | – | – | – | – | – |
| 18:00 | 4839 · 1.89 | 614 · 2.74 | 421 · 345.57 | 337 · 0.95 | – | – | – | – | – |
| 19:00 | 5408 · 1.46 | 1202 · 1.85 | 776 · 28.24 | 903 · 1.84 | – | – | – | – | – |
| 20:00 | 8238 · 1.21 | 1869 · 1.56 | 854 · 55.12 | 718 · 0.32 | – | – | – | – | – |
| 21:00 | 12688 · 1.23 | 3081 · 1.32 | 2342 · 3.11 | 2373 · 1.09 | – | – | – | – | – |
| 22:00 | 14270 · 0.69 | 3089 · 0.60 | 2917 · 1.04 | 2411 · 0.10 | – | – | – | – | – |
| 23:00 | 9704 · 0.51 | 1285 · 0.77 | 1293 · 0.52 | 1172 · 0.14 | – | – | – | – | – |
| **total** | **104999 · 0.98** | **20812 · 0.97** | **17341 · 1.40** | **16182 · 0.56** | **–** | **–** | **–** | **–** | **–** |

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
| Wide | 1.59 | – | – | – | – | 0 |
| Signals | 1.11 | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 22684 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2263 units active at the run start, 3016 over the run, 3514 of 4410 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

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
| Wide | 22684 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 22684 | 0 |  |
| Signals | 4410 | – | 2263 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 4410 signal tapes, 2263 units (pair × symbol × direction) active at the run start, 3016 over the run; 3514 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Wide | axis | 19260 | 3509 (18 %) | 58402 | 31 % | 0.68 | -12541.86 |
| Wide | dca | 1712 | 518 (30 %) | 5264 | 66 % | 0.67 | -2250.30 |
| Wide | dca-active | 1712 | 304 (18 %) | 3180 | 37 % | 0.55 | -1148.89 |
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
| Signals | 1.1 | 1248 | 404 (32 %) | 5746 | 62 % | 0.55 | -9726.44 |
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
| Wide | axis | 201 (201) | 19260 | 19260 | 19260 | 0 | – |
| Wide | dca | 201 (201) | 1712 | 1712 | 1712 | 0 | – |
| Wide | dca-active | 201 (201) | 1712 | 1712 | 1712 | 0 | – |

Engine indications Base evaluated that built no set: 190 (act-burst, act-burst-1.5, act-burst-2.5, act-burst-2.5@x4, act-chop, act-chop@x4, act-hf-8, bb-bounce, bb-bounce-20-3, bb-mid, bb-walk, bb-walk-50, break-atr, break-atr-0.9, break-atr-1.5, break-atr-2, break-atr-2@x4, break-don10, break-don40, break-don55, break-vol-2@x4, break-vol@x4, cci-14-200, cci-20-100, cci-20-200, cci-40-100, cci-40-200@x4, cmf-20-0.05, cmf-20-0.1, dir-emax, dir-emax-12-26, dir-emax-5-13, dir-macd, dir-reclaim-50, dir-st, dir-vwap-30, ema-9-21, ema-pullback, ema-pullback-50, ema-slope-10, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.57 (20152) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.44 (754) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.93 (8761) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.47 (719) | 0.60 (349) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.40 (700) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.63 (327) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.64 (324) | – | – | – | – |
| 1× | – | – | – | 0.65 (23971) | – | – | – | 0.67 (7821) | 0.46 (792) | – | 0.71 (322) | – | 0.69 (724) | 0.92 (607) | 0.96 (280) | 1.83 (243) |

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
