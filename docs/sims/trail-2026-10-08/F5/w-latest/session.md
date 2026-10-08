# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1354/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 351/19072 · PF 1.54 · Micro 233/5900 · PF 2.26 · Short 642/8176 · PF 1.47 · General 514/8176 · PF 1.50 · Long 570/8176 · PF 1.51 · Signals 126/126; Main 1228 pairs, 215798 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 184 s. Causal: Base / Main / Real ranked on the history before the run.

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
| closes ≥ 6 | 1.00 | 6 | 1 | 596 | 1564 (+403) | 6.3 % | 1.707 |
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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1228 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (215798 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3229); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 26808 · 0.72 | 6894 · 0.80 | 8831 · 0.99 | 1233 · 0.64 | – | – | – | – | – |
| 13:00 | 45969 · 0.42 | 8282 · 0.68 | 14628 · 0.68 | 616 · 3.80 | – | – | – | – | – |
| 14:00 | 27932 · 2.07 | 7111 · 2.13 | 8614 · 2.48 | 1616 · 7.00 | – | – | – | – | – |
| 15:00 | 36096 · 1.36 | 9237 · 1.13 | 12275 · 1.46 | 3098 · 0.63 | – | – | – | – | – |
| 16:00 | 25766 · 1.13 | 4531 · 1.07 | 7997 · 1.58 | 616 · 1.65 | – | – | – | – | – |
| 17:00 | 17103 · 1.68 | 3672 · 1.16 | 5592 · 1.42 | 1002 · 1.48 | – | – | – | – | – |
| 18:00 | 17493 · 1.96 | 2959 · 2.86 | 4255 · 2.27 | 442 · 1.70 | – | – | – | – | – |
| 19:00 | 20894 · 1.07 | 5572 · 1.61 | 6113 · 1.29 | 939 · 1.90 | – | – | – | – | – |
| 20:00 | 40642 · 0.64 | 12349 · 0.90 | 9023 · 0.64 | 1817 · 1.45 | – | – | – | – | – |
| 21:00 | 47375 · 0.69 | 13164 · 0.96 | 14370 · 0.77 | 2165 · 1.09 | – | – | – | – | – |
| 22:00 | 46962 · 0.44 | 12131 · 0.43 | 16918 · 0.49 | 2285 · 0.16 | – | – | – | – | – |
| 23:00 | 29794 · 0.45 | 5791 · 0.46 | 8069 · 0.36 | 1126 · 0.20 | – | – | – | – | – |
| **total** | **382834 · 0.81** | **91693 · 0.90** | **116685 · 0.85** | **16955 · 0.73** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 43244 | sig:confirm 43244 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 212018 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2142 units active at the run start, 3005 over the run, 3229 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1672 | 531 (32 %) | 10458 | 58 % | 0.64 | -10962.67 |
| Signals | trailing | 1557 | 790 (51 %) | 6497 | 72 % | 0.86 | -2595.57 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 56 | 42 (75 %) | 299 | 81 % | 1.86 | 378.62 |
| Signals | signal:act-hf | 60 | 14 (23 %) | 423 | 62 % | 0.71 | -382.23 |
| Signals | signal:adx | 60 | 22 (37 %) | 327 | 63 % | 0.77 | -244.43 |
| Signals | signal:atr-break | 54 | 27 (50 %) | 265 | 69 % | 0.98 | -11.18 |
| Signals | signal:bollinger | 60 | 3 (5 %) | 307 | 55 % | 0.53 | -600.71 |
| Signals | signal:cci | 60 | 13 (22 %) | 443 | 62 % | 0.63 | -559.22 |
| Signals | signal:cmf | 52 | 5 (10 %) | 265 | 41 % | 0.24 | -933.76 |
| Signals | signal:donchian | 38 | 14 (37 %) | 145 | 59 % | 0.68 | -130.85 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 157 | 92 % | 9.26 | 478.34 |
| Signals | signal:ema-cross-fast | 60 | 54 (90 %) | 356 | 85 % | 2.47 | 624.23 |
| Signals | signal:ema-pullback | 58 | 17 (29 %) | 321 | 62 % | 0.60 | -383.81 |
| Signals | signal:ema-slope | 58 | 31 (53 %) | 220 | 73 % | 1.23 | 101.99 |
| Signals | signal:ema-trend | 57 | 13 (23 %) | 406 | 58 % | 0.53 | -659.67 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 463 | 57 % | 0.53 | -743.85 |
| Signals | signal:hma | 60 | 21 (35 %) | 404 | 61 % | 0.68 | -390.93 |
| Signals | signal:ichimoku | 57 | 33 (58 %) | 188 | 65 % | 0.81 | -95.64 |
| Signals | signal:impulse | 53 | 3 (6 %) | 322 | 46 % | 0.33 | -930.25 |
| Signals | signal:kama | 60 | 20 (33 %) | 528 | 64 % | 0.78 | -311.37 |
| Signals | signal:keltner | 60 | 37 (62 %) | 149 | 74 % | 1.65 | 176.28 |
| Signals | signal:macd-cross | 50 | 6 (12 %) | 321 | 58 % | 0.51 | -522.04 |
| Signals | signal:macd-hist | 56 | 23 (41 %) | 490 | 68 % | 0.82 | -221.05 |
| Signals | signal:macd-slow | 57 | 16 (28 %) | 338 | 66 % | 0.69 | -301.84 |
| Signals | signal:mfi | 13 | 13 (100 %) | 21 | 95 % | 10.18 | 36.25 |
| Signals | signal:obv | 60 | 43 (72 %) | 442 | 75 % | 1.46 | 338.03 |
| Signals | signal:r-awesome | 54 | 6 (11 %) | 302 | 44 % | 0.34 | -870.60 |
| Signals | signal:r-connors | 35 | 15 (43 %) | 118 | 56 % | 0.43 | -255.16 |
| Signals | signal:r-fractal | 34 | 1 (3 %) | 82 | 30 % | 0.15 | -353.53 |
| Signals | signal:r-inside | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -76.75 |
| Signals | signal:r-linreg | 60 | 18 (30 %) | 363 | 60 % | 0.64 | -389.95 |
| Signals | signal:r-nr-break | 48 | 4 (8 %) | 211 | 42 % | 0.29 | -679.66 |
| Signals | signal:r-session-trend | 60 | 12 (20 %) | 371 | 55 % | 0.47 | -752.00 |
| Signals | signal:r-vol-regime | 50 | 46 (92 %) | 74 | 89 % | 7.63 | 250.95 |
| Signals | signal:reclaim | 60 | 18 (30 %) | 509 | 66 % | 0.82 | -249.91 |
| Signals | signal:rsi-mid | 57 | 13 (23 %) | 276 | 56 % | 0.48 | -469.89 |
| Signals | signal:rsi-momentum | 20 | 17 (85 %) | 20 | 85 % | 2.75 | 30.07 |
| Signals | signal:rsi-reversal | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:s2-active-hf | 58 | 14 (24 %) | 446 | 60 % | 0.70 | -398.14 |
| Signals | signal:s2-adx-gate | 56 | 24 (43 %) | 343 | 66 % | 0.83 | -145.66 |
| Signals | signal:s2-atr-break | 58 | 6 (10 %) | 301 | 54 % | 0.45 | -634.13 |
| Signals | signal:s2-bb-bounce | 60 | 43 (72 %) | 260 | 74 % | 1.83 | 361.13 |
| Signals | signal:s2-block-scale | 60 | 14 (23 %) | 411 | 63 % | 0.66 | -381.72 |
| Signals | signal:s2-block-stack | 53 | 7 (13 %) | 215 | 53 % | 0.44 | -515.94 |
| Signals | signal:s2-confluence | 60 | 34 (57 %) | 510 | 72 % | 1.21 | 196.72 |
| Signals | signal:s2-ema-cross | 30 | 27 (90 %) | 33 | 91 % | 9.64 | 119.65 |
| Signals | signal:s2-range-break | 49 | 38 (78 %) | 66 | 83 % | 1.61 | 75.23 |
| Signals | signal:s2-range-shift | 58 | 20 (34 %) | 203 | 53 % | 0.52 | -372.22 |
| Signals | signal:s2-rsi-revert | 20 | 7 (35 %) | 40 | 48 % | 0.46 | -72.68 |
| Signals | signal:s2-st-trail | 53 | 40 (75 %) | 97 | 80 % | 2.28 | 158.29 |
| Signals | signal:s2-stoch-swing | 60 | 43 (72 %) | 447 | 76 % | 1.84 | 583.70 |
| Signals | signal:s2-vol-break | 52 | 31 (60 %) | 106 | 74 % | 1.13 | 30.77 |
| Signals | signal:s2-vwap-axis | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 77.22 |
| Signals | signal:sar | 60 | 18 (30 %) | 476 | 65 % | 0.76 | -319.66 |
| Signals | signal:squeeze | 46 | 10 (22 %) | 88 | 52 % | 0.40 | -247.77 |
| Signals | signal:st-slow | 53 | 29 (55 %) | 107 | 72 % | 1.32 | 69.51 |
| Signals | signal:stoch-rsi | 58 | 14 (24 %) | 466 | 58 % | 0.57 | -600.37 |
| Signals | signal:supertrend | 60 | 52 (87 %) | 237 | 80 % | 1.77 | 283.59 |
| Signals | signal:swing | 53 | 4 (8 %) | 425 | 52 % | 0.36 | -1065.10 |
| Signals | signal:thrust | 58 | 3 (5 %) | 404 | 49 % | 0.29 | -1226.37 |
| Signals | signal:trix | 60 | 38 (63 %) | 267 | 77 % | 1.47 | 258.66 |
| Signals | signal:volume-break | 50 | 47 (94 %) | 50 | 94 % | 10.49 | 163.57 |
| Signals | signal:vwap | 59 | 39 (66 %) | 324 | 77 % | 1.47 | 271.10 |
| Signals | signal:williams-r | 60 | 15 (25 %) | 404 | 61 % | 0.72 | -355.76 |
| Signals | signal:zscore | 60 | 1 (2 %) | 268 | 50 % | 0.40 | -752.46 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 75768 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75768 | 0 |  |
| Short | 39456 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39456 | 0 |  |
| General | 13080 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13080 | 0 |  |
| Long | 18630 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18630 | 0 |  |
| Wide | 65084 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 65084 | 0 |  |
| Signals | 3780 | – | 2142 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2142 units (pair × symbol × direction) active at the run start, 3005 over the run; 3229 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1398 (74 %) | 17553 | 81 % | 1.77 | 23842.12 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 56 | 42 (75 %) | 299 | 81 % | 1.86 | 378.62 |
| Signals | signal:act-hf | 60 | 14 (23 %) | 423 | 62 % | 0.71 | -382.23 |
| Signals | signal:adx | 60 | 22 (37 %) | 327 | 63 % | 0.77 | -244.43 |
| Signals | signal:atr-break | 54 | 27 (50 %) | 265 | 69 % | 0.98 | -11.18 |
| Signals | signal:bollinger | 60 | 3 (5 %) | 307 | 55 % | 0.53 | -600.71 |
| Signals | signal:cci | 60 | 13 (22 %) | 443 | 62 % | 0.63 | -559.22 |
| Signals | signal:cmf | 52 | 5 (10 %) | 265 | 41 % | 0.24 | -933.76 |
| Signals | signal:donchian | 38 | 14 (37 %) | 145 | 59 % | 0.68 | -130.85 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 157 | 92 % | 9.26 | 478.34 |
| Signals | signal:ema-cross-fast | 60 | 54 (90 %) | 356 | 85 % | 2.47 | 624.23 |
| Signals | signal:ema-pullback | 58 | 17 (29 %) | 321 | 62 % | 0.60 | -383.81 |
| Signals | signal:ema-slope | 58 | 31 (53 %) | 220 | 73 % | 1.23 | 101.99 |
| Signals | signal:ema-trend | 57 | 13 (23 %) | 406 | 58 % | 0.53 | -659.67 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 463 | 57 % | 0.53 | -743.85 |
| Signals | signal:hma | 60 | 21 (35 %) | 404 | 61 % | 0.68 | -390.93 |
| Signals | signal:ichimoku | 57 | 33 (58 %) | 188 | 65 % | 0.81 | -95.64 |
| Signals | signal:impulse | 53 | 3 (6 %) | 322 | 46 % | 0.33 | -930.25 |
| Signals | signal:kama | 60 | 20 (33 %) | 528 | 64 % | 0.78 | -311.37 |
| Signals | signal:keltner | 60 | 37 (62 %) | 149 | 74 % | 1.65 | 176.28 |
| Signals | signal:macd-cross | 50 | 6 (12 %) | 321 | 58 % | 0.51 | -522.04 |
| Signals | signal:macd-hist | 56 | 23 (41 %) | 490 | 68 % | 0.82 | -221.05 |
| Signals | signal:macd-slow | 57 | 16 (28 %) | 338 | 66 % | 0.69 | -301.84 |
| Signals | signal:mfi | 13 | 13 (100 %) | 21 | 95 % | 10.18 | 36.25 |
| Signals | signal:obv | 60 | 43 (72 %) | 442 | 75 % | 1.46 | 338.03 |
| Signals | signal:r-awesome | 54 | 6 (11 %) | 302 | 44 % | 0.34 | -870.60 |
| Signals | signal:r-connors | 35 | 15 (43 %) | 118 | 56 % | 0.43 | -255.16 |
| Signals | signal:r-fractal | 34 | 1 (3 %) | 82 | 30 % | 0.15 | -353.53 |
| Signals | signal:r-inside | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -76.75 |
| Signals | signal:r-linreg | 60 | 18 (30 %) | 363 | 60 % | 0.64 | -389.95 |
| Signals | signal:r-nr-break | 48 | 4 (8 %) | 211 | 42 % | 0.29 | -679.66 |
| Signals | signal:r-session-trend | 60 | 12 (20 %) | 371 | 55 % | 0.47 | -752.00 |
| Signals | signal:r-vol-regime | 50 | 46 (92 %) | 74 | 89 % | 7.63 | 250.95 |
| Signals | signal:reclaim | 60 | 18 (30 %) | 509 | 66 % | 0.82 | -249.91 |
| Signals | signal:rsi-mid | 57 | 13 (23 %) | 276 | 56 % | 0.48 | -469.89 |
| Signals | signal:rsi-momentum | 20 | 17 (85 %) | 20 | 85 % | 2.75 | 30.07 |
| Signals | signal:rsi-reversal | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:s2-active-hf | 58 | 14 (24 %) | 446 | 60 % | 0.70 | -398.14 |
| Signals | signal:s2-adx-gate | 56 | 24 (43 %) | 343 | 66 % | 0.83 | -145.66 |
| Signals | signal:s2-atr-break | 58 | 6 (10 %) | 301 | 54 % | 0.45 | -634.13 |
| Signals | signal:s2-bb-bounce | 60 | 43 (72 %) | 260 | 74 % | 1.83 | 361.13 |
| Signals | signal:s2-block-scale | 60 | 14 (23 %) | 411 | 63 % | 0.66 | -381.72 |
| Signals | signal:s2-block-stack | 53 | 7 (13 %) | 215 | 53 % | 0.44 | -515.94 |
| Signals | signal:s2-confluence | 60 | 34 (57 %) | 510 | 72 % | 1.21 | 196.72 |
| Signals | signal:s2-ema-cross | 30 | 27 (90 %) | 33 | 91 % | 9.64 | 119.65 |
| Signals | signal:s2-range-break | 49 | 38 (78 %) | 66 | 83 % | 1.61 | 75.23 |
| Signals | signal:s2-range-shift | 58 | 20 (34 %) | 203 | 53 % | 0.52 | -372.22 |
| Signals | signal:s2-rsi-revert | 20 | 7 (35 %) | 40 | 48 % | 0.46 | -72.68 |
| Signals | signal:s2-st-trail | 53 | 40 (75 %) | 97 | 80 % | 2.28 | 158.29 |
| Signals | signal:s2-stoch-swing | 60 | 43 (72 %) | 447 | 76 % | 1.84 | 583.70 |
| Signals | signal:s2-vol-break | 52 | 31 (60 %) | 106 | 74 % | 1.13 | 30.77 |
| Signals | signal:s2-vwap-axis | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 77.22 |
| Signals | signal:sar | 60 | 18 (30 %) | 476 | 65 % | 0.76 | -319.66 |
| Signals | signal:squeeze | 46 | 10 (22 %) | 88 | 52 % | 0.40 | -247.77 |
| Signals | signal:st-slow | 53 | 29 (55 %) | 107 | 72 % | 1.32 | 69.51 |
| Signals | signal:stoch-rsi | 58 | 14 (24 %) | 466 | 58 % | 0.57 | -600.37 |
| Signals | signal:supertrend | 60 | 52 (87 %) | 237 | 80 % | 1.77 | 283.59 |
| Signals | signal:swing | 53 | 4 (8 %) | 425 | 52 % | 0.36 | -1065.10 |
| Signals | signal:thrust | 58 | 3 (5 %) | 404 | 49 % | 0.29 | -1226.37 |
| Signals | signal:trix | 60 | 38 (63 %) | 267 | 77 % | 1.47 | 258.66 |
| Signals | signal:volume-break | 50 | 47 (94 %) | 50 | 94 % | 10.49 | 163.57 |
| Signals | signal:vwap | 59 | 39 (66 %) | 324 | 77 % | 1.47 | 271.10 |
| Signals | signal:williams-r | 60 | 15 (25 %) | 404 | 61 % | 0.72 | -355.76 |
| Signals | signal:zscore | 60 | 1 (2 %) | 268 | 50 % | 0.40 | -752.46 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1132 | 400 (35 %) | 6418 | 65 % | 0.68 | -6487.58 |
| Signals | 1.25 | 710 | 243 (34 %) | 4195 | 66 % | 0.68 | -4411.22 |
| Signals | 1.35 | 509 | 167 (33 %) | 3074 | 67 % | 0.67 | -3312.21 |
| Signals | 1.5 | 300 | 94 (31 %) | 1793 | 66 % | 0.63 | -2215.36 |
| Signals | 1.75 | 152 | 43 (28 %) | 931 | 67 % | 0.59 | -1315.36 |
| Signals | 2 | 76 | 25 (33 %) | 479 | 70 % | 0.69 | -445.84 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 200 | 87 % | 3.83 | 463.20 | tp5 sl15 tr3 h48 (6 · ∞ (no loss) · 25.17) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 114 | 97 % | 28.25 | 377.43 | tp3 sl9 tr1.8 h48 (6 · ∞ (no loss) · 11.55) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 26 (87 %) | 224 | 83 % | 2.28 | 372.05 | tp4 sl6 tr0 h48 (9 · 4.90 · 24.20) |
| Signals | follow | sig-obv-m@m15 | 30 | 28 (93 %) | 160 | 85 % | 3.71 | 341.52 | tp5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 92 | 92 % | 10.43 | 298.60 | tp3 sl9 tr1.8 h48 (5 · ∞ (no loss) · 8.84) |
| Signals | follow | sig-trix-s@m15 | 30 | 24 (80 %) | 125 | 80 % | 2.82 | 257.00 | tp4 sl12 tr2.4 h48 (5 · 465.33 · 15.17) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 24 (80 %) | 242 | 79 % | 1.60 | 246.79 | tp6 sl18 tr4.8 h48 (5 · ∞ (no loss) · 23.82) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 25 (83 %) | 98 | 81 % | 3.50 | 241.15 | tp4 sl6 tr0 h48 (6 · 0.61 · -7.20) |
| Signals | follow | sig-vwap-s@m15 | 30 | 24 (80 %) | 228 | 78 % | 1.59 | 227.78 | tp6 sl18 tr3.6 h48 (5 · ∞ (no loss) · 18.29) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 30 (100 %) | 65 | 92 % | 7.85 | 179.74 | – |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 50 | 92 % | 10.55 | 170.00 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 43 | 100 % | ∞ (no loss) | 154.62 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 29 (97 %) | 46 | 93 % | 11.16 | 140.77 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 15 (50 %) | 269 | 72 % | 1.26 | 133.40 | tp5 sl15 tr3 h48 (9 · 193.07 · 29.46) |
| Signals | follow | sig-s2-range-break-s@m15 | 25 | 25 (100 %) | 31 | 100 % | ∞ (no loss) | 129.30 | – |
| Signals | follow | sig-supertrend-s@m15 | 30 | 22 (73 %) | 194 | 75 % | 1.35 | 128.96 | tp6 sl18 tr3.6 h48 (6 · 51.68 · 13.43) |
| Signals | follow | sig-keltner-s@m15 | 30 | 21 (70 %) | 83 | 73 % | 2.02 | 122.23 | tp3 sl9 tr1.8 h48 (5 · 25.65 · 5.96) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 15 (50 %) | 247 | 68 % | 1.23 | 120.50 | tp5 sl15 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 18 (60 %) | 162 | 70 % | 1.35 | 119.98 | tp5 sl10 tr0 h48 (5 · 1.88 · 9.00) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 27 (90 %) | 33 | 91 % | 9.64 | 119.65 | – |
| Signals | follow | sig-ichimoku-m@m15 | 27 | 25 (93 %) | 31 | 87 % | 8.65 | 97.37 | – |
| Signals | follow | sig-hma-m@m15 | 30 | 18 (60 %) | 241 | 71 % | 1.17 | 84.18 | tp5 sl15 tr3 h48 (8 · ∞ (no loss) · 21.43) |
| Signals | follow | sig-r-vol-regime-m@m15 | 20 | 16 (80 %) | 24 | 83 % | 5.04 | 80.95 | – |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 18 (60 %) | 299 | 75 % | 1.13 | 77.93 | tp2.5 sl5 tr0 h48 (24 · 1.68 · 17.70) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 77.22 | – |
| Signals | follow | sig-ema-slope-m@m15 | 28 | 14 (50 %) | 91 | 77 % | 1.37 | 64.30 | tp3 sl4.5 tr0 h48 (5 · 0.89 · -1.00) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 19 (63 %) | 241 | 72 % | 1.14 | 63.31 | tp5 sl15 tr3 h48 (7 · 115.69 · 17.59) |
| Signals | follow | sig-adx-m@m15 | 30 | 14 (47 %) | 83 | 73 % | 1.32 | 59.85 | tp3 sl9 tr1.8 h48 (5 · 0.39 · -5.60) |
| Signals | follow | sig-s2-vol-break-m@m15 | 22 | 19 (86 %) | 27 | 89 % | 4.46 | 59.67 | – |
| Signals | follow | sig-keltner-m@m15 | 30 | 16 (53 %) | 66 | 74 % | 1.36 | 54.05 | – |
| Signals | follow | sig-st-slow-m@m15 | 30 | 18 (60 %) | 56 | 75 % | 1.49 | 51.99 | – |
| Signals | follow | sig-vwap-m@m15 | 29 | 15 (52 %) | 96 | 73 % | 1.23 | 43.32 | tp3 sl4.5 tr0 h48 (6 · 2.98 · 9.30) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 17 (57 %) | 129 | 70 % | 1.14 | 37.69 | tp4 sl8 tr0 h48 (5 · 1.85 · 7.00) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 14 (47 %) | 207 | 69 % | 1.07 | 37.68 | tp5 sl15 tr3 h48 (5 · ∞ (no loss) · 20.03) |
| Signals | follow | sig-mfi-m@m15 | 13 | 13 (100 %) | 21 | 95 % | 10.18 | 36.25 | – |
| Signals | follow | sig-rsi-momentum-s@m15 | 20 | 17 (85 %) | 20 | 85 % | 2.75 | 30.07 | – |
| Signals | follow | sig-volume-break-s@m15 | 20 | 17 (85 %) | 20 | 85 % | 2.75 | 30.07 | – |
| Signals | follow | sig-r-connors-s@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 27.50 | – |
| Signals | follow | sig-act-hf-s@m15 | 30 | 14 (47 %) | 215 | 67 % | 1.04 | 20.98 | tp5 sl7.5 tr0 h48 (7 · 1.56 · 8.60) |
| Signals | follow | sig-st-slow-s@m15 | 23 | 11 (48 %) | 51 | 69 % | 1.16 | 17.52 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 23 | 11 (48 %) | 51 | 69 % | 1.16 | 17.52 | – |
| Signals | follow | sig-act-burst-m@m15 | 26 | 16 (62 %) | 75 | 75 % | 1.04 | 6.58 | – |
| Signals | follow | sig-trix-m@m15 | 30 | 14 (47 %) | 142 | 74 % | 1.00 | 1.66 | tp4 sl8 tr0 h48 (5 · 1.85 · 7.00) |
| Signals | follow | sig-obv-s@m15 | 30 | 15 (50 %) | 282 | 69 % | 0.99 | -3.49 | tp4 sl12 tr2.4 h48 (9 · 2.24 · 15.13) |
| Signals | follow | sig-kama-m@m15 | 30 | 13 (43 %) | 267 | 70 % | 0.98 | -13.41 | tp8 sl24 tr4.8 h48 (5 · ∞ (no loss) · 24.11) |
| Signals | follow | sig-cci-m@m15 | 30 | 13 (43 %) | 148 | 68 % | 0.94 | -27.80 | tp4 sl8 tr0 h48 (5 · 1.85 · 7.00) |
| Signals | follow | sig-s2-vol-break-s@m15 | 30 | 12 (40 %) | 79 | 68 % | 0.87 | -28.90 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 9 (30 %) | 301 | 69 % | 0.94 | -42.54 | tp6 sl18 tr4.8 h48 (5 · ∞ (no loss) · 23.29) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 27 | 9 (33 %) | 97 | 69 % | 0.83 | -43.51 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-atr-break-m@m15 | 24 | 13 (54 %) | 58 | 69 % | 0.67 | -48.86 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 24 | 13 (54 %) | 35 | 69 % | 0.56 | -54.07 | – |
| Signals | follow | sig-donchian-m@m15 | 13 | 4 (31 %) | 30 | 47 % | 0.39 | -58.00 | tp2.5 sl5 tr0 h48 (5 · 0.29 · -11.00) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 20 | 7 (35 %) | 40 | 48 % | 0.46 | -72.68 | tp2.5 sl3.75 tr0 h48 (5 · 0.15 · -13.50) |
| Signals | follow | sig-donchian-s@m15 | 25 | 10 (40 %) | 115 | 62 % | 0.77 | -72.85 | tp4 sl12 tr2.4 h48 (5 · 1.25 · 3.00) |
| Signals | follow | sig-r-inside-s@m15 | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -76.75 | – |
| Signals | follow | sig-macd-slow-m@m15 | 27 | 8 (30 %) | 132 | 70 % | 0.79 | -77.50 | tp4 sl6 tr0 h48 (6 · 3.06 · 12.80) |
| Signals | follow | sig-squeeze-m@m15 | 16 | 6 (38 %) | 16 | 38 % | 0.08 | -87.57 | – |
| Signals | follow | sig-sar-s@m15 | 30 | 11 (37 %) | 227 | 66 % | 0.84 | -89.22 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 9 (30 %) | 209 | 65 % | 0.83 | -97.21 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 29 | 15 (52 %) | 246 | 65 % | 0.83 | -102.15 | tp2.5 sl7.5 tr0 h48 (14 · 1.79 · 12.20) |
| Signals | follow | sig-s2-range-shift-s@m15 | 28 | 16 (57 %) | 84 | 48 % | 0.56 | -114.83 | tp2.5 sl3.75 tr0 h48 (11 · 0.49 · -12.20) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 11 (37 %) | 128 | 64 % | 0.70 | -115.81 | tp3 sl9 tr0 h48 (5 · 1.22 · 2.00) |
| Signals | follow | sig-r-fractal-m@m15 | 12 | 0 (0 %) | 18 | 11 % | 0.04 | -116.44 | – |
| Signals | follow | sig-williams-r-s@m15 | 30 | 12 (40 %) | 150 | 57 % | 0.72 | -122.14 | tp4 sl12 tr2.4 h48 (6 · 1.03 · 0.31) |
| Signals | follow | sig-ema-pullback-s@m15 | 28 | 10 (36 %) | 198 | 65 % | 0.71 | -141.98 | tp4 sl12 tr3.2 h48 (6 · 1.00 · 0.05) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 9 (30 %) | 198 | 64 % | 0.71 | -152.19 | tp2.5 sl5 tr0 h48 (18 · 1.15 · 3.90) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 4 (13 %) | 72 | 56 % | 0.50 | -160.20 | – |
| Signals | follow | sig-rsi-mid-s@m15 | 27 | 6 (22 %) | 139 | 62 % | 0.59 | -168.07 | tp2.5 sl7.5 tr0 h48 (9 · 1.05 · 0.70) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 2 (7 %) | 106 | 57 % | 0.61 | -172.45 | tp4 sl6 tr0 h48 (5 · 0.41 · -11.00) |
| Signals | follow | sig-s2-active-hf-m@m15 | 29 | 7 (24 %) | 223 | 61 % | 0.72 | -186.45 | tp3 sl6 tr0 h48 (14 · 1.13 · 3.20) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 8 (27 %) | 157 | 61 % | 0.61 | -193.01 | tp4 sl12 tr0 h48 (5 · 1.25 · 3.00) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 9 (30 %) | 208 | 62 % | 0.69 | -207.36 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-s2-active-hf-s@m15 | 29 | 7 (24 %) | 223 | 60 % | 0.69 | -211.70 | tp3 sl6 tr0 h48 (14 · 1.13 · 3.20) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 6 (20 %) | 170 | 59 % | 0.63 | -216.19 | tp3 sl6 tr0 h48 (8 · 1.35 · 4.40) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 4 (13 %) | 272 | 63 % | 0.73 | -222.18 | tp5 sl7.5 tr0 h48 (8 · 1.04 · 0.90) |
| Signals | follow | sig-macd-cross-m@m15 | 24 | 1 (4 %) | 130 | 58 % | 0.48 | -223.05 | tp4 sl8 tr0 h48 (6 · 0.93 · -1.20) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 8 (27 %) | 206 | 64 % | 0.63 | -224.34 | tp2.5 sl7.5 tr0 h48 (9 · 1.05 · 0.70) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 5 (17 %) | 213 | 62 % | 0.62 | -229.53 | tp3 sl6 tr0 h48 (10 · 1.81 · 10.00) |
| Signals | follow | sig-sar-m@m15 | 30 | 7 (23 %) | 249 | 65 % | 0.69 | -230.44 | tp2.5 sl3.75 tr0 h48 (20 · 1.08 · 2.25) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 3 (10 %) | 254 | 63 % | 0.73 | -233.63 | tp6 sl18 tr0 h48 (5 · 1.27 · 5.00) |
| Signals | follow | sig-r-fractal-s@m15 | 22 | 1 (5 %) | 64 | 36 % | 0.20 | -237.09 | tp2.5 sl3.75 tr0 h48 (7 · 0.44 · -8.90) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 7 (23 %) | 123 | 57 % | 0.48 | -241.83 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 4 (13 %) | 119 | 57 % | 0.51 | -257.39 | tp3 sl4.5 tr0 h48 (6 · 1.19 · 1.80) |
| Signals | follow | sig-stoch-rsi-m@m15 | 28 | 6 (21 %) | 213 | 59 % | 0.58 | -260.46 | tp5 sl15 tr3 h48 (5 · ∞ (no loss) · 11.37) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 7 (23 %) | 235 | 57 % | 0.60 | -274.14 | tp4 sl12 tr0 h48 (6 · 0.62 · -9.20) |
| Signals | follow | sig-r-connors-m@m15 | 25 | 5 (20 %) | 108 | 52 % | 0.37 | -282.66 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 3 (10 %) | 150 | 53 % | 0.50 | -286.92 | tp4 sl12 tr2.4 h48 (7 · 0.62 · -9.40) |
| Signals | follow | sig-kama-s@m15 | 30 | 7 (23 %) | 261 | 58 % | 0.62 | -297.96 | tp5 sl15 tr3 h48 (6 · 1.03 · 0.40) |
| Signals | follow | sig-macd-cross-s@m15 | 26 | 5 (19 %) | 191 | 58 % | 0.53 | -298.98 | tp4 sl8 tr0 h48 (8 · 1.39 · 6.40) |
| Signals | follow | sig-macd-hist-s@m15 | 26 | 5 (19 %) | 191 | 58 % | 0.53 | -298.98 | tp4 sl8 tr0 h48 (8 · 1.39 · 6.40) |
| Signals | follow | sig-s2-block-stack-m@m15 | 23 | 1 (4 %) | 45 | 27 % | 0.09 | -299.75 | – |
| Signals | follow | sig-swing-s@m15 | 23 | 4 (17 %) | 157 | 56 % | 0.45 | -301.07 | tp2.5 sl3.75 tr0 h48 (14 · 1.05 · 0.95) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 7 (23 %) | 137 | 50 % | 0.39 | -301.82 | tp4 sl12 tr2.4 h48 (5 · 45.18 · 8.84) |
| Signals | follow | sig-adx-s@m15 | 30 | 8 (27 %) | 244 | 59 % | 0.64 | -304.28 | tp6 sl18 tr3.6 h48 (6 · ∞ (no loss) · 23.91) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 67 | 40 % | 0.23 | -324.20 | – |
| Signals | follow | sig-r-nr-break-s@m15 | 22 | 3 (14 %) | 78 | 32 % | 0.19 | -336.17 | tp2.5 sl3.75 tr0 h48 (8 · 0.58 · -6.60) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 8 (27 %) | 253 | 58 % | 0.56 | -339.91 | tp5 sl15 tr3 h48 (5 · 1.06 · 0.32) |
| Signals | follow | sig-r-nr-break-m@m15 | 26 | 1 (4 %) | 133 | 47 % | 0.36 | -343.49 | tp5 sl7.5 tr0 h48 (6 · 0.62 · -8.70) |
| Signals | follow | sig-s2-atr-break-m@m15 | 28 | 3 (11 %) | 151 | 55 % | 0.39 | -347.22 | tp3 sl6 tr0 h48 (10 · 1.05 · 1.00) |
| Signals | follow | sig-r-awesome-s@m15 | 24 | 2 (8 %) | 86 | 34 % | 0.18 | -352.38 | tp3 sl9 tr1.8 h48 (6 · 0.30 · -13.05) |
| Signals | follow | sig-impulse-s@m15 | 26 | 3 (12 %) | 188 | 55 % | 0.47 | -356.25 | tp2.5 sl7.5 tr0 h48 (11 · 0.80 · -4.70) |
| Signals | follow | sig-cmf-s@m15 | 24 | 3 (13 %) | 127 | 50 % | 0.33 | -358.77 | tp3 sl9 tr1.8 h48 (11 · 0.83 · -3.21) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 8 (27 %) | 156 | 51 % | 0.39 | -363.10 | tp4 sl12 tr2.4 h48 (6 · 0.57 · -5.23) |
| Signals | follow | sig-thrust-m@m15 | 28 | 3 (11 %) | 233 | 61 % | 0.49 | -365.95 | tp2.5 sl7.5 tr0 h48 (14 · 1.10 · 2.20) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 4 (13 %) | 215 | 58 % | 0.53 | -388.89 | tp4 sl12 tr2.4 h48 (8 · 1.38 · 4.64) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 0 (0 %) | 208 | 56 % | 0.50 | -403.22 | tp5 sl15 tr3 h48 (5 · 0.98 · -0.33) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 1 (3 %) | 201 | 54 % | 0.49 | -428.26 | tp4 sl12 tr0 h48 (6 · 0.62 · -9.20) |
| Signals | follow | sig-zscore-s@m15 | 30 | 1 (3 %) | 201 | 54 % | 0.49 | -428.26 | tp4 sl12 tr0 h48 (6 · 0.62 · -9.20) |
| Signals | follow | sig-hma-s@m15 | 30 | 3 (10 %) | 163 | 47 % | 0.33 | -475.11 | tp3 sl6 tr0 h48 (11 · 0.79 · -5.20) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 4 (13 %) | 216 | 49 % | 0.41 | -518.22 | tp4 sl12 tr0 h48 (6 · 0.74 · -5.42) |
| Signals | follow | sig-heikin-ashi-m@m15 | 23 | 0 (0 %) | 191 | 48 % | 0.33 | -521.67 | tp3 sl6 tr0 h48 (15 · 0.68 · -12.00) |
| Signals | follow | sig-cci-s@m15 | 30 | 0 (0 %) | 295 | 59 % | 0.50 | -531.42 | tp4 sl6 tr0 h48 (13 · 0.72 · -10.60) |
| Signals | follow | sig-ema-trend-s@m15 | 27 | 4 (15 %) | 197 | 51 % | 0.32 | -562.47 | tp3 sl6 tr0 h48 (10 · 0.68 · -8.00) |
| Signals | follow | sig-impulse-m@m15 | 27 | 0 (0 %) | 134 | 34 % | 0.20 | -574.00 | tp3 sl9 tr1.8 h48 (9 · 0.31 · -19.29) |
| Signals | follow | sig-cmf-m@m15 | 28 | 2 (7 %) | 138 | 33 % | 0.18 | -574.99 | tp5 sl7.5 tr0 h48 (5 · 0.42 · -13.50) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 268 | 50 % | 0.32 | -764.02 | tp5 sl15 tr4 h48 (5 · 0.39 · -9.32) |
| Signals | follow | sig-thrust-s@m15 | 30 | 0 (0 %) | 171 | 31 % | 0.15 | -860.41 | tp2.5 sl3.75 tr0 h48 (13 · 0.35 · -20.40) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 1.00× | 75 | 67 (89 %) | 118 | 93 % | 5.47 | 683.51 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 90 | 77 (86 %) | 177 | 90 % | 3.41 | 631.94 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 77 | 64 (83 %) | 136 | 88 % | 3.03 | 556.75 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 107 | 84 (79 %) | 309 | 89 % | 2.03 | 464.72 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 96 | 67 (70 %) | 223 | 84 % | 1.92 | 449.14 |
| Signals | tp 6.000% | sl 3.00× | tr off | 88 | 62 (70 %) | 192 | 84 % | 1.83 | 417.96 |
| Signals | tp 6.000% | sl 3.00× | tr 1.00× | 88 | 62 (70 %) | 192 | 84 % | 1.83 | 417.96 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 115 | 62 (54 %) | 466 | 79 % | 0.86 | -178.21 |
| Signals | tp 5.000% | sl 3.00× | tr off | 108 | 47 (44 %) | 335 | 70 % | 0.75 | -370.26 |
| Signals | tp 5.000% | sl 3.00× | tr 1.00× | 108 | 47 (44 %) | 335 | 70 % | 0.75 | -370.26 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 112 | 42 (38 %) | 392 | 70 % | 0.72 | -426.90 |
| Signals | tp 6.000% | sl 2.00× | tr off | 99 | 29 (29 %) | 279 | 58 % | 0.65 | -502.04 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 115 | 44 (38 %) | 646 | 72 % | 0.66 | -580.07 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 113 | 41 (36 %) | 535 | 71 % | 0.66 | -597.80 |
| Signals | tp 4.000% | sl 1.50× | tr off | 115 | 39 (34 %) | 772 | 53 % | 0.69 | -704.40 |
| Signals | tp 3.000% | sl 2.00× | tr off | 118 | 38 (32 %) | 925 | 60 % | 0.67 | -750.59 |
| Signals | tp 4.000% | sl 3.00× | tr off | 110 | 32 (29 %) | 490 | 66 % | 0.60 | -798.93 |
| Signals | tp 4.000% | sl 3.00× | tr 1.00× | 110 | 32 (29 %) | 490 | 66 % | 0.60 | -798.93 |
| Signals | tp 2.500% | sl 3.00× | tr off | 117 | 35 (30 %) | 954 | 68 % | 0.64 | -826.69 |
| Signals | tp 5.000% | sl 2.00× | tr off | 109 | 32 (29 %) | 432 | 55 % | 0.58 | -828.26 |
| Signals | tp 4.000% | sl 2.00× | tr off | 111 | 32 (29 %) | 630 | 57 % | 0.61 | -874.61 |
| Signals | tp 6.000% | sl 1.50× | tr off | 110 | 30 (27 %) | 375 | 46 % | 0.52 | -890.24 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 34 (29 %) | 713 | 66 % | 0.59 | -898.00 |
| Signals | tp 3.000% | sl 3.00× | tr 1.00× | 117 | 34 (29 %) | 713 | 66 % | 0.59 | -898.00 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 29 (24 %) | 1240 | 60 % | 0.65 | -906.39 |
| Signals | tp 2.500% | sl 1.50× | tr off | 119 | 33 (28 %) | 1402 | 53 % | 0.65 | -926.29 |
| Signals | tp 5.000% | sl 1.50× | tr off | 113 | 31 (27 %) | 556 | 48 % | 0.57 | -948.74 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 117 | 34 (29 %) | 786 | 64 % | 0.57 | -949.80 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 117 | 33 (28 %) | 979 | 65 % | 0.55 | -999.61 |
| Signals | tp 3.000% | sl 1.50× | tr off | 119 | 28 (24 %) | 1163 | 49 % | 0.58 | -1155.19 |

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
