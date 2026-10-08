# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1354/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 351/19072 · PF 1.54 · Micro 233/5900 · PF 2.26 · Short 642/8176 · PF 1.47 · General 514/8176 · PF 1.50 · Long 570/8176 · PF 1.51 · Signals 126/126; Main 1228 pairs, 215798 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 182 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $20.00 (0.00 %, closed orders) · equity at end $20.00 (open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ – (gross profit $ ÷ gross loss $ as sized) · PF unit – (every order at one unit: the engine's PF) · 0 positions / 0 orders · WR 0.00 % · DDT (closed trades, $) 0.00 h · DDR – (net ≤ 0) · equity max drawdown $0.00 (0.00 %) · margin used max $0.00 · open avg 0.00 pos / 0.00 orders (peak 0 / 0)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 0 orders capped to $0, 0 scaled down · binding: position cap 0, gross cap 0. **Without the caps:** balance $20.00 → $20.00 (0.00 %) · PF $ – · equity at end $20.00 · equity max drawdown $0.00 (0.00 %) · margin used max $0.00.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 427 | 1161  | 4.6 % | 1.532 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 427 | 1161 (+0) | 4.6 % | 1.532 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 427 | 1159 (-2) | 4.6 % | 1.532 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 389 | 1026 (-135) | 4.1 % | 1.585 |
| closes ≥ 6 | 1.00 | 6 | 1 | 597 | 1564 (+403) | 6.3 % | 1.707 |
| closes ≥ 20 | 1.00 | 20 | 1 | 302 | 856 (-305) | 3.4 % | 1.447 |
| closes ≥ 30 | 1.00 | 30 | 1 | 216 | 645 (-516) | 2.6 % | 1.343 |
| DDR off | 1.00 | 12 | off | 1578 | 2673 (+1512) | 10.7 % | 1.143 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 782 | 1674 (+513) | 6.7 % | 1.363 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 151 | 557 (-604) | 2.2 % | 1.903 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1578 | 2673 (+1512) | 10.7 % | 1.143 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2024 | 3233 (+2072) | 12.9 % | 1.182 |

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1228 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (215798 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3330); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 27289 · 0.69 | 6894 · 0.80 | 9312 · 0.87 | 1320 · 0.65 | – | – | – | – | – |
| 13:00 | 46305 · 0.41 | 8282 · 0.68 | 14964 · 0.66 | 800 · 3.23 | – | – | – | – | – |
| 14:00 | 28632 · 1.99 | 7111 · 2.13 | 9314 · 2.11 | 1950 · 5.05 | – | – | – | – | – |
| 15:00 | 36865 · 1.34 | 9237 · 1.13 | 13044 · 1.39 | 3483 · 0.66 | – | – | – | – | – |
| 16:00 | 26519 · 1.16 | 4531 · 1.07 | 8750 · 1.67 | 885 · 1.08 | – | – | – | – | – |
| 17:00 | 17742 · 1.67 | 3672 · 1.16 | 6231 · 1.38 | 1233 · 1.51 | – | – | – | – | – |
| 18:00 | 17761 · 1.90 | 2959 · 2.86 | 4523 · 1.95 | 605 · 1.15 | – | – | – | – | – |
| 19:00 | 21358 · 1.01 | 5572 · 1.61 | 6577 · 1.04 | 1119 · 1.20 | – | – | – | – | – |
| 20:00 | 41130 · 0.60 | 12349 · 0.90 | 9511 · 0.52 | 2133 · 0.96 | – | – | – | – | – |
| 21:00 | 48377 · 0.66 | 13164 · 0.96 | 15372 · 0.66 | 2622 · 0.63 | – | – | – | – | – |
| 22:00 | 47695 · 0.42 | 12131 · 0.43 | 17651 · 0.45 | 2873 · 0.14 | – | – | – | – | – |
| 23:00 | 30064 · 0.46 | 5791 · 0.46 | 8339 · 0.38 | 1230 · 0.23 | – | – | – | – | – |
| **total** | **389737 · 0.78** | **91693 · 0.90** | **123588 · 0.78** | **20253 · 0.63** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 45234 | sig:confirm 45234 |

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
| Micro | 2.26 | – | – | – | – | 0 |
| Short | 1.47 | – | – | – | – | 0 |
| General | 1.50 | – | – | – | – | 0 |
| Long | 1.51 | – | – | – | – | 0 |
| Wide | 1.54 | – | – | – | – | 0 |
| Signals | – | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 212018 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2149 units active at the run start, 2981 over the run, 3330 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1665 | 521 (31 %) | 10194 | 57 % | 0.62 | -11613.67 |
| Signals | trailing | 1665 | 609 (37 %) | 10059 | 62 % | 0.63 | -9617.64 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 42 (71 %) | 358 | 76 % | 1.53 | 288.01 |
| Signals | signal:act-hf | 60 | 9 (15 %) | 487 | 58 % | 0.63 | -518.07 |
| Signals | signal:adx | 60 | 12 (20 %) | 343 | 55 % | 0.53 | -589.09 |
| Signals | signal:atr-break | 59 | 29 (49 %) | 314 | 64 % | 0.89 | -84.78 |
| Signals | signal:bollinger | 60 | 1 (2 %) | 348 | 51 % | 0.51 | -636.23 |
| Signals | signal:cci | 60 | 14 (23 %) | 497 | 60 % | 0.62 | -576.57 |
| Signals | signal:cmf | 56 | 1 (2 %) | 336 | 42 % | 0.24 | -1039.74 |
| Signals | signal:donchian | 45 | 19 (42 %) | 192 | 64 % | 0.93 | -29.25 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 177 | 90 % | 6.91 | 453.01 |
| Signals | signal:ema-cross-fast | 60 | 51 (85 %) | 403 | 81 % | 1.93 | 478.97 |
| Signals | signal:ema-pullback | 59 | 7 (12 %) | 410 | 56 % | 0.43 | -739.47 |
| Signals | signal:ema-slope | 59 | 35 (59 %) | 272 | 74 % | 1.28 | 137.34 |
| Signals | signal:ema-trend | 60 | 6 (10 %) | 503 | 55 % | 0.44 | -929.29 |
| Signals | signal:heikin-ashi | 59 | 3 (5 %) | 568 | 53 % | 0.46 | -1001.58 |
| Signals | signal:hma | 60 | 12 (20 %) | 436 | 54 % | 0.52 | -656.38 |
| Signals | signal:ichimoku | 58 | 27 (47 %) | 211 | 60 % | 0.68 | -183.71 |
| Signals | signal:impulse | 58 | 1 (2 %) | 368 | 38 % | 0.24 | -1199.97 |
| Signals | signal:kama | 60 | 9 (15 %) | 662 | 59 % | 0.63 | -668.63 |
| Signals | signal:keltner | 60 | 40 (67 %) | 194 | 72 % | 1.82 | 240.23 |
| Signals | signal:macd-cross | 57 | 7 (12 %) | 417 | 59 % | 0.56 | -505.92 |
| Signals | signal:macd-hist | 58 | 16 (28 %) | 601 | 66 % | 0.75 | -343.77 |
| Signals | signal:macd-slow | 59 | 18 (31 %) | 400 | 64 % | 0.71 | -294.36 |
| Signals | signal:mfi | 17 | 17 (100 %) | 32 | 97 % | 14.29 | 52.48 |
| Signals | signal:obv | 60 | 42 (70 %) | 530 | 74 % | 1.35 | 287.53 |
| Signals | signal:r-awesome | 57 | 2 (4 %) | 348 | 39 % | 0.26 | -1121.79 |
| Signals | signal:r-connors | 40 | 17 (43 %) | 147 | 56 % | 0.44 | -276.64 |
| Signals | signal:r-fractal | 40 | 1 (3 %) | 100 | 27 % | 0.13 | -400.76 |
| Signals | signal:r-inside | 13 | 0 (0 %) | 16 | 19 % | 0.08 | -86.64 |
| Signals | signal:r-linreg | 60 | 10 (17 %) | 456 | 55 % | 0.48 | -713.73 |
| Signals | signal:r-nr-break | 54 | 4 (7 %) | 232 | 34 % | 0.22 | -857.62 |
| Signals | signal:r-session-trend | 60 | 3 (5 %) | 447 | 50 % | 0.37 | -1089.56 |
| Signals | signal:r-vol-regime | 29 | 19 (66 %) | 39 | 67 % | 1.55 | 31.44 |
| Signals | signal:reclaim | 60 | 14 (23 %) | 638 | 64 % | 0.71 | -495.95 |
| Signals | signal:rsi-mid | 60 | 7 (12 %) | 348 | 48 % | 0.36 | -761.86 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:s2-active-hf | 60 | 4 (7 %) | 539 | 54 % | 0.57 | -684.29 |
| Signals | signal:s2-adx-gate | 60 | 17 (28 %) | 417 | 65 % | 0.73 | -270.28 |
| Signals | signal:s2-atr-break | 60 | 3 (5 %) | 406 | 50 % | 0.42 | -805.70 |
| Signals | signal:s2-bb-bounce | 60 | 33 (55 %) | 233 | 61 % | 0.99 | -4.56 |
| Signals | signal:s2-block-scale | 60 | 4 (7 %) | 520 | 59 % | 0.53 | -644.41 |
| Signals | signal:s2-block-stack | 59 | 4 (7 %) | 246 | 47 % | 0.38 | -644.49 |
| Signals | signal:s2-confluence | 60 | 35 (58 %) | 601 | 68 % | 1.03 | 31.47 |
| Signals | signal:s2-ema-cross | 30 | 26 (87 %) | 33 | 88 % | 9.38 | 116.77 |
| Signals | signal:s2-range-break | 54 | 41 (76 %) | 78 | 79 % | 1.56 | 76.69 |
| Signals | signal:s2-range-shift | 59 | 16 (27 %) | 249 | 49 % | 0.51 | -414.88 |
| Signals | signal:s2-rsi-revert | 23 | 7 (30 %) | 54 | 44 % | 0.45 | -96.84 |
| Signals | signal:s2-st-trail | 55 | 40 (73 %) | 107 | 78 % | 2.04 | 137.87 |
| Signals | signal:s2-stoch-swing | 60 | 40 (67 %) | 531 | 73 % | 1.47 | 412.89 |
| Signals | signal:s2-vol-break | 54 | 28 (52 %) | 120 | 72 % | 0.97 | -8.70 |
| Signals | signal:s2-vwap-axis | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 82.74 |
| Signals | signal:sar | 60 | 9 (15 %) | 564 | 60 % | 0.63 | -569.15 |
| Signals | signal:squeeze | 49 | 13 (27 %) | 66 | 42 % | 0.13 | -311.35 |
| Signals | signal:st-slow | 55 | 24 (44 %) | 122 | 66 % | 1.05 | 12.36 |
| Signals | signal:stoch-rsi | 59 | 7 (12 %) | 620 | 52 % | 0.40 | -1139.98 |
| Signals | signal:supertrend | 60 | 42 (70 %) | 233 | 72 % | 1.22 | 95.20 |
| Signals | signal:swing | 55 | 3 (5 %) | 494 | 52 % | 0.38 | -991.87 |
| Signals | signal:thrust | 59 | 4 (7 %) | 511 | 52 % | 0.35 | -1141.99 |
| Signals | signal:trix | 60 | 41 (68 %) | 285 | 73 % | 1.49 | 258.30 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 22 (37 %) | 447 | 68 % | 0.91 | -85.62 |
| Signals | signal:williams-r | 60 | 22 (37 %) | 539 | 62 % | 0.84 | -236.26 |
| Signals | signal:zscore | 60 | 0 (0 %) | 305 | 47 % | 0.40 | -756.98 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 75768 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75768 | 0 |  |
| Short | 39456 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39456 | 0 |  |
| General | 13080 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13080 | 0 |  |
| Long | 18630 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18630 | 0 |  |
| Wide | 65084 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 65084 | 0 |  |
| Signals | 3780 | – | 2149 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2149 units (pair × symbol × direction) active at the run start, 2981 over the run; 3330 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 25256 | 2786 (11 %) | 13086 | 67 % | 0.41 | -3724.17 |
| Micro | trailing | 50512 | 5206 (10 %) | 26258 | 58 % | 0.35 | -8181.31 |
| Short | normal | 13152 | 3012 (23 %) | 25894 | 53 % | 0.70 | -12316.20 |
| Short | trailing | 26304 | 6323 (24 %) | 56855 | 52 % | 0.63 | -27120.46 |
| General | normal | 7848 | 1348 (17 %) | 12988 | 38 % | 0.78 | -5106.60 |
| General | trailing | 5232 | 1050 (20 %) | 7898 | 49 % | 0.65 | -5069.43 |
| Long | normal | 11178 | 1844 (16 %) | 14999 | 43 % | 0.99 | -339.20 |
| Long | trailing | 7452 | 1142 (15 %) | 8121 | 51 % | 0.73 | -5627.97 |
| Wide | axis | 55260 | 8538 (15 %) | 152840 | 29 % | 0.65 | -40788.12 |
| Wide | dca | 4912 | 1260 (26 %) | 13310 | 61 % | 0.67 | -6800.26 |
| Wide | dca-active | 4912 | 771 (16 %) | 8306 | 33 % | 0.59 | -3052.02 |
| Signals | normal | 1890 | 1086 (57 %) | 24726 | 69 % | 1.12 | 6409.06 |
| Signals | trailing | 1890 | 1198 (63 %) | 24456 | 71 % | 1.23 | 10041.36 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 42 (71 %) | 358 | 76 % | 1.53 | 288.01 |
| Signals | signal:act-hf | 60 | 9 (15 %) | 487 | 58 % | 0.63 | -518.07 |
| Signals | signal:adx | 60 | 12 (20 %) | 343 | 55 % | 0.53 | -589.09 |
| Signals | signal:atr-break | 59 | 29 (49 %) | 314 | 64 % | 0.89 | -84.78 |
| Signals | signal:bollinger | 60 | 1 (2 %) | 348 | 51 % | 0.51 | -636.23 |
| Signals | signal:cci | 60 | 14 (23 %) | 497 | 60 % | 0.62 | -576.57 |
| Signals | signal:cmf | 56 | 1 (2 %) | 336 | 42 % | 0.24 | -1039.74 |
| Signals | signal:donchian | 45 | 19 (42 %) | 192 | 64 % | 0.93 | -29.25 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 177 | 90 % | 6.91 | 453.01 |
| Signals | signal:ema-cross-fast | 60 | 51 (85 %) | 403 | 81 % | 1.93 | 478.97 |
| Signals | signal:ema-pullback | 59 | 7 (12 %) | 410 | 56 % | 0.43 | -739.47 |
| Signals | signal:ema-slope | 59 | 35 (59 %) | 272 | 74 % | 1.28 | 137.34 |
| Signals | signal:ema-trend | 60 | 6 (10 %) | 503 | 55 % | 0.44 | -929.29 |
| Signals | signal:heikin-ashi | 59 | 3 (5 %) | 568 | 53 % | 0.46 | -1001.58 |
| Signals | signal:hma | 60 | 12 (20 %) | 436 | 54 % | 0.52 | -656.38 |
| Signals | signal:ichimoku | 58 | 27 (47 %) | 211 | 60 % | 0.68 | -183.71 |
| Signals | signal:impulse | 58 | 1 (2 %) | 368 | 38 % | 0.24 | -1199.97 |
| Signals | signal:kama | 60 | 9 (15 %) | 662 | 59 % | 0.63 | -668.63 |
| Signals | signal:keltner | 60 | 40 (67 %) | 194 | 72 % | 1.82 | 240.23 |
| Signals | signal:macd-cross | 57 | 7 (12 %) | 417 | 59 % | 0.56 | -505.92 |
| Signals | signal:macd-hist | 58 | 16 (28 %) | 601 | 66 % | 0.75 | -343.77 |
| Signals | signal:macd-slow | 59 | 18 (31 %) | 400 | 64 % | 0.71 | -294.36 |
| Signals | signal:mfi | 17 | 17 (100 %) | 32 | 97 % | 14.29 | 52.48 |
| Signals | signal:obv | 60 | 42 (70 %) | 530 | 74 % | 1.35 | 287.53 |
| Signals | signal:r-awesome | 57 | 2 (4 %) | 348 | 39 % | 0.26 | -1121.79 |
| Signals | signal:r-connors | 40 | 17 (43 %) | 147 | 56 % | 0.44 | -276.64 |
| Signals | signal:r-fractal | 40 | 1 (3 %) | 100 | 27 % | 0.13 | -400.76 |
| Signals | signal:r-inside | 13 | 0 (0 %) | 16 | 19 % | 0.08 | -86.64 |
| Signals | signal:r-linreg | 60 | 10 (17 %) | 456 | 55 % | 0.48 | -713.73 |
| Signals | signal:r-nr-break | 54 | 4 (7 %) | 232 | 34 % | 0.22 | -857.62 |
| Signals | signal:r-session-trend | 60 | 3 (5 %) | 447 | 50 % | 0.37 | -1089.56 |
| Signals | signal:r-vol-regime | 29 | 19 (66 %) | 39 | 67 % | 1.55 | 31.44 |
| Signals | signal:reclaim | 60 | 14 (23 %) | 638 | 64 % | 0.71 | -495.95 |
| Signals | signal:rsi-mid | 60 | 7 (12 %) | 348 | 48 % | 0.36 | -761.86 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:s2-active-hf | 60 | 4 (7 %) | 539 | 54 % | 0.57 | -684.29 |
| Signals | signal:s2-adx-gate | 60 | 17 (28 %) | 417 | 65 % | 0.73 | -270.28 |
| Signals | signal:s2-atr-break | 60 | 3 (5 %) | 406 | 50 % | 0.42 | -805.70 |
| Signals | signal:s2-bb-bounce | 60 | 33 (55 %) | 233 | 61 % | 0.99 | -4.56 |
| Signals | signal:s2-block-scale | 60 | 4 (7 %) | 520 | 59 % | 0.53 | -644.41 |
| Signals | signal:s2-block-stack | 59 | 4 (7 %) | 246 | 47 % | 0.38 | -644.49 |
| Signals | signal:s2-confluence | 60 | 35 (58 %) | 601 | 68 % | 1.03 | 31.47 |
| Signals | signal:s2-ema-cross | 30 | 26 (87 %) | 33 | 88 % | 9.38 | 116.77 |
| Signals | signal:s2-range-break | 54 | 41 (76 %) | 78 | 79 % | 1.56 | 76.69 |
| Signals | signal:s2-range-shift | 59 | 16 (27 %) | 249 | 49 % | 0.51 | -414.88 |
| Signals | signal:s2-rsi-revert | 23 | 7 (30 %) | 54 | 44 % | 0.45 | -96.84 |
| Signals | signal:s2-st-trail | 55 | 40 (73 %) | 107 | 78 % | 2.04 | 137.87 |
| Signals | signal:s2-stoch-swing | 60 | 40 (67 %) | 531 | 73 % | 1.47 | 412.89 |
| Signals | signal:s2-vol-break | 54 | 28 (52 %) | 120 | 72 % | 0.97 | -8.70 |
| Signals | signal:s2-vwap-axis | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 82.74 |
| Signals | signal:sar | 60 | 9 (15 %) | 564 | 60 % | 0.63 | -569.15 |
| Signals | signal:squeeze | 49 | 13 (27 %) | 66 | 42 % | 0.13 | -311.35 |
| Signals | signal:st-slow | 55 | 24 (44 %) | 122 | 66 % | 1.05 | 12.36 |
| Signals | signal:stoch-rsi | 59 | 7 (12 %) | 620 | 52 % | 0.40 | -1139.98 |
| Signals | signal:supertrend | 60 | 42 (70 %) | 233 | 72 % | 1.22 | 95.20 |
| Signals | signal:swing | 55 | 3 (5 %) | 494 | 52 % | 0.38 | -991.87 |
| Signals | signal:thrust | 59 | 4 (7 %) | 511 | 52 % | 0.35 | -1141.99 |
| Signals | signal:trix | 60 | 41 (68 %) | 285 | 73 % | 1.49 | 258.30 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 22 (37 %) | 447 | 68 % | 0.91 | -85.62 |
| Signals | signal:williams-r | 60 | 22 (37 %) | 539 | 62 % | 0.84 | -236.26 |
| Signals | signal:zscore | 60 | 0 (0 %) | 305 | 47 % | 0.40 | -756.98 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1002 | 295 (29 %) | 6672 | 62 % | 0.62 | -7713.43 |
| Signals | 1.25 | 602 | 170 (28 %) | 4108 | 62 % | 0.62 | -4943.19 |
| Signals | 1.35 | 412 | 111 (27 %) | 2795 | 63 % | 0.62 | -3387.46 |
| Signals | 1.5 | 233 | 60 (26 %) | 1645 | 64 % | 0.63 | -1903.85 |
| Signals | 1.75 | 105 | 29 (28 %) | 732 | 67 % | 0.67 | -735.61 |
| Signals | 2 | 52 | 17 (33 %) | 374 | 70 % | 0.80 | -199.92 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 232 | 84 % | 2.98 | 416.96 | tp5 sl15 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 124 | 97 % | 27.39 | 367.71 | tp4 sl8 tr1.6 h48 (6 · ∞ (no loss) · 14.35) |
| Signals | follow | sig-obv-m@m15 | 30 | 27 (90 %) | 181 | 81 % | 2.82 | 293.57 | tp4 sl6 tr0 h48 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 24 (80 %) | 270 | 77 % | 1.77 | 289.01 | tp4 sl6 tr0 h48 (9 · 4.90 · 24.20) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 102 | 91 % | 10.01 | 286.69 | tp4 sl8 tr1.6 h48 (5 · ∞ (no loss) · 11.84) |
| Signals | follow | sig-trix-s@m15 | 30 | 23 (77 %) | 137 | 73 % | 2.22 | 208.44 | tp5 sl10 tr2 h48 (5 · 111.10 · 14.62) |
| Signals | follow | sig-keltner-s@m15 | 30 | 25 (83 %) | 125 | 71 % | 2.12 | 171.36 | tp4 sl8 tr1.6 h48 (6 · 20.82 · 8.15) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 30 (100 %) | 75 | 89 % | 4.71 | 166.32 | – |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 48 | 100 % | ∞ (no loss) | 149.73 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 29 (97 %) | 51 | 94 % | 10.81 | 135.88 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 25 | 25 (100 %) | 35 | 94 % | 204.22 | 134.24 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 21 (70 %) | 293 | 71 % | 1.23 | 118.08 | tp8 sl16 tr3.2 h48 (7 · 734.85 · 23.16) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 26 (87 %) | 33 | 88 % | 9.38 | 116.77 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 21 (70 %) | 279 | 75 % | 1.22 | 111.26 | tp8 sl16 tr3.2 h48 (7 · ∞ (no loss) · 26.77) |
| Signals | follow | sig-ichimoku-m@m15 | 28 | 26 (93 %) | 35 | 86 % | 8.76 | 100.72 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 22 (73 %) | 83 | 69 % | 1.61 | 85.65 | tp3 sl4.5 tr0 h48 (5 · 0.40 · -8.50) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 82.74 | – |
| Signals | follow | sig-donchian-s@m15 | 30 | 18 (60 %) | 151 | 71 % | 1.28 | 78.06 | tp3 sl9 tr0 h48 (6 · 1.52 · 4.80) |
| Signals | follow | sig-ema-slope-m@m15 | 29 | 19 (66 %) | 97 | 78 % | 1.45 | 74.89 | tp2.5 sl3.75 tr0 h48 (5 · 0.87 · -1.00) |
| Signals | follow | sig-r-vol-regime-s@m15 | 22 | 19 (86 %) | 32 | 81 % | 4.87 | 70.09 | – |
| Signals | follow | sig-keltner-m@m15 | 30 | 15 (50 %) | 69 | 74 % | 1.49 | 68.88 | – |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 16 (53 %) | 175 | 71 % | 1.19 | 62.45 | tp4 sl8 tr0 h48 (6 · 2.32 · 10.80) |
| Signals | follow | sig-s2-vol-break-m@m15 | 24 | 21 (88 %) | 32 | 88 % | 4.52 | 60.98 | – |
| Signals | follow | sig-mfi-m@m15 | 17 | 17 (100 %) | 32 | 97 % | 14.29 | 52.48 | – |
| Signals | follow | sig-trix-m@m15 | 30 | 18 (60 %) | 148 | 73 % | 1.14 | 49.86 | tp4 sl8 tr0 h48 (5 · 1.85 · 7.00) |
| Signals | follow | sig-rsi-momentum-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-volume-break-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-r-connors-s@m15 | 13 | 13 (100 %) | 14 | 100 % | ∞ (no loss) | 33.34 | – |
| Signals | follow | sig-adx-m@m15 | 30 | 10 (33 %) | 105 | 70 % | 1.09 | 21.19 | tp4 sl8 tr1.6 h48 (7 · 1.09 · 0.75) |
| Signals | follow | sig-st-slow-m@m15 | 30 | 13 (43 %) | 66 | 70 % | 1.07 | 10.37 | – |
| Signals | follow | sig-st-slow-s@m15 | 25 | 11 (44 %) | 56 | 63 % | 1.02 | 1.99 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 25 | 11 (44 %) | 56 | 63 % | 1.02 | 1.99 | – |
| Signals | follow | sig-vwap-m@m15 | 30 | 11 (37 %) | 125 | 70 % | 1.00 | 1.06 | tp3 sl4.5 tr0 h48 (6 · 2.98 · 9.30) |
| Signals | follow | sig-macd-slow-m@m15 | 29 | 15 (52 %) | 163 | 70 % | 1.00 | 0.49 | tp4 sl6 tr0 h48 (6 · 3.06 · 12.80) |
| Signals | follow | sig-act-burst-m@m15 | 29 | 18 (62 %) | 88 | 72 % | 0.99 | -1.00 | tp3 sl6 tr1.2 h48 (5 · 6.85 · 4.78) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 12 (40 %) | 299 | 65 % | 0.99 | -4.07 | tp5 sl15 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 16 (53 %) | 348 | 67 % | 0.99 | -5.76 | tp8 sl16 tr6.4 h48 (6 · 2.41 · 22.80) |
| Signals | follow | sig-obv-s@m15 | 30 | 15 (50 %) | 349 | 70 % | 0.99 | -6.03 | tp5 sl10 tr3 h48 (8 · 2.44 · 14.73) |
| Signals | follow | sig-cci-m@m15 | 30 | 14 (47 %) | 169 | 66 % | 0.98 | -9.89 | tp5 sl10 tr3 h48 (5 · 1.88 · 9.00) |
| Signals | follow | sig-r-vol-regime-m@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -38.65 | – |
| Signals | follow | sig-atr-break-m@m15 | 29 | 17 (59 %) | 79 | 68 % | 0.75 | -40.03 | tp2.5 sl3.75 tr0 h48 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 12 (40 %) | 235 | 63 % | 0.92 | -44.75 | tp5 sl10 tr3 h48 (6 · 1.96 · 9.83) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 12 (40 %) | 185 | 65 % | 0.87 | -54.53 | tp8 sl16 tr3.2 h48 (5 · ∞ (no loss) · 18.19) |
| Signals | follow | sig-s2-range-break-m@m15 | 29 | 16 (55 %) | 43 | 67 % | 0.58 | -57.55 | – |
| Signals | follow | sig-hma-m@m15 | 30 | 11 (37 %) | 257 | 64 % | 0.90 | -58.56 | tp8 sl16 tr3.2 h48 (6 · ∞ (no loss) · 20.94) |
| Signals | follow | sig-s2-vol-break-s@m15 | 30 | 7 (23 %) | 88 | 66 % | 0.72 | -69.68 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-squeeze-m@m15 | 19 | 10 (53 %) | 19 | 53 % | 0.13 | -70.86 | – |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 14 (47 %) | 308 | 65 % | 0.85 | -86.61 | tp8 sl16 tr3.2 h48 (5 · 461.24 · 14.53) |
| Signals | follow | sig-r-inside-s@m15 | 13 | 0 (0 %) | 16 | 19 % | 0.08 | -86.64 | – |
| Signals | follow | sig-vwap-s@m15 | 30 | 11 (37 %) | 322 | 67 % | 0.89 | -86.68 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 11 (37 %) | 150 | 57 % | 0.79 | -90.21 | tp5 sl10 tr2 h48 (5 · 1.21 · 2.15) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 8 (27 %) | 118 | 66 % | 0.69 | -96.30 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 23 | 7 (30 %) | 54 | 44 % | 0.45 | -96.84 | tp2.5 sl3.75 tr0 h48 (5 · 0.15 · -13.50) |
| Signals | follow | sig-donchian-m@m15 | 15 | 1 (7 %) | 41 | 37 % | 0.27 | -107.31 | tp2.5 sl5 tr0 h48 (5 · 0.29 · -11.00) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 10 (33 %) | 369 | 69 % | 0.86 | -109.53 | tp2.5 sl5 tr0 h48 (22 · 1.50 · 13.10) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 9 (30 %) | 396 | 68 % | 0.85 | -136.10 | tp8 sl16 tr3.2 h48 (8 · 1.47 · 7.53) |
| Signals | follow | sig-r-fractal-m@m15 | 16 | 0 (0 %) | 21 | 5 % | 0.00 | -139.58 | – |
| Signals | follow | sig-act-hf-s@m15 | 30 | 8 (27 %) | 238 | 61 % | 0.75 | -148.79 | tp5 sl7.5 tr0 h48 (6 · 1.25 · 3.80) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 1 (3 %) | 116 | 54 % | 0.62 | -160.05 | tp4 sl6 tr0 h48 (5 · 0.41 · -11.00) |
| Signals | follow | sig-kama-m@m15 | 30 | 7 (23 %) | 321 | 64 % | 0.79 | -165.77 | tp8 sl16 tr3.2 h48 (7 · 1.66 · 10.77) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 9 (30 %) | 299 | 64 % | 0.74 | -173.97 | tp2.5 sl7.5 tr0 h48 (14 · 1.79 · 12.20) |
| Signals | follow | sig-s2-range-shift-s@m15 | 29 | 13 (45 %) | 116 | 41 % | 0.46 | -185.08 | tp2.5 sl3.75 tr0 h48 (11 · 0.49 · -12.20) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 5 (17 %) | 246 | 62 % | 0.68 | -219.94 | tp8 sl16 tr3.2 h48 (5 · ∞ (no loss) · 14.25) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 4 (13 %) | 184 | 57 % | 0.62 | -225.79 | tp3 sl6 tr0 h48 (7 · 1.13 · 1.60) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 3 (10 %) | 133 | 56 % | 0.55 | -229.80 | tp3 sl6 tr1.8 h48 (6 · 1.79 · 4.96) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 6 (20 %) | 191 | 52 % | 0.59 | -230.49 | tp6 sl12 tr2.4 h48 (6 · 1.51 · 6.31) |
| Signals | follow | sig-macd-cross-s@m15 | 28 | 6 (21 %) | 232 | 61 % | 0.62 | -234.24 | tp4 sl8 tr3.2 h48 (10 · 1.42 · 6.96) |
| Signals | follow | sig-macd-hist-s@m15 | 28 | 6 (21 %) | 232 | 61 % | 0.62 | -234.24 | tp4 sl8 tr3.2 h48 (10 · 1.42 · 6.96) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 3 (10 %) | 47 | 38 % | 0.12 | -240.49 | – |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 6 (20 %) | 160 | 59 % | 0.52 | -245.68 | tp4 sl8 tr2.4 h48 (6 · 1.58 · 4.77) |
| Signals | follow | sig-sar-s@m15 | 30 | 6 (20 %) | 290 | 62 % | 0.65 | -250.96 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 5 (17 %) | 172 | 58 % | 0.48 | -251.95 | tp3 sl6 tr1.8 h48 (10 · 1.19 · 2.41) |
| Signals | follow | sig-r-fractal-s@m15 | 24 | 1 (4 %) | 79 | 33 % | 0.19 | -261.18 | tp3 sl6 tr1.2 h48 (6 · 0.26 · -9.44) |
| Signals | follow | sig-macd-cross-m@m15 | 29 | 1 (3 %) | 185 | 55 % | 0.48 | -271.68 | tp4 sl6 tr0 h48 (8 · 1.02 · 0.40) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 73 | 40 % | 0.23 | -280.80 | tp3 sl6 tr1.2 h48 (5 · 0.16 · -15.66) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 1 (3 %) | 176 | 55 % | 0.50 | -284.43 | tp4 sl12 tr0 h48 (5 · 1.25 · 3.00) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 3 (10 %) | 237 | 60 % | 0.55 | -294.85 | tp3 sl9 tr0 h48 (8 · 0.91 · -1.60) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 3 (10 %) | 250 | 58 % | 0.53 | -308.41 | tp2.5 sl5 tr0 h48 (16 · 0.97 · -0.70) |
| Signals | follow | sig-r-connors-m@m15 | 27 | 4 (15 %) | 133 | 52 % | 0.37 | -309.97 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-thrust-m@m15 | 29 | 4 (14 %) | 314 | 64 % | 0.59 | -313.35 | tp2.5 sl7.5 tr0 h48 (15 · 1.19 · 4.50) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 4 (13 %) | 160 | 55 % | 0.42 | -316.67 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-sar-m@m15 | 30 | 3 (10 %) | 274 | 59 % | 0.61 | -318.19 | tp5 sl10 tr3 h48 (6 · 1.59 · 6.06) |
| Signals | follow | sig-swing-s@m15 | 25 | 3 (12 %) | 187 | 55 % | 0.42 | -330.59 | tp2.5 sl3.75 tr0 h48 (12 · 1.16 · 2.60) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 1 (3 %) | 270 | 60 % | 0.53 | -336.00 | tp3 sl6 tr0 h48 (9 · 1.58 · 7.20) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 2 (7 %) | 270 | 54 % | 0.58 | -340.25 | tp6 sl12 tr0 h48 (6 · 0.95 · -1.20) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 2 (7 %) | 269 | 54 % | 0.57 | -344.05 | tp6 sl12 tr0 h48 (6 · 0.95 · -1.20) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 5 (17 %) | 242 | 58 % | 0.54 | -359.85 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 1 (3 %) | 249 | 55 % | 0.53 | -369.28 | tp5 sl10 tr3 h48 (5 · 1.46 · 4.67) |
| Signals | follow | sig-r-nr-break-m@m15 | 28 | 3 (11 %) | 133 | 41 % | 0.32 | -383.81 | tp3 sl6 tr1.8 h48 (8 · 0.48 · -9.70) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 1 (3 %) | 191 | 47 % | 0.43 | -394.84 | tp5 sl10 tr4 h48 (5 · 0.71 · -6.00) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 3 (10 %) | 338 | 58 % | 0.59 | -403.38 | tp8 sl16 tr6.4 h48 (5 · 1.43 · 6.99) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 2 (7 %) | 215 | 53 % | 0.39 | -410.86 | tp3 sl6 tr0 h48 (10 · 1.05 · 1.00) |
| Signals | follow | sig-s2-block-stack-m@m15 | 29 | 0 (0 %) | 62 | 18 % | 0.06 | -418.70 | tp3 sl6 tr1.2 h48 (5 · 0.00 · -13.30) |
| Signals | follow | sig-cmf-s@m15 | 26 | 1 (4 %) | 167 | 49 % | 0.32 | -419.71 | tp3 sl6 tr1.8 h48 (12 · 0.82 · -3.41) |
| Signals | follow | sig-ema-pullback-s@m15 | 29 | 3 (10 %) | 250 | 57 % | 0.43 | -422.80 | tp5 sl10 tr3 h48 (5 · 0.98 · -0.24) |
| Signals | follow | sig-stoch-rsi-m@m15 | 29 | 3 (10 %) | 267 | 54 % | 0.43 | -435.67 | tp6 sl12 tr2.4 h48 (8 · 0.45 · -6.69) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 4 (13 %) | 296 | 53 % | 0.46 | -468.04 | tp8 sl16 tr3.2 h48 (5 · 8.55 · 5.09) |
| Signals | follow | sig-impulse-s@m15 | 28 | 1 (4 %) | 218 | 46 % | 0.36 | -472.23 | tp6 sl12 tr2.4 h48 (6 · 0.58 · -5.72) |
| Signals | follow | sig-r-nr-break-s@m15 | 26 | 1 (4 %) | 99 | 24 % | 0.12 | -473.81 | tp2.5 sl3.75 tr0 h48 (7 · 0.44 · -8.90) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 0 (0 %) | 232 | 50 % | 0.46 | -476.18 | tp8 sl16 tr3.2 h48 (5 · 0.90 · -1.60) |
| Signals | follow | sig-zscore-s@m15 | 30 | 0 (0 %) | 232 | 50 % | 0.46 | -476.18 | tp8 sl16 tr3.2 h48 (5 · 0.90 · -1.60) |
| Signals | follow | sig-kama-s@m15 | 30 | 2 (7 %) | 341 | 55 % | 0.50 | -502.86 | tp8 sl16 tr3.2 h48 (6 · 1.24 · 3.84) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 2 (7 %) | 176 | 39 % | 0.27 | -509.91 | tp2.5 sl3.75 tr0 h48 (12 · 0.58 · -9.90) |
| Signals | follow | sig-r-awesome-s@m15 | 27 | 1 (4 %) | 99 | 20 % | 0.06 | -513.49 | tp3 sl6 tr1.2 h48 (8 · 0.06 · -12.28) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 2 (7 %) | 202 | 48 % | 0.31 | -532.15 | tp6 sl12 tr2.4 h48 (6 · 0.74 · -3.23) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 1 (3 %) | 245 | 52 % | 0.42 | -557.41 | tp6 sl12 tr2.4 h48 (7 · 1.27 · 3.30) |
| Signals | follow | sig-cci-s@m15 | 30 | 0 (0 %) | 328 | 57 % | 0.48 | -566.67 | tp8 sl16 tr3.2 h48 (9 · 0.74 · -6.20) |
| Signals | follow | sig-hma-s@m15 | 30 | 1 (3 %) | 179 | 39 % | 0.23 | -597.82 | tp3 sl6 tr1.2 h48 (16 · 0.51 · -12.58) |
| Signals | follow | sig-heikin-ashi-m@m15 | 29 | 0 (0 %) | 230 | 45 % | 0.30 | -598.20 | tp3 sl6 tr0 h48 (14 · 0.60 · -14.80) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 1 (3 %) | 249 | 46 % | 0.37 | -608.31 | tp6 sl12 tr2.4 h48 (5 · 0.85 · -1.77) |
| Signals | follow | sig-adx-s@m15 | 30 | 2 (7 %) | 238 | 48 % | 0.40 | -610.29 | tp8 sl16 tr3.2 h48 (6 · 1.54 · 8.67) |
| Signals | follow | sig-cmf-m@m15 | 30 | 0 (0 %) | 169 | 35 % | 0.18 | -620.03 | tp4 sl8 tr1.6 h48 (6 · 0.17 · -6.91) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 307 | 51 % | 0.36 | -661.27 | tp8 sl16 tr3.2 h48 (5 · 0.25 · -12.09) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 4 (13 %) | 353 | 50 % | 0.37 | -704.30 | tp6 sl12 tr2.4 h48 (13 · 0.61 · -9.76) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 1 (3 %) | 257 | 49 % | 0.28 | -709.34 | tp3 sl6 tr0 h48 (10 · 0.68 · -8.00) |
| Signals | follow | sig-impulse-m@m15 | 30 | 0 (0 %) | 150 | 25 % | 0.13 | -727.74 | tp3 sl6 tr1.8 h48 (9 · 0.34 · -16.57) |
| Signals | follow | sig-thrust-s@m15 | 30 | 0 (0 %) | 197 | 32 % | 0.16 | -828.64 | tp4 sl8 tr1.6 h48 (9 · 0.33 · -16.71) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 3.00× | tr off | 88 | 62 (70 %) | 187 | 83 % | 1.78 | 388.96 |
| Signals | tp 8.000% | sl 2.00× | tr 0.40× | 113 | 68 (60 %) | 394 | 83 % | 1.06 | 56.22 |
| Signals | tp 8.000% | sl 2.00× | tr 0.60× | 98 | 53 (54 %) | 220 | 73 % | 1.00 | -0.55 |
| Signals | tp 8.000% | sl 2.00× | tr 0.80× | 89 | 47 (53 %) | 174 | 67 % | 0.95 | -43.57 |
| Signals | tp 5.000% | sl 3.00× | tr off | 107 | 48 (45 %) | 333 | 70 % | 0.75 | -361.66 |
| Signals | tp 6.000% | sl 2.00× | tr 0.60× | 109 | 44 (40 %) | 398 | 71 % | 0.69 | -407.94 |
| Signals | tp 6.000% | sl 2.00× | tr 0.40× | 116 | 48 (41 %) | 576 | 72 % | 0.67 | -487.08 |
| Signals | tp 6.000% | sl 2.00× | tr off | 98 | 28 (29 %) | 274 | 57 % | 0.63 | -531.04 |
| Signals | tp 5.000% | sl 2.00× | tr 0.60× | 115 | 46 (40 %) | 550 | 68 % | 0.67 | -548.55 |
| Signals | tp 6.000% | sl 2.00× | tr 0.80× | 100 | 28 (28 %) | 325 | 59 % | 0.60 | -616.37 |
| Signals | tp 5.000% | sl 2.00× | tr 0.80× | 112 | 34 (30 %) | 486 | 59 % | 0.61 | -720.83 |
| Signals | tp 4.000% | sl 2.00× | tr 0.80× | 113 | 39 (35 %) | 652 | 62 % | 0.62 | -755.73 |
| Signals | tp 4.000% | sl 1.50× | tr off | 114 | 38 (33 %) | 755 | 51 % | 0.64 | -819.00 |
| Signals | tp 4.000% | sl 3.00× | tr off | 110 | 33 (30 %) | 488 | 65 % | 0.60 | -822.53 |
| Signals | tp 3.000% | sl 2.00× | tr off | 118 | 37 (31 %) | 900 | 59 % | 0.64 | -838.59 |
| Signals | tp 5.000% | sl 2.00× | tr off | 108 | 33 (31 %) | 427 | 55 % | 0.57 | -852.26 |
| Signals | tp 2.500% | sl 3.00× | tr off | 117 | 35 (30 %) | 924 | 68 % | 0.63 | -855.69 |
| Signals | tp 3.000% | sl 2.00× | tr 0.80× | 118 | 32 (27 %) | 997 | 56 % | 0.61 | -909.97 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 37 (32 %) | 703 | 66 % | 0.59 | -914.00 |
| Signals | tp 6.000% | sl 1.50× | tr off | 108 | 28 (26 %) | 367 | 45 % | 0.51 | -921.64 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 29 (24 %) | 1190 | 59 % | 0.63 | -946.39 |
| Signals | tp 3.000% | sl 2.00× | tr 0.60× | 118 | 34 (29 %) | 1187 | 59 % | 0.60 | -948.99 |
| Signals | tp 2.500% | sl 1.50× | tr off | 119 | 26 (22 %) | 1356 | 52 % | 0.63 | -957.09 |
| Signals | tp 4.000% | sl 2.00× | tr off | 111 | 30 (27 %) | 616 | 55 % | 0.57 | -963.81 |
| Signals | tp 5.000% | sl 1.50× | tr off | 112 | 30 (27 %) | 544 | 47 % | 0.55 | -993.84 |
| Signals | tp 5.000% | sl 2.00× | tr 0.40× | 116 | 37 (32 %) | 782 | 63 % | 0.50 | -1006.01 |
| Signals | tp 4.000% | sl 2.00× | tr 0.60× | 115 | 32 (28 %) | 797 | 60 % | 0.53 | -1019.16 |
| Signals | tp 3.000% | sl 2.00× | tr 0.40× | 118 | 35 (30 %) | 1473 | 54 % | 0.54 | -1024.18 |
| Signals | tp 4.000% | sl 2.00× | tr 0.40× | 115 | 32 (28 %) | 1048 | 59 % | 0.48 | -1184.93 |
| Signals | tp 3.000% | sl 1.50× | tr off | 119 | 27 (23 %) | 1130 | 48 % | 0.55 | -1225.09 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 72 (72) | 54988 | 25256 | 25256 | 0 | baseTarget 29732 |
| Micro | trailing | 72 (72) | 109976 | 50512 | 50512 | 0 | baseTarget 59464 |
| Short | normal | 251 (217) | 35820 | 13152 | 13152 | 0 | baseRange 12708 · baseTarget 9960 |
| Short | trailing | 251 (217) | 71640 | 26304 | 26304 | 0 | baseRange 25416 · baseTarget 19920 |
| General | normal | 251 (199) | 23880 | 7848 | 7848 | 0 | baseRange 11544 · baseTarget 4488 |
| General | trailing | 251 (199) | 15920 | 5232 | 5232 | 0 | baseRange 7696 · baseTarget 2992 |
| Long | normal | 251 (213) | 29850 | 11178 | 11178 | 0 | baseTarget 5922 · baseRange 12750 |
| Long | trailing | 251 (213) | 19900 | 7452 | 7452 | 0 | baseTarget 3948 · baseRange 8500 |
| Wide | axis | 323 (323) | 55260 | 55260 | 55260 | 0 | – |
| Wide | dca | 323 (323) | 4912 | 4912 | 4912 | 0 | – |
| Wide | dca-active | 323 (323) | 4912 | 4912 | 4912 | 0 | – |

Engine indications Base evaluated that built no set: 68 (bb-bounce, bb-walk, break-atr, break-atr-0.9, cci-14-100, cci-14-200, cci-20-100, cci-20-200, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-ivwapd-2, mc-lag-3, mc-mturn-10, mc-mturn-5, mc-qrsi2-5, mc-rsi4-5, mc-rsi9-15, mc-rsimid-14, mc-rsit14-30, mc-rsit2-30, mc-rsit3-15, mc-rsit3-20, mc-rsit3-25, mc-rsit3-30, mc-rsit3-5, mc-rsit4-10, mc-rsit4-20, mc-rsit4-25, mc-rsit4-30, mc-rsit4-5, mc-rsit5-20, mc-rsit5-25, mc-rsit5-30, mc-rsit7-15, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.23 (300) | 0.27 (444) | 0.38 (450) | 0.31 (426) | 0.40 (600) |
| 1.14× | – | 0.10 (150) | – | – | – | – | – |
| 1.25× | – | 0.09 (150) | 0.20 (300) | 0.27 (408) | 0.38 (450) | 0.53 (410) | 0.51 (594) |
| 1.33× | 0.06 (96) | – | – | – | – | – | – |
| 1.5× | 0.05 (96) | 0.10 (150) | 0.24 (282) | 0.28 (408) | 0.44 (440) | 0.46 (410) | 0.54 (594) |
| 1.75× | 0.06 (96) | 0.10 (150) | 0.36 (282) | 0.42 (408) | 0.42 (440) | 0.44 (410) | 0.51 (588) |
| 2× | 0.06 (96) | 0.21 (150) | 0.32 (282) | 0.40 (408) | 0.38 (440) | 0.42 (398) | 0.48 (576) |
| 2.25× | 0.05 (96) | 0.19 (150) | 0.32 (282) | 0.37 (408) | 0.38 (424) | 0.41 (398) | 0.44 (576) |
| 2.5× | 0.11 (96) | 0.18 (150) | 0.30 (282) | 0.35 (402) | 0.37 (424) | 0.38 (398) | 0.45 (570) |
| 2.75× | 0.10 (96) | 0.16 (150) | 0.29 (276) | 0.32 (402) | 0.34 (424) | 0.36 (392) | 0.54 (570) |
| 3× | 0.09 (96) | 0.17 (144) | 0.27 (276) | 0.30 (402) | 0.36 (412) | 0.41 (392) | 0.50 (570) |
| 3.25× | 0.09 (96) | 0.16 (144) | 0.25 (276) | 0.29 (396) | 0.41 (412) | 0.38 (392) | 0.52 (570) |
| 3.5× | 0.09 (90) | 0.15 (144) | 0.24 (276) | 0.29 (396) | 0.39 (412) | 0.39 (392) | 0.58 (570) |
| 3.75× | 0.09 (90) | 0.14 (144) | 0.25 (276) | 0.27 (396) | 0.40 (412) | 0.39 (392) | 0.55 (570) |
| 4× | 0.08 (90) | 0.13 (144) | 0.24 (276) | 0.26 (396) | 0.44 (412) | 0.40 (392) | 0.61 (564) |
| 4.25× | 0.08 (90) | 0.12 (144) | 0.22 (276) | 0.33 (396) | 0.56 (412) | 0.38 (392) | 0.57 (564) |
| 4.5× | 0.07 (90) | 0.14 (144) | 0.21 (276) | 0.37 (396) | 0.53 (412) | 0.40 (392) | 0.65 (564) |
| 4.75× | 0.07 (90) | 0.13 (144) | 0.28 (276) | 0.43 (396) | 0.51 (412) | 0.38 (392) | 0.62 (564) |
| 5× | 0.07 (90) | 0.13 (144) | 0.27 (276) | 0.41 (396) | 0.49 (412) | 0.44 (392) | 0.69 (552) |

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
| 1× | 0.51 (4006) | 0.47 (5070) | 0.58 (5122) | 0.61 (4682) | 0.62 (5450) | 0.58 (6616) |
| 1.5× | 0.65 (3680) | 0.58 (4580) | 0.65 (4552) | 0.72 (4008) | 0.66 (4688) | 0.72 (5507) |
| 2× | 0.69 (3394) | 0.62 (4102) | 0.73 (4142) | 0.82 (3702) | 0.78 (4352) | 0.74 (5096) |

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
| 0.5× | 0.69 (1418) | 0.60 (986) | 0.66 (1348) | 0.86 (1350) |
| 0.75× | 0.72 (1240) | 0.70 (826) | 0.73 (1104) | 0.90 (1100) |
| 1× | 0.72 (3460) | 0.66 (2176) | 0.65 (2889) | 0.82 (2989) |

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
| 0.5× | 0.93 (1349) | 0.92 (1244) | 0.91 (1265) | 0.89 (1020) | 1.00 (1237) |
| 0.75× | 0.98 (1063) | 0.92 (986) | 1.05 (990) | 0.93 (799) | 1.05 (953) |
| 1× | 0.87 (2855) | 0.81 (2566) | 0.82 (2515) | 0.85 (1884) | 0.87 (2394) |

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
| 0.84× | 0.54 (13368) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.42 (504) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.60 (15455) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.47 (483) | 0.55 (584) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.38 (467) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.66 (542) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.74 (533) | – | – | – | – |
| 1× | – | – | – | 0.63 (99453) | – | – | – | 0.72 (30649) | 0.52 (3477) | – | 0.69 (1243) | – | 0.63 (3063) | 0.66 (2719) | 0.91 (1015) | 1.43 (901) |

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
