# Simulated trading session — 30 symbols, 24 h pre-historic + 24 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 1m+, 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $10.00; each order volume unit = 2.0 % of the realized equity at entry ($0.01–$2.70 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T15:00 → 2026-10-06T15:00 UTC. Engine: Base 2441/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 269/19072 · PF 1.67 · Micro 104/5900 · PF 2.50 · Minimal 1806/24972 · PF 1.73 · Short 627/8176 · PF 1.60 · General 537/8176 · PF 1.53 · Long 668/8176 · PF 1.57 · Signals 126/126; Main 2426 pairs, 375318 tapes, Real seats: 10781 engine configs + 2520 signal configs (every config of the active signals), compute 911 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $10.00 → $13.22 (32.22 %, closed orders) · equity at end $12.42 (open at end: 36 positions / 6097 orders, MTM -$0.81 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 2.59 (gross profit $ ÷ gross loss $ as sized) · PF unit 2.71 (every order at one unit: the engine's PF) · 60 positions / 27011 orders (incl. 2865 capped to $0) · WR 76.86 % · DDT (closed trades, $) 6.48 h · DDR 0.14 · equity max drawdown $1.75 (15.44 %) · margin used max $9.15 · open avg 32.26 pos / 4416.52 orders (peak 36 / 8251)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 2865 orders capped to $0, 23991 scaled down (open at end: 118 capped, 5966 scaled) · binding: position cap 16181, gross cap 32083. **Without the caps:** balance $10.00 → $146.45 (1364.45 %) · PF $ 2.35 · equity at end $111.83 · equity max drawdown $134.65 (423.66 %) · margin used max $739.39 · infeasible: margin exceeded equity for 1440 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 355 | 2326  | 9.3 % | 1.646 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 355 | 2326 (+0) | 9.3 % | 1.646 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 355 | 2326 (+0) | 9.3 % | 1.646 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 341 | 2221 (-105) | 8.9 % | 1.663 |
| closes ≥ 6 | 1.00 | 6 | 1 | 640 | 3068 (+742) | 12.3 % | 2.005 |
| closes ≥ 20 | 1.00 | 20 | 1 | 216 | 1768 (-558) | 7.1 % | 1.515 |
| closes ≥ 30 | 1.00 | 30 | 1 | 143 | 1330 (-996) | 5.3 % | 1.385 |
| DDR off | 1.00 | 12 | off | 1319 | 4952 (+2626) | 19.8 % | 1.167 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 681 | 3266 (+940) | 13.1 % | 1.379 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 149 | 1165 (-1161) | 4.7 % | 2.051 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1319 | 4952 (+2626) | 19.8 % | 1.167 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1852 | 5925 (+3599) | 23.7 % | 1.237 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 1 / 630 | 383 / 247 | 1.08 | 1.87 | 61 % | $0.02 | $10.02 | $9.89 | $9.62 | 3.81 % | 0.57 | $7.01 | 32 / 2088 |
| 16:00 | 0 / 583 | 461 / 122 | 12.17 | 4.61 | 79 % | $0.21 | $10.23 | $10.15 | $9.80 | 3.81 % | 0.00 | $7.16 | 40 / 3119 |
| 17:00 | 2 / 709 | 563 / 146 | 1.09 | 4.11 | 79 % | $0.01 | $10.24 | $10.33 | $9.96 | 3.81 % | 0.00 | $7.20 | 39 / 3810 |
| 18:00 | 0 / 998 | 855 / 143 | 12.84 | 34.82 | 86 % | $0.20 | $10.44 | $10.57 | $10.29 | 3.81 % | 0.02 | $7.30 | 40 / 4354 |
| 19:00 | 3 / 1379 | 1141 / 238 | 4.70 | 3.65 | 83 % | $0.14 | $10.58 | $10.68 | $10.45 | 3.81 % | 0.00 | $7.41 | 38 / 4316 |
| 20:00 | 1 / 730 | 681 / 49 | 70.44 | 80.85 | 93 % | $0.20 | $10.78 | $11.05 | $10.64 | 3.81 % | 0.03 | $7.55 | 38 / 4481 |
| 21:00 | 0 / 958 | 891 / 67 | 109.05 | 37.53 | 93 % | $0.24 | $11.03 | $11.19 | $11.06 | 3.81 % | 0.08 | $7.72 | 40 / 4936 |
| 22:00 | 0 / 551 | 480 / 71 | 9.34 | 8.54 | 87 % | $0.12 | $11.14 | $11.12 | $11.10 | 3.81 % | 0.77 | $7.80 | 40 / 5615 |
| 23:00 | 2 / 728 | 617 / 111 | 10.48 | 9.28 | 85 % | $0.10 | $11.24 | $11.08 | $10.92 | 3.81 % | 1.77 | $7.87 | 39 / 6180 |
| 00:00 | 1 / 1400 | 981 / 419 | 0.61 | 0.97 | 70 % | -$0.05 | $11.20 | $10.74 | $10.64 | 5.97 % | 2.77 | $7.91 | 39 / 6740 |
| 01:00 | 2 / 1072 | 649 / 423 | 0.54 | 0.55 | 61 % | -$0.04 | $11.16 | $10.36 | $10.33 | 8.64 % | 3.77 | $7.84 | 39 / 8481 |
| 02:00 | 0 / 1858 | 1110 / 748 | 0.77 | 0.91 | 60 % | -$0.05 | $11.11 | $10.15 | $10.08 | 10.87 % | 4.77 | $7.88 | 40 / 9883 |
| 03:00 | 1 / 2167 | 456 / 1711 | 0.14 | 0.14 | 21 % | -$0.24 | $10.88 | $9.69 | $9.57 | 15.44 % | 5.77 | $7.78 | 39 / 10239 |
| 04:00 | 0 / 793 | 558 / 235 | 1.32 | 0.93 | 70 % | $0.02 | $10.89 | $10.08 | $9.66 | 15.44 % | 6.77 | $7.62 | 39 / 9942 |
| 05:00 | 0 / 1322 | 1162 / 160 | 18.66 | 7.91 | 88 % | $0.26 | $11.15 | $10.42 | $10.03 | 15.44 % | 7.77 | $7.81 | 39 / 9112 |
| 06:00 | 1 / 1284 | 1122 / 162 | 4.65 | 11.37 | 87 % | $0.25 | $11.40 | $10.75 | $10.11 | 15.44 % | 8.77 | $7.98 | 39 / 8421 |
| 07:00 | 3 / 1412 | 1277 / 135 | 1.89 | 6.73 | 90 % | $0.13 | $11.53 | $10.92 | $10.66 | 15.44 % | 9.77 | $8.07 | 36 / 7796 |
| 08:00 | 1 / 1222 | 1107 / 115 | 5.41 | 11.56 | 91 % | $0.26 | $11.79 | $11.18 | $10.76 | 15.44 % | 0.52 | $8.25 | 36 / 7108 |
| 09:00 | 1 / 1038 | 870 / 168 | 1.74 | 4.06 | 84 % | $0.07 | $11.86 | $11.04 | $10.51 | 15.44 % | 1.52 | $8.31 | 37 / 6741 |
| 10:00 | 1 / 614 | 482 / 132 | 1.39 | 2.13 | 79 % | $0.03 | $11.89 | $11.52 | $10.98 | 15.44 % | 0.00 | $8.35 | 36 / 6739 |
| 11:00 | 1 / 1203 | 1059 / 144 | 2.08 | 3.63 | 88 % | $0.20 | $12.09 | $11.34 | $11.09 | 15.44 % | 0.37 | $8.46 | 37 / 6153 |
| 12:00 | 0 / 1289 | 1157 / 132 | 5.83 | 7.13 | 90 % | $0.33 | $12.41 | $11.75 | $11.30 | 15.44 % | 1.37 | $8.69 | 37 / 5846 |
| 13:00 | 0 / 954 | 749 / 205 | 1.48 | 2.27 | 79 % | $0.06 | $12.47 | $11.77 | $11.33 | 15.44 % | 2.37 | $8.73 | 37 / 6862 |
| 14:00 | 1 / 2117 | 1949 / 168 | 31.92 | 34.01 | 92 % | $0.75 | $13.22 | $12.42 | $11.54 | 15.44 % | 0.27 | $9.15 | 36 / 6097 |

**Last hour (14:00):** open at end: 36 positions / 6097 orders, MTM -$0.81 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $12.42 = balance $13.22 + MTM -$0.81.

**Hours positive:** 20 of 24 full hours · flat 0 · negative 4

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m | 1m+ | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 31 · 146.88 · $0.05 | 258 · 13.44 · $0.05 | 103 · 0.04 · -$0.13 | 35 · 0.04 · -$0.05 | 183 · 16.03 · $0.10 | 15 · 0.94 · -$0.00 | 5 · 0.00 · -$0.00 |
| 16:00 | 82 · 58.87 · $0.04 | 198 · 10.03 · $0.05 | 52 · 15.02 · $0.01 | 18 · 44.30 · $0.01 | 198 · 9.74 · $0.11 | 31 · 11.67 · $0.01 | 4 · ∞ (no loss) · $0.00 |
| 17:00 | 191 · 4.16 · $0.03 | 364 · 14.67 · $0.04 | 23 · 1.42 · $0.00 | 33 · 20.38 · $0.00 | 64 · 228.04 · $0.03 | 34 · 0.03 · -$0.09 | – |
| 18:00 | 111 · 4.57 · $0.02 | 413 · 4.23 · $0.03 | 62 · 19.64 · $0.01 | 25 · 168.35 · $0.01 | 357 · 94.65 · $0.13 | 2 · ∞ (no loss) · $0.00 | 28 · ∞ (no loss) · $0.00 |
| 19:00 | 410 · 40.79 · $0.03 | 489 · 14.98 · $0.06 | 193 · 6.81 · $0.00 | 79 · 29.88 · $0.01 | 201 · 8.79 · $0.06 | 3 · 0.00 · -$0.03 | 4 · ∞ (no loss) · $0.00 |
| 20:00 | 142 · 107.06 · $0.04 | 208 · 1357.09 · $0.03 | 63 · 56.32 · $0.02 | 58 · 1473.01 · $0.01 | 229 · 44.52 · $0.09 | 22 · ∞ (no loss) · $0.01 | 8 · 281.93 · $0.00 |
| 21:00 | 167 · 79.73 · $0.06 | 293 · 37.18 · $0.04 | 100 · 181.67 · $0.01 | 108 · 431.77 · $0.02 | 237 · 943.44 · $0.11 | 6 · 0.00 · -$0.00 | 47 · 237.23 · $0.00 |
| 22:00 | 87 · 5.14 · $0.01 | 208 · 15.72 · $0.03 | 42 · 688.90 · $0.01 | 55 · 275.18 · $0.03 | 122 · 3.75 · $0.03 | 6 · ∞ (no loss) · $0.00 | 31 · ∞ (no loss) · $0.00 |
| 23:00 | 207 · 8.50 · $0.01 | 227 · 6.47 · $0.04 | 71 · 26.87 · $0.01 | 64 · 13.43 · $0.01 | 119 · 304.23 · $0.03 | 30 · 216.28 · $0.00 | 10 · ∞ (no loss) · $0.00 |
| 00:00 | 487 · 0.15 · -$0.03 | 244 · 1.84 · $0.02 | 282 · 0.39 · -$0.01 | 105 · 0.03 · -$0.01 | 262 · 0.65 · -$0.01 | 6 · ∞ (no loss) · $0.00 | 14 · 6.04 · $0.00 |
| 01:00 | 257 · 0.16 · -$0.01 | 194 · 0.54 · -$0.00 | 292 · 1.41 · $0.01 | 71 · 0.02 · -$0.03 | 198 · 0.68 · -$0.01 | 8 · ∞ (no loss) · $0.00 | 52 · 183.13 · $0.00 |
| 02:00 | 415 · 0.79 · -$0.00 | 444 · 0.28 · -$0.03 | 168 · 0.61 · -$0.00 | 109 · 0.03 · -$0.04 | 547 · 7.65 · $0.12 | 61 · 0.00 · -$0.08 | 114 · 0.03 · -$0.01 |
| 03:00 | 262 · 0.02 · -$0.08 | 1162 · 0.18 · -$0.02 | 142 · 0.14 · -$0.02 | 80 · 0.05 · -$0.01 | 403 · 0.59 · -$0.02 | 86 · 0.01 · -$0.08 | 32 · 0.35 · -$0.00 |
| 04:00 | 57 · 5.68 · $0.01 | 338 · 1.54 · $0.01 | 55 · 7.04 · $0.00 | 37 · 1.50 · $0.00 | 282 · 0.77 · -$0.01 | 6 · 0.35 · -$0.00 | 18 · 0.38 · -$0.00 |
| 05:00 | 103 · 2.57 · $0.00 | 249 · 1.63 · $0.00 | 60 · 4.82 · $0.00 | 51 · 0.87 · -$0.00 | 813 · 48.65 · $0.24 | 9 · ∞ (no loss) · $0.00 | 37 · 502.36 · $0.01 |
| 06:00 | 112 · 1.46 · $0.01 | 280 · 0.45 · -$0.02 | 102 · 20.99 · $0.03 | 50 · 0.46 · -$0.01 | 619 · 41.50 · $0.23 | 70 · 10.65 · $0.01 | 51 · 2.00 · $0.00 |
| 07:00 | 118 · 0.10 · -$0.01 | 247 · 1.73 · $0.00 | 42 · 0.26 · -$0.00 | 26 · 0.98 · -$0.00 | 690 · 2.71 · $0.16 | 210 · 0.08 · -$0.03 | 79 · 5.07 · $0.01 |
| 08:00 | 87 · 0.17 · -$0.01 | 231 · 5.65 · $0.01 | 109 · 0.14 · -$0.02 | 14 · 5.69 · $0.00 | 723 · 13.13 · $0.27 | 34 · 49.23 · $0.01 | 24 · 1.26 · $0.00 |
| 09:00 | 69 · 47.47 · $0.00 | 425 · 7.88 · $0.01 | 44 · 0.37 · -$0.00 | 86 · 0.09 · -$0.03 | 343 · 2.41 · $0.08 | 51 · 2.03 · $0.00 | 20 · 12.81 · $0.00 |
| 10:00 | 25 · 2.78 · $0.00 | 82 · 324.14 · $0.01 | 44 · 4.97 · $0.00 | 22 · 0.29 · -$0.00 | 347 · 1.41 · $0.03 | 27 · 0.84 · -$0.00 | 67 · 0.04 · -$0.00 |
| 11:00 | 37 · 43.90 · $0.00 | 24 · 28641284658579.54 · $0.00 | 10 · ∞ (no loss) · $0.00 | 10 · 491.79 · $0.00 | 1061 · 2.05 · $0.18 | 47 · 3.03 · $0.01 | 14 · 0.53 · -$0.00 |
| 12:00 | 33 · ∞ (no loss) · $0.01 | 174 · ∞ (no loss) · $0.01 | 39 · 5958.63 · $0.00 | 36 · ∞ (no loss) · $0.00 | 845 · 6.30 · $0.30 | 69 · 0.88 · -$0.00 | 93 · 14.41 · $0.01 |
| 13:00 | 60 · 53.96 · $0.00 | 297 · 0.47 · -$0.01 | 30 · 0.68 · -$0.00 | 43 · 412.66 · $0.01 | 467 · 1.36 · $0.04 | 31 · ∞ (no loss) · $0.01 | 26 · 1.83 · $0.00 |
| 14:00 | 169 · ∞ (no loss) · $0.01 | 513 · 121.72 · $0.02 | 71 · 151.72 · $0.01 | 82 · 132.98 · $0.04 | 1192 · 29.17 · $0.65 | 72 · 29.97 · $0.02 | 18 · ∞ (no loss) · $0.01 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 630 | 198 · 1.53 · 80 % · $0.04 | 370 · 0.43 · 45 % · -$0.08 | 15 · ∞ (no loss) · 100 % · $0.02 | 47 · 7.55 · 89 % · $0.04 | – | 62 · 10.24 · 92 % · $0.06 |
| 16:00 | 583 | 217 · 47.28 · 95 % · $0.11 | 211 · 8.36 · 64 % · $0.03 | 32 · 7.81 · 91 % · $0.02 | 123 · 6.40 · 72 % · $0.05 | – | 155 · 6.70 · 76 % · $0.07 |
| 17:00 | 709 | 314 · 0.91 · 93 % · -$0.01 | 331 · 0.63 · 65 % · -$0.02 | 14 · ∞ (no loss) · 100 % · $0.01 | 50 · 179.77 · 86 % · $0.03 | – | 64 · 228.04 · 89 % · $0.03 |
| 18:00 | 998 | 296 · 5.35 · 98 % · $0.04 | 352 · 5.54 · 66 % · $0.03 | 87 · ∞ (no loss) · 100 % · $0.04 | 263 · 65.94 · 94 % · $0.09 | – | 350 · 93.98 · 95 % · $0.13 |
| 19:00 | 1379 | 465 · 2.63 · 84 % · $0.03 | 730 · 5.53 · 81 % · $0.06 | 31 · 4.76 · 94 % · $0.01 | 153 · 11.11 · 87 % · $0.04 | – | 184 · 8.58 · 88 % · $0.06 |
| 20:00 | 730 | 250 · ∞ (no loss) · 100 % · $0.07 | 252 · 52.88 · 85 % · $0.04 | 60 · 20.35 · 98 % · $0.04 | 168 · 259.55 · 93 % · $0.05 | – | 228 · 44.06 · 95 % · $0.09 |
| 21:00 | 958 | 307 · 49.83 · 98 % · $0.04 | 425 · 78.14 · 88 % · $0.10 | 39 · ∞ (no loss) · 100 % · $0.02 | 187 · 686.10 · 94 % · $0.08 | – | 226 · 897.93 · 95 % · $0.10 |
| 22:00 | 551 | 164 · 13.71 · 96 % · $0.04 | 267 · 41.19 · 83 % · $0.05 | 23 · 0.89 · 83 % · -$0.00 | 97 · 7.74 · 85 % · $0.03 | – | 120 · 3.71 · 84 % · $0.03 |
| 23:00 | 728 | 181 · 4.37 · 92 % · $0.02 | 429 · 12.69 · 80 % · $0.06 | 28 · ∞ (no loss) · 100 % · $0.01 | 90 · 202.04 · 87 % · $0.02 | – | 118 · 303.97 · 90 % · $0.03 |
| 00:00 | 1400 | 354 · 0.33 · 67 % · -$0.03 | 788 · 0.86 · 69 % · -$0.01 | 38 · 0.67 · 87 % · -$0.00 | 220 · 0.64 · 78 % · -$0.01 | – | 258 · 0.65 · 79 % · -$0.01 |
| 01:00 | 1072 | 314 · 0.68 · 54 % · -$0.01 | 588 · 0.47 · 60 % · -$0.02 | 17 · 1.50 · 88 % · $0.00 | 153 · 0.40 · 75 % · -$0.01 | – | 170 · 0.49 · 76 % · -$0.01 |
| 02:00 | 1858 | 537 · 0.10 · 42 % · -$0.12 | 895 · 0.28 · 57 % · -$0.05 | 103 · 10.34 · 92 % · $0.04 | 323 · 11.62 · 86 % · $0.08 | – | 426 · 11.11 · 88 % · $0.12 |
| 03:00 | 2167 | 689 · 0.04 · 16 % · -$0.15 | 1223 · 0.08 · 15 % · -$0.08 | 79 · 0.61 · 66 % · -$0.01 | 176 · 0.87 · 61 % · -$0.00 | – | 255 · 0.73 · 62 % · -$0.01 |
| 04:00 | 793 | 358 · 3.03 · 87 % · $0.03 | 208 · 0.48 · 43 % · -$0.01 | 37 · 0.83 · 73 % · -$0.00 | 190 · 0.68 · 68 % · -$0.01 | – | 227 · 0.72 · 69 % · -$0.01 |
| 05:00 | 1322 | 224 · 4.34 · 85 % · $0.01 | 372 · 2.60 · 70 % · $0.01 | 213 · 22.35 · 98 % · $0.07 | 513 · 193.02 · 98 % · $0.17 | – | 726 · 60.65 · 98 % · $0.24 |
| 06:00 | 1284 | 388 · 1.75 · 92 % · $0.01 | 472 · 2.31 · 78 % · $0.06 | 87 · 36.55 · 99 % · $0.05 | 337 · 31.41 · 91 % · $0.13 | – | 424 · 32.60 · 93 % · $0.18 |
| 07:00 | 1412 | 621 · 0.56 · 92 % · -$0.02 | 357 · 0.79 · 90 % · -$0.00 | 106 · 1.80 · 91 % · $0.02 | 328 · 2.98 · 88 % · $0.13 | – | 434 · 2.60 · 89 % · $0.15 |
| 08:00 | 1222 | 197 · 1.39 · 85 % · $0.01 | 348 · 0.60 · 92 % · -$0.01 | 144 · 12.12 · 98 % · $0.07 | 533 · 13.02 · 90 % · $0.19 | – | 677 · 12.78 · 91 % · $0.26 |
| 09:00 | 1038 | 38 · 1.86 · 68 % · $0.00 | 698 · 0.65 · 85 % · -$0.01 | 27 · 1.06 · 70 % · $0.00 | 275 · 3.20 · 84 % · $0.08 | – | 302 · 2.37 · 83 % · $0.08 |
| 10:00 | 614 | 245 · 1.99 · 77 % · $0.01 | 53 · 0.28 · 36 % · -$0.00 | 115 · 1.58 · 97 % · $0.01 | 201 · 1.32 · 81 % · $0.02 | – | 316 · 1.40 · 87 % · $0.03 |
| 11:00 | 1203 | 98 · 2.69 · 79 % · $0.01 | 84 · 2.34 · 86 % · $0.01 | 208 · 1.96 · 92 % · $0.04 | 813 · 2.07 · 88 % · $0.14 | – | 1021 · 2.04 · 89 % · $0.18 |
| 12:00 | 1289 | 312 · 1.59 · 83 % · $0.01 | 209 · 4.90 · 88 % · $0.02 | 176 · 5.84 · 96 % · $0.06 | 592 · 7.77 · 92 % · $0.24 | – | 768 · 7.25 · 93 % · $0.30 |
| 13:00 | 954 | 154 · 1.77 · 73 % · $0.01 | 426 · 0.47 · 72 % · -$0.01 | 78 · 1.34 · 90 % · $0.01 | 296 · 2.03 · 87 % · $0.05 | – | 374 · 1.80 · 88 % · $0.06 |
| 14:00 | 2117 | 324 · 29.38 · 96 % · $0.06 | 642 · 107.62 · 84 % · $0.05 | 314 · 27.24 · 99 % · $0.16 | 837 · 31.76 · 94 % · $0.48 | – | 1151 · 30.48 · 96 % · $0.65 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 2315 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (375318 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (18955); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 122947 · 0.72 | 21580 · 1.02 | 48960 · 0.79 | 4106 · 1.70 | 630 · 1.87 | 198 · 1.93 | 370 · 1.06 | – | 62 · 65.12 |
| 16:00 | 146488 · 0.60 | 25063 · 0.71 | 56131 · 0.60 | 4780 · 1.85 | 583 · 4.61 | 217 · 6.15 | 211 · 3.89 | – | 155 · 4.13 |
| 17:00 | 123311 · 0.59 | 23302 · 0.79 | 50190 · 0.54 | 3849 · 1.74 | 709 · 4.11 | 314 · 5.34 | 331 · 1.88 | – | 64 · 212.84 |
| 18:00 | 130133 · 0.88 | 24540 · 1.05 | 55368 · 1.09 | 4801 · 2.25 | 998 · 34.82 | 296 · 22.61 | 352 · 10.61 | – | 350 · 105.95 |
| 19:00 | 140070 · 0.52 | 26612 · 0.60 | 51934 · 0.59 | 5606 · 1.02 | 1379 · 3.65 | 465 · 2.31 | 730 · 3.64 | – | 184 · 7.90 |
| 20:00 | 135656 · 0.78 | 25832 · 1.15 | 55219 · 0.79 | 5145 · 1.11 | 730 · 80.85 | 250 · ∞ (no loss) | 252 · 73.58 | – | 228 · 56.81 |
| 21:00 | 111555 · 1.20 | 22760 · 1.29 | 48721 · 1.45 | 4676 · 2.50 | 958 · 37.53 | 307 · 16.29 | 425 · 30.64 | – | 226 · 436.25 |
| 22:00 | 97606 · 0.93 | 18078 · 1.04 | 39380 · 1.31 | 4622 · 1.87 | 551 · 8.54 | 164 · 11.84 | 267 · 12.94 | – | 120 · 5.12 |
| 23:00 | 87917 · 0.70 | 15807 · 0.77 | 36132 · 0.82 | 3599 · 1.33 | 728 · 9.28 | 181 · 4.43 | 429 · 6.76 | – | 118 · 260.66 |
| 00:00 | 167106 · 0.82 | 30863 · 1.02 | 68326 · 0.95 | 7843 · 0.62 | 1400 · 0.97 | 354 · 0.67 | 788 · 1.09 | – | 258 · 1.21 |
| 01:00 | 163749 · 0.87 | 30906 · 1.27 | 65663 · 0.89 | 7069 · 0.62 | 1072 · 0.55 | 314 · 0.40 | 588 · 0.51 | – | 170 · 1.11 |
| 02:00 | 176653 · 0.63 | 36079 · 0.90 | 69993 · 0.86 | 6455 · 1.91 | 1858 · 0.91 | 537 · 0.26 | 895 · 0.53 | – | 426 · 9.07 |
| 03:00 | 195276 · 0.45 | 36526 · 0.38 | 78142 · 0.57 | 6900 · 0.46 | 2167 · 0.14 | 689 · 0.07 | 1223 · 0.06 | – | 255 · 0.85 |
| 04:00 | 164441 · 0.90 | 24493 · 0.85 | 69183 · 1.35 | 5355 · 1.40 | 793 · 0.93 | 358 · 2.35 | 208 · 0.29 | – | 227 · 0.85 |
| 05:00 | 145843 · 0.80 | 32497 · 1.13 | 60157 · 1.07 | 7260 · 2.92 | 1322 · 7.91 | 224 · 2.79 | 372 · 1.30 | – | 726 · 33.09 |
| 06:00 | 205951 · 0.85 | 37064 · 1.18 | 78897 · 0.99 | 7901 · 2.09 | 1284 · 11.37 | 388 · 8.53 | 472 · 4.93 | – | 424 · 33.35 |
| 07:00 | 248028 · 0.95 | 61037 · 1.24 | 103977 · 1.28 | 11923 · 1.78 | 1412 · 6.73 | 621 · 7.37 | 357 · 12.24 | – | 434 · 4.39 |
| 08:00 | 254357 · 0.99 | 57658 · 0.98 | 117144 · 1.24 | 12886 · 2.45 | 1222 · 11.56 | 197 · 2.60 | 348 · 10.80 | – | 677 · 19.51 |
| 09:00 | 223628 · 1.05 | 37438 · 0.90 | 113373 · 1.25 | 11531 · 2.42 | 1038 · 4.06 | 38 · 1.41 | 698 · 6.09 | – | 302 · 3.40 |
| 10:00 | 189581 · 0.68 | 45236 · 0.97 | 72208 · 0.64 | 8417 · 1.46 | 614 · 2.13 | 245 · 1.33 | 53 · 0.26 | – | 316 · 4.26 |
| 11:00 | 239629 · 0.95 | 56093 · 0.91 | 108690 · 1.26 | 12419 · 1.82 | 1203 · 3.63 | 98 · 2.92 | 84 · 5.93 | – | 1021 · 3.57 |
| 12:00 | 292725 · 0.62 | 62777 · 0.63 | 124985 · 0.78 | 11328 · 1.20 | 1289 · 7.13 | 312 · 3.11 | 209 · 8.85 | – | 768 · 9.40 |
| 13:00 | 268326 · 0.99 | 59008 · 1.19 | 110489 · 0.80 | 11488 · 1.72 | 954 · 2.27 | 154 · 1.15 | 426 · 1.25 | – | 374 · 4.55 |
| 14:00 | 285074 · 0.63 | 63191 · 0.79 | 116871 · 0.67 | 14511 · 1.85 | 2117 · 34.01 | 324 · 33.04 | 642 · 14.52 | – | 1151 · 43.34 |
| **total** | **4316050 · 0.78** | **874440 · 0.91** | **1800133 · 0.92** | **184470 · 1.54** | **27011 · 2.71** | **7245 · 1.46** | **10730 · 1.45** | **–** | **9036 · 6.77** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 7245 | 5523 / 1722 | 1.33 | 1.46 | $0.22 | 76.23 % | 14.58 |
| Trailing | 10730 | 7165 / 3565 | 1.35 | 1.45 | $0.22 | 66.78 % | 14.73 |
| Signal · Normal | 2071 | 1943 / 128 | 4.00 | 5.39 | $0.68 | 93.82 % | 2.00 |
| Signal · Trailing | 6965 | 6129 / 836 | 5.06 | 7.43 | $2.10 | 88.00 % | 1.75 |
| total | 27011 | 20760 / 6251 | 2.59 | 2.71 | $3.22 | 76.86 % | 6.48 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 9036 | 8072 / 964 | 4.73 | 6.77 | $2.79 | 89.33 % | 2.00 |
| of which Engine (no signals) | 17975 | 12688 / 5287 | 1.34 | 1.46 | $0.44 | 70.59 % | 14.73 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m | 3719 | 1.94 | 1.77 | $0.19 |
| 1m+ | 7562 | 2.90 | 1.24 | $0.38 |
| 5m | 2199 | 0.72 | 0.78 | -$0.07 |
| 5m+ | 1297 | 0.83 | 0.83 | -$0.04 |
| 15m | 10502 | 4.63 | 5.85 | $2.93 |
| 15m+ | 936 | 0.36 | 2.42 | -$0.22 |
| 30m | 796 | 2.12 | 1.52 | $0.04 |

A 24 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 100 | 67 / 33 | 0.33 | 0.67 | -$0.01 | 67.00 % | 14.92 |
| Minimal | 15453 | 10866 / 4587 | 1.40 | 1.21 | $0.41 | 70.32 % | 14.73 |
| Short | 1324 | 1006 / 318 | 1.18 | 2.71 | $0.02 | 75.98 % | 13.50 |
| General | 508 | 335 / 173 | 1.01 | 2.13 | $0.00 | 65.94 % | 13.00 |
| Long | 590 | 414 / 176 | 1.18 | 2.40 | $0.01 | 70.17 % | 12.50 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 9036 | 8072 / 964 | 4.73 | 6.77 | $2.79 | 89.33 % | 2.00 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Minimal | 96166 | lastN 45998 · engineSide 33138 · symPf 13251 · duplicate 3779 |
| Signals | 60263 | sig:duplicate 26281 · sig:signalPf 13300 · sig:confirm 10567 · sig:signalSide 6735 · sig:signalCluster 3380 |
| Short | 6726 | lastN 4058 · engineSide 1299 · duplicate 694 · symPf 675 |
| Long | 3017 | lastN 1924 · duplicate 397 · engineSide 396 · symPf 300 |
| Micro | 2536 | engineSide 1033 · crowd 877 · lastN 595 · symPf 18 · duplicate 13 |
| General | 2176 | lastN 1442 · engineSide 257 · duplicate 242 · symPf 235 |
| Wide | 1546 | engineSide 694 · lastN 648 · symPf 204 |

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
| Micro | 2.50 | 0.67 | 0.27 | 0.33 | 0.50 | 100 |
| Minimal | 1.73 | 1.21 | 0.70 | 1.40 | 1.16 | 15453 |
| Short | 1.60 | 2.71 | 1.69 | 1.18 | 0.44 | 1324 |
| General | 1.53 | 2.13 | 1.39 | 1.01 | 0.47 | 508 |
| Long | 1.57 | 2.40 | 1.53 | 1.18 | 0.49 | 590 |
| Wide | 1.67 | – | – | – | – | 0 |
| Signals | – | 6.77 | – | 4.73 | 0.70 | 9036 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (16538 of 309593 evaluated, 372798 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3395 units active at the run start, 5381 over the run, 2417 of 2520 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 911 | 259 (28 %) | 1073 | 75 % | 0.48 | -248.10 |
| Micro | trailing | 812 | 150 (18 %) | 1201 | 55 % | 0.28 | -411.50 |
| Minimal | normal | 3929 | 1809 (46 %) | 49026 | 73 % | 0.94 | -2856.01 |
| Minimal | trailing | 5827 | 2448 (42 %) | 69642 | 63 % | 0.92 | -3943.66 |
| Short | normal | 754 | 444 (59 %) | 2344 | 66 % | 1.16 | 435.88 |
| Short | trailing | 1580 | 1075 (68 %) | 4687 | 65 % | 1.98 | 3822.92 |
| General | normal | 472 | 284 (60 %) | 1295 | 47 % | 1.02 | 32.93 |
| General | trailing | 375 | 204 (54 %) | 1024 | 55 % | 1.11 | 173.30 |
| Long | normal | 802 | 424 (53 %) | 1762 | 51 % | 1.26 | 963.24 |
| Long | trailing | 636 | 240 (38 %) | 1442 | 55 % | 0.87 | -437.65 |
| Wide | axis | 440 | 116 (26 %) | 2587 | 30 % | 0.69 | -556.63 |
| Signals | normal | 602 | 557 (93 %) | 10888 | 88 % | 2.60 | 20466.40 |
| Signals | trailing | 1815 | 1728 (95 %) | 37499 | 84 % | 3.33 | 67406.84 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1723 | 409 (24 %) | 2274 | 65 % | 0.37 | -659.60 |
| Minimal | active | 1876 | 837 (45 %) | 9643 | 68 % | 1.05 | 413.10 |
| Minimal | bollinger | 480 | 359 (75 %) | 8000 | 72 % | 1.28 | 1157.25 |
| Minimal | break | 1522 | 507 (33 %) | 16665 | 66 % | 0.78 | -3235.39 |
| Minimal | channel | 140 | 57 (41 %) | 2721 | 71 % | 1.21 | 399.99 |
| Minimal | direction | 202 | 37 (18 %) | 3178 | 58 % | 0.58 | -1630.37 |
| Minimal | ema | 308 | 38 (12 %) | 6174 | 64 % | 0.70 | -1892.78 |
| Minimal | ichimoku | 137 | 40 (29 %) | 2650 | 66 % | 0.75 | -675.21 |
| Minimal | macd | 383 | 183 (48 %) | 2680 | 62 % | 0.70 | -728.06 |
| Minimal | move | 1068 | 481 (45 %) | 5954 | 60 % | 0.79 | -1183.96 |
| Minimal | osc | 1733 | 965 (56 %) | 37737 | 71 % | 1.14 | 3662.67 |
| Minimal | rsi | 463 | 139 (30 %) | 8192 | 61 % | 0.79 | -1424.43 |
| Minimal | sar | 203 | 101 (50 %) | 1118 | 63 % | 0.88 | -102.48 |
| Minimal | smooth | 347 | 90 (26 %) | 3027 | 52 % | 0.46 | -1830.62 |
| Minimal | trend | 467 | 161 (34 %) | 5999 | 66 % | 0.87 | -661.68 |
| Minimal | volume | 427 | 262 (61 %) | 4930 | 72 % | 1.31 | 932.30 |
| Short | active | 94 | 22 (23 %) | 185 | 38 % | 0.45 | -284.13 |
| Short | bollinger | 35 | 33 (94 %) | 107 | 77 % | 7.86 | 192.22 |
| Short | break | 286 | 121 (42 %) | 464 | 54 % | 0.73 | -187.30 |
| Short | channel | 67 | 3 (4 %) | 83 | 35 % | 0.32 | -114.30 |
| Short | direction | 60 | 0 (0 %) | 74 | 24 % | 0.17 | -193.50 |
| Short | ichimoku | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 64 | 33 (52 %) | 376 | 67 % | 1.10 | 42.60 |
| Short | move | 978 | 757 (77 %) | 3336 | 65 % | 1.73 | 2322.90 |
| Short | osc | 378 | 313 (83 %) | 1767 | 72 % | 2.95 | 1943.58 |
| Short | rsi | 34 | 18 (53 %) | 145 | 59 % | 1.17 | 27.39 |
| Short | sar | 8 | 0 (0 %) | 16 | 50 % | 0.49 | -14.52 |
| Short | smooth | 99 | 81 (82 %) | 100 | 93 % | 47.75 | 175.39 |
| Short | trend | 80 | 39 (49 %) | 180 | 65 % | 1.44 | 77.41 |
| Short | volume | 149 | 99 (66 %) | 198 | 77 % | 6.49 | 271.04 |
| General | active | 32 | 26 (81 %) | 69 | 46 % | 1.17 | 21.13 |
| General | break | 128 | 34 (27 %) | 248 | 38 % | 0.69 | -144.80 |
| General | channel | 44 | 8 (18 %) | 128 | 45 % | 0.63 | -94.39 |
| General | direction | 8 | 0 (0 %) | 21 | 24 % | 0.28 | -29.88 |
| General | ichimoku | 6 | 0 (0 %) | 52 | 23 % | 0.21 | -100.65 |
| General | macd | 19 | 8 (42 %) | 96 | 57 % | 1.28 | 31.58 |
| General | move | 356 | 252 (71 %) | 975 | 52 % | 1.15 | 227.20 |
| General | osc | 120 | 85 (71 %) | 398 | 62 % | 1.79 | 343.12 |
| General | rsi | 6 | 0 (0 %) | 27 | 33 % | 0.22 | -55.03 |
| General | sar | 5 | 4 (80 %) | 9 | 44 % | 0.93 | -1.20 |
| General | smooth | 25 | 17 (68 %) | 22 | 86 % | 9.08 | 56.59 |
| General | trend | 19 | 12 (63 %) | 134 | 45 % | 0.56 | -118.37 |
| General | volume | 79 | 42 (53 %) | 140 | 51 % | 1.52 | 70.94 |
| Long | active | 48 | 13 (27 %) | 83 | 47 % | 0.83 | -38.52 |
| Long | break | 203 | 54 (27 %) | 551 | 42 % | 0.61 | -535.18 |
| Long | channel | 63 | 5 (8 %) | 66 | 29 % | 0.53 | -80.38 |
| Long | direction | 38 | 3 (8 %) | 54 | 37 % | 0.64 | -67.94 |
| Long | ema | 8 | 4 (50 %) | 20 | 80 % | 2.36 | 33.73 |
| Long | macd | 35 | 8 (23 %) | 62 | 39 % | 0.57 | -77.75 |
| Long | move | 513 | 334 (65 %) | 1500 | 52 % | 1.06 | 192.86 |
| Long | osc | 314 | 159 (51 %) | 635 | 65 % | 1.78 | 895.09 |
| Long | rsi | 16 | 0 (0 %) | 3 | 67 % | 0.99 | -0.04 |
| Long | sar | 6 | 4 (67 %) | 10 | 40 % | 1.00 | -0.00 |
| Long | smooth | 20 | 3 (15 %) | 4 | 100 % | ∞ (no loss) | 20.80 |
| Long | trend | 29 | 8 (28 %) | 22 | 73 % | 3.21 | 60.09 |
| Long | volume | 145 | 69 (48 %) | 194 | 58 % | 1.38 | 122.82 |
| Wide | active | 80 | 7 (9 %) | 284 | 48 % | 0.73 | -56.39 |
| Wide | bollinger | 24 | 9 (38 %) | 129 | 21 % | 0.32 | -61.48 |
| Wide | break | 21 | 6 (29 %) | 398 | 27 % | 0.53 | -186.51 |
| Wide | channel | 24 | 6 (25 %) | 90 | 23 % | 0.60 | -27.09 |
| Wide | direction | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 |
| Wide | ema | 9 | 0 (0 %) | 6 | 50 % | 0.74 | -1.33 |
| Wide | macd | 3 | 3 (100 %) | 12 | 100 % | ∞ (no loss) | 17.66 |
| Wide | move | 106 | 21 (20 %) | 289 | 31 % | 0.99 | -1.84 |
| Wide | osc | 103 | 36 (35 %) | 1076 | 27 % | 0.67 | -198.82 |
| Wide | rsi | 7 | 0 (0 %) | 182 | 23 % | 0.74 | -26.43 |
| Wide | sar | 18 | 3 (17 %) | 3 | 100 % | ∞ (no loss) | 4.55 |
| Wide | smooth | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 30.55 |
| Wide | trend | 12 | 3 (25 %) | 45 | 40 % | 0.39 | -31.42 |
| Wide | volume | 8 | 0 (0 %) | 45 | 33 % | 0.49 | -13.88 |
| Signals | signal:act-burst | 40 | 40 (100 %) | 948 | 85 % | 4.34 | 1887.86 |
| Signals | signal:act-hf | 40 | 40 (100 %) | 1164 | 80 % | 2.41 | 1710.20 |
| Signals | signal:adx | 40 | 39 (98 %) | 532 | 86 % | 4.35 | 1143.93 |
| Signals | signal:atr-break | 40 | 40 (100 %) | 1048 | 83 % | 2.99 | 1840.98 |
| Signals | signal:bollinger | 40 | 40 (100 %) | 656 | 88 % | 3.13 | 1299.06 |
| Signals | signal:cci | 40 | 40 (100 %) | 764 | 85 % | 2.65 | 1231.79 |
| Signals | signal:cmf | 40 | 39 (98 %) | 1189 | 84 % | 2.30 | 1718.66 |
| Signals | signal:donchian | 40 | 40 (100 %) | 816 | 84 % | 3.11 | 1576.30 |
| Signals | signal:ema-cross | 40 | 39 (98 %) | 570 | 89 % | 7.20 | 1453.78 |
| Signals | signal:ema-cross-fast | 40 | 40 (100 %) | 746 | 89 % | 5.32 | 1787.40 |
| Signals | signal:ema-pullback | 40 | 40 (100 %) | 971 | 88 % | 5.19 | 2254.83 |
| Signals | signal:ema-slope | 40 | 40 (100 %) | 693 | 89 % | 6.47 | 1716.49 |
| Signals | signal:ema-trend | 40 | 40 (100 %) | 838 | 86 % | 3.04 | 1602.08 |
| Signals | signal:heikin-ashi | 40 | 40 (100 %) | 1459 | 82 % | 2.18 | 1902.63 |
| Signals | signal:hma | 40 | 40 (100 %) | 971 | 88 % | 5.65 | 2257.32 |
| Signals | signal:ichimoku | 40 | 40 (100 %) | 761 | 85 % | 2.65 | 1254.80 |
| Signals | signal:impulse | 40 | 40 (100 %) | 989 | 87 % | 6.05 | 2422.79 |
| Signals | signal:kama | 40 | 40 (100 %) | 1159 | 82 % | 1.94 | 1401.41 |
| Signals | signal:keltner | 40 | 40 (100 %) | 710 | 91 % | 7.95 | 1911.12 |
| Signals | signal:macd-cross | 40 | 40 (100 %) | 1192 | 87 % | 6.02 | 2734.34 |
| Signals | signal:macd-hist | 40 | 40 (100 %) | 1420 | 83 % | 3.57 | 2618.27 |
| Signals | signal:macd-slow | 40 | 40 (100 %) | 1069 | 87 % | 4.46 | 2271.65 |
| Signals | signal:mfi | 18 | 18 (100 %) | 85 | 95 % | 1115.83 | 213.68 |
| Signals | signal:obv | 40 | 40 (100 %) | 1040 | 84 % | 2.31 | 1478.94 |
| Signals | signal:r-awesome | 40 | 39 (98 %) | 838 | 84 % | 3.10 | 1325.35 |
| Signals | signal:r-connors | 40 | 28 (70 %) | 376 | 81 % | 1.64 | 374.94 |
| Signals | signal:r-fractal | 40 | 40 (100 %) | 738 | 84 % | 3.76 | 1505.13 |
| Signals | signal:r-inside | 32 | 32 (100 %) | 175 | 94 % | 46.39 | 508.17 |
| Signals | signal:r-linreg | 40 | 40 (100 %) | 839 | 85 % | 2.33 | 1326.90 |
| Signals | signal:r-nr-break | 40 | 35 (88 %) | 1193 | 82 % | 1.94 | 1430.32 |
| Signals | signal:r-session-trend | 40 | 40 (100 %) | 506 | 87 % | 6.84 | 1199.56 |
| Signals | signal:r-vol-regime | 40 | 36 (90 %) | 696 | 79 % | 2.05 | 902.35 |
| Signals | signal:reclaim | 40 | 40 (100 %) | 884 | 86 % | 2.88 | 1530.39 |
| Signals | signal:rsi-mid | 40 | 40 (100 %) | 1073 | 88 % | 3.81 | 2082.58 |
| Signals | signal:rsi-momentum | 20 | 19 (95 %) | 120 | 78 % | 3.88 | 239.91 |
| Signals | signal:rsi-reversal | 33 | 13 (39 %) | 130 | 77 % | 0.94 | -15.07 |
| Signals | signal:s2-active-hf | 40 | 40 (100 %) | 1625 | 86 % | 4.42 | 3560.62 |
| Signals | signal:s2-adx-gate | 40 | 40 (100 %) | 742 | 88 % | 4.57 | 1679.84 |
| Signals | signal:s2-atr-break | 40 | 40 (100 %) | 1306 | 81 % | 2.16 | 1761.85 |
| Signals | signal:s2-bb-bounce | 40 | 40 (100 %) | 553 | 86 % | 3.85 | 1174.49 |
| Signals | signal:s2-block-scale | 40 | 38 (95 %) | 1388 | 81 % | 1.93 | 1638.22 |
| Signals | signal:s2-block-stack | 40 | 34 (85 %) | 749 | 81 % | 2.50 | 1177.63 |
| Signals | signal:s2-confluence | 40 | 40 (100 %) | 677 | 89 % | 6.51 | 1506.51 |
| Signals | signal:s2-ema-cross | 19 | 15 (79 %) | 54 | 85 % | 3.00 | 92.33 |
| Signals | signal:s2-range-break | 40 | 38 (95 %) | 247 | 77 % | 3.65 | 406.74 |
| Signals | signal:s2-range-shift | 40 | 40 (100 %) | 966 | 85 % | 4.32 | 2114.47 |
| Signals | signal:s2-rsi-revert | 35 | 20 (57 %) | 232 | 79 % | 0.86 | -84.90 |
| Signals | signal:s2-st-trail | 40 | 35 (88 %) | 436 | 88 % | 3.87 | 939.98 |
| Signals | signal:s2-stoch-swing | 40 | 40 (100 %) | 745 | 87 % | 4.27 | 1593.83 |
| Signals | signal:s2-vol-break | 40 | 31 (78 %) | 172 | 76 % | 1.28 | 81.60 |
| Signals | signal:s2-vwap-axis | 20 | 11 (55 %) | 30 | 60 % | 0.75 | -23.02 |
| Signals | signal:sar | 40 | 40 (100 %) | 1189 | 83 % | 2.52 | 1914.97 |
| Signals | signal:squeeze | 40 | 33 (83 %) | 180 | 81 % | 3.74 | 384.33 |
| Signals | signal:st-slow | 40 | 35 (88 %) | 433 | 89 % | 5.45 | 1033.24 |
| Signals | signal:stoch-rsi | 40 | 40 (100 %) | 1139 | 83 % | 2.35 | 1614.87 |
| Signals | signal:supertrend | 40 | 40 (100 %) | 519 | 88 % | 7.08 | 1291.77 |
| Signals | signal:swing | 40 | 40 (100 %) | 1256 | 85 % | 3.62 | 2468.32 |
| Signals | signal:thrust | 40 | 40 (100 %) | 1219 | 87 % | 6.05 | 2814.43 |
| Signals | signal:trix | 40 | 40 (100 %) | 631 | 90 % | 7.49 | 1585.29 |
| Signals | signal:volume-break | 40 | 40 (100 %) | 97 | 79 % | 16.39 | 249.05 |
| Signals | signal:vwap | 40 | 40 (100 %) | 839 | 85 % | 2.77 | 1410.64 |
| Signals | signal:williams-r | 40 | 38 (95 %) | 974 | 84 % | 1.79 | 1139.31 |
| Signals | signal:zscore | 40 | 20 (50 %) | 631 | 79 % | 1.19 | 245.99 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 46894 | 26362 | 1723 | 0.96 | 4.00 | 70.00–163.33 (median 163.33) | 3388 | 12847 | 555 | 3850 | 1864 | 344 | 1723 | 2 | 66 | 0 | 0 | 0 | 20532 |  |
| Minimal | 117536 | 104216 | 9756 | 1.24 | 2.74 | 18.00–163.33 (median 163.33) | 4376 | 28582 | 4397 | 25666 | 12268 | 3595 | 13857 | 119 | 1592 | 8 | 0 | 0 | 13320 |  |
| Short | 40076 | 37376 | 2334 | 1.29 | 2.76 | 163.33–163.33 (median 163.33) | 3070 | 7225 | 1649 | 7595 | 5361 | 1970 | 7514 | 11 | 646 | 1 | 0 | 0 | 2700 |  |
| General | 15366 | 14366 | 847 | 1.34 | 2.40 | 163.33–163.33 (median 163.33) | 1102 | 1933 | 620 | 3113 | 1834 | 1427 | 3122 | 0 | 325 | 43 | 0 | 0 | 1000 |  |
| Long | 24348 | 23098 | 1438 | 1.33 | 2.50 | 163.33–163.33 (median 163.33) | 1422 | 3660 | 1130 | 5339 | 2855 | 2010 | 4751 | 0 | 466 | 27 | 0 | 0 | 1250 |  |
| Wide | 128578 | 104175 | 440 | 0.65 | 2.51 | 18.00–163.33 (median 163.33) | 22206 | 65721 | 1817 | 8892 | 2415 | 396 | 1951 | 0 | 296 | 41 | 0 | 19408 | 4995 |  |
| Signals | 2520 | – | 3395 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 2520 signal tapes, 3395 units (pair × symbol × direction) active at the run start, 5381 over the run; 2417 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 15760 | 5260 (33 %) | 95322 | 73 % | 0.57 | -14669.14 |
| Micro | trailing | 31134 | 8762 (28 %) | 190926 | 58 % | 0.48 | -35262.12 |
| Minimal | normal | 39196 | 17964 (46 %) | 636066 | 69 % | 0.86 | -76073.73 |
| Minimal | trailing | 78340 | 31724 (40 %) | 1401972 | 60 % | 0.86 | -131215.24 |
| Short | normal | 13355 | 6386 (48 %) | 44856 | 63 % | 1.03 | 1769.75 |
| Short | trailing | 26721 | 13795 (52 %) | 95081 | 61 % | 1.27 | 24250.76 |
| General | normal | 9209 | 4235 (46 %) | 31810 | 45 % | 0.98 | -1166.95 |
| General | trailing | 6157 | 2183 (35 %) | 19498 | 52 % | 0.84 | -5166.11 |
| Long | normal | 14605 | 6133 (42 %) | 46205 | 43 % | 0.94 | -6521.45 |
| Long | trailing | 9743 | 2875 (30 %) | 27234 | 51 % | 0.73 | -18484.42 |
| Wide | axis | 109170 | 17224 (16 %) | 1408474 | 30 % | 0.51 | -483140.62 |
| Wide | dca | 9704 | 3553 (37 %) | 159130 | 75 % | 0.68 | -49901.47 |
| Wide | dca-active | 9704 | 1655 (17 %) | 73873 | 44 % | 0.56 | -22645.99 |
| Signals | normal | 630 | 528 (84 %) | 20181 | 83 % | 1.55 | 20282.30 |
| Signals | trailing | 1890 | 1591 (84 %) | 65422 | 79 % | 1.62 | 59094.76 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1723 | 409 (24 %) | 2274 | 65 % | 0.37 | -659.60 |
| Minimal | active | 1876 | 837 (45 %) | 9643 | 68 % | 1.05 | 413.10 |
| Minimal | bollinger | 480 | 359 (75 %) | 8000 | 72 % | 1.28 | 1157.25 |
| Minimal | break | 1522 | 507 (33 %) | 16665 | 66 % | 0.78 | -3235.39 |
| Minimal | channel | 140 | 57 (41 %) | 2721 | 71 % | 1.21 | 399.99 |
| Minimal | direction | 202 | 37 (18 %) | 3178 | 58 % | 0.58 | -1630.37 |
| Minimal | ema | 308 | 38 (12 %) | 6174 | 64 % | 0.70 | -1892.78 |
| Minimal | ichimoku | 137 | 40 (29 %) | 2650 | 66 % | 0.75 | -675.21 |
| Minimal | macd | 383 | 183 (48 %) | 2680 | 62 % | 0.70 | -728.06 |
| Minimal | move | 1068 | 481 (45 %) | 5954 | 60 % | 0.79 | -1183.96 |
| Minimal | osc | 1733 | 965 (56 %) | 37737 | 71 % | 1.14 | 3662.67 |
| Minimal | rsi | 463 | 139 (30 %) | 8192 | 61 % | 0.79 | -1424.43 |
| Minimal | sar | 203 | 101 (50 %) | 1118 | 63 % | 0.88 | -102.48 |
| Minimal | smooth | 347 | 90 (26 %) | 3027 | 52 % | 0.46 | -1830.62 |
| Minimal | trend | 467 | 161 (34 %) | 5999 | 66 % | 0.87 | -661.68 |
| Minimal | volume | 427 | 262 (61 %) | 4930 | 72 % | 1.31 | 932.30 |
| Short | active | 94 | 22 (23 %) | 185 | 38 % | 0.45 | -284.13 |
| Short | bollinger | 35 | 33 (94 %) | 107 | 77 % | 7.86 | 192.22 |
| Short | break | 286 | 121 (42 %) | 464 | 54 % | 0.73 | -187.30 |
| Short | channel | 67 | 3 (4 %) | 83 | 35 % | 0.32 | -114.30 |
| Short | direction | 60 | 0 (0 %) | 74 | 24 % | 0.17 | -193.50 |
| Short | ichimoku | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Short | macd | 64 | 33 (52 %) | 376 | 67 % | 1.10 | 42.60 |
| Short | move | 978 | 757 (77 %) | 3336 | 65 % | 1.73 | 2322.90 |
| Short | osc | 378 | 313 (83 %) | 1767 | 72 % | 2.95 | 1943.58 |
| Short | rsi | 34 | 18 (53 %) | 145 | 59 % | 1.17 | 27.39 |
| Short | sar | 8 | 0 (0 %) | 16 | 50 % | 0.49 | -14.52 |
| Short | smooth | 99 | 81 (82 %) | 100 | 93 % | 47.75 | 175.39 |
| Short | trend | 80 | 39 (49 %) | 180 | 65 % | 1.44 | 77.41 |
| Short | volume | 149 | 99 (66 %) | 198 | 77 % | 6.49 | 271.04 |
| General | active | 32 | 26 (81 %) | 69 | 46 % | 1.17 | 21.13 |
| General | break | 128 | 34 (27 %) | 248 | 38 % | 0.69 | -144.80 |
| General | channel | 44 | 8 (18 %) | 128 | 45 % | 0.63 | -94.39 |
| General | direction | 8 | 0 (0 %) | 21 | 24 % | 0.28 | -29.88 |
| General | ichimoku | 6 | 0 (0 %) | 52 | 23 % | 0.21 | -100.65 |
| General | macd | 19 | 8 (42 %) | 96 | 57 % | 1.28 | 31.58 |
| General | move | 356 | 252 (71 %) | 975 | 52 % | 1.15 | 227.20 |
| General | osc | 120 | 85 (71 %) | 398 | 62 % | 1.79 | 343.12 |
| General | rsi | 6 | 0 (0 %) | 27 | 33 % | 0.22 | -55.03 |
| General | sar | 5 | 4 (80 %) | 9 | 44 % | 0.93 | -1.20 |
| General | smooth | 25 | 17 (68 %) | 22 | 86 % | 9.08 | 56.59 |
| General | trend | 19 | 12 (63 %) | 134 | 45 % | 0.56 | -118.37 |
| General | volume | 79 | 42 (53 %) | 140 | 51 % | 1.52 | 70.94 |
| Long | active | 48 | 13 (27 %) | 83 | 47 % | 0.83 | -38.52 |
| Long | break | 203 | 54 (27 %) | 551 | 42 % | 0.61 | -535.18 |
| Long | channel | 63 | 5 (8 %) | 66 | 29 % | 0.53 | -80.38 |
| Long | direction | 38 | 3 (8 %) | 54 | 37 % | 0.64 | -67.94 |
| Long | ema | 8 | 4 (50 %) | 20 | 80 % | 2.36 | 33.73 |
| Long | macd | 35 | 8 (23 %) | 62 | 39 % | 0.57 | -77.75 |
| Long | move | 513 | 334 (65 %) | 1500 | 52 % | 1.06 | 192.86 |
| Long | osc | 314 | 159 (51 %) | 635 | 65 % | 1.78 | 895.09 |
| Long | rsi | 16 | 0 (0 %) | 3 | 67 % | 0.99 | -0.04 |
| Long | sar | 6 | 4 (67 %) | 10 | 40 % | 1.00 | -0.00 |
| Long | smooth | 20 | 3 (15 %) | 4 | 100 % | ∞ (no loss) | 20.80 |
| Long | trend | 29 | 8 (28 %) | 22 | 73 % | 3.21 | 60.09 |
| Long | volume | 145 | 69 (48 %) | 194 | 58 % | 1.38 | 122.82 |
| Wide | active | 80 | 7 (9 %) | 284 | 48 % | 0.73 | -56.39 |
| Wide | bollinger | 24 | 9 (38 %) | 129 | 21 % | 0.32 | -61.48 |
| Wide | break | 21 | 6 (29 %) | 398 | 27 % | 0.53 | -186.51 |
| Wide | channel | 24 | 6 (25 %) | 90 | 23 % | 0.60 | -27.09 |
| Wide | direction | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 |
| Wide | ema | 9 | 0 (0 %) | 6 | 50 % | 0.74 | -1.33 |
| Wide | macd | 3 | 3 (100 %) | 12 | 100 % | ∞ (no loss) | 17.66 |
| Wide | move | 106 | 21 (20 %) | 289 | 31 % | 0.99 | -1.84 |
| Wide | osc | 103 | 36 (35 %) | 1076 | 27 % | 0.67 | -198.82 |
| Wide | rsi | 7 | 0 (0 %) | 182 | 23 % | 0.74 | -26.43 |
| Wide | sar | 18 | 3 (17 %) | 3 | 100 % | ∞ (no loss) | 4.55 |
| Wide | smooth | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 30.55 |
| Wide | trend | 12 | 3 (25 %) | 45 | 40 % | 0.39 | -31.42 |
| Wide | volume | 8 | 0 (0 %) | 45 | 33 % | 0.49 | -13.88 |
| Signals | signal:act-burst | 40 | 40 (100 %) | 948 | 85 % | 4.34 | 1887.86 |
| Signals | signal:act-hf | 40 | 40 (100 %) | 1164 | 80 % | 2.41 | 1710.20 |
| Signals | signal:adx | 40 | 39 (98 %) | 532 | 86 % | 4.35 | 1143.93 |
| Signals | signal:atr-break | 40 | 40 (100 %) | 1048 | 83 % | 2.99 | 1840.98 |
| Signals | signal:bollinger | 40 | 40 (100 %) | 656 | 88 % | 3.13 | 1299.06 |
| Signals | signal:cci | 40 | 40 (100 %) | 764 | 85 % | 2.65 | 1231.79 |
| Signals | signal:cmf | 40 | 39 (98 %) | 1189 | 84 % | 2.30 | 1718.66 |
| Signals | signal:donchian | 40 | 40 (100 %) | 816 | 84 % | 3.11 | 1576.30 |
| Signals | signal:ema-cross | 40 | 39 (98 %) | 570 | 89 % | 7.20 | 1453.78 |
| Signals | signal:ema-cross-fast | 40 | 40 (100 %) | 746 | 89 % | 5.32 | 1787.40 |
| Signals | signal:ema-pullback | 40 | 40 (100 %) | 971 | 88 % | 5.19 | 2254.83 |
| Signals | signal:ema-slope | 40 | 40 (100 %) | 693 | 89 % | 6.47 | 1716.49 |
| Signals | signal:ema-trend | 40 | 40 (100 %) | 838 | 86 % | 3.04 | 1602.08 |
| Signals | signal:heikin-ashi | 40 | 40 (100 %) | 1459 | 82 % | 2.18 | 1902.63 |
| Signals | signal:hma | 40 | 40 (100 %) | 971 | 88 % | 5.65 | 2257.32 |
| Signals | signal:ichimoku | 40 | 40 (100 %) | 761 | 85 % | 2.65 | 1254.80 |
| Signals | signal:impulse | 40 | 40 (100 %) | 989 | 87 % | 6.05 | 2422.79 |
| Signals | signal:kama | 40 | 40 (100 %) | 1159 | 82 % | 1.94 | 1401.41 |
| Signals | signal:keltner | 40 | 40 (100 %) | 710 | 91 % | 7.95 | 1911.12 |
| Signals | signal:macd-cross | 40 | 40 (100 %) | 1192 | 87 % | 6.02 | 2734.34 |
| Signals | signal:macd-hist | 40 | 40 (100 %) | 1420 | 83 % | 3.57 | 2618.27 |
| Signals | signal:macd-slow | 40 | 40 (100 %) | 1069 | 87 % | 4.46 | 2271.65 |
| Signals | signal:mfi | 18 | 18 (100 %) | 85 | 95 % | 1115.83 | 213.68 |
| Signals | signal:obv | 40 | 40 (100 %) | 1040 | 84 % | 2.31 | 1478.94 |
| Signals | signal:r-awesome | 40 | 39 (98 %) | 838 | 84 % | 3.10 | 1325.35 |
| Signals | signal:r-connors | 40 | 28 (70 %) | 376 | 81 % | 1.64 | 374.94 |
| Signals | signal:r-fractal | 40 | 40 (100 %) | 738 | 84 % | 3.76 | 1505.13 |
| Signals | signal:r-inside | 32 | 32 (100 %) | 175 | 94 % | 46.39 | 508.17 |
| Signals | signal:r-linreg | 40 | 40 (100 %) | 839 | 85 % | 2.33 | 1326.90 |
| Signals | signal:r-nr-break | 40 | 35 (88 %) | 1193 | 82 % | 1.94 | 1430.32 |
| Signals | signal:r-session-trend | 40 | 40 (100 %) | 506 | 87 % | 6.84 | 1199.56 |
| Signals | signal:r-vol-regime | 40 | 36 (90 %) | 696 | 79 % | 2.05 | 902.35 |
| Signals | signal:reclaim | 40 | 40 (100 %) | 884 | 86 % | 2.88 | 1530.39 |
| Signals | signal:rsi-mid | 40 | 40 (100 %) | 1073 | 88 % | 3.81 | 2082.58 |
| Signals | signal:rsi-momentum | 20 | 19 (95 %) | 120 | 78 % | 3.88 | 239.91 |
| Signals | signal:rsi-reversal | 33 | 13 (39 %) | 130 | 77 % | 0.94 | -15.07 |
| Signals | signal:s2-active-hf | 40 | 40 (100 %) | 1625 | 86 % | 4.42 | 3560.62 |
| Signals | signal:s2-adx-gate | 40 | 40 (100 %) | 742 | 88 % | 4.57 | 1679.84 |
| Signals | signal:s2-atr-break | 40 | 40 (100 %) | 1306 | 81 % | 2.16 | 1761.85 |
| Signals | signal:s2-bb-bounce | 40 | 40 (100 %) | 553 | 86 % | 3.85 | 1174.49 |
| Signals | signal:s2-block-scale | 40 | 38 (95 %) | 1388 | 81 % | 1.93 | 1638.22 |
| Signals | signal:s2-block-stack | 40 | 34 (85 %) | 749 | 81 % | 2.50 | 1177.63 |
| Signals | signal:s2-confluence | 40 | 40 (100 %) | 677 | 89 % | 6.51 | 1506.51 |
| Signals | signal:s2-ema-cross | 19 | 15 (79 %) | 54 | 85 % | 3.00 | 92.33 |
| Signals | signal:s2-range-break | 40 | 38 (95 %) | 247 | 77 % | 3.65 | 406.74 |
| Signals | signal:s2-range-shift | 40 | 40 (100 %) | 966 | 85 % | 4.32 | 2114.47 |
| Signals | signal:s2-rsi-revert | 35 | 20 (57 %) | 232 | 79 % | 0.86 | -84.90 |
| Signals | signal:s2-st-trail | 40 | 35 (88 %) | 436 | 88 % | 3.87 | 939.98 |
| Signals | signal:s2-stoch-swing | 40 | 40 (100 %) | 745 | 87 % | 4.27 | 1593.83 |
| Signals | signal:s2-vol-break | 40 | 31 (78 %) | 172 | 76 % | 1.28 | 81.60 |
| Signals | signal:s2-vwap-axis | 20 | 11 (55 %) | 30 | 60 % | 0.75 | -23.02 |
| Signals | signal:sar | 40 | 40 (100 %) | 1189 | 83 % | 2.52 | 1914.97 |
| Signals | signal:squeeze | 40 | 33 (83 %) | 180 | 81 % | 3.74 | 384.33 |
| Signals | signal:st-slow | 40 | 35 (88 %) | 433 | 89 % | 5.45 | 1033.24 |
| Signals | signal:stoch-rsi | 40 | 40 (100 %) | 1139 | 83 % | 2.35 | 1614.87 |
| Signals | signal:supertrend | 40 | 40 (100 %) | 519 | 88 % | 7.08 | 1291.77 |
| Signals | signal:swing | 40 | 40 (100 %) | 1256 | 85 % | 3.62 | 2468.32 |
| Signals | signal:thrust | 40 | 40 (100 %) | 1219 | 87 % | 6.05 | 2814.43 |
| Signals | signal:trix | 40 | 40 (100 %) | 631 | 90 % | 7.49 | 1585.29 |
| Signals | signal:volume-break | 40 | 40 (100 %) | 97 | 79 % | 16.39 | 249.05 |
| Signals | signal:vwap | 40 | 40 (100 %) | 839 | 85 % | 2.77 | 1410.64 |
| Signals | signal:williams-r | 40 | 38 (95 %) | 974 | 84 % | 1.79 | 1139.31 |
| Signals | signal:zscore | 40 | 20 (50 %) | 631 | 79 % | 1.19 | 245.99 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | 1.1 | 1613 | 776 (48 %) | 41734 | 69 % | 0.99 | -354.31 |
| Minimal | 1.25 | 1465 | 705 (48 %) | 38355 | 69 % | 1.00 | -122.72 |
| Minimal | 1.35 | 1319 | 635 (48 %) | 35170 | 69 % | 0.99 | -177.13 |
| Minimal | 1.5 | 1044 | 499 (48 %) | 28222 | 69 % | 0.99 | -343.01 |
| Minimal | 1.75 | 628 | 305 (49 %) | 18464 | 69 % | 1.00 | 42.22 |
| Minimal | 2 | 369 | 180 (49 %) | 11275 | 69 % | 1.01 | 44.77 |
| Short | 1.1 | 414 | 232 (56 %) | 3457 | 61 % | 1.02 | 70.31 |
| Short | 1.25 | 381 | 206 (54 %) | 3148 | 60 % | 0.99 | -31.59 |
| Short | 1.35 | 336 | 177 (53 %) | 2617 | 59 % | 0.94 | -203.63 |
| Short | 1.5 | 264 | 137 (52 %) | 1980 | 58 % | 0.89 | -267.67 |
| Short | 1.75 | 170 | 71 (42 %) | 1201 | 51 % | 0.67 | -581.33 |
| Short | 2 | 113 | 46 (41 %) | 754 | 47 % | 0.58 | -510.42 |
| General | 1.1 | 188 | 84 (45 %) | 1253 | 44 % | 0.72 | -634.36 |
| General | 1.25 | 181 | 78 (43 %) | 1202 | 44 % | 0.70 | -657.40 |
| General | 1.35 | 165 | 70 (42 %) | 1065 | 43 % | 0.68 | -613.06 |
| General | 1.5 | 130 | 48 (37 %) | 859 | 40 % | 0.62 | -625.42 |
| General | 1.75 | 68 | 20 (29 %) | 448 | 33 % | 0.47 | -479.66 |
| General | 2 | 35 | 7 (20 %) | 253 | 25 % | 0.31 | -390.88 |
| Long | 1.1 | 337 | 167 (50 %) | 1853 | 48 % | 0.86 | -649.94 |
| Long | 1.25 | 321 | 161 (50 %) | 1703 | 48 % | 0.87 | -551.19 |
| Long | 1.35 | 313 | 160 (51 %) | 1635 | 49 % | 0.89 | -442.42 |
| Long | 1.5 | 272 | 138 (51 %) | 1344 | 48 % | 0.86 | -469.80 |
| Long | 1.75 | 198 | 97 (49 %) | 985 | 46 % | 0.78 | -527.65 |
| Long | 2 | 109 | 54 (50 %) | 580 | 46 % | 0.79 | -302.04 |
| Wide | 1.1 | 30 | 18 (60 %) | 300 | 43 % | 1.18 | 41.17 |
| Wide | 1.25 | 30 | 18 (60 %) | 300 | 43 % | 1.18 | 41.17 |
| Wide | 1.35 | 27 | 18 (67 %) | 210 | 53 % | 1.45 | 77.26 |
| Wide | 1.5 | 18 | 12 (67 %) | 201 | 52 % | 1.43 | 71.92 |
| Wide | 1.75 | 9 | 9 (100 %) | 57 | 58 % | 3.08 | 78.67 |
| Wide | 2 | 9 | 9 (100 %) | 57 | 58 % | 3.08 | 78.67 |
| Signals | 1.1 | 682 | 648 (95 %) | 18575 | 83 % | 2.82 | 26320.84 |
| Signals | 1.25 | 448 | 426 (95 %) | 13660 | 83 % | 2.74 | 17744.42 |
| Signals | 1.35 | 345 | 323 (94 %) | 10901 | 82 % | 2.75 | 13560.58 |
| Signals | 1.5 | 225 | 208 (92 %) | 7761 | 82 % | 2.54 | 8418.47 |
| Signals | 1.75 | 125 | 114 (91 %) | 5076 | 80 % | 2.32 | 4568.21 |
| Signals | 2 | 86 | 79 (92 %) | 3764 | 79 % | 2.22 | 3127.77 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | magnet | mc-rsi2-5@m5 | 132 | 126 (95 %) | 528 | 80 % | 5.43 | 68.20 | – |
| Micro | sandwich | mc-rsi3-5@m5 | 148 | 128 (86 %) | 296 | 88 % | 12.31 | 63.39 | – |
| Micro | revert | mc-tpull-13@m5c | 12 | 12 (100 %) | 48 | 100 % | ∞ (no loss) | 17.09 | – |
| Micro | sandwich | mc-rsit5-15@m15 | 4 | 4 (100 %) | 32 | 100 % | ∞ (no loss) | 12.80 | tp0.6 sl2.4 tr0 h64 mc (8 · ∞ (no loss) · 3.20) |
| Micro | pulse | mc-rsit5-15@m15 | 4 | 4 (100 %) | 32 | 100 % | ∞ (no loss) | 12.80 | tp0.6 sl2.4 tr0 h64 mc (8 · ∞ (no loss) · 3.20) |
| Micro | pivot | mc-lag-3@m15 | 32 | 32 (100 %) | 32 | 100 % | ∞ (no loss) | 11.10 | – |
| Micro | sweep | mc-rsi7-20@m5c | 4 | 4 (100 %) | 28 | 100 % | ∞ (no loss) | 10.51 | tp0.6 sl3 tr0 h192 mc (7 · ∞ (no loss) · 2.80) |
| Micro | snap | mc-rsit3-15@m15 | 4 | 4 (100 %) | 24 | 100 % | ∞ (no loss) | 9.60 | tp0.6 sl2.4 tr0 h64 mc (6 · ∞ (no loss) · 2.40) |
| Micro | snap | mc-rsit2-15@m15 | 4 | 4 (100 %) | 20 | 100 % | ∞ (no loss) | 8.00 | tp0.6 sl2.4 tr0 h64 mc (5 · ∞ (no loss) · 2.00) |
| Micro | snap | mc-rsit2-20@m15 | 4 | 4 (100 %) | 20 | 100 % | ∞ (no loss) | 8.00 | tp0.6 sl2.4 tr0 h64 mc (5 · ∞ (no loss) · 2.00) |
| Micro | sweep | mc-rsi9-15@m5 | 8 | 8 (100 %) | 16 | 100 % | ∞ (no loss) | 6.40 | – |
| Micro | sweep | mc-rsi9-20@m5 | 4 | 2 (50 %) | 34 | 94 % | 1.87 | 5.32 | tp0.6 sl3 tr0.45 h192 mc (8 · ∞ (no loss) · 2.86) |
| Micro | ribbon | mc-qburst-2@m5 | 3 | 3 (100 %) | 18 | 67 % | 4.83 | 5.04 | tp0.6 sl1.65 tr0.45 h192 mc (6 · 4.83 · 1.68) |
| Micro | snap | mc-rsit3-20@m15 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 4.80 | – |
| Micro | sweep | mc-rsi5-15@m5c | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 4.80 | – |
| Micro | sandwich | mc-rsit5-20@m15 | 6 | 6 (100 %) | 12 | 83 % | 16.32 | 3.75 | – |
| Micro | pulse | mc-rsit5-20@m15 | 6 | 6 (100 %) | 12 | 83 % | 16.32 | 3.75 | – |
| Micro | sandwich | mc-lag-6@m5 | 2 | 2 (100 %) | 14 | 57 % | 4.25 | 2.17 | tp0.5 sl2.5 tr0.25 h192 mc (7 · 4.25 · 1.08) |
| Micro | sweep | mc-qrsi2-5@m5 | 2 | 2 (100 %) | 6 | 83 % | 17.76 | 1.35 | – |
| Micro | snap | mc-rsi2-5@m5 | 52 | 20 (38 %) | 104 | 69 % | 1.08 | 0.70 | – |
| Micro | pulse | mc-rsi2-5@m5 | 32 | 12 (38 %) | 64 | 69 % | 1.04 | 0.24 | – |
| Micro | magnet | mc-lag-12@m5 | 2 | 0 (0 %) | 14 | 86 % | 0.87 | -0.55 | tp0.5 sl1.875 tr0 h192 mc (7 · 0.87 · -0.28) |
| Micro | revert | mc-rsit2-20@m5c | 4 | 0 (0 %) | 28 | 71 % | 0.78 | -2.15 | tp0.6 sl1.05 tr0 h192 mc (7 · 0.80 · -0.50) |
| Micro | revert | mc-trsi2-10@m5c | 2 | 0 (0 %) | 36 | 78 % | 0.82 | -2.40 | tp0.6 sl1.5 tr0 h192 mc (18 · 0.82 · -1.20) |
| Micro | sweep | mc-rsi7-15@m5 | 8 | 4 (50 %) | 36 | 78 % | 0.79 | -2.63 | tp0.6 sl2.85 tr0.45 h192 mc (5 · 0.41 · -1.79) |
| Micro | clamp | mc-rsi2-5@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -10.80 | – |
| Micro | clamp | mc-rsi3-5@m15 | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -11.67 | – |
| Micro | revert | mc-vwapx-15@m15c | 26 | 0 (0 %) | 26 | 0 % | 0.00 | -36.47 | – |
| Micro | ribbon | mc-rsi2-5@m5 | 48 | 0 (0 %) | 384 | 56 % | 0.23 | -156.84 | tp0.55 sl1.5125 tr0.275 h192 mc (8 · 0.38 · -2.27) |
| Micro | clamp | mc-bbx-25@m15c | 90 | 0 (0 %) | 90 | 0 % | 0.00 | -239.77 | – |
| Micro | ribbon | mc-mturn-10@m15c | 264 | 6 (2 %) | 264 | 2 % | 0.00 | -456.52 | – |
| Minimal | follow | r-cvd-div@m1c | 78 | 72 (92 %) | 1534 | 79 % | 3.07 | 892.21 | tp1.6 sl4 tr1.2 h960 mn (18 · 87.16 · 25.39) |
| Minimal | sweep | willr-21-90@m5c | 36 | 36 (100 %) | 620 | 93 % | 41.88 | 674.33 | tp1.4 sl3.5 tr1.05 h192 mn (18 · 292.74 · 29.36) |
| Minimal | magnet | willr-28-90@m1c | 31 | 31 (100 %) | 702 | 81 % | 2.46 | 550.76 | tp1.4 sl3.5 tr1.05 h960 mn (22 · 4.40 · 37.97) |
| Minimal | pivot | r-inside-m@m1 | 83 | 81 (98 %) | 573 | 89 % | 20.04 | 475.94 | tp1.6 sl2.4 tr1.2 h1440 mn (7 · ∞ (no loss) · 14.08) |
| Minimal | pulse | willr-50-90@m1c | 31 | 31 (100 %) | 847 | 81 % | 2.15 | 435.54 | tp1.6 sl4 tr1.2 h960 mn (27 · 2.78 · 22.76) |
| Minimal | revert | aroon-14@m5c | 17 | 17 (100 %) | 1214 | 74 % | 1.57 | 410.92 | tp1.6 sl4 tr1.2 h288 mn (68 · 1.93 · 40.57) |
| Minimal | ribbon | willr-50-90@m1c | 31 | 26 (84 %) | 1551 | 75 % | 1.44 | 396.57 | tp1.6 sl4 tr0 h1440 mn (45 · 2.17 · 29.40) |
| Minimal | ribbon | r-bb-adx-m@m1 | 78 | 65 (83 %) | 1661 | 74 % | 1.61 | 392.24 | tp1.4 sl4.2 tr0 h1440 mn (21 · 5.45 · 19.60) |
| Minimal | snap | willr-50-90@m1c | 39 | 33 (85 %) | 1311 | 75 % | 1.51 | 377.46 | tp1.6 sl4 tr0 h960 mn (32 · 2.33 · 22.40) |
| Minimal | revert | break-don40@m1c | 59 | 53 (90 %) | 3051 | 73 % | 1.19 | 355.54 | tp1.6 sl4 tr0 h1440 mn (40 · 1.57 · 16.80) |
| Minimal | magnet | cci-20-100@m1c | 11 | 11 (100 %) | 948 | 78 % | 1.59 | 344.09 | tp1.4 sl4.2 tr1.05 h960 mn (87 · 1.96 · 47.56) |
| Minimal | follow | willr-21-95@m1c | 44 | 38 (86 %) | 1572 | 74 % | 1.44 | 342.19 | tp1.6 sl4 tr0 h960 mn (32 · 3.22 · 28.00) |
| Minimal | magnet | willr-50-90@m15c | 52 | 52 (100 %) | 468 | 85 % | 3.88 | 335.91 | tp1.6 sl3.2 tr0.8 h64 mn (9 · ∞ (no loss) · 16.42) |
| Minimal | pivot | willr-50-90@m1c | 28 | 20 (71 %) | 1436 | 76 % | 1.41 | 335.90 | tp1.6 sl4.8 tr0 h960 mn (44 · 2.18 · 29.60) |
| Minimal | sweep | cci-14-100@m1c | 49 | 38 (78 %) | 1844 | 70 % | 1.26 | 290.73 | tp1.6 sl4 tr0.8 h1440 mn (36 · 2.61 · 27.63) |
| Minimal | follow | mc-mturn-5@m15c | 24 | 22 (92 %) | 293 | 72 % | 4.47 | 262.86 | tp1.6 sl3.2 tr1.2 h96 mn (11 · 136.31 · 17.20) |
| Minimal | clamp | r-bb-adx-m@m1 | 49 | 48 (98 %) | 903 | 75 % | 1.93 | 260.31 | tp1.2 sl3.6 tr0 h1440 mn (18 · 4.47 · 13.20) |
| Minimal | magnet | willr-21-90@m1c | 11 | 11 (100 %) | 256 | 90 % | 3.83 | 255.26 | tp1.4 sl3.5 tr1.05 h1440 mn (23 · 7.16 · 46.31) |
| Minimal | sandwich | r-bb-adx-m@m1 | 69 | 51 (74 %) | 1403 | 72 % | 1.44 | 248.74 | tp1.4 sl4.2 tr0 h960 mn (20 · 4.95 · 17.36) |
| Minimal | magnet | r-bb-adx-m@m1 | 65 | 64 (98 %) | 562 | 78 % | 2.68 | 243.91 | tp1.4 sl4.2 tr1.05 h960 mn (9 · ∞ (no loss) · 8.78) |
| Minimal | magnet | srsi-14-20@m1c | 10 | 10 (100 %) | 335 | 77 % | 2.47 | 242.49 | tp1.4 sl4.2 tr1.05 h1440 mn (34 · 3.50 · 35.11) |
| Minimal | revert | break-don55@m1c | 31 | 25 (81 %) | 1438 | 75 % | 1.25 | 233.34 | tp1.4 sl2.1 tr1.05 h960 mn (52 · 1.56 · 16.98) |
| Minimal | sweep | willr-28-95@m5c | 67 | 51 (76 %) | 335 | 76 % | 7.57 | 224.93 | tp1.4 sl2.1 tr1.05 h192 mn (5 · ∞ (no loss) · 11.09) |
| Minimal | magnet | r-fisher-m@m5 | 8 | 8 (100 %) | 347 | 78 % | 1.88 | 211.52 | tp1.6 sl4.8 tr1.2 h288 mn (43 · 2.47 · 40.28) |
| Minimal | sweep | break-fail@m1c | 30 | 25 (83 %) | 685 | 75 % | 1.54 | 193.58 | tp1.4 sl4.2 tr0 h960 mn (21 · 2.59 · 14.00) |
| Minimal | sandwich | willr-50-90@m1c | 34 | 25 (74 %) | 1416 | 72 % | 1.22 | 191.49 | tp1.6 sl4 tr0 h1440 mn (38 · 2.20 · 25.20) |
| Minimal | clamp | willr-50-90@m1c | 29 | 22 (76 %) | 1344 | 73 % | 1.24 | 190.05 | tp1.6 sl4 tr0 h1440 mn (41 · 1.94 · 23.80) |
| Minimal | pivot | r-bb-adx-m@m1 | 40 | 37 (93 %) | 655 | 77 % | 1.70 | 169.79 | tp1.4 sl4.2 tr0 h1440 mn (16 · ∞ (no loss) · 19.20) |
| Minimal | magnet | willr-50-90@m1c | 11 | 11 (100 %) | 386 | 78 % | 1.91 | 168.55 | tp1.6 sl4.8 tr0.8 h960 mn (34 · 2.98 · 20.81) |
| Minimal | snap | willr-50-80@m1c | 5 | 5 (100 %) | 365 | 78 % | 1.85 | 163.26 | tp1.6 sl4.8 tr0 h960 mn (67 · 1.80 · 36.20) |
| Minimal | follow | willr-28-95@m1c | 44 | 27 (61 %) | 1384 | 72 % | 1.20 | 162.66 | tp1.6 sl4 tr0 h960 mn (28 · 2.78 · 22.40) |
| Minimal | sweep | mc-rsi3-15@m5c | 33 | 33 (100 %) | 268 | 84 % | 2.31 | 157.59 | tp1.4 sl3.5 tr1.05 h192 mn (8 · 3.49 · 9.51) |
| Minimal | magnet | trend-st-14-2@m1c | 62 | 45 (73 %) | 1304 | 68 % | 1.17 | 152.60 | tp1.6 sl4.8 tr1.2 h1440 mn (19 · 1.98 · 10.26) |
| Minimal | magnet | trend-ema-20-50@m1 | 31 | 30 (97 %) | 391 | 75 % | 1.56 | 150.11 | tp1.6 sl4.8 tr1.2 h1440 mn (11 · 3.46 · 12.72) |
| Minimal | pivot | r-cvd-div@m1c | 30 | 28 (93 %) | 368 | 78 % | 2.42 | 145.84 | tp1 sl3 tr0.75 h960 mn (12 · 787.62 · 11.49) |
| Minimal | ribbon | mc-lag-12@m5 | 21 | 21 (100 %) | 186 | 83 % | 3.21 | 145.20 | tp1.6 sl4.8 tr0 h288 mn (8 · ∞ (no loss) · 11.20) |
| Minimal | snap | r-fisher@m5 | 48 | 41 (85 %) | 627 | 71 % | 1.35 | 141.96 | tp1.6 sl3.2 tr1.2 h192 mn (13 · 2.52 · 10.51) |
| Minimal | magnet | mc-lag-12@m5 | 26 | 26 (100 %) | 182 | 87 % | 2.86 | 140.66 | tp1.6 sl4.8 tr1.2 h288 mn (7 · ∞ (no loss) · 10.95) |
| Minimal | sandwich | r-zdist-m@m15 | 102 | 58 (57 %) | 230 | 57 % | 3.29 | 134.65 | – |
| Minimal | snap | r-zdist-m@m15 | 102 | 58 (57 %) | 230 | 57 % | 3.29 | 134.65 | – |
| Minimal | pulse | r-zdist-m@m15 | 102 | 58 (57 %) | 230 | 57 % | 3.29 | 134.65 | – |
| Minimal | revert | mc-trsi2-10@m5c | 35 | 34 (97 %) | 527 | 69 % | 1.47 | 133.24 | tp1.2 sl3.6 tr0.9 h192 mn (14 · 2.58 · 12.15) |
| Minimal | sweep | mc-rsi3-20@m5c | 23 | 23 (100 %) | 499 | 76 % | 1.32 | 127.28 | tp1.4 sl4.2 tr1.05 h192 mn (22 · 1.56 · 9.90) |
| Minimal | follow | willr-50-95@m1c | 26 | 17 (65 %) | 895 | 72 % | 1.20 | 117.94 | tp1.6 sl4.8 tr0 h960 mn (29 · 1.75 · 15.00) |
| Minimal | sandwich | willr-28-80@m1c | 3 | 3 (100 %) | 274 | 78 % | 1.69 | 116.48 | tp1.6 sl4.8 tr0.8 h1440 mn (112 · 1.88 · 43.28) |
| Minimal | sandwich | r-chand-m@m1 | 4 | 4 (100 %) | 230 | 70 % | 2.39 | 116.47 | tp1.6 sl4.8 tr0.8 h960 mn (57 · 2.77 · 32.04) |
| Minimal | sandwich | r-zdist@m15c | 76 | 42 (55 %) | 176 | 57 % | 3.19 | 115.64 | – |
| Minimal | snap | r-zdist@m15c | 76 | 42 (55 %) | 176 | 57 % | 3.19 | 115.64 | – |
| Minimal | pulse | r-zdist@m15c | 76 | 42 (55 %) | 176 | 57 % | 3.19 | 115.64 | – |
| Minimal | follow | act-chop@x4@m1 | 30 | 26 (87 %) | 183 | 93 % | 5.91 | 115.08 | tp1.4 sl3.5 tr0 h1440 mn (6 · ∞ (no loss) · 7.20) |
| Minimal | sweep | rsi-fast@m5 | 34 | 26 (76 %) | 371 | 75 % | 1.65 | 112.47 | tp1.4 sl4.2 tr1.05 h192 mn (11 · 3.19 · 10.13) |
| Minimal | sweep | mc-rsi7-20@m5 | 34 | 26 (76 %) | 371 | 75 % | 1.65 | 112.47 | tp1.4 sl4.2 tr1.05 h192 mn (11 · 3.19 · 10.13) |
| Minimal | revert | cmf-20-0.1@m1c | 4 | 4 (100 %) | 359 | 71 % | 1.42 | 109.11 | tp1.6 sl4 tr1.2 h960 mn (86 · 1.72 · 42.46) |
| Minimal | magnet | r-valuearea-m@m5 | 21 | 21 (100 %) | 137 | 80 % | 7.25 | 104.62 | tp1.4 sl3.5 tr0 h288 mn (6 · ∞ (no loss) · 7.20) |
| Minimal | magnet | ema-slope-20-3@m1c | 11 | 11 (100 %) | 144 | 90 % | 3.45 | 101.57 | tp1.6 sl3.2 tr0 h1440 mn (13 · 4.94 · 13.40) |
| Minimal | revert | aroon-25@m1c | 11 | 11 (100 %) | 400 | 75 % | 1.36 | 97.90 | tp1.6 sl3.2 tr0 h960 mn (34 · 1.86 · 17.49) |
| Minimal | pivot | ichi-tk-20@m1c | 12 | 11 (92 %) | 491 | 73 % | 1.27 | 94.26 | tp1.6 sl4.8 tr0 h960 mn (39 · 1.58 · 15.44) |
| Minimal | magnet | willr-50-90@m5c | 7 | 7 (100 %) | 172 | 80 % | 2.07 | 90.44 | tp1.4 sl4.2 tr1.05 h192 mn (26 · 2.80 · 19.19) |
| Minimal | pulse | willr-7-95@m5 | 45 | 45 (100 %) | 90 | 100 % | ∞ (no loss) | 89.85 | – |
| Minimal | snap | act-hf@m5 | 50 | 50 (100 %) | 100 | 82 % | 46.46 | 89.24 | – |
| Minimal | snap | r-bb-adx@m1 | 32 | 28 (88 %) | 374 | 71 % | 2.15 | 83.80 | tp1.4 sl3.5 tr1.05 h960 mn (11 · 3.41 · 9.65) |
| Minimal | follow | willr-14-95@m1c | 5 | 5 (100 %) | 206 | 82 % | 1.67 | 82.06 | tp1.4 sl4.2 tr0 h1440 mn (40 · 1.91 · 20.00) |
| Minimal | magnet | r-tsi-m@m1 | 10 | 10 (100 %) | 100 | 90 % | 2.97 | 78.80 | tp1.6 sl3.2 tr0 h960 mn (10 · 3.71 · 9.20) |
| Minimal | sweep | cci-20-100@m1c | 8 | 8 (100 %) | 328 | 81 % | 1.43 | 77.94 | tp1.4 sl4.2 tr0.7 h960 mn (42 · 1.87 · 15.44) |
| Minimal | sweep | r-vol-regime@m15 | 70 | 70 (100 %) | 70 | 100 % | ∞ (no loss) | 77.60 | – |
| Minimal | pulse | ichi-cloud-9@m1 | 28 | 26 (93 %) | 179 | 66 % | 2.76 | 77.32 | tp1.4 sl4.2 tr0 h1440 mn (5 · ∞ (no loss) · 6.00) |
| Minimal | magnet | willr-50-80@m1c | 2 | 2 (100 %) | 166 | 80 % | 1.95 | 73.78 | tp1.6 sl4.8 tr0 h1440 mn (69 · 1.87 · 39.00) |
| Minimal | ribbon | willr-7-90@m30 | 24 | 15 (63 %) | 187 | 73 % | 2.45 | 72.57 | tp1.6 sl4 tr0 h48 mn (7 · ∞ (no loss) · 9.80) |
| Minimal | pivot | r-vwap-reclaim@m1 | 23 | 16 (70 %) | 169 | 72 % | 3.36 | 71.85 | tp1.6 sl4 tr0 h1440 mn (7 · ∞ (no loss) · 9.80) |
| Minimal | revert | rsi-mom-21-25@m5c | 18 | 18 (100 %) | 126 | 78 % | 1.83 | 70.00 | tp1.6 sl4 tr1.2 h192 mn (7 · 2.18 · 5.09) |
| Minimal | sandwich | mc-rsit5-20@m15 | 39 | 32 (82 %) | 78 | 78 % | 4.58 | 69.26 | – |
| Minimal | pulse | mc-rsit5-20@m15 | 39 | 32 (82 %) | 78 | 78 % | 4.58 | 69.26 | – |
| Minimal | pulse | r-fisher@m5 | 18 | 16 (89 %) | 308 | 69 % | 1.37 | 64.06 | tp1.6 sl2.4 tr1.2 h192 mn (17 · 2.53 · 12.42) |
| Minimal | pulse | willr-28-80@m1c | 3 | 3 (100 %) | 196 | 74 % | 1.54 | 63.79 | tp1.6 sl2.4 tr0 h960 mn (65 · 1.65 · 27.00) |
| Minimal | pulse | r-nr-break-m@m5 | 14 | 14 (100 %) | 184 | 69 % | 2.02 | 63.73 | tp1.4 sl3.5 tr1.05 h192 mn (11 · 20.55 · 10.41) |
| Minimal | magnet | r-valuearea@m5 | 12 | 12 (100 %) | 72 | 83 % | 2.78 | 62.92 | tp1.2 sl1.8 tr0.9 h192 mn (6 · 4.50 · 6.99) |
| Minimal | snap | willr-28-90@m1c | 3 | 3 (100 %) | 99 | 75 % | 1.93 | 60.39 | tp1.6 sl4 tr0.8 h1440 mn (32 · 2.61 · 27.52) |
| Minimal | pivot | r-fvg@m30 | 24 | 18 (75 %) | 94 | 84 % | 2.85 | 59.32 | – |
| Minimal | snap | mc-rsit5-25@m5 | 4 | 4 (100 %) | 188 | 61 % | 1.65 | 58.96 | tp1.6 sl3.2 tr1.2 h288 mn (46 · 1.82 · 17.52) |
| Minimal | ribbon | willr-14-90@m15 | 5 | 5 (100 %) | 171 | 77 % | 1.45 | 56.89 | tp1.6 sl4.8 tr0 h96 mn (33 · 2.03 · 20.60) |
| Minimal | ribbon | r-valuearea-m@m15 | 87 | 70 (80 %) | 160 | 82 % | 3.27 | 54.03 | – |
| Minimal | sandwich | kama-20@m15 | 116 | 58 (50 %) | 116 | 50 % | 6.54 | 53.59 | – |
| Minimal | pulse | macd-hist@m5 | 4 | 4 (100 %) | 88 | 84 % | 2.13 | 50.75 | tp1.6 sl3.2 tr1.2 h288 mn (22 · 3.03 · 14.25) |
| Minimal | sweep | r-pin@m15 | 25 | 19 (76 %) | 336 | 75 % | 1.18 | 49.24 | tp1.6 sl4.8 tr0 h64 mn (13 · 1.54 · 5.40) |
| Minimal | sweep | r-orb-m@m15 | 42 | 42 (100 %) | 42 | 100 % | ∞ (no loss) | 48.80 | – |
| Minimal | snap | macd-cross-19-39-9@m1 | 19 | 15 (79 %) | 381 | 65 % | 1.33 | 48.53 | tp1.4 sl2.8 tr0 h1440 mn (19 · 2.13 · 10.20) |
| Minimal | clamp | rsi-14-25-75@m5c | 8 | 8 (100 %) | 82 | 85 % | 2.26 | 47.71 | tp1.4 sl2.1 tr1.05 h192 mn (11 · 2.94 · 8.94) |
| Minimal | clamp | mc-rsi14-25@m5c | 8 | 8 (100 %) | 82 | 85 % | 2.26 | 47.71 | tp1.4 sl2.1 tr1.05 h192 mn (11 · 2.94 · 8.94) |
| Minimal | snap | mc-rsit3-20@m15 | 11 | 11 (100 %) | 33 | 82 % | 43.09 | 47.30 | – |
| Minimal | sandwich | mc-rsit4-25@m15 | 26 | 24 (92 %) | 26 | 92 % | 127.87 | 43.85 | – |
| Minimal | pulse | mc-rsit4-25@m15 | 26 | 24 (92 %) | 26 | 92 % | 127.87 | 43.85 | – |
| Minimal | sandwich | sar-flip@m5 | 66 | 58 (88 %) | 66 | 88 % | 58.08 | 43.80 | – |
| Minimal | ribbon | r-star@m5 | 6 | 6 (100 %) | 108 | 72 % | 1.42 | 42.70 | tp1.6 sl3.2 tr1.2 h288 mn (19 · 1.65 · 9.94) |
| Minimal | pivot | willr-28-80@m1c | 1 | 1 (100 %) | 94 | 85 % | 1.60 | 42.00 | tp1.6 sl4.8 tr0 h1440 mn (94 · 1.60 · 42.00) |
| Minimal | magnet | r-elder-m@m1 | 4 | 4 (100 %) | 81 | 64 % | 1.68 | 41.92 | tp1.6 sl3.2 tr1.2 h1440 mn (20 · 1.92 · 12.79) |
| Minimal | sweep | r-streak@m1 | 10 | 10 (100 %) | 141 | 75 % | 1.45 | 41.81 | tp1.6 sl4 tr1.2 h960 mn (14 · 1.77 · 6.54) |
| Minimal | magnet | mc-rsit5-10@m5 | 6 | 4 (67 %) | 248 | 68 % | 1.14 | 38.70 | tp1.6 sl4.8 tr0.8 h288 mn (46 · 1.42 · 16.14) |
| Minimal | pulse | macd-hist-8-21-5@m5 | 82 | 52 (63 %) | 82 | 63 % | 18.14 | 37.65 | – |
| Minimal | magnet | willr-28-80@m1c | 1 | 1 (100 %) | 89 | 76 % | 1.72 | 37.39 | tp1.6 sl4.8 tr0.8 h1440 mn (89 · 1.72 · 37.39) |
| Minimal | follow | r-td@m15c | 14 | 14 (100 %) | 90 | 69 % | 3.16 | 36.73 | tp1.2 sl3.6 tr0.6 h64 mn (7 · 11.36 · 4.84) |
| Minimal | ribbon | bb-wick@m1c | 9 | 7 (78 %) | 192 | 80 % | 1.27 | 35.97 | tp1.4 sl3.5 tr0 h960 mn (21 · 1.88 · 9.79) |
| Minimal | sweep | willr-28-90@m1c | 11 | 9 (82 %) | 104 | 81 % | 1.69 | 35.16 | tp1.6 sl2.4 tr0 h1440 mn (10 · 2.15 · 6.00) |
| Minimal | pulse | trix-15@m1 | 1 | 1 (100 %) | 61 | 85 % | 1.93 | 35.00 | tp1.6 sl4 tr0 h1440 mn (61 · 1.93 · 35.00) |
| Minimal | pulse | r-klinger-m@m1 | 3 | 3 (100 %) | 67 | 81 % | 2.02 | 34.58 | tp1.6 sl4 tr0.8 h1440 mn (24 · 2.66 · 14.39) |
| Minimal | magnet | bb-wick@m1c | 13 | 10 (77 %) | 222 | 67 % | 1.23 | 33.98 | tp1.2 sl3.6 tr0 h960 mn (19 · 2.17 · 8.89) |
| Minimal | follow | r-engulf-m@m1 | 11 | 10 (91 %) | 253 | 70 % | 1.25 | 33.64 | tp1.4 sl4.2 tr0 h960 mn (21 · 1.76 · 8.30) |
| Minimal | snap | trend-st-21-5@m1 | 17 | 14 (82 %) | 509 | 73 % | 1.14 | 33.37 | tp1.6 sl4.8 tr0.8 h960 mn (30 · 2.52 · 9.90) |
| Minimal | pivot | r-sweep-m@m15 | 35 | 17 (49 %) | 105 | 74 % | 1.43 | 33.28 | – |
| Minimal | magnet | trend-ema@m1c | 6 | 5 (83 %) | 62 | 84 % | 2.25 | 32.40 | tp1.6 sl4 tr0 h1440 mn (9 · ∞ (no loss) · 12.60) |
| Minimal | ribbon | mc-rsit4-25@m15c | 4 | 4 (100 %) | 95 | 79 % | 1.51 | 30.65 | tp1.6 sl4.8 tr0 h96 mn (22 · 1.77 · 11.60) |
| Minimal | sandwich | mc-rsit2-30@m15 | 9 | 9 (100 %) | 27 | 89 % | 52.76 | 29.09 | – |
| Minimal | revert | dir-reclaim@m1c | 6 | 6 (100 %) | 131 | 81 % | 1.28 | 28.32 | tp1.6 sl4.8 tr1.2 h960 mn (22 · 1.55 · 8.18) |
| Minimal | pivot | mc-lag-12@m5 | 2 | 2 (100 %) | 18 | 100 % | ∞ (no loss) | 27.54 | tp1.4 sl4.2 tr1.05 h192 mn (9 · ∞ (no loss) · 13.77) |
| Minimal | pulse | mc-tz-25@m5 | 6 | 6 (100 %) | 24 | 100 % | ∞ (no loss) | 27.20 | – |
| Minimal | snap | trend-st-35-7@m1c | 3 | 3 (100 %) | 67 | 76 % | 1.82 | 26.90 | tp1.6 sl4.8 tr0 h1440 mn (19 · 2.38 · 13.80) |
| Minimal | ribbon | mc-lag-6@m15 | 22 | 18 (82 %) | 88 | 75 % | 1.38 | 26.49 | – |
| Minimal | sandwich | act-chop@m5 | 4 | 4 (100 %) | 44 | 82 % | 2.82 | 26.40 | tp1.4 sl3.5 tr1.05 h192 mn (11 · 2.84 · 6.80) |
| Minimal | ribbon | mc-rsit3-25@m15c | 11 | 10 (91 %) | 242 | 69 % | 1.18 | 25.59 | tp1.2 sl3 tr0.9 h96 mn (23 · 1.55 · 5.39) |
| Minimal | sandwich | cci-20-200@m15 | 6 | 6 (100 %) | 36 | 89 % | 38.20 | 25.30 | tp1 sl2 tr0 h64 mn (6 · ∞ (no loss) · 4.80) |
| Minimal | pulse | cci-20-200@m15 | 6 | 6 (100 %) | 36 | 89 % | 38.20 | 25.30 | tp1 sl2 tr0 h64 mn (6 · ∞ (no loss) · 4.80) |
| Minimal | magnet | cci-14-100@m1c | 19 | 7 (37 %) | 1514 | 67 % | 1.02 | 25.12 | tp1.4 sl4.2 tr1.05 h1440 mn (81 · 1.48 · 28.41) |
| Minimal | clamp | mc-rsi2-5@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 25.02 | – |
| Minimal | sweep | willr-50-95@m5c | 8 | 6 (75 %) | 48 | 79 % | 2.17 | 25.00 | tp1.6 sl3.2 tr0 h192 mn (5 · ∞ (no loss) · 7.00) |
| Minimal | pulse | ema-slope-34@m1 | 3 | 3 (100 %) | 62 | 74 % | 1.79 | 24.81 | tp1.6 sl4.8 tr0 h1440 mn (16 · 1.96 · 9.60) |
| Minimal | sandwich | bb-bounce-50-2@m15c | 8 | 8 (100 %) | 28 | 79 % | 3.79 | 24.50 | – |
| Minimal | sandwich | z-50-2@m15c | 8 | 8 (100 %) | 28 | 79 % | 3.79 | 24.50 | – |
| Minimal | pulse | bb-bounce-50-2@m15c | 8 | 8 (100 %) | 28 | 79 % | 3.79 | 24.50 | – |
| Minimal | pulse | z-50-2@m15c | 8 | 8 (100 %) | 28 | 79 % | 3.79 | 24.50 | – |
| Minimal | follow | break-fail@m1c | 4 | 4 (100 %) | 190 | 73 % | 1.17 | 24.08 | tp1.4 sl3.5 tr0 h960 mn (44 · 1.42 · 12.44) |
| Minimal | revert | r-linreg-m@m5c | 6 | 6 (100 %) | 12 | 83 % | 227.06 | 23.34 | – |
| Minimal | sandwich | r-tsi@m1 | 7 | 6 (86 %) | 70 | 83 % | 3.52 | 23.26 | tp0.8 sl2.4 tr0 h1440 mn (9 · ∞ (no loss) · 5.40) |
| Minimal | pivot | break-atr-2@m5 | 3 | 3 (100 %) | 45 | 87 % | 1.98 | 23.20 | tp1.4 sl3.5 tr0 h192 mn (15 · 2.11 · 8.20) |
| Minimal | sweep | act-chop@m5 | 6 | 6 (100 %) | 54 | 80 % | 2.14 | 23.18 | tp1.2 sl3 tr0.9 h192 mn (9 · 2.55 · 4.95) |
| Minimal | pivot | willr-50-90@m5c | 1 | 1 (100 %) | 49 | 73 % | 3.45 | 23.14 | tp1.6 sl4.8 tr0.8 h192 mn (49 · 3.45 · 23.14) |
| Minimal | follow | willr-7-95@m1c | 1 | 1 (100 %) | 51 | 65 % | 1.62 | 22.69 | tp1.4 sl2.8 tr1.05 h1440 mn (51 · 1.62 · 22.69) |
| Minimal | follow | r-qh-rev@m1 | 6 | 5 (83 %) | 123 | 73 % | 1.30 | 22.55 | tp1.2 sl2.4 tr0 h960 mn (22 · 1.73 · 7.60) |
| Minimal | pulse | r-zdist@m5c | 6 | 6 (100 %) | 20 | 80 % | 57.32 | 21.53 | – |
| Minimal | follow | act-chop@m15c | 2 | 2 (100 %) | 24 | 92 % | 3.08 | 20.80 | tp1.6 sl4.8 tr0 h64 mn (12 · 3.08 · 10.40) |
| Minimal | sandwich | r-zdist@m5c | 4 | 4 (100 %) | 17 | 88 % | 107.48 | 20.35 | tp1.6 sl4.8 tr0.8 h288 mn (5 · 72.09 · 5.34) |
| Minimal | snap | r-zdist@m5c | 4 | 4 (100 %) | 17 | 88 % | 107.48 | 20.35 | tp1.6 sl4.8 tr0.8 h288 mn (5 · 72.09 · 5.34) |
| Minimal | sweep | mc-rsit4-25@m15c | 2 | 2 (100 %) | 34 | 88 % | 2.08 | 19.86 | tp1.6 sl4 tr0 h64 mn (17 · 2.28 · 10.73) |
| Minimal | pulse | trend-ema-20-50@m1 | 7 | 6 (86 %) | 124 | 69 % | 1.21 | 19.76 | tp1.6 sl4 tr1.2 h960 mn (18 · 1.59 · 6.35) |
| Minimal | snap | ha-1@m5 | 8 | 6 (75 %) | 48 | 54 % | 1.61 | 19.35 | tp1.4 sl2.8 tr1.05 h192 mn (6 · 2.33 · 4.04) |
| Minimal | pulse | break-don55@m5 | 12 | 10 (83 %) | 120 | 78 % | 1.25 | 19.07 | tp1.6 sl4.8 tr0.8 h192 mn (10 · 1.73 · 3.63) |
| Minimal | pulse | rsi-14-25-75@m5c | 4 | 4 (100 %) | 16 | 88 % | 82.38 | 18.88 | – |
| Minimal | pulse | mc-rsi14-25@m5c | 4 | 4 (100 %) | 16 | 88 % | 82.38 | 18.88 | – |
| Minimal | ribbon | act-chop@m5 | 3 | 3 (100 %) | 56 | 80 % | 2.12 | 18.73 | tp1.6 sl4 tr0.8 h288 mn (18 · 2.68 · 7.40) |
| Minimal | snap | r-bb-adx-m@m1 | 6 | 6 (100 %) | 84 | 54 % | 5.80 | 18.40 | tp1.2 sl2.4 tr0.6 h960 mn (14 · 4.63 · 3.32) |
| Minimal | magnet | r-squeeze-m@m1 | 2 | 2 (100 %) | 19 | 79 % | 2.77 | 18.39 | tp1.6 sl2.4 tr1.2 h960 mn (10 · 2.81 · 9.39) |
| Minimal | revert | ema-pullback@m1c | 2 | 2 (100 %) | 15 | 100 % | ∞ (no loss) | 18.00 | tp1.4 sl4.2 tr0 h960 mn (8 · ∞ (no loss) · 9.60) |
| Minimal | pivot | mc-mrsi2-10@m15 | 5 | 5 (100 %) | 10 | 80 % | 6.14 | 17.89 | – |
| Minimal | snap | cci-20-200@m15 | 6 | 6 (100 %) | 24 | 92 % | 49.15 | 17.62 | – |
| Minimal | sandwich | z-50-2.5@x4@m15 | 4 | 4 (100 %) | 8 | 75 % | 47.10 | 17.27 | – |
| Minimal | snap | z-50-2.5@x4@m15 | 4 | 4 (100 %) | 8 | 75 % | 47.10 | 17.27 | – |
| Minimal | pulse | z-50-2.5@x4@m15 | 4 | 4 (100 %) | 8 | 75 % | 47.10 | 17.27 | – |
| Minimal | pivot | sar-std@m1c | 2 | 2 (100 %) | 28 | 71 % | 14.20 | 16.88 | tp1.6 sl4.8 tr1.2 h960 mn (13 · 26.70 · 12.84) |
| Minimal | pulse | squeeze-20@m1 | 4 | 4 (100 %) | 37 | 81 % | 1.65 | 16.86 | tp1.6 sl4 tr1.2 h1440 mn (10 · 2.83 · 7.86) |
| Minimal | sweep | mc-rsi4-25@m5c | 2 | 2 (100 %) | 50 | 82 % | 1.41 | 16.81 | tp1.6 sl4.8 tr0 h288 mn (25 · 1.47 · 9.40) |
| Minimal | sweep | willr-7-95@m1 | 2 | 2 (100 %) | 12 | 100 % | ∞ (no loss) | 16.80 | tp1.6 sl4.8 tr0 h960 mn (6 · ∞ (no loss) · 8.40) |
| Minimal | magnet | willr-14-80@m1c | 3 | 2 (67 %) | 233 | 79 % | 1.08 | 16.37 | tp1.6 sl4.8 tr0 h1440 mn (68 · 1.31 · 18.40) |
| Minimal | follow | act-burst-2.5@x4@m5c | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 15.60 | – |
| Minimal | sweep | mc-qrsi2-5@m5 | 28 | 18 (64 %) | 73 | 71 % | 1.34 | 15.52 | – |
| Minimal | snap | mc-rsit2-15@m15 | 10 | 8 (80 %) | 50 | 88 % | 1.93 | 15.00 | tp0.8 sl2 tr0 h64 mn (5 · ∞ (no loss) · 3.00) |
| Minimal | follow | trend-st-35-7@m1c | 13 | 7 (54 %) | 841 | 66 % | 1.03 | 14.96 | tp1.4 sl3.5 tr1.05 h1440 mn (59 · 1.19 · 8.08) |
| Minimal | sandwich | macd-hist@m5 | 1 | 1 (100 %) | 28 | 75 % | 1.89 | 14.72 | tp1.6 sl4 tr1.2 h288 mn (28 · 1.89 · 14.72) |
| Minimal | snap | mc-rsit5-30@m5 | 2 | 2 (100 %) | 36 | 67 % | 1.55 | 14.37 | tp1.6 sl2.4 tr1.2 h192 mn (18 · 1.55 · 7.18) |
| Minimal | magnet | mc-rsit7-15@m5 | 2 | 1 (50 %) | 90 | 72 % | 1.14 | 13.85 | tp1.6 sl4.8 tr1.2 h288 mn (45 · 1.28 · 14.85) |
| Minimal | pulse | sar-0.01@m5c | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 13.20 | – |
| Minimal | sweep | ema-stoch@m1 | 3 | 3 (100 %) | 51 | 78 % | 1.30 | 13.00 | tp1.6 sl4 tr0 h960 mn (17 · 1.42 · 5.40) |
| Minimal | snap | srsi-14-20@m15c | 4 | 4 (100 %) | 20 | 70 % | 1.64 | 12.94 | tp1.6 sl4.8 tr1.2 h64 mn (5 · 2.13 · 5.87) |
| Minimal | clamp | mc-mrsi2-10@m15 | 5 | 5 (100 %) | 10 | 60 % | 2.86 | 12.94 | – |
| Minimal | snap | willr-28-90@m15 | 8 | 6 (75 %) | 18 | 89 % | 4.58 | 12.87 | – |
| Minimal | sandwich | rsi-14-25-75@m5c | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 12.86 | tp1.6 sl4.8 tr0.8 h192 mn (5 · ∞ (no loss) · 6.43) |
| Minimal | sandwich | mc-rsi14-25@m5c | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 12.86 | tp1.6 sl4.8 tr0.8 h192 mn (5 · ∞ (no loss) · 6.43) |
| Minimal | snap | rsi-14-25-75@m5c | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 12.86 | tp1.6 sl4.8 tr0.8 h192 mn (5 · ∞ (no loss) · 6.43) |
| Minimal | snap | mc-rsi14-25@m5c | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 12.86 | tp1.6 sl4.8 tr0.8 h192 mn (5 · ∞ (no loss) · 6.43) |
| Minimal | revert | aroon-14@m1c | 9 | 3 (33 %) | 526 | 64 % | 1.04 | 12.80 | tp1.6 sl4.8 tr0 h1440 mn (40 · 1.96 · 24.00) |
| Minimal | clamp | mc-rsi2-10@m15c | 5 | 5 (100 %) | 10 | 60 % | 2.83 | 12.73 | – |
| Minimal | sandwich | break-fail@m1c | 1 | 1 (100 %) | 31 | 84 % | 1.69 | 12.70 | tp1.4 sl3.5 tr0 h960 mn (31 · 1.69 · 12.70) |
| Minimal | pulse | cci-40-100@m1c | 6 | 5 (83 %) | 474 | 73 % | 1.03 | 12.36 | tp1.4 sl2.8 tr0 h1440 mn (84 · 1.13 · 8.40) |
| Minimal | revert | break-retest@m5c | 2 | 2 (100 %) | 20 | 80 % | 2.15 | 12.00 | tp1.6 sl2.4 tr0 h192 mn (10 · 2.15 · 6.00) |
| Minimal | ribbon | mc-rsit14-25@m15c | 10 | 10 (100 %) | 60 | 73 % | 1.35 | 11.99 | tp1.4 sl2.8 tr0 h64 mn (6 · 2.00 · 3.00) |
| Minimal | snap | mc-rsit4-30@m5 | 4 | 3 (75 %) | 98 | 68 % | 1.15 | 11.97 | tp1.6 sl2.4 tr1.2 h192 mn (25 · 1.62 · 9.97) |
| Minimal | snap | bb-bounce-50-2@m15c | 4 | 4 (100 %) | 14 | 79 % | 3.58 | 11.84 | – |
| Minimal | snap | z-50-2@m15c | 4 | 4 (100 %) | 14 | 79 % | 3.58 | 11.84 | – |
| Minimal | pulse | aroon-25@m1 | 1 | 1 (100 %) | 21 | 81 % | 1.97 | 11.73 | tp1.6 sl4.8 tr0 h960 mn (21 · 1.97 · 11.73) |
| Minimal | clamp | mfi-14-10@m15 | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 11.43 | – |
| Minimal | ribbon | mc-tstreak-4@m5 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 11.40 | – |
| Minimal | snap | r-nr-break-m@m5 | 4 | 4 (100 %) | 20 | 65 % | 7.76 | 11.26 | tp1.4 sl3.5 tr0.7 h192 mn (5 · 34.31 · 4.44) |
| Minimal | snap | willr-14-90@m15 | 6 | 4 (67 %) | 14 | 86 % | 3.80 | 11.20 | – |
| Minimal | snap | willr-14-90@m15c | 6 | 4 (67 %) | 14 | 86 % | 3.80 | 11.20 | – |
| Minimal | clamp | srsi-14-20@m1c | 6 | 4 (67 %) | 330 | 71 % | 1.03 | 11.08 | tp1.6 sl4 tr0.8 h1440 mn (58 · 1.18 · 8.46) |
| Minimal | ribbon | sar-flip@m5 | 7 | 4 (57 %) | 424 | 65 % | 1.03 | 10.95 | tp1.6 sl4 tr1.2 h192 mn (56 · 1.24 · 11.06) |
| Minimal | follow | r-qh-rev-m@m5 | 1 | 1 (100 %) | 9 | 100 % | ∞ (no loss) | 10.80 | tp1.4 sl3.5 tr0 h192 mn (9 · ∞ (no loss) · 10.80) |
| Minimal | clamp | r-vwap-reclaim@m1 | 1 | 1 (100 %) | 9 | 100 % | ∞ (no loss) | 10.80 | tp1.4 sl4.2 tr0 h1440 mn (9 · ∞ (no loss) · 10.80) |
| Minimal | magnet | dir-emax-5-13@m1c | 2 | 2 (100 %) | 16 | 88 % | 2.80 | 10.80 | tp1.4 sl2.8 tr0 h960 mn (8 · 2.80 · 5.40) |
| Minimal | sandwich | willr-28-90@m15 | 7 | 5 (71 %) | 16 | 88 % | 3.99 | 10.76 | – |
| Minimal | pulse | willr-28-90@m15 | 7 | 5 (71 %) | 16 | 88 % | 3.99 | 10.76 | – |
| Minimal | ribbon | willr-28-95@m30 | 14 | 12 (86 %) | 56 | 75 % | 1.31 | 10.54 | – |
| Minimal | ribbon | mc-rsi3-5@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 10.40 | – |
| Minimal | pulse | trend-st@m5c | 5 | 3 (60 %) | 52 | 77 % | 1.31 | 10.38 | tp1.6 sl4.8 tr0.8 h192 mn (11 · 2.16 · 5.99) |
| Minimal | snap | sar-fast@m5 | 20 | 12 (60 %) | 60 | 77 % | 1.53 | 9.94 | – |
| Minimal | ribbon | ha-3@m5 | 1 | 1 (100 %) | 18 | 67 % | 2.31 | 9.91 | tp1.6 sl4.8 tr1.2 h192 mn (18 · 2.31 · 9.91) |
| Minimal | sandwich | mc-rsi5-30@m15c | 3 | 3 (100 %) | 26 | 77 % | 1.69 | 9.71 | tp1.6 sl4.8 tr1.2 h96 mn (8 · 2.41 · 7.31) |
| Minimal | pulse | mc-rsi5-30@m15c | 3 | 3 (100 %) | 26 | 77 % | 1.69 | 9.71 | tp1.6 sl4.8 tr1.2 h96 mn (8 · 2.41 · 7.31) |
| Minimal | follow | macd-cross@m1c | 5 | 4 (80 %) | 30 | 80 % | 2.06 | 9.51 | tp1 sl3 tr0 h1440 mn (6 · ∞ (no loss) · 4.80) |
| Minimal | sandwich | cci-20-100@m15c | 4 | 2 (50 %) | 22 | 64 % | 1.49 | 9.34 | tp1.6 sl4.8 tr1.2 h64 mn (5 · 2.13 · 5.87) |
| Minimal | pulse | cci-20-100@m15c | 4 | 2 (50 %) | 22 | 64 % | 1.49 | 9.34 | tp1.6 sl4.8 tr1.2 h64 mn (5 · 2.13 · 5.87) |
| Minimal | sandwich | mc-rsit9-20@m15 | 4 | 4 (100 %) | 12 | 67 % | 1.95 | 9.28 | – |
| Minimal | pulse | mc-rsit9-20@m15 | 4 | 4 (100 %) | 12 | 67 % | 1.95 | 9.28 | – |
| Minimal | revert | break-vol-1.3@m1c | 4 | 2 (50 %) | 30 | 70 % | 1.51 | 9.25 | tp1.6 sl4 tr0 h1440 mn (8 · 2.33 · 5.60) |
| Minimal | sweep | mc-streak-6@m5 | 3 | 3 (100 %) | 19 | 79 % | 1.58 | 9.25 | tp1.6 sl4.8 tr1.2 h288 mn (6 · 2.45 · 7.25) |
| Minimal | magnet | ha-3@m5 | 1 | 1 (100 %) | 12 | 67 % | 2.58 | 9.19 | tp1.6 sl4.8 tr1.2 h192 mn (12 · 2.58 · 9.19) |
| Minimal | sandwich | r-cvd-div@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 8.80 | – |
| Minimal | pulse | r-cvd-div@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 8.80 | – |
| Minimal | snap | mc-rsit3-30@m5 | 1 | 1 (100 %) | 43 | 58 % | 1.30 | 8.63 | tp1.6 sl2.4 tr1.2 h192 mn (43 · 1.30 · 8.63) |
| Minimal | revert | r-roofing@m5 | 2 | 2 (100 %) | 45 | 78 % | 1.21 | 8.60 | tp1.6 sl4.8 tr0 h288 mn (23 · 1.33 · 6.60) |
| Minimal | clamp | r-streak@m5 | 5 | 3 (60 %) | 125 | 73 % | 1.08 | 8.56 | tp1.6 sl4.8 tr0 h288 mn (23 · 1.33 · 6.60) |
| Minimal | clamp | macd-hist@m5c | 46 | 20 (43 %) | 138 | 72 % | 1.09 | 8.51 | – |
| Minimal | ribbon | trend-st-21-3@m15c | 2 | 2 (100 %) | 18 | 89 % | 2.11 | 8.40 | tp1.2 sl3.6 tr0 h64 mn (9 · 2.11 · 4.20) |
| Minimal | sandwich | rsi-21-30-70@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | snap | rsi-21-30-70@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | pulse | rsi-21-30-70@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | sandwich | z-50-2.5@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | snap | z-50-2.5@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | pulse | z-50-2.5@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | sandwich | cci-40-200@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | snap | cci-40-200@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | pulse | cci-40-200@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | sandwich | rsi-21-30-70@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | snap | rsi-21-30-70@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | pulse | rsi-21-30-70@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | sandwich | rsi-14-25-75@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | sandwich | mc-rsi14-25@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | snap | rsi-14-25-75@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | snap | mc-rsi14-25@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | pulse | rsi-14-25-75@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | pulse | mc-rsi14-25@m15c | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | sandwich | mc-rsit5-15@m15 | 2 | 2 (100 %) | 14 | 100 % | ∞ (no loss) | 8.40 | tp0.8 sl2.4 tr0 h64 mn (7 · ∞ (no loss) · 4.20) |
| Minimal | pulse | mc-rsit5-15@m15 | 2 | 2 (100 %) | 14 | 100 % | ∞ (no loss) | 8.40 | tp0.8 sl2.4 tr0 h64 mn (7 · ∞ (no loss) · 4.20) |
| Minimal | clamp | mc-rsi3-5@m5 | 4 | 2 (50 %) | 12 | 50 % | 2.21 | 8.23 | – |
| Minimal | pivot | r-session-trend-m@m1 | 1 | 1 (100 %) | 15 | 87 % | 1.82 | 8.20 | tp1.6 sl4.8 tr0 h960 mn (15 · 1.82 · 8.20) |
| Minimal | sweep | willr-50-95@m30 | 1 | 1 (100 %) | 10 | 80 % | 4.06 | 8.06 | tp1.6 sl2.4 tr1.2 h32 mn (10 · 4.06 · 8.06) |
| Minimal | sandwich | break-fail@m15c | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 8.00 | – |
| Minimal | pulse | break-fail@m15c | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 8.00 | – |
| Minimal | snap | willr-7-95@m5 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 7.60 | – |
| Minimal | ribbon | willr-28-95@m1c | 86 | 38 (44 %) | 844 | 65 % | 1.01 | 7.53 | tp1.2 sl3.6 tr0.9 h960 mn (9 · 2.82 · 6.93) |
| Minimal | pivot | willr-28-95@m1c | 86 | 38 (44 %) | 844 | 65 % | 1.01 | 7.53 | tp1.2 sl3.6 tr0.9 h960 mn (9 · 2.82 · 6.93) |
| Minimal | sandwich | mc-bbx-20@m15 | 1 | 1 (100 %) | 8 | 75 % | 2.41 | 7.31 | tp1.6 sl4.8 tr1.2 h96 mn (8 · 2.41 · 7.31) |
| Minimal | pulse | mc-bbx-20@m15 | 1 | 1 (100 %) | 8 | 75 % | 2.41 | 7.31 | tp1.6 sl4.8 tr1.2 h96 mn (8 · 2.41 · 7.31) |
| Minimal | sweep | mc-rsi3-5@m30 | 2 | 2 (100 %) | 20 | 80 % | 2.21 | 7.23 | tp1.4 sl2.8 tr0.7 h32 mn (10 · 2.21 · 3.62) |
| Minimal | ribbon | r-vortex@m5 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 7.20 | – |
| Minimal | sweep | mc-brk-20@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 7.20 | – |
| Minimal | ribbon | break-don20@m5 | 4 | 4 (100 %) | 16 | 75 % | 191.28 | 7.09 | – |
| Minimal | ribbon | break-fail@m1c | 5 | 4 (80 %) | 128 | 78 % | 1.05 | 6.80 | tp1.4 sl4.2 tr0 h960 mn (27 · 1.20 · 4.40) |
| Minimal | sandwich | mc-tz-25@m5 | 10 | 8 (80 %) | 49 | 78 % | 1.18 | 6.56 | tp1.4 sl2.8 tr0 h192 mn (5 · 1.60 · 1.80) |
| Minimal | snap | macd-hist-5-35-5@m5 | 6 | 6 (100 %) | 18 | 100 % | ∞ (no loss) | 6.55 | – |
| Minimal | sandwich | cci-20-200@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 6.40 | – |
| Minimal | snap | cci-20-200@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 6.40 | – |
| Minimal | pulse | cci-20-200@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 6.40 | – |
| Minimal | sandwich | move-swing-32@m1 | 1 | 1 (100 %) | 9 | 89 % | 2.24 | 6.20 | tp1.6 sl4.8 tr0 h1440 mn (9 · 2.24 · 6.20) |
| Minimal | sandwich | mc-rsit4-10@m15 | 4 | 4 (100 %) | 24 | 83 % | 1.63 | 6.20 | tp1 sl2 tr0 h64 mn (6 · 1.82 · 1.80) |
| Minimal | pulse | mc-rsit4-10@m15 | 4 | 4 (100 %) | 24 | 83 % | 1.63 | 6.20 | tp1 sl2 tr0 h64 mn (6 · 1.82 · 1.80) |
| Minimal | snap | mc-rsit3-15@m15 | 9 | 6 (67 %) | 49 | 82 % | 1.28 | 6.20 | tp0.8 sl2.4 tr0 h64 mn (5 · ∞ (no loss) · 3.00) |
| Minimal | pulse | ema-pullback-50@m1 | 10 | 4 (40 %) | 169 | 72 % | 1.06 | 6.06 | tp1.6 sl4.8 tr0.8 h960 mn (16 · 2.39 · 7.00) |
| Minimal | sandwich | break-squeeze@m1 | 1 | 1 (100 %) | 44 | 80 % | 1.14 | 6.02 | tp1.6 sl4.8 tr0 h960 mn (44 · 1.14 · 6.02) |
| Minimal | snap | mc-rsit2-20@m15 | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 6.00 | tp0.8 sl2.4 tr0 h64 mn (5 · ∞ (no loss) · 3.00) |
| Minimal | ribbon | r-sweep-m@m15 | 2 | 2 (100 %) | 10 | 60 % | 8.75 | 5.92 | tp1.6 sl4.8 tr0.8 h64 mn (5 · 8.75 · 2.96) |
| Minimal | sandwich | macd-hist-5-35-5@m5 | 14 | 12 (86 %) | 42 | 67 % | 2.23 | 5.92 | – |
| Minimal | pivot | break-fail@m1c | 2 | 2 (100 %) | 68 | 79 % | 1.08 | 5.60 | tp1.6 sl4.8 tr0 h960 mn (34 · 1.08 · 2.80) |
| Minimal | sandwich | mc-rsrev-3@m15c | 5 | 3 (60 %) | 20 | 70 % | 1.26 | 5.27 | – |
| Minimal | pulse | mc-rsrev-3@m15c | 5 | 3 (60 %) | 20 | 70 % | 1.26 | 5.27 | – |
| Minimal | magnet | act-chop@m5 | 3 | 2 (67 %) | 14 | 79 % | 2.95 | 5.26 | tp1.6 sl4.8 tr0.8 h192 mn (6 · 0.96 · -0.11) |
| Minimal | sandwich | willr-7-90@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 5.20 | – |
| Minimal | pulse | willr-7-90@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 5.20 | – |
| Minimal | sandwich | mc-rsit2-5@m15 | 2 | 2 (100 %) | 14 | 86 % | 2.18 | 5.20 | tp1 sl2 tr0 h64 mn (7 · 2.18 · 2.60) |
| Minimal | pulse | mc-rsit2-5@m15 | 2 | 2 (100 %) | 14 | 86 % | 2.18 | 5.20 | tp1 sl2 tr0 h64 mn (7 · 2.18 · 2.60) |
| Minimal | sweep | mc-rsi5-30@m5c | 1 | 1 (100 %) | 31 | 81 % | 1.17 | 5.00 | tp1.6 sl4.8 tr0 h288 mn (31 · 1.17 · 5.00) |
| Minimal | sweep | mc-lag-12@m5 | 1 | 1 (100 %) | 12 | 75 % | 1.68 | 4.82 | tp1.6 sl4.8 tr0 h192 mn (12 · 1.68 · 4.82) |
| Minimal | pivot | r-tsi-m@m1 | 9 | 4 (44 %) | 288 | 64 % | 1.02 | 4.82 | tp1.6 sl2.4 tr1.2 h960 mn (32 · 1.20 · 4.22) |
| Minimal | magnet | r-vwap-reclaim@m1 | 9 | 7 (78 %) | 29 | 69 % | 1.75 | 4.61 | – |
| Minimal | sweep | mc-rsi5-25@m5c | 1 | 1 (100 %) | 17 | 82 % | 1.31 | 4.60 | tp1.6 sl4.8 tr0 h288 mn (17 · 1.31 · 4.60) |
| Minimal | ribbon | move-cont@m1 | 2 | 2 (100 %) | 18 | 89 % | 1.85 | 4.40 | tp0.8 sl2.4 tr0 h960 mn (9 · 1.85 · 2.20) |
| Minimal | ribbon | aroon-25@m15c | 5 | 4 (80 %) | 5 | 80 % | 24.59 | 4.22 | – |
| Minimal | magnet | rsi-mid-52-48@m1c | 1 | 1 (100 %) | 11 | 82 % | 1.50 | 4.20 | tp1.6 sl4 tr0 h1440 mn (11 · 1.50 · 4.20) |
| Minimal | sweep | bb-wick@m1c | 2 | 2 (100 %) | 20 | 80 % | 1.39 | 4.02 | tp1.6 sl4.8 tr0.8 h960 mn (10 · 1.39 · 2.01) |
| Minimal | sandwich | mc-z-25@m15 | 6 | 6 (100 %) | 30 | 73 % | 1.32 | 4.01 | tp1 sl2 tr0 h64 mn (5 · 1.45 · 1.00) |
| Minimal | snap | mc-z-25@m15 | 6 | 6 (100 %) | 30 | 73 % | 1.32 | 4.01 | tp1 sl2 tr0 h64 mn (5 · 1.45 · 1.00) |
| Minimal | pulse | mc-z-25@m15 | 6 | 6 (100 %) | 30 | 73 % | 1.32 | 4.01 | tp1 sl2 tr0 h64 mn (5 · 1.45 · 1.00) |
| Minimal | sandwich | mc-iz-25@m15 | 6 | 6 (100 %) | 30 | 73 % | 1.32 | 4.01 | tp1 sl2 tr0 h64 mn (5 · 1.45 · 1.00) |
| Minimal | snap | mc-iz-25@m15 | 6 | 6 (100 %) | 30 | 73 % | 1.32 | 4.01 | tp1 sl2 tr0 h64 mn (5 · 1.45 · 1.00) |
| Minimal | pulse | mc-iz-25@m15 | 6 | 6 (100 %) | 30 | 73 % | 1.32 | 4.01 | tp1 sl2 tr0 h64 mn (5 · 1.45 · 1.00) |
| Minimal | snap | r-cvd-div@m15 | 14 | 6 (43 %) | 42 | 81 % | 1.20 | 4.00 | – |
| Minimal | sandwich | act-hf@m5 | 1 | 1 (100 %) | 6 | 67 % | 16.30 | 3.89 | tp1.6 sl4 tr1.2 h288 mn (6 · 16.30 · 3.89) |
| Minimal | pulse | act-hf@m5 | 1 | 1 (100 %) | 6 | 67 % | 16.30 | 3.89 | tp1.6 sl4 tr1.2 h288 mn (6 · 16.30 · 3.89) |
| Minimal | snap | macd-hist-8-21-5@m5 | 9 | 7 (78 %) | 45 | 76 % | 1.09 | 3.70 | tp1.6 sl4 tr0 h192 mn (5 · 1.33 · 1.40) |
| Minimal | sweep | mc-rsi5-10@m5 | 45 | 21 (47 %) | 170 | 66 % | 1.03 | 3.60 | – |
| Minimal | follow | rsi-21-30-70@m1c | 40 | 20 (50 %) | 884 | 64 % | 1.01 | 3.54 | tp1.6 sl2.4 tr1.2 h960 mn (22 · 1.79 · 10.29) |
| Minimal | pulse | sar-0.01@m5 | 1 | 1 (100 %) | 6 | 83 % | 1.88 | 3.25 | tp1.4 sl3.5 tr1.05 h288 mn (6 · 1.88 · 3.25) |
| Minimal | pulse | trix-9@m1 | 1 | 1 (100 %) | 51 | 75 % | 1.06 | 3.15 | tp1.6 sl4.8 tr0 h960 mn (51 · 1.06 · 3.15) |
| Minimal | revert | mc-rsit3-30@m5c | 10 | 6 (60 %) | 58 | 79 % | 1.11 | 3.00 | tp1 sl2.5 tr0 h192 mn (6 · 1.48 · 1.30) |
| Minimal | ribbon | srsi-14-20@m1c | 1 | 1 (100 %) | 50 | 76 % | 1.06 | 2.80 | tp1.6 sl4 tr0 h1440 mn (50 · 1.06 · 2.80) |
| Minimal | pulse | dir-st@m5 | 4 | 4 (100 %) | 12 | 67 % | 9.07 | 2.75 | – |
| Minimal | pulse | trend-st-7-2@m5 | 4 | 4 (100 %) | 12 | 67 % | 9.07 | 2.75 | – |
| Minimal | pivot | r-streak@m5 | 3 | 3 (100 %) | 85 | 67 % | 1.04 | 2.65 | tp1.6 sl4.8 tr1.2 h192 mn (28 · 1.06 · 1.22) |
| Minimal | clamp | rsi-21-30-70@m1c | 2 | 2 (100 %) | 28 | 71 % | 1.18 | 2.40 | tp1 sl1.5 tr0 h960 mn (14 · 1.18 · 1.20) |
| Minimal | clamp | act-chop@m5 | 1 | 1 (100 %) | 15 | 67 % | 1.31 | 2.36 | tp1.6 sl4.8 tr1.2 h192 mn (15 · 1.31 · 2.36) |
| Minimal | clamp | mc-z-20@m5c | 4 | 3 (75 %) | 78 | 67 % | 1.02 | 1.77 | tp1.6 sl3.2 tr0 h288 mn (19 · 1.15 · 2.60) |
| Minimal | snap | macd-cross-5-35-5@m5 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 1.75 | – |
| Minimal | pulse | aroon-14@m5 | 2 | 2 (100 %) | 10 | 80 % | 1.15 | 1.51 | tp1.6 sl4.8 tr1.2 h288 mn (5 · 1.18 · 0.91) |
| Minimal | magnet | srsi-14-10@m1c | 2 | 2 (100 %) | 8 | 75 % | 1.41 | 1.40 | – |
| Minimal | magnet | r-sweep@m1 | 4 | 2 (50 %) | 98 | 71 % | 1.02 | 0.87 | tp1 sl2.5 tr0.75 h1440 mn (24 · 1.21 · 2.88) |
| Minimal | ribbon | ema-slope-10@m1 | 1 | 1 (100 %) | 15 | 80 % | 1.05 | 0.60 | tp1.2 sl3.6 tr0 h1440 mn (15 · 1.05 · 0.60) |
| Minimal | pulse | cmf-20-0.05@m15 | 2 | 2 (100 %) | 6 | 67 % | 1.08 | 0.40 | – |
| Minimal | sandwich | cci-40-200@m15 | 2 | 2 (100 %) | 8 | 75 % | 1.09 | 0.40 | – |
| Minimal | pulse | cci-40-200@m15 | 2 | 2 (100 %) | 8 | 75 % | 1.09 | 0.40 | – |
| Minimal | snap | cci-40-200@m15 | 2 | 2 (100 %) | 8 | 75 % | 1.09 | 0.40 | – |
| Minimal | sandwich | dir-vwap-30@m1c | 1 | 1 (100 %) | 31 | 77 % | 1.02 | 0.30 | tp1 sl2.5 tr0 h1440 mn (31 · 1.02 · 0.30) |
| Minimal | sandwich | macd-cross-5-35-5@m5 | 14 | 12 (86 %) | 28 | 50 % | 1.04 | 0.20 | – |
| Minimal | pulse | dir-vwap-120@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 0.12 | – |
| Minimal | pivot | r-nr-break@m15 | 8 | 6 (75 %) | 40 | 60 % | 1.01 | 0.09 | tp0.8 sl1.2 tr0.6 h64 mn (5 · 1.32 · 0.50) |
| Minimal | revert | mc-tz-25@m5 | 1 | 0 (0 %) | 48 | 79 % | 1.00 | -0.12 | tp1.4 sl4.2 tr0 h192 mn (48 · 1.00 · -0.12) |
| Minimal | ribbon | break-don55@m15 | 5 | 2 (40 %) | 10 | 70 % | 0.96 | -0.40 | – |
| Minimal | snap | mc-z-20@m5c | 1 | 0 (0 %) | 11 | 45 % | 0.94 | -0.43 | tp1.6 sl3.2 tr1.2 h288 mn (11 · 0.94 · -0.43) |
| Minimal | pulse | trend-st@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -0.48 | – |
| Minimal | sandwich | mc-z-25@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.78 | -0.59 | – |
| Minimal | snap | mc-z-25@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.78 | -0.59 | – |
| Minimal | pulse | mc-z-25@m15c | 2 | 0 (0 %) | 8 | 50 % | 0.78 | -0.59 | – |
| Minimal | sandwich | mc-vwapd-2@m15 | 2 | 0 (0 %) | 14 | 71 % | 0.91 | -0.80 | tp1 sl2 tr0 h64 mn (7 · 0.91 · -0.40) |
| Minimal | pulse | mc-vwapd-2@m15 | 2 | 0 (0 %) | 14 | 71 % | 0.91 | -0.80 | tp1 sl2 tr0 h64 mn (7 · 0.91 · -0.40) |
| Minimal | clamp | r-inside-m@m1 | 2 | 0 (0 %) | 26 | 62 % | 0.89 | -1.33 | tp1 sl2.5 tr0.5 h960 mn (13 · 0.89 · -0.66) |
| Minimal | revert | r-nr-break-m@m5c | 2 | 0 (0 %) | 16 | 50 % | 0.85 | -1.34 | tp1.6 sl4 tr0.8 h192 mn (8 · 0.85 · -0.67) |
| Minimal | sandwich | willr-50-80@m15 | 4 | 2 (50 %) | 22 | 73 % | 0.90 | -1.40 | tp1 sl2.5 tr0 h64 mn (5 · 1.19 · 0.50) |
| Minimal | pulse | willr-50-80@m15 | 4 | 2 (50 %) | 22 | 73 % | 0.90 | -1.40 | tp1 sl2.5 tr0 h64 mn (5 · 1.19 · 0.50) |
| Minimal | snap | mc-rsit2-10@m15 | 4 | 2 (50 %) | 22 | 73 % | 0.90 | -1.40 | tp1 sl2.5 tr0 h64 mn (5 · 1.19 · 0.50) |
| Minimal | sandwich | r-zdist@m15 | 2 | 0 (0 %) | 8 | 75 % | 0.84 | -1.60 | – |
| Minimal | snap | r-zdist@m15 | 2 | 0 (0 %) | 8 | 75 % | 0.84 | -1.60 | – |
| Minimal | pulse | r-zdist@m15 | 2 | 0 (0 %) | 8 | 75 % | 0.84 | -1.60 | – |
| Minimal | snap | mc-rsrev-3@m15 | 2 | 0 (0 %) | 8 | 75 % | 0.84 | -1.60 | – |
| Minimal | revert | kelt-20-2.5@m1c | 2 | 0 (0 %) | 64 | 78 % | 0.97 | -1.60 | tp1.4 sl4.2 tr0 h960 mn (32 · 0.97 · -0.80) |
| Minimal | follow | mc-lag-3@m30 | 2 | 0 (0 %) | 16 | 63 % | 0.83 | -2.00 | tp1.2 sl1.8 tr0 h32 mn (8 · 0.83 · -1.00) |
| Minimal | ribbon | willr-50-95@m30 | 9 | 3 (33 %) | 27 | 67 % | 0.90 | -2.10 | – |
| Minimal | ribbon | squeeze-20@m5 | 2 | 0 (0 %) | 12 | 67 % | 0.67 | -2.40 | tp0.8 sl1.6 tr0 h192 mn (6 · 0.67 · -1.20) |
| Minimal | sweep | mc-rsit7-15@m5 | 1 | 0 (0 %) | 12 | 75 % | 0.84 | -2.40 | tp1.6 sl4.8 tr0 h288 mn (12 · 0.84 · -2.40) |
| Minimal | snap | mc-z-20@m15 | 2 | 0 (0 %) | 12 | 67 % | 0.73 | -2.40 | tp1 sl2 tr0 h64 mn (6 · 0.73 · -1.20) |
| Minimal | magnet | sar-std@m1c | 4 | 2 (50 %) | 24 | 58 % | 0.59 | -2.47 | tp1.6 sl4.8 tr0.8 h960 mn (6 · 10.92 · 1.72) |
| Minimal | clamp | rsi-extreme@m1c | 2 | 0 (0 %) | 66 | 58 % | 0.96 | -2.58 | tp1.6 sl2.4 tr1.2 h960 mn (33 · 0.96 · -1.29) |
| Minimal | clamp | r-bbw-expand-m@m1 | 1 | 0 (0 %) | 5 | 60 % | 0.62 | -2.60 | tp1.6 sl3.2 tr0 h1440 mn (5 · 0.62 · -2.60) |
| Minimal | revert | r-pdhl@m5 | 2 | 0 (0 %) | 38 | 74 % | 0.93 | -2.80 | tp1.6 sl4 tr0 h192 mn (19 · 0.93 · -1.40) |
| Minimal | sweep | bb-bounce-50-2@m5c | 2 | 0 (0 %) | 22 | 73 % | 0.87 | -2.80 | tp1.6 sl3.2 tr0 h192 mn (10 · 0.96 · -0.40) |
| Minimal | sweep | z-50-2@m5c | 2 | 0 (0 %) | 22 | 73 % | 0.87 | -2.80 | tp1.6 sl3.2 tr0 h192 mn (10 · 0.96 · -0.40) |
| Minimal | sweep | r-bb-adx-m@m5 | 1 | 0 (0 %) | 8 | 75 % | 0.67 | -2.81 | tp1.6 sl4 tr1.2 h192 mn (8 · 0.67 · -2.81) |
| Minimal | magnet | mc-rsit4-5@m5 | 4 | 3 (75 %) | 112 | 60 % | 0.98 | -3.07 | tp1.6 sl4.8 tr1.2 h288 mn (28 · 1.16 · 6.29) |
| Minimal | sweep | willr-28-95@m1 | 2 | 1 (50 %) | 48 | 75 % | 0.94 | -3.42 | tp1.6 sl4.8 tr0 h1440 mn (23 · 1.01 · 0.20) |
| Minimal | revert | r-pdhl-m@m5 | 7 | 4 (57 %) | 143 | 73 % | 0.98 | -3.48 | tp1.6 sl4 tr1.2 h192 mn (21 · 1.15 · 2.57) |
| Minimal | sandwich | r-cvd-div@m15 | 6 | 0 (0 %) | 18 | 67 % | 0.73 | -3.60 | – |
| Minimal | pulse | r-cvd-div@m15 | 6 | 0 (0 %) | 18 | 67 % | 0.73 | -3.60 | – |
| Minimal | sweep | r-awesome-m@m30 | 1 | 0 (0 %) | 5 | 60 % | 0.45 | -3.68 | tp1.2 sl3.6 tr0.9 h48 mn (5 · 0.45 · -3.68) |
| Minimal | magnet | ema-slope-20-10@m1c | 1 | 0 (0 %) | 23 | 70 % | 0.85 | -3.73 | tp1.6 sl4 tr1.2 h1440 mn (23 · 0.85 · -3.73) |
| Minimal | sandwich | srsi-14-20@m1c | 2 | 1 (50 %) | 95 | 76 % | 0.96 | -3.80 | tp1.6 sl4.8 tr0 h1440 mn (46 · 1.01 · 0.40) |
| Minimal | ribbon | dir-emax@m5c | 2 | 0 (0 %) | 6 | 67 % | 0.58 | -3.82 | – |
| Minimal | ribbon | ema-9-21@m5c | 2 | 0 (0 %) | 6 | 67 % | 0.58 | -3.82 | – |
| Minimal | sweep | r-pin@m5 | 3 | 0 (0 %) | 65 | 77 % | 0.94 | -3.86 | tp1.6 sl4.8 tr0 h192 mn (21 · 0.99 · -0.26) |
| Minimal | sandwich | willr-21-80@m15c | 2 | 0 (0 %) | 10 | 60 % | 0.55 | -4.00 | tp1 sl2 tr0 h64 mn (5 · 0.55 · -2.00) |
| Minimal | pulse | willr-21-80@m15c | 2 | 0 (0 %) | 10 | 60 % | 0.55 | -4.00 | tp1 sl2 tr0 h64 mn (5 · 0.55 · -2.00) |
| Minimal | pulse | mc-z-20@m5c | 1 | 0 (0 %) | 9 | 44 % | 0.45 | -4.13 | tp1.6 sl3.2 tr1.2 h288 mn (9 · 0.45 · -4.13) |
| Minimal | sweep | willr-28-80@m1c | 1 | 0 (0 %) | 39 | 67 % | 0.88 | -4.13 | tp1.6 sl3.2 tr1.2 h1440 mn (39 · 0.88 · -4.13) |
| Minimal | pulse | trix-15@m1c | 2 | 0 (0 %) | 57 | 74 % | 0.93 | -4.39 | tp1.6 sl4.8 tr0 h1440 mn (27 · 0.98 · -0.60) |
| Minimal | pulse | break-fail@m5c | 1 | 0 (0 %) | 12 | 67 % | 0.55 | -4.42 | tp1.2 sl3 tr0.9 h288 mn (12 · 0.55 · -4.42) |
| Minimal | follow | mc-rsit14-25@m15c | 2 | 0 (0 %) | 14 | 57 % | 0.64 | -4.46 | tp1.4 sl2.8 tr1.05 h64 mn (7 · 0.64 · -2.23) |
| Minimal | revert | mc-rsit2-25@m5c | 1 | 0 (0 %) | 8 | 38 % | 0.17 | -4.64 | tp1.6 sl2.4 tr0.8 h288 mn (8 · 0.17 · -4.64) |
| Minimal | sandwich | mc-vwapd-3@m15 | 6 | 2 (33 %) | 34 | 65 % | 0.77 | -4.79 | tp1 sl2.5 tr0 h64 mn (5 · 1.19 · 0.50) |
| Minimal | pulse | mc-vwapd-3@m15 | 6 | 2 (33 %) | 34 | 65 % | 0.77 | -4.79 | tp1 sl2.5 tr0 h64 mn (5 · 1.19 · 0.50) |
| Minimal | sweep | r-camarilla@m1 | 13 | 5 (38 %) | 174 | 67 % | 0.96 | -4.93 | tp1.4 sl2.8 tr0 h1440 mn (12 · 1.20 · 1.80) |
| Minimal | snap | mc-rsi2-25@m15 | 6 | 0 (0 %) | 18 | 67 % | 0.59 | -5.12 | – |
| Minimal | snap | mc-rsi2-25@m15c | 6 | 0 (0 %) | 18 | 67 % | 0.59 | -5.12 | – |
| Minimal | follow | r-camarilla@m5c | 1 | 0 (0 %) | 8 | 50 % | 0.46 | -5.53 | tp1.6 sl4.8 tr1.2 h288 mn (8 · 0.46 · -5.53) |
| Minimal | snap | mc-vwapd-3@m15 | 4 | 0 (0 %) | 24 | 58 % | 0.63 | -5.79 | tp1 sl2 tr0 h64 mn (6 · 0.73 · -1.20) |
| Minimal | snap | break-atr-1.5@m5 | 4 | 1 (25 %) | 8 | 63 % | 0.50 | -6.50 | – |
| Minimal | pulse | kama-20@m5c | 22 | 10 (45 %) | 44 | 68 % | 0.81 | -6.52 | – |
| Minimal | pivot | sar-0.03@m5c | 15 | 5 (33 %) | 19 | 26 % | 0.45 | -6.58 | – |
| Minimal | sweep | r-pin-m@m15 | 3 | 0 (0 %) | 18 | 67 % | 0.70 | -6.60 | tp1.4 sl2.8 tr0 h64 mn (6 · 0.80 · -1.20) |
| Minimal | revert | break-vol@m5c | 1 | 0 (0 %) | 15 | 60 % | 0.52 | -6.60 | tp1 sl2.5 tr0.75 h288 mn (15 · 0.52 · -6.60) |
| Minimal | ribbon | z-50-2.5@x4@m5 | 4 | 0 (0 %) | 80 | 69 % | 0.92 | -6.65 | tp1.6 sl4.8 tr0 h192 mn (18 · 0.98 · -0.40) |
| Minimal | sweep | r-bb-adx@m5 | 19 | 9 (47 %) | 215 | 66 % | 0.97 | -6.81 | tp1.4 sl4.2 tr1.05 h288 mn (12 · 2.20 · 6.08) |
| Minimal | magnet | break-vol-2@m1 | 2 | 0 (0 %) | 7 | 14 % | 0.23 | -6.87 | – |
| Minimal | pulse | r-fisher-m@m5 | 4 | 0 (0 %) | 46 | 70 % | 0.83 | -6.87 | tp1.6 sl3.2 tr0.8 h192 mn (11 · 0.84 · -1.62) |
| Minimal | pulse | trend-st@m5 | 13 | 5 (38 %) | 206 | 76 % | 0.96 | -6.96 | tp1.6 sl4.8 tr1.2 h192 mn (16 · 1.17 · 2.58) |
| Minimal | pivot | break-don40@m5 | 1 | 0 (0 %) | 10 | 40 % | 0.40 | -7.03 | tp1.2 sl3.6 tr0.6 h192 mn (10 · 0.40 · -7.03) |
| Minimal | pivot | break-don55@m5 | 1 | 0 (0 %) | 10 | 40 % | 0.40 | -7.03 | tp1.2 sl3.6 tr0.6 h192 mn (10 · 0.40 · -7.03) |
| Minimal | revert | mc-rsit2-30@m5c | 1 | 0 (0 %) | 8 | 63 % | 0.45 | -7.20 | tp1.4 sl4.2 tr0 h288 mn (8 · 0.45 · -7.20) |
| Minimal | sweep | r-bos-m@m30 | 4 | 0 (0 %) | 8 | 50 % | 0.25 | -7.20 | – |
| Minimal | pulse | trend-st-14-4@m5 | 1 | 0 (0 %) | 35 | 54 % | 0.59 | -7.47 | tp0.8 sl2 tr0.6 h192 mn (35 · 0.59 · -7.47) |
| Minimal | snap | bb-wick@m5c | 3 | 0 (0 %) | 33 | 70 % | 0.62 | -7.68 | tp1.6 sl4.8 tr0.8 h288 mn (11 · 0.77 · -1.21) |
| Minimal | revert | mc-rsit2-20@m5c | 11 | 6 (55 %) | 74 | 68 % | 0.83 | -7.79 | tp1.2 sl2.4 tr0 h192 mn (7 · 1.28 · 1.08) |
| Minimal | ribbon | trend-ema-20-50@m1 | 1 | 0 (0 %) | 31 | 74 % | 0.81 | -7.80 | tp1.6 sl4.8 tr0 h1440 mn (31 · 0.81 · -7.80) |
| Minimal | pivot | z-50-2.5@x4@m5 | 5 | 0 (0 %) | 102 | 68 % | 0.92 | -7.97 | tp1.6 sl4.8 tr0 h192 mn (18 · 0.98 · -0.40) |
| Minimal | sandwich | macd-cross-8-21-5@m5 | 9 | 2 (22 %) | 36 | 69 % | 0.80 | -8.10 | – |
| Minimal | snap | macd-cross-8-21-5@m5 | 9 | 2 (22 %) | 36 | 69 % | 0.80 | -8.10 | – |
| Minimal | pivot | r-awesome-m@m1 | 3 | 0 (0 %) | 101 | 65 % | 0.90 | -8.36 | tp1.6 sl2.4 tr0 h960 mn (34 · 0.99 · -0.40) |
| Minimal | sweep | r-choch-m@m1 | 1 | 0 (0 %) | 22 | 68 % | 0.68 | -8.57 | tp1.4 sl4.2 tr0 h960 mn (22 · 0.68 · -8.57) |
| Minimal | snap | ichi-cloud-20@m1 | 1 | 0 (0 %) | 27 | 67 % | 0.67 | -8.60 | tp1.2 sl3 tr0 h960 mn (27 · 0.67 · -8.60) |
| Minimal | ribbon | r-chand@m5 | 15 | 4 (27 %) | 30 | 57 % | 0.82 | -8.65 | – |
| Minimal | sweep | mc-rsi9-20@m5 | 14 | 4 (29 %) | 120 | 65 % | 0.87 | -8.69 | tp1.4 sl3.5 tr0.7 h192 mn (8 · 3.07 · 2.75) |
| Minimal | revert | break-squeeze-120@m30 | 2 | 0 (0 %) | 16 | 56 % | 0.58 | -8.79 | tp1.6 sl4.8 tr1.2 h32 mn (8 · 0.63 · -3.76) |
| Minimal | pivot | break-squeeze-t10@m5 | 2 | 0 (0 %) | 12 | 33 % | 0.21 | -8.80 | tp0.8 sl1.2 tr0 h192 mn (6 · 0.21 · -4.40) |
| Minimal | snap | r-qh-flow-m@m1 | 13 | 5 (38 %) | 130 | 69 % | 0.94 | -8.82 | tp1.4 sl4.2 tr1.05 h960 mn (11 · 1.48 · 4.31) |
| Minimal | magnet | sar-0.01@m1c | 1 | 0 (0 %) | 9 | 56 % | 0.44 | -8.98 | tp1.6 sl4.8 tr0 h960 mn (9 · 0.44 · -8.98) |
| Minimal | follow | rsi-fast@m1c | 1 | 0 (0 %) | 21 | 71 % | 0.70 | -9.00 | tp1.6 sl4.8 tr0 h1440 mn (21 · 0.70 · -9.00) |
| Minimal | sandwich | r-sweep-m@m1 | 2 | 0 (0 %) | 44 | 59 % | 0.56 | -9.08 | tp1 sl3 tr0.5 h960 mn (22 · 0.56 · -4.54) |
| Minimal | clamp | break-squeeze-t10@m5 | 3 | 0 (0 %) | 39 | 44 % | 0.49 | -9.34 | tp1 sl3 tr0.5 h192 mn (13 · 0.92 · -0.29) |
| Minimal | sandwich | mc-rsimid-14@m5 | 1 | 0 (0 %) | 7 | 57 % | 0.37 | -9.40 | tp1.6 sl4.8 tr1.2 h288 mn (7 · 0.37 · -9.40) |
| Minimal | sweep | r-linreg@m1 | 1 | 0 (0 %) | 29 | 69 % | 0.74 | -9.80 | tp1.6 sl4 tr0 h1440 mn (29 · 0.74 · -9.80) |
| Minimal | sandwich | trend-ema-20-50@m1c | 1 | 0 (0 %) | 25 | 72 % | 0.72 | -9.80 | tp1.6 sl4.8 tr0 h1440 mn (25 · 0.72 · -9.80) |
| Minimal | pivot | r-sweep-m@m5 | 9 | 2 (22 %) | 45 | 56 % | 0.62 | -9.98 | tp1 sl2 tr0.75 h288 mn (5 · 1.75 · 1.75) |
| Minimal | sweep | move-swing-16@m5c | 79 | 45 (57 %) | 79 | 57 % | 0.73 | -10.16 | – |
| Minimal | pulse | ichi-tk-9@m5c | 1 | 0 (0 %) | 15 | 67 % | 0.56 | -10.38 | tp1.6 sl4.8 tr0 h192 mn (15 · 0.56 · -10.38) |
| Minimal | sandwich | trend-ema-5-20@m1c | 3 | 0 (0 %) | 42 | 64 % | 0.68 | -10.40 | tp1 sl1.5 tr0 h960 mn (15 · 0.71 · -3.00) |
| Minimal | snap | mc-rsi2-30@m15 | 4 | 0 (0 %) | 16 | 50 % | 0.32 | -10.61 | – |
| Minimal | snap | mc-rsi2-30@m15c | 4 | 0 (0 %) | 16 | 50 % | 0.32 | -10.61 | – |
| Minimal | sweep | bb-bounce-20-2.5@m5 | 7 | 2 (29 %) | 5 | 40 % | 0.02 | -10.66 | – |
| Minimal | sweep | z-20-2.5@m5 | 7 | 2 (29 %) | 5 | 40 % | 0.02 | -10.66 | – |
| Minimal | sweep | r-fractal-m@m30 | 6 | 1 (17 %) | 22 | 64 % | 0.63 | -10.74 | – |
| Minimal | magnet | ichi-cloud-20@m1 | 7 | 3 (43 %) | 300 | 72 % | 0.96 | -10.77 | tp1.6 sl4.8 tr1.2 h960 mn (42 · 1.24 · 7.31) |
| Minimal | follow | mc-qrsi2-5@m15 | 16 | 4 (25 %) | 154 | 66 % | 0.90 | -10.78 | tp1.4 sl2.8 tr1.05 h64 mn (9 · 1.22 · 1.30) |
| Minimal | clamp | rsi-14-20-80@m5 | 8 | 1 (13 %) | 60 | 52 % | 0.75 | -11.34 | tp1.6 sl3.2 tr1.2 h288 mn (7 · 1.06 · 0.30) |
| Minimal | ribbon | mc-mturn-10@m15c | 8 | 2 (25 %) | 8 | 25 % | 0.12 | -11.60 | – |
| Minimal | sweep | hma-16@m5c | 6 | 0 (0 %) | 30 | 60 % | 0.56 | -12.13 | tp1.6 sl4 tr0.8 h192 mn (5 · 0.62 · -1.64) |
| Minimal | sandwich | r-fisher-m@m5 | 11 | 0 (0 %) | 149 | 66 % | 0.90 | -12.15 | tp1.2 sl2.4 tr0.9 h192 mn (14 · 0.98 · -0.18) |
| Minimal | revert | bb-walk@m5c | 1 | 0 (0 %) | 5 | 40 % | 0.19 | -12.20 | tp1.6 sl4.8 tr0 h192 mn (5 · 0.19 · -12.20) |
| Minimal | ribbon | r-sweep@m1 | 2 | 0 (0 %) | 45 | 71 % | 0.75 | -12.55 | tp1.6 sl4.8 tr0 h1440 mn (22 · 0.95 · -1.20) |
| Minimal | follow | r-streak-m@m30 | 4 | 0 (0 %) | 19 | 47 % | 0.44 | -12.68 | tp1.4 sl2.8 tr0 h32 mn (5 · 0.60 · -2.40) |
| Minimal | revert | macd-cross@m1c | 7 | 2 (29 %) | 41 | 71 % | 0.64 | -12.88 | tp1.6 sl4.8 tr0.8 h960 mn (6 · 16.43 · 2.35) |
| Minimal | magnet | mc-mrsi2-10@m5 | 2 | 0 (0 %) | 18 | 67 % | 0.56 | -13.20 | tp1.6 sl4.8 tr0 h192 mn (9 · 0.56 · -6.60) |
| Minimal | snap | trend-st-28-6@m1c | 2 | 0 (0 %) | 27 | 52 % | 0.50 | -13.33 | tp1.6 sl4.8 tr0.8 h1440 mn (12 · 0.64 · -3.75) |
| Minimal | snap | r-fisher-m@m5 | 10 | 2 (20 %) | 116 | 60 % | 0.87 | -13.61 | tp1.2 sl3 tr0.9 h192 mn (11 · 1.02 · 0.24) |
| Minimal | ribbon | dir-vwap@m1c | 2 | 0 (0 %) | 98 | 73 % | 0.88 | -13.82 | tp1.6 sl4.8 tr0 h1440 mn (47 · 0.92 · -4.60) |
| Minimal | sweep | r-camarilla-m@m1 | 6 | 0 (0 %) | 62 | 61 % | 0.72 | -14.28 | tp1 sl3 tr0.5 h960 mn (11 · 0.82 · -1.21) |
| Minimal | clamp | mc-qburst-2@m5 | 5 | 0 (0 %) | 36 | 67 % | 0.69 | -14.42 | tp1.6 sl4 tr0 h192 mn (7 · 0.83 · -1.40) |
| Minimal | ribbon | dir-reclaim-50@m1 | 3 | 0 (0 %) | 64 | 53 % | 0.66 | -14.58 | tp1.6 sl4.8 tr0.8 h960 mn (20 · 0.87 · -1.55) |
| Minimal | ribbon | r-camarilla@m15c | 16 | 2 (13 %) | 48 | 67 % | 0.70 | -14.60 | – |
| Minimal | pivot | mc-tstreak-4@m5 | 20 | 8 (40 %) | 178 | 63 % | 0.88 | -14.64 | tp1.6 sl3.2 tr1.2 h288 mn (8 · 1.27 · 1.86) |
| Minimal | pivot | trend-st-14-2@m1c | 9 | 2 (22 %) | 229 | 65 % | 0.90 | -14.97 | tp1.6 sl2.4 tr0.8 h1440 mn (24 · 1.20 · 2.77) |
| Minimal | ribbon | mc-rsit5-30@m15c | 24 | 12 (50 %) | 430 | 68 % | 0.96 | -15.47 | tp1.4 sl2.1 tr1.05 h64 mn (19 · 1.45 · 4.27) |
| Minimal | pulse | mc-rsit5-30@m5 | 1 | 0 (0 %) | 53 | 64 % | 0.75 | -15.55 | tp1.6 sl4.8 tr1.2 h192 mn (53 · 0.75 · -15.55) |
| Minimal | follow | mc-rsit4-30@m5c | 4 | 0 (0 %) | 8 | 50 % | 0.01 | -16.05 | – |
| Minimal | revert | ema-slope@m1c | 6 | 2 (33 %) | 1078 | 69 % | 0.98 | -16.14 | tp1.4 sl4.2 tr1.05 h960 mn (185 · 1.16 · 24.29) |
| Minimal | magnet | z-50-2.5@x4@m1 | 2 | 0 (0 %) | 57 | 67 % | 0.76 | -16.61 | tp1.6 sl4 tr0 h1440 mn (27 · 0.79 · -7.00) |
| Minimal | clamp | move-impulse@m1c | 2 | 0 (0 %) | 31 | 45 % | 0.40 | -16.62 | tp1 sl1.5 tr0 h1440 mn (15 · 0.41 · -8.00) |
| Minimal | magnet | r-spring@m1 | 2 | 0 (0 %) | 42 | 67 % | 0.70 | -16.66 | tp1.6 sl4 tr0 h960 mn (21 · 0.74 · -6.86) |
| Minimal | sandwich | sar-0.01@m15 | 7 | 0 (0 %) | 14 | 7 % | 0.08 | -16.68 | – |
| Minimal | revert | break-don55@m5c | 1 | 0 (0 %) | 55 | 69 % | 0.68 | -16.71 | tp1.6 sl4.8 tr0.8 h288 mn (55 · 0.68 · -16.71) |
| Minimal | pivot | macd-hist-8-21-5@m5c | 15 | 7 (47 %) | 15 | 47 % | 0.34 | -17.24 | – |
| Minimal | ribbon | rsi-21-30-70@m1c | 8 | 0 (0 %) | 124 | 61 % | 0.78 | -17.59 | tp1 sl1.5 tr0 h960 mn (15 · 0.94 · -0.50) |
| Minimal | pivot | rsi-21-30-70@m1c | 8 | 0 (0 %) | 124 | 61 % | 0.78 | -17.59 | tp1 sl1.5 tr0 h960 mn (15 · 0.94 · -0.50) |
| Minimal | follow | bb-bounce-50-2@m5c | 1 | 0 (0 %) | 42 | 71 % | 0.70 | -18.00 | tp1.6 sl4.8 tr0 h192 mn (42 · 0.70 · -18.00) |
| Minimal | follow | z-50-2@m5c | 1 | 0 (0 %) | 42 | 71 % | 0.70 | -18.00 | tp1.6 sl4.8 tr0 h192 mn (42 · 0.70 · -18.00) |
| Minimal | pivot | ema-slope-10@m1c | 5 | 0 (0 %) | 67 | 61 % | 0.72 | -18.35 | tp1.2 sl3 tr0 h960 mn (14 · 0.78 · -2.80) |
| Minimal | ribbon | mc-ivwapd-2@m5c | 6 | 0 (0 %) | 36 | 67 % | 0.55 | -18.40 | tp1.2 sl3 tr0 h192 mn (6 · 0.62 · -2.40) |
| Minimal | sweep | r-squeeze@m1 | 8 | 0 (0 %) | 60 | 63 % | 0.55 | -18.40 | tp0.8 sl2 tr0 h960 mn (7 · 0.68 · -1.40) |
| Minimal | snap | mc-tz-25@m5 | 13 | 0 (0 %) | 37 | 65 % | 0.60 | -18.42 | – |
| Minimal | magnet | willr-7-95@m1 | 1 | 0 (0 %) | 21 | 52 % | 0.39 | -18.89 | tp1.2 sl3.6 tr0.9 h1440 mn (21 · 0.39 · -18.89) |
| Minimal | clamp | mc-rsi3-5@m15 | 36 | 10 (28 %) | 36 | 28 % | 0.65 | -19.18 | – |
| Minimal | revert | bb-bounce-20-3@m5c | 8 | 0 (0 %) | 24 | 58 % | 0.49 | -19.20 | – |
| Minimal | revert | r-session-trend-m@m5c | 1 | 0 (0 %) | 28 | 54 % | 0.47 | -19.70 | tp1.6 sl4.8 tr1.2 h192 mn (28 · 0.47 · -19.70) |
| Minimal | revert | r-ultimate-m@m1 | 13 | 6 (46 %) | 394 | 59 % | 0.91 | -20.01 | tp1 sl2 tr0.75 h1440 mn (28 · 1.48 · 6.82) |
| Minimal | magnet | r-session-trend-m@m15 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -20.20 | – |
| Minimal | pulse | kama-20@m5 | 27 | 8 (30 %) | 54 | 61 % | 0.59 | -20.57 | – |
| Minimal | clamp | r-vortex@m5 | 4 | 0 (0 %) | 44 | 45 % | 0.33 | -20.92 | tp0.8 sl1.6 tr0.4 h192 mn (11 · 0.39 · -4.03) |
| Minimal | pivot | kama-20@m5c | 1 | 0 (0 %) | 20 | 55 % | 0.19 | -20.97 | tp1.4 sl3.5 tr0.7 h288 mn (20 · 0.19 · -20.97) |
| Minimal | pulse | hma-32@m5 | 3 | 0 (0 %) | 21 | 38 % | 0.19 | -21.13 | tp1 sl3 tr0.5 h192 mn (7 · 0.42 · -3.71) |
| Minimal | pulse | break-squeeze@m1 | 2 | 0 (0 %) | 40 | 55 % | 0.47 | -21.73 | tp1.6 sl3.2 tr0.8 h960 mn (20 · 0.47 · -10.87) |
| Minimal | sandwich | kama-20@m5c | 4 | 0 (0 %) | 20 | 55 % | 0.32 | -22.09 | tp1.6 sl4.8 tr1.2 h192 mn (6 · 0.29 · -6.36) |
| Minimal | ribbon | aroon-25@m5 | 3 | 0 (0 %) | 21 | 57 % | 0.48 | -22.35 | tp1.6 sl4.8 tr1.2 h288 mn (7 · 0.60 · -5.95) |
| Minimal | snap | ichi-tk-20@m5c | 2 | 0 (0 %) | 12 | 33 % | 0.13 | -22.40 | tp1 sl3 tr0 h192 mn (6 · 0.13 · -11.20) |
| Minimal | clamp | r-chop@m1 | 4 | 1 (25 %) | 62 | 71 % | 0.66 | -22.96 | tp1.6 sl3.2 tr0 h1440 mn (15 · 1.13 · 1.80) |
| Minimal | magnet | willr-14-95@m1 | 1 | 0 (0 %) | 49 | 69 % | 0.60 | -23.00 | tp1.2 sl3.6 tr0 h1440 mn (49 · 0.60 · -23.00) |
| Minimal | sweep | r-inside@m1 | 25 | 5 (20 %) | 177 | 68 % | 0.87 | -23.15 | tp1 sl2.5 tr0.75 h960 mn (7 · 3.68 · 14.72) |
| Minimal | pulse | dir-vwap@m1 | 5 | 2 (40 %) | 110 | 53 % | 0.77 | -23.57 | tp1.6 sl4 tr1.2 h960 mn (23 · 1.40 · 6.20) |
| Minimal | sweep | r-clv-thrust-m@m30 | 8 | 0 (0 %) | 16 | 50 % | 0.32 | -24.00 | – |
| Minimal | revert | break-vol-1.3@m5c | 40 | 15 (38 %) | 733 | 67 % | 0.97 | -24.22 | tp1.4 sl4.2 tr1.05 h192 mn (18 · 1.59 · 8.45) |
| Minimal | snap | cci-40-200@x4@m5 | 4 | 0 (0 %) | 53 | 51 % | 0.56 | -24.35 | tp1.6 sl2.4 tr0 h192 mn (12 · 0.75 · -3.20) |
| Minimal | clamp | mc-bbx-25@m15c | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -24.40 | – |
| Minimal | magnet | break-fail@m1c | 8 | 0 (0 %) | 217 | 69 % | 0.86 | -24.75 | tp1.4 sl2.8 tr0 h960 mn (28 · 1.00 · -0.00) |
| Minimal | sweep | mc-rsi2-10@m5c | 13 | 4 (31 %) | 116 | 62 % | 0.76 | -24.75 | tp1.4 sl3.5 tr0.7 h192 mn (9 · 1.33 · 1.32) |
| Minimal | sandwich | r-chand@m5 | 4 | 0 (0 %) | 8 | 25 % | 0.09 | -24.96 | – |
| Minimal | ribbon | mc-irsi2-10@m15 | 49 | 21 (43 %) | 49 | 43 % | 0.49 | -25.10 | – |
| Minimal | magnet | break-vol-1.3@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -25.80 | – |
| Minimal | follow | rsi-extreme@m1c | 35 | 19 (54 %) | 1301 | 66 % | 0.97 | -26.73 | tp1.6 sl2.4 tr1.2 h960 mn (37 · 1.51 · 13.35) |
| Minimal | ribbon | r-streak-m@m30 | 8 | 0 (0 %) | 39 | 44 % | 0.41 | -27.36 | tp1.6 sl2.4 tr1.2 h32 mn (5 · 0.43 · -2.34) |
| Minimal | follow | move-cont@m5c | 16 | 0 (0 %) | 64 | 50 % | 0.39 | -27.96 | – |
| Minimal | pulse | mc-rsit4-30@m5 | 1 | 0 (0 %) | 52 | 65 % | 0.63 | -28.00 | tp1.6 sl4 tr0 h288 mn (52 · 0.63 · -28.00) |
| Minimal | snap | ichi-cloud-20@m5 | 2 | 0 (0 %) | 14 | 29 % | 0.16 | -28.38 | tp1.6 sl3.2 tr0 h192 mn (7 · 0.16 · -14.18) |
| Minimal | pulse | trend-adx@m5c | 5 | 0 (0 %) | 20 | 50 % | 0.28 | -28.84 | – |
| Minimal | sweep | r-elder@m30 | 5 | 0 (0 %) | 20 | 0 % | 0.00 | -28.99 | – |
| Minimal | sweep | ema-21-55@m1 | 1 | 0 (0 %) | 34 | 68 % | 0.26 | -29.63 | tp1.6 sl4.8 tr0.8 h1440 mn (34 · 0.26 · -29.63) |
| Minimal | clamp | rsi-fast@m5 | 2 | 0 (0 %) | 76 | 50 % | 0.61 | -30.09 | tp1.6 sl3.2 tr1.2 h288 mn (37 · 0.72 · -10.02) |
| Minimal | clamp | mc-rsi7-20@m5 | 2 | 0 (0 %) | 76 | 50 % | 0.61 | -30.09 | tp1.6 sl3.2 tr1.2 h288 mn (37 · 0.72 · -10.02) |
| Minimal | sandwich | break-squeeze-t25@m5 | 5 | 0 (0 %) | 35 | 57 % | 0.41 | -30.20 | tp1.4 sl2.8 tr0 h192 mn (7 · 0.53 · -4.20) |
| Minimal | pulse | trend-ema-20-50@m5 | 5 | 0 (0 %) | 108 | 64 % | 0.76 | -30.36 | tp1.6 sl4 tr1.2 h288 mn (21 · 0.83 · -4.31) |
| Minimal | sweep | act-burst-2.5@x4@m30 | 9 | 0 (0 %) | 18 | 50 % | 0.28 | -31.20 | – |
| Minimal | sweep | srsi-14-20@m1c | 18 | 5 (28 %) | 122 | 66 % | 0.67 | -31.95 | tp1.4 sl3.5 tr0.7 h1440 mn (6 · 1.16 · 0.60) |
| Minimal | clamp | z-50-2.5@x4@m5 | 9 | 2 (22 %) | 145 | 61 % | 0.77 | -33.88 | tp1.6 sl4.8 tr0 h192 mn (14 · 1.03 · 0.40) |
| Minimal | pulse | cci-40-200@x4@m5 | 9 | 1 (11 %) | 130 | 51 % | 0.66 | -33.95 | tp1.6 sl2.4 tr0 h192 mn (12 · 1.08 · 0.80) |
| Minimal | follow | mc-rsit3-25@m5c | 7 | 0 (0 %) | 28 | 50 % | 0.21 | -34.52 | – |
| Minimal | follow | mc-rsi9-15@m5c | 4 | 0 (0 %) | 32 | 31 % | 0.13 | -34.60 | tp1 sl3 tr0.75 h192 mn (8 · 0.16 · -8.35) |
| Minimal | magnet | cci-40-100@m1c | 4 | 0 (0 %) | 362 | 75 % | 0.90 | -34.98 | tp1.4 sl4.2 tr0 h960 mn (86 · 0.96 · -3.20) |
| Minimal | sweep | kama-10@m1c | 4 | 0 (0 %) | 22 | 55 % | 0.19 | -36.55 | tp1.6 sl4.8 tr0.8 h960 mn (5 · 0.22 · -7.84) |
| Minimal | magnet | ema-21-55@m1c | 4 | 0 (0 %) | 149 | 66 % | 0.79 | -37.36 | tp1.6 sl4.8 tr0 h1440 mn (34 · 0.91 · -3.60) |
| Minimal | ribbon | r-fisher-m@m5 | 3 | 0 (0 %) | 209 | 67 % | 0.84 | -37.36 | tp1.6 sl2.4 tr1.2 h288 mn (87 · 0.90 · -7.37) |
| Minimal | sweep | mc-rsi2-15@m5c | 9 | 4 (44 %) | 238 | 66 % | 0.84 | -37.41 | tp1.4 sl3.5 tr1.05 h192 mn (27 · 1.05 · 1.38) |
| Minimal | magnet | dir-emax@m1c | 19 | 7 (37 %) | 321 | 66 % | 0.87 | -37.84 | tp1.6 sl4.8 tr0 h1440 mn (14 · 1.68 · 6.80) |
| Minimal | magnet | ema-9-21@m1c | 19 | 7 (37 %) | 321 | 66 % | 0.87 | -37.84 | tp1.6 sl4.8 tr0 h1440 mn (14 · 1.68 · 6.80) |
| Minimal | clamp | r-elder@m5 | 20 | 6 (30 %) | 20 | 30 % | 0.09 | -38.20 | – |
| Minimal | pulse | ema-slope-20@m5 | 5 | 0 (0 %) | 48 | 58 % | 0.48 | -39.04 | tp1.6 sl4.8 tr1.2 h288 mn (9 · 0.60 · -5.97) |
| Minimal | ribbon | break-don40@m5 | 7 | 0 (0 %) | 30 | 37 % | 0.27 | -39.34 | tp1.4 sl3.5 tr1.05 h288 mn (5 · 0.30 · -2.82) |
| Minimal | sweep | cmf-20-0.05@m1c | 4 | 0 (0 %) | 76 | 63 % | 0.49 | -39.40 | tp1 sl3 tr0 h960 mn (19 · 0.54 · -8.80) |
| Minimal | ribbon | macd-zero@m1c | 2 | 0 (0 %) | 87 | 66 % | 0.67 | -39.45 | tp1.6 sl4 tr0 h1440 mn (42 · 0.67 · -19.60) |
| Minimal | ribbon | dir-emax-12-26@m1c | 2 | 0 (0 %) | 87 | 66 % | 0.67 | -39.45 | tp1.6 sl4 tr0 h1440 mn (42 · 0.67 · -19.60) |
| Minimal | pulse | break-squeeze-t25@m1 | 4 | 0 (0 %) | 96 | 56 % | 0.60 | -40.53 | tp1.6 sl4 tr0.8 h960 mn (24 · 0.61 · -10.13) |
| Minimal | pulse | r-sweep@m1 | 2 | 0 (0 %) | 20 | 25 % | 0.07 | -41.52 | tp1 sl3 tr0 h960 mn (10 · 0.11 · -20.00) |
| Minimal | pulse | aroon-25@m5 | 2 | 0 (0 %) | 24 | 46 % | 0.25 | -41.60 | tp1.4 sl4.2 tr0 h192 mn (12 · 0.27 · -19.20) |
| Minimal | pulse | r-streak@m5 | 5 | 0 (0 %) | 67 | 63 % | 0.57 | -42.42 | tp1.6 sl4.8 tr0 h192 mn (13 · 0.63 · -7.40) |
| Minimal | pulse | ema-stoch@m5 | 3 | 0 (0 %) | 119 | 64 % | 0.69 | -42.96 | tp1.6 sl4 tr0.8 h288 mn (38 · 0.74 · -10.07) |
| Minimal | sandwich | break-don55@m5 | 5 | 0 (0 %) | 68 | 62 % | 0.51 | -43.28 | tp1.4 sl4.2 tr0 h288 mn (13 · 0.61 · -6.80) |
| Minimal | pulse | r-fvg@m5 | 8 | 0 (0 %) | 42 | 43 % | 0.26 | -43.31 | tp1.4 sl2.1 tr0 h192 mn (6 · 0.41 · -4.10) |
| Minimal | magnet | break-retest@m1 | 8 | 1 (13 %) | 278 | 73 % | 0.84 | -43.84 | tp1.6 sl4.8 tr1.2 h1440 mn (31 · 1.05 · 1.68) |
| Minimal | sweep | mc-rsi4-20@m5c | 17 | 0 (0 %) | 155 | 72 % | 0.71 | -44.10 | tp1.4 sl4.2 tr0.7 h192 mn (9 · 0.85 · -0.76) |
| Minimal | pivot | r-chop@m1 | 4 | 0 (0 %) | 94 | 67 % | 0.64 | -47.21 | tp1.6 sl4.8 tr0 h1440 mn (22 · 0.75 · -7.60) |
| Minimal | sandwich | r-streak@m5 | 6 | 0 (0 %) | 93 | 60 % | 0.62 | -47.87 | tp1.6 sl4.8 tr0 h192 mn (15 · 0.77 · -4.60) |
| Minimal | sandwich | kama-20@m5 | 6 | 0 (0 %) | 54 | 54 % | 0.45 | -47.97 | tp1.6 sl4.8 tr0 h288 mn (7 · 0.70 · -3.00) |
| Minimal | snap | trend-st-35-7@m5 | 5 | 0 (0 %) | 75 | 57 % | 0.53 | -48.22 | tp1.4 sl4.2 tr0.7 h192 mn (15 · 0.62 · -6.31) |
| Minimal | ribbon | trend-adx@m5 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -50.89 | – |
| Minimal | sweep | mc-rsi2-20@m5c | 3 | 0 (0 %) | 119 | 66 % | 0.67 | -52.23 | tp1.6 sl4 tr1.2 h192 mn (41 · 0.72 · -14.21) |
| Minimal | magnet | act-shift@m15c | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -52.32 | – |
| Minimal | pivot | mc-rsit3-25@m15c | 5 | 0 (0 %) | 32 | 41 % | 0.17 | -54.21 | tp1.4 sl4.2 tr0 h96 mn (6 · 0.27 · -9.60) |
| Minimal | ribbon | mc-mrsi2-10@m15 | 85 | 33 (39 %) | 170 | 46 % | 0.73 | -55.42 | – |
| Minimal | sandwich | cci-40-200@x4@m5 | 9 | 0 (0 %) | 139 | 47 % | 0.54 | -55.55 | tp1.6 sl2.4 tr0 h192 mn (13 · 0.86 · -1.80) |
| Minimal | magnet | dir-emax-20-50@m1c | 3 | 0 (0 %) | 88 | 55 % | 0.55 | -55.89 | tp1.6 sl4.8 tr1.2 h1440 mn (28 · 0.62 · -13.74) |
| Minimal | sandwich | r-star@m1 | 2 | 0 (0 %) | 146 | 66 % | 0.71 | -56.19 | tp1.6 sl4.8 tr0 h960 mn (71 · 0.81 · -16.74) |
| Minimal | snap | break-atr@m5 | 10 | 0 (0 %) | 37 | 49 % | 0.23 | -56.59 | – |
| Minimal | clamp | willr-28-95@m1c | 24 | 2 (8 %) | 246 | 61 % | 0.63 | -57.23 | tp1.2 sl3.6 tr0 h960 mn (9 · 2.11 · 4.20) |
| Minimal | sandwich | macd-hist-8-21-5@m5 | 37 | 11 (30 %) | 214 | 61 % | 0.64 | -61.52 | tp1.6 sl3.2 tr0 h192 mn (5 · 1.65 · 2.20) |
| Minimal | magnet | r-elder@m1 | 13 | 0 (0 %) | 103 | 53 % | 0.42 | -61.81 | tp1.6 sl2.4 tr1.2 h1440 mn (7 · 0.95 · -0.70) |
| Minimal | ribbon | r-streak@m30 | 5 | 0 (0 %) | 38 | 29 % | 0.19 | -61.90 | tp1.4 sl2.1 tr0 h48 mn (8 · 0.31 · -7.90) |
| Minimal | revert | rsi-mom-21-15@m5 | 34 | 10 (29 %) | 136 | 60 % | 0.65 | -62.85 | – |
| Minimal | ribbon | cci-40-100@m1c | 3 | 0 (0 %) | 400 | 73 % | 0.85 | -63.17 | tp1.4 sl4.2 tr0 h1440 mn (130 · 0.91 · -12.00) |
| Minimal | pulse | kelt-20-1.5@m5 | 10 | 0 (0 %) | 50 | 44 % | 0.28 | -63.90 | tp1.6 sl4.8 tr0 h192 mn (5 · 0.42 · -5.80) |
| Minimal | sandwich | r-sweep@m1 | 4 | 0 (0 %) | 95 | 62 % | 0.50 | -64.73 | tp1.6 sl4.8 tr0 h960 mn (24 · 0.58 · -14.37) |
| Minimal | snap | r-sweep-m@m1 | 13 | 0 (0 %) | 187 | 52 % | 0.50 | -65.84 | tp0.8 sl2.4 tr0.6 h960 mn (16 · 0.90 · -0.56) |
| Minimal | ribbon | rsi-extreme@m1c | 8 | 0 (0 %) | 282 | 56 % | 0.72 | -65.98 | tp1.6 sl2.4 tr1.2 h960 mn (33 · 0.96 · -1.29) |
| Minimal | pivot | rsi-extreme@m1c | 8 | 0 (0 %) | 282 | 56 % | 0.72 | -65.98 | tp1.6 sl2.4 tr1.2 h960 mn (33 · 0.96 · -1.29) |
| Minimal | pivot | sar-0.01@m5c | 16 | 1 (6 %) | 130 | 54 % | 0.58 | -66.69 | tp1.6 sl4.8 tr0 h288 mn (7 · 1.68 · 3.40) |
| Minimal | revert | ema-21-55@m1c | 3 | 0 (0 %) | 350 | 67 % | 0.77 | -67.83 | tp1.6 sl4.8 tr0 h1440 mn (89 · 0.85 · -16.20) |
| Minimal | pulse | r-qh-flow-m@m1 | 26 | 3 (12 %) | 564 | 69 % | 0.88 | -68.14 | tp1.6 sl3.2 tr0.8 h1440 mn (23 · 1.73 · 12.48) |
| Minimal | magnet | trix-9@m1c | 11 | 2 (18 %) | 224 | 59 % | 0.63 | -68.60 | tp1.6 sl4 tr0 h1440 mn (16 · 1.44 · 5.60) |
| Minimal | sweep | r-qh-flow-m@m1 | 4 | 0 (0 %) | 75 | 55 % | 0.45 | -69.92 | tp1.6 sl4.8 tr1.2 h1440 mn (18 · 0.48 · -15.68) |
| Minimal | sweep | r-pin-m@m5 | 8 | 0 (0 %) | 72 | 53 % | 0.35 | -72.45 | tp1.6 sl4.8 tr1.2 h192 mn (8 · 0.54 · -4.68) |
| Minimal | pulse | z-50-2.5@x4@m5 | 14 | 0 (0 %) | 192 | 58 % | 0.55 | -72.52 | tp1.2 sl1.8 tr0.9 h192 mn (15 · 0.81 · -1.92) |
| Minimal | ribbon | break-don55@m5 | 21 | 4 (19 %) | 95 | 61 % | 0.37 | -72.64 | tp1.4 sl3.5 tr0.7 h192 mn (5 · 17.17 · 1.75) |
| Minimal | sweep | ema-pullback@m5c | 12 | 0 (0 %) | 72 | 36 % | 0.18 | -72.66 | tp0.8 sl1.2 tr0 h192 mn (6 · 0.43 · -2.40) |
| Minimal | pivot | break-don20@m5 | 8 | 0 (0 %) | 64 | 41 % | 0.40 | -76.90 | tp1.6 sl4.8 tr1.2 h288 mn (8 · 0.76 · -3.61) |
| Minimal | sweep | mc-rsi4-10@m5 | 31 | 5 (16 %) | 204 | 50 % | 0.65 | -80.62 | tp1.4 sl4.2 tr1.05 h192 mn (6 · 1.62 · 4.52) |
| Minimal | clamp | macd-cross-19-39-9@m15c | 20 | 0 (0 %) | 22 | 0 % | 0.00 | -81.05 | – |
| Minimal | snap | r-sweep@m1 | 10 | 0 (0 %) | 175 | 58 % | 0.47 | -81.31 | tp0.8 sl2.4 tr0.6 h1440 mn (19 · 0.81 · -1.60) |
| Minimal | pulse | break-retest@m1 | 85 | 40 (47 %) | 418 | 61 % | 0.70 | -81.66 | tp0.8 sl2 tr0.6 h1440 mn (5 · ∞ (no loss) · 3.01) |
| Minimal | sandwich | z-50-2.5@x4@m5 | 15 | 0 (0 %) | 222 | 56 % | 0.56 | -85.91 | tp1 sl1.5 tr0.75 h288 mn (16 · 0.63 · -3.51) |
| Minimal | magnet | ema-slope@m1c | 8 | 0 (0 %) | 159 | 58 % | 0.49 | -87.46 | tp1.4 sl3.5 tr0 h960 mn (19 · 0.72 · -5.98) |
| Minimal | pulse | ema-slope-10@m5 | 26 | 0 (0 %) | 135 | 52 % | 0.35 | -91.72 | tp1.2 sl3 tr0.6 h192 mn (6 · 0.66 · -1.13) |
| Minimal | sweep | r-qh-flow@m1 | 5 | 0 (0 %) | 139 | 55 % | 0.51 | -92.55 | tp1.6 sl4 tr1.2 h960 mn (30 · 0.53 · -15.82) |
| Minimal | pulse | r-chand@m5 | 14 | 0 (0 %) | 28 | 18 % | 0.06 | -92.63 | – |
| Minimal | pulse | r-star@m1 | 4 | 0 (0 %) | 124 | 52 % | 0.33 | -93.62 | tp1.6 sl4.8 tr0.8 h1440 mn (29 · 0.38 · -19.16) |
| Minimal | sandwich | break-don10@m5 | 65 | 28 (43 %) | 635 | 71 % | 0.81 | -93.67 | tp1.6 sl4.8 tr0 h192 mn (8 · 1.96 · 4.80) |
| Minimal | magnet | trend-st-21-3@m1c | 10 | 1 (10 %) | 246 | 65 % | 0.64 | -95.39 | tp1.6 sl4.8 tr1.2 h1440 mn (21 · 1.26 · 3.92) |
| Minimal | sandwich | break-squeeze-t10@m5 | 22 | 0 (0 %) | 88 | 48 % | 0.18 | -97.98 | – |
| Minimal | pulse | break-don20@m5 | 50 | 16 (32 %) | 363 | 65 % | 0.68 | -100.40 | tp1.6 sl4.8 tr0 h192 mn (6 · 1.40 · 2.00) |
| Minimal | magnet | sar-fast@m1c | 36 | 10 (28 %) | 326 | 57 % | 0.70 | -100.42 | tp1.6 sl4.8 tr1.2 h1440 mn (8 · 2.20 · 6.00) |
| Minimal | sweep | trend-ribbon@m1 | 12 | 2 (17 %) | 222 | 68 % | 0.58 | -101.22 | tp1.4 sl4.2 tr0 h960 mn (19 · 1.02 · 0.40) |
| Minimal | sandwich | break-don40@m5 | 15 | 1 (7 %) | 204 | 60 % | 0.55 | -103.57 | tp1.2 sl3.6 tr0.6 h288 mn (14 · 1.01 · 0.05) |
| Minimal | pulse | break-squeeze-t25@m5 | 21 | 0 (0 %) | 147 | 49 % | 0.34 | -105.51 | tp1 sl2 tr0.5 h192 mn (7 · 0.61 · -1.75) |
| Minimal | clamp | cci-40-100@m1c | 7 | 0 (0 %) | 922 | 70 % | 0.87 | -108.55 | tp1.2 sl3.6 tr0.9 h960 mn (146 · 0.99 · -1.40) |
| Minimal | pulse | r-valuearea@m1 | 6 | 0 (0 %) | 175 | 57 % | 0.53 | -109.91 | tp1.6 sl2.4 tr1.2 h960 mn (28 · 0.61 · -13.25) |
| Minimal | sandwich | r-elder-m@m5 | 22 | 0 (0 %) | 66 | 39 % | 0.22 | -109.97 | – |
| Minimal | revert | break-vol-2@m5c | 29 | 3 (10 %) | 319 | 61 % | 0.70 | -111.27 | tp1.4 sl4.2 tr0 h288 mn (11 · 1.23 · 2.00) |
| Minimal | snap | trend-st-14-4@m1 | 27 | 1 (4 %) | 242 | 61 % | 0.42 | -112.25 | tp1.4 sl2.8 tr0 h960 mn (8 · 1.03 · 0.16) |
| Minimal | sweep | ema-slope-200@m1 | 6 | 0 (0 %) | 460 | 70 % | 0.71 | -113.51 | tp1.6 sl4.8 tr1.2 h1440 mn (70 · 0.96 · -2.51) |
| Minimal | pulse | ema-slope-20@m5c | 13 | 0 (0 %) | 133 | 38 % | 0.19 | -115.86 | tp1.2 sl3 tr0.6 h288 mn (9 · 0.47 · -3.55) |
| Minimal | sandwich | break-squeeze-120@m5 | 31 | 1 (3 %) | 155 | 55 % | 0.31 | -119.24 | tp1.6 sl4.8 tr0 h288 mn (5 · 1.12 · 0.60) |
| Minimal | pulse | dir-reclaim-50@m1 | 19 | 2 (11 %) | 338 | 63 % | 0.70 | -119.50 | tp1.6 sl4.8 tr0 h1440 mn (15 · 1.12 · 1.80) |
| Minimal | magnet | r-pin-m@m5 | 17 | 0 (0 %) | 68 | 35 % | 0.17 | -121.74 | – |
| Minimal | pulse | break-squeeze-120@m5 | 44 | 0 (0 %) | 220 | 55 % | 0.37 | -124.44 | tp1 sl2 tr0.5 h192 mn (5 · 0.84 · -0.35) |
| Minimal | follow | bb-bounce-50-2@m1c | 30 | 8 (27 %) | 1234 | 67 % | 0.89 | -125.47 | tp1.4 sl2.1 tr1.05 h960 mn (45 · 1.30 · 9.05) |
| Minimal | follow | z-50-2@m1c | 30 | 8 (27 %) | 1234 | 67 % | 0.89 | -125.47 | tp1.4 sl2.1 tr1.05 h960 mn (45 · 1.30 · 9.05) |
| Minimal | ribbon | dir-emax@m1c | 25 | 5 (20 %) | 281 | 58 % | 0.65 | -128.10 | tp1.6 sl4.8 tr0 h960 mn (11 · 1.26 · 2.60) |
| Minimal | ribbon | ema-9-21@m1c | 25 | 5 (20 %) | 281 | 58 % | 0.65 | -128.10 | tp1.6 sl4.8 tr0 h960 mn (11 · 1.26 · 2.60) |
| Minimal | follow | mc-streak-4@m5c | 15 | 0 (0 %) | 193 | 58 % | 0.52 | -128.34 | tp1.4 sl3.5 tr0 h288 mn (13 · 0.73 · -4.00) |
| Minimal | pulse | trix-9@m1c | 24 | 2 (8 %) | 347 | 60 % | 0.62 | -130.05 | tp1.4 sl4.2 tr0.7 h960 mn (16 · 1.40 · 1.95) |
| Minimal | pulse | break-don10@m5 | 38 | 8 (21 %) | 280 | 60 % | 0.52 | -132.69 | tp1.2 sl3 tr0.6 h192 mn (8 · 1.26 · 0.87) |
| Minimal | pivot | cci-40-100@m1c | 7 | 0 (0 %) | 1038 | 68 % | 0.86 | -133.78 | tp1.2 sl3.6 tr0.9 h1440 mn (161 · 0.91 · -10.09) |
| Minimal | revert | dir-vwap@m1c | 3 | 0 (0 %) | 539 | 67 % | 0.77 | -144.71 | tp1.6 sl4 tr1.2 h1440 mn (195 · 0.77 · -47.44) |
| Minimal | magnet | trend-ema-12-26@m1c | 27 | 2 (7 %) | 296 | 62 % | 0.60 | -145.29 | tp1.6 sl4.8 tr0 h960 mn (11 · 1.14 · 1.41) |
| Minimal | sandwich | break-squeeze-30@m5 | 17 | 0 (0 %) | 172 | 47 % | 0.37 | -145.81 | tp1.2 sl2.4 tr0 h192 mn (10 · 0.58 · -4.40) |
| Minimal | snap | r-star@m1 | 13 | 0 (0 %) | 161 | 50 % | 0.40 | -149.61 | tp1.6 sl4 tr1.2 h960 mn (12 · 0.76 · -3.06) |
| Minimal | revert | ema-pullback-50@m5c | 29 | 0 (0 %) | 277 | 49 % | 0.45 | -153.01 | tp1.2 sl1.8 tr0.6 h192 mn (11 · 0.76 · -1.91) |
| Minimal | sandwich | break-vol-1.3@m5 | 16 | 0 (0 %) | 96 | 31 % | 0.11 | -155.35 | tp1.6 sl4.8 tr0.8 h192 mn (6 · 0.30 · -7.00) |
| Minimal | snap | mc-mturn-5@m5 | 16 | 0 (0 %) | 140 | 46 % | 0.36 | -165.07 | tp1.6 sl3.2 tr0 h192 mn (9 · 0.51 · -6.60) |
| Minimal | snap | mc-mturn-10@m5 | 15 | 0 (0 %) | 203 | 54 % | 0.43 | -172.68 | tp1.6 sl3.2 tr0 h288 mn (13 · 0.66 · -5.80) |
| Minimal | revert | rsi-mom-10-25@m1c | 20 | 0 (0 %) | 624 | 56 % | 0.66 | -174.61 | tp1.6 sl2.4 tr1.2 h960 mn (30 · 0.99 · -0.14) |
| Minimal | revert | mc-vwapx-15@m15c | 76 | 3 (4 %) | 76 | 4 % | 0.02 | -182.24 | – |
| Minimal | magnet | r-pin@m5 | 18 | 0 (0 %) | 209 | 57 % | 0.43 | -182.82 | tp1.6 sl4.8 tr1.2 h288 mn (10 · 0.54 · -4.69) |
| Minimal | sweep | bb-bounce-20-3@m1 | 14 | 0 (0 %) | 182 | 49 % | 0.40 | -186.52 | tp1.6 sl4 tr0 h1440 mn (13 · 0.53 · -9.80) |
| Minimal | follow | r-pin-m@m5 | 8 | 0 (0 %) | 146 | 47 % | 0.26 | -187.75 | tp1.6 sl3.2 tr0 h192 mn (17 · 0.37 · -19.40) |
| Minimal | pulse | break-squeeze-t10@m5 | 54 | 0 (0 %) | 216 | 47 % | 0.22 | -192.66 | – |
| Minimal | revert | r-qh-flow-m@m5c | 18 | 2 (11 %) | 759 | 58 % | 0.73 | -195.74 | tp1.6 sl2.4 tr1.2 h192 mn (40 · 1.04 · 1.41) |
| Minimal | follow | mc-ivwapd-2@m5c | 23 | 0 (0 %) | 138 | 50 % | 0.30 | -196.29 | tp1.4 sl2.8 tr0 h192 mn (6 · 0.40 · -5.40) |
| Minimal | pulse | trend-adx@m5 | 17 | 0 (0 %) | 93 | 32 % | 0.11 | -201.22 | tp1 sl2 tr0.5 h192 mn (6 · 0.08 · -6.11) |
| Minimal | magnet | r-fractal-m@m1 | 71 | 5 (7 %) | 511 | 52 % | 0.56 | -202.74 | tp1.4 sl2.1 tr0 h960 mn (7 · 1.30 · 1.40) |
| Minimal | sandwich | break-squeeze@m5 | 32 | 0 (0 %) | 224 | 53 % | 0.29 | -204.61 | tp0.8 sl2 tr0.4 h192 mn (7 · 0.29 · -2.82) |
| Minimal | pulse | ichi-tk-9@m1c | 41 | 0 (0 %) | 351 | 55 % | 0.45 | -208.90 | tp1.6 sl4 tr0 h960 mn (7 · 0.83 · -1.40) |
| Minimal | pulse | move-impulse-10-2@m5 | 15 | 0 (0 %) | 120 | 38 % | 0.19 | -212.39 | tp1.2 sl3 tr0.6 h192 mn (8 · 0.15 · -11.10) |
| Minimal | sandwich | cci-40-100@m1c | 9 | 0 (0 %) | 1087 | 69 % | 0.80 | -213.38 | tp1.2 sl3.6 tr0.9 h1440 mn (137 · 0.89 · -11.38) |
| Minimal | magnet | break-don40@m5 | 30 | 0 (0 %) | 90 | 20 % | 0.07 | -217.62 | – |
| Minimal | magnet | r-awesome-m@m1 | 74 | 6 (8 %) | 442 | 51 % | 0.45 | -231.03 | tp1.6 sl4 tr0 h960 mn (5 · 1.33 · 1.40) |
| Minimal | follow | ichi-cloud-9@m1c | 10 | 0 (0 %) | 1042 | 72 % | 0.80 | -234.74 | tp1.6 sl4.8 tr0 h960 mn (95 · 0.88 · -13.26) |
| Minimal | sandwich | hma-16@m1c | 20 | 0 (0 %) | 156 | 32 % | 0.16 | -258.84 | tp1.6 sl4.8 tr0 h960 mn (6 · 0.56 · -4.40) |
| Minimal | ribbon | r-star@m1 | 8 | 0 (0 %) | 440 | 58 % | 0.57 | -266.28 | tp1.6 sl4.8 tr1.2 h960 mn (56 · 0.85 · -9.93) |
| Minimal | ribbon | ema-slope-20-10@m1c | 13 | 0 (0 %) | 496 | 63 % | 0.59 | -266.64 | tp1.6 sl4.8 tr0 h960 mn (38 · 0.70 · -15.56) |
| Minimal | sandwich | break-don20@m5 | 38 | 0 (0 %) | 411 | 59 % | 0.44 | -268.01 | tp1.2 sl3 tr0.6 h192 mn (12 · 0.77 · -1.48) |
| Minimal | follow | break-vol-2@x4@m30 | 39 | 0 (0 %) | 95 | 6 % | 0.03 | -270.09 | – |
| Minimal | pulse | dir-emax-5-13@m5 | 32 | 0 (0 %) | 128 | 16 % | 0.08 | -277.29 | – |
| Minimal | sandwich | hma-55@m1c | 22 | 0 (0 %) | 706 | 57 % | 0.58 | -278.66 | tp1.4 sl2.1 tr1.05 h1440 mn (30 · 0.86 · -3.57) |
| Minimal | pulse | break-squeeze@m5 | 56 | 0 (0 %) | 392 | 54 % | 0.33 | -285.71 | tp1 sl2 tr0.5 h192 mn (7 · 0.61 · -1.75) |
| Minimal | follow | srsi-14-10@m1c | 22 | 0 (0 %) | 395 | 51 % | 0.36 | -294.56 | tp1.4 sl4.2 tr0 h1440 mn (17 · 0.65 · -7.60) |
| Minimal | magnet | ema-slope-34@m1c | 45 | 0 (0 %) | 844 | 64 % | 0.64 | -308.95 | tp1.6 sl4.8 tr0 h1440 mn (17 · 0.91 · -1.80) |
| Minimal | snap | ichi-tk-20@m5 | 28 | 0 (0 %) | 219 | 37 % | 0.25 | -322.63 | tp1.2 sl3.6 tr0.6 h288 mn (7 · 0.37 · -5.56) |
| Minimal | clamp | mc-tcross-513@m5 | 24 | 0 (0 %) | 167 | 26 % | 0.11 | -331.41 | tp1.4 sl2.1 tr0 h192 mn (7 · 0.21 · -9.10) |
| Minimal | pulse | break-squeeze-30@m5 | 65 | 0 (0 %) | 683 | 56 % | 0.45 | -346.75 | tp0.8 sl1.6 tr0 h288 mn (11 · 0.89 · -0.60) |
| Minimal | sandwich | srsi-14-10@m1c | 32 | 0 (0 %) | 381 | 53 % | 0.33 | -355.86 | tp1.4 sl4.2 tr0 h960 mn (12 · 0.55 · -8.00) |
| Minimal | magnet | break-atr-2@m1 | 11 | 0 (0 %) | 819 | 61 % | 0.62 | -360.10 | tp1.6 sl3.2 tr0 h960 mn (73 · 0.73 · -22.93) |
| Minimal | clamp | srsi-14-10@m1c | 36 | 0 (0 %) | 433 | 53 % | 0.34 | -386.66 | tp1.4 sl2.8 tr0 h960 mn (12 · 0.56 · -6.60) |
| Minimal | magnet | r-choch@m1 | 11 | 0 (0 %) | 786 | 62 % | 0.59 | -391.67 | tp1.6 sl4.8 tr0.8 h1440 mn (70 · 0.67 · -23.17) |
| Minimal | ribbon | srsi-14-10@m1c | 38 | 0 (0 %) | 459 | 52 % | 0.33 | -409.15 | tp1.4 sl2.8 tr0 h960 mn (12 · 0.56 · -6.60) |
| Minimal | pivot | srsi-14-10@m1c | 38 | 0 (0 %) | 459 | 52 % | 0.33 | -409.15 | tp1.4 sl2.8 tr0 h960 mn (12 · 0.56 · -6.60) |
| Minimal | sandwich | move-impulse-20-2.5@m1c | 45 | 0 (0 %) | 350 | 45 % | 0.27 | -414.53 | tp1.6 sl4.8 tr0 h960 mn (7 · 0.70 · -3.00) |
| Minimal | ribbon | ema-slope-34@m1c | 30 | 0 (0 %) | 666 | 59 % | 0.56 | -422.21 | tp1.6 sl4.8 tr1.2 h960 mn (21 · 0.98 · -0.39) |
| Minimal | pivot | hma-55@m1c | 30 | 0 (0 %) | 690 | 48 % | 0.35 | -457.01 | tp1.4 sl2.1 tr0 h960 mn (22 · 0.63 · -8.60) |
| Minimal | sweep | kama-20@m1c | 37 | 0 (0 %) | 276 | 25 % | 0.09 | -575.37 | tp1.4 sl2.1 tr0 h1440 mn (7 · 0.21 · -9.10) |
| Minimal | snap | srsi-14-10@m1c | 62 | 0 (0 %) | 763 | 54 % | 0.29 | -620.68 | tp0.8 sl1.2 tr0 h960 mn (14 · 0.43 · -5.60) |
| Minimal | follow | rsi-14-25-75@m1c | 99 | 4 (4 %) | 1750 | 56 % | 0.60 | -649.51 | tp1.4 sl2.8 tr1.05 h960 mn (17 · 1.15 · 2.35) |
| Minimal | revert | rsi-mom-14-25@m1c | 99 | 4 (4 %) | 1750 | 56 % | 0.60 | -649.51 | tp1.4 sl2.8 tr1.05 h960 mn (17 · 1.15 · 2.35) |
| Minimal | magnet | macd-zero@m1c | 46 | 0 (0 %) | 871 | 48 % | 0.37 | -784.82 | tp1.6 sl4.8 tr1.2 h1440 mn (16 · 0.57 · -8.64) |
| Minimal | magnet | dir-emax-12-26@m1c | 46 | 0 (0 %) | 871 | 48 % | 0.37 | -784.82 | tp1.6 sl4.8 tr1.2 h1440 mn (16 · 0.57 · -8.64) |
| Short | sandwich | r-zdist-m@m15 | 104 | 102 (98 %) | 214 | 83 % | 19.43 | 547.16 | – |
| Short | snap | r-zdist-m@m15 | 104 | 102 (98 %) | 214 | 83 % | 19.43 | 547.16 | – |
| Short | pulse | r-zdist-m@m15 | 104 | 102 (98 %) | 214 | 83 % | 19.43 | 547.16 | – |
| Short | sandwich | r-zdist@m15c | 102 | 100 (98 %) | 210 | 83 % | 19.18 | 539.96 | – |
| Short | snap | r-zdist@m15c | 102 | 100 (98 %) | 210 | 83 % | 19.18 | 539.96 | – |
| Short | pulse | r-zdist@m15c | 102 | 100 (98 %) | 210 | 83 % | 19.18 | 539.96 | – |
| Short | ribbon | willr-7-90@m30 | 47 | 31 (66 %) | 305 | 67 % | 2.18 | 204.67 | tp2.8 sl4.2 tr0 h48 sh (5 · ∞ (no loss) · 13.00) |
| Short | sweep | macd-hist@m15c | 29 | 28 (97 %) | 316 | 74 % | 1.74 | 182.94 | tp1.8 sl2.7 tr0 h96 sh (12 · 2.76 · 10.20) |
| Short | sandwich | z-50-2.5@x4@m15 | 26 | 26 (100 %) | 46 | 96 % | 418.79 | 156.51 | – |
| Short | snap | z-50-2.5@x4@m15 | 26 | 26 (100 %) | 46 | 96 % | 418.79 | 156.51 | – |
| Short | pulse | z-50-2.5@x4@m15 | 26 | 26 (100 %) | 46 | 96 % | 418.79 | 156.51 | – |
| Short | ribbon | r-pin@m15 | 18 | 18 (100 %) | 127 | 85 % | 2.89 | 153.02 | tp2.8 sl5.6 tr1.4 h96 sh (7 · 67.38 · 12.95) |
| Short | pivot | r-sweep-m@m15 | 48 | 46 (96 %) | 142 | 70 % | 2.72 | 148.65 | – |
| Short | sweep | r-vol-regime@m15 | 67 | 67 (100 %) | 67 | 100 % | ∞ (no loss) | 133.60 | – |
| Short | sandwich | r-cvd-div@m15c | 29 | 29 (100 %) | 46 | 83 % | 12.26 | 132.26 | – |
| Short | pulse | r-cvd-div@m15c | 29 | 29 (100 %) | 46 | 83 % | 12.26 | 132.26 | – |
| Short | ribbon | willr-50-95@m15 | 4 | 4 (100 %) | 48 | 100 % | ∞ (no loss) | 112.80 | tp2.8 sl5.6 tr0 h64 sh (12 · ∞ (no loss) · 31.20) |
| Short | sandwich | kama-20@m15 | 68 | 62 (91 %) | 68 | 91 % | 116.90 | 110.34 | – |
| Short | ribbon | willr-28-95@m30 | 34 | 34 (100 %) | 128 | 72 % | 1.99 | 88.32 | – |
| Short | ribbon | willr-14-90@m15 | 7 | 6 (86 %) | 234 | 61 % | 1.45 | 83.82 | tp1.8 sl3.6 tr1.35 h64 sh (31 · 2.64 · 27.67) |
| Short | ribbon | willr-28-95@m15c | 6 | 6 (100 %) | 28 | 100 % | ∞ (no loss) | 81.23 | tp2.8 sl5.6 tr2.1 h64 sh (5 · ∞ (no loss) · 17.14) |
| Short | magnet | willr-50-90@m15c | 6 | 6 (100 %) | 54 | 85 % | 7.31 | 79.16 | tp1.8 sl3.6 tr0.9 h64 sh (9 · 193.31 · 16.51) |
| Short | sweep | r-pin@m15 | 41 | 33 (80 %) | 546 | 68 % | 1.13 | 68.42 | tp2.4 sl2.4 tr1.2 h64 sh (14 · 1.62 · 5.60) |
| Short | sandwich | bb-bounce-50-2@m15c | 12 | 12 (100 %) | 34 | 76 % | 15.09 | 67.98 | – |
| Short | sandwich | z-50-2@m15c | 12 | 12 (100 %) | 34 | 76 % | 15.09 | 67.98 | – |
| Short | pulse | bb-bounce-50-2@m15c | 12 | 12 (100 %) | 34 | 76 % | 15.09 | 67.98 | – |
| Short | pulse | z-50-2@m15c | 12 | 12 (100 %) | 34 | 76 % | 15.09 | 67.98 | – |
| Short | sweep | willr-21-90@m15c | 3 | 3 (100 %) | 63 | 79 % | 2.75 | 67.58 | tp2.4 sl2.4 tr0 h64 sh (22 · 3.44 · 25.38) |
| Short | pivot | willr-28-95@m15 | 6 | 6 (100 %) | 36 | 83 % | 3.95 | 61.99 | tp2.2 sl2.2 tr1.65 h64 sh (6 · 5.76 · 11.43) |
| Short | ribbon | r-chand-m@m30 | 26 | 26 (100 %) | 26 | 100 % | ∞ (no loss) | 59.00 | – |
| Short | ribbon | trend-st-21-5@m15 | 3 | 3 (100 %) | 116 | 65 % | 1.55 | 57.06 | tp2 sl4 tr1 h64 sh (41 · 1.60 · 19.43) |
| Short | sandwich | z-50-2.5@m15c | 7 | 7 (100 %) | 19 | 89 % | 664.90 | 50.09 | – |
| Short | snap | z-50-2.5@m15c | 7 | 7 (100 %) | 19 | 89 % | 664.90 | 50.09 | – |
| Short | pulse | z-50-2.5@m15c | 7 | 7 (100 %) | 19 | 89 % | 664.90 | 50.09 | – |
| Short | sandwich | cci-40-200@m15c | 7 | 7 (100 %) | 19 | 89 % | 664.90 | 50.09 | – |
| Short | snap | cci-40-200@m15c | 7 | 7 (100 %) | 19 | 89 % | 664.90 | 50.09 | – |
| Short | pulse | cci-40-200@m15c | 7 | 7 (100 %) | 19 | 89 % | 664.90 | 50.09 | – |
| Short | clamp | cci-40-200@x4@m15 | 9 | 9 (100 %) | 18 | 100 % | ∞ (no loss) | 47.18 | – |
| Short | pivot | r-fvg@m30 | 7 | 7 (100 %) | 23 | 96 % | 11.62 | 44.61 | – |
| Short | pivot | willr-28-95@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 39.55 | – |
| Short | sweep | r-orb-m@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 37.20 | – |
| Short | ribbon | hma-55@m15c | 25 | 13 (52 %) | 13 | 100 % | ∞ (no loss) | 35.05 | – |
| Short | sandwich | rsi-21-30-70@m15 | 5 | 5 (100 %) | 11 | 82 % | 417.13 | 31.40 | – |
| Short | snap | rsi-21-30-70@m15 | 5 | 5 (100 %) | 11 | 82 % | 417.13 | 31.40 | – |
| Short | pulse | rsi-21-30-70@m15 | 5 | 5 (100 %) | 11 | 82 % | 417.13 | 31.40 | – |
| Short | sweep | willr-28-95@m30 | 17 | 13 (76 %) | 150 | 58 % | 1.22 | 28.16 | tp1.8 sl3.6 tr0.9 h32 sh (12 · 2.11 · 5.47) |
| Short | snap | bb-bounce-50-2@m15c | 4 | 4 (100 %) | 11 | 82 % | 123.54 | 27.57 | – |
| Short | snap | z-50-2@m15c | 4 | 4 (100 %) | 11 | 82 % | 123.54 | 27.57 | – |
| Short | pivot | bb-mid@m15 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 22.50 | – |
| Short | ribbon | willr-21-90@m15 | 2 | 2 (100 %) | 83 | 76 % | 1.29 | 22.12 | tp1.8 sl3.6 tr0 h96 sh (41 · 1.31 · 11.60) |
| Short | ribbon | ha-1@m15c | 5 | 5 (100 %) | 15 | 93 % | 8.57 | 21.20 | – |
| Short | sweep | willr-7-90@m15c | 1 | 1 (100 %) | 7 | 43 % | 2.56 | 20.99 | tp2.8 sl4.2 tr2.1 h96 sh (7 · 2.56 · 20.99) |
| Short | ribbon | r-fvg@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 19.80 | – |
| Short | sweep | break-squeeze-t10@m30 | 2 | 2 (100 %) | 18 | 67 % | 3.83 | 19.33 | tp2.6 sl3.9 tr1.3 h32 sh (10 · 8.01 · 11.86) |
| Short | sandwich | cci-20-100@m15c | 2 | 2 (100 %) | 12 | 67 % | 3.14 | 17.08 | tp1.8 sl1.8 tr1.35 h64 sh (6 · 3.14 · 8.54) |
| Short | pulse | cci-20-100@m15c | 2 | 2 (100 %) | 12 | 67 % | 3.14 | 17.08 | tp1.8 sl1.8 tr1.35 h64 sh (6 · 3.14 · 8.54) |
| Short | ribbon | willr-50-95@m30 | 4 | 4 (100 %) | 8 | 75 % | 37.91 | 15.19 | – |
| Short | ribbon | r-sweep@m15 | 8 | 5 (63 %) | 48 | 67 % | 1.30 | 13.92 | tp2.6 sl3.9 tr1.3 h64 sh (6 · 1.84 · 4.04) |
| Short | sandwich | willr-7-90@m15c | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 13.60 | – |
| Short | pulse | willr-7-90@m15c | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 13.60 | – |
| Short | sweep | rsi-fast@m15 | 1 | 1 (100 %) | 13 | 77 % | 2.73 | 11.40 | tp2 sl2 tr0 h96 sh (13 · 2.73 · 11.40) |
| Short | ribbon | willr-50-95@m15c | 1 | 1 (100 %) | 5 | 100 % | ∞ (no loss) | 11.00 | tp2.4 sl4.8 tr0 h96 sh (5 · ∞ (no loss) · 11.00) |
| Short | sweep | willr-50-95@m30 | 5 | 3 (60 %) | 34 | 59 % | 1.59 | 10.75 | tp2.4 sl2.4 tr1.2 h32 sh (10 · 2.87 · 6.05) |
| Short | sweep | r-td-m@m15 | 4 | 4 (100 %) | 7 | 71 % | 10.18 | 10.64 | – |
| Short | pivot | cci-40-200@x4@m15 | 2 | 2 (100 %) | 12 | 67 % | 2.39 | 10.54 | tp2 sl2 tr1 h64 sh (6 · 2.39 · 5.27) |
| Short | ribbon | willr-28-95@m15 | 1 | 1 (100 %) | 8 | 88 % | 3.08 | 10.40 | tp2.4 sl4.8 tr0 h96 sh (8 · 3.08 · 10.40) |
| Short | revert | break-squeeze-120@m30 | 8 | 5 (63 %) | 58 | 72 % | 1.15 | 10.31 | tp2.6 sl5.2 tr0 h32 sh (6 · 2.22 · 6.60) |
| Short | ribbon | r-chand-m@m15 | 2 | 2 (100 %) | 6 | 67 % | 34.76 | 10.10 | – |
| Short | revert | r-bos-m@m15c | 5 | 5 (100 %) | 15 | 93 % | 330.30 | 10.05 | – |
| Short | revert | bb-walk@x4@m15 | 2 | 2 (100 %) | 13 | 77 % | 2.10 | 10.01 | tp2.2 sl4.4 tr0 h96 sh (6 · 2.17 · 5.40) |
| Short | sweep | willr-21-95@m15 | 1 | 1 (100 %) | 8 | 88 % | 3.04 | 9.40 | tp2.2 sl4.4 tr0 h96 sh (8 · 3.04 · 9.40) |
| Short | ribbon | r-sweep-m@m15 | 2 | 2 (100 %) | 10 | 80 % | 7.22 | 8.93 | tp2.2 sl4.4 tr1.1 h64 sh (5 · 7.22 · 4.47) |
| Short | ribbon | r-valuearea-m@m15 | 63 | 41 (65 %) | 100 | 74 % | 1.40 | 7.71 | – |
| Short | ribbon | r-stc@m15 | 2 | 2 (100 %) | 6 | 67 % | 32.62 | 6.42 | – |
| Short | sweep | break-vol@m15 | 13 | 7 (54 %) | 39 | 67 % | 1.11 | 6.00 | – |
| Short | follow | r-td@m15c | 3 | 3 (100 %) | 17 | 71 % | 3.56 | 5.99 | tp2.8 sl5.6 tr1.4 h96 sh (5 · 88.64 · 4.84) |
| Short | sweep | break-vol-2@m15 | 17 | 9 (53 %) | 17 | 53 % | 1.39 | 5.83 | – |
| Short | sweep | break-vol-1.3@m15c | 2 | 2 (100 %) | 5 | 40 % | 2.22 | 5.17 | – |
| Short | sandwich | r-zdist@m15 | 8 | 4 (50 %) | 28 | 64 % | 1.11 | 4.73 | – |
| Short | snap | r-zdist@m15 | 8 | 4 (50 %) | 28 | 64 % | 1.11 | 4.73 | – |
| Short | pulse | r-zdist@m15 | 8 | 4 (50 %) | 28 | 64 % | 1.11 | 4.73 | – |
| Short | pivot | cci-40-200@m15c | 1 | 1 (100 %) | 19 | 58 % | 1.12 | 2.20 | tp2 sl2 tr0 h96 sh (19 · 1.12 · 2.20) |
| Short | sweep | squeeze-30@m15 | 2 | 2 (100 %) | 12 | 67 % | 1.25 | 2.15 | tp2.4 sl3.6 tr1.2 h96 sh (6 · 1.38 · 1.52) |
| Short | sweep | r-clv-thrust@m30 | 1 | 1 (100 %) | 8 | 63 % | 1.15 | 1.01 | tp2 sl2 tr0 h32 sh (8 · 1.15 · 1.01) |
| Short | sandwich | act-burst@m15 | 6 | 4 (67 %) | 12 | 50 % | 1.04 | 0.91 | – |
| Short | ribbon | willr-21-95@m30 | 2 | 0 (0 %) | 9 | 56 % | 0.90 | -1.04 | tp2.4 sl2.4 tr0 h32 sh (5 · 0.95 · -0.24) |
| Short | pivot | mfi-14-20@m15c | 1 | 0 (0 %) | 6 | 50 % | 0.82 | -1.20 | tp2 sl2 tr0 h64 sh (6 · 0.82 · -1.20) |
| Short | ribbon | macd-cross-19-39-9@m15 | 4 | 3 (75 %) | 12 | 58 % | 0.84 | -1.24 | – |
| Short | sweep | willr-21-95@m30 | 1 | 0 (0 %) | 10 | 50 % | 0.85 | -2.00 | tp2.4 sl2.4 tr0 h48 sh (10 · 0.85 · -2.00) |
| Short | pulse | act-burst@m15 | 15 | 8 (53 %) | 30 | 50 % | 0.94 | -3.68 | – |
| Short | sweep | r-bb-adx@m30 | 2 | 0 (0 %) | 6 | 33 % | 0.58 | -3.82 | – |
| Short | ribbon | r-star@m15 | 1 | 0 (0 %) | 6 | 67 % | 0.45 | -4.21 | tp1.8 sl3.6 tr1.35 h96 sh (6 · 0.45 · -4.21) |
| Short | pivot | macd-hist-19-39-9@m15c | 1 | 0 (0 %) | 14 | 57 % | 0.62 | -10.41 | tp2.6 sl5.2 tr0 h64 sh (14 · 0.62 · -10.41) |
| Short | magnet | break-don40@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.25 | -13.60 | – |
| Short | sandwich | sar-0.01@m15 | 8 | 0 (0 %) | 16 | 50 % | 0.49 | -14.52 | – |
| Short | revert | r-spring-m@m30 | 5 | 0 (0 %) | 10 | 50 % | 0.45 | -15.20 | – |
| Short | clamp | r-fakeout@m30 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -16.80 | – |
| Short | sweep | r-clv-thrust-m@m30 | 6 | 0 (0 %) | 12 | 50 % | 0.48 | -16.98 | – |
| Short | pivot | r-streak@m15 | 1 | 0 (0 %) | 8 | 25 % | 0.15 | -18.26 | tp2.8 sl5.6 tr1.4 h64 sh (8 · 0.15 · -18.26) |
| Short | ribbon | break-squeeze-30@m30 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -21.30 | – |
| Short | sweep | rsi-7-15-85@m30 | 4 | 0 (0 %) | 16 | 25 % | 0.29 | -24.00 | – |
| Short | ribbon | r-star-m@m15 | 6 | 0 (0 %) | 29 | 31 % | 0.26 | -33.45 | tp2.4 sl2.4 tr1.8 h96 sh (5 · 0.26 · -4.00) |
| Short | pivot | dir-thrust-4@m30 | 18 | 0 (0 %) | 36 | 50 % | 0.54 | -34.40 | – |
| Short | ribbon | r-streak-m@m30 | 9 | 0 (0 %) | 41 | 44 % | 0.40 | -35.09 | tp1.8 sl1.8 tr0 h32 sh (5 · 0.53 · -2.80) |
| Short | sweep | break-vol-1.3@m15 | 8 | 0 (0 %) | 52 | 46 % | 0.56 | -48.67 | tp2.4 sl3.6 tr1.8 h96 sh (6 · 0.75 · -2.84) |
| Short | clamp | r-fakeout-m@m30 | 12 | 0 (0 %) | 24 | 4 % | 0.03 | -51.13 | – |
| Short | sweep | act-burst-2.5@x4@m30 | 34 | 8 (24 %) | 68 | 50 % | 0.69 | -52.60 | – |
| Short | sweep | r-vortex-m@m30 | 5 | 0 (0 %) | 20 | 10 % | 0.06 | -59.00 | – |
| Short | sweep | r-rsi2@m15 | 12 | 0 (0 %) | 79 | 51 % | 0.51 | -59.24 | tp2.2 sl4.4 tr0 h96 sh (6 · 0.87 · -1.20) |
| Short | follow | r-fisher-m@m15c | 36 | 0 (0 %) | 108 | 33 % | 0.55 | -66.77 | – |
| Short | sweep | r-pin-m@m15 | 30 | 6 (20 %) | 180 | 56 % | 0.65 | -94.65 | tp2.6 sl2.6 tr1.3 h64 sh (6 · 1.53 · 2.16) |
| Short | follow | r-streak-m@m30 | 24 | 1 (4 %) | 111 | 39 % | 0.33 | -110.45 | tp2.8 sl2.8 tr1.4 h32 sh (5 · 0.67 · -2.05) |
| Short | ribbon | r-camarilla@m15c | 23 | 1 (4 %) | 69 | 29 % | 0.26 | -116.05 | – |
| Short | follow | r-streak@m15 | 9 | 0 (0 %) | 108 | 51 % | 0.45 | -135.02 | tp2.2 sl4.4 tr1.65 h96 sh (12 · 0.61 · -8.97) |
| Short | clamp | macd-cross-19-39-9@m15c | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -135.10 | – |
| Short | magnet | r-session-trend-m@m15 | 38 | 0 (0 %) | 38 | 0 % | 0.00 | -159.10 | – |
| Short | ribbon | r-streak@m15 | 9 | 0 (0 %) | 104 | 42 % | 0.36 | -165.80 | tp2.2 sl4.4 tr1.65 h96 sh (11 · 0.52 · -10.97) |
| Short | follow | r-streak@m30 | 15 | 0 (0 %) | 130 | 28 % | 0.27 | -185.27 | tp1.8 sl1.8 tr1.35 h32 sh (9 · 0.26 · -8.91) |
| Short | clamp | act-hf-5@m30 | 27 | 0 (0 %) | 54 | 6 % | 0.01 | -215.40 | – |
| Short | follow | break-vol-2@x4@m30 | 58 | 0 (0 %) | 145 | 17 % | 0.14 | -337.59 | – |
| Short | ribbon | r-streak@m30 | 38 | 0 (0 %) | 286 | 20 % | 0.14 | -572.01 | tp2 sl2 tr1.5 h32 sh (8 · 0.21 · -8.83) |
| General | sandwich | r-zdist-m@m15 | 40 | 38 (95 %) | 54 | 89 % | 14.57 | 162.90 | – |
| General | snap | r-zdist-m@m15 | 40 | 38 (95 %) | 54 | 89 % | 14.57 | 162.90 | – |
| General | pulse | r-zdist-m@m15 | 40 | 38 (95 %) | 54 | 89 % | 14.57 | 162.90 | – |
| General | sandwich | r-zdist@m15c | 39 | 37 (95 %) | 52 | 90 % | 17.46 | 161.30 | – |
| General | snap | r-zdist@m15c | 39 | 37 (95 %) | 52 | 90 % | 17.46 | 161.30 | – |
| General | pulse | r-zdist@m15c | 39 | 37 (95 %) | 52 | 90 % | 17.46 | 161.30 | – |
| General | ribbon | break-don55@m15 | 14 | 10 (71 %) | 22 | 77 % | 5.31 | 59.29 | – |
| General | pivot | willr-28-95@m15 | 6 | 6 (100 %) | 38 | 84 % | 3.71 | 57.39 | tp3.2 sl3.2 tr1.6 h64 gn (7 · 4.27 · 11.12) |
| General | sweep | macd-hist@m15c | 6 | 6 (100 %) | 69 | 65 % | 1.84 | 51.68 | tp3.2 sl3.2 tr0 h64 gn (12 · 1.96 · 10.95) |
| General | ribbon | hma-55@m15c | 19 | 13 (68 %) | 13 | 100 % | ∞ (no loss) | 45.80 | – |
| General | sandwich | z-50-2.5@x4@m15 | 10 | 8 (80 %) | 12 | 100 % | ∞ (no loss) | 45.58 | – |
| General | snap | z-50-2.5@x4@m15 | 10 | 8 (80 %) | 12 | 100 % | ∞ (no loss) | 45.58 | – |
| General | pulse | z-50-2.5@x4@m15 | 10 | 8 (80 %) | 12 | 100 % | ∞ (no loss) | 45.58 | – |
| General | sandwich | r-cvd-div@m15c | 20 | 18 (90 %) | 32 | 56 % | 2.37 | 40.38 | – |
| General | pulse | r-cvd-div@m15c | 20 | 18 (90 %) | 32 | 56 % | 2.37 | 40.38 | – |
| General | ribbon | r-sweep@m15 | 6 | 6 (100 %) | 33 | 67 % | 1.90 | 38.74 | tp4.4 sl3.3 tr0 h64 gn (6 · 2.40 · 9.80) |
| General | ribbon | willr-7-90@m30 | 7 | 7 (100 %) | 41 | 68 % | 2.02 | 35.03 | tp4 sl4 tr2 h32 gn (6 · 5.83 · 9.98) |
| General | revert | r-bos-m@m15c | 7 | 7 (100 %) | 21 | 76 % | 3.90 | 33.47 | – |
| General | ribbon | willr-28-95@m30 | 12 | 12 (100 %) | 33 | 64 % | 2.11 | 32.92 | – |
| General | pivot | r-sweep-m@m15 | 10 | 10 (100 %) | 30 | 67 % | 1.80 | 32.00 | – |
| General | magnet | willr-28-95@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 30.01 | – |
| General | pivot | willr-28-95@m15c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 29.63 | – |
| General | revert | r-inside@m15c | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 20.40 | – |
| General | ribbon | willr-21-95@m30 | 6 | 5 (83 %) | 22 | 55 % | 1.80 | 19.90 | – |
| General | sweep | r-vol-regime@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 18.80 | – |
| General | follow | r-chand-m@m15c | 2 | 2 (100 %) | 22 | 55 % | 2.00 | 18.00 | tp3.2 sl1.6 tr0 h64 gn (11 · 2.00 · 9.00) |
| General | revert | break-vol-2@m30 | 3 | 3 (100 %) | 27 | 67 % | 1.59 | 17.57 | tp4 sl3 tr0 h48 gn (9 · 1.90 · 8.68) |
| General | ribbon | willr-28-95@m15 | 1 | 1 (100 %) | 9 | 78 % | 3.13 | 16.20 | tp3.6 sl3.6 tr0 h64 gn (9 · 3.13 · 16.20) |
| General | sweep | willr-21-95@m15 | 2 | 2 (100 %) | 11 | 64 % | 1.83 | 10.55 | tp4 sl4 tr3 h96 gn (6 · 2.78 · 7.55) |
| General | pivot | willr-21-95@m15 | 1 | 1 (100 %) | 5 | 80 % | 4.03 | 10.31 | tp3.2 sl3.2 tr1.6 h96 gn (5 · 4.03 · 10.31) |
| General | ribbon | trend-st@m15c | 2 | 2 (100 %) | 5 | 60 % | 2.07 | 9.45 | – |
| General | sandwich | act-burst-1.5@m15 | 6 | 6 (100 %) | 16 | 50 % | 1.39 | 9.09 | – |
| General | clamp | cci-40-200@x4@m15 | 11 | 9 (82 %) | 21 | 57 % | 1.26 | 7.97 | – |
| General | revert | squeeze-30@m15c | 11 | 7 (64 %) | 22 | 50 % | 1.25 | 7.30 | – |
| General | pulse | act-burst@m15 | 16 | 11 (69 %) | 31 | 48 % | 1.10 | 6.26 | – |
| General | ribbon | macd-cross-19-39-9@m15 | 6 | 2 (33 %) | 18 | 50 % | 1.24 | 5.59 | – |
| General | sweep | break-squeeze-t10@m30 | 1 | 1 (100 %) | 7 | 57 % | 1.77 | 5.51 | tp3.2 sl3.2 tr2.4 h32 gn (7 · 1.77 · 5.51) |
| General | sandwich | act-burst@m15 | 4 | 4 (100 %) | 8 | 50 % | 1.32 | 5.08 | – |
| General | sweep | r-pin@m15 | 2 | 2 (100 %) | 28 | 64 % | 1.18 | 4.92 | tp3.2 sl3.2 tr1.6 h64 gn (14 · 1.18 · 2.46) |
| General | ribbon | r-chand-m@m15 | 2 | 2 (100 %) | 6 | 67 % | 1.55 | 4.40 | – |
| General | pulse | act-burst-1.5@m15 | 4 | 4 (100 %) | 10 | 40 % | 1.27 | 4.39 | – |
| General | ribbon | ha-1@m15c | 2 | 2 (100 %) | 7 | 57 % | 1.51 | 3.59 | – |
| General | sweep | r-pin-m@m15 | 1 | 1 (100 %) | 6 | 50 % | 1.13 | 0.88 | tp3.2 sl3.2 tr1.6 h64 gn (6 · 1.13 · 0.88) |
| General | pivot | mfi-14-20@m15c | 1 | 1 (100 %) | 5 | 40 % | 1.13 | 0.80 | tp3.6 sl1.8 tr0 h96 gn (5 · 1.13 · 0.80) |
| General | sandwich | sar-0.01@m15 | 5 | 4 (80 %) | 9 | 44 % | 0.93 | -1.20 | – |
| General | sweep | willr-50-95@m15 | 1 | 0 (0 %) | 7 | 43 % | 0.88 | -1.40 | tp3.6 sl2.7 tr0 h96 gn (7 · 0.88 · -1.40) |
| General | revert | r-klinger-m@m15c | 8 | 5 (63 %) | 42 | 52 % | 0.96 | -2.32 | tp4 sl3 tr0 h64 gn (6 · 1.78 · 5.02) |
| General | sweep | r-pin-m@m30 | 4 | 0 (0 %) | 8 | 50 % | 0.75 | -3.60 | – |
| General | pivot | r-nr-break@m15 | 1 | 0 (0 %) | 5 | 20 % | 0.42 | -4.60 | tp3.6 sl1.8 tr0 h96 gn (5 · 0.42 · -4.60) |
| General | pivot | r-streak@m15 | 3 | 0 (0 %) | 19 | 47 % | 0.87 | -5.36 | tp4.4 sl4.4 tr0 h96 gn (6 · 0.91 · -1.20) |
| General | sweep | willr-7-90@m15c | 1 | 0 (0 %) | 6 | 50 % | 0.57 | -5.47 | tp4 sl4 tr3 h96 gn (6 · 0.57 · -5.47) |
| General | ribbon | dir-vwap-120@m15c | 1 | 0 (0 %) | 13 | 31 % | 0.57 | -7.91 | tp4 sl4 tr2 h64 gn (13 · 0.57 · -7.91) |
| General | ribbon | r-valuearea-m@m15 | 22 | 0 (0 %) | 29 | 41 % | 0.33 | -8.30 | – |
| General | follow | r-qh-rev@m30 | 1 | 0 (0 %) | 8 | 50 % | 0.44 | -10.39 | tp4.4 sl4.4 tr3.3 h48 gn (8 · 0.44 · -10.39) |
| General | revert | r-donch-vol-m@m30 | 3 | 0 (0 %) | 33 | 39 % | 0.81 | -11.14 | tp3.2 sl3.2 tr0 h32 gn (11 · 0.87 · -2.31) |
| General | ribbon | r-streak-m@m30 | 2 | 0 (0 %) | 9 | 22 % | 0.32 | -12.98 | tp3.2 sl2.4 tr0 h48 gn (5 · 0.29 · -7.40) |
| General | magnet | break-don55@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.46 | -14.60 | – |
| General | sweep | r-rsi2@m15 | 3 | 0 (0 %) | 18 | 50 % | 0.51 | -14.83 | tp4.4 sl4.4 tr2.2 h96 gn (5 · 0.68 · -2.95) |
| General | follow | r-fisher-m@m15c | 9 | 0 (0 %) | 27 | 33 % | 0.64 | -16.74 | – |
| General | ribbon | break-squeeze-30@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -17.10 | – |
| General | sweep | willr-28-95@m30 | 18 | 7 (39 %) | 115 | 47 % | 0.90 | -17.21 | tp3.2 sl3.2 tr0 h32 gn (7 · 1.77 · 5.22) |
| General | magnet | r-session-trend-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -18.80 | – |
| General | magnet | break-don40@m15 | 4 | 0 (0 %) | 12 | 33 % | 0.46 | -19.60 | – |
| General | follow | r-pin-m@m30 | 5 | 0 (0 %) | 15 | 33 % | 0.44 | -19.99 | – |
| General | follow | r-streak@m15 | 6 | 2 (33 %) | 70 | 51 % | 0.85 | -20.53 | tp4.4 sl3.3 tr0 h96 gn (12 · 1.20 · 4.20) |
| General | clamp | macd-cross-19-39-9@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -23.50 | – |
| General | ribbon | r-camarilla@m15c | 10 | 0 (0 %) | 30 | 33 % | 0.56 | -28.02 | – |
| General | pivot | break-vol@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -28.50 | – |
| General | ribbon | r-streak@m15 | 8 | 1 (13 %) | 86 | 47 % | 0.81 | -34.54 | tp4.4 sl3.3 tr0 h96 gn (11 · 1.00 · 0.00) |
| General | clamp | r-fakeout-m@m30 | 7 | 0 (0 %) | 14 | 0 % | 0.00 | -34.87 | – |
| General | ribbon | r-star-m@m15 | 4 | 0 (0 %) | 20 | 30 % | 0.30 | -35.57 | tp3.6 sl3.6 tr1.8 h96 gn (5 · 0.18 · -6.40) |
| General | pivot | rsi-mid-60-40@m15c | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -40.20 | – |
| General | follow | r-streak-m@m30 | 6 | 0 (0 %) | 24 | 25 % | 0.28 | -43.15 | tp3.2 sl2.4 tr0 h48 gn (5 · 0.29 · -7.40) |
| General | revert | r-camarilla-m@m15 | 2 | 0 (0 %) | 75 | 48 % | 0.53 | -74.79 | tp4 sl4 tr2 h96 gn (37 · 0.54 · -36.73) |
| General | follow | r-qh-rev-m@m15c | 10 | 0 (0 %) | 20 | 0 % | 0.00 | -84.40 | – |
| General | ribbon | ichi-tk-9@m30 | 5 | 0 (0 %) | 52 | 23 % | 0.21 | -100.65 | tp3.2 sl3.2 tr2.4 h48 gn (10 · 0.26 · -17.59) |
| General | follow | r-streak@m30 | 11 | 0 (0 %) | 93 | 20 % | 0.27 | -154.63 | tp3.2 sl1.6 tr0 h48 gn (9 · 0.21 · -11.40) |
| General | ribbon | trend-st-21-5@m15 | 4 | 0 (0 %) | 95 | 37 % | 0.30 | -166.11 | tp4.4 sl4.4 tr2.2 h64 gn (26 · 0.29 · -39.44) |
| General | follow | break-vol-2@x4@m30 | 33 | 0 (0 %) | 84 | 7 % | 0.11 | -206.59 | – |
| General | ribbon | r-streak@m30 | 22 | 0 (0 %) | 163 | 11 % | 0.11 | -374.05 | tp4.4 sl2.2 tr0 h48 gn (8 · 0.25 · -12.60) |
| Long | ribbon | willr-28-95@m15 | 16 | 16 (100 %) | 82 | 82 % | 5.60 | 380.54 | tp5.6 sl5.6 tr2.8 h64 lg (6 · 7.44 · 37.35) |
| Long | ribbon | willr-28-95@m15c | 23 | 19 (83 %) | 57 | 93 % | 398.45 | 248.79 | – |
| Long | ribbon | r-sweep@m15 | 26 | 26 (100 %) | 124 | 73 % | 2.45 | 248.52 | tp6.4 sl4.8 tr0 h64 lg (5 · 4.96 · 19.80) |
| Long | sandwich | r-zdist@m15c | 50 | 44 (88 %) | 44 | 100 % | ∞ (no loss) | 224.23 | – |
| Long | snap | r-zdist@m15c | 50 | 44 (88 %) | 44 | 100 % | ∞ (no loss) | 224.23 | – |
| Long | pulse | r-zdist@m15c | 50 | 44 (88 %) | 44 | 100 % | ∞ (no loss) | 224.23 | – |
| Long | sandwich | r-zdist-m@m15 | 50 | 44 (88 %) | 44 | 100 % | ∞ (no loss) | 224.23 | – |
| Long | snap | r-zdist-m@m15 | 50 | 44 (88 %) | 44 | 100 % | ∞ (no loss) | 224.23 | – |
| Long | pulse | r-zdist-m@m15 | 50 | 44 (88 %) | 44 | 100 % | ∞ (no loss) | 224.23 | – |
| Long | ribbon | r-pin@m15 | 15 | 15 (100 %) | 81 | 81 % | 3.40 | 221.41 | tp6.4 sl6.4 tr0 h64 lg (7 · 5.23 · 27.89) |
| Long | ribbon | r-sweep-m@m15 | 12 | 12 (100 %) | 40 | 100 % | ∞ (no loss) | 183.30 | – |
| Long | sandwich | r-cvd-div@m15c | 40 | 34 (85 %) | 34 | 100 % | ∞ (no loss) | 170.23 | – |
| Long | pulse | r-cvd-div@m15c | 40 | 34 (85 %) | 34 | 100 % | ∞ (no loss) | 170.23 | – |
| Long | magnet | willr-28-95@m15c | 35 | 28 (80 %) | 28 | 100 % | ∞ (no loss) | 156.27 | – |
| Long | ribbon | willr-21-95@m30 | 9 | 9 (100 %) | 26 | 81 % | 5.57 | 123.28 | – |
| Long | ribbon | break-don55@m15 | 31 | 25 (81 %) | 31 | 81 % | 7.62 | 121.77 | – |
| Long | sweep | willr-28-95@m30 | 20 | 19 (95 %) | 94 | 73 % | 1.84 | 105.79 | tp5.2 sl5.2 tr0 h32 lg (5 · 2.78 · 9.62) |
| Long | ribbon | willr-7-90@m30 | 3 | 3 (100 %) | 13 | 77 % | 13.89 | 79.94 | tp6.4 sl6.4 tr0 h32 lg (6 · 12.27 · 23.29) |
| Long | ribbon | dir-vwap-240@m15c | 2 | 2 (100 %) | 19 | 79 % | 3.78 | 73.30 | tp6.4 sl6.4 tr4.8 h96 lg (10 · 4.27 · 43.10) |
| Long | ribbon | r-chand-m@m15 | 6 | 6 (100 %) | 17 | 82 % | 7.45 | 72.86 | – |
| Long | sandwich | willr-7-90@m15c | 15 | 12 (80 %) | 12 | 100 % | ∞ (no loss) | 62.13 | – |
| Long | pulse | willr-7-90@m15c | 15 | 12 (80 %) | 12 | 100 % | ∞ (no loss) | 62.13 | – |
| Long | pivot | r-sweep-m@m15 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 48.00 | – |
| Long | ribbon | act-chop@m30 | 9 | 7 (78 %) | 10 | 80 % | 8.09 | 38.70 | – |
| Long | ribbon | willr-50-95@m15 | 1 | 1 (100 %) | 8 | 88 % | 8.68 | 38.40 | tp6.4 sl4.8 tr0 h96 lg (8 · 8.68 · 38.40) |
| Long | ribbon | macd-cross-19-39-9@m15 | 10 | 7 (70 %) | 30 | 63 % | 1.78 | 33.25 | – |
| Long | ribbon | willr-28-95@m30 | 10 | 9 (90 %) | 20 | 70 % | 2.19 | 32.05 | – |
| Long | sandwich | r-linreg-m@m15 | 12 | 5 (42 %) | 5 | 100 % | ∞ (no loss) | 27.80 | – |
| Long | magnet | ema-slope-10@m15c | 3 | 3 (100 %) | 15 | 80 % | 2.52 | 27.66 | tp5.2 sl5.2 tr0 h64 lg (5 · 3.70 · 14.60) |
| Long | sweep | r-pdhl-m@m30 | 7 | 7 (100 %) | 14 | 93 % | 314.99 | 24.81 | – |
| Long | clamp | cci-40-200@x4@m15 | 27 | 15 (56 %) | 52 | 58 % | 1.21 | 21.31 | – |
| Long | ribbon | willr-50-95@m15c | 1 | 1 (100 %) | 5 | 80 % | 5.88 | 20.58 | tp6.4 sl4.8 tr0 h64 lg (5 · 5.88 · 20.58) |
| Long | revert | r-bos-m@m15c | 16 | 10 (63 %) | 30 | 67 % | 1.29 | 13.05 | – |
| Long | magnet | ema-slope-10@m15 | 1 | 1 (100 %) | 5 | 80 % | 1.92 | 6.07 | tp6.4 sl6.4 tr4.8 h64 lg (5 · 1.92 · 6.07) |
| Long | sweep | break-squeeze-120@m30 | 1 | 1 (100 %) | 5 | 60 % | 1.38 | 3.80 | tp4.8 sl4.8 tr0 h32 lg (5 · 1.38 · 3.80) |
| Long | revert | r-choch-m@m15 | 1 | 1 (100 %) | 21 | 52 % | 1.03 | 2.20 | tp6.4 sl6.4 tr0 h96 lg (21 · 1.03 · 2.20) |
| Long | magnet | willr-14-95@m15 | 14 | 3 (21 %) | 6 | 50 % | 3.94 | 1.88 | – |
| Long | sandwich | sar-0.01@m15 | 6 | 4 (67 %) | 10 | 40 % | 1.00 | -0.00 | – |
| Long | magnet | dir-vwap-30@m15 | 1 | 0 (0 %) | 5 | 60 % | 0.96 | -0.44 | tp4.8 sl4.8 tr3.6 h64 lg (5 · 0.96 · -0.44) |
| Long | revert | break-vol-2@m30 | 1 | 0 (0 %) | 9 | 67 % | 0.93 | -1.09 | tp4.8 sl4.8 tr3.6 h48 lg (9 · 0.93 · -1.09) |
| Long | ribbon | r-valuearea-m@m15 | 42 | 0 (0 %) | 47 | 49 % | 0.67 | -3.93 | – |
| Long | revert | break-vol-1.3@m15 | 1 | 0 (0 %) | 16 | 69 % | 0.85 | -4.79 | tp6.4 sl6.4 tr3.2 h96 lg (16 · 0.85 · -4.79) |
| Long | sandwich | act-burst@m15 | 11 | 0 (0 %) | 22 | 50 % | 0.85 | -9.00 | – |
| Long | magnet | break-don55@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.46 | -10.80 | – |
| Long | follow | r-qh-rev-m@m15 | 1 | 0 (0 %) | 6 | 50 % | 0.45 | -10.92 | tp6.4 sl6.4 tr3.2 h96 lg (6 · 0.45 · -10.92) |
| Long | sweep | willr-7-90@m15c | 1 | 0 (0 %) | 5 | 20 % | 0.31 | -12.20 | tp5.6 sl4.2 tr0 h96 lg (5 · 0.31 · -12.20) |
| Long | pulse | act-burst@m15 | 10 | 1 (10 %) | 18 | 44 % | 0.75 | -12.91 | – |
| Long | ribbon | macd-hist-8-21-5@m15c | 3 | 0 (0 %) | 9 | 33 % | 0.56 | -13.20 | – |
| Long | follow | r-qh-rev@m30 | 2 | 0 (0 %) | 16 | 56 % | 0.61 | -15.38 | tp6.4 sl6.4 tr3.2 h48 lg (8 · 0.82 · -3.50) |
| Long | pivot | cci-40-200@x4@m15 | 2 | 0 (0 %) | 11 | 45 % | 0.51 | -19.37 | tp6.4 sl6.4 tr3.2 h96 lg (6 · 0.65 · -7.00) |
| Long | magnet | break-don40@m15 | 6 | 0 (0 %) | 18 | 33 % | 0.56 | -23.20 | – |
| Long | revert | break-vol-2@m15 | 2 | 0 (0 %) | 16 | 31 % | 0.42 | -24.03 | tp4.8 sl4.8 tr3.6 h64 lg (8 · 0.43 · -11.67) |
| Long | ribbon | r-star-m@m15 | 3 | 0 (0 %) | 14 | 29 % | 0.36 | -26.57 | tp4.8 sl3.6 tr0 h96 lg (5 · 0.30 · -10.60) |
| Long | follow | r-qh-rev@m15c | 9 | 2 (22 %) | 45 | 38 % | 0.69 | -39.20 | tp5.6 sl5.6 tr4.2 h64 lg (5 · 1.04 · 0.45) |
| Long | revert | r-camarilla-m@m15 | 1 | 0 (0 %) | 33 | 30 % | 0.51 | -42.78 | tp5.2 sl3.9 tr0 h64 lg (33 · 0.51 · -42.78) |
| Long | pivot | r-streak@m15 | 4 | 0 (0 %) | 22 | 41 % | 0.32 | -43.33 | tp4.8 sl4.8 tr0 h96 lg (6 · 0.92 · -1.20) |
| Long | snap | willr-14-90@m15 | 27 | 3 (11 %) | 48 | 44 % | 0.71 | -43.79 | – |
| Long | snap | willr-14-90@m15c | 27 | 3 (11 %) | 48 | 44 % | 0.71 | -43.79 | – |
| Long | sweep | r-sweep-m@m30 | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -45.80 | – |
| Long | follow | r-streak-m@m30 | 7 | 0 (0 %) | 19 | 16 % | 0.28 | -48.39 | – |
| Long | follow | r-fisher-m@m15c | 10 | 0 (0 %) | 27 | 37 % | 0.36 | -60.39 | – |
| Long | ribbon | r-camarilla@m15c | 12 | 0 (0 %) | 28 | 14 % | 0.22 | -65.40 | – |
| Long | follow | z-50-2.5@x4@m15 | 2 | 0 (0 %) | 21 | 43 % | 0.06 | -71.97 | tp6 sl6 tr4.5 h64 lg (11 · 0.06 · -35.13) |
| Long | sweep | r-clv-thrust-m@m30 | 11 | 1 (9 %) | 22 | 23 % | 0.14 | -72.70 | – |
| Long | clamp | cci-14-200@x4@m15 | 16 | 0 (0 %) | 16 | 0 % | 0.00 | -84.90 | – |
| Long | clamp | macd-cross-19-39-9@m15c | 21 | 0 (0 %) | 21 | 0 % | 0.00 | -108.60 | – |
| Long | follow | r-qh-rev-m@m15c | 13 | 0 (0 %) | 26 | 0 % | 0.00 | -120.40 | – |
| Long | follow | z-50-2.5@x4@m15c | 9 | 0 (0 %) | 33 | 15 % | 0.11 | -126.21 | tp5.6 sl5.6 tr2.8 h96 lg (5 · 0.38 · -7.24) |
| Long | revert | r-donch-vol-m@m30 | 7 | 0 (0 %) | 74 | 27 % | 0.38 | -128.33 | tp4.8 sl3.6 tr0 h32 lg (11 · 0.65 · -8.20) |
| Long | clamp | break-vol@m15c | 13 | 0 (0 %) | 26 | 0 % | 0.00 | -131.80 | – |
| Long | magnet | r-session-trend-m@m15 | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -153.20 | – |
| Long | follow | r-streak@m15 | 21 | 8 (38 %) | 227 | 46 % | 0.71 | -169.36 | tp6.4 sl4.8 tr0 h96 lg (11 · 1.49 · 12.20) |
| Long | follow | break-vol-2@x4@m30 | 49 | 6 (12 %) | 122 | 30 % | 0.43 | -177.78 | – |
| Long | revert | break-vol@m15 | 12 | 0 (0 %) | 152 | 43 % | 0.47 | -212.32 | tp6.4 sl6.4 tr3.2 h96 lg (11 · 0.67 · -8.84) |
| Long | revert | r-vwap-reclaim-m@m30 | 8 | 0 (0 %) | 76 | 24 % | 0.28 | -224.29 | tp5.2 sl5.2 tr2.6 h48 lg (11 · 0.41 · -19.72) |
| Long | ribbon | r-streak@m15 | 24 | 3 (13 %) | 234 | 43 % | 0.59 | -282.67 | tp6.4 sl4.8 tr0 h96 lg (10 · 1.24 · 6.00) |
| Long | follow | r-streak@m30 | 24 | 0 (0 %) | 161 | 22 % | 0.22 | -413.71 | tp4.8 sl2.4 tr0 h32 lg (9 · 0.35 · -11.87) |
| Long | ribbon | r-streak@m30 | 32 | 0 (0 %) | 195 | 15 % | 0.14 | -613.36 | tp6 sl3 tr0 h48 lg (7 · 0.30 · -13.40) |
| Wide | sweep | cci-40-200@m5c | 15 | 15 (100 %) | 30 | 50 % | 9.19 | 86.03 | – |
| Wide | ribbon | r-sweep-m@m15 | 6 | 6 (100 %) | 24 | 50 % | 5.61 | 73.28 | – |
| Wide | sweep | r-pin@m15 | 6 | 6 (100 %) | 60 | 55 % | 2.62 | 67.60 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (10 · 2.89 · 12.18) |
| Wide | ribbon | hma-55@m15c | 22 | 22 (100 %) | 22 | 100 % | ∞ (no loss) | 30.55 | – |
| Wide | ribbon | r-sweep@m15 | 3 | 3 (100 %) | 15 | 40 % | 2.93 | 29.95 | tp0.8 sl0.8 tr0 h32 ax-volume2 axis (5 · 2.93 · 9.98) |
| Wide | sweep | willr-28-95@m5c | 9 | 9 (100 %) | 18 | 67 % | 20.50 | 23.40 | – |
| Wide | ribbon | z-50-2.5@x4@m5 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 20.16 | – |
| Wide | sweep | macd-hist@m15c | 3 | 3 (100 %) | 12 | 100 % | ∞ (no loss) | 17.66 | – |
| Wide | sweep | mc-z-20@m5c | 3 | 3 (100 %) | 18 | 33 % | 2.89 | 16.44 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (6 · 2.89 · 5.48) |
| Wide | sweep | willr-50-95@m5c | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 10.93 | – |
| Wide | clamp | cci-40-200@x4@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 9.46 | – |
| Wide | magnet | trend-ema-20-50@m1 | 3 | 3 (100 %) | 33 | 55 % | 1.90 | 9.44 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (11 · 1.90 · 3.15) |
| Wide | ribbon | r-bb-adx@m30 | 9 | 9 (100 %) | 15 | 60 % | 2.95 | 8.18 | – |
| Wide | ribbon | move-cont@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 8.18 | – |
| Wide | pulse | aroon-14@m5 | 3 | 3 (100 %) | 12 | 50 % | 1.48 | 2.80 | – |
| Wide | sandwich | r-choch-m@m1 | 5 | 3 (60 %) | 60 | 28 % | 1.07 | 2.20 | tp0.64 sl0.54 tr0 h480 axd-volume3h axis (12 · 1.33 · 1.66) |
| Wide | ribbon | aroon-25@m30 | 6 | 0 (0 %) | 36 | 17 % | 0.98 | -0.47 | tp1.13 sl1.13 tr0 h16 axd-volume2 axis (6 · 0.98 · -0.08) |
| Wide | ribbon | mc-lag-12@m5 | 3 | 1 (33 %) | 33 | 45 % | 0.96 | -0.62 | tp0.76 sl0.68 tr0 h96 axd-geo2h axis (11 · 1.25 · 1.04) |
| Wide | snap | r-ultimate@m5 | 3 | 0 (0 %) | 15 | 60 % | 0.90 | -1.10 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (5 · 0.90 · -0.37) |
| Wide | pulse | mc-rsit3-25@m15 | 9 | 0 (0 %) | 6 | 0 % | 0.00 | -1.20 | – |
| Wide | pivot | ema-stoch@m5c | 3 | 0 (0 %) | 6 | 50 % | 0.74 | -1.33 | – |
| Wide | clamp | willr-28-95@m1c | 1 | 0 (0 %) | 11 | 18 % | 0.31 | -3.96 | tp0.64 sl0.54 tr0 h480 axd-volume3h axis (11 · 0.31 · -3.96) |
| Wide | pulse | dir-macd@m5 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 | – |
| Wide | follow | r-cvd-div@m1c | 1 | 0 (0 %) | 29 | 34 % | 0.63 | -4.27 | tp0.64 sl0.54 tr0 h480 axd-volume3h axis (29 · 0.63 · -4.27) |
| Wide | pivot | r-sweep-m@m5 | 3 | 0 (0 %) | 12 | 50 % | 0.46 | -4.47 | – |
| Wide | magnet | act-shift@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.77 | – |
| Wide | magnet | srsi-14-10@m1c | 2 | 0 (0 %) | 8 | 25 % | 0.27 | -4.85 | – |
| Wide | sweep | mc-rsi3-5@m30 | 15 | 3 (20 %) | 90 | 67 % | 0.91 | -4.88 | tp1.13 sl1.13 tr0 h16 ax-linear2 axis (6 · 1.30 · 1.02) |
| Wide | clamp | r-sweep-m@m5 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -8.26 | – |
| Wide | follow | mc-lag-6@m15 | 3 | 0 (0 %) | 12 | 50 % | 0.42 | -8.93 | – |
| Wide | snap | r-qh-flow-m@m1 | 1 | 0 (0 %) | 16 | 31 % | 0.39 | -9.62 | tp0.64 sl0.54 tr0 h480 axd-volume4h axis (16 · 0.39 · -9.62) |
| Wide | sandwich | r-zdist-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -11.10 | – |
| Wide | snap | r-zdist-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -11.10 | – |
| Wide | pulse | r-zdist-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -11.10 | – |
| Wide | clamp | mc-rsi3-5@m15 | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -13.94 | – |
| Wide | sandwich | r-zdist@m15c | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -14.93 | – |
| Wide | snap | r-zdist@m15c | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -14.93 | – |
| Wide | pulse | r-zdist@m15c | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -14.93 | – |
| Wide | pivot | r-pin-m@m5 | 3 | 0 (0 %) | 12 | 25 % | 0.09 | -15.97 | – |
| Wide | sandwich | bb-wick@m15 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -16.78 | – |
| Wide | pulse | bb-wick@m15 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -16.78 | – |
| Wide | sweep | srsi-14-20@m1c | 6 | 0 (0 %) | 42 | 14 % | 0.20 | -21.58 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (7 · 0.21 · -3.30) |
| Wide | sandwich | srsi-14-10@m1c | 2 | 0 (0 %) | 36 | 17 % | 0.20 | -22.28 | tp0.64 sl0.54 tr0 h480 axd-linear3 axis (18 · 0.20 · -11.14) |
| Wide | follow | rsi-21-30-70@m1c | 7 | 0 (0 %) | 182 | 23 % | 0.74 | -26.43 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (26 · 0.74 · -3.78) |
| Wide | ribbon | squeeze-20@m5 | 6 | 0 (0 %) | 36 | 17 % | 0.16 | -26.93 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (6 · 0.23 · -4.09) |
| Wide | sweep | r-inside@m1 | 3 | 0 (0 %) | 27 | 33 % | 0.20 | -31.60 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (9 · 0.29 · -6.75) |
| Wide | snap | srsi-14-10@m1c | 3 | 0 (0 %) | 54 | 17 % | 0.20 | -33.42 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (18 · 0.20 · -11.14) |
| Wide | ribbon | srsi-14-10@m1c | 3 | 0 (0 %) | 54 | 17 % | 0.20 | -33.42 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (18 · 0.20 · -11.14) |
| Wide | clamp | srsi-14-10@m1c | 3 | 0 (0 %) | 54 | 17 % | 0.20 | -33.42 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (18 · 0.20 · -11.14) |
| Wide | pivot | srsi-14-10@m1c | 3 | 0 (0 %) | 54 | 17 % | 0.20 | -33.42 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (18 · 0.20 · -11.14) |
| Wide | follow | mc-vwapd-3@m5c | 3 | 0 (0 %) | 102 | 47 % | 0.64 | -34.36 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (34 · 0.64 · -11.45) |
| Wide | sweep | r-bb-adx@m1 | 3 | 0 (0 %) | 90 | 20 % | 0.31 | -36.09 | tp0.64 sl0.54 tr0 h480 axd-linear2 axis (30 · 0.32 · -11.69) |
| Wide | ribbon | trend-adx-20@m15 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -37.69 | – |
| Wide | follow | willr-50-95@m1c | 6 | 0 (0 %) | 330 | 33 % | 0.69 | -49.42 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (55 · 0.69 · -8.24) |
| Wide | ribbon | willr-28-95@m1c | 16 | 0 (0 %) | 176 | 22 % | 0.39 | -55.97 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (11 · 0.48 · -2.90) |
| Wide | pivot | willr-28-95@m1c | 16 | 0 (0 %) | 176 | 22 % | 0.39 | -55.97 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (11 · 0.48 · -2.90) |
| Wide | ribbon | move-impulse-20-2.5@m30 | 28 | 0 (0 %) | 106 | 23 % | 0.23 | -61.03 | tp1.13 sl1.13 tr0 h16 axd-fib2 axis (5 · 0.26 · -2.54) |
| Wide | sweep | break-squeeze-120@m1 | 7 | 0 (0 %) | 308 | 25 % | 0.50 | -160.40 | tp0.64 sl0.54 tr0 h480 axd-atr3 axis (44 · 0.56 · -19.03) |
| Signals | follow | sig-s2-active-hf-s@m15 | 20 | 20 (100 %) | 809 | 86 % | 4.85 | 1823.77 | tp5 sl15 tr4 h192 (31 · 8.56 · 114.96) |
| Signals | follow | sig-s2-active-hf-m@m15 | 20 | 20 (100 %) | 816 | 85 % | 4.06 | 1736.86 | tp6 sl18 tr0 h192 (24 · 7.33 · 115.20) |
| Signals | follow | sig-macd-slow-s@m15 | 20 | 20 (100 %) | 644 | 90 % | 7.27 | 1591.65 | tp8 sl24 tr4.8 h192 (20 · 103.27 · 109.32) |
| Signals | follow | sig-ema-pullback-s@m15 | 20 | 20 (100 %) | 606 | 89 % | 6.68 | 1490.42 | tp6 sl18 tr4.8 h192 (20 · 326.86 · 104.19) |
| Signals | follow | sig-thrust-m@m15 | 20 | 20 (100 %) | 725 | 85 % | 4.11 | 1438.56 | tp4 sl12 tr2.4 h192 (44 · 9.04 · 105.06) |
| Signals | follow | sig-impulse-s@m15 | 20 | 20 (100 %) | 522 | 87 % | 10.89 | 1399.80 | tp8 sl24 tr3.2 h192 (25 · 45.21 · 92.83) |
| Signals | follow | sig-thrust-s@m15 | 20 | 20 (100 %) | 494 | 91 % | 15.58 | 1375.87 | tp8 sl24 tr6.4 h192 (13 · ∞ (no loss) · 101.40) |
| Signals | follow | sig-macd-cross-m@m15 | 20 | 20 (100 %) | 549 | 91 % | 8.64 | 1375.00 | tp6 sl18 tr0 h192 (14 · ∞ (no loss) · 81.20) |
| Signals | follow | sig-macd-hist-s@m15 | 20 | 20 (100 %) | 643 | 84 % | 4.73 | 1359.34 | tp8 sl24 tr4.8 h192 (20 · 328.90 · 101.10) |
| Signals | follow | sig-macd-cross-s@m15 | 20 | 20 (100 %) | 643 | 84 % | 4.73 | 1359.34 | tp8 sl24 tr4.8 h192 (20 · 328.90 · 101.10) |
| Signals | follow | sig-hma-s@m15 | 20 | 20 (100 %) | 625 | 87 % | 4.47 | 1357.66 | tp8 sl24 tr4.8 h192 (16 · 2331.10 · 105.11) |
| Signals | follow | sig-swing-m@m15 | 20 | 20 (100 %) | 673 | 85 % | 3.86 | 1327.70 | tp5 sl15 tr0 h192 (20 · ∞ (no loss) · 96.00) |
| Signals | follow | sig-act-burst-s@m15 | 20 | 20 (100 %) | 665 | 84 % | 3.76 | 1288.30 | tp8 sl24 tr4.8 h192 (20 · 53.86 · 103.23) |
| Signals | follow | sig-macd-hist-m@m15 | 20 | 20 (100 %) | 777 | 83 % | 2.93 | 1258.92 | tp6 sl18 tr0 h192 (18 · 5.42 · 80.40) |
| Signals | follow | sig-keltner-s@m15 | 20 | 20 (100 %) | 438 | 92 % | 12.68 | 1256.05 | tp6 sl18 tr2.4 h192 (24 · 339.35 · 85.77) |
| Signals | follow | sig-cmf-m@m15 | 20 | 20 (100 %) | 628 | 86 % | 3.61 | 1201.92 | tp5 sl15 tr2 h192 (42 · 6.05 · 81.19) |
| Signals | follow | sig-atr-break-s@m15 | 20 | 20 (100 %) | 619 | 84 % | 3.34 | 1180.34 | tp8 sl24 tr6.4 h192 (15 · ∞ (no loss) · 109.67) |
| Signals | follow | sig-act-hf-s@m15 | 20 | 20 (100 %) | 638 | 83 % | 3.18 | 1151.21 | tp8 sl24 tr6.4 h192 (15 · 204.34 · 93.90) |
| Signals | follow | sig-swing-s@m15 | 20 | 20 (100 %) | 583 | 86 % | 3.39 | 1140.62 | tp8 sl24 tr4.8 h192 (19 · 1987.87 · 102.71) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 20 | 20 (100 %) | 444 | 91 % | 9.32 | 1129.03 | tp5 sl15 tr4 h192 (19 · 197.75 · 71.92) |
| Signals | follow | sig-sar-s@m15 | 20 | 20 (100 %) | 621 | 84 % | 2.85 | 1124.44 | tp8 sl24 tr4.8 h192 (17 · 91.86 · 97.81) |
| Signals | follow | sig-s2-range-shift-s@m15 | 20 | 20 (100 %) | 456 | 87 % | 5.66 | 1106.91 | tp6 sl18 tr0 h192 (15 · ∞ (no loss) · 87.00) |
| Signals | follow | sig-rsi-mid-m@m15 | 20 | 20 (100 %) | 509 | 88 % | 7.65 | 1102.28 | tp4 sl12 tr0 h192 (22 · ∞ (no loss) · 83.60) |
| Signals | follow | sig-stoch-rsi-s@m15 | 20 | 20 (100 %) | 651 | 83 % | 2.68 | 1026.33 | tp6 sl18 tr2.4 h192 (38 · 5.07 · 78.21) |
| Signals | follow | sig-impulse-m@m15 | 20 | 20 (100 %) | 467 | 88 % | 4.02 | 1022.99 | tp5 sl15 tr4 h192 (18 · ∞ (no loss) · 81.81) |
| Signals | follow | sig-s2-range-shift-m@m15 | 20 | 20 (100 %) | 510 | 83 % | 3.52 | 1007.56 | tp8 sl24 tr6.4 h192 (12 · ∞ (no loss) · 85.83) |
| Signals | follow | sig-heikin-ashi-m@m15 | 20 | 20 (100 %) | 675 | 81 % | 2.50 | 993.12 | tp8 sl24 tr4.8 h192 (16 · 3.91 · 70.47) |
| Signals | follow | sig-rsi-mid-s@m15 | 20 | 20 (100 %) | 564 | 87 % | 2.70 | 980.30 | tp4 sl12 tr2.4 h192 (31 · 6.36 · 70.97) |
| Signals | follow | sig-s2-atr-break-s@m15 | 20 | 20 (100 %) | 623 | 80 % | 2.39 | 949.77 | tp8 sl24 tr6.4 h192 (12 · ∞ (no loss) · 85.83) |
| Signals | follow | sig-ema-trend-s@m15 | 20 | 20 (100 %) | 450 | 86 % | 3.24 | 930.29 | tp6 sl18 tr3.6 h192 (19 · 4.95 · 71.97) |
| Signals | follow | sig-trix-s@m15 | 20 | 20 (100 %) | 378 | 89 % | 8.98 | 927.67 | tp6 sl18 tr3.6 h192 (15 · 38.62 · 59.90) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 20 | 20 (100 %) | 349 | 91 % | 7.82 | 922.97 | tp4 sl12 tr3.2 h192 (16 · ∞ (no loss) · 60.80) |
| Signals | follow | sig-heikin-ashi-s@m15 | 20 | 20 (100 %) | 784 | 83 % | 1.95 | 909.51 | tp8 sl24 tr6.4 h192 (14 · 3.86 · 69.32) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 20 | 20 (100 %) | 455 | 86 % | 4.15 | 903.42 | tp8 sl24 tr4.8 h192 (12 · ∞ (no loss) · 87.46) |
| Signals | follow | sig-donchian-m@m15 | 20 | 20 (100 %) | 410 | 84 % | 3.61 | 900.58 | tp8 sl24 tr3.2 h192 (18 · 104.06 · 82.45) |
| Signals | follow | sig-hma-m@m15 | 20 | 20 (100 %) | 346 | 89 % | 10.60 | 899.66 | tp6 sl18 tr4.8 h192 (11 · ∞ (no loss) · 58.86) |
| Signals | follow | sig-s2-confluence-s@m15 | 20 | 20 (100 %) | 337 | 91 % | 18.37 | 894.10 | tp8 sl24 tr6.4 h192 (8 · ∞ (no loss) · 62.40) |
| Signals | follow | sig-cci-s@m15 | 20 | 20 (100 %) | 499 | 85 % | 3.13 | 882.23 | tp6 sl18 tr2.4 h192 (29 · 193.38 · 86.00) |
| Signals | follow | sig-ema-cross-s@m15 | 20 | 20 (100 %) | 326 | 89 % | 13.38 | 873.09 | tp6 sl18 tr3.6 h192 (13 · ∞ (no loss) · 67.30) |
| Signals | follow | sig-ema-slope-s@m15 | 20 | 20 (100 %) | 406 | 88 % | 4.05 | 871.22 | tp8 sl24 tr6.4 h192 (11 · ∞ (no loss) · 85.80) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 20 | 20 (100 %) | 397 | 88 % | 4.11 | 864.43 | tp8 sl24 tr6.4 h192 (12 · ∞ (no loss) · 71.70) |
| Signals | follow | sig-reclaim-m@m15 | 20 | 20 (100 %) | 385 | 90 % | 5.53 | 864.00 | tp3 sl9 tr2.4 h192 (23 · 750.77 · 56.26) |
| Signals | follow | sig-ichimoku-s@m15 | 20 | 20 (100 %) | 431 | 89 % | 3.41 | 861.10 | tp5 sl15 tr2 h192 (27 · 42.02 · 64.23) |
| Signals | follow | sig-vwap-m@m15 | 20 | 20 (100 %) | 363 | 89 % | 7.02 | 860.58 | tp5 sl15 tr3 h192 (17 · 2052.48 · 54.63) |
| Signals | follow | sig-r-nr-break-m@m15 | 20 | 19 (95 %) | 696 | 82 % | 1.97 | 850.42 | tp5 sl15 tr0 h192 (19 · ∞ (no loss) · 91.20) |
| Signals | follow | sig-r-linreg-s@m15 | 20 | 20 (100 %) | 496 | 86 % | 2.55 | 846.95 | tp6 sl18 tr3.6 h192 (19 · 4.80 · 69.52) |
| Signals | follow | sig-s2-block-scale-m@m15 | 20 | 20 (100 %) | 703 | 81 % | 2.02 | 846.22 | tp6 sl18 tr2.4 h192 (34 · 3.89 · 61.09) |
| Signals | follow | sig-ema-slope-m@m15 | 20 | 20 (100 %) | 287 | 91 % | 31.52 | 845.26 | tp6 sl18 tr3.6 h192 (12 · ∞ (no loss) · 58.62) |
| Signals | follow | sig-r-fractal-s@m15 | 20 | 20 (100 %) | 386 | 85 % | 4.37 | 833.28 | tp5 sl15 tr4 h192 (16 · ∞ (no loss) · 67.79) |
| Signals | follow | sig-st-slow-s@m15 | 20 | 20 (100 %) | 325 | 89 % | 7.28 | 826.70 | tp8 sl24 tr3.2 h192 (13 · ∞ (no loss) · 67.36) |
| Signals | follow | sig-s2-atr-break-m@m15 | 20 | 20 (100 %) | 683 | 81 % | 1.98 | 812.08 | tp5 sl15 tr0 h192 (21 · 3.00 · 60.80) |
| Signals | follow | sig-obv-m@m15 | 20 | 20 (100 %) | 504 | 86 % | 2.83 | 794.11 | tp8 sl24 tr4.8 h192 (12 · 194.90 · 64.99) |
| Signals | follow | sig-s2-block-scale-s@m15 | 20 | 18 (90 %) | 685 | 80 % | 1.86 | 792.00 | tp5 sl15 tr0 h192 (20 · 6.00 · 76.00) |
| Signals | follow | sig-sar-m@m15 | 20 | 20 (100 %) | 568 | 82 % | 2.21 | 790.54 | tp8 sl24 tr6.4 h192 (16 · 4.25 · 78.72) |
| Signals | follow | sig-supertrend-s@m15 | 20 | 20 (100 %) | 315 | 87 % | 7.61 | 774.79 | tp5 sl15 tr4 h192 (13 · ∞ (no loss) · 62.40) |
| Signals | follow | sig-ema-pullback-m@m15 | 20 | 20 (100 %) | 365 | 86 % | 3.77 | 764.40 | tp4 sl12 tr1.6 h192 (28 · 226.80 · 55.89) |
| Signals | follow | sig-s2-st-trail-s@m15 | 20 | 20 (100 %) | 280 | 90 % | 7.85 | 762.76 | tp6 sl18 tr3.6 h192 (11 · ∞ (no loss) · 59.12) |
| Signals | follow | sig-kama-m@m15 | 20 | 20 (100 %) | 544 | 81 % | 2.24 | 745.46 | tp3 sl9 tr1.2 h192 (54 · 2.65 · 48.78) |
| Signals | follow | sig-bollinger-s@m15 | 20 | 20 (100 %) | 374 | 88 % | 3.00 | 734.06 | tp8 sl24 tr4.8 h192 (10 · ∞ (no loss) · 65.14) |
| Signals | follow | sig-zscore-s@m15 | 20 | 20 (100 %) | 374 | 88 % | 3.00 | 734.06 | tp8 sl24 tr4.8 h192 (10 · ∞ (no loss) · 65.14) |
| Signals | follow | sig-adx-s@m15 | 20 | 20 (100 %) | 347 | 90 % | 4.65 | 723.60 | tp4 sl12 tr2.4 h192 (19 · 342.62 · 51.13) |
| Signals | follow | sig-r-vol-regime-s@m15 | 20 | 19 (95 %) | 441 | 81 % | 2.52 | 715.28 | tp6 sl18 tr3.6 h192 (17 · 10.31 · 63.92) |
| Signals | follow | sig-r-awesome-m@m15 | 20 | 20 (100 %) | 400 | 87 % | 4.40 | 711.16 | tp8 sl24 tr6.4 h192 (7 · ∞ (no loss) · 54.60) |
| Signals | follow | sig-r-session-trend-m@m15 | 20 | 20 (100 %) | 296 | 86 % | 6.02 | 699.60 | tp6 sl18 tr0 h192 (8 · ∞ (no loss) · 46.40) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 20 | 20 (100 %) | 290 | 88 % | 4.45 | 690.41 | tp8 sl24 tr3.2 h192 (13 · ∞ (no loss) · 56.58) |
| Signals | follow | sig-obv-s@m15 | 20 | 20 (100 %) | 536 | 82 % | 1.99 | 684.82 | tp6 sl18 tr2.4 h192 (27 · 24.94 · 71.72) |
| Signals | follow | sig-macd-slow-m@m15 | 20 | 20 (100 %) | 425 | 84 % | 2.69 | 680.00 | tp8 sl24 tr4.8 h192 (11 · ∞ (no loss) · 62.31) |
| Signals | follow | sig-williams-r-m@m15 | 20 | 20 (100 %) | 451 | 86 % | 2.22 | 679.07 | tp8 sl24 tr3.2 h192 (17 · 1729.29 · 58.84) |
| Signals | follow | sig-donchian-s@m15 | 20 | 20 (100 %) | 406 | 84 % | 2.68 | 675.72 | tp6 sl18 tr3.6 h192 (17 · 95.72 · 66.89) |
| Signals | follow | sig-r-fractal-m@m15 | 20 | 20 (100 %) | 352 | 82 % | 3.25 | 671.85 | tp5 sl15 tr3 h192 (18 · 18.91 · 55.66) |
| Signals | follow | sig-ema-trend-m@m15 | 20 | 20 (100 %) | 388 | 86 % | 2.81 | 671.79 | tp6 sl18 tr2.4 h192 (21 · 22.13 · 58.57) |
| Signals | follow | sig-s2-block-stack-m@m15 | 20 | 15 (75 %) | 329 | 84 % | 3.16 | 669.25 | tp5 sl15 tr3 h192 (14 · ∞ (no loss) · 59.04) |
| Signals | follow | sig-reclaim-s@m15 | 20 | 20 (100 %) | 499 | 83 % | 2.07 | 666.39 | tp4 sl12 tr0 h192 (21 · 2.96 · 47.80) |
| Signals | follow | sig-atr-break-m@m15 | 20 | 20 (100 %) | 429 | 83 % | 2.57 | 660.64 | tp8 sl24 tr6.4 h192 (11 · 3.22 · 53.80) |
| Signals | follow | sig-trix-m@m15 | 20 | 20 (100 %) | 253 | 91 % | 6.14 | 657.62 | tp8 sl24 tr4.8 h192 (8 · ∞ (no loss) · 49.69) |
| Signals | follow | sig-kama-s@m15 | 20 | 20 (100 %) | 615 | 82 % | 1.74 | 655.95 | tp8 sl24 tr6.4 h192 (15 · 3.63 · 67.81) |
| Signals | follow | sig-keltner-m@m15 | 20 | 20 (100 %) | 272 | 90 % | 4.92 | 655.07 | tp8 sl24 tr4.8 h192 (9 · ∞ (no loss) · 50.22) |
| Signals | follow | sig-r-awesome-s@m15 | 20 | 19 (95 %) | 438 | 82 % | 2.46 | 614.19 | tp6 sl18 tr0 h192 (9 · ∞ (no loss) · 52.20) |
| Signals | follow | sig-s2-confluence-m@m15 | 20 | 20 (100 %) | 340 | 88 % | 3.76 | 612.40 | tp6 sl18 tr2.4 h192 (19 · ∞ (no loss) · 54.66) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 20 | 20 (100 %) | 282 | 89 % | 3.95 | 610.14 | tp6 sl18 tr3.6 h192 (9 · ∞ (no loss) · 48.13) |
| Signals | follow | sig-act-burst-m@m15 | 20 | 20 (100 %) | 283 | 86 % | 7.05 | 599.56 | tp8 sl24 tr6.4 h192 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-stoch-rsi-m@m15 | 20 | 20 (100 %) | 488 | 82 % | 2.01 | 588.55 | tp8 sl24 tr4.8 h192 (14 · 194.39 · 62.44) |
| Signals | follow | sig-ema-cross-m@m15 | 20 | 19 (95 %) | 244 | 89 % | 4.54 | 580.70 | tp6 sl18 tr3.6 h192 (10 · ∞ (no loss) · 52.23) |
| Signals | follow | sig-r-nr-break-s@m15 | 20 | 16 (80 %) | 497 | 81 % | 1.89 | 579.90 | tp5 sl15 tr0 h192 (15 · ∞ (no loss) · 72.00) |
| Signals | follow | sig-bollinger-m@m15 | 20 | 20 (100 %) | 282 | 89 % | 3.32 | 565.00 | tp5 sl15 tr3 h192 (13 · ∞ (no loss) · 53.91) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 20 | 20 (100 %) | 271 | 84 % | 3.74 | 564.36 | tp6 sl18 tr4.8 h192 (9 · ∞ (no loss) · 52.20) |
| Signals | follow | sig-act-hf-m@m15 | 20 | 20 (100 %) | 526 | 78 % | 1.81 | 558.99 | tp8 sl24 tr6.4 h192 (11 · 2.84 · 45.48) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 20 | 20 (100 %) | 298 | 84 % | 2.64 | 550.80 | tp8 sl24 tr4.8 h192 (11 · 7.34 · 54.42) |
| Signals | follow | sig-vwap-s@m15 | 20 | 20 (100 %) | 476 | 81 % | 1.84 | 550.06 | tp8 sl24 tr6.4 h192 (10 · 2.90 · 46.00) |
| Signals | follow | sig-supertrend-m@m15 | 20 | 20 (100 %) | 204 | 91 % | 6.42 | 516.98 | tp6 sl18 tr2.4 h192 (12 · 687.84 · 42.01) |
| Signals | follow | sig-cmf-s@m15 | 20 | 19 (95 %) | 561 | 81 % | 1.60 | 516.74 | tp5 sl15 tr0 h192 (19 · 2.68 · 51.20) |
| Signals | follow | sig-s2-block-stack-s@m15 | 20 | 19 (95 %) | 420 | 79 % | 2.07 | 508.38 | tp4 sl12 tr1.6 h192 (35 · 8.26 · 45.30) |
| Signals | follow | sig-r-session-trend-s@m15 | 20 | 20 (100 %) | 210 | 89 % | 8.59 | 499.97 | tp3 sl9 tr0 h192 (12 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-r-linreg-m@m15 | 20 | 20 (100 %) | 343 | 83 % | 2.07 | 479.94 | tp6 sl18 tr4.8 h192 (11 · 2.87 · 34.10) |
| Signals | follow | sig-r-inside-s@m15 | 20 | 20 (100 %) | 161 | 93 % | 42.22 | 461.47 | tp6 sl18 tr0 h192 (5 · ∞ (no loss) · 29.00) |
| Signals | follow | sig-williams-r-s@m15 | 20 | 18 (90 %) | 523 | 81 % | 1.51 | 460.24 | tp8 sl24 tr3.2 h192 (21 · 3.07 · 50.83) |
| Signals | follow | sig-adx-m@m15 | 20 | 19 (95 %) | 185 | 81 % | 3.95 | 420.33 | tp8 sl24 tr6.4 h192 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-r-connors-m@m15 | 20 | 20 (100 %) | 268 | 84 % | 2.42 | 408.48 | tp6 sl18 tr2.4 h192 (16 · 259.90 · 46.89) |
| Signals | follow | sig-ichimoku-m@m15 | 20 | 20 (100 %) | 330 | 81 % | 1.97 | 393.70 | tp4 sl12 tr0 h192 (13 · 3.74 · 33.40) |
| Signals | follow | sig-cci-m@m15 | 20 | 20 (100 %) | 265 | 85 % | 2.05 | 349.56 | tp5 sl15 tr3 h192 (11 · 2.88 · 28.61) |
| Signals | follow | sig-squeeze-s@m15 | 20 | 19 (95 %) | 117 | 80 % | 4.26 | 241.29 | tp6 sl18 tr3.6 h192 (5 · ∞ (no loss) · 24.51) |
| Signals | follow | sig-rsi-momentum-s@m15 | 20 | 19 (95 %) | 120 | 78 % | 3.88 | 239.91 | tp5 sl15 tr0 h192 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-s2-range-break-s@m15 | 20 | 18 (90 %) | 144 | 76 % | 2.96 | 225.69 | tp5 sl15 tr4 h192 (5 · ∞ (no loss) · 24.00) |
| Signals | follow | sig-mfi-m@m15 | 18 | 18 (100 %) | 85 | 95 % | 1115.83 | 213.68 | tp4 sl12 tr2.4 h192 (6 · ∞ (no loss) · 16.33) |
| Signals | follow | sig-st-slow-m@m15 | 20 | 15 (75 %) | 108 | 88 % | 3.05 | 206.54 | tp4 sl12 tr0 h192 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-r-vol-regime-m@m15 | 20 | 17 (85 %) | 255 | 77 % | 1.48 | 187.06 | tp4 sl12 tr1.6 h192 (16 · 42.43 · 24.51) |
| Signals | follow | sig-s2-range-break-m@m15 | 20 | 20 (100 %) | 103 | 79 % | 5.73 | 181.05 | tp4 sl12 tr0 h192 (5 · ∞ (no loss) · 19.00) |
| Signals | follow | sig-s2-st-trail-m@m15 | 20 | 15 (75 %) | 156 | 85 % | 1.82 | 177.22 | tp6 sl18 tr2.4 h192 (7 · 455.65 · 26.25) |
| Signals | follow | sig-s2-vol-break-s@m15 | 20 | 20 (100 %) | 66 | 83 % | 44.68 | 147.48 | tp3 sl9 tr1.8 h192 (6 · 12.87 · 7.75) |
| Signals | follow | sig-squeeze-m@m15 | 20 | 14 (70 %) | 63 | 83 % | 3.15 | 143.04 | tp3 sl9 tr1.2 h192 (6 · 61.04 · 5.84) |
| Signals | follow | sig-volume-break-m@m15 | 20 | 20 (100 %) | 60 | 78 % | 11.15 | 134.77 | – |
| Signals | follow | sig-volume-break-s@m15 | 20 | 20 (100 %) | 37 | 81 % | 40.38 | 114.28 | – |
| Signals | follow | sig-s2-ema-cross-s@m15 | 19 | 15 (79 %) | 54 | 85 % | 3.00 | 92.33 | tp3 sl9 tr1.8 h192 (5 · 0.71 · -2.68) |
| Signals | follow | sig-r-inside-m@m15 | 12 | 12 (100 %) | 14 | 100 % | ∞ (no loss) | 46.70 | – |
| Signals | follow | sig-rsi-reversal-s@m15 | 18 | 9 (50 %) | 73 | 79 % | 1.22 | 27.01 | tp4 sl12 tr1.6 h192 (8 · 18.04 · 17.03) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 15 | 10 (67 %) | 49 | 82 % | 1.12 | 9.90 | tp4 sl12 tr1.6 h192 (5 · 1.97 · 3.55) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 20 | 11 (55 %) | 30 | 60 % | 0.75 | -23.02 | tp3 sl9 tr1.2 h192 (5 · 0.28 · -6.60) |
| Signals | follow | sig-r-connors-s@m15 | 20 | 8 (40 %) | 108 | 73 % | 0.89 | -33.54 | tp6 sl18 tr2.4 h192 (7 · 38.53 · 20.70) |
| Signals | follow | sig-rsi-reversal-m@m15 | 15 | 4 (27 %) | 57 | 74 % | 0.67 | -42.08 | tp3 sl9 tr1.8 h192 (6 · 0.63 · -3.79) |
| Signals | follow | sig-s2-vol-break-m@m15 | 20 | 11 (55 %) | 106 | 71 % | 0.77 | -65.88 | tp6 sl18 tr2.4 h192 (5 · 4.12 · 9.35) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 20 | 10 (50 %) | 183 | 78 % | 0.82 | -94.80 | tp4 sl12 tr1.6 h192 (16 · 1.59 · 14.39) |
| Signals | follow | sig-zscore-m@m15 | 20 | 0 (0 %) | 257 | 66 % | 0.47 | -488.07 | tp3 sl9 tr2.4 h192 (19 · 0.82 · -6.72) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 118 | 113 (96 %) | 1340 | 89 % | 5.18 | 5314.87 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 121 | 118 (98 %) | 1740 | 90 % | 4.26 | 5213.00 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 119 | 112 (94 %) | 1446 | 88 % | 4.11 | 5100.62 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 122 | 120 (98 %) | 2540 | 86 % | 4.65 | 4984.49 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 121 | 117 (97 %) | 1851 | 87 % | 3.81 | 4943.56 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 122 | 118 (97 %) | 2016 | 87 % | 4.92 | 4916.30 |
| Signals | tp 5.000% | sl 3.00× | tr off | 119 | 113 (95 %) | 1461 | 93 % | 4.08 | 4912.80 |
| Signals | tp 6.000% | sl 3.00× | tr off | 118 | 110 (93 %) | 1190 | 93 % | 4.25 | 4910.00 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 122 | 117 (96 %) | 2252 | 85 % | 4.15 | 4904.16 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 116 | 109 (94 %) | 1039 | 90 % | 4.17 | 4829.26 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 122 | 117 (96 %) | 2779 | 85 % | 3.50 | 4648.15 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 122 | 117 (96 %) | 2940 | 84 % | 4.09 | 4582.84 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 122 | 118 (97 %) | 3678 | 82 % | 3.30 | 4226.04 |
| Signals | tp 4.000% | sl 3.00× | tr off | 121 | 112 (93 %) | 1938 | 90 % | 2.72 | 4180.40 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 122 | 114 (93 %) | 2294 | 84 % | 2.63 | 4014.44 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 122 | 114 (93 %) | 3177 | 82 % | 2.17 | 3631.96 |
| Signals | tp 3.000% | sl 3.00× | tr off | 122 | 112 (92 %) | 2887 | 87 % | 1.98 | 3475.60 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 122 | 116 (95 %) | 3739 | 80 % | 2.12 | 3373.39 |
| Signals | tp 2.500% | sl 3.00× | tr off | 122 | 110 (90 %) | 3412 | 86 % | 1.80 | 2987.60 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 122 | 108 (89 %) | 4668 | 78 % | 1.87 | 2723.76 |
| Minimal | tp 1.600% | sl 3.00× | tr off | 513 | 283 (55 %) | 6516 | 78 % | 1.07 | 489.92 |
| Short | tp 2.400% | sl 2.00× | tr 0.75× | 109 | 76 (70 %) | 292 | 67 % | 2.24 | 308.30 |
| Short | tp 2.600% | sl 2.00× | tr 0.50× | 78 | 57 (73 %) | 229 | 76 % | 2.46 | 277.84 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.50× | 335 | 178 (53 %) | 4579 | 70 % | 1.09 | 266.88 |
| Minimal | tp 1.400% | sl 1.50× | tr 0.75× | 126 | 75 (60 %) | 1439 | 62 % | 1.26 | 249.93 |
| Long | tp 6.400% | sl 0.75× | tr off | 73 | 46 (63 %) | 181 | 56 % | 1.68 | 245.73 |
| Short | tp 2.600% | sl 2.00× | tr 0.75× | 97 | 64 (66 %) | 250 | 76 % | 1.90 | 245.12 |
| Long | tp 6.000% | sl 0.75× | tr off | 55 | 34 (62 %) | 99 | 64 % | 2.24 | 199.31 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 72 | 45 (63 %) | 120 | 78 % | 2.70 | 194.27 |
| Short | tp 2.800% | sl 2.00× | tr 0.50× | 74 | 56 (76 %) | 228 | 72 % | 1.77 | 187.50 |
| Short | tp 2.400% | sl 2.00× | tr 0.50× | 63 | 43 (68 %) | 140 | 62 % | 2.80 | 176.08 |
| General | tp 3.600% | sl 1.00× | tr 0.50× | 53 | 41 (77 %) | 120 | 67 % | 2.80 | 174.07 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.75× | 352 | 188 (53 %) | 4602 | 68 % | 1.03 | 153.02 |
| Short | tp 2.800% | sl 1.50× | tr 0.50× | 54 | 36 (67 %) | 135 | 73 % | 2.39 | 151.05 |
| Long | tp 4.800% | sl 1.00× | tr off | 56 | 31 (55 %) | 128 | 64 % | 1.69 | 150.24 |
| Short | tp 2.800% | sl 1.50× | tr 0.75× | 56 | 36 (64 %) | 116 | 69 % | 2.25 | 148.29 |
| General | tp 3.200% | sl 1.00× | tr 0.50× | 55 | 39 (71 %) | 203 | 64 % | 1.73 | 147.28 |
| Short | tp 1.800% | sl 2.00× | tr 0.75× | 37 | 27 (73 %) | 154 | 74 % | 2.46 | 141.33 |
| Long | tp 5.200% | sl 1.00× | tr off | 68 | 37 (54 %) | 164 | 60 % | 1.42 | 140.51 |
| Minimal | tp 1.200% | sl 3.00× | tr 0.75× | 179 | 95 (53 %) | 2822 | 69 % | 1.07 | 132.30 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Wide | tp 0.640% | sl 0.84× | tr off | 91 | 6 (7 %) | 1740 | 25 % | 0.48 | -604.48 |
| Minimal | tp 1.600% | sl 2.50× | tr off | 325 | 150 (46 %) | 4998 | 72 % | 0.91 | -504.67 |
| Minimal | tp 1.000% | sl 3.00× | tr off | 205 | 66 (32 %) | 2368 | 75 % | 0.77 | -435.81 |
| Minimal | tp 1.600% | sl 2.50× | tr 0.50× | 263 | 115 (44 %) | 4368 | 66 % | 0.89 | -353.95 |
| Minimal | tp 1.200% | sl 2.50× | tr off | 191 | 79 (41 %) | 2459 | 73 % | 0.84 | -332.61 |
| Minimal | tp 1.200% | sl 3.00× | tr 0.50× | 165 | 68 (41 %) | 1488 | 60 % | 0.67 | -294.37 |
| Minimal | tp 1.400% | sl 2.50× | tr off | 244 | 122 (50 %) | 4506 | 74 % | 0.93 | -288.83 |
| Minimal | tp 1.000% | sl 2.50× | tr 0.50× | 114 | 30 (26 %) | 1346 | 58 % | 0.62 | -276.18 |
| Minimal | tp 0.800% | sl 3.00× | tr 0.50× | 86 | 17 (20 %) | 695 | 52 % | 0.36 | -251.93 |
| Minimal | tp 1.000% | sl 3.00× | tr 0.50× | 147 | 39 (27 %) | 1615 | 60 % | 0.71 | -247.69 |
| Minimal | tp 0.800% | sl 3.00× | tr 0.75× | 117 | 29 (25 %) | 890 | 55 % | 0.55 | -241.31 |
| Minimal | tp 1.200% | sl 2.50× | tr 0.50× | 140 | 41 (29 %) | 1338 | 60 % | 0.71 | -225.74 |
| Minimal | tp 1.200% | sl 2.00× | tr 0.50× | 93 | 22 (24 %) | 738 | 52 % | 0.52 | -222.91 |
| Minimal | tp 1.600% | sl 2.00× | tr off | 254 | 125 (49 %) | 3404 | 69 % | 0.94 | -194.76 |
| Long | tp 5.600% | sl 1.00× | tr 0.75× | 73 | 10 (14 %) | 108 | 39 % | 0.43 | -192.58 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 107 (58) | 120596 | 15760 | 15530 | 0 | baseTarget 15682 · baseRange 89154 |
| Micro | trailing | 107 (57) | 241192 | 31134 | 31060 | 0 | baseTarget 31684 · baseRange 178374 |
| Minimal | normal | 372 (360) | 97040 | 39196 | 39056 | 0 | baseRange 20310 · baseTarget 37534 |
| Minimal | trailing | 372 (361) | 194080 | 78340 | 78112 | 0 | baseRange 40671 · baseTarget 75069 |
| Short | normal | 265 (216) | 66888 | 13355 | 13296 | 0 | baseTarget 10135 · baseRange 43398 |
| Short | trailing | 265 (216) | 133776 | 26721 | 26592 | 0 | baseTarget 20265 · baseRange 86790 |
| General | normal | 265 (207) | 44592 | 9209 | 9192 | 0 | baseTarget 4289 · baseRange 31094 |
| General | trailing | 265 (207) | 29728 | 6157 | 6128 | 0 | baseTarget 2850 · baseRange 20721 |
| Long | normal | 265 (210) | 55740 | 14605 | 14574 | 0 | baseTarget 6191 · baseRange 34944 |
| Long | trailing | 265 (210) | 37160 | 9743 | 9716 | 0 | baseTarget 4131 · baseRange 23286 |
| Wide | axis | 372 (372) | 109170 | 109170 | 109170 | 0 | – |
| Wide | dca | 372 (372) | 9704 | 9704 | 9704 | 0 | – |
| Wide | dca-active | 372 (372) | 9704 | 9704 | 9704 | 0 | – |

Engine indications Base evaluated that built no set: 19 (break-atr-0.9, break-atr-2@x4, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-rsidiv-14, mc-rsit7-25, mc-rsit9-25, mc-rsit9-30, mc-tbbx-25, mc-tmom-3, mc-turn-10, r-bbw-expand, r-capit, r-capit-m, r-orb, rsi-mom-14-15, rsi-mom-14-20).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.18 (1950) | 0.25 (2214) | 0.34 (2682) | 0.35 (3044) | 0.42 (3582) |
| 1.14× | – | 0.15 (1890) | – | – | – | – | – |
| 1.25× | – | 0.16 (1866) | 0.22 (1926) | 0.29 (2214) | 0.42 (2682) | 0.44 (3038) | 0.57 (3564) |
| 1.33× | 0.11 (1824) | – | – | – | – | – | – |
| 1.5× | 0.11 (1800) | 0.18 (1866) | 0.23 (1926) | 0.37 (2208) | 0.53 (2664) | 0.48 (3026) | 0.55 (3558) |
| 1.75× | 0.12 (1800) | 0.20 (1866) | 0.31 (1916) | 0.43 (2198) | 0.51 (2664) | 0.47 (3002) | 0.55 (3552) |
| 2× | 0.13 (1800) | 0.24 (1858) | 0.37 (1912) | 0.44 (2212) | 0.51 (2646) | 0.47 (2996) | 0.62 (3552) |
| 2.25× | 0.16 (1796) | 0.28 (1854) | 0.36 (1906) | 0.44 (2200) | 0.49 (2646) | 0.60 (2996) | 0.72 (3530) |
| 2.5× | 0.20 (1790) | 0.28 (1854) | 0.36 (1900) | 0.42 (2200) | 0.60 (2658) | 0.57 (2998) | 0.77 (3530) |
| 2.75× | 0.20 (1790) | 0.28 (1848) | 0.35 (1900) | 0.49 (2200) | 0.57 (2648) | 0.61 (2998) | 0.81 (3530) |
| 3× | 0.19 (1784) | 0.28 (1842) | 0.33 (1900) | 0.46 (2212) | 0.62 (2648) | 0.67 (2992) | 0.76 (3530) |
| 3.25× | 0.19 (1784) | 0.27 (1842) | 0.38 (1900) | 0.44 (2212) | 0.70 (2648) | 0.65 (2992) | 0.80 (3518) |
| 3.5× | 0.19 (1778) | 0.28 (1842) | 0.36 (1900) | 0.55 (2212) | 0.69 (2648) | 0.68 (2980) | 0.89 (3512) |
| 3.75× | 0.19 (1778) | 0.30 (1842) | 0.44 (1928) | 0.54 (2212) | 0.67 (2642) | 0.74 (2980) | 0.96 (3512) |
| 4× | 0.18 (1778) | 0.29 (1842) | 0.46 (1928) | 0.53 (2212) | 0.70 (2636) | 0.82 (2980) | 0.94 (3500) |
| 4.25× | 0.21 (1778) | 0.35 (1864) | 0.44 (1928) | 0.57 (2202) | 0.84 (2636) | 0.79 (2980) | 0.93 (3496) |
| 4.5× | 0.21 (1778) | 0.35 (1864) | 0.43 (1928) | 0.56 (2202) | 0.94 (2636) | 0.77 (2974) | 0.92 (3496) |
| 4.75× | 0.20 (1788) | 0.33 (1864) | 0.43 (1922) | 0.61 (2202) | 0.90 (2636) | 0.78 (2974) | 0.91 (3508) |
| 5× | 0.25 (1794) | 0.33 (1864) | 0.47 (1916) | 0.69 (2226) | 0.87 (2636) | 0.76 (2974) | 1.02 (3466) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | 0.00 (2) | 0.00 (2) | 0.00 (4) |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | 0.00 (2) | 0.00 (8) |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | 0.00 (4) | 0.00 (4) | 0.00 (10) |
| 1.75× | – | – | – | 0.00 (2) | 0.00 (4) | 0.30 (20) | 0.32 (20) |
| 2× | – | – | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.00 (6) | 0.00 (6) |
| 2.25× | – | – | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.00 (6) | 0.00 (6) |
| 2.5× | – | 0.00 (2) | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.00 (6) | 0.54 (46) |
| 2.75× | 0.00 (2) | 0.00 (2) | 0.00 (2) | 0.00 (2) | 0.00 (4) | 0.24 (26) | 0.49 (22) |
| 3× | 0.00 (2) | 0.00 (2) | 0.00 (2) | 0.44 (10) | 0.18 (8) | 0.27 (24) | 0.44 (14) |
| 3.25× | 0.00 (2) | – | 0.12 (6) | 1.53 (30) | 0.16 (8) | 0.26 (24) | 0.12 (10) |
| 3.5× | 0.00 (2) | – | 0.43 (14) | 1.45 (30) | 0.15 (8) | 0.19 (26) | 0.12 (10) |
| 3.75× | 0.00 (2) | 0.88 (20) | 1.45 (38) | 1.37 (30) | 0.39 (22) | 0.18 (26) | 0.16 (12) |
| 4× | 0.00 (2) | 0.43 (52) | 1.39 (38) | 1.31 (30) | 0.07 (12) | 0.20 (28) | 1.08 (80) |
| 4.25× | 0.23 (18) | 0.50 (84) | 0.72 (40) | 1.25 (30) | 0.06 (12) | 0.14 (32) | 1.02 (80) |
| 4.5× | 0.23 (50) | 0.48 (84) | 1.27 (38) | 1.19 (30) | 0.09 (14) | 0.13 (32) | 0.08 (16) |
| 4.75× | 0.29 (82) | 0.39 (86) | 1.22 (38) | 1.23 (32) | 0.07 (16) | 0.12 (32) | 0.92 (110) |
| 5× | 0.35 (82) | 0.37 (86) | 1.33 (42) | 1.18 (32) | 0.22 (36) | 0.12 (32) | 2.07 (140) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | 0.00 (3) |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | 0.30 (2) | 0.16 (6) |
| 2× | – | – | – | – | – | – | 0.03 (4) |
| 2.25× | – | – | – | – | – | – | 8.87 (5) |
| 2.5× | – | – | – | – | – | – | 1.53 (21) |
| 2.75× | – | – | – | – | – | – | 2.09 (6) |
| 3× | – | – | – | – | – | – | 2.09 (3) |
| 3.25× | – | – | – | – | – | – | – |
| 3.5× | – | – | – | – | – | – | – |
| 3.75× | – | – | – | – | 0.14 (4) | – | – |
| 4× | – | – | – | – | – | – | 0.05 (4) |
| 4.25× | – | 0.09 (4) | – | – | – | – | 0.00 (1) |
| 4.5× | – | 0.08 (2) | – | – | – | – | – |
| 4.75× | – | – | – | – | – | – | ∞ (15) |
| 5× | – | – | ∞ (3) | – | 7.43 (3) | – | ∞ (14) |

### Minimal — every config computed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 0.63 (70268) | 0.68 (87216) | 0.76 (93597) | 0.84 (136414) | 0.91 (163087) |
| 2× | 0.67 (66882) | 0.71 (82947) | 0.81 (87518) | 0.87 (127132) | 0.94 (152751) |
| 2.5× | 0.68 (64591) | 0.78 (78406) | 0.87 (83273) | 0.89 (121295) | 0.95 (146609) |
| 3× | 0.76 (61406) | 0.81 (76108) | 0.89 (80622) | 0.93 (117131) | 0.99 (140785) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 0.51 (507) | 0.74 (1775) | 0.72 (1993) | 0.97 (4067) | 0.98 (7759) |
| 2× | 0.69 (1184) | 0.82 (4237) | 0.79 (3414) | 0.96 (7671) | 0.95 (9081) |
| 2.5× | 0.60 (2264) | 0.80 (4211) | 0.85 (5941) | 0.93 (9234) | 0.92 (13060) |
| 3× | 0.58 (2487) | 0.79 (5967) | 0.94 (7143) | 1.02 (10976) | 1.06 (15697) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 0.65 (68) | 0.65 (179) | 0.61 (226) | 1.00 (508) | 1.00 (982) |
| 2× | 0.48 (120) | 1.10 (451) | 0.93 (475) | 1.26 (1140) | 1.27 (1278) |
| 2.5× | 0.73 (262) | 0.82 (599) | 1.06 (747) | 1.17 (1285) | 1.33 (1692) |
| 3× | 0.70 (331) | 1.17 (991) | 1.14 (1024) | 1.51 (1401) | 1.83 (1694) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.24 (9045) | 1.31 (8272) | 1.08 (7330) | 1.21 (8216) | 1.20 (8368) | 1.14 (8125) |
| 1.5× | 1.43 (8199) | 1.31 (7629) | 1.00 (6947) | 1.08 (7753) | 1.09 (7896) | 1.15 (7610) |
| 2× | 1.41 (8019) | 1.26 (7424) | 0.98 (6729) | 1.09 (7519) | 1.17 (7576) | 1.21 (7280) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.25 (377) | 2.06 (275) | 3.33 (191) | 1.51 (396) | 1.14 (351) | 1.36 (339) |
| 1.5× | 1.12 (402) | 2.21 (259) | 1.40 (297) | 1.41 (406) | 1.43 (381) | 1.97 (362) |
| 2× | 1.62 (486) | 1.67 (399) | 1.36 (337) | 2.22 (584) | 1.78 (683) | 1.87 (506) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 3.46 (33) | 6.73 (38) | 2.45 (52) | 2.29 (66) | 3.79 (52) | 3.35 (63) |
| 1.5× | 1.98 (80) | 2.66 (54) | 2.81 (58) | 2.92 (90) | 1.93 (103) | 2.93 (80) |
| 2× | 1.82 (113) | 4.64 (63) | 4.56 (71) | 2.29 (105) | 2.33 (109) | 2.86 (94) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.99 (2662) | 0.94 (2899) | 1.02 (2996) | 1.01 (2932) |
| 0.75× | 1.14 (2412) | 0.95 (2652) | 0.95 (2730) | 0.94 (2715) |
| 1× | 1.07 (6920) | 0.95 (7551) | 0.81 (7505) | 0.79 (7334) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.29 (125) | 1.05 (96) | 0.94 (64) | 1.31 (50) |
| 0.75× | 0.93 (148) | 0.79 (122) | 1.00 (110) | 1.12 (125) |
| 1× | 1.18 (480) | 1.37 (316) | 0.94 (312) | 0.92 (371) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 2.33 (24) | 2.55 (25) | 2.16 (18) | 3.85 (16) |
| 0.75× | 1.42 (36) | 2.64 (26) | 1.80 (28) | 2.67 (29) |
| 1× | 2.01 (80) | 2.15 (92) | 1.66 (73) | 2.61 (61) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.07 (3182) | 0.98 (3410) | 0.93 (3323) | 0.91 (3107) | 0.89 (3669) |
| 0.75× | 0.94 (2971) | 0.90 (3149) | 0.89 (3073) | 0.87 (2858) | 0.93 (3228) |
| 1× | 0.82 (7992) | 0.88 (8572) | 0.81 (8230) | 0.79 (7632) | 0.79 (9043) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.83 (69) | 0.85 (68) | 0.76 (60) | 0.93 (111) | 0.99 (126) |
| 0.75× | 1.09 (124) | 0.92 (141) | 1.93 (80) | 2.24 (99) | 1.68 (181) |
| 1× | 1.05 (391) | 1.16 (453) | 0.89 (381) | 0.91 (407) | 1.03 (513) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.55 (15) | 2.08 (13) | 3.10 (12) | 4.65 (19) | 3.14 (23) |
| 0.75× | 1.61 (28) | 2.44 (24) | 4.60 (19) | 2.47 (18) | 2.39 (39) |
| 1× | 3.10 (73) | 2.64 (81) | 1.75 (66) | 1.95 (71) | 2.41 (89) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.50 (931811) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.59 (39613) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.59 (262934) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.66 (37231) | 0.62 (10792) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.70 (35904) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.72 (10285) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.76 (10046) | – | – | – | – |
| 1× | – | – | – | 0.47 (236964) | – | – | – | 0.63 (38072) | 0.69 (8151) | – | 0.55 (1747) | – | 0.69 (7731) | 0.64 (7195) | 0.56 (1558) | 0.60 (1443) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.48 (1740) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 1.31 (324) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 1.11 (267) | – | – | – | 0.67 (256) | – | – | – | – | – | – | – | – |

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
