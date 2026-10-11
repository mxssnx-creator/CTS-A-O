# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.40–$1.26 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T03:00 UTC. Engine: Base 1122/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126; Main 1057 pairs, 158467 tapes, Real seats: 6554 engine configs + 3750 signal configs (every config of the active signals), compute 205 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $26.46 (32.32 %, closed orders) · equity at end $23.70 (open at end: 23 positions / 4082 orders, MTM -$2.77 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 4.24 (gross profit $ ÷ gross loss $ as sized) · PF unit 3.77 (every order at one unit: the engine's PF) · 37 positions / 3927 orders (incl. 56 capped to $0) · WR 81.31 % · DDT (closed trades, $) 1.50 h · DDR 0.05 · equity max drawdown $2.02 (8.75 %) · margin used max $18.59 · open avg 15.59 pos / 756.29 orders (peak 19 / 1041)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 56 orders capped to $0, 3578 scaled down (open at end: 99 capped, 3908 scaled) · binding: position cap 6250, gross cap 7080. **Without the caps:** balance $20.00 → $60.84 (204.20 %) · PF $ 3.42 · equity at end $16.45 · equity max drawdown $48.47 (109.18 %) · margin used max $397.08 · infeasible: margin exceeded equity for 661 min.

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
| 15:00 | 3 / 159 | 133 / 26 | 4.51 | 5.72 | 84 % | $0.92 | $20.92 | $20.97 | $19.24 | 8.06 % | 0.53 | $12.59 | 14 / 608 |
| 16:00 | 4 / 159 | 133 / 26 | 4.30 | 4.05 | 84 % | $0.55 | $21.47 | $21.26 | $20.71 | 8.75 % | 1.53 | $15.03 | 16 / 845 |
| 17:00 | 0 / 173 | 140 / 33 | 54.65 | 19.99 | 81 % | $0.14 | $21.60 | $21.81 | $20.99 | 8.75 % | 2.53 | $15.12 | 17 / 1205 |
| 18:00 | 0 / 406 | 376 / 30 | 29.29 | 19.78 | 93 % | $0.93 | $22.53 | $22.17 | $21.66 | 8.75 % | 0.27 | $15.77 | 20 / 1335 |
| 19:00 | 2 / 326 | 282 / 44 | 6.15 | 7.46 | 87 % | $0.43 | $22.96 | $22.37 | $21.59 | 8.75 % | 1.27 | $16.08 | 21 / 1566 |
| 20:00 | 1 / 410 | 396 / 14 | 17.72 | 29.01 | 97 % | $1.16 | $24.13 | $24.00 | $22.36 | 8.75 % | 0.03 | $16.89 | 21 / 1648 |
| 21:00 | 1 / 282 | 259 / 23 | 27.15 | 25.99 | 92 % | $0.81 | $24.94 | $24.03 | $23.98 | 8.75 % | 0.42 | $17.46 | 21 / 2101 |
| 22:00 | 0 / 241 | 171 / 70 | 1.16 | 1.43 | 71 % | $0.06 | $25.00 | $24.01 | $23.49 | 8.75 % | 1.42 | $17.50 | 22 / 2391 |
| 23:00 | 1 / 299 | 205 / 94 | 3.90 | 2.12 | 69 % | $0.46 | $25.46 | $24.65 | $23.46 | 8.75 % | 2.42 | $17.82 | 22 / 2703 |
| 00:00 | 2 / 467 | 371 / 96 | 3.50 | 3.46 | 79 % | $0.43 | $25.89 | $24.58 | $23.89 | 8.75 % | 0.80 | $18.12 | 22 / 3244 |
| 01:00 | 0 / 392 | 314 / 78 | 3.15 | 2.62 | 80 % | $0.29 | $26.19 | $23.17 | $23.17 | 8.75 % | 1.80 | $18.35 | 23 / 4001 |
| 02:00 | 0 / 613 | 413 / 200 | 1.54 | 1.71 | 67 % | $0.28 | $26.46 | $23.70 | $22.81 | 8.75 % | 2.80 | $18.59 | 23 / 4082 |

**Last hour (02:00):** open at end: 23 positions / 4082 orders, MTM -$2.77 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $23.70 = balance $26.46 + MTM -$2.77.

**Hours positive:** 12 of 12 full hours · flat 0 · negative 0

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 15:00 | 3 · 0.00 · -$0.04 | 3 · 0.00 · -$0.02 | 134 · 6.45 · $0.98 | 16 · ∞ (no loss) · $0.02 | 3 · 0.00 · -$0.02 |
| 16:00 | 6 · ∞ (no loss) · $0.01 | – | 106 · 5.15 · $0.50 | 39 · ∞ (no loss) · $0.02 | 8 · 1.39 · $0.02 |
| 17:00 | – | – | 56 · 239.97 · $0.12 | 117 · 7.68 · $0.01 | – |
| 18:00 | – | – | 390 · 29.25 · $0.93 | 5 · ∞ (no loss) · $0.00 | 11 · ∞ (no loss) · $0.00 |
| 19:00 | – | 6 · 243399442517.77 · $0.00 | 243 · 6.43 · $0.39 | 32 · 76.20 · $0.04 | 45 · 0.82 · -$0.00 |
| 20:00 | 6 · – · $0.00 | 3 · ∞ (no loss) · $0.00 | 386 · 18.77 · $1.13 | 11 · 3.65 · $0.02 | 4 · ∞ (no loss) · $0.02 |
| 21:00 | 3 · – · $0.00 | – | 265 · 26.73 · $0.80 | 12 · ∞ (no loss) · $0.01 | 2 · ∞ (no loss) · $0.00 |
| 22:00 | 3 · ∞ (no loss) · $0.00 | – | 231 · 1.12 · $0.04 | – | 7 · 29.24 · $0.01 |
| 23:00 | – | – | 221 · 5.96 · $0.50 | 5 · 5.03 · $0.01 | 73 · 0.17 · -$0.05 |
| 00:00 | – | 3 · ∞ (no loss) · $0.00 | 398 · 3.32 · $0.35 | 27 · ∞ (no loss) · $0.05 | 39 · 2.63 · $0.04 |
| 01:00 | 3 · ∞ (no loss) · $0.00 | – | 292 · 3.13 · $0.27 | 73 · 2.46 · $0.01 | 24 · 5.06 · $0.01 |
| 02:00 | – | – | 515 · 1.49 · $0.24 | 14 · 2.60 · $0.00 | 84 · 3.68 · $0.03 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 159 | 25 · 0.16 · 64 % · -$0.07 | 49 · 1.19 · 71 % · $0.02 | 47 · 8.85 · 94 % · $0.43 | 38 · ∞ (no loss) · 100 % · $0.53 | – | 85 · 18.34 · 96 % · $0.96 |
| 16:00 | 159 | 30 · 12.71 · 97 % · $0.16 | 71 · 7.77 · 96 % · $0.21 | 21 · 3.29 · 71 % · $0.10 | 37 · 1.93 · 57 % · $0.07 | – | 58 · 2.44 · 62 % · $0.17 |
| 17:00 | 173 | 1 · ∞ (no loss) · 100 % · $0.00 | 141 · 10.94 · 78 % · $0.02 | 16 · ∞ (no loss) · 100 % · $0.08 | 15 · 78.13 · 87 % · $0.03 | – | 31 · 282.39 · 94 % · $0.11 |
| 18:00 | 406 | 21 · ∞ (no loss) · 100 % · $0.00 | 15 · ∞ (no loss) · 100 % · $0.06 | 182 · 372.23 · 99 % · $0.50 | 188 · 12.46 · 85 % · $0.36 | – | 370 · 27.22 · 92 % · $0.86 |
| 19:00 | 326 | 84 · 25.87 · 92 % · $0.09 | 61 · 2.02 · 67 % · $0.01 | 80 · 3.00 · 90 % · $0.14 | 101 · 301.74 · 91 % · $0.19 | – | 181 · 5.60 · 91 % · $0.33 |
| 20:00 | 410 | 41 · 13.14 · 98 % · $0.07 | 14 · ∞ (no loss) · 100 % · $0.01 | 194 · 10.29 · 96 % · $0.54 | 161 · 99.74 · 96 % · $0.54 | – | 355 · 17.93 · 96 % · $1.08 |
| 21:00 | 282 | 3 · ∞ (no loss) · 100 % · $0.00 | 30 · ∞ (no loss) · 100 % · $0.04 | 88 · 13.50 · 94 % · $0.33 | 161 · 96.82 · 89 % · $0.44 | – | 249 · 25.65 · 91 % · $0.77 |
| 22:00 | 241 | 8 · 29.91 · 88 % · $0.02 | 8 · ∞ (no loss) · 100 % · $0.02 | 127 · 0.57 · 58 % · -$0.12 | 98 · 2.70 · 84 % · $0.14 | – | 225 · 1.05 · 69 % · $0.02 |
| 23:00 | 299 | 38 · 0.73 · 8 % · -$0.01 | 49 · 0.17 · 10 % · -$0.03 | 122 · 3.63 · 93 % · $0.26 | 90 · 499.71 · 92 % · $0.23 | – | 212 · 5.95 · 93 % · $0.50 |
| 00:00 | 467 | 33 · 0.75 · 67 % · -$0.00 | 76 · 19.06 · 88 % · $0.13 | 142 · 2.57 · 83 % · $0.14 | 216 · 3.75 · 76 % · $0.17 | – | 358 · 3.05 · 79 % · $0.30 |
| 01:00 | 392 | 54 · 3.48 · 81 % · $0.01 | 80 · 6.32 · 83 % · $0.01 | 108 · 1.15 · 69 % · $0.02 | 150 · 123.64 · 87 % · $0.25 | – | 258 · 3.08 · 79 % · $0.27 |
| 02:00 | 613 | 82 · 0.51 · 17 % · -$0.01 | 50 · 5.39 · 72 % · $0.03 | 263 · 0.95 · 68 % · -$0.02 | 218 · 6.44 · 84 % · $0.29 | – | 481 · 1.55 · 75 % · $0.26 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 996 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (158467 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (10546); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 40093 · 0.71 | 8998 · 0.80 | 15055 · 0.59 | 2031 · 4.91 | 159 · 5.72 | 25 · 1.36 | 49 · 1.85 | – | 85 · 23.20 |
| 16:00 | 52002 · 0.45 | 14546 · 0.69 | 21548 · 0.58 | 3519 · 1.27 | 159 · 4.05 | 30 · 16.10 | 71 · 10.01 | – | 58 · 1.81 |
| 17:00 | 36175 · 0.47 | 8017 · 0.40 | 17537 · 0.36 | 2171 · 3.38 | 173 · 19.99 | 1 · ∞ (no loss) | 141 · 9.18 | – | 31 · 117.24 |
| 18:00 | 36532 · 1.47 | 11871 · 1.66 | 16240 · 2.28 | 3005 · 3.05 | 406 · 19.78 | 21 · ∞ (no loss) | 15 · ∞ (no loss) | – | 370 · 18.46 |
| 19:00 | 29684 · 0.94 | 8666 · 1.29 | 9070 · 0.84 | 2118 · 2.10 | 326 · 7.46 | 84 · 10.32 | 61 · 2.48 | – | 181 · 11.98 |
| 20:00 | 45008 · 2.71 | 14982 · 4.12 | 17218 · 2.48 | 3579 · 3.79 | 410 · 29.01 | 41 · 31.09 | 14 · ∞ (no loss) | – | 355 · 27.86 |
| 21:00 | 30525 · 2.47 | 8221 · 1.82 | 13229 · 5.57 | 2405 · 8.76 | 282 · 25.99 | 3 · ∞ (no loss) | 30 · ∞ (no loss) | – | 249 · 20.80 |
| 22:00 | 23700 · 1.15 | 5704 · 1.43 | 7279 · 2.23 | 1903 · 4.68 | 241 · 1.43 | 8 · 7.08 | 8 · ∞ (no loss) | – | 225 · 1.33 |
| 23:00 | 25420 · 0.59 | 7916 · 0.75 | 8776 · 0.54 | 2195 · 2.33 | 299 · 2.12 | 38 · 0.10 | 49 · 0.04 | – | 212 · 16.18 |
| 00:00 | 39948 · 0.99 | 11889 · 0.96 | 15297 · 1.23 | 4711 · 0.69 | 467 · 3.46 | 33 · 0.89 | 76 · 7.18 | – | 358 · 3.38 |
| 01:00 | 53586 · 1.06 | 13135 · 1.27 | 21887 · 1.29 | 2920 · 0.96 | 392 · 2.62 | 54 · 3.68 | 80 · 4.24 | – | 258 · 2.27 |
| 02:00 | 54401 · 1.23 | 16547 · 1.66 | 20293 · 2.21 | 5283 · 3.72 | 613 · 1.71 | 82 · 0.38 | 50 · 3.33 | – | 481 · 2.15 |
| **total** | **467074 · 1.02** | **130492 · 1.28** | **183429 · 1.22** | **35840 · 1.93** | **3927 · 3.77** | **420 · 1.63** | **644 · 2.93** | **–** | **2863 · 4.56** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 420 | 277 / 143 | 2.51 | 1.63 | $0.27 | 65.95 % | 2.75 |
| Trailing | 644 | 495 / 149 | 3.56 | 2.93 | $0.55 | 76.86 % | 1.75 |
| Signal · Normal | 1390 | 1157 / 233 | 2.88 | 2.90 | $2.41 | 83.24 % | 2.50 |
| Signal · Trailing | 1473 | 1264 / 209 | 11.15 | 13.20 | $3.22 | 85.81 % | 1.25 |
| total | 3927 | 3193 / 734 | 4.24 | 3.77 | $6.46 | 81.31 % | 1.50 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 2863 | 2421 / 442 | 4.52 | 4.56 | $5.64 | 84.56 % | 0.50 |
| of which Engine (no signals) | 1064 | 772 / 292 | 3.08 | 2.20 | $0.83 | 72.56 % | 1.75 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 24 | 0.28 | 0.98 | -$0.03 |
| 5m+ | 15 | 0.11 | 0.50 | -$0.02 |
| 15m | 3237 | 4.58 | 4.68 | $6.27 |
| 15m+ | 351 | 11.23 | 5.87 | $0.18 |
| 30m | 300 | 1.33 | 0.75 | $0.06 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 39 | 30 / 9 | 0.22 | 0.77 | -$0.04 | 76.92 % | 11.83 |
| Short | 711 | 568 / 143 | 3.38 | 2.97 | $0.57 | 79.89 % | 1.75 |
| General | 251 | 145 / 106 | 4.13 | 1.77 | $0.28 | 57.77 % | 2.00 |
| Long | 63 | 29 / 34 | 2.68 | 1.09 | $0.02 | 46.03 % | 3.25 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 2863 | 2421 / 442 | 4.52 | 4.56 | $5.64 | 84.56 % | 0.50 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 40007 | sig:duplicate 13086 · sig:confirm 10618 · sig:signalPf 9803 · sig:signalSide 4691 · sig:signalCluster 1809 |
| Short | 3490 | lastN 1732 · duplicate 825 · engineSide 637 · symPf 296 |
| Long | 2898 | lastN 1645 · engineSide 826 · duplicate 240 · symPf 187 |
| Micro | 2653 | crowd 1764 · engineSide 673 · lastN 108 · duplicate 74 · symPf 34 |
| General | 1883 | lastN 943 · duplicate 530 · engineSide 260 · symPf 150 |
| Wide | 506 | engineSide 332 · symPf 96 · lastN 78 |

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
| Micro | 2.47 | 0.77 | 0.31 | 0.22 | 0.29 | 39 |
| Short | 1.65 | 2.97 | 1.79 | 3.38 | 1.14 | 711 |
| General | 1.55 | 1.77 | 1.14 | 4.13 | 2.34 | 251 |
| Long | 1.49 | 1.09 | 0.73 | 2.68 | 2.45 | 63 |
| Wide | 1.68 | – | – | – | – | 0 |
| Signals | – | 4.56 | – | 4.52 | 0.99 | 2863 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (7136 of 126164 evaluated, 154687 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2111 units active at the run start, 2919 over the run, 3410 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 649 | 280 (43 %) | 1121 | 86 % | 0.91 | -28.15 |
| Micro | trailing | 598 | 458 (77 %) | 1730 | 70 % | 1.82 | 168.32 |
| Short | normal | 1058 | 502 (47 %) | 1151 | 71 % | 1.40 | 499.30 |
| Short | trailing | 1827 | 782 (43 %) | 2144 | 63 % | 0.99 | -23.68 |
| General | normal | 645 | 349 (54 %) | 787 | 62 % | 1.85 | 814.00 |
| General | trailing | 631 | 226 (36 %) | 759 | 52 % | 1.46 | 440.23 |
| Long | normal | 1004 | 475 (47 %) | 1140 | 57 % | 1.67 | 1409.30 |
| Long | trailing | 418 | 170 (41 %) | 454 | 68 % | 1.92 | 662.61 |
| Wide | axis | 306 | 66 (22 %) | 511 | 43 % | 0.62 | -134.12 |
| Signals | normal | 1712 | 1352 (79 %) | 12735 | 79 % | 1.87 | 15199.25 |
| Signals | trailing | 1698 | 1426 (84 %) | 13308 | 82 % | 2.42 | 16372.39 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1247 | 738 (59 %) | 2851 | 76 % | 1.26 | 140.17 |
| Short | active | 59 | 11 (19 %) | 46 | 24 % | 0.19 | -81.66 |
| Short | bollinger | 4 | 0 (0 %) | 16 | 63 % | 0.61 | -12.03 |
| Short | break | 353 | 68 (19 %) | 378 | 52 % | 0.66 | -204.67 |
| Short | channel | 31 | 7 (23 %) | 8 | 100 % | ∞ (no loss) | 20.00 |
| Short | direction | 374 | 210 (56 %) | 385 | 75 % | 1.85 | 184.56 |
| Short | ema | 560 | 340 (61 %) | 797 | 67 % | 0.87 | -98.02 |
| Short | ichimoku | 32 | 6 (19 %) | 51 | 41 % | 0.51 | -43.86 |
| Short | macd | 62 | 54 (87 %) | 133 | 83 % | 5.68 | 223.37 |
| Short | move | 333 | 114 (34 %) | 294 | 66 % | 1.98 | 166.47 |
| Short | osc | 133 | 92 (69 %) | 215 | 87 % | 4.43 | 340.33 |
| Short | rsi | 92 | 10 (11 %) | 74 | 31 % | 0.34 | -108.71 |
| Short | smooth | 293 | 0 (0 %) | 138 | 0 % | 0.00 | -536.20 |
| Short | trend | 466 | 368 (79 %) | 681 | 84 % | 5.44 | 850.49 |
| Short | volume | 93 | 4 (4 %) | 79 | 10 % | 0.06 | -224.44 |
| General | active | 30 | 0 (0 %) | 32 | 0 % | 0.00 | -102.30 |
| General | bollinger | 1 | 0 (0 %) | 7 | 43 % | 0.66 | -4.60 |
| General | break | 217 | 14 (6 %) | 105 | 44 % | 0.76 | -48.86 |
| General | channel | 18 | 6 (33 %) | 9 | 78 % | 2.29 | 11.32 |
| General | direction | 142 | 102 (72 %) | 194 | 61 % | 2.09 | 230.55 |
| General | ema | 250 | 177 (71 %) | 396 | 61 % | 2.39 | 504.61 |
| General | ichimoku | 18 | 11 (61 %) | 20 | 85 % | 5.00 | 42.39 |
| General | macd | 21 | 14 (67 %) | 34 | 62 % | 1.83 | 30.34 |
| General | move | 51 | 12 (24 %) | 57 | 58 % | 1.25 | 19.34 |
| General | osc | 126 | 63 (50 %) | 196 | 64 % | 1.92 | 200.33 |
| General | rsi | 6 | 1 (17 %) | 7 | 29 % | 0.39 | -13.40 |
| General | smooth | 145 | 4 (3 %) | 84 | 20 % | 0.19 | -194.16 |
| General | trend | 220 | 171 (78 %) | 377 | 69 % | 3.26 | 674.81 |
| General | volume | 31 | 0 (0 %) | 28 | 4 % | 0.02 | -96.14 |
| Long | active | 31 | 1 (3 %) | 38 | 5 % | 0.06 | -155.62 |
| Long | bollinger | 8 | 1 (13 %) | 4 | 75 % | 1.74 | 4.29 |
| Long | break | 285 | 17 (6 %) | 119 | 36 % | 0.62 | -125.80 |
| Long | channel | 17 | 12 (71 %) | 15 | 80 % | 2.65 | 23.08 |
| Long | direction | 158 | 128 (81 %) | 219 | 69 % | 3.03 | 547.57 |
| Long | ema | 213 | 198 (93 %) | 313 | 71 % | 3.57 | 899.97 |
| Long | ichimoku | 36 | 23 (64 %) | 26 | 88 % | 6.42 | 105.20 |
| Long | macd | 25 | 22 (88 %) | 22 | 100 % | ∞ (no loss) | 124.00 |
| Long | move | 117 | 33 (28 %) | 194 | 46 % | 0.66 | -201.20 |
| Long | osc | 103 | 63 (61 %) | 152 | 64 % | 1.89 | 179.93 |
| Long | rsi | 21 | 19 (90 %) | 29 | 83 % | 6.15 | 103.95 |
| Long | sar | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 178 | 6 (3 %) | 119 | 17 % | 0.29 | -267.15 |
| Long | trend | 206 | 119 (58 %) | 327 | 73 % | 3.11 | 856.82 |
| Long | volume | 22 | 3 (14 %) | 17 | 35 % | 0.60 | -23.13 |
| Wide | bollinger | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | break | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | channel | 18 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 18 | 9 (50 %) | 27 | 67 % | 0.69 | -10.77 |
| Wide | ema | 38 | 22 (58 %) | 65 | 68 % | 1.05 | 2.93 |
| Wide | ichimoku | 3 | 3 (100 %) | 33 | 45 % | 1.07 | 0.90 |
| Wide | macd | 30 | 9 (30 %) | 27 | 67 % | 0.69 | -10.77 |
| Wide | move | 75 | 3 (4 %) | 27 | 11 % | 0.07 | -33.63 |
| Wide | osc | 53 | 3 (6 %) | 291 | 32 % | 0.45 | -77.99 |
| Wide | rsi | 33 | 0 (0 %) | 6 | 50 % | 0.26 | -5.70 |
| Wide | smooth | 12 | 6 (50 %) | 18 | 67 % | 0.65 | -8.74 |
| Wide | trend | 10 | 10 (100 %) | 14 | 71 % | 2.72 | 9.08 |
| Wide | volume | 1 | 1 (100 %) | 3 | 67 % | 1.31 | 0.56 |
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

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 27236 | 18032 | 1247 | 0.95 | 4.00 | 75.83–163.33 (median 75.83) | 102 | 9544 | 475 | 2317 | 2662 | 292 | 1264 | 0 | 129 | 0 | 0 | 0 | 9204 |  |
| Short | 34764 | 30336 | 2885 | 1.38 | 2.63 | 163.33–163.33 (median 163.33) | 4058 | 4912 | 1119 | 5821 | 3237 | 1853 | 5748 | 27 | 676 | 0 | 0 | 0 | 4428 |  |
| General | 14151 | 12511 | 1276 | 1.37 | 2.40 | 163.33–163.33 (median 163.33) | 1260 | 1832 | 503 | 2341 | 1142 | 853 | 2930 | 0 | 348 | 26 | 0 | 0 | 1640 |  |
| Long | 22515 | 20465 | 1422 | 1.25 | 2.34 | 163.33–163.33 (median 163.33) | 1829 | 3951 | 1117 | 4329 | 2350 | 1334 | 3462 | 0 | 611 | 60 | 0 | 0 | 2050 |  |
| Wide | 56021 | 44820 | 306 | 0.72 | 2.82 | 18.00–163.33 (median 163.33) | 12669 | 24099 | 927 | 4001 | 1101 | 376 | 1101 | 0 | 197 | 43 | 0 | 8456 | 2745 |  |
| Signals | 3780 | – | 2111 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2111 units (pair × symbol × direction) active at the run start, 2919 over the run; 3410 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 9108 | 2054 (23 %) | 39200 | 70 % | 0.44 | -9614.70 |
| Micro | trailing | 18128 | 4386 (24 %) | 79860 | 61 % | 0.46 | -15706.22 |
| Short | normal | 11567 | 5067 (44 %) | 25329 | 65 % | 1.19 | 5457.40 |
| Short | trailing | 23197 | 9982 (43 %) | 54251 | 61 % | 1.08 | 4199.21 |
| General | normal | 8486 | 3765 (44 %) | 18692 | 50 % | 1.26 | 7005.90 |
| General | trailing | 5665 | 2349 (41 %) | 11532 | 61 % | 1.32 | 4838.67 |
| Long | normal | 13512 | 5628 (42 %) | 23261 | 49 % | 1.30 | 14099.80 |
| Long | trailing | 9003 | 4030 (45 %) | 15056 | 67 % | 1.36 | 9161.55 |
| Wide | axis | 47565 | 7794 (16 %) | 130911 | 28 % | 0.49 | -61576.01 |
| Wide | dca | 4228 | 1646 (39 %) | 13512 | 66 % | 0.82 | -3598.18 |
| Wide | dca-active | 4228 | 616 (15 %) | 8730 | 32 % | 0.60 | -3180.22 |
| Signals | normal | 1890 | 1520 (80 %) | 24010 | 77 % | 1.78 | 27075.75 |
| Signals | trailing | 1890 | 1594 (84 %) | 22730 | 81 % | 2.45 | 28724.39 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1247 | 738 (59 %) | 2851 | 76 % | 1.26 | 140.17 |
| Short | active | 59 | 11 (19 %) | 46 | 24 % | 0.19 | -81.66 |
| Short | bollinger | 4 | 0 (0 %) | 16 | 63 % | 0.61 | -12.03 |
| Short | break | 353 | 68 (19 %) | 378 | 52 % | 0.66 | -204.67 |
| Short | channel | 31 | 7 (23 %) | 8 | 100 % | ∞ (no loss) | 20.00 |
| Short | direction | 374 | 210 (56 %) | 385 | 75 % | 1.85 | 184.56 |
| Short | ema | 560 | 340 (61 %) | 797 | 67 % | 0.87 | -98.02 |
| Short | ichimoku | 32 | 6 (19 %) | 51 | 41 % | 0.51 | -43.86 |
| Short | macd | 62 | 54 (87 %) | 133 | 83 % | 5.68 | 223.37 |
| Short | move | 333 | 114 (34 %) | 294 | 66 % | 1.98 | 166.47 |
| Short | osc | 133 | 92 (69 %) | 215 | 87 % | 4.43 | 340.33 |
| Short | rsi | 92 | 10 (11 %) | 74 | 31 % | 0.34 | -108.71 |
| Short | smooth | 293 | 0 (0 %) | 138 | 0 % | 0.00 | -536.20 |
| Short | trend | 466 | 368 (79 %) | 681 | 84 % | 5.44 | 850.49 |
| Short | volume | 93 | 4 (4 %) | 79 | 10 % | 0.06 | -224.44 |
| General | active | 30 | 0 (0 %) | 32 | 0 % | 0.00 | -102.30 |
| General | bollinger | 1 | 0 (0 %) | 7 | 43 % | 0.66 | -4.60 |
| General | break | 217 | 14 (6 %) | 105 | 44 % | 0.76 | -48.86 |
| General | channel | 18 | 6 (33 %) | 9 | 78 % | 2.29 | 11.32 |
| General | direction | 142 | 102 (72 %) | 194 | 61 % | 2.09 | 230.55 |
| General | ema | 250 | 177 (71 %) | 396 | 61 % | 2.39 | 504.61 |
| General | ichimoku | 18 | 11 (61 %) | 20 | 85 % | 5.00 | 42.39 |
| General | macd | 21 | 14 (67 %) | 34 | 62 % | 1.83 | 30.34 |
| General | move | 51 | 12 (24 %) | 57 | 58 % | 1.25 | 19.34 |
| General | osc | 126 | 63 (50 %) | 196 | 64 % | 1.92 | 200.33 |
| General | rsi | 6 | 1 (17 %) | 7 | 29 % | 0.39 | -13.40 |
| General | smooth | 145 | 4 (3 %) | 84 | 20 % | 0.19 | -194.16 |
| General | trend | 220 | 171 (78 %) | 377 | 69 % | 3.26 | 674.81 |
| General | volume | 31 | 0 (0 %) | 28 | 4 % | 0.02 | -96.14 |
| Long | active | 31 | 1 (3 %) | 38 | 5 % | 0.06 | -155.62 |
| Long | bollinger | 8 | 1 (13 %) | 4 | 75 % | 1.74 | 4.29 |
| Long | break | 285 | 17 (6 %) | 119 | 36 % | 0.62 | -125.80 |
| Long | channel | 17 | 12 (71 %) | 15 | 80 % | 2.65 | 23.08 |
| Long | direction | 158 | 128 (81 %) | 219 | 69 % | 3.03 | 547.57 |
| Long | ema | 213 | 198 (93 %) | 313 | 71 % | 3.57 | 899.97 |
| Long | ichimoku | 36 | 23 (64 %) | 26 | 88 % | 6.42 | 105.20 |
| Long | macd | 25 | 22 (88 %) | 22 | 100 % | ∞ (no loss) | 124.00 |
| Long | move | 117 | 33 (28 %) | 194 | 46 % | 0.66 | -201.20 |
| Long | osc | 103 | 63 (61 %) | 152 | 64 % | 1.89 | 179.93 |
| Long | rsi | 21 | 19 (90 %) | 29 | 83 % | 6.15 | 103.95 |
| Long | sar | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | smooth | 178 | 6 (3 %) | 119 | 17 % | 0.29 | -267.15 |
| Long | trend | 206 | 119 (58 %) | 327 | 73 % | 3.11 | 856.82 |
| Long | volume | 22 | 3 (14 %) | 17 | 35 % | 0.60 | -23.13 |
| Wide | bollinger | 12 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | break | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | channel | 18 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | direction | 18 | 9 (50 %) | 27 | 67 % | 0.69 | -10.77 |
| Wide | ema | 38 | 22 (58 %) | 65 | 68 % | 1.05 | 2.93 |
| Wide | ichimoku | 3 | 3 (100 %) | 33 | 45 % | 1.07 | 0.90 |
| Wide | macd | 30 | 9 (30 %) | 27 | 67 % | 0.69 | -10.77 |
| Wide | move | 75 | 3 (4 %) | 27 | 11 % | 0.07 | -33.63 |
| Wide | osc | 53 | 3 (6 %) | 291 | 32 % | 0.45 | -77.99 |
| Wide | rsi | 33 | 0 (0 %) | 6 | 50 % | 0.26 | -5.70 |
| Wide | smooth | 12 | 6 (50 %) | 18 | 67 % | 0.65 | -8.74 |
| Wide | trend | 10 | 10 (100 %) | 14 | 71 % | 2.72 | 9.08 |
| Wide | volume | 1 | 1 (100 %) | 3 | 67 % | 1.31 | 0.56 |
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
| Micro | 1.1 | 30 | 26 (87 %) | 220 | 87 % | 3.71 | 54.22 |
| Micro | 1.25 | 30 | 26 (87 %) | 220 | 87 % | 3.71 | 54.22 |
| Micro | 1.35 | 30 | 26 (87 %) | 220 | 87 % | 3.71 | 54.22 |
| Micro | 1.5 | 22 | 22 (100 %) | 164 | 87 % | 9.82 | 49.32 |
| Micro | 1.75 | 14 | 14 (100 %) | 108 | 87 % | 49.20 | 34.45 |
| Micro | 2 | 4 | 4 (100 %) | 32 | 88 % | 53.66 | 9.62 |
| Short | 1.1 | 425 | 255 (60 %) | 1103 | 68 % | 1.42 | 441.77 |
| Short | 1.25 | 407 | 243 (60 %) | 1030 | 68 % | 1.40 | 400.32 |
| Short | 1.35 | 394 | 234 (59 %) | 989 | 67 % | 1.40 | 382.11 |
| Short | 1.5 | 309 | 175 (57 %) | 772 | 66 % | 1.33 | 259.68 |
| Short | 1.75 | 183 | 100 (55 %) | 464 | 64 % | 1.13 | 63.90 |
| Short | 2 | 89 | 44 (49 %) | 218 | 60 % | 1.04 | 9.57 |
| General | 1.1 | 281 | 143 (51 %) | 686 | 56 % | 1.34 | 314.13 |
| General | 1.25 | 262 | 135 (52 %) | 620 | 55 % | 1.36 | 298.72 |
| General | 1.35 | 236 | 125 (53 %) | 546 | 56 % | 1.39 | 276.25 |
| General | 1.5 | 193 | 107 (55 %) | 434 | 56 % | 1.49 | 265.69 |
| General | 1.75 | 102 | 54 (53 %) | 207 | 56 % | 1.33 | 92.22 |
| General | 2 | 37 | 18 (49 %) | 67 | 58 % | 1.21 | 20.47 |
| Long | 1.1 | 379 | 216 (57 %) | 911 | 53 % | 1.17 | 319.74 |
| Long | 1.25 | 343 | 202 (59 %) | 821 | 53 % | 1.19 | 316.20 |
| Long | 1.35 | 308 | 188 (61 %) | 719 | 53 % | 1.20 | 303.41 |
| Long | 1.5 | 250 | 158 (63 %) | 558 | 55 % | 1.25 | 282.56 |
| Long | 1.75 | 137 | 92 (67 %) | 316 | 53 % | 1.14 | 97.53 |
| Long | 2 | 59 | 42 (71 %) | 159 | 51 % | 1.07 | 25.08 |
| Signals | 1.1 | 863 | 688 (80 %) | 8358 | 81 % | 2.05 | 9325.86 |
| Signals | 1.25 | 498 | 396 (80 %) | 5456 | 82 % | 2.13 | 5955.35 |
| Signals | 1.35 | 358 | 284 (79 %) | 4129 | 82 % | 2.26 | 4585.79 |
| Signals | 1.5 | 221 | 184 (83 %) | 2799 | 83 % | 2.43 | 3148.89 |
| Signals | 1.75 | 107 | 97 (91 %) | 1554 | 83 % | 2.72 | 1766.96 |
| Signals | 2 | 50 | 48 (96 %) | 815 | 84 % | 3.08 | 917.39 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | sweep | mc-rsi5-10@m5 | 246 | 224 (91 %) | 984 | 82 % | 3.26 | 162.86 | – |
| Micro | follow | mc-tpull-8@m5c | 170 | 154 (91 %) | 680 | 77 % | 4.52 | 129.83 | – |
| Micro | ribbon | mc-lag-12@m30 | 146 | 146 (100 %) | 146 | 100 % | ∞ (no loss) | 49.60 | – |
| Micro | sweep | mc-rsi5-15@m5 | 20 | 16 (80 %) | 140 | 87 % | 2.52 | 29.55 | tp0.55 sl2.0625 tr0 h192 mc (7 · ∞ (no loss) · 2.45) |
| Micro | sweep | mc-rsi7-20@m5 | 10 | 10 (100 %) | 80 | 88 % | 47.37 | 24.67 | tp0.6 sl1.8 tr0.45 h192 mc (8 · 33.59 · 2.72) |
| Micro | sweep | mc-rsi3-10@m5c | 32 | 32 (100 %) | 128 | 100 % | ∞ (no loss) | 20.80 | – |
| Micro | sweep | mc-rsi14-25@m5c | 8 | 8 (100 %) | 32 | 100 % | ∞ (no loss) | 12.80 | – |
| Micro | sandwich | mc-rsi2-5@m5 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 7.30 | – |
| Micro | snap | mc-rsi2-5@m5 | 52 | 52 (100 %) | 52 | 100 % | ∞ (no loss) | 7.00 | – |
| Micro | sandwich | mc-ibrk@m5 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 2.55 | – |
| Micro | pulse | mc-ibrk@m5 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 2.55 | – |
| Micro | sweep | mc-rsi9-20@m5 | 12 | 8 (67 %) | 64 | 75 % | 1.16 | 2.52 | tp0.6 sl2.85 tr0.45 h192 mc (5 · 19.19 · 1.52) |
| Micro | clamp | mc-rsi2-5@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 2.30 | – |
| Micro | sweep | mc-rsi7-20@m5c | 8 | 4 (50 %) | 40 | 80 % | 1.00 | -0.03 | tp0.6 sl2.85 tr0.45 h192 mc (5 · 19.19 · 1.52) |
| Micro | sweep | mc-rsi5-15@m5c | 12 | 8 (67 %) | 48 | 75 % | 0.97 | -0.41 | – |
| Micro | magnet | mc-tstreak-4@m5 | 20 | 12 (60 %) | 60 | 30 % | 0.81 | -1.17 | – |
| Micro | sweep | mc-rsi7-25@m5c | 8 | 4 (50 %) | 56 | 71 % | 0.87 | -2.25 | tp0.6 sl2.85 tr0.3 h192 mc (7 · 1.63 · 0.65) |
| Micro | sweep | mc-rsi7-15@m5 | 12 | 8 (67 %) | 52 | 69 % | 0.85 | -2.28 | tp0.6 sl2.85 tr0.3 h192 mc (5 · 1.38 · 0.24) |
| Micro | sweep | mc-rsi14-25@m5 | 6 | 0 (0 %) | 42 | 71 % | 0.48 | -13.03 | tp0.6 sl2.85 tr0.45 h192 mc (7 · 0.64 · -1.13) |
| Micro | ribbon | mc-rsi3-10@m5c | 48 | 0 (0 %) | 96 | 0 % | 0.00 | -146.52 | – |
| Micro | pivot | mc-rsi3-10@m5c | 48 | 0 (0 %) | 96 | 0 % | 0.00 | -146.52 | – |
| Short | ribbon | r-chand-m@m15 | 70 | 64 (91 %) | 196 | 86 % | 5.06 | 214.86 | – |
| Short | pivot | macd-hist-5-35-5@m30 | 40 | 40 (100 %) | 80 | 100 % | ∞ (no loss) | 209.72 | – |
| Short | ribbon | willr-28-95@m15 | 33 | 33 (100 %) | 68 | 97 % | 507.51 | 151.17 | – |
| Short | sweep | willr-21-95@m15 | 21 | 21 (100 %) | 44 | 95 % | 25.28 | 116.52 | – |
| Short | ribbon | trend-st-14-4@m15c | 17 | 17 (100 %) | 49 | 92 % | 187.10 | 107.90 | – |
| Short | ribbon | r-chand@m15 | 66 | 58 (88 %) | 66 | 88 % | 7.26 | 107.60 | – |
| Short | ribbon | trend-ema-20-50@m15c | 52 | 36 (69 %) | 36 | 100 % | ∞ (no loss) | 88.94 | – |
| Short | ribbon | trend-ema-20-50@m15 | 52 | 36 (69 %) | 36 | 100 % | ∞ (no loss) | 88.94 | – |
| Short | sweep | break-squeeze-30@m30 | 11 | 11 (100 %) | 41 | 100 % | ∞ (no loss) | 72.37 | – |
| Short | ribbon | trend-ribbon@m15 | 75 | 69 (92 %) | 75 | 92 % | 81.45 | 67.72 | – |
| Short | ribbon | dir-emax@m15 | 75 | 69 (92 %) | 75 | 92 % | 81.45 | 67.72 | – |
| Short | ribbon | dir-emax@m15c | 75 | 69 (92 %) | 75 | 92 % | 81.45 | 67.72 | – |
| Short | ribbon | ema-9-21@m15 | 75 | 69 (92 %) | 75 | 92 % | 81.45 | 67.72 | – |
| Short | ribbon | ema-9-21@m15c | 75 | 69 (92 %) | 75 | 92 % | 81.45 | 67.72 | – |
| Short | pulse | ema-slope@m15c | 65 | 60 (92 %) | 65 | 92 % | 94.37 | 65.49 | – |
| Short | revert | r-star@m30 | 21 | 18 (86 %) | 42 | 93 % | 5.71 | 60.72 | – |
| Short | sandwich | trend-st-14-4@m15 | 44 | 38 (86 %) | 44 | 86 % | 63.89 | 52.93 | – |
| Short | pulse | trend-st-14-4@m15 | 44 | 38 (86 %) | 44 | 86 % | 63.89 | 52.93 | – |
| Short | pulse | ema-slope-34@m15 | 45 | 39 (87 %) | 45 | 87 % | 60.56 | 50.13 | – |
| Short | pulse | ema-slope-34@m15c | 45 | 39 (87 %) | 45 | 87 % | 60.56 | 50.13 | – |
| Short | sweep | break-squeeze@m30 | 10 | 10 (100 %) | 19 | 89 % | 218.62 | 45.72 | – |
| Short | pivot | trend-st-14-4@m15c | 2 | 2 (100 %) | 18 | 94 % | 290.66 | 40.64 | tp2.8 sl5.6 tr2.1 h64 sh (9 · 146.12 · 20.36) |
| Short | clamp | r-session-trend-m@m15c | 32 | 30 (94 %) | 66 | 73 % | 1.89 | 40.23 | – |
| Short | sweep | r-td-m@m15 | 24 | 18 (75 %) | 24 | 75 % | 14.01 | 37.52 | – |
| Short | pivot | move-impulse-20-2.5@m15c | 6 | 6 (100 %) | 19 | 95 % | 263.75 | 36.86 | – |
| Short | sweep | r-pin-m@m15 | 12 | 12 (100 %) | 24 | 92 % | 1152.81 | 33.10 | – |
| Short | ribbon | move-cont@m30 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 32.80 | – |
| Short | ribbon | ema-slope@m15 | 18 | 16 (89 %) | 44 | 77 % | 2.47 | 26.81 | – |
| Short | ribbon | r-td@m30 | 15 | 15 (100 %) | 28 | 96 % | 266.15 | 26.46 | – |
| Short | ribbon | willr-50-95@m15 | 6 | 6 (100 %) | 18 | 89 % | 6.77 | 25.40 | – |
| Short | ribbon | trend-st-14-4@m15 | 3 | 3 (100 %) | 13 | 85 % | 107.79 | 24.55 | tp1.8 sl3.6 tr0 h96 sh (5 · ∞ (no loss) · 8.00) |
| Short | pivot | trend-st-14-4@m15 | 1 | 1 (100 %) | 11 | 91 % | 173.14 | 24.15 | tp2.8 sl5.6 tr2.1 h64 sh (11 · 173.14 · 24.15) |
| Short | clamp | rsi-mid-60-40@m30 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 23.60 | – |
| Short | pivot | willr-28-95@m15 | 14 | 14 (100 %) | 16 | 88 % | 72.84 | 21.44 | – |
| Short | ribbon | ema-slope@m15c | 14 | 12 (86 %) | 36 | 72 % | 2.15 | 21.00 | – |
| Short | sweep | r-session-trend@m15 | 5 | 5 (100 %) | 15 | 93 % | 986.73 | 20.03 | – |
| Short | pulse | dir-emax@m15 | 13 | 10 (77 %) | 13 | 77 % | 47.44 | 19.55 | – |
| Short | pulse | dir-emax@m15c | 13 | 10 (77 %) | 13 | 77 % | 47.44 | 19.55 | – |
| Short | pulse | ema-9-21@m15 | 13 | 10 (77 %) | 13 | 77 % | 47.44 | 19.55 | – |
| Short | pulse | ema-9-21@m15c | 13 | 10 (77 %) | 13 | 77 % | 47.44 | 19.55 | – |
| Short | sweep | break-squeeze-t25@m30 | 4 | 4 (100 %) | 7 | 71 % | 93.75 | 19.49 | – |
| Short | ribbon | willr-28-95@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 17.53 | – |
| Short | ribbon | dir-vwap@m15c | 5 | 5 (100 %) | 9 | 100 % | ∞ (no loss) | 15.24 | – |
| Short | sweep | r-linreg@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 14.80 | – |
| Short | ribbon | dir-vwap-240@m15c | 4 | 3 (75 %) | 36 | 67 % | 1.49 | 13.24 | tp2.8 sl2.8 tr2.1 h96 sh (9 · 2.31 · 8.04) |
| Short | revert | r-stc-m@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 12.43 | – |
| Short | ribbon | ichi-cloud-9@m15 | 7 | 5 (71 %) | 7 | 71 % | 37.69 | 10.29 | – |
| Short | sweep | willr-7-90@m30 | 7 | 6 (86 %) | 28 | 71 % | 1.26 | 10.17 | – |
| Short | sandwich | ema-slope-100@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 7.76 | – |
| Short | pulse | ema-slope-100@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 7.76 | – |
| Short | pivot | willr-7-90@m30 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 7.61 | – |
| Short | ribbon | move-impulse-20-2.5@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 5.78 | – |
| Short | sweep | macd-hist@m15c | 10 | 5 (50 %) | 35 | 54 % | 1.12 | 4.69 | – |
| Short | ribbon | ema-slope-100@m15 | 2 | 2 (100 %) | 10 | 80 % | 1.40 | 2.73 | tp2.6 sl2.6 tr1.95 h64 sh (5 · 1.72 · 2.02) |
| Short | clamp | move-impulse-20-2.5@m15c | 3 | 3 (100 %) | 12 | 67 % | 1.21 | 2.65 | – |
| Short | sweep | break-vol-1.3@m15 | 18 | 11 (61 %) | 54 | 48 % | 1.02 | 1.56 | – |
| Short | sweep | break-vol-2@m15 | 17 | 8 (47 %) | 17 | 47 % | 1.04 | 0.76 | – |
| Short | ribbon | macd-zero@m15 | 4 | 2 (50 %) | 8 | 50 % | 0.61 | -1.85 | – |
| Short | ribbon | dir-emax-12-26@m15 | 4 | 2 (50 %) | 8 | 50 % | 0.61 | -1.85 | – |
| Short | pivot | break-don40@m15 | 3 | 1 (33 %) | 9 | 67 % | 0.84 | -2.13 | – |
| Short | sweep | rsi-fast@m15 | 1 | 0 (0 %) | 5 | 60 % | 0.72 | -2.33 | tp2.6 sl3.9 tr1.3 h64 sh (5 · 0.72 · -2.33) |
| Short | sweep | willr-28-95@m30 | 5 | 1 (20 %) | 11 | 55 % | 0.82 | -2.79 | – |
| Short | revert | r-pdhl@m15c | 6 | 4 (67 %) | 12 | 67 % | 0.68 | -2.99 | – |
| Short | revert | r-klinger@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.57 | -3.08 | – |
| Short | sweep | r-elder@m30 | 16 | 0 (0 %) | 14 | 0 % | 0.00 | -3.55 | – |
| Short | pivot | r-fakeout@m30 | 62 | 20 (32 %) | 62 | 32 % | 0.90 | -3.86 | – |
| Short | ribbon | trend-st-21-5@m15 | 8 | 4 (50 %) | 65 | 54 % | 0.91 | -8.23 | tp2.2 sl3.3 tr1.1 h96 sh (9 · 1.11 · 1.29) |
| Short | ribbon | r-pin@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.47 | -8.83 | – |
| Short | sweep | bb-bounce-50-2@m15c | 2 | 0 (0 %) | 16 | 63 % | 0.61 | -12.03 | tp2.4 sl4.8 tr0 h64 sh (8 · 0.73 · -4.00) |
| Short | sweep | z-50-2@m15c | 2 | 0 (0 %) | 16 | 63 % | 0.61 | -12.03 | tp2.4 sl4.8 tr0 h64 sh (8 · 0.73 · -4.00) |
| Short | ribbon | trend-st-21-5@m15c | 2 | 0 (0 %) | 11 | 45 % | 0.38 | -12.58 | tp2.6 sl3.9 tr1.95 h96 sh (5 · 0.29 · -5.78) |
| Short | pivot | rsi-div@m30 | 45 | 0 (0 %) | 5 | 0 % | 0.00 | -13.40 | – |
| Short | sweep | break-vol@m15 | 28 | 9 (32 %) | 28 | 32 % | 0.58 | -14.76 | – |
| Short | clamp | break-don10@m15c | 3 | 0 (0 %) | 11 | 55 % | 0.36 | -14.86 | – |
| Short | ribbon | dir-thrust@m30 | 2 | 0 (0 %) | 11 | 27 % | 0.13 | -27.54 | tp2.2 sl3.3 tr1.65 h32 sh (6 · 0.16 · -11.73) |
| Short | sandwich | dir-emax@m15 | 13 | 0 (0 %) | 26 | 38 % | 0.39 | -31.65 | – |
| Short | sandwich | dir-emax@m15c | 13 | 0 (0 %) | 26 | 38 % | 0.39 | -31.65 | – |
| Short | sandwich | ema-9-21@m15 | 13 | 0 (0 %) | 26 | 38 % | 0.39 | -31.65 | – |
| Short | sandwich | ema-9-21@m15c | 13 | 0 (0 %) | 26 | 38 % | 0.39 | -31.65 | – |
| Short | ribbon | ichi-cloud-20@m15c | 17 | 1 (6 %) | 42 | 38 % | 0.42 | -47.25 | – |
| Short | follow | r-pin-m@m15 | 7 | 0 (0 %) | 49 | 37 % | 0.35 | -56.73 | tp2.8 sl5.6 tr1.4 h64 sh (7 · 0.55 · -5.30) |
| Short | clamp | rsi-mid-60-40@m15 | 20 | 0 (0 %) | 14 | 0 % | 0.00 | -57.40 | – |
| Short | sweep | rsi-7-15-85@m30 | 10 | 0 (0 %) | 40 | 25 % | 0.32 | -59.18 | – |
| Short | pivot | break-vol@m15 | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -62.80 | – |
| Short | follow | r-bos-m@m30 | 5 | 0 (0 %) | 57 | 47 % | 0.38 | -66.81 | tp2 sl3 tr1 h32 sh (12 · 0.41 · -11.29) |
| Short | clamp | act-burst-2.5@m30 | 43 | 11 (26 %) | 43 | 26 % | 0.21 | -68.46 | – |
| Short | revert | r-pdhl-m@m15c | 16 | 4 (25 %) | 44 | 41 % | 0.16 | -79.34 | – |
| Short | revert | r-pdhl@m30 | 7 | 0 (0 %) | 58 | 34 % | 0.23 | -109.94 | tp2.2 sl3.3 tr1.65 h32 sh (8 · 0.34 · -11.48) |
| Short | sandwich | ema-slope-34@m15 | 45 | 0 (0 %) | 90 | 43 % | 0.29 | -122.07 | – |
| Short | sandwich | ema-slope-34@m15c | 45 | 0 (0 %) | 90 | 43 % | 0.29 | -122.07 | – |
| Short | sandwich | ema-slope@m15c | 65 | 0 (0 %) | 130 | 46 % | 0.25 | -196.91 | – |
| Short | sweep | mfi-14-10@m30 | 73 | 0 (0 %) | 66 | 0 % | 0.00 | -228.84 | – |
| Short | sandwich | hma-55@m15 | 69 | 0 (0 %) | 69 | 0 % | 0.00 | -268.10 | – |
| Short | sandwich | hma-55@m15c | 69 | 0 (0 %) | 69 | 0 % | 0.00 | -268.10 | – |
| General | ribbon | r-chand-m@m15 | 33 | 30 (91 %) | 85 | 72 % | 4.56 | 187.48 | – |
| General | ribbon | willr-28-95@m15 | 28 | 28 (100 %) | 58 | 93 % | 23.63 | 176.55 | – |
| General | ribbon | trend-ribbon@m15 | 36 | 32 (89 %) | 36 | 89 % | 240.83 | 134.58 | – |
| General | ribbon | dir-emax@m15 | 36 | 32 (89 %) | 36 | 89 % | 240.83 | 134.58 | – |
| General | ribbon | dir-emax@m15c | 36 | 32 (89 %) | 36 | 89 % | 240.83 | 134.58 | – |
| General | ribbon | ema-9-21@m15 | 36 | 32 (89 %) | 36 | 89 % | 240.83 | 134.58 | – |
| General | ribbon | ema-9-21@m15c | 36 | 32 (89 %) | 36 | 89 % | 240.83 | 134.58 | – |
| General | ribbon | trend-st-14-4@m15c | 12 | 12 (100 %) | 27 | 78 % | 25.24 | 92.43 | – |
| General | sandwich | trend-st-14-4@m15 | 24 | 20 (83 %) | 24 | 83 % | 123.86 | 68.95 | – |
| General | pulse | trend-st-14-4@m15 | 24 | 20 (83 %) | 24 | 83 % | 123.86 | 68.95 | – |
| General | ribbon | trend-ema-20-50@m15c | 26 | 19 (73 %) | 19 | 100 % | ∞ (no loss) | 67.00 | – |
| General | ribbon | trend-ema-20-50@m15 | 26 | 19 (73 %) | 19 | 100 % | ∞ (no loss) | 67.00 | – |
| General | ribbon | ema-slope@m15 | 18 | 14 (78 %) | 42 | 67 % | 3.40 | 60.31 | – |
| General | ribbon | ema-slope@m15c | 16 | 13 (81 %) | 40 | 65 % | 2.88 | 59.83 | – |
| General | sweep | break-squeeze-30@m30 | 5 | 5 (100 %) | 15 | 100 % | ∞ (no loss) | 57.00 | – |
| General | pulse | ema-slope@m15c | 18 | 14 (78 %) | 18 | 78 % | 86.09 | 47.75 | – |
| General | pulse | ema-slope-34@m15 | 18 | 14 (78 %) | 18 | 78 % | 86.09 | 47.75 | – |
| General | pulse | ema-slope-34@m15c | 18 | 14 (78 %) | 18 | 78 % | 86.09 | 47.75 | – |
| General | ribbon | ichi-cloud-9@m15 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 45.08 | – |
| General | ribbon | r-chand@m15 | 14 | 13 (93 %) | 14 | 93 % | 23.10 | 44.20 | – |
| General | sweep | willr-21-95@m15 | 7 | 6 (86 %) | 15 | 87 % | 12.32 | 40.75 | – |
| General | sweep | break-don40@m15 | 4 | 4 (100 %) | 26 | 73 % | 2.57 | 37.78 | tp3.6 sl3.6 tr1.8 h96 gn (7 · 4.15 · 11.98) |
| General | ribbon | willr-28-95@m15c | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 33.89 | – |
| General | pivot | macd-hist-5-35-5@m30 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 23.34 | – |
| General | sweep | r-spring-m@m30 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 20.20 | – |
| General | pulse | dir-emax@m15 | 7 | 5 (71 %) | 7 | 71 % | 67.66 | 18.70 | – |
| General | pulse | dir-emax@m15c | 7 | 5 (71 %) | 7 | 71 % | 67.66 | 18.70 | – |
| General | pulse | ema-9-21@m15 | 7 | 5 (71 %) | 7 | 71 % | 67.66 | 18.70 | – |
| General | pulse | ema-9-21@m15c | 7 | 5 (71 %) | 7 | 71 % | 67.66 | 18.70 | – |
| General | clamp | r-session-trend-m@m15c | 8 | 8 (100 %) | 9 | 89 % | 9.43 | 16.85 | – |
| General | follow | r-chand-m@m15c | 2 | 2 (100 %) | 10 | 70 % | 2.88 | 16.13 | tp3.6 sl3.6 tr2.7 h96 gn (5 · 3.19 · 8.33) |
| General | ribbon | trix-15@m15c | 6 | 4 (67 %) | 26 | 65 % | 1.48 | 15.04 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 2.62 · 5.52) |
| General | sweep | r-pin-m@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 13.62 | – |
| General | revert | r-star@m30 | 10 | 4 (40 %) | 20 | 70 % | 1.38 | 9.91 | – |
| General | ribbon | ema-slope-200@m15c | 2 | 2 (100 %) | 18 | 56 % | 1.35 | 5.93 | tp4 sl4 tr2 h64 gn (9 · 1.35 · 2.96) |
| General | ribbon | macd-zero@m15 | 4 | 4 (100 %) | 8 | 50 % | 1.38 | 3.50 | – |
| General | ribbon | dir-emax-12-26@m15 | 4 | 4 (100 %) | 8 | 50 % | 1.38 | 3.50 | – |
| General | ribbon | macd-zero@m15c | 4 | 4 (100 %) | 8 | 50 % | 1.38 | 3.50 | – |
| General | ribbon | dir-emax-12-26@m15c | 4 | 4 (100 %) | 8 | 50 % | 1.38 | 3.50 | – |
| General | revert | r-ultimate@m30 | 4 | 2 (50 %) | 16 | 50 % | 1.04 | 1.20 | – |
| General | sweep | willr-21-95@m30 | 5 | 2 (40 %) | 10 | 50 % | 1.00 | -0.00 | – |
| General | sweep | macd-hist@m15c | 5 | 2 (40 %) | 10 | 50 % | 1.00 | -0.00 | – |
| General | ribbon | ema-slope-100@m15 | 2 | 0 (0 %) | 8 | 50 % | 0.90 | -1.60 | – |
| General | ribbon | ichi-cloud-20@m15c | 3 | 0 (0 %) | 9 | 67 % | 0.75 | -2.69 | – |
| General | follow | r-bb-adx@m30 | 1 | 0 (0 %) | 7 | 43 % | 0.66 | -4.60 | tp3.2 sl3.2 tr0 h48 gn (7 · 0.66 · -4.60) |
| General | sandwich | dir-emax@m15 | 7 | 3 (43 %) | 14 | 36 % | 0.74 | -6.60 | – |
| General | sandwich | dir-emax@m15c | 7 | 3 (43 %) | 14 | 36 % | 0.74 | -6.60 | – |
| General | sandwich | ema-9-21@m15 | 7 | 3 (43 %) | 14 | 36 % | 0.74 | -6.60 | – |
| General | sandwich | ema-9-21@m15c | 7 | 3 (43 %) | 14 | 36 % | 0.74 | -6.60 | – |
| General | pivot | break-don40@m15 | 4 | 0 (0 %) | 9 | 44 % | 0.55 | -8.04 | – |
| General | ribbon | trend-st-21-5@m15c | 10 | 4 (40 %) | 47 | 40 % | 0.87 | -10.66 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 1.30 · 2.03) |
| General | sweep | willr-28-95@m30 | 24 | 9 (38 %) | 45 | 40 % | 0.85 | -11.50 | – |
| General | sweep | willr-7-90@m30 | 5 | 0 (0 %) | 20 | 45 % | 0.56 | -14.48 | – |
| General | sandwich | ema-slope@m15c | 18 | 8 (44 %) | 36 | 39 % | 0.76 | -15.35 | – |
| General | sandwich | ema-slope-34@m15 | 18 | 8 (44 %) | 36 | 39 % | 0.76 | -15.35 | – |
| General | sandwich | ema-slope-34@m15c | 18 | 8 (44 %) | 36 | 39 % | 0.76 | -15.35 | – |
| General | revert | r-pdhl-m@m15c | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -15.39 | – |
| General | revert | ema-50-100@m30 | 2 | 0 (0 %) | 10 | 20 % | 0.30 | -18.80 | tp4 sl3 tr0 h48 gn (5 · 0.30 · -9.00) |
| General | ribbon | dir-vwap-120@m15c | 7 | 0 (0 %) | 13 | 23 % | 0.36 | -20.29 | – |
| General | follow | r-pin-m@m15 | 2 | 0 (0 %) | 14 | 29 % | 0.35 | -22.00 | tp3.2 sl3.2 tr0 h64 gn (7 · 0.35 · -11.00) |
| General | revert | r-roofing@m15 | 3 | 0 (0 %) | 18 | 39 % | 0.37 | -23.43 | tp4.4 sl4.4 tr2.2 h96 gn (6 · 0.56 · -4.13) |
| General | ribbon | trend-st-21-5@m15 | 8 | 0 (0 %) | 50 | 38 % | 0.65 | -36.56 | tp3.2 sl3.2 tr1.6 h96 gn (7 · 0.87 · -1.28) |
| General | pivot | willr-7-90@m30 | 14 | 2 (14 %) | 14 | 14 % | 0.00 | -42.09 | – |
| General | clamp | act-burst-2.5@m30 | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -87.50 | – |
| General | ribbon | dir-thrust@m30 | 7 | 0 (0 %) | 31 | 16 % | 0.13 | -89.76 | tp4 sl3 tr0 h48 gn (5 · 0.30 · -9.00) |
| General | sweep | mfi-14-10@m30 | 25 | 0 (0 %) | 25 | 0 % | 0.00 | -93.10 | – |
| General | pivot | break-vol@m15 | 25 | 0 (0 %) | 25 | 0 % | 0.00 | -97.20 | – |
| General | sandwich | hma-55@m15 | 29 | 0 (0 %) | 29 | 0 % | 0.00 | -104.60 | – |
| General | sandwich | hma-55@m15c | 29 | 0 (0 %) | 29 | 0 % | 0.00 | -104.60 | – |
| Long | ribbon | r-chand-m@m15 | 40 | 40 (100 %) | 87 | 92 % | 22.57 | 440.03 | – |
| Long | ribbon | trend-ribbon@m15 | 36 | 36 (100 %) | 36 | 100 % | ∞ (no loss) | 202.26 | – |
| Long | ribbon | dir-emax@m15 | 36 | 36 (100 %) | 36 | 100 % | ∞ (no loss) | 202.26 | – |
| Long | ribbon | dir-emax@m15c | 36 | 36 (100 %) | 36 | 100 % | ∞ (no loss) | 202.26 | – |
| Long | ribbon | ema-9-21@m15 | 36 | 36 (100 %) | 36 | 100 % | ∞ (no loss) | 202.26 | – |
| Long | ribbon | ema-9-21@m15c | 36 | 36 (100 %) | 36 | 100 % | ∞ (no loss) | 202.26 | – |
| Long | ribbon | ichi-cloud-9@m15 | 23 | 23 (100 %) | 23 | 100 % | ∞ (no loss) | 124.60 | – |
| Long | ribbon | willr-28-95@m15 | 19 | 19 (100 %) | 25 | 100 % | ∞ (no loss) | 118.85 | – |
| Long | sweep | r-spring-m@m30 | 19 | 19 (100 %) | 19 | 100 % | ∞ (no loss) | 99.80 | – |
| Long | ribbon | trend-st-14-4@m15c | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 95.67 | – |
| Long | sweep | willr-28-95@m30 | 25 | 25 (100 %) | 34 | 74 % | 4.08 | 91.69 | – |
| Long | pulse | ema-slope-34@m15 | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 83.46 | – |
| Long | pulse | ema-slope-34@m15c | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 83.46 | – |
| Long | ribbon | ema-slope-20-10@m15c | 19 | 19 (100 %) | 27 | 70 % | 4.44 | 79.80 | – |
| Long | ribbon | dir-vwap-240@m15c | 18 | 17 (94 %) | 66 | 59 % | 1.57 | 76.56 | tp5.6 sl4.2 tr0 h64 lg (5 · 1.84 · 7.40) |
| Long | clamp | rsi-mid-60-40@m30 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 76.15 | – |
| Long | clamp | dir-thrust-4@m30 | 15 | 15 (100 %) | 15 | 100 % | ∞ (no loss) | 66.75 | – |
| Long | pivot | trend-st-14-4@m15c | 3 | 3 (100 %) | 21 | 86 % | 4.28 | 60.98 | tp6.4 sl6.4 tr4.8 h64 lg (7 · 4.49 · 23.04) |
| Long | sweep | break-squeeze-30@m30 | 9 | 9 (100 %) | 18 | 83 % | 5.44 | 59.90 | – |
| Long | ribbon | macd-zero@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 56.00 | – |
| Long | ribbon | dir-emax-12-26@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 56.00 | – |
| Long | ribbon | macd-zero@m15c | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 56.00 | – |
| Long | ribbon | dir-emax-12-26@m15c | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 56.00 | – |
| Long | sandwich | trend-st-14-4@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 39.06 | – |
| Long | pulse | trend-st-14-4@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 39.06 | – |
| Long | ribbon | ema-slope@m15 | 8 | 8 (100 %) | 11 | 73 % | 5.31 | 38.75 | – |
| Long | revert | r-star@m30 | 13 | 13 (100 %) | 16 | 94 % | 11.46 | 35.56 | – |
| Long | pulse | ema-slope@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 33.99 | – |
| Long | sandwich | ema-slope-34@m15 | 14 | 14 (100 %) | 28 | 50 % | 1.64 | 32.66 | – |
| Long | sandwich | ema-slope-34@m15c | 14 | 14 (100 %) | 28 | 50 % | 1.64 | 32.66 | – |
| Long | pivot | willr-7-90@m30 | 23 | 13 (57 %) | 23 | 57 % | 2.01 | 31.99 | – |
| Long | follow | r-chand-m@m15c | 4 | 4 (100 %) | 16 | 69 % | 2.68 | 31.16 | tp4.8 sl2.4 tr0 h96 lg (5 · 2.65 · 8.60) |
| Long | pivot | trend-st-14-4@m15 | 1 | 1 (100 %) | 9 | 89 % | 574.09 | 30.05 | tp5.6 sl5.6 tr2.8 h64 lg (9 · 574.09 · 30.05) |
| Long | ribbon | r-chand@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 29.60 | – |
| Long | ribbon | ema-slope@m15c | 6 | 6 (100 %) | 9 | 67 % | 4.06 | 27.55 | – |
| Long | ribbon | ema-slope-34@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 25.40 | – |
| Long | ribbon | ema-slope-34@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 25.40 | – |
| Long | sweep | willr-21-95@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 23.08 | – |
| Long | sweep | break-don40@m15 | 2 | 2 (100 %) | 12 | 75 % | 2.60 | 20.29 | tp6.4 sl6.4 tr4.8 h96 lg (5 · 3.58 · 17.05) |
| Long | ribbon | ema-slope-200@m15c | 4 | 4 (100 %) | 13 | 69 % | 1.71 | 18.29 | – |
| Long | clamp | aroon-14@m15c | 5 | 5 (100 %) | 7 | 71 % | 3.32 | 18.07 | – |
| Long | pivot | obv-20@m30 | 3 | 3 (100 %) | 9 | 67 % | 1.73 | 14.47 | – |
| Long | ribbon | ema-slope-200@m15 | 3 | 3 (100 %) | 9 | 67 % | 1.62 | 12.11 | – |
| Long | sandwich | ema-slope@m15c | 5 | 5 (100 %) | 10 | 50 % | 1.52 | 11.59 | – |
| Long | ribbon | ema-slope-20-10@m15 | 4 | 4 (100 %) | 8 | 50 % | 1.79 | 9.20 | – |
| Long | sweep | break-vol-1.3@m15 | 3 | 1 (33 %) | 9 | 44 % | 1.23 | 3.70 | – |
| Long | pivot | break-don40@m15 | 2 | 1 (50 %) | 5 | 40 % | 0.77 | -2.05 | – |
| Long | ribbon | ema-50-100@m30 | 3 | 0 (0 %) | 8 | 63 % | 0.87 | -2.56 | – |
| Long | revert | ema-50-100@m30 | 1 | 0 (0 %) | 5 | 20 % | 0.30 | -10.60 | tp4.8 sl3.6 tr0 h48 lg (5 · 0.30 · -10.60) |
| Long | sweep | rsi-7-15-85@m30 | 2 | 0 (0 %) | 6 | 17 % | 0.27 | -14.80 | – |
| Long | ribbon | trend-st-21-5@m15c | 6 | 0 (0 %) | 17 | 35 % | 0.69 | -15.00 | tp5.6 sl2.8 tr0 h96 lg (5 · 0.45 · -6.60) |
| Long | ribbon | trix-15@m15 | 2 | 0 (0 %) | 12 | 17 % | 0.36 | -19.20 | tp5.6 sl2.8 tr0 h64 lg (6 · 0.36 · -9.60) |
| Long | ribbon | trend-st-28-6@m15 | 3 | 0 (0 %) | 13 | 31 % | 0.53 | -19.40 | tp5.6 sl4.2 tr0 h64 lg (6 · 0.61 · -6.80) |
| Long | follow | r-vortex@m15c | 5 | 0 (0 %) | 14 | 36 % | 0.50 | -20.87 | – |
| Long | follow | r-streak@m15 | 7 | 0 (0 %) | 28 | 50 % | 0.72 | -21.26 | – |
| Long | ribbon | ema-slope-100@m15 | 10 | 1 (10 %) | 31 | 32 % | 0.69 | -23.90 | – |
| Long | ribbon | trend-ema-50-200@m15c | 12 | 2 (17 %) | 31 | 45 % | 0.74 | -24.04 | – |
| Long | revert | r-roofing@m15 | 9 | 0 (0 %) | 28 | 54 % | 0.63 | -24.30 | – |
| Long | ribbon | trend-st-21-5@m15 | 5 | 0 (0 %) | 18 | 33 % | 0.53 | -26.17 | – |
| Long | sweep | r-fisher@m30 | 4 | 0 (0 %) | 16 | 25 % | 0.41 | -27.27 | tp5.2 sl2.6 tr0 h32 lg (5 · 0.45 · -6.20) |
| Long | ribbon | trix-15@m15c | 14 | 3 (21 %) | 46 | 30 % | 0.71 | -31.80 | tp4.8 sl2.4 tr0 h64 lg (5 · 0.44 · -5.80) |
| Long | revert | r-donch-vol-m@m30 | 2 | 0 (0 %) | 10 | 0 % | 0.00 | -33.00 | tp6 sl3 tr0 h32 lg (5 · 0.00 · -16.00) |
| Long | ribbon | r-streak@m15 | 13 | 1 (8 %) | 52 | 48 % | 0.75 | -34.70 | – |
| Long | revert | r-nr-break@m30 | 2 | 0 (0 %) | 23 | 30 % | 0.53 | -35.00 | tp5.6 sl4.2 tr0 h48 lg (12 · 0.61 · -13.60) |
| Long | sweep | mfi-14-10@m30 | 17 | 0 (0 %) | 8 | 0 % | 0.00 | -37.60 | – |
| Long | ribbon | act-hf@m30 | 4 | 0 (0 %) | 12 | 0 % | 0.00 | -48.30 | – |
| Long | sweep | willr-7-90@m30 | 11 | 0 (0 %) | 44 | 50 % | 0.26 | -67.04 | – |
| Long | pivot | r-sweep@m15 | 8 | 0 (0 %) | 16 | 0 % | 0.00 | -96.00 | – |
| Long | clamp | act-burst-2.5@m30 | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -116.60 | – |
| Long | sandwich | hma-55@m15 | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -116.80 | – |
| Long | sandwich | hma-55@m15c | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -116.80 | – |
| Long | ribbon | dir-thrust@m30 | 13 | 0 (0 %) | 40 | 3 % | 0.00 | -127.85 | – |
| Long | pivot | break-vol@m15 | 26 | 0 (0 %) | 26 | 0 % | 0.00 | -128.40 | – |
| Long | follow | r-zdist-m@m15 | 7 | 0 (0 %) | 61 | 26 % | 0.34 | -184.20 | tp6 sl6 tr0 h64 lg (9 · 0.47 · -19.80) |
| Wide | magnet | ema-slope-10@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 11.06 | – |
| Wide | pulse | macd-zero@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 8.22 | – |
| Wide | pulse | dir-emax-12-26@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 8.22 | – |
| Wide | pulse | trix-9@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 8.22 | – |
| Wide | sweep | z-50-2.5@x4@m5 | 4 | 3 (75 %) | 8 | 38 % | 1.73 | 2.34 | – |
| Wide | ribbon | ema-slope-34@m1c | 3 | 3 (100 %) | 12 | 50 % | 1.29 | 2.01 | – |
| Wide | magnet | trend-ema-12-26@m15c | 4 | 4 (100 %) | 8 | 50 % | 1.32 | 1.68 | – |
| Wide | magnet | ichi-tk-20@m1c | 3 | 3 (100 %) | 33 | 45 % | 1.07 | 0.90 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (11 · 1.07 · 0.30) |
| Wide | follow | r-rsi2-m@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.26 | -5.70 | – |
| Wide | sandwich | macd-zero@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | sandwich | ema-slope@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | sandwich | ema-slope@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | sandwich | dir-emax-12-26@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | sandwich | ema-slope-34@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | sandwich | ema-slope-34@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | sandwich | ema-slope-20-10@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | sweep | cci-40-200@m5c | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -12.10 | – |
| Wide | ribbon | r-sweep-m@m5 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -12.98 | – |
| Wide | sandwich | macd-zero@m15 | 6 | 0 (0 %) | 12 | 50 % | 0.33 | -16.96 | – |
| Wide | sandwich | dir-emax-12-26@m15 | 6 | 0 (0 %) | 12 | 50 % | 0.33 | -16.96 | – |
| Wide | sandwich | trix-9@m15c | 6 | 0 (0 %) | 12 | 50 % | 0.33 | -16.96 | – |
| Wide | pivot | r-sweep-m@m5 | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -23.34 | – |
| Wide | sweep | willr-50-90@m1c | 30 | 0 (0 %) | 270 | 33 % | 0.46 | -68.22 | tp0.64 sl0.54 tr0 h480 axd-atr2h axis (9 · 0.82 · -0.47) |
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
| General | tp 3.600% | sl 1.00× | tr 0.75× | 83 | 43 (52 %) | 98 | 60 % | 3.12 | 279.24 |
| Long | tp 4.800% | sl 1.00× | tr 0.50× | 83 | 39 (47 %) | 76 | 67 % | 3.01 | 196.74 |
| Long | tp 6.000% | sl 0.75× | tr off | 71 | 41 (58 %) | 68 | 71 % | 2.96 | 184.40 |
| Long | tp 6.400% | sl 0.75× | tr off | 63 | 33 (52 %) | 64 | 66 % | 2.37 | 150.40 |
| Long | tp 5.200% | sl 1.00× | tr 0.50× | 64 | 33 (52 %) | 69 | 68 % | 2.25 | 132.04 |
| Long | tp 5.200% | sl 0.50× | tr off | 69 | 38 (55 %) | 89 | 53 % | 2.00 | 117.40 |
| Long | tp 5.600% | sl 0.50× | tr off | 84 | 44 (52 %) | 117 | 47 % | 1.60 | 111.00 |
| Long | tp 5.600% | sl 0.75× | tr off | 93 | 45 (48 %) | 118 | 54 % | 1.45 | 108.00 |
| Long | tp 6.400% | sl 0.50× | tr off | 71 | 32 (45 %) | 72 | 50 % | 1.82 | 100.80 |
| General | tp 3.200% | sl 0.75× | tr off | 69 | 48 (70 %) | 84 | 68 % | 2.44 | 100.80 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Short | tp 2.800% | sl 1.50× | tr 0.75× | 96 | 18 (19 %) | 119 | 32 % | 0.47 | -91.94 |
| Wide | tp 0.640% | sl 0.84× | tr off | 36 | 6 (17 %) | 315 | 35 % | 0.55 | -65.31 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 96 | 15 (16 %) | 102 | 26 % | 0.59 | -60.18 |
| General | tp 4.000% | sl 1.00× | tr 0.50× | 95 | 14 (15 %) | 147 | 26 % | 0.71 | -53.52 |
| Wide | tp 0.760% | sl 0.89× | tr off | 45 | 3 (7 %) | 45 | 7 % | 0.11 | -46.09 |
| Short | tp 2.200% | sl 2.00× | tr off | 64 | 22 (34 %) | 64 | 61 % | 0.68 | -37.00 |
| Short | tp 2.800% | sl 1.00× | tr 0.75× | 77 | 7 (9 %) | 100 | 23 % | 0.63 | -32.35 |
| Short | tp 2.400% | sl 2.00× | tr 0.75× | 72 | 28 (39 %) | 61 | 72 % | 0.64 | -27.46 |
| Wide | tp 0.800% | sl 1.00× | tr off | 135 | 54 (40 %) | 148 | 68 % | 0.84 | -25.42 |
| Long | tp 5.200% | sl 1.00× | tr 0.75× | 25 | 4 (16 %) | 27 | 52 % | 0.61 | -25.17 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 95 | 21 (22 %) | 119 | 43 % | 0.82 | -24.72 |
| Short | tp 2.200% | sl 1.00× | tr 0.50× | 34 | 8 (24 %) | 38 | 47 % | 0.42 | -21.23 |
| Short | tp 2.400% | sl 1.50× | tr 0.75× | 77 | 34 (44 %) | 78 | 69 % | 0.74 | -19.13 |
| Short | tp 2.200% | sl 2.00× | tr 0.50× | 52 | 24 (46 %) | 54 | 65 % | 0.67 | -18.87 |
| Micro | tp 0.600% (net 0.400%) | sl 4.75× | tr off | 26 | 6 (23 %) | 76 | 82 % | 0.58 | -17.90 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 35 (35) | 18408 | 8976 | 8976 | 0 | baseTarget 9432 |
| Micro | trailing | 35 (35) | 36816 | 17952 | 17952 | 0 | baseTarget 18864 |
| Short | normal | 249 (191) | 34992 | 11538 | 11538 | 0 | baseRange 16596 · baseTarget 6858 |
| Short | trailing | 249 (191) | 69984 | 23076 | 23076 | 0 | baseRange 33192 · baseTarget 13716 |
| General | normal | 249 (203) | 23328 | 8466 | 8466 | 0 | baseRange 11064 · baseTarget 3798 |
| General | trailing | 249 (203) | 15552 | 5644 | 5644 | 0 | baseRange 7376 · baseTarget 2532 |
| Long | normal | 249 (227) | 29160 | 13488 | 13488 | 0 | baseRange 9510 · baseTarget 6162 |
| Long | trailing | 249 (227) | 19440 | 8992 | 8992 | 0 | baseRange 6340 · baseTarget 4108 |
| Wide | axis | 284 (284) | 47565 | 47565 | 47565 | 0 | – |
| Wide | dca | 284 (284) | 4228 | 4228 | 4228 | 0 | – |
| Wide | dca-active | 284 (284) | 4228 | 4228 | 4228 | 0 | – |

Engine indications Base evaluated that built no set: 107 (bb-bounce, bb-walk, break-atr-0.9, cci-20-200, dir-emax-20-50, dir-macd, ema-21-55, hma-32, macd-cross-5-35-5, macd-cross-8-21-5, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-10, mc-brk-20, mc-burst-2, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-iz-25, mc-lag-6, mc-macdh, mc-mrsi2-10, mc-mturn-5, mc-qrsi2-5, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-20, mc-rsi4-25, mc-rsi4-30, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.26 (872) | 0.39 (984) | 0.42 (1040) | 0.50 (1268) | 0.48 (1658) |
| 1.14× | – | 0.21 (752) | – | – | – | – | – |
| 1.25× | – | 0.24 (740) | 0.34 (856) | 0.38 (984) | 0.38 (1040) | 0.46 (1268) | 0.47 (1658) |
| 1.33× | 0.15 (720) | – | – | – | – | – | – |
| 1.5× | 0.18 (708) | 0.24 (736) | 0.31 (856) | 0.38 (984) | 0.41 (1040) | 0.45 (1264) | 0.42 (1650) |
| 1.75× | 0.18 (708) | 0.24 (736) | 0.33 (856) | 0.40 (980) | 0.38 (1036) | 0.45 (1248) | 0.47 (1638) |
| 2× | 0.18 (708) | 0.26 (736) | 0.35 (848) | 0.39 (980) | 0.45 (1024) | 0.49 (1236) | 0.49 (1620) |
| 2.25× | 0.18 (708) | 0.29 (728) | 0.35 (848) | 0.46 (968) | 0.46 (1016) | 0.65 (1232) | 0.58 (1612) |
| 2.5× | 0.21 (708) | 0.27 (728) | 0.36 (836) | 0.46 (960) | 0.55 (1022) | 0.60 (1236) | 0.54 (1612) |
| 2.75× | 0.20 (696) | 0.27 (716) | 0.37 (836) | 0.57 (960) | 0.51 (1022) | 0.56 (1240) | 0.52 (1608) |
| 3× | 0.20 (696) | 0.29 (716) | 0.40 (836) | 0.53 (960) | 0.49 (1018) | 0.55 (1232) | 0.53 (1584) |
| 3.25× | 0.19 (684) | 0.31 (716) | 0.46 (836) | 0.51 (960) | 0.49 (1010) | 0.58 (1212) | 0.51 (1580) |
| 3.5× | 0.20 (684) | 0.37 (716) | 0.43 (836) | 0.48 (960) | 0.50 (1010) | 0.57 (1212) | 0.52 (1568) |
| 3.75× | 0.21 (684) | 0.35 (716) | 0.42 (836) | 0.48 (960) | 0.51 (1002) | 0.62 (1196) | 0.54 (1544) |
| 4× | 0.22 (684) | 0.33 (716) | 0.40 (836) | 0.52 (952) | 0.53 (986) | 0.61 (1196) | 0.51 (1544) |
| 4.25× | 0.26 (684) | 0.33 (716) | 0.40 (836) | 0.51 (952) | 0.57 (986) | 0.63 (1180) | 0.51 (1540) |
| 4.5× | 0.25 (684) | 0.31 (716) | 0.43 (844) | 0.53 (940) | 0.59 (974) | 0.60 (1180) | 0.48 (1540) |
| 4.75× | 0.24 (684) | 0.32 (716) | 0.43 (834) | 0.59 (940) | 0.57 (974) | 0.61 (1176) | 0.47 (1536) |
| 5× | 0.24 (684) | 0.34 (716) | 0.45 (822) | 0.66 (922) | 0.55 (974) | 0.60 (1172) | 0.45 (1536) |

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
| 2.25× | – | – | – | – | – | – | 0.09 (32) |
| 2.5× | – | – | – | – | 0.00 (24) | 0.08 (20) | 0.25 (58) |
| 2.75× | – | – | – | – | 0.00 (24) | 0.44 (46) | 0.39 (54) |
| 3× | – | – | – | – | 0.35 (32) | 0.52 (36) | 0.82 (60) |
| 3.25× | – | – | – | 10.86 (16) | 7.54 (24) | 1.03 (64) | 0.63 (72) |
| 3.5× | – | – | – | 10.86 (16) | 7.54 (24) | 8.09 (78) | 0.67 (78) |
| 3.75× | – | ∞ (6) | ∞ (24) | 10.86 (16) | 12.91 (48) | 10.59 (98) | 1.55 (68) |
| 4× | – | ∞ (6) | ∞ (24) | 10.86 (16) | 15.02 (54) | 8.84 (84) | 1.48 (68) |
| 4.25× | ∞ (4) | ∞ (30) | ∞ (24) | 16.62 (40) | 15.02 (54) | 7.59 (70) | 1.29 (63) |
| 4.5× | ∞ (4) | ∞ (36) | ∞ (24) | 19.55 (46) | 15.72 (56) | 5.02 (62) | 1.53 (60) |
| 4.75× | ∞ (4) | ∞ (36) | 19.78 (48) | 19.55 (46) | 15.72 (56) | 5.02 (62) | 1.00 (234) |
| 5× | ∞ (28) | ∞ (36) | 22.47 (54) | 20.53 (48) | 11.72 (74) | 5.02 (62) | 1.12 (220) |

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
| 2.25× | – | – | – | – | – | – | 0.00 (3) |
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
| 1× | 0.90 (4404) | 1.00 (4638) | 0.84 (4838) | 1.01 (4927) | 1.10 (4758) | 1.10 (5290) |
| 1.5× | 1.03 (4060) | 1.04 (4346) | 0.98 (4413) | 1.12 (4387) | 1.22 (4297) | 1.27 (4722) |
| 2× | 1.19 (3779) | 1.16 (4037) | 0.99 (4188) | 1.23 (4156) | 1.35 (4038) | 1.55 (4302) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.06 (30) | 1.00 (62) | 0.91 (150) | 1.07 (118) | 1.28 (211) | 1.13 (258) |
| 1.5× | 3.80 (77) | 1.36 (141) | 1.08 (260) | 1.48 (234) | 1.45 (317) | 0.94 (281) |
| 2× | 2.62 (160) | 0.99 (206) | 0.76 (188) | 0.89 (182) | 1.09 (201) | 1.03 (219) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.80 (16) | 1.12 (27) | 1.23 (36) | 1.29 (25) | 2.83 (28) | 3.30 (37) |
| 1.5× | 2.83 (21) | 0.70 (27) | 3.39 (49) | 4.38 (56) | 2.99 (60) | 2.26 (52) |
| 2× | 159.50 (35) | 3.13 (42) | 2.36 (44) | 2.53 (46) | 6243.38 (59) | 84.27 (51) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.06 (1649) | 1.20 (1748) | 1.28 (1852) | 1.25 (1833) |
| 0.75× | 1.14 (1522) | 1.20 (1570) | 1.15 (1615) | 1.30 (1522) |
| 1× | 1.22 (4157) | 1.53 (4196) | 1.33 (4283) | 1.32 (4277) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.67 (28) | 1.18 (22) | 3.02 (22) | 3.19 (48) |
| 0.75× | 2.44 (84) | 2.18 (83) | 1.74 (96) | 1.62 (87) |
| 1× | 1.40 (315) | 2.24 (259) | 1.29 (284) | 1.32 (218) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.00 (5) | 0.34 (6) | 0.69 (7) | 1.75 (12) |
| 0.75× | 1.54 (14) | 1.17 (12) | 1.70 (17) | 1.30 (25) |
| 1× | 2.94 (60) | 4.82 (32) | 1.97 (30) | 0.93 (31) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.14 (1827) | 1.06 (1708) | 0.97 (2002) | 0.95 (1815) | 1.20 (2080) |
| 0.75× | 1.34 (1420) | 1.30 (1359) | 1.14 (1568) | 1.26 (1354) | 1.48 (1665) |
| 1× | 1.40 (4127) | 1.39 (3929) | 1.45 (4454) | 1.38 (4070) | 1.53 (4939) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 2.43 (57) | 2.00 (89) | 1.60 (117) | 1.50 (73) | 1.82 (72) |
| 0.75× | 1.54 (75) | 1.85 (63) | 1.45 (118) | 2.96 (68) | 2.37 (64) |
| 1× | 2.17 (165) | 1.42 (155) | 1.47 (153) | 1.61 (158) | 1.66 (167) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (6) | 0.71 (7) | 0.90 (6) | 0.30 (7) | 0.30 (7) |
| 0.75× | 0.00 (2) | 1.22 (4) | ∞ (2) | ∞ (1) | 3.72 (4) |
| 1× | 0.00 (2) | – | ∞ (5) | ∞ (3) | ∞ (7) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.43 (3177) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.63 (163) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.59 (21870) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.74 (160) | 0.40 (999) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.74 (157) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.48 (961) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.50 (941) | – | – | – | – |
| 1× | – | – | – | 0.46 (92139) | – | – | – | 0.57 (19903) | 0.74 (3592) | – | 0.65 (1116) | – | 0.92 (3345) | 1.13 (2846) | 0.73 (966) | 0.81 (818) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.55 (315) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.11 (45) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.84 (148) | – | – | – | ∞ (3) | – | – | – | – | – | – | – | – |

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
