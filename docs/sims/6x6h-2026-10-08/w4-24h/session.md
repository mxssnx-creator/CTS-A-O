# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.40–$2.29 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-06T06:00 → 2026-10-07T06:00 UTC. Engine: Base 1162/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 310/19072 · PF 1.57 · Micro 85/5900 · PF 2.75 · Short 509/8176 · PF 1.50 · General 441/8176 · PF 1.49 · Long 539/8176 · PF 1.46 · Signals 126/126; Main 1089 pairs, 164642 tapes, Real seats: 4529 engine configs + 3780 signal configs (every config of the active signals), compute 300 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $22.13 (10.63 %, closed orders) · equity at end $20.08 (open at end: 55 positions / 9659 orders, MTM -$2.05 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.50 (gross profit $ ÷ gross loss $ as sized) · PF unit 1.34 (every order at one unit: the engine's PF) · 89 positions / 19356 orders (incl. 381 capped to $0) · WR 69.82 % · DDT (closed trades, $) 10.25 h · DDR 0.31 · equity max drawdown $2.45 (11.31 %) · margin used max $15.52 · open avg 41.77 pos / 4430.51 orders (peak 54 / 7608)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 381 orders capped to $0, 18875 scaled down (open at end: 42 capped, 9617 scaled) · binding: position cap 12315, gross cap 28011. **Without the caps:** balance $20.00 → $113.31 (466.54 %) · PF $ 1.40 · equity at end -$30.64 · equity max drawdown $136.29 (399.18 %) · margin used max $1232.87 · infeasible: margin exceeded equity for 1411 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 447 | 998  | 4.0 % | 1.558 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 447 | 998 (+0) | 4.0 % | 1.558 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 447 | 998 (+0) | 4.0 % | 1.558 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 413 | 893 (-105) | 3.6 % | 1.579 |
| closes ≥ 6 | 1.00 | 6 | 1 | 649 | 1332 (+334) | 5.3 % | 1.761 |
| closes ≥ 20 | 1.00 | 20 | 1 | 340 | 749 (-249) | 3.0 % | 1.460 |
| closes ≥ 30 | 1.00 | 30 | 1 | 264 | 604 (-394) | 2.4 % | 1.394 |
| DDR off | 1.00 | 12 | off | 1653 | 2485 (+1487) | 10.0 % | 1.145 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 811 | 1507 (+509) | 6.0 % | 1.333 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 179 | 445 (-553) | 1.8 % | 1.877 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1653 | 2485 (+1487) | 10.0 % | 1.145 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2067 | 2991 (+1993) | 12.0 % | 1.179 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 1 / 2 | 2 / 0 | ∞ (no loss) | ∞ (no loss) | 100 % | $0.01 | $20.01 | $19.84 | $19.77 | 1.88 % | 0.20 | $14.01 | 14 / 1378 |
| 07:00 | 3 / 144 | 101 / 43 | 3.72 | 1.26 | 70 % | $0.10 | $20.12 | $21.16 | $19.73 | 2.06 % | 0.02 | $14.08 | 25 / 2356 |
| 08:00 | 2 / 305 | 246 / 59 | 3.68 | 1.63 | 81 % | $0.18 | $20.30 | $21.46 | $21.03 | 2.06 % | 0.22 | $14.21 | 32 / 3117 |
| 09:00 | 4 / 389 | 306 / 83 | 1.31 | 1.14 | 79 % | $0.05 | $20.35 | $20.80 | $20.00 | 7.73 % | 0.95 | $14.32 | 34 / 3900 |
| 10:00 | 0 / 169 | 122 / 47 | 6.10 | 1.30 | 72 % | $0.14 | $20.49 | $21.31 | $20.74 | 7.73 % | 1.95 | $14.34 | 38 / 4656 |
| 11:00 | 2 / 668 | 518 / 150 | 1.56 | 2.08 | 78 % | $0.08 | $20.56 | $21.51 | $20.99 | 7.73 % | 2.95 | $14.39 | 39 / 4818 |
| 12:00 | 2 / 337 | 247 / 90 | 4.10 | 1.15 | 73 % | $0.23 | $20.79 | $21.36 | $21.22 | 7.73 % | 3.95 | $14.56 | 40 / 5897 |
| 13:00 | 0 / 463 | 261 / 202 | 1.24 | 1.58 | 56 % | $0.01 | $20.80 | $21.24 | $21.23 | 7.73 % | 4.95 | $14.57 | 43 / 6907 |
| 14:00 | 1 / 903 | 805 / 98 | 3.53 | 6.51 | 89 % | $0.25 | $21.05 | $21.33 | $20.65 | 7.73 % | 5.95 | $14.73 | 44 / 7422 |
| 15:00 | 1 / 884 | 812 / 72 | 9.29 | 9.46 | 92 % | $0.30 | $21.35 | $20.75 | $20.72 | 7.73 % | 6.95 | $14.94 | 45 / 7745 |
| 16:00 | 0 / 937 | 372 / 565 | 0.51 | 0.39 | 40 % | -$0.13 | $21.22 | $20.09 | $20.09 | 7.73 % | 7.95 | $14.94 | 46 / 8133 |
| 17:00 | 0 / 675 | 332 / 343 | 0.23 | 0.36 | 49 % | -$0.47 | $20.74 | $19.33 | $19.25 | 11.18 % | 8.95 | $14.85 | 49 / 8346 |
| 18:00 | 0 / 643 | 454 / 189 | 0.85 | 1.16 | 71 % | -$0.01 | $20.73 | $19.62 | $19.38 | 11.18 % | 9.95 | $14.53 | 49 / 8733 |
| 19:00 | 0 / 519 | 300 / 219 | 0.67 | 0.75 | 58 % | -$0.04 | $20.69 | $19.87 | $19.51 | 11.18 % | 10.95 | $14.51 | 51 / 9622 |
| 20:00 | 1 / 480 | 373 / 107 | 1.25 | 1.94 | 78 % | $0.01 | $20.70 | $19.94 | $19.84 | 11.18 % | 11.95 | $14.49 | 52 / 10540 |
| 21:00 | 0 / 644 | 507 / 137 | 2.34 | 2.28 | 79 % | $0.06 | $20.76 | $19.93 | $19.75 | 11.18 % | 12.95 | $14.53 | 52 / 10982 |
| 22:00 | 1 / 542 | 292 / 250 | 2.55 | 2.25 | 54 % | $0.13 | $20.89 | $19.97 | $19.85 | 11.18 % | 13.95 | $14.62 | 53 / 11477 |
| 23:00 | 0 / 321 | 211 / 110 | 0.90 | 1.05 | 66 % | -$0.00 | $20.89 | $19.69 | $19.68 | 11.18 % | 14.95 | $14.63 | 54 / 12283 |
| 00:00 | 1 / 916 | 679 / 237 | 2.99 | 1.76 | 74 % | $0.16 | $21.05 | $19.83 | $19.67 | 11.18 % | 15.95 | $14.73 | 53 / 12333 |
| 01:00 | 0 / 1572 | 1188 / 384 | 1.54 | 1.62 | 76 % | $0.11 | $21.16 | $20.01 | $19.38 | 11.18 % | 16.95 | $14.81 | 53 / 11998 |
| 02:00 | 6 / 5290 | 3514 / 1776 | 1.43 | 1.19 | 66 % | $0.60 | $21.76 | $19.45 | $19.32 | 11.18 % | 17.95 | $15.23 | 52 / 8398 |
| 03:00 | 1 / 626 | 384 / 242 | 1.56 | 0.86 | 61 % | $0.10 | $21.85 | $19.41 | $19.22 | 11.31 % | 18.95 | $15.32 | 54 / 9137 |
| 04:00 | 0 / 895 | 730 / 165 | 1.95 | 2.54 | 82 % | $0.14 | $21.99 | $19.92 | $19.39 | 11.31 % | 19.95 | $15.39 | 56 / 9846 |
| 05:00 | 1 / 1032 | 759 / 273 | 1.49 | 1.19 | 74 % | $0.13 | $22.13 | $20.08 | $19.71 | 11.31 % | 20.95 | $15.52 | 55 / 9659 |

**Last hour (05:00):** open at end: 55 positions / 9659 orders, MTM -$2.05 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $20.08 = balance $22.13 + MTM -$2.05.

**Hours positive:** 19 of 24 full hours · flat 0 · negative 5

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 06:00 | – | – | – | – | 2 · ∞ (no loss) · $0.01 |
| 07:00 | 6 · 0.00 · -$0.00 | – | 121 · 3.84 · $0.10 | 17 · 0.88 · -$0.00 | – |
| 08:00 | – | – | 222 · 2.50 · $0.10 | 45 · 83.89 · $0.08 | 38 · ∞ (no loss) · $0.00 |
| 09:00 | 3 · – · $0.00 | – | 252 · 1.25 · $0.03 | 56 · 115.37 · $0.02 | 78 · 0.02 · -$0.01 |
| 10:00 | 3 · ∞ (no loss) · $0.00 | – | 140 · 6.23 · $0.13 | 11 · 5.88 · $0.01 | 15 · 3.27 · $0.00 |
| 11:00 | – | – | 627 · 1.52 · $0.07 | 18 · 3.39 · $0.01 | 23 · 1.07 · $0.00 |
| 12:00 | – | – | 248 · 4.19 · $0.23 | 40 · 4.49 · $0.00 | 49 · 0.81 · -$0.00 |
| 13:00 | – | – | 246 · 0.76 · -$0.01 | 156 · 13.32 · $0.02 | 61 · 1.70 · $0.00 |
| 14:00 | 3 · – · $0.00 | – | 824 · 3.28 · $0.22 | 38 · 9.56 · $0.01 | 38 · 14.59 · $0.03 |
| 15:00 | 3 · ∞ (no loss) · $0.00 | – | 778 · 8.04 · $0.23 | 40 · 4.50 · $0.01 | 63 · 30.73 · $0.07 |
| 16:00 | – | – | 650 · 0.57 · -$0.10 | 99 · 0.13 · -$0.01 | 188 · 0.08 · -$0.02 |
| 17:00 | 6 · ∞ (no loss) · $0.00 | – | 527 · 0.12 · -$0.53 | 55 · 0.41 · -$0.01 | 87 · 217.17 · $0.06 |
| 18:00 | 3 · ∞ (no loss) · $0.00 | – | 397 · 0.78 · -$0.02 | 125 · 2.03 · $0.01 | 118 · 0.73 · -$0.00 |
| 19:00 | – | – | 372 · 0.69 · -$0.03 | 73 · 0.43 · -$0.00 | 74 · 0.67 · -$0.00 |
| 20:00 | 6 · ∞ (no loss) · $0.00 | – | 415 · 1.21 · $0.01 | 36 · 4.10 · $0.00 | 23 · 1.63 · $0.00 |
| 21:00 | – | – | 555 · 2.38 · $0.06 | 67 · 1.24 · $0.00 | 22 · 8.96 · $0.00 |
| 22:00 | – | – | 347 · 5.53 · $0.12 | 107 · 1.13 · $0.01 | 88 · 0.69 · -$0.00 |
| 23:00 | – | – | 289 · 0.96 · -$0.00 | 25 · 0.24 · -$0.00 | 7 · 0.00 · -$0.00 |
| 00:00 | – | – | 813 · 2.61 · $0.13 | 75 · 9.15 · $0.03 | 28 · ∞ (no loss) · $0.01 |
| 01:00 | – | 3 · ∞ (no loss) · $0.00 | 1422 · 1.58 · $0.11 | 66 · 0.74 · -$0.00 | 81 · 1.94 · $0.01 |
| 02:00 | – | – | 4842 · 1.73 · $0.83 | 301 · 0.16 · -$0.13 | 147 · 0.03 · -$0.09 |
| 03:00 | – | – | 446 · 1.74 · $0.10 | 57 · 0.23 · -$0.02 | 123 · 4.54 · $0.01 |
| 04:00 | – | – | 814 · 1.91 · $0.13 | 22 · 2.69 · $0.00 | 59 · 245.75 · $0.00 |
| 05:00 | – | – | 964 · 1.52 · $0.13 | 41 · 0.43 · -$0.01 | 27 · 9.93 · $0.01 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 2 | – | 2 · ∞ (no loss) · 100 % · $0.01 | – | – | – | – |
| 07:00 | 144 | 7 · 0.00 · 14 % · -$0.00 | 19 · 1.20 · 47 % · $0.00 | 61 · 3.88 · 75 % · $0.05 | 57 · 3.78 · 79 % · $0.06 | – | 118 · 3.83 · 77 % · $0.10 |
| 08:00 | 305 | 59 · ∞ (no loss) · 100 % · $0.08 | 55 · 13.60 · 89 % · $0.02 | 91 · 2.61 · 68 % · $0.07 | 100 · 1.86 · 76 % · $0.02 | – | 191 · 2.32 · 72 % · $0.09 |
| 09:00 | 389 | 14 · 0.73 · 79 % · -$0.00 | 179 · 5.10 · 80 % · $0.03 | 60 · 1.21 · 72 % · $0.01 | 136 · 1.09 · 80 % · $0.01 | – | 196 · 1.13 · 78 % · $0.02 |
| 10:00 | 169 | 23 · 43.95 · 78 % · $0.13 | 22 · 2.96 · 59 % · $0.00 | 77 · 0.80 · 71 % · -$0.00 | 47 · 2.95 · 77 % · $0.01 | – | 124 · 1.21 · 73 % · $0.00 |
| 11:00 | 668 | 20 · 1.36 · 35 % · $0.00 | 39 · 1.52 · 46 % · $0.00 | 299 · 1.25 · 76 % · $0.02 | 310 · 2.46 · 86 % · $0.05 | – | 609 · 1.58 · 81 % · $0.07 |
| 12:00 | 337 | 93 · 66.61 · 90 % · $0.14 | 62 · 80.00 · 74 % · $0.08 | 98 · 1.36 · 64 % · $0.01 | 84 · 0.78 · 64 % · -$0.01 | – | 182 · 1.10 · 64 % · $0.01 |
| 13:00 | 463 | 62 · 30.43 · 82 % · $0.02 | 181 · 1.16 · 29 % · $0.00 | 105 · 0.52 · 66 % · -$0.01 | 115 · 1.06 · 77 % · $0.00 | – | 220 · 0.69 · 71 % · -$0.01 |
| 14:00 | 903 | 57 · 2.08 · 44 % · $0.01 | 100 · 6953.23 · 93 % · $0.06 | 409 · 1.74 · 91 % · $0.06 | 337 · 13.67 · 93 % · $0.12 | – | 746 · 3.01 · 92 % · $0.17 |
| 15:00 | 884 | 51 · 15.19 · 73 % · $0.06 | 120 · 5.86 · 87 % · $0.01 | 343 · 6.07 · 92 % · $0.10 | 370 · 14.29 · 96 % · $0.13 | – | 713 · 8.73 · 94 % · $0.23 |
| 16:00 | 937 | 213 · 0.00 · 1 % · -$0.06 | 236 · 0.47 · 29 % · -$0.01 | 284 · 0.63 · 54 % · -$0.04 | 204 · 0.77 · 72 % · -$0.02 | – | 488 · 0.69 · 61 % · -$0.06 |
| 17:00 | 675 | 126 · 0.03 · 23 % · -$0.25 | 123 · 0.37 · 67 % · -$0.12 | 213 · 0.21 · 34 % · -$0.10 | 213 · 0.91 · 69 % · -$0.00 | – | 426 · 0.36 · 52 % · -$0.10 |
| 18:00 | 643 | 84 · 2.67 · 82 % · $0.01 | 279 · 0.88 · 66 % · -$0.00 | 124 · 0.79 · 69 % · -$0.01 | 156 · 0.73 · 74 % · -$0.01 | – | 280 · 0.76 · 72 % · -$0.02 |
| 19:00 | 519 | 43 · 0.08 · 28 % · -$0.01 | 168 · 0.26 · 32 % · -$0.02 | 145 · 1.19 · 74 % · $0.01 | 163 · 0.70 · 79 % · -$0.01 | – | 308 · 0.90 · 76 % · -$0.01 |
| 20:00 | 480 | 54 · 7.20 · 76 % · $0.00 | 57 · 0.38 · 33 % · -$0.00 | 171 · 2.28 · 87 % · $0.02 | 198 · 0.75 · 83 % · -$0.01 | – | 369 · 1.22 · 85 % · $0.01 |
| 21:00 | 644 | 71 · 2.19 · 72 % · $0.00 | 79 · 7.12 · 78 % · $0.00 | 238 · 2.45 · 72 % · $0.03 | 256 · 2.16 · 87 % · $0.03 | – | 494 · 2.29 · 80 % · $0.05 |
| 22:00 | 542 | 214 · 1.91 · 29 % · $0.05 | 100 · 4.00 · 30 % · $0.05 | 97 · 2.66 · 88 % · $0.01 | 131 · 13.40 · 89 % · $0.01 | – | 228 · 4.67 · 88 % · $0.02 |
| 23:00 | 321 | 17 · 0.10 · 18 % · -$0.00 | 17 · 0.13 · 24 % · -$0.00 | 110 · 0.54 · 43 % · -$0.01 | 177 · 2.05 · 89 % · $0.01 | – | 287 · 0.96 · 71 % · -$0.00 |
| 00:00 | 916 | 105 · 32.33 · 97 % · $0.12 | 58 · 9.85 · 86 % · $0.02 | 375 · 1.15 · 67 % · $0.01 | 378 · 1.88 · 73 % · $0.02 | – | 753 · 1.34 · 70 % · $0.03 |
| 01:00 | 1572 | 111 · 0.83 · 73 % · -$0.00 | 144 · 3.84 · 85 % · $0.01 | 709 · 1.35 · 73 % · $0.05 | 608 · 2.24 · 77 % · $0.06 | – | 1317 · 1.57 · 75 % · $0.11 |
| 02:00 | 5290 | 394 · 0.00 · 3 % · -$0.39 | 486 · 0.90 · 37 % · -$0.02 | 2446 · 1.56 · 67 % · $0.30 | 1964 · 3.79 · 85 % · $0.70 | – | 4410 · 2.26 · 75 % · $1.00 |
| 03:00 | 626 | 78 · 7.74 · 63 % · $0.12 | 183 · 2.85 · 60 % · $0.02 | 187 · 0.38 · 49 % · -$0.08 | 178 · 4.93 · 75 % · $0.04 | – | 365 · 0.69 · 62 % · -$0.04 |
| 04:00 | 895 | 71 · 0.39 · 68 % · -$0.02 | 204 · 0.28 · 78 % · -$0.04 | 326 · 4.23 · 87 % · $0.12 | 294 · 4.02 · 82 % · $0.07 | – | 620 · 4.15 · 84 % · $0.20 |
| 05:00 | 1032 | 72 · 1.59 · 79 % · $0.01 | 63 · 0.25 · 78 % · -$0.02 | 484 · 1.26 · 70 % · $0.04 | 413 · 2.47 · 76 % · $0.10 | – | 897 · 1.63 · 73 % · $0.15 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1036 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (164642 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (10497); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | 12722 · 0.73 | 1551 · 0.94 | 2193 · 0.76 | 772 · 7.41 | 2 · ∞ (no loss) | – | 2 · ∞ (no loss) | – | – |
| 07:00 | 29296 · 0.58 | 7535 · 0.66 | 8541 · 0.57 | 4018 · 4.10 | 144 · 1.26 | 7 · 0.19 | 19 · 1.20 | – | 118 · 1.30 |
| 08:00 | 46379 · 0.68 | 10828 · 0.56 | 16403 · 0.81 | 2326 · 1.51 | 305 · 1.63 | 59 · ∞ (no loss) | 55 · 11.85 | – | 191 · 1.04 |
| 09:00 | 33533 · 1.05 | 5789 · 0.84 | 12451 · 1.18 | 3856 · 3.96 | 389 · 1.14 | 14 · 0.83 | 179 · 2.48 | – | 196 · 1.04 |
| 10:00 | 36618 · 1.13 | 9400 · 1.09 | 12528 · 0.97 | 1569 · 1.68 | 169 · 1.30 | 23 · 2.60 | 22 · 2.27 | – | 124 · 1.13 |
| 11:00 | 34059 · 0.95 | 10242 · 0.94 | 12733 · 1.02 | 4485 · 1.44 | 668 · 2.08 | 20 · 0.28 | 39 · 3.53 | – | 609 · 2.17 |
| 12:00 | 31381 · 0.92 | 7963 · 1.06 | 10127 · 1.26 | 2346 · 1.12 | 337 · 1.15 | 93 · 11.30 | 62 · 2.00 | – | 182 · 0.66 |
| 13:00 | 34661 · 0.80 | 6840 · 1.14 | 11686 · 0.83 | 3144 · 2.21 | 463 · 1.58 | 62 · 5.39 | 181 · 1.54 | – | 220 · 1.22 |
| 14:00 | 50620 · 0.66 | 13830 · 0.66 | 18914 · 0.70 | 6079 · 2.34 | 903 · 6.51 | 57 · 0.68 | 100 · 7.83 | – | 746 · 8.46 |
| 15:00 | 61603 · 1.00 | 15812 · 0.97 | 20748 · 1.30 | 6143 · 2.52 | 884 · 9.46 | 51 · 2.20 | 120 · 5.22 | – | 713 · 11.92 |
| 16:00 | 40045 · 0.61 | 11850 · 0.51 | 12483 · 0.65 | 5760 · 0.90 | 937 · 0.39 | 213 · 0.02 | 236 · 0.03 | – | 488 · 0.78 |
| 17:00 | 59907 · 0.71 | 18967 · 0.70 | 21335 · 0.89 | 8078 · 2.05 | 675 · 0.36 | 126 · 0.15 | 123 · 0.76 | – | 426 · 0.37 |
| 18:00 | 37975 · 1.60 | 8310 · 1.28 | 13907 · 1.85 | 3809 · 1.57 | 643 · 1.16 | 84 · 2.93 | 279 · 1.51 | – | 280 · 0.87 |
| 19:00 | 32175 · 0.74 | 8241 · 0.79 | 10084 · 0.88 | 3223 · 1.06 | 519 · 0.75 | 43 · 0.22 | 168 · 0.21 | – | 308 · 1.07 |
| 20:00 | 30601 · 1.04 | 8036 · 0.94 | 12517 · 1.12 | 2871 · 1.88 | 480 · 1.94 | 54 · 2.37 | 57 · 0.20 | – | 369 · 2.32 |
| 21:00 | 29292 · 1.49 | 7856 · 1.42 | 11394 · 1.85 | 4387 · 2.03 | 644 · 2.28 | 71 · 3.91 | 79 · 8.45 | – | 494 · 1.98 |
| 22:00 | 24666 · 0.94 | 6872 · 1.31 | 7426 · 1.33 | 2527 · 2.14 | 542 · 2.25 | 214 · 1.07 | 100 · 0.93 | – | 228 · 4.31 |
| 23:00 | 35262 · 0.61 | 10704 · 0.73 | 14989 · 0.65 | 2553 · 0.64 | 321 · 1.05 | 17 · 0.14 | 17 · 0.45 | – | 287 · 1.20 |
| 00:00 | 42604 · 1.28 | 12894 · 1.38 | 15112 · 1.56 | 4420 · 0.95 | 916 · 1.76 | 105 · 56.90 | 58 · 8.02 | – | 753 · 1.32 |
| 01:00 | 71714 · 0.96 | 22936 · 1.07 | 25274 · 1.09 | 7913 · 0.99 | 1572 · 1.62 | 111 · 3.27 | 144 · 4.48 | – | 1317 · 1.48 |
| 02:00 | 188000 · 1.16 | 72348 · 1.08 | 78205 · 1.51 | 28329 · 1.43 | 5290 · 1.19 | 394 · 0.01 | 486 · 0.24 | – | 4410 · 1.59 |
| 03:00 | 55666 · 1.65 | 15161 · 1.42 | 19321 · 2.25 | 4467 · 1.69 | 626 · 0.86 | 78 · 1.36 | 183 · 0.76 | – | 365 · 0.80 |
| 04:00 | 50134 · 1.54 | 13494 · 1.66 | 17519 · 2.71 | 4555 · 3.21 | 895 · 2.54 | 71 · 1.03 | 204 · 1.73 | – | 620 · 3.08 |
| 05:00 | 56135 · 1.09 | 17881 · 1.26 | 17861 · 1.28 | 6577 · 0.95 | 1032 · 1.19 | 72 · 1.93 | 63 · 1.37 | – | 897 · 1.15 |
| **total** | **1125048 · 0.99** | **325340 · 1.00** | **403751 · 1.18** | **124207 · 1.53** | **19356 · 1.34** | **2039 · 0.65** | **2976 · 0.72** | **–** | **14341 · 1.56** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2039 | 909 / 1130 | 1.03 | 0.65 | $0.02 | 44.58 % | 14.00 |
| Trailing | 2976 | 1702 / 1274 | 1.15 | 0.72 | $0.09 | 57.19 % | 13.75 |
| Signal · Normal | 7452 | 5254 / 2198 | 1.36 | 1.19 | $0.65 | 70.50 % | 10.50 |
| Signal · Trailing | 6889 | 5650 / 1239 | 2.49 | 2.37 | $1.36 | 82.01 % | 8.00 |
| total | 19356 | 13515 / 5841 | 1.50 | 1.34 | $2.13 | 69.82 % | 10.25 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 14341 | 10904 / 3437 | 1.74 | 1.56 | $2.01 | 76.03 % | 10.25 |
| of which Engine (no signals) | 5015 | 2611 / 2404 | 1.08 | 0.68 | $0.12 | 52.06 % | 13.75 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 33 | 10205746266.04 | 0.31 | $0.00 |
| 5m+ | 3 | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 15m | 16311 | 1.55 | 1.47 | $2.05 |
| 15m+ | 1570 | 1.01 | 0.61 | $0.00 |
| 30m | 1439 | 1.44 | 0.69 | $0.08 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 48 | 31 / 17 | 0.14 | 0.29 | -$0.00 | 64.58 % | 19.42 |
| Short | 2859 | 1760 / 1099 | 2.74 | 1.03 | $0.35 | 61.56 % | 10.00 |
| General | 884 | 380 / 504 | 1.01 | 0.64 | $0.00 | 42.99 % | 10.50 |
| Long | 1224 | 440 / 784 | 0.78 | 0.41 | -$0.23 | 35.95 % | 14.00 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 14341 | 10904 / 3437 | 1.74 | 1.56 | $2.01 | 76.03 % | 10.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 116371 | sig:duplicate 48305 · sig:confirm 40800 · sig:signalPf 15088 · sig:signalCluster 12158 · sig:signalGuard 20 |
| Short | 11294 | lastN 7113 · symPf 2006 · duplicate 1221 · engineSide 954 |
| Long | 4563 | lastN 2652 · symPf 765 · duplicate 743 · engineSide 403 |
| General | 3208 | lastN 1996 · symPf 508 · duplicate 472 · engineSide 232 |
| Micro | 2227 | crowd 1096 · engineSide 706 · lastN 393 · symPf 17 · duplicate 15 |
| Wide | 1471 | lastN 714 · engineSide 646 · symPf 111 |

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
| Micro | 2.75 | 0.29 | 0.10 | 0.14 | 0.48 | 48 |
| Short | 1.50 | 1.03 | 0.68 | 2.74 | 2.66 | 2859 |
| General | 1.49 | 0.64 | 0.43 | 1.01 | 1.57 | 884 |
| Long | 1.46 | 0.41 | 0.28 | 0.78 | 1.90 | 1224 |
| Wide | 1.57 | – | – | – | – | 0 |
| Signals | – | 1.56 | – | 1.74 | 1.11 | 14341 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (6796 of 133151 evaluated, 160862 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3058 units active at the run start, 4838 over the run, 3701 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 848 | 194 (23 %) | 1374 | 76 % | 0.50 | -329.35 |
| Micro | trailing | 867 | 283 (33 %) | 2605 | 66 % | 0.55 | -566.58 |
| Short | normal | 759 | 341 (45 %) | 4640 | 60 % | 0.93 | -432.63 |
| Short | trailing | 1646 | 690 (42 %) | 9296 | 61 % | 0.92 | -669.66 |
| General | normal | 514 | 265 (52 %) | 2609 | 45 % | 0.93 | -283.99 |
| General | trailing | 371 | 157 (42 %) | 1744 | 55 % | 0.71 | -741.04 |
| Long | normal | 876 | 302 (34 %) | 2868 | 42 % | 0.84 | -1101.27 |
| Long | trailing | 546 | 196 (36 %) | 2024 | 52 % | 0.63 | -1682.77 |
| Wide | axis | 369 | 167 (45 %) | 2669 | 32 % | 0.90 | -152.66 |
| Signals | normal | 1852 | 1307 (71 %) | 48738 | 72 % | 1.33 | 30846.57 |
| Signals | trailing | 1849 | 1663 (90 %) | 45640 | 81 % | 2.52 | 68327.21 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1715 | 477 (28 %) | 3979 | 69 % | 0.53 | -895.93 |
| Short | active | 125 | 79 (63 %) | 193 | 97 % | 17.18 | 368.98 |
| Short | bollinger | 82 | 19 (23 %) | 66 | 73 % | 1.40 | 28.78 |
| Short | break | 352 | 129 (37 %) | 1135 | 67 % | 1.15 | 176.35 |
| Short | channel | 32 | 24 (75 %) | 45 | 69 % | 0.74 | -15.84 |
| Short | direction | 109 | 30 (28 %) | 187 | 65 % | 1.26 | 53.56 |
| Short | ema | 77 | 75 (97 %) | 362 | 78 % | 4.10 | 405.57 |
| Short | ichimoku | 8 | 3 (38 %) | 6 | 100 % | ∞ (no loss) | 12.28 |
| Short | macd | 28 | 9 (32 %) | 315 | 65 % | 0.93 | -27.11 |
| Short | move | 234 | 119 (51 %) | 1182 | 60 % | 0.68 | -534.12 |
| Short | osc | 933 | 260 (28 %) | 8242 | 57 % | 0.76 | -2198.31 |
| Short | rsi | 150 | 108 (72 %) | 1034 | 65 % | 1.36 | 332.19 |
| Short | smooth | 63 | 52 (83 %) | 156 | 74 % | 1.75 | 81.57 |
| Short | trend | 95 | 64 (67 %) | 389 | 71 % | 1.20 | 81.31 |
| Short | volume | 117 | 60 (51 %) | 624 | 64 % | 1.21 | 132.49 |
| General | active | 14 | 4 (29 %) | 23 | 57 % | 1.19 | 8.35 |
| General | bollinger | 6 | 6 (100 %) | 7 | 86 % | 9.56 | 17.12 |
| General | break | 87 | 15 (17 %) | 250 | 50 % | 0.75 | -110.81 |
| General | channel | 26 | 12 (46 %) | 44 | 41 % | 0.26 | -70.40 |
| General | direction | 69 | 43 (62 %) | 166 | 61 % | 1.32 | 68.93 |
| General | ema | 89 | 85 (96 %) | 362 | 67 % | 2.00 | 379.30 |
| General | macd | 4 | 3 (75 %) | 31 | 55 % | 1.59 | 21.22 |
| General | move | 56 | 46 (82 %) | 147 | 58 % | 1.35 | 67.45 |
| General | osc | 307 | 51 (17 %) | 2654 | 42 % | 0.60 | -1828.67 |
| General | rsi | 39 | 20 (51 %) | 262 | 52 % | 0.96 | -16.20 |
| General | smooth | 87 | 82 (94 %) | 154 | 84 % | 9.25 | 389.95 |
| General | trend | 68 | 53 (78 %) | 168 | 64 % | 1.65 | 124.20 |
| General | volume | 33 | 2 (6 %) | 85 | 32 % | 0.45 | -75.47 |
| Long | active | 45 | 15 (33 %) | 30 | 87 % | 12.52 | 118.51 |
| Long | bollinger | 18 | 11 (61 %) | 14 | 79 % | 2.28 | 25.43 |
| Long | break | 135 | 19 (14 %) | 316 | 45 % | 0.57 | -350.99 |
| Long | channel | 30 | 1 (3 %) | 30 | 3 % | 0.00 | -141.68 |
| Long | direction | 88 | 45 (51 %) | 254 | 49 % | 1.17 | 87.23 |
| Long | ema | 84 | 56 (67 %) | 372 | 58 % | 1.17 | 132.98 |
| Long | ichimoku | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -39.80 |
| Long | macd | 60 | 25 (42 %) | 163 | 42 % | 1.03 | 8.87 |
| Long | move | 100 | 54 (54 %) | 259 | 60 % | 1.39 | 189.13 |
| Long | osc | 431 | 85 (20 %) | 2402 | 40 % | 0.56 | -2688.48 |
| Long | rsi | 55 | 2 (4 %) | 420 | 41 % | 0.55 | -618.27 |
| Long | smooth | 169 | 112 (66 %) | 189 | 90 % | 6.78 | 482.65 |
| Long | trend | 95 | 57 (60 %) | 251 | 57 % | 1.27 | 128.33 |
| Long | volume | 105 | 16 (15 %) | 185 | 41 % | 0.72 | -117.96 |
| Wide | active | 33 | 6 (18 %) | 42 | 50 % | 0.56 | -27.44 |
| Wide | bollinger | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | break | 98 | 18 (18 %) | 1873 | 24 % | 0.46 | -585.13 |
| Wide | channel | 18 | 0 (0 %) | 24 | 0 % | 0.00 | -34.29 |
| Wide | macd | 10 | 6 (60 %) | 27 | 67 % | 2.09 | 17.55 |
| Wide | move | 67 | 43 (64 %) | 291 | 46 % | 2.82 | 270.46 |
| Wide | osc | 43 | 25 (58 %) | 156 | 38 % | 1.45 | 48.00 |
| Wide | rsi | 3 | 0 (0 %) | 9 | 33 % | 0.32 | -6.56 |
| Wide | sar | 18 | 18 (100 %) | 42 | 93 % | 18.37 | 79.71 |
| Wide | smooth | 51 | 42 (82 %) | 165 | 65 % | 1.90 | 67.30 |
| Wide | trend | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 4.80 |
| Wide | volume | 19 | 6 (32 %) | 37 | 49 % | 1.36 | 12.94 |
| Signals | signal:act-burst | 60 | 44 (73 %) | 1897 | 76 % | 1.64 | 1905.13 |
| Signals | signal:act-hf | 60 | 55 (92 %) | 2725 | 76 % | 1.66 | 2665.90 |
| Signals | signal:adx | 60 | 48 (80 %) | 904 | 80 % | 2.13 | 1278.61 |
| Signals | signal:atr-break | 60 | 51 (85 %) | 2011 | 78 % | 2.04 | 2757.49 |
| Signals | signal:bollinger | 60 | 46 (77 %) | 1387 | 73 % | 1.46 | 1016.73 |
| Signals | signal:cci | 60 | 41 (68 %) | 1708 | 72 % | 1.27 | 801.33 |
| Signals | signal:cmf | 60 | 44 (73 %) | 1781 | 75 % | 1.64 | 1848.01 |
| Signals | signal:donchian | 60 | 50 (83 %) | 1848 | 77 % | 1.79 | 2122.16 |
| Signals | signal:ema-cross | 60 | 45 (75 %) | 847 | 78 % | 1.72 | 883.81 |
| Signals | signal:ema-cross-fast | 60 | 54 (90 %) | 1433 | 81 % | 2.40 | 2164.94 |
| Signals | signal:ema-pullback | 60 | 52 (87 %) | 1746 | 78 % | 2.06 | 2247.67 |
| Signals | signal:ema-slope | 60 | 53 (88 %) | 1116 | 81 % | 2.54 | 1896.83 |
| Signals | signal:ema-trend | 60 | 56 (93 %) | 1558 | 82 % | 3.06 | 2997.91 |
| Signals | signal:heikin-ashi | 60 | 56 (93 %) | 3046 | 77 % | 1.55 | 2589.42 |
| Signals | signal:hma | 60 | 53 (88 %) | 1994 | 77 % | 1.66 | 1983.13 |
| Signals | signal:ichimoku | 60 | 57 (95 %) | 1169 | 82 % | 2.16 | 1687.17 |
| Signals | signal:impulse | 60 | 56 (93 %) | 2232 | 78 % | 1.86 | 2610.96 |
| Signals | signal:kama | 60 | 54 (90 %) | 2311 | 76 % | 1.53 | 1975.83 |
| Signals | signal:keltner | 60 | 36 (60 %) | 1313 | 72 % | 1.30 | 705.11 |
| Signals | signal:macd-cross | 60 | 53 (88 %) | 2343 | 77 % | 1.65 | 2294.58 |
| Signals | signal:macd-hist | 60 | 58 (97 %) | 2976 | 79 % | 1.98 | 3819.39 |
| Signals | signal:macd-slow | 60 | 58 (97 %) | 2215 | 80 % | 2.13 | 3040.78 |
| Signals | signal:mfi | 30 | 15 (50 %) | 150 | 71 % | 1.19 | 46.11 |
| Signals | signal:obv | 60 | 60 (100 %) | 2439 | 79 % | 1.86 | 2902.93 |
| Signals | signal:r-awesome | 60 | 56 (93 %) | 1802 | 79 % | 2.07 | 2399.22 |
| Signals | signal:r-connors | 60 | 52 (87 %) | 786 | 84 % | 2.96 | 1348.05 |
| Signals | signal:r-fractal | 60 | 30 (50 %) | 1426 | 70 % | 1.13 | 386.00 |
| Signals | signal:r-inside | 55 | 37 (67 %) | 238 | 83 % | 1.88 | 281.55 |
| Signals | signal:r-linreg | 60 | 54 (90 %) | 1740 | 77 % | 2.15 | 2390.22 |
| Signals | signal:r-nr-break | 60 | 52 (87 %) | 2390 | 76 % | 1.45 | 1805.38 |
| Signals | signal:r-session-trend | 60 | 46 (77 %) | 1018 | 77 % | 1.93 | 1347.07 |
| Signals | signal:r-vol-regime | 60 | 46 (77 %) | 726 | 79 % | 2.53 | 1244.63 |
| Signals | signal:reclaim | 60 | 59 (98 %) | 1830 | 82 % | 2.69 | 2998.77 |
| Signals | signal:rsi-mid | 60 | 56 (93 %) | 2040 | 79 % | 2.08 | 2692.63 |
| Signals | signal:rsi-momentum | 60 | 53 (88 %) | 151 | 87 % | 3.79 | 407.40 |
| Signals | signal:rsi-reversal | 58 | 5 (9 %) | 279 | 47 % | 0.37 | -727.69 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 3358 | 78 % | 1.90 | 4205.38 |
| Signals | signal:s2-adx-gate | 60 | 56 (93 %) | 1585 | 79 % | 2.26 | 2279.42 |
| Signals | signal:s2-atr-break | 60 | 52 (87 %) | 2549 | 75 % | 1.54 | 2193.42 |
| Signals | signal:s2-bb-bounce | 60 | 42 (70 %) | 1182 | 73 % | 1.23 | 528.06 |
| Signals | signal:s2-block-scale | 60 | 44 (73 %) | 2599 | 74 % | 1.44 | 1907.63 |
| Signals | signal:s2-block-stack | 60 | 39 (65 %) | 1655 | 73 % | 1.35 | 1020.32 |
| Signals | signal:s2-confluence | 60 | 44 (73 %) | 1719 | 75 % | 1.48 | 1279.68 |
| Signals | signal:s2-ema-cross | 60 | 57 (95 %) | 120 | 88 % | 5.24 | 250.38 |
| Signals | signal:s2-range-break | 60 | 46 (77 %) | 597 | 76 % | 1.91 | 689.20 |
| Signals | signal:s2-range-shift | 60 | 55 (92 %) | 1619 | 80 % | 2.33 | 2550.19 |
| Signals | signal:s2-rsi-revert | 60 | 14 (23 %) | 525 | 63 % | 0.62 | -628.56 |
| Signals | signal:s2-st-trail | 60 | 51 (85 %) | 778 | 81 % | 2.21 | 1206.43 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 1300 | 72 % | 1.23 | 552.76 |
| Signals | signal:s2-vol-break | 55 | 47 (85 %) | 323 | 85 % | 4.55 | 687.95 |
| Signals | signal:s2-vwap-axis | 30 | 14 (47 %) | 51 | 63 % | 0.70 | -40.79 |
| Signals | signal:sar | 60 | 45 (75 %) | 2328 | 75 % | 1.38 | 1537.29 |
| Signals | signal:squeeze | 60 | 45 (75 %) | 370 | 81 % | 2.38 | 576.66 |
| Signals | signal:st-slow | 60 | 49 (82 %) | 707 | 79 % | 1.82 | 862.63 |
| Signals | signal:stoch-rsi | 60 | 38 (63 %) | 2134 | 70 % | 1.23 | 880.76 |
| Signals | signal:supertrend | 60 | 58 (97 %) | 1019 | 81 % | 2.56 | 1630.41 |
| Signals | signal:swing | 60 | 43 (72 %) | 2241 | 74 % | 1.51 | 1876.00 |
| Signals | signal:thrust | 60 | 52 (87 %) | 2395 | 77 % | 1.70 | 2448.46 |
| Signals | signal:trix | 60 | 58 (97 %) | 1020 | 80 % | 2.28 | 1490.64 |
| Signals | signal:volume-break | 53 | 51 (96 %) | 212 | 89 % | 6.96 | 494.01 |
| Signals | signal:vwap | 60 | 60 (100 %) | 1455 | 85 % | 2.90 | 2668.13 |
| Signals | signal:williams-r | 60 | 46 (77 %) | 1824 | 76 % | 1.57 | 1637.99 |
| Signals | signal:zscore | 60 | 21 (35 %) | 1138 | 66 % | 0.85 | -425.80 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 33879 | 25383 | 1715 | 0.94 | 4.00 | 70.00–163.33 (median 163.33) | 6102 | 9677 | 430 | 3601 | 1558 | 225 | 1951 | 0 | 124 | 0 | 0 | 0 | 8496 |  |
| Short | 35838 | 31410 | 2405 | 1.27 | 1.91 | 163.33–163.33 (median 163.33) | 1638 | 6060 | 1441 | 7320 | 3685 | 2121 | 6204 | 19 | 515 | 2 | 0 | 0 | 4428 |  |
| General | 13139 | 11499 | 885 | 1.32 | 1.99 | 163.33–163.33 (median 163.33) | 734 | 1295 | 528 | 2488 | 1711 | 774 | 2773 | 0 | 258 | 53 | 0 | 0 | 1640 |  |
| Long | 20289 | 18239 | 1422 | 1.31 | 2.12 | 163.33–163.33 (median 163.33) | 929 | 2615 | 912 | 4515 | 2080 | 1437 | 3841 | 0 | 397 | 91 | 0 | 0 | 2050 |  |
| Wide | 57717 | 46620 | 369 | 0.64 | 2.50 | 18.00–163.33 (median 163.33) | 11217 | 28559 | 842 | 3502 | 856 | 215 | 856 | 0 | 164 | 40 | 0 | 8712 | 2385 |  |
| Signals | 3780 | – | 3058 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 3058 units (pair × symbol × direction) active at the run start, 4838 over the run; 3701 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 11301 | 3655 (32 %) | 35649 | 73 % | 0.57 | -5705.32 |
| Micro | trailing | 22578 | 7328 (32 %) | 71306 | 61 % | 0.60 | -10506.98 |
| Short | normal | 11945 | 6105 (51 %) | 84393 | 62 % | 1.01 | 1020.15 |
| Short | trailing | 23893 | 12410 (52 %) | 175066 | 61 % | 1.01 | 2398.46 |
| General | normal | 7872 | 3373 (43 %) | 47026 | 44 % | 0.95 | -3456.46 |
| General | trailing | 5267 | 2631 (50 %) | 30198 | 57 % | 0.95 | -2025.00 |
| Long | normal | 12171 | 3644 (30 %) | 62343 | 39 % | 0.79 | -32334.21 |
| Long | trailing | 8118 | 3265 (40 %) | 40387 | 57 % | 0.83 | -14827.79 |
| Wide | axis | 49005 | 13785 (28 %) | 342218 | 34 % | 0.73 | -70356.69 |
| Wide | dca | 4356 | 2064 (47 %) | 34147 | 69 % | 0.78 | -9900.32 |
| Wide | dca-active | 4356 | 773 (18 %) | 19592 | 30 % | 0.48 | -9872.00 |
| Signals | normal | 1890 | 1233 (65 %) | 95929 | 70 % | 1.19 | 37812.92 |
| Signals | trailing | 1890 | 1732 (92 %) | 86794 | 81 % | 1.94 | 102256.09 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1715 | 477 (28 %) | 3979 | 69 % | 0.53 | -895.93 |
| Short | active | 125 | 79 (63 %) | 193 | 97 % | 17.18 | 368.98 |
| Short | bollinger | 82 | 19 (23 %) | 66 | 73 % | 1.40 | 28.78 |
| Short | break | 352 | 129 (37 %) | 1135 | 67 % | 1.15 | 176.35 |
| Short | channel | 32 | 24 (75 %) | 45 | 69 % | 0.74 | -15.84 |
| Short | direction | 109 | 30 (28 %) | 187 | 65 % | 1.26 | 53.56 |
| Short | ema | 77 | 75 (97 %) | 362 | 78 % | 4.10 | 405.57 |
| Short | ichimoku | 8 | 3 (38 %) | 6 | 100 % | ∞ (no loss) | 12.28 |
| Short | macd | 28 | 9 (32 %) | 315 | 65 % | 0.93 | -27.11 |
| Short | move | 234 | 119 (51 %) | 1182 | 60 % | 0.68 | -534.12 |
| Short | osc | 933 | 260 (28 %) | 8242 | 57 % | 0.76 | -2198.31 |
| Short | rsi | 150 | 108 (72 %) | 1034 | 65 % | 1.36 | 332.19 |
| Short | smooth | 63 | 52 (83 %) | 156 | 74 % | 1.75 | 81.57 |
| Short | trend | 95 | 64 (67 %) | 389 | 71 % | 1.20 | 81.31 |
| Short | volume | 117 | 60 (51 %) | 624 | 64 % | 1.21 | 132.49 |
| General | active | 14 | 4 (29 %) | 23 | 57 % | 1.19 | 8.35 |
| General | bollinger | 6 | 6 (100 %) | 7 | 86 % | 9.56 | 17.12 |
| General | break | 87 | 15 (17 %) | 250 | 50 % | 0.75 | -110.81 |
| General | channel | 26 | 12 (46 %) | 44 | 41 % | 0.26 | -70.40 |
| General | direction | 69 | 43 (62 %) | 166 | 61 % | 1.32 | 68.93 |
| General | ema | 89 | 85 (96 %) | 362 | 67 % | 2.00 | 379.30 |
| General | macd | 4 | 3 (75 %) | 31 | 55 % | 1.59 | 21.22 |
| General | move | 56 | 46 (82 %) | 147 | 58 % | 1.35 | 67.45 |
| General | osc | 307 | 51 (17 %) | 2654 | 42 % | 0.60 | -1828.67 |
| General | rsi | 39 | 20 (51 %) | 262 | 52 % | 0.96 | -16.20 |
| General | smooth | 87 | 82 (94 %) | 154 | 84 % | 9.25 | 389.95 |
| General | trend | 68 | 53 (78 %) | 168 | 64 % | 1.65 | 124.20 |
| General | volume | 33 | 2 (6 %) | 85 | 32 % | 0.45 | -75.47 |
| Long | active | 45 | 15 (33 %) | 30 | 87 % | 12.52 | 118.51 |
| Long | bollinger | 18 | 11 (61 %) | 14 | 79 % | 2.28 | 25.43 |
| Long | break | 135 | 19 (14 %) | 316 | 45 % | 0.57 | -350.99 |
| Long | channel | 30 | 1 (3 %) | 30 | 3 % | 0.00 | -141.68 |
| Long | direction | 88 | 45 (51 %) | 254 | 49 % | 1.17 | 87.23 |
| Long | ema | 84 | 56 (67 %) | 372 | 58 % | 1.17 | 132.98 |
| Long | ichimoku | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -39.80 |
| Long | macd | 60 | 25 (42 %) | 163 | 42 % | 1.03 | 8.87 |
| Long | move | 100 | 54 (54 %) | 259 | 60 % | 1.39 | 189.13 |
| Long | osc | 431 | 85 (20 %) | 2402 | 40 % | 0.56 | -2688.48 |
| Long | rsi | 55 | 2 (4 %) | 420 | 41 % | 0.55 | -618.27 |
| Long | smooth | 169 | 112 (66 %) | 189 | 90 % | 6.78 | 482.65 |
| Long | trend | 95 | 57 (60 %) | 251 | 57 % | 1.27 | 128.33 |
| Long | volume | 105 | 16 (15 %) | 185 | 41 % | 0.72 | -117.96 |
| Wide | active | 33 | 6 (18 %) | 42 | 50 % | 0.56 | -27.44 |
| Wide | bollinger | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Wide | break | 98 | 18 (18 %) | 1873 | 24 % | 0.46 | -585.13 |
| Wide | channel | 18 | 0 (0 %) | 24 | 0 % | 0.00 | -34.29 |
| Wide | macd | 10 | 6 (60 %) | 27 | 67 % | 2.09 | 17.55 |
| Wide | move | 67 | 43 (64 %) | 291 | 46 % | 2.82 | 270.46 |
| Wide | osc | 43 | 25 (58 %) | 156 | 38 % | 1.45 | 48.00 |
| Wide | rsi | 3 | 0 (0 %) | 9 | 33 % | 0.32 | -6.56 |
| Wide | sar | 18 | 18 (100 %) | 42 | 93 % | 18.37 | 79.71 |
| Wide | smooth | 51 | 42 (82 %) | 165 | 65 % | 1.90 | 67.30 |
| Wide | trend | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 4.80 |
| Wide | volume | 19 | 6 (32 %) | 37 | 49 % | 1.36 | 12.94 |
| Signals | signal:act-burst | 60 | 44 (73 %) | 1897 | 76 % | 1.64 | 1905.13 |
| Signals | signal:act-hf | 60 | 55 (92 %) | 2725 | 76 % | 1.66 | 2665.90 |
| Signals | signal:adx | 60 | 48 (80 %) | 904 | 80 % | 2.13 | 1278.61 |
| Signals | signal:atr-break | 60 | 51 (85 %) | 2011 | 78 % | 2.04 | 2757.49 |
| Signals | signal:bollinger | 60 | 46 (77 %) | 1387 | 73 % | 1.46 | 1016.73 |
| Signals | signal:cci | 60 | 41 (68 %) | 1708 | 72 % | 1.27 | 801.33 |
| Signals | signal:cmf | 60 | 44 (73 %) | 1781 | 75 % | 1.64 | 1848.01 |
| Signals | signal:donchian | 60 | 50 (83 %) | 1848 | 77 % | 1.79 | 2122.16 |
| Signals | signal:ema-cross | 60 | 45 (75 %) | 847 | 78 % | 1.72 | 883.81 |
| Signals | signal:ema-cross-fast | 60 | 54 (90 %) | 1433 | 81 % | 2.40 | 2164.94 |
| Signals | signal:ema-pullback | 60 | 52 (87 %) | 1746 | 78 % | 2.06 | 2247.67 |
| Signals | signal:ema-slope | 60 | 53 (88 %) | 1116 | 81 % | 2.54 | 1896.83 |
| Signals | signal:ema-trend | 60 | 56 (93 %) | 1558 | 82 % | 3.06 | 2997.91 |
| Signals | signal:heikin-ashi | 60 | 56 (93 %) | 3046 | 77 % | 1.55 | 2589.42 |
| Signals | signal:hma | 60 | 53 (88 %) | 1994 | 77 % | 1.66 | 1983.13 |
| Signals | signal:ichimoku | 60 | 57 (95 %) | 1169 | 82 % | 2.16 | 1687.17 |
| Signals | signal:impulse | 60 | 56 (93 %) | 2232 | 78 % | 1.86 | 2610.96 |
| Signals | signal:kama | 60 | 54 (90 %) | 2311 | 76 % | 1.53 | 1975.83 |
| Signals | signal:keltner | 60 | 36 (60 %) | 1313 | 72 % | 1.30 | 705.11 |
| Signals | signal:macd-cross | 60 | 53 (88 %) | 2343 | 77 % | 1.65 | 2294.58 |
| Signals | signal:macd-hist | 60 | 58 (97 %) | 2976 | 79 % | 1.98 | 3819.39 |
| Signals | signal:macd-slow | 60 | 58 (97 %) | 2215 | 80 % | 2.13 | 3040.78 |
| Signals | signal:mfi | 30 | 15 (50 %) | 150 | 71 % | 1.19 | 46.11 |
| Signals | signal:obv | 60 | 60 (100 %) | 2439 | 79 % | 1.86 | 2902.93 |
| Signals | signal:r-awesome | 60 | 56 (93 %) | 1802 | 79 % | 2.07 | 2399.22 |
| Signals | signal:r-connors | 60 | 52 (87 %) | 786 | 84 % | 2.96 | 1348.05 |
| Signals | signal:r-fractal | 60 | 30 (50 %) | 1426 | 70 % | 1.13 | 386.00 |
| Signals | signal:r-inside | 55 | 37 (67 %) | 238 | 83 % | 1.88 | 281.55 |
| Signals | signal:r-linreg | 60 | 54 (90 %) | 1740 | 77 % | 2.15 | 2390.22 |
| Signals | signal:r-nr-break | 60 | 52 (87 %) | 2390 | 76 % | 1.45 | 1805.38 |
| Signals | signal:r-session-trend | 60 | 46 (77 %) | 1018 | 77 % | 1.93 | 1347.07 |
| Signals | signal:r-vol-regime | 60 | 46 (77 %) | 726 | 79 % | 2.53 | 1244.63 |
| Signals | signal:reclaim | 60 | 59 (98 %) | 1830 | 82 % | 2.69 | 2998.77 |
| Signals | signal:rsi-mid | 60 | 56 (93 %) | 2040 | 79 % | 2.08 | 2692.63 |
| Signals | signal:rsi-momentum | 60 | 53 (88 %) | 151 | 87 % | 3.79 | 407.40 |
| Signals | signal:rsi-reversal | 58 | 5 (9 %) | 279 | 47 % | 0.37 | -727.69 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 3358 | 78 % | 1.90 | 4205.38 |
| Signals | signal:s2-adx-gate | 60 | 56 (93 %) | 1585 | 79 % | 2.26 | 2279.42 |
| Signals | signal:s2-atr-break | 60 | 52 (87 %) | 2549 | 75 % | 1.54 | 2193.42 |
| Signals | signal:s2-bb-bounce | 60 | 42 (70 %) | 1182 | 73 % | 1.23 | 528.06 |
| Signals | signal:s2-block-scale | 60 | 44 (73 %) | 2599 | 74 % | 1.44 | 1907.63 |
| Signals | signal:s2-block-stack | 60 | 39 (65 %) | 1655 | 73 % | 1.35 | 1020.32 |
| Signals | signal:s2-confluence | 60 | 44 (73 %) | 1719 | 75 % | 1.48 | 1279.68 |
| Signals | signal:s2-ema-cross | 60 | 57 (95 %) | 120 | 88 % | 5.24 | 250.38 |
| Signals | signal:s2-range-break | 60 | 46 (77 %) | 597 | 76 % | 1.91 | 689.20 |
| Signals | signal:s2-range-shift | 60 | 55 (92 %) | 1619 | 80 % | 2.33 | 2550.19 |
| Signals | signal:s2-rsi-revert | 60 | 14 (23 %) | 525 | 63 % | 0.62 | -628.56 |
| Signals | signal:s2-st-trail | 60 | 51 (85 %) | 778 | 81 % | 2.21 | 1206.43 |
| Signals | signal:s2-stoch-swing | 60 | 44 (73 %) | 1300 | 72 % | 1.23 | 552.76 |
| Signals | signal:s2-vol-break | 55 | 47 (85 %) | 323 | 85 % | 4.55 | 687.95 |
| Signals | signal:s2-vwap-axis | 30 | 14 (47 %) | 51 | 63 % | 0.70 | -40.79 |
| Signals | signal:sar | 60 | 45 (75 %) | 2328 | 75 % | 1.38 | 1537.29 |
| Signals | signal:squeeze | 60 | 45 (75 %) | 370 | 81 % | 2.38 | 576.66 |
| Signals | signal:st-slow | 60 | 49 (82 %) | 707 | 79 % | 1.82 | 862.63 |
| Signals | signal:stoch-rsi | 60 | 38 (63 %) | 2134 | 70 % | 1.23 | 880.76 |
| Signals | signal:supertrend | 60 | 58 (97 %) | 1019 | 81 % | 2.56 | 1630.41 |
| Signals | signal:swing | 60 | 43 (72 %) | 2241 | 74 % | 1.51 | 1876.00 |
| Signals | signal:thrust | 60 | 52 (87 %) | 2395 | 77 % | 1.70 | 2448.46 |
| Signals | signal:trix | 60 | 58 (97 %) | 1020 | 80 % | 2.28 | 1490.64 |
| Signals | signal:volume-break | 53 | 51 (96 %) | 212 | 89 % | 6.96 | 494.01 |
| Signals | signal:vwap | 60 | 60 (100 %) | 1455 | 85 % | 2.90 | 2668.13 |
| Signals | signal:williams-r | 60 | 46 (77 %) | 1824 | 76 % | 1.57 | 1637.99 |
| Signals | signal:zscore | 60 | 21 (35 %) | 1138 | 66 % | 0.85 | -425.80 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 2 | 0 (0 %) | 24 | 83 % | 0.87 | -1.01 |
| Micro | 1.25 | 2 | 0 (0 %) | 24 | 83 % | 0.87 | -1.01 |
| Micro | 1.35 | 2 | 0 (0 %) | 24 | 83 % | 0.87 | -1.01 |
| Micro | 1.5 | 2 | 0 (0 %) | 24 | 83 % | 0.87 | -1.01 |
| Micro | 1.75 | 2 | 0 (0 %) | 24 | 83 % | 0.87 | -1.01 |
| Micro | 2 | 2 | 0 (0 %) | 24 | 83 % | 0.87 | -1.01 |
| Short | 1.1 | 1107 | 529 (48 %) | 11047 | 61 % | 0.94 | -751.36 |
| Short | 1.25 | 1057 | 501 (47 %) | 10472 | 61 % | 0.94 | -698.41 |
| Short | 1.35 | 994 | 473 (48 %) | 9825 | 61 % | 0.93 | -679.64 |
| Short | 1.5 | 833 | 381 (46 %) | 8331 | 60 % | 0.91 | -738.46 |
| Short | 1.75 | 526 | 234 (44 %) | 5248 | 61 % | 0.92 | -423.32 |
| Short | 2 | 305 | 140 (46 %) | 3015 | 61 % | 0.95 | -130.93 |
| General | 1.1 | 368 | 138 (38 %) | 3422 | 47 % | 0.76 | -1336.98 |
| General | 1.25 | 362 | 138 (38 %) | 3350 | 47 % | 0.77 | -1246.11 |
| General | 1.35 | 336 | 127 (38 %) | 3022 | 47 % | 0.76 | -1170.58 |
| General | 1.5 | 256 | 97 (38 %) | 2256 | 48 % | 0.77 | -829.56 |
| General | 1.75 | 132 | 47 (36 %) | 1182 | 50 % | 0.74 | -477.08 |
| General | 2 | 61 | 26 (43 %) | 507 | 51 % | 0.79 | -165.26 |
| Long | 1.1 | 521 | 125 (24 %) | 3609 | 43 % | 0.67 | -3061.04 |
| Long | 1.25 | 500 | 122 (24 %) | 3404 | 43 % | 0.68 | -2804.35 |
| Long | 1.35 | 471 | 110 (23 %) | 3183 | 43 % | 0.67 | -2717.22 |
| Long | 1.5 | 394 | 86 (22 %) | 2687 | 44 % | 0.67 | -2345.78 |
| Long | 1.75 | 222 | 52 (23 %) | 1618 | 47 % | 0.72 | -1155.69 |
| Long | 2 | 127 | 34 (27 %) | 990 | 50 % | 0.78 | -526.25 |
| Wide | 1.1 | 39 | 12 (31 %) | 906 | 25 % | 0.82 | -95.02 |
| Wide | 1.25 | 36 | 9 (25 %) | 852 | 23 % | 0.79 | -101.61 |
| Wide | 1.35 | 36 | 9 (25 %) | 852 | 23 % | 0.79 | -101.61 |
| Wide | 1.5 | 33 | 6 (18 %) | 822 | 22 % | 0.72 | -132.04 |
| Wide | 1.75 | 26 | 4 (15 %) | 438 | 21 % | 0.54 | -119.76 |
| Wide | 2 | 12 | 0 (0 %) | 324 | 17 % | 0.26 | -143.19 |
| Signals | 1.1 | 606 | 431 (71 %) | 15949 | 74 % | 1.42 | 10557.47 |
| Signals | 1.25 | 296 | 205 (69 %) | 7510 | 74 % | 1.40 | 4578.27 |
| Signals | 1.35 | 187 | 134 (72 %) | 4694 | 76 % | 1.46 | 3156.78 |
| Signals | 1.5 | 99 | 83 (84 %) | 2544 | 78 % | 1.70 | 2350.39 |
| Signals | 1.75 | 30 | 23 (77 %) | 732 | 76 % | 1.49 | 482.96 |
| Signals | 2 | 14 | 11 (79 %) | 223 | 77 % | 1.91 | 262.77 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | pivot | mc-lag-3@m15 | 184 | 184 (100 %) | 368 | 100 % | ∞ (no loss) | 125.00 | – |
| Micro | magnet | mc-lag-12@m5 | 8 | 8 (100 %) | 48 | 100 % | ∞ (no loss) | 20.58 | tp0.6 sl2.85 tr0.45 h192 mc (6 · ∞ (no loss) · 2.74) |
| Micro | sandwich | mc-rsi2-10@m15 | 22 | 22 (100 %) | 44 | 100 % | ∞ (no loss) | 17.00 | – |
| Micro | sandwich | mc-rsi2-10@m15c | 22 | 22 (100 %) | 44 | 100 % | ∞ (no loss) | 17.00 | – |
| Micro | pulse | mc-rsi2-10@m15 | 22 | 22 (100 %) | 44 | 100 % | ∞ (no loss) | 17.00 | – |
| Micro | pulse | mc-rsi2-10@m15c | 22 | 22 (100 %) | 44 | 100 % | ∞ (no loss) | 17.00 | – |
| Micro | magnet | mc-trsi2-10@m5 | 6 | 6 (100 %) | 36 | 83 % | 20.03 | 10.49 | tp0.6 sl2.55 tr0.45 h288 mc (6 · 35.34 · 1.83) |
| Micro | sweep | mc-streak-6@m5 | 8 | 6 (75 %) | 40 | 95 % | 2.92 | 10.00 | tp0.6 sl2.55 tr0 h192 mc (5 · ∞ (no loss) · 2.00) |
| Micro | magnet | mc-rsit4-15@m15c | 8 | 8 (100 %) | 16 | 88 % | 18.00 | 5.29 | – |
| Micro | sweep | mc-rsi3-10@m5c | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 5.00 | – |
| Micro | ribbon | mc-tpull-8@m5 | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 3.60 | – |
| Micro | sandwich | mc-ibrk@m5 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 2.80 | – |
| Micro | pulse | mc-ibrk@m5 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 2.80 | – |
| Micro | sweep | mc-lag-6@m15 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 2.40 | – |
| Micro | sweep | mc-rsi7-25@m5c | 2 | 0 (0 %) | 24 | 83 % | 0.87 | -1.01 | tp0.6 sl3 tr0.45 h192 mc (12 · 0.87 · -0.51) |
| Micro | sweep | mc-rsrev-12@m5c | 4 | 0 (0 %) | 8 | 50 % | 0.42 | -2.20 | – |
| Micro | pulse | mc-rsi4-15@m5c | 4 | 0 (0 %) | 8 | 50 % | 0.18 | -7.30 | – |
| Micro | revert | mc-vwapx-15@m15c | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -9.40 | – |
| Micro | sweep | mc-rsit2-20@m5c | 164 | 82 (50 %) | 492 | 72 % | 0.94 | -10.06 | – |
| Micro | sandwich | mc-rsi4-15@m5c | 8 | 0 (0 %) | 16 | 50 % | 0.18 | -13.77 | – |
| Micro | snap | mc-rsi4-15@m5c | 8 | 0 (0 %) | 16 | 50 % | 0.18 | -13.77 | – |
| Micro | ribbon | mc-mrsi2-10@m30 | 12 | 0 (0 %) | 24 | 50 % | 0.12 | -27.30 | – |
| Micro | clamp | mc-rsi2-5@m5 | 34 | 0 (0 %) | 170 | 72 % | 0.45 | -48.69 | tp0.6 sl1.95 tr0 h192 mc (5 · 0.74 · -0.55) |
| Micro | magnet | mc-rsit7-30@m15c | 38 | 0 (0 %) | 76 | 50 % | 0.11 | -74.30 | – |
| Micro | sweep | mc-rsi3-5@m5 | 31 | 1 (3 %) | 279 | 65 % | 0.39 | -107.90 | tp0.6 sl3 tr0.3 h192 mc (9 · 1.32 · 0.53) |
| Micro | sweep | mc-mturn-5@m15c | 74 | 2 (3 %) | 74 | 3 % | 0.00 | -119.27 | – |
| Micro | sweep | mc-rsi4-10@m5 | 73 | 11 (15 %) | 803 | 71 % | 0.65 | -127.10 | tp0.55 sl2.75 tr0.4125 h192 mc (11 · 1.94 · 2.76) |
| Micro | sweep | mc-rsi5-10@m5 | 124 | 18 (15 %) | 620 | 68 % | 0.58 | -129.60 | tp0.55 sl1.925 tr0.4125 h192 mc (5 · 1.70 · 1.49) |
| Micro | ribbon | mc-rsi2-5@m5 | 30 | 0 (0 %) | 180 | 42 % | 0.10 | -210.58 | tp0.6 sl1.95 tr0.3 h192 mc (6 · 0.13 · -5.63) |
| Micro | sandwich | mc-rsi2-5@m5 | 142 | 0 (0 %) | 426 | 46 % | 0.15 | -252.02 | – |
| Short | ribbon | ema-slope@m15c | 43 | 43 (100 %) | 258 | 76 % | 3.72 | 267.77 | tp2 sl2 tr1.5 h64 sh (6 · ∞ (no loss) · 11.81) |
| Short | sweep | act-burst-2.5@x4@m30 | 48 | 48 (100 %) | 118 | 100 % | ∞ (no loss) | 251.85 | – |
| Short | sweep | r-fvg@m15c | 80 | 80 (100 %) | 80 | 100 % | ∞ (no loss) | 177.06 | – |
| Short | sweep | willr-14-95@m30 | 70 | 53 (76 %) | 501 | 65 % | 1.54 | 161.14 | tp1.8 sl2.7 tr1.35 h32 sh (8 · 67.37 · 9.51) |
| Short | revert | r-klinger@m15c | 31 | 31 (100 %) | 242 | 76 % | 1.79 | 152.54 | tp2.2 sl4.4 tr1.1 h64 sh (7 · 2.71 · 7.86) |
| Short | pivot | break-squeeze-t25@m15 | 26 | 23 (88 %) | 193 | 70 % | 1.90 | 116.84 | tp2 sl2 tr1.5 h64 sh (8 · 2.69 · 7.44) |
| Short | ribbon | ema-slope@m15 | 14 | 14 (100 %) | 84 | 81 % | 5.89 | 113.60 | tp2 sl2 tr1.5 h64 sh (6 · ∞ (no loss) · 11.81) |
| Short | revert | break-squeeze-t10@m15c | 16 | 16 (100 %) | 76 | 86 % | 13.01 | 110.71 | tp2.8 sl5.6 tr2.1 h96 sh (5 · 61.12 · 8.57) |
| Short | sweep | rsi-fast@m15 | 58 | 35 (60 %) | 483 | 63 % | 1.18 | 92.93 | tp1.8 sl3.6 tr1.35 h64 sh (9 · 147.59 · 15.91) |
| Short | sweep | r-rsi2@m30 | 21 | 21 (100 %) | 51 | 96 % | 173.85 | 80.86 | – |
| Short | sweep | r-vol-regime@m15 | 22 | 22 (100 %) | 44 | 100 % | ∞ (no loss) | 78.43 | – |
| Short | sweep | rsi-mom-14-25@m30 | 16 | 16 (100 %) | 32 | 100 % | ∞ (no loss) | 69.60 | – |
| Short | pivot | act-shift@m15c | 12 | 12 (100 %) | 38 | 100 % | ∞ (no loss) | 66.14 | – |
| Short | ribbon | dir-vwap-240@m15c | 4 | 4 (100 %) | 103 | 70 % | 1.63 | 64.36 | tp2 sl4 tr1 h96 sh (31 · 2.01 · 24.70) |
| Short | sweep | break-squeeze@m30 | 4 | 4 (100 %) | 49 | 82 % | 3.00 | 64.32 | tp2.6 sl5.2 tr0 h48 sh (10 · ∞ (no loss) · 24.00) |
| Short | pivot | hma-16@m15c | 12 | 12 (100 %) | 32 | 100 % | ∞ (no loss) | 62.83 | – |
| Short | magnet | willr-50-90@m15c | 13 | 13 (100 %) | 104 | 79 % | 2.15 | 57.89 | tp1.8 sl1.8 tr0.9 h96 sh (8 · 3.77 · 6.11) |
| Short | ribbon | hma-55@m15c | 22 | 22 (100 %) | 44 | 100 % | ∞ (no loss) | 53.18 | – |
| Short | follow | mfi-14-20@m15 | 6 | 6 (100 %) | 131 | 70 % | 1.27 | 48.68 | tp2.8 sl5.6 tr0 h64 sh (21 · 1.43 · 12.60) |
| Short | magnet | rsi-fast@m15c | 12 | 12 (100 %) | 62 | 71 % | 2.66 | 48.40 | tp2.6 sl2.6 tr0 h64 sh (5 · 3.43 · 6.80) |
| Short | sweep | rsi-fast@m15c | 12 | 10 (83 %) | 90 | 67 % | 1.87 | 44.95 | tp2 sl3 tr1.5 h64 sh (8 · 3.07 · 7.40) |
| Short | sweep | willr-21-95@m15 | 50 | 23 (46 %) | 754 | 61 % | 1.06 | 43.86 | tp2.2 sl4.4 tr0 h96 sh (13 · 2.39 · 12.80) |
| Short | revert | r-connors@m15c | 5 | 5 (100 %) | 45 | 80 % | 2.28 | 41.62 | tp2.2 sl4.4 tr1.1 h96 sh (9 · 3.52 · 11.60) |
| Short | ribbon | willr-14-90@m15c | 3 | 3 (100 %) | 47 | 85 % | 3.07 | 41.37 | tp1.8 sl3.6 tr0 h64 sh (16 · 2.95 · 14.80) |
| Short | ribbon | r-chand-m@m15 | 5 | 5 (100 %) | 20 | 85 % | 81.76 | 36.58 | tp2.6 sl3.9 tr1.95 h96 sh (5 · 44.02 · 8.69) |
| Short | sweep | break-squeeze-t25@m15c | 10 | 10 (100 %) | 20 | 100 % | ∞ (no loss) | 34.25 | – |
| Short | magnet | hma-16@m15c | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 33.40 | – |
| Short | ribbon | trend-ribbon@m15 | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 33.40 | – |
| Short | ribbon | dir-emax@m15c | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 33.40 | – |
| Short | ribbon | ema-9-21@m15c | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 33.40 | – |
| Short | magnet | act-shift@m15c | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 33.20 | – |
| Short | ribbon | trend-adx-20@m15c | 22 | 19 (86 %) | 20 | 95 % | 539.25 | 30.26 | – |
| Short | sweep | break-squeeze-t10@m30 | 11 | 9 (82 %) | 137 | 64 % | 1.17 | 30.08 | tp2.8 sl5.6 tr1.4 h32 sh (13 · 2.10 · 10.30) |
| Short | pivot | break-squeeze@m15 | 6 | 6 (100 %) | 42 | 71 % | 2.01 | 29.91 | tp1.8 sl1.8 tr1.35 h64 sh (7 · 4.74 · 7.69) |
| Short | sweep | r-orb@m15 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 29.50 | – |
| Short | ribbon | willr-28-95@m15 | 29 | 16 (55 %) | 174 | 70 % | 1.17 | 26.98 | tp2.8 sl5.6 tr1.4 h64 sh (5 · ∞ (no loss) · 6.31) |
| Short | revert | r-qh-flow-m@m15c | 2 | 2 (100 %) | 74 | 74 % | 1.31 | 26.35 | tp2.2 sl4.4 tr0 h64 sh (38 · 1.33 · 13.75) |
| Short | sweep | r-bb-adx-m@m15c | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 24.00 | – |
| Short | ribbon | move-impulse-20-2.5@m30 | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 22.40 | – |
| Short | sweep | r-clv-thrust-m@m30 | 3 | 3 (100 %) | 21 | 76 % | 1.78 | 17.80 | tp2.8 sl5.6 tr0 h32 sh (7 · 2.69 · 9.80) |
| Short | clamp | r-ultimate@m15 | 14 | 8 (57 %) | 56 | 68 % | 1.52 | 17.03 | – |
| Short | sweep | r-bb-adx@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 16.86 | – |
| Short | clamp | cci-40-200@m15c | 6 | 6 (100 %) | 36 | 83 % | 2.09 | 16.63 | tp2 sl4 tr1 h64 sh (5 · ∞ (no loss) · 5.31) |
| Short | clamp | rsi-21-30-70@m15 | 4 | 4 (100 %) | 32 | 75 % | 1.47 | 15.32 | tp2.6 sl5.2 tr1.3 h64 sh (8 · 1.73 · 4.00) |
| Short | magnet | break-don20@m15 | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 14.81 | – |
| Short | pivot | r-fvg-m@m15 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 14.54 | – |
| Short | pivot | break-squeeze-t10@m15 | 10 | 8 (80 %) | 56 | 64 % | 1.31 | 14.46 | tp1.8 sl1.8 tr1.35 h64 sh (6 · 3.15 · 4.41) |
| Short | sweep | r-bbw-expand@m30 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 14.40 | – |
| Short | clamp | break-squeeze-30@m15 | 3 | 3 (100 %) | 20 | 75 % | 3.03 | 14.39 | tp2 sl4 tr0 h64 sh (6 · 2.14 · 4.80) |
| Short | pivot | willr-50-95@m15 | 14 | 7 (50 %) | 96 | 65 % | 1.16 | 13.86 | tp2.6 sl5.2 tr1.95 h64 sh (6 · 24.03 · 9.80) |
| Short | sweep | break-vol@x4@m15 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 13.75 | – |
| Short | magnet | willr-21-90@m15c | 2 | 2 (100 %) | 20 | 80 % | 2.63 | 13.10 | tp1.8 sl3.6 tr0.9 h64 sh (10 · 2.63 · 6.55) |
| Short | pulse | ichi-tk-9@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 12.28 | – |
| Short | sweep | r-fvg@m30 | 1 | 1 (100 %) | 10 | 80 % | 2.16 | 11.55 | tp2.4 sl4.8 tr1.8 h48 sh (10 · 2.16 · 11.55) |
| Short | pivot | move-impulse-20-2.5@m15c | 14 | 9 (64 %) | 207 | 69 % | 1.04 | 11.54 | tp2.6 sl5.2 tr1.95 h64 sh (15 · 1.61 · 9.86) |
| Short | revert | r-stc@m15c | 2 | 2 (100 %) | 18 | 78 % | 1.86 | 10.67 | tp2.8 sl2.8 tr1.4 h64 sh (9 · 2.20 · 7.20) |
| Short | ribbon | willr-50-95@m15 | 17 | 5 (29 %) | 187 | 67 % | 1.05 | 10.10 | tp2.6 sl5.2 tr1.95 h64 sh (9 · 19.75 · 10.80) |
| Short | pulse | aroon-25@m15 | 3 | 3 (100 %) | 7 | 86 % | 5.00 | 9.60 | – |
| Short | ribbon | willr-28-95@m15c | 11 | 7 (64 %) | 47 | 70 % | 1.21 | 8.26 | tp2.8 sl5.6 tr0 h64 sh (5 · 1.25 · 1.57) |
| Short | sweep | r-bb-adx-m@m30 | 4 | 4 (100 %) | 6 | 100 % | ∞ (no loss) | 7.95 | – |
| Short | sweep | r-fvg-m@m30 | 2 | 2 (100 %) | 10 | 80 % | 2.99 | 7.94 | tp1.8 sl1.8 tr0.9 h32 sh (5 · 2.99 · 3.97) |
| Short | clamp | r-chand-m@m15 | 1 | 1 (100 %) | 6 | 83 % | 2.93 | 7.90 | tp2.6 sl3.9 tr0 h96 sh (6 · 2.93 · 7.90) |
| Short | sweep | break-vol@m15 | 1 | 1 (100 %) | 7 | 86 % | 2.98 | 7.54 | tp2.4 sl3.6 tr1.8 h96 sh (7 · 2.98 · 7.54) |
| Short | sweep | r-sweep@m15 | 1 | 1 (100 %) | 8 | 75 % | 2.32 | 7.34 | tp2.6 sl5.2 tr1.95 h64 sh (8 · 2.32 · 7.34) |
| Short | sweep | r-vol-regime@m30 | 4 | 4 (100 %) | 16 | 75 % | 1.30 | 5.20 | – |
| Short | magnet | kelt-20-2.5@m15c | 24 | 20 (83 %) | 24 | 83 % | 1.19 | 3.59 | – |
| Short | clamp | break-squeeze-t25@m15 | 4 | 2 (50 %) | 24 | 67 % | 1.12 | 3.20 | tp2 sl2 tr0 h64 sh (6 · 1.64 · 2.80) |
| Short | ribbon | r-td@m30 | 2 | 2 (100 %) | 24 | 67 % | 1.17 | 2.91 | tp2 sl4 tr1 h32 sh (12 · 1.17 · 1.45) |
| Short | revert | break-vol@m30 | 3 | 2 (67 %) | 40 | 65 % | 1.05 | 2.75 | tp2.8 sl5.6 tr0 h32 sh (13 · 1.27 · 4.65) |
| Short | sweep | willr-7-90@m15c | 1 | 1 (100 %) | 11 | 73 % | 1.17 | 2.60 | tp2.4 sl4.8 tr0 h96 sh (11 · 1.17 · 2.60) |
| Short | ribbon | ha-3@m15 | 2 | 2 (100 %) | 8 | 50 % | 1.04 | 0.52 | – |
| Short | pivot | trend-ema-5-20@m15c | 1 | 1 (100 %) | 11 | 64 % | 1.04 | 0.49 | tp2.8 sl5.6 tr2.1 h64 sh (11 · 1.04 · 0.49) |
| Short | pivot | r-session-trend-m@m30 | 4 | 2 (50 %) | 12 | 58 % | 0.97 | -0.35 | – |
| Short | follow | r-nr-break@m15c | 2 | 0 (0 %) | 20 | 70 % | 0.98 | -0.40 | tp1.8 sl3.6 tr0 h64 sh (10 · 0.98 · -0.20) |
| Short | sweep | mfi-14-20@m15 | 1 | 0 (0 %) | 11 | 64 % | 0.93 | -0.76 | tp2.4 sl4.8 tr1.2 h96 sh (11 · 0.93 · -0.76) |
| Short | revert | r-star@m30 | 3 | 0 (0 %) | 30 | 70 % | 0.97 | -1.07 | tp1.8 sl3.6 tr0 h32 sh (10 · 0.98 · -0.20) |
| Short | magnet | mfi-14-10@m15 | 4 | 2 (50 %) | 12 | 50 % | 0.84 | -2.00 | – |
| Short | follow | r-fvg@m30 | 1 | 0 (0 %) | 27 | 59 % | 0.92 | -2.34 | tp2 sl4 tr1.5 h32 sh (27 · 0.92 · -2.34) |
| Short | ribbon | r-ultimate@m15c | 12 | 4 (33 %) | 24 | 50 % | 0.89 | -2.97 | – |
| Short | sweep | willr-14-95@m15c | 22 | 8 (36 %) | 126 | 83 % | 0.96 | -3.15 | tp2.2 sl4.4 tr1.1 h64 sh (6 · ∞ (no loss) · 4.10) |
| Short | pivot | trend-ema@m15c | 2 | 1 (50 %) | 22 | 59 % | 0.82 | -5.51 | tp2.8 sl5.6 tr2.1 h64 sh (11 · 1.04 · 0.49) |
| Short | magnet | rsi-div@m15 | 6 | 0 (0 %) | 30 | 63 % | 0.79 | -6.00 | tp2.2 sl3.3 tr0 h64 sh (5 · 0.88 · -0.53) |
| Short | sweep | r-pin-m@m15 | 2 | 0 (0 %) | 14 | 64 % | 0.68 | -6.34 | tp2.8 sl5.6 tr1.4 h64 sh (7 · 0.63 · -2.21) |
| Short | pivot | willr-50-90@m30 | 7 | 0 (0 %) | 42 | 60 % | 0.88 | -7.47 | tp2.4 sl4.8 tr1.2 h32 sh (6 · 0.88 · -0.69) |
| Short | sweep | willr-14-90@m15c | 5 | 2 (40 %) | 102 | 60 % | 0.94 | -7.67 | tp2.8 sl5.6 tr0 h96 sh (19 · 1.26 · 7.40) |
| Short | sandwich | bb-wick@m15 | 1 | 0 (0 %) | 6 | 50 % | 0.44 | -8.40 | tp2.4 sl4.8 tr0 h96 sh (6 · 0.44 · -8.40) |
| Short | pivot | mfi-14-20@m15c | 3 | 0 (0 %) | 15 | 40 % | 0.55 | -9.20 | tp2 sl2 tr0 h64 sh (5 · 0.55 · -3.00) |
| Short | ribbon | move-impulse-10-2@m15 | 12 | 4 (33 %) | 60 | 60 % | 0.80 | -10.91 | tp2.2 sl2.2 tr0 h64 sh (5 · 1.25 · 1.20) |
| Short | pivot | kama-10@m15c | 1 | 0 (0 %) | 6 | 33 % | 0.30 | -12.40 | tp2.8 sl4.2 tr0 h64 sh (6 · 0.30 · -12.40) |
| Short | sweep | willr-21-95@m15c | 42 | 17 (40 %) | 383 | 65 % | 0.95 | -13.52 | tp2.8 sl5.6 tr1.4 h64 sh (8 · 30.18 · 7.16) |
| Short | sweep | willr-21-90@m30 | 5 | 0 (0 %) | 99 | 58 % | 0.86 | -14.10 | tp1.8 sl2.7 tr1.35 h32 sh (20 · 0.90 · -1.75) |
| Short | pivot | aroon-14@m15c | 2 | 0 (0 %) | 8 | 38 % | 0.33 | -14.37 | – |
| Short | revert | break-vol-2@m15c | 3 | 0 (0 %) | 34 | 53 % | 0.64 | -14.88 | tp2 sl2 tr1 h96 sh (12 · 0.84 · -1.74) |
| Short | revert | r-klinger-m@m15c | 4 | 1 (25 %) | 28 | 46 % | 0.66 | -17.00 | tp2.6 sl2.6 tr0 h64 sh (7 · 1.14 · 1.20) |
| Short | pivot | break-squeeze-30@m15 | 9 | 1 (11 %) | 75 | 64 % | 0.78 | -17.50 | tp2 sl2 tr1.5 h64 sh (9 · 1.77 · 5.10) |
| Short | magnet | r-zdist@m30 | 8 | 0 (0 %) | 12 | 33 % | 0.04 | -17.68 | – |
| Short | sweep | willr-7-90@m30 | 8 | 4 (50 %) | 105 | 63 % | 0.89 | -18.59 | tp2.8 sl5.6 tr1.4 h32 sh (14 · 1.60 · 5.69) |
| Short | magnet | r-chand@m15 | 46 | 19 (41 %) | 292 | 67 % | 0.94 | -21.81 | tp2.8 sl5.6 tr0 h64 sh (5 · 1.79 · 4.60) |
| Short | sweep | r-fisher@m30 | 7 | 2 (29 %) | 81 | 53 % | 0.67 | -23.97 | tp2.2 sl3.3 tr1.1 h32 sh (11 · 1.90 · 3.29) |
| Short | ribbon | trix-9@m30 | 7 | 2 (29 %) | 28 | 50 % | 0.36 | -25.57 | – |
| Short | sweep | bb-bounce-50-2@m15 | 1 | 0 (0 %) | 30 | 50 % | 0.54 | -26.03 | tp2.4 sl3.6 tr0 h64 sh (30 · 0.54 · -26.03) |
| Short | sweep | z-50-2@m15 | 1 | 0 (0 %) | 30 | 50 % | 0.54 | -26.03 | tp2.4 sl3.6 tr0 h64 sh (30 · 0.54 · -26.03) |
| Short | pivot | break-don20@m15 | 2 | 0 (0 %) | 24 | 50 % | 0.43 | -27.60 | tp1.8 sl3.6 tr0 h96 sh (12 · 0.42 · -13.20) |
| Short | sweep | willr-28-95@m15 | 4 | 0 (0 %) | 55 | 40 % | 0.62 | -29.44 | tp2.6 sl2.6 tr0 h64 sh (14 · 0.72 · -5.63) |
| Short | ribbon | ha-1@m15c | 5 | 0 (0 %) | 24 | 21 % | 0.21 | -30.40 | tp1.8 sl1.8 tr0 h64 sh (5 · 0.20 · -6.40) |
| Short | sweep | willr-14-95@m15 | 9 | 2 (22 %) | 77 | 48 % | 0.73 | -32.50 | tp2.4 sl4.8 tr0 h96 sh (6 · 2.20 · 6.00) |
| Short | revert | break-vol-1.3@m15c | 2 | 0 (0 %) | 50 | 56 % | 0.56 | -35.09 | tp2.4 sl4.8 tr1.2 h64 sh (25 · 0.56 · -17.55) |
| Short | sweep | macd-hist@m15c | 24 | 7 (29 %) | 297 | 65 % | 0.90 | -37.78 | tp2.2 sl4.4 tr0 h96 sh (13 · 1.45 · 6.20) |
| Short | magnet | willr-28-95@m15c | 13 | 4 (31 %) | 34 | 38 % | 0.25 | -41.79 | – |
| Short | sweep | cci-40-200@m15 | 5 | 0 (0 %) | 86 | 58 % | 0.71 | -45.71 | tp2.4 sl4.8 tr1.8 h64 sh (17 · 0.82 · -4.46) |
| Short | sweep | willr-28-90@m30 | 8 | 0 (0 %) | 142 | 56 % | 0.72 | -49.23 | tp1.8 sl3.6 tr1.35 h32 sh (19 · 0.98 · -0.22) |
| Short | ribbon | dir-vwap@m15 | 9 | 0 (0 %) | 46 | 41 % | 0.33 | -54.28 | tp2.8 sl5.6 tr1.4 h96 sh (5 · 0.69 · -2.12) |
| Short | sweep | willr-14-90@m30 | 18 | 5 (28 %) | 280 | 56 % | 0.83 | -55.01 | tp2.8 sl5.6 tr1.4 h32 sh (15 · 1.55 · 5.28) |
| Short | sweep | rsi-fast@m30 | 16 | 5 (31 %) | 209 | 49 % | 0.74 | -55.47 | tp2.6 sl2.6 tr1.3 h32 sh (14 · 1.54 · 2.83) |
| Short | sweep | willr-28-95@m15c | 12 | 2 (17 %) | 98 | 57 % | 0.37 | -55.95 | tp2.6 sl3.9 tr1.3 h64 sh (8 · 1.00 · 0.02) |
| Short | pivot | r-valuearea-m@m15 | 65 | 18 (28 %) | 109 | 35 % | 0.17 | -64.32 | – |
| Short | sweep | cci-20-200@m15 | 16 | 6 (38 %) | 198 | 52 % | 0.78 | -68.83 | tp2.8 sl5.6 tr2.1 h96 sh (11 · 1.27 · 3.46) |
| Short | magnet | willr-28-95@m15 | 21 | 4 (19 %) | 57 | 37 % | 0.17 | -68.89 | – |
| Short | sweep | willr-50-90@m30 | 3 | 0 (0 %) | 55 | 49 % | 0.47 | -69.20 | tp2.8 sl4.2 tr0 h48 sh (19 · 0.53 · -20.60) |
| Short | sweep | willr-21-95@m30 | 32 | 10 (31 %) | 300 | 52 % | 0.72 | -82.00 | tp2.6 sl3.9 tr1.3 h32 sh (9 · 1.92 · 3.44) |
| Short | ribbon | r-streak@m30 | 7 | 0 (0 %) | 48 | 29 % | 0.12 | -92.44 | tp1.8 sl3.6 tr0.9 h32 sh (7 · 0.18 · -10.47) |
| Short | sweep | willr-50-95@m30 | 28 | 2 (7 %) | 161 | 42 % | 0.53 | -103.09 | tp1.8 sl3.6 tr1.35 h32 sh (5 · 1.51 · 1.62) |
| Short | ribbon | willr-50-95@m15c | 13 | 0 (0 %) | 93 | 46 % | 0.36 | -118.45 | tp2 sl4 tr0 h64 sh (8 · 0.55 · -5.83) |
| Short | sweep | willr-28-95@m30 | 45 | 13 (29 %) | 335 | 44 % | 0.56 | -155.73 | tp1.8 sl3.6 tr1.35 h32 sh (7 · 2.51 · 4.82) |
| Short | ribbon | willr-21-95@m30 | 37 | 0 (0 %) | 140 | 34 % | 0.35 | -172.59 | – |
| Short | sweep | willr-50-95@m15 | 27 | 4 (15 %) | 414 | 53 % | 0.61 | -178.30 | tp2.4 sl4.8 tr1.2 h64 sh (13 · 26.04 · 9.54) |
| Short | sweep | willr-21-90@m15c | 68 | 24 (35 %) | 1520 | 62 % | 0.89 | -179.86 | tp2.8 sl5.6 tr1.4 h64 sh (21 · 1.85 · 10.45) |
| Short | sweep | r-td@m30 | 32 | 0 (0 %) | 126 | 40 % | 0.22 | -208.03 | – |
| Short | ribbon | r-fisher@m30 | 37 | 1 (3 %) | 658 | 55 % | 0.65 | -248.43 | tp1.8 sl1.8 tr0 h48 sh (18 · 1.00 · 0.00) |
| Short | ribbon | break-retest@m15 | 91 | 0 (0 %) | 173 | 46 % | 0.18 | -283.91 | – |
| Short | magnet | r-fisher@m15 | 61 | 0 (0 %) | 112 | 5 % | 0.00 | -321.12 | – |
| Short | ribbon | willr-28-95@m30 | 52 | 0 (0 %) | 394 | 35 % | 0.35 | -418.97 | tp1.8 sl1.8 tr1.35 h32 sh (9 · 0.77 · -1.89) |
| Short | sweep | r-pin@m15 | 47 | 0 (0 %) | 500 | 54 % | 0.43 | -457.20 | tp1.8 sl2.7 tr0.9 h64 sh (11 · 0.71 · -3.32) |
| General | ribbon | ema-slope@m15c | 26 | 25 (96 %) | 156 | 67 % | 2.00 | 158.97 | tp4.4 sl2.2 tr0 h64 gn (6 · 3.50 · 12.00) |
| General | ribbon | hma-55@m15c | 25 | 25 (100 %) | 50 | 100 % | ∞ (no loss) | 155.37 | – |
| General | ribbon | ema-slope@m15 | 22 | 22 (100 %) | 132 | 67 % | 2.00 | 140.06 | tp4.4 sl2.2 tr0 h64 gn (6 · 3.50 · 12.00) |
| General | pivot | hma-16@m15c | 20 | 20 (100 %) | 44 | 95 % | 718.96 | 138.09 | – |
| General | ribbon | trend-ribbon@m15 | 38 | 38 (100 %) | 38 | 100 % | ∞ (no loss) | 110.80 | – |
| General | ribbon | dir-emax@m15c | 38 | 38 (100 %) | 38 | 100 % | ∞ (no loss) | 110.80 | – |
| General | ribbon | ema-9-21@m15c | 38 | 38 (100 %) | 38 | 100 % | ∞ (no loss) | 110.80 | – |
| General | sweep | r-fvg@m15c | 26 | 26 (100 %) | 26 | 100 % | ∞ (no loss) | 93.20 | – |
| General | magnet | hma-16@m15c | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 83.20 | – |
| General | magnet | hma-16@m15 | 15 | 15 (100 %) | 15 | 100 % | ∞ (no loss) | 57.00 | – |
| General | sweep | act-burst-2.5@x4@m30 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 33.60 | – |
| General | pulse | r-zdist@m15c | 9 | 8 (89 %) | 9 | 89 % | 5.81 | 16.85 | – |
| General | pivot | break-squeeze-t25@m15 | 5 | 4 (80 %) | 35 | 69 % | 1.44 | 16.79 | tp3.2 sl3.2 tr1.6 h64 gn (8 · 1.80 · 5.44) |
| General | revert | r-star@m30 | 1 | 1 (100 %) | 10 | 60 % | 2.10 | 16.65 | tp3.6 sl3.6 tr2.7 h48 gn (10 · 2.10 · 16.65) |
| General | sweep | r-rsi2@m30 | 6 | 5 (83 %) | 12 | 83 % | 8.28 | 16.05 | – |
| General | ribbon | trend-adx-20@m15c | 8 | 5 (63 %) | 6 | 83 % | 279.99 | 15.68 | – |
| General | ribbon | r-chand-m@m15 | 6 | 4 (67 %) | 16 | 75 % | 2.36 | 15.42 | – |
| General | ribbon | move-impulse-10-2@m15 | 6 | 6 (100 %) | 26 | 58 % | 1.53 | 13.94 | tp3.6 sl1.8 tr0 h64 gn (5 · 1.78 · 3.11) |
| General | ribbon | macd-zero@m15 | 2 | 2 (100 %) | 16 | 50 % | 1.74 | 13.60 | tp4.4 sl2.2 tr0 h64 gn (8 · 1.75 · 7.20) |
| General | ribbon | dir-emax-12-26@m15 | 2 | 2 (100 %) | 16 | 50 % | 1.74 | 13.60 | tp4.4 sl2.2 tr0 h64 gn (8 · 1.75 · 7.20) |
| General | revert | r-chop-m@m15 | 1 | 1 (100 %) | 11 | 64 % | 2.05 | 12.20 | tp3.6 sl2.7 tr0 h96 gn (11 · 2.05 · 12.20) |
| General | sweep | willr-14-90@m15c | 2 | 2 (100 %) | 42 | 52 % | 1.23 | 12.06 | tp3.2 sl2.4 tr0 h96 gn (21 · 1.27 · 7.00) |
| General | sweep | willr-14-95@m30 | 32 | 18 (56 %) | 208 | 50 % | 1.03 | 9.15 | tp4.4 sl4.4 tr0 h32 gn (6 · 2.47 · 7.49) |
| General | sweep | break-squeeze-30@m30 | 2 | 2 (100 %) | 37 | 57 % | 1.18 | 9.03 | tp4.4 sl4.4 tr2.2 h32 gn (19 · 1.21 · 5.20) |
| General | pivot | r-ultimate@m15c | 10 | 6 (60 %) | 10 | 60 % | 1.73 | 8.60 | – |
| General | revert | r-stc@m15c | 2 | 1 (50 %) | 15 | 60 % | 1.43 | 7.62 | tp3.6 sl2.7 tr0 h64 gn (9 · 1.99 · 8.65) |
| General | follow | r-chand-m@m15c | 3 | 3 (100 %) | 19 | 47 % | 1.23 | 6.60 | tp4.4 sl2.2 tr0 h96 gn (7 · 1.31 · 3.00) |
| General | sweep | break-vol-1.3@m15c | 2 | 2 (100 %) | 10 | 80 % | 1.91 | 6.16 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 1.91 · 3.08) |
| General | pivot | move-impulse-20-2.5@m15c | 1 | 1 (100 %) | 14 | 57 % | 1.22 | 6.00 | tp4.4 sl4.4 tr0 h96 gn (14 · 1.22 · 6.00) |
| General | revert | break-vol-2@m30 | 3 | 2 (67 %) | 28 | 50 % | 1.09 | 4.90 | tp4 sl3 tr0 h48 gn (10 · 1.19 · 3.00) |
| General | sweep | rsi-fast@m15 | 19 | 10 (53 %) | 144 | 53 % | 1.02 | 3.68 | tp3.6 sl3.6 tr1.8 h64 gn (7 · 2.58 · 6.83) |
| General | sweep | willr-7-80@m15c | 1 | 1 (100 %) | 39 | 49 % | 1.06 | 3.06 | tp3.2 sl2.4 tr0 h64 gn (39 · 1.06 · 3.06) |
| General | follow | r-vortex@m15c | 7 | 3 (43 %) | 60 | 48 % | 1.02 | 1.57 | tp4 sl4 tr0 h96 gn (8 · 1.51 · 6.40) |
| General | ribbon | dir-vwap-240@m15c | 2 | 1 (50 %) | 47 | 64 % | 1.02 | 1.28 | tp4 sl4 tr2 h96 gn (25 · 1.14 · 4.23) |
| General | clamp | break-vol-2@m15c | 3 | 1 (33 %) | 6 | 50 % | 0.99 | -0.10 | – |
| General | pivot | mfi-14-20@m15c | 1 | 0 (0 %) | 5 | 60 % | 0.90 | -0.73 | tp3.6 sl3.6 tr2.7 h64 gn (5 · 0.90 · -0.73) |
| General | sweep | srsi-14-10@m15c | 1 | 0 (0 %) | 20 | 45 % | 0.96 | -1.30 | tp3.6 sl2.7 tr0 h64 gn (20 · 0.96 · -1.30) |
| General | sweep | willr-7-90@m15c | 2 | 1 (50 %) | 27 | 48 % | 0.97 | -1.40 | tp4 sl4 tr0 h96 gn (13 · 1.06 · 1.40) |
| General | revert | r-klinger@m15c | 4 | 2 (50 %) | 22 | 64 % | 0.91 | -2.42 | tp3.2 sl3.2 tr1.6 h64 gn (6 · 1.13 · 0.90) |
| General | ribbon | r-linreg-m@m30 | 6 | 4 (67 %) | 7 | 71 % | 0.50 | -3.98 | – |
| General | sweep | break-squeeze-t10@m30 | 1 | 0 (0 %) | 12 | 50 % | 0.80 | -4.20 | tp4.4 sl4.4 tr2.2 h32 gn (12 · 0.80 · -4.20) |
| General | sweep | willr-14-80@m15c | 4 | 3 (75 %) | 207 | 48 % | 0.99 | -4.43 | tp3.2 sl2.4 tr0 h96 gn (52 · 1.07 · 4.80) |
| General | sweep | willr-14-95@m15c | 3 | 0 (0 %) | 18 | 44 % | 0.83 | -4.96 | tp4.4 sl2.2 tr0 h64 gn (6 · 0.87 · -1.20) |
| General | sweep | willr-28-90@m30 | 1 | 0 (0 %) | 13 | 46 % | 0.78 | -7.00 | tp4.4 sl4.4 tr0 h48 gn (13 · 0.78 · -7.00) |
| General | revert | r-klinger-m@m15c | 3 | 0 (0 %) | 21 | 43 % | 0.78 | -7.40 | tp3.2 sl2.4 tr0 h64 gn (7 · 0.87 · -1.40) |
| General | ribbon | willr-50-95@m15 | 1 | 0 (0 %) | 11 | 55 % | 0.38 | -11.52 | tp4.4 sl4.4 tr2.2 h96 gn (11 · 0.38 · -11.52) |
| General | ribbon | r-camarilla-m@m15 | 8 | 4 (50 %) | 16 | 38 % | 0.50 | -13.08 | – |
| General | revert | cci-14-200@x4@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.01 | -15.04 | – |
| General | magnet | rsi-div@m15 | 12 | 5 (42 %) | 60 | 42 % | 0.85 | -15.25 | tp4.4 sl3.3 tr0 h64 gn (5 · 1.85 · 3.87) |
| General | sweep | willr-14-95@m15 | 4 | 1 (25 %) | 36 | 44 % | 0.71 | -17.90 | tp4 sl4 tr3 h96 gn (8 · 1.01 · 0.16) |
| General | sweep | willr-50-95@m30 | 2 | 0 (0 %) | 10 | 20 % | 0.30 | -19.60 | tp4.4 sl3.3 tr0 h32 gn (5 · 0.30 · -9.80) |
| General | follow | r-rsi2@m30 | 2 | 0 (0 %) | 46 | 57 % | 0.72 | -20.68 | tp4.4 sl4.4 tr2.2 h32 gn (23 · 0.72 · -10.34) |
| General | magnet | kelt-20-2.5@m15c | 9 | 4 (44 %) | 9 | 44 % | 0.06 | -20.88 | – |
| General | ribbon | willr-50-95@m15c | 2 | 0 (0 %) | 14 | 29 % | 0.28 | -23.62 | tp4.4 sl4.4 tr2.2 h64 gn (7 · 0.32 · -9.72) |
| General | ribbon | willr-28-95@m15c | 4 | 0 (0 %) | 22 | 36 % | 0.22 | -24.11 | tp3.6 sl3.6 tr1.8 h96 gn (5 · 0.50 · -1.98) |
| General | revert | r-clv-thrust@m15c | 1 | 0 (0 %) | 15 | 33 % | 0.44 | -25.25 | tp4.4 sl4.4 tr0 h64 gn (15 · 0.44 · -25.25) |
| General | magnet | r-chand@m15 | 6 | 0 (0 %) | 29 | 52 % | 0.54 | -25.87 | tp3.6 sl3.6 tr1.8 h96 gn (6 · 0.84 · -1.26) |
| General | ribbon | ema-slope-200@m30 | 3 | 0 (0 %) | 36 | 36 % | 0.61 | -30.54 | tp4.4 sl4.4 tr0 h48 gn (11 · 0.76 · -6.60) |
| General | pivot | break-don10@m15c | 3 | 0 (0 %) | 24 | 38 % | 0.50 | -31.41 | tp3.6 sl3.6 tr0 h96 gn (8 · 0.54 · -8.80) |
| General | pivot | aroon-14@m15c | 3 | 0 (0 %) | 12 | 25 % | 0.17 | -32.45 | – |
| General | ribbon | r-streak@m30 | 2 | 0 (0 %) | 12 | 0 % | 0.00 | -33.00 | tp3.2 sl2.4 tr0 h48 gn (6 · 0.00 · -15.60) |
| General | revert | break-vol@m30 | 3 | 0 (0 %) | 36 | 36 % | 0.57 | -35.70 | tp4 sl3 tr0 h32 gn (13 · 0.61 · -9.90) |
| General | sweep | r-pin@m15 | 4 | 0 (0 %) | 43 | 42 % | 0.52 | -37.66 | tp4.4 sl4.4 tr2.2 h96 gn (10 · 0.71 · -6.67) |
| General | ribbon | ha-1@m15c | 4 | 0 (0 %) | 19 | 0 % | 0.00 | -38.40 | tp3.2 sl1.6 tr0 h64 gn (5 · 0.00 · -9.00) |
| General | sweep | willr-50-95@m15c | 2 | 0 (0 %) | 19 | 16 % | 0.19 | -42.50 | tp3.6 sl3.6 tr0 h96 gn (9 · 0.26 · -19.80) |
| General | sweep | willr-14-90@m30 | 9 | 2 (22 %) | 143 | 48 % | 0.78 | -48.25 | tp3.2 sl2.4 tr0 h32 gn (17 · 1.03 · 0.60) |
| General | ribbon | dir-vwap@m15 | 13 | 2 (15 %) | 65 | 40 % | 0.57 | -56.76 | tp4.4 sl2.2 tr0 h96 gn (5 · 1.17 · 1.20) |
| General | sweep | willr-50-90@m30 | 3 | 0 (0 %) | 47 | 45 % | 0.50 | -59.33 | tp4.4 sl4.4 tr0 h48 gn (15 · 0.80 · -7.40) |
| General | pivot | r-valuearea-m@m15 | 22 | 0 (0 %) | 33 | 0 % | 0.00 | -59.71 | – |
| General | sweep | willr-50-95@m15 | 5 | 0 (0 %) | 74 | 31 % | 0.51 | -70.33 | tp3.2 sl2.4 tr0 h64 gn (15 · 0.63 · -8.83) |
| General | sweep | willr-21-95@m15 | 21 | 10 (48 %) | 288 | 52 % | 0.84 | -72.96 | tp4.4 sl4.4 tr0 h96 gn (9 · 1.83 · 11.40) |
| General | sweep | willr-21-95@m15c | 15 | 2 (13 %) | 122 | 47 % | 0.62 | -75.00 | tp4.4 sl4.4 tr3.3 h96 gn (6 · 2.86 · 8.80) |
| General | ribbon | break-retest@m15 | 27 | 0 (0 %) | 44 | 30 % | 0.04 | -99.66 | – |
| General | magnet | willr-28-95@m15 | 25 | 0 (0 %) | 75 | 31 % | 0.30 | -101.95 | – |
| General | magnet | willr-28-95@m15c | 40 | 0 (0 %) | 120 | 32 % | 0.38 | -130.18 | – |
| General | ribbon | willr-28-95@m15 | 17 | 0 (0 %) | 96 | 36 % | 0.25 | -148.29 | tp3.6 sl3.6 tr1.8 h64 gn (6 · 0.69 · -1.24) |
| General | ribbon | willr-28-95@m30 | 11 | 0 (0 %) | 82 | 21 % | 0.25 | -150.79 | tp3.6 sl1.8 tr0 h48 gn (9 · 0.49 · -7.20) |
| General | sweep | willr-21-90@m15c | 19 | 2 (11 %) | 403 | 52 % | 0.75 | -159.57 | tp3.2 sl2.4 tr0 h96 gn (23 · 1.06 · 1.80) |
| General | sweep | willr-28-95@m15c | 13 | 0 (0 %) | 102 | 25 % | 0.17 | -175.90 | tp3.6 sl2.7 tr0 h64 gn (8 · 0.46 · -8.13) |
| General | sweep | willr-21-95@m30 | 25 | 0 (0 %) | 219 | 33 % | 0.43 | -243.15 | tp3.6 sl3.6 tr0 h32 gn (8 · 0.74 · -3.50) |
| General | sweep | willr-28-95@m30 | 25 | 0 (0 %) | 173 | 24 % | 0.32 | -258.87 | tp3.2 sl2.4 tr0 h32 gn (7 · 0.55 · -4.83) |
| Long | ribbon | hma-55@m15c | 50 | 50 (100 %) | 92 | 100 % | ∞ (no loss) | 336.68 | – |
| Long | ribbon | trend-ribbon@m15 | 39 | 33 (85 %) | 33 | 100 % | ∞ (no loss) | 131.24 | – |
| Long | ribbon | dir-emax@m15c | 39 | 33 (85 %) | 33 | 100 % | ∞ (no loss) | 131.24 | – |
| Long | ribbon | ema-9-21@m15c | 39 | 33 (85 %) | 33 | 100 % | ∞ (no loss) | 131.24 | – |
| Long | sweep | r-fvg@m15c | 25 | 25 (100 %) | 25 | 100 % | ∞ (no loss) | 129.32 | – |
| Long | sweep | act-burst-2.5@x4@m30 | 13 | 13 (100 %) | 22 | 100 % | ∞ (no loss) | 113.60 | – |
| Long | revert | r-klinger@m15c | 12 | 10 (83 %) | 38 | 87 % | 5.51 | 92.26 | – |
| Long | pivot | hma-16@m15c | 44 | 36 (82 %) | 60 | 87 % | 3.26 | 88.90 | – |
| Long | sweep | r-fvg@m15 | 5 | 5 (100 %) | 48 | 67 % | 2.48 | 86.92 | tp5.6 sl4.2 tr0 h64 lg (12 · 2.85 · 20.11) |
| Long | ribbon | ema-slope@m15c | 15 | 11 (73 %) | 86 | 60 % | 1.55 | 82.77 | tp5.6 sl2.8 tr0 h64 lg (6 · 3.60 · 15.60) |
| Long | ribbon | ema-slope@m15 | 15 | 11 (73 %) | 86 | 60 % | 1.55 | 82.77 | tp5.6 sl2.8 tr0 h64 lg (6 · 3.60 · 15.60) |
| Long | magnet | hma-16@m15c | 38 | 16 (42 %) | 16 | 100 % | ∞ (no loss) | 55.49 | – |
| Long | magnet | hma-16@m15 | 34 | 9 (26 %) | 9 | 100 % | ∞ (no loss) | 35.74 | – |
| Long | sweep | r-bb-adx-m@m30 | 7 | 5 (71 %) | 5 | 100 % | ∞ (no loss) | 27.40 | – |
| Long | follow | r-spring-m@m15 | 2 | 2 (100 %) | 15 | 67 % | 2.26 | 26.68 | tp5.6 sl4.2 tr0 h64 lg (7 · 2.81 · 15.89) |
| Long | pivot | macd-cross@m15 | 26 | 17 (65 %) | 52 | 50 % | 1.32 | 25.48 | – |
| Long | ribbon | trend-ema-50-200@m15c | 6 | 4 (67 %) | 75 | 51 % | 1.12 | 21.43 | tp5.6 sl4.2 tr0 h64 lg (15 · 1.53 · 14.96) |
| Long | ribbon | r-chand-m@m15 | 20 | 13 (65 %) | 33 | 64 % | 1.62 | 20.11 | – |
| Long | sweep | r-pin@m30 | 2 | 2 (100 %) | 14 | 64 % | 2.04 | 18.22 | tp6 sl6 tr0 h32 lg (6 · 2.29 · 11.19) |
| Long | sweep | r-bbw-expand@m30 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 17.75 | – |
| Long | ribbon | macd-zero@m15 | 9 | 5 (56 %) | 62 | 44 % | 1.14 | 16.89 | tp4.8 sl2.4 tr0 h64 lg (8 · 1.77 · 8.00) |
| Long | ribbon | dir-emax-12-26@m15 | 9 | 5 (56 %) | 62 | 44 % | 1.14 | 16.89 | tp4.8 sl2.4 tr0 h64 lg (8 · 1.77 · 8.00) |
| Long | sweep | cci-20-200@m15 | 9 | 5 (56 %) | 76 | 63 % | 1.10 | 16.30 | tp6.4 sl4.8 tr0 h96 lg (7 · 1.65 · 9.80) |
| Long | ribbon | trend-st-21-5@m15 | 2 | 2 (100 %) | 40 | 48 % | 1.17 | 15.35 | tp6.4 sl3.2 tr0 h96 lg (22 · 1.26 · 11.60) |
| Long | follow | r-chand-m@m15c | 3 | 3 (100 %) | 17 | 47 % | 1.58 | 15.20 | tp5.6 sl2.8 tr0 h96 lg (6 · 1.80 · 7.20) |
| Long | sweep | willr-14-95@m15c | 2 | 2 (100 %) | 10 | 90 % | 283.61 | 14.09 | tp4.8 sl4.8 tr2.4 h64 lg (5 · ∞ (no loss) · 7.14) |
| Long | follow | r-pin@m30 | 2 | 2 (100 %) | 18 | 56 % | 1.34 | 13.84 | tp6.4 sl6.4 tr0 h32 lg (8 · 1.74 · 11.59) |
| Long | sweep | willr-21-95@m15c | 5 | 4 (80 %) | 33 | 61 % | 1.28 | 13.50 | tp5.2 sl5.2 tr2.6 h96 lg (7 · 2.18 · 6.44) |
| Long | pivot | move-impulse-4-1.2@m15 | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 11.72 | – |
| Long | pivot | move-impulse-20-2.5@m15c | 1 | 1 (100 %) | 14 | 57 % | 1.45 | 11.40 | tp4.8 sl4.8 tr0 h64 lg (14 · 1.45 · 11.40) |
| Long | sweep | break-squeeze-30@m30 | 3 | 3 (100 %) | 47 | 55 % | 1.12 | 10.95 | tp5.6 sl5.6 tr2.8 h32 lg (16 · 1.43 · 7.98) |
| Long | pivot | break-squeeze-t25@m15 | 13 | 7 (54 %) | 69 | 55 % | 1.08 | 10.87 | tp5.2 sl3.9 tr0 h64 lg (5 · 1.83 · 6.80) |
| Long | sweep | willr-21-95@m15 | 4 | 3 (75 %) | 46 | 70 % | 1.16 | 9.72 | tp4.8 sl4.8 tr2.4 h96 lg (12 · 1.98 · 9.83) |
| Long | sweep | break-squeeze@m30 | 1 | 1 (100 %) | 12 | 67 % | 1.94 | 9.22 | tp5.2 sl5.2 tr2.6 h32 lg (12 · 1.94 · 9.22) |
| Long | clamp | break-squeeze-t25@m15 | 2 | 2 (100 %) | 8 | 50 % | 1.45 | 6.90 | – |
| Long | sweep | r-clv-thrust-m@m30 | 1 | 1 (100 %) | 5 | 60 % | 1.83 | 6.80 | tp5.2 sl3.9 tr0 h32 lg (5 · 1.83 · 6.80) |
| Long | sweep | r-td@m30 | 7 | 4 (57 %) | 24 | 50 % | 1.07 | 3.96 | – |
| Long | sweep | r-fvg@m30 | 1 | 1 (100 %) | 9 | 78 % | 1.27 | 3.58 | tp6.4 sl6.4 tr3.2 h32 lg (9 · 1.27 · 3.58) |
| Long | sweep | r-pin-m@m15 | 1 | 1 (100 %) | 6 | 67 % | 1.23 | 2.83 | tp6 sl6 tr3 h96 lg (6 · 1.23 · 2.83) |
| Long | pivot | willr-50-95@m15 | 3 | 3 (100 %) | 12 | 42 % | 1.15 | 2.29 | – |
| Long | clamp | break-vol-2@m15c | 3 | 2 (67 %) | 6 | 50 % | 1.11 | 1.40 | – |
| Long | pivot | break-don20@m15c | 2 | 1 (50 %) | 11 | 45 % | 1.02 | 0.50 | tp5.6 sl4.2 tr0 h96 lg (6 · 1.23 · 3.00) |
| Long | clamp | cci-40-200@x4@m15 | 3 | 1 (33 %) | 6 | 50 % | 1.00 | 0.00 | – |
| Long | magnet | willr-50-90@m15c | 3 | 2 (67 %) | 18 | 50 % | 0.99 | -0.30 | tp6 sl6 tr0 h64 lg (6 · 1.04 · 0.45) |
| Long | ribbon | dir-vwap-240@m15c | 4 | 1 (25 %) | 47 | 51 % | 0.95 | -6.04 | tp6.4 sl6.4 tr0 h96 lg (11 · 1.13 · 4.20) |
| Long | pivot | break-squeeze@m15 | 3 | 0 (0 %) | 18 | 67 % | 0.80 | -6.80 | tp4.8 sl4.8 tr2.4 h64 lg (6 · 0.84 · -1.57) |
| Long | ribbon | cmf-20-0.05@m15 | 2 | 0 (0 %) | 31 | 52 % | 0.90 | -7.11 | tp4.8 sl4.8 tr3.6 h96 lg (16 · 0.93 · -2.38) |
| Long | magnet | willr-14-90@m15c | 1 | 0 (0 %) | 5 | 40 % | 0.63 | -7.40 | tp6.4 sl6.4 tr0 h96 lg (5 · 0.63 · -7.40) |
| Long | follow | r-fvg-m@m30 | 2 | 0 (0 %) | 9 | 56 % | 0.69 | -7.40 | tp6.4 sl6.4 tr3.2 h32 lg (5 · 0.88 · -1.30) |
| Long | ribbon | ema-50-100@m15c | 1 | 0 (0 %) | 21 | 48 % | 0.85 | -9.80 | tp5.6 sl5.6 tr0 h96 lg (21 · 0.85 · -9.80) |
| Long | clamp | break-atr-1.5@m30 | 6 | 0 (0 %) | 12 | 50 % | 0.41 | -9.92 | – |
| Long | ribbon | ema-slope-200@m15c | 3 | 1 (33 %) | 44 | 45 % | 0.91 | -12.12 | tp6.4 sl4.8 tr0 h64 lg (18 · 1.11 · 5.08) |
| Long | ribbon | ema-slope-100@m15 | 1 | 0 (0 %) | 10 | 50 % | 0.54 | -12.31 | tp6.4 sl6.4 tr4.8 h96 lg (10 · 0.54 · -12.31) |
| Long | ribbon | macd-zero@m15c | 7 | 3 (43 %) | 42 | 36 % | 0.86 | -13.20 | tp5.6 sl2.8 tr0 h64 lg (7 · 1.35 · 4.20) |
| Long | ribbon | dir-emax-12-26@m15c | 7 | 3 (43 %) | 42 | 36 % | 0.86 | -13.20 | tp5.6 sl2.8 tr0 h64 lg (7 · 1.35 · 4.20) |
| Long | ribbon | willr-14-90@m15c | 1 | 0 (0 %) | 6 | 33 % | 0.47 | -14.00 | tp6.4 sl6.4 tr0 h96 lg (6 · 0.47 · -14.00) |
| Long | ribbon | willr-7-90@m30 | 2 | 0 (0 %) | 6 | 33 % | 0.47 | -14.00 | – |
| Long | magnet | willr-28-95@m15 | 46 | 21 (46 %) | 106 | 42 % | 0.92 | -15.01 | – |
| Long | ribbon | r-streak@m15 | 1 | 0 (0 %) | 5 | 20 % | 0.23 | -15.40 | tp4.8 sl4.8 tr0 h96 lg (5 · 0.23 · -15.40) |
| Long | magnet | willr-50-95@m15 | 3 | 0 (0 %) | 11 | 27 % | 0.37 | -16.10 | tp6.4 sl3.2 tr0 h96 lg (5 · 0.46 · -7.40) |
| Long | sweep | r-pin@m15 | 2 | 0 (0 %) | 15 | 47 % | 0.62 | -17.07 | tp4.8 sl4.8 tr2.4 h96 lg (9 · 0.81 · -3.87) |
| Long | sweep | willr-28-95@m15c | 1 | 0 (0 %) | 7 | 0 % | 0.00 | -17.23 | tp5.2 sl2.6 tr0 h64 lg (7 · 0.00 · -17.23) |
| Long | sweep | willr-7-90@m15c | 6 | 4 (67 %) | 56 | 54 % | 0.83 | -19.06 | tp4.8 sl4.8 tr2.4 h96 lg (11 · 1.29 · 4.36) |
| Long | ribbon | r-streak@m30 | 1 | 0 (0 %) | 6 | 0 % | 0.00 | -19.20 | tp6 sl3 tr0 h48 lg (6 · 0.00 · -19.20) |
| Long | magnet | macd-cross-19-39-9@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -20.30 | – |
| Long | magnet | willr-28-95@m15c | 48 | 20 (42 %) | 114 | 40 % | 0.88 | -22.06 | – |
| Long | revert | r-klinger-m@m15c | 3 | 0 (0 %) | 17 | 35 % | 0.62 | -22.56 | tp6.4 sl6.4 tr0 h96 lg (5 · 0.63 · -7.40) |
| Long | sweep | cci-40-200@x4@m15 | 1 | 0 (0 %) | 6 | 17 % | 0.21 | -22.67 | tp6.4 sl6.4 tr0 h64 lg (6 · 0.21 · -22.67) |
| Long | ribbon | trend-ema-50-200@m30 | 1 | 0 (0 %) | 5 | 20 % | 0.13 | -22.96 | tp6.4 sl6.4 tr4.8 h48 lg (5 · 0.13 · -22.96) |
| Long | clamp | r-qh-flow@m30 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -23.40 | – |
| Long | ribbon | willr-21-95@m30 | 16 | 6 (38 %) | 50 | 42 % | 0.78 | -24.91 | – |
| Long | magnet | willr-21-90@m15c | 3 | 0 (0 %) | 21 | 38 % | 0.62 | -25.06 | tp6.4 sl6.4 tr0 h96 lg (7 · 0.70 · -7.80) |
| Long | follow | break-vol@x4@m15c | 2 | 0 (0 %) | 10 | 20 % | 0.31 | -25.20 | tp5.6 sl4.2 tr0 h96 lg (5 · 0.31 · -12.20) |
| Long | sweep | willr-14-90@m30 | 2 | 0 (0 %) | 18 | 44 % | 0.53 | -25.21 | tp5.2 sl5.2 tr0 h48 lg (8 · 0.56 · -12.00) |
| Long | ribbon | willr-50-90@m30 | 2 | 0 (0 %) | 20 | 40 % | 0.63 | -26.00 | tp6.4 sl6.4 tr4.8 h48 lg (9 · 0.75 · -8.20) |
| Long | pivot | r-ultimate@m15c | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -26.60 | – |
| Long | magnet | willr-21-90@m15 | 2 | 0 (0 %) | 12 | 33 % | 0.47 | -27.20 | tp6 sl6 tr0 h96 lg (6 · 0.47 · -13.20) |
| Long | follow | r-fvg@m30 | 2 | 0 (0 %) | 32 | 47 % | 0.69 | -27.80 | tp5.6 sl4.2 tr0 h32 lg (17 · 0.88 · -4.73) |
| Long | sweep | willr-50-95@m15 | 2 | 0 (0 %) | 17 | 29 % | 0.36 | -32.69 | tp5.2 sl5.2 tr0 h64 lg (10 · 0.35 · -15.69) |
| Long | sandwich | r-cvd-div@m15c | 11 | 1 (9 %) | 17 | 35 % | 0.45 | -32.92 | – |
| Long | pivot | kama-10@m15c | 2 | 0 (0 %) | 8 | 0 % | 0.00 | -35.95 | – |
| Long | revert | break-vol@m30 | 3 | 0 (0 %) | 26 | 42 % | 0.48 | -39.79 | tp5.6 sl5.6 tr2.8 h32 lg (11 · 0.77 · -3.99) |
| Long | ribbon | ichi-cloud-9@m30 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -39.80 | – |
| Long | pulse | r-zdist@m15c | 9 | 1 (11 %) | 9 | 11 % | 0.01 | -42.87 | – |
| Long | ribbon | dir-vwap@m15 | 15 | 2 (13 %) | 68 | 37 % | 0.75 | -44.45 | tp5.6 sl2.8 tr0 h64 lg (5 · 1.20 · 1.80) |
| Long | ribbon | ema-slope-100@m15c | 5 | 0 (0 %) | 55 | 47 % | 0.72 | -47.26 | tp5.2 sl5.2 tr0 h96 lg (14 · 0.93 · -2.80) |
| Long | pivot | r-valuearea-m@m15 | 40 | 0 (0 %) | 33 | 0 % | 0.00 | -48.15 | – |
| Long | sweep | willr-50-95@m15c | 4 | 0 (0 %) | 26 | 31 % | 0.40 | -49.48 | tp5.2 sl5.2 tr0 h64 lg (7 · 0.31 · -11.54) |
| Long | pulse | r-cvd-div@m15c | 22 | 5 (23 %) | 37 | 41 % | 0.53 | -51.28 | – |
| Long | sweep | willr-28-90@m30 | 4 | 0 (0 %) | 49 | 43 % | 0.60 | -51.61 | tp5.2 sl5.2 tr0 h32 lg (13 · 0.71 · -9.58) |
| Long | ribbon | willr-50-95@m15 | 15 | 3 (20 %) | 94 | 38 % | 0.78 | -53.85 | tp6 sl6 tr3 h96 lg (7 · 1.15 · 1.92) |
| Long | ribbon | willr-28-95@m30 | 5 | 0 (0 %) | 28 | 25 % | 0.41 | -58.42 | tp6 sl6 tr0 h48 lg (5 · 0.62 · -7.00) |
| Long | magnet | willr-50-90@m15 | 7 | 0 (0 %) | 50 | 44 % | 0.64 | -60.74 | tp5.2 sl5.2 tr0 h96 lg (8 · 0.93 · -1.60) |
| Long | magnet | r-chand@m15 | 12 | 0 (0 %) | 46 | 48 % | 0.46 | -61.63 | tp4.8 sl4.8 tr2.4 h64 lg (5 · 0.47 · -5.31) |
| Long | magnet | rsi-div@m15 | 7 | 0 (0 %) | 35 | 26 % | 0.25 | -75.06 | tp5.2 sl2.6 tr0 h64 lg (5 · 0.57 · -3.83) |
| Long | sweep | cci-40-200@x4@m15c | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -76.80 | – |
| Long | ribbon | ema-slope-200@m30 | 5 | 0 (0 %) | 37 | 46 % | 0.26 | -82.30 | tp5.6 sl5.6 tr0 h48 lg (7 · 0.70 · -7.00) |
| Long | pivot | break-don10@m15c | 4 | 0 (0 %) | 26 | 12 % | 0.15 | -89.70 | tp5.2 sl3.9 tr0 h96 lg (7 · 0.49 · -10.50) |
| Long | sweep | willr-14-95@m30 | 37 | 8 (22 %) | 172 | 41 % | 0.67 | -114.16 | tp6.4 sl4.8 tr0 h32 lg (5 · 1.73 · 4.02) |
| Long | follow | r-connors@m30 | 9 | 0 (0 %) | 84 | 43 % | 0.55 | -134.64 | tp5.6 sl5.6 tr0 h32 lg (11 · 0.69 · -10.88) |
| Long | magnet | kelt-20-2.5@m15c | 30 | 1 (3 %) | 30 | 3 % | 0.00 | -141.68 | – |
| Long | follow | r-rsi2@m30 | 6 | 0 (0 %) | 96 | 41 % | 0.56 | -154.15 | tp5.6 sl5.6 tr0 h32 lg (17 · 0.70 · -16.48) |
| Long | sweep | willr-14-90@m15c | 12 | 0 (0 %) | 148 | 49 % | 0.59 | -171.04 | tp6 sl6 tr3 h96 lg (14 · 0.84 · -3.95) |
| Long | sweep | willr-50-90@m30 | 13 | 0 (0 %) | 198 | 42 % | 0.65 | -192.03 | tp5.6 sl4.2 tr0 h32 lg (18 · 0.93 · -2.87) |
| Long | sweep | willr-21-90@m15c | 19 | 3 (16 %) | 301 | 52 % | 0.70 | -205.57 | tp4.8 sl4.8 tr0 h96 lg (15 · 1.05 · 1.80) |
| Long | ribbon | break-retest@m15 | 43 | 0 (0 %) | 64 | 33 % | 0.03 | -220.85 | – |
| Long | ribbon | willr-28-95@m15c | 31 | 0 (0 %) | 106 | 23 % | 0.22 | -254.75 | tp4.8 sl2.4 tr0 h96 lg (6 · 0.35 · -8.40) |
| Long | sweep | rsi-fast@m15 | 31 | 0 (0 %) | 201 | 43 % | 0.58 | -260.50 | tp4.8 sl4.8 tr2.4 h64 lg (7 · 0.84 · -2.35) |
| Long | ribbon | willr-28-95@m15 | 36 | 0 (0 %) | 139 | 28 % | 0.33 | -278.88 | tp4.8 sl3.6 tr0 h64 lg (5 · 0.39 · -7.23) |
| Long | sweep | willr-28-95@m30 | 30 | 0 (0 %) | 176 | 24 % | 0.30 | -384.06 | tp5.2 sl5.2 tr2.6 h32 lg (6 · 0.56 · -4.90) |
| Long | sweep | willr-21-95@m30 | 31 | 0 (0 %) | 231 | 27 % | 0.30 | -423.80 | tp4.8 sl4.8 tr2.4 h32 lg (8 · 0.26 · -7.67) |
| Wide | sweep | r-pin-m@m15 | 3 | 3 (100 %) | 15 | 80 % | 46.26 | 145.96 | tp0.8 sl0.8 tr0 h32 ax-geo3 axis (5 · 52.79 · 55.68) |
| Wide | ribbon | r-pin-m@m15 | 3 | 3 (100 %) | 6 | 50 % | 232.82 | 139.09 | – |
| Wide | sweep | cci-40-200@m5c | 13 | 13 (100 %) | 66 | 39 % | 3.09 | 66.42 | tp0.76 sl0.68 tr0 h96 axd-atr2 axis (5 · 3.64 · 5.55) |
| Wide | revert | break-vol-2@m30 | 6 | 6 (100 %) | 60 | 55 % | 2.86 | 58.53 | tp1.13 sl1.13 tr0 h16 ax-fib2 axis (10 · 3.22 · 10.14) |
| Wide | pivot | sar-0.03@m15c | 12 | 12 (100 %) | 24 | 100 % | ∞ (no loss) | 57.79 | – |
| Wide | magnet | trix-15@m30 | 15 | 15 (100 %) | 45 | 93 % | 8.08 | 45.60 | – |
| Wide | ribbon | sar-0.03@m15c | 6 | 6 (100 %) | 18 | 83 % | 5.78 | 21.91 | – |
| Wide | ribbon | macd-cross-19-39-9@m15 | 6 | 6 (100 %) | 24 | 75 % | 2.63 | 20.88 | – |
| Wide | pivot | break-atr-1.5@m15 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 19.36 | – |
| Wide | magnet | mfi-14-10@m15 | 3 | 3 (100 %) | 9 | 33 % | 1.92 | 18.17 | – |
| Wide | ribbon | move-impulse-20-2.5@m30 | 33 | 27 (82 %) | 66 | 41 % | 1.41 | 15.23 | – |
| Wide | ribbon | hma-55@m15c | 33 | 24 (73 %) | 66 | 55 % | 1.50 | 15.11 | – |
| Wide | sweep | willr-50-95@m5c | 3 | 3 (100 %) | 18 | 67 % | 2.36 | 13.46 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (6 · 2.36 · 4.49) |
| Wide | ribbon | move-cont@m1 | 6 | 6 (100 %) | 93 | 55 % | 1.29 | 8.74 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (15 · 1.44 · 2.32) |
| Wide | magnet | trix-15@m15c | 3 | 3 (100 %) | 54 | 56 % | 1.17 | 6.59 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (18 · 1.17 · 2.20) |
| Wide | sweep | willr-28-95@m5c | 9 | 9 (100 %) | 36 | 33 % | 1.18 | 3.83 | – |
| Wide | snap | r-zdist-m@m5 | 3 | 3 (100 %) | 15 | 40 % | 1.50 | 2.65 | tp0.76 sl0.68 tr0 h96 ax-geo2 axis (5 · 1.50 · 0.88) |
| Wide | ribbon | r-engulf@m1 | 1 | 1 (100 %) | 6 | 67 % | 2.57 | 2.20 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (6 · 2.57 · 2.20) |
| Wide | sweep | mc-lag-6@m15 | 3 | 3 (100 %) | 6 | 50 % | 1.02 | 0.09 | – |
| Wide | ribbon | mc-tpull-8@m5 | 6 | 3 (50 %) | 6 | 50 % | 0.77 | -1.25 | – |
| Wide | pivot | kelt-20-2.5@m30 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -5.38 | – |
| Wide | revert | break-squeeze-30@m5c | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -6.21 | – |
| Wide | magnet | rsi-div@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.32 | -6.56 | – |
| Wide | magnet | r-fvg@m5 | 6 | 0 (0 %) | 36 | 33 % | 0.61 | -7.00 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (6 · 0.61 · -1.17) |
| Wide | ribbon | break-retest@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.29 | -7.08 | – |
| Wide | revert | r-klinger@m15c | 12 | 0 (0 %) | 24 | 50 % | 0.53 | -7.31 | – |
| Wide | revert | break-vol@m30 | 3 | 0 (0 %) | 51 | 47 % | 0.84 | -7.70 | tp1.13 sl1.13 tr0 h16 ax-volume2 axis (17 · 0.84 · -2.57) |
| Wide | clamp | r-sweep-m@m5 | 3 | 0 (0 %) | 12 | 25 % | 0.45 | -8.40 | – |
| Wide | follow | break-vol@x4@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -9.00 | – |
| Wide | pivot | r-sweep-m@m5 | 6 | 0 (0 %) | 30 | 40 % | 0.35 | -12.62 | tp0.76 sl0.68 tr0 h96 axd-geo2h axis (6 · 0.23 · -3.32) |
| Wide | pivot | willr-7-90@m30 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -14.80 | – |
| Wide | sweep | r-bos@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -14.88 | – |
| Wide | pulse | move-impulse-10-2@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.16 | -15.38 | – |
| Wide | magnet | r-fisher@m15 | 15 | 0 (0 %) | 30 | 30 % | 0.29 | -20.91 | – |
| Wide | magnet | mc-rsit7-30@m15c | 15 | 0 (0 %) | 30 | 50 % | 0.49 | -26.27 | – |
| Wide | pivot | kelt-20-2@m15c | 9 | 0 (0 %) | 18 | 0 % | 0.00 | -28.91 | – |
| Wide | revert | r-pdhl@m1 | 20 | 0 (0 %) | 420 | 35 % | 0.55 | -89.50 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (21 · 0.66 · -3.38) |
| Wide | snap | break-fail@m1c | 12 | 0 (0 %) | 246 | 18 % | 0.30 | -103.24 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (21 · 0.40 · -7.85) |
| Wide | clamp | break-fail@m1c | 5 | 0 (0 %) | 380 | 22 % | 0.43 | -119.06 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (76 · 0.44 · -23.08) |
| Wide | pulse | break-fail@m1c | 15 | 0 (0 %) | 316 | 17 % | 0.26 | -143.44 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (18 · 0.49 · -4.85) |
| Wide | ribbon | break-fail@m1c | 7 | 0 (0 %) | 364 | 15 % | 0.24 | -162.91 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (52 · 0.24 · -23.25) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 29 (97 %) | 1673 | 78 % | 1.99 | 2200.51 | tp6 sl18 tr0 h96 (27 · 8.29 · 132.60) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 29 (97 %) | 1702 | 79 % | 1.96 | 2164.84 | tp6 sl18 tr4.8 h96 (26 · 188.30 · 133.90) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 29 (97 %) | 1242 | 81 % | 2.51 | 2050.54 | tp8 sl24 tr4.8 h96 (23 · 67.30 · 105.77) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 29 (97 %) | 1685 | 78 % | 1.83 | 2004.87 | tp8 sl24 tr4.8 h96 (29 · 4.62 · 114.16) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 1338 | 80 % | 2.20 | 1935.56 | tp6 sl18 tr0 h96 (21 · ∞ (no loss) · 121.80) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 29 (97 %) | 1385 | 79 % | 2.08 | 1935.22 | tp4 sl8 tr0 h96 (47 · 2.65 · 94.60) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 27 (90 %) | 938 | 83 % | 3.28 | 1893.04 | tp8 sl24 tr6.4 h96 (17 · ∞ (no loss) · 118.04) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 30 (100 %) | 1054 | 83 % | 2.98 | 1868.54 | tp5 sl15 tr2 h96 (42 · 34.67 · 94.36) |
| Signals | follow | sig-vwap-s@m15 | 30 | 30 (100 %) | 1006 | 85 % | 2.83 | 1807.56 | tp5 sl15 tr3 h96 (31 · 6.96 · 91.33) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 29 (97 %) | 1274 | 79 % | 2.01 | 1654.55 | tp6 sl18 tr0 h96 (20 · ∞ (no loss) · 116.00) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 29 (97 %) | 1274 | 79 % | 2.01 | 1654.55 | tp6 sl18 tr0 h96 (20 · ∞ (no loss) · 116.00) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 30 (100 %) | 1006 | 82 % | 2.55 | 1646.03 | tp6 sl18 tr2.4 h96 (31 · 1271.09 · 101.72) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 28 (93 %) | 1163 | 79 % | 2.19 | 1627.79 | tp6 sl18 tr2.4 h96 (38 · 238.85 · 115.03) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 28 (93 %) | 1732 | 77 % | 1.62 | 1616.88 | tp6 sl18 tr4.8 h96 (25 · 96.61 · 122.36) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 28 (93 %) | 1049 | 78 % | 2.26 | 1585.32 | tp8 sl24 tr3.2 h96 (31 · ∞ (no loss) · 111.57) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 1251 | 79 % | 2.01 | 1581.42 | tp8 sl24 tr3.2 h96 (30 · 20.44 · 104.63) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 28 (93 %) | 1420 | 77 % | 1.79 | 1571.24 | tp6 sl18 tr2.4 h96 (46 · 29.65 · 118.38) |
| Signals | follow | sig-obv-s@m15 | 30 | 30 (100 %) | 1225 | 79 % | 1.99 | 1568.21 | tp5 sl15 tr2 h96 (48 · 6.44 · 102.73) |
| Signals | follow | sig-thrust-m@m15 | 30 | 27 (90 %) | 1464 | 77 % | 1.72 | 1541.43 | tp8 sl24 tr4.8 h96 (27 · 56.91 · 116.39) |
| Signals | follow | sig-swing-s@m15 | 30 | 28 (93 %) | 1256 | 77 % | 1.85 | 1518.44 | tp6 sl18 tr0 h96 (20 · ∞ (no loss) · 116.00) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 990 | 80 % | 2.39 | 1479.75 | tp5 sl15 tr2 h96 (42 · 23.95 · 95.42) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 30 (100 %) | 880 | 82 % | 2.72 | 1445.78 | tp5 sl15 tr2 h96 (34 · 255.09 · 91.82) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 26 (87 %) | 1365 | 76 % | 1.71 | 1400.29 | tp6 sl18 tr2.4 h96 (50 · 48.69 · 132.69) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 28 (93 %) | 720 | 82 % | 3.16 | 1354.56 | tp8 sl24 tr3.2 h96 (19 · 25.68 · 79.12) |
| Signals | follow | sig-obv-m@m15 | 30 | 30 (100 %) | 1214 | 78 % | 1.74 | 1334.71 | tp8 sl24 tr6.4 h96 (16 · 4.03 · 73.40) |
| Signals | follow | sig-hma-m@m15 | 30 | 30 (100 %) | 709 | 83 % | 3.16 | 1322.60 | tp6 sl18 tr0 h96 (13 · ∞ (no loss) · 75.40) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 28 (93 %) | 1367 | 76 % | 1.64 | 1318.12 | tp6 sl18 tr2.4 h96 (40 · 34.51 · 108.88) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 30 (100 %) | 977 | 80 % | 2.01 | 1298.70 | tp5 sl15 tr0 h96 (23 · 6.95 · 90.40) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 28 (93 %) | 761 | 81 % | 2.45 | 1256.77 | tp5 sl15 tr0 h96 (17 · ∞ (no loss) · 81.60) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 26 (87 %) | 977 | 79 % | 1.94 | 1228.92 | tp6 sl18 tr0 h96 (14 · ∞ (no loss) · 81.20) |
| Signals | follow | sig-donchian-s@m15 | 30 | 26 (87 %) | 1188 | 76 % | 1.66 | 1216.98 | tp5 sl15 tr4 h96 (33 · 8.67 · 119.46) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 27 (90 %) | 899 | 78 % | 1.93 | 1195.63 | tp8 sl24 tr4.8 h96 (18 · ∞ (no loss) · 103.71) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 30 (100 %) | 625 | 85 % | 3.53 | 1189.42 | tp5 sl15 tr0 h96 (12 · ∞ (no loss) · 57.60) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 30 (100 %) | 825 | 80 % | 2.25 | 1170.30 | tp6 sl18 tr2.4 h96 (28 · 116.31 · 71.16) |
| Signals | follow | sig-kama-m@m15 | 30 | 27 (90 %) | 1164 | 75 % | 1.65 | 1135.15 | tp8 sl24 tr6.4 h96 (14 · 45.76 · 99.18) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 29 (97 %) | 776 | 81 % | 2.36 | 1130.23 | tp3 sl9 tr0 h96 (30 · 4.26 · 60.00) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 28 (93 %) | 877 | 80 % | 2.03 | 1105.21 | tp6 sl18 tr0 h96 (14 · ∞ (no loss) · 81.20) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 29 (97 %) | 620 | 82 % | 2.77 | 1104.87 | tp5 sl15 tr2 h96 (25 · 255.60 · 66.52) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 27 (90 %) | 1305 | 75 % | 1.54 | 1094.66 | tp8 sl24 tr4.8 h96 (21 · 129.19 · 104.25) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 29 (97 %) | 732 | 81 % | 2.26 | 1081.64 | tp6 sl18 tr2.4 h96 (24 · 722.02 · 83.61) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 29 (97 %) | 695 | 80 % | 2.49 | 1078.68 | tp5 sl15 tr0 h96 (15 · ∞ (no loss) · 72.00) |
| Signals | follow | sig-cmf-m@m15 | 30 | 23 (77 %) | 922 | 76 % | 1.78 | 1074.69 | tp5 sl15 tr0 h96 (21 · ∞ (no loss) · 100.80) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 26 (87 %) | 1034 | 76 % | 1.74 | 1046.60 | tp5 sl15 tr3 h96 (34 · 40.41 · 79.10) |
| Signals | follow | sig-impulse-m@m15 | 30 | 26 (87 %) | 981 | 77 % | 1.71 | 1029.54 | tp6 sl18 tr0 h96 (16 · ∞ (no loss) · 92.80) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 27 (90 %) | 798 | 78 % | 1.99 | 1012.47 | tp5 sl15 tr0 h96 (15 · ∞ (no loss) · 72.00) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 29 (97 %) | 535 | 81 % | 2.88 | 1006.70 | tp8 sl24 tr4.8 h96 (10 · 197.12 · 64.58) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 27 (90 %) | 1349 | 76 % | 1.44 | 999.16 | tp5 sl15 tr2 h96 (53 · 3.71 · 85.96) |
| Signals | follow | sig-sar-s@m15 | 30 | 24 (80 %) | 1352 | 76 % | 1.43 | 973.66 | tp8 sl24 tr3.2 h96 (26 · ∞ (no loss) · 89.09) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 28 (93 %) | 1314 | 75 % | 1.46 | 972.54 | tp6 sl18 tr0 h96 (17 · 5.10 · 74.60) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 29 (97 %) | 452 | 83 % | 3.61 | 948.40 | tp4 sl12 tr0 h96 (16 · ∞ (no loss) · 60.80) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 27 (90 %) | 558 | 82 % | 2.33 | 938.38 | tp6 sl18 tr0 h96 (11 · ∞ (no loss) · 63.80) |
| Signals | follow | sig-cci-s@m15 | 30 | 26 (87 %) | 1087 | 76 % | 1.60 | 936.15 | tp5 sl15 tr3 h96 (33 · 6.09 · 82.75) |
| Signals | follow | sig-adx-m@m15 | 30 | 27 (90 %) | 360 | 86 % | 4.71 | 918.22 | tp6 sl18 tr0 h96 (9 · ∞ (no loss) · 52.20) |
| Signals | follow | sig-thrust-s@m15 | 30 | 25 (83 %) | 931 | 76 % | 1.68 | 907.02 | tp8 sl24 tr4.8 h96 (16 · ∞ (no loss) · 90.68) |
| Signals | follow | sig-donchian-m@m15 | 30 | 24 (80 %) | 660 | 78 % | 2.08 | 905.18 | tp5 sl15 tr2 h96 (26 · 120.58 · 73.08) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 24 (80 %) | 1182 | 74 % | 1.43 | 875.30 | tp8 sl24 tr4.8 h96 (20 · 301.37 · 98.91) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 449 | 84 % | 3.05 | 860.57 | tp8 sl24 tr4.8 h96 (7 · ∞ (no loss) · 54.60) |
| Signals | follow | sig-kama-s@m15 | 30 | 27 (90 %) | 1147 | 76 % | 1.43 | 840.68 | tp6 sl18 tr2.4 h96 (36 · 4.13 · 72.32) |
| Signals | follow | sig-trix-s@m15 | 30 | 29 (97 %) | 623 | 80 % | 2.18 | 823.29 | tp6 sl18 tr2.4 h96 (24 · 661.42 · 68.28) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 22 (73 %) | 1155 | 74 % | 1.43 | 819.99 | tp8 sl24 tr3.2 h96 (35 · 101.63 · 104.57) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 25 (83 %) | 1041 | 75 % | 1.47 | 806.22 | tp8 sl24 tr6.4 h96 (16 · 105.52 · 93.55) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 26 (87 %) | 691 | 75 % | 1.98 | 804.89 | tp5 sl15 tr4 h96 (15 · ∞ (no loss) · 63.24) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 26 (87 %) | 595 | 76 % | 2.07 | 799.67 | tp6 sl18 tr0 h96 (10 · ∞ (no loss) · 58.00) |
| Signals | follow | sig-cmf-s@m15 | 30 | 21 (70 %) | 859 | 75 % | 1.50 | 773.31 | tp6 sl18 tr0 h96 (18 · 5.42 · 80.40) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 26 (87 %) | 595 | 80 % | 1.84 | 743.96 | tp6 sl18 tr0 h96 (12 · ∞ (no loss) · 69.60) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 24 (80 %) | 553 | 79 % | 2.02 | 719.16 | tp6 sl18 tr0 h96 (11 · ∞ (no loss) · 63.80) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 22 (73 %) | 769 | 75 % | 1.54 | 706.95 | tp8 sl24 tr4.8 h96 (15 · 3.96 · 71.70) |
| Signals | follow | sig-trix-m@m15 | 30 | 29 (97 %) | 397 | 80 % | 2.44 | 667.35 | tp6 sl18 tr4.8 h96 (8 · ∞ (no loss) · 46.40) |
| Signals | follow | sig-hma-s@m15 | 30 | 23 (77 %) | 1285 | 74 % | 1.28 | 660.54 | tp6 sl18 tr4.8 h96 (19 · 4.80 · 69.22) |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 25 (83 %) | 355 | 81 % | 2.76 | 640.06 | tp6 sl18 tr4.8 h96 (8 · ∞ (no loss) · 41.27) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 24 (80 %) | 1069 | 75 % | 1.34 | 640.02 | tp8 sl24 tr4.8 h96 (18 · 218.78 · 71.71) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 24 (80 %) | 583 | 75 % | 1.84 | 619.89 | tp4 sl12 tr3.2 h96 (20 · 5.35 · 53.06) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 28 (93 %) | 437 | 84 % | 2.03 | 605.53 | tp5 sl15 tr2 h96 (20 · 3.63 · 40.58) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 20 (67 %) | 1019 | 72 % | 1.34 | 599.98 | tp5 sl15 tr2 h96 (37 · 64.13 · 84.49) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 28 (93 %) | 675 | 75 % | 1.61 | 596.83 | tp5 sl15 tr2 h96 (28 · 3.79 · 44.84) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 26 (87 %) | 606 | 77 % | 1.70 | 592.38 | tp5 sl15 tr2 h96 (22 · ∞ (no loss) · 58.87) |
| Signals | follow | sig-sar-m@m15 | 30 | 21 (70 %) | 976 | 74 % | 1.32 | 563.63 | tp8 sl24 tr6.4 h96 (15 · 151.44 · 86.62) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 30 (100 %) | 325 | 83 % | 2.69 | 555.00 | tp5 sl15 tr2 h96 (12 · ∞ (no loss) · 40.98) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 29 (97 %) | 324 | 84 % | 2.71 | 551.72 | tp6 sl18 tr2.4 h96 (11 · 306.71 · 35.45) |
| Signals | follow | sig-keltner-s@m15 | 30 | 24 (80 %) | 669 | 75 % | 1.51 | 538.48 | tp6 sl18 tr2.4 h96 (21 · 248.17 · 62.66) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 25 (83 %) | 574 | 75 % | 1.65 | 537.19 | tp4 sl12 tr1.6 h96 (30 · 9.05 · 42.31) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 27 (90 %) | 342 | 80 % | 2.44 | 511.82 | tp4 sl8 tr0 h96 (12 · 5.10 · 33.60) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 18 (60 %) | 1234 | 72 % | 1.22 | 507.34 | tp6 sl18 tr2.4 h96 (46 · 5.37 · 91.62) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 17 (57 %) | 808 | 74 % | 1.35 | 502.02 | tp6 sl18 tr0 h96 (13 · ∞ (no loss) · 75.40) |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 27 (90 %) | 205 | 86 % | 5.05 | 481.90 | tp4 sl8 tr0 h96 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 21 (70 %) | 813 | 72 % | 1.34 | 479.54 | tp6 sl18 tr2.4 h96 (29 · 11.49 · 70.04) |
| Signals | follow | sig-zscore-s@m15 | 30 | 21 (70 %) | 813 | 72 % | 1.34 | 479.54 | tp6 sl18 tr2.4 h96 (29 · 11.49 · 70.04) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 23 (77 %) | 630 | 75 % | 1.44 | 473.18 | tp4 sl12 tr0 h96 (17 · 4.98 · 48.60) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 19 (63 %) | 636 | 74 % | 1.37 | 420.34 | tp6 sl18 tr0 h96 (11 · ∞ (no loss) · 63.80) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 198 | 88 % | 3.36 | 384.84 | tp5 sl15 tr3 h96 (8 · 38.93 · 21.21) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 30 (100 %) | 147 | 88 % | 7.42 | 364.51 | tp4 sl12 tr1.6 h96 (8 · 1080.90 · 21.37) |
| Signals | follow | sig-adx-s@m15 | 30 | 21 (70 %) | 544 | 76 % | 1.41 | 360.39 | tp6 sl18 tr0 h96 (8 · ∞ (no loss) · 46.40) |
| Signals | follow | sig-swing-m@m15 | 30 | 15 (50 %) | 985 | 69 % | 1.19 | 357.56 | tp6 sl18 tr0 h96 (13 · ∞ (no loss) · 75.40) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 17 (57 %) | 483 | 72 % | 1.37 | 340.37 | tp8 sl24 tr4.8 h96 (10 · ∞ (no loss) · 55.43) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 16 (53 %) | 847 | 72 % | 1.21 | 339.29 | tp5 sl15 tr2 h96 (33 · 4.18 · 62.89) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 17 (57 %) | 274 | 71 % | 1.66 | 296.22 | tp6 sl12 tr0 h96 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 19 (63 %) | 241 | 80 % | 1.78 | 291.42 | tp6 sl18 tr0 h96 (6 · ∞ (no loss) · 34.80) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 23 (77 %) | 121 | 83 % | 2.88 | 273.90 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 24 (80 %) | 220 | 79 % | 1.93 | 268.05 | tp5 sl15 tr2 h96 (9 · 490.81 · 22.08) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 17 (57 %) | 921 | 71 % | 1.16 | 267.21 | tp6 sl18 tr0 h96 (11 · ∞ (no loss) · 63.80) |
| Signals | follow | sig-s2-vol-break-s@m15 | 25 | 20 (80 %) | 118 | 85 % | 3.75 | 206.05 | tp4 sl8 tr0 h96 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 19 (63 %) | 255 | 72 % | 1.44 | 177.38 | tp8 sl24 tr4.8 h96 (5 · ∞ (no loss) · 25.24) |
| Signals | follow | sig-keltner-m@m15 | 30 | 12 (40 %) | 644 | 69 % | 1.13 | 166.63 | tp6 sl18 tr3.6 h96 (14 · ∞ (no loss) · 62.23) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 22 (73 %) | 161 | 78 % | 1.73 | 158.63 | tp6 sl18 tr2.4 h96 (6 · ∞ (no loss) · 20.06) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 30 | 27 (90 %) | 90 | 83 % | 3.62 | 154.59 | tp5 sl15 tr2 h96 (5 · 144.20 · 10.53) |
| Signals | follow | sig-rsi-momentum-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 | – |
| Signals | follow | sig-volume-break-s@m15 | 23 | 21 (91 %) | 65 | 91 % | 5.96 | 129.50 | – |
| Signals | follow | sig-st-slow-m@m15 | 30 | 23 (77 %) | 112 | 79 % | 1.71 | 118.67 | tp3 sl4.5 tr0 h96 (5 · 2.38 · 6.50) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 95.79 | – |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 16 (53 %) | 979 | 66 % | 1.03 | 60.77 | tp6 sl18 tr2.4 h96 (31 · 22.13 · 69.98) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 19 (63 %) | 552 | 70 % | 1.05 | 54.89 | tp5 sl15 tr2 h96 (24 · 3.41 · 40.14) |
| Signals | follow | sig-mfi-m@m15 | 30 | 15 (50 %) | 150 | 71 % | 1.19 | 46.11 | tp5 sl15 tr2 h96 (6 · ∞ (no loss) · 7.68) |
| Signals | follow | sig-squeeze-m@m15 | 30 | 15 (50 %) | 45 | 64 % | 1.24 | 21.66 | – |
| Signals | follow | sig-act-burst-m@m15 | 30 | 15 (50 %) | 512 | 67 % | 0.97 | -30.09 | tp5 sl15 tr3 h96 (14 · 2.88 · 28.95) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 30 | 14 (47 %) | 51 | 63 % | 0.70 | -40.79 | – |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 16 (53 %) | 625 | 70 % | 0.97 | -44.08 | tp6 sl18 tr2.4 h96 (17 · 2.72 · 31.31) |
| Signals | follow | sig-r-inside-m@m15 | 25 | 7 (28 %) | 40 | 55 % | 0.35 | -103.29 | – |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 13 (43 %) | 618 | 66 % | 0.92 | -116.03 | tp8 sl24 tr4.8 h96 (11 · 73.74 · 51.37) |
| Signals | follow | sig-cci-m@m15 | 30 | 15 (50 %) | 621 | 66 % | 0.90 | -134.82 | tp4 sl12 tr1.6 h96 (31 · 2.01 · 19.31) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 30 | 7 (23 %) | 127 | 57 % | 0.51 | -233.76 | tp4 sl8 tr0 h96 (5 · 0.70 · -5.00) |
| Signals | follow | sig-rsi-reversal-s@m15 | 30 | 4 (13 %) | 190 | 52 % | 0.49 | -335.52 | tp6 sl18 tr2.4 h96 (8 · 3.89 · 12.97) |
| Signals | follow | sig-rsi-reversal-m@m15 | 28 | 1 (4 %) | 89 | 38 % | 0.21 | -392.17 | tp3 sl9 tr1.2 h96 (7 · 0.66 · -4.45) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 7 (23 %) | 398 | 65 % | 0.66 | -394.79 | tp3 sl4.5 tr0 h96 (17 · 1.43 · 10.10) |
| Signals | follow | sig-zscore-m@m15 | 30 | 0 (0 %) | 325 | 51 % | 0.34 | -905.34 | tp5 sl15 tr2 h96 (15 · 0.51 · -16.97) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 3.00× | tr off | 121 | 116 (96 %) | 1446 | 95 % | 6.62 | 6776.26 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 124 | 121 (98 %) | 3036 | 86 % | 6.83 | 6686.59 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 121 | 117 (97 %) | 1701 | 88 % | 6.18 | 6430.63 |
| Signals | tp 5.000% | sl 3.00× | tr off | 122 | 116 (95 %) | 1867 | 92 % | 3.89 | 6154.58 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 124 | 118 (95 %) | 3699 | 85 % | 3.82 | 6131.05 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 124 | 118 (95 %) | 2147 | 89 % | 5.21 | 5925.48 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 120 | 117 (98 %) | 1578 | 89 % | 7.24 | 5852.58 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 124 | 123 (99 %) | 2317 | 89 % | 6.39 | 5828.91 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 120 | 115 (96 %) | 1233 | 88 % | 7.08 | 5710.37 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 124 | 117 (94 %) | 2207 | 87 % | 3.49 | 5689.11 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 124 | 118 (95 %) | 2710 | 86 % | 3.54 | 5622.80 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 124 | 111 (90 %) | 4551 | 80 % | 1.85 | 3628.83 |
| Signals | tp 4.000% | sl 3.00× | tr off | 124 | 102 (82 %) | 2775 | 83 % | 1.56 | 3132.42 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 124 | 104 (84 %) | 3558 | 79 % | 1.58 | 2984.52 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 124 | 105 (85 %) | 3106 | 79 % | 1.52 | 2836.11 |
| Signals | tp 6.000% | sl 2.00× | tr off | 122 | 99 (81 %) | 1851 | 76 % | 1.50 | 2693.58 |
| Signals | tp 5.000% | sl 2.00× | tr off | 123 | 92 (75 %) | 2374 | 74 % | 1.35 | 2208.18 |
| Signals | tp 3.000% | sl 3.00× | tr off | 124 | 94 (76 %) | 3596 | 81 % | 1.32 | 1965.42 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 124 | 95 (77 %) | 4473 | 76 % | 1.33 | 1822.15 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 124 | 93 (75 %) | 3896 | 76 % | 1.29 | 1749.08 |
| Signals | tp 4.000% | sl 2.00× | tr off | 124 | 92 (74 %) | 3199 | 73 % | 1.24 | 1685.04 |
| Signals | tp 4.000% | sl 1.50× | tr off | 124 | 90 (73 %) | 3497 | 67 % | 1.23 | 1678.60 |
| Signals | tp 3.000% | sl 2.00× | tr off | 124 | 91 (73 %) | 4093 | 73 % | 1.23 | 1596.40 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 124 | 91 (73 %) | 5428 | 72 % | 1.27 | 1429.00 |
| Signals | tp 2.500% | sl 3.00× | tr off | 124 | 90 (73 %) | 4151 | 80 % | 1.20 | 1273.39 |
| Signals | tp 6.000% | sl 1.50× | tr off | 124 | 74 (60 %) | 2191 | 65 % | 1.15 | 1068.00 |
| Signals | tp 5.000% | sl 1.50× | tr off | 124 | 73 (59 %) | 2706 | 64 % | 1.09 | 707.71 |
| Signals | tp 2.500% | sl 2.00× | tr off | 124 | 69 (56 %) | 4813 | 70 % | 1.05 | 377.29 |
| Signals | tp 3.000% | sl 1.50× | tr off | 124 | 67 (54 %) | 4676 | 64 % | 1.04 | 335.30 |
| Wide | tp 0.800% | sl 1.00× | tr off | 178 | 81 (46 %) | 376 | 55 % | 2.15 | 330.40 |
| Short | tp 2.600% | sl 2.00× | tr off | 41 | 24 (59 %) | 240 | 73 % | 1.27 | 88.35 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 54 | 33 (61 %) | 277 | 76 % | 1.45 | 81.70 |
| Short | tp 1.800% | sl 1.00× | tr 0.75× | 45 | 23 (51 %) | 217 | 62 % | 1.59 | 78.05 |
| Wide | tp 1.130% | sl 1.00× | tr off | 69 | 48 (70 %) | 240 | 53 % | 1.49 | 76.61 |
| Short | tp 1.800% | sl 1.50× | tr 0.75× | 48 | 25 (52 %) | 369 | 66 % | 1.29 | 75.61 |
| Long | tp 4.800% | sl 0.50× | tr off | 43 | 23 (53 %) | 145 | 43 % | 1.33 | 68.12 |
| Short | tp 2.000% | sl 1.00× | tr 0.75× | 50 | 22 (44 %) | 280 | 65 % | 1.33 | 67.70 |
| Long | tp 5.600% | sl 0.50× | tr off | 38 | 18 (47 %) | 128 | 41 % | 1.24 | 51.31 |
| Wide | tp 0.760% | sl 0.89× | tr off | 56 | 31 (55 %) | 228 | 38 % | 1.35 | 47.54 |
| Short | tp 2.800% | sl 2.00× | tr off | 45 | 23 (51 %) | 291 | 70 % | 1.10 | 45.53 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 1.50× | tr off | 124 | 42 (34 %) | 5503 | 61 % | 0.91 | -805.60 |
| Wide | tp 0.640% | sl 0.84× | tr off | 66 | 7 (11 %) | 1825 | 24 % | 0.39 | -607.21 |
| Long | tp 6.400% | sl 1.00× | tr 0.75× | 77 | 15 (19 %) | 320 | 45 % | 0.55 | -455.52 |
| Long | tp 6.400% | sl 1.00× | tr off | 95 | 17 (18 %) | 320 | 42 % | 0.67 | -376.85 |
| Long | tp 5.600% | sl 1.00× | tr 0.75× | 53 | 12 (23 %) | 167 | 41 % | 0.41 | -279.08 |
| Long | tp 5.200% | sl 1.00× | tr 0.75× | 52 | 13 (25 %) | 212 | 45 % | 0.52 | -265.86 |
| Long | tp 6.000% | sl 1.00× | tr off | 68 | 17 (25 %) | 248 | 41 % | 0.67 | -263.55 |
| Long | tp 6.000% | sl 1.00× | tr 0.75× | 52 | 11 (21 %) | 192 | 41 % | 0.53 | -258.41 |
| Long | tp 5.200% | sl 1.00× | tr off | 76 | 25 (33 %) | 315 | 44 % | 0.76 | -206.39 |
| Short | tp 2.600% | sl 1.00× | tr 0.75× | 39 | 4 (10 %) | 315 | 43 % | 0.53 | -183.87 |
| Short | tp 2.800% | sl 1.00× | tr 0.75× | 37 | 8 (22 %) | 261 | 37 % | 0.53 | -174.91 |
| Long | tp 5.600% | sl 1.00× | tr off | 63 | 17 (27 %) | 216 | 43 % | 0.73 | -168.61 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 57 | 24 (42 %) | 355 | 57 % | 0.74 | -148.88 |
| Short | tp 2.200% | sl 1.50× | tr 0.75× | 60 | 18 (30 %) | 376 | 54 % | 0.70 | -128.87 |
| Long | tp 6.400% | sl 0.75× | tr off | 65 | 17 (26 %) | 166 | 37 % | 0.73 | -126.99 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 43 (43) | 22892 | 11280 | 11280 | 0 | baseTarget 11612 |
| Micro | trailing | 43 (43) | 45784 | 22560 | 22560 | 0 | baseTarget 23224 |
| Short | normal | 251 (209) | 35712 | 11886 | 11886 | 0 | baseTarget 7914 · baseRange 15912 |
| Short | trailing | 251 (209) | 71424 | 23772 | 23772 | 0 | baseTarget 15828 · baseRange 31824 |
| General | normal | 251 (196) | 23808 | 7836 | 7836 | 0 | baseRange 12240 · baseTarget 3732 |
| General | trailing | 251 (196) | 15872 | 5224 | 5224 | 0 | baseRange 8160 · baseTarget 2488 |
| Long | normal | 251 (216) | 29760 | 12132 | 12132 | 0 | baseRange 12360 · baseTarget 5268 |
| Long | trailing | 251 (216) | 19840 | 8088 | 8088 | 0 | baseRange 8240 · baseTarget 3512 |
| Wide | axis | 294 (294) | 49005 | 49005 | 49005 | 0 | – |
| Wide | dca | 294 (294) | 4356 | 4356 | 4356 | 0 | – |
| Wide | dca-active | 294 (294) | 4356 | 4356 | 4356 | 0 | – |

Engine indications Base evaluated that built no set: 97 (bb-walk, bb-walk-50, break-atr, cci-14-100, dir-emax-20-50, dir-emax-5-13, dir-st, ema-21-55, ema-slope-20, ichi-cloud-20, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-10, mc-burst-3, mc-engulf-20, mc-irsi2-10, mc-iz-25, mc-macdh, mc-qrsi2-5, mc-rsi14-30, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-25, mc-rsi4-30, mc-rsi4-5, mc-rsi5-20, mc-rsi5-25, mc-rsi5-30, mc-rsi7-30, mc-rsi9-15, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.45 (756) | 0.47 (906) | 0.45 (840) | 0.51 (1194) | 0.54 (1786) |
| 1.14× | – | 0.44 (504) | – | – | – | – | – |
| 1.25× | – | 0.47 (504) | 0.43 (756) | 0.47 (906) | 0.44 (840) | 0.57 (1194) | 0.56 (1732) |
| 1.33× | 0.17 (492) | – | – | – | – | – | – |
| 1.5× | 0.17 (492) | 0.50 (504) | 0.42 (756) | 0.49 (906) | 0.51 (822) | 0.60 (1170) | 0.61 (1732) |
| 1.75× | 0.19 (492) | 0.45 (504) | 0.46 (756) | 0.47 (888) | 0.49 (822) | 0.57 (1164) | 0.60 (1714) |
| 2× | 0.18 (492) | 0.46 (504) | 0.44 (744) | 0.46 (888) | 0.46 (816) | 0.57 (1164) | 0.61 (1714) |
| 2.25× | 0.19 (492) | 0.44 (504) | 0.44 (744) | 0.45 (882) | 0.43 (816) | 0.57 (1164) | 0.65 (1714) |
| 2.5× | 0.18 (492) | 0.43 (504) | 0.45 (744) | 0.42 (882) | 0.44 (816) | 0.66 (1164) | 0.71 (1714) |
| 2.75× | 0.17 (492) | 0.39 (504) | 0.41 (744) | 0.43 (882) | 0.54 (816) | 0.73 (1164) | 0.79 (1708) |
| 3× | 0.17 (492) | 0.40 (504) | 0.43 (744) | 0.52 (882) | 0.62 (816) | 0.80 (1164) | 0.76 (1712) |
| 3.25× | 0.16 (492) | 0.38 (504) | 0.52 (744) | 0.61 (882) | 0.61 (816) | 0.79 (1164) | 0.72 (1712) |
| 3.5× | 0.17 (492) | 0.37 (504) | 0.56 (744) | 0.63 (882) | 0.65 (816) | 0.75 (1164) | 0.78 (1712) |
| 3.75× | 0.16 (492) | 0.47 (504) | 0.59 (744) | 0.66 (882) | 0.61 (816) | 0.79 (1164) | 0.75 (1712) |
| 4× | 0.15 (492) | 0.54 (504) | 0.57 (744) | 0.67 (882) | 0.68 (816) | 0.74 (1164) | 0.71 (1712) |
| 4.25× | 0.18 (492) | 0.60 (504) | 0.59 (744) | 0.64 (882) | 0.64 (816) | 0.73 (1164) | 0.75 (1688) |
| 4.5× | 0.21 (492) | 0.62 (504) | 0.59 (744) | 0.68 (882) | 0.65 (816) | 0.70 (1164) | 0.97 (1644) |
| 4.75× | 0.26 (492) | 0.69 (504) | 0.57 (744) | 0.65 (882) | 0.62 (816) | 0.78 (1158) | 0.93 (1644) |
| 5× | 0.27 (492) | 0.71 (504) | 0.62 (744) | 0.65 (882) | 0.69 (798) | 0.82 (1149) | 1.35 (1644) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | ∞ (12) | ∞ (12) | 1.26 (16) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | ∞ (8) | ∞ (8) | ∞ (12) | 0.73 (12) |
| 1.75× | – | – | ∞ (4) | ∞ (8) | ∞ (4) | 0.40 (14) | 0.96 (16) |
| 2× | – | – | – | ∞ (4) | ∞ (4) | ∞ (8) | ∞ (4) |
| 2.25× | – | – | – | 0.21 (12) | ∞ (4) | ∞ (8) | 0.51 (22) |
| 2.5× | – | – | 0.08 (6) | 0.09 (12) | 0.47 (16) | 0.53 (16) | 0.59 (16) |
| 2.75× | – | 0.00 (12) | 0.05 (8) | 0.17 (8) | 0.16 (6) | 0.49 (16) | 2.03 (38) |
| 3× | – | 0.06 (14) | 0.14 (8) | 0.16 (8) | 0.15 (6) | 1.27 (12) | 1.28 (41) |
| 3.25× | 0.00 (8) | 0.05 (14) | 0.13 (8) | 0.15 (8) | 0.14 (6) | 0.53 (20) | 0.49 (117) |
| 3.5× | 0.03 (8) | 0.10 (14) | 0.13 (8) | 0.14 (8) | 0.13 (6) | 0.69 (65) | 0.44 (142) |
| 3.75× | 0.03 (8) | 0.11 (32) | 0.18 (10) | 1.45 (14) | 0.40 (26) | 0.60 (105) | 0.52 (132) |
| 4× | 0.07 (8) | 0.10 (32) | 0.19 (16) | 1.37 (14) | 0.46 (48) | 0.64 (117) | 0.49 (140) |
| 4.25× | 0.08 (26) | 0.12 (36) | 0.58 (16) | 0.44 (46) | 0.56 (69) | 0.60 (117) | 0.50 (168) |
| 4.5× | 0.07 (26) | 0.16 (36) | 0.55 (16) | 0.44 (77) | 0.43 (77) | 0.58 (139) | 0.59 (158) |
| 4.75× | 0.07 (26) | 0.23 (34) | 0.25 (48) | 0.49 (89) | 0.41 (77) | 0.58 (136) | 0.99 (242) |
| 5× | 0.08 (28) | 0.22 (34) | 0.32 (60) | 0.47 (89) | 0.40 (88) | 1.02 (184) | 1.28 (268) |

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
| 3.75× | – | 0.00 (2) | – | – | – | – | ∞ (1) |
| 4× | – | – | – | – | – | – | ∞ (1) |
| 4.25× | – | 0.00 (1) | – | – | – | – | 0.29 (3) |
| 4.5× | – | – | – | 0.00 (2) | 0.12 (4) | 0.07 (3) | 0.14 (2) |
| 4.75× | – | – | – | 0.00 (1) | 0.12 (2) | 0.06 (3) | 1.70 (14) |
| 5× | – | – | – | – | – | 0.24 (3) | ∞ (6) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.93 (14188) | 1.00 (14881) | 0.99 (14725) | 1.01 (16016) | 1.00 (15587) | 0.99 (16051) |
| 1.5× | 0.98 (13644) | 0.95 (13987) | 0.97 (13772) | 0.96 (15096) | 0.95 (14612) | 0.96 (14960) |
| 2× | 1.02 (13128) | 0.97 (13427) | 1.00 (13175) | 1.14 (14260) | 1.16 (13764) | 1.21 (14186) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.35 (438) | 1.16 (628) | 0.82 (642) | 0.82 (823) | 0.73 (1001) | 0.76 (997) |
| 1.5× | 1.10 (745) | 0.90 (723) | 0.74 (806) | 0.86 (662) | 0.85 (749) | 0.93 (855) |
| 2× | 0.94 (721) | 0.99 (933) | 0.98 (774) | 0.98 (795) | 1.19 (826) | 1.08 (818) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.88 (81) | 0.93 (126) | 0.84 (127) | 0.76 (135) | 1.01 (148) | 0.83 (132) |
| 1.5× | 1.10 (182) | 1.11 (142) | 1.02 (172) | 0.87 (153) | 0.86 (171) | 0.82 (162) |
| 2× | 1.06 (175) | 1.27 (237) | 1.24 (213) | 0.95 (185) | 1.52 (153) | 1.19 (165) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.01 (4282) | 1.02 (4195) | 0.95 (4360) | 0.88 (4255) |
| 0.75× | 1.10 (3900) | 1.04 (3882) | 0.89 (3957) | 0.83 (3854) |
| 1× | 1.02 (11299) | 1.01 (10961) | 0.89 (11427) | 0.92 (10852) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.06 (49) | 1.19 (94) | 1.32 (104) | 0.95 (171) |
| 0.75× | 0.99 (451) | 0.95 (479) | 0.91 (217) | 0.79 (199) |
| 1× | 0.79 (790) | 0.73 (529) | 0.77 (525) | 0.80 (745) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.68 (17) | 0.81 (24) | 0.57 (21) | 0.55 (34) |
| 0.75× | 0.89 (56) | 0.90 (56) | 0.71 (40) | 0.77 (60) |
| 1× | 0.63 (119) | 0.52 (139) | 0.51 (151) | 0.68 (167) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.86 (4447) | 0.72 (4412) | 0.73 (4756) | 0.65 (4766) | 0.71 (5312) |
| 0.75× | 0.84 (3941) | 0.72 (3997) | 0.76 (4138) | 0.71 (4053) | 0.84 (4369) |
| 1× | 0.92 (11097) | 0.80 (11034) | 0.87 (11669) | 0.80 (11712) | 0.82 (13027) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.33 (145) | 1.03 (145) | 1.24 (128) | 1.22 (106) | 0.83 (143) |
| 0.75× | 1.14 (139) | 0.93 (192) | 1.06 (267) | 0.79 (156) | 0.73 (166) |
| 1× | 0.84 (553) | 0.69 (711) | 0.64 (551) | 0.65 (639) | 0.63 (851) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.65 (27) | 0.65 (32) | 0.84 (33) | 0.54 (24) | 0.61 (43) |
| 0.75× | 0.67 (45) | 0.55 (52) | 0.51 (63) | 0.38 (42) | 0.45 (54) |
| 1× | 0.41 (121) | 0.39 (142) | 0.35 (167) | 0.34 (189) | 0.32 (190) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.55 (31149) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.57 (1321) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.84 (51507) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.62 (1267) | 0.77 (2041) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.62 (1243) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.81 (1913) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.91 (1887) | – | – | – | – |
| 1× | – | – | – | 0.79 (208574) | – | – | – | 0.54 (65432) | 0.70 (7731) | – | 0.59 (2944) | – | 0.82 (7231) | 0.82 (6815) | 0.58 (2599) | 0.57 (2303) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.39 (1825) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 1.35 (228) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 2.15 (376) | – | – | – | 1.49 (240) | – | – | – | – | – | – | – | – |

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
