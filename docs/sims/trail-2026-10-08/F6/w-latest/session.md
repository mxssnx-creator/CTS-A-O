# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1354/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 351/19072 · PF 1.54 · Micro 233/5900 · PF 2.26 · Short 642/8176 · PF 1.47 · General 514/8176 · PF 1.50 · Long 570/8176 · PF 1.51 · Signals 126/126; Main 1228 pairs, 215798 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 211 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1228 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (215798 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3412); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 27834 · 0.75 | 6894 · 0.80 | 9857 · 1.06 | 1439 · 0.69 | – | – | – | – | – |
| 13:00 | 48041 · 0.41 | 8282 · 0.68 | 16700 · 0.64 | 1763 · 2.64 | – | – | – | – | – |
| 14:00 | 29767 · 2.06 | 7111 · 2.13 | 10449 · 2.42 | 2783 · 5.89 | – | – | – | – | – |
| 15:00 | 37426 · 1.46 | 9237 · 1.13 | 13605 · 1.80 | 3733 · 0.81 | – | – | – | – | – |
| 16:00 | 28293 · 1.15 | 4531 · 1.07 | 10524 · 1.59 | 1444 · 1.42 | – | – | – | – | – |
| 17:00 | 18733 · 1.75 | 3672 · 1.16 | 7222 · 1.63 | 1742 · 1.90 | – | – | – | – | – |
| 18:00 | 18887 · 1.87 | 2959 · 2.86 | 5649 · 1.81 | 1236 · 1.49 | – | – | – | – | – |
| 19:00 | 22022 · 1.01 | 5572 · 1.61 | 7241 · 1.04 | 1259 · 1.47 | – | – | – | – | – |
| 20:00 | 41586 · 0.61 | 12349 · 0.90 | 9967 · 0.55 | 2427 · 1.45 | – | – | – | – | – |
| 21:00 | 48972 · 0.69 | 13164 · 0.96 | 15967 · 0.76 | 2534 · 0.99 | – | – | – | – | – |
| 22:00 | 48217 · 0.41 | 12131 · 0.43 | 18173 · 0.43 | 3516 · 0.20 | – | – | – | – | – |
| 23:00 | 31120 · 0.43 | 5791 · 0.46 | 9395 · 0.31 | 1845 · 0.15 | – | – | – | – | – |
| **total** | **400898 · 0.80** | **91693 · 0.90** | **134749 · 0.83** | **25721 · 0.74** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 50971 | sig:confirm 50971 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 212018 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2183 units active at the run start, 3023 over the run, 3412 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1671 | 519 (31 %) | 10513 | 57 % | 0.63 | -11413.72 |
| Signals | trailing | 1741 | 965 (55 %) | 15208 | 68 % | 0.93 | -1305.15 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 47 (80 %) | 398 | 75 % | 2.00 | 369.62 |
| Signals | signal:act-hf | 60 | 13 (22 %) | 560 | 60 % | 0.55 | -553.11 |
| Signals | signal:adx | 60 | 21 (35 %) | 401 | 61 % | 0.65 | -373.81 |
| Signals | signal:atr-break | 59 | 35 (59 %) | 423 | 61 % | 0.98 | -12.10 |
| Signals | signal:bollinger | 60 | 1 (2 %) | 401 | 56 % | 0.50 | -649.99 |
| Signals | signal:cci | 60 | 26 (43 %) | 617 | 69 % | 0.88 | -137.37 |
| Signals | signal:cmf | 57 | 6 (11 %) | 455 | 54 % | 0.30 | -931.68 |
| Signals | signal:donchian | 47 | 11 (23 %) | 268 | 62 % | 0.77 | -108.28 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 209 | 89 % | 8.31 | 444.46 |
| Signals | signal:ema-cross-fast | 60 | 53 (88 %) | 524 | 82 % | 2.53 | 613.71 |
| Signals | signal:ema-pullback | 60 | 14 (23 %) | 557 | 63 % | 0.51 | -544.02 |
| Signals | signal:ema-slope | 60 | 36 (60 %) | 331 | 74 % | 1.41 | 188.92 |
| Signals | signal:ema-trend | 60 | 17 (28 %) | 634 | 65 % | 0.62 | -523.85 |
| Signals | signal:heikin-ashi | 59 | 8 (14 %) | 794 | 60 % | 0.45 | -979.18 |
| Signals | signal:hma | 58 | 16 (28 %) | 490 | 54 % | 0.58 | -443.25 |
| Signals | signal:ichimoku | 43 | 11 (26 %) | 221 | 58 % | 0.60 | -180.32 |
| Signals | signal:impulse | 59 | 11 (19 %) | 556 | 51 % | 0.38 | -879.12 |
| Signals | signal:kama | 60 | 18 (30 %) | 893 | 64 % | 0.81 | -273.02 |
| Signals | signal:keltner | 60 | 39 (65 %) | 230 | 69 % | 1.75 | 211.80 |
| Signals | signal:macd-cross | 58 | 10 (17 %) | 501 | 57 % | 0.54 | -533.22 |
| Signals | signal:macd-hist | 59 | 27 (46 %) | 835 | 67 % | 0.89 | -140.51 |
| Signals | signal:macd-slow | 60 | 23 (38 %) | 492 | 64 % | 0.77 | -215.37 |
| Signals | signal:mfi | 22 | 22 (100 %) | 41 | 93 % | 14.65 | 56.47 |
| Signals | signal:obv | 60 | 45 (75 %) | 672 | 73 % | 1.76 | 540.45 |
| Signals | signal:r-awesome | 60 | 13 (22 %) | 465 | 55 % | 0.43 | -735.01 |
| Signals | signal:r-connors | 48 | 22 (46 %) | 205 | 66 % | 0.43 | -353.40 |
| Signals | signal:r-fractal | 46 | 22 (48 %) | 136 | 47 % | 0.25 | -247.21 |
| Signals | signal:r-inside | 13 | 1 (8 %) | 16 | 25 % | 0.01 | -100.14 |
| Signals | signal:r-linreg | 60 | 18 (30 %) | 563 | 64 % | 0.62 | -387.49 |
| Signals | signal:r-nr-break | 60 | 23 (38 %) | 390 | 60 % | 0.67 | -249.05 |
| Signals | signal:r-session-trend | 60 | 14 (23 %) | 529 | 58 % | 0.53 | -610.07 |
| Signals | signal:r-vol-regime | 35 | 23 (66 %) | 78 | 55 % | 1.71 | 48.24 |
| Signals | signal:reclaim | 60 | 25 (42 %) | 812 | 69 % | 0.94 | -80.62 |
| Signals | signal:rsi-mid | 60 | 17 (28 %) | 504 | 52 % | 0.45 | -594.08 |
| Signals | signal:rsi-momentum | 26 | 24 (92 %) | 26 | 92 % | 3.71 | 45.83 |
| Signals | signal:rsi-reversal | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -16.64 |
| Signals | signal:s2-active-hf | 60 | 22 (37 %) | 672 | 60 % | 0.77 | -273.92 |
| Signals | signal:s2-adx-gate | 60 | 25 (42 %) | 508 | 69 % | 0.94 | -52.68 |
| Signals | signal:s2-atr-break | 60 | 12 (20 %) | 501 | 56 % | 0.55 | -471.94 |
| Signals | signal:s2-bb-bounce | 60 | 33 (55 %) | 283 | 61 % | 0.94 | -35.16 |
| Signals | signal:s2-block-scale | 60 | 10 (17 %) | 664 | 64 % | 0.49 | -812.41 |
| Signals | signal:s2-block-stack | 57 | 6 (11 %) | 344 | 50 % | 0.37 | -642.79 |
| Signals | signal:s2-confluence | 60 | 36 (60 %) | 823 | 69 % | 1.21 | 216.47 |
| Signals | signal:s2-ema-cross | 30 | 22 (73 %) | 33 | 76 % | 7.54 | 93.04 |
| Signals | signal:s2-range-break | 51 | 31 (61 %) | 72 | 68 % | 1.88 | 77.20 |
| Signals | signal:s2-range-shift | 59 | 16 (27 %) | 297 | 55 % | 0.51 | -394.44 |
| Signals | signal:s2-rsi-revert | 56 | 42 (75 %) | 102 | 65 % | 1.14 | 19.22 |
| Signals | signal:s2-st-trail | 58 | 48 (83 %) | 124 | 81 % | 2.36 | 132.05 |
| Signals | signal:s2-stoch-swing | 60 | 46 (77 %) | 703 | 78 % | 2.15 | 742.13 |
| Signals | signal:s2-vol-break | 56 | 35 (63 %) | 141 | 77 % | 1.01 | 3.04 |
| Signals | signal:s2-vwap-axis | 27 | 25 (93 %) | 27 | 93 % | 430.73 | 78.17 |
| Signals | signal:sar | 60 | 13 (22 %) | 682 | 63 % | 0.72 | -372.16 |
| Signals | signal:squeeze | 51 | 24 (47 %) | 52 | 46 % | 0.09 | -197.01 |
| Signals | signal:st-slow | 58 | 40 (69 %) | 131 | 72 % | 1.46 | 73.62 |
| Signals | signal:stoch-rsi | 60 | 19 (32 %) | 873 | 62 % | 0.68 | -454.07 |
| Signals | signal:supertrend | 60 | 44 (73 %) | 302 | 69 % | 1.27 | 107.28 |
| Signals | signal:swing | 58 | 7 (12 %) | 701 | 59 % | 0.45 | -877.04 |
| Signals | signal:thrust | 60 | 8 (13 %) | 623 | 54 % | 0.37 | -970.49 |
| Signals | signal:trix | 60 | 25 (42 %) | 266 | 68 % | 1.06 | 32.84 |
| Signals | signal:volume-break | 56 | 48 (86 %) | 61 | 85 % | 9.69 | 152.72 |
| Signals | signal:vwap | 60 | 38 (63 %) | 547 | 69 % | 1.30 | 199.86 |
| Signals | signal:williams-r | 60 | 17 (28 %) | 640 | 60 % | 0.72 | -364.17 |
| Signals | signal:zscore | 60 | 23 (38 %) | 315 | 59 % | 0.55 | -395.86 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 75768 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75768 | 0 |  |
| Short | 39456 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39456 | 0 |  |
| General | 13080 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13080 | 0 |  |
| Long | 18630 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18630 | 0 |  |
| Wide | 65084 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 65084 | 0 |  |
| Signals | 3780 | – | 2183 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2183 units (pair × symbol × direction) active at the run start, 3023 over the run; 3412 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1362 (72 %) | 35617 | 72 % | 1.71 | 20819.44 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 47 (80 %) | 398 | 75 % | 2.00 | 369.62 |
| Signals | signal:act-hf | 60 | 13 (22 %) | 560 | 60 % | 0.55 | -553.11 |
| Signals | signal:adx | 60 | 21 (35 %) | 401 | 61 % | 0.65 | -373.81 |
| Signals | signal:atr-break | 59 | 35 (59 %) | 423 | 61 % | 0.98 | -12.10 |
| Signals | signal:bollinger | 60 | 1 (2 %) | 401 | 56 % | 0.50 | -649.99 |
| Signals | signal:cci | 60 | 26 (43 %) | 617 | 69 % | 0.88 | -137.37 |
| Signals | signal:cmf | 57 | 6 (11 %) | 455 | 54 % | 0.30 | -931.68 |
| Signals | signal:donchian | 47 | 11 (23 %) | 268 | 62 % | 0.77 | -108.28 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 209 | 89 % | 8.31 | 444.46 |
| Signals | signal:ema-cross-fast | 60 | 53 (88 %) | 524 | 82 % | 2.53 | 613.71 |
| Signals | signal:ema-pullback | 60 | 14 (23 %) | 557 | 63 % | 0.51 | -544.02 |
| Signals | signal:ema-slope | 60 | 36 (60 %) | 331 | 74 % | 1.41 | 188.92 |
| Signals | signal:ema-trend | 60 | 17 (28 %) | 634 | 65 % | 0.62 | -523.85 |
| Signals | signal:heikin-ashi | 59 | 8 (14 %) | 794 | 60 % | 0.45 | -979.18 |
| Signals | signal:hma | 58 | 16 (28 %) | 490 | 54 % | 0.58 | -443.25 |
| Signals | signal:ichimoku | 43 | 11 (26 %) | 221 | 58 % | 0.60 | -180.32 |
| Signals | signal:impulse | 59 | 11 (19 %) | 556 | 51 % | 0.38 | -879.12 |
| Signals | signal:kama | 60 | 18 (30 %) | 893 | 64 % | 0.81 | -273.02 |
| Signals | signal:keltner | 60 | 39 (65 %) | 230 | 69 % | 1.75 | 211.80 |
| Signals | signal:macd-cross | 58 | 10 (17 %) | 501 | 57 % | 0.54 | -533.22 |
| Signals | signal:macd-hist | 59 | 27 (46 %) | 835 | 67 % | 0.89 | -140.51 |
| Signals | signal:macd-slow | 60 | 23 (38 %) | 492 | 64 % | 0.77 | -215.37 |
| Signals | signal:mfi | 22 | 22 (100 %) | 41 | 93 % | 14.65 | 56.47 |
| Signals | signal:obv | 60 | 45 (75 %) | 672 | 73 % | 1.76 | 540.45 |
| Signals | signal:r-awesome | 60 | 13 (22 %) | 465 | 55 % | 0.43 | -735.01 |
| Signals | signal:r-connors | 48 | 22 (46 %) | 205 | 66 % | 0.43 | -353.40 |
| Signals | signal:r-fractal | 46 | 22 (48 %) | 136 | 47 % | 0.25 | -247.21 |
| Signals | signal:r-inside | 13 | 1 (8 %) | 16 | 25 % | 0.01 | -100.14 |
| Signals | signal:r-linreg | 60 | 18 (30 %) | 563 | 64 % | 0.62 | -387.49 |
| Signals | signal:r-nr-break | 60 | 23 (38 %) | 390 | 60 % | 0.67 | -249.05 |
| Signals | signal:r-session-trend | 60 | 14 (23 %) | 529 | 58 % | 0.53 | -610.07 |
| Signals | signal:r-vol-regime | 35 | 23 (66 %) | 78 | 55 % | 1.71 | 48.24 |
| Signals | signal:reclaim | 60 | 25 (42 %) | 812 | 69 % | 0.94 | -80.62 |
| Signals | signal:rsi-mid | 60 | 17 (28 %) | 504 | 52 % | 0.45 | -594.08 |
| Signals | signal:rsi-momentum | 26 | 24 (92 %) | 26 | 92 % | 3.71 | 45.83 |
| Signals | signal:rsi-reversal | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -16.64 |
| Signals | signal:s2-active-hf | 60 | 22 (37 %) | 672 | 60 % | 0.77 | -273.92 |
| Signals | signal:s2-adx-gate | 60 | 25 (42 %) | 508 | 69 % | 0.94 | -52.68 |
| Signals | signal:s2-atr-break | 60 | 12 (20 %) | 501 | 56 % | 0.55 | -471.94 |
| Signals | signal:s2-bb-bounce | 60 | 33 (55 %) | 283 | 61 % | 0.94 | -35.16 |
| Signals | signal:s2-block-scale | 60 | 10 (17 %) | 664 | 64 % | 0.49 | -812.41 |
| Signals | signal:s2-block-stack | 57 | 6 (11 %) | 344 | 50 % | 0.37 | -642.79 |
| Signals | signal:s2-confluence | 60 | 36 (60 %) | 823 | 69 % | 1.21 | 216.47 |
| Signals | signal:s2-ema-cross | 30 | 22 (73 %) | 33 | 76 % | 7.54 | 93.04 |
| Signals | signal:s2-range-break | 51 | 31 (61 %) | 72 | 68 % | 1.88 | 77.20 |
| Signals | signal:s2-range-shift | 59 | 16 (27 %) | 297 | 55 % | 0.51 | -394.44 |
| Signals | signal:s2-rsi-revert | 56 | 42 (75 %) | 102 | 65 % | 1.14 | 19.22 |
| Signals | signal:s2-st-trail | 58 | 48 (83 %) | 124 | 81 % | 2.36 | 132.05 |
| Signals | signal:s2-stoch-swing | 60 | 46 (77 %) | 703 | 78 % | 2.15 | 742.13 |
| Signals | signal:s2-vol-break | 56 | 35 (63 %) | 141 | 77 % | 1.01 | 3.04 |
| Signals | signal:s2-vwap-axis | 27 | 25 (93 %) | 27 | 93 % | 430.73 | 78.17 |
| Signals | signal:sar | 60 | 13 (22 %) | 682 | 63 % | 0.72 | -372.16 |
| Signals | signal:squeeze | 51 | 24 (47 %) | 52 | 46 % | 0.09 | -197.01 |
| Signals | signal:st-slow | 58 | 40 (69 %) | 131 | 72 % | 1.46 | 73.62 |
| Signals | signal:stoch-rsi | 60 | 19 (32 %) | 873 | 62 % | 0.68 | -454.07 |
| Signals | signal:supertrend | 60 | 44 (73 %) | 302 | 69 % | 1.27 | 107.28 |
| Signals | signal:swing | 58 | 7 (12 %) | 701 | 59 % | 0.45 | -877.04 |
| Signals | signal:thrust | 60 | 8 (13 %) | 623 | 54 % | 0.37 | -970.49 |
| Signals | signal:trix | 60 | 25 (42 %) | 266 | 68 % | 1.06 | 32.84 |
| Signals | signal:volume-break | 56 | 48 (86 %) | 61 | 85 % | 9.69 | 152.72 |
| Signals | signal:vwap | 60 | 38 (63 %) | 547 | 69 % | 1.30 | 199.86 |
| Signals | signal:williams-r | 60 | 17 (28 %) | 640 | 60 % | 0.72 | -364.17 |
| Signals | signal:zscore | 60 | 23 (38 %) | 315 | 59 % | 0.55 | -395.86 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1230 | 518 (42 %) | 10600 | 66 % | 0.78 | -4382.39 |
| Signals | 1.25 | 825 | 355 (43 %) | 7481 | 66 % | 0.79 | -2722.54 |
| Signals | 1.35 | 627 | 274 (44 %) | 5758 | 66 % | 0.80 | -1955.39 |
| Signals | 1.5 | 422 | 191 (45 %) | 4007 | 67 % | 0.83 | -1081.69 |
| Signals | 1.75 | 223 | 114 (51 %) | 2181 | 69 % | 0.91 | -287.80 |
| Signals | 2 | 140 | 72 (51 %) | 1425 | 70 % | 0.95 | -93.84 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 319 | 85 % | 4.40 | 543.58 | tp8 sl24 tr2.4 h48 (8 · ∞ (no loss) · 29.50) |
| Signals | follow | sig-obv-m@m15 | 30 | 27 (90 %) | 279 | 77 % | 3.46 | 431.43 | tp8 sl24 tr1.6 h48 (12 · 456.27 · 30.83) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 151 | 95 % | 23.40 | 365.72 | tp8 sl24 tr1.6 h48 (6 · ∞ (no loss) · 15.98) |
| Signals | follow | sig-cci-m@m15 | 30 | 26 (87 %) | 172 | 83 % | 4.73 | 311.39 | tp5 sl15 tr1 h48 (9 · 251.35 · 16.87) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 25 (83 %) | 299 | 77 % | 2.22 | 311.33 | tp4 sl6 tr0 h48 (9 · 4.90 · 24.20) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 129 | 88 % | 9.01 | 274.85 | tp8 sl24 tr1.6 h48 (5 · ∞ (no loss) · 13.83) |
| Signals | follow | sig-trix-s@m15 | 30 | 25 (83 %) | 175 | 74 % | 3.29 | 272.86 | tp8 sl24 tr1.6 h48 (8 · 37.91 · 19.89) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 23 (77 %) | 388 | 73 % | 1.68 | 271.01 | tp5 sl15 tr1 h48 (18 · 54.15 · 30.09) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 23 (77 %) | 373 | 76 % | 1.65 | 247.99 | tp8 sl24 tr3.2 h48 (7 · ∞ (no loss) · 26.77) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 18 (60 %) | 384 | 72 % | 1.41 | 198.56 | tp6 sl18 tr1.8 h48 (9 · 2576.81 · 31.61) |
| Signals | follow | sig-keltner-s@m15 | 30 | 25 (83 %) | 154 | 68 % | 2.97 | 196.53 | tp8 sl24 tr2.4 h48 (5 · 83.53 · 17.64) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 30 (100 %) | 80 | 91 % | 7.40 | 169.62 | – |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 19 (63 %) | 230 | 72 % | 1.44 | 126.21 | tp8 sl24 tr1.6 h48 (9 · ∞ (no loss) · 17.10) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 58 | 98 % | 712.17 | 123.56 | – |
| Signals | follow | sig-vwap-m@m15 | 30 | 21 (70 %) | 153 | 77 % | 1.83 | 112.27 | tp3 sl9 tr0.9 h48 (8 · 95.45 · 12.33) |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 29 (97 %) | 62 | 92 % | 8.72 | 109.54 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 18 (60 %) | 393 | 69 % | 1.20 | 109.03 | tp6 sl18 tr1.8 h48 (14 · ∞ (no loss) · 32.17) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 24 (80 %) | 33 | 82 % | 208.99 | 106.93 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 22 | 19 (86 %) | 32 | 84 % | 49.61 | 98.96 | tp3 sl9 tr0.6 h48 (5 · 4.50 · 2.57) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 22 (73 %) | 33 | 76 % | 7.54 | 93.04 | – |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 20 (67 %) | 546 | 72 % | 1.13 | 90.07 | tp6 sl18 tr1.2 h48 (27 · 36.40 · 29.04) |
| Signals | follow | sig-vwap-s@m15 | 30 | 17 (57 %) | 394 | 66 % | 1.16 | 87.59 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 17 (57 %) | 525 | 71 % | 1.12 | 87.50 | tp8 sl24 tr1.6 h48 (19 · 18.40 · 23.78) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 27 | 25 (93 %) | 27 | 93 % | 430.73 | 78.17 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 19.78 | 74.18 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 21 (70 %) | 82 | 61 % | 1.62 | 73.31 | tp3 sl9 tr0.6 h48 (7 · 0.34 · -2.61) |
| Signals | follow | sig-hma-m@m15 | 30 | 14 (47 %) | 267 | 64 % | 1.18 | 70.24 | tp8 sl24 tr2.4 h48 (6 · 108.21 · 21.44) |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 17 (57 %) | 101 | 78 % | 1.35 | 62.71 | tp2.5 sl3.75 tr0 h48 (5 · 0.87 · -1.00) |
| Signals | follow | sig-r-vol-regime-s@m15 | 26 | 21 (81 %) | 65 | 60 % | 2.30 | 61.71 | tp4 sl12 tr0.8 h48 (5 · 4.57 · 3.39) |
| Signals | follow | sig-s2-vol-break-m@m15 | 26 | 24 (92 %) | 41 | 88 % | 4.52 | 60.95 | tp3 sl9 tr0.6 h48 (6 · 16.83 · 3.43) |
| Signals | follow | sig-adx-m@m15 | 30 | 14 (47 %) | 143 | 73 % | 1.28 | 59.69 | tp6 sl18 tr1.8 h48 (5 · ∞ (no loss) · 12.40) |
| Signals | follow | sig-act-burst-m@m15 | 29 | 22 (76 %) | 99 | 68 % | 1.52 | 58.29 | tp4 sl12 tr0.8 h48 (5 · 10.18 · 7.18) |
| Signals | follow | sig-mfi-m@m15 | 22 | 22 (100 %) | 41 | 93 % | 14.65 | 56.47 | – |
| Signals | follow | sig-st-slow-m@m15 | 30 | 21 (70 %) | 69 | 74 % | 1.65 | 51.11 | – |
| Signals | follow | sig-rsi-momentum-s@m15 | 26 | 24 (92 %) | 26 | 92 % | 3.71 | 45.83 | – |
| Signals | follow | sig-volume-break-s@m15 | 26 | 24 (92 %) | 28 | 89 % | 3.69 | 45.80 | – |
| Signals | follow | sig-r-connors-s@m15 | 20 | 20 (100 %) | 27 | 96 % | 382.59 | 44.89 | – |
| Signals | follow | sig-zscore-m@m15 | 30 | 23 (77 %) | 47 | 79 % | 1.80 | 36.84 | – |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 17 (57 %) | 175 | 68 % | 1.14 | 36.30 | tp8 sl24 tr2.4 h48 (5 · 11.72 · 12.83) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 15 (50 %) | 371 | 71 % | 1.05 | 26.13 | tp6 sl18 tr1.2 h48 (13 · 16.59 · 17.93) |
| Signals | follow | sig-st-slow-s@m15 | 28 | 19 (68 %) | 62 | 69 % | 1.27 | 22.51 | tp3 sl9 tr0.6 h48 (5 · 3.17 · 0.69) |
| Signals | follow | sig-s2-st-trail-s@m15 | 28 | 19 (68 %) | 62 | 69 % | 1.27 | 22.51 | tp3 sl9 tr0.6 h48 (5 · 3.17 · 0.69) |
| Signals | follow | sig-kama-m@m15 | 30 | 12 (40 %) | 417 | 68 % | 1.03 | 18.21 | tp8 sl24 tr3.2 h48 (6 · ∞ (no loss) · 26.97) |
| Signals | follow | sig-keltner-m@m15 | 30 | 14 (47 %) | 76 | 70 % | 1.08 | 15.28 | tp3 sl9 tr0.6 h48 (5 · 0.08 · -8.97) |
| Signals | follow | sig-atr-break-m@m15 | 29 | 21 (72 %) | 90 | 57 % | 1.08 | 8.66 | tp3 sl9 tr1.2 h48 (5 · 8.48 · 5.84) |
| Signals | follow | sig-r-vol-regime-m@m15 | 9 | 2 (22 %) | 13 | 31 % | 0.35 | -13.47 | – |
| Signals | follow | sig-ichimoku-m@m15 | 13 | 3 (23 %) | 21 | 33 % | 0.04 | -14.12 | – |
| Signals | follow | sig-supertrend-s@m15 | 30 | 14 (47 %) | 244 | 62 % | 0.96 | -16.28 | tp8 sl24 tr2.4 h48 (7 · 17.44 · 19.68) |
| Signals | follow | sig-rsi-reversal-s@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -16.64 | – |
| Signals | follow | sig-atr-break-s@m15 | 30 | 14 (47 %) | 333 | 62 % | 0.96 | -20.76 | tp6 sl18 tr2.4 h48 (5 · ∞ (no loss) · 21.04) |
| Signals | follow | sig-s2-range-break-m@m15 | 29 | 12 (41 %) | 40 | 55 % | 0.75 | -21.77 | – |
| Signals | follow | sig-squeeze-m@m15 | 23 | 17 (74 %) | 23 | 74 % | 0.39 | -28.69 | – |
| Signals | follow | sig-williams-r-s@m15 | 30 | 13 (43 %) | 261 | 60 % | 0.92 | -31.30 | tp6 sl18 tr1.8 h48 (7 · 63.29 · 21.91) |
| Signals | follow | sig-donchian-s@m15 | 30 | 9 (30 %) | 225 | 67 % | 0.89 | -40.14 | tp8 sl24 tr1.6 h48 (7 · 87.96 · 9.34) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 13 (43 %) | 435 | 65 % | 0.91 | -54.53 | tp8 sl24 tr3.2 h48 (6 · 708.36 · 22.33) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 26 | 13 (50 %) | 72 | 51 % | 0.60 | -54.96 | tp4 sl12 tr0.8 h48 (5 · 3.02 · 0.99) |
| Signals | follow | sig-s2-vol-break-s@m15 | 30 | 11 (37 %) | 100 | 72 % | 0.75 | -57.91 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-donchian-m@m15 | 17 | 2 (12 %) | 43 | 37 % | 0.31 | -68.14 | tp3 sl9 tr0.6 h48 (7 · 0.78 · -0.17) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 10 (33 %) | 137 | 66 % | 0.73 | -78.81 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 13 (43 %) | 311 | 63 % | 0.83 | -80.22 | tp4 sl12 tr1.2 h48 (14 · 12.31 · 10.68) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 12 (40 %) | 194 | 64 % | 0.76 | -82.78 | tp5 sl15 tr1 h48 (10 · ∞ (no loss) · 13.23) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 10 (33 %) | 279 | 70 % | 0.84 | -87.54 | tp6 sl18 tr1.2 h48 (10 · ∞ (no loss) · 15.71) |
| Signals | follow | sig-r-fractal-m@m15 | 19 | 10 (53 %) | 40 | 50 % | 0.09 | -88.98 | tp3 sl9 tr0.6 h48 (6 · 1.15 · 0.23) |
| Signals | follow | sig-r-inside-s@m15 | 13 | 1 (8 %) | 16 | 25 % | 0.01 | -100.14 | – |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 11 (37 %) | 411 | 67 % | 0.83 | -105.53 | tp6 sl18 tr1.2 h48 (21 · 44.57 · 24.98) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 12 (40 %) | 201 | 61 % | 0.76 | -108.46 | tp5 sl15 tr2 h48 (5 · ∞ (no loss) · 12.95) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 11 (37 %) | 210 | 63 % | 0.69 | -119.63 | tp6 sl18 tr1.8 h48 (6 · ∞ (no loss) · 11.01) |
| Signals | follow | sig-sar-s@m15 | 30 | 9 (30 %) | 349 | 67 % | 0.79 | -122.96 | tp6 sl18 tr1.2 h48 (15 · 41.15 · 16.76) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 11 (37 %) | 336 | 60 % | 0.78 | -135.28 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 11 (37 %) | 336 | 60 % | 0.77 | -138.63 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 7 (23 %) | 251 | 67 % | 0.67 | -146.22 | tp6 sl18 tr1.2 h48 (12 · 6.62 · 10.59) |
| Signals | follow | sig-r-fractal-s@m15 | 27 | 12 (44 %) | 96 | 46 % | 0.32 | -158.23 | tp4 sl12 tr0.8 h48 (5 · 23.90 · 4.58) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 10 (33 %) | 254 | 60 % | 0.61 | -164.26 | tp6 sl18 tr1.8 h48 (8 · 43.11 · 8.42) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 8 (27 %) | 200 | 61 % | 0.62 | -166.20 | tp8 sl24 tr1.6 h48 (6 · ∞ (no loss) · 10.40) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 11 (37 %) | 196 | 57 % | 0.60 | -166.26 | tp6 sl18 tr1.2 h48 (8 · 10.68 · 8.90) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 8 (27 %) | 287 | 67 % | 0.72 | -168.12 | tp8 sl24 tr2.4 h48 (6 · ∞ (no loss) · 12.32) |
| Signals | follow | sig-squeeze-s@m15 | 28 | 7 (25 %) | 29 | 24 % | 0.01 | -168.32 | – |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 10 (33 %) | 160 | 56 % | 0.51 | -189.22 | tp5 sl15 tr1 h48 (6 · ∞ (no loss) · 8.80) |
| Signals | follow | sig-swing-s@m15 | 28 | 7 (25 %) | 292 | 65 % | 0.64 | -189.83 | tp4 sl12 tr0.8 h48 (23 · 6.35 · 12.28) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 6 (20 %) | 219 | 56 % | 0.61 | -192.33 | tp6 sl18 tr1.8 h48 (5 · 36.19 · 8.51) |
| Signals | follow | sig-s2-range-shift-s@m15 | 29 | 10 (34 %) | 134 | 47 % | 0.38 | -195.45 | tp6 sl18 tr1.2 h48 (5 · 0.54 · -0.10) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 6 (20 %) | 163 | 62 % | 0.59 | -198.99 | tp8 sl24 tr1.6 h48 (5 · 36.06 · 7.40) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 1 (3 %) | 133 | 57 % | 0.53 | -217.29 | tp3 sl9 tr1.2 h48 (5 · 0.66 · -3.11) |
| Signals | follow | sig-macd-cross-s@m15 | 29 | 7 (24 %) | 289 | 58 % | 0.63 | -230.58 | tp4 sl8 tr0 h48 (9 · 1.62 · 10.20) |
| Signals | follow | sig-macd-hist-s@m15 | 29 | 7 (24 %) | 289 | 58 % | 0.63 | -230.58 | tp4 sl8 tr0 h48 (9 · 1.62 · 10.20) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 91 | 56 % | 0.42 | -240.02 | – |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 8 (27 %) | 284 | 61 % | 0.63 | -245.08 | tp8 sl24 tr1.6 h48 (9 · 73.18 · 20.48) |
| Signals | follow | sig-sar-m@m15 | 30 | 4 (13 %) | 333 | 58 % | 0.66 | -249.20 | tp8 sl24 tr2.4 h48 (5 · ∞ (no loss) · 13.31) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 6 (20 %) | 317 | 62 % | 0.63 | -251.67 | tp6 sl18 tr1.2 h48 (12 · 49.08 · 18.61) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 5 (17 %) | 230 | 56 % | 0.55 | -261.71 | tp3 sl6 tr0 h48 (7 · 1.13 · 1.60) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 7 (23 %) | 353 | 65 % | 0.59 | -267.85 | tp6 sl18 tr1.2 h48 (13 · 8.30 · 8.35) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 6 (20 %) | 282 | 57 % | 0.50 | -279.62 | tp8 sl24 tr1.6 h48 (6 · 17.84 · 6.00) |
| Signals | follow | sig-kama-s@m15 | 30 | 6 (20 %) | 476 | 61 % | 0.65 | -291.24 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 20.04) |
| Signals | follow | sig-thrust-m@m15 | 30 | 5 (17 %) | 385 | 62 % | 0.56 | -301.99 | tp8 sl24 tr1.6 h48 (10 · 15.12 · 5.75) |
| Signals | follow | sig-macd-cross-m@m15 | 29 | 3 (10 %) | 212 | 55 % | 0.42 | -302.64 | tp8 sl24 tr1.6 h48 (5 · 3.95 · 1.89) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 4 (13 %) | 379 | 61 % | 0.63 | -332.86 | tp6 sl18 tr1.8 h48 (9 · 1.38 · 6.93) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 8 (27 %) | 462 | 58 % | 0.56 | -348.55 | tp6 sl18 tr2.4 h48 (12 · 2.56 · 9.33) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 6 (20 %) | 245 | 55 % | 0.42 | -364.98 | tp8 sl24 tr1.6 h48 (7 · 88.17 · 11.13) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 5 (17 %) | 343 | 66 % | 0.50 | -374.71 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 12.56) |
| Signals | follow | sig-s2-block-stack-m@m15 | 27 | 1 (4 %) | 114 | 38 % | 0.14 | -381.08 | tp2.5 sl3.75 tr0 h48 (6 · 0.58 · -4.95) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 7 (23 %) | 306 | 59 % | 0.40 | -397.80 | tp6 sl18 tr1.8 h48 (9 · 192.43 · 8.87) |
| Signals | follow | sig-r-connors-m@m15 | 28 | 2 (7 %) | 178 | 61 % | 0.35 | -398.29 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 5 (17 %) | 476 | 67 % | 0.58 | -400.68 | tp8 sl24 tr1.6 h48 (7 · 21.34 · 4.98) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 7 (23 %) | 250 | 44 % | 0.34 | -429.82 | tp5 sl15 tr1 h48 (11 · 9.29 · 7.52) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 0 (0 %) | 268 | 55 % | 0.48 | -432.69 | tp4 sl12 tr0.8 h48 (14 · 0.92 · -1.06) |
| Signals | follow | sig-zscore-s@m15 | 30 | 0 (0 %) | 268 | 55 % | 0.48 | -432.69 | tp4 sl12 tr0.8 h48 (14 · 0.92 · -1.06) |
| Signals | follow | sig-adx-s@m15 | 30 | 7 (23 %) | 258 | 54 % | 0.49 | -433.50 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 24.87) |
| Signals | follow | sig-impulse-m@m15 | 30 | 8 (27 %) | 197 | 42 % | 0.31 | -436.29 | tp4 sl12 tr1.6 h48 (6 · 97.43 · 12.59) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 7 (23 %) | 355 | 61 % | 0.48 | -436.31 | tp8 sl24 tr1.6 h48 (13 · 23.72 · 16.93) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 5 (17 %) | 321 | 62 % | 0.47 | -437.70 | tp6 sl18 tr2.4 h48 (7 · 43.26 · 9.19) |
| Signals | follow | sig-impulse-s@m15 | 29 | 3 (10 %) | 359 | 55 % | 0.43 | -442.84 | tp8 sl24 tr2.4 h48 (6 · 8.69 · 10.74) |
| Signals | follow | sig-cci-s@m15 | 30 | 0 (0 %) | 445 | 64 % | 0.59 | -448.76 | tp6 sl18 tr1.8 h48 (11 · 0.95 · -1.33) |
| Signals | follow | sig-cmf-s@m15 | 27 | 3 (11 %) | 248 | 57 % | 0.35 | -464.56 | tp8 sl24 tr1.6 h48 (8 · 7.97 · 11.95) |
| Signals | follow | sig-cmf-m@m15 | 30 | 3 (10 %) | 207 | 50 % | 0.25 | -467.12 | tp3 sl9 tr0.9 h48 (14 · 0.69 · -3.02) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 0 (0 %) | 249 | 56 % | 0.37 | -472.89 | tp5 sl15 tr1 h48 (12 · 0.57 · -6.55) |
| Signals | follow | sig-hma-s@m15 | 28 | 2 (7 %) | 223 | 43 % | 0.24 | -513.49 | tp6 sl18 tr1.2 h48 (9 · 2.49 · 3.29) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 3 (10 %) | 305 | 54 % | 0.40 | -545.79 | tp8 sl24 tr1.6 h48 (7 · 4350.08 · 9.17) |
| Signals | follow | sig-heikin-ashi-m@m15 | 29 | 3 (10 %) | 318 | 50 % | 0.29 | -578.51 | tp8 sl24 tr1.6 h48 (5 · 6.50 · 1.56) |
| Signals | follow | sig-thrust-s@m15 | 30 | 3 (10 %) | 238 | 41 % | 0.20 | -668.50 | tp8 sl24 tr1.6 h48 (5 · 8.90 · 3.22) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 409 | 54 % | 0.36 | -687.21 | tp5 sl15 tr1.5 h48 (13 · 0.82 · -2.77) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.30× | 111 | 103 (93 %) | 471 | 89 % | 4.50 | 859.60 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 108 | 99 (92 %) | 344 | 95 % | 5.02 | 849.40 |
| Signals | tp 8.000% | sl 3.00× | tr 0.20× | 115 | 104 (90 %) | 721 | 81 % | 3.93 | 779.19 |
| Signals | tp 6.000% | sl 3.00× | tr off | 90 | 65 (72 %) | 192 | 84 % | 1.92 | 441.96 |
| Signals | tp 6.000% | sl 3.00× | tr 0.30× | 116 | 80 (69 %) | 711 | 81 % | 1.50 | 385.63 |
| Signals | tp 6.000% | sl 3.00× | tr 0.20× | 116 | 76 (66 %) | 1055 | 69 % | 1.49 | 380.34 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 115 | 74 (64 %) | 510 | 83 % | 1.22 | 190.29 |
| Signals | tp 5.000% | sl 3.00× | tr 0.20× | 119 | 63 (53 %) | 1292 | 68 % | 0.92 | -97.35 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 115 | 58 (50 %) | 676 | 74 % | 0.87 | -164.09 |
| Signals | tp 5.000% | sl 3.00× | tr 0.30× | 115 | 60 (52 %) | 831 | 74 % | 0.84 | -203.14 |
| Signals | tp 5.000% | sl 3.00× | tr off | 107 | 46 (43 %) | 340 | 70 % | 0.77 | -348.06 |
| Signals | tp 4.000% | sl 3.00× | tr 0.20× | 120 | 50 (42 %) | 1619 | 63 % | 0.74 | -394.90 |
| Signals | tp 4.000% | sl 3.00× | tr 0.30× | 117 | 49 (42 %) | 1141 | 64 % | 0.71 | -456.01 |
| Signals | tp 6.000% | sl 2.00× | tr off | 99 | 31 (31 %) | 282 | 58 % | 0.65 | -502.64 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 116 | 41 (35 %) | 894 | 69 % | 0.62 | -667.45 |
| Signals | tp 5.000% | sl 2.00× | tr off | 108 | 31 (29 %) | 441 | 56 % | 0.59 | -800.06 |
| Signals | tp 4.000% | sl 3.00× | tr off | 110 | 31 (28 %) | 497 | 65 % | 0.60 | -836.33 |
| Signals | tp 3.000% | sl 2.00× | tr off | 118 | 38 (32 %) | 925 | 59 % | 0.64 | -840.59 |
| Signals | tp 2.500% | sl 3.00× | tr off | 118 | 40 (34 %) | 959 | 68 % | 0.64 | -845.19 |
| Signals | tp 4.000% | sl 1.50× | tr off | 114 | 34 (30 %) | 776 | 51 % | 0.64 | -849.20 |
| Signals | tp 6.000% | sl 1.50× | tr off | 108 | 27 (25 %) | 379 | 46 % | 0.53 | -882.04 |
| Signals | tp 3.000% | sl 3.00× | tr 0.20× | 120 | 43 (36 %) | 2070 | 57 % | 0.53 | -886.28 |
| Signals | tp 3.000% | sl 3.00× | tr 0.30× | 120 | 31 (26 %) | 1594 | 60 % | 0.54 | -891.87 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 34 (29 %) | 719 | 66 % | 0.59 | -917.20 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 28 (24 %) | 1235 | 59 % | 0.64 | -940.39 |
| Signals | tp 2.500% | sl 1.50× | tr off | 120 | 26 (22 %) | 1399 | 52 % | 0.64 | -951.94 |
| Signals | tp 4.000% | sl 2.00× | tr off | 111 | 29 (26 %) | 637 | 56 % | 0.58 | -956.01 |
| Signals | tp 5.000% | sl 1.50× | tr off | 112 | 31 (28 %) | 563 | 48 % | 0.57 | -965.14 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 118 | 34 (29 %) | 1279 | 59 % | 0.53 | -988.52 |
| Signals | tp 3.000% | sl 1.50× | tr off | 120 | 28 (23 %) | 1169 | 49 % | 0.57 | -1220.89 |

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
