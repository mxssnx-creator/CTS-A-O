# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T03:00 UTC. Engine: Base 1122/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126; Main 996 pairs, 137378 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 170 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (137378 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3401); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 27924 · 0.95 | 5579 · 1.25 | 8123 · 1.11 | 685 · 8.44 | – | – | – | – | – |
| 16:00 | 34729 · 0.44 | 9257 · 0.69 | 12041 · 0.63 | 2177 · 2.05 | – | – | – | – | – |
| 17:00 | 24538 · 0.55 | 4438 · 0.46 | 11251 · 0.45 | 1181 · 5.52 | – | – | – | – | – |
| 18:00 | 25177 · 1.45 | 8244 · 1.67 | 10238 · 2.35 | 2984 · 4.39 | – | – | – | – | – |
| 19:00 | 21351 · 1.18 | 6071 · 1.61 | 4934 · 1.36 | 1479 · 3.29 | – | – | – | – | – |
| 20:00 | 31123 · 3.14 | 10841 · 4.88 | 9401 · 3.30 | 2513 · 3.13 | – | – | – | – | – |
| 21:00 | 21353 · 2.17 | 5295 · 1.58 | 8577 · 5.09 | 1811 · 4.81 | – | – | – | – | – |
| 22:00 | 16865 · 0.98 | 3881 · 1.19 | 3727 · 1.90 | 1647 · 5.53 | – | – | – | – | – |
| 23:00 | 17836 · 0.56 | 5374 · 0.74 | 5025 · 0.48 | 1952 · 4.18 | – | – | – | – | – |
| 00:00 | 28753 · 1.08 | 7873 · 1.05 | 9803 · 1.47 | 4000 · 0.65 | – | – | – | – | – |
| 01:00 | 35818 · 1.19 | 7871 · 1.61 | 11979 · 1.63 | 2591 · 1.15 | – | – | – | – | – |
| 02:00 | 35887 · 1.28 | 10987 · 1.71 | 10481 · 2.88 | 5355 · 3.79 | – | – | – | – | – |
| **total** | **321354 · 1.08** | **85711 · 1.41** | **105580 · 1.41** | **28375 · 2.20** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 52276 | sig:confirm 52276 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 133598 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2085 units active at the run start, 2827 over the run, 3401 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1707 | 1357 (79 %) | 14016 | 79 % | 1.96 | 18213.65 |
| Signals | trailing | 1694 | 1425 (84 %) | 14359 | 82 % | 2.57 | 19346.94 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 52 (87 %) | 533 | 80 % | 2.21 | 673.63 |
| Signals | signal:act-hf | 60 | 30 (50 %) | 766 | 69 % | 1.11 | 156.35 |
| Signals | signal:adx | 60 | 56 (93 %) | 360 | 86 % | 4.99 | 920.44 |
| Signals | signal:atr-break | 60 | 57 (95 %) | 707 | 85 % | 3.83 | 1357.35 |
| Signals | signal:bollinger | 58 | 35 (60 %) | 291 | 77 % | 1.22 | 118.54 |
| Signals | signal:cci | 60 | 35 (58 %) | 323 | 76 % | 1.44 | 231.64 |
| Signals | signal:cmf | 60 | 44 (73 %) | 711 | 79 % | 1.38 | 440.29 |
| Signals | signal:donchian | 60 | 60 (100 %) | 413 | 88 % | 11.28 | 1027.35 |
| Signals | signal:ema-cross | 60 | 32 (53 %) | 246 | 72 % | 1.10 | 47.89 |
| Signals | signal:ema-cross-fast | 60 | 55 (92 %) | 450 | 81 % | 1.68 | 471.85 |
| Signals | signal:ema-pullback | 60 | 47 (78 %) | 506 | 82 % | 2.20 | 701.92 |
| Signals | signal:ema-slope | 50 | 32 (64 %) | 294 | 72 % | 1.05 | 33.08 |
| Signals | signal:ema-trend | 60 | 35 (58 %) | 408 | 77 % | 1.24 | 189.22 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1151 | 80 % | 2.12 | 1391.29 |
| Signals | signal:hma | 60 | 50 (83 %) | 562 | 79 % | 1.83 | 571.61 |
| Signals | signal:ichimoku | 60 | 53 (88 %) | 377 | 82 % | 2.07 | 437.81 |
| Signals | signal:impulse | 60 | 60 (100 %) | 731 | 82 % | 5.10 | 1420.46 |
| Signals | signal:kama | 60 | 52 (87 %) | 915 | 80 % | 1.78 | 936.19 |
| Signals | signal:keltner | 59 | 57 (97 %) | 368 | 92 % | 13.78 | 947.71 |
| Signals | signal:macd-cross | 60 | 60 (100 %) | 737 | 85 % | 3.68 | 1311.30 |
| Signals | signal:macd-hist | 60 | 59 (98 %) | 963 | 83 % | 2.73 | 1453.69 |
| Signals | signal:macd-slow | 60 | 39 (65 %) | 648 | 82 % | 2.00 | 751.26 |
| Signals | signal:mfi | 15 | 12 (80 %) | 28 | 79 % | 3.33 | 32.48 |
| Signals | signal:obv | 60 | 47 (78 %) | 376 | 82 % | 2.04 | 498.18 |
| Signals | signal:r-awesome | 56 | 46 (82 %) | 567 | 75 % | 1.63 | 428.27 |
| Signals | signal:r-connors | 60 | 14 (23 %) | 195 | 59 % | 0.50 | -368.40 |
| Signals | signal:r-fractal | 60 | 55 (92 %) | 330 | 78 % | 3.83 | 515.36 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 72 | 93 % | 245.63 | 190.29 |
| Signals | signal:r-linreg | 60 | 28 (47 %) | 485 | 75 % | 1.06 | 66.19 |
| Signals | signal:r-nr-break | 60 | 48 (80 %) | 799 | 77 % | 1.56 | 645.18 |
| Signals | signal:r-session-trend | 60 | 41 (68 %) | 209 | 82 % | 2.36 | 300.59 |
| Signals | signal:r-vol-regime | 60 | 57 (95 %) | 330 | 85 % | 6.25 | 649.97 |
| Signals | signal:reclaim | 60 | 45 (75 %) | 519 | 78 % | 1.39 | 359.52 |
| Signals | signal:rsi-mid | 60 | 58 (97 %) | 752 | 86 % | 2.96 | 1313.88 |
| Signals | signal:rsi-momentum | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 |
| Signals | signal:rsi-reversal | 46 | 44 (96 %) | 79 | 95 % | 14.76 | 238.04 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 1059 | 82 % | 3.11 | 1772.94 |
| Signals | signal:s2-adx-gate | 60 | 52 (87 %) | 469 | 83 % | 3.06 | 803.10 |
| Signals | signal:s2-atr-break | 60 | 57 (95 %) | 838 | 79 % | 2.05 | 971.86 |
| Signals | signal:s2-bb-bounce | 54 | 37 (69 %) | 140 | 80 % | 2.26 | 196.58 |
| Signals | signal:s2-block-scale | 60 | 40 (67 %) | 925 | 73 % | 1.18 | 292.39 |
| Signals | signal:s2-block-stack | 60 | 56 (93 %) | 417 | 85 % | 5.33 | 1072.08 |
| Signals | signal:s2-confluence | 60 | 47 (78 %) | 430 | 87 % | 3.47 | 785.93 |
| Signals | signal:s2-ema-cross | 1 | 1 (100 %) | 2 | 100 % | ∞ (no loss) | 0.82 |
| Signals | signal:s2-range-break | 60 | 59 (98 %) | 307 | 81 % | 5.58 | 691.42 |
| Signals | signal:s2-range-shift | 60 | 58 (97 %) | 559 | 88 % | 9.32 | 1296.62 |
| Signals | signal:s2-rsi-revert | 52 | 38 (73 %) | 95 | 77 % | 2.24 | 132.30 |
| Signals | signal:s2-st-trail | 31 | 31 (100 %) | 119 | 95 % | 494.27 | 391.48 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 334 | 87 % | 6.14 | 781.50 |
| Signals | signal:s2-vol-break | 54 | 32 (59 %) | 84 | 63 % | 1.00 | 0.41 |
| Signals | signal:sar | 60 | 51 (85 %) | 830 | 79 % | 1.68 | 784.11 |
| Signals | signal:squeeze | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 132 | 95 % | 823.00 | 424.75 |
| Signals | signal:stoch-rsi | 60 | 52 (87 %) | 708 | 79 % | 1.81 | 737.07 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 307 | 80 % | 5.30 | 603.02 |
| Signals | signal:swing | 60 | 60 (100 %) | 818 | 86 % | 4.94 | 1747.04 |
| Signals | signal:thrust | 60 | 58 (97 %) | 970 | 87 % | 3.83 | 1944.58 |
| Signals | signal:trix | 60 | 30 (50 %) | 292 | 72 % | 1.21 | 120.19 |
| Signals | signal:volume-break | 54 | 45 (83 %) | 68 | 78 % | 19.07 | 176.23 |
| Signals | signal:vwap | 60 | 40 (67 %) | 322 | 76 % | 1.19 | 123.89 |
| Signals | signal:williams-r | 60 | 54 (90 %) | 535 | 82 % | 2.16 | 715.76 |
| Signals | signal:zscore | 51 | 34 (67 %) | 242 | 76 % | 1.32 | 126.24 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 17724 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17724 | 0 |  |
| Short | 30186 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30186 | 0 |  |
| General | 12470 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12470 | 0 |  |
| Long | 20430 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20430 | 0 |  |
| Wide | 52788 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52788 | 0 |  |
| Signals | 3780 | – | 2085 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2085 units (pair × symbol × direction) active at the run start, 2827 over the run; 3401 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1620 (86 %) | 25258 | 80 % | 2.39 | 31715.67 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 52 (87 %) | 533 | 80 % | 2.21 | 673.63 |
| Signals | signal:act-hf | 60 | 30 (50 %) | 766 | 69 % | 1.11 | 156.35 |
| Signals | signal:adx | 60 | 56 (93 %) | 360 | 86 % | 4.99 | 920.44 |
| Signals | signal:atr-break | 60 | 57 (95 %) | 707 | 85 % | 3.83 | 1357.35 |
| Signals | signal:bollinger | 58 | 35 (60 %) | 291 | 77 % | 1.22 | 118.54 |
| Signals | signal:cci | 60 | 35 (58 %) | 323 | 76 % | 1.44 | 231.64 |
| Signals | signal:cmf | 60 | 44 (73 %) | 711 | 79 % | 1.38 | 440.29 |
| Signals | signal:donchian | 60 | 60 (100 %) | 413 | 88 % | 11.28 | 1027.35 |
| Signals | signal:ema-cross | 60 | 32 (53 %) | 246 | 72 % | 1.10 | 47.89 |
| Signals | signal:ema-cross-fast | 60 | 55 (92 %) | 450 | 81 % | 1.68 | 471.85 |
| Signals | signal:ema-pullback | 60 | 47 (78 %) | 506 | 82 % | 2.20 | 701.92 |
| Signals | signal:ema-slope | 50 | 32 (64 %) | 294 | 72 % | 1.05 | 33.08 |
| Signals | signal:ema-trend | 60 | 35 (58 %) | 408 | 77 % | 1.24 | 189.22 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1151 | 80 % | 2.12 | 1391.29 |
| Signals | signal:hma | 60 | 50 (83 %) | 562 | 79 % | 1.83 | 571.61 |
| Signals | signal:ichimoku | 60 | 53 (88 %) | 377 | 82 % | 2.07 | 437.81 |
| Signals | signal:impulse | 60 | 60 (100 %) | 731 | 82 % | 5.10 | 1420.46 |
| Signals | signal:kama | 60 | 52 (87 %) | 915 | 80 % | 1.78 | 936.19 |
| Signals | signal:keltner | 59 | 57 (97 %) | 368 | 92 % | 13.78 | 947.71 |
| Signals | signal:macd-cross | 60 | 60 (100 %) | 737 | 85 % | 3.68 | 1311.30 |
| Signals | signal:macd-hist | 60 | 59 (98 %) | 963 | 83 % | 2.73 | 1453.69 |
| Signals | signal:macd-slow | 60 | 39 (65 %) | 648 | 82 % | 2.00 | 751.26 |
| Signals | signal:mfi | 15 | 12 (80 %) | 28 | 79 % | 3.33 | 32.48 |
| Signals | signal:obv | 60 | 47 (78 %) | 376 | 82 % | 2.04 | 498.18 |
| Signals | signal:r-awesome | 56 | 46 (82 %) | 567 | 75 % | 1.63 | 428.27 |
| Signals | signal:r-connors | 60 | 14 (23 %) | 195 | 59 % | 0.50 | -368.40 |
| Signals | signal:r-fractal | 60 | 55 (92 %) | 330 | 78 % | 3.83 | 515.36 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 72 | 93 % | 245.63 | 190.29 |
| Signals | signal:r-linreg | 60 | 28 (47 %) | 485 | 75 % | 1.06 | 66.19 |
| Signals | signal:r-nr-break | 60 | 48 (80 %) | 799 | 77 % | 1.56 | 645.18 |
| Signals | signal:r-session-trend | 60 | 41 (68 %) | 209 | 82 % | 2.36 | 300.59 |
| Signals | signal:r-vol-regime | 60 | 57 (95 %) | 330 | 85 % | 6.25 | 649.97 |
| Signals | signal:reclaim | 60 | 45 (75 %) | 519 | 78 % | 1.39 | 359.52 |
| Signals | signal:rsi-mid | 60 | 58 (97 %) | 752 | 86 % | 2.96 | 1313.88 |
| Signals | signal:rsi-momentum | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 |
| Signals | signal:rsi-reversal | 46 | 44 (96 %) | 79 | 95 % | 14.76 | 238.04 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 1059 | 82 % | 3.11 | 1772.94 |
| Signals | signal:s2-adx-gate | 60 | 52 (87 %) | 469 | 83 % | 3.06 | 803.10 |
| Signals | signal:s2-atr-break | 60 | 57 (95 %) | 838 | 79 % | 2.05 | 971.86 |
| Signals | signal:s2-bb-bounce | 54 | 37 (69 %) | 140 | 80 % | 2.26 | 196.58 |
| Signals | signal:s2-block-scale | 60 | 40 (67 %) | 925 | 73 % | 1.18 | 292.39 |
| Signals | signal:s2-block-stack | 60 | 56 (93 %) | 417 | 85 % | 5.33 | 1072.08 |
| Signals | signal:s2-confluence | 60 | 47 (78 %) | 430 | 87 % | 3.47 | 785.93 |
| Signals | signal:s2-ema-cross | 1 | 1 (100 %) | 2 | 100 % | ∞ (no loss) | 0.82 |
| Signals | signal:s2-range-break | 60 | 59 (98 %) | 307 | 81 % | 5.58 | 691.42 |
| Signals | signal:s2-range-shift | 60 | 58 (97 %) | 559 | 88 % | 9.32 | 1296.62 |
| Signals | signal:s2-rsi-revert | 52 | 38 (73 %) | 95 | 77 % | 2.24 | 132.30 |
| Signals | signal:s2-st-trail | 31 | 31 (100 %) | 119 | 95 % | 494.27 | 391.48 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 334 | 87 % | 6.14 | 781.50 |
| Signals | signal:s2-vol-break | 54 | 32 (59 %) | 84 | 63 % | 1.00 | 0.41 |
| Signals | signal:sar | 60 | 51 (85 %) | 830 | 79 % | 1.68 | 784.11 |
| Signals | signal:squeeze | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 132 | 95 % | 823.00 | 424.75 |
| Signals | signal:stoch-rsi | 60 | 52 (87 %) | 708 | 79 % | 1.81 | 737.07 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 307 | 80 % | 5.30 | 603.02 |
| Signals | signal:swing | 60 | 60 (100 %) | 818 | 86 % | 4.94 | 1747.04 |
| Signals | signal:thrust | 60 | 58 (97 %) | 970 | 87 % | 3.83 | 1944.58 |
| Signals | signal:trix | 60 | 30 (50 %) | 292 | 72 % | 1.21 | 120.19 |
| Signals | signal:volume-break | 54 | 45 (83 %) | 68 | 78 % | 19.07 | 176.23 |
| Signals | signal:vwap | 60 | 40 (67 %) | 322 | 76 % | 1.19 | 123.89 |
| Signals | signal:williams-r | 60 | 54 (90 %) | 535 | 82 % | 2.16 | 715.76 |
| Signals | signal:zscore | 51 | 34 (67 %) | 242 | 76 % | 1.32 | 126.24 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1057 | 889 (84 %) | 10512 | 81 % | 2.30 | 13952.87 |
| Signals | 1.25 | 623 | 541 (87 %) | 6824 | 82 % | 2.52 | 9169.06 |
| Signals | 1.35 | 457 | 400 (88 %) | 5457 | 83 % | 2.65 | 7188.05 |
| Signals | 1.5 | 286 | 254 (89 %) | 3807 | 83 % | 2.83 | 4945.13 |
| Signals | 1.75 | 165 | 145 (88 %) | 2501 | 83 % | 2.96 | 3041.07 |
| Signals | 2 | 100 | 91 (91 %) | 1635 | 84 % | 3.13 | 1928.25 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 431 | 89 % | 12.87 | 1126.92 | tp4 sl12 tr3.2 h48 (15 · ∞ (no loss) · 49.60) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 475 | 86 % | 6.32 | 1005.20 | tp4 sl12 tr3.2 h48 (16 · 567.89 · 53.20) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 460 | 88 % | 4.76 | 978.73 | tp5 sl15 tr4 h48 (11 · ∞ (no loss) · 48.24) |
| Signals | follow | sig-thrust-m@m15 | 30 | 28 (93 %) | 510 | 86 % | 3.26 | 965.85 | tp5 sl10 tr0 h48 (11 · ∞ (no loss) · 51.35) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 30 (100 %) | 529 | 82 % | 3.12 | 888.42 | tp4 sl12 tr0 h48 (14 · ∞ (no loss) · 53.20) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 30 (100 %) | 530 | 82 % | 3.11 | 884.52 | tp4 sl12 tr0 h48 (14 · ∞ (no loss) · 53.20) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 433 | 89 % | 5.11 | 880.61 | tp2.5 sl7.5 tr0 h48 (23 · 17.40 · 47.69) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 325 | 95 % | 59.17 | 873.42 | tp3 sl6 tr0 h48 (14 · ∞ (no loss) · 39.20) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 30 (100 %) | 366 | 90 % | 11.43 | 872.99 | tp5 sl7.5 tr0 h48 (9 · ∞ (no loss) · 43.20) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 299 | 86 % | 30.81 | 751.15 | tp3 sl9 tr1.2 h48 (19 · 35.93 · 33.67) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 30 (100 %) | 267 | 92 % | 17.19 | 730.98 | tp8 sl24 tr6.4 h48 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 30 (100 %) | 449 | 84 % | 3.28 | 730.08 | tp3 sl9 tr2.4 h48 (22 · 33.98 · 46.67) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 30 (100 %) | 449 | 84 % | 3.28 | 730.08 | tp3 sl9 tr2.4 h48 (22 · 33.98 · 46.67) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 29 (97 %) | 514 | 83 % | 2.39 | 723.61 | tp3 sl9 tr1.2 h48 (34 · 4.80 · 38.97) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 254 | 95 % | 27.95 | 717.99 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 658 | 79 % | 1.85 | 717.27 | tp4 sl12 tr0 h48 (16 · 4.67 · 44.80) |
| Signals | follow | sig-keltner-s@m15 | 30 | 30 (100 %) | 244 | 94 % | 25.56 | 700.76 | tp8 sl24 tr3.2 h48 (8 · ∞ (no loss) · 29.37) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 28 (93 %) | 264 | 86 % | 5.50 | 680.17 | tp8 sl24 tr6.4 h48 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 30 (100 %) | 493 | 80 % | 2.70 | 674.03 | tp2.5 sl7.5 tr0 h48 (27 · 3.73 · 42.10) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 27 (90 %) | 440 | 80 % | 2.44 | 626.37 | tp3 sl6 tr0 h48 (20 · 8.58 · 47.00) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 30 (100 %) | 348 | 86 % | 3.26 | 626.03 | tp4 sl12 tr2.4 h48 (13 · ∞ (no loss) · 36.11) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 387 | 84 % | 2.78 | 620.12 | tp6 sl12 tr0 h48 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-adx-s@m15 | 30 | 30 (100 %) | 201 | 92 % | 8.21 | 588.51 | tp4 sl8 tr0 h48 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 30 (100 %) | 288 | 89 % | 4.42 | 581.22 | tp4 sl12 tr3.2 h48 (10 · ∞ (no loss) · 34.32) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 203 | 89 % | 23.87 | 579.15 | tp8 sl24 tr3.2 h48 (7 · 294.81 · 27.57) |
| Signals | follow | sig-kama-s@m15 | 30 | 27 (90 %) | 488 | 81 % | 1.85 | 523.07 | tp4 sl12 tr3.2 h48 (16 · 3.71 · 33.51) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 28 (93 %) | 443 | 80 % | 2.04 | 507.15 | tp3 sl9 tr2.4 h48 (21 · 4.23 · 32.16) |
| Signals | follow | sig-hma-s@m15 | 30 | 29 (97 %) | 416 | 80 % | 2.18 | 506.75 | tp6 sl18 tr4.8 h48 (7 · 657.51 · 29.61) |
| Signals | follow | sig-sar-m@m15 | 30 | 27 (90 %) | 398 | 81 % | 2.06 | 500.54 | tp4 sl12 tr0 h48 (13 · 3.74 · 33.40) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 30 (100 %) | 227 | 86 % | 5.29 | 496.62 | tp3 sl9 tr2.4 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 26 (87 %) | 399 | 79 % | 2.07 | 488.11 | tp8 sl24 tr6.4 h48 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 266 | 77 % | 4.46 | 484.82 | tp4 sl12 tr0 h48 (8 · 46.95 · 26.03) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 214 | 87 % | 8.48 | 478.48 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 29 (97 %) | 395 | 78 % | 2.07 | 464.71 | tp3 sl9 tr0 h48 (15 · 4.26 · 30.00) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 28 (93 %) | 459 | 78 % | 1.78 | 452.43 | tp5 sl15 tr0 h48 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-donchian-s@m15 | 30 | 30 (100 %) | 210 | 87 % | 7.00 | 448.19 | tp3 sl9 tr0 h48 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 28 (93 %) | 427 | 79 % | 1.67 | 440.46 | tp4 sl12 tr2.4 h48 (14 · 3.13 · 27.33) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 27 (90 %) | 378 | 80 % | 1.93 | 428.91 | tp3 sl9 tr0 h48 (14 · 3.96 · 27.20) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 132 | 95 % | 823.00 | 424.75 | tp3 sl4.5 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 28 (93 %) | 193 | 84 % | 6.88 | 423.63 | tp2.5 sl7.5 tr0 h48 (9 · ∞ (no loss) · 20.70) |
| Signals | follow | sig-impulse-m@m15 | 30 | 30 (100 %) | 256 | 75 % | 3.63 | 415.26 | tp3 sl9 tr1.8 h48 (14 · 17.71 · 24.31) |
| Signals | follow | sig-kama-m@m15 | 30 | 25 (83 %) | 427 | 79 % | 1.71 | 413.12 | tp4 sl12 tr3.2 h48 (13 · 3.74 · 33.40) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 29 (97 %) | 213 | 82 % | 5.16 | 403.27 | tp3 sl6 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 30 (100 %) | 173 | 80 % | 5.15 | 396.56 | tp5 sl10 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 28 (93 %) | 153 | 84 % | 5.06 | 391.90 | tp6 sl18 tr2.4 h48 (5 · 77.52 · 17.74) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 30 (100 %) | 118 | 95 % | 493.92 | 391.20 | tp3 sl4.5 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 27 (90 %) | 223 | 83 % | 2.82 | 382.30 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-obv-m@m15 | 30 | 27 (90 %) | 136 | 90 % | 6.82 | 341.26 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 19.28) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 27 (90 %) | 312 | 82 % | 1.82 | 333.46 | tp3 sl9 tr1.2 h48 (21 · 6.11 · 28.01) |
| Signals | follow | sig-adx-m@m15 | 30 | 26 (87 %) | 159 | 79 % | 3.23 | 331.93 | tp5 sl15 tr3 h48 (5 · ∞ (no loss) · 19.73) |
| Signals | follow | sig-cmf-m@m15 | 30 | 22 (73 %) | 296 | 84 % | 1.76 | 308.72 | tp3 sl4.5 tr0 h48 (15 · 3.87 · 27.00) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 25 (83 %) | 330 | 78 % | 1.69 | 308.15 | tp2.5 sl7.5 tr0 h48 (14 · 3.88 · 22.20) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 30 (100 %) | 110 | 90 % | 11.74 | 302.04 | tp4 sl12 tr1.6 h48 (6 · ∞ (no loss) · 16.74) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 29 (97 %) | 134 | 84 % | 6.32 | 294.86 | tp2.5 sl7.5 tr0 h48 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 29 (97 %) | 107 | 91 % | 8.83 | 284.88 | tp4 sl8 tr0 h48 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-cci-m@m15 | 30 | 27 (90 %) | 113 | 89 % | 6.23 | 283.57 | tp5 sl15 tr2 h48 (6 · ∞ (no loss) · 15.45) |
| Signals | follow | sig-sar-s@m15 | 30 | 24 (80 %) | 432 | 76 % | 1.41 | 283.57 | tp5 sl15 tr0 h48 (10 · 2.84 · 28.00) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 19 (63 %) | 365 | 75 % | 1.62 | 281.78 | tp3 sl9 tr0 h48 (13 · ∞ (no loss) · 36.40) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 26 (87 %) | 340 | 79 % | 1.44 | 270.74 | tp4 sl12 tr2.4 h48 (13 · 3.24 · 27.30) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 29 (97 %) | 295 | 81 % | 1.56 | 270.34 | tp8 sl24 tr4.8 h48 (5 · ∞ (no loss) · 18.15) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 26 | 26 (100 %) | 93 | 91 % | 251.68 | 267.48 | tp5 sl15 tr2 h48 (5 · 82.74 · 14.23) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 89 | 93 % | 10.77 | 258.29 | – |
| Signals | follow | sig-reclaim-m@m15 | 30 | 25 (83 %) | 204 | 81 % | 1.86 | 251.51 | tp3 sl9 tr1.2 h48 (13 · 20.64 · 19.59) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 28 (93 %) | 138 | 85 % | 6.44 | 248.54 | tp2.5 sl7.5 tr0 h48 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-keltner-m@m15 | 29 | 27 (93 %) | 124 | 89 % | 6.41 | 246.95 | tp3 sl9 tr1.8 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 23 (77 %) | 390 | 74 % | 1.41 | 230.41 | tp3 sl9 tr0 h48 (16 · 2.13 · 20.80) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 23 (77 %) | 479 | 74 % | 1.27 | 220.64 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 26 (87 %) | 155 | 80 % | 1.96 | 201.51 | tp6 sl18 tr2.4 h48 (5 · ∞ (no loss) · 15.41) |
| Signals | follow | sig-r-awesome-m@m15 | 26 | 23 (88 %) | 177 | 79 % | 2.54 | 197.86 | tp4 sl12 tr3.2 h48 (7 · 365.19 · 19.06) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 20 (67 %) | 340 | 74 % | 1.33 | 192.75 | tp5 sl10 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 72 | 93 % | 245.63 | 190.29 | – |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 25 (83 %) | 239 | 80 % | 1.52 | 189.27 | tp4 sl12 tr2.4 h48 (10 · 2.23 · 15.01) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 26 (87 %) | 134 | 85 % | 2.81 | 185.52 | tp3 sl9 tr1.8 h48 (8 · ∞ (no loss) · 18.77) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 27 (90 %) | 116 | 79 % | 3.87 | 171.48 | tp3 sl9 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-obv-s@m15 | 30 | 20 (67 %) | 240 | 77 % | 1.37 | 156.92 | tp4 sl12 tr1.6 h48 (10 · ∞ (no loss) · 24.09) |
| Signals | follow | sig-cmf-s@m15 | 30 | 22 (73 %) | 415 | 75 % | 1.18 | 131.57 | tp4 sl12 tr1.6 h48 (24 · 1.84 · 20.70) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 23 | 23 (100 %) | 41 | 95 % | 15.19 | 122.72 | – |
| Signals | follow | sig-ema-slope-m@m15 | 20 | 18 (90 %) | 60 | 82 % | 4.71 | 119.84 | tp2.5 sl3.75 tr0 h48 (6 · 0.58 · -4.95) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 21 (70 %) | 235 | 80 % | 1.26 | 118.96 | tp3 sl9 tr1.2 h48 (13 · 2.70 · 15.96) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 29 (97 %) | 41 | 98 % | 619.28 | 118.20 | – |
| Signals | follow | sig-rsi-reversal-s@m15 | 23 | 21 (91 %) | 38 | 95 % | 14.33 | 115.32 | – |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 26 (87 %) | 117 | 72 % | 2.31 | 112.09 | tp3 sl9 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 20 (67 %) | 315 | 76 % | 1.17 | 108.00 | tp3 sl9 tr1.2 h48 (21 · 1.87 · 16.11) |
| Signals | follow | sig-volume-break-m@m15 | 27 | 25 (93 %) | 41 | 80 % | 15.49 | 99.30 | – |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 22 (73 %) | 165 | 75 % | 1.35 | 93.42 | tp6 sl18 tr2.4 h48 (5 · 4.75 · 10.44) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 23 (77 %) | 61 | 77 % | 2.34 | 91.23 | tp2.5 sl3.75 tr0 h48 (5 · 0.39 · -7.25) |
| Signals | follow | sig-s2-vol-break-s@m15 | 27 | 21 (78 %) | 28 | 75 % | 27.70 | 77.49 | – |
| Signals | follow | sig-volume-break-s@m15 | 27 | 20 (74 %) | 27 | 74 % | 27.51 | 76.94 | – |
| Signals | follow | sig-zscore-m@m15 | 22 | 17 (77 %) | 73 | 79 % | 2.17 | 76.51 | tp3 sl4.5 tr0 h48 (6 · 1.19 · 1.80) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 17 (57 %) | 158 | 74 % | 1.25 | 75.89 | tp4 sl12 tr1.6 h48 (7 · ∞ (no loss) · 19.11) |
| Signals | follow | sig-trix-s@m15 | 30 | 18 (60 %) | 169 | 74 % | 1.24 | 74.01 | tp5 sl15 tr3 h48 (5 · 10.03 · 14.38) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 17 (57 %) | 446 | 71 % | 1.09 | 71.75 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 14 (47 %) | 173 | 74 % | 1.21 | 70.26 | tp3 sl9 tr1.2 h48 (10 · ∞ (no loss) · 17.80) |
| Signals | follow | sig-bollinger-m@m15 | 29 | 18 (62 %) | 122 | 80 % | 1.34 | 68.81 | tp6 sl18 tr2.4 h48 (6 · ∞ (no loss) · 13.35) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 17 (57 %) | 176 | 76 % | 1.23 | 67.94 | tp3 sl9 tr2.4 h48 (8 · ∞ (no loss) · 17.22) |
| Signals | follow | sig-hma-m@m15 | 30 | 21 (70 %) | 146 | 75 % | 1.25 | 64.86 | tp3 sl4.5 tr0 h48 (6 · 2.98 · 9.30) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 22 (73 %) | 170 | 76 % | 1.14 | 51.95 | tp4 sl8 tr0 h48 (6 · 2.32 · 10.80) |
| Signals | follow | sig-bollinger-s@m15 | 29 | 17 (59 %) | 169 | 75 % | 1.15 | 49.72 | tp5 sl15 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-zscore-s@m15 | 29 | 17 (59 %) | 169 | 75 % | 1.15 | 49.72 | tp5 sl15 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-trix-m@m15 | 30 | 12 (40 %) | 123 | 68 % | 1.17 | 46.18 | tp2.5 sl7.5 tr0 h48 (5 · 1.19 · 1.50) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 22 | 15 (68 %) | 34 | 76 % | 2.06 | 41.08 | – |
| Signals | follow | sig-r-connors-m@m15 | 30 | 13 (43 %) | 144 | 75 % | 1.11 | 35.96 | tp3 sl9 tr1.2 h48 (10 · 211.91 · 16.89) |
| Signals | follow | sig-mfi-m@m15 | 15 | 12 (80 %) | 28 | 79 % | 3.33 | 32.48 | tp3 sl9 tr1.2 h48 (5 · 104.15 · 3.73) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 11 (37 %) | 99 | 73 % | 0.99 | -1.45 | tp5 sl15 tr2 h48 (6 · 56.39 · 9.34) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 10 (33 %) | 81 | 67 % | 0.77 | -45.53 | tp3 sl9 tr1.2 h48 (5 · 0.76 · -2.22) |
| Signals | follow | sig-cci-s@m15 | 30 | 8 (27 %) | 210 | 69 % | 0.89 | -51.94 | tp5 sl15 tr2 h48 (10 · 98.41 · 22.35) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 28 | 11 (39 %) | 47 | 57 % | 0.54 | -70.90 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 27 | 11 (41 %) | 56 | 57 % | 0.55 | -77.08 | – |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 14 (47 %) | 234 | 70 % | 0.85 | -86.76 | tp2.5 sl5 tr0 h48 (11 · 1.99 · 10.30) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 11 (37 %) | 401 | 64 % | 0.86 | -125.42 | tp6 sl18 tr4.8 h48 (6 · ∞ (no loss) · 29.10) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 9 (30 %) | 215 | 69 % | 0.76 | -129.35 | tp8 sl24 tr3.2 h48 (5 · 72.03 · 5.78) |
| Signals | follow | sig-vwap-s@m15 | 30 | 10 (33 %) | 233 | 69 % | 0.78 | -134.40 | tp5 sl15 tr4 h48 (6 · 1.33 · 4.99) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 2 (7 %) | 145 | 65 % | 0.59 | -204.55 | tp3 sl6 tr0 h48 (8 · 1.35 · 4.40) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 1 (3 %) | 51 | 16 % | 0.03 | -404.37 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 116 | 104 (90 %) | 1268 | 83 % | 3.20 | 1831.44 |
| Signals | tp 3.000% | sl 3.00× | tr off | 116 | 106 (91 %) | 1143 | 90 % | 2.71 | 1810.73 |
| Signals | tp 2.500% | sl 3.00× | tr off | 116 | 105 (91 %) | 1318 | 90 % | 2.74 | 1728.09 |
| Signals | tp 4.000% | sl 3.00× | tr off | 115 | 98 (85 %) | 753 | 89 % | 2.76 | 1628.03 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 116 | 103 (89 %) | 1413 | 83 % | 2.91 | 1609.96 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 118 | 103 (87 %) | 1715 | 80 % | 3.03 | 1606.09 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 116 | 100 (86 %) | 1143 | 82 % | 2.79 | 1535.82 |
| Signals | tp 5.000% | sl 3.00× | tr off | 114 | 101 (89 %) | 541 | 89 % | 2.94 | 1525.68 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 116 | 108 (93 %) | 1181 | 85 % | 3.07 | 1488.65 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 115 | 94 (82 %) | 906 | 83 % | 2.58 | 1488.61 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 114 | 99 (87 %) | 653 | 84 % | 2.78 | 1479.97 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 116 | 102 (88 %) | 1414 | 82 % | 2.54 | 1411.09 |
| Signals | tp 3.000% | sl 2.00× | tr off | 116 | 92 (79 %) | 1288 | 81 % | 1.93 | 1408.84 |
| Signals | tp 4.000% | sl 2.00× | tr off | 115 | 99 (86 %) | 822 | 82 % | 2.19 | 1394.23 |
| Signals | tp 5.000% | sl 2.00× | tr off | 114 | 90 (79 %) | 586 | 83 % | 2.35 | 1333.32 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 116 | 98 (84 %) | 891 | 81 % | 2.52 | 1250.75 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 116 | 98 (84 %) | 1062 | 82 % | 2.48 | 1222.21 |
| Signals | tp 6.000% | sl 3.00× | tr off | 107 | 88 (82 %) | 382 | 88 % | 2.65 | 1207.38 |
| Signals | tp 5.000% | sl 1.50× | tr off | 114 | 91 (80 %) | 650 | 75 % | 1.95 | 1137.60 |
| Signals | tp 6.000% | sl 2.00× | tr off | 108 | 80 (74 %) | 411 | 82 % | 2.30 | 1103.22 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 110 | 87 (79 %) | 526 | 82 % | 2.20 | 1033.89 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 99 | 79 (80 %) | 289 | 84 % | 2.65 | 988.83 |
| Signals | tp 4.000% | sl 1.50× | tr off | 116 | 87 (75 %) | 943 | 72 % | 1.58 | 949.84 |
| Signals | tp 6.000% | sl 1.50× | tr off | 108 | 83 (77 %) | 463 | 74 % | 1.84 | 903.82 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 111 | 82 (74 %) | 708 | 77 % | 1.84 | 859.49 |
| Signals | tp 2.500% | sl 2.00× | tr off | 116 | 86 (74 %) | 1532 | 76 % | 1.44 | 822.04 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 109 | 85 (78 %) | 721 | 85 % | 2.07 | 816.30 |
| Signals | tp 3.000% | sl 1.50× | tr off | 116 | 77 (66 %) | 1462 | 69 % | 1.36 | 753.04 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 106 | 83 (78 %) | 469 | 84 % | 2.03 | 723.85 |
| Signals | tp 2.500% | sl 1.50× | tr off | 116 | 74 (64 %) | 1722 | 68 % | 1.23 | 507.79 |

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
