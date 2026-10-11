# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1354/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 351/19072 · PF 1.54 · Micro 233/5900 · PF 2.26 · Short 642/8176 · PF 1.47 · General 514/8176 · PF 1.50 · Long 570/8176 · PF 1.51 · Signals 126/126; Main 1228 pairs, 215798 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 202 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1228 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (215798 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3308); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 27028 · 0.73 | 6894 · 0.80 | 9051 · 1.00 | 1303 · 0.63 | – | – | – | – | – |
| 13:00 | 46273 · 0.41 | 8282 · 0.68 | 14932 · 0.66 | 786 · 3.35 | – | – | – | – | – |
| 14:00 | 28352 · 2.07 | 7111 · 2.13 | 9034 · 2.47 | 1875 · 6.58 | – | – | – | – | – |
| 15:00 | 36450 · 1.40 | 9237 · 1.13 | 12629 · 1.59 | 3306 · 0.74 | – | – | – | – | – |
| 16:00 | 26387 · 1.14 | 4531 · 1.07 | 8618 · 1.58 | 862 · 1.59 | – | – | – | – | – |
| 17:00 | 17521 · 1.69 | 3672 · 1.16 | 6010 · 1.43 | 1146 · 1.48 | – | – | – | – | – |
| 18:00 | 17725 · 1.93 | 2959 · 2.86 | 4487 · 2.12 | 605 · 1.56 | – | – | – | – | – |
| 19:00 | 21111 · 1.05 | 5572 · 1.61 | 6330 · 1.21 | 1042 · 1.79 | – | – | – | – | – |
| 20:00 | 40776 · 0.63 | 12349 · 0.90 | 9157 · 0.61 | 1934 · 1.44 | – | – | – | – | – |
| 21:00 | 47764 · 0.69 | 13164 · 0.96 | 14759 · 0.76 | 2247 · 1.04 | – | – | – | – | – |
| 22:00 | 47195 · 0.43 | 12131 · 0.43 | 17151 · 0.48 | 2544 · 0.16 | – | – | – | – | – |
| 23:00 | 30104 · 0.45 | 5791 · 0.46 | 8379 · 0.36 | 1285 · 0.18 | – | – | – | – | – |
| **total** | **386686 · 0.81** | **91693 · 0.90** | **120537 · 0.85** | **18935 · 0.73** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 45403 | sig:confirm 45403 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 212018 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2183 units active at the run start, 3044 over the run, 3308 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1675 | 521 (31 %) | 10540 | 58 % | 0.65 | -10995.87 |
| Signals | trailing | 1633 | 843 (52 %) | 8395 | 72 % | 0.86 | -2558.65 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 58 | 44 (76 %) | 323 | 80 % | 1.89 | 373.21 |
| Signals | signal:act-hf | 60 | 12 (20 %) | 458 | 62 % | 0.69 | -408.41 |
| Signals | signal:adx | 60 | 22 (37 %) | 333 | 61 % | 0.68 | -326.10 |
| Signals | signal:atr-break | 56 | 31 (55 %) | 294 | 68 % | 1.05 | 33.00 |
| Signals | signal:bollinger | 60 | 1 (2 %) | 324 | 55 % | 0.51 | -655.43 |
| Signals | signal:cci | 60 | 12 (20 %) | 520 | 66 % | 0.71 | -456.25 |
| Signals | signal:cmf | 55 | 7 (13 %) | 296 | 45 % | 0.25 | -939.89 |
| Signals | signal:donchian | 43 | 16 (37 %) | 195 | 64 % | 0.89 | -48.56 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 174 | 92 % | 9.12 | 471.61 |
| Signals | signal:ema-cross-fast | 60 | 54 (90 %) | 389 | 85 % | 2.51 | 606.19 |
| Signals | signal:ema-pullback | 59 | 17 (29 %) | 381 | 64 % | 0.59 | -401.69 |
| Signals | signal:ema-slope | 59 | 33 (56 %) | 262 | 76 % | 1.23 | 114.26 |
| Signals | signal:ema-trend | 58 | 13 (22 %) | 459 | 61 % | 0.53 | -644.24 |
| Signals | signal:heikin-ashi | 55 | 5 (9 %) | 513 | 57 % | 0.51 | -783.74 |
| Signals | signal:hma | 58 | 16 (28 %) | 389 | 58 % | 0.61 | -439.77 |
| Signals | signal:ichimoku | 58 | 33 (57 %) | 208 | 65 % | 0.83 | -85.14 |
| Signals | signal:impulse | 56 | 6 (11 %) | 354 | 45 % | 0.32 | -943.68 |
| Signals | signal:kama | 60 | 20 (33 %) | 618 | 65 % | 0.79 | -303.76 |
| Signals | signal:keltner | 60 | 37 (62 %) | 189 | 74 % | 1.81 | 239.23 |
| Signals | signal:macd-cross | 54 | 9 (17 %) | 354 | 60 % | 0.52 | -516.00 |
| Signals | signal:macd-hist | 58 | 23 (40 %) | 550 | 69 % | 0.82 | -227.37 |
| Signals | signal:macd-slow | 58 | 16 (28 %) | 359 | 65 % | 0.66 | -334.80 |
| Signals | signal:mfi | 17 | 17 (100 %) | 29 | 97 % | 12.16 | 44.08 |
| Signals | signal:obv | 60 | 45 (75 %) | 492 | 75 % | 1.54 | 384.91 |
| Signals | signal:r-awesome | 56 | 9 (16 %) | 320 | 48 % | 0.34 | -822.83 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 140 | 59 % | 0.43 | -293.24 |
| Signals | signal:r-fractal | 39 | 5 (13 %) | 94 | 33 % | 0.16 | -370.56 |
| Signals | signal:r-inside | 11 | 0 (0 %) | 14 | 21 % | 0.09 | -81.24 |
| Signals | signal:r-linreg | 60 | 18 (30 %) | 401 | 61 % | 0.62 | -406.58 |
| Signals | signal:r-nr-break | 51 | 6 (12 %) | 237 | 45 % | 0.33 | -649.98 |
| Signals | signal:r-session-trend | 60 | 15 (25 %) | 403 | 58 % | 0.51 | -662.53 |
| Signals | signal:r-vol-regime | 50 | 46 (92 %) | 78 | 87 % | 7.73 | 256.64 |
| Signals | signal:reclaim | 60 | 20 (33 %) | 594 | 69 % | 0.86 | -189.65 |
| Signals | signal:rsi-mid | 58 | 12 (21 %) | 333 | 53 % | 0.43 | -573.14 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:s2-active-hf | 59 | 19 (32 %) | 492 | 61 % | 0.76 | -296.83 |
| Signals | signal:s2-adx-gate | 58 | 26 (45 %) | 380 | 69 % | 0.85 | -121.37 |
| Signals | signal:s2-atr-break | 59 | 9 (15 %) | 342 | 55 % | 0.48 | -583.85 |
| Signals | signal:s2-bb-bounce | 60 | 42 (70 %) | 266 | 73 % | 1.75 | 331.35 |
| Signals | signal:s2-block-scale | 60 | 15 (25 %) | 472 | 64 % | 0.62 | -446.70 |
| Signals | signal:s2-block-stack | 54 | 7 (13 %) | 251 | 53 % | 0.45 | -545.27 |
| Signals | signal:s2-confluence | 60 | 35 (58 %) | 592 | 71 % | 1.20 | 198.90 |
| Signals | signal:s2-ema-cross | 30 | 26 (87 %) | 33 | 88 % | 9.38 | 116.77 |
| Signals | signal:s2-range-break | 51 | 39 (76 %) | 68 | 82 % | 2.02 | 99.57 |
| Signals | signal:s2-range-shift | 59 | 20 (34 %) | 221 | 53 % | 0.54 | -364.40 |
| Signals | signal:s2-rsi-revert | 23 | 10 (43 %) | 47 | 51 % | 0.58 | -56.44 |
| Signals | signal:s2-st-trail | 55 | 43 (78 %) | 104 | 81 % | 2.39 | 158.79 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 495 | 77 % | 1.86 | 587.86 |
| Signals | signal:s2-vol-break | 54 | 32 (59 %) | 113 | 74 % | 1.01 | 2.58 |
| Signals | signal:s2-vwap-axis | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 82.74 |
| Signals | signal:sar | 60 | 15 (25 %) | 526 | 66 % | 0.74 | -341.22 |
| Signals | signal:squeeze | 48 | 16 (33 %) | 92 | 58 % | 0.44 | -206.30 |
| Signals | signal:st-slow | 55 | 33 (60 %) | 113 | 73 % | 1.42 | 82.48 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 559 | 60 % | 0.57 | -592.28 |
| Signals | signal:supertrend | 60 | 50 (83 %) | 263 | 78 % | 1.72 | 265.16 |
| Signals | signal:swing | 55 | 4 (7 %) | 484 | 54 % | 0.37 | -1049.43 |
| Signals | signal:thrust | 59 | 4 (7 %) | 445 | 51 % | 0.30 | -1171.33 |
| Signals | signal:trix | 60 | 26 (43 %) | 252 | 73 % | 1.22 | 118.84 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 32 (53 %) | 411 | 73 % | 1.24 | 178.52 |
| Signals | signal:williams-r | 60 | 14 (23 %) | 451 | 62 % | 0.73 | -356.74 |
| Signals | signal:zscore | 60 | 0 (0 %) | 283 | 51 % | 0.39 | -788.58 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 75768 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75768 | 0 |  |
| Short | 39456 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39456 | 0 |  |
| General | 13080 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13080 | 0 |  |
| Long | 18630 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18630 | 0 |  |
| Wide | 65084 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 65084 | 0 |  |
| Signals | 3780 | – | 2183 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2183 units (pair × symbol × direction) active at the run start, 3044 over the run; 3308 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1394 (74 %) | 21405 | 79 % | 1.75 | 23137.12 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 58 | 44 (76 %) | 323 | 80 % | 1.89 | 373.21 |
| Signals | signal:act-hf | 60 | 12 (20 %) | 458 | 62 % | 0.69 | -408.41 |
| Signals | signal:adx | 60 | 22 (37 %) | 333 | 61 % | 0.68 | -326.10 |
| Signals | signal:atr-break | 56 | 31 (55 %) | 294 | 68 % | 1.05 | 33.00 |
| Signals | signal:bollinger | 60 | 1 (2 %) | 324 | 55 % | 0.51 | -655.43 |
| Signals | signal:cci | 60 | 12 (20 %) | 520 | 66 % | 0.71 | -456.25 |
| Signals | signal:cmf | 55 | 7 (13 %) | 296 | 45 % | 0.25 | -939.89 |
| Signals | signal:donchian | 43 | 16 (37 %) | 195 | 64 % | 0.89 | -48.56 |
| Signals | signal:ema-cross | 60 | 57 (95 %) | 174 | 92 % | 9.12 | 471.61 |
| Signals | signal:ema-cross-fast | 60 | 54 (90 %) | 389 | 85 % | 2.51 | 606.19 |
| Signals | signal:ema-pullback | 59 | 17 (29 %) | 381 | 64 % | 0.59 | -401.69 |
| Signals | signal:ema-slope | 59 | 33 (56 %) | 262 | 76 % | 1.23 | 114.26 |
| Signals | signal:ema-trend | 58 | 13 (22 %) | 459 | 61 % | 0.53 | -644.24 |
| Signals | signal:heikin-ashi | 55 | 5 (9 %) | 513 | 57 % | 0.51 | -783.74 |
| Signals | signal:hma | 58 | 16 (28 %) | 389 | 58 % | 0.61 | -439.77 |
| Signals | signal:ichimoku | 58 | 33 (57 %) | 208 | 65 % | 0.83 | -85.14 |
| Signals | signal:impulse | 56 | 6 (11 %) | 354 | 45 % | 0.32 | -943.68 |
| Signals | signal:kama | 60 | 20 (33 %) | 618 | 65 % | 0.79 | -303.76 |
| Signals | signal:keltner | 60 | 37 (62 %) | 189 | 74 % | 1.81 | 239.23 |
| Signals | signal:macd-cross | 54 | 9 (17 %) | 354 | 60 % | 0.52 | -516.00 |
| Signals | signal:macd-hist | 58 | 23 (40 %) | 550 | 69 % | 0.82 | -227.37 |
| Signals | signal:macd-slow | 58 | 16 (28 %) | 359 | 65 % | 0.66 | -334.80 |
| Signals | signal:mfi | 17 | 17 (100 %) | 29 | 97 % | 12.16 | 44.08 |
| Signals | signal:obv | 60 | 45 (75 %) | 492 | 75 % | 1.54 | 384.91 |
| Signals | signal:r-awesome | 56 | 9 (16 %) | 320 | 48 % | 0.34 | -822.83 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 140 | 59 % | 0.43 | -293.24 |
| Signals | signal:r-fractal | 39 | 5 (13 %) | 94 | 33 % | 0.16 | -370.56 |
| Signals | signal:r-inside | 11 | 0 (0 %) | 14 | 21 % | 0.09 | -81.24 |
| Signals | signal:r-linreg | 60 | 18 (30 %) | 401 | 61 % | 0.62 | -406.58 |
| Signals | signal:r-nr-break | 51 | 6 (12 %) | 237 | 45 % | 0.33 | -649.98 |
| Signals | signal:r-session-trend | 60 | 15 (25 %) | 403 | 58 % | 0.51 | -662.53 |
| Signals | signal:r-vol-regime | 50 | 46 (92 %) | 78 | 87 % | 7.73 | 256.64 |
| Signals | signal:reclaim | 60 | 20 (33 %) | 594 | 69 % | 0.86 | -189.65 |
| Signals | signal:rsi-mid | 58 | 12 (21 %) | 333 | 53 % | 0.43 | -573.14 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:s2-active-hf | 59 | 19 (32 %) | 492 | 61 % | 0.76 | -296.83 |
| Signals | signal:s2-adx-gate | 58 | 26 (45 %) | 380 | 69 % | 0.85 | -121.37 |
| Signals | signal:s2-atr-break | 59 | 9 (15 %) | 342 | 55 % | 0.48 | -583.85 |
| Signals | signal:s2-bb-bounce | 60 | 42 (70 %) | 266 | 73 % | 1.75 | 331.35 |
| Signals | signal:s2-block-scale | 60 | 15 (25 %) | 472 | 64 % | 0.62 | -446.70 |
| Signals | signal:s2-block-stack | 54 | 7 (13 %) | 251 | 53 % | 0.45 | -545.27 |
| Signals | signal:s2-confluence | 60 | 35 (58 %) | 592 | 71 % | 1.20 | 198.90 |
| Signals | signal:s2-ema-cross | 30 | 26 (87 %) | 33 | 88 % | 9.38 | 116.77 |
| Signals | signal:s2-range-break | 51 | 39 (76 %) | 68 | 82 % | 2.02 | 99.57 |
| Signals | signal:s2-range-shift | 59 | 20 (34 %) | 221 | 53 % | 0.54 | -364.40 |
| Signals | signal:s2-rsi-revert | 23 | 10 (43 %) | 47 | 51 % | 0.58 | -56.44 |
| Signals | signal:s2-st-trail | 55 | 43 (78 %) | 104 | 81 % | 2.39 | 158.79 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 495 | 77 % | 1.86 | 587.86 |
| Signals | signal:s2-vol-break | 54 | 32 (59 %) | 113 | 74 % | 1.01 | 2.58 |
| Signals | signal:s2-vwap-axis | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 82.74 |
| Signals | signal:sar | 60 | 15 (25 %) | 526 | 66 % | 0.74 | -341.22 |
| Signals | signal:squeeze | 48 | 16 (33 %) | 92 | 58 % | 0.44 | -206.30 |
| Signals | signal:st-slow | 55 | 33 (60 %) | 113 | 73 % | 1.42 | 82.48 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 559 | 60 % | 0.57 | -592.28 |
| Signals | signal:supertrend | 60 | 50 (83 %) | 263 | 78 % | 1.72 | 265.16 |
| Signals | signal:swing | 55 | 4 (7 %) | 484 | 54 % | 0.37 | -1049.43 |
| Signals | signal:thrust | 59 | 4 (7 %) | 445 | 51 % | 0.30 | -1171.33 |
| Signals | signal:trix | 60 | 26 (43 %) | 252 | 73 % | 1.22 | 118.84 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 32 (53 %) | 411 | 73 % | 1.24 | 178.52 |
| Signals | signal:williams-r | 60 | 14 (23 %) | 451 | 62 % | 0.73 | -356.74 |
| Signals | signal:zscore | 60 | 0 (0 %) | 283 | 51 % | 0.39 | -788.58 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1154 | 418 (36 %) | 7346 | 66 % | 0.70 | -6049.13 |
| Signals | 1.25 | 728 | 260 (36 %) | 4812 | 67 % | 0.70 | -3971.63 |
| Signals | 1.35 | 541 | 191 (35 %) | 3655 | 68 % | 0.71 | -2891.83 |
| Signals | 1.5 | 334 | 116 (35 %) | 2328 | 69 % | 0.70 | -1843.40 |
| Signals | 1.75 | 165 | 57 (35 %) | 1180 | 70 % | 0.70 | -926.65 |
| Signals | 2 | 94 | 33 (35 %) | 708 | 72 % | 0.76 | -396.12 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 224 | 87 % | 3.80 | 460.37 | tp5 sl15 tr3 h48 (6 · ∞ (no loss) · 25.17) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 124 | 97 % | 27.39 | 367.71 | tp4 sl12 tr1.6 h48 (6 · ∞ (no loss) · 14.35) |
| Signals | follow | sig-obv-m@m15 | 30 | 28 (93 %) | 176 | 84 % | 3.68 | 339.85 | tp5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 24 (80 %) | 238 | 82 % | 2.13 | 334.61 | tp4 sl6 tr0 h48 (9 · 4.90 · 24.20) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 102 | 91 % | 10.01 | 286.69 | tp4 sl12 tr1.6 h48 (5 · ∞ (no loss) · 11.84) |
| Signals | follow | sig-trix-s@m15 | 30 | 24 (80 %) | 137 | 77 % | 2.97 | 261.89 | tp4 sl12 tr2.4 h48 (5 · 465.33 · 15.17) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 25 (83 %) | 101 | 79 % | 3.37 | 238.98 | tp4 sl6 tr0 h48 (6 · 0.61 · -7.20) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 24 (80 %) | 265 | 79 % | 1.62 | 238.49 | tp8 sl24 tr3.2 h48 (7 · ∞ (no loss) · 26.77) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 30 (100 %) | 72 | 93 % | 8.04 | 184.92 | – |
| Signals | follow | sig-keltner-s@m15 | 30 | 21 (70 %) | 121 | 74 % | 2.23 | 179.16 | tp3 sl9 tr1.8 h48 (6 · 37.22 · 8.76) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 54 | 89 % | 10.70 | 175.69 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 17 (57 %) | 308 | 72 % | 1.34 | 171.10 | tp5 sl15 tr3 h48 (9 · 193.07 · 29.46) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 48 | 100 % | ∞ (no loss) | 149.73 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 29 (97 %) | 51 | 94 % | 10.81 | 135.88 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 | – |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 16 (53 %) | 271 | 69 % | 1.25 | 127.49 | tp6 sl18 tr2.4 h48 (7 · 172.75 · 26.08) |
| Signals | follow | sig-s2-range-break-s@m15 | 25 | 24 (96 %) | 31 | 97 % | 217.47 | 125.92 | – |
| Signals | follow | sig-vwap-s@m15 | 30 | 15 (50 %) | 298 | 73 % | 1.21 | 118.05 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 26 (87 %) | 33 | 88 % | 9.38 | 116.77 | – |
| Signals | follow | sig-supertrend-s@m15 | 30 | 20 (67 %) | 215 | 73 % | 1.31 | 115.43 | tp8 sl24 tr3.2 h48 (6 · ∞ (no loss) · 19.03) |
| Signals | follow | sig-ichimoku-m@m15 | 28 | 26 (93 %) | 35 | 86 % | 8.76 | 100.72 | – |
| Signals | follow | sig-hma-m@m15 | 30 | 16 (53 %) | 237 | 69 % | 1.24 | 100.11 | tp8 sl24 tr3.2 h48 (6 · ∞ (no loss) · 20.94) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 17 (57 %) | 165 | 70 % | 1.27 | 92.37 | tp5 sl15 tr2 h48 (5 · ∞ (no loss) · 12.95) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 82.74 | – |
| Signals | follow | sig-r-vol-regime-m@m15 | 20 | 16 (80 %) | 24 | 83 % | 5.04 | 80.95 | – |
| Signals | follow | sig-adx-m@m15 | 30 | 14 (47 %) | 99 | 74 % | 1.33 | 64.39 | tp5 sl15 tr2 h48 (5 · 70.06 · 9.79) |
| Signals | follow | sig-ema-slope-m@m15 | 29 | 16 (55 %) | 95 | 80 % | 1.36 | 63.29 | tp2.5 sl3.75 tr0 h48 (5 · 0.87 · -1.00) |
| Signals | follow | sig-vwap-m@m15 | 30 | 17 (57 %) | 113 | 74 % | 1.34 | 60.46 | tp3 sl4.5 tr0 h48 (6 · 2.98 · 9.30) |
| Signals | follow | sig-keltner-m@m15 | 30 | 16 (53 %) | 68 | 75 % | 1.40 | 60.08 | – |
| Signals | follow | sig-st-slow-m@m15 | 30 | 19 (63 %) | 60 | 77 % | 1.61 | 59.57 | – |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 16 (53 %) | 345 | 74 % | 1.09 | 57.20 | tp2.5 sl5 tr0 h48 (24 · 1.68 · 17.70) |
| Signals | follow | sig-s2-vol-break-m@m15 | 24 | 21 (88 %) | 29 | 90 % | 4.22 | 55.45 | – |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 17 (57 %) | 167 | 74 % | 1.16 | 50.97 | tp5 sl15 tr2 h48 (7 · ∞ (no loss) · 11.23) |
| Signals | follow | sig-obv-s@m15 | 30 | 17 (57 %) | 316 | 71 % | 1.08 | 45.06 | tp6 sl18 tr2.4 h48 (8 · ∞ (no loss) · 21.14) |
| Signals | follow | sig-mfi-m@m15 | 17 | 17 (100 %) | 29 | 97 % | 12.16 | 44.08 | – |
| Signals | follow | sig-act-burst-m@m15 | 28 | 20 (71 %) | 85 | 74 % | 1.31 | 38.60 | tp3 sl9 tr1.2 h48 (5 · 6.85 · 4.78) |
| Signals | follow | sig-rsi-momentum-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-volume-break-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-atr-break-s@m15 | 30 | 14 (47 %) | 218 | 67 % | 1.07 | 33.43 | tp5 sl15 tr3 h48 (5 · ∞ (no loss) · 20.03) |
| Signals | follow | sig-r-connors-s@m15 | 13 | 13 (100 %) | 14 | 100 % | ∞ (no loss) | 33.34 | – |
| Signals | follow | sig-reclaim-s@m15 | 30 | 12 (40 %) | 366 | 72 % | 1.04 | 30.40 | tp6 sl18 tr4.8 h48 (6 · ∞ (no loss) · 23.84) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 18 (60 %) | 284 | 69 % | 1.06 | 27.80 | tp5 sl15 tr3 h48 (7 · 115.69 · 17.59) |
| Signals | follow | sig-st-slow-s@m15 | 25 | 14 (56 %) | 53 | 68 % | 1.23 | 22.91 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 25 | 14 (56 %) | 53 | 68 % | 1.23 | 22.91 | – |
| Signals | follow | sig-donchian-s@m15 | 30 | 13 (43 %) | 164 | 68 % | 1.04 | 12.87 | tp4 sl12 tr2.4 h48 (6 · 1.29 · 3.60) |
| Signals | follow | sig-atr-break-m@m15 | 26 | 17 (65 %) | 76 | 71 % | 1.00 | -0.43 | tp2.5 sl3.75 tr0 h48 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-kama-m@m15 | 30 | 13 (43 %) | 310 | 70 % | 1.00 | -0.64 | tp8 sl24 tr3.2 h48 (6 · ∞ (no loss) · 26.97) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 12 (40 %) | 233 | 67 % | 0.96 | -20.22 | tp5 sl15 tr2 h48 (6 · ∞ (no loss) · 14.86) |
| Signals | follow | sig-s2-range-break-m@m15 | 26 | 15 (58 %) | 37 | 70 % | 0.73 | -26.35 | – |
| Signals | follow | sig-macd-slow-m@m15 | 28 | 10 (36 %) | 148 | 69 % | 0.86 | -49.21 | tp4 sl6 tr0 h48 (6 · 3.06 · 12.80) |
| Signals | follow | sig-cci-m@m15 | 30 | 12 (40 %) | 163 | 68 % | 0.89 | -50.69 | tp4 sl8 tr0 h48 (5 · 1.85 · 7.00) |
| Signals | follow | sig-s2-vol-break-s@m15 | 30 | 11 (37 %) | 84 | 69 % | 0.77 | -52.88 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 23 | 10 (43 %) | 47 | 51 % | 0.58 | -56.44 | tp2.5 sl3.75 tr0 h48 (5 · 0.15 · -13.50) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 28 | 10 (36 %) | 108 | 69 % | 0.78 | -57.30 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-donchian-m@m15 | 13 | 3 (23 %) | 31 | 42 % | 0.36 | -61.43 | tp2.5 sl5 tr0 h48 (5 · 0.29 · -11.00) |
| Signals | follow | sig-squeeze-m@m15 | 18 | 10 (56 %) | 18 | 56 % | 0.14 | -63.66 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 16 (53 %) | 272 | 68 % | 0.89 | -64.07 | tp6 sl18 tr2.4 h48 (8 · ∞ (no loss) · 13.50) |
| Signals | follow | sig-r-inside-s@m15 | 11 | 0 (0 %) | 14 | 21 % | 0.09 | -81.24 | – |
| Signals | follow | sig-williams-r-s@m15 | 30 | 12 (40 %) | 177 | 59 % | 0.80 | -87.69 | tp6 sl18 tr2.4 h48 (5 · 264.76 · 18.51) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 11 (37 %) | 140 | 66 % | 0.72 | -105.08 | tp5 sl15 tr2 h48 (6 · 73.36 · 9.03) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 11 (37 %) | 254 | 63 % | 0.82 | -112.43 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 8 (27 %) | 227 | 67 % | 0.80 | -114.14 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 14.25) |
| Signals | follow | sig-s2-range-shift-s@m15 | 29 | 16 (55 %) | 97 | 46 % | 0.53 | -128.40 | tp2.5 sl3.75 tr0 h48 (11 · 0.49 · -12.20) |
| Signals | follow | sig-sar-s@m15 | 30 | 9 (30 %) | 258 | 67 % | 0.78 | -132.22 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-r-fractal-m@m15 | 15 | 1 (7 %) | 21 | 14 % | 0.03 | -140.58 | – |
| Signals | follow | sig-squeeze-s@m15 | 30 | 6 (20 %) | 74 | 58 % | 0.52 | -142.64 | – |
| Signals | follow | sig-trix-m@m15 | 30 | 2 (7 %) | 115 | 68 % | 0.66 | -143.04 | tp3 sl4.5 tr0 h48 (5 · 0.89 · -1.00) |
| Signals | follow | sig-rsi-mid-s@m15 | 28 | 8 (29 %) | 161 | 62 % | 0.62 | -146.25 | tp6 sl18 tr2.4 h48 (6 · 25.59 · 4.92) |
| Signals | follow | sig-ema-pullback-s@m15 | 29 | 10 (34 %) | 225 | 64 % | 0.65 | -183.10 | tp6 sl18 tr2.4 h48 (7 · ∞ (no loss) · 13.36) |
| Signals | follow | sig-s2-active-hf-m@m15 | 29 | 8 (28 %) | 238 | 60 % | 0.71 | -184.40 | tp3 sl6 tr0 h48 (14 · 1.13 · 3.20) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 7 (23 %) | 173 | 61 % | 0.62 | -185.86 | tp4 sl12 tr0 h48 (5 · 1.25 · 3.00) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 9 (30 %) | 229 | 65 % | 0.65 | -199.55 | tp6 sl18 tr2.4 h48 (7 · 43.26 · 9.19) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 1 (3 %) | 110 | 57 % | 0.57 | -200.85 | tp3 sl9 tr1.2 h48 (5 · 0.66 · -3.11) |
| Signals | follow | sig-sar-m@m15 | 30 | 6 (20 %) | 268 | 65 % | 0.71 | -209.00 | tp4 sl6 tr0 h48 (11 · 1.07 · 1.80) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 7 (23 %) | 156 | 63 % | 0.53 | -218.59 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 8 (27 %) | 228 | 64 % | 0.67 | -220.05 | tp6 sl18 tr2.4 h48 (6 · ∞ (no loss) · 10.32) |
| Signals | follow | sig-r-fractal-s@m15 | 24 | 4 (17 %) | 73 | 38 % | 0.22 | -229.98 | tp2.5 sl3.75 tr0 h48 (7 · 0.44 · -8.90) |
| Signals | follow | sig-macd-cross-m@m15 | 26 | 2 (8 %) | 149 | 60 % | 0.48 | -231.43 | tp4 sl8 tr0 h48 (6 · 0.93 · -1.20) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 4 (13 %) | 124 | 58 % | 0.54 | -236.00 | tp3 sl4.5 tr0 h48 (6 · 1.19 · 1.80) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 6 (20 %) | 243 | 63 % | 0.60 | -247.15 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 12.56) |
| Signals | follow | sig-stoch-rsi-m@m15 | 29 | 7 (24 %) | 255 | 61 % | 0.60 | -248.08 | tp5 sl15 tr3 h48 (5 · ∞ (no loss) · 11.37) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 6 (20 %) | 180 | 58 % | 0.59 | -249.89 | tp3 sl6 tr0 h48 (8 · 1.35 · 4.40) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 4 (13 %) | 305 | 63 % | 0.69 | -261.94 | tp5 sl7.5 tr0 h48 (8 · 1.04 · 0.90) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 2 (7 %) | 274 | 64 % | 0.69 | -269.04 | tp6 sl18 tr0 h48 (5 · 1.27 · 5.00) |
| Signals | follow | sig-macd-cross-s@m15 | 28 | 7 (25 %) | 205 | 60 % | 0.54 | -284.58 | tp4 sl8 tr0 h48 (8 · 1.39 · 6.40) |
| Signals | follow | sig-macd-hist-s@m15 | 28 | 7 (25 %) | 205 | 60 % | 0.54 | -284.58 | tp4 sl8 tr0 h48 (8 · 1.39 · 6.40) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 6 (20 %) | 211 | 63 % | 0.55 | -285.59 | tp2.5 sl7.5 tr0 h48 (8 · 0.90 · -1.60) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 3 (10 %) | 167 | 53 % | 0.51 | -286.83 | tp5 sl15 tr2 h48 (6 · 0.79 · -3.26) |
| Signals | follow | sig-s2-block-stack-m@m15 | 24 | 1 (4 %) | 71 | 41 % | 0.21 | -295.38 | tp2.5 sl3.75 tr0 h48 (5 · 0.87 · -1.00) |
| Signals | follow | sig-s2-atr-break-m@m15 | 29 | 6 (21 %) | 175 | 57 % | 0.45 | -297.02 | tp3 sl6 tr0 h48 (10 · 1.05 · 1.00) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 7 (23 %) | 261 | 59 % | 0.56 | -301.50 | tp8 sl24 tr3.2 h48 (5 · 8.55 · 5.09) |
| Signals | follow | sig-kama-s@m15 | 30 | 7 (23 %) | 308 | 60 % | 0.62 | -303.11 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 20.04) |
| Signals | follow | sig-swing-s@m15 | 25 | 4 (16 %) | 183 | 58 % | 0.45 | -308.11 | tp2.5 sl3.75 tr0 h48 (14 · 1.05 · 0.95) |
| Signals | follow | sig-r-awesome-s@m15 | 26 | 5 (19 %) | 87 | 39 % | 0.21 | -308.73 | tp2.5 sl3.75 tr0 h48 (8 · 0.35 · -12.85) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 7 (23 %) | 226 | 61 % | 0.58 | -315.38 | tp6 sl18 tr2.4 h48 (6 · ∞ (no loss) · 15.50) |
| Signals | follow | sig-r-nr-break-m@m15 | 28 | 4 (14 %) | 138 | 48 % | 0.40 | -321.11 | tp3 sl9 tr1.2 h48 (11 · 0.74 · -2.69) |
| Signals | follow | sig-r-connors-m@m15 | 27 | 5 (19 %) | 126 | 55 % | 0.36 | -326.57 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-r-nr-break-s@m15 | 23 | 2 (9 %) | 99 | 41 % | 0.24 | -328.88 | tp2.5 sl3.75 tr0 h48 (9 · 0.73 · -4.30) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 69 | 42 % | 0.20 | -334.00 | – |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 8 (27 %) | 304 | 59 % | 0.56 | -344.19 | tp6 sl18 tr2.4 h48 (12 · 2.56 · 9.33) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 8 (27 %) | 177 | 54 % | 0.41 | -347.15 | tp6 sl18 tr2.4 h48 (5 · ∞ (no loss) · 8.97) |
| Signals | follow | sig-thrust-m@m15 | 29 | 4 (14 %) | 264 | 64 % | 0.50 | -349.03 | tp2.5 sl7.5 tr0 h48 (14 · 1.10 · 2.20) |
| Signals | follow | sig-impulse-s@m15 | 28 | 4 (14 %) | 224 | 54 % | 0.47 | -369.58 | tp2.5 sl7.5 tr0 h48 (11 · 0.80 · -4.70) |
| Signals | follow | sig-cmf-s@m15 | 26 | 4 (15 %) | 147 | 52 % | 0.33 | -372.75 | tp3 sl9 tr1.8 h48 (11 · 0.83 · -3.21) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 0 (0 %) | 225 | 57 % | 0.51 | -388.19 | tp5 sl15 tr3 h48 (5 · 0.98 · -0.33) |
| Signals | follow | sig-adx-s@m15 | 30 | 8 (27 %) | 234 | 55 % | 0.53 | -390.50 | tp8 sl24 tr3.2 h48 (5 · ∞ (no loss) · 24.87) |
| Signals | follow | sig-cci-s@m15 | 30 | 0 (0 %) | 357 | 65 % | 0.63 | -405.56 | tp6 sl18 tr2.4 h48 (11 · 0.86 · -3.77) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 4 (13 %) | 172 | 44 % | 0.32 | -426.90 | tp4 sl12 tr2.4 h48 (6 · 0.73 · -3.36) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 0 (0 %) | 214 | 54 % | 0.47 | -454.58 | tp6 sl18 tr2.4 h48 (5 · 0.93 · -1.32) |
| Signals | follow | sig-zscore-s@m15 | 30 | 0 (0 %) | 214 | 54 % | 0.47 | -454.58 | tp6 sl18 tr2.4 h48 (5 · 0.93 · -1.32) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 4 (13 %) | 233 | 51 % | 0.41 | -514.10 | tp4 sl12 tr0 h48 (6 · 0.74 · -5.42) |
| Signals | follow | sig-heikin-ashi-m@m15 | 25 | 1 (4 %) | 208 | 49 % | 0.32 | -521.80 | tp3 sl6 tr0 h48 (15 · 0.68 · -12.00) |
| Signals | follow | sig-ema-trend-s@m15 | 28 | 5 (18 %) | 232 | 55 % | 0.34 | -530.09 | tp6 sl18 tr2.4 h48 (5 · ∞ (no loss) · 6.57) |
| Signals | follow | sig-hma-s@m15 | 28 | 0 (0 %) | 152 | 39 % | 0.23 | -539.87 | tp4 sl12 tr1.6 h48 (6 · 0.33 · -8.34) |
| Signals | follow | sig-cmf-m@m15 | 29 | 3 (10 %) | 149 | 38 % | 0.18 | -567.13 | tp3 sl9 tr1.2 h48 (9 · 0.60 · -3.76) |
| Signals | follow | sig-impulse-m@m15 | 28 | 2 (7 %) | 130 | 31 % | 0.17 | -574.10 | tp4 sl12 tr1.6 h48 (5 · 68.32 · 8.79) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 301 | 52 % | 0.33 | -741.32 | tp5 sl15 tr2 h48 (11 · 0.55 · -6.98) |
| Signals | follow | sig-thrust-s@m15 | 30 | 0 (0 %) | 181 | 34 % | 0.16 | -822.30 | tp4 sl12 tr1.6 h48 (8 · 0.33 · -16.51) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 110 | 99 (90 %) | 344 | 95 % | 4.07 | 797.36 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 89 | 77 (87 %) | 177 | 92 % | 3.48 | 647.66 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 78 | 65 (83 %) | 139 | 88 % | 3.11 | 580.15 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 107 | 83 (78 %) | 312 | 89 % | 2.07 | 484.00 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 96 | 69 (72 %) | 223 | 85 % | 1.93 | 456.13 |
| Signals | tp 6.000% | sl 3.00× | tr off | 90 | 63 (70 %) | 193 | 84 % | 1.85 | 423.76 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 116 | 72 (62 %) | 512 | 82 % | 1.17 | 148.98 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 115 | 61 (53 %) | 470 | 79 % | 0.84 | -197.75 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 116 | 56 (48 %) | 677 | 74 % | 0.83 | -216.29 |
| Signals | tp 5.000% | sl 3.00× | tr off | 108 | 48 (44 %) | 337 | 70 % | 0.77 | -342.46 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 112 | 43 (38 %) | 394 | 70 % | 0.73 | -407.97 |
| Signals | tp 6.000% | sl 2.00× | tr off | 100 | 29 (29 %) | 283 | 58 % | 0.64 | -514.84 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 115 | 44 (38 %) | 655 | 72 % | 0.66 | -595.64 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 113 | 41 (36 %) | 539 | 71 % | 0.66 | -614.60 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 115 | 38 (33 %) | 890 | 69 % | 0.60 | -702.55 |
| Signals | tp 4.000% | sl 1.50× | tr off | 115 | 38 (33 %) | 777 | 52 % | 0.67 | -745.40 |
| Signals | tp 3.000% | sl 2.00× | tr off | 118 | 39 (33 %) | 930 | 60 % | 0.67 | -772.59 |
| Signals | tp 5.000% | sl 2.00× | tr off | 109 | 31 (28 %) | 438 | 55 % | 0.59 | -814.46 |
| Signals | tp 4.000% | sl 3.00× | tr off | 110 | 31 (28 %) | 494 | 66 % | 0.60 | -815.73 |
| Signals | tp 2.500% | sl 3.00× | tr off | 117 | 35 (30 %) | 962 | 69 % | 0.65 | -818.29 |
| Signals | tp 6.000% | sl 1.50× | tr off | 110 | 29 (26 %) | 379 | 46 % | 0.53 | -882.04 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 30 (25 %) | 1248 | 60 % | 0.66 | -887.99 |
| Signals | tp 4.000% | sl 2.00× | tr off | 111 | 30 (27 %) | 634 | 56 % | 0.60 | -895.41 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 32 (27 %) | 721 | 66 % | 0.60 | -899.60 |
| Signals | tp 2.500% | sl 1.50× | tr off | 119 | 28 (24 %) | 1413 | 53 % | 0.65 | -913.49 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 117 | 32 (27 %) | 798 | 64 % | 0.58 | -946.68 |
| Signals | tp 5.000% | sl 1.50× | tr off | 113 | 30 (27 %) | 560 | 48 % | 0.57 | -954.54 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 117 | 31 (26 %) | 991 | 65 % | 0.56 | -993.45 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 117 | 32 (27 %) | 1274 | 58 % | 0.52 | -998.00 |
| Signals | tp 3.000% | sl 1.50× | tr off | 119 | 28 (24 %) | 1171 | 49 % | 0.58 | -1162.79 |

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
