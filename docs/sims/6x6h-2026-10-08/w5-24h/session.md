# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.39–$3.29 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-06T00:00 → 2026-10-07T00:00 UTC. Engine: Base 1229/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 318/19072 · PF 1.61 · Micro 64/5900 · PF 2.35 · Short 590/8176 · PF 1.55 · General 490/8176 · PF 1.52 · Long 589/8176 · PF 1.49 · Signals 126/126; Main 1147 pairs, 162702 tapes, Real seats: 3381 engine configs + 3780 signal configs (every config of the active signals), compute 302 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $23.16 (15.80 %, closed orders) · equity at end $20.38 (open at end: 36 positions / 6744 orders, MTM -$2.78 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.69 (gross profit $ ÷ gross loss $ as sized) · PF unit 2.55 (every order at one unit: the engine's PF) · 64 positions / 8548 orders (incl. 22 capped to $0) · WR 80.86 % · DDT (closed trades, $) 7.00 h · DDR 0.22 · equity max drawdown $3.37 (15.16 %) · margin used max $16.26 · open avg 28.77 pos / 1364.22 orders (peak 39 / 2432)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 22 orders capped to $0, 8239 scaled down (open at end: 0 capped, 6671 scaled) · binding: position cap 7774, gross cap 14851. **Without the caps:** balance $20.00 → $161.50 (707.50 %) · PF $ 2.88 · equity at end $64.46 · equity max drawdown $88.40 (109.94 %) · margin used max $1133.83 · infeasible: margin exceeded equity for 1291 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 407 | 1016  | 4.1 % | 1.611 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 407 | 1016 (+0) | 4.1 % | 1.611 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 407 | 1014 (-2) | 4.1 % | 1.611 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 387 | 908 (-108) | 3.6 % | 1.646 |
| closes ≥ 6 | 1.00 | 6 | 1 | 689 | 1385 (+369) | 5.5 % | 1.961 |
| closes ≥ 20 | 1.00 | 20 | 1 | 284 | 783 (-233) | 3.1 % | 1.440 |
| closes ≥ 30 | 1.00 | 30 | 1 | 197 | 559 (-457) | 2.2 % | 1.381 |
| DDR off | 1.00 | 12 | off | 1506 | 2366 (+1350) | 9.5 % | 1.143 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 720 | 1503 (+487) | 6.0 % | 1.366 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 162 | 456 (-560) | 1.8 % | 2.121 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1506 | 2366 (+1350) | 9.5 % | 1.143 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2043 | 2913 (+1897) | 11.7 % | 1.208 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 0 / 4 | 0 / 4 | 0.00 | 0.00 | 0 % | -$0.11 | $19.89 | $19.42 | $19.42 | 2.93 % | 0.70 | $5.52 | 10 / 167 |
| 01:00 | 3 / 59 | 48 / 11 | 0.53 | 0.82 | 81 % | -$0.21 | $19.68 | $19.19 | $19.12 | 4.41 % | 0.77 | $8.18 | 12 / 221 |
| 02:00 | 0 / 57 | 47 / 10 | 12.96 | 12.09 | 82 % | $0.41 | $20.08 | $19.30 | $18.96 | 5.25 % | 1.77 | $14.06 | 24 / 1056 |
| 03:00 | 0 / 158 | 113 / 45 | 1.01 | 2.10 | 72 % | $0.00 | $20.08 | $19.05 | $18.90 | 5.57 % | 2.77 | $14.15 | 34 / 1660 |
| 04:00 | 0 / 119 | 97 / 22 | 2.47 | 5.23 | 82 % | $0.15 | $20.23 | $19.24 | $18.94 | 5.57 % | 3.77 | $14.16 | 35 / 2053 |
| 05:00 | 0 / 282 | 255 / 27 | 0.81 | 9.95 | 90 % | -$0.05 | $20.18 | $18.99 | $18.99 | 5.57 % | 4.77 | $14.19 | 37 / 2351 |
| 06:00 | 2 / 184 | 136 / 48 | 0.62 | 1.94 | 74 % | -$0.08 | $20.11 | $18.89 | $18.55 | 7.32 % | 5.77 | $14.13 | 35 / 2811 |
| 07:00 | 5 / 314 | 222 / 92 | 1.41 | 0.68 | 71 % | $0.14 | $20.25 | $19.10 | $18.51 | 7.52 % | 6.77 | $14.17 | 33 / 3089 |
| 08:00 | 1 / 356 | 284 / 72 | 2.70 | 2.98 | 80 % | $0.21 | $20.45 | $18.98 | $18.84 | 7.52 % | 7.77 | $14.32 | 32 / 3367 |
| 09:00 | 0 / 254 | 184 / 70 | 1.17 | 1.49 | 72 % | $0.03 | $20.49 | $18.90 | $18.61 | 7.52 % | 8.77 | $14.42 | 36 / 3843 |
| 10:00 | 0 / 223 | 196 / 27 | 1.60 | 4.80 | 88 % | $0.04 | $20.53 | $19.52 | $18.87 | 7.52 % | 9.77 | $14.37 | 37 / 4288 |
| 11:00 | 0 / 924 | 840 / 84 | 11.05 | 6.74 | 91 % | $0.89 | $21.41 | $20.14 | $19.36 | 9.32 % | 0.27 | $14.99 | 40 / 4083 |
| 12:00 | 0 / 369 | 336 / 33 | 8.40 | 8.65 | 91 % | $0.42 | $21.84 | $20.17 | $19.79 | 10.89 % | 1.27 | $15.29 | 40 / 4629 |
| 13:00 | 0 / 318 | 270 / 48 | 2.63 | 5.76 | 85 % | $0.12 | $21.96 | $20.24 | $19.92 | 10.89 % | 2.27 | $15.37 | 40 / 5129 |
| 14:00 | 3 / 977 | 931 / 46 | 42.77 | 43.97 | 95 % | $1.05 | $23.01 | $21.09 | $19.95 | 10.89 % | 3.27 | $16.10 | 38 / 5107 |
| 15:00 | 2 / 662 | 552 / 110 | 0.87 | 5.07 | 83 % | -$0.10 | $22.90 | $20.20 | $20.18 | 10.89 % | 4.27 | $16.15 | 37 / 5150 |
| 16:00 | 2 / 358 | 155 / 203 | 0.48 | 0.34 | 43 % | -$0.19 | $22.71 | $19.29 | $19.29 | 13.12 % | 5.27 | $16.04 | 37 / 5001 |
| 17:00 | 0 / 341 | 207 / 134 | 0.69 | 0.78 | 61 % | -$0.10 | $22.61 | $19.35 | $19.04 | 14.26 % | 6.27 | $15.90 | 38 / 5072 |
| 18:00 | 1 / 326 | 242 / 84 | 0.89 | 0.93 | 74 % | -$0.02 | $22.59 | $19.66 | $19.41 | 14.26 % | 7.27 | $15.86 | 38 / 5606 |
| 19:00 | 1 / 500 | 306 / 194 | 0.38 | 0.63 | 61 % | -$0.19 | $22.40 | $19.44 | $18.84 | 15.16 % | 8.27 | $15.81 | 38 / 5943 |
| 20:00 | 0 / 655 | 591 / 64 | 4.60 | 4.84 | 90 % | $0.35 | $22.74 | $20.05 | $19.33 | 15.16 % | 9.27 | $15.92 | 38 / 6104 |
| 21:00 | 0 / 358 | 318 / 40 | 7.44 | 5.51 | 89 % | $0.22 | $22.97 | $20.61 | $19.56 | 15.16 % | 10.27 | $16.08 | 38 / 6350 |
| 22:00 | 1 / 367 | 316 / 51 | 6.77 | 7.73 | 86 % | $0.19 | $23.16 | $20.56 | $20.26 | 15.16 % | 11.27 | $16.21 | 38 / 6554 |
| 23:00 | 2 / 383 | 266 / 117 | 1.02 | 1.62 | 69 % | $0.00 | $23.16 | $20.38 | $20.38 | 15.16 % | 12.27 | $16.26 | 36 / 6744 |

**Last hour (23:00):** open at end: 36 positions / 6744 orders, MTM -$2.78 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $20.38 = balance $23.16 + MTM -$2.78.

**Hours positive:** 15 of 24 full hours · flat 0 · negative 9

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 00:00 | – | – | 4 · 0.00 · -$0.11 | – | – |
| 01:00 | 3 · ∞ (no loss) · $0.00 | 3 · ∞ (no loss) · $0.00 | 22 · 0.21 · -$0.35 | 8 · ∞ (no loss) · $0.05 | 23 · ∞ (no loss) · $0.08 |
| 02:00 | – | – | 35 · 8.70 · $0.26 | – | 22 · ∞ (no loss) · $0.14 |
| 03:00 | 3 · – · $0.00 | – | 142 · 0.98 · -$0.00 | 4 · 0.95 · -$0.00 | 9 · 5.50 · $0.01 |
| 04:00 | – | – | 117 · 2.46 · $0.15 | – | 2 · ∞ (no loss) · $0.00 |
| 05:00 | – | – | 250 · 5.11 · $0.16 | 31 · 0.09 · -$0.22 | 1 · ∞ (no loss) · $0.00 |
| 06:00 | – | – | 167 · 0.60 · -$0.07 | 9 · ∞ (no loss) · $0.00 | 8 · 0.57 · -$0.01 |
| 07:00 | 3 · – · $0.00 | – | 306 · 1.32 · $0.11 | – | 5 · ∞ (no loss) · $0.03 |
| 08:00 | 3 · – · $0.00 | – | 329 · 2.66 · $0.20 | 22 · 4.70 · $0.01 | 2 · ∞ (no loss) · $0.00 |
| 09:00 | 3 · – · $0.00 | – | 247 · 1.31 · $0.05 | 3 · 0.02 · -$0.02 | 1 · ∞ (no loss) · $0.00 |
| 10:00 | – | – | 221 · 1.59 · $0.04 | 2 · ∞ (no loss) · $0.00 | – |
| 11:00 | – | – | 894 · 7.69 · $0.59 | 21 · 1687.83 · $0.21 | 9 · ∞ (no loss) · $0.09 |
| 12:00 | – | – | 366 · 8.52 · $0.42 | 1 · ∞ (no loss) · $0.00 | 2 · 0.00 · -$0.00 |
| 13:00 | – | – | 311 · 2.64 · $0.12 | 7 · 1.16 · $0.00 | – |
| 14:00 | 3 · 0.00 · -$0.00 | – | 951 · 42.81 · $1.03 | 23 · 39.48 · $0.01 | – |
| 15:00 | – | – | 648 · 0.93 · -$0.05 | 10 · 0.22 · -$0.03 | 4 · 0.09 · -$0.02 |
| 16:00 | – | – | 345 · 0.53 · -$0.16 | 5 · 0.00 · -$0.02 | 8 · 0.00 · -$0.01 |
| 17:00 | – | – | 306 · 0.98 · -$0.00 | 22 · 0.01 · -$0.11 | 13 · 2.70 · $0.01 |
| 18:00 | 2 · – · $0.00 | 3 · ∞ (no loss) · $0.00 | 277 · 0.79 · -$0.03 | 37 · 1.54 · $0.01 | 7 · 3.92 · $0.00 |
| 19:00 | – | – | 419 · 0.44 · -$0.14 | 66 · 0.07 · -$0.05 | 15 · 0.87 · -$0.00 |
| 20:00 | 3 · ∞ (no loss) · $0.00 | 3 · 0.00 · -$0.00 | 636 · 4.92 · $0.35 | 12 · 0.25 · -$0.00 | 1 · 0.00 · -$0.00 |
| 21:00 | – | – | 334 · 8.47 · $0.22 | 17 · 1.12 · $0.00 | 7 · 1740.37 · $0.00 |
| 22:00 | 3 · – · $0.00 | – | 348 · 7.74 · $0.19 | 3 · 0.03 · -$0.01 | 13 · 515.37 · $0.01 |
| 23:00 | 2 · – · $0.00 | – | 340 · 1.69 · $0.05 | 38 · 0.03 · -$0.05 | 3 · 0.00 · -$0.00 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 4 | – | – | 2 · 0.00 · 0 % · -$0.04 | 2 · 0.00 · 0 % · -$0.07 | – | 4 · 0.00 · 0 % · -$0.11 |
| 01:00 | 59 | 18 · ∞ (no loss) · 100 % · $0.11 | 23 · ∞ (no loss) · 100 % · $0.10 | 1 · 0.00 · 0 % · -$0.04 | 17 · 0.06 · 41 % · -$0.38 | – | 18 · 0.05 · 39 % · -$0.42 |
| 02:00 | 57 | 30 · 17.35 · 90 % · $0.36 | 8 · 116.55 · 88 % · $0.02 | 11 · 2.77 · 82 % · $0.02 | 8 · 4.94 · 50 % · $0.00 | – | 19 · 2.91 · 68 % · $0.02 |
| 03:00 | 158 | 18 · 0.03 · 17 % · -$0.16 | 13 · 0.34 · 54 % · -$0.01 | 64 · 3.36 · 80 % · $0.09 | 63 · 117.77 · 83 % · $0.08 | – | 127 · 5.33 · 81 % · $0.17 |
| 04:00 | 119 | 8 · 0.01 · 38 % · -$0.09 | – | 47 · 24.44 · 89 % · $0.14 | 64 · 96.94 · 81 % · $0.10 | – | 111 · 35.74 · 85 % · $0.24 |
| 05:00 | 282 | 15 · 0.35 · 87 % · -$0.03 | 19 · 0.02 · 47 % · -$0.18 | 113 · 4.74 · 96 % · $0.07 | 135 · 5.48 · 93 % · $0.09 | – | 248 · 5.12 · 94 % · $0.16 |
| 06:00 | 184 | 12 · 0.64 · 83 % · -$0.01 | 14 · ∞ (no loss) · 100 % · $0.01 | 81 · 1.25 · 65 % · $0.01 | 77 · 0.37 · 77 % · -$0.09 | – | 158 · 0.58 · 71 % · -$0.08 |
| 07:00 | 314 | 8 · ∞ (no loss) · 100 % · $0.03 | – | 160 · 1.30 · 73 % · $0.04 | 146 · 1.33 · 66 % · $0.07 | – | 306 · 1.32 · 70 % · $0.11 |
| 08:00 | 356 | 26 · 0.48 · 81 % · -$0.01 | 17 · 15.29 · 76 % · $0.01 | 133 · 2.85 · 86 % · $0.13 | 180 · 3.17 · 76 % · $0.07 | – | 313 · 2.95 · 80 % · $0.21 |
| 09:00 | 254 | 4 · 0.05 · 75 % · -$0.01 | 22 · 0.66 · 86 % · -$0.00 | 111 · 0.56 · 55 % · -$0.07 | 117 · 7.08 · 86 % · $0.11 | – | 228 · 1.28 · 71 % · $0.05 |
| 10:00 | 223 | 6 · ∞ (no loss) · 100 % · $0.00 | – | 140 · 1.12 · 87 % · $0.01 | 77 · 57.15 · 88 % · $0.03 | – | 217 · 1.54 · 88 % · $0.03 |
| 11:00 | 924 | 27 · ∞ (no loss) · 100 % · $0.33 | 18 · 1508.67 · 89 % · $0.19 | 440 · 3.60 · 91 % · $0.18 | 439 · 10.87 · 90 % · $0.19 | – | 879 · 5.20 · 91 % · $0.37 |
| 12:00 | 369 | 7 · 104.69 · 71 % · $0.12 | 4 · 87.99 · 25 % · $0.00 | 204 · 4.26 · 93 % · $0.17 | 154 · 26.35 · 92 % · $0.14 | – | 358 · 6.37 · 92 % · $0.30 |
| 13:00 | 318 | 6 · 1.02 · 17 % · $0.00 | 3 · ∞ (no loss) · 100 % · $0.04 | 138 · 1.42 · 93 % · $0.02 | 171 · 4.78 · 81 % · $0.06 | – | 309 · 2.08 · 86 % · $0.08 |
| 14:00 | 977 | 28 · 19.98 · 79 % · $0.01 | 10 · ∞ (no loss) · 100 % · $0.01 | 495 · 21.67 · 97 % · $0.49 | 444 · 704.93 · 94 % · $0.53 | – | 939 · 42.68 · 96 % · $1.03 |
| 15:00 | 662 | 36 · 0.02 · 42 % · -$0.35 | 31 · 0.74 · 52 % · -$0.03 | 306 · 1.14 · 84 % · $0.03 | 289 · 6.05 · 91 % · $0.25 | – | 595 · 1.98 · 88 % · $0.29 |
| 16:00 | 358 | 35 · 0.00 · 0 % · -$0.02 | 36 · 0.16 · 39 % · -$0.05 | 154 · 0.46 · 41 % · -$0.10 | 133 · 0.81 · 59 % · -$0.02 | – | 287 · 0.58 · 49 % · -$0.12 |
| 17:00 | 341 | 24 · 0.32 · 29 % · -$0.03 | 41 · 0.47 · 49 % · -$0.05 | 136 · 0.57 · 48 % · -$0.07 | 140 · 1.99 · 82 % · $0.04 | – | 276 · 0.89 · 65 % · -$0.02 |
| 18:00 | 326 | 37 · 1.35 · 86 % · $0.01 | 44 · 1.79 · 84 % · $0.01 | 112 · 1.02 · 76 % · $0.00 | 133 · 0.44 · 66 % · -$0.04 | – | 245 · 0.73 · 71 % · -$0.04 |
| 19:00 | 500 | 73 · 0.09 · 59 % · -$0.04 | 94 · 0.19 · 71 % · -$0.05 | 172 · 0.50 · 46 % · -$0.06 | 161 · 0.50 · 73 % · -$0.04 | – | 333 · 0.50 · 59 % · -$0.11 |
| 20:00 | 655 | 45 · 2.63 · 71 % · $0.01 | 5 · 0.78 · 60 % · -$0.00 | 350 · 6.06 · 91 % · $0.20 | 255 · 3.74 · 93 % · $0.14 | – | 605 · 4.76 · 92 % · $0.34 |
| 21:00 | 358 | 16 · 6.52 · 88 % · $0.01 | 17 · 0.64 · 65 % · -$0.00 | 164 · 5.98 · 90 % · $0.11 | 161 · 15.63 · 91 % · $0.11 | – | 325 · 8.38 · 90 % · $0.21 |
| 22:00 | 367 | 13 · 9.42 · 31 % · $0.01 | 53 · 1.38 · 68 % · $0.00 | 131 · 3.22 · 90 % · $0.06 | 170 · 438.32 · 93 % · $0.12 | – | 301 · 7.80 · 92 % · $0.18 |
| 23:00 | 383 | 36 · 0.04 · 33 % · -$0.03 | 30 · 0.03 · 40 % · -$0.04 | 148 · 1.05 · 61 % · $0.00 | 169 · 66.31 · 90 % · $0.07 | – | 317 · 2.37 · 76 % · $0.07 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1103 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (162702 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (7566); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 13436 · 0.83 | 1887 · 1.76 | 2581 · 1.76 | 710 · 0.72 | 4 · 0.00 | – | – | – | 4 · 0.00 |
| 01:00 | 28519 · 0.88 | 5876 · 1.44 | 7995 · 1.64 | 1092 · 2.29 | 59 · 0.82 | 18 · ∞ (no loss) | 23 · ∞ (no loss) | – | 18 · 0.05 |
| 02:00 | 28668 · 0.80 | 6057 · 1.74 | 8671 · 1.33 | 1597 · 8.06 | 57 · 12.09 | 30 · 26.75 | 8 · 6.38 | – | 19 · 3.78 |
| 03:00 | 19472 · 0.66 | 4204 · 0.85 | 5224 · 0.70 | 1553 · 1.80 | 158 · 2.10 | 18 · 0.11 | 13 · 0.51 | – | 127 · 3.95 |
| 04:00 | 13657 · 0.95 | 2290 · 0.85 | 4063 · 0.77 | 1500 · 3.39 | 119 · 5.23 | 8 · 0.22 | – | – | 111 · 10.00 |
| 05:00 | 19218 · 0.87 | 5617 · 1.00 | 5613 · 1.39 | 3230 · 4.62 | 282 · 9.95 | 15 · 4.31 | 19 · 0.40 | – | 248 · 26.75 |
| 06:00 | 24107 · 1.09 | 4930 · 1.16 | 7307 · 1.19 | 2260 · 1.60 | 184 · 1.94 | 12 · 8.45 | 14 · ∞ (no loss) | – | 158 · 1.73 |
| 07:00 | 30467 · 0.55 | 9408 · 0.70 | 8126 · 0.60 | 4629 · 3.10 | 314 · 0.68 | 8 · ∞ (no loss) | – | – | 306 · 0.68 |
| 08:00 | 40648 · 0.81 | 9868 · 0.50 | 13960 · 1.20 | 2654 · 1.89 | 356 · 2.98 | 26 · 3.55 | 17 · 26.19 | – | 313 · 2.88 |
| 09:00 | 35372 · 1.27 | 8130 · 1.06 | 13179 · 1.18 | 4013 · 2.89 | 254 · 1.49 | 4 · 1.14 | 22 · 7.65 | – | 228 · 1.45 |
| 10:00 | 37259 · 0.93 | 10044 · 1.00 | 10473 · 1.03 | 1556 · 1.45 | 223 · 4.80 | 6 · ∞ (no loss) | – | – | 217 · 4.60 |
| 11:00 | 49042 · 0.74 | 17757 · 0.85 | 17273 · 0.73 | 6405 · 1.33 | 924 · 6.74 | 27 · ∞ (no loss) | 18 · 171.02 | – | 879 · 6.33 |
| 12:00 | 31768 · 0.81 | 8366 · 0.80 | 10297 · 1.25 | 2666 · 1.42 | 369 · 8.65 | 7 · 7.05 | 4 · 15.88 | – | 358 · 8.69 |
| 13:00 | 27385 · 1.10 | 5585 · 1.17 | 8856 · 1.45 | 2650 · 2.36 | 318 · 5.76 | 6 · 0.24 | 3 · ∞ (no loss) | – | 309 · 6.22 |
| 14:00 | 45473 · 0.49 | 12995 · 0.56 | 14724 · 0.44 | 5696 · 2.63 | 977 · 43.97 | 28 · 6.29 | 10 · ∞ (no loss) | – | 939 · 51.12 |
| 15:00 | 64400 · 0.75 | 16299 · 0.73 | 22333 · 0.90 | 6235 · 2.05 | 662 · 5.07 | 36 · 0.62 | 31 · 1.26 | – | 595 · 6.98 |
| 16:00 | 44715 · 0.72 | 12476 · 0.70 | 14740 · 0.72 | 6139 · 1.07 | 358 · 0.34 | 35 · 0.00 | 36 · 0.45 | – | 287 · 0.37 |
| 17:00 | 53102 · 0.67 | 16244 · 0.79 | 18198 · 0.72 | 6510 · 2.48 | 341 · 0.78 | 24 · 0.23 | 41 · 0.61 | – | 276 · 0.87 |
| 18:00 | 41758 · 1.59 | 12524 · 1.71 | 14103 · 1.57 | 3055 · 1.40 | 326 · 0.93 | 37 · 4.37 | 44 · 3.77 | – | 245 · 0.75 |
| 19:00 | 46084 · 0.94 | 14124 · 0.90 | 18415 · 1.25 | 4056 · 1.09 | 500 · 0.63 | 73 · 0.92 | 94 · 1.30 | – | 333 · 0.54 |
| 20:00 | 45392 · 1.05 | 12765 · 1.09 | 13015 · 1.10 | 4094 · 3.14 | 655 · 4.84 | 45 · 2.95 | 5 · 1.44 | – | 605 · 5.08 |
| 21:00 | 31988 · 1.55 | 7616 · 1.39 | 12914 · 2.32 | 4080 · 1.73 | 358 · 5.51 | 16 · 4.06 | 17 · 0.89 | – | 325 · 5.95 |
| 22:00 | 30047 · 0.98 | 7778 · 1.03 | 11438 · 1.36 | 2832 · 2.89 | 367 · 7.73 | 13 · 1.33 | 53 · 1.90 | – | 301 · 8.97 |
| 23:00 | 32199 · 0.92 | 8544 · 1.13 | 12424 · 1.08 | 3308 · 0.95 | 383 · 1.62 | 36 · 0.60 | 30 · 0.12 | – | 317 · 2.36 |
| **total** | **834176 · 0.84** | **221384 · 0.90** | **275922 · 0.95** | **82520 · 1.90** | **8548 · 2.55** | **528 · 1.45** | **502 · 1.51** | **–** | **7518 · 2.72** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 528 | 326 / 202 | 1.23 | 1.45 | $0.21 | 61.74 % | 9.50 |
| Trailing | 502 | 338 / 164 | 0.95 | 1.51 | -$0.03 | 67.33 % | 9.00 |
| Signal · Normal | 3813 | 3102 / 711 | 1.82 | 2.30 | $1.41 | 81.35 % | 4.75 |
| Signal · Trailing | 3705 | 3146 / 559 | 2.17 | 3.39 | $1.57 | 84.91 % | 10.25 |
| total | 8548 | 6912 / 1636 | 1.69 | 2.55 | $3.16 | 80.86 % | 7.00 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 7518 | 6248 / 1270 | 1.97 | 2.72 | $2.98 | 83.11 % | 5.25 |
| of which Engine (no signals) | 1030 | 664 / 366 | 1.12 | 1.47 | $0.18 | 64.47 % | 9.50 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 28 | 324313549732.16 | 0.65 | $0.00 |
| 5m+ | 9 | 59.77 | 0.73 | $0.00 |
| 15m | 8015 | 1.77 | 2.63 | $3.02 |
| 15m+ | 341 | 0.64 | 1.24 | -$0.21 |
| 30m | 155 | 5.19 | 2.32 | $0.33 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 52 | 38 / 14 | 8.79 | 0.67 | $0.01 | 73.08 % | 15.75 |
| Short | 492 | 360 / 132 | 0.86 | 1.89 | -$0.06 | 73.17 % | 10.50 |
| General | 171 | 81 / 90 | 0.37 | 0.85 | -$0.22 | 47.37 % | 22.00 |
| Long | 315 | 185 / 130 | 1.59 | 1.59 | $0.45 | 58.73 % | 9.00 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 7518 | 6248 / 1270 | 1.97 | 2.72 | $2.98 | 83.11 % | 5.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 108580 | sig:confirm 41328 · sig:duplicate 27164 · sig:signalPf 17887 · sig:signalSide 13435 · sig:signalCluster 8750 · sig:signalGuard 16 |
| Short | 3667 | lastN 2610 · engineSide 562 · symPf 335 · duplicate 160 |
| Micro | 2486 | engineSide 1105 · lastN 688 · crowd 649 · symPf 36 · duplicate 8 |
| Long | 2044 | lastN 1577 · symPf 333 · engineSide 88 · duplicate 46 |
| General | 1029 | lastN 801 · symPf 113 · engineSide 67 · duplicate 48 |
| Wide | 493 | lastN 225 · engineSide 219 · symPf 49 |

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
| Micro | 2.35 | 0.67 | 0.29 | 8.79 | 13.10 | 52 |
| Short | 1.55 | 1.89 | 1.21 | 0.86 | 0.45 | 492 |
| General | 1.52 | 0.85 | 0.56 | 0.37 | 0.44 | 171 |
| Long | 1.49 | 1.59 | 1.07 | 1.59 | 1.00 | 315 |
| Wide | 1.61 | – | – | – | – | 0 |
| Signals | – | 2.72 | – | 1.97 | 0.73 | 7518 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (3909 of 136048 evaluated, 158922 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2921 units active at the run start, 4649 over the run, 3657 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 749 | 531 (71 %) | 1873 | 86 % | 1.03 | 16.64 |
| Micro | trailing | 371 | 182 (49 %) | 1035 | 68 % | 0.78 | -63.17 |
| Short | normal | 614 | 251 (41 %) | 1401 | 65 % | 1.06 | 111.00 |
| Short | trailing | 945 | 292 (31 %) | 2348 | 61 % | 0.89 | -312.49 |
| General | normal | 194 | 67 (35 %) | 577 | 45 % | 0.91 | -91.08 |
| General | trailing | 169 | 60 (36 %) | 331 | 54 % | 0.83 | -88.14 |
| Long | normal | 330 | 121 (37 %) | 972 | 44 % | 1.00 | -8.38 |
| Long | trailing | 204 | 55 (27 %) | 669 | 51 % | 1.01 | 9.59 |
| Wide | axis | 333 | 94 (28 %) | 741 | 36 % | 0.63 | -251.89 |
| Signals | normal | 1823 | 1459 (80 %) | 37050 | 76 % | 1.64 | 38457.11 |
| Signals | trailing | 1834 | 1642 (90 %) | 35523 | 82 % | 2.71 | 56983.94 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1120 | 713 (64 %) | 2908 | 80 % | 0.94 | -46.53 |
| Short | active | 109 | 5 (5 %) | 69 | 46 % | 0.35 | -88.84 |
| Short | bollinger | 26 | 26 (100 %) | 26 | 100 % | ∞ (no loss) | 41.49 |
| Short | break | 215 | 107 (50 %) | 499 | 70 % | 1.33 | 158.69 |
| Short | channel | 54 | 2 (4 %) | 92 | 39 % | 0.24 | -143.48 |
| Short | direction | 117 | 37 (32 %) | 250 | 66 % | 1.35 | 104.07 |
| Short | ema | 155 | 60 (39 %) | 78 | 97 % | 17.36 | 124.33 |
| Short | ichimoku | 2 | 1 (50 %) | 1 | 100 % | ∞ (no loss) | 2.00 |
| Short | macd | 74 | 14 (19 %) | 847 | 60 % | 0.73 | -305.89 |
| Short | move | 409 | 89 (22 %) | 776 | 58 % | 0.76 | -274.05 |
| Short | osc | 47 | 30 (64 %) | 360 | 56 % | 0.96 | -18.36 |
| Short | rsi | 47 | 32 (68 %) | 267 | 61 % | 1.16 | 35.96 |
| Short | sar | 8 | 6 (75 %) | 51 | 67 % | 1.18 | 7.78 |
| Short | smooth | 74 | 58 (78 %) | 108 | 80 % | 1.86 | 63.29 |
| Short | trend | 89 | 40 (45 %) | 84 | 73 % | 1.35 | 27.30 |
| Short | volume | 133 | 36 (27 %) | 241 | 69 % | 1.27 | 64.23 |
| General | active | 14 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 72 | 31 (43 %) | 164 | 57 % | 1.12 | 31.23 |
| General | channel | 22 | 2 (9 %) | 18 | 22 % | 0.23 | -43.41 |
| General | direction | 16 | 2 (13 %) | 26 | 19 % | 0.08 | -72.23 |
| General | ema | 38 | 20 (53 %) | 44 | 82 % | 3.42 | 62.84 |
| General | macd | 9 | 3 (33 %) | 15 | 47 % | 0.76 | -6.48 |
| General | move | 31 | 9 (29 %) | 24 | 54 % | 1.17 | 3.81 |
| General | osc | 52 | 24 (46 %) | 380 | 43 % | 0.87 | -90.75 |
| General | rsi | 13 | 6 (46 %) | 44 | 50 % | 0.97 | -1.59 |
| General | sar | 1 | 1 (100 %) | 4 | 75 % | 39.95 | 6.23 |
| General | smooth | 29 | 15 (52 %) | 44 | 59 % | 1.39 | 24.84 |
| General | trend | 13 | 8 (62 %) | 11 | 100 % | ∞ (no loss) | 27.04 |
| General | volume | 53 | 6 (11 %) | 134 | 40 % | 0.53 | -120.75 |
| Long | active | 16 | 1 (6 %) | 12 | 58 % | 0.46 | -14.74 |
| Long | break | 118 | 34 (29 %) | 348 | 49 % | 0.79 | -177.95 |
| Long | channel | 58 | 16 (28 %) | 31 | 61 % | 1.86 | 47.53 |
| Long | direction | 36 | 13 (36 %) | 141 | 55 % | 1.38 | 111.79 |
| Long | ema | 11 | 11 (100 %) | 18 | 100 % | ∞ (no loss) | 87.52 |
| Long | macd | 5 | 3 (60 %) | 5 | 60 % | 2.27 | 8.40 |
| Long | move | 50 | 9 (18 %) | 77 | 44 % | 0.73 | -59.37 |
| Long | osc | 109 | 61 (56 %) | 682 | 45 % | 1.15 | 220.37 |
| Long | rsi | 26 | 0 (0 %) | 50 | 32 % | 0.50 | -95.02 |
| Long | smooth | 48 | 20 (42 %) | 121 | 42 % | 0.93 | -21.22 |
| Long | trend | 13 | 5 (38 %) | 45 | 58 % | 1.63 | 59.43 |
| Long | volume | 44 | 3 (7 %) | 111 | 37 % | 0.50 | -165.52 |
| Wide | active | 59 | 14 (24 %) | 68 | 41 % | 0.39 | -86.38 |
| Wide | bollinger | 22 | 3 (14 %) | 17 | 18 % | 0.19 | -21.40 |
| Wide | break | 51 | 21 (41 %) | 138 | 41 % | 1.28 | 21.59 |
| Wide | channel | 65 | 20 (31 %) | 201 | 36 % | 0.52 | -79.78 |
| Wide | direction | 23 | 6 (26 %) | 36 | 36 % | 0.22 | -39.96 |
| Wide | ema | 9 | 0 (0 %) | 6 | 50 % | 0.59 | -1.31 |
| Wide | macd | 9 | 0 (0 %) | 18 | 17 % | 0.31 | -12.15 |
| Wide | move | 62 | 15 (24 %) | 187 | 35 % | 0.63 | -47.43 |
| Wide | osc | 16 | 15 (94 %) | 34 | 56 % | 4.28 | 54.02 |
| Wide | rsi | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -18.78 |
| Wide | smooth | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 2 | 0 (0 %) | 18 | 22 % | 0.18 | -20.30 |
| Signals | signal:act-burst | 60 | 44 (73 %) | 1546 | 75 % | 1.62 | 1496.72 |
| Signals | signal:act-hf | 60 | 58 (97 %) | 2126 | 81 % | 2.64 | 3445.16 |
| Signals | signal:adx | 60 | 46 (77 %) | 616 | 79 % | 1.59 | 630.43 |
| Signals | signal:atr-break | 60 | 54 (90 %) | 1663 | 80 % | 2.26 | 2547.27 |
| Signals | signal:bollinger | 60 | 42 (70 %) | 954 | 72 % | 1.41 | 694.28 |
| Signals | signal:cci | 60 | 33 (55 %) | 1110 | 71 % | 1.22 | 442.76 |
| Signals | signal:cmf | 60 | 57 (95 %) | 1494 | 80 % | 2.10 | 2182.49 |
| Signals | signal:donchian | 60 | 57 (95 %) | 1466 | 81 % | 2.04 | 2074.34 |
| Signals | signal:ema-cross | 60 | 58 (97 %) | 626 | 86 % | 4.11 | 1337.45 |
| Signals | signal:ema-cross-fast | 60 | 59 (98 %) | 1003 | 85 % | 3.23 | 1879.44 |
| Signals | signal:ema-pullback | 60 | 46 (77 %) | 1289 | 80 % | 2.49 | 1984.43 |
| Signals | signal:ema-slope | 60 | 58 (97 %) | 763 | 88 % | 4.37 | 1778.23 |
| Signals | signal:ema-trend | 60 | 57 (95 %) | 1141 | 82 % | 2.77 | 2073.73 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 2295 | 78 % | 1.83 | 2490.22 |
| Signals | signal:hma | 60 | 56 (93 %) | 1572 | 80 % | 2.23 | 2328.28 |
| Signals | signal:ichimoku | 60 | 44 (73 %) | 794 | 81 % | 1.65 | 852.52 |
| Signals | signal:impulse | 60 | 55 (92 %) | 1633 | 79 % | 2.08 | 2251.88 |
| Signals | signal:kama | 60 | 58 (97 %) | 1609 | 77 % | 1.73 | 1738.03 |
| Signals | signal:keltner | 60 | 52 (87 %) | 1026 | 78 % | 1.90 | 1277.46 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 1711 | 77 % | 1.84 | 1943.55 |
| Signals | signal:macd-hist | 60 | 57 (95 %) | 2299 | 79 % | 2.27 | 3307.97 |
| Signals | signal:macd-slow | 60 | 54 (90 %) | 1624 | 79 % | 2.24 | 2352.31 |
| Signals | signal:mfi | 30 | 17 (57 %) | 119 | 74 % | 1.00 | 1.02 |
| Signals | signal:obv | 60 | 56 (93 %) | 1525 | 78 % | 1.63 | 1467.19 |
| Signals | signal:r-awesome | 60 | 59 (98 %) | 1441 | 82 % | 3.07 | 2620.59 |
| Signals | signal:r-connors | 60 | 57 (95 %) | 551 | 91 % | 8.85 | 1425.76 |
| Signals | signal:r-fractal | 60 | 57 (95 %) | 1268 | 82 % | 2.66 | 2165.76 |
| Signals | signal:r-inside | 51 | 51 (100 %) | 260 | 96 % | 31.68 | 721.94 |
| Signals | signal:r-linreg | 60 | 58 (97 %) | 1246 | 83 % | 3.39 | 2422.25 |
| Signals | signal:r-nr-break | 60 | 60 (100 %) | 2102 | 81 % | 2.07 | 2842.22 |
| Signals | signal:r-session-trend | 60 | 53 (88 %) | 1005 | 80 % | 2.39 | 1699.49 |
| Signals | signal:r-vol-regime | 60 | 58 (97 %) | 941 | 80 % | 2.17 | 1408.78 |
| Signals | signal:reclaim | 60 | 58 (97 %) | 1169 | 82 % | 2.98 | 2036.53 |
| Signals | signal:rsi-mid | 60 | 56 (93 %) | 1508 | 82 % | 2.74 | 2428.66 |
| Signals | signal:rsi-momentum | 60 | 57 (95 %) | 247 | 83 % | 3.36 | 585.05 |
| Signals | signal:rsi-reversal | 55 | 4 (7 %) | 245 | 27 % | 0.12 | -1320.69 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 2600 | 82 % | 2.82 | 4604.12 |
| Signals | signal:s2-adx-gate | 60 | 57 (95 %) | 1171 | 81 % | 2.64 | 1930.51 |
| Signals | signal:s2-atr-break | 60 | 58 (97 %) | 2316 | 79 % | 2.09 | 3031.60 |
| Signals | signal:s2-bb-bounce | 60 | 13 (22 %) | 762 | 59 % | 0.69 | -750.28 |
| Signals | signal:s2-block-scale | 60 | 60 (100 %) | 2164 | 82 % | 2.57 | 3432.71 |
| Signals | signal:s2-block-stack | 60 | 55 (92 %) | 1492 | 78 % | 1.74 | 1588.28 |
| Signals | signal:s2-confluence | 60 | 59 (98 %) | 1096 | 84 % | 3.08 | 2012.16 |
| Signals | signal:s2-ema-cross | 20 | 13 (65 %) | 37 | 70 % | 1.20 | 10.66 |
| Signals | signal:s2-range-break | 60 | 53 (88 %) | 434 | 79 % | 2.45 | 653.99 |
| Signals | signal:s2-range-shift | 60 | 58 (97 %) | 1563 | 82 % | 2.56 | 2717.43 |
| Signals | signal:s2-rsi-revert | 59 | 3 (5 %) | 417 | 39 % | 0.21 | -1723.97 |
| Signals | signal:s2-st-trail | 60 | 57 (95 %) | 562 | 88 % | 3.82 | 1360.14 |
| Signals | signal:s2-stoch-swing | 60 | 29 (48 %) | 961 | 67 % | 0.96 | -81.33 |
| Signals | signal:s2-vol-break | 54 | 54 (100 %) | 219 | 94 % | 22.31 | 595.43 |
| Signals | signal:s2-vwap-axis | 37 | 34 (92 %) | 56 | 93 % | 187.54 | 161.69 |
| Signals | signal:sar | 60 | 44 (73 %) | 1689 | 75 % | 1.55 | 1476.47 |
| Signals | signal:squeeze | 60 | 45 (75 %) | 339 | 81 % | 3.08 | 600.73 |
| Signals | signal:st-slow | 60 | 49 (82 %) | 451 | 83 % | 2.64 | 846.92 |
| Signals | signal:stoch-rsi | 60 | 48 (80 %) | 1611 | 77 % | 1.73 | 1638.22 |
| Signals | signal:supertrend | 60 | 58 (97 %) | 792 | 85 % | 4.27 | 1780.79 |
| Signals | signal:swing | 60 | 50 (83 %) | 1886 | 77 % | 1.79 | 2215.04 |
| Signals | signal:thrust | 60 | 59 (98 %) | 1887 | 80 % | 2.46 | 2855.66 |
| Signals | signal:trix | 60 | 55 (92 %) | 741 | 86 % | 4.39 | 1651.28 |
| Signals | signal:volume-break | 51 | 50 (98 %) | 110 | 90 % | 10.58 | 293.36 |
| Signals | signal:vwap | 60 | 59 (98 %) | 1046 | 80 % | 1.92 | 1316.17 |
| Signals | signal:williams-r | 60 | 42 (70 %) | 1298 | 75 % | 1.31 | 763.91 |
| Signals | signal:zscore | 60 | 18 (30 %) | 886 | 58 % | 0.60 | -1154.16 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 23514 | 17142 | 1120 | 0.97 | 4.00 | 70.00–163.33 (median 163.33) | 1706 | 8218 | 391 | 2395 | 1458 | 298 | 1480 | 0 | 58 | 18 | 0 | 0 | 6372 |  |
| Short | 40005 | 37089 | 1559 | 1.31 | 2.37 | 163.33–163.33 (median 163.33) | 3707 | 6886 | 1713 | 7678 | 4689 | 2412 | 7795 | 15 | 635 | 0 | 0 | 0 | 2916 |  |
| General | 13735 | 12655 | 363 | 1.34 | 2.01 | 163.33–163.33 (median 163.33) | 1052 | 1812 | 584 | 2877 | 1390 | 1103 | 3290 | 0 | 172 | 12 | 0 | 0 | 1080 |  |
| Long | 20877 | 19527 | 534 | 1.25 | 1.74 | 163.33–163.33 (median 163.33) | 1330 | 3690 | 1100 | 5765 | 1935 | 1427 | 3475 | 0 | 246 | 25 | 0 | 0 | 1350 |  |
| Wide | 60791 | 49635 | 333 | 0.74 | 2.79 | 18.00–163.33 (median 163.33) | 11442 | 27566 | 1116 | 4881 | 1970 | 459 | 1582 | 0 | 275 | 11 | 0 | 9176 | 1980 |  |
| Signals | 3780 | – | 2921 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2921 units (pair × symbol × direction) active at the run start, 4649 over the run; 3657 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 7896 | 4376 (55 %) | 25724 | 80 % | 0.86 | -926.30 |
| Micro | trailing | 15618 | 8344 (53 %) | 51234 | 67 % | 0.76 | -3088.44 |
| Short | normal | 13329 | 4981 (37 %) | 50816 | 58 % | 0.86 | -9649.34 |
| Short | trailing | 26676 | 10802 (40 %) | 108450 | 58 % | 0.84 | -19470.10 |
| General | normal | 8242 | 2620 (32 %) | 27541 | 40 % | 0.81 | -8942.89 |
| General | trailing | 5493 | 1737 (32 %) | 18293 | 52 % | 0.77 | -6838.68 |
| Long | normal | 12535 | 3500 (28 %) | 45172 | 35 % | 0.69 | -36983.92 |
| Long | trailing | 8342 | 2475 (30 %) | 29753 | 50 % | 0.73 | -20297.83 |
| Wide | axis | 51615 | 13341 (26 %) | 289482 | 31 % | 0.65 | -84172.41 |
| Wide | dca | 4588 | 1580 (34 %) | 29762 | 63 % | 0.63 | -16191.42 |
| Wide | dca-active | 4588 | 740 (16 %) | 17626 | 29 % | 0.46 | -9160.84 |
| Signals | normal | 1890 | 1177 (62 %) | 72131 | 70 % | 1.11 | 17968.75 |
| Signals | trailing | 1890 | 1287 (68 %) | 68192 | 77 % | 1.25 | 31484.25 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1120 | 713 (64 %) | 2908 | 80 % | 0.94 | -46.53 |
| Short | active | 109 | 5 (5 %) | 69 | 46 % | 0.35 | -88.84 |
| Short | bollinger | 26 | 26 (100 %) | 26 | 100 % | ∞ (no loss) | 41.49 |
| Short | break | 215 | 107 (50 %) | 499 | 70 % | 1.33 | 158.69 |
| Short | channel | 54 | 2 (4 %) | 92 | 39 % | 0.24 | -143.48 |
| Short | direction | 117 | 37 (32 %) | 250 | 66 % | 1.35 | 104.07 |
| Short | ema | 155 | 60 (39 %) | 78 | 97 % | 17.36 | 124.33 |
| Short | ichimoku | 2 | 1 (50 %) | 1 | 100 % | ∞ (no loss) | 2.00 |
| Short | macd | 74 | 14 (19 %) | 847 | 60 % | 0.73 | -305.89 |
| Short | move | 409 | 89 (22 %) | 776 | 58 % | 0.76 | -274.05 |
| Short | osc | 47 | 30 (64 %) | 360 | 56 % | 0.96 | -18.36 |
| Short | rsi | 47 | 32 (68 %) | 267 | 61 % | 1.16 | 35.96 |
| Short | sar | 8 | 6 (75 %) | 51 | 67 % | 1.18 | 7.78 |
| Short | smooth | 74 | 58 (78 %) | 108 | 80 % | 1.86 | 63.29 |
| Short | trend | 89 | 40 (45 %) | 84 | 73 % | 1.35 | 27.30 |
| Short | volume | 133 | 36 (27 %) | 241 | 69 % | 1.27 | 64.23 |
| General | active | 14 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | break | 72 | 31 (43 %) | 164 | 57 % | 1.12 | 31.23 |
| General | channel | 22 | 2 (9 %) | 18 | 22 % | 0.23 | -43.41 |
| General | direction | 16 | 2 (13 %) | 26 | 19 % | 0.08 | -72.23 |
| General | ema | 38 | 20 (53 %) | 44 | 82 % | 3.42 | 62.84 |
| General | macd | 9 | 3 (33 %) | 15 | 47 % | 0.76 | -6.48 |
| General | move | 31 | 9 (29 %) | 24 | 54 % | 1.17 | 3.81 |
| General | osc | 52 | 24 (46 %) | 380 | 43 % | 0.87 | -90.75 |
| General | rsi | 13 | 6 (46 %) | 44 | 50 % | 0.97 | -1.59 |
| General | sar | 1 | 1 (100 %) | 4 | 75 % | 39.95 | 6.23 |
| General | smooth | 29 | 15 (52 %) | 44 | 59 % | 1.39 | 24.84 |
| General | trend | 13 | 8 (62 %) | 11 | 100 % | ∞ (no loss) | 27.04 |
| General | volume | 53 | 6 (11 %) | 134 | 40 % | 0.53 | -120.75 |
| Long | active | 16 | 1 (6 %) | 12 | 58 % | 0.46 | -14.74 |
| Long | break | 118 | 34 (29 %) | 348 | 49 % | 0.79 | -177.95 |
| Long | channel | 58 | 16 (28 %) | 31 | 61 % | 1.86 | 47.53 |
| Long | direction | 36 | 13 (36 %) | 141 | 55 % | 1.38 | 111.79 |
| Long | ema | 11 | 11 (100 %) | 18 | 100 % | ∞ (no loss) | 87.52 |
| Long | macd | 5 | 3 (60 %) | 5 | 60 % | 2.27 | 8.40 |
| Long | move | 50 | 9 (18 %) | 77 | 44 % | 0.73 | -59.37 |
| Long | osc | 109 | 61 (56 %) | 682 | 45 % | 1.15 | 220.37 |
| Long | rsi | 26 | 0 (0 %) | 50 | 32 % | 0.50 | -95.02 |
| Long | smooth | 48 | 20 (42 %) | 121 | 42 % | 0.93 | -21.22 |
| Long | trend | 13 | 5 (38 %) | 45 | 58 % | 1.63 | 59.43 |
| Long | volume | 44 | 3 (7 %) | 111 | 37 % | 0.50 | -165.52 |
| Wide | active | 59 | 14 (24 %) | 68 | 41 % | 0.39 | -86.38 |
| Wide | bollinger | 22 | 3 (14 %) | 17 | 18 % | 0.19 | -21.40 |
| Wide | break | 51 | 21 (41 %) | 138 | 41 % | 1.28 | 21.59 |
| Wide | channel | 65 | 20 (31 %) | 201 | 36 % | 0.52 | -79.78 |
| Wide | direction | 23 | 6 (26 %) | 36 | 36 % | 0.22 | -39.96 |
| Wide | ema | 9 | 0 (0 %) | 6 | 50 % | 0.59 | -1.31 |
| Wide | macd | 9 | 0 (0 %) | 18 | 17 % | 0.31 | -12.15 |
| Wide | move | 62 | 15 (24 %) | 187 | 35 % | 0.63 | -47.43 |
| Wide | osc | 16 | 15 (94 %) | 34 | 56 % | 4.28 | 54.02 |
| Wide | rsi | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -18.78 |
| Wide | smooth | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | trend | 2 | 0 (0 %) | 18 | 22 % | 0.18 | -20.30 |
| Signals | signal:act-burst | 60 | 44 (73 %) | 1546 | 75 % | 1.62 | 1496.72 |
| Signals | signal:act-hf | 60 | 58 (97 %) | 2126 | 81 % | 2.64 | 3445.16 |
| Signals | signal:adx | 60 | 46 (77 %) | 616 | 79 % | 1.59 | 630.43 |
| Signals | signal:atr-break | 60 | 54 (90 %) | 1663 | 80 % | 2.26 | 2547.27 |
| Signals | signal:bollinger | 60 | 42 (70 %) | 954 | 72 % | 1.41 | 694.28 |
| Signals | signal:cci | 60 | 33 (55 %) | 1110 | 71 % | 1.22 | 442.76 |
| Signals | signal:cmf | 60 | 57 (95 %) | 1494 | 80 % | 2.10 | 2182.49 |
| Signals | signal:donchian | 60 | 57 (95 %) | 1466 | 81 % | 2.04 | 2074.34 |
| Signals | signal:ema-cross | 60 | 58 (97 %) | 626 | 86 % | 4.11 | 1337.45 |
| Signals | signal:ema-cross-fast | 60 | 59 (98 %) | 1003 | 85 % | 3.23 | 1879.44 |
| Signals | signal:ema-pullback | 60 | 46 (77 %) | 1289 | 80 % | 2.49 | 1984.43 |
| Signals | signal:ema-slope | 60 | 58 (97 %) | 763 | 88 % | 4.37 | 1778.23 |
| Signals | signal:ema-trend | 60 | 57 (95 %) | 1141 | 82 % | 2.77 | 2073.73 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 2295 | 78 % | 1.83 | 2490.22 |
| Signals | signal:hma | 60 | 56 (93 %) | 1572 | 80 % | 2.23 | 2328.28 |
| Signals | signal:ichimoku | 60 | 44 (73 %) | 794 | 81 % | 1.65 | 852.52 |
| Signals | signal:impulse | 60 | 55 (92 %) | 1633 | 79 % | 2.08 | 2251.88 |
| Signals | signal:kama | 60 | 58 (97 %) | 1609 | 77 % | 1.73 | 1738.03 |
| Signals | signal:keltner | 60 | 52 (87 %) | 1026 | 78 % | 1.90 | 1277.46 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 1711 | 77 % | 1.84 | 1943.55 |
| Signals | signal:macd-hist | 60 | 57 (95 %) | 2299 | 79 % | 2.27 | 3307.97 |
| Signals | signal:macd-slow | 60 | 54 (90 %) | 1624 | 79 % | 2.24 | 2352.31 |
| Signals | signal:mfi | 30 | 17 (57 %) | 119 | 74 % | 1.00 | 1.02 |
| Signals | signal:obv | 60 | 56 (93 %) | 1525 | 78 % | 1.63 | 1467.19 |
| Signals | signal:r-awesome | 60 | 59 (98 %) | 1441 | 82 % | 3.07 | 2620.59 |
| Signals | signal:r-connors | 60 | 57 (95 %) | 551 | 91 % | 8.85 | 1425.76 |
| Signals | signal:r-fractal | 60 | 57 (95 %) | 1268 | 82 % | 2.66 | 2165.76 |
| Signals | signal:r-inside | 51 | 51 (100 %) | 260 | 96 % | 31.68 | 721.94 |
| Signals | signal:r-linreg | 60 | 58 (97 %) | 1246 | 83 % | 3.39 | 2422.25 |
| Signals | signal:r-nr-break | 60 | 60 (100 %) | 2102 | 81 % | 2.07 | 2842.22 |
| Signals | signal:r-session-trend | 60 | 53 (88 %) | 1005 | 80 % | 2.39 | 1699.49 |
| Signals | signal:r-vol-regime | 60 | 58 (97 %) | 941 | 80 % | 2.17 | 1408.78 |
| Signals | signal:reclaim | 60 | 58 (97 %) | 1169 | 82 % | 2.98 | 2036.53 |
| Signals | signal:rsi-mid | 60 | 56 (93 %) | 1508 | 82 % | 2.74 | 2428.66 |
| Signals | signal:rsi-momentum | 60 | 57 (95 %) | 247 | 83 % | 3.36 | 585.05 |
| Signals | signal:rsi-reversal | 55 | 4 (7 %) | 245 | 27 % | 0.12 | -1320.69 |
| Signals | signal:s2-active-hf | 60 | 60 (100 %) | 2600 | 82 % | 2.82 | 4604.12 |
| Signals | signal:s2-adx-gate | 60 | 57 (95 %) | 1171 | 81 % | 2.64 | 1930.51 |
| Signals | signal:s2-atr-break | 60 | 58 (97 %) | 2316 | 79 % | 2.09 | 3031.60 |
| Signals | signal:s2-bb-bounce | 60 | 13 (22 %) | 762 | 59 % | 0.69 | -750.28 |
| Signals | signal:s2-block-scale | 60 | 60 (100 %) | 2164 | 82 % | 2.57 | 3432.71 |
| Signals | signal:s2-block-stack | 60 | 55 (92 %) | 1492 | 78 % | 1.74 | 1588.28 |
| Signals | signal:s2-confluence | 60 | 59 (98 %) | 1096 | 84 % | 3.08 | 2012.16 |
| Signals | signal:s2-ema-cross | 20 | 13 (65 %) | 37 | 70 % | 1.20 | 10.66 |
| Signals | signal:s2-range-break | 60 | 53 (88 %) | 434 | 79 % | 2.45 | 653.99 |
| Signals | signal:s2-range-shift | 60 | 58 (97 %) | 1563 | 82 % | 2.56 | 2717.43 |
| Signals | signal:s2-rsi-revert | 59 | 3 (5 %) | 417 | 39 % | 0.21 | -1723.97 |
| Signals | signal:s2-st-trail | 60 | 57 (95 %) | 562 | 88 % | 3.82 | 1360.14 |
| Signals | signal:s2-stoch-swing | 60 | 29 (48 %) | 961 | 67 % | 0.96 | -81.33 |
| Signals | signal:s2-vol-break | 54 | 54 (100 %) | 219 | 94 % | 22.31 | 595.43 |
| Signals | signal:s2-vwap-axis | 37 | 34 (92 %) | 56 | 93 % | 187.54 | 161.69 |
| Signals | signal:sar | 60 | 44 (73 %) | 1689 | 75 % | 1.55 | 1476.47 |
| Signals | signal:squeeze | 60 | 45 (75 %) | 339 | 81 % | 3.08 | 600.73 |
| Signals | signal:st-slow | 60 | 49 (82 %) | 451 | 83 % | 2.64 | 846.92 |
| Signals | signal:stoch-rsi | 60 | 48 (80 %) | 1611 | 77 % | 1.73 | 1638.22 |
| Signals | signal:supertrend | 60 | 58 (97 %) | 792 | 85 % | 4.27 | 1780.79 |
| Signals | signal:swing | 60 | 50 (83 %) | 1886 | 77 % | 1.79 | 2215.04 |
| Signals | signal:thrust | 60 | 59 (98 %) | 1887 | 80 % | 2.46 | 2855.66 |
| Signals | signal:trix | 60 | 55 (92 %) | 741 | 86 % | 4.39 | 1651.28 |
| Signals | signal:volume-break | 51 | 50 (98 %) | 110 | 90 % | 10.58 | 293.36 |
| Signals | signal:vwap | 60 | 59 (98 %) | 1046 | 80 % | 1.92 | 1316.17 |
| Signals | signal:williams-r | 60 | 42 (70 %) | 1298 | 75 % | 1.31 | 763.91 |
| Signals | signal:zscore | 60 | 18 (30 %) | 886 | 58 % | 0.60 | -1154.16 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Short | 1.1 | 298 | 155 (52 %) | 2193 | 62 % | 0.95 | -130.05 |
| Short | 1.25 | 270 | 148 (55 %) | 1871 | 63 % | 0.98 | -44.70 |
| Short | 1.35 | 247 | 141 (57 %) | 1598 | 64 % | 1.02 | 36.88 |
| Short | 1.5 | 198 | 112 (57 %) | 1249 | 64 % | 1.02 | 35.66 |
| Short | 1.75 | 128 | 76 (59 %) | 673 | 65 % | 1.09 | 71.69 |
| Short | 2 | 92 | 55 (60 %) | 460 | 64 % | 1.04 | 22.99 |
| General | 1.1 | 115 | 43 (37 %) | 625 | 45 % | 0.81 | -224.32 |
| General | 1.25 | 111 | 42 (38 %) | 593 | 45 % | 0.82 | -202.12 |
| General | 1.35 | 101 | 39 (39 %) | 522 | 46 % | 0.84 | -155.91 |
| General | 1.5 | 79 | 29 (37 %) | 386 | 47 % | 0.84 | -117.54 |
| General | 1.75 | 43 | 13 (30 %) | 200 | 45 % | 0.75 | -101.78 |
| General | 2 | 13 | 3 (23 %) | 48 | 44 % | 0.66 | -34.72 |
| Long | 1.1 | 255 | 104 (41 %) | 1392 | 46 % | 0.97 | -87.79 |
| Long | 1.25 | 238 | 94 (39 %) | 1277 | 46 % | 0.97 | -83.13 |
| Long | 1.35 | 209 | 84 (40 %) | 1105 | 46 % | 1.01 | 29.09 |
| Long | 1.5 | 173 | 71 (41 %) | 908 | 46 % | 1.01 | 23.62 |
| Long | 1.75 | 98 | 38 (39 %) | 548 | 46 % | 0.93 | -89.69 |
| Long | 2 | 38 | 11 (29 %) | 225 | 43 % | 0.81 | -107.00 |
| Wide | 1.1 | 11 | 6 (55 %) | 72 | 35 % | 1.12 | 8.29 |
| Wide | 1.25 | 11 | 6 (55 %) | 72 | 35 % | 1.12 | 8.29 |
| Wide | 1.35 | 11 | 6 (55 %) | 72 | 35 % | 1.12 | 8.29 |
| Wide | 1.5 | 8 | 3 (38 %) | 57 | 28 % | 0.48 | -33.60 |
| Wide | 1.75 | 5 | 0 (0 %) | 42 | 17 % | 0.14 | -48.05 |
| Wide | 2 | 4 | 0 (0 %) | 34 | 18 % | 0.15 | -38.80 |
| Signals | 1.1 | 648 | 580 (90 %) | 12305 | 82 % | 2.65 | 23638.59 |
| Signals | 1.25 | 378 | 341 (90 %) | 7063 | 83 % | 2.88 | 14585.48 |
| Signals | 1.35 | 274 | 250 (91 %) | 5103 | 83 % | 3.08 | 11002.04 |
| Signals | 1.5 | 172 | 162 (94 %) | 3312 | 85 % | 3.26 | 7320.03 |
| Signals | 1.75 | 86 | 84 (98 %) | 1730 | 86 % | 3.55 | 3959.00 |
| Signals | 2 | 47 | 46 (98 %) | 978 | 86 % | 3.24 | 2105.22 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | ribbon | mc-mturn-10@m15c | 90 | 60 (67 %) | 810 | 83 % | 1.81 | 107.02 | tp0.6 sl2.25 tr0 h64 mc (9 · ∞ (no loss) · 3.60) |
| Micro | pulse | mc-ibrk@m5 | 59 | 59 (100 %) | 177 | 100 % | ∞ (no loss) | 63.60 | – |
| Micro | ribbon | mc-trsi2-10@m15 | 70 | 70 (100 %) | 140 | 100 % | ∞ (no loss) | 48.20 | – |
| Micro | ribbon | mc-trsi2-10@m15c | 70 | 70 (100 %) | 140 | 100 % | ∞ (no loss) | 48.20 | – |
| Micro | clamp | mc-tmom-5@m5 | 222 | 160 (72 %) | 222 | 72 % | 8.99 | 38.31 | – |
| Micro | sandwich | mc-ibrk@m5 | 30 | 24 (80 %) | 90 | 93 % | 5.11 | 23.85 | – |
| Micro | ribbon | mc-irsi2-10@m15c | 36 | 36 (100 %) | 36 | 100 % | ∞ (no loss) | 13.00 | – |
| Micro | clamp | mc-mturn-10@m15c | 228 | 152 (67 %) | 456 | 83 % | 1.12 | 12.55 | – |
| Micro | pivot | mc-lag-3@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 10.70 | – |
| Micro | magnet | mc-lag-6@m5 | 8 | 7 (88 %) | 24 | 79 % | 3.77 | 3.31 | – |
| Micro | ribbon | mc-tpull-8@m5 | 3 | 3 (100 %) | 12 | 75 % | 10.14 | 3.24 | – |
| Micro | clamp | mc-wick-2@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 2.10 | – |
| Micro | sweep | mc-qrsi2-5@m5 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 1.80 | – |
| Micro | clamp | mc-rsit2-30@m5c | 28 | 11 (39 %) | 28 | 39 % | 1.66 | 1.66 | – |
| Micro | magnet | mc-tz-25@m5 | 2 | 0 (0 %) | 6 | 67 % | 0.15 | -3.30 | – |
| Micro | magnet | mc-rsit5-25@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -13.20 | – |
| Micro | magnet | mc-lag-12@m5 | 40 | 10 (25 %) | 280 | 77 % | 0.80 | -16.81 | tp0.55 sl2.75 tr0 h192 mc (7 · ∞ (no loss) · 2.45) |
| Micro | sweep | mc-rsi3-5@m5 | 7 | 0 (0 %) | 28 | 25 % | 0.11 | -22.97 | – |
| Micro | magnet | mc-rsit3-30@m15c | 10 | 0 (0 %) | 30 | 33 % | 0.06 | -46.00 | – |
| Micro | sweep | mc-rsi4-10@m5 | 43 | 2 (5 %) | 172 | 67 % | 0.35 | -69.49 | – |
| Micro | magnet | mc-rsit7-30@m15c | 42 | 0 (0 %) | 42 | 0 % | 0.00 | -106.97 | – |
| Micro | sweep | mc-rsi5-10@m5 | 76 | 0 (0 %) | 152 | 50 % | 0.12 | -148.82 | – |
| Short | revert | r-klinger-m@m15c | 36 | 34 (94 %) | 178 | 77 % | 1.96 | 117.71 | tp2.6 sl2.6 tr0 h64 sh (5 · 3.43 · 6.80) |
| Short | ribbon | dir-vwap-240@m15c | 11 | 8 (73 %) | 166 | 66 % | 1.43 | 90.55 | tp2.8 sl5.6 tr1.4 h96 sh (15 · 3.15 · 27.85) |
| Short | magnet | willr-28-90@m15 | 9 | 9 (100 %) | 116 | 77 % | 2.51 | 89.32 | tp2.8 sl2.8 tr1.4 h96 sh (13 · 2.82 · 12.66) |
| Short | sandwich | hma-32@m15 | 38 | 38 (100 %) | 38 | 100 % | ∞ (no loss) | 74.81 | – |
| Short | revert | r-bos-m@m15c | 11 | 11 (100 %) | 35 | 100 % | ∞ (no loss) | 68.73 | – |
| Short | revert | r-fvg-m@m30 | 15 | 15 (100 %) | 45 | 87 % | 4.87 | 66.29 | – |
| Short | sandwich | move-impulse@m15 | 35 | 35 (100 %) | 35 | 100 % | ∞ (no loss) | 63.33 | – |
| Short | sandwich | trend-st-14-4@m15c | 35 | 35 (100 %) | 35 | 100 % | ∞ (no loss) | 61.68 | – |
| Short | magnet | rsi-div@m15 | 39 | 31 (79 %) | 254 | 62 % | 1.31 | 61.26 | tp2.4 sl3.6 tr1.8 h96 sh (5 · 2.92 · 7.29) |
| Short | sandwich | break-don10@m15 | 34 | 34 (100 %) | 34 | 100 % | ∞ (no loss) | 59.29 | – |
| Short | sandwich | ema-slope-10@m15 | 32 | 32 (100 %) | 32 | 100 % | ∞ (no loss) | 56.78 | – |
| Short | pivot | break-vol-1.3@m30 | 13 | 13 (100 %) | 26 | 92 % | 196.59 | 45.66 | – |
| Short | ribbon | r-bb-adx@m15c | 26 | 26 (100 %) | 26 | 100 % | ∞ (no loss) | 41.49 | – |
| Short | sandwich | ema-slope-10@m15c | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 31.21 | – |
| Short | sweep | r-vol-regime@m30 | 5 | 5 (100 %) | 15 | 100 % | ∞ (no loss) | 28.20 | – |
| Short | follow | r-nr-break@m15c | 12 | 10 (83 %) | 119 | 65 % | 1.29 | 26.65 | tp2.4 sl3.6 tr1.2 h64 sh (10 · 2.47 · 6.37) |
| Short | magnet | break-fail@m15c | 5 | 5 (100 %) | 67 | 70 % | 1.43 | 26.00 | tp2.6 sl2.6 tr0 h64 sh (13 · 1.93 · 10.40) |
| Short | ribbon | macd-cross@m15 | 14 | 9 (64 %) | 169 | 67 % | 1.19 | 25.64 | tp1.8 sl2.7 tr1.35 h64 sh (12 · 1.75 · 6.54) |
| Short | pivot | dir-reclaim-50@m30 | 14 | 12 (86 %) | 14 | 86 % | 75.10 | 24.67 | – |
| Short | magnet | r-pin-m@m15 | 37 | 21 (57 %) | 111 | 64 % | 1.23 | 24.15 | – |
| Short | magnet | ema-slope-10@m15c | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 22.35 | – |
| Short | clamp | act-shift@m15c | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 17.89 | – |
| Short | magnet | break-don40@m15 | 6 | 5 (83 %) | 12 | 75 % | 4.10 | 14.60 | – |
| Short | ribbon | move-impulse-10-2@m15 | 12 | 8 (67 %) | 8 | 100 % | ∞ (no loss) | 11.56 | – |
| Short | ribbon | move-impulse@m15 | 3 | 2 (67 %) | 5 | 80 % | 288.79 | 9.97 | – |
| Short | sweep | move-swing@m15 | 1 | 1 (100 %) | 15 | 80 % | 1.84 | 9.74 | tp2.8 sl5.6 tr1.4 h96 sh (15 · 1.84 · 9.74) |
| Short | clamp | break-retest@m15 | 4 | 4 (100 %) | 17 | 71 % | 1.43 | 9.39 | tp2.8 sl5.6 tr2.1 h96 sh (5 · 1.68 · 3.99) |
| Short | sandwich | ema-slope-100@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 9.15 | – |
| Short | sweep | break-squeeze-30@m30 | 1 | 1 (100 %) | 20 | 65 % | 1.63 | 9.15 | tp2.8 sl5.6 tr1.4 h32 sh (20 · 1.63 · 9.15) |
| Short | sweep | r-elder@m30 | 2 | 2 (100 %) | 10 | 70 % | 2.75 | 8.53 | tp2.2 sl4.4 tr0 h32 sh (5 · 19.53 · 7.59) |
| Short | ribbon | break-squeeze-t25@m30 | 26 | 12 (46 %) | 22 | 68 % | 1.64 | 8.37 | – |
| Short | clamp | aroon-25@m30 | 2 | 2 (100 %) | 5 | 100 % | ∞ (no loss) | 8.33 | – |
| Short | ribbon | rsi-div@m15c | 1 | 1 (100 %) | 6 | 100 % | ∞ (no loss) | 8.10 | tp2.6 sl5.2 tr1.3 h96 sh (6 · ∞ (no loss) · 8.10) |
| Short | ribbon | sar-0.03@m15c | 8 | 6 (75 %) | 51 | 67 % | 1.18 | 7.78 | tp2 sl4 tr0 h96 sh (6 · 2.14 · 4.80) |
| Short | revert | break-vol-2@m30 | 4 | 4 (100 %) | 36 | 67 % | 1.16 | 7.50 | tp2.8 sl4.2 tr0 h32 sh (9 · 1.18 · 2.40) |
| Short | ribbon | willr-28-95@m15 | 1 | 1 (100 %) | 13 | 62 % | 1.59 | 5.78 | tp2.2 sl2.2 tr1.65 h64 sh (13 · 1.59 · 5.78) |
| Short | ribbon | willr-28-95@m15c | 1 | 1 (100 %) | 7 | 71 % | 1.59 | 4.84 | tp2.8 sl5.6 tr0 h64 sh (7 · 1.59 · 4.84) |
| Short | ribbon | ema-slope@m15c | 2 | 2 (100 %) | 14 | 86 % | 1.64 | 4.83 | tp1.8 sl3.6 tr1.35 h64 sh (7 · 1.64 · 2.41) |
| Short | sandwich | cmf-20-0.05@m15 | 2 | 2 (100 %) | 6 | 67 % | 1.68 | 3.40 | – |
| Short | revert | r-clv-thrust-m@m30 | 1 | 1 (100 %) | 11 | 73 % | 1.31 | 2.94 | tp2 sl3 tr1 h32 sh (11 · 1.31 · 2.94) |
| Short | ribbon | willr-14-90@m15 | 1 | 1 (100 %) | 22 | 73 % | 1.12 | 2.80 | tp1.8 sl3.6 tr0 h96 sh (22 · 1.12 · 2.80) |
| Short | follow | r-fisher-m@m15c | 4 | 2 (50 %) | 22 | 36 % | 0.93 | -0.93 | tp2.6 sl5.2 tr1.3 h64 sh (6 · 3.58 · 2.36) |
| Short | ribbon | macd-hist-5-35-5@m30 | 1 | 0 (0 %) | 25 | 68 % | 0.92 | -2.80 | tp2.2 sl4.4 tr0 h48 sh (25 · 0.92 · -2.80) |
| Short | ribbon | macd-hist-19-39-9@m15c | 4 | 0 (0 %) | 8 | 50 % | 0.67 | -3.40 | – |
| Short | pivot | break-don55@m15c | 1 | 0 (0 %) | 5 | 60 % | 0.66 | -3.40 | tp2.4 sl4.8 tr0 h64 sh (5 · 0.66 · -3.40) |
| Short | ribbon | r-camarilla@m15 | 1 | 0 (0 %) | 5 | 40 % | 0.29 | -5.09 | tp2.2 sl2.2 tr1.65 h96 sh (5 · 0.29 · -5.09) |
| Short | ribbon | dir-vwap@m15c | 6 | 3 (50 %) | 21 | 62 % | 0.79 | -5.74 | – |
| Short | sweep | break-vol@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.53 | -5.90 | – |
| Short | revert | break-vol-2@m15c | 3 | 0 (0 %) | 30 | 60 % | 0.86 | -6.00 | tp2.2 sl3.3 tr0 h96 sh (10 · 0.86 · -2.00) |
| Short | pivot | r-session-trend-m@m30 | 15 | 8 (53 %) | 30 | 53 % | 0.80 | -7.70 | – |
| Short | ribbon | r-star@m15 | 1 | 0 (0 %) | 5 | 40 % | 0.39 | -8.00 | tp2.8 sl4.2 tr0 h64 sh (5 · 0.39 · -8.00) |
| Short | ribbon | move-swing@m30 | 2 | 0 (0 %) | 8 | 50 % | 0.44 | -8.45 | – |
| Short | ribbon | dir-macd@m30 | 1 | 0 (0 %) | 13 | 62 % | 0.50 | -8.68 | tp2 sl4 tr1 h48 sh (13 · 0.50 · -8.68) |
| Short | sweep | willr-7-90@m30 | 1 | 0 (0 %) | 8 | 50 % | 0.62 | -8.76 | tp2.8 sl5.6 tr2.1 h48 sh (8 · 0.62 · -8.76) |
| Short | revert | r-clv-thrust@m15c | 1 | 0 (0 %) | 16 | 63 % | 0.59 | -9.48 | tp2.2 sl4.4 tr1.1 h96 sh (16 · 0.59 · -9.48) |
| Short | ribbon | r-fakeout-m@m15c | 1 | 0 (0 %) | 6 | 50 % | 0.45 | -9.60 | tp2.8 sl5.6 tr0 h64 sh (6 · 0.45 · -9.60) |
| Short | ribbon | ha-3@m30 | 31 | 18 (58 %) | 62 | 69 % | 0.85 | -9.69 | – |
| Short | sweep | willr-28-95@m30 | 2 | 0 (0 %) | 14 | 36 % | 0.44 | -9.78 | tp2.8 sl5.6 tr1.4 h32 sh (7 · 0.50 · -3.57) |
| Short | clamp | cci-40-200@m15c | 5 | 2 (40 %) | 37 | 57 % | 0.68 | -11.91 | tp2 sl2 tr1 h64 sh (8 · 1.17 · 0.77) |
| Short | sweep | mfi-14-20@m15c | 1 | 0 (0 %) | 5 | 40 % | 0.30 | -12.20 | tp2.8 sl5.6 tr0 h64 sh (5 · 0.30 · -12.20) |
| Short | magnet | r-sweep@m15 | 7 | 1 (14 %) | 14 | 50 % | 0.49 | -14.08 | – |
| Short | ribbon | r-qh-flow@m30 | 3 | 0 (0 %) | 25 | 56 % | 0.59 | -20.00 | tp2 sl4 tr0 h32 sh (9 · 0.86 · -1.80) |
| Short | sweep | willr-21-95@m15 | 2 | 0 (0 %) | 23 | 35 % | 0.47 | -20.68 | tp2.6 sl2.6 tr0 h64 sh (11 · 0.49 · -10.00) |
| Short | ribbon | break-don40@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -22.80 | – |
| Short | magnet | obv-20@m15c | 2 | 0 (0 %) | 19 | 32 % | 0.25 | -23.08 | tp2.2 sl2.2 tr1.65 h96 sh (10 · 0.32 · -8.34) |
| Short | sweep | r-vortex@m15 | 3 | 0 (0 %) | 31 | 52 % | 0.54 | -25.09 | tp2.4 sl3.6 tr0 h96 sh (9 · 0.72 · -4.20) |
| Short | pivot | rsi-mid-60-40@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -33.40 | – |
| Short | revert | r-choch-m@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -33.60 | – |
| Short | sweep | r-td-m@m15 | 15 | 5 (33 %) | 53 | 38 % | 0.53 | -41.94 | – |
| Short | pivot | r-camarilla@m15 | 13 | 0 (0 %) | 42 | 40 % | 0.35 | -55.10 | – |
| Short | ribbon | break-squeeze-30@m30 | 14 | 0 (0 %) | 26 | 46 % | 0.22 | -58.34 | – |
| Short | sweep | r-pin-m@m15 | 18 | 1 (6 %) | 129 | 57 % | 0.55 | -88.10 | tp2 sl3 tr1 h64 sh (8 · 1.00 · 0.00) |
| Short | pivot | r-camarilla@m15c | 27 | 0 (0 %) | 40 | 30 % | 0.04 | -91.62 | – |
| Short | sandwich | r-zdist@m15c | 57 | 0 (0 %) | 114 | 50 % | 0.56 | -96.30 | – |
| Short | snap | r-zdist@m15c | 57 | 0 (0 %) | 114 | 50 % | 0.56 | -96.30 | – |
| Short | pulse | r-zdist@m15c | 57 | 0 (0 %) | 114 | 50 % | 0.56 | -96.30 | – |
| Short | clamp | act-burst-2.5@m15c | 26 | 0 (0 %) | 26 | 0 % | 0.00 | -98.60 | – |
| Short | sweep | willr-7-90@m15c | 9 | 2 (22 %) | 84 | 30 % | 0.54 | -98.87 | tp2.8 sl4.2 tr2.1 h96 sh (9 · 1.37 · 9.72) |
| Short | sweep | macd-hist@m15c | 51 | 1 (2 %) | 641 | 57 % | 0.64 | -333.74 | tp2 sl4 tr1.5 h96 sh (11 · 1.06 · 0.71) |
| General | ribbon | willr-28-95@m15 | 12 | 12 (100 %) | 126 | 52 % | 1.36 | 59.13 | tp3.2 sl2.4 tr0 h64 gn (12 · 1.62 · 8.00) |
| General | pivot | willr-28-95@m15 | 4 | 4 (100 %) | 21 | 76 % | 4.18 | 45.02 | tp4 sl3 tr0 h96 gn (5 · 4.75 · 12.00) |
| General | magnet | ema-slope-10@m15c | 5 | 5 (100 %) | 13 | 100 % | ∞ (no loss) | 42.55 | – |
| General | sandwich | hma-32@m15 | 15 | 13 (87 %) | 15 | 87 % | 6.50 | 35.23 | – |
| General | pivot | break-vol-1.3@m30 | 7 | 7 (100 %) | 13 | 100 % | ∞ (no loss) | 34.80 | – |
| General | magnet | rsi-div@m15 | 6 | 6 (100 %) | 37 | 59 % | 2.08 | 28.01 | tp3.6 sl3.6 tr1.8 h96 gn (5 · 2.99 · 7.56) |
| General | revert | r-bos@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 24.00 | – |
| General | sandwich | break-don10@m15 | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 19.02 | – |
| General | sandwich | move-impulse@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 13.02 | – |
| General | sandwich | trend-st-14-4@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 10.24 | – |
| General | sandwich | ema-slope-10@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.02 | – |
| General | ribbon | break-squeeze-t25@m30 | 7 | 5 (71 %) | 8 | 63 % | 2.20 | 8.40 | – |
| General | follow | r-nr-break@m15c | 1 | 1 (100 %) | 9 | 78 % | 1.83 | 5.66 | tp3.2 sl3.2 tr1.6 h64 gn (9 · 1.83 · 5.66) |
| General | sandwich | macd-hist-19-39-9@m15 | 5 | 3 (60 %) | 5 | 60 % | 1.66 | 4.20 | – |
| General | ribbon | willr-28-95@m15c | 4 | 3 (75 %) | 17 | 47 % | 1.13 | 3.49 | tp4 sl4 tr0 h64 gn (5 · 1.05 · 0.37) |
| General | revert | r-fvg-m@m30 | 2 | 2 (100 %) | 7 | 57 % | 1.82 | 3.16 | – |
| General | ribbon | ema-slope@m15c | 2 | 1 (50 %) | 12 | 50 % | 0.88 | -2.19 | tp3.2 sl2.4 tr0 h96 gn (6 · 1.15 · 1.20) |
| General | sweep | mfi-14-10@m30 | 2 | 0 (0 %) | 12 | 33 % | 0.83 | -2.40 | tp3.2 sl1.6 tr0 h32 gn (6 · 0.83 · -1.20) |
| General | ribbon | ha-3@m30 | 12 | 2 (17 %) | 25 | 44 % | 0.90 | -4.91 | – |
| General | ribbon | macd-cross-19-39-9@m30 | 2 | 0 (0 %) | 6 | 33 % | 0.59 | -5.20 | – |
| General | ribbon | break-squeeze-30@m30 | 5 | 1 (20 %) | 10 | 40 % | 0.66 | -6.70 | – |
| General | follow | r-fisher-m@m15c | 1 | 0 (0 %) | 5 | 20 % | 0.30 | -9.00 | tp4 sl3 tr0 h96 gn (5 · 0.30 · -9.00) |
| General | sweep | r-td-m@m15 | 2 | 0 (0 %) | 8 | 25 % | 0.40 | -9.69 | – |
| General | ribbon | r-qh-flow-m@m30 | 6 | 0 (0 %) | 22 | 27 % | 0.65 | -11.20 | – |
| General | revert | r-klinger-m@m15c | 12 | 5 (42 %) | 50 | 54 % | 0.84 | -11.89 | tp3.2 sl3.2 tr0 h96 gn (5 · 1.32 · 2.20) |
| General | pivot | break-don55@m15c | 1 | 0 (0 %) | 6 | 17 % | 0.19 | -12.38 | tp3.6 sl3.6 tr1.8 h96 gn (6 · 0.19 · -12.38) |
| General | ribbon | r-fisher-m@m15c | 4 | 0 (0 %) | 12 | 33 % | 0.51 | -13.60 | – |
| General | revert | r-awesome-m@m15c | 7 | 2 (29 %) | 51 | 49 % | 0.83 | -14.23 | tp4 sl3 tr0 h96 gn (6 · 1.19 · 1.80) |
| General | revert | break-vol-2@m30 | 6 | 2 (33 %) | 41 | 49 % | 0.82 | -14.38 | tp3.2 sl3.2 tr0 h48 gn (8 · 1.47 · 4.80) |
| General | sweep | willr-14-95@m30 | 2 | 0 (0 %) | 12 | 17 % | 0.35 | -14.40 | tp4 sl2 tr0 h32 gn (6 · 0.35 · -7.20) |
| General | revert | break-vol-2@m15c | 4 | 1 (25 %) | 31 | 45 % | 0.77 | -14.70 | tp3.2 sl3.2 tr0 h96 gn (9 · 1.10 · 1.40) |
| General | magnet | break-don40@m15 | 12 | 1 (8 %) | 27 | 44 % | 0.72 | -16.29 | – |
| General | ribbon | dir-vwap@m15 | 2 | 0 (0 %) | 5 | 0 % | 0.00 | -19.80 | – |
| General | ribbon | r-qh-flow@m30 | 2 | 0 (0 %) | 12 | 33 % | 0.45 | -20.23 | tp4.4 sl4.4 tr0 h32 gn (6 · 0.46 · -10.00) |
| General | pivot | rsi-mid-60-40@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -29.60 | – |
| General | magnet | obv-20@m15c | 3 | 0 (0 %) | 25 | 44 % | 0.42 | -31.53 | tp3.6 sl3.6 tr0 h96 gn (8 · 0.54 · -8.80) |
| General | ribbon | r-klinger@m30 | 4 | 0 (0 %) | 12 | 0 % | 0.00 | -46.50 | – |
| General | pivot | r-camarilla@m15c | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -47.70 | – |
| General | ribbon | dir-vwap@m15c | 5 | 0 (0 %) | 15 | 7 % | 0.02 | -50.09 | – |
| General | sweep | willr-28-95@m30 | 6 | 0 (0 %) | 31 | 19 % | 0.24 | -70.12 | tp3.6 sl3.6 tr0 h32 gn (5 · 0.22 · -11.80) |
| General | sweep | willr-7-90@m15c | 11 | 2 (18 %) | 104 | 35 % | 0.69 | -80.84 | tp4.4 sl4.4 tr2.2 h96 gn (8 · 1.70 · 16.19) |
| Long | ribbon | willr-28-95@m15 | 34 | 31 (91 %) | 262 | 50 % | 1.73 | 365.09 | tp5.2 sl5.2 tr3.9 h96 lg (5 · 3.65 · 28.62) |
| Long | ribbon | dir-vwap-240@m15c | 12 | 12 (100 %) | 107 | 58 % | 1.68 | 130.48 | tp6.4 sl6.4 tr4.8 h64 lg (9 · 2.51 · 25.22) |
| Long | revert | r-awesome-m@m15c | 32 | 25 (78 %) | 201 | 55 % | 1.38 | 130.11 | tp5.6 sl5.6 tr0 h96 lg (5 · 3.72 · 15.80) |
| Long | pivot | break-vol-1.3@m30 | 23 | 23 (100 %) | 23 | 100 % | ∞ (no loss) | 95.20 | – |
| Long | revert | r-bos@m15c | 6 | 6 (100 %) | 17 | 94 % | 16.62 | 73.43 | – |
| Long | pivot | kelt-20-2.5@m15 | 13 | 13 (100 %) | 13 | 100 % | ∞ (no loss) | 72.20 | – |
| Long | magnet | ema-slope-10@m15c | 8 | 8 (100 %) | 13 | 100 % | ∞ (no loss) | 62.12 | – |
| Long | ribbon | willr-7-90@m30 | 1 | 1 (100 %) | 5 | 80 % | 7.93 | 45.73 | tp6.4 sl6.4 tr3.2 h48 lg (5 · 7.93 · 45.73) |
| Long | follow | r-chand-m@m15c | 2 | 2 (100 %) | 10 | 80 % | 23.97 | 42.93 | tp6 sl4.5 tr0 h64 lg (5 · 24.83 · 22.27) |
| Long | sandwich | hma-32@m15 | 13 | 10 (77 %) | 13 | 77 % | 5.27 | 41.80 | – |
| Long | ribbon | trend-st-14-4@m15 | 3 | 3 (100 %) | 33 | 55 % | 1.34 | 27.70 | tp6.4 sl4.8 tr0 h96 lg (11 · 1.49 · 12.20) |
| Long | magnet | ema-slope-10@m15 | 3 | 3 (100 %) | 5 | 100 % | ∞ (no loss) | 25.40 | – |
| Long | clamp | aroon-25@m30 | 3 | 3 (100 %) | 9 | 67 % | 3.61 | 22.13 | – |
| Long | revert | r-sweep@m30 | 1 | 1 (100 %) | 5 | 80 % | 4.88 | 15.90 | tp5.2 sl3.9 tr0 h48 lg (5 · 4.88 · 15.90) |
| Long | pivot | willr-28-95@m15 | 1 | 1 (100 %) | 5 | 80 % | 4.84 | 14.60 | tp4.8 sl3.6 tr0 h96 lg (5 · 4.84 · 14.60) |
| Long | sweep | willr-7-90@m15c | 1 | 1 (100 %) | 7 | 29 % | 1.40 | 10.12 | tp4.8 sl4.8 tr2.4 h96 lg (7 · 1.40 · 10.12) |
| Long | sandwich | macd-hist-19-39-9@m15 | 5 | 3 (60 %) | 5 | 60 % | 2.27 | 8.40 | – |
| Long | revert | r-fvg-m@m30 | 9 | 5 (56 %) | 21 | 52 % | 1.21 | 7.54 | – |
| Long | clamp | break-retest@m15 | 3 | 1 (33 %) | 12 | 50 % | 0.95 | -1.56 | – |
| Long | sweep | rsi-14-20-80@m15c | 10 | 0 (0 %) | 20 | 50 % | 0.94 | -4.00 | – |
| Long | sweep | break-squeeze-30@m30 | 1 | 0 (0 %) | 10 | 40 % | 0.82 | -5.00 | tp6 sl4.5 tr0 h48 lg (10 · 0.82 · -5.00) |
| Long | magnet | move-cont@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.61 | -6.60 | – |
| Long | sweep | r-fisher@m30 | 1 | 0 (0 %) | 5 | 40 % | 0.42 | -8.48 | tp5.6 sl5.6 tr4.2 h32 lg (5 · 0.42 · -8.48) |
| Long | ribbon | dir-thrust@m30 | 7 | 1 (14 %) | 31 | 45 % | 0.89 | -9.50 | tp5.6 sl4.2 tr0 h48 lg (5 · 0.82 · -2.40) |
| Long | follow | r-qh-rev-m@m30 | 4 | 0 (0 %) | 16 | 50 % | 0.78 | -10.62 | – |
| Long | ribbon | trix-15@m15c | 1 | 0 (0 %) | 9 | 33 % | 0.62 | -11.40 | tp6.4 sl4.8 tr0 h96 lg (9 · 0.62 · -11.40) |
| Long | revert | r-bos-m@m15c | 2 | 0 (0 %) | 5 | 40 % | 0.26 | -11.95 | – |
| Long | pivot | break-don55@m15c | 2 | 0 (0 %) | 10 | 60 % | 0.37 | -13.15 | tp4.8 sl4.8 tr2.4 h96 lg (5 · 0.41 · -5.87) |
| Long | sweep | willr-50-95@m30 | 1 | 0 (0 %) | 5 | 20 % | 0.25 | -14.62 | tp5.2 sl5.2 tr2.6 h32 lg (5 · 0.25 · -14.62) |
| Long | sweep | act-hf-8@m15c | 5 | 1 (20 %) | 12 | 58 % | 0.46 | -14.74 | – |
| Long | revert | break-vol-1.3@m15c | 1 | 0 (0 %) | 13 | 38 % | 0.35 | -17.44 | tp6.4 sl6.4 tr3.2 h96 lg (13 · 0.35 · -17.44) |
| Long | ribbon | trix-15@m15 | 3 | 0 (0 %) | 38 | 34 % | 0.77 | -20.27 | tp6.4 sl3.2 tr0 h64 lg (16 · 0.88 · -3.27) |
| Long | pivot | r-camarilla@m15c | 21 | 0 (0 %) | 5 | 0 % | 0.00 | -20.40 | – |
| Long | revert | break-vol-2@m15 | 2 | 0 (0 %) | 15 | 40 % | 0.54 | -20.73 | tp6.4 sl6.4 tr0 h64 lg (7 · 0.63 · -7.47) |
| Long | sweep | rsi-7-15-85@m30 | 2 | 0 (0 %) | 12 | 33 % | 0.53 | -21.64 | tp6.4 sl6.4 tr3.2 h32 lg (6 · 0.53 · -10.82) |
| Long | sweep | willr-21-90@m30 | 1 | 0 (0 %) | 11 | 27 % | 0.36 | -26.22 | tp5.2 sl5.2 tr0 h32 lg (11 · 0.36 · -26.22) |
| Long | sweep | break-don40@m15 | 1 | 0 (0 %) | 12 | 25 % | 0.41 | -26.40 | tp6.4 sl4.8 tr0 h64 lg (12 · 0.41 · -26.40) |
| Long | ribbon | ha-3@m30 | 30 | 10 (33 %) | 58 | 41 % | 0.82 | -27.95 | – |
| Long | magnet | break-don40@m15 | 14 | 1 (7 %) | 29 | 45 % | 0.62 | -29.44 | – |
| Long | sweep | willr-50-90@m30 | 2 | 0 (0 %) | 26 | 38 % | 0.61 | -33.24 | tp5.2 sl5.2 tr0 h32 lg (13 · 0.61 · -16.22) |
| Long | revert | r-klinger-m@m15c | 9 | 3 (33 %) | 36 | 31 % | 0.62 | -35.50 | – |
| Long | ribbon | break-squeeze-30@m30 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -39.40 | – |
| Long | sweep | willr-50-95@m15c | 3 | 0 (0 %) | 14 | 21 % | 0.27 | -42.04 | tp5.2 sl5.2 tr0 h64 lg (5 · 0.25 · -14.62) |
| Long | sweep | willr-14-90@m30 | 2 | 0 (0 %) | 20 | 30 % | 0.44 | -42.17 | tp5.2 sl5.2 tr3.9 h48 lg (10 · 0.49 · -19.37) |
| Long | ribbon | r-qh-flow@m30 | 5 | 0 (0 %) | 29 | 34 % | 0.46 | -52.53 | tp5.6 sl5.6 tr4.2 h32 lg (5 · 0.54 · -8.03) |
| Long | revert | break-vol-2@m30 | 9 | 0 (0 %) | 53 | 45 % | 0.63 | -52.67 | tp6 sl6 tr3 h48 lg (7 · 0.87 · -1.59) |
| Long | revert | break-vol@m15 | 6 | 0 (0 %) | 58 | 48 % | 0.68 | -53.50 | tp6.4 sl6.4 tr0 h96 lg (8 · 0.94 · -1.60) |
| Long | pivot | rsi-mid-60-40@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -56.18 | – |
| Long | follow | r-qh-rev@m30 | 3 | 0 (0 %) | 21 | 29 % | 0.37 | -59.40 | tp6 sl6 tr4.5 h32 lg (7 · 0.37 · -19.40) |
| Long | revert | break-vol-2@m15c | 11 | 2 (18 %) | 75 | 43 % | 0.66 | -67.14 | tp5.6 sl5.6 tr2.8 h96 lg (8 · 1.34 · 3.94) |
| Long | sweep | mfi-14-20@m30 | 4 | 0 (0 %) | 46 | 43 % | 0.44 | -77.49 | tp6.4 sl6.4 tr3.2 h48 lg (11 · 0.53 · -15.38) |
| Long | ribbon | willr-28-95@m15c | 18 | 2 (11 %) | 75 | 27 % | 0.56 | -80.17 | tp5.6 sl5.6 tr2.8 h64 lg (6 · 0.87 · -1.06) |
| Long | sweep | willr-28-95@m30 | 11 | 0 (0 %) | 45 | 24 % | 0.38 | -91.73 | tp4.8 sl2.4 tr0 h48 lg (6 · 0.35 · -8.40) |
| Wide | revert | r-bos@m15c | 6 | 6 (100 %) | 30 | 60 % | 4.82 | 56.34 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (5 · 7.49 · 13.96) |
| Wide | sweep | mc-z-20@m5c | 4 | 4 (100 %) | 13 | 69 % | 11.44 | 29.22 | – |
| Wide | sweep | z-50-2.5@x4@m5 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 28.42 | – |
| Wide | ribbon | aroon-25@m30 | 6 | 6 (100 %) | 24 | 50 % | 3.66 | 22.34 | – |
| Wide | sweep | cci-40-200@m5c | 3 | 3 (100 %) | 6 | 50 % | 9.32 | 17.47 | – |
| Wide | sweep | break-squeeze-t10@m30 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 10.82 | – |
| Wide | sweep | willr-28-95@m5c | 9 | 9 (100 %) | 18 | 50 % | 1.77 | 9.43 | – |
| Wide | magnet | r-camarilla@m15 | 7 | 6 (86 %) | 13 | 69 % | 2.59 | 5.69 | – |
| Wide | pivot | dir-reclaim-50@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 5.40 | – |
| Wide | revert | r-spring-m@m15 | 12 | 12 (100 %) | 36 | 67 % | 1.17 | 3.03 | – |
| Wide | snap | break-atr-0.9@m5 | 3 | 3 (100 %) | 6 | 50 % | 5.66 | 2.80 | – |
| Wide | ribbon | r-fvg@m5 | 3 | 3 (100 %) | 9 | 67 % | 1.19 | 1.36 | – |
| Wide | magnet | squeeze-20@m5 | 4 | 2 (50 %) | 20 | 60 % | 1.09 | 1.15 | tp0.76 sl0.68 tr0 h96 axd-fib3h axis (5 · 1.27 · 0.76) |
| Wide | sweep | mc-rsit2-25@m5c | 3 | 3 (100 %) | 6 | 50 % | 1.06 | 0.16 | – |
| Wide | pulse | aroon-14@m5 | 3 | 3 (100 %) | 9 | 33 % | 1.02 | 0.10 | – |
| Wide | ribbon | macd-cross-19-39-9@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.81 | -1.29 | – |
| Wide | pivot | ema-stoch@m5c | 3 | 0 (0 %) | 6 | 50 % | 0.59 | -1.31 | – |
| Wide | sandwich | break-squeeze@m5 | 3 | 0 (0 %) | 6 | 50 % | 0.56 | -2.32 | – |
| Wide | pulse | break-squeeze@m5 | 3 | 0 (0 %) | 6 | 50 % | 0.56 | -2.32 | – |
| Wide | ribbon | move-impulse-20-2.5@m30 | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -10.17 | – |
| Wide | sandwich | macd-hist-8-21-5@m5 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -10.86 | – |
| Wide | snap | r-star@m1 | 6 | 0 (0 %) | 105 | 31 % | 0.78 | -13.91 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (17 · 0.90 · -0.88) |
| Wide | revert | break-squeeze-30@m5c | 6 | 0 (0 %) | 30 | 30 % | 0.35 | -15.31 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (5 · 0.46 · -2.46) |
| Wide | follow | rsi-mom-21-20@m15 | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -18.78 | – |
| Wide | revert | trend-st-28-6@m30 | 2 | 0 (0 %) | 18 | 22 % | 0.18 | -20.30 | tp1.13 sl1.13 tr0 h16 ax-linear3 axis (9 · 0.18 · -10.15) |
| Wide | magnet | kelt-20-1.5@m15 | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -23.86 | – |
| Wide | magnet | mc-rsit5-30@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -24.88 | – |
| Wide | revert | break-retest@m1c | 9 | 0 (0 %) | 45 | 20 % | 0.02 | -26.28 | tp0.64 sl0.54 tr0 h480 axd-atr2h axis (5 · 0.02 · -2.74) |
| Wide | magnet | r-bb-adx-m@m5 | 7 | 0 (0 %) | 14 | 0 % | 0.00 | -26.48 | – |
| Wide | follow | r-zdist-m@m15c | 3 | 0 (0 %) | 24 | 13 % | 0.12 | -27.75 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (8 · 0.12 · -9.25) |
| Wide | revert | dir-reclaim-50@m1c | 2 | 0 (0 %) | 27 | 26 % | 0.14 | -38.96 | tp0.64 sl0.54 tr0 h480 axd-volume4h axis (14 · 0.13 · -16.79) |
| Wide | magnet | mc-rsit7-30@m15c | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -41.25 | – |
| Wide | ribbon | r-camarilla@m15c | 15 | 0 (0 %) | 45 | 7 % | 0.07 | -42.01 | – |
| Wide | ribbon | aroon-25@m5 | 9 | 0 (0 %) | 72 | 42 % | 0.31 | -44.94 | tp0.76 sl0.68 tr0 h96 ax-volume2 axis (8 · 0.43 · -2.60) |
| Wide | clamp | mc-mturn-10@m15c | 18 | 3 (17 %) | 27 | 44 % | 0.25 | -52.97 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 30 (100 %) | 1306 | 83 % | 2.92 | 2360.82 | tp8 sl24 tr4.8 h96 (22 · 109.93 · 130.38) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 30 (100 %) | 1294 | 82 % | 2.72 | 2243.30 | tp8 sl24 tr4.8 h96 (22 · 109.93 · 130.38) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 30 (100 %) | 1388 | 80 % | 2.56 | 2196.97 | tp8 sl24 tr4.8 h96 (23 · 205.74 · 146.37) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 30 (100 %) | 1077 | 84 % | 3.46 | 2053.88 | tp8 sl24 tr3.2 h96 (26 · 411.61 · 101.00) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 29 (97 %) | 1129 | 81 % | 2.92 | 1979.78 | tp8 sl24 tr6.4 h96 (19 · 283.26 · 139.90) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 30 (100 %) | 871 | 85 % | 4.72 | 1943.37 | tp6 sl12 tr0 h96 (17 · ∞ (no loss) · 98.60) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 29 (97 %) | 1010 | 82 % | 2.83 | 1806.90 | tp8 sl24 tr4.8 h96 (20 · 15.99 · 105.10) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 30 (100 %) | 1127 | 82 % | 2.44 | 1765.79 | tp8 sl24 tr6.4 h96 (19 · 5.39 · 108.02) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 30 (100 %) | 804 | 85 % | 3.84 | 1697.83 | tp8 sl24 tr4.8 h96 (17 · 1433.25 · 98.63) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 29 (97 %) | 1042 | 80 % | 2.49 | 1687.90 | tp8 sl24 tr6.4 h96 (18 · 93.67 · 123.47) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 985 | 81 % | 2.38 | 1628.79 | tp8 sl24 tr4.8 h96 (20 · 4.94 · 95.66) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 30 (100 %) | 1242 | 80 % | 2.05 | 1596.21 | tp8 sl24 tr6.4 h96 (15 · 4.51 · 85.00) |
| Signals | follow | sig-thrust-m@m15 | 30 | 29 (97 %) | 1189 | 79 % | 2.13 | 1553.01 | tp8 sl24 tr3.2 h96 (33 · 26.75 · 91.20) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 29 (97 %) | 808 | 82 % | 2.75 | 1481.47 | tp8 sl24 tr4.8 h96 (17 · ∞ (no loss) · 114.72) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 29 (97 %) | 997 | 80 % | 2.37 | 1465.38 | tp8 sl24 tr4.8 h96 (17 · 271.81 · 110.12) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 30 (100 %) | 1281 | 78 % | 1.89 | 1462.42 | tp6 sl18 tr4.8 h96 (18 · 82.38 · 97.40) |
| Signals | follow | sig-impulse-s@m15 | 30 | 29 (97 %) | 943 | 80 % | 2.45 | 1461.85 | tp8 sl24 tr4.8 h96 (16 · ∞ (no loss) · 100.86) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 28 (93 %) | 1074 | 78 % | 2.12 | 1435.39 | tp8 sl24 tr4.8 h96 (17 · ∞ (no loss) · 95.36) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 30 (100 %) | 692 | 85 % | 3.80 | 1403.98 | tp8 sl24 tr4.8 h96 (13 · 7888.72 · 68.59) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 29 (97 %) | 762 | 81 % | 2.99 | 1391.76 | tp6 sl12 tr0 h96 (13 · ∞ (no loss) · 75.40) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 30 (100 %) | 1087 | 80 % | 2.02 | 1378.83 | tp8 sl24 tr3.2 h96 (25 · 360.47 · 88.42) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 30 (100 %) | 660 | 85 % | 4.34 | 1374.80 | tp3 sl9 tr1.2 h96 (45 · 48.75 · 65.76) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 741 | 83 % | 3.18 | 1361.95 | tp5 sl15 tr0 h96 (16 · ∞ (no loss) · 76.80) |
| Signals | follow | sig-hma-m@m15 | 30 | 30 (100 %) | 572 | 87 % | 4.55 | 1361.78 | tp6 sl18 tr4.8 h96 (14 · ∞ (no loss) · 81.20) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 28 (93 %) | 1085 | 77 % | 1.89 | 1328.82 | tp8 sl24 tr4.8 h96 (17 · ∞ (no loss) · 112.69) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 698 | 83 % | 3.20 | 1302.66 | tp8 sl24 tr4.8 h96 (11 · ∞ (no loss) · 74.67) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 30 (100 %) | 613 | 84 % | 3.28 | 1244.77 | tp6 sl9 tr0 h96 (14 · 8.20 · 66.20) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 29 (97 %) | 755 | 82 % | 2.38 | 1235.96 | tp8 sl24 tr4.8 h96 (14 · 3.93 · 70.81) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 30 (100 %) | 679 | 83 % | 3.16 | 1228.84 | tp8 sl24 tr6.4 h96 (10 · 141.63 · 69.70) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 27 (90 %) | 952 | 79 % | 2.03 | 1196.92 | tp8 sl24 tr3.2 h96 (27 · 176.89 · 74.98) |
| Signals | follow | sig-cmf-m@m15 | 30 | 29 (97 %) | 769 | 79 % | 2.26 | 1189.30 | tp6 sl18 tr0 h96 (17 · 5.10 · 74.60) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 30 (100 %) | 440 | 92 % | 12.23 | 1184.36 | tp8 sl24 tr4.8 h96 (8 · ∞ (no loss) · 56.24) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 29 (97 %) | 786 | 80 % | 2.30 | 1175.30 | tp5 sl15 tr2 h96 (31 · 29.60 · 64.58) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 30 (100 %) | 487 | 90 % | 4.41 | 1173.66 | tp5 sl15 tr2 h96 (19 · 458.56 · 51.41) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 30 (100 %) | 508 | 86 % | 4.45 | 1149.20 | tp6 sl18 tr0 h96 (10 · ∞ (no loss) · 58.00) |
| Signals | follow | sig-kama-m@m15 | 30 | 30 (100 %) | 775 | 78 % | 2.14 | 1116.96 | tp8 sl24 tr3.2 h96 (18 · 39.73 · 71.63) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 27 (90 %) | 911 | 76 % | 1.94 | 1111.00 | tp8 sl24 tr6.4 h96 (15 · 123.36 · 92.87) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 27 (90 %) | 911 | 76 % | 1.94 | 1111.00 | tp8 sl24 tr6.4 h96 (15 · 123.36 · 92.87) |
| Signals | follow | sig-donchian-m@m15 | 30 | 29 (97 %) | 582 | 84 % | 2.79 | 1084.27 | tp8 sl24 tr3.2 h96 (15 · ∞ (no loss) · 67.80) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 30 (100 %) | 975 | 79 % | 1.76 | 1076.43 | tp5 sl15 tr2 h96 (38 · 8.45 · 64.07) |
| Signals | follow | sig-trix-s@m15 | 30 | 29 (97 %) | 461 | 88 % | 5.73 | 1068.80 | tp5 sl15 tr4 h96 (10 · ∞ (no loss) · 48.00) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 30 (100 %) | 542 | 85 % | 3.05 | 1043.10 | tp6 sl18 tr0 h96 (11 · ∞ (no loss) · 63.80) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 29 (97 %) | 1014 | 76 % | 1.76 | 1027.80 | tp6 sl18 tr0 h96 (17 · 5.10 · 74.60) |
| Signals | follow | sig-sar-s@m15 | 30 | 27 (90 %) | 903 | 77 % | 1.82 | 1025.42 | tp8 sl24 tr6.4 h96 (13 · 39.30 · 76.02) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 26 (87 %) | 816 | 81 % | 2.14 | 1024.68 | tp5 sl15 tr2 h96 (38 · 40.26 · 64.82) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 30 (100 %) | 602 | 83 % | 2.67 | 1003.54 | tp5 sl15 tr4 h96 (16 · ∞ (no loss) · 68.23) |
| Signals | follow | sig-cmf-s@m15 | 30 | 28 (93 %) | 725 | 80 % | 1.95 | 993.19 | tp6 sl18 tr2.4 h96 (23 · 4.14 · 58.87) |
| Signals | follow | sig-donchian-s@m15 | 30 | 28 (93 %) | 884 | 79 % | 1.72 | 990.07 | tp4 sl12 tr0 h96 (27 · 3.89 · 70.60) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 29 (97 %) | 554 | 82 % | 3.11 | 969.06 | tp5 sl15 tr0 h96 (11 · ∞ (no loss) · 52.80) |
| Signals | follow | sig-hma-s@m15 | 30 | 26 (87 %) | 1000 | 76 % | 1.64 | 966.49 | tp8 sl24 tr4.8 h96 (13 · ∞ (no loss) · 88.79) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 427 | 87 % | 4.53 | 963.94 | tp6 sl12 tr0 h96 (9 · ∞ (no loss) · 52.20) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 554 | 82 % | 2.70 | 960.60 | tp4 sl12 tr0 h96 (18 · ∞ (no loss) · 68.40) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 29 (97 %) | 563 | 80 % | 2.83 | 955.63 | tp8 sl24 tr6.4 h96 (9 · 125.89 · 61.90) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 30 (100 %) | 444 | 86 % | 4.89 | 952.81 | tp3 sl9 tr2.4 h96 (21 · ∞ (no loss) · 56.15) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 29 (97 %) | 576 | 84 % | 2.61 | 915.50 | tp3 sl9 tr0 h96 (21 · ∞ (no loss) · 58.80) |
| Signals | follow | sig-obv-s@m15 | 30 | 29 (97 %) | 779 | 78 % | 1.91 | 911.43 | tp3 sl9 tr1.8 h96 (43 · 3.66 · 54.68) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 29 (97 %) | 363 | 86 % | 3.45 | 839.66 | tp6 sl18 tr3.6 h96 (10 · ∞ (no loss) · 58.00) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 29 (97 %) | 800 | 78 % | 1.73 | 832.55 | tp6 sl18 tr4.8 h96 (14 · 205.83 · 70.41) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 27 (90 %) | 528 | 81 % | 2.33 | 828.96 | tp8 sl24 tr4.8 h96 (10 · ∞ (no loss) · 71.95) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 29 (97 %) | 229 | 99 % | 35.06 | 825.16 | tp6 sl18 tr3.6 h96 (8 · ∞ (no loss) · 41.33) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 27 (90 %) | 527 | 80 % | 2.18 | 803.81 | tp8 sl24 tr4.8 h96 (12 · 93.43 · 65.28) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 28 (93 %) | 375 | 83 % | 3.10 | 796.03 | tp8 sl24 tr3.2 h96 (10 · ∞ (no loss) · 58.36) |
| Signals | follow | sig-impulse-m@m15 | 30 | 26 (87 %) | 690 | 77 % | 1.73 | 790.03 | tp6 sl18 tr2.4 h96 (22 · 127.29 · 67.74) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 29 (97 %) | 591 | 82 % | 1.88 | 769.35 | tp6 sl18 tr2.4 h96 (21 · 1164.48 · 61.56) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 24 (80 %) | 795 | 77 % | 1.61 | 766.85 | tp8 sl24 tr6.4 h96 (11 · 3.22 · 53.80) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 28 (93 %) | 385 | 83 % | 3.76 | 755.21 | tp8 sl24 tr4.8 h96 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 25 (83 %) | 653 | 76 % | 1.72 | 740.37 | tp8 sl24 tr6.4 h96 (15 · 4.05 · 73.78) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 28 (93 %) | 442 | 81 % | 2.75 | 724.42 | tp6 sl18 tr2.4 h96 (14 · 188.23 · 44.55) |
| Signals | follow | sig-vwap-s@m15 | 30 | 29 (97 %) | 649 | 78 % | 1.67 | 677.60 | tp3 sl9 tr0 h96 (22 · 6.39 · 49.60) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 239 | 95 % | 29.36 | 667.50 | tp4 sl6 tr0 h96 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 25 (83 %) | 582 | 78 % | 1.87 | 664.41 | tp6 sl18 tr4.8 h96 (10 · ∞ (no loss) · 58.00) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 28 (93 %) | 509 | 78 % | 2.07 | 661.73 | tp8 sl24 tr6.4 h96 (8 · ∞ (no loss) · 54.61) |
| Signals | follow | sig-keltner-m@m15 | 30 | 24 (80 %) | 493 | 77 % | 2.02 | 654.81 | tp6 sl18 tr3.6 h96 (13 · 201.00 · 64.67) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 397 | 83 % | 2.49 | 638.57 | tp8 sl24 tr4.8 h96 (7 · ∞ (no loss) · 46.81) |
| Signals | follow | sig-cci-s@m15 | 30 | 24 (80 %) | 682 | 75 % | 1.68 | 635.71 | tp8 sl24 tr3.2 h96 (16 · 217.47 · 52.42) |
| Signals | follow | sig-keltner-s@m15 | 30 | 28 (93 %) | 533 | 78 % | 1.80 | 622.66 | tp6 sl18 tr0 h96 (12 · 3.51 · 45.60) |
| Signals | follow | sig-kama-s@m15 | 30 | 28 (93 %) | 834 | 76 % | 1.45 | 621.07 | tp8 sl24 tr4.8 h96 (14 · 2.93 · 48.69) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 30 (100 %) | 249 | 88 % | 8.75 | 620.47 | tp5 sl10 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 28 (93 %) | 276 | 85 % | 4.31 | 604.57 | tp4 sl12 tr0 h96 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-swing-m@m15 | 30 | 20 (67 %) | 901 | 73 % | 1.36 | 586.24 | tp5 sl15 tr2 h96 (35 · 4.86 · 64.24) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 25 (83 %) | 890 | 74 % | 1.38 | 584.74 | tp4 sl12 tr1.6 h96 (37 · 8.74 · 52.24) |
| Signals | follow | sig-trix-m@m15 | 30 | 26 (87 %) | 280 | 83 % | 3.23 | 582.48 | tp6 sl18 tr4.8 h96 (8 · ∞ (no loss) · 46.40) |
| Signals | follow | sig-obv-m@m15 | 30 | 27 (90 %) | 746 | 77 % | 1.42 | 555.75 | tp8 sl24 tr4.8 h96 (14 · 3.29 · 56.12) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 23 (77 %) | 497 | 73 % | 1.62 | 550.28 | tp6 sl12 tr0 h96 (13 · 5.70 · 57.40) |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 28 (93 %) | 199 | 93 % | 4.73 | 520.49 | tp8 sl24 tr3.2 h96 (7 · ∞ (no loss) · 31.21) |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 30 (100 %) | 168 | 92 % | 17.84 | 469.31 | tp4 sl6 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 27 (90 %) | 217 | 81 % | 2.82 | 451.55 | tp8 sl24 tr6.4 h96 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-sar-m@m15 | 30 | 17 (57 %) | 786 | 73 % | 1.31 | 451.05 | tp8 sl24 tr4.8 h96 (13 · 186.91 · 78.71) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 28 (93 %) | 387 | 76 % | 1.71 | 448.19 | tp6 sl18 tr0 h96 (10 · 2.87 · 34.00) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 24 (80 %) | 431 | 75 % | 1.67 | 443.70 | tp8 sl24 tr3.2 h96 (12 · 414.79 · 52.44) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 21 (70 %) | 659 | 73 % | 1.41 | 441.30 | tp8 sl24 tr6.4 h96 (10 · 235.57 · 54.72) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 29 (97 %) | 239 | 81 % | 2.77 | 400.94 | tp6 sl18 tr3.6 h96 (7 · ∞ (no loss) · 25.14) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 28 (93 %) | 182 | 86 % | 3.08 | 384.64 | tp8 sl24 tr4.8 h96 (5 · ∞ (no loss) · 32.95) |
| Signals | follow | sig-adx-m@m15 | 30 | 25 (83 %) | 304 | 79 % | 1.69 | 377.44 | tp5 sl10 tr0 h96 (10 · 4.24 · 33.00) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 24 (80 %) | 195 | 77 % | 2.12 | 253.05 | tp6 sl18 tr3.6 h96 (6 · ∞ (no loss) · 19.34) |
| Signals | follow | sig-adx-s@m15 | 30 | 21 (70 %) | 312 | 79 % | 1.48 | 252.99 | tp3 sl9 tr1.2 h96 (22 · 75.72 · 27.40) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 18 (60 %) | 523 | 70 % | 1.24 | 250.58 | tp8 sl24 tr6.4 h96 (7 · ∞ (no loss) · 47.30) |
| Signals | follow | sig-zscore-s@m15 | 30 | 18 (60 %) | 523 | 70 % | 1.24 | 250.58 | tp8 sl24 tr6.4 h96 (7 · ∞ (no loss) · 47.30) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 27 (90 %) | 111 | 86 % | 4.17 | 241.40 | tp4 sl12 tr1.6 h96 (5 · ∞ (no loss) · 10.53) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 29 (97 %) | 83 | 87 % | 8.53 | 230.62 | – |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 22 (73 %) | 514 | 71 % | 1.21 | 212.58 | tp8 sl24 tr4.8 h96 (8 · ∞ (no loss) · 62.40) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 16 (53 %) | 461 | 70 % | 1.18 | 167.90 | tp8 sl24 tr4.8 h96 (6 · ∞ (no loss) · 40.41) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 30 | 30 (100 %) | 48 | 98 % | 1591.27 | 160.33 | – |
| Signals | follow | sig-rsi-momentum-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 24 | 24 (100 %) | 51 | 98 % | 1976.22 | 126.11 | – |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 15 (50 %) | 203 | 79 % | 1.19 | 83.17 | tp3 sl6 tr0 h96 (9 · 3.61 · 16.20) |
| Signals | follow | sig-volume-break-s@m15 | 21 | 21 (100 %) | 27 | 100 % | ∞ (no loss) | 62.74 | – |
| Signals | follow | sig-r-inside-m@m15 | 21 | 21 (100 %) | 21 | 100 % | ∞ (no loss) | 54.44 | – |
| Signals | follow | sig-st-slow-m@m15 | 30 | 21 (70 %) | 76 | 82 % | 1.36 | 50.88 | – |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 16 (53 %) | 418 | 69 % | 1.05 | 41.06 | tp4 sl12 tr0 h96 (10 · 2.80 · 22.00) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 17 | 10 (59 %) | 34 | 68 % | 1.10 | 5.55 | – |
| Signals | follow | sig-s2-vwap-axis-m@m15 | 7 | 4 (57 %) | 8 | 63 % | 2.77 | 1.36 | – |
| Signals | follow | sig-mfi-m@m15 | 30 | 17 (57 %) | 119 | 74 % | 1.00 | 1.02 | tp2.5 sl5 tr0 h96 (7 · 2.65 · 8.60) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 18 (60 %) | 503 | 72 % | 1.00 | -2.94 | tp6 sl9 tr0 h96 (10 · 2.52 · 28.00) |
| Signals | follow | sig-squeeze-m@m15 | 30 | 15 (50 %) | 90 | 62 % | 0.91 | -19.74 | tp3 sl9 tr1.2 h96 (5 · 39.13 · 3.72) |
| Signals | follow | sig-cci-m@m15 | 30 | 9 (30 %) | 428 | 65 % | 0.83 | -192.95 | tp8 sl24 tr6.4 h96 (7 · 1.68 · 16.47) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 7 (23 %) | 447 | 63 % | 0.77 | -293.91 | tp8 sl24 tr4.8 h96 (7 · 1.93 · 22.60) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 5 (17 %) | 434 | 58 % | 0.73 | -366.16 | tp8 sl24 tr4.8 h96 (9 · 1.65 · 18.94) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 8 (27 %) | 328 | 60 % | 0.65 | -384.12 | tp6 sl18 tr2.4 h96 (9 · 1.77 · 13.95) |
| Signals | follow | sig-rsi-reversal-m@m15 | 29 | 3 (10 %) | 135 | 38 % | 0.23 | -524.57 | tp5 sl15 tr2 h96 (5 · 0.57 · -8.19) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 29 | 3 (10 %) | 123 | 28 % | 0.13 | -631.05 | tp3 sl9 tr1.2 h96 (8 · 0.09 · -17.56) |
| Signals | follow | sig-rsi-reversal-s@m15 | 26 | 1 (4 %) | 110 | 14 % | 0.03 | -796.12 | tp3 sl9 tr1.2 h96 (8 · 0.13 · -12.71) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 0 (0 %) | 294 | 44 % | 0.26 | -1092.92 | tp8 sl24 tr3.2 h96 (6 · 0.41 · -14.38) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 363 | 42 % | 0.25 | -1404.74 | tp8 sl24 tr3.2 h96 (7 · 0.37 · -30.37) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 116 | 109 (94 %) | 1269 | 90 % | 4.67 | 5465.60 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 118 | 108 (92 %) | 1100 | 87 % | 4.01 | 5148.57 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 122 | 115 (94 %) | 1861 | 87 % | 4.59 | 4794.55 |
| Signals | tp 6.000% | sl 3.00× | tr off | 118 | 113 (96 %) | 1293 | 91 % | 3.25 | 4719.40 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 118 | 111 (94 %) | 1395 | 88 % | 3.27 | 4619.25 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 124 | 113 (91 %) | 2417 | 84 % | 3.67 | 4366.41 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 122 | 108 (89 %) | 1721 | 87 % | 3.04 | 4320.10 |
| Signals | tp 5.000% | sl 3.00× | tr off | 120 | 108 (90 %) | 1511 | 90 % | 2.83 | 4209.80 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 124 | 112 (90 %) | 2834 | 83 % | 3.24 | 4023.26 |
| Signals | tp 4.000% | sl 3.00× | tr off | 122 | 108 (89 %) | 2016 | 88 % | 2.36 | 3890.11 |
| Signals | tp 6.000% | sl 2.00× | tr off | 119 | 108 (91 %) | 1421 | 83 % | 2.30 | 3853.11 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 122 | 109 (89 %) | 1773 | 86 % | 2.84 | 3849.92 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 123 | 113 (92 %) | 2179 | 84 % | 2.79 | 3791.70 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 124 | 111 (90 %) | 2681 | 82 % | 2.40 | 3436.84 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 122 | 104 (85 %) | 2307 | 80 % | 1.97 | 2984.66 |
| Signals | tp 5.000% | sl 2.00× | tr off | 120 | 104 (87 %) | 1706 | 79 % | 1.82 | 2937.89 |
| Signals | tp 3.000% | sl 3.00× | tr off | 123 | 102 (83 %) | 2700 | 86 % | 1.83 | 2928.65 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 125 | 113 (90 %) | 3388 | 80 % | 2.22 | 2847.23 |
| Signals | tp 6.000% | sl 1.50× | tr off | 119 | 100 (84 %) | 1638 | 73 % | 1.69 | 2827.62 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 124 | 103 (83 %) | 2957 | 79 % | 1.83 | 2738.30 |
| Signals | tp 4.000% | sl 2.00× | tr off | 123 | 100 (81 %) | 2294 | 78 % | 1.60 | 2547.29 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 125 | 108 (86 %) | 3421 | 79 % | 1.82 | 2529.85 |
| Signals | tp 3.000% | sl 2.00× | tr off | 123 | 97 (79 %) | 3093 | 77 % | 1.52 | 2299.52 |
| Signals | tp 4.000% | sl 1.50× | tr off | 123 | 98 (80 %) | 2538 | 71 % | 1.49 | 2239.37 |
| Signals | tp 5.000% | sl 1.50× | tr off | 121 | 95 (79 %) | 1917 | 71 % | 1.51 | 2183.07 |
| Signals | tp 2.500% | sl 3.00× | tr off | 123 | 95 (77 %) | 3234 | 83 % | 1.51 | 2091.82 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 125 | 105 (84 %) | 4220 | 75 % | 1.74 | 2067.70 |
| Signals | tp 2.500% | sl 2.00× | tr off | 123 | 88 (72 %) | 3714 | 73 % | 1.23 | 1155.82 |
| Signals | tp 3.000% | sl 1.50× | tr off | 123 | 87 (71 %) | 3576 | 66 % | 1.18 | 1005.92 |
| Long | tp 6.000% | sl 1.00× | tr 0.50× | 17 | 7 (41 %) | 77 | 61 % | 1.65 | 79.32 |
| Long | tp 5.200% | sl 0.75× | tr off | 34 | 17 (50 %) | 87 | 51 % | 1.32 | 52.22 |
| Long | tp 6.000% | sl 0.75× | tr off | 27 | 16 (59 %) | 93 | 47 % | 1.22 | 44.44 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 31 | 7 (23 %) | 116 | 66 % | 1.29 | 38.54 |
| Short | tp 2.000% | sl 1.50× | tr off | 34 | 20 (59 %) | 115 | 70 % | 1.32 | 34.59 |
| Long | tp 5.600% | sl 0.75× | tr off | 33 | 15 (45 %) | 88 | 47 % | 1.17 | 31.18 |
| Short | tp 1.800% | sl 1.50× | tr 0.75× | 30 | 8 (27 %) | 93 | 63 % | 1.44 | 28.68 |
| General | tp 3.200% | sl 1.00× | tr 0.50× | 29 | 16 (55 %) | 38 | 74 % | 2.51 | 27.30 |
| Short | tp 2.200% | sl 1.00× | tr off | 34 | 13 (38 %) | 40 | 70 % | 1.94 | 27.20 |
| Long | tp 5.600% | sl 1.00× | tr 0.75× | 18 | 6 (33 %) | 55 | 56 % | 1.19 | 24.19 |
| General | tp 3.200% | sl 0.75× | tr off | 16 | 8 (50 %) | 41 | 56 % | 1.47 | 22.20 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 1.50× | tr off | 123 | 56 (46 %) | 4399 | 62 % | 0.94 | -432.30 |
| Wide | tp 0.800% | sl 1.00× | tr off | 189 | 37 (20 %) | 245 | 33 % | 0.46 | -163.97 |
| Long | tp 5.200% | sl 1.00× | tr off | 33 | 8 (24 %) | 112 | 42 % | 0.73 | -85.05 |
| Wide | tp 0.640% | sl 0.84× | tr off | 18 | 0 (0 %) | 181 | 28 % | 0.41 | -80.45 |
| General | tp 3.600% | sl 1.00× | tr off | 25 | 7 (28 %) | 92 | 40 % | 0.63 | -73.51 |
| Short | tp 2.600% | sl 1.50× | tr 0.75× | 42 | 13 (31 %) | 112 | 54 % | 0.66 | -58.84 |
| Long | tp 5.200% | sl 1.00× | tr 0.50× | 20 | 4 (20 %) | 54 | 50 % | 0.53 | -57.66 |
| General | tp 4.400% | sl 1.00× | tr 0.75× | 19 | 2 (11 %) | 40 | 43 % | 0.52 | -48.67 |
| Short | tp 1.800% | sl 2.00× | tr 0.50× | 36 | 5 (14 %) | 66 | 56 % | 0.45 | -48.17 |
| Short | tp 2.400% | sl 1.50× | tr 0.50× | 23 | 5 (22 %) | 78 | 58 % | 0.52 | -47.53 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 25 | 6 (24 %) | 73 | 63 % | 0.58 | -43.95 |
| General | tp 4.000% | sl 1.00× | tr 0.75× | 9 | 0 (0 %) | 34 | 35 % | 0.46 | -43.88 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 37 | 13 (35 %) | 80 | 61 % | 0.71 | -43.27 |
| Short | tp 2.400% | sl 2.00× | tr off | 46 | 15 (33 %) | 82 | 62 % | 0.73 | -41.22 |
| Short | tp 2.000% | sl 2.00× | tr 0.50× | 36 | 8 (22 %) | 109 | 62 % | 0.71 | -35.91 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 46 (46) | 17228 | 7728 | 7728 | 0 | baseTarget 9500 |
| Micro | trailing | 46 (46) | 34456 | 15456 | 15456 | 0 | baseTarget 19000 |
| Short | normal | 252 (214) | 38376 | 13272 | 13272 | 0 | baseRange 16164 · baseTarget 8940 |
| Short | trailing | 252 (214) | 76752 | 26544 | 26544 | 0 | baseRange 32328 · baseTarget 17880 |
| General | normal | 252 (199) | 25584 | 8196 | 8196 | 0 | baseTarget 4212 · baseRange 13176 |
| General | trailing | 252 (199) | 17056 | 5464 | 5464 | 0 | baseTarget 2808 · baseRange 8784 |
| Long | normal | 252 (221) | 31980 | 12480 | 12480 | 0 | baseTarget 6000 · baseRange 13500 |
| Long | trailing | 252 (221) | 21320 | 8320 | 8320 | 0 | baseTarget 4000 · baseRange 9000 |
| Wide | axis | 300 (300) | 51615 | 51615 | 51615 | 0 | – |
| Wide | dca | 300 (300) | 4588 | 4588 | 4588 | 0 | – |
| Wide | dca-active | 300 (300) | 4588 | 4588 | 4588 | 0 | – |

Engine indications Base evaluated that built no set: 91 (bb-bounce, bb-bounce-20-3, ha-1, macd-cross-5-35-5, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-20, mc-burst-2, mc-burst-3, mc-engulf-20, mc-iz-25, mc-macdh, mc-qburst-2, mc-rsi14-25, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi2-5, mc-rsi3-10, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-20, mc-rsi4-25, mc-rsi4-30, mc-rsi4-5, mc-rsi5-20, mc-rsi5-25, mc-rsi5-30, mc-rsi7-15, mc-rsi7-20, mc-rsi7-25, mc-rsi7-30, mc-rsi9-15, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.33 (450) | 0.35 (670) | 0.44 (754) | 0.52 (814) | 0.46 (1092) |
| 1.14× | – | 0.24 (420) | – | – | – | – | – |
| 1.25× | – | 0.25 (420) | 0.31 (444) | 0.34 (682) | 0.47 (772) | 0.60 (814) | 0.57 (1092) |
| 1.33× | 0.19 (366) | – | – | – | – | – | – |
| 1.5× | 0.19 (366) | 0.23 (414) | 0.31 (444) | 0.39 (682) | 0.50 (772) | 0.66 (814) | 0.62 (1092) |
| 1.75× | 0.20 (378) | 0.22 (414) | 0.37 (444) | 0.38 (682) | 0.54 (766) | 0.77 (804) | 0.85 (1082) |
| 2× | 0.20 (378) | 0.24 (414) | 0.44 (444) | 0.44 (682) | 0.67 (756) | 1.00 (804) | 0.94 (1082) |
| 2.25× | 0.22 (378) | 0.27 (414) | 0.45 (444) | 0.70 (672) | 0.76 (756) | 0.97 (804) | 0.98 (1082) |
| 2.5× | 0.23 (378) | 0.30 (414) | 0.60 (442) | 0.68 (672) | 0.73 (756) | 1.18 (804) | 1.08 (1082) |
| 2.75× | 0.25 (378) | 0.37 (412) | 0.73 (442) | 0.69 (666) | 0.90 (762) | 1.24 (804) | 1.05 (1076) |
| 3× | 0.28 (378) | 0.50 (412) | 0.68 (442) | 0.73 (672) | 0.95 (762) | 1.15 (804) | 1.14 (1076) |
| 3.25× | 0.37 (378) | 0.49 (412) | 0.65 (442) | 0.92 (672) | 0.89 (762) | 1.32 (808) | 1.11 (1070) |
| 3.5× | 0.51 (378) | 0.47 (412) | 0.88 (448) | 0.95 (672) | 1.03 (770) | 1.34 (802) | 1.22 (1070) |
| 3.75× | 0.51 (378) | 0.45 (412) | 1.12 (448) | 1.21 (672) | 1.00 (770) | 1.26 (802) | 1.26 (1064) |
| 4× | 0.49 (378) | 0.63 (418) | 1.07 (448) | 1.24 (672) | 1.00 (766) | 1.38 (796) | 1.20 (1064) |
| 4.25× | 0.46 (378) | 0.82 (418) | 1.25 (452) | 1.19 (672) | 0.95 (766) | 1.31 (796) | 1.14 (1064) |
| 4.5× | 0.54 (378) | 0.79 (418) | 1.20 (452) | 1.14 (672) | 1.01 (760) | 1.25 (796) | 1.45 (1040) |
| 4.75× | 0.62 (378) | 0.77 (422) | 1.16 (452) | 1.10 (672) | 0.97 (760) | 1.19 (796) | 1.38 (1040) |
| 5× | 1.00 (378) | 0.91 (422) | 1.12 (452) | 1.26 (666) | 0.93 (760) | 1.46 (790) | 1.68 (1036) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | 0.00 (4) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | 0.57 (6) | 0.63 (6) | 0.34 (4) | 0.42 (26) |
| 1.75× | – | – | – | – | 0.56 (6) | 0.50 (28) | 0.76 (56) |
| 2× | – | – | – | 0.23 (4) | 0.44 (22) | 0.61 (56) | 0.87 (56) |
| 2.25× | – | – | – | 0.41 (6) | 0.57 (28) | 0.73 (32) | 0.83 (58) |
| 2.5× | – | – | 0.17 (4) | 0.75 (10) | 0.83 (10) | 3.33 (32) | 1.95 (52) |
| 2.75× | – | 0.13 (4) | 0.15 (4) | 0.17 (4) | ∞ (10) | 2.86 (36) | 1.91 (54) |
| 3× | – | 0.12 (4) | 0.14 (8) | 0.16 (4) | ∞ (6) | 23.08 (20) | 3.79 (24) |
| 3.25× | 0.09 (4) | 0.11 (4) | 0.13 (8) | ∞ (4) | ∞ (8) | 17.31 (16) | 2.92 (37) |
| 3.5× | 0.08 (4) | 0.11 (4) | 0.38 (8) | ∞ (10) | ∞ (10) | 1.00 (33) | 1.13 (49) |
| 3.75× | 0.08 (4) | 0.10 (4) | 0.59 (12) | ∞ (10) | 0.48 (26) | 0.79 (41) | 1.98 (98) |
| 4× | 0.07 (4) | ∞ (4) | 0.56 (12) | ∞ (10) | 0.30 (32) | 1.21 (109) | 1.83 (94) |
| 4.25× | 0.07 (4) | ∞ (8) | 0.53 (12) | 0.47 (30) | 0.32 (42) | 1.22 (115) | 1.76 (94) |
| 4.5× | 0.06 (4) | ∞ (8) | 0.50 (12) | 0.41 (42) | 0.69 (110) | 1.19 (117) | 1.71 (95) |
| 4.75× | ∞ (4) | ∞ (8) | 0.35 (28) | 0.39 (42) | 0.66 (110) | 1.11 (115) | 1.64 (95) |
| 5× | ∞ (8) | 0.46 (14) | 0.33 (28) | 0.66 (86) | 0.67 (116) | 1.83 (117) | 2.95 (101) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | 0.00 (3) |
| 1.75× | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | – |
| 2.25× | – | – | – | – | – | – | ∞ (1) |
| 2.5× | – | – | – | – | – | – | – |
| 2.75× | – | – | – | – | – | – | – |
| 3× | – | – | – | – | – | – | ∞ (2) |
| 3.25× | – | – | – | – | – | – | ∞ (5) |
| 3.5× | – | – | – | – | – | 0.00 (2) | ∞ (2) |
| 3.75× | – | – | – | – | – | 0.15 (2) | 13.51 (5) |
| 4× | – | – | – | – | 0.14 (4) | ∞ (1) | ∞ (3) |
| 4.25× | – | – | – | – | 0.13 (2) | ∞ (1) | ∞ (3) |
| 4.5× | – | – | – | – | – | – | ∞ (1) |
| 4.75× | – | – | – | – | – | – | ∞ (1) |
| 5× | – | 0.08 (4) | – | – | – | ∞ (6) | 3.38 (4) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.98 (8885) | 0.98 (10201) | 0.85 (9339) | 0.84 (9831) | 0.86 (9094) | 0.87 (8958) |
| 1.5× | 1.01 (8466) | 0.92 (9689) | 0.80 (8794) | 0.72 (9109) | 0.80 (8440) | 0.79 (8358) |
| 2× | 0.91 (8187) | 0.88 (9242) | 0.82 (8293) | 0.78 (8587) | 0.80 (7971) | 0.84 (7822) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.31 (40) | 1.27 (82) | 1.06 (142) | 0.85 (152) | 1.12 (141) | 1.18 (125) |
| 1.5× | 1.21 (277) | 1.05 (261) | 1.06 (227) | 0.82 (241) | 0.79 (304) | 1.12 (180) |
| 2× | 0.90 (263) | 0.98 (307) | 0.79 (272) | 0.71 (233) | 0.96 (249) | 1.03 (253) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 6.17 (22) | ∞ (15) | 3.53 (18) | ∞ (11) | 0.73 (15) | 0.66 (18) |
| 1.5× | 2.00 (50) | 3.47 (43) | 2.20 (29) | 2.46 (15) | 2.21 (18) | 1.22 (16) |
| 2× | 0.90 (56) | 1.83 (39) | 3.24 (34) | 1.69 (33) | 4.40 (20) | 1.37 (40) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.93 (2138) | 0.78 (2419) | 0.73 (2706) | 0.80 (2727) |
| 0.75× | 1.00 (1975) | 0.81 (2206) | 0.69 (2415) | 0.79 (2490) |
| 1× | 0.85 (5887) | 0.81 (6602) | 0.75 (7152) | 0.80 (7117) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.28 (53) | 0.76 (20) | 0.51 (22) | 2.92 (8) |
| 0.75× | 1.47 (41) | 0.67 (22) | 0.89 (89) | 1.11 (52) |
| 1× | 1.40 (99) | 0.63 (170) | 0.82 (217) | 0.86 (115) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.19 (12) | 0.85 (3) | 0.29 (7) | – |
| 0.75× | 1.32 (15) | 0.39 (4) | 0.55 (22) | 1.92 (13) |
| 1× | 1.77 (13) | 0.95 (26) | 0.60 (38) | 0.72 (18) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.77 (2806) | 0.67 (3587) | 0.59 (3400) | 0.55 (3322) | 0.60 (3670) |
| 0.75× | 0.74 (2564) | 0.71 (3184) | 0.64 (3011) | 0.67 (2961) | 0.70 (3220) |
| 1× | 0.83 (7296) | 0.72 (9181) | 0.71 (8782) | 0.71 (8622) | 0.71 (9319) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.44 (10) | 0.27 (15) | 0.36 (6) | 0.73 (38) | 0.92 (61) |
| 0.75× | 1.13 (74) | 1.32 (87) | 1.17 (88) | 1.22 (93) | 0.99 (101) |
| 1× | 0.91 (130) | 0.75 (239) | 0.96 (183) | 1.22 (225) | 1.05 (291) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (2) | 0.00 (1) | 0.00 (1) | 0.23 (9) | 1.37 (14) |
| 0.75× | 1.51 (18) | 1.68 (19) | 1.35 (21) | 1.08 (15) | 1.65 (21) |
| 1× | 0.94 (28) | 1.37 (35) | 3.32 (38) | 1.86 (46) | 2.37 (47) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.64 (27672) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.69 (1341) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.62 (46000) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.73 (1289) | 0.63 (1894) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.72 (1253) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.59 (1817) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.61 (1769) | – | – | – | – |
| 1× | – | – | – | 0.68 (182233) | – | – | – | 0.54 (46292) | 0.60 (6966) | – | 0.52 (2138) | – | 0.65 (6498) | 0.64 (6057) | 0.41 (1887) | 0.44 (1764) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.41 (181) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.93 (239) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.46 (245) | – | – | – | 1.13 (76) | – | – | – | – | – | – | – | – |

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
