# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m+, 5m, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.09–$0.45 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T12:00 → 2026-10-08T00:00 UTC. Engine: Base 1294/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 324/19072 · PF 1.55 · Micro 220/5900 · PF 2.26 · Short 646/8176 · PF 1.50 · General 499/8176 · PF 1.50 · Long 568/8176 · PF 1.50 · Signals 126/126; Main 1255 pairs, 236887 tapes, Real seats: 8132 engine configs + 3780 signal configs (every config of the active signals), compute 179 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $18.50 (-7.51 %, closed orders) · equity at end $14.37 (open at end: 35 positions / 2956 orders, MTM -$4.13 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 0.66 (gross profit $ ÷ gross loss $ as sized) · PF unit 0.36 (every order at one unit: the engine's PF) · 48 positions / 2489 orders (incl. 43 capped to $0) · WR 40.38 % · DDT (closed trades, $) 9.25 h · DDR – (net ≤ 0) · equity max drawdown $9.08 (38.81 %) · margin used max $15.04 · open avg 19.20 pos / 628.27 orders (peak 26 / 1196)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 43 orders capped to $0, 2117 scaled down (open at end: 83 capped, 2720 scaled) · binding: position cap 2744, gross cap 4394. **Without the caps:** balance $20.00 → $1.76 (-91.22 %) · PF $ 0.37 · equity at end -$20.14 · equity max drawdown $44.16 (188.39 %) · margin used max $106.77 · infeasible: margin exceeded equity for 598 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 405 | 1143  | 4.6 % | 1.529 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 405 | 1143 (+0) | 4.6 % | 1.529 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 405 | 1143 (+0) | 4.6 % | 1.529 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 362 | 1020 (-123) | 4.1 % | 1.586 |
| closes ≥ 6 | 1.00 | 6 | 1 | 575 | 1524 (+381) | 6.1 % | 1.699 |
| closes ≥ 20 | 1.00 | 20 | 1 | 288 | 862 (-281) | 3.5 % | 1.418 |
| closes ≥ 30 | 1.00 | 30 | 1 | 214 | 653 (-490) | 2.6 % | 1.349 |
| DDR off | 1.00 | 12 | off | 1438 | 2587 (+1444) | 10.4 % | 1.152 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 723 | 1666 (+523) | 6.7 % | 1.369 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 153 | 559 (-584) | 2.2 % | 1.872 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1438 | 2587 (+1444) | 10.4 % | 1.152 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1895 | 3151 (+2008) | 12.6 % | 1.187 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 4 / 75 | 55 / 20 | 3.21 | 3.23 | 73 % | $0.64 | $20.64 | $20.79 | $19.62 | 11.36 % | 0.28 | $8.38 | 14 / 296 |
| 13:00 | 0 / 55 | 53 / 2 | 327.92 | 403.99 | 96 % | $0.29 | $20.94 | $21.22 | $20.40 | 12.84 % | 1.28 | $12.22 | 17 / 530 |
| 14:00 | 3 / 97 | 85 / 12 | 15.00 | 11.46 | 88 % | $0.72 | $21.66 | $21.27 | $21.06 | 12.84 % | 2.28 | $14.83 | 18 / 730 |
| 15:00 | 4 / 113 | 62 / 51 | 0.24 | 0.37 | 55 % | -$0.46 | $21.20 | $20.12 | $19.51 | 16.64 % | 3.28 | $15.04 | 25 / 1306 |
| 16:00 | 2 / 119 | 53 / 66 | 0.55 | 0.64 | 45 % | -$0.04 | $21.16 | $20.22 | $19.32 | 17.44 % | 4.28 | $14.84 | 29 / 1633 |
| 17:00 | 1 / 182 | 147 / 35 | 1.35 | 4.56 | 81 % | $0.03 | $21.19 | $20.05 | $19.45 | 17.44 % | 5.28 | $14.87 | 30 / 1717 |
| 18:00 | 1 / 83 | 51 / 32 | 1.84 | 1.69 | 61 % | $0.01 | $21.20 | $19.22 | $19.02 | 18.72 % | 6.28 | $14.85 | 30 / 2062 |
| 19:00 | 1 / 142 | 61 / 81 | 0.30 | 0.44 | 43 % | -$0.11 | $21.09 | $18.96 | $18.51 | 20.89 % | 7.28 | $14.84 | 29 / 2418 |
| 20:00 | 0 / 462 | 108 / 354 | 0.72 | 0.26 | 23 % | -$0.06 | $21.03 | $17.83 | $17.81 | 23.91 % | 8.28 | $14.76 | 30 / 2588 |
| 21:00 | 0 / 425 | 148 / 277 | 0.72 | 0.33 | 35 % | -$0.10 | $20.93 | $17.57 | $17.30 | 26.08 % | 9.28 | $14.72 | 31 / 2449 |
| 22:00 | 2 / 456 | 122 / 334 | 0.07 | 0.19 | 27 % | -$1.56 | $19.37 | $15.19 | $15.19 | 35.11 % | 10.28 | $14.65 | 33 / 2757 |
| 23:00 | 0 / 280 | 60 / 220 | 0.03 | 0.05 | 21 % | -$0.87 | $18.50 | $14.37 | $14.32 | 38.81 % | 11.28 | $13.56 | 35 / 2956 |

**Last hour (23:00):** open at end: 35 positions / 2956 orders, MTM -$4.13 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $14.37 = balance $18.50 + MTM -$4.13.

**Hours positive:** 5 of 12 full hours · flat 0 · negative 7

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m+ | 5m | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 12:00 | 3 · 0.00 · -$0.02 | – | 61 · 8.97 · $0.83 | 11 · 0.00 · -$0.17 | – |
| 13:00 | – | – | 55 · 327.92 · $0.29 | – | – |
| 14:00 | – | – | 88 · 14.73 · $0.71 | 7 · ∞ (no loss) · $0.01 | 2 · ∞ (no loss) · $0.00 |
| 15:00 | 1 · – · $0.00 | – | 69 · 0.36 · -$0.22 | 33 · 0.06 · -$0.23 | 10 · 1.06 · $0.00 |
| 16:00 | 13 · – · $0.00 | – | 88 · 0.54 · -$0.04 | 11 · 0.28 · -$0.00 | 7 · 1.22 · $0.00 |
| 17:00 | – | – | 161 · 1.33 · $0.03 | 21 · 1274.96 · $0.00 | – |
| 18:00 | – | – | 65 · 3.60 · $0.01 | 14 · 0.20 · -$0.00 | 4 · 1.20 · $0.00 |
| 19:00 | – | – | 110 · 0.31 · -$0.11 | 26 · 0.08 · -$0.01 | 6 · 0.01 · -$0.00 |
| 20:00 | – | – | 289 · 1.05 · $0.01 | 157 · 0.00 · -$0.07 | 16 · 0.00 · -$0.00 |
| 21:00 | – | – | 278 · 0.67 · -$0.11 | 118 · 0.53 · -$0.01 | 29 · 20.81 · $0.02 |
| 22:00 | – | 3 · ∞ (no loss) · $0.00 | 297 · 0.06 · -$1.50 | 116 · 0.07 · -$0.06 | 40 · 0.53 · -$0.01 |
| 23:00 | – | – | 181 · 0.03 · -$0.81 | 83 · 0.01 · -$0.05 | 16 · 0.21 · -$0.01 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Axis, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Axis | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 75 | 3 · 0.72 · 33 % · -$0.01 | 9 · 0.00 · 0 % · -$0.13 | 3 · 0.00 · 0 % · -$0.02 | 30 · 3.92 · 83 % · $0.30 | 30 · 1339.94 · 97 % · $0.50 | – | 60 · 8.74 · 90 % · $0.81 |
| 13:00 | 55 | – | – | – | 33 · ∞ (no loss) · 100 % · $0.21 | 22 · 93.82 · 91 % · $0.08 | – | 55 · 327.92 · 96 % · $0.29 |
| 14:00 | 97 | – | 9 · ∞ (no loss) · 100 % · $0.01 | – | 36 · 8.44 · 89 % · $0.37 | 52 · 174.62 · 85 % · $0.34 | – | 88 · 14.73 · 86 % · $0.71 |
| 15:00 | 113 | 22 · 0.17 · 55 % · -$0.12 | 43 · 0.16 · 74 % · -$0.12 | 1 · – · 0 % · $0.00 | 25 · 0.16 · 16 % · -$0.21 | 22 · 0.85 · 64 % · -$0.01 | – | 47 · 0.31 · 38 % · -$0.22 |
| 16:00 | 119 | 14 · 0.68 · 43 % · -$0.00 | 33 · 2.42 · 55 % · $0.01 | 16 · 0.00 · 0 % · -$0.00 | 34 · 0.14 · 29 % · -$0.06 | 22 · 24.16 · 86 % · $0.02 | – | 56 · 0.38 · 52 % · -$0.04 |
| 17:00 | 182 | 12 · ∞ (no loss) · 100 % · $0.01 | 74 · 4741.10 · 82 % · $0.01 | 5 · ∞ (no loss) · 100 % · $0.00 | 56 · 0.82 · 79 % · -$0.02 | 35 · 45.57 · 71 % · $0.02 | – | 91 · 1.07 · 76 % · $0.01 |
| 18:00 | 83 | 14 · 2.74 · 57 % · $0.01 | 26 · 1.69 · 65 % · $0.00 | 3 · 0.00 · 0 % · -$0.00 | 2 · 0.00 · 0 % · -$0.00 | 38 · 2.62 · 68 % · $0.00 | – | 40 · 1.06 · 65 % · $0.00 |
| 19:00 | 142 | 28 · 0.10 · 14 % · -$0.01 | 27 · 0.11 · 15 % · -$0.00 | 3 · 0.00 · 0 % · -$0.00 | 54 · 0.31 · 61 % · -$0.08 | 30 · 0.33 · 67 % · -$0.02 | – | 84 · 0.32 · 63 % · -$0.10 |
| 20:00 | 462 | 161 · 0.00 · 0 % · -$0.06 | 155 · 0.00 · 0 % · -$0.06 | – | 113 · 1.39 · 66 % · $0.04 | 33 · ∞ (no loss) · 100 % · $0.01 | – | 146 · 1.50 · 74 % · $0.06 |
| 21:00 | 425 | 128 · 0.46 · 48 % · -$0.01 | 160 · 0.31 · 23 % · -$0.04 | – | 82 · 0.56 · 21 % · -$0.10 | 55 · 4.73 · 58 % · $0.06 | – | 137 · 0.84 · 36 % · -$0.04 |
| 22:00 | 456 | 87 · 0.06 · 5 % · -$0.05 | 187 · 0.14 · 30 % · -$0.08 | – | 82 · 0.08 · 28 % · -$0.42 | 100 · 0.06 · 39 % · -$1.01 | – | 182 · 0.06 · 34 % · -$1.42 |
| 23:00 | 280 | 53 · 0.00 · 0 % · -$0.15 | 96 · 0.05 · 20 % · -$0.04 | – | 55 · 0.04 · 36 % · -$0.42 | 76 · 0.02 · 28 % · -$0.26 | – | 131 · 0.03 · 31 % · -$0.67 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1168 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (236887 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (12896); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | 26374 · 0.64 | 6864 · 0.67 | 9172 · 0.85 | 1395 · 0.57 | 75 · 3.23 | 3 · 0.73 | 9 · 0.00 | – | 60 · 8.74 |
| 13:00 | 40006 · 0.57 | 7282 · 0.84 | 11704 · 0.85 | 1501 · 2.47 | 55 · 403.99 | – | – | – | 55 · 403.99 |
| 14:00 | 36582 · 2.07 | 10033 · 2.23 | 12993 · 2.25 | 2550 · 7.55 | 97 · 11.46 | – | 9 · ∞ (no loss) | – | 88 · 11.26 |
| 15:00 | 48129 · 1.68 | 13529 · 1.41 | 18252 · 1.89 | 4204 · 0.84 | 113 · 0.37 | 22 · 0.68 | 43 · 1.34 | – | 47 · 0.12 |
| 16:00 | 39604 · 1.24 | 8685 · 1.08 | 17480 · 1.66 | 1679 · 1.61 | 119 · 0.64 | 14 · 0.63 | 33 · 1.58 | – | 56 · 0.53 |
| 17:00 | 23379 · 1.79 | 5300 · 1.37 | 9262 · 1.66 | 1676 · 2.06 | 182 · 4.56 | 12 · ∞ (no loss) | 74 · 83.78 | – | 91 · 2.87 |
| 18:00 | 20975 · 1.38 | 3972 · 2.27 | 6521 · 1.60 | 1157 · 1.45 | 83 · 1.69 | 14 · 2.37 | 26 · 1.70 | – | 40 · 1.01 |
| 19:00 | 22254 · 0.74 | 6564 · 1.38 | 5836 · 0.63 | 1612 · 1.38 | 142 · 0.44 | 28 · 0.09 | 27 · 0.02 | – | 84 · 0.65 |
| 20:00 | 45980 · 0.63 | 16335 · 0.97 | 11642 · 0.48 | 3823 · 0.67 | 462 · 0.26 | 161 · 0.00 | 155 · 0.00 | – | 146 · 1.58 |
| 21:00 | 56283 · 0.66 | 17726 · 0.88 | 19330 · 0.68 | 4474 · 0.74 | 425 · 0.33 | 128 · 0.63 | 160 · 0.19 | – | 137 · 0.32 |
| 22:00 | 53482 · 0.42 | 16016 · 0.45 | 22299 · 0.42 | 5230 · 0.16 | 456 · 0.19 | 87 · 0.01 | 187 · 0.26 | – | 182 · 0.20 |
| 23:00 | 41293 · 0.42 | 9354 · 0.49 | 12724 · 0.31 | 2446 · 0.16 | 280 · 0.05 | 53 · 0.00 | 96 · 0.03 | – | 131 · 0.06 |
| **total** | **454341 · 0.83** | **121660 · 0.95** | **157215 · 0.82** | **31747 · 0.65** | **2489 · 0.36** | **522 · 0.19** | **819 · 0.22** | **–** | **1117 · 0.49** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 522 | 109 / 413 | 0.18 | 0.19 | -$0.40 | 20.88 % | 12.00 |
| Trailing | 819 | 253 / 566 | 0.19 | 0.22 | -$0.45 | 30.89 % | 12.00 |
| Axis | 31 | 5 / 26 | 0.19 | 0.89 | -$0.02 | 16.13 % | 11.80 |
| Signal · Normal | 602 | 316 / 286 | 0.80 | 0.50 | -$0.38 | 52.49 % | 9.25 |
| Signal · Trailing | 515 | 322 / 193 | 0.83 | 0.48 | -$0.25 | 62.52 % | 2.00 |
| total | 2489 | 1005 / 1484 | 0.66 | 0.36 | -$1.50 | 40.38 % | 9.25 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 1117 | 638 / 479 | 0.81 | 0.49 | -$0.64 | 57.12 % | 9.25 |
| of which Engine (no signals) | 1372 | 367 / 1005 | 0.19 | 0.21 | -$0.87 | 26.75 % | 12.00 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m+ | 17 | 0.00 | 0.00 | -$0.02 |
| 5m | 3 | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 15m | 1742 | 0.76 | 0.42 | -$0.90 |
| 15m+ | 597 | 0.07 | 0.16 | -$0.58 |
| 30m | 130 | 1.00 | 0.26 | $0.00 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 19 | 8 / 11 | 0.96 | 0.12 | -$0.00 | 42.11 % | 9.75 |
| Short | 925 | 279 / 646 | 0.18 | 0.24 | -$0.55 | 30.16 % | 12.00 |
| General | 259 | 56 / 203 | 0.14 | 0.18 | -$0.13 | 21.62 % | 12.00 |
| Long | 138 | 19 / 119 | 0.21 | 0.13 | -$0.17 | 13.77 % | 11.25 |
| Wide | 31 | 5 / 26 | 0.19 | 0.89 | -$0.02 | 16.13 % | 11.80 |
| Signals | 1117 | 638 / 479 | 0.81 | 0.49 | -$0.64 | 57.12 % | 9.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 36271 | sig:confirm 9835 · sig:signalPf 8316 · sig:signalSide 6917 · sig:signalCluster 6774 · sig:duplicate 4429 |
| Short | 10821 | lastN 6753 · duplicate 1816 · symPf 1487 · engineSide 765 |
| Long | 4643 | lastN 2962 · symPf 983 · engineSide 473 · duplicate 225 |
| General | 3510 | lastN 2326 · symPf 630 · engineSide 287 · duplicate 267 |
| Micro | 2094 | crowd 1132 · lastN 689 · engineSide 250 · symPf 23 |
| Wide | 874 | lastN 430 · symPf 250 · engineSide 188 · duplicate 6 |

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
| Micro | 2.26 | 0.12 | 0.05 | 0.96 | 7.81 | 19 |
| Short | 1.50 | 0.24 | 0.16 | 0.18 | 0.75 | 925 |
| General | 1.50 | 0.18 | 0.12 | 0.14 | 0.79 | 259 |
| Long | 1.50 | 0.13 | 0.08 | 0.21 | 1.68 | 138 |
| Wide | 1.55 | 0.89 | 0.57 | 0.19 | 0.22 | 31 |
| Signals | – | 0.49 | – | 0.81 | 1.65 | 1117 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (9634 of 194444 evaluated, 233107 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2273 units active at the run start, 2983 over the run, 3262 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 2160 | 243 (11 %) | 979 | 59 % | 0.23 | -632.76 |
| Micro | trailing | 832 | 61 (7 %) | 795 | 39 % | 0.11 | -862.34 |
| Short | normal | 1237 | 279 (23 %) | 2632 | 43 % | 0.48 | -2802.20 |
| Short | trailing | 2597 | 586 (23 %) | 4709 | 45 % | 0.50 | -3440.10 |
| General | normal | 497 | 94 (19 %) | 1159 | 32 % | 0.55 | -1060.50 |
| General | trailing | 443 | 93 (21 %) | 841 | 43 % | 0.49 | -880.94 |
| Long | normal | 821 | 231 (28 %) | 1252 | 57 % | 1.70 | 1593.40 |
| Long | trailing | 688 | 138 (20 %) | 508 | 70 % | 1.63 | 505.15 |
| Wide | axis | 359 | 42 (12 %) | 1233 | 34 % | 0.62 | -257.10 |
| Signals | normal | 1674 | 482 (29 %) | 9936 | 57 % | 0.61 | -11664.95 |
| Signals | trailing | 1588 | 799 (50 %) | 7703 | 71 % | 0.74 | -4756.57 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 2992 | 304 (10 %) | 1774 | 50 % | 0.16 | -1495.10 |
| Short | active | 89 | 4 (4 %) | 10 | 40 % | 0.69 | -2.23 |
| Short | bollinger | 148 | 30 (20 %) | 246 | 42 % | 0.23 | -342.71 |
| Short | break | 600 | 149 (25 %) | 515 | 57 % | 0.83 | -103.88 |
| Short | channel | 47 | 0 (0 %) | 13 | 23 % | 0.19 | -17.98 |
| Short | direction | 174 | 12 (7 %) | 985 | 23 % | 0.17 | -2015.28 |
| Short | ema | 329 | 1 (0 %) | 1583 | 21 % | 0.16 | -3459.00 |
| Short | ichimoku | 38 | 3 (8 %) | 305 | 30 % | 0.30 | -425.87 |
| Short | macd | 46 | 16 (35 %) | 103 | 60 % | 1.52 | 39.94 |
| Short | move | 699 | 99 (14 %) | 463 | 55 % | 0.88 | -65.31 |
| Short | osc | 576 | 166 (29 %) | 802 | 65 % | 1.16 | 125.03 |
| Short | rsi | 185 | 28 (15 %) | 50 | 56 % | 1.00 | -0.32 |
| Short | sar | 41 | 0 (0 %) | 18 | 0 % | 0.00 | -58.01 |
| Short | smooth | 59 | 34 (58 %) | 255 | 59 % | 0.89 | -32.24 |
| Short | trend | 568 | 272 (48 %) | 1670 | 60 % | 1.12 | 213.27 |
| Short | volume | 235 | 51 (22 %) | 323 | 57 % | 0.76 | -97.71 |
| General | active | 40 | 2 (5 %) | 4 | 50 % | 0.35 | -2.85 |
| General | bollinger | 32 | 4 (13 %) | 139 | 32 % | 0.40 | -188.35 |
| General | break | 103 | 28 (27 %) | 280 | 42 % | 0.78 | -105.45 |
| General | channel | 26 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 59 | 6 (10 %) | 284 | 17 % | 0.20 | -634.47 |
| General | ema | 98 | 1 (1 %) | 396 | 14 % | 0.12 | -990.93 |
| General | ichimoku | 10 | 4 (40 %) | 4 | 100 % | ∞ (no loss) | 0.95 |
| General | macd | 5 | 4 (80 %) | 15 | 60 % | 1.09 | 2.62 |
| General | move | 132 | 7 (5 %) | 91 | 41 % | 0.57 | -88.61 |
| General | osc | 128 | 58 (45 %) | 223 | 64 % | 2.05 | 249.44 |
| General | rsi | 43 | 2 (5 %) | 10 | 20 % | 0.29 | -20.60 |
| General | sar | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 20 | 4 (20 %) | 86 | 43 % | 0.62 | -60.79 |
| General | trend | 160 | 58 (36 %) | 336 | 47 % | 0.81 | -90.19 |
| General | volume | 82 | 9 (11 %) | 132 | 50 % | 0.94 | -12.22 |
| Long | active | 52 | 1 (2 %) | 2 | 50 % | 0.85 | -0.80 |
| Long | bollinger | 10 | 0 (0 %) | 32 | 38 % | 0.50 | -42.67 |
| Long | break | 152 | 72 (47 %) | 333 | 60 % | 1.60 | 383.44 |
| Long | channel | 29 | 0 (0 %) | 1 | 0 % | 0.00 | -4.10 |
| Long | direction | 80 | 14 (18 %) | 306 | 36 % | 0.71 | -209.95 |
| Long | ema | 19 | 1 (5 %) | 63 | 8 % | 0.13 | -183.20 |
| Long | ichimoku | 6 | 4 (67 %) | 20 | 55 % | 1.34 | 15.10 |
| Long | macd | 21 | 13 (62 %) | 66 | 67 % | 2.11 | 128.11 |
| Long | move | 335 | 7 (2 %) | 85 | 46 % | 0.63 | -85.79 |
| Long | osc | 354 | 165 (47 %) | 483 | 81 % | 4.25 | 1570.91 |
| Long | rsi | 73 | 10 (14 %) | 15 | 67 % | 0.60 | -9.61 |
| Long | sar | 31 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 29 | 11 (38 %) | 23 | 74 % | 7.10 | 75.64 |
| Long | trend | 200 | 61 (31 %) | 290 | 68 % | 1.90 | 381.88 |
| Long | volume | 118 | 10 (8 %) | 41 | 71 % | 2.39 | 79.59 |
| Wide | active | 27 | 0 (0 %) | 9 | 0 % | 0.00 | -7.69 |
| Wide | bollinger | 56 | 0 (0 %) | 488 | 33 % | 0.58 | -104.71 |
| Wide | break | 12 | 3 (25 %) | 18 | 50 % | 1.06 | 0.40 |
| Wide | channel | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 14 | 0 (0 %) | 39 | 46 % | 0.76 | -6.16 |
| Wide | ema | 6 | 0 (0 %) | 24 | 0 % | 0.00 | -36.96 |
| Wide | macd | 8 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 61 | 7 (11 %) | 52 | 37 % | 0.43 | -22.19 |
| Wide | osc | 77 | 6 (8 %) | 506 | 33 % | 0.59 | -102.55 |
| Wide | rsi | 15 | 6 (40 %) | 9 | 67 % | 0.65 | -0.57 |
| Wide | sar | 15 | 0 (0 %) | 3 | 0 % | 0.00 | -1.08 |
| Wide | trend | 36 | 17 (47 %) | 49 | 67 % | 2.36 | 34.99 |
| Wide | volume | 23 | 3 (13 %) | 36 | 25 % | 0.56 | -10.58 |
| Signals | signal:act-burst | 58 | 48 (83 %) | 344 | 83 % | 2.32 | 493.01 |
| Signals | signal:act-hf | 59 | 22 (37 %) | 444 | 63 % | 0.73 | -307.20 |
| Signals | signal:adx | 60 | 21 (35 %) | 273 | 63 % | 0.66 | -266.95 |
| Signals | signal:atr-break | 56 | 42 (75 %) | 358 | 77 % | 1.73 | 381.14 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 363 | 56 % | 0.52 | -698.28 |
| Signals | signal:cci | 59 | 2 (3 %) | 423 | 59 % | 0.52 | -740.27 |
| Signals | signal:cmf | 54 | 5 (9 %) | 271 | 45 % | 0.25 | -883.75 |
| Signals | signal:donchian | 53 | 27 (51 %) | 201 | 68 % | 0.90 | -49.48 |
| Signals | signal:ema-cross | 51 | 46 (90 %) | 158 | 91 % | 7.29 | 366.46 |
| Signals | signal:ema-cross-fast | 59 | 50 (85 %) | 345 | 82 % | 1.99 | 398.80 |
| Signals | signal:ema-pullback | 59 | 18 (31 %) | 396 | 67 % | 0.67 | -305.75 |
| Signals | signal:ema-slope | 54 | 20 (37 %) | 224 | 72 % | 0.86 | -68.89 |
| Signals | signal:ema-trend | 59 | 26 (44 %) | 429 | 67 % | 0.74 | -279.82 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 458 | 56 % | 0.45 | -866.84 |
| Signals | signal:hma | 54 | 13 (24 %) | 367 | 60 % | 0.64 | -360.48 |
| Signals | signal:ichimoku | 58 | 32 (55 %) | 203 | 68 % | 0.90 | -47.84 |
| Signals | signal:impulse | 57 | 5 (9 %) | 310 | 45 % | 0.29 | -904.41 |
| Signals | signal:kama | 56 | 16 (29 %) | 531 | 65 % | 0.67 | -441.57 |
| Signals | signal:keltner | 50 | 28 (56 %) | 156 | 69 % | 1.24 | 71.69 |
| Signals | signal:macd-cross | 57 | 9 (16 %) | 341 | 59 % | 0.48 | -607.34 |
| Signals | signal:macd-hist | 59 | 20 (34 %) | 459 | 66 % | 0.72 | -332.81 |
| Signals | signal:macd-slow | 57 | 10 (18 %) | 350 | 61 % | 0.51 | -577.57 |
| Signals | signal:mfi | 30 | 29 (97 %) | 51 | 92 % | 8.11 | 117.68 |
| Signals | signal:obv | 60 | 48 (80 %) | 443 | 77 % | 1.66 | 404.59 |
| Signals | signal:r-awesome | 56 | 13 (23 %) | 282 | 52 % | 0.42 | -536.04 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 116 | 64 % | 0.51 | -186.50 |
| Signals | signal:r-fractal | 45 | 14 (31 %) | 117 | 46 % | 0.29 | -289.29 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -120.60 |
| Signals | signal:r-linreg | 60 | 14 (23 %) | 408 | 57 % | 0.49 | -639.10 |
| Signals | signal:r-nr-break | 46 | 2 (4 %) | 236 | 40 % | 0.24 | -827.46 |
| Signals | signal:r-session-trend | 60 | 15 (25 %) | 384 | 57 % | 0.50 | -670.13 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 69 | 87 % | 7.14 | 210.19 |
| Signals | signal:reclaim | 60 | 21 (35 %) | 530 | 68 % | 0.74 | -343.32 |
| Signals | signal:rsi-mid | 55 | 10 (18 %) | 311 | 47 % | 0.29 | -770.78 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 29 | 8 (28 %) | 32 | 31 % | 0.08 | -149.56 |
| Signals | signal:s2-active-hf | 54 | 31 (57 %) | 475 | 69 % | 1.08 | 67.74 |
| Signals | signal:s2-adx-gate | 58 | 27 (47 %) | 381 | 72 % | 0.89 | -91.62 |
| Signals | signal:s2-atr-break | 57 | 6 (11 %) | 301 | 47 % | 0.32 | -790.77 |
| Signals | signal:s2-bb-bounce | 60 | 35 (58 %) | 307 | 62 % | 0.86 | -114.45 |
| Signals | signal:s2-block-scale | 58 | 19 (33 %) | 420 | 64 % | 0.57 | -476.48 |
| Signals | signal:s2-block-stack | 54 | 15 (28 %) | 299 | 63 % | 0.64 | -327.36 |
| Signals | signal:s2-confluence | 59 | 17 (29 %) | 533 | 64 % | 0.75 | -293.68 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 |
| Signals | signal:s2-range-break | 45 | 33 (73 %) | 62 | 81 % | 1.60 | 58.77 |
| Signals | signal:s2-range-shift | 53 | 13 (25 %) | 181 | 49 % | 0.37 | -450.07 |
| Signals | signal:s2-rsi-revert | 52 | 27 (52 %) | 108 | 56 % | 0.54 | -148.36 |
| Signals | signal:s2-st-trail | 46 | 31 (67 %) | 69 | 71 % | 1.11 | 12.50 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 471 | 78 % | 1.88 | 587.43 |
| Signals | signal:s2-vol-break | 52 | 30 (58 %) | 109 | 73 % | 0.91 | -22.62 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 59 | 15 (25 %) | 497 | 65 % | 0.73 | -344.05 |
| Signals | signal:squeeze | 45 | 11 (24 %) | 45 | 24 % | 0.03 | -333.69 |
| Signals | signal:st-slow | 42 | 17 (40 %) | 69 | 52 % | 0.43 | -108.43 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 556 | 62 % | 0.57 | -584.50 |
| Signals | signal:supertrend | 53 | 40 (75 %) | 232 | 79 % | 1.37 | 130.97 |
| Signals | signal:swing | 58 | 2 (3 %) | 454 | 56 % | 0.39 | -931.59 |
| Signals | signal:thrust | 55 | 2 (4 %) | 390 | 49 % | 0.29 | -1099.42 |
| Signals | signal:trix | 55 | 16 (29 %) | 145 | 56 % | 0.39 | -315.80 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 26 (43 %) | 325 | 68 % | 0.80 | -142.86 |
| Signals | signal:williams-r | 60 | 15 (25 %) | 404 | 61 % | 0.69 | -398.43 |
| Signals | signal:zscore | 60 | 0 (0 %) | 279 | 51 % | 0.37 | -803.44 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 5 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 80954 | 68918 | 2992 | 0.84 | 2.87 | 75.83–163.33 (median 163.33) | 16344 | 32803 | 1498 | 3496 | 8529 | 138 | 1926 | 208 | 984 | 0 | 0 | 0 | 12036 |  |
| Short | 47396 | 40484 | 3834 | 1.31 | 1.91 | 163.33–163.33 (median 163.33) | 4359 | 5856 | 1834 | 7792 | 4765 | 4138 | 7196 | 190 | 520 | 0 | 0 | 0 | 6912 |  |
| General | 15900 | 13340 | 940 | 1.32 | 1.68 | 163.33–163.33 (median 163.33) | 1430 | 1540 | 625 | 2408 | 1718 | 1532 | 2882 | 0 | 163 | 102 | 0 | 0 | 2560 |  |
| Long | 22342 | 19142 | 1509 | 1.29 | 1.91 | 163.33–163.33 (median 163.33) | 2030 | 3032 | 948 | 3614 | 1977 | 1983 | 3706 | 0 | 259 | 84 | 0 | 0 | 3200 |  |
| Wide | 66515 | 52560 | 359 | 0.60 | 2.15 | 18.00–163.33 (median 163.33) | 13425 | 33025 | 789 | 3060 | 825 | 153 | 752 | 0 | 133 | 39 | 0 | 10040 | 3915 |  |
| Signals | 3780 | – | 2273 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2273 units (pair × symbol × direction) active at the run start, 2983 over the run; 3262 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 27000 | 2822 (10 %) | 17352 | 65 % | 0.37 | -5430.75 |
| Micro | trailing | 53954 | 5246 (10 %) | 35142 | 58 % | 0.34 | -10779.80 |
| Short | normal | 15800 | 4273 (27 %) | 37707 | 57 % | 0.82 | -9670.10 |
| Short | trailing | 31596 | 8303 (26 %) | 80246 | 54 % | 0.74 | -25079.11 |
| General | normal | 9518 | 2293 (24 %) | 21531 | 43 % | 0.97 | -924.00 |
| General | trailing | 6382 | 1569 (25 %) | 12628 | 51 % | 0.82 | -3956.31 |
| Long | normal | 13436 | 3017 (22 %) | 23598 | 47 % | 1.17 | 8420.30 |
| Long | trailing | 8906 | 1769 (20 %) | 12208 | 54 % | 0.82 | -5440.53 |
| Wide | axis | 56475 | 9082 (16 %) | 153815 | 30 % | 0.69 | -35972.91 |
| Wide | dca | 5020 | 1258 (25 %) | 13690 | 61 % | 0.65 | -7568.80 |
| Wide | dca-active | 5020 | 593 (12 %) | 7961 | 28 % | 0.47 | -4204.47 |
| Signals | normal | 1890 | 914 (48 %) | 21472 | 66 % | 0.95 | -2395.65 |
| Signals | trailing | 1890 | 1224 (65 %) | 16991 | 76 % | 1.39 | 11187.64 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 2992 | 304 (10 %) | 1774 | 50 % | 0.16 | -1495.10 |
| Short | active | 89 | 4 (4 %) | 10 | 40 % | 0.69 | -2.23 |
| Short | bollinger | 148 | 30 (20 %) | 246 | 42 % | 0.23 | -342.71 |
| Short | break | 600 | 149 (25 %) | 515 | 57 % | 0.83 | -103.88 |
| Short | channel | 47 | 0 (0 %) | 13 | 23 % | 0.19 | -17.98 |
| Short | direction | 174 | 12 (7 %) | 985 | 23 % | 0.17 | -2015.28 |
| Short | ema | 329 | 1 (0 %) | 1583 | 21 % | 0.16 | -3459.00 |
| Short | ichimoku | 38 | 3 (8 %) | 305 | 30 % | 0.30 | -425.87 |
| Short | macd | 46 | 16 (35 %) | 103 | 60 % | 1.52 | 39.94 |
| Short | move | 699 | 99 (14 %) | 463 | 55 % | 0.88 | -65.31 |
| Short | osc | 576 | 166 (29 %) | 802 | 65 % | 1.16 | 125.03 |
| Short | rsi | 185 | 28 (15 %) | 50 | 56 % | 1.00 | -0.32 |
| Short | sar | 41 | 0 (0 %) | 18 | 0 % | 0.00 | -58.01 |
| Short | smooth | 59 | 34 (58 %) | 255 | 59 % | 0.89 | -32.24 |
| Short | trend | 568 | 272 (48 %) | 1670 | 60 % | 1.12 | 213.27 |
| Short | volume | 235 | 51 (22 %) | 323 | 57 % | 0.76 | -97.71 |
| General | active | 40 | 2 (5 %) | 4 | 50 % | 0.35 | -2.85 |
| General | bollinger | 32 | 4 (13 %) | 139 | 32 % | 0.40 | -188.35 |
| General | break | 103 | 28 (27 %) | 280 | 42 % | 0.78 | -105.45 |
| General | channel | 26 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 59 | 6 (10 %) | 284 | 17 % | 0.20 | -634.47 |
| General | ema | 98 | 1 (1 %) | 396 | 14 % | 0.12 | -990.93 |
| General | ichimoku | 10 | 4 (40 %) | 4 | 100 % | ∞ (no loss) | 0.95 |
| General | macd | 5 | 4 (80 %) | 15 | 60 % | 1.09 | 2.62 |
| General | move | 132 | 7 (5 %) | 91 | 41 % | 0.57 | -88.61 |
| General | osc | 128 | 58 (45 %) | 223 | 64 % | 2.05 | 249.44 |
| General | rsi | 43 | 2 (5 %) | 10 | 20 % | 0.29 | -20.60 |
| General | sar | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 20 | 4 (20 %) | 86 | 43 % | 0.62 | -60.79 |
| General | trend | 160 | 58 (36 %) | 336 | 47 % | 0.81 | -90.19 |
| General | volume | 82 | 9 (11 %) | 132 | 50 % | 0.94 | -12.22 |
| Long | active | 52 | 1 (2 %) | 2 | 50 % | 0.85 | -0.80 |
| Long | bollinger | 10 | 0 (0 %) | 32 | 38 % | 0.50 | -42.67 |
| Long | break | 152 | 72 (47 %) | 333 | 60 % | 1.60 | 383.44 |
| Long | channel | 29 | 0 (0 %) | 1 | 0 % | 0.00 | -4.10 |
| Long | direction | 80 | 14 (18 %) | 306 | 36 % | 0.71 | -209.95 |
| Long | ema | 19 | 1 (5 %) | 63 | 8 % | 0.13 | -183.20 |
| Long | ichimoku | 6 | 4 (67 %) | 20 | 55 % | 1.34 | 15.10 |
| Long | macd | 21 | 13 (62 %) | 66 | 67 % | 2.11 | 128.11 |
| Long | move | 335 | 7 (2 %) | 85 | 46 % | 0.63 | -85.79 |
| Long | osc | 354 | 165 (47 %) | 483 | 81 % | 4.25 | 1570.91 |
| Long | rsi | 73 | 10 (14 %) | 15 | 67 % | 0.60 | -9.61 |
| Long | sar | 31 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 29 | 11 (38 %) | 23 | 74 % | 7.10 | 75.64 |
| Long | trend | 200 | 61 (31 %) | 290 | 68 % | 1.90 | 381.88 |
| Long | volume | 118 | 10 (8 %) | 41 | 71 % | 2.39 | 79.59 |
| Wide | active | 27 | 0 (0 %) | 9 | 0 % | 0.00 | -7.69 |
| Wide | bollinger | 56 | 0 (0 %) | 488 | 33 % | 0.58 | -104.71 |
| Wide | break | 12 | 3 (25 %) | 18 | 50 % | 1.06 | 0.40 |
| Wide | channel | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 14 | 0 (0 %) | 39 | 46 % | 0.76 | -6.16 |
| Wide | ema | 6 | 0 (0 %) | 24 | 0 % | 0.00 | -36.96 |
| Wide | macd | 8 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 61 | 7 (11 %) | 52 | 37 % | 0.43 | -22.19 |
| Wide | osc | 77 | 6 (8 %) | 506 | 33 % | 0.59 | -102.55 |
| Wide | rsi | 15 | 6 (40 %) | 9 | 67 % | 0.65 | -0.57 |
| Wide | sar | 15 | 0 (0 %) | 3 | 0 % | 0.00 | -1.08 |
| Wide | trend | 36 | 17 (47 %) | 49 | 67 % | 2.36 | 34.99 |
| Wide | volume | 23 | 3 (13 %) | 36 | 25 % | 0.56 | -10.58 |
| Signals | signal:act-burst | 58 | 48 (83 %) | 344 | 83 % | 2.32 | 493.01 |
| Signals | signal:act-hf | 59 | 22 (37 %) | 444 | 63 % | 0.73 | -307.20 |
| Signals | signal:adx | 60 | 21 (35 %) | 273 | 63 % | 0.66 | -266.95 |
| Signals | signal:atr-break | 56 | 42 (75 %) | 358 | 77 % | 1.73 | 381.14 |
| Signals | signal:bollinger | 60 | 2 (3 %) | 363 | 56 % | 0.52 | -698.28 |
| Signals | signal:cci | 59 | 2 (3 %) | 423 | 59 % | 0.52 | -740.27 |
| Signals | signal:cmf | 54 | 5 (9 %) | 271 | 45 % | 0.25 | -883.75 |
| Signals | signal:donchian | 53 | 27 (51 %) | 201 | 68 % | 0.90 | -49.48 |
| Signals | signal:ema-cross | 51 | 46 (90 %) | 158 | 91 % | 7.29 | 366.46 |
| Signals | signal:ema-cross-fast | 59 | 50 (85 %) | 345 | 82 % | 1.99 | 398.80 |
| Signals | signal:ema-pullback | 59 | 18 (31 %) | 396 | 67 % | 0.67 | -305.75 |
| Signals | signal:ema-slope | 54 | 20 (37 %) | 224 | 72 % | 0.86 | -68.89 |
| Signals | signal:ema-trend | 59 | 26 (44 %) | 429 | 67 % | 0.74 | -279.82 |
| Signals | signal:heikin-ashi | 53 | 4 (8 %) | 458 | 56 % | 0.45 | -866.84 |
| Signals | signal:hma | 54 | 13 (24 %) | 367 | 60 % | 0.64 | -360.48 |
| Signals | signal:ichimoku | 58 | 32 (55 %) | 203 | 68 % | 0.90 | -47.84 |
| Signals | signal:impulse | 57 | 5 (9 %) | 310 | 45 % | 0.29 | -904.41 |
| Signals | signal:kama | 56 | 16 (29 %) | 531 | 65 % | 0.67 | -441.57 |
| Signals | signal:keltner | 50 | 28 (56 %) | 156 | 69 % | 1.24 | 71.69 |
| Signals | signal:macd-cross | 57 | 9 (16 %) | 341 | 59 % | 0.48 | -607.34 |
| Signals | signal:macd-hist | 59 | 20 (34 %) | 459 | 66 % | 0.72 | -332.81 |
| Signals | signal:macd-slow | 57 | 10 (18 %) | 350 | 61 % | 0.51 | -577.57 |
| Signals | signal:mfi | 30 | 29 (97 %) | 51 | 92 % | 8.11 | 117.68 |
| Signals | signal:obv | 60 | 48 (80 %) | 443 | 77 % | 1.66 | 404.59 |
| Signals | signal:r-awesome | 56 | 13 (23 %) | 282 | 52 % | 0.42 | -536.04 |
| Signals | signal:r-connors | 40 | 18 (45 %) | 116 | 64 % | 0.51 | -186.50 |
| Signals | signal:r-fractal | 45 | 14 (31 %) | 117 | 46 % | 0.29 | -289.29 |
| Signals | signal:r-inside | 14 | 0 (0 %) | 18 | 0 % | 0.00 | -120.60 |
| Signals | signal:r-linreg | 60 | 14 (23 %) | 408 | 57 % | 0.49 | -639.10 |
| Signals | signal:r-nr-break | 46 | 2 (4 %) | 236 | 40 % | 0.24 | -827.46 |
| Signals | signal:r-session-trend | 60 | 15 (25 %) | 384 | 57 % | 0.50 | -670.13 |
| Signals | signal:r-vol-regime | 42 | 38 (90 %) | 69 | 87 % | 7.14 | 210.19 |
| Signals | signal:reclaim | 60 | 21 (35 %) | 530 | 68 % | 0.74 | -343.32 |
| Signals | signal:rsi-mid | 55 | 10 (18 %) | 311 | 47 % | 0.29 | -770.78 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 29 | 8 (28 %) | 32 | 31 % | 0.08 | -149.56 |
| Signals | signal:s2-active-hf | 54 | 31 (57 %) | 475 | 69 % | 1.08 | 67.74 |
| Signals | signal:s2-adx-gate | 58 | 27 (47 %) | 381 | 72 % | 0.89 | -91.62 |
| Signals | signal:s2-atr-break | 57 | 6 (11 %) | 301 | 47 % | 0.32 | -790.77 |
| Signals | signal:s2-bb-bounce | 60 | 35 (58 %) | 307 | 62 % | 0.86 | -114.45 |
| Signals | signal:s2-block-scale | 58 | 19 (33 %) | 420 | 64 % | 0.57 | -476.48 |
| Signals | signal:s2-block-stack | 54 | 15 (28 %) | 299 | 63 % | 0.64 | -327.36 |
| Signals | signal:s2-confluence | 59 | 17 (29 %) | 533 | 64 % | 0.75 | -293.68 |
| Signals | signal:s2-ema-cross | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 |
| Signals | signal:s2-range-break | 45 | 33 (73 %) | 62 | 81 % | 1.60 | 58.77 |
| Signals | signal:s2-range-shift | 53 | 13 (25 %) | 181 | 49 % | 0.37 | -450.07 |
| Signals | signal:s2-rsi-revert | 52 | 27 (52 %) | 108 | 56 % | 0.54 | -148.36 |
| Signals | signal:s2-st-trail | 46 | 31 (67 %) | 69 | 71 % | 1.11 | 12.50 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 471 | 78 % | 1.88 | 587.43 |
| Signals | signal:s2-vol-break | 52 | 30 (58 %) | 109 | 73 % | 0.91 | -22.62 |
| Signals | signal:s2-vwap-axis | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -13.85 |
| Signals | signal:sar | 59 | 15 (25 %) | 497 | 65 % | 0.73 | -344.05 |
| Signals | signal:squeeze | 45 | 11 (24 %) | 45 | 24 % | 0.03 | -333.69 |
| Signals | signal:st-slow | 42 | 17 (40 %) | 69 | 52 % | 0.43 | -108.43 |
| Signals | signal:stoch-rsi | 59 | 15 (25 %) | 556 | 62 % | 0.57 | -584.50 |
| Signals | signal:supertrend | 53 | 40 (75 %) | 232 | 79 % | 1.37 | 130.97 |
| Signals | signal:swing | 58 | 2 (3 %) | 454 | 56 % | 0.39 | -931.59 |
| Signals | signal:thrust | 55 | 2 (4 %) | 390 | 49 % | 0.29 | -1099.42 |
| Signals | signal:trix | 55 | 16 (29 %) | 145 | 56 % | 0.39 | -315.80 |
| Signals | signal:volume-break | 53 | 49 (92 %) | 53 | 92 % | 10.49 | 164.28 |
| Signals | signal:vwap | 60 | 26 (43 %) | 325 | 68 % | 0.80 | -142.86 |
| Signals | signal:williams-r | 60 | 15 (25 %) | 404 | 61 % | 0.69 | -398.43 |
| Signals | signal:zscore | 60 | 0 (0 %) | 279 | 51 % | 0.37 | -803.44 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Micro | 1.25 | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Micro | 1.35 | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Micro | 1.5 | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | 1.1 | 1669 | 523 (31 %) | 6194 | 42 % | 0.46 | -5693.97 |
| Short | 1.25 | 1547 | 475 (31 %) | 5573 | 41 % | 0.43 | -5528.47 |
| Short | 1.35 | 1450 | 436 (30 %) | 5104 | 40 % | 0.41 | -5346.18 |
| Short | 1.5 | 1221 | 353 (29 %) | 4213 | 38 % | 0.38 | -4706.18 |
| Short | 1.75 | 802 | 211 (26 %) | 2727 | 35 % | 0.33 | -3324.57 |
| Short | 2 | 507 | 132 (26 %) | 1597 | 30 % | 0.27 | -2269.73 |
| General | 1.1 | 451 | 94 (21 %) | 1533 | 32 % | 0.44 | -1849.70 |
| General | 1.25 | 410 | 78 (19 %) | 1305 | 30 % | 0.38 | -1793.39 |
| General | 1.35 | 374 | 68 (18 %) | 1121 | 27 % | 0.34 | -1705.23 |
| General | 1.5 | 306 | 55 (18 %) | 893 | 25 % | 0.28 | -1549.84 |
| General | 1.75 | 219 | 38 (17 %) | 643 | 23 % | 0.23 | -1216.15 |
| General | 2 | 136 | 20 (15 %) | 398 | 22 % | 0.20 | -783.68 |
| Long | 1.1 | 503 | 217 (43 %) | 1280 | 59 % | 1.58 | 1371.02 |
| Long | 1.25 | 430 | 165 (38 %) | 981 | 57 % | 1.49 | 916.13 |
| Long | 1.35 | 379 | 132 (35 %) | 786 | 55 % | 1.42 | 638.15 |
| Long | 1.5 | 297 | 94 (32 %) | 583 | 52 % | 1.24 | 281.72 |
| Long | 1.75 | 206 | 58 (28 %) | 360 | 48 % | 1.20 | 141.53 |
| Long | 2 | 115 | 28 (24 %) | 188 | 39 % | 0.93 | -26.51 |
| Wide | 1.1 | 27 | 0 (0 %) | 108 | 33 % | 0.43 | -58.53 |
| Wide | 1.25 | 27 | 0 (0 %) | 108 | 33 % | 0.43 | -58.53 |
| Wide | 1.35 | 24 | 0 (0 %) | 69 | 26 % | 0.32 | -52.37 |
| Wide | 1.5 | 18 | 0 (0 %) | 45 | 40 % | 0.61 | -15.40 |
| Wide | 1.75 | 18 | 0 (0 %) | 45 | 40 % | 0.61 | -15.40 |
| Wide | 2 | 12 | 0 (0 %) | 3 | 0 % | 0.00 | -3.23 |
| Signals | 1.1 | 1187 | 434 (37 %) | 6915 | 66 % | 0.65 | -6701.34 |
| Signals | 1.25 | 720 | 257 (36 %) | 4469 | 66 % | 0.64 | -4352.53 |
| Signals | 1.35 | 510 | 183 (36 %) | 3166 | 68 % | 0.64 | -3072.00 |
| Signals | 1.5 | 304 | 112 (37 %) | 1916 | 69 % | 0.64 | -1820.25 |
| Signals | 1.75 | 140 | 54 (39 %) | 929 | 72 % | 0.64 | -809.58 |
| Signals | 2 | 72 | 29 (40 %) | 526 | 74 % | 0.62 | -461.40 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | magnet | mc-trsi2-10@m5 | 40 | 40 (100 %) | 120 | 100 % | ∞ (no loss) | 28.02 | – |
| Micro | sandwich | mc-ibrk@m5 | 79 | 79 (100 %) | 79 | 100 % | ∞ (no loss) | 26.70 | – |
| Micro | pulse | mc-ibrk@m5 | 73 | 73 (100 %) | 73 | 100 % | ∞ (no loss) | 25.20 | – |
| Micro | sweep | mc-lag-6@m15 | 22 | 18 (82 %) | 66 | 85 % | 2.56 | 13.65 | – |
| Micro | sweep | mc-ivwapd-2@m15c | 18 | 18 (100 %) | 36 | 100 % | ∞ (no loss) | 12.28 | – |
| Micro | clamp | mc-trsi2-10@m5 | 8 | 8 (100 %) | 24 | 100 % | ∞ (no loss) | 8.14 | – |
| Micro | sandwich | mc-lag-6@m5 | 10 | 10 (100 %) | 30 | 100 % | ∞ (no loss) | 8.04 | – |
| Micro | clamp | mc-rsit9-20@m30 | 20 | 20 (100 %) | 40 | 100 % | ∞ (no loss) | 7.00 | – |
| Micro | sweep | mc-streak-6@m30 | 8 | 8 (100 %) | 16 | 100 % | ∞ (no loss) | 6.40 | – |
| Micro | pulse | mc-lag-6@m5 | 14 | 14 (100 %) | 28 | 71 % | 4.65 | 4.71 | – |
| Micro | pivot | mc-macdh@m15c | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 4.00 | – |
| Micro | ribbon | mc-qburst-2@m5 | 3 | 0 (0 %) | 9 | 22 % | 0.08 | -9.11 | – |
| Micro | revert | mc-rsidiv-14@m5c | 6 | 0 (0 %) | 30 | 67 % | 0.48 | -9.18 | tp0.6 sl2.55 tr0.45 h192 mc (5 · 0.52 · -1.33) |
| Micro | sweep | mc-trsi2-10@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.06 | -12.00 | – |
| Micro | sweep | mc-rsi5-10@m5 | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -17.95 | – |
| Micro | sweep | mc-spike-2.5@m5 | 4 | 0 (0 %) | 12 | 33 % | 0.06 | -24.00 | – |
| Micro | pivot | mc-lag-12@m15 | 24 | 0 (0 %) | 48 | 50 % | 0.21 | -34.65 | – |
| Micro | clamp | mc-lag-12@m15 | 58 | 4 (7 %) | 116 | 50 % | 0.21 | -81.74 | – |
| Micro | ribbon | mc-ibrk@m30 | 100 | 0 (0 %) | 200 | 50 % | 0.13 | -223.08 | – |
| Micro | pivot | mc-tvwapd-3@m15 | 190 | 0 (0 %) | 190 | 0 % | 0.00 | -373.20 | – |
| Micro | clamp | mc-tvwapd-3@m15 | 222 | 0 (0 %) | 222 | 0 % | 0.00 | -389.22 | – |
| Micro | sweep | mc-z-20@m5c | 135 | 0 (0 %) | 405 | 42 % | 0.11 | -466.70 | – |
| Short | revert | trend-ema-50-200@m15c | 43 | 31 (72 %) | 354 | 74 % | 1.99 | 251.27 | tp2.2 sl4.4 tr1.65 h64 sh (6 · 4.31 · 15.24) |
| Short | sweep | willr-50-90@m15c | 17 | 17 (100 %) | 99 | 87 % | 3.44 | 142.55 | tp2.8 sl5.6 tr1.4 h64 sh (5 · ∞ (no loss) · 15.90) |
| Short | revert | r-pdhl-m@m15c | 64 | 64 (100 %) | 98 | 90 % | 308.39 | 113.56 | – |
| Short | sweep | willr-14-95@m15c | 47 | 47 (100 %) | 47 | 100 % | ∞ (no loss) | 98.61 | – |
| Short | sweep | willr-14-95@m30 | 36 | 36 (100 %) | 72 | 99 % | 636.68 | 96.74 | – |
| Short | revert | trend-ema-50-200@m30 | 19 | 19 (100 %) | 207 | 72 % | 1.85 | 96.56 | tp2.2 sl4.4 tr1.65 h48 sh (10 · 2.54 · 14.18) |
| Short | ribbon | kama-10@m30 | 20 | 20 (100 %) | 64 | 95 % | 207.24 | 86.45 | – |
| Short | pivot | r-chand@m15 | 39 | 39 (100 %) | 39 | 100 % | ∞ (no loss) | 85.34 | – |
| Short | clamp | move-impulse-20-2.5@m15c | 12 | 12 (100 %) | 50 | 76 % | 70.63 | 75.47 | tp2.6 sl3.9 tr1.3 h64 sh (5 · 43.02 · 6.19) |
| Short | sweep | willr-50-90@m15 | 5 | 5 (100 %) | 40 | 95 % | 7.80 | 67.97 | tp2.6 sl5.2 tr0 h64 sh (7 · ∞ (no loss) · 16.80) |
| Short | pivot | move-impulse-20-2.5@m15c | 13 | 13 (100 %) | 33 | 94 % | 270.14 | 66.55 | – |
| Short | pivot | r-vortex@m15 | 52 | 43 (83 %) | 52 | 83 % | 4.37 | 63.33 | – |
| Short | ribbon | trend-st-21-3@m15 | 49 | 41 (84 %) | 57 | 86 % | 3.47 | 59.67 | – |
| Short | ribbon | r-qh-flow@m30 | 18 | 18 (100 %) | 36 | 89 % | 35.59 | 49.52 | – |
| Short | ribbon | r-pin@m15 | 31 | 24 (77 %) | 31 | 77 % | 4.97 | 45.22 | – |
| Short | sweep | break-squeeze-t25@m15c | 39 | 29 (74 %) | 37 | 78 % | 45.93 | 39.90 | – |
| Short | sweep | break-squeeze-30@m30 | 8 | 6 (75 %) | 30 | 90 % | 3.31 | 36.51 | tp2.2 sl4.4 tr1.65 h48 sh (5 · 1.43 · 1.99) |
| Short | sweep | macd-cross@m15 | 3 | 3 (100 %) | 24 | 75 % | 7.98 | 35.63 | tp2.8 sl5.6 tr0 h64 sh (7 · ∞ (no loss) · 18.20) |
| Short | revert | break-vol-2@x4@m15 | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 35.60 | – |
| Short | ribbon | macd-hist-5-35-5@m30 | 4 | 4 (100 %) | 22 | 82 % | 39.14 | 29.19 | tp2.6 sl5.2 tr1.95 h48 sh (5 · ∞ (no loss) · 9.78) |
| Short | sweep | willr-28-90@m15c | 4 | 4 (100 %) | 17 | 94 % | 7.99 | 26.56 | tp2.4 sl3.6 tr1.2 h96 sh (5 · 1.57 · 2.16) |
| Short | revert | r-connors@m15c | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 25.93 | – |
| Short | revert | break-retest@m15c | 3 | 3 (100 %) | 15 | 73 % | 47.05 | 24.62 | tp2.8 sl4.2 tr0 h64 sh (5 · ∞ (no loss) · 13.00) |
| Short | ribbon | macd-cross-5-35-5@m30 | 3 | 3 (100 %) | 16 | 88 % | 56.77 | 24.10 | tp2.6 sl5.2 tr1.95 h48 sh (5 · ∞ (no loss) · 9.78) |
| Short | pivot | bb-bounce-50-2@m15c | 5 | 5 (100 %) | 35 | 77 % | 2.33 | 23.87 | tp2.2 sl2.2 tr1.1 h64 sh (7 · 3.46 · 5.91) |
| Short | pivot | z-50-2@m15c | 5 | 5 (100 %) | 35 | 77 % | 2.33 | 23.87 | tp2.2 sl2.2 tr1.1 h64 sh (7 · 3.46 · 5.91) |
| Short | sweep | willr-50-90@m30 | 4 | 4 (100 %) | 18 | 78 % | 3.00 | 23.20 | tp2.6 sl2.6 tr0 h32 sh (5 · 3.43 · 6.80) |
| Short | ribbon | trend-st-14-2@m30 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 23.19 | – |
| Short | revert | z-50-2.5@x4@m15c | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 21.80 | – |
| Short | revert | r-star-m@m30 | 12 | 9 (75 %) | 9 | 100 % | ∞ (no loss) | 21.60 | – |
| Short | ribbon | ha-3@m30 | 8 | 8 (100 %) | 15 | 87 % | 631.55 | 18.21 | – |
| Short | ribbon | r-ultimate@m30 | 5 | 5 (100 %) | 9 | 78 % | 54.95 | 17.87 | – |
| Short | follow | r-td-m@m30 | 9 | 7 (78 %) | 46 | 52 % | 1.72 | 16.16 | tp2 sl2 tr0 h32 sh (5 · 3.27 · 5.00) |
| Short | clamp | r-chand-m@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 15.20 | – |
| Short | sweep | willr-21-95@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 14.26 | – |
| Short | ribbon | trend-st@m30 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 12.20 | – |
| Short | ribbon | ha-3@m15 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 12.13 | – |
| Short | sweep | willr-21-95@m15c | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 11.67 | – |
| Short | ribbon | trend-st-21-5@m15 | 42 | 20 (48 %) | 330 | 59 % | 1.03 | 11.45 | tp2.4 sl3.6 tr1.2 h64 sh (7 · 2.80 · 7.06) |
| Short | ribbon | trend-st@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 11.40 | – |
| Short | pivot | cci-40-200@m15c | 11 | 7 (64 %) | 86 | 62 % | 1.16 | 11.03 | tp2.2 sl2.2 tr1.1 h64 sh (8 · 1.80 · 3.83) |
| Short | ribbon | dir-thrust@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 9.76 | – |
| Short | revert | ema-slope-200@m30 | 1 | 1 (100 %) | 11 | 82 % | 1.71 | 8.28 | tp2.8 sl5.6 tr2.1 h48 sh (11 · 1.71 · 8.28) |
| Short | sweep | r-td@m30 | 26 | 12 (46 %) | 126 | 60 % | 1.06 | 8.07 | tp2.2 sl2.2 tr1.1 h32 sh (5 · 1.44 · 2.12) |
| Short | pivot | willr-28-90@m15c | 6 | 4 (67 %) | 16 | 50 % | 2.77 | 7.97 | – |
| Short | sweep | willr-7-90@m30 | 2 | 2 (100 %) | 8 | 75 % | 2.13 | 7.00 | – |
| Short | clamp | r-cvd-div-m@m15c | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 6.14 | – |
| Short | sweep | break-squeeze-120@m30 | 17 | 9 (53 %) | 9 | 100 % | ∞ (no loss) | 6.07 | – |
| Short | sweep | macd-cross-19-39-9@m15 | 3 | 3 (100 %) | 10 | 70 % | 1.35 | 4.30 | – |
| Short | follow | r-cvd-div-m@m15c | 2 | 2 (100 %) | 12 | 67 % | 1.16 | 2.40 | tp2.4 sl3.6 tr0 h64 sh (6 · 1.16 · 1.20) |
| Short | sweep | willr-14-90@m30 | 1 | 1 (100 %) | 7 | 71 % | 1.38 | 2.20 | tp1.8 sl2.7 tr0 h32 sh (7 · 1.38 · 2.20) |
| Short | ribbon | macd-cross@m15 | 1 | 1 (100 %) | 5 | 60 % | 1.32 | 0.93 | tp1.8 sl2.7 tr1.35 h64 sh (5 · 1.32 · 0.93) |
| Short | revert | r-chop@m30 | 17 | 8 (47 %) | 63 | 48 % | 1.00 | -0.05 | tp1.8 sl2.7 tr0.9 h32 sh (5 · 0.54 · -2.75) |
| Short | revert | r-qh-flow-m@m15c | 2 | 1 (50 %) | 21 | 67 % | 0.97 | -1.00 | tp2.8 sl5.6 tr0 h64 sh (10 · 1.05 · 0.80) |
| Short | revert | r-choch-m@m15c | 9 | 8 (89 %) | 9 | 89 % | 0.36 | -2.22 | – |
| Short | ribbon | trend-st-21-5@m15c | 1 | 0 (0 %) | 6 | 33 % | 0.57 | -3.61 | tp2.6 sl2.6 tr1.95 h64 sh (6 · 0.57 · -3.61) |
| Short | clamp | r-td@m15 | 2 | 0 (0 %) | 5 | 60 % | 0.61 | -4.57 | – |
| Short | clamp | willr-50-80@m15c | 1 | 0 (0 %) | 6 | 50 % | 0.59 | -5.40 | tp2.8 sl4.2 tr0 h64 sh (6 · 0.59 · -5.40) |
| Short | pivot | willr-50-80@m15c | 2 | 0 (0 %) | 23 | 61 % | 0.80 | -6.49 | tp2.6 sl2.6 tr1.3 h96 sh (11 · 0.75 · -2.79) |
| Short | magnet | act-shift@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -7.12 | – |
| Short | pivot | aroon-25@m15c | 3 | 0 (0 %) | 9 | 33 % | 0.33 | -8.52 | – |
| Short | revert | break-vol-2@m30 | 13 | 4 (31 %) | 34 | 50 % | 0.81 | -9.20 | – |
| Short | follow | r-bb-adx@m30 | 1 | 0 (0 %) | 9 | 33 % | 0.43 | -10.20 | tp2.8 sl2.8 tr0 h32 sh (9 · 0.43 · -10.20) |
| Short | pivot | r-ultimate@m15 | 5 | 0 (0 %) | 15 | 40 % | 0.35 | -10.87 | – |
| Short | clamp | r-vortex@m15 | 7 | 0 (0 %) | 14 | 50 % | 0.51 | -11.10 | – |
| Short | ribbon | ichi-cloud-20@m15 | 1 | 0 (0 %) | 6 | 17 % | 0.04 | -11.59 | tp2.8 sl2.8 tr1.4 h96 sh (6 · 0.04 · -11.59) |
| Short | clamp | willr-14-90@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.30 | -12.40 | – |
| Short | follow | r-nr-break-m@m15c | 2 | 0 (0 %) | 14 | 29 % | 0.27 | -14.29 | tp2 sl3 tr1.5 h64 sh (7 · 0.27 · -7.14) |
| Short | ribbon | trend-st-14-4@m15c | 16 | 8 (50 %) | 63 | 43 % | 0.86 | -14.42 | tp2.6 sl2.6 tr1.95 h64 sh (5 · 0.80 · -1.68) |
| Short | pivot | willr-50-90@m15 | 10 | 2 (20 %) | 35 | 54 % | 0.64 | -16.07 | tp2.4 sl2.4 tr1.2 h96 sh (5 · 0.40 · -3.18) |
| Short | sweep | r-rsi2@m30 | 29 | 12 (41 %) | 29 | 41 % | 0.64 | -16.15 | – |
| Short | ribbon | ema-50-100@m15c | 2 | 0 (0 %) | 23 | 48 % | 0.64 | -17.01 | tp2.8 sl4.2 tr0 h64 sh (11 · 0.71 · -6.40) |
| Short | follow | r-pin-m@m15 | 14 | 0 (0 %) | 6 | 0 % | 0.00 | -18.00 | – |
| Short | ribbon | trend-st-14-4@m15 | 26 | 12 (46 %) | 159 | 50 % | 0.91 | -18.15 | tp2.6 sl3.9 tr0 h96 sh (5 · 2.34 · 5.50) |
| Short | revert | break-vol-2@m15c | 37 | 7 (19 %) | 87 | 51 % | 0.83 | -18.50 | – |
| Short | revert | dir-thrust-4@m15c | 3 | 0 (0 %) | 29 | 52 % | 0.59 | -18.74 | tp2.4 sl3.6 tr0 h64 sh (9 · 0.72 · -4.20) |
| Short | ribbon | trend-st-35-7@m15 | 1 | 0 (0 %) | 14 | 29 % | 0.35 | -19.60 | tp2.8 sl2.8 tr0 h64 sh (14 · 0.35 · -19.60) |
| Short | follow | r-rsi2-m@m15c | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -20.10 | – |
| Short | pivot | mfi-14-20@m15c | 12 | 4 (33 %) | 20 | 40 % | 0.25 | -20.18 | – |
| Short | ribbon | trend-st-28-6@m15c | 2 | 0 (0 %) | 23 | 39 % | 0.48 | -20.21 | tp2.6 sl2.6 tr1.95 h64 sh (12 · 0.49 · -10.01) |
| Short | revert | move-impulse-20-2.5@m15 | 1 | 0 (0 %) | 23 | 48 % | 0.46 | -20.67 | tp2.2 sl3.3 tr1.65 h64 sh (23 · 0.46 · -20.67) |
| Short | sweep | break-vol@x4@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -24.20 | – |
| Short | ribbon | trend-st-21-3@m15c | 64 | 32 (50 %) | 106 | 50 % | 0.77 | -24.26 | – |
| Short | sweep | r-choch-m@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -24.60 | – |
| Short | ribbon | mfi-14-20@m15c | 28 | 16 (57 %) | 39 | 49 % | 0.42 | -25.04 | – |
| Short | ribbon | srsi-14-10@m15c | 2 | 0 (0 %) | 32 | 44 % | 0.42 | -26.95 | tp2.4 sl2.4 tr1.2 h64 sh (16 · 0.42 · -13.47) |
| Short | revert | r-bos@m15 | 6 | 0 (0 %) | 24 | 25 % | 0.45 | -27.22 | – |
| Short | sweep | r-bb-adx-m@m15 | 12 | 5 (42 %) | 12 | 42 % | 0.03 | -27.85 | – |
| Short | sandwich | obv-50@m15c | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -29.80 | – |
| Short | clamp | dir-thrust@m15c | 24 | 6 (25 %) | 24 | 25 % | 0.01 | -39.90 | – |
| Short | clamp | cci-40-200@m15c | 9 | 0 (0 %) | 23 | 26 % | 0.15 | -40.00 | – |
| Short | magnet | break-vol-1.3@m15 | 6 | 1 (17 %) | 12 | 17 % | 0.11 | -42.23 | – |
| Short | sweep | r-pin-m@m15 | 25 | 0 (0 %) | 19 | 0 % | 0.00 | -44.06 | – |
| Short | clamp | willr-14-90@m15c | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -46.40 | – |
| Short | pivot | willr-21-90@m15c | 7 | 0 (0 %) | 16 | 0 % | 0.00 | -50.40 | – |
| Short | ribbon | macd-hist-19-39-9@m15c | 19 | 0 (0 %) | 19 | 0 % | 0.00 | -55.40 | – |
| Short | ribbon | r-ultimate@m15 | 13 | 0 (0 %) | 67 | 46 % | 0.27 | -56.70 | tp2.4 sl2.4 tr1.2 h64 sh (6 · 0.40 · -3.12) |
| Short | magnet | sar-std@m15c | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -58.01 | – |
| Short | ribbon | ichi-cloud-20@m15c | 5 | 0 (0 %) | 20 | 0 % | 0.00 | -60.40 | – |
| Short | sweep | r-pin@m15 | 27 | 12 (44 %) | 53 | 30 % | 0.32 | -61.79 | – |
| Short | magnet | move-impulse@m15c | 7 | 0 (0 %) | 14 | 7 % | 0.04 | -64.00 | – |
| Short | clamp | willr-50-90@m30 | 16 | 0 (0 %) | 20 | 0 % | 0.00 | -64.31 | – |
| Short | ribbon | trend-ema-50-200@m15 | 5 | 0 (0 %) | 34 | 29 % | 0.27 | -65.80 | tp2.6 sl3.9 tr0 h64 sh (6 · 0.29 · -11.60) |
| Short | sweep | r-inside@m15 | 20 | 0 (0 %) | 19 | 0 % | 0.00 | -70.51 | – |
| Short | clamp | r-ultimate@m15 | 27 | 0 (0 %) | 41 | 34 % | 0.03 | -72.44 | – |
| Short | ribbon | trend-st@m15c | 94 | 0 (0 %) | 42 | 0 % | 0.00 | -74.59 | – |
| Short | revert | r-qh-flow@m15c | 8 | 0 (0 %) | 175 | 53 % | 0.70 | -77.56 | tp2.8 sl2.8 tr1.4 h64 sh (25 · 0.98 · -0.38) |
| Short | ribbon | ichi-tk-20@m15c | 9 | 0 (0 %) | 90 | 30 % | 0.36 | -102.79 | tp2.6 sl2.6 tr1.3 h64 sh (10 · 0.41 · -8.34) |
| Short | magnet | move-impulse@m15 | 12 | 0 (0 %) | 32 | 31 % | 0.09 | -102.92 | – |
| Short | revert | r-choch-m@m30 | 7 | 0 (0 %) | 22 | 5 % | 0.00 | -103.67 | – |
| Short | ribbon | ema-21-55@m15 | 9 | 0 (0 %) | 84 | 29 % | 0.29 | -131.10 | tp2.6 sl2.6 tr0 h64 sh (10 · 0.37 · -12.40) |
| Short | revert | bb-walk-50@m15 | 11 | 0 (0 %) | 106 | 42 % | 0.24 | -150.55 | tp2.8 sl5.6 tr1.4 h96 sh (9 · 0.45 · -9.71) |
| Short | ribbon | trix-15@m15c | 26 | 1 (4 %) | 167 | 40 % | 0.49 | -150.63 | tp2.6 sl3.9 tr1.3 h64 sh (6 · 1.36 · 1.56) |
| Short | ribbon | trend-st-28-6@m15 | 11 | 0 (0 %) | 137 | 34 % | 0.42 | -152.23 | tp2.8 sl4.2 tr0 h64 sh (9 · 0.74 · -4.60) |
| Short | ribbon | ema-50-100@m15 | 13 | 0 (0 %) | 188 | 48 % | 0.54 | -181.17 | tp2.8 sl4.2 tr2.1 h64 sh (14 · 0.77 · -6.03) |
| Short | sweep | r-bb-adx@m15 | 79 | 19 (24 %) | 82 | 26 % | 0.01 | -183.18 | – |
| Short | ribbon | dir-vwap-240@m15 | 10 | 0 (0 %) | 77 | 26 % | 0.19 | -204.72 | tp2.8 sl4.2 tr1.4 h96 sh (7 · 0.17 · -14.72) |
| Short | ribbon | ichi-tk-20@m15 | 20 | 0 (0 %) | 186 | 32 % | 0.33 | -254.00 | tp2.2 sl4.4 tr1.1 h64 sh (9 · 0.52 · -6.74) |
| Short | ribbon | dir-vwap-120@m15c | 31 | 0 (0 %) | 118 | 0 % | 0.00 | -358.00 | – |
| Short | ribbon | ema-slope@m15 | 65 | 0 (0 %) | 169 | 0 % | 0.00 | -488.21 | – |
| Short | ribbon | ema-slope@m15c | 69 | 0 (0 %) | 178 | 0 % | 0.00 | -520.01 | – |
| Short | ribbon | dir-vwap-120@m15 | 49 | 0 (0 %) | 358 | 26 % | 0.19 | -614.89 | tp2.4 sl3.6 tr1.2 h64 sh (6 · 0.39 · -4.72) |
| Short | ribbon | ema-slope-100@m15c | 62 | 0 (0 %) | 275 | 20 % | 0.11 | -640.17 | tp2 sl2 tr1.5 h64 sh (5 · 0.20 · -7.00) |
| Short | ribbon | ema-slope-100@m15 | 62 | 0 (0 %) | 298 | 18 % | 0.10 | -728.44 | tp2 sl4 tr1 h64 sh (5 · 0.10 · -8.36) |
| Short | ribbon | ema-21-55@m15c | 46 | 0 (0 %) | 357 | 24 % | 0.20 | -761.16 | tp1.8 sl3.6 tr1.35 h64 sh (7 · 0.31 · -10.49) |
| Short | ribbon | dir-emax-20-50@m15c | 48 | 0 (0 %) | 373 | 24 % | 0.20 | -788.79 | tp2.2 sl3.3 tr1.1 h64 sh (9 · 0.37 · -8.94) |
| General | sweep | willr-50-90@m30 | 12 | 12 (100 %) | 48 | 75 % | 3.12 | 89.70 | – |
| General | sweep | willr-14-95@m15c | 21 | 21 (100 %) | 21 | 100 % | ∞ (no loss) | 71.61 | – |
| General | sweep | willr-21-95@m15 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 43.22 | – |
| General | sweep | willr-50-90@m15c | 3 | 3 (100 %) | 15 | 80 % | 3.63 | 36.35 | tp4.4 sl4.4 tr0 h64 gn (5 · 3.65 · 12.20) |
| General | sweep | willr-28-90@m15c | 4 | 4 (100 %) | 17 | 76 % | 3.26 | 28.91 | tp3.2 sl3.2 tr2.4 h96 gn (5 · 4.33 · 11.31) |
| General | sweep | willr-28-90@m30 | 3 | 3 (100 %) | 16 | 69 % | 2.92 | 28.00 | tp4.4 sl4.4 tr0 h32 gn (5 · 3.65 · 12.20) |
| General | pivot | move-impulse-20-2.5@m15c | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 26.57 | – |
| General | revert | break-don55@m30 | 6 | 5 (83 %) | 44 | 59 % | 1.38 | 25.56 | tp4.4 sl4.4 tr3.3 h32 gn (5 · 3.25 · 10.36) |
| General | revert | trend-ema-50-200@m15c | 4 | 4 (100 %) | 26 | 69 % | 1.83 | 25.09 | tp3.6 sl3.6 tr0 h64 gn (7 · 2.24 · 9.40) |
| General | revert | trend-ema-50-200@m30 | 5 | 5 (100 %) | 25 | 76 % | 1.98 | 24.02 | tp3.6 sl3.6 tr2.7 h32 gn (6 · 3.35 · 8.95) |
| General | ribbon | trend-st-21-3@m15 | 16 | 14 (88 %) | 21 | 67 % | 2.36 | 19.63 | – |
| General | revert | r-session-trend-m@m15 | 1 | 1 (100 %) | 12 | 50 % | 2.00 | 18.78 | tp4.4 sl4.4 tr3.3 h64 gn (12 · 2.00 · 18.78) |
| General | revert | break-don55@m15c | 5 | 4 (80 %) | 35 | 57 % | 1.30 | 16.87 | tp4.4 sl4.4 tr3.3 h64 gn (5 · 3.32 · 10.67) |
| General | ribbon | ha-3@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 15.72 | – |
| General | sweep | r-cvd-div-m@m15c | 2 | 2 (100 %) | 7 | 86 % | 6.73 | 14.89 | – |
| General | pivot | r-chand@m15 | 24 | 12 (50 %) | 12 | 100 % | ∞ (no loss) | 14.80 | – |
| General | sweep | break-squeeze-30@m30 | 5 | 5 (100 %) | 21 | 76 % | 1.67 | 14.80 | tp4 sl4 tr2 h32 gn (5 · 1.97 · 4.06) |
| General | revert | break-vol-2@m15c | 11 | 4 (36 %) | 26 | 50 % | 1.41 | 14.60 | – |
| General | ribbon | trend-st@m15 | 7 | 7 (100 %) | 10 | 70 % | 2.74 | 14.10 | – |
| General | follow | r-cvd-div-m@m15c | 2 | 2 (100 %) | 14 | 71 % | 1.82 | 12.43 | tp3.6 sl3.6 tr1.8 h64 gn (7 · 1.82 · 6.22) |
| General | revert | r-session-trend-m@m15c | 1 | 1 (100 %) | 9 | 67 % | 1.76 | 7.17 | tp4.4 sl4.4 tr2.2 h96 gn (9 · 1.76 · 7.17) |
| General | ribbon | trend-st-21-3@m15c | 8 | 8 (100 %) | 9 | 89 % | 2.97 | 6.32 | – |
| General | sweep | bb-bounce-50-2@m15 | 4 | 4 (100 %) | 26 | 46 % | 1.20 | 6.00 | tp3.2 sl1.6 tr0 h64 gn (7 · 1.25 · 1.80) |
| General | sweep | z-50-2@m15 | 4 | 4 (100 %) | 26 | 46 % | 1.20 | 6.00 | tp3.2 sl1.6 tr0 h64 gn (7 · 1.25 · 1.80) |
| General | revert | r-pdhl-m@m15c | 16 | 6 (38 %) | 8 | 100 % | ∞ (no loss) | 3.76 | – |
| General | pivot | cci-40-200@m15c | 1 | 0 (0 %) | 8 | 38 % | 1.00 | -0.00 | tp3.2 sl1.6 tr0 h64 gn (8 · 1.00 · -0.00) |
| General | revert | ema-slope-200@m30 | 2 | 1 (50 %) | 19 | 58 % | 0.99 | -0.33 | tp4.4 sl3.3 tr0 h48 gn (8 · 1.20 · 2.80) |
| General | revert | r-tsi-m@m30 | 2 | 1 (50 %) | 12 | 50 % | 0.98 | -0.66 | tp4.4 sl4.4 tr3.3 h48 gn (6 · 1.04 · 0.54) |
| General | ribbon | trend-st-14-4@m15 | 1 | 0 (0 %) | 5 | 40 % | 0.77 | -1.80 | tp3.2 sl2.4 tr0 h64 gn (5 · 0.77 · -1.80) |
| General | revert | break-vol-2@m30 | 15 | 3 (20 %) | 44 | 41 % | 0.93 | -5.24 | – |
| General | revert | ema-slope-200@m15c | 2 | 0 (0 %) | 22 | 50 % | 0.75 | -10.51 | tp3.6 sl3.6 tr1.8 h96 gn (13 · 0.84 · -3.04) |
| General | ribbon | trend-st-21-5@m15 | 5 | 0 (0 %) | 34 | 53 % | 0.78 | -10.86 | tp3.6 sl3.6 tr1.8 h64 gn (7 · 0.91 · -0.68) |
| General | revert | break-vol@m15c | 1 | 0 (0 %) | 5 | 0 % | 0.00 | -11.00 | tp4 sl2 tr0 h96 gn (5 · 0.00 · -11.00) |
| General | revert | break-vol-1.3@m15c | 1 | 0 (0 %) | 7 | 0 % | 0.00 | -14.00 | tp3.6 sl1.8 tr0 h96 gn (7 · 0.00 · -14.00) |
| General | revert | break-vol@m30 | 4 | 1 (25 %) | 14 | 29 % | 0.51 | -15.40 | tp3.6 sl1.8 tr0 h48 gn (5 · 0.00 · -10.00) |
| General | ribbon | r-ultimate@m15 | 3 | 0 (0 %) | 15 | 40 % | 0.35 | -16.36 | tp3.6 sl3.6 tr0 h96 gn (5 · 0.60 · -4.60) |
| General | ribbon | trend-st@m15c | 32 | 0 (0 %) | 6 | 0 % | 0.00 | -17.40 | – |
| General | clamp | cci-40-200@m15c | 5 | 0 (0 %) | 9 | 22 % | 0.02 | -20.29 | – |
| General | revert | r-qh-flow@m15c | 4 | 0 (0 %) | 83 | 48 % | 0.85 | -20.51 | tp3.2 sl2.4 tr0 h64 gn (20 · 0.94 · -1.60) |
| General | sweep | r-inside@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -21.10 | – |
| General | revert | move-impulse-20-2.5@m15 | 2 | 0 (0 %) | 35 | 37 % | 0.70 | -21.90 | tp4 sl3 tr0 h64 gn (18 · 0.76 · -8.60) |
| General | ribbon | trend-ema-50-200@m15 | 2 | 0 (0 %) | 15 | 27 % | 0.39 | -24.00 | tp4 sl4 tr0 h64 gn (6 · 0.45 · -9.20) |
| General | magnet | move-impulse@m15c | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -27.60 | – |
| General | pivot | mfi-14-20@m15c | 10 | 0 (0 %) | 14 | 0 % | 0.00 | -29.00 | – |
| General | follow | r-rsi2-m@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -29.00 | – |
| General | ribbon | trend-st-14-4@m15c | 9 | 0 (0 %) | 33 | 27 % | 0.50 | -29.90 | – |
| General | revert | move-impulse-20-2.5@m30 | 3 | 0 (0 %) | 22 | 45 % | 0.45 | -30.15 | tp4.4 sl4.4 tr3.3 h32 gn (7 · 0.46 · -9.89) |
| General | ribbon | ema-50-100@m15 | 3 | 0 (0 %) | 42 | 40 % | 0.65 | -31.06 | tp4 sl4 tr2 h64 gn (15 · 0.65 · -10.33) |
| General | ribbon | trend-st-35-7@m15 | 3 | 0 (0 %) | 41 | 22 % | 0.47 | -31.40 | tp3.6 sl1.8 tr0 h64 gn (13 · 0.51 · -9.80) |
| General | follow | r-bb-adx@m15c | 2 | 0 (0 %) | 14 | 14 % | 0.15 | -34.80 | tp3.2 sl3.2 tr1.6 h64 gn (7 · 0.15 · -17.40) |
| General | ribbon | dir-vwap-240@m15 | 2 | 0 (0 %) | 16 | 25 % | 0.30 | -35.20 | tp4 sl4 tr0 h64 gn (8 · 0.30 · -17.60) |
| General | magnet | move-impulse@m15 | 4 | 0 (0 %) | 10 | 0 % | 0.00 | -36.93 | – |
| General | clamp | willr-50-80@m15c | 6 | 0 (0 %) | 24 | 25 % | 0.36 | -39.00 | – |
| General | ribbon | trix-15@m15c | 14 | 0 (0 %) | 79 | 38 % | 0.52 | -76.74 | tp4.4 sl3.3 tr0 h64 gn (5 · 0.80 · -2.10) |
| General | ribbon | trend-st-28-6@m15 | 8 | 0 (0 %) | 88 | 35 % | 0.48 | -79.62 | tp3.6 sl1.8 tr0 h64 gn (12 · 0.57 · -7.80) |
| General | revert | r-bos@m15 | 13 | 0 (0 %) | 66 | 20 % | 0.32 | -91.70 | tp3.2 sl1.6 tr0 h64 gn (7 · 0.28 · -7.80) |
| General | ribbon | ema-21-55@m15c | 6 | 0 (0 %) | 46 | 17 % | 0.18 | -97.20 | tp3.2 sl2.4 tr0 h64 gn (8 · 0.16 · -15.20) |
| General | ribbon | ema-slope@m15 | 19 | 0 (0 %) | 45 | 0 % | 0.00 | -141.70 | – |
| General | follow | r-bb-adx@m30 | 12 | 0 (0 %) | 96 | 32 % | 0.36 | -149.35 | tp4.4 sl4.4 tr0 h32 gn (7 · 0.68 · -5.80) |
| General | ribbon | dir-emax-20-50@m15c | 10 | 0 (0 %) | 73 | 16 % | 0.18 | -167.67 | tp3.2 sl2.4 tr0 h64 gn (8 · 0.16 · -15.20) |
| General | ribbon | ema-slope@m15c | 24 | 0 (0 %) | 57 | 0 % | 0.00 | -177.30 | – |
| General | ribbon | dir-vwap-120@m15c | 17 | 0 (0 %) | 62 | 0 % | 0.00 | -206.00 | – |
| General | ribbon | dir-vwap-120@m15 | 18 | 0 (0 %) | 106 | 15 % | 0.16 | -251.19 | tp3.6 sl3.6 tr0 h64 gn (5 · 0.22 · -11.80) |
| General | ribbon | ema-slope-100@m15c | 21 | 0 (0 %) | 80 | 5 % | 0.00 | -257.16 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 0.02 · -13.26) |
| General | ribbon | ema-slope-100@m15 | 21 | 0 (0 %) | 85 | 5 % | 0.00 | -275.66 | tp3.2 sl2.4 tr0 h64 gn (5 · 0.00 · -13.00) |
| Long | sweep | willr-50-90@m15c | 30 | 30 (100 %) | 104 | 89 % | 11.97 | 467.39 | tp6.4 sl4.8 tr0 h96 lg (5 · 4.96 · 19.80) |
| Long | revert | r-inside-m@m30 | 18 | 18 (100 %) | 55 | 98 % | 105.58 | 292.82 | – |
| Long | sweep | willr-50-90@m30 | 22 | 22 (100 %) | 74 | 85 % | 6.83 | 292.46 | – |
| Long | revert | trend-ema-50-200@m15c | 30 | 30 (100 %) | 131 | 75 % | 2.62 | 261.49 | tp5.2 sl5.2 tr0 h96 lg (5 · 3.70 · 14.60) |
| Long | revert | trend-ema-50-200@m30 | 24 | 20 (83 %) | 86 | 80 % | 3.05 | 178.20 | tp4.8 sl4.8 tr2.4 h32 lg (5 · 1.79 · 3.94) |
| Long | sweep | willr-28-90@m30 | 8 | 8 (100 %) | 32 | 97 % | 35.41 | 161.71 | tp6 sl4.5 tr0 h32 lg (5 · 4.94 · 18.50) |
| Long | revert | break-vol-2@m30 | 23 | 19 (83 %) | 50 | 76 % | 4.98 | 158.40 | – |
| Long | sweep | willr-21-95@m15 | 10 | 10 (100 %) | 30 | 100 % | ∞ (no loss) | 142.82 | – |
| Long | revert | r-session-trend-m@m15 | 6 | 6 (100 %) | 93 | 58 % | 2.03 | 127.18 | tp4.8 sl3.6 tr0 h96 lg (16 · 2.66 · 31.60) |
| Long | revert | break-vol-2@m15c | 17 | 17 (100 %) | 34 | 82 % | 6.45 | 114.40 | – |
| Long | revert | r-session-trend-m@m15c | 5 | 5 (100 %) | 45 | 71 % | 3.26 | 113.70 | tp4.8 sl3.6 tr0 h64 lg (11 · 3.23 · 25.40) |
| Long | ribbon | willr-21-95@m30 | 28 | 19 (68 %) | 19 | 100 % | ∞ (no loss) | 106.12 | – |
| Long | sweep | willr-14-95@m15c | 25 | 25 (100 %) | 25 | 100 % | ∞ (no loss) | 95.32 | – |
| Long | sweep | willr-14-95@m30 | 11 | 11 (100 %) | 18 | 100 % | ∞ (no loss) | 88.93 | – |
| Long | sweep | macd-cross@m15 | 4 | 4 (100 %) | 19 | 89 % | 10.18 | 80.77 | tp5.6 sl5.6 tr0 h96 lg (5 · ∞ (no loss) · 27.00) |
| Long | ribbon | willr-50-90@m30 | 13 | 9 (69 %) | 45 | 71 % | 2.02 | 79.00 | – |
| Long | follow | mfi-14-20@m15 | 7 | 7 (100 %) | 17 | 100 % | ∞ (no loss) | 76.43 | – |
| Long | ribbon | kama-10@m30 | 17 | 9 (53 %) | 14 | 100 % | ∞ (no loss) | 71.83 | – |
| Long | revert | break-vol-2@x4@m15 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 54.29 | – |
| Long | sweep | willr-14-80@m15c | 2 | 2 (100 %) | 9 | 67 % | 3.59 | 49.29 | tp6 sl6 tr3 h96 lg (6 · 3.17 · 26.95) |
| Long | follow | willr-50-95@m15c | 2 | 2 (100 %) | 13 | 77 % | 4.17 | 45.60 | tp6.4 sl4.8 tr0 h64 lg (6 · 6.20 · 26.00) |
| Long | sweep | r-td@m30 | 4 | 4 (100 %) | 10 | 100 % | ∞ (no loss) | 31.15 | – |
| Long | sweep | willr-28-80@m30 | 3 | 3 (100 %) | 5 | 100 % | ∞ (no loss) | 29.80 | – |
| Long | sweep | willr-21-95@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 27.00 | – |
| Long | revert | move-impulse-20-2.5@m15c | 2 | 2 (100 %) | 16 | 75 % | 1.94 | 21.84 | tp5.6 sl5.6 tr4.2 h64 lg (8 · 1.94 · 10.92) |
| Long | revert | r-session-trend@m30 | 1 | 1 (100 %) | 13 | 62 % | 1.95 | 19.50 | tp5.2 sl3.9 tr0 h48 lg (13 · 1.95 · 19.50) |
| Long | revert | r-tsi-m@m30 | 8 | 5 (63 %) | 40 | 53 % | 1.18 | 18.34 | tp5.6 sl5.6 tr2.8 h48 lg (5 · 1.47 · 5.42) |
| Long | revert | ichi-cloud-20@m15c | 6 | 4 (67 %) | 20 | 55 % | 1.34 | 15.10 | – |
| Long | revert | break-vol-1.3@m30 | 3 | 3 (100 %) | 15 | 60 % | 1.39 | 13.00 | tp6 sl6 tr0 h48 lg (5 · 1.40 · 5.00) |
| Long | revert | break-don55@m30 | 1 | 1 (100 %) | 5 | 80 % | 3.23 | 11.16 | tp4.8 sl4.8 tr3.6 h32 lg (5 · 3.23 · 11.16) |
| Long | revert | cmf-20-0.1@m15c | 1 | 1 (100 %) | 9 | 67 % | 1.48 | 8.96 | tp6 sl6 tr4.5 h96 lg (9 · 1.48 · 8.96) |
| Long | revert | break-don55@m15c | 1 | 1 (100 %) | 7 | 57 % | 1.61 | 7.00 | tp4.8 sl3.6 tr0 h64 lg (7 · 1.61 · 7.00) |
| Long | ribbon | willr-7-80@m30 | 12 | 3 (25 %) | 51 | 59 % | 1.04 | 5.63 | tp6 sl6 tr3 h32 lg (5 · 0.67 · -4.14) |
| Long | revert | r-qh-flow-m@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.41 | 5.40 | tp6.4 sl6.4 tr0 h96 lg (5 · 1.41 · 5.40) |
| Long | ribbon | ema-50-100@m15 | 1 | 1 (100 %) | 10 | 50 % | 1.23 | 5.00 | tp5.6 sl4.2 tr0 h64 lg (10 · 1.23 · 5.00) |
| Long | pivot | r-chand@m15 | 24 | 6 (25 %) | 6 | 100 % | ∞ (no loss) | 1.66 | – |
| Long | revert | break-vol-1.3@m15 | 1 | 0 (0 %) | 5 | 40 % | 0.83 | -2.60 | tp6.4 sl4.8 tr0 h96 lg (5 · 0.83 · -2.60) |
| Long | ribbon | trend-st-28-6@m15 | 2 | 0 (0 %) | 14 | 43 % | 0.92 | -2.80 | tp5.2 sl3.9 tr0 h64 lg (7 · 0.91 · -1.40) |
| Long | revert | break-vol-1.3@m15c | 12 | 3 (25 %) | 49 | 51 % | 0.96 | -6.11 | tp6 sl6 tr3 h64 lg (5 · 0.46 · -6.71) |
| Long | ribbon | trix-15@m15c | 1 | 0 (0 %) | 5 | 20 % | 0.45 | -6.60 | tp5.6 sl2.8 tr0 h64 lg (5 · 0.45 · -6.60) |
| Long | ribbon | trend-st-14-4@m15c | 2 | 0 (0 %) | 8 | 25 % | 0.59 | -6.60 | – |
| Long | ribbon | trend-ema-50-200@m15 | 1 | 0 (0 %) | 6 | 33 % | 0.61 | -6.80 | tp5.6 sl4.2 tr0 h64 lg (6 · 0.61 · -6.80) |
| Long | follow | rsi-mom-21-20@m15 | 8 | 6 (75 %) | 8 | 75 % | 0.37 | -8.12 | – |
| Long | sweep | willr-50-80@m30 | 2 | 0 (0 %) | 6 | 33 % | 0.57 | -9.20 | – |
| Long | sweep | willr-50-80@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.47 | -13.19 | – |
| Long | ribbon | trend-st-21-5@m15 | 7 | 3 (43 %) | 26 | 38 % | 0.77 | -15.20 | tp4.8 sl3.6 tr0 h64 lg (5 · 1.82 · 6.20) |
| Long | ribbon | trend-ema-50-200@m15c | 2 | 0 (0 %) | 8 | 25 % | 0.41 | -15.68 | tp5.6 sl4.2 tr0 h64 lg (5 · 0.82 · -2.40) |
| Long | revert | break-vol@m30 | 4 | 1 (25 %) | 10 | 20 % | 0.37 | -17.90 | – |
| Long | revert | move-impulse-20-2.5@m30 | 3 | 0 (0 %) | 19 | 53 % | 0.58 | -20.28 | tp4.8 sl4.8 tr2.4 h32 lg (7 · 0.62 · -5.71) |
| Long | revert | r-choch-m@m30 | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -33.60 | – |
| Long | ribbon | ema-slope@m15 | 4 | 0 (0 %) | 12 | 0 % | 0.00 | -34.80 | – |
| Long | sweep | r-inside@m15 | 13 | 0 (0 %) | 8 | 0 % | 0.00 | -37.80 | – |
| Long | ribbon | ema-slope-100@m15c | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -40.50 | – |
| Long | clamp | cci-40-100@m15c | 3 | 0 (0 %) | 7 | 0 % | 0.00 | -41.40 | – |
| Long | revert | r-bos@m15 | 11 | 0 (0 %) | 37 | 30 % | 0.60 | -42.20 | – |
| Long | revert | z-50-2.5@x4@m15c | 11 | 0 (0 %) | 11 | 0 % | 0.00 | -42.60 | – |
| Long | follow | r-bb-adx@m30 | 5 | 0 (0 %) | 32 | 38 % | 0.50 | -42.67 | tp4.8 sl4.8 tr0 h32 lg (6 · 0.92 · -1.20) |
| Long | revert | break-vol@m15 | 4 | 0 (0 %) | 16 | 25 % | 0.37 | -46.34 | – |
| Long | magnet | move-impulse@m15 | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -51.60 | – |
| Long | revert | move-impulse-20-2.5@m15 | 2 | 0 (0 %) | 25 | 24 % | 0.38 | -53.10 | tp5.6 sl4.2 tr0 h64 lg (14 · 0.49 · -22.40) |
| Long | ribbon | ema-slope-100@m15 | 4 | 0 (0 %) | 14 | 0 % | 0.00 | -53.50 | tp4.8 sl2.4 tr0 h64 lg (5 · 0.00 · -13.00) |
| Long | ribbon | ema-slope@m15c | 7 | 0 (0 %) | 18 | 0 % | 0.00 | -59.40 | – |
| Long | sweep | break-squeeze-30@m30 | 9 | 0 (0 %) | 19 | 21 % | 0.05 | -87.34 | – |
| Long | ribbon | dir-emax-20-50@m15c | 7 | 0 (0 %) | 48 | 15 % | 0.25 | -110.00 | tp5.2 sl2.6 tr0 h96 lg (8 · 0.26 · -14.60) |
| Long | ribbon | dir-vwap-120@m15c | 11 | 0 (0 %) | 36 | 0 % | 0.00 | -142.70 | – |
| Long | ribbon | dir-vwap-120@m15 | 13 | 0 (0 %) | 65 | 11 % | 0.14 | -197.80 | tp4.8 sl3.6 tr0 h64 lg (5 · 0.30 · -10.60) |
| Wide | pivot | r-chand@m15 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 39.17 | – |
| Wide | revert | break-retest@m5c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.02 | – |
| Wide | magnet | r-sweep@m5 | 9 | 6 (67 %) | 18 | 83 % | 1.89 | 3.62 | – |
| Wide | ribbon | trend-st-21-3@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 3.14 | – |
| Wide | snap | obv-50@m1c | 3 | 3 (100 %) | 24 | 38 % | 1.00 | 0.04 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (8 · 1.00 · 0.01) |
| Wide | ribbon | rsi-div@m15c | 9 | 3 (33 %) | 6 | 50 % | 0.33 | -1.10 | – |
| Wide | magnet | mfi-14-20@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -1.20 | – |
| Wide | pivot | break-squeeze-30@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.53 | -1.42 | – |
| Wide | sweep | willr-50-95@m5c | 15 | 3 (20 %) | 15 | 20 % | 0.33 | -3.89 | – |
| Wide | sweep | break-squeeze-t25@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 | – |
| Wide | clamp | r-fakeout-m@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.55 | -5.19 | – |
| Wide | pivot | mc-rsi5-10@m15 | 9 | 0 (0 %) | 6 | 0 % | 0.00 | -5.59 | – |
| Wide | revert | r-session-trend-m@m15c | 3 | 0 (0 %) | 39 | 46 % | 0.76 | -6.16 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (13 · 0.76 · -2.05) |
| Wide | ribbon | trend-st-21-5@m15 | 3 | 0 (0 %) | 30 | 50 % | 0.72 | -6.99 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (10 · 0.72 · -2.33) |
| Wide | clamp | r-fvg-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -8.51 | – |
| Wide | sweep | r-pin-m@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -11.35 | – |
| Wide | ribbon | ema-slope@m15c | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -18.48 | – |
| Wide | ribbon | ema-slope@m15 | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -18.48 | – |
| Wide | clamp | bb-bounce-50-2@m1c | 14 | 0 (0 %) | 126 | 35 % | 0.62 | -23.25 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (9 · 0.92 · -0.34) |
| Wide | clamp | z-50-2@m1c | 14 | 0 (0 %) | 126 | 35 % | 0.62 | -23.25 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (9 · 0.92 · -0.34) |
| Wide | ribbon | bb-bounce-50-2@m1c | 15 | 0 (0 %) | 133 | 35 % | 0.61 | -25.88 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (9 · 0.92 · -0.34) |
| Wide | ribbon | z-50-2@m1c | 15 | 0 (0 %) | 133 | 35 % | 0.61 | -25.88 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (9 · 0.92 · -0.34) |
| Wide | pivot | bb-bounce-50-2@m1c | 15 | 0 (0 %) | 133 | 35 % | 0.61 | -25.88 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (9 · 0.92 · -0.34) |
| Wide | pivot | z-50-2@m1c | 15 | 0 (0 %) | 133 | 35 % | 0.61 | -25.88 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (9 · 0.92 · -0.34) |
| Wide | magnet | bb-bounce-50-2@m1c | 12 | 0 (0 %) | 96 | 26 % | 0.43 | -29.71 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (8 · 0.63 · -1.61) |
| Wide | magnet | z-50-2@m1c | 12 | 0 (0 %) | 96 | 26 % | 0.43 | -29.71 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (8 · 0.63 · -1.61) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 226 | 86 % | 3.90 | 476.81 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 27 (90 %) | 234 | 84 % | 2.53 | 380.73 | tp5 sl15 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-obv-m@m15 | 30 | 28 (93 %) | 176 | 84 % | 3.60 | 329.76 | tp5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 24 (80 %) | 266 | 77 % | 1.81 | 326.82 | tp5 sl15 tr3 h96 (7 · ∞ (no loss) · 29.63) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 28 (93 %) | 116 | 91 % | 10.77 | 313.02 | tp4 sl12 tr1.6 h96 (6 · ∞ (no loss) · 13.07) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 24 (80 %) | 176 | 74 % | 1.89 | 242.39 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 26.96) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 29 | 26 (90 %) | 91 | 92 % | 8.63 | 211.95 | tp3 sl9 tr1.2 h96 (6 · ∞ (no loss) · 7.27) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 24 (80 %) | 254 | 78 % | 1.50 | 186.85 | tp8 sl24 tr3.2 h96 (6 · ∞ (no loss) · 18.97) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 20 (67 %) | 191 | 79 % | 1.57 | 167.56 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 14.25) |
| Signals | follow | sig-r-vol-regime-s@m15 | 26 | 26 (100 %) | 49 | 90 % | 11.91 | 154.44 | tp2.5 sl3.75 tr0 h96 (5 · 2.33 · 5.25) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 29 (97 %) | 47 | 89 % | 11.12 | 143.10 | – |
| Signals | follow | sig-volume-break-m@m15 | 30 | 29 (97 %) | 30 | 97 % | 1656.69 | 130.62 | – |
| Signals | follow | sig-ichimoku-m@m15 | 28 | 27 (96 %) | 51 | 90 % | 10.88 | 128.27 | – |
| Signals | follow | sig-mfi-m@m15 | 30 | 29 (97 %) | 51 | 92 % | 8.11 | 117.68 | – |
| Signals | follow | sig-act-burst-m@m15 | 28 | 21 (75 %) | 110 | 79 % | 1.89 | 112.28 | tp4 sl12 tr2.4 h96 (5 · 64.03 · 12.61) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 16 (53 %) | 245 | 70 % | 1.22 | 110.62 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 26.24) |
| Signals | follow | sig-s2-range-break-s@m15 | 19 | 18 (95 %) | 25 | 96 % | 147.33 | 85.12 | – |
| Signals | follow | sig-s2-st-trail-m@m15 | 24 | 23 (96 %) | 44 | 93 % | 6.95 | 82.34 | – |
| Signals | follow | sig-supertrend-m@m15 | 24 | 23 (96 %) | 44 | 93 % | 6.95 | 82.34 | – |
| Signals | follow | sig-obv-s@m15 | 30 | 20 (67 %) | 267 | 72 % | 1.15 | 74.84 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 17.97) |
| Signals | follow | sig-trix-s@m15 | 25 | 16 (64 %) | 89 | 70 % | 1.57 | 60.80 | tp3 sl9 tr1.2 h96 (7 · 12.13 · 6.45) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 16 (53 %) | 253 | 70 % | 1.12 | 58.03 | tp5 sl7.5 tr0 h96 (6 · 3.12 · 16.30) |
| Signals | follow | sig-r-vol-regime-m@m15 | 16 | 12 (75 %) | 20 | 80 % | 3.78 | 55.75 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 24 | 21 (88 %) | 29 | 90 % | 4.22 | 55.45 | – |
| Signals | follow | sig-atr-break-m@m15 | 26 | 18 (69 %) | 92 | 76 % | 1.45 | 54.31 | tp2.5 sl3.75 tr0 h96 (5 · ∞ (no loss) · 11.50) |
| Signals | follow | sig-ema-cross-m@m15 | 21 | 18 (86 %) | 42 | 88 % | 3.04 | 53.44 | – |
| Signals | follow | sig-supertrend-s@m15 | 29 | 17 (59 %) | 188 | 76 % | 1.14 | 48.63 | tp3 sl6 tr0 h96 (8 · 3.16 · 13.40) |
| Signals | follow | sig-keltner-s@m15 | 26 | 15 (58 %) | 96 | 65 % | 1.28 | 46.77 | tp3 sl9 tr1.8 h96 (5 · 34.73 · 8.16) |
| Signals | follow | sig-s2-active-hf-s@m15 | 27 | 17 (63 %) | 248 | 70 % | 1.09 | 42.30 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-vwap-m@m15 | 30 | 15 (50 %) | 110 | 71 % | 1.19 | 36.96 | tp3 sl9 tr1.2 h96 (7 · 58.33 · 7.48) |
| Signals | follow | sig-rsi-momentum-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-volume-break-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-r-connors-s@m15 | 13 | 13 (100 %) | 14 | 100 % | ∞ (no loss) | 33.34 | – |
| Signals | follow | sig-donchian-m@m15 | 23 | 17 (74 %) | 51 | 71 % | 1.40 | 30.99 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 27 | 19 (70 %) | 35 | 74 % | 1.58 | 30.97 | – |
| Signals | follow | sig-s2-active-hf-m@m15 | 27 | 14 (52 %) | 227 | 69 % | 1.06 | 25.44 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-keltner-m@m15 | 24 | 13 (54 %) | 60 | 75 % | 1.20 | 24.92 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 17 (57 %) | 265 | 74 % | 1.05 | 24.16 | tp6 sl18 tr2.4 h96 (9 · ∞ (no loss) · 15.30) |
| Signals | follow | sig-ema-slope-m@m15 | 29 | 12 (41 %) | 101 | 75 % | 1.07 | 16.34 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 16 (53 %) | 267 | 72 % | 0.99 | -4.11 | tp3 sl9 tr0 h96 (10 · 2.74 · 16.00) |
| Signals | follow | sig-hma-m@m15 | 30 | 13 (43 %) | 186 | 65 % | 0.95 | -17.29 | tp5 sl15 tr4 h96 (5 · 46.76 · 14.34) |
| Signals | follow | sig-s2-range-break-m@m15 | 26 | 15 (58 %) | 37 | 70 % | 0.73 | -26.35 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -49.85 | – |
| Signals | follow | sig-kama-m@m15 | 30 | 12 (40 %) | 291 | 71 % | 0.92 | -51.52 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 19.17) |
| Signals | follow | sig-st-slow-m@m15 | 20 | 9 (45 %) | 39 | 59 % | 0.41 | -52.59 | – |
| Signals | follow | sig-st-slow-s@m15 | 22 | 8 (36 %) | 30 | 43 % | 0.45 | -55.84 | – |
| Signals | follow | sig-squeeze-m@m15 | 18 | 10 (56 %) | 18 | 56 % | 0.14 | -63.66 | – |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 12 (40 %) | 252 | 67 % | 0.87 | -64.86 | tp5 sl15 tr3 h96 (7 · 130.47 · 19.86) |
| Signals | follow | sig-s2-range-shift-s@m15 | 23 | 10 (43 %) | 96 | 56 % | 0.68 | -66.19 | tp3 sl9 tr1.8 h96 (5 · 0.59 · -3.94) |
| Signals | follow | sig-ema-pullback-s@m15 | 29 | 11 (38 %) | 238 | 71 % | 0.84 | -69.26 | tp6 sl18 tr2.4 h96 (8 · ∞ (no loss) · 13.75) |
| Signals | follow | sig-s2-st-trail-s@m15 | 22 | 8 (36 %) | 25 | 32 % | 0.31 | -69.84 | – |
| Signals | follow | sig-r-fractal-m@m15 | 21 | 9 (43 %) | 39 | 59 % | 0.43 | -70.71 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 28 | 9 (32 %) | 80 | 68 % | 0.67 | -78.08 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-donchian-s@m15 | 30 | 10 (33 %) | 150 | 67 % | 0.80 | -80.47 | tp3 sl6 tr0 h96 (7 · 1.13 · 1.60) |
| Signals | follow | sig-ema-slope-s@m15 | 25 | 8 (32 %) | 123 | 69 % | 0.70 | -85.23 | tp4 sl6 tr0 h96 (5 · 2.45 · 9.00) |
| Signals | follow | sig-adx-m@m15 | 30 | 12 (40 %) | 103 | 60 % | 0.66 | -91.79 | tp5 sl15 tr2 h96 (5 · 19.45 · 4.97) |
| Signals | follow | sig-rsi-reversal-s@m15 | 21 | 8 (38 %) | 24 | 42 % | 0.11 | -99.71 | – |
| Signals | follow | sig-r-inside-s@m15 | 11 | 0 (0 %) | 15 | 0 % | 0.00 | -106.75 | – |
| Signals | follow | sig-reclaim-s@m15 | 30 | 13 (43 %) | 302 | 72 % | 0.82 | -115.52 | tp3 sl6 tr0 h96 (13 · 1.51 · 9.40) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 28 | 10 (36 %) | 116 | 66 % | 0.64 | -115.78 | tp3 sl4.5 tr0 h96 (6 · 2.98 · 9.30) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 13 (43 %) | 142 | 58 % | 0.69 | -124.24 | tp5 sl15 tr2 h96 (5 · ∞ (no loss) · 20.77) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 11 (37 %) | 191 | 65 % | 0.73 | -147.63 | tp3 sl6 tr0 h96 (9 · 1.58 · 7.20) |
| Signals | follow | sig-sar-s@m15 | 30 | 7 (23 %) | 252 | 65 % | 0.74 | -168.60 | tp5 sl15 tr0 h96 (5 · 1.26 · 4.00) |
| Signals | follow | sig-stoch-rsi-m@m15 | 29 | 7 (24 %) | 245 | 68 % | 0.69 | -170.99 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 11.37) |
| Signals | follow | sig-adx-s@m15 | 30 | 9 (30 %) | 170 | 65 % | 0.66 | -175.16 | tp3 sl6 tr0 h96 (7 · 1.13 · 1.60) |
| Signals | follow | sig-sar-m@m15 | 29 | 8 (28 %) | 245 | 65 % | 0.73 | -175.45 | tp2.5 sl3.75 tr0 h96 (18 · 1.16 · 3.90) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 5 (17 %) | 152 | 61 % | 0.61 | -176.10 | tp2.5 sl3.75 tr0 h96 (10 · 1.36 · 4.25) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 25 | 8 (32 %) | 73 | 47 % | 0.33 | -179.33 | tp3 sl9 tr1.2 h96 (5 · 0.22 · -7.52) |
| Signals | follow | sig-s2-block-stack-m@m15 | 24 | 4 (17 %) | 108 | 59 % | 0.51 | -179.74 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-vwap-s@m15 | 30 | 11 (37 %) | 215 | 66 % | 0.65 | -179.82 | tp5 sl15 tr2 h96 (9 · 49.06 · 6.00) |
| Signals | follow | sig-s2-block-scale-m@m15 | 29 | 11 (38 %) | 187 | 64 % | 0.59 | -202.31 | tp6 sl18 tr2.4 h96 (6 · 67.70 · 9.27) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 7 (23 %) | 250 | 63 % | 0.65 | -210.92 | tp8 sl24 tr3.2 h96 (5 · 8.55 · 5.09) |
| Signals | follow | sig-r-fractal-s@m15 | 24 | 5 (21 %) | 78 | 40 % | 0.23 | -218.58 | tp3 sl9 tr1.2 h96 (7 · 5.55 · 2.92) |
| Signals | follow | sig-r-connors-m@m15 | 27 | 5 (19 %) | 102 | 59 % | 0.42 | -219.84 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 8 (27 %) | 228 | 64 % | 0.66 | -227.80 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 10.32) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 2 (7 %) | 154 | 61 % | 0.61 | -228.71 | tp3 sl9 tr1.2 h96 (6 · 1.07 · 0.62) |
| Signals | follow | sig-s2-confluence-s@m15 | 29 | 5 (17 %) | 281 | 62 % | 0.67 | -228.82 | tp6 sl18 tr2.4 h96 (6 · 30.33 · 7.91) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 7 (23 %) | 158 | 62 % | 0.51 | -236.49 | tp3 sl4.5 tr0 h96 (7 · 0.79 · -2.90) |
| Signals | follow | sig-r-awesome-s@m15 | 26 | 5 (19 %) | 103 | 48 % | 0.34 | -251.43 | tp3 sl9 tr0 h96 (5 · 0.46 · -10.00) |
| Signals | follow | sig-squeeze-s@m15 | 27 | 1 (4 %) | 27 | 4 % | 0.00 | -270.03 | – |
| Signals | follow | sig-s2-block-scale-s@m15 | 29 | 8 (28 %) | 233 | 64 % | 0.56 | -274.17 | tp4 sl6 tr0 h96 (8 · 1.84 · 10.40) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 2 (7 %) | 262 | 62 % | 0.68 | -274.19 | tp6 sl18 tr2.4 h96 (6 · 1.47 · 8.49) |
| Signals | follow | sig-macd-cross-m@m15 | 28 | 5 (18 %) | 149 | 61 % | 0.45 | -278.63 | tp3 sl4.5 tr0 h96 (11 · 1.59 · 8.30) |
| Signals | follow | sig-macd-slow-m@m15 | 28 | 5 (18 %) | 131 | 57 % | 0.43 | -282.36 | tp2.5 sl5 tr0 h96 (7 · 2.65 · 8.60) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 8 (27 %) | 179 | 55 % | 0.48 | -284.61 | tp4 sl12 tr3.2 h96 (5 · 1.25 · 3.00) |
| Signals | follow | sig-macd-slow-s@m15 | 29 | 5 (17 %) | 219 | 63 % | 0.56 | -295.20 | tp4 sl6 tr0 h96 (11 · 1.07 · 1.80) |
| Signals | follow | sig-cci-m@m15 | 30 | 0 (0 %) | 179 | 58 % | 0.56 | -311.67 | tp4 sl8 tr0 h96 (6 · 0.93 · -1.20) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 7 (23 %) | 226 | 61 % | 0.58 | -319.05 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 15.50) |
| Signals | follow | sig-r-nr-break-m@m15 | 23 | 2 (9 %) | 109 | 43 % | 0.30 | -323.12 | tp3 sl9 tr1.2 h96 (11 · 0.87 · -1.36) |
| Signals | follow | sig-macd-cross-s@m15 | 29 | 4 (14 %) | 192 | 57 % | 0.51 | -328.71 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-macd-hist-s@m15 | 29 | 4 (14 %) | 192 | 57 % | 0.51 | -328.71 | tp4 sl6 tr0 h96 (9 · 1.23 · 4.20) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 70 | 43 % | 0.20 | -333.88 | – |
| Signals | follow | sig-hma-s@m15 | 24 | 0 (0 %) | 181 | 55 % | 0.44 | -343.19 | tp3 sl4.5 tr0 h96 (16 · 0.99 · -0.20) |
| Signals | follow | sig-thrust-m@m15 | 28 | 2 (7 %) | 227 | 62 % | 0.46 | -343.51 | tp2.5 sl7.5 tr0 h96 (13 · 1.00 · -0.10) |
| Signals | follow | sig-s2-atr-break-m@m15 | 29 | 5 (17 %) | 182 | 54 % | 0.41 | -346.24 | tp4 sl12 tr2.4 h96 (5 · 0.73 · -3.37) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 8 (27 %) | 158 | 51 % | 0.39 | -351.08 | tp5 sl15 tr2 h96 (6 · 0.61 · -5.99) |
| Signals | follow | sig-rsi-mid-s@m15 | 28 | 6 (21 %) | 159 | 53 % | 0.33 | -355.44 | tp5 sl15 tr2 h96 (7 · 21.63 · 4.13) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 11 (37 %) | 131 | 44 % | 0.32 | -356.84 | tp2.5 sl7.5 tr0 h96 (6 · 0.30 · -16.20) |
| Signals | follow | sig-act-hf-m@m15 | 29 | 6 (21 %) | 191 | 52 % | 0.44 | -365.23 | tp3 sl6 tr0 h96 (10 · 0.68 · -8.00) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 56 | 34 % | 0.09 | -376.60 | – |
| Signals | follow | sig-cmf-s@m15 | 25 | 2 (8 %) | 136 | 49 % | 0.29 | -381.93 | tp3 sl9 tr1.8 h96 (10 · 0.79 · -3.85) |
| Signals | follow | sig-heikin-ashi-s@m15 | 28 | 2 (7 %) | 273 | 60 % | 0.56 | -383.49 | tp5 sl7.5 tr0 h96 (10 · 1.45 · 10.50) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 3 (10 %) | 85 | 41 % | 0.24 | -383.88 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-kama-s@m15 | 26 | 4 (15 %) | 240 | 58 % | 0.44 | -390.05 | tp5 sl15 tr2 h96 (8 · ∞ (no loss) · 13.91) |
| Signals | follow | sig-swing-s@m15 | 28 | 2 (7 %) | 189 | 56 % | 0.39 | -393.14 | tp2.5 sl3.75 tr0 h96 (15 · 0.87 · -3.00) |
| Signals | follow | sig-impulse-s@m15 | 29 | 3 (10 %) | 199 | 53 % | 0.40 | -409.02 | tp4 sl6 tr0 h96 (7 · 0.82 · -3.40) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 8 (27 %) | 311 | 58 % | 0.50 | -413.52 | tp6 sl18 tr2.4 h96 (12 · 2.56 · 9.33) |
| Signals | follow | sig-rsi-mid-m@m15 | 27 | 4 (15 %) | 152 | 40 % | 0.26 | -415.33 | tp4 sl12 tr2.4 h96 (5 · 0.42 · -7.16) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 7 (23 %) | 158 | 49 % | 0.35 | -428.18 | tp5 sl15 tr2 h96 (6 · 0.56 · -6.75) |
| Signals | follow | sig-cci-s@m15 | 29 | 2 (7 %) | 244 | 60 % | 0.48 | -428.59 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 14.06) |
| Signals | follow | sig-s2-atr-break-s@m15 | 28 | 1 (4 %) | 119 | 35 % | 0.22 | -444.53 | tp4 sl12 tr1.6 h96 (5 · 0.31 · -8.61) |
| Signals | follow | sig-ema-trend-s@m15 | 29 | 6 (21 %) | 238 | 58 % | 0.42 | -447.38 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 6.57) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 0 (0 %) | 209 | 53 % | 0.46 | -469.57 | tp6 sl18 tr2.4 h96 (5 · 0.93 · -1.32) |
| Signals | follow | sig-zscore-s@m15 | 30 | 0 (0 %) | 209 | 53 % | 0.46 | -469.57 | tp6 sl18 tr2.4 h96 (5 · 0.93 · -1.32) |
| Signals | follow | sig-heikin-ashi-m@m15 | 25 | 2 (8 %) | 185 | 49 % | 0.32 | -483.35 | tp3 sl4.5 tr0 h96 (14 · 1.07 · 1.70) |
| Signals | follow | sig-impulse-m@m15 | 28 | 2 (7 %) | 111 | 31 % | 0.17 | -495.40 | tp4 sl12 tr1.6 h96 (5 · 68.32 · 8.79) |
| Signals | follow | sig-cmf-m@m15 | 29 | 3 (10 %) | 135 | 41 % | 0.21 | -501.82 | tp3 sl9 tr1.2 h96 (9 · 0.48 · -4.91) |
| Signals | follow | sig-r-nr-break-s@m15 | 23 | 0 (0 %) | 127 | 38 % | 0.21 | -504.35 | tp2.5 sl3.75 tr0 h96 (13 · 0.93 · -1.35) |
| Signals | follow | sig-swing-m@m15 | 30 | 0 (0 %) | 265 | 55 % | 0.39 | -538.45 | tp5 sl15 tr2 h96 (10 · 0.55 · -6.95) |
| Signals | follow | sig-thrust-s@m15 | 27 | 0 (0 %) | 163 | 33 % | 0.16 | -755.91 | tp4 sl12 tr1.6 h96 (8 · 0.33 · -16.51) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 104 | 96 (92 %) | 286 | 95 % | 3.46 | 537.31 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 74 | 66 (89 %) | 122 | 93 % | 3.10 | 406.57 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 53 | 45 (85 %) | 85 | 87 % | 2.71 | 332.24 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 104 | 82 (79 %) | 254 | 90 % | 1.74 | 299.11 |
| Long | tp 5.600% | sl 1.00× | tr off | 70 | 25 (36 %) | 88 | 81 % | 3.89 | 284.80 |
| Long | tp 6.000% | sl 1.00× | tr off | 92 | 28 (30 %) | 106 | 73 % | 2.48 | 266.80 |
| Long | tp 5.200% | sl 1.00× | tr off | 69 | 22 (32 %) | 67 | 90 % | 7.94 | 262.20 |
| Long | tp 6.400% | sl 1.00× | tr off | 90 | 25 (28 %) | 94 | 72 % | 2.46 | 250.00 |
| Long | tp 6.000% | sl 0.75× | tr off | 71 | 24 (34 %) | 107 | 65 % | 2.33 | 232.10 |
| Long | tp 6.400% | sl 0.75× | tr off | 78 | 20 (26 %) | 90 | 63 % | 2.14 | 188.40 |
| General | tp 4.400% | sl 1.00× | tr off | 50 | 20 (40 %) | 80 | 66 % | 1.79 | 98.40 |
| Long | tp 5.600% | sl 1.00× | tr 0.50× | 73 | 21 (29 %) | 54 | 80 % | 3.11 | 98.27 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 108 | 35 (32 %) | 129 | 66 % | 2.46 | 98.16 |
| Long | tp 6.000% | sl 1.00× | tr 0.50× | 82 | 18 (22 %) | 72 | 75 % | 1.84 | 93.86 |
| Long | tp 4.800% | sl 1.00× | tr off | 76 | 23 (30 %) | 93 | 62 % | 1.52 | 91.80 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 86 | 55 (64 %) | 169 | 80 % | 1.14 | 83.84 |
| Long | tp 5.600% | sl 1.00× | tr 0.75× | 62 | 11 (18 %) | 42 | 76 % | 2.48 | 77.51 |
| Long | tp 6.400% | sl 1.00× | tr 0.50× | 74 | 12 (16 %) | 49 | 73 % | 2.06 | 76.95 |
| Long | tp 5.600% | sl 0.75× | tr off | 58 | 16 (28 %) | 152 | 49 % | 1.20 | 66.20 |
| Long | tp 6.000% | sl 1.00× | tr 0.75× | 60 | 11 (18 %) | 44 | 70 % | 1.75 | 60.30 |
| Long | tp 5.200% | sl 1.00× | tr 0.50× | 77 | 15 (19 %) | 44 | 80 % | 2.56 | 59.39 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 96 | 27 (28 %) | 70 | 84 % | 1.82 | 52.48 |
| Long | tp 5.200% | sl 1.00× | tr 0.75× | 58 | 11 (19 %) | 28 | 71 % | 2.19 | 51.29 |
| Short | tp 2.600% | sl 2.00× | tr 0.50× | 126 | 39 (31 %) | 163 | 69 % | 1.47 | 49.93 |
| Long | tp 4.800% | sl 1.00× | tr 0.50× | 79 | 26 (33 %) | 78 | 73 % | 1.45 | 45.14 |
| Long | tp 4.800% | sl 0.75× | tr off | 44 | 12 (27 %) | 90 | 51 % | 1.27 | 44.40 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 119 | 34 (29 %) | 161 | 75 % | 1.32 | 36.13 |
| Long | tp 5.200% | sl 0.50× | tr off | 15 | 4 (27 %) | 49 | 43 % | 1.34 | 26.60 |
| Short | tp 2.400% | sl 2.00× | tr off | 85 | 27 (32 %) | 73 | 73 % | 1.17 | 16.60 |
| Long | tp 6.400% | sl 0.50× | tr off | 30 | 4 (13 %) | 28 | 39 % | 1.18 | 10.40 |
| Short | tp 1.800% | sl 2.00× | tr 0.50× | 53 | 17 (32 %) | 46 | 57 % | 1.47 | 8.45 |
| Micro | tp 0.600% (net 0.400%) | sl 4.25× | tr off | 100 | 8 (8 %) | 20 | 90 % | 1.31 | 1.70 |
| Micro | tp 0.600% (net 0.400%) | sl 4.50× | tr off | 96 | 8 (8 %) | 20 | 90 % | 1.24 | 1.40 |
| Micro | tp 0.600% (net 0.400%) | sl 4.00× | tr off | 102 | 6 (6 %) | 16 | 88 % | 1.08 | 0.40 |
| Wide | tp 0.760% | sl 0.89× | tr off | 42 | 12 (29 %) | 45 | 53 % | 0.96 | -0.61 |
| Micro | tp 0.600% (net 0.400%) | sl 4.75× | tr off | 76 | 6 (8 %) | 14 | 86 % | 0.79 | -1.30 |
| Micro | tp 0.600% (net 0.400%) | sl 2.25× | tr off | 8 | 4 (50 %) | 12 | 67 % | 0.52 | -3.00 |
| Micro | tp 0.550% (net 0.350%) | sl 2.50× | tr off | 8 | 4 (50 %) | 12 | 67 % | 0.44 | -3.50 |
| Short | tp 2.200% | sl 1.00× | tr 0.50× | 40 | 10 (25 %) | 98 | 55 % | 0.94 | -4.42 |
| Micro | tp 0.600% (net 0.400%) | sl 3.50× | tr 0.75× | 9 | 6 (67 %) | 21 | 62 % | 0.53 | -4.65 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 4.000% | sl 3.00× | tr off | 113 | 28 (25 %) | 449 | 62 % | 0.50 | -1045.80 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 118 | 32 (27 %) | 757 | 63 % | 0.54 | -1024.06 |
| Signals | tp 6.000% | sl 1.50× | tr off | 103 | 19 (18 %) | 315 | 40 % | 0.41 | -1023.00 |
| Signals | tp 3.000% | sl 3.00× | tr off | 118 | 31 (26 %) | 678 | 65 % | 0.56 | -981.60 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 118 | 35 (30 %) | 959 | 65 % | 0.56 | -968.21 |
| Signals | tp 3.000% | sl 1.50× | tr off | 122 | 31 (25 %) | 1153 | 52 % | 0.64 | -949.10 |
| Signals | tp 5.000% | sl 2.00× | tr off | 111 | 31 (28 %) | 386 | 52 % | 0.51 | -937.20 |
| Signals | tp 4.000% | sl 2.00× | tr off | 116 | 26 (22 %) | 600 | 55 % | 0.57 | -936.00 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 118 | 32 (27 %) | 1267 | 58 % | 0.54 | -935.89 |
| Signals | tp 2.500% | sl 2.00× | tr off | 122 | 32 (26 %) | 1223 | 60 % | 0.67 | -832.10 |
| Signals | tp 2.500% | sl 1.50× | tr off | 122 | 27 (22 %) | 1393 | 54 % | 0.68 | -827.35 |
| Signals | tp 6.000% | sl 2.00× | tr off | 93 | 18 (19 %) | 227 | 48 % | 0.44 | -807.40 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 115 | 37 (32 %) | 491 | 69 % | 0.57 | -785.56 |
| Signals | tp 5.000% | sl 1.50× | tr off | 115 | 32 (28 %) | 513 | 50 % | 0.62 | -750.10 |
| Signals | tp 2.500% | sl 3.00× | tr off | 119 | 36 (30 %) | 947 | 69 % | 0.67 | -731.90 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 75 (75) | 55932 | 26962 | 26962 | 0 | baseTarget 28970 |
| Micro | trailing | 75 (75) | 111864 | 53924 | 53924 | 0 | baseTarget 57940 |
| Short | normal | 246 (223) | 36432 | 15684 | 15684 | 0 | baseTarget 9876 · baseRange 10872 |
| Short | trailing | 246 (223) | 72864 | 31368 | 31368 | 0 | baseTarget 19752 · baseRange 21744 |
| General | normal | 246 (209) | 24288 | 9402 | 9402 | 0 | baseTarget 4110 · baseRange 10776 |
| General | trailing | 246 (209) | 16192 | 6268 | 6268 | 0 | baseTarget 2740 · baseRange 7184 |
| Long | normal | 246 (218) | 30360 | 13206 | 13206 | 0 | baseRange 11400 · baseTarget 5754 |
| Long | trailing | 246 (218) | 20240 | 8804 | 8804 | 0 | baseRange 7600 · baseTarget 3836 |
| Wide | axis | 321 (321) | 56475 | 56475 | 56475 | 0 | – |
| Wide | dca | 321 (321) | 5020 | 5020 | 5020 | 0 | – |
| Wide | dca-active | 321 (321) | 5020 | 5020 | 5020 | 0 | – |

Engine indications Base evaluated that built no set: 70 (act-burst-1.5, bb-bounce, bb-walk, break-atr, break-atr-0.9, break-atr-2, cci-14-100, cci-20-100, cci-20-200, dir-reclaim-50, dir-vwap-30, ema-slope-10, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-burst-3, mc-engulf-20, mc-mturn-10, mc-mturn-5, mc-qrsi2-5, mc-rsi3-5, mc-rsi4-5, mc-rsi9-15, mc-rsimid-14, mc-rsit14-30, mc-rsit2-30, mc-rsit2-5, mc-rsit3-15, mc-rsit3-20, mc-rsit3-25, mc-rsit3-30, mc-rsit3-5, mc-rsit4-10, mc-rsit4-20, mc-rsit4-25, mc-rsit4-30, mc-rsit4-5, mc-rsit5-20, mc-rsit5-25, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.28 (414) | 0.37 (546) | 0.39 (552) | 0.36 (528) | 0.42 (738) |
| 1.14× | – | 0.16 (378) | – | – | – | – | – |
| 1.25× | – | 0.18 (372) | 0.31 (408) | 0.39 (504) | 0.40 (536) | 0.37 (512) | 0.40 (724) |
| 1.33× | 0.11 (312) | – | – | – | – | – | – |
| 1.5× | 0.13 (306) | 0.19 (360) | 0.34 (390) | 0.40 (500) | 0.38 (518) | 0.37 (504) | 0.43 (720) |
| 1.75× | 0.14 (294) | 0.19 (360) | 0.29 (386) | 0.37 (492) | 0.34 (514) | 0.33 (500) | 0.41 (708) |
| 2× | 0.13 (294) | 0.18 (358) | 0.27 (382) | 0.33 (488) | 0.30 (514) | 0.35 (466) | 0.44 (678) |
| 2.25× | 0.12 (292) | 0.17 (354) | 0.25 (374) | 0.31 (488) | 0.32 (486) | 0.33 (466) | 0.43 (678) |
| 2.5× | 0.11 (292) | 0.16 (346) | 0.24 (374) | 0.32 (466) | 0.32 (486) | 0.34 (466) | 0.46 (672) |
| 2.75× | 0.10 (292) | 0.15 (346) | 0.25 (352) | 0.31 (466) | 0.33 (486) | 0.35 (466) | 0.48 (672) |
| 3× | 0.09 (280) | 0.14 (346) | 0.25 (352) | 0.32 (466) | 0.36 (480) | 0.37 (466) | 0.46 (670) |
| 3.25× | 0.09 (280) | 0.15 (326) | 0.27 (352) | 0.34 (466) | 0.39 (500) | 0.36 (464) | 0.50 (658) |
| 3.5× | 0.08 (280) | 0.15 (326) | 0.25 (352) | 0.35 (466) | 0.37 (488) | 0.41 (452) | 0.53 (658) |
| 3.75× | 0.09 (260) | 0.16 (326) | 0.28 (352) | 0.33 (466) | 0.46 (488) | 0.40 (452) | 0.50 (654) |
| 4× | 0.09 (260) | 0.15 (326) | 0.30 (352) | 0.32 (464) | 0.51 (488) | 0.43 (448) | 0.54 (648) |
| 4.25× | 0.11 (260) | 0.17 (326) | 0.29 (352) | 0.41 (464) | 0.56 (478) | 0.40 (448) | 0.56 (636) |
| 4.5× | 0.10 (260) | 0.18 (326) | 0.27 (360) | 0.44 (464) | 0.53 (474) | 0.47 (436) | 0.57 (636) |
| 4.75× | 0.12 (260) | 0.18 (326) | 0.39 (360) | 0.46 (464) | 0.51 (474) | 0.45 (436) | 0.55 (636) |
| 5× | 0.12 (260) | 0.17 (334) | 0.41 (360) | 0.44 (460) | 0.63 (462) | 0.48 (442) | 0.67 (612) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | 0.00 (8) | ∞ (4) | ∞ (4) |
| 2× | – | – | – | 0.00 (4) | 0.17 (10) | ∞ (4) | ∞ (4) |
| 2.25× | – | – | 0.00 (4) | 0.21 (8) | 0.15 (10) | ∞ (4) | 0.39 (20) |
| 2.5× | – | 0.00 (2) | 0.33 (6) | 0.19 (8) | 0.29 (16) | 0.37 (16) | 0.30 (32) |
| 2.75× | – | 0.00 (2) | 0.15 (4) | 0.17 (8) | 0.10 (18) | 0.22 (25) | 0.18 (37) |
| 3× | 0.00 (2) | 0.00 (2) | 0.00 (2) | 0.04 (10) | 0.14 (26) | 0.20 (25) | 0.23 (34) |
| 3.25× | 0.00 (2) | 0.00 (2) | 0.00 (2) | 0.05 (13) | 0.10 (36) | 0.18 (28) | 0.24 (32) |
| 3.5× | 0.00 (2) | 0.00 (2) | 0.04 (13) | 0.05 (16) | 0.07 (30) | 0.15 (19) | 0.40 (51) |
| 3.75× | 0.00 (2) | 0.00 (2) | 0.08 (17) | 0.05 (22) | 0.07 (30) | 0.15 (31) | 0.39 (52) |
| 4× | 0.00 (2) | 0.04 (11) | 0.08 (17) | 0.05 (25) | 0.08 (38) | 0.13 (23) | 0.50 (36) |
| 4.25× | 0.00 (2) | 0.03 (13) | 0.07 (17) | 0.05 (25) | 0.11 (47) | 0.14 (28) | 0.57 (45) |
| 4.5× | 0.00 (6) | 0.06 (20) | 0.07 (17) | 0.06 (30) | 0.11 (49) | 0.33 (36) | 0.61 (51) |
| 4.75× | 0.00 (6) | 0.05 (23) | 0.07 (17) | 0.08 (36) | 0.13 (54) | 0.25 (33) | 0.50 (45) |
| 5× | 0.03 (12) | 0.05 (23) | 0.07 (25) | 0.08 (41) | 0.17 (54) | 0.24 (33) | 0.29 (71) |

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
| 3.75× | – | – | – | – | 0.00 (4) | 0.00 (3) | ∞ (1) |
| 4× | – | – | – | – | 0.00 (2) | – | ∞ (1) |
| 4.25× | – | – | – | – | – | – | ∞ (2) |
| 4.5× | – | – | – | – | – | – | – |
| 4.75× | – | – | – | – | – | – | – |
| 5× | – | – | – | – | – | – | 0.25 (6) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.63 (6230) | 0.65 (7144) | 0.71 (7395) | 0.69 (7786) | 0.73 (7429) | 0.72 (8626) |
| 1.5× | 0.74 (5668) | 0.72 (6413) | 0.72 (6539) | 0.76 (6570) | 0.77 (6232) | 0.86 (7079) |
| 2× | 0.79 (5138) | 0.76 (5631) | 0.79 (5841) | 0.90 (5912) | 0.93 (5748) | 0.96 (6572) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.26 (149) | 0.46 (335) | 0.48 (305) | 0.32 (443) | 0.31 (549) | 0.32 (701) |
| 1.5× | 0.33 (280) | 0.31 (441) | 0.34 (395) | 0.57 (492) | 0.59 (650) | 0.65 (578) |
| 2× | 0.46 (280) | 0.38 (314) | 0.49 (273) | 1.08 (332) | 0.73 (437) | 1.02 (387) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.00 (19) | 0.21 (32) | 0.35 (36) | 0.28 (66) | 0.20 (70) | 0.19 (93) |
| 1.5× | 0.30 (37) | 0.31 (56) | 0.20 (61) | 0.20 (57) | 0.23 (62) | 0.30 (75) |
| 2× | 0.23 (53) | 0.28 (46) | 0.19 (21) | 0.18 (37) | 0.19 (40) | 0.28 (64) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.87 (2442) | 0.84 (1893) | 0.90 (1954) | 1.12 (1955) |
| 0.75× | 0.93 (2137) | 0.97 (1648) | 0.91 (1737) | 1.08 (1689) |
| 1× | 0.87 (5731) | 0.89 (4336) | 0.78 (4315) | 1.02 (4322) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.65 (110) | 0.32 (76) | 0.22 (62) | 0.54 (17) |
| 0.75× | 0.52 (216) | 0.38 (77) | 0.47 (142) | 0.85 (53) |
| 1× | 0.25 (356) | 0.72 (361) | 0.38 (279) | 1.09 (251) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.00 (7) | 0.00 (6) | 0.00 (8) | 0.00 (2) |
| 0.75× | 0.07 (33) | 0.17 (16) | 0.09 (14) | 0.11 (12) |
| 1× | 0.33 (66) | 0.18 (35) | 0.32 (23) | 0.12 (37) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.09 (2087) | 1.01 (1863) | 1.02 (2018) | 1.21 (1595) | 1.14 (1885) |
| 0.75× | 1.08 (1687) | 1.04 (1530) | 1.14 (1596) | 1.22 (1301) | 1.25 (1466) |
| 1× | 0.99 (4325) | 0.95 (3918) | 0.89 (3954) | 1.10 (3009) | 0.97 (3572) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.96 (88) | 1.34 (49) | 0.29 (58) | 0.72 (21) | 1.18 (28) |
| 0.75× | 1.27 (90) | 0.98 (121) | 1.20 (152) | 2.33 (107) | 2.14 (90) |
| 1× | 1.25 (243) | 4.13 (139) | 3.33 (184) | 2.13 (222) | 1.88 (168) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (2) | 0.00 (7) | 0.00 (11) | 0.00 (12) | 0.00 (2) |
| 0.75× | 0.00 (6) | 0.00 (5) | 0.31 (5) | 0.62 (6) | 0.93 (7) |
| 1× | 0.12 (22) | 0.13 (14) | 0.04 (15) | 0.07 (15) | 0.16 (9) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.56 (10767) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.38 (420) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.78 (9394) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.42 (398) | 0.57 (387) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.35 (387) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.67 (360) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.72 (352) | – | – | – | – |
| 1× | – | – | – | 0.66 (97105) | – | – | – | 0.71 (42698) | 0.49 (3323) | – | 0.63 (1720) | – | 0.55 (2938) | 0.58 (2596) | 0.76 (1403) | 1.12 (1218) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.59 (1000) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.96 (45) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.65 (182) | – | – | – | ∞ (6) | – | – | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.00 (17) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 1.92 (14) | – | – | – | – | – | – | – | – | – | – | – | – |
