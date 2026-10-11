# Simulated trading session — 30 symbols, 24 h pre-historic + 24 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 1m+, 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $41.00; each order volume unit = 2.0 % of the realized equity at entry ($0.60–$1.19 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-06T23:00 → 2026-10-07T23:00 UTC. Engine: Base 1287/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 394/19072 · PF 1.51 · Micro 123/5900 · PF 2.43 · Short 602/8176 · PF 1.60 · General 501/8176 · PF 1.54 · Long 573/8176 · PF 1.51 · Signals 126/126; Main 1238 pairs, 191536 tapes, Real seats: 5683 engine configs + 2520 signal configs (every config of the active signals), compute 434 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $41.00 → $39.98 (-2.48 %, closed orders) · equity at end $34.43 (open at end: 54 positions / 7852 orders, MTM -$5.55 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 0.92 (gross profit $ ÷ gross loss $ as sized) · PF unit 0.91 (every order at one unit: the engine's PF) · 99 positions / 7857 orders (incl. 169 capped to $0) · WR 63.74 % · DDT (closed trades, $) 12.25 h · DDR – (net ≤ 0) · equity max drawdown $9.35 (22.60 %) · margin used max $30.79 · open avg 39.06 pos / 1538.95 orders (peak 48 / 2540)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 169 orders capped to $0, 7458 scaled down (open at end: 8 capped, 7819 scaled) · binding: position cap 2923, gross cap 15209. **Without the caps:** balance $41.00 → $28.23 (-31.15 %) · PF $ 0.89 · equity at end -$80.00 · equity max drawdown $121.33 (293.57 %) · margin used max $716.83 · infeasible: margin exceeded equity for 1395 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 523 | 1071  | 4.3 % | 1.515 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 523 | 1071 (+0) | 4.3 % | 1.515 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 523 | 1071 (+0) | 4.3 % | 1.515 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 488 | 979 (-92) | 3.9 % | 1.545 |
| closes ≥ 6 | 1.00 | 6 | 1 | 725 | 1457 (+386) | 5.8 % | 1.682 |
| closes ≥ 20 | 1.00 | 20 | 1 | 378 | 775 (-296) | 3.1 % | 1.430 |
| closes ≥ 30 | 1.00 | 30 | 1 | 288 | 580 (-491) | 2.3 % | 1.356 |
| DDR off | 1.00 | 12 | off | 1855 | 2723 (+1652) | 10.9 % | 1.137 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 932 | 1627 (+556) | 6.5 % | 1.345 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 178 | 488 (-583) | 2.0 % | 1.916 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1855 | 2723 (+1652) | 10.9 % | 1.137 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 2301 | 3246 (+2175) | 13.0 % | 1.180 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 23:00 | 1 / 21 | 14 / 7 | 3.52 | 3.52 | 67 % | $0.22 | $41.22 | $40.10 | $39.64 | 4.17 % | 0.50 | $28.86 | 25 / 724 |
| 00:00 | 3 / 100 | 82 / 18 | 4.64 | 6.03 | 82 % | $0.98 | $42.20 | $40.42 | $40.25 | 4.17 % | 1.50 | $29.54 | 26 / 1231 |
| 01:00 | 3 / 379 | 181 / 198 | 1.93 | 0.41 | 48 % | $0.61 | $42.81 | $38.02 | $38.02 | 8.09 % | 2.50 | $29.97 | 38 / 2022 |
| 02:00 | 8 / 870 | 415 / 455 | 0.83 | 0.71 | 48 % | -$0.41 | $42.41 | $35.89 | $35.61 | 13.92 % | 3.50 | $29.97 | 40 / 2083 |
| 03:00 | 3 / 297 | 160 / 137 | 0.52 | 1.20 | 54 % | -$0.29 | $42.12 | $36.78 | $35.12 | 15.11 % | 4.50 | $29.68 | 44 / 2743 |
| 04:00 | 1 / 339 | 183 / 156 | 2.81 | 1.70 | 54 % | $0.29 | $42.41 | $37.10 | $36.29 | 15.11 % | 5.50 | $29.69 | 46 / 3022 |
| 05:00 | 3 / 361 | 266 / 95 | 0.94 | 2.14 | 74 % | -$0.05 | $42.36 | $37.74 | $36.27 | 15.11 % | 6.50 | $29.95 | 48 / 3244 |
| 06:00 | 1 / 409 | 263 / 146 | 3.92 | 1.40 | 64 % | $1.04 | $43.39 | $38.39 | $37.29 | 15.11 % | 7.50 | $30.38 | 48 / 3763 |
| 07:00 | 3 / 298 | 272 / 26 | 2.80 | 9.97 | 91 % | $0.17 | $43.56 | $38.31 | $38.01 | 15.11 % | 8.50 | $30.49 | 48 / 4456 |
| 08:00 | 1 / 196 | 140 / 56 | 1.50 | 1.06 | 71 % | $0.08 | $43.64 | $37.15 | $37.12 | 15.11 % | 9.50 | $30.55 | 48 / 5035 |
| 09:00 | 0 / 407 | 311 / 96 | 2.18 | 3.39 | 76 % | $0.25 | $43.89 | $35.86 | $35.54 | 15.11 % | 10.50 | $30.72 | 48 / 5290 |
| 10:00 | 0 / 227 | 167 / 60 | 1.73 | 2.10 | 74 % | $0.10 | $43.98 | $35.55 | $35.07 | 15.23 % | 11.50 | $30.79 | 48 / 5682 |
| 11:00 | 0 / 255 | 152 / 103 | 0.41 | 1.01 | 60 % | -$0.20 | $43.78 | $35.69 | $35.15 | 15.23 % | 12.50 | $30.79 | 49 / 5962 |
| 12:00 | 2 / 295 | 195 / 100 | 0.36 | 0.30 | 66 % | -$0.28 | $43.50 | $35.08 | $34.95 | 15.51 % | 13.50 | $30.72 | 49 / 6035 |
| 13:00 | 1 / 586 | 452 / 134 | 0.69 | 2.17 | 77 % | -$0.20 | $43.30 | $35.72 | $35.03 | 15.51 % | 14.50 | $30.45 | 48 / 5948 |
| 14:00 | 0 / 333 | 289 / 44 | 1.02 | 5.49 | 87 % | $0.00 | $43.30 | $34.66 | $34.66 | 16.22 % | 15.50 | $30.38 | 48 / 5948 |
| 15:00 | 2 / 443 | 297 / 146 | 0.11 | 0.61 | 67 % | -$2.32 | $40.98 | $32.88 | $32.02 | 22.60 % | 16.50 | $30.31 | 47 / 5967 |
| 16:00 | 0 / 290 | 205 / 85 | 0.09 | 0.42 | 71 % | -$0.60 | $40.38 | $33.70 | $32.78 | 22.60 % | 17.50 | $28.69 | 49 / 6329 |
| 17:00 | 0 / 218 | 132 / 86 | 0.58 | 1.03 | 61 % | -$0.04 | $40.34 | $33.53 | $33.41 | 22.60 % | 18.50 | $28.27 | 51 / 6683 |
| 18:00 | 0 / 319 | 88 / 231 | 0.05 | 0.06 | 28 % | -$0.74 | $39.60 | $33.36 | $32.95 | 22.60 % | 19.50 | $28.24 | 51 / 6718 |
| 19:00 | 0 / 63 | 54 / 9 | 8.40 | 7.66 | 86 % | $0.05 | $39.65 | $33.86 | $33.24 | 22.60 % | 20.50 | $27.75 | 53 / 7217 |
| 20:00 | 0 / 145 | 109 / 36 | 1.13 | 1.33 | 75 % | $0.02 | $39.67 | $34.19 | $33.80 | 22.60 % | 21.50 | $27.83 | 54 / 7662 |
| 21:00 | 0 / 351 | 292 / 59 | 2.24 | 3.08 | 83 % | $0.16 | $39.82 | $34.48 | $34.15 | 22.60 % | 22.50 | $27.88 | 54 / 8289 |
| 22:00 | 0 / 655 | 289 / 366 | 1.44 | 0.58 | 44 % | $0.16 | $39.98 | $34.43 | $34.35 | 22.60 % | 23.50 | $27.95 | 54 / 7852 |

**Last hour (22:00):** open at end: 54 positions / 7852 orders, MTM -$5.55 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $34.43 = balance $39.98 + MTM -$5.55.

**Hours positive:** 14 of 24 full hours · flat 0 · negative 10

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m | 1m+ | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|---:|---:|
| 23:00 | – | – | 1 · 0.00 · -$0.02 | 2 · 0.00 · -$0.05 | 10 · 421.66 · $0.22 | 8 · 3.40 · $0.06 | – |
| 00:00 | – | – | 3 · – · $0.00 | – | 79 · 6.53 · $0.94 | 17 · 1.42 · $0.04 | 1 · 0.00 · -$0.01 |
| 01:00 | – | 36 · 0.19 · -$0.00 | 5 · ∞ (no loss) · $0.00 | 6 · ∞ (no loss) · $0.00 | 190 · 1.88 · $0.47 | 142 · 2.16 · $0.15 | – |
| 02:00 | – | – | 12 · 104.39 · $0.00 | 3 · 0.00 · -$0.00 | 513 · 1.19 · $0.27 | 251 · 0.33 · -$0.48 | 91 · 0.19 · -$0.20 |
| 03:00 | 2 · ∞ (no loss) · $0.00 | – | 5 · 0.94 · -$0.00 | 2 · ∞ (no loss) · $0.00 | 170 · 5.69 · $0.22 | 82 · 0.07 · -$0.33 | 36 · 0.10 · -$0.18 |
| 04:00 | – | – | – | – | 252 · 12.85 · $0.32 | 61 · 0.15 · -$0.10 | 26 · 5.79 · $0.08 |
| 05:00 | – | – | – | 3 · 0.00 · -$0.00 | 313 · 0.93 · -$0.05 | 31 · 0.16 · -$0.13 | 14 · 37.53 · $0.12 |
| 06:00 | – | – | – | – | 351 · 3.66 · $0.86 | 37 · 0.01 · -$0.03 | 21 · 181.91 · $0.20 |
| 07:00 | 4 · 0.00 · -$0.00 | – | – | – | 238 · 189.26 · $0.25 | 39 · 0.10 · -$0.08 | 17 · 19.13 · $0.00 |
| 08:00 | – | – | 2 · 0.00 · -$0.00 | – | 144 · 1.07 · $0.01 | 28 · 2.91 · $0.00 | 22 · 1369.42 · $0.06 |
| 09:00 | – | – | 3 · 0.00 · -$0.00 | – | 328 · 2.02 · $0.19 | 56 · 2.94 · $0.03 | 20 · 3.30 · $0.03 |
| 10:00 | – | – | – | – | 199 · 2.86 · $0.15 | 17 · 0.02 · -$0.04 | 11 · 0.13 · -$0.01 |
| 11:00 | – | – | – | – | 239 · 0.46 · -$0.16 | 9 · 0.04 · -$0.03 | 7 · 0.00 · -$0.01 |
| 12:00 | – | – | 6 · ∞ (no loss) · $0.00 | – | 277 · 0.34 · -$0.29 | – | 12 · ∞ (no loss) · $0.01 |
| 13:00 | – | – | 6 · ∞ (no loss) · $0.00 | – | 550 · 0.73 · -$0.17 | 23 · 0.23 · -$0.01 | 7 · 0.00 · -$0.03 |
| 14:00 | – | – | – | – | 333 · 1.02 · $0.00 | – | – |
| 15:00 | – | – | 3 · ∞ (no loss) · $0.00 | – | 434 · 0.11 · -$2.30 | 1 · 0.00 · -$0.00 | 5 · 0.00 · -$0.02 |
| 16:00 | – | – | – | – | 278 · 0.07 · -$0.62 | 4 · ∞ (no loss) · $0.00 | 8 · ∞ (no loss) · $0.01 |
| 17:00 | – | – | – | – | 188 · 1.95 · $0.02 | 23 · 0.00 · -$0.04 | 7 · 0.00 · -$0.02 |
| 18:00 | – | – | – | – | 281 · 0.05 · -$0.73 | 17 · 0.21 · -$0.00 | 21 · 0.26 · -$0.01 |
| 19:00 | – | – | – | – | 54 · 9.55 · $0.04 | 7 · 5.28 · $0.00 | 2 · 2.75 · $0.00 |
| 20:00 | – | – | – | – | 133 · 1.17 · $0.02 | 6 · 0.11 · -$0.00 | 6 · 0.13 · -$0.00 |
| 21:00 | – | – | – | – | 339 · 2.32 · $0.16 | 11 · 0.06 · -$0.00 | 1 · ∞ (no loss) · $0.00 |
| 22:00 | – | – | – | – | 565 · 1.45 · $0.16 | 29 · 1.31 · $0.00 | 61 · 0.94 · -$0.00 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Axis, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Axis | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 23:00 | 21 | 7 · 0.60 · 43 % · -$0.04 | 4 · 65.21 · 50 % · $0.04 | – | 3 · ∞ (no loss) · 100 % · $0.07 | 7 · 282.70 · 86 % · $0.15 | – | 10 · 421.66 · 90 % · $0.22 |
| 00:00 | 100 | 5 · 0.29 · 60 % · -$0.07 | 29 · 0.82 · 66 % · -$0.03 | 1 · 0.00 · 0 % · -$0.00 | 23 · ∞ (no loss) · 100 % · $0.30 | 42 · 39.86 · 88 % · $0.77 | – | 65 · 54.90 · 92 % · $1.07 |
| 01:00 | 379 | 74 · 4.12 · 41 % · $0.22 | 211 · 2.19 · 45 % · $0.33 | 39 · 0.19 · 38 % · -$0.00 | 6 · 0.31 · 67 % · -$0.10 | 49 · 1.95 · 76 % · $0.16 | – | 55 · 1.22 · 75 % · $0.07 |
| 02:00 | 870 | 207 · 0.43 · 29 % · -$0.32 | 360 · 0.56 · 27 % · -$0.28 | – | 62 · 0.35 · 74 % · -$0.30 | 241 · 1.69 · 88 % · $0.50 | – | 303 · 1.17 · 85 % · $0.20 |
| 03:00 | 297 | 66 · 0.15 · 45 % · -$0.19 | 82 · 0.19 · 28 % · -$0.30 | 8 · 0.81 · 25 % · -$0.00 | 29 · ∞ (no loss) · 100 % · $0.08 | 112 · 17.45 · 68 % · $0.12 | – | 141 · 27.98 · 74 % · $0.20 |
| 04:00 | 339 | 47 · 1.44 · 64 % · $0.02 | 125 · 0.49 · 14 % · -$0.06 | 15 · 0.00 · 0 % · -$0.00 | 40 · ∞ (no loss) · 100 % · $0.10 | 112 · 245.29 · 86 % · $0.24 | – | 152 · 351.01 · 89 % · $0.34 |
| 05:00 | 361 | 68 · 1.31 · 53 % · $0.04 | 23 · 0.25 · 30 % · -$0.03 | 3 · 0.00 · 0 % · -$0.00 | 75 · 0.91 · 85 % · -$0.02 | 192 · 0.90 · 83 % · -$0.05 | – | 267 · 0.91 · 84 % · -$0.07 |
| 06:00 | 409 | 62 · 0.19 · 6 % · -$0.03 | 107 · 6.07 · 48 % · $0.17 | – | 53 · 2.22 · 89 % · $0.16 | 187 · 5.81 · 86 % · $0.73 | – | 240 · 4.12 · 87 % · $0.89 |
| 07:00 | 298 | 28 · 0.75 · 86 % · -$0.00 | 65 · 0.22 · 89 % · -$0.06 | 4 · 0.00 · 0 % · -$0.00 | 38 · ∞ (no loss) · 100 % · $0.05 | 163 · 137.70 · 93 % · $0.18 | – | 201 · 177.03 · 95 % · $0.23 |
| 08:00 | 196 | 11 · 238012936016.87 · 82 % · $0.01 | 55 · 7.50 · 62 % · $0.05 | – | 29 · 0.80 · 69 % · -$0.02 | 101 · 1.50 · 76 % · $0.03 | – | 130 · 1.11 · 75 % · $0.02 |
| 09:00 | 407 | 40 · 0.34 · 48 % · -$0.06 | 76 · 2.96 · 67 % · $0.05 | – | 58 · 4.79 · 95 % · $0.09 | 233 · 3.63 · 80 % · $0.17 | – | 291 · 3.94 · 83 % · $0.26 |
| 10:00 | 227 | 21 · 0.08 · 33 % · -$0.03 | 28 · 0.03 · 43 % · -$0.05 | 2 · 0.00 · 0 % · -$0.00 | 29 · 1.00 · 76 % · -$0.00 | 147 · 19.71 · 86 % · $0.18 | – | 176 · 4.51 · 84 % · $0.18 |
| 11:00 | 255 | 45 · 0.01 · 2 % · -$0.20 | 38 · 0.01 · 16 % · -$0.11 | 6 · 0.00 · 0 % · -$0.00 | 55 · 1.86 · 82 % · $0.02 | 111 · 9.43 · 90 % · $0.09 | – | 166 · 4.19 · 87 % · $0.11 |
| 12:00 | 295 | 14 · 7.06 · 64 % · $0.01 | 15 · ∞ (no loss) · 100 % · $0.00 | – | 48 · 0.24 · 40 % · -$0.09 | 218 · 0.34 · 70 % · -$0.21 | – | 266 · 0.32 · 64 % · -$0.30 |
| 13:00 | 586 | 62 · 0.04 · 45 % · -$0.16 | 51 · 0.02 · 16 % · -$0.18 | 6 · 0.00 · 0 % · -$0.00 | 146 · 0.90 · 89 % · -$0.01 | 321 · 1.94 · 89 % · $0.15 | – | 467 · 1.44 · 89 % · $0.13 |
| 14:00 | 333 | 13 · 0.05 · 77 % · -$0.07 | 6 · 0.01 · 67 % · -$0.06 | – | 39 · 3.22 · 87 % · $0.03 | 275 · 4.39 · 88 % · $0.10 | – | 314 · 4.01 · 88 % · $0.13 |
| 15:00 | 443 | 27 · 0.02 · 37 % · -$0.13 | 35 · 0.01 · 37 % · -$0.21 | – | 64 · 0.13 · 69 % · -$0.39 | 317 · 0.12 · 73 % · -$1.59 | – | 381 · 0.12 · 72 % · -$1.98 |
| 16:00 | 290 | 25 · 22.25 · 96 % · $0.02 | 53 · 19.85 · 96 % · $0.00 | – | 41 · 0.20 · 46 % · -$0.03 | 171 · 0.05 · 65 % · -$0.59 | – | 212 · 0.06 · 61 % · -$0.62 |
| 17:00 | 218 | 22 · 0.05 · 5 % · -$0.05 | 45 · 0.02 · 29 % · -$0.03 | – | 26 · 8.34 · 92 % · $0.02 | 125 · 5.55 · 75 % · $0.02 | – | 151 · 6.51 · 78 % · $0.04 |
| 18:00 | 319 | 32 · 0.08 · 13 % · -$0.04 | 33 · 0.02 · 45 % · -$0.04 | – | 65 · 0.05 · 15 % · -$0.20 | 189 · 0.05 · 31 % · -$0.46 | – | 254 · 0.05 · 27 % · -$0.66 |
| 19:00 | 63 | 7 · 2.77 · 71 % · $0.00 | 6 · 0.11 · 50 % · -$0.00 | – | 12 · ∞ (no loss) · 100 % · $0.01 | 38 · 834.66 · 89 % · $0.04 | – | 50 · 1077.66 · 92 % · $0.05 |
| 20:00 | 145 | 14 · 0.01 · 21 % · -$0.01 | 8 · 0.09 · 50 % · -$0.01 | – | 33 · 1.26 · 88 % · $0.01 | 90 · 1.27 · 81 % · $0.02 | – | 123 · 1.27 · 83 % · $0.03 |
| 21:00 | 351 | 18 · 3.45 · 50 % · $0.00 | 15 · 0.13 · 13 % · -$0.01 | – | 118 · 1.78 · 90 % · $0.05 | 200 · 3.29 · 88 % · $0.11 | – | 318 · 2.41 · 88 % · $0.16 |
| 22:00 | 655 | 88 · 0.64 · 6 % · -$0.01 | 191 · 0.08 · 5 % · -$0.02 | – | 82 · 0.72 · 55 % · -$0.03 | 294 · 2.03 · 78 % · $0.22 | – | 376 · 1.60 · 73 % · $0.19 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1161 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (191536 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (9876); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 23:00 | 14161 · 0.33 | 2986 · 0.41 | 5532 · 0.63 | 309 · 4.99 | 21 · 3.52 | 7 · 0.60 | 4 · 65.21 | – | 10 · 421.66 |
| 00:00 | 30457 · 1.38 | 5292 · 1.63 | 10610 · 1.92 | 1835 · 3.08 | 100 · 6.03 | 5 · 0.32 | 29 · 0.82 | – | 65 · 82.39 |
| 01:00 | 63418 · 0.51 | 12999 · 0.58 | 20416 · 0.61 | 2639 · 0.83 | 379 · 0.41 | 74 · 0.30 | 211 · 0.32 | – | 55 · 1.34 |
| 02:00 | 111042 · 0.76 | 26803 · 0.77 | 43446 · 1.09 | 6485 · 1.88 | 870 · 0.71 | 207 · 0.24 | 360 · 0.26 | – | 303 · 3.18 |
| 03:00 | 51752 · 1.78 | 9535 · 2.37 | 15314 · 2.95 | 1959 · 3.50 | 297 · 1.20 | 66 · 0.57 | 82 · 0.21 | – | 141 · 17.89 |
| 04:00 | 45699 · 0.42 | 7906 · 0.64 | 16198 · 0.54 | 2327 · 3.57 | 339 · 1.70 | 47 · 1.14 | 125 · 0.12 | – | 152 · 157.91 |
| 05:00 | 55194 · 0.94 | 14539 · 1.11 | 17123 · 0.95 | 2789 · 1.47 | 361 · 2.14 | 68 · 0.94 | 23 · 0.23 | – | 267 · 2.89 |
| 06:00 | 53768 · 0.73 | 13112 · 0.65 | 17859 · 0.77 | 3183 · 2.27 | 409 · 1.40 | 62 · 0.04 | 107 · 0.48 | – | 240 · 5.83 |
| 07:00 | 35892 · 1.95 | 6755 · 1.82 | 14597 · 2.32 | 2161 · 2.70 | 298 · 9.97 | 28 · 3.44 | 65 · 1.56 | – | 201 · 112.66 |
| 08:00 | 34432 · 1.94 | 6268 · 2.05 | 15026 · 2.51 | 1619 · 1.47 | 196 · 1.06 | 11 · 4.63 | 55 · 1.59 | – | 130 · 0.89 |
| 09:00 | 61566 · 1.09 | 15270 · 1.33 | 23823 · 1.28 | 2932 · 1.22 | 407 · 3.39 | 40 · 0.80 | 76 · 1.49 | – | 291 · 9.45 |
| 10:00 | 56237 · 0.99 | 9449 · 0.96 | 17095 · 1.54 | 2363 · 0.97 | 227 · 2.10 | 21 · 0.40 | 28 · 0.29 | – | 176 · 4.27 |
| 11:00 | 54403 · 0.60 | 13085 · 0.92 | 17158 · 0.66 | 2659 · 1.31 | 255 · 1.01 | 45 · 0.03 | 38 · 0.07 | – | 166 · 3.10 |
| 12:00 | 63439 · 0.72 | 12333 · 0.63 | 25424 · 0.87 | 4686 · 0.24 | 295 · 0.30 | 14 · 2.30 | 15 · ∞ (no loss) | – | 266 · 0.26 |
| 13:00 | 116431 · 0.75 | 30637 · 0.78 | 44110 · 0.73 | 4772 · 1.23 | 586 · 2.17 | 62 · 0.62 | 51 · 0.09 | – | 467 · 4.32 |
| 14:00 | 47471 · 1.38 | 10872 · 1.31 | 19725 · 1.68 | 3461 · 5.99 | 333 · 5.49 | 13 · 3.65 | 6 · 0.27 | – | 314 · 6.31 |
| 15:00 | 65742 · 1.16 | 15936 · 0.99 | 26582 · 1.21 | 5296 · 1.14 | 443 · 0.61 | 27 · 0.42 | 35 · 0.47 | – | 381 · 0.64 |
| 16:00 | 67078 · 1.86 | 16682 · 1.83 | 33158 · 2.10 | 3576 · 1.16 | 290 · 0.42 | 25 · 9.31 | 53 · 416.96 | – | 212 · 0.23 |
| 17:00 | 41059 · 1.08 | 9526 · 0.86 | 20111 · 1.04 | 2467 · 1.53 | 218 · 1.03 | 22 · 0.03 | 45 · 0.12 | – | 151 · 4.85 |
| 18:00 | 46219 · 1.30 | 13589 · 1.43 | 17439 · 0.79 | 2682 · 0.57 | 319 · 0.06 | 32 · 0.17 | 33 · 0.64 | – | 254 · 0.04 |
| 19:00 | 34843 · 1.68 | 11379 · 2.47 | 10759 · 1.19 | 1301 · 4.14 | 63 · 7.66 | 7 · 2.27 | 6 · 0.50 | – | 50 · 324.76 |
| 20:00 | 52813 · 1.27 | 16056 · 2.16 | 16266 · 1.36 | 1976 · 0.99 | 145 · 1.33 | 14 · 0.29 | 8 · 0.22 | – | 123 · 1.68 |
| 21:00 | 62203 · 0.98 | 15909 · 1.17 | 23308 · 1.22 | 2975 · 1.72 | 351 · 3.08 | 18 · 0.83 | 15 · 0.05 | – | 318 · 4.14 |
| 22:00 | 65008 · 0.55 | 14050 · 0.68 | 22581 · 0.54 | 3547 · 0.35 | 655 · 0.58 | 88 · 0.05 | 191 · 0.01 | – | 376 · 1.04 |
| **total** | **1330327 · 0.95** | **310968 · 1.05** | **493660 · 1.06** | **69999 · 1.06** | **7857 · 0.91** | **1003 · 0.41** | **1661 · 0.31** | **–** | **5109 · 1.30** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 1003 | 363 / 640 | 0.48 | 0.41 | -$1.08 | 36.19 % | 21.00 |
| Trailing | 1661 | 610 / 1051 | 0.66 | 0.31 | -$0.83 | 36.72 % | 21.00 |
| Axis | 84 | 17 / 67 | 0.32 | 0.27 | -$0.01 | 20.24 % | 19.23 |
| Signal · Normal | 1174 | 908 / 266 | 0.92 | 1.10 | -$0.18 | 77.34 % | 10.75 |
| Signal · Trailing | 3935 | 3110 / 825 | 1.20 | 1.40 | $1.08 | 79.03 % | 7.25 |
| total | 7857 | 5008 / 2849 | 0.92 | 0.91 | -$1.02 | 63.74 % | 12.25 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 5109 | 4018 / 1091 | 1.12 | 1.30 | $0.90 | 78.65 % | 7.25 |
| of which Engine (no signals) | 2748 | 990 / 1758 | 0.58 | 0.35 | -$1.92 | 36.03 % | 21.00 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m | 6 | 145524898593.60 | 1.30 | $0.00 |
| 1m+ | 36 | 0.19 | 0.40 | -$0.00 |
| 5m | 46 | 0.24 | 0.92 | -$0.01 |
| 5m+ | 16 | 0.01 | 0.36 | -$0.05 |
| 15m | 6458 | 1.00 | 1.04 | -$0.00 |
| 15m+ | 899 | 0.47 | 0.40 | -$0.99 |
| 30m | 396 | 1.05 | 0.36 | $0.03 |

A 24 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 62 | 45 / 17 | 0.07 | 0.55 | -$0.06 | 72.58 % | 23.42 |
| Short | 2113 | 771 / 1342 | 0.74 | 0.33 | -$0.90 | 36.49 % | 21.00 |
| General | 272 | 80 / 192 | 0.07 | 0.34 | -$0.29 | 29.41 % | 23.75 |
| Long | 217 | 77 / 140 | 0.13 | 0.46 | -$0.66 | 35.48 % | 21.25 |
| Wide | 84 | 17 / 67 | 0.32 | 0.27 | -$0.01 | 20.24 % | 19.23 |
| Signals | 5109 | 4018 / 1091 | 1.12 | 1.30 | $0.90 | 78.65 % | 7.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 69805 | sig:confirm 30014 · sig:duplicate 19607 · sig:signalPf 10404 · sig:signalSide 5925 · sig:signalCluster 3851 · sig:signalGuard 4 |
| Short | 12765 | lastN 7813 · symPf 2285 · engineSide 2134 · duplicate 533 |
| Micro | 3466 | crowd 1434 · lastN 1045 · engineSide 880 · symPf 97 · duplicate 10 |
| Long | 3385 | lastN 1943 · engineSide 905 · symPf 494 · duplicate 43 |
| General | 2815 | lastN 1820 · engineSide 536 · symPf 375 · duplicate 84 |
| Wide | 648 | lastN 358 · engineSide 181 · symPf 64 · duplicate 45 |

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
| Micro | 2.43 | 0.55 | 0.23 | 0.07 | 0.13 | 62 |
| Short | 1.60 | 0.33 | 0.21 | 0.74 | 2.23 | 2113 |
| General | 1.54 | 0.34 | 0.22 | 0.07 | 0.20 | 272 |
| Long | 1.51 | 0.46 | 0.31 | 0.13 | 0.28 | 217 |
| Wide | 1.51 | 0.27 | 0.18 | 0.32 | 1.16 | 84 |
| Signals | – | 1.30 | – | 1.12 | 0.86 | 5109 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (7453 of 153147 evaluated, 189016 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3298 units active at the run start, 5667 over the run, 2423 of 2520 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 1002 | 179 (18 %) | 2419 | 66 % | 0.30 | -1301.09 |
| Micro | trailing | 904 | 168 (19 %) | 2993 | 49 % | 0.20 | -1804.87 |
| Short | normal | 1034 | 309 (30 %) | 5079 | 58 % | 0.88 | -802.58 |
| Short | trailing | 2454 | 765 (31 %) | 10991 | 59 % | 0.96 | -455.05 |
| General | normal | 377 | 96 (25 %) | 1043 | 52 % | 1.26 | 377.43 |
| General | trailing | 410 | 115 (28 %) | 1534 | 57 % | 1.05 | 93.24 |
| Long | normal | 586 | 146 (25 %) | 1150 | 53 % | 1.36 | 836.65 |
| Long | trailing | 454 | 143 (31 %) | 769 | 68 % | 1.53 | 578.43 |
| Wide | axis | 232 | 76 (33 %) | 1302 | 38 % | 0.94 | -41.19 |
| Signals | normal | 601 | 278 (46 %) | 9840 | 74 % | 0.93 | -1906.50 |
| Signals | trailing | 1822 | 1165 (64 %) | 32879 | 77 % | 1.20 | 10978.56 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1906 | 347 (18 %) | 5412 | 57 % | 0.24 | -3105.96 |
| Short | active | 115 | 13 (11 %) | 258 | 22 % | 0.16 | -562.01 |
| Short | bollinger | 164 | 26 (16 %) | 182 | 55 % | 0.68 | -70.10 |
| Short | break | 524 | 172 (33 %) | 2566 | 54 % | 0.77 | -793.90 |
| Short | channel | 28 | 3 (11 %) | 442 | 45 % | 0.53 | -352.08 |
| Short | direction | 50 | 9 (18 %) | 75 | 37 % | 0.47 | -64.64 |
| Short | ema | 197 | 61 (31 %) | 1218 | 49 % | 0.79 | -362.08 |
| Short | ichimoku | 58 | 0 (0 %) | 68 | 6 % | 0.05 | -144.80 |
| Short | macd | 83 | 27 (33 %) | 317 | 63 % | 0.88 | -42.85 |
| Short | move | 284 | 93 (33 %) | 1329 | 51 % | 0.63 | -712.15 |
| Short | osc | 1159 | 485 (42 %) | 6690 | 68 % | 1.48 | 2445.99 |
| Short | rsi | 298 | 13 (4 %) | 203 | 52 % | 0.66 | -99.67 |
| Short | smooth | 53 | 3 (6 %) | 186 | 29 % | 0.16 | -398.21 |
| Short | trend | 72 | 42 (58 %) | 680 | 63 % | 1.03 | 27.73 |
| Short | volume | 403 | 127 (32 %) | 1856 | 59 % | 0.94 | -128.85 |
| General | active | 14 | 0 (0 %) | 18 | 6 % | 0.04 | -61.12 |
| General | bollinger | 52 | 0 (0 %) | 75 | 33 % | 0.58 | -63.40 |
| General | break | 119 | 49 (41 %) | 639 | 46 % | 0.85 | -145.97 |
| General | channel | 2 | 0 (0 %) | 3 | 33 % | 0.29 | -5.47 |
| General | direction | 13 | 2 (15 %) | 51 | 47 % | 0.95 | -3.68 |
| General | ema | 29 | 7 (24 %) | 176 | 47 % | 0.74 | -82.71 |
| General | ichimoku | 5 | 2 (40 %) | 7 | 57 % | 1.31 | 3.40 |
| General | macd | 26 | 3 (12 %) | 17 | 76 % | 1.36 | 5.97 |
| General | move | 38 | 3 (8 %) | 55 | 16 % | 0.13 | -147.20 |
| General | osc | 281 | 114 (41 %) | 932 | 72 % | 2.64 | 1157.28 |
| General | rsi | 96 | 1 (1 %) | 26 | 38 % | 0.72 | -15.51 |
| General | smooth | 10 | 1 (10 %) | 21 | 10 % | 0.09 | -64.10 |
| General | trend | 11 | 3 (27 %) | 173 | 51 % | 0.80 | -51.85 |
| General | volume | 91 | 26 (29 %) | 384 | 51 % | 0.91 | -54.97 |
| Long | bollinger | 53 | 6 (11 %) | 85 | 38 % | 0.60 | -88.76 |
| Long | break | 111 | 37 (33 %) | 218 | 44 % | 0.80 | -106.99 |
| Long | channel | 6 | 0 (0 %) | 13 | 23 % | 0.15 | -33.17 |
| Long | direction | 11 | 0 (0 %) | 46 | 43 % | 0.67 | -50.52 |
| Long | ema | 3 | 1 (33 %) | 30 | 43 % | 0.75 | -22.43 |
| Long | macd | 50 | 2 (4 %) | 17 | 41 % | 0.65 | -16.17 |
| Long | move | 76 | 13 (17 %) | 140 | 36 % | 0.43 | -198.47 |
| Long | osc | 458 | 149 (33 %) | 659 | 84 % | 4.92 | 1812.14 |
| Long | rsi | 90 | 17 (19 %) | 59 | 63 % | 3.65 | 158.94 |
| Long | smooth | 9 | 1 (11 %) | 33 | 24 % | 0.50 | -46.77 |
| Long | trend | 11 | 0 (0 %) | 123 | 30 % | 0.43 | -235.83 |
| Long | volume | 162 | 63 (39 %) | 496 | 57 % | 1.26 | 243.11 |
| Wide | active | 47 | 17 (36 %) | 78 | 40 % | 4.77 | 156.80 |
| Wide | bollinger | 30 | 1 (3 %) | 429 | 36 % | 0.60 | -74.22 |
| Wide | break | 14 | 3 (21 %) | 38 | 47 % | 0.70 | -8.99 |
| Wide | direction | 9 | 0 (0 %) | 45 | 33 % | 0.49 | -18.45 |
| Wide | ema | 6 | 6 (100 %) | 24 | 63 % | 5.45 | 19.54 |
| Wide | macd | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -2.88 |
| Wide | move | 46 | 30 (65 %) | 64 | 70 % | 3.80 | 39.92 |
| Wide | osc | 54 | 10 (19 %) | 492 | 35 % | 0.66 | -70.70 |
| Wide | smooth | 6 | 6 (100 %) | 24 | 63 % | 5.45 | 19.54 |
| Wide | trend | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 1.24 |
| Wide | volume | 14 | 0 (0 %) | 102 | 19 % | 0.21 | -102.99 |
| Signals | signal:act-burst | 40 | 31 (78 %) | 776 | 80 % | 1.32 | 404.52 |
| Signals | signal:act-hf | 40 | 23 (57 %) | 956 | 76 % | 0.99 | -25.61 |
| Signals | signal:adx | 40 | 29 (73 %) | 512 | 80 % | 1.69 | 494.60 |
| Signals | signal:atr-break | 40 | 11 (28 %) | 847 | 73 % | 0.82 | -361.48 |
| Signals | signal:bollinger | 40 | 34 (85 %) | 774 | 81 % | 1.91 | 988.67 |
| Signals | signal:cci | 40 | 32 (80 %) | 984 | 77 % | 1.39 | 638.95 |
| Signals | signal:cmf | 40 | 11 (28 %) | 751 | 68 % | 0.66 | -728.69 |
| Signals | signal:donchian | 40 | 27 (68 %) | 633 | 78 % | 1.17 | 188.40 |
| Signals | signal:ema-cross | 40 | 15 (38 %) | 361 | 72 % | 0.74 | -259.69 |
| Signals | signal:ema-cross-fast | 40 | 24 (60 %) | 698 | 78 % | 1.13 | 166.64 |
| Signals | signal:ema-pullback | 40 | 18 (45 %) | 929 | 73 % | 0.93 | -127.44 |
| Signals | signal:ema-slope | 40 | 31 (78 %) | 493 | 82 % | 1.63 | 447.17 |
| Signals | signal:ema-trend | 40 | 18 (45 %) | 846 | 73 % | 0.97 | -52.39 |
| Signals | signal:heikin-ashi | 40 | 25 (63 %) | 1347 | 78 % | 1.26 | 559.65 |
| Signals | signal:hma | 40 | 31 (78 %) | 940 | 80 % | 1.38 | 545.57 |
| Signals | signal:ichimoku | 40 | 12 (30 %) | 532 | 72 % | 0.72 | -373.47 |
| Signals | signal:impulse | 40 | 32 (80 %) | 845 | 79 % | 1.46 | 583.41 |
| Signals | signal:kama | 40 | 22 (55 %) | 1129 | 77 % | 1.15 | 295.21 |
| Signals | signal:keltner | 40 | 16 (40 %) | 474 | 76 % | 0.95 | -50.35 |
| Signals | signal:macd-cross | 40 | 26 (65 %) | 944 | 79 % | 1.19 | 304.86 |
| Signals | signal:macd-hist | 40 | 35 (88 %) | 1223 | 80 % | 1.34 | 638.30 |
| Signals | signal:macd-slow | 40 | 22 (55 %) | 869 | 78 % | 1.08 | 137.00 |
| Signals | signal:mfi | 40 | 38 (95 %) | 236 | 88 % | 4.10 | 505.84 |
| Signals | signal:obv | 40 | 40 (100 %) | 1186 | 85 % | 2.67 | 1743.75 |
| Signals | signal:r-awesome | 40 | 17 (43 %) | 599 | 71 % | 0.77 | -333.54 |
| Signals | signal:r-connors | 35 | 9 (26 %) | 386 | 68 % | 0.65 | -337.20 |
| Signals | signal:r-fractal | 40 | 1 (3 %) | 399 | 61 % | 0.37 | -983.83 |
| Signals | signal:r-inside | 27 | 9 (33 %) | 86 | 60 % | 0.34 | -197.68 |
| Signals | signal:r-linreg | 40 | 20 (50 %) | 921 | 75 % | 1.09 | 147.06 |
| Signals | signal:r-nr-break | 40 | 19 (48 %) | 838 | 74 % | 1.02 | 22.27 |
| Signals | signal:r-session-trend | 40 | 17 (43 %) | 353 | 67 % | 0.74 | -251.58 |
| Signals | signal:r-vol-regime | 38 | 25 (66 %) | 225 | 78 % | 1.10 | 45.52 |
| Signals | signal:reclaim | 40 | 27 (68 %) | 1098 | 77 % | 1.24 | 465.03 |
| Signals | signal:rsi-mid | 40 | 20 (50 %) | 890 | 74 % | 0.92 | -154.87 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 40 | 30 (75 %) | 252 | 82 % | 1.68 | 266.20 |
| Signals | signal:s2-active-hf | 40 | 11 (28 %) | 1108 | 74 % | 0.84 | -397.90 |
| Signals | signal:s2-adx-gate | 40 | 25 (63 %) | 830 | 76 % | 1.13 | 199.60 |
| Signals | signal:s2-atr-break | 40 | 9 (23 %) | 686 | 66 % | 0.55 | -960.57 |
| Signals | signal:s2-bb-bounce | 40 | 38 (95 %) | 692 | 83 % | 3.08 | 1195.16 |
| Signals | signal:s2-block-scale | 40 | 10 (25 %) | 1021 | 69 % | 0.70 | -807.58 |
| Signals | signal:s2-block-stack | 40 | 5 (13 %) | 788 | 65 % | 0.52 | -1271.10 |
| Signals | signal:s2-confluence | 40 | 36 (90 %) | 1136 | 80 % | 1.76 | 1027.05 |
| Signals | signal:s2-ema-cross | 30 | 17 (57 %) | 65 | 74 % | 0.81 | -29.60 |
| Signals | signal:s2-range-break | 34 | 25 (74 %) | 186 | 75 % | 1.17 | 51.02 |
| Signals | signal:s2-range-shift | 40 | 3 (8 %) | 517 | 59 % | 0.40 | -1228.28 |
| Signals | signal:s2-rsi-revert | 40 | 40 (100 %) | 320 | 92 % | 19.42 | 833.31 |
| Signals | signal:s2-st-trail | 40 | 31 (78 %) | 334 | 81 % | 1.90 | 359.94 |
| Signals | signal:s2-stoch-swing | 40 | 40 (100 %) | 904 | 83 % | 2.31 | 1207.17 |
| Signals | signal:s2-vol-break | 40 | 18 (45 %) | 281 | 73 % | 1.03 | 21.06 |
| Signals | signal:s2-vwap-axis | 8 | 8 (100 %) | 12 | 100 % | ∞ (no loss) | 21.88 |
| Signals | signal:sar | 40 | 10 (25 %) | 1122 | 73 % | 0.74 | -734.96 |
| Signals | signal:squeeze | 40 | 21 (53 %) | 209 | 73 % | 0.90 | -52.42 |
| Signals | signal:st-slow | 40 | 28 (70 %) | 309 | 78 % | 1.59 | 267.11 |
| Signals | signal:stoch-rsi | 40 | 27 (68 %) | 1312 | 77 % | 1.32 | 656.34 |
| Signals | signal:supertrend | 40 | 32 (80 %) | 556 | 82 % | 1.51 | 433.21 |
| Signals | signal:swing | 40 | 17 (43 %) | 1018 | 72 % | 0.83 | -407.71 |
| Signals | signal:thrust | 40 | 30 (75 %) | 1082 | 79 % | 1.23 | 405.11 |
| Signals | signal:trix | 40 | 20 (50 %) | 471 | 79 % | 1.15 | 139.68 |
| Signals | signal:volume-break | 36 | 29 (81 %) | 117 | 90 % | 3.87 | 238.95 |
| Signals | signal:vwap | 40 | 37 (93 %) | 666 | 81 % | 1.83 | 666.34 |
| Signals | signal:williams-r | 40 | 33 (83 %) | 969 | 79 % | 1.84 | 1091.53 |
| Signals | signal:zscore | 40 | 32 (80 %) | 661 | 80 % | 1.78 | 764.18 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 41020 | 30400 | 1906 | 0.96 | 4.00 | 70.00–163.33 (median 163.33) | 6204 | 13104 | 561 | 4066 | 2533 | 111 | 1593 | 8 | 314 | 0 | 0 | 0 | 10620 |  |
| Short | 44643 | 38163 | 3488 | 1.33 | 2.14 | 163.33–163.33 (median 163.33) | 4182 | 5739 | 1651 | 8098 | 3680 | 2126 | 8557 | 58 | 573 | 11 | 0 | 0 | 6480 |  |
| General | 15493 | 13093 | 787 | 1.37 | 2.15 | 163.33–163.33 (median 163.33) | 1051 | 1600 | 550 | 2800 | 1384 | 1058 | 3583 | 0 | 256 | 24 | 0 | 0 | 2400 |  |
| Long | 22246 | 19246 | 1040 | 1.33 | 2.34 | 163.33–163.33 (median 163.33) | 1421 | 3049 | 949 | 4033 | 1920 | 1559 | 4969 | 0 | 280 | 26 | 0 | 0 | 3000 |  |
| Wide | 65614 | 52245 | 232 | 0.66 | 2.41 | 18.00–163.33 (median 163.33) | 12357 | 32433 | 962 | 4070 | 923 | 91 | 1012 | 0 | 150 | 15 | 0 | 9904 | 3465 |  |
| Signals | 2520 | – | 3298 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 2520 signal tapes, 3298 units (pair × symbol × direction) active at the run start, 5667 over the run; 2423 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 13684 | 3826 (28 %) | 56906 | 71 % | 0.49 | -12563.57 |
| Micro | trailing | 27336 | 7754 (28 %) | 115176 | 57 % | 0.47 | -23434.81 |
| Short | normal | 14872 | 5101 (34 %) | 109529 | 61 % | 1.01 | 1878.49 |
| Short | trailing | 29771 | 10663 (36 %) | 237745 | 59 % | 0.98 | -4234.83 |
| General | normal | 9294 | 2875 (31 %) | 57628 | 44 % | 1.00 | 359.89 |
| General | trailing | 6199 | 1955 (32 %) | 36228 | 56 % | 0.93 | -3385.87 |
| Long | normal | 13360 | 4166 (31 %) | 65604 | 45 % | 1.09 | 12747.87 |
| Long | trailing | 8886 | 2772 (31 %) | 38140 | 57 % | 0.95 | -3853.10 |
| Wide | axis | 55710 | 10828 (19 %) | 459923 | 30 % | 0.68 | -99572.87 |
| Wide | dca | 4952 | 1575 (32 %) | 41179 | 66 % | 0.80 | -10453.20 |
| Wide | dca-active | 4952 | 1069 (22 %) | 24597 | 37 % | 0.67 | -6833.77 |
| Signals | normal | 630 | 496 (79 %) | 21301 | 81 % | 1.44 | 17434.80 |
| Signals | trailing | 1890 | 1632 (86 %) | 66371 | 80 % | 1.80 | 65235.21 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1906 | 347 (18 %) | 5412 | 57 % | 0.24 | -3105.96 |
| Short | active | 115 | 13 (11 %) | 258 | 22 % | 0.16 | -562.01 |
| Short | bollinger | 164 | 26 (16 %) | 182 | 55 % | 0.68 | -70.10 |
| Short | break | 524 | 172 (33 %) | 2566 | 54 % | 0.77 | -793.90 |
| Short | channel | 28 | 3 (11 %) | 442 | 45 % | 0.53 | -352.08 |
| Short | direction | 50 | 9 (18 %) | 75 | 37 % | 0.47 | -64.64 |
| Short | ema | 197 | 61 (31 %) | 1218 | 49 % | 0.79 | -362.08 |
| Short | ichimoku | 58 | 0 (0 %) | 68 | 6 % | 0.05 | -144.80 |
| Short | macd | 83 | 27 (33 %) | 317 | 63 % | 0.88 | -42.85 |
| Short | move | 284 | 93 (33 %) | 1329 | 51 % | 0.63 | -712.15 |
| Short | osc | 1159 | 485 (42 %) | 6690 | 68 % | 1.48 | 2445.99 |
| Short | rsi | 298 | 13 (4 %) | 203 | 52 % | 0.66 | -99.67 |
| Short | smooth | 53 | 3 (6 %) | 186 | 29 % | 0.16 | -398.21 |
| Short | trend | 72 | 42 (58 %) | 680 | 63 % | 1.03 | 27.73 |
| Short | volume | 403 | 127 (32 %) | 1856 | 59 % | 0.94 | -128.85 |
| General | active | 14 | 0 (0 %) | 18 | 6 % | 0.04 | -61.12 |
| General | bollinger | 52 | 0 (0 %) | 75 | 33 % | 0.58 | -63.40 |
| General | break | 119 | 49 (41 %) | 639 | 46 % | 0.85 | -145.97 |
| General | channel | 2 | 0 (0 %) | 3 | 33 % | 0.29 | -5.47 |
| General | direction | 13 | 2 (15 %) | 51 | 47 % | 0.95 | -3.68 |
| General | ema | 29 | 7 (24 %) | 176 | 47 % | 0.74 | -82.71 |
| General | ichimoku | 5 | 2 (40 %) | 7 | 57 % | 1.31 | 3.40 |
| General | macd | 26 | 3 (12 %) | 17 | 76 % | 1.36 | 5.97 |
| General | move | 38 | 3 (8 %) | 55 | 16 % | 0.13 | -147.20 |
| General | osc | 281 | 114 (41 %) | 932 | 72 % | 2.64 | 1157.28 |
| General | rsi | 96 | 1 (1 %) | 26 | 38 % | 0.72 | -15.51 |
| General | smooth | 10 | 1 (10 %) | 21 | 10 % | 0.09 | -64.10 |
| General | trend | 11 | 3 (27 %) | 173 | 51 % | 0.80 | -51.85 |
| General | volume | 91 | 26 (29 %) | 384 | 51 % | 0.91 | -54.97 |
| Long | bollinger | 53 | 6 (11 %) | 85 | 38 % | 0.60 | -88.76 |
| Long | break | 111 | 37 (33 %) | 218 | 44 % | 0.80 | -106.99 |
| Long | channel | 6 | 0 (0 %) | 13 | 23 % | 0.15 | -33.17 |
| Long | direction | 11 | 0 (0 %) | 46 | 43 % | 0.67 | -50.52 |
| Long | ema | 3 | 1 (33 %) | 30 | 43 % | 0.75 | -22.43 |
| Long | macd | 50 | 2 (4 %) | 17 | 41 % | 0.65 | -16.17 |
| Long | move | 76 | 13 (17 %) | 140 | 36 % | 0.43 | -198.47 |
| Long | osc | 458 | 149 (33 %) | 659 | 84 % | 4.92 | 1812.14 |
| Long | rsi | 90 | 17 (19 %) | 59 | 63 % | 3.65 | 158.94 |
| Long | smooth | 9 | 1 (11 %) | 33 | 24 % | 0.50 | -46.77 |
| Long | trend | 11 | 0 (0 %) | 123 | 30 % | 0.43 | -235.83 |
| Long | volume | 162 | 63 (39 %) | 496 | 57 % | 1.26 | 243.11 |
| Wide | active | 47 | 17 (36 %) | 78 | 40 % | 4.77 | 156.80 |
| Wide | bollinger | 30 | 1 (3 %) | 429 | 36 % | 0.60 | -74.22 |
| Wide | break | 14 | 3 (21 %) | 38 | 47 % | 0.70 | -8.99 |
| Wide | direction | 9 | 0 (0 %) | 45 | 33 % | 0.49 | -18.45 |
| Wide | ema | 6 | 6 (100 %) | 24 | 63 % | 5.45 | 19.54 |
| Wide | macd | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -2.88 |
| Wide | move | 46 | 30 (65 %) | 64 | 70 % | 3.80 | 39.92 |
| Wide | osc | 54 | 10 (19 %) | 492 | 35 % | 0.66 | -70.70 |
| Wide | smooth | 6 | 6 (100 %) | 24 | 63 % | 5.45 | 19.54 |
| Wide | trend | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 1.24 |
| Wide | volume | 14 | 0 (0 %) | 102 | 19 % | 0.21 | -102.99 |
| Signals | signal:act-burst | 40 | 31 (78 %) | 776 | 80 % | 1.32 | 404.52 |
| Signals | signal:act-hf | 40 | 23 (57 %) | 956 | 76 % | 0.99 | -25.61 |
| Signals | signal:adx | 40 | 29 (73 %) | 512 | 80 % | 1.69 | 494.60 |
| Signals | signal:atr-break | 40 | 11 (28 %) | 847 | 73 % | 0.82 | -361.48 |
| Signals | signal:bollinger | 40 | 34 (85 %) | 774 | 81 % | 1.91 | 988.67 |
| Signals | signal:cci | 40 | 32 (80 %) | 984 | 77 % | 1.39 | 638.95 |
| Signals | signal:cmf | 40 | 11 (28 %) | 751 | 68 % | 0.66 | -728.69 |
| Signals | signal:donchian | 40 | 27 (68 %) | 633 | 78 % | 1.17 | 188.40 |
| Signals | signal:ema-cross | 40 | 15 (38 %) | 361 | 72 % | 0.74 | -259.69 |
| Signals | signal:ema-cross-fast | 40 | 24 (60 %) | 698 | 78 % | 1.13 | 166.64 |
| Signals | signal:ema-pullback | 40 | 18 (45 %) | 929 | 73 % | 0.93 | -127.44 |
| Signals | signal:ema-slope | 40 | 31 (78 %) | 493 | 82 % | 1.63 | 447.17 |
| Signals | signal:ema-trend | 40 | 18 (45 %) | 846 | 73 % | 0.97 | -52.39 |
| Signals | signal:heikin-ashi | 40 | 25 (63 %) | 1347 | 78 % | 1.26 | 559.65 |
| Signals | signal:hma | 40 | 31 (78 %) | 940 | 80 % | 1.38 | 545.57 |
| Signals | signal:ichimoku | 40 | 12 (30 %) | 532 | 72 % | 0.72 | -373.47 |
| Signals | signal:impulse | 40 | 32 (80 %) | 845 | 79 % | 1.46 | 583.41 |
| Signals | signal:kama | 40 | 22 (55 %) | 1129 | 77 % | 1.15 | 295.21 |
| Signals | signal:keltner | 40 | 16 (40 %) | 474 | 76 % | 0.95 | -50.35 |
| Signals | signal:macd-cross | 40 | 26 (65 %) | 944 | 79 % | 1.19 | 304.86 |
| Signals | signal:macd-hist | 40 | 35 (88 %) | 1223 | 80 % | 1.34 | 638.30 |
| Signals | signal:macd-slow | 40 | 22 (55 %) | 869 | 78 % | 1.08 | 137.00 |
| Signals | signal:mfi | 40 | 38 (95 %) | 236 | 88 % | 4.10 | 505.84 |
| Signals | signal:obv | 40 | 40 (100 %) | 1186 | 85 % | 2.67 | 1743.75 |
| Signals | signal:r-awesome | 40 | 17 (43 %) | 599 | 71 % | 0.77 | -333.54 |
| Signals | signal:r-connors | 35 | 9 (26 %) | 386 | 68 % | 0.65 | -337.20 |
| Signals | signal:r-fractal | 40 | 1 (3 %) | 399 | 61 % | 0.37 | -983.83 |
| Signals | signal:r-inside | 27 | 9 (33 %) | 86 | 60 % | 0.34 | -197.68 |
| Signals | signal:r-linreg | 40 | 20 (50 %) | 921 | 75 % | 1.09 | 147.06 |
| Signals | signal:r-nr-break | 40 | 19 (48 %) | 838 | 74 % | 1.02 | 22.27 |
| Signals | signal:r-session-trend | 40 | 17 (43 %) | 353 | 67 % | 0.74 | -251.58 |
| Signals | signal:r-vol-regime | 38 | 25 (66 %) | 225 | 78 % | 1.10 | 45.52 |
| Signals | signal:reclaim | 40 | 27 (68 %) | 1098 | 77 % | 1.24 | 465.03 |
| Signals | signal:rsi-mid | 40 | 20 (50 %) | 890 | 74 % | 0.92 | -154.87 |
| Signals | signal:rsi-momentum | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 |
| Signals | signal:rsi-reversal | 40 | 30 (75 %) | 252 | 82 % | 1.68 | 266.20 |
| Signals | signal:s2-active-hf | 40 | 11 (28 %) | 1108 | 74 % | 0.84 | -397.90 |
| Signals | signal:s2-adx-gate | 40 | 25 (63 %) | 830 | 76 % | 1.13 | 199.60 |
| Signals | signal:s2-atr-break | 40 | 9 (23 %) | 686 | 66 % | 0.55 | -960.57 |
| Signals | signal:s2-bb-bounce | 40 | 38 (95 %) | 692 | 83 % | 3.08 | 1195.16 |
| Signals | signal:s2-block-scale | 40 | 10 (25 %) | 1021 | 69 % | 0.70 | -807.58 |
| Signals | signal:s2-block-stack | 40 | 5 (13 %) | 788 | 65 % | 0.52 | -1271.10 |
| Signals | signal:s2-confluence | 40 | 36 (90 %) | 1136 | 80 % | 1.76 | 1027.05 |
| Signals | signal:s2-ema-cross | 30 | 17 (57 %) | 65 | 74 % | 0.81 | -29.60 |
| Signals | signal:s2-range-break | 34 | 25 (74 %) | 186 | 75 % | 1.17 | 51.02 |
| Signals | signal:s2-range-shift | 40 | 3 (8 %) | 517 | 59 % | 0.40 | -1228.28 |
| Signals | signal:s2-rsi-revert | 40 | 40 (100 %) | 320 | 92 % | 19.42 | 833.31 |
| Signals | signal:s2-st-trail | 40 | 31 (78 %) | 334 | 81 % | 1.90 | 359.94 |
| Signals | signal:s2-stoch-swing | 40 | 40 (100 %) | 904 | 83 % | 2.31 | 1207.17 |
| Signals | signal:s2-vol-break | 40 | 18 (45 %) | 281 | 73 % | 1.03 | 21.06 |
| Signals | signal:s2-vwap-axis | 8 | 8 (100 %) | 12 | 100 % | ∞ (no loss) | 21.88 |
| Signals | signal:sar | 40 | 10 (25 %) | 1122 | 73 % | 0.74 | -734.96 |
| Signals | signal:squeeze | 40 | 21 (53 %) | 209 | 73 % | 0.90 | -52.42 |
| Signals | signal:st-slow | 40 | 28 (70 %) | 309 | 78 % | 1.59 | 267.11 |
| Signals | signal:stoch-rsi | 40 | 27 (68 %) | 1312 | 77 % | 1.32 | 656.34 |
| Signals | signal:supertrend | 40 | 32 (80 %) | 556 | 82 % | 1.51 | 433.21 |
| Signals | signal:swing | 40 | 17 (43 %) | 1018 | 72 % | 0.83 | -407.71 |
| Signals | signal:thrust | 40 | 30 (75 %) | 1082 | 79 % | 1.23 | 405.11 |
| Signals | signal:trix | 40 | 20 (50 %) | 471 | 79 % | 1.15 | 139.68 |
| Signals | signal:volume-break | 36 | 29 (81 %) | 117 | 90 % | 3.87 | 238.95 |
| Signals | signal:vwap | 40 | 37 (93 %) | 666 | 81 % | 1.83 | 666.34 |
| Signals | signal:williams-r | 40 | 33 (83 %) | 969 | 79 % | 1.84 | 1091.53 |
| Signals | signal:zscore | 40 | 32 (80 %) | 661 | 80 % | 1.78 | 764.18 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 44 | 1 (2 %) | 624 | 71 % | 0.52 | -164.94 |
| Micro | 1.25 | 44 | 1 (2 %) | 624 | 71 % | 0.52 | -164.94 |
| Micro | 1.35 | 41 | 1 (2 %) | 558 | 70 % | 0.50 | -157.97 |
| Micro | 1.5 | 41 | 1 (2 %) | 558 | 70 % | 0.50 | -157.97 |
| Micro | 1.75 | 26 | 0 (0 %) | 351 | 69 % | 0.48 | -106.27 |
| Micro | 2 | 13 | 0 (0 %) | 176 | 69 % | 0.47 | -56.52 |
| Short | 1.1 | 1470 | 831 (57 %) | 14008 | 61 % | 1.04 | 554.54 |
| Short | 1.25 | 1353 | 770 (57 %) | 12772 | 61 % | 1.05 | 642.92 |
| Short | 1.35 | 1225 | 700 (57 %) | 11308 | 61 % | 1.06 | 650.03 |
| Short | 1.5 | 989 | 571 (58 %) | 8895 | 61 % | 1.07 | 654.51 |
| Short | 1.75 | 558 | 311 (56 %) | 4880 | 60 % | 1.06 | 304.25 |
| Short | 2 | 259 | 155 (60 %) | 2245 | 62 % | 1.15 | 303.34 |
| General | 1.1 | 244 | 155 (64 %) | 2145 | 57 % | 1.25 | 679.95 |
| General | 1.25 | 226 | 144 (64 %) | 1830 | 58 % | 1.31 | 697.63 |
| General | 1.35 | 204 | 132 (65 %) | 1633 | 59 % | 1.34 | 680.53 |
| General | 1.5 | 162 | 111 (69 %) | 1277 | 61 % | 1.48 | 712.32 |
| General | 1.75 | 88 | 67 (76 %) | 704 | 65 % | 1.87 | 585.82 |
| General | 2 | 43 | 36 (84 %) | 366 | 70 % | 2.32 | 410.19 |
| Long | 1.1 | 244 | 182 (75 %) | 1358 | 65 % | 1.68 | 1521.49 |
| Long | 1.25 | 226 | 170 (75 %) | 1226 | 66 % | 1.80 | 1546.46 |
| Long | 1.35 | 207 | 161 (78 %) | 1049 | 68 % | 1.98 | 1537.33 |
| Long | 1.5 | 182 | 148 (81 %) | 865 | 71 % | 2.27 | 1509.15 |
| Long | 1.75 | 125 | 108 (86 %) | 552 | 79 % | 3.21 | 1288.74 |
| Long | 2 | 73 | 66 (90 %) | 320 | 84 % | 4.71 | 877.29 |
| Wide | 1.1 | 11 | 3 (27 %) | 111 | 39 % | 0.65 | -27.46 |
| Wide | 1.25 | 11 | 3 (27 %) | 111 | 39 % | 0.65 | -27.46 |
| Wide | 1.35 | 10 | 3 (30 %) | 96 | 40 % | 0.65 | -24.13 |
| Wide | 1.5 | 10 | 3 (30 %) | 96 | 40 % | 0.65 | -24.13 |
| Wide | 1.75 | 6 | 0 (0 %) | 51 | 29 % | 0.42 | -24.46 |
| Wide | 2 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -8.89 |
| Signals | 1.1 | 578 | 304 (53 %) | 10516 | 75 % | 0.99 | -211.37 |
| Signals | 1.25 | 345 | 178 (52 %) | 6786 | 74 % | 0.94 | -803.72 |
| Signals | 1.35 | 247 | 129 (52 %) | 5094 | 74 % | 0.92 | -788.73 |
| Signals | 1.5 | 158 | 81 (51 %) | 3251 | 73 % | 0.90 | -655.79 |
| Signals | 1.75 | 77 | 45 (58 %) | 1705 | 74 % | 0.95 | -143.18 |
| Signals | 2 | 41 | 22 (54 %) | 999 | 73 % | 0.88 | -214.72 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | pulse | mc-lag-6@m5 | 22 | 22 (100 %) | 132 | 100 % | ∞ (no loss) | 49.80 | tp0.6 sl2.1 tr0 h192 mc (6 · ∞ (no loss) · 2.40) |
| Micro | sandwich | mc-rsit3-30@m15 | 50 | 50 (100 %) | 50 | 100 % | ∞ (no loss) | 18.10 | – |
| Micro | magnet | mc-trsi2-10@m5 | 17 | 17 (100 %) | 51 | 100 % | ∞ (no loss) | 14.40 | – |
| Micro | sandwich | mc-rsi3-10@m5c | 24 | 24 (100 %) | 48 | 79 % | 28.97 | 12.80 | – |
| Micro | snap | mc-rsi3-10@m5c | 24 | 24 (100 %) | 48 | 79 % | 28.97 | 12.80 | – |
| Micro | sandwich | mc-rsit5-15@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 10.80 | – |
| Micro | pulse | mc-rsit5-15@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 10.80 | – |
| Micro | pulse | mc-rsit3-25@m15 | 34 | 34 (100 %) | 34 | 100 % | ∞ (no loss) | 7.30 | – |
| Micro | ribbon | mc-lag-12@m5 | 6 | 6 (100 %) | 50 | 84 % | 1.51 | 5.27 | tp0.6 sl2.1 tr0.3 h192 mc (9 · 18.92 · 2.09) |
| Micro | pulse | mc-rsrev-6@m5c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 3.20 | – |
| Micro | pulse | mc-rsi7-20@m5c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 3.20 | – |
| Micro | pivot | mc-lag-12@m5 | 1 | 1 (100 %) | 15 | 93 % | 1.66 | 1.95 | tp0.55 sl2.75 tr0 h192 mc (15 · 1.66 · 1.95) |
| Micro | magnet | mc-rsi2-10@m5 | 1 | 0 (0 %) | 18 | 61 % | 0.82 | -0.97 | tp0.6 sl1.8 tr0.45 h288 mc (18 · 0.82 · -0.97) |
| Micro | revert | mc-tpull-13@m5c | 10 | 2 (20 %) | 58 | 55 % | 0.75 | -6.30 | tp0.6 sl3 tr0.3 h192 mc (5 · 4.63 · 1.50) |
| Micro | sandwich | mc-rsi4-15@m5c | 4 | 0 (0 %) | 12 | 67 % | 0.33 | -6.60 | – |
| Micro | snap | mc-rsi4-15@m5c | 4 | 0 (0 %) | 12 | 67 % | 0.33 | -6.60 | – |
| Micro | sandwich | mc-rsi14-25@m5 | 2 | 0 (0 %) | 42 | 71 % | 0.50 | -12.00 | tp0.6 sl1.8 tr0 h192 mc (21 · 0.50 · -6.00) |
| Micro | snap | mc-rsi14-25@m5 | 2 | 0 (0 %) | 42 | 71 % | 0.50 | -12.00 | tp0.6 sl1.8 tr0 h192 mc (21 · 0.50 · -6.00) |
| Micro | pulse | mc-rsi9-30@m5c | 4 | 0 (0 %) | 96 | 83 % | 0.71 | -13.20 | tp0.6 sl2.55 tr0 h192 mc (24 · 0.73 · -3.00) |
| Micro | magnet | mc-irsi2-10@m5 | 16 | 1 (6 %) | 176 | 71 % | 0.69 | -23.37 | tp0.6 sl1.65 tr0.45 h288 mc (11 · 1.04 · 0.12) |
| Micro | sweep | mc-rsi7-20@m5c | 12 | 0 (0 %) | 60 | 53 % | 0.29 | -31.31 | tp0.6 sl2.85 tr0 h192 mc (5 · 0.52 · -1.45) |
| Micro | snap | mc-rsi4-20@m5c | 6 | 0 (0 %) | 90 | 67 % | 0.40 | -36.00 | tp0.6 sl1.65 tr0 h192 mc (15 · 0.43 · -5.25) |
| Micro | sandwich | mc-rsi4-20@m5c | 7 | 0 (0 %) | 104 | 67 % | 0.39 | -43.60 | tp0.6 sl1.65 tr0 h192 mc (15 · 0.43 · -5.25) |
| Micro | pulse | mc-rsi4-20@m5c | 10 | 0 (0 %) | 140 | 70 % | 0.45 | -47.80 | tp0.6 sl1.65 tr0 h192 mc (14 · 0.54 · -3.40) |
| Micro | sandwich | mc-rsrev-3@m15c | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -53.45 | – |
| Micro | pulse | mc-rsrev-3@m15c | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -53.45 | – |
| Micro | sweep | mc-rsi9-20@m5 | 10 | 0 (0 %) | 80 | 38 % | 0.17 | -82.72 | tp0.6 sl2.85 tr0.3 h192 mc (8 · 0.29 · -6.78) |
| Micro | clamp | mc-lag-12@m15 | 112 | 38 (34 %) | 336 | 75 % | 0.46 | -82.98 | – |
| Micro | sandwich | mc-rsit5-20@m15 | 214 | 0 (0 %) | 428 | 50 % | 0.16 | -361.91 | – |
| Micro | pulse | mc-rsit5-20@m15 | 214 | 0 (0 %) | 428 | 50 % | 0.16 | -361.91 | – |
| Micro | sweep | mc-rsi5-10@m5 | 126 | 0 (0 %) | 630 | 57 % | 0.20 | -473.48 | tp0.55 sl1.925 tr0.275 h192 mc (5 · 0.27 · -1.87) |
| Micro | sweep | mc-rsi4-10@m5 | 84 | 0 (0 %) | 588 | 46 % | 0.14 | -549.46 | tp0.55 sl1.65 tr0 h192 mc (7 · 0.25 · -4.15) |
| Micro | pivot | mc-lag-12@m15 | 284 | 56 (20 %) | 1508 | 43 % | 0.14 | -994.86 | tp0.5 sl2.125 tr0.375 h64 mc (5 · 6.88 · 1.03) |
| Short | magnet | willr-50-90@m15c | 80 | 65 (81 %) | 574 | 69 % | 2.38 | 456.64 | tp2.8 sl4.2 tr0 h96 sh (6 · ∞ (no loss) · 15.60) |
| Short | pivot | willr-50-95@m15 | 28 | 28 (100 %) | 278 | 90 % | 127.11 | 448.18 | tp2.4 sl4.8 tr0 h64 sh (10 · ∞ (no loss) · 22.00) |
| Short | sweep | r-ultimate@m15 | 45 | 45 (100 %) | 432 | 84 % | 3.11 | 440.65 | tp2.4 sl3.6 tr1.2 h64 sh (10 · 4.66 · 13.91) |
| Short | sweep | willr-14-95@m30 | 60 | 60 (100 %) | 345 | 80 % | 5.04 | 323.57 | tp2.6 sl3.9 tr0 h48 sh (5 · ∞ (no loss) · 12.00) |
| Short | sweep | r-vol-regime@m15 | 90 | 80 (89 %) | 180 | 92 % | 13.53 | 323.02 | – |
| Short | revert | r-chop@m30 | 40 | 37 (93 %) | 730 | 63 % | 1.44 | 287.60 | tp2.8 sl5.6 tr0 h48 sh (12 · ∞ (no loss) · 31.20) |
| Short | ribbon | trend-st@m15c | 32 | 32 (100 %) | 138 | 86 % | 54.95 | 269.19 | tp2 sl3 tr1.5 h64 sh (5 · 3.76 · 8.82) |
| Short | sweep | willr-21-95@m15c | 44 | 38 (86 %) | 225 | 80 % | 3.93 | 215.57 | tp2.8 sl4.2 tr2.1 h64 sh (5 · 55.99 · 9.64) |
| Short | ribbon | r-ultimate@m15 | 28 | 26 (93 %) | 775 | 67 % | 1.27 | 160.07 | tp2 sl3 tr1.5 h96 sh (26 · 2.02 · 16.38) |
| Short | revert | break-vol-2@m30 | 20 | 20 (100 %) | 296 | 64 % | 1.46 | 122.50 | tp2.4 sl3.6 tr0 h48 sh (14 · 2.12 · 12.80) |
| Short | sweep | willr-14-95@m15 | 15 | 13 (87 %) | 115 | 77 % | 2.41 | 114.43 | tp2.8 sl4.2 tr0 h64 sh (7 · 3.55 · 11.20) |
| Short | ribbon | macd-cross-19-39-9@m30 | 21 | 21 (100 %) | 155 | 83 % | 2.17 | 107.31 | tp2.2 sl4.4 tr0 h32 sh (7 · 2.61 · 7.40) |
| Short | sweep | willr-50-95@m15 | 13 | 13 (100 %) | 136 | 82 % | 2.44 | 102.27 | tp2.8 sl5.6 tr0 h64 sh (9 · 4.56 · 16.24) |
| Short | pivot | willr-28-95@m15c | 15 | 15 (100 %) | 67 | 84 % | 14.53 | 86.06 | tp1.8 sl2.7 tr0 h64 sh (5 · ∞ (no loss) · 8.00) |
| Short | pivot | mfi-14-20@m15c | 26 | 26 (100 %) | 75 | 88 % | 5.75 | 80.39 | – |
| Short | sweep | r-td@m30 | 76 | 48 (63 %) | 451 | 65 % | 1.18 | 70.86 | tp2.4 sl4.8 tr1.8 h32 sh (5 · 30.90 · 6.75) |
| Short | ribbon | willr-50-95@m15 | 4 | 3 (75 %) | 55 | 80 % | 5.11 | 67.61 | tp2.8 sl5.6 tr0 h96 sh (11 · ∞ (no loss) · 28.60) |
| Short | magnet | r-pin-m@m15 | 27 | 27 (100 %) | 27 | 100 % | ∞ (no loss) | 62.20 | – |
| Short | sweep | willr-21-95@m15 | 5 | 5 (100 %) | 61 | 69 % | 2.38 | 59.72 | tp2.8 sl4.2 tr2.1 h64 sh (11 · 4.99 · 18.25) |
| Short | ribbon | willr-21-90@m15 | 4 | 4 (100 %) | 124 | 75 % | 1.57 | 58.77 | tp2 sl4 tr0 h64 sh (30 · 1.71 · 18.00) |
| Short | sweep | willr-28-95@m30 | 32 | 22 (69 %) | 277 | 70 % | 1.24 | 58.38 | tp2.8 sl4.2 tr1.4 h32 sh (8 · 2.84 · 8.09) |
| Short | ribbon | willr-28-95@m15 | 8 | 8 (100 %) | 59 | 85 % | 9.88 | 55.95 | tp2 sl3 tr0 h64 sh (7 · ∞ (no loss) · 12.60) |
| Short | ribbon | willr-7-90@m30 | 19 | 12 (63 %) | 117 | 82 % | 1.76 | 55.09 | tp2 sl4 tr1.5 h48 sh (7 · 172.89 · 10.31) |
| Short | follow | r-ultimate@m15 | 4 | 4 (100 %) | 150 | 68 % | 1.49 | 54.73 | tp2 sl4 tr1 h96 sh (37 · 2.50 · 20.30) |
| Short | ribbon | willr-28-95@m15c | 9 | 9 (100 %) | 56 | 77 % | 5.49 | 50.71 | tp2.6 sl2.6 tr1.95 h64 sh (6 · 49.86 · 7.44) |
| Short | follow | mfi-14-20@m15 | 2 | 2 (100 %) | 63 | 75 % | 1.71 | 45.02 | tp2.6 sl5.2 tr0 h64 sh (30 · 1.92 · 26.42) |
| Short | ribbon | willr-50-95@m15c | 3 | 3 (100 %) | 32 | 88 % | 116.99 | 39.52 | tp2.2 sl4.4 tr1.65 h64 sh (12 · 182.34 · 15.42) |
| Short | magnet | willr-50-80@m15c | 18 | 12 (67 %) | 339 | 56 % | 1.11 | 37.90 | tp2.6 sl5.2 tr0 h96 sh (13 · 5.33 · 23.40) |
| Short | revert | break-vol-2@m15c | 8 | 8 (100 %) | 117 | 62 % | 1.40 | 37.13 | tp2.4 sl2.4 tr0 h96 sh (14 · 2.12 · 11.60) |
| Short | ribbon | r-ultimate@m15c | 10 | 10 (100 %) | 47 | 85 % | 3.40 | 36.91 | tp2.4 sl2.4 tr0 h64 sh (5 · 3.38 · 6.20) |
| Short | ribbon | willr-14-90@m15 | 3 | 3 (100 %) | 71 | 77 % | 1.49 | 31.68 | tp2 sl4 tr1.5 h64 sh (23 · 1.57 · 12.04) |
| Short | sweep | willr-21-90@m30 | 4 | 4 (100 %) | 75 | 69 % | 1.51 | 29.73 | tp1.8 sl2.7 tr1.35 h48 sh (20 · 1.54 · 9.46) |
| Short | sweep | willr-28-95@m15c | 10 | 7 (70 %) | 59 | 68 % | 1.86 | 26.09 | tp2.8 sl2.8 tr0 h96 sh (5 · 3.47 · 7.40) |
| Short | sweep | break-squeeze-t25@m15c | 15 | 12 (80 %) | 12 | 100 % | ∞ (no loss) | 23.60 | – |
| Short | ribbon | trend-st-21-3@m15c | 5 | 5 (100 %) | 20 | 65 % | 7.43 | 22.24 | tp1.8 sl3.6 tr0.9 h64 sh (5 · 7.16 · 1.72) |
| Short | sweep | willr-21-95@m30 | 5 | 5 (100 %) | 37 | 76 % | 2.30 | 20.29 | tp2.8 sl5.6 tr1.4 h32 sh (6 · ∞ (no loss) · 11.33) |
| Short | revert | act-chop@m15c | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 19.80 | – |
| Short | sweep | r-bb-adx@m30 | 9 | 6 (67 %) | 18 | 83 % | 3.70 | 19.45 | – |
| Short | revert | r-klinger@m15c | 88 | 51 (58 %) | 934 | 65 % | 1.02 | 19.31 | tp2.6 sl2.6 tr1.95 h64 sh (11 · 2.14 · 9.54) |
| Short | sweep | willr-50-95@m15c | 4 | 4 (100 %) | 26 | 58 % | 2.85 | 18.72 | tp2.2 sl4.4 tr1.65 h64 sh (6 · 47.43 · 7.51) |
| Short | pivot | z-50-2.5@m15c | 3 | 3 (100 %) | 48 | 65 % | 1.64 | 18.56 | tp2 sl3 tr1 h64 sh (16 · 2.31 · 8.88) |
| Short | pivot | cci-40-200@m15c | 11 | 7 (64 %) | 286 | 64 % | 1.06 | 16.81 | tp1.8 sl2.7 tr1.35 h96 sh (25 · 1.37 · 6.66) |
| Short | sweep | willr-28-95@m15 | 2 | 2 (100 %) | 26 | 62 % | 1.66 | 16.10 | tp2.8 sl2.8 tr2.1 h64 sh (13 · 1.66 · 8.05) |
| Short | clamp | willr-7-90@m30 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 15.86 | – |
| Short | ribbon | trend-st-14-4@m15c | 3 | 3 (100 %) | 29 | 72 % | 1.73 | 15.77 | tp2.2 sl3.3 tr1.65 h64 sh (10 · 1.86 · 6.08) |
| Short | ribbon | willr-14-90@m30 | 3 | 3 (100 %) | 33 | 79 % | 1.56 | 14.89 | tp2 sl4 tr0 h48 sh (11 · 1.93 · 7.80) |
| Short | revert | r-connors@m15c | 2 | 2 (100 %) | 14 | 93 % | 118.67 | 14.88 | tp2.6 sl5.2 tr1.3 h96 sh (7 · 65.10 · 8.11) |
| Short | clamp | r-cvd-div-m@m15c | 11 | 9 (82 %) | 101 | 62 % | 1.14 | 12.46 | tp2.2 sl2.2 tr1.65 h64 sh (9 · 1.43 · 4.15) |
| Short | ribbon | ema-slope-20-10@m15c | 2 | 2 (100 %) | 6 | 67 % | 32.87 | 12.16 | – |
| Short | pivot | bb-mid@m15 | 15 | 14 (93 %) | 28 | 86 % | 3.17 | 10.57 | – |
| Short | revert | r-bos@m30 | 1 | 1 (100 %) | 22 | 73 % | 1.50 | 9.60 | tp2 sl3 tr0 h48 sh (22 · 1.50 · 9.60) |
| Short | sweep | willr-50-95@m30 | 7 | 4 (57 %) | 70 | 66 % | 1.15 | 9.41 | tp1.8 sl3.6 tr1.35 h48 sh (10 · 1.78 · 5.93) |
| Short | pivot | willr-50-95@m15c | 1 | 1 (100 %) | 8 | 100 % | ∞ (no loss) | 9.27 | tp2 sl4 tr1.5 h96 sh (8 · ∞ (no loss) · 9.27) |
| Short | sweep | r-valuearea@m30 | 15 | 9 (60 %) | 13 | 69 % | 13.53 | 8.13 | – |
| Short | pivot | r-pin@m15 | 5 | 4 (80 %) | 20 | 75 % | 1.44 | 7.07 | – |
| Short | pivot | willr-50-95@m30 | 3 | 2 (67 %) | 6 | 83 % | 4.90 | 7.00 | – |
| Short | ribbon | trix-9@m30 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 6.76 | – |
| Short | revert | move-impulse-20-2.5@m15c | 5 | 2 (40 %) | 243 | 58 % | 1.02 | 6.40 | tp2.6 sl5.2 tr0 h96 sh (36 · 1.56 · 24.00) |
| Short | pivot | willr-28-95@m15 | 2 | 2 (100 %) | 10 | 60 % | 2.02 | 5.63 | tp2.4 sl2.4 tr1.8 h64 sh (5 · 2.02 · 2.82) |
| Short | sweep | macd-cross@m15c | 6 | 4 (67 %) | 32 | 69 % | 1.31 | 5.14 | tp2.6 sl5.2 tr0 h64 sh (5 · 1.78 · 4.20) |
| Short | sweep | mfi-14-10@m15 | 18 | 7 (39 %) | 70 | 56 % | 1.10 | 4.53 | – |
| Short | pivot | mfi-14-10@m15 | 1 | 1 (100 %) | 6 | 50 % | 1.88 | 3.87 | tp2 sl2 tr1.5 h64 sh (6 · 1.88 · 3.87) |
| Short | ribbon | r-linreg-m@m15 | 6 | 3 (50 %) | 53 | 72 % | 1.04 | 3.06 | tp2.4 sl4.8 tr0 h96 sh (9 · 1.54 · 5.40) |
| Short | revert | r-rsi2@m15c | 1 | 1 (100 %) | 12 | 75 % | 1.26 | 3.00 | tp1.8 sl3.6 tr0 h96 sh (12 · 1.26 · 3.00) |
| Short | ribbon | dir-thrust@m30 | 1 | 1 (100 %) | 14 | 64 % | 1.23 | 2.64 | tp2.8 sl5.6 tr1.4 h32 sh (14 · 1.23 · 2.64) |
| Short | sandwich | act-burst@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 2.52 | – |
| Short | pulse | act-burst@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 2.52 | – |
| Short | ribbon | break-squeeze-t25@m15 | 6 | 4 (67 %) | 12 | 67 % | 5.22 | 1.93 | – |
| Short | sweep | r-bb-adx@m15 | 5 | 3 (60 %) | 5 | 60 % | 9.40 | 1.08 | – |
| Short | pivot | break-squeeze-t25@m15 | 2 | 2 (100 %) | 10 | 60 % | 1.27 | 0.79 | tp2 sl4 tr1 h64 sh (5 · 1.27 · 0.39) |
| Short | pivot | willr-28-90@m30 | 2 | 1 (50 %) | 12 | 67 % | 0.99 | -0.14 | tp2 sl3 tr0 h48 sh (6 · 1.13 · 0.80) |
| Short | revert | r-qh-flow-m@m15c | 1 | 0 (0 %) | 37 | 59 % | 0.99 | -0.45 | tp2.8 sl4.2 tr0 h64 sh (37 · 0.99 · -0.45) |
| Short | ribbon | macd-zero@m15 | 4 | 2 (50 %) | 24 | 33 % | 0.91 | -2.45 | tp1.8 sl2.7 tr0.9 h64 sh (6 · 1.05 · 0.29) |
| Short | ribbon | dir-emax-12-26@m15 | 4 | 2 (50 %) | 24 | 33 % | 0.91 | -2.45 | tp1.8 sl2.7 tr0.9 h64 sh (6 · 1.05 · 0.29) |
| Short | ribbon | macd-zero@m15c | 2 | 0 (0 %) | 12 | 33 % | 0.81 | -3.03 | tp1.8 sl3.6 tr0.9 h64 sh (6 · 0.81 · -1.51) |
| Short | ribbon | dir-emax-12-26@m15c | 2 | 0 (0 %) | 12 | 33 % | 0.81 | -3.03 | tp1.8 sl3.6 tr0.9 h64 sh (6 · 0.81 · -1.51) |
| Short | follow | r-fisher-m@m15c | 4 | 0 (0 %) | 16 | 50 % | 0.75 | -5.70 | – |
| Short | revert | r-spring@m15 | 6 | 2 (33 %) | 18 | 44 % | 0.68 | -8.26 | – |
| Short | ribbon | r-valuearea-m@m15 | 14 | 6 (43 %) | 32 | 41 % | 0.77 | -8.27 | – |
| Short | ribbon | dir-vwap@m15 | 2 | 0 (0 %) | 6 | 17 % | 0.12 | -11.89 | – |
| Short | sweep | r-pin-m@m15 | 16 | 8 (50 %) | 21 | 52 % | 0.17 | -12.32 | – |
| Short | revert | r-klinger-m@m15c | 35 | 16 (46 %) | 218 | 53 % | 0.94 | -15.95 | tp2.6 sl5.2 tr1.95 h64 sh (6 · 2.60 · 8.65) |
| Short | pivot | move-impulse-4-1.2@m30 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -17.64 | – |
| Short | revert | break-vol-1.3@m30 | 1 | 0 (0 %) | 33 | 42 % | 0.62 | -18.60 | tp2.4 sl2.4 tr0 h48 sh (33 · 0.62 · -18.60) |
| Short | pivot | break-squeeze@m15 | 2 | 0 (0 %) | 7 | 29 % | 0.18 | -18.60 | – |
| Short | ribbon | trend-st-28-6@m15 | 2 | 0 (0 %) | 52 | 60 % | 0.74 | -19.37 | tp2.8 sl4.2 tr1.4 h96 sh (27 · 0.86 · -4.37) |
| Short | sweep | squeeze-30@m15 | 4 | 0 (0 %) | 12 | 8 % | 0.00 | -19.52 | – |
| Short | pulse | ema-slope-100@m15c | 15 | 7 (47 %) | 15 | 47 % | 0.20 | -19.54 | – |
| Short | pivot | r-camarilla@m15 | 4 | 0 (0 %) | 12 | 33 % | 0.03 | -20.55 | – |
| Short | magnet | willr-50-95@m15c | 8 | 0 (0 %) | 40 | 45 % | 0.56 | -20.76 | tp1.8 sl2.7 tr1.35 h64 sh (5 · 0.97 · -0.17) |
| Short | magnet | kelt-20-2.5@m15 | 5 | 0 (0 %) | 10 | 50 % | 0.24 | -20.79 | – |
| Short | pivot | r-ultimate@m15 | 26 | 14 (54 %) | 441 | 62 % | 0.95 | -21.97 | tp2 sl4 tr1.5 h64 sh (15 · 1.32 · 4.08) |
| Short | pivot | break-squeeze-120@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -24.20 | – |
| Short | revert | break-vol@m15c | 2 | 0 (0 %) | 32 | 38 % | 0.52 | -28.00 | tp2.6 sl2.6 tr0 h96 sh (16 · 0.51 · -13.60) |
| Short | sweep | rsi-fast@m15 | 6 | 0 (0 %) | 56 | 52 % | 0.56 | -30.39 | tp2.4 sl2.4 tr1.2 h64 sh (9 · 0.66 · -3.56) |
| Short | clamp | r-td-m@m15 | 15 | 0 (0 %) | 9 | 0 % | 0.00 | -31.51 | – |
| Short | ribbon | trend-ema-50-200@m15c | 2 | 0 (0 %) | 44 | 55 % | 0.34 | -31.63 | tp2.2 sl4.4 tr1.1 h64 sh (22 · 0.34 · -15.81) |
| Short | clamp | r-zdist@m15 | 7 | 0 (0 %) | 94 | 55 % | 0.66 | -33.00 | tp2 sl4 tr1.5 h96 sh (11 · 0.99 · -0.14) |
| Short | ribbon | ichi-cloud-20@m15c | 1 | 0 (0 %) | 11 | 36 % | 0.17 | -33.51 | tp2.8 sl5.6 tr2.1 h96 sh (11 · 0.17 · -33.51) |
| Short | sweep | willr-50-90@m15c | 2 | 0 (0 %) | 47 | 40 % | 0.51 | -34.43 | tp2.2 sl2.2 tr0 h96 sh (24 · 0.60 · -13.60) |
| Short | revert | r-chop-m@m15 | 13 | 5 (38 %) | 115 | 48 % | 0.80 | -36.38 | tp2.6 sl3.9 tr1.3 h96 sh (8 · 1.84 · 5.96) |
| Short | clamp | z-50-2.5@m15c | 12 | 3 (25 %) | 81 | 47 % | 0.52 | -38.40 | tp2 sl4 tr1 h96 sh (7 · 12.62 · 2.75) |
| Short | pulse | trend-st-14-4@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -38.50 | – |
| Short | revert | r-awesome-m@m15c | 41 | 13 (32 %) | 146 | 55 % | 0.79 | -39.29 | – |
| Short | magnet | bb-wick@m30 | 16 | 0 (0 %) | 48 | 33 % | 0.46 | -39.78 | – |
| Short | magnet | r-zdist@m15 | 7 | 0 (0 %) | 119 | 44 % | 0.76 | -39.92 | tp2.6 sl2.6 tr1.95 h96 sh (16 · 0.84 · -3.63) |
| Short | sandwich | dir-vwap-120@m15 | 17 | 6 (35 %) | 17 | 35 % | 0.09 | -40.71 | – |
| Short | magnet | break-fail@m15c | 11 | 2 (18 %) | 117 | 62 % | 0.67 | -40.78 | tp1.8 sl3.6 tr0.9 h64 sh (10 · 1.01 · 0.06) |
| Short | revert | cmf-20-0.1@m15c | 3 | 0 (0 %) | 214 | 56 % | 0.83 | -45.32 | tp2.6 sl2.6 tr0 h64 sh (71 · 0.97 · -2.62) |
| Short | sweep | willr-21-90@m15 | 3 | 0 (0 %) | 95 | 44 % | 0.68 | -47.80 | tp2.8 sl2.8 tr0 h64 sh (29 · 0.81 · -8.60) |
| Short | pivot | r-sweep-m@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -48.49 | – |
| Short | pivot | r-sweep@m15 | 11 | 0 (0 %) | 11 | 0 % | 0.00 | -51.70 | – |
| Short | ribbon | ha-3@m15 | 6 | 0 (0 %) | 91 | 51 % | 0.50 | -63.55 | tp2.8 sl2.8 tr1.4 h96 sh (17 · 0.68 · -5.84) |
| Short | pulse | ema-slope@m15 | 8 | 0 (0 %) | 16 | 0 % | 0.00 | -67.28 | – |
| Short | clamp | cci-40-200@x4@m15 | 11 | 2 (18 %) | 60 | 35 % | 0.23 | -70.26 | tp2.4 sl4.8 tr1.2 h96 sh (5 · 0.63 · -1.48) |
| Short | follow | r-bb-adx@m30 | 3 | 0 (0 %) | 79 | 49 % | 0.46 | -71.42 | tp2.2 sl3.3 tr0 h48 sh (23 · 0.52 · -20.00) |
| Short | ribbon | ema-slope@m15 | 76 | 26 (34 %) | 552 | 50 % | 0.89 | -74.79 | tp1.8 sl1.8 tr1.35 h64 sh (8 · 2.02 · 6.13) |
| Short | revert | break-vol@m30 | 5 | 0 (0 %) | 97 | 42 % | 0.52 | -74.80 | tp2 sl2 tr0 h48 sh (22 · 0.57 · -12.40) |
| Short | magnet | rsi-div@m15 | 40 | 8 (20 %) | 119 | 45 % | 0.58 | -90.36 | – |
| Short | pulse | ichi-tk-9@m15 | 55 | 0 (0 %) | 55 | 0 % | 0.00 | -100.49 | – |
| Short | clamp | r-ultimate@m15 | 30 | 2 (7 %) | 292 | 53 % | 0.69 | -103.39 | tp2 sl3 tr1.5 h64 sh (9 · 1.03 · 0.30) |
| Short | revert | kelt-20-2@m30 | 4 | 0 (0 %) | 161 | 46 % | 0.62 | -109.58 | tp2.6 sl2.6 tr0 h48 sh (42 · 0.64 · -24.00) |
| Short | clamp | break-squeeze-120@m15 | 17 | 0 (0 %) | 34 | 0 % | 0.00 | -113.80 | – |
| Short | magnet | r-sweep@m15 | 27 | 0 (0 %) | 27 | 0 % | 0.00 | -129.12 | – |
| Short | ribbon | macd-hist-19-39-9@m15c | 27 | 0 (0 %) | 94 | 39 % | 0.30 | -149.82 | – |
| Short | clamp | r-zdist@m15c | 19 | 1 (5 %) | 175 | 40 % | 0.42 | -152.99 | tp2 sl4 tr1 h96 sh (11 · 0.55 · -4.02) |
| Short | ribbon | ema-slope@m15c | 87 | 26 (30 %) | 618 | 50 % | 0.81 | -164.23 | tp1.8 sl1.8 tr1.35 h64 sh (8 · 2.02 · 6.13) |
| Short | clamp | cci-40-200@m15 | 8 | 0 (0 %) | 198 | 47 % | 0.43 | -168.57 | tp2 sl4 tr1.5 h96 sh (22 · 0.60 · -15.16) |
| Short | follow | r-nr-break@m15c | 13 | 0 (0 %) | 174 | 48 % | 0.47 | -175.35 | tp1.8 sl2.7 tr0 h64 sh (15 · 0.63 · -7.50) |
| Short | clamp | cci-40-200@m15c | 15 | 0 (0 %) | 228 | 42 % | 0.46 | -175.40 | tp2 sl4 tr1 h96 sh (15 · 0.50 · -6.55) |
| Short | clamp | break-squeeze-t25@m15 | 15 | 0 (0 %) | 115 | 37 % | 0.26 | -176.05 | tp2.2 sl3.3 tr1.1 h96 sh (8 · 0.28 · -8.66) |
| Short | revert | kelt-20-2@m15c | 4 | 0 (0 %) | 193 | 39 % | 0.45 | -179.30 | tp2 sl3 tr0 h64 sh (47 · 0.51 · -37.80) |
| Short | ribbon | trend-st-21-5@m15 | 19 | 1 (5 %) | 387 | 57 % | 0.68 | -195.17 | tp2.8 sl5.6 tr0 h96 sh (17 · 1.08 · 2.20) |
| Short | pivot | r-clv-thrust-m@m15 | 65 | 0 (0 %) | 65 | 0 % | 0.00 | -232.00 | – |
| Short | pivot | r-valuearea-m@m15 | 93 | 0 (0 %) | 93 | 0 % | 0.00 | -232.59 | – |
| Short | pulse | hma-55@m15 | 42 | 0 (0 %) | 84 | 0 % | 0.00 | -330.93 | – |
| Short | pulse | move-impulse-10-2@m15 | 30 | 0 (0 %) | 90 | 7 % | 0.04 | -334.03 | – |
| Short | revert | r-clv-thrust-m@m15c | 36 | 0 (0 %) | 174 | 22 % | 0.19 | -354.85 | tp2 sl3 tr1.5 h64 sh (5 · 0.27 · -7.02) |
| Short | clamp | break-squeeze-t10@m15 | 31 | 0 (0 %) | 217 | 29 % | 0.23 | -369.08 | tp2 sl2 tr1.5 h64 sh (7 · 0.33 · -7.40) |
| Short | clamp | break-squeeze@m15 | 34 | 0 (0 %) | 232 | 26 % | 0.16 | -517.81 | tp2 sl2 tr1.5 h64 sh (7 · 0.33 · -7.40) |
| General | sweep | r-vol-regime@m15 | 28 | 28 (100 %) | 56 | 93 % | 25.68 | 187.57 | – |
| General | sweep | r-ultimate@m15 | 13 | 13 (100 %) | 92 | 79 % | 4.03 | 181.82 | tp4.4 sl3.3 tr0 h64 gn (7 · 7.20 · 21.70) |
| General | sweep | willr-21-95@m15 | 7 | 7 (100 %) | 70 | 86 % | 5.23 | 167.53 | tp3.6 sl3.6 tr2.7 h64 gn (10 · 8.40 · 28.14) |
| General | sweep | willr-21-95@m15c | 18 | 18 (100 %) | 66 | 85 % | 9.51 | 140.65 | tp4 sl4 tr2 h64 gn (5 · 37.44 · 5.91) |
| General | sweep | willr-14-95@m15 | 13 | 13 (100 %) | 89 | 75 % | 2.89 | 138.76 | tp3.6 sl3.6 tr2.7 h64 gn (7 · 4.98 · 15.12) |
| General | ribbon | r-ultimate@m15 | 10 | 10 (100 %) | 249 | 64 % | 1.54 | 132.82 | tp3.6 sl3.6 tr0 h64 gn (23 · 1.85 · 23.00) |
| General | ribbon | willr-28-95@m15c | 16 | 16 (100 %) | 67 | 72 % | 4.00 | 105.91 | tp3.2 sl2.4 tr0 h64 gn (5 · 4.62 · 9.40) |
| General | sweep | willr-28-95@m15 | 3 | 3 (100 %) | 31 | 87 % | 7.33 | 91.17 | tp3.6 sl3.6 tr2.7 h64 gn (10 · 9.56 · 32.53) |
| General | revert | r-klinger@m15c | 19 | 15 (79 %) | 178 | 63 % | 1.41 | 90.61 | tp3.6 sl2.7 tr0 h64 gn (9 · 2.34 · 11.70) |
| General | pivot | willr-50-95@m15 | 5 | 5 (100 %) | 32 | 94 % | 187.79 | 83.63 | tp4 sl4 tr0 h64 gn (7 · ∞ (no loss) · 23.39) |
| General | revert | break-vol-2@m30 | 18 | 15 (83 %) | 250 | 55 % | 1.29 | 82.05 | tp3.6 sl2.7 tr0 h32 gn (15 · 1.64 · 10.03) |
| General | ribbon | willr-28-95@m15 | 6 | 6 (100 %) | 31 | 77 % | 4.47 | 43.82 | tp3.2 sl3.2 tr1.6 h64 gn (8 · 196.59 · 6.67) |
| General | sweep | willr-28-95@m30 | 7 | 6 (86 %) | 49 | 67 % | 1.96 | 43.55 | tp4.4 sl4.4 tr0 h32 gn (6 · 4.57 · 16.40) |
| General | revert | break-vol-2@m15c | 4 | 4 (100 %) | 46 | 57 % | 1.74 | 34.26 | tp3.6 sl2.7 tr0 h64 gn (13 · 1.74 · 9.53) |
| General | sweep | willr-7-90@m15c | 2 | 2 (100 %) | 17 | 76 % | 2.19 | 21.95 | tp4.4 sl4.4 tr2.2 h64 gn (9 · 2.33 · 12.25) |
| General | ribbon | trend-st@m15c | 2 | 2 (100 %) | 7 | 86 % | 88.48 | 19.36 | – |
| General | ribbon | r-valuearea-m@m15 | 12 | 7 (58 %) | 22 | 55 % | 1.69 | 16.94 | – |
| General | pivot | willr-28-95@m15c | 4 | 4 (100 %) | 18 | 78 % | 40.51 | 14.61 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 119.41 · 4.04) |
| General | ribbon | r-ultimate@m15c | 2 | 2 (100 %) | 9 | 78 % | 3.63 | 13.70 | tp3.2 sl2.4 tr0 h64 gn (5 · 3.81 · 7.30) |
| General | ribbon | trend-st-14-4@m15c | 1 | 1 (100 %) | 9 | 78 % | 2.49 | 11.31 | tp3.6 sl3.6 tr1.8 h64 gn (9 · 2.49 · 11.31) |
| General | sweep | willr-28-95@m15c | 2 | 2 (100 %) | 11 | 55 % | 2.71 | 9.50 | tp4 sl4 tr2 h64 gn (6 · 16.61 · 5.70) |
| General | clamp | r-cvd-div-m@m15c | 1 | 1 (100 %) | 6 | 83 % | 3.50 | 9.50 | tp3.6 sl3.6 tr1.8 h64 gn (6 · 3.50 · 9.50) |
| General | pivot | willr-28-95@m15 | 2 | 2 (100 %) | 10 | 80 % | 30.40 | 8.87 | tp3.6 sl3.6 tr1.8 h64 gn (5 · 30.40 · 4.43) |
| General | clamp | r-ultimate@m15 | 1 | 1 (100 %) | 10 | 50 % | 1.67 | 6.00 | tp3.2 sl1.6 tr0 h64 gn (10 · 1.67 · 6.00) |
| General | sweep | willr-50-95@m15c | 1 | 1 (100 %) | 9 | 56 % | 1.44 | 4.60 | tp3.2 sl2.4 tr0 h64 gn (9 · 1.44 · 4.60) |
| General | revert | r-tsi-m@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.33 | 3.04 | tp4.4 sl4.4 tr3.3 h96 gn (5 · 1.33 · 3.04) |
| General | ribbon | macd-cross-19-39-9@m30 | 2 | 2 (100 %) | 12 | 83 % | 1.38 | 2.93 | tp3.6 sl3.6 tr1.8 h32 gn (6 · 1.38 · 1.46) |
| General | ribbon | dir-thrust@m30 | 4 | 2 (50 %) | 46 | 50 % | 1.04 | 2.92 | tp4.4 sl4.4 tr3.3 h32 gn (11 · 1.39 · 5.73) |
| General | ribbon | dir-vwap@m15 | 2 | 0 (0 %) | 5 | 20 % | 0.31 | -6.60 | – |
| General | revert | r-clv-thrust-m@m15c | 1 | 0 (0 %) | 5 | 20 % | 0.26 | -7.72 | tp3.2 sl3.2 tr1.6 h64 gn (5 · 0.26 · -7.72) |
| General | ribbon | willr-7-90@m30 | 5 | 1 (20 %) | 23 | 61 % | 0.67 | -8.13 | tp4 sl4 tr2 h48 gn (5 · 0.57 · -1.81) |
| General | ribbon | ema-slope-20-10@m15 | 1 | 0 (0 %) | 6 | 33 % | 0.45 | -9.20 | tp4 sl4 tr0 h96 gn (6 · 0.45 · -9.20) |
| General | revert | r-fractal-m@m30 | 1 | 0 (0 %) | 38 | 53 % | 0.80 | -11.33 | tp3.2 sl3.2 tr2.4 h32 gn (38 · 0.80 · -11.33) |
| General | ribbon | move-swing@m15 | 2 | 0 (0 %) | 15 | 33 % | 0.56 | -13.20 | tp4 sl3 tr0 h96 gn (6 · 0.59 · -5.20) |
| General | revert | r-klinger-m@m15c | 6 | 2 (33 %) | 36 | 33 % | 0.73 | -15.23 | tp3.6 sl3.6 tr1.8 h64 gn (6 · 1.62 · 4.87) |
| General | magnet | rsi-div@m15 | 9 | 1 (11 %) | 26 | 38 % | 0.72 | -15.51 | – |
| General | ribbon | trend-st-28-6@m15 | 1 | 0 (0 %) | 23 | 48 % | 0.60 | -16.72 | tp4 sl4 tr2 h96 gn (23 · 0.60 · -16.72) |
| General | revert | break-vol@m15c | 2 | 0 (0 %) | 34 | 32 % | 0.59 | -23.83 | tp3.2 sl2.4 tr0 h96 gn (17 · 0.63 · -10.60) |
| General | clamp | break-squeeze-120@m15 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -24.40 | – |
| General | ribbon | ema-slope@m15 | 11 | 3 (27 %) | 67 | 48 % | 0.77 | -26.19 | tp3.2 sl3.2 tr1.6 h64 gn (7 · 1.39 · 2.63) |
| General | pivot | r-clv-thrust-m@m15 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -27.40 | – |
| General | clamp | break-squeeze-t25@m15 | 2 | 0 (0 %) | 14 | 14 % | 0.02 | -36.22 | tp4 sl4 tr2 h64 gn (7 · 0.02 · -18.11) |
| General | revert | r-awesome-m@m15c | 11 | 0 (0 %) | 39 | 33 % | 0.45 | -41.09 | – |
| General | ribbon | ema-slope@m15c | 17 | 4 (24 %) | 103 | 48 % | 0.74 | -47.31 | tp3.2 sl3.2 tr1.6 h64 gn (7 · 1.39 · 2.63) |
| General | revert | break-vol@m30 | 4 | 0 (0 %) | 65 | 34 % | 0.57 | -51.83 | tp3.2 sl2.4 tr0 h48 gn (17 · 0.63 · -10.60) |
| General | revert | cmf-20-0.1@m15c | 2 | 0 (0 %) | 106 | 49 % | 0.71 | -54.59 | tp3.6 sl3.6 tr2.7 h64 gn (54 · 0.75 · -22.47) |
| General | pulse | move-impulse-10-2@m15 | 5 | 0 (0 %) | 15 | 0 % | 0.00 | -54.60 | – |
| General | magnet | r-sweep@m15 | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -57.30 | – |
| General | magnet | bb-wick@m30 | 25 | 0 (0 %) | 75 | 33 % | 0.58 | -63.40 | – |
| General | pulse | hma-55@m15 | 8 | 0 (0 %) | 16 | 0 % | 0.00 | -64.80 | – |
| General | ribbon | trend-st-21-5@m15 | 7 | 0 (0 %) | 134 | 49 % | 0.68 | -65.79 | tp4 sl3 tr0 h64 gn (16 · 0.92 · -2.20) |
| General | clamp | break-squeeze@m15 | 5 | 0 (0 %) | 34 | 15 % | 0.02 | -104.07 | tp4.4 sl4.4 tr2.2 h64 gn (6 · 0.01 · -19.78) |
| General | pivot | r-valuearea-m@m15 | 33 | 0 (0 %) | 33 | 0 % | 0.00 | -107.00 | – |
| General | follow | r-nr-break@m15c | 8 | 0 (0 %) | 87 | 16 % | 0.20 | -197.63 | tp3.2 sl2.4 tr0 h96 gn (12 · 0.23 · -20.00) |
| Long | revert | r-klinger@m15c | 36 | 32 (89 %) | 250 | 64 % | 1.65 | 295.09 | tp6.4 sl3.2 tr0 h64 lg (8 · 3.04 · 20.80) |
| Long | pivot | willr-50-95@m15 | 18 | 18 (100 %) | 76 | 93 % | 303.16 | 291.21 | tp6.4 sl4.8 tr0 h96 lg (5 · ∞ (no loss) · 31.00) |
| Long | sweep | r-ultimate@m15 | 19 | 15 (79 %) | 110 | 81 % | 3.36 | 247.54 | tp6.4 sl4.8 tr0 h96 lg (6 · 6.20 · 26.00) |
| Long | ribbon | willr-28-95@m15c | 20 | 20 (100 %) | 49 | 98 % | 6911.46 | 242.72 | – |
| Long | ribbon | willr-28-95@m15 | 11 | 11 (100 %) | 36 | 100 % | ∞ (no loss) | 188.33 | – |
| Long | magnet | rsi-div@m15 | 23 | 17 (74 %) | 59 | 63 % | 3.65 | 158.94 | – |
| Long | sweep | willr-21-95@m15 | 6 | 6 (100 %) | 55 | 87 % | 5.60 | 147.89 | tp4.8 sl4.8 tr2.4 h64 lg (10 · 6.89 · 29.46) |
| Long | ribbon | willr-7-90@m30 | 21 | 15 (71 %) | 76 | 72 % | 2.49 | 138.03 | tp6.4 sl6.4 tr0 h32 lg (5 · ∞ (no loss) · 20.47) |
| Long | sweep | willr-28-95@m30 | 14 | 14 (100 %) | 60 | 75 % | 2.44 | 115.30 | tp6.4 sl4.8 tr0 h32 lg (5 · 4.96 · 19.80) |
| Long | sweep | willr-21-95@m15c | 11 | 11 (100 %) | 33 | 100 % | ∞ (no loss) | 108.71 | – |
| Long | ribbon | willr-50-95@m15 | 5 | 5 (100 %) | 26 | 85 % | 232.32 | 105.99 | tp6.4 sl6.4 tr0 h96 lg (7 · ∞ (no loss) · 43.40) |
| Long | ribbon | move-swing@m15 | 10 | 9 (90 %) | 79 | 59 % | 2.61 | 92.41 | tp5.2 sl5.2 tr3.9 h64 lg (8 · 3.67 · 12.61) |
| Long | sweep | willr-14-95@m15 | 8 | 8 (100 %) | 48 | 75 % | 2.45 | 80.37 | tp4.8 sl4.8 tr2.4 h64 lg (7 · 4.18 · 15.88) |
| Long | ribbon | r-valuearea-m@m15 | 24 | 23 (96 %) | 41 | 59 % | 5.20 | 78.44 | – |
| Long | sweep | willr-50-95@m15c | 4 | 4 (100 %) | 15 | 100 % | ∞ (no loss) | 70.35 | – |
| Long | sweep | r-vol-regime@m15 | 43 | 31 (72 %) | 78 | 65 % | 1.54 | 64.27 | – |
| Long | revert | break-vol@m15 | 3 | 3 (100 %) | 40 | 63 % | 1.56 | 52.00 | tp6.4 sl6.4 tr0 h96 lg (14 · 1.69 · 22.80) |
| Long | ribbon | willr-21-95@m15 | 4 | 4 (100 %) | 11 | 100 % | ∞ (no loss) | 49.76 | – |
| Long | revert | r-qh-flow-m@m15c | 1 | 1 (100 %) | 26 | 62 % | 1.72 | 28.36 | tp5.2 sl5.2 tr0 h64 lg (26 · 1.72 · 28.36) |
| Long | revert | cmf-20-0.1@m15c | 3 | 3 (100 %) | 102 | 62 % | 1.16 | 27.74 | tp5.2 sl5.2 tr2.6 h64 lg (45 · 1.32 · 18.73) |
| Long | revert | break-vol-2@m30 | 1 | 1 (100 %) | 11 | 55 % | 2.16 | 17.40 | tp5.6 sl2.8 tr0 h48 lg (11 · 2.16 · 17.40) |
| Long | sweep | mfi-14-20@m15 | 1 | 1 (100 %) | 7 | 71 % | 3.05 | 16.80 | tp5.2 sl3.9 tr0 h96 lg (7 · 3.05 · 16.80) |
| Long | revert | r-awesome-m@m15c | 16 | 8 (50 %) | 14 | 64 % | 1.81 | 15.28 | – |
| Long | sweep | willr-50-95@m15 | 1 | 1 (100 %) | 7 | 86 % | 3.54 | 11.59 | tp5.6 sl5.6 tr2.8 h64 lg (7 · 3.54 · 11.59) |
| Long | sweep | macd-cross@m15c | 2 | 2 (100 %) | 8 | 63 % | 1.55 | 6.43 | – |
| Long | ribbon | ema-50-100@m15c | 1 | 1 (100 %) | 19 | 53 % | 1.04 | 2.60 | tp6.4 sl6.4 tr0 h96 lg (19 · 1.04 · 2.60) |
| Long | revert | r-chop-m@m30 | 2 | 1 (50 %) | 14 | 43 % | 1.07 | 1.97 | tp4.8 sl4.8 tr3.6 h48 lg (6 · 1.51 · 5.12) |
| Long | follow | r-valuearea@m15c | 4 | 1 (25 %) | 8 | 50 % | 0.98 | -0.40 | – |
| Long | magnet | r-pin-m@m15 | 5 | 4 (80 %) | 5 | 80 % | 0.52 | -2.59 | – |
| Long | sweep | r-bb-adx-m@m30 | 8 | 6 (75 %) | 7 | 86 % | 0.18 | -3.62 | – |
| Long | magnet | r-cvd-div-m@m15 | 2 | 1 (50 %) | 16 | 50 % | 0.86 | -4.80 | tp6.4 sl3.2 tr0 h64 lg (8 · 1.06 · 0.80) |
| Long | ribbon | willr-14-90@m30 | 8 | 3 (38 %) | 26 | 69 % | 0.90 | -4.96 | tp6 sl6 tr3 h32 lg (5 · 0.53 · -5.88) |
| Long | magnet | dir-macd@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.46 | -12.00 | – |
| Long | magnet | srsi-14-20@m30 | 1 | 0 (0 %) | 5 | 0 % | 0.00 | -12.95 | tp5.2 sl2.6 tr0 h32 lg (5 · 0.00 · -12.95) |
| Long | ribbon | trix-15@m15c | 1 | 0 (0 %) | 12 | 25 % | 0.50 | -14.60 | tp6.4 sl3.2 tr0 h64 lg (12 · 0.50 · -14.60) |
| Long | ribbon | trend-ema-50-200@m15c | 1 | 0 (0 %) | 10 | 40 % | 0.63 | -14.80 | tp6.4 sl6.4 tr0 h96 lg (10 · 0.63 · -14.80) |
| Long | ribbon | trix-15@m15 | 1 | 0 (0 %) | 13 | 23 % | 0.55 | -15.40 | tp6.4 sl3.2 tr0 h96 lg (13 · 0.55 · -15.40) |
| Long | pivot | break-squeeze-30@m15 | 2 | 0 (0 %) | 8 | 25 % | 0.37 | -17.55 | – |
| Long | pivot | macd-hist-19-39-9@m15c | 1 | 0 (0 %) | 9 | 22 % | 0.35 | -22.60 | tp6.4 sl4.8 tr0 h96 lg (9 · 0.35 · -22.60) |
| Long | ribbon | ema-slope@m15c | 2 | 0 (0 %) | 11 | 27 % | 0.22 | -25.03 | tp4.8 sl4.8 tr2.4 h96 lg (6 · 0.46 · -8.03) |
| Long | magnet | kelt-20-2.5@m15 | 5 | 0 (0 %) | 10 | 20 % | 0.00 | -29.30 | – |
| Long | ribbon | dir-vwap-240@m15c | 3 | 0 (0 %) | 40 | 45 % | 0.70 | -38.52 | tp6.4 sl6.4 tr0 h96 lg (13 · 0.81 · -9.00) |
| Long | ribbon | break-retest@m15 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -43.70 | – |
| Long | follow | r-nr-break@m15c | 2 | 0 (0 %) | 22 | 18 % | 0.27 | -50.00 | tp4.8 sl3.6 tr0 h64 lg (11 · 0.27 · -25.00) |
| Long | ribbon | trend-st-28-6@m15 | 2 | 0 (0 %) | 22 | 32 % | 0.44 | -54.00 | tp6 sl6 tr0 h96 lg (12 · 0.47 · -26.40) |
| Long | magnet | bb-wick@m30 | 26 | 0 (0 %) | 78 | 33 % | 0.61 | -85.14 | – |
| Long | pivot | r-sweep@m15 | 19 | 0 (0 %) | 19 | 0 % | 0.00 | -93.88 | – |
| Long | clamp | break-squeeze-t25@m15 | 7 | 0 (0 %) | 33 | 0 % | 0.00 | -134.74 | tp6 sl3 tr0 h96 lg (5 · 0.00 · -16.00) |
| Long | ribbon | trend-st-21-5@m15 | 8 | 0 (0 %) | 91 | 29 % | 0.41 | -167.03 | tp5.6 sl4.2 tr0 h64 lg (13 · 0.79 · -7.26) |
| Long | magnet | r-sweep@m15 | 38 | 0 (0 %) | 35 | 0 % | 0.00 | -186.02 | – |
| Long | pivot | r-valuearea-m@m15 | 42 | 0 (0 %) | 42 | 0 % | 0.00 | -206.40 | – |
| Wide | pulse | mc-rsrev-6@m5c | 12 | 12 (100 %) | 36 | 67 % | 18.79 | 161.51 | – |
| Wide | magnet | r-pin-m@m15 | 15 | 15 (100 %) | 15 | 100 % | ∞ (no loss) | 25.17 | – |
| Wide | pulse | mc-rsrev-12@m5c | 2 | 2 (100 %) | 12 | 33 % | 4.74 | 20.94 | tp0.76 sl0.68 tr0 h96 axd-geo2 axis (6 · 4.74 · 10.47) |
| Wide | magnet | ema-slope-20-10@m30 | 6 | 6 (100 %) | 24 | 63 % | 5.45 | 19.54 | – |
| Wide | magnet | trix-9@m30 | 6 | 6 (100 %) | 24 | 63 % | 5.45 | 19.54 | – |
| Wide | sweep | willr-28-95@m5c | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 17.76 | – |
| Wide | magnet | r-sweep@m5 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 15.28 | – |
| Wide | sweep | r-pin-m@m30 | 12 | 12 (100 %) | 24 | 88 % | 28.50 | 13.26 | – |
| Wide | revert | break-retest@m5c | 3 | 3 (100 %) | 30 | 60 % | 1.21 | 3.66 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (10 · 1.21 · 1.22) |
| Wide | sandwich | mc-rsit2-30@m15 | 6 | 3 (50 %) | 6 | 50 % | 0.46 | -1.47 | – |
| Wide | sweep | mfi-14-20@m15 | 2 | 0 (0 %) | 30 | 33 % | 0.64 | -6.66 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (15 · 0.64 · -3.33) |
| Wide | sweep | break-vol@x4@m15 | 3 | 0 (0 %) | 6 | 0 % | 0.00 | -7.04 | – |
| Wide | sweep | r-pin@m15 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -8.89 | – |
| Wide | pulse | bb-wick@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.11 | -9.74 | – |
| Wide | pivot | r-clv-thrust-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -11.59 | – |
| Wide | clamp | mc-lag-12@m15 | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -12.60 | – |
| Wide | ribbon | dir-thrust-4@m5 | 3 | 0 (0 %) | 42 | 36 % | 0.53 | -15.57 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (14 · 0.53 · -5.19) |
| Wide | sweep | willr-50-95@m5c | 12 | 0 (0 %) | 63 | 19 % | 0.31 | -23.98 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (9 · 0.64 · -1.54) |
| Wide | sandwich | bb-bounce-50-2@m1c | 12 | 1 (8 %) | 216 | 36 % | 0.66 | -29.46 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (18 · 1.28 · 2.17) |
| Wide | sandwich | z-50-2@m1c | 12 | 1 (8 %) | 216 | 36 % | 0.66 | -29.46 | tp0.64 sl0.54 tr0 h480 axd-volume4 axis (18 · 1.28 · 2.17) |
| Wide | snap | bb-bounce-50-2@m1c | 12 | 0 (0 %) | 204 | 37 % | 0.59 | -35.02 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (17 · 0.80 · -1.55) |
| Wide | snap | z-50-2@m1c | 12 | 0 (0 %) | 204 | 37 % | 0.59 | -35.02 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (17 · 0.80 · -1.55) |
| Wide | clamp | r-vwap-reclaim@m1 | 9 | 0 (0 %) | 72 | 13 % | 0.14 | -96.33 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (8 · 0.36 · -4.93) |
| Signals | follow | sig-obv-m@m15 | 20 | 20 (100 %) | 553 | 85 % | 3.15 | 940.59 | tp4 sl12 tr1.6 h192 (46 · 72.88 · 78.20) |
| Signals | follow | sig-obv-s@m15 | 20 | 20 (100 %) | 633 | 85 % | 2.32 | 803.15 | tp5 sl15 tr3 h192 (26 · 1546.20 · 72.29) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 20 | 20 (100 %) | 332 | 85 % | 4.19 | 668.01 | tp4 sl12 tr1.6 h192 (31 · 5.16 · 52.00) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 20 | 20 (100 %) | 422 | 84 % | 2.83 | 615.58 | tp4 sl12 tr3.2 h192 (19 · 5.04 · 49.28) |
| Signals | follow | sig-s2-confluence-m@m15 | 20 | 20 (100 %) | 561 | 82 % | 1.96 | 596.25 | tp6 sl18 tr2.4 h192 (30 · 246.94 · 72.02) |
| Signals | follow | sig-bollinger-s@m15 | 20 | 15 (75 %) | 470 | 79 % | 1.88 | 596.03 | tp6 sl18 tr3.6 h192 (20 · 4.22 · 58.56) |
| Signals | follow | sig-zscore-s@m15 | 20 | 15 (75 %) | 470 | 79 % | 1.88 | 596.03 | tp6 sl18 tr3.6 h192 (20 · 4.22 · 58.56) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 20 | 20 (100 %) | 482 | 82 % | 2.01 | 591.59 | tp6 sl18 tr0 h192 (10 · ∞ (no loss) · 58.00) |
| Signals | follow | sig-williams-r-s@m15 | 20 | 16 (80 %) | 462 | 78 % | 1.95 | 547.48 | tp6 sl18 tr0 h192 (13 · ∞ (no loss) · 75.40) |
| Signals | follow | sig-hma-m@m15 | 20 | 19 (95 %) | 386 | 84 % | 2.75 | 544.17 | tp6 sl18 tr2.4 h192 (21 · 121.64 · 54.30) |
| Signals | follow | sig-williams-r-m@m15 | 20 | 17 (85 %) | 507 | 80 % | 1.76 | 544.06 | tp5 sl15 tr2 h192 (28 · 4.12 · 52.79) |
| Signals | follow | sig-stoch-rsi-m@m15 | 20 | 16 (80 %) | 663 | 78 % | 1.60 | 533.37 | tp6 sl18 tr2.4 h192 (33 · 28.31 · 64.88) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 20 | 18 (90 %) | 360 | 82 % | 2.44 | 527.14 | tp5 sl15 tr3 h192 (15 · 206.16 · 53.79) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 20 | 20 (100 %) | 205 | 89 % | 12.25 | 503.49 | tp6 sl18 tr3.6 h192 (7 · ∞ (no loss) · 35.46) |
| Signals | follow | sig-s2-confluence-s@m15 | 20 | 16 (80 %) | 575 | 78 % | 1.60 | 430.80 | tp5 sl15 tr2 h192 (41 · 19.90 · 58.66) |
| Signals | follow | sig-mfi-m@m15 | 20 | 20 (100 %) | 216 | 88 % | 3.61 | 424.40 | tp6 sl18 tr3.6 h192 (8 · 326.24 · 37.08) |
| Signals | follow | sig-impulse-m@m15 | 20 | 18 (90 %) | 335 | 82 % | 1.98 | 412.43 | tp4 sl12 tr1.6 h192 (30 · 43.77 · 63.02) |
| Signals | follow | sig-thrust-m@m15 | 20 | 19 (95 %) | 699 | 80 % | 1.40 | 406.06 | tp6 sl18 tr2.4 h192 (31 · 3.32 · 42.19) |
| Signals | follow | sig-bollinger-m@m15 | 20 | 19 (95 %) | 304 | 84 % | 1.95 | 392.65 | tp5 sl15 tr3 h192 (13 · 3.00 · 30.38) |
| Signals | follow | sig-cci-m@m15 | 20 | 17 (85 %) | 348 | 80 % | 1.70 | 380.89 | tp6 sl18 tr3.6 h192 (14 · 3.23 · 40.53) |
| Signals | follow | sig-macd-hist-m@m15 | 20 | 17 (85 %) | 713 | 80 % | 1.36 | 377.91 | tp8 sl24 tr3.2 h192 (23 · 2.75 · 42.46) |
| Signals | follow | sig-ema-slope-m@m15 | 20 | 20 (100 %) | 160 | 91 % | 8.01 | 373.34 | tp6 sl18 tr2.4 h192 (8 · ∞ (no loss) · 29.36) |
| Signals | follow | sig-r-linreg-s@m15 | 20 | 15 (75 %) | 507 | 79 % | 1.50 | 367.89 | tp5 sl15 tr4 h192 (18 · 4.26 · 51.84) |
| Signals | follow | sig-trix-s@m15 | 20 | 16 (80 %) | 342 | 82 % | 1.87 | 359.03 | tp6 sl18 tr2.4 h192 (20 · 548.84 · 49.82) |
| Signals | follow | sig-vwap-s@m15 | 20 | 17 (85 %) | 478 | 80 % | 1.52 | 344.70 | tp5 sl15 tr2 h192 (32 · 40.00 · 58.54) |
| Signals | follow | sig-supertrend-m@m15 | 20 | 19 (95 %) | 210 | 86 % | 2.52 | 330.21 | tp4 sl12 tr0 h192 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 20 | 20 (100 %) | 115 | 97 % | 672.42 | 329.82 | tp6 sl18 tr3.6 h192 (6 · ∞ (no loss) · 26.50) |
| Signals | follow | sig-vwap-m@m15 | 20 | 20 (100 %) | 188 | 85 % | 3.31 | 321.64 | tp6 sl18 tr2.4 h192 (10 · 161.35 · 31.23) |
| Signals | follow | sig-adx-s@m15 | 20 | 16 (80 %) | 311 | 82 % | 1.78 | 317.19 | tp5 sl15 tr2 h192 (19 · 200.97 · 41.43) |
| Signals | follow | sig-heikin-ashi-s@m15 | 20 | 11 (55 %) | 774 | 77 % | 1.24 | 292.98 | tp5 sl15 tr3 h192 (27 · 4.41 · 51.82) |
| Signals | follow | sig-heikin-ashi-m@m15 | 20 | 14 (70 %) | 573 | 79 % | 1.29 | 266.67 | tp5 sl15 tr3 h192 (26 · 4.16 · 48.05) |
| Signals | follow | sig-macd-cross-s@m15 | 20 | 18 (90 %) | 510 | 79 % | 1.30 | 260.39 | tp5 sl15 tr4 h192 (14 · 3.51 · 38.24) |
| Signals | follow | sig-macd-hist-s@m15 | 20 | 18 (90 %) | 510 | 79 % | 1.30 | 260.39 | tp5 sl15 tr4 h192 (14 · 3.51 · 38.24) |
| Signals | follow | sig-cci-s@m15 | 20 | 15 (75 %) | 636 | 75 % | 1.23 | 258.06 | tp6 sl18 tr2.4 h192 (32 · 3.15 · 54.02) |
| Signals | follow | sig-donchian-s@m15 | 20 | 16 (80 %) | 388 | 80 % | 1.46 | 251.36 | tp6 sl18 tr3.6 h192 (12 · ∞ (no loss) · 38.96) |
| Signals | follow | sig-reclaim-m@m15 | 20 | 13 (65 %) | 481 | 74 % | 1.30 | 248.62 | tp5 sl15 tr4 h192 (17 · 4.07 · 47.27) |
| Signals | follow | sig-act-burst-m@m15 | 20 | 18 (90 %) | 264 | 83 % | 1.78 | 246.07 | tp5 sl15 tr2 h192 (14 · ∞ (no loss) · 22.56) |
| Signals | follow | sig-rsi-reversal-m@m15 | 20 | 20 (100 %) | 76 | 99 % | 934.67 | 238.46 | tp3 sl9 tr1.8 h192 (5 · ∞ (no loss) · 11.41) |
| Signals | follow | sig-s2-st-trail-s@m15 | 20 | 16 (80 %) | 154 | 81 % | 2.62 | 223.21 | tp4 sl12 tr2.4 h192 (9 · ∞ (no loss) · 28.00) |
| Signals | follow | sig-volume-break-m@m15 | 20 | 19 (95 %) | 73 | 95 % | 10.64 | 221.98 | tp3 sl9 tr1.8 h192 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-reclaim-s@m15 | 20 | 14 (70 %) | 617 | 79 % | 1.20 | 216.42 | tp5 sl15 tr3 h192 (26 · 2.45 · 44.18) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 20 | 14 (70 %) | 503 | 78 % | 1.24 | 208.35 | tp6 sl18 tr2.4 h192 (26 · 3.03 · 40.12) |
| Signals | follow | sig-kama-m@m15 | 20 | 12 (60 %) | 589 | 78 % | 1.19 | 196.90 | tp5 sl15 tr3 h192 (26 · 2.59 · 48.33) |
| Signals | follow | sig-st-slow-s@m15 | 20 | 15 (75 %) | 201 | 81 % | 1.70 | 189.79 | tp5 sl15 tr2 h192 (13 · 225.62 · 29.84) |
| Signals | follow | sig-s2-range-break-s@m15 | 18 | 17 (94 %) | 98 | 88 % | 4.24 | 177.44 | tp5 sl15 tr2 h192 (7 · ∞ (no loss) · 20.64) |
| Signals | follow | sig-adx-m@m15 | 20 | 13 (65 %) | 201 | 78 % | 1.57 | 177.41 | tp5 sl15 tr3 h192 (7 · ∞ (no loss) · 33.60) |
| Signals | follow | sig-rsi-mid-s@m15 | 20 | 14 (70 %) | 485 | 79 % | 1.19 | 172.98 | tp6 sl18 tr2.4 h192 (24 · 3.16 · 39.70) |
| Signals | follow | sig-impulse-s@m15 | 20 | 14 (70 %) | 510 | 77 % | 1.20 | 170.97 | tp8 sl24 tr4.8 h192 (9 · ∞ (no loss) · 42.66) |
| Signals | follow | sig-zscore-m@m15 | 20 | 17 (85 %) | 191 | 82 % | 1.56 | 168.16 | tp3 sl9 tr1.8 h192 (16 · 3.12 · 20.02) |
| Signals | follow | sig-act-burst-s@m15 | 20 | 13 (65 %) | 512 | 79 % | 1.17 | 158.46 | tp6 sl18 tr2.4 h192 (26 · 3.17 · 39.67) |
| Signals | follow | sig-macd-slow-s@m15 | 20 | 14 (70 %) | 499 | 78 % | 1.17 | 154.89 | tp5 sl15 tr4 h192 (15 · 3.58 · 39.16) |
| Signals | follow | sig-s2-st-trail-m@m15 | 20 | 15 (75 %) | 180 | 81 % | 1.52 | 136.72 | tp4 sl12 tr0 h192 (7 · ∞ (no loss) · 26.60) |
| Signals | follow | sig-ema-cross-s@m15 | 20 | 15 (75 %) | 284 | 78 % | 1.26 | 131.39 | tp6 sl18 tr2.4 h192 (17 · 2.15 · 22.26) |
| Signals | follow | sig-stoch-rsi-s@m15 | 20 | 11 (55 %) | 649 | 76 % | 1.11 | 122.97 | tp6 sl18 tr2.4 h192 (35 · 2.97 · 49.08) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 20 | 13 (65 %) | 455 | 79 % | 1.16 | 122.67 | tp6 sl18 tr2.4 h192 (25 · 3.13 · 38.81) |
| Signals | follow | sig-supertrend-s@m15 | 20 | 13 (65 %) | 346 | 79 % | 1.16 | 103.00 | tp6 sl18 tr2.4 h192 (19 · 2.53 · 27.91) |
| Signals | follow | sig-kama-s@m15 | 20 | 10 (50 %) | 540 | 76 % | 1.10 | 98.31 | tp5 sl15 tr3 h192 (26 · 3.49 · 42.91) |
| Signals | follow | sig-mfi-s@m15 | 20 | 18 (90 %) | 20 | 90 % | 281.93 | 81.45 | – |
| Signals | follow | sig-squeeze-m@m15 | 20 | 16 (80 %) | 52 | 83 % | 2.58 | 81.13 | – |
| Signals | follow | sig-r-nr-break-s@m15 | 20 | 10 (50 %) | 409 | 76 % | 1.12 | 80.07 | tp8 sl24 tr6.4 h192 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-st-slow-m@m15 | 20 | 13 (65 %) | 108 | 73 % | 1.42 | 77.32 | tp5 sl15 tr3 h192 (5 · ∞ (no loss) · 19.41) |
| Signals | follow | sig-ema-slope-s@m15 | 20 | 11 (55 %) | 333 | 78 % | 1.11 | 73.83 | tp6 sl18 tr2.4 h192 (17 · 2.93 · 35.13) |
| Signals | follow | sig-act-hf-s@m15 | 20 | 13 (65 %) | 555 | 77 % | 1.06 | 61.79 | tp6 sl18 tr0 h192 (9 · ∞ (no loss) · 52.20) |
| Signals | follow | sig-r-vol-regime-s@m15 | 20 | 15 (75 %) | 176 | 79 % | 1.16 | 57.48 | tp5 sl15 tr3 h192 (9 · 1.97 · 14.72) |
| Signals | follow | sig-macd-cross-m@m15 | 20 | 8 (40 %) | 434 | 78 % | 1.06 | 44.48 | tp5 sl15 tr2 h192 (28 · 2.26 · 20.95) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 20 | 11 (55 %) | 243 | 76 % | 1.08 | 43.97 | tp6 sl18 tr2.4 h192 (11 · 1.73 · 14.13) |
| Signals | follow | sig-rsi-momentum-s@m15 | 15 | 14 (93 %) | 15 | 93 % | 100.27 | 32.75 | – |
| Signals | follow | sig-s2-vol-break-m@m15 | 20 | 10 (50 %) | 141 | 71 % | 1.09 | 28.22 | tp8 sl24 tr3.2 h192 (6 · 4.51 · 14.83) |
| Signals | follow | sig-rsi-reversal-s@m15 | 20 | 10 (50 %) | 176 | 75 % | 1.07 | 27.74 | tp6 sl18 tr2.4 h192 (9 · 64.89 · 19.39) |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 8 | 8 (100 %) | 12 | 100 % | ∞ (no loss) | 21.88 | – |
| Signals | follow | sig-keltner-s@m15 | 20 | 8 (40 %) | 272 | 76 % | 1.04 | 20.07 | tp4 sl12 tr1.6 h192 (24 · 3.14 · 26.77) |
| Signals | follow | sig-ichimoku-s@m15 | 20 | 11 (55 %) | 444 | 77 % | 1.02 | 18.74 | tp3 sl9 tr1.2 h192 (44 · 1.71 · 17.59) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 17.34 | – |
| Signals | follow | sig-volume-break-s@m15 | 16 | 10 (63 %) | 44 | 82 % | 1.28 | 16.98 | tp3 sl9 tr1.2 h192 (7 · 0.73 · -2.52) |
| Signals | follow | sig-hma-s@m15 | 20 | 12 (60 %) | 554 | 77 % | 1.00 | 1.40 | tp6 sl18 tr3.6 h192 (17 · 2.73 · 31.53) |
| Signals | follow | sig-thrust-s@m15 | 20 | 11 (55 %) | 383 | 75 % | 1.00 | -0.94 | tp5 sl15 tr3 h192 (17 · 2.72 · 26.38) |
| Signals | follow | sig-s2-vol-break-s@m15 | 20 | 8 (40 %) | 140 | 74 % | 0.98 | -7.16 | tp8 sl24 tr3.2 h192 (5 · ∞ (no loss) · 18.90) |
| Signals | follow | sig-ema-trend-s@m15 | 20 | 10 (50 %) | 467 | 73 % | 0.99 | -8.63 | tp8 sl24 tr3.2 h192 (16 · 2.20 · 34.05) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 20 | 11 (55 %) | 327 | 73 % | 0.99 | -8.74 | tp6 sl18 tr3.6 h192 (11 · 108.42 · 36.45) |
| Signals | follow | sig-r-vol-regime-m@m15 | 18 | 10 (56 %) | 49 | 73 % | 0.88 | -11.96 | – |
| Signals | follow | sig-ema-pullback-s@m15 | 20 | 9 (45 %) | 590 | 76 % | 0.99 | -16.73 | tp6 sl18 tr2.4 h192 (31 · 3.50 · 47.29) |
| Signals | follow | sig-macd-slow-m@m15 | 20 | 8 (40 %) | 370 | 78 % | 0.98 | -17.89 | tp8 sl24 tr3.2 h192 (12 · ∞ (no loss) · 34.89) |
| Signals | follow | sig-atr-break-s@m15 | 20 | 9 (45 %) | 524 | 75 % | 0.97 | -29.11 | tp5 sl15 tr3 h192 (25 · 2.02 · 31.30) |
| Signals | follow | sig-ema-trend-m@m15 | 20 | 8 (40 %) | 379 | 74 % | 0.95 | -43.76 | tp4 sl12 tr1.6 h192 (25 · 124.20 · 44.32) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 18 | 5 (28 %) | 53 | 68 % | 0.69 | -46.95 | tp3 sl9 tr1.2 h192 (6 · 0.91 · -0.57) |
| Signals | follow | sig-r-connors-s@m15 | 15 | 6 (40 %) | 97 | 73 % | 0.72 | -49.26 | tp5 sl15 tr2 h192 (6 · ∞ (no loss) · 7.64) |
| Signals | follow | sig-r-session-trend-s@m15 | 20 | 9 (45 %) | 177 | 70 % | 0.88 | -51.35 | tp8 sl24 tr3.2 h192 (5 · ∞ (no loss) · 26.60) |
| Signals | follow | sig-r-nr-break-m@m15 | 20 | 9 (45 %) | 429 | 73 % | 0.93 | -57.81 | tp4 sl12 tr0 h192 (17 · 2.34 · 32.60) |
| Signals | follow | sig-r-inside-s@m15 | 18 | 9 (50 %) | 72 | 72 % | 0.63 | -59.88 | tp5 sl15 tr2 h192 (5 · ∞ (no loss) · 7.32) |
| Signals | follow | sig-donchian-m@m15 | 20 | 11 (55 %) | 245 | 76 % | 0.88 | -62.96 | tp3 sl9 tr1.8 h192 (22 · 1.88 · 17.05) |
| Signals | follow | sig-keltner-m@m15 | 20 | 8 (40 %) | 202 | 76 % | 0.85 | -70.41 | tp3 sl9 tr1.2 h192 (22 · 2.82 · 18.33) |
| Signals | follow | sig-swing-s@m15 | 20 | 13 (65 %) | 521 | 74 % | 0.93 | -80.62 | tp6 sl18 tr2.4 h192 (25 · 3.26 · 41.22) |
| Signals | follow | sig-r-awesome-m@m15 | 20 | 8 (40 %) | 318 | 72 % | 0.88 | -85.83 | tp8 sl24 tr4.8 h192 (6 · ∞ (no loss) · 25.26) |
| Signals | follow | sig-act-hf-m@m15 | 20 | 10 (50 %) | 401 | 74 % | 0.90 | -87.41 | tp5 sl15 tr4 h192 (13 · 2.60 · 24.31) |
| Signals | follow | sig-ema-pullback-m@m15 | 20 | 9 (45 %) | 339 | 70 % | 0.84 | -110.71 | tp5 sl15 tr2 h192 (21 · 2.20 · 18.97) |
| Signals | follow | sig-s2-range-break-m@m15 | 16 | 8 (50 %) | 88 | 61 % | 0.47 | -126.42 | tp5 sl15 tr2 h192 (7 · ∞ (no loss) · 15.58) |
| Signals | follow | sig-squeeze-s@m15 | 20 | 5 (25 %) | 157 | 69 % | 0.71 | -133.55 | tp8 sl24 tr3.2 h192 (5 · ∞ (no loss) · 17.35) |
| Signals | follow | sig-r-inside-m@m15 | 9 | 0 (0 %) | 14 | 0 % | 0.00 | -137.80 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 20 | 7 (35 %) | 558 | 75 % | 0.88 | -149.83 | tp5 sl15 tr2 h192 (35 · 3.80 · 43.88) |
| Signals | follow | sig-r-session-trend-m@m15 | 20 | 8 (40 %) | 176 | 64 % | 0.62 | -200.23 | tp6 sl18 tr3.6 h192 (5 · ∞ (no loss) · 14.54) |
| Signals | follow | sig-trix-m@m15 | 20 | 4 (20 %) | 129 | 69 % | 0.55 | -219.35 | tp3 sl9 tr1.8 h192 (10 · 1.65 · 6.11) |
| Signals | follow | sig-r-linreg-m@m15 | 20 | 5 (25 %) | 414 | 70 % | 0.77 | -220.83 | tp6 sl18 tr2.4 h192 (24 · 10.98 · 42.48) |
| Signals | follow | sig-r-awesome-s@m15 | 20 | 9 (45 %) | 281 | 69 % | 0.67 | -247.70 | tp6 sl18 tr3.6 h192 (7 · ∞ (no loss) · 20.77) |
| Signals | follow | sig-s2-active-hf-m@m15 | 20 | 4 (20 %) | 550 | 74 % | 0.81 | -248.07 | tp5 sl15 tr2 h192 (34 · 1.93 · 28.49) |
| Signals | follow | sig-sar-s@m15 | 20 | 7 (35 %) | 604 | 74 % | 0.81 | -271.92 | tp5 sl15 tr0 h192 (14 · 1.89 · 27.20) |
| Signals | follow | sig-r-connors-m@m15 | 20 | 3 (15 %) | 289 | 67 % | 0.63 | -287.94 | tp6 sl18 tr3.6 h192 (8 · 1.19 · 3.55) |
| Signals | follow | sig-cmf-s@m15 | 20 | 6 (30 %) | 348 | 68 % | 0.66 | -310.09 | tp8 sl24 tr3.2 h192 (8 · ∞ (no loss) · 22.02) |
| Signals | follow | sig-swing-m@m15 | 20 | 4 (20 %) | 497 | 71 % | 0.74 | -327.09 | tp5 sl15 tr2 h192 (30 · 1.71 · 21.87) |
| Signals | follow | sig-rsi-mid-m@m15 | 20 | 6 (30 %) | 405 | 69 % | 0.69 | -327.86 | tp6 sl18 tr4.8 h192 (7 · 1.91 · 16.60) |
| Signals | follow | sig-atr-break-m@m15 | 20 | 2 (10 %) | 323 | 69 % | 0.64 | -332.37 | tp5 sl15 tr2 h192 (19 · 1.01 · 0.36) |
| Signals | follow | sig-s2-block-scale-s@m15 | 20 | 6 (30 %) | 573 | 71 % | 0.76 | -338.00 | tp8 sl24 tr4.8 h192 (9 · ∞ (no loss) · 29.67) |
| Signals | follow | sig-s2-range-shift-m@m15 | 20 | 3 (15 %) | 225 | 65 % | 0.52 | -382.54 | tp6 sl18 tr2.4 h192 (10 · 0.76 · -8.56) |
| Signals | follow | sig-ema-cross-m@m15 | 20 | 0 (0 %) | 77 | 51 % | 0.20 | -391.07 | tp3 sl9 tr1.8 h192 (6 · 0.69 · -2.96) |
| Signals | follow | sig-ichimoku-m@m15 | 20 | 1 (5 %) | 88 | 50 % | 0.16 | -392.21 | tp2.5 sl7.5 tr0 h192 (6 · 0.60 · -6.20) |
| Signals | follow | sig-cmf-m@m15 | 20 | 5 (25 %) | 403 | 68 % | 0.66 | -418.61 | tp8 sl24 tr3.2 h192 (12 · 6.66 · 32.56) |
| Signals | follow | sig-s2-atr-break-m@m15 | 20 | 6 (30 %) | 411 | 67 % | 0.62 | -447.72 | tp8 sl24 tr3.2 h192 (11 · ∞ (no loss) · 18.10) |
| Signals | follow | sig-sar-m@m15 | 20 | 3 (15 %) | 518 | 71 % | 0.68 | -463.04 | tp5 sl15 tr2 h192 (31 · 1.82 · 25.05) |
| Signals | follow | sig-r-fractal-s@m15 | 20 | 0 (0 %) | 221 | 63 % | 0.43 | -467.00 | tp3 sl9 tr1.8 h192 (18 · 0.78 · -6.20) |
| Signals | follow | sig-s2-block-scale-m@m15 | 20 | 4 (20 %) | 448 | 68 % | 0.63 | -469.58 | tp8 sl24 tr4.8 h192 (8 · ∞ (no loss) · 30.03) |
| Signals | follow | sig-s2-atr-break-s@m15 | 20 | 3 (15 %) | 275 | 63 % | 0.45 | -512.85 | tp8 sl24 tr3.2 h192 (6 · ∞ (no loss) · 10.11) |
| Signals | follow | sig-r-fractal-m@m15 | 20 | 1 (5 %) | 178 | 60 % | 0.31 | -516.83 | tp4 sl12 tr1.6 h192 (14 · 1.42 · 5.11) |
| Signals | follow | sig-s2-block-stack-m@m15 | 20 | 2 (10 %) | 346 | 65 % | 0.52 | -566.53 | tp8 sl24 tr3.2 h192 (10 · 0.80 · -4.94) |
| Signals | follow | sig-s2-block-stack-s@m15 | 20 | 3 (15 %) | 442 | 66 % | 0.53 | -704.58 | tp8 sl24 tr3.2 h192 (12 · 1.43 · 10.31) |
| Signals | follow | sig-s2-range-shift-s@m15 | 20 | 0 (0 %) | 292 | 54 % | 0.32 | -845.74 | tp8 sl24 tr3.2 h192 (8 · 0.66 · -8.36) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 123 | 101 (82 %) | 2703 | 83 % | 1.74 | 2026.61 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 123 | 99 (80 %) | 2136 | 84 % | 1.74 | 1983.01 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 122 | 88 (72 %) | 1808 | 84 % | 1.58 | 1657.70 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 121 | 87 (72 %) | 1360 | 84 % | 1.51 | 1363.68 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 122 | 102 (84 %) | 1399 | 85 % | 1.58 | 1338.76 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 113 | 86 (76 %) | 510 | 82 % | 1.89 | 1204.79 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 124 | 85 (69 %) | 3584 | 78 % | 1.23 | 987.38 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 117 | 82 (70 %) | 844 | 82 % | 1.44 | 974.24 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 121 | 70 (58 %) | 1387 | 78 % | 1.26 | 861.62 |
| Signals | tp 6.000% | sl 3.00× | tr off | 113 | 74 (65 %) | 643 | 81 % | 1.39 | 849.40 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 117 | 90 (77 %) | 718 | 83 % | 1.45 | 814.39 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 124 | 76 (61 %) | 2569 | 78 % | 1.13 | 595.08 |
| Signals | tp 5.000% | sl 3.00× | tr off | 119 | 61 (51 %) | 1021 | 78 % | 1.09 | 320.80 |
| Long | tp 6.400% | sl 1.00× | tr off | 50 | 18 (36 %) | 150 | 63 % | 1.55 | 185.23 |
| Wide | tp 0.760% | sl 0.89× | tr off | 44 | 29 (66 %) | 201 | 45 % | 2.80 | 179.60 |
| Long | tp 6.400% | sl 0.75× | tr off | 48 | 18 (38 %) | 104 | 62 % | 1.87 | 166.72 |
| Long | tp 6.000% | sl 1.00× | tr off | 47 | 16 (34 %) | 114 | 65 % | 1.73 | 163.38 |
| Short | tp 2.800% | sl 2.00× | tr off | 57 | 22 (39 %) | 191 | 76 % | 1.65 | 148.62 |
| Short | tp 2.600% | sl 1.50× | tr 0.50× | 66 | 27 (41 %) | 262 | 74 % | 1.84 | 143.98 |
| Long | tp 6.400% | sl 1.00× | tr 0.50× | 48 | 20 (42 %) | 97 | 78 % | 2.81 | 134.04 |
| Long | tp 4.800% | sl 1.00× | tr 0.50× | 49 | 15 (31 %) | 92 | 76 % | 2.33 | 133.58 |
| General | tp 4.000% | sl 1.00× | tr off | 33 | 13 (39 %) | 79 | 73 % | 2.43 | 125.77 |
| Short | tp 2.600% | sl 2.00× | tr off | 63 | 20 (32 %) | 252 | 74 % | 1.31 | 106.91 |
| Long | tp 5.600% | sl 1.00× | tr off | 43 | 12 (28 %) | 85 | 64 % | 1.67 | 105.50 |
| General | tp 4.400% | sl 1.00× | tr off | 40 | 11 (28 %) | 66 | 70 % | 2.19 | 104.96 |
| Short | tp 2.000% | sl 2.00× | tr 0.75× | 75 | 38 (51 %) | 481 | 69 % | 1.21 | 97.52 |
| Short | tp 2.800% | sl 1.50× | tr 0.50× | 56 | 19 (34 %) | 218 | 72 % | 1.53 | 95.57 |
| Long | tp 6.000% | sl 0.75× | tr off | 45 | 13 (29 %) | 77 | 57 % | 1.56 | 83.75 |
| Short | tp 2.800% | sl 1.50× | tr off | 49 | 16 (33 %) | 158 | 68 % | 1.42 | 82.14 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 52 | 16 (31 %) | 171 | 68 % | 1.37 | 77.09 |
| Short | tp 2.600% | sl 2.00× | tr 0.50× | 76 | 32 (42 %) | 252 | 75 % | 1.41 | 76.64 |
| Short | tp 2.400% | sl 1.50× | tr 0.50× | 65 | 20 (31 %) | 240 | 68 % | 1.38 | 66.28 |
| General | tp 3.200% | sl 1.00× | tr 0.75× | 49 | 11 (22 %) | 240 | 57 % | 1.22 | 65.76 |
| Long | tp 5.200% | sl 1.00× | tr 0.75× | 38 | 14 (37 %) | 53 | 64 % | 1.91 | 61.83 |
| Short | tp 2.200% | sl 2.00× | tr 0.75× | 78 | 30 (38 %) | 305 | 67 % | 1.20 | 61.47 |
| Short | tp 1.800% | sl 2.00× | tr 0.75× | 63 | 24 (38 %) | 223 | 68 % | 1.28 | 55.59 |
| Long | tp 4.800% | sl 1.00× | tr 0.75× | 47 | 12 (26 %) | 50 | 62 % | 1.68 | 53.27 |
| Long | tp 5.200% | sl 1.00× | tr off | 47 | 13 (28 %) | 108 | 56 % | 1.24 | 52.31 |
| Short | tp 2.400% | sl 2.00× | tr off | 54 | 21 (39 %) | 138 | 75 % | 1.29 | 51.60 |
| Long | tp 5.600% | sl 1.00× | tr 0.75× | 42 | 14 (33 %) | 51 | 67 % | 1.65 | 49.84 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 3.00× | tr off | 124 | 43 (35 %) | 3669 | 73 % | 0.80 | -1511.30 |
| Signals | tp 3.000% | sl 3.00× | tr off | 123 | 42 (34 %) | 2760 | 73 % | 0.81 | -1356.00 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 124 | 43 (35 %) | 3127 | 70 % | 0.80 | -1325.87 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 124 | 42 (34 %) | 3768 | 72 % | 0.84 | -1019.95 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 124 | 51 (41 %) | 4953 | 69 % | 0.91 | -499.10 |
| Wide | tp 0.640% | sl 0.84× | tr off | 57 | 2 (4 %) | 912 | 35 % | 0.51 | -225.29 |
| Signals | tp 4.000% | sl 3.00× | tr off | 122 | 58 (48 %) | 1747 | 76 % | 0.96 | -209.40 |
| Short | tp 2.200% | sl 1.00× | tr off | 60 | 15 (25 %) | 401 | 44 % | 0.66 | -183.22 |
| Short | tp 2.000% | sl 1.50× | tr off | 74 | 20 (27 %) | 361 | 54 % | 0.66 | -180.59 |
| Short | tp 2.600% | sl 1.00× | tr off | 57 | 9 (16 %) | 519 | 47 % | 0.78 | -169.51 |
| Short | tp 2.200% | sl 1.50× | tr off | 63 | 20 (32 %) | 326 | 54 % | 0.68 | -164.82 |
| Short | tp 2.800% | sl 2.00× | tr 0.75× | 64 | 11 (17 %) | 178 | 58 % | 0.56 | -151.87 |
| General | tp 4.000% | sl 1.00× | tr 0.50× | 63 | 14 (22 %) | 231 | 49 % | 0.62 | -143.25 |
| Short | tp 2.000% | sl 1.00× | tr 0.50× | 65 | 11 (17 %) | 341 | 50 % | 0.57 | -131.70 |
| Short | tp 2.800% | sl 1.00× | tr off | 58 | 9 (16 %) | 250 | 44 % | 0.71 | -118.33 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 56 (56) | 32568 | 13660 | 13660 | 0 | baseTarget 18908 |
| Micro | trailing | 56 (56) | 65136 | 27320 | 27320 | 0 | baseTarget 37816 |
| Short | normal | 241 (206) | 39528 | 14784 | 14784 | 0 | baseTarget 9048 · baseRange 15696 |
| Short | trailing | 241 (206) | 79056 | 29568 | 29568 | 0 | baseTarget 18096 · baseRange 31392 |
| General | normal | 241 (199) | 26352 | 9246 | 9246 | 0 | baseTarget 4218 · baseRange 12888 |
| General | trailing | 241 (199) | 17568 | 6164 | 6164 | 0 | baseTarget 2812 · baseRange 8592 |
| Long | normal | 241 (209) | 32940 | 13314 | 13314 | 0 | baseRange 13950 · baseTarget 5676 |
| Long | trailing | 241 (209) | 21960 | 8876 | 8876 | 0 | baseRange 9300 · baseTarget 3784 |
| Wide | axis | 297 (297) | 55710 | 55710 | 55710 | 0 | – |
| Wide | dca | 297 (297) | 4952 | 4952 | 4952 | 0 | – |
| Wide | dca-active | 297 (297) | 4952 | 4952 | 4952 | 0 | – |

Engine indications Base evaluated that built no set: 94 (act-burst-2.5@x4, bb-bounce-20-3, bb-walk, bb-walk-50, break-atr-0.9, break-atr-2@x4, dir-emax-20-50, ema-21-55, ema-slope-20-3, ema-stoch, ichi-tk-20, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-brk-20, mc-burst-3, mc-engulf-20, mc-iz-25, mc-macdh, mc-qburst-2, mc-rsi2-15, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-25, mc-rsi3-30, mc-rsi3-5, mc-rsi4-25, mc-rsi4-30, mc-rsi4-5, mc-rsi5-20, mc-rsi5-25, mc-rsi5-30, mc-rsi7-25, mc-rsi7-30, mc-rsi9-15, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.30 (1160) | 0.41 (1132) | 0.45 (1458) | 0.52 (1914) | 0.51 (3550) |
| 1.14× | – | 0.26 (860) | – | – | – | – | – |
| 1.25× | – | 0.28 (854) | 0.31 (1154) | 0.39 (1120) | 0.47 (1434) | 0.53 (1894) | 0.54 (3460) |
| 1.33× | 0.16 (868) | – | – | – | – | – | – |
| 1.5× | 0.18 (862) | 0.27 (848) | 0.31 (1130) | 0.42 (1108) | 0.54 (1410) | 0.60 (1848) | 0.52 (3444) |
| 1.75× | 0.17 (856) | 0.29 (830) | 0.38 (1130) | 0.54 (1078) | 0.51 (1404) | 0.55 (1842) | 0.48 (3426) |
| 2× | 0.18 (842) | 0.32 (830) | 0.42 (1102) | 0.50 (1078) | 0.47 (1404) | 0.52 (1816) | 0.47 (3380) |
| 2.25× | 0.19 (842) | 0.35 (814) | 0.40 (1102) | 0.46 (1078) | 0.45 (1390) | 0.52 (1816) | 0.44 (3380) |
| 2.5× | 0.23 (836) | 0.34 (814) | 0.37 (1102) | 0.44 (1064) | 0.45 (1390) | 0.50 (1816) | 0.47 (3224) |
| 2.75× | 0.25 (832) | 0.32 (814) | 0.35 (1088) | 0.45 (1064) | 0.44 (1390) | 0.57 (1728) | 0.50 (3224) |
| 3× | 0.24 (832) | 0.31 (808) | 0.35 (1088) | 0.44 (1064) | 0.50 (1332) | 0.55 (1728) | 0.51 (3174) |
| 3.25× | 0.23 (832) | 0.30 (802) | 0.35 (1088) | 0.47 (1060) | 0.49 (1332) | 0.55 (1710) | 0.52 (3156) |
| 3.5× | 0.22 (826) | 0.31 (802) | 0.34 (1088) | 0.46 (1036) | 0.50 (1326) | 0.58 (1692) | 0.53 (3156) |
| 3.75× | 0.22 (820) | 0.31 (802) | 0.37 (1062) | 0.43 (1036) | 0.54 (1326) | 0.58 (1692) | 0.51 (3132) |
| 4× | 0.22 (820) | 0.30 (802) | 0.35 (1062) | 0.43 (1030) | 0.53 (1326) | 0.60 (1686) | 0.52 (3126) |
| 4.25× | 0.23 (820) | 0.35 (780) | 0.33 (1062) | 0.52 (1030) | 0.59 (1326) | 0.64 (1686) | 0.55 (3126) |
| 4.5× | 0.23 (820) | 0.33 (780) | 0.34 (1056) | 0.52 (1030) | 0.57 (1326) | 0.65 (1686) | 0.58 (3088) |
| 4.75× | 0.24 (820) | 0.32 (780) | 0.40 (1056) | 0.60 (1030) | 0.58 (1326) | 0.73 (1668) | 0.58 (3080) |
| 5× | 0.27 (800) | 0.33 (774) | 0.41 (1056) | 0.58 (1030) | 0.63 (1322) | 0.74 (1668) | 0.64 (3068) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | – | 0.67 (24) |
| 2× | – | – | – | – | – | – | ∞ (4) |
| 2.25× | – | – | – | – | ∞ (4) | ∞ (4) | 0.82 (22) |
| 2.5× | – | – | – | ∞ (6) | ∞ (2) | 0.31 (14) | 0.34 (58) |
| 2.75× | – | – | – | ∞ (4) | 0.18 (12) | 0.20 (54) | 0.37 (161) |
| 3× | – | – | – | 0.15 (12) | 0.16 (34) | 0.23 (60) | 0.39 (301) |
| 3.25× | – | – | 0.09 (24) | 0.15 (28) | 0.15 (34) | 0.19 (45) | 0.32 (226) |
| 3.5× | – | – | 0.08 (24) | 0.12 (38) | 0.15 (48) | 0.20 (162) | 0.32 (173) |
| 3.75× | – | 0.10 (24) | 0.10 (40) | 0.11 (38) | 0.18 (111) | 0.19 (157) | 0.28 (147) |
| 4× | – | 0.09 (24) | 0.09 (40) | 0.11 (54) | 0.17 (104) | 0.24 (141) | 0.26 (142) |
| 4.25× | ∞ (2) | 0.10 (42) | 0.09 (40) | 0.12 (74) | 0.33 (104) | 0.29 (129) | 0.32 (214) |
| 4.5× | 0.09 (56) | 0.09 (42) | 0.10 (58) | 0.12 (102) | 0.30 (100) | 0.26 (125) | 0.39 (239) |
| 4.75× | 0.08 (56) | 0.09 (42) | 0.10 (78) | 0.22 (102) | 0.28 (100) | 0.30 (156) | 0.31 (200) |
| 5× | 0.08 (56) | 0.08 (42) | 0.09 (78) | 0.21 (102) | 0.27 (100) | 0.37 (171) | 0.30 (202) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | ∞ (3) |
| 2.25× | – | – | – | – | – | – | – |
| 2.5× | – | – | – | – | – | – | 0.00 (2) |
| 2.75× | – | – | – | – | – | – | 0.00 (3) |
| 3× | – | – | – | – | – | – | 0.60 (4) |
| 3.25× | – | – | – | – | – | – | 0.82 (8) |
| 3.5× | – | – | – | – | – | 0.49 (4) | 1.55 (11) |
| 3.75× | – | – | – | – | – | ∞ (1) | 0.41 (7) |
| 4× | – | – | – | – | – | ∞ (1) | ∞ (4) |
| 4.25× | – | – | – | – | – | ∞ (1) | 0.00 (2) |
| 4.5× | – | – | – | – | – | – | 1.03 (3) |
| 4.75× | – | – | – | – | – | 0.00 (1) | ∞ (6) |
| 5× | – | – | – | – | – | – | ∞ (1) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.80 (21170) | 0.81 (23989) | 0.78 (21841) | 0.84 (19755) | 0.83 (20704) | 0.87 (19309) |
| 1.5× | 0.91 (19679) | 0.92 (22064) | 0.93 (19729) | 1.04 (17491) | 1.00 (18392) | 1.17 (17086) |
| 2× | 1.10 (18250) | 1.11 (20194) | 1.09 (18173) | 1.26 (16365) | 1.28 (17205) | 1.52 (15878) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 1.07 (344) | 0.76 (1050) | 0.83 (1189) | 0.93 (1125) | 0.85 (1215) | 0.83 (858) |
| 1.5× | 0.91 (1039) | 0.74 (980) | 0.86 (1125) | 0.97 (785) | 1.13 (762) | 1.19 (605) |
| 2× | 1.00 (844) | 1.00 (1407) | 0.98 (709) | 0.99 (659) | 1.08 (690) | 1.00 (684) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.47 (38) | 0.47 (126) | 0.28 (138) | 0.39 (190) | 0.36 (162) | 0.32 (93) |
| 1.5× | 0.25 (99) | 0.36 (106) | 0.46 (132) | 0.32 (116) | 0.35 (102) | 0.27 (78) |
| 2× | 0.38 (118) | 0.37 (183) | 0.26 (113) | 0.21 (95) | 0.26 (121) | 0.34 (103) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.90 (6142) | 0.96 (5140) | 0.86 (5233) | 0.83 (5517) |
| 0.75× | 0.98 (5463) | 1.03 (4406) | 0.96 (4448) | 1.00 (4576) |
| 1× | 1.04 (15485) | 1.05 (12278) | 0.95 (12342) | 1.00 (12826) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.18 (29) | 1.15 (31) | 1.05 (54) | 1.13 (28) |
| 0.75× | 1.16 (236) | 1.05 (165) | 1.07 (76) | 1.66 (50) |
| 1× | 1.04 (568) | 1.06 (633) | 1.05 (402) | 1.55 (305) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.00 (7) | 0.00 (4) | 0.00 (4) | 0.87 (3) |
| 0.75× | 0.69 (24) | 0.29 (15) | 0.24 (6) | 0.40 (16) |
| 1× | 0.25 (56) | 0.38 (59) | 0.37 (42) | 0.32 (36) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.86 (5199) | 0.96 (5246) | 1.00 (5157) | 0.97 (4772) | 0.96 (5311) |
| 0.75× | 1.05 (4217) | 1.04 (4291) | 1.14 (4236) | 1.14 (3884) | 1.10 (4351) |
| 1× | 1.06 (11871) | 1.08 (11771) | 1.08 (11445) | 1.06 (10463) | 1.03 (11530) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.76 (10) | 0.57 (21) | 1.10 (29) | 1.60 (47) | 0.98 (102) |
| 0.75× | 0.92 (88) | 1.20 (72) | 1.10 (72) | 1.56 (77) | 1.87 (104) |
| 1× | 1.64 (213) | 1.33 (264) | 1.59 (201) | 1.43 (272) | 1.60 (347) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.00 (2) | 0.49 (5) | 0.60 (4) | 1.81 (2) | 0.91 (3) |
| 0.75× | 1.03 (8) | 0.61 (6) | 0.61 (6) | 0.62 (6) | 0.51 (14) |
| 1× | 0.32 (34) | 0.49 (36) | 0.47 (37) | 0.43 (28) | 0.36 (26) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.58 (43054) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.49 (1533) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.88 (102770) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.59 (1460) | 0.68 (3683) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.64 (1391) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.76 (3459) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.88 (3406) | – | – | – | – |
| 1× | – | – | – | 0.63 (264555) | – | – | – | 0.68 (67303) | 0.61 (9211) | – | 0.81 (2679) | – | 0.73 (8546) | 0.87 (7966) | 1.12 (2400) | 1.22 (2283) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.51 (912) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 2.80 (201) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.49 (110) | – | – | – | 4.35 (79) | – | – | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.58 (42) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 1.33 (6) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.00 (30) | – | – | – | 0.00 (6) | – | – | – | – | – | – | – | – |
