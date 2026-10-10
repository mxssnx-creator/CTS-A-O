# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: none), strategies Trailing, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.00 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1354/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 351/19072 · PF 1.54 · Micro 233/5900 · PF 2.26 · Short 642/8176 · PF 1.47 · General 514/8176 · PF 1.50 · Long 570/8176 · PF 1.51 · Signals 126/126; Main 1228 pairs, 215798 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 201 s. Causal: Base / Main / Real ranked on the history before the run.

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

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1228 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (215798 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (3397); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 27614 · 0.70 | 6894 · 0.80 | 9637 · 0.91 | 1422 · 0.64 | – | – | – | – | – |
| 13:00 | 47023 · 0.41 | 8282 · 0.68 | 15682 · 0.64 | 1223 · 2.79 | – | – | – | – | – |
| 14:00 | 29280 · 2.00 | 7111 · 2.13 | 9962 · 2.17 | 2415 · 5.21 | – | – | – | – | – |
| 15:00 | 37278 · 1.40 | 9237 · 1.13 | 13457 · 1.56 | 3593 · 0.77 | – | – | – | – | – |
| 16:00 | 27495 · 1.18 | 4531 · 1.07 | 9726 · 1.75 | 1250 · 1.17 | – | – | – | – | – |
| 17:00 | 18386 · 1.68 | 3672 · 1.16 | 6875 · 1.40 | 1524 · 1.58 | – | – | – | – | – |
| 18:00 | 18233 · 1.85 | 2959 · 2.86 | 4995 · 1.71 | 851 · 0.89 | – | – | – | – | – |
| 19:00 | 21707 · 0.98 | 5572 · 1.61 | 6926 · 0.92 | 1155 · 0.97 | – | – | – | – | – |
| 20:00 | 41556 · 0.59 | 12349 · 0.90 | 9937 · 0.50 | 2325 · 0.88 | – | – | – | – | – |
| 21:00 | 48899 · 0.65 | 13164 · 0.96 | 15894 · 0.64 | 2731 · 0.56 | – | – | – | – | – |
| 22:00 | 48385 · 0.41 | 12131 · 0.43 | 18341 · 0.42 | 3496 · 0.14 | – | – | – | – | – |
| 23:00 | 30561 · 0.46 | 5791 · 0.46 | 8836 · 0.38 | 1456 · 0.23 | – | – | – | – | – |
| **total** | **396417 · 0.78** | **91693 · 0.90** | **130268 · 0.77** | **23441 · 0.60** | **–** | **–** | **–** | **–** | **–** |

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
| Signals | 48133 | sig:confirm 48133 |

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

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 212018 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2159 units active at the run start, 2995 over the run, 3397 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | normal | 1671 | 509 (30 %) | 10205 | 56 % | 0.61 | -12120.62 |
| Signals | trailing | 1726 | 627 (36 %) | 13236 | 62 % | 0.60 | -10840.96 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 46 (78 %) | 373 | 75 % | 1.56 | 268.05 |
| Signals | signal:act-hf | 60 | 7 (12 %) | 523 | 54 % | 0.52 | -664.21 |
| Signals | signal:adx | 60 | 15 (25 %) | 407 | 59 % | 0.58 | -533.36 |
| Signals | signal:atr-break | 60 | 24 (40 %) | 381 | 57 % | 0.82 | -148.90 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 392 | 52 % | 0.51 | -651.48 |
| Signals | signal:cci | 60 | 16 (27 %) | 571 | 61 % | 0.60 | -624.32 |
| Signals | signal:cmf | 57 | 2 (4 %) | 395 | 47 % | 0.25 | -1066.50 |
| Signals | signal:donchian | 44 | 16 (36 %) | 222 | 61 % | 0.79 | -98.23 |
| Signals | signal:ema-cross | 60 | 56 (93 %) | 200 | 90 % | 6.82 | 446.75 |
| Signals | signal:ema-cross-fast | 60 | 47 (78 %) | 438 | 80 % | 1.82 | 418.09 |
| Signals | signal:ema-pullback | 60 | 5 (8 %) | 484 | 53 % | 0.32 | -1037.30 |
| Signals | signal:ema-slope | 60 | 32 (53 %) | 313 | 73 % | 1.13 | 71.42 |
| Signals | signal:ema-trend | 60 | 6 (10 %) | 586 | 59 % | 0.44 | -940.92 |
| Signals | signal:heikin-ashi | 58 | 1 (2 %) | 681 | 54 % | 0.39 | -1222.29 |
| Signals | signal:hma | 60 | 14 (23 %) | 495 | 54 % | 0.53 | -621.20 |
| Signals | signal:ichimoku | 39 | 4 (10 %) | 209 | 54 % | 0.49 | -286.75 |
| Signals | signal:impulse | 59 | 1 (2 %) | 430 | 40 % | 0.25 | -1158.32 |
| Signals | signal:kama | 60 | 11 (18 %) | 783 | 61 % | 0.62 | -696.45 |
| Signals | signal:keltner | 60 | 40 (67 %) | 217 | 70 % | 1.77 | 237.11 |
| Signals | signal:macd-cross | 58 | 5 (9 %) | 452 | 57 % | 0.50 | -587.01 |
| Signals | signal:macd-hist | 59 | 17 (29 %) | 719 | 66 % | 0.73 | -383.31 |
| Signals | signal:macd-slow | 60 | 17 (28 %) | 456 | 63 % | 0.69 | -319.39 |
| Signals | signal:mfi | 21 | 21 (100 %) | 41 | 90 % | 15.45 | 59.50 |
| Signals | signal:obv | 60 | 44 (73 %) | 624 | 72 % | 1.38 | 319.43 |
| Signals | signal:r-awesome | 59 | 3 (5 %) | 376 | 42 % | 0.27 | -1050.27 |
| Signals | signal:r-connors | 46 | 20 (43 %) | 182 | 61 % | 0.45 | -312.11 |
| Signals | signal:r-fractal | 47 | 5 (11 %) | 122 | 33 % | 0.14 | -428.56 |
| Signals | signal:r-inside | 17 | 0 (0 %) | 24 | 29 % | 0.11 | -120.10 |
| Signals | signal:r-linreg | 60 | 7 (12 %) | 542 | 57 % | 0.43 | -821.07 |
| Signals | signal:r-nr-break | 59 | 7 (12 %) | 321 | 45 % | 0.35 | -746.53 |
| Signals | signal:r-session-trend | 60 | 6 (10 %) | 502 | 53 % | 0.42 | -948.33 |
| Signals | signal:r-vol-regime | 32 | 17 (53 %) | 59 | 56 % | 1.07 | 7.20 |
| Signals | signal:reclaim | 60 | 16 (27 %) | 756 | 67 % | 0.72 | -462.96 |
| Signals | signal:rsi-mid | 60 | 3 (5 %) | 431 | 48 % | 0.32 | -892.09 |
| Signals | signal:rsi-momentum | 26 | 23 (88 %) | 26 | 88 % | 3.34 | 40.36 |
| Signals | signal:rsi-reversal | 4 | 0 (0 %) | 4 | 0 % | 0.00 | -14.55 |
| Signals | signal:s2-active-hf | 60 | 10 (17 %) | 625 | 59 % | 0.63 | -553.19 |
| Signals | signal:s2-adx-gate | 60 | 15 (25 %) | 509 | 66 % | 0.76 | -254.11 |
| Signals | signal:s2-atr-break | 60 | 6 (10 %) | 467 | 50 % | 0.43 | -757.91 |
| Signals | signal:s2-bb-bounce | 60 | 33 (55 %) | 245 | 60 % | 0.96 | -22.09 |
| Signals | signal:s2-block-scale | 60 | 5 (8 %) | 625 | 60 % | 0.50 | -774.38 |
| Signals | signal:s2-block-stack | 59 | 3 (5 %) | 305 | 47 % | 0.36 | -712.11 |
| Signals | signal:s2-confluence | 60 | 30 (50 %) | 766 | 66 % | 0.96 | -47.93 |
| Signals | signal:s2-ema-cross | 30 | 24 (80 %) | 33 | 82 % | 8.85 | 110.07 |
| Signals | signal:s2-range-break | 53 | 41 (77 %) | 78 | 74 % | 2.01 | 102.00 |
| Signals | signal:s2-range-shift | 59 | 15 (25 %) | 279 | 49 % | 0.51 | -425.03 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 100 | 61 % | 0.90 | -18.75 |
| Signals | signal:s2-st-trail | 53 | 36 (68 %) | 90 | 73 % | 1.49 | 58.39 |
| Signals | signal:s2-stoch-swing | 60 | 42 (70 %) | 611 | 75 % | 1.50 | 434.42 |
| Signals | signal:s2-vol-break | 56 | 28 (50 %) | 131 | 70 % | 0.80 | -60.16 |
| Signals | signal:s2-vwap-axis | 27 | 26 (96 %) | 27 | 96 % | 2162.36 | 87.35 |
| Signals | signal:sar | 60 | 7 (12 %) | 661 | 60 % | 0.61 | -604.22 |
| Signals | signal:squeeze | 53 | 19 (36 %) | 53 | 36 % | 0.05 | -297.94 |
| Signals | signal:st-slow | 53 | 22 (42 %) | 104 | 61 % | 0.78 | -51.27 |
| Signals | signal:stoch-rsi | 60 | 7 (12 %) | 773 | 54 % | 0.40 | -1149.96 |
| Signals | signal:supertrend | 60 | 47 (78 %) | 277 | 72 % | 1.29 | 118.10 |
| Signals | signal:swing | 58 | 2 (3 %) | 594 | 54 % | 0.36 | -1081.79 |
| Signals | signal:thrust | 60 | 1 (2 %) | 559 | 52 % | 0.31 | -1192.64 |
| Signals | signal:trix | 60 | 24 (40 %) | 252 | 67 % | 1.10 | 49.49 |
| Signals | signal:volume-break | 56 | 50 (89 %) | 56 | 89 % | 10.44 | 164.29 |
| Signals | signal:vwap | 60 | 25 (42 %) | 517 | 67 % | 0.89 | -106.87 |
| Signals | signal:williams-r | 60 | 22 (37 %) | 621 | 61 % | 0.85 | -214.74 |
| Signals | signal:zscore | 60 | 1 (2 %) | 346 | 49 % | 0.39 | -792.02 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 75768 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75768 | 0 |  |
| Short | 39456 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39456 | 0 |  |
| General | 13080 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13080 | 0 |  |
| Long | 18630 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18630 | 0 |  |
| Wide | 65084 | 0 | 0 | – | – | – | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 65084 | 0 |  |
| Signals | 3780 | – | 2159 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2159 units (pair × symbol × direction) active at the run start, 2995 over the run; 3397 configs entered while their unit was active — seated per unit and step, not configEval |

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
| Signals | trailing | 1890 | 1173 (62 %) | 31136 | 70 % | 1.20 | 8662.39 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 59 | 46 (78 %) | 373 | 75 % | 1.56 | 268.05 |
| Signals | signal:act-hf | 60 | 7 (12 %) | 523 | 54 % | 0.52 | -664.21 |
| Signals | signal:adx | 60 | 15 (25 %) | 407 | 59 % | 0.58 | -533.36 |
| Signals | signal:atr-break | 60 | 24 (40 %) | 381 | 57 % | 0.82 | -148.90 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 392 | 52 % | 0.51 | -651.48 |
| Signals | signal:cci | 60 | 16 (27 %) | 571 | 61 % | 0.60 | -624.32 |
| Signals | signal:cmf | 57 | 2 (4 %) | 395 | 47 % | 0.25 | -1066.50 |
| Signals | signal:donchian | 44 | 16 (36 %) | 222 | 61 % | 0.79 | -98.23 |
| Signals | signal:ema-cross | 60 | 56 (93 %) | 200 | 90 % | 6.82 | 446.75 |
| Signals | signal:ema-cross-fast | 60 | 47 (78 %) | 438 | 80 % | 1.82 | 418.09 |
| Signals | signal:ema-pullback | 60 | 5 (8 %) | 484 | 53 % | 0.32 | -1037.30 |
| Signals | signal:ema-slope | 60 | 32 (53 %) | 313 | 73 % | 1.13 | 71.42 |
| Signals | signal:ema-trend | 60 | 6 (10 %) | 586 | 59 % | 0.44 | -940.92 |
| Signals | signal:heikin-ashi | 58 | 1 (2 %) | 681 | 54 % | 0.39 | -1222.29 |
| Signals | signal:hma | 60 | 14 (23 %) | 495 | 54 % | 0.53 | -621.20 |
| Signals | signal:ichimoku | 39 | 4 (10 %) | 209 | 54 % | 0.49 | -286.75 |
| Signals | signal:impulse | 59 | 1 (2 %) | 430 | 40 % | 0.25 | -1158.32 |
| Signals | signal:kama | 60 | 11 (18 %) | 783 | 61 % | 0.62 | -696.45 |
| Signals | signal:keltner | 60 | 40 (67 %) | 217 | 70 % | 1.77 | 237.11 |
| Signals | signal:macd-cross | 58 | 5 (9 %) | 452 | 57 % | 0.50 | -587.01 |
| Signals | signal:macd-hist | 59 | 17 (29 %) | 719 | 66 % | 0.73 | -383.31 |
| Signals | signal:macd-slow | 60 | 17 (28 %) | 456 | 63 % | 0.69 | -319.39 |
| Signals | signal:mfi | 21 | 21 (100 %) | 41 | 90 % | 15.45 | 59.50 |
| Signals | signal:obv | 60 | 44 (73 %) | 624 | 72 % | 1.38 | 319.43 |
| Signals | signal:r-awesome | 59 | 3 (5 %) | 376 | 42 % | 0.27 | -1050.27 |
| Signals | signal:r-connors | 46 | 20 (43 %) | 182 | 61 % | 0.45 | -312.11 |
| Signals | signal:r-fractal | 47 | 5 (11 %) | 122 | 33 % | 0.14 | -428.56 |
| Signals | signal:r-inside | 17 | 0 (0 %) | 24 | 29 % | 0.11 | -120.10 |
| Signals | signal:r-linreg | 60 | 7 (12 %) | 542 | 57 % | 0.43 | -821.07 |
| Signals | signal:r-nr-break | 59 | 7 (12 %) | 321 | 45 % | 0.35 | -746.53 |
| Signals | signal:r-session-trend | 60 | 6 (10 %) | 502 | 53 % | 0.42 | -948.33 |
| Signals | signal:r-vol-regime | 32 | 17 (53 %) | 59 | 56 % | 1.07 | 7.20 |
| Signals | signal:reclaim | 60 | 16 (27 %) | 756 | 67 % | 0.72 | -462.96 |
| Signals | signal:rsi-mid | 60 | 3 (5 %) | 431 | 48 % | 0.32 | -892.09 |
| Signals | signal:rsi-momentum | 26 | 23 (88 %) | 26 | 88 % | 3.34 | 40.36 |
| Signals | signal:rsi-reversal | 4 | 0 (0 %) | 4 | 0 % | 0.00 | -14.55 |
| Signals | signal:s2-active-hf | 60 | 10 (17 %) | 625 | 59 % | 0.63 | -553.19 |
| Signals | signal:s2-adx-gate | 60 | 15 (25 %) | 509 | 66 % | 0.76 | -254.11 |
| Signals | signal:s2-atr-break | 60 | 6 (10 %) | 467 | 50 % | 0.43 | -757.91 |
| Signals | signal:s2-bb-bounce | 60 | 33 (55 %) | 245 | 60 % | 0.96 | -22.09 |
| Signals | signal:s2-block-scale | 60 | 5 (8 %) | 625 | 60 % | 0.50 | -774.38 |
| Signals | signal:s2-block-stack | 59 | 3 (5 %) | 305 | 47 % | 0.36 | -712.11 |
| Signals | signal:s2-confluence | 60 | 30 (50 %) | 766 | 66 % | 0.96 | -47.93 |
| Signals | signal:s2-ema-cross | 30 | 24 (80 %) | 33 | 82 % | 8.85 | 110.07 |
| Signals | signal:s2-range-break | 53 | 41 (77 %) | 78 | 74 % | 2.01 | 102.00 |
| Signals | signal:s2-range-shift | 59 | 15 (25 %) | 279 | 49 % | 0.51 | -425.03 |
| Signals | signal:s2-rsi-revert | 56 | 39 (70 %) | 100 | 61 % | 0.90 | -18.75 |
| Signals | signal:s2-st-trail | 53 | 36 (68 %) | 90 | 73 % | 1.49 | 58.39 |
| Signals | signal:s2-stoch-swing | 60 | 42 (70 %) | 611 | 75 % | 1.50 | 434.42 |
| Signals | signal:s2-vol-break | 56 | 28 (50 %) | 131 | 70 % | 0.80 | -60.16 |
| Signals | signal:s2-vwap-axis | 27 | 26 (96 %) | 27 | 96 % | 2162.36 | 87.35 |
| Signals | signal:sar | 60 | 7 (12 %) | 661 | 60 % | 0.61 | -604.22 |
| Signals | signal:squeeze | 53 | 19 (36 %) | 53 | 36 % | 0.05 | -297.94 |
| Signals | signal:st-slow | 53 | 22 (42 %) | 104 | 61 % | 0.78 | -51.27 |
| Signals | signal:stoch-rsi | 60 | 7 (12 %) | 773 | 54 % | 0.40 | -1149.96 |
| Signals | signal:supertrend | 60 | 47 (78 %) | 277 | 72 % | 1.29 | 118.10 |
| Signals | signal:swing | 58 | 2 (3 %) | 594 | 54 % | 0.36 | -1081.79 |
| Signals | signal:thrust | 60 | 1 (2 %) | 559 | 52 % | 0.31 | -1192.64 |
| Signals | signal:trix | 60 | 24 (40 %) | 252 | 67 % | 1.10 | 49.49 |
| Signals | signal:volume-break | 56 | 50 (89 %) | 56 | 89 % | 10.44 | 164.29 |
| Signals | signal:vwap | 60 | 25 (42 %) | 517 | 67 % | 0.89 | -106.87 |
| Signals | signal:williams-r | 60 | 22 (37 %) | 621 | 61 % | 0.85 | -214.74 |
| Signals | signal:zscore | 60 | 1 (2 %) | 346 | 49 % | 0.39 | -792.02 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 1043 | 317 (30 %) | 7989 | 62 % | 0.63 | -7861.25 |
| Signals | 1.25 | 643 | 193 (30 %) | 5152 | 63 % | 0.63 | -5091.92 |
| Signals | 1.35 | 446 | 129 (29 %) | 3621 | 63 % | 0.63 | -3551.45 |
| Signals | 1.5 | 254 | 70 (28 %) | 2072 | 64 % | 0.63 | -2027.39 |
| Signals | 1.75 | 115 | 38 (33 %) | 970 | 68 % | 0.69 | -761.62 |
| Signals | 2 | 61 | 23 (38 %) | 490 | 69 % | 0.77 | -262.34 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 269 | 84 % | 2.97 | 418.22 | tp6 sl12 tr3 h48 (6 · ∞ (no loss) · 26.67) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 141 | 96 % | 27.36 | 369.40 | tp4 sl8 tr1.6 h48 (6 · ∞ (no loss) · 14.35) |
| Signals | follow | sig-obv-m@m15 | 30 | 28 (93 %) | 217 | 81 % | 2.99 | 332.43 | tp5 sl7.5 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 27 (90 %) | 118 | 91 % | 9.71 | 277.92 | tp4 sl8 tr1.6 h48 (5 · ∞ (no loss) · 11.84) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 25 (83 %) | 278 | 77 % | 1.65 | 227.48 | tp5 sl15 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-trix-s@m15 | 30 | 24 (80 %) | 158 | 73 % | 2.44 | 227.23 | tp5 sl10 tr2.5 h48 (5 · 147.51 · 19.07) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 29 (97 %) | 82 | 89 % | 4.76 | 168.83 | – |
| Signals | follow | sig-keltner-s@m15 | 30 | 25 (83 %) | 145 | 68 % | 1.91 | 154.52 | tp6 sl12 tr1.8 h48 (6 · 62.40 · 14.85) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 53 | 100 % | ∞ (no loss) | 141.70 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 29 (97 %) | 56 | 95 % | 10.23 | 127.85 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 27 (90 %) | 30 | 90 % | 704.90 | 123.92 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 24 | 24 (100 %) | 35 | 86 % | 96.52 | 123.21 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 19 (63 %) | 358 | 71 % | 1.22 | 118.56 | tp8 sl16 tr2.4 h48 (10 · 748.23 · 24.41) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 24 (80 %) | 33 | 82 % | 8.85 | 110.07 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 22 (73 %) | 90 | 67 % | 1.64 | 90.70 | tp3 sl4.5 tr0 h48 (5 · 0.40 · -8.50) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 27 | 26 (96 %) | 27 | 96 % | 2162.36 | 87.35 | – |
| Signals | follow | sig-keltner-m@m15 | 30 | 15 (50 %) | 72 | 75 % | 1.60 | 82.59 | – |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 20.28 | 76.16 | – |
| Signals | follow | sig-mfi-m@m15 | 21 | 21 (100 %) | 41 | 90 % | 15.45 | 59.50 | – |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 19 (63 %) | 104 | 78 % | 1.32 | 57.84 | tp2.5 sl3.75 tr0 h48 (5 · 0.87 · -1.00) |
| Signals | follow | sig-s2-vol-break-m@m15 | 26 | 23 (88 %) | 36 | 83 % | 4.26 | 56.96 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 17 (57 %) | 297 | 72 % | 1.10 | 48.70 | tp8 sl16 tr3.2 h48 (6 · ∞ (no loss) · 26.56) |
| Signals | follow | sig-act-burst-m@m15 | 29 | 21 (72 %) | 95 | 71 % | 1.32 | 40.58 | tp4 sl8 tr1.2 h48 (5 · 9.30 · 6.78) |
| Signals | follow | sig-rsi-momentum-s@m15 | 26 | 23 (88 %) | 26 | 88 % | 3.34 | 40.36 | – |
| Signals | follow | sig-volume-break-s@m15 | 26 | 23 (88 %) | 26 | 88 % | 3.34 | 40.36 | – |
| Signals | follow | sig-r-vol-regime-s@m15 | 24 | 16 (67 %) | 48 | 63 % | 1.62 | 39.05 | tp2.5 sl3.75 tr0 h48 (5 · 0.39 · -7.25) |
| Signals | follow | sig-r-connors-s@m15 | 18 | 17 (94 %) | 22 | 95 % | 7.03 | 37.40 | – |
| Signals | follow | sig-vwap-m@m15 | 30 | 16 (53 %) | 148 | 72 % | 1.13 | 28.87 | tp3 sl4.5 tr0 h48 (6 · 2.98 · 9.30) |
| Signals | follow | sig-adx-m@m15 | 30 | 12 (40 %) | 129 | 71 % | 1.09 | 21.41 | tp3 sl6 tr1.5 h48 (7 · 1.19 · 1.15) |
| Signals | follow | sig-st-slow-m@m15 | 30 | 15 (50 %) | 70 | 71 % | 1.14 | 18.20 | – |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 14 (47 %) | 342 | 68 % | 1.02 | 16.21 | tp5 sl15 tr0 h48 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 13 (43 %) | 209 | 71 % | 1.04 | 13.58 | tp4 sl8 tr0 h48 (6 · 2.32 · 10.80) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 15 (50 %) | 184 | 69 % | 1.01 | 4.76 | tp4 sl6 tr0 h48 (6 · 3.06 · 12.80) |
| Signals | follow | sig-donchian-s@m15 | 30 | 15 (50 %) | 180 | 68 % | 1.01 | 4.14 | tp3 sl9 tr0 h48 (6 · 1.52 · 4.80) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 16 (53 %) | 111 | 59 % | 1.01 | 1.68 | tp5 sl10 tr1.5 h48 (5 · 39.09 · 8.74) |
| Signals | follow | sig-cci-m@m15 | 30 | 16 (53 %) | 191 | 68 % | 0.97 | -10.93 | tp6 sl12 tr3 h48 (5 · 1.67 · 8.13) |
| Signals | follow | sig-obv-s@m15 | 30 | 16 (53 %) | 407 | 68 % | 0.98 | -13.00 | tp6 sl12 tr1.8 h48 (17 · 2.59 · 20.01) |
| Signals | follow | sig-ichimoku-m@m15 | 9 | 3 (33 %) | 13 | 38 % | 0.03 | -13.16 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 29 | 17 (59 %) | 43 | 65 % | 0.79 | -21.21 | – |
| Signals | follow | sig-williams-r-m@m15 | 30 | 14 (47 %) | 385 | 65 % | 0.97 | -22.91 | tp8 sl16 tr2.4 h48 (9 · 2.53 · 24.76) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 17 (57 %) | 224 | 66 % | 0.94 | -23.60 | tp8 sl16 tr2.4 h48 (6 · ∞ (no loss) · 20.88) |
| Signals | follow | sig-r-vol-regime-m@m15 | 8 | 1 (13 %) | 11 | 27 % | 0.18 | -31.85 | – |
| Signals | follow | sig-squeeze-m@m15 | 23 | 15 (65 %) | 23 | 65 % | 0.19 | -60.73 | – |
| Signals | follow | sig-hma-m@m15 | 30 | 12 (40 %) | 277 | 62 % | 0.88 | -68.88 | tp8 sl16 tr2.4 h48 (7 · 114.97 · 22.79) |
| Signals | follow | sig-st-slow-s@m15 | 23 | 7 (30 %) | 34 | 38 % | 0.34 | -69.47 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 23 | 7 (30 %) | 34 | 38 % | 0.34 | -69.47 | – |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 12 (40 %) | 464 | 71 % | 0.89 | -86.52 | tp2.5 sl5 tr0 h48 (23 · 1.59 · 15.40) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 26 | 10 (38 %) | 70 | 46 % | 0.50 | -94.90 | tp3 sl6 tr0.9 h48 (7 · 0.10 · -11.71) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 11 (37 %) | 484 | 69 % | 0.89 | -100.03 | tp8 sl16 tr3.2 h48 (8 · 1.47 · 7.53) |
| Signals | follow | sig-donchian-m@m15 | 14 | 1 (7 %) | 42 | 29 % | 0.24 | -102.37 | tp2.5 sl5 tr0 h48 (5 · 0.29 · -11.00) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 11 (37 %) | 155 | 56 % | 0.74 | -112.79 | tp5 sl10 tr2 h48 (5 · 1.21 · 2.15) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 9 (30 %) | 371 | 68 % | 0.84 | -113.08 | tp2.5 sl7.5 tr0 h48 (15 · 1.94 · 14.50) |
| Signals | follow | sig-s2-vol-break-s@m15 | 30 | 5 (17 %) | 95 | 65 % | 0.59 | -117.13 | tp2.5 sl5 tr0 h48 (5 · 1.77 · 4.00) |
| Signals | follow | sig-r-inside-s@m15 | 17 | 0 (0 %) | 24 | 29 % | 0.11 | -120.10 | – |
| Signals | follow | sig-vwap-s@m15 | 30 | 9 (30 %) | 369 | 64 % | 0.82 | -135.74 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 6 (20 %) | 138 | 63 % | 0.61 | -141.03 | tp3 sl4.5 tr0 h48 (5 · 2.38 · 6.50) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 8 (27 %) | 270 | 57 % | 0.76 | -150.58 | tp5 sl10 tr2.5 h48 (6 · 2.01 · 10.31) |
| Signals | follow | sig-r-fractal-m@m15 | 20 | 1 (5 %) | 26 | 15 % | 0.01 | -159.17 | – |
| Signals | follow | sig-bollinger-m@m15 | 30 | 1 (3 %) | 126 | 54 % | 0.61 | -163.93 | tp4 sl8 tr1.2 h48 (5 · 0.99 · -0.11) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 11 (37 %) | 408 | 62 % | 0.78 | -166.48 | tp8 sl16 tr3.2 h48 (6 · 708.36 · 22.33) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 94 | 56 % | 0.50 | -177.74 | – |
| Signals | follow | sig-williams-r-s@m15 | 30 | 8 (27 %) | 236 | 55 % | 0.66 | -191.83 | tp8 sl16 tr2.4 h48 (5 · 247.78 · 17.32) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 4 (13 %) | 145 | 58 % | 0.60 | -197.20 | tp3 sl6 tr1.5 h48 (7 · 1.82 · 5.14) |
| Signals | follow | sig-kama-m@m15 | 30 | 8 (27 %) | 363 | 64 % | 0.76 | -201.66 | tp8 sl16 tr3.2 h48 (7 · 1.66 · 10.77) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 7 (23 %) | 281 | 59 % | 0.65 | -221.10 | tp6 sl12 tr1.8 h48 (6 · 27.11 · 5.22) |
| Signals | follow | sig-s2-range-shift-s@m15 | 29 | 11 (38 %) | 134 | 40 % | 0.39 | -227.83 | tp2.5 sl3.75 tr0 h48 (10 · 0.39 · -14.50) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 5 (17 %) | 276 | 64 % | 0.65 | -236.76 | tp8 sl16 tr3.2 h48 (5 · ∞ (no loss) · 14.25) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 4 (13 %) | 30 | 13 % | 0.00 | -237.22 | – |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 4 (13 %) | 192 | 59 % | 0.50 | -262.05 | tp3 sl9 tr0 h48 (5 · 1.22 · 2.00) |
| Signals | follow | sig-r-fractal-s@m15 | 27 | 4 (15 %) | 96 | 38 % | 0.20 | -269.39 | tp3 sl6 tr1.2 h48 (6 · 0.26 · -9.44) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 1 (3 %) | 196 | 55 % | 0.51 | -273.59 | tp4 sl12 tr0 h48 (5 · 1.25 · 3.00) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 5 (17 %) | 313 | 59 % | 0.64 | -274.70 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 5 (17 %) | 312 | 59 % | 0.63 | -278.50 | tp6 sl18 tr0 h48 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 3 (10 %) | 205 | 55 % | 0.54 | -285.13 | tp3 sl6 tr0 h48 (7 · 1.13 · 1.60) |
| Signals | follow | sig-macd-cross-m@m15 | 29 | 0 (0 %) | 197 | 55 % | 0.44 | -290.21 | tp4 sl6 tr0 h48 (7 · 0.82 · -3.40) |
| Signals | follow | sig-macd-cross-s@m15 | 29 | 5 (17 %) | 255 | 58 % | 0.54 | -296.79 | tp2.5 sl7.5 tr0 h48 (10 · 1.19 · 3.00) |
| Signals | follow | sig-macd-hist-s@m15 | 29 | 5 (17 %) | 255 | 58 % | 0.54 | -296.79 | tp2.5 sl7.5 tr0 h48 (10 · 1.19 · 3.00) |
| Signals | follow | sig-sar-s@m15 | 30 | 5 (17 %) | 347 | 62 % | 0.61 | -299.25 | tp5 sl15 tr0 h48 (5 · 1.26 · 4.00) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 80 | 41 % | 0.21 | -304.47 | tp3 sl6 tr1.2 h48 (5 · 0.16 · -15.66) |
| Signals | follow | sig-sar-m@m15 | 30 | 2 (7 %) | 314 | 58 % | 0.62 | -304.97 | tp6 sl12 tr3 h48 (5 · 1.10 · 1.26) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 2 (7 %) | 272 | 58 % | 0.53 | -324.15 | tp3 sl9 tr0 h48 (8 · 0.91 · -1.60) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 4 (13 %) | 205 | 58 % | 0.43 | -328.19 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-r-connors-m@m15 | 28 | 3 (11 %) | 160 | 56 % | 0.38 | -349.51 | tp3 sl4.5 tr0 h48 (7 · 0.79 · -2.90) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 2 (7 %) | 232 | 56 % | 0.40 | -361.63 | tp3 sl6 tr0.9 h48 (17 · 1.55 · 4.05) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 5 (17 %) | 272 | 62 % | 0.53 | -362.93 | tp8 sl16 tr2.4 h48 (6 · ∞ (no loss) · 12.32) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 3 (10 %) | 296 | 59 % | 0.50 | -363.72 | tp8 sl16 tr2.4 h48 (7 · 29.77 · 6.26) |
| Signals | follow | sig-swing-s@m15 | 28 | 2 (7 %) | 229 | 57 % | 0.40 | -365.06 | tp2.5 sl3.75 tr0 h48 (12 · 1.16 · 2.60) |
| Signals | follow | sig-r-nr-break-m@m15 | 29 | 2 (7 %) | 173 | 46 % | 0.38 | -368.53 | tp3 sl6 tr0 h48 (7 · 0.60 · -7.40) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 2 (7 %) | 218 | 48 % | 0.46 | -372.69 | tp6 sl12 tr1.8 h48 (5 · 36.19 · 8.51) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 5 (17 %) | 148 | 43 % | 0.32 | -378.00 | tp2.5 sl3.75 tr0 h48 (8 · 0.58 · -6.60) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 4 (13 %) | 249 | 53 % | 0.40 | -385.23 | tp3 sl6 tr0 h48 (10 · 1.05 · 1.00) |
| Signals | follow | sig-thrust-m@m15 | 30 | 1 (3 %) | 343 | 62 % | 0.48 | -405.62 | tp2.5 sl7.5 tr0 h48 (14 · 1.10 · 2.20) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 2 (7 %) | 329 | 60 % | 0.50 | -410.67 | tp3 sl6 tr0 h48 (9 · 1.58 · 7.20) |
| Signals | follow | sig-s2-block-stack-m@m15 | 29 | 0 (0 %) | 100 | 31 % | 0.13 | -426.98 | tp2.5 sl3.75 tr0 h48 (6 · 0.58 · -4.95) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 4 (13 %) | 335 | 57 % | 0.45 | -430.45 | tp6 sl12 tr3 h48 (5 · ∞ (no loss) · 4.59) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 0 (0 %) | 242 | 49 % | 0.40 | -443.12 | tp5 sl10 tr2 h48 (7 · 0.86 · -1.46) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 3 (10 %) | 270 | 54 % | 0.48 | -454.02 | tp6 sl12 tr1.8 h48 (8 · 1.35 · 4.38) |
| Signals | follow | sig-r-awesome-s@m15 | 29 | 2 (7 %) | 102 | 27 % | 0.06 | -481.51 | tp3 sl6 tr1.2 h48 (7 · 0.03 · -12.59) |
| Signals | follow | sig-cmf-s@m15 | 27 | 1 (4 %) | 208 | 51 % | 0.30 | -485.56 | tp4 sl8 tr1.2 h48 (11 · 0.71 · -4.82) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 1 (3 %) | 266 | 51 % | 0.46 | -487.55 | tp8 sl16 tr2.4 h48 (5 · 1.05 · 0.74) |
| Signals | follow | sig-zscore-s@m15 | 30 | 1 (3 %) | 266 | 51 % | 0.46 | -487.55 | tp8 sl16 tr2.4 h48 (5 · 1.05 · 0.74) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 3 (10 %) | 232 | 51 % | 0.34 | -494.31 | tp8 sl16 tr2.4 h48 (5 · ∞ (no loss) · 10.97) |
| Signals | follow | sig-kama-s@m15 | 30 | 3 (10 %) | 420 | 59 % | 0.52 | -494.79 | tp8 sl16 tr3.2 h48 (6 · 1.24 · 3.84) |
| Signals | follow | sig-impulse-s@m15 | 29 | 0 (0 %) | 271 | 46 % | 0.33 | -515.11 | tp6 sl12 tr2.4 h48 (6 · 0.58 · -5.72) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 1 (3 %) | 199 | 38 % | 0.26 | -530.46 | tp6 sl12 tr1.8 h48 (5 · 0.45 · -6.92) |
| Signals | follow | sig-hma-s@m15 | 30 | 2 (7 %) | 218 | 44 % | 0.29 | -552.31 | tp4 sl8 tr1.2 h48 (14 · 0.54 · -11.41) |
| Signals | follow | sig-adx-s@m15 | 30 | 3 (10 %) | 278 | 54 % | 0.45 | -554.77 | tp8 sl16 tr3.2 h48 (6 · 1.54 · 8.67) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 3 (10 %) | 350 | 56 % | 0.39 | -559.02 | tp8 sl16 tr3.2 h48 (5 · 8.55 · 5.09) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 1 (3 %) | 274 | 48 % | 0.38 | -568.75 | tp6 sl12 tr2.4 h48 (5 · 0.85 · -1.77) |
| Signals | follow | sig-cmf-m@m15 | 30 | 1 (3 %) | 187 | 43 % | 0.19 | -580.93 | tp4 sl8 tr1.2 h48 (9 · 0.79 · -1.76) |
| Signals | follow | sig-heikin-ashi-m@m15 | 28 | 0 (0 %) | 266 | 47 % | 0.30 | -587.55 | tp6 sl12 tr1.8 h48 (6 · 0.21 · -9.71) |
| Signals | follow | sig-cci-s@m15 | 30 | 0 (0 %) | 380 | 58 % | 0.47 | -613.38 | tp8 sl16 tr4 h48 (7 · 0.81 · -4.51) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 1 (3 %) | 415 | 58 % | 0.46 | -634.74 | tp5 sl7.5 tr0 h48 (8 · 1.04 · 0.90) |
| Signals | follow | sig-impulse-m@m15 | 30 | 1 (3 %) | 159 | 30 % | 0.15 | -643.21 | tp3 sl6 tr1.5 h48 (8 · 0.46 · -10.08) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 1 (3 %) | 310 | 54 % | 0.29 | -704.16 | tp3 sl6 tr0 h48 (10 · 0.68 · -8.00) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 1 (3 %) | 279 | 49 % | 0.25 | -709.11 | tp6 sl12 tr1.8 h48 (10 · 0.36 · -15.74) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 365 | 52 % | 0.34 | -716.74 | tp8 sl16 tr2.4 h48 (8 · 0.40 · -9.90) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 3 (10 %) | 438 | 52 % | 0.37 | -719.51 | tp6 sl12 tr3 h48 (5 · 0.54 · -5.57) |
| Signals | follow | sig-thrust-s@m15 | 30 | 0 (0 %) | 216 | 36 % | 0.18 | -787.02 | tp6 sl12 tr1.8 h48 (6 · 0.23 · -10.15) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 3.00× | tr off | 90 | 64 (71 %) | 190 | 83 % | 1.74 | 382.36 |
| Signals | tp 8.000% | sl 2.00× | tr 0.50× | 106 | 66 (62 %) | 301 | 77 % | 1.16 | 129.11 |
| Signals | tp 8.000% | sl 2.00× | tr 0.30× | 113 | 64 (57 %) | 516 | 79 % | 1.04 | 43.17 |
| Signals | tp 8.000% | sl 2.00× | tr 0.40× | 111 | 63 (57 %) | 394 | 82 % | 0.99 | -6.19 |
| Signals | tp 6.000% | sl 2.00× | tr 0.30× | 117 | 51 (44 %) | 777 | 72 % | 0.74 | -389.25 |
| Signals | tp 5.000% | sl 3.00× | tr off | 107 | 46 (43 %) | 333 | 69 % | 0.73 | -401.66 |
| Signals | tp 6.000% | sl 2.00× | tr off | 99 | 30 (30 %) | 276 | 57 % | 0.63 | -519.44 |
| Signals | tp 6.000% | sl 2.00× | tr 0.40× | 114 | 45 (39 %) | 576 | 71 % | 0.66 | -524.21 |
| Signals | tp 6.000% | sl 2.00× | tr 0.50× | 111 | 45 (41 %) | 473 | 71 % | 0.64 | -535.51 |
| Signals | tp 5.000% | sl 2.00× | tr 0.50× | 116 | 41 (35 %) | 664 | 65 % | 0.56 | -843.38 |
| Signals | tp 5.000% | sl 2.00× | tr off | 108 | 32 (30 %) | 429 | 55 % | 0.56 | -857.66 |
| Signals | tp 4.000% | sl 3.00× | tr off | 110 | 31 (28 %) | 483 | 65 % | 0.58 | -873.53 |
| Signals | tp 4.000% | sl 1.50× | tr off | 114 | 33 (29 %) | 752 | 50 % | 0.62 | -890.40 |
| Signals | tp 3.000% | sl 2.00× | tr off | 118 | 34 (29 %) | 900 | 58 % | 0.62 | -892.59 |
| Signals | tp 4.000% | sl 2.00× | tr 0.30× | 117 | 31 (26 %) | 1277 | 58 % | 0.56 | -894.83 |
| Signals | tp 2.500% | sl 3.00× | tr off | 118 | 37 (31 %) | 923 | 67 % | 0.61 | -897.99 |
| Signals | tp 6.000% | sl 1.50× | tr off | 108 | 27 (25 %) | 371 | 45 % | 0.52 | -898.44 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 35 (30 %) | 707 | 65 % | 0.58 | -938.80 |
| Signals | tp 2.500% | sl 1.50× | tr off | 120 | 26 (22 %) | 1357 | 51 % | 0.62 | -998.54 |
| Signals | tp 5.000% | sl 2.00× | tr 0.40× | 116 | 35 (30 %) | 784 | 63 % | 0.51 | -1000.79 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 28 (24 %) | 1191 | 58 % | 0.61 | -1004.09 |
| Signals | tp 5.000% | sl 2.00× | tr 0.30× | 116 | 39 (34 %) | 943 | 65 % | 0.50 | -1016.00 |
| Signals | tp 5.000% | sl 1.50× | tr off | 112 | 31 (28 %) | 544 | 47 % | 0.54 | -1018.84 |
| Signals | tp 4.000% | sl 2.00× | tr off | 111 | 29 (26 %) | 613 | 54 % | 0.55 | -1035.21 |
| Signals | tp 3.000% | sl 2.00× | tr 0.40× | 119 | 30 (25 %) | 1485 | 54 % | 0.53 | -1056.40 |
| Signals | tp 3.000% | sl 2.00× | tr 0.30× | 120 | 28 (23 %) | 1794 | 55 % | 0.50 | -1095.58 |
| Signals | tp 4.000% | sl 2.00× | tr 0.40× | 116 | 31 (27 %) | 1050 | 59 % | 0.47 | -1205.61 |
| Signals | tp 4.000% | sl 2.00× | tr 0.50× | 115 | 29 (25 %) | 922 | 59 % | 0.48 | -1209.77 |
| Signals | tp 3.000% | sl 2.00× | tr 0.50× | 119 | 29 (24 %) | 1280 | 56 % | 0.49 | -1235.73 |
| Signals | tp 3.000% | sl 1.50× | tr off | 120 | 26 (22 %) | 1136 | 48 % | 0.54 | -1275.79 |

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
