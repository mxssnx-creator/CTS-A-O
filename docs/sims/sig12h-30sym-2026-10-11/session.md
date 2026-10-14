# Simulated trading session — 30 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 5m, 5m+), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.39–$0.45 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-10T13:00 → 2026-10-11T01:00 UTC. Engine: Base 154/259 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 3/133 · PF 1.56 · Minimal 22/133 · PF 1.61 · Short 3/68 · PF 1.85 · General 4/68 · PF 1.77 · Long 6/68 · PF 1.62 · Signals 126/126 · PF 1.77; Main 36 pairs, 8230 tapes, Real seats: 168 engine configs + 1890 signal configs (every config of the active signals), compute 31 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $22.49 (12.43 %, closed orders) · equity at end $21.58 (open at end: 11 positions / 202 orders, MTM -$0.91 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 2.33 (gross profit $ ÷ gross loss $ as sized) · PF unit 2.26 (every order at one unit: the engine's PF) · 55 positions / 1647 orders (incl. 24 capped to $0) · WR 77.66 % · DDT (closed trades, $) 2.48 h · DDR 0.18 · equity max drawdown $0.78 (3.65 %) · margin used max $13.70 · open avg 8.63 pos / 130.07 orders (peak 13 / 305)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 24 orders capped to $0, 807 scaled down (open at end: 0 capped, 30 scaled) · binding: position cap 861, gross cap 0. **Without the caps:** balance $20.00 → $23.28 (16.39 %) · PF $ 2.26 · equity at end $22.32 · equity max drawdown $1.75 (7.98 %) · margin used max $19.96.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 3 | 28  | 21.1 % | 1.563 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 3 | 28 (+0) | 21.1 % | 1.563 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 3 | 28 (+0) | 21.1 % | 1.563 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 3 | 28 (+0) | 21.1 % | 1.563 |
| closes ≥ 6 | 1.00 | 6 | 1 | 6 | 33 (+5) | 24.8 % | 2.313 |
| closes ≥ 20 | 1.00 | 20 | 1 | 3 | 25 (-3) | 18.8 % | 1.563 |
| closes ≥ 30 | 1.00 | 30 | 1 | 2 | 19 (-9) | 14.3 % | 1.563 |
| DDR off | 1.00 | 12 | off | 15 | 51 (+23) | 38.3 % | 1.137 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 9 | 41 (+13) | 30.8 % | 1.289 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 2 | 17 (-11) | 12.8 % | 1.563 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 15 | 51 (+23) | 38.3 % | 1.137 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 20 | 58 (+30) | 43.6 % | 1.254 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 13:00 | 1 / 56 | 27 / 29 | 0.30 | 0.30 | 48 % | -$0.31 | $19.69 | $19.68 | $19.51 | 2.73 % | 0.57 | $1.56 | 3 / 16 |
| 14:00 | 8 / 75 | 66 / 9 | 3.76 | 3.81 | 88 % | $0.23 | $19.92 | $19.85 | $19.63 | 2.73 % | 1.57 | $2.37 | 8 / 40 |
| 15:00 | 5 / 46 | 34 / 12 | 7.51 | 7.52 | 74 % | $0.15 | $20.07 | $20.02 | $19.70 | 2.73 % | 0.07 | $5.08 | 9 / 148 |
| 16:00 | 6 / 136 | 86 / 50 | 2.10 | 2.09 | 63 % | $0.20 | $20.27 | $19.88 | $19.74 | 2.73 % | 0.72 | $7.34 | 11 / 187 |
| 17:00 | 2 / 90 | 84 / 6 | 84.90 | 92.41 | 93 % | $0.33 | $20.60 | $20.15 | $19.66 | 3.05 % | 0.43 | $7.77 | 12 / 241 |
| 18:00 | 6 / 471 | 367 / 104 | 2.52 | 2.81 | 78 % | $0.72 | $21.32 | $20.82 | $20.03 | 3.05 % | 0.20 | $9.36 | 14 / 239 |
| 19:00 | 5 / 123 | 94 / 29 | 0.97 | 1.06 | 76 % | -$0.01 | $21.31 | $20.85 | $20.66 | 3.05 % | 1.20 | $6.67 | 12 / 152 |
| 20:00 | 1 / 55 | 47 / 8 | 58.46 | 40.44 | 85 % | $0.22 | $21.53 | $21.17 | $20.83 | 3.05 % | 0.13 | $6.14 | 12 / 216 |
| 21:00 | 1 / 109 | 50 / 59 | 0.50 | 0.28 | 46 % | -$0.06 | $21.47 | $20.74 | $20.70 | 3.65 % | 1.13 | $8.99 | 15 / 300 |
| 22:00 | 3 / 91 | 79 / 12 | 2.85 | 4.03 | 87 % | $0.17 | $21.65 | $20.86 | $20.71 | 3.65 % | 2.13 | $8.30 | 14 / 240 |
| 23:00 | 3 / 54 | 45 / 9 | 3.95 | 1.71 | 83 % | $0.13 | $21.78 | $21.20 | $20.82 | 3.65 % | 3.13 | $8.74 | 13 / 240 |
| 00:00 | 7 / 341 | 300 / 41 | 6.11 | 7.45 | 88 % | $0.71 | $22.49 | $21.58 | $21.26 | 3.65 % | 0.75 | $13.70 | 11 / 202 |

**Last hour (00:00):** open at end: 11 positions / 202 orders, MTM -$0.91 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $21.58 = balance $22.49 + MTM -$0.91.

**Hours positive:** 9 of 12 full hours · flat 0 · negative 3

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m | 5m | 5m+ |
|---|---:|---:|---:|
| 13:00 | 27 · ∞ (no loss) · $0.13 | 29 · 0.00 · -$0.44 | – |
| 14:00 | 72 · 3.58 · $0.21 | 3 · ∞ (no loss) · $0.02 | – |
| 15:00 | 26 · 3.26 · $0.05 | 20 · ∞ (no loss) · $0.10 | – |
| 16:00 | 79 · 2.66 · $0.13 | 57 · 1.69 · $0.07 | – |
| 17:00 | 64 · 54.14 · $0.21 | 26 · ∞ (no loss) · $0.12 | – |
| 18:00 | 419 · 2.95 · $0.74 | 36 · ∞ (no loss) · $0.05 | 16 · 0.36 · -$0.06 |
| 19:00 | 112 · 0.80 · -$0.05 | 11 · 36.98 · $0.05 | – |
| 20:00 | 40 · 84.83 · $0.17 | 15 · 27.59 · $0.05 | – |
| 21:00 | 109 · 0.50 · -$0.06 | – | – |
| 22:00 | 91 · 2.85 · $0.17 | – | – |
| 23:00 | 37 · 2.80 · $0.08 | 17 · ∞ (no loss) · $0.05 | – |
| 00:00 | 263 · 6.19 · $0.59 | 78 · 5.70 · $0.12 | – |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|
| 13:00 | 56 | 31 · 0.23 · 42 % · -$0.20 | 25 · 0.39 · 56 % · -$0.11 | – | – |
| 14:00 | 75 | 33 · 3.83 · 91 % · $0.11 | 42 · 3.70 · 86 % · $0.12 | – | – |
| 15:00 | 46 | 22 · 4.88 · 91 % · $0.08 | 24 · 27.64 · 58 % · $0.07 | – | – |
| 16:00 | 136 | 51 · 1.24 · 78 % · $0.04 | 85 · 6.63 · 54 % · $0.16 | – | – |
| 17:00 | 90 | 25 · ∞ (no loss) · 100 % · $0.10 | 65 · 60.05 · 91 % · $0.23 | – | – |
| 18:00 | 471 | 197 · 2.91 · 87 % · $0.37 | 274 · 2.25 · 71 % · $0.36 | – | – |
| 19:00 | 123 | 60 · 0.69 · 72 % · -$0.06 | 63 · 1.53 · 81 % · $0.05 | – | – |
| 20:00 | 55 | 25 · ∞ (no loss) · 100 % · $0.11 | 30 · 28.91 · 73 % · $0.11 | – | – |
| 21:00 | 109 | 34 · 0.27 · 32 % · -$0.05 | 75 · 0.84 · 52 % · -$0.01 | – | – |
| 22:00 | 91 | 37 · 2.58 · 92 % · $0.08 | 54 · 3.17 · 83 % · $0.09 | – | – |
| 23:00 | 54 | 38 · 4.27 · 87 % · $0.09 | 16 · 3.41 · 75 % · $0.04 | – | – |
| 00:00 | 341 | 140 · 11.52 · 96 % · $0.38 | 201 · 4.18 · 82 % · $0.33 | – | – |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 133 engine pairs evaluated, 28 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (8230 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (330); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 13:00 | 3615 · 0.87 | 1387 · 0.75 | 2051 · 0.95 | 73 · 0.39 | 56 · 0.30 | 31 · 0.23 | 25 · 0.40 | – | – |
| 14:00 | 8894 · 1.92 | 3662 · 1.57 | 4894 · 2.40 | 192 · 9.50 | 75 · 3.81 | 33 · 3.86 | 42 · 3.75 | – | – |
| 15:00 | 8115 · 1.10 | 3003 · 1.26 | 4739 · 0.95 | 110 · 1.97 | 46 · 7.52 | 22 · 4.88 | 24 · 27.66 | – | – |
| 16:00 | 10577 · 2.24 | 3966 · 2.10 | 6203 · 2.48 | 285 · 1.20 | 136 · 2.09 | 51 · 1.29 | 85 · 5.65 | – | – |
| 17:00 | 5651 · 2.63 | 2243 · 2.46 | 3122 · 2.81 | 297 · 16.80 | 90 · 92.41 | 25 · ∞ (no loss) | 65 · 63.61 | – | – |
| 18:00 | 14438 · 1.60 | 5529 · 1.28 | 8453 · 2.00 | 428 · 8.76 | 471 · 2.81 | 197 · 3.03 | 274 · 2.62 | – | – |
| 19:00 | 8760 · 1.58 | 3832 · 1.55 | 4695 · 1.73 | 180 · 0.86 | 123 · 1.06 | 60 · 0.76 | 63 · 1.84 | – | – |
| 20:00 | 4007 · 2.10 | 1761 · 1.72 | 2085 · 2.77 | 58 · 1.95 | 55 · 40.44 | 25 · ∞ (no loss) | 30 · 20.29 | – | – |
| 21:00 | 5854 · 1.63 | 1871 · 1.54 | 3805 · 1.65 | 99 · 1.53 | 109 · 0.28 | 34 · 0.22 | 75 · 0.36 | – | – |
| 22:00 | 7253 · 1.80 | 3510 · 1.70 | 3551 · 2.15 | 191 · 1.72 | 91 · 4.03 | 37 · 3.53 | 54 · 4.64 | – | – |
| 23:00 | 4220 · 1.37 | 1747 · 1.76 | 2266 · 1.13 | 66 · 1.18 | 54 · 1.71 | 38 · 2.42 | 16 · 0.88 | – | – |
| 00:00 | 13066 · 1.32 | 4978 · 1.25 | 7489 · 1.44 | 403 · 2.21 | 341 · 7.45 | 140 · 8.57 | 201 · 6.55 | – | – |
| **total** | **94450 · 1.60** | **37489 · 1.51** | **53353 · 1.74** | **2382 · 2.44** | **1647 · 2.26** | **693 · 1.95** | **954 · 2.67** | **–** | **–** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 693 | 581 / 112 | 2.03 | 1.95 | $1.06 | 83.84 % | 2.62 |
| Trailing | 954 | 698 / 256 | 2.70 | 2.67 | $1.43 | 73.17 % | 1.62 |
| total | 1647 | 1279 / 368 | 2.33 | 2.26 | $2.49 | 77.66 % | 2.48 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Engine (no signals) | 1647 | 1279 / 368 | 2.33 | 2.26 | $2.49 | 77.66 % | 2.48 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m | 1339 | 2.99 | 2.52 | $2.38 |
| 5m | 292 | 1.30 | 1.74 | $0.17 |
| 5m+ | 16 | 0.36 | 0.36 | -$0.06 |

## Execution presets on the same tapes

| preset | orders | PF unit | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 1896 | 1.70 | 4243.42 |
| Trailing only | 1745 | 1.76 | 4303.74 |
| Normal off, Block + DCA | 1795 | 1.72 | 4297.74 |
| Normal off · Trailing + Block Active | 1745 | 1.76 | 4303.74 |
| Normal + Trailing + Block Active | 1745 | 1.76 | 4303.74 |
| Normal off · Trailing + Axis | 1745 | 1.76 | 4303.74 |
| Normal only | 805 | 1.44 | 216.06 |
| Normal + Trailing + Block | 1849 | 1.73 | 4253.42 |
| DCA only | 47 | 0.91 | -3.09 |
| Normal + DCA Active | 805 | 1.44 | 216.06 |
| Axis only | 0 | – | 0.00 |
| All on + Axis (no Active) | 1896 | 1.70 | 4243.42 |
| Normal + Trailing | 1849 | 1.66 | 559.60 |
| Block Active | 1745 | 1.76 | 4303.74 |
| DCA Active only | 0 | – | 0.00 |
| Normal off · Trailing + DCA | 1795 | 1.72 | 4297.74 |
| Normal + Axis | 805 | 1.44 | 216.06 |
| Block Active + DCA Active | 1745 | 1.76 | 4303.74 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Minimal | 1647 | 1279 / 368 | 2.33 | 2.26 | $2.49 | 77.66 % | 2.48 |
| Short | 0 | 0 / 0 | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Minimal | 1932 | symPf 1160 · lastN 571 · duplicate 177 · engineSide 24 |
| Signals | 675 | sig:confirm 429 · sig:signalValid 245 · sig:lastN 1 |
| Short | 6 | lastN 6 |

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
| Minimal | 1.61 | 2.26 | 1.40 | 2.33 | 1.03 | 1647 |
| Short | 1.85 | – | – | – | – | 0 |
| General | 1.77 | – | – | – | – | 0 |
| Long | 1.62 | – | – | – | – | 0 |
| Wide | 1.56 | – | – | – | – | 0 |
| Signals | 1.77 | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (95 of 1990 evaluated, 4450 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (100 units active at the run start, 133 over the run, 235 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | normal | 48 | 42 (88 %) | 1040 | 83 % | 1.78 | 476.80 |
| Minimal | trailing | 41 | 41 (100 %) | 1051 | 72 % | 1.78 | 373.93 |
| Short | normal | 2 | 0 (0 %) | 6 | 67 % | 0.84 | -1.20 |
| General | normal | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | normal | 119 | 110 (92 %) | 143 | 94 % | 8.82 | 420.90 |
| Signals | trailing | 116 | 103 (89 %) | 142 | 87 % | 22.92 | 408.96 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | break | 18 | 14 (78 %) | 112 | 73 % | 1.84 | 39.99 |
| Minimal | osc | 3 | 3 (100 %) | 156 | 71 % | 1.33 | 32.04 |
| Minimal | rsi | 68 | 66 (97 %) | 1823 | 79 % | 1.82 | 778.70 |
| Short | break | 2 | 0 (0 %) | 6 | 67 % | 0.84 | -1.20 |
| General | osc | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | signal:adx | 30 | 30 (100 %) | 42 | 100 % | ∞ (no loss) | 155.56 |
| Signals | signal:donchian | 30 | 28 (93 %) | 30 | 93 % | 139.43 | 84.75 |
| Signals | signal:ema-slope | 4 | 3 (75 %) | 4 | 75 % | 4.38 | 0.65 |
| Signals | signal:ema-trend | 30 | 29 (97 %) | 30 | 97 % | 1464.91 | 130.61 |
| Signals | signal:kama | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 2.30 |
| Signals | signal:mfi | 23 | 23 (100 %) | 23 | 100 % | ∞ (no loss) | 79.69 |
| Signals | signal:r-inside | 21 | 12 (57 %) | 21 | 57 % | 1.83 | 13.65 |
| Signals | signal:r-linreg | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 2.30 |
| Signals | signal:reclaim | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -49.85 |
| Signals | signal:s2-block-stack | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 |
| Signals | signal:s2-confluence | 56 | 55 (98 %) | 94 | 93 % | 52.32 | 274.39 |
| Signals | signal:vwap | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 2.30 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.08, general 1.12, long 1.18), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Minimal | 2340 | 1420 | 89 | 1.24 | 1.54 | 18.00–163.33 (median 18.00) | 0 | 237 | 135 | 450 | 146 | 188 | 160 | 8 | 7 | 0 | 0 | 0 | 920 |  |
| Short | 774 | 126 | 2 | 1.27 | 1.85 | 163.33–163.33 (median 163.33) | 0 | 38 | 4 | 64 | 12 | 0 | 4 | 0 | 2 | 0 | 0 | 0 | 648 |  |
| General | 330 | 90 | 4 | 1.46 | 2.62 | 163.33–163.33 (median 163.33) | 0 | 8 | 2 | 60 | 6 | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 240 |  |
| Long | 430 | 130 | 0 | 1.34 | – | 163.33–163.33 (median 163.33) | 0 | 20 | 20 | 61 | 10 | 13 | 6 | 0 | 0 | 0 | 0 | 0 | 300 |  |
| Wide | 576 | 224 | 0 | 0.00 | – | 18.00–163.33 (median 75.83) | 224 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 288 | 64 |  |
| Signals | 3780 | – | 100 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 100 units (pair × symbol × direction) active at the run start, 133 over the run; 235 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | normal | 794 | 509 (64 %) | 14987 | 77 % | 1.35 | 3321.20 |
| Minimal | trailing | 1546 | 905 (59 %) | 30604 | 66 % | 1.18 | 2900.15 |
| Short | normal | 258 | 182 (71 %) | 2344 | 75 % | 2.16 | 1984.80 |
| Short | trailing | 516 | 328 (64 %) | 5008 | 66 % | 1.88 | 3014.51 |
| General | normal | 198 | 98 (49 %) | 1396 | 48 % | 1.25 | 493.60 |
| General | trailing | 132 | 86 (65 %) | 952 | 70 % | 2.23 | 904.50 |
| Long | normal | 258 | 184 (71 %) | 1248 | 59 % | 2.12 | 2082.00 |
| Long | trailing | 172 | 128 (74 %) | 910 | 77 % | 3.33 | 1625.34 |
| Wide | axis | 288 | 2 (1 %) | 10 | 20 % | 0.33 | -2.51 |
| Wide | dca | 144 | 89 (62 %) | 2769 | 91 % | 1.33 | 647.37 |
| Wide | dca-active | 144 | 43 (30 %) | 829 | 53 % | 0.85 | -73.58 |
| Signals | normal | 1890 | 1268 (67 %) | 17514 | 75 % | 1.51 | 15041.95 |
| Signals | trailing | 1890 | 1455 (77 %) | 15879 | 80 % | 2.23 | 18649.67 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | break | 18 | 14 (78 %) | 112 | 73 % | 1.84 | 39.99 |
| Minimal | osc | 3 | 3 (100 %) | 156 | 71 % | 1.33 | 32.04 |
| Minimal | rsi | 68 | 66 (97 %) | 1823 | 79 % | 1.82 | 778.70 |
| Short | break | 2 | 0 (0 %) | 6 | 67 % | 0.84 | -1.20 |
| General | osc | 4 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | signal:adx | 30 | 30 (100 %) | 42 | 100 % | ∞ (no loss) | 155.56 |
| Signals | signal:donchian | 30 | 28 (93 %) | 30 | 93 % | 139.43 | 84.75 |
| Signals | signal:ema-slope | 4 | 3 (75 %) | 4 | 75 % | 4.38 | 0.65 |
| Signals | signal:ema-trend | 30 | 29 (97 %) | 30 | 97 % | 1464.91 | 130.61 |
| Signals | signal:kama | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 2.30 |
| Signals | signal:mfi | 23 | 23 (100 %) | 23 | 100 % | ∞ (no loss) | 79.69 |
| Signals | signal:r-inside | 21 | 12 (57 %) | 21 | 57 % | 1.83 | 13.65 |
| Signals | signal:r-linreg | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 2.30 |
| Signals | signal:reclaim | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -49.85 |
| Signals | signal:s2-block-stack | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 |
| Signals | signal:s2-confluence | 56 | 55 (98 %) | 94 | 93 % | 52.32 | 274.39 |
| Signals | signal:vwap | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 2.30 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | 1.1 | 75 | 73 (97 %) | 2065 | 78 % | 1.79 | 841.93 |
| Minimal | 1.25 | 74 | 72 (97 %) | 2016 | 78 % | 1.80 | 824.53 |
| Minimal | 1.35 | 69 | 67 (97 %) | 1905 | 78 % | 1.82 | 797.55 |
| Minimal | 1.5 | 57 | 57 (100 %) | 1636 | 78 % | 1.87 | 719.61 |
| Minimal | 1.75 | 55 | 55 (100 %) | 1598 | 78 % | 1.86 | 692.01 |
| Minimal | 2 | 42 | 42 (100 %) | 1256 | 78 % | 1.77 | 512.71 |
| Signals | 1.1 | 6 | 6 (100 %) | 9 | 100 % | ∞ (no loss) | 21.15 |
| Signals | 1.25 | 3 | 3 (100 %) | 5 | 100 % | ∞ (no loss) | 15.00 |
| Signals | 1.35 | 3 | 3 (100 %) | 5 | 100 % | ∞ (no loss) | 15.00 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Minimal | follow | rsi-mom-21-20@m1 | 20 | 20 (100 %) | 474 | 79 % | 3.19 | 304.94 | tp1.6 sl4.8 tr0 h960 mn (20 · ∞ (no loss) · 28.00) |
| Minimal | follow | rsi-mom-14-20@m5 | 29 | 27 (93 %) | 820 | 78 % | 1.58 | 282.31 | tp1.2 sl3.6 tr0 h192 mn (29 · 2.28 · 14.60) |
| Minimal | follow | rsi-mom-21-25@m1 | 6 | 6 (100 %) | 251 | 78 % | 1.65 | 95.20 | tp1.6 sl4.8 tr1.2 h1440 mn (42 · 2.22 · 24.76) |
| Minimal | follow | rsi-mom-14-15@m1 | 10 | 10 (100 %) | 212 | 83 % | 1.62 | 78.58 | tp1.6 sl4.8 tr0 h960 mn (19 · 2.38 · 13.80) |
| Minimal | revert | z-50-2.5@x4@m1 | 3 | 3 (100 %) | 156 | 71 % | 1.33 | 32.04 | tp1.6 sl4.8 tr0 h960 mn (49 · 1.43 · 17.40) |
| Minimal | follow | break-vol-2@x4@m1 | 4 | 4 (100 %) | 86 | 72 % | 2.09 | 31.19 | tp1.4 sl2.8 tr1.05 h960 mn (21 · 2.76 · 10.81) |
| Minimal | follow | rsi-mom-21-25@m5 | 2 | 2 (100 %) | 56 | 77 % | 1.39 | 16.52 | tp1.6 sl4 tr0 h288 mn (27 · 1.47 · 9.80) |
| Minimal | follow | break-atr-2@x4@m5c | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 10.80 | – |
| Minimal | follow | rsi-mom-21-20@m5 | 1 | 1 (100 %) | 10 | 70 % | 1.22 | 1.15 | tp1.6 sl4.8 tr0.8 h288 mn (10 · 1.22 · 1.15) |
| Minimal | follow | break-vol-2@x4@m15 | 6 | 2 (33 %) | 18 | 67 % | 0.89 | -2.00 | – |
| Short | follow | break-vol-2@x4@m15 | 2 | 0 (0 %) | 6 | 67 % | 0.84 | -1.20 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 29 (97 %) | 52 | 92 % | 60.53 | 168.32 | – |
| Signals | follow | sig-adx-s@m15 | 30 | 30 (100 %) | 42 | 100 % | ∞ (no loss) | 155.56 | – |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 | – |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 1464.91 | 130.61 | – |
| Signals | follow | sig-s2-confluence-s@m15 | 26 | 26 (100 %) | 42 | 93 % | 43.10 | 106.07 | – |
| Signals | follow | sig-donchian-s@m15 | 30 | 28 (93 %) | 30 | 93 % | 139.43 | 84.75 | – |
| Signals | follow | sig-mfi-m@m15 | 23 | 23 (100 %) | 23 | 100 % | ∞ (no loss) | 79.69 | – |
| Signals | follow | sig-r-inside-s@m15 | 21 | 12 (57 %) | 21 | 57 % | 1.83 | 13.65 | – |
| Signals | follow | sig-reclaim-s@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -49.85 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | tp 1.600% | sl 3.00× | tr off | 13 | 13 (100 %) | 268 | 88 % | 2.06 | 170.40 |
| Minimal | tp 1.200% | sl 3.00× | tr off | 6 | 6 (100 %) | 152 | 89 % | 2.24 | 75.20 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.75× | 6 | 6 (100 %) | 143 | 78 % | 1.97 | 70.63 |
| Minimal | tp 1.600% | sl 2.00× | tr off | 4 | 4 (100 %) | 96 | 85 % | 2.41 | 67.20 |
| Minimal | tp 1.600% | sl 2.00× | tr 0.75× | 4 | 4 (100 %) | 104 | 71 % | 2.43 | 56.34 |
| Minimal | tp 1.400% | sl 2.50× | tr 0.75× | 6 | 6 (100 %) | 150 | 75 % | 1.70 | 51.76 |
| Signals | tp 4.000% | sl 3.00× | tr off | 8 | 8 (100 %) | 10 | 100 % | ∞ (no loss) | 38.00 |
| Minimal | tp 1.400% | sl 3.00× | tr 0.75× | 4 | 4 (100 %) | 98 | 80 % | 1.72 | 35.41 |
| Minimal | tp 1.600% | sl 2.50× | tr off | 5 | 3 (60 %) | 85 | 82 % | 1.56 | 35.00 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 8 | 8 (100 %) | 11 | 100 % | ∞ (no loss) | 34.81 |
| Minimal | tp 1.400% | sl 2.50× | tr off | 4 | 4 (100 %) | 102 | 82 % | 1.51 | 34.20 |
| Minimal | tp 1.600% | sl 2.50× | tr 0.75× | 3 | 3 (100 %) | 87 | 72 % | 1.67 | 32.79 |
| Signals | tp 4.000% | sl 1.50× | tr off | 9 | 8 (89 %) | 11 | 91 % | 6.13 | 31.80 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 8 | 7 (88 %) | 11 | 91 % | 18.66 | 30.92 |
| Signals | tp 3.000% | sl 3.00× | tr off | 8 | 8 (100 %) | 11 | 100 % | ∞ (no loss) | 30.80 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.50× | 7 | 7 (100 %) | 206 | 67 % | 1.28 | 30.63 |
| Signals | tp 4.000% | sl 2.00× | tr off | 9 | 8 (89 %) | 11 | 91 % | 4.63 | 29.80 |
| Minimal | tp 1.400% | sl 2.00× | tr 0.75× | 3 | 3 (100 %) | 71 | 75 % | 2.08 | 28.87 |
| Minimal | tp 1.400% | sl 1.50× | tr 0.75× | 2 | 2 (100 %) | 52 | 69 % | 2.76 | 27.54 |
| Minimal | tp 1.400% | sl 3.00× | tr off | 4 | 4 (100 %) | 60 | 87 % | 1.77 | 27.20 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 8 | 7 (88 %) | 11 | 91 % | 15.99 | 26.25 |
| Signals | tp 3.000% | sl 1.50× | tr off | 9 | 8 (89 %) | 12 | 92 % | 6.55 | 26.10 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 9 | 7 (78 %) | 10 | 80 % | 13.97 | 25.22 |
| Signals | tp 3.000% | sl 2.00× | tr off | 9 | 8 (89 %) | 12 | 92 % | 4.97 | 24.60 |
| Minimal | tp 1.200% | sl 2.50× | tr off | 2 | 2 (100 %) | 58 | 86 % | 1.95 | 24.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 9 | 8 (89 %) | 12 | 92 % | 14.76 | 24.09 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 9 | 8 (89 %) | 12 | 75 % | 7.74 | 22.56 |
| Minimal | tp 1.200% | sl 1.50× | tr off | 2 | 2 (100 %) | 52 | 81 % | 2.10 | 22.00 |
| Signals | tp 2.500% | sl 1.50× | tr off | 12 | 10 (83 %) | 15 | 87 % | 3.78 | 22.00 |
| Signals | tp 2.500% | sl 2.00× | tr off | 9 | 8 (89 %) | 12 | 92 % | 4.87 | 20.10 |
| Minimal | tp 1.600% | sl 1.50× | tr 0.75× | 2 | 2 (100 %) | 50 | 64 % | 1.76 | 18.25 |
| Signals | tp 2.500% | sl 3.00× | tr off | 9 | 8 (89 %) | 12 | 92 % | 3.29 | 17.60 |
| Minimal | tp 1.600% | sl 2.00× | tr 0.50× | 2 | 2 (100 %) | 46 | 74 % | 2.55 | 12.13 |
| Minimal | tp 1.600% | sl 1.50× | tr off | 5 | 3 (60 %) | 80 | 69 % | 1.18 | 12.00 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 9 | 6 (67 %) | 14 | 57 % | 3.08 | 10.98 |
| Minimal | tp 1.400% | sl 2.00× | tr off | 1 | 1 (100 %) | 29 | 79 % | 1.53 | 9.60 |
| Minimal | tp 1.400% | sl 2.50× | tr 0.50× | 2 | 2 (100 %) | 44 | 68 % | 1.58 | 9.58 |
| Minimal | tp 1.400% | sl 1.50× | tr off | 2 | 0 (0 %) | 58 | 66 % | 0.99 | -0.40 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Minimal | normal | 16 (16) | 1440 | 792 | 792 | 0 | baseTarget 408 · baseRange 240 |
| Minimal | trailing | 16 (16) | 2880 | 1544 | 1544 | 0 | baseTarget 816 · baseRange 480 · duplicate 40 |
| Short | normal | 16 (7) | 1224 | 258 | 258 | 0 | baseRange 900 · baseTarget 66 |
| Short | trailing | 16 (7) | 2448 | 516 | 516 | 0 | baseRange 1800 · baseTarget 132 |
| General | normal | 16 (8) | 816 | 198 | 198 | 0 | baseRange 576 · baseTarget 42 |
| General | trailing | 16 (8) | 544 | 132 | 132 | 0 | baseRange 384 · baseTarget 28 |
| Long | normal | 16 (8) | 1020 | 258 | 258 | 0 | baseRange 660 · baseTarget 102 |
| Long | trailing | 16 (8) | 680 | 172 | 172 | 0 | baseRange 440 · baseTarget 68 |
| Wide | axis | 16 (16) | 288 | 288 | 288 | 0 | – |
| Wide | dca | 16 (16) | 144 | 144 | 144 | 0 | – |
| Wide | dca-active | 16 (16) | 144 | 144 | 144 | 0 | – |

Engine indications Base evaluated that built no set: 18 (act-chop@x4, dir-emax, dir-emax-12-26, dir-emax-5-13, dir-vwap-240, ema-50-100, ema-9-21, ema-slope, ema-stoch, hma-55, ichi-cloud-20, ichi-cloud-9, ichi-tk-9, macd-zero, r-connors-m, r-vol-regime-m, trend-ema-20-50, trend-ema-50-200).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Minimal — every config computed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 0.34 (592) | 0.71 (2239) | 0.80 (2429) | 1.00 (3158) | 1.23 (3549) |
| 2× | 0.41 (584) | 0.75 (2174) | 1.01 (2339) | 1.39 (2989) | 1.58 (3385) |
| 2.5× | 0.46 (572) | 0.94 (2120) | 1.23 (2290) | 1.60 (2867) | 1.75 (3362) |
| 3× | 0.70 (570) | 1.08 (2080) | 1.65 (2222) | 1.73 (2835) | 2.15 (3235) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | – | – | 2.10 (52) | 1.44 (110) | 1.34 (130) |
| 2× | – | – | – | 1.86 (100) | 2.43 (246) |
| 2.5× | – | – | 1.95 (58) | 1.61 (296) | 1.61 (172) |
| 3× | – | – | 2.24 (152) | 1.74 (158) | 1.80 (617) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | – | – | 0.63 (18) | 1.24 (56) | 1.14 (141) |
| 2× | – | – | 1.05 (62) | 2.67 (117) | 4.10 (169) |
| 2.5× | – | 4.47 (42) | 2.67 (111) | 1.99 (191) | 2.08 (154) |
| 3× | – | 4.42 (39) | 2.86 (146) | 2.94 (159) | 2.96 (242) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.66 (490) | 0.76 (460) | 1.12 (428) | 1.34 (414) | 1.28 (436) | 1.35 (398) |
| 1.5× | 1.19 (462) | 1.28 (434) | 1.93 (390) | 2.85 (382) | 3.13 (394) | 3.11 (362) |
| 2× | 2.01 (440) | 3.11 (410) | 4.02 (374) | 23.02 (360) | 8.60 (376) | 7.87 (342) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – |
| 2× | 0.84 (6) | – | – | – | – | – |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.76 (140) | 0.85 (132) | 0.86 (132) | 0.99 (122) |
| 0.75× | 0.92 (122) | 0.92 (118) | 1.00 (114) | 1.39 (108) |
| 1× | 1.52 (354) | 1.72 (346) | 2.75 (350) | 3.44 (310) |

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
| 0.5× | 0.96 (114) | 0.99 (112) | 1.24 (108) | 1.25 (108) | 1.44 (86) |
| 0.75× | 2.02 (96) | 2.52 (92) | 2.76 (78) | 3.43 (68) | 3.37 (52) |
| 1× | 3.93 (286) | 3.64 (272) | 4.01 (255) | 3.22 (245) | 2.78 (186) |

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
| 0.84× | 0.91 (664) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.89 (649) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.70 (146) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.97 (610) | 0.89 (146) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 1.03 (593) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 1.38 (139) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 1.76 (133) | – | – | – | – |
| 1× | – | – | – | 0.94 (103) | – | – | – | 2.73 (48) | 1.32 (101) | – | 3.63 (46) | – | 2.46 (93) | 2.43 (84) | 3.20 (31) | 3.40 (22) |

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
