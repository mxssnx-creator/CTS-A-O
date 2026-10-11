# Simulated trading session — 30 symbols, 24 h pre-historic + 24 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 1m+, 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $10.00; each order volume unit = 2.0 % of the realized equity at entry ($0.17–$1.23 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-06T21:00 → 2026-10-07T21:00 UTC. Engine: Base 2704/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 362/19072 · PF 1.56 · Micro 169/5900 · PF 2.00 · Minimal 2102/24972 · PF 1.68 · Short 693/8176 · PF 1.58 · General 570/8176 · PF 1.55 · Long 618/8176 · PF 1.49 · Signals 126/126; Main 3020 pairs, 297424 tapes, Real seats: 19029 engine configs + 2520 signal configs (every config of the active signals), compute 970 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $10.00 → $10.55 (5.47 %, closed orders) · equity at end $8.60 (open at end: 56 positions / 11372 orders, MTM -$1.94 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.22 (gross profit $ ÷ gross loss $ as sized) · PF unit 1.45 (every order at one unit: the engine's PF) · 180 positions / 29242 orders (incl. 4920 capped to $0) · WR 73.01 % · DDT (closed trades, $) 9.78 h · DDR 1.12 · equity max drawdown $2.27 (21.02 %) · margin used max $7.80 · open avg 41.21 pos / 2793.91 orders (peak 52 / 5151)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 4920 orders capped to $0, 24117 scaled down (open at end: 630 capped, 10716 scaled) · binding: position cap 22542, gross cap 39929. **Without the caps:** balance $10.00 → $55.75 (457.54 %) · PF $ 1.54 · equity at end -$68.34 · equity max drawdown $90.97 (402.07 %) · margin used max $794.97 · infeasible: margin exceeded equity for 1411 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 495 | 2593  | 10.4 % | 1.540 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 495 | 2593 (+0) | 10.4 % | 1.540 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 495 | 2593 (+0) | 10.4 % | 1.540 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 446 | 2381 (-212) | 9.5 % | 1.585 |
| closes ≥ 6 | 1.00 | 6 | 1 | 704 | 3269 (+676) | 13.1 % | 1.744 |
| closes ≥ 20 | 1.00 | 20 | 1 | 368 | 2057 (-536) | 8.2 % | 1.424 |
| closes ≥ 30 | 1.00 | 30 | 1 | 280 | 1662 (-931) | 6.7 % | 1.351 |
| DDR off | 1.00 | 12 | off | 1828 | 5657 (+3064) | 22.7 % | 1.133 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 853 | 3709 (+1116) | 14.9 % | 1.344 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 177 | 1353 (-1240) | 5.4 % | 1.896 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1828 | 5657 (+3064) | 22.7 % | 1.133 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2270 | 6568 (+3975) | 26.3 % | 1.168 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 6 / 163 | 149 / 14 | 9.22 | 10.26 | 91 % | $0.31 | $10.31 | $10.36 | $9.84 | 2.51 % | 0.00 | $7.22 | 20 / 806 |
| 22:00 | 3 / 175 | 147 / 28 | 8.12 | 20.18 | 84 % | $0.06 | $10.37 | $10.20 | $10.16 | 2.51 % | 0.87 | $7.26 | 34 / 1614 |
| 23:00 | 1 / 135 | 57 / 78 | 0.63 | 0.65 | 42 % | -$0.00 | $10.36 | $10.28 | $10.19 | 2.51 % | 1.87 | $7.26 | 40 / 2660 |
| 00:00 | 7 / 765 | 649 / 116 | 2.89 | 3.97 | 85 % | $0.08 | $10.44 | $10.80 | $10.15 | 2.51 % | 0.02 | $7.31 | 43 / 3109 |
| 01:00 | 3 / 1261 | 984 / 277 | 9.10 | 2.88 | 78 % | $0.32 | $10.76 | $9.57 | $9.56 | 11.56 % | 1.02 | $7.53 | 43 / 4360 |
| 02:00 | 17 / 3308 | 1863 / 1445 | 1.02 | 0.75 | 56 % | $0.01 | $10.77 | $9.47 | $8.57 | 20.72 % | 2.02 | $7.54 | 46 / 3416 |
| 03:00 | 4 / 492 | 302 / 190 | 1.00 | 1.06 | 61 % | $0.00 | $10.77 | $9.48 | $9.31 | 20.72 % | 3.02 | $7.55 | 49 / 3972 |
| 04:00 | 7 / 520 | 408 / 112 | 3.36 | 5.22 | 78 % | $0.09 | $10.86 | $9.52 | $9.34 | 20.72 % | 4.02 | $7.60 | 48 / 4816 |
| 05:00 | 4 / 1189 | 916 / 273 | 1.03 | 1.86 | 77 % | $0.00 | $10.87 | $9.76 | $9.33 | 20.72 % | 5.02 | $7.63 | 52 / 5555 |
| 06:00 | 4 / 1010 | 823 / 187 | 9.42 | 3.41 | 81 % | $0.17 | $11.04 | $9.79 | $9.54 | 20.72 % | 6.02 | $7.73 | 51 / 6232 |
| 07:00 | 3 / 788 | 589 / 199 | 1.98 | 1.97 | 75 % | $0.03 | $11.07 | $9.69 | $9.62 | 20.72 % | 7.02 | $7.75 | 51 / 6857 |
| 08:00 | 4 / 691 | 537 / 154 | 1.38 | 2.60 | 78 % | $0.01 | $11.08 | $9.51 | $9.48 | 20.72 % | 8.02 | $7.77 | 51 / 7601 |
| 09:00 | 3 / 984 | 756 / 228 | 1.21 | 2.30 | 77 % | $0.01 | $11.09 | $9.35 | $9.32 | 20.72 % | 9.02 | $7.76 | 51 / 8261 |
| 10:00 | 2 / 1024 | 805 / 219 | 3.22 | 4.51 | 79 % | $0.05 | $11.14 | $9.09 | $9.06 | 20.72 % | 10.02 | $7.80 | 52 / 8622 |
| 11:00 | 5 / 718 | 532 / 186 | 0.26 | 1.63 | 74 % | -$0.10 | $11.04 | $9.15 | $9.02 | 20.72 % | 11.02 | $7.80 | 53 / 9209 |
| 12:00 | 8 / 2920 | 1865 / 1055 | 0.14 | 0.62 | 64 % | -$0.33 | $10.71 | $8.75 | $8.72 | 20.72 % | 12.02 | $7.74 | 53 / 10278 |
| 13:00 | 3 / 2957 | 2273 / 684 | 0.71 | 2.17 | 77 % | -$0.06 | $10.65 | $8.75 | $8.66 | 20.72 % | 13.02 | $7.50 | 55 / 9678 |
| 14:00 | 7 / 1833 | 1662 / 171 | 5.42 | 14.48 | 91 % | $0.23 | $10.88 | $9.00 | $8.72 | 20.72 % | 14.02 | $7.61 | 53 / 9561 |
| 15:00 | 4 / 1413 | 1146 / 267 | 0.55 | 1.41 | 81 % | -$0.06 | $10.82 | $8.78 | $8.74 | 20.72 % | 15.02 | $7.61 | 52 / 9472 |
| 16:00 | 5 / 2304 | 1863 / 441 | 1.05 | 1.85 | 81 % | $0.00 | $10.82 | $9.01 | $8.74 | 20.72 % | 16.02 | $7.58 | 54 / 9074 |
| 17:00 | 5 / 672 | 409 / 263 | 1.00 | 0.96 | 61 % | $0.00 | $10.82 | $8.90 | $8.89 | 20.72 % | 17.02 | $7.58 | 53 / 9576 |
| 18:00 | 1 / 1733 | 1164 / 569 | 0.09 | 0.38 | 67 % | -$0.23 | $10.59 | $8.66 | $8.58 | 20.72 % | 18.02 | $7.58 | 54 / 9684 |
| 19:00 | 1 / 1261 | 937 / 324 | 0.32 | 2.95 | 74 % | -$0.03 | $10.56 | $8.78 | $8.60 | 20.72 % | 19.02 | $7.41 | 56 / 10430 |
| 20:00 | 1 / 926 | 514 / 412 | 0.79 | 0.90 | 56 % | -$0.01 | $10.55 | $8.60 | $8.54 | 21.02 % | 20.02 | $7.39 | 56 / 11372 |

**Last hour (20:00):** open at end: 56 positions / 11372 orders, MTM -$1.94 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $8.60 = balance $10.55 + MTM -$1.94.

**Hours positive:** 16 of 24 full hours · flat 0 · negative 8

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m | 1m+ | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 96 · 3.84 · $0.11 | 26 · ∞ (no loss) · $0.02 | 5 · ∞ (no loss) · $0.01 | – | 31 · 452.44 · $0.12 | – | 5 · ∞ (no loss) · $0.06 |
| 22:00 | 73 · 23.78 · $0.02 | 79 · 5.69 · $0.03 | – | – | 15 · 13.03 · $0.01 | – | 8 · ∞ (no loss) · $0.00 |
| 23:00 | 2 · ∞ (no loss) · $0.00 | 21 · 12.91 · $0.00 | – | 19 · 9.10 · $0.00 | 33 · 1478.37 · $0.01 | 54 · 0.03 · -$0.01 | 6 · 0.43 · -$0.00 |
| 00:00 | 262 · 6.52 · $0.01 | 232 · 644.42 · $0.02 | 12 · 0.83 · -$0.00 | 4 · ∞ (no loss) · $0.00 | 182 · 1.59 · $0.02 | 54 · 0.47 · -$0.00 | 19 · 649.87 · $0.03 |
| 01:00 | 104 · 1.66 · $0.00 | 497 · 758.29 · $0.06 | 116 · 38.83 · $0.02 | 70 · 524503052084488.25 · $0.01 | 365 · 35.35 · $0.23 | 91 · 0.09 · -$0.03 | 18 · 130.96 · $0.03 |
| 02:00 | 541 · 11.44 · $0.24 | 1872 · 0.84 · -$0.02 | 94 · 0.49 · -$0.01 | 71 · 0.39 · -$0.01 | 549 · 0.58 · -$0.16 | 144 · 0.46 · -$0.02 | 37 · 0.10 · -$0.02 |
| 03:00 | 103 · 0.04 · -$0.01 | 40 · 10376492631155.56 · $0.01 | 80 · 1.28 · $0.00 | 16 · 40.20 · $0.01 | 135 · 4.80 · $0.04 | 111 · 0.09 · -$0.04 | 7 · 0.07 · -$0.01 |
| 04:00 | 79 · 2.32 · $0.03 | 175 · 3.95 · $0.01 | 12 · 1.08 · $0.00 | 7 · 0.00 · -$0.00 | 160 · 7.96 · $0.06 | 73 · 1.30 · $0.00 | 14 · 1.47 · $0.00 |
| 05:00 | 294 · 0.52 · -$0.01 | 349 · 2.37 · $0.00 | 109 · 1.25 · $0.00 | 44 · 60.73 · $0.00 | 279 · 1.07 · $0.01 | 101 · 1.15 · $0.00 | 13 · ∞ (no loss) · $0.00 |
| 06:00 | 79 · 17.45 · $0.00 | 409 · 27.55 · $0.02 | 72 · 16.91 · $0.03 | 95 · 46.68 · $0.01 | 278 · 16.78 · $0.12 | 71 · 0.62 · -$0.00 | 6 · 8.46 · $0.00 |
| 07:00 | 139 · 951.98 · $0.01 | 294 · 0.90 · -$0.00 | 31 · 52.32 · $0.00 | 7 · 28.76 · $0.00 | 223 · 2.71 · $0.03 | 94 · 0.37 · -$0.01 | – |
| 08:00 | 112 · 736.83 · $0.02 | 217 · 3.21 · $0.01 | 130 · 2.82 · $0.00 | 39 · 3.58 · $0.00 | 135 · 0.43 · -$0.02 | 54 · 70.40 · $0.00 | 4 · ∞ (no loss) · $0.00 |
| 09:00 | 144 · 0.52 · -$0.00 | 314 · 0.27 · -$0.01 | 118 · 6.69 · $0.00 | 37 · 12.47 · $0.00 | 283 · 1.74 · $0.01 | 80 · 4.97 · $0.00 | 8 · ∞ (no loss) · $0.00 |
| 10:00 | 166 · 2933.95 · $0.01 | 409 · 1.49 · $0.00 | 143 · 150.88 · $0.01 | 34 · 162.92 · $0.00 | 217 · 2.88 · $0.02 | 33 · 0.36 · -$0.00 | 22 · 5.67 · $0.00 |
| 11:00 | 36 · ∞ (no loss) · $0.00 | 328 · 167.58 · $0.00 | 8 · 0.89 · -$0.00 | 22 · ∞ (no loss) · $0.00 | 282 · 0.21 · -$0.10 | 36 · 0.32 · -$0.00 | 6 · 0.00 · -$0.00 |
| 12:00 | 288 · 1.42 · $0.00 | 1870 · 0.41 · -$0.01 | 211 · 0.71 · -$0.00 | 83 · 5.15 · $0.00 | 427 · 0.08 · -$0.29 | 34 · 0.07 · -$0.03 | 7 · 0.00 · -$0.00 |
| 13:00 | 316 · 6.86 · $0.03 | 1430 · 0.99 · -$0.00 | 205 · 0.48 · -$0.00 | 301 · 0.23 · -$0.01 | 555 · 1.34 · $0.02 | 132 · 0.02 · -$0.09 | 18 · 0.01 · -$0.00 |
| 14:00 | 222 · 2.34 · $0.03 | 566 · 68.73 · $0.02 | 101 · 6.83 · $0.00 | 145 · 14.76 · $0.02 | 735 · 6.71 · $0.15 | 64 · 2.60 · $0.00 | – |
| 15:00 | 161 · 26.13 · $0.01 | 586 · 0.55 · -$0.01 | 97 · 0.65 · -$0.00 | 194 · 1.69 · $0.01 | 363 · 0.37 · -$0.05 | 2 · ∞ (no loss) · $0.00 | 10 · 0.03 · -$0.00 |
| 16:00 | 270 · 0.59 · -$0.00 | 1047 · 2.98 · $0.02 | 124 · 11.04 · $0.01 | 282 · 27.80 · $0.03 | 522 · 0.25 · -$0.06 | 51 · 15.42 · $0.00 | 8 · 2.04 · $0.00 |
| 17:00 | 142 · 2.09 · $0.01 | 279 · 0.35 · -$0.02 | 40 · 0.60 · -$0.00 | 35 · 0.23 · -$0.00 | 147 · 63.12 · $0.01 | 24 · 0.16 · -$0.00 | 5 · 0.00 · -$0.00 |
| 18:00 | 64 · 0.04 · -$0.01 | 841 · 1.44 · $0.00 | 54 · 0.05 · -$0.00 | 175 · 10.72 · $0.00 | 372 · 0.03 · -$0.23 | 201 · 1.18 · $0.00 | 26 · 0.09 · -$0.00 |
| 19:00 | 235 · 0.35 · -$0.00 | 733 · 1.17 · $0.00 | 76 · 0.48 · -$0.00 | 40 · 4.77 · $0.00 | 101 · 0.13 · -$0.03 | 75 · 86.87 · $0.00 | 1 · ∞ (no loss) · $0.00 |
| 20:00 | 192 · 0.16 · -$0.01 | 434 · 0.95 · -$0.00 | 55 · 3.27 · $0.00 | 30 · 2042.04 · $0.00 | 145 · 0.93 · -$0.00 | 36 · 0.09 · -$0.00 | 34 · 0.49 · -$0.00 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 163 | 33 · ∞ (no loss) · 100 % · $0.05 | 116 · 6.23 · 89 % · $0.19 | 3 · ∞ (no loss) · 100 % · $0.01 | 11 · 175.75 · 91 % · $0.05 | – | 14 · 230.72 · 93 % · $0.06 |
| 22:00 | 175 | 65 · 4.80 · 98 % · $0.03 | 95 · 34.28 · 78 % · $0.02 | – | 15 · 13.03 · 60 % · $0.01 | – | 15 · 13.03 · 60 % · $0.01 |
| 23:00 | 135 | 26 · 0.20 · 42 % · -$0.00 | 76 · 0.13 · 20 % · -$0.01 | 10 · ∞ (no loss) · 100 % · $0.00 | 23 · 1025.85 · 91 % · $0.00 | – | 33 · 1478.37 · 94 % · $0.01 |
| 00:00 | 765 | 211 · 12.63 · 95 % · $0.02 | 429 · 6.82 · 83 % · $0.04 | 32 · 1.87 · 94 % · $0.01 | 93 · 1.35 · 67 % · $0.01 | – | 125 · 1.53 · 74 % · $0.02 |
| 01:00 | 1261 | 309 · 9.48 · 81 % · $0.07 | 707 · 1.79 · 75 % · $0.02 | 39 · 27.31 · 95 % · $0.07 | 206 · 64.67 · 82 % · $0.16 | – | 245 · 45.52 · 84 % · $0.23 |
| 02:00 | 3308 | 957 · 0.49 · 53 % · -$0.09 | 2062 · 2.04 · 58 % · $0.17 | 95 · 0.50 · 54 % · -$0.06 | 194 · 0.97 · 63 % · -$0.00 | – | 289 · 0.74 · 60 % · -$0.07 |
| 03:00 | 492 | 120 · 0.32 · 57 % · -$0.03 | 298 · 0.77 · 58 % · -$0.01 | 21 · 8.41 · 95 % · $0.02 | 53 · 90.47 · 77 % · $0.02 | – | 74 · 15.00 · 82 % · $0.04 |
| 04:00 | 520 | 80 · 0.37 · 79 % · -$0.02 | 314 · 6.13 · 70 % · $0.05 | 45 · ∞ (no loss) · 100 % · $0.03 | 81 · 404.52 · 99 % · $0.03 | – | 126 · 866.91 · 99 % · $0.06 |
| 05:00 | 1189 | 348 · 0.79 · 75 % · -$0.00 | 630 · 0.73 · 77 % · -$0.01 | 57 · 0.85 · 79 % · -$0.01 | 154 · 1.57 · 83 % · $0.02 | – | 211 · 1.19 · 82 % · $0.02 |
| 06:00 | 1010 | 145 · 0.67 · 72 % · -$0.00 | 650 · 5.23 · 80 % · $0.05 | 43 · ∞ (no loss) · 100 % · $0.02 | 172 · 115.02 · 90 % · $0.10 | – | 215 · 143.10 · 92 % · $0.12 |
| 07:00 | 788 | 134 · 1.38 · 75 % · $0.00 | 475 · 1.29 · 70 % · $0.00 | 23 · 2.79 · 91 % · $0.01 | 156 · 2.85 · 87 % · $0.02 | – | 179 · 2.83 · 88 % · $0.02 |
| 08:00 | 691 | 92 · 4.65 · 91 % · $0.01 | 493 · 4.52 · 76 % · $0.02 | 21 · 0.15 · 52 % · -$0.02 | 85 · 1.03 · 78 % · $0.00 | – | 106 · 0.41 · 73 % · -$0.02 |
| 09:00 | 984 | 176 · 4.48 · 95 % · $0.01 | 575 · 0.52 · 72 % · -$0.01 | 64 · 2.23 · 78 % · $0.00 | 169 · 1.33 · 74 % · $0.00 | – | 233 · 1.60 · 75 % · $0.01 |
| 10:00 | 1024 | 161 · 2.27 · 83 % · $0.01 | 668 · 2.68 · 75 % · $0.02 | 31 · 1.51 · 94 % · $0.00 | 164 · 53.39 · 86 % · $0.02 | – | 195 · 5.37 · 87 % · $0.02 |
| 11:00 | 718 | 129 · 0.33 · 78 % · -$0.01 | 336 · 0.36 · 69 % · -$0.01 | 92 · 0.38 · 82 % · -$0.02 | 161 · 0.19 · 78 % · -$0.06 | – | 253 · 0.24 · 79 % · -$0.08 |
| 12:00 | 2920 | 709 · 0.14 · 74 % · -$0.06 | 1828 · 0.27 · 60 % · -$0.06 | 79 · 0.07 · 44 % · -$0.06 | 304 · 0.11 · 72 % · -$0.16 | – | 383 · 0.10 · 66 % · -$0.22 |
| 13:00 | 2957 | 613 · 0.16 · 77 % · -$0.07 | 1902 · 0.76 · 73 % · -$0.02 | 140 · 2.31 · 91 % · $0.01 | 302 · 2.58 · 93 % · $0.02 | – | 442 · 2.48 · 93 % · $0.04 |
| 14:00 | 1833 | 324 · 190.94 · 99 % · $0.03 | 792 · 2.94 · 83 % · $0.05 | 150 · 5.44 · 97 % · $0.03 | 567 · 7.07 · 95 % · $0.12 | – | 717 · 6.63 · 95 % · $0.15 |
| 15:00 | 1413 | 422 · 0.44 · 87 % · -$0.02 | 645 · 0.64 · 78 % · -$0.02 | 70 · 0.61 · 79 % · -$0.00 | 276 · 0.50 · 79 % · -$0.02 | – | 346 · 0.53 · 79 % · -$0.03 |
| 16:00 | 2304 | 482 · 4.38 · 94 % · $0.02 | 1478 · 4.32 · 78 % · $0.04 | 39 · 0.11 · 36 % · -$0.01 | 305 · 0.23 · 81 % · -$0.05 | – | 344 · 0.21 · 76 % · -$0.06 |
| 17:00 | 672 | 143 · 1.77 · 72 % · $0.01 | 390 · 0.43 · 48 % · -$0.02 | 30 · ∞ (no loss) · 100 % · $0.01 | 109 · 33.60 · 82 % · $0.01 | – | 139 · 59.93 · 86 % · $0.01 |
| 18:00 | 1733 | 573 · 0.97 · 81 % · -$0.00 | 857 · 0.45 · 72 % · -$0.01 | 78 · 0.02 · 13 % · -$0.07 | 225 · 0.03 · 32 % · -$0.15 | – | 303 · 0.03 · 27 % · -$0.22 |
| 19:00 | 1261 | 355 · 1.66 · 91 % · $0.00 | 817 · 0.65 · 67 % · -$0.00 | 13 · 0.07 · 46 % · -$0.01 | 76 · 0.15 · 79 % · -$0.02 | – | 89 · 0.13 · 74 % · -$0.03 |
| 20:00 | 926 | 202 · 0.30 · 42 % · -$0.00 | 583 · 0.56 · 55 % · -$0.00 | 28 · 2.35 · 75 % · $0.01 | 113 · 0.36 · 81 % · -$0.01 | – | 141 · 0.94 · 79 % · -$0.00 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 2578 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (297424 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (18337); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 58864 · 0.92 | 2922 · 11.14 | 4856 · 7.62 | 662 · 5.32 | 163 · 10.26 | 33 · ∞ (no loss) | 116 · 6.35 | – | 14 · 237.32 |
| 22:00 | 55576 · 0.70 | 2861 · 0.54 | 5640 · 0.94 | 1118 · 3.97 | 175 · 20.18 | 65 · 21.59 | 95 · 21.16 | – | 15 · 9.09 |
| 23:00 | 76495 · 0.27 | 8243 · 0.25 | 10621 · 0.27 | 1025 · 0.74 | 135 · 0.65 | 26 · 0.15 | 76 · 0.08 | – | 33 · 1153.25 |
| 00:00 | 99697 · 0.72 | 9367 · 0.62 | 13675 · 0.71 | 2760 · 1.58 | 765 · 3.97 | 211 · 6.95 | 429 · 2.86 | – | 125 · 4.32 |
| 01:00 | 184483 · 0.66 | 14565 · 0.80 | 28319 · 0.89 | 4416 · 1.54 | 1261 · 2.88 | 309 · 1.43 | 707 · 2.35 | – | 245 · 18.30 |
| 02:00 | 303805 · 0.69 | 49852 · 0.68 | 69599 · 0.97 | 12014 · 1.56 | 3308 · 0.75 | 957 · 0.42 | 2062 · 1.04 | – | 289 · 0.68 |
| 03:00 | 127629 · 1.05 | 9815 · 1.94 | 17474 · 1.39 | 3070 · 4.24 | 492 · 1.06 | 120 · 0.54 | 298 · 0.84 | – | 74 · 18.43 |
| 04:00 | 120295 · 0.89 | 12406 · 1.44 | 20036 · 1.16 | 2810 · 7.16 | 520 · 5.22 | 80 · 1.44 | 314 · 3.56 | – | 126 · 2247.06 |
| 05:00 | 151995 · 1.05 | 18976 · 1.84 | 22521 · 1.94 | 4638 · 2.22 | 1189 · 1.86 | 348 · 1.22 | 630 · 1.85 | – | 211 · 2.60 |
| 06:00 | 137734 · 0.86 | 16085 · 0.94 | 23252 · 0.96 | 3986 · 4.60 | 1010 · 3.41 | 145 · 0.71 | 650 · 2.80 | – | 215 · 59.46 |
| 07:00 | 106072 · 1.18 | 12273 · 1.71 | 19040 · 1.69 | 3502 · 1.64 | 788 · 1.97 | 134 · 1.36 | 475 · 1.37 | – | 179 · 7.11 |
| 08:00 | 113969 · 1.07 | 11845 · 1.22 | 24368 · 1.13 | 3111 · 1.61 | 691 · 2.60 | 92 · 4.19 | 493 · 5.64 | – | 106 · 0.89 |
| 09:00 | 143712 · 1.31 | 21080 · 1.60 | 35661 · 1.57 | 4116 · 1.67 | 984 · 2.30 | 176 · 12.56 | 575 · 6.04 | – | 233 · 0.96 |
| 10:00 | 128085 · 0.88 | 13155 · 0.89 | 20513 · 2.01 | 3206 · 1.64 | 1024 · 4.51 | 161 · 2.47 | 668 · 3.95 | – | 195 · 14.93 |
| 11:00 | 129301 · 0.43 | 19482 · 0.82 | 15829 · 0.47 | 2863 · 0.83 | 718 · 1.63 | 129 · 1.55 | 336 · 2.39 | – | 253 · 1.47 |
| 12:00 | 206487 · 0.68 | 23400 · 0.79 | 41093 · 0.93 | 8336 · 0.28 | 2920 · 0.62 | 709 · 0.93 | 1828 · 0.77 | – | 383 · 0.34 |
| 13:00 | 235414 · 0.85 | 34530 · 0.73 | 47870 · 0.84 | 7957 · 1.48 | 2957 · 2.17 | 613 · 1.14 | 1902 · 1.91 | – | 442 · 6.52 |
| 14:00 | 140260 · 1.71 | 25121 · 2.50 | 38228 · 2.83 | 7013 · 7.99 | 1833 · 14.48 | 324 · 27.54 | 792 · 4.97 | – | 717 · 25.43 |
| 15:00 | 152515 · 1.09 | 19593 · 1.08 | 29576 · 1.28 | 6215 · 1.20 | 1413 · 1.41 | 422 · 2.28 | 645 · 1.23 | – | 346 · 1.26 |
| 16:00 | 180832 · 1.44 | 25178 · 1.84 | 44960 · 2.59 | 5861 · 1.70 | 2304 · 1.85 | 482 · 4.91 | 1478 · 4.29 | – | 344 · 0.44 |
| 17:00 | 130996 · 1.45 | 17939 · 1.48 | 34942 · 1.77 | 3029 · 1.90 | 672 · 0.96 | 143 · 1.03 | 390 · 0.32 | – | 139 · 68.16 |
| 18:00 | 136830 · 0.80 | 24527 · 0.78 | 33255 · 0.68 | 5066 · 0.59 | 1733 · 0.38 | 573 · 1.83 | 857 · 1.80 | – | 303 · 0.04 |
| 19:00 | 117507 · 0.88 | 19430 · 0.99 | 27422 · 0.99 | 3108 · 1.17 | 1261 · 2.95 | 355 · 4.08 | 817 · 4.39 | – | 89 · 0.62 |
| 20:00 | 125364 · 0.54 | 21134 · 0.96 | 20099 · 0.62 | 2417 · 0.80 | 926 · 0.90 | 202 · 0.31 | 583 · 1.19 | – | 141 · 1.41 |
| **total** | **3363917 · 0.88** | **433779 · 1.04** | **648849 · 1.13** | **102299 · 1.27** | **29242 · 1.45** | **6809 · 1.26** | **17216 · 1.66** | **–** | **5217 · 1.35** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 6809 | 5254 / 1555 | 0.92 | 1.26 | -$0.05 | 77.16 % | 18.98 |
| Trailing | 17216 | 11981 / 5235 | 1.71 | 1.66 | $0.51 | 69.59 % | 9.88 |
| Signal · Normal | 1203 | 914 / 289 | 0.96 | 1.05 | -$0.02 | 75.98 % | 18.75 |
| Signal · Trailing | 4014 | 3201 / 813 | 1.12 | 1.50 | $0.10 | 79.75 % | 9.75 |
| total | 29242 | 21350 / 7892 | 1.22 | 1.45 | $0.55 | 73.01 % | 9.78 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 5217 | 4115 / 1102 | 1.06 | 1.35 | $0.08 | 78.88 % | 10.50 |
| of which Engine (no signals) | 24025 | 17235 / 6790 | 1.37 | 1.51 | $0.47 | 71.74 % | 9.78 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m | 4120 | 3.33 | 2.14 | $0.47 |
| 1m+ | 13048 | 1.50 | 1.65 | $0.15 |
| 5m | 1893 | 1.95 | 1.66 | $0.06 |
| 5m+ | 1750 | 3.08 | 3.39 | $0.08 |
| 15m | 6534 | 0.95 | 1.23 | -$0.08 |
| 15m+ | 1615 | 0.27 | 0.76 | -$0.22 |
| 30m | 282 | 2.94 | 0.78 | $0.09 |

A 24 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 56 | 53 / 3 | 24.47 | 50.02 | $0.00 | 94.64 % | 0.75 |
| Minimal | 21904 | 16206 / 5698 | 2.35 | 1.88 | $0.82 | 73.99 % | 3.63 |
| Short | 1587 | 824 / 763 | 0.51 | 0.51 | -$0.18 | 51.92 % | 19.50 |
| General | 224 | 67 / 157 | 0.25 | 0.36 | -$0.04 | 29.91 % | 24.00 |
| Long | 254 | 85 / 169 | 0.39 | 0.40 | -$0.13 | 33.46 % | 19.25 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 5217 | 4115 / 1102 | 1.06 | 1.35 | $0.08 | 78.88 % | 10.50 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 77633 | sig:confirm 24409 · sig:duplicate 23212 · sig:signalPf 13280 · sig:signalSide 9706 · sig:signalCluster 7024 · sig:signalGuard 2 |
| Minimal | 32143 | lastN 15818 · duplicate 8934 · symPf 7391 |
| Short | 10493 | lastN 6604 · engineSide 2355 · symPf 1261 · duplicate 273 |
| Long | 3654 | lastN 2163 · engineSide 916 · symPf 529 · duplicate 46 |
| General | 1875 | lastN 1344 · engineSide 304 · symPf 215 · duplicate 12 |
| Wide | 1172 | engineSide 651 · lastN 427 · symPf 94 |
| Micro | 814 | crowd 793 · lastN 11 · symPf 10 |

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
| Micro | 2.00 | 50.02 | 25.01 | 24.47 | 0.49 | 56 |
| Minimal | 1.68 | 1.88 | 1.12 | 2.35 | 1.25 | 21904 |
| Short | 1.58 | 0.51 | 0.32 | 0.51 | 0.99 | 1587 |
| General | 1.55 | 0.36 | 0.23 | 0.25 | 0.70 | 224 |
| Long | 1.49 | 0.40 | 0.27 | 0.39 | 0.96 | 254 |
| Wide | 1.56 | – | – | – | – | 0 |
| Signals | – | 1.35 | – | 1.06 | 0.79 | 5217 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (15920 of 209148 evaluated, 294904 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3366 units active at the run start, 5604 over the run, 2417 of 2520 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 3194 | 224 (7 %) | 386 | 100 % | ∞ (no loss) | 114.30 |
| Micro | trailing | 2526 | 298 (12 %) | 427 | 85 % | 4.16 | 82.15 |
| Minimal | normal | 1937 | 966 (50 %) | 12654 | 87 % | 2.54 | 7863.67 |
| Minimal | trailing | 3459 | 1870 (54 %) | 19972 | 75 % | 2.56 | 11065.47 |
| Short | normal | 903 | 353 (39 %) | 3713 | 60 % | 0.91 | -436.68 |
| Short | trailing | 1987 | 948 (48 %) | 10536 | 63 % | 1.11 | 1123.88 |
| General | normal | 328 | 116 (35 %) | 989 | 49 % | 1.13 | 189.02 |
| General | trailing | 296 | 134 (45 %) | 1146 | 58 % | 1.13 | 190.24 |
| Long | normal | 559 | 183 (33 %) | 1108 | 52 % | 1.21 | 521.58 |
| Long | trailing | 412 | 148 (36 %) | 870 | 63 % | 1.15 | 238.23 |
| Wide | axis | 319 | 98 (31 %) | 1292 | 36 % | 0.65 | -351.99 |
| Signals | normal | 602 | 291 (48 %) | 10963 | 74 % | 0.93 | -1970.60 |
| Signals | trailing | 1815 | 1176 (65 %) | 38243 | 77 % | 1.25 | 15355.80 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 5720 | 522 (9 %) | 813 | 92 % | 8.55 | 196.45 |
| Minimal | active | 1869 | 411 (22 %) | 2391 | 78 % | 2.43 | 1323.75 |
| Minimal | bollinger | 355 | 126 (35 %) | 1520 | 80 % | 2.70 | 919.87 |
| Minimal | break | 349 | 314 (90 %) | 2484 | 83 % | 3.03 | 1562.50 |
| Minimal | channel | 90 | 24 (27 %) | 354 | 73 % | 1.65 | 138.39 |
| Minimal | direction | 160 | 138 (86 %) | 314 | 82 % | 4.07 | 235.40 |
| Minimal | ema | 50 | 18 (36 %) | 72 | 81 % | 7.22 | 82.96 |
| Minimal | macd | 32 | 12 (38 %) | 112 | 80 % | 1.37 | 28.25 |
| Minimal | move | 293 | 282 (96 %) | 3163 | 75 % | 2.20 | 1443.66 |
| Minimal | osc | 1312 | 995 (76 %) | 18827 | 81 % | 2.64 | 11545.94 |
| Minimal | rsi | 330 | 185 (56 %) | 1185 | 81 % | 3.16 | 695.09 |
| Minimal | sar | 4 | 4 (100 %) | 123 | 72 % | 1.63 | 39.07 |
| Minimal | smooth | 128 | 18 (14 %) | 194 | 65 % | 1.03 | 5.05 |
| Minimal | trend | 124 | 108 (87 %) | 729 | 80 % | 4.07 | 500.10 |
| Minimal | volume | 300 | 201 (67 %) | 1158 | 71 % | 1.63 | 409.11 |
| Short | active | 63 | 4 (6 %) | 12 | 100 % | ∞ (no loss) | 18.30 |
| Short | bollinger | 64 | 43 (67 %) | 372 | 66 % | 1.30 | 90.76 |
| Short | break | 492 | 165 (34 %) | 2755 | 52 % | 0.62 | -1494.67 |
| Short | channel | 106 | 1 (1 %) | 161 | 24 % | 0.13 | -501.27 |
| Short | direction | 243 | 86 (35 %) | 935 | 63 % | 0.78 | -234.79 |
| Short | ema | 211 | 154 (73 %) | 1139 | 76 % | 2.23 | 921.56 |
| Short | ichimoku | 7 | 0 (0 %) | 79 | 57 % | 0.61 | -57.43 |
| Short | macd | 109 | 67 (61 %) | 939 | 68 % | 1.28 | 250.90 |
| Short | move | 713 | 275 (39 %) | 3534 | 60 % | 1.00 | -16.45 |
| Short | osc | 518 | 342 (66 %) | 2508 | 73 % | 2.23 | 1792.32 |
| Short | rsi | 38 | 28 (74 %) | 145 | 73 % | 1.70 | 53.22 |
| Short | smooth | 19 | 9 (47 %) | 143 | 59 % | 0.92 | -14.97 |
| Short | trend | 117 | 72 (62 %) | 904 | 68 % | 1.16 | 134.50 |
| Short | volume | 190 | 55 (29 %) | 623 | 47 % | 0.68 | -254.77 |
| General | active | 26 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 5 | 0 (0 %) | 15 | 0 % | 0.00 | -30.60 |
| General | break | 104 | 38 (37 %) | 610 | 43 % | 0.71 | -297.91 |
| General | channel | 17 | 0 (0 %) | 10 | 20 % | 0.15 | -26.72 |
| General | direction | 30 | 16 (53 %) | 81 | 58 % | 1.14 | 14.58 |
| General | ema | 57 | 53 (93 %) | 264 | 73 % | 2.76 | 369.46 |
| General | macd | 35 | 33 (94 %) | 93 | 63 % | 2.11 | 111.51 |
| General | move | 202 | 63 (31 %) | 543 | 55 % | 1.10 | 70.79 |
| General | osc | 77 | 34 (44 %) | 243 | 67 % | 2.26 | 283.71 |
| General | rsi | 22 | 4 (18 %) | 12 | 67 % | 2.09 | 12.24 |
| General | trend | 6 | 3 (50 %) | 110 | 54 % | 0.88 | -19.68 |
| General | volume | 43 | 6 (14 %) | 154 | 38 % | 0.66 | -108.13 |
| Long | active | 11 | 2 (18 %) | 17 | 29 % | 0.56 | -19.32 |
| Long | bollinger | 11 | 6 (55 %) | 17 | 35 % | 0.02 | -32.92 |
| Long | break | 121 | 31 (26 %) | 393 | 43 % | 0.68 | -333.65 |
| Long | channel | 91 | 0 (0 %) | 70 | 10 % | 0.02 | -357.63 |
| Long | direction | 26 | 16 (62 %) | 172 | 65 % | 1.34 | 114.66 |
| Long | ema | 7 | 4 (57 %) | 30 | 67 % | 1.34 | 21.29 |
| Long | ichimoku | 1 | 0 (0 %) | 10 | 50 % | 0.41 | -14.58 |
| Long | macd | 42 | 42 (100 %) | 56 | 84 % | 8.71 | 229.71 |
| Long | move | 275 | 71 (26 %) | 312 | 59 % | 1.36 | 212.38 |
| Long | osc | 283 | 133 (47 %) | 415 | 82 % | 5.90 | 1186.40 |
| Long | rsi | 8 | 3 (38 %) | 12 | 58 % | 1.48 | 8.45 |
| Long | smooth | 8 | 6 (75 %) | 36 | 58 % | 1.89 | 47.64 |
| Long | trend | 28 | 3 (11 %) | 252 | 50 % | 0.74 | -165.80 |
| Long | volume | 59 | 14 (24 %) | 186 | 41 % | 0.74 | -136.81 |
| Wide | active | 61 | 18 (30 %) | 140 | 43 % | 0.78 | -29.60 |
| Wide | bollinger | 7 | 0 (0 %) | 3 | 0 % | 0.00 | -6.44 |
| Wide | break | 36 | 7 (19 %) | 201 | 31 % | 0.74 | -45.82 |
| Wide | channel | 28 | 6 (21 %) | 110 | 22 % | 0.23 | -95.77 |
| Wide | direction | 9 | 0 (0 %) | 54 | 33 % | 0.60 | -16.05 |
| Wide | ema | 12 | 3 (25 %) | 21 | 29 % | 0.43 | -7.52 |
| Wide | ichimoku | 6 | 0 (0 %) | 54 | 28 % | 0.41 | -29.39 |
| Wide | macd | 19 | 0 (0 %) | 50 | 6 % | 0.06 | -42.25 |
| Wide | move | 48 | 21 (44 %) | 182 | 41 % | 0.50 | -79.97 |
| Wide | osc | 33 | 27 (82 %) | 87 | 45 % | 2.19 | 43.59 |
| Wide | rsi | 22 | 8 (36 %) | 184 | 49 % | 1.11 | 8.48 |
| Wide | sar | 3 | 0 (0 %) | 6 | 50 % | 0.75 | -1.18 |
| Wide | smooth | 6 | 0 (0 %) | 9 | 0 % | 0.00 | -18.03 |
| Wide | trend | 6 | 0 (0 %) | 21 | 43 % | 0.67 | -2.44 |
| Wide | volume | 23 | 8 (35 %) | 170 | 36 % | 0.72 | -29.59 |
| Signals | signal:act-burst | 40 | 32 (80 %) | 968 | 79 % | 1.31 | 489.87 |
| Signals | signal:act-hf | 40 | 16 (40 %) | 1288 | 72 % | 0.79 | -637.36 |
| Signals | signal:adx | 40 | 32 (80 %) | 623 | 82 % | 1.97 | 733.57 |
| Signals | signal:atr-break | 40 | 13 (33 %) | 1023 | 72 % | 0.81 | -466.15 |
| Signals | signal:bollinger | 40 | 40 (100 %) | 885 | 84 % | 2.30 | 1370.12 |
| Signals | signal:cci | 40 | 38 (95 %) | 1171 | 80 % | 1.74 | 1135.64 |
| Signals | signal:cmf | 40 | 11 (28 %) | 927 | 65 % | 0.60 | -1131.04 |
| Signals | signal:donchian | 40 | 14 (35 %) | 873 | 74 % | 0.98 | -35.71 |
| Signals | signal:ema-cross | 40 | 20 (50 %) | 498 | 76 % | 1.01 | 13.09 |
| Signals | signal:ema-cross-fast | 40 | 28 (70 %) | 786 | 78 % | 1.13 | 195.24 |
| Signals | signal:ema-pullback | 40 | 24 (60 %) | 1110 | 75 % | 1.13 | 244.55 |
| Signals | signal:ema-slope | 40 | 32 (80 %) | 612 | 83 % | 1.83 | 714.90 |
| Signals | signal:ema-trend | 40 | 35 (88 %) | 921 | 79 % | 1.44 | 658.18 |
| Signals | signal:heikin-ashi | 40 | 34 (85 %) | 1560 | 80 % | 1.46 | 1021.10 |
| Signals | signal:hma | 40 | 33 (83 %) | 1117 | 81 % | 1.49 | 808.60 |
| Signals | signal:ichimoku | 40 | 7 (18 %) | 643 | 72 % | 0.77 | -367.29 |
| Signals | signal:impulse | 40 | 27 (68 %) | 958 | 77 % | 1.21 | 373.70 |
| Signals | signal:kama | 40 | 27 (68 %) | 1180 | 78 % | 1.30 | 560.33 |
| Signals | signal:keltner | 40 | 9 (23 %) | 581 | 70 % | 0.71 | -448.18 |
| Signals | signal:macd-cross | 40 | 35 (88 %) | 1131 | 81 % | 1.43 | 744.60 |
| Signals | signal:macd-hist | 40 | 35 (88 %) | 1442 | 80 % | 1.40 | 856.75 |
| Signals | signal:macd-slow | 40 | 33 (83 %) | 1098 | 81 % | 1.47 | 779.64 |
| Signals | signal:mfi | 40 | 31 (78 %) | 157 | 82 % | 1.83 | 172.93 |
| Signals | signal:obv | 40 | 40 (100 %) | 1304 | 85 % | 2.57 | 1759.17 |
| Signals | signal:r-awesome | 40 | 13 (33 %) | 797 | 70 % | 0.78 | -437.70 |
| Signals | signal:r-connors | 35 | 21 (60 %) | 475 | 75 % | 1.02 | 12.93 |
| Signals | signal:r-fractal | 40 | 0 (0 %) | 513 | 57 % | 0.35 | -1346.21 |
| Signals | signal:r-inside | 29 | 12 (41 %) | 111 | 67 % | 0.55 | -160.65 |
| Signals | signal:r-linreg | 40 | 19 (48 %) | 1071 | 73 % | 1.03 | 67.49 |
| Signals | signal:r-nr-break | 40 | 11 (28 %) | 918 | 73 % | 0.78 | -478.62 |
| Signals | signal:r-session-trend | 40 | 16 (40 %) | 392 | 66 % | 0.74 | -273.89 |
| Signals | signal:r-vol-regime | 38 | 6 (16 %) | 181 | 61 % | 0.48 | -340.83 |
| Signals | signal:reclaim | 40 | 33 (83 %) | 1199 | 80 % | 1.59 | 1003.97 |
| Signals | signal:rsi-mid | 40 | 25 (63 %) | 1082 | 75 % | 1.01 | 29.97 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 38 | 22 (58 %) | 193 | 78 % | 1.14 | 53.76 |
| Signals | signal:s2-active-hf | 40 | 8 (20 %) | 1486 | 73 % | 0.81 | -680.32 |
| Signals | signal:s2-adx-gate | 40 | 25 (63 %) | 962 | 75 % | 1.20 | 343.59 |
| Signals | signal:s2-atr-break | 40 | 6 (15 %) | 834 | 64 % | 0.51 | -1279.85 |
| Signals | signal:s2-bb-bounce | 40 | 38 (95 %) | 635 | 85 % | 3.46 | 1219.34 |
| Signals | signal:s2-block-scale | 40 | 13 (33 %) | 1199 | 71 % | 0.83 | -469.62 |
| Signals | signal:s2-block-stack | 40 | 8 (20 %) | 747 | 67 % | 0.60 | -914.42 |
| Signals | signal:s2-confluence | 40 | 40 (100 %) | 1192 | 80 % | 1.86 | 1159.89 |
| Signals | signal:s2-ema-cross | 26 | 13 (50 %) | 39 | 62 % | 0.23 | -117.03 |
| Signals | signal:s2-range-break | 34 | 11 (32 %) | 187 | 60 % | 0.43 | -369.10 |
| Signals | signal:s2-range-shift | 40 | 4 (10 %) | 583 | 57 % | 0.40 | -1403.58 |
| Signals | signal:s2-rsi-revert | 38 | 38 (100 %) | 309 | 93 % | 19.61 | 835.56 |
| Signals | signal:s2-st-trail | 40 | 32 (80 %) | 377 | 83 % | 2.03 | 459.31 |
| Signals | signal:s2-stoch-swing | 40 | 40 (100 %) | 1005 | 85 % | 2.79 | 1464.95 |
| Signals | signal:s2-vol-break | 40 | 19 (48 %) | 273 | 73 % | 1.09 | 56.13 |
| Signals | signal:s2-vwap-axis | 8 | 8 (100 %) | 15 | 87 % | 131.39 | 21.94 |
| Signals | signal:sar | 40 | 8 (20 %) | 1264 | 72 % | 0.74 | -862.24 |
| Signals | signal:squeeze | 40 | 13 (33 %) | 232 | 65 % | 0.63 | -290.54 |
| Signals | signal:st-slow | 40 | 29 (73 %) | 346 | 78 % | 1.54 | 277.70 |
| Signals | signal:stoch-rsi | 40 | 29 (73 %) | 1427 | 76 % | 1.54 | 1054.99 |
| Signals | signal:supertrend | 40 | 31 (78 %) | 615 | 79 % | 1.29 | 308.47 |
| Signals | signal:swing | 40 | 20 (50 %) | 1214 | 74 % | 0.93 | -186.63 |
| Signals | signal:thrust | 40 | 32 (80 %) | 1168 | 80 % | 1.48 | 808.61 |
| Signals | signal:trix | 40 | 20 (50 %) | 538 | 75 % | 1.06 | 71.15 |
| Signals | signal:volume-break | 36 | 29 (81 %) | 90 | 88 % | 2.81 | 136.83 |
| Signals | signal:vwap | 40 | 39 (98 %) | 783 | 84 % | 3.02 | 1244.92 |
| Signals | signal:williams-r | 40 | 40 (100 %) | 1180 | 84 % | 2.69 | 1846.03 |
| Signals | signal:zscore | 40 | 36 (90 %) | 703 | 83 % | 2.02 | 939.90 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 6263 | 5821 | 5720 | 4.00 | 4.00 | 70.00–163.33 (median 163.33) | 0 | 0 | 0 | 70 | 2 | 0 | 16 | 0 | 13 | 0 | 0 | 0 | 442 |  |
| Minimal | 11866 | 8618 | 5396 | 2.55 | 3.60 | 18.00–163.33 (median 70.00) | 268 | 15 | 12 | 466 | 284 | 357 | 1570 | 6 | 240 | 4 | 0 | 0 | 3248 |  |
| Short | 63047 | 42311 | 2890 | 1.34 | 1.97 | 163.33–163.33 (median 163.33) | 3548 | 7435 | 1608 | 8575 | 5487 | 2433 | 9802 | 12 | 519 | 2 | 0 | 0 | 20736 |  |
| General | 22635 | 14955 | 624 | 1.36 | 2.14 | 163.33–163.33 (median 163.33) | 1187 | 2046 | 636 | 2304 | 2444 | 969 | 4461 | 0 | 240 | 44 | 0 | 0 | 7680 |  |
| Long | 31033 | 21433 | 971 | 1.25 | 2.35 | 163.33–163.33 (median 163.33) | 1217 | 4811 | 1159 | 4154 | 2295 | 1300 | 5198 | 0 | 274 | 54 | 0 | 0 | 9600 |  |
| Wide | 160060 | 116010 | 319 | 0.63 | 2.23 | 18.00–163.33 (median 163.33) | 23214 | 79757 | 1831 | 6974 | 1961 | 288 | 1219 | 0 | 427 | 20 | 0 | 24160 | 19890 |  |
| Signals | 2520 | – | 3366 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 2520 signal tapes, 3366 units (pair × symbol × direction) active at the run start, 5604 over the run; 2417 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 3465 | 495 (14 %) | 1510 | 100 % | ∞ (no loss) | 492.80 |
| Micro | trailing | 2798 | 558 (20 %) | 1615 | 76 % | 4.70 | 330.95 |
| Minimal | normal | 3870 | 2728 (70 %) | 33066 | 87 % | 2.60 | 20773.20 |
| Minimal | trailing | 7996 | 6222 (78 %) | 89891 | 74 % | 2.49 | 47644.63 |
| Short | normal | 20994 | 8057 (38 %) | 164393 | 60 % | 0.94 | -12676.58 |
| Short | trailing | 42053 | 17749 (42 %) | 350463 | 59 % | 0.98 | -7426.13 |
| General | normal | 13561 | 4942 (36 %) | 99364 | 44 % | 1.00 | -266.83 |
| General | trailing | 9074 | 3327 (37 %) | 63933 | 56 % | 0.94 | -5443.46 |
| Long | normal | 18604 | 6816 (37 %) | 113033 | 43 % | 1.00 | 802.68 |
| Long | trailing | 12429 | 4557 (37 %) | 70343 | 57 % | 0.94 | -9248.88 |
| Wide | axis | 135900 | 30162 (22 %) | 1958351 | 32 % | 0.68 | -400491.67 |
| Wide | dca | 12080 | 4333 (36 %) | 208929 | 75 % | 0.80 | -40890.74 |
| Wide | dca-active | 12080 | 2570 (21 %) | 114009 | 43 % | 0.60 | -32340.62 |
| Signals | normal | 630 | 468 (74 %) | 22413 | 81 % | 1.41 | 17582.40 |
| Signals | trailing | 1890 | 1594 (84 %) | 72604 | 80 % | 1.78 | 70602.70 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 5720 | 522 (9 %) | 813 | 92 % | 8.55 | 196.45 |
| Minimal | active | 1869 | 411 (22 %) | 2391 | 78 % | 2.43 | 1323.75 |
| Minimal | bollinger | 355 | 126 (35 %) | 1520 | 80 % | 2.70 | 919.87 |
| Minimal | break | 349 | 314 (90 %) | 2484 | 83 % | 3.03 | 1562.50 |
| Minimal | channel | 90 | 24 (27 %) | 354 | 73 % | 1.65 | 138.39 |
| Minimal | direction | 160 | 138 (86 %) | 314 | 82 % | 4.07 | 235.40 |
| Minimal | ema | 50 | 18 (36 %) | 72 | 81 % | 7.22 | 82.96 |
| Minimal | macd | 32 | 12 (38 %) | 112 | 80 % | 1.37 | 28.25 |
| Minimal | move | 293 | 282 (96 %) | 3163 | 75 % | 2.20 | 1443.66 |
| Minimal | osc | 1312 | 995 (76 %) | 18827 | 81 % | 2.64 | 11545.94 |
| Minimal | rsi | 330 | 185 (56 %) | 1185 | 81 % | 3.16 | 695.09 |
| Minimal | sar | 4 | 4 (100 %) | 123 | 72 % | 1.63 | 39.07 |
| Minimal | smooth | 128 | 18 (14 %) | 194 | 65 % | 1.03 | 5.05 |
| Minimal | trend | 124 | 108 (87 %) | 729 | 80 % | 4.07 | 500.10 |
| Minimal | volume | 300 | 201 (67 %) | 1158 | 71 % | 1.63 | 409.11 |
| Short | active | 63 | 4 (6 %) | 12 | 100 % | ∞ (no loss) | 18.30 |
| Short | bollinger | 64 | 43 (67 %) | 372 | 66 % | 1.30 | 90.76 |
| Short | break | 492 | 165 (34 %) | 2755 | 52 % | 0.62 | -1494.67 |
| Short | channel | 106 | 1 (1 %) | 161 | 24 % | 0.13 | -501.27 |
| Short | direction | 243 | 86 (35 %) | 935 | 63 % | 0.78 | -234.79 |
| Short | ema | 211 | 154 (73 %) | 1139 | 76 % | 2.23 | 921.56 |
| Short | ichimoku | 7 | 0 (0 %) | 79 | 57 % | 0.61 | -57.43 |
| Short | macd | 109 | 67 (61 %) | 939 | 68 % | 1.28 | 250.90 |
| Short | move | 713 | 275 (39 %) | 3534 | 60 % | 1.00 | -16.45 |
| Short | osc | 518 | 342 (66 %) | 2508 | 73 % | 2.23 | 1792.32 |
| Short | rsi | 38 | 28 (74 %) | 145 | 73 % | 1.70 | 53.22 |
| Short | smooth | 19 | 9 (47 %) | 143 | 59 % | 0.92 | -14.97 |
| Short | trend | 117 | 72 (62 %) | 904 | 68 % | 1.16 | 134.50 |
| Short | volume | 190 | 55 (29 %) | 623 | 47 % | 0.68 | -254.77 |
| General | active | 26 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | bollinger | 5 | 0 (0 %) | 15 | 0 % | 0.00 | -30.60 |
| General | break | 104 | 38 (37 %) | 610 | 43 % | 0.71 | -297.91 |
| General | channel | 17 | 0 (0 %) | 10 | 20 % | 0.15 | -26.72 |
| General | direction | 30 | 16 (53 %) | 81 | 58 % | 1.14 | 14.58 |
| General | ema | 57 | 53 (93 %) | 264 | 73 % | 2.76 | 369.46 |
| General | macd | 35 | 33 (94 %) | 93 | 63 % | 2.11 | 111.51 |
| General | move | 202 | 63 (31 %) | 543 | 55 % | 1.10 | 70.79 |
| General | osc | 77 | 34 (44 %) | 243 | 67 % | 2.26 | 283.71 |
| General | rsi | 22 | 4 (18 %) | 12 | 67 % | 2.09 | 12.24 |
| General | trend | 6 | 3 (50 %) | 110 | 54 % | 0.88 | -19.68 |
| General | volume | 43 | 6 (14 %) | 154 | 38 % | 0.66 | -108.13 |
| Long | active | 11 | 2 (18 %) | 17 | 29 % | 0.56 | -19.32 |
| Long | bollinger | 11 | 6 (55 %) | 17 | 35 % | 0.02 | -32.92 |
| Long | break | 121 | 31 (26 %) | 393 | 43 % | 0.68 | -333.65 |
| Long | channel | 91 | 0 (0 %) | 70 | 10 % | 0.02 | -357.63 |
| Long | direction | 26 | 16 (62 %) | 172 | 65 % | 1.34 | 114.66 |
| Long | ema | 7 | 4 (57 %) | 30 | 67 % | 1.34 | 21.29 |
| Long | ichimoku | 1 | 0 (0 %) | 10 | 50 % | 0.41 | -14.58 |
| Long | macd | 42 | 42 (100 %) | 56 | 84 % | 8.71 | 229.71 |
| Long | move | 275 | 71 (26 %) | 312 | 59 % | 1.36 | 212.38 |
| Long | osc | 283 | 133 (47 %) | 415 | 82 % | 5.90 | 1186.40 |
| Long | rsi | 8 | 3 (38 %) | 12 | 58 % | 1.48 | 8.45 |
| Long | smooth | 8 | 6 (75 %) | 36 | 58 % | 1.89 | 47.64 |
| Long | trend | 28 | 3 (11 %) | 252 | 50 % | 0.74 | -165.80 |
| Long | volume | 59 | 14 (24 %) | 186 | 41 % | 0.74 | -136.81 |
| Wide | active | 61 | 18 (30 %) | 140 | 43 % | 0.78 | -29.60 |
| Wide | bollinger | 7 | 0 (0 %) | 3 | 0 % | 0.00 | -6.44 |
| Wide | break | 36 | 7 (19 %) | 201 | 31 % | 0.74 | -45.82 |
| Wide | channel | 28 | 6 (21 %) | 110 | 22 % | 0.23 | -95.77 |
| Wide | direction | 9 | 0 (0 %) | 54 | 33 % | 0.60 | -16.05 |
| Wide | ema | 12 | 3 (25 %) | 21 | 29 % | 0.43 | -7.52 |
| Wide | ichimoku | 6 | 0 (0 %) | 54 | 28 % | 0.41 | -29.39 |
| Wide | macd | 19 | 0 (0 %) | 50 | 6 % | 0.06 | -42.25 |
| Wide | move | 48 | 21 (44 %) | 182 | 41 % | 0.50 | -79.97 |
| Wide | osc | 33 | 27 (82 %) | 87 | 45 % | 2.19 | 43.59 |
| Wide | rsi | 22 | 8 (36 %) | 184 | 49 % | 1.11 | 8.48 |
| Wide | sar | 3 | 0 (0 %) | 6 | 50 % | 0.75 | -1.18 |
| Wide | smooth | 6 | 0 (0 %) | 9 | 0 % | 0.00 | -18.03 |
| Wide | trend | 6 | 0 (0 %) | 21 | 43 % | 0.67 | -2.44 |
| Wide | volume | 23 | 8 (35 %) | 170 | 36 % | 0.72 | -29.59 |
| Signals | signal:act-burst | 40 | 32 (80 %) | 968 | 79 % | 1.31 | 489.87 |
| Signals | signal:act-hf | 40 | 16 (40 %) | 1288 | 72 % | 0.79 | -637.36 |
| Signals | signal:adx | 40 | 32 (80 %) | 623 | 82 % | 1.97 | 733.57 |
| Signals | signal:atr-break | 40 | 13 (33 %) | 1023 | 72 % | 0.81 | -466.15 |
| Signals | signal:bollinger | 40 | 40 (100 %) | 885 | 84 % | 2.30 | 1370.12 |
| Signals | signal:cci | 40 | 38 (95 %) | 1171 | 80 % | 1.74 | 1135.64 |
| Signals | signal:cmf | 40 | 11 (28 %) | 927 | 65 % | 0.60 | -1131.04 |
| Signals | signal:donchian | 40 | 14 (35 %) | 873 | 74 % | 0.98 | -35.71 |
| Signals | signal:ema-cross | 40 | 20 (50 %) | 498 | 76 % | 1.01 | 13.09 |
| Signals | signal:ema-cross-fast | 40 | 28 (70 %) | 786 | 78 % | 1.13 | 195.24 |
| Signals | signal:ema-pullback | 40 | 24 (60 %) | 1110 | 75 % | 1.13 | 244.55 |
| Signals | signal:ema-slope | 40 | 32 (80 %) | 612 | 83 % | 1.83 | 714.90 |
| Signals | signal:ema-trend | 40 | 35 (88 %) | 921 | 79 % | 1.44 | 658.18 |
| Signals | signal:heikin-ashi | 40 | 34 (85 %) | 1560 | 80 % | 1.46 | 1021.10 |
| Signals | signal:hma | 40 | 33 (83 %) | 1117 | 81 % | 1.49 | 808.60 |
| Signals | signal:ichimoku | 40 | 7 (18 %) | 643 | 72 % | 0.77 | -367.29 |
| Signals | signal:impulse | 40 | 27 (68 %) | 958 | 77 % | 1.21 | 373.70 |
| Signals | signal:kama | 40 | 27 (68 %) | 1180 | 78 % | 1.30 | 560.33 |
| Signals | signal:keltner | 40 | 9 (23 %) | 581 | 70 % | 0.71 | -448.18 |
| Signals | signal:macd-cross | 40 | 35 (88 %) | 1131 | 81 % | 1.43 | 744.60 |
| Signals | signal:macd-hist | 40 | 35 (88 %) | 1442 | 80 % | 1.40 | 856.75 |
| Signals | signal:macd-slow | 40 | 33 (83 %) | 1098 | 81 % | 1.47 | 779.64 |
| Signals | signal:mfi | 40 | 31 (78 %) | 157 | 82 % | 1.83 | 172.93 |
| Signals | signal:obv | 40 | 40 (100 %) | 1304 | 85 % | 2.57 | 1759.17 |
| Signals | signal:r-awesome | 40 | 13 (33 %) | 797 | 70 % | 0.78 | -437.70 |
| Signals | signal:r-connors | 35 | 21 (60 %) | 475 | 75 % | 1.02 | 12.93 |
| Signals | signal:r-fractal | 40 | 0 (0 %) | 513 | 57 % | 0.35 | -1346.21 |
| Signals | signal:r-inside | 29 | 12 (41 %) | 111 | 67 % | 0.55 | -160.65 |
| Signals | signal:r-linreg | 40 | 19 (48 %) | 1071 | 73 % | 1.03 | 67.49 |
| Signals | signal:r-nr-break | 40 | 11 (28 %) | 918 | 73 % | 0.78 | -478.62 |
| Signals | signal:r-session-trend | 40 | 16 (40 %) | 392 | 66 % | 0.74 | -273.89 |
| Signals | signal:r-vol-regime | 38 | 6 (16 %) | 181 | 61 % | 0.48 | -340.83 |
| Signals | signal:reclaim | 40 | 33 (83 %) | 1199 | 80 % | 1.59 | 1003.97 |
| Signals | signal:rsi-mid | 40 | 25 (63 %) | 1082 | 75 % | 1.01 | 29.97 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 38 | 22 (58 %) | 193 | 78 % | 1.14 | 53.76 |
| Signals | signal:s2-active-hf | 40 | 8 (20 %) | 1486 | 73 % | 0.81 | -680.32 |
| Signals | signal:s2-adx-gate | 40 | 25 (63 %) | 962 | 75 % | 1.20 | 343.59 |
| Signals | signal:s2-atr-break | 40 | 6 (15 %) | 834 | 64 % | 0.51 | -1279.85 |
| Signals | signal:s2-bb-bounce | 40 | 38 (95 %) | 635 | 85 % | 3.46 | 1219.34 |
| Signals | signal:s2-block-scale | 40 | 13 (33 %) | 1199 | 71 % | 0.83 | -469.62 |
| Signals | signal:s2-block-stack | 40 | 8 (20 %) | 747 | 67 % | 0.60 | -914.42 |
| Signals | signal:s2-confluence | 40 | 40 (100 %) | 1192 | 80 % | 1.86 | 1159.89 |
| Signals | signal:s2-ema-cross | 26 | 13 (50 %) | 39 | 62 % | 0.23 | -117.03 |
| Signals | signal:s2-range-break | 34 | 11 (32 %) | 187 | 60 % | 0.43 | -369.10 |
| Signals | signal:s2-range-shift | 40 | 4 (10 %) | 583 | 57 % | 0.40 | -1403.58 |
| Signals | signal:s2-rsi-revert | 38 | 38 (100 %) | 309 | 93 % | 19.61 | 835.56 |
| Signals | signal:s2-st-trail | 40 | 32 (80 %) | 377 | 83 % | 2.03 | 459.31 |
| Signals | signal:s2-stoch-swing | 40 | 40 (100 %) | 1005 | 85 % | 2.79 | 1464.95 |
| Signals | signal:s2-vol-break | 40 | 19 (48 %) | 273 | 73 % | 1.09 | 56.13 |
| Signals | signal:s2-vwap-axis | 8 | 8 (100 %) | 15 | 87 % | 131.39 | 21.94 |
| Signals | signal:sar | 40 | 8 (20 %) | 1264 | 72 % | 0.74 | -862.24 |
| Signals | signal:squeeze | 40 | 13 (33 %) | 232 | 65 % | 0.63 | -290.54 |
| Signals | signal:st-slow | 40 | 29 (73 %) | 346 | 78 % | 1.54 | 277.70 |
| Signals | signal:stoch-rsi | 40 | 29 (73 %) | 1427 | 76 % | 1.54 | 1054.99 |
| Signals | signal:supertrend | 40 | 31 (78 %) | 615 | 79 % | 1.29 | 308.47 |
| Signals | signal:swing | 40 | 20 (50 %) | 1214 | 74 % | 0.93 | -186.63 |
| Signals | signal:thrust | 40 | 32 (80 %) | 1168 | 80 % | 1.48 | 808.61 |
| Signals | signal:trix | 40 | 20 (50 %) | 538 | 75 % | 1.06 | 71.15 |
| Signals | signal:volume-break | 36 | 29 (81 %) | 90 | 88 % | 2.81 | 136.83 |
| Signals | signal:vwap | 40 | 39 (98 %) | 783 | 84 % | 3.02 | 1244.92 |
| Signals | signal:williams-r | 40 | 40 (100 %) | 1180 | 84 % | 2.69 | 1846.03 |
| Signals | signal:zscore | 40 | 36 (90 %) | 703 | 83 % | 2.02 | 939.90 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | 1.1 | 878 | 847 (96 %) | 18212 | 80 % | 2.51 | 10876.58 |
| Minimal | 1.25 | 824 | 796 (97 %) | 17296 | 80 % | 2.53 | 10382.85 |
| Minimal | 1.35 | 768 | 742 (97 %) | 16245 | 80 % | 2.53 | 9838.16 |
| Minimal | 1.5 | 645 | 621 (96 %) | 13670 | 79 % | 2.52 | 8165.53 |
| Minimal | 1.75 | 458 | 440 (96 %) | 10002 | 78 % | 2.58 | 6023.30 |
| Minimal | 2 | 300 | 288 (96 %) | 6910 | 77 % | 2.64 | 4156.60 |
| Short | 1.1 | 1305 | 807 (62 %) | 10930 | 64 % | 1.19 | 2031.14 |
| Short | 1.25 | 1214 | 765 (63 %) | 10000 | 64 % | 1.22 | 2060.39 |
| Short | 1.35 | 1120 | 707 (63 %) | 9046 | 64 % | 1.22 | 1834.67 |
| Short | 1.5 | 915 | 608 (66 %) | 7261 | 65 % | 1.28 | 1861.76 |
| Short | 1.75 | 595 | 440 (74 %) | 4641 | 68 % | 1.43 | 1624.35 |
| Short | 2 | 368 | 284 (77 %) | 2849 | 71 % | 1.54 | 1137.66 |
| General | 1.1 | 216 | 130 (60 %) | 1685 | 55 % | 1.17 | 389.71 |
| General | 1.25 | 204 | 124 (61 %) | 1558 | 56 % | 1.17 | 368.06 |
| General | 1.35 | 186 | 119 (64 %) | 1405 | 57 % | 1.24 | 440.51 |
| General | 1.5 | 157 | 102 (65 %) | 1109 | 58 % | 1.31 | 438.53 |
| General | 1.75 | 106 | 76 (72 %) | 693 | 62 % | 1.51 | 403.20 |
| General | 2 | 63 | 53 (84 %) | 346 | 69 % | 2.13 | 352.39 |
| Long | 1.1 | 333 | 213 (64 %) | 1642 | 60 % | 1.31 | 975.49 |
| Long | 1.25 | 314 | 204 (65 %) | 1519 | 61 % | 1.34 | 978.52 |
| Long | 1.35 | 291 | 195 (67 %) | 1386 | 61 % | 1.38 | 971.04 |
| Long | 1.5 | 244 | 162 (66 %) | 1145 | 62 % | 1.37 | 796.12 |
| Long | 1.75 | 179 | 120 (67 %) | 825 | 63 % | 1.40 | 630.01 |
| Long | 2 | 104 | 67 (64 %) | 438 | 65 % | 1.44 | 354.81 |
| Wide | 1.1 | 24 | 11 (46 %) | 220 | 43 % | 0.78 | -44.85 |
| Wide | 1.25 | 21 | 11 (52 %) | 172 | 45 % | 0.77 | -34.51 |
| Wide | 1.35 | 21 | 11 (52 %) | 172 | 45 % | 0.77 | -34.51 |
| Wide | 1.5 | 16 | 7 (44 %) | 141 | 44 % | 0.79 | -25.29 |
| Wide | 1.75 | 9 | 6 (67 %) | 60 | 55 % | 1.12 | 5.31 |
| Wide | 2 | 9 | 6 (67 %) | 60 | 55 % | 1.12 | 5.31 |
| Signals | 1.1 | 424 | 185 (44 %) | 9516 | 73 % | 0.90 | -2129.45 |
| Signals | 1.25 | 232 | 102 (44 %) | 5130 | 73 % | 0.91 | -980.76 |
| Signals | 1.35 | 147 | 68 (46 %) | 3368 | 72 % | 0.92 | -542.77 |
| Signals | 1.5 | 75 | 32 (43 %) | 1772 | 73 % | 0.93 | -268.67 |
| Signals | 1.75 | 27 | 10 (37 %) | 637 | 73 % | 0.93 | -89.60 |
| Signals | 2 | 12 | 4 (33 %) | 254 | 74 % | 0.97 | -14.79 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-lag-12@m15c | 116 | 116 (100 %) | 348 | 86 % | 4.03 | 73.63 | – |
| Micro | ribbon | mc-trsi2-10@m15 | 130 | 130 (100 %) | 130 | 100 % | ∞ (no loss) | 37.40 | – |
| Micro | ribbon | mc-tpull-8@m5 | 65 | 65 (100 %) | 65 | 100 % | ∞ (no loss) | 22.95 | – |
| Micro | clamp | mc-trsi2-10@m15c | 84 | 84 (100 %) | 84 | 100 % | ∞ (no loss) | 18.10 | – |
| Micro | pivot | mc-trsi2-10@m15c | 84 | 84 (100 %) | 84 | 100 % | ∞ (no loss) | 18.10 | – |
| Micro | clamp | mc-trsi2-10@m15 | 32 | 32 (100 %) | 32 | 100 % | ∞ (no loss) | 7.70 | – |
| Micro | pivot | mc-lag-6@m5 | 4 | 4 (100 %) | 42 | 71 % | 5.53 | 6.14 | tp0.45 sl2.25 tr0 h192 mc (10 · ∞ (no loss) · 2.50) |
| Micro | clamp | mc-trsi2-10@m5 | 3 | 3 (100 %) | 12 | 75 % | 15.88 | 6.03 | – |
| Micro | sandwich | mc-rsi3-15@m5c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 3.20 | – |
| Micro | snap | mc-rsi3-15@m5c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 3.20 | – |
| Minimal | magnet | willr-21-80@m1c | 29 | 29 (100 %) | 970 | 86 % | 3.41 | 773.07 | tp1.6 sl4 tr1.2 h1440 mn (31 · 5.61 · 39.52) |
| Minimal | clamp | willr-21-80@m1c | 19 | 19 (100 %) | 944 | 86 % | 3.72 | 766.26 | tp1.6 sl4 tr0 h1440 mn (45 · 7.17 · 51.80) |
| Minimal | magnet | willr-50-80@m1c | 28 | 28 (100 %) | 961 | 84 % | 3.32 | 722.21 | tp1.6 sl4.8 tr0.8 h960 mn (36 · 7.12 · 33.14) |
| Minimal | pivot | willr-28-80@m1c | 24 | 24 (100 %) | 1338 | 80 % | 2.23 | 703.69 | tp1.4 sl4.2 tr0 h1440 mn (48 · 4.09 · 40.80) |
| Minimal | magnet | willr-28-80@m1c | 31 | 31 (100 %) | 1080 | 78 % | 2.79 | 692.08 | tp1.6 sl4 tr1.2 h1440 mn (32 · 5.14 · 36.17) |
| Minimal | clamp | willr-28-80@m1c | 21 | 21 (100 %) | 1130 | 79 % | 2.59 | 667.55 | tp1.6 sl4.8 tr0 h1440 mn (41 · 5.46 · 44.60) |
| Minimal | ribbon | willr-28-80@m1c | 22 | 22 (100 %) | 1192 | 79 % | 2.25 | 647.33 | tp1.4 sl4.2 tr0 h1440 mn (47 · 4.00 · 39.60) |
| Minimal | sandwich | willr-28-80@m1c | 23 | 23 (100 %) | 1118 | 78 % | 2.30 | 589.78 | tp1.6 sl4.8 tr0 h1440 mn (38 · 5.04 · 40.40) |
| Minimal | sandwich | willr-21-80@m1c | 16 | 16 (100 %) | 713 | 87 % | 3.24 | 530.30 | tp1.6 sl4 tr0 h1440 mn (40 · 6.33 · 44.80) |
| Minimal | pivot | willr-21-80@m1c | 13 | 13 (100 %) | 654 | 86 % | 3.05 | 497.95 | tp1.6 sl4 tr1.2 h1440 mn (46 · 4.60 · 48.73) |
| Minimal | ribbon | willr-21-80@m1c | 11 | 11 (100 %) | 563 | 88 % | 3.19 | 426.90 | tp1.4 sl4.2 tr1.05 h1440 mn (51 · 6.22 · 49.17) |
| Minimal | magnet | mc-rsi4-15@m5 | 30 | 30 (100 %) | 516 | 82 % | 3.00 | 364.37 | tp1.6 sl4.8 tr1.2 h288 mn (16 · 92.98 · 21.04) |
| Minimal | pivot | cci-40-200@m15c | 37 | 37 (100 %) | 649 | 79 % | 2.14 | 339.18 | tp1.6 sl2.4 tr1.2 h96 mn (16 · 3.88 · 15.20) |
| Minimal | ribbon | r-zdist-m@m5c | 64 | 64 (100 %) | 625 | 74 % | 3.17 | 316.79 | tp1.6 sl4 tr0 h288 mn (6 · ∞ (no loss) · 8.40) |
| Minimal | pivot | r-zdist-m@m5c | 64 | 64 (100 %) | 625 | 74 % | 3.17 | 316.79 | tp1.6 sl4 tr0 h288 mn (6 · ∞ (no loss) · 8.40) |
| Minimal | pivot | r-zdist@m15 | 49 | 49 (100 %) | 707 | 77 % | 1.89 | 300.16 | tp1.6 sl2.4 tr1.2 h96 mn (13 · 3.60 · 13.68) |
| Minimal | revert | break-retest@m5c | 50 | 50 (100 %) | 200 | 99 % | 984.83 | 275.73 | – |
| Minimal | clamp | z-50-2.5@m15c | 54 | 54 (100 %) | 372 | 86 % | 9.77 | 256.93 | tp1.6 sl3.2 tr0 h96 mn (5 · ∞ (no loss) · 7.00) |
| Minimal | ribbon | bb-bounce-20-2.5@m1 | 21 | 21 (100 %) | 346 | 83 % | 3.53 | 254.96 | tp1.6 sl4 tr0.8 h960 mn (16 · 5.64 · 19.47) |
| Minimal | ribbon | z-20-2.5@m1 | 21 | 21 (100 %) | 346 | 83 % | 3.53 | 254.96 | tp1.6 sl4 tr0.8 h960 mn (16 · 5.64 · 19.47) |
| Minimal | sweep | break-vol-2@m1 | 61 | 58 (95 %) | 561 | 83 % | 2.34 | 250.18 | tp1.2 sl3 tr0.9 h960 mn (9 · 55.49 · 6.95) |
| Minimal | magnet | willr-28-90@m1c | 28 | 28 (100 %) | 286 | 82 % | 3.63 | 244.04 | tp1.6 sl3.2 tr1.2 h960 mn (10 · 4.83 · 13.54) |
| Minimal | pivot | bb-bounce-20-2.5@m1 | 23 | 23 (100 %) | 332 | 82 % | 3.18 | 242.08 | tp1.6 sl4 tr0.8 h960 mn (14 · 5.07 · 17.11) |
| Minimal | pivot | z-20-2.5@m1 | 23 | 23 (100 %) | 332 | 82 % | 3.18 | 242.08 | tp1.6 sl4 tr0.8 h960 mn (14 · 5.07 · 17.11) |
| Minimal | clamp | bb-bounce-20-2.5@m1 | 21 | 21 (100 %) | 325 | 84 % | 3.37 | 237.28 | tp1.6 sl4 tr0.8 h960 mn (15 · 5.21 · 17.67) |
| Minimal | clamp | z-20-2.5@m1 | 21 | 21 (100 %) | 325 | 84 % | 3.37 | 237.28 | tp1.6 sl4 tr0.8 h960 mn (15 · 5.21 · 17.67) |
| Minimal | magnet | r-inside@m1 | 56 | 56 (100 %) | 220 | 97 % | 452.40 | 226.01 | – |
| Minimal | ribbon | willr-50-95@m15 | 36 | 36 (100 %) | 226 | 95 % | 127.16 | 213.24 | tp1.6 sl3.2 tr0 h64 mn (6 · ∞ (no loss) · 8.40) |
| Minimal | magnet | willr-21-90@m1c | 42 | 42 (100 %) | 312 | 83 % | 3.30 | 200.88 | tp1.6 sl2.4 tr1.2 h960 mn (7 · 3.89 · 7.91) |
| Minimal | snap | r-pin@m1 | 17 | 17 (100 %) | 248 | 75 % | 2.41 | 186.85 | tp1.4 sl4.2 tr1.05 h960 mn (14 · 4.43 · 15.59) |
| Minimal | magnet | willr-50-90@m5c | 27 | 27 (100 %) | 230 | 89 % | 8.37 | 186.50 | tp1.6 sl3.2 tr1.2 h192 mn (8 · ∞ (no loss) · 12.08) |
| Minimal | pivot | r-zdist@m15c | 32 | 32 (100 %) | 437 | 78 % | 1.88 | 176.46 | tp1.6 sl2.4 tr1.2 h96 mn (12 · 3.33 · 12.28) |
| Minimal | revert | r-pdhl@m1 | 20 | 20 (100 %) | 244 | 87 % | 4.22 | 171.12 | tp1.6 sl4 tr0 h1440 mn (9 · ∞ (no loss) · 12.60) |
| Minimal | ribbon | dir-thrust-4@m5 | 19 | 19 (100 %) | 173 | 80 % | 6.07 | 166.76 | tp1 sl3 tr0.75 h192 mn (10 · 33.00 · 12.48) |
| Minimal | snap | willr-28-80@m1c | 11 | 11 (100 %) | 467 | 80 % | 1.72 | 163.87 | tp1.6 sl3.2 tr0 h1440 mn (36 · 2.55 · 26.40) |
| Minimal | sandwich | r-elder@m1 | 25 | 25 (100 %) | 162 | 93 % | 103.90 | 146.51 | tp1.6 sl3.2 tr0 h960 mn (7 · ∞ (no loss) · 9.80) |
| Minimal | snap | willr-21-80@m1c | 8 | 8 (100 %) | 298 | 81 % | 2.16 | 139.48 | tp1.6 sl4 tr0 h1440 mn (30 · 4.67 · 30.80) |
| Minimal | pivot | rsi-21-30-70@m15 | 14 | 14 (100 %) | 113 | 80 % | 5.79 | 124.08 | tp1.6 sl2.4 tr1.2 h96 mn (7 · 207.68 · 11.93) |
| Minimal | revert | aroon-14@m5c | 6 | 6 (100 %) | 196 | 78 % | 2.50 | 123.37 | tp1.4 sl2.8 tr1.05 h192 mn (33 · 2.97 · 24.53) |
| Minimal | sandwich | break-fail@m1c | 20 | 20 (100 %) | 244 | 84 % | 2.06 | 122.05 | tp1.6 sl4.8 tr1.2 h960 mn (12 · 3.01 · 9.92) |
| Minimal | magnet | rsi-14-20-80@m5 | 52 | 52 (100 %) | 274 | 82 % | 6.34 | 121.94 | tp1 sl2.5 tr0 h192 mn (5 · ∞ (no loss) · 4.00) |
| Minimal | ribbon | willr-7-90@m1c | 16 | 16 (100 %) | 106 | 84 % | 59.46 | 114.74 | tp1.6 sl4 tr0.8 h960 mn (7 · 52.40 · 8.54) |
| Minimal | pivot | willr-7-90@m1c | 16 | 16 (100 %) | 106 | 84 % | 59.46 | 114.74 | tp1.6 sl4 tr0.8 h960 mn (7 · 52.40 · 8.54) |
| Minimal | pulse | trend-st@m5c | 25 | 24 (96 %) | 215 | 80 % | 2.59 | 112.94 | tp1.6 sl4.8 tr0.8 h192 mn (9 · 92.60 · 10.34) |
| Minimal | snap | mfi-14-20@m5 | 9 | 9 (100 %) | 130 | 81 % | 3.56 | 110.39 | tp1.4 sl4.2 tr1.05 h192 mn (16 · 4.20 · 14.65) |
| Minimal | pivot | mc-lag-6@m5 | 10 | 10 (100 %) | 79 | 89 % | 8.18 | 108.50 | tp1.4 sl4.2 tr1.05 h288 mn (8 · 155.18 · 15.11) |
| Minimal | ribbon | break-fail@m1c | 16 | 16 (100 %) | 186 | 83 % | 2.26 | 107.28 | tp1.6 sl4.8 tr1.2 h960 mn (12 · 2.94 · 9.82) |
| Minimal | sandwich | r-klinger-m@m1 | 4 | 4 (100 %) | 167 | 69 % | 1.92 | 103.88 | tp1.4 sl4.2 tr1.05 h1440 mn (42 · 2.45 · 33.03) |
| Minimal | revert | srsi-14-10@m1c | 30 | 30 (100 %) | 300 | 63 % | 2.85 | 102.79 | tp1 sl1.5 tr0.5 h960 mn (10 · 11.90 · 5.42) |
| Minimal | clamp | rsi-fast@m5 | 9 | 9 (100 %) | 219 | 67 % | 1.80 | 98.93 | tp1.6 sl4 tr1.2 h288 mn (22 · 3.08 · 18.52) |
| Minimal | clamp | mc-rsi7-20@m5 | 9 | 9 (100 %) | 219 | 67 % | 1.80 | 98.93 | tp1.6 sl4 tr1.2 h288 mn (22 · 3.08 · 18.52) |
| Minimal | snap | willr-21-90@m1c | 15 | 15 (100 %) | 163 | 75 % | 2.11 | 92.93 | tp1.6 sl4 tr1.2 h1440 mn (9 · ∞ (no loss) · 17.83) |
| Minimal | pulse | willr-28-80@m1c | 11 | 9 (82 %) | 254 | 77 % | 1.57 | 88.51 | tp1.6 sl4 tr0 h1440 mn (20 · 3.00 · 16.80) |
| Minimal | pulse | willr-21-80@m1c | 6 | 6 (100 %) | 140 | 88 % | 2.45 | 88.28 | tp1.6 sl4 tr0 h1440 mn (22 · 3.33 · 19.60) |
| Minimal | pivot | r-session-trend@m15 | 83 | 83 (100 %) | 83 | 100 % | ∞ (no loss) | 88.20 | – |
| Minimal | ribbon | trend-st@m15c | 16 | 16 (100 %) | 58 | 83 % | 78.16 | 86.38 | – |
| Minimal | follow | willr-28-95@m1c | 9 | 9 (100 %) | 170 | 74 % | 1.71 | 84.63 | tp1.6 sl3.2 tr1.2 h1440 mn (18 · 2.38 · 14.15) |
| Minimal | follow | willr-21-90@m1c | 4 | 4 (100 %) | 139 | 81 % | 1.98 | 80.15 | tp1.4 sl4.2 tr1.05 h1440 mn (33 · 2.98 · 26.67) |
| Minimal | sandwich | rsi-div@m5 | 31 | 25 (81 %) | 126 | 86 % | 2.45 | 73.19 | tp1.4 sl2.1 tr1.05 h192 mn (5 · 0.57 · -1.96) |
| Minimal | pivot | mc-rsi2-5@m5 | 47 | 47 (100 %) | 235 | 77 % | 1.54 | 68.44 | tp1.6 sl4.8 tr1.2 h192 mn (5 · 29.09 · 4.17) |
| Minimal | ribbon | trend-st-14-2@m5 | 13 | 11 (85 %) | 105 | 71 % | 2.55 | 67.46 | tp1.6 sl4 tr0.8 h288 mn (9 · 28.36 · 10.19) |
| Minimal | ribbon | trend-st-21-3@m15c | 11 | 11 (100 %) | 65 | 82 % | 72.63 | 63.30 | tp1.6 sl4 tr0 h64 mn (5 · ∞ (no loss) · 7.00) |
| Minimal | sandwich | willr-28-90@m1c | 14 | 14 (100 %) | 168 | 74 % | 1.99 | 63.17 | tp1.4 sl4.2 tr1.05 h1440 mn (10 · ∞ (no loss) · 9.65) |
| Minimal | ribbon | ema-slope@m15c | 12 | 12 (100 %) | 36 | 78 % | 57.23 | 61.88 | – |
| Minimal | sandwich | bb-bounce-20-2.5@m1 | 16 | 14 (88 %) | 172 | 76 % | 1.76 | 61.73 | tp1.6 sl2.4 tr0 h960 mn (10 · 4.85 · 10.00) |
| Minimal | sandwich | z-20-2.5@m1 | 16 | 14 (88 %) | 172 | 76 % | 1.76 | 61.73 | tp1.6 sl2.4 tr0 h960 mn (10 · 4.85 · 10.00) |
| Minimal | magnet | willr-14-80@m1c | 2 | 2 (100 %) | 66 | 91 % | 4.24 | 61.42 | tp1.6 sl4.8 tr0 h1440 mn (32 · 4.20 · 32.00) |
| Minimal | revert | r-orb@m1 | 3 | 3 (100 %) | 90 | 74 % | 2.42 | 57.58 | tp1.6 sl4 tr0.8 h1440 mn (28 · 2.54 · 19.79) |
| Minimal | ribbon | break-don10@m1 | 9 | 9 (100 %) | 110 | 76 % | 1.80 | 56.55 | tp1.6 sl4.8 tr1.2 h1440 mn (9 · 2.72 · 8.60) |
| Minimal | sweep | willr-21-90@m30 | 8 | 8 (100 %) | 82 | 73 % | 3.25 | 52.66 | tp1.6 sl2.4 tr0.8 h32 mn (11 · 3.50 · 7.13) |
| Minimal | magnet | cci-40-100@m15c | 7 | 7 (100 %) | 112 | 74 % | 1.81 | 51.23 | tp1.6 sl3.2 tr1.2 h96 mn (14 · 1.98 · 9.99) |
| Minimal | ribbon | rsi-14-20-80@m5 | 11 | 11 (100 %) | 82 | 90 % | 15.93 | 50.84 | tp1 sl2.5 tr0 h288 mn (7 · ∞ (no loss) · 5.60) |
| Minimal | pivot | rsi-14-20-80@m5 | 11 | 11 (100 %) | 82 | 90 % | 15.93 | 50.84 | tp1 sl2.5 tr0 h288 mn (7 · ∞ (no loss) · 5.60) |
| Minimal | pivot | r-bb-adx-m@m1 | 10 | 10 (100 %) | 146 | 64 % | 1.83 | 50.71 | tp1.4 sl4.2 tr0.7 h960 mn (15 · 9.56 · 6.69) |
| Minimal | ribbon | willr-14-90@m1c | 5 | 5 (100 %) | 45 | 91 % | 96.94 | 50.23 | tp1.6 sl4 tr1.2 h960 mn (9 · 82.16 · 10.62) |
| Minimal | pivot | willr-14-90@m1c | 5 | 5 (100 %) | 45 | 91 % | 96.94 | 50.23 | tp1.6 sl4 tr1.2 h960 mn (9 · 82.16 · 10.62) |
| Minimal | follow | willr-14-95@m1c | 6 | 6 (100 %) | 101 | 76 % | 1.80 | 50.19 | tp1.4 sl4.2 tr1.05 h1440 mn (15 · 4.05 · 13.42) |
| Minimal | snap | willr-28-90@m1c | 14 | 14 (100 %) | 164 | 76 % | 1.78 | 49.77 | tp1.4 sl4.2 tr1.05 h1440 mn (10 · ∞ (no loss) · 7.91) |
| Minimal | follow | r-nr-break@m15c | 24 | 17 (71 %) | 216 | 69 % | 1.61 | 49.54 | tp1.2 sl3.6 tr0.9 h64 mn (9 · 5.63 · 5.76) |
| Minimal | ribbon | willr-28-95@m15c | 18 | 18 (100 %) | 54 | 89 % | 73.78 | 48.33 | – |
| Minimal | snap | r-fisher@m5 | 18 | 18 (100 %) | 54 | 93 % | 181.50 | 48.01 | – |
| Minimal | ribbon | mc-tz-25@m15 | 16 | 16 (100 %) | 48 | 88 % | 104.52 | 47.78 | – |
| Minimal | sweep | break-fail@m1c | 6 | 6 (100 %) | 54 | 89 % | 4.64 | 47.05 | tp1.6 sl4.8 tr1.2 h960 mn (9 · 137.28 · 9.13) |
| Minimal | sweep | willr-7-90@m5c | 43 | 37 (86 %) | 86 | 93 % | 55.95 | 45.24 | – |
| Minimal | ribbon | r-camarilla-m@m1 | 8 | 8 (100 %) | 40 | 75 % | 7.05 | 43.37 | tp1.2 sl3.6 tr0.6 h960 mn (5 · 150.59 · 6.85) |
| Minimal | revert | r-orb-m@m1 | 2 | 2 (100 %) | 54 | 70 % | 2.76 | 41.90 | tp1.6 sl3.2 tr0.8 h1440 mn (27 · 3.07 · 22.15) |
| Minimal | clamp | mfi-14-20@m15c | 70 | 54 (77 %) | 86 | 81 % | 2.14 | 39.20 | – |
| Minimal | follow | willr-21-80@m1c | 1 | 1 (100 %) | 62 | 71 % | 2.34 | 35.75 | tp1.6 sl4.8 tr1.2 h1440 mn (62 · 2.34 · 35.75) |
| Minimal | ribbon | mc-rsi2-10@m15c | 22 | 22 (100 %) | 44 | 82 % | 189.81 | 35.05 | – |
| Minimal | clamp | break-fail@m1c | 4 | 4 (100 %) | 58 | 86 % | 2.46 | 34.94 | tp1.4 sl2.8 tr1.05 h960 mn (15 · 2.51 · 9.07) |
| Minimal | ribbon | sar-fast@m5 | 2 | 2 (100 %) | 119 | 71 % | 1.56 | 34.93 | tp1.2 sl3.6 tr0.9 h288 mn (61 · 1.76 · 22.64) |
| Minimal | revert | r-engulf-m@m1 | 24 | 23 (96 %) | 223 | 68 % | 1.34 | 34.63 | tp1 sl2 tr0.5 h960 mn (10 · 2.30 · 3.48) |
| Minimal | follow | willr-21-95@m1c | 9 | 9 (100 %) | 153 | 69 % | 1.28 | 34.21 | tp1.6 sl3.2 tr1.2 h1440 mn (16 · 1.85 · 8.79) |
| Minimal | sandwich | r-pin@m1 | 2 | 2 (100 %) | 62 | 77 % | 2.44 | 33.86 | tp1.6 sl4.8 tr0.8 h1440 mn (31 · 2.70 · 18.08) |
| Minimal | ribbon | mc-tbbx-25@m15 | 5 | 5 (100 %) | 35 | 100 % | ∞ (no loss) | 33.44 | tp1.4 sl3.5 tr0 h64 mn (7 · ∞ (no loss) · 8.40) |
| Minimal | snap | bb-bounce-20-2.5@m1 | 11 | 9 (82 %) | 103 | 82 % | 1.62 | 32.52 | tp1.6 sl4 tr0 h960 mn (9 · 2.67 · 7.00) |
| Minimal | snap | z-20-2.5@m1 | 11 | 9 (82 %) | 103 | 82 % | 1.62 | 32.52 | tp1.6 sl4 tr0 h960 mn (9 · 2.67 · 7.00) |
| Minimal | clamp | mc-rsi4-15@m5 | 4 | 4 (100 %) | 86 | 81 % | 1.74 | 32.46 | tp1.4 sl4.2 tr0.7 h288 mn (21 · 2.08 · 9.79) |
| Minimal | follow | willr-28-90@m1c | 2 | 2 (100 %) | 63 | 86 % | 2.06 | 31.47 | tp1.4 sl4.2 tr1.05 h1440 mn (31 · 2.29 · 17.25) |
| Minimal | magnet | mc-rsi3-10@m5 | 7 | 6 (86 %) | 48 | 85 % | 3.22 | 31.38 | tp1.6 sl4.8 tr0 h192 mn (6 · ∞ (no loss) · 8.40) |
| Minimal | sweep | r-connors-m@m30 | 17 | 17 (100 %) | 34 | 82 % | 7.06 | 30.56 | – |
| Minimal | pulse | mc-rsit5-10@m5 | 2 | 2 (100 %) | 38 | 68 % | 3.42 | 30.55 | tp1.2 sl1.8 tr0.9 h192 mn (19 · 3.42 · 15.27) |
| Minimal | sweep | willr-28-90@m5c | 5 | 5 (100 %) | 49 | 86 % | 2.30 | 30.39 | tp1.4 sl4.2 tr0.7 h192 mn (11 · 2.42 · 6.40) |
| Minimal | snap | willr-7-90@m1c | 5 | 5 (100 %) | 27 | 89 % | 75.43 | 30.20 | tp1.6 sl4 tr0.8 h960 mn (6 · 41.57 · 6.74) |
| Minimal | sweep | willr-14-95@m1 | 5 | 5 (100 %) | 63 | 63 % | 2.59 | 29.43 | tp1.6 sl4.8 tr1.2 h1440 mn (11 · 1.64 · 6.43) |
| Minimal | magnet | cci-40-200@m15 | 7 | 7 (100 %) | 91 | 69 % | 1.44 | 29.18 | tp1.6 sl4 tr1.2 h96 mn (11 · 1.92 · 7.69) |
| Minimal | sweep | mc-rsi2-15@m5c | 7 | 7 (100 %) | 40 | 83 % | 3.21 | 28.92 | tp1.6 sl4.8 tr0 h192 mn (5 · ∞ (no loss) · 7.00) |
| Minimal | pulse | rsi-14-20-80@m5 | 11 | 11 (100 %) | 33 | 100 % | ∞ (no loss) | 28.80 | – |
| Minimal | magnet | mc-rsi4-15@m5c | 6 | 6 (100 %) | 21 | 86 % | 9.60 | 28.60 | – |
| Minimal | clamp | r-zdist@m15 | 14 | 14 (100 %) | 96 | 72 % | 1.70 | 28.28 | tp1.6 sl2.4 tr1.2 h96 mn (6 · 2.14 · 3.04) |
| Minimal | snap | rsi-div@m5 | 6 | 6 (100 %) | 24 | 96 % | 11.77 | 28.00 | – |
| Minimal | ribbon | willr-28-95@m15 | 8 | 8 (100 %) | 32 | 88 % | 6.67 | 27.89 | – |
| Minimal | magnet | break-fail@m15c | 6 | 6 (100 %) | 48 | 75 % | 1.95 | 27.37 | tp1.6 sl3.2 tr0.8 h64 mn (8 · 2.81 · 6.22) |
| Minimal | sandwich | squeeze-20@m1 | 5 | 5 (100 %) | 51 | 84 % | 2.01 | 26.61 | tp1.6 sl4.8 tr0 h1440 mn (10 · 2.52 · 7.60) |
| Minimal | pulse | willr-14-95@m5 | 6 | 6 (100 %) | 18 | 100 % | ∞ (no loss) | 26.53 | – |
| Minimal | pivot | willr-50-80@m1c | 2 | 2 (100 %) | 129 | 70 % | 1.26 | 26.38 | tp1.6 sl2.4 tr0 h1440 mn (64 · 1.28 · 13.60) |
| Minimal | ribbon | mfi-14-20@m15c | 12 | 12 (100 %) | 24 | 100 % | ∞ (no loss) | 26.17 | – |
| Minimal | pivot | mc-rsi4-20@m15c | 11 | 11 (100 %) | 113 | 65 % | 1.32 | 26.15 | tp1.2 sl3 tr0.9 h64 mn (11 · 1.59 · 3.81) |
| Minimal | snap | willr-50-80@m1c | 4 | 4 (100 %) | 179 | 71 % | 1.22 | 25.78 | tp1.4 sl2.8 tr0 h960 mn (43 · 1.42 · 11.78) |
| Minimal | magnet | willr-50-90@m1c | 22 | 18 (82 %) | 200 | 71 % | 1.17 | 25.60 | tp1 sl2.5 tr0.75 h960 mn (9 · 2.20 · 3.43) |
| Minimal | magnet | willr-14-90@m1c | 10 | 10 (100 %) | 40 | 75 % | 24.72 | 25.56 | tp1.2 sl1.8 tr0.6 h960 mn (5 · 6.80 · 1.37) |
| Minimal | revert | r-pdhl-m@m1 | 3 | 3 (100 %) | 34 | 88 % | 6.46 | 25.33 | tp1.6 sl4 tr0.8 h960 mn (12 · 514.56 · 10.16) |
| Minimal | sweep | mc-rsit9-15@m5 | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 25.04 | tp1.6 sl3.2 tr1.2 h192 mn (5 · ∞ (no loss) · 12.52) |
| Minimal | pivot | mc-rsi2-10@m15c | 18 | 18 (100 %) | 36 | 86 % | 214.13 | 24.73 | – |
| Minimal | snap | r-klinger-m@m1 | 4 | 4 (100 %) | 16 | 100 % | ∞ (no loss) | 24.31 | – |
| Minimal | ribbon | move-impulse-4-1.2@m5 | 2 | 2 (100 %) | 45 | 67 % | 1.75 | 23.94 | tp1.6 sl4.8 tr1.2 h192 mn (21 · 1.69 · 12.17) |
| Minimal | ribbon | macd-cross@m15 | 13 | 11 (85 %) | 102 | 80 % | 1.35 | 23.85 | tp1.6 sl4 tr0 h96 mn (7 · 2.00 · 4.20) |
| Minimal | sandwich | rsi-fast@m5 | 2 | 2 (100 %) | 32 | 84 % | 3.48 | 22.78 | tp1.4 sl4.2 tr1.05 h288 mn (16 · 3.99 · 13.50) |
| Minimal | sandwich | mc-rsi7-20@m5 | 2 | 2 (100 %) | 32 | 84 % | 3.48 | 22.78 | tp1.4 sl4.2 tr1.05 h288 mn (16 · 3.99 · 13.50) |
| Minimal | snap | rsi-fast@m5 | 2 | 2 (100 %) | 32 | 84 % | 3.48 | 22.78 | tp1.4 sl4.2 tr1.05 h288 mn (16 · 3.99 · 13.50) |
| Minimal | snap | mc-rsi7-20@m5 | 2 | 2 (100 %) | 32 | 84 % | 3.48 | 22.78 | tp1.4 sl4.2 tr1.05 h288 mn (16 · 3.99 · 13.50) |
| Minimal | sandwich | z-50-2.5@x4@m5 | 10 | 10 (100 %) | 77 | 83 % | 1.65 | 22.57 | tp1.4 sl4.2 tr0 h288 mn (6 · ∞ (no loss) · 7.20) |
| Minimal | snap | z-50-2.5@x4@m5 | 10 | 10 (100 %) | 77 | 83 % | 1.65 | 22.57 | tp1.4 sl4.2 tr0 h288 mn (6 · ∞ (no loss) · 7.20) |
| Minimal | snap | r-qh-flow@m1 | 16 | 12 (75 %) | 143 | 62 % | 1.27 | 22.56 | tp1.4 sl4.2 tr0.7 h1440 mn (8 · 1.90 · 4.07) |
| Minimal | magnet | r-bb-adx-m@m1 | 6 | 6 (100 %) | 54 | 70 % | 2.11 | 21.91 | tp1.4 sl4.2 tr0.7 h960 mn (9 · 26.49 · 5.37) |
| Minimal | ribbon | ema-slope@m15 | 6 | 6 (100 %) | 18 | 100 % | ∞ (no loss) | 21.60 | – |
| Minimal | pivot | break-squeeze-t25@m15 | 13 | 13 (100 %) | 26 | 69 % | 26.03 | 20.77 | – |
| Minimal | ribbon | r-valuearea-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 19.09 | – |
| Minimal | clamp | mc-rsi4-20@m5c | 2 | 2 (100 %) | 18 | 67 % | 3.03 | 19.07 | tp1.6 sl4 tr1.2 h288 mn (9 · 3.31 · 9.93) |
| Minimal | clamp | mc-rsi9-20@m5 | 4 | 4 (100 %) | 56 | 68 % | 1.68 | 18.40 | tp1.6 sl4 tr1.2 h288 mn (13 · 1.70 · 5.95) |
| Minimal | clamp | willr-50-95@m15 | 6 | 6 (100 %) | 24 | 83 % | 391.24 | 18.35 | – |
| Minimal | sandwich | mc-mturn-5@m5 | 4 | 4 (100 %) | 40 | 70 % | 1.94 | 18.24 | tp1.6 sl4 tr1.2 h192 mn (10 · 2.06 · 4.90) |
| Minimal | ribbon | willr-28-95@m5c | 6 | 6 (100 %) | 18 | 89 % | 64.77 | 16.88 | – |
| Minimal | pivot | willr-28-95@m5c | 6 | 6 (100 %) | 18 | 89 % | 64.77 | 16.88 | – |
| Minimal | sweep | mc-rsi2-20@m5c | 2 | 2 (100 %) | 32 | 75 % | 2.09 | 16.71 | tp1.4 sl3.5 tr1.05 h192 mn (16 · 2.09 · 8.35) |
| Minimal | clamp | mc-trsi2-10@m15c | 31 | 30 (97 %) | 31 | 97 % | 717.16 | 16.62 | – |
| Minimal | pivot | mc-trsi2-10@m15c | 31 | 30 (97 %) | 31 | 97 % | 717.16 | 16.62 | – |
| Minimal | clamp | mc-rsi3-15@m5c | 6 | 6 (100 %) | 24 | 50 % | 29.87 | 16.24 | – |
| Minimal | pivot | break-squeeze@m15 | 10 | 10 (100 %) | 20 | 70 % | 29.38 | 16.23 | – |
| Minimal | pivot | break-squeeze-t10@m15 | 10 | 10 (100 %) | 20 | 70 % | 29.38 | 16.23 | – |
| Minimal | follow | r-cvd-div@m1c | 29 | 15 (52 %) | 223 | 73 % | 1.09 | 16.16 | tp1.6 sl4 tr0 h1440 mn (7 · 2.00 · 4.20) |
| Minimal | revert | r-rsi2@m15c | 10 | 10 (100 %) | 60 | 80 % | 1.41 | 15.97 | tp1.6 sl3.2 tr0.8 h64 mn (6 · 1.69 · 2.34) |
| Minimal | ribbon | mc-rsi3-10@m15 | 11 | 11 (100 %) | 22 | 77 % | 138.06 | 15.90 | – |
| Minimal | pivot | hma-55@m1c | 2 | 2 (100 %) | 40 | 80 % | 2.63 | 15.84 | tp1.4 sl4.2 tr0.7 h960 mn (20 · 2.63 · 7.92) |
| Minimal | pulse | kama-20@m5c | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 14.80 | – |
| Minimal | magnet | r-camarilla@m5 | 3 | 3 (100 %) | 12 | 100 % | ∞ (no loss) | 14.09 | – |
| Minimal | magnet | trend-ema-20-50@m1 | 9 | 7 (78 %) | 108 | 62 % | 1.31 | 13.93 | tp1.2 sl1.8 tr0.9 h960 mn (12 · 1.71 · 4.40) |
| Minimal | snap | obv-50@m1c | 12 | 8 (67 %) | 136 | 63 % | 1.36 | 13.53 | tp1 sl2.5 tr0.75 h960 mn (10 · 2.09 · 3.16) |
| Minimal | follow | r-valuearea-m@m15c | 24 | 16 (67 %) | 24 | 67 % | 6.77 | 12.75 | – |
| Minimal | follow | willr-7-95@m1c | 1 | 1 (100 %) | 19 | 79 % | 2.50 | 12.71 | tp1.6 sl4 tr1.2 h1440 mn (19 · 2.50 · 12.71) |
| Minimal | snap | act-chop@m1 | 1 | 1 (100 %) | 10 | 80 % | 3.73 | 12.10 | tp1.4 sl4.2 tr1.05 h960 mn (10 · 3.73 · 12.10) |
| Minimal | snap | mc-rsit5-10@m5 | 1 | 1 (100 %) | 19 | 74 % | 3.55 | 12.06 | tp1.6 sl4 tr0.8 h288 mn (19 · 3.55 · 12.06) |
| Minimal | clamp | rsi-14-20-80@m5 | 7 | 7 (100 %) | 35 | 86 % | 2.75 | 11.93 | tp1.2 sl3.6 tr0.9 h288 mn (5 · 134.72 · 3.02) |
| Minimal | magnet | mc-rsi4-10@m5 | 4 | 4 (100 %) | 20 | 85 % | 2.04 | 11.45 | tp1.6 sl3.2 tr1.2 h192 mn (5 · ∞ (no loss) · 5.65) |
| Minimal | ribbon | mc-qburst-2@m5 | 4 | 4 (100 %) | 16 | 100 % | ∞ (no loss) | 11.20 | – |
| Minimal | sweep | willr-14-95@m30 | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 11.20 | – |
| Minimal | pivot | break-fail@m1c | 2 | 2 (100 %) | 36 | 83 % | 1.82 | 10.80 | tp1 sl2 tr0 h960 mn (18 · 1.82 · 5.40) |
| Minimal | ribbon | mc-trsi2-10@m15 | 25 | 25 (100 %) | 25 | 100 % | ∞ (no loss) | 10.45 | – |
| Minimal | pivot | willr-28-95@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 10.40 | – |
| Minimal | pivot | mc-z-25@m15c | 6 | 6 (100 %) | 60 | 80 % | 1.36 | 10.36 | tp1 sl2 tr0.75 h64 mn (10 · 1.50 · 2.18) |
| Minimal | ribbon | willr-50-90@m1c | 2 | 2 (100 %) | 30 | 73 % | 1.48 | 10.00 | tp1.6 sl2.4 tr0 h960 mn (15 · 1.48 · 5.00) |
| Minimal | pivot | bb-bounce-20-2.5@m15c | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 9.60 | – |
| Minimal | pivot | z-20-2.5@m15c | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 9.60 | – |
| Minimal | ribbon | mc-tpull-8@m5 | 18 | 16 (89 %) | 18 | 89 % | 1097.00 | 9.59 | – |
| Minimal | sweep | willr-28-95@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 9.41 | – |
| Minimal | sandwich | willr-14-90@m1c | 1 | 1 (100 %) | 8 | 88 % | 71.56 | 9.23 | tp1.6 sl4 tr1.2 h1440 mn (8 · 71.56 · 9.23) |
| Minimal | snap | willr-14-90@m1c | 1 | 1 (100 %) | 8 | 88 % | 71.56 | 9.23 | tp1.6 sl4 tr1.2 h1440 mn (8 · 71.56 · 9.23) |
| Minimal | clamp | willr-14-90@m1c | 1 | 1 (100 %) | 8 | 88 % | 71.56 | 9.23 | tp1.6 sl4 tr1.2 h1440 mn (8 · 71.56 · 9.23) |
| Minimal | magnet | r-vol-regime@m1 | 1 | 1 (100 %) | 15 | 80 % | 1.90 | 9.01 | tp1.6 sl4.8 tr1.2 h960 mn (15 · 1.90 · 9.01) |
| Minimal | clamp | mfi-14-10@m15 | 12 | 12 (100 %) | 40 | 60 % | 1.23 | 8.59 | – |
| Minimal | sandwich | kama-20@m5c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | clamp | mc-rsi2-10@m15 | 5 | 5 (100 %) | 10 | 90 % | 302.31 | 6.99 | – |
| Minimal | clamp | mc-rsi2-10@m15c | 5 | 5 (100 %) | 10 | 90 % | 302.31 | 6.99 | – |
| Minimal | sweep | willr-50-95@m15 | 2 | 2 (100 %) | 10 | 80 % | 2.07 | 6.41 | tp1.4 sl2.8 tr1.05 h64 mn (5 · 2.07 · 3.21) |
| Minimal | snap | r-pin-m@m1 | 3 | 3 (100 %) | 12 | 75 % | 1.52 | 6.23 | – |
| Minimal | snap | mc-mturn-5@m5 | 2 | 1 (50 %) | 11 | 82 % | 2.19 | 6.21 | tp1.6 sl4 tr0 h192 mn (5 · ∞ (no loss) · 7.00) |
| Minimal | ribbon | cci-14-200@x4@m1 | 3 | 3 (100 %) | 32 | 69 % | 1.39 | 6.16 | tp1.6 sl2.4 tr0 h1440 mn (10 · 2.15 · 6.00) |
| Minimal | clamp | cci-14-200@x4@m1 | 3 | 3 (100 %) | 32 | 69 % | 1.39 | 6.16 | tp1.6 sl2.4 tr0 h1440 mn (10 · 2.15 · 6.00) |
| Minimal | sandwich | mc-rsi3-15@m5c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 6.06 | – |
| Minimal | snap | mc-rsi3-15@m5c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 6.06 | – |
| Minimal | ribbon | dir-vwap@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 5.96 | – |
| Minimal | ribbon | dir-vwap@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 5.72 | – |
| Minimal | sandwich | mc-rsit9-15@m5 | 1 | 1 (100 %) | 12 | 67 % | 1.71 | 5.66 | tp1.6 sl2.4 tr1.2 h192 mn (12 · 1.71 · 5.66) |
| Minimal | snap | mc-rsit9-15@m5 | 1 | 1 (100 %) | 12 | 67 % | 1.71 | 5.66 | tp1.6 sl2.4 tr1.2 h192 mn (12 · 1.71 · 5.66) |
| Minimal | revert | r-engulf@m1 | 1 | 1 (100 %) | 15 | 80 % | 1.61 | 5.51 | tp1.4 sl2.8 tr0.7 h1440 mn (15 · 1.61 · 5.51) |
| Minimal | pulse | r-qh-flow-m@m1 | 11 | 6 (55 %) | 65 | 51 % | 1.07 | 5.48 | tp1.4 sl4.2 tr1.05 h1440 mn (5 · 2.06 · 4.67) |
| Minimal | clamp | mc-rsi4-15@m15 | 2 | 2 (100 %) | 10 | 80 % | 16.03 | 5.30 | tp1.2 sl3.6 tr0.6 h64 mn (5 · 16.03 · 2.65) |
| Minimal | sandwich | cci-14-200@x4@m1 | 3 | 3 (100 %) | 27 | 78 % | 1.33 | 5.14 | tp1.6 sl2.4 tr0 h1440 mn (9 · 1.88 · 4.60) |
| Minimal | sandwich | willr-28-80@m5c | 2 | 2 (100 %) | 38 | 68 % | 1.21 | 5.00 | tp1.4 sl2.1 tr1.05 h192 mn (19 · 1.21 · 2.50) |
| Minimal | ribbon | mc-rsi4-15@m5c | 2 | 2 (100 %) | 8 | 75 % | 99.97 | 4.48 | – |
| Minimal | pivot | mc-rsi4-15@m5c | 2 | 2 (100 %) | 8 | 75 % | 99.97 | 4.48 | – |
| Minimal | clamp | macd-hist-5-35-5@m1c | 1 | 1 (100 %) | 10 | 80 % | 1.65 | 4.40 | tp1.6 sl3.2 tr0 h960 mn (10 · 1.65 · 4.40) |
| Minimal | ribbon | r-camarilla@m1 | 2 | 2 (100 %) | 32 | 69 % | 1.19 | 4.34 | tp1.2 sl3.6 tr0.9 h960 mn (16 · 1.19 · 2.17) |
| Minimal | clamp | willr-28-90@m5c | 2 | 2 (100 %) | 28 | 64 % | 1.30 | 4.33 | tp1.6 sl3.2 tr0.8 h192 mn (14 · 1.30 · 2.17) |
| Minimal | magnet | r-sweep@m1 | 1 | 1 (100 %) | 8 | 75 % | 22.56 | 4.31 | tp1.4 sl4.2 tr1.05 h1440 mn (8 · 22.56 · 4.31) |
| Minimal | clamp | rsi-14-25-75@m5 | 1 | 1 (100 %) | 11 | 73 % | 1.42 | 4.25 | tp1.6 sl4.8 tr1.2 h288 mn (11 · 1.42 · 4.25) |
| Minimal | clamp | mc-rsi14-25@m5 | 1 | 1 (100 %) | 11 | 73 % | 1.42 | 4.25 | tp1.6 sl4.8 tr1.2 h288 mn (11 · 1.42 · 4.25) |
| Minimal | pulse | z-50-2.5@x4@m5 | 3 | 3 (100 %) | 21 | 81 % | 1.53 | 4.08 | tp1.2 sl3 tr0.6 h288 mn (7 · 1.71 · 2.40) |
| Minimal | magnet | r-fvg@m5 | 2 | 2 (100 %) | 12 | 50 % | 2.94 | 3.83 | tp1.6 sl4.8 tr0.8 h192 mn (6 · 2.94 · 1.92) |
| Minimal | sweep | r-elder-m@m1 | 6 | 6 (100 %) | 8 | 75 % | 10.30 | 3.58 | – |
| Minimal | pivot | mfi-14-20@m15c | 20 | 12 (60 %) | 28 | 71 % | 1.20 | 3.40 | – |
| Minimal | pulse | mc-rsi5-20@m5c | 2 | 2 (100 %) | 10 | 60 % | 6.26 | 3.38 | tp1 sl2 tr0.75 h192 mn (5 · 6.26 · 1.69) |
| Minimal | clamp | willr-28-90@m1c | 2 | 2 (100 %) | 28 | 79 % | 1.17 | 3.11 | tp1.4 sl2.8 tr1.05 h960 mn (14 · 1.17 · 1.55) |
| Minimal | snap | r-bb-adx@m1 | 1 | 1 (100 %) | 5 | 80 % | 2.15 | 2.99 | tp1.6 sl4.8 tr0 h960 mn (5 · 2.15 · 2.99) |
| Minimal | sandwich | mc-rsi5-10@m5 | 5 | 5 (100 %) | 25 | 76 % | 1.16 | 2.96 | tp1.6 sl3.2 tr0.8 h288 mn (5 · 1.25 · 0.84) |
| Minimal | snap | mc-rsi5-10@m5 | 5 | 5 (100 %) | 25 | 76 % | 1.16 | 2.96 | tp1.6 sl3.2 tr0.8 h288 mn (5 · 1.25 · 0.84) |
| Minimal | clamp | rsi-fast@m15 | 3 | 3 (100 %) | 17 | 82 % | 1.30 | 2.80 | tp1 sl2.5 tr0 h64 mn (6 · 1.48 · 1.30) |
| Minimal | clamp | mc-rsi7-20@m15 | 3 | 3 (100 %) | 17 | 82 % | 1.30 | 2.80 | tp1 sl2.5 tr0 h64 mn (6 · 1.48 · 1.30) |
| Minimal | ribbon | bb-wick@m1c | 2 | 2 (100 %) | 18 | 83 % | 1.23 | 2.71 | tp1.4 sl4.2 tr1.05 h960 mn (9 · 1.39 · 1.71) |
| Minimal | follow | r-td-m@m30 | 1 | 1 (100 %) | 5 | 80 % | 2.09 | 2.50 | tp1.4 sl2.1 tr1.05 h32 mn (5 · 2.09 · 2.50) |
| Minimal | sandwich | mc-rsi4-20@m5c | 2 | 1 (50 %) | 11 | 73 % | 1.72 | 2.43 | tp1.4 sl4.2 tr0.7 h288 mn (5 · 23.94 · 2.78) |
| Minimal | snap | mc-rsi4-20@m5c | 2 | 1 (50 %) | 11 | 73 % | 1.72 | 2.43 | tp1.4 sl4.2 tr0.7 h288 mn (5 · 23.94 · 2.78) |
| Minimal | magnet | mc-rsi9-15@m5 | 5 | 4 (80 %) | 13 | 69 % | 1.40 | 2.33 | – |
| Minimal | pulse | willr-28-80@m5c | 1 | 1 (100 %) | 16 | 69 % | 1.15 | 1.70 | tp1.4 sl2.1 tr0 h192 mn (16 · 1.15 · 1.70) |
| Minimal | clamp | mfi-14-10@m5 | 1 | 1 (100 %) | 12 | 67 % | 1.34 | 1.60 | tp1.4 sl4.2 tr1.05 h192 mn (12 · 1.34 · 1.60) |
| Minimal | pulse | mfi-14-10@m5 | 4 | 4 (100 %) | 20 | 80 % | 1.20 | 1.60 | tp0.8 sl1.6 tr0 h192 mn (5 · 1.33 · 0.60) |
| Minimal | ribbon | mc-rsi4-15@m15 | 9 | 5 (56 %) | 46 | 72 % | 1.02 | 0.72 | tp1.2 sl3.6 tr0 h96 mn (6 · 1.32 · 1.20) |
| Minimal | clamp | mc-iz-25@m15 | 1 | 1 (100 %) | 7 | 57 % | 1.10 | 0.52 | tp1.6 sl4.8 tr1.2 h96 mn (7 · 1.10 · 0.52) |
| Minimal | sandwich | r-zdist-m@m5 | 1 | 1 (100 %) | 8 | 63 % | 1.10 | 0.43 | tp1.6 sl4 tr0.8 h288 mn (8 · 1.10 · 0.43) |
| Minimal | snap | r-zdist-m@m5 | 1 | 1 (100 %) | 8 | 63 % | 1.10 | 0.43 | tp1.6 sl4 tr0.8 h288 mn (8 · 1.10 · 0.43) |
| Minimal | snap | r-klinger@m1 | 2 | 2 (100 %) | 14 | 71 % | 1.07 | 0.40 | tp0.8 sl1.2 tr0 h960 mn (7 · 1.07 · 0.20) |
| Minimal | pivot | move-cont@m15c | 2 | 0 (0 %) | 10 | 60 % | 0.98 | -0.06 | tp0.8 sl1.6 tr0.4 h64 mn (5 · 0.98 · -0.03) |
| Minimal | pulse | mc-rsi4-20@m5c | 2 | 0 (0 %) | 12 | 50 % | 0.93 | -0.27 | tp0.8 sl1.6 tr0.6 h192 mn (6 · 0.93 · -0.14) |
| Minimal | ribbon | ema-slope-10@m1 | 2 | 0 (0 %) | 18 | 67 % | 0.96 | -0.52 | tp1.4 sl2.8 tr0.7 h960 mn (9 · 0.96 · -0.26) |
| Minimal | sandwich | r-pin-m@m1 | 1 | 0 (0 %) | 10 | 50 % | 0.86 | -0.72 | tp1.4 sl4.2 tr0.7 h1440 mn (10 · 0.86 · -0.72) |
| Minimal | snap | ha-1@m5 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -1.17 | – |
| Minimal | follow | r-ultimate-m@m5 | 19 | 5 (26 %) | 14 | 36 % | 0.61 | -1.59 | – |
| Minimal | ribbon | break-atr-2@m5 | 9 | 3 (33 %) | 17 | 47 % | 0.69 | -1.60 | – |
| Minimal | pulse | kama-20@m5 | 4 | 0 (0 %) | 16 | 75 % | 0.74 | -5.20 | – |
| Minimal | pivot | break-atr-2@m5 | 9 | 1 (11 %) | 18 | 22 % | 0.03 | -9.08 | – |
| Minimal | pivot | mc-rsi4-15@m15c | 7 | 2 (29 %) | 20 | 55 % | 0.47 | -11.75 | tp1.2 sl3.6 tr0.6 h64 mn (5 · 2.79 · 1.17) |
| Minimal | pulse | kama-10@m5 | 32 | 4 (13 %) | 64 | 56 % | 0.78 | -13.41 | – |
| Minimal | sandwich | kama-10@m5 | 22 | 6 (27 %) | 44 | 64 % | 0.76 | -14.22 | – |
| Minimal | clamp | r-session-trend@m15 | 44 | 22 (50 %) | 44 | 50 % | 0.29 | -31.24 | – |
| Minimal | follow | squeeze-20@m5c | 23 | 0 (0 %) | 23 | 0 % | 0.00 | -73.40 | – |
| Short | ribbon | ema-slope@m15c | 80 | 80 (100 %) | 445 | 85 % | 7.53 | 662.78 | tp1.8 sl1.8 tr1.35 h64 sh (6 · ∞ (no loss) · 12.60) |
| Short | ribbon | ema-slope@m15 | 38 | 38 (100 %) | 208 | 87 % | 7.68 | 327.84 | tp1.8 sl1.8 tr1.35 h64 sh (6 · ∞ (no loss) · 12.60) |
| Short | pivot | willr-50-95@m15 | 27 | 27 (100 %) | 175 | 94 % | 17.74 | 284.78 | tp2.8 sl4.2 tr0 h64 sh (6 · ∞ (no loss) · 15.60) |
| Short | pivot | r-zdist@m15 | 23 | 23 (100 %) | 457 | 67 % | 1.76 | 264.59 | tp2.8 sl4.2 tr1.4 h96 sh (17 · 2.32 · 17.67) |
| Short | sweep | macd-cross-8-21-5@m15c | 27 | 26 (96 %) | 281 | 78 % | 2.33 | 263.76 | tp2.8 sl5.6 tr0 h96 sh (8 · ∞ (no loss) · 20.80) |
| Short | pivot | r-zdist@m15c | 28 | 28 (100 %) | 425 | 62 % | 1.65 | 241.49 | tp2.6 sl2.6 tr1.3 h96 sh (14 · 2.69 · 14.53) |
| Short | magnet | willr-50-90@m15c | 73 | 60 (82 %) | 165 | 82 % | 4.15 | 186.86 | – |
| Short | magnet | willr-50-80@m15c | 22 | 22 (100 %) | 263 | 70 % | 1.64 | 132.01 | tp2.6 sl5.2 tr1.95 h96 sh (10 · 2.25 · 13.69) |
| Short | ribbon | macd-cross@m15 | 22 | 17 (77 %) | 473 | 67 % | 1.34 | 120.20 | tp2 sl3 tr1 h96 sh (20 · 3.47 · 17.34) |
| Short | pivot | move-impulse-4-1.2@m15c | 65 | 65 (100 %) | 65 | 100 % | ∞ (no loss) | 117.88 | – |
| Short | sweep | willr-21-90@m30 | 9 | 9 (100 %) | 196 | 76 % | 2.08 | 116.24 | tp1.8 sl3.6 tr1.35 h48 sh (22 · 2.66 · 19.24) |
| Short | ribbon | willr-28-95@m15c | 9 | 9 (100 %) | 51 | 94 % | 242.00 | 110.03 | tp2.8 sl5.6 tr2.1 h64 sh (6 · ∞ (no loss) · 13.31) |
| Short | sweep | r-td@m30 | 61 | 49 (80 %) | 464 | 63 % | 1.23 | 106.67 | tp2.6 sl5.2 tr0 h32 sh (6 · 2.30 · 6.77) |
| Short | ribbon | willr-7-90@m30 | 20 | 20 (100 %) | 63 | 100 % | ∞ (no loss) | 104.24 | – |
| Short | ribbon | r-ultimate@m15c | 31 | 31 (100 %) | 62 | 100 % | ∞ (no loss) | 103.81 | – |
| Short | revert | r-awesome-m@m15c | 23 | 20 (87 %) | 132 | 76 % | 2.06 | 96.02 | tp2.4 sl4.8 tr1.8 h96 sh (5 · ∞ (no loss) · 10.01) |
| Short | pivot | break-squeeze@m30 | 32 | 30 (94 %) | 64 | 97 % | 20.74 | 94.76 | – |
| Short | ribbon | r-td@m30 | 6 | 6 (100 %) | 74 | 76 % | 3.60 | 92.08 | tp2.2 sl3.3 tr1.1 h48 sh (11 · 5.79 · 17.36) |
| Short | pivot | r-ultimate@m15c | 26 | 26 (100 %) | 52 | 100 % | ∞ (no loss) | 90.49 | – |
| Short | ribbon | trend-st-21-3@m15c | 21 | 20 (95 %) | 136 | 70 % | 2.18 | 88.39 | tp2.8 sl5.6 tr0 h96 sh (6 · ∞ (no loss) · 15.60) |
| Short | clamp | r-ultimate@m15 | 25 | 25 (100 %) | 148 | 76 % | 2.52 | 85.49 | tp2.2 sl3.3 tr1.65 h64 sh (6 · 26.97 · 6.83) |
| Short | follow | r-ultimate@m15c | 22 | 22 (100 %) | 44 | 100 % | ∞ (no loss) | 82.61 | – |
| Short | ribbon | trend-ema-50-200@m15c | 10 | 10 (100 %) | 260 | 74 % | 1.51 | 75.38 | tp2.8 sl5.6 tr1.4 h64 sh (23 · 1.96 · 12.01) |
| Short | sweep | willr-21-95@m15 | 6 | 6 (100 %) | 56 | 80 % | 2.87 | 74.32 | tp2.8 sl4.2 tr2.1 h64 sh (9 · 4.45 · 15.16) |
| Short | ribbon | trend-st@m15c | 9 | 9 (100 %) | 62 | 81 % | 2.95 | 71.83 | tp2.6 sl3.9 tr0 h96 sh (7 · 3.51 · 10.30) |
| Short | pivot | cci-40-200@m15c | 6 | 6 (100 %) | 132 | 62 % | 1.68 | 64.04 | tp1.8 sl2.7 tr1.35 h96 sh (20 · 2.58 · 14.48) |
| Short | clamp | z-50-2.5@m15c | 15 | 14 (93 %) | 117 | 71 % | 2.68 | 60.15 | tp1.8 sl2.7 tr0.9 h64 sh (8 · 150.31 · 5.51) |
| Short | sweep | r-bb-adx-m@m30 | 19 | 17 (89 %) | 57 | 86 % | 16.29 | 55.92 | – |
| Short | pivot | cci-20-200@m15c | 18 | 13 (72 %) | 304 | 55 % | 1.16 | 44.62 | tp1.8 sl3.6 tr1.35 h96 sh (15 · 1.77 · 9.01) |
| Short | ribbon | trend-st-14-4@m15 | 4 | 4 (100 %) | 73 | 73 % | 1.58 | 44.26 | tp2.8 sl5.6 tr0 h96 sh (17 · 2.09 · 19.00) |
| Short | ribbon | dir-vwap@m15c | 12 | 12 (100 %) | 24 | 100 % | ∞ (no loss) | 41.97 | – |
| Short | sweep | r-awesome-m@m30 | 3 | 3 (100 %) | 21 | 95 % | 1894.96 | 41.48 | tp2.6 sl3.9 tr0 h48 sh (7 · ∞ (no loss) · 16.80) |
| Short | ribbon | ema-slope-200@m15c | 2 | 2 (100 %) | 72 | 78 % | 2.18 | 35.46 | tp2.2 sl4.4 tr1.1 h64 sh (36 · 2.18 · 17.73) |
| Short | ribbon | dir-vwap@m15 | 20 | 20 (100 %) | 80 | 71 % | 1.62 | 33.93 | – |
| Short | ribbon | r-pin@m15 | 13 | 12 (92 %) | 56 | 77 % | 1.78 | 30.29 | tp2 sl3 tr1.5 h64 sh (5 · 1.67 · 2.17) |
| Short | pulse | trend-st-28-6@m15c | 34 | 22 (65 %) | 68 | 76 % | 1.59 | 29.86 | – |
| Short | sweep | r-sweep@m15 | 34 | 24 (71 %) | 335 | 70 % | 1.11 | 29.17 | tp2.8 sl5.6 tr0 h64 sh (9 · 1.57 · 6.60) |
| Short | magnet | bb-bounce@m15c | 6 | 4 (67 %) | 90 | 59 % | 1.27 | 26.20 | tp2.8 sl5.6 tr1.4 h96 sh (15 · 2.94 · 13.89) |
| Short | magnet | z-20-2@m15c | 6 | 4 (67 %) | 90 | 59 % | 1.27 | 26.20 | tp2.8 sl5.6 tr1.4 h96 sh (15 · 2.94 · 13.89) |
| Short | pivot | macd-cross-19-39-9@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 25.94 | – |
| Short | pivot | macd-cross@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 25.94 | – |
| Short | magnet | break-fail@m15c | 8 | 8 (100 %) | 92 | 70 % | 1.45 | 25.83 | tp1.8 sl3.6 tr0.9 h64 sh (11 · 2.61 · 6.78) |
| Short | sweep | willr-50-95@m15 | 3 | 3 (100 %) | 28 | 89 % | 2.71 | 25.71 | tp2.2 sl4.4 tr1.65 h96 sh (10 · 3.20 · 10.10) |
| Short | sweep | willr-14-95@m15 | 4 | 4 (100 %) | 26 | 77 % | 2.02 | 21.24 | tp2.8 sl4.2 tr2.1 h64 sh (6 · 2.39 · 6.11) |
| Short | follow | r-engulf-m@m30 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 20.80 | – |
| Short | pivot | mfi-14-10@m15 | 19 | 14 (74 %) | 76 | 58 % | 1.25 | 20.46 | tp2.2 sl2.2 tr0 h64 sh (5 · 1.25 · 1.20) |
| Short | ribbon | break-squeeze-t10@m30 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 20.00 | – |
| Short | sweep | r-fisher@m30 | 2 | 2 (100 %) | 14 | 79 % | 33.80 | 19.63 | tp2.8 sl5.6 tr2.1 h32 sh (6 · 43.30 · 10.30) |
| Short | ribbon | willr-50-95@m15 | 1 | 1 (100 %) | 11 | 100 % | ∞ (no loss) | 19.20 | tp2.4 sl4.8 tr1.8 h64 sh (11 · ∞ (no loss) · 19.20) |
| Short | sweep | act-chop@m30 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 18.30 | – |
| Short | magnet | r-zdist@m15 | 17 | 10 (59 %) | 199 | 57 % | 1.08 | 17.59 | tp2.4 sl2.4 tr1.2 h96 sh (11 · 1.98 · 7.67) |
| Short | revert | r-connors@m15c | 3 | 3 (100 %) | 20 | 90 % | 2.91 | 17.40 | tp2.4 sl4.8 tr1.8 h96 sh (6 · 2.47 · 7.33) |
| Short | sweep | willr-21-90@m15c | 1 | 1 (100 %) | 18 | 94 % | 4.40 | 17.01 | tp2.4 sl4.8 tr1.2 h96 sh (18 · 4.40 · 17.01) |
| Short | magnet | r-fakeout@m15 | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 16.00 | – |
| Short | sweep | willr-7-90@m30 | 1 | 1 (100 %) | 11 | 82 % | 56.12 | 15.86 | tp2.8 sl5.6 tr1.4 h48 sh (11 · 56.12 · 15.86) |
| Short | ribbon | trend-st-21-5@m15c | 2 | 2 (100 %) | 44 | 68 % | 1.39 | 14.38 | tp2.8 sl5.6 tr1.4 h64 sh (22 · 1.39 · 7.19) |
| Short | revert | break-vol-2@m15c | 9 | 6 (67 %) | 103 | 60 % | 1.14 | 13.82 | tp2.4 sl2.4 tr0 h96 sh (11 · 1.48 · 5.00) |
| Short | ribbon | macd-cross-19-39-9@m30 | 2 | 2 (100 %) | 16 | 88 % | 2.41 | 12.98 | tp2.2 sl4.4 tr1.1 h32 sh (8 · 2.41 · 6.49) |
| Short | revert | break-vol-2@m30 | 12 | 3 (25 %) | 134 | 57 % | 1.08 | 12.00 | tp2.4 sl4.8 tr1.2 h48 sh (10 · 4.81 · 11.99) |
| Short | magnet | rsi-21-30-70@m15 | 2 | 2 (100 %) | 12 | 67 % | 2.33 | 11.85 | tp2.8 sl2.8 tr0 h96 sh (5 · 3.47 · 7.40) |
| Short | follow | trend-st-35-7@m30 | 1 | 1 (100 %) | 15 | 80 % | 1.73 | 11.75 | tp2.6 sl5.2 tr1.95 h48 sh (15 · 1.73 · 11.75) |
| Short | sweep | willr-7-90@m15c | 2 | 2 (100 %) | 14 | 71 % | 1.76 | 11.18 | tp2.8 sl2.8 tr2.1 h96 sh (7 · 2.16 · 6.99) |
| Short | clamp | rsi-fast@m15c | 4 | 4 (100 %) | 20 | 80 % | 22.95 | 11.09 | tp2 sl2 tr1 h64 sh (5 · 22.95 · 2.77) |
| Short | follow | r-td-m@m30 | 2 | 2 (100 %) | 25 | 64 % | 1.93 | 10.96 | tp1.8 sl3.6 tr0.9 h48 sh (12 · 2.72 · 7.20) |
| Short | ribbon | willr-28-95@m15 | 1 | 1 (100 %) | 7 | 86 % | 2.98 | 10.37 | tp2.8 sl5.6 tr0 h64 sh (7 · 2.98 · 10.37) |
| Short | clamp | break-squeeze@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.00 | – |
| Short | pivot | macd-cross@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 8.41 | – |
| Short | pivot | break-squeeze-120@m15 | 8 | 8 (100 %) | 24 | 67 % | 1.50 | 8.36 | – |
| Short | ribbon | ha-3@m15 | 10 | 5 (50 %) | 110 | 59 % | 1.06 | 8.04 | tp2.8 sl5.6 tr0 h96 sh (6 · ∞ (no loss) · 15.60) |
| Short | sweep | r-bb-adx@m30 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 7.49 | – |
| Short | magnet | bb-mid@m15 | 2 | 1 (50 %) | 6 | 83 % | 2.33 | 7.20 | – |
| Short | revert | break-vol@x4@m30 | 2 | 2 (100 %) | 8 | 75 % | 1.87 | 6.98 | – |
| Short | magnet | rsi-fast@m15c | 2 | 2 (100 %) | 9 | 67 % | 2.06 | 6.81 | tp2.4 sl2.4 tr0 h64 sh (5 · 1.74 · 2.81) |
| Short | clamp | rsi-21-30-70@m30 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 6.48 | – |
| Short | follow | r-bb-adx@m30 | 6 | 3 (50 %) | 177 | 64 % | 1.03 | 5.84 | tp2.6 sl5.2 tr1.95 h48 sh (25 · 2.21 · 20.70) |
| Short | ribbon | move-swing@m15 | 5 | 3 (60 %) | 32 | 72 % | 1.26 | 4.96 | tp1.8 sl3.6 tr0.9 h96 sh (5 · ∞ (no loss) · 4.51) |
| Short | clamp | rsi-14-25-75@m15c | 2 | 2 (100 %) | 8 | 75 % | 20.16 | 4.84 | – |
| Short | ribbon | trix-9@m30 | 4 | 4 (100 %) | 12 | 67 % | 2.03 | 4.39 | – |
| Short | pivot | r-star@m15 | 9 | 3 (33 %) | 9 | 56 % | 1.55 | 4.06 | – |
| Short | sweep | r-bb-adx@m15 | 17 | 14 (82 %) | 17 | 82 % | 20.08 | 3.69 | – |
| Short | follow | r-fisher-m@m15c | 6 | 3 (50 %) | 9 | 67 % | 1.26 | 3.17 | – |
| Short | pivot | r-pin@m15 | 8 | 4 (50 %) | 32 | 75 % | 1.09 | 3.13 | – |
| Short | clamp | r-cvd-div-m@m15c | 5 | 2 (40 %) | 18 | 78 % | 1.26 | 3.12 | – |
| Short | clamp | rsi-14-25-75@m15 | 1 | 1 (100 %) | 5 | 80 % | 22.95 | 2.77 | tp2 sl2 tr1 h64 sh (5 · 22.95 · 2.77) |
| Short | revert | break-vol-2@x4@m15 | 1 | 1 (100 %) | 7 | 57 % | 1.07 | 0.64 | tp2.8 sl5.6 tr0 h64 sh (7 · 1.07 · 0.64) |
| Short | revert | r-pdhl@m15c | 1 | 1 (100 %) | 9 | 67 % | 1.05 | 0.61 | tp2.8 sl5.6 tr0 h64 sh (9 · 1.05 · 0.61) |
| Short | magnet | cci-40-200@m15c | 1 | 0 (0 %) | 10 | 70 % | 0.98 | -0.20 | tp1.8 sl3.6 tr0 h96 sh (10 · 0.98 · -0.20) |
| Short | pulse | trend-ema-50-200@m15 | 5 | 1 (20 %) | 10 | 60 % | 0.96 | -0.50 | – |
| Short | sweep | break-squeeze@m30 | 8 | 5 (63 %) | 56 | 68 % | 0.99 | -0.85 | tp2.8 sl5.6 tr0 h32 sh (7 · 1.12 · 1.40) |
| Short | ribbon | mfi-14-10@m15 | 2 | 0 (0 %) | 10 | 40 % | 0.86 | -1.85 | tp2 sl2 tr1.5 h64 sh (5 · 0.86 · -0.93) |
| Short | ribbon | ichi-cloud-20@m15c | 1 | 0 (0 %) | 12 | 67 % | 0.90 | -2.40 | tp2.8 sl5.6 tr0 h96 sh (12 · 0.90 · -2.40) |
| Short | ribbon | r-valuearea-m@m15 | 50 | 25 (50 %) | 95 | 42 % | 0.96 | -2.53 | – |
| Short | pulse | ema-slope-34@m15c | 10 | 4 (40 %) | 30 | 63 % | 0.91 | -3.50 | – |
| Short | sandwich | trend-st-14-4@m15c | 5 | 2 (40 %) | 15 | 67 % | 0.87 | -3.51 | – |
| Short | pivot | move-cont@m15c | 1 | 0 (0 %) | 6 | 50 % | 0.74 | -4.08 | tp2.8 sl5.6 tr2.1 h64 sh (6 · 0.74 · -4.08) |
| Short | pivot | move-cont@m15 | 1 | 0 (0 %) | 12 | 58 % | 0.84 | -4.46 | tp2.8 sl5.6 tr2.1 h64 sh (12 · 0.84 · -4.46) |
| Short | revert | r-klinger@m15c | 1 | 0 (0 %) | 11 | 55 % | 0.70 | -5.31 | tp2.8 sl4.2 tr2.1 h64 sh (11 · 0.70 · -5.31) |
| Short | pulse | break-don20@m15 | 16 | 7 (44 %) | 48 | 67 % | 0.92 | -5.39 | – |
| Short | sweep | break-squeeze-30@m30 | 2 | 0 (0 %) | 25 | 72 % | 0.84 | -5.89 | tp2.8 sl5.6 tr2.1 h32 sh (12 · 0.90 · -1.73) |
| Short | ribbon | trend-st-28-6@m15c | 3 | 1 (33 %) | 64 | 66 % | 0.90 | -6.82 | tp2 sl4 tr1.5 h96 sh (23 · 1.04 · 0.75) |
| Short | clamp | cci-40-200@x4@m15 | 4 | 0 (0 %) | 19 | 63 % | 0.59 | -7.14 | tp2 sl2 tr1 h64 sh (5 · 0.57 · -1.88) |
| Short | sandwich | ichi-tk-9@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.54 | -7.59 | – |
| Short | clamp | rsi-fast@m15 | 8 | 4 (50 %) | 61 | 62 % | 0.84 | -8.02 | tp1.8 sl3.6 tr0.9 h64 sh (8 · 1.28 · 1.08) |
| Short | ribbon | dir-vwap-240@m15c | 5 | 2 (40 %) | 193 | 69 % | 0.94 | -9.62 | tp2 sl4 tr1 h64 sh (41 · 1.02 · 0.60) |
| Short | pivot | kama-10@m15c | 3 | 0 (0 %) | 15 | 60 % | 0.66 | -10.60 | tp2.4 sl4.8 tr0 h96 sh (5 · 0.66 · -3.40) |
| Short | revert | break-vol@m30 | 2 | 0 (0 %) | 27 | 44 % | 0.66 | -13.00 | tp2 sl2 tr0 h48 sh (15 · 0.72 · -5.00) |
| Short | revert | break-vol-1.3@m15c | 4 | 1 (25 %) | 89 | 51 % | 0.84 | -14.01 | tp2 sl3 tr1 h96 sh (22 · 1.51 · 6.89) |
| Short | ribbon | r-star@m15 | 6 | 1 (17 %) | 27 | 70 % | 0.30 | -14.25 | tp1.8 sl3.6 tr0.9 h64 sh (5 · 0.55 · -1.70) |
| Short | ribbon | mfi-14-20@m15c | 11 | 3 (27 %) | 60 | 47 % | 0.75 | -15.79 | tp1.8 sl1.8 tr0.9 h64 sh (6 · 0.52 · -2.98) |
| Short | sweep | cci-20-200@m15 | 3 | 0 (0 %) | 40 | 48 % | 0.69 | -16.63 | tp2.4 sl2.4 tr1.8 h96 sh (13 · 0.69 · -4.88) |
| Short | sandwich | hma-55@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.22 | -16.80 | – |
| Short | pulse | break-don10@m15 | 37 | 15 (41 %) | 111 | 64 % | 0.90 | -16.99 | – |
| Short | magnet | bb-wick@m30 | 6 | 0 (0 %) | 18 | 22 % | 0.26 | -17.98 | – |
| Short | clamp | r-zdist@m15 | 45 | 21 (47 %) | 501 | 59 % | 0.96 | -18.04 | tp2.8 sl4.2 tr1.4 h96 sh (9 · 1.47 · 4.19) |
| Short | pivot | move-impulse-20-2.5@m15c | 1 | 0 (0 %) | 12 | 50 % | 0.44 | -19.61 | tp2.8 sl5.6 tr2.1 h64 sh (12 · 0.44 · -19.61) |
| Short | magnet | break-don10@m15c | 12 | 0 (0 %) | 34 | 62 % | 0.68 | -20.03 | – |
| Short | pivot | trend-st-14-4@m15 | 2 | 0 (0 %) | 80 | 65 % | 0.77 | -23.39 | tp2.8 sl4.2 tr1.4 h64 sh (41 · 0.80 · -9.80) |
| Short | clamp | mfi-14-10@m15 | 12 | 0 (0 %) | 30 | 40 % | 0.48 | -28.06 | – |
| Short | sandwich | aroon-25@m15 | 15 | 0 (0 %) | 30 | 50 % | 0.49 | -29.19 | – |
| Short | pivot | break-squeeze-t25@m15 | 8 | 1 (13 %) | 55 | 56 % | 0.53 | -29.76 | tp2.2 sl4.4 tr1.1 h96 sh (8 · 2.65 · 2.73) |
| Short | ribbon | break-squeeze-t25@m30 | 84 | 58 (69 %) | 84 | 69 % | 0.65 | -30.14 | – |
| Short | pivot | r-session-trend@m15 | 31 | 18 (58 %) | 31 | 58 % | 0.23 | -31.72 | – |
| Short | sweep | break-vol@x4@m15 | 15 | 0 (0 %) | 30 | 50 % | 0.37 | -35.03 | – |
| Short | pivot | r-sweep@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -37.58 | – |
| Short | clamp | break-retest@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.15 | -43.40 | – |
| Short | magnet | break-don20@m15 | 4 | 0 (0 %) | 21 | 43 % | 0.26 | -47.30 | tp2.6 sl5.2 tr0 h96 sh (6 · 0.44 · -9.00) |
| Short | clamp | ichi-cloud-20@m15c | 3 | 0 (0 %) | 61 | 56 % | 0.56 | -47.44 | tp2.6 sl5.2 tr1.3 h64 sh (19 · 0.62 · -12.49) |
| Short | clamp | cci-40-200@m15c | 16 | 2 (13 %) | 214 | 52 % | 0.77 | -48.16 | tp2.2 sl2.2 tr1.1 h96 sh (12 · 1.19 · 1.34) |
| Short | clamp | break-squeeze-t25@m15 | 6 | 0 (0 %) | 39 | 46 % | 0.34 | -50.93 | tp2 sl3 tr1 h96 sh (8 · 0.40 · -5.81) |
| Short | sweep | r-engulf@m30 | 6 | 0 (0 %) | 18 | 33 % | 0.22 | -52.80 | – |
| Short | pulse | ema-slope@m15c | 51 | 20 (39 %) | 204 | 58 % | 0.80 | -52.84 | – |
| Short | magnet | ema-stoch@m15c | 27 | 8 (30 %) | 171 | 58 % | 0.80 | -53.13 | tp2.8 sl5.6 tr2.1 h64 sh (5 · 1.56 · 3.25) |
| Short | ribbon | break-retest@m15 | 11 | 0 (0 %) | 11 | 0 % | 0.00 | -54.20 | – |
| Short | revert | r-chop-m@m15 | 21 | 3 (14 %) | 165 | 42 % | 0.80 | -58.93 | tp2.8 sl2.8 tr1.4 h96 sh (7 · 1.41 · 3.65) |
| Short | ribbon | r-chand-m@m15 | 5 | 0 (0 %) | 30 | 33 % | 0.30 | -59.71 | tp2.6 sl3.9 tr0 h64 sh (6 · 0.29 · -11.60) |
| Short | clamp | break-squeeze@m15 | 9 | 0 (0 %) | 56 | 36 % | 0.30 | -73.16 | tp2 sl2 tr1.5 h64 sh (6 · 0.41 · -5.20) |
| Short | ribbon | r-chand-m@m30 | 16 | 0 (0 %) | 47 | 21 % | 0.01 | -107.42 | – |
| Short | pivot | r-valuearea-m@m15 | 43 | 0 (0 %) | 43 | 0 % | 0.00 | -107.56 | – |
| Short | pivot | break-squeeze@m15 | 28 | 2 (7 %) | 170 | 51 % | 0.47 | -116.63 | tp2.2 sl4.4 tr1.1 h64 sh (6 · 2.87 · 2.76) |
| Short | revert | r-klinger-m@m15c | 47 | 11 (23 %) | 280 | 51 % | 0.70 | -117.24 | tp2.2 sl4.4 tr0 h64 sh (6 · 2.17 · 5.40) |
| Short | pivot | break-squeeze-30@m15 | 15 | 1 (7 %) | 106 | 44 % | 0.33 | -118.17 | tp2.2 sl4.4 tr1.1 h96 sh (6 · 2.87 · 2.76) |
| Short | sandwich | dir-vwap-120@m15 | 59 | 13 (22 %) | 236 | 58 % | 0.65 | -121.57 | – |
| Short | revert | break-vol-1.3@m30 | 11 | 0 (0 %) | 268 | 43 % | 0.63 | -130.97 | tp2.6 sl2.6 tr1.3 h48 sh (23 · 0.67 · -9.27) |
| Short | pulse | dir-vwap-120@m15 | 92 | 21 (23 %) | 368 | 59 % | 0.70 | -147.19 | – |
| Short | pivot | aroon-14@m15c | 16 | 0 (0 %) | 65 | 25 % | 0.15 | -197.10 | tp2.6 sl5.2 tr1.3 h64 sh (5 · 0.13 · -14.10) |
| Short | ribbon | macd-hist-19-39-9@m15c | 40 | 4 (10 %) | 151 | 42 % | 0.37 | -206.32 | tp2.2 sl3.3 tr1.1 h64 sh (5 · 0.20 · -6.32) |
| Short | clamp | r-zdist@m15c | 68 | 11 (16 %) | 489 | 49 % | 0.68 | -209.59 | tp2.8 sl5.6 tr1.4 h96 sh (5 · 46.12 · 6.21) |
| Short | pivot | break-squeeze-t10@m15 | 40 | 0 (0 %) | 243 | 42 % | 0.40 | -249.30 | tp1.8 sl1.8 tr1.35 h64 sh (6 · 0.74 · -1.54) |
| Short | clamp | aroon-14@m15c | 10 | 0 (0 %) | 52 | 2 % | 0.00 | -255.45 | tp2.4 sl4.8 tr1.2 h96 sh (6 · 0.00 · -10.40) |
| Short | clamp | break-squeeze-t10@m15 | 32 | 0 (0 %) | 204 | 35 % | 0.31 | -260.56 | tp2 sl2 tr1 h64 sh (7 · 0.41 · -5.18) |
| Short | follow | r-nr-break@m15c | 32 | 0 (0 %) | 441 | 51 % | 0.54 | -315.62 | tp2.8 sl5.6 tr1.4 h64 sh (14 · 0.90 · -1.57) |
| Short | pulse | move-impulse-20-2.5@m15 | 52 | 0 (0 %) | 260 | 26 % | 0.17 | -605.71 | tp2.2 sl2.2 tr1.65 h64 sh (5 · 0.28 · -5.19) |
| General | ribbon | ema-slope@m15c | 25 | 25 (100 %) | 118 | 78 % | 3.68 | 199.79 | tp4 sl4 tr2 h64 gn (5 · 3.61 · 10.95) |
| General | ribbon | ema-slope@m15 | 23 | 23 (100 %) | 107 | 77 % | 3.52 | 179.11 | tp4 sl4 tr2 h64 gn (5 · 3.61 · 10.95) |
| General | pivot | move-impulse-4-1.2@m15c | 39 | 39 (100 %) | 39 | 100 % | ∞ (no loss) | 129.74 | – |
| General | sweep | willr-21-95@m15 | 5 | 5 (100 %) | 47 | 74 % | 3.53 | 94.39 | tp3.2 sl3.2 tr2.4 h64 gn (10 · 2.89 · 19.27) |
| General | pivot | macd-cross@m15 | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 76.86 | – |
| General | pivot | r-zdist@m15c | 15 | 11 (73 %) | 212 | 56 % | 1.21 | 56.41 | tp3.6 sl3.6 tr2.7 h96 gn (13 · 1.91 · 13.97) |
| General | clamp | r-ultimate@m15 | 7 | 7 (100 %) | 41 | 63 % | 3.54 | 54.23 | tp3.2 sl3.2 tr1.6 h64 gn (6 · 47.05 · 8.55) |
| General | magnet | r-fvg-m@m15 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 43.22 | – |
| General | revert | r-stc@m15c | 6 | 6 (100 %) | 54 | 56 % | 1.55 | 37.54 | tp3.6 sl2.7 tr0 h64 gn (10 · 2.02 · 10.32) |
| General | revert | break-vol-2@m30 | 15 | 12 (80 %) | 151 | 52 % | 1.15 | 33.00 | tp4.4 sl4.4 tr2.2 h48 gn (8 · 3.39 · 11.00) |
| General | sweep | willr-7-90@m15c | 3 | 3 (100 %) | 21 | 71 % | 2.22 | 30.85 | tp3.2 sl3.2 tr2.4 h96 gn (7 · 3.12 · 14.44) |
| General | revert | r-klinger@m15c | 4 | 3 (75 %) | 39 | 59 % | 1.35 | 23.97 | tp4.4 sl3.3 tr0 h64 gn (10 · 1.80 · 11.20) |
| General | ribbon | trend-st@m15c | 2 | 2 (100 %) | 12 | 83 % | 3.63 | 21.06 | tp4.4 sl4.4 tr0 h96 gn (5 · 3.65 · 12.20) |
| General | sweep | willr-14-95@m15 | 2 | 2 (100 %) | 12 | 83 % | 3.24 | 20.63 | tp4.4 sl4.4 tr2.2 h64 gn (6 · 3.24 · 10.32) |
| General | pivot | r-zdist@m15 | 4 | 4 (100 %) | 72 | 64 % | 1.27 | 20.52 | tp3.6 sl3.6 tr1.8 h96 gn (17 · 1.65 · 9.93) |
| General | sweep | willr-21-95@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 16.03 | – |
| General | revert | r-awesome-m@m15c | 8 | 5 (63 %) | 42 | 60 % | 1.25 | 15.61 | tp4.4 sl3.3 tr0 h96 gn (5 · 1.80 · 5.60) |
| General | pivot | rsi-mid-60-40@m15 | 4 | 4 (100 %) | 12 | 67 % | 2.09 | 12.24 | – |
| General | ribbon | willr-28-95@m15 | 1 | 1 (100 %) | 5 | 80 % | 3.65 | 12.20 | tp4.4 sl4.4 tr0 h64 gn (5 · 3.65 · 12.20) |
| General | ribbon | dir-vwap@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 10.83 | – |
| General | ribbon | dir-thrust@m30 | 1 | 1 (100 %) | 10 | 60 % | 1.70 | 9.65 | tp4 sl4 tr3 h32 gn (10 · 1.70 · 9.65) |
| General | pivot | cci-40-200@m15c | 1 | 1 (100 %) | 21 | 62 % | 1.49 | 9.36 | tp3.2 sl3.2 tr1.6 h64 gn (21 · 1.49 · 9.36) |
| General | ribbon | willr-7-90@m30 | 5 | 2 (40 %) | 5 | 60 % | 26.96 | 7.40 | – |
| General | pivot | willr-50-95@m15 | 1 | 1 (100 %) | 7 | 86 % | 3.16 | 7.33 | tp3.2 sl3.2 tr1.6 h96 gn (7 · 3.16 · 7.33) |
| General | revert | break-vol-2@m15c | 1 | 1 (100 %) | 9 | 56 % | 1.47 | 5.40 | tp3.6 sl2.7 tr0 h96 gn (9 · 1.47 · 5.40) |
| General | pulse | dir-vwap-120@m15 | 10 | 7 (70 %) | 40 | 55 % | 1.05 | 2.80 | – |
| General | ribbon | dir-vwap@m15 | 2 | 2 (100 %) | 8 | 75 % | 1.34 | 2.34 | – |
| General | ribbon | r-pin@m15 | 4 | 3 (75 %) | 14 | 71 % | 1.15 | 2.12 | – |
| General | sandwich | dir-vwap-120@m15 | 3 | 3 (100 %) | 12 | 58 % | 1.12 | 1.79 | – |
| General | magnet | break-don10@m15c | 2 | 1 (50 %) | 6 | 50 % | 1.17 | 1.72 | – |
| General | pulse | break-don10@m15 | 2 | 2 (100 %) | 6 | 67 % | 1.19 | 1.39 | – |
| General | pulse | ema-slope@m15c | 8 | 5 (63 %) | 32 | 53 % | 0.97 | -1.35 | – |
| General | revert | r-chop-m@m15 | 7 | 4 (57 %) | 60 | 43 % | 0.99 | -1.38 | tp3.6 sl2.7 tr0 h96 gn (8 · 1.17 · 2.00) |
| General | sweep | r-sweep@m15 | 1 | 0 (0 %) | 7 | 43 % | 0.90 | -1.40 | tp4.4 sl3.3 tr0 h64 gn (7 · 0.90 · -1.40) |
| General | ribbon | macd-hist-19-39-9@m15c | 4 | 2 (50 %) | 14 | 29 % | 0.78 | -7.09 | – |
| General | magnet | ema-stoch@m15c | 1 | 0 (0 %) | 7 | 43 % | 0.41 | -8.08 | tp3.2 sl3.2 tr1.6 h64 gn (7 · 0.41 · -8.08) |
| General | pivot | r-session-trend@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -12.83 | – |
| General | clamp | r-zdist@m15 | 4 | 0 (0 %) | 41 | 54 % | 0.75 | -12.91 | tp3.2 sl3.2 tr0 h64 gn (10 · 0.86 · -1.92) |
| General | pivot | break-don10@m15c | 3 | 0 (0 %) | 9 | 33 % | 0.46 | -14.04 | – |
| General | clamp | cci-40-200@x4@m15 | 6 | 1 (17 %) | 26 | 38 % | 0.59 | -16.78 | tp3.6 sl3.6 tr2.7 h64 gn (5 · 1.00 · 0.01) |
| General | pivot | break-squeeze-t25@m15 | 2 | 0 (0 %) | 12 | 33 % | 0.33 | -17.03 | tp4 sl4 tr2 h64 gn (6 · 0.33 · -8.52) |
| General | pivot | aroon-14@m15c | 2 | 0 (0 %) | 8 | 25 % | 0.20 | -19.12 | – |
| General | revert | break-vol-1.3@m15c | 2 | 0 (0 %) | 43 | 47 % | 0.67 | -19.43 | tp3.2 sl3.2 tr2.4 h64 gn (22 · 0.81 · -5.99) |
| General | pivot | break-squeeze-t10@m15 | 2 | 0 (0 %) | 12 | 33 % | 0.25 | -25.16 | tp4 sl4 tr2 h64 gn (6 · 0.25 · -12.58) |
| General | pivot | break-squeeze@m30 | 18 | 10 (56 %) | 36 | 39 % | 0.42 | -28.26 | – |
| General | magnet | bb-wick@m30 | 5 | 0 (0 %) | 15 | 0 % | 0.00 | -30.60 | – |
| General | revert | break-vol-1.3@m30 | 5 | 0 (0 %) | 106 | 43 % | 0.79 | -34.14 | tp3.2 sl2.4 tr0 h48 gn (22 · 0.96 · -1.20) |
| General | magnet | break-don20@m15 | 4 | 0 (0 %) | 18 | 28 % | 0.36 | -35.88 | tp4.4 sl4.4 tr2.2 h96 gn (5 · 0.55 · -6.23) |
| General | pulse | move-impulse-20-2.5@m15 | 5 | 0 (0 %) | 25 | 24 % | 0.29 | -39.01 | tp3.2 sl3.2 tr1.6 h96 gn (5 · 0.30 · -7.13) |
| General | revert | break-vol@m30 | 6 | 0 (0 %) | 72 | 36 % | 0.67 | -42.25 | tp3.2 sl2.4 tr0 h48 gn (12 · 0.82 · -3.20) |
| General | pivot | trend-st-14-4@m15 | 3 | 0 (0 %) | 97 | 49 % | 0.70 | -44.55 | tp3.6 sl3.6 tr1.8 h64 gn (36 · 0.75 · -11.49) |
| General | pivot | r-valuearea-m@m15 | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -48.90 | – |
| General | ribbon | break-squeeze-t25@m30 | 21 | 4 (19 %) | 21 | 19 % | 0.01 | -57.46 | – |
| General | follow | r-nr-break@m15c | 3 | 0 (0 %) | 38 | 39 % | 0.26 | -62.04 | tp3.6 sl3.6 tr1.8 h64 gn (13 · 0.33 · -15.33) |
| General | revert | r-klinger-m@m15c | 19 | 1 (5 %) | 95 | 36 % | 0.57 | -86.34 | tp3.6 sl3.6 tr1.8 h64 gn (5 · 0.87 · -0.98) |
| General | clamp | r-zdist@m15c | 18 | 0 (0 %) | 119 | 37 % | 0.45 | -122.10 | tp3.6 sl3.6 tr2.7 h96 gn (6 · 0.87 · -1.44) |
| Long | ribbon | willr-28-95@m15c | 33 | 33 (100 %) | 79 | 97 % | 1022.48 | 310.27 | – |
| Long | pivot | willr-50-95@m15 | 25 | 25 (100 %) | 90 | 89 % | 51.27 | 256.68 | tp6.4 sl6.4 tr3.2 h64 lg (5 · 78.71 · 6.51) |
| Long | pivot | move-impulse-4-1.2@m15c | 48 | 48 (100 %) | 48 | 100 % | ∞ (no loss) | 224.61 | – |
| Long | revert | r-awesome-m@m15c | 27 | 27 (100 %) | 85 | 73 % | 3.71 | 220.21 | tp5.2 sl3.9 tr0 h64 lg (5 · 1.83 · 6.21) |
| Long | magnet | willr-50-90@m15c | 11 | 11 (100 %) | 19 | 100 % | ∞ (no loss) | 118.31 | – |
| Long | ribbon | willr-28-95@m15 | 17 | 13 (76 %) | 56 | 71 % | 2.40 | 113.85 | tp5.2 sl5.2 tr0 h64 lg (5 · 3.83 · 14.77) |
| Long | revert | r-inside-m@m30 | 15 | 15 (100 %) | 128 | 66 % | 1.45 | 109.46 | tp6.4 sl4.8 tr0 h32 lg (9 · 2.11 · 16.58) |
| Long | ribbon | dir-vwap@m15c | 10 | 10 (100 %) | 20 | 100 % | ∞ (no loss) | 94.95 | – |
| Long | magnet | r-fvg-m@m15 | 11 | 11 (100 %) | 20 | 100 % | ∞ (no loss) | 94.68 | – |
| Long | pivot | macd-cross@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 92.71 | – |
| Long | ribbon | r-td@m30 | 6 | 6 (100 %) | 48 | 58 % | 1.89 | 71.61 | tp5.6 sl5.6 tr0 h32 lg (7 · 3.45 · 19.18) |
| Long | pivot | macd-cross@m30 | 11 | 11 (100 %) | 11 | 100 % | ∞ (no loss) | 70.49 | – |
| Long | ribbon | dir-vwap@m15 | 5 | 5 (100 %) | 14 | 100 % | ∞ (no loss) | 69.46 | – |
| Long | ribbon | willr-50-95@m15 | 6 | 6 (100 %) | 24 | 88 % | 157.99 | 66.42 | tp6.4 sl6.4 tr3.2 h96 lg (7 · 27.39 · 9.41) |
| Long | pivot | macd-cross-19-39-9@m30 | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 59.29 | – |
| Long | revert | break-vol-2@m30 | 5 | 5 (100 %) | 49 | 53 % | 1.89 | 56.21 | tp4.8 sl4.8 tr0 h48 lg (7 · 5.52 · 22.60) |
| Long | pivot | r-zdist@m15c | 3 | 3 (100 %) | 31 | 65 % | 2.38 | 53.38 | tp6 sl6 tr3 h96 lg (7 · 5.49 · 27.84) |
| Long | revert | r-klinger@m15c | 10 | 9 (90 %) | 94 | 53 % | 1.24 | 50.29 | tp6 sl3 tr0 h64 lg (10 · 1.81 · 13.00) |
| Long | ribbon | ha-1@m15c | 3 | 3 (100 %) | 8 | 100 % | ∞ (no loss) | 38.40 | – |
| Long | ribbon | willr-14-90@m30 | 10 | 10 (100 %) | 26 | 62 % | 1.97 | 35.19 | tp5.6 sl5.6 tr2.8 h48 lg (5 · 1.34 · 2.04) |
| Long | sweep | willr-14-95@m15 | 2 | 2 (100 %) | 12 | 83 % | 3.25 | 22.48 | tp4.8 sl4.8 tr2.4 h64 lg (6 · 3.25 · 11.24) |
| Long | ribbon | trend-st-21-5@m15 | 3 | 2 (67 %) | 49 | 63 % | 1.18 | 19.52 | tp6.4 sl6.4 tr0 h64 lg (18 · 1.35 · 13.37) |
| Long | clamp | r-zdist@m15c | 6 | 3 (50 %) | 30 | 53 % | 1.34 | 17.19 | tp4.8 sl4.8 tr2.4 h96 lg (5 · 1.06 · 0.58) |
| Long | clamp | willr-14-90@m15 | 1 | 1 (100 %) | 7 | 71 % | 2.81 | 16.04 | tp6.4 sl6.4 tr0 h64 lg (7 · 2.81 · 16.04) |
| Long | sweep | willr-7-90@m15c | 1 | 1 (100 %) | 7 | 71 % | 2.28 | 12.84 | tp4.8 sl4.8 tr2.4 h96 lg (7 · 2.28 · 12.84) |
| Long | ribbon | ema-slope@m15 | 2 | 2 (100 %) | 10 | 80 % | 2.10 | 11.93 | tp5.2 sl5.2 tr2.6 h64 lg (5 · 2.10 · 5.96) |
| Long | follow | break-vol-2@x4@m15c | 3 | 3 (100 %) | 6 | 83 % | 46.99 | 10.39 | – |
| Long | ribbon | ha-3@m15 | 5 | 3 (60 %) | 28 | 46 % | 1.17 | 9.24 | tp6 sl6 tr0 h64 lg (6 · 1.55 · 4.47) |
| Long | pivot | rsi-mid-60-40@m15 | 3 | 3 (100 %) | 9 | 67 % | 1.74 | 9.08 | – |
| Long | ribbon | trend-st@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.84 | 7.40 | tp5.6 sl4.2 tr0 h96 lg (5 · 1.84 · 7.40) |
| Long | ribbon | ema-slope@m15c | 1 | 1 (100 %) | 5 | 80 % | 2.10 | 5.96 | tp5.2 sl5.2 tr2.6 h64 lg (5 · 2.10 · 5.96) |
| Long | revert | r-stc@m15c | 1 | 1 (100 %) | 8 | 50 % | 1.44 | 5.62 | tp4.8 sl3.6 tr0 h64 lg (8 · 1.44 · 5.62) |
| Long | clamp | srsi-14-10@m30 | 2 | 1 (50 %) | 6 | 33 % | 1.44 | 3.79 | tp6.4 sl6.4 tr0 h32 lg (5 · 0.72 · -2.41) |
| Long | ribbon | ema-slope-200@m15c | 1 | 1 (100 %) | 15 | 53 % | 1.07 | 3.40 | tp6.4 sl6.4 tr0 h96 lg (15 · 1.07 · 3.40) |
| Long | revert | break-vol-2@x4@m15 | 1 | 1 (100 %) | 7 | 57 % | 1.19 | 1.84 | tp5.6 sl5.6 tr2.8 h64 lg (7 · 1.19 · 1.84) |
| Long | revert | r-tsi-m@m15c | 1 | 1 (100 %) | 8 | 38 % | 1.09 | 1.60 | tp6.4 sl3.2 tr0 h96 lg (8 · 1.09 · 1.60) |
| Long | magnet | break-don10@m15c | 6 | 2 (33 %) | 14 | 43 % | 0.95 | -1.49 | – |
| Long | follow | r-fvg-m@m30 | 2 | 0 (0 %) | 8 | 75 % | 0.84 | -2.07 | – |
| Long | sweep | r-bb-adx-m@m30 | 8 | 6 (75 %) | 8 | 75 % | 0.09 | -7.72 | – |
| Long | sweep | act-chop@m30 | 8 | 2 (25 %) | 5 | 40 % | 0.49 | -7.92 | – |
| Long | magnet | dir-macd@m15c | 1 | 0 (0 %) | 5 | 40 % | 0.49 | -8.23 | tp5.2 sl5.2 tr2.6 h64 lg (5 · 0.49 · -8.23) |
| Long | pivot | move-cont@m15 | 3 | 0 (0 %) | 31 | 48 % | 0.89 | -10.15 | tp6 sl6 tr0 h96 lg (10 · 0.94 · -2.00) |
| Long | revert | break-vol-1.3@m30 | 1 | 0 (0 %) | 21 | 29 % | 0.73 | -10.44 | tp4.8 sl2.4 tr0 h32 lg (21 · 0.73 · -10.44) |
| Long | ribbon | act-hf-5@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.60 | -11.40 | – |
| Long | ribbon | ichi-cloud-20@m15c | 1 | 0 (0 %) | 10 | 50 % | 0.41 | -14.58 | tp6 sl6 tr4.5 h96 lg (10 · 0.41 · -14.58) |
| Long | revert | r-klinger-m@m15c | 13 | 4 (31 %) | 53 | 45 % | 0.89 | -14.90 | tp4.8 sl3.6 tr0 h64 lg (5 · 0.81 · -2.20) |
| Long | pivot | trend-st-14-2@m15c | 1 | 0 (0 %) | 12 | 42 % | 0.59 | -15.84 | tp5.6 sl5.6 tr0 h64 lg (12 · 0.59 · -15.84) |
| Long | pivot | trend-st-14-2@m15 | 1 | 0 (0 %) | 12 | 42 % | 0.57 | -17.49 | tp5.6 sl5.6 tr0 h64 lg (12 · 0.57 · -17.49) |
| Long | pivot | trend-st-14-4@m15 | 1 | 0 (0 %) | 25 | 40 % | 0.71 | -18.02 | tp5.2 sl3.9 tr0 h64 lg (25 · 0.71 · -18.02) |
| Long | ribbon | trend-st-28-6@m15c | 2 | 0 (0 %) | 17 | 41 % | 0.65 | -22.20 | tp6 sl6 tr0 h96 lg (9 · 0.75 · -7.80) |
| Long | magnet | bb-wick@m30 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -25.20 | – |
| Long | sweep | r-engulf@m30 | 4 | 0 (0 %) | 12 | 33 % | 0.47 | -25.60 | – |
| Long | ribbon | r-sweep-m@m15 | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -29.10 | – |
| Long | ribbon | dir-vwap-240@m15c | 7 | 1 (14 %) | 132 | 58 % | 0.88 | -36.52 | tp6.4 sl6.4 tr3.2 h96 lg (20 · 1.01 · 0.41) |
| Long | pivot | kelt-20-2.5@m15 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -37.20 | – |
| Long | pivot | break-squeeze@m15 | 3 | 0 (0 %) | 16 | 31 % | 0.28 | -37.42 | tp4.8 sl4.8 tr0 h64 lg (5 · 0.34 · -9.97) |
| Long | ribbon | r-linreg-m@m15c | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -38.80 | – |
| Long | pivot | break-don10@m15c | 8 | 0 (0 %) | 24 | 33 % | 0.53 | -39.60 | – |
| Long | ribbon | trend-ema-50-200@m15c | 7 | 0 (0 %) | 109 | 58 % | 0.77 | -57.40 | tp6 sl6 tr0 h96 lg (14 · 0.94 · -2.80) |
| Long | ribbon | r-chand-m@m30 | 12 | 0 (0 %) | 23 | 4 % | 0.00 | -61.78 | – |
| Long | clamp | aroon-14@m15c | 3 | 0 (0 %) | 13 | 0 % | 0.00 | -73.80 | tp5.2 sl5.2 tr3.9 h96 lg (5 · 0.00 · -27.00) |
| Long | sweep | r-sweep@m15 | 9 | 0 (0 %) | 56 | 45 % | 0.37 | -88.93 | tp6 sl6 tr3 h64 lg (8 · 0.53 · -5.88) |
| Long | pivot | r-sweep@m15 | 21 | 0 (0 %) | 18 | 0 % | 0.00 | -89.46 | – |
| Long | ribbon | break-retest@m15 | 17 | 0 (0 %) | 17 | 0 % | 0.00 | -96.70 | – |
| Long | magnet | break-don20@m15 | 13 | 1 (8 %) | 56 | 32 % | 0.39 | -114.59 | tp4.8 sl4.8 tr2.4 h64 lg (5 · 0.48 · -7.85) |
| Long | pivot | r-valuearea-m@m15 | 35 | 0 (0 %) | 35 | 0 % | 0.00 | -174.40 | – |
| Long | pivot | aroon-14@m15c | 12 | 0 (0 %) | 39 | 15 % | 0.03 | -188.45 | – |
| Long | ribbon | break-squeeze-t25@m30 | 40 | 0 (0 %) | 40 | 0 % | 0.00 | -206.10 | – |
| Wide | pivot | break-atr-2@m5 | 6 | 3 (50 %) | 42 | 57 % | 1.72 | 24.37 | tp0.76 sl0.68 tr0 h96 ax-geo4 axis (7 · 5.04 · 18.53) |
| Wide | ribbon | r-ultimate@m15c | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 21.30 | – |
| Wide | revert | r-spring-m@m30 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 18.44 | – |
| Wide | magnet | mc-rsit4-25@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 13.07 | – |
| Wide | ribbon | move-cont@m1 | 2 | 2 (100 %) | 18 | 67 % | 3.24 | 12.24 | tp0.64 sl0.54 tr0 h480 axd-geo3 axis (9 · 3.52 · 6.34) |
| Wide | follow | r-ultimate@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 11.76 | – |
| Wide | sweep | willr-28-95@m5c | 9 | 9 (100 %) | 18 | 50 % | 2.40 | 10.37 | – |
| Wide | ribbon | mc-macdh@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.17 | – |
| Wide | sweep | willr-50-95@m5c | 9 | 9 (100 %) | 42 | 29 % | 1.46 | 9.21 | tp0.76 sl0.68 tr0 h96 ax-fib2 axis (5 · 1.60 · 1.10) |
| Wide | revert | break-vol-2@m5c | 3 | 3 (100 %) | 6 | 50 % | 3.68 | 8.65 | – |
| Wide | follow | r-cvd-div@m1c | 2 | 2 (100 %) | 34 | 47 % | 1.58 | 8.09 | tp0.64 sl0.54 tr0 h480 axd-geo3 axis (17 · 1.77 · 5.60) |
| Wide | pivot | mfi-14-20@m15c | 5 | 5 (100 %) | 10 | 50 % | 1.91 | 7.04 | – |
| Wide | ribbon | mc-lag-6@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.80 | – |
| Wide | magnet | rsi-mid-60-40@m1 | 3 | 3 (100 %) | 51 | 59 % | 1.23 | 6.61 | tp0.64 sl0.54 tr0 h480 ax-linear2 axis (17 · 1.23 · 2.20) |
| Wide | ribbon | r-pin@m15 | 3 | 3 (100 %) | 12 | 75 % | 3.20 | 6.22 | – |
| Wide | magnet | r-sweep-m@m5 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 6.06 | – |
| Wide | clamp | r-sweep-m@m5 | 3 | 3 (100 %) | 18 | 67 % | 2.33 | 5.10 | tp0.76 sl0.68 tr0 h96 ax-geo2 axis (6 · 2.33 · 1.70) |
| Wide | pivot | r-camarilla@m15c | 6 | 6 (100 %) | 12 | 50 % | 1.75 | 4.53 | – |
| Wide | magnet | rsi-fast@m1c | 19 | 5 (26 %) | 133 | 45 % | 1.04 | 1.88 | tp0.64 sl0.54 tr0 h480 axd-geo3 axis (7 · 1.51 · 1.61) |
| Wide | magnet | r-sweep@m5 | 1 | 1 (100 %) | 5 | 60 % | 1.81 | 1.81 | tp0.76 sl0.68 tr0 h96 axd-atr2 axis (5 · 1.81 · 1.81) |
| Wide | pulse | r-choch-m@m1 | 3 | 1 (33 %) | 21 | 29 % | 1.07 | 0.50 | tp0.64 sl0.54 tr0 h480 axd-volume2h axis (7 · 1.52 · 0.83) |
| Wide | magnet | mc-rsit14-30@m15 | 3 | 3 (100 %) | 18 | 50 % | 1.01 | 0.09 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (6 · 1.01 · 0.03) |
| Wide | clamp | r-cvd-div@m1c | 3 | 0 (0 %) | 21 | 43 % | 0.96 | -0.30 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (7 · 0.96 · -0.10) |
| Wide | pulse | trend-ema-20-50@m5 | 3 | 0 (0 %) | 12 | 50 % | 0.90 | -0.38 | – |
| Wide | sandwich | sar-0.03@m5 | 3 | 0 (0 %) | 6 | 50 % | 0.75 | -1.18 | – |
| Wide | pulse | trend-ema-20-50@m5c | 3 | 0 (0 %) | 9 | 33 % | 0.44 | -2.06 | – |
| Wide | sandwich | dir-vwap-120@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.55 | -2.63 | – |
| Wide | pivot | mfi-14-10@m15 | 3 | 0 (0 %) | 12 | 50 % | 0.69 | -2.79 | – |
| Wide | ribbon | r-cvd-div@m1c | 3 | 0 (0 %) | 27 | 33 % | 0.64 | -4.50 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (9 · 0.64 · -1.50) |
| Wide | pulse | ema-slope-10@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -5.21 | – |
| Wide | sandwich | ema-slope-10@m5c | 3 | 0 (0 %) | 12 | 25 % | 0.33 | -5.36 | – |
| Wide | ribbon | dir-thrust-4@m5 | 3 | 0 (0 %) | 39 | 38 % | 0.76 | -6.59 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (13 · 0.76 · -2.20) |
| Wide | pivot | r-cvd-div@m1c | 3 | 0 (0 %) | 30 | 30 % | 0.55 | -6.60 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (10 · 0.55 · -2.20) |
| Wide | clamp | macd-cross-5-35-5@m30 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -6.71 | – |
| Wide | pivot | r-session-trend-m@m30 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -6.83 | – |
| Wide | revert | r-awesome@m5c | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -9.06 | – |
| Wide | revert | break-vol-1.3@m15c | 3 | 0 (0 %) | 48 | 38 % | 0.80 | -10.34 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (16 · 0.80 · -3.45) |
| Wide | pivot | macd-hist-19-39-9@m15c | 1 | 0 (0 %) | 8 | 38 % | 0.18 | -11.13 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (8 · 0.18 · -11.13) |
| Wide | pivot | macd-hist-19-39-9@m5c | 3 | 0 (0 %) | 15 | 0 % | 0.00 | -11.81 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (5 · 0.00 · -3.94) |
| Wide | ribbon | break-squeeze-30@m30 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -11.94 | – |
| Wide | pivot | macd-hist-8-21-5@m5c | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -12.60 | – |
| Wide | clamp | break-atr-2@m5 | 3 | 0 (0 %) | 15 | 40 % | 0.34 | -13.23 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (5 · 0.34 · -4.41) |
| Wide | follow | mc-rsit3-25@m5c | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -13.51 | – |
| Wide | sweep | mc-mturn-5@m15c | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -14.40 | – |
| Wide | pulse | hma-55@m15 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -15.93 | – |
| Wide | clamp | r-camarilla@m1 | 3 | 0 (0 %) | 30 | 30 % | 0.36 | -16.94 | tp0.64 sl0.54 tr0 h480 ax-linear2 axis (10 · 0.36 · -5.65) |
| Wide | pivot | kelt-20-2@m15 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -19.26 | – |
| Wide | pivot | r-bos@m1 | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -20.99 | – |
| Wide | pivot | break-atr-2@x4@m1 | 3 | 0 (0 %) | 39 | 15 % | 0.19 | -22.84 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (13 · 0.20 · -7.13) |
| Wide | pulse | ichi-tk-9@m1 | 3 | 0 (0 %) | 51 | 29 % | 0.47 | -23.38 | tp0.64 sl0.54 tr0 h480 ax-linear2 axis (17 · 0.47 · -7.79) |
| Wide | pivot | r-camarilla@m1 | 3 | 0 (0 %) | 36 | 25 % | 0.25 | -26.41 | tp0.64 sl0.54 tr0 h480 ax-linear2 axis (12 · 0.25 · -8.80) |
| Wide | revert | mc-tmom-3@m15c | 6 | 0 (0 %) | 84 | 39 % | 0.64 | -31.83 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (15 · 0.93 · -0.95) |
| Wide | pulse | r-valuearea-m@m1 | 3 | 0 (0 %) | 33 | 18 % | 0.16 | -32.61 | tp0.64 sl0.54 tr0 h480 ax-linear2 axis (11 · 0.16 · -10.87) |
| Wide | magnet | kelt-20-2.5@m1 | 4 | 0 (0 %) | 20 | 0 % | 0.00 | -32.95 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (5 · 0.00 · -6.14) |
| Wide | pulse | move-impulse-10-2@m15 | 12 | 0 (0 %) | 30 | 10 % | 0.05 | -59.84 | – |
| Wide | pulse | move-impulse-10-2@m5 | 12 | 0 (0 %) | 72 | 17 % | 0.10 | -72.50 | tp0.76 sl0.68 tr0 h96 ax-fib2 axis (6 · 0.09 · -4.36) |
| Signals | follow | sig-williams-r-s@m15 | 20 | 20 (100 %) | 554 | 84 % | 3.20 | 954.71 | tp6 sl18 tr0 h192 (13 · ∞ (no loss) · 75.40) |
| Signals | follow | sig-obv-m@m15 | 20 | 20 (100 %) | 580 | 84 % | 3.04 | 891.50 | tp4 sl12 tr1.6 h192 (51 · 79.02 · 84.89) |
| Signals | follow | sig-williams-r-m@m15 | 20 | 20 (100 %) | 626 | 84 % | 2.35 | 891.32 | tp5 sl15 tr2 h192 (38 · 4.72 · 64.93) |
| Signals | follow | sig-obv-s@m15 | 20 | 20 (100 %) | 724 | 85 % | 2.28 | 867.67 | tp5 sl15 tr2 h192 (54 · 5.55 · 78.33) |
| Signals | follow | sig-bollinger-s@m15 | 20 | 20 (100 %) | 537 | 83 % | 2.37 | 848.73 | tp5 sl15 tr2 h192 (35 · 4.98 · 68.01) |
| Signals | follow | sig-zscore-s@m15 | 20 | 20 (100 %) | 537 | 83 % | 2.37 | 848.73 | tp5 sl15 tr2 h192 (35 · 4.98 · 68.01) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 20 | 20 (100 %) | 579 | 84 % | 2.45 | 776.29 | tp6 sl18 tr0 h192 (12 · ∞ (no loss) · 69.60) |
| Signals | follow | sig-stoch-rsi-m@m15 | 20 | 17 (85 %) | 722 | 78 % | 1.94 | 752.05 | tp6 sl18 tr2.4 h192 (40 · 32.57 · 80.40) |
| Signals | follow | sig-vwap-s@m15 | 20 | 19 (95 %) | 556 | 83 % | 2.45 | 739.95 | tp5 sl15 tr3 h192 (28 · 165.35 · 71.61) |
| Signals | follow | sig-hma-m@m15 | 20 | 20 (100 %) | 467 | 84 % | 2.56 | 701.90 | tp8 sl24 tr3.2 h192 (17 · 815.79 · 64.42) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 20 | 20 (100 %) | 426 | 86 % | 3.42 | 688.66 | tp4 sl12 tr3.2 h192 (20 · 5.29 · 52.65) |
| Signals | follow | sig-heikin-ashi-s@m15 | 20 | 18 (90 %) | 909 | 80 % | 1.58 | 683.19 | tp5 sl15 tr2 h192 (61 · 3.10 · 69.82) |
| Signals | follow | sig-s2-confluence-m@m15 | 20 | 20 (100 %) | 550 | 83 % | 2.11 | 642.48 | tp6 sl18 tr2.4 h192 (30 · 294.26 · 76.30) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 20 | 20 (100 %) | 298 | 85 % | 4.05 | 640.21 | tp5 sl15 tr3 h192 (12 · 326.00 · 45.38) |
| Signals | follow | sig-cci-m@m15 | 20 | 19 (95 %) | 409 | 84 % | 2.21 | 596.76 | tp4 sl12 tr3.2 h192 (20 · 5.00 · 49.03) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 20 | 20 (100 %) | 209 | 91 % | 14.15 | 582.52 | tp5 sl15 tr3 h192 (9 · ∞ (no loss) · 39.69) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 20 | 18 (90 %) | 337 | 85 % | 3.03 | 579.13 | tp5 sl15 tr3 h192 (13 · ∞ (no loss) · 50.68) |
| Signals | follow | sig-thrust-m@m15 | 20 | 19 (95 %) | 719 | 82 % | 1.59 | 571.81 | tp6 sl18 tr2.4 h192 (33 · 4.10 · 56.46) |
| Signals | follow | sig-reclaim-m@m15 | 20 | 17 (85 %) | 514 | 79 % | 1.79 | 541.85 | tp4 sl12 tr2.4 h192 (31 · 5.22 · 56.67) |
| Signals | follow | sig-macd-hist-m@m15 | 20 | 19 (95 %) | 834 | 80 % | 1.48 | 541.21 | tp8 sl24 tr3.2 h192 (27 · 3.09 · 50.62) |
| Signals | follow | sig-cci-s@m15 | 20 | 19 (95 %) | 762 | 78 % | 1.52 | 538.88 | tp6 sl18 tr2.4 h192 (46 · 3.96 · 74.74) |
| Signals | follow | sig-macd-slow-s@m15 | 20 | 19 (95 %) | 623 | 82 % | 1.61 | 534.44 | tp4 sl12 tr1.6 h192 (53 · 1.83 · 44.06) |
| Signals | follow | sig-ema-slope-m@m15 | 20 | 20 (100 %) | 176 | 96 % | 62.65 | 522.60 | tp5 sl15 tr0 h192 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-bollinger-m@m15 | 20 | 20 (100 %) | 348 | 85 % | 2.20 | 521.38 | tp4 sl12 tr1.6 h192 (30 · 4.20 · 41.09) |
| Signals | follow | sig-s2-confluence-s@m15 | 20 | 20 (100 %) | 642 | 77 % | 1.68 | 517.41 | tp6 sl18 tr2.4 h192 (37 · 34.62 · 66.85) |
| Signals | follow | sig-vwap-m@m15 | 20 | 20 (100 %) | 227 | 86 % | 5.78 | 504.98 | tp6 sl18 tr2.4 h192 (13 · 196.58 · 38.09) |
| Signals | follow | sig-adx-m@m15 | 20 | 18 (90 %) | 254 | 85 % | 3.42 | 476.22 | tp6 sl18 tr2.4 h192 (13 · ∞ (no loss) · 41.55) |
| Signals | follow | sig-reclaim-s@m15 | 20 | 16 (80 %) | 685 | 81 % | 1.46 | 462.12 | tp5 sl15 tr3 h192 (32 · 2.74 · 53.70) |
| Signals | follow | sig-macd-cross-m@m15 | 20 | 19 (95 %) | 523 | 82 % | 1.62 | 429.07 | tp4 sl12 tr1.6 h192 (43 · 2.98 · 48.81) |
| Signals | follow | sig-rsi-mid-s@m15 | 20 | 17 (85 %) | 566 | 81 % | 1.45 | 403.17 | tp6 sl18 tr2.4 h192 (31 · 3.96 · 54.44) |
| Signals | follow | sig-ema-trend-s@m15 | 20 | 19 (95 %) | 512 | 79 % | 1.48 | 391.35 | tp8 sl24 tr3.2 h192 (21 · 2.60 · 45.46) |
| Signals | follow | sig-impulse-s@m15 | 20 | 17 (85 %) | 555 | 79 % | 1.42 | 357.38 | tp8 sl24 tr4.8 h192 (11 · ∞ (no loss) · 58.26) |
| Signals | follow | sig-trix-s@m15 | 20 | 19 (95 %) | 386 | 81 % | 1.64 | 344.97 | tp6 sl18 tr2.4 h192 (22 · 952.04 · 55.41) |
| Signals | follow | sig-heikin-ashi-m@m15 | 20 | 16 (80 %) | 651 | 79 % | 1.33 | 337.91 | tp6 sl18 tr4.8 h192 (11 · ∞ (no loss) · 53.27) |
| Signals | follow | sig-kama-m@m15 | 20 | 14 (70 %) | 597 | 78 % | 1.36 | 334.47 | tp8 sl24 tr6.4 h192 (7 · ∞ (no loss) · 54.60) |
| Signals | follow | sig-ema-cross-s@m15 | 20 | 20 (100 %) | 399 | 79 % | 1.52 | 320.99 | tp6 sl18 tr2.4 h192 (21 · 2.70 · 32.82) |
| Signals | follow | sig-macd-cross-s@m15 | 20 | 16 (80 %) | 608 | 79 % | 1.31 | 315.53 | tp3 sl9 tr1.8 h192 (54 · 1.83 · 45.86) |
| Signals | follow | sig-macd-hist-s@m15 | 20 | 16 (80 %) | 608 | 79 % | 1.31 | 315.53 | tp3 sl9 tr1.8 h192 (54 · 1.83 · 45.86) |
| Signals | follow | sig-stoch-rsi-s@m15 | 20 | 12 (60 %) | 705 | 75 % | 1.26 | 302.95 | tp6 sl18 tr2.4 h192 (41 · 3.43 · 62.30) |
| Signals | follow | sig-ema-trend-m@m15 | 20 | 16 (80 %) | 409 | 79 % | 1.39 | 266.84 | tp4 sl12 tr1.6 h192 (30 · 162.99 · 58.48) |
| Signals | follow | sig-act-burst-s@m15 | 20 | 15 (75 %) | 678 | 78 % | 1.22 | 260.77 | tp6 sl18 tr2.4 h192 (35 · 4.31 · 61.25) |
| Signals | follow | sig-adx-s@m15 | 20 | 14 (70 %) | 369 | 79 % | 1.46 | 257.35 | tp6 sl18 tr2.4 h192 (22 · 190.97 · 48.32) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 18 | 18 (100 %) | 100 | 96 % | 425.87 | 253.04 | tp3 sl9 tr2.4 h192 (7 · ∞ (no loss) · 19.60) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 20 | 14 (70 %) | 536 | 77 % | 1.27 | 251.91 | tp6 sl18 tr2.4 h192 (28 · 3.58 · 50.86) |
| Signals | follow | sig-donchian-s@m15 | 20 | 12 (60 %) | 564 | 77 % | 1.25 | 248.39 | tp6 sl18 tr3.6 h192 (20 · 3.83 · 51.47) |
| Signals | follow | sig-macd-slow-m@m15 | 20 | 14 (70 %) | 475 | 81 % | 1.31 | 245.19 | tp8 sl24 tr3.2 h192 (17 · ∞ (no loss) · 57.76) |
| Signals | follow | sig-s2-st-trail-m@m15 | 20 | 17 (85 %) | 192 | 83 % | 1.97 | 236.86 | tp4 sl12 tr0 h192 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-thrust-s@m15 | 20 | 13 (65 %) | 449 | 78 % | 1.33 | 236.80 | tp8 sl24 tr4.8 h192 (8 · ∞ (no loss) · 42.67) |
| Signals | follow | sig-act-burst-m@m15 | 20 | 17 (85 %) | 290 | 80 % | 1.57 | 229.10 | tp5 sl15 tr2 h192 (16 · ∞ (no loss) · 31.53) |
| Signals | follow | sig-kama-s@m15 | 20 | 13 (65 %) | 583 | 77 % | 1.24 | 225.86 | tp5 sl15 tr3 h192 (30 · 3.99 · 52.30) |
| Signals | follow | sig-s2-st-trail-s@m15 | 20 | 15 (75 %) | 185 | 82 % | 2.09 | 222.45 | tp5 sl15 tr3 h192 (7 · 110.70 · 28.54) |
| Signals | follow | sig-ema-slope-s@m15 | 20 | 12 (60 %) | 436 | 78 % | 1.23 | 192.30 | tp6 sl18 tr2.4 h192 (23 · 3.88 · 52.55) |
| Signals | follow | sig-supertrend-m@m15 | 20 | 18 (90 %) | 204 | 81 % | 1.63 | 184.19 | tp5 sl15 tr0 h192 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-st-slow-m@m15 | 20 | 17 (85 %) | 113 | 78 % | 2.71 | 180.81 | tp8 sl24 tr3.2 h192 (6 · 72.82 · 18.05) |
| Signals | follow | sig-r-linreg-s@m15 | 20 | 13 (65 %) | 594 | 75 % | 1.17 | 179.67 | tp6 sl18 tr2.4 h192 (32 · 3.20 · 43.30) |
| Signals | follow | sig-rsi-reversal-m@m15 | 18 | 18 (100 %) | 53 | 100 % | ∞ (no loss) | 148.11 | tp3 sl9 tr1.2 h192 (5 · ∞ (no loss) · 6.75) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 20 | 17 (85 %) | 309 | 78 % | 1.23 | 142.76 | tp8 sl24 tr3.2 h192 (13 · 2.02 · 24.74) |
| Signals | follow | sig-ema-pullback-s@m15 | 20 | 11 (55 %) | 685 | 75 % | 1.11 | 133.12 | tp6 sl18 tr2.4 h192 (38 · 4.29 · 63.28) |
| Signals | follow | sig-volume-break-m@m15 | 20 | 19 (95 %) | 49 | 94 % | 9.36 | 128.25 | tp3 sl9 tr1.2 h192 (7 · 51.82 · 6.83) |
| Signals | follow | sig-supertrend-s@m15 | 20 | 13 (65 %) | 411 | 78 % | 1.16 | 124.27 | tp8 sl24 tr3.2 h192 (16 · ∞ (no loss) · 47.76) |
| Signals | follow | sig-ema-pullback-m@m15 | 20 | 13 (65 %) | 425 | 73 % | 1.16 | 111.44 | tp5 sl15 tr2 h192 (28 · 3.22 · 35.43) |
| Signals | follow | sig-hma-s@m15 | 20 | 13 (65 %) | 650 | 78 % | 1.09 | 106.69 | tp8 sl24 tr6.4 h192 (7 · ∞ (no loss) · 34.86) |
| Signals | follow | sig-st-slow-s@m15 | 20 | 12 (60 %) | 233 | 78 % | 1.23 | 96.88 | tp5 sl15 tr3 h192 (9 · 117.11 · 30.21) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 20 | 11 (55 %) | 426 | 73 % | 1.12 | 91.68 | tp6 sl18 tr2.4 h192 (19 · 30.08 · 50.82) |
| Signals | follow | sig-mfi-m@m15 | 20 | 13 (65 %) | 137 | 80 % | 1.44 | 91.49 | tp6 sl18 tr3.6 h192 (5 · 173.61 · 19.68) |
| Signals | follow | sig-zscore-m@m15 | 20 | 16 (80 %) | 166 | 81 % | 1.30 | 91.17 | tp3 sl9 tr1.8 h192 (13 · 2.72 · 16.20) |
| Signals | follow | sig-mfi-s@m15 | 20 | 18 (90 %) | 20 | 90 % | 281.93 | 81.45 | – |
| Signals | follow | sig-ema-cross-fast-s@m15 | 20 | 11 (55 %) | 477 | 78 % | 1.06 | 52.48 | tp6 sl18 tr2.4 h192 (26 · 3.52 · 45.82) |
| Signals | follow | sig-s2-vol-break-s@m15 | 20 | 9 (45 %) | 135 | 76 % | 1.13 | 36.31 | tp8 sl24 tr3.2 h192 (5 · ∞ (no loss) · 18.90) |
| Signals | follow | sig-rsi-momentum-s@m15 | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 | – |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 8 | 8 (100 %) | 15 | 87 % | 131.39 | 21.94 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 20 | 10 (50 %) | 138 | 70 % | 1.06 | 19.82 | tp8 sl24 tr3.2 h192 (6 · 4.51 · 14.83) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 17.34 | – |
| Signals | follow | sig-r-inside-s@m15 | 20 | 12 (60 %) | 93 | 78 % | 1.09 | 16.62 | tp5 sl15 tr2 h192 (6 · 289.25 · 11.70) |
| Signals | follow | sig-impulse-m@m15 | 20 | 10 (50 %) | 403 | 74 % | 1.02 | 16.32 | tp5 sl15 tr2 h192 (24 · 2.01 · 31.71) |
| Signals | follow | sig-r-connors-s@m15 | 15 | 11 (73 %) | 114 | 80 % | 1.07 | 10.31 | tp5 sl15 tr2 h192 (9 · ∞ (no loss) · 11.76) |
| Signals | follow | sig-volume-break-s@m15 | 16 | 10 (63 %) | 41 | 80 % | 1.14 | 8.58 | tp3 sl9 tr1.2 h192 (7 · 0.73 · -2.52) |
| Signals | follow | sig-r-connors-m@m15 | 20 | 10 (50 %) | 361 | 73 % | 1.00 | 2.62 | tp6 sl18 tr3.6 h192 (12 · 1.59 · 10.69) |
| Signals | follow | sig-squeeze-m@m15 | 20 | 10 (50 %) | 61 | 70 % | 0.92 | -12.17 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 18 | 8 (44 %) | 88 | 73 % | 0.80 | -44.26 | tp2.5 sl7.5 tr0 h192 (9 · 1.05 · 0.70) |
| Signals | follow | sig-swing-m@m15 | 20 | 11 (55 %) | 570 | 75 % | 0.96 | -53.69 | tp5 sl15 tr2 h192 (38 · 2.21 · 38.79) |
| Signals | follow | sig-r-session-trend-s@m15 | 20 | 9 (45 %) | 206 | 68 % | 0.89 | -54.03 | tp8 sl24 tr3.2 h192 (9 · 494.17 · 42.38) |
| Signals | follow | sig-ichimoku-s@m15 | 20 | 6 (30 %) | 496 | 76 % | 0.93 | -75.18 | tp6 sl18 tr2.4 h192 (28 · 1.59 · 21.76) |
| Signals | follow | sig-rsi-reversal-s@m15 | 20 | 4 (20 %) | 140 | 69 % | 0.76 | -94.35 | tp6 sl18 tr2.4 h192 (7 · 116.99 · 17.06) |
| Signals | follow | sig-r-linreg-m@m15 | 20 | 6 (30 %) | 477 | 70 % | 0.88 | -112.18 | tp6 sl18 tr2.4 h192 (27 · 9.14 · 43.01) |
| Signals | follow | sig-swing-s@m15 | 20 | 9 (45 %) | 644 | 74 % | 0.91 | -132.94 | tp6 sl18 tr2.4 h192 (32 · 2.12 · 40.92) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 14 | 1 (7 %) | 27 | 44 % | 0.11 | -134.37 | – |
| Signals | follow | sig-r-vol-regime-m@m15 | 18 | 6 (33 %) | 62 | 53 % | 0.38 | -140.14 | tp4 sl12 tr1.6 h192 (5 · 0.35 · -7.95) |
| Signals | follow | sig-keltner-s@m15 | 20 | 7 (35 %) | 335 | 71 % | 0.82 | -147.52 | tp8 sl24 tr3.2 h192 (11 · 427.97 · 33.31) |
| Signals | follow | sig-act-hf-s@m15 | 20 | 10 (50 %) | 715 | 74 % | 0.90 | -158.56 | tp6 sl18 tr0 h192 (13 · 3.82 · 51.40) |
| Signals | follow | sig-s2-block-scale-s@m15 | 20 | 6 (30 %) | 675 | 72 % | 0.88 | -172.57 | tp6 sl18 tr2.4 h192 (37 · 2.15 · 43.23) |
| Signals | follow | sig-r-inside-m@m15 | 9 | 0 (0 %) | 18 | 6 % | 0.00 | -177.28 | – |
| Signals | follow | sig-atr-break-s@m15 | 20 | 9 (45 %) | 675 | 73 % | 0.87 | -194.96 | tp6 sl18 tr2.4 h192 (34 · 2.05 · 38.79) |
| Signals | follow | sig-r-vol-regime-s@m15 | 20 | 0 (0 %) | 119 | 65 % | 0.54 | -200.69 | tp5 sl15 tr3 h192 (5 · 0.99 · -0.19) |
| Signals | follow | sig-r-nr-break-s@m15 | 20 | 9 (45 %) | 403 | 73 % | 0.78 | -204.88 | tp8 sl24 tr6.4 h192 (7 · 1.93 · 22.60) |
| Signals | follow | sig-r-awesome-s@m15 | 20 | 7 (35 %) | 376 | 71 % | 0.78 | -206.14 | tp6 sl18 tr2.4 h192 (19 · 2.39 · 26.05) |
| Signals | follow | sig-r-session-trend-m@m15 | 20 | 7 (35 %) | 186 | 63 % | 0.60 | -219.86 | tp8 sl24 tr3.2 h192 (5 · 62.61 · 17.97) |
| Signals | follow | sig-r-awesome-m@m15 | 20 | 6 (30 %) | 421 | 69 % | 0.78 | -231.56 | tp8 sl24 tr3.2 h192 (16 · 63.90 · 36.13) |
| Signals | follow | sig-sar-s@m15 | 20 | 5 (25 %) | 691 | 74 % | 0.84 | -253.90 | tp5 sl15 tr2 h192 (43 · 1.36 · 21.85) |
| Signals | follow | sig-atr-break-m@m15 | 20 | 4 (20 %) | 348 | 69 % | 0.72 | -271.19 | tp8 sl24 tr6.4 h192 (5 · 40.48 · 23.71) |
| Signals | follow | sig-r-nr-break-m@m15 | 20 | 2 (10 %) | 515 | 73 % | 0.77 | -273.75 | tp4 sl12 tr0 h192 (22 · 1.06 · 3.60) |
| Signals | follow | sig-trix-m@m15 | 20 | 1 (5 %) | 152 | 63 % | 0.53 | -273.81 | tp5 sl15 tr2 h192 (9 · 1.18 · 2.66) |
| Signals | follow | sig-squeeze-s@m15 | 20 | 3 (15 %) | 171 | 63 % | 0.56 | -278.36 | tp8 sl24 tr3.2 h192 (5 · ∞ (no loss) · 20.48) |
| Signals | follow | sig-s2-active-hf-s@m15 | 20 | 4 (20 %) | 754 | 74 % | 0.84 | -278.82 | tp5 sl15 tr2 h192 (51 · 2.87 · 57.86) |
| Signals | follow | sig-donchian-m@m15 | 20 | 2 (10 %) | 309 | 69 % | 0.66 | -284.10 | tp8 sl24 tr3.2 h192 (12 · 1.24 · 5.89) |
| Signals | follow | sig-ichimoku-m@m15 | 20 | 1 (5 %) | 147 | 61 % | 0.49 | -292.11 | tp5 sl15 tr2 h192 (6 · 0.72 · -4.26) |
| Signals | follow | sig-s2-block-scale-m@m15 | 20 | 7 (35 %) | 524 | 70 % | 0.77 | -297.04 | tp8 sl24 tr4.8 h192 (9 · ∞ (no loss) · 37.83) |
| Signals | follow | sig-keltner-m@m15 | 20 | 2 (10 %) | 246 | 68 % | 0.60 | -300.66 | tp8 sl24 tr3.2 h192 (6 · ∞ (no loss) · 20.21) |
| Signals | follow | sig-ema-cross-m@m15 | 20 | 0 (0 %) | 99 | 62 % | 0.37 | -307.90 | tp3 sl9 tr1.8 h192 (8 · 0.97 · -0.28) |
| Signals | follow | sig-s2-range-break-m@m15 | 16 | 3 (19 %) | 99 | 48 % | 0.24 | -324.84 | tp6 sl18 tr2.4 h192 (5 · 54.97 · 5.57) |
| Signals | follow | sig-s2-range-shift-m@m15 | 20 | 3 (15 %) | 256 | 66 % | 0.60 | -332.77 | tp8 sl24 tr3.2 h192 (6 · ∞ (no loss) · 22.28) |
| Signals | follow | sig-rsi-mid-m@m15 | 20 | 8 (40 %) | 516 | 68 % | 0.72 | -373.20 | tp6 sl18 tr2.4 h192 (30 · 1.82 · 31.52) |
| Signals | follow | sig-s2-active-hf-m@m15 | 20 | 4 (20 %) | 732 | 73 % | 0.78 | -401.50 | tp5 sl15 tr2 h192 (49 · 1.90 · 41.17) |
| Signals | follow | sig-cmf-m@m15 | 20 | 7 (35 %) | 498 | 68 % | 0.70 | -410.83 | tp8 sl24 tr3.2 h192 (13 · 8.44 · 42.83) |
| Signals | follow | sig-s2-block-stack-m@m15 | 20 | 5 (25 %) | 329 | 66 % | 0.57 | -451.49 | tp6 sl18 tr0 h192 (5 · 1.27 · 5.00) |
| Signals | follow | sig-s2-block-stack-s@m15 | 20 | 3 (15 %) | 418 | 68 % | 0.63 | -462.94 | tp8 sl24 tr3.2 h192 (13 · 1.57 · 13.76) |
| Signals | follow | sig-act-hf-m@m15 | 20 | 6 (30 %) | 573 | 69 % | 0.68 | -478.80 | tp6 sl18 tr2.4 h192 (26 · 1.47 · 17.32) |
| Signals | follow | sig-s2-atr-break-s@m15 | 20 | 3 (15 %) | 362 | 64 % | 0.53 | -526.31 | tp8 sl24 tr3.2 h192 (8 · 77.91 · 17.80) |
| Signals | follow | sig-sar-m@m15 | 20 | 3 (15 %) | 573 | 70 % | 0.64 | -608.34 | tp6 sl18 tr2.4 h192 (26 · 1.27 · 14.51) |
| Signals | follow | sig-r-fractal-s@m15 | 20 | 0 (0 %) | 296 | 60 % | 0.42 | -617.13 | tp8 sl24 tr3.2 h192 (10 · 0.57 · -10.54) |
| Signals | follow | sig-cmf-s@m15 | 20 | 4 (20 %) | 429 | 62 % | 0.49 | -720.21 | tp8 sl24 tr3.2 h192 (10 · 1.29 · 7.13) |
| Signals | follow | sig-r-fractal-m@m15 | 20 | 0 (0 %) | 217 | 52 % | 0.29 | -729.09 | tp8 sl24 tr3.2 h192 (6 · 0.67 · -8.11) |
| Signals | follow | sig-s2-atr-break-m@m15 | 20 | 3 (15 %) | 472 | 64 % | 0.51 | -753.54 | tp8 sl24 tr4.8 h192 (6 · ∞ (no loss) · 14.09) |
| Signals | follow | sig-s2-range-shift-s@m15 | 20 | 1 (5 %) | 327 | 50 % | 0.28 | -1070.80 | tp8 sl24 tr3.2 h192 (10 · 1.08 · 1.90) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 123 | 104 (85 %) | 2608 | 85 % | 2.00 | 2829.98 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 123 | 94 (76 %) | 3217 | 83 % | 1.67 | 2328.12 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 121 | 103 (85 %) | 1810 | 85 % | 1.82 | 2165.30 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 120 | 92 (77 %) | 1587 | 83 % | 1.58 | 1700.86 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 122 | 83 (68 %) | 2161 | 80 % | 1.41 | 1512.23 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 112 | 87 (78 %) | 648 | 79 % | 1.87 | 1493.31 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 116 | 86 (74 %) | 1018 | 82 % | 1.59 | 1485.72 |
| Signals | tp 6.000% | sl 3.00× | tr off | 114 | 82 (72 %) | 796 | 83 % | 1.56 | 1376.80 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 124 | 78 (63 %) | 4138 | 77 % | 1.27 | 1302.37 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 114 | 86 (75 %) | 906 | 84 % | 1.59 | 1269.06 |
| Minimal | tp 1.600% | sl 3.00× | tr off | 166 | 87 (52 %) | 1183 | 92 % | 3.74 | 1118.22 |
| Minimal | tp 1.400% | sl 3.00× | tr 0.75× | 174 | 112 (64 %) | 1463 | 83 % | 3.31 | 1077.05 |
| Minimal | tp 1.400% | sl 2.50× | tr off | 122 | 85 (70 %) | 1503 | 88 % | 2.59 | 979.56 |
| Minimal | tp 1.400% | sl 3.00× | tr off | 141 | 99 (70 %) | 1200 | 92 % | 3.46 | 941.22 |
| Minimal | tp 1.600% | sl 2.50× | tr off | 121 | 80 (66 %) | 987 | 91 % | 3.85 | 933.05 |
| Minimal | tp 1.600% | sl 2.00× | tr 0.75× | 157 | 89 (57 %) | 1263 | 73 % | 2.49 | 909.57 |
| Minimal | tp 1.600% | sl 2.50× | tr 0.75× | 172 | 100 (58 %) | 1063 | 76 % | 2.93 | 871.43 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.75× | 189 | 114 (60 %) | 1092 | 76 % | 2.87 | 859.73 |
| Minimal | tp 1.600% | sl 2.50× | tr 0.50× | 171 | 121 (71 %) | 1254 | 79 % | 3.00 | 809.77 |
| Minimal | tp 1.600% | sl 2.00× | tr off | 128 | 71 (55 %) | 1074 | 86 % | 2.57 | 786.63 |
| Minimal | tp 1.200% | sl 3.00× | tr off | 144 | 91 (63 %) | 1144 | 92 % | 3.21 | 726.33 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 121 | 72 (60 %) | 1569 | 77 % | 1.17 | 663.35 |
| Minimal | tp 1.400% | sl 2.50× | tr 0.75× | 149 | 85 (57 %) | 1105 | 79 % | 2.45 | 657.95 |
| Minimal | tp 1.600% | sl 1.50× | tr off | 75 | 68 (91 %) | 1290 | 77 % | 1.86 | 644.34 |
| Minimal | tp 1.400% | sl 2.00× | tr off | 114 | 71 (62 %) | 1239 | 83 % | 2.06 | 638.63 |
| Minimal | tp 1.200% | sl 3.00× | tr 0.75× | 161 | 86 (53 %) | 1043 | 77 % | 2.93 | 602.40 |
| Minimal | tp 1.400% | sl 3.00× | tr 0.50× | 150 | 111 (74 %) | 975 | 81 % | 3.59 | 599.68 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 124 | 67 (54 %) | 3052 | 78 % | 1.10 | 555.93 |
| Minimal | tp 1.600% | sl 2.00× | tr 0.50× | 129 | 85 (66 %) | 1229 | 73 % | 2.35 | 545.07 |
| Minimal | tp 1.400% | sl 2.00× | tr 0.75× | 109 | 61 (56 %) | 1151 | 75 % | 2.01 | 536.74 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.50× | 137 | 91 (66 %) | 781 | 78 % | 3.62 | 511.71 |
| Minimal | tp 1.200% | sl 2.50× | tr 0.75× | 109 | 52 (48 %) | 852 | 75 % | 2.49 | 435.12 |
| Minimal | tp 1.600% | sl 1.50× | tr 0.75× | 79 | 69 (87 %) | 764 | 65 % | 1.97 | 429.91 |
| Signals | tp 5.000% | sl 3.00× | tr off | 119 | 66 (55 %) | 1213 | 77 % | 1.09 | 362.40 |
| Minimal | tp 1.200% | sl 2.50× | tr off | 99 | 52 (53 %) | 868 | 86 % | 1.94 | 361.88 |
| Minimal | tp 1.200% | sl 3.00× | tr 0.50× | 133 | 75 (56 %) | 608 | 78 % | 3.68 | 347.79 |
| Minimal | tp 1.400% | sl 2.50× | tr 0.50× | 94 | 58 (62 %) | 348 | 82 % | 5.07 | 218.28 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 80 | 45 (56 %) | 440 | 74 % | 1.57 | 188.65 |
| Short | tp 2.200% | sl 2.00× | tr 0.50× | 67 | 43 (64 %) | 510 | 72 % | 1.48 | 150.73 |
| Minimal | tp 1.000% | sl 2.50× | tr off | 117 | 42 (36 %) | 383 | 88 % | 2.12 | 141.90 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 3.00× | tr off | 124 | 46 (37 %) | 3906 | 74 % | 0.83 | -1326.20 |
| Signals | tp 4.000% | sl 3.00× | tr off | 122 | 47 (39 %) | 2014 | 72 % | 0.81 | -1290.80 |
| Signals | tp 3.000% | sl 3.00× | tr off | 123 | 50 (41 %) | 3034 | 74 % | 0.85 | -1092.80 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 124 | 52 (42 %) | 3483 | 71 % | 0.86 | -1004.19 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 123 | 54 (44 %) | 2422 | 73 % | 0.89 | -656.34 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 124 | 57 (46 %) | 4176 | 72 % | 0.94 | -375.23 |
| Wide | tp 0.640% | sl 0.84× | tr off | 63 | 13 (21 %) | 562 | 35 % | 0.57 | -158.22 |
| Short | tp 2.600% | sl 2.00× | tr off | 81 | 23 (28 %) | 273 | 61 % | 0.73 | -144.99 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 85 | 25 (29 %) | 354 | 60 % | 0.77 | -144.93 |
| Short | tp 2.200% | sl 2.00× | tr off | 69 | 19 (28 %) | 232 | 62 % | 0.72 | -112.25 |
| Short | tp 2.000% | sl 2.00× | tr off | 65 | 27 (42 %) | 253 | 62 % | 0.72 | -110.20 |
| Wide | tp 0.800% | sl 1.00× | tr off | 128 | 42 (33 %) | 318 | 42 % | 0.69 | -103.10 |
| Wide | tp 0.760% | sl 0.89× | tr off | 92 | 31 (34 %) | 364 | 33 % | 0.67 | -90.26 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 79 | 29 (37 %) | 274 | 62 % | 0.83 | -89.21 |
| Short | tp 2.400% | sl 1.50× | tr 0.75× | 66 | 18 (27 %) | 223 | 51 % | 0.73 | -82.68 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Short | normal | 264 (232) | 76932 | 20994 | 20808 | 0 | baseTarget 10911 · baseRange 45027 |
| Short | trailing | 264 (232) | 153864 | 42053 | 41616 | 0 | baseTarget 21781 · baseRange 90030 |
| General | normal | 264 (224) | 51288 | 13561 | 13458 | 0 | baseTarget 4797 · baseRange 32930 |
| General | trailing | 264 (225) | 34192 | 9074 | 8972 | 0 | baseTarget 3187 · baseRange 21931 |
| Long | normal | 264 (232) | 64110 | 18604 | 18528 | 0 | baseTarget 5714 · baseRange 39792 |
| Long | trailing | 264 (232) | 42740 | 12429 | 12352 | 0 | baseTarget 3787 · baseRange 26524 |
| Wide | axis | 375 (375) | 135900 | 135900 | 135900 | 0 | – |
| Wide | dca | 375 (375) | 12080 | 12080 | 12080 | 0 | – |
| Wide | dca-active | 375 (375) | 12080 | 12080 | 12080 | 0 | – |

Engine indications Base evaluated that built no set: 16 (bb-walk-50, mc-act-idio-2, mc-act-mkt-25, mc-brk-20, mc-rsi4-5, mc-rsit7-25, mc-rsit7-30, mc-spike-2, mc-tcross-513, r-bbw-expand, r-bbw-expand-m, r-capit-m, r-roofing-m, r-squeeze-m, r-vol-regime-m, r-vwap-reclaim-m).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1.75× | – | – | – | – | – | – | ∞ (4) |
| 2× | – | – | – | – | – | ∞ (4) | ∞ (4) |
| 2.25× | – | – | – | – | ∞ (3) | ∞ (4) | ∞ (4) |
| 2.5× | – | – | – | – | ∞ (3) | ∞ (4) | ∞ (4) |
| 2.75× | – | – | – | – | ∞ (3) | ∞ (4) | ∞ (38) |
| 3× | – | – | – | – | ∞ (7) | 11.66 (42) | 14.74 (38) |
| 3.25× | – | – | – | ∞ (16) | ∞ (29) | 7.93 (54) | 14.74 (38) |
| 3.5× | – | – | ∞ (12) | ∞ (22) | 11.57 (41) | 11.07 (34) | 6.91 (82) |
| 3.75× | – | – | ∞ (12) | ∞ (22) | 9.20 (33) | 8.05 (78) | 7.98 (122) |
| 4× | – | ∞ (2) | ∞ (16) | ∞ (32) | 6.82 (25) | 8.80 (122) | 7.98 (122) |
| 4.25× | – | ∞ (2) | ∞ (16) | 53.77 (38) | 10.20 (69) | 8.88 (123) | 7.98 (122) |
| 4.5× | – | ∞ (22) | ∞ (28) | 15.67 (66) | 10.38 (113) | 8.88 (123) | 8.32 (130) |
| 4.75× | ∞ (8) | ∞ (22) | 47.08 (34) | 14.23 (120) | 10.38 (113) | 8.88 (123) | 8.32 (130) |
| 5× | ∞ (8) | ∞ (34) | 47.08 (34) | 7.11 (194) | 10.38 (113) | 8.80 (122) | 8.89 (138) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1.75× | – | – | – | – | – | – | ∞ (2) |
| 2× | – | – | – | – | – | ∞ (1) | ∞ (2) |
| 2.25× | – | – | – | – | ∞ (2) | ∞ (1) | ∞ (2) |
| 2.5× | – | – | – | – | ∞ (2) | ∞ (1) | ∞ (2) |
| 2.75× | – | – | – | – | ∞ (2) | ∞ (1) | ∞ (20) |
| 3× | – | – | – | – | ∞ (6) | ∞ (3) | 5.54 (16) |
| 3.25× | – | – | – | ∞ (14) | ∞ (6) | 4.50 (15) | 5.54 (16) |
| 3.5× | – | – | ∞ (10) | ∞ (14) | 4.75 (18) | 4.50 (15) | 5.54 (16) |
| 3.75× | – | – | ∞ (10) | ∞ (14) | 4.75 (18) | 4.50 (15) | 5.54 (16) |
| 4× | – | ∞ (2) | ∞ (10) | ∞ (26) | 4.75 (18) | 4.50 (15) | 5.54 (16) |
| 4.25× | – | ∞ (2) | ∞ (10) | ∞ (26) | 4.75 (18) | 4.50 (15) | 5.54 (16) |
| 4.5× | – | ∞ (2) | ∞ (22) | ∞ (26) | 4.75 (18) | 4.50 (15) | 6.76 (20) |
| 4.75× | ∞ (8) | ∞ (2) | ∞ (22) | ∞ (26) | 4.75 (18) | 4.50 (15) | 6.76 (20) |
| 5× | ∞ (8) | ∞ (14) | ∞ (22) | 10.32 (68) | 4.75 (18) | 4.50 (15) | 6.76 (20) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1.75× | – | – | – | – | – | – | ∞ (1) |
| 2× | – | – | – | – | – | – | ∞ (1) |
| 2.25× | – | – | – | – | – | – | ∞ (1) |
| 2.5× | – | – | – | – | – | – | – |
| 2.75× | – | – | – | – | – | – | ∞ (14) |
| 3× | – | – | – | – | – | – | ∞ (7) |
| 3.25× | – | – | – | – | – | – | ∞ (3) |
| 3.5× | – | – | – | – | – | – | – |
| 3.75× | – | – | – | – | – | – | – |
| 4× | – | – | – | – | – | – | – |
| 4.25× | – | – | – | – | – | – | – |
| 4.5× | – | – | – | – | – | – | ∞ (1) |
| 4.75× | – | – | – | – | – | – | ∞ (1) |
| 5× | – | – | – | 16.20 (26) | – | – | ∞ (1) |

### Minimal — every config computed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 2.87 (101) | 2.26 (974) | 1.99 (2392) | 1.94 (4522) | 1.94 (8136) |
| 2× | 1.81 (603) | 2.37 (1999) | 2.02 (3264) | 2.05 (9695) | 2.45 (10837) |
| 2.5× | 1.82 (1439) | 2.19 (2783) | 2.10 (8019) | 2.45 (11240) | 3.05 (13170) |
| 3× | 2.60 (1229) | 2.25 (4920) | 2.86 (11085) | 3.13 (13702) | 3.40 (12847) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 2.15 (51) | 1.63 (254) | 1.71 (830) | 1.72 (893) | 1.91 (2384) |
| 2× | 1.42 (235) | 2.19 (598) | 2.01 (586) | 2.03 (2816) | 2.48 (3566) |
| 2.5× | 1.50 (633) | 2.28 (712) | 2.22 (1996) | 2.65 (2956) | 3.21 (3304) |
| 3× | 2.60 (596) | 2.78 (727) | 3.17 (2795) | 3.42 (3638) | 3.34 (3056) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 1.02 (34) | 1.17 (150) | 1.46 (494) | 1.12 (704) | 1.19 (1228) |
| 2× | 1.30 (159) | 1.14 (314) | 0.99 (436) | 1.34 (1805) | 1.76 (1937) |
| 2.5× | 1.58 (314) | 1.27 (567) | 1.08 (1177) | 1.89 (1804) | 2.79 (2399) |
| 3× | 3.62 (283) | 1.02 (832) | 2.25 (1943) | 2.98 (2629) | 3.17 (2695) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.80 (31393) | 0.81 (32249) | 0.83 (30825) | 0.89 (29046) | 0.96 (30302) | 1.02 (30018) |
| 1.5× | 0.96 (29531) | 0.93 (30302) | 0.97 (28622) | 0.99 (26613) | 0.96 (27875) | 1.08 (27287) |
| 2× | 1.03 (28032) | 0.98 (28433) | 0.96 (26921) | 1.00 (25151) | 0.97 (26548) | 1.17 (25708) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.15 (458) | 1.10 (1108) | 0.96 (899) | 1.05 (661) | 0.99 (601) | 1.12 (706) |
| 1.5× | 1.29 (1008) | 1.13 (871) | 1.01 (547) | 0.87 (503) | 0.92 (721) | 1.08 (619) |
| 2× | 1.32 (908) | 1.01 (920) | 1.05 (960) | 0.99 (713) | 0.84 (1047) | 1.16 (999) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.86 (73) | 0.71 (120) | 0.61 (90) | 0.39 (53) | 0.04 (59) | 0.53 (80) |
| 1.5× | 0.84 (132) | 1.04 (88) | 0.60 (71) | 0.38 (50) | 0.28 (66) | 0.39 (62) |
| 2× | 1.18 (136) | 0.73 (91) | 0.48 (106) | 0.37 (80) | 0.28 (114) | 0.48 (116) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.95 (9543) | 0.98 (9614) | 0.94 (9479) | 0.90 (8963) |
| 0.75× | 1.04 (8511) | 1.03 (8329) | 0.98 (8147) | 1.03 (7602) |
| 1× | 0.99 (24313) | 0.97 (23997) | 0.98 (23095) | 0.96 (21704) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.43 (26) | 0.79 (31) | 1.37 (22) | 0.39 (14) |
| 0.75× | 1.23 (180) | 1.00 (154) | 1.18 (86) | 1.30 (77) |
| 1× | 1.11 (510) | 0.96 (566) | 1.19 (273) | 1.58 (196) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.74 (13) | 0.18 (11) | 0.58 (4) | 0.58 (4) |
| 0.75× | 0.17 (16) | 0.29 (20) | 0.00 (13) | 0.36 (13) |
| 1× | 0.31 (40) | 0.41 (43) | 0.32 (24) | 0.70 (23) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.95 (8632) | 1.00 (8645) | 0.93 (8850) | 0.94 (8642) | 0.87 (8993) |
| 0.75× | 1.07 (7307) | 1.05 (7338) | 0.98 (7448) | 0.99 (7285) | 0.94 (7498) |
| 1× | 0.98 (20627) | 0.99 (20756) | 0.99 (20716) | 0.98 (20054) | 1.00 (20585) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.91 (49) | 0.31 (14) | 0.37 (18) | 1.54 (43) | 1.33 (36) |
| 0.75× | 1.63 (56) | 1.10 (75) | 1.34 (73) | 1.46 (86) | 1.24 (64) |
| 1× | 1.23 (218) | 0.99 (260) | 1.43 (216) | 1.15 (361) | 1.16 (409) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (4) | 0.89 (3) | 0.00 (3) | 0.30 (7) | 0.61 (4) |
| 0.75× | 0.61 (9) | 0.81 (5) | 0.46 (11) | 0.43 (12) | 1.22 (12) |
| 1× | 1.42 (19) | 0.32 (29) | 0.42 (33) | 0.33 (51) | 0.22 (52) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.55 (1007462) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.57 (44448) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.78 (536217) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.65 (42134) | 0.77 (19407) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.68 (40765) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.95 (18515) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 1.04 (17919) | – | – | – | – |
| 1× | – | – | – | 0.79 (443106) | – | – | – | 0.75 (56711) | 0.66 (17022) | – | 0.87 (2462) | – | 0.73 (15907) | 0.95 (14935) | 1.15 (2224) | 1.23 (2055) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.57 (562) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.67 (364) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.69 (318) | – | – | – | 0.99 (48) | – | – | – | – | – | – | – | – |

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
