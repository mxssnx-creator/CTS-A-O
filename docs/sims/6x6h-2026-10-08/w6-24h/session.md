# Simulated trading session — 30 symbols, 24 h pre-historic + 6 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.40–$2.73 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T18:00 → 2026-10-06T18:00 UTC. Engine: Base 1185/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 285/19072 · PF 1.58 · Micro 81/5900 · PF 2.40 · Short 483/8176 · PF 1.57 · General 481/8176 · PF 1.53 · Long 596/8176 · PF 1.48 · Signals 126/126; Main 1114 pairs, 154323 tapes, Real seats: 2670 engine configs + 3780 signal configs (every config of the active signals), compute 309 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $24.77 (23.85 %, closed orders) · equity at end $20.94 (open at end: 51 positions / 8536 orders, MTM -$3.83 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.93 (gross profit $ ÷ gross loss $ as sized) · PF unit 1.74 (every order at one unit: the engine's PF) · 73 positions / 12428 orders (incl. 20 capped to $0) · WR 74.68 % · DDT (closed trades, $) 8.25 h · DDR 0.27 · equity max drawdown $4.68 (21.18 %) · margin used max $17.77 · open avg 32.11 pos / 2467.49 orders (peak 45 / 4398)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 20 orders capped to $0, 12103 scaled down (open at end: 2 capped, 8534 scaled) · binding: position cap 10950, gross cap 20176. **Without the caps:** balance $20.00 → $120.42 (502.09 %) · PF $ 1.74 · equity at end -$49.11 · equity max drawdown $149.46 (224.99 %) · margin used max $1179.70 · infeasible: margin exceeded equity for 1297 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 405 | 1011  | 4.0 % | 1.566 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 405 | 1011 (+0) | 4.0 % | 1.566 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 405 | 1010 (-1) | 4.0 % | 1.566 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 383 | 912 (-99) | 3.7 % | 1.602 |
| closes ≥ 6 | 1.00 | 6 | 1 | 706 | 1405 (+394) | 5.6 % | 1.976 |
| closes ≥ 20 | 1.00 | 20 | 1 | 285 | 761 (-250) | 3.0 % | 1.460 |
| closes ≥ 30 | 1.00 | 30 | 1 | 201 | 578 (-433) | 2.3 % | 1.371 |
| DDR off | 1.00 | 12 | off | 1433 | 2437 (+1426) | 9.8 % | 1.158 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 750 | 1569 (+558) | 6.3 % | 1.356 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 152 | 430 (-581) | 1.7 % | 1.988 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1433 | 2437 (+1426) | 9.8 % | 1.158 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1949 | 3007 (+1996) | 12.0 % | 1.236 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $20.00 | $20.00 | $19.93 | 0.34 % | 0.15 | $3.72 | 6 / 134 |
| 19:00 | 1 / 30 | 21 / 9 | 1.71 | 1.31 | 70 % | $0.08 | $20.08 | $19.81 | $19.38 | 3.44 % | 1.15 | $11.25 | 13 / 474 |
| 20:00 | 1 / 188 | 181 / 7 | 31.97 | 33.18 | 96 % | $1.24 | $21.32 | $21.63 | $19.77 | 3.44 % | 0.08 | $14.92 | 16 / 658 |
| 21:00 | 2 / 122 | 102 / 20 | 29.13 | 19.62 | 84 % | $0.36 | $21.68 | $21.56 | $21.32 | 3.45 % | 0.88 | $15.18 | 20 / 1219 |
| 22:00 | 1 / 169 | 163 / 6 | 90.23 | 127.14 | 96 % | $0.36 | $22.04 | $21.66 | $21.43 | 3.45 % | 1.88 | $15.43 | 24 / 1683 |
| 23:00 | 0 / 158 | 140 / 18 | 11.63 | 8.82 | 89 % | $0.28 | $22.32 | $21.61 | $21.31 | 3.47 % | 2.88 | $15.63 | 32 / 2486 |
| 00:00 | 4 / 237 | 109 / 128 | 0.16 | 0.25 | 46 % | -$0.84 | $21.48 | $19.91 | $19.67 | 10.93 % | 3.88 | $15.67 | 31 / 3088 |
| 01:00 | 0 / 245 | 154 / 91 | 0.19 | 0.43 | 63 % | -$0.23 | $21.25 | $18.84 | $18.84 | 14.68 % | 4.88 | $15.04 | 34 / 3672 |
| 02:00 | 0 / 386 | 250 / 136 | 1.58 | 1.46 | 65 % | $0.21 | $21.46 | $18.76 | $18.44 | 16.51 % | 5.88 | $15.19 | 36 / 4376 |
| 03:00 | 1 / 491 | 216 / 275 | 0.52 | 0.54 | 44 % | -$0.17 | $21.30 | $17.90 | $17.41 | 21.18 % | 6.88 | $15.02 | 35 / 4400 |
| 04:00 | 0 / 195 | 107 / 88 | 0.16 | 0.58 | 55 % | -$0.18 | $21.12 | $18.15 | $17.84 | 21.18 % | 7.88 | $14.91 | 36 / 4899 |
| 05:00 | 1 / 353 | 304 / 49 | 4.44 | 3.81 | 86 % | $0.31 | $21.43 | $18.82 | $17.70 | 21.18 % | 8.88 | $15.00 | 39 / 5490 |
| 06:00 | 3 / 454 | 405 / 49 | 24.23 | 10.27 | 89 % | $0.44 | $21.87 | $19.41 | $18.11 | 21.18 % | 9.88 | $15.31 | 40 / 6065 |
| 07:00 | 1 / 599 | 496 / 103 | 4.61 | 2.86 | 83 % | $0.32 | $22.19 | $20.12 | $19.22 | 21.18 % | 10.88 | $15.53 | 39 / 6567 |
| 08:00 | 1 / 625 | 544 / 81 | 5.76 | 6.58 | 87 % | $0.44 | $22.63 | $20.57 | $19.78 | 21.18 % | 11.88 | $15.84 | 39 / 6903 |
| 09:00 | 2 / 394 | 249 / 145 | 0.87 | 1.11 | 63 % | -$0.02 | $22.61 | $20.57 | $19.37 | 21.18 % | 12.88 | $15.89 | 45 / 7786 |
| 10:00 | 1 / 621 | 501 / 120 | 2.76 | 2.32 | 81 % | $0.17 | $22.78 | $21.47 | $20.48 | 21.18 % | 13.88 | $15.95 | 46 / 8424 |
| 11:00 | 2 / 1206 | 974 / 232 | 2.39 | 2.48 | 81 % | $0.36 | $23.14 | $21.41 | $20.74 | 21.18 % | 14.88 | $16.20 | 45 / 8055 |
| 12:00 | 0 / 785 | 699 / 86 | 5.96 | 4.54 | 89 % | $0.55 | $23.70 | $21.95 | $21.34 | 21.18 % | 0.60 | $16.59 | 45 / 8231 |
| 13:00 | 1 / 447 | 285 / 162 | 2.45 | 1.11 | 64 % | $0.29 | $23.98 | $21.91 | $21.37 | 21.18 % | 0.42 | $16.79 | 46 / 9187 |
| 14:00 | 1 / 1424 | 1337 / 87 | 18.54 | 13.40 | 94 % | $1.03 | $25.01 | $22.90 | $21.55 | 21.18 % | 0.27 | $17.51 | 48 / 9301 |
| 15:00 | 3 / 1074 | 849 / 225 | 2.23 | 2.42 | 79 % | $0.34 | $25.35 | $21.94 | $21.91 | 21.18 % | 1.27 | $17.77 | 46 / 9120 |
| 16:00 | 0 / 1000 | 539 / 461 | 0.51 | 0.51 | 54 % | -$0.28 | $25.07 | $21.28 | $21.28 | 21.18 % | 2.27 | $17.75 | 49 / 9029 |
| 17:00 | 2 / 1225 | 656 / 569 | 0.58 | 0.46 | 54 % | -$0.30 | $24.77 | $20.94 | $20.54 | 21.18 % | 3.27 | $17.55 | 51 / 8536 |

**Last hour (17:00):** open at end: 51 positions / 8536 orders, MTM -$3.83 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $20.94 = balance $24.77 + MTM -$3.83.

**Hours positive:** 16 of 24 full hours · flat 1 · negative 7

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|
| 18:00 | – | – | – | – | – |
| 19:00 | – | 3 · ∞ (no loss) · $0.00 | 26 · 1.61 · $0.07 | 1 · ∞ (no loss) · $0.01 | – |
| 20:00 | – | 5 · ∞ (no loss) · $0.01 | 179 · 30.08 · $1.16 | – | 4 · ∞ (no loss) · $0.07 |
| 21:00 | 5 · ∞ (no loss) · $0.01 | 6 · ∞ (no loss) · $0.01 | 94 · 19.07 · $0.23 | 5 · ∞ (no loss) · $0.11 | 12 · ∞ (no loss) · $0.01 |
| 22:00 | – | 2 · ∞ (no loss) · $0.00 | 123 · 67.35 · $0.27 | 2 · ∞ (no loss) · $0.02 | 42 · ∞ (no loss) · $0.07 |
| 23:00 | – | – | 148 · 11.98 · $0.27 | 3 · ∞ (no loss) · $0.00 | 7 · 3.75 · $0.00 |
| 00:00 | – | 8 · 0.05 · -$0.01 | 225 · 0.16 · -$0.83 | 2 · 4.48 · $0.00 | 2 · 0.00 · -$0.00 |
| 01:00 | 6 · ∞ (no loss) · $0.00 | 3 · 0.00 · -$0.01 | 160 · 0.13 · -$0.23 | 45 · 1.32 · $0.00 | 31 · 4.81 · $0.01 |
| 02:00 | – | 1 · 0.00 · -$0.00 | 319 · 4.25 · $0.43 | 17 · 0.40 · -$0.01 | 49 · 0.02 · -$0.21 |
| 03:00 | – | 3 · ∞ (no loss) · $0.00 | 398 · 0.43 · -$0.17 | 79 · 1.07 · $0.00 | 11 · 1.38 · $0.00 |
| 04:00 | – | 3 · ∞ (no loss) · $0.00 | 169 · 0.19 · -$0.14 | 6 · 0.00 · -$0.01 | 17 · 0.01 · -$0.03 |
| 05:00 | – | 6 · 0.16 · -$0.00 | 257 · 3.48 · $0.21 | 8 · 23.66 · $0.02 | 82 · 37.09 · $0.08 |
| 06:00 | – | 3 · ∞ (no loss) · $0.00 | 376 · 33.15 · $0.41 | 31 · 0.61 · -$0.00 | 44 · 127.39 · $0.03 |
| 07:00 | 3 · – · $0.00 | 6 · 0.00 · -$0.00 | 550 · 5.05 · $0.31 | 16 · 0.74 · -$0.00 | 24 · 12.77 · $0.02 |
| 08:00 | – | – | 607 · 5.87 · $0.44 | 12 · 2.28 · $0.00 | 6 · ∞ (no loss) · $0.00 |
| 09:00 | 2 · – · $0.00 | 7 · ∞ (no loss) · $0.00 | 330 · 0.83 · -$0.02 | 20 · 5.03 · $0.01 | 35 · 0.76 · -$0.00 |
| 10:00 | 3 · ∞ (no loss) · $0.00 | 3 · ∞ (no loss) · $0.00 | 567 · 4.04 · $0.19 | 30 · 3.40 · $0.01 | 18 · 0.00 · -$0.03 |
| 11:00 | 5 · – · $0.00 | 1 · – · $0.00 | 1061 · 2.33 · $0.25 | 33 · 13.50 · $0.16 | 106 · 0.08 · -$0.05 |
| 12:00 | 3 · ∞ (no loss) · $0.00 | – | 721 · 6.10 · $0.54 | 15 · 5.96 · $0.00 | 46 · 2.91 · $0.01 |
| 13:00 | – | 3 · 0.00 · -$0.00 | 412 · 2.81 · $0.30 | 23 · 0.75 · -$0.00 | 9 · 0.05 · -$0.02 |
| 14:00 | 3 · ∞ (no loss) · $0.00 | – | 1395 · 17.47 · $0.96 | 11 · ∞ (no loss) · $0.06 | 15 · ∞ (no loss) · $0.00 |
| 15:00 | 2 · – · $0.00 | – | 987 · 2.68 · $0.38 | 49 · 0.02 · -$0.05 | 36 · 12.75 · $0.01 |
| 16:00 | – | – | 867 · 0.64 · -$0.16 | 35 · 0.00 · -$0.05 | 98 · 0.00 · -$0.07 |
| 17:00 | 2 · ∞ (no loss) · $0.00 | – | 1152 · 0.60 · -$0.27 | 13 · 0.74 · -$0.00 | 58 · 0.16 · -$0.03 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 0 | – | – | – | – | – | – |
| 19:00 | 30 | 4 · ∞ (no loss) · 100 % · $0.01 | – | 17 · 0.97 · 53 % · -$0.00 | 9 · 125.56 · 89 % · $0.07 | – | 26 · 1.61 · 65 % · $0.07 |
| 20:00 | 188 | 9 · ∞ (no loss) · 100 % · $0.08 | – | 93 · 15.24 · 97 % · $0.56 | 86 · 714.22 · 95 % · $0.61 | – | 179 · 30.08 · 96 % · $1.16 |
| 21:00 | 122 | 14 · ∞ (no loss) · 100 % · $0.02 | 16 · ∞ (no loss) · 100 % · $0.12 | 25 · 26.76 · 96 % · $0.14 | 67 · 11.47 · 72 % · $0.08 | – | 92 · 18.06 · 78 % · $0.22 |
| 22:00 | 169 | 34 · ∞ (no loss) · 100 % · $0.08 | 16 · ∞ (no loss) · 100 % · $0.04 | 57 · 34.99 · 98 % · $0.09 | 62 · 114.36 · 92 % · $0.14 | – | 119 · 60.06 · 95 % · $0.24 |
| 23:00 | 158 | 5 · 2.45 · 60 % · $0.00 | 9 · 3.70 · 78 % · $0.01 | 81 · 7.26 · 89 % · $0.14 | 63 · 238.39 · 92 % · $0.13 | – | 144 · 13.09 · 90 % · $0.27 |
| 00:00 | 237 | 10 · 0.11 · 70 % · -$0.01 | 4 · 0.64 · 50 % · -$0.00 | 108 · 0.19 · 35 % · -$0.45 | 115 · 0.12 · 54 % · -$0.38 | – | 223 · 0.16 · 45 % · -$0.83 |
| 01:00 | 245 | 38 · 0.85 · 74 % · -$0.00 | 60 · 3.04 · 72 % · $0.01 | 60 · 0.19 · 43 % · -$0.06 | 87 · 0.08 · 66 % · -$0.18 | – | 147 · 0.11 · 56 % · -$0.24 |
| 02:00 | 386 | 67 · 0.05 · 16 % · -$0.20 | 13 · 0.00 · 0 % · -$0.03 | 161 · 2.79 · 70 % · $0.19 | 145 · 13.61 · 87 % · $0.25 | – | 306 · 4.50 · 78 % · $0.44 |
| 03:00 | 491 | 109 · 1.15 · 25 % · $0.01 | 50 · 0.19 · 6 % · -$0.03 | 228 · 0.33 · 52 % · -$0.17 | 104 · 2.76 · 65 % · $0.02 | – | 332 · 0.44 · 56 % · -$0.15 |
| 04:00 | 195 | 17 · 0.02 · 12 % · -$0.02 | 17 · 0.08 · 29 % · -$0.02 | 62 · 0.17 · 55 % · -$0.09 | 99 · 0.23 · 67 % · -$0.05 | – | 161 · 0.19 · 62 % · -$0.14 |
| 05:00 | 353 | 70 · 100.14 · 94 % · $0.11 | 43 · 4.79 · 74 % · $0.01 | 154 · 2.64 · 86 % · $0.13 | 86 · 8.27 · 86 % · $0.06 | – | 240 · 3.20 · 86 % · $0.19 |
| 06:00 | 454 | 60 · 130.67 · 95 % · $0.03 | 43 · 1.72 · 77 % · $0.00 | 185 · 18.22 · 91 % · $0.21 | 166 · 504.56 · 89 % · $0.19 | – | 351 · 32.77 · 90 % · $0.41 |
| 07:00 | 599 | 33 · 2.51 · 67 % · $0.01 | 27 · 1.73 · 41 % · $0.00 | 303 · 4.37 · 83 % · $0.18 | 236 · 6.59 · 89 % · $0.13 | – | 539 · 5.06 · 86 % · $0.31 |
| 08:00 | 625 | 18 · 3.57 · 83 % · $0.01 | 9 · 893.78 · 89 % · $0.01 | 257 · 4.50 · 88 % · $0.26 | 341 · 11.58 · 87 % · $0.17 | – | 598 · 5.74 · 87 % · $0.42 |
| 09:00 | 394 | 40 · 0.28 · 40 % · -$0.02 | 74 · 2.28 · 73 % · $0.01 | 109 · 0.41 · 40 % · -$0.06 | 171 · 3.91 · 79 % · $0.05 | – | 280 · 0.91 · 64 % · -$0.01 |
| 10:00 | 621 | 49 · 0.39 · 35 % · -$0.02 | 21 · 0.13 · 33 % · -$0.00 | 349 · 3.53 · 90 % · $0.10 | 202 · 4.98 · 81 % · $0.10 | – | 551 · 4.09 · 87 % · $0.19 |
| 11:00 | 1206 | 103 · 3.50 · 36 % · $0.13 | 48 · 0.24 · 29 % · -$0.02 | 508 · 2.19 · 86 % · $0.14 | 547 · 2.55 · 89 % · $0.11 | – | 1055 · 2.33 · 87 % · $0.25 |
| 12:00 | 785 | 70 · 3.81 · 96 % · $0.02 | 15 · 40.30 · 93 % · $0.00 | 412 · 5.57 · 86 % · $0.32 | 288 · 7.04 · 91 % · $0.21 | – | 700 · 6.06 · 88 % · $0.54 |
| 13:00 | 447 | 33 · 0.16 · 12 % · -$0.03 | 25 · 2.19 · 32 % · $0.01 | 208 · 2.66 · 59 % · $0.19 | 181 · 3.85 · 83 % · $0.12 | – | 389 · 2.98 · 70 % · $0.31 |
| 14:00 | 1424 | 43 · 23.40 · 91 % · $0.06 | 4 · 0.16 · 75 % · -$0.00 | 735 · 11.09 · 94 % · $0.43 | 642 · 45.35 · 94 % · $0.53 | – | 1377 · 18.65 · 94 % · $0.96 |
| 15:00 | 1074 | 56 · 0.47 · 64 % · -$0.01 | 78 · 0.09 · 55 % · -$0.03 | 457 · 1.68 · 77 % · $0.11 | 483 · 5.83 · 87 % · $0.27 | – | 940 · 2.74 · 82 % · $0.38 |
| 16:00 | 1000 | 110 · 0.00 · 3 % · -$0.10 | 60 · 0.00 · 13 % · -$0.04 | 519 · 0.62 · 59 % · -$0.11 | 311 · 0.81 · 71 % · -$0.03 | – | 830 · 0.68 · 64 % · -$0.14 |
| 17:00 | 1225 | 80 · 0.04 · 4 % · -$0.04 | 23 · 1.99 · 57 % · $0.00 | 616 · 0.51 · 44 % · -$0.20 | 506 · 0.74 · 73 % · -$0.07 | – | 1122 · 0.60 · 57 % · -$0.26 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 1059 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (154323 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (7514); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 12249 · 1.06 | 2161 · 2.24 | 3640 · 2.35 | 613 · 5.27 | – | – | – | – | – |
| 19:00 | 18412 · 0.71 | 4289 · 0.74 | 5113 · 0.64 | 984 · 6.45 | 30 · 1.31 | 4 · ∞ (no loss) | – | – | 26 · 1.23 |
| 20:00 | 26297 · 1.77 | 6641 · 3.11 | 8895 · 2.45 | 1865 · 6.20 | 188 · 33.18 | 9 · ∞ (no loss) | – | – | 179 · 32.13 |
| 21:00 | 23721 · 1.24 | 5333 · 1.19 | 8790 · 1.88 | 1519 · 6.67 | 122 · 19.62 | 14 · ∞ (no loss) | 16 · ∞ (no loss) | – | 92 · 13.24 |
| 22:00 | 15647 · 1.12 | 4083 · 1.41 | 4207 · 1.73 | 1836 · 5.43 | 169 · 127.14 | 34 · ∞ (no loss) | 16 · ∞ (no loss) | – | 119 · 84.65 |
| 23:00 | 20043 · 0.69 | 5349 · 0.89 | 6473 · 0.71 | 1577 · 3.60 | 158 · 8.82 | 5 · 1.09 | 9 · 1.59 | – | 144 · 11.05 |
| 00:00 | 28892 · 0.90 | 8517 · 0.94 | 10935 · 1.03 | 2919 · 0.80 | 237 · 0.25 | 10 · 0.49 | 4 · 4.11 | – | 223 · 0.25 |
| 01:00 | 30385 · 1.25 | 7507 · 1.52 | 11913 · 1.57 | 1877 · 0.92 | 245 · 0.43 | 38 · 1.34 | 60 · 1.61 | – | 147 · 0.25 |
| 02:00 | 37493 · 1.04 | 10646 · 1.43 | 11930 · 1.82 | 3828 · 3.67 | 386 · 1.46 | 67 · 0.36 | 13 · 0.00 | – | 306 · 2.19 |
| 03:00 | 41186 · 0.43 | 11741 · 0.53 | 13287 · 0.42 | 2715 · 0.62 | 491 · 0.54 | 109 · 0.35 | 50 · 0.08 | – | 332 · 0.73 |
| 04:00 | 26021 · 1.00 | 4100 · 0.64 | 10352 · 1.37 | 1820 · 1.36 | 195 · 0.58 | 17 · 0.08 | 17 · 0.02 | – | 161 · 0.73 |
| 05:00 | 30493 · 0.61 | 9608 · 0.83 | 8213 · 0.65 | 2791 · 1.45 | 353 · 3.81 | 70 · 16.73 | 43 · 5.56 | – | 240 · 2.81 |
| 06:00 | 37443 · 1.37 | 10904 · 1.48 | 11677 · 1.52 | 3337 · 2.08 | 454 · 10.27 | 60 · 14.38 | 43 · 2.18 | – | 351 · 12.68 |
| 07:00 | 38298 · 0.91 | 11117 · 1.12 | 13873 · 0.95 | 5138 · 3.38 | 599 · 2.86 | 33 · 1.73 | 27 · 0.33 | – | 539 · 3.19 |
| 08:00 | 44510 · 0.93 | 12106 · 0.64 | 17350 · 1.49 | 4358 · 2.96 | 625 · 6.58 | 18 · 5.30 | 9 · 570.49 | – | 598 · 6.14 |
| 09:00 | 47394 · 1.63 | 10803 · 1.15 | 22784 · 2.04 | 5011 · 3.91 | 394 · 1.11 | 40 · 0.60 | 74 · 3.04 | – | 280 · 1.09 |
| 10:00 | 43638 · 1.11 | 14850 · 1.30 | 13638 · 1.22 | 4035 · 5.11 | 621 · 2.32 | 49 · 0.30 | 21 · 0.66 | – | 551 · 3.02 |
| 11:00 | 44865 · 0.94 | 16168 · 0.94 | 18012 · 1.18 | 6137 · 2.04 | 1206 · 2.48 | 103 · 0.66 | 48 · 0.29 | – | 1055 · 3.38 |
| 12:00 | 48982 · 0.94 | 17630 · 0.94 | 16707 · 1.34 | 4503 · 1.52 | 785 · 4.54 | 70 · 19.48 | 15 · 75.41 | – | 700 · 4.17 |
| 13:00 | 50793 · 1.01 | 15235 · 0.94 | 18376 · 0.87 | 3948 · 1.72 | 447 · 1.11 | 33 · 0.15 | 25 · 0.87 | – | 389 · 1.31 |
| 14:00 | 59199 · 0.76 | 19109 · 0.91 | 21700 · 0.67 | 7058 · 3.29 | 1424 · 13.40 | 43 · 11.92 | 4 · 1.43 | – | 1377 · 13.51 |
| 15:00 | 89063 · 0.75 | 27232 · 0.71 | 33654 · 0.86 | 8510 · 1.20 | 1074 · 2.42 | 56 · 1.59 | 78 · 0.60 | – | 940 · 2.71 |
| 16:00 | 67982 · 0.82 | 22892 · 0.83 | 22572 · 0.83 | 7536 · 1.20 | 1000 · 0.51 | 110 · 0.00 | 60 · 0.01 | – | 830 · 0.64 |
| 17:00 | 82502 · 0.78 | 31830 · 0.77 | 33136 · 0.89 | 11393 · 1.48 | 1225 · 0.46 | 80 · 0.02 | 23 · 1.25 | – | 1122 · 0.49 |
| **total** | **965508 · 0.90** | **289851 · 0.93** | **347227 · 1.03** | **95308 · 1.91** | **12428 · 1.74** | **1072 · 0.78** | **655 · 0.89** | **–** | **10701 · 1.94** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 1072 | 521 / 551 | 1.18 | 0.78 | $0.12 | 48.60 % | 11.50 |
| Trailing | 655 | 340 / 315 | 1.25 | 0.89 | $0.06 | 51.91 % | 16.00 |
| Signal · Normal | 5704 | 4251 / 1453 | 1.73 | 1.53 | $2.05 | 74.53 % | 8.25 |
| Signal · Trailing | 4997 | 4169 / 828 | 2.76 | 2.84 | $2.55 | 83.43 % | 7.50 |
| total | 12428 | 9281 / 3147 | 1.93 | 1.74 | $4.77 | 74.68 % | 8.25 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 10701 | 8420 / 2281 | 2.08 | 1.94 | $4.60 | 78.68 % | 8.25 |
| of which Engine (no signals) | 1727 | 861 / 866 | 1.20 | 0.82 | $0.17 | 49.86 % | 8.75 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 5m | 34 | ∞ (no loss) | 20.61 | $0.01 |
| 5m+ | 63 | 1.24 | 1.02 | $0.01 |
| 15m | 11123 | 2.05 | 1.88 | $4.61 |
| 15m+ | 456 | 2.29 | 0.70 | $0.28 |
| 30m | 752 | 0.71 | 0.88 | -$0.14 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 112 | 85 / 27 | 1.37 | 0.97 | $0.01 | 75.89 % | 17.92 |
| Short | 755 | 423 / 332 | 1.08 | 0.84 | $0.02 | 56.03 % | 16.25 |
| General | 424 | 157 / 267 | 0.86 | 0.62 | -$0.05 | 37.03 % | 18.00 |
| Long | 436 | 196 / 240 | 1.76 | 0.97 | $0.19 | 44.95 % | 3.50 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 10701 | 8420 / 2281 | 2.08 | 1.94 | $4.60 | 78.68 % | 8.25 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 109374 | sig:confirm 35635 · sig:duplicate 34847 · sig:signalPf 18389 · sig:signalCluster 14842 · sig:signalSide 5637 · sig:signalGuard 24 |
| Short | 4103 | lastN 2410 · engineSide 1025 · symPf 586 · duplicate 82 |
| Micro | 2728 | crowd 1298 · lastN 716 · engineSide 616 · symPf 68 · duplicate 30 |
| Long | 2680 | lastN 1549 · engineSide 699 · symPf 368 · duplicate 64 |
| General | 1695 | lastN 1138 · symPf 302 · engineSide 138 · duplicate 117 |
| Wide | 451 | lastN 203 · engineSide 200 · symPf 48 |

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
| Micro | 2.40 | 0.97 | 0.40 | 1.37 | 1.41 | 112 |
| Short | 1.57 | 0.84 | 0.53 | 1.08 | 1.29 | 755 |
| General | 1.53 | 0.62 | 0.41 | 0.86 | 1.38 | 424 |
| Long | 1.48 | 0.97 | 0.65 | 1.76 | 1.82 | 436 |
| Wide | 1.58 | – | – | – | – | 0 |
| Signals | – | 1.94 | – | 2.08 | 1.07 | 10701 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (3863 of 126310 evaluated, 150543 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (2986 units active at the run start, 4788 over the run, 3651 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 263 | 144 (55 %) | 932 | 82 % | 0.70 | -116.45 |
| Micro | trailing | 300 | 128 (43 %) | 1270 | 62 % | 0.51 | -281.28 |
| Short | normal | 648 | 233 (36 %) | 2013 | 58 % | 0.87 | -380.56 |
| Short | trailing | 1009 | 417 (41 %) | 2748 | 57 % | 0.88 | -420.06 |
| General | normal | 280 | 33 (12 %) | 930 | 36 % | 0.61 | -779.42 |
| General | trailing | 270 | 98 (36 %) | 818 | 54 % | 0.78 | -293.02 |
| Long | normal | 487 | 54 (11 %) | 1219 | 30 % | 0.47 | -2093.90 |
| Long | trailing | 391 | 91 (23 %) | 874 | 48 % | 0.60 | -924.07 |
| Wide | axis | 215 | 69 (32 %) | 729 | 30 % | 0.72 | -185.59 |
| Signals | normal | 1818 | 1454 (80 %) | 43355 | 75 % | 1.58 | 41902.90 |
| Signals | trailing | 1833 | 1700 (93 %) | 40420 | 84 % | 3.32 | 73841.06 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 563 | 272 (48 %) | 2202 | 71 % | 0.59 | -397.73 |
| Short | active | 102 | 40 (39 %) | 203 | 49 % | 0.77 | -84.77 |
| Short | bollinger | 18 | 0 (0 %) | 129 | 43 % | 0.53 | -105.72 |
| Short | break | 286 | 54 (19 %) | 480 | 56 % | 0.68 | -235.25 |
| Short | channel | 4 | 0 (0 %) | 14 | 43 % | 0.49 | -13.30 |
| Short | direction | 76 | 0 (0 %) | 68 | 50 % | 0.53 | -67.20 |
| Short | ema | 16 | 4 (25 %) | 60 | 60 % | 0.86 | -11.22 |
| Short | ichimoku | 11 | 11 (100 %) | 22 | 100 % | ∞ (no loss) | 52.00 |
| Short | macd | 56 | 20 (36 %) | 73 | 48 % | 0.39 | -80.53 |
| Short | move | 492 | 153 (31 %) | 1410 | 54 % | 0.67 | -708.17 |
| Short | osc | 333 | 226 (68 %) | 1714 | 62 % | 1.27 | 479.06 |
| Short | rsi | 14 | 5 (36 %) | 72 | 49 % | 0.85 | -13.91 |
| Short | smooth | 19 | 16 (84 %) | 90 | 73 % | 1.59 | 43.28 |
| Short | trend | 176 | 88 (50 %) | 321 | 58 % | 0.75 | -104.76 |
| Short | volume | 54 | 33 (61 %) | 105 | 77 % | 1.53 | 49.88 |
| General | active | 27 | 9 (33 %) | 69 | 42 % | 0.84 | -21.29 |
| General | bollinger | 10 | 0 (0 %) | 19 | 21 % | 0.15 | -33.53 |
| General | break | 110 | 3 (3 %) | 116 | 42 % | 0.49 | -133.67 |
| General | channel | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | ema | 5 | 0 (0 %) | 15 | 67 % | 0.89 | -1.94 |
| General | ichimoku | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 24.21 |
| General | macd | 9 | 2 (22 %) | 12 | 50 % | 0.45 | -11.74 |
| General | move | 159 | 37 (23 %) | 416 | 40 % | 0.53 | -416.63 |
| General | osc | 116 | 50 (43 %) | 677 | 52 % | 0.91 | -102.28 |
| General | rsi | 16 | 5 (31 %) | 62 | 26 % | 0.38 | -94.65 |
| General | smooth | 14 | 5 (36 %) | 185 | 45 % | 0.81 | -64.42 |
| General | trend | 45 | 6 (13 %) | 115 | 31 % | 0.35 | -165.78 |
| General | volume | 30 | 10 (33 %) | 54 | 37 % | 0.46 | -50.71 |
| Long | active | 34 | 12 (35 %) | 95 | 33 % | 0.52 | -125.29 |
| Long | bollinger | 14 | 0 (0 %) | 17 | 0 % | 0.00 | -36.72 |
| Long | break | 155 | 10 (6 %) | 179 | 36 % | 0.56 | -243.64 |
| Long | channel | 16 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 6 | 4 (67 %) | 66 | 52 % | 1.20 | 34.50 |
| Long | ema | 3 | 2 (67 %) | 7 | 57 % | 0.96 | -0.69 |
| Long | ichimoku | 1 | 1 (100 %) | 7 | 71 % | 2.06 | 13.94 |
| Long | macd | 27 | 6 (22 %) | 28 | 21 % | 0.37 | -59.15 |
| Long | move | 293 | 17 (6 %) | 848 | 31 % | 0.35 | -1813.09 |
| Long | osc | 192 | 56 (29 %) | 607 | 46 % | 0.65 | -596.28 |
| Long | rsi | 11 | 1 (9 %) | 60 | 23 % | 0.42 | -110.69 |
| Long | smooth | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | trend | 48 | 30 (63 %) | 105 | 66 % | 1.93 | 151.05 |
| Long | volume | 69 | 6 (9 %) | 74 | 14 % | 0.11 | -231.89 |
| Wide | active | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -10.36 |
| Wide | break | 13 | 3 (23 %) | 6 | 50 % | 1.00 | 0.00 |
| Wide | channel | 24 | 3 (13 %) | 84 | 25 % | 0.48 | -49.46 |
| Wide | direction | 26 | 7 (27 %) | 74 | 32 % | 0.26 | -54.15 |
| Wide | ema | 10 | 4 (40 %) | 26 | 38 % | 0.88 | -2.36 |
| Wide | ichimoku | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 3.66 |
| Wide | macd | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -6.30 |
| Wide | move | 53 | 7 (13 %) | 134 | 23 % | 0.58 | -74.79 |
| Wide | osc | 24 | 24 (100 %) | 59 | 59 % | 10.56 | 135.58 |
| Wide | smooth | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 21.80 |
| Wide | trend | 15 | 6 (40 %) | 33 | 36 % | 0.33 | -45.51 |
| Wide | volume | 26 | 0 (0 %) | 283 | 24 % | 0.47 | -103.71 |
| Signals | signal:act-burst | 60 | 48 (80 %) | 1660 | 75 % | 1.72 | 1715.97 |
| Signals | signal:act-hf | 60 | 55 (92 %) | 2283 | 78 % | 2.23 | 3304.59 |
| Signals | signal:adx | 60 | 40 (67 %) | 865 | 74 % | 1.33 | 531.53 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 2041 | 80 % | 2.26 | 3103.66 |
| Signals | signal:bollinger | 60 | 50 (83 %) | 984 | 77 % | 2.00 | 1217.16 |
| Signals | signal:cci | 60 | 46 (77 %) | 1251 | 75 % | 1.61 | 1167.62 |
| Signals | signal:cmf | 60 | 57 (95 %) | 1462 | 79 % | 2.26 | 2137.11 |
| Signals | signal:donchian | 60 | 57 (95 %) | 1601 | 80 % | 1.96 | 2149.66 |
| Signals | signal:ema-cross | 60 | 56 (93 %) | 788 | 84 % | 3.48 | 1563.93 |
| Signals | signal:ema-cross-fast | 60 | 60 (100 %) | 1247 | 85 % | 3.34 | 2502.03 |
| Signals | signal:ema-pullback | 60 | 46 (77 %) | 1313 | 78 % | 2.24 | 1888.21 |
| Signals | signal:ema-slope | 60 | 57 (95 %) | 1051 | 83 % | 2.58 | 1794.11 |
| Signals | signal:ema-trend | 60 | 50 (83 %) | 1314 | 79 % | 2.18 | 1890.46 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 2561 | 79 % | 1.98 | 3139.46 |
| Signals | signal:hma | 60 | 60 (100 %) | 1875 | 82 % | 2.66 | 3144.96 |
| Signals | signal:ichimoku | 60 | 47 (78 %) | 1076 | 80 % | 1.85 | 1341.03 |
| Signals | signal:impulse | 60 | 58 (97 %) | 1876 | 81 % | 2.65 | 3189.82 |
| Signals | signal:kama | 60 | 55 (92 %) | 1909 | 79 % | 2.04 | 2509.14 |
| Signals | signal:keltner | 60 | 51 (85 %) | 1269 | 78 % | 1.92 | 1627.91 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 2143 | 78 % | 1.95 | 2647.93 |
| Signals | signal:macd-hist | 60 | 55 (92 %) | 2565 | 77 % | 2.05 | 3275.90 |
| Signals | signal:macd-slow | 60 | 55 (92 %) | 1970 | 79 % | 1.97 | 2445.83 |
| Signals | signal:mfi | 30 | 27 (90 %) | 152 | 91 % | 5.49 | 290.90 |
| Signals | signal:obv | 60 | 53 (88 %) | 1849 | 77 % | 1.53 | 1573.69 |
| Signals | signal:r-awesome | 60 | 54 (90 %) | 1607 | 79 % | 2.35 | 2376.34 |
| Signals | signal:r-connors | 60 | 50 (83 %) | 520 | 82 % | 2.57 | 789.09 |
| Signals | signal:r-fractal | 60 | 58 (97 %) | 1487 | 83 % | 2.77 | 2743.36 |
| Signals | signal:r-inside | 51 | 51 (100 %) | 346 | 95 % | 39.41 | 960.90 |
| Signals | signal:r-linreg | 60 | 46 (77 %) | 1333 | 78 % | 2.11 | 1895.58 |
| Signals | signal:r-nr-break | 60 | 58 (97 %) | 2243 | 78 % | 1.84 | 2597.96 |
| Signals | signal:r-session-trend | 60 | 52 (87 %) | 894 | 82 % | 3.15 | 1680.84 |
| Signals | signal:r-vol-regime | 60 | 54 (90 %) | 1132 | 77 % | 1.66 | 1152.53 |
| Signals | signal:reclaim | 60 | 55 (92 %) | 1569 | 79 % | 2.29 | 2272.64 |
| Signals | signal:rsi-mid | 60 | 53 (88 %) | 1719 | 82 % | 2.61 | 2804.32 |
| Signals | signal:rsi-momentum | 60 | 58 (97 %) | 253 | 86 % | 4.86 | 697.62 |
| Signals | signal:rsi-reversal | 60 | 17 (28 %) | 314 | 64 % | 0.74 | -225.09 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 2910 | 78 % | 2.12 | 4040.87 |
| Signals | signal:s2-adx-gate | 60 | 55 (92 %) | 1343 | 83 % | 2.57 | 2302.79 |
| Signals | signal:s2-atr-break | 60 | 58 (97 %) | 2323 | 78 % | 2.06 | 3110.16 |
| Signals | signal:s2-bb-bounce | 60 | 35 (58 %) | 998 | 74 % | 1.31 | 600.44 |
| Signals | signal:s2-block-scale | 60 | 58 (97 %) | 2393 | 80 % | 2.14 | 3258.38 |
| Signals | signal:s2-block-stack | 60 | 48 (80 %) | 1423 | 77 % | 1.74 | 1510.75 |
| Signals | signal:s2-confluence | 60 | 60 (100 %) | 1244 | 86 % | 4.30 | 2705.95 |
| Signals | signal:s2-ema-cross | 28 | 27 (96 %) | 57 | 89 % | 9.07 | 105.04 |
| Signals | signal:s2-range-break | 60 | 60 (100 %) | 524 | 83 % | 4.00 | 1099.35 |
| Signals | signal:s2-range-shift | 60 | 59 (98 %) | 1707 | 81 % | 2.61 | 2886.20 |
| Signals | signal:s2-rsi-revert | 60 | 10 (17 %) | 516 | 63 % | 0.66 | -560.19 |
| Signals | signal:s2-st-trail | 60 | 51 (85 %) | 749 | 86 % | 2.93 | 1475.24 |
| Signals | signal:s2-stoch-swing | 60 | 43 (72 %) | 1328 | 76 % | 1.46 | 1027.92 |
| Signals | signal:s2-vol-break | 51 | 51 (100 %) | 158 | 97 % | 96.10 | 426.31 |
| Signals | signal:s2-vwap-axis | 20 | 11 (55 %) | 29 | 62 % | 0.59 | -20.81 |
| Signals | signal:sar | 60 | 58 (97 %) | 2056 | 81 % | 2.63 | 3394.06 |
| Signals | signal:squeeze | 60 | 44 (73 %) | 369 | 79 % | 2.54 | 601.09 |
| Signals | signal:st-slow | 60 | 50 (83 %) | 684 | 85 % | 2.73 | 1281.33 |
| Signals | signal:stoch-rsi | 60 | 40 (67 %) | 1826 | 72 % | 1.31 | 1020.73 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 1011 | 86 % | 4.09 | 2290.33 |
| Signals | signal:swing | 60 | 59 (98 %) | 2334 | 81 % | 2.32 | 3640.48 |
| Signals | signal:thrust | 60 | 60 (100 %) | 2004 | 83 % | 3.07 | 3635.52 |
| Signals | signal:trix | 60 | 55 (92 %) | 1098 | 83 % | 2.82 | 1973.16 |
| Signals | signal:volume-break | 51 | 51 (100 %) | 140 | 91 % | 12.39 | 359.38 |
| Signals | signal:vwap | 60 | 56 (93 %) | 1368 | 81 % | 2.15 | 1903.07 |
| Signals | signal:williams-r | 60 | 47 (78 %) | 1674 | 76 % | 1.61 | 1558.75 |
| Signals | signal:zscore | 60 | 28 (47 %) | 987 | 71 % | 1.10 | 218.96 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 21876 | 18336 | 563 | 0.83 | 4.00 | 70.00–163.33 (median 163.33) | 2024 | 10057 | 430 | 1987 | 1693 | 476 | 1060 | 0 | 46 | 0 | 0 | 0 | 3540 |  |
| Short | 34829 | 29753 | 1657 | 1.29 | 2.20 | 163.33–163.33 (median 163.33) | 2080 | 5797 | 1464 | 6118 | 4276 | 2578 | 5259 | 20 | 504 | 0 | 0 | 0 | 5076 |  |
| General | 13663 | 11783 | 550 | 1.32 | 2.03 | 163.33–163.33 (median 163.33) | 906 | 1786 | 539 | 2631 | 1441 | 1261 | 2416 | 0 | 219 | 34 | 0 | 0 | 1880 |  |
| Long | 21133 | 18783 | 878 | 1.28 | 2.22 | 163.33–163.33 (median 163.33) | 1027 | 3451 | 968 | 3954 | 2453 | 2715 | 3069 | 0 | 252 | 16 | 0 | 0 | 2350 |  |
| Wide | 59042 | 47655 | 215 | 0.70 | 2.64 | 18.00–163.33 (median 163.33) | 10170 | 28111 | 1086 | 4867 | 1144 | 375 | 1437 | 0 | 161 | 89 | 0 | 8912 | 2475 |  |
| Signals | 3780 | – | 2986 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 2986 units (pair × symbol × direction) active at the run start, 4788 over the run; 3651 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 7300 | 2722 (37 %) | 22390 | 73 % | 0.58 | -4056.10 |
| Micro | trailing | 14576 | 5028 (34 %) | 45458 | 58 % | 0.52 | -8582.98 |
| Short | normal | 11613 | 4498 (39 %) | 74211 | 58 % | 0.88 | -12694.60 |
| Short | trailing | 23216 | 9357 (40 %) | 157409 | 58 % | 0.87 | -22311.74 |
| General | normal | 8189 | 2833 (35 %) | 48990 | 40 % | 0.82 | -14906.04 |
| General | trailing | 5474 | 1846 (34 %) | 31236 | 53 % | 0.82 | -9100.46 |
| Long | normal | 12666 | 3498 (28 %) | 59806 | 37 % | 0.74 | -39216.92 |
| Long | trailing | 8467 | 2448 (29 %) | 37349 | 52 % | 0.78 | -20391.58 |
| Wide | axis | 50130 | 12210 (24 %) | 282044 | 31 % | 0.63 | -83247.94 |
| Wide | dca | 4456 | 1614 (36 %) | 29444 | 62 % | 0.66 | -15486.49 |
| Wide | dca-active | 4456 | 736 (17 %) | 16942 | 29 % | 0.48 | -8722.23 |
| Signals | normal | 1890 | 1292 (68 %) | 84454 | 71 % | 1.20 | 34449.97 |
| Signals | trailing | 1890 | 1583 (84 %) | 75775 | 81 % | 1.64 | 72649.96 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 563 | 272 (48 %) | 2202 | 71 % | 0.59 | -397.73 |
| Short | active | 102 | 40 (39 %) | 203 | 49 % | 0.77 | -84.77 |
| Short | bollinger | 18 | 0 (0 %) | 129 | 43 % | 0.53 | -105.72 |
| Short | break | 286 | 54 (19 %) | 480 | 56 % | 0.68 | -235.25 |
| Short | channel | 4 | 0 (0 %) | 14 | 43 % | 0.49 | -13.30 |
| Short | direction | 76 | 0 (0 %) | 68 | 50 % | 0.53 | -67.20 |
| Short | ema | 16 | 4 (25 %) | 60 | 60 % | 0.86 | -11.22 |
| Short | ichimoku | 11 | 11 (100 %) | 22 | 100 % | ∞ (no loss) | 52.00 |
| Short | macd | 56 | 20 (36 %) | 73 | 48 % | 0.39 | -80.53 |
| Short | move | 492 | 153 (31 %) | 1410 | 54 % | 0.67 | -708.17 |
| Short | osc | 333 | 226 (68 %) | 1714 | 62 % | 1.27 | 479.06 |
| Short | rsi | 14 | 5 (36 %) | 72 | 49 % | 0.85 | -13.91 |
| Short | smooth | 19 | 16 (84 %) | 90 | 73 % | 1.59 | 43.28 |
| Short | trend | 176 | 88 (50 %) | 321 | 58 % | 0.75 | -104.76 |
| Short | volume | 54 | 33 (61 %) | 105 | 77 % | 1.53 | 49.88 |
| General | active | 27 | 9 (33 %) | 69 | 42 % | 0.84 | -21.29 |
| General | bollinger | 10 | 0 (0 %) | 19 | 21 % | 0.15 | -33.53 |
| General | break | 110 | 3 (3 %) | 116 | 42 % | 0.49 | -133.67 |
| General | channel | 2 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | direction | 3 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| General | ema | 5 | 0 (0 %) | 15 | 67 % | 0.89 | -1.94 |
| General | ichimoku | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 24.21 |
| General | macd | 9 | 2 (22 %) | 12 | 50 % | 0.45 | -11.74 |
| General | move | 159 | 37 (23 %) | 416 | 40 % | 0.53 | -416.63 |
| General | osc | 116 | 50 (43 %) | 677 | 52 % | 0.91 | -102.28 |
| General | rsi | 16 | 5 (31 %) | 62 | 26 % | 0.38 | -94.65 |
| General | smooth | 14 | 5 (36 %) | 185 | 45 % | 0.81 | -64.42 |
| General | trend | 45 | 6 (13 %) | 115 | 31 % | 0.35 | -165.78 |
| General | volume | 30 | 10 (33 %) | 54 | 37 % | 0.46 | -50.71 |
| Long | active | 34 | 12 (35 %) | 95 | 33 % | 0.52 | -125.29 |
| Long | bollinger | 14 | 0 (0 %) | 17 | 0 % | 0.00 | -36.72 |
| Long | break | 155 | 10 (6 %) | 179 | 36 % | 0.56 | -243.64 |
| Long | channel | 16 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | direction | 6 | 4 (67 %) | 66 | 52 % | 1.20 | 34.50 |
| Long | ema | 3 | 2 (67 %) | 7 | 57 % | 0.96 | -0.69 |
| Long | ichimoku | 1 | 1 (100 %) | 7 | 71 % | 2.06 | 13.94 |
| Long | macd | 27 | 6 (22 %) | 28 | 21 % | 0.37 | -59.15 |
| Long | move | 293 | 17 (6 %) | 848 | 31 % | 0.35 | -1813.09 |
| Long | osc | 192 | 56 (29 %) | 607 | 46 % | 0.65 | -596.28 |
| Long | rsi | 11 | 1 (9 %) | 60 | 23 % | 0.42 | -110.69 |
| Long | smooth | 9 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Long | trend | 48 | 30 (63 %) | 105 | 66 % | 1.93 | 151.05 |
| Long | volume | 69 | 6 (9 %) | 74 | 14 % | 0.11 | -231.89 |
| Wide | active | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -10.36 |
| Wide | break | 13 | 3 (23 %) | 6 | 50 % | 1.00 | 0.00 |
| Wide | channel | 24 | 3 (13 %) | 84 | 25 % | 0.48 | -49.46 |
| Wide | direction | 26 | 7 (27 %) | 74 | 32 % | 0.26 | -54.15 |
| Wide | ema | 10 | 4 (40 %) | 26 | 38 % | 0.88 | -2.36 |
| Wide | ichimoku | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 3.66 |
| Wide | macd | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -6.30 |
| Wide | move | 53 | 7 (13 %) | 134 | 23 % | 0.58 | -74.79 |
| Wide | osc | 24 | 24 (100 %) | 59 | 59 % | 10.56 | 135.58 |
| Wide | smooth | 12 | 12 (100 %) | 12 | 100 % | ∞ (no loss) | 21.80 |
| Wide | trend | 15 | 6 (40 %) | 33 | 36 % | 0.33 | -45.51 |
| Wide | volume | 26 | 0 (0 %) | 283 | 24 % | 0.47 | -103.71 |
| Signals | signal:act-burst | 60 | 48 (80 %) | 1660 | 75 % | 1.72 | 1715.97 |
| Signals | signal:act-hf | 60 | 55 (92 %) | 2283 | 78 % | 2.23 | 3304.59 |
| Signals | signal:adx | 60 | 40 (67 %) | 865 | 74 % | 1.33 | 531.53 |
| Signals | signal:atr-break | 60 | 58 (97 %) | 2041 | 80 % | 2.26 | 3103.66 |
| Signals | signal:bollinger | 60 | 50 (83 %) | 984 | 77 % | 2.00 | 1217.16 |
| Signals | signal:cci | 60 | 46 (77 %) | 1251 | 75 % | 1.61 | 1167.62 |
| Signals | signal:cmf | 60 | 57 (95 %) | 1462 | 79 % | 2.26 | 2137.11 |
| Signals | signal:donchian | 60 | 57 (95 %) | 1601 | 80 % | 1.96 | 2149.66 |
| Signals | signal:ema-cross | 60 | 56 (93 %) | 788 | 84 % | 3.48 | 1563.93 |
| Signals | signal:ema-cross-fast | 60 | 60 (100 %) | 1247 | 85 % | 3.34 | 2502.03 |
| Signals | signal:ema-pullback | 60 | 46 (77 %) | 1313 | 78 % | 2.24 | 1888.21 |
| Signals | signal:ema-slope | 60 | 57 (95 %) | 1051 | 83 % | 2.58 | 1794.11 |
| Signals | signal:ema-trend | 60 | 50 (83 %) | 1314 | 79 % | 2.18 | 1890.46 |
| Signals | signal:heikin-ashi | 60 | 59 (98 %) | 2561 | 79 % | 1.98 | 3139.46 |
| Signals | signal:hma | 60 | 60 (100 %) | 1875 | 82 % | 2.66 | 3144.96 |
| Signals | signal:ichimoku | 60 | 47 (78 %) | 1076 | 80 % | 1.85 | 1341.03 |
| Signals | signal:impulse | 60 | 58 (97 %) | 1876 | 81 % | 2.65 | 3189.82 |
| Signals | signal:kama | 60 | 55 (92 %) | 1909 | 79 % | 2.04 | 2509.14 |
| Signals | signal:keltner | 60 | 51 (85 %) | 1269 | 78 % | 1.92 | 1627.91 |
| Signals | signal:macd-cross | 60 | 56 (93 %) | 2143 | 78 % | 1.95 | 2647.93 |
| Signals | signal:macd-hist | 60 | 55 (92 %) | 2565 | 77 % | 2.05 | 3275.90 |
| Signals | signal:macd-slow | 60 | 55 (92 %) | 1970 | 79 % | 1.97 | 2445.83 |
| Signals | signal:mfi | 30 | 27 (90 %) | 152 | 91 % | 5.49 | 290.90 |
| Signals | signal:obv | 60 | 53 (88 %) | 1849 | 77 % | 1.53 | 1573.69 |
| Signals | signal:r-awesome | 60 | 54 (90 %) | 1607 | 79 % | 2.35 | 2376.34 |
| Signals | signal:r-connors | 60 | 50 (83 %) | 520 | 82 % | 2.57 | 789.09 |
| Signals | signal:r-fractal | 60 | 58 (97 %) | 1487 | 83 % | 2.77 | 2743.36 |
| Signals | signal:r-inside | 51 | 51 (100 %) | 346 | 95 % | 39.41 | 960.90 |
| Signals | signal:r-linreg | 60 | 46 (77 %) | 1333 | 78 % | 2.11 | 1895.58 |
| Signals | signal:r-nr-break | 60 | 58 (97 %) | 2243 | 78 % | 1.84 | 2597.96 |
| Signals | signal:r-session-trend | 60 | 52 (87 %) | 894 | 82 % | 3.15 | 1680.84 |
| Signals | signal:r-vol-regime | 60 | 54 (90 %) | 1132 | 77 % | 1.66 | 1152.53 |
| Signals | signal:reclaim | 60 | 55 (92 %) | 1569 | 79 % | 2.29 | 2272.64 |
| Signals | signal:rsi-mid | 60 | 53 (88 %) | 1719 | 82 % | 2.61 | 2804.32 |
| Signals | signal:rsi-momentum | 60 | 58 (97 %) | 253 | 86 % | 4.86 | 697.62 |
| Signals | signal:rsi-reversal | 60 | 17 (28 %) | 314 | 64 % | 0.74 | -225.09 |
| Signals | signal:s2-active-hf | 60 | 58 (97 %) | 2910 | 78 % | 2.12 | 4040.87 |
| Signals | signal:s2-adx-gate | 60 | 55 (92 %) | 1343 | 83 % | 2.57 | 2302.79 |
| Signals | signal:s2-atr-break | 60 | 58 (97 %) | 2323 | 78 % | 2.06 | 3110.16 |
| Signals | signal:s2-bb-bounce | 60 | 35 (58 %) | 998 | 74 % | 1.31 | 600.44 |
| Signals | signal:s2-block-scale | 60 | 58 (97 %) | 2393 | 80 % | 2.14 | 3258.38 |
| Signals | signal:s2-block-stack | 60 | 48 (80 %) | 1423 | 77 % | 1.74 | 1510.75 |
| Signals | signal:s2-confluence | 60 | 60 (100 %) | 1244 | 86 % | 4.30 | 2705.95 |
| Signals | signal:s2-ema-cross | 28 | 27 (96 %) | 57 | 89 % | 9.07 | 105.04 |
| Signals | signal:s2-range-break | 60 | 60 (100 %) | 524 | 83 % | 4.00 | 1099.35 |
| Signals | signal:s2-range-shift | 60 | 59 (98 %) | 1707 | 81 % | 2.61 | 2886.20 |
| Signals | signal:s2-rsi-revert | 60 | 10 (17 %) | 516 | 63 % | 0.66 | -560.19 |
| Signals | signal:s2-st-trail | 60 | 51 (85 %) | 749 | 86 % | 2.93 | 1475.24 |
| Signals | signal:s2-stoch-swing | 60 | 43 (72 %) | 1328 | 76 % | 1.46 | 1027.92 |
| Signals | signal:s2-vol-break | 51 | 51 (100 %) | 158 | 97 % | 96.10 | 426.31 |
| Signals | signal:s2-vwap-axis | 20 | 11 (55 %) | 29 | 62 % | 0.59 | -20.81 |
| Signals | signal:sar | 60 | 58 (97 %) | 2056 | 81 % | 2.63 | 3394.06 |
| Signals | signal:squeeze | 60 | 44 (73 %) | 369 | 79 % | 2.54 | 601.09 |
| Signals | signal:st-slow | 60 | 50 (83 %) | 684 | 85 % | 2.73 | 1281.33 |
| Signals | signal:stoch-rsi | 60 | 40 (67 %) | 1826 | 72 % | 1.31 | 1020.73 |
| Signals | signal:supertrend | 60 | 60 (100 %) | 1011 | 86 % | 4.09 | 2290.33 |
| Signals | signal:swing | 60 | 59 (98 %) | 2334 | 81 % | 2.32 | 3640.48 |
| Signals | signal:thrust | 60 | 60 (100 %) | 2004 | 83 % | 3.07 | 3635.52 |
| Signals | signal:trix | 60 | 55 (92 %) | 1098 | 83 % | 2.82 | 1973.16 |
| Signals | signal:volume-break | 51 | 51 (100 %) | 140 | 91 % | 12.39 | 359.38 |
| Signals | signal:vwap | 60 | 56 (93 %) | 1368 | 81 % | 2.15 | 1903.07 |
| Signals | signal:williams-r | 60 | 47 (78 %) | 1674 | 76 % | 1.61 | 1558.75 |
| Signals | signal:zscore | 60 | 28 (47 %) | 987 | 71 % | 1.10 | 218.96 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 60 | 10 (17 %) | 444 | 63 % | 0.64 | -67.78 |
| Micro | 1.25 | 56 | 6 (11 %) | 412 | 62 % | 0.61 | -69.27 |
| Micro | 1.35 | 56 | 6 (11 %) | 412 | 62 % | 0.61 | -69.27 |
| Micro | 1.5 | 56 | 6 (11 %) | 412 | 62 % | 0.61 | -69.27 |
| Micro | 1.75 | 48 | 4 (8 %) | 356 | 65 % | 0.63 | -57.09 |
| Micro | 2 | 38 | 3 (8 %) | 286 | 69 % | 0.65 | -45.46 |
| Short | 1.1 | 357 | 164 (46 %) | 2665 | 58 % | 0.90 | -349.95 |
| Short | 1.25 | 332 | 155 (47 %) | 2488 | 58 % | 0.89 | -340.26 |
| Short | 1.35 | 303 | 147 (49 %) | 2227 | 58 % | 0.91 | -257.65 |
| Short | 1.5 | 236 | 120 (51 %) | 1677 | 59 % | 0.94 | -123.61 |
| Short | 1.75 | 135 | 73 (54 %) | 952 | 61 % | 1.00 | 1.48 |
| Short | 2 | 61 | 36 (59 %) | 446 | 64 % | 1.10 | 43.23 |
| General | 1.1 | 156 | 36 (23 %) | 1151 | 46 % | 0.74 | -548.26 |
| General | 1.25 | 143 | 34 (24 %) | 983 | 47 % | 0.76 | -433.19 |
| General | 1.35 | 133 | 33 (25 %) | 900 | 48 % | 0.78 | -353.75 |
| General | 1.5 | 103 | 26 (25 %) | 666 | 48 % | 0.79 | -243.58 |
| General | 1.75 | 42 | 17 (40 %) | 269 | 57 % | 1.12 | 46.11 |
| General | 2 | 8 | 3 (38 %) | 58 | 62 % | 1.33 | 27.33 |
| Long | 1.1 | 223 | 55 (25 %) | 1084 | 45 % | 0.69 | -910.27 |
| Long | 1.25 | 200 | 45 (23 %) | 931 | 44 % | 0.64 | -903.22 |
| Long | 1.35 | 168 | 37 (22 %) | 752 | 43 % | 0.61 | -821.60 |
| Long | 1.5 | 131 | 26 (20 %) | 564 | 41 % | 0.55 | -747.04 |
| Long | 1.75 | 69 | 20 (29 %) | 294 | 41 % | 0.53 | -410.98 |
| Long | 2 | 39 | 15 (38 %) | 173 | 40 % | 0.55 | -224.54 |
| Wide | 1.1 | 10 | 4 (40 %) | 55 | 45 % | 1.50 | 30.20 |
| Wide | 1.25 | 10 | 4 (40 %) | 55 | 45 % | 1.50 | 30.20 |
| Wide | 1.35 | 10 | 4 (40 %) | 55 | 45 % | 1.50 | 30.20 |
| Wide | 1.5 | 7 | 1 (14 %) | 28 | 25 % | 0.78 | -7.28 |
| Wide | 1.75 | 7 | 1 (14 %) | 28 | 25 % | 0.78 | -7.28 |
| Wide | 2 | 1 | 1 (100 %) | 4 | 25 % | 1.84 | 4.33 |
| Signals | 1.1 | 1205 | 1086 (90 %) | 28907 | 82 % | 2.41 | 45818.04 |
| Signals | 1.25 | 744 | 684 (92 %) | 18273 | 83 % | 2.74 | 31103.16 |
| Signals | 1.35 | 544 | 497 (91 %) | 13908 | 83 % | 2.81 | 23599.01 |
| Signals | 1.5 | 339 | 325 (96 %) | 9343 | 84 % | 3.03 | 15929.87 |
| Signals | 1.75 | 176 | 171 (97 %) | 5343 | 85 % | 3.43 | 9024.80 |
| Signals | 2 | 95 | 93 (98 %) | 3051 | 86 % | 3.95 | 5260.59 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-tpull-8@m5c | 62 | 62 (100 %) | 434 | 71 % | 3.96 | 81.55 | tp0.6 sl2.4 tr0 h192 mc (7 · ∞ (no loss) · 2.80) |
| Micro | magnet | mc-rsi2-5@m5 | 84 | 84 (100 %) | 168 | 100 % | ∞ (no loss) | 36.60 | – |
| Micro | revert | mc-tpull-8@m5c | 40 | 24 (60 %) | 240 | 86 % | 1.72 | 30.50 | tp0.6 sl1.35 tr0 h192 mc (6 · ∞ (no loss) · 2.40) |
| Micro | sandwich | mc-ibrk@m5 | 16 | 16 (100 %) | 32 | 100 % | ∞ (no loss) | 11.50 | – |
| Micro | sandwich | mc-rsi14-25@m5c | 4 | 4 (100 %) | 20 | 100 % | ∞ (no loss) | 7.57 | tp0.6 sl2.55 tr0.45 h192 mc (5 · ∞ (no loss) · 1.89) |
| Micro | snap | mc-rsi14-25@m5c | 4 | 4 (100 %) | 20 | 100 % | ∞ (no loss) | 7.57 | tp0.6 sl2.55 tr0.45 h192 mc (5 · ∞ (no loss) · 1.89) |
| Micro | sweep | mc-rsi7-20@m5c | 4 | 4 (100 %) | 16 | 100 % | ∞ (no loss) | 6.40 | – |
| Micro | pulse | mc-ibrk@m5 | 16 | 16 (100 %) | 16 | 100 % | ∞ (no loss) | 5.75 | – |
| Micro | sandwich | mc-tstreak-4@m5 | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 5.40 | – |
| Micro | sweep | mc-rsi5-15@m5c | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 4.80 | – |
| Micro | sandwich | mc-rsit7-25@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 2.40 | – |
| Micro | pulse | mc-rsit7-25@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 2.40 | – |
| Micro | sweep | mc-rsi5-15@m5 | 4 | 4 (100 %) | 32 | 75 % | 1.16 | 1.49 | tp0.6 sl1.8 tr0.45 h192 mc (8 · 1.24 · 0.52) |
| Micro | sweep | mc-rsi9-20@m5 | 6 | 4 (67 %) | 36 | 61 % | 1.08 | 0.67 | tp0.6 sl3 tr0.45 h192 mc (6 · 3.91 · 1.19) |
| Micro | sweep | mc-rsi5-10@m5 | 2 | 0 (0 %) | 10 | 80 % | 0.80 | -0.80 | tp0.6 sl1.8 tr0 h192 mc (5 · 0.80 · -0.40) |
| Micro | ribbon | mc-lag-12@m5 | 6 | 2 (33 %) | 40 | 85 % | 0.86 | -2.08 | tp0.55 sl1.7875 tr0 h192 mc (7 · 1.06 · 0.11) |
| Micro | sweep | mc-rsi7-15@m5 | 8 | 4 (50 %) | 40 | 50 % | 0.55 | -6.63 | tp0.6 sl3 tr0.45 h192 mc (5 · 2.94 · 0.79) |
| Micro | revert | mc-trsi2-10@m5c | 4 | 0 (0 %) | 68 | 76 % | 0.73 | -7.60 | tp0.6 sl1.5 tr0 h192 mc (17 · 0.76 · -1.60) |
| Micro | sweep | mc-rsi14-25@m5 | 2 | 0 (0 %) | 16 | 63 % | 0.30 | -9.25 | tp0.6 sl3 tr0.45 h192 mc (8 · 0.30 · -4.62) |
| Micro | magnet | mc-rsit3-25@m15c | 6 | 0 (0 %) | 24 | 75 % | 0.33 | -10.35 | – |
| Micro | sweep | mc-rsi14-25@m5c | 6 | 0 (0 %) | 24 | 67 % | 0.33 | -13.12 | – |
| Micro | sweep | mc-rsi9-25@m5c | 4 | 0 (0 %) | 28 | 71 % | 0.32 | -17.00 | tp0.6 sl2.85 tr0 h192 mc (7 · 0.33 · -4.10) |
| Micro | pivot | mc-wick-3@m15c | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -21.40 | – |
| Micro | sweep | mc-rsi7-25@m5c | 8 | 0 (0 %) | 76 | 79 % | 0.48 | -26.24 | tp0.6 sl2.85 tr0.45 h192 mc (10 · 0.51 · -2.96) |
| Micro | sweep | mc-rsi4-10@m5 | 48 | 6 (13 %) | 336 | 58 % | 0.66 | -43.03 | tp0.6 sl3 tr0.45 h192 mc (7 · 3.34 · 1.34) |
| Micro | magnet | mc-rsit4-25@m15c | 34 | 0 (0 %) | 68 | 50 % | 0.23 | -73.34 | – |
| Micro | clamp | mc-bbx-25@m15c | 46 | 0 (0 %) | 92 | 50 % | 0.13 | -114.15 | – |
| Micro | magnet | mc-lag-12@m5 | 76 | 0 (0 %) | 304 | 51 % | 0.17 | -259.54 | – |
| Short | sweep | r-td-m@m15 | 35 | 33 (94 %) | 100 | 68 % | 3.30 | 123.25 | – |
| Short | sweep | act-burst-2.5@x4@m30 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 107.80 | – |
| Short | sweep | willr-21-95@m15 | 15 | 15 (100 %) | 197 | 68 % | 1.42 | 96.33 | tp2.8 sl4.2 tr2.1 h64 sh (14 · 2.67 · 29.84) |
| Short | ribbon | r-valuearea-m@m15 | 31 | 31 (100 %) | 60 | 100 % | ∞ (no loss) | 95.58 | – |
| Short | follow | r-fisher-m@m15c | 24 | 24 (100 %) | 86 | 56 % | 7.56 | 80.39 | – |
| Short | sandwich | cci-40-200@x4@m15 | 28 | 28 (100 %) | 28 | 100 % | ∞ (no loss) | 66.80 | – |
| Short | snap | cci-40-200@x4@m15 | 28 | 28 (100 %) | 28 | 100 % | ∞ (no loss) | 66.80 | – |
| Short | pulse | cci-40-200@x4@m15 | 28 | 28 (100 %) | 28 | 100 % | ∞ (no loss) | 66.80 | – |
| Short | clamp | r-ultimate@m15 | 21 | 17 (81 %) | 218 | 67 % | 1.35 | 61.00 | tp2 sl2 tr0 h64 sh (11 · 2.18 · 7.80) |
| Short | ribbon | willr-50-95@m15c | 6 | 6 (100 %) | 36 | 92 % | 6.44 | 56.75 | tp2.2 sl4.4 tr0 h96 sh (6 · ∞ (no loss) · 12.00) |
| Short | pulse | ichi-tk-9@m15 | 11 | 11 (100 %) | 22 | 100 % | ∞ (no loss) | 52.00 | – |
| Short | ribbon | macd-hist-19-39-9@m15c | 20 | 20 (100 %) | 40 | 88 % | 104.75 | 51.61 | – |
| Short | pulse | hma-55@m15 | 12 | 12 (100 %) | 24 | 100 % | ∞ (no loss) | 46.35 | – |
| Short | revert | r-roofing@m15 | 9 | 7 (78 %) | 78 | 73 % | 1.57 | 44.68 | tp2.8 sl5.6 tr0 h96 sh (8 · 3.14 · 12.40) |
| Short | sweep | willr-50-95@m15c | 9 | 7 (78 %) | 72 | 78 % | 1.77 | 44.62 | tp2 sl4 tr0 h64 sh (9 · 3.43 · 10.20) |
| Short | sweep | r-sweep-m@m15 | 6 | 6 (100 %) | 30 | 100 % | ∞ (no loss) | 44.61 | tp2.4 sl3.6 tr0 h96 sh (5 · ∞ (no loss) · 11.00) |
| Short | ribbon | willr-28-95@m30 | 12 | 12 (100 %) | 76 | 70 % | 1.74 | 40.82 | tp2.4 sl3.6 tr1.2 h32 sh (7 · 2.56 · 6.37) |
| Short | ribbon | break-retest@m15 | 63 | 30 (48 %) | 30 | 100 % | ∞ (no loss) | 40.27 | – |
| Short | clamp | cci-40-200@x4@m15 | 8 | 8 (100 %) | 16 | 100 % | ∞ (no loss) | 40.00 | – |
| Short | revert | r-pin-m@m15c | 29 | 25 (86 %) | 49 | 92 % | 360.16 | 38.57 | – |
| Short | pivot | r-sweep-m@m15 | 4 | 4 (100 %) | 16 | 88 % | 21.38 | 29.26 | – |
| Short | sweep | rsi-fast@m15 | 2 | 2 (100 %) | 16 | 88 % | 3.57 | 24.20 | tp2.8 sl4.2 tr0 h64 sh (8 · 4.14 · 13.80) |
| Short | ribbon | willr-7-90@m30 | 3 | 3 (100 %) | 32 | 66 % | 1.72 | 20.18 | tp2.8 sl2.8 tr2.1 h48 sh (10 · 2.09 · 9.78) |
| Short | sweep | r-pin-m@m15 | 18 | 10 (56 %) | 155 | 67 % | 1.12 | 19.14 | tp2.4 sl4.8 tr1.8 h96 sh (8 · 2.42 · 7.09) |
| Short | ribbon | r-chand-m@m15 | 92 | 68 (74 %) | 92 | 74 % | 1.29 | 18.08 | – |
| Short | revert | r-bos-m@m15c | 3 | 3 (100 %) | 15 | 93 % | 38.43 | 15.87 | tp2.8 sl4.2 tr1.4 h96 sh (5 · 13.79 · 5.42) |
| Short | follow | break-vol-2@x4@m15c | 8 | 8 (100 %) | 8 | 100 % | ∞ (no loss) | 15.60 | – |
| Short | sweep | willr-21-95@m15c | 4 | 4 (100 %) | 33 | 64 % | 1.48 | 15.60 | tp2.2 sl2.2 tr0 h64 sh (9 · 1.67 · 4.80) |
| Short | follow | r-fvg@m15c | 7 | 7 (100 %) | 42 | 83 % | 1.52 | 14.61 | tp2.2 sl3.3 tr1.1 h64 sh (6 · 1.74 · 2.57) |
| Short | pulse | move-impulse-10-2@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 13.20 | – |
| Short | clamp | r-ultimate@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 13.00 | – |
| Short | ribbon | willr-28-95@m15c | 2 | 2 (100 %) | 10 | 90 % | 3.36 | 12.76 | tp2.8 sl5.6 tr2.1 h96 sh (5 · ∞ (no loss) · 8.56) |
| Short | ribbon | willr-7-90@m15c | 1 | 1 (100 %) | 14 | 64 % | 2.16 | 10.19 | tp2 sl4 tr1.5 h96 sh (14 · 2.16 · 10.19) |
| Short | sweep | r-vol-regime@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 10.00 | – |
| Short | sweep | willr-21-90@m15c | 1 | 1 (100 %) | 19 | 68 % | 1.47 | 9.98 | tp2.6 sl3.9 tr0 h64 sh (19 · 1.47 · 9.98) |
| Short | sweep | cci-20-200@m15 | 1 | 1 (100 %) | 7 | 86 % | 2.69 | 9.80 | tp2.8 sl5.6 tr0 h96 sh (7 · 2.69 · 9.80) |
| Short | sweep | willr-14-95@m30 | 2 | 2 (100 %) | 18 | 56 % | 2.23 | 7.82 | tp1.8 sl2.7 tr0.9 h32 sh (9 · 2.23 · 3.91) |
| Short | sweep | r-vortex@m15 | 1 | 1 (100 %) | 10 | 80 % | 1.74 | 6.80 | tp2.2 sl4.4 tr0 h96 sh (10 · 1.74 · 6.80) |
| Short | pivot | r-chand-m@m15 | 25 | 12 (48 %) | 75 | 61 % | 1.06 | 4.41 | – |
| Short | sweep | willr-21-95@m30 | 3 | 2 (67 %) | 30 | 50 % | 1.13 | 4.40 | tp2.8 sl2.8 tr0 h48 sh (10 · 1.30 · 3.60) |
| Short | sweep | r-pdhl-m@m15 | 2 | 2 (100 %) | 8 | 75 % | 1.33 | 3.60 | – |
| Short | ribbon | r-pin@m15 | 1 | 1 (100 %) | 8 | 75 % | 1.26 | 2.00 | tp1.8 sl3.6 tr0 h64 sh (8 · 1.26 · 2.00) |
| Short | magnet | rsi-fast@m30 | 2 | 1 (50 %) | 6 | 50 % | 1.02 | 0.08 | – |
| Short | ribbon | willr-21-95@m30 | 8 | 4 (50 %) | 50 | 52 % | 0.98 | -1.25 | tp1.8 sl2.7 tr1.35 h32 sh (7 · 1.16 · 0.97) |
| Short | sweep | break-don55@m15c | 3 | 2 (67 %) | 35 | 60 % | 0.95 | -2.27 | tp2.2 sl3.3 tr1.65 h96 sh (12 · 1.06 · 1.03) |
| Short | ribbon | trix-15@m15c | 3 | 2 (67 %) | 62 | 63 % | 0.96 | -2.60 | tp2.4 sl3.6 tr1.8 h64 sh (19 · 1.11 · 2.34) |
| Short | sweep | break-vol-1.3@m15c | 8 | 3 (38 %) | 16 | 50 % | 0.90 | -3.24 | – |
| Short | ribbon | ema-slope@m15c | 2 | 0 (0 %) | 12 | 67 % | 0.74 | -3.31 | tp2.4 sl3.6 tr1.8 h64 sh (6 · 0.90 · -0.51) |
| Short | follow | r-fisher@m15c | 2 | 0 (0 %) | 8 | 25 % | 0.36 | -3.58 | – |
| Short | sweep | willr-28-95@m15 | 1 | 0 (0 %) | 12 | 58 % | 0.82 | -3.70 | tp2.6 sl3.9 tr0 h96 sh (12 · 0.82 · -3.70) |
| Short | sweep | r-bb-adx@m15 | 3 | 0 (0 %) | 10 | 60 % | 0.78 | -3.89 | – |
| Short | revert | r-klinger-m@m15c | 1 | 0 (0 %) | 6 | 50 % | 0.57 | -4.50 | tp2.2 sl3.3 tr0 h64 sh (6 · 0.57 · -4.50) |
| Short | sweep | mfi-14-10@m30 | 2 | 0 (0 %) | 8 | 50 % | 0.57 | -6.00 | – |
| Short | sweep | break-vol@m15 | 3 | 0 (0 %) | 7 | 43 % | 0.57 | -6.94 | – |
| Short | sandwich | bb-wick@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.59 | -7.00 | – |
| Short | pulse | bb-wick@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.59 | -7.00 | – |
| Short | pivot | ema-stoch@m30 | 14 | 4 (29 %) | 48 | 58 % | 0.89 | -7.91 | – |
| Short | sweep | kelt-20-2.5@m15c | 2 | 0 (0 %) | 12 | 50 % | 0.58 | -9.30 | tp2.2 sl3.3 tr0 h64 sh (6 · 0.57 · -4.50) |
| Short | sweep | break-don40@m15 | 3 | 0 (0 %) | 56 | 54 % | 0.86 | -11.88 | tp2.6 sl3.9 tr1.3 h64 sh (18 · 0.97 · -0.89) |
| Short | sweep | willr-7-90@m15c | 7 | 1 (14 %) | 66 | 42 % | 0.85 | -15.22 | tp2.8 sl4.2 tr2.1 h96 sh (10 · 2.17 · 20.85) |
| Short | follow | r-td@m15c | 8 | 2 (25 %) | 16 | 50 % | 0.36 | -17.89 | – |
| Short | sandwich | z-50-2.5@x4@m15 | 20 | 4 (20 %) | 60 | 63 % | 0.83 | -18.05 | – |
| Short | snap | z-50-2.5@x4@m15 | 20 | 4 (20 %) | 60 | 63 % | 0.83 | -18.05 | – |
| Short | pulse | z-50-2.5@x4@m15 | 20 | 4 (20 %) | 60 | 63 % | 0.83 | -18.05 | – |
| Short | sandwich | r-zdist@m15c | 59 | 20 (34 %) | 177 | 59 % | 0.92 | -18.80 | – |
| Short | snap | r-zdist@m15c | 59 | 20 (34 %) | 177 | 59 % | 0.92 | -18.80 | – |
| Short | pulse | r-zdist@m15c | 59 | 20 (34 %) | 177 | 59 % | 0.92 | -18.80 | – |
| Short | ribbon | dir-vwap-120@m15c | 1 | 0 (0 %) | 12 | 50 % | 0.45 | -19.20 | tp2.8 sl5.6 tr0 h96 sh (12 · 0.45 · -19.20) |
| Short | sweep | willr-7-95@m15 | 4 | 0 (0 %) | 16 | 25 % | 0.44 | -19.43 | – |
| Short | sweep | willr-50-95@m30 | 12 | 3 (25 %) | 81 | 49 % | 0.71 | -27.12 | tp2.6 sl3.9 tr1.3 h32 sh (8 · 11.19 · 7.15) |
| Short | clamp | break-retest@m15 | 4 | 0 (0 %) | 34 | 53 % | 0.56 | -28.80 | tp2.4 sl3.6 tr0 h64 sh (8 · 0.58 · -6.40) |
| Short | clamp | act-hf-5@m30 | 8 | 0 (0 %) | 8 | 0 % | 0.00 | -30.80 | – |
| Short | clamp | r-streak-m@m15 | 8 | 0 (0 %) | 26 | 35 % | 0.23 | -34.59 | – |
| Short | pivot | r-streak-m@m15 | 8 | 0 (0 %) | 29 | 28 % | 0.28 | -35.04 | – |
| Short | clamp | act-burst-2.5@m15c | 16 | 0 (0 %) | 32 | 50 % | 0.48 | -35.60 | – |
| Short | sweep | mfi-14-20@m15c | 12 | 0 (0 %) | 29 | 41 % | 0.43 | -39.60 | – |
| Short | pivot | macd-cross@m30 | 18 | 0 (0 %) | 15 | 0 % | 0.00 | -40.74 | – |
| Short | sweep | rsi-7-15-85@m30 | 8 | 0 (0 %) | 48 | 33 % | 0.48 | -42.20 | tp2.6 sl2.6 tr1.3 h32 sh (6 · 0.62 · -2.75) |
| Short | clamp | break-atr-1.5@m30 | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -42.20 | – |
| Short | pivot | dir-thrust-4@m30 | 28 | 0 (0 %) | 56 | 50 % | 0.55 | -48.00 | – |
| Short | pivot | r-streak@m15 | 9 | 0 (0 %) | 28 | 32 % | 0.10 | -48.82 | – |
| Short | sweep | willr-28-95@m30 | 30 | 9 (30 %) | 244 | 51 % | 0.83 | -49.62 | tp2.6 sl5.2 tr1.95 h32 sh (8 · 10.10 · 6.75) |
| Short | sweep | r-td@m30 | 5 | 0 (0 %) | 50 | 32 % | 0.41 | -50.88 | tp2.2 sl3.3 tr1.65 h48 sh (10 · 0.56 · -7.75) |
| Short | ribbon | trend-adx-20@m15 | 8 | 0 (0 %) | 25 | 24 % | 0.09 | -66.74 | – |
| Short | sweep | bb-bounce-50-2@m15c | 5 | 0 (0 %) | 99 | 41 % | 0.52 | -81.32 | tp2.2 sl2.2 tr0 h96 sh (21 · 0.63 · -10.80) |
| Short | sweep | z-50-2@m15c | 5 | 0 (0 %) | 99 | 41 % | 0.52 | -81.32 | tp2.2 sl2.2 tr0 h96 sh (21 · 0.63 · -10.80) |
| Short | clamp | macd-cross-19-39-9@m15c | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -91.40 | – |
| Short | follow | r-streak@m15 | 10 | 0 (0 %) | 81 | 49 % | 0.42 | -101.00 | tp2.8 sl5.6 tr0 h96 sh (7 · 0.60 · -7.00) |
| Short | clamp | r-chand-m@m15 | 41 | 0 (0 %) | 41 | 0 % | 0.00 | -112.00 | – |
| Short | sweep | r-clv-thrust-m@m30 | 43 | 8 (19 %) | 129 | 40 % | 0.53 | -120.97 | – |
| Short | sweep | r-fvg@m15c | 43 | 0 (0 %) | 40 | 0 % | 0.00 | -150.72 | – |
| Short | ribbon | r-streak@m15 | 13 | 0 (0 %) | 94 | 38 % | 0.31 | -158.37 | tp2.8 sl5.6 tr0 h64 sh (6 · 0.45 · -9.60) |
| Short | pivot | r-fakeout@m30 | 40 | 0 (0 %) | 52 | 23 % | 0.06 | -162.30 | – |
| Short | clamp | r-fakeout-m@m30 | 52 | 0 (0 %) | 52 | 0 % | 0.00 | -168.90 | – |
| Short | revert | r-donch-vol-m@m30 | 25 | 0 (0 %) | 244 | 51 % | 0.51 | -203.03 | tp2.4 sl4.8 tr1.2 h48 sh (9 · 0.87 · -1.31) |
| General | sweep | willr-21-95@m15 | 14 | 8 (57 %) | 172 | 60 % | 1.37 | 94.73 | tp4.4 sl4.4 tr2.2 h64 gn (13 · 3.49 · 34.75) |
| General | ribbon | willr-7-90@m30 | 5 | 5 (100 %) | 35 | 74 % | 3.26 | 52.69 | tp4.4 sl4.4 tr0 h48 gn (5 · ∞ (no loss) · 21.00) |
| General | sweep | act-burst-2.5@x4@m30 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 24.40 | – |
| General | pulse | ichi-tk-9@m15 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 24.21 | – |
| General | pulse | hma-55@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 20.44 | – |
| General | ribbon | move-impulse-10-2@m15 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 19.20 | – |
| General | revert | r-roofing@m15 | 3 | 3 (100 %) | 27 | 59 % | 1.50 | 16.42 | tp4.4 sl4.4 tr0 h96 gn (9 · 1.83 · 11.40) |
| General | sweep | willr-21-95@m15c | 3 | 2 (67 %) | 23 | 57 % | 1.48 | 14.10 | tp3.6 sl2.7 tr0 h64 gn (8 · 1.95 · 8.30) |
| General | sweep | r-pdhl@m15 | 2 | 2 (100 %) | 8 | 75 % | 2.68 | 12.80 | – |
| General | ribbon | willr-14-95@m30 | 2 | 2 (100 %) | 7 | 71 % | 3.28 | 10.96 | – |
| General | clamp | cci-40-200@x4@m15 | 6 | 5 (83 %) | 7 | 86 % | 3.37 | 10.92 | – |
| General | sweep | r-td-m@m15 | 2 | 2 (100 %) | 6 | 67 % | 7.41 | 7.43 | – |
| General | ribbon | r-valuearea-m@m15 | 7 | 6 (86 %) | 11 | 55 % | 2.73 | 4.77 | – |
| General | sweep | willr-28-95@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.34 | 2.60 | tp3.6 sl3.6 tr0 h96 gn (5 · 1.34 · 2.60) |
| General | magnet | rsi-fast@m30 | 7 | 4 (57 %) | 20 | 35 % | 1.09 | 2.05 | – |
| General | sweep | willr-7-90@m15c | 8 | 1 (13 %) | 66 | 52 % | 1.01 | 1.59 | tp4.4 sl4.4 tr2.2 h96 gn (9 · 2.96 · 27.36) |
| General | pivot | ema-stoch@m30 | 5 | 0 (0 %) | 15 | 67 % | 0.89 | -1.94 | – |
| General | follow | r-pin@m30 | 1 | 0 (0 %) | 6 | 17 % | 0.33 | -6.00 | tp3.2 sl1.6 tr0 h32 gn (6 · 0.33 · -6.00) |
| General | sandwich | cci-40-200@x4@m15 | 6 | 4 (67 %) | 6 | 67 % | 0.33 | -6.16 | – |
| General | snap | cci-40-200@x4@m15 | 6 | 4 (67 %) | 6 | 67 % | 0.33 | -6.16 | – |
| General | pulse | cci-40-200@x4@m15 | 6 | 4 (67 %) | 6 | 67 % | 0.33 | -6.16 | – |
| General | sweep | break-don40@m15 | 4 | 1 (25 %) | 71 | 58 % | 0.93 | -7.67 | tp3.6 sl3.6 tr0 h64 gn (16 · 1.04 · 1.17) |
| General | sandwich | z-50-2.5@x4@m15 | 4 | 2 (50 %) | 10 | 60 % | 0.53 | -8.72 | – |
| General | snap | z-50-2.5@x4@m15 | 4 | 2 (50 %) | 10 | 60 % | 0.53 | -8.72 | – |
| General | pulse | z-50-2.5@x4@m15 | 4 | 2 (50 %) | 10 | 60 % | 0.53 | -8.72 | – |
| General | ribbon | willr-28-95@m30 | 1 | 0 (0 %) | 5 | 20 % | 0.30 | -9.00 | tp4 sl3 tr0 h48 gn (5 · 0.30 · -9.00) |
| General | ribbon | willr-21-95@m30 | 5 | 1 (20 %) | 27 | 41 % | 0.82 | -9.30 | tp4.4 sl3.3 tr0 h48 gn (5 · 0.80 · -2.10) |
| General | sweep | willr-50-95@m15c | 2 | 0 (0 %) | 12 | 42 % | 0.62 | -9.60 | tp3.2 sl3.2 tr0 h96 gn (6 · 0.88 · -1.20) |
| General | pivot | r-chand-m@m15 | 5 | 0 (0 %) | 15 | 47 % | 0.42 | -11.01 | – |
| General | sweep | r-fvg@m15 | 1 | 0 (0 %) | 7 | 29 % | 0.26 | -13.55 | tp4.4 sl4.4 tr3.3 h96 gn (7 · 0.26 · -13.55) |
| General | sweep | willr-28-95@m15 | 2 | 0 (0 %) | 21 | 43 % | 0.67 | -15.80 | tp3.6 sl3.6 tr0 h96 gn (11 · 0.75 · -5.80) |
| General | clamp | r-chand-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -15.80 | – |
| General | sweep | r-td@m30 | 2 | 0 (0 %) | 16 | 38 % | 0.57 | -16.66 | tp4.4 sl3.3 tr0 h48 gn (9 · 0.96 · -0.70) |
| General | clamp | r-streak-m@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.00 | -16.78 | – |
| General | follow | r-streak@m15 | 2 | 0 (0 %) | 15 | 47 % | 0.46 | -18.26 | tp4 sl4 tr3 h96 gn (7 · 0.54 · -7.78) |
| General | pivot | r-streak@m15 | 4 | 0 (0 %) | 12 | 33 % | 0.45 | -18.80 | – |
| General | sandwich | r-zdist@m15c | 23 | 11 (48 %) | 63 | 54 % | 0.80 | -21.71 | – |
| General | snap | r-zdist@m15c | 23 | 11 (48 %) | 63 | 54 % | 0.80 | -21.71 | – |
| General | pulse | r-zdist@m15c | 23 | 11 (48 %) | 63 | 54 % | 0.80 | -21.71 | – |
| General | sweep | r-fvg@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -22.33 | – |
| General | ribbon | r-bb-adx-m@m30 | 8 | 0 (0 %) | 15 | 13 % | 0.00 | -32.73 | – |
| General | revert | r-laguerre@m15c | 2 | 0 (0 %) | 20 | 30 % | 0.39 | -34.40 | tp3.6 sl3.6 tr0 h96 gn (10 · 0.38 · -16.40) |
| General | magnet | break-don40@m15 | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -36.80 | – |
| General | ribbon | r-streak@m15 | 5 | 0 (0 %) | 32 | 38 % | 0.50 | -43.10 | tp4.4 sl4.4 tr0 h96 gn (7 · 0.68 · -5.80) |
| General | sweep | willr-21-95@m30 | 6 | 0 (0 %) | 50 | 44 % | 0.56 | -44.73 | tp3.6 sl3.6 tr0 h48 gn (8 · 0.89 · -1.60) |
| General | sweep | r-clv-thrust-m@m30 | 21 | 3 (14 %) | 63 | 37 % | 0.65 | -45.69 | – |
| General | clamp | r-fakeout-m@m30 | 16 | 0 (0 %) | 16 | 0 % | 0.00 | -46.60 | – |
| General | revert | r-klinger-m@m15c | 6 | 0 (0 %) | 37 | 27 % | 0.42 | -47.20 | tp4 sl3 tr0 h64 gn (6 · 0.59 · -5.20) |
| General | pivot | r-fakeout@m30 | 14 | 0 (0 %) | 14 | 0 % | 0.00 | -49.30 | – |
| General | sweep | willr-14-95@m30 | 6 | 0 (0 %) | 31 | 29 % | 0.37 | -51.08 | tp3.6 sl3.6 tr0 h48 gn (5 · 0.60 · -4.60) |
| General | ribbon | trend-st-21-5@m15c | 2 | 0 (0 %) | 36 | 28 % | 0.35 | -57.78 | tp4 sl3 tr0 h64 gn (19 · 0.36 · -26.59) |
| General | magnet | break-don55@m15 | 8 | 0 (0 %) | 16 | 0 % | 0.00 | -64.40 | – |
| General | pivot | rsi-mid-60-40@m15 | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -71.40 | – |
| General | ribbon | trix-15@m15c | 10 | 2 (20 %) | 179 | 43 % | 0.75 | -84.85 | tp3.6 sl3.6 tr1.8 h64 gn (19 · 1.41 · 8.37) |
| General | ribbon | r-chand-m@m15 | 28 | 3 (11 %) | 28 | 11 % | 0.01 | -87.42 | – |
| General | sweep | willr-28-95@m30 | 21 | 5 (24 %) | 156 | 43 % | 0.58 | -113.47 | tp3.6 sl3.6 tr1.8 h32 gn (9 · 2.14 · 5.01) |
| General | follow | r-pin-m@m30 | 19 | 0 (0 %) | 85 | 25 % | 0.37 | -126.76 | tp4.4 sl3.3 tr0 h32 gn (5 · 0.80 · -2.10) |
| Long | ribbon | r-chand-m@m15 | 38 | 26 (68 %) | 38 | 68 % | 4.09 | 131.78 | – |
| Long | revert | r-awesome-m@m15c | 10 | 10 (100 %) | 69 | 74 % | 2.80 | 122.71 | tp5.6 sl5.6 tr0 h96 lg (6 · 4.66 · 21.20) |
| Long | ribbon | willr-7-90@m30 | 3 | 3 (100 %) | 15 | 100 % | ∞ (no loss) | 87.00 | tp6.4 sl6.4 tr0 h48 lg (5 · ∞ (no loss) · 31.00) |
| Long | pivot | r-sweep-m@m15 | 15 | 13 (87 %) | 51 | 63 % | 1.51 | 52.13 | – |
| Long | sweep | cci-20-200@m15 | 3 | 3 (100 %) | 18 | 78 % | 2.55 | 41.00 | tp6.4 sl6.4 tr4.8 h96 lg (5 · 3.45 · 16.14) |
| Long | ribbon | dir-vwap-240@m15c | 5 | 4 (80 %) | 66 | 52 % | 1.20 | 34.50 | tp6.4 sl6.4 tr0 h64 lg (15 · 1.35 · 12.96) |
| Long | pivot | macd-cross-19-39-9@m30 | 6 | 6 (100 %) | 9 | 67 % | 9.72 | 31.22 | – |
| Long | ribbon | willr-28-95@m15c | 9 | 8 (89 %) | 38 | 76 % | 1.55 | 29.37 | tp5.6 sl5.6 tr2.8 h64 lg (5 · 2.13 · 6.55) |
| Long | sweep | willr-21-95@m15 | 10 | 3 (30 %) | 104 | 55 % | 1.13 | 27.97 | tp4.8 sl4.8 tr2.4 h64 lg (12 · 3.16 · 32.40) |
| Long | revert | r-roofing@m15 | 8 | 4 (50 %) | 65 | 66 % | 1.23 | 25.67 | tp5.6 sl5.6 tr2.8 h96 lg (8 · 2.52 · 8.81) |
| Long | sweep | willr-21-90@m15c | 1 | 1 (100 %) | 14 | 50 % | 2.09 | 22.97 | tp4.8 sl4.8 tr3.6 h64 lg (14 · 2.09 · 22.97) |
| Long | sweep | willr-28-95@m15 | 1 | 1 (100 %) | 11 | 64 % | 2.09 | 21.74 | tp4.8 sl4.8 tr2.4 h96 lg (11 · 2.09 · 21.74) |
| Long | revert | r-vol-regime@m15c | 1 | 1 (100 %) | 23 | 61 % | 1.38 | 19.98 | tp5.6 sl5.6 tr2.8 h96 lg (23 · 1.38 · 19.98) |
| Long | sweep | willr-21-95@m30 | 2 | 2 (100 %) | 13 | 77 % | 2.15 | 17.27 | tp4.8 sl4.8 tr2.4 h48 lg (8 · 3.69 · 13.47) |
| Long | ribbon | willr-21-95@m30 | 4 | 2 (50 %) | 16 | 63 % | 1.49 | 16.80 | – |
| Long | pivot | ichi-tk-20@m30 | 1 | 1 (100 %) | 7 | 71 % | 2.06 | 13.94 | tp6.4 sl6.4 tr0 h32 lg (7 · 2.06 · 13.94) |
| Long | ribbon | r-sweep-m@m15 | 1 | 1 (100 %) | 6 | 83 % | 3.21 | 11.92 | tp5.2 sl5.2 tr2.6 h96 lg (6 · 3.21 · 11.92) |
| Long | sweep | willr-21-95@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.74 | 7.40 | tp6.4 sl4.8 tr0 h64 lg (5 · 1.74 · 7.40) |
| Long | revert | r-choch@m30 | 3 | 2 (67 %) | 28 | 50 % | 1.06 | 5.03 | tp6.4 sl6.4 tr0 h48 lg (9 · 1.17 · 4.60) |
| Long | pivot | willr-50-90@m30 | 4 | 2 (50 %) | 8 | 50 % | 1.16 | 3.40 | – |
| Long | pivot | ema-stoch@m30 | 3 | 2 (67 %) | 7 | 57 % | 0.96 | -0.69 | – |
| Long | sweep | r-td@m30 | 1 | 0 (0 %) | 8 | 38 % | 0.73 | -5.20 | tp4.8 sl3.6 tr0 h48 lg (8 · 0.73 · -5.20) |
| Long | sweep | rsi-7-15-85@m30 | 1 | 0 (0 %) | 5 | 40 % | 0.61 | -5.80 | tp4.8 sl4.8 tr0 h32 lg (5 · 0.61 · -5.80) |
| Long | sweep | willr-7-90@m15c | 1 | 0 (0 %) | 7 | 57 % | 0.64 | -6.28 | tp5.6 sl5.6 tr2.8 h96 lg (7 · 0.64 · -6.28) |
| Long | ribbon | r-valuearea-m@m15 | 15 | 6 (40 %) | 26 | 23 % | 0.46 | -7.48 | – |
| Long | revert | r-laguerre@m15c | 1 | 0 (0 %) | 7 | 43 % | 0.70 | -7.80 | tp6.4 sl6.4 tr0 h96 lg (7 · 0.70 · -7.80) |
| Long | magnet | break-don20@m15 | 4 | 1 (25 %) | 11 | 45 % | 0.70 | -9.34 | – |
| Long | sweep | break-vol@m15 | 8 | 0 (0 %) | 16 | 50 % | 0.74 | -11.95 | – |
| Long | pivot | macd-cross@m30 | 7 | 0 (0 %) | 7 | 0 % | 0.00 | -16.37 | – |
| Long | sweep | willr-14-95@m30 | 3 | 0 (0 %) | 13 | 38 % | 0.51 | -17.48 | tp5.2 sl3.9 tr0 h32 lg (5 · 0.53 · -5.84) |
| Long | sweep | r-fvg@m15c | 10 | 0 (0 %) | 7 | 0 % | 0.00 | -26.13 | – |
| Long | follow | rsi-14-20-80@m30 | 3 | 0 (0 %) | 20 | 20 % | 0.43 | -31.37 | tp6 sl6 tr3 h32 lg (7 · 0.39 · -9.08) |
| Long | revert | rsi-mom-14-20@m30 | 3 | 0 (0 %) | 20 | 20 % | 0.43 | -31.37 | tp6 sl6 tr3 h32 lg (7 · 0.39 · -9.08) |
| Long | sandwich | cci-40-200@x4@m15 | 8 | 2 (25 %) | 8 | 25 % | 0.02 | -35.75 | – |
| Long | snap | cci-40-200@x4@m15 | 8 | 2 (25 %) | 8 | 25 % | 0.02 | -35.75 | – |
| Long | pulse | cci-40-200@x4@m15 | 8 | 2 (25 %) | 8 | 25 % | 0.02 | -35.75 | – |
| Long | pivot | rsi-mid-60-40@m15 | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -36.36 | – |
| Long | ribbon | r-bb-adx-m@m30 | 13 | 0 (0 %) | 16 | 0 % | 0.00 | -36.50 | – |
| Long | sweep | r-fvg@m15 | 8 | 0 (0 %) | 36 | 44 % | 0.65 | -37.21 | tp5.2 sl3.9 tr0 h96 lg (6 · 0.61 · -6.40) |
| Long | sweep | cci-40-200@x4@m15c | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -39.60 | – |
| Long | sweep | willr-28-95@m30 | 6 | 2 (33 %) | 38 | 34 % | 0.49 | -44.85 | tp4.8 sl4.8 tr0 h32 lg (5 · 1.07 · 0.66) |
| Long | clamp | cci-40-200@x4@m15 | 26 | 10 (38 %) | 32 | 50 % | 0.44 | -48.74 | – |
| Long | follow | break-vol-2@x4@m15c | 27 | 5 (19 %) | 27 | 19 % | 0.33 | -49.85 | – |
| Long | ribbon | willr-28-95@m30 | 7 | 1 (14 %) | 29 | 34 % | 0.44 | -51.62 | tp6.4 sl6.4 tr3.2 h48 lg (5 · 1.15 · 0.98) |
| Long | revert | r-donch-vol-m@m30 | 2 | 0 (0 %) | 13 | 8 % | 0.00 | -53.44 | tp6.4 sl4.8 tr0 h32 lg (6 · 0.01 · -24.74) |
| Long | magnet | break-don55@m15 | 10 | 0 (0 %) | 20 | 30 % | 0.27 | -54.92 | – |
| Long | sandwich | willr-14-90@m15 | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -59.60 | – |
| Long | snap | willr-14-90@m15 | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -59.60 | – |
| Long | pulse | willr-14-90@m15 | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -59.60 | – |
| Long | sandwich | willr-14-90@m15c | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -59.60 | – |
| Long | snap | willr-14-90@m15c | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -59.60 | – |
| Long | pulse | willr-14-90@m15c | 5 | 0 (0 %) | 10 | 0 % | 0.00 | -59.60 | – |
| Long | follow | r-streak@m15 | 11 | 2 (18 %) | 84 | 48 % | 0.72 | -59.77 | tp5.6 sl4.2 tr0 h96 lg (8 · 1.23 · 4.00) |
| Long | follow | z-50-2.5@x4@m15c | 5 | 0 (0 %) | 35 | 29 % | 0.46 | -66.86 | tp5.6 sl5.6 tr4.2 h64 lg (7 · 0.49 · -11.94) |
| Long | magnet | break-don40@m15 | 12 | 0 (0 %) | 26 | 23 % | 0.24 | -73.87 | – |
| Long | clamp | macd-cross-19-39-9@m15c | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -74.00 | – |
| Long | sandwich | z-50-2.5@x4@m15 | 8 | 0 (0 %) | 16 | 13 % | 0.01 | -85.35 | – |
| Long | snap | z-50-2.5@x4@m15 | 8 | 0 (0 %) | 16 | 13 % | 0.01 | -85.35 | – |
| Long | pulse | z-50-2.5@x4@m15 | 8 | 0 (0 %) | 16 | 13 % | 0.01 | -85.35 | – |
| Long | sweep | r-clv-thrust-m@m30 | 29 | 8 (28 %) | 87 | 30 % | 0.44 | -139.89 | – |
| Long | follow | r-zdist-m@m15c | 6 | 0 (0 %) | 58 | 22 % | 0.28 | -147.62 | tp5.6 sl5.6 tr2.8 h96 lg (12 · 0.71 · -6.92) |
| Long | ribbon | r-streak@m15 | 20 | 0 (0 %) | 133 | 40 % | 0.61 | -149.09 | tp5.6 sl5.6 tr0 h96 lg (6 · 0.93 · -1.20) |
| Long | revert | r-vwap-reclaim-m@m30 | 4 | 0 (0 %) | 39 | 10 % | 0.11 | -181.81 | tp5.6 sl5.6 tr0 h48 lg (9 · 0.12 · -41.00) |
| Long | pivot | r-streak@m15 | 28 | 0 (0 %) | 76 | 34 % | 0.26 | -185.03 | tp6 sl3 tr0 h96 lg (5 · 0.00 · -16.00) |
| Long | follow | r-pin-m@m30 | 18 | 1 (6 %) | 59 | 22 % | 0.15 | -190.08 | tp6.4 sl3.2 tr0 h32 lg (5 · 0.00 · -17.00) |
| Long | sandwich | r-zdist@m15c | 48 | 0 (0 %) | 108 | 20 % | 0.15 | -351.14 | – |
| Long | snap | r-zdist@m15c | 48 | 0 (0 %) | 108 | 20 % | 0.15 | -351.14 | – |
| Long | pulse | r-zdist@m15c | 48 | 0 (0 %) | 108 | 20 % | 0.15 | -351.14 | – |
| Wide | sweep | cci-40-200@m5c | 11 | 11 (100 %) | 22 | 50 % | 9.32 | 64.07 | – |
| Wide | sweep | z-50-2.5@x4@m5 | 7 | 7 (100 %) | 25 | 72 % | 12.07 | 58.51 | – |
| Wide | magnet | r-zdist@m15 | 3 | 3 (100 %) | 27 | 67 % | 2.43 | 37.47 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (9 · 2.43 · 12.49) |
| Wide | ribbon | hma-55@m15c | 9 | 9 (100 %) | 9 | 100 % | ∞ (no loss) | 18.93 | – |
| Wide | sweep | r-elder@m30 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 16.68 | – |
| Wide | sweep | willr-28-95@m5c | 6 | 6 (100 %) | 12 | 50 % | 11.83 | 13.00 | – |
| Wide | pulse | dir-vwap-120@m15 | 18 | 6 (33 %) | 6 | 100 % | ∞ (no loss) | 5.73 | – |
| Wide | magnet | ema-slope-10@m15c | 4 | 4 (100 %) | 8 | 50 % | 1.23 | 1.29 | – |
| Wide | pivot | r-streak-m@m15 | 4 | 1 (25 %) | 16 | 25 % | 0.97 | -0.60 | – |
| Wide | magnet | ema-slope-20-3@m15c | 6 | 0 (0 %) | 18 | 33 % | 0.75 | -3.65 | – |
| Wide | magnet | dir-emax-5-13@m15c | 4 | 1 (25 %) | 12 | 33 % | 0.64 | -3.97 | – |
| Wide | clamp | r-streak-m@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.68 | -4.93 | – |
| Wide | clamp | macd-cross@m30 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -6.30 | – |
| Wide | sweep | move-impulse-4-1.2@m15 | 3 | 0 (0 %) | 12 | 25 % | 0.49 | -6.68 | – |
| Wide | sandwich | mc-tstreak-4@m5 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -10.36 | – |
| Wide | magnet | r-vwap-reclaim@m1 | 5 | 0 (0 %) | 25 | 32 % | 0.51 | -10.75 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (5 · 0.92 · -0.32) |
| Wide | ribbon | r-camarilla@m15c | 6 | 0 (0 %) | 18 | 17 % | 0.18 | -13.43 | – |
| Wide | magnet | obv-20@m30 | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -18.17 | – |
| Wide | magnet | move-impulse@m15c | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -18.62 | – |
| Wide | ribbon | aroon-25@m30 | 9 | 3 (33 %) | 63 | 29 % | 0.56 | -32.83 | tp1.13 sl1.13 tr0 h16 ax-linear2 axis (7 · 1.24 · 1.86) |
| Wide | revert | dir-reclaim-50@m1c | 4 | 0 (0 %) | 56 | 25 % | 0.10 | -55.91 | tp0.64 sl0.54 tr0 h480 axd-volume2h axis (14 · 0.07 · -10.47) |
| Wide | ribbon | trend-adx-20@m15 | 9 | 0 (0 %) | 21 | 0 % | 0.00 | -67.70 | – |
| Wide | snap | r-qh-flow-m@m1 | 15 | 0 (0 %) | 240 | 25 % | 0.52 | -74.79 | tp0.64 sl0.54 tr0 h480 axd-atr4 axis (16 · 0.93 · -0.66) |
| Wide | ribbon | move-impulse-20-2.5@m30 | 15 | 0 (0 %) | 43 | 0 % | 0.00 | -75.41 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 29 (97 %) | 1449 | 79 % | 2.28 | 2157.87 | tp8 sl24 tr4.8 h96 (22 · 121.02 · 143.66) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 28 (93 %) | 1428 | 79 % | 2.42 | 2141.02 | tp8 sl24 tr4.8 h96 (21 · 185.64 · 130.40) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 30 (100 %) | 1206 | 81 % | 2.78 | 2106.80 | tp8 sl24 tr6.4 h96 (20 · ∞ (no loss) · 141.16) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 819 | 89 % | 5.92 | 2009.72 | tp8 sl24 tr6.4 h96 (15 · 203.41 · 108.66) |
| Signals | follow | sig-swing-s@m15 | 30 | 29 (97 %) | 1198 | 82 % | 2.52 | 1993.38 | tp8 sl24 tr4.8 h96 (24 · 2969.25 · 153.44) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 30 (100 %) | 1190 | 82 % | 2.59 | 1928.39 | tp5 sl15 tr4 h96 (25 · ∞ (no loss) · 115.46) |
| Signals | follow | sig-sar-s@m15 | 30 | 29 (97 %) | 1111 | 81 % | 2.82 | 1909.11 | tp4 sl12 tr0 h96 (32 · 9.66 · 105.60) |
| Signals | follow | sig-kama-m@m15 | 30 | 30 (100 %) | 900 | 84 % | 3.99 | 1891.78 | tp8 sl24 tr6.4 h96 (11 · ∞ (no loss) · 85.80) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 29 (97 %) | 1188 | 80 % | 2.49 | 1890.27 | tp8 sl24 tr6.4 h96 (15 · ∞ (no loss) · 109.67) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 29 (97 %) | 1461 | 78 % | 1.97 | 1883.00 | tp8 sl24 tr4.8 h96 (22 · 121.02 · 143.66) |
| Signals | follow | sig-hma-s@m15 | 30 | 30 (100 %) | 1193 | 82 % | 2.44 | 1879.44 | tp6 sl18 tr0 h96 (20 · ∞ (no loss) · 116.00) |
| Signals | follow | sig-impulse-s@m15 | 30 | 30 (100 %) | 1075 | 82 % | 2.78 | 1845.72 | tp8 sl24 tr4.8 h96 (17 · 57.59 · 110.53) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 864 | 85 % | 3.25 | 1758.34 | tp5 sl15 tr4 h96 (23 · ∞ (no loss) · 101.39) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 30 (100 %) | 1190 | 81 % | 2.27 | 1713.14 | tp8 sl24 tr4.8 h96 (17 · 100.99 · 106.88) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 28 (93 %) | 903 | 82 % | 2.98 | 1669.04 | tp6 sl18 tr4.8 h96 (19 · ∞ (no loss) · 98.78) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 27 (90 %) | 903 | 81 % | 2.71 | 1657.45 | tp6 sl18 tr4.8 h96 (20 · ∞ (no loss) · 110.61) |
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 1136 | 80 % | 2.15 | 1647.10 | tp8 sl24 tr6.4 h96 (20 · 5.55 · 110.06) |
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 1185 | 80 % | 2.21 | 1625.80 | tp8 sl24 tr4.8 h96 (18 · 51.88 · 101.62) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 30 (100 %) | 1238 | 79 % | 2.04 | 1600.84 | tp8 sl24 tr3.2 h96 (31 · 16.19 · 106.36) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 29 (97 %) | 1122 | 78 % | 2.18 | 1575.95 | tp8 sl24 tr6.4 h96 (14 · ∞ (no loss) · 109.20) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 29 (97 %) | 1352 | 79 % | 1.88 | 1571.97 | tp6 sl18 tr0 h96 (17 · ∞ (no loss) · 98.60) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 30 (100 %) | 1209 | 78 % | 2.11 | 1567.48 | tp6 sl12 tr0 h96 (19 · 8.56 · 92.20) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 29 (97 %) | 1201 | 79 % | 1.96 | 1534.21 | tp8 sl24 tr6.4 h96 (17 · 4.84 · 92.91) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 30 (100 %) | 833 | 81 % | 2.91 | 1520.12 | tp8 sl24 tr6.4 h96 (13 · ∞ (no loss) · 101.40) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 30 (100 %) | 818 | 84 % | 2.93 | 1516.86 | tp4 sl12 tr0 h96 (23 · 6.85 · 71.40) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 29 (97 %) | 1006 | 81 % | 2.29 | 1513.05 | tp8 sl24 tr4.8 h96 (20 · 295.05 · 101.08) |
| Signals | follow | sig-sar-m@m15 | 30 | 29 (97 %) | 945 | 80 % | 2.43 | 1484.94 | tp8 sl24 tr6.4 h96 (16 · ∞ (no loss) · 118.41) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 818 | 86 % | 3.02 | 1446.91 | tp4 sl6 tr0 h96 (28 · 5.11 · 76.40) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 29 (97 %) | 1210 | 77 % | 1.89 | 1442.97 | tp8 sl24 tr4.8 h96 (17 · ∞ (no loss) · 104.09) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 30 (100 %) | 656 | 84 % | 4.12 | 1439.58 | tp8 sl24 tr6.4 h96 (11 · ∞ (no loss) · 78.11) |
| Signals | follow | sig-trix-s@m15 | 30 | 30 (100 %) | 616 | 86 % | 4.52 | 1379.07 | tp6 sl18 tr4.8 h96 (14 · ∞ (no loss) · 75.45) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 30 (100 %) | 647 | 86 % | 3.92 | 1378.91 | tp5 sl15 tr4 h96 (17 · ∞ (no loss) · 72.32) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 29 (97 %) | 874 | 80 % | 2.37 | 1366.08 | tp8 sl24 tr6.4 h96 (14 · ∞ (no loss) · 109.20) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 23 (77 %) | 901 | 79 % | 2.32 | 1357.41 | tp6 sl18 tr4.8 h96 (17 · ∞ (no loss) · 93.03) |
| Signals | follow | sig-impulse-m@m15 | 30 | 28 (93 %) | 801 | 80 % | 2.50 | 1344.10 | tp5 sl15 tr4 h96 (21 · ∞ (no loss) · 96.21) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 30 (100 %) | 755 | 84 % | 2.75 | 1338.55 | tp8 sl24 tr4.8 h96 (15 · ∞ (no loss) · 90.66) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 28 (93 %) | 1203 | 79 % | 1.81 | 1329.99 | tp5 sl15 tr3 h96 (33 · 367.19 · 93.83) |
| Signals | follow | sig-cmf-m@m15 | 30 | 30 (100 %) | 760 | 82 % | 2.81 | 1328.60 | tp8 sl24 tr3.2 h96 (23 · 224.22 · 82.40) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 30 (100 %) | 597 | 85 % | 4.80 | 1327.03 | tp4 sl12 tr0 h96 (17 · ∞ (no loss) · 64.60) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 29 (97 %) | 857 | 79 % | 2.41 | 1301.30 | tp8 sl24 tr6.4 h96 (14 · ∞ (no loss) · 88.21) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 30 (100 %) | 691 | 84 % | 2.87 | 1298.40 | tp5 sl15 tr4 h96 (20 · 5.34 · 66.50) |
| Signals | follow | sig-hma-m@m15 | 30 | 30 (100 %) | 682 | 83 % | 3.12 | 1265.51 | tp6 sl18 tr3.6 h96 (16 · ∞ (no loss) · 68.41) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 29 (97 %) | 853 | 79 % | 2.02 | 1213.40 | tp8 sl24 tr6.4 h96 (17 · 5.16 · 100.60) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 30 (100 %) | 491 | 88 % | 4.55 | 1203.56 | tp8 sl24 tr3.2 h96 (15 · 42.43 · 69.40) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 25 (83 %) | 1077 | 75 % | 1.80 | 1197.79 | tp8 sl24 tr4.8 h96 (19 · 19.97 · 111.49) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 30 (100 %) | 502 | 87 % | 4.12 | 1167.23 | tp8 sl24 tr3.2 h96 (15 · ∞ (no loss) · 77.56) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 30 (100 %) | 671 | 83 % | 2.90 | 1164.80 | tp6 sl18 tr3.6 h96 (15 · 470.05 · 75.24) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 30 (100 %) | 492 | 87 % | 4.83 | 1163.48 | tp6 sl12 tr0 h96 (11 · ∞ (no loss) · 63.80) |
| Signals | follow | sig-donchian-m@m15 | 30 | 29 (97 %) | 710 | 82 % | 2.35 | 1156.57 | tp8 sl24 tr3.2 h96 (17 · 874.37 · 81.96) |
| Signals | follow | sig-vwap-m@m15 | 30 | 30 (100 %) | 563 | 87 % | 4.17 | 1135.33 | tp8 sl24 tr3.2 h96 (15 · ∞ (no loss) · 55.78) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 27 (90 %) | 1137 | 75 % | 1.70 | 1134.88 | tp6 sl18 tr0 h96 (17 · ∞ (no loss) · 98.60) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 27 (90 %) | 1137 | 75 % | 1.70 | 1134.88 | tp6 sl18 tr0 h96 (17 · ∞ (no loss) · 98.60) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 25 (83 %) | 898 | 77 % | 1.96 | 1107.84 | tp8 sl24 tr4.8 h96 (12 · ∞ (no loss) · 79.99) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 30 (100 %) | 485 | 88 % | 5.76 | 1102.09 | tp3 sl9 tr0 h96 (19 · ∞ (no loss) · 53.20) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 25 (83 %) | 750 | 79 % | 2.30 | 1075.04 | tp8 sl24 tr6.4 h96 (11 · ∞ (no loss) · 85.80) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 25 (83 %) | 704 | 78 % | 2.10 | 1019.65 | tp6 sl12 tr0 h96 (15 · 6.66 · 69.00) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 29 (97 %) | 493 | 85 % | 3.91 | 1003.44 | tp6 sl18 tr3.6 h96 (12 · 262.04 · 54.76) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 30 (100 %) | 652 | 83 % | 2.23 | 998.58 | tp8 sl24 tr6.4 h96 (13 · 3.87 · 69.40) |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 28 (93 %) | 1005 | 77 % | 1.64 | 997.12 | tp5 sl15 tr0 h96 (21 · 6.32 · 80.80) |
| Signals | follow | sig-donchian-s@m15 | 30 | 28 (93 %) | 891 | 78 % | 1.72 | 993.09 | tp5 sl15 tr4 h96 (22 · 5.93 · 75.99) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 28 (93 %) | 623 | 80 % | 2.29 | 985.02 | tp5 sl15 tr3 h96 (20 · 21.21 · 62.80) |
| Signals | follow | sig-obv-s@m15 | 30 | 28 (93 %) | 901 | 77 % | 1.71 | 963.97 | tp8 sl24 tr4.8 h96 (15 · ∞ (no loss) · 88.83) |
| Signals | follow | sig-cci-s@m15 | 30 | 23 (77 %) | 807 | 76 % | 1.87 | 937.97 | tp6 sl18 tr2.4 h96 (26 · 242.77 · 79.54) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 25 (83 %) | 610 | 79 % | 2.29 | 870.81 | tp6 sl18 tr3.6 h96 (14 · 1085.09 · 64.60) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 30 (100 %) | 355 | 89 % | 4.03 | 850.75 | tp6 sl18 tr2.4 h96 (14 · 822.18 · 50.22) |
| Signals | follow | sig-keltner-s@m15 | 30 | 29 (97 %) | 700 | 79 % | 1.86 | 850.19 | tp6 sl18 tr3.6 h96 (17 · 4.22 · 59.67) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 291 | 94 % | 34.20 | 830.59 | tp4 sl6 tr0 h96 (10 · ∞ (no loss) · 38.00) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 24 (80 %) | 758 | 78 % | 1.78 | 813.42 | tp5 sl15 tr0 h96 (15 · ∞ (no loss) · 72.00) |
| Signals | follow | sig-cmf-s@m15 | 30 | 27 (90 %) | 702 | 77 % | 1.84 | 808.51 | tp6 sl18 tr4.8 h96 (14 · ∞ (no loss) · 75.51) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 23 (77 %) | 536 | 80 % | 2.25 | 806.27 | tp6 sl12 tr0 h96 (10 · ∞ (no loss) · 58.00) |
| Signals | follow | sig-bollinger-s@m15 | 30 | 25 (83 %) | 582 | 79 % | 2.16 | 798.14 | tp4 sl12 tr0 h96 (15 · ∞ (no loss) · 57.00) |
| Signals | follow | sig-zscore-s@m15 | 30 | 25 (83 %) | 582 | 79 % | 2.16 | 798.14 | tp4 sl12 tr0 h96 (15 · ∞ (no loss) · 57.00) |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 27 (90 %) | 399 | 83 % | 3.46 | 795.53 | tp6 sl18 tr3.6 h96 (11 · ∞ (no loss) · 47.38) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 25 (83 %) | 525 | 80 % | 2.16 | 785.93 | tp8 sl24 tr4.8 h96 (10 · ∞ (no loss) · 63.08) |
| Signals | follow | sig-keltner-m@m15 | 30 | 22 (73 %) | 569 | 78 % | 1.99 | 777.72 | tp5 sl15 tr4 h96 (16 · 557.33 · 67.21) |
| Signals | follow | sig-vwap-s@m15 | 30 | 26 (87 %) | 805 | 76 % | 1.59 | 767.74 | tp6 sl18 tr2.4 h96 (26 · 4.17 · 59.28) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 23 (77 %) | 994 | 74 % | 1.46 | 758.37 | tp6 sl18 tr0 h96 (15 · ∞ (no loss) · 87.00) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 23 (77 %) | 916 | 75 % | 1.50 | 745.33 | tp8 sl24 tr6.4 h96 (13 · 19.29 · 88.75) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 25 (83 %) | 780 | 77 % | 1.63 | 732.69 | tp8 sl24 tr4.8 h96 (13 · ∞ (no loss) · 77.80) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 25 (83 %) | 887 | 74 % | 1.51 | 704.47 | tp5 sl15 tr2 h96 (34 · 9.96 · 56.77) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 27 (90 %) | 399 | 84 % | 3.06 | 677.74 | tp4 sl12 tr2.4 h96 (18 · 1016.80 · 46.06) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 26 (87 %) | 693 | 76 % | 1.63 | 671.30 | tp5 sl15 tr4 h96 (17 · ∞ (no loss) · 58.87) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 30 (100 %) | 286 | 84 % | 4.37 | 631.75 | tp8 sl24 tr6.4 h96 (6 · 16.95 · 36.70) |
| Signals | follow | sig-kama-s@m15 | 30 | 25 (83 %) | 1009 | 75 % | 1.35 | 617.36 | tp8 sl24 tr4.8 h96 (14 · 3.16 · 54.52) |
| Signals | follow | sig-obv-m@m15 | 30 | 25 (83 %) | 948 | 76 % | 1.38 | 609.72 | tp8 sl24 tr6.4 h96 (12 · ∞ (no loss) · 93.60) |
| Signals | follow | sig-trix-m@m15 | 30 | 25 (83 %) | 482 | 78 % | 1.86 | 594.09 | tp8 sl24 tr4.8 h96 (10 · ∞ (no loss) · 57.89) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 22 (73 %) | 409 | 74 % | 2.05 | 578.75 | tp8 sl24 tr4.8 h96 (9 · 72.78 · 48.00) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 28 (93 %) | 223 | 84 % | 4.12 | 564.12 | tp8 sl24 tr6.4 h96 (5 · ∞ (no loss) · 39.00) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 27 (90 %) | 295 | 83 % | 2.96 | 560.49 | tp6 sl18 tr2.4 h96 (12 · ∞ (no loss) · 38.78) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 25 (83 %) | 787 | 77 % | 1.42 | 558.72 | tp8 sl24 tr4.8 h96 (10 · ∞ (no loss) · 71.17) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 27 (90 %) | 252 | 81 % | 3.42 | 481.56 | tp6 sl18 tr3.6 h96 (6 · ∞ (no loss) · 30.31) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 28 (93 %) | 439 | 77 % | 1.70 | 481.23 | tp6 sl18 tr0 h96 (10 · 2.87 · 34.00) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 18 (60 %) | 541 | 75 % | 1.52 | 469.20 | tp8 sl24 tr4.8 h96 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 30 (100 %) | 238 | 82 % | 3.62 | 467.60 | tp4 sl12 tr0 h96 (8 · ∞ (no loss) · 30.40) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 30 | 20 (67 %) | 543 | 76 % | 1.43 | 429.62 | tp8 sl24 tr3.2 h96 (12 · ∞ (no loss) · 54.87) |
| Signals | follow | sig-bollinger-m@m15 | 30 | 25 (83 %) | 402 | 75 % | 1.79 | 419.02 | tp8 sl24 tr3.2 h96 (10 · ∞ (no loss) · 43.60) |
| Signals | follow | sig-adx-s@m15 | 30 | 19 (63 %) | 497 | 76 % | 1.35 | 315.24 | tp6 sl18 tr2.4 h96 (18 · 327.15 · 48.82) |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 30 (100 %) | 101 | 98 % | 75.50 | 310.16 | tp3 sl9 tr1.8 h96 (5 · ∞ (no loss) · 11.22) |
| Signals | follow | sig-volume-break-m@m15 | 30 | 30 (100 %) | 114 | 89 % | 10.65 | 304.47 | tp3 sl6 tr0 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-mfi-m@m15 | 30 | 27 (90 %) | 152 | 91 % | 5.49 | 290.90 | tp5 sl15 tr3 h96 (6 · ∞ (no loss) · 20.86) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 19 (63 %) | 450 | 71 % | 1.35 | 273.00 | tp5 sl15 tr4 h96 (12 · ∞ (no loss) · 44.17) |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 21 (70 %) | 258 | 81 % | 1.64 | 271.68 | tp8 sl24 tr3.2 h96 (7 · ∞ (no loss) · 31.62) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 17 (57 %) | 832 | 71 % | 1.16 | 262.36 | tp8 sl24 tr6.4 h96 (11 · 269.01 · 62.52) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 19 (63 %) | 430 | 70 % | 1.32 | 238.13 | tp6 sl18 tr3.6 h96 (10 · ∞ (no loss) · 49.64) |
| Signals | follow | sig-cci-m@m15 | 30 | 23 (77 %) | 444 | 74 % | 1.27 | 229.66 | tp4 sl12 tr0 h96 (12 · 3.43 · 29.60) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 18 (60 %) | 410 | 69 % | 1.32 | 219.17 | tp6 sl18 tr3.6 h96 (10 · ∞ (no loss) · 48.16) |
| Signals | follow | sig-adx-m@m15 | 30 | 21 (70 %) | 368 | 72 % | 1.30 | 216.29 | tp8 sl24 tr6.4 h96 (8 · 2.26 · 30.40) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 15 (50 %) | 455 | 72 % | 1.18 | 170.82 | tp8 sl24 tr4.8 h96 (7 · ∞ (no loss) · 48.23) |
| Signals | follow | sig-rsi-momentum-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 133.50 | – |
| Signals | follow | sig-r-inside-m@m15 | 21 | 21 (100 %) | 55 | 100 % | ∞ (no loss) | 130.31 | – |
| Signals | follow | sig-squeeze-m@m15 | 30 | 17 (57 %) | 117 | 74 % | 1.62 | 119.54 | tp4 sl12 tr1.6 h96 (5 · 8.11 · 8.48) |
| Signals | follow | sig-s2-vol-break-s@m15 | 21 | 21 (100 %) | 57 | 95 % | 364.54 | 116.15 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 3.83) |
| Signals | follow | sig-st-slow-m@m15 | 30 | 20 (67 %) | 182 | 79 % | 1.31 | 114.10 | tp6 sl18 tr3.6 h96 (5 · ∞ (no loss) · 18.54) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 23 (77 %) | 121 | 77 % | 1.64 | 111.36 | tp6 sl18 tr2.4 h96 (5 · 28.46 · 11.42) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 18 | 17 (94 %) | 47 | 87 % | 8.16 | 93.25 | tp3 sl9 tr1.2 h96 (6 · 7.13 · 2.57) |
| Signals | follow | sig-volume-break-s@m15 | 21 | 21 (100 %) | 26 | 100 % | ∞ (no loss) | 54.91 | – |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 17 (57 %) | 385 | 74 % | 1.05 | 42.62 | tp3 sl9 tr0 h96 (14 · 1.83 · 15.20) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 11.79 | – |
| Signals | follow | sig-s2-vwap-axis-s@m15 | 20 | 11 (55 %) | 29 | 62 % | 0.59 | -20.81 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 30 | 8 (27 %) | 162 | 67 % | 0.85 | -62.01 | tp3 sl9 tr1.2 h96 (10 · 1.07 · 0.74) |
| Signals | follow | sig-rsi-reversal-s@m15 | 30 | 9 (30 %) | 152 | 61 % | 0.65 | -163.08 | tp4 sl12 tr2.4 h96 (6 · 1.26 · 3.15) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 5 (17 %) | 361 | 68 % | 0.74 | -271.36 | tp4 sl12 tr1.6 h96 (16 · 1.48 · 11.60) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 30 | 5 (17 %) | 155 | 54 % | 0.49 | -288.84 | tp3 sl9 tr1.2 h96 (9 · 0.78 · -2.28) |
| Signals | follow | sig-zscore-m@m15 | 30 | 3 (10 %) | 405 | 61 % | 0.59 | -579.18 | tp8 sl24 tr6.4 h96 (6 · 1.31 · 7.38) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 118 | 113 (96 %) | 1425 | 91 % | 7.86 | 6800.20 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 118 | 114 (97 %) | 1180 | 91 % | 6.97 | 6689.76 |
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 122 | 120 (98 %) | 2105 | 90 % | 9.64 | 6444.89 |
| Signals | tp 6.000% | sl 3.00× | tr off | 118 | 113 (96 %) | 1386 | 95 % | 5.98 | 6347.14 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 118 | 110 (93 %) | 1576 | 91 % | 5.47 | 6198.61 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 121 | 113 (93 %) | 1974 | 91 % | 4.23 | 5850.76 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 124 | 117 (94 %) | 2802 | 88 % | 5.73 | 5825.58 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 122 | 114 (93 %) | 2002 | 89 % | 4.80 | 5818.57 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 123 | 117 (95 %) | 2383 | 87 % | 4.34 | 5381.23 |
| Signals | tp 5.000% | sl 3.00× | tr off | 118 | 110 (93 %) | 1700 | 91 % | 3.42 | 5281.62 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 124 | 116 (94 %) | 3193 | 85 % | 4.64 | 5185.77 |
| Signals | tp 4.000% | sl 3.00× | tr off | 122 | 117 (96 %) | 2296 | 90 % | 2.83 | 5076.42 |
| Signals | tp 6.000% | sl 2.00× | tr off | 118 | 113 (96 %) | 1520 | 86 % | 2.97 | 5033.62 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 124 | 118 (95 %) | 3052 | 85 % | 2.92 | 4530.79 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 123 | 117 (95 %) | 2572 | 84 % | 2.55 | 4437.86 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 124 | 118 (95 %) | 3806 | 81 % | 2.97 | 4063.11 |
| Signals | tp 5.000% | sl 2.00× | tr off | 118 | 108 (92 %) | 1903 | 81 % | 2.04 | 3791.02 |
| Signals | tp 3.000% | sl 3.00× | tr off | 123 | 107 (87 %) | 3224 | 84 % | 1.60 | 2849.87 |
| Signals | tp 6.000% | sl 1.50× | tr off | 118 | 101 (86 %) | 1867 | 71 % | 1.56 | 2763.31 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 124 | 106 (85 %) | 3519 | 79 % | 1.57 | 2574.19 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 124 | 104 (84 %) | 3964 | 78 % | 1.62 | 2493.19 |
| Signals | tp 4.000% | sl 2.00× | tr off | 123 | 99 (80 %) | 2755 | 76 % | 1.44 | 2421.71 |
| Signals | tp 4.000% | sl 1.50× | tr off | 123 | 98 (80 %) | 3081 | 69 % | 1.36 | 2116.24 |
| Signals | tp 3.000% | sl 2.00× | tr off | 123 | 96 (78 %) | 3735 | 75 % | 1.36 | 2061.00 |
| Signals | tp 5.000% | sl 1.50× | tr off | 119 | 89 (75 %) | 2300 | 68 % | 1.30 | 1713.94 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 124 | 103 (83 %) | 4867 | 76 % | 1.37 | 1546.54 |
| Signals | tp 2.500% | sl 3.00× | tr off | 124 | 87 (70 %) | 3864 | 81 % | 1.24 | 1403.98 |
| Signals | tp 2.500% | sl 2.00× | tr off | 124 | 84 (68 %) | 4395 | 72 % | 1.16 | 1000.28 |
| Signals | tp 3.000% | sl 1.50× | tr off | 123 | 79 (64 %) | 4266 | 65 % | 1.10 | 694.80 |
| Wide | tp 0.760% | sl 0.89× | tr off | 33 | 24 (73 %) | 68 | 51 % | 5.47 | 122.39 |
| Long | tp 4.800% | sl 1.00× | tr 0.50× | 30 | 11 (37 %) | 106 | 65 % | 1.40 | 70.22 |
| General | tp 4.400% | sl 1.00× | tr 0.50× | 43 | 25 (58 %) | 122 | 58 % | 1.26 | 50.86 |
| Short | tp 2.800% | sl 1.50× | tr 0.75× | 46 | 21 (46 %) | 132 | 55 % | 1.22 | 43.99 |
| Short | tp 2.000% | sl 1.00× | tr off | 22 | 10 (45 %) | 51 | 67 % | 1.71 | 25.42 |
| Short | tp 1.800% | sl 2.00× | tr 0.50× | 12 | 10 (83 %) | 22 | 91 % | 3.47 | 18.76 |
| Short | tp 2.400% | sl 2.00× | tr off | 46 | 19 (41 %) | 100 | 70 % | 1.12 | 16.51 |
| General | tp 3.600% | sl 1.00× | tr 0.50× | 30 | 16 (53 %) | 115 | 65 % | 1.11 | 14.60 |
| Short | tp 2.000% | sl 1.00× | tr 0.75× | 21 | 9 (43 %) | 30 | 67 % | 1.66 | 13.51 |
| Short | tp 2.800% | sl 1.50× | tr 0.50× | 39 | 14 (36 %) | 92 | 67 % | 1.11 | 12.27 |
| Short | tp 1.800% | sl 1.50× | tr 0.75× | 8 | 6 (75 %) | 20 | 60 % | 1.91 | 11.03 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 2.500% | sl 1.50× | tr off | 124 | 53 (43 %) | 5063 | 61 % | 0.92 | -652.07 |
| Long | tp 6.400% | sl 0.75× | tr off | 60 | 5 (8 %) | 157 | 22 % | 0.35 | -395.86 |
| Long | tp 6.400% | sl 1.00× | tr off | 73 | 13 (18 %) | 161 | 31 % | 0.44 | -391.74 |
| Long | tp 6.400% | sl 1.00× | tr 0.75× | 64 | 6 (9 %) | 100 | 28 % | 0.31 | -298.02 |
| General | tp 4.000% | sl 1.00× | tr off | 33 | 0 (0 %) | 141 | 35 % | 0.46 | -204.25 |
| Long | tp 6.000% | sl 0.75× | tr off | 33 | 0 (0 %) | 62 | 13 % | 0.19 | -203.89 |
| General | tp 4.000% | sl 0.75× | tr off | 31 | 0 (0 %) | 154 | 28 % | 0.45 | -193.03 |
| Long | tp 5.200% | sl 0.75× | tr off | 36 | 2 (6 %) | 110 | 28 % | 0.47 | -165.24 |
| Long | tp 6.000% | sl 1.00× | tr off | 34 | 6 (18 %) | 100 | 36 % | 0.58 | -151.67 |
| Wide | tp 0.640% | sl 0.84× | tr off | 24 | 0 (0 %) | 321 | 26 % | 0.41 | -141.45 |
| General | tp 4.400% | sl 1.00× | tr 0.75× | 52 | 17 (33 %) | 110 | 50 % | 0.43 | -137.68 |
| Long | tp 6.400% | sl 0.50× | tr off | 27 | 2 (7 %) | 52 | 8 % | 0.15 | -135.72 |
| Long | tp 6.000% | sl 1.00× | tr 0.75× | 32 | 2 (6 %) | 42 | 29 % | 0.24 | -130.57 |
| Long | tp 5.600% | sl 0.75× | tr off | 32 | 2 (6 %) | 60 | 22 % | 0.35 | -129.34 |
| General | tp 4.400% | sl 0.75× | tr off | 30 | 3 (10 %) | 113 | 32 % | 0.54 | -121.68 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 47 (47) | 20296 | 7266 | 7266 | 0 | baseTarget 13030 |
| Micro | trailing | 47 (47) | 40592 | 14532 | 14532 | 0 | baseTarget 26060 |
| Short | normal | 252 (200) | 36900 | 11544 | 11544 | 0 | baseTarget 7536 · baseRange 17820 |
| Short | trailing | 252 (200) | 73800 | 23088 | 23088 | 0 | baseTarget 15072 · baseRange 35640 |
| General | normal | 252 (201) | 24600 | 8142 | 8142 | 0 | baseTarget 4530 · baseRange 11928 |
| General | trailing | 252 (201) | 16400 | 5428 | 5428 | 0 | baseTarget 3020 · baseRange 7952 |
| Long | normal | 252 (224) | 30750 | 12642 | 12642 | 0 | baseTarget 6648 · baseRange 11460 |
| Long | trailing | 252 (224) | 20500 | 8428 | 8428 | 0 | baseTarget 4432 · baseRange 7640 |
| Wide | axis | 299 (299) | 50130 | 50130 | 50130 | 0 | – |
| Wide | dca | 299 (299) | 4456 | 4456 | 4456 | 0 | – |
| Wide | dca-active | 299 (299) | 4456 | 4456 | 4456 | 0 | – |

Engine indications Base evaluated that built no set: 92 (bb-bounce-20-3, dir-emax-20-50, ema-21-55, ha-3, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-brk-10, mc-burst-2, mc-burst-3, mc-engulf-20, mc-ivwapd-2, mc-iz-25, mc-macdh, mc-qrsi2-5, mc-rsi2-10, mc-rsi2-20, mc-rsi2-25, mc-rsi2-30, mc-rsi3-15, mc-rsi3-20, mc-rsi3-25, mc-rsi3-30, mc-rsi4-15, mc-rsi4-20, mc-rsi4-25, mc-rsi4-30, mc-rsi5-25, mc-rsi5-30, mc-rsi7-30, mc-rsi9-30, mc-rsidiv-14, mc-rsit14-25, mc-rsit14-30, mc-rsit2-10, mc-rsit2-20, mc-rsit2-25, mc-rsit3-10, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.27 (246) | 0.40 (500) | 0.32 (588) | 0.51 (666) | 0.61 (1890) |
| 1.14× | – | 0.53 (102) | – | – | – | – | – |
| 1.25× | – | 0.50 (102) | 0.24 (246) | 0.39 (500) | 0.38 (588) | 0.54 (662) | 0.64 (1876) |
| 1.33× | 0.93 (54) | – | – | – | – | – | – |
| 1.5× | 0.88 (54) | 0.45 (102) | 0.29 (246) | 0.41 (498) | 0.35 (586) | 0.50 (664) | 0.65 (1868) |
| 1.75× | 0.81 (54) | 0.54 (102) | 0.34 (246) | 0.37 (498) | 0.36 (586) | 0.55 (664) | 0.62 (1868) |
| 2× | 4.49 (54) | 1.08 (102) | 0.30 (246) | 0.35 (498) | 0.37 (586) | 0.56 (724) | 0.61 (1854) |
| 2.25× | 4.49 (54) | 1.00 (102) | 0.28 (246) | 0.37 (498) | 0.40 (620) | 0.62 (724) | 0.61 (1848) |
| 2.5× | 4.49 (54) | 0.92 (102) | 0.33 (246) | 0.38 (492) | 0.48 (620) | 0.62 (692) | 0.59 (1848) |
| 2.75× | 4.49 (54) | 0.86 (102) | 0.33 (246) | 0.44 (492) | 0.51 (622) | 0.60 (692) | 0.58 (1836) |
| 3× | 4.49 (54) | 0.80 (102) | 0.35 (246) | 0.44 (492) | 0.47 (620) | 0.56 (658) | 0.54 (1836) |
| 3.25× | 4.49 (54) | 0.75 (102) | 0.38 (246) | 0.47 (492) | 0.45 (620) | 0.52 (656) | 0.59 (1836) |
| 3.5× | 4.49 (54) | 0.71 (102) | 0.36 (246) | 0.48 (492) | 0.42 (620) | 0.50 (656) | 0.62 (1818) |
| 3.75× | 4.49 (54) | 0.67 (102) | 0.35 (246) | 0.46 (492) | 0.38 (586) | 0.49 (650) | 0.64 (1818) |
| 4× | 4.49 (54) | 0.64 (102) | 0.33 (246) | 0.43 (492) | 0.37 (580) | 0.59 (654) | 0.60 (1812) |
| 4.25× | 4.49 (54) | 0.60 (102) | 0.32 (246) | 0.41 (492) | 0.36 (582) | 0.57 (654) | 0.63 (1794) |
| 4.5× | 4.49 (54) | 0.58 (102) | 0.31 (246) | 0.40 (492) | 0.39 (582) | 0.54 (654) | 0.71 (1758) |
| 4.75× | 4.49 (54) | 0.55 (102) | 0.30 (246) | 0.38 (492) | 0.37 (582) | 0.54 (686) | 0.73 (1758) |
| 5× | 4.49 (54) | 0.53 (102) | 0.28 (246) | 0.43 (492) | 0.38 (614) | 0.88 (650) | 0.81 (1758) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | 0.73 (12) |
| 1.75× | – | – | – | – | – | 0.60 (12) | 1.12 (18) |
| 2× | – | – | – | – | 0.50 (12) | 0.54 (12) | 1.43 (12) |
| 2.25× | – | – | – | 0.41 (12) | 0.45 (12) | ∞ (12) | ∞ (12) |
| 2.5× | – | – | – | 0.38 (12) | ∞ (12) | ∞ (12) | 1.12 (46) |
| 2.75× | – | – | – | – | ∞ (12) | ∞ (12) | 1.03 (46) |
| 3× | – | – | – | – | – | ∞ (12) | 1.32 (52) |
| 3.25× | – | – | – | – | – | 1.03 (28) | 1.72 (26) |
| 3.5× | – | – | – | ∞ (12) | – | 0.96 (28) | 0.73 (44) |
| 3.75× | – | – | – | ∞ (12) | – | 0.89 (14) | 0.40 (51) |
| 4× | – | – | ∞ (12) | ∞ (12) | – | 0.28 (38) | 0.40 (115) |
| 4.25× | – | – | ∞ (12) | ∞ (12) | – | 0.52 (87) | 0.49 (135) |
| 4.5× | – | ∞ (8) | ∞ (12) | ∞ (12) | 0.18 (27) | 0.45 (99) | 0.60 (131) |
| 4.75× | – | ∞ (8) | ∞ (12) | ∞ (14) | 0.38 (67) | 0.40 (95) | 0.49 (217) |
| 5× | – | ∞ (8) | ∞ (12) | 0.32 (41) | 0.31 (75) | 0.52 (95) | 0.60 (289) |

### Micro — orders executed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | – | – | – | – | – |
| 1.14× | – | – | – | – | – | – | – |
| 1.25× | – | – | – | – | – | – | – |
| 1.33× | – | – | – | – | – | – | – |
| 1.5× | – | – | – | – | – | – | – |
| 1.75× | – | – | – | – | – | – | ∞ (2) |
| 2× | – | – | – | – | – | – | 0.57 (3) |
| 2.25× | – | – | – | – | – | – | 0.77 (8) |
| 2.5× | – | – | – | – | – | – | 0.62 (18) |
| 2.75× | – | – | – | – | – | – | 0.22 (4) |
| 3× | – | – | – | – | – | – | – |
| 3.25× | – | – | – | – | – | – | – |
| 3.5× | – | – | – | ∞ (4) | – | – | – |
| 3.75× | – | – | – | ∞ (2) | – | – | ∞ (2) |
| 4× | – | – | – | – | – | – | 0.38 (14) |
| 4.25× | – | – | – | – | – | – | 1.63 (13) |
| 4.5× | – | – | – | – | – | – | ∞ (8) |
| 4.75× | – | – | – | – | 0.23 (3) | – | 5.38 (7) |
| 5× | – | – | – | – | ∞ (1) | – | 4.78 (23) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.76 (13079) | 0.87 (13105) | 0.87 (12618) | 0.89 (14299) | 0.88 (14410) | 0.88 (14667) |
| 1.5× | 0.86 (12303) | 0.89 (12339) | 0.84 (11827) | 0.84 (13306) | 0.87 (13395) | 0.86 (13541) |
| 2× | 0.85 (11838) | 0.89 (11804) | 0.89 (11223) | 0.91 (12636) | 0.93 (12619) | 0.90 (12611) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.90 (139) | 1.31 (109) | 0.80 (337) | 0.86 (231) | 0.77 (367) | 0.89 (302) |
| 1.5× | 0.93 (147) | 0.74 (112) | 0.79 (317) | 0.80 (329) | 0.88 (327) | 1.11 (367) |
| 2× | 0.99 (150) | 0.80 (192) | 0.82 (279) | 0.96 (283) | 0.84 (384) | 0.85 (389) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.67 (31) | 0.74 (34) | 0.71 (41) | 0.47 (44) | 0.73 (63) | 0.96 (61) |
| 1.5× | 1.02 (36) | 0.90 (34) | 0.73 (52) | 0.74 (44) | 0.81 (44) | 1.59 (48) |
| 2× | 0.51 (30) | 0.63 (41) | 0.65 (44) | 0.97 (30) | 1.21 (40) | 1.22 (38) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.83 (4466) | 0.81 (4380) | 0.77 (4483) | 0.82 (4615) |
| 0.75× | 0.91 (4155) | 0.85 (3996) | 0.74 (4045) | 0.79 (4108) |
| 1× | 0.89 (11924) | 0.87 (11468) | 0.77 (11326) | 0.80 (11260) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.41 (36) | 0.84 (34) | 0.63 (27) | 1.01 (28) |
| 0.75× | 0.84 (45) | 0.67 (55) | 0.45 (154) | 0.54 (113) |
| 1× | 0.81 (256) | 0.83 (306) | 0.56 (366) | 0.78 (328) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 0.00 (2) | 0.00 (2) | 3.45 (3) | 1.75 (8) |
| 0.75× | 0.81 (29) | 0.47 (21) | 0.30 (40) | 0.67 (70) |
| 1× | 0.97 (58) | 0.46 (64) | 0.35 (76) | 1.12 (51) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.80 (4244) | 0.78 (4481) | 0.65 (4385) | 0.61 (4514) | 0.63 (5221) |
| 0.75× | 0.80 (3690) | 0.83 (3759) | 0.70 (3716) | 0.69 (3813) | 0.74 (4385) |
| 1× | 0.88 (10221) | 0.89 (10784) | 0.81 (10647) | 0.72 (10826) | 0.70 (12469) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 0.60 (38) | 0.48 (35) | 0.00 (22) | 0.05 (37) | 0.15 (52) |
| 0.75× | 0.69 (58) | 0.47 (110) | 0.35 (60) | 0.19 (62) | 0.35 (157) |
| 1× | 0.94 (327) | 0.59 (254) | 0.68 (274) | 0.54 (259) | 0.42 (348) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.77 (6) | 0.36 (6) | 0.60 (12) | 0.20 (10) | 1.12 (33) |
| 0.75× | 0.81 (25) | 0.41 (32) | 0.83 (29) | 0.73 (27) | 1.28 (38) |
| 1× | 1.11 (39) | 1.29 (38) | 1.68 (36) | 0.99 (36) | 1.01 (69) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.40 (3770) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.57 (187) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.77 (45228) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.65 (184) | 0.81 (1967) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.68 (180) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.75 (1871) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.80 (1830) | – | – | – | – |
| 1× | – | – | – | 0.64 (188528) | – | – | – | 0.51 (56899) | 0.55 (7233) | – | 0.52 (2665) | – | 0.63 (6846) | 0.61 (6520) | 0.60 (2364) | 0.70 (2158) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.41 (321) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 5.47 (68) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.78 (195) | – | – | – | 0.33 (145) | – | – | – | – | – | – | – | – |

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
