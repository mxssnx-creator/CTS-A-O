# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T03:00 UTC. Engine: Base 1122/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126; Main 996 pairs, 137378 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 161 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (137378 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3405); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 27956 · 0.95 | 5579 · 1.25 | 8155 · 1.10 | 648 · 16.69 | – | – | – | – | – |
| 16:00 | 34984 · 0.44 | 9257 · 0.69 | 12296 · 0.62 | 2344 · 1.59 | – | – | – | – | – |
| 17:00 | 24688 · 0.54 | 4438 · 0.46 | 11401 · 0.44 | 1242 · 4.00 | – | – | – | – | – |
| 18:00 | 25398 · 1.38 | 8244 · 1.67 | 10459 · 1.95 | 3041 · 3.74 | – | – | – | – | – |
| 19:00 | 21610 · 1.13 | 6071 · 1.61 | 5193 · 1.17 | 1478 · 2.54 | – | – | – | – | – |
| 20:00 | 31274 · 3.02 | 10841 · 4.88 | 9552 · 2.81 | 2562 · 2.79 | – | – | – | – | – |
| 21:00 | 21553 · 1.98 | 5295 · 1.58 | 8777 · 3.39 | 1849 · 3.49 | – | – | – | – | – |
| 22:00 | 17104 · 0.94 | 3881 · 1.19 | 3966 · 1.57 | 1717 · 3.32 | – | – | – | – | – |
| 23:00 | 18008 · 0.55 | 5374 · 0.74 | 5197 · 0.46 | 1970 · 3.46 | – | – | – | – | – |
| 00:00 | 29044 · 1.08 | 7873 · 1.05 | 10094 · 1.45 | 4052 · 0.71 | – | – | – | – | – |
| 01:00 | 35979 · 1.26 | 7871 · 1.61 | 12140 · 1.98 | 2597 · 1.72 | – | – | – | – | – |
| 02:00 | 36247 · 1.22 | 10987 · 1.71 | 10841 · 2.15 | 5416 · 3.00 | – | – | – | – | – |
| **total** | **323845 · 1.06** | **85711 · 1.41** | **108071 · 1.32** | **28916 · 2.10** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 52348 | sig:confirm 52348 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 133598 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2070 units active at the run start, 2809 over the run, 3405 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1707 | 1370 (80 %) | 13826 | 80 % | 2.04 | 18937.32 |
| Signals | trailing | 1698 | 1361 (80 %) | 15090 | 79 % | 2.17 | 17183.40 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 53 (88 %) | 557 | 80 % | 2.25 | 691.07 |
| Signals | signal:act-hf | 60 | 41 (68 %) | 810 | 70 % | 1.33 | 405.80 |
| Signals | signal:adx | 60 | 56 (93 %) | 378 | 86 % | 4.75 | 927.85 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 735 | 83 % | 3.43 | 1313.72 |
| Signals | signal:bollinger | 60 | 34 (57 %) | 306 | 75 % | 1.18 | 105.72 |
| Signals | signal:cci | 60 | 36 (60 %) | 327 | 75 % | 1.45 | 236.57 |
| Signals | signal:cmf | 60 | 46 (77 %) | 719 | 77 % | 1.41 | 453.41 |
| Signals | signal:donchian | 60 | 60 (100 %) | 437 | 90 % | 24.60 | 1188.71 |
| Signals | signal:ema-cross | 60 | 20 (33 %) | 254 | 67 % | 0.84 | -96.09 |
| Signals | signal:ema-cross-fast | 60 | 49 (82 %) | 465 | 78 % | 1.50 | 384.85 |
| Signals | signal:ema-pullback | 60 | 42 (70 %) | 510 | 79 % | 1.76 | 542.31 |
| Signals | signal:ema-slope | 50 | 30 (60 %) | 300 | 71 % | 1.06 | 39.02 |
| Signals | signal:ema-trend | 60 | 32 (53 %) | 457 | 73 % | 1.18 | 169.78 |
| Signals | signal:heikin-ashi | 60 | 58 (97 %) | 1172 | 78 % | 1.87 | 1217.03 |
| Signals | signal:hma | 60 | 44 (73 %) | 564 | 76 % | 1.38 | 331.85 |
| Signals | signal:ichimoku | 60 | 51 (85 %) | 387 | 80 % | 1.78 | 370.24 |
| Signals | signal:impulse | 60 | 60 (100 %) | 721 | 83 % | 6.02 | 1473.56 |
| Signals | signal:kama | 60 | 57 (95 %) | 994 | 80 % | 2.02 | 1176.01 |
| Signals | signal:keltner | 59 | 57 (97 %) | 368 | 92 % | 13.78 | 947.71 |
| Signals | signal:macd-cross | 60 | 58 (97 %) | 719 | 86 % | 3.38 | 1240.36 |
| Signals | signal:macd-hist | 60 | 60 (100 %) | 985 | 82 % | 2.55 | 1394.54 |
| Signals | signal:macd-slow | 60 | 36 (60 %) | 665 | 80 % | 1.73 | 640.42 |
| Signals | signal:mfi | 15 | 12 (80 %) | 28 | 79 % | 3.33 | 32.48 |
| Signals | signal:obv | 60 | 48 (80 %) | 391 | 79 % | 1.94 | 480.00 |
| Signals | signal:r-awesome | 56 | 49 (88 %) | 552 | 74 % | 1.68 | 438.94 |
| Signals | signal:r-connors | 60 | 16 (27 %) | 199 | 58 % | 0.57 | -287.99 |
| Signals | signal:r-fractal | 60 | 54 (90 %) | 333 | 78 % | 3.47 | 496.76 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 72 | 93 % | 245.63 | 190.29 |
| Signals | signal:r-linreg | 60 | 32 (53 %) | 484 | 71 % | 0.97 | -36.68 |
| Signals | signal:r-nr-break | 60 | 53 (88 %) | 817 | 77 % | 1.76 | 785.45 |
| Signals | signal:r-session-trend | 60 | 36 (60 %) | 218 | 78 % | 1.82 | 235.79 |
| Signals | signal:r-vol-regime | 60 | 57 (95 %) | 335 | 83 % | 5.08 | 621.22 |
| Signals | signal:reclaim | 60 | 45 (75 %) | 529 | 76 % | 1.40 | 369.53 |
| Signals | signal:rsi-mid | 60 | 58 (97 %) | 754 | 87 % | 3.83 | 1484.18 |
| Signals | signal:rsi-momentum | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 |
| Signals | signal:rsi-reversal | 46 | 44 (96 %) | 79 | 95 % | 14.76 | 238.04 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 1107 | 81 % | 2.72 | 1684.93 |
| Signals | signal:s2-adx-gate | 59 | 54 (92 %) | 464 | 83 % | 4.24 | 887.70 |
| Signals | signal:s2-atr-break | 60 | 60 (100 %) | 852 | 78 % | 2.14 | 1019.53 |
| Signals | signal:s2-bb-bounce | 54 | 31 (57 %) | 146 | 77 % | 1.69 | 143.38 |
| Signals | signal:s2-block-scale | 60 | 41 (68 %) | 986 | 70 % | 1.13 | 226.73 |
| Signals | signal:s2-block-stack | 60 | 56 (93 %) | 424 | 84 % | 4.42 | 1020.93 |
| Signals | signal:s2-confluence | 60 | 44 (73 %) | 396 | 87 % | 3.21 | 698.88 |
| Signals | signal:s2-ema-cross | 1 | 1 (100 %) | 2 | 100 % | ∞ (no loss) | 0.82 |
| Signals | signal:s2-range-break | 60 | 54 (90 %) | 206 | 75 % | 3.26 | 332.22 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 587 | 87 % | 6.91 | 1300.19 |
| Signals | signal:s2-rsi-revert | 52 | 32 (62 %) | 99 | 70 % | 1.46 | 74.85 |
| Signals | signal:s2-st-trail | 31 | 31 (100 %) | 119 | 95 % | 494.27 | 391.48 |
| Signals | signal:s2-stoch-swing | 60 | 60 (100 %) | 347 | 85 % | 4.58 | 731.66 |
| Signals | signal:s2-vol-break | 56 | 32 (57 %) | 86 | 62 % | 0.97 | -5.99 |
| Signals | signal:sar | 60 | 55 (92 %) | 870 | 79 % | 1.90 | 971.88 |
| Signals | signal:squeeze | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 132 | 95 % | 823.00 | 424.75 |
| Signals | signal:stoch-rsi | 60 | 49 (82 %) | 675 | 76 % | 1.58 | 553.04 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 312 | 79 % | 4.10 | 562.02 |
| Signals | signal:swing | 60 | 60 (100 %) | 829 | 85 % | 4.55 | 1708.84 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1004 | 86 % | 3.78 | 1982.49 |
| Signals | signal:trix | 60 | 17 (28 %) | 283 | 63 % | 0.76 | -180.51 |
| Signals | signal:volume-break | 54 | 45 (83 %) | 68 | 78 % | 19.07 | 176.23 |
| Signals | signal:vwap | 60 | 36 (60 %) | 337 | 72 % | 1.15 | 99.89 |
| Signals | signal:williams-r | 60 | 48 (80 %) | 535 | 80 % | 1.92 | 618.46 |
| Signals | signal:zscore | 52 | 30 (58 %) | 257 | 74 % | 1.19 | 85.98 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 17724 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17724 | 0 |  |
| Short | 30186 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30186 | 0 |  |
| General | 12470 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12470 | 0 |  |
| Long | 20430 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20430 | 0 |  |
| Wide | 52788 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52788 | 0 |  |
| Signals | 3780 | – | 2070 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2070 units (pair × symbol × direction) active at the run start, 2809 over the run; 3405 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1554 (82 %) | 27749 | 76 % | 1.83 | 25536.11 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 53 (88 %) | 557 | 80 % | 2.25 | 691.07 |
| Signals | signal:act-hf | 60 | 41 (68 %) | 810 | 70 % | 1.33 | 405.80 |
| Signals | signal:adx | 60 | 56 (93 %) | 378 | 86 % | 4.75 | 927.85 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 735 | 83 % | 3.43 | 1313.72 |
| Signals | signal:bollinger | 60 | 34 (57 %) | 306 | 75 % | 1.18 | 105.72 |
| Signals | signal:cci | 60 | 36 (60 %) | 327 | 75 % | 1.45 | 236.57 |
| Signals | signal:cmf | 60 | 46 (77 %) | 719 | 77 % | 1.41 | 453.41 |
| Signals | signal:donchian | 60 | 60 (100 %) | 437 | 90 % | 24.60 | 1188.71 |
| Signals | signal:ema-cross | 60 | 20 (33 %) | 254 | 67 % | 0.84 | -96.09 |
| Signals | signal:ema-cross-fast | 60 | 49 (82 %) | 465 | 78 % | 1.50 | 384.85 |
| Signals | signal:ema-pullback | 60 | 42 (70 %) | 510 | 79 % | 1.76 | 542.31 |
| Signals | signal:ema-slope | 50 | 30 (60 %) | 300 | 71 % | 1.06 | 39.02 |
| Signals | signal:ema-trend | 60 | 32 (53 %) | 457 | 73 % | 1.18 | 169.78 |
| Signals | signal:heikin-ashi | 60 | 58 (97 %) | 1172 | 78 % | 1.87 | 1217.03 |
| Signals | signal:hma | 60 | 44 (73 %) | 564 | 76 % | 1.38 | 331.85 |
| Signals | signal:ichimoku | 60 | 51 (85 %) | 387 | 80 % | 1.78 | 370.24 |
| Signals | signal:impulse | 60 | 60 (100 %) | 721 | 83 % | 6.02 | 1473.56 |
| Signals | signal:kama | 60 | 57 (95 %) | 994 | 80 % | 2.02 | 1176.01 |
| Signals | signal:keltner | 59 | 57 (97 %) | 368 | 92 % | 13.78 | 947.71 |
| Signals | signal:macd-cross | 60 | 58 (97 %) | 719 | 86 % | 3.38 | 1240.36 |
| Signals | signal:macd-hist | 60 | 60 (100 %) | 985 | 82 % | 2.55 | 1394.54 |
| Signals | signal:macd-slow | 60 | 36 (60 %) | 665 | 80 % | 1.73 | 640.42 |
| Signals | signal:mfi | 15 | 12 (80 %) | 28 | 79 % | 3.33 | 32.48 |
| Signals | signal:obv | 60 | 48 (80 %) | 391 | 79 % | 1.94 | 480.00 |
| Signals | signal:r-awesome | 56 | 49 (88 %) | 552 | 74 % | 1.68 | 438.94 |
| Signals | signal:r-connors | 60 | 16 (27 %) | 199 | 58 % | 0.57 | -287.99 |
| Signals | signal:r-fractal | 60 | 54 (90 %) | 333 | 78 % | 3.47 | 496.76 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 72 | 93 % | 245.63 | 190.29 |
| Signals | signal:r-linreg | 60 | 32 (53 %) | 484 | 71 % | 0.97 | -36.68 |
| Signals | signal:r-nr-break | 60 | 53 (88 %) | 817 | 77 % | 1.76 | 785.45 |
| Signals | signal:r-session-trend | 60 | 36 (60 %) | 218 | 78 % | 1.82 | 235.79 |
| Signals | signal:r-vol-regime | 60 | 57 (95 %) | 335 | 83 % | 5.08 | 621.22 |
| Signals | signal:reclaim | 60 | 45 (75 %) | 529 | 76 % | 1.40 | 369.53 |
| Signals | signal:rsi-mid | 60 | 58 (97 %) | 754 | 87 % | 3.83 | 1484.18 |
| Signals | signal:rsi-momentum | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 |
| Signals | signal:rsi-reversal | 46 | 44 (96 %) | 79 | 95 % | 14.76 | 238.04 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 1107 | 81 % | 2.72 | 1684.93 |
| Signals | signal:s2-adx-gate | 59 | 54 (92 %) | 464 | 83 % | 4.24 | 887.70 |
| Signals | signal:s2-atr-break | 60 | 60 (100 %) | 852 | 78 % | 2.14 | 1019.53 |
| Signals | signal:s2-bb-bounce | 54 | 31 (57 %) | 146 | 77 % | 1.69 | 143.38 |
| Signals | signal:s2-block-scale | 60 | 41 (68 %) | 986 | 70 % | 1.13 | 226.73 |
| Signals | signal:s2-block-stack | 60 | 56 (93 %) | 424 | 84 % | 4.42 | 1020.93 |
| Signals | signal:s2-confluence | 60 | 44 (73 %) | 396 | 87 % | 3.21 | 698.88 |
| Signals | signal:s2-ema-cross | 1 | 1 (100 %) | 2 | 100 % | ∞ (no loss) | 0.82 |
| Signals | signal:s2-range-break | 60 | 54 (90 %) | 206 | 75 % | 3.26 | 332.22 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 587 | 87 % | 6.91 | 1300.19 |
| Signals | signal:s2-rsi-revert | 52 | 32 (62 %) | 99 | 70 % | 1.46 | 74.85 |
| Signals | signal:s2-st-trail | 31 | 31 (100 %) | 119 | 95 % | 494.27 | 391.48 |
| Signals | signal:s2-stoch-swing | 60 | 60 (100 %) | 347 | 85 % | 4.58 | 731.66 |
| Signals | signal:s2-vol-break | 56 | 32 (57 %) | 86 | 62 % | 0.97 | -5.99 |
| Signals | signal:sar | 60 | 55 (92 %) | 870 | 79 % | 1.90 | 971.88 |
| Signals | signal:squeeze | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 132 | 95 % | 823.00 | 424.75 |
| Signals | signal:stoch-rsi | 60 | 49 (82 %) | 675 | 76 % | 1.58 | 553.04 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 312 | 79 % | 4.10 | 562.02 |
| Signals | signal:swing | 60 | 60 (100 %) | 829 | 85 % | 4.55 | 1708.84 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1004 | 86 % | 3.78 | 1982.49 |
| Signals | signal:trix | 60 | 17 (28 %) | 283 | 63 % | 0.76 | -180.51 |
| Signals | signal:volume-break | 54 | 45 (83 %) | 68 | 78 % | 19.07 | 176.23 |
| Signals | signal:vwap | 60 | 36 (60 %) | 337 | 72 % | 1.15 | 99.89 |
| Signals | signal:williams-r | 60 | 48 (80 %) | 535 | 80 % | 1.92 | 618.46 |
| Signals | signal:zscore | 52 | 30 (58 %) | 257 | 74 % | 1.19 | 85.98 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 942 | 760 (81 %) | 9040 | 80 % | 2.17 | 11800.49 |
| Signals | 1.25 | 496 | 410 (83 %) | 5230 | 80 % | 2.29 | 6823.35 |
| Signals | 1.35 | 334 | 270 (81 %) | 3672 | 80 % | 2.26 | 4575.48 |
| Signals | 1.5 | 186 | 154 (83 %) | 2215 | 81 % | 2.51 | 2874.52 |
| Signals | 1.75 | 83 | 68 (82 %) | 1095 | 81 % | 2.42 | 1281.42 |
| Signals | 2 | 46 | 38 (83 %) | 614 | 81 % | 2.42 | 695.57 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 458 | 89 % | 14.47 | 1111.70 | tp3 sl9 tr0 h48 (20 · ∞ (no loss) · 56.00) |
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 437 | 88 % | 9.25 | 1089.72 | tp4 sl8 tr3.2 h48 (15 · ∞ (no loss) · 49.60) |
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 534 | 86 % | 3.82 | 1074.77 | tp4 sl8 tr2.4 h48 (24 · 7.42 · 56.63) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 470 | 86 % | 3.74 | 907.73 | tp5 sl15 tr0 h48 (10 · ∞ (no loss) · 48.00) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 30 (100 %) | 366 | 90 % | 11.43 | 872.99 | tp5 sl7.5 tr0 h48 (9 · ∞ (no loss) · 43.20) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 321 | 95 % | 59.72 | 872.66 | tp3 sl6 tr0 h48 (14 · ∞ (no loss) · 39.20) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 30 (100 %) | 553 | 81 % | 2.73 | 844.42 | tp4 sl12 tr0 h48 (14 · ∞ (no loss) · 53.20) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 30 (100 %) | 554 | 81 % | 2.72 | 840.51 | tp4 sl12 tr0 h48 (14 · ∞ (no loss) · 53.20) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 436 | 88 % | 3.99 | 828.59 | tp2.5 sl7.5 tr0 h48 (22 · ∞ (no loss) · 50.60) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 322 | 85 % | 16.61 | 758.23 | tp3 sl4.5 tr0 h48 (14 · 45.67 · 35.60) |
| Signals | follow | sig-kama-s@m15 | 30 | 29 (97 %) | 561 | 81 % | 2.23 | 736.83 | tp3 sl9 tr0 h48 (20 · 5.78 · 44.00) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 30 (100 %) | 267 | 92 % | 17.19 | 730.98 | tp8 sl16 tr6.4 h48 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 255 | 95 % | 22.68 | 711.79 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-keltner-s@m15 | 30 | 30 (100 %) | 244 | 94 % | 25.56 | 700.76 | tp8 sl16 tr3.2 h48 (8 · ∞ (no loss) · 29.37) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 30 (100 %) | 456 | 82 % | 2.99 | 699.08 | tp2.5 sl7.5 tr0 h48 (22 · 6.27 · 40.60) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 30 (100 %) | 456 | 82 % | 2.99 | 699.08 | tp2.5 sl7.5 tr0 h48 (22 · 6.27 · 40.60) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 679 | 78 % | 1.79 | 695.62 | tp4 sl12 tr0 h48 (16 · 4.67 · 44.80) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 30 (100 %) | 529 | 81 % | 2.26 | 695.45 | tp3 sl9 tr0 h48 (21 · 2.89 · 34.80) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 29 (97 %) | 265 | 86 % | 5.13 | 669.22 | tp8 sl16 tr6.4 h48 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 392 | 83 % | 2.77 | 619.12 | tp6 sl12 tr0 h48 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 28 (93 %) | 433 | 81 % | 2.20 | 611.51 | tp4 sl8 tr2.4 h48 (15 · 4.61 · 31.91) |
| Signals | follow | sig-donchian-s@m15 | 30 | 30 (100 %) | 234 | 91 % | 25.33 | 609.56 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-adx-s@m15 | 30 | 30 (100 %) | 218 | 91 % | 7.69 | 604.12 | tp4 sl8 tr0 h48 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 28 (93 %) | 468 | 78 % | 2.18 | 582.74 | tp4 sl12 tr0 h48 (11 · ∞ (no loss) · 41.80) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 203 | 89 % | 23.87 | 579.15 | tp8 sl16 tr3.2 h48 (7 · 294.81 · 27.57) |
| Signals | follow | sig-sar-m@m15 | 30 | 27 (90 %) | 399 | 81 % | 2.38 | 563.34 | tp4 sl12 tr0 h48 (13 · 3.74 · 33.40) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 28 (93 %) | 263 | 91 % | 4.20 | 541.27 | tp4 sl8 tr2.4 h48 (9 · ∞ (no loss) · 31.29) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 30 (100 %) | 365 | 82 % | 2.41 | 528.63 | tp5 sl10 tr4 h48 (9 · ∞ (no loss) · 34.81) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 30 (100 %) | 454 | 78 % | 2.07 | 522.42 | tp2.5 sl7.5 tr0 h48 (21 · 2.84 · 28.30) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 30 (100 %) | 457 | 79 % | 2.04 | 521.84 | tp5 sl15 tr0 h48 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 28 (93 %) | 493 | 78 % | 2.00 | 521.41 | tp4 sl8 tr1.6 h48 (26 · 8.94 · 40.13) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 27 (90 %) | 412 | 78 % | 2.20 | 517.75 | tp8 sl16 tr6.4 h48 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 30 (100 %) | 398 | 78 % | 2.24 | 497.11 | tp3 sl9 tr0 h48 (15 · 4.26 · 30.00) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 217 | 86 % | 6.75 | 462.13 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 271 | 76 % | 3.45 | 443.82 | tp4 sl12 tr0 h48 (8 · 46.95 · 26.03) |
| Signals | follow | sig-kama-m@m15 | 30 | 28 (93 %) | 433 | 78 % | 1.79 | 439.17 | tp4 sl12 tr0 h48 (12 · 3.43 · 29.60) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 27 (90 %) | 221 | 81 % | 4.13 | 427.20 | tp2.5 sl7.5 tr0 h48 (10 · ∞ (no loss) · 23.00) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 132 | 95 % | 823.00 | 424.75 | tp3 sl4.5 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 30 (100 %) | 244 | 82 % | 3.23 | 424.48 | tp3 sl9 tr0 h48 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-sar-s@m15 | 30 | 28 (93 %) | 471 | 77 % | 1.61 | 408.54 | tp5 sl15 tr0 h48 (11 · 3.16 · 32.80) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 29 (97 %) | 213 | 82 % | 5.16 | 403.27 | tp3 sl6 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 30 (100 %) | 118 | 95 % | 493.92 | 391.20 | tp3 sl4.5 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-obv-m@m15 | 30 | 30 (100 %) | 128 | 96 % | 21.54 | 381.36 | tp8 sl16 tr3.2 h48 (5 · ∞ (no loss) · 19.28) |
| Signals | follow | sig-impulse-m@m15 | 30 | 30 (100 %) | 263 | 73 % | 2.71 | 361.86 | tp3 sl9 tr0 h48 (9 · 28.11 · 21.60) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 26 (87 %) | 372 | 76 % | 1.94 | 360.34 | tp3 sl9 tr0 h48 (13 · ∞ (no loss) · 36.40) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 27 (90 %) | 159 | 81 % | 3.57 | 351.70 | tp6 sl12 tr2.4 h48 (5 · 77.52 · 17.74) |
| Signals | follow | sig-cmf-m@m15 | 30 | 26 (87 %) | 292 | 84 % | 2.00 | 346.99 | tp3 sl4.5 tr0 h48 (14 · 3.57 · 24.20) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 25 (83 %) | 327 | 80 % | 1.77 | 342.96 | tp5 sl7.5 tr0 h48 (7 · 3.74 · 21.10) |
| Signals | follow | sig-adx-m@m15 | 30 | 26 (87 %) | 160 | 79 % | 3.06 | 323.73 | tp5 sl10 tr3 h48 (5 · ∞ (no loss) · 19.73) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 30 (100 %) | 103 | 94 % | 22.81 | 307.18 | tp4 sl6 tr0 h48 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 30 (100 %) | 110 | 90 % | 11.74 | 302.04 | tp4 sl8 tr1.6 h48 (6 · ∞ (no loss) · 16.74) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 26 (87 %) | 326 | 76 % | 1.61 | 280.83 | tp5 sl7.5 tr0 h48 (7 · 3.74 · 21.10) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 23 (77 %) | 208 | 81 % | 2.20 | 275.49 | tp3 sl6 tr1.8 h48 (13 · 44.59 · 26.00) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 23 (77 %) | 349 | 77 % | 1.55 | 272.21 | tp3 sl9 tr0 h48 (13 · 3.65 · 24.40) |
| Signals | follow | sig-hma-s@m15 | 30 | 25 (83 %) | 418 | 76 % | 1.43 | 270.23 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-cci-m@m15 | 30 | 27 (90 %) | 113 | 88 % | 4.91 | 268.25 | tp5 sl10 tr2 h48 (6 · ∞ (no loss) · 15.45) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 26 | 26 (100 %) | 93 | 91 % | 251.68 | 267.48 | tp5 sl10 tr2 h48 (5 · 82.74 · 14.23) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 23 (77 %) | 360 | 74 % | 1.50 | 263.61 | tp5 sl10 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 28 (93 %) | 358 | 76 % | 1.42 | 261.15 | tp4 sl12 tr0 h48 (10 · 2.80 · 22.00) |
| Signals | follow | sig-keltner-m@m15 | 29 | 27 (93 %) | 124 | 89 % | 6.41 | 246.95 | tp3 sl6 tr1.8 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 92 | 90 % | 6.32 | 239.69 | tp3 sl6 tr1.2 h48 (5 · 1.58 · 3.57) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 25 (83 %) | 400 | 72 % | 1.42 | 233.41 | tp3 sl9 tr0 h48 (16 · 2.13 · 20.80) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 28 (93 %) | 141 | 83 % | 4.58 | 229.94 | tp2.5 sl7.5 tr0 h48 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 25 (83 %) | 304 | 79 % | 1.44 | 229.54 | tp3 sl6 tr2.4 h48 (13 · 2.26 · 15.66) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 29 (97 %) | 123 | 73 % | 3.18 | 212.86 | tp2.5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-r-awesome-m@m15 | 26 | 24 (92 %) | 152 | 81 % | 3.22 | 205.53 | tp4 sl8 tr3.2 h48 (6 · 363.06 · 18.95) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 24 (80 %) | 211 | 78 % | 1.60 | 204.11 | tp4 sl8 tr0 h48 (8 · 3.24 · 18.40) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 25 (83 %) | 510 | 72 % | 1.22 | 192.70 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 72 | 93 % | 245.63 | 190.29 | – |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 21 (70 %) | 285 | 75 % | 1.33 | 173.71 | tp5 sl10 tr2 h48 (10 · 2.99 · 20.30) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 26 (87 %) | 145 | 84 % | 2.41 | 173.32 | tp3 sl6 tr1.8 h48 (10 · 3.48 · 15.37) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 21 (70 %) | 318 | 75 % | 1.29 | 165.41 | tp5 sl10 tr2 h48 (11 · 2.80 · 18.67) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 27 (90 %) | 118 | 78 % | 3.21 | 159.08 | tp3 sl9 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 24 (80 %) | 161 | 77 % | 1.60 | 155.31 | tp4 sl6 tr0 h48 (6 · 3.06 · 12.80) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 23 (77 %) | 246 | 78 % | 1.34 | 140.30 | tp4 sl8 tr1.6 h48 (11 · 2.71 · 14.05) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 29 | 24 (83 %) | 142 | 80 % | 1.57 | 129.46 | tp2.5 sl5 tr0 h48 (8 · 3.10 · 10.90) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 23 | 23 (100 %) | 41 | 95 % | 15.19 | 122.72 | – |
| Signals | follow | sig-ema-slope-m@m15 | 20 | 18 (90 %) | 60 | 82 % | 4.71 | 119.84 | tp2.5 sl3.75 tr0 h48 (6 · 0.58 · -4.95) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 25 (83 %) | 83 | 77 % | 3.41 | 119.36 | tp3 sl6 tr1.8 h48 (5 · 2.65 · 3.58) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 29 (97 %) | 41 | 98 % | 619.28 | 118.20 | – |
| Signals | follow | sig-rsi-reversal-s@m15 | 23 | 21 (91 %) | 38 | 95 % | 14.33 | 115.32 | – |
| Signals | follow | sig-cmf-s@m15 | 30 | 20 (67 %) | 427 | 73 % | 1.14 | 106.42 | tp4 sl8 tr1.6 h48 (25 · 1.83 · 20.50) |
| Signals | follow | sig-volume-break-m@m15 | 27 | 25 (93 %) | 41 | 80 % | 15.49 | 99.30 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 18 (60 %) | 263 | 70 % | 1.20 | 98.64 | tp8 sl16 tr3.2 h48 (6 · ∞ (no loss) · 21.05) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 25 (83 %) | 120 | 70 % | 1.90 | 93.49 | tp3 sl9 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-s2-vol-break-s@m15 | 27 | 21 (78 %) | 28 | 75 % | 27.70 | 77.49 | – |
| Signals | follow | sig-volume-break-s@m15 | 27 | 20 (74 %) | 27 | 74 % | 27.51 | 76.94 | – |
| Signals | follow | sig-r-connors-m@m15 | 30 | 15 (50 %) | 147 | 73 % | 1.23 | 67.36 | tp5 sl10 tr2 h48 (5 · ∞ (no loss) · 16.13) |
| Signals | follow | sig-hma-m@m15 | 30 | 19 (63 %) | 146 | 75 % | 1.24 | 61.62 | tp3 sl4.5 tr0 h48 (6 · 2.98 · 9.30) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 20 (67 %) | 64 | 70 % | 1.57 | 57.30 | tp2.5 sl3.75 tr0 h48 (5 · 0.39 · -7.25) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 17 (57 %) | 127 | 78 % | 1.23 | 54.49 | tp6 sl12 tr2.4 h48 (6 · ∞ (no loss) · 13.35) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 17 (57 %) | 179 | 74 % | 1.14 | 51.23 | tp5 sl10 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-zscore-s@m15 | 30 | 17 (57 %) | 179 | 74 % | 1.14 | 51.23 | tp5 sl10 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 15 (50 %) | 438 | 65 % | 1.05 | 45.45 | tp8 sl16 tr6.4 h48 (5 · 60.41 · 30.68) |
| Signals | follow | sig-zscore-m@m15 | 22 | 13 (59 %) | 78 | 73 % | 1.33 | 34.75 | tp3 sl4.5 tr0 h48 (6 · 1.19 · 1.80) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 16 (53 %) | 476 | 68 % | 1.04 | 34.03 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-mfi-m@m15 | 15 | 12 (80 %) | 28 | 79 % | 3.33 | 32.48 | tp3 sl6 tr1.2 h48 (5 · 104.15 · 3.73) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 15 (50 %) | 174 | 71 % | 1.07 | 22.62 | tp3 sl6 tr1.8 h48 (9 · 2.77 · 10.98) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 22 | 12 (55 %) | 35 | 69 % | 1.29 | 17.55 | – |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 12 (40 %) | 145 | 71 % | 1.04 | 13.69 | tp4 sl8 tr1.6 h48 (6 · ∞ (no loss) · 18.33) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 11 (37 %) | 172 | 69 % | 0.99 | -3.92 | tp4 sl8 tr1.6 h48 (7 · 5.03 · 11.09) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 14 (47 %) | 141 | 74 % | 0.95 | -12.91 | tp3 sl6 tr1.2 h48 (7 · ∞ (no loss) · 14.02) |
| Signals | follow | sig-trix-s@m15 | 30 | 12 (40 %) | 181 | 69 % | 0.95 | -18.39 | tp4 sl12 tr0 h48 (6 · 1.56 · 6.80) |
| Signals | follow | sig-cci-s@m15 | 30 | 9 (30 %) | 214 | 68 % | 0.93 | -31.68 | tp3 sl6 tr1.8 h48 (11 · 3.05 · 13.96) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 6 (20 %) | 108 | 67 % | 0.74 | -66.25 | tp4 sl8 tr1.6 h48 (7 · 1.14 · 1.14) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 12 (40 %) | 240 | 69 % | 0.86 | -80.82 | tp3 sl6 tr1.2 h48 (15 · 3.00 · 13.16) |
| Signals | follow | sig-s2-vol-break-m@m15 | 29 | 11 (38 %) | 58 | 55 % | 0.53 | -83.48 | – |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 5 (17 %) | 80 | 56 % | 0.54 | -118.71 | tp3 sl6 tr1.2 h48 (5 · 0.50 · -6.17) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 28 | 5 (18 %) | 53 | 51 % | 0.40 | -124.10 | – |
| Signals | follow | sig-vwap-s@m15 | 30 | 6 (20 %) | 245 | 66 % | 0.78 | -139.80 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-trix-m@m15 | 30 | 5 (17 %) | 102 | 53 % | 0.53 | -162.12 | tp2.5 sl5 tr0 h48 (5 · 0.66 · -3.50) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 6 (20 %) | 229 | 65 % | 0.68 | -188.17 | tp3 sl9 tr0 h48 (9 · 1.07 · 1.20) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 4 (13 %) | 126 | 55 % | 0.37 | -297.83 | tp3 sl6 tr0 h48 (7 · 1.13 · 1.60) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 1 (3 %) | 52 | 15 % | 0.03 | -355.35 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr off | 116 | 106 (91 %) | 1134 | 90 % | 2.87 | 1863.24 |
| Signals | tp 2.500% | sl 3.00× | tr off | 116 | 104 (90 %) | 1304 | 90 % | 2.86 | 1761.52 |
| Signals | tp 4.000% | sl 3.00× | tr off | 115 | 98 (85 %) | 746 | 89 % | 2.81 | 1633.43 |
| Signals | tp 3.000% | sl 2.00× | tr off | 116 | 97 (84 %) | 1267 | 82 % | 2.10 | 1530.04 |
| Signals | tp 5.000% | sl 3.00× | tr off | 114 | 100 (88 %) | 536 | 89 % | 2.97 | 1521.68 |
| Signals | tp 4.000% | sl 2.00× | tr 0.40× | 116 | 105 (91 %) | 1435 | 81 % | 2.76 | 1484.68 |
| Signals | tp 4.000% | sl 2.00× | tr 0.60× | 116 | 97 (84 %) | 1179 | 79 % | 2.51 | 1440.25 |
| Signals | tp 4.000% | sl 2.00× | tr off | 115 | 97 (84 %) | 811 | 83 % | 2.26 | 1419.14 |
| Signals | tp 3.000% | sl 2.00× | tr 0.80× | 116 | 97 (84 %) | 1388 | 76 % | 2.09 | 1409.76 |
| Signals | tp 5.000% | sl 2.00× | tr off | 114 | 89 (78 %) | 578 | 83 % | 2.43 | 1354.92 |
| Signals | tp 5.000% | sl 2.00× | tr 0.40× | 116 | 97 (84 %) | 1213 | 84 % | 2.61 | 1353.00 |
| Signals | tp 5.000% | sl 2.00× | tr 0.80× | 114 | 90 (79 %) | 694 | 79 % | 2.35 | 1327.66 |
| Signals | tp 4.000% | sl 2.00× | tr 0.80× | 115 | 93 (81 %) | 960 | 79 % | 2.18 | 1310.72 |
| Signals | tp 3.000% | sl 2.00× | tr 0.60× | 116 | 96 (83 %) | 1539 | 77 % | 2.05 | 1283.56 |
| Signals | tp 6.000% | sl 3.00× | tr off | 107 | 89 (83 %) | 378 | 89 % | 2.88 | 1264.89 |
| Signals | tp 3.000% | sl 2.00× | tr 0.40× | 118 | 99 (84 %) | 1835 | 76 % | 2.03 | 1227.20 |
| Signals | tp 6.000% | sl 2.00× | tr 0.40× | 116 | 97 (84 %) | 1088 | 81 % | 2.41 | 1207.53 |
| Signals | tp 5.000% | sl 1.50× | tr off | 114 | 91 (80 %) | 641 | 76 % | 2.01 | 1169.40 |
| Signals | tp 6.000% | sl 2.00× | tr off | 108 | 84 (78 %) | 407 | 83 % | 2.37 | 1124.73 |
| Signals | tp 5.000% | sl 2.00× | tr 0.60× | 116 | 94 (81 %) | 943 | 78 % | 2.15 | 1121.32 |
| Signals | tp 4.000% | sl 1.50× | tr off | 116 | 87 (75 %) | 920 | 73 % | 1.71 | 1062.44 |
| Signals | tp 6.000% | sl 2.00× | tr 0.80× | 110 | 82 (75 %) | 552 | 78 % | 1.99 | 945.85 |
| Signals | tp 6.000% | sl 1.50× | tr off | 108 | 85 (79 %) | 458 | 74 % | 1.89 | 928.53 |
| Signals | tp 8.000% | sl 2.00× | tr 0.80× | 101 | 71 (70 %) | 306 | 80 % | 2.31 | 910.62 |
| Signals | tp 2.500% | sl 2.00× | tr off | 116 | 88 (76 %) | 1507 | 77 % | 1.51 | 907.04 |
| Signals | tp 6.000% | sl 2.00× | tr 0.60× | 111 | 83 (75 %) | 732 | 75 % | 1.87 | 878.27 |
| Signals | tp 3.000% | sl 1.50× | tr off | 116 | 81 (70 %) | 1440 | 70 % | 1.42 | 841.44 |
| Signals | tp 8.000% | sl 2.00× | tr 0.40× | 110 | 83 (75 %) | 734 | 83 % | 1.82 | 703.56 |
| Signals | tp 8.000% | sl 2.00× | tr 0.60× | 107 | 77 (72 %) | 492 | 80 % | 1.67 | 579.41 |
| Signals | tp 2.500% | sl 1.50× | tr off | 116 | 74 (64 %) | 1699 | 68 % | 1.26 | 554.89 |

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
