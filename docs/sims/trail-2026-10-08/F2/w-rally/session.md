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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (137378 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3411); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 28320 · 0.97 | 5579 · 1.25 | 8519 · 1.18 | 859 · 3.59 | – | – | – | – | – |
| 16:00 | 35584 · 0.43 | 9257 · 0.69 | 12896 · 0.60 | 2764 · 1.69 | – | – | – | – | – |
| 17:00 | 25389 · 0.55 | 4438 · 0.46 | 12102 · 0.45 | 1580 · 4.33 | – | – | – | – | – |
| 18:00 | 26198 · 1.36 | 8244 · 1.67 | 11259 · 1.84 | 3529 · 3.51 | – | – | – | – | – |
| 19:00 | 21847 · 1.10 | 6071 · 1.61 | 5430 · 1.04 | 1626 · 2.61 | – | – | – | – | – |
| 20:00 | 32030 · 3.05 | 10841 · 4.88 | 10308 · 2.94 | 2939 · 2.71 | – | – | – | – | – |
| 21:00 | 22407 · 2.08 | 5295 · 1.58 | 9631 · 3.93 | 2232 · 3.83 | – | – | – | – | – |
| 22:00 | 17339 · 0.93 | 3881 · 1.19 | 4201 · 1.56 | 1904 · 3.64 | – | – | – | – | – |
| 23:00 | 18332 · 0.51 | 5374 · 0.74 | 5521 · 0.35 | 2123 · 3.20 | – | – | – | – | – |
| 00:00 | 29579 · 1.05 | 7873 · 1.05 | 10629 · 1.39 | 4336 · 0.75 | – | – | – | – | – |
| 01:00 | 37286 · 1.29 | 7871 · 1.61 | 13447 · 2.09 | 3311 · 2.12 | – | – | – | – | – |
| 02:00 | 37199 · 1.20 | 10987 · 1.71 | 11793 · 2.10 | 6172 · 3.11 | – | – | – | – | – |
| **total** | **331510 · 1.05** | **85711 · 1.41** | **115736 · 1.30** | **33375 · 2.22** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 55377 | sig:confirm 55377 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 133598 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2100 units active at the run start, 2863 over the run, 3411 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1694 | 1365 (81 %) | 13937 | 80 % | 2.12 | 19830.58 |
| Signals | trailing | 1717 | 1442 (84 %) | 19438 | 80 % | 2.35 | 18369.39 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 53 (88 %) | 651 | 79 % | 1.98 | 600.90 |
| Signals | signal:act-hf | 60 | 37 (62 %) | 952 | 72 % | 1.31 | 376.21 |
| Signals | signal:adx | 60 | 55 (92 %) | 458 | 80 % | 2.38 | 713.51 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 735 | 81 % | 2.91 | 1014.42 |
| Signals | signal:bollinger | 60 | 38 (63 %) | 337 | 75 % | 1.33 | 178.54 |
| Signals | signal:cci | 60 | 48 (80 %) | 456 | 77 % | 1.85 | 450.97 |
| Signals | signal:cmf | 60 | 49 (82 %) | 866 | 79 % | 1.60 | 638.64 |
| Signals | signal:donchian | 60 | 60 (100 %) | 542 | 88 % | 10.29 | 1129.55 |
| Signals | signal:ema-cross | 60 | 23 (38 %) | 281 | 68 % | 0.87 | -72.14 |
| Signals | signal:ema-cross-fast | 60 | 56 (93 %) | 500 | 84 % | 2.43 | 698.98 |
| Signals | signal:ema-pullback | 60 | 51 (85 %) | 609 | 81 % | 2.09 | 715.67 |
| Signals | signal:ema-slope | 53 | 34 (64 %) | 347 | 73 % | 1.14 | 79.68 |
| Signals | signal:ema-trend | 60 | 34 (57 %) | 496 | 72 % | 1.18 | 162.63 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 1429 | 77 % | 1.89 | 1304.92 |
| Signals | signal:hma | 60 | 40 (67 %) | 615 | 78 % | 1.40 | 320.99 |
| Signals | signal:ichimoku | 60 | 53 (88 %) | 410 | 82 % | 2.05 | 422.04 |
| Signals | signal:impulse | 60 | 60 (100 %) | 849 | 82 % | 5.84 | 1457.04 |
| Signals | signal:kama | 60 | 59 (98 %) | 1105 | 80 % | 2.11 | 1218.65 |
| Signals | signal:keltner | 60 | 58 (97 %) | 454 | 93 % | 14.76 | 1059.79 |
| Signals | signal:macd-cross | 60 | 59 (98 %) | 840 | 85 % | 3.50 | 1274.43 |
| Signals | signal:macd-hist | 60 | 60 (100 %) | 1173 | 83 % | 2.52 | 1422.47 |
| Signals | signal:macd-slow | 60 | 38 (63 %) | 805 | 84 % | 1.93 | 765.41 |
| Signals | signal:mfi | 20 | 17 (85 %) | 44 | 75 % | 3.38 | 33.78 |
| Signals | signal:obv | 60 | 51 (85 %) | 454 | 79 % | 2.05 | 518.58 |
| Signals | signal:r-awesome | 57 | 45 (79 %) | 652 | 75 % | 1.50 | 342.19 |
| Signals | signal:r-connors | 60 | 23 (38 %) | 241 | 65 % | 0.71 | -167.96 |
| Signals | signal:r-fractal | 60 | 54 (90 %) | 433 | 80 % | 3.54 | 573.56 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 78 | 94 % | 196.94 | 172.51 |
| Signals | signal:r-linreg | 60 | 30 (50 %) | 563 | 74 % | 1.08 | 83.53 |
| Signals | signal:r-nr-break | 60 | 47 (78 %) | 876 | 78 % | 1.57 | 576.04 |
| Signals | signal:r-session-trend | 60 | 38 (63 %) | 281 | 82 % | 2.02 | 293.24 |
| Signals | signal:r-vol-regime | 60 | 59 (98 %) | 375 | 86 % | 5.41 | 614.23 |
| Signals | signal:reclaim | 60 | 48 (80 %) | 552 | 77 % | 1.44 | 364.71 |
| Signals | signal:rsi-mid | 60 | 59 (98 %) | 865 | 87 % | 3.94 | 1517.59 |
| Signals | signal:rsi-momentum | 30 | 28 (93 %) | 152 | 77 % | 2.95 | 227.55 |
| Signals | signal:rsi-reversal | 52 | 50 (96 %) | 91 | 96 % | 17.09 | 278.37 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 1279 | 82 % | 3.05 | 1834.85 |
| Signals | signal:s2-adx-gate | 60 | 60 (100 %) | 533 | 90 % | 26.01 | 1294.95 |
| Signals | signal:s2-atr-break | 60 | 59 (98 %) | 1005 | 78 % | 2.06 | 976.19 |
| Signals | signal:s2-bb-bounce | 56 | 37 (66 %) | 158 | 83 % | 2.12 | 198.78 |
| Signals | signal:s2-block-scale | 60 | 44 (73 %) | 1146 | 73 % | 1.16 | 288.51 |
| Signals | signal:s2-block-stack | 60 | 53 (88 %) | 445 | 83 % | 3.75 | 898.24 |
| Signals | signal:s2-confluence | 60 | 49 (82 %) | 436 | 89 % | 4.21 | 767.18 |
| Signals | signal:s2-ema-cross | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 2.85 |
| Signals | signal:s2-range-break | 60 | 57 (95 %) | 330 | 77 % | 4.30 | 570.22 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 640 | 86 % | 6.44 | 1244.42 |
| Signals | signal:s2-rsi-revert | 54 | 38 (70 %) | 123 | 72 % | 1.56 | 95.99 |
| Signals | signal:s2-st-trail | 33 | 33 (100 %) | 134 | 92 % | 300.83 | 385.68 |
| Signals | signal:s2-stoch-swing | 60 | 56 (93 %) | 389 | 83 % | 4.01 | 705.65 |
| Signals | signal:s2-vol-break | 58 | 35 (60 %) | 96 | 57 % | 0.99 | -1.12 |
| Signals | signal:sar | 60 | 59 (98 %) | 928 | 84 % | 3.49 | 1404.39 |
| Signals | signal:squeeze | 4 | 1 (25 %) | 4 | 25 % | 0.00 | -8.83 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 147 | 90 % | 275.22 | 413.97 |
| Signals | signal:stoch-rsi | 60 | 51 (85 %) | 840 | 77 % | 1.69 | 650.70 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 347 | 80 % | 4.54 | 552.30 |
| Signals | signal:swing | 60 | 60 (100 %) | 959 | 83 % | 4.14 | 1625.14 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1137 | 87 % | 3.61 | 1890.82 |
| Signals | signal:trix | 60 | 20 (33 %) | 333 | 68 % | 0.83 | -113.69 |
| Signals | signal:volume-break | 56 | 41 (73 %) | 74 | 68 % | 15.12 | 140.44 |
| Signals | signal:vwap | 60 | 36 (60 %) | 370 | 73 % | 1.16 | 104.44 |
| Signals | signal:williams-r | 60 | 53 (88 %) | 654 | 80 % | 2.21 | 795.92 |
| Signals | signal:zscore | 55 | 34 (62 %) | 295 | 73 % | 1.27 | 120.80 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 17724 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17724 | 0 |  |
| Short | 30186 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30186 | 0 |  |
| General | 12470 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12470 | 0 |  |
| Long | 20430 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20430 | 0 |  |
| Wide | 52788 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52788 | 0 |  |
| Signals | 3780 | – | 2100 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2100 units (pair × symbol × direction) active at the run start, 2863 over the run; 3411 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1564 (83 %) | 35414 | 76 % | 1.77 | 23415.13 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 53 (88 %) | 651 | 79 % | 1.98 | 600.90 |
| Signals | signal:act-hf | 60 | 37 (62 %) | 952 | 72 % | 1.31 | 376.21 |
| Signals | signal:adx | 60 | 55 (92 %) | 458 | 80 % | 2.38 | 713.51 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 735 | 81 % | 2.91 | 1014.42 |
| Signals | signal:bollinger | 60 | 38 (63 %) | 337 | 75 % | 1.33 | 178.54 |
| Signals | signal:cci | 60 | 48 (80 %) | 456 | 77 % | 1.85 | 450.97 |
| Signals | signal:cmf | 60 | 49 (82 %) | 866 | 79 % | 1.60 | 638.64 |
| Signals | signal:donchian | 60 | 60 (100 %) | 542 | 88 % | 10.29 | 1129.55 |
| Signals | signal:ema-cross | 60 | 23 (38 %) | 281 | 68 % | 0.87 | -72.14 |
| Signals | signal:ema-cross-fast | 60 | 56 (93 %) | 500 | 84 % | 2.43 | 698.98 |
| Signals | signal:ema-pullback | 60 | 51 (85 %) | 609 | 81 % | 2.09 | 715.67 |
| Signals | signal:ema-slope | 53 | 34 (64 %) | 347 | 73 % | 1.14 | 79.68 |
| Signals | signal:ema-trend | 60 | 34 (57 %) | 496 | 72 % | 1.18 | 162.63 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 1429 | 77 % | 1.89 | 1304.92 |
| Signals | signal:hma | 60 | 40 (67 %) | 615 | 78 % | 1.40 | 320.99 |
| Signals | signal:ichimoku | 60 | 53 (88 %) | 410 | 82 % | 2.05 | 422.04 |
| Signals | signal:impulse | 60 | 60 (100 %) | 849 | 82 % | 5.84 | 1457.04 |
| Signals | signal:kama | 60 | 59 (98 %) | 1105 | 80 % | 2.11 | 1218.65 |
| Signals | signal:keltner | 60 | 58 (97 %) | 454 | 93 % | 14.76 | 1059.79 |
| Signals | signal:macd-cross | 60 | 59 (98 %) | 840 | 85 % | 3.50 | 1274.43 |
| Signals | signal:macd-hist | 60 | 60 (100 %) | 1173 | 83 % | 2.52 | 1422.47 |
| Signals | signal:macd-slow | 60 | 38 (63 %) | 805 | 84 % | 1.93 | 765.41 |
| Signals | signal:mfi | 20 | 17 (85 %) | 44 | 75 % | 3.38 | 33.78 |
| Signals | signal:obv | 60 | 51 (85 %) | 454 | 79 % | 2.05 | 518.58 |
| Signals | signal:r-awesome | 57 | 45 (79 %) | 652 | 75 % | 1.50 | 342.19 |
| Signals | signal:r-connors | 60 | 23 (38 %) | 241 | 65 % | 0.71 | -167.96 |
| Signals | signal:r-fractal | 60 | 54 (90 %) | 433 | 80 % | 3.54 | 573.56 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 78 | 94 % | 196.94 | 172.51 |
| Signals | signal:r-linreg | 60 | 30 (50 %) | 563 | 74 % | 1.08 | 83.53 |
| Signals | signal:r-nr-break | 60 | 47 (78 %) | 876 | 78 % | 1.57 | 576.04 |
| Signals | signal:r-session-trend | 60 | 38 (63 %) | 281 | 82 % | 2.02 | 293.24 |
| Signals | signal:r-vol-regime | 60 | 59 (98 %) | 375 | 86 % | 5.41 | 614.23 |
| Signals | signal:reclaim | 60 | 48 (80 %) | 552 | 77 % | 1.44 | 364.71 |
| Signals | signal:rsi-mid | 60 | 59 (98 %) | 865 | 87 % | 3.94 | 1517.59 |
| Signals | signal:rsi-momentum | 30 | 28 (93 %) | 152 | 77 % | 2.95 | 227.55 |
| Signals | signal:rsi-reversal | 52 | 50 (96 %) | 91 | 96 % | 17.09 | 278.37 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 1279 | 82 % | 3.05 | 1834.85 |
| Signals | signal:s2-adx-gate | 60 | 60 (100 %) | 533 | 90 % | 26.01 | 1294.95 |
| Signals | signal:s2-atr-break | 60 | 59 (98 %) | 1005 | 78 % | 2.06 | 976.19 |
| Signals | signal:s2-bb-bounce | 56 | 37 (66 %) | 158 | 83 % | 2.12 | 198.78 |
| Signals | signal:s2-block-scale | 60 | 44 (73 %) | 1146 | 73 % | 1.16 | 288.51 |
| Signals | signal:s2-block-stack | 60 | 53 (88 %) | 445 | 83 % | 3.75 | 898.24 |
| Signals | signal:s2-confluence | 60 | 49 (82 %) | 436 | 89 % | 4.21 | 767.18 |
| Signals | signal:s2-ema-cross | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 2.85 |
| Signals | signal:s2-range-break | 60 | 57 (95 %) | 330 | 77 % | 4.30 | 570.22 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 640 | 86 % | 6.44 | 1244.42 |
| Signals | signal:s2-rsi-revert | 54 | 38 (70 %) | 123 | 72 % | 1.56 | 95.99 |
| Signals | signal:s2-st-trail | 33 | 33 (100 %) | 134 | 92 % | 300.83 | 385.68 |
| Signals | signal:s2-stoch-swing | 60 | 56 (93 %) | 389 | 83 % | 4.01 | 705.65 |
| Signals | signal:s2-vol-break | 58 | 35 (60 %) | 96 | 57 % | 0.99 | -1.12 |
| Signals | signal:sar | 60 | 59 (98 %) | 928 | 84 % | 3.49 | 1404.39 |
| Signals | signal:squeeze | 4 | 1 (25 %) | 4 | 25 % | 0.00 | -8.83 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 147 | 90 % | 275.22 | 413.97 |
| Signals | signal:stoch-rsi | 60 | 51 (85 %) | 840 | 77 % | 1.69 | 650.70 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 347 | 80 % | 4.54 | 552.30 |
| Signals | signal:swing | 60 | 60 (100 %) | 959 | 83 % | 4.14 | 1625.14 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1137 | 87 % | 3.61 | 1890.82 |
| Signals | signal:trix | 60 | 20 (33 %) | 333 | 68 % | 0.83 | -113.69 |
| Signals | signal:volume-break | 56 | 41 (73 %) | 74 | 68 % | 15.12 | 140.44 |
| Signals | signal:vwap | 60 | 36 (60 %) | 370 | 73 % | 1.16 | 104.44 |
| Signals | signal:williams-r | 60 | 53 (88 %) | 654 | 80 % | 2.21 | 795.92 |
| Signals | signal:zscore | 55 | 34 (62 %) | 295 | 73 % | 1.27 | 120.80 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1125 | 956 (85 %) | 13426 | 81 % | 2.41 | 15440.67 |
| Signals | 1.25 | 700 | 601 (86 %) | 9054 | 81 % | 2.49 | 9985.79 |
| Signals | 1.35 | 531 | 456 (86 %) | 7278 | 80 % | 2.50 | 7723.66 |
| Signals | 1.5 | 355 | 310 (87 %) | 5121 | 81 % | 2.65 | 5494.81 |
| Signals | 1.75 | 191 | 167 (87 %) | 2867 | 80 % | 2.59 | 2896.92 |
| Signals | 2 | 112 | 98 (88 %) | 1681 | 81 % | 2.70 | 1723.78 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 499 | 86 % | 8.39 | 1070.70 | tp3 sl9 tr0 h48 (17 · ∞ (no loss) · 47.60) |
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 600 | 87 % | 3.68 | 1060.86 | tp4 sl8 tr1.6 h48 (26 · 6.79 · 51.74) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 534 | 87 % | 11.52 | 1056.71 | tp3 sl9 tr0 h48 (20 · ∞ (no loss) · 56.00) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 396 | 95 % | 63.73 | 933.93 | tp3 sl6 tr0 h48 (15 · ∞ (no loss) · 42.00) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 30 (100 %) | 639 | 82 % | 3.05 | 917.84 | tp2.5 sl7.5 tr0 h48 (28 · 8.06 · 54.40) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 30 (100 %) | 640 | 82 % | 3.05 | 917.01 | tp2.5 sl7.5 tr0 h48 (28 · 8.06 · 54.40) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 402 | 88 % | 20.17 | 907.07 | tp3 sl4.5 tr0 h48 (15 · 49.19 · 38.40) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 516 | 90 % | 4.95 | 887.79 | tp2.5 sl7.5 tr0 h48 (22 · ∞ (no loss) · 50.60) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 30 (100 %) | 404 | 90 % | 11.59 | 864.82 | tp5 sl7.5 tr0 h48 (9 · ∞ (no loss) · 43.20) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 537 | 87 % | 3.52 | 829.96 | tp5 sl15 tr0 h48 (10 · ∞ (no loss) · 48.00) |
| Signals | follow | sig-sar-m@m15 | 30 | 29 (97 %) | 414 | 86 % | 7.11 | 768.52 | tp4 sl12 tr0 h48 (12 · ∞ (no loss) · 45.60) |
| Signals | follow | sig-kama-s@m15 | 30 | 30 (100 %) | 619 | 81 % | 2.28 | 733.67 | tp3 sl9 tr0 h48 (20 · 5.78 · 44.00) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 30 (100 %) | 636 | 82 % | 2.33 | 728.97 | tp4 sl8 tr1.2 h48 (33 · 5.19 · 38.43) |
| Signals | follow | sig-keltner-s@m15 | 30 | 30 (100 %) | 277 | 94 % | 24.53 | 709.48 | tp8 sl16 tr3.2 h48 (8 · ∞ (no loss) · 29.37) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 284 | 93 % | 26.15 | 696.50 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 30 (100 %) | 537 | 83 % | 2.81 | 693.50 | tp2.5 sl7.5 tr0 h48 (22 · 6.27 · 40.60) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 30 (100 %) | 537 | 83 % | 2.81 | 693.50 | tp2.5 sl7.5 tr0 h48 (22 · 6.27 · 40.60) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 29 (97 %) | 636 | 79 % | 2.37 | 679.05 | tp4 sl8 tr1.6 h48 (28 · 9.85 · 44.70) |
| Signals | follow | sig-sar-s@m15 | 30 | 30 (100 %) | 514 | 82 % | 2.45 | 635.87 | tp5 sl10 tr0 h48 (11 · 4.71 · 37.80) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 793 | 77 % | 1.64 | 625.86 | tp4 sl12 tr0 h48 (16 · 4.67 · 44.80) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 29 (97 %) | 277 | 86 % | 4.55 | 605.55 | tp5 sl7.5 tr0 h48 (7 · ∞ (no loss) · 32.15) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 29 (97 %) | 469 | 81 % | 2.17 | 583.65 | tp5 sl10 tr2.5 h48 (15 · 3.82 · 30.58) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 29 (97 %) | 303 | 88 % | 5.66 | 580.93 | tp2.5 sl7.5 tr0 h48 (13 · ∞ (no loss) · 29.90) |
| Signals | follow | sig-donchian-s@m15 | 30 | 30 (100 %) | 279 | 90 % | 23.12 | 570.30 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 263 | 86 % | 6.83 | 559.25 | tp4 sl8 tr2 h48 (11 · 201.33 · 25.44) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 460 | 80 % | 2.49 | 554.44 | tp6 sl12 tr0 h48 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 28 (93 %) | 505 | 77 % | 2.12 | 539.81 | tp3 sl6 tr0 h48 (19 · 8.13 · 44.20) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 30 (100 %) | 416 | 82 % | 2.37 | 536.43 | tp4 sl12 tr0 h48 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 30 (100 %) | 546 | 79 % | 1.97 | 507.21 | tp2.5 sl7.5 tr0 h48 (21 · 2.84 · 28.30) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 30 (100 %) | 302 | 86 % | 3.17 | 495.49 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 288 | 84 % | 5.17 | 491.82 | tp3 sl6 tr0 h48 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-kama-m@m15 | 30 | 29 (97 %) | 486 | 79 % | 1.92 | 484.98 | tp4 sl12 tr0 h48 (13 · 3.74 · 33.40) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 30 (100 %) | 230 | 90 % | 10.81 | 474.61 | tp5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 29 (97 %) | 459 | 77 % | 2.19 | 468.98 | tp3 sl6 tr1.5 h48 (24 · 11.28 · 28.75) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 243 | 87 % | 7.45 | 463.69 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 28 (93 %) | 276 | 80 % | 3.25 | 457.39 | tp3 sl6 tr1.5 h48 (17 · 38.25 · 28.91) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 298 | 77 % | 3.79 | 434.48 | tp4 sl12 tr0 h48 (8 · 46.95 · 26.03) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 27 (90 %) | 267 | 81 % | 3.20 | 420.75 | tp2.5 sl7.5 tr0 h48 (11 · ∞ (no loss) · 25.30) |
| Signals | follow | sig-adx-s@m15 | 30 | 29 (97 %) | 284 | 84 % | 2.20 | 419.29 | tp4 sl8 tr0 h48 (10 · 4.17 · 26.00) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 147 | 90 % | 275.22 | 413.97 | tp3 sl4.5 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-cmf-m@m15 | 30 | 26 (87 %) | 349 | 84 % | 2.17 | 408.77 | tp4 sl8 tr1.2 h48 (19 · 3.69 · 24.22) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 26 (87 %) | 482 | 77 % | 1.80 | 405.22 | tp3 sl9 tr0 h48 (18 · 5.17 · 38.40) |
| Signals | follow | sig-impulse-m@m15 | 30 | 30 (100 %) | 315 | 73 % | 3.00 | 400.33 | tp3 sl9 tr0 h48 (9 · 28.11 · 21.60) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 30 (100 %) | 131 | 96 % | 88.04 | 387.88 | tp4 sl8 tr2 h48 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 30 (100 %) | 130 | 92 % | 313.46 | 384.82 | tp3 sl4.5 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 29 (97 %) | 430 | 80 % | 1.63 | 380.51 | tp5 sl10 tr2.5 h48 (14 · 3.75 · 28.04) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 27 (90 %) | 236 | 79 % | 3.58 | 379.60 | tp3 sl6 tr1.2 h48 (13 · 56.94 · 20.86) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 24 (80 %) | 448 | 77 % | 1.73 | 361.40 | tp3 sl9 tr0 h48 (14 · 3.96 · 27.20) |
| Signals | follow | sig-hma-s@m15 | 30 | 28 (93 %) | 480 | 80 % | 1.65 | 355.33 | tp6 sl18 tr0 h48 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-keltner-m@m15 | 30 | 28 (93 %) | 177 | 90 % | 8.48 | 350.31 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-obv-m@m15 | 30 | 30 (100 %) | 160 | 91 % | 9.49 | 347.14 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 30 (100 %) | 148 | 91 % | 12.71 | 343.97 | tp5 sl10 tr1.5 h48 (7 · ∞ (no loss) · 18.13) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 25 (83 %) | 378 | 79 % | 1.74 | 338.53 | tp4 sl8 tr1.2 h48 (22 · 2.62 · 22.14) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 25 (83 %) | 504 | 79 % | 1.58 | 327.54 | tp5 sl15 tr0 h48 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 29 (97 %) | 186 | 74 % | 3.90 | 318.45 | tp5 sl10 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 21 (70 %) | 431 | 77 % | 1.77 | 314.05 | tp3 sl9 tr0 h48 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-adx-m@m15 | 30 | 26 (87 %) | 174 | 74 % | 2.76 | 294.21 | tp5 sl10 tr2 h48 (7 · 9.18 · 16.62) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 24 (80 %) | 168 | 78 % | 2.88 | 292.69 | tp6 sl12 tr1.8 h48 (7 · 21.76 · 14.70) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 27 (90 %) | 392 | 77 % | 1.64 | 289.30 | tp5 sl7.5 tr0 h48 (7 · 3.74 · 21.10) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 29 (97 %) | 122 | 89 % | 7.68 | 284.90 | tp4 sl8 tr0 h48 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 27 | 27 (100 %) | 101 | 95 % | 510.13 | 283.72 | tp4 sl8 tr1.2 h48 (6 · ∞ (no loss) · 14.77) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 30 (100 %) | 161 | 88 % | 14.11 | 274.98 | tp2.5 sl3.75 tr0 h48 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 28 (93 %) | 144 | 81 % | 4.99 | 251.77 | tp5 sl10 tr2.5 h48 (5 · ∞ (no loss) · 15.40) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 22 (73 %) | 372 | 76 % | 1.56 | 248.51 | tp2.5 sl7.5 tr0 h48 (15 · 4.18 · 24.50) |
| Signals | follow | sig-cci-m@m15 | 30 | 26 (87 %) | 131 | 83 % | 3.53 | 248.27 | tp5 sl10 tr2 h48 (6 · ∞ (no loss) · 15.45) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 98 | 92 % | 7.35 | 246.22 | tp3 sl6 tr0.9 h48 (6 · 1.59 · 3.75) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 25 (83 %) | 227 | 79 % | 1.90 | 245.94 | tp3 sl6 tr0.9 h48 (14 · 21.82 · 20.21) |
| Signals | follow | sig-cmf-s@m15 | 30 | 23 (77 %) | 517 | 76 % | 1.32 | 229.87 | tp3 sl6 tr0.9 h48 (34 · 3.95 · 26.16) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 28 (93 %) | 152 | 77 % | 2.95 | 227.55 | tp3 sl6 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-r-awesome-m@m15 | 27 | 25 (93 %) | 185 | 83 % | 3.53 | 220.30 | tp3 sl9 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 26 (87 %) | 198 | 80 % | 1.78 | 203.49 | tp4 sl6 tr0 h48 (6 · 3.06 · 12.80) |
| Signals | follow | sig-cci-s@m15 | 30 | 22 (73 %) | 325 | 74 % | 1.47 | 202.70 | tp8 sl16 tr2.4 h48 (11 · 76.71 · 27.65) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 27 (90 %) | 169 | 87 % | 2.79 | 195.69 | tp4 sl8 tr2 h48 (7 · ∞ (no loss) · 15.61) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 25 (83 %) | 583 | 74 % | 1.22 | 195.25 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 21 (70 %) | 193 | 78 % | 1.67 | 179.25 | tp4 sl8 tr1.2 h48 (11 · 273.64 · 25.27) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 78 | 94 % | 196.94 | 172.51 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 21 (70 %) | 294 | 73 % | 1.38 | 171.45 | tp8 sl16 tr2.4 h48 (8 · 8.92 · 21.77) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 29 (97 %) | 132 | 83 % | 3.23 | 150.54 | tp3 sl9 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-ema-slope-m@m15 | 23 | 21 (91 %) | 76 | 79 % | 5.39 | 147.69 | tp3 sl6 tr0.9 h48 (5 · 44.34 · 5.78) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 23 (77 %) | 249 | 79 % | 1.39 | 147.06 | tp4 sl8 tr1.6 h48 (10 · 2.68 · 13.80) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 20 (67 %) | 184 | 77 % | 1.59 | 144.23 | tp5 sl10 tr2 h48 (6 · ∞ (no loss) · 16.49) |
| Signals | follow | sig-rsi-reversal-m@m15 | 26 | 26 (100 %) | 47 | 96 % | 17.52 | 142.89 | – |
| Signals | follow | sig-rsi-reversal-s@m15 | 26 | 24 (92 %) | 44 | 95 % | 16.66 | 135.49 | – |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 20 (67 %) | 467 | 72 % | 1.21 | 121.89 | tp3 sl9 tr0 h48 (16 · 2.13 · 20.80) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 23 (77 %) | 325 | 76 % | 1.22 | 118.77 | tp5 sl10 tr1.5 h48 (13 · 2.77 · 18.10) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 49 | 98 % | 2153.48 | 117.82 | tp3 sl6 tr0.9 h48 (5 · 109.90 · 5.96) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 20 (67 %) | 146 | 78 % | 1.47 | 101.02 | tp6 sl12 tr2.4 h48 (6 · ∞ (no loss) · 13.35) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 18 (60 %) | 311 | 73 % | 1.18 | 100.17 | tp5 sl10 tr1.5 h48 (11 · 2.87 · 19.03) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 19 (63 %) | 563 | 71 % | 1.11 | 93.26 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-volume-break-m@m15 | 28 | 25 (89 %) | 46 | 74 % | 18.24 | 85.78 | – |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 24 (80 %) | 145 | 71 % | 1.76 | 81.74 | tp3 sl9 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 18 (60 %) | 191 | 73 % | 1.23 | 77.53 | tp5 sl10 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-zscore-s@m15 | 30 | 18 (60 %) | 191 | 73 % | 1.23 | 77.53 | tp5 sl10 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 19 (63 %) | 152 | 82 % | 1.33 | 70.68 | tp3 sl6 tr0.9 h48 (9 · 90.02 · 14.04) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 16 (53 %) | 185 | 70 % | 1.18 | 62.45 | tp4 sl8 tr1.2 h48 (9 · 5.68 · 12.87) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 16 (53 %) | 521 | 67 % | 1.08 | 62.15 | tp4 sl8 tr1.2 h48 (31 · 3.18 · 20.06) |
| Signals | follow | sig-s2-vol-break-s@m15 | 28 | 18 (64 %) | 30 | 60 % | 12.21 | 55.78 | – |
| Signals | follow | sig-volume-break-s@m15 | 28 | 16 (57 %) | 28 | 57 % | 11.99 | 54.66 | – |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 18 (60 %) | 193 | 72 % | 1.16 | 50.87 | tp3 sl6 tr0.9 h48 (11 · 58.13 · 13.34) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 20 (67 %) | 73 | 70 % | 1.45 | 48.65 | tp2.5 sl3.75 tr0 h48 (5 · 0.39 · -7.25) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 24 | 18 (75 %) | 50 | 74 % | 1.77 | 47.34 | – |
| Signals | follow | sig-zscore-m@m15 | 25 | 16 (64 %) | 104 | 73 % | 1.40 | 43.27 | tp5 sl10 tr1.5 h48 (6 · 1.62 · 2.34) |
| Signals | follow | sig-mfi-m@m15 | 20 | 17 (85 %) | 44 | 75 % | 3.38 | 33.78 | tp3 sl6 tr0.9 h48 (5 · 24.58 · 4.01) |
| Signals | follow | sig-trix-s@m15 | 30 | 14 (47 %) | 200 | 73 % | 1.01 | 5.03 | tp8 sl16 tr2.4 h48 (5 · ∞ (no loss) · 10.46) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 2.85 | – |
| Signals | follow | sig-hma-m@m15 | 30 | 12 (40 %) | 135 | 70 % | 0.87 | -34.34 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 8 (27 %) | 133 | 72 % | 0.80 | -50.73 | tp4 sl8 tr2 h48 (7 · 1.41 · 3.42) |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 17 (57 %) | 66 | 56 % | 0.59 | -56.91 | tp3 sl6 tr0.9 h48 (5 · 4.26 · 1.82) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 13 (43 %) | 271 | 72 % | 0.88 | -68.00 | tp3 sl6 tr1.2 h48 (15 · 3.00 · 13.16) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 29 | 10 (34 %) | 57 | 61 % | 0.52 | -84.94 | – |
| Signals | follow | sig-trix-m@m15 | 30 | 6 (20 %) | 133 | 60 % | 0.64 | -118.72 | tp2.5 sl7.5 tr0 h48 (5 · 1.19 · 1.50) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 8 (27 %) | 289 | 72 % | 0.79 | -122.38 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 5 (17 %) | 88 | 59 % | 0.52 | -123.01 | tp3 sl6 tr0.9 h48 (5 · 0.53 · -5.86) |
| Signals | follow | sig-vwap-s@m15 | 30 | 6 (20 %) | 272 | 66 % | 0.77 | -141.78 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 1 (3 %) | 133 | 53 % | 0.36 | -296.98 | tp3 sl6 tr0.9 h48 (9 · 1.71 · 4.54) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 3 (10 %) | 57 | 25 % | 0.05 | -312.20 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr off | 115 | 105 (91 %) | 1149 | 91 % | 3.03 | 1953.24 |
| Signals | tp 2.500% | sl 3.00× | tr off | 115 | 103 (90 %) | 1320 | 91 % | 3.03 | 1843.11 |
| Signals | tp 4.000% | sl 3.00× | tr off | 114 | 98 (86 %) | 755 | 90 % | 3.03 | 1731.63 |
| Signals | tp 3.000% | sl 2.00× | tr off | 115 | 95 (83 %) | 1278 | 83 % | 2.17 | 1596.84 |
| Signals | tp 5.000% | sl 3.00× | tr off | 113 | 100 (88 %) | 541 | 90 % | 3.07 | 1565.68 |
| Signals | tp 4.000% | sl 2.00× | tr 0.40× | 115 | 105 (91 %) | 1447 | 82 % | 2.89 | 1535.78 |
| Signals | tp 4.000% | sl 2.00× | tr 0.50× | 115 | 103 (90 %) | 1287 | 83 % | 2.74 | 1521.40 |
| Signals | tp 4.000% | sl 2.00× | tr off | 114 | 99 (87 %) | 821 | 83 % | 2.37 | 1498.43 |
| Signals | tp 4.000% | sl 2.00× | tr 0.30× | 117 | 104 (89 %) | 1705 | 78 % | 2.73 | 1486.89 |
| Signals | tp 5.000% | sl 2.00× | tr 0.40× | 115 | 99 (86 %) | 1226 | 84 % | 2.78 | 1425.32 |
| Signals | tp 5.000% | sl 2.00× | tr off | 113 | 89 (79 %) | 581 | 84 % | 2.54 | 1414.32 |
| Signals | tp 5.000% | sl 2.00× | tr 0.50× | 115 | 96 (83 %) | 1089 | 84 % | 2.58 | 1350.40 |
| Signals | tp 5.000% | sl 2.00× | tr 0.30× | 115 | 100 (87 %) | 1440 | 81 % | 2.57 | 1345.22 |
| Signals | tp 6.000% | sl 3.00× | tr off | 106 | 86 (81 %) | 379 | 89 % | 2.95 | 1285.98 |
| Signals | tp 6.000% | sl 2.00× | tr 0.40× | 115 | 96 (83 %) | 1099 | 82 % | 2.57 | 1280.89 |
| Signals | tp 8.000% | sl 2.00× | tr 0.30× | 115 | 100 (87 %) | 1063 | 83 % | 2.79 | 1276.35 |
| Signals | tp 3.000% | sl 2.00× | tr 0.40× | 117 | 97 (83 %) | 1851 | 76 % | 2.08 | 1267.40 |
| Signals | tp 3.000% | sl 2.00× | tr 0.50× | 115 | 93 (81 %) | 1687 | 78 % | 2.00 | 1230.93 |
| Signals | tp 5.000% | sl 1.50× | tr off | 113 | 89 (79 %) | 643 | 77 % | 2.09 | 1229.00 |
| Signals | tp 6.000% | sl 2.00× | tr off | 107 | 83 (78 %) | 409 | 83 % | 2.41 | 1145.62 |
| Signals | tp 4.000% | sl 1.50× | tr off | 115 | 91 (79 %) | 927 | 74 % | 1.77 | 1139.04 |
| Signals | tp 6.000% | sl 2.00× | tr 0.30× | 115 | 96 (83 %) | 1267 | 81 % | 2.24 | 1118.78 |
| Signals | tp 3.000% | sl 2.00× | tr 0.30× | 118 | 97 (82 %) | 2067 | 74 % | 1.88 | 1024.93 |
| Signals | tp 6.000% | sl 2.00× | tr 0.50× | 115 | 90 (78 %) | 894 | 79 % | 2.12 | 995.90 |
| Signals | tp 2.500% | sl 2.00× | tr off | 115 | 88 (77 %) | 1517 | 78 % | 1.55 | 967.54 |
| Signals | tp 6.000% | sl 1.50× | tr off | 107 | 82 (77 %) | 459 | 75 % | 1.93 | 955.62 |
| Signals | tp 3.000% | sl 1.50× | tr off | 116 | 83 (72 %) | 1449 | 71 % | 1.45 | 889.14 |
| Signals | tp 8.000% | sl 2.00× | tr 0.50× | 106 | 82 (77 %) | 578 | 82 % | 1.92 | 775.95 |
| Signals | tp 8.000% | sl 2.00× | tr 0.40× | 109 | 84 (77 %) | 738 | 83 % | 1.88 | 733.26 |
| Signals | tp 2.500% | sl 1.50× | tr off | 116 | 74 (64 %) | 1709 | 69 % | 1.29 | 615.39 |

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
