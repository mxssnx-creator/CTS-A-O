# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 554/27458 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 428/27332 · PF 1.59 · Signals 126/126 · PF 1.11; Main 428 pairs, 25204 tapes, Real seats: 0 engine configs + 2520 signal configs (every config of the active signals), compute 92 s. Causal: Base / Main / Real ranked on the history before the run.

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
| closes ≥ 6 | 1.00 | 6 | 1 | 640 | 0 (+0) | 0.0 % | 1.845 |
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

Base (full history, each pair at its default protect and its ranges' cells): 27332 engine pairs evaluated, 428 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (25204 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (2091); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 7874 · 1.45 | 722 · 1.95 | 2128 · 2.23 | 706 · 0.51 | – | – | – | – | – |
| 13:00 | 9942 · 0.70 | 203 · 1.70 | 714 · 1.40 | 538 · 5.34 | – | – | – | – | – |
| 14:00 | 6245 · 3.32 | 418 · 4.47 | 1324 · 13.68 | 1089 · 66.07 | – | – | – | – | – |
| 15:00 | 8792 · 0.88 | 762 · 0.49 | 2443 · 1.03 | 1693 · 0.66 | – | – | – | – | – |
| 16:00 | 5777 · 1.36 | 168 · 1.52 | 921 · 1.54 | 512 · 5.04 | – | – | – | – | – |
| 17:00 | 4070 · 1.33 | 331 · 1.05 | 1124 · 0.97 | 724 · 1.34 | – | – | – | – | – |
| 18:00 | 4493 · 1.50 | 109 · ∞ (no loss) | 580 · 17.43 | 422 · 25.80 | – | – | – | – | – |
| 19:00 | 4393 · 1.06 | 231 · 9.07 | 732 · 18.56 | 515 · 8.59 | – | – | – | – | – |
| 20:00 | 6307 · 0.79 | 275 · 6.77 | 517 · 15.59 | 184 · 1.58 | – | – | – | – | – |
| 21:00 | 9550 · 0.90 | 660 · 1.79 | 1625 · 2.13 | 1070 · 1.62 | – | – | – | – | – |
| 22:00 | 10926 · 0.44 | 726 · 0.37 | 1936 · 0.56 | 1487 · 0.15 | – | – | – | – | – |
| 23:00 | 8451 · 0.34 | 334 · 0.48 | 991 · 0.28 | 777 · 0.10 | – | – | – | – | – |
| **total** | **86820 · 0.89** | **4939 · 1.02** | **15035 · 1.22** | **9717 · 0.62** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 23874 | sig:confirm 23874 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 22684 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2349 units active at the run start, 3087 over the run, 2091 of 2520 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 520 | 172 (33 %) | 2339 | 65 % | 0.56 | -3697.80 |
| Signals | trailing | 1571 | 727 (46 %) | 7378 | 69 % | 0.64 | -6777.32 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 38 | 26 (68 %) | 180 | 79 % | 1.52 | 145.14 |
| Signals | signal:act-hf | 36 | 14 (39 %) | 212 | 64 % | 0.61 | -214.84 |
| Signals | signal:adx | 30 | 10 (33 %) | 133 | 67 % | 0.68 | -115.27 |
| Signals | signal:atr-break | 36 | 25 (69 %) | 195 | 77 % | 1.59 | 170.83 |
| Signals | signal:bollinger | 40 | 2 (5 %) | 210 | 64 % | 0.56 | -401.86 |
| Signals | signal:cci | 39 | 2 (5 %) | 244 | 66 % | 0.53 | -438.05 |
| Signals | signal:cmf | 38 | 9 (24 %) | 145 | 49 % | 0.22 | -590.04 |
| Signals | signal:donchian | 24 | 8 (33 %) | 98 | 67 % | 0.66 | -93.52 |
| Signals | signal:ema-cross | 20 | 20 (100 %) | 40 | 98 % | 1098.05 | 117.56 |
| Signals | signal:ema-cross-fast | 40 | 30 (75 %) | 179 | 87 % | 2.00 | 181.32 |
| Signals | signal:ema-pullback | 34 | 9 (26 %) | 227 | 70 % | 0.46 | -318.53 |
| Signals | signal:ema-slope | 33 | 11 (33 %) | 99 | 72 % | 0.54 | -134.54 |
| Signals | signal:ema-trend | 38 | 12 (32 %) | 260 | 69 % | 0.57 | -308.70 |
| Signals | signal:heikin-ashi | 34 | 2 (6 %) | 245 | 59 % | 0.32 | -653.30 |
| Signals | signal:hma | 36 | 15 (42 %) | 180 | 61 % | 0.66 | -161.07 |
| Signals | signal:ichimoku | 23 | 8 (35 %) | 110 | 67 % | 0.77 | -62.68 |
| Signals | signal:impulse | 36 | 5 (14 %) | 162 | 50 % | 0.26 | -514.68 |
| Signals | signal:kama | 37 | 11 (30 %) | 267 | 70 % | 0.62 | -242.06 |
| Signals | signal:keltner | 33 | 16 (48 %) | 73 | 60 % | 0.81 | -36.91 |
| Signals | signal:macd-cross | 36 | 7 (19 %) | 174 | 64 % | 0.45 | -332.91 |
| Signals | signal:macd-hist | 39 | 18 (46 %) | 252 | 74 % | 0.82 | -100.57 |
| Signals | signal:macd-slow | 38 | 7 (18 %) | 177 | 61 % | 0.37 | -466.79 |
| Signals | signal:mfi | 19 | 19 (100 %) | 43 | 98 % | 1048.19 | 79.79 |
| Signals | signal:obv | 37 | 31 (84 %) | 228 | 83 % | 1.85 | 243.42 |
| Signals | signal:r-awesome | 36 | 10 (28 %) | 152 | 53 % | 0.29 | -454.18 |
| Signals | signal:r-connors | 27 | 12 (44 %) | 107 | 64 % | 0.38 | -248.72 |
| Signals | signal:r-fractal | 25 | 5 (20 %) | 51 | 27 % | 0.03 | -250.44 |
| Signals | signal:r-inside | 7 | 0 (0 %) | 10 | 30 % | 0.11 | -61.19 |
| Signals | signal:r-linreg | 40 | 14 (35 %) | 244 | 68 % | 0.59 | -264.69 |
| Signals | signal:r-nr-break | 32 | 9 (28 %) | 145 | 51 % | 0.32 | -404.49 |
| Signals | signal:r-session-trend | 40 | 12 (30 %) | 179 | 64 % | 0.52 | -303.09 |
| Signals | signal:r-vol-regime | 35 | 34 (97 %) | 49 | 92 % | 263.48 | 175.67 |
| Signals | signal:reclaim | 40 | 14 (35 %) | 283 | 72 % | 0.70 | -215.62 |
| Signals | signal:rsi-mid | 35 | 10 (29 %) | 185 | 51 % | 0.29 | -413.57 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 29 | 17 (59 %) | 38 | 66 % | 0.40 | -84.79 |
| Signals | signal:s2-active-hf | 36 | 22 (61 %) | 253 | 76 % | 1.02 | 8.77 |
| Signals | signal:s2-adx-gate | 40 | 22 (55 %) | 234 | 76 % | 0.98 | -10.21 |
| Signals | signal:s2-atr-break | 37 | 6 (16 %) | 149 | 46 % | 0.17 | -606.83 |
| Signals | signal:s2-bb-bounce | 40 | 28 (70 %) | 178 | 77 % | 1.52 | 171.29 |
| Signals | signal:s2-block-scale | 37 | 11 (30 %) | 264 | 68 % | 0.48 | -399.16 |
| Signals | signal:s2-block-stack | 34 | 10 (29 %) | 169 | 67 % | 0.68 | -167.48 |
| Signals | signal:s2-confluence | 38 | 17 (45 %) | 309 | 72 % | 0.99 | -2.71 |
| Signals | signal:s2-ema-cross | 22 | 21 (95 %) | 22 | 95 % | 155.38 | 33.47 |
| Signals | signal:s2-range-break | 28 | 22 (79 %) | 32 | 81 % | 1.92 | 40.27 |
| Signals | signal:s2-range-shift | 38 | 9 (24 %) | 115 | 50 % | 0.36 | -330.89 |
| Signals | signal:s2-rsi-revert | 32 | 24 (75 %) | 58 | 76 % | 1.04 | 4.89 |
| Signals | signal:s2-st-trail | 26 | 20 (77 %) | 26 | 77 % | 1.03 | 1.10 |
| Signals | signal:s2-stoch-swing | 40 | 28 (70 %) | 282 | 85 % | 2.46 | 432.23 |
| Signals | signal:s2-vol-break | 34 | 21 (62 %) | 65 | 78 % | 1.02 | 2.18 |
| Signals | signal:sar | 38 | 12 (32 %) | 226 | 67 % | 0.60 | -250.51 |
| Signals | signal:squeeze | 29 | 9 (31 %) | 29 | 31 % | 0.02 | -239.24 |
| Signals | signal:st-slow | 25 | 15 (60 %) | 30 | 63 % | 0.61 | -27.44 |
| Signals | signal:stoch-rsi | 40 | 20 (50 %) | 341 | 71 % | 0.82 | -108.71 |
| Signals | signal:supertrend | 31 | 21 (68 %) | 91 | 73 % | 0.61 | -80.37 |
| Signals | signal:swing | 38 | 3 (8 %) | 245 | 52 % | 0.21 | -837.17 |
| Signals | signal:thrust | 38 | 6 (16 %) | 273 | 59 % | 0.35 | -687.47 |
| Signals | signal:trix | 40 | 16 (40 %) | 108 | 68 % | 0.73 | -92.74 |
| Signals | signal:volume-break | 35 | 34 (97 %) | 55 | 96 % | 532.75 | 217.40 |
| Signals | signal:vwap | 40 | 23 (57 %) | 216 | 76 % | 1.21 | 71.70 |
| Signals | signal:williams-r | 40 | 11 (28 %) | 195 | 62 % | 0.53 | -336.03 |
| Signals | signal:zscore | 40 | 0 (0 %) | 161 | 56 % | 0.36 | -540.87 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Wide | 22684 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 22684 | 0 |  |
| Signals | 2520 | – | 2349 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 2520 signal tapes, 2349 units (pair × symbol × direction) active at the run start, 3087 over the run; 2091 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Wide | axis | 19260 | 3509 (18 %) | 58402 | 31 % | 0.68 | -12541.86 |
| Wide | dca | 1712 | 518 (30 %) | 5264 | 66 % | 0.67 | -2250.30 |
| Wide | dca-active | 1712 | 304 (18 %) | 3180 | 37 % | 0.55 | -1148.89 |
| Signals | normal | 630 | 319 (51 %) | 4939 | 76 % | 1.02 | 266.20 |
| Signals | trailing | 1890 | 1131 (60 %) | 15035 | 74 % | 1.22 | 5892.11 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 38 | 26 (68 %) | 180 | 79 % | 1.52 | 145.14 |
| Signals | signal:act-hf | 36 | 14 (39 %) | 212 | 64 % | 0.61 | -214.84 |
| Signals | signal:adx | 30 | 10 (33 %) | 133 | 67 % | 0.68 | -115.27 |
| Signals | signal:atr-break | 36 | 25 (69 %) | 195 | 77 % | 1.59 | 170.83 |
| Signals | signal:bollinger | 40 | 2 (5 %) | 210 | 64 % | 0.56 | -401.86 |
| Signals | signal:cci | 39 | 2 (5 %) | 244 | 66 % | 0.53 | -438.05 |
| Signals | signal:cmf | 38 | 9 (24 %) | 145 | 49 % | 0.22 | -590.04 |
| Signals | signal:donchian | 24 | 8 (33 %) | 98 | 67 % | 0.66 | -93.52 |
| Signals | signal:ema-cross | 20 | 20 (100 %) | 40 | 98 % | 1098.05 | 117.56 |
| Signals | signal:ema-cross-fast | 40 | 30 (75 %) | 179 | 87 % | 2.00 | 181.32 |
| Signals | signal:ema-pullback | 34 | 9 (26 %) | 227 | 70 % | 0.46 | -318.53 |
| Signals | signal:ema-slope | 33 | 11 (33 %) | 99 | 72 % | 0.54 | -134.54 |
| Signals | signal:ema-trend | 38 | 12 (32 %) | 260 | 69 % | 0.57 | -308.70 |
| Signals | signal:heikin-ashi | 34 | 2 (6 %) | 245 | 59 % | 0.32 | -653.30 |
| Signals | signal:hma | 36 | 15 (42 %) | 180 | 61 % | 0.66 | -161.07 |
| Signals | signal:ichimoku | 23 | 8 (35 %) | 110 | 67 % | 0.77 | -62.68 |
| Signals | signal:impulse | 36 | 5 (14 %) | 162 | 50 % | 0.26 | -514.68 |
| Signals | signal:kama | 37 | 11 (30 %) | 267 | 70 % | 0.62 | -242.06 |
| Signals | signal:keltner | 33 | 16 (48 %) | 73 | 60 % | 0.81 | -36.91 |
| Signals | signal:macd-cross | 36 | 7 (19 %) | 174 | 64 % | 0.45 | -332.91 |
| Signals | signal:macd-hist | 39 | 18 (46 %) | 252 | 74 % | 0.82 | -100.57 |
| Signals | signal:macd-slow | 38 | 7 (18 %) | 177 | 61 % | 0.37 | -466.79 |
| Signals | signal:mfi | 19 | 19 (100 %) | 43 | 98 % | 1048.19 | 79.79 |
| Signals | signal:obv | 37 | 31 (84 %) | 228 | 83 % | 1.85 | 243.42 |
| Signals | signal:r-awesome | 36 | 10 (28 %) | 152 | 53 % | 0.29 | -454.18 |
| Signals | signal:r-connors | 27 | 12 (44 %) | 107 | 64 % | 0.38 | -248.72 |
| Signals | signal:r-fractal | 25 | 5 (20 %) | 51 | 27 % | 0.03 | -250.44 |
| Signals | signal:r-inside | 7 | 0 (0 %) | 10 | 30 % | 0.11 | -61.19 |
| Signals | signal:r-linreg | 40 | 14 (35 %) | 244 | 68 % | 0.59 | -264.69 |
| Signals | signal:r-nr-break | 32 | 9 (28 %) | 145 | 51 % | 0.32 | -404.49 |
| Signals | signal:r-session-trend | 40 | 12 (30 %) | 179 | 64 % | 0.52 | -303.09 |
| Signals | signal:r-vol-regime | 35 | 34 (97 %) | 49 | 92 % | 263.48 | 175.67 |
| Signals | signal:reclaim | 40 | 14 (35 %) | 283 | 72 % | 0.70 | -215.62 |
| Signals | signal:rsi-mid | 35 | 10 (29 %) | 185 | 51 % | 0.29 | -413.57 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 29 | 17 (59 %) | 38 | 66 % | 0.40 | -84.79 |
| Signals | signal:s2-active-hf | 36 | 22 (61 %) | 253 | 76 % | 1.02 | 8.77 |
| Signals | signal:s2-adx-gate | 40 | 22 (55 %) | 234 | 76 % | 0.98 | -10.21 |
| Signals | signal:s2-atr-break | 37 | 6 (16 %) | 149 | 46 % | 0.17 | -606.83 |
| Signals | signal:s2-bb-bounce | 40 | 28 (70 %) | 178 | 77 % | 1.52 | 171.29 |
| Signals | signal:s2-block-scale | 37 | 11 (30 %) | 264 | 68 % | 0.48 | -399.16 |
| Signals | signal:s2-block-stack | 34 | 10 (29 %) | 169 | 67 % | 0.68 | -167.48 |
| Signals | signal:s2-confluence | 38 | 17 (45 %) | 309 | 72 % | 0.99 | -2.71 |
| Signals | signal:s2-ema-cross | 22 | 21 (95 %) | 22 | 95 % | 155.38 | 33.47 |
| Signals | signal:s2-range-break | 28 | 22 (79 %) | 32 | 81 % | 1.92 | 40.27 |
| Signals | signal:s2-range-shift | 38 | 9 (24 %) | 115 | 50 % | 0.36 | -330.89 |
| Signals | signal:s2-rsi-revert | 32 | 24 (75 %) | 58 | 76 % | 1.04 | 4.89 |
| Signals | signal:s2-st-trail | 26 | 20 (77 %) | 26 | 77 % | 1.03 | 1.10 |
| Signals | signal:s2-stoch-swing | 40 | 28 (70 %) | 282 | 85 % | 2.46 | 432.23 |
| Signals | signal:s2-vol-break | 34 | 21 (62 %) | 65 | 78 % | 1.02 | 2.18 |
| Signals | signal:sar | 38 | 12 (32 %) | 226 | 67 % | 0.60 | -250.51 |
| Signals | signal:squeeze | 29 | 9 (31 %) | 29 | 31 % | 0.02 | -239.24 |
| Signals | signal:st-slow | 25 | 15 (60 %) | 30 | 63 % | 0.61 | -27.44 |
| Signals | signal:stoch-rsi | 40 | 20 (50 %) | 341 | 71 % | 0.82 | -108.71 |
| Signals | signal:supertrend | 31 | 21 (68 %) | 91 | 73 % | 0.61 | -80.37 |
| Signals | signal:swing | 38 | 3 (8 %) | 245 | 52 % | 0.21 | -837.17 |
| Signals | signal:thrust | 38 | 6 (16 %) | 273 | 59 % | 0.35 | -687.47 |
| Signals | signal:trix | 40 | 16 (40 %) | 108 | 68 % | 0.73 | -92.74 |
| Signals | signal:volume-break | 35 | 34 (97 %) | 55 | 96 % | 532.75 | 217.40 |
| Signals | signal:vwap | 40 | 23 (57 %) | 216 | 76 % | 1.21 | 71.70 |
| Signals | signal:williams-r | 40 | 11 (28 %) | 195 | 62 % | 0.53 | -336.03 |
| Signals | signal:zscore | 40 | 0 (0 %) | 161 | 56 % | 0.36 | -540.87 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 719 | 263 (37 %) | 3815 | 69 % | 0.56 | -4765.08 |
| Signals | 1.25 | 440 | 142 (32 %) | 2500 | 68 % | 0.51 | -3519.43 |
| Signals | 1.35 | 321 | 99 (31 %) | 1904 | 69 % | 0.51 | -2631.60 |
| Signals | 1.5 | 213 | 65 (31 %) | 1366 | 70 % | 0.49 | -1832.48 |
| Signals | 1.75 | 99 | 22 (22 %) | 746 | 70 % | 0.52 | -865.35 |
| Signals | 2 | 61 | 13 (21 %) | 474 | 70 % | 0.49 | -574.02 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-s@m15 | 20 | 13 (65 %) | 159 | 82 % | 2.05 | 217.90 | tp5 sl15 tr2 h192 (9 · ∞ (no loss) · 29.65) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 20 | 15 (75 %) | 123 | 90 % | 3.40 | 214.33 | tp5 sl15 tr2 h192 (9 · 117.91 · 20.45) |
| Signals | follow | sig-obv-m@m15 | 20 | 20 (100 %) | 97 | 88 % | 4.80 | 202.08 | tp4 sl12 tr1.6 h192 (10 · 79.10 · 20.91) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 20 | 20 (100 %) | 61 | 100 % | ∞ (no loss) | 191.85 | tp3 sl9 tr1.2 h192 (5 · ∞ (no loss) · 6.57) |
| Signals | follow | sig-volume-break-m@m15 | 20 | 20 (100 %) | 40 | 98 % | 2341.50 | 184.65 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 20 | 17 (85 %) | 83 | 82 % | 2.71 | 168.41 | tp4 sl12 tr0 h192 (5 · 1.25 · 3.00) |
| Signals | follow | sig-ema-cross-s@m15 | 20 | 20 (100 %) | 40 | 98 % | 1098.05 | 117.56 | tp3 sl9 tr1.2 h192 (5 · 63.71 · 6.72) |
| Signals | follow | sig-vwap-m@m15 | 20 | 14 (70 %) | 77 | 81 % | 2.28 | 108.63 | tp5 sl15 tr2 h192 (5 · 203.66 · 11.25) |
| Signals | follow | sig-r-vol-regime-s@m15 | 18 | 18 (100 %) | 28 | 89 % | 221.34 | 107.91 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 20 | 12 (60 %) | 185 | 76 % | 1.39 | 100.97 | tp5 sl15 tr3 h192 (7 · 130.47 · 19.86) |
| Signals | follow | sig-trix-s@m15 | 20 | 16 (80 %) | 53 | 74 % | 3.68 | 98.68 | tp3 sl9 tr1.2 h192 (7 · 9.66 · 5.02) |
| Signals | follow | sig-atr-break-m@m15 | 16 | 13 (81 %) | 70 | 79 % | 2.75 | 93.22 | tp3 sl9 tr1.8 h192 (6 · 70.00 · 13.80) |
| Signals | follow | sig-act-burst-s@m15 | 20 | 11 (55 %) | 125 | 79 % | 1.36 | 84.95 | tp5 sl15 tr0 h192 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-mfi-m@m15 | 19 | 19 (100 %) | 43 | 98 % | 1048.19 | 79.79 | – |
| Signals | follow | sig-atr-break-s@m15 | 20 | 12 (60 %) | 125 | 77 % | 1.33 | 77.61 | tp6 sl18 tr2.4 h192 (5 · ∞ (no loss) · 24.61) |
| Signals | follow | sig-r-vol-regime-m@m15 | 17 | 16 (94 %) | 21 | 95 % | 378.41 | 67.76 | – |
| Signals | follow | sig-act-burst-m@m15 | 18 | 15 (83 %) | 55 | 80 % | 2.35 | 60.18 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 12 | 11 (92 %) | 12 | 92 % | 81.32 | 46.72 | – |
| Signals | follow | sig-obv-s@m15 | 17 | 11 (65 %) | 131 | 79 % | 1.18 | 41.35 | tp4 sl12 tr1.6 h192 (14 · 2.26 · 15.40) |
| Signals | follow | sig-s2-vol-break-m@m15 | 16 | 15 (94 %) | 16 | 94 % | 123.91 | 40.55 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 17 | 16 (94 %) | 18 | 94 % | 6.24 | 40.37 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 17 | 16 (94 %) | 18 | 94 % | 6.24 | 40.37 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 20 | 14 (70 %) | 159 | 79 % | 1.16 | 40.13 | tp6 sl18 tr2.4 h192 (8 · ∞ (no loss) · 13.04) |
| Signals | follow | sig-hma-m@m15 | 20 | 13 (65 %) | 102 | 66 % | 1.20 | 33.52 | tp5 sl15 tr2 h192 (5 · 15.47 · 6.84) |
| Signals | follow | sig-rsi-momentum-s@m15 | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 | – |
| Signals | follow | sig-volume-break-s@m15 | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 | – |
| Signals | follow | sig-adx-s@m15 | 20 | 10 (50 %) | 105 | 75 % | 1.10 | 20.91 | tp6 sl18 tr2.4 h192 (5 · 144.54 · 14.51) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 17.34 | – |
| Signals | follow | sig-s2-ema-cross-s@m15 | 10 | 9 (90 %) | 10 | 90 % | 75.38 | 16.13 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 13 | 13 (100 %) | 13 | 100 % | ∞ (no loss) | 10.53 | – |
| Signals | follow | sig-supertrend-m@m15 | 13 | 13 (100 %) | 13 | 100 % | ∞ (no loss) | 10.53 | – |
| Signals | follow | sig-macd-hist-m@m15 | 19 | 12 (63 %) | 141 | 78 % | 1.04 | 9.59 | tp3 sl9 tr0 h192 (11 · 3.04 · 18.80) |
| Signals | follow | sig-r-connors-s@m15 | 9 | 7 (78 %) | 14 | 86 % | 1.40 | 7.39 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 18 | 11 (61 %) | 128 | 77 % | 1.03 | 6.46 | tp3 sl9 tr2.4 h192 (12 · 2.98 · 18.60) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 20 | 11 (55 %) | 95 | 73 % | 1.01 | 2.88 | tp5 sl15 tr2 h192 (5 · ∞ (no loss) · 12.95) |
| Signals | follow | sig-donchian-m@m15 | 5 | 3 (60 %) | 7 | 57 % | 1.28 | 2.37 | – |
| Signals | follow | sig-s2-active-hf-m@m15 | 18 | 11 (61 %) | 125 | 76 % | 1.01 | 2.31 | tp3 sl9 tr2.4 h192 (11 · 2.68 · 15.80) |
| Signals | follow | sig-keltner-s@m15 | 18 | 10 (56 %) | 48 | 60 % | 0.94 | -5.93 | tp3 sl9 tr1.2 h192 (5 · 5.83 · 2.32) |
| Signals | follow | sig-s2-range-break-m@m15 | 16 | 11 (69 %) | 20 | 75 % | 0.85 | -6.45 | – |
| Signals | follow | sig-williams-r-s@m15 | 20 | 11 (55 %) | 87 | 66 % | 0.95 | -8.38 | tp5 sl15 tr2 h192 (5 · 51.71 · 15.66) |
| Signals | follow | sig-st-slow-s@m15 | 13 | 7 (54 %) | 13 | 54 % | 0.73 | -9.44 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 13 | 7 (54 %) | 13 | 54 % | 0.73 | -9.44 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 20 | 10 (50 %) | 118 | 80 % | 0.94 | -10.54 | tp6 sl18 tr2.4 h192 (6 · ∞ (no loss) · 6.92) |
| Signals | follow | sig-st-slow-m@m15 | 12 | 8 (67 %) | 17 | 71 % | 0.49 | -18.01 | – |
| Signals | follow | sig-stoch-rsi-m@m15 | 20 | 10 (50 %) | 150 | 73 % | 0.92 | -20.31 | tp5 sl15 tr3 h192 (5 · ∞ (no loss) · 11.37) |
| Signals | follow | sig-keltner-m@m15 | 15 | 6 (40 %) | 25 | 60 % | 0.67 | -30.98 | – |
| Signals | follow | sig-act-hf-s@m15 | 20 | 11 (55 %) | 131 | 69 % | 0.88 | -32.21 | tp4 sl12 tr2.4 h192 (6 · 77.81 · 15.36) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 15 | 8 (53 %) | 40 | 68 % | 0.66 | -35.48 | tp3 sl9 tr1.2 h192 (5 · 0.22 · -7.52) |
| Signals | follow | sig-vwap-s@m15 | 20 | 9 (45 %) | 139 | 73 % | 0.86 | -36.93 | tp5 sl15 tr2 h192 (9 · 79.42 · 9.78) |
| Signals | follow | sig-s2-vol-break-s@m15 | 18 | 6 (33 %) | 49 | 73 % | 0.72 | -38.38 | – |
| Signals | follow | sig-squeeze-m@m15 | 12 | 8 (67 %) | 12 | 67 % | 0.12 | -42.96 | – |
| Signals | follow | sig-s2-adx-gate-m@m15 | 20 | 8 (40 %) | 75 | 71 % | 0.75 | -50.33 | tp4 sl12 tr1.6 h192 (6 · 0.51 · -6.08) |
| Signals | follow | sig-ema-trend-m@m15 | 20 | 7 (35 %) | 116 | 75 % | 0.81 | -54.06 | tp6 sl18 tr2.4 h192 (6 · ∞ (no loss) · 8.67) |
| Signals | follow | sig-ema-slope-s@m15 | 15 | 6 (40 %) | 53 | 72 % | 0.57 | -60.01 | tp4 sl12 tr1.6 h192 (6 · 0.54 · -5.65) |
| Signals | follow | sig-r-inside-s@m15 | 7 | 0 (0 %) | 10 | 30 % | 0.11 | -61.19 | – |
| Signals | follow | sig-s2-range-shift-s@m15 | 18 | 6 (33 %) | 61 | 56 % | 0.61 | -61.26 | tp3 sl9 tr2.4 h192 (7 · 0.91 · -0.87) |
| Signals | follow | sig-ichimoku-s@m15 | 20 | 7 (35 %) | 106 | 68 % | 0.77 | -62.40 | tp4 sl12 tr0 h192 (5 · 1.25 · 3.00) |
| Signals | follow | sig-reclaim-s@m15 | 20 | 7 (35 %) | 164 | 76 % | 0.81 | -63.80 | tp6 sl18 tr2.4 h192 (8 · ∞ (no loss) · 7.84) |
| Signals | follow | sig-sar-s@m15 | 20 | 8 (40 %) | 114 | 73 % | 0.75 | -64.40 | tp4 sl12 tr3.2 h192 (5 · 0.67 · -4.00) |
| Signals | follow | sig-s2-block-stack-m@m15 | 14 | 3 (21 %) | 61 | 67 % | 0.61 | -70.65 | tp3 sl9 tr1.8 h192 (6 · 1.24 · 2.16) |
| Signals | follow | sig-ema-slope-m@m15 | 18 | 5 (28 %) | 46 | 72 % | 0.52 | -74.52 | – |
| Signals | follow | sig-r-session-trend-m@m15 | 20 | 8 (40 %) | 88 | 68 % | 0.65 | -86.96 | tp3 sl9 tr0 h192 (7 · 0.76 · -4.40) |
| Signals | follow | sig-stoch-rsi-s@m15 | 20 | 10 (50 %) | 191 | 69 % | 0.76 | -88.40 | tp6 sl18 tr2.4 h192 (12 · 2.56 · 9.33) |
| Signals | follow | sig-supertrend-s@m15 | 18 | 8 (44 %) | 78 | 68 % | 0.56 | -90.90 | tp2.5 sl7.5 tr0 h192 (6 · 1.49 · 3.80) |
| Signals | follow | sig-r-linreg-s@m15 | 20 | 7 (35 %) | 142 | 70 % | 0.69 | -95.72 | tp8 sl24 tr3.2 h192 (5 · 8.55 · 5.09) |
| Signals | follow | sig-donchian-s@m15 | 19 | 5 (26 %) | 91 | 68 % | 0.64 | -95.89 | tp4 sl12 tr2.4 h192 (5 · 1.02 · 0.25) |
| Signals | follow | sig-s2-block-stack-s@m15 | 20 | 7 (35 %) | 108 | 68 % | 0.72 | -96.82 | tp5 sl15 tr0 h192 (5 · 1.26 · 4.00) |
| Signals | follow | sig-r-fractal-m@m15 | 11 | 3 (27 %) | 16 | 31 % | 0.01 | -97.83 | – |
| Signals | follow | sig-s2-confluence-s@m15 | 18 | 5 (28 %) | 124 | 66 % | 0.59 | -103.68 | tp4 sl12 tr1.6 h192 (14 · 0.86 · -1.83) |
| Signals | follow | sig-macd-cross-s@m15 | 20 | 6 (30 %) | 111 | 69 % | 0.67 | -110.16 | tp2.5 sl7.5 tr0 h192 (13 · 1.00 · -0.10) |
| Signals | follow | sig-macd-hist-s@m15 | 20 | 6 (30 %) | 111 | 69 % | 0.67 | -110.16 | tp2.5 sl7.5 tr0 h192 (13 · 1.00 · -0.10) |
| Signals | follow | sig-kama-m@m15 | 20 | 7 (35 %) | 162 | 72 % | 0.68 | -120.40 | tp6 sl18 tr2.4 h192 (5 · ∞ (no loss) · 10.96) |
| Signals | follow | sig-kama-s@m15 | 17 | 4 (24 %) | 105 | 66 % | 0.51 | -121.66 | tp5 sl15 tr2 h192 (5 · ∞ (no loss) · 7.73) |
| Signals | follow | sig-bollinger-m@m15 | 20 | 2 (10 %) | 91 | 70 % | 0.67 | -122.36 | tp3 sl9 tr1.2 h192 (6 · 1.07 · 0.62) |
| Signals | follow | sig-ema-pullback-s@m15 | 19 | 6 (32 %) | 147 | 73 % | 0.62 | -122.51 | tp6 sl18 tr2.4 h192 (7 · ∞ (no loss) · 13.56) |
| Signals | follow | sig-rsi-reversal-s@m15 | 12 | 1 (8 %) | 20 | 40 % | 0.06 | -125.16 | – |
| Signals | follow | sig-adx-m@m15 | 10 | 0 (0 %) | 28 | 36 % | 0.03 | -136.18 | tp3 sl9 tr1.2 h192 (7 · 0.14 · -17.88) |
| Signals | follow | sig-s2-block-scale-m@m15 | 18 | 7 (39 %) | 124 | 69 % | 0.56 | -146.36 | tp6 sl18 tr2.4 h192 (6 · 67.70 · 9.27) |
| Signals | follow | sig-reclaim-m@m15 | 20 | 7 (35 %) | 119 | 67 % | 0.60 | -151.82 | tp6 sl18 tr2.4 h192 (5 · ∞ (no loss) · 8.06) |
| Signals | follow | sig-r-fractal-s@m15 | 14 | 2 (14 %) | 35 | 26 % | 0.04 | -152.61 | tp3 sl9 tr1.2 h192 (8 · 1.95 · 0.70) |
| Signals | follow | sig-r-nr-break-m@m15 | 16 | 4 (25 %) | 63 | 51 % | 0.38 | -162.78 | tp4 sl12 tr1.6 h192 (6 · 21.93 · 7.63) |
| Signals | follow | sig-r-linreg-m@m15 | 20 | 7 (35 %) | 102 | 66 % | 0.51 | -168.98 | tp5 sl15 tr2 h192 (7 · 0.60 · -6.17) |
| Signals | follow | sig-act-hf-m@m15 | 16 | 3 (19 %) | 81 | 54 % | 0.34 | -182.62 | tp3 sl9 tr1.2 h192 (19 · 0.45 · -15.95) |
| Signals | follow | sig-macd-slow-s@m15 | 20 | 5 (25 %) | 103 | 66 % | 0.49 | -185.18 | tp3 sl9 tr1.8 h192 (9 · 0.80 · -3.75) |
| Signals | follow | sig-sar-m@m15 | 18 | 4 (22 %) | 112 | 62 % | 0.50 | -186.10 | tp5 sl15 tr3 h192 (5 · 0.75 · -3.74) |
| Signals | follow | sig-cci-m@m15 | 20 | 0 (0 %) | 111 | 64 % | 0.59 | -190.70 | tp6 sl18 tr2.4 h192 (6 · 0.87 · -2.43) |
| Signals | follow | sig-trix-m@m15 | 20 | 0 (0 %) | 55 | 62 % | 0.38 | -191.43 | – |
| Signals | follow | sig-rsi-mid-s@m15 | 18 | 6 (33 %) | 95 | 59 % | 0.31 | -193.48 | tp5 sl15 tr2 h192 (7 · 21.63 · 4.13) |
| Signals | follow | sig-hma-s@m15 | 16 | 2 (13 %) | 78 | 55 % | 0.37 | -194.59 | tp4 sl12 tr1.6 h192 (7 · 0.77 · -2.86) |
| Signals | follow | sig-r-awesome-s@m15 | 16 | 4 (25 %) | 47 | 45 % | 0.20 | -194.90 | tp3 sl9 tr1.2 h192 (8 · 0.15 · -16.14) |
| Signals | follow | sig-ema-pullback-m@m15 | 15 | 3 (20 %) | 80 | 64 % | 0.27 | -196.02 | tp3 sl9 tr1.2 h192 (12 · 0.58 · -8.49) |
| Signals | follow | sig-squeeze-s@m15 | 17 | 1 (6 %) | 17 | 6 % | 0.00 | -196.28 | – |
| Signals | follow | sig-r-session-trend-s@m15 | 20 | 4 (20 %) | 91 | 60 % | 0.43 | -216.14 | tp4 sl12 tr2.4 h192 (5 · 0.75 · -3.01) |
| Signals | follow | sig-rsi-mid-m@m15 | 17 | 4 (24 %) | 90 | 43 % | 0.28 | -220.09 | tp4 sl12 tr2.4 h192 (6 · 0.73 · -3.36) |
| Signals | follow | sig-macd-cross-m@m15 | 16 | 1 (6 %) | 63 | 54 % | 0.19 | -222.76 | tp3 sl9 tr0 h192 (6 · 0.61 · -7.20) |
| Signals | follow | sig-swing-s@m15 | 18 | 3 (17 %) | 96 | 57 % | 0.30 | -229.70 | tp2.5 sl7.5 tr0 h192 (10 · 1.19 · 3.00) |
| Signals | follow | sig-r-nr-break-s@m15 | 16 | 5 (31 %) | 82 | 51 % | 0.28 | -241.71 | tp4 sl12 tr1.6 h192 (8 · 0.61 · -4.86) |
| Signals | follow | sig-heikin-ashi-m@m15 | 17 | 2 (12 %) | 93 | 57 % | 0.30 | -245.23 | tp3 sl9 tr0 h192 (9 · 0.61 · -10.80) |
| Signals | follow | sig-cci-s@m15 | 19 | 2 (11 %) | 133 | 67 % | 0.47 | -247.35 | tp6 sl18 tr2.4 h192 (6 · 0.78 · -4.00) |
| Signals | follow | sig-s2-atr-break-s@m15 | 18 | 2 (11 %) | 60 | 43 % | 0.14 | -250.31 | tp4 sl12 tr1.6 h192 (5 · 2.69 · 0.61) |
| Signals | follow | sig-s2-block-scale-s@m15 | 19 | 4 (21 %) | 140 | 66 % | 0.42 | -252.79 | tp6 sl18 tr2.4 h192 (6 · 38.92 · 5.27) |
| Signals | follow | sig-ema-trend-s@m15 | 18 | 5 (28 %) | 144 | 65 % | 0.41 | -254.65 | tp6 sl18 tr2.4 h192 (5 · ∞ (no loss) · 6.57) |
| Signals | follow | sig-r-connors-m@m15 | 18 | 5 (28 %) | 93 | 61 % | 0.34 | -256.10 | tp3 sl9 tr0 h192 (6 · 0.30 · -19.20) |
| Signals | follow | sig-impulse-s@m15 | 19 | 4 (21 %) | 112 | 58 % | 0.37 | -256.74 | tp2.5 sl7.5 tr0 h192 (10 · 1.19 · 3.00) |
| Signals | follow | sig-impulse-m@m15 | 17 | 1 (6 %) | 50 | 32 % | 0.12 | -257.94 | tp3 sl9 tr1.8 h192 (7 · 0.31 · -12.89) |
| Signals | follow | sig-r-awesome-m@m15 | 20 | 6 (30 %) | 105 | 57 % | 0.35 | -259.28 | tp4 sl12 tr2.4 h192 (6 · 0.47 · -12.91) |
| Signals | follow | sig-zscore-m@m15 | 20 | 0 (0 %) | 42 | 45 % | 0.15 | -261.37 | – |
| Signals | follow | sig-thrust-m@m15 | 18 | 3 (17 %) | 150 | 69 % | 0.41 | -262.00 | tp2.5 sl7.5 tr0 h192 (14 · 1.10 · 2.20) |
| Signals | follow | sig-s2-range-shift-m@m15 | 20 | 3 (15 %) | 54 | 44 % | 0.25 | -269.64 | tp3 sl9 tr1.2 h192 (5 · 0.30 · -12.89) |
| Signals | follow | sig-cmf-s@m15 | 18 | 3 (17 %) | 79 | 54 % | 0.25 | -269.84 | tp3 sl9 tr1.8 h192 (10 · 0.79 · -3.85) |
| Signals | follow | sig-bollinger-s@m15 | 20 | 0 (0 %) | 119 | 60 % | 0.49 | -279.50 | tp6 sl18 tr2.4 h192 (5 · 0.93 · -1.32) |
| Signals | follow | sig-zscore-s@m15 | 20 | 0 (0 %) | 119 | 60 % | 0.49 | -279.50 | tp6 sl18 tr2.4 h192 (5 · 0.93 · -1.32) |
| Signals | follow | sig-macd-slow-m@m15 | 18 | 2 (11 %) | 74 | 54 % | 0.24 | -281.61 | tp3 sl9 tr1.2 h192 (7 · 7.31 · 5.60) |
| Signals | follow | sig-cmf-m@m15 | 20 | 6 (30 %) | 66 | 42 % | 0.20 | -320.20 | tp3 sl9 tr1.2 h192 (7 · 0.28 · -8.09) |
| Signals | follow | sig-williams-r-m@m15 | 20 | 0 (0 %) | 108 | 59 % | 0.38 | -327.65 | tp6 sl18 tr2.4 h192 (5 · 0.84 · -2.85) |
| Signals | follow | sig-s2-atr-break-m@m15 | 19 | 4 (21 %) | 89 | 47 % | 0.19 | -356.52 | tp4 sl12 tr1.6 h192 (6 · 0.37 · -7.89) |
| Signals | follow | sig-heikin-ashi-s@m15 | 17 | 0 (0 %) | 152 | 61 % | 0.32 | -408.07 | tp2.5 sl7.5 tr0 h192 (18 · 0.78 · -8.60) |
| Signals | follow | sig-thrust-s@m15 | 20 | 3 (15 %) | 123 | 47 % | 0.32 | -425.47 | tp5 sl15 tr3 h192 (6 · 0.52 · -14.54) |
| Signals | follow | sig-swing-m@m15 | 20 | 0 (0 %) | 149 | 48 % | 0.18 | -607.47 | tp5 sl15 tr2 h192 (10 · 0.17 · -25.62) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 99 | 90 (91 %) | 249 | 94 % | 2.75 | 383.74 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 72 | 63 (88 %) | 116 | 91 % | 2.83 | 356.15 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 56 | 48 (86 %) | 86 | 88 % | 2.83 | 355.72 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 99 | 75 (76 %) | 219 | 86 % | 1.26 | 115.36 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 84 | 59 (70 %) | 155 | 81 % | 1.16 | 82.53 |
| Signals | tp 6.000% | sl 3.00× | tr off | 75 | 49 (65 %) | 124 | 76 % | 1.00 | -0.80 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 114 | 69 (61 %) | 414 | 82 % | 0.83 | -158.97 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 117 | 47 (40 %) | 603 | 73 % | 0.63 | -492.64 |
| Signals | tp 5.000% | sl 3.00× | tr off | 99 | 32 (32 %) | 251 | 63 % | 0.53 | -675.20 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 115 | 45 (39 %) | 415 | 73 % | 0.53 | -698.85 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 107 | 34 (32 %) | 310 | 64 % | 0.51 | -741.08 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 118 | 40 (34 %) | 823 | 68 % | 0.52 | -828.29 |
| Signals | tp 2.500% | sl 3.00× | tr off | 119 | 37 (31 %) | 910 | 67 % | 0.62 | -867.00 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 117 | 38 (32 %) | 571 | 69 % | 0.51 | -874.44 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 114 | 30 (26 %) | 461 | 66 % | 0.48 | -952.23 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 120 | 31 (26 %) | 1272 | 58 % | 0.51 | -1019.47 |
| Signals | tp 4.000% | sl 3.00× | tr off | 108 | 23 (21 %) | 398 | 60 % | 0.46 | -1063.60 |
| Signals | tp 3.000% | sl 3.00× | tr off | 119 | 31 (26 %) | 656 | 63 % | 0.51 | -1091.20 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 120 | 29 (24 %) | 943 | 63 % | 0.51 | -1129.26 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 119 | 29 (24 %) | 741 | 61 % | 0.49 | -1175.57 |

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
