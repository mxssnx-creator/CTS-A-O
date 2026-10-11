# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.40–$1.16 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T03:00 UTC. Engine: Base 1122/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126; Main 1057 pairs, 157517 tapes, Real seats: 6807 engine configs + 3750 signal configs (every config of the active signals), compute 154 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $25.14 (25.69 %, closed orders) · equity at end $22.56 (open at end: 23 positions / 4193 orders, MTM -$2.58 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 4.17 (gross profit $ ÷ gross loss $ as sized) · PF unit 3.98 (every order at one unit: the engine's PF) · 38 positions / 3577 orders (incl. 214 capped to $0) · WR 81.30 % · DDT (closed trades, $) 1.50 h · DDR 0.05 · equity max drawdown $2.45 (10.96 %) · margin used max $17.65 · open avg 17.03 pos / 799.81 orders (peak 21 / 1197)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 214 orders capped to $0, 3141 scaled down (open at end: 99 capped, 4013 scaled) · binding: position cap 5846, gross cap 7022. **Without the caps:** balance $20.00 → $54.96 (174.79 %) · PF $ 3.41 · equity at end $12.37 · equity max drawdown $45.87 (112.23 %) · margin used max $379.51 · infeasible: margin exceeded equity for 616 min.

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
| 15:00 | 2 / 144 | 107 / 37 | 2.26 | 2.81 | 74 % | $0.46 | $20.46 | $20.38 | $19.13 | 9.06 % | 0.57 | $10.53 | 14 / 365 |
| 16:00 | 4 / 86 | 77 / 9 | 5.57 | 7.33 | 90 % | $0.44 | $20.90 | $20.31 | $19.92 | 10.96 % | 1.57 | $14.63 | 15 / 636 |
| 17:00 | 0 / 46 | 34 / 12 | 6.41 | 7.39 | 74 % | $0.01 | $20.91 | $20.93 | $19.94 | 10.96 % | 2.57 | $14.64 | 16 / 1095 |
| 18:00 | 0 / 334 | 329 / 5 | 4413.89 | 1625.50 | 99 % | $0.93 | $21.84 | $21.58 | $20.86 | 10.96 % | 3.57 | $15.29 | 20 / 1303 |
| 19:00 | 2 / 276 | 218 / 58 | 3.88 | 4.70 | 79 % | $0.32 | $22.16 | $21.49 | $20.39 | 10.96 % | 4.57 | $15.51 | 20 / 1628 |
| 20:00 | 1 / 397 | 385 / 12 | 15.08 | 43.32 | 97 % | $0.91 | $23.08 | $22.76 | $21.40 | 10.96 % | 0.03 | $16.15 | 20 / 1752 |
| 21:00 | 1 / 288 | 266 / 22 | 63.74 | 55.75 | 92 % | $0.67 | $23.75 | $23.15 | $22.75 | 10.96 % | 0.42 | $16.62 | 21 / 2296 |
| 22:00 | 0 / 220 | 174 / 46 | 2.82 | 3.12 | 79 % | $0.26 | $24.01 | $23.22 | $22.84 | 10.96 % | 1.42 | $16.80 | 21 / 2559 |
| 23:00 | 0 / 255 | 170 / 85 | 2.28 | 1.88 | 67 % | $0.18 | $24.19 | $23.69 | $22.73 | 10.96 % | 2.42 | $16.93 | 22 / 2847 |
| 00:00 | 3 / 402 | 317 / 85 | 5.13 | 3.34 | 79 % | $0.37 | $24.56 | $23.37 | $22.71 | 10.96 % | 0.80 | $17.19 | 21 / 3345 |
| 01:00 | 0 / 312 | 252 / 60 | 2.82 | 2.28 | 81 % | $0.22 | $24.78 | $21.95 | $21.95 | 10.96 % | 1.80 | $17.35 | 22 / 4221 |
| 02:00 | 0 / 817 | 579 / 238 | 1.74 | 2.02 | 71 % | $0.35 | $25.14 | $22.56 | $21.77 | 10.96 % | 2.80 | $17.65 | 23 / 4193 |

**Last hour (02:00):** open at end: 23 positions / 4193 orders, MTM -$2.58 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $22.56 = balance $25.14 + MTM -$2.58.

**Hours positive:** 12 of 12 full hours · flat 0 · negative 0

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 15:00 | 3 · 0.00 · -$0.04 | – | 138 · 2.73 · $0.52 | – | 3 · 0.00 · -$0.02 |
| 16:00 | 6 · ∞ (no loss) · $0.01 | – | 76 · 5.11 · $0.40 | 2 · ∞ (no loss) · $0.00 | 2 · ∞ (no loss) · $0.03 |
| 17:00 | – | – | 31 · 6.80 · $0.01 | 15 · 5.35 · $0.00 | – |
| 18:00 | – | – | 325 · 4412.88 · $0.93 | 7 · ∞ (no loss) · $0.00 | 2 · ∞ (no loss) · $0.00 |
| 19:00 | – | 6 · 589564278153.54 · $0.00 | 215 · 3.70 · $0.26 | 21 · 119.05 · $0.06 | 34 · 0.73 · -$0.00 |
| 20:00 | 6 · – · $0.00 | 3 · ∞ (no loss) · $0.00 | 372 · 14.16 · $0.85 | 6 · ∞ (no loss) · $0.04 | 10 · ∞ (no loss) · $0.02 |
| 21:00 | 5 · ∞ (no loss) · $0.00 | – | 267 · 62.68 · $0.66 | 10 · ∞ (no loss) · $0.01 | 6 · ∞ (no loss) · $0.01 |
| 22:00 | 1 · ∞ (no loss) · $0.00 | – | 209 · 2.78 · $0.25 | – | 10 · 22.28 · $0.01 |
| 23:00 | – | – | 183 · 3.31 · $0.23 | 3 · 0.00 · -$0.00 | 69 · 0.13 · -$0.04 |
| 00:00 | – | 3 · ∞ (no loss) · $0.00 | 360 · 6.27 · $0.35 | 3 · ∞ (no loss) · $0.00 | 36 · 1.60 · $0.01 |
| 01:00 | 3 · ∞ (no loss) · $0.00 | – | 278 · 2.79 · $0.21 | 26 · 824.15 · $0.02 | 5 · 0.20 · -$0.01 |
| 02:00 | – | – | 729 · 1.75 · $0.35 | 19 · 0.99 · -$0.00 | 69 · 1.25 · $0.00 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 144 | 11 · 0.06 · 9 % · -$0.11 | 59 · 0.77 · 61 % · -$0.05 | 35 · 7.43 · 91 % · $0.25 | 39 · 502.48 · 97 % · $0.37 | – | 74 · 16.67 · 95 % · $0.61 |
| 16:00 | 86 | 3 · ∞ (no loss) · 100 % · $0.04 | 26 · ∞ (no loss) · 100 % · $0.17 | 25 · 11.90 · 96 % · $0.18 | 32 · 1.64 · 75 % · $0.05 | – | 57 · 3.38 · 84 % · $0.23 |
| 17:00 | 46 | 1 · – · 100 % · $0.00 | 42 · 5.26 · 74 % · $0.01 | – | 3 · 98.34 · 67 % · $0.00 | – | 3 · 98.34 · 67 % · $0.00 |
| 18:00 | 334 | 17 · ∞ (no loss) · 100 % · $0.00 | 15 · ∞ (no loss) · 100 % · $0.04 | 152 · ∞ (no loss) · 100 % · $0.48 | 150 · 1954.08 · 97 % · $0.41 | – | 302 · 4245.20 · 98 % · $0.90 |
| 19:00 | 276 | 52 · 17.41 · 73 % · $0.10 | 43 · 1.61 · 40 % · $0.01 | 78 · 2.96 · 92 % · $0.11 | 103 · 3.65 · 88 % · $0.10 | – | 181 · 3.23 · 90 % · $0.22 |
| 20:00 | 397 | 31 · ∞ (no loss) · 100 % · $0.14 | 10 · ∞ (no loss) · 100 % · $0.00 | 189 · 8.19 · 97 % · $0.43 | 167 · 62.79 · 96 % · $0.35 | – | 356 · 12.91 · 97 % · $0.77 |
| 21:00 | 288 | 8 · ∞ (no loss) · 100 % · $0.01 | 20 · ∞ (no loss) · 100 % · $0.02 | 91 · 45.46 · 98 % · $0.28 | 169 · 84.82 · 88 % · $0.36 | – | 260 · 61.22 · 92 % · $0.64 |
| 22:00 | 220 | 10 · 20.62 · 90 % · $0.01 | 7 · ∞ (no loss) · 100 % · $0.00 | 103 · 1.27 · 72 % · $0.03 | 100 · 14.27 · 84 % · $0.21 | – | 203 · 2.76 · 78 % · $0.25 |
| 23:00 | 255 | 37 · 0.28 · 5 % · -$0.01 | 38 · 0.01 · 8 % · -$0.03 | 101 · 1.86 · 92 % · $0.08 | 79 · 358.95 · 91 % · $0.14 | – | 180 · 3.31 · 92 % · $0.22 |
| 00:00 | 402 | 21 · 0.15 · 24 % · -$0.01 | 79 · 17.02 · 85 % · $0.09 | 119 · 2.68 · 82 % · $0.11 | 183 · 54.16 · 81 % · $0.18 | – | 302 · 5.36 · 81 % · $0.29 |
| 01:00 | 312 | 15 · 0.80 · 87 % · -$0.00 | 57 · 851.46 · 93 % · $0.03 | 99 · 0.90 · 66 % · -$0.01 | 141 · 111.99 · 86 % · $0.21 | – | 240 · 2.72 · 78 % · $0.20 |
| 02:00 | 817 | 97 · 0.30 · 8 % · -$0.01 | 39 · 1.04 · 28 % · $0.00 | 368 · 1.30 · 77 % · $0.12 | 313 · 5.91 · 88 % · $0.25 | – | 681 · 1.82 · 82 % · $0.37 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (157517 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (9304); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 38061 · 0.74 | 8440 · 0.84 | 14035 · 0.63 | 1884 · 3.84 | 144 · 2.81 | 11 · 0.07 | 59 · 1.00 | – | 74 · 19.59 |
| 16:00 | 47998 · 0.45 | 13323 · 0.68 | 19129 · 0.60 | 2806 · 2.43 | 86 · 7.33 | 3 · ∞ (no loss) | 26 · ∞ (no loss) | – | 57 · 4.88 |
| 17:00 | 34070 · 0.48 | 7350 · 0.40 | 16473 · 0.38 | 1779 · 4.53 | 46 · 7.39 | 1 · ∞ (no loss) | 42 · 5.91 | – | 3 · 20.59 |
| 18:00 | 35609 · 1.41 | 11516 · 1.58 | 15819 · 2.16 | 3122 · 3.28 | 334 · 1625.50 | 17 · ∞ (no loss) | 15 · ∞ (no loss) | – | 302 · 1474.74 |
| 19:00 | 28121 · 0.99 | 8146 · 1.41 | 8267 · 0.91 | 1960 · 2.01 | 276 · 4.70 | 52 · 2.77 | 43 · 0.65 | – | 181 · 11.90 |
| 20:00 | 44256 · 2.53 | 14756 · 3.87 | 16968 · 2.20 | 3294 · 3.24 | 397 · 43.32 | 31 · ∞ (no loss) | 10 · ∞ (no loss) | – | 356 · 39.60 |
| 21:00 | 30865 · 2.38 | 8393 · 1.75 | 13396 · 5.28 | 2449 · 7.96 | 288 · 55.75 | 8 · ∞ (no loss) | 20 · ∞ (no loss) | – | 260 · 47.28 |
| 22:00 | 23071 · 1.14 | 5549 · 1.42 | 7039 · 2.18 | 1969 · 4.58 | 220 · 3.12 | 10 · 10.08 | 7 · ∞ (no loss) | – | 203 · 2.86 |
| 23:00 | 24194 · 0.63 | 7464 · 0.83 | 8212 · 0.54 | 2381 · 1.80 | 255 · 1.88 | 37 · 0.06 | 38 · 0.01 | – | 180 · 13.39 |
| 00:00 | 37958 · 1.09 | 11098 · 1.08 | 14062 · 1.40 | 4743 · 0.66 | 402 · 3.34 | 21 · 0.12 | 79 · 5.19 | – | 302 · 4.51 |
| 01:00 | 52246 · 1.08 | 12673 · 1.31 | 21053 · 1.36 | 2923 · 0.92 | 312 · 2.28 | 15 · 3.98 | 57 · 203.26 | – | 240 · 1.84 |
| 02:00 | 51715 · 1.35 | 15570 · 1.85 | 19035 · 2.69 | 5455 · 3.13 | 817 · 2.02 | 97 · 0.15 | 39 · 0.31 | – | 681 · 3.28 |
| **total** | **448164 · 1.05** | **124278 · 1.33** | **173488 · 1.28** | **34765 · 1.93** | **3577 · 3.98** | **303 · 0.70** | **435 · 1.75** | **–** | **2839 · 6.20** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 303 | 136 / 167 | 1.71 | 0.70 | $0.13 | 44.88 % | 5.00 |
| Trailing | 435 | 296 / 139 | 2.16 | 1.75 | $0.30 | 68.05 % | 1.75 |
| Signal · Normal | 1360 | 1165 / 195 | 3.11 | 3.66 | $2.06 | 85.66 % | 0.50 |
| Signal · Trailing | 1479 | 1311 / 168 | 14.05 | 29.01 | $2.64 | 88.64 % | 1.50 |
| total | 3577 | 2908 / 669 | 4.17 | 3.98 | $5.14 | 81.30 % | 1.50 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 2839 | 2476 / 363 | 4.99 | 6.20 | $4.71 | 87.21 % | 1.50 |
| of which Engine (no signals) | 738 | 432 / 306 | 1.97 | 1.13 | $0.43 | 58.54 % | 1.50 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 24 | 0.27 | 0.90 | -$0.03 |
| 5m+ | 12 | 1972312881870.14 | 1.39 | $0.00 |
| 15m | 3183 | 4.45 | 5.70 | $5.02 |
| 15m+ | 112 | 26.08 | 4.61 | $0.13 |
| 30m | 246 | 1.06 | 0.31 | $0.01 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 36 | 30 / 6 | 0.32 | 1.00 | -$0.03 | 83.33 % | 11.83 |
| Short | 409 | 276 / 133 | 1.77 | 1.58 | $0.23 | 67.48 % | 1.50 |
| General | 227 | 108 / 119 | 3.22 | 1.05 | $0.23 | 47.58 % | 2.50 |
| Long | 66 | 18 / 48 | 0.95 | 0.37 | -$0.00 | 27.27 % | 4.50 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 2839 | 2476 / 363 | 4.99 | 6.20 | $4.71 | 87.21 % | 1.50 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 40041 | sig:duplicate 12805 · sig:confirm 10866 · sig:signalPf 9342 · sig:signalSide 5055 · sig:signalCluster 1973 |
| Short | 4866 | lastN 3905 · engineSide 407 · duplicate 297 · symPf 257 |
| Micro | 3145 | crowd 2192 · engineSide 638 · lastN 189 · duplicate 84 · symPf 42 |
| Long | 3055 | lastN 2209 · engineSide 440 · duplicate 232 · symPf 174 |
| General | 2504 | lastN 1835 · duplicate 402 · symPf 156 · engineSide 111 |
| Wide | 529 | lastN 242 · engineSide 212 · symPf 75 |

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
| Micro | 2.47 | 1.00 | 0.41 | 0.32 | 0.32 | 36 |
| Short | 1.65 | 1.58 | 0.96 | 1.77 | 1.12 | 409 |
| General | 1.55 | 1.05 | 0.67 | 3.22 | 3.08 | 227 |
| Long | 1.49 | 0.37 | 0.25 | 0.95 | 2.55 | 66 |
| Wide | 1.68 | – | – | – | – | 0 |
| Signals | – | 6.20 | – | 4.99 | 0.80 | 2839 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (5894 of 126234 evaluated, 153737 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2111 units active at the run start, 2919 over the run, 3410 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 682 | 343 (50 %) | 1260 | 94 % | 1.98 | 185.72 |
| Micro | trailing | 619 | 394 (64 %) | 1474 | 72 % | 2.91 | 219.66 |
| Short | normal | 638 | 273 (43 %) | 738 | 71 % | 1.53 | 395.00 |
| Short | trailing | 1387 | 583 (42 %) | 2130 | 62 % | 1.08 | 176.23 |
| General | normal | 580 | 244 (42 %) | 788 | 55 % | 1.37 | 420.70 |
| General | trailing | 520 | 178 (34 %) | 636 | 55 % | 1.28 | 237.98 |
| Long | normal | 768 | 235 (31 %) | 708 | 52 % | 1.35 | 503.60 |
| Long | trailing | 426 | 107 (25 %) | 365 | 69 % | 1.60 | 335.89 |
| Wide | axis | 274 | 86 (31 %) | 623 | 41 % | 0.87 | -55.80 |
| Signals | normal | 1712 | 1352 (79 %) | 12735 | 79 % | 1.87 | 15199.25 |
| Signals | trailing | 1698 | 1426 (84 %) | 13308 | 82 % | 2.42 | 16372.39 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1301 | 737 (57 %) | 2734 | 82 % | 2.33 | 405.39 |
| Short | active | 23 | 8 (35 %) | 13 | 77 % | 1.88 | 11.66 |
| Short | bollinger | 12 | 3 (25 %) | 3 | 100 % | ∞ (no loss) | 8.94 |
| Short | break | 413 | 135 (33 %) | 524 | 62 % | 1.09 | 54.96 |
| Short | channel | 83 | 9 (11 %) | 10 | 100 % | ∞ (no loss) | 24.40 |
| Short | direction | 66 | 52 (79 %) | 178 | 64 % | 1.19 | 33.31 |
| Short | ema | 131 | 109 (83 %) | 253 | 81 % | 3.70 | 180.72 |
| Short | ichimoku | 7 | 1 (14 %) | 19 | 42 % | 0.57 | -13.68 |
| Short | macd | 44 | 27 (61 %) | 57 | 72 % | 1.65 | 36.06 |
| Short | move | 457 | 210 (46 %) | 683 | 64 % | 1.44 | 227.55 |
| Short | osc | 246 | 108 (44 %) | 241 | 79 % | 3.45 | 321.99 |
| Short | rsi | 105 | 10 (10 %) | 268 | 38 % | 0.42 | -340.68 |
| Short | smooth | 22 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | trend | 308 | 161 (52 %) | 533 | 70 % | 1.34 | 160.38 |
| Short | volume | 108 | 23 (21 %) | 86 | 31 % | 0.27 | -134.39 |
| General | active | 8 | 3 (38 %) | 14 | 64 % | 1.74 | 13.52 |
| General | break | 208 | 26 (13 %) | 95 | 55 % | 1.46 | 53.82 |
| General | channel | 43 | 13 (30 %) | 15 | 93 % | 10.39 | 43.19 |
| General | direction | 80 | 48 (60 %) | 204 | 46 % | 0.71 | -114.43 |
| General | ema | 149 | 127 (85 %) | 273 | 70 % | 3.36 | 480.34 |
| General | macd | 53 | 20 (38 %) | 55 | 49 % | 1.39 | 25.63 |
| General | move | 157 | 47 (30 %) | 191 | 52 % | 0.93 | -21.48 |
| General | osc | 169 | 71 (42 %) | 180 | 71 % | 2.79 | 277.73 |
| General | rsi | 18 | 7 (39 %) | 53 | 25 % | 0.34 | -85.14 |
| General | sar | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 29 | 1 (3 %) | 3 | 67 % | 1.81 | 3.40 |
| General | trend | 126 | 59 (47 %) | 304 | 50 % | 1.25 | 115.71 |
| General | volume | 59 | 0 (0 %) | 37 | 0 % | 0.00 | -133.60 |
| Long | active | 24 | 2 (8 %) | 39 | 10 % | 0.17 | -114.80 |
| Long | bollinger | 15 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 226 | 14 (6 %) | 62 | 40 % | 0.84 | -22.32 |
| Long | channel | 89 | 39 (44 %) | 56 | 80 % | 3.59 | 146.29 |
| Long | direction | 51 | 14 (27 %) | 94 | 30 % | 0.33 | -165.06 |
| Long | ema | 103 | 99 (96 %) | 138 | 78 % | 5.02 | 449.09 |
| Long | ichimoku | 1 | 1 (100 %) | 3 | 100 % | ∞ (no loss) | 18.60 |
| Long | macd | 30 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | move | 212 | 48 (23 %) | 219 | 51 % | 0.83 | -102.01 |
| Long | osc | 122 | 59 (48 %) | 118 | 69 % | 2.51 | 209.43 |
| Long | rsi | 35 | 4 (11 %) | 91 | 53 % | 0.77 | -50.70 |
| Long | sar | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 77 | 1 (1 %) | 9 | 33 % | 0.80 | -4.20 |
| Long | trend | 108 | 56 (52 %) | 202 | 75 % | 3.59 | 558.94 |
| Long | volume | 92 | 5 (5 %) | 42 | 24 % | 0.40 | -83.77 |
| Wide | active | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 5.10 |
| Wide | break | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | channel | 18 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 15.61 |
| Wide | ema | 9 | 4 (44 %) | 16 | 75 % | 0.52 | -14.30 |
| Wide | ichimoku | 4 | 3 (75 %) | 37 | 46 % | 1.03 | 0.49 |
| Wide | macd | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 78 | 22 (28 %) | 80 | 33 % | 0.47 | -67.97 |
| Wide | osc | 64 | 15 (23 %) | 313 | 31 % | 0.56 | -64.23 |
| Wide | rsi | 30 | 3 (10 %) | 84 | 36 % | 0.31 | -67.66 |
| Wide | smooth | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 33 | 27 (82 %) | 74 | 84 % | 7.01 | 142.71 |
| Wide | volume | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -5.55 |
| Signals | signal:act-burst | 60 | 50 (83 %) | 521 | 78 % | 2.00 | 560.32 |
| Signals | signal:act-hf | 60 | 34 (57 %) | 702 | 71 % | 1.21 | 236.02 |
| Signals | signal:adx | 59 | 48 (81 %) | 257 | 78 % | 2.34 | 387.40 |
| Signals | signal:atr-break | 60 | 59 (98 %) | 628 | 84 % | 3.25 | 1061.84 |
| Signals | signal:bollinger | 58 | 33 (57 %) | 299 | 76 % | 1.14 | 80.21 |
| Signals | signal:cci | 60 | 36 (60 %) | 340 | 75 % | 1.32 | 186.72 |
| Signals | signal:cmf | 60 | 33 (55 %) | 656 | 77 % | 1.17 | 191.16 |
| Signals | signal:donchian | 60 | 60 (100 %) | 439 | 88 % | 11.64 | 1045.41 |
| Signals | signal:ema-cross | 46 | 37 (80 %) | 232 | 81 % | 2.05 | 279.11 |
| Signals | signal:ema-cross-fast | 59 | 56 (95 %) | 454 | 85 % | 2.40 | 731.98 |
| Signals | signal:ema-pullback | 60 | 47 (78 %) | 485 | 86 % | 2.70 | 771.83 |
| Signals | signal:ema-slope | 44 | 27 (61 %) | 262 | 73 % | 1.09 | 45.17 |
| Signals | signal:ema-trend | 59 | 37 (63 %) | 423 | 77 % | 1.23 | 182.32 |
| Signals | signal:heikin-ashi | 60 | 49 (82 %) | 1003 | 76 % | 1.55 | 726.20 |
| Signals | signal:hma | 58 | 47 (81 %) | 470 | 82 % | 2.52 | 634.33 |
| Signals | signal:ichimoku | 60 | 57 (95 %) | 325 | 89 % | 5.62 | 695.93 |
| Signals | signal:impulse | 60 | 59 (98 %) | 601 | 86 % | 6.98 | 1281.79 |
| Signals | signal:kama | 60 | 51 (85 %) | 778 | 83 % | 1.89 | 884.59 |
| Signals | signal:keltner | 57 | 56 (98 %) | 320 | 92 % | 13.86 | 778.28 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 633 | 85 % | 3.47 | 1076.71 |
| Signals | signal:macd-hist | 60 | 52 (87 %) | 791 | 80 % | 2.08 | 922.84 |
| Signals | signal:macd-slow | 60 | 45 (75 %) | 618 | 84 % | 2.34 | 797.49 |
| Signals | signal:mfi | 15 | 12 (80 %) | 26 | 85 % | 3.35 | 32.57 |
| Signals | signal:obv | 60 | 45 (75 %) | 351 | 78 % | 1.49 | 244.90 |
| Signals | signal:r-awesome | 56 | 45 (80 %) | 579 | 75 % | 1.54 | 356.65 |
| Signals | signal:r-connors | 60 | 16 (27 %) | 205 | 60 % | 0.48 | -376.85 |
| Signals | signal:r-fractal | 60 | 58 (97 %) | 376 | 81 % | 5.60 | 721.35 |
| Signals | signal:r-inside | 60 | 60 (100 %) | 133 | 96 % | 576.00 | 447.29 |
| Signals | signal:r-linreg | 60 | 26 (43 %) | 489 | 72 % | 0.99 | -7.32 |
| Signals | signal:r-nr-break | 60 | 42 (70 %) | 793 | 76 % | 1.33 | 406.19 |
| Signals | signal:r-session-trend | 60 | 47 (78 %) | 224 | 83 % | 2.95 | 386.36 |
| Signals | signal:r-vol-regime | 60 | 58 (97 %) | 321 | 87 % | 8.54 | 699.98 |
| Signals | signal:reclaim | 60 | 39 (65 %) | 465 | 77 % | 1.26 | 224.51 |
| Signals | signal:rsi-mid | 60 | 57 (95 %) | 631 | 86 % | 2.77 | 1012.00 |
| Signals | signal:rsi-momentum | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 |
| Signals | signal:rsi-reversal | 46 | 44 (96 %) | 79 | 95 % | 14.76 | 238.04 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 973 | 80 % | 2.55 | 1363.94 |
| Signals | signal:s2-adx-gate | 60 | 43 (72 %) | 358 | 86 % | 2.40 | 511.21 |
| Signals | signal:s2-atr-break | 60 | 49 (82 %) | 673 | 75 % | 1.58 | 503.64 |
| Signals | signal:s2-bb-bounce | 49 | 49 (100 %) | 85 | 94 % | 366.06 | 246.10 |
| Signals | signal:s2-block-scale | 60 | 29 (48 %) | 794 | 70 % | 1.04 | 55.37 |
| Signals | signal:s2-block-stack | 60 | 58 (97 %) | 401 | 86 % | 5.76 | 962.59 |
| Signals | signal:s2-confluence | 60 | 52 (87 %) | 434 | 88 % | 3.63 | 771.87 |
| Signals | signal:s2-ema-cross | 10 | 10 (100 %) | 11 | 100 % | ∞ (no loss) | 13.39 |
| Signals | signal:s2-range-break | 60 | 59 (98 %) | 315 | 82 % | 5.59 | 696.85 |
| Signals | signal:s2-range-shift | 60 | 58 (97 %) | 519 | 88 % | 8.37 | 1144.61 |
| Signals | signal:s2-rsi-revert | 52 | 43 (83 %) | 103 | 81 % | 2.81 | 170.20 |
| Signals | signal:s2-st-trail | 31 | 25 (81 %) | 120 | 79 % | 1.83 | 129.90 |
| Signals | signal:s2-stoch-swing | 60 | 58 (97 %) | 328 | 89 % | 7.40 | 790.46 |
| Signals | signal:s2-vol-break | 54 | 33 (61 %) | 89 | 65 % | 1.04 | 7.15 |
| Signals | signal:sar | 60 | 48 (80 %) | 773 | 77 % | 1.40 | 466.74 |
| Signals | signal:squeeze | 34 | 30 (88 %) | 38 | 87 % | 9.48 | 119.33 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 115 | 93 % | 608.25 | 318.02 |
| Signals | signal:stoch-rsi | 59 | 52 (88 %) | 708 | 77 % | 1.45 | 457.89 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 241 | 92 % | 16.84 | 604.83 |
| Signals | signal:swing | 60 | 60 (100 %) | 720 | 84 % | 3.43 | 1261.66 |
| Signals | signal:thrust | 60 | 56 (93 %) | 843 | 87 % | 4.06 | 1657.98 |
| Signals | signal:trix | 60 | 34 (57 %) | 277 | 72 % | 1.18 | 99.08 |
| Signals | signal:volume-break | 54 | 47 (87 %) | 75 | 80 % | 29.14 | 185.61 |
| Signals | signal:vwap | 60 | 49 (82 %) | 280 | 82 % | 1.56 | 242.89 |
| Signals | signal:williams-r | 59 | 43 (73 %) | 477 | 79 % | 1.66 | 429.64 |
| Signals | signal:zscore | 51 | 37 (73 %) | 244 | 77 % | 1.35 | 134.36 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 5 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 25786 | 17998 | 1301 | 0.95 | 4.00 | 75.83–163.33 (median 75.83) | 102 | 9508 | 467 | 2313 | 2669 | 292 | 1274 | 0 | 72 | 0 | 0 | 0 | 7788 |  |
| Short | 35047 | 30403 | 2025 | 1.38 | 2.09 | 163.33–163.33 (median 163.33) | 4058 | 4916 | 1126 | 5843 | 3251 | 1856 | 6998 | 15 | 315 | 0 | 0 | 0 | 4644 |  |
| General | 14245 | 12525 | 1100 | 1.37 | 1.91 | 163.33–163.33 (median 163.33) | 1260 | 1833 | 502 | 2346 | 1144 | 857 | 3257 | 0 | 192 | 34 | 0 | 0 | 1720 |  |
| Long | 22638 | 20488 | 1194 | 1.25 | 1.94 | 163.33–163.33 (median 163.33) | 1829 | 3951 | 1114 | 4342 | 2355 | 1334 | 4024 | 0 | 268 | 77 | 0 | 0 | 2150 |  |
| Wide | 56021 | 44820 | 274 | 0.72 | 2.35 | 18.00–163.33 (median 163.33) | 12669 | 24099 | 927 | 4001 | 1101 | 376 | 1136 | 0 | 135 | 102 | 0 | 8456 | 2745 |  |
| Signals | 3780 | – | 2111 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2111 units (pair × symbol × direction) active at the run start, 2919 over the run; 3410 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 8594 | 2292 (27 %) | 36904 | 71 % | 0.47 | -8217.33 |
| Micro | trailing | 17192 | 4834 (28 %) | 75212 | 63 % | 0.50 | -12868.34 |
| Short | normal | 11673 | 5227 (45 %) | 23432 | 66 % | 1.25 | 6569.50 |
| Short | trailing | 23374 | 10290 (44 %) | 50253 | 62 % | 1.12 | 5751.01 |
| General | normal | 8539 | 3867 (45 %) | 17579 | 51 % | 1.33 | 7985.80 |
| General | trailing | 5706 | 2413 (42 %) | 10800 | 61 % | 1.36 | 5017.36 |
| Long | normal | 13586 | 5677 (42 %) | 22353 | 50 % | 1.34 | 15439.50 |
| Long | trailing | 9052 | 4113 (45 %) | 14493 | 67 % | 1.41 | 9989.49 |
| Wide | axis | 47565 | 7928 (17 %) | 128343 | 28 % | 0.49 | -59450.23 |
| Wide | dca | 4228 | 1652 (39 %) | 13393 | 66 % | 0.82 | -3666.04 |
| Wide | dca-active | 4228 | 638 (15 %) | 8662 | 33 % | 0.61 | -3108.37 |
| Signals | normal | 1890 | 1520 (80 %) | 24010 | 77 % | 1.78 | 27075.75 |
| Signals | trailing | 1890 | 1594 (84 %) | 22730 | 81 % | 2.45 | 28724.39 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1301 | 737 (57 %) | 2734 | 82 % | 2.33 | 405.39 |
| Short | active | 23 | 8 (35 %) | 13 | 77 % | 1.88 | 11.66 |
| Short | bollinger | 12 | 3 (25 %) | 3 | 100 % | ∞ (no loss) | 8.94 |
| Short | break | 413 | 135 (33 %) | 524 | 62 % | 1.09 | 54.96 |
| Short | channel | 83 | 9 (11 %) | 10 | 100 % | ∞ (no loss) | 24.40 |
| Short | direction | 66 | 52 (79 %) | 178 | 64 % | 1.19 | 33.31 |
| Short | ema | 131 | 109 (83 %) | 253 | 81 % | 3.70 | 180.72 |
| Short | ichimoku | 7 | 1 (14 %) | 19 | 42 % | 0.57 | -13.68 |
| Short | macd | 44 | 27 (61 %) | 57 | 72 % | 1.65 | 36.06 |
| Short | move | 457 | 210 (46 %) | 683 | 64 % | 1.44 | 227.55 |
| Short | osc | 246 | 108 (44 %) | 241 | 79 % | 3.45 | 321.99 |
| Short | rsi | 105 | 10 (10 %) | 268 | 38 % | 0.42 | -340.68 |
| Short | smooth | 22 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | trend | 308 | 161 (52 %) | 533 | 70 % | 1.34 | 160.38 |
| Short | volume | 108 | 23 (21 %) | 86 | 31 % | 0.27 | -134.39 |
| General | active | 8 | 3 (38 %) | 14 | 64 % | 1.74 | 13.52 |
| General | break | 208 | 26 (13 %) | 95 | 55 % | 1.46 | 53.82 |
| General | channel | 43 | 13 (30 %) | 15 | 93 % | 10.39 | 43.19 |
| General | direction | 80 | 48 (60 %) | 204 | 46 % | 0.71 | -114.43 |
| General | ema | 149 | 127 (85 %) | 273 | 70 % | 3.36 | 480.34 |
| General | macd | 53 | 20 (38 %) | 55 | 49 % | 1.39 | 25.63 |
| General | move | 157 | 47 (30 %) | 191 | 52 % | 0.93 | -21.48 |
| General | osc | 169 | 71 (42 %) | 180 | 71 % | 2.79 | 277.73 |
| General | rsi | 18 | 7 (39 %) | 53 | 25 % | 0.34 | -85.14 |
| General | sar | 1 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | smooth | 29 | 1 (3 %) | 3 | 67 % | 1.81 | 3.40 |
| General | trend | 126 | 59 (47 %) | 304 | 50 % | 1.25 | 115.71 |
| General | volume | 59 | 0 (0 %) | 37 | 0 % | 0.00 | -133.60 |
| Long | active | 24 | 2 (8 %) | 39 | 10 % | 0.17 | -114.80 |
| Long | bollinger | 15 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | break | 226 | 14 (6 %) | 62 | 40 % | 0.84 | -22.32 |
| Long | channel | 89 | 39 (44 %) | 56 | 80 % | 3.59 | 146.29 |
| Long | direction | 51 | 14 (27 %) | 94 | 30 % | 0.33 | -165.06 |
| Long | ema | 103 | 99 (96 %) | 138 | 78 % | 5.02 | 449.09 |
| Long | ichimoku | 1 | 1 (100 %) | 3 | 100 % | ∞ (no loss) | 18.60 |
| Long | macd | 30 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | move | 212 | 48 (23 %) | 219 | 51 % | 0.83 | -102.01 |
| Long | osc | 122 | 59 (48 %) | 118 | 69 % | 2.51 | 209.43 |
| Long | rsi | 35 | 4 (11 %) | 91 | 53 % | 0.77 | -50.70 |
| Long | sar | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 77 | 1 (1 %) | 9 | 33 % | 0.80 | -4.20 |
| Long | trend | 108 | 56 (52 %) | 202 | 75 % | 3.59 | 558.94 |
| Long | volume | 92 | 5 (5 %) | 42 | 24 % | 0.40 | -83.77 |
| Wide | active | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 5.10 |
| Wide | break | 7 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | channel | 18 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 15.61 |
| Wide | ema | 9 | 4 (44 %) | 16 | 75 % | 0.52 | -14.30 |
| Wide | ichimoku | 4 | 3 (75 %) | 37 | 46 % | 1.03 | 0.49 |
| Wide | macd | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 78 | 22 (28 %) | 80 | 33 % | 0.47 | -67.97 |
| Wide | osc | 64 | 15 (23 %) | 313 | 31 % | 0.56 | -64.23 |
| Wide | rsi | 30 | 3 (10 %) | 84 | 36 % | 0.31 | -67.66 |
| Wide | smooth | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 33 | 27 (82 %) | 74 | 84 % | 7.01 | 142.71 |
| Wide | volume | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -5.55 |
| Signals | signal:act-burst | 60 | 50 (83 %) | 521 | 78 % | 2.00 | 560.32 |
| Signals | signal:act-hf | 60 | 34 (57 %) | 702 | 71 % | 1.21 | 236.02 |
| Signals | signal:adx | 59 | 48 (81 %) | 257 | 78 % | 2.34 | 387.40 |
| Signals | signal:atr-break | 60 | 59 (98 %) | 628 | 84 % | 3.25 | 1061.84 |
| Signals | signal:bollinger | 58 | 33 (57 %) | 299 | 76 % | 1.14 | 80.21 |
| Signals | signal:cci | 60 | 36 (60 %) | 340 | 75 % | 1.32 | 186.72 |
| Signals | signal:cmf | 60 | 33 (55 %) | 656 | 77 % | 1.17 | 191.16 |
| Signals | signal:donchian | 60 | 60 (100 %) | 439 | 88 % | 11.64 | 1045.41 |
| Signals | signal:ema-cross | 46 | 37 (80 %) | 232 | 81 % | 2.05 | 279.11 |
| Signals | signal:ema-cross-fast | 59 | 56 (95 %) | 454 | 85 % | 2.40 | 731.98 |
| Signals | signal:ema-pullback | 60 | 47 (78 %) | 485 | 86 % | 2.70 | 771.83 |
| Signals | signal:ema-slope | 44 | 27 (61 %) | 262 | 73 % | 1.09 | 45.17 |
| Signals | signal:ema-trend | 59 | 37 (63 %) | 423 | 77 % | 1.23 | 182.32 |
| Signals | signal:heikin-ashi | 60 | 49 (82 %) | 1003 | 76 % | 1.55 | 726.20 |
| Signals | signal:hma | 58 | 47 (81 %) | 470 | 82 % | 2.52 | 634.33 |
| Signals | signal:ichimoku | 60 | 57 (95 %) | 325 | 89 % | 5.62 | 695.93 |
| Signals | signal:impulse | 60 | 59 (98 %) | 601 | 86 % | 6.98 | 1281.79 |
| Signals | signal:kama | 60 | 51 (85 %) | 778 | 83 % | 1.89 | 884.59 |
| Signals | signal:keltner | 57 | 56 (98 %) | 320 | 92 % | 13.86 | 778.28 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 633 | 85 % | 3.47 | 1076.71 |
| Signals | signal:macd-hist | 60 | 52 (87 %) | 791 | 80 % | 2.08 | 922.84 |
| Signals | signal:macd-slow | 60 | 45 (75 %) | 618 | 84 % | 2.34 | 797.49 |
| Signals | signal:mfi | 15 | 12 (80 %) | 26 | 85 % | 3.35 | 32.57 |
| Signals | signal:obv | 60 | 45 (75 %) | 351 | 78 % | 1.49 | 244.90 |
| Signals | signal:r-awesome | 56 | 45 (80 %) | 579 | 75 % | 1.54 | 356.65 |
| Signals | signal:r-connors | 60 | 16 (27 %) | 205 | 60 % | 0.48 | -376.85 |
| Signals | signal:r-fractal | 60 | 58 (97 %) | 376 | 81 % | 5.60 | 721.35 |
| Signals | signal:r-inside | 60 | 60 (100 %) | 133 | 96 % | 576.00 | 447.29 |
| Signals | signal:r-linreg | 60 | 26 (43 %) | 489 | 72 % | 0.99 | -7.32 |
| Signals | signal:r-nr-break | 60 | 42 (70 %) | 793 | 76 % | 1.33 | 406.19 |
| Signals | signal:r-session-trend | 60 | 47 (78 %) | 224 | 83 % | 2.95 | 386.36 |
| Signals | signal:r-vol-regime | 60 | 58 (97 %) | 321 | 87 % | 8.54 | 699.98 |
| Signals | signal:reclaim | 60 | 39 (65 %) | 465 | 77 % | 1.26 | 224.51 |
| Signals | signal:rsi-mid | 60 | 57 (95 %) | 631 | 86 % | 2.77 | 1012.00 |
| Signals | signal:rsi-momentum | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 |
| Signals | signal:rsi-reversal | 46 | 44 (96 %) | 79 | 95 % | 14.76 | 238.04 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 973 | 80 % | 2.55 | 1363.94 |
| Signals | signal:s2-adx-gate | 60 | 43 (72 %) | 358 | 86 % | 2.40 | 511.21 |
| Signals | signal:s2-atr-break | 60 | 49 (82 %) | 673 | 75 % | 1.58 | 503.64 |
| Signals | signal:s2-bb-bounce | 49 | 49 (100 %) | 85 | 94 % | 366.06 | 246.10 |
| Signals | signal:s2-block-scale | 60 | 29 (48 %) | 794 | 70 % | 1.04 | 55.37 |
| Signals | signal:s2-block-stack | 60 | 58 (97 %) | 401 | 86 % | 5.76 | 962.59 |
| Signals | signal:s2-confluence | 60 | 52 (87 %) | 434 | 88 % | 3.63 | 771.87 |
| Signals | signal:s2-ema-cross | 10 | 10 (100 %) | 11 | 100 % | ∞ (no loss) | 13.39 |
| Signals | signal:s2-range-break | 60 | 59 (98 %) | 315 | 82 % | 5.59 | 696.85 |
| Signals | signal:s2-range-shift | 60 | 58 (97 %) | 519 | 88 % | 8.37 | 1144.61 |
| Signals | signal:s2-rsi-revert | 52 | 43 (83 %) | 103 | 81 % | 2.81 | 170.20 |
| Signals | signal:s2-st-trail | 31 | 25 (81 %) | 120 | 79 % | 1.83 | 129.90 |
| Signals | signal:s2-stoch-swing | 60 | 58 (97 %) | 328 | 89 % | 7.40 | 790.46 |
| Signals | signal:s2-vol-break | 54 | 33 (61 %) | 89 | 65 % | 1.04 | 7.15 |
| Signals | signal:sar | 60 | 48 (80 %) | 773 | 77 % | 1.40 | 466.74 |
| Signals | signal:squeeze | 34 | 30 (88 %) | 38 | 87 % | 9.48 | 119.33 |
| Signals | signal:st-slow | 30 | 30 (100 %) | 115 | 93 % | 608.25 | 318.02 |
| Signals | signal:stoch-rsi | 59 | 52 (88 %) | 708 | 77 % | 1.45 | 457.89 |
| Signals | signal:supertrend | 60 | 59 (98 %) | 241 | 92 % | 16.84 | 604.83 |
| Signals | signal:swing | 60 | 60 (100 %) | 720 | 84 % | 3.43 | 1261.66 |
| Signals | signal:thrust | 60 | 56 (93 %) | 843 | 87 % | 4.06 | 1657.98 |
| Signals | signal:trix | 60 | 34 (57 %) | 277 | 72 % | 1.18 | 99.08 |
| Signals | signal:volume-break | 54 | 47 (87 %) | 75 | 80 % | 29.14 | 185.61 |
| Signals | signal:vwap | 60 | 49 (82 %) | 280 | 82 % | 1.56 | 242.89 |
| Signals | signal:williams-r | 59 | 43 (73 %) | 477 | 79 % | 1.66 | 429.64 |
| Signals | signal:zscore | 51 | 37 (73 %) | 244 | 77 % | 1.35 | 134.36 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Short | 1.1 | 685 | 429 (63 %) | 1530 | 70 % | 1.61 | 776.90 |
| Short | 1.25 | 651 | 405 (62 %) | 1440 | 70 % | 1.64 | 739.79 |
| Short | 1.35 | 609 | 374 (61 %) | 1348 | 70 % | 1.63 | 676.34 |
| Short | 1.5 | 477 | 288 (60 %) | 1069 | 69 % | 1.56 | 494.68 |
| Short | 1.75 | 269 | 163 (61 %) | 650 | 66 % | 1.42 | 231.69 |
| Short | 2 | 144 | 85 (59 %) | 361 | 65 % | 1.36 | 118.80 |
| General | 1.1 | 440 | 221 (50 %) | 968 | 53 % | 1.19 | 270.85 |
| General | 1.25 | 418 | 210 (50 %) | 906 | 53 % | 1.17 | 221.80 |
| General | 1.35 | 388 | 198 (51 %) | 814 | 54 % | 1.22 | 252.31 |
| General | 1.5 | 334 | 183 (55 %) | 698 | 54 % | 1.29 | 274.02 |
| General | 1.75 | 187 | 109 (58 %) | 370 | 56 % | 1.25 | 122.32 |
| General | 2 | 71 | 43 (61 %) | 126 | 60 % | 1.25 | 39.56 |
| Long | 1.1 | 379 | 171 (45 %) | 658 | 52 % | 1.05 | 72.56 |
| Long | 1.25 | 365 | 164 (45 %) | 641 | 52 % | 1.05 | 63.20 |
| Long | 1.35 | 339 | 155 (46 %) | 596 | 52 % | 1.04 | 53.53 |
| Long | 1.5 | 278 | 130 (47 %) | 477 | 53 % | 1.05 | 49.08 |
| Long | 1.75 | 142 | 69 (49 %) | 295 | 46 % | 0.83 | -127.81 |
| Long | 2 | 56 | 30 (54 %) | 153 | 43 % | 0.75 | -100.54 |
| Wide | 1.1 | 8 | 0 (0 %) | 34 | 24 % | 0.23 | -13.53 |
| Wide | 1.25 | 8 | 0 (0 %) | 34 | 24 % | 0.23 | -13.53 |
| Wide | 1.35 | 8 | 0 (0 %) | 34 | 24 % | 0.23 | -13.53 |
| Wide | 1.5 | 7 | 0 (0 %) | 34 | 24 % | 0.23 | -13.53 |
| Wide | 1.75 | 3 | 0 (0 %) | 34 | 24 % | 0.23 | -13.53 |
| Wide | 2 | 2 | 0 (0 %) | 34 | 24 % | 0.23 | -13.53 |
| Signals | 1.1 | 862 | 687 (80 %) | 8355 | 81 % | 2.05 | 9314.46 |
| Signals | 1.25 | 498 | 396 (80 %) | 5456 | 82 % | 2.13 | 5955.35 |
| Signals | 1.35 | 358 | 284 (79 %) | 4129 | 82 % | 2.26 | 4585.79 |
| Signals | 1.5 | 221 | 184 (83 %) | 2799 | 83 % | 2.43 | 3148.89 |
| Signals | 1.75 | 107 | 97 (91 %) | 1554 | 83 % | 2.72 | 1766.96 |
| Signals | 2 | 50 | 48 (96 %) | 815 | 84 % | 3.08 | 917.39 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | sweep | mc-rsi5-10@m5 | 208 | 186 (89 %) | 832 | 83 % | 3.13 | 140.21 | – |
| Micro | follow | mc-tpull-8@m5c | 166 | 150 (90 %) | 664 | 77 % | 4.38 | 124.63 | – |
| Micro | sweep | mc-rsi4-10@m5 | 54 | 40 (74 %) | 270 | 87 % | 2.31 | 51.87 | tp0.6 sl2.1 tr0.45 h192 mc (5 · 22.90 · 1.83) |
| Micro | ribbon | mc-lag-12@m30 | 132 | 132 (100 %) | 132 | 100 % | ∞ (no loss) | 44.10 | – |
| Micro | sweep | mc-rsi3-10@m5c | 32 | 32 (100 %) | 128 | 100 % | ∞ (no loss) | 20.80 | – |
| Micro | magnet | mc-tstreak-4@m5 | 32 | 24 (75 %) | 96 | 58 % | 3.28 | 14.18 | – |
| Micro | sweep | mc-rsi14-25@m5c | 8 | 8 (100 %) | 32 | 100 % | ∞ (no loss) | 12.80 | – |
| Micro | sandwich | mc-ibrk@m5 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 10.30 | – |
| Micro | pulse | mc-ibrk@m5 | 23 | 23 (100 %) | 23 | 100 % | ∞ (no loss) | 8.20 | – |
| Micro | snap | mc-rsi2-5@m5 | 44 | 44 (100 %) | 44 | 100 % | ∞ (no loss) | 6.20 | – |
| Micro | sandwich | mc-rsi2-5@m5 | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 5.50 | – |
| Micro | sweep | mc-rsi7-20@m5c | 12 | 8 (67 %) | 60 | 80 % | 1.33 | 4.39 | tp0.6 sl2.85 tr0.45 h192 mc (5 · 19.19 · 1.52) |
| Micro | clamp | mc-rsi2-5@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 2.30 | – |
| Micro | sweep | mc-rsi5-20@m5c | 4 | 4 (100 %) | 24 | 67 % | 1.24 | 0.98 | tp0.6 sl2.85 tr0.3 h192 mc (6 · 1.24 · 0.25) |
| Micro | sweep | mc-rsi5-15@m5c | 12 | 8 (67 %) | 48 | 75 % | 0.97 | -0.41 | – |
| Micro | sweep | mc-rsi7-15@m5 | 12 | 8 (67 %) | 52 | 69 % | 0.85 | -2.28 | tp0.6 sl2.85 tr0.3 h192 mc (5 · 1.38 · 0.24) |
| Micro | sweep | mc-rsi7-25@m5c | 4 | 0 (0 %) | 28 | 71 % | 0.62 | -4.83 | tp0.6 sl2.85 tr0.45 h192 mc (7 · 0.64 · -1.13) |
| Micro | magnet | mc-rsimid-14@m5 | 3 | 0 (0 %) | 9 | 67 % | 0.29 | -6.00 | – |
| Micro | sweep | mc-rsi9-20@m5 | 34 | 14 (41 %) | 186 | 75 % | 0.89 | -6.09 | tp0.55 sl1.7875 tr0 h192 mc (5 · ∞ (no loss) · 1.75) |
| Micro | sweep | mc-lag-3@m30 | 10 | 2 (20 %) | 10 | 20 % | 0.09 | -8.43 | – |
| Micro | sweep | mc-rsi14-25@m5 | 6 | 0 (0 %) | 42 | 71 % | 0.48 | -13.03 | tp0.6 sl2.85 tr0.45 h192 mc (7 · 0.64 · -1.13) |
| Short | ribbon | r-chand-m@m15 | 94 | 88 (94 %) | 268 | 88 % | 6.58 | 298.53 | – |
| Short | revert | r-star@m30 | 64 | 62 (97 %) | 124 | 98 % | 26.10 | 220.88 | – |
| Short | sweep | break-squeeze-30@m30 | 29 | 29 (100 %) | 115 | 91 % | 17.15 | 191.56 | tp2.6 sl2.6 tr1.3 h48 sh (5 · 3.49 · 6.97) |
| Short | ribbon | ema-slope@m15c | 42 | 40 (95 %) | 106 | 92 % | 9.67 | 128.98 | – |
| Short | ribbon | willr-28-95@m15 | 28 | 28 (100 %) | 59 | 95 % | 51.84 | 127.03 | – |
| Short | ribbon | r-chand@m15 | 57 | 52 (91 %) | 57 | 91 % | 9.95 | 100.20 | – |
| Short | sweep | r-pin-m@m15 | 21 | 21 (100 %) | 42 | 88 % | 1062.13 | 76.24 | – |
| Short | pivot | dir-reclaim@m15 | 19 | 19 (100 %) | 19 | 100 % | ∞ (no loss) | 70.15 | – |
| Short | sweep | break-squeeze-t10@m30 | 17 | 17 (100 %) | 31 | 100 % | ∞ (no loss) | 69.04 | – |
| Short | pivot | r-fvg-m@m15 | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 64.21 | – |
| Short | sweep | willr-21-95@m15 | 10 | 10 (100 %) | 22 | 91 % | 13.47 | 59.86 | – |
| Short | ribbon | r-td@m30 | 30 | 30 (100 %) | 52 | 94 % | 189.24 | 56.36 | – |
| Short | sweep | break-squeeze@m30 | 14 | 14 (100 %) | 24 | 96 % | 537.03 | 56.31 | – |
| Short | ribbon | dir-vwap@m15 | 18 | 18 (100 %) | 48 | 85 % | 3.68 | 54.33 | – |
| Short | ribbon | willr-28-95@m15c | 17 | 17 (100 %) | 17 | 100 % | ∞ (no loss) | 48.76 | – |
| Short | sweep | willr-14-95@m15 | 8 | 8 (100 %) | 18 | 89 % | 11.09 | 48.43 | – |
| Short | ribbon | move-impulse-20-2.5@m15 | 45 | 39 (87 %) | 45 | 87 % | 57.33 | 47.41 | – |
| Short | pivot | trend-st-14-4@m15c | 2 | 2 (100 %) | 18 | 94 % | 290.66 | 40.64 | tp2.8 sl5.6 tr2.1 h64 sh (9 · 146.12 · 20.36) |
| Short | clamp | mfi-14-10@m15 | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 40.09 | – |
| Short | ribbon | ema-slope@m15 | 27 | 23 (85 %) | 65 | 78 % | 3.20 | 39.42 | – |
| Short | revert | r-stc-m@m15c | 26 | 20 (77 %) | 20 | 100 % | ∞ (no loss) | 36.15 | – |
| Short | follow | r-td@m15c | 16 | 16 (100 %) | 70 | 80 % | 3.90 | 32.93 | tp1.8 sl2.7 tr0.9 h64 sh (5 · 1.78 · 0.89) |
| Short | pivot | move-impulse-20-2.5@m15c | 5 | 5 (100 %) | 14 | 93 % | 219.55 | 30.66 | – |
| Short | pivot | trend-st-14-4@m15 | 1 | 1 (100 %) | 11 | 91 % | 173.14 | 24.15 | tp2.8 sl5.6 tr2.1 h64 sh (11 · 173.14 · 24.15) |
| Short | pivot | willr-28-95@m15 | 16 | 16 (100 %) | 18 | 89 % | 81.72 | 24.09 | – |
| Short | ribbon | willr-50-95@m15 | 5 | 5 (100 %) | 15 | 87 % | 5.54 | 20.00 | – |
| Short | sweep | break-squeeze-t25@m30 | 4 | 4 (100 %) | 7 | 71 % | 93.40 | 19.41 | – |
| Short | sweep | r-linreg@m15c | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 19.20 | – |
| Short | pivot | r-chand-m@m15 | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 18.56 | – |
| Short | sweep | r-session-trend@m15 | 5 | 5 (100 %) | 15 | 87 % | 453.98 | 18.41 | – |
| Short | sweep | r-session-trend@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 17.81 | – |
| Short | ribbon | ema-slope-34@m15c | 18 | 16 (89 %) | 18 | 89 % | 61.26 | 16.91 | – |
| Short | clamp | act-shift@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 16.59 | – |
| Short | ribbon | ema-slope-34@m15 | 16 | 14 (88 %) | 16 | 88 % | 56.79 | 15.65 | – |
| Short | sweep | r-td-m@m15 | 27 | 9 (33 %) | 27 | 33 % | 2.62 | 14.03 | – |
| Short | follow | r-rsi2-m@m15c | 6 | 5 (83 %) | 12 | 75 % | 5.06 | 13.96 | – |
| Short | ribbon | trend-st-14-4@m15c | 3 | 3 (100 %) | 9 | 78 % | 46.25 | 13.12 | – |
| Short | sweep | willr-28-95@m30 | 10 | 6 (60 %) | 20 | 65 % | 1.80 | 11.92 | – |
| Short | sweep | r-td@m30 | 10 | 6 (60 %) | 14 | 71 % | 2.16 | 11.60 | – |
| Short | clamp | willr-50-90@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 9.58 | – |
| Short | sweep | break-vol-2@m15 | 44 | 23 (52 %) | 44 | 52 % | 1.24 | 9.30 | – |
| Short | sweep | willr-7-90@m30 | 4 | 4 (100 %) | 16 | 75 % | 1.33 | 7.50 | – |
| Short | sweep | break-don40@m15 | 1 | 1 (100 %) | 7 | 57 % | 2.03 | 6.00 | tp2.4 sl3.6 tr1.2 h64 sh (7 · 2.03 · 6.00) |
| Short | follow | r-nr-break@m15c | 1 | 1 (100 %) | 6 | 83 % | 2.76 | 5.10 | tp1.8 sl2.7 tr0 h64 sh (6 · 2.76 · 5.10) |
| Short | sweep | break-squeeze-t10@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 4.40 | – |
| Short | sweep | break-vol@m15 | 47 | 22 (47 %) | 47 | 47 % | 1.06 | 2.61 | – |
| Short | sweep | rsi-fast@m15 | 1 | 1 (100 %) | 5 | 60 % | 1.30 | 1.80 | tp2.8 sl2.8 tr0 h64 sh (5 · 1.30 · 1.80) |
| Short | sweep | break-vol-1.3@m15c | 11 | 5 (45 %) | 11 | 45 % | 1.16 | 1.77 | – |
| Short | sweep | macd-hist@m15c | 14 | 7 (50 %) | 33 | 58 % | 1.00 | 0.26 | – |
| Short | revert | r-fakeout@m15c | 1 | 0 (0 %) | 10 | 60 % | 0.95 | -0.93 | tp2.8 sl4.2 tr2.1 h64 sh (10 · 0.95 · -0.93) |
| Short | sweep | break-vol-1.3@m15 | 7 | 4 (57 %) | 21 | 48 % | 0.98 | -0.98 | – |
| Short | revert | r-klinger@m15c | 3 | 1 (33 %) | 8 | 38 % | 0.84 | -1.11 | – |
| Short | sweep | r-elder@m30 | 75 | 0 (0 %) | 14 | 0 % | 0.00 | -3.55 | – |
| Short | ribbon | ema-slope-20-10@m15 | 4 | 2 (50 %) | 6 | 67 % | 0.14 | -4.13 | – |
| Short | clamp | r-fvg@m15 | 6 | 0 (0 %) | 12 | 50 % | 0.69 | -6.30 | – |
| Short | follow | r-streak@m15 | 1 | 0 (0 %) | 5 | 60 % | 0.40 | -6.51 | tp2.6 sl5.2 tr1.3 h64 sh (5 · 0.40 · -6.51) |
| Short | sweep | r-pin@m15 | 3 | 0 (0 %) | 15 | 40 % | 0.65 | -7.26 | tp2.8 sl5.6 tr1.4 h96 sh (5 · 0.76 · -1.43) |
| Short | ribbon | r-pin@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.47 | -8.83 | – |
| Short | clamp | break-don10@m15c | 2 | 0 (0 %) | 7 | 57 % | 0.39 | -8.91 | – |
| Short | sweep | r-fisher@m30 | 4 | 0 (0 %) | 24 | 42 % | 0.72 | -9.80 | tp2.4 sl2.4 tr1.2 h32 sh (6 · 0.94 · -0.45) |
| Short | ribbon | ema-slope-20-10@m15c | 20 | 12 (60 %) | 36 | 50 % | 0.49 | -12.08 | – |
| Short | ribbon | trend-st-21-5@m15c | 2 | 0 (0 %) | 11 | 45 % | 0.38 | -12.58 | tp2.6 sl3.9 tr1.95 h96 sh (5 · 0.29 · -5.78) |
| Short | ribbon | ichi-cloud-20@m15c | 7 | 1 (14 %) | 19 | 42 % | 0.57 | -13.68 | – |
| Short | ribbon | trend-st-21-5@m15 | 2 | 0 (0 %) | 13 | 38 % | 0.42 | -14.50 | tp2.4 sl3.6 tr0 h96 sh (6 · 0.58 · -4.80) |
| Short | pivot | r-fakeout@m30 | 29 | 0 (0 %) | 29 | 0 % | 0.00 | -15.10 | – |
| Short | revert | r-pdhl-m@m15c | 4 | 0 (0 %) | 12 | 33 % | 0.21 | -19.93 | – |
| Short | clamp | rsi-mid-60-40@m15 | 6 | 0 (0 %) | 5 | 0 % | 0.00 | -20.20 | – |
| Short | ribbon | willr-21-95@m30 | 15 | 5 (33 %) | 14 | 36 % | 0.21 | -22.36 | – |
| Short | revert | break-vol-2@x4@m15 | 7 | 1 (14 %) | 7 | 14 % | 0.09 | -25.10 | – |
| Short | pivot | r-chand@m15 | 26 | 12 (46 %) | 44 | 64 % | 0.61 | -27.66 | – |
| Short | revert | r-pdhl@m15c | 27 | 4 (15 %) | 54 | 54 % | 0.35 | -57.30 | – |
| Short | revert | r-pdhl-m@m30 | 6 | 0 (0 %) | 42 | 38 % | 0.28 | -74.11 | tp2.2 sl3.3 tr1.65 h32 sh (7 · 0.43 · -7.98) |
| Short | revert | r-pdhl@m30 | 9 | 0 (0 %) | 74 | 34 % | 0.26 | -125.09 | tp2.2 sl2.2 tr1.65 h32 sh (8 · 0.28 · -10.38) |
| Short | ribbon | dir-thrust@m30 | 15 | 4 (27 %) | 81 | 36 % | 0.18 | -127.05 | tp2.4 sl4.8 tr1.2 h32 sh (6 · 5.54 · 1.43) |
| Short | ribbon | move-impulse@m15 | 37 | 4 (11 %) | 68 | 12 % | 0.08 | -127.39 | – |
| Short | follow | r-pin-m@m15 | 18 | 0 (0 %) | 126 | 40 % | 0.35 | -154.45 | tp2.8 sl5.6 tr1.4 h64 sh (7 · 0.55 · -5.30) |
| Short | sweep | mfi-14-10@m30 | 56 | 0 (0 %) | 52 | 0 % | 0.00 | -170.84 | – |
| Short | sweep | r-vortex-m@m30 | 33 | 0 (0 %) | 76 | 0 % | 0.00 | -284.80 | – |
| Short | sweep | rsi-7-15-85@m30 | 62 | 2 (3 %) | 240 | 37 % | 0.39 | -328.44 | – |
| General | ribbon | r-chand-m@m15 | 34 | 31 (91 %) | 88 | 73 % | 4.63 | 191.20 | – |
| General | ribbon | ema-slope@m15 | 34 | 28 (82 %) | 82 | 68 % | 3.58 | 142.82 | – |
| General | ribbon | ema-slope@m15c | 29 | 26 (90 %) | 69 | 72 % | 4.24 | 142.16 | – |
| General | ribbon | willr-28-95@m15 | 22 | 22 (100 %) | 46 | 91 % | 18.30 | 134.95 | – |
| General | ribbon | move-impulse-20-2.5@m15 | 33 | 29 (88 %) | 33 | 88 % | 197.21 | 110.10 | – |
| General | ribbon | ema-slope-34@m15c | 28 | 27 (96 %) | 28 | 96 % | 2711.73 | 103.23 | – |
| General | ribbon | ema-slope-34@m15 | 27 | 26 (96 %) | 27 | 96 % | 2473.33 | 94.15 | – |
| General | ribbon | dir-vwap@m15 | 14 | 14 (100 %) | 38 | 74 % | 3.15 | 67.20 | – |
| General | sweep | willr-21-95@m15c | 11 | 11 (100 %) | 22 | 91 % | 18.87 | 64.32 | – |
| General | ribbon | trend-st-14-4@m15c | 7 | 7 (100 %) | 17 | 65 % | 84.37 | 54.68 | – |
| General | ribbon | willr-28-95@m15c | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 51.99 | – |
| General | sweep | r-session-trend@m15c | 9 | 9 (100 %) | 18 | 100 % | ∞ (no loss) | 48.18 | – |
| General | ribbon | r-chand@m15 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 42.00 | – |
| General | follow | r-chand-m@m15c | 5 | 5 (100 %) | 25 | 72 % | 2.97 | 37.90 | tp3.2 sl3.2 tr0 h96 gn (5 · 3.53 · 8.60) |
| General | sweep | break-squeeze-30@m30 | 4 | 4 (100 %) | 14 | 100 % | ∞ (no loss) | 36.95 | – |
| General | pivot | act-shift@m15c | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 31.72 | – |
| General | sweep | break-vol-1.3@m15c | 16 | 10 (63 %) | 16 | 63 % | 8.39 | 28.54 | – |
| General | sweep | willr-14-95@m15 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 27.04 | – |
| General | sweep | willr-21-95@m15 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 26.68 | – |
| General | magnet | rsi-div@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 25.36 | – |
| General | magnet | kelt-20-2@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 19.80 | – |
| General | ribbon | macd-zero@m15 | 10 | 8 (80 %) | 14 | 57 % | 3.29 | 18.07 | – |
| General | ribbon | dir-emax-12-26@m15 | 10 | 8 (80 %) | 14 | 57 % | 3.29 | 18.07 | – |
| General | ribbon | macd-zero@m15c | 10 | 8 (80 %) | 14 | 57 % | 3.29 | 18.07 | – |
| General | ribbon | dir-emax-12-26@m15c | 10 | 8 (80 %) | 14 | 57 % | 3.29 | 18.07 | – |
| General | ribbon | ema-slope-20-10@m15 | 8 | 4 (50 %) | 8 | 50 % | 32.95 | 17.93 | – |
| General | revert | r-star@m30 | 12 | 6 (50 %) | 24 | 75 % | 1.66 | 17.29 | – |
| General | ribbon | ema-slope-20-10@m15c | 12 | 12 (100 %) | 18 | 67 % | 2.26 | 16.67 | – |
| General | sweep | break-don40@m15 | 2 | 2 (100 %) | 12 | 67 % | 2.08 | 16.60 | tp4.4 sl3.3 tr0 h96 gn (6 · 2.40 · 9.80) |
| General | clamp | r-session-trend-m@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 12.05 | – |
| General | sweep | break-vol@m15 | 8 | 4 (50 %) | 8 | 50 % | 4.97 | 10.23 | – |
| General | revert | r-ultimate@m30 | 2 | 1 (50 %) | 8 | 50 % | 1.04 | 0.60 | – |
| General | sweep | willr-21-95@m30 | 4 | 1 (25 %) | 8 | 50 % | 0.96 | -0.60 | – |
| General | sweep | break-vol-1.3@m15 | 2 | 1 (50 %) | 6 | 33 % | 0.94 | -0.67 | – |
| General | clamp | break-retest@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.90 | -1.20 | – |
| General | ribbon | r-streak@m15 | 2 | 0 (0 %) | 8 | 50 % | 0.91 | -1.60 | – |
| General | revert | break-vol-2@m15c | 1 | 0 (0 %) | 5 | 40 % | 0.78 | -1.90 | tp3.6 sl2.7 tr0 h64 gn (5 · 0.78 · -1.90) |
| General | revert | r-fakeout@m15c | 3 | 1 (33 %) | 27 | 59 % | 0.95 | -2.35 | tp4.4 sl4.4 tr2.2 h64 gn (9 · 1.13 · 1.82) |
| General | ribbon | ema-slope-100@m15 | 2 | 0 (0 %) | 9 | 44 % | 0.85 | -2.90 | tp4.4 sl3.3 tr0 h64 gn (5 · 0.80 · -2.10) |
| General | revert | break-vol-2@m30 | 1 | 0 (0 %) | 5 | 40 % | 0.59 | -4.20 | tp3.2 sl3.2 tr0 h48 gn (5 · 0.59 · -4.20) |
| General | sweep | willr-7-90@m30 | 3 | 0 (0 %) | 12 | 50 % | 0.67 | -6.08 | – |
| General | sweep | macd-hist@m15c | 11 | 4 (36 %) | 27 | 41 % | 0.79 | -10.51 | – |
| General | revert | r-roofing@m15 | 2 | 0 (0 %) | 12 | 42 % | 0.41 | -13.78 | tp4.4 sl4.4 tr2.2 h96 gn (6 · 0.56 · -4.13) |
| General | sweep | willr-28-95@m30 | 17 | 7 (41 %) | 32 | 34 % | 0.74 | -14.30 | – |
| General | ribbon | trend-st-21-5@m15c | 10 | 2 (20 %) | 45 | 38 % | 0.82 | -16.32 | tp3.6 sl3.6 tr1.8 h64 gn (5 · 1.10 · 0.79) |
| General | ribbon | willr-21-95@m30 | 8 | 0 (0 %) | 7 | 0 % | 0.00 | -24.80 | – |
| General | ribbon | mfi-14-10@m30 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -30.20 | – |
| General | sweep | rsi-7-15-85@m30 | 5 | 0 (0 %) | 20 | 30 % | 0.37 | -31.70 | – |
| General | follow | rsi-14-20-80@m15c | 2 | 0 (0 %) | 12 | 0 % | 0.00 | -34.80 | tp3.6 sl2.7 tr0 h64 gn (6 · 0.00 · -17.40) |
| General | revert | rsi-mom-14-20@m15c | 2 | 0 (0 %) | 12 | 0 % | 0.00 | -34.80 | tp3.6 sl2.7 tr0 h64 gn (6 · 0.00 · -17.40) |
| General | sweep | r-td@m30 | 16 | 6 (38 %) | 22 | 36 % | 0.08 | -39.30 | – |
| General | revert | ema-50-100@m30 | 5 | 0 (0 %) | 25 | 20 % | 0.28 | -49.40 | tp4 sl3 tr0 h32 gn (5 · 0.30 · -9.00) |
| General | ribbon | move-impulse@m15 | 9 | 0 (0 %) | 18 | 0 % | 0.00 | -51.33 | – |
| General | pivot | break-vol-1.3@m15 | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -51.60 | – |
| General | ribbon | trend-st-21-5@m15 | 10 | 0 (0 %) | 58 | 34 % | 0.61 | -51.74 | tp4 sl4 tr2 h64 gn (7 · 0.72 · -3.54) |
| General | follow | r-pin-m@m15 | 6 | 0 (0 %) | 42 | 38 % | 0.37 | -55.90 | tp3.2 sl3.2 tr1.6 h64 gn (7 · 0.44 · -7.67) |
| General | sweep | mfi-14-10@m30 | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -103.40 | – |
| General | sweep | r-vortex-m@m30 | 16 | 0 (0 %) | 37 | 0 % | 0.00 | -124.80 | – |
| General | ribbon | dir-thrust@m30 | 23 | 0 (0 %) | 106 | 19 % | 0.14 | -291.66 | tp4 sl3 tr0 h32 gn (5 · 0.30 · -9.00) |
| Long | ribbon | r-chand-m@m15 | 40 | 40 (100 %) | 87 | 92 % | 22.57 | 440.03 | – |
| Long | ribbon | move-impulse-20-2.5@m15 | 26 | 26 (100 %) | 26 | 100 % | ∞ (no loss) | 149.76 | – |
| Long | ribbon | willr-28-95@m15 | 20 | 20 (100 %) | 26 | 100 % | ∞ (no loss) | 119.47 | – |
| Long | ribbon | ema-slope-34@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 102.00 | – |
| Long | ribbon | ema-slope-34@m15c | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 102.00 | – |
| Long | ribbon | ema-slope-20-10@m15c | 21 | 21 (100 %) | 29 | 72 % | 4.92 | 91.00 | – |
| Long | sweep | willr-28-95@m30 | 24 | 24 (100 %) | 33 | 73 % | 3.95 | 87.89 | – |
| Long | ribbon | ema-slope@m15 | 15 | 15 (100 %) | 21 | 71 % | 4.56 | 65.55 | – |
| Long | ribbon | ema-slope@m15c | 14 | 14 (100 %) | 18 | 78 % | 6.61 | 65.13 | – |
| Long | sweep | r-session-trend@m15c | 12 | 12 (100 %) | 22 | 100 % | ∞ (no loss) | 65.09 | – |
| Long | sweep | willr-21-95@m15 | 8 | 8 (100 %) | 14 | 100 % | ∞ (no loss) | 57.77 | – |
| Long | pivot | kelt-20-2.5@m30 | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 51.60 | – |
| Long | sweep | break-squeeze-30@m30 | 7 | 7 (100 %) | 14 | 86 % | 6.30 | 49.80 | – |
| Long | pivot | trend-st-14-4@m15 | 2 | 2 (100 %) | 16 | 88 % | 8.77 | 48.57 | tp5.6 sl5.6 tr2.8 h64 lg (9 · 574.09 · 30.05) |
| Long | revert | r-star@m30 | 16 | 16 (100 %) | 19 | 95 % | 10.67 | 42.56 | – |
| Long | magnet | kelt-20-2@m15 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 42.40 | – |
| Long | pivot | trend-st-14-4@m15c | 2 | 2 (100 %) | 14 | 86 % | 4.16 | 37.93 | tp5.6 sl5.6 tr4.2 h64 lg (7 · 4.35 · 19.42) |
| Long | magnet | kelt-20-2@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 37.80 | – |
| Long | follow | r-chand-m@m15c | 4 | 4 (100 %) | 16 | 69 % | 2.68 | 31.16 | tp4.8 sl2.4 tr0 h96 lg (5 · 2.65 · 8.60) |
| Long | follow | r-connors@m30 | 2 | 2 (100 %) | 5 | 100 % | ∞ (no loss) | 31.00 | – |
| Long | sweep | r-inside@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 25.87 | – |
| Long | pivot | obv-20@m30 | 5 | 5 (100 %) | 15 | 67 % | 1.70 | 23.13 | – |
| Long | magnet | kelt-20-1.5@m15 | 5 | 5 (100 %) | 6 | 83 % | 7.05 | 20.56 | – |
| Long | sweep | r-camarilla@m30 | 7 | 7 (100 %) | 9 | 78 % | 2.97 | 15.54 | – |
| Long | sweep | break-vol-1.3@m15 | 4 | 2 (50 %) | 12 | 50 % | 1.37 | 7.90 | – |
| Long | ribbon | ema-50-100@m30 | 2 | 0 (0 %) | 6 | 67 % | 0.84 | -2.16 | – |
| Long | sweep | break-vol-1.3@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -3.86 | – |
| Long | clamp | r-streak@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.62 | -6.02 | – |
| Long | revert | r-fakeout@m15c | 3 | 1 (33 %) | 15 | 40 % | 0.83 | -6.90 | tp6 sl4.5 tr0 h96 lg (5 · 0.82 · -2.50) |
| Long | ribbon | trend-st-28-6@m15 | 2 | 0 (0 %) | 8 | 38 % | 0.69 | -7.20 | tp5.6 sl4.2 tr0 h64 lg (6 · 0.61 · -6.80) |
| Long | ribbon | trix-15@m15 | 2 | 0 (0 %) | 8 | 25 % | 0.53 | -10.00 | tp5.6 sl2.8 tr0 h64 lg (6 · 0.36 · -9.60) |
| Long | revert | ema-50-100@m30 | 1 | 0 (0 %) | 5 | 20 % | 0.30 | -10.60 | tp4.8 sl3.6 tr0 h48 lg (5 · 0.30 · -10.60) |
| Long | revert | r-roofing@m15 | 4 | 0 (0 %) | 14 | 64 % | 0.50 | -12.66 | – |
| Long | ribbon | trend-st-21-5@m15c | 5 | 0 (0 %) | 15 | 33 % | 0.66 | -14.40 | tp5.6 sl2.8 tr0 h96 lg (5 · 0.45 · -6.60) |
| Long | ribbon | trend-st-21-5@m15 | 4 | 0 (0 %) | 12 | 33 % | 0.57 | -15.90 | – |
| Long | revert | r-bos@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.15 | -19.05 | – |
| Long | sweep | willr-7-90@m30 | 3 | 0 (0 %) | 12 | 50 % | 0.23 | -21.95 | – |
| Long | follow | r-streak@m15 | 8 | 0 (0 %) | 32 | 50 % | 0.69 | -26.48 | – |
| Long | sweep | r-fisher@m30 | 4 | 0 (0 %) | 16 | 25 % | 0.41 | -27.27 | tp5.2 sl2.6 tr0 h32 lg (5 · 0.45 · -6.20) |
| Long | ribbon | willr-21-95@m30 | 27 | 0 (0 %) | 10 | 0 % | 0.00 | -34.20 | – |
| Long | ribbon | mfi-14-10@m30 | 12 | 0 (0 %) | 10 | 0 % | 0.00 | -34.70 | – |
| Long | pivot | break-vol-1.3@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -36.40 | – |
| Long | ribbon | r-streak@m15 | 10 | 0 (0 %) | 40 | 50 % | 0.66 | -37.32 | – |
| Long | revert | r-star-m@m30 | 30 | 0 (0 %) | 10 | 0 % | 0.00 | -40.80 | – |
| Long | clamp | break-retest@m15 | 8 | 0 (0 %) | 9 | 0 % | 0.00 | -45.29 | – |
| Long | sweep | mfi-14-10@m30 | 30 | 0 (0 %) | 16 | 0 % | 0.00 | -65.60 | – |
| Long | sweep | rsi-7-15-85@m30 | 30 | 0 (0 %) | 84 | 49 % | 0.59 | -87.98 | – |
| Long | ribbon | act-hf@m30 | 12 | 0 (0 %) | 32 | 0 % | 0.00 | -125.60 | – |
| Long | follow | r-zdist-m@m15 | 7 | 0 (0 %) | 61 | 26 % | 0.34 | -184.20 | tp6 sl6 tr0 h64 lg (9 · 0.47 · -19.80) |
| Long | ribbon | dir-thrust@m30 | 32 | 1 (3 %) | 69 | 6 % | 0.01 | -235.55 | – |
| Wide | ribbon | r-chand-m@m15 | 12 | 12 (100 %) | 36 | 100 % | ∞ (no loss) | 124.58 | – |
| Wide | magnet | move-cont@m15 | 13 | 13 (100 %) | 13 | 100 % | ∞ (no loss) | 25.27 | – |
| Wide | magnet | dir-emax-5-13@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 14.24 | – |
| Wide | magnet | trend-adx-20@m15 | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 12.84 | – |
| Wide | magnet | ema-slope-10@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 11.06 | – |
| Wide | sweep | z-50-2.5@x4@m5 | 23 | 15 (65 %) | 46 | 33 % | 1.60 | 10.42 | – |
| Wide | magnet | trend-adx@m15 | 8 | 5 (63 %) | 14 | 57 % | 1.22 | 2.65 | – |
| Wide | magnet | trend-adx-20@m15c | 8 | 5 (63 %) | 14 | 57 % | 1.22 | 2.65 | – |
| Wide | magnet | ichi-tk-20@m1c | 3 | 3 (100 %) | 33 | 45 % | 1.07 | 0.90 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (11 · 1.07 · 0.30) |
| Wide | follow | r-rsi2-m@m15c | 6 | 3 (50 %) | 12 | 50 % | 0.66 | -2.87 | – |
| Wide | ribbon | r-sweep-m@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -7.77 | – |
| Wide | pivot | r-sweep-m@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -7.77 | – |
| Wide | pivot | move-cont@m15c | 4 | 3 (75 %) | 12 | 58 % | 0.72 | -10.86 | – |
| Wide | clamp | r-sweep-m@m5 | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -11.77 | – |
| Wide | sweep | cci-40-200@m5c | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -12.10 | – |
| Wide | sweep | cci-14-100@m1c | 2 | 0 (0 %) | 34 | 24 % | 0.23 | -13.53 | tp0.64 sl0.54 tr0 h480 axd-geo2h axis (17 · 0.25 · -6.11) |
| Wide | clamp | r-pin-m@m5 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -14.41 | – |
| Wide | pivot | ema-slope-10@m15c | 4 | 0 (0 %) | 8 | 50 % | 0.14 | -25.35 | – |
| Wide | follow | rsi-14-20-80@m15c | 12 | 0 (0 %) | 36 | 33 % | 0.28 | -32.40 | – |
| Wide | revert | rsi-mom-14-20@m15c | 12 | 0 (0 %) | 36 | 33 % | 0.28 | -32.40 | – |
| Wide | pivot | r-pin-m@m5 | 9 | 0 (0 %) | 18 | 0 % | 0.00 | -37.68 | – |
| Wide | sweep | willr-50-90@m1c | 24 | 0 (0 %) | 216 | 33 % | 0.50 | -46.26 | tp0.64 sl0.54 tr0 h480 axd-atr2h axis (9 · 0.82 · -0.47) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 450 | 90 % | 6.91 | 1057.68 | tp4 sl12 tr0 h96 (13 · ∞ (no loss) · 49.40) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 386 | 87 % | 10.64 | 865.14 | tp3 sl9 tr0 h96 (17 · ∞ (no loss) · 47.60) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 30 (100 %) | 351 | 90 % | 10.76 | 816.90 | tp4 sl6 tr0 h96 (12 · ∞ (no loss) · 45.60) |
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 389 | 85 % | 5.85 | 802.02 | tp4 sl12 tr3.2 h96 (11 · ∞ (no loss) · 38.11) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 29 (97 %) | 389 | 89 % | 4.64 | 739.64 | tp3 sl9 tr0 h96 (18 · ∞ (no loss) · 50.40) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 30 (100 %) | 492 | 80 % | 2.66 | 710.71 | tp2.5 sl7.5 tr0 h96 (25 · 7.17 · 47.50) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 291 | 92 % | 43.43 | 678.19 | tp3 sl6 tr0 h96 (14 · ∞ (no loss) · 39.20) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 30 (100 %) | 345 | 87 % | 3.86 | 657.02 | tp4 sl12 tr2.4 h96 (13 · ∞ (no loss) · 39.42) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 30 (100 %) | 481 | 79 % | 2.45 | 653.23 | tp2.5 sl7.5 tr0 h96 (24 · 6.87 · 45.20) |
| Signals | follow | sig-hma-s@m15 | 30 | 29 (97 %) | 366 | 85 % | 3.78 | 626.93 | tp3 sl9 tr0 h96 (15 · ∞ (no loss) · 42.00) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 236 | 96 % | 44.69 | 622.09 | tp3 sl6 tr0 h96 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 230 | 95 % | 472.94 | 609.33 | tp3 sl9 tr1.2 h96 (17 · 190.82 · 31.67) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 27 (90 %) | 383 | 82 % | 3.06 | 600.84 | tp3 sl9 tr2.4 h96 (19 · 72.50 · 44.48) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 27 (90 %) | 383 | 82 % | 3.06 | 600.84 | tp3 sl9 tr2.4 h96 (19 · 72.50 · 44.48) |
| Signals | follow | sig-thrust-m@m15 | 30 | 26 (87 %) | 393 | 84 % | 2.65 | 600.30 | tp4 sl12 tr1.6 h96 (21 · 4.01 · 38.54) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 30 (100 %) | 247 | 88 % | 6.03 | 570.42 | tp3 sl9 tr0 h96 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 29 (97 %) | 415 | 81 % | 2.33 | 566.56 | tp3 sl6 tr0 h96 (19 · 8.13 · 44.20) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 30 (100 %) | 236 | 88 % | 6.86 | 547.17 | tp3 sl9 tr2.4 h96 (11 · ∞ (no loss) · 30.80) |
| Signals | follow | sig-donchian-m@m15 | 30 | 30 (100 %) | 212 | 88 % | 17.84 | 531.87 | tp3 sl6 tr0 h96 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-keltner-s@m15 | 30 | 30 (100 %) | 189 | 94 % | 36.22 | 523.40 | tp3 sl9 tr2.4 h96 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 229 | 88 % | 8.64 | 519.04 | tp3 sl9 tr0 h96 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-kama-s@m15 | 30 | 26 (87 %) | 435 | 83 % | 1.96 | 516.13 | tp3 sl9 tr2.4 h96 (19 · 4.89 · 35.76) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 30 (100 %) | 292 | 88 % | 2.63 | 516.12 | tp8 sl24 tr4.8 h96 (6 · ∞ (no loss) · 25.95) |
| Signals | follow | sig-donchian-s@m15 | 30 | 30 (100 %) | 227 | 89 % | 8.70 | 513.54 | tp3 sl9 tr0 h96 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 30 (100 %) | 213 | 90 % | 11.97 | 495.28 | tp8 sl24 tr6.4 h96 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 30 (100 %) | 209 | 92 % | 5.65 | 490.62 | tp4 sl12 tr0 h96 (7 · ∞ (no loss) · 26.60) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 200 | 91 % | 13.81 | 486.63 | tp3 sl6 tr0 h96 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 29 (97 %) | 250 | 89 % | 4.31 | 475.87 | tp2.5 sl7.5 tr0 h96 (13 · ∞ (no loss) · 29.90) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 229 | 83 % | 5.73 | 459.81 | tp3 sl6 tr0 h96 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 331 | 83 % | 2.30 | 459.64 | tp6 sl12 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 27 (90 %) | 433 | 77 % | 2.10 | 448.79 | tp2.5 sl7.5 tr0 h96 (25 · 3.44 · 37.50) |
| Signals | follow | sig-impulse-m@m15 | 30 | 29 (97 %) | 215 | 85 % | 4.34 | 416.64 | tp3 sl9 tr1.8 h96 (13 · 39.17 · 25.11) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 25 (83 %) | 394 | 77 % | 1.90 | 410.25 | tp3 sl9 tr0 h96 (16 · 4.57 · 32.80) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 30 (100 %) | 181 | 80 % | 5.17 | 401.99 | tp5 sl10 tr0 h96 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 28 (93 %) | 154 | 84 % | 5.41 | 392.17 | tp6 sl18 tr2.4 h96 (5 · 77.52 · 17.74) |
| Signals | follow | sig-sar-m@m15 | 30 | 27 (90 %) | 374 | 80 % | 1.76 | 371.77 | tp4 sl12 tr3.2 h96 (14 · 3.76 · 33.62) |
| Signals | follow | sig-kama-m@m15 | 30 | 25 (83 %) | 343 | 83 % | 1.81 | 368.46 | tp3 sl9 tr0 h96 (14 · 3.96 · 27.20) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 24 (80 %) | 371 | 77 % | 1.92 | 357.55 | tp3 sl9 tr0 h96 (14 · ∞ (no loss) · 39.20) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 28 (93 %) | 389 | 79 % | 1.68 | 344.46 | tp5 sl7.5 tr0 h96 (8 · 4.36 · 25.90) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 27 (90 %) | 340 | 81 % | 1.60 | 333.81 | tp4 sl12 tr2.4 h96 (12 · 2.98 · 24.18) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 28 (93 %) | 168 | 83 % | 5.58 | 327.71 | tp3 sl9 tr1.2 h96 (14 · 64.45 · 23.66) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 103 | 95 % | 420.85 | 326.59 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 8.76) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 25 (83 %) | 408 | 79 % | 1.58 | 322.00 | tp3 sl9 tr1.2 h96 (30 · 4.33 · 34.22) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 115 | 93 % | 608.25 | 318.02 | tp3 sl9 tr1.8 h96 (8 · 108.85 · 14.45) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 28 (93 %) | 127 | 87 % | 5.67 | 304.68 | tp3 sl6 tr0 h96 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 29 (97 %) | 134 | 84 % | 6.32 | 294.86 | tp2.5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 24 (80 %) | 425 | 77 % | 1.47 | 288.60 | tp5 sl15 tr0 h96 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 29 (97 %) | 140 | 78 % | 3.87 | 283.03 | tp3 sl6 tr0 h96 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 22 (73 %) | 570 | 75 % | 1.31 | 277.41 | tp3 sl9 tr1.2 h96 (41 · 3.07 · 39.72) |
| Signals | follow | sig-cmf-m@m15 | 30 | 22 (73 %) | 295 | 83 % | 1.67 | 274.63 | tp3 sl4.5 tr0 h96 (15 · 3.87 · 27.00) |
| Signals | follow | sig-cci-m@m15 | 30 | 27 (90 %) | 121 | 87 % | 4.68 | 273.72 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 15.45) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 24 (80 %) | 360 | 76 % | 1.56 | 270.07 | tp3 sl9 tr2.4 h96 (17 · 3.44 · 23.91) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 28 (93 %) | 147 | 79 % | 5.37 | 261.54 | tp3 sl6 tr0 h96 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-keltner-m@m15 | 27 | 26 (96 %) | 131 | 89 % | 6.58 | 254.87 | tp3 sl6 tr0 h96 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 25 (83 %) | 193 | 81 % | 2.04 | 246.80 | tp6 sl18 tr2.4 h96 (7 · 7.32 · 17.59) |
| Signals | follow | sig-williams-r-s@m15 | 29 | 19 (66 %) | 201 | 80 % | 2.07 | 244.14 | tp3 sl9 tr0 h96 (9 · ∞ (no loss) · 25.20) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 28 (93 %) | 92 | 90 % | 9.06 | 243.28 | tp4 sl12 tr1.6 h96 (6 · 5258.05 · 16.13) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 25 (83 %) | 313 | 74 % | 1.61 | 233.57 | tp3 sl9 tr1.2 h96 (28 · 8.07 · 22.60) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 76 | 99 % | 1188.34 | 226.98 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 10.72) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 29 | 26 (90 %) | 162 | 81 % | 2.04 | 215.86 | tp5 sl15 tr2 h96 (6 · 91.73 · 16.76) |
| Signals | follow | sig-obv-m@m15 | 30 | 30 (100 %) | 111 | 90 % | 5.91 | 211.59 | tp3 sl9 tr1.8 h96 (7 · 104.22 · 16.64) |
| Signals | follow | sig-adx-s@m15 | 29 | 24 (83 %) | 124 | 85 % | 2.75 | 209.02 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 17.85) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 23 (77 %) | 277 | 80 % | 1.43 | 207.92 | tp3 sl9 tr1.2 h96 (16 · 3.19 · 21.01) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 27 (90 %) | 116 | 84 % | 5.54 | 205.31 | tp2.5 sl7.5 tr0 h96 (6 · ∞ (no loss) · 13.80) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 23 (77 %) | 331 | 77 % | 1.30 | 189.72 | tp4 sl12 tr2.4 h96 (13 · 3.17 · 26.48) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 24 (80 %) | 276 | 79 % | 1.44 | 185.50 | tp3 sl9 tr1.2 h96 (18 · 8.23 · 26.96) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 28 (93 %) | 92 | 85 % | 8.27 | 180.94 | tp3 sl6 tr0 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-r-awesome-m@m15 | 26 | 22 (85 %) | 196 | 77 % | 2.15 | 180.06 | tp3 sl9 tr2.4 h96 (9 · 31.51 · 18.98) |
| Signals | follow | sig-adx-m@m15 | 30 | 24 (80 %) | 133 | 72 % | 2.06 | 178.38 | tp5 sl15 tr2 h96 (6 · 6.82 · 11.82) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 23 (77 %) | 383 | 75 % | 1.35 | 176.59 | tp3 sl9 tr2.4 h96 (21 · 2.26 · 23.55) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 25 (83 %) | 127 | 81 % | 2.46 | 150.07 | tp3 sl9 tr1.8 h96 (7 · ∞ (no loss) · 15.39) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 23 | 23 (100 %) | 53 | 91 % | 223.31 | 149.87 | tp3 sl9 tr1.2 h96 (5 · 51.18 · 8.42) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 22 (73 %) | 198 | 79 % | 1.54 | 149.78 | tp3 sl9 tr2.4 h96 (9 · ∞ (no loss) · 20.02) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 21 (70 %) | 169 | 79 % | 1.50 | 137.84 | tp3 sl9 tr1.2 h96 (11 · 18.32 · 16.81) |
| Signals | follow | sig-squeeze-m@m15 | 30 | 30 (100 %) | 34 | 97 % | 6215.96 | 133.38 | – |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 24 (80 %) | 119 | 79 % | 1.83 | 129.63 | tp4 sl12 tr1.6 h96 (6 · 81.95 · 10.28) |
| Signals | follow | sig-rsi-reversal-m@m15 | 23 | 23 (100 %) | 41 | 95 % | 15.19 | 122.72 | – |
| Signals | follow | sig-r-inside-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 120.69 | – |
| Signals | follow | sig-supertrend-m@m15 | 30 | 29 (97 %) | 41 | 98 % | 619.28 | 118.20 | – |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 18 (60 %) | 368 | 75 % | 1.19 | 117.59 | tp5 sl10 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 25 (83 %) | 64 | 81 % | 3.09 | 116.13 | tp3 sl4.5 tr0 h96 (5 · 0.89 · -1.00) |
| Signals | follow | sig-rsi-reversal-s@m15 | 23 | 21 (91 %) | 38 | 95 % | 14.33 | 115.32 | – |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 17 (57 %) | 140 | 81 % | 1.51 | 114.81 | tp4 sl12 tr1.6 h96 (8 · ∞ (no loss) · 22.91) |
| Signals | follow | sig-stoch-rsi-m@m15 | 29 | 24 (83 %) | 319 | 75 % | 1.22 | 113.42 | tp5 sl7.5 tr0 h96 (6 · 3.12 · 16.30) |
| Signals | follow | sig-volume-break-m@m15 | 27 | 27 (100 %) | 48 | 83 % | 30.41 | 108.67 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 26 | 26 (100 %) | 32 | 100 % | ∞ (no loss) | 96.23 | – |
| Signals | follow | sig-sar-s@m15 | 30 | 21 (70 %) | 399 | 74 % | 1.14 | 94.96 | tp4 sl12 tr1.6 h96 (24 · 3.19 · 27.13) |
| Signals | follow | sig-trix-s@m15 | 30 | 22 (73 %) | 165 | 76 % | 1.34 | 94.00 | tp5 sl15 tr3 h96 (5 · 10.03 · 14.38) |
| Signals | follow | sig-zscore-m@m15 | 22 | 20 (91 %) | 73 | 82 % | 2.65 | 87.51 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 18 (60 %) | 296 | 76 % | 1.14 | 86.67 | tp3 sl9 tr1.2 h96 (18 · 1.82 · 15.13) |
| Signals | follow | sig-s2-vol-break-s@m15 | 27 | 23 (85 %) | 34 | 79 % | 30.22 | 84.79 | – |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 19 (63 %) | 97 | 76 % | 1.62 | 81.68 | tp5 sl15 tr2 h96 (6 · 1.85 · 4.19) |
| Signals | follow | sig-volume-break-s@m15 | 27 | 20 (74 %) | 27 | 74 % | 27.51 | 76.94 | – |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 16 (53 %) | 229 | 77 % | 1.15 | 57.85 | tp3 sl9 tr0 h96 (10 · 2.74 · 16.00) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 22 | 18 (82 %) | 39 | 79 % | 2.40 | 54.08 | – |
| Signals | follow | sig-bollinger-s@m15 | 29 | 17 (59 %) | 171 | 75 % | 1.14 | 46.85 | tp5 sl15 tr2 h96 (7 · 131.22 · 20.56) |
| Signals | follow | sig-zscore-s@m15 | 29 | 17 (59 %) | 171 | 75 % | 1.14 | 46.85 | tp5 sl15 tr2 h96 (7 · 131.22 · 20.56) |
| Signals | follow | sig-ema-slope-m@m15 | 14 | 11 (79 %) | 39 | 69 % | 2.04 | 33.90 | tp2.5 sl3.75 tr0 h96 (6 · 0.58 · -4.95) |
| Signals | follow | sig-bollinger-m@m15 | 29 | 16 (55 %) | 128 | 77 % | 1.14 | 33.36 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 13.35) |
| Signals | follow | sig-obv-s@m15 | 30 | 15 (50 %) | 240 | 73 % | 1.07 | 33.30 | tp4 sl12 tr1.6 h96 (12 · 10.14 · 25.13) |
| Signals | follow | sig-mfi-m@m15 | 15 | 12 (80 %) | 26 | 85 % | 3.35 | 32.57 | – |
| Signals | follow | sig-ema-cross-m@m15 | 16 | 12 (75 %) | 39 | 82 % | 2.22 | 32.30 | – |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 15 (50 %) | 413 | 69 % | 1.04 | 30.73 | tp5 sl15 tr4 h96 (10 · 2.25 · 19.14) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 15 (50 %) | 154 | 75 % | 1.09 | 27.52 | tp6 sl18 tr2.4 h96 (7 · 97.21 · 17.43) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 14 (47 %) | 381 | 70 % | 1.03 | 24.64 | tp5 sl10 tr0 h96 (7 · 2.82 · 18.60) |
| Signals | follow | sig-vwap-s@m15 | 30 | 19 (63 %) | 204 | 75 % | 1.04 | 15.90 | tp3 sl9 tr1.8 h96 (11 · 2.12 · 10.77) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 10 | 10 (100 %) | 11 | 100 % | ∞ (no loss) | 13.39 | – |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 16 (53 %) | 223 | 74 % | 1.02 | 11.27 | tp8 sl24 tr3.2 h96 (5 · 216.49 · 17.55) |
| Signals | follow | sig-hma-m@m15 | 28 | 18 (64 %) | 104 | 73 % | 1.04 | 7.40 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-trix-m@m15 | 30 | 12 (40 %) | 112 | 65 % | 1.02 | 5.08 | tp2.5 sl7.5 tr0 h96 (5 · 1.19 · 1.50) |
| Signals | follow | sig-ema-trend-m@m15 | 29 | 14 (48 %) | 146 | 72 % | 0.92 | -25.59 | tp3 sl9 tr1.2 h96 (10 · ∞ (no loss) · 17.80) |
| Signals | follow | sig-s2-vol-break-m@m15 | 27 | 10 (37 %) | 55 | 56 % | 0.54 | -77.64 | – |
| Signals | follow | sig-cmf-s@m15 | 30 | 11 (37 %) | 361 | 72 % | 0.89 | -83.47 | tp4 sl12 tr1.6 h96 (24 · 1.71 · 17.45) |
| Signals | follow | sig-cci-s@m15 | 30 | 9 (30 %) | 219 | 68 % | 0.83 | -87.00 | tp5 sl15 tr2 h96 (9 · 77.49 · 17.55) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 13 (43 %) | 128 | 69 % | 0.73 | -98.12 | tp2.5 sl7.5 tr0 h96 (7 · 1.79 · 6.10) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 10 (33 %) | 331 | 65 % | 0.84 | -121.54 | tp6 sl18 tr2.4 h96 (10 · 1.32 · 6.12) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 3 (10 %) | 158 | 63 % | 0.61 | -197.03 | tp2.5 sl5 tr0 h96 (9 · 1.55 · 5.70) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 1 (3 %) | 51 | 16 % | 0.03 | -404.37 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 118 | 107 (91 %) | 1214 | 83 % | 3.38 | 1809.50 |
| Signals | tp 3.000% | sl 3.00× | tr off | 117 | 108 (92 %) | 1069 | 90 % | 2.82 | 1745.20 |
| Signals | tp 2.500% | sl 3.00× | tr off | 118 | 107 (91 %) | 1278 | 90 % | 2.73 | 1679.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 119 | 110 (92 %) | 1720 | 81 % | 3.09 | 1640.45 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 118 | 107 (91 %) | 1388 | 83 % | 3.05 | 1611.22 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 118 | 109 (92 %) | 1393 | 83 % | 2.86 | 1494.45 |
| Signals | tp 3.000% | sl 2.00× | tr off | 117 | 104 (89 %) | 1219 | 82 % | 2.12 | 1487.20 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 118 | 105 (89 %) | 1083 | 82 % | 2.83 | 1453.43 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 118 | 110 (93 %) | 1134 | 86 % | 2.89 | 1327.80 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 116 | 99 (85 %) | 800 | 83 % | 2.56 | 1298.91 |
| Signals | tp 4.000% | sl 3.00× | tr off | 114 | 94 (82 %) | 608 | 89 % | 2.56 | 1254.40 |
| Signals | tp 5.000% | sl 3.00× | tr off | 114 | 96 (84 %) | 429 | 89 % | 2.45 | 1079.20 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 114 | 97 (85 %) | 547 | 81 % | 2.33 | 1073.03 |
| Signals | tp 4.000% | sl 2.00× | tr off | 114 | 94 (82 %) | 679 | 81 % | 1.98 | 1032.20 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 117 | 97 (83 %) | 826 | 81 % | 2.27 | 1012.48 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 118 | 100 (85 %) | 1002 | 83 % | 2.25 | 995.70 |
| Signals | tp 5.000% | sl 2.00× | tr off | 114 | 89 (78 %) | 471 | 82 % | 2.08 | 955.80 |
| Signals | tp 6.000% | sl 2.00× | tr off | 106 | 78 (74 %) | 309 | 84 % | 2.46 | 892.20 |
| Signals | tp 6.000% | sl 3.00× | tr off | 105 | 80 (76 %) | 287 | 89 % | 2.45 | 872.60 |
| Signals | tp 2.500% | sl 2.00× | tr off | 119 | 91 (76 %) | 1532 | 77 % | 1.46 | 846.10 |
| Signals | tp 3.000% | sl 1.50× | tr off | 118 | 82 (69 %) | 1429 | 70 % | 1.37 | 753.70 |
| Signals | tp 5.000% | sl 1.50× | tr off | 114 | 85 (75 %) | 532 | 73 % | 1.68 | 753.60 |
| Signals | tp 4.000% | sl 1.50× | tr off | 116 | 86 (74 %) | 800 | 71 % | 1.50 | 720.00 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 109 | 83 (76 %) | 426 | 81 % | 1.91 | 717.37 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 93 | 71 (76 %) | 221 | 83 % | 1.97 | 573.95 |
| Signals | tp 6.000% | sl 1.50× | tr off | 107 | 76 (71 %) | 370 | 72 % | 1.59 | 571.00 |
| Signals | tp 2.500% | sl 1.50× | tr off | 119 | 82 (69 %) | 1723 | 68 % | 1.26 | 556.65 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 108 | 80 (74 %) | 606 | 83 % | 1.71 | 508.53 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 109 | 72 (66 %) | 593 | 77 % | 1.49 | 486.10 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 105 | 79 (75 %) | 355 | 83 % | 1.60 | 369.48 |
| General | tp 3.600% | sl 1.00× | tr 0.75× | 61 | 25 (41 %) | 70 | 66 % | 2.53 | 135.10 |
| Long | tp 5.600% | sl 1.00× | tr 0.50× | 43 | 15 (35 %) | 43 | 86 % | 4.54 | 102.96 |
| Wide | tp 0.800% | sl 1.00× | tr off | 123 | 65 (53 %) | 226 | 63 % | 1.46 | 93.60 |
| Long | tp 6.400% | sl 1.00× | tr off | 57 | 13 (23 %) | 54 | 65 % | 1.73 | 91.60 |
| General | tp 3.600% | sl 1.00× | tr 0.50× | 68 | 43 (63 %) | 88 | 81 % | 2.72 | 87.12 |
| General | tp 4.000% | sl 1.00× | tr off | 72 | 26 (36 %) | 91 | 64 % | 1.59 | 81.80 |
| Long | tp 5.200% | sl 1.00× | tr 0.50× | 52 | 18 (35 %) | 36 | 81 % | 3.88 | 81.60 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 61 | 29 (48 %) | 63 | 83 % | 2.84 | 69.95 |
| Short | tp 2.600% | sl 1.50× | tr off | 54 | 25 (46 %) | 53 | 83 % | 2.86 | 68.70 |
| General | tp 3.600% | sl 1.00× | tr off | 68 | 26 (38 %) | 66 | 67 % | 1.79 | 66.00 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Wide | tp 0.760% | sl 0.89× | tr off | 77 | 15 (19 %) | 108 | 14 % | 0.23 | -90.47 |
| Wide | tp 0.640% | sl 0.84× | tr off | 29 | 3 (10 %) | 283 | 34 % | 0.52 | -58.89 |
| Short | tp 2.800% | sl 1.50× | tr 0.75× | 73 | 21 (29 %) | 100 | 47 % | 0.71 | -45.21 |
| Short | tp 2.200% | sl 1.50× | tr 0.75× | 58 | 22 (38 %) | 99 | 58 % | 0.74 | -34.95 |
| Short | tp 2.200% | sl 2.00× | tr 0.50× | 48 | 25 (52 %) | 96 | 61 % | 0.73 | -29.09 |
| Short | tp 2.800% | sl 1.00× | tr 0.75× | 50 | 8 (16 %) | 70 | 33 % | 0.67 | -27.50 |
| Short | tp 2.200% | sl 1.50× | tr 0.50× | 41 | 17 (41 %) | 84 | 55 % | 0.71 | -25.46 |
| Short | tp 2.200% | sl 2.00× | tr 0.75× | 57 | 27 (47 %) | 87 | 64 % | 0.81 | -24.12 |
| General | tp 3.200% | sl 1.00× | tr off | 56 | 16 (29 %) | 84 | 49 % | 0.84 | -23.20 |
| Short | tp 2.400% | sl 1.00× | tr 0.75× | 27 | 11 (41 %) | 32 | 53 % | 0.23 | -22.50 |
| General | tp 3.600% | sl 0.75× | tr off | 51 | 19 (37 %) | 76 | 42 % | 0.85 | -18.80 |
| Short | tp 2.600% | sl 1.00× | tr 0.75× | 51 | 20 (39 %) | 80 | 56 % | 0.79 | -18.61 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 81 | 21 (26 %) | 106 | 43 % | 0.89 | -18.50 |
| Short | tp 2.200% | sl 1.00× | tr 0.50× | 18 | 2 (11 %) | 28 | 36 % | 0.49 | -17.71 |
| Micro | tp 0.600% (net 0.400%) | sl 4.75× | tr off | 32 | 10 (31 %) | 94 | 83 % | 0.64 | -17.60 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 34 (34) | 17936 | 8504 | 8504 | 0 | baseTarget 9432 |
| Micro | trailing | 34 (34) | 35872 | 17008 | 17008 | 0 | baseTarget 18864 |
| Short | normal | 249 (193) | 35064 | 11610 | 11610 | 0 | baseRange 16596 · baseTarget 6858 |
| Short | trailing | 249 (193) | 70128 | 23220 | 23220 | 0 | baseRange 33192 · baseTarget 13716 |
| General | normal | 249 (206) | 23376 | 8514 | 8514 | 0 | baseRange 11064 · baseTarget 3798 |
| General | trailing | 249 (206) | 15584 | 5676 | 5676 | 0 | baseRange 7376 · baseTarget 2532 |
| Long | normal | 249 (229) | 29220 | 13548 | 13548 | 0 | baseRange 9510 · baseTarget 6162 |
| Long | trailing | 249 (229) | 19480 | 9032 | 9032 | 0 | baseRange 6340 · baseTarget 4108 |
| Wide | axis | 283 (283) | 47565 | 47565 | 47565 | 0 | – |
| Wide | dca | 283 (283) | 4228 | 4228 | 4228 | 0 | – |
| Wide | dca-active | 283 (283) | 4228 | 4228 | 4228 | 0 | – |

Engine indications Base evaluated that built no set: 108 (bb-bounce, bb-walk, break-atr-0.9, dir-emax-20-50, dir-macd, ema-21-55, hma-32, macd-cross-5-35-5, macd-cross-8-21-5, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-10, mc-brk-20, mc-burst-2, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-iz-25, mc-macdh, mc-mrsi2-10, mc-mturn-5, mc-qrsi2-5, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-20, mc-rsi4-25, mc-rsi4-30, mc-rsi4-5, mc-rsi5-25, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.29 (812) | 0.42 (924) | 0.45 (980) | 0.52 (1208) | 0.50 (1598) |
| 1.14× | – | 0.23 (692) | – | – | – | – | – |
| 1.25× | – | 0.26 (680) | 0.36 (796) | 0.41 (924) | 0.40 (980) | 0.49 (1208) | 0.49 (1598) |
| 1.33× | 0.17 (660) | – | – | – | – | – | – |
| 1.5× | 0.20 (648) | 0.27 (676) | 0.34 (796) | 0.41 (924) | 0.45 (980) | 0.48 (1204) | 0.44 (1590) |
| 1.75× | 0.20 (648) | 0.27 (676) | 0.36 (796) | 0.44 (920) | 0.41 (976) | 0.49 (1188) | 0.50 (1578) |
| 2× | 0.20 (648) | 0.30 (676) | 0.40 (788) | 0.44 (920) | 0.50 (964) | 0.53 (1176) | 0.51 (1560) |
| 2.25× | 0.21 (648) | 0.34 (668) | 0.40 (788) | 0.52 (908) | 0.51 (956) | 0.71 (1174) | 0.61 (1554) |
| 2.5× | 0.25 (648) | 0.31 (668) | 0.42 (776) | 0.52 (900) | 0.62 (956) | 0.65 (1174) | 0.57 (1554) |
| 2.75× | 0.23 (636) | 0.32 (656) | 0.43 (776) | 0.67 (900) | 0.58 (956) | 0.61 (1182) | 0.53 (1550) |
| 3× | 0.24 (636) | 0.33 (656) | 0.46 (776) | 0.62 (900) | 0.55 (956) | 0.59 (1178) | 0.55 (1526) |
| 3.25× | 0.23 (624) | 0.35 (656) | 0.54 (776) | 0.59 (900) | 0.53 (952) | 0.63 (1162) | 0.52 (1522) |
| 3.5× | 0.23 (624) | 0.45 (656) | 0.51 (776) | 0.57 (900) | 0.54 (952) | 0.60 (1162) | 0.53 (1510) |
| 3.75× | 0.25 (624) | 0.43 (656) | 0.50 (776) | 0.54 (900) | 0.54 (944) | 0.66 (1142) | 0.54 (1490) |
| 4× | 0.27 (624) | 0.41 (656) | 0.48 (776) | 0.59 (892) | 0.56 (928) | 0.62 (1142) | 0.51 (1490) |
| 4.25× | 0.33 (624) | 0.40 (656) | 0.46 (776) | 0.56 (892) | 0.59 (928) | 0.64 (1130) | 0.50 (1486) |
| 4.5× | 0.32 (624) | 0.39 (656) | 0.51 (784) | 0.59 (880) | 0.60 (920) | 0.61 (1126) | 0.48 (1486) |
| 4.75× | 0.30 (624) | 0.37 (656) | 0.48 (774) | 0.63 (880) | 0.57 (920) | 0.61 (1122) | 0.46 (1482) |
| 5× | 0.31 (624) | 0.41 (656) | 0.51 (762) | 0.67 (868) | 0.55 (920) | 0.60 (1118) | 0.44 (1482) |

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
| 2.25× | – | – | – | – | – | – | ∞ (8) |
| 2.5× | – | – | – | – | – | ∞ (4) | 2.71 (34) |
| 2.75× | – | – | – | – | – | 2.99 (34) | 1.12 (44) |
| 3× | – | – | – | ∞ (8) | 10.42 (16) | 2.40 (30) | 1.43 (40) |
| 3.25× | – | – | – | 10.86 (16) | 1.24 (28) | 69.44 (38) | 1.53 (63) |
| 3.5× | – | – | – | 1.31 (28) | 10.42 (16) | 6.48 (52) | 1.41 (91) |
| 3.75× | – | ∞ (6) | ∞ (24) | 1.24 (28) | 16.90 (38) | 8.82 (68) | 1.49 (78) |
| 4× | – | ∞ (6) | ∞ (24) | 8.54 (26) | 19.72 (43) | 8.82 (68) | 1.20 (68) |
| 4.25× | ∞ (2) | ∞ (30) | ∞ (24) | 16.62 (40) | 25.35 (53) | 9.12 (70) | 1.00 (86) |
| 4.5× | ∞ (2) | ∞ (32) | ∞ (24) | 22.00 (51) | 26.48 (55) | 8.16 (82) | 1.20 (81) |
| 4.75× | ∞ (2) | ∞ (32) | 19.78 (48) | 19.55 (46) | 26.48 (55) | 8.16 (82) | 1.03 (260) |
| 5× | ∞ (26) | ∞ (32) | 22.47 (54) | 20.53 (48) | 14.92 (62) | 8.16 (82) | 1.13 (246) |

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
| 3.25× | – | – | – | – | – | ∞ (2) | ∞ (3) |
| 3.5× | – | – | – | – | – | ∞ (1) | ∞ (3) |
| 3.75× | – | – | – | – | – | ∞ (2) | ∞ (3) |
| 4× | – | – | – | – | – | ∞ (1) | – |
| 4.25× | – | – | – | – | – | ∞ (1) | – |
| 4.5× | – | – | – | – | – | ∞ (1) | – |
| 4.75× | – | – | – | – | – | ∞ (1) | 0.41 (12) |
| 5× | – | – | – | – | – | – | 0.39 (6) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.98 (3954) | 1.03 (4238) | 0.87 (4459) | 1.05 (4559) | 1.15 (4414) | 1.14 (4936) |
| 1.5× | 1.09 (3712) | 1.04 (4017) | 1.00 (4087) | 1.15 (4102) | 1.27 (4010) | 1.33 (4436) |
| 2× | 1.29 (3421) | 1.19 (3714) | 1.00 (3906) | 1.29 (3868) | 1.47 (3770) | 1.67 (4082) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 4.42 (31) | 1.15 (65) | 0.71 (131) | 1.02 (112) | 0.99 (187) | 1.05 (222) |
| 1.5× | 8.45 (85) | 0.99 (106) | 0.76 (243) | 1.14 (208) | 1.56 (240) | 0.92 (255) |
| 2× | 5.91 (110) | 1.27 (140) | 0.84 (220) | 1.39 (144) | 2.03 (174) | 1.86 (195) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.00 (5) | 0.38 (17) | 0.76 (21) | 0.57 (23) | 0.52 (19) | 0.86 (24) |
| 1.5× | 6.18 (16) | 1.13 (11) | 2.59 (22) | 2.81 (26) | 1.70 (32) | 0.94 (30) |
| 2× | ∞ (6) | 2.47 (24) | 1.20 (27) | 1.03 (28) | 5.33 (43) | 118.14 (35) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.13 (1508) | 1.28 (1613) | 1.36 (1721) | 1.32 (1729) |
| 0.75× | 1.19 (1407) | 1.26 (1481) | 1.20 (1554) | 1.36 (1450) |
| 1× | 1.23 (3851) | 1.59 (3937) | 1.39 (4056) | 1.36 (4072) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.96 (50) | 2.42 (46) | 1.92 (38) | 1.75 (38) |
| 0.75× | 1.38 (57) | 0.85 (76) | 1.52 (82) | 1.13 (95) |
| 1× | 0.93 (253) | 2.29 (224) | 1.34 (246) | 1.06 (219) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.56 (8) | 1.13 (5) | 0.43 (10) | 0.53 (13) |
| 0.75× | 0.46 (7) | 0.59 (6) | 0.71 (16) | 0.78 (28) |
| 1× | 2.08 (40) | 1.57 (28) | 1.41 (31) | 0.89 (35) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.23 (1715) | 1.13 (1621) | 1.00 (1914) | 0.98 (1747) | 1.24 (2011) |
| 0.75× | 1.40 (1362) | 1.37 (1296) | 1.19 (1523) | 1.30 (1321) | 1.50 (1605) |
| 1× | 1.47 (3950) | 1.45 (3744) | 1.50 (4283) | 1.43 (3944) | 1.56 (4810) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 2.05 (41) | 1.79 (40) | 0.93 (53) | 1.14 (31) | 1.35 (40) |
| 0.75× | 1.46 (64) | 1.18 (59) | 0.91 (68) | 1.44 (39) | 1.86 (20) |
| 1× | 1.29 (143) | 1.59 (124) | 1.68 (120) | 1.56 (111) | 1.52 (120) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (6) | 0.00 (5) | 0.00 (4) | 0.00 (6) | 0.00 (6) |
| 0.75× | 0.00 (4) | 0.00 (4) | 0.00 (4) | 0.62 (3) | 1.24 (4) |
| 1× | 0.18 (6) | ∞ (2) | ∞ (3) | ∞ (3) | ∞ (6) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.37 (2809) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.59 (144) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.55 (23757) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.68 (141) | 0.41 (1083) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.68 (138) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.49 (1041) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.52 (1021) | – | – | – | – |
| 1× | – | – | – | 0.47 (88908) | – | – | – | 0.59 (18993) | 0.75 (3516) | – | 0.66 (1082) | – | 0.92 (3268) | 1.14 (2778) | 0.73 (932) | 0.82 (787) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.52 (283) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.23 (108) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 1.46 (226) | – | – | – | 0.98 (6) | – | – | – | – | – | – | – | – |

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
