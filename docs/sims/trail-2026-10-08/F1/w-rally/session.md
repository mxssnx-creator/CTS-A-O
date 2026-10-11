# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T03:00 UTC. Engine: Base 1122/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126; Main 996 pairs, 137378 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 251 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.00 (0.00 %, closed orders) · equity at end $20.00 (open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ – (gross profit $ ÷ gross loss $ as sized) · PF unit – (every order at one unit: the engine's PF) · 0 positions / 0 orders · WR 0.00 % · DDT (closed trades, $) 0.00 h · DDR – (net ≤ 0) · equity max drawdown $0.00 (0.00 %) · margin used max $0.00 · open avg 0.00 pos / 0.00 orders (peak 0 / 0)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 0 orders capped to $0, 0 scaled down · binding: position cap 0, gross cap 0. **Without the caps:** balance $20.00 → $20.00 (0.00 %) · PF $ – · equity at end $20.00 · equity max drawdown $0.00 (0.00 %) · margin used max $0.00.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 407 | 966  | 3.9 % | 1.650 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 407 | 966 (+0) | 3.9 % | 1.650 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 407 | 965 (-1) | 3.9 % | 1.650 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 394 | 862 (-104) | 3.5 % | 1.683 |
| closes ≥ 6 | 1.00 | 6 | 1 | 694 | 1369 (+403) | 5.5 % | 2.037 |
| closes ≥ 20 | 1.00 | 20 | 1 | 264 | 692 (-274) | 2.8 % | 1.501 |
| closes ≥ 30 | 1.00 | 30 | 1 | 197 | 554 (-412) | 2.2 % | 1.408 |
| DDR off | 1.00 | 12 | off | 1282 | 2310 (+1344) | 9.3 % | 1.179 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 663 | 1450 (+484) | 5.8 % | 1.443 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 171 | 454 (-512) | 1.8 % | 2.034 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1282 | 2310 (+1344) | 9.3 % | 1.179 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1828 | 2898 (+1932) | 11.6 % | 1.271 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 16:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 17:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 18:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 19:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 20:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 21:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 22:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 23:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 00:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 01:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 02:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $20.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |

**Last hour (02:00):** open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $20.00 = balance $20.00 + MTM $0.00.

**Hours positive:** 0 of 12 full hours · flat 12 · negative 0

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) |  |
|---||
| 15:00 |  |
| 16:00 |  |
| 17:00 |  |
| 18:00 |  |
| 19:00 |  |
| 20:00 |  |
| 21:00 |  |
| 22:00 |  |
| 23:00 |  |
| 00:00 |  |
| 01:00 |  |
| 02:00 |  |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns () are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | of which Block-raised | of which Signals |
|---|---:|---:|---:|
| 15:00 | 0 | – | – |
| 16:00 | 0 | – | – |
| 17:00 | 0 | – | – |
| 18:00 | 0 | – | – |
| 19:00 | 0 | – | – |
| 20:00 | 0 | – | – |
| 21:00 | 0 | – | – |
| 22:00 | 0 | – | – |
| 23:00 | 0 | – | – |
| 00:00 | 0 | – | – |
| 01:00 | 0 | – | – |
| 02:00 | 0 | – | – |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (137378 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3431); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 28721 · 0.98 | 5579 · 1.25 | 8920 · 1.24 | 1000 · 3.25 | – | – | – | – | – |
| 16:00 | 36123 · 0.43 | 9257 · 0.69 | 13435 · 0.58 | 3085 · 1.58 | – | – | – | – | – |
| 17:00 | 26034 · 0.56 | 4438 · 0.46 | 12747 · 0.49 | 1995 · 4.61 | – | – | – | – | – |
| 18:00 | 26840 · 1.36 | 8244 · 1.67 | 11901 · 1.84 | 4021 · 3.69 | – | – | – | – | – |
| 19:00 | 22282 · 1.07 | 6071 · 1.61 | 5865 · 0.94 | 1824 · 2.20 | – | – | – | – | – |
| 20:00 | 32780 · 3.06 | 10841 · 4.88 | 11058 · 2.96 | 3401 · 2.60 | – | – | – | – | – |
| 21:00 | 22716 · 2.10 | 5295 · 1.58 | 9940 · 4.05 | 2342 · 3.79 | – | – | – | – | – |
| 22:00 | 17773 · 0.92 | 3881 · 1.19 | 4635 · 1.53 | 2181 · 3.51 | – | – | – | – | – |
| 23:00 | 18799 · 0.51 | 5374 · 0.74 | 5988 · 0.35 | 2323 · 3.42 | – | – | – | – | – |
| 00:00 | 30182 · 1.04 | 7873 · 1.05 | 11232 · 1.39 | 4721 · 0.73 | – | – | – | – | – |
| 01:00 | 37891 · 1.29 | 7871 · 1.61 | 14052 · 2.07 | 3691 · 2.14 | – | – | – | – | – |
| 02:00 | 38426 · 1.22 | 10987 · 1.71 | 13020 · 2.16 | 6914 · 3.24 | – | – | – | – | – |
| **total** | **338567 · 1.06** | **85711 · 1.41** | **122793 · 1.30** | **37498 · 2.21** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 58498 | sig:confirm 58498 |

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
| Micro | 2.47 | – | – | – | – | 0 |
| Short | 1.65 | – | – | – | – | 0 |
| General | 1.55 | – | – | – | – | 0 |
| Long | 1.49 | – | – | – | – | 0 |
| Wide | 1.68 | – | – | – | – | 0 |
| Signals | – | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 133598 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2156 units active at the run start, 2932 over the run, 3431 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1694 | 1360 (80 %) | 14073 | 80 % | 2.09 | 19722.97 |
| Signals | trailing | 1737 | 1501 (86 %) | 23425 | 78 % | 2.38 | 18642.60 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 54 (90 %) | 718 | 78 % | 2.02 | 623.52 |
| Signals | signal:act-hf | 60 | 41 (68 %) | 1064 | 71 % | 1.43 | 480.80 |
| Signals | signal:adx | 60 | 52 (87 %) | 454 | 77 % | 2.01 | 528.58 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 809 | 79 % | 2.77 | 972.87 |
| Signals | signal:bollinger | 60 | 41 (68 %) | 375 | 74 % | 1.43 | 233.48 |
| Signals | signal:cci | 60 | 46 (77 %) | 547 | 74 % | 1.79 | 436.43 |
| Signals | signal:cmf | 60 | 55 (92 %) | 1024 | 80 % | 1.82 | 837.05 |
| Signals | signal:donchian | 60 | 60 (100 %) | 603 | 87 % | 9.69 | 1088.58 |
| Signals | signal:ema-cross | 60 | 25 (42 %) | 303 | 69 % | 0.97 | -15.61 |
| Signals | signal:ema-cross-fast | 60 | 53 (88 %) | 610 | 79 % | 1.61 | 480.72 |
| Signals | signal:ema-pullback | 60 | 51 (85 %) | 675 | 81 % | 2.18 | 763.18 |
| Signals | signal:ema-slope | 54 | 37 (69 %) | 387 | 73 % | 1.20 | 113.82 |
| Signals | signal:ema-trend | 60 | 37 (62 %) | 553 | 71 % | 1.27 | 226.74 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1599 | 76 % | 1.87 | 1283.91 |
| Signals | signal:hma | 60 | 39 (65 %) | 673 | 77 % | 1.50 | 375.42 |
| Signals | signal:ichimoku | 60 | 54 (90 %) | 440 | 82 % | 2.13 | 429.23 |
| Signals | signal:impulse | 60 | 60 (100 %) | 958 | 79 % | 4.93 | 1422.39 |
| Signals | signal:kama | 60 | 59 (98 %) | 1194 | 79 % | 2.15 | 1234.46 |
| Signals | signal:keltner | 60 | 59 (98 %) | 516 | 90 % | 13.41 | 1054.97 |
| Signals | signal:macd-cross | 60 | 58 (97 %) | 866 | 82 % | 3.34 | 1168.04 |
| Signals | signal:macd-hist | 60 | 58 (97 %) | 1264 | 81 % | 2.52 | 1374.08 |
| Signals | signal:macd-slow | 60 | 38 (63 %) | 923 | 83 % | 1.93 | 793.17 |
| Signals | signal:mfi | 21 | 18 (86 %) | 59 | 73 % | 3.73 | 40.10 |
| Signals | signal:obv | 60 | 46 (77 %) | 555 | 75 % | 1.62 | 398.09 |
| Signals | signal:r-awesome | 57 | 53 (93 %) | 766 | 76 % | 1.67 | 481.20 |
| Signals | signal:r-connors | 60 | 28 (47 %) | 287 | 67 % | 0.88 | -59.85 |
| Signals | signal:r-fractal | 60 | 56 (93 %) | 500 | 80 % | 3.77 | 625.28 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 82 | 94 % | 273.13 | 160.01 |
| Signals | signal:r-linreg | 60 | 33 (55 %) | 629 | 74 % | 1.11 | 110.05 |
| Signals | signal:r-nr-break | 60 | 51 (85 %) | 977 | 79 % | 1.98 | 806.26 |
| Signals | signal:r-session-trend | 60 | 38 (63 %) | 321 | 80 % | 2.01 | 300.29 |
| Signals | signal:r-vol-regime | 60 | 60 (100 %) | 429 | 82 % | 5.27 | 643.22 |
| Signals | signal:reclaim | 60 | 52 (87 %) | 615 | 77 % | 1.60 | 451.83 |
| Signals | signal:rsi-mid | 60 | 59 (98 %) | 940 | 86 % | 3.92 | 1494.41 |
| Signals | signal:rsi-momentum | 30 | 28 (93 %) | 155 | 77 % | 2.86 | 206.75 |
| Signals | signal:rsi-reversal | 54 | 52 (96 %) | 100 | 94 % | 16.54 | 277.86 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 1382 | 79 % | 2.50 | 1499.62 |
| Signals | signal:s2-adx-gate | 60 | 60 (100 %) | 578 | 89 % | 25.46 | 1305.14 |
| Signals | signal:s2-atr-break | 60 | 59 (98 %) | 1174 | 78 % | 2.17 | 1042.85 |
| Signals | signal:s2-bb-bounce | 56 | 40 (71 %) | 190 | 86 % | 2.72 | 253.11 |
| Signals | signal:s2-block-scale | 60 | 39 (65 %) | 1279 | 71 % | 1.16 | 276.13 |
| Signals | signal:s2-block-stack | 60 | 52 (87 %) | 517 | 80 % | 3.35 | 845.12 |
| Signals | signal:s2-confluence | 60 | 51 (85 %) | 485 | 88 % | 4.72 | 813.58 |
| Signals | signal:s2-ema-cross | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 7.89 |
| Signals | signal:s2-range-break | 60 | 52 (87 %) | 350 | 73 % | 3.48 | 488.98 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 716 | 85 % | 6.38 | 1280.01 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 132 | 69 % | 1.43 | 79.64 |
| Signals | signal:s2-st-trail | 37 | 37 (100 %) | 151 | 87 % | 158.67 | 375.50 |
| Signals | signal:s2-stoch-swing | 60 | 55 (92 %) | 425 | 82 % | 3.85 | 684.58 |
| Signals | signal:s2-vol-break | 59 | 37 (63 %) | 113 | 56 % | 1.27 | 32.09 |
| Signals | signal:sar | 60 | 58 (97 %) | 1088 | 79 % | 2.38 | 1166.54 |
| Signals | signal:squeeze | 6 | 3 (50 %) | 7 | 43 % | 0.05 | -8.30 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 157 | 90 % | 222.24 | 404.22 |
| Signals | signal:stoch-rsi | 60 | 54 (90 %) | 1021 | 77 % | 1.73 | 670.48 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 382 | 81 % | 5.24 | 593.35 |
| Signals | signal:swing | 60 | 60 (100 %) | 1103 | 80 % | 3.94 | 1623.96 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1273 | 85 % | 3.65 | 1947.53 |
| Signals | signal:trix | 60 | 21 (35 %) | 367 | 68 % | 0.83 | -111.46 |
| Signals | signal:volume-break | 58 | 42 (72 %) | 82 | 61 % | 10.40 | 137.53 |
| Signals | signal:vwap | 60 | 38 (63 %) | 430 | 72 % | 1.23 | 148.10 |
| Signals | signal:williams-r | 60 | 53 (88 %) | 772 | 75 % | 2.19 | 794.86 |
| Signals | signal:zscore | 56 | 40 (71 %) | 340 | 74 % | 1.40 | 173.19 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 17724 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17724 | 0 |  |
| Short | 30186 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30186 | 0 |  |
| General | 12470 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12470 | 0 |  |
| Long | 20430 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20430 | 0 |  |
| Wide | 52788 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52788 | 0 |  |
| Signals | 3780 | – | 2156 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2156 units (pair × symbol × direction) active at the run start, 2932 over the run; 3431 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 5908 | 1686 (29 %) | 15134 | 71 % | 0.49 | -3652.03 |
| Micro | trailing | 11816 | 3634 (31 %) | 30676 | 61 % | 0.51 | -5657.58 |
| Short | normal | 10062 | 4222 (42 %) | 14341 | 66 % | 1.19 | 3211.80 |
| Short | trailing | 20124 | 8432 (42 %) | 30786 | 63 % | 1.05 | 1379.04 |
| General | normal | 7482 | 3257 (44 %) | 12062 | 51 % | 1.32 | 5403.90 |
| General | trailing | 4988 | 1973 (40 %) | 7399 | 59 % | 1.31 | 3140.07 |
| Long | normal | 12258 | 5061 (41 %) | 17869 | 50 % | 1.34 | 12349.90 |
| Long | trailing | 8172 | 3631 (44 %) | 11461 | 67 % | 1.41 | 8112.61 |
| Wide | axis | 44820 | 7305 (16 %) | 110946 | 28 % | 0.48 | -53017.28 |
| Wide | dca | 3984 | 1563 (39 %) | 11653 | 66 % | 0.82 | -3099.01 |
| Wide | dca-active | 3984 | 575 (14 %) | 7464 | 32 % | 0.60 | -2736.29 |
| Signals | normal | 1890 | 1533 (81 %) | 26305 | 77 % | 1.78 | 29748.71 |
| Signals | trailing | 1890 | 1589 (84 %) | 42471 | 74 % | 1.79 | 23793.46 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 54 (90 %) | 718 | 78 % | 2.02 | 623.52 |
| Signals | signal:act-hf | 60 | 41 (68 %) | 1064 | 71 % | 1.43 | 480.80 |
| Signals | signal:adx | 60 | 52 (87 %) | 454 | 77 % | 2.01 | 528.58 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 809 | 79 % | 2.77 | 972.87 |
| Signals | signal:bollinger | 60 | 41 (68 %) | 375 | 74 % | 1.43 | 233.48 |
| Signals | signal:cci | 60 | 46 (77 %) | 547 | 74 % | 1.79 | 436.43 |
| Signals | signal:cmf | 60 | 55 (92 %) | 1024 | 80 % | 1.82 | 837.05 |
| Signals | signal:donchian | 60 | 60 (100 %) | 603 | 87 % | 9.69 | 1088.58 |
| Signals | signal:ema-cross | 60 | 25 (42 %) | 303 | 69 % | 0.97 | -15.61 |
| Signals | signal:ema-cross-fast | 60 | 53 (88 %) | 610 | 79 % | 1.61 | 480.72 |
| Signals | signal:ema-pullback | 60 | 51 (85 %) | 675 | 81 % | 2.18 | 763.18 |
| Signals | signal:ema-slope | 54 | 37 (69 %) | 387 | 73 % | 1.20 | 113.82 |
| Signals | signal:ema-trend | 60 | 37 (62 %) | 553 | 71 % | 1.27 | 226.74 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1599 | 76 % | 1.87 | 1283.91 |
| Signals | signal:hma | 60 | 39 (65 %) | 673 | 77 % | 1.50 | 375.42 |
| Signals | signal:ichimoku | 60 | 54 (90 %) | 440 | 82 % | 2.13 | 429.23 |
| Signals | signal:impulse | 60 | 60 (100 %) | 958 | 79 % | 4.93 | 1422.39 |
| Signals | signal:kama | 60 | 59 (98 %) | 1194 | 79 % | 2.15 | 1234.46 |
| Signals | signal:keltner | 60 | 59 (98 %) | 516 | 90 % | 13.41 | 1054.97 |
| Signals | signal:macd-cross | 60 | 58 (97 %) | 866 | 82 % | 3.34 | 1168.04 |
| Signals | signal:macd-hist | 60 | 58 (97 %) | 1264 | 81 % | 2.52 | 1374.08 |
| Signals | signal:macd-slow | 60 | 38 (63 %) | 923 | 83 % | 1.93 | 793.17 |
| Signals | signal:mfi | 21 | 18 (86 %) | 59 | 73 % | 3.73 | 40.10 |
| Signals | signal:obv | 60 | 46 (77 %) | 555 | 75 % | 1.62 | 398.09 |
| Signals | signal:r-awesome | 57 | 53 (93 %) | 766 | 76 % | 1.67 | 481.20 |
| Signals | signal:r-connors | 60 | 28 (47 %) | 287 | 67 % | 0.88 | -59.85 |
| Signals | signal:r-fractal | 60 | 56 (93 %) | 500 | 80 % | 3.77 | 625.28 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 82 | 94 % | 273.13 | 160.01 |
| Signals | signal:r-linreg | 60 | 33 (55 %) | 629 | 74 % | 1.11 | 110.05 |
| Signals | signal:r-nr-break | 60 | 51 (85 %) | 977 | 79 % | 1.98 | 806.26 |
| Signals | signal:r-session-trend | 60 | 38 (63 %) | 321 | 80 % | 2.01 | 300.29 |
| Signals | signal:r-vol-regime | 60 | 60 (100 %) | 429 | 82 % | 5.27 | 643.22 |
| Signals | signal:reclaim | 60 | 52 (87 %) | 615 | 77 % | 1.60 | 451.83 |
| Signals | signal:rsi-mid | 60 | 59 (98 %) | 940 | 86 % | 3.92 | 1494.41 |
| Signals | signal:rsi-momentum | 30 | 28 (93 %) | 155 | 77 % | 2.86 | 206.75 |
| Signals | signal:rsi-reversal | 54 | 52 (96 %) | 100 | 94 % | 16.54 | 277.86 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 1382 | 79 % | 2.50 | 1499.62 |
| Signals | signal:s2-adx-gate | 60 | 60 (100 %) | 578 | 89 % | 25.46 | 1305.14 |
| Signals | signal:s2-atr-break | 60 | 59 (98 %) | 1174 | 78 % | 2.17 | 1042.85 |
| Signals | signal:s2-bb-bounce | 56 | 40 (71 %) | 190 | 86 % | 2.72 | 253.11 |
| Signals | signal:s2-block-scale | 60 | 39 (65 %) | 1279 | 71 % | 1.16 | 276.13 |
| Signals | signal:s2-block-stack | 60 | 52 (87 %) | 517 | 80 % | 3.35 | 845.12 |
| Signals | signal:s2-confluence | 60 | 51 (85 %) | 485 | 88 % | 4.72 | 813.58 |
| Signals | signal:s2-ema-cross | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 7.89 |
| Signals | signal:s2-range-break | 60 | 52 (87 %) | 350 | 73 % | 3.48 | 488.98 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 716 | 85 % | 6.38 | 1280.01 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 132 | 69 % | 1.43 | 79.64 |
| Signals | signal:s2-st-trail | 37 | 37 (100 %) | 151 | 87 % | 158.67 | 375.50 |
| Signals | signal:s2-stoch-swing | 60 | 55 (92 %) | 425 | 82 % | 3.85 | 684.58 |
| Signals | signal:s2-vol-break | 59 | 37 (63 %) | 113 | 56 % | 1.27 | 32.09 |
| Signals | signal:sar | 60 | 58 (97 %) | 1088 | 79 % | 2.38 | 1166.54 |
| Signals | signal:squeeze | 6 | 3 (50 %) | 7 | 43 % | 0.05 | -8.30 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 157 | 90 % | 222.24 | 404.22 |
| Signals | signal:stoch-rsi | 60 | 54 (90 %) | 1021 | 77 % | 1.73 | 670.48 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 382 | 81 % | 5.24 | 593.35 |
| Signals | signal:swing | 60 | 60 (100 %) | 1103 | 80 % | 3.94 | 1623.96 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1273 | 85 % | 3.65 | 1947.53 |
| Signals | signal:trix | 60 | 21 (35 %) | 367 | 68 % | 0.83 | -111.46 |
| Signals | signal:volume-break | 58 | 42 (72 %) | 82 | 61 % | 10.40 | 137.53 |
| Signals | signal:vwap | 60 | 38 (63 %) | 430 | 72 % | 1.23 | 148.10 |
| Signals | signal:williams-r | 60 | 53 (88 %) | 772 | 75 % | 2.19 | 794.86 |
| Signals | signal:zscore | 56 | 40 (71 %) | 340 | 74 % | 1.40 | 173.19 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1269 | 1104 (87 %) | 17472 | 79 % | 2.36 | 16938.95 |
| Signals | 1.25 | 851 | 756 (89 %) | 12868 | 79 % | 2.40 | 11743.28 |
| Signals | 1.35 | 687 | 609 (89 %) | 10952 | 78 % | 2.39 | 9506.01 |
| Signals | 1.5 | 511 | 456 (89 %) | 8459 | 79 % | 2.43 | 7238.54 |
| Signals | 1.75 | 329 | 295 (90 %) | 5657 | 79 % | 2.45 | 4672.36 |
| Signals | 2 | 242 | 216 (89 %) | 4229 | 79 % | 2.51 | 3464.92 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 698 | 84 % | 3.74 | 1132.69 | tp5 sl10 tr0 h48 (12 · ∞ (no loss) · 56.15) |
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 549 | 83 % | 7.79 | 1026.41 | tp3 sl9 tr0 h48 (17 · ∞ (no loss) · 47.60) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 605 | 83 % | 7.01 | 1007.15 | tp3 sl9 tr0 h48 (21 · ∞ (no loss) · 58.80) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 609 | 88 % | 4.63 | 935.40 | tp2.5 sl7.5 tr0 h48 (24 · 18.19 · 49.99) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 437 | 87 % | 20.19 | 924.33 | tp3 sl4.5 tr0 h48 (15 · 49.19 · 38.40) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 431 | 94 % | 61.24 | 921.74 | tp3 sl6 tr0 h48 (15 · ∞ (no loss) · 42.00) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 30 (100 %) | 429 | 90 % | 10.71 | 854.62 | tp5 sl7.5 tr0 h48 (9 · ∞ (no loss) · 43.20) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 575 | 86 % | 3.54 | 814.84 | tp5 sl15 tr0 h48 (10 · ∞ (no loss) · 48.00) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 29 (97 %) | 691 | 79 % | 2.50 | 749.81 | tp2.5 sl7.5 tr0 h48 (27 · 7.77 · 52.10) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 29 (97 %) | 691 | 79 % | 2.50 | 749.81 | tp2.5 sl7.5 tr0 h48 (27 · 7.77 · 52.10) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 30 (100 %) | 711 | 81 % | 2.42 | 744.89 | tp4 sl8 tr1.2 h48 (33 · 5.19 · 38.43) |
| Signals | follow | sig-sar-m@m15 | 30 | 29 (97 %) | 450 | 82 % | 6.23 | 721.87 | tp4 sl12 tr0 h48 (12 · ∞ (no loss) · 45.60) |
| Signals | follow | sig-keltner-s@m15 | 30 | 30 (100 %) | 305 | 90 % | 20.46 | 702.11 | tp8 sl16 tr3.2 h48 (8 · ∞ (no loss) · 29.37) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 316 | 91 % | 21.05 | 696.93 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-kama-s@m15 | 30 | 29 (97 %) | 668 | 78 % | 2.17 | 686.64 | tp3 sl9 tr0 h48 (20 · 5.78 · 44.00) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 30 (100 %) | 723 | 76 % | 2.29 | 659.61 | tp2.5 sl7.5 tr0 h48 (28 · 3.88 · 44.40) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 28 (93 %) | 553 | 81 % | 2.66 | 629.19 | tp2.5 sl7.5 tr0 h48 (21 · 5.97 · 38.30) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 28 (93 %) | 553 | 81 % | 2.66 | 629.19 | tp2.5 sl7.5 tr0 h48 (21 · 5.97 · 38.30) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 876 | 75 % | 1.65 | 624.29 | tp4 sl12 tr0 h48 (16 · 4.67 · 44.80) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 30 (100 %) | 558 | 82 % | 2.74 | 615.80 | tp2.5 sl7.5 tr0 h48 (21 · 5.97 · 38.30) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 554 | 78 % | 2.49 | 597.55 | tp6 sl12 tr0 h48 (7 · ∞ (no loss) · 40.60) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 29 (97 %) | 330 | 82 % | 4.47 | 593.05 | tp4 sl8 tr0 h48 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 29 (97 %) | 509 | 79 % | 2.15 | 572.67 | tp5 sl7.5 tr0 h48 (11 · 3.18 · 29.60) |
| Signals | follow | sig-kama-m@m15 | 30 | 30 (100 %) | 526 | 80 % | 2.13 | 547.82 | tp5 sl10 tr1 h48 (24 · 14.65 · 37.85) |
| Signals | follow | sig-donchian-s@m15 | 30 | 30 (100 %) | 316 | 89 % | 20.38 | 547.49 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 287 | 85 % | 6.57 | 541.08 | tp3 sl6 tr0 h48 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 30 (100 %) | 313 | 85 % | 5.56 | 538.85 | tp2.5 sl7.5 tr0 h48 (12 · ∞ (no loss) · 27.60) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 29 (97 %) | 538 | 76 % | 2.50 | 529.86 | tp6 sl12 tr1.2 h48 (28 · 10.40 · 30.07) |
| Signals | follow | sig-cmf-m@m15 | 30 | 29 (97 %) | 445 | 84 % | 2.48 | 527.43 | tp3 sl9 tr0 h48 (14 · 3.96 · 27.20) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 29 (97 %) | 461 | 82 % | 2.29 | 527.06 | tp4 sl12 tr0 h48 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 329 | 85 % | 5.51 | 525.83 | tp3 sl6 tr0 h48 (13 · ∞ (no loss) · 36.40) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 28 (93 %) | 560 | 75 % | 2.04 | 517.55 | tp3 sl6 tr0 h48 (19 · 8.13 · 44.20) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 30 (100 %) | 636 | 79 % | 1.95 | 512.98 | tp2.5 sl7.5 tr0 h48 (21 · 2.84 · 28.30) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 321 | 79 % | 4.33 | 464.49 | tp4 sl12 tr0 h48 (8 · 46.95 · 26.03) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 30 (100 %) | 249 | 88 % | 9.66 | 455.32 | tp5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 263 | 84 % | 6.79 | 448.49 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-sar-s@m15 | 30 | 29 (97 %) | 638 | 77 % | 1.63 | 444.67 | tp5 sl15 tr0 h48 (11 · 3.16 · 32.80) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 28 (93 %) | 338 | 74 % | 2.94 | 434.75 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 27 (90 %) | 287 | 78 % | 3.83 | 425.39 | tp3 sl6 tr0.6 h48 (19 · 21.63 · 26.07) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 27 (90 %) | 295 | 79 % | 3.06 | 418.12 | tp2.5 sl7.5 tr0 h48 (11 · ∞ (no loss) · 25.30) |
| Signals | follow | sig-impulse-m@m15 | 30 | 30 (100 %) | 353 | 73 % | 3.13 | 415.24 | tp3 sl9 tr0 h48 (9 · 28.11 · 21.60) |
| Signals | follow | sig-hma-s@m15 | 30 | 28 (93 %) | 522 | 79 % | 1.83 | 412.09 | tp6 sl18 tr0 h48 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 157 | 90 % | 222.24 | 404.22 | tp3 sl4.5 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 27 (90 %) | 522 | 75 % | 1.80 | 403.99 | tp3 sl9 tr0 h48 (18 · 5.17 · 38.40) |
| Signals | follow | sig-adx-s@m15 | 30 | 29 (97 %) | 298 | 84 % | 2.13 | 392.96 | tp4 sl8 tr0 h48 (10 · 4.17 · 26.00) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 30 (100 %) | 141 | 93 % | 74.19 | 380.82 | tp4 sl6 tr0 h48 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 30 (100 %) | 140 | 89 % | 179.29 | 373.20 | tp3 sl4.5 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 24 (80 %) | 482 | 74 % | 2.00 | 372.07 | tp3 sl9 tr0 h48 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 25 (83 %) | 434 | 76 % | 1.81 | 360.11 | tp6 sl12 tr1.2 h48 (21 · 6.91 · 32.37) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 29 (97 %) | 476 | 79 % | 1.59 | 359.85 | tp4 sl12 tr0 h48 (11 · 3.11 · 25.80) |
| Signals | follow | sig-keltner-m@m15 | 30 | 29 (97 %) | 211 | 90 % | 8.21 | 352.86 | tp3 sl6 tr0 h48 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 30 (100 %) | 169 | 85 % | 10.40 | 345.67 | tp8 sl16 tr1.6 h48 (7 · ∞ (no loss) · 22.68) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 26 (87 %) | 529 | 77 % | 1.72 | 339.48 | tp3 sl9 tr0 h48 (14 · 3.96 · 27.20) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 28 (93 %) | 492 | 77 % | 1.75 | 331.00 | tp2.5 sl7.5 tr0 h48 (14 · 3.88 · 22.20) |
| Signals | follow | sig-obv-m@m15 | 30 | 29 (97 %) | 188 | 85 % | 5.46 | 312.14 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-cmf-s@m15 | 30 | 26 (87 %) | 579 | 77 % | 1.46 | 309.63 | tp4 sl8 tr0.8 h48 (34 · 13.70 · 33.12) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 27 | 27 (100 %) | 119 | 97 % | 491.15 | 299.70 | tp5 sl10 tr1 h48 (7 · ∞ (no loss) · 17.69) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 27 (90 %) | 197 | 70 % | 3.27 | 275.06 | tp5 sl10 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 130 | 88 % | 8.27 | 266.47 | tp5 sl10 tr1 h48 (8 · 92.64 · 13.88) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 27 (90 %) | 397 | 79 % | 1.50 | 265.14 | tp3 sl6 tr0 h48 (14 · 2.71 · 21.20) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 30 (100 %) | 172 | 87 % | 12.07 | 264.15 | tp2.5 sl3.75 tr0 h48 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 27 (90 %) | 248 | 77 % | 2.07 | 261.63 | tp4 sl8 tr0 h48 (8 · 3.24 · 18.40) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 23 (77 %) | 187 | 76 % | 2.34 | 252.07 | tp6 sl12 tr1.8 h48 (7 · 21.76 · 14.70) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 26 (87 %) | 538 | 73 % | 1.40 | 243.27 | tp3 sl9 tr0 h48 (17 · 2.28 · 23.60) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 108 | 88 % | 6.19 | 241.12 | tp5 sl10 tr1 h48 (5 · 188.02 · 10.21) |
| Signals | follow | sig-r-awesome-m@m15 | 27 | 27 (100 %) | 228 | 83 % | 3.27 | 237.93 | tp3 sl9 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 22 (73 %) | 214 | 80 % | 1.98 | 236.13 | tp4 sl8 tr1.2 h48 (11 · 273.64 · 25.27) |
| Signals | follow | sig-cci-m@m15 | 30 | 24 (80 %) | 142 | 80 % | 2.89 | 224.74 | tp5 sl10 tr2 h48 (6 · ∞ (no loss) · 15.45) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 27 (90 %) | 196 | 87 % | 3.08 | 219.53 | tp3 sl6 tr1.2 h48 (11 · 78.12 · 15.49) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 26 (87 %) | 213 | 79 % | 1.82 | 215.59 | tp8 sl16 tr1.6 h48 (7 · ∞ (no loss) · 16.76) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 25 (83 %) | 153 | 78 % | 3.82 | 213.93 | tp2.5 sl7.5 tr0 h48 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-cci-s@m15 | 30 | 22 (73 %) | 405 | 72 % | 1.49 | 211.68 | tp8 sl16 tr2.4 h48 (11 · 76.71 · 27.65) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 28 (93 %) | 155 | 77 % | 2.86 | 206.75 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 30 (100 %) | 166 | 79 % | 3.66 | 194.73 | tp3 sl9 tr0 h48 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 21 (70 %) | 419 | 74 % | 1.41 | 190.45 | tp2.5 sl7.5 tr0 h48 (15 · 4.18 · 24.50) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 25 (83 %) | 367 | 77 % | 1.38 | 190.20 | tp5 sl10 tr1 h48 (17 · 171.47 · 31.13) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 21 (70 %) | 216 | 77 % | 1.85 | 175.33 | tp5 sl10 tr2 h48 (6 · ∞ (no loss) · 16.49) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 21 (70 %) | 642 | 72 % | 1.19 | 171.72 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 24 (80 %) | 268 | 79 % | 1.46 | 165.08 | tp4 sl8 tr1.6 h48 (10 · 2.68 · 13.80) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 82 | 94 % | 273.13 | 160.01 | – |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 20 (67 %) | 350 | 71 % | 1.30 | 156.65 | tp5 sl10 tr1 h48 (14 · 36.86 · 29.96) |
| Signals | follow | sig-ema-slope-m@m15 | 24 | 22 (92 %) | 88 | 76 % | 5.58 | 156.32 | tp4 sl8 tr0.8 h48 (6 · 54.90 · 7.96) |
| Signals | follow | sig-rsi-reversal-m@m15 | 27 | 27 (100 %) | 52 | 94 % | 16.66 | 142.50 | – |
| Signals | follow | sig-adx-m@m15 | 30 | 23 (77 %) | 156 | 65 % | 1.78 | 135.61 | tp5 sl10 tr2 h48 (6 · 6.82 · 11.82) |
| Signals | follow | sig-rsi-reversal-s@m15 | 27 | 25 (93 %) | 48 | 94 % | 16.42 | 135.36 | – |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 61 | 93 % | 447.98 | 128.86 | tp3 sl6 tr0.6 h48 (5 · 115.84 · 6.29) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 21 (70 %) | 218 | 73 % | 1.40 | 127.02 | tp5 sl10 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-zscore-s@m15 | 30 | 21 (70 %) | 218 | 73 % | 1.40 | 127.02 | tp5 sl10 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 21 (70 %) | 169 | 82 % | 1.64 | 116.65 | tp5 sl10 tr1 h48 (8 · 418.45 · 14.04) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 17 (57 %) | 582 | 68 % | 1.15 | 108.73 | tp8 sl16 tr1.6 h48 (24 · 16.21 · 24.21) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 20 (67 %) | 157 | 76 % | 1.49 | 106.46 | tp6 sl12 tr2.4 h48 (6 · ∞ (no loss) · 13.35) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 18 (60 %) | 637 | 70 % | 1.12 | 104.41 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 26 (87 %) | 171 | 72 % | 1.91 | 99.45 | tp3 sl9 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-volume-break-m@m15 | 29 | 27 (93 %) | 51 | 69 % | 12.81 | 86.34 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 17 (57 %) | 367 | 70 % | 1.15 | 85.95 | tp6 sl12 tr1.2 h48 (16 · 7.85 · 24.89) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 18 (60 %) | 210 | 72 % | 1.28 | 80.42 | tp3 sl6 tr0.9 h48 (11 · 58.13 · 13.34) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 17 (57 %) | 203 | 71 % | 1.21 | 70.09 | tp4 sl8 tr1.2 h48 (9 · 5.68 · 12.87) |
| Signals | follow | sig-s2-vol-break-s@m15 | 29 | 17 (59 %) | 33 | 52 % | 8.15 | 52.31 | – |
| Signals | follow | sig-volume-break-s@m15 | 29 | 15 (52 %) | 31 | 48 % | 8.00 | 51.19 | – |
| Signals | follow | sig-zscore-m@m15 | 26 | 19 (73 %) | 122 | 75 % | 1.40 | 46.18 | tp5 sl10 tr1.5 h48 (6 · 1.62 · 2.34) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 26 | 18 (69 %) | 54 | 70 % | 1.65 | 44.15 | – |
| Signals | follow | sig-mfi-m@m15 | 21 | 18 (86 %) | 59 | 73 % | 3.73 | 40.10 | tp3 sl6 tr0.9 h48 (5 · 24.58 · 4.01) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 21 (70 %) | 78 | 68 % | 1.31 | 35.49 | tp2.5 sl3.75 tr0 h48 (5 · 0.39 · -7.25) |
| Signals | follow | sig-trix-s@m15 | 30 | 15 (50 %) | 225 | 74 % | 1.07 | 22.97 | tp8 sl16 tr2.4 h48 (5 · ∞ (no loss) · 10.46) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 7.89 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 7 | 7 (100 %) | 11 | 64 % | 8.96 | 2.30 | – |
| Signals | follow | sig-squeeze-s@m15 | 6 | 3 (50 %) | 7 | 43 % | 0.05 | -8.30 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 20 (67 %) | 80 | 57 % | 0.82 | -20.22 | tp5 sl10 tr1 h48 (5 · 11.14 · 4.31) |
| Signals | follow | sig-hma-m@m15 | 30 | 11 (37 %) | 151 | 70 % | 0.86 | -36.67 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 15 (50 %) | 299 | 72 % | 0.92 | -42.50 | tp3 sl6 tr1.2 h48 (15 · 3.00 · 13.16) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 8 (27 %) | 152 | 74 % | 0.83 | -45.38 | tp8 sl16 tr1.6 h48 (6 · ∞ (no loss) · 7.64) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 29 | 13 (45 %) | 71 | 69 % | 0.68 | -46.60 | tp3 sl6 tr0.6 h48 (5 · 32.83 · 3.63) |
| Signals | follow | sig-vwap-s@m15 | 30 | 8 (27 %) | 322 | 67 % | 0.84 | -93.02 | tp5 sl10 tr1 h48 (16 · 1.65 · 7.08) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 7 (23 %) | 93 | 62 % | 0.62 | -96.03 | tp3 sl6 tr0.6 h48 (5 · 0.85 · -0.98) |
| Signals | follow | sig-trix-m@m15 | 30 | 6 (20 %) | 142 | 58 % | 0.60 | -134.43 | tp8 sl16 tr1.6 h48 (5 · 2.76 · 5.58) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 8 (27 %) | 314 | 73 % | 0.76 | -142.23 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 7 (23 %) | 71 | 35 % | 0.16 | -235.18 | – |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 4 (13 %) | 153 | 58 % | 0.43 | -249.80 | tp3 sl6 tr0.9 h48 (9 · 1.71 · 4.54) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr off | 115 | 104 (90 %) | 1161 | 90 % | 2.99 | 1957.13 |
| Signals | tp 2.500% | sl 3.00× | tr off | 115 | 105 (91 %) | 1337 | 91 % | 2.97 | 1847.00 |
| Signals | tp 4.000% | sl 3.00× | tr off | 114 | 97 (85 %) | 761 | 90 % | 2.96 | 1718.87 |
| Signals | tp 3.000% | sl 2.00× | tr off | 115 | 95 (83 %) | 1293 | 83 % | 2.17 | 1611.84 |
| Signals | tp 5.000% | sl 3.00× | tr off | 113 | 100 (88 %) | 546 | 89 % | 2.96 | 1545.12 |
| Signals | tp 4.000% | sl 2.00× | tr 0.40× | 115 | 105 (91 %) | 1462 | 82 % | 2.83 | 1525.28 |
| Signals | tp 5.000% | sl 2.00× | tr 0.20× | 118 | 106 (90 %) | 1832 | 78 % | 2.97 | 1494.12 |
| Signals | tp 4.000% | sl 2.00× | tr 0.30× | 117 | 104 (89 %) | 1731 | 78 % | 2.70 | 1492.28 |
| Signals | tp 4.000% | sl 2.00× | tr off | 114 | 98 (86 %) | 829 | 83 % | 2.31 | 1477.27 |
| Signals | tp 5.000% | sl 2.00× | tr 0.40× | 115 | 99 (86 %) | 1240 | 84 % | 2.75 | 1423.99 |
| Signals | tp 5.000% | sl 2.00× | tr off | 113 | 89 (79 %) | 586 | 84 % | 2.50 | 1403.76 |
| Signals | tp 6.000% | sl 2.00× | tr 0.20× | 117 | 101 (86 %) | 1684 | 79 % | 2.48 | 1373.91 |
| Signals | tp 5.000% | sl 2.00× | tr 0.30× | 115 | 102 (89 %) | 1457 | 81 % | 2.54 | 1338.82 |
| Signals | tp 8.000% | sl 2.00× | tr 0.20× | 115 | 107 (93 %) | 1362 | 83 % | 2.73 | 1330.02 |
| Signals | tp 3.000% | sl 2.00× | tr 0.40× | 117 | 99 (85 %) | 1875 | 76 % | 2.09 | 1286.07 |
| Signals | tp 8.000% | sl 2.00× | tr 0.30× | 115 | 100 (87 %) | 1075 | 83 % | 2.79 | 1278.05 |
| Signals | tp 6.000% | sl 2.00× | tr 0.40× | 115 | 96 (83 %) | 1112 | 82 % | 2.54 | 1276.59 |
| Signals | tp 6.000% | sl 3.00× | tr off | 106 | 87 (82 %) | 382 | 88 % | 2.80 | 1249.82 |
| Signals | tp 4.000% | sl 2.00× | tr 0.20× | 118 | 103 (87 %) | 2049 | 74 % | 2.34 | 1196.93 |
| Signals | tp 5.000% | sl 1.50× | tr off | 113 | 87 (77 %) | 650 | 76 % | 2.03 | 1195.54 |
| Signals | tp 4.000% | sl 1.50× | tr off | 115 | 90 (78 %) | 934 | 74 % | 1.75 | 1125.64 |
| Signals | tp 6.000% | sl 2.00× | tr off | 107 | 80 (75 %) | 412 | 82 % | 2.34 | 1121.46 |
| Signals | tp 6.000% | sl 2.00× | tr 0.30× | 115 | 97 (84 %) | 1279 | 81 % | 2.21 | 1104.44 |
| Signals | tp 3.000% | sl 2.00× | tr 0.30× | 118 | 101 (86 %) | 2094 | 74 % | 1.85 | 1022.99 |
| Signals | tp 2.500% | sl 2.00× | tr off | 115 | 89 (77 %) | 1532 | 78 % | 1.56 | 987.04 |
| Signals | tp 6.000% | sl 1.50× | tr off | 107 | 79 (74 %) | 461 | 75 % | 1.91 | 946.66 |
| Signals | tp 3.000% | sl 1.50× | tr off | 116 | 84 (72 %) | 1464 | 71 % | 1.46 | 908.64 |
| Signals | tp 3.000% | sl 2.00× | tr 0.20× | 118 | 98 (83 %) | 2426 | 66 % | 1.74 | 796.62 |
| Signals | tp 8.000% | sl 2.00× | tr 0.40× | 109 | 83 (76 %) | 747 | 83 % | 1.81 | 702.50 |
| Signals | tp 2.500% | sl 1.50× | tr off | 116 | 76 (66 %) | 1725 | 69 % | 1.30 | 627.19 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 30 (30) | 15340 | 5908 | 5908 | 0 | baseTarget 9432 |
| Micro | trailing | 30 (30) | 30680 | 11816 | 11816 | 0 | baseTarget 18864 |
| Short | normal | 246 (179) | 33516 | 10062 | 10062 | 0 | baseTarget 6858 · baseRange 16596 |
| Short | trailing | 246 (179) | 67032 | 20124 | 20124 | 0 | baseTarget 13716 · baseRange 33192 |
| General | normal | 246 (190) | 22344 | 7482 | 7482 | 0 | baseTarget 3798 · baseRange 11064 |
| General | trailing | 246 (190) | 14896 | 4988 | 4988 | 0 | baseTarget 2532 · baseRange 7376 |
| Long | normal | 246 (222) | 27930 | 12258 | 12258 | 0 | baseTarget 6162 · baseRange 9510 |
| Long | trailing | 246 (222) | 18620 | 8172 | 8172 | 0 | baseTarget 4108 · baseRange 6340 |
| Wide | axis | 276 (276) | 44820 | 44820 | 44820 | 0 | – |
| Wide | dca | 276 (276) | 3984 | 3984 | 3984 | 0 | – |
| Wide | dca-active | 276 (276) | 3984 | 3984 | 3984 | 0 | – |

Engine indications Base evaluated that built no set: 115 (bb-bounce, bb-walk, break-atr-0.9, cci-20-200, dir-emax-20-50, dir-macd, ema-21-55, hma-32, macd-cross-5-35-5, macd-cross-8-21-5, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-10, mc-brk-20, mc-burst-2, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-iz-25, mc-lag-6, mc-macdh, mc-mrsi2-10, mc-mturn-5, mc-qrsi2-5, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi3-5, mc-rsi4-20, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.26 (210) | 0.42 (342) | 0.43 (402) | 0.57 (630) | 0.50 (1020) |
| 1.14× | – | 0.22 (90) | – | – | – | – | – |
| 1.25× | – | 0.21 (90) | 0.43 (210) | 0.46 (342) | 0.39 (402) | 0.49 (630) | 0.43 (1020) |
| 1.33× | 0.33 (54) | – | – | – | – | – | – |
| 1.5× | 0.31 (54) | 0.31 (90) | 0.43 (210) | 0.40 (342) | 0.35 (402) | 0.44 (630) | 0.38 (1016) |
| 1.75× | 0.48 (54) | 0.51 (90) | 0.38 (210) | 0.36 (342) | 0.33 (402) | 0.45 (626) | 0.46 (1016) |
| 2× | 1.00 (54) | 0.46 (90) | 0.35 (210) | 0.35 (342) | 0.43 (402) | 0.53 (626) | 0.46 (1010) |
| 2.25× | 0.91 (54) | 0.42 (90) | 0.36 (210) | 0.50 (342) | 0.43 (402) | 0.78 (624) | 0.58 (1004) |
| 2.5× | 0.84 (54) | 0.38 (90) | 0.44 (210) | 0.46 (342) | 0.60 (402) | 0.72 (624) | 0.55 (1004) |
| 2.75× | 0.78 (54) | 0.35 (90) | 0.47 (210) | 0.72 (342) | 0.55 (402) | 0.67 (624) | 0.51 (1004) |
| 3× | 0.73 (54) | 0.48 (90) | 0.52 (210) | 0.67 (342) | 0.52 (402) | 0.64 (624) | 0.52 (980) |
| 3.25× | 0.68 (54) | 0.45 (90) | 0.73 (210) | 0.63 (342) | 0.49 (402) | 0.69 (608) | 0.49 (980) |
| 3.5× | 0.64 (54) | 1.47 (90) | 0.68 (210) | 0.61 (342) | 0.47 (402) | 0.65 (608) | 0.46 (980) |
| 3.75× | 0.60 (54) | 1.39 (90) | 0.64 (210) | 0.58 (342) | 0.49 (394) | 0.62 (608) | 0.46 (968) |
| 4× | 0.57 (54) | 1.31 (90) | 0.63 (210) | 0.64 (334) | 0.47 (394) | 0.59 (608) | 0.43 (968) |
| 4.25× | ∞ (54) | 1.24 (90) | 0.60 (210) | 0.61 (334) | 0.45 (394) | 0.59 (604) | 0.43 (964) |
| 4.5× | ∞ (54) | 1.18 (90) | 0.62 (208) | 0.59 (334) | 0.43 (394) | 0.56 (604) | 0.41 (964) |
| 4.75× | ∞ (54) | 1.13 (90) | 0.60 (208) | 0.56 (334) | 0.41 (394) | 0.59 (600) | 0.40 (960) |
| 5× | ∞ (54) | 1.08 (90) | 0.57 (208) | 0.54 (334) | 0.39 (394) | 0.60 (596) | 0.39 (960) |

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
| 1× | 1.14 (2098) | 1.07 (2426) | 0.85 (2722) | 1.03 (2869) | 1.15 (2789) | 1.16 (3352) |
| 1.5× | 1.22 (1948) | 1.01 (2318) | 0.85 (2503) | 0.98 (2596) | 1.13 (2542) | 1.21 (2994) |
| 2× | 1.33 (1818) | 1.05 (2170) | 0.80 (2395) | 1.12 (2450) | 1.32 (2379) | 1.51 (2758) |

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
| 0.5× | 1.20 (938) | 1.35 (1065) | 1.43 (1204) | 1.39 (1234) |
| 0.75× | 1.17 (878) | 1.24 (1000) | 1.21 (1101) | 1.32 (1080) |
| 1× | 1.08 (2431) | 1.55 (2664) | 1.36 (2884) | 1.32 (2982) |

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
| 0.5× | 1.31 (1276) | 1.16 (1222) | 1.02 (1556) | 0.99 (1402) | 1.25 (1715) |
| 0.75× | 1.40 (1044) | 1.34 (995) | 1.16 (1244) | 1.28 (1054) | 1.49 (1365) |
| 1× | 1.45 (2946) | 1.48 (2824) | 1.48 (3454) | 1.40 (3158) | 1.55 (4075) |

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
| 0.84× | 0.37 (2809) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.59 (144) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.53 (17769) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.68 (141) | 0.41 (820) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.68 (138) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.48 (792) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.49 (774) | – | – | – | – |
| 1× | – | – | – | 0.46 (76844) | – | – | – | 0.59 (18848) | 0.77 (3021) | – | 0.65 (1069) | – | 0.92 (2811) | 1.10 (2382) | 0.73 (922) | 0.82 (779) |

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
