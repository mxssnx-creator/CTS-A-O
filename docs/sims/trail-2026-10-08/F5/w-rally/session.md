# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T03:00 UTC. Engine: Base 1122/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126; Main 996 pairs, 137378 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 155 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (137378 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3351); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 27723 · 0.94 | 5579 · 1.25 | 7922 · 1.04 | 476 · 5.99 | – | – | – | – | – |
| 16:00 | 34292 · 0.45 | 9257 · 0.69 | 11604 · 0.66 | 1863 · 1.99 | – | – | – | – | – |
| 17:00 | 24121 · 0.55 | 4438 · 0.46 | 10834 · 0.45 | 951 · 5.39 | – | – | – | – | – |
| 18:00 | 24718 · 1.49 | 8244 · 1.67 | 9779 · 2.54 | 2632 · 4.63 | – | – | – | – | – |
| 19:00 | 21182 · 1.20 | 6071 · 1.61 | 4765 · 1.48 | 1395 · 3.49 | – | – | – | – | – |
| 20:00 | 30603 · 3.13 | 10841 · 4.88 | 8881 · 3.26 | 2274 · 3.12 | – | – | – | – | – |
| 21:00 | 20713 · 2.15 | 5295 · 1.58 | 7937 · 4.94 | 1456 · 4.82 | – | – | – | – | – |
| 22:00 | 16671 · 1.00 | 3881 · 1.19 | 3533 · 2.01 | 1375 · 4.93 | – | – | – | – | – |
| 23:00 | 17735 · 0.59 | 5374 · 0.74 | 4924 · 0.57 | 1893 · 4.23 | – | – | – | – | – |
| 00:00 | 28288 · 1.11 | 7873 · 1.05 | 9338 · 1.56 | 3725 · 0.67 | – | – | – | – | – |
| 01:00 | 35004 · 1.19 | 7871 · 1.61 | 11165 · 1.64 | 2234 · 1.11 | – | – | – | – | – |
| 02:00 | 35093 · 1.28 | 10987 · 1.71 | 9687 · 2.84 | 4700 · 3.65 | – | – | – | – | – |
| **total** | **316143 · 1.09** | **85711 · 1.41** | **100369 · 1.45** | **24974 · 2.16** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 50150 | sig:confirm 50150 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 133598 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2023 units active at the run start, 2791 over the run, 3351 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1698 | 1326 (78 %) | 13835 | 79 % | 1.91 | 17388.81 |
| Signals | trailing | 1653 | 1363 (82 %) | 11139 | 84 % | 2.56 | 19315.60 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 54 (90 %) | 470 | 81 % | 2.51 | 765.08 |
| Signals | signal:act-hf | 60 | 32 (53 %) | 671 | 70 % | 1.16 | 219.36 |
| Signals | signal:adx | 60 | 56 (93 %) | 337 | 89 % | 5.89 | 965.62 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 593 | 86 % | 4.09 | 1344.63 |
| Signals | signal:bollinger | 56 | 28 (50 %) | 252 | 73 % | 0.94 | -34.69 |
| Signals | signal:cci | 60 | 31 (52 %) | 270 | 76 % | 1.26 | 146.85 |
| Signals | signal:cmf | 60 | 43 (72 %) | 644 | 78 % | 1.36 | 426.27 |
| Signals | signal:donchian | 60 | 60 (100 %) | 344 | 90 % | 11.36 | 1013.82 |
| Signals | signal:ema-cross | 56 | 23 (41 %) | 192 | 69 % | 0.88 | -53.45 |
| Signals | signal:ema-cross-fast | 60 | 41 (68 %) | 328 | 78 % | 1.36 | 240.83 |
| Signals | signal:ema-pullback | 60 | 41 (68 %) | 476 | 82 % | 2.16 | 728.93 |
| Signals | signal:ema-slope | 47 | 29 (62 %) | 261 | 71 % | 0.99 | -5.11 |
| Signals | signal:ema-trend | 60 | 32 (53 %) | 376 | 75 % | 1.13 | 109.45 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1022 | 82 % | 2.31 | 1555.03 |
| Signals | signal:hma | 60 | 50 (83 %) | 500 | 78 % | 1.78 | 562.19 |
| Signals | signal:ichimoku | 60 | 52 (87 %) | 329 | 81 % | 2.02 | 422.35 |
| Signals | signal:impulse | 60 | 60 (100 %) | 596 | 86 % | 9.36 | 1547.48 |
| Signals | signal:kama | 60 | 52 (87 %) | 849 | 81 % | 1.79 | 985.95 |
| Signals | signal:keltner | 58 | 56 (97 %) | 324 | 93 % | 13.85 | 936.56 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 614 | 86 % | 3.45 | 1190.70 |
| Signals | signal:macd-hist | 60 | 55 (92 %) | 818 | 83 % | 2.63 | 1340.66 |
| Signals | signal:macd-slow | 60 | 40 (67 %) | 547 | 81 % | 1.91 | 687.01 |
| Signals | signal:mfi | 12 | 9 (75 %) | 21 | 86 % | 3.34 | 32.45 |
| Signals | signal:obv | 59 | 48 (81 %) | 342 | 80 % | 1.76 | 409.33 |
| Signals | signal:r-awesome | 54 | 45 (83 %) | 474 | 76 % | 1.56 | 383.69 |
| Signals | signal:r-connors | 60 | 10 (17 %) | 178 | 54 % | 0.42 | -484.43 |
| Signals | signal:r-fractal | 60 | 55 (92 %) | 280 | 82 % | 4.53 | 558.95 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 66 | 94 % | 334.77 | 210.16 |
| Signals | signal:r-linreg | 60 | 28 (47 %) | 439 | 73 % | 1.03 | 29.32 |
| Signals | signal:r-nr-break | 60 | 53 (88 %) | 691 | 77 % | 1.75 | 767.93 |
| Signals | signal:r-session-trend | 60 | 41 (68 %) | 182 | 81 % | 2.35 | 299.43 |
| Signals | signal:r-vol-regime | 60 | 57 (95 %) | 297 | 86 % | 6.64 | 687.25 |
| Signals | signal:reclaim | 60 | 45 (75 %) | 483 | 77 % | 1.34 | 332.19 |
| Signals | signal:rsi-mid | 60 | 58 (97 %) | 649 | 85 % | 2.76 | 1202.11 |
| Signals | signal:rsi-momentum | 30 | 30 (100 %) | 129 | 83 % | 5.32 | 337.42 |
| Signals | signal:rsi-reversal | 42 | 40 (95 %) | 69 | 94 % | 12.72 | 202.70 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 899 | 83 % | 3.06 | 1622.87 |
| Signals | signal:s2-adx-gate | 60 | 51 (85 %) | 421 | 83 % | 3.01 | 774.32 |
| Signals | signal:s2-atr-break | 60 | 59 (98 %) | 710 | 81 % | 2.13 | 1000.04 |
| Signals | signal:s2-bb-bounce | 50 | 31 (62 %) | 126 | 81 % | 1.91 | 159.45 |
| Signals | signal:s2-block-scale | 60 | 42 (70 %) | 818 | 72 % | 1.24 | 375.40 |
| Signals | signal:s2-block-stack | 60 | 55 (92 %) | 417 | 87 % | 6.04 | 1178.42 |
| Signals | signal:s2-confluence | 60 | 45 (75 %) | 397 | 87 % | 3.10 | 780.50 |
| Signals | signal:s2-range-break | 60 | 60 (100 %) | 290 | 87 % | 6.37 | 787.99 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 516 | 89 % | 7.84 | 1335.13 |
| Signals | signal:s2-rsi-revert | 32 | 20 (63 %) | 53 | 72 % | 1.39 | 30.62 |
| Signals | signal:s2-st-trail | 30 | 30 (100 %) | 109 | 97 % | 953.43 | 393.06 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 305 | 90 % | 7.58 | 820.92 |
| Signals | signal:s2-vol-break | 54 | 32 (59 %) | 79 | 68 % | 0.98 | -3.97 |
| Signals | signal:sar | 60 | 50 (83 %) | 732 | 75 % | 1.36 | 503.36 |
| Signals | signal:squeeze | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 121 | 98 % | 3241.50 | 430.49 |
| Signals | signal:stoch-rsi | 60 | 52 (87 %) | 617 | 80 % | 1.85 | 763.51 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 279 | 80 % | 5.31 | 632.72 |
| Signals | signal:swing | 60 | 60 (100 %) | 745 | 86 % | 3.88 | 1665.08 |
| Signals | signal:thrust | 60 | 60 (100 %) | 937 | 88 % | 4.31 | 2236.42 |
| Signals | signal:trix | 58 | 21 (36 %) | 220 | 67 % | 1.00 | -1.56 |
| Signals | signal:volume-break | 54 | 50 (93 %) | 65 | 89 % | 33.88 | 211.68 |
| Signals | signal:vwap | 60 | 41 (68 %) | 301 | 76 % | 1.24 | 156.18 |
| Signals | signal:williams-r | 60 | 52 (87 %) | 465 | 82 % | 1.92 | 607.01 |
| Signals | signal:zscore | 49 | 29 (59 %) | 207 | 74 % | 1.13 | 55.88 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 17724 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17724 | 0 |  |
| Short | 30186 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30186 | 0 |  |
| General | 12470 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12470 | 0 |  |
| Long | 20430 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20430 | 0 |  |
| Wide | 52788 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52788 | 0 |  |
| Signals | 3780 | – | 2023 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2023 units (pair × symbol × direction) active at the run start, 2791 over the run; 3351 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1614 (85 %) | 20047 | 83 % | 2.61 | 35330.11 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 54 (90 %) | 470 | 81 % | 2.51 | 765.08 |
| Signals | signal:act-hf | 60 | 32 (53 %) | 671 | 70 % | 1.16 | 219.36 |
| Signals | signal:adx | 60 | 56 (93 %) | 337 | 89 % | 5.89 | 965.62 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 593 | 86 % | 4.09 | 1344.63 |
| Signals | signal:bollinger | 56 | 28 (50 %) | 252 | 73 % | 0.94 | -34.69 |
| Signals | signal:cci | 60 | 31 (52 %) | 270 | 76 % | 1.26 | 146.85 |
| Signals | signal:cmf | 60 | 43 (72 %) | 644 | 78 % | 1.36 | 426.27 |
| Signals | signal:donchian | 60 | 60 (100 %) | 344 | 90 % | 11.36 | 1013.82 |
| Signals | signal:ema-cross | 56 | 23 (41 %) | 192 | 69 % | 0.88 | -53.45 |
| Signals | signal:ema-cross-fast | 60 | 41 (68 %) | 328 | 78 % | 1.36 | 240.83 |
| Signals | signal:ema-pullback | 60 | 41 (68 %) | 476 | 82 % | 2.16 | 728.93 |
| Signals | signal:ema-slope | 47 | 29 (62 %) | 261 | 71 % | 0.99 | -5.11 |
| Signals | signal:ema-trend | 60 | 32 (53 %) | 376 | 75 % | 1.13 | 109.45 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1022 | 82 % | 2.31 | 1555.03 |
| Signals | signal:hma | 60 | 50 (83 %) | 500 | 78 % | 1.78 | 562.19 |
| Signals | signal:ichimoku | 60 | 52 (87 %) | 329 | 81 % | 2.02 | 422.35 |
| Signals | signal:impulse | 60 | 60 (100 %) | 596 | 86 % | 9.36 | 1547.48 |
| Signals | signal:kama | 60 | 52 (87 %) | 849 | 81 % | 1.79 | 985.95 |
| Signals | signal:keltner | 58 | 56 (97 %) | 324 | 93 % | 13.85 | 936.56 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 614 | 86 % | 3.45 | 1190.70 |
| Signals | signal:macd-hist | 60 | 55 (92 %) | 818 | 83 % | 2.63 | 1340.66 |
| Signals | signal:macd-slow | 60 | 40 (67 %) | 547 | 81 % | 1.91 | 687.01 |
| Signals | signal:mfi | 12 | 9 (75 %) | 21 | 86 % | 3.34 | 32.45 |
| Signals | signal:obv | 59 | 48 (81 %) | 342 | 80 % | 1.76 | 409.33 |
| Signals | signal:r-awesome | 54 | 45 (83 %) | 474 | 76 % | 1.56 | 383.69 |
| Signals | signal:r-connors | 60 | 10 (17 %) | 178 | 54 % | 0.42 | -484.43 |
| Signals | signal:r-fractal | 60 | 55 (92 %) | 280 | 82 % | 4.53 | 558.95 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 66 | 94 % | 334.77 | 210.16 |
| Signals | signal:r-linreg | 60 | 28 (47 %) | 439 | 73 % | 1.03 | 29.32 |
| Signals | signal:r-nr-break | 60 | 53 (88 %) | 691 | 77 % | 1.75 | 767.93 |
| Signals | signal:r-session-trend | 60 | 41 (68 %) | 182 | 81 % | 2.35 | 299.43 |
| Signals | signal:r-vol-regime | 60 | 57 (95 %) | 297 | 86 % | 6.64 | 687.25 |
| Signals | signal:reclaim | 60 | 45 (75 %) | 483 | 77 % | 1.34 | 332.19 |
| Signals | signal:rsi-mid | 60 | 58 (97 %) | 649 | 85 % | 2.76 | 1202.11 |
| Signals | signal:rsi-momentum | 30 | 30 (100 %) | 129 | 83 % | 5.32 | 337.42 |
| Signals | signal:rsi-reversal | 42 | 40 (95 %) | 69 | 94 % | 12.72 | 202.70 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 899 | 83 % | 3.06 | 1622.87 |
| Signals | signal:s2-adx-gate | 60 | 51 (85 %) | 421 | 83 % | 3.01 | 774.32 |
| Signals | signal:s2-atr-break | 60 | 59 (98 %) | 710 | 81 % | 2.13 | 1000.04 |
| Signals | signal:s2-bb-bounce | 50 | 31 (62 %) | 126 | 81 % | 1.91 | 159.45 |
| Signals | signal:s2-block-scale | 60 | 42 (70 %) | 818 | 72 % | 1.24 | 375.40 |
| Signals | signal:s2-block-stack | 60 | 55 (92 %) | 417 | 87 % | 6.04 | 1178.42 |
| Signals | signal:s2-confluence | 60 | 45 (75 %) | 397 | 87 % | 3.10 | 780.50 |
| Signals | signal:s2-range-break | 60 | 60 (100 %) | 290 | 87 % | 6.37 | 787.99 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 516 | 89 % | 7.84 | 1335.13 |
| Signals | signal:s2-rsi-revert | 32 | 20 (63 %) | 53 | 72 % | 1.39 | 30.62 |
| Signals | signal:s2-st-trail | 30 | 30 (100 %) | 109 | 97 % | 953.43 | 393.06 |
| Signals | signal:s2-stoch-swing | 60 | 59 (98 %) | 305 | 90 % | 7.58 | 820.92 |
| Signals | signal:s2-vol-break | 54 | 32 (59 %) | 79 | 68 % | 0.98 | -3.97 |
| Signals | signal:sar | 60 | 50 (83 %) | 732 | 75 % | 1.36 | 503.36 |
| Signals | signal:squeeze | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 121 | 98 % | 3241.50 | 430.49 |
| Signals | signal:stoch-rsi | 60 | 52 (87 %) | 617 | 80 % | 1.85 | 763.51 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 279 | 80 % | 5.31 | 632.72 |
| Signals | signal:swing | 60 | 60 (100 %) | 745 | 86 % | 3.88 | 1665.08 |
| Signals | signal:thrust | 60 | 60 (100 %) | 937 | 88 % | 4.31 | 2236.42 |
| Signals | signal:trix | 58 | 21 (36 %) | 220 | 67 % | 1.00 | -1.56 |
| Signals | signal:volume-break | 54 | 50 (93 %) | 65 | 89 % | 33.88 | 211.68 |
| Signals | signal:vwap | 60 | 41 (68 %) | 301 | 76 % | 1.24 | 156.18 |
| Signals | signal:williams-r | 60 | 52 (87 %) | 465 | 82 % | 1.92 | 607.01 |
| Signals | signal:zscore | 49 | 29 (59 %) | 207 | 74 % | 1.13 | 55.88 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 950 | 781 (82 %) | 7838 | 82 % | 2.21 | 12148.39 |
| Signals | 1.25 | 505 | 430 (85 %) | 4422 | 83 % | 2.34 | 7051.79 |
| Signals | 1.35 | 336 | 292 (87 %) | 3110 | 83 % | 2.46 | 5023.03 |
| Signals | 1.5 | 176 | 156 (89 %) | 1808 | 83 % | 2.60 | 2961.86 |
| Signals | 1.75 | 63 | 56 (89 %) | 746 | 83 % | 2.70 | 1172.65 |
| Signals | 2 | 29 | 26 (90 %) | 361 | 85 % | 2.71 | 567.36 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 510 | 88 % | 4.12 | 1209.00 | tp4 sl12 tr2.4 h48 (25 · 5.40 · 56.43) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 393 | 90 % | 14.43 | 1122.29 | tp3 sl9 tr0 h48 (19 · ∞ (no loss) · 53.20) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 427 | 88 % | 4.57 | 1027.42 | tp5 sl15 tr4 h48 (11 · ∞ (no loss) · 48.24) |
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 403 | 87 % | 4.85 | 980.13 | tp6 sl18 tr0 h48 (8 · ∞ (no loss) · 46.40) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 603 | 83 % | 2.22 | 927.64 | tp4 sl12 tr0 h48 (17 · 4.98 · 48.60) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 30 (100 %) | 323 | 91 % | 13.22 | 892.58 | tp5 sl7.5 tr0 h48 (9 · ∞ (no loss) · 43.20) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 279 | 96 % | 60.34 | 847.25 | tp3 sl6 tr0 h48 (14 · ∞ (no loss) · 39.20) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 29 (97 %) | 449 | 83 % | 3.07 | 813.38 | tp4 sl12 tr0 h48 (13 · ∞ (no loss) · 49.40) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 29 (97 %) | 450 | 83 % | 3.06 | 809.48 | tp4 sl12 tr0 h48 (13 · ∞ (no loss) · 49.40) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 355 | 88 % | 4.67 | 800.40 | tp2.5 sl7.5 tr0 h48 (21 · ∞ (no loss) · 48.30) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 30 (100 %) | 339 | 88 % | 4.07 | 764.10 | tp4 sl12 tr2.4 h48 (14 · ∞ (no loss) · 39.91) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 235 | 96 % | 29.26 | 748.81 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 29 (97 %) | 457 | 83 % | 2.48 | 743.94 | tp3 sl9 tr0 h48 (21 · 2.89 · 34.80) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 264 | 86 % | 30.99 | 739.34 | tp3 sl4.5 tr0 h48 (13 · 42.16 · 32.80) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 28 (93 %) | 254 | 88 % | 6.50 | 735.51 | tp8 sl24 tr6.4 h48 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 30 (100 %) | 218 | 93 % | 17.25 | 697.47 | tp6 sl18 tr4.8 h48 (6 · ∞ (no loss) · 29.38) |
| Signals | follow | sig-keltner-s@m15 | 30 | 30 (100 %) | 218 | 95 % | 26.19 | 693.66 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 342 | 86 % | 3.12 | 684.94 | tp6 sl12 tr0 h48 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 28 (93 %) | 375 | 82 % | 2.65 | 647.16 | tp8 sl24 tr6.4 h48 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 30 (100 %) | 419 | 81 % | 2.47 | 627.39 | tp2.5 sl7.5 tr0 h48 (27 · 3.73 · 42.10) |
| Signals | follow | sig-adx-s@m15 | 30 | 30 (100 %) | 191 | 93 % | 11.19 | 613.59 | tp4 sl8 tr0 h48 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 28 (93 %) | 364 | 81 % | 2.55 | 613.31 | tp8 sl24 tr6.4 h48 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 26 (87 %) | 361 | 82 % | 2.88 | 596.72 | tp3 sl9 tr2.4 h48 (21 · 32.00 · 43.87) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 26 (87 %) | 361 | 82 % | 2.88 | 596.72 | tp3 sl9 tr2.4 h48 (21 · 32.00 · 43.87) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 30 (100 %) | 253 | 91 % | 4.54 | 593.98 | tp4 sl12 tr3.2 h48 (10 · ∞ (no loss) · 34.32) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 178 | 92 % | 25.44 | 591.56 | tp8 sl24 tr4.8 h48 (5 · ∞ (no loss) · 24.35) |
| Signals | follow | sig-kama-s@m15 | 30 | 27 (90 %) | 465 | 81 % | 1.85 | 561.60 | tp4 sl12 tr3.2 h48 (17 · 3.74 · 33.92) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 30 (100 %) | 205 | 90 % | 7.05 | 534.58 | tp3 sl9 tr2.4 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 246 | 77 % | 4.52 | 516.04 | tp4 sl12 tr0 h48 (8 · 46.95 · 26.03) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 29 (97 %) | 372 | 81 % | 2.10 | 506.71 | tp3 sl9 tr2.4 h48 (20 · 3.95 · 29.36) |
| Signals | follow | sig-hma-s@m15 | 30 | 29 (97 %) | 368 | 80 % | 2.08 | 500.06 | tp6 sl18 tr4.8 h48 (7 · 657.51 · 29.61) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 30 (100 %) | 394 | 79 % | 1.94 | 497.88 | tp5 sl15 tr0 h48 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 30 (100 %) | 338 | 81 % | 2.18 | 493.33 | tp3 sl9 tr0 h48 (15 · 4.26 · 30.00) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 193 | 89 % | 8.74 | 488.54 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 27 (90 %) | 334 | 81 % | 2.00 | 460.23 | tp3 sl9 tr0 h48 (14 · 3.96 · 27.20) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 30 (100 %) | 164 | 86 % | 6.04 | 456.74 | tp5 sl10 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 27 (90 %) | 163 | 85 % | 5.42 | 442.91 | tp6 sl18 tr3.6 h48 (5 · ∞ (no loss) · 23.68) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 27 (90 %) | 193 | 84 % | 4.62 | 442.55 | tp2.5 sl7.5 tr0 h48 (10 · ∞ (no loss) · 23.00) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 29 (97 %) | 180 | 86 % | 7.05 | 435.17 | tp3 sl6 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 121 | 98 % | 3241.50 | 430.49 | tp3 sl4.5 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-impulse-m@m15 | 30 | 30 (100 %) | 203 | 76 % | 5.19 | 425.19 | tp3 sl9 tr1.8 h48 (13 · 15.79 · 21.51) |
| Signals | follow | sig-kama-m@m15 | 30 | 25 (83 %) | 384 | 80 % | 1.73 | 424.36 | tp4 sl12 tr3.2 h48 (13 · 3.74 · 33.40) |
| Signals | follow | sig-donchian-s@m15 | 30 | 30 (100 %) | 166 | 88 % | 6.73 | 422.26 | tp3 sl9 tr0 h48 (8 · ∞ (no loss) · 22.40) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 30 (100 %) | 109 | 97 % | 953.43 | 393.06 | tp3 sl4.5 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-obv-m@m15 | 30 | 30 (100 %) | 123 | 93 % | 9.15 | 359.23 | tp5 sl15 tr3 h48 (5 · ∞ (no loss) · 16.59) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 28 (93 %) | 370 | 77 % | 1.53 | 354.86 | tp4 sl12 tr2.4 h48 (13 · 2.83 · 23.53) |
| Signals | follow | sig-adx-m@m15 | 30 | 26 (87 %) | 146 | 83 % | 3.56 | 352.03 | tp5 sl15 tr3 h48 (5 · ∞ (no loss) · 19.73) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 30 (100 %) | 129 | 83 % | 5.32 | 337.42 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 30 (100 %) | 126 | 87 % | 6.89 | 331.25 | tp2.5 sl7.5 tr0 h48 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 21 (70 %) | 310 | 77 % | 1.78 | 331.15 | tp3 sl9 tr0 h48 (13 · ∞ (no loss) · 36.40) |
| Signals | follow | sig-sar-m@m15 | 30 | 27 (90 %) | 372 | 77 % | 1.48 | 326.07 | tp5 sl15 tr4 h48 (11 · 2.58 · 24.03) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 26 (87 %) | 268 | 81 % | 1.76 | 310.31 | tp5 sl7.5 tr0 h48 (7 · 3.74 · 21.10) |
| Signals | follow | sig-cmf-m@m15 | 30 | 21 (70 %) | 283 | 84 % | 1.68 | 303.97 | tp3 sl4.5 tr0 h48 (16 · 4.17 · 29.80) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 25 (83 %) | 283 | 79 % | 1.69 | 303.29 | tp2.5 sl7.5 tr0 h48 (14 · 3.88 · 22.20) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 30 (100 %) | 98 | 91 % | 11.74 | 299.95 | tp3 sl6 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 26 (87 %) | 197 | 84 % | 2.18 | 296.69 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 29 (97 %) | 100 | 92 % | 8.88 | 286.34 | tp4 sl8 tr0 h48 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-cci-m@m15 | 30 | 27 (90 %) | 100 | 90 % | 7.01 | 282.07 | tp4 sl12 tr2.4 h48 (6 · ∞ (no loss) · 12.07) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 86 | 93 % | 11.31 | 272.64 | – |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 23 (77 %) | 297 | 75 % | 1.55 | 270.05 | tp5 sl10 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 24 | 24 (100 %) | 81 | 96 % | 545.77 | 257.20 | tp3 sl4.5 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 26 (87 %) | 314 | 78 % | 1.42 | 257.20 | tp4 sl12 tr2.4 h48 (13 · 3.24 · 27.30) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 24 (80 %) | 425 | 73 % | 1.33 | 256.76 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 28 (93 %) | 114 | 86 % | 6.74 | 254.45 | tp2.5 sl7.5 tr0 h48 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-keltner-m@m15 | 28 | 26 (93 %) | 106 | 89 % | 6.36 | 242.90 | tp3 sl6 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 25 (83 %) | 199 | 80 % | 1.70 | 240.82 | tp4 sl8 tr0 h48 (8 · 3.24 · 18.40) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 66 | 94 % | 334.77 | 210.16 | – |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 27 (90 %) | 104 | 81 % | 4.38 | 198.71 | tp3 sl9 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-r-awesome-m@m15 | 24 | 23 (96 %) | 158 | 78 % | 2.40 | 192.15 | tp4 sl12 tr3.2 h48 (8 · 369.90 · 19.31) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 22 (73 %) | 316 | 74 % | 1.35 | 191.53 | tp3 sl9 tr2.4 h48 (19 · 2.11 · 20.67) |
| Signals | follow | sig-sar-s@m15 | 30 | 23 (77 %) | 360 | 74 % | 1.25 | 177.29 | tp5 sl15 tr0 h48 (9 · 2.53 · 23.20) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 25 (83 %) | 232 | 79 % | 1.36 | 169.40 | tp4 sl6 tr0 h48 (8 · 1.84 · 10.40) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 24 (80 %) | 215 | 78 % | 1.45 | 167.90 | tp4 sl12 tr2.4 h48 (10 · 2.23 · 15.01) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 26 (87 %) | 106 | 81 % | 2.36 | 151.77 | tp3 sl9 tr1.8 h48 (6 · ∞ (no loss) · 14.92) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 28 (93 %) | 32 | 94 % | 15.43 | 124.85 | – |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 26 (87 %) | 100 | 74 % | 2.43 | 123.78 | tp3 sl9 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-cmf-s@m15 | 30 | 22 (73 %) | 361 | 74 % | 1.17 | 122.31 | tp3 sl9 tr1.8 h48 (21 · 1.89 · 16.44) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 18 (60 %) | 393 | 70 % | 1.15 | 118.64 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 29 (97 %) | 33 | 97 % | 611.36 | 116.68 | – |
| Signals | follow | sig-volume-break-m@m15 | 27 | 26 (96 %) | 38 | 89 % | 23.31 | 115.89 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 21 | 21 (100 %) | 36 | 94 % | 13.14 | 105.05 | – |
| Signals | follow | sig-rsi-reversal-s@m15 | 21 | 19 (90 %) | 33 | 94 % | 12.29 | 97.65 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 27 | 24 (89 %) | 27 | 89 % | 78.02 | 95.79 | – |
| Signals | follow | sig-volume-break-s@m15 | 27 | 24 (89 %) | 27 | 89 % | 78.02 | 95.79 | – |
| Signals | follow | sig-reclaim-s@m15 | 30 | 20 (67 %) | 284 | 75 % | 1.14 | 91.38 | tp5 sl15 tr3 h48 (8 · 1.92 · 14.03) |
| Signals | follow | sig-ema-slope-m@m15 | 17 | 15 (88 %) | 48 | 83 % | 3.81 | 88.83 | tp2.5 sl3.75 tr0 h48 (6 · 0.58 · -4.95) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 20 (67 %) | 214 | 77 % | 1.19 | 88.18 | tp2.5 sl7.5 tr0 h48 (11 · 2.99 · 15.30) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 16 (53 %) | 96 | 76 % | 1.39 | 71.43 | tp2.5 sl7.5 tr0 h48 (5 · 1.19 · 1.50) |
| Signals | follow | sig-hma-m@m15 | 30 | 21 (70 %) | 132 | 75 % | 1.24 | 62.13 | tp3 sl4.5 tr0 h48 (6 · 2.98 · 9.30) |
| Signals | follow | sig-zscore-m@m15 | 21 | 14 (67 %) | 53 | 77 % | 1.98 | 56.80 | tp3 sl4.5 tr0 h48 (5 · 0.89 · -1.00) |
| Signals | follow | sig-trix-m@m15 | 30 | 12 (40 %) | 115 | 70 % | 1.20 | 52.30 | tp2.5 sl7.5 tr0 h48 (5 · 1.19 · 1.50) |
| Signals | follow | sig-obv-s@m15 | 29 | 18 (62 %) | 219 | 73 % | 1.10 | 50.11 | tp3 sl9 tr2.4 h48 (8 · ∞ (no loss) · 19.94) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 21 | 15 (71 %) | 29 | 79 % | 2.43 | 44.82 | – |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 21 (70 %) | 157 | 77 % | 1.10 | 34.98 | tp4 sl8 tr0 h48 (6 · 2.32 · 10.80) |
| Signals | follow | sig-mfi-m@m15 | 12 | 9 (75 %) | 21 | 86 % | 3.34 | 32.45 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 15 (50 %) | 162 | 74 % | 1.09 | 31.69 | tp3 sl9 tr2.4 h48 (8 · ∞ (no loss) · 17.22) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 12 (40 %) | 162 | 72 % | 1.06 | 21.27 | tp3 sl9 tr1.8 h48 (8 · 407.19 · 15.04) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 11 (37 %) | 84 | 70 % | 1.00 | -0.52 | tp3 sl4.5 tr0 h48 (5 · 0.89 · -1.00) |
| Signals | follow | sig-bollinger-s@m15 | 28 | 15 (54 %) | 154 | 73 % | 1.00 | -0.92 | tp3 sl6 tr0 h48 (8 · 3.16 · 13.40) |
| Signals | follow | sig-zscore-s@m15 | 28 | 15 (54 %) | 154 | 73 % | 1.00 | -0.92 | tp3 sl6 tr0 h48 (8 · 3.16 · 13.40) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 11 | 5 (45 %) | 24 | 63 % | 0.70 | -14.21 | – |
| Signals | follow | sig-ema-cross-s@m15 | 26 | 13 (50 %) | 119 | 71 % | 0.92 | -20.04 | tp3 sl9 tr1.8 h48 (8 · 1.83 · 7.64) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 10 (33 %) | 73 | 66 % | 0.83 | -33.40 | – |
| Signals | follow | sig-bollinger-m@m15 | 28 | 13 (46 %) | 98 | 72 % | 0.87 | -33.77 | tp4 sl12 tr2.4 h48 (6 · ∞ (no loss) · 9.35) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 11 (37 %) | 137 | 68 % | 0.91 | -35.18 | tp4 sl12 tr2.4 h48 (5 · ∞ (no loss) · 12.99) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 10 (33 %) | 131 | 71 % | 0.89 | -40.81 | tp3 sl9 tr1.8 h48 (7 · 127.12 · 14.34) |
| Signals | follow | sig-trix-s@m15 | 28 | 9 (32 %) | 105 | 65 % | 0.81 | -53.86 | tp3 sl9 tr1.8 h48 (5 · 0.92 · -0.76) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 14 (47 %) | 213 | 68 % | 0.84 | -93.95 | tp2.5 sl5 tr0 h48 (11 · 1.99 · 10.30) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 26 | 7 (27 %) | 45 | 53 % | 0.44 | -97.75 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 27 | 8 (30 %) | 52 | 58 % | 0.51 | -99.77 | – |
| Signals | follow | sig-act-hf-m@m15 | 30 | 11 (37 %) | 361 | 63 % | 0.88 | -111.79 | tp8 sl24 tr6.4 h48 (5 · 60.41 · 30.68) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 10 (33 %) | 192 | 66 % | 0.79 | -113.39 | tp3 sl9 tr0 h48 (9 · 1.07 · 1.20) |
| Signals | follow | sig-vwap-s@m15 | 30 | 11 (37 %) | 215 | 69 % | 0.81 | -116.46 | tp5 sl15 tr4 h48 (6 · 1.33 · 4.99) |
| Signals | follow | sig-cci-s@m15 | 30 | 4 (13 %) | 170 | 67 % | 0.74 | -135.22 | tp3 sl9 tr1.8 h48 (11 · 2.12 · 10.96) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 2 (7 %) | 125 | 62 % | 0.54 | -227.88 | tp3 sl6 tr0 h48 (7 · 1.13 · 1.60) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 0 (0 %) | 47 | 9 % | 0.02 | -443.62 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 116 | 103 (89 %) | 1250 | 82 % | 3.10 | 1771.09 |
| Signals | tp 3.000% | sl 3.00× | tr off | 116 | 105 (91 %) | 1127 | 89 % | 2.66 | 1759.64 |
| Signals | tp 3.000% | sl 3.00× | tr 1.00× | 116 | 105 (91 %) | 1127 | 89 % | 2.66 | 1759.64 |
| Signals | tp 2.500% | sl 3.00× | tr off | 116 | 105 (91 %) | 1301 | 90 % | 2.68 | 1679.41 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 116 | 100 (86 %) | 1392 | 83 % | 2.86 | 1563.42 |
| Signals | tp 4.000% | sl 3.00× | tr off | 114 | 93 (82 %) | 743 | 89 % | 2.64 | 1558.03 |
| Signals | tp 4.000% | sl 3.00× | tr 1.00× | 114 | 93 (82 %) | 743 | 89 % | 2.64 | 1558.03 |
| Signals | tp 5.000% | sl 3.00× | tr off | 113 | 100 (88 %) | 531 | 89 % | 2.88 | 1477.68 |
| Signals | tp 5.000% | sl 3.00× | tr 1.00× | 113 | 100 (88 %) | 531 | 89 % | 2.88 | 1477.68 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 116 | 96 (83 %) | 1126 | 81 % | 2.66 | 1463.34 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 113 | 98 (87 %) | 642 | 84 % | 2.76 | 1457.47 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 114 | 88 (77 %) | 895 | 83 % | 2.46 | 1414.74 |
| Signals | tp 3.000% | sl 2.00× | tr off | 116 | 93 (80 %) | 1273 | 80 % | 1.88 | 1339.84 |
| Signals | tp 4.000% | sl 2.00× | tr off | 114 | 96 (84 %) | 811 | 82 % | 2.13 | 1335.14 |
| Signals | tp 5.000% | sl 2.00× | tr off | 113 | 88 (78 %) | 577 | 82 % | 2.28 | 1275.12 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 115 | 96 (83 %) | 876 | 82 % | 2.50 | 1226.67 |
| Signals | tp 6.000% | sl 3.00× | tr off | 105 | 86 (82 %) | 373 | 88 % | 2.60 | 1163.89 |
| Signals | tp 6.000% | sl 3.00× | tr 1.00× | 105 | 86 (82 %) | 373 | 88 % | 2.60 | 1163.89 |
| Signals | tp 5.000% | sl 1.50× | tr off | 113 | 89 (79 %) | 639 | 75 % | 1.90 | 1084.80 |
| Signals | tp 6.000% | sl 2.00× | tr off | 107 | 76 (71 %) | 405 | 81 % | 2.16 | 1023.13 |
| Signals | tp 8.000% | sl 3.00× | tr 1.00× | 95 | 75 (79 %) | 229 | 86 % | 2.91 | 995.60 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 109 | 86 (79 %) | 518 | 81 % | 2.14 | 991.12 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 96 | 74 (77 %) | 281 | 84 % | 2.62 | 965.61 |
| Signals | tp 4.000% | sl 1.50× | tr off | 116 | 84 (72 %) | 933 | 71 % | 1.54 | 881.84 |
| Signals | tp 6.000% | sl 1.50× | tr off | 107 | 79 (74 %) | 454 | 74 % | 1.80 | 860.33 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 110 | 80 (73 %) | 697 | 77 % | 1.80 | 818.99 |
| Signals | tp 2.500% | sl 2.00× | tr off | 116 | 83 (72 %) | 1514 | 76 % | 1.42 | 780.64 |
| Signals | tp 3.000% | sl 1.50× | tr off | 116 | 76 (66 %) | 1447 | 69 % | 1.33 | 696.04 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 105 | 83 (79 %) | 459 | 83 % | 1.98 | 688.30 |
| Signals | tp 2.500% | sl 1.50× | tr off | 116 | 73 (63 %) | 1707 | 68 % | 1.22 | 473.29 |

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
