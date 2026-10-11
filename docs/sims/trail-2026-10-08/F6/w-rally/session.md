# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T03:00 UTC. Engine: Base 1122/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126; Main 996 pairs, 137378 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 182 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (137378 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3430); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 28667 · 0.98 | 5579 · 1.25 | 8866 · 1.26 | 991 · 3.40 | – | – | – | – | – |
| 16:00 | 35867 · 0.43 | 9257 · 0.69 | 13179 · 0.60 | 3010 · 1.80 | – | – | – | – | – |
| 17:00 | 25866 · 0.57 | 4438 · 0.46 | 12579 · 0.50 | 1931 · 5.56 | – | – | – | – | – |
| 18:00 | 26585 · 1.44 | 8244 · 1.67 | 11646 · 2.21 | 3929 · 4.19 | – | – | – | – | – |
| 19:00 | 21991 · 1.11 | 6071 · 1.61 | 5574 · 1.09 | 1732 · 2.61 | – | – | – | – | – |
| 20:00 | 32590 · 3.20 | 10841 · 4.88 | 10868 · 3.54 | 3266 · 2.84 | – | – | – | – | – |
| 21:00 | 22545 · 2.22 | 5295 · 1.58 | 9769 · 5.23 | 2271 · 4.75 | – | – | – | – | – |
| 22:00 | 17579 · 0.93 | 3881 · 1.19 | 4441 · 1.65 | 2102 · 4.63 | – | – | – | – | – |
| 23:00 | 18624 · 0.52 | 5374 · 0.74 | 5813 · 0.36 | 2322 · 3.87 | – | – | – | – | – |
| 00:00 | 29958 · 1.03 | 7873 · 1.05 | 11008 · 1.36 | 4709 · 0.64 | – | – | – | – | – |
| 01:00 | 37726 · 1.23 | 7871 · 1.61 | 13887 · 1.77 | 3660 · 1.47 | – | – | – | – | – |
| 02:00 | 38142 · 1.27 | 10987 · 1.71 | 12736 · 2.74 | 6855 · 3.93 | – | – | – | – | – |
| **total** | **336140 · 1.07** | **85711 · 1.41** | **120366 · 1.38** | **36778 · 2.20** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 58021 | sig:confirm 58021 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 133598 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2169 units active at the run start, 2936 over the run, 3430 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1694 | 1352 (80 %) | 14113 | 79 % | 1.98 | 18577.76 |
| Signals | trailing | 1736 | 1499 (86 %) | 22665 | 79 % | 2.53 | 19231.53 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 53 (88 %) | 714 | 78 % | 1.95 | 606.64 |
| Signals | signal:act-hf | 60 | 35 (58 %) | 1010 | 71 % | 1.22 | 278.27 |
| Signals | signal:adx | 60 | 45 (75 %) | 465 | 75 % | 1.44 | 319.83 |
| Signals | signal:atr-break | 60 | 56 (93 %) | 733 | 80 % | 2.64 | 870.36 |
| Signals | signal:bollinger | 60 | 44 (73 %) | 364 | 77 % | 1.74 | 324.52 |
| Signals | signal:cci | 60 | 48 (80 %) | 542 | 75 % | 2.07 | 509.96 |
| Signals | signal:cmf | 60 | 54 (90 %) | 1004 | 81 % | 1.74 | 788.67 |
| Signals | signal:donchian | 60 | 60 (100 %) | 581 | 87 % | 10.92 | 1041.09 |
| Signals | signal:ema-cross | 60 | 32 (53 %) | 307 | 74 % | 1.24 | 103.88 |
| Signals | signal:ema-cross-fast | 60 | 50 (83 %) | 597 | 81 % | 1.79 | 563.24 |
| Signals | signal:ema-pullback | 60 | 53 (88 %) | 656 | 84 % | 2.54 | 855.98 |
| Signals | signal:ema-slope | 54 | 39 (72 %) | 387 | 74 % | 1.27 | 140.76 |
| Signals | signal:ema-trend | 60 | 40 (67 %) | 552 | 74 % | 1.34 | 274.24 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1555 | 78 % | 2.10 | 1466.89 |
| Signals | signal:hma | 60 | 41 (68 %) | 665 | 81 % | 2.28 | 658.12 |
| Signals | signal:ichimoku | 60 | 55 (92 %) | 438 | 83 % | 2.20 | 441.20 |
| Signals | signal:impulse | 60 | 60 (100 %) | 952 | 80 % | 5.37 | 1452.59 |
| Signals | signal:kama | 60 | 56 (93 %) | 1133 | 80 % | 1.92 | 1063.81 |
| Signals | signal:keltner | 60 | 59 (98 %) | 516 | 90 % | 13.41 | 1054.97 |
| Signals | signal:macd-cross | 60 | 60 (100 %) | 927 | 81 % | 3.03 | 1188.30 |
| Signals | signal:macd-hist | 60 | 60 (100 %) | 1272 | 81 % | 2.31 | 1289.81 |
| Signals | signal:macd-slow | 60 | 42 (70 %) | 872 | 84 % | 2.11 | 827.87 |
| Signals | signal:mfi | 21 | 18 (86 %) | 59 | 73 % | 3.73 | 40.10 |
| Signals | signal:obv | 60 | 44 (73 %) | 541 | 76 % | 1.79 | 457.45 |
| Signals | signal:r-awesome | 57 | 48 (84 %) | 760 | 77 % | 1.67 | 480.70 |
| Signals | signal:r-connors | 60 | 29 (48 %) | 286 | 67 % | 0.88 | -60.08 |
| Signals | signal:r-fractal | 60 | 56 (93 %) | 497 | 81 % | 4.11 | 643.88 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 82 | 94 % | 273.13 | 160.01 |
| Signals | signal:r-linreg | 60 | 32 (53 %) | 619 | 76 % | 1.04 | 48.37 |
| Signals | signal:r-nr-break | 60 | 43 (72 %) | 960 | 77 % | 1.47 | 509.98 |
| Signals | signal:r-session-trend | 60 | 42 (70 %) | 312 | 82 % | 2.57 | 365.09 |
| Signals | signal:r-vol-regime | 60 | 60 (100 %) | 429 | 82 % | 5.27 | 643.22 |
| Signals | signal:reclaim | 60 | 47 (78 %) | 613 | 77 % | 1.44 | 365.65 |
| Signals | signal:rsi-mid | 60 | 59 (98 %) | 929 | 85 % | 2.98 | 1318.47 |
| Signals | signal:rsi-momentum | 30 | 21 (70 %) | 125 | 73 % | 2.04 | 116.25 |
| Signals | signal:rsi-reversal | 54 | 52 (96 %) | 100 | 94 % | 16.54 | 277.86 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 1337 | 79 % | 2.32 | 1393.56 |
| Signals | signal:s2-adx-gate | 60 | 50 (83 %) | 577 | 84 % | 4.05 | 940.19 |
| Signals | signal:s2-atr-break | 60 | 56 (93 %) | 1166 | 78 % | 2.06 | 991.82 |
| Signals | signal:s2-bb-bounce | 56 | 43 (77 %) | 187 | 88 % | 3.56 | 287.71 |
| Signals | signal:s2-block-scale | 60 | 44 (73 %) | 1208 | 74 % | 1.26 | 421.75 |
| Signals | signal:s2-block-stack | 60 | 52 (87 %) | 483 | 81 % | 3.49 | 843.53 |
| Signals | signal:s2-confluence | 60 | 52 (87 %) | 529 | 86 % | 4.36 | 846.19 |
| Signals | signal:s2-ema-cross | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 7.89 |
| Signals | signal:s2-range-break | 60 | 45 (75 %) | 290 | 68 % | 2.59 | 313.47 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 716 | 85 % | 6.38 | 1280.01 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 129 | 71 % | 1.60 | 98.24 |
| Signals | signal:s2-st-trail | 37 | 37 (100 %) | 151 | 87 % | 158.67 | 375.50 |
| Signals | signal:s2-stoch-swing | 60 | 58 (97 %) | 414 | 83 % | 4.90 | 734.53 |
| Signals | signal:s2-vol-break | 58 | 37 (64 %) | 112 | 56 % | 1.46 | 48.29 |
| Signals | signal:sar | 60 | 55 (92 %) | 1114 | 78 % | 1.89 | 945.72 |
| Signals | signal:squeeze | 6 | 3 (50 %) | 7 | 43 % | 0.05 | -8.30 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 157 | 90 % | 222.24 | 404.22 |
| Signals | signal:stoch-rsi | 60 | 56 (93 %) | 1011 | 77 % | 2.00 | 817.59 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 381 | 81 % | 5.65 | 603.55 |
| Signals | signal:swing | 60 | 60 (100 %) | 1098 | 81 % | 4.04 | 1636.99 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1207 | 86 % | 3.71 | 1914.57 |
| Signals | signal:trix | 60 | 27 (45 %) | 354 | 71 % | 0.97 | -15.93 |
| Signals | signal:volume-break | 58 | 42 (72 %) | 82 | 61 % | 10.40 | 137.53 |
| Signals | signal:vwap | 60 | 41 (68 %) | 416 | 75 % | 1.30 | 180.90 |
| Signals | signal:williams-r | 60 | 55 (92 %) | 753 | 76 % | 2.52 | 874.01 |
| Signals | signal:zscore | 56 | 44 (79 %) | 331 | 76 % | 1.70 | 247.84 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 17724 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17724 | 0 |  |
| Short | 30186 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30186 | 0 |  |
| General | 12470 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12470 | 0 |  |
| Long | 20430 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20430 | 0 |  |
| Wide | 52788 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52788 | 0 |  |
| Signals | 3780 | – | 2169 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2169 units (pair × symbol × direction) active at the run start, 2936 over the run; 3430 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1666 (88 %) | 40044 | 77 % | 2.22 | 28913.02 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 60 | 53 (88 %) | 714 | 78 % | 1.95 | 606.64 |
| Signals | signal:act-hf | 60 | 35 (58 %) | 1010 | 71 % | 1.22 | 278.27 |
| Signals | signal:adx | 60 | 45 (75 %) | 465 | 75 % | 1.44 | 319.83 |
| Signals | signal:atr-break | 60 | 56 (93 %) | 733 | 80 % | 2.64 | 870.36 |
| Signals | signal:bollinger | 60 | 44 (73 %) | 364 | 77 % | 1.74 | 324.52 |
| Signals | signal:cci | 60 | 48 (80 %) | 542 | 75 % | 2.07 | 509.96 |
| Signals | signal:cmf | 60 | 54 (90 %) | 1004 | 81 % | 1.74 | 788.67 |
| Signals | signal:donchian | 60 | 60 (100 %) | 581 | 87 % | 10.92 | 1041.09 |
| Signals | signal:ema-cross | 60 | 32 (53 %) | 307 | 74 % | 1.24 | 103.88 |
| Signals | signal:ema-cross-fast | 60 | 50 (83 %) | 597 | 81 % | 1.79 | 563.24 |
| Signals | signal:ema-pullback | 60 | 53 (88 %) | 656 | 84 % | 2.54 | 855.98 |
| Signals | signal:ema-slope | 54 | 39 (72 %) | 387 | 74 % | 1.27 | 140.76 |
| Signals | signal:ema-trend | 60 | 40 (67 %) | 552 | 74 % | 1.34 | 274.24 |
| Signals | signal:heikin-ashi | 60 | 60 (100 %) | 1555 | 78 % | 2.10 | 1466.89 |
| Signals | signal:hma | 60 | 41 (68 %) | 665 | 81 % | 2.28 | 658.12 |
| Signals | signal:ichimoku | 60 | 55 (92 %) | 438 | 83 % | 2.20 | 441.20 |
| Signals | signal:impulse | 60 | 60 (100 %) | 952 | 80 % | 5.37 | 1452.59 |
| Signals | signal:kama | 60 | 56 (93 %) | 1133 | 80 % | 1.92 | 1063.81 |
| Signals | signal:keltner | 60 | 59 (98 %) | 516 | 90 % | 13.41 | 1054.97 |
| Signals | signal:macd-cross | 60 | 60 (100 %) | 927 | 81 % | 3.03 | 1188.30 |
| Signals | signal:macd-hist | 60 | 60 (100 %) | 1272 | 81 % | 2.31 | 1289.81 |
| Signals | signal:macd-slow | 60 | 42 (70 %) | 872 | 84 % | 2.11 | 827.87 |
| Signals | signal:mfi | 21 | 18 (86 %) | 59 | 73 % | 3.73 | 40.10 |
| Signals | signal:obv | 60 | 44 (73 %) | 541 | 76 % | 1.79 | 457.45 |
| Signals | signal:r-awesome | 57 | 48 (84 %) | 760 | 77 % | 1.67 | 480.70 |
| Signals | signal:r-connors | 60 | 29 (48 %) | 286 | 67 % | 0.88 | -60.08 |
| Signals | signal:r-fractal | 60 | 56 (93 %) | 497 | 81 % | 4.11 | 643.88 |
| Signals | signal:r-inside | 30 | 30 (100 %) | 82 | 94 % | 273.13 | 160.01 |
| Signals | signal:r-linreg | 60 | 32 (53 %) | 619 | 76 % | 1.04 | 48.37 |
| Signals | signal:r-nr-break | 60 | 43 (72 %) | 960 | 77 % | 1.47 | 509.98 |
| Signals | signal:r-session-trend | 60 | 42 (70 %) | 312 | 82 % | 2.57 | 365.09 |
| Signals | signal:r-vol-regime | 60 | 60 (100 %) | 429 | 82 % | 5.27 | 643.22 |
| Signals | signal:reclaim | 60 | 47 (78 %) | 613 | 77 % | 1.44 | 365.65 |
| Signals | signal:rsi-mid | 60 | 59 (98 %) | 929 | 85 % | 2.98 | 1318.47 |
| Signals | signal:rsi-momentum | 30 | 21 (70 %) | 125 | 73 % | 2.04 | 116.25 |
| Signals | signal:rsi-reversal | 54 | 52 (96 %) | 100 | 94 % | 16.54 | 277.86 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 1337 | 79 % | 2.32 | 1393.56 |
| Signals | signal:s2-adx-gate | 60 | 50 (83 %) | 577 | 84 % | 4.05 | 940.19 |
| Signals | signal:s2-atr-break | 60 | 56 (93 %) | 1166 | 78 % | 2.06 | 991.82 |
| Signals | signal:s2-bb-bounce | 56 | 43 (77 %) | 187 | 88 % | 3.56 | 287.71 |
| Signals | signal:s2-block-scale | 60 | 44 (73 %) | 1208 | 74 % | 1.26 | 421.75 |
| Signals | signal:s2-block-stack | 60 | 52 (87 %) | 483 | 81 % | 3.49 | 843.53 |
| Signals | signal:s2-confluence | 60 | 52 (87 %) | 529 | 86 % | 4.36 | 846.19 |
| Signals | signal:s2-ema-cross | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 7.89 |
| Signals | signal:s2-range-break | 60 | 45 (75 %) | 290 | 68 % | 2.59 | 313.47 |
| Signals | signal:s2-range-shift | 60 | 57 (95 %) | 716 | 85 % | 6.38 | 1280.01 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 129 | 71 % | 1.60 | 98.24 |
| Signals | signal:s2-st-trail | 37 | 37 (100 %) | 151 | 87 % | 158.67 | 375.50 |
| Signals | signal:s2-stoch-swing | 60 | 58 (97 %) | 414 | 83 % | 4.90 | 734.53 |
| Signals | signal:s2-vol-break | 58 | 37 (64 %) | 112 | 56 % | 1.46 | 48.29 |
| Signals | signal:sar | 60 | 55 (92 %) | 1114 | 78 % | 1.89 | 945.72 |
| Signals | signal:squeeze | 6 | 3 (50 %) | 7 | 43 % | 0.05 | -8.30 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 157 | 90 % | 222.24 | 404.22 |
| Signals | signal:stoch-rsi | 60 | 56 (93 %) | 1011 | 77 % | 2.00 | 817.59 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 381 | 81 % | 5.65 | 603.55 |
| Signals | signal:swing | 60 | 60 (100 %) | 1098 | 81 % | 4.04 | 1636.99 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1207 | 86 % | 3.71 | 1914.57 |
| Signals | signal:trix | 60 | 27 (45 %) | 354 | 71 % | 0.97 | -15.93 |
| Signals | signal:volume-break | 58 | 42 (72 %) | 82 | 61 % | 10.40 | 137.53 |
| Signals | signal:vwap | 60 | 41 (68 %) | 416 | 75 % | 1.30 | 180.90 |
| Signals | signal:williams-r | 60 | 55 (92 %) | 753 | 76 % | 2.52 | 874.01 |
| Signals | signal:zscore | 56 | 44 (79 %) | 331 | 76 % | 1.70 | 247.84 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1341 | 1146 (85 %) | 18846 | 79 % | 2.28 | 17417.22 |
| Signals | 1.25 | 930 | 809 (87 %) | 14384 | 79 % | 2.29 | 12429.49 |
| Signals | 1.35 | 770 | 671 (87 %) | 12633 | 79 % | 2.29 | 10402.17 |
| Signals | 1.5 | 598 | 527 (88 %) | 10347 | 79 % | 2.31 | 8244.51 |
| Signals | 1.75 | 461 | 407 (88 %) | 8418 | 79 % | 2.35 | 6493.45 |
| Signals | 2 | 363 | 320 (88 %) | 6778 | 79 % | 2.43 | 5245.57 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 546 | 83 % | 8.88 | 1045.01 | tp3 sl9 tr0 h48 (17 · ∞ (no loss) · 47.60) |
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 656 | 85 % | 3.19 | 1023.57 | tp5 sl10 tr0 h48 (12 · ∞ (no loss) · 56.15) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 602 | 84 % | 7.53 | 1018.75 | tp3 sl9 tr0 h48 (21 · ∞ (no loss) · 58.80) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 431 | 94 % | 61.24 | 921.74 | tp3 sl6 tr0 h48 (15 · ∞ (no loss) · 42.00) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 571 | 88 % | 5.48 | 913.45 | tp2.5 sl7.5 tr0 h48 (23 · 17.40 · 47.69) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 551 | 87 % | 4.72 | 891.00 | tp5 sl15 tr0 h48 (10 · ∞ (no loss) · 48.00) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 30 (100 %) | 429 | 90 % | 10.71 | 854.62 | tp5 sl7.5 tr0 h48 (9 · ∞ (no loss) · 43.20) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 410 | 87 % | 17.97 | 814.90 | tp3 sl4.5 tr0 h48 (14 · 45.67 · 35.60) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 30 (100 %) | 735 | 79 % | 2.61 | 769.16 | tp2.5 sl7.5 tr0 h48 (29 · 4.03 · 46.70) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 314 | 91 % | 25.72 | 703.25 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-keltner-s@m15 | 30 | 30 (100 %) | 305 | 90 % | 20.46 | 702.11 | tp8 sl24 tr3.2 h48 (8 · ∞ (no loss) · 29.37) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 29 (97 %) | 670 | 79 % | 2.33 | 699.01 | tp2.5 sl7.5 tr0 h48 (27 · 7.77 · 52.10) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 820 | 77 % | 1.81 | 697.74 | tp4 sl12 tr0 h48 (16 · 4.67 · 44.80) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 29 (97 %) | 667 | 79 % | 2.32 | 694.55 | tp2.5 sl7.5 tr0 h48 (27 · 7.77 · 52.10) |
| Signals | follow | sig-hma-s@m15 | 30 | 30 (100 %) | 514 | 84 % | 3.71 | 691.56 | tp3 sl9 tr0 h48 (17 · 4.87 · 35.60) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 30 (100 %) | 581 | 80 % | 2.60 | 662.94 | tp2.5 sl7.5 tr0 h48 (22 · 6.27 · 40.60) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 30 (100 %) | 581 | 80 % | 2.60 | 662.94 | tp2.5 sl7.5 tr0 h48 (22 · 6.27 · 40.60) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 30 (100 %) | 691 | 81 % | 2.10 | 626.87 | tp3 sl9 tr1.2 h48 (34 · 4.72 · 37.81) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 552 | 78 % | 2.46 | 591.97 | tp6 sl12 tr0 h48 (7 · ∞ (no loss) · 40.60) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 30 (100 %) | 446 | 85 % | 2.68 | 585.06 | tp4 sl12 tr0 h48 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 29 (97 %) | 302 | 83 % | 4.62 | 581.26 | tp5 sl7.5 tr0 h48 (7 · ∞ (no loss) · 32.15) |
| Signals | follow | sig-kama-s@m15 | 30 | 28 (93 %) | 607 | 79 % | 1.93 | 570.24 | tp3 sl9 tr0 h48 (19 · 5.48 · 41.20) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 258 | 87 % | 21.18 | 543.32 | tp8 sl24 tr3.2 h48 (7 · 294.81 · 27.57) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 329 | 85 % | 5.51 | 525.83 | tp3 sl6 tr0 h48 (13 · ∞ (no loss) · 36.40) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 30 (100 %) | 346 | 83 % | 4.08 | 525.36 | tp2.5 sl7.5 tr0 h48 (13 · ∞ (no loss) · 29.90) |
| Signals | follow | sig-donchian-s@m15 | 30 | 30 (100 %) | 323 | 87 % | 7.38 | 497.77 | tp3 sl9 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 27 (90 %) | 538 | 76 % | 2.29 | 496.86 | tp6 sl18 tr1.2 h48 (28 · 10.40 · 30.07) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 29 (97 %) | 628 | 80 % | 1.89 | 494.95 | tp2.5 sl7.5 tr0 h48 (21 · 2.84 · 28.30) |
| Signals | follow | sig-kama-m@m15 | 30 | 28 (93 %) | 526 | 80 % | 1.92 | 493.57 | tp5 sl15 tr1 h48 (24 · 14.65 · 37.85) |
| Signals | follow | sig-sar-m@m15 | 30 | 26 (87 %) | 483 | 78 % | 2.30 | 485.77 | tp4 sl12 tr0 h48 (13 · 3.74 · 33.40) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 320 | 79 % | 4.67 | 474.69 | tp4 sl12 tr0 h48 (8 · 46.95 · 26.03) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 28 (93 %) | 544 | 78 % | 2.13 | 468.24 | tp3 sl9 tr0 h48 (15 · 4.26 · 30.00) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 30 (100 %) | 284 | 81 % | 4.09 | 468.06 | tp2.5 sl7.5 tr0 h48 (11 · ∞ (no loss) · 25.30) |
| Signals | follow | sig-cmf-m@m15 | 30 | 28 (93 %) | 437 | 84 % | 2.12 | 463.45 | tp3 sl9 tr0 h48 (14 · 3.96 · 27.20) |
| Signals | follow | sig-sar-s@m15 | 30 | 29 (97 %) | 631 | 78 % | 1.67 | 459.95 | tp5 sl15 tr0 h48 (11 · 3.16 · 32.80) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 30 (100 %) | 249 | 88 % | 9.66 | 455.32 | tp5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 263 | 84 % | 6.79 | 448.49 | tp3 sl9 tr0 h48 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 28 (93 %) | 329 | 74 % | 3.13 | 445.27 | tp3 sl6 tr0 h48 (10 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-impulse-m@m15 | 30 | 30 (100 %) | 350 | 73 % | 3.46 | 433.84 | tp3 sl9 tr0.9 h48 (19 · 24.74 · 23.75) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 27 (90 %) | 424 | 78 % | 2.17 | 428.74 | tp6 sl18 tr1.2 h48 (21 · 6.91 · 32.37) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 27 (90 %) | 287 | 78 % | 3.83 | 425.39 | tp3 sl9 tr0.6 h48 (19 · 21.63 · 26.07) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 26 (87 %) | 484 | 76 % | 1.87 | 415.05 | tp3 sl6 tr0 h48 (17 · 7.23 · 38.60) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 157 | 90 % | 222.24 | 404.22 | tp3 sl4.5 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 29 (97 %) | 498 | 78 % | 1.61 | 396.73 | tp6 sl12 tr0 h48 (9 · 2.24 · 22.50) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 26 (87 %) | 523 | 75 % | 1.73 | 390.43 | tp3 sl9 tr0 h48 (19 · 5.48 · 41.20) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 30 (100 %) | 140 | 89 % | 179.29 | 373.20 | tp3 sl4.5 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-keltner-m@m15 | 30 | 29 (97 %) | 211 | 90 % | 8.21 | 352.86 | tp3 sl6 tr0 h48 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 23 (77 %) | 460 | 75 % | 1.93 | 351.04 | tp3 sl9 tr0 h48 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 28 (93 %) | 467 | 77 % | 1.87 | 349.35 | tp8 sl24 tr2.4 h48 (11 · ∞ (no loss) · 28.62) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 30 (100 %) | 169 | 85 % | 10.40 | 345.67 | tp8 sl24 tr1.6 h48 (7 · ∞ (no loss) · 22.68) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 24 (80 %) | 574 | 78 % | 1.55 | 340.74 | tp5 sl15 tr0 h48 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 28 (93 %) | 461 | 80 % | 1.52 | 326.49 | tp4 sl12 tr0 h48 (11 · 3.11 · 25.80) |
| Signals | follow | sig-cmf-s@m15 | 30 | 26 (87 %) | 567 | 78 % | 1.50 | 325.22 | tp4 sl12 tr0.8 h48 (33 · 14.62 · 33.28) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 26 (87 %) | 390 | 81 % | 1.62 | 305.46 | tp3 sl6 tr0 h48 (14 · 2.71 · 21.20) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 27 | 27 (100 %) | 119 | 97 % | 491.15 | 299.70 | tp5 sl15 tr1 h48 (7 · ∞ (no loss) · 17.69) |
| Signals | follow | sig-obv-m@m15 | 30 | 27 (90 %) | 193 | 82 % | 3.98 | 286.01 | tp3 sl9 tr0 h48 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 28 (93 %) | 246 | 78 % | 2.28 | 284.03 | tp4 sl8 tr0 h48 (8 · 3.24 · 18.40) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 23 (77 %) | 210 | 81 % | 2.32 | 270.93 | tp4 sl12 tr1.2 h48 (11 · 273.64 · 25.27) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 24 (80 %) | 525 | 75 % | 1.46 | 268.87 | tp3 sl9 tr0 h48 (17 · 2.28 · 23.60) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 130 | 88 % | 8.27 | 266.47 | tp5 sl15 tr1 h48 (8 · 92.64 · 13.88) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 30 (100 %) | 172 | 87 % | 12.07 | 264.15 | tp2.5 sl3.75 tr0 h48 (8 · ∞ (no loss) · 18.40) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 23 (77 %) | 181 | 79 % | 2.48 | 262.27 | tp6 sl18 tr1.8 h48 (7 · 21.76 · 14.70) |
| Signals | follow | sig-cci-m@m15 | 30 | 27 (90 %) | 137 | 82 % | 4.09 | 259.74 | tp5 sl15 tr2 h48 (6 · ∞ (no loss) · 15.45) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 105 | 90 % | 10.33 | 259.72 | tp5 sl15 tr1 h48 (5 · 188.02 · 10.21) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 24 (80 %) | 207 | 81 % | 2.17 | 257.79 | tp6 sl18 tr1.2 h48 (8 · ∞ (no loss) · 20.33) |
| Signals | follow | sig-cci-s@m15 | 30 | 21 (70 %) | 405 | 72 % | 1.64 | 250.22 | tp5 sl15 tr2 h48 (12 · 121.86 · 27.73) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 24 (80 %) | 597 | 75 % | 1.32 | 249.12 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 27 (90 %) | 191 | 86 % | 3.04 | 216.21 | tp3 sl9 tr1.2 h48 (10 · 76.51 · 15.17) |
| Signals | follow | sig-r-awesome-m@m15 | 27 | 24 (89 %) | 235 | 81 % | 2.62 | 211.83 | tp4 sl12 tr1.6 h48 (11 · 95.66 · 14.05) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 30 (100 %) | 166 | 79 % | 3.66 | 194.73 | tp3 sl9 tr0 h48 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 24 (80 %) | 167 | 65 % | 2.55 | 187.30 | tp2.5 sl7.5 tr0 h48 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-adx-s@m15 | 30 | 22 (73 %) | 309 | 81 % | 1.33 | 184.22 | tp4 sl8 tr0 h48 (10 · 4.17 · 26.00) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 22 (73 %) | 212 | 75 % | 1.71 | 183.06 | tp5 sl15 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-zscore-s@m15 | 30 | 22 (73 %) | 212 | 75 % | 1.71 | 183.06 | tp5 sl15 tr2 h48 (7 · 131.22 · 20.56) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 25 (83 %) | 266 | 80 % | 1.51 | 177.05 | tp3 sl9 tr0.6 h48 (13 · 21.64 · 12.68) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 21 (70 %) | 215 | 77 % | 1.83 | 173.53 | tp3 sl9 tr1.2 h48 (11 · 215.02 · 17.14) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 20 (67 %) | 611 | 72 % | 1.21 | 172.62 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-obv-s@m15 | 30 | 17 (57 %) | 348 | 72 % | 1.36 | 171.43 | tp6 sl18 tr1.2 h48 (16 · 7.85 · 24.89) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 19 (63 %) | 386 | 75 % | 1.37 | 169.24 | tp2.5 sl7.5 tr0 h48 (14 · 3.88 · 22.20) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 21 (70 %) | 336 | 74 % | 1.32 | 160.45 | tp5 sl15 tr1 h48 (14 · 36.86 · 29.96) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 82 | 94 % | 273.13 | 160.01 | – |
| Signals | follow | sig-ema-slope-m@m15 | 24 | 22 (92 %) | 88 | 76 % | 5.58 | 156.32 | tp4 sl12 tr0.8 h48 (6 · 54.90 · 7.96) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 22 (73 %) | 215 | 79 % | 1.64 | 142.94 | tp3 sl9 tr0.9 h48 (11 · 10.53 · 13.79) |
| Signals | follow | sig-rsi-reversal-m@m15 | 27 | 27 (100 %) | 52 | 94 % | 16.66 | 142.50 | – |
| Signals | follow | sig-bollinger-m@m15 | 30 | 22 (73 %) | 152 | 78 % | 1.77 | 141.46 | tp6 sl18 tr2.4 h48 (6 · ∞ (no loss) · 13.35) |
| Signals | follow | sig-adx-m@m15 | 30 | 23 (77 %) | 156 | 65 % | 1.78 | 135.61 | tp5 sl15 tr2 h48 (6 · 6.82 · 11.82) |
| Signals | follow | sig-rsi-reversal-s@m15 | 27 | 25 (93 %) | 48 | 94 % | 16.42 | 135.36 | – |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 61 | 93 % | 447.98 | 128.86 | tp3 sl9 tr0.6 h48 (5 · 115.84 · 6.29) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 21 (70 %) | 205 | 74 % | 1.53 | 126.42 | tp3 sl9 tr0.9 h48 (11 · 58.13 · 13.34) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 21 (70 %) | 123 | 72 % | 2.66 | 126.17 | tp2.5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 20 (67 %) | 167 | 78 % | 1.48 | 125.29 | tp8 sl24 tr2.4 h48 (5 · 64.63 · 15.29) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 26 (87 %) | 168 | 73 % | 2.30 | 118.05 | tp3 sl9 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 21 (70 %) | 125 | 73 % | 2.04 | 116.25 | tp3 sl6 tr0 h48 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 19 (63 %) | 216 | 75 % | 1.37 | 113.79 | tp3 sl9 tr1.2 h48 (10 · ∞ (no loss) · 17.80) |
| Signals | follow | sig-volume-break-m@m15 | 29 | 27 (93 %) | 51 | 69 % | 12.81 | 86.34 | – |
| Signals | follow | sig-reclaim-s@m15 | 30 | 19 (63 %) | 367 | 77 % | 1.13 | 81.62 | tp3 sl9 tr0.9 h48 (20 · 3.11 · 19.92) |
| Signals | follow | sig-trix-s@m15 | 30 | 16 (53 %) | 218 | 77 % | 1.26 | 72.30 | tp6 sl18 tr2.4 h48 (5 · ∞ (no loss) · 12.40) |
| Signals | follow | sig-zscore-m@m15 | 26 | 22 (85 %) | 119 | 76 % | 1.67 | 64.78 | tp5 sl15 tr1.5 h48 (6 · 1.62 · 2.34) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 21 (70 %) | 75 | 71 % | 1.56 | 54.09 | tp2.5 sl3.75 tr0 h48 (5 · 0.39 · -7.25) |
| Signals | follow | sig-s2-vol-break-s@m15 | 29 | 17 (59 %) | 33 | 52 % | 8.15 | 52.31 | – |
| Signals | follow | sig-volume-break-s@m15 | 29 | 15 (52 %) | 31 | 48 % | 8.00 | 51.19 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 26 | 18 (69 %) | 54 | 70 % | 1.65 | 44.15 | – |
| Signals | follow | sig-mfi-m@m15 | 21 | 18 (86 %) | 59 | 73 % | 3.73 | 40.10 | tp3 sl9 tr0.9 h48 (5 · 24.58 · 4.01) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 12 (40 %) | 143 | 79 % | 1.10 | 19.42 | tp5 sl15 tr1 h48 (8 · 341.27 · 11.28) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 7.89 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 7 | 7 (100 %) | 11 | 64 % | 8.96 | 2.30 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 29 | 20 (69 %) | 79 | 58 % | 0.96 | -4.02 | tp5 sl15 tr1 h48 (5 · 11.14 · 4.31) |
| Signals | follow | sig-squeeze-s@m15 | 6 | 3 (50 %) | 7 | 43 % | 0.05 | -8.30 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 29 | 16 (55 %) | 68 | 72 % | 0.89 | -12.00 | tp3 sl9 tr0.6 h48 (5 · 32.83 · 3.63) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 17 (57 %) | 299 | 73 % | 0.97 | -15.56 | tp2.5 sl5 tr0 h48 (12 · 2.21 · 12.60) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 11 (37 %) | 102 | 73 % | 0.88 | -22.54 | tp3 sl9 tr0.9 h48 (5 · 0.82 · -1.62) |
| Signals | follow | sig-hma-m@m15 | 30 | 11 (37 %) | 151 | 70 % | 0.87 | -33.44 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 12 (40 %) | 550 | 68 % | 0.92 | -72.77 | tp8 sl24 tr1.6 h48 (22 · 14.74 · 21.97) |
| Signals | follow | sig-vwap-s@m15 | 30 | 11 (37 %) | 311 | 69 % | 0.86 | -78.82 | tp5 sl15 tr1 h48 (15 · 23.64 · 17.28) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 12 (40 %) | 301 | 75 % | 0.84 | -85.58 | tp8 sl24 tr2.4 h48 (8 · 53.53 · 12.62) |
| Signals | follow | sig-trix-m@m15 | 30 | 11 (37 %) | 136 | 61 % | 0.70 | -88.23 | tp8 sl24 tr1.6 h48 (5 · 2.76 · 5.58) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 8 (27 %) | 71 | 35 % | 0.16 | -233.61 | – |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 4 (13 %) | 158 | 61 % | 0.42 | -278.12 | tp3 sl9 tr0.9 h48 (10 · 1.19 · 1.76) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr off | 115 | 102 (89 %) | 1160 | 90 % | 2.81 | 1882.33 |
| Signals | tp 2.500% | sl 3.00× | tr off | 115 | 105 (91 %) | 1340 | 90 % | 2.74 | 1758.69 |
| Signals | tp 4.000% | sl 3.00× | tr off | 114 | 97 (85 %) | 759 | 89 % | 2.82 | 1663.27 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 117 | 104 (89 %) | 1741 | 80 % | 3.10 | 1649.57 |
| Signals | tp 5.000% | sl 3.00× | tr off | 113 | 99 (88 %) | 541 | 89 % | 2.87 | 1501.12 |
| Signals | tp 3.000% | sl 2.00× | tr off | 115 | 93 (81 %) | 1299 | 81 % | 2.00 | 1484.64 |
| Signals | tp 5.000% | sl 3.00× | tr 0.20× | 118 | 105 (89 %) | 1797 | 78 % | 2.95 | 1475.86 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 115 | 103 (90 %) | 1196 | 85 % | 2.97 | 1460.79 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 115 | 98 (85 %) | 1428 | 82 % | 2.56 | 1421.01 |
| Signals | tp 4.000% | sl 3.00× | tr 0.30× | 117 | 101 (86 %) | 1684 | 80 % | 2.52 | 1417.75 |
| Signals | tp 4.000% | sl 2.00× | tr off | 114 | 98 (86 %) | 831 | 82 % | 2.20 | 1412.87 |
| Signals | tp 6.000% | sl 3.00× | tr 0.20× | 117 | 99 (85 %) | 1655 | 80 % | 2.47 | 1360.68 |
| Signals | tp 3.000% | sl 3.00× | tr 0.30× | 118 | 104 (88 %) | 1970 | 77 % | 2.61 | 1347.45 |
| Signals | tp 5.000% | sl 2.00× | tr off | 113 | 89 (79 %) | 584 | 83 % | 2.36 | 1334.16 |
| Signals | tp 5.000% | sl 3.00× | tr 0.30× | 115 | 102 (89 %) | 1422 | 82 % | 2.55 | 1323.43 |
| Signals | tp 8.000% | sl 3.00× | tr 0.20× | 115 | 105 (91 %) | 1346 | 83 % | 2.71 | 1309.97 |
| Signals | tp 8.000% | sl 3.00× | tr 0.30× | 115 | 97 (84 %) | 1064 | 84 % | 2.80 | 1269.34 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 115 | 100 (87 %) | 1078 | 83 % | 2.50 | 1239.13 |
| Signals | tp 6.000% | sl 3.00× | tr off | 106 | 87 (82 %) | 382 | 88 % | 2.64 | 1201.82 |
| Signals | tp 4.000% | sl 3.00× | tr 0.20× | 118 | 97 (82 %) | 1991 | 75 % | 2.15 | 1110.68 |
| Signals | tp 5.000% | sl 1.50× | tr off | 113 | 89 (79 %) | 651 | 75 % | 1.90 | 1100.34 |
| Signals | tp 6.000% | sl 3.00× | tr 0.30× | 115 | 98 (85 %) | 1246 | 82 % | 2.23 | 1098.53 |
| Signals | tp 6.000% | sl 2.00× | tr off | 107 | 79 (74 %) | 411 | 82 % | 2.30 | 1097.66 |
| Signals | tp 4.000% | sl 1.50× | tr off | 115 | 91 (79 %) | 944 | 72 % | 1.62 | 993.64 |
| Signals | tp 3.000% | sl 3.00× | tr 0.20× | 118 | 99 (84 %) | 2323 | 67 % | 2.16 | 992.14 |
| Signals | tp 6.000% | sl 1.50× | tr off | 107 | 80 (75 %) | 463 | 74 % | 1.84 | 898.26 |
| Signals | tp 2.500% | sl 2.00× | tr off | 115 | 87 (76 %) | 1542 | 77 % | 1.48 | 890.04 |
| Signals | tp 3.000% | sl 1.50× | tr off | 116 | 82 (71 %) | 1472 | 70 % | 1.39 | 811.04 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 108 | 87 (81 %) | 724 | 84 % | 1.96 | 755.22 |
| Signals | tp 2.500% | sl 1.50× | tr off | 116 | 74 (64 %) | 1734 | 68 % | 1.25 | 547.89 |

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
