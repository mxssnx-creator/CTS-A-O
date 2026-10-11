# Simulated trading session — 30 symbols, 12 h pre-historic + 18 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 1m+, 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $19.70; each order volume unit = 2.0 % of the realized equity at entry ($0.11–$0.70 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T06:00 → 2026-10-08T00:00 UTC. Engine: Base 1384/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 404/19072 · PF 1.58 · Micro 185/5900 · PF 2.26 · Short 691/8176 · PF 1.52 · General 562/8176 · PF 1.54 · Long 587/8176 · PF 1.56 · Signals 126/126; Main 1311 pairs, 214035 tapes, Real seats: 8489 engine configs + 2520 signal configs (every config of the active signals), compute 313 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $19.70 → $19.80 (0.52 %, closed orders) · equity at end $16.52 (open at end: 46 positions / 6387 orders, MTM -$3.28 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.03 (gross profit $ ÷ gross loss $ as sized) · PF unit 0.57 (every order at one unit: the engine's PF) · 71 positions / 4612 orders (incl. 86 capped to $0) · WR 61.25 % · DDT (closed trades, $) 7.75 h · DDR 19.05 · equity max drawdown $4.75 (22.34 %) · margin used max $15.23 · open avg 33.61 pos / 1067.95 orders (peak 42 / 1467)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 86 orders capped to $0, 4321 scaled down (open at end: 7 capped, 6326 scaled) · binding: position cap 3979, gross cap 10481. **Without the caps:** balance $19.70 → -$11.99 (-160.88 %) · PF $ 0.49 · equity at end -$101.60 · equity max drawdown $139.02 (374.40 %) · margin used max $372.31 · infeasible: margin exceeded equity for 1053 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 530 | 1178  | 4.7 % | 1.573 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 530 | 1178 (+0) | 4.7 % | 1.573 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 530 | 1178 (+0) | 4.7 % | 1.573 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 485 | 1025 (-153) | 4.1 % | 1.623 |
| closes ≥ 6 | 1.00 | 6 | 1 | 735 | 1569 (+391) | 6.3 % | 1.778 |
| closes ≥ 20 | 1.00 | 20 | 1 | 383 | 895 (-283) | 3.6 % | 1.459 |
| closes ≥ 30 | 1.00 | 30 | 1 | 283 | 704 (-474) | 2.8 % | 1.384 |
| DDR off | 1.00 | 12 | off | 1948 | 2880 (+1702) | 11.5 % | 1.136 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 959 | 1776 (+598) | 7.1 % | 1.368 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 209 | 554 (-624) | 2.2 % | 1.975 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1948 | 2880 (+1702) | 11.5 % | 1.136 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2401 | 3395 (+2217) | 13.6 % | 1.179 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 0 / 54 | 41 / 13 | 2.03 | 2.11 | 76 % | $0.18 | $19.88 | $19.32 | $18.63 | 7.15 % | 0.90 | $13.98 | 27 / 892 |
| 07:00 | 0 / 130 | 120 / 10 | 73.74 | 12.55 | 92 % | $0.27 | $20.15 | $19.53 | $19.21 | 7.15 % | 1.90 | $14.10 | 33 / 1477 |
| 08:00 | 3 / 126 | 102 / 24 | 0.70 | 2.35 | 81 % | -$0.09 | $20.06 | $19.83 | $19.26 | 7.15 % | 2.90 | $14.10 | 37 / 1940 |
| 09:00 | 2 / 194 | 158 / 36 | 7.25 | 5.28 | 81 % | $0.31 | $20.36 | $20.42 | $19.90 | 7.15 % | 0.12 | $14.25 | 38 / 2188 |
| 10:00 | 1 / 259 | 243 / 16 | 12.49 | 18.84 | 94 % | $0.64 | $21.01 | $20.10 | $19.84 | 7.15 % | 0.87 | $14.72 | 39 / 2424 |
| 11:00 | 0 / 206 | 172 / 34 | 6.87 | 4.03 | 83 % | $0.25 | $21.26 | $20.76 | $19.99 | 7.15 % | 0.23 | $14.88 | 43 / 2747 |
| 12:00 | 3 / 277 | 214 / 63 | 1.68 | 2.19 | 77 % | $0.12 | $21.38 | $20.19 | $20.07 | 7.15 % | 1.23 | $15.00 | 42 / 3061 |
| 13:00 | 1 / 373 | 321 / 52 | 1.56 | 4.90 | 86 % | $0.15 | $21.54 | $20.47 | $19.98 | 7.15 % | 2.23 | $15.07 | 44 / 3296 |
| 14:00 | 1 / 158 | 135 / 23 | 72.08 | 29.57 | 85 % | $0.13 | $21.66 | $20.90 | $20.24 | 7.15 % | 3.23 | $15.16 | 44 / 3498 |
| 15:00 | 3 / 284 | 227 / 57 | 1.69 | 2.24 | 80 % | $0.07 | $21.73 | $19.63 | $19.45 | 8.58 % | 0.92 | $15.23 | 43 / 3803 |
| 16:00 | 1 / 271 | 201 / 70 | 0.28 | 0.60 | 74 % | -$0.22 | $21.51 | $20.08 | $18.51 | 12.98 % | 1.92 | $15.23 | 45 / 4338 |
| 17:00 | 0 / 137 | 118 / 19 | 30.83 | 16.57 | 86 % | $0.04 | $21.55 | $19.70 | $19.70 | 12.98 % | 2.92 | $15.09 | 45 / 4928 |
| 18:00 | 0 / 367 | 143 / 224 | 0.04 | 0.09 | 39 % | -$0.94 | $20.61 | $18.84 | $18.44 | 13.29 % | 3.92 | $15.10 | 46 / 5164 |
| 19:00 | 0 / 73 | 55 / 18 | 3.22 | 1.91 | 75 % | $0.01 | $20.62 | $18.95 | $18.43 | 13.38 % | 4.92 | $14.43 | 47 / 5755 |
| 20:00 | 0 / 203 | 123 / 80 | 0.06 | 0.65 | 61 % | -$0.26 | $20.36 | $18.29 | $18.20 | 14.42 % | 5.92 | $14.43 | 47 / 6232 |
| 21:00 | 0 / 329 | 227 / 102 | 2.25 | 1.11 | 69 % | $0.14 | $20.49 | $18.78 | $18.26 | 14.42 % | 6.92 | $14.35 | 47 / 6874 |
| 22:00 | 1 / 773 | 164 / 609 | 0.49 | 0.09 | 21 % | -$0.33 | $20.17 | $17.41 | $17.41 | 18.17 % | 7.92 | $14.35 | 46 / 6678 |
| 23:00 | 0 / 398 | 61 / 337 | 0.23 | 0.04 | 15 % | -$0.36 | $19.80 | $16.52 | $16.52 | 22.34 % | 8.92 | $14.12 | 46 / 6387 |

**Last hour (23:00):** open at end: 46 positions / 6387 orders, MTM -$3.28 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $16.52 = balance $19.80 + MTM -$3.28.

**Hours positive:** 12 of 18 full hours · flat 0 · negative 6

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m | 1m+ | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | – | – | 3 · ∞ (no loss) · $0.00 | – | 5 · 0.29 · -$0.04 | 41 · 6.32 · $0.29 | 5 · 0.00 · -$0.07 |
| 07:00 | – | 19 · ∞ (no loss) · $0.00 | – | – | 61 · 322.28 · $0.25 | 48 · 8.21 · $0.02 | 2 · 0.00 · -$0.00 |
| 08:00 | – | 2 · ∞ (no loss) · $0.00 | 3 · 0.00 · -$0.00 | – | 55 · 0.23 · -$0.23 | 55 · 265.93 · $0.13 | 11 · 2.80 · $0.01 |
| 09:00 | – | – | 7 · 0.00 · -$0.00 | – | 111 · 141.21 · $0.24 | 44 · 2926.33 · $0.11 | 32 · 0.07 · -$0.04 |
| 10:00 | 1 · ∞ (no loss) · $0.00 | – | 3 · 0.00 · -$0.00 | – | 133 · 7631.38 · $0.38 | 96 · ∞ (no loss) · $0.31 | 26 · 0.12 · -$0.05 |
| 11:00 | – | – | 4 · ∞ (no loss) · $0.00 | – | 111 · 20.55 · $0.15 | 63 · 71.31 · $0.12 | 28 · 0.57 · -$0.01 |
| 12:00 | 8 · 0.00 · -$0.00 | – | 7 · ∞ (no loss) · $0.00 | – | 211 · 1.78 · $0.10 | 24 · 30.71 · $0.04 | 27 · 0.42 · -$0.02 |
| 13:00 | – | – | 12 · ∞ (no loss) · $0.00 | – | 331 · 2.58 · $0.24 | 9 · 2.41 · $0.02 | 21 · 0.01 · -$0.11 |
| 14:00 | – | – | – | – | 158 · 72.08 · $0.13 | – | – |
| 15:00 | – | – | 6 · ∞ (no loss) · $0.00 | – | 218 · 3.55 · $0.11 | 51 · 0.51 · -$0.02 | 9 · 0.04 · -$0.02 |
| 16:00 | 3 · – · $0.00 | – | 6 · ∞ (no loss) · $0.00 | – | 251 · 0.27 · -$0.23 | 8 · ∞ (no loss) · $0.00 | 3 · ∞ (no loss) · $0.00 |
| 17:00 | – | – | – | – | 128 · 205.06 · $0.04 | 4 · 4.06 · $0.00 | 5 · 0.08 · -$0.00 |
| 18:00 | – | – | – | – | 295 · 0.04 · -$0.91 | 64 · 0.13 · -$0.00 | 8 · 0.02 · -$0.02 |
| 19:00 | – | – | – | – | 49 · 10.97 · $0.01 | 22 · 0.36 · -$0.00 | 2 · 0.00 · -$0.00 |
| 20:00 | – | – | – | – | 86 · 0.06 · -$0.25 | 87 · 0.15 · -$0.01 | 30 · 0.87 · -$0.00 |
| 21:00 | – | – | – | – | 273 · 1.61 · $0.06 | 36 · 12.31 · $0.07 | 20 · 4.03 · $0.00 |
| 22:00 | – | – | – | 3 · ∞ (no loss) · $0.00 | 564 · 0.47 · -$0.32 | 130 · 0.79 · -$0.01 | 76 · 0.30 · -$0.00 |
| 23:00 | – | – | – | – | 301 · 0.24 · -$0.34 | 80 · 0.01 · -$0.02 | 17 · 0.00 · -$0.01 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Axis, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Axis | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 54 | 14 · 2.13 · 79 % · $0.05 | 35 · 3.12 · 77 % · $0.17 | – | 2 · 0.30 · 50 % · -$0.02 | 3 · 0.27 · 67 % · -$0.02 | – | 5 · 0.29 · 60 % · -$0.04 |
| 07:00 | 130 | 21 · ∞ (no loss) · 100 % · $0.02 | 53 · 1.00 · 87 % · $0.00 | 22 · ∞ (no loss) · 100 % · $0.00 | 7 · ∞ (no loss) · 100 % · $0.07 | 27 · 233.21 · 89 % · $0.18 | – | 34 · 317.03 · 91 % · $0.25 |
| 08:00 | 126 | 54 · 50.95 · 93 % · $0.15 | 37 · 65.98 · 73 % · $0.03 | 2 · ∞ (no loss) · 100 % · $0.00 | 7 · 0.15 · 71 % · -$0.07 | 26 · 0.04 · 69 % · -$0.21 | – | 33 · 0.08 · 70 % · -$0.28 |
| 09:00 | 194 | 60 · 2.62 · 75 % · $0.07 | 33 · 2.30 · 58 % · $0.01 | 3 · ∞ (no loss) · 100 % · $0.00 | 34 · ∞ (no loss) · 100 % · $0.10 | 64 · 112.45 · 89 % · $0.13 | – | 98 · 198.35 · 93 % · $0.23 |
| 10:00 | 259 | 39 · 2.41 · 77 % · $0.05 | 116 · 23.35 · 96 % · $0.47 | 1 · ∞ (no loss) · 100 % · $0.00 | 19 · ∞ (no loss) · 100 % · $0.03 | 84 · 1880.04 · 98 % · $0.09 | – | 103 · 2472.03 · 98 % · $0.12 |
| 11:00 | 206 | 34 · 2.34 · 50 % · $0.05 | 80 · 20.39 · 80 % · $0.05 | – | 29 · ∞ (no loss) · 100 % · $0.04 | 63 · 73990.27 · 98 % · $0.11 | – | 92 · 100483.11 · 99 % · $0.15 |
| 12:00 | 277 | 28 · 1.56 · 39 % · $0.00 | 75 · 2.87 · 64 % · $0.08 | 8 · 0.00 · 0 % · -$0.00 | 32 · 1.62 · 91 % · $0.02 | 134 · 1.19 · 94 % · $0.02 | – | 166 · 1.31 · 93 % · $0.04 |
| 13:00 | 373 | 37 · 0.42 · 65 % · -$0.04 | 45 · 0.31 · 62 % · -$0.04 | 6 · 0.00 · 0 % · -$0.00 | 82 · 2.87 · 98 % · $0.07 | 203 · 2.41 · 93 % · $0.16 | – | 285 · 2.53 · 94 % · $0.23 |
| 14:00 | 158 | 1 · 0.00 · 0 % · -$0.00 | – | – | 18 · ∞ (no loss) · 100 % · $0.03 | 139 · 76.23 · 84 % · $0.10 | – | 157 · 96.88 · 86 % · $0.13 |
| 15:00 | 284 | 21 · 0.04 · 57 % · -$0.04 | 52 · 1.31 · 83 % · $0.01 | 6 · 0.00 · 0 % · -$0.00 | 37 · 2.35 · 81 % · $0.02 | 168 · 4.44 · 85 % · $0.09 | – | 205 · 3.64 · 84 % · $0.11 |
| 16:00 | 271 | 21 · 0.90 · 62 % · -$0.00 | 33 · 5.56 · 85 % · $0.01 | 3 · – · 100 % · $0.00 | 36 · 0.07 · 42 % · -$0.08 | 178 · 0.31 · 80 % · -$0.15 | – | 214 · 0.24 · 73 % · -$0.23 |
| 17:00 | 137 | 5 · 0.75 · 60 % · -$0.00 | 14 · 4.11 · 50 % · $0.00 | – | 22 · ∞ (no loss) · 100 % · $0.02 | 96 · 127.35 · 90 % · $0.02 | – | 118 · 216.92 · 92 % · $0.04 |
| 18:00 | 367 | 24 · 0.05 · 46 % · -$0.01 | 56 · 0.05 · 80 % · -$0.02 | – | 62 · 0.03 · 11 % · -$0.24 | 225 · 0.05 · 36 % · -$0.67 | – | 287 · 0.04 · 30 % · -$0.91 |
| 19:00 | 73 | 15 · 0.06 · 47 % · -$0.00 | 27 · 4.11 · 70 % · $0.00 | – | 1 · ∞ (no loss) · 100 % · $0.00 | 30 · 349.52 · 93 % · $0.00 | – | 31 · 393.43 · 94 % · $0.01 |
| 20:00 | 203 | 35 · 0.00 · 34 % · -$0.01 | 93 · 0.36 · 57 % · -$0.00 | – | 10 · 0.06 · 60 % · -$0.06 | 65 · 0.06 · 80 % · -$0.19 | – | 75 · 0.06 · 77 % · -$0.25 |
| 21:00 | 329 | 49 · 6.23 · 57 % · $0.03 | 44 · 24.26 · 39 % · $0.04 | – | 94 · 0.98 · 70 % · -$0.00 | 142 · 2.38 · 82 % · $0.06 | – | 236 · 1.62 · 77 % · $0.06 |
| 22:00 | 773 | 128 · 0.65 · 10 % · -$0.01 | 234 · 0.16 · 15 % · -$0.03 | – | 124 · 0.21 · 15 % · -$0.17 | 287 · 0.67 · 33 % · -$0.11 | – | 411 · 0.49 · 28 % · -$0.29 |
| 23:00 | 398 | 70 · 0.00 · 0 % · -$0.06 | 103 · 0.01 · 3 % · -$0.02 | – | 52 · 0.02 · 2 % · -$0.12 | 173 · 0.39 · 33 % · -$0.16 | – | 225 · 0.27 · 26 % · -$0.29 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1258 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (214035 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (12789); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 17697 · 0.90 | 2593 · 1.17 | 4872 · 1.45 | 1253 · 1.81 | 54 · 2.11 | 14 · 2.21 | 35 · 3.25 | – | 5 · 0.29 |
| 07:00 | 18078 · 1.21 | 2365 · 1.40 | 4735 · 2.26 | 1276 · 13.74 | 130 · 12.55 | 21 · ∞ (no loss) | 53 · 3.04 | – | 34 · 175.11 |
| 08:00 | 22723 · 1.06 | 3894 · 1.93 | 5183 · 1.23 | 950 · 1.85 | 126 · 2.35 | 54 · 15.73 | 37 · 32.74 | – | 33 · 0.51 |
| 09:00 | 45850 · 1.15 | 9690 · 1.99 | 12831 · 1.44 | 2574 · 2.47 | 194 · 5.28 | 60 · 3.19 | 33 · 0.85 | – | 98 · 320.69 |
| 10:00 | 45025 · 1.19 | 5576 · 1.47 | 12640 · 2.40 | 1665 · 2.44 | 259 · 18.84 | 39 · 3.77 | 116 · 50.12 | – | 103 · 1591.35 |
| 11:00 | 40931 · 0.68 | 7193 · 1.26 | 10129 · 0.90 | 2027 · 1.19 | 206 · 4.03 | 34 · 0.74 | 80 · 2.97 | – | 92 · 32970.01 |
| 12:00 | 62997 · 0.82 | 11911 · 0.75 | 22860 · 0.96 | 5439 · 0.37 | 277 · 2.19 | 28 · 0.24 | 75 · 1.66 | – | 166 · 4.84 |
| 13:00 | 102081 · 0.75 | 22966 · 1.09 | 39429 · 0.88 | 4055 · 2.31 | 373 · 4.90 | 37 · 0.76 | 45 · 0.74 | – | 285 · 16.92 |
| 14:00 | 44308 · 1.50 | 8984 · 1.47 | 16972 · 2.06 | 2447 · 5.56 | 158 · 29.57 | 1 · 0.00 | – | – | 157 · 52.70 |
| 15:00 | 57349 · 1.32 | 12156 · 1.09 | 21049 · 1.33 | 4264 · 1.28 | 284 · 2.24 | 21 · 0.52 | 52 · 2.10 | – | 205 · 2.82 |
| 16:00 | 59902 · 1.86 | 13317 · 1.64 | 27119 · 2.39 | 4260 · 2.60 | 271 · 0.60 | 21 · 1.07 | 33 · 2.39 | – | 214 · 0.46 |
| 17:00 | 35968 · 1.49 | 6436 · 1.06 | 15510 · 1.76 | 2893 · 1.92 | 137 · 16.57 | 5 · 0.90 | 14 · 2.91 | – | 118 · 160.31 |
| 18:00 | 37083 · 1.66 | 6995 · 1.71 | 10780 · 1.24 | 2752 · 0.92 | 367 · 0.09 | 24 · 0.36 | 56 · 4.24 | – | 287 · 0.05 |
| 19:00 | 30501 · 1.60 | 8465 · 2.18 | 8848 · 1.21 | 1549 · 5.65 | 73 · 1.91 | 15 · 0.64 | 27 · 1.90 | – | 31 · 155.30 |
| 20:00 | 38915 · 0.79 | 9920 · 1.54 | 7968 · 0.62 | 1749 · 1.03 | 203 · 0.65 | 35 · 0.31 | 93 · 0.68 | – | 75 · 0.86 |
| 21:00 | 53450 · 0.90 | 12767 · 1.17 | 18158 · 1.09 | 2626 · 2.01 | 329 · 1.11 | 49 · 0.97 | 44 · 0.42 | – | 236 · 1.28 |
| 22:00 | 60524 · 0.46 | 13821 · 0.60 | 20526 · 0.44 | 4372 · 0.23 | 773 · 0.09 | 128 · 0.07 | 234 · 0.06 | – | 411 · 0.10 |
| 23:00 | 45283 · 0.51 | 9842 · 0.88 | 11723 · 0.37 | 2001 · 0.19 | 398 · 0.04 | 70 · 0.00 | 103 · 0.01 | – | 225 · 0.05 |
| **total** | **818665 · 0.98** | **168891 · 1.18** | **271332 · 1.08** | **48152 · 0.96** | **4612 · 0.57** | **656 · 0.62** | **1130 · 0.81** | **–** | **2775 · 0.51** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 656 | 308 / 348 | 1.65 | 0.62 | $0.26 | 46.95 % | 10.00 |
| Trailing | 1130 | 621 / 509 | 3.47 | 0.81 | $0.76 | 54.96 % | 11.00 |
| Axis | 51 | 31 / 20 | 0.93 | 2.79 | -$0.00 | 60.78 % | 13.87 |
| Signal · Normal | 668 | 389 / 279 | 0.63 | 0.42 | -$0.37 | 58.23 % | 8.75 |
| Signal · Trailing | 2107 | 1476 / 631 | 0.76 | 0.56 | -$0.54 | 70.05 % | 7.75 |
| total | 4612 | 2825 / 1787 | 1.03 | 0.57 | $0.10 | 61.25 % | 7.75 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 2775 | 1865 / 910 | 0.72 | 0.51 | -$0.92 | 67.21 % | 7.75 |
| of which Engine (no signals) | 1837 | 960 / 877 | 2.44 | 0.74 | $1.02 | 52.26 % | 11.00 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m | 12 | 0.00 | 1.09 | -$0.00 |
| 1m+ | 21 | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 5m | 51 | 2.45 | 0.54 | $0.00 |
| 5m+ | 3 | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 15m | 3341 | 0.82 | 0.51 | -$0.61 |
| 15m+ | 862 | 6.61 | 1.18 | $1.06 |
| 30m | 322 | 0.15 | 0.37 | -$0.35 |

A 18 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 54 | 39 / 15 | 2.47 | 0.59 | $0.00 | 72.22 % | 17.92 |
| Short | 1408 | 725 / 683 | 2.43 | 0.68 | $0.64 | 51.49 % | 10.50 |
| General | 166 | 91 / 75 | 28.17 | 1.20 | $0.27 | 54.82 % | 4.00 |
| Long | 158 | 74 / 84 | 1.44 | 0.74 | $0.11 | 46.84 % | 11.25 |
| Wide | 51 | 31 / 20 | 0.93 | 2.79 | -$0.00 | 60.78 % | 13.87 |
| Signals | 2775 | 1865 / 910 | 0.72 | 0.51 | -$0.92 | 67.21 % | 7.75 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 49253 | sig:confirm 15865 · sig:duplicate 13071 · sig:signalPf 9334 · sig:signalSide 8846 · sig:signalCluster 2137 |
| Short | 17134 | lastN 10853 · symPf 3050 · engineSide 2877 · duplicate 354 |
| Micro | 5736 | crowd 3060 · engineSide 1275 · lastN 1010 · symPf 388 · duplicate 3 |
| Long | 3550 | lastN 2333 · engineSide 578 · symPf 564 · duplicate 75 |
| General | 3364 | lastN 2220 · engineSide 669 · symPf 395 · duplicate 80 |
| Wide | 1113 | lastN 456 · engineSide 379 · symPf 260 · duplicate 18 |

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
| Micro | 2.26 | 0.59 | 0.26 | 2.47 | 4.19 | 54 |
| Short | 1.52 | 0.68 | 0.45 | 2.43 | 3.59 | 1408 |
| General | 1.54 | 1.20 | 0.78 | 28.17 | 23.54 | 166 |
| Long | 1.56 | 0.74 | 0.48 | 1.44 | 1.93 | 158 |
| Wide | 1.58 | 2.79 | 1.76 | 0.93 | 0.33 | 51 |
| Signals | – | 0.51 | – | 0.72 | 1.40 | 2775 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (10421 of 186192 evaluated, 211515 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3666 units active at the run start, 5300 over the run, 2368 of 2520 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 1717 | 174 (10 %) | 2865 | 71 % | 0.36 | -1014.36 |
| Micro | trailing | 1941 | 388 (20 %) | 5651 | 66 % | 0.42 | -1593.49 |
| Short | normal | 1246 | 408 (33 %) | 3031 | 73 % | 1.60 | 1785.67 |
| Short | trailing | 2904 | 906 (31 %) | 8091 | 66 % | 1.40 | 2499.12 |
| General | normal | 555 | 148 (27 %) | 1147 | 55 % | 1.42 | 618.39 |
| General | trailing | 535 | 126 (24 %) | 934 | 60 % | 1.11 | 119.21 |
| Long | normal | 708 | 175 (25 %) | 999 | 62 % | 1.87 | 1509.05 |
| Long | trailing | 509 | 89 (17 %) | 389 | 69 % | 1.43 | 232.57 |
| Wide | axis | 306 | 67 (22 %) | 1047 | 41 % | 0.87 | -61.55 |
| Signals | normal | 585 | 196 (34 %) | 5486 | 70 % | 0.73 | -4440.20 |
| Signals | trailing | 1783 | 904 (51 %) | 18512 | 74 % | 0.94 | -2285.94 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 3658 | 562 (15 %) | 8516 | 68 % | 0.40 | -2607.85 |
| Short | active | 62 | 2 (3 %) | 6 | 33 % | 0.52 | -4.60 |
| Short | bollinger | 329 | 33 (10 %) | 183 | 75 % | 1.39 | 67.16 |
| Short | break | 350 | 155 (44 %) | 1500 | 73 % | 1.65 | 824.67 |
| Short | channel | 59 | 32 (54 %) | 48 | 67 % | 1.60 | 18.39 |
| Short | direction | 168 | 29 (17 %) | 429 | 65 % | 1.22 | 96.61 |
| Short | ema | 136 | 12 (9 %) | 180 | 42 % | 0.72 | -78.73 |
| Short | ichimoku | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 220 | 36 (16 %) | 315 | 66 % | 1.15 | 49.72 |
| Short | move | 490 | 231 (47 %) | 1526 | 68 % | 1.32 | 420.10 |
| Short | osc | 870 | 474 (54 %) | 4556 | 69 % | 1.54 | 1875.88 |
| Short | rsi | 636 | 8 (1 %) | 255 | 49 % | 0.52 | -164.59 |
| Short | sar | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 4.45 |
| Short | smooth | 113 | 91 (81 %) | 97 | 94 % | 13.26 | 306.43 |
| Short | trend | 214 | 148 (69 %) | 1210 | 73 % | 2.53 | 1072.72 |
| Short | volume | 498 | 60 (12 %) | 814 | 55 % | 0.77 | -203.43 |
| General | active | 23 | 0 (0 %) | 16 | 38 % | 0.88 | -3.20 |
| General | bollinger | 96 | 4 (4 %) | 69 | 49 % | 1.26 | 21.00 |
| General | break | 37 | 15 (41 %) | 227 | 58 % | 1.20 | 62.89 |
| General | channel | 28 | 0 (0 %) | 46 | 17 % | 0.14 | -99.57 |
| General | direction | 54 | 8 (15 %) | 191 | 45 % | 0.76 | -72.66 |
| General | ema | 38 | 14 (37 %) | 56 | 43 % | 1.11 | 9.13 |
| General | ichimoku | 2 | 2 (100 %) | 4 | 100 % | ∞ (no loss) | 16.00 |
| General | macd | 39 | 9 (23 %) | 36 | 64 % | 2.07 | 33.47 |
| General | move | 123 | 42 (34 %) | 198 | 52 % | 0.97 | -6.57 |
| General | osc | 172 | 84 (49 %) | 631 | 65 % | 1.98 | 540.71 |
| General | rsi | 224 | 0 (0 %) | 4 | 0 % | 0.00 | -17.30 |
| General | smooth | 51 | 47 (92 %) | 55 | 89 % | 10.28 | 165.19 |
| General | trend | 58 | 41 (71 %) | 369 | 62 % | 1.40 | 167.69 |
| General | volume | 145 | 8 (6 %) | 179 | 49 % | 0.75 | -79.17 |
| Long | active | 17 | 1 (6 %) | 1 | 100 % | ∞ (no loss) | 1.04 |
| Long | bollinger | 44 | 0 (0 %) | 8 | 25 % | 0.37 | -20.90 |
| Long | break | 60 | 13 (22 %) | 172 | 55 % | 1.03 | 13.20 |
| Long | channel | 27 | 0 (0 %) | 5 | 0 % | 0.00 | -25.60 |
| Long | direction | 85 | 25 (29 %) | 199 | 57 % | 1.74 | 207.39 |
| Long | ema | 12 | 9 (75 %) | 36 | 69 % | 2.28 | 67.86 |
| Long | ichimoku | 2 | 2 (100 %) | 4 | 100 % | ∞ (no loss) | 20.80 |
| Long | macd | 80 | 7 (9 %) | 125 | 52 % | 1.09 | 24.31 |
| Long | move | 149 | 16 (11 %) | 46 | 54 % | 0.50 | -55.90 |
| Long | osc | 162 | 89 (55 %) | 291 | 88 % | 9.40 | 1095.76 |
| Long | rsi | 171 | 3 (2 %) | 20 | 15 % | 0.05 | -74.70 |
| Long | sar | 5 | 3 (60 %) | 15 | 53 % | 1.23 | 6.75 |
| Long | smooth | 83 | 50 (60 %) | 64 | 81 % | 3.79 | 160.05 |
| Long | trend | 70 | 25 (36 %) | 153 | 65 % | 1.98 | 210.79 |
| Long | volume | 250 | 21 (8 %) | 249 | 55 % | 1.20 | 110.78 |
| Wide | active | 22 | 0 (0 %) | 9 | 0 % | 0.00 | -6.30 |
| Wide | bollinger | 36 | 18 (50 %) | 315 | 45 % | 1.09 | 10.73 |
| Wide | break | 39 | 9 (23 %) | 48 | 44 % | 0.78 | -5.07 |
| Wide | channel | 16 | 0 (0 %) | 247 | 27 % | 0.43 | -90.72 |
| Wide | direction | 9 | 0 (0 %) | 30 | 40 % | 0.65 | -7.31 |
| Wide | macd | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 47 | 13 (28 %) | 32 | 69 % | 2.74 | 17.35 |
| Wide | osc | 113 | 24 (21 %) | 357 | 45 % | 1.11 | 15.54 |
| Wide | rsi | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -2.69 |
| Wide | smooth | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.91 |
| Wide | volume | 15 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | signal:act-burst | 38 | 25 (66 %) | 343 | 79 % | 1.18 | 106.71 |
| Signals | signal:act-hf | 39 | 19 (49 %) | 537 | 71 % | 0.76 | -274.14 |
| Signals | signal:adx | 38 | 15 (39 %) | 312 | 71 % | 0.88 | -86.18 |
| Signals | signal:atr-break | 40 | 25 (63 %) | 408 | 76 % | 1.16 | 116.51 |
| Signals | signal:bollinger | 40 | 19 (48 %) | 419 | 76 % | 0.95 | -47.35 |
| Signals | signal:cci | 40 | 15 (38 %) | 549 | 75 % | 1.06 | 70.16 |
| Signals | signal:cmf | 40 | 11 (28 %) | 481 | 67 % | 0.62 | -518.70 |
| Signals | signal:donchian | 39 | 14 (36 %) | 350 | 71 % | 0.80 | -156.58 |
| Signals | signal:ema-cross | 40 | 2 (5 %) | 241 | 67 % | 0.52 | -383.68 |
| Signals | signal:ema-cross-fast | 40 | 6 (15 %) | 488 | 74 % | 0.76 | -276.75 |
| Signals | signal:ema-pullback | 37 | 12 (32 %) | 575 | 74 % | 0.84 | -183.81 |
| Signals | signal:ema-slope | 38 | 8 (21 %) | 254 | 70 % | 0.49 | -371.76 |
| Signals | signal:ema-trend | 40 | 10 (25 %) | 504 | 70 % | 0.67 | -426.37 |
| Signals | signal:heikin-ashi | 40 | 15 (38 %) | 675 | 69 % | 0.67 | -552.01 |
| Signals | signal:hma | 40 | 20 (50 %) | 533 | 75 % | 1.08 | 75.27 |
| Signals | signal:ichimoku | 35 | 30 (86 %) | 258 | 82 % | 1.55 | 184.07 |
| Signals | signal:impulse | 40 | 18 (45 %) | 459 | 75 % | 0.97 | -29.85 |
| Signals | signal:kama | 40 | 16 (40 %) | 732 | 75 % | 0.88 | -169.31 |
| Signals | signal:keltner | 40 | 29 (73 %) | 227 | 80 % | 1.97 | 237.33 |
| Signals | signal:macd-cross | 40 | 20 (50 %) | 544 | 78 % | 1.00 | 0.18 |
| Signals | signal:macd-hist | 40 | 17 (43 %) | 631 | 75 % | 0.94 | -74.34 |
| Signals | signal:macd-slow | 40 | 10 (25 %) | 481 | 72 % | 0.67 | -405.03 |
| Signals | signal:mfi | 40 | 37 (93 %) | 149 | 86 % | 2.79 | 277.45 |
| Signals | signal:obv | 40 | 38 (95 %) | 584 | 84 % | 2.38 | 713.26 |
| Signals | signal:r-awesome | 38 | 14 (37 %) | 344 | 63 % | 0.56 | -453.90 |
| Signals | signal:r-connors | 37 | 17 (46 %) | 253 | 70 % | 0.60 | -266.59 |
| Signals | signal:r-fractal | 40 | 0 (0 %) | 195 | 47 % | 0.18 | -871.58 |
| Signals | signal:r-inside | 21 | 2 (10 %) | 50 | 48 % | 0.12 | -224.34 |
| Signals | signal:r-linreg | 40 | 16 (40 %) | 530 | 73 % | 0.89 | -114.72 |
| Signals | signal:r-nr-break | 38 | 16 (42 %) | 408 | 70 % | 0.73 | -240.07 |
| Signals | signal:r-session-trend | 40 | 12 (30 %) | 198 | 65 % | 0.52 | -304.15 |
| Signals | signal:r-vol-regime | 37 | 26 (70 %) | 120 | 76 % | 0.99 | -2.67 |
| Signals | signal:reclaim | 40 | 18 (45 %) | 727 | 75 % | 1.05 | 67.23 |
| Signals | signal:rsi-mid | 40 | 16 (40 %) | 553 | 71 % | 0.82 | -213.12 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 36 | 24 (67 %) | 94 | 71 % | 0.79 | -50.27 |
| Signals | signal:s2-active-hf | 40 | 10 (25 %) | 559 | 72 % | 0.73 | -351.68 |
| Signals | signal:s2-adx-gate | 40 | 22 (55 %) | 446 | 79 % | 1.06 | 48.10 |
| Signals | signal:s2-atr-break | 39 | 5 (13 %) | 328 | 56 % | 0.37 | -823.92 |
| Signals | signal:s2-bb-bounce | 40 | 31 (78 %) | 345 | 79 % | 1.84 | 392.46 |
| Signals | signal:s2-block-scale | 39 | 12 (31 %) | 521 | 73 % | 0.78 | -248.40 |
| Signals | signal:s2-block-stack | 36 | 10 (28 %) | 389 | 69 % | 0.68 | -321.31 |
| Signals | signal:s2-confluence | 40 | 17 (43 %) | 675 | 73 % | 0.99 | -13.45 |
| Signals | signal:s2-ema-cross | 26 | 13 (50 %) | 35 | 60 % | 0.22 | -117.39 |
| Signals | signal:s2-range-break | 34 | 27 (79 %) | 101 | 79 % | 1.48 | 61.94 |
| Signals | signal:s2-range-shift | 40 | 3 (8 %) | 266 | 52 % | 0.32 | -834.79 |
| Signals | signal:s2-rsi-revert | 38 | 31 (82 %) | 159 | 87 % | 2.62 | 224.82 |
| Signals | signal:s2-st-trail | 36 | 26 (72 %) | 135 | 80 % | 1.50 | 100.69 |
| Signals | signal:s2-stoch-swing | 40 | 38 (95 %) | 610 | 86 % | 3.18 | 1017.13 |
| Signals | signal:s2-vol-break | 39 | 13 (33 %) | 188 | 62 % | 0.63 | -221.77 |
| Signals | signal:s2-vwap-axis | 8 | 8 (100 %) | 17 | 100 % | ∞ (no loss) | 36.84 |
| Signals | signal:sar | 40 | 17 (43 %) | 676 | 72 % | 0.78 | -327.38 |
| Signals | signal:squeeze | 40 | 20 (50 %) | 111 | 73 % | 0.69 | -91.21 |
| Signals | signal:st-slow | 35 | 25 (71 %) | 149 | 73 % | 0.99 | -3.25 |
| Signals | signal:stoch-rsi | 40 | 30 (75 %) | 801 | 78 % | 1.44 | 499.05 |
| Signals | signal:supertrend | 38 | 20 (53 %) | 318 | 78 % | 1.09 | 51.30 |
| Signals | signal:swing | 39 | 7 (18 %) | 571 | 67 % | 0.56 | -670.99 |
| Signals | signal:thrust | 40 | 10 (25 %) | 631 | 69 % | 0.64 | -585.14 |
| Signals | signal:trix | 40 | 11 (28 %) | 276 | 74 % | 0.84 | -117.39 |
| Signals | signal:volume-break | 35 | 33 (94 %) | 70 | 93 % | 29.38 | 233.25 |
| Signals | signal:vwap | 40 | 17 (43 %) | 423 | 72 % | 0.92 | -65.07 |
| Signals | signal:williams-r | 40 | 27 (68 %) | 639 | 77 % | 1.39 | 411.21 |
| Signals | signal:zscore | 40 | 11 (28 %) | 338 | 74 % | 0.80 | -193.43 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 53267 | 49727 | 3658 | 0.83 | 4.00 | 72.92–163.33 (median 163.33) | 5752 | 25576 | 1061 | 7403 | 3421 | 83 | 2419 | 6 | 348 | 0 | 0 | 0 | 3540 |  |
| Short | 49014 | 44154 | 4150 | 1.35 | 2.42 | 163.33–163.33 (median 163.33) | 2892 | 6292 | 1944 | 8673 | 4910 | 2985 | 11558 | 95 | 645 | 10 | 0 | 0 | 4860 |  |
| General | 16781 | 14981 | 1090 | 1.38 | 2.49 | 163.33–163.33 (median 163.33) | 1145 | 1804 | 614 | 2995 | 1527 | 880 | 4662 | 0 | 223 | 41 | 0 | 0 | 1800 |  |
| Long | 22970 | 20720 | 1217 | 1.34 | 2.43 | 163.33–163.33 (median 163.33) | 1353 | 3462 | 878 | 4847 | 1985 | 850 | 5779 | 0 | 324 | 25 | 0 | 0 | 2250 |  |
| Wide | 69483 | 56610 | 306 | 0.63 | 2.34 | 18.00–163.33 (median 163.33) | 12036 | 37322 | 908 | 3678 | 938 | 309 | 879 | 0 | 214 | 20 | 0 | 10488 | 2385 |  |
| Signals | 2520 | – | 3666 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 2520 signal tapes, 3666 units (pair × symbol × direction) active at the run start, 5300 over the run; 2368 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 17749 | 2693 (15 %) | 28568 | 70 % | 0.46 | -6735.00 |
| Micro | trailing | 35518 | 5392 (15 %) | 57218 | 59 % | 0.44 | -12191.04 |
| Short | normal | 16331 | 5474 (34 %) | 65505 | 65 % | 1.23 | 16427.53 |
| Short | trailing | 32683 | 10311 (32 %) | 141056 | 60 % | 1.02 | 2490.36 |
| General | normal | 10046 | 3079 (31 %) | 30065 | 48 % | 1.17 | 7201.67 |
| General | trailing | 6735 | 2036 (30 %) | 17816 | 60 % | 1.03 | 708.90 |
| Long | normal | 13779 | 4158 (30 %) | 32793 | 49 % | 1.25 | 16722.67 |
| Long | trailing | 9191 | 2529 (28 %) | 17799 | 60 % | 0.99 | -380.54 |
| Wide | axis | 58995 | 10825 (18 %) | 333563 | 31 % | 0.70 | -66814.22 |
| Wide | dca | 5244 | 1508 (29 %) | 28195 | 67 % | 0.85 | -5545.68 |
| Wide | dca-active | 5244 | 912 (17 %) | 16684 | 38 % | 0.69 | -4221.70 |
| Signals | normal | 630 | 432 (69 %) | 11960 | 80 % | 1.28 | 6761.50 |
| Signals | trailing | 1890 | 1451 (77 %) | 37443 | 79 % | 1.62 | 30764.52 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 3658 | 562 (15 %) | 8516 | 68 % | 0.40 | -2607.85 |
| Short | active | 62 | 2 (3 %) | 6 | 33 % | 0.52 | -4.60 |
| Short | bollinger | 329 | 33 (10 %) | 183 | 75 % | 1.39 | 67.16 |
| Short | break | 350 | 155 (44 %) | 1500 | 73 % | 1.65 | 824.67 |
| Short | channel | 59 | 32 (54 %) | 48 | 67 % | 1.60 | 18.39 |
| Short | direction | 168 | 29 (17 %) | 429 | 65 % | 1.22 | 96.61 |
| Short | ema | 136 | 12 (9 %) | 180 | 42 % | 0.72 | -78.73 |
| Short | ichimoku | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 220 | 36 (16 %) | 315 | 66 % | 1.15 | 49.72 |
| Short | move | 490 | 231 (47 %) | 1526 | 68 % | 1.32 | 420.10 |
| Short | osc | 870 | 474 (54 %) | 4556 | 69 % | 1.54 | 1875.88 |
| Short | rsi | 636 | 8 (1 %) | 255 | 49 % | 0.52 | -164.59 |
| Short | sar | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 4.45 |
| Short | smooth | 113 | 91 (81 %) | 97 | 94 % | 13.26 | 306.43 |
| Short | trend | 214 | 148 (69 %) | 1210 | 73 % | 2.53 | 1072.72 |
| Short | volume | 498 | 60 (12 %) | 814 | 55 % | 0.77 | -203.43 |
| General | active | 23 | 0 (0 %) | 16 | 38 % | 0.88 | -3.20 |
| General | bollinger | 96 | 4 (4 %) | 69 | 49 % | 1.26 | 21.00 |
| General | break | 37 | 15 (41 %) | 227 | 58 % | 1.20 | 62.89 |
| General | channel | 28 | 0 (0 %) | 46 | 17 % | 0.14 | -99.57 |
| General | direction | 54 | 8 (15 %) | 191 | 45 % | 0.76 | -72.66 |
| General | ema | 38 | 14 (37 %) | 56 | 43 % | 1.11 | 9.13 |
| General | ichimoku | 2 | 2 (100 %) | 4 | 100 % | ∞ (no loss) | 16.00 |
| General | macd | 39 | 9 (23 %) | 36 | 64 % | 2.07 | 33.47 |
| General | move | 123 | 42 (34 %) | 198 | 52 % | 0.97 | -6.57 |
| General | osc | 172 | 84 (49 %) | 631 | 65 % | 1.98 | 540.71 |
| General | rsi | 224 | 0 (0 %) | 4 | 0 % | 0.00 | -17.30 |
| General | smooth | 51 | 47 (92 %) | 55 | 89 % | 10.28 | 165.19 |
| General | trend | 58 | 41 (71 %) | 369 | 62 % | 1.40 | 167.69 |
| General | volume | 145 | 8 (6 %) | 179 | 49 % | 0.75 | -79.17 |
| Long | active | 17 | 1 (6 %) | 1 | 100 % | ∞ (no loss) | 1.04 |
| Long | bollinger | 44 | 0 (0 %) | 8 | 25 % | 0.37 | -20.90 |
| Long | break | 60 | 13 (22 %) | 172 | 55 % | 1.03 | 13.20 |
| Long | channel | 27 | 0 (0 %) | 5 | 0 % | 0.00 | -25.60 |
| Long | direction | 85 | 25 (29 %) | 199 | 57 % | 1.74 | 207.39 |
| Long | ema | 12 | 9 (75 %) | 36 | 69 % | 2.28 | 67.86 |
| Long | ichimoku | 2 | 2 (100 %) | 4 | 100 % | ∞ (no loss) | 20.80 |
| Long | macd | 80 | 7 (9 %) | 125 | 52 % | 1.09 | 24.31 |
| Long | move | 149 | 16 (11 %) | 46 | 54 % | 0.50 | -55.90 |
| Long | osc | 162 | 89 (55 %) | 291 | 88 % | 9.40 | 1095.76 |
| Long | rsi | 171 | 3 (2 %) | 20 | 15 % | 0.05 | -74.70 |
| Long | sar | 5 | 3 (60 %) | 15 | 53 % | 1.23 | 6.75 |
| Long | smooth | 83 | 50 (60 %) | 64 | 81 % | 3.79 | 160.05 |
| Long | trend | 70 | 25 (36 %) | 153 | 65 % | 1.98 | 210.79 |
| Long | volume | 250 | 21 (8 %) | 249 | 55 % | 1.20 | 110.78 |
| Wide | active | 22 | 0 (0 %) | 9 | 0 % | 0.00 | -6.30 |
| Wide | bollinger | 36 | 18 (50 %) | 315 | 45 % | 1.09 | 10.73 |
| Wide | break | 39 | 9 (23 %) | 48 | 44 % | 0.78 | -5.07 |
| Wide | channel | 16 | 0 (0 %) | 247 | 27 % | 0.43 | -90.72 |
| Wide | direction | 9 | 0 (0 %) | 30 | 40 % | 0.65 | -7.31 |
| Wide | macd | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 47 | 13 (28 %) | 32 | 69 % | 2.74 | 17.35 |
| Wide | osc | 113 | 24 (21 %) | 357 | 45 % | 1.11 | 15.54 |
| Wide | rsi | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -2.69 |
| Wide | smooth | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.91 |
| Wide | volume | 15 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Signals | signal:act-burst | 38 | 25 (66 %) | 343 | 79 % | 1.18 | 106.71 |
| Signals | signal:act-hf | 39 | 19 (49 %) | 537 | 71 % | 0.76 | -274.14 |
| Signals | signal:adx | 38 | 15 (39 %) | 312 | 71 % | 0.88 | -86.18 |
| Signals | signal:atr-break | 40 | 25 (63 %) | 408 | 76 % | 1.16 | 116.51 |
| Signals | signal:bollinger | 40 | 19 (48 %) | 419 | 76 % | 0.95 | -47.35 |
| Signals | signal:cci | 40 | 15 (38 %) | 549 | 75 % | 1.06 | 70.16 |
| Signals | signal:cmf | 40 | 11 (28 %) | 481 | 67 % | 0.62 | -518.70 |
| Signals | signal:donchian | 39 | 14 (36 %) | 350 | 71 % | 0.80 | -156.58 |
| Signals | signal:ema-cross | 40 | 2 (5 %) | 241 | 67 % | 0.52 | -383.68 |
| Signals | signal:ema-cross-fast | 40 | 6 (15 %) | 488 | 74 % | 0.76 | -276.75 |
| Signals | signal:ema-pullback | 37 | 12 (32 %) | 575 | 74 % | 0.84 | -183.81 |
| Signals | signal:ema-slope | 38 | 8 (21 %) | 254 | 70 % | 0.49 | -371.76 |
| Signals | signal:ema-trend | 40 | 10 (25 %) | 504 | 70 % | 0.67 | -426.37 |
| Signals | signal:heikin-ashi | 40 | 15 (38 %) | 675 | 69 % | 0.67 | -552.01 |
| Signals | signal:hma | 40 | 20 (50 %) | 533 | 75 % | 1.08 | 75.27 |
| Signals | signal:ichimoku | 35 | 30 (86 %) | 258 | 82 % | 1.55 | 184.07 |
| Signals | signal:impulse | 40 | 18 (45 %) | 459 | 75 % | 0.97 | -29.85 |
| Signals | signal:kama | 40 | 16 (40 %) | 732 | 75 % | 0.88 | -169.31 |
| Signals | signal:keltner | 40 | 29 (73 %) | 227 | 80 % | 1.97 | 237.33 |
| Signals | signal:macd-cross | 40 | 20 (50 %) | 544 | 78 % | 1.00 | 0.18 |
| Signals | signal:macd-hist | 40 | 17 (43 %) | 631 | 75 % | 0.94 | -74.34 |
| Signals | signal:macd-slow | 40 | 10 (25 %) | 481 | 72 % | 0.67 | -405.03 |
| Signals | signal:mfi | 40 | 37 (93 %) | 149 | 86 % | 2.79 | 277.45 |
| Signals | signal:obv | 40 | 38 (95 %) | 584 | 84 % | 2.38 | 713.26 |
| Signals | signal:r-awesome | 38 | 14 (37 %) | 344 | 63 % | 0.56 | -453.90 |
| Signals | signal:r-connors | 37 | 17 (46 %) | 253 | 70 % | 0.60 | -266.59 |
| Signals | signal:r-fractal | 40 | 0 (0 %) | 195 | 47 % | 0.18 | -871.58 |
| Signals | signal:r-inside | 21 | 2 (10 %) | 50 | 48 % | 0.12 | -224.34 |
| Signals | signal:r-linreg | 40 | 16 (40 %) | 530 | 73 % | 0.89 | -114.72 |
| Signals | signal:r-nr-break | 38 | 16 (42 %) | 408 | 70 % | 0.73 | -240.07 |
| Signals | signal:r-session-trend | 40 | 12 (30 %) | 198 | 65 % | 0.52 | -304.15 |
| Signals | signal:r-vol-regime | 37 | 26 (70 %) | 120 | 76 % | 0.99 | -2.67 |
| Signals | signal:reclaim | 40 | 18 (45 %) | 727 | 75 % | 1.05 | 67.23 |
| Signals | signal:rsi-mid | 40 | 16 (40 %) | 553 | 71 % | 0.82 | -213.12 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 36 | 24 (67 %) | 94 | 71 % | 0.79 | -50.27 |
| Signals | signal:s2-active-hf | 40 | 10 (25 %) | 559 | 72 % | 0.73 | -351.68 |
| Signals | signal:s2-adx-gate | 40 | 22 (55 %) | 446 | 79 % | 1.06 | 48.10 |
| Signals | signal:s2-atr-break | 39 | 5 (13 %) | 328 | 56 % | 0.37 | -823.92 |
| Signals | signal:s2-bb-bounce | 40 | 31 (78 %) | 345 | 79 % | 1.84 | 392.46 |
| Signals | signal:s2-block-scale | 39 | 12 (31 %) | 521 | 73 % | 0.78 | -248.40 |
| Signals | signal:s2-block-stack | 36 | 10 (28 %) | 389 | 69 % | 0.68 | -321.31 |
| Signals | signal:s2-confluence | 40 | 17 (43 %) | 675 | 73 % | 0.99 | -13.45 |
| Signals | signal:s2-ema-cross | 26 | 13 (50 %) | 35 | 60 % | 0.22 | -117.39 |
| Signals | signal:s2-range-break | 34 | 27 (79 %) | 101 | 79 % | 1.48 | 61.94 |
| Signals | signal:s2-range-shift | 40 | 3 (8 %) | 266 | 52 % | 0.32 | -834.79 |
| Signals | signal:s2-rsi-revert | 38 | 31 (82 %) | 159 | 87 % | 2.62 | 224.82 |
| Signals | signal:s2-st-trail | 36 | 26 (72 %) | 135 | 80 % | 1.50 | 100.69 |
| Signals | signal:s2-stoch-swing | 40 | 38 (95 %) | 610 | 86 % | 3.18 | 1017.13 |
| Signals | signal:s2-vol-break | 39 | 13 (33 %) | 188 | 62 % | 0.63 | -221.77 |
| Signals | signal:s2-vwap-axis | 8 | 8 (100 %) | 17 | 100 % | ∞ (no loss) | 36.84 |
| Signals | signal:sar | 40 | 17 (43 %) | 676 | 72 % | 0.78 | -327.38 |
| Signals | signal:squeeze | 40 | 20 (50 %) | 111 | 73 % | 0.69 | -91.21 |
| Signals | signal:st-slow | 35 | 25 (71 %) | 149 | 73 % | 0.99 | -3.25 |
| Signals | signal:stoch-rsi | 40 | 30 (75 %) | 801 | 78 % | 1.44 | 499.05 |
| Signals | signal:supertrend | 38 | 20 (53 %) | 318 | 78 % | 1.09 | 51.30 |
| Signals | signal:swing | 39 | 7 (18 %) | 571 | 67 % | 0.56 | -670.99 |
| Signals | signal:thrust | 40 | 10 (25 %) | 631 | 69 % | 0.64 | -585.14 |
| Signals | signal:trix | 40 | 11 (28 %) | 276 | 74 % | 0.84 | -117.39 |
| Signals | signal:volume-break | 35 | 33 (94 %) | 70 | 93 % | 29.38 | 233.25 |
| Signals | signal:vwap | 40 | 17 (43 %) | 423 | 72 % | 0.92 | -65.07 |
| Signals | signal:williams-r | 40 | 27 (68 %) | 639 | 77 % | 1.39 | 411.21 |
| Signals | signal:zscore | 40 | 11 (28 %) | 338 | 74 % | 0.80 | -193.43 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 2 | 0 (0 %) | 6 | 67 % | 0.26 | -4.50 |
| Micro | 1.25 | 2 | 0 (0 %) | 6 | 67 % | 0.26 | -4.50 |
| Micro | 1.35 | 2 | 0 (0 %) | 6 | 67 % | 0.26 | -4.50 |
| Micro | 1.5 | 2 | 0 (0 %) | 6 | 67 % | 0.26 | -4.50 |
| Micro | 1.75 | 2 | 0 (0 %) | 6 | 67 % | 0.26 | -4.50 |
| Short | 1.1 | 1484 | 872 (59 %) | 9401 | 67 % | 1.39 | 3102.85 |
| Short | 1.25 | 1348 | 801 (59 %) | 8370 | 67 % | 1.41 | 2860.07 |
| Short | 1.35 | 1250 | 742 (59 %) | 7463 | 68 % | 1.44 | 2712.59 |
| Short | 1.5 | 1044 | 604 (58 %) | 5884 | 68 % | 1.44 | 2131.95 |
| Short | 1.75 | 670 | 379 (57 %) | 3388 | 67 % | 1.41 | 1118.41 |
| Short | 2 | 370 | 190 (51 %) | 1471 | 66 % | 1.20 | 265.44 |
| General | 1.1 | 259 | 146 (56 %) | 1524 | 55 % | 1.22 | 421.79 |
| General | 1.25 | 232 | 127 (55 %) | 1264 | 55 % | 1.22 | 344.95 |
| General | 1.35 | 207 | 110 (53 %) | 1109 | 54 % | 1.17 | 242.03 |
| General | 1.5 | 165 | 88 (53 %) | 760 | 56 % | 1.24 | 229.46 |
| General | 1.75 | 95 | 54 (57 %) | 295 | 58 % | 1.41 | 136.61 |
| General | 2 | 37 | 21 (57 %) | 105 | 56 % | 1.45 | 52.48 |
| Long | 1.1 | 247 | 137 (55 %) | 874 | 65 % | 1.88 | 1207.78 |
| Long | 1.25 | 216 | 116 (54 %) | 669 | 65 % | 1.85 | 874.90 |
| Long | 1.35 | 196 | 103 (53 %) | 554 | 66 % | 1.95 | 783.37 |
| Long | 1.5 | 158 | 80 (51 %) | 398 | 66 % | 2.04 | 583.89 |
| Long | 1.75 | 83 | 34 (41 %) | 140 | 69 % | 1.98 | 186.44 |
| Long | 2 | 54 | 23 (43 %) | 90 | 76 % | 2.36 | 143.09 |
| Wide | 1.1 | 57 | 45 (79 %) | 552 | 48 % | 1.17 | 36.28 |
| Wide | 1.25 | 57 | 45 (79 %) | 552 | 48 % | 1.17 | 36.28 |
| Wide | 1.35 | 57 | 45 (79 %) | 552 | 48 % | 1.17 | 36.28 |
| Wide | 1.5 | 54 | 42 (78 %) | 546 | 48 % | 1.16 | 34.12 |
| Wide | 1.75 | 6 | 3 (50 %) | 18 | 33 % | 0.37 | -6.14 |
| Wide | 2 | 6 | 3 (50 %) | 18 | 33 % | 0.37 | -6.14 |
| Signals | 1.1 | 1069 | 475 (44 %) | 11009 | 75 % | 0.90 | -2242.33 |
| Signals | 1.25 | 744 | 325 (44 %) | 8048 | 76 % | 0.90 | -1561.36 |
| Signals | 1.35 | 600 | 260 (43 %) | 6703 | 76 % | 0.92 | -1099.26 |
| Signals | 1.5 | 405 | 168 (41 %) | 4927 | 76 % | 0.92 | -768.75 |
| Signals | 1.75 | 218 | 93 (43 %) | 3043 | 76 % | 0.93 | -355.38 |
| Signals | 2 | 135 | 50 (37 %) | 2045 | 75 % | 0.87 | -458.05 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | magnet | mc-mrsi2-10@m5 | 64 | 64 (100 %) | 256 | 81 % | 15.50 | 80.78 | – |
| Micro | pivot | mc-lag-12@m15 | 36 | 36 (100 %) | 144 | 89 % | 22.07 | 34.75 | – |
| Micro | pulse | mc-lag-6@m5 | 22 | 22 (100 %) | 88 | 100 % | ∞ (no loss) | 33.20 | – |
| Micro | clamp | mc-bbx-25@m15c | 74 | 74 (100 %) | 74 | 100 % | ∞ (no loss) | 25.70 | – |
| Micro | pivot | mc-rsit9-20@m15c | 76 | 76 (100 %) | 76 | 100 % | ∞ (no loss) | 22.60 | – |
| Micro | ribbon | mc-trsi2-10@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 5.20 | – |
| Micro | ribbon | mc-lag-12@m15 | 2 | 2 (100 %) | 8 | 75 % | 4.29 | 1.15 | – |
| Micro | pivot | mc-tmom-5@m5 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 0.80 | – |
| Micro | sweep | mc-streak-6@m5 | 2 | 0 (0 %) | 6 | 67 % | 0.26 | -4.50 | – |
| Micro | sweep | mc-z-20@m5c | 3 | 0 (0 %) | 9 | 67 % | 0.26 | -6.75 | – |
| Micro | clamp | mc-rsi2-5@m5 | 26 | 0 (0 %) | 156 | 72 % | 0.52 | -35.57 | tp0.6 sl1.65 tr0.3 h192 mc (6 · 0.99 · -0.02) |
| Micro | revert | mc-tpull-13@m5c | 322 | 132 (41 %) | 1926 | 74 % | 0.87 | -82.49 | tp0.6 sl3 tr0.3 h192 mc (5 · 11.54 · 2.11) |
| Micro | clamp | mc-lag-12@m15 | 112 | 38 (34 %) | 336 | 75 % | 0.46 | -82.98 | – |
| Micro | magnet | mc-irsi2-10@m5 | 69 | 0 (0 %) | 345 | 61 % | 0.42 | -123.19 | tp0.6 sl1.65 tr0.45 h192 mc (5 · 0.74 · -0.52) |
| Micro | pulse | mc-rsi2-5@m5 | 118 | 0 (0 %) | 354 | 51 % | 0.18 | -237.15 | – |
| Micro | snap | mc-rsi2-5@m5 | 120 | 0 (0 %) | 360 | 50 % | 0.17 | -241.00 | – |
| Micro | ribbon | mc-rsi3-5@m5 | 238 | 30 (13 %) | 1190 | 72 % | 0.38 | -321.30 | tp0.45 sl1.575 tr0.225 h192 mc (5 · 3.03 · 0.67) |
| Micro | clamp | mc-rsi3-5@m5 | 238 | 30 (13 %) | 1190 | 72 % | 0.38 | -321.30 | tp0.45 sl1.575 tr0.225 h192 mc (5 · 3.03 · 0.67) |
| Micro | pivot | mc-rsi3-5@m5 | 238 | 30 (13 %) | 1190 | 72 % | 0.38 | -321.30 | tp0.45 sl1.575 tr0.225 h192 mc (5 · 3.03 · 0.67) |
| Micro | sweep | mc-rsi4-10@m5 | 69 | 0 (0 %) | 345 | 26 % | 0.06 | -466.38 | tp0.6 sl2.1 tr0.3 h192 mc (5 · 0.08 · -4.44) |
| Micro | sweep | mc-rsi5-10@m5 | 144 | 0 (0 %) | 432 | 33 % | 0.08 | -566.05 | – |
| Short | revert | trend-ema-50-200@m15c | 29 | 25 (86 %) | 672 | 73 % | 2.33 | 516.52 | tp2.6 sl5.2 tr0 h64 sh (22 · 7.33 · 41.45) |
| Short | revert | break-retest@m15c | 19 | 19 (100 %) | 250 | 86 % | 10.81 | 415.40 | tp2.2 sl3.3 tr1.65 h96 sh (15 · 143.44 · 25.80) |
| Short | pivot | willr-50-95@m15 | 43 | 42 (98 %) | 423 | 75 % | 4.21 | 358.86 | tp2.8 sl5.6 tr0 h64 sh (6 · ∞ (no loss) · 15.60) |
| Short | ribbon | hma-55@m15c | 91 | 91 (100 %) | 91 | 100 % | ∞ (no loss) | 331.43 | – |
| Short | follow | r-ultimate@m15 | 24 | 24 (100 %) | 478 | 72 % | 1.95 | 322.09 | tp2.4 sl4.8 tr1.2 h64 sh (17 · 6.40 · 26.98) |
| Short | revert | trend-ema-50-200@m30 | 16 | 14 (88 %) | 364 | 71 % | 2.20 | 261.92 | tp2.8 sl5.6 tr2.1 h32 sh (20 · 3.16 · 26.61) |
| Short | clamp | willr-50-80@m15c | 23 | 22 (96 %) | 388 | 73 % | 1.77 | 245.88 | tp2.6 sl3.9 tr0 h64 sh (17 · 2.73 · 21.30) |
| Short | magnet | r-pin-m@m15 | 106 | 106 (100 %) | 106 | 100 % | ∞ (no loss) | 223.60 | – |
| Short | ribbon | trend-st@m15c | 70 | 65 (93 %) | 94 | 74 % | 5.77 | 219.90 | – |
| Short | sweep | willr-14-95@m30 | 53 | 53 (100 %) | 149 | 100 % | ∞ (no loss) | 185.43 | – |
| Short | sweep | willr-21-95@m15 | 18 | 18 (100 %) | 94 | 89 % | 32.85 | 166.45 | tp2.6 sl3.9 tr0 h96 sh (5 · ∞ (no loss) · 12.00) |
| Short | pivot | cci-40-200@x4@m15 | 29 | 29 (100 %) | 87 | 100 % | ∞ (no loss) | 160.70 | – |
| Short | ribbon | macd-cross-19-39-9@m30 | 21 | 21 (100 %) | 95 | 98 % | 383.79 | 144.41 | tp2 sl4 tr0 h32 sh (5 · ∞ (no loss) · 9.00) |
| Short | revert | move-impulse-20-2.5@m15c | 23 | 15 (65 %) | 677 | 64 % | 1.22 | 140.22 | tp2.8 sl5.6 tr1.4 h64 sh (28 · 3.25 · 27.61) |
| Short | sweep | r-sweep@m15 | 28 | 28 (100 %) | 109 | 85 % | 92.60 | 121.52 | tp1.8 sl2.7 tr0.9 h64 sh (6 · 18.75 · 2.91) |
| Short | clamp | bb-bounce@m15c | 26 | 26 (100 %) | 152 | 81 % | 2.06 | 120.16 | tp2.2 sl3.3 tr0 h64 sh (6 · 2.86 · 6.50) |
| Short | clamp | z-20-2@m15c | 26 | 26 (100 %) | 152 | 81 % | 2.06 | 120.16 | tp2.2 sl3.3 tr0 h64 sh (6 · 2.86 · 6.50) |
| Short | pivot | willr-28-95@m15c | 24 | 22 (92 %) | 122 | 70 % | 10.33 | 96.48 | tp1.8 sl2.7 tr0 h64 sh (6 · ∞ (no loss) · 9.60) |
| Short | revert | r-chop@m30 | 61 | 29 (48 %) | 502 | 64 % | 1.20 | 95.80 | tp2.4 sl4.8 tr0 h32 sh (6 · ∞ (no loss) · 13.20) |
| Short | revert | break-vol-2@m15c | 8 | 8 (100 %) | 46 | 96 % | 12.82 | 93.39 | tp2.4 sl4.8 tr0 h96 sh (7 · ∞ (no loss) · 15.40) |
| Short | sweep | willr-50-90@m15 | 8 | 6 (75 %) | 140 | 64 % | 1.91 | 90.48 | tp2.8 sl5.6 tr1.4 h96 sh (16 · 38.08 · 24.66) |
| Short | sweep | willr-50-90@m15c | 11 | 8 (73 %) | 136 | 68 % | 1.65 | 88.00 | tp2.6 sl5.2 tr0 h96 sh (8 · ∞ (no loss) · 19.20) |
| Short | revert | r-fractal-m@m30 | 7 | 7 (100 %) | 151 | 79 % | 1.50 | 79.31 | tp2.6 sl5.2 tr0 h32 sh (21 · 1.89 · 19.20) |
| Short | ribbon | trend-ribbon@m15c | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 77.64 | – |
| Short | revert | break-don55@m30 | 4 | 3 (75 %) | 61 | 84 % | 2.89 | 76.90 | tp2.8 sl5.6 tr0 h32 sh (14 · 5.83 · 28.00) |
| Short | ribbon | dir-thrust-4@m15 | 10 | 10 (100 %) | 70 | 86 % | 3.76 | 66.87 | tp1.8 sl3.6 tr0.9 h64 sh (7 · ∞ (no loss) · 10.93) |
| Short | pivot | willr-50-80@m15c | 13 | 10 (77 %) | 317 | 68 % | 1.24 | 66.59 | tp2.4 sl3.6 tr0 h64 sh (23 · 1.64 · 14.60) |
| Short | pivot | willr-28-95@m15 | 17 | 13 (76 %) | 86 | 70 % | 4.31 | 62.59 | tp1.8 sl2.7 tr0 h64 sh (6 · ∞ (no loss) · 9.60) |
| Short | pivot | z-50-2.5@m15c | 9 | 9 (100 %) | 72 | 81 % | 2.57 | 54.15 | tp2 sl4 tr0 h64 sh (8 · 3.00 · 8.40) |
| Short | magnet | willr-21-90@m15c | 21 | 19 (90 %) | 53 | 68 % | 2.39 | 53.41 | – |
| Short | pivot | cci-40-200@m15c | 9 | 7 (78 %) | 107 | 72 % | 1.55 | 43.56 | tp2 sl4 tr0 h96 sh (11 · 1.93 · 7.80) |
| Short | revert | break-vol-2@m30 | 4 | 4 (100 %) | 26 | 88 % | 6.19 | 41.58 | tp2.4 sl4.8 tr0 h48 sh (7 · ∞ (no loss) · 15.40) |
| Short | revert | r-pdhl-m@m15c | 12 | 12 (100 %) | 41 | 100 % | ∞ (no loss) | 41.13 | – |
| Short | ribbon | aroon-14@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 40.00 | – |
| Short | revert | r-klinger-m@m15c | 11 | 5 (45 %) | 45 | 73 % | 2.50 | 39.47 | tp1.8 sl2.7 tr0.9 h64 sh (5 · 0.83 · -0.50) |
| Short | ribbon | willr-28-95@m15c | 11 | 11 (100 %) | 70 | 69 % | 3.13 | 36.91 | tp2 sl3 tr1.5 h96 sh (8 · ∞ (no loss) · 6.83) |
| Short | sweep | willr-21-95@m15c | 12 | 12 (100 %) | 25 | 92 % | 115.77 | 36.52 | – |
| Short | revert | break-don40@m15c | 2 | 2 (100 %) | 31 | 81 % | 2.23 | 35.80 | tp2.8 sl5.6 tr0 h64 sh (15 · 2.91 · 22.20) |
| Short | sweep | r-vol-regime@m15 | 40 | 28 (70 %) | 40 | 70 % | 2.56 | 34.02 | – |
| Short | sweep | willr-14-95@m15 | 3 | 3 (100 %) | 13 | 100 % | ∞ (no loss) | 32.80 | tp2.6 sl5.2 tr0 h96 sh (5 · ∞ (no loss) · 12.00) |
| Short | revert | r-session-trend@m15c | 2 | 2 (100 %) | 32 | 81 % | 1.94 | 32.80 | tp2.8 sl5.6 tr0 h64 sh (16 · 1.94 · 16.40) |
| Short | sweep | willr-50-95@m15 | 5 | 5 (100 %) | 40 | 88 % | 64.62 | 32.74 | tp2.8 sl5.6 tr1.4 h64 sh (8 · 335.85 · 11.98) |
| Short | pivot | r-pin@m15 | 7 | 7 (100 %) | 14 | 100 % | ∞ (no loss) | 31.00 | – |
| Short | pivot | cci-20-200@m15c | 14 | 14 (100 %) | 70 | 77 % | 1.52 | 28.21 | tp1.8 sl2.7 tr0 h64 sh (5 · 2.21 · 3.50) |
| Short | revert | break-don55@m15c | 1 | 1 (100 %) | 14 | 93 % | 5.83 | 28.00 | tp2.8 sl5.6 tr0 h64 sh (14 · 5.83 · 28.00) |
| Short | follow | r-fisher-m@m15c | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 27.10 | – |
| Short | sweep | r-td@m30 | 64 | 36 (56 %) | 325 | 70 % | 1.10 | 26.42 | tp2.8 sl5.6 tr1.4 h32 sh (5 · 19.55 · 3.71) |
| Short | pivot | z-50-2.5@x4@m15 | 8 | 8 (100 %) | 16 | 100 % | ∞ (no loss) | 24.77 | – |
| Short | pivot | r-zdist@m15c | 8 | 8 (100 %) | 67 | 72 % | 1.44 | 24.73 | tp2 sl4 tr1 h64 sh (7 · 2.06 · 4.45) |
| Short | ribbon | willr-7-90@m30 | 6 | 4 (67 %) | 24 | 83 % | 7.22 | 24.48 | tp2.6 sl3.9 tr1.3 h48 sh (5 · 1.00 · -0.01) |
| Short | clamp | r-zdist@m15c | 18 | 14 (78 %) | 52 | 69 % | 1.35 | 21.20 | – |
| Short | revert | break-vol@m15c | 3 | 3 (100 %) | 18 | 83 % | 2.24 | 21.00 | tp2.8 sl5.6 tr0 h64 sh (6 · 2.24 · 7.20) |
| Short | clamp | z-50-2.5@m15c | 19 | 11 (58 %) | 70 | 71 % | 1.35 | 18.86 | – |
| Short | sweep | willr-28-90@m15c | 1 | 1 (100 %) | 8 | 100 % | ∞ (no loss) | 17.60 | tp2.4 sl4.8 tr0 h96 sh (8 · ∞ (no loss) · 17.60) |
| Short | magnet | r-zdist@m15 | 6 | 6 (100 %) | 29 | 69 % | 1.64 | 17.07 | tp2.6 sl2.6 tr1.3 h64 sh (5 · 2.64 · 4.59) |
| Short | pivot | willr-50-95@m15c | 3 | 3 (100 %) | 14 | 64 % | 33.87 | 16.90 | tp2.4 sl3.6 tr1.8 h64 sh (5 · 38.68 · 6.43) |
| Short | sweep | r-ultimate@m15 | 4 | 4 (100 %) | 24 | 71 % | 1.92 | 16.40 | tp2.4 sl3.6 tr0 h64 sh (6 · 2.89 · 7.20) |
| Short | revert | r-pdhl-m@m15 | 2 | 2 (100 %) | 16 | 94 % | 5.90 | 15.69 | tp2 sl4 tr1.5 h64 sh (8 · ∞ (no loss) · 10.55) |
| Short | pivot | r-cvd-div@m15 | 2 | 2 (100 %) | 36 | 72 % | 1.80 | 15.63 | tp1.8 sl3.6 tr1.35 h64 sh (17 · 2.25 · 9.81) |
| Short | revert | r-pdhl@m15c | 9 | 9 (100 %) | 18 | 100 % | ∞ (no loss) | 14.69 | – |
| Short | revert | break-don40@m30 | 1 | 1 (100 %) | 16 | 75 % | 1.77 | 13.60 | tp2.8 sl4.2 tr0 h32 sh (16 · 1.77 · 13.60) |
| Short | revert | r-bos@m30 | 1 | 1 (100 %) | 14 | 86 % | 2.57 | 13.20 | tp2 sl4 tr0 h48 sh (14 · 2.57 · 13.20) |
| Short | follow | rsi-extreme@m30 | 3 | 3 (100 %) | 32 | 69 % | 1.31 | 12.80 | tp2.8 sl4.2 tr0 h32 sh (10 · 2.36 · 12.00) |
| Short | clamp | willr-7-90@m30 | 12 | 10 (83 %) | 12 | 83 % | 3.85 | 12.54 | – |
| Short | ribbon | dir-thrust@m30 | 34 | 17 (50 %) | 281 | 59 % | 1.04 | 12.13 | tp2.4 sl4.8 tr1.8 h32 sh (8 · 2.60 · 8.17) |
| Short | sweep | willr-28-95@m15 | 2 | 2 (100 %) | 10 | 80 % | 37.35 | 11.57 | tp2.2 sl4.4 tr1.65 h64 sh (5 · 37.35 · 5.78) |
| Short | ribbon | r-ultimate@m15c | 9 | 8 (89 %) | 10 | 90 % | 6.12 | 11.26 | – |
| Short | pivot | mfi-14-20@m15c | 30 | 15 (50 %) | 71 | 66 % | 1.20 | 10.04 | – |
| Short | revert | r-pdhl-m@m30 | 2 | 2 (100 %) | 13 | 77 % | 1.65 | 7.85 | tp2.2 sl4.4 tr0 h48 sh (6 · 2.17 · 5.40) |
| Short | ribbon | willr-50-90@m15 | 1 | 1 (100 %) | 25 | 72 % | 1.27 | 6.03 | tp2.8 sl4.2 tr1.4 h96 sh (25 · 1.27 · 6.03) |
| Short | follow | cci-40-200@x4@m15 | 2 | 2 (100 %) | 8 | 50 % | 1.58 | 6.01 | – |
| Short | sweep | willr-50-80@m15c | 1 | 1 (100 %) | 15 | 73 % | 1.23 | 5.40 | tp2.8 sl5.6 tr0 h64 sh (15 · 1.23 · 5.40) |
| Short | revert | break-don20@m15c | 1 | 1 (100 %) | 21 | 71 % | 1.12 | 4.20 | tp2.8 sl5.6 tr0 h64 sh (21 · 1.12 · 4.20) |
| Short | sweep | willr-21-95@m30 | 1 | 1 (100 %) | 6 | 83 % | 23.04 | 3.76 | tp2.6 sl5.2 tr1.3 h32 sh (6 · 23.04 · 3.76) |
| Short | sweep | r-valuearea@m30 | 10 | 5 (50 %) | 8 | 63 % | 6.91 | 3.19 | – |
| Short | pivot | r-ultimate@m15 | 1 | 1 (100 %) | 8 | 88 % | 1.43 | 1.96 | tp2.2 sl4.4 tr1.1 h96 sh (8 · 1.43 · 1.96) |
| Short | ribbon | willr-21-95@m30 | 5 | 2 (40 %) | 16 | 69 % | 1.26 | 1.48 | – |
| Short | pivot | rsi-extreme@m15c | 7 | 3 (43 %) | 107 | 63 % | 1.01 | 1.12 | tp2.2 sl3.3 tr1.1 h64 sh (13 · 2.07 · 7.60) |
| Short | ribbon | willr-14-90@m30 | 2 | 1 (50 %) | 26 | 69 % | 1.07 | 1.05 | tp2.4 sl4.8 tr1.2 h48 sh (12 · 1.21 · 1.46) |
| Short | pivot | willr-21-90@m30 | 2 | 2 (100 %) | 12 | 33 % | 1.13 | 0.76 | tp1.8 sl3.6 tr0.9 h32 sh (6 · 1.13 · 0.38) |
| Short | revert | r-bos@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 0.50 | – |
| Short | pivot | r-cvd-div-m@m15c | 1 | 1 (100 %) | 9 | 56 % | 1.07 | 0.42 | tp1.8 sl1.8 tr1.35 h96 sh (9 · 1.07 · 0.42) |
| Short | ribbon | squeeze-20@m15 | 28 | 12 (43 %) | 20 | 60 % | 0.98 | -0.21 | – |
| Short | pivot | willr-50-90@m15 | 1 | 0 (0 %) | 14 | 57 % | 0.98 | -0.30 | tp2.8 sl4.2 tr1.4 h96 sh (14 · 0.98 · -0.30) |
| Short | follow | r-qh-rev@m30 | 2 | 0 (0 %) | 8 | 75 % | 0.93 | -0.81 | – |
| Short | ribbon | macd-hist-19-39-9@m15 | 3 | 2 (67 %) | 30 | 53 % | 0.97 | -1.00 | tp2.6 sl2.6 tr0 h64 sh (11 · 1.03 · 0.40) |
| Short | clamp | willr-50-95@m15 | 2 | 0 (0 %) | 14 | 43 % | 0.77 | -1.56 | tp2 sl3 tr1 h64 sh (7 · 0.77 · -0.78) |
| Short | revert | break-vol@m15 | 1 | 0 (0 %) | 9 | 67 % | 0.90 | -1.80 | tp2.8 sl5.6 tr0 h64 sh (9 · 0.90 · -1.80) |
| Short | revert | r-chop-m@m30 | 12 | 6 (50 %) | 36 | 67 % | 0.96 | -1.80 | – |
| Short | ribbon | cmf-20-0.05@m15 | 1 | 0 (0 %) | 8 | 63 % | 0.78 | -1.92 | tp2.8 sl4.2 tr1.4 h64 sh (8 · 0.78 · -1.92) |
| Short | revert | dir-thrust-4@m15c | 2 | 0 (0 %) | 42 | 62 % | 0.95 | -2.59 | tp2.4 sl3.6 tr1.2 h64 sh (21 · 0.95 · -1.30) |
| Short | ribbon | trend-st-21-3@m15c | 36 | 22 (61 %) | 58 | 59 % | 0.93 | -3.27 | – |
| Short | pivot | move-impulse-20-2.5@m15c | 2 | 1 (50 %) | 16 | 63 % | 0.86 | -4.14 | tp2.8 sl4.2 tr2.1 h96 sh (8 · 1.00 · 0.03) |
| Short | ribbon | r-ultimate@m15 | 7 | 3 (43 %) | 104 | 55 % | 0.96 | -4.26 | tp2.6 sl2.6 tr1.3 h64 sh (15 · 1.06 · 0.79) |
| Short | pivot | willr-50-90@m15c | 1 | 0 (0 %) | 14 | 57 % | 0.62 | -4.42 | tp2.4 sl3.6 tr1.2 h96 sh (14 · 0.62 · -4.42) |
| Short | clamp | r-cvd-div-m@m15c | 35 | 18 (51 %) | 123 | 50 % | 0.94 | -4.83 | tp1.8 sl1.8 tr0 h64 sh (5 · 0.53 · -2.80) |
| Short | clamp | r-ultimate@m15 | 2 | 0 (0 %) | 12 | 50 % | 0.50 | -6.03 | tp1.8 sl1.8 tr0.9 h64 sh (6 · 0.50 · -3.02) |
| Short | ribbon | r-ultimate@m30 | 7 | 2 (29 %) | 24 | 63 % | 0.80 | -6.34 | tp2.8 sl4.2 tr1.4 h48 sh (5 · 0.67 · -1.51) |
| Short | clamp | cci-40-200@m15c | 15 | 9 (60 %) | 82 | 63 % | 0.92 | -6.62 | tp2 sl4 tr0 h64 sh (5 · 1.71 · 3.00) |
| Short | magnet | r-cvd-div-m@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.43 | -6.80 | – |
| Short | pivot | bb-mid@m15 | 3 | 0 (0 %) | 12 | 58 % | 0.34 | -9.68 | – |
| Short | clamp | rsi-21-30-70@m15c | 3 | 0 (0 %) | 9 | 33 % | 0.19 | -11.01 | – |
| Short | ribbon | macd-hist-19-39-9@m15c | 41 | 12 (29 %) | 56 | 48 % | 0.81 | -14.21 | – |
| Short | clamp | srsi-14-10@m15 | 1 | 0 (0 %) | 24 | 63 % | 0.65 | -16.39 | tp2.8 sl5.6 tr1.4 h96 sh (24 · 0.65 · -16.39) |
| Short | clamp | z-50-2.5@m15 | 6 | 0 (0 %) | 36 | 61 % | 0.67 | -16.67 | tp2 sl4 tr0 h64 sh (6 · 0.86 · -1.20) |
| Short | sweep | rsi-fast@m15 | 2 | 0 (0 %) | 14 | 43 % | 0.24 | -17.08 | tp2.6 sl2.6 tr1.3 h64 sh (7 · 0.24 · -8.54) |
| Short | magnet | willr-28-90@m15c | 8 | 3 (38 %) | 29 | 38 % | 0.59 | -17.38 | – |
| Short | revert | r-awesome-m@m15c | 36 | 15 (42 %) | 70 | 47 % | 0.66 | -19.86 | – |
| Short | ribbon | r-camarilla-m@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -21.40 | – |
| Short | sweep | r-laguerre-m@m30 | 4 | 0 (0 %) | 20 | 40 % | 0.43 | -21.60 | tp2.2 sl2.2 tr0 h32 sh (6 · 0.42 · -5.60) |
| Short | clamp | rsi-extreme@m15c | 3 | 0 (0 %) | 24 | 38 % | 0.19 | -24.89 | tp2 sl4 tr1.5 h64 sh (6 · 0.24 · -6.51) |
| Short | ribbon | hma-55@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -25.00 | – |
| Short | pivot | willr-28-90@m30 | 15 | 5 (33 %) | 63 | 43 % | 0.67 | -25.32 | tp2 sl3 tr1 h32 sh (6 · 1.37 · 1.08) |
| Short | clamp | cci-20-200@m15c | 32 | 8 (25 %) | 96 | 63 % | 0.75 | -30.99 | – |
| Short | pivot | cci-40-200@m15 | 6 | 0 (0 %) | 88 | 60 % | 0.72 | -34.73 | tp2.2 sl3.3 tr1.65 h96 sh (16 · 0.80 · -4.30) |
| Short | ribbon | ema-slope@m15 | 25 | 6 (24 %) | 87 | 43 % | 0.73 | -36.37 | – |
| Short | clamp | rsi-fast@m15 | 4 | 0 (0 %) | 25 | 32 % | 0.21 | -36.94 | tp1.8 sl3.6 tr0 h96 sh (6 · 0.42 · -6.60) |
| Short | magnet | willr-50-90@m15 | 10 | 0 (0 %) | 44 | 36 % | 0.47 | -39.45 | tp1.8 sl1.8 tr0 h64 sh (5 · 0.20 · -6.40) |
| Short | ribbon | ema-slope@m15c | 27 | 6 (22 %) | 93 | 42 % | 0.71 | -42.37 | – |
| Short | sweep | r-bb-adx@m15 | 21 | 7 (33 %) | 19 | 37 % | 0.01 | -43.33 | – |
| Short | sweep | r-pin@m15 | 7 | 1 (14 %) | 42 | 40 % | 0.21 | -43.47 | tp2.2 sl3.3 tr1.1 h64 sh (5 · 0.34 · -2.33) |
| Short | clamp | mfi-14-20@m15 | 14 | 3 (21 %) | 54 | 48 % | 0.49 | -43.66 | tp1.8 sl2.7 tr0 h64 sh (5 · 0.37 · -5.50) |
| Short | pivot | willr-28-80@m15c | 4 | 0 (0 %) | 130 | 49 % | 0.68 | -43.83 | tp1.8 sl3.6 tr1.35 h64 sh (29 · 0.78 · -6.66) |
| Short | revert | r-qh-flow-m@m30 | 4 | 0 (0 %) | 150 | 59 % | 0.74 | -47.03 | tp2.8 sl4.2 tr1.4 h32 sh (34 · 0.96 · -1.64) |
| Short | ribbon | r-valuearea-m@m15 | 31 | 0 (0 %) | 15 | 0 % | 0.00 | -48.80 | – |
| Short | ribbon | obv-20@m30 | 13 | 3 (23 %) | 189 | 59 % | 0.82 | -50.45 | tp2.6 sl5.2 tr1.3 h48 sh (14 · 1.19 · 3.14) |
| Short | revert | r-orb-m@m30 | 7 | 0 (0 %) | 63 | 62 % | 0.53 | -52.18 | tp2.2 sl4.4 tr1.1 h32 sh (9 · 0.58 · -5.82) |
| Short | sweep | mfi-14-10@m15 | 34 | 8 (24 %) | 94 | 39 % | 0.28 | -55.87 | – |
| Short | magnet | willr-50-80@m15c | 16 | 0 (0 %) | 114 | 49 % | 0.63 | -61.53 | tp2.4 sl2.4 tr1.2 h64 sh (8 · 0.88 · -0.96) |
| Short | magnet | willr-50-90@m15c | 36 | 8 (22 %) | 128 | 46 % | 0.66 | -64.35 | – |
| Short | follow | r-rsi2-m@m15c | 16 | 0 (0 %) | 18 | 0 % | 0.00 | -66.00 | – |
| Short | revert | r-chop@m15 | 4 | 0 (0 %) | 60 | 40 % | 0.31 | -74.81 | tp2.4 sl3.6 tr0 h96 sh (14 · 0.58 · -11.20) |
| Short | sweep | macd-cross-19-39-9@m15 | 10 | 1 (10 %) | 134 | 53 % | 0.63 | -79.47 | tp2 sl4 tr0 h64 sh (15 · 1.04 · 0.67) |
| Short | revert | r-chop-m@m15 | 14 | 0 (0 %) | 24 | 8 % | 0.01 | -85.27 | – |
| Short | sweep | r-pin-m@m15 | 21 | 4 (19 %) | 65 | 17 % | 0.02 | -130.77 | tp2.6 sl2.6 tr1.3 h64 sh (5 · 0.02 · -11.00) |
| Short | clamp | cci-40-200@m15 | 18 | 0 (0 %) | 132 | 41 % | 0.30 | -214.00 | tp2.2 sl3.3 tr0 h64 sh (9 · 0.46 · -9.50) |
| General | ribbon | hma-55@m15c | 40 | 40 (100 %) | 40 | 100 % | ∞ (no loss) | 145.99 | – |
| General | pivot | cci-40-200@x4@m15 | 11 | 11 (100 %) | 32 | 100 % | ∞ (no loss) | 94.45 | – |
| General | sweep | willr-21-95@m15 | 8 | 8 (100 %) | 32 | 97 % | 34.54 | 87.21 | tp3.2 sl2.4 tr0 h96 gn (5 · 4.62 · 9.40) |
| General | sweep | willr-50-90@m30 | 5 | 5 (100 %) | 47 | 77 % | 3.36 | 85.10 | tp4 sl4 tr0 h48 gn (8 · 6.33 · 22.40) |
| General | sweep | willr-14-95@m15 | 6 | 6 (100 %) | 22 | 100 % | ∞ (no loss) | 70.68 | – |
| General | ribbon | trend-ribbon@m15c | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 53.30 | – |
| General | magnet | r-pin-m@m15 | 30 | 28 (93 %) | 30 | 93 % | 9.02 | 51.35 | – |
| General | sweep | willr-50-90@m15c | 5 | 5 (100 %) | 60 | 63 % | 1.81 | 50.01 | tp3.2 sl3.2 tr0 h64 gn (10 · 3.53 · 17.20) |
| General | revert | break-don55@m15c | 4 | 4 (100 %) | 62 | 61 % | 1.54 | 46.00 | tp3.6 sl3.6 tr0 h96 gn (14 · 2.24 · 18.80) |
| General | ribbon | willr-21-95@m30 | 6 | 6 (100 %) | 10 | 100 % | ∞ (no loss) | 41.20 | – |
| General | revert | trend-ema-50-200@m15c | 8 | 6 (75 %) | 160 | 61 % | 1.22 | 41.17 | tp3.2 sl2.4 tr0 h64 gn (21 · 1.51 · 11.89) |
| General | ribbon | trend-st@m15c | 10 | 10 (100 %) | 11 | 91 % | 12.41 | 36.52 | – |
| General | sweep | bb-bounce-50-2@m15 | 6 | 4 (67 %) | 66 | 52 % | 1.45 | 31.60 | tp3.2 sl3.2 tr0 h64 gn (7 · 5.29 · 14.60) |
| General | sweep | z-50-2@m15 | 6 | 4 (67 %) | 66 | 52 % | 1.45 | 31.60 | tp3.2 sl3.2 tr0 h64 gn (7 · 5.29 · 14.60) |
| General | revert | break-don55@m30 | 3 | 3 (100 %) | 49 | 57 % | 1.47 | 31.50 | tp3.6 sl3.6 tr0 h48 gn (14 · 2.24 · 18.80) |
| General | revert | trend-ema-50-200@m30 | 11 | 8 (73 %) | 181 | 56 % | 1.14 | 31.47 | tp3.6 sl3.6 tr1.8 h32 gn (20 · 1.70 · 10.08) |
| General | ribbon | trix-9@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 24.40 | – |
| General | ribbon | macd-hist-19-39-9@m30 | 2 | 2 (100 %) | 14 | 71 % | 4.16 | 24.00 | tp3.2 sl1.6 tr0 h48 gn (8 · 5.00 · 14.40) |
| General | sweep | willr-28-90@m15c | 2 | 2 (100 %) | 21 | 67 % | 2.21 | 23.00 | tp3.2 sl3.2 tr0 h64 gn (8 · 6.18 · 17.60) |
| General | sweep | willr-50-90@m15 | 3 | 1 (33 %) | 58 | 53 % | 1.28 | 20.40 | tp3.2 sl3.2 tr0 h64 gn (14 · 3.24 · 22.80) |
| General | revert | break-vol-2@m30 | 4 | 3 (75 %) | 28 | 61 % | 1.67 | 19.22 | tp4 sl4 tr0 h48 gn (5 · 3.62 · 11.00) |
| General | sweep | willr-7-80@m15c | 2 | 2 (100 %) | 47 | 62 % | 1.24 | 14.81 | tp3.2 sl3.2 tr0 h64 gn (24 · 1.36 · 10.86) |
| General | revert | move-impulse-20-2.5@m15c | 2 | 2 (100 %) | 46 | 61 % | 1.26 | 14.42 | tp4.4 sl4.4 tr2.2 h64 gn (23 · 1.26 · 7.21) |
| General | pivot | z-50-2.5@x4@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 13.82 | – |
| General | pivot | willr-50-95@m15 | 2 | 2 (100 %) | 18 | 78 % | 2.94 | 13.33 | tp3.2 sl3.2 tr1.6 h64 gn (9 · 2.94 · 6.67) |
| General | sweep | willr-21-95@m15c | 4 | 4 (100 %) | 9 | 67 % | 46.16 | 13.08 | – |
| General | magnet | mfi-14-20@m15 | 3 | 3 (100 %) | 9 | 67 % | 2.93 | 12.90 | – |
| General | revert | break-vol-2@m15c | 1 | 1 (100 %) | 5 | 80 % | 3.62 | 11.00 | tp4 sl4 tr0 h96 gn (5 · 3.62 · 11.00) |
| General | sweep | willr-14-95@m30 | 3 | 3 (100 %) | 8 | 100 % | ∞ (no loss) | 9.91 | – |
| General | pivot | willr-28-95@m15c | 4 | 4 (100 %) | 18 | 67 % | 13.14 | 8.70 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 76.01 · 2.56) |
| General | pivot | willr-50-95@m15c | 4 | 4 (100 %) | 16 | 63 % | 11.16 | 8.01 | tp3.6 sl3.6 tr1.8 h64 gn (5 · 15.74 · 2.52) |
| General | clamp | r-cvd-div-m@m15c | 3 | 2 (67 %) | 7 | 71 % | 2.85 | 6.64 | – |
| General | ribbon | willr-28-95@m15c | 2 | 2 (100 %) | 13 | 77 % | 19.13 | 6.50 | tp3.2 sl3.2 tr1.6 h96 gn (7 · 113.32 · 3.83) |
| General | ribbon | macd-cross-19-39-9@m30 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 5.71 | – |
| General | ribbon | kama-10@m30 | 1 | 1 (100 %) | 6 | 50 % | 1.75 | 5.40 | tp4.4 sl2.2 tr0 h48 gn (6 · 1.75 · 5.40) |
| General | clamp | r-zdist@m15c | 2 | 2 (100 %) | 6 | 67 % | 1.76 | 5.20 | – |
| General | revert | r-pdhl-m@m15 | 2 | 2 (100 %) | 8 | 50 % | 1.19 | 2.40 | – |
| General | ribbon | r-td@m30 | 1 | 1 (100 %) | 5 | 60 % | 1.32 | 2.20 | tp3.2 sl3.2 tr0 h32 gn (5 · 1.32 · 2.20) |
| General | revert | r-qh-flow-m@m15c | 2 | 1 (50 %) | 33 | 55 % | 1.03 | 2.04 | tp4 sl4 tr0 h64 gn (18 · 1.08 · 2.72) |
| General | sweep | r-ultimate@m15 | 2 | 2 (100 %) | 8 | 50 % | 1.15 | 1.60 | – |
| General | revert | r-chop-m@m30 | 3 | 0 (0 %) | 7 | 57 % | 0.92 | -0.92 | – |
| General | sweep | r-pin@m30 | 6 | 4 (67 %) | 24 | 42 % | 0.95 | -1.60 | tp3.2 sl1.6 tr0 h32 gn (5 · 0.42 · -4.20) |
| General | pivot | mfi-14-20@m15c | 6 | 2 (33 %) | 16 | 38 % | 0.92 | -1.60 | – |
| General | ribbon | ema-slope@m15 | 9 | 5 (56 %) | 23 | 39 % | 0.95 | -2.04 | – |
| General | pivot | willr-28-95@m15 | 16 | 6 (38 %) | 54 | 44 % | 0.94 | -3.10 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 76.01 · 2.56) |
| General | ribbon | act-hf@m30 | 2 | 0 (0 %) | 16 | 38 % | 0.88 | -3.20 | tp4 sl3 tr0 h48 gn (7 · 0.89 · -1.40) |
| General | revert | r-qh-flow@m15c | 1 | 0 (0 %) | 39 | 67 % | 0.93 | -4.10 | tp4.4 sl4.4 tr2.2 h64 gn (39 · 0.93 · -4.10) |
| General | revert | r-klinger-m@m15c | 1 | 0 (0 %) | 5 | 20 % | 0.42 | -4.20 | tp3.2 sl1.6 tr0 h64 gn (5 · 0.42 · -4.20) |
| General | ribbon | ema-slope@m15c | 11 | 5 (45 %) | 29 | 38 % | 0.90 | -4.84 | – |
| General | sweep | r-td@m30 | 4 | 2 (50 %) | 16 | 50 % | 0.73 | -5.58 | tp3.2 sl3.2 tr1.6 h32 gn (5 · 1.15 · 0.51) |
| General | pivot | willr-28-90@m30 | 2 | 0 (0 %) | 7 | 43 % | 0.41 | -6.55 | – |
| General | clamp | cci-20-200@m15c | 13 | 1 (8 %) | 30 | 57 % | 0.83 | -9.30 | – |
| General | sweep | r-pin-m@m15 | 1 | 0 (0 %) | 5 | 0 % | 0.00 | -13.00 | tp3.2 sl2.4 tr0 h64 gn (5 · 0.00 · -13.00) |
| General | ribbon | macd-hist-19-39-9@m15 | 1 | 0 (0 %) | 6 | 0 % | 0.00 | -14.40 | tp4.4 sl2.2 tr0 h64 gn (6 · 0.00 · -14.40) |
| General | magnet | r-cvd-div-m@m15 | 4 | 0 (0 %) | 12 | 33 % | 0.40 | -15.41 | – |
| General | sweep | r-pin-m@m30 | 5 | 0 (0 %) | 6 | 0 % | 0.00 | -16.40 | – |
| General | ribbon | cmf-20-0.05@m15 | 7 | 0 (0 %) | 32 | 44 % | 0.73 | -17.09 | tp4.4 sl4.4 tr2.2 h64 gn (6 · 0.40 · -5.65) |
| General | ribbon | r-valuearea-m@m15 | 14 | 0 (0 %) | 6 | 0 % | 0.00 | -21.30 | – |
| General | follow | cci-40-200@m15c | 3 | 0 (0 %) | 25 | 36 % | 0.58 | -21.63 | tp3.2 sl3.2 tr2.4 h64 gn (9 · 0.67 · -5.63) |
| General | ribbon | r-camarilla-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -23.20 | – |
| General | revert | r-awesome-m@m15c | 5 | 0 (0 %) | 12 | 17 % | 0.01 | -28.14 | – |
| General | pivot | cmf-20-0.05@m15c | 2 | 0 (0 %) | 20 | 35 % | 0.25 | -37.05 | tp3.6 sl3.6 tr1.8 h96 gn (11 · 0.24 · -17.25) |
| General | revert | r-chop@m30 | 9 | 2 (22 %) | 68 | 54 % | 0.57 | -46.30 | tp4 sl4 tr2 h32 gn (5 · 1.78 · 3.26) |
| General | revert | move-impulse-20-2.5@m30 | 2 | 0 (0 %) | 54 | 33 % | 0.43 | -48.37 | tp3.2 sl3.2 tr1.6 h32 gn (27 · 0.43 · -24.19) |
| General | revert | kelt-20-2@m30 | 2 | 0 (0 %) | 38 | 21 % | 0.18 | -72.77 | tp3.2 sl3.2 tr2.4 h32 gn (19 · 0.18 · -36.38) |
| General | ribbon | dir-thrust@m30 | 27 | 6 (22 %) | 186 | 45 % | 0.75 | -73.86 | tp4.4 sl4.4 tr0 h32 gn (6 · 1.25 · 2.34) |
| Long | ribbon | willr-21-95@m30 | 36 | 25 (69 %) | 69 | 97 % | 1212.26 | 367.92 | – |
| Long | sweep | willr-21-95@m15 | 15 | 15 (100 %) | 55 | 100 % | ∞ (no loss) | 200.91 | – |
| Long | sweep | r-ultimate@m15 | 12 | 12 (100 %) | 36 | 86 % | 10.99 | 149.89 | – |
| Long | ribbon | hma-55@m15c | 50 | 44 (88 %) | 50 | 88 % | 5.99 | 149.75 | – |
| Long | sweep | willr-50-90@m30 | 5 | 5 (100 %) | 28 | 93 % | 15.60 | 132.90 | tp5.2 sl5.2 tr0 h32 lg (6 · ∞ (no loss) · 30.00) |
| Long | ribbon | dir-thrust@m30 | 26 | 20 (77 %) | 149 | 54 % | 1.55 | 110.04 | tp6.4 sl6.4 tr0 h32 lg (6 · 101.55 · 23.46) |
| Long | revert | r-session-trend-m@m15c | 5 | 5 (100 %) | 49 | 67 % | 2.23 | 97.60 | tp4.8 sl4.8 tr0 h64 lg (12 · 2.76 · 26.40) |
| Long | revert | trend-ema-50-200@m15c | 6 | 6 (100 %) | 72 | 60 % | 1.71 | 86.28 | tp6 sl6 tr0 h64 lg (12 · 2.08 · 21.41) |
| Long | sweep | willr-14-95@m15 | 7 | 7 (100 %) | 26 | 100 % | ∞ (no loss) | 84.56 | – |
| Long | revert | r-qh-flow-m@m15c | 4 | 4 (100 %) | 54 | 67 % | 1.92 | 82.68 | tp5.6 sl5.6 tr0 h64 lg (13 · 2.91 · 33.32) |
| Long | revert | trend-ema-50-200@m30 | 5 | 5 (100 %) | 66 | 64 % | 1.71 | 64.57 | tp4.8 sl4.8 tr0 h32 lg (13 · 2.39 · 22.41) |
| Long | revert | r-qh-flow-m@m30 | 2 | 2 (100 %) | 38 | 66 % | 1.74 | 53.03 | tp6.4 sl6.4 tr0 h32 lg (16 · 2.57 · 41.51) |
| Long | ribbon | trend-ribbon@m15c | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 45.00 | – |
| Long | revert | break-vol-2@m15c | 3 | 3 (100 %) | 12 | 100 % | ∞ (no loss) | 41.81 | – |
| Long | ribbon | willr-21-95@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 36.40 | – |
| Long | pivot | willr-50-95@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 33.30 | – |
| Long | revert | ema-50-100@m30 | 2 | 2 (100 %) | 11 | 82 % | 3.47 | 28.70 | tp5.6 sl5.6 tr0 h48 lg (6 · 4.66 · 21.20) |
| Long | pivot | willr-50-90@m15 | 1 | 1 (100 %) | 8 | 75 % | 3.72 | 27.20 | tp6.4 sl4.8 tr0 h64 lg (8 · 3.72 · 27.20) |
| Long | pivot | willr-21-95@m15 | 5 | 5 (100 %) | 6 | 83 % | 11.00 | 26.00 | – |
| Long | ribbon | willr-50-90@m30 | 1 | 1 (100 %) | 8 | 75 % | 3.68 | 23.60 | tp5.6 sl4.2 tr0 h32 lg (8 · 3.68 · 23.60) |
| Long | revert | ema-slope-200@m30 | 1 | 1 (100 %) | 13 | 69 % | 1.99 | 23.26 | tp6.4 sl6.4 tr0 h32 lg (13 · 1.99 · 23.26) |
| Long | ribbon | macd-hist-8-21-5@m30 | 13 | 6 (46 %) | 114 | 52 % | 1.08 | 19.62 | tp6.4 sl6.4 tr0 h48 lg (6 · 1.88 · 11.60) |
| Long | revert | r-klinger@m15c | 6 | 4 (67 %) | 25 | 56 % | 1.29 | 17.71 | tp6.4 sl6.4 tr0 h64 lg (5 · 1.83 · 8.45) |
| Long | revert | r-chop-m@m30 | 3 | 3 (100 %) | 6 | 83 % | 5.46 | 16.96 | – |
| Long | revert | break-vol-1.3@m15c | 1 | 1 (100 %) | 7 | 71 % | 2.34 | 16.60 | tp6 sl6 tr0 h96 lg (7 · 2.34 · 16.60) |
| Long | revert | r-qh-flow@m15c | 1 | 1 (100 %) | 30 | 60 % | 1.22 | 13.37 | tp4.8 sl4.8 tr0 h64 lg (30 · 1.22 · 13.37) |
| Long | ribbon | macd-cross-8-21-5@m30 | 2 | 1 (50 %) | 10 | 60 % | 1.52 | 10.49 | tp6.4 sl6.4 tr0 h48 lg (6 · 1.88 · 11.60) |
| Long | sweep | mfi-14-20@m15 | 1 | 1 (100 %) | 5 | 60 % | 1.85 | 8.00 | tp6 sl4.5 tr0 h96 lg (5 · 1.85 · 8.00) |
| Long | ribbon | sar-0.03@m30 | 5 | 3 (60 %) | 15 | 53 % | 1.23 | 6.75 | – |
| Long | ribbon | willr-28-90@m15 | 1 | 1 (100 %) | 5 | 60 % | 1.24 | 3.23 | tp6.4 sl6.4 tr4.8 h96 lg (5 · 1.24 · 3.23) |
| Long | ribbon | ema-slope@m15c | 4 | 3 (75 %) | 9 | 44 % | 1.12 | 2.10 | – |
| Long | revert | break-vol@m15c | 2 | 1 (50 %) | 10 | 80 % | 0.96 | -0.45 | tp5.6 sl5.6 tr2.8 h64 lg (5 · 1.06 · 0.37) |
| Long | sweep | r-td@m30 | 7 | 1 (14 %) | 15 | 53 % | 0.85 | -4.91 | – |
| Long | pivot | willr-28-90@m30 | 2 | 0 (0 %) | 6 | 33 % | 0.19 | -8.38 | – |
| Long | revert | break-vol@m15 | 3 | 0 (0 %) | 16 | 44 % | 0.84 | -8.74 | tp6.4 sl6.4 tr0 h96 lg (6 · 0.94 · -1.20) |
| Long | clamp | r-cvd-div@m15c | 6 | 2 (33 %) | 10 | 40 % | 0.67 | -10.40 | – |
| Long | revert | break-vol-1.3@m15 | 6 | 2 (33 %) | 65 | 49 % | 0.94 | -11.20 | tp6 sl6 tr0 h96 lg (11 · 1.12 · 3.80) |
| Long | pivot | cmf-20-0.05@m15c | 1 | 0 (0 %) | 8 | 13 % | 0.17 | -22.00 | tp4.8 sl3.6 tr0 h96 lg (8 · 0.17 · -22.00) |
| Long | ribbon | hma-55@m30 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -24.70 | – |
| Long | ribbon | r-camarilla-m@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -25.60 | – |
| Long | revert | r-orb-m@m30 | 8 | 0 (0 %) | 44 | 45 % | 0.77 | -30.46 | tp4.8 sl4.8 tr0 h32 lg (6 · 0.92 · -1.20) |
| Long | sweep | r-inside-m@m15 | 13 | 0 (0 %) | 6 | 0 % | 0.00 | -30.80 | – |
| Long | magnet | r-pin-m@m15 | 19 | 12 (63 %) | 19 | 63 % | 0.19 | -33.34 | – |
| Long | pivot | willr-21-90@m30 | 8 | 0 (0 %) | 10 | 10 % | 0.02 | -43.19 | – |
| Long | ribbon | cmf-20-0.05@m15 | 22 | 4 (18 %) | 70 | 44 % | 0.72 | -53.81 | – |
| Long | follow | r-rsi2-m@m15c | 22 | 0 (0 %) | 17 | 0 % | 0.00 | -78.50 | – |
| Wide | sweep | willr-14-95@m15c | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 18.81 | – |
| Wide | ribbon | bb-bounce-50-2@m1c | 9 | 9 (100 %) | 117 | 49 % | 1.29 | 12.38 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (13 · 1.92 · 4.05) |
| Wide | ribbon | z-50-2@m1c | 9 | 9 (100 %) | 117 | 49 % | 1.29 | 12.38 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (13 · 1.92 · 4.05) |
| Wide | pivot | bb-bounce-50-2@m1c | 9 | 9 (100 %) | 117 | 49 % | 1.29 | 12.38 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (13 · 1.92 · 4.05) |
| Wide | pivot | z-50-2@m1c | 9 | 9 (100 %) | 117 | 49 % | 1.29 | 12.38 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (13 · 1.92 · 4.05) |
| Wide | ribbon | hma-55@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.91 | – |
| Wide | magnet | r-sweep@m5 | 1 | 1 (100 %) | 5 | 80 % | 5.24 | 4.56 | tp0.76 sl0.68 tr0 h96 ax-geo2 axis (5 · 5.24 · 4.56) |
| Wide | magnet | r-sweep-m@m5 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 4.17 | – |
| Wide | revert | break-retest@m5c | 3 | 3 (100 %) | 15 | 60 % | 1.36 | 3.00 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (5 · 1.36 · 1.00) |
| Wide | revert | r-bos@m15c | 12 | 6 (50 %) | 30 | 40 % | 0.63 | -3.91 | – |
| Wide | ribbon | dir-thrust-4@m5 | 3 | 0 (0 %) | 27 | 44 % | 0.72 | -5.21 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (9 · 0.72 · -1.74) |
| Wide | ribbon | aroon-14@m5 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -6.06 | – |
| Wide | sweep | mc-rsi5-10@m5 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -6.30 | – |
| Wide | sweep | r-pin@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.20 | -7.12 | – |
| Wide | sweep | willr-50-95@m5c | 9 | 0 (0 %) | 30 | 20 % | 0.25 | -14.00 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (6 · 0.26 · -2.60) |
| Wide | magnet | bb-bounce-50-2@m1c | 9 | 0 (0 %) | 81 | 33 % | 0.64 | -14.03 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (9 · 0.65 · -1.51) |
| Wide | magnet | z-50-2@m1c | 9 | 0 (0 %) | 81 | 33 % | 0.64 | -14.03 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (9 · 0.65 · -1.51) |
| Wide | pulse | r-camarilla@m1 | 13 | 0 (0 %) | 241 | 27 % | 0.45 | -84.66 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (19 · 0.64 · -3.69) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 20 | 19 (95 %) | 351 | 86 % | 2.79 | 588.57 | tp5 sl15 tr2 h192 (19 · ∞ (no loss) · 55.89) |
| Signals | follow | sig-williams-r-s@m15 | 20 | 20 (100 %) | 347 | 81 % | 2.39 | 502.82 | tp6 sl18 tr0 h192 (10 · ∞ (no loss) · 58.00) |
| Signals | follow | sig-obv-m@m15 | 20 | 20 (100 %) | 262 | 87 % | 4.60 | 489.41 | tp4 sl12 tr1.6 h192 (27 · 43.67 · 39.67) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 20 | 19 (95 %) | 259 | 86 % | 4.14 | 428.56 | tp4 sl12 tr3.2 h192 (11 · ∞ (no loss) · 38.32) |
| Signals | follow | sig-stoch-rsi-m@m15 | 20 | 17 (85 %) | 397 | 79 % | 1.65 | 332.19 | tp6 sl18 tr2.4 h192 (19 · 230.32 · 40.72) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 20 | 20 (100 %) | 167 | 84 % | 3.35 | 317.02 | tp8 sl24 tr3.2 h192 (6 · ∞ (no loss) · 28.18) |
| Signals | follow | sig-obv-s@m15 | 20 | 18 (90 %) | 322 | 81 % | 1.59 | 223.85 | tp3 sl9 tr1.2 h192 (43 · 1.90 · 25.20) |
| Signals | follow | sig-hma-m@m15 | 20 | 13 (65 %) | 257 | 79 % | 1.72 | 217.71 | tp6 sl18 tr2.4 h192 (15 · 185.70 · 36.94) |
| Signals | follow | sig-mfi-m@m15 | 20 | 19 (95 %) | 129 | 85 % | 2.27 | 196.01 | tp8 sl24 tr3.2 h192 (6 · ∞ (no loss) · 30.73) |
| Signals | follow | sig-volume-break-m@m15 | 20 | 19 (95 %) | 48 | 94 % | 25.10 | 188.84 | tp3 sl9 tr1.2 h192 (5 · 19.14 · 2.44) |
| Signals | follow | sig-reclaim-s@m15 | 20 | 10 (50 %) | 432 | 78 % | 1.26 | 183.48 | tp8 sl24 tr3.2 h192 (14 · ∞ (no loss) · 49.14) |
| Signals | follow | sig-stoch-rsi-s@m15 | 20 | 13 (65 %) | 404 | 77 % | 1.27 | 166.86 | tp6 sl18 tr3.6 h192 (12 · 190.89 · 48.70) |
| Signals | follow | sig-ichimoku-s@m15 | 20 | 15 (75 %) | 237 | 81 % | 1.44 | 148.19 | tp8 sl24 tr3.2 h192 (7 · ∞ (no loss) · 23.86) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 18 | 17 (94 %) | 53 | 98 % | 19.54 | 142.78 | tp3 sl9 tr1.2 h192 (5 · ∞ (no loss) · 9.14) |
| Signals | follow | sig-keltner-s@m15 | 20 | 13 (65 %) | 132 | 79 % | 1.97 | 131.91 | tp3 sl9 tr1.8 h192 (11 · 94.32 · 22.57) |
| Signals | follow | sig-supertrend-m@m15 | 18 | 13 (72 %) | 75 | 87 % | 2.67 | 118.20 | tp5 sl15 tr2 h192 (5 · 689.75 · 10.79) |
| Signals | follow | sig-cci-s@m15 | 20 | 10 (50 %) | 378 | 76 % | 1.16 | 108.53 | tp8 sl24 tr3.2 h192 (12 · ∞ (no loss) · 31.35) |
| Signals | follow | sig-keltner-m@m15 | 20 | 16 (80 %) | 95 | 82 % | 1.96 | 105.42 | tp6 sl18 tr2.4 h192 (5 · ∞ (no loss) · 15.44) |
| Signals | follow | sig-rsi-reversal-m@m15 | 19 | 18 (95 %) | 38 | 95 % | 14.02 | 103.54 | tp3 sl9 tr1.2 h192 (5 · 16.68 · 4.01) |
| Signals | follow | sig-s2-st-trail-m@m15 | 18 | 14 (78 %) | 70 | 87 % | 2.41 | 99.88 | tp4 sl12 tr1.6 h192 (5 · ∞ (no loss) · 7.07) |
| Signals | follow | sig-ema-pullback-s@m15 | 20 | 11 (55 %) | 393 | 77 % | 1.14 | 88.63 | tp6 sl18 tr2.4 h192 (21 · 59.69 · 40.00) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 20 | 14 (70 %) | 106 | 81 % | 1.63 | 82.03 | tp4 sl12 tr1.6 h192 (11 · 161.52 · 15.26) |
| Signals | follow | sig-mfi-s@m15 | 20 | 18 (90 %) | 20 | 90 % | 281.93 | 81.45 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 18 | 17 (94 %) | 56 | 84 % | 2.73 | 78.21 | tp3 sl9 tr0 h192 (5 · 1.22 · 2.00) |
| Signals | follow | sig-atr-break-m@m15 | 20 | 13 (65 %) | 111 | 76 % | 1.51 | 77.25 | tp4 sl12 tr1.6 h192 (9 · 55.88 · 17.98) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 20 | 11 (55 %) | 178 | 75 % | 1.23 | 75.44 | tp5 sl15 tr3 h192 (7 · 109.84 · 28.54) |
| Signals | follow | sig-adx-s@m15 | 20 | 11 (55 %) | 213 | 74 % | 1.18 | 71.13 | tp6 sl18 tr0 h192 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 20 | 12 (60 %) | 310 | 80 % | 1.14 | 70.79 | tp4 sl12 tr1.6 h192 (28 · 1.78 · 21.81) |
| Signals | follow | sig-r-vol-regime-m@m15 | 17 | 16 (94 %) | 21 | 95 % | 378.41 | 67.76 | – |
| Signals | follow | sig-act-burst-m@m15 | 18 | 14 (78 %) | 81 | 81 % | 1.77 | 64.06 | tp3 sl9 tr2.4 h192 (7 · 84.00 · 16.60) |
| Signals | follow | sig-trix-s@m15 | 20 | 11 (55 %) | 209 | 77 % | 1.14 | 55.03 | tp6 sl18 tr2.4 h192 (12 · 860.05 · 29.55) |
| Signals | follow | sig-volume-break-s@m15 | 15 | 14 (93 %) | 22 | 91 % | 116.20 | 44.41 | – |
| Signals | follow | sig-act-burst-s@m15 | 20 | 11 (55 %) | 262 | 78 % | 1.08 | 42.64 | tp5 sl15 tr2 h192 (15 · 100.39 · 26.37) |
| Signals | follow | sig-atr-break-s@m15 | 20 | 12 (60 %) | 297 | 76 % | 1.07 | 39.26 | tp6 sl18 tr2.4 h192 (12 · ∞ (no loss) · 44.47) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 8 | 8 (100 %) | 17 | 100 % | ∞ (no loss) | 36.84 | – |
| Signals | follow | sig-ichimoku-m@m15 | 15 | 15 (100 %) | 21 | 90 % | 95.58 | 35.89 | tp3 sl9 tr1.2 h192 (5 · 8.32 · 1.83) |
| Signals | follow | sig-rsi-momentum-s@m15 | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 | – |
| Signals | follow | sig-macd-cross-s@m15 | 20 | 9 (45 %) | 276 | 76 % | 1.04 | 23.05 | tp6 sl18 tr3.6 h192 (8 · 382.27 · 27.97) |
| Signals | follow | sig-macd-hist-s@m15 | 20 | 9 (45 %) | 276 | 76 % | 1.04 | 23.05 | tp6 sl18 tr3.6 h192 (8 · 382.27 · 27.97) |
| Signals | follow | sig-s2-confluence-s@m15 | 20 | 9 (45 %) | 348 | 71 % | 1.04 | 22.92 | tp6 sl18 tr2.4 h192 (17 · 22.36 · 29.04) |
| Signals | follow | sig-r-nr-break-s@m15 | 20 | 11 (55 %) | 221 | 75 % | 1.06 | 22.43 | tp4 sl12 tr0 h192 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-vwap-m@m15 | 20 | 11 (55 %) | 92 | 73 % | 1.11 | 19.26 | tp5 sl15 tr2 h192 (6 · 205.21 · 11.33) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 17.34 | – |
| Signals | follow | sig-squeeze-m@m15 | 20 | 16 (80 %) | 32 | 84 % | 1.30 | 14.85 | – |
| Signals | follow | sig-impulse-m@m15 | 20 | 11 (55 %) | 191 | 74 % | 1.04 | 13.52 | tp4 sl12 tr1.6 h192 (19 · 24.00 · 27.82) |
| Signals | follow | sig-st-slow-m@m15 | 15 | 11 (73 %) | 31 | 74 % | 1.30 | 10.68 | – |
| Signals | follow | sig-bollinger-m@m15 | 20 | 9 (45 %) | 163 | 78 % | 1.01 | 3.88 | tp4 sl12 tr1.6 h192 (15 · 2.20 · 14.62) |
| Signals | follow | sig-s2-st-trail-s@m15 | 18 | 12 (67 %) | 65 | 72 % | 1.01 | 0.80 | tp4 sl12 tr1.6 h192 (6 · ∞ (no loss) · 9.68) |
| Signals | follow | sig-rsi-mid-s@m15 | 20 | 8 (40 %) | 319 | 77 % | 1.00 | 0.57 | tp8 sl24 tr3.2 h192 (10 · ∞ (no loss) · 26.18) |
| Signals | follow | sig-kama-m@m15 | 20 | 9 (45 %) | 387 | 78 % | 1.00 | -2.62 | tp6 sl18 tr2.4 h192 (18 · 461.93 · 38.33) |
| Signals | follow | sig-st-slow-s@m15 | 20 | 14 (70 %) | 118 | 73 % | 0.95 | -13.93 | tp6 sl18 tr2.4 h192 (6 · ∞ (no loss) · 17.43) |
| Signals | follow | sig-s2-range-break-m@m15 | 16 | 10 (63 %) | 45 | 73 % | 0.81 | -16.27 | – |
| Signals | follow | sig-r-linreg-s@m15 | 20 | 7 (35 %) | 298 | 74 % | 0.96 | -21.03 | tp8 sl24 tr3.2 h192 (11 · 44.48 · 29.29) |
| Signals | follow | sig-r-connors-s@m15 | 17 | 11 (65 %) | 62 | 76 % | 0.80 | -21.96 | tp2.5 sl7.5 tr0 h192 (6 · 1.49 · 3.80) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 20 | 10 (50 %) | 136 | 76 % | 0.92 | -22.69 | tp8 sl24 tr3.2 h192 (5 · ∞ (no loss) · 11.21) |
| Signals | follow | sig-macd-cross-m@m15 | 20 | 11 (55 %) | 268 | 79 % | 0.95 | -22.87 | tp6 sl18 tr3.6 h192 (6 · 50.92 · 13.23) |
| Signals | follow | sig-s2-confluence-m@m15 | 20 | 8 (40 %) | 327 | 75 % | 0.94 | -36.37 | tp6 sl18 tr2.4 h192 (16 · 867.72 · 28.31) |
| Signals | follow | sig-donchian-s@m15 | 19 | 9 (47 %) | 218 | 73 % | 0.91 | -36.91 | tp8 sl24 tr3.2 h192 (6 · 272.40 · 21.17) |
| Signals | follow | sig-cci-m@m15 | 20 | 5 (25 %) | 171 | 73 % | 0.92 | -38.36 | tp6 sl18 tr3.6 h192 (7 · 1.60 · 10.83) |
| Signals | follow | sig-ema-slope-m@m15 | 18 | 8 (44 %) | 67 | 78 % | 0.76 | -39.45 | tp3 sl9 tr0 h192 (5 · 1.22 · 2.00) |
| Signals | follow | sig-impulse-s@m15 | 20 | 7 (35 %) | 268 | 75 % | 0.92 | -43.38 | tp8 sl24 tr3.2 h192 (10 · 468.49 · 24.66) |
| Signals | follow | sig-bollinger-s@m15 | 20 | 10 (50 %) | 256 | 75 % | 0.92 | -51.23 | tp6 sl18 tr3.6 h192 (11 · 1.88 · 16.01) |
| Signals | follow | sig-zscore-s@m15 | 20 | 10 (50 %) | 256 | 75 % | 0.92 | -51.23 | tp6 sl18 tr3.6 h192 (11 · 1.88 · 16.01) |
| Signals | follow | sig-s2-vol-break-s@m15 | 20 | 7 (35 %) | 114 | 69 % | 0.81 | -57.26 | tp6 sl18 tr2.4 h192 (5 · 7.94 · 8.01) |
| Signals | follow | sig-supertrend-s@m15 | 20 | 7 (35 %) | 243 | 76 % | 0.87 | -66.90 | tp6 sl18 tr2.4 h192 (12 · ∞ (no loss) · 25.67) |
| Signals | follow | sig-r-vol-regime-s@m15 | 20 | 10 (50 %) | 99 | 72 % | 0.77 | -70.44 | tp3 sl9 tr1.8 h192 (8 · 1.54 · 5.01) |
| Signals | follow | sig-r-session-trend-m@m15 | 20 | 8 (40 %) | 98 | 69 % | 0.67 | -82.54 | tp3 sl9 tr0 h192 (7 · 0.76 · -4.40) |
| Signals | follow | sig-vwap-s@m15 | 20 | 6 (30 %) | 331 | 72 % | 0.87 | -84.33 | tp5 sl15 tr2 h192 (22 · 20.07 · 28.62) |
| Signals | follow | sig-williams-r-m@m15 | 20 | 7 (35 %) | 292 | 73 % | 0.87 | -91.61 | tp6 sl18 tr2.4 h192 (14 · 1.69 · 12.62) |
| Signals | follow | sig-r-inside-m@m15 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -93.30 | – |
| Signals | follow | sig-r-linreg-m@m15 | 20 | 9 (45 %) | 232 | 72 % | 0.81 | -93.70 | tp6 sl18 tr2.4 h192 (12 · 15.60 · 21.99) |
| Signals | follow | sig-macd-hist-m@m15 | 20 | 8 (40 %) | 355 | 74 % | 0.86 | -97.39 | tp6 sl18 tr3.6 h192 (7 · ∞ (no loss) · 19.92) |
| Signals | follow | sig-squeeze-s@m15 | 20 | 4 (20 %) | 79 | 68 % | 0.56 | -106.06 | tp4 sl12 tr1.6 h192 (7 · 67.94 · 9.12) |
| Signals | follow | sig-act-hf-m@m15 | 19 | 9 (47 %) | 211 | 72 % | 0.74 | -107.56 | tp4 sl12 tr2.4 h192 (13 · 1.61 · 7.44) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 20 | 5 (25 %) | 332 | 76 % | 0.83 | -108.88 | tp6 sl18 tr2.4 h192 (17 · 1.34 · 6.12) |
| Signals | follow | sig-r-awesome-m@m15 | 20 | 9 (45 %) | 190 | 67 % | 0.76 | -111.38 | tp5 sl15 tr4 h192 (5 · ∞ (no loss) · 19.45) |
| Signals | follow | sig-sar-s@m15 | 20 | 9 (45 %) | 362 | 74 % | 0.85 | -114.97 | tp5 sl15 tr4 h192 (9 · ∞ (no loss) · 34.57) |
| Signals | follow | sig-reclaim-m@m15 | 20 | 8 (40 %) | 295 | 69 % | 0.83 | -116.25 | tp6 sl18 tr0 h192 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-block-scale-s@m15 | 19 | 4 (21 %) | 293 | 73 % | 0.81 | -118.50 | tp6 sl18 tr2.4 h192 (13 · 201.81 · 27.91) |
| Signals | follow | sig-donchian-m@m15 | 20 | 5 (25 %) | 132 | 67 % | 0.68 | -119.66 | tp4 sl12 tr0 h192 (6 · 1.56 · 6.80) |
| Signals | follow | sig-s2-block-scale-m@m15 | 20 | 8 (40 %) | 228 | 72 % | 0.75 | -129.90 | tp6 sl18 tr2.4 h192 (10 · 153.89 · 21.25) |
| Signals | follow | sig-ema-cross-s@m15 | 20 | 2 (10 %) | 201 | 71 % | 0.74 | -130.34 | tp3 sl9 tr1.2 h192 (20 · 1.51 · 8.38) |
| Signals | follow | sig-r-inside-s@m15 | 12 | 2 (17 %) | 41 | 59 % | 0.19 | -131.04 | tp3 sl9 tr1.8 h192 (6 · 0.37 · -11.57) |
| Signals | follow | sig-s2-block-stack-m@m15 | 16 | 4 (25 %) | 184 | 71 % | 0.70 | -131.36 | tp5 sl15 tr3 h192 (10 · 1.50 · 7.64) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 14 | 1 (7 %) | 23 | 39 % | 0.11 | -134.73 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 20 | 5 (25 %) | 284 | 73 % | 0.78 | -138.87 | tp5 sl15 tr2 h192 (18 · 71.04 · 27.89) |
| Signals | follow | sig-zscore-m@m15 | 20 | 1 (5 %) | 82 | 71 % | 0.54 | -142.20 | tp3 sl9 tr1.8 h192 (5 · 1.00 · 0.02) |
| Signals | follow | sig-hma-s@m15 | 20 | 7 (35 %) | 276 | 72 % | 0.78 | -142.45 | tp6 sl18 tr3.6 h192 (7 · ∞ (no loss) · 25.58) |
| Signals | follow | sig-rsi-reversal-s@m15 | 17 | 6 (35 %) | 56 | 55 % | 0.32 | -153.81 | tp3 sl9 tr1.8 h192 (5 · 0.23 · -14.24) |
| Signals | follow | sig-adx-m@m15 | 18 | 4 (22 %) | 99 | 64 % | 0.52 | -157.31 | tp5 sl15 tr3 h192 (5 · 1.26 · 4.00) |
| Signals | follow | sig-heikin-ashi-m@m15 | 20 | 9 (45 %) | 303 | 72 % | 0.76 | -164.21 | tp6 sl18 tr0 h192 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-s2-vol-break-m@m15 | 19 | 6 (32 %) | 74 | 51 % | 0.45 | -164.50 | tp2.5 sl7.5 tr0 h192 (6 · 0.30 · -16.20) |
| Signals | follow | sig-ema-trend-s@m15 | 20 | 7 (35 %) | 321 | 71 % | 0.77 | -165.80 | tp8 sl24 tr3.2 h192 (10 · 876.72 · 27.64) |
| Signals | follow | sig-act-hf-s@m15 | 20 | 10 (50 %) | 326 | 71 % | 0.76 | -166.58 | tp6 sl18 tr4.8 h192 (5 · ∞ (no loss) · 23.81) |
| Signals | follow | sig-kama-s@m15 | 20 | 7 (35 %) | 345 | 72 % | 0.77 | -166.68 | tp6 sl18 tr3.6 h192 (10 · ∞ (no loss) · 27.67) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 20 | 1 (5 %) | 156 | 71 % | 0.66 | -167.86 | tp6 sl18 tr4.8 h192 (5 · 1.00 · 0.07) |
| Signals | follow | sig-cmf-m@m15 | 20 | 6 (30 %) | 260 | 71 % | 0.75 | -168.14 | tp6 sl18 tr3.6 h192 (7 · ∞ (no loss) · 22.19) |
| Signals | follow | sig-macd-slow-s@m15 | 20 | 6 (30 %) | 242 | 71 % | 0.72 | -172.11 | tp6 sl18 tr3.6 h192 (7 · 683.13 · 16.98) |
| Signals | follow | sig-trix-m@m15 | 20 | 0 (0 %) | 67 | 66 % | 0.45 | -172.42 | tp3 sl9 tr1.2 h192 (7 · 0.78 · -2.02) |
| Signals | follow | sig-s2-block-stack-s@m15 | 20 | 6 (30 %) | 205 | 68 % | 0.67 | -189.95 | tp8 sl24 tr3.2 h192 (6 · ∞ (no loss) · 17.72) |
| Signals | follow | sig-sar-m@m15 | 20 | 8 (40 %) | 314 | 70 % | 0.72 | -212.42 | tp8 sl24 tr3.2 h192 (13 · 522.23 · 27.50) |
| Signals | follow | sig-s2-active-hf-m@m15 | 20 | 5 (25 %) | 275 | 72 % | 0.68 | -212.81 | tp5 sl15 tr2 h192 (17 · 1.81 · 12.50) |
| Signals | follow | sig-rsi-mid-m@m15 | 20 | 8 (40 %) | 234 | 64 % | 0.64 | -213.69 | tp6 sl18 tr3.6 h192 (5 · ∞ (no loss) · 24.03) |
| Signals | follow | sig-r-session-trend-s@m15 | 20 | 4 (20 %) | 100 | 60 % | 0.43 | -221.61 | tp4 sl12 tr2.4 h192 (6 · 0.75 · -3.12) |
| Signals | follow | sig-macd-slow-m@m15 | 20 | 4 (20 %) | 239 | 73 % | 0.63 | -232.92 | tp8 sl24 tr3.2 h192 (7 · ∞ (no loss) · 13.85) |
| Signals | follow | sig-r-connors-m@m15 | 20 | 6 (30 %) | 191 | 69 % | 0.56 | -244.63 | tp6 sl18 tr3.6 h192 (5 · ∞ (no loss) · 10.15) |
| Signals | follow | sig-ema-cross-m@m15 | 20 | 0 (0 %) | 40 | 45 % | 0.18 | -253.34 | – |
| Signals | follow | sig-ema-trend-m@m15 | 20 | 3 (15 %) | 183 | 67 % | 0.54 | -260.57 | tp5 sl15 tr0 h192 (5 · 1.26 · 4.00) |
| Signals | follow | sig-thrust-s@m15 | 20 | 5 (25 %) | 282 | 68 % | 0.66 | -261.04 | tp8 sl24 tr3.2 h192 (7 · ∞ (no loss) · 18.20) |
| Signals | follow | sig-r-nr-break-m@m15 | 18 | 5 (28 %) | 187 | 65 % | 0.51 | -262.50 | tp4 sl12 tr0 h192 (7 · 1.87 · 10.60) |
| Signals | follow | sig-ema-pullback-m@m15 | 17 | 1 (6 %) | 182 | 68 % | 0.46 | -272.43 | tp5 sl15 tr2 h192 (12 · 1.12 · 1.84) |
| Signals | follow | sig-thrust-m@m15 | 20 | 5 (25 %) | 349 | 70 % | 0.63 | -324.10 | tp8 sl24 tr3.2 h192 (11 · 250.40 · 24.75) |
| Signals | follow | sig-swing-s@m15 | 19 | 5 (26 %) | 280 | 67 % | 0.54 | -330.09 | tp6 sl18 tr3.6 h192 (6 · 347.31 · 17.94) |
| Signals | follow | sig-ema-slope-s@m15 | 20 | 0 (0 %) | 187 | 67 % | 0.42 | -332.31 | tp5 sl15 tr2 h192 (14 · 0.93 · -1.05) |
| Signals | follow | sig-swing-m@m15 | 20 | 2 (10 %) | 291 | 68 % | 0.58 | -340.91 | tp5 sl15 tr0 h192 (5 · 1.26 · 4.00) |
| Signals | follow | sig-r-awesome-s@m15 | 18 | 5 (28 %) | 154 | 56 % | 0.40 | -342.52 | tp6 sl18 tr2.4 h192 (5 · 0.67 · -5.98) |
| Signals | follow | sig-cmf-s@m15 | 20 | 5 (25 %) | 221 | 63 % | 0.50 | -350.57 | tp6 sl18 tr3.6 h192 (5 · 0.55 · -8.22) |
| Signals | follow | sig-s2-range-shift-m@m15 | 20 | 3 (15 %) | 93 | 51 % | 0.32 | -350.64 | tp4 sl12 tr1.6 h192 (7 · 0.37 · -15.44) |
| Signals | follow | sig-heikin-ashi-s@m15 | 20 | 6 (30 %) | 372 | 67 % | 0.61 | -387.80 | tp8 sl24 tr3.2 h192 (7 · ∞ (no loss) · 27.16) |
| Signals | follow | sig-s2-atr-break-m@m15 | 19 | 3 (16 %) | 180 | 58 % | 0.44 | -389.10 | tp6 sl18 tr2.4 h192 (8 · 106.51 · 18.56) |
| Signals | follow | sig-r-fractal-m@m15 | 20 | 0 (0 %) | 88 | 48 % | 0.16 | -433.63 | tp4 sl12 tr1.6 h192 (7 · 0.45 · -6.73) |
| Signals | follow | sig-s2-atr-break-s@m15 | 20 | 2 (10 %) | 148 | 54 % | 0.30 | -434.81 | tp3 sl9 tr0 h192 (7 · 0.41 · -16.40) |
| Signals | follow | sig-r-fractal-s@m15 | 20 | 0 (0 %) | 107 | 47 % | 0.20 | -437.95 | tp4 sl12 tr1.6 h192 (9 · 0.65 · -4.34) |
| Signals | follow | sig-s2-range-shift-s@m15 | 20 | 0 (0 %) | 173 | 53 % | 0.32 | -484.15 | tp6 sl18 tr2.4 h192 (7 · 0.69 · -5.94) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 120 | 96 (80 %) | 744 | 89 % | 2.49 | 1123.87 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 118 | 90 (76 %) | 654 | 89 % | 2.27 | 1115.53 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 123 | 84 (68 %) | 1140 | 85 % | 1.55 | 792.12 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 113 | 75 (66 %) | 429 | 86 % | 1.67 | 670.99 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 107 | 80 (75 %) | 354 | 90 % | 1.81 | 606.71 |
| Signals | tp 6.000% | sl 3.00× | tr off | 103 | 66 (64 %) | 295 | 83 % | 1.56 | 511.00 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 94 | 65 (69 %) | 216 | 79 % | 1.78 | 500.93 |
| Short | tp 2.800% | sl 2.00× | tr off | 110 | 51 (46 %) | 403 | 83 % | 2.30 | 492.65 |
| Short | tp 2.600% | sl 2.00× | tr off | 95 | 34 (36 %) | 242 | 84 % | 2.57 | 297.75 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 95 | 41 (43 %) | 346 | 75 % | 2.44 | 259.91 |
| Short | tp 2.800% | sl 1.50× | tr off | 58 | 32 (55 %) | 211 | 80 % | 2.40 | 254.72 |
| Short | tp 2.800% | sl 1.50× | tr 0.50× | 82 | 37 (45 %) | 465 | 72 % | 1.78 | 253.86 |
| Short | tp 2.200% | sl 2.00× | tr 0.75× | 109 | 37 (34 %) | 233 | 79 % | 2.81 | 229.54 |
| Short | tp 2.400% | sl 2.00× | tr off | 70 | 22 (31 %) | 199 | 83 % | 2.35 | 210.01 |
| General | tp 3.200% | sl 1.00× | tr off | 84 | 27 (32 %) | 247 | 66 % | 1.73 | 204.57 |
| Long | tp 6.000% | sl 1.00× | tr off | 50 | 17 (34 %) | 94 | 69 % | 2.20 | 199.48 |
| Long | tp 6.400% | sl 1.00× | tr off | 56 | 15 (27 %) | 117 | 65 % | 1.76 | 192.95 |
| Short | tp 2.400% | sl 2.00× | tr 0.75× | 82 | 29 (35 %) | 131 | 84 % | 9.60 | 190.97 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 92 | 28 (30 %) | 184 | 81 % | 2.89 | 185.83 |
| Short | tp 2.600% | sl 2.00× | tr 0.50× | 85 | 35 (41 %) | 262 | 81 % | 2.49 | 180.14 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 98 | 38 (39 %) | 247 | 83 % | 2.63 | 174.07 |
| Long | tp 4.800% | sl 1.00× | tr off | 56 | 17 (30 %) | 142 | 65 % | 1.71 | 166.73 |
| Long | tp 5.600% | sl 1.00× | tr off | 56 | 15 (27 %) | 95 | 67 % | 1.96 | 164.99 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 86 | 29 (34 %) | 158 | 79 % | 2.46 | 156.41 |
| Long | tp 6.000% | sl 0.75× | tr off | 59 | 15 (25 %) | 82 | 62 % | 2.07 | 147.89 |
| Short | tp 2.000% | sl 2.00× | tr 0.50× | 103 | 42 (41 %) | 261 | 74 % | 1.95 | 132.58 |
| Short | tp 2.000% | sl 2.00× | tr 0.75× | 91 | 36 (40 %) | 235 | 78 % | 1.81 | 129.78 |
| Long | tp 6.400% | sl 0.75× | tr off | 57 | 11 (19 %) | 61 | 62 % | 2.08 | 118.60 |
| Short | tp 2.200% | sl 1.50× | tr 0.50× | 110 | 35 (32 %) | 375 | 67 % | 1.40 | 116.58 |
| Long | tp 5.200% | sl 1.00× | tr off | 47 | 11 (23 %) | 67 | 69 % | 2.06 | 114.52 |
| Short | tp 2.000% | sl 2.00× | tr off | 94 | 32 (34 %) | 188 | 79 % | 1.62 | 102.07 |
| Short | tp 2.200% | sl 1.50× | tr 0.75× | 120 | 45 (38 %) | 377 | 64 % | 1.30 | 100.80 |
| Long | tp 5.600% | sl 0.75× | tr off | 48 | 11 (23 %) | 80 | 57 % | 1.69 | 99.69 |
| Short | tp 1.800% | sl 2.00× | tr off | 103 | 35 (34 %) | 250 | 78 % | 1.46 | 96.85 |
| Short | tp 2.200% | sl 2.00× | tr off | 75 | 22 (29 %) | 129 | 80 % | 1.88 | 96.48 |
| Short | tp 2.400% | sl 1.50× | tr 0.50× | 81 | 28 (35 %) | 371 | 69 % | 1.30 | 90.07 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 62 | 18 (29 %) | 179 | 67 % | 1.43 | 87.34 |
| Short | tp 2.200% | sl 2.00× | tr 0.50× | 113 | 34 (30 %) | 240 | 75 % | 1.48 | 83.41 |
| Long | tp 4.800% | sl 0.75× | tr off | 54 | 18 (33 %) | 69 | 59 % | 1.80 | 82.54 |
| General | tp 4.000% | sl 1.00× | tr off | 31 | 10 (32 %) | 65 | 68 % | 1.97 | 81.29 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 3.00× | tr off | 124 | 26 (21 %) | 2218 | 70 % | 0.68 | -1658.60 |
| Signals | tp 3.000% | sl 3.00× | tr off | 123 | 30 (24 %) | 1539 | 68 % | 0.64 | -1654.80 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 124 | 38 (31 %) | 1785 | 66 % | 0.64 | -1588.55 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 124 | 33 (27 %) | 2203 | 68 % | 0.67 | -1436.85 |
| Signals | tp 4.000% | sl 3.00× | tr off | 121 | 32 (26 %) | 897 | 68 % | 0.66 | -1215.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 124 | 37 (30 %) | 3072 | 67 % | 0.71 | -1136.69 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 123 | 36 (29 %) | 1098 | 69 % | 0.69 | -1065.53 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 124 | 43 (35 %) | 1442 | 74 % | 0.77 | -776.08 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 124 | 48 (39 %) | 2106 | 74 % | 0.82 | -585.10 |
| Signals | tp 5.000% | sl 3.00× | tr off | 114 | 42 (37 %) | 537 | 72 % | 0.81 | -422.40 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 120 | 51 (43 %) | 703 | 74 % | 0.85 | -358.86 |
| General | tp 3.200% | sl 1.00× | tr 0.75× | 73 | 9 (12 %) | 177 | 48 % | 0.65 | -97.67 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 122 | 64 (52 %) | 1012 | 81 % | 0.96 | -88.28 |
| Short | tp 1.800% | sl 1.00× | tr 0.75× | 68 | 11 (16 %) | 227 | 41 % | 0.62 | -83.38 |
| Wide | tp 0.640% | sl 0.84× | tr off | 118 | 36 (31 %) | 871 | 40 % | 0.84 | -63.20 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 69 (69) | 44840 | 17716 | 17716 | 0 | baseTarget 27124 |
| Micro | trailing | 69 (69) | 89680 | 35432 | 35432 | 0 | baseTarget 54248 |
| Short | normal | 251 (225) | 40248 | 16242 | 16242 | 0 | baseTarget 10254 · baseRange 13752 |
| Short | trailing | 251 (225) | 80496 | 32484 | 32484 | 0 | baseTarget 20508 · baseRange 27504 |
| General | normal | 251 (208) | 26832 | 9990 | 9990 | 0 | baseRange 12264 · baseTarget 4578 |
| General | trailing | 251 (208) | 17888 | 6660 | 6660 | 0 | baseRange 8176 · baseTarget 3052 |
| Long | normal | 251 (210) | 33540 | 13722 | 13722 | 0 | baseTarget 5238 · baseRange 14580 |
| Long | trailing | 251 (210) | 22360 | 9148 | 9148 | 0 | baseTarget 3492 · baseRange 9720 |
| Wide | axis | 320 (320) | 58995 | 58995 | 58995 | 0 | – |
| Wide | dca | 320 (320) | 5244 | 5244 | 5244 | 0 | – |
| Wide | dca-active | 320 (320) | 5244 | 5244 | 5244 | 0 | – |

Engine indications Base evaluated that built no set: 71 (bb-bounce-20-3, bb-walk, break-atr, break-atr-0.9, cci-14-100, cci-20-100, dir-emax-5-13, dir-vwap-30, ema-21-55, ema-slope-20-3, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-brk-20, mc-burst-3, mc-engulf-20, mc-ivwapd-2, mc-macdh, mc-qburst-2, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-25, mc-rsi4-15, mc-rsi4-25, mc-rsi4-5, mc-rsi5-25, mc-rsi7-20, mc-rsi9-15, mc-rsi9-25, mc-rsimid-14, mc-rsit14-25, mc-rsit14-30, mc-rsit2-5, mc-rsit3-5, mc-rsit4-20, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.21 (646) | 0.29 (718) | 0.37 (938) | 0.44 (1046) | 0.45 (1006) |
| 1.14× | – | 0.22 (504) | – | – | – | – | – |
| 1.25× | – | 0.22 (504) | 0.22 (646) | 0.29 (718) | 0.40 (938) | 0.54 (1036) | 0.56 (994) |
| 1.33× | 0.20 (354) | – | – | – | – | – | – |
| 1.5× | 0.20 (354) | 0.22 (504) | 0.23 (646) | 0.33 (712) | 0.42 (926) | 0.55 (1036) | 0.54 (994) |
| 1.75× | 0.19 (354) | 0.26 (504) | 0.34 (640) | 0.50 (712) | 0.43 (926) | 0.52 (1036) | 0.51 (988) |
| 2× | 0.19 (354) | 0.29 (498) | 0.41 (640) | 0.45 (712) | 0.39 (926) | 0.48 (1024) | 0.50 (988) |
| 2.25× | 0.26 (350) | 0.33 (498) | 0.37 (640) | 0.41 (712) | 0.38 (914) | 0.48 (1024) | 0.45 (988) |
| 2.5× | 0.26 (350) | 0.30 (498) | 0.35 (644) | 0.40 (700) | 0.39 (914) | 0.44 (1024) | 0.45 (972) |
| 2.75× | 0.30 (350) | 0.28 (498) | 0.33 (634) | 0.40 (700) | 0.36 (914) | 0.44 (1004) | 0.53 (972) |
| 3× | 0.28 (350) | 0.27 (492) | 0.33 (634) | 0.38 (712) | 0.36 (900) | 0.58 (1004) | 0.51 (966) |
| 3.25× | 0.27 (350) | 0.26 (492) | 0.31 (634) | 0.40 (704) | 0.46 (900) | 0.56 (998) | 0.63 (966) |
| 3.5× | 0.28 (344) | 0.27 (492) | 0.30 (632) | 0.44 (704) | 0.47 (894) | 0.57 (998) | 0.69 (954) |
| 3.75× | 0.27 (344) | 0.25 (492) | 0.32 (632) | 0.41 (704) | 0.45 (898) | 0.61 (980) | 0.65 (954) |
| 4× | 0.25 (344) | 0.25 (486) | 0.36 (636) | 0.40 (698) | 0.44 (894) | 0.62 (980) | 0.65 (954) |
| 4.25× | 0.24 (344) | 0.28 (486) | 0.34 (632) | 0.51 (698) | 0.54 (876) | 0.59 (980) | 0.61 (954) |
| 4.5× | 0.23 (344) | 0.41 (486) | 0.32 (632) | 0.49 (698) | 0.51 (876) | 0.59 (980) | 0.61 (954) |
| 4.75× | 0.22 (344) | 0.39 (486) | 0.42 (636) | 0.59 (686) | 0.49 (876) | 0.56 (980) | 0.58 (954) |
| 5× | 0.26 (344) | 0.38 (486) | 0.41 (636) | 0.57 (686) | 0.48 (872) | 0.58 (980) | 0.61 (942) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | 0.94 (24) | 2.23 (24) |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | 2.25 (24) | 1.40 (36) | 1.88 (24) | 1.95 (36) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | 1.96 (24) | 1.23 (36) | 1.65 (24) | 1.93 (40) |
| 1.75× | – | 0.92 (12) | 1.68 (24) | 1.74 (24) | 1.40 (24) | 1.47 (24) | 1.52 (36) |
| 2× | – | 0.83 (12) | 1.51 (24) | 1.56 (24) | 1.25 (24) | 1.33 (24) | 1.34 (24) |
| 2.25× | – | – | 0.91 (12) | 1.42 (24) | 1.13 (24) | 1.21 (24) | 0.41 (64) |
| 2.5× | – | – | – | 1.30 (24) | 0.36 (146) | 0.34 (137) | 0.34 (60) |
| 2.75× | – | – | – | 1.19 (24) | 0.36 (140) | 0.31 (137) | 0.66 (76) |
| 3× | – | – | – | 0.35 (102) | 0.38 (104) | 0.63 (148) | 0.56 (78) |
| 3.25× | – | – | 0.23 (90) | 0.34 (106) | 0.67 (83) | 0.63 (102) | 0.50 (111) |
| 3.5× | – | – | 0.22 (90) | 0.82 (94) | 0.58 (88) | 0.40 (134) | 0.41 (124) |
| 3.75× | – | 0.13 (126) | 0.20 (90) | 0.79 (103) | 0.37 (158) | 0.35 (148) | 0.37 (120) |
| 4× | – | 0.12 (126) | 0.61 (90) | 0.70 (104) | 0.37 (164) | 0.35 (148) | 0.36 (124) |
| 4.25× | 0.11 (122) | 0.12 (132) | 0.57 (95) | 0.58 (164) | 0.49 (183) | 0.34 (147) | 0.34 (124) |
| 4.5× | 0.11 (140) | 0.35 (132) | 0.50 (101) | 0.42 (184) | 0.48 (173) | 0.31 (143) | 0.34 (123) |
| 4.75× | 0.10 (140) | 0.35 (136) | 0.42 (148) | 0.48 (208) | 0.45 (173) | 0.27 (143) | 0.31 (119) |
| 5× | 0.10 (140) | 0.34 (136) | 0.44 (158) | 0.48 (216) | 0.43 (176) | 0.27 (138) | 0.37 (107) |

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
| 3× | – | – | – | 0.16 (4) | – | 0.00 (2) | – |
| 3.25× | – | – | – | 0.15 (2) | – | – | ∞ (2) |
| 3.5× | – | – | – | ∞ (2) | 12.42 (4) | 0.00 (1) | 0.87 (6) |
| 3.75× | – | – | – | ∞ (1) | 12.42 (4) | 0.00 (1) | ∞ (4) |
| 4× | – | – | – | – | – | 0.00 (1) | ∞ (4) |
| 4.25× | – | – | – | – | 12.42 (4) | 0.00 (1) | – |
| 4.5× | – | – | – | 0.00 (1) | – | – | ∞ (1) |
| 4.75× | – | – | – | 0.00 (1) | – | – | ∞ (3) |
| 5× | – | – | – | ∞ (3) | ∞ (1) | – | ∞ (1) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.78 (13852) | 0.79 (15188) | 0.86 (12542) | 0.86 (11102) | 0.86 (11405) | 0.89 (14153) |
| 1.5× | 0.99 (12393) | 1.02 (13491) | 1.08 (10901) | 1.26 (9336) | 1.16 (9627) | 1.28 (11701) |
| 2× | 1.25 (11174) | 1.32 (11946) | 1.44 (9688) | 1.63 (8500) | 1.42 (8801) | 1.52 (10761) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.70 (340) | 0.81 (460) | 1.09 (359) | 1.20 (433) | 0.93 (633) | 0.90 (630) |
| 1.5× | 1.18 (592) | 1.31 (418) | 1.26 (966) | 1.31 (703) | 1.47 (497) | 1.92 (808) |
| 2× | 1.22 (825) | 1.78 (684) | 2.00 (602) | 3.02 (577) | 2.62 (688) | 2.37 (907) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.73 (41) | 0.44 (92) | 0.59 (70) | 1.31 (56) | 0.61 (63) | 0.61 (47) |
| 1.5× | 0.74 (59) | 0.61 (73) | 0.97 (54) | 0.62 (98) | 0.55 (96) | 0.55 (109) |
| 2× | 0.59 (102) | 0.60 (102) | 0.59 (72) | 1.19 (67) | 0.80 (100) | 0.85 (107) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.91 (3644) | 0.95 (2756) | 0.96 (2666) | 1.00 (2837) |
| 0.75× | 1.08 (3134) | 1.13 (2305) | 1.16 (2189) | 1.27 (2264) |
| 1× | 1.11 (8427) | 1.21 (6115) | 1.17 (5648) | 1.23 (5896) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.97 (114) | 1.96 (28) | 1.33 (39) | 1.31 (35) |
| 0.75× | 1.16 (249) | 1.29 (96) | 1.24 (91) | 1.92 (39) |
| 1× | 1.15 (651) | 1.24 (331) | 1.76 (148) | 1.57 (260) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 2.92 (11) | 1.70 (4) | 1.73 (4) | ∞ (2) |
| 0.75× | 1.12 (18) | 0.70 (8) | 1.19 (6) | ∞ (2) |
| 1× | 0.92 (52) | 0.96 (22) | 0.77 (15) | 1.99 (22) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.03 (2773) | 1.18 (2524) | 1.08 (2878) | 1.07 (2549) | 0.99 (2782) |
| 0.75× | 1.40 (2114) | 1.44 (1935) | 1.35 (2172) | 1.35 (1893) | 1.17 (2077) |
| 1× | 1.20 (5709) | 1.25 (5233) | 1.11 (5709) | 1.13 (4882) | 1.05 (5362) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 2.36 (28) | 1.77 (21) | 1.79 (25) | 1.91 (38) | 2.12 (27) |
| 0.75× | 1.80 (69) | 1.31 (53) | 1.69 (80) | 2.07 (82) | 2.08 (61) |
| 1× | 1.65 (248) | 1.64 (135) | 1.65 (176) | 1.97 (171) | 1.71 (174) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.88 (6) | 1.79 (4) | 0.60 (8) | 2.05 (7) | 0.00 (5) |
| 0.75× | 0.40 (8) | 1.22 (4) | 0.73 (7) | 0.99 (9) | 0.25 (6) |
| 1× | 1.45 (24) | 1.04 (15) | 0.52 (15) | 0.63 (28) | 0.54 (12) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.62 (38171) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.58 (1245) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.78 (47345) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.62 (1168) | 0.58 (1634) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.57 (1130) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.64 (1521) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.74 (1486) | – | – | – | – |
| 1× | – | – | – | 0.69 (208836) | – | – | – | 0.72 (51585) | 0.64 (6895) | – | 0.86 (2140) | – | 0.84 (6212) | 0.99 (5553) | 1.19 (1840) | 1.32 (1681) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.84 (871) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.66 (98) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 1.52 (69) | – | – | – | 4.05 (9) | – | – | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 4.74 (33) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.45 (15) | – | – | – | ∞ (3) | – | – | – | – | – | – | – | – |
