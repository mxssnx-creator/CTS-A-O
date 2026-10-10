# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1324/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 328/19072 · PF 1.60 · Micro 257/5900 · PF 2.43 · Short 630/8176 · PF 1.51 · General 511/8176 · PF 1.52 · Long 535/8176 · PF 1.55 · Signals 126/126 · PF 1.11; Main 1198 pairs, 235132 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 279 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1198 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (235132 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3193); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 23066 · 0.75 | 6097 · 0.80 | 7412 · 1.00 | 1143 · 0.57 | – | – | – | – | – |
| 13:00 | 39740 · 0.44 | 7111 · 0.69 | 12849 · 0.68 | 776 · 4.46 | – | – | – | – | – |
| 14:00 | 28902 · 1.97 | 7548 · 2.05 | 9941 · 2.12 | 1891 · 9.62 | – | – | – | – | – |
| 15:00 | 31965 · 1.29 | 7682 · 0.96 | 10901 · 1.41 | 2778 · 0.59 | – | – | – | – | – |
| 16:00 | 24165 · 1.21 | 4654 · 1.06 | 8820 · 1.57 | 761 · 1.74 | – | – | – | – | – |
| 17:00 | 17918 · 1.55 | 3948 · 1.12 | 6290 · 1.33 | 1112 · 1.59 | – | – | – | – | – |
| 18:00 | 17304 · 1.79 | 2844 · 2.60 | 4321 · 2.22 | 575 · 0.98 | – | – | – | – | – |
| 19:00 | 19254 · 1.01 | 5135 · 1.48 | 5835 · 1.10 | 940 · 1.67 | – | – | – | – | – |
| 20:00 | 30097 · 0.71 | 8324 · 1.13 | 5958 · 0.66 | 741 · 0.25 | – | – | – | – | – |
| 21:00 | 41741 · 0.59 | 12131 · 0.81 | 12584 · 0.57 | 2183 · 0.91 | – | – | – | – | – |
| 22:00 | 44146 · 0.38 | 11928 · 0.39 | 16660 · 0.39 | 2425 · 0.11 | – | – | – | – | – |
| 23:00 | 30044 · 0.40 | 6013 · 0.49 | 7386 · 0.29 | 1150 · 0.15 | – | – | – | – | – |
| **total** | **348342 · 0.78** | **83415 · 0.86** | **108957 · 0.77** | **16475 · 0.58** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 38775 | sig:confirm 38775 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 231352 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2278 units active at the run start, 3037 over the run, 3193 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1640 | 383 (23 %) | 9237 | 54 % | 0.53 | -14063.65 |
| Signals | trailing | 1553 | 740 (48 %) | 7238 | 68 % | 0.65 | -6380.92 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 58 | 46 (79 %) | 301 | 81 % | 2.00 | 370.76 |
| Signals | signal:act-hf | 55 | 16 (29 %) | 389 | 57 % | 0.56 | -492.27 |
| Signals | signal:adx | 58 | 18 (31 %) | 248 | 59 % | 0.51 | -384.54 |
| Signals | signal:atr-break | 56 | 41 (73 %) | 325 | 74 % | 1.53 | 278.69 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 366 | 56 % | 0.52 | -698.23 |
| Signals | signal:cci | 59 | 2 (3 %) | 456 | 59 % | 0.51 | -789.04 |
| Signals | signal:cmf | 54 | 5 (9 %) | 270 | 45 % | 0.25 | -883.76 |
| Signals | signal:donchian | 41 | 11 (27 %) | 157 | 58 % | 0.57 | -206.33 |
| Signals | signal:ema-cross | 47 | 39 (83 %) | 113 | 87 % | 5.10 | 238.86 |
| Signals | signal:ema-cross-fast | 59 | 47 (80 %) | 301 | 79 % | 1.67 | 267.69 |
| Signals | signal:ema-pullback | 59 | 18 (31 %) | 390 | 67 % | 0.66 | -314.79 |
| Signals | signal:ema-slope | 52 | 14 (27 %) | 181 | 65 % | 0.56 | -220.57 |
| Signals | signal:ema-trend | 59 | 19 (32 %) | 400 | 65 % | 0.63 | -393.89 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 464 | 56 % | 0.45 | -875.07 |
| Signals | signal:hma | 54 | 13 (24 %) | 332 | 55 % | 0.53 | -467.74 |
| Signals | signal:ichimoku | 46 | 18 (39 %) | 170 | 62 % | 0.62 | -175.44 |
| Signals | signal:impulse | 56 | 4 (7 %) | 279 | 39 % | 0.22 | -999.97 |
| Signals | signal:kama | 56 | 12 (21 %) | 489 | 62 % | 0.54 | -613.17 |
| Signals | signal:keltner | 47 | 19 (40 %) | 108 | 55 % | 0.74 | -76.13 |
| Signals | signal:macd-cross | 57 | 7 (12 %) | 317 | 56 % | 0.42 | -677.54 |
| Signals | signal:macd-hist | 59 | 19 (32 %) | 443 | 65 % | 0.68 | -380.61 |
| Signals | signal:macd-slow | 57 | 8 (14 %) | 331 | 58 % | 0.46 | -634.27 |
| Signals | signal:mfi | 30 | 29 (97 %) | 61 | 93 % | 8.74 | 128.08 |
| Signals | signal:obv | 60 | 47 (78 %) | 422 | 77 % | 1.62 | 374.00 |
| Signals | signal:r-awesome | 56 | 12 (21 %) | 255 | 47 % | 0.33 | -619.86 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 116 | 64 % | 0.51 | -186.50 |
| Signals | signal:r-fractal | 37 | 4 (11 %) | 75 | 16 % | 0.04 | -393.58 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -120.60 |
| Signals | signal:r-linreg | 60 | 14 (23 %) | 426 | 58 % | 0.49 | -655.59 |
| Signals | signal:r-nr-break | 46 | 2 (4 %) | 222 | 36 % | 0.21 | -868.66 |
| Signals | signal:r-session-trend | 60 | 14 (23 %) | 360 | 54 % | 0.44 | -745.59 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 70 | 86 % | 6.40 | 206.24 |
| Signals | signal:reclaim | 60 | 16 (27 %) | 480 | 65 % | 0.63 | -484.63 |
| Signals | signal:rsi-mid | 55 | 10 (18 %) | 296 | 44 % | 0.25 | -816.78 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 29 | 8 (28 %) | 32 | 31 % | 0.08 | -149.56 |
| Signals | signal:s2-active-hf | 54 | 25 (46 %) | 453 | 68 % | 1.00 | 1.14 |
| Signals | signal:s2-adx-gate | 58 | 24 (41 %) | 345 | 69 % | 0.76 | -194.34 |
| Signals | signal:s2-atr-break | 56 | 5 (9 %) | 256 | 38 % | 0.21 | -922.16 |
| Signals | signal:s2-bb-bounce | 60 | 32 (53 %) | 281 | 58 % | 0.70 | -241.27 |
| Signals | signal:s2-block-scale | 58 | 16 (28 %) | 430 | 62 % | 0.54 | -531.98 |
| Signals | signal:s2-block-stack | 54 | 15 (28 %) | 299 | 63 % | 0.64 | -327.36 |
| Signals | signal:s2-confluence | 59 | 15 (25 %) | 506 | 63 % | 0.67 | -389.22 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 |
| Signals | signal:s2-range-break | 45 | 33 (73 %) | 62 | 81 % | 1.60 | 58.77 |
| Signals | signal:s2-range-shift | 52 | 12 (23 %) | 155 | 40 % | 0.26 | -529.38 |
| Signals | signal:s2-rsi-revert | 52 | 27 (52 %) | 108 | 56 % | 0.54 | -148.36 |
| Signals | signal:s2-st-trail | 39 | 22 (56 %) | 45 | 56 % | 0.45 | -62.95 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 487 | 78 % | 1.89 | 597.05 |
| Signals | signal:s2-vol-break | 52 | 30 (58 %) | 109 | 73 % | 0.91 | -22.62 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 57 | 8 (14 %) | 414 | 59 % | 0.51 | -632.49 |
| Signals | signal:squeeze | 45 | 11 (24 %) | 45 | 24 % | 0.03 | -333.69 |
| Signals | signal:st-slow | 42 | 16 (38 %) | 59 | 49 % | 0.38 | -115.99 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 551 | 62 % | 0.57 | -575.21 |
| Signals | signal:supertrend | 46 | 29 (63 %) | 184 | 74 % | 0.94 | -19.94 |
| Signals | signal:swing | 57 | 1 (2 %) | 385 | 51 % | 0.30 | -1015.24 |
| Signals | signal:thrust | 55 | 2 (4 %) | 386 | 49 % | 0.27 | -1117.24 |
| Signals | signal:trix | 53 | 11 (21 %) | 121 | 47 % | 0.24 | -398.00 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 24 (40 %) | 311 | 66 % | 0.74 | -179.40 |
| Signals | signal:williams-r | 60 | 14 (23 %) | 413 | 60 % | 0.68 | -407.93 |
| Signals | signal:zscore | 60 | 0 (0 %) | 281 | 50 % | 0.37 | -803.54 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 94830 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 94830 | 0 |  |
| Short | 40068 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 40068 | 0 |  |
| General | 13980 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13980 | 0 |  |
| Long | 18980 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18980 | 0 |  |
| Wide | 63494 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 63494 | 0 |  |
| Signals | 3780 | – | 2278 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2278 units (pair × symbol × direction) active at the run start, 3037 over the run; 3193 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1233 (65 %) | 16881 | 76 % | 1.40 | 11216.92 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 58 | 46 (79 %) | 301 | 81 % | 2.00 | 370.76 |
| Signals | signal:act-hf | 55 | 16 (29 %) | 389 | 57 % | 0.56 | -492.27 |
| Signals | signal:adx | 58 | 18 (31 %) | 248 | 59 % | 0.51 | -384.54 |
| Signals | signal:atr-break | 56 | 41 (73 %) | 325 | 74 % | 1.53 | 278.69 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 366 | 56 % | 0.52 | -698.23 |
| Signals | signal:cci | 59 | 2 (3 %) | 456 | 59 % | 0.51 | -789.04 |
| Signals | signal:cmf | 54 | 5 (9 %) | 270 | 45 % | 0.25 | -883.76 |
| Signals | signal:donchian | 41 | 11 (27 %) | 157 | 58 % | 0.57 | -206.33 |
| Signals | signal:ema-cross | 47 | 39 (83 %) | 113 | 87 % | 5.10 | 238.86 |
| Signals | signal:ema-cross-fast | 59 | 47 (80 %) | 301 | 79 % | 1.67 | 267.69 |
| Signals | signal:ema-pullback | 59 | 18 (31 %) | 390 | 67 % | 0.66 | -314.79 |
| Signals | signal:ema-slope | 52 | 14 (27 %) | 181 | 65 % | 0.56 | -220.57 |
| Signals | signal:ema-trend | 59 | 19 (32 %) | 400 | 65 % | 0.63 | -393.89 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 464 | 56 % | 0.45 | -875.07 |
| Signals | signal:hma | 54 | 13 (24 %) | 332 | 55 % | 0.53 | -467.74 |
| Signals | signal:ichimoku | 46 | 18 (39 %) | 170 | 62 % | 0.62 | -175.44 |
| Signals | signal:impulse | 56 | 4 (7 %) | 279 | 39 % | 0.22 | -999.97 |
| Signals | signal:kama | 56 | 12 (21 %) | 489 | 62 % | 0.54 | -613.17 |
| Signals | signal:keltner | 47 | 19 (40 %) | 108 | 55 % | 0.74 | -76.13 |
| Signals | signal:macd-cross | 57 | 7 (12 %) | 317 | 56 % | 0.42 | -677.54 |
| Signals | signal:macd-hist | 59 | 19 (32 %) | 443 | 65 % | 0.68 | -380.61 |
| Signals | signal:macd-slow | 57 | 8 (14 %) | 331 | 58 % | 0.46 | -634.27 |
| Signals | signal:mfi | 30 | 29 (97 %) | 61 | 93 % | 8.74 | 128.08 |
| Signals | signal:obv | 60 | 47 (78 %) | 422 | 77 % | 1.62 | 374.00 |
| Signals | signal:r-awesome | 56 | 12 (21 %) | 255 | 47 % | 0.33 | -619.86 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 116 | 64 % | 0.51 | -186.50 |
| Signals | signal:r-fractal | 37 | 4 (11 %) | 75 | 16 % | 0.04 | -393.58 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -120.60 |
| Signals | signal:r-linreg | 60 | 14 (23 %) | 426 | 58 % | 0.49 | -655.59 |
| Signals | signal:r-nr-break | 46 | 2 (4 %) | 222 | 36 % | 0.21 | -868.66 |
| Signals | signal:r-session-trend | 60 | 14 (23 %) | 360 | 54 % | 0.44 | -745.59 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 70 | 86 % | 6.40 | 206.24 |
| Signals | signal:reclaim | 60 | 16 (27 %) | 480 | 65 % | 0.63 | -484.63 |
| Signals | signal:rsi-mid | 55 | 10 (18 %) | 296 | 44 % | 0.25 | -816.78 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 29 | 8 (28 %) | 32 | 31 % | 0.08 | -149.56 |
| Signals | signal:s2-active-hf | 54 | 25 (46 %) | 453 | 68 % | 1.00 | 1.14 |
| Signals | signal:s2-adx-gate | 58 | 24 (41 %) | 345 | 69 % | 0.76 | -194.34 |
| Signals | signal:s2-atr-break | 56 | 5 (9 %) | 256 | 38 % | 0.21 | -922.16 |
| Signals | signal:s2-bb-bounce | 60 | 32 (53 %) | 281 | 58 % | 0.70 | -241.27 |
| Signals | signal:s2-block-scale | 58 | 16 (28 %) | 430 | 62 % | 0.54 | -531.98 |
| Signals | signal:s2-block-stack | 54 | 15 (28 %) | 299 | 63 % | 0.64 | -327.36 |
| Signals | signal:s2-confluence | 59 | 15 (25 %) | 506 | 63 % | 0.67 | -389.22 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 |
| Signals | signal:s2-range-break | 45 | 33 (73 %) | 62 | 81 % | 1.60 | 58.77 |
| Signals | signal:s2-range-shift | 52 | 12 (23 %) | 155 | 40 % | 0.26 | -529.38 |
| Signals | signal:s2-rsi-revert | 52 | 27 (52 %) | 108 | 56 % | 0.54 | -148.36 |
| Signals | signal:s2-st-trail | 39 | 22 (56 %) | 45 | 56 % | 0.45 | -62.95 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 487 | 78 % | 1.89 | 597.05 |
| Signals | signal:s2-vol-break | 52 | 30 (58 %) | 109 | 73 % | 0.91 | -22.62 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 57 | 8 (14 %) | 414 | 59 % | 0.51 | -632.49 |
| Signals | signal:squeeze | 45 | 11 (24 %) | 45 | 24 % | 0.03 | -333.69 |
| Signals | signal:st-slow | 42 | 16 (38 %) | 59 | 49 % | 0.38 | -115.99 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 551 | 62 % | 0.57 | -575.21 |
| Signals | signal:supertrend | 46 | 29 (63 %) | 184 | 74 % | 0.94 | -19.94 |
| Signals | signal:swing | 57 | 1 (2 %) | 385 | 51 % | 0.30 | -1015.24 |
| Signals | signal:thrust | 55 | 2 (4 %) | 386 | 49 % | 0.27 | -1117.24 |
| Signals | signal:trix | 53 | 11 (21 %) | 121 | 47 % | 0.24 | -398.00 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 24 (40 %) | 311 | 66 % | 0.74 | -179.40 |
| Signals | signal:williams-r | 60 | 14 (23 %) | 413 | 60 % | 0.68 | -407.93 |
| Signals | signal:zscore | 60 | 0 (0 %) | 281 | 50 % | 0.37 | -803.54 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1122 | 389 (35 %) | 6198 | 65 % | 0.59 | -7539.41 |
| Signals | 1.25 | 689 | 235 (34 %) | 3876 | 66 % | 0.57 | -4888.42 |
| Signals | 1.35 | 528 | 184 (35 %) | 2949 | 67 % | 0.57 | -3674.73 |
| Signals | 1.5 | 355 | 121 (34 %) | 2120 | 68 % | 0.58 | -2523.79 |
| Signals | 1.75 | 197 | 65 (33 %) | 1217 | 69 % | 0.55 | -1484.14 |
| Signals | 2 | 111 | 40 (36 %) | 728 | 72 % | 0.61 | -678.46 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 230 | 87 % | 3.91 | 478.45 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 26 (87 %) | 217 | 83 % | 2.34 | 332.13 | tp5 sl15 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-obv-m@m15 | 30 | 28 (93 %) | 160 | 86 % | 3.68 | 312.16 | tp5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 24 (80 %) | 254 | 76 % | 1.72 | 289.84 | tp5 sl15 tr3 h96 (7 · ∞ (no loss) · 29.63) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 92 | 89 % | 8.41 | 237.56 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 9.27) |
| Signals | follow | sig-r-vol-regime-s@m15 | 26 | 26 (100 %) | 50 | 88 % | 9.31 | 150.49 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 | – |
| Signals | follow | sig-ema-cross-fast-m@m15 | 29 | 26 (90 %) | 67 | 90 % | 5.92 | 136.68 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 4.47) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 21 (70 %) | 234 | 76 % | 1.35 | 131.02 | tp8 sl24 tr3.2 h96 (6 · ∞ (no loss) · 18.97) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 | – |
| Signals | follow | sig-mfi-m@m15 | 30 | 29 (97 %) | 61 | 93 % | 8.74 | 128.08 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 16 (53 %) | 257 | 70 % | 1.23 | 118.60 | tp6 sl18 tr2.4 h96 (7 · 172.75 · 26.08) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 21 (70 %) | 146 | 69 % | 1.42 | 115.06 | tp4 sl8 tr0 h96 (5 · 1.85 · 7.00) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 13 (43 %) | 167 | 76 % | 1.29 | 85.13 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 8.67) |
| Signals | follow | sig-s2-range-break-s@m15 | 19 | 18 (95 %) | 25 | 96 % | 147.33 | 85.12 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 19 (63 %) | 262 | 72 % | 1.13 | 61.84 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 17.97) |
| Signals | follow | sig-r-vol-regime-m@m15 | 16 | 12 (75 %) | 20 | 80 % | 3.78 | 55.75 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 24 | 21 (88 %) | 29 | 90 % | 4.22 | 55.45 | – |
| Signals | follow | sig-act-burst-m@m15 | 28 | 20 (71 %) | 84 | 75 % | 1.31 | 38.63 | – |
| Signals | follow | sig-rsi-momentum-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-volume-break-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-r-connors-s@m15 | 13 | 13 (100 %) | 14 | 100 % | ∞ (no loss) | 33.34 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 27 | 19 (70 %) | 35 | 74 % | 1.58 | 30.97 | – |
| Signals | follow | sig-vwap-m@m15 | 30 | 15 (50 %) | 107 | 70 % | 1.15 | 29.56 | tp3 sl9 tr1.2 h96 (7 · 58.33 · 7.48) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 14 (47 %) | 240 | 69 % | 1.04 | 20.63 | tp5 sl15 tr2 h96 (8 · 508.09 · 15.28) |
| Signals | follow | sig-ichimoku-m@m15 | 16 | 14 (88 %) | 23 | 78 % | 2.13 | 14.66 | – |
| Signals | follow | sig-s2-active-hf-m@m15 | 27 | 12 (44 %) | 222 | 68 % | 1.03 | 11.44 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-s2-st-trail-m@m15 | 17 | 14 (82 %) | 20 | 85 % | 1.50 | 6.88 | – |
| Signals | follow | sig-supertrend-m@m15 | 17 | 14 (82 %) | 20 | 85 % | 1.50 | 6.88 | – |
| Signals | follow | sig-ema-cross-m@m15 | 17 | 12 (71 %) | 21 | 76 % | 1.05 | 1.29 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 27 | 13 (48 %) | 231 | 68 % | 0.98 | -10.30 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-atr-break-m@m15 | 26 | 17 (65 %) | 71 | 69 % | 0.91 | -11.16 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 16 (53 %) | 250 | 73 % | 0.96 | -17.50 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 13.04) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 15 (50 %) | 262 | 71 % | 0.96 | -20.11 | tp3 sl9 tr0 h96 (10 · 2.74 · 16.00) |
| Signals | follow | sig-trix-s@m15 | 23 | 11 (48 %) | 65 | 58 % | 0.80 | -21.40 | tp3 sl9 tr1.2 h96 (6 · 7.30 · 3.65) |
| Signals | follow | sig-s2-range-break-m@m15 | 26 | 15 (58 %) | 37 | 70 % | 0.73 | -26.35 | – |
| Signals | follow | sig-supertrend-s@m15 | 29 | 15 (52 %) | 164 | 73 % | 0.92 | -26.83 | tp2.5 sl5 tr0 h96 (8 · 3.10 · 10.90) |
| Signals | follow | sig-keltner-s@m15 | 26 | 13 (50 %) | 72 | 53 % | 0.83 | -28.68 | tp3 sl9 tr1.2 h96 (5 · 0.41 · -0.28) |
| Signals | follow | sig-donchian-m@m15 | 12 | 3 (25 %) | 28 | 46 % | 0.45 | -43.08 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-keltner-m@m15 | 21 | 6 (29 %) | 36 | 58 % | 0.63 | -47.45 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -49.85 | – |
| Signals | follow | sig-st-slow-s@m15 | 22 | 8 (36 %) | 30 | 43 % | 0.45 | -55.84 | – |
| Signals | follow | sig-st-slow-m@m15 | 20 | 8 (40 %) | 29 | 55 % | 0.31 | -60.16 | – |
| Signals | follow | sig-squeeze-m@m15 | 18 | 10 (56 %) | 18 | 56 % | 0.14 | -63.66 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 12 (40 %) | 256 | 67 % | 0.87 | -64.37 | tp5 sl15 tr3 h96 (7 · 130.47 · 19.86) |
| Signals | follow | sig-s2-st-trail-s@m15 | 22 | 8 (36 %) | 25 | 32 % | 0.31 | -69.84 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 28 | 9 (32 %) | 80 | 68 % | 0.67 | -78.08 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-ema-pullback-s@m15 | 29 | 11 (38 %) | 232 | 70 % | 0.82 | -78.30 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 13.75) |
| Signals | follow | sig-adx-m@m15 | 30 | 12 (40 %) | 101 | 60 % | 0.66 | -92.04 | tp5 sl15 tr2 h96 (5 · 19.45 · 4.97) |
| Signals | follow | sig-hma-m@m15 | 30 | 13 (43 %) | 162 | 59 % | 0.76 | -92.75 | tp5 sl15 tr2 h96 (5 · 10.85 · 4.65) |
| Signals | follow | sig-ema-slope-m@m15 | 27 | 7 (26 %) | 73 | 66 % | 0.58 | -93.67 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-rsi-reversal-s@m15 | 21 | 8 (38 %) | 24 | 42 % | 0.11 | -99.71 | – |
| Signals | follow | sig-r-inside-s@m15 | 11 | 0 (0 %) | 15 | 0 % | 0.00 | -106.75 | – |
| Signals | follow | sig-s2-range-shift-s@m15 | 22 | 9 (41 %) | 78 | 46 % | 0.43 | -115.85 | tp2.5 sl3.75 tr0 h96 (10 · 0.58 · -8.25) |
| Signals | follow | sig-r-fractal-m@m15 | 15 | 2 (13 %) | 18 | 11 % | 0.00 | -122.85 | – |
| Signals | follow | sig-ema-slope-s@m15 | 25 | 7 (28 %) | 108 | 65 % | 0.55 | -126.90 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 3.75) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 12 (40 %) | 151 | 56 % | 0.67 | -133.74 | tp5 sl15 tr2 h96 (5 · 51.71 · 15.66) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 11 (37 %) | 191 | 65 % | 0.73 | -147.63 | tp3 sl6 tr0 h96 (9 · 1.58 · 7.20) |
| Signals | follow | sig-donchian-s@m15 | 29 | 8 (28 %) | 129 | 60 % | 0.59 | -163.25 | tp4 sl12 tr2.4 h96 (5 · 1.02 · 0.25) |
| Signals | follow | sig-kama-m@m15 | 30 | 8 (27 %) | 268 | 67 % | 0.74 | -168.87 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 16.76) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 28 | 8 (29 %) | 95 | 59 % | 0.44 | -176.84 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 25 | 8 (32 %) | 73 | 47 % | 0.33 | -179.33 | tp3 sl9 tr1.2 h96 (5 · 0.22 · -7.52) |
| Signals | follow | sig-s2-block-stack-m@m15 | 24 | 4 (17 %) | 108 | 59 % | 0.51 | -179.74 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 9 (30 %) | 276 | 69 % | 0.72 | -181.37 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 7.84) |
| Signals | follow | sig-stoch-rsi-m@m15 | 29 | 7 (24 %) | 245 | 66 % | 0.66 | -186.79 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 11.37) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 4 (13 %) | 147 | 59 % | 0.58 | -190.10 | tp2.5 sl3.75 tr0 h96 (9 · 1.16 · 1.95) |
| Signals | follow | sig-vwap-s@m15 | 30 | 9 (30 %) | 204 | 64 % | 0.59 | -208.96 | tp5 sl15 tr2 h96 (8 · 40.95 · 4.98) |
| Signals | follow | sig-r-connors-m@m15 | 27 | 5 (19 %) | 102 | 59 % | 0.42 | -219.84 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 2 (7 %) | 154 | 61 % | 0.61 | -228.71 | tp3 sl9 tr1.2 h96 (6 · 1.07 · 0.62) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 7 (23 %) | 158 | 62 % | 0.51 | -236.49 | tp3 sl4.5 tr0 h96 (7 · 0.79 · -2.90) |
| Signals | follow | sig-s2-block-scale-m@m15 | 29 | 8 (28 %) | 194 | 62 % | 0.54 | -243.96 | tp6 sl18 tr2.4 h96 (6 · 67.70 · 9.27) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 7 (23 %) | 251 | 60 % | 0.59 | -263.02 | tp8 sl24 tr3.2 h96 (5 · 8.55 · 5.09) |
| Signals | follow | sig-squeeze-s@m15 | 27 | 1 (4 %) | 27 | 4 % | 0.00 | -270.03 | – |
| Signals | follow | sig-r-fractal-s@m15 | 22 | 2 (9 %) | 57 | 18 % | 0.05 | -270.73 | tp3 sl9 tr1.2 h96 (6 · 1.19 · 0.12) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 2 (7 %) | 262 | 62 % | 0.68 | -274.19 | tp6 sl18 tr2.4 h96 (6 · 1.47 · 8.49) |
| Signals | follow | sig-s2-block-scale-s@m15 | 29 | 8 (28 %) | 236 | 63 % | 0.55 | -288.02 | tp4 sl6 tr0 h96 (8 · 1.84 · 10.40) |
| Signals | follow | sig-sar-s@m15 | 30 | 5 (17 %) | 215 | 60 % | 0.55 | -292.19 | tp4 sl6 tr0 h96 (11 · 0.74 · -8.20) |
| Signals | follow | sig-adx-s@m15 | 28 | 6 (21 %) | 147 | 58 % | 0.44 | -292.50 | tp3 sl6 tr0 h96 (6 · 0.90 · -1.20) |
| Signals | follow | sig-r-awesome-s@m15 | 26 | 5 (19 %) | 88 | 39 % | 0.21 | -299.18 | tp3 sl9 tr1.8 h96 (5 · 0.30 · -13.04) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 7 (23 %) | 204 | 59 % | 0.55 | -303.26 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 8.06) |
| Signals | follow | sig-macd-slow-m@m15 | 28 | 4 (14 %) | 123 | 54 % | 0.38 | -307.26 | tp2.5 sl5 tr0 h96 (6 · 2.21 · 6.30) |
| Signals | follow | sig-cci-m@m15 | 30 | 0 (0 %) | 186 | 58 % | 0.56 | -310.88 | tp4 sl8 tr0 h96 (6 · 0.93 · -1.20) |
| Signals | follow | sig-macd-cross-m@m15 | 28 | 3 (11 %) | 136 | 57 % | 0.38 | -317.03 | tp3 sl4.5 tr0 h96 (9 · 1.19 · 2.70) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 7 (23 %) | 167 | 51 % | 0.42 | -320.68 | tp4 sl12 tr2.4 h96 (5 · 0.94 · -0.71) |
| Signals | follow | sig-s2-confluence-s@m15 | 29 | 3 (10 %) | 250 | 59 % | 0.53 | -324.85 | tp6 sl18 tr2.4 h96 (5 · 66.33 · 8.06) |
| Signals | follow | sig-macd-slow-s@m15 | 29 | 4 (14 %) | 208 | 61 % | 0.52 | -327.00 | tp4 sl6 tr0 h96 (11 · 1.07 · 1.80) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 69 | 42 % | 0.20 | -334.02 | – |
| Signals | follow | sig-sar-m@m15 | 27 | 3 (11 %) | 199 | 57 % | 0.48 | -340.29 | tp2.5 sl3.75 tr0 h96 (16 · 0.97 · -0.70) |
| Signals | follow | sig-r-nr-break-m@m15 | 23 | 2 (9 %) | 102 | 39 % | 0.25 | -343.72 | tp3 sl9 tr1.2 h96 (10 · 0.60 · -4.16) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 8 (27 %) | 158 | 51 % | 0.39 | -351.08 | tp5 sl15 tr2 h96 (6 · 0.61 · -5.99) |
| Signals | follow | sig-thrust-m@m15 | 28 | 2 (7 %) | 227 | 61 % | 0.44 | -355.70 | tp2.5 sl7.5 tr0 h96 (13 · 1.00 · -0.10) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 11 (37 %) | 135 | 45 % | 0.32 | -356.32 | tp2.5 sl7.5 tr0 h96 (6 · 0.30 · -16.20) |
| Signals | follow | sig-macd-cross-s@m15 | 29 | 4 (14 %) | 181 | 55 % | 0.46 | -360.51 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-macd-hist-s@m15 | 29 | 4 (14 %) | 181 | 55 % | 0.46 | -360.51 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-hma-s@m15 | 24 | 0 (0 %) | 170 | 52 % | 0.39 | -374.99 | tp4 sl12 tr1.6 h96 (7 · 0.77 · -2.86) |
| Signals | follow | sig-rsi-mid-s@m15 | 28 | 6 (21 %) | 152 | 51 % | 0.29 | -376.54 | tp5 sl15 tr2 h96 (7 · 21.63 · 4.13) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 56 | 34 % | 0.09 | -376.60 | – |
| Signals | follow | sig-cmf-s@m15 | 25 | 2 (8 %) | 136 | 49 % | 0.29 | -381.93 | tp3 sl9 tr1.8 h96 (10 · 0.79 · -3.85) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 8 (27 %) | 306 | 58 % | 0.51 | -388.42 | tp6 sl18 tr2.4 h96 (12 · 2.56 · 9.33) |
| Signals | follow | sig-heikin-ashi-s@m15 | 28 | 2 (7 %) | 279 | 61 % | 0.55 | -391.72 | tp5 sl7.5 tr0 h96 (9 · 1.25 · 5.70) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 7 (23 %) | 175 | 54 % | 0.40 | -392.58 | tp5 sl15 tr2 h96 (7 · 0.60 · -6.17) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 6 (20 %) | 202 | 56 % | 0.48 | -394.50 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 13.24) |
| Signals | follow | sig-s2-atr-break-m@m15 | 29 | 5 (17 %) | 160 | 49 % | 0.32 | -398.22 | tp4 sl12 tr1.6 h96 (6 · 0.37 · -7.89) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 3 (10 %) | 77 | 34 % | 0.19 | -413.53 | tp2.5 sl3.75 tr0 h96 (5 · 0.39 · -7.25) |
| Signals | follow | sig-impulse-s@m15 | 29 | 3 (10 %) | 191 | 51 % | 0.36 | -433.92 | tp4 sl6 tr0 h96 (6 · 0.61 · -7.20) |
| Signals | follow | sig-rsi-mid-m@m15 | 27 | 4 (15 %) | 144 | 37 % | 0.22 | -440.23 | tp4 sl12 tr2.4 h96 (5 · 0.42 · -7.16) |
| Signals | follow | sig-kama-s@m15 | 26 | 4 (15 %) | 221 | 55 % | 0.36 | -444.29 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 8.10) |
| Signals | follow | sig-swing-s@m15 | 27 | 1 (4 %) | 165 | 50 % | 0.28 | -468.60 | tp2.5 sl3.75 tr0 h96 (14 · 0.78 · -5.30) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 0 (0 %) | 212 | 53 % | 0.46 | -469.52 | tp6 sl18 tr2.4 h96 (5 · 0.93 · -1.32) |
| Signals | follow | sig-zscore-s@m15 | 30 | 0 (0 %) | 212 | 53 % | 0.46 | -469.52 | tp6 sl18 tr2.4 h96 (5 · 0.93 · -1.32) |
| Signals | follow | sig-cci-s@m15 | 29 | 2 (7 %) | 270 | 59 % | 0.47 | -478.15 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 14.06) |
| Signals | follow | sig-ema-trend-s@m15 | 29 | 6 (21 %) | 233 | 56 % | 0.37 | -479.03 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 6.57) |
| Signals | follow | sig-heikin-ashi-m@m15 | 25 | 2 (8 %) | 185 | 49 % | 0.32 | -483.35 | tp3 sl4.5 tr0 h96 (14 · 1.07 · 1.70) |
| Signals | follow | sig-cmf-m@m15 | 29 | 3 (10 %) | 134 | 41 % | 0.21 | -501.83 | tp3 sl9 tr1.2 h96 (8 · 0.48 · -4.92) |
| Signals | follow | sig-act-hf-m@m15 | 25 | 2 (8 %) | 149 | 39 % | 0.22 | -512.90 | tp3 sl6 tr0 h96 (8 · 0.45 · -13.60) |
| Signals | follow | sig-s2-atr-break-s@m15 | 27 | 0 (0 %) | 96 | 19 % | 0.09 | -523.94 | tp3 sl9 tr1.2 h96 (7 · 0.02 · -18.44) |
| Signals | follow | sig-r-nr-break-s@m15 | 23 | 0 (0 %) | 120 | 34 % | 0.17 | -524.95 | tp2.5 sl3.75 tr0 h96 (11 · 0.70 · -5.95) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 220 | 51 % | 0.33 | -546.64 | tp5 sl15 tr2 h96 (8 · 0.33 · -10.39) |
| Signals | follow | sig-impulse-m@m15 | 27 | 1 (4 %) | 88 | 13 % | 0.05 | -566.05 | tp3 sl9 tr1.8 h96 (6 · 0.30 · -12.97) |
| Signals | follow | sig-thrust-s@m15 | 27 | 0 (0 %) | 159 | 31 % | 0.15 | -761.54 | tp4 sl12 tr1.6 h96 (8 · 0.33 · -16.51) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 98 | 90 (92 %) | 250 | 94 % | 2.97 | 431.18 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 71 | 63 (89 %) | 116 | 92 % | 2.86 | 359.77 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 49 | 41 (84 %) | 79 | 86 % | 2.47 | 285.44 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 96 | 74 (77 %) | 221 | 88 % | 1.52 | 207.22 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 84 | 53 (63 %) | 159 | 79 % | 1.04 | 25.84 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 115 | 72 (63 %) | 409 | 82 % | 0.88 | -100.16 |
| Signals | tp 6.000% | sl 3.00× | tr off | 74 | 43 (58 %) | 119 | 72 % | 0.83 | -101.80 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 117 | 53 (45 %) | 599 | 72 % | 0.67 | -410.97 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 115 | 54 (47 %) | 397 | 75 % | 0.62 | -491.94 |
| Signals | tp 5.000% | sl 3.00× | tr off | 101 | 33 (33 %) | 260 | 62 % | 0.52 | -712.00 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 108 | 39 (36 %) | 316 | 64 % | 0.51 | -747.01 |
| Signals | tp 3.000% | sl 2.00× | tr off | 120 | 33 (28 %) | 841 | 58 % | 0.63 | -804.20 |
| Signals | tp 4.000% | sl 1.50× | tr off | 114 | 30 (26 %) | 681 | 50 % | 0.61 | -822.20 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 116 | 42 (36 %) | 567 | 69 % | 0.52 | -835.25 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 116 | 37 (32 %) | 803 | 67 % | 0.49 | -862.23 |
| Signals | tp 6.000% | sl 2.00× | tr off | 91 | 15 (16 %) | 217 | 46 % | 0.40 | -865.40 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 114 | 33 (29 %) | 457 | 67 % | 0.50 | -914.76 |
| Signals | tp 2.500% | sl 3.00× | tr off | 119 | 30 (25 %) | 870 | 66 % | 0.59 | -919.00 |
| Signals | tp 5.000% | sl 1.50× | tr off | 111 | 23 (21 %) | 462 | 44 % | 0.49 | -1007.40 |
| Signals | tp 2.500% | sl 2.00× | tr off | 122 | 23 (19 %) | 1142 | 57 % | 0.59 | -1033.40 |
| Signals | tp 2.500% | sl 1.50× | tr off | 122 | 18 (15 %) | 1305 | 50 % | 0.58 | -1067.25 |
| Signals | tp 5.000% | sl 2.00× | tr off | 107 | 27 (25 %) | 358 | 48 % | 0.44 | -1071.60 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 118 | 27 (23 %) | 1226 | 57 % | 0.47 | -1079.78 |
| Signals | tp 6.000% | sl 1.50× | tr off | 102 | 17 (17 %) | 304 | 38 % | 0.38 | -1086.80 |
| Signals | tp 3.000% | sl 3.00× | tr off | 118 | 31 (26 %) | 636 | 62 % | 0.50 | -1099.20 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 118 | 31 (26 %) | 919 | 63 % | 0.50 | -1107.08 |
| Signals | tp 4.000% | sl 2.00× | tr off | 110 | 18 (16 %) | 547 | 51 % | 0.49 | -1125.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 118 | 31 (26 %) | 720 | 61 % | 0.49 | -1141.21 |
| Signals | tp 4.000% | sl 3.00× | tr off | 107 | 21 (20 %) | 418 | 59 % | 0.45 | -1163.60 |
| Signals | tp 3.000% | sl 1.50× | tr off | 122 | 21 (17 %) | 1077 | 48 % | 0.55 | -1184.40 |

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
