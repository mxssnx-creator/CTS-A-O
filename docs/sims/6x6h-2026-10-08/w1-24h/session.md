# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 1m+, 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.00–$0.73 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-07T00:00 → 2026-10-08T00:00 UTC. Engine: Base 1379/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 398/19072 · PF 1.59 · Micro 179/5900 · PF 2.26 · Short 721/8176 · PF 1.54 · General 538/8176 · PF 1.57 · Long 548/8176 · PF 1.59 · Signals 126/126; Main 1301 pairs, 213914 tapes, Real seats: 7029 engine configs + 3780 signal configs (every config of the active signals), compute 310 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $19.05 (-4.75 %, closed orders) · equity at end $15.74 (open at end: 53 positions / 8381 orders, MTM -$3.31 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 0.87 (gross profit $ ÷ gross loss $ as sized) · PF unit 0.59 (every order at one unit: the engine's PF) · 83 positions / 11372 orders (incl. 114 capped to $0) · WR 54.86 % · DDT (closed trades, $) 13.25 h · DDR – (net ≤ 0) · equity max drawdown $4.65 (22.79 %) · margin used max $15.36 · open avg 42.25 pos / 2302.06 orders (peak 54 / 3611)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 114 orders capped to $0, 11015 scaled down (open at end: 21 capped, 8342 scaled) · binding: position cap 9765, gross cap 19179. **Without the caps:** balance $20.00 → -$36.63 (-283.13 %) · PF $ 0.53 · equity at end -$136.90 · equity max drawdown $167.55 (546.73 %) · margin used max $449.68 · infeasible: margin exceeded equity for 1411 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 523 | 1179  | 4.7 % | 1.587 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 523 | 1179 (+0) | 4.7 % | 1.587 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 523 | 1179 (+0) | 4.7 % | 1.587 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 472 | 1039 (-140) | 4.2 % | 1.640 |
| closes ≥ 6 | 1.00 | 6 | 1 | 722 | 1566 (+387) | 6.3 % | 1.780 |
| closes ≥ 20 | 1.00 | 20 | 1 | 387 | 900 (-279) | 3.6 % | 1.487 |
| closes ≥ 30 | 1.00 | 30 | 1 | 288 | 698 (-481) | 2.8 % | 1.409 |
| DDR off | 1.00 | 12 | off | 1920 | 2818 (+1639) | 11.3 % | 1.135 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 909 | 1737 (+558) | 7.0 % | 1.368 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 210 | 541 (-638) | 2.2 % | 2.048 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1920 | 2818 (+1639) | 11.3 % | 1.135 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2375 | 3333 (+2154) | 13.3 % | 1.169 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 0 / 61 | 40 / 21 | 1.67 | 1.42 | 66 % | $0.17 | $20.17 | $19.99 | $18.93 | 5.36 % | 0.15 | $14.12 | 19 / 1112 |
| 01:00 | 3 / 568 | 228 / 340 | 1.53 | 0.54 | 40 % | $0.31 | $20.48 | $19.36 | $19.00 | 5.54 % | 0.27 | $14.40 | 35 / 2419 |
| 02:00 | 8 / 1318 | 671 / 647 | 2.19 | 0.88 | 51 % | $1.00 | $21.48 | $19.62 | $18.83 | 6.93 % | 1.27 | $15.03 | 40 / 2874 |
| 03:00 | 3 / 209 | 168 / 41 | 8.75 | 5.45 | 80 % | $0.21 | $21.69 | $19.64 | $19.61 | 6.93 % | 2.27 | $15.18 | 40 / 3306 |
| 04:00 | 1 / 409 | 262 / 147 | 0.92 | 1.56 | 64 % | -$0.02 | $21.67 | $20.13 | $19.60 | 6.93 % | 0.03 | $15.21 | 41 / 3831 |
| 05:00 | 3 / 409 | 297 / 112 | 1.64 | 1.89 | 73 % | $0.14 | $21.81 | $19.95 | $19.58 | 6.93 % | 0.93 | $15.29 | 49 / 4467 |
| 06:00 | 0 / 384 | 255 / 129 | 0.76 | 1.66 | 66 % | -$0.02 | $21.79 | $19.75 | $19.62 | 6.93 % | 1.93 | $15.27 | 50 / 4737 |
| 07:00 | 1 / 313 | 266 / 47 | 2.49 | 3.85 | 85 % | $0.07 | $21.85 | $19.65 | $19.64 | 6.93 % | 2.93 | $15.30 | 52 / 5659 |
| 08:00 | 0 / 418 | 318 / 100 | 0.93 | 1.56 | 76 % | -$0.01 | $21.84 | $19.34 | $19.17 | 6.93 % | 3.93 | $15.31 | 53 / 6017 |
| 09:00 | 0 / 633 | 406 / 227 | 0.94 | 1.42 | 64 % | -$0.02 | $21.82 | $19.19 | $19.15 | 6.93 % | 4.93 | $15.35 | 54 / 6180 |
| 10:00 | 1 / 374 | 272 / 102 | 2.76 | 2.58 | 73 % | $0.12 | $21.94 | $19.33 | $19.09 | 6.93 % | 5.93 | $15.36 | 53 / 6599 |
| 11:00 | 0 / 369 | 215 / 154 | 0.32 | 0.72 | 58 % | -$0.19 | $21.75 | $19.57 | $19.30 | 6.93 % | 6.93 | $15.36 | 53 / 7055 |
| 12:00 | 1 / 460 | 355 / 105 | 1.79 | 1.49 | 77 % | $0.06 | $21.81 | $19.70 | $19.38 | 6.93 % | 7.93 | $15.27 | 53 / 7504 |
| 13:00 | 2 / 1012 | 743 / 269 | 0.98 | 1.77 | 73 % | -$0.00 | $21.81 | $20.18 | $19.53 | 6.93 % | 0.20 | $15.27 | 51 / 7434 |
| 14:00 | 1 / 270 | 222 / 48 | 2.90 | 4.31 | 82 % | $0.04 | $21.85 | $19.93 | $19.88 | 6.93 % | 1.20 | $15.30 | 50 / 7784 |
| 15:00 | 2 / 601 | 405 / 196 | 0.28 | 0.50 | 67 % | -$0.54 | $21.31 | $18.57 | $18.26 | 10.45 % | 2.20 | $15.34 | 49 / 7964 |
| 16:00 | 0 / 506 | 283 / 223 | 0.58 | 0.30 | 56 % | -$0.10 | $21.21 | $18.88 | $17.98 | 11.82 % | 3.20 | $14.92 | 51 / 8581 |
| 17:00 | 0 / 325 | 178 / 147 | 0.36 | 0.69 | 55 % | -$0.11 | $21.10 | $18.54 | $18.54 | 11.82 % | 4.20 | $14.85 | 52 / 8462 |
| 18:00 | 0 / 533 | 137 / 396 | 0.21 | 0.06 | 26 % | -$0.29 | $20.81 | $17.89 | $17.67 | 13.30 % | 5.20 | $14.77 | 53 / 8732 |
| 19:00 | 0 / 124 | 56 / 68 | 0.70 | 0.43 | 45 % | -$0.01 | $20.80 | $17.90 | $17.52 | 14.04 % | 6.20 | $14.57 | 53 / 8800 |
| 20:00 | 0 / 289 | 79 / 210 | 0.09 | 0.13 | 27 % | -$0.12 | $20.68 | $17.19 | $17.19 | 15.65 % | 7.20 | $14.56 | 54 / 8768 |
| 21:00 | 2 / 450 | 193 / 257 | 0.59 | 0.38 | 43 % | -$0.08 | $20.60 | $17.35 | $16.99 | 16.64 % | 8.20 | $14.47 | 52 / 9141 |
| 22:00 | 0 / 924 | 141 / 783 | 0.07 | 0.07 | 15 % | -$0.74 | $19.86 | $16.26 | $16.26 | 20.23 % | 9.20 | $14.42 | 52 / 8722 |
| 23:00 | 0 / 413 | 49 / 364 | 0.03 | 0.02 | 12 % | -$0.81 | $19.05 | $15.74 | $15.74 | 22.79 % | 10.20 | $13.90 | 53 / 8381 |

**Last hour (23:00):** open at end: 53 positions / 8381 orders, MTM -$3.31 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $15.74 = balance $19.05 + MTM -$3.31.

**Hours positive:** 9 of 24 full hours · flat 0 · negative 15

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m | 1m+ | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | – | – | – | – | 59 · 1.66 · $0.17 | 2 · ∞ (no loss) · $0.00 | – |
| 01:00 | 9 · – · $0.00 | – | 3 · – · $0.00 | 3 · ∞ (no loss) · $0.01 | 326 · 1.95 · $0.39 | 139 · 0.15 · -$0.14 | 88 · 7.40 · $0.04 |
| 02:00 | 22 · – · $0.00 | – | 9 · 1.03 · $0.00 | 3 · ∞ (no loss) · $0.00 | 788 · 2.99 · $1.06 | 364 · 1.69 · $0.10 | 132 · 0.02 · -$0.16 |
| 03:00 | 1 · ∞ (no loss) · $0.00 | – | – | 3 · 0.00 · -$0.00 | 105 · 22.74 · $0.13 | 61 · 5.26 · $0.09 | 39 · 28.57 · $0.00 |
| 04:00 | 5 · ∞ (no loss) · $0.00 | – | 12 · 0.00 · -$0.00 | – | 255 · 2.43 · $0.12 | 113 · 0.53 · -$0.06 | 24 · 0.00 · -$0.08 |
| 05:00 | 7 · 0.00 · -$0.00 | – | 2 · 0.00 · -$0.00 | 3 · 0.00 · -$0.00 | 267 · 1.45 · $0.10 | 66 · 75.14 · $0.04 | 64 · 1.27 · $0.00 |
| 06:00 | – | – | 3 · ∞ (no loss) · $0.00 | 3 · 0.00 · -$0.00 | 208 · 0.60 · -$0.03 | 123 · 2.55 · $0.01 | 47 · 5.74 · $0.00 |
| 07:00 | – | 1 · ∞ (no loss) · $0.00 | – | – | 220 · 2.17 · $0.05 | 86 · 7.11 · $0.02 | 6 · 0.60 · -$0.00 |
| 08:00 | – | 2 · – · $0.00 | 3 · – · $0.00 | – | 278 · 0.82 · -$0.03 | 102 · 29.10 · $0.01 | 33 · 5.98 · $0.00 |
| 09:00 | – | – | 7 · 0.00 · -$0.00 | – | 436 · 1.19 · $0.04 | 123 · 0.81 · -$0.01 | 67 · 0.05 · -$0.05 |
| 10:00 | 1 · ∞ (no loss) · $0.00 | – | 3 · 0.00 · -$0.00 | – | 233 · 4.35 · $0.12 | 96 · 1.50 · $0.01 | 41 · 0.48 · -$0.01 |
| 11:00 | – | – | 4 · – · $0.00 | – | 277 · 0.30 · -$0.18 | 77 · 0.79 · -$0.00 | 11 · 0.15 · -$0.01 |
| 12:00 | 10 · 0.00 · -$0.00 | – | 4 · – · $0.00 | – | 354 · 1.98 · $0.06 | 62 · 1.10 · $0.00 | 30 · 1.56 · $0.00 |
| 13:00 | – | – | 12 · ∞ (no loss) · $0.00 | – | 848 · 1.18 · $0.05 | 94 · 0.41 · -$0.02 | 58 · 0.11 · -$0.03 |
| 14:00 | – | – | – | – | 268 · 2.90 · $0.04 | 2 · 0.00 · -$0.00 | – |
| 15:00 | – | – | 6 · ∞ (no loss) · $0.00 | – | 546 · 0.26 · -$0.55 | 41 · 2.23 · $0.01 | 8 · 0.06 · -$0.00 |
| 16:00 | 3 · – · $0.00 | – | 3 · – · $0.00 | – | 466 · 0.56 · -$0.10 | 21 · 1.44 · $0.00 | 13 · 4.60 · $0.00 |
| 17:00 | – | – | – | – | 234 · 0.43 · -$0.08 | 57 · 0.01 · -$0.01 | 34 · 0.03 · -$0.02 |
| 18:00 | – | – | – | – | 421 · 0.15 · -$0.29 | 91 · 1.04 · $0.00 | 21 · 0.60 · -$0.00 |
| 19:00 | – | – | – | – | 104 · 0.50 · -$0.01 | 16 · 4.59 · $0.01 | 4 · 0.41 · -$0.00 |
| 20:00 | – | – | – | – | 221 · 0.06 · -$0.12 | 37 · 0.20 · -$0.01 | 31 · 0.79 · -$0.00 |
| 21:00 | – | – | – | – | 407 · 0.50 · -$0.09 | 23 · 3.30 · $0.01 | 20 · 1.06 · $0.00 |
| 22:00 | – | – | – | 3 · ∞ (no loss) · $0.00 | 757 · 0.07 · -$0.67 | 86 · 0.04 · -$0.04 | 78 · 0.15 · -$0.03 |
| 23:00 | – | – | – | – | 350 · 0.03 · -$0.80 | 49 · 0.04 · -$0.01 | 14 · 0.52 · -$0.00 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Axis, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Axis | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 61 | 7 · 0.49 · 43 % · -$0.01 | 10 · 0.64 · 30 % · -$0.01 | 1 · 0.00 · 0 % · -$0.00 | 26 · 1.13 · 69 % · $0.03 | 17 · 578.48 · 94 % · $0.17 | – | 43 · 1.98 · 79 % · $0.20 |
| 01:00 | 568 | 141 · 0.25 · 13 % · -$0.13 | 250 · 0.11 · 28 % · -$0.26 | 12 · ∞ (no loss) · 67 % · $0.01 | 92 · 3.15 · 66 % · $0.22 | 73 · 267.86 · 96 % · $0.47 | – | 165 · 7.47 · 79 % · $0.69 |
| 02:00 | 1318 | 344 · 0.51 · 21 % · -$0.13 | 410 · 0.50 · 30 % · -$0.17 | 22 · – · 0 % · $0.00 | 253 · 3.54 · 81 % · $0.45 | 289 · 17.14 · 94 % · $0.86 | – | 542 · 6.69 · 88 % · $1.30 |
| 03:00 | 209 | 51 · 19.70 · 90 % · $0.10 | 68 · 0.32 · 66 % · -$0.01 | 1 · ∞ (no loss) · 100 % · $0.00 | 44 · 15.02 · 89 % · $0.08 | 45 · 141.96 · 82 % · $0.05 | – | 89 · 22.20 · 85 % · $0.12 |
| 04:00 | 409 | 55 · 0.28 · 9 % · -$0.03 | 126 · 0.31 · 49 % · -$0.14 | 23 · 0.00 · 22 % · -$0.00 | 119 · 1.82 · 93 % · $0.05 | 86 · 699.86 · 92 % · $0.09 | – | 205 · 3.20 · 93 % · $0.15 |
| 05:00 | 409 | 112 · 18.33 · 94 % · $0.06 | 88 · 1.04 · 69 % · $0.00 | 7 · 0.00 · 0 % · -$0.00 | 85 · 1.31 · 46 % · $0.04 | 117 · 1.54 · 79 % · $0.04 | – | 202 · 1.40 · 65 % · $0.08 |
| 06:00 | 384 | 73 · 3.78 · 86 % · $0.01 | 232 · 2.81 · 63 % · $0.02 | 3 · 0.00 · 0 % · -$0.00 | 51 · 0.17 · 51 % · -$0.06 | 25 · 6.16 · 84 % · $0.01 | – | 76 · 0.31 · 62 % · -$0.05 |
| 07:00 | 313 | 57 · 9.48 · 93 % · $0.02 | 114 · 7.05 · 92 % · $0.02 | 4 · ∞ (no loss) · 100 % · $0.00 | 66 · 0.63 · 62 % · -$0.01 | 72 · 212.40 · 88 % · $0.04 | – | 138 · 1.61 · 75 % · $0.02 |
| 08:00 | 418 | 71 · 4.97 · 80 % · $0.02 | 113 · 100.96 · 84 % · $0.02 | 2 · – · 100 % · $0.00 | 151 · 0.52 · 64 % · -$0.07 | 81 · 3.06 · 83 % · $0.03 | – | 232 · 0.72 · 71 % · -$0.05 |
| 09:00 | 633 | 115 · 0.15 · 29 % · -$0.04 | 135 · 0.40 · 45 % · -$0.07 | – | 253 · 0.92 · 75 % · -$0.01 | 130 · 674.30 · 94 % · $0.11 | – | 383 · 1.49 · 81 % · $0.09 |
| 10:00 | 374 | 39 · 0.15 · 28 % · -$0.02 | 140 · 4.35 · 78 % · $0.04 | 1 · ∞ (no loss) · 100 % · $0.00 | 72 · 1.43 · 58 % · $0.01 | 122 · 403.61 · 89 % · $0.08 | – | 194 · 3.68 · 78 % · $0.09 |
| 11:00 | 369 | 78 · 0.28 · 36 % · -$0.04 | 79 · 0.72 · 42 % · -$0.00 | – | 139 · 0.44 · 73 % · -$0.05 | 73 · 0.20 · 71 % · -$0.10 | – | 212 · 0.31 · 73 % · -$0.15 |
| 12:00 | 460 | 50 · 0.48 · 52 % · -$0.02 | 119 · 8.56 · 85 % · $0.06 | 10 · 0.00 · 0 % · -$0.00 | 117 · 1.50 · 69 % · $0.01 | 164 · 1.78 · 90 % · $0.01 | – | 281 · 1.62 · 81 % · $0.02 |
| 13:00 | 1012 | 130 · 0.14 · 25 % · -$0.10 | 108 · 0.08 · 31 % · -$0.09 | 6 · 0.00 · 0 % · -$0.00 | 459 · 1.80 · 85 % · $0.08 | 309 · 19.97 · 93 % · $0.11 | – | 768 · 2.85 · 88 % · $0.19 |
| 14:00 | 270 | 2 · 0.00 · 0 % · -$0.01 | 2 · 0.00 · 0 % · -$0.00 | – | 70 · 3.46 · 77 % · $0.02 | 196 · 44.59 · 86 % · $0.03 | – | 266 · 6.76 · 83 % · $0.06 |
| 15:00 | 601 | 18 · 0.09 · 22 % · -$0.01 | 96 · 5.69 · 77 % · $0.04 | 6 · 0.00 · 0 % · -$0.00 | 190 · 0.16 · 52 % · -$0.24 | 291 · 0.25 · 78 % · -$0.33 | – | 481 · 0.21 · 68 % · -$0.57 |
| 16:00 | 506 | 33 · 2.02 · 76 % · $0.00 | 46 · 0.52 · 63 % · -$0.00 | 6 · ∞ (no loss) · 100 % · $0.00 | 194 · 0.70 · 19 % · -$0.04 | 227 · 0.38 · 82 % · -$0.06 | – | 421 · 0.55 · 53 % · -$0.10 |
| 17:00 | 325 | 64 · 0.02 · 11 % · -$0.04 | 63 · 0.01 · 8 % · -$0.07 | – | 78 · 0.62 · 74 % · -$0.03 | 120 · 89.77 · 90 % · $0.02 | – | 198 · 0.88 · 84 % · -$0.01 |
| 18:00 | 533 | 77 · 0.36 · 22 % · -$0.02 | 104 · 0.99 · 41 % · -$0.00 | – | 159 · 0.14 · 7 % · -$0.14 | 193 · 0.13 · 34 % · -$0.13 | – | 352 · 0.14 · 22 % · -$0.27 |
| 19:00 | 124 | 17 · 1.46 · 41 % · $0.00 | 20 · 0.80 · 55 % · -$0.00 | – | 54 · 0.16 · 15 % · -$0.02 | 33 · 99.33 · 91 % · $0.01 | – | 87 · 0.54 · 44 % · -$0.01 |
| 20:00 | 289 | 33 · 0.09 · 9 % · -$0.01 | 55 · 0.52 · 40 % · -$0.00 | – | 143 · 0.03 · 7 % · -$0.09 | 58 · 0.25 · 76 % · -$0.01 | – | 201 · 0.06 · 27 % · -$0.11 |
| 21:00 | 450 | 59 · 1.29 · 42 % · $0.01 | 62 · 0.36 · 32 % · -$0.01 | – | 249 · 0.34 · 36 % · -$0.09 | 80 · 2.20 · 74 % · $0.02 | – | 329 · 0.51 · 45 % · -$0.07 |
| 22:00 | 924 | 118 · 0.10 · 9 % · -$0.09 | 215 · 0.04 · 11 % · -$0.13 | – | 350 · 0.06 · 13 % · -$0.31 | 241 · 0.09 · 26 % · -$0.21 | – | 591 · 0.07 · 18 % · -$0.52 |
| 23:00 | 413 | 55 · 0.15 · 13 % · -$0.01 | 88 · 0.04 · 3 % · -$0.02 | – | 125 · 0.03 · 4 % · -$0.31 | 145 · 0.02 · 23 % · -$0.47 | – | 270 · 0.03 · 14 % · -$0.78 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1253 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (213914 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (13915); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 13327 · 0.85 | 1649 · 2.09 | 2572 · 2.02 | 754 · 3.54 | 61 · 1.42 | 7 · 0.59 | 10 · 0.34 | – | 43 · 1.98 |
| 01:00 | 53143 · 0.43 | 11078 · 0.54 | 14368 · 0.50 | 2576 · 0.46 | 568 · 0.54 | 141 · 0.08 | 250 · 0.17 | – | 165 · 3.21 |
| 02:00 | 111405 · 0.71 | 25944 · 0.92 | 37702 · 0.98 | 9157 · 2.14 | 1318 · 0.88 | 344 · 0.16 | 410 · 0.18 | – | 542 · 4.73 |
| 03:00 | 46443 · 1.67 | 7768 · 2.06 | 11281 · 2.56 | 2945 · 2.79 | 209 · 5.45 | 51 · 11.87 | 68 · 2.08 | – | 89 · 7.42 |
| 04:00 | 45728 · 0.42 | 8577 · 0.71 | 13232 · 0.56 | 3376 · 2.94 | 409 · 1.56 | 55 · 0.07 | 126 · 0.37 | – | 205 · 14.92 |
| 05:00 | 56144 · 1.29 | 14834 · 1.36 | 14461 · 1.14 | 4871 · 1.69 | 409 · 1.89 | 112 · 15.77 | 88 · 1.31 | – | 202 · 1.32 |
| 06:00 | 46407 · 1.27 | 10576 · 1.17 | 15970 · 1.62 | 3964 · 1.35 | 384 · 1.66 | 73 · 3.57 | 232 · 2.77 | – | 76 · 0.76 |
| 07:00 | 32284 · 1.58 | 6872 · 1.65 | 11993 · 1.94 | 3927 · 2.01 | 313 · 3.85 | 57 · 6.61 | 114 · 15.49 | – | 138 · 2.29 |
| 08:00 | 38928 · 1.30 | 8589 · 1.22 | 12843 · 1.92 | 3233 · 0.91 | 418 · 1.56 | 71 · 2.94 | 113 · 85.43 | – | 232 · 1.10 |
| 09:00 | 67797 · 0.89 | 18891 · 1.15 | 21366 · 0.90 | 6244 · 1.60 | 633 · 1.42 | 115 · 0.32 | 135 · 1.09 | – | 383 · 2.48 |
| 10:00 | 57925 · 1.07 | 9892 · 1.09 | 16776 · 1.93 | 3509 · 0.85 | 374 · 2.58 | 39 · 0.27 | 140 · 6.42 | – | 194 · 2.49 |
| 11:00 | 55405 · 0.67 | 15251 · 1.00 | 14981 · 0.68 | 4567 · 0.93 | 369 · 0.72 | 78 · 0.29 | 79 · 0.43 | – | 212 · 1.04 |
| 12:00 | 74030 · 0.76 | 18328 · 0.68 | 26021 · 0.88 | 7664 · 0.27 | 460 · 1.49 | 50 · 0.62 | 119 · 3.50 | – | 281 · 1.39 |
| 13:00 | 122029 · 0.66 | 32894 · 0.82 | 47138 · 0.68 | 8445 · 1.10 | 1012 · 1.77 | 130 · 0.19 | 108 · 0.20 | – | 768 · 3.76 |
| 14:00 | 48931 · 1.36 | 11828 · 1.31 | 17738 · 1.65 | 4607 · 2.67 | 270 · 4.31 | 2 · 0.00 | 2 · 0.00 | – | 266 · 4.81 |
| 15:00 | 70565 · 1.06 | 18300 · 0.83 | 26737 · 1.10 | 7713 · 1.08 | 601 · 0.50 | 18 · 0.05 | 96 · 1.43 | – | 481 · 0.48 |
| 16:00 | 65914 · 1.75 | 15782 · 1.48 | 30303 · 2.24 | 5527 · 0.86 | 506 · 0.30 | 33 · 1.78 | 46 · 2.08 | – | 421 · 0.22 |
| 17:00 | 44351 · 0.97 | 10396 · 0.71 | 19481 · 0.93 | 4561 · 1.09 | 325 · 0.69 | 64 · 0.07 | 63 · 0.02 | – | 198 · 2.62 |
| 18:00 | 49384 · 1.27 | 13997 · 1.16 | 15959 · 0.91 | 4935 · 0.60 | 533 · 0.06 | 77 · 0.18 | 104 · 0.66 | – | 352 · 0.04 |
| 19:00 | 37761 · 1.52 | 12552 · 1.80 | 11315 · 1.30 | 2736 · 1.17 | 124 · 0.43 | 17 · 0.56 | 20 · 1.27 | – | 87 · 0.34 |
| 20:00 | 46661 · 0.81 | 13713 · 1.34 | 10171 · 0.70 | 3315 · 0.40 | 289 · 0.13 | 33 · 0.07 | 55 · 0.36 | – | 201 · 0.11 |
| 21:00 | 66203 · 0.92 | 18645 · 1.11 | 21923 · 1.13 | 5159 · 1.04 | 450 · 0.38 | 59 · 0.70 | 62 · 0.31 | – | 329 · 0.36 |
| 22:00 | 68690 · 0.55 | 18908 · 0.65 | 22728 · 0.57 | 6888 · 0.28 | 924 · 0.07 | 118 · 0.07 | 215 · 0.05 | – | 591 · 0.07 |
| 23:00 | 48138 · 0.57 | 11810 · 0.84 | 13109 · 0.48 | 3177 · 0.26 | 413 · 0.02 | 55 · 0.14 | 88 · 0.01 | – | 270 · 0.02 |
| **total** | **1367593 · 0.90** | **337074 · 0.99** | **450168 · 1.00** | **113850 · 0.88** | **11372 · 0.59** | **1799 · 0.41** | **2743 · 0.54** | **–** | **6726 · 0.63** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 1799 | 657 / 1142 | 0.53 | 0.41 | -$0.49 | 36.52 % | 24.00 |
| Trailing | 2743 | 1279 / 1464 | 0.46 | 0.54 | -$0.78 | 46.63 % | 23.50 |
| Axis | 104 | 27 / 77 | 1.56 | 0.39 | $0.00 | 25.96 % | 19.98 |
| Signal · Normal | 3539 | 1856 / 1683 | 0.83 | 0.51 | -$0.49 | 52.44 % | 18.50 |
| Signal · Trailing | 3187 | 2420 / 767 | 1.47 | 0.86 | $0.81 | 75.93 % | 8.25 |
| total | 11372 | 6239 / 5133 | 0.87 | 0.59 | -$0.95 | 54.86 % | 13.25 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 6726 | 4276 / 2450 | 1.07 | 0.63 | $0.32 | 63.57 % | 8.75 |
| of which Engine (no signals) | 4646 | 1963 / 2683 | 0.49 | 0.48 | -$1.27 | 42.25 % | 23.50 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m | 58 | 0.00 | 0.40 | -$0.00 |
| 1m+ | 3 | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 5m | 71 | 0.22 | 0.31 | -$0.00 |
| 5m+ | 18 | 12.01 | 0.34 | $0.01 |
| 15m | 8428 | 0.90 | 0.59 | -$0.62 |
| 15m+ | 1931 | 1.01 | 0.50 | $0.01 |
| 30m | 863 | 0.23 | 0.81 | -$0.34 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 87 | 53 / 34 | 1.27 | 0.37 | $0.00 | 60.92 % | 20.50 |
| Short | 3825 | 1643 / 2182 | 0.48 | 0.46 | -$1.13 | 42.95 % | 23.50 |
| General | 363 | 143 / 220 | 0.98 | 0.65 | -$0.00 | 39.39 % | 10.50 |
| Long | 267 | 97 / 170 | 0.33 | 0.56 | -$0.14 | 36.33 % | 24.00 |
| Wide | 104 | 27 / 77 | 1.56 | 0.39 | $0.00 | 25.96 % | 19.98 |
| Signals | 6726 | 4276 / 2450 | 1.07 | 0.63 | $0.32 | 63.57 % | 8.75 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 116167 | sig:confirm 33328 · sig:signalCluster 26308 · sig:duplicate 25924 · sig:signalPf 18452 · sig:signalSide 12150 · sig:signalGuard 5 |
| Short | 22281 | lastN 14003 · symPf 3716 · engineSide 3016 · duplicate 1546 |
| Micro | 4453 | crowd 2716 · engineSide 918 · lastN 691 · symPf 122 · duplicate 6 |
| General | 3845 | lastN 2553 · engineSide 804 · symPf 381 · duplicate 107 |
| Long | 3447 | lastN 2309 · engineSide 590 · symPf 505 · duplicate 43 |
| Wide | 806 | engineSide 380 · lastN 366 · symPf 60 |

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
| Micro | 2.26 | 0.37 | 0.16 | 1.27 | 3.47 | 87 |
| Short | 1.54 | 0.46 | 0.30 | 0.48 | 1.06 | 3825 |
| General | 1.57 | 0.65 | 0.41 | 0.98 | 1.51 | 363 |
| Long | 1.59 | 0.56 | 0.35 | 0.33 | 0.59 | 267 |
| Wide | 1.59 | 0.39 | 0.25 | 1.56 | 4.00 | 104 |
| Signals | – | 0.63 | – | 1.07 | 1.69 | 6726 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (10306 of 184690 evaluated, 210134 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3144 units active at the run start, 5642 over the run, 3609 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 1806 | 94 (5 %) | 2703 | 62 % | 0.24 | -1459.49 |
| Micro | trailing | 1641 | 124 (8 %) | 4343 | 54 % | 0.32 | -1728.63 |
| Short | normal | 1465 | 530 (36 %) | 10509 | 59 % | 0.92 | -1141.32 |
| Short | trailing | 3115 | 1156 (37 %) | 17740 | 58 % | 0.89 | -2069.28 |
| General | normal | 457 | 155 (34 %) | 1694 | 48 % | 1.04 | 94.97 |
| General | trailing | 556 | 183 (33 %) | 1906 | 57 % | 1.01 | 32.09 |
| Long | normal | 568 | 140 (25 %) | 1140 | 49 % | 1.10 | 233.69 |
| Long | trailing | 432 | 115 (27 %) | 815 | 60 % | 0.97 | -47.32 |
| Wide | axis | 266 | 46 (17 %) | 1720 | 32 % | 0.53 | -512.72 |
| Signals | normal | 1810 | 468 (26 %) | 38278 | 61 % | 0.73 | -27696.58 |
| Signals | trailing | 1799 | 1099 (61 %) | 33002 | 77 % | 1.17 | 9207.74 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 3447 | 218 (6 %) | 7046 | 57 % | 0.28 | -3188.12 |
| Short | active | 195 | 74 (38 %) | 373 | 35 % | 0.23 | -629.98 |
| Short | bollinger | 270 | 24 (9 %) | 925 | 49 % | 0.60 | -506.24 |
| Short | break | 346 | 155 (45 %) | 3851 | 63 % | 1.03 | 121.18 |
| Short | channel | 60 | 12 (20 %) | 249 | 31 % | 0.35 | -255.51 |
| Short | direction | 269 | 144 (54 %) | 825 | 57 % | 0.88 | -111.31 |
| Short | ema | 229 | 68 (30 %) | 813 | 41 % | 0.59 | -555.78 |
| Short | ichimoku | 20 | 0 (0 %) | 256 | 37 % | 0.16 | -403.01 |
| Short | macd | 144 | 55 (38 %) | 340 | 59 % | 0.89 | -47.59 |
| Short | move | 492 | 202 (41 %) | 1747 | 57 % | 0.81 | -403.04 |
| Short | osc | 1113 | 546 (49 %) | 11655 | 61 % | 1.03 | 330.93 |
| Short | rsi | 352 | 11 (3 %) | 603 | 52 % | 0.70 | -189.08 |
| Short | smooth | 194 | 121 (62 %) | 336 | 59 % | 1.34 | 128.00 |
| Short | trend | 289 | 173 (60 %) | 2268 | 61 % | 1.00 | -11.74 |
| Short | volume | 607 | 101 (17 %) | 4008 | 58 % | 0.86 | -677.44 |
| General | active | 33 | 13 (39 %) | 73 | 34 % | 0.29 | -100.17 |
| General | bollinger | 67 | 0 (0 %) | 1 | 0 % | 0.00 | -2.60 |
| General | break | 83 | 29 (35 %) | 1001 | 45 % | 0.78 | -338.89 |
| General | channel | 24 | 0 (0 %) | 44 | 27 % | 0.33 | -73.26 |
| General | direction | 74 | 34 (46 %) | 171 | 56 % | 1.16 | 36.19 |
| General | ema | 43 | 5 (12 %) | 104 | 35 % | 0.57 | -86.76 |
| General | ichimoku | 1 | 1 (100 %) | 3 | 100 % | ∞ (no loss) | 12.60 |
| General | macd | 27 | 2 (7 %) | 15 | 67 % | 0.82 | -3.11 |
| General | move | 100 | 39 (39 %) | 130 | 52 % | 0.93 | -14.26 |
| General | osc | 184 | 103 (56 %) | 870 | 65 % | 1.88 | 697.52 |
| General | rsi | 96 | 1 (1 %) | 11 | 9 % | 0.12 | -29.13 |
| General | smooth | 67 | 46 (69 %) | 106 | 61 % | 1.55 | 63.47 |
| General | trend | 66 | 40 (61 %) | 478 | 56 % | 1.07 | 41.28 |
| General | volume | 148 | 25 (17 %) | 593 | 52 % | 0.92 | -75.81 |
| Long | active | 8 | 2 (25 %) | 11 | 27 % | 0.41 | -16.74 |
| Long | bollinger | 14 | 3 (21 %) | 14 | 36 % | 0.05 | -50.18 |
| Long | break | 59 | 2 (3 %) | 162 | 31 % | 0.32 | -348.67 |
| Long | channel | 17 | 0 (0 %) | 8 | 0 % | 0.00 | -38.43 |
| Long | direction | 101 | 55 (54 %) | 246 | 59 % | 1.48 | 193.41 |
| Long | ema | 23 | 1 (4 %) | 8 | 88 % | 2.34 | 7.77 |
| Long | macd | 98 | 5 (5 %) | 36 | 31 % | 0.60 | -27.10 |
| Long | move | 104 | 19 (18 %) | 83 | 31 % | 0.25 | -209.42 |
| Long | osc | 142 | 82 (58 %) | 416 | 73 % | 2.76 | 747.08 |
| Long | rsi | 85 | 11 (13 %) | 37 | 46 % | 1.08 | 5.19 |
| Long | smooth | 35 | 26 (74 %) | 42 | 74 % | 2.99 | 72.24 |
| Long | trend | 66 | 17 (26 %) | 364 | 40 % | 0.58 | -327.39 |
| Long | volume | 248 | 32 (13 %) | 528 | 55 % | 1.16 | 178.60 |
| Wide | active | 21 | 0 (0 %) | 6 | 0 % | 0.00 | -8.86 |
| Wide | bollinger | 12 | 3 (25 %) | 3 | 100 % | ∞ (no loss) | 3.71 |
| Wide | break | 36 | 9 (25 %) | 279 | 24 % | 0.24 | -165.90 |
| Wide | channel | 42 | 0 (0 %) | 627 | 29 % | 0.37 | -270.36 |
| Wide | direction | 12 | 0 (0 %) | 45 | 40 % | 0.66 | -10.18 |
| Wide | ema | 3 | 0 (0 %) | 42 | 50 % | 0.90 | -3.01 |
| Wide | macd | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 50 | 10 (20 %) | 59 | 47 % | 0.77 | -8.03 |
| Wide | osc | 50 | 18 (36 %) | 612 | 37 % | 0.89 | -31.73 |
| Wide | rsi | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -25.27 |
| Wide | smooth | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.91 |
| Wide | trend | 3 | 3 (100 %) | 12 | 25 % | 1.44 | 2.38 |
| Wide | volume | 16 | 0 (0 %) | 14 | 36 % | 0.71 | -2.39 |
| Signals | signal:act-burst | 60 | 36 (60 %) | 1365 | 73 % | 1.06 | 168.40 |
| Signals | signal:act-hf | 60 | 18 (30 %) | 1650 | 66 % | 0.73 | -1073.98 |
| Signals | signal:adx | 60 | 40 (67 %) | 1041 | 73 % | 1.24 | 432.56 |
| Signals | signal:atr-break | 60 | 9 (15 %) | 1497 | 64 % | 0.68 | -1330.96 |
| Signals | signal:bollinger | 60 | 30 (50 %) | 1039 | 67 % | 0.95 | -128.26 |
| Signals | signal:cci | 60 | 17 (28 %) | 1448 | 67 % | 0.87 | -440.66 |
| Signals | signal:cmf | 60 | 8 (13 %) | 1324 | 60 % | 0.57 | -1704.51 |
| Signals | signal:donchian | 60 | 31 (52 %) | 1087 | 70 % | 0.96 | -94.16 |
| Signals | signal:ema-cross | 60 | 23 (38 %) | 633 | 64 % | 0.65 | -604.49 |
| Signals | signal:ema-cross-fast | 60 | 25 (42 %) | 1240 | 72 % | 1.07 | 184.20 |
| Signals | signal:ema-pullback | 60 | 14 (23 %) | 1459 | 65 % | 0.72 | -1006.65 |
| Signals | signal:ema-slope | 60 | 36 (60 %) | 907 | 73 % | 1.08 | 147.42 |
| Signals | signal:ema-trend | 60 | 22 (37 %) | 1417 | 65 % | 0.81 | -700.66 |
| Signals | signal:heikin-ashi | 60 | 35 (58 %) | 2343 | 71 % | 1.08 | 352.58 |
| Signals | signal:hma | 60 | 35 (58 %) | 1624 | 72 % | 1.07 | 203.81 |
| Signals | signal:ichimoku | 60 | 6 (10 %) | 683 | 63 % | 0.52 | -987.45 |
| Signals | signal:impulse | 60 | 25 (42 %) | 1527 | 69 % | 0.86 | -468.46 |
| Signals | signal:kama | 60 | 27 (45 %) | 2022 | 72 % | 1.04 | 170.78 |
| Signals | signal:keltner | 60 | 22 (37 %) | 785 | 68 % | 0.79 | -391.80 |
| Signals | signal:macd-cross | 60 | 24 (40 %) | 1714 | 70 % | 0.89 | -437.97 |
| Signals | signal:macd-hist | 60 | 27 (45 %) | 2146 | 71 % | 1.02 | 105.28 |
| Signals | signal:macd-slow | 60 | 24 (40 %) | 1713 | 68 % | 0.86 | -538.81 |
| Signals | signal:mfi | 30 | 30 (100 %) | 324 | 85 % | 3.17 | 641.22 |
| Signals | signal:obv | 60 | 55 (92 %) | 1954 | 79 % | 1.89 | 2051.41 |
| Signals | signal:r-awesome | 60 | 22 (37 %) | 1058 | 65 % | 0.78 | -558.01 |
| Signals | signal:r-connors | 59 | 10 (17 %) | 655 | 60 % | 0.59 | -745.42 |
| Signals | signal:r-fractal | 60 | 2 (3 %) | 752 | 53 % | 0.35 | -1869.71 |
| Signals | signal:r-inside | 41 | 3 (7 %) | 154 | 44 % | 0.20 | -520.99 |
| Signals | signal:r-linreg | 60 | 27 (45 %) | 1507 | 66 % | 0.77 | -840.09 |
| Signals | signal:r-nr-break | 60 | 14 (23 %) | 1424 | 63 % | 0.65 | -1254.78 |
| Signals | signal:r-session-trend | 60 | 18 (30 %) | 679 | 61 % | 0.64 | -729.61 |
| Signals | signal:r-vol-regime | 58 | 27 (47 %) | 356 | 72 % | 1.05 | 39.79 |
| Signals | signal:reclaim | 60 | 27 (45 %) | 1950 | 70 % | 1.02 | 82.14 |
| Signals | signal:rsi-mid | 60 | 23 (38 %) | 1561 | 68 % | 0.86 | -524.73 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 60 | 37 (62 %) | 285 | 72 % | 1.04 | 25.91 |
| Signals | signal:s2-active-hf | 60 | 23 (38 %) | 2015 | 69 % | 0.89 | -515.30 |
| Signals | signal:s2-adx-gate | 60 | 19 (32 %) | 1297 | 67 % | 0.80 | -648.40 |
| Signals | signal:s2-atr-break | 60 | 10 (17 %) | 1107 | 59 % | 0.54 | -1524.56 |
| Signals | signal:s2-bb-bounce | 60 | 36 (60 %) | 1009 | 73 % | 1.36 | 597.34 |
| Signals | signal:s2-block-scale | 60 | 9 (15 %) | 1565 | 59 % | 0.53 | -2094.98 |
| Signals | signal:s2-block-stack | 60 | 5 (8 %) | 1367 | 59 % | 0.52 | -2150.45 |
| Signals | signal:s2-confluence | 60 | 35 (58 %) | 1781 | 72 % | 1.11 | 338.70 |
| Signals | signal:s2-ema-cross | 30 | 20 (67 %) | 162 | 74 % | 1.33 | 100.27 |
| Signals | signal:s2-range-break | 60 | 27 (45 %) | 326 | 55 % | 0.54 | -450.94 |
| Signals | signal:s2-range-shift | 60 | 3 (5 %) | 755 | 53 % | 0.35 | -1794.91 |
| Signals | signal:s2-rsi-revert | 60 | 45 (75 %) | 408 | 77 % | 1.76 | 407.94 |
| Signals | signal:s2-st-trail | 60 | 40 (67 %) | 436 | 75 % | 1.57 | 368.88 |
| Signals | signal:s2-stoch-swing | 60 | 52 (87 %) | 1448 | 78 % | 2.09 | 1833.73 |
| Signals | signal:s2-vol-break | 60 | 20 (33 %) | 563 | 64 % | 0.74 | -407.41 |
| Signals | signal:s2-vwap-axis | 12 | 9 (75 %) | 25 | 80 % | 1.77 | 18.99 |
| Signals | signal:sar | 60 | 12 (20 %) | 1906 | 67 % | 0.75 | -1242.74 |
| Signals | signal:squeeze | 60 | 28 (47 %) | 302 | 68 % | 0.87 | -105.74 |
| Signals | signal:st-slow | 60 | 34 (57 %) | 463 | 71 % | 1.24 | 217.20 |
| Signals | signal:stoch-rsi | 60 | 40 (67 %) | 2116 | 72 % | 1.18 | 674.58 |
| Signals | signal:supertrend | 60 | 34 (57 %) | 932 | 74 % | 1.10 | 180.55 |
| Signals | signal:swing | 60 | 21 (35 %) | 1719 | 66 % | 0.75 | -1035.18 |
| Signals | signal:thrust | 60 | 28 (47 %) | 1551 | 70 % | 0.89 | -337.23 |
| Signals | signal:trix | 60 | 12 (20 %) | 554 | 64 % | 0.58 | -663.79 |
| Signals | signal:volume-break | 56 | 38 (68 %) | 229 | 75 % | 1.20 | 77.83 |
| Signals | signal:vwap | 60 | 35 (58 %) | 1134 | 74 % | 1.21 | 410.74 |
| Signals | signal:williams-r | 60 | 43 (72 %) | 1815 | 73 % | 1.46 | 1356.25 |
| Signals | signal:zscore | 60 | 40 (67 %) | 949 | 71 % | 1.11 | 212.77 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 53979 | 49023 | 3447 | 0.84 | 4.00 | 70.00–163.33 (median 163.33) | 6072 | 24574 | 919 | 7287 | 3330 | 102 | 2955 | 6 | 311 | 20 | 0 | 0 | 4956 |  |
| Short | 49611 | 45291 | 4580 | 1.36 | 2.11 | 163.33–163.33 (median 163.33) | 3023 | 5951 | 1930 | 9061 | 4779 | 2952 | 12235 | 59 | 708 | 13 | 0 | 0 | 4320 |  |
| General | 16191 | 14591 | 1013 | 1.41 | 2.33 | 163.33–163.33 (median 163.33) | 953 | 1626 | 575 | 3024 | 1504 | 1334 | 4292 | 0 | 235 | 35 | 0 | 0 | 1600 |  |
| Long | 21400 | 19400 | 1000 | 1.35 | 2.38 | 163.33–163.33 (median 163.33) | 1216 | 3011 | 844 | 4556 | 1900 | 2508 | 4117 | 0 | 214 | 34 | 0 | 0 | 2000 |  |
| Wide | 68953 | 56385 | 266 | 0.64 | 2.53 | 18.00–163.33 (median 163.33) | 11437 | 37643 | 895 | 3936 | 924 | 123 | 892 | 0 | 240 | 29 | 0 | 10408 | 2160 |  |
| Signals | 3780 | – | 3144 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 3144 units (pair × symbol × direction) active at the run start, 5642 over the run; 3609 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 17985 | 2629 (15 %) | 39104 | 70 % | 0.45 | -9792.53 |
| Micro | trailing | 35994 | 5446 (15 %) | 78284 | 57 % | 0.41 | -18723.67 |
| Short | normal | 16529 | 5662 (34 %) | 112786 | 59 % | 0.95 | -6706.04 |
| Short | trailing | 33082 | 11019 (33 %) | 240024 | 57 % | 0.85 | -39288.89 |
| General | normal | 9700 | 3078 (32 %) | 49153 | 42 % | 0.92 | -5871.22 |
| General | trailing | 6491 | 1929 (30 %) | 30113 | 54 % | 0.82 | -8004.89 |
| Long | normal | 12837 | 3811 (30 %) | 53272 | 43 % | 0.95 | -6166.70 |
| Long | trailing | 8563 | 2559 (30 %) | 31142 | 56 % | 0.84 | -10397.21 |
| Wide | axis | 58545 | 10078 (17 %) | 508568 | 30 % | 0.65 | -121333.42 |
| Wide | dca | 5204 | 1520 (29 %) | 44886 | 64 % | 0.77 | -13905.35 |
| Wide | dca-active | 5204 | 862 (17 %) | 26897 | 34 % | 0.60 | -9474.95 |
| Signals | normal | 1890 | 1253 (66 %) | 82759 | 70 % | 1.15 | 25770.97 |
| Signals | trailing | 1890 | 1710 (90 %) | 70605 | 82 % | 1.87 | 74099.10 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 3447 | 218 (6 %) | 7046 | 57 % | 0.28 | -3188.12 |
| Short | active | 195 | 74 (38 %) | 373 | 35 % | 0.23 | -629.98 |
| Short | bollinger | 270 | 24 (9 %) | 925 | 49 % | 0.60 | -506.24 |
| Short | break | 346 | 155 (45 %) | 3851 | 63 % | 1.03 | 121.18 |
| Short | channel | 60 | 12 (20 %) | 249 | 31 % | 0.35 | -255.51 |
| Short | direction | 269 | 144 (54 %) | 825 | 57 % | 0.88 | -111.31 |
| Short | ema | 229 | 68 (30 %) | 813 | 41 % | 0.59 | -555.78 |
| Short | ichimoku | 20 | 0 (0 %) | 256 | 37 % | 0.16 | -403.01 |
| Short | macd | 144 | 55 (38 %) | 340 | 59 % | 0.89 | -47.59 |
| Short | move | 492 | 202 (41 %) | 1747 | 57 % | 0.81 | -403.04 |
| Short | osc | 1113 | 546 (49 %) | 11655 | 61 % | 1.03 | 330.93 |
| Short | rsi | 352 | 11 (3 %) | 603 | 52 % | 0.70 | -189.08 |
| Short | smooth | 194 | 121 (62 %) | 336 | 59 % | 1.34 | 128.00 |
| Short | trend | 289 | 173 (60 %) | 2268 | 61 % | 1.00 | -11.74 |
| Short | volume | 607 | 101 (17 %) | 4008 | 58 % | 0.86 | -677.44 |
| General | active | 33 | 13 (39 %) | 73 | 34 % | 0.29 | -100.17 |
| General | bollinger | 67 | 0 (0 %) | 1 | 0 % | 0.00 | -2.60 |
| General | break | 83 | 29 (35 %) | 1001 | 45 % | 0.78 | -338.89 |
| General | channel | 24 | 0 (0 %) | 44 | 27 % | 0.33 | -73.26 |
| General | direction | 74 | 34 (46 %) | 171 | 56 % | 1.16 | 36.19 |
| General | ema | 43 | 5 (12 %) | 104 | 35 % | 0.57 | -86.76 |
| General | ichimoku | 1 | 1 (100 %) | 3 | 100 % | ∞ (no loss) | 12.60 |
| General | macd | 27 | 2 (7 %) | 15 | 67 % | 0.82 | -3.11 |
| General | move | 100 | 39 (39 %) | 130 | 52 % | 0.93 | -14.26 |
| General | osc | 184 | 103 (56 %) | 870 | 65 % | 1.88 | 697.52 |
| General | rsi | 96 | 1 (1 %) | 11 | 9 % | 0.12 | -29.13 |
| General | smooth | 67 | 46 (69 %) | 106 | 61 % | 1.55 | 63.47 |
| General | trend | 66 | 40 (61 %) | 478 | 56 % | 1.07 | 41.28 |
| General | volume | 148 | 25 (17 %) | 593 | 52 % | 0.92 | -75.81 |
| Long | active | 8 | 2 (25 %) | 11 | 27 % | 0.41 | -16.74 |
| Long | bollinger | 14 | 3 (21 %) | 14 | 36 % | 0.05 | -50.18 |
| Long | break | 59 | 2 (3 %) | 162 | 31 % | 0.32 | -348.67 |
| Long | channel | 17 | 0 (0 %) | 8 | 0 % | 0.00 | -38.43 |
| Long | direction | 101 | 55 (54 %) | 246 | 59 % | 1.48 | 193.41 |
| Long | ema | 23 | 1 (4 %) | 8 | 88 % | 2.34 | 7.77 |
| Long | macd | 98 | 5 (5 %) | 36 | 31 % | 0.60 | -27.10 |
| Long | move | 104 | 19 (18 %) | 83 | 31 % | 0.25 | -209.42 |
| Long | osc | 142 | 82 (58 %) | 416 | 73 % | 2.76 | 747.08 |
| Long | rsi | 85 | 11 (13 %) | 37 | 46 % | 1.08 | 5.19 |
| Long | smooth | 35 | 26 (74 %) | 42 | 74 % | 2.99 | 72.24 |
| Long | trend | 66 | 17 (26 %) | 364 | 40 % | 0.58 | -327.39 |
| Long | volume | 248 | 32 (13 %) | 528 | 55 % | 1.16 | 178.60 |
| Wide | active | 21 | 0 (0 %) | 6 | 0 % | 0.00 | -8.86 |
| Wide | bollinger | 12 | 3 (25 %) | 3 | 100 % | ∞ (no loss) | 3.71 |
| Wide | break | 36 | 9 (25 %) | 279 | 24 % | 0.24 | -165.90 |
| Wide | channel | 42 | 0 (0 %) | 627 | 29 % | 0.37 | -270.36 |
| Wide | direction | 12 | 0 (0 %) | 45 | 40 % | 0.66 | -10.18 |
| Wide | ema | 3 | 0 (0 %) | 42 | 50 % | 0.90 | -3.01 |
| Wide | macd | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | move | 50 | 10 (20 %) | 59 | 47 % | 0.77 | -8.03 |
| Wide | osc | 50 | 18 (36 %) | 612 | 37 % | 0.89 | -31.73 |
| Wide | rsi | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -25.27 |
| Wide | smooth | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.91 |
| Wide | trend | 3 | 3 (100 %) | 12 | 25 % | 1.44 | 2.38 |
| Wide | volume | 16 | 0 (0 %) | 14 | 36 % | 0.71 | -2.39 |
| Signals | signal:act-burst | 60 | 36 (60 %) | 1365 | 73 % | 1.06 | 168.40 |
| Signals | signal:act-hf | 60 | 18 (30 %) | 1650 | 66 % | 0.73 | -1073.98 |
| Signals | signal:adx | 60 | 40 (67 %) | 1041 | 73 % | 1.24 | 432.56 |
| Signals | signal:atr-break | 60 | 9 (15 %) | 1497 | 64 % | 0.68 | -1330.96 |
| Signals | signal:bollinger | 60 | 30 (50 %) | 1039 | 67 % | 0.95 | -128.26 |
| Signals | signal:cci | 60 | 17 (28 %) | 1448 | 67 % | 0.87 | -440.66 |
| Signals | signal:cmf | 60 | 8 (13 %) | 1324 | 60 % | 0.57 | -1704.51 |
| Signals | signal:donchian | 60 | 31 (52 %) | 1087 | 70 % | 0.96 | -94.16 |
| Signals | signal:ema-cross | 60 | 23 (38 %) | 633 | 64 % | 0.65 | -604.49 |
| Signals | signal:ema-cross-fast | 60 | 25 (42 %) | 1240 | 72 % | 1.07 | 184.20 |
| Signals | signal:ema-pullback | 60 | 14 (23 %) | 1459 | 65 % | 0.72 | -1006.65 |
| Signals | signal:ema-slope | 60 | 36 (60 %) | 907 | 73 % | 1.08 | 147.42 |
| Signals | signal:ema-trend | 60 | 22 (37 %) | 1417 | 65 % | 0.81 | -700.66 |
| Signals | signal:heikin-ashi | 60 | 35 (58 %) | 2343 | 71 % | 1.08 | 352.58 |
| Signals | signal:hma | 60 | 35 (58 %) | 1624 | 72 % | 1.07 | 203.81 |
| Signals | signal:ichimoku | 60 | 6 (10 %) | 683 | 63 % | 0.52 | -987.45 |
| Signals | signal:impulse | 60 | 25 (42 %) | 1527 | 69 % | 0.86 | -468.46 |
| Signals | signal:kama | 60 | 27 (45 %) | 2022 | 72 % | 1.04 | 170.78 |
| Signals | signal:keltner | 60 | 22 (37 %) | 785 | 68 % | 0.79 | -391.80 |
| Signals | signal:macd-cross | 60 | 24 (40 %) | 1714 | 70 % | 0.89 | -437.97 |
| Signals | signal:macd-hist | 60 | 27 (45 %) | 2146 | 71 % | 1.02 | 105.28 |
| Signals | signal:macd-slow | 60 | 24 (40 %) | 1713 | 68 % | 0.86 | -538.81 |
| Signals | signal:mfi | 30 | 30 (100 %) | 324 | 85 % | 3.17 | 641.22 |
| Signals | signal:obv | 60 | 55 (92 %) | 1954 | 79 % | 1.89 | 2051.41 |
| Signals | signal:r-awesome | 60 | 22 (37 %) | 1058 | 65 % | 0.78 | -558.01 |
| Signals | signal:r-connors | 59 | 10 (17 %) | 655 | 60 % | 0.59 | -745.42 |
| Signals | signal:r-fractal | 60 | 2 (3 %) | 752 | 53 % | 0.35 | -1869.71 |
| Signals | signal:r-inside | 41 | 3 (7 %) | 154 | 44 % | 0.20 | -520.99 |
| Signals | signal:r-linreg | 60 | 27 (45 %) | 1507 | 66 % | 0.77 | -840.09 |
| Signals | signal:r-nr-break | 60 | 14 (23 %) | 1424 | 63 % | 0.65 | -1254.78 |
| Signals | signal:r-session-trend | 60 | 18 (30 %) | 679 | 61 % | 0.64 | -729.61 |
| Signals | signal:r-vol-regime | 58 | 27 (47 %) | 356 | 72 % | 1.05 | 39.79 |
| Signals | signal:reclaim | 60 | 27 (45 %) | 1950 | 70 % | 1.02 | 82.14 |
| Signals | signal:rsi-mid | 60 | 23 (38 %) | 1561 | 68 % | 0.86 | -524.73 |
| Signals | signal:rsi-momentum | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 |
| Signals | signal:rsi-reversal | 60 | 37 (62 %) | 285 | 72 % | 1.04 | 25.91 |
| Signals | signal:s2-active-hf | 60 | 23 (38 %) | 2015 | 69 % | 0.89 | -515.30 |
| Signals | signal:s2-adx-gate | 60 | 19 (32 %) | 1297 | 67 % | 0.80 | -648.40 |
| Signals | signal:s2-atr-break | 60 | 10 (17 %) | 1107 | 59 % | 0.54 | -1524.56 |
| Signals | signal:s2-bb-bounce | 60 | 36 (60 %) | 1009 | 73 % | 1.36 | 597.34 |
| Signals | signal:s2-block-scale | 60 | 9 (15 %) | 1565 | 59 % | 0.53 | -2094.98 |
| Signals | signal:s2-block-stack | 60 | 5 (8 %) | 1367 | 59 % | 0.52 | -2150.45 |
| Signals | signal:s2-confluence | 60 | 35 (58 %) | 1781 | 72 % | 1.11 | 338.70 |
| Signals | signal:s2-ema-cross | 30 | 20 (67 %) | 162 | 74 % | 1.33 | 100.27 |
| Signals | signal:s2-range-break | 60 | 27 (45 %) | 326 | 55 % | 0.54 | -450.94 |
| Signals | signal:s2-range-shift | 60 | 3 (5 %) | 755 | 53 % | 0.35 | -1794.91 |
| Signals | signal:s2-rsi-revert | 60 | 45 (75 %) | 408 | 77 % | 1.76 | 407.94 |
| Signals | signal:s2-st-trail | 60 | 40 (67 %) | 436 | 75 % | 1.57 | 368.88 |
| Signals | signal:s2-stoch-swing | 60 | 52 (87 %) | 1448 | 78 % | 2.09 | 1833.73 |
| Signals | signal:s2-vol-break | 60 | 20 (33 %) | 563 | 64 % | 0.74 | -407.41 |
| Signals | signal:s2-vwap-axis | 12 | 9 (75 %) | 25 | 80 % | 1.77 | 18.99 |
| Signals | signal:sar | 60 | 12 (20 %) | 1906 | 67 % | 0.75 | -1242.74 |
| Signals | signal:squeeze | 60 | 28 (47 %) | 302 | 68 % | 0.87 | -105.74 |
| Signals | signal:st-slow | 60 | 34 (57 %) | 463 | 71 % | 1.24 | 217.20 |
| Signals | signal:stoch-rsi | 60 | 40 (67 %) | 2116 | 72 % | 1.18 | 674.58 |
| Signals | signal:supertrend | 60 | 34 (57 %) | 932 | 74 % | 1.10 | 180.55 |
| Signals | signal:swing | 60 | 21 (35 %) | 1719 | 66 % | 0.75 | -1035.18 |
| Signals | signal:thrust | 60 | 28 (47 %) | 1551 | 70 % | 0.89 | -337.23 |
| Signals | signal:trix | 60 | 12 (20 %) | 554 | 64 % | 0.58 | -663.79 |
| Signals | signal:volume-break | 56 | 38 (68 %) | 229 | 75 % | 1.20 | 77.83 |
| Signals | signal:vwap | 60 | 35 (58 %) | 1134 | 74 % | 1.21 | 410.74 |
| Signals | signal:williams-r | 60 | 43 (72 %) | 1815 | 73 % | 1.46 | 1356.25 |
| Signals | signal:zscore | 60 | 40 (67 %) | 949 | 71 % | 1.11 | 212.77 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 21 | 0 (0 %) | 307 | 76 % | 0.57 | -51.79 |
| Micro | 1.25 | 20 | 0 (0 %) | 292 | 76 % | 0.58 | -47.74 |
| Micro | 1.35 | 19 | 0 (0 %) | 277 | 75 % | 0.59 | -43.95 |
| Micro | 1.5 | 12 | 0 (0 %) | 176 | 74 % | 0.61 | -27.84 |
| Micro | 1.75 | 8 | 0 (0 %) | 116 | 74 % | 0.62 | -17.52 |
| Micro | 2 | 1 | 0 (0 %) | 15 | 73 % | 0.56 | -2.77 |
| Short | 1.1 | 2117 | 1015 (48 %) | 25034 | 59 % | 0.93 | -1899.28 |
| Short | 1.25 | 1988 | 963 (48 %) | 22854 | 59 % | 0.94 | -1548.87 |
| Short | 1.35 | 1843 | 907 (49 %) | 20747 | 59 % | 0.94 | -1366.61 |
| Short | 1.5 | 1560 | 792 (51 %) | 16755 | 59 % | 0.97 | -592.48 |
| Short | 1.75 | 1053 | 553 (53 %) | 10536 | 59 % | 0.98 | -172.16 |
| Short | 2 | 609 | 317 (52 %) | 5951 | 59 % | 0.96 | -218.63 |
| General | 1.1 | 330 | 183 (55 %) | 2984 | 54 % | 1.07 | 266.31 |
| General | 1.25 | 314 | 175 (56 %) | 2752 | 54 % | 1.07 | 276.08 |
| General | 1.35 | 295 | 166 (56 %) | 2567 | 54 % | 1.09 | 297.85 |
| General | 1.5 | 248 | 143 (58 %) | 1994 | 55 % | 1.15 | 370.99 |
| General | 1.75 | 144 | 97 (67 %) | 1056 | 58 % | 1.32 | 377.31 |
| General | 2 | 77 | 53 (69 %) | 527 | 61 % | 1.59 | 310.37 |
| Long | 1.1 | 223 | 134 (60 %) | 1456 | 58 % | 1.25 | 668.06 |
| Long | 1.25 | 216 | 132 (61 %) | 1372 | 58 % | 1.27 | 679.36 |
| Long | 1.35 | 204 | 124 (61 %) | 1224 | 58 % | 1.29 | 632.00 |
| Long | 1.5 | 174 | 99 (57 %) | 980 | 57 % | 1.20 | 361.36 |
| Long | 1.75 | 102 | 59 (58 %) | 509 | 64 % | 1.34 | 306.50 |
| Long | 2 | 53 | 33 (62 %) | 294 | 65 % | 1.32 | 167.82 |
| Wide | 1.1 | 33 | 12 (36 %) | 692 | 40 % | 0.90 | -34.25 |
| Wide | 1.25 | 30 | 12 (40 %) | 386 | 43 % | 0.90 | -19.38 |
| Wide | 1.35 | 25 | 12 (48 %) | 140 | 49 % | 0.91 | -6.46 |
| Wide | 1.5 | 19 | 6 (32 %) | 107 | 44 % | 0.72 | -16.09 |
| Wide | 1.75 | 9 | 6 (67 %) | 33 | 55 % | 1.11 | 1.43 |
| Wide | 2 | 9 | 6 (67 %) | 33 | 55 % | 1.11 | 1.43 |
| Signals | 1.1 | 660 | 279 (42 %) | 11408 | 69 % | 0.82 | -4780.12 |
| Signals | 1.25 | 370 | 167 (45 %) | 6247 | 71 % | 0.86 | -1915.54 |
| Signals | 1.35 | 257 | 117 (46 %) | 4370 | 71 % | 0.84 | -1529.36 |
| Signals | 1.5 | 133 | 66 (50 %) | 2345 | 72 % | 0.87 | -646.71 |
| Signals | 1.75 | 58 | 33 (57 %) | 1162 | 74 % | 0.95 | -111.25 |
| Signals | 2 | 32 | 19 (59 %) | 634 | 76 % | 0.99 | -10.06 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | pulse | mc-lag-6@m5 | 22 | 22 (100 %) | 110 | 100 % | ∞ (no loss) | 41.50 | tp0.6 sl2.1 tr0 h192 mc (5 · ∞ (no loss) · 2.00) |
| Micro | clamp | mc-bbx-25@m15c | 74 | 74 (100 %) | 74 | 100 % | ∞ (no loss) | 25.70 | – |
| Micro | magnet | mc-lag-12@m5 | 4 | 4 (100 %) | 32 | 100 % | ∞ (no loss) | 11.75 | tp0.55 sl2.75 tr0.4125 h192 mc (8 · ∞ (no loss) · 3.08) |
| Micro | ribbon | mc-trsi2-10@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 5.20 | – |
| Micro | ribbon | mc-lag-12@m15 | 2 | 2 (100 %) | 18 | 78 % | 5.01 | 2.80 | tp0.45 sl2.25 tr0.3375 h64 mc (9 · 5.01 · 1.40) |
| Micro | pivot | mc-tmom-5@m5 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 0.80 | – |
| Micro | clamp | mc-rsit4-15@m15c | 4 | 2 (50 %) | 8 | 50 % | 0.25 | -5.17 | – |
| Micro | sweep | mc-z-20@m5c | 3 | 0 (0 %) | 18 | 61 % | 0.24 | -13.65 | tp0.6 sl2.4 tr0 h288 mc (6 · 0.31 · -3.60) |
| Micro | magnet | mc-rsi2-10@m5 | 21 | 0 (0 %) | 307 | 76 % | 0.57 | -51.79 | tp0.5 sl2.125 tr0.375 h192 mc (14 · 0.75 · -1.19) |
| Micro | sandwich | mc-rsrev-3@m15c | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -53.45 | – |
| Micro | pulse | mc-rsrev-3@m15c | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -53.45 | – |
| Micro | clamp | mc-lag-12@m15 | 112 | 38 (34 %) | 336 | 75 % | 0.46 | -82.98 | – |
| Micro | snap | mc-rsi2-5@m5 | 108 | 6 (6 %) | 432 | 63 % | 0.27 | -187.65 | – |
| Micro | pulse | mc-rsi2-5@m5 | 110 | 0 (0 %) | 330 | 51 % | 0.17 | -224.05 | – |
| Micro | sandwich | mc-rsit5-20@m15 | 106 | 0 (0 %) | 106 | 0 % | 0.00 | -227.89 | – |
| Micro | pulse | mc-rsit5-20@m15 | 106 | 0 (0 %) | 106 | 0 % | 0.00 | -227.89 | – |
| Micro | sweep | mc-rsi4-10@m5 | 70 | 0 (0 %) | 490 | 45 % | 0.15 | -430.20 | tp0.45 sl2.025 tr0.3375 h192 mc (7 · 0.16 · -4.02) |
| Micro | sandwich | mc-rsit7-25@m15 | 224 | 0 (0 %) | 224 | 0 % | 0.00 | -445.07 | – |
| Micro | pulse | mc-rsit7-25@m15 | 224 | 0 (0 %) | 224 | 0 % | 0.00 | -445.07 | – |
| Micro | revert | mc-tpull-13@m5c | 594 | 42 (7 %) | 4152 | 63 % | 0.50 | -825.47 | tp0.6 sl3 tr0 h192 mc (6 · ∞ (no loss) · 2.40) |
| Short | pivot | willr-50-95@m15 | 76 | 75 (99 %) | 747 | 78 % | 4.97 | 808.86 | tp2.4 sl3.6 tr0 h64 sh (9 · ∞ (no loss) · 19.80) |
| Short | revert | break-retest@m15c | 15 | 15 (100 %) | 313 | 82 % | 4.36 | 387.28 | tp2.2 sl4.4 tr0 h96 sh (22 · 4.35 · 30.80) |
| Short | sweep | willr-21-95@m15 | 36 | 36 (100 %) | 346 | 77 % | 2.67 | 347.70 | tp2.6 sl3.9 tr0 h64 sh (9 · 4.68 · 15.10) |
| Short | ribbon | hma-55@m15c | 91 | 91 (100 %) | 91 | 100 % | ∞ (no loss) | 331.43 | – |
| Short | sweep | willr-14-95@m15 | 26 | 26 (100 %) | 233 | 81 % | 3.05 | 267.86 | tp2.6 sl3.9 tr0 h64 sh (9 · 4.68 · 15.10) |
| Short | revert | r-chop@m30 | 54 | 47 (87 %) | 1043 | 63 % | 1.30 | 265.81 | tp2.8 sl5.6 tr0 h48 sh (12 · ∞ (no loss) · 31.20) |
| Short | magnet | willr-21-90@m15c | 34 | 34 (100 %) | 177 | 87 % | 7.29 | 257.45 | tp2.8 sl4.2 tr0 h96 sh (5 · ∞ (no loss) · 13.00) |
| Short | ribbon | trend-st@m15c | 59 | 59 (100 %) | 152 | 80 % | 8.26 | 255.51 | – |
| Short | magnet | r-pin-m@m15 | 106 | 106 (100 %) | 106 | 100 % | ∞ (no loss) | 223.60 | – |
| Short | sweep | willr-14-95@m30 | 47 | 43 (91 %) | 227 | 76 % | 3.29 | 153.58 | tp2 sl4 tr0 h32 sh (5 · ∞ (no loss) · 9.00) |
| Short | ribbon | trend-st-14-4@m15 | 34 | 32 (94 %) | 406 | 67 % | 1.32 | 152.97 | tp2.4 sl3.6 tr1.8 h64 sh (11 · 1.96 · 10.97) |
| Short | revert | break-vol-2@m30 | 20 | 20 (100 %) | 292 | 65 % | 1.50 | 130.75 | tp2.2 sl4.4 tr0 h48 sh (14 · 2.61 · 14.80) |
| Short | ribbon | trend-st-14-4@m15c | 13 | 13 (100 %) | 103 | 73 % | 2.57 | 118.86 | tp2.6 sl3.9 tr1.95 h64 sh (7 · 4.39 · 13.94) |
| Short | pivot | dir-thrust-4@m30 | 50 | 50 (100 %) | 50 | 100 % | ∞ (no loss) | 118.73 | – |
| Short | ribbon | willr-28-95@m15c | 21 | 21 (100 %) | 136 | 79 % | 6.25 | 115.69 | tp1.8 sl2.7 tr0 h96 sh (8 · ∞ (no loss) · 12.80) |
| Short | sweep | r-sweep@m15 | 18 | 18 (100 %) | 107 | 85 % | 57.40 | 114.70 | tp2.6 sl5.2 tr0 h96 sh (6 · ∞ (no loss) · 14.40) |
| Short | follow | r-ultimate@m15 | 24 | 20 (83 %) | 917 | 63 % | 1.13 | 112.97 | tp2.2 sl4.4 tr1.1 h96 sh (35 · 1.75 · 17.61) |
| Short | pivot | willr-28-95@m15c | 24 | 22 (92 %) | 122 | 70 % | 10.33 | 96.48 | tp1.8 sl2.7 tr0 h64 sh (6 · ∞ (no loss) · 9.60) |
| Short | follow | mfi-14-20@m15 | 8 | 6 (75 %) | 238 | 68 % | 1.37 | 93.99 | tp2.6 sl5.2 tr0 h64 sh (27 · 1.80 · 22.37) |
| Short | sweep | r-td@m30 | 90 | 58 (64 %) | 517 | 65 % | 1.18 | 89.61 | tp2.8 sl5.6 tr1.4 h32 sh (6 · 38.31 · 7.46) |
| Short | ribbon | willr-14-90@m15 | 8 | 8 (100 %) | 182 | 74 % | 1.50 | 78.48 | tp2 sl4 tr1.5 h64 sh (21 · 1.78 · 13.15) |
| Short | ribbon | trend-ribbon@m15c | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 77.64 | – |
| Short | pivot | cci-40-200@x4@m15 | 32 | 24 (75 %) | 256 | 65 % | 1.33 | 69.68 | tp2.2 sl4.4 tr1.1 h96 sh (7 · ∞ (no loss) · 10.95) |
| Short | pivot | willr-28-95@m15 | 19 | 15 (79 %) | 98 | 68 % | 3.79 | 66.88 | tp1.8 sl2.7 tr0 h64 sh (6 · ∞ (no loss) · 9.60) |
| Short | sweep | act-hf-5@m15c | 74 | 68 (92 %) | 74 | 92 % | 158.76 | 66.43 | – |
| Short | ribbon | macd-cross-19-39-9@m30 | 19 | 19 (100 %) | 112 | 81 % | 1.73 | 60.14 | tp2.2 sl4.4 tr0 h32 sh (6 · 2.17 · 5.40) |
| Short | ribbon | willr-14-90@m15c | 10 | 7 (70 %) | 198 | 72 % | 1.33 | 56.59 | tp2 sl4 tr0 h64 sh (16 · 1.86 · 10.80) |
| Short | clamp | willr-50-80@m15c | 4 | 4 (100 %) | 120 | 72 % | 1.52 | 55.70 | tp2.2 sl3.3 tr1.1 h96 sh (30 · 1.85 · 20.83) |
| Short | ribbon | r-ultimate@m30 | 17 | 14 (82 %) | 115 | 66 % | 1.56 | 47.62 | tp2.6 sl5.2 tr1.3 h32 sh (7 · 25.97 · 6.59) |
| Short | ribbon | trend-st-21-3@m15c | 50 | 39 (78 %) | 137 | 69 % | 1.81 | 46.81 | – |
| Short | pivot | z-50-2.5@x4@m15 | 8 | 7 (88 %) | 41 | 66 % | 4.51 | 46.40 | tp2.4 sl4.8 tr1.2 h64 sh (6 · 3.24 · 6.73) |
| Short | ribbon | r-ultimate@m15c | 9 | 9 (100 %) | 28 | 96 % | 21.01 | 44.02 | – |
| Short | ribbon | dir-thrust@m30 | 11 | 9 (82 %) | 149 | 65 % | 1.28 | 38.78 | tp2.6 sl5.2 tr1.3 h48 sh (12 · 3.07 · 11.27) |
| Short | sweep | willr-50-95@m15 | 6 | 6 (100 %) | 71 | 80 % | 2.27 | 37.97 | tp2.8 sl5.6 tr1.4 h64 sh (12 · 3.50 · 11.48) |
| Short | sweep | r-ultimate@m15 | 9 | 9 (100 %) | 86 | 69 % | 1.49 | 37.70 | tp2.4 sl4.8 tr0 h96 sh (8 · 3.08 · 10.40) |
| Short | revert | break-vol-2@m15c | 8 | 8 (100 %) | 117 | 62 % | 1.36 | 35.21 | tp2.4 sl2.4 tr0 h96 sh (14 · 2.12 · 11.60) |
| Short | pivot | mfi-14-20@m15c | 22 | 12 (55 %) | 77 | 74 % | 1.81 | 34.97 | – |
| Short | follow | break-squeeze-120@m15c | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 31.20 | – |
| Short | pulse | ema-slope@m15c | 77 | 59 (77 %) | 147 | 62 % | 1.36 | 30.72 | – |
| Short | magnet | macd-cross@m15 | 40 | 28 (70 %) | 38 | 74 % | 13.29 | 29.82 | – |
| Short | ribbon | willr-21-90@m15 | 2 | 2 (100 %) | 53 | 77 % | 1.67 | 28.69 | tp2 sl4 tr0 h96 sh (25 · 1.71 · 15.00) |
| Short | ribbon | willr-7-90@m30 | 9 | 6 (67 %) | 46 | 85 % | 1.84 | 26.91 | tp2 sl4 tr1.5 h48 sh (6 · 142.87 · 8.51) |
| Short | sweep | willr-21-95@m30 | 4 | 4 (100 %) | 29 | 93 % | 6.86 | 25.63 | tp2.8 sl5.6 tr1.4 h32 sh (7 · ∞ (no loss) · 9.57) |
| Short | pivot | willr-50-80@m15c | 3 | 3 (100 %) | 145 | 67 % | 1.17 | 25.50 | tp2.2 sl3.3 tr1.1 h96 sh (50 · 1.23 · 10.59) |
| Short | sandwich | dir-vwap-120@m15 | 41 | 32 (78 %) | 76 | 62 % | 1.56 | 24.80 | – |
| Short | magnet | r-bb-adx@m15 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 23.31 | – |
| Short | pivot | rsi-21-30-70@m15 | 3 | 3 (100 %) | 65 | 62 % | 1.62 | 21.80 | tp2 sl2 tr1 h64 sh (22 · 1.84 · 7.80) |
| Short | ribbon | ema-slope-20-10@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 20.90 | – |
| Short | sweep | willr-28-95@m15 | 2 | 2 (100 %) | 19 | 74 % | 2.56 | 20.70 | tp2.6 sl3.9 tr0 h96 sh (9 · 4.68 · 15.10) |
| Short | revert | break-vol-2@x4@m15 | 2 | 2 (100 %) | 12 | 83 % | 4.31 | 19.97 | tp2.8 sl5.6 tr0 h96 sh (5 · ∞ (no loss) · 13.00) |
| Short | follow | r-fisher-m@m15c | 12 | 8 (67 %) | 30 | 67 % | 1.80 | 19.67 | – |
| Short | ribbon | willr-50-95@m15 | 5 | 2 (40 %) | 73 | 64 % | 1.48 | 18.10 | tp1.8 sl3.6 tr0 h64 sh (13 · ∞ (no loss) · 20.80) |
| Short | revert | r-chop-m@m30 | 12 | 9 (75 %) | 80 | 65 % | 1.28 | 17.13 | tp1.8 sl2.7 tr0.9 h32 sh (7 · 2.30 · 3.82) |
| Short | magnet | willr-50-80@m15c | 10 | 2 (20 %) | 143 | 59 % | 1.09 | 15.84 | tp2.6 sl5.2 tr1.95 h96 sh (12 · 4.56 · 19.68) |
| Short | ribbon | willr-28-95@m15 | 5 | 4 (80 %) | 39 | 74 % | 2.52 | 15.80 | tp2 sl3 tr1.5 h64 sh (9 · 186.06 · 6.80) |
| Short | sweep | mfi-14-10@m15 | 33 | 16 (48 %) | 124 | 56 % | 1.22 | 15.68 | – |
| Short | clamp | r-cvd-div-m@m15c | 12 | 8 (67 %) | 50 | 68 % | 1.78 | 15.07 | tp2.2 sl2.2 tr1.1 h64 sh (5 · 0.92 · -0.39) |
| Short | magnet | willr-28-90@m15c | 6 | 6 (100 %) | 40 | 65 % | 1.45 | 14.91 | tp1.8 sl3.6 tr1.35 h64 sh (6 · 2.73 · 6.56) |
| Short | ribbon | macd-zero@m15 | 4 | 4 (100 %) | 24 | 50 % | 1.54 | 14.61 | tp1.8 sl2.7 tr0.9 h64 sh (6 · 1.77 · 4.55) |
| Short | ribbon | dir-emax-12-26@m15 | 4 | 4 (100 %) | 24 | 50 % | 1.54 | 14.61 | tp1.8 sl2.7 tr0.9 h64 sh (6 · 1.77 · 4.55) |
| Short | ribbon | willr-14-90@m30 | 1 | 1 (100 %) | 13 | 85 % | 2.42 | 14.20 | tp2.4 sl4.8 tr0 h48 sh (13 · 2.42 · 14.20) |
| Short | clamp | willr-14-90@m15c | 4 | 4 (100 %) | 36 | 78 % | 1.36 | 11.98 | tp2 sl4 tr0 h64 sh (9 · 1.50 · 4.20) |
| Short | pivot | bb-bounce-50-2@m15c | 2 | 2 (100 %) | 68 | 59 % | 1.19 | 11.41 | tp2 sl2 tr0 h64 sh (34 · 1.21 · 6.21) |
| Short | pivot | z-50-2@m15c | 2 | 2 (100 %) | 68 | 59 % | 1.19 | 11.41 | tp2 sl2 tr0 h64 sh (34 · 1.21 · 6.21) |
| Short | pulse | hma-55@m15c | 45 | 30 (67 %) | 83 | 57 % | 1.18 | 11.02 | – |
| Short | pivot | r-session-trend-m@m30 | 77 | 45 (58 %) | 77 | 58 % | 1.13 | 10.40 | – |
| Short | pivot | move-impulse-20-2.5@m15c | 3 | 2 (67 %) | 38 | 68 % | 1.15 | 9.43 | tp2.8 sl4.2 tr2.1 h96 sh (12 · 1.29 · 5.02) |
| Short | sweep | willr-21-95@m15c | 2 | 2 (100 %) | 7 | 100 % | ∞ (no loss) | 9.28 | – |
| Short | pivot | bb-bounce@m15c | 4 | 4 (100 %) | 90 | 56 % | 1.10 | 9.17 | tp1.8 sl2.7 tr1.35 h64 sh (23 · 1.18 · 3.66) |
| Short | pivot | z-20-2@m15c | 4 | 4 (100 %) | 90 | 56 % | 1.10 | 9.17 | tp1.8 sl2.7 tr1.35 h64 sh (23 · 1.18 · 3.66) |
| Short | pivot | willr-50-90@m30 | 4 | 4 (100 %) | 16 | 75 % | 1.34 | 7.60 | – |
| Short | revert | r-stc@m15c | 2 | 2 (100 %) | 15 | 67 % | 1.85 | 7.40 | tp2 sl3 tr1 h64 sh (8 · 2.47 · 4.93) |
| Short | ribbon | macd-hist-19-39-9@m30 | 1 | 1 (100 %) | 10 | 80 % | 1.71 | 6.00 | tp2 sl4 tr0 h48 sh (10 · 1.71 · 6.00) |
| Short | clamp | willr-21-90@m15c | 1 | 1 (100 %) | 10 | 80 % | 1.68 | 5.20 | tp1.8 sl3.6 tr0 h64 sh (10 · 1.68 · 5.20) |
| Short | clamp | z-50-2.5@m15c | 19 | 10 (53 %) | 130 | 62 % | 1.04 | 4.55 | tp2.8 sl5.6 tr1.4 h96 sh (5 · 44.22 · 5.95) |
| Short | pivot | r-pin@m15 | 8 | 4 (50 %) | 24 | 67 % | 1.12 | 3.88 | – |
| Short | sweep | macd-cross-19-39-9@m15 | 1 | 1 (100 %) | 11 | 73 % | 1.20 | 3.40 | tp2.8 sl5.6 tr0 h96 sh (11 · 1.20 · 3.40) |
| Short | sweep | r-valuearea@m30 | 10 | 5 (50 %) | 8 | 63 % | 6.91 | 3.19 | – |
| Short | revert | r-bos@m15c | 11 | 7 (64 %) | 22 | 50 % | 3.42 | 2.96 | – |
| Short | revert | r-pdhl@m15c | 1 | 1 (100 %) | 12 | 58 % | 1.33 | 2.21 | tp2.4 sl4.8 tr1.2 h64 sh (12 · 1.33 · 2.21) |
| Short | sweep | break-squeeze-t10@m30 | 2 | 2 (100 %) | 6 | 67 % | 1.66 | 2.19 | – |
| Short | ribbon | dir-emax-20-50@m15 | 1 | 1 (100 %) | 22 | 64 % | 1.03 | 1.20 | tp2.8 sl4.2 tr0 h64 sh (22 · 1.03 · 1.20) |
| Short | ribbon | ema-slope-100@m15c | 3 | 1 (33 %) | 53 | 58 % | 1.02 | 1.10 | tp2.8 sl2.8 tr0 h64 sh (15 · 1.30 · 5.40) |
| Short | follow | r-rsi2-m@m15c | 4 | 2 (50 %) | 13 | 62 % | 1.03 | 0.50 | – |
| Short | sandwich | act-burst@m15 | 3 | 2 (67 %) | 6 | 83 % | 0.95 | -0.12 | – |
| Short | pulse | act-burst@m15 | 3 | 2 (67 %) | 6 | 83 % | 0.95 | -0.12 | – |
| Short | ribbon | squeeze-20@m15 | 28 | 12 (43 %) | 20 | 60 % | 0.98 | -0.21 | – |
| Short | pivot | rsi-extreme@m15c | 9 | 3 (33 %) | 282 | 58 % | 1.00 | -0.26 | tp2.2 sl3.3 tr1.1 h96 sh (26 · 1.43 · 9.10) |
| Short | sweep | r-bb-adx@m15c | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -0.66 | – |
| Short | clamp | willr-50-95@m15 | 2 | 0 (0 %) | 16 | 50 % | 0.87 | -0.85 | tp2 sl3 tr1 h64 sh (8 · 0.87 · -0.43) |
| Short | ribbon | willr-7-90@m15c | 1 | 0 (0 %) | 8 | 75 % | 0.84 | -1.32 | tp2 sl4 tr1.5 h96 sh (8 · 0.84 · -1.32) |
| Short | ribbon | break-squeeze-30@m15 | 4 | 0 (0 %) | 12 | 67 % | 0.46 | -2.01 | – |
| Short | pivot | willr-28-90@m30 | 8 | 2 (25 %) | 32 | 66 % | 0.94 | -2.60 | tp2 sl3 tr0 h32 sh (5 · 0.84 · -1.00) |
| Short | ribbon | macd-zero@m15c | 2 | 0 (0 %) | 10 | 40 % | 0.82 | -2.85 | tp1.8 sl3.6 tr0.9 h64 sh (5 · 0.82 · -1.42) |
| Short | ribbon | dir-emax-12-26@m15c | 2 | 0 (0 %) | 10 | 40 % | 0.82 | -2.85 | tp1.8 sl3.6 tr0.9 h64 sh (5 · 0.82 · -1.42) |
| Short | ribbon | dir-macd@m15 | 4 | 1 (25 %) | 103 | 61 % | 0.95 | -4.35 | tp1.8 sl3.6 tr0 h96 sh (25 · 1.33 · 7.60) |
| Short | magnet | r-klinger-m@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.56 | -5.60 | – |
| Short | pivot | r-zdist@m15c | 10 | 6 (60 %) | 226 | 54 % | 0.97 | -6.05 | tp2 sl4 tr1 h64 sh (21 · 1.14 · 2.37) |
| Short | sweep | willr-14-90@m15c | 1 | 0 (0 %) | 12 | 50 % | 0.65 | -6.26 | tp2.8 sl2.8 tr2.1 h96 sh (12 · 0.65 · -6.26) |
| Short | pivot | willr-21-90@m15 | 2 | 0 (0 %) | 44 | 59 % | 0.86 | -6.31 | tp1.8 sl3.6 tr1.35 h64 sh (22 · 0.86 · -3.16) |
| Short | revert | r-spring@m15 | 3 | 0 (0 %) | 9 | 44 % | 0.34 | -6.64 | – |
| Short | revert | r-bos@m30 | 2 | 1 (50 %) | 48 | 63 % | 0.86 | -6.69 | tp2 sl3 tr0 h48 sh (23 · 1.05 · 1.40) |
| Short | sweep | rsi-fast@m15 | 1 | 0 (0 %) | 8 | 50 % | 0.40 | -6.77 | tp2.6 sl2.6 tr1.3 h96 sh (8 · 0.40 · -6.77) |
| Short | pivot | bb-bounce-50-2@m15 | 2 | 0 (0 %) | 102 | 53 % | 0.93 | -7.39 | tp2 sl2 tr0 h64 sh (51 · 0.94 · -3.19) |
| Short | pivot | z-50-2@m15 | 2 | 0 (0 %) | 102 | 53 % | 0.93 | -7.39 | tp2 sl2 tr0 h64 sh (51 · 0.94 · -3.19) |
| Short | sweep | willr-28-95@m30 | 12 | 4 (33 %) | 105 | 70 % | 0.91 | -7.41 | tp2.2 sl4.4 tr1.65 h32 sh (9 · 2.50 · 7.01) |
| Short | magnet | break-fail@m15c | 13 | 3 (23 %) | 89 | 65 % | 0.91 | -7.79 | tp1.8 sl3.6 tr0.9 h64 sh (7 · 1.39 · 1.53) |
| Short | clamp | rsi-21-30-70@m15c | 3 | 0 (0 %) | 18 | 67 % | 0.41 | -8.04 | tp2 sl2 tr1 h64 sh (6 · 0.45 · -2.41) |
| Short | magnet | willr-50-90@m15 | 12 | 4 (33 %) | 90 | 51 % | 0.89 | -9.38 | tp1.8 sl3.6 tr1.35 h64 sh (7 · 1.36 · 2.76) |
| Short | sweep | r-laguerre-m@m30 | 3 | 0 (0 %) | 12 | 50 % | 0.43 | -9.82 | – |
| Short | revert | r-fractal-m@m30 | 7 | 3 (43 %) | 282 | 64 % | 0.97 | -10.16 | tp2.4 sl4.8 tr0 h32 sh (38 · 1.16 · 8.08) |
| Short | ribbon | hma-55@m30 | 5 | 0 (0 %) | 10 | 50 % | 0.51 | -10.50 | – |
| Short | clamp | rsi-21-30-70@m15 | 2 | 0 (0 %) | 26 | 46 % | 0.61 | -11.66 | tp2 sl2 tr1.5 h64 sh (13 · 0.63 · -5.33) |
| Short | ribbon | macd-hist-19-39-9@m15 | 4 | 0 (0 %) | 47 | 49 % | 0.81 | -12.20 | tp2.6 sl2.6 tr0 h64 sh (12 · 0.86 · -2.40) |
| Short | clamp | ema-stoch@m15 | 1 | 0 (0 %) | 14 | 50 % | 0.59 | -12.60 | tp2.8 sl4.2 tr0 h64 sh (14 · 0.59 · -12.60) |
| Short | pivot | break-squeeze-t10@m15 | 3 | 1 (33 %) | 12 | 33 % | 0.25 | -14.15 | – |
| Short | ribbon | dir-emax-20-50@m15c | 2 | 0 (0 %) | 41 | 61 % | 0.79 | -14.20 | tp2.8 sl4.2 tr0 h64 sh (20 · 0.89 · -4.00) |
| Short | pivot | cci-20-200@m15c | 16 | 9 (56 %) | 296 | 49 % | 0.95 | -14.80 | tp1.8 sl1.8 tr0.9 h64 sh (19 · 1.34 · 4.33) |
| Short | revert | break-don20@m30 | 1 | 0 (0 %) | 40 | 57 % | 0.80 | -15.00 | tp2.8 sl4.2 tr0 h48 sh (40 · 0.80 · -15.00) |
| Short | revert | break-vol-1.3@m15c | 1 | 0 (0 %) | 22 | 41 % | 0.60 | -15.60 | tp2.8 sl2.8 tr0 h96 sh (22 · 0.60 · -15.60) |
| Short | sweep | willr-21-90@m15 | 1 | 0 (0 %) | 26 | 46 % | 0.60 | -15.62 | tp2.8 sl2.8 tr2.1 h96 sh (26 · 0.60 · -15.62) |
| Short | revert | break-vol@m15c | 1 | 0 (0 %) | 18 | 44 % | 0.45 | -16.57 | tp2.8 sl2.8 tr2.1 h96 sh (18 · 0.45 · -16.57) |
| Short | clamp | rsi-extreme@m15c | 2 | 0 (0 %) | 42 | 48 % | 0.52 | -17.31 | tp2 sl2 tr1 h64 sh (21 · 0.52 · -8.66) |
| Short | pivot | rsi-extreme@m15 | 2 | 0 (0 %) | 84 | 52 % | 0.77 | -17.39 | tp2 sl2 tr1 h64 sh (43 · 0.80 · -6.68) |
| Short | pivot | bb-mid@m15 | 5 | 0 (0 %) | 20 | 55 % | 0.32 | -17.40 | – |
| Short | clamp | mfi-14-20@m15 | 6 | 1 (17 %) | 76 | 47 % | 0.78 | -18.45 | tp1.8 sl3.6 tr1.35 h64 sh (12 · 1.59 · 5.28) |
| Short | ribbon | dir-vwap@m15c | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -18.60 | – |
| Short | sweep | squeeze-30@m15 | 12 | 0 (0 %) | 23 | 9 % | 0.01 | -20.05 | – |
| Short | magnet | cci-40-100@m15c | 6 | 0 (0 %) | 164 | 54 % | 0.88 | -20.48 | tp1.8 sl2.7 tr0.9 h64 sh (29 · 0.99 · -0.18) |
| Short | revert | r-donch-vol-m@m15 | 1 | 0 (0 %) | 16 | 25 % | 0.28 | -22.40 | tp2.4 sl2.4 tr0 h64 sh (16 · 0.28 · -22.40) |
| Short | sweep | r-inside-m@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.22 | -24.00 | – |
| Short | sweep | r-bb-adx@m15 | 12 | 3 (25 %) | 19 | 53 % | 0.16 | -24.41 | – |
| Short | revert | r-klinger-m@m15c | 52 | 21 (40 %) | 262 | 50 % | 0.92 | -26.95 | tp2.4 sl4.8 tr1.8 h64 sh (5 · 2.79 · 9.34) |
| Short | ribbon | r-camarilla-m@m15 | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -27.20 | – |
| Short | revert | r-fractal@m30 | 4 | 0 (0 %) | 191 | 64 % | 0.89 | -27.92 | tp2 sl4 tr0 h48 sh (45 · 0.95 · -3.00) |
| Short | ribbon | r-ultimate@m15 | 22 | 4 (18 %) | 550 | 57 % | 0.94 | -31.30 | tp1.8 sl1.8 tr1.35 h64 sh (25 · 1.29 · 5.21) |
| Short | pivot | r-cvd-div@m15 | 11 | 1 (9 %) | 290 | 62 % | 0.89 | -32.86 | tp2 sl3 tr0 h64 sh (27 · 1.13 · 3.60) |
| Short | magnet | willr-50-90@m15c | 27 | 6 (22 %) | 157 | 48 % | 0.78 | -33.24 | tp2.2 sl2.2 tr0 h64 sh (6 · 1.67 · 3.20) |
| Short | sweep | r-pin@m15 | 6 | 1 (17 %) | 42 | 48 % | 0.22 | -33.92 | tp2.2 sl4.4 tr1.1 h64 sh (5 · 24.44 · 1.26) |
| Short | clamp | cci-20-200@m15c | 28 | 9 (32 %) | 323 | 60 % | 0.90 | -36.02 | tp2.2 sl4.4 tr1.1 h96 sh (11 · 1.49 · 4.49) |
| Short | follow | r-nr-break-m@m15c | 13 | 3 (23 %) | 299 | 64 % | 0.90 | -38.53 | tp2.2 sl4.4 tr0 h96 sh (23 · 1.23 · 6.40) |
| Short | follow | willr-50-95@m15 | 1 | 0 (0 %) | 80 | 43 % | 0.62 | -42.40 | tp2.2 sl2.2 tr0 h96 sh (80 · 0.62 · -42.40) |
| Short | clamp | r-zdist@m15c | 10 | 1 (10 %) | 113 | 45 % | 0.66 | -42.88 | tp2.8 sl5.6 tr0 h96 sh (7 · ∞ (no loss) · 18.20) |
| Short | pivot | cci-40-200@m15c | 31 | 15 (48 %) | 846 | 57 % | 0.95 | -46.84 | tp2 sl4 tr1.5 h96 sh (23 · 1.26 · 6.54) |
| Short | revert | kelt-20-2@m30 | 1 | 0 (0 %) | 44 | 32 % | 0.39 | -47.20 | tp2.4 sl2.4 tr0 h32 sh (44 · 0.39 · -47.20) |
| Short | ribbon | dir-vwap-120@m15c | 5 | 0 (0 %) | 76 | 47 % | 0.50 | -47.35 | tp2 sl3 tr0 h64 sh (13 · 0.66 · -6.60) |
| Short | revert | kelt-20-2.5@m15 | 1 | 0 (0 %) | 53 | 34 % | 0.43 | -48.00 | tp2.2 sl2.2 tr0 h64 sh (53 · 0.43 · -48.00) |
| Short | clamp | bb-bounce@m15c | 20 | 4 (20 %) | 293 | 64 % | 0.86 | -50.27 | tp2.2 sl4.4 tr1.1 h96 sh (14 · 1.76 · 7.00) |
| Short | clamp | z-20-2@m15c | 20 | 4 (20 %) | 293 | 64 % | 0.86 | -50.27 | tp2.2 sl4.4 tr1.1 h96 sh (14 · 1.76 · 7.00) |
| Short | revert | break-vol@m30 | 3 | 0 (0 %) | 47 | 32 % | 0.43 | -51.23 | tp2.6 sl2.6 tr0 h48 sh (15 · 0.43 · -16.00) |
| Short | ribbon | dir-vwap-120@m15 | 7 | 0 (0 %) | 138 | 57 % | 0.67 | -54.21 | tp1.8 sl3.6 tr1.35 h64 sh (20 · 0.75 · -4.94) |
| Short | revert | move-impulse-20-2.5@m15c | 4 | 1 (25 %) | 208 | 52 % | 0.79 | -61.00 | tp2.4 sl3.6 tr0 h96 sh (45 · 1.05 · 3.00) |
| Short | ribbon | trend-st-28-6@m15 | 14 | 4 (29 %) | 310 | 61 % | 0.86 | -61.45 | tp2 sl4 tr1.5 h96 sh (24 · 1.32 · 7.16) |
| Short | revert | r-orb-m@m30 | 11 | 0 (0 %) | 99 | 64 % | 0.64 | -63.48 | tp2.2 sl4.4 tr1.1 h32 sh (10 · 0.72 · -3.89) |
| Short | pivot | r-sweep-m@m15 | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -64.09 | – |
| Short | clamp | cci-40-200@x4@m15 | 50 | 13 (26 %) | 171 | 40 % | 0.68 | -67.62 | – |
| Short | ribbon | r-valuearea-m@m15 | 28 | 0 (0 %) | 34 | 0 % | 0.00 | -67.97 | – |
| Short | ribbon | ichi-tk-20@m15c | 3 | 0 (0 %) | 53 | 40 % | 0.36 | -67.97 | tp2 sl3 tr1.5 h96 sh (21 · 0.42 · -17.57) |
| Short | clamp | r-session-trend@m15c | 21 | 0 (0 %) | 21 | 0 % | 0.00 | -77.30 | – |
| Short | revert | r-chop-m@m15 | 12 | 2 (17 %) | 126 | 41 % | 0.63 | -78.75 | tp2.6 sl3.9 tr1.3 h96 sh (9 · 1.84 · 6.02) |
| Short | ribbon | break-retest@m15 | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -83.90 | – |
| Short | revert | move-impulse-20-2.5@m30 | 3 | 0 (0 %) | 104 | 50 % | 0.59 | -86.34 | tp2.8 sl4.2 tr0 h48 sh (32 · 0.67 · -21.80) |
| Short | sweep | r-pin-m@m15 | 18 | 5 (28 %) | 66 | 30 % | 0.08 | -90.77 | tp2.6 sl2.6 tr1.3 h64 sh (6 · 0.02 · -11.11) |
| Short | ribbon | r-chand-m@m15 | 10 | 0 (0 %) | 37 | 27 % | 0.10 | -94.77 | – |
| Short | revert | kelt-20-2@m15c | 2 | 0 (0 %) | 96 | 31 % | 0.39 | -99.38 | tp2.6 sl2.6 tr0 h64 sh (46 · 0.42 · -49.38) |
| Short | ribbon | dir-vwap@m15 | 14 | 0 (0 %) | 28 | 0 % | 0.00 | -99.60 | – |
| Short | ribbon | r-chand@m15 | 21 | 1 (5 %) | 65 | 25 % | 0.16 | -102.63 | – |
| Short | clamp | r-sweep-m@m15 | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -104.20 | – |
| Short | revert | r-awesome-m@m15c | 48 | 21 (44 %) | 141 | 43 % | 0.42 | -104.39 | tp2 sl2 tr0 h96 sh (5 · 0.00 · -11.00) |
| Short | follow | r-bb-adx@m30 | 4 | 0 (0 %) | 108 | 45 % | 0.38 | -113.00 | tp2.2 sl3.3 tr0 h48 sh (23 · 0.52 · -20.00) |
| Short | revert | r-qh-flow-m@m15c | 14 | 4 (29 %) | 644 | 57 % | 0.85 | -122.42 | tp2.8 sl5.6 tr2.1 h96 sh (27 · 1.17 · 5.05) |
| Short | pivot | r-sweep@m15 | 27 | 0 (0 %) | 27 | 0 % | 0.00 | -126.78 | – |
| Short | revert | r-qh-flow-m@m30 | 10 | 1 (10 %) | 519 | 61 % | 0.81 | -127.37 | tp2.8 sl5.6 tr1.4 h32 sh (46 · 1.06 · 3.32) |
| Short | magnet | rsi-div@m15 | 26 | 2 (8 %) | 52 | 6 % | 0.04 | -140.72 | – |
| Short | magnet | r-chand@m15 | 17 | 0 (0 %) | 77 | 32 % | 0.18 | -147.50 | tp2.8 sl5.6 tr1.4 h64 sh (5 · 0.20 · -7.59) |
| Short | ribbon | macd-hist-19-39-9@m15c | 32 | 0 (0 %) | 73 | 23 % | 0.19 | -153.91 | – |
| Short | clamp | srsi-14-20@m15c | 5 | 0 (0 %) | 182 | 51 % | 0.50 | -170.69 | tp2.8 sl4.2 tr1.4 h96 sh (35 · 0.52 · -29.81) |
| Short | revert | cmf-20-0.1@m15c | 8 | 0 (0 %) | 640 | 54 % | 0.75 | -175.43 | tp1.8 sl2.7 tr0.9 h64 sh (91 · 0.80 · -14.86) |
| Short | pulse | hma-55@m15 | 53 | 0 (0 %) | 152 | 36 % | 0.30 | -203.96 | – |
| Short | pulse | move-impulse-10-2@m15 | 30 | 0 (0 %) | 115 | 31 % | 0.23 | -204.58 | – |
| Short | pivot | r-clv-thrust-m@m15 | 60 | 0 (0 %) | 60 | 0 % | 0.00 | -209.90 | – |
| Short | pivot | r-ultimate@m15 | 46 | 4 (9 %) | 661 | 60 % | 0.70 | -219.60 | tp2 sl2 tr0 h64 sh (16 · 1.05 · 0.80) |
| Short | clamp | cci-40-200@m15c | 17 | 0 (0 %) | 279 | 35 % | 0.40 | -229.45 | tp1.8 sl2.7 tr1.35 h96 sh (15 · 0.42 · -10.36) |
| Short | ribbon | trend-st-21-5@m15 | 49 | 3 (6 %) | 959 | 59 % | 0.81 | -257.19 | tp2.6 sl3.9 tr0 h96 sh (17 · 1.07 · 1.80) |
| Short | revert | r-klinger@m15c | 86 | 26 (30 %) | 1036 | 60 % | 0.81 | -257.70 | tp2.4 sl2.4 tr0 h96 sh (12 · 1.69 · 7.20) |
| Short | ribbon | ema-slope@m15 | 65 | 0 (0 %) | 272 | 33 % | 0.49 | -278.37 | tp2.2 sl2.2 tr1.1 h64 sh (5 · 0.93 · -0.38) |
| Short | clamp | r-ultimate@m15 | 54 | 0 (0 %) | 393 | 45 % | 0.48 | -295.37 | tp2.8 sl4.2 tr0 h64 sh (5 · 0.89 · -1.00) |
| Short | follow | r-nr-break@m15c | 45 | 8 (18 %) | 600 | 58 % | 0.67 | -298.90 | tp2.4 sl4.8 tr0 h64 sh (14 · 1.10 · 2.00) |
| Short | ribbon | ema-slope@m15c | 74 | 0 (0 %) | 309 | 32 % | 0.48 | -324.53 | tp2.2 sl2.2 tr1.1 h64 sh (5 · 0.93 · -0.38) |
| Short | ribbon | ichi-cloud-20@m15c | 15 | 0 (0 %) | 203 | 36 % | 0.10 | -335.04 | tp2 sl3 tr1 h64 sh (15 · 0.12 · -17.77) |
| Short | follow | r-bb-adx@m15c | 12 | 0 (0 %) | 202 | 22 % | 0.21 | -337.01 | tp2.6 sl2.6 tr0 h96 sh (15 · 0.31 · -21.20) |
| Short | pivot | cci-40-200@m15 | 24 | 0 (0 %) | 900 | 52 % | 0.63 | -452.25 | tp2.2 sl4.4 tr1.1 h96 sh (31 · 0.98 · -0.63) |
| Short | revert | r-clv-thrust-m@m15c | 46 | 0 (0 %) | 217 | 23 % | 0.19 | -461.77 | tp2 sl3 tr1.5 h64 sh (5 · 0.27 · -7.02) |
| Short | clamp | cci-40-200@m15 | 29 | 0 (0 %) | 681 | 41 % | 0.37 | -788.10 | tp2.2 sl4.4 tr1.1 h96 sh (20 · 0.50 · -16.36) |
| General | sweep | willr-21-95@m15 | 19 | 19 (100 %) | 148 | 78 % | 3.55 | 265.24 | tp3.2 sl3.2 tr2.4 h64 gn (8 · 6.79 · 19.69) |
| General | pivot | willr-50-95@m15 | 16 | 16 (100 %) | 108 | 75 % | 4.18 | 159.62 | tp4.4 sl4.4 tr0 h96 gn (5 · ∞ (no loss) · 21.00) |
| General | sweep | willr-14-95@m15 | 18 | 18 (100 %) | 129 | 70 % | 2.30 | 150.85 | tp3.6 sl3.6 tr2.7 h96 gn (7 · 4.98 · 15.12) |
| General | ribbon | hma-55@m15c | 40 | 40 (100 %) | 40 | 100 % | ∞ (no loss) | 145.99 | – |
| General | pivot | dir-thrust-4@m30 | 32 | 32 (100 %) | 32 | 100 % | ∞ (no loss) | 119.77 | – |
| General | sweep | willr-28-95@m15 | 5 | 5 (100 %) | 40 | 88 % | 6.55 | 109.94 | tp3.6 sl3.6 tr2.7 h96 gn (8 · 7.03 · 22.91) |
| General | revert | break-vol-2@m30 | 18 | 15 (83 %) | 250 | 55 % | 1.29 | 82.05 | tp3.6 sl2.7 tr0 h32 gn (15 · 1.64 · 10.03) |
| General | ribbon | trend-st@m15c | 12 | 12 (100 %) | 24 | 83 % | 125.36 | 59.32 | – |
| General | ribbon | willr-28-95@m15c | 13 | 12 (92 %) | 65 | 66 % | 2.68 | 58.52 | tp4.4 sl2.2 tr0 h64 gn (5 · 2.63 · 7.80) |
| General | magnet | r-pin-m@m15 | 30 | 28 (93 %) | 30 | 93 % | 9.02 | 51.35 | – |
| General | ribbon | trend-st-14-4@m15c | 6 | 6 (100 %) | 48 | 67 % | 2.27 | 44.78 | tp3.6 sl3.6 tr1.8 h64 gn (7 · 4.72 · 14.15) |
| General | revert | break-vol-2@m15c | 7 | 6 (86 %) | 79 | 56 % | 1.51 | 44.60 | tp3.6 sl2.7 tr0 h64 gn (13 · 1.74 · 9.53) |
| General | ribbon | trend-ribbon@m15c | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 43.10 | – |
| General | ribbon | willr-50-95@m15 | 4 | 4 (100 %) | 44 | 82 % | 5.40 | 31.74 | tp3.2 sl3.2 tr1.6 h64 gn (13 · 3.78 · 9.53) |
| General | revert | r-klinger@m15c | 24 | 13 (54 %) | 253 | 58 % | 1.06 | 24.11 | tp3.6 sl2.7 tr0 h64 gn (11 · 2.05 · 12.20) |
| General | sweep | r-td@m30 | 10 | 8 (80 %) | 46 | 52 % | 1.32 | 20.94 | tp3.2 sl3.2 tr1.6 h32 gn (6 · 2.24 · 4.26) |
| General | magnet | mfi-14-20@m15 | 2 | 2 (100 %) | 15 | 67 % | 2.86 | 20.80 | tp3.6 sl2.7 tr0 h96 gn (7 · 2.93 · 11.20) |
| General | pivot | cci-40-200@x4@m15 | 10 | 8 (80 %) | 77 | 56 % | 1.22 | 20.05 | tp3.6 sl3.6 tr1.8 h96 gn (6 · 2.57 · 5.97) |
| General | pivot | z-50-2.5@x4@m15 | 3 | 3 (100 %) | 15 | 60 % | 2.17 | 16.55 | tp3.2 sl3.2 tr1.6 h64 gn (6 · 1.96 · 5.32) |
| General | revert | r-fractal@m30 | 2 | 2 (100 %) | 90 | 52 % | 1.12 | 14.80 | tp3.2 sl3.2 tr0 h48 gn (43 · 1.23 · 13.80) |
| General | sweep | willr-21-95@m15c | 3 | 3 (100 %) | 7 | 71 % | 90.32 | 14.48 | – |
| General | pivot | mfi-14-20@m15c | 5 | 5 (100 %) | 19 | 53 % | 1.78 | 13.80 | – |
| General | ribbon | trend-st-14-4@m15 | 5 | 3 (60 %) | 61 | 56 % | 1.20 | 13.44 | tp4 sl4 tr2 h64 gn (11 · 1.62 · 7.85) |
| General | revert | r-chop@m30 | 8 | 6 (75 %) | 149 | 48 % | 1.07 | 12.44 | tp3.6 sl2.7 tr0 h32 gn (19 · 1.19 · 4.73) |
| General | ribbon | trend-st-21-3@m15c | 7 | 7 (100 %) | 14 | 71 % | 22.82 | 10.41 | – |
| General | pivot | willr-28-95@m15c | 4 | 4 (100 %) | 18 | 67 % | 13.14 | 8.70 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 76.01 · 2.56) |
| General | ribbon | ema-slope-20-10@m15 | 1 | 1 (100 %) | 5 | 60 % | 2.63 | 7.80 | tp4.4 sl2.2 tr0 h96 gn (5 · 2.63 · 7.80) |
| General | ribbon | r-ultimate@m15c | 2 | 2 (100 %) | 7 | 71 % | 2.48 | 7.70 | – |
| General | sweep | r-pin@m30 | 1 | 1 (100 %) | 8 | 63 % | 1.92 | 7.20 | tp3.2 sl2.4 tr0 h48 gn (8 · 1.92 · 7.20) |
| General | sweep | act-hf-5@m15c | 7 | 5 (71 %) | 7 | 71 % | 26.45 | 6.06 | – |
| General | pivot | willr-28-95@m15 | 10 | 5 (50 %) | 36 | 50 % | 1.10 | 2.80 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 76.01 · 2.56) |
| General | ribbon | willr-28-95@m15 | 1 | 1 (100 %) | 5 | 40 % | 1.15 | 1.00 | tp4 sl2 tr0 h64 gn (5 · 1.15 · 1.00) |
| General | ribbon | macd-cross-19-39-9@m30 | 2 | 0 (0 %) | 8 | 75 % | 0.75 | -1.89 | – |
| General | revert | r-qh-flow-m@m15c | 1 | 0 (0 %) | 40 | 45 % | 0.95 | -3.44 | tp4 sl3 tr0 h64 gn (40 · 0.95 · -3.44) |
| General | sandwich | act-burst@m15 | 6 | 4 (67 %) | 10 | 60 % | 0.50 | -5.15 | – |
| General | pulse | act-burst@m15 | 6 | 4 (67 %) | 10 | 60 % | 0.50 | -5.15 | – |
| General | revert | r-spring@m15 | 2 | 0 (0 %) | 7 | 43 % | 0.40 | -6.19 | – |
| General | revert | r-chop-m@m30 | 2 | 0 (0 %) | 13 | 38 % | 0.69 | -6.25 | tp3.6 sl3.6 tr1.8 h32 gn (7 · 0.75 · -2.40) |
| General | ribbon | willr-7-90@m30 | 3 | 0 (0 %) | 14 | 64 % | 0.50 | -7.82 | tp3.2 sl3.2 tr2.4 h48 gn (6 · 0.60 · -2.81) |
| General | magnet | r-cvd-div-m@m15 | 4 | 1 (25 %) | 24 | 50 % | 0.78 | -8.47 | tp3.2 sl2.4 tr0 h96 gn (6 · 1.15 · 1.20) |
| General | revert | r-klinger-m@m15c | 9 | 4 (44 %) | 47 | 36 % | 0.88 | -8.87 | tp4 sl4 tr2 h64 gn (5 · 3.37 · 9.96) |
| General | clamp | cci-40-200@x4@m15 | 3 | 0 (0 %) | 7 | 43 % | 0.39 | -8.98 | – |
| General | sweep | r-pin-m@m15 | 1 | 0 (0 %) | 6 | 17 % | 0.04 | -12.44 | tp3.2 sl2.4 tr0 h64 gn (6 · 0.04 · -12.44) |
| General | clamp | cci-20-200@m15c | 2 | 0 (0 %) | 18 | 39 % | 0.67 | -14.60 | tp4.4 sl4.4 tr0 h96 gn (9 · 0.73 · -6.20) |
| General | pulse | hma-55@m15c | 12 | 5 (42 %) | 23 | 48 % | 0.48 | -14.70 | – |
| General | ribbon | r-valuearea-m@m15 | 9 | 0 (0 %) | 8 | 0 % | 0.00 | -16.31 | – |
| General | pulse | ema-slope@m15c | 12 | 4 (33 %) | 24 | 46 % | 0.44 | -16.94 | – |
| General | revert | break-vol-1.3@m30 | 2 | 0 (0 %) | 48 | 42 % | 0.74 | -22.08 | tp3.2 sl3.2 tr0 h48 gn (23 · 0.81 · -7.80) |
| General | revert | r-qh-flow-m@m30 | 2 | 0 (0 %) | 82 | 55 % | 0.85 | -22.14 | tp4.4 sl4.4 tr0 h32 gn (39 · 0.92 · -6.66) |
| General | pivot | r-sweep@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -22.20 | – |
| General | pivot | r-clv-thrust-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -23.20 | – |
| General | ribbon | r-camarilla-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -23.20 | – |
| General | ribbon | trend-st-28-6@m15 | 4 | 0 (0 %) | 85 | 54 % | 0.82 | -23.97 | tp4 sl4 tr2 h96 gn (20 · 0.88 · -3.57) |
| General | ribbon | ema-slope@m15 | 8 | 0 (0 %) | 27 | 30 % | 0.57 | -25.66 | – |
| General | revert | break-vol@m15c | 2 | 0 (0 %) | 33 | 30 % | 0.54 | -26.83 | tp3.6 sl2.7 tr0 h64 gn (17 · 0.56 · -13.23) |
| General | magnet | rsi-div@m15 | 6 | 1 (17 %) | 11 | 9 % | 0.12 | -29.13 | – |
| General | clamp | r-session-trend@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -29.60 | – |
| General | clamp | r-ultimate@m15 | 8 | 2 (25 %) | 56 | 43 % | 0.64 | -32.06 | tp3.2 sl1.6 tr0 h64 gn (7 · 1.25 · 1.80) |
| General | revert | break-vol-1.3@m15c | 2 | 0 (0 %) | 46 | 37 % | 0.63 | -32.38 | tp3.6 sl2.7 tr0 h64 gn (23 · 0.65 · -14.78) |
| General | ribbon | r-chand@m15 | 9 | 1 (11 %) | 22 | 27 % | 0.28 | -33.44 | – |
| General | ribbon | break-retest@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -34.70 | – |
| General | follow | cci-40-200@m15c | 2 | 0 (0 %) | 48 | 42 % | 0.60 | -35.53 | tp3.2 sl3.2 tr0 h96 gn (22 · 0.61 · -17.20) |
| General | pulse | move-impulse-10-2@m15 | 5 | 0 (0 %) | 20 | 25 % | 0.14 | -37.92 | – |
| General | revert | kelt-20-2@m30 | 1 | 0 (0 %) | 34 | 35 % | 0.48 | -38.80 | tp3.2 sl3.2 tr0 h48 gn (34 · 0.48 · -38.80) |
| General | ribbon | dir-thrust@m30 | 10 | 1 (10 %) | 123 | 50 % | 0.77 | -40.98 | tp4.4 sl4.4 tr2.2 h32 gn (14 · 1.04 · 0.54) |
| General | revert | r-awesome-m@m15c | 10 | 1 (10 %) | 28 | 25 % | 0.15 | -50.68 | – |
| General | ribbon | ema-slope@m15c | 14 | 0 (0 %) | 48 | 29 % | 0.51 | -51.96 | – |
| General | pulse | hma-55@m15 | 14 | 0 (0 %) | 41 | 32 % | 0.18 | -68.22 | – |
| General | ribbon | trend-st-21-5@m15 | 12 | 0 (0 %) | 213 | 51 % | 0.79 | -72.36 | tp3.6 sl3.6 tr1.8 h96 gn (18 · 0.94 · -1.27) |
| General | revert | r-clv-thrust-m@m15c | 8 | 0 (0 %) | 40 | 20 % | 0.26 | -72.72 | tp3.2 sl2.4 tr0 h64 gn (5 · 0.29 · -7.40) |
| General | revert | cmf-20-0.1@m15c | 2 | 0 (0 %) | 105 | 46 % | 0.61 | -75.29 | tp3.6 sl3.6 tr2.7 h64 gn (54 · 0.65 · -33.12) |
| General | revert | break-vol@m30 | 7 | 0 (0 %) | 115 | 30 % | 0.52 | -106.14 | tp3.6 sl2.7 tr0 h48 gn (15 · 0.59 · -12.00) |
| General | follow | r-nr-break@m15c | 15 | 0 (0 %) | 167 | 39 % | 0.29 | -251.80 | tp3.2 sl3.2 tr1.6 h64 gn (13 · 0.37 · -10.73) |
| Long | pivot | dir-thrust-4@m30 | 48 | 48 (100 %) | 48 | 100 % | ∞ (no loss) | 246.70 | – |
| Long | sweep | willr-21-95@m15 | 15 | 15 (100 %) | 109 | 82 % | 3.52 | 223.94 | tp6 sl6 tr3 h96 lg (7 · ∞ (no loss) · 21.36) |
| Long | sweep | willr-14-95@m15 | 13 | 13 (100 %) | 88 | 70 % | 2.40 | 127.23 | tp4.8 sl4.8 tr2.4 h64 lg (8 · 4.20 · 15.99) |
| Long | revert | r-klinger@m15c | 38 | 24 (63 %) | 298 | 57 % | 1.19 | 126.19 | tp6.4 sl6.4 tr0 h96 lg (5 · 3.76 · 18.20) |
| Long | ribbon | willr-7-90@m30 | 15 | 11 (73 %) | 55 | 76 % | 3.18 | 122.58 | tp6.4 sl6.4 tr0 h32 lg (5 · ∞ (no loss) · 20.47) |
| Long | ribbon | hma-55@m15c | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 82.39 | – |
| Long | sweep | mfi-14-10@m15 | 5 | 5 (100 %) | 15 | 100 % | ∞ (no loss) | 82.20 | – |
| Long | ribbon | willr-21-95@m15 | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 60.40 | – |
| Long | ribbon | willr-28-90@m15 | 3 | 2 (67 %) | 35 | 69 % | 1.98 | 58.85 | tp6.4 sl6.4 tr0 h96 lg (11 · 2.51 · 29.80) |
| Long | pivot | willr-50-95@m15 | 4 | 4 (100 %) | 14 | 93 % | 194.74 | 51.42 | tp6 sl6 tr0 h96 lg (5 · ∞ (no loss) · 29.00) |
| Long | sweep | willr-28-95@m15 | 2 | 2 (100 %) | 16 | 88 % | 5.79 | 47.91 | tp4.8 sl4.8 tr2.4 h64 lg (8 · 5.79 · 23.95) |
| Long | ribbon | dir-thrust@m30 | 9 | 7 (78 %) | 108 | 55 % | 1.30 | 41.85 | tp6.4 sl6.4 tr0 h32 lg (12 · 2.51 · 18.44) |
| Long | ribbon | willr-28-95@m15c | 4 | 4 (100 %) | 11 | 82 % | 8.98 | 41.48 | tp4.8 sl2.4 tr0 h64 lg (5 · 2.65 · 8.60) |
| Long | ribbon | trend-st@m15c | 15 | 11 (73 %) | 28 | 75 % | 2.35 | 37.11 | – |
| Long | ribbon | willr-28-95@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 36.00 | – |
| Long | revert | r-awesome-m@m15c | 19 | 9 (47 %) | 13 | 77 % | 3.66 | 28.15 | – |
| Long | pivot | willr-21-95@m15 | 5 | 5 (100 %) | 6 | 83 % | 11.00 | 26.00 | – |
| Long | ribbon | trend-ribbon@m15c | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 24.60 | – |
| Long | sweep | r-td@m30 | 5 | 5 (100 %) | 17 | 65 % | 1.66 | 19.08 | – |
| Long | revert | r-qh-flow-m@m30 | 3 | 1 (33 %) | 103 | 50 % | 1.08 | 17.93 | tp5.2 sl5.2 tr0 h32 lg (33 · 1.47 · 27.47) |
| Long | revert | break-vol-2@m30 | 1 | 1 (100 %) | 11 | 55 % | 2.16 | 17.40 | tp5.6 sl2.8 tr0 h48 lg (11 · 2.16 · 17.40) |
| Long | revert | r-klinger-m@m15c | 2 | 2 (100 %) | 7 | 71 % | 2.30 | 12.98 | – |
| Long | revert | ema-50-100@m30 | 1 | 1 (100 %) | 8 | 88 % | 2.34 | 7.77 | tp5.6 sl5.6 tr2.8 h48 lg (8 · 2.34 · 7.77) |
| Long | magnet | rsi-div@m15 | 13 | 8 (62 %) | 24 | 42 % | 1.09 | 3.81 | – |
| Long | pulse | hma-55@m15c | 4 | 2 (50 %) | 6 | 67 % | 1.67 | 1.28 | – |
| Long | revert | r-orb-m@m30 | 1 | 1 (100 %) | 7 | 57 % | 1.01 | 0.24 | tp5.2 sl5.2 tr0 h32 lg (7 · 1.01 · 0.24) |
| Long | pivot | trend-adx@m15c | 1 | 0 (0 %) | 8 | 50 % | 0.80 | -3.40 | tp6.4 sl4.8 tr0 h64 lg (8 · 0.80 · -3.40) |
| Long | follow | r-rsi2-m@m15c | 3 | 0 (0 %) | 9 | 33 % | 0.79 | -4.80 | – |
| Long | revert | r-chop-m@m30 | 2 | 0 (0 %) | 12 | 33 % | 0.76 | -4.99 | tp4.8 sl4.8 tr3.6 h32 lg (6 · 0.86 · -1.13) |
| Long | revert | r-clv-thrust-m@m15c | 1 | 0 (0 %) | 5 | 20 % | 0.44 | -5.80 | tp4.8 sl2.4 tr0 h96 lg (5 · 0.44 · -5.80) |
| Long | pivot | willr-28-90@m30 | 2 | 0 (0 %) | 8 | 50 % | 0.39 | -6.30 | – |
| Long | revert | r-qh-flow-m@m15c | 1 | 0 (0 %) | 29 | 52 % | 0.89 | -6.89 | tp4.8 sl4.8 tr0 h64 lg (29 · 0.89 · -6.89) |
| Long | ribbon | trend-ema-50-200@m15c | 1 | 0 (0 %) | 10 | 50 % | 0.76 | -8.07 | tp6.4 sl6.4 tr0 h64 lg (10 · 0.76 · -8.07) |
| Long | sweep | r-bb-adx@m15 | 4 | 2 (50 %) | 6 | 67 % | 0.22 | -8.16 | – |
| Long | magnet | macd-cross@m15 | 22 | 2 (9 %) | 15 | 13 % | 0.02 | -10.74 | – |
| Long | ribbon | dir-emax-20-50@m15 | 1 | 0 (0 %) | 16 | 31 % | 0.70 | -11.06 | tp6.4 sl3.2 tr0 h64 lg (16 · 0.70 · -11.06) |
| Long | ribbon | trend-st-14-4@m15 | 2 | 0 (0 %) | 14 | 36 % | 0.68 | -14.00 | tp6 sl4.5 tr0 h96 lg (7 · 0.93 · -1.40) |
| Long | pulse | hma-55@m15 | 3 | 0 (0 %) | 8 | 38 % | 0.14 | -14.83 | – |
| Long | pivot | cmf-20-0.05@m15c | 1 | 0 (0 %) | 13 | 31 % | 0.54 | -15.80 | tp4.8 sl3.6 tr0 h96 lg (13 · 0.54 · -15.80) |
| Long | clamp | cci-40-200@x4@m15 | 11 | 6 (55 %) | 26 | 42 % | 0.39 | -19.39 | – |
| Long | pivot | willr-21-90@m30 | 4 | 0 (0 %) | 5 | 20 % | 0.03 | -19.75 | – |
| Long | revert | r-roofing@m15 | 2 | 0 (0 %) | 12 | 33 % | 0.55 | -20.00 | tp6.4 sl6.4 tr0 h96 lg (5 · 0.63 · -7.40) |
| Long | magnet | move-impulse@m15c | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -21.09 | – |
| Long | revert | r-tsi-m@m15c | 3 | 0 (0 %) | 18 | 33 % | 0.62 | -21.60 | tp5.6 sl4.2 tr0 h96 lg (6 · 0.61 · -6.80) |
| Long | ribbon | r-camarilla-m@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -25.60 | – |
| Long | revert | cmf-20-0.1@m15c | 2 | 0 (0 %) | 60 | 53 % | 0.79 | -30.24 | tp6 sl6 tr4.5 h64 lg (32 · 0.84 · -11.38) |
| Long | magnet | r-chand@m15 | 3 | 0 (0 %) | 15 | 27 % | 0.06 | -31.46 | tp5.6 sl5.6 tr2.8 h64 lg (5 · 0.07 · -9.62) |
| Long | magnet | r-pin-m@m15 | 19 | 12 (63 %) | 19 | 63 % | 0.19 | -33.34 | – |
| Long | magnet | r-bb-adx@m15 | 8 | 1 (13 %) | 8 | 13 % | 0.00 | -42.02 | – |
| Long | ribbon | r-chand-m@m15 | 5 | 0 (0 %) | 23 | 22 % | 0.06 | -55.00 | tp6.4 sl3.2 tr0 h64 lg (5 · 0.07 · -9.99) |
| Long | ribbon | r-sweep-m@m15 | 10 | 2 (20 %) | 19 | 16 % | 0.18 | -63.20 | – |
| Long | ribbon | dir-vwap-240@m15c | 6 | 0 (0 %) | 73 | 47 % | 0.62 | -83.83 | tp6 sl6 tr0 h96 lg (11 · 0.78 · -8.20) |
| Long | ribbon | r-chand@m15 | 20 | 0 (0 %) | 74 | 23 % | 0.10 | -108.84 | – |
| Long | pivot | r-sweep@m15 | 24 | 0 (0 %) | 22 | 0 % | 0.00 | -110.87 | – |
| Long | follow | r-nr-break@m15c | 9 | 0 (0 %) | 90 | 40 % | 0.41 | -140.13 | tp4.8 sl4.8 tr0 h64 lg (11 · 0.67 · -9.86) |
| Long | ribbon | trend-st-21-5@m15 | 12 | 1 (8 %) | 175 | 43 % | 0.62 | -148.33 | tp5.6 sl2.8 tr0 h96 lg (13 · 1.12 · 3.00) |
| Long | ribbon | break-retest@m15 | 42 | 0 (0 %) | 42 | 0 % | 0.00 | -221.20 | – |
| Wide | snap | willr-7-95@m5 | 18 | 15 (83 %) | 36 | 50 % | 2.20 | 17.12 | – |
| Wide | revert | break-retest@m5c | 3 | 3 (100 %) | 27 | 67 % | 1.56 | 7.47 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (9 · 1.56 · 2.49) |
| Wide | ribbon | hma-55@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.91 | – |
| Wide | ribbon | r-pin@m15 | 3 | 3 (100 %) | 12 | 75 % | 3.00 | 5.67 | – |
| Wide | magnet | r-sweep@m5 | 1 | 1 (100 %) | 5 | 80 % | 5.24 | 4.56 | tp0.76 sl0.68 tr0 h96 ax-geo2 axis (5 · 5.24 · 4.56) |
| Wide | sweep | willr-14-95@m15c | 3 | 3 (100 %) | 9 | 67 % | 1.85 | 4.50 | – |
| Wide | magnet | r-sweep-m@m5 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 4.17 | – |
| Wide | magnet | r-chand@m15 | 3 | 3 (100 %) | 12 | 25 % | 1.44 | 2.38 | – |
| Wide | magnet | willr-50-95@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.90 | -0.41 | – |
| Wide | sweep | mfi-14-20@m15 | 1 | 0 (0 %) | 14 | 36 % | 0.71 | -2.39 | tp0.8 sl0.8 tr0 h32 ax-geo3 axis (14 · 0.71 · -2.39) |
| Wide | revert | ema-50-100@m30 | 3 | 0 (0 %) | 42 | 50 % | 0.90 | -3.01 | tp1.13 sl1.13 tr0 h16 ax-linear2 axis (14 · 0.90 · -1.00) |
| Wide | sweep | break-vol-2@m1 | 3 | 0 (0 %) | 39 | 46 % | 0.72 | -3.62 | tp0.64 sl0.54 tr0 h480 axd-linear2h axis (13 · 0.72 · -1.21) |
| Wide | revert | r-bos@m15c | 12 | 6 (50 %) | 30 | 40 % | 0.63 | -3.91 | – |
| Wide | ribbon | move-cont@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 | – |
| Wide | sweep | r-pin@m15 | 3 | 0 (0 %) | 15 | 40 % | 0.41 | -5.22 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (5 · 0.41 · -1.74) |
| Wide | ribbon | aroon-14@m5 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -6.06 | – |
| Wide | sweep | break-vol@x4@m15 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -7.04 | – |
| Wide | ribbon | dir-thrust-4@m5 | 3 | 0 (0 %) | 42 | 43 % | 0.71 | -8.08 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (14 · 0.71 · -2.69) |
| Wide | sandwich | move-impulse-4-1.2@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -8.92 | – |
| Wide | pulse | move-impulse-4-1.2@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -8.92 | – |
| Wide | snap | r-camarilla@m1 | 6 | 0 (0 %) | 72 | 29 % | 0.47 | -24.39 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (12 · 0.78 · -1.68) |
| Wide | pulse | willr-28-80@m1c | 5 | 0 (0 %) | 510 | 37 % | 0.89 | -24.78 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (102 · 0.89 · -4.96) |
| Wide | sweep | r-rsi2-m@m30 | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -25.27 | – |
| Wide | sweep | willr-50-95@m5c | 12 | 0 (0 %) | 51 | 18 % | 0.21 | -28.16 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (8 · 0.42 · -2.44) |
| Wide | pulse | r-camarilla@m1 | 12 | 0 (0 %) | 264 | 32 % | 0.52 | -75.46 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (22 · 0.79 · -2.31) |
| Wide | pivot | break-atr-2@x4@m1 | 12 | 0 (0 %) | 177 | 10 % | 0.09 | -158.79 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (15 · 0.15 · -9.93) |
| Wide | ribbon | r-camarilla-m@m1 | 18 | 0 (0 %) | 282 | 26 % | 0.26 | -160.63 | tp0.64 sl0.54 tr0 h480 axd-volume2h axis (15 · 0.34 · -5.64) |
| Signals | follow | sig-obv-m@m15 | 30 | 29 (97 %) | 879 | 82 % | 2.61 | 1308.51 | tp5 sl15 tr3 h96 (27 · 176.63 · 79.54) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 29 (97 %) | 697 | 83 % | 3.36 | 1238.28 | tp5 sl15 tr3 h96 (20 · ∞ (no loss) · 68.37) |
| Signals | follow | sig-obv-s@m15 | 30 | 26 (87 %) | 1075 | 76 % | 1.50 | 742.90 | tp6 sl18 tr4.8 h96 (13 · ∞ (no loss) · 53.95) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 22 (73 %) | 980 | 73 % | 1.42 | 709.89 | tp8 sl24 tr3.2 h96 (23 · 4.61 · 87.59) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 21 (70 %) | 835 | 73 % | 1.52 | 646.36 | tp6 sl18 tr3.6 h96 (16 · ∞ (no loss) · 56.40) |
| Signals | follow | sig-mfi-m@m15 | 30 | 30 (100 %) | 324 | 85 % | 3.17 | 641.22 | tp8 sl24 tr3.2 h96 (10 · 2673.02 · 41.11) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 23 (77 %) | 751 | 74 % | 1.52 | 595.45 | tp6 sl18 tr2.4 h96 (24 · 51.22 · 62.83) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 23 (77 %) | 1009 | 74 % | 1.34 | 553.23 | tp8 sl24 tr4.8 h96 (9 · ∞ (no loss) · 55.51) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 21 (70 %) | 920 | 74 % | 1.30 | 483.07 | tp6 sl18 tr4.8 h96 (15 · 198.18 · 65.28) |
| Signals | follow | sig-adx-m@m15 | 30 | 27 (90 %) | 384 | 79 % | 2.04 | 479.70 | tp5 sl15 tr3 h96 (9 · 1178.91 · 35.16) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 25 (83 %) | 840 | 75 % | 1.35 | 476.14 | tp8 sl24 tr3.2 h96 (18 · 78.32 · 52.08) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 20 (67 %) | 469 | 75 % | 1.70 | 462.53 | tp5 sl15 tr2 h96 (19 · 271.93 · 46.43) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 23 (77 %) | 1394 | 72 % | 1.18 | 442.15 | tp6 sl18 tr3.6 h96 (24 · 5.06 · 73.91) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 17 (57 %) | 1236 | 73 % | 1.19 | 421.18 | tp8 sl24 tr3.2 h96 (24 · 3019.56 · 73.90) |
| Signals | follow | sig-hma-m@m15 | 30 | 24 (80 %) | 623 | 75 % | 1.48 | 411.65 | tp4 sl12 tr0 h96 (15 · 4.36 · 41.00) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 30 | 29 (97 %) | 156 | 92 % | 7.50 | 401.93 | tp6 sl18 tr3.6 h96 (6 · ∞ (no loss) · 26.50) |
| Signals | follow | sig-vwap-s@m15 | 30 | 22 (73 %) | 902 | 75 % | 1.27 | 395.60 | tp5 sl15 tr3 h96 (26 · 264.70 · 68.66) |
| Signals | follow | sig-thrust-m@m15 | 30 | 23 (77 %) | 1047 | 74 % | 1.20 | 351.03 | tp6 sl18 tr3.6 h96 (18 · 267.39 · 54.23) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 20 (67 %) | 858 | 73 % | 1.21 | 297.91 | tp6 sl18 tr2.4 h96 (29 · 1965.73 · 64.18) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 16 (53 %) | 1189 | 72 % | 1.12 | 291.29 | tp6 sl18 tr3.6 h96 (25 · 4.10 · 69.52) |
| Signals | follow | sig-zscore-m@m15 | 30 | 26 (87 %) | 300 | 78 % | 1.58 | 275.08 | tp6 sl9 tr0 h96 (6 · 3.15 · 19.80) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 20 (67 %) | 258 | 76 % | 1.73 | 273.64 | tp5 sl10 tr0 h96 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-kama-s@m15 | 30 | 16 (53 %) | 1071 | 73 % | 1.14 | 271.66 | tp5 sl15 tr3 h96 (31 · 2.65 · 53.50) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 22 (73 %) | 430 | 79 % | 1.39 | 261.47 | tp3 sl9 tr0 h96 (17 · 4.87 · 35.60) |
| Signals | follow | sig-rsi-reversal-m@m15 | 30 | 28 (93 %) | 85 | 89 % | 5.26 | 213.67 | tp3 sl9 tr1.2 h96 (6 · 17.85 · 4.30) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 23 (77 %) | 503 | 75 % | 1.23 | 203.13 | tp3 sl9 tr1.2 h96 (32 · 2.37 · 23.60) |
| Signals | follow | sig-impulse-m@m15 | 30 | 18 (60 %) | 580 | 72 % | 1.18 | 180.79 | tp4 sl12 tr1.6 h96 (30 · 97.60 · 48.25) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 16 (53 %) | 343 | 72 % | 1.24 | 163.59 | tp5 sl15 tr4 h96 (9 · ∞ (no loss) · 38.77) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 24 (80 %) | 127 | 81 % | 1.96 | 152.44 | tp4 sl12 tr2.4 h96 (5 · ∞ (no loss) · 16.25) |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 22 (73 %) | 214 | 78 % | 1.38 | 139.68 | tp6 sl18 tr2.4 h96 (7 · ∞ (no loss) · 23.56) |
| Signals | follow | sig-squeeze-m@m15 | 30 | 24 (80 %) | 78 | 83 % | 2.81 | 138.43 | – |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 16 (53 %) | 540 | 70 % | 1.13 | 134.81 | tp5 sl15 tr3 h96 (14 · 177.23 · 46.21) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 17 (57 %) | 1107 | 70 % | 1.06 | 121.36 | tp8 sl24 tr3.2 h96 (23 · 187.11 · 67.16) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 19 (63 %) | 185 | 77 % | 1.41 | 112.20 | tp5 sl15 tr4 h96 (5 · ∞ (no loss) · 19.95) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 20 (67 %) | 162 | 74 % | 1.33 | 100.27 | tp6 sl18 tr2.4 h96 (5 · ∞ (no loss) · 14.21) |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 20 (67 %) | 178 | 75 % | 1.35 | 95.24 | tp5 sl15 tr3 h96 (5 · ∞ (no loss) · 15.61) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 15 (50 %) | 285 | 74 % | 1.13 | 78.99 | tp5 sl15 tr3 h96 (9 · 1.95 · 14.38) |
| Signals | follow | sig-s2-vol-break-s@m15 | 30 | 19 (63 %) | 242 | 72 % | 1.15 | 69.00 | tp6 sl18 tr2.4 h96 (7 · ∞ (no loss) · 17.21) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 15 (50 %) | 747 | 73 % | 1.05 | 68.35 | tp8 sl24 tr3.2 h96 (19 · 1539.50 · 44.47) |
| Signals | follow | sig-st-slow-m@m15 | 30 | 18 (60 %) | 120 | 69 % | 1.23 | 53.61 | tp3 sl9 tr1.2 h96 (6 · 1.02 · 0.17) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 15 (50 %) | 923 | 71 % | 1.02 | 40.80 | tp6 sl18 tr2.4 h96 (30 · 36.21 · 56.44) |
| Signals | follow | sig-rsi-momentum-s@m15 | 23 | 20 (87 %) | 23 | 87 % | 2.95 | 33.65 | – |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 12 | 9 (75 %) | 25 | 80 % | 1.77 | 18.99 | – |
| Signals | follow | sig-vwap-m@m15 | 30 | 13 (43 %) | 232 | 70 % | 1.03 | 15.14 | tp5 sl15 tr3 h96 (6 · ∞ (no loss) · 20.61) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 14 (47 %) | 693 | 71 % | 1.01 | 7.75 | tp5 sl15 tr3 h96 (19 · 3.67 · 40.81) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 16 (53 %) | 252 | 67 % | 1.01 | 6.01 | tp4 sl12 tr1.6 h96 (16 · 269.81 · 30.13) |
| Signals | follow | sig-donchian-m@m15 | 30 | 16 (53 %) | 438 | 69 % | 0.99 | -5.72 | tp4 sl12 tr0 h96 (11 · 3.11 · 25.80) |
| Signals | follow | sig-r-vol-regime-m@m15 | 28 | 12 (43 %) | 71 | 62 % | 0.76 | -39.20 | tp2.5 sl3.75 tr0 h96 (5 · 0.87 · -1.00) |
| Signals | follow | sig-adx-s@m15 | 30 | 13 (43 %) | 657 | 70 % | 0.97 | -47.14 | tp5 sl15 tr3 h96 (16 · 570.23 · 45.06) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 16 (53 %) | 195 | 64 % | 0.88 | -48.83 | tp4 sl12 tr2.4 h96 (5 · 117.19 · 11.99) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 11 (37 %) | 827 | 70 % | 0.97 | -57.59 | tp6 sl18 tr2.4 h96 (26 · 3.96 · 54.37) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 14 (47 %) | 649 | 67 % | 0.96 | -62.31 | tp6 sl18 tr3.6 h96 (15 · 2.86 · 33.90) |
| Signals | follow | sig-zscore-s@m15 | 30 | 14 (47 %) | 649 | 67 % | 0.96 | -62.31 | tp6 sl18 tr3.6 h96 (15 · 2.86 · 33.90) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 16 (53 %) | 390 | 67 % | 0.93 | -65.94 | tp5 sl15 tr3 h96 (9 · 2.30 · 19.70) |
| Signals | follow | sig-volume-break-s@m15 | 26 | 14 (54 %) | 102 | 68 % | 0.69 | -74.61 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-donchian-s@m15 | 30 | 15 (50 %) | 649 | 71 % | 0.93 | -88.45 | tp4 sl12 tr0 h96 (15 · 4.36 · 41.00) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 12 (40 %) | 949 | 71 % | 0.95 | -89.57 | tp6 sl18 tr2.4 h96 (26 · 3.38 · 43.41) |
| Signals | follow | sig-trix-s@m15 | 30 | 12 (40 %) | 401 | 71 % | 0.89 | -90.80 | tp6 sl18 tr2.4 h96 (16 · 296.80 · 26.90) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 14 (47 %) | 935 | 70 % | 0.95 | -93.06 | tp4 sl12 tr1.6 h96 (44 · 3.06 · 51.25) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 13 (43 %) | 591 | 68 % | 0.92 | -99.86 | tp6 sl18 tr0 h96 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-kama-m@m15 | 30 | 11 (37 %) | 951 | 71 % | 0.95 | -100.88 | tp6 sl18 tr2.4 h96 (29 · 3.99 · 57.01) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 14 (47 %) | 804 | 72 % | 0.93 | -122.07 | tp5 sl15 tr4 h96 (19 · 1.81 · 24.75) |
| Signals | follow | sig-cci-s@m15 | 30 | 11 (37 %) | 1071 | 68 % | 0.94 | -141.53 | tp6 sl18 tr2.4 h96 (30 · 3.10 · 52.28) |
| Signals | follow | sig-rsi-reversal-s@m15 | 30 | 9 (30 %) | 200 | 65 % | 0.68 | -187.76 | tp5 sl15 tr2 h96 (7 · 54.25 · 15.31) |
| Signals | follow | sig-keltner-s@m15 | 30 | 12 (40 %) | 444 | 67 % | 0.82 | -190.94 | tp8 sl24 tr3.2 h96 (10 · 197.17 · 20.97) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 15 (50 %) | 767 | 69 % | 0.89 | -198.84 | tp8 sl24 tr3.2 h96 (17 · ∞ (no loss) · 51.53) |
| Signals | follow | sig-keltner-m@m15 | 30 | 10 (33 %) | 341 | 68 % | 0.76 | -200.87 | tp3 sl9 tr1.2 h96 (20 · 2.75 · 16.97) |
| Signals | follow | sig-hma-s@m15 | 30 | 11 (37 %) | 1001 | 70 % | 0.91 | -207.83 | tp8 sl24 tr3.2 h96 (17 · ∞ (no loss) · 42.84) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 11 (37 %) | 761 | 66 % | 0.88 | -209.15 | tp6 sl18 tr3.6 h96 (17 · 2.36 · 32.97) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 11 (37 %) | 1008 | 69 % | 0.90 | -220.54 | tp5 sl15 tr2 h96 (39 · 4.10 · 49.43) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 10 (33 %) | 764 | 69 % | 0.87 | -223.22 | tp6 sl18 tr2.4 h96 (25 · 3.20 · 40.48) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 4 (13 %) | 224 | 63 % | 0.66 | -244.17 | tp4 sl6 tr0 h96 (8 · 1.02 · 0.40) |
| Signals | follow | sig-r-inside-s@m15 | 22 | 3 (14 %) | 119 | 56 % | 0.35 | -244.24 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 7.99) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 10 (33 %) | 340 | 64 % | 0.75 | -249.65 | tp8 sl24 tr3.2 h96 (7 · ∞ (no loss) · 34.00) |
| Signals | follow | sig-r-inside-m@m15 | 19 | 0 (0 %) | 35 | 0 % | 0.00 | -276.75 | – |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 11 (37 %) | 840 | 67 % | 0.86 | -278.34 | tp6 sl18 tr0 h96 (12 · 3.51 · 45.60) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 12 (40 %) | 1007 | 68 % | 0.87 | -294.76 | tp5 sl15 tr2 h96 (39 · 2.26 · 38.85) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 4 (13 %) | 320 | 63 % | 0.68 | -298.88 | tp5 sl10 tr0 h96 (7 · 1.18 · 3.60) |
| Signals | follow | sig-cci-m@m15 | 30 | 6 (20 %) | 377 | 64 % | 0.72 | -299.13 | tp6 sl18 tr2.4 h96 (13 · 1.70 · 12.89) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 6 (20 %) | 572 | 70 % | 0.77 | -309.61 | tp3 sl9 tr1.2 h96 (34 · 1.44 · 10.57) |
| Signals | follow | sig-r-connors-s@m15 | 29 | 3 (10 %) | 199 | 56 % | 0.42 | -311.13 | tp5 sl15 tr2 h96 (8 · 3564.00 · 8.37) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 10 (33 %) | 910 | 68 % | 0.86 | -315.90 | tp6 sl18 tr3.6 h96 (15 · 2.67 · 30.36) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 10 (33 %) | 910 | 68 % | 0.86 | -315.90 | tp6 sl18 tr3.6 h96 (15 · 2.67 · 30.36) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 9 (30 %) | 946 | 68 % | 0.85 | -339.97 | tp6 sl18 tr3.6 h96 (16 · 2.63 · 29.75) |
| Signals | follow | sig-sar-s@m15 | 30 | 11 (37 %) | 1077 | 68 % | 0.86 | -353.24 | tp8 sl24 tr3.2 h96 (19 · 246.46 · 45.24) |
| Signals | follow | sig-swing-m@m15 | 30 | 10 (33 %) | 712 | 67 % | 0.77 | -395.34 | tp5 sl15 tr0 h96 (12 · 1.58 · 17.60) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 11 (37 %) | 131 | 41 % | 0.29 | -402.11 | tp4 sl12 tr1.6 h96 (5 · 31.99 · 4.57) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 11 (37 %) | 577 | 62 % | 0.73 | -422.31 | tp4 sl12 tr1.6 h96 (23 · 3.08 · 26.37) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 9 (30 %) | 533 | 63 % | 0.71 | -425.18 | tp6 sl18 tr2.4 h96 (13 · 208.09 · 42.82) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 7 (23 %) | 456 | 62 % | 0.66 | -434.29 | tp6 sl18 tr3.6 h96 (9 · 1.49 · 8.90) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 9 (30 %) | 643 | 64 % | 0.72 | -435.62 | tp8 sl24 tr3.2 h96 (12 · 3.84 · 23.38) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 9 (30 %) | 900 | 67 % | 0.79 | -438.02 | tp6 sl18 tr2.4 h96 (30 · 3.38 · 44.92) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 9 (30 %) | 467 | 62 % | 0.64 | -458.15 | tp5 sl15 tr3 h96 (10 · ∞ (no loss) · 31.53) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 12 (40 %) | 734 | 65 % | 0.75 | -467.14 | tp8 sl24 tr3.2 h96 (15 · 915.24 · 26.42) |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 1 (3 %) | 321 | 58 % | 0.57 | -476.41 | tp6 sl18 tr3.6 h96 (9 · 1.09 · 1.99) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 8 (27 %) | 339 | 58 % | 0.54 | -479.95 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 18.35) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 9 (30 %) | 928 | 67 % | 0.76 | -525.13 | tp8 sl24 tr3.2 h96 (14 · 429.49 · 33.43) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 9 (30 %) | 722 | 65 % | 0.70 | -548.86 | tp8 sl24 tr4.8 h96 (7 · ∞ (no loss) · 24.39) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 5 (17 %) | 559 | 61 % | 0.62 | -568.64 | tp3 sl9 tr1.2 h96 (41 · 1.59 · 16.00) |
| Signals | follow | sig-trix-m@m15 | 30 | 0 (0 %) | 153 | 46 % | 0.26 | -573.00 | tp3 sl9 tr1.8 h96 (6 · 0.93 · -0.67) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 7 (23 %) | 606 | 63 % | 0.63 | -603.90 | tp8 sl24 tr3.2 h96 (11 · ∞ (no loss) · 18.54) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 7 (23 %) | 904 | 65 % | 0.74 | -612.78 | tp5 sl15 tr2 h96 (30 · 2.98 · 31.41) |
| Signals | follow | sig-swing-s@m15 | 30 | 11 (37 %) | 1007 | 66 % | 0.74 | -639.84 | tp8 sl24 tr4.8 h96 (11 · 118.55 · 38.91) |
| Signals | follow | sig-impulse-s@m15 | 30 | 7 (23 %) | 947 | 66 % | 0.73 | -649.25 | tp8 sl24 tr3.2 h96 (21 · 1.75 · 18.21) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 0 (0 %) | 111 | 26 % | 0.06 | -677.84 | tp3 sl6 tr0 h96 (5 · 0.30 · -13.00) |
| Signals | follow | sig-thrust-s@m15 | 30 | 5 (17 %) | 504 | 62 % | 0.52 | -688.26 | tp4 sl12 tr1.6 h96 (28 · 1.69 · 17.24) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 3 (10 %) | 305 | 55 % | 0.39 | -708.19 | tp4 sl12 tr1.6 h96 (16 · 0.81 · -4.62) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 2 (7 %) | 593 | 63 % | 0.59 | -718.19 | tp5 sl15 tr2 h96 (22 · 1.16 · 4.79) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 0 (0 %) | 130 | 19 % | 0.04 | -807.62 | tp3 sl9 tr1.2 h96 (7 · 0.43 · -7.02) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 5 (17 %) | 781 | 61 % | 0.60 | -819.16 | tp5 sl15 tr0 h96 (9 · 1.44 · 10.23) |
| Signals | follow | sig-cmf-m@m15 | 30 | 3 (10 %) | 737 | 61 % | 0.61 | -828.02 | tp8 sl24 tr3.2 h96 (11 · 4.87 · 22.29) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 0 (0 %) | 407 | 56 % | 0.43 | -828.37 | tp8 sl24 tr3.2 h96 (8 · 0.77 · -5.60) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 6 (20 %) | 892 | 63 % | 0.64 | -845.87 | tp8 sl24 tr3.2 h96 (11 · ∞ (no loss) · 23.22) |
| Signals | follow | sig-cmf-s@m15 | 30 | 5 (17 %) | 587 | 58 % | 0.53 | -876.49 | tp6 sl18 tr3.6 h96 (8 · ∞ (no loss) · 23.21) |
| Signals | follow | sig-sar-m@m15 | 30 | 1 (3 %) | 829 | 64 % | 0.63 | -889.50 | tp5 sl15 tr2 h96 (31 · 1.13 · 6.03) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 3 (10 %) | 501 | 55 % | 0.44 | -920.66 | tp8 sl24 tr3.2 h96 (7 · ∞ (no loss) · 15.22) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 5 (17 %) | 843 | 62 % | 0.61 | -962.47 | tp8 sl24 tr6.4 h96 (5 · ∞ (no loss) · 31.67) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 2 (7 %) | 345 | 49 % | 0.27 | -1041.34 | tp4 sl12 tr1.6 h96 (17 · 1.59 · 7.30) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 0 (0 %) | 450 | 52 % | 0.33 | -1086.71 | tp8 sl24 tr3.2 h96 (7 · 0.30 · -16.95) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 0 (0 %) | 524 | 55 % | 0.40 | -1187.98 | tp8 sl24 tr3.2 h96 (8 · 0.41 · -14.35) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 3 (10 %) | 673 | 54 % | 0.42 | -1249.11 | tp8 sl24 tr3.2 h96 (5 · ∞ (no loss) · 9.35) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 2 (7 %) | 667 | 55 % | 0.43 | -1316.22 | tp6 sl18 tr2.4 h96 (19 · 32.86 · 41.06) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 121 | 93 (77 %) | 2126 | 85 % | 1.70 | 1896.42 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 119 | 90 (76 %) | 1452 | 87 % | 1.90 | 1652.04 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 119 | 87 (73 %) | 1391 | 85 % | 1.68 | 1642.69 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 121 | 89 (74 %) | 2728 | 81 % | 1.37 | 1217.96 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 120 | 82 (68 %) | 1884 | 83 % | 1.35 | 1182.94 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 117 | 81 (69 %) | 973 | 83 % | 1.48 | 1149.72 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 117 | 82 (70 %) | 823 | 85 % | 1.58 | 1034.86 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 122 | 88 (72 %) | 3521 | 77 % | 1.21 | 897.33 |
| Signals | tp 6.000% | sl 3.00× | tr off | 116 | 71 (61 %) | 694 | 81 % | 1.36 | 848.24 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 115 | 74 (64 %) | 535 | 80 % | 1.49 | 830.36 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 122 | 79 (65 %) | 2534 | 78 % | 1.14 | 615.33 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 119 | 68 (57 %) | 1499 | 79 % | 1.11 | 427.98 |
| Short | tp 2.600% | sl 2.00× | tr off | 93 | 48 (52 %) | 395 | 73 % | 1.42 | 203.08 |
| Short | tp 2.800% | sl 2.00× | tr off | 86 | 39 (45 %) | 365 | 72 % | 1.40 | 190.15 |
| Short | tp 2.200% | sl 2.00× | tr off | 98 | 55 (56 %) | 670 | 72 % | 1.24 | 185.49 |
| Signals | tp 5.000% | sl 3.00× | tr off | 118 | 58 (49 %) | 1142 | 76 % | 1.03 | 140.76 |
| Short | tp 2.400% | sl 2.00× | tr off | 80 | 39 (49 %) | 464 | 71 % | 1.17 | 106.40 |
| Long | tp 6.400% | sl 1.00× | tr off | 54 | 13 (24 %) | 112 | 59 % | 1.37 | 93.66 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 65 | 28 (43 %) | 220 | 66 % | 1.28 | 75.35 |
| Long | tp 5.200% | sl 0.75× | tr off | 42 | 16 (38 %) | 81 | 54 % | 1.42 | 60.98 |
| Long | tp 6.000% | sl 1.00× | tr off | 41 | 11 (27 %) | 62 | 58 % | 1.44 | 60.48 |
| General | tp 3.200% | sl 1.00× | tr 0.75× | 82 | 25 (30 %) | 245 | 58 % | 1.21 | 59.94 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 100 | 46 (46 %) | 447 | 68 % | 1.14 | 57.78 |
| Long | tp 4.800% | sl 1.00× | tr 0.50× | 64 | 25 (39 %) | 199 | 66 % | 1.21 | 56.21 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 121 | 60 (50 %) | 2004 | 76 % | 1.01 | 54.68 |
| General | tp 4.000% | sl 1.00× | tr 0.75× | 41 | 12 (29 %) | 98 | 67 % | 1.47 | 53.06 |
| General | tp 4.000% | sl 1.00× | tr off | 31 | 11 (35 %) | 78 | 60 % | 1.38 | 48.19 |
| General | tp 4.400% | sl 0.50× | tr off | 18 | 8 (44 %) | 39 | 54 % | 2.04 | 45.00 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 82 | 38 (46 %) | 276 | 67 % | 1.12 | 42.70 |
| Long | tp 5.200% | sl 1.00× | tr off | 40 | 13 (33 %) | 97 | 55 % | 1.18 | 36.52 |
| General | tp 4.400% | sl 1.00× | tr off | 38 | 13 (34 %) | 151 | 54 % | 1.11 | 32.51 |
| Long | tp 6.400% | sl 1.00× | tr 0.50× | 38 | 14 (37 %) | 78 | 65 % | 1.31 | 30.46 |
| Short | tp 1.800% | sl 2.00× | tr 0.75× | 118 | 48 (41 %) | 860 | 60 % | 1.03 | 29.05 |
| Short | tp 2.600% | sl 1.50× | tr off | 68 | 29 (43 %) | 405 | 63 % | 1.05 | 28.78 |
| Short | tp 2.800% | sl 1.50× | tr off | 60 | 24 (40 %) | 415 | 63 % | 1.04 | 27.54 |
| General | tp 4.400% | sl 0.75× | tr off | 38 | 13 (34 %) | 67 | 51 % | 1.24 | 27.52 |
| General | tp 3.600% | sl 1.00× | tr off | 42 | 12 (29 %) | 82 | 56 % | 1.21 | 26.82 |
| Long | tp 5.600% | sl 0.50× | tr off | 25 | 5 (20 %) | 46 | 43 % | 1.34 | 26.14 |
| General | tp 3.200% | sl 0.50× | tr off | 32 | 11 (34 %) | 82 | 44 % | 1.29 | 24.16 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 100 | 40 (40 %) | 350 | 66 % | 1.05 | 21.67 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 5.000% | sl 1.50× | tr off | 121 | 11 (9 %) | 1981 | 48 % | 0.58 | -3310.79 |
| Signals | tp 3.000% | sl 1.50× | tr off | 122 | 15 (12 %) | 4167 | 52 % | 0.65 | -3272.40 |
| Signals | tp 6.000% | sl 1.50× | tr off | 121 | 20 (17 %) | 1405 | 47 % | 0.55 | -3071.35 |
| Signals | tp 2.500% | sl 1.50× | tr off | 122 | 14 (11 %) | 5069 | 54 % | 0.67 | -3022.55 |
| Signals | tp 4.000% | sl 1.50× | tr off | 121 | 24 (20 %) | 2996 | 53 % | 0.70 | -2558.85 |
| Signals | tp 2.500% | sl 2.00× | tr off | 122 | 15 (12 %) | 4430 | 62 % | 0.72 | -2493.50 |
| Signals | tp 3.000% | sl 2.00× | tr off | 122 | 27 (22 %) | 3518 | 61 % | 0.71 | -2409.73 |
| Signals | tp 4.000% | sl 2.00× | tr off | 121 | 24 (20 %) | 2373 | 60 % | 0.71 | -2249.02 |
| Signals | tp 2.500% | sl 3.00× | tr off | 122 | 28 (23 %) | 3557 | 72 % | 0.76 | -1894.23 |
| Signals | tp 5.000% | sl 2.00× | tr off | 120 | 38 (32 %) | 1492 | 62 % | 0.75 | -1446.69 |
| Signals | tp 3.000% | sl 3.00× | tr off | 121 | 35 (29 %) | 2672 | 72 % | 0.79 | -1446.23 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 122 | 37 (30 %) | 3057 | 70 % | 0.79 | -1402.85 |
| Signals | tp 6.000% | sl 2.00× | tr off | 120 | 32 (27 %) | 1026 | 61 % | 0.73 | -1330.16 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 122 | 42 (34 %) | 3676 | 72 % | 0.82 | -1154.47 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 122 | 47 (39 %) | 4799 | 70 % | 0.86 | -837.25 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 74 (74) | 43896 | 17954 | 17954 | 0 | baseTarget 25942 |
| Micro | trailing | 74 (74) | 87792 | 35908 | 35908 | 0 | baseTarget 51884 |
| Short | normal | 251 (221) | 40104 | 16446 | 16446 | 0 | baseTarget 10950 · baseRange 12708 |
| Short | trailing | 251 (221) | 80208 | 32892 | 32892 | 0 | baseTarget 21900 · baseRange 25416 |
| General | normal | 251 (201) | 26736 | 9630 | 9630 | 0 | baseRange 12864 · baseTarget 4242 |
| General | trailing | 251 (201) | 17824 | 6420 | 6420 | 0 | baseRange 8576 · baseTarget 2828 |
| Long | normal | 251 (204) | 33420 | 12792 | 12792 | 0 | baseTarget 4848 · baseRange 15780 |
| Long | trailing | 251 (204) | 22280 | 8528 | 8528 | 0 | baseTarget 3232 · baseRange 10520 |
| Wide | axis | 325 (325) | 58545 | 58545 | 58545 | 0 | – |
| Wide | dca | 325 (325) | 5204 | 5204 | 5204 | 0 | – |
| Wide | dca-active | 325 (325) | 5204 | 5204 | 5204 | 0 | – |

Engine indications Base evaluated that built no set: 66 (bb-bounce-20-3, bb-walk, break-atr, break-atr-0.9, break-atr-1.5, dir-vwap-30, ema-slope-20-3, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-brk-20, mc-burst-3, mc-engulf-20, mc-macdh, mc-qburst-2, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-25, mc-rsi4-15, mc-rsi4-25, mc-rsi4-5, mc-rsi5-25, mc-rsi7-20, mc-rsi9-15, mc-rsi9-25, mc-rsit14-25, mc-rsit14-30, mc-rsit2-5, mc-rsit3-5, mc-rsit4-20, mc-rsit4-25, mc-rsit4-5, mc-rsit5-10, mc-rsit5-25, mc-rsit5-30, mc-rsit7-15, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.19 (850) | 0.25 (886) | 0.37 (1268) | 0.40 (1442) | 0.47 (1744) |
| 1.14× | – | 0.20 (600) | – | – | – | – | – |
| 1.25× | – | 0.19 (594) | 0.20 (844) | 0.30 (874) | 0.41 (1246) | 0.46 (1420) | 0.53 (1714) |
| 1.33× | 0.16 (432) | – | – | – | – | – | – |
| 1.5× | 0.16 (426) | 0.19 (588) | 0.25 (826) | 0.33 (862) | 0.46 (1228) | 0.49 (1408) | 0.52 (1712) |
| 1.75× | 0.17 (420) | 0.25 (576) | 0.34 (820) | 0.48 (856) | 0.45 (1228) | 0.46 (1408) | 0.48 (1706) |
| 2× | 0.19 (408) | 0.26 (570) | 0.39 (814) | 0.43 (856) | 0.42 (1228) | 0.44 (1396) | 0.49 (1706) |
| 2.25× | 0.22 (404) | 0.31 (570) | 0.35 (814) | 0.42 (856) | 0.41 (1216) | 0.46 (1396) | 0.45 (1706) |
| 2.5× | 0.22 (404) | 0.29 (570) | 0.34 (818) | 0.40 (850) | 0.43 (1216) | 0.43 (1394) | 0.45 (1690) |
| 2.75× | 0.24 (404) | 0.27 (570) | 0.33 (808) | 0.42 (850) | 0.41 (1214) | 0.45 (1380) | 0.47 (1690) |
| 3× | 0.22 (404) | 0.29 (564) | 0.36 (808) | 0.41 (874) | 0.42 (1200) | 0.51 (1380) | 0.45 (1684) |
| 3.25× | 0.21 (404) | 0.27 (564) | 0.33 (808) | 0.44 (866) | 0.46 (1200) | 0.49 (1374) | 0.48 (1684) |
| 3.5× | 0.25 (398) | 0.29 (564) | 0.33 (810) | 0.42 (866) | 0.46 (1194) | 0.50 (1374) | 0.52 (1660) |
| 3.75× | 0.24 (398) | 0.28 (564) | 0.36 (810) | 0.39 (866) | 0.46 (1194) | 0.52 (1356) | 0.51 (1660) |
| 4× | 0.25 (398) | 0.28 (558) | 0.35 (818) | 0.38 (860) | 0.43 (1194) | 0.51 (1356) | 0.52 (1660) |
| 4.25× | 0.24 (398) | 0.32 (558) | 0.33 (810) | 0.48 (860) | 0.48 (1176) | 0.49 (1356) | 0.51 (1660) |
| 4.5× | 0.23 (398) | 0.36 (558) | 0.31 (810) | 0.45 (860) | 0.45 (1176) | 0.50 (1356) | 0.52 (1660) |
| 4.75× | 0.24 (398) | 0.34 (558) | 0.38 (814) | 0.50 (848) | 0.45 (1176) | 0.50 (1356) | 0.50 (1660) |
| 5× | 0.27 (398) | 0.33 (558) | 0.37 (814) | 0.48 (848) | 0.44 (1172) | 0.50 (1356) | 0.50 (1648) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | 0.47 (28) | 0.57 (28) | 0.64 (28) | 1.22 (42) |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | 1.13 (28) | 0.74 (42) | 0.72 (42) | 0.64 (50) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | 0.28 (14) | 0.94 (28) | 0.76 (42) | 0.65 (42) | 0.64 (42) | 1.02 (46) |
| 1.75× | – | 0.33 (28) | 0.65 (42) | 0.68 (42) | 0.58 (42) | 0.57 (42) | 0.49 (50) |
| 2× | – | 0.30 (28) | 0.58 (42) | 0.61 (42) | 0.52 (42) | 0.39 (46) | 0.44 (50) |
| 2.25× | 0.25 (28) | 0.28 (28) | 0.53 (42) | 0.56 (42) | 0.36 (46) | 0.36 (46) | 0.31 (78) |
| 2.5× | 0.23 (28) | 0.26 (28) | 0.49 (42) | 0.51 (42) | 0.28 (52) | 0.25 (66) | 0.24 (78) |
| 2.75× | 0.21 (28) | 0.24 (28) | 0.45 (42) | 0.47 (42) | 0.40 (42) | 0.18 (74) | 0.29 (97) |
| 3× | 0.20 (28) | 0.22 (28) | 0.42 (42) | 0.44 (42) | 0.23 (50) | 0.20 (72) | 0.25 (82) |
| 3.25× | 0.19 (28) | 0.21 (28) | 0.39 (42) | 0.25 (50) | 0.27 (84) | 0.19 (72) | 0.33 (90) |
| 3.5× | 0.17 (28) | 0.20 (28) | 0.37 (42) | 0.17 (58) | 0.25 (84) | 0.27 (86) | 0.30 (123) |
| 3.75× | 0.17 (28) | 0.12 (70) | 0.22 (50) | 0.16 (58) | 0.29 (110) | 0.26 (119) | 0.26 (125) |
| 4× | 0.16 (28) | 0.11 (70) | 0.16 (58) | 0.15 (64) | 0.28 (110) | 0.26 (119) | 0.27 (130) |
| 4.25× | 0.10 (66) | 0.11 (76) | 0.15 (58) | 0.24 (70) | 0.33 (108) | 0.31 (106) | 0.26 (130) |
| 4.5× | 0.11 (84) | 0.22 (76) | 0.15 (64) | 0.21 (98) | 0.32 (108) | 0.30 (106) | 0.29 (120) |
| 4.75× | 0.10 (84) | 0.24 (106) | 0.23 (68) | 0.22 (98) | 0.30 (108) | 0.27 (113) | 0.28 (120) |
| 5× | 0.10 (84) | 0.23 (106) | 0.24 (72) | 0.25 (116) | 0.29 (111) | 0.41 (145) | 0.32 (122) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | 0.00 (2) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | 0.00 (1) |
| 1.75× | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | – |
| 2.25× | – | – | – | – | – | – | – |
| 2.5× | – | – | – | – | – | 0.00 (2) | – |
| 2.75× | – | – | – | – | – | – | 0.18 (5) |
| 3× | – | – | – | – | – | 0.00 (2) | 0.12 (6) |
| 3.25× | – | – | – | – | – | – | 0.55 (6) |
| 3.5× | – | – | – | – | 12.42 (4) | 0.00 (1) | 0.87 (6) |
| 3.75× | – | 0.10 (4) | – | – | 12.42 (4) | 0.15 (2) | 0.82 (6) |
| 4× | – | – | – | – | – | 0.15 (2) | 0.77 (6) |
| 4.25× | – | 0.09 (2) | – | – | 12.42 (4) | 0.14 (2) | 0.15 (2) |
| 4.5× | – | – | – | 0.00 (1) | – | – | ∞ (1) |
| 4.75× | – | – | – | 0.00 (1) | – | – | ∞ (3) |
| 5× | – | – | – | 5.73 (10) | ∞ (1) | – | ∞ (1) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.74 (23596) | 0.74 (25499) | 0.73 (23029) | 0.75 (16836) | 0.76 (18865) | 0.78 (22361) |
| 1.5× | 0.84 (21361) | 0.85 (23129) | 0.85 (20492) | 0.93 (14777) | 0.90 (16668) | 0.99 (19396) |
| 2× | 0.98 (19808) | 0.94 (21093) | 0.96 (18788) | 1.08 (13627) | 1.09 (15358) | 1.22 (18127) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.87 (859) | 0.79 (2453) | 0.73 (1534) | 0.81 (1543) | 0.75 (1249) | 0.76 (1204) |
| 1.5× | 0.88 (1913) | 0.86 (2245) | 0.83 (2289) | 0.89 (1054) | 0.92 (1091) | 1.01 (1034) |
| 2× | 0.96 (2159) | 0.91 (2445) | 1.09 (1748) | 1.02 (1256) | 1.12 (1085) | 1.23 (1088) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.55 (106) | 0.48 (224) | 0.38 (170) | 0.37 (184) | 0.41 (194) | 0.37 (192) |
| 1.5× | 0.54 (223) | 0.37 (214) | 0.44 (273) | 0.34 (181) | 0.44 (174) | 0.53 (174) |
| 2× | 0.58 (306) | 0.56 (250) | 0.42 (291) | 0.37 (206) | 0.46 (240) | 0.65 (223) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.79 (5425) | 0.84 (4494) | 0.83 (4496) | 0.82 (4359) |
| 0.75× | 0.88 (4932) | 0.88 (3810) | 0.94 (3830) | 0.97 (3545) |
| 1× | 0.89 (13507) | 0.91 (10511) | 0.89 (10475) | 0.91 (9882) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.29 (82) | 1.45 (43) | 1.09 (49) | 2.04 (39) |
| 0.75× | 1.01 (298) | 0.98 (245) | 1.07 (176) | 1.24 (67) |
| 1× | 0.90 (1037) | 0.93 (646) | 1.12 (464) | 1.16 (454) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.46 (15) | 1.02 (8) | 1.15 (5) | ∞ (4) |
| 0.75× | 0.41 (23) | 0.39 (32) | 0.54 (32) | 1.00 (11) |
| 1× | 0.44 (93) | 0.73 (58) | 0.69 (44) | 0.86 (38) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.80 (4450) | 0.88 (4009) | 0.83 (4258) | 0.84 (3869) | 0.83 (4416) |
| 0.75× | 1.00 (3560) | 1.00 (3267) | 0.96 (3511) | 0.94 (3140) | 0.91 (3570) |
| 1× | 0.96 (9862) | 0.99 (8902) | 0.90 (9489) | 0.89 (8373) | 0.87 (9738) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.18 (35) | 1.10 (21) | 1.34 (46) | 1.15 (38) | 0.78 (56) |
| 0.75× | 0.92 (78) | 1.42 (81) | 1.07 (54) | 0.88 (96) | 0.98 (161) |
| 1× | 1.10 (451) | 0.97 (239) | 0.99 (129) | 1.02 (200) | 1.13 (270) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.25 (16) | 0.67 (11) | 0.72 (7) | 0.60 (8) | 0.73 (7) |
| 0.75× | 0.61 (12) | 0.41 (8) | 0.49 (7) | 1.23 (4) | 0.62 (15) |
| 1× | 0.45 (46) | 0.50 (35) | 0.52 (31) | 0.66 (29) | 0.69 (31) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.60 (62617) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.52 (1940) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.68 (68390) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.61 (1827) | 0.56 (2486) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.59 (1765) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.60 (2358) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.69 (2318) | – | – | – | – |
| 1× | – | – | – | 0.64 (317297) | – | – | – | 0.65 (79635) | 0.58 (11141) | – | 0.77 (3136) | – | 0.75 (10366) | 0.86 (9612) | 1.05 (2818) | 1.04 (2645) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.47 (1344) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.77 (185) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.91 (128) | – | – | – | 0.47 (63) | – | – | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.51 (61) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.13 (18) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.47 (25) | – | – | – | – | – | – | – | – | – | – | – | – |
