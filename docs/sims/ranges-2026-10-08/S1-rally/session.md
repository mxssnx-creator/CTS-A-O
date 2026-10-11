# Simulated trading session — 20 symbols, 24 h pre-historic + 12 h run (tactics default, signals on)

Real BingX 1m data, timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 1m+, 5m, 5m+, 15m, 15m+, 30m), strategies Normal, Trailing, Axis, signals. Balance $20.00; each order volume unit = 2.0 % of the realized equity at entry ($0.31–$2.22 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-05T03:00 → 2026-10-06T03:00 UTC. Engine: Base 2304/25098 pairs passed (incl. signal pairs) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 290/19072 · PF 1.62 · Micro 80/5900 · PF 2.76 · Minimal 1630/24972 · PF 1.75 · Short 474/8176 · PF 1.65 · General 492/8176 · PF 1.54 · Long 608/8176 · PF 1.51 · Signals 126/126; Main 2380 pairs, 382112 tapes, Real seats: 11436 engine configs + 3750 signal configs (every config of the active signals), compute 394 s. Causal: Base / Main / Real ranked on the history before the run.

**Result (as live sizes it, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $20.00 → $21.60 (8.01 %, closed orders) · equity at end $17.75 (open at end: 29 positions / 8177 orders, MTM -$3.86 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · PF $ 1.22 (gross profit $ ÷ gross loss $ as sized) · PF unit 1.24 (every order at one unit: the engine's PF) · 61 positions / 22285 orders (incl. 2288 capped to $0) · WR 68.04 % · DDT (closed trades, $) 6.63 h · DDR 0.50 · equity max drawdown $3.05 (15.04 %) · margin used max $15.60 · open avg 27.38 pos / 2979.42 orders (peak 32 / 4840)

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 2288 orders capped to $0, 19651 scaled down (open at end: 510 capped, 7626 scaled) · binding: position cap 19808, gross cap 29381. **Without the caps:** balance $20.00 → $66.67 (233.34 %) · PF $ 1.23 · equity at end -$128.63 · equity max drawdown $217.83 (390.48 %) · margin used max $1127.03 · infeasible: margin exceeded equity for 1424 min.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 363 | 2190  | 8.8 % | 1.646 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 363 | 2190 (+0) | 8.8 % | 1.646 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 363 | 2190 (+0) | 8.8 % | 1.646 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 354 | 2070 (-120) | 8.3 % | 1.654 |
| closes ≥ 6 | 1.00 | 6 | 1 | 630 | 2971 (+781) | 11.9 % | 1.974 |
| closes ≥ 20 | 1.00 | 20 | 1 | 237 | 1590 (-600) | 6.4 % | 1.529 |
| closes ≥ 30 | 1.00 | 30 | 1 | 171 | 1217 (-973) | 4.9 % | 1.424 |
| DDR off | 1.00 | 12 | off | 1335 | 4757 (+2567) | 19.0 % | 1.166 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 662 | 3040 (+850) | 12.2 % | 1.420 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 154 | 1061 (-1129) | 4.2 % | 1.976 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 1335 | 4757 (+2567) | 19.0 % | 1.166 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 1874 | 5826 (+3636) | 23.3 % | 1.225 |

## Hour by hour

| hour (UTC) | positions / orders closed | wins / losses | PF $ | PF unit | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 03:00 | 4 / 815 | 506 / 309 | 1.12 | 0.64 | 62 % | $0.07 | $20.07 | $18.53 | $18.33 | 9.63 % | 0.98 | $14.35 | 26 / 1467 |
| 04:00 | 1 / 747 | 388 / 359 | 0.20 | 0.35 | 52 % | -$0.32 | $19.75 | $18.25 | $17.92 | 11.66 % | 1.98 | $14.05 | 27 / 2442 |
| 05:00 | 4 / 335 | 286 / 49 | 2.33 | 4.00 | 85 % | $0.09 | $19.84 | $18.88 | $18.09 | 11.66 % | 2.98 | $13.89 | 25 / 2216 |
| 06:00 | 2 / 232 | 202 / 30 | 7.56 | 2.93 | 87 % | $0.31 | $20.15 | $19.07 | $18.65 | 11.66 % | 3.98 | $14.10 | 28 / 3008 |
| 07:00 | 1 / 455 | 345 / 110 | 1.33 | 1.90 | 76 % | $0.05 | $20.20 | $18.66 | $18.56 | 11.66 % | 4.98 | $14.14 | 29 / 3197 |
| 08:00 | 1 / 481 | 349 / 132 | 1.11 | 3.32 | 73 % | $0.00 | $20.20 | $18.13 | $18.00 | 11.66 % | 5.98 | $14.15 | 29 / 3932 |
| 09:00 | 0 / 396 | 353 / 43 | 20.57 | 43.34 | 89 % | $0.34 | $20.54 | $18.52 | $18.15 | 11.66 % | 6.98 | $14.38 | 30 / 4758 |
| 10:00 | 0 / 639 | 585 / 54 | 3.65 | 4.40 | 92 % | $0.24 | $20.78 | $18.80 | $18.18 | 11.66 % | 7.98 | $14.55 | 30 / 4834 |
| 11:00 | 0 / 278 | 163 / 115 | 0.27 | 0.77 | 59 % | -$0.10 | $20.68 | $18.41 | $18.33 | 11.66 % | 8.98 | $14.55 | 30 / 5812 |
| 12:00 | 0 / 1255 | 910 / 345 | 2.26 | 1.80 | 73 % | $0.30 | $20.98 | $18.06 | $18.04 | 11.66 % | 9.98 | $14.71 | 30 / 6304 |
| 13:00 | 0 / 1433 | 884 / 549 | 1.01 | 0.90 | 62 % | $0.00 | $20.99 | $18.26 | $17.89 | 11.82 % | 10.98 | $14.78 | 30 / 5998 |
| 14:00 | 1 / 1948 | 1107 / 841 | 0.45 | 0.63 | 57 % | -$0.61 | $20.38 | $17.60 | $17.23 | 15.04 % | 11.98 | $14.73 | 31 / 6487 |
| 15:00 | 2 / 1207 | 847 / 360 | 1.60 | 1.78 | 70 % | $0.13 | $20.50 | $17.42 | $17.26 | 15.04 % | 12.98 | $14.37 | 31 / 6188 |
| 16:00 | 0 / 1514 | 1122 / 392 | 1.58 | 1.50 | 74 % | $0.25 | $20.76 | $17.99 | $17.46 | 15.04 % | 13.98 | $14.54 | 32 / 5995 |
| 17:00 | 0 / 538 | 311 / 227 | 2.74 | 0.99 | 58 % | $0.21 | $20.97 | $18.45 | $17.82 | 15.04 % | 14.98 | $14.68 | 32 / 6498 |
| 18:00 | 1 / 1264 | 1112 / 152 | 5.34 | 7.94 | 88 % | $0.41 | $21.38 | $18.97 | $18.21 | 15.04 % | 15.98 | $14.97 | 31 / 6213 |
| 19:00 | 4 / 1141 | 782 / 359 | 1.39 | 1.90 | 69 % | $0.18 | $21.57 | $19.14 | $18.57 | 15.04 % | 16.98 | $15.10 | 29 / 6180 |
| 20:00 | 2 / 1025 | 732 / 293 | 1.22 | 1.24 | 71 % | $0.14 | $21.71 | $19.56 | $18.81 | 15.04 % | 17.98 | $15.23 | 30 / 6046 |
| 21:00 | 0 / 835 | 773 / 62 | 7.90 | 9.82 | 93 % | $0.40 | $22.11 | $19.71 | $19.52 | 15.04 % | 18.98 | $15.48 | 30 / 6608 |
| 22:00 | 0 / 539 | 395 / 144 | 1.54 | 1.62 | 73 % | $0.09 | $22.20 | $19.59 | $19.45 | 15.04 % | 19.98 | $15.54 | 30 / 7289 |
| 23:00 | 0 / 636 | 501 / 135 | 0.79 | 1.18 | 79 % | -$0.07 | $22.13 | $19.72 | $19.28 | 15.04 % | 20.98 | $15.58 | 30 / 8017 |
| 00:00 | 2 / 1576 | 929 / 647 | 0.82 | 0.74 | 59 % | -$0.07 | $22.06 | $18.75 | $18.56 | 15.04 % | 21.98 | $15.60 | 30 / 8213 |
| 01:00 | 3 / 1185 | 601 / 584 | 0.57 | 0.55 | 51 % | -$0.15 | $21.91 | $17.97 | $17.84 | 15.04 % | 22.98 | $15.45 | 29 / 8852 |
| 02:00 | 0 / 1811 | 979 / 832 | 0.59 | 0.67 | 54 % | -$0.30 | $21.60 | $17.75 | $17.37 | 15.04 % | 23.98 | $15.45 | 29 / 8177 |

**Last hour (02:00):** open at end: 29 positions / 8177 orders, MTM -$3.86 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $17.75 = balance $21.60 + MTM -$3.86.

**Hours positive:** 17 of 24 full hours · flat 0 · negative 7

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *PF $* = gross profit $ ÷ gross loss $ as sized (the basis of the $ net); *PF unit* = every order at one unit (the engine's PF); ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · PF $ · net $)

| hour (UTC) | 1m | 1m+ | 5m | 5m+ | 15m | 15m+ | 30m |
|---|---:|---:|---:|---:|---:|---:|---:|
| 03:00 | 60 · 0.54 · -$0.02 | 577 · 1.27 · $0.09 | 7 · 0.17 · -$0.02 | – | 153 · 1.71 · $0.09 | 1 · 0.00 · -$0.02 | 17 · 0.00 · -$0.05 |
| 04:00 | 166 · 0.25 · -$0.01 | 199 · 0.30 · -$0.03 | 99 · 0.11 · -$0.07 | 71 · 4207644552222.90 · $0.01 | 126 · 0.23 · -$0.16 | 25 · 0.01 · -$0.02 | 61 · 0.00 · -$0.02 |
| 05:00 | 75 · 0.55 · -$0.00 | 34 · ∞ (no loss) · $0.01 | 43 · 9691.58 · $0.00 | 65 · 7492.89 · $0.00 | 65 · 5.66 · $0.10 | 14 · 2.27 · $0.00 | 39 · 0.14 · -$0.03 |
| 06:00 | 32 · ∞ (no loss) · $0.00 | 11 · 0.02 · -$0.02 | 40 · 121.20 · $0.00 | 25 · ∞ (no loss) · $0.00 | 115 · 12.42 · $0.32 | 2 · ∞ (no loss) · $0.00 | 7 · 4.03 · $0.00 |
| 07:00 | 23 · 61.78 · $0.06 | 34 · 35.58 · $0.00 | 89 · ∞ (no loss) · $0.04 | 17 · ∞ (no loss) · $0.00 | 277 · 0.68 · -$0.05 | 14 · ∞ (no loss) · $0.01 | 1 · ∞ (no loss) · $0.00 |
| 08:00 | 52 · 285.36 · $0.01 | 186 · 0.76 · -$0.00 | 97 · 3.01 · $0.00 | 46 · 15.14 · $0.00 | 82 · 1.13 · $0.00 | 12 · ∞ (no loss) · $0.00 | 6 · 0.27 · -$0.01 |
| 09:00 | 25 · 0.00 · -$0.00 | 41 · 73.90 · $0.00 | 9 · 0.00 · -$0.00 | 11 · – · $0.00 | 310 · 20.91 · $0.34 | – | – |
| 10:00 | 39 · ∞ (no loss) · $0.01 | 108 · 11.09 · $0.01 | 86 · 134.07 · $0.00 | 22 · ∞ (no loss) · $0.00 | 379 · 2.65 · $0.15 | 1 · ∞ (no loss) · $0.00 | 4 · 6860.79 · $0.07 |
| 11:00 | 78 · 4.85 · $0.00 | 53 · 0.10 · -$0.01 | 14 · 0.81 · -$0.00 | 29 · ∞ (no loss) · $0.00 | 100 · 0.26 · -$0.09 | 3 · 0.00 · -$0.00 | 1 · ∞ (no loss) · $0.00 |
| 12:00 | 122 · 19.84 · $0.10 | 383 · 1.99 · $0.08 | 90 · 1.16 · $0.00 | 69 · 362.86 · $0.03 | 463 · 1.63 · $0.09 | 33 · 0.23 · -$0.00 | 95 · 1.55 · $0.00 |
| 13:00 | 211 · 33.05 · $0.12 | 172 · 0.69 · -$0.04 | 231 · 0.42 · -$0.01 | 152 · 48.04 · $0.03 | 443 · 1.33 · $0.03 | 106 · 1.61 · $0.00 | 118 · 0.01 · -$0.14 |
| 14:00 | 89 · 0.33 · -$0.05 | 590 · 0.28 · -$0.17 | 242 · 0.13 · -$0.11 | 57 · 0.13 · -$0.03 | 858 · 0.62 · -$0.23 | 30 · 1.04 · $0.00 | 82 · 0.08 · -$0.02 |
| 15:00 | 60 · 0.90 · -$0.00 | 163 · 2.25 · $0.06 | 220 · 0.88 · -$0.00 | 125 · 0.74 · -$0.00 | 542 · 1.40 · $0.05 | 29 · 20.51 · $0.00 | 68 · 4.56 · $0.01 |
| 16:00 | 103 · 53.36 · $0.10 | 272 · 2.41 · $0.07 | 203 · 2.54 · $0.02 | 98 · 0.98 · -$0.00 | 715 · 1.14 · $0.05 | 34 · 0.05 · -$0.01 | 89 · 3.45 · $0.03 |
| 17:00 | 21 · 0.34 · -$0.01 | 115 · 2.09 · $0.02 | 20 · 1.22 · $0.00 | 61 · 1.90 · $0.00 | 232 · 4.16 · $0.22 | 78 · 0.09 · -$0.01 | 11 · 0.00 · -$0.00 |
| 18:00 | 36 · 6.60 · $0.04 | 198 · 2.77 · $0.05 | 26 · 17.35 · $0.01 | 46 · 45.94 · $0.00 | 875 · 5.96 · $0.31 | 45 · ∞ (no loss) · $0.01 | 38 · 37.63 · $0.01 |
| 19:00 | 30 · 0.18 · -$0.02 | 324 · 1.07 · $0.00 | 134 · 0.19 · -$0.11 | 70 · 0.16 · -$0.03 | 461 · 2.64 · $0.33 | 68 · 16.45 · $0.01 | 54 · 6.41 · $0.01 |
| 20:00 | 29 · 99.98 · $0.04 | 248 · 7.04 · $0.16 | 33 · 41.36 · $0.03 | 43 · 15.20 · $0.02 | 621 · 0.81 · -$0.12 | 32 · 19.12 · $0.00 | 19 · ∞ (no loss) · $0.01 |
| 21:00 | 39 · ∞ (no loss) · $0.02 | 211 · 18.74 · $0.11 | 15 · ∞ (no loss) · $0.00 | 76 · ∞ (no loss) · $0.03 | 431 · 5.47 · $0.21 | 46 · ∞ (no loss) · $0.02 | 17 · 2.42 · $0.01 |
| 22:00 | 28 · 21.12 · $0.01 | 110 · 2.93 · $0.04 | 59 · ∞ (no loss) · $0.00 | 40 · 0.60 · -$0.01 | 244 · 1.22 · $0.03 | 27 · 6.00 · $0.01 | 31 · 1.69 · $0.01 |
| 23:00 | 23 · 141.70 · $0.00 | 177 · 3.67 · $0.02 | 52 · 4.43 · $0.00 | 65 · 5.00 · $0.02 | 284 · 0.58 · -$0.13 | 19 · 9.41 · $0.01 | 16 · 2.25 · $0.00 |
| 00:00 | 94 · 297.28 · $0.03 | 415 · 0.69 · -$0.02 | 233 · 3.25 · $0.00 | 172 · 0.84 · -$0.00 | 545 · 0.66 · -$0.11 | 62 · 8.79 · $0.02 | 55 · 2.32 · $0.01 |
| 01:00 | 94 · 0.17 · -$0.02 | 285 · 0.51 · -$0.05 | 213 · 2.93 · $0.00 | 88 · 0.34 · -$0.00 | 372 · 0.59 · -$0.09 | 109 · 3.21 · $0.01 | 24 · 0.53 · -$0.00 |
| 02:00 | 94 · 0.79 · -$0.00 | 316 · 0.40 · -$0.06 | 100 · 0.03 · -$0.02 | 112 · 0.16 · -$0.04 | 1006 · 0.68 · -$0.17 | 93 · 1.10 · $0.00 | 90 · 0.28 · -$0.02 |

## Hour by hour per type (orders · PF $ · WR · net $)

The type columns (Normal, Trailing, Signal · Normal, Signal · Trailing) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Signal · Normal | Signal · Trailing | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|
| 03:00 | 815 | 334 · 1.48 · 69 % · $0.08 | 440 · 0.58 · 56 % · -$0.12 | 22 · 1.09 · 64 % · $0.01 | 19 · 110.14 · 84 % · $0.09 | – | 41 · 1.86 · 73 % · $0.10 |
| 04:00 | 747 | 220 · 0.15 · 60 % · -$0.08 | 461 · 0.17 · 52 % · -$0.09 | 44 · 0.21 · 14 % · -$0.15 | 22 · 0.82 · 55 % · -$0.00 | – | 66 · 0.25 · 27 % · -$0.15 |
| 05:00 | 335 | 84 · 1.23 · 93 % · $0.00 | 208 · 0.86 · 84 % · -$0.01 | 15 · 3.60 · 80 % · $0.04 | 28 · 9.44 · 75 % · $0.05 | – | 43 · 5.33 · 77 % · $0.09 |
| 06:00 | 232 | 71 · ∞ (no loss) · 100 % · $0.00 | 51 · 0.15 · 84 % · -$0.02 | 55 · 8.65 · 64 % · $0.22 | 55 · 1528.80 · 96 % · $0.11 | – | 110 · 12.40 · 80 % · $0.32 |
| 07:00 | 455 | 49 · ∞ (no loss) · 100 % · $0.01 | 142 · 33.90 · 93 % · $0.10 | 146 · 0.41 · 52 % · -$0.07 | 118 · 1.63 · 75 % · $0.02 | – | 264 · 0.65 · 62 % · -$0.05 |
| 08:00 | 481 | 22 · 0.28 · 77 % · -$0.00 | 386 · 1.19 · 73 % · $0.00 | 40 · 0.67 · 68 % · -$0.01 | 33 · 46.33 · 73 % · $0.01 | – | 73 · 1.10 · 70 % · $0.00 |
| 09:00 | 396 | 14 · 0.00 · 79 % · -$0.00 | 72 · 21.30 · 61 % · $0.00 | 182 · 10.79 · 98 % · $0.16 | 128 · 569.43 · 93 % · $0.17 | – | 310 · 20.91 · 96 % · $0.34 |
| 10:00 | 639 | 75 · ∞ (no loss) · 100 % · $0.08 | 185 · 19.07 · 96 % · $0.01 | 141 · 1.75 · 87 % · $0.04 | 238 · 3.73 · 89 % · $0.11 | – | 379 · 2.65 · 88 % · $0.15 |
| 11:00 | 278 | 47 · 0.09 · 68 % · -$0.01 | 133 · 0.69 · 47 % · -$0.00 | 62 · 0.21 · 68 % · -$0.09 | 36 · 0.71 · 75 % · -$0.00 | – | 98 · 0.26 · 70 % · -$0.09 |
| 12:00 | 1255 | 292 · 3.43 · 76 % · $0.10 | 563 · 3.03 · 65 % · $0.12 | 206 · 1.48 · 79 % · $0.04 | 194 · 1.88 · 81 % · $0.04 | – | 400 · 1.62 · 80 % · $0.09 |
| 13:00 | 1433 | 331 · 0.22 · 54 % · -$0.13 | 739 · 1.74 · 59 % · $0.10 | 197 · 0.80 · 64 % · -$0.01 | 166 · 58.34 · 87 % · $0.05 | – | 363 · 1.49 · 75 % · $0.04 |
| 14:00 | 1948 | 368 · 0.26 · 48 % · -$0.14 | 753 · 0.24 · 46 % · -$0.24 | 407 · 0.61 · 65 % · -$0.12 | 420 · 0.63 · 76 % · -$0.11 | – | 827 · 0.62 · 71 % · -$0.23 |
| 15:00 | 1207 | 329 · 3.30 · 64 % · $0.05 | 567 · 1.34 · 62 % · $0.02 | 141 · 1.05 · 89 % · $0.00 | 170 · 1.92 · 94 % · $0.05 | – | 311 · 1.42 · 92 % · $0.05 |
| 16:00 | 1514 | 239 · 2.26 · 82 % · $0.05 | 584 · 2.17 · 73 % · $0.12 | 378 · 0.97 · 66 % · -$0.01 | 313 · 1.81 · 79 % · $0.09 | – | 691 · 1.28 · 72 % · $0.08 |
| 17:00 | 538 | 132 · 0.73 · 48 % · -$0.01 | 209 · 0.71 · 44 % · -$0.01 | 84 · 3.97 · 70 % · $0.12 | 113 · 37.76 · 87 % · $0.12 | – | 197 · 6.43 · 80 % · $0.24 |
| 18:00 | 1264 | 152 · 6.30 · 97 % · $0.06 | 258 · 3.79 · 72 % · $0.06 | 462 · 8.81 · 97 % · $0.17 | 392 · 3.91 · 84 % · $0.12 | – | 854 · 5.67 · 91 % · $0.29 |
| 19:00 | 1141 | 359 · 0.54 · 72 % · -$0.07 | 398 · 0.44 · 53 % · -$0.08 | 154 · 2.50 · 79 % · $0.15 | 230 · 2.90 · 83 % · $0.17 | – | 384 · 2.69 · 82 % · $0.33 |
| 20:00 | 1025 | 207 · 5.21 · 76 % · $0.10 | 237 · 34.80 · 74 % · $0.17 | 317 · 0.63 · 65 % · -$0.14 | 264 · 1.02 · 73 % · $0.01 | – | 581 · 0.80 · 69 % · -$0.13 |
| 21:00 | 835 | 151 · 8.92 · 97 % · $0.08 | 262 · 218.47 · 94 % · $0.11 | 147 · 7.53 · 95 % · $0.10 | 275 · 4.46 · 88 % · $0.11 | – | 422 · 5.42 · 90 % · $0.21 |
| 22:00 | 539 | 149 · 2.69 · 91 % · $0.02 | 157 · 2.43 · 64 % · $0.05 | 122 · 0.66 · 61 % · -$0.04 | 111 · 4.35 · 77 % · $0.06 | – | 233 · 1.19 · 68 % · $0.02 |
| 23:00 | 636 | 154 · 3.06 · 86 % · $0.02 | 211 · 7.53 · 79 % · $0.04 | 144 · 1.06 · 81 % · $0.01 | 127 · 0.36 · 66 % · -$0.14 | – | 271 · 0.57 · 74 % · -$0.13 |
| 00:00 | 1576 | 298 · 0.46 · 52 % · -$0.03 | 763 · 2.88 · 58 % · $0.08 | 218 · 0.76 · 66 % · -$0.03 | 297 · 0.50 · 63 % · -$0.09 | – | 515 · 0.62 · 64 % · -$0.12 |
| 01:00 | 1185 | 222 · 0.34 · 36 % · -$0.04 | 610 · 0.68 · 48 % · -$0.03 | 174 · 0.44 · 51 % · -$0.08 | 179 · 0.89 · 79 % · -$0.01 | – | 353 · 0.58 · 65 % · -$0.09 |
| 02:00 | 1811 | 316 · 0.34 · 29 % · -$0.07 | 535 · 0.37 · 40 % · -$0.07 | 544 · 0.58 · 63 % · -$0.14 | 416 · 0.88 · 79 % · -$0.02 | – | 960 · 0.69 · 70 % · -$0.16 |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 24972 engine pairs evaluated, 2178 passed (any range). Each column below is a later stage of the same run: *pool* = every config of the passed pairs (382112 tapes, signals included), Normal / Trailing apart; *seated* = the configs that took a seat (18271); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | seated configs | executed (all types) | executed Normal | executed Trailing | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 03:00 | 124427 · 0.26 | 24743 · 0.38 | 48105 · 0.44 | 2978 · 0.62 | 815 · 0.64 | 334 · 0.77 | 440 · 0.48 | – | 41 · 1.72 |
| 04:00 | 129776 · 0.39 | 26381 · 0.49 | 56345 · 0.48 | 4453 · 0.50 | 747 · 0.35 | 220 · 0.43 | 461 · 0.43 | – | 66 · 0.10 |
| 05:00 | 105114 · 0.92 | 23939 · 1.06 | 44798 · 1.13 | 3784 · 2.30 | 335 · 4.00 | 84 · 4.30 | 208 · 4.84 | – | 43 · 2.09 |
| 06:00 | 135194 · 0.56 | 33069 · 0.64 | 57536 · 0.44 | 5876 · 0.96 | 232 · 2.93 | 71 · ∞ (no loss) | 51 · 3.95 | – | 110 · 2.31 |
| 07:00 | 134368 · 1.07 | 32467 · 1.00 | 64220 · 1.39 | 7221 · 0.80 | 455 · 1.90 | 49 · ∞ (no loss) | 142 · 649.13 | – | 264 · 0.75 |
| 08:00 | 119258 · 0.88 | 25368 · 0.95 | 59585 · 1.16 | 3917 · 1.82 | 481 · 3.32 | 22 · 0.94 | 386 · 11.18 | – | 73 · 2.10 |
| 09:00 | 98585 · 0.47 | 22583 · 0.49 | 47709 · 0.51 | 4615 · 0.80 | 396 · 43.34 | 14 · 1.61 | 72 · 6.50 | – | 310 · 77.44 |
| 10:00 | 112448 · 1.01 | 29245 · 1.03 | 56164 · 1.25 | 5939 · 2.12 | 639 · 4.40 | 75 · ∞ (no loss) | 185 · 55.32 | – | 379 · 3.61 |
| 11:00 | 81423 · 1.25 | 17103 · 1.48 | 43852 · 1.67 | 3062 · 1.26 | 278 · 0.77 | 47 · 0.58 | 133 · 0.65 | – | 98 · 0.91 |
| 12:00 | 187638 · 0.69 | 52043 · 0.80 | 86099 · 0.69 | 9903 · 1.04 | 1255 · 1.80 | 292 · 1.29 | 563 · 1.50 | – | 400 · 2.30 |
| 13:00 | 184908 · 0.59 | 43515 · 0.71 | 89256 · 0.66 | 9488 · 1.05 | 1433 · 0.90 | 331 · 0.46 | 739 · 0.74 | – | 363 · 1.92 |
| 14:00 | 228467 · 0.86 | 57749 · 1.02 | 107769 · 0.91 | 12683 · 0.96 | 1948 · 0.63 | 368 · 0.37 | 753 · 0.34 | – | 827 · 0.79 |
| 15:00 | 193125 · 0.90 | 49450 · 1.00 | 88221 · 0.90 | 10536 · 1.40 | 1207 · 1.78 | 329 · 1.03 | 567 · 0.98 | – | 311 · 6.49 |
| 16:00 | 218528 · 0.58 | 58652 · 0.66 | 109234 · 0.69 | 14462 · 1.03 | 1514 · 1.50 | 239 · 1.42 | 584 · 1.46 | – | 691 · 1.53 |
| 17:00 | 146737 · 0.60 | 37259 · 0.59 | 73519 · 0.55 | 7675 · 1.07 | 538 · 0.99 | 132 · 0.31 | 209 · 0.31 | – | 197 · 2.42 |
| 18:00 | 179203 · 1.24 | 49623 · 1.57 | 93867 · 1.46 | 10708 · 2.72 | 1264 · 7.94 | 152 · 14.99 | 258 · 2.88 | – | 854 · 8.95 |
| 19:00 | 144941 · 0.67 | 39024 · 0.73 | 64881 · 0.73 | 8437 · 1.15 | 1141 · 1.90 | 359 · 1.68 | 398 · 0.68 | – | 384 · 2.84 |
| 20:00 | 172479 · 1.19 | 48372 · 1.61 | 84211 · 1.15 | 10397 · 0.81 | 1025 · 1.24 | 207 · 6.42 | 237 · 5.24 | – | 581 · 0.91 |
| 21:00 | 138776 · 1.25 | 36709 · 1.15 | 68555 · 1.54 | 8306 · 1.38 | 835 · 9.82 | 151 · 14.95 | 262 · 50.24 | – | 422 · 7.10 |
| 22:00 | 118570 · 0.73 | 29899 · 0.86 | 54455 · 0.91 | 5714 · 1.65 | 539 · 1.62 | 149 · 3.86 | 157 · 1.39 | – | 233 · 1.45 |
| 23:00 | 109141 · 0.73 | 32111 · 0.90 | 52261 · 0.72 | 6766 · 0.87 | 636 · 1.18 | 154 · 2.65 | 211 · 2.80 | – | 271 · 0.88 |
| 00:00 | 211285 · 0.83 | 56330 · 0.93 | 100677 · 0.98 | 14089 · 0.61 | 1576 · 0.74 | 298 · 0.61 | 763 · 1.29 | – | 515 · 0.54 |
| 01:00 | 241745 · 0.84 | 62016 · 0.94 | 118728 · 0.82 | 11434 · 0.61 | 1185 · 0.55 | 222 · 0.46 | 610 · 0.53 | – | 353 · 0.63 |
| 02:00 | 228096 · 0.88 | 64945 · 1.12 | 109525 · 1.00 | 14898 · 1.27 | 1811 · 0.67 | 316 · 0.22 | 535 · 0.22 | – | 960 · 1.07 |
| **total** | **3744232 · 0.77** | **952595 · 0.90** | **1779572 · 0.86** | **197341 · 1.04** | **22285 · 1.24** | **4615 · 0.90** | **8924 · 0.98** | **–** | **8746 · 1.49** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 4615 | 3043 / 1572 | 1.08 | 0.90 | $0.09 | 65.94 % | 23.63 |
| Trailing | 8924 | 5455 / 3469 | 1.20 | 0.98 | $0.32 | 61.13 % | 10.47 |
| Signal · Normal | 4402 | 3183 / 1219 | 1.07 | 1.31 | $0.18 | 72.31 % | 8.25 |
| Signal · Trailing | 4344 | 3481 / 863 | 1.59 | 1.75 | $1.01 | 80.13 % | 3.50 |
| total | 22285 | 15162 / 7123 | 1.22 | 1.24 | $1.60 | 68.04 % | 6.63 |
| of which Block-raised | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Signals | 8746 | 6664 / 2082 | 1.27 | 1.49 | $1.19 | 76.19 % | 3.50 |
| of which Engine (no signals) | 13539 | 8498 / 5041 | 1.14 | 0.95 | $0.41 | 62.77 % | 18.08 |

## Timeframe lanes

| lane | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| 1m | 1623 | 2.46 | 0.98 | $0.38 |
| 1m+ | 5222 | 1.24 | 1.00 | $0.33 |
| 5m | 2355 | 0.50 | 0.77 | -$0.22 |
| 5m+ | 1560 | 1.17 | 1.06 | $0.03 |
| 15m | 9699 | 1.25 | 1.44 | $1.17 |
| 15m+ | 883 | 1.40 | 1.58 | $0.04 |
| 30m | 943 | 0.66 | 0.68 | -$0.12 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | PF $ | PF unit | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 52 | 43 / 9 | 0.13 | 0.75 | -$0.06 | 82.69 % | 20.67 |
| Minimal | 11471 | 7347 / 4124 | 1.24 | 0.95 | $0.54 | 64.05 % | 10.65 |
| Short | 1021 | 598 / 423 | 0.91 | 0.83 | -$0.01 | 58.57 % | 23.00 |
| General | 545 | 302 / 243 | 0.88 | 1.17 | -$0.02 | 55.41 % | 21.50 |
| Long | 450 | 208 / 242 | 0.81 | 0.86 | -$0.05 | 46.22 % | 14.25 |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 8746 | 6664 / 2082 | 1.27 | 1.49 | $1.19 | 76.19 % | 3.50 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 68746 | sig:duplicate 29288 · sig:signalPf 13675 · sig:signalCluster 11908 · sig:signalSide 10570 · sig:confirm 3279 · sig:signalGuard 26 |
| Minimal | 52477 | lastN 26261 · engineSide 13970 · duplicate 7914 · symPf 4332 |
| Short | 5836 | lastN 4715 · engineSide 519 · duplicate 320 · symPf 282 |
| Long | 4628 | lastN 3526 · engineSide 468 · duplicate 378 · symPf 256 |
| General | 3227 | lastN 2452 · duplicate 439 · symPf 179 · engineSide 157 |
| Micro | 2397 | crowd 1510 · engineSide 465 · lastN 378 · duplicate 30 · symPf 14 |
| Wide | 1584 | engineSide 716 · lastN 692 · symPf 176 |

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
| Micro | 2.76 | 0.75 | 0.27 | 0.13 | 0.17 | 52 |
| Minimal | 1.75 | 0.95 | 0.55 | 1.24 | 1.29 | 11471 |
| Short | 1.65 | 0.83 | 0.50 | 0.91 | 1.11 | 1021 |
| General | 1.54 | 1.17 | 0.76 | 0.88 | 0.75 | 545 |
| Long | 1.51 | 0.86 | 0.57 | 0.81 | 0.94 | 450 |
| Wide | 1.62 | – | – | – | – | 0 |
| Signals | – | 1.49 | – | 1.27 | 0.85 | 8746 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (14637 of 276420 evaluated, 378332 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (1822 units active at the run start, 3338 over the run, 3634 of 3780 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 574 | 243 (42 %) | 1477 | 78 % | 0.55 | -332.38 |
| Micro | trailing | 468 | 221 (47 %) | 1192 | 65 % | 1.33 | 75.65 |
| Minimal | normal | 3154 | 1194 (38 %) | 42037 | 71 % | 0.84 | -6508.28 |
| Minimal | trailing | 5910 | 2312 (39 %) | 82116 | 62 % | 0.85 | -9798.64 |
| Short | normal | 588 | 230 (39 %) | 1187 | 64 % | 1.13 | 190.30 |
| Short | trailing | 1239 | 474 (38 %) | 2999 | 62 % | 0.86 | -471.70 |
| General | normal | 508 | 252 (50 %) | 1526 | 55 % | 1.45 | 911.42 |
| General | trailing | 366 | 140 (38 %) | 1181 | 57 % | 1.05 | 85.74 |
| Long | normal | 835 | 324 (39 %) | 2508 | 45 % | 1.04 | 232.25 |
| Long | trailing | 479 | 160 (33 %) | 1577 | 58 % | 0.98 | -49.41 |
| Wide | axis | 516 | 143 (28 %) | 3706 | 33 % | 0.46 | -1807.76 |
| Signals | normal | 1821 | 1007 (55 %) | 28579 | 70 % | 1.11 | 6590.56 |
| Signals | trailing | 1813 | 1362 (75 %) | 27256 | 79 % | 1.50 | 20577.16 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1042 | 464 (45 %) | 2669 | 72 % | 0.74 | -256.73 |
| Minimal | active | 1755 | 950 (54 %) | 10219 | 63 % | 0.91 | -815.28 |
| Minimal | bollinger | 126 | 94 (75 %) | 466 | 76 % | 3.72 | 363.21 |
| Minimal | break | 712 | 184 (26 %) | 3538 | 59 % | 0.66 | -1127.71 |
| Minimal | channel | 198 | 54 (27 %) | 1349 | 59 % | 0.70 | -402.55 |
| Minimal | direction | 576 | 184 (32 %) | 12189 | 66 % | 0.84 | -1824.10 |
| Minimal | ema | 932 | 296 (32 %) | 21451 | 66 % | 0.84 | -2926.36 |
| Minimal | ichimoku | 202 | 111 (55 %) | 10359 | 69 % | 1.00 | 10.33 |
| Minimal | macd | 173 | 35 (20 %) | 4283 | 63 % | 0.80 | -704.95 |
| Minimal | move | 793 | 474 (60 %) | 4952 | 70 % | 0.98 | -58.74 |
| Minimal | osc | 734 | 192 (26 %) | 7665 | 59 % | 0.69 | -1974.93 |
| Minimal | rsi | 244 | 91 (37 %) | 2149 | 54 % | 0.71 | -593.79 |
| Minimal | sar | 157 | 37 (24 %) | 95 | 72 % | 1.88 | 31.86 |
| Minimal | smooth | 731 | 151 (21 %) | 7852 | 64 % | 0.80 | -1416.48 |
| Minimal | trend | 1483 | 575 (39 %) | 33359 | 64 % | 0.84 | -4552.10 |
| Minimal | volume | 248 | 78 (31 %) | 4227 | 70 % | 0.92 | -315.36 |
| Short | active | 73 | 4 (5 %) | 344 | 46 % | 0.37 | -462.71 |
| Short | bollinger | 75 | 68 (91 %) | 174 | 78 % | 13.21 | 346.19 |
| Short | break | 466 | 130 (28 %) | 883 | 59 % | 0.76 | -274.37 |
| Short | channel | 71 | 28 (39 %) | 86 | 76 % | 1.85 | 49.35 |
| Short | direction | 103 | 33 (32 %) | 182 | 77 % | 2.10 | 122.28 |
| Short | ema | 44 | 38 (86 %) | 62 | 90 % | 13.95 | 72.02 |
| Short | ichimoku | 5 | 5 (100 %) | 31 | 58 % | 1.63 | 17.38 |
| Short | macd | 29 | 13 (45 %) | 100 | 61 % | 0.86 | -11.80 |
| Short | move | 380 | 199 (52 %) | 753 | 72 % | 1.71 | 381.12 |
| Short | osc | 98 | 13 (13 %) | 117 | 41 % | 0.42 | -140.13 |
| Short | rsi | 125 | 18 (14 %) | 381 | 39 % | 0.35 | -529.42 |
| Short | sar | 4 | 0 (0 %) | 6 | 0 % | 0.00 | -7.33 |
| Short | smooth | 19 | 4 (21 %) | 4 | 100 % | ∞ (no loss) | 6.80 |
| Short | trend | 194 | 129 (66 %) | 949 | 71 % | 1.31 | 296.99 |
| Short | volume | 141 | 22 (16 %) | 114 | 44 % | 0.33 | -147.77 |
| General | active | 11 | 2 (18 %) | 43 | 23 % | 0.28 | -84.69 |
| General | bollinger | 4 | 0 (0 %) | 27 | 37 % | 0.52 | -27.90 |
| General | break | 168 | 35 (21 %) | 298 | 48 % | 0.78 | -117.04 |
| General | channel | 62 | 20 (32 %) | 104 | 51 % | 1.06 | 9.72 |
| General | direction | 61 | 42 (69 %) | 209 | 67 % | 2.38 | 247.91 |
| General | ema | 83 | 78 (94 %) | 252 | 74 % | 3.18 | 405.15 |
| General | macd | 32 | 26 (81 %) | 149 | 59 % | 1.93 | 135.29 |
| General | move | 98 | 68 (69 %) | 260 | 67 % | 1.82 | 240.09 |
| General | osc | 80 | 23 (29 %) | 150 | 49 % | 0.85 | -38.16 |
| General | rsi | 49 | 10 (20 %) | 233 | 27 % | 0.38 | -286.07 |
| General | sar | 1 | 0 (0 %) | 2 | 50 % | 0.03 | -4.44 |
| General | smooth | 35 | 11 (31 %) | 195 | 67 % | 1.62 | 152.97 |
| General | trend | 92 | 69 (75 %) | 544 | 61 % | 1.83 | 495.29 |
| General | volume | 98 | 8 (8 %) | 241 | 42 % | 0.74 | -130.97 |
| Long | active | 29 | 2 (7 %) | 52 | 13 % | 0.18 | -166.40 |
| Long | bollinger | 1 | 0 (0 %) | 18 | 33 % | 0.63 | -16.18 |
| Long | break | 262 | 50 (19 %) | 302 | 39 % | 0.70 | -224.62 |
| Long | channel | 122 | 40 (33 %) | 229 | 45 % | 0.98 | -12.03 |
| Long | direction | 51 | 39 (76 %) | 327 | 60 % | 2.11 | 493.76 |
| Long | ema | 154 | 90 (58 %) | 895 | 53 % | 1.05 | 105.73 |
| Long | ichimoku | 1 | 1 (100 %) | 5 | 60 % | 4.59 | 24.24 |
| Long | macd | 17 | 16 (94 %) | 88 | 64 % | 2.60 | 150.11 |
| Long | move | 257 | 68 (26 %) | 590 | 36 % | 0.57 | -711.92 |
| Long | osc | 60 | 34 (57 %) | 104 | 48 % | 0.81 | -43.59 |
| Long | rsi | 42 | 3 (7 %) | 250 | 50 % | 0.44 | -330.48 |
| Long | smooth | 86 | 24 (28 %) | 237 | 59 % | 1.63 | 254.10 |
| Long | trend | 125 | 104 (83 %) | 826 | 59 % | 1.61 | 881.52 |
| Long | volume | 107 | 13 (12 %) | 162 | 31 % | 0.52 | -221.40 |
| Wide | active | 48 | 30 (63 %) | 150 | 50 % | 0.95 | -4.23 |
| Wide | break | 34 | 0 (0 %) | 125 | 30 % | 0.12 | -343.52 |
| Wide | channel | 9 | 0 (0 %) | 12 | 25 % | 0.28 | -5.31 |
| Wide | direction | 23 | 10 (43 %) | 226 | 38 % | 0.63 | -70.83 |
| Wide | ema | 62 | 7 (11 %) | 824 | 21 % | 0.25 | -777.42 |
| Wide | ichimoku | 3 | 0 (0 %) | 93 | 26 % | 0.40 | -26.42 |
| Wide | macd | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -4.19 |
| Wide | move | 129 | 50 (39 %) | 491 | 32 % | 0.56 | -177.23 |
| Wide | osc | 57 | 24 (42 %) | 781 | 42 % | 0.81 | -70.17 |
| Wide | rsi | 27 | 0 (0 %) | 78 | 12 % | 0.08 | -98.14 |
| Wide | sar | 18 | 0 (0 %) | 51 | 35 % | 0.29 | -37.73 |
| Wide | smooth | 32 | 3 (9 %) | 96 | 34 % | 0.55 | -31.24 |
| Wide | trend | 55 | 12 (22 %) | 723 | 37 % | 0.69 | -168.89 |
| Wide | volume | 16 | 7 (44 %) | 53 | 51 % | 1.29 | 7.58 |
| Signals | signal:act-burst | 60 | 22 (37 %) | 1130 | 67 % | 0.85 | -387.60 |
| Signals | signal:act-hf | 60 | 31 (52 %) | 1450 | 70 % | 1.00 | -9.40 |
| Signals | signal:adx | 60 | 28 (47 %) | 567 | 65 % | 0.83 | -249.87 |
| Signals | signal:atr-break | 60 | 50 (83 %) | 1129 | 76 % | 1.54 | 895.95 |
| Signals | signal:bollinger | 60 | 35 (58 %) | 799 | 74 % | 1.09 | 149.98 |
| Signals | signal:cci | 60 | 38 (63 %) | 920 | 73 % | 1.18 | 321.84 |
| Signals | signal:cmf | 60 | 52 (87 %) | 1334 | 77 % | 1.43 | 915.86 |
| Signals | signal:donchian | 60 | 51 (85 %) | 839 | 79 % | 1.72 | 871.57 |
| Signals | signal:ema-cross | 60 | 45 (75 %) | 496 | 76 % | 1.62 | 471.90 |
| Signals | signal:ema-cross-fast | 60 | 29 (48 %) | 1104 | 73 % | 1.19 | 463.09 |
| Signals | signal:ema-pullback | 60 | 36 (60 %) | 1039 | 73 % | 1.04 | 95.74 |
| Signals | signal:ema-slope | 60 | 21 (35 %) | 639 | 65 % | 0.77 | -400.34 |
| Signals | signal:ema-trend | 60 | 22 (37 %) | 957 | 70 % | 0.89 | -268.98 |
| Signals | signal:heikin-ashi | 60 | 54 (90 %) | 1899 | 77 % | 1.62 | 1674.77 |
| Signals | signal:hma | 60 | 39 (65 %) | 1239 | 74 % | 1.21 | 503.16 |
| Signals | signal:ichimoku | 60 | 28 (47 %) | 688 | 73 % | 1.03 | 44.91 |
| Signals | signal:impulse | 60 | 53 (88 %) | 1280 | 79 % | 1.88 | 1495.25 |
| Signals | signal:kama | 60 | 43 (72 %) | 1452 | 75 % | 1.23 | 655.06 |
| Signals | signal:keltner | 60 | 30 (50 %) | 639 | 74 % | 0.92 | -120.59 |
| Signals | signal:macd-cross | 60 | 50 (83 %) | 1515 | 76 % | 1.47 | 1163.73 |
| Signals | signal:macd-hist | 60 | 47 (78 %) | 1780 | 75 % | 1.42 | 1209.82 |
| Signals | signal:macd-slow | 60 | 44 (73 %) | 1406 | 76 % | 1.33 | 844.07 |
| Signals | signal:mfi | 53 | 35 (66 %) | 102 | 74 % | 1.41 | 59.07 |
| Signals | signal:obv | 60 | 31 (52 %) | 1081 | 72 % | 1.03 | 70.95 |
| Signals | signal:r-awesome | 60 | 50 (83 %) | 1075 | 77 % | 1.65 | 933.66 |
| Signals | signal:r-connors | 60 | 25 (42 %) | 431 | 68 % | 0.86 | -146.51 |
| Signals | signal:r-fractal | 60 | 59 (98 %) | 827 | 83 % | 2.82 | 1357.10 |
| Signals | signal:r-inside | 60 | 60 (100 %) | 191 | 95 % | 458.61 | 631.86 |
| Signals | signal:r-linreg | 60 | 31 (52 %) | 1163 | 71 % | 0.99 | -25.30 |
| Signals | signal:r-nr-break | 60 | 34 (57 %) | 1371 | 73 % | 1.08 | 225.07 |
| Signals | signal:r-session-trend | 60 | 38 (63 %) | 478 | 77 % | 1.27 | 247.82 |
| Signals | signal:r-vol-regime | 60 | 59 (98 %) | 376 | 90 % | 10.01 | 900.36 |
| Signals | signal:reclaim | 60 | 21 (35 %) | 1273 | 68 % | 0.91 | -275.68 |
| Signals | signal:rsi-mid | 60 | 44 (73 %) | 1353 | 78 % | 1.53 | 1134.64 |
| Signals | signal:rsi-momentum | 30 | 25 (83 %) | 126 | 79 % | 3.42 | 237.84 |
| Signals | signal:rsi-reversal | 55 | 28 (51 %) | 180 | 73 % | 1.17 | 64.14 |
| Signals | signal:s2-active-hf | 60 | 29 (48 %) | 1664 | 68 % | 0.94 | -203.12 |
| Signals | signal:s2-adx-gate | 60 | 35 (58 %) | 887 | 75 % | 1.20 | 359.90 |
| Signals | signal:s2-atr-break | 60 | 57 (95 %) | 1115 | 78 % | 1.94 | 1265.34 |
| Signals | signal:s2-bb-bounce | 58 | 9 (16 %) | 244 | 55 % | 0.56 | -327.20 |
| Signals | signal:s2-block-scale | 60 | 42 (70 %) | 1782 | 73 % | 1.25 | 813.70 |
| Signals | signal:s2-block-stack | 60 | 53 (88 %) | 797 | 80 % | 1.93 | 1000.89 |
| Signals | signal:s2-confluence | 60 | 26 (43 %) | 1063 | 70 % | 0.91 | -213.70 |
| Signals | signal:s2-ema-cross | 28 | 12 (43 %) | 66 | 64 % | 0.69 | -38.72 |
| Signals | signal:s2-range-break | 60 | 51 (85 %) | 464 | 78 % | 1.86 | 535.92 |
| Signals | signal:s2-range-shift | 60 | 55 (92 %) | 808 | 83 % | 2.74 | 1270.73 |
| Signals | signal:s2-rsi-revert | 58 | 32 (55 %) | 320 | 73 % | 1.35 | 190.68 |
| Signals | signal:s2-st-trail | 60 | 21 (35 %) | 557 | 67 % | 0.83 | -266.56 |
| Signals | signal:s2-stoch-swing | 60 | 46 (77 %) | 855 | 76 % | 1.55 | 747.40 |
| Signals | signal:s2-vol-break | 58 | 33 (57 %) | 198 | 71 % | 1.06 | 20.86 |
| Signals | signal:sar | 60 | 46 (77 %) | 1569 | 75 % | 1.32 | 897.08 |
| Signals | signal:squeeze | 60 | 34 (57 %) | 163 | 67 % | 0.65 | -187.71 |
| Signals | signal:st-slow | 60 | 35 (58 %) | 477 | 70 % | 0.91 | -120.17 |
| Signals | signal:stoch-rsi | 60 | 37 (62 %) | 1561 | 74 % | 1.20 | 591.88 |
| Signals | signal:supertrend | 60 | 54 (90 %) | 713 | 81 % | 1.89 | 913.06 |
| Signals | signal:swing | 60 | 60 (100 %) | 1384 | 82 % | 2.46 | 2157.25 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1359 | 81 % | 1.91 | 1660.05 |
| Signals | signal:trix | 60 | 18 (30 %) | 592 | 68 % | 0.84 | -252.92 |
| Signals | signal:volume-break | 58 | 43 (74 %) | 154 | 73 % | 1.59 | 118.23 |
| Signals | signal:vwap | 60 | 28 (47 %) | 861 | 70 % | 0.98 | -36.26 |
| Signals | signal:williams-r | 60 | 34 (57 %) | 1169 | 74 % | 1.20 | 432.91 |
| Signals | signal:zscore | 56 | 31 (55 %) | 685 | 73 % | 1.06 | 83.26 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its range's minimum (stage 1.05; micro 1.05, minimal 1.05, short 1.05, general 1.05, long 1.05), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 5 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.05, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 15 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss counts at the engine's placeholder 4).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 55086 | 20394 | 1042 | 0.87 | 4.00 | 70.00–163.33 (median 163.33) | 2550 | 10073 | 437 | 1773 | 2931 | 75 | 1452 | 0 | 61 | 0 | 0 | 0 | 34692 |  |
| Minimal | 119503 | 95263 | 9064 | 1.30 | 2.59 | 18.00–163.33 (median 70.00) | 7051 | 22278 | 3726 | 22608 | 11605 | 4947 | 12819 | 87 | 1070 | 8 | 0 | 0 | 24240 |  |
| Short | 37844 | 29744 | 1827 | 1.34 | 2.40 | 163.33–163.33 (median 163.33) | 4015 | 5314 | 1101 | 5895 | 3558 | 1565 | 6216 | 24 | 229 | 0 | 0 | 0 | 8100 |  |
| General | 15510 | 12510 | 874 | 1.32 | 2.05 | 163.33–163.33 (median 163.33) | 1317 | 1800 | 572 | 2697 | 1286 | 670 | 3090 | 0 | 172 | 32 | 0 | 0 | 3000 |  |
| Long | 24249 | 20499 | 1314 | 1.26 | 2.08 | 163.33–163.33 (median 163.33) | 2236 | 3285 | 1031 | 5241 | 2183 | 1246 | 3594 | 0 | 282 | 87 | 0 | 0 | 3750 |  |
| Wide | 126140 | 98010 | 516 | 0.63 | 2.38 | 18.00–163.33 (median 163.33) | 24249 | 59989 | 1629 | 6314 | 2424 | 344 | 2156 | 0 | 292 | 97 | 0 | 19040 | 9090 |  |
| Signals | 3780 | – | 1822 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 3780 signal tapes, 1822 units (pair × symbol × direction) active at the run start, 3338 over the run; 3634 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 18377 | 3867 (21 %) | 198096 | 67 % | 0.39 | -53223.11 |
| Micro | trailing | 36709 | 7669 (21 %) | 406153 | 54 % | 0.38 | -100665.85 |
| Minimal | normal | 39827 | 13359 (34 %) | 504212 | 67 % | 0.77 | -106562.86 |
| Minimal | trailing | 79676 | 28832 (36 %) | 1089412 | 59 % | 0.82 | -139401.88 |
| Short | normal | 12635 | 5738 (45 %) | 70470 | 63 % | 1.09 | 7405.78 |
| Short | trailing | 25209 | 11665 (46 %) | 149859 | 61 % | 1.04 | 5855.79 |
| General | normal | 9301 | 4614 (50 %) | 52741 | 48 % | 1.20 | 15291.99 |
| General | trailing | 6209 | 2832 (46 %) | 34136 | 59 % | 1.12 | 5608.59 |
| Long | normal | 14550 | 6936 (48 %) | 67196 | 45 % | 1.10 | 14615.18 |
| Long | trailing | 9699 | 4377 (45 %) | 44840 | 59 % | 1.06 | 4911.26 |
| Wide | axis | 107100 | 17602 (16 %) | 841803 | 29 % | 0.45 | -376201.75 |
| Wide | dca | 9520 | 2886 (30 %) | 114263 | 70 % | 0.65 | -46194.80 |
| Wide | dca-active | 9520 | 1473 (15 %) | 55999 | 39 % | 0.56 | -18969.99 |
| Signals | normal | 1890 | 1290 (68 %) | 59880 | 71 % | 1.21 | 25685.44 |
| Signals | trailing | 1890 | 1534 (81 %) | 55172 | 79 % | 1.55 | 45373.96 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 1042 | 464 (45 %) | 2669 | 72 % | 0.74 | -256.73 |
| Minimal | active | 1755 | 950 (54 %) | 10219 | 63 % | 0.91 | -815.28 |
| Minimal | bollinger | 126 | 94 (75 %) | 466 | 76 % | 3.72 | 363.21 |
| Minimal | break | 712 | 184 (26 %) | 3538 | 59 % | 0.66 | -1127.71 |
| Minimal | channel | 198 | 54 (27 %) | 1349 | 59 % | 0.70 | -402.55 |
| Minimal | direction | 576 | 184 (32 %) | 12189 | 66 % | 0.84 | -1824.10 |
| Minimal | ema | 932 | 296 (32 %) | 21451 | 66 % | 0.84 | -2926.36 |
| Minimal | ichimoku | 202 | 111 (55 %) | 10359 | 69 % | 1.00 | 10.33 |
| Minimal | macd | 173 | 35 (20 %) | 4283 | 63 % | 0.80 | -704.95 |
| Minimal | move | 793 | 474 (60 %) | 4952 | 70 % | 0.98 | -58.74 |
| Minimal | osc | 734 | 192 (26 %) | 7665 | 59 % | 0.69 | -1974.93 |
| Minimal | rsi | 244 | 91 (37 %) | 2149 | 54 % | 0.71 | -593.79 |
| Minimal | sar | 157 | 37 (24 %) | 95 | 72 % | 1.88 | 31.86 |
| Minimal | smooth | 731 | 151 (21 %) | 7852 | 64 % | 0.80 | -1416.48 |
| Minimal | trend | 1483 | 575 (39 %) | 33359 | 64 % | 0.84 | -4552.10 |
| Minimal | volume | 248 | 78 (31 %) | 4227 | 70 % | 0.92 | -315.36 |
| Short | active | 73 | 4 (5 %) | 344 | 46 % | 0.37 | -462.71 |
| Short | bollinger | 75 | 68 (91 %) | 174 | 78 % | 13.21 | 346.19 |
| Short | break | 466 | 130 (28 %) | 883 | 59 % | 0.76 | -274.37 |
| Short | channel | 71 | 28 (39 %) | 86 | 76 % | 1.85 | 49.35 |
| Short | direction | 103 | 33 (32 %) | 182 | 77 % | 2.10 | 122.28 |
| Short | ema | 44 | 38 (86 %) | 62 | 90 % | 13.95 | 72.02 |
| Short | ichimoku | 5 | 5 (100 %) | 31 | 58 % | 1.63 | 17.38 |
| Short | macd | 29 | 13 (45 %) | 100 | 61 % | 0.86 | -11.80 |
| Short | move | 380 | 199 (52 %) | 753 | 72 % | 1.71 | 381.12 |
| Short | osc | 98 | 13 (13 %) | 117 | 41 % | 0.42 | -140.13 |
| Short | rsi | 125 | 18 (14 %) | 381 | 39 % | 0.35 | -529.42 |
| Short | sar | 4 | 0 (0 %) | 6 | 0 % | 0.00 | -7.33 |
| Short | smooth | 19 | 4 (21 %) | 4 | 100 % | ∞ (no loss) | 6.80 |
| Short | trend | 194 | 129 (66 %) | 949 | 71 % | 1.31 | 296.99 |
| Short | volume | 141 | 22 (16 %) | 114 | 44 % | 0.33 | -147.77 |
| General | active | 11 | 2 (18 %) | 43 | 23 % | 0.28 | -84.69 |
| General | bollinger | 4 | 0 (0 %) | 27 | 37 % | 0.52 | -27.90 |
| General | break | 168 | 35 (21 %) | 298 | 48 % | 0.78 | -117.04 |
| General | channel | 62 | 20 (32 %) | 104 | 51 % | 1.06 | 9.72 |
| General | direction | 61 | 42 (69 %) | 209 | 67 % | 2.38 | 247.91 |
| General | ema | 83 | 78 (94 %) | 252 | 74 % | 3.18 | 405.15 |
| General | macd | 32 | 26 (81 %) | 149 | 59 % | 1.93 | 135.29 |
| General | move | 98 | 68 (69 %) | 260 | 67 % | 1.82 | 240.09 |
| General | osc | 80 | 23 (29 %) | 150 | 49 % | 0.85 | -38.16 |
| General | rsi | 49 | 10 (20 %) | 233 | 27 % | 0.38 | -286.07 |
| General | sar | 1 | 0 (0 %) | 2 | 50 % | 0.03 | -4.44 |
| General | smooth | 35 | 11 (31 %) | 195 | 67 % | 1.62 | 152.97 |
| General | trend | 92 | 69 (75 %) | 544 | 61 % | 1.83 | 495.29 |
| General | volume | 98 | 8 (8 %) | 241 | 42 % | 0.74 | -130.97 |
| Long | active | 29 | 2 (7 %) | 52 | 13 % | 0.18 | -166.40 |
| Long | bollinger | 1 | 0 (0 %) | 18 | 33 % | 0.63 | -16.18 |
| Long | break | 262 | 50 (19 %) | 302 | 39 % | 0.70 | -224.62 |
| Long | channel | 122 | 40 (33 %) | 229 | 45 % | 0.98 | -12.03 |
| Long | direction | 51 | 39 (76 %) | 327 | 60 % | 2.11 | 493.76 |
| Long | ema | 154 | 90 (58 %) | 895 | 53 % | 1.05 | 105.73 |
| Long | ichimoku | 1 | 1 (100 %) | 5 | 60 % | 4.59 | 24.24 |
| Long | macd | 17 | 16 (94 %) | 88 | 64 % | 2.60 | 150.11 |
| Long | move | 257 | 68 (26 %) | 590 | 36 % | 0.57 | -711.92 |
| Long | osc | 60 | 34 (57 %) | 104 | 48 % | 0.81 | -43.59 |
| Long | rsi | 42 | 3 (7 %) | 250 | 50 % | 0.44 | -330.48 |
| Long | smooth | 86 | 24 (28 %) | 237 | 59 % | 1.63 | 254.10 |
| Long | trend | 125 | 104 (83 %) | 826 | 59 % | 1.61 | 881.52 |
| Long | volume | 107 | 13 (12 %) | 162 | 31 % | 0.52 | -221.40 |
| Wide | active | 48 | 30 (63 %) | 150 | 50 % | 0.95 | -4.23 |
| Wide | break | 34 | 0 (0 %) | 125 | 30 % | 0.12 | -343.52 |
| Wide | channel | 9 | 0 (0 %) | 12 | 25 % | 0.28 | -5.31 |
| Wide | direction | 23 | 10 (43 %) | 226 | 38 % | 0.63 | -70.83 |
| Wide | ema | 62 | 7 (11 %) | 824 | 21 % | 0.25 | -777.42 |
| Wide | ichimoku | 3 | 0 (0 %) | 93 | 26 % | 0.40 | -26.42 |
| Wide | macd | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -4.19 |
| Wide | move | 129 | 50 (39 %) | 491 | 32 % | 0.56 | -177.23 |
| Wide | osc | 57 | 24 (42 %) | 781 | 42 % | 0.81 | -70.17 |
| Wide | rsi | 27 | 0 (0 %) | 78 | 12 % | 0.08 | -98.14 |
| Wide | sar | 18 | 0 (0 %) | 51 | 35 % | 0.29 | -37.73 |
| Wide | smooth | 32 | 3 (9 %) | 96 | 34 % | 0.55 | -31.24 |
| Wide | trend | 55 | 12 (22 %) | 723 | 37 % | 0.69 | -168.89 |
| Wide | volume | 16 | 7 (44 %) | 53 | 51 % | 1.29 | 7.58 |
| Signals | signal:act-burst | 60 | 22 (37 %) | 1130 | 67 % | 0.85 | -387.60 |
| Signals | signal:act-hf | 60 | 31 (52 %) | 1450 | 70 % | 1.00 | -9.40 |
| Signals | signal:adx | 60 | 28 (47 %) | 567 | 65 % | 0.83 | -249.87 |
| Signals | signal:atr-break | 60 | 50 (83 %) | 1129 | 76 % | 1.54 | 895.95 |
| Signals | signal:bollinger | 60 | 35 (58 %) | 799 | 74 % | 1.09 | 149.98 |
| Signals | signal:cci | 60 | 38 (63 %) | 920 | 73 % | 1.18 | 321.84 |
| Signals | signal:cmf | 60 | 52 (87 %) | 1334 | 77 % | 1.43 | 915.86 |
| Signals | signal:donchian | 60 | 51 (85 %) | 839 | 79 % | 1.72 | 871.57 |
| Signals | signal:ema-cross | 60 | 45 (75 %) | 496 | 76 % | 1.62 | 471.90 |
| Signals | signal:ema-cross-fast | 60 | 29 (48 %) | 1104 | 73 % | 1.19 | 463.09 |
| Signals | signal:ema-pullback | 60 | 36 (60 %) | 1039 | 73 % | 1.04 | 95.74 |
| Signals | signal:ema-slope | 60 | 21 (35 %) | 639 | 65 % | 0.77 | -400.34 |
| Signals | signal:ema-trend | 60 | 22 (37 %) | 957 | 70 % | 0.89 | -268.98 |
| Signals | signal:heikin-ashi | 60 | 54 (90 %) | 1899 | 77 % | 1.62 | 1674.77 |
| Signals | signal:hma | 60 | 39 (65 %) | 1239 | 74 % | 1.21 | 503.16 |
| Signals | signal:ichimoku | 60 | 28 (47 %) | 688 | 73 % | 1.03 | 44.91 |
| Signals | signal:impulse | 60 | 53 (88 %) | 1280 | 79 % | 1.88 | 1495.25 |
| Signals | signal:kama | 60 | 43 (72 %) | 1452 | 75 % | 1.23 | 655.06 |
| Signals | signal:keltner | 60 | 30 (50 %) | 639 | 74 % | 0.92 | -120.59 |
| Signals | signal:macd-cross | 60 | 50 (83 %) | 1515 | 76 % | 1.47 | 1163.73 |
| Signals | signal:macd-hist | 60 | 47 (78 %) | 1780 | 75 % | 1.42 | 1209.82 |
| Signals | signal:macd-slow | 60 | 44 (73 %) | 1406 | 76 % | 1.33 | 844.07 |
| Signals | signal:mfi | 53 | 35 (66 %) | 102 | 74 % | 1.41 | 59.07 |
| Signals | signal:obv | 60 | 31 (52 %) | 1081 | 72 % | 1.03 | 70.95 |
| Signals | signal:r-awesome | 60 | 50 (83 %) | 1075 | 77 % | 1.65 | 933.66 |
| Signals | signal:r-connors | 60 | 25 (42 %) | 431 | 68 % | 0.86 | -146.51 |
| Signals | signal:r-fractal | 60 | 59 (98 %) | 827 | 83 % | 2.82 | 1357.10 |
| Signals | signal:r-inside | 60 | 60 (100 %) | 191 | 95 % | 458.61 | 631.86 |
| Signals | signal:r-linreg | 60 | 31 (52 %) | 1163 | 71 % | 0.99 | -25.30 |
| Signals | signal:r-nr-break | 60 | 34 (57 %) | 1371 | 73 % | 1.08 | 225.07 |
| Signals | signal:r-session-trend | 60 | 38 (63 %) | 478 | 77 % | 1.27 | 247.82 |
| Signals | signal:r-vol-regime | 60 | 59 (98 %) | 376 | 90 % | 10.01 | 900.36 |
| Signals | signal:reclaim | 60 | 21 (35 %) | 1273 | 68 % | 0.91 | -275.68 |
| Signals | signal:rsi-mid | 60 | 44 (73 %) | 1353 | 78 % | 1.53 | 1134.64 |
| Signals | signal:rsi-momentum | 30 | 25 (83 %) | 126 | 79 % | 3.42 | 237.84 |
| Signals | signal:rsi-reversal | 55 | 28 (51 %) | 180 | 73 % | 1.17 | 64.14 |
| Signals | signal:s2-active-hf | 60 | 29 (48 %) | 1664 | 68 % | 0.94 | -203.12 |
| Signals | signal:s2-adx-gate | 60 | 35 (58 %) | 887 | 75 % | 1.20 | 359.90 |
| Signals | signal:s2-atr-break | 60 | 57 (95 %) | 1115 | 78 % | 1.94 | 1265.34 |
| Signals | signal:s2-bb-bounce | 58 | 9 (16 %) | 244 | 55 % | 0.56 | -327.20 |
| Signals | signal:s2-block-scale | 60 | 42 (70 %) | 1782 | 73 % | 1.25 | 813.70 |
| Signals | signal:s2-block-stack | 60 | 53 (88 %) | 797 | 80 % | 1.93 | 1000.89 |
| Signals | signal:s2-confluence | 60 | 26 (43 %) | 1063 | 70 % | 0.91 | -213.70 |
| Signals | signal:s2-ema-cross | 28 | 12 (43 %) | 66 | 64 % | 0.69 | -38.72 |
| Signals | signal:s2-range-break | 60 | 51 (85 %) | 464 | 78 % | 1.86 | 535.92 |
| Signals | signal:s2-range-shift | 60 | 55 (92 %) | 808 | 83 % | 2.74 | 1270.73 |
| Signals | signal:s2-rsi-revert | 58 | 32 (55 %) | 320 | 73 % | 1.35 | 190.68 |
| Signals | signal:s2-st-trail | 60 | 21 (35 %) | 557 | 67 % | 0.83 | -266.56 |
| Signals | signal:s2-stoch-swing | 60 | 46 (77 %) | 855 | 76 % | 1.55 | 747.40 |
| Signals | signal:s2-vol-break | 58 | 33 (57 %) | 198 | 71 % | 1.06 | 20.86 |
| Signals | signal:sar | 60 | 46 (77 %) | 1569 | 75 % | 1.32 | 897.08 |
| Signals | signal:squeeze | 60 | 34 (57 %) | 163 | 67 % | 0.65 | -187.71 |
| Signals | signal:st-slow | 60 | 35 (58 %) | 477 | 70 % | 0.91 | -120.17 |
| Signals | signal:stoch-rsi | 60 | 37 (62 %) | 1561 | 74 % | 1.20 | 591.88 |
| Signals | signal:supertrend | 60 | 54 (90 %) | 713 | 81 % | 1.89 | 913.06 |
| Signals | signal:swing | 60 | 60 (100 %) | 1384 | 82 % | 2.46 | 2157.25 |
| Signals | signal:thrust | 60 | 60 (100 %) | 1359 | 81 % | 1.91 | 1660.05 |
| Signals | signal:trix | 60 | 18 (30 %) | 592 | 68 % | 0.84 | -252.92 |
| Signals | signal:volume-break | 58 | 43 (74 %) | 154 | 73 % | 1.59 | 118.23 |
| Signals | signal:vwap | 60 | 28 (47 %) | 861 | 70 % | 0.98 | -36.26 |
| Signals | signal:williams-r | 60 | 34 (57 %) | 1169 | 74 % | 1.20 | 432.91 |
| Signals | signal:zscore | 56 | 31 (55 %) | 685 | 73 % | 1.06 | 83.26 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 10 | 0 (0 %) | 48 | 67 % | 0.27 | -34.80 |
| Micro | 1.25 | 10 | 0 (0 %) | 48 | 67 % | 0.27 | -34.80 |
| Micro | 1.35 | 10 | 0 (0 %) | 48 | 67 % | 0.27 | -34.80 |
| Micro | 1.5 | 10 | 0 (0 %) | 48 | 67 % | 0.27 | -34.80 |
| Micro | 1.75 | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Micro | 2 | 6 | 0 (0 %) | 0 | 0 % | – | 0.00 |
| Minimal | 1.1 | 1772 | 595 (34 %) | 56837 | 66 % | 0.90 | -4873.91 |
| Minimal | 1.25 | 1641 | 551 (34 %) | 51770 | 66 % | 0.90 | -4309.37 |
| Minimal | 1.35 | 1539 | 522 (34 %) | 47374 | 66 % | 0.90 | -3944.62 |
| Minimal | 1.5 | 1345 | 476 (35 %) | 41829 | 66 % | 0.91 | -3109.16 |
| Minimal | 1.75 | 938 | 346 (37 %) | 29573 | 66 % | 0.92 | -1816.45 |
| Minimal | 2 | 630 | 250 (40 %) | 20088 | 68 % | 0.96 | -693.15 |
| Short | 1.1 | 340 | 193 (57 %) | 1827 | 67 % | 1.14 | 261.93 |
| Short | 1.25 | 317 | 174 (55 %) | 1656 | 67 % | 1.09 | 157.53 |
| Short | 1.35 | 293 | 161 (55 %) | 1489 | 67 % | 1.08 | 125.59 |
| Short | 1.5 | 227 | 124 (55 %) | 1160 | 67 % | 1.09 | 110.50 |
| Short | 1.75 | 111 | 57 (51 %) | 490 | 63 % | 0.97 | -15.52 |
| Short | 2 | 45 | 24 (53 %) | 229 | 61 % | 0.90 | -22.52 |
| General | 1.1 | 281 | 177 (63 %) | 1505 | 56 % | 1.34 | 664.25 |
| General | 1.25 | 260 | 161 (62 %) | 1268 | 56 % | 1.35 | 570.22 |
| General | 1.35 | 228 | 142 (62 %) | 1090 | 57 % | 1.36 | 506.83 |
| General | 1.5 | 176 | 111 (63 %) | 757 | 57 % | 1.37 | 349.75 |
| General | 1.75 | 88 | 60 (68 %) | 431 | 59 % | 1.61 | 305.38 |
| General | 2 | 46 | 36 (78 %) | 249 | 62 % | 1.70 | 186.59 |
| Long | 1.1 | 391 | 246 (63 %) | 2303 | 52 % | 1.15 | 688.72 |
| Long | 1.25 | 343 | 214 (62 %) | 1932 | 52 % | 1.12 | 467.67 |
| Long | 1.35 | 295 | 179 (61 %) | 1564 | 50 % | 1.08 | 241.74 |
| Long | 1.5 | 222 | 121 (55 %) | 1173 | 47 % | 0.98 | -41.61 |
| Long | 1.75 | 123 | 68 (55 %) | 664 | 47 % | 1.09 | 113.02 |
| Long | 2 | 67 | 39 (58 %) | 400 | 47 % | 1.12 | 89.84 |
| Wide | 1.1 | 39 | 4 (10 %) | 269 | 36 % | 0.29 | -301.48 |
| Wide | 1.25 | 39 | 4 (10 %) | 269 | 36 % | 0.29 | -301.48 |
| Wide | 1.35 | 39 | 4 (10 %) | 269 | 36 % | 0.29 | -301.48 |
| Wide | 1.5 | 33 | 4 (12 %) | 236 | 38 % | 0.34 | -217.17 |
| Wide | 1.75 | 15 | 3 (20 %) | 85 | 42 % | 0.32 | -72.14 |
| Wide | 2 | 2 | 0 (0 %) | 18 | 56 % | 0.40 | -17.30 |
| Signals | 1.1 | 488 | 345 (71 %) | 6914 | 76 % | 1.37 | 4501.07 |
| Signals | 1.25 | 243 | 173 (71 %) | 3420 | 76 % | 1.36 | 2227.08 |
| Signals | 1.35 | 162 | 116 (72 %) | 2275 | 77 % | 1.39 | 1565.78 |
| Signals | 1.5 | 80 | 58 (73 %) | 965 | 79 % | 1.48 | 848.47 |
| Signals | 1.75 | 34 | 19 (56 %) | 303 | 79 % | 1.23 | 142.99 |
| Signals | 2 | 14 | 5 (36 %) | 71 | 76 % | 0.87 | -24.65 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-tpull-8@m5c | 157 | 157 (100 %) | 785 | 80 % | 5.43 | 163.53 | tp0.6 sl1.35 tr0 h288 mc (5 · ∞ (no loss) · 2.00) |
| Micro | sweep | mc-rsi7-20@m5 | 20 | 20 (100 %) | 260 | 92 % | 2.53 | 68.43 | tp0.55 sl1.7875 tr0.4125 h192 mc (13 · 5.04 · 8.02) |
| Micro | sweep | mc-rsi7-15@m5 | 12 | 12 (100 %) | 76 | 84 % | 15.68 | 42.88 | tp0.6 sl2.85 tr0.45 h192 mc (6 · ∞ (no loss) · 8.09) |
| Micro | sweep | mc-rsi9-20@m5 | 12 | 12 (100 %) | 76 | 84 % | 15.68 | 42.88 | tp0.6 sl2.85 tr0.45 h192 mc (6 · ∞ (no loss) · 8.09) |
| Micro | pivot | mc-lag-3@m15 | 80 | 80 (100 %) | 80 | 100 % | ∞ (no loss) | 26.80 | – |
| Micro | ribbon | mc-trsi2-10@m15 | 70 | 70 (100 %) | 70 | 100 % | ∞ (no loss) | 24.10 | – |
| Micro | ribbon | mc-trsi2-10@m15c | 70 | 70 (100 %) | 70 | 100 % | ∞ (no loss) | 24.10 | – |
| Micro | sweep | mc-rsi7-20@m5c | 12 | 12 (100 %) | 48 | 92 % | 24.09 | 14.88 | – |
| Micro | sandwich | mc-ibrk@m5 | 13 | 13 (100 %) | 39 | 100 % | ∞ (no loss) | 14.55 | – |
| Micro | sweep | mc-z-20@m5c | 6 | 4 (67 %) | 32 | 94 % | 2.38 | 6.95 | tp0.6 sl2.55 tr0 h288 mc (5 · ∞ (no loss) · 2.00) |
| Micro | sweep | mc-trsi2-10@m15c | 6 | 6 (100 %) | 24 | 83 % | 9.09 | 5.19 | – |
| Micro | pulse | mc-ibrk@m5 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 4.20 | – |
| Micro | clamp | mc-rsi2-5@m15 | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 3.20 | – |
| Micro | sweep | mc-rsi9-25@m5c | 12 | 0 (0 %) | 72 | 78 % | 0.70 | -8.76 | tp0.6 sl2.85 tr0.3 h192 mc (6 · 0.94 · -0.07) |
| Micro | snap | mc-rsit2-15@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.13 | -10.90 | – |
| Micro | follow | mc-lag-3@m15c | 12 | 0 (0 %) | 36 | 67 % | 0.28 | -24.30 | – |
| Micro | pulse | mc-rsi9-20@m5 | 4 | 0 (0 %) | 48 | 67 % | 0.27 | -34.80 | tp0.6 sl2.7 tr0 h192 mc (12 · 0.28 · -8.40) |
| Micro | sandwich | mc-rsi7-15@m5 | 14 | 0 (0 %) | 70 | 27 % | 0.07 | -100.85 | tp0.6 sl1.95 tr0 h288 mc (5 · 0.12 · -5.65) |
| Micro | snap | mc-rsi7-15@m5 | 14 | 0 (0 %) | 70 | 27 % | 0.07 | -100.85 | tp0.6 sl1.95 tr0 h288 mc (5 · 0.12 · -5.65) |
| Micro | magnet | mc-rsimid-14@m5 | 20 | 0 (0 %) | 137 | 50 % | 0.17 | -130.62 | tp0.6 sl2.25 tr0 h288 mc (6 · 0.33 · -3.30) |
| Micro | magnet | mc-tstreak-4@m5 | 112 | 2 (2 %) | 648 | 51 % | 0.26 | -287.33 | tp0.5 sl2.5 tr0 h288 mc (5 · ∞ (no loss) · 1.50) |
| Minimal | sweep | mc-rsi4-10@m5 | 37 | 37 (100 %) | 259 | 96 % | 77.33 | 443.17 | tp1.6 sl2.4 tr1.2 h192 mn (7 · ∞ (no loss) · 17.36) |
| Minimal | ribbon | r-chand-m@m15 | 96 | 90 (94 %) | 384 | 95 % | 11.19 | 409.54 | – |
| Minimal | follow | trend-ema-20-50@m1c | 49 | 32 (65 %) | 5960 | 68 % | 1.10 | 402.12 | tp1.6 sl4.8 tr0 h1440 mn (86 · 1.57 · 37.20) |
| Minimal | sweep | mc-rsi2-10@m5c | 23 | 23 (100 %) | 297 | 84 % | 4.09 | 307.33 | tp1.6 sl4 tr1.2 h192 mn (13 · 5.65 · 20.11) |
| Minimal | sweep | cci-14-100@m1c | 33 | 30 (91 %) | 879 | 72 % | 1.73 | 301.81 | tp1 sl2.5 tr0.75 h960 mn (26 · 3.00 · 17.00) |
| Minimal | follow | dir-emax-20-50@m1c | 36 | 26 (72 %) | 3040 | 72 % | 1.12 | 265.39 | tp1.6 sl4 tr0 h1440 mn (71 · 1.49 · 26.60) |
| Minimal | revert | ema-pullback-50@m5c | 43 | 43 (100 %) | 344 | 86 % | 3.12 | 261.68 | tp1.6 sl2.4 tr0.8 h288 mn (8 · 12.94 · 9.41) |
| Minimal | ribbon | ichi-tk-20@m1c | 26 | 26 (100 %) | 1342 | 75 % | 1.30 | 257.88 | tp1.4 sl4.2 tr0 h960 mn (48 · 1.60 · 18.40) |
| Minimal | sweep | rsi-fast@m5 | 31 | 31 (100 %) | 395 | 76 % | 2.85 | 256.09 | tp0.8 sl2 tr0.6 h192 mn (13 · 5.34 · 10.25) |
| Minimal | sweep | mc-rsi7-20@m5 | 31 | 31 (100 %) | 395 | 76 % | 2.85 | 256.09 | tp0.8 sl2 tr0.6 h192 mn (13 · 5.34 · 10.25) |
| Minimal | follow | ema-21-55@m1c | 39 | 27 (69 %) | 3242 | 71 % | 1.10 | 247.30 | tp1.2 sl3.6 tr0.9 h1440 mn (84 · 1.38 · 20.75) |
| Minimal | follow | trend-ribbon@m1c | 33 | 29 (88 %) | 3361 | 71 % | 1.10 | 233.98 | tp1.6 sl4 tr0 h1440 mn (82 · 1.37 · 25.20) |
| Minimal | sweep | mc-rsi3-15@m5c | 19 | 19 (100 %) | 209 | 86 % | 4.01 | 233.81 | tp1.4 sl2.8 tr0.7 h192 mn (11 · 5.82 · 14.45) |
| Minimal | follow | ichi-tk-20@m1c | 21 | 18 (86 %) | 1582 | 71 % | 1.21 | 224.01 | tp1.6 sl4.8 tr1.2 h1440 mn (67 · 1.94 · 38.12) |
| Minimal | ribbon | mc-irsi2-10@m15 | 68 | 62 (91 %) | 274 | 75 % | 8.69 | 211.83 | tp1.2 sl1.8 tr0 h64 mn (5 · 0.75 · -1.00) |
| Minimal | ribbon | mc-mrsi2-10@m15 | 77 | 77 (100 %) | 227 | 79 % | 35.96 | 208.97 | – |
| Minimal | pivot | r-sweep@m5 | 77 | 76 (99 %) | 475 | 82 % | 2.90 | 208.44 | tp0.8 sl2 tr0 h192 mn (7 · ∞ (no loss) · 4.20) |
| Minimal | follow | hma-55@m1c | 16 | 13 (81 %) | 1867 | 73 % | 1.15 | 208.03 | tp1.6 sl4.8 tr1.2 h1440 mn (103 · 1.38 · 28.92) |
| Minimal | snap | rsi-div@m5 | 16 | 16 (100 %) | 114 | 86 % | 121.81 | 205.83 | tp1.4 sl3.5 tr1.05 h192 mn (7 · 128.84 · 15.27) |
| Minimal | sandwich | ichi-tk-20@m1c | 28 | 26 (93 %) | 1534 | 72 % | 1.20 | 190.79 | tp1.6 sl4 tr0 h960 mn (48 · 1.41 · 15.44) |
| Minimal | sweep | mc-rsi2-15@m5c | 9 | 9 (100 %) | 216 | 85 % | 3.28 | 188.99 | tp1.6 sl4 tr1.2 h288 mn (24 · 4.44 · 29.35) |
| Minimal | sweep | r-bb-adx@m15 | 37 | 37 (100 %) | 95 | 74 % | 43.65 | 174.60 | – |
| Minimal | follow | trix-15@m1c | 10 | 10 (100 %) | 858 | 67 % | 1.30 | 174.39 | tp1.6 sl4 tr1.2 h1440 mn (78 · 1.66 · 31.34) |
| Minimal | pivot | r-sweep-m@m5 | 55 | 55 (100 %) | 320 | 82 % | 2.54 | 151.57 | tp1.2 sl1.8 tr0.6 h192 mn (6 · ∞ (no loss) · 4.85) |
| Minimal | magnet | ema-21-55@m1c | 40 | 33 (83 %) | 1136 | 71 % | 1.19 | 151.41 | tp1.6 sl4 tr1.2 h1440 mn (26 · 1.75 · 12.81) |
| Minimal | clamp | mc-rsi2-5@m15 | 60 | 60 (100 %) | 213 | 81 % | 7.77 | 148.41 | – |
| Minimal | clamp | mc-mrsi2-10@m15 | 30 | 30 (100 %) | 135 | 72 % | 13.07 | 145.17 | tp1.6 sl2.4 tr0.8 h64 mn (5 · 11.13 · 8.84) |
| Minimal | clamp | ichi-tk-20@m1c | 16 | 14 (88 %) | 739 | 76 % | 1.25 | 142.14 | tp1.4 sl4.2 tr1.05 h1440 mn (45 · 1.95 · 21.40) |
| Minimal | pivot | act-shift@m5 | 26 | 26 (100 %) | 288 | 80 % | 2.84 | 137.77 | tp1.6 sl4 tr0.8 h192 mn (11 · 39.91 · 7.71) |
| Minimal | pivot | trend-st-28-6@m1c | 13 | 13 (100 %) | 514 | 68 % | 1.44 | 128.95 | tp1.4 sl3.5 tr0.7 h1440 mn (39 · 1.80 · 15.47) |
| Minimal | sweep | mc-rsi2-20@m5c | 16 | 16 (100 %) | 473 | 71 % | 1.33 | 123.42 | tp1.6 sl4.8 tr1.2 h192 mn (31 · 1.69 · 15.80) |
| Minimal | follow | move-impulse-20-2.5@m1c | 9 | 9 (100 %) | 600 | 75 % | 1.37 | 122.71 | tp1.6 sl4.8 tr0.8 h960 mn (67 · 1.63 · 19.39) |
| Minimal | revert | willr-50-80@m1c | 8 | 8 (100 %) | 591 | 74 % | 1.26 | 117.07 | tp1.6 sl4.8 tr0 h1440 mn (67 · 1.80 · 36.20) |
| Minimal | clamp | mc-irsi2-10@m15 | 19 | 19 (100 %) | 102 | 75 % | 14.73 | 97.73 | tp1.6 sl4 tr0.8 h96 mn (5 · 227.52 · 10.59) |
| Minimal | revert | bb-bounce-20-3@m5c | 28 | 28 (100 %) | 72 | 100 % | ∞ (no loss) | 97.20 | – |
| Minimal | sweep | mc-rsi3-20@m5c | 9 | 9 (100 %) | 162 | 75 % | 1.84 | 95.42 | tp1.6 sl3.2 tr1.2 h288 mn (18 · 2.45 · 14.99) |
| Minimal | revert | r-star@m30 | 23 | 23 (100 %) | 69 | 97 % | 222.47 | 87.80 | – |
| Minimal | sandwich | ema-21-55@m1c | 10 | 10 (100 %) | 835 | 75 % | 1.13 | 87.41 | tp1.4 sl3.5 tr0 h1440 mn (83 · 1.26 · 16.30) |
| Minimal | follow | trend-st-35-7@m1c | 47 | 27 (57 %) | 2323 | 64 % | 1.06 | 85.33 | tp1.2 sl3.6 tr0.9 h1440 mn (41 · 2.24 · 24.06) |
| Minimal | sweep | willr-21-90@m5c | 32 | 32 (100 %) | 205 | 73 % | 2.43 | 84.80 | tp1.4 sl3.5 tr1.05 h288 mn (6 · 133.66 · 6.95) |
| Minimal | pulse | ichi-cloud-9@m1 | 14 | 14 (100 %) | 84 | 75 % | 30.31 | 83.19 | tp1.6 sl3.2 tr0 h1440 mn (6 · ∞ (no loss) · 8.40) |
| Minimal | clamp | mfi-14-10@m15 | 26 | 26 (100 %) | 75 | 96 % | 182.62 | 79.98 | – |
| Minimal | ribbon | trend-st-28-6@m1c | 14 | 13 (93 %) | 766 | 70 % | 1.15 | 76.68 | tp1.6 sl4.8 tr0.8 h960 mn (55 · 1.38 · 11.15) |
| Minimal | clamp | r-sweep@m5 | 36 | 33 (92 %) | 144 | 83 % | 6.29 | 74.87 | – |
| Minimal | sweep | ema-pullback@m5c | 74 | 74 (100 %) | 148 | 68 % | 7.62 | 74.02 | – |
| Minimal | revert | rsi-mom-21-25@m5c | 18 | 18 (100 %) | 54 | 89 % | 30.01 | 73.87 | – |
| Minimal | sweep | mc-rsi4-20@m5c | 6 | 6 (100 %) | 54 | 89 % | 3.68 | 67.50 | tp1.6 sl3.2 tr0.8 h192 mn (9 · 4.54 · 12.05) |
| Minimal | follow | r-td@m15c | 52 | 40 (77 %) | 312 | 76 % | 1.42 | 65.26 | tp1.6 sl2.4 tr0 h64 mn (6 · 2.69 · 4.40) |
| Minimal | ribbon | r-spring@m1 | 7 | 7 (100 %) | 79 | 77 % | 2.95 | 55.93 | tp1.6 sl2.4 tr1.2 h960 mn (11 · 5.08 · 11.18) |
| Minimal | pivot | r-fakeout@m30 | 50 | 50 (100 %) | 50 | 100 % | ∞ (no loss) | 55.20 | – |
| Minimal | sweep | mc-rsi3-25@m5c | 5 | 5 (100 %) | 147 | 71 % | 1.55 | 54.33 | tp1.4 sl4.2 tr1.05 h288 mn (28 · 1.81 · 15.06) |
| Minimal | follow | trend-st-21-5@m1c | 7 | 5 (71 %) | 441 | 73 % | 1.14 | 52.09 | tp1.6 sl4.8 tr1.2 h1440 mn (57 · 1.81 · 28.61) |
| Minimal | magnet | r-sweep@m5 | 13 | 13 (100 %) | 61 | 93 % | 31.82 | 51.74 | tp1 sl2.5 tr0.5 h192 mn (5 · ∞ (no loss) · 4.50) |
| Minimal | pulse | r-valuearea@m1 | 26 | 22 (85 %) | 361 | 74 % | 1.24 | 50.75 | tp1.6 sl3.2 tr0.8 h960 mn (14 · 2.77 · 6.45) |
| Minimal | ribbon | mc-turn-10@m5 | 9 | 9 (100 %) | 67 | 87 % | 2.26 | 50.59 | tp1.4 sl4.2 tr1.05 h192 mn (7 · 2.43 · 6.30) |
| Minimal | sandwich | trend-ema-50-200@m5c | 6 | 6 (100 %) | 145 | 81 % | 1.47 | 48.56 | tp1.6 sl4.8 tr0 h288 mn (23 · 1.87 · 13.00) |
| Minimal | ribbon | mc-trsi2-10@m15 | 92 | 84 (91 %) | 88 | 95 % | 82.09 | 47.62 | – |
| Minimal | follow | macd-zero@m1c | 3 | 3 (100 %) | 365 | 69 % | 1.18 | 46.10 | tp1.4 sl3.5 tr1.05 h1440 mn (122 · 1.21 · 17.68) |
| Minimal | follow | dir-emax-12-26@m1c | 3 | 3 (100 %) | 365 | 69 % | 1.18 | 46.10 | tp1.4 sl3.5 tr1.05 h1440 mn (122 · 1.21 · 17.68) |
| Minimal | sweep | mc-z-20@m5c | 21 | 19 (90 %) | 113 | 80 % | 2.29 | 45.83 | tp1 sl3 tr0 h288 mn (5 · ∞ (no loss) · 4.00) |
| Minimal | ribbon | move-cont@m5 | 14 | 14 (100 %) | 84 | 83 % | 1.97 | 45.55 | tp1.4 sl2.1 tr1.05 h192 mn (6 · 3.07 · 4.76) |
| Minimal | sweep | mc-rsi5-15@m5 | 5 | 5 (100 %) | 65 | 77 % | 3.03 | 45.22 | tp1.4 sl2.8 tr0.7 h192 mn (13 · 3.52 · 9.92) |
| Minimal | ribbon | mc-trsi2-10@m15c | 86 | 78 (91 %) | 82 | 95 % | 77.98 | 45.20 | – |
| Minimal | revert | bb-bounce@m1c | 2 | 2 (100 %) | 50 | 92 % | 3.19 | 43.78 | tp1.6 sl4.8 tr0 h1440 mn (25 · 3.22 · 22.20) |
| Minimal | revert | z-20-2@m1c | 2 | 2 (100 %) | 50 | 92 % | 3.19 | 43.78 | tp1.6 sl4.8 tr0 h1440 mn (25 · 3.22 · 22.20) |
| Minimal | snap | bb-wick@m5c | 6 | 6 (100 %) | 33 | 91 % | 52.43 | 43.06 | tp1.4 sl2.8 tr1.05 h288 mn (5 · ∞ (no loss) · 7.37) |
| Minimal | sweep | mc-rsi4-25@m5c | 5 | 5 (100 %) | 93 | 77 % | 1.58 | 41.06 | tp1.6 sl4 tr0.8 h288 mn (19 · 1.80 · 10.64) |
| Minimal | sandwich | dir-vwap-240@m5c | 5 | 3 (60 %) | 143 | 78 % | 1.38 | 39.15 | tp1.6 sl4.8 tr0 h288 mn (26 · 2.15 · 17.20) |
| Minimal | follow | r-pin-m@m30 | 12 | 12 (100 %) | 42 | 86 % | 7.75 | 38.67 | – |
| Minimal | follow | dir-vwap-30@m1c | 2 | 2 (100 %) | 306 | 73 % | 1.16 | 38.65 | tp1.6 sl4.8 tr1.2 h1440 mn (148 · 1.20 · 22.85) |
| Minimal | clamp | willr-21-95@m5c | 51 | 45 (88 %) | 102 | 60 % | 2.84 | 37.73 | – |
| Minimal | pivot | bb-mid@m15 | 13 | 13 (100 %) | 65 | 80 % | 11.10 | 35.50 | tp1 sl2 tr0.75 h64 mn (5 · 90.90 · 3.05) |
| Minimal | sandwich | r-camarilla@m1 | 16 | 10 (63 %) | 323 | 71 % | 1.18 | 34.87 | tp1.6 sl3.2 tr0.8 h960 mn (21 · 1.66 · 6.97) |
| Minimal | sweep | r-engulf@m30 | 28 | 28 (100 %) | 28 | 100 % | ∞ (no loss) | 34.40 | – |
| Minimal | sandwich | trend-st-14-2@m5 | 7 | 7 (100 %) | 53 | 92 % | 4.14 | 33.63 | tp1 sl3 tr0.5 h288 mn (7 · ∞ (no loss) · 7.49) |
| Minimal | pulse | dir-st@m5 | 47 | 47 (100 %) | 47 | 100 % | ∞ (no loss) | 33.25 | – |
| Minimal | pulse | trend-st-7-2@m5 | 47 | 47 (100 %) | 47 | 100 % | ∞ (no loss) | 33.25 | – |
| Minimal | sandwich | act-chop@m5 | 4 | 4 (100 %) | 49 | 80 % | 3.45 | 33.20 | tp1.2 sl3.6 tr0.9 h192 mn (13 · 31.32 · 13.97) |
| Minimal | magnet | dir-st@m1c | 84 | 45 (54 %) | 971 | 69 % | 1.05 | 33.01 | tp1.6 sl2.4 tr1.2 h960 mn (11 · 2.72 · 9.55) |
| Minimal | magnet | trend-st-7-2@m1c | 84 | 45 (54 %) | 971 | 69 % | 1.05 | 33.01 | tp1.6 sl2.4 tr1.2 h960 mn (11 · 2.72 · 9.55) |
| Minimal | pivot | mc-rsit4-20@m15c | 43 | 30 (70 %) | 43 | 70 % | 13.31 | 32.00 | – |
| Minimal | magnet | ichi-tk-9@m1c | 3 | 3 (100 %) | 47 | 74 % | 2.84 | 30.59 | tp1.2 sl3.6 tr0.9 h1440 mn (15 · 3.83 · 10.97) |
| Minimal | clamp | willr-28-95@m5c | 39 | 32 (82 %) | 78 | 76 % | 2.45 | 30.53 | – |
| Minimal | pivot | break-squeeze-t10@m15 | 31 | 31 (100 %) | 31 | 100 % | ∞ (no loss) | 29.60 | – |
| Minimal | pulse | trend-st-28-6@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 29.20 | – |
| Minimal | sandwich | rsi-div@m5 | 2 | 2 (100 %) | 28 | 86 % | 80.54 | 29.11 | tp1.2 sl3.6 tr0.6 h192 mn (14 · 80.54 · 14.55) |
| Minimal | pulse | ema-21-55@m1c | 2 | 2 (100 %) | 69 | 78 % | 1.56 | 27.24 | tp1.6 sl3.2 tr0 h1440 mn (34 · 1.59 · 14.00) |
| Minimal | sandwich | dir-vwap-30@m1c | 4 | 4 (100 %) | 65 | 82 % | 1.69 | 27.23 | tp1.6 sl4.8 tr0 h960 mn (16 · 1.96 · 9.60) |
| Minimal | pulse | sar-0.01@m5c | 40 | 30 (75 %) | 40 | 75 % | 5.75 | 25.82 | – |
| Minimal | ribbon | mc-mrsi2-10@m30 | 20 | 20 (100 %) | 22 | 91 % | 64.93 | 25.60 | – |
| Minimal | pivot | trend-ema-20-50@m1c | 6 | 6 (100 %) | 42 | 81 % | 12.98 | 25.32 | tp1 sl3 tr0.75 h960 mn (7 · 18.16 · 6.16) |
| Minimal | magnet | r-pin-m@m5 | 48 | 32 (67 %) | 131 | 76 % | 1.39 | 25.19 | – |
| Minimal | ribbon | mc-tstreak-4@m5 | 12 | 12 (100 %) | 24 | 100 % | ∞ (no loss) | 24.99 | – |
| Minimal | magnet | ichi-cloud-20@m1 | 2 | 2 (100 %) | 55 | 80 % | 2.20 | 24.98 | tp1.6 sl4.8 tr1.2 h960 mn (27 · 2.22 · 12.57) |
| Minimal | ribbon | r-sweep@m5 | 10 | 9 (90 %) | 57 | 82 % | 4.05 | 24.84 | tp0.8 sl2.4 tr0 h288 mn (7 · ∞ (no loss) · 4.20) |
| Minimal | sandwich | trend-ribbon@m5c | 7 | 5 (71 %) | 65 | 83 % | 1.47 | 23.45 | tp1.6 sl4.8 tr1.2 h192 mn (9 · 2.31 · 6.55) |
| Minimal | sandwich | aroon-25@m5 | 5 | 5 (100 %) | 70 | 64 % | 1.40 | 23.34 | tp1.6 sl4.8 tr1.2 h288 mn (13 · 1.59 · 6.06) |
| Minimal | clamp | mc-rsi2-10@m15 | 4 | 4 (100 %) | 30 | 67 % | 17.79 | 22.40 | tp1 sl2 tr0.75 h64 mn (7 · 26.35 · 9.64) |
| Minimal | sweep | dir-vwap-240@m5c | 1 | 1 (100 %) | 42 | 88 % | 2.02 | 22.40 | tp1.4 sl4.2 tr0 h192 mn (42 · 2.02 · 22.40) |
| Minimal | pulse | aroon-25@m1 | 4 | 4 (100 %) | 72 | 67 % | 1.65 | 21.95 | tp1.2 sl3.6 tr0.9 h960 mn (18 · 1.90 · 7.20) |
| Minimal | follow | r-camarilla@m5c | 6 | 6 (100 %) | 30 | 100 % | ∞ (no loss) | 21.78 | tp1.4 sl2.8 tr0.7 h192 mn (5 · ∞ (no loss) · 3.63) |
| Minimal | revert | break-vol-2@m5c | 9 | 6 (67 %) | 86 | 76 % | 1.31 | 21.75 | tp1.6 sl4.8 tr1.2 h288 mn (9 · 3.49 · 9.16) |
| Minimal | sandwich | rsi-mid@m5 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 21.30 | – |
| Minimal | magnet | trend-st-28-6@m1c | 4 | 3 (75 %) | 87 | 78 % | 1.30 | 21.23 | tp1.4 sl4.2 tr1.05 h1440 mn (23 · 1.89 · 11.90) |
| Minimal | ribbon | aroon-25@m5 | 11 | 11 (100 %) | 18 | 94 % | 149.37 | 20.81 | – |
| Minimal | sweep | r-fractal-m@m30 | 4 | 4 (100 %) | 16 | 100 % | ∞ (no loss) | 20.80 | – |
| Minimal | ribbon | mc-rsi3-5@m15 | 12 | 12 (100 %) | 23 | 96 % | 142.48 | 20.77 | – |
| Minimal | pivot | mc-rsi3-5@m15 | 12 | 12 (100 %) | 23 | 96 % | 142.48 | 20.77 | – |
| Minimal | follow | r-pin@m5 | 3 | 3 (100 %) | 124 | 65 % | 1.21 | 20.17 | tp1.6 sl3.2 tr1.2 h192 mn (43 · 1.32 · 9.58) |
| Minimal | ribbon | r-pin-m@m5 | 12 | 9 (75 %) | 93 | 81 % | 1.44 | 20.02 | tp1 sl3 tr0.75 h288 mn (8 · ∞ (no loss) · 7.15) |
| Minimal | pulse | ema-slope-20-10@m1 | 1 | 1 (100 %) | 35 | 83 % | 1.96 | 19.87 | tp1.6 sl4.8 tr0 h960 mn (35 · 1.96 · 19.87) |
| Minimal | sandwich | dir-emax-20-50@m1c | 3 | 3 (100 %) | 223 | 80 % | 1.09 | 19.00 | tp1.6 sl4.8 tr0 h960 mn (69 · 1.21 · 13.40) |
| Minimal | pivot | r-chand@m15 | 6 | 6 (100 %) | 18 | 78 % | 74.35 | 18.69 | – |
| Minimal | sweep | mc-rsi5-25@m5c | 2 | 2 (100 %) | 21 | 86 % | 2.73 | 18.67 | tp1.6 sl4.8 tr0.8 h288 mn (11 · 2.92 · 11.07) |
| Minimal | ribbon | mc-rsi2-10@m15 | 2 | 2 (100 %) | 12 | 83 % | 50.79 | 18.53 | tp1 sl2 tr0.75 h64 mn (6 · 50.79 · 9.27) |
| Minimal | sandwich | sar-0.01@m5c | 11 | 7 (64 %) | 37 | 78 % | 2.67 | 18.35 | – |
| Minimal | magnet | r-sweep-m@m5 | 5 | 5 (100 %) | 19 | 79 % | 11.79 | 18.12 | tp1.6 sl2.4 tr0 h192 mn (5 · 5.00 · 3.36) |
| Minimal | follow | act-burst@m1c | 2 | 2 (100 %) | 80 | 83 % | 1.29 | 17.60 | tp1.4 sl4.2 tr0 h960 mn (40 · 1.29 · 8.80) |
| Minimal | magnet | hma-55@m1c | 18 | 9 (50 %) | 225 | 67 % | 1.14 | 17.52 | tp1 sl3 tr0.75 h1440 mn (11 · 2.88 · 6.14) |
| Minimal | pulse | kama-10@m5 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 17.49 | – |
| Minimal | sweep | break-vol@m15 | 4 | 4 (100 %) | 16 | 94 % | 33.71 | 17.47 | – |
| Minimal | magnet | r-inside@m1 | 5 | 5 (100 %) | 31 | 84 % | 2.39 | 17.20 | tp1.6 sl2.4 tr0 h960 mn (6 · 2.69 · 4.40) |
| Minimal | pivot | break-squeeze-30@m15 | 8 | 6 (75 %) | 26 | 77 % | 9.36 | 16.46 | – |
| Minimal | snap | trend-st-28-6@m1c | 2 | 2 (100 %) | 24 | 58 % | 3.23 | 16.27 | tp1 sl3 tr0.75 h960 mn (12 · 3.23 · 8.13) |
| Minimal | pulse | cmf-20-0.05@m1c | 15 | 8 (53 %) | 147 | 73 % | 1.11 | 15.10 | tp1.6 sl4 tr1.2 h960 mn (9 · 2.72 · 7.55) |
| Minimal | sweep | willr-50-90@m1c | 16 | 10 (63 %) | 140 | 73 % | 1.16 | 14.71 | tp1.4 sl3.5 tr1.05 h960 mn (8 · 2.48 · 5.49) |
| Minimal | magnet | willr-50-90@m15c | 10 | 10 (100 %) | 30 | 73 % | 4.43 | 14.57 | – |
| Minimal | sweep | r-streak-m@m5 | 8 | 8 (100 %) | 24 | 100 % | ∞ (no loss) | 14.33 | – |
| Minimal | clamp | ema-21-55@m1c | 17 | 12 (71 %) | 1184 | 73 % | 1.01 | 14.30 | tp1.4 sl4.2 tr1.05 h1440 mn (71 · 1.26 · 14.19) |
| Minimal | ribbon | r-camarilla@m1 | 5 | 5 (100 %) | 97 | 70 % | 1.28 | 14.04 | tp1 sl3 tr0.75 h1440 mn (20 · 1.92 · 9.41) |
| Minimal | pivot | bb-wick@m1c | 1 | 1 (100 %) | 18 | 72 % | 5.07 | 14.02 | tp1.4 sl2.8 tr1.05 h1440 mn (18 · 5.07 · 14.02) |
| Minimal | ribbon | break-don55@m1 | 4 | 4 (100 %) | 12 | 100 % | ∞ (no loss) | 13.87 | – |
| Minimal | pulse | trend-st-21-5@m1c | 5 | 5 (100 %) | 65 | 80 % | 1.30 | 13.80 | tp1.6 sl3.2 tr0 h960 mn (13 · 1.37 · 3.80) |
| Minimal | follow | trend-st@m1c | 1 | 1 (100 %) | 89 | 75 % | 1.21 | 13.31 | tp1.4 sl3.5 tr1.05 h1440 mn (89 · 1.21 · 13.31) |
| Minimal | pivot | r-pin-m@m5 | 6 | 5 (83 %) | 47 | 79 % | 1.73 | 13.01 | tp1 sl3 tr0.75 h288 mn (8 · ∞ (no loss) · 7.15) |
| Minimal | snap | trend-st-35-7@m1c | 2 | 2 (100 %) | 36 | 89 % | 2.00 | 12.80 | tp1 sl3 tr0 h960 mn (18 · 2.00 · 6.40) |
| Minimal | ribbon | bb-wick@m1c | 1 | 1 (100 %) | 16 | 69 % | 4.63 | 12.49 | tp1.4 sl2.8 tr1.05 h1440 mn (16 · 4.63 · 12.49) |
| Minimal | magnet | cci-20-100@m1c | 2 | 2 (100 %) | 119 | 74 % | 1.19 | 11.50 | tp1.4 sl3.5 tr0.7 h960 mn (61 · 1.22 · 6.84) |
| Minimal | ribbon | move-impulse-20-2.5@m15 | 4 | 4 (100 %) | 12 | 83 % | 122.03 | 11.32 | – |
| Minimal | clamp | break-retest@m15 | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 11.20 | – |
| Minimal | sweep | trend-st-35-7@m1c | 4 | 3 (75 %) | 40 | 80 % | 1.41 | 11.09 | tp1.6 sl4.8 tr0 h1440 mn (9 · 2.24 · 6.20) |
| Minimal | sweep | willr-14-90@m5c | 6 | 4 (67 %) | 29 | 69 % | 2.09 | 10.19 | tp1.6 sl3.2 tr1.2 h192 mn (5 · 29.51 · 5.70) |
| Minimal | sweep | r-elder@m30 | 76 | 30 (39 %) | 224 | 55 % | 1.18 | 10.13 | – |
| Minimal | revert | mc-trsi2-10@m5c | 6 | 4 (67 %) | 62 | 79 % | 1.32 | 10.02 | tp1.6 sl4.8 tr0 h288 mn (9 · 2.24 · 6.20) |
| Minimal | sandwich | trend-ema-12-26@m5c | 4 | 4 (100 %) | 29 | 83 % | 1.41 | 9.55 | tp1.6 sl4.8 tr0 h192 mn (7 · 1.68 · 3.40) |
| Minimal | pulse | trend-st@m5 | 11 | 5 (45 %) | 90 | 70 % | 1.15 | 9.30 | tp1.6 sl4 tr0.8 h192 mn (8 · 2.37 · 5.98) |
| Minimal | clamp | r-sweep-m@m5 | 4 | 4 (100 %) | 16 | 75 % | 4.94 | 9.20 | – |
| Minimal | pulse | trend-st-28-6@m1c | 6 | 4 (67 %) | 68 | 79 % | 1.15 | 9.20 | tp1.6 sl4.8 tr0 h960 mn (11 · 1.26 · 2.60) |
| Minimal | clamp | trend-ema-20-50@m1c | 1 | 1 (100 %) | 32 | 75 % | 1.30 | 9.04 | tp1.6 sl4.8 tr1.2 h1440 mn (32 · 1.30 · 9.04) |
| Minimal | sweep | r-bos-m@m30 | 12 | 10 (83 %) | 24 | 92 % | 2.67 | 9.00 | – |
| Minimal | clamp | dir-reclaim@m15c | 17 | 15 (88 %) | 17 | 88 % | 2.96 | 9.00 | – |
| Minimal | sweep | mc-brk-20@m15 | 3 | 3 (100 %) | 9 | 100 % | ∞ (no loss) | 9.00 | – |
| Minimal | sweep | mc-spike-2.5@m5 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 8.76 | – |
| Minimal | pulse | break-squeeze-30@m1 | 5 | 4 (80 %) | 43 | 81 % | 1.25 | 8.61 | tp1.6 sl4 tr0.8 h960 mn (8 · 1.74 · 3.10) |
| Minimal | pulse | r-qh-flow-m@m1 | 2 | 2 (100 %) | 20 | 70 % | 1.81 | 8.44 | tp1.6 sl4.8 tr1.2 h960 mn (10 · 1.81 · 4.22) |
| Minimal | ribbon | r-chand@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | pivot | mc-tstreak-4@m5 | 2 | 2 (100 %) | 14 | 86 % | 2.00 | 8.40 | tp1.6 sl4 tr0 h192 mn (7 · 2.00 · 4.20) |
| Minimal | ribbon | r-camarilla@m15c | 6 | 6 (100 %) | 8 | 100 % | ∞ (no loss) | 8.40 | – |
| Minimal | sandwich | rsi-21-30-70@m5 | 2 | 2 (100 %) | 42 | 71 % | 1.24 | 7.59 | tp1.2 sl3.6 tr0.9 h192 mn (21 · 1.24 · 3.80) |
| Minimal | snap | rsi-21-30-70@m5 | 2 | 2 (100 %) | 42 | 71 % | 1.24 | 7.59 | tp1.2 sl3.6 tr0.9 h192 mn (21 · 1.24 · 3.80) |
| Minimal | sweep | mfi-14-10@m1 | 3 | 2 (67 %) | 33 | 76 % | 1.34 | 7.56 | tp1.6 sl4 tr0 h960 mn (11 · 2.31 · 7.15) |
| Minimal | magnet | trend-ema-5-20@m1c | 2 | 2 (100 %) | 24 | 58 % | 1.27 | 7.15 | tp1.6 sl2.4 tr1.2 h960 mn (12 · 1.27 · 3.57) |
| Minimal | pulse | trend-ribbon@m5c | 16 | 10 (63 %) | 39 | 74 % | 1.29 | 7.15 | – |
| Minimal | clamp | mc-trsi2-10@m15 | 50 | 33 (66 %) | 78 | 58 % | 1.44 | 7.04 | – |
| Minimal | magnet | r-pin@m5 | 5 | 5 (100 %) | 36 | 69 % | 1.27 | 6.72 | tp1.6 sl4.8 tr0 h288 mn (6 · 1.40 · 2.00) |
| Minimal | sandwich | ema-slope-20-10@m1c | 2 | 2 (100 %) | 80 | 80 % | 1.09 | 6.40 | tp1.4 sl4.2 tr0 h960 mn (40 · 1.09 · 3.20) |
| Minimal | sweep | z-50-2.5@m1 | 2 | 2 (100 %) | 52 | 69 % | 1.33 | 6.37 | tp0.8 sl1.6 tr0.6 h960 mn (26 · 1.33 · 3.18) |
| Minimal | sandwich | trend-ema-5-20@m5 | 4 | 4 (100 %) | 23 | 70 % | 1.31 | 6.31 | tp1.6 sl4.8 tr1.2 h192 mn (6 · 1.56 · 2.85) |
| Minimal | pivot | break-squeeze-120@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 6.20 | – |
| Minimal | sweep | obv-50@m1c | 2 | 2 (100 %) | 48 | 67 % | 1.13 | 5.90 | tp1.6 sl4 tr1.2 h960 mn (24 · 1.18 · 3.93) |
| Minimal | pivot | mc-trsi2-10@m15 | 49 | 32 (65 %) | 77 | 57 % | 1.36 | 5.84 | – |
| Minimal | magnet | cmf-20-0.05@m1c | 1 | 1 (100 %) | 13 | 85 % | 1.54 | 5.40 | tp1.6 sl4.8 tr0 h1440 mn (13 · 1.54 · 5.40) |
| Minimal | sweep | mc-mrsi2-10@m15c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 5.38 | – |
| Minimal | follow | r-qh-rev-m@m1 | 1 | 1 (100 %) | 6 | 100 % | ∞ (no loss) | 5.20 | tp1.6 sl4.8 tr1.2 h1440 mn (6 · ∞ (no loss) · 5.20) |
| Minimal | sweep | r-pin-m@m15 | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 5.07 | – |
| Minimal | ribbon | r-valuearea@m5 | 1 | 1 (100 %) | 6 | 67 % | 18.76 | 4.90 | tp1.6 sl3.2 tr0.8 h288 mn (6 · 18.76 · 4.90) |
| Minimal | clamp | mc-trsi2-10@m15c | 32 | 20 (63 %) | 47 | 57 % | 1.45 | 4.87 | – |
| Minimal | pivot | mc-trsi2-10@m15c | 32 | 20 (63 %) | 47 | 57 % | 1.45 | 4.87 | – |
| Minimal | magnet | trend-ema-20-50@m1 | 6 | 3 (50 %) | 52 | 63 % | 1.10 | 4.75 | tp1.6 sl2.4 tr1.2 h960 mn (9 · 1.73 · 5.70) |
| Minimal | revert | r-ultimate-m@m1 | 1 | 1 (100 %) | 11 | 82 % | 1.78 | 4.65 | tp1.4 sl2.8 tr1.05 h960 mn (11 · 1.78 · 4.65) |
| Minimal | magnet | ha-3@m5 | 1 | 1 (100 %) | 10 | 70 % | 1.91 | 4.65 | tp1.6 sl4.8 tr0.8 h192 mn (10 · 1.91 · 4.65) |
| Minimal | pivot | break-squeeze@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 4.60 | – |
| Minimal | magnet | mfi-14-20@m5c | 16 | 6 (38 %) | 6 | 100 % | ∞ (no loss) | 4.40 | – |
| Minimal | pivot | mc-lag-3@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 4.40 | – |
| Minimal | ribbon | r-bb-adx-m@m1 | 1 | 1 (100 %) | 13 | 85 % | 2.00 | 4.40 | tp1 sl2 tr0 h960 mn (13 · 2.00 · 4.40) |
| Minimal | pulse | trend-st-35-7@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 4.40 | – |
| Minimal | ribbon | trend-st-21-5@m1c | 25 | 13 (52 %) | 1205 | 68 % | 1.00 | 4.37 | tp1.6 sl4.8 tr0 h1440 mn (40 · 1.32 · 11.20) |
| Minimal | clamp | r-bb-adx-m@m1 | 2 | 2 (100 %) | 22 | 45 % | 5.01 | 4.19 | tp1.2 sl1.8 tr0.6 h960 mn (11 · 5.20 · 2.20) |
| Minimal | pulse | trix-9@m1 | 1 | 1 (100 %) | 39 | 74 % | 1.11 | 4.12 | tp1.6 sl4.8 tr0 h960 mn (39 · 1.11 · 4.12) |
| Minimal | sweep | mc-rsi9-25@m5c | 16 | 10 (63 %) | 96 | 69 % | 1.06 | 4.00 | tp1.4 sl2.8 tr1.05 h192 mn (6 · 1.61 · 1.91) |
| Minimal | snap | trend-st-35-7@m5c | 3 | 3 (100 %) | 21 | 86 % | 1.30 | 3.95 | tp1.6 sl4 tr1.2 h192 mn (7 · 1.38 · 1.58) |
| Minimal | magnet | r-laguerre-m@m15 | 4 | 4 (100 %) | 8 | 75 % | 70.39 | 3.94 | – |
| Minimal | revert | r-nr-break-m@m5c | 8 | 7 (88 %) | 17 | 41 % | 1.58 | 3.82 | – |
| Minimal | ribbon | r-sweep-m@m5 | 3 | 3 (100 %) | 12 | 75 % | 1.33 | 3.00 | – |
| Minimal | pulse | trend-ema@m1 | 3 | 2 (67 %) | 24 | 54 % | 1.20 | 2.93 | tp1.6 sl4 tr0.8 h1440 mn (8 · 1.43 · 1.96) |
| Minimal | sweep | mc-trsi2-10@m15c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 2.85 | – |
| Minimal | sandwich | rsi-mid@m1 | 2 | 2 (100 %) | 24 | 67 % | 1.22 | 2.83 | tp1 sl3 tr0.75 h960 mn (12 · 1.22 · 1.42) |
| Minimal | follow | move-impulse-10-2@m1c | 1 | 1 (100 %) | 61 | 72 % | 1.05 | 2.66 | tp1.6 sl4 tr1.2 h1440 mn (61 · 1.05 · 2.66) |
| Minimal | ribbon | break-squeeze-t25@m1 | 1 | 1 (100 %) | 11 | 82 % | 1.41 | 2.60 | tp1.2 sl3 tr0 h1440 mn (11 · 1.41 · 2.60) |
| Minimal | sweep | willr-28-95@m1 | 3 | 2 (67 %) | 37 | 76 % | 1.06 | 2.53 | tp1.6 sl4.8 tr1.2 h960 mn (13 · 1.20 · 3.01) |
| Minimal | magnet | trend-st-14-2@m1c | 82 | 38 (46 %) | 1191 | 65 % | 1.00 | 2.45 | tp1.4 sl2.1 tr1.05 h1440 mn (13 · 1.72 · 5.05) |
| Minimal | pivot | trend-st-14-2@m1c | 1 | 1 (100 %) | 20 | 65 % | 1.14 | 2.30 | tp1.6 sl2.4 tr0 h960 mn (20 · 1.14 · 2.30) |
| Minimal | clamp | trend-ribbon@m1c | 3 | 2 (67 %) | 81 | 75 % | 1.02 | 2.00 | tp1.6 sl4.8 tr1.2 h960 mn (27 · 1.04 · 1.30) |
| Minimal | sandwich | trend-ema-5-20@m5c | 5 | 4 (80 %) | 30 | 67 % | 1.07 | 1.94 | tp1.6 sl4.8 tr1.2 h192 mn (6 · 1.56 · 2.85) |
| Minimal | pulse | trend-st-14-4@m5c | 2 | 2 (100 %) | 24 | 42 % | 1.43 | 1.69 | tp1 sl3 tr0.5 h192 mn (12 · 1.43 · 0.85) |
| Minimal | pivot | r-bb-adx-m@m5 | 2 | 2 (100 %) | 12 | 83 % | 1.36 | 1.60 | tp0.8 sl2 tr0 h192 mn (6 · 1.36 · 0.80) |
| Minimal | ribbon | mc-lag-6@m5 | 6 | 2 (33 %) | 48 | 73 % | 1.04 | 1.37 | tp1.2 sl3.6 tr0 h192 mn (8 · 1.84 · 3.20) |
| Minimal | follow | mc-tpull-8@m5c | 35 | 22 (63 %) | 174 | 53 % | 1.02 | 1.01 | tp1.2 sl2.4 tr0 h192 mn (5 · 1.54 · 1.40) |
| Minimal | ribbon | ema-slope-10@m1 | 1 | 1 (100 %) | 6 | 83 % | 1.25 | 0.80 | tp1 sl3 tr0 h960 mn (6 · 1.25 · 0.80) |
| Minimal | follow | rsi-14-20-80@m5c | 4 | 2 (50 %) | 16 | 75 % | 1.04 | 0.72 | – |
| Minimal | revert | rsi-mom-14-20@m5c | 4 | 2 (50 %) | 16 | 75 % | 1.04 | 0.72 | – |
| Minimal | revert | r-engulf@m5 | 2 | 2 (100 %) | 6 | 67 % | 1.08 | 0.40 | – |
| Minimal | snap | ha-3@m1 | 1 | 1 (100 %) | 9 | 78 % | 1.07 | 0.33 | tp1 sl2 tr0.75 h1440 mn (9 · 1.07 · 0.33) |
| Minimal | ribbon | r-valuearea-m@m15 | 86 | 2 (2 %) | 8 | 25 % | 1.28 | 0.26 | – |
| Minimal | sweep | trend-st-28-6@m1c | 11 | 8 (73 %) | 136 | 69 % | 1.00 | 0.08 | tp1.6 sl4.8 tr1.2 h960 mn (11 · 1.50 · 5.02) |
| Minimal | pivot | r-bb-adx-m@m1 | 2 | 1 (50 %) | 24 | 42 % | 0.97 | -0.17 | tp1.2 sl1.8 tr0.6 h960 mn (12 · 1.05 · 0.12) |
| Minimal | pulse | rsi-mid@m1 | 13 | 4 (31 %) | 86 | 67 % | 0.99 | -0.58 | tp1.4 sl4.2 tr0 h960 mn (6 · 1.36 · 1.60) |
| Minimal | magnet | mc-rsit5-10@m5 | 1 | 0 (0 %) | 31 | 68 % | 0.97 | -0.75 | tp1.4 sl4.2 tr1.05 h192 mn (31 · 0.97 · -0.75) |
| Minimal | sandwich | break-vol-2@m1 | 3 | 1 (33 %) | 18 | 61 % | 0.92 | -1.17 | tp1.6 sl4.8 tr1.2 h1440 mn (6 · 1.20 · 1.06) |
| Minimal | magnet | r-chand@m5 | 2 | 0 (0 %) | 6 | 67 % | 0.67 | -1.20 | – |
| Minimal | pulse | ichi-cloud-20@m5c | 3 | 2 (67 %) | 25 | 52 % | 0.90 | -1.29 | tp1.2 sl3.6 tr0.6 h192 mn (9 · 1.82 · 1.45) |
| Minimal | sweep | mc-lag-12@m5 | 5 | 3 (60 %) | 56 | 71 % | 0.97 | -1.40 | tp1.6 sl4.8 tr0 h192 mn (10 · 1.12 · 1.20) |
| Minimal | revert | break-vol@x4@m5 | 1 | 0 (0 %) | 14 | 64 % | 0.89 | -1.42 | tp1.6 sl2.4 tr1.2 h288 mn (14 · 0.89 · -1.42) |
| Minimal | sandwich | kelt-20-1.5@m5c | 2 | 0 (0 %) | 8 | 75 % | 0.84 | -1.60 | – |
| Minimal | ribbon | mc-tmom-3@m5 | 2 | 0 (0 %) | 8 | 50 % | 0.77 | -1.84 | – |
| Minimal | pulse | obv-20@m5c | 2 | 0 (0 %) | 18 | 78 % | 0.81 | -2.00 | tp0.8 sl2.4 tr0 h192 mn (9 · 0.81 · -1.00) |
| Minimal | sandwich | trend-ema@m5c | 2 | 1 (50 %) | 15 | 60 % | 0.86 | -2.21 | tp1.6 sl4.8 tr0 h288 mn (6 · 1.40 · 2.00) |
| Minimal | ribbon | cmf-20-0.1@m1c | 1 | 0 (0 %) | 6 | 50 % | 0.52 | -2.29 | tp1.6 sl4 tr1.2 h1440 mn (6 · 0.52 · -2.29) |
| Minimal | clamp | mc-rsi4-15@m5c | 1 | 0 (0 %) | 5 | 40 % | 0.56 | -2.35 | tp1.6 sl4.8 tr0.8 h288 mn (5 · 0.56 · -2.35) |
| Minimal | clamp | mc-rsi5-15@m5c | 1 | 0 (0 %) | 5 | 40 % | 0.56 | -2.35 | tp1.6 sl4.8 tr0.8 h288 mn (5 · 0.56 · -2.35) |
| Minimal | sandwich | move-impulse-10-2@m5c | 4 | 0 (0 %) | 16 | 75 % | 0.87 | -2.69 | – |
| Minimal | sandwich | trend-adx-30@m5 | 1 | 0 (0 %) | 7 | 71 % | 0.70 | -3.00 | tp1.6 sl4.8 tr0 h288 mn (7 · 0.70 · -3.00) |
| Minimal | pulse | break-squeeze@m1 | 6 | 2 (33 %) | 42 | 76 % | 0.91 | -3.79 | tp1.6 sl4 tr0.8 h960 mn (7 · 1.41 · 1.70) |
| Minimal | magnet | willr-21-90@m5c | 5 | 3 (60 %) | 48 | 56 % | 0.89 | -3.94 | tp1.4 sl2.1 tr0.7 h192 mn (10 · 1.17 · 0.82) |
| Minimal | sandwich | trend-ema@m5 | 2 | 0 (0 %) | 15 | 67 % | 0.80 | -3.95 | tp1.6 sl4.8 tr1.2 h288 mn (8 · 0.91 · -0.95) |
| Minimal | sweep | r-bb-adx-m@m5 | 1 | 0 (0 %) | 5 | 60 % | 0.38 | -4.00 | tp1 sl3 tr0 h192 mn (5 · 0.38 · -4.00) |
| Minimal | sandwich | hma-32@m5c | 2 | 0 (0 %) | 6 | 67 % | 0.56 | -4.40 | – |
| Minimal | ribbon | move-impulse@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.53 | -4.60 | – |
| Minimal | sandwich | hma-32@m1c | 2 | 0 (0 %) | 24 | 54 % | 0.73 | -4.68 | tp1 sl1.5 tr0.75 h960 mn (12 · 0.79 · -1.78) |
| Minimal | pivot | r-streak@m5 | 1 | 0 (0 %) | 15 | 67 % | 0.70 | -4.70 | tp1.6 sl4.8 tr1.2 h288 mn (15 · 0.70 · -4.70) |
| Minimal | follow | r-streak@m5 | 1 | 0 (0 %) | 15 | 67 % | 0.70 | -4.70 | tp1.6 sl4.8 tr1.2 h288 mn (15 · 0.70 · -4.70) |
| Minimal | sweep | trend-st-21-5@m1c | 1 | 0 (0 %) | 10 | 70 % | 0.64 | -4.80 | tp1.4 sl4.2 tr0 h1440 mn (10 · 0.64 · -4.80) |
| Minimal | sandwich | hma-16@m1c | 2 | 0 (0 %) | 8 | 50 % | 0.45 | -4.98 | – |
| Minimal | sandwich | mc-turn-10@m5 | 4 | 2 (50 %) | 8 | 50 % | 0.37 | -5.12 | – |
| Minimal | magnet | trend-ema-12-26@m1c | 7 | 1 (14 %) | 57 | 68 % | 0.85 | -5.19 | tp1.6 sl2.4 tr0 h1440 mn (7 · 1.35 · 1.80) |
| Minimal | pulse | ichi-cloud-9@m5 | 1 | 0 (0 %) | 6 | 50 % | 0.41 | -5.22 | tp1.4 sl4.2 tr1.05 h192 mn (6 · 0.41 · -5.22) |
| Minimal | pulse | r-zdist-m@m5 | 1 | 0 (0 %) | 25 | 52 % | 0.67 | -5.52 | tp1 sl1.5 tr0.75 h288 mn (25 · 0.67 · -5.52) |
| Minimal | follow | macd-cross@m5c | 3 | 1 (33 %) | 34 | 71 % | 0.83 | -5.55 | tp1.2 sl3.6 tr0.6 h288 mn (12 · 1.18 · 1.45) |
| Minimal | sandwich | mc-ibrk@m5 | 11 | 4 (36 %) | 33 | 39 % | 0.62 | -5.77 | – |
| Minimal | sandwich | trend-ema-20-50@m5c | 17 | 8 (47 %) | 217 | 71 % | 0.97 | -5.89 | tp1.6 sl4.8 tr1.2 h192 mn (12 · 1.58 · 5.76) |
| Minimal | clamp | r-streak@m5 | 1 | 0 (0 %) | 15 | 67 % | 0.62 | -5.94 | tp1.6 sl4.8 tr1.2 h288 mn (15 · 0.62 · -5.94) |
| Minimal | magnet | macd-zero@m1c | 14 | 5 (36 %) | 182 | 67 % | 0.96 | -6.13 | tp1.6 sl4.8 tr0 h1440 mn (11 · 1.26 · 2.60) |
| Minimal | magnet | dir-emax-12-26@m1c | 14 | 5 (36 %) | 182 | 67 % | 0.96 | -6.13 | tp1.6 sl4.8 tr0 h1440 mn (11 · 1.26 · 2.60) |
| Minimal | magnet | mc-rsi5-15@m5 | 3 | 0 (0 %) | 39 | 64 % | 0.84 | -6.45 | tp1.6 sl3.2 tr0 h192 mn (13 · 0.93 · -1.00) |
| Minimal | ribbon | r-streak@m5 | 1 | 0 (0 %) | 14 | 64 % | 0.59 | -6.49 | tp1.6 sl4.8 tr1.2 h288 mn (14 · 0.59 · -6.49) |
| Minimal | sandwich | cci-40-200@m5c | 2 | 0 (0 %) | 16 | 63 % | 0.60 | -6.52 | tp1 sl3 tr0.75 h288 mn (8 · 0.86 · -0.92) |
| Minimal | snap | cci-40-200@m5c | 2 | 0 (0 %) | 16 | 63 % | 0.60 | -6.52 | tp1 sl3 tr0.75 h288 mn (8 · 0.86 · -0.92) |
| Minimal | pulse | cci-40-200@m5c | 2 | 0 (0 %) | 16 | 63 % | 0.60 | -6.52 | tp1 sl3 tr0.75 h288 mn (8 · 0.86 · -0.92) |
| Minimal | snap | cci-20-200@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.33 | -6.60 | – |
| Minimal | snap | srsi-14-10@m5c | 1 | 0 (0 %) | 7 | 43 % | 0.30 | -6.77 | tp1 sl3 tr0.75 h288 mn (7 · 0.30 · -6.77) |
| Minimal | pivot | z-50-2.5@x4@m5 | 2 | 0 (0 %) | 37 | 68 % | 0.83 | -6.83 | tp1.6 sl4.8 tr0 h288 mn (17 · 0.91 · -1.80) |
| Minimal | ribbon | r-streak-m@m5 | 2 | 0 (0 %) | 22 | 82 % | 0.65 | -6.97 | tp1.6 sl4.8 tr0.8 h192 mn (11 · 0.65 · -3.48) |
| Minimal | revert | r-bos@m15c | 7 | 2 (29 %) | 42 | 76 % | 0.80 | -7.07 | tp1.6 sl4 tr0.8 h64 mn (6 · 1.00 · 0.01) |
| Minimal | sandwich | mc-rsit2-20@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.18 | -7.20 | – |
| Minimal | sandwich | trix-9@m1c | 3 | 0 (0 %) | 96 | 73 % | 0.91 | -7.21 | tp1.4 sl4.2 tr0 h960 mn (31 · 0.94 · -2.00) |
| Minimal | pivot | r-streak-m@m5 | 2 | 0 (0 %) | 24 | 75 % | 0.64 | -7.34 | tp1.6 sl4.8 tr0.8 h192 mn (12 · 0.64 · -3.67) |
| Minimal | follow | r-streak-m@m5 | 2 | 0 (0 %) | 24 | 75 % | 0.64 | -7.34 | tp1.6 sl4.8 tr0.8 h192 mn (12 · 0.64 · -3.67) |
| Minimal | ribbon | cci-14-200@x4@m15 | 2 | 0 (0 %) | 6 | 0 % | 0.00 | -7.61 | – |
| Minimal | revert | r-fvg-m@m5 | 1 | 0 (0 %) | 31 | 65 % | 0.71 | -7.82 | tp1.4 sl4.2 tr0.7 h192 mn (31 · 0.71 · -7.82) |
| Minimal | revert | break-vol-2@x4@m5 | 3 | 0 (0 %) | 24 | 75 % | 0.74 | -7.91 | tp1.6 sl4.8 tr0 h192 mn (8 · 0.84 · -1.60) |
| Minimal | pulse | srsi-14-10@m5c | 1 | 0 (0 %) | 8 | 38 % | 0.27 | -7.97 | tp1 sl2.5 tr0.75 h288 mn (8 · 0.27 · -7.97) |
| Minimal | snap | willr-14-90@m5c | 2 | 0 (0 %) | 16 | 50 % | 0.50 | -8.00 | tp1.2 sl1.8 tr0 h192 mn (8 · 0.50 · -4.00) |
| Minimal | sandwich | willr-14-95@m1 | 3 | 0 (0 %) | 152 | 63 % | 0.91 | -8.11 | tp1.2 sl3.6 tr0.6 h1440 mn (51 · 0.99 · -0.26) |
| Minimal | snap | r-fakeout@m5 | 1 | 0 (0 %) | 14 | 36 % | 0.48 | -8.12 | tp1.6 sl2.4 tr1.2 h288 mn (14 · 0.48 · -8.12) |
| Minimal | follow | kelt-20-1.5@m1c | 2 | 0 (0 %) | 129 | 73 % | 0.94 | -8.15 | tp1.6 sl4 tr0 h1440 mn (63 · 0.98 · -1.40) |
| Minimal | pivot | mc-turn-10@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.33 | -8.40 | – |
| Minimal | pivot | r-pin@m5 | 1 | 0 (0 %) | 12 | 67 % | 0.56 | -8.80 | tp1.6 sl4.8 tr0 h288 mn (12 · 0.56 · -8.80) |
| Minimal | revert | dir-reclaim@m1c | 2 | 0 (0 %) | 39 | 72 % | 0.82 | -8.97 | tp1.6 sl4.8 tr1.2 h1440 mn (20 · 0.86 · -3.57) |
| Minimal | sandwich | trend-st-35-7@m15 | 6 | 0 (0 %) | 12 | 50 % | 0.33 | -9.00 | – |
| Minimal | snap | mc-rsrev-12@m5 | 2 | 0 (0 %) | 46 | 70 % | 0.77 | -9.18 | tp1.6 sl4.8 tr0.8 h192 mn (23 · 0.77 · -4.59) |
| Minimal | magnet | obv-20@m1c | 3 | 1 (33 %) | 122 | 66 % | 0.92 | -9.24 | tp1.6 sl4.8 tr0 h1440 mn (39 · 1.09 · 3.40) |
| Minimal | snap | willr-7-95@m1 | 1 | 0 (0 %) | 12 | 50 % | 0.21 | -9.29 | tp1.2 sl3.6 tr0.6 h960 mn (12 · 0.21 · -9.29) |
| Minimal | sweep | mc-rsi2-25@m5c | 1 | 0 (0 %) | 45 | 62 % | 0.74 | -9.88 | tp1.4 sl4.2 tr0.7 h288 mn (45 · 0.74 · -9.88) |
| Minimal | revert | r-engulf@m1 | 3 | 1 (33 %) | 66 | 67 % | 0.80 | -10.45 | tp1.6 sl4 tr0.8 h960 mn (22 · 1.22 · 2.49) |
| Minimal | sandwich | mc-rsi4-20@m5c | 7 | 4 (57 %) | 50 | 60 % | 0.80 | -11.33 | tp1.2 sl3 tr0.9 h192 mn (7 · 1.20 · 1.34) |
| Minimal | snap | mc-rsi4-20@m5c | 7 | 4 (57 %) | 50 | 60 % | 0.80 | -11.33 | tp1.2 sl3 tr0.9 h192 mn (7 · 1.20 · 1.34) |
| Minimal | snap | mc-rsit2-15@m15 | 6 | 0 (0 %) | 12 | 50 % | 0.28 | -11.60 | – |
| Minimal | follow | mc-spike-2.5@m30 | 2 | 0 (0 %) | 10 | 60 % | 0.42 | -11.60 | tp1.6 sl4.8 tr0 h32 mn (5 · 0.42 · -5.80) |
| Minimal | ribbon | act-hf@m30 | 4 | 0 (0 %) | 30 | 67 % | 0.62 | -11.71 | tp1.6 sl4.8 tr0.8 h32 mn (7 · 0.79 · -1.23) |
| Minimal | clamp | mc-z-20@m5c | 3 | 1 (33 %) | 51 | 61 % | 0.77 | -11.76 | tp1.6 sl4 tr0 h288 mn (16 · 1.00 · 0.00) |
| Minimal | clamp | r-pin-m@m15 | 8 | 0 (0 %) | 32 | 56 % | 0.42 | -12.27 | – |
| Minimal | clamp | r-streak-m@m5 | 3 | 0 (0 %) | 30 | 70 % | 0.58 | -12.28 | tp1.6 sl4 tr0.8 h288 mn (10 · 0.65 · -3.03) |
| Minimal | pulse | sar-0.01@m5 | 6 | 0 (0 %) | 18 | 50 % | 0.38 | -12.31 | – |
| Minimal | pivot | kama-10@m5c | 5 | 2 (40 %) | 45 | 60 % | 0.72 | -12.61 | tp1.4 sl3.5 tr0.7 h192 mn (9 · 1.66 · 3.30) |
| Minimal | sandwich | break-don20@m5 | 46 | 17 (37 %) | 480 | 61 % | 0.96 | -12.64 | tp1.6 sl4.8 tr1.2 h288 mn (9 · 1.80 · 4.13) |
| Minimal | magnet | kama-10@m5c | 31 | 12 (39 %) | 86 | 56 % | 0.80 | -13.38 | – |
| Minimal | sandwich | ema-50-100@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -13.40 | – |
| Minimal | pulse | ema-50-100@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -13.40 | – |
| Minimal | ribbon | rsi-fast@m5 | 1 | 0 (0 %) | 30 | 60 % | 0.55 | -13.52 | tp1.4 sl3.5 tr1.05 h288 mn (30 · 0.55 · -13.52) |
| Minimal | ribbon | mc-rsi7-20@m5 | 1 | 0 (0 %) | 30 | 60 % | 0.55 | -13.52 | tp1.4 sl3.5 tr1.05 h288 mn (30 · 0.55 · -13.52) |
| Minimal | pivot | rsi-fast@m5 | 1 | 0 (0 %) | 30 | 60 % | 0.55 | -13.52 | tp1.4 sl3.5 tr1.05 h288 mn (30 · 0.55 · -13.52) |
| Minimal | pivot | mc-rsi7-20@m5 | 1 | 0 (0 %) | 30 | 60 % | 0.55 | -13.52 | tp1.4 sl3.5 tr1.05 h288 mn (30 · 0.55 · -13.52) |
| Minimal | ribbon | trend-adx@m1 | 12 | 2 (17 %) | 33 | 70 % | 0.47 | -13.77 | – |
| Minimal | ribbon | r-pin@m5 | 1 | 0 (0 %) | 13 | 62 % | 0.45 | -13.80 | tp1.6 sl4.8 tr0 h288 mn (13 · 0.45 · -13.80) |
| Minimal | pulse | willr-14-95@m1 | 3 | 0 (0 %) | 69 | 62 % | 0.62 | -13.87 | tp1 sl3 tr0.5 h960 mn (23 · 0.77 · -2.35) |
| Minimal | clamp | break-squeeze-t10@m5 | 28 | 11 (39 %) | 154 | 66 % | 0.81 | -14.33 | tp1 sl2.5 tr0.5 h192 mn (6 · 20.70 · 2.56) |
| Minimal | ribbon | trend-st-21-3@m15c | 11 | 0 (0 %) | 85 | 66 % | 0.80 | -14.38 | tp1.6 sl4 tr0 h64 mn (8 · 1.00 · -0.00) |
| Minimal | sandwich | r-fakeout-m@m5 | 2 | 0 (0 %) | 33 | 42 % | 0.60 | -14.58 | tp1.6 sl2.4 tr1.2 h288 mn (16 · 0.61 · -7.15) |
| Minimal | snap | mc-rsit4-30@m5 | 2 | 0 (0 %) | 33 | 67 % | 0.64 | -14.60 | tp1.6 sl4.8 tr1.2 h288 mn (16 · 0.65 · -7.16) |
| Minimal | clamp | break-squeeze-30@m5 | 2 | 0 (0 %) | 20 | 50 % | 0.29 | -14.81 | tp1 sl3 tr0.75 h288 mn (10 · 0.40 · -5.91) |
| Minimal | magnet | break-vol-1.3@m15 | 10 | 2 (20 %) | 20 | 40 % | 0.42 | -15.00 | – |
| Minimal | sweep | willr-50-95@m1 | 4 | 2 (50 %) | 88 | 70 % | 0.86 | -15.26 | tp1.6 sl4.8 tr1.2 h960 mn (23 · 1.05 · 1.22) |
| Minimal | magnet | willr-50-90@m5c | 4 | 0 (0 %) | 51 | 65 % | 0.74 | -15.50 | tp1.4 sl3.5 tr0 h192 mn (13 · 0.83 · -2.17) |
| Minimal | magnet | willr-7-95@m1 | 2 | 0 (0 %) | 22 | 55 % | 0.48 | -16.02 | tp1.2 sl3.6 tr0.9 h960 mn (11 · 0.48 · -8.01) |
| Minimal | follow | break-atr@m1c | 1 | 0 (0 %) | 58 | 69 % | 0.78 | -16.07 | tp1.6 sl4 tr0 h960 mn (58 · 0.78 · -16.07) |
| Minimal | sweep | mc-lag-6@m15 | 15 | 1 (7 %) | 27 | 11 % | 0.14 | -16.25 | – |
| Minimal | sandwich | ema-slope-20-10@m5c | 1 | 0 (0 %) | 21 | 62 % | 0.51 | -16.43 | tp1.6 sl4 tr0 h192 mn (21 · 0.51 · -16.43) |
| Minimal | follow | break-vol-1.3@m1c | 2 | 0 (0 %) | 18 | 44 % | 0.29 | -16.51 | tp1.2 sl3.6 tr0.9 h960 mn (9 · 0.29 · -8.26) |
| Minimal | snap | mc-mturn-10@m5 | 3 | 0 (0 %) | 33 | 45 % | 0.65 | -16.57 | tp1.6 sl2.4 tr1.2 h288 mn (11 · 0.78 · -2.86) |
| Minimal | snap | r-fakeout-m@m5 | 2 | 0 (0 %) | 25 | 48 % | 0.39 | -16.71 | tp1.6 sl2.4 tr0.8 h288 mn (12 · 0.40 · -8.21) |
| Minimal | ribbon | move-impulse-20-2.5@m30 | 10 | 2 (20 %) | 10 | 20 % | 0.10 | -17.20 | – |
| Minimal | sandwich | z-50-2.5@x4@m5 | 4 | 0 (0 %) | 70 | 64 % | 0.69 | -17.38 | tp1 sl3 tr0.75 h288 mn (17 · 0.90 · -1.12) |
| Minimal | snap | z-50-2.5@x4@m5 | 4 | 0 (0 %) | 70 | 64 % | 0.69 | -17.38 | tp1 sl3 tr0.75 h288 mn (17 · 0.90 · -1.12) |
| Minimal | pulse | z-50-2.5@x4@m5 | 4 | 0 (0 %) | 70 | 64 % | 0.69 | -17.38 | tp1 sl3 tr0.75 h288 mn (17 · 0.90 · -1.12) |
| Minimal | pulse | rsi-fast@m5c | 3 | 0 (0 %) | 24 | 38 % | 0.34 | -17.67 | tp1.2 sl1.8 tr0.9 h192 mn (8 · 0.38 · -5.09) |
| Minimal | pulse | mc-rsi7-20@m5c | 3 | 0 (0 %) | 24 | 38 % | 0.34 | -17.67 | tp1.2 sl1.8 tr0.9 h192 mn (8 · 0.38 · -5.09) |
| Minimal | pivot | break-squeeze@m5 | 6 | 0 (0 %) | 42 | 48 % | 0.42 | -17.74 | tp0.8 sl1.2 tr0.6 h192 mn (7 · 0.52 · -2.07) |
| Minimal | pulse | cci-14-200@m1 | 5 | 0 (0 %) | 182 | 55 % | 0.80 | -17.81 | tp1.2 sl2.4 tr0.6 h960 mn (37 · 0.89 · -1.91) |
| Minimal | sandwich | dir-vwap@m1c | 6 | 1 (17 %) | 262 | 67 % | 0.91 | -18.04 | tp1.4 sl3.5 tr0.7 h1440 mn (44 · 1.02 · 0.66) |
| Minimal | magnet | r-awesome@m1 | 3 | 0 (0 %) | 53 | 72 % | 0.73 | -18.20 | tp1.4 sl4.2 tr0 h1440 mn (18 · 0.95 · -0.80) |
| Minimal | sandwich | willr-7-95@m1 | 3 | 0 (0 %) | 65 | 60 % | 0.65 | -18.28 | tp1.2 sl3.6 tr0.6 h960 mn (22 · 0.66 · -5.43) |
| Minimal | magnet | r-streak@m5 | 4 | 0 (0 %) | 42 | 76 % | 0.58 | -18.31 | tp1.6 sl4.8 tr1.2 h288 mn (9 · 0.64 · -3.63) |
| Minimal | clamp | r-pin-m@m5 | 6 | 2 (33 %) | 36 | 61 % | 0.57 | -19.18 | tp1.4 sl4.2 tr0.7 h288 mn (6 · 7.49 · 3.91) |
| Minimal | clamp | break-squeeze@m5 | 7 | 0 (0 %) | 51 | 63 % | 0.49 | -19.70 | tp1 sl2 tr0.5 h192 mn (8 · 0.71 · -1.29) |
| Minimal | ribbon | dir-thrust-4@m5 | 34 | 12 (35 %) | 308 | 73 % | 0.92 | -19.86 | tp1.4 sl2.1 tr1.05 h192 mn (9 · 1.55 · 2.61) |
| Minimal | sandwich | mc-rsi5-15@m5 | 2 | 0 (0 %) | 24 | 54 % | 0.36 | -20.63 | tp1 sl3 tr0.75 h288 mn (12 · 0.37 · -10.23) |
| Minimal | pulse | mc-rsi5-15@m5 | 2 | 0 (0 %) | 24 | 54 % | 0.36 | -20.63 | tp1 sl3 tr0.75 h288 mn (12 · 0.37 · -10.23) |
| Minimal | sandwich | break-squeeze-t10@m5 | 20 | 10 (50 %) | 36 | 56 % | 0.42 | -20.74 | – |
| Minimal | pulse | break-squeeze-t10@m5 | 20 | 10 (50 %) | 36 | 56 % | 0.42 | -20.74 | – |
| Minimal | sandwich | trend-ema-20-50@m1c | 14 | 3 (21 %) | 359 | 69 % | 0.93 | -20.94 | tp1.2 sl3.6 tr0.9 h1440 mn (26 · 1.13 · 2.09) |
| Minimal | magnet | break-don40@m15 | 5 | 0 (0 %) | 10 | 50 % | 0.12 | -21.26 | – |
| Minimal | ribbon | trend-ema-20-50@m1 | 1 | 0 (0 %) | 22 | 36 % | 0.27 | -21.34 | tp1.6 sl3.2 tr1.2 h960 mn (22 · 0.27 · -21.34) |
| Minimal | magnet | r-spring@m1 | 6 | 1 (17 %) | 76 | 54 % | 0.70 | -21.50 | tp1.6 sl2.4 tr1.2 h960 mn (13 · 1.04 · 0.44) |
| Minimal | sandwich | break-don10@m5 | 26 | 8 (31 %) | 304 | 63 % | 0.90 | -22.27 | tp1.6 sl4.8 tr1.2 h192 mn (11 · 1.45 · 2.87) |
| Minimal | clamp | dir-emax-20-50@m1c | 4 | 0 (0 %) | 263 | 75 % | 0.90 | -23.55 | tp1.6 sl4.8 tr1.2 h1440 mn (63 · 0.99 · -0.79) |
| Minimal | clamp | cci-40-200@x4@m5 | 2 | 0 (0 %) | 53 | 53 % | 0.58 | -23.82 | tp1.6 sl2.4 tr1.2 h288 mn (27 · 0.59 · -11.89) |
| Minimal | sandwich | trend-ema-12-26@m1c | 9 | 1 (11 %) | 72 | 61 % | 0.53 | -23.83 | tp1 sl2 tr0 h1440 mn (8 · 1.09 · 0.40) |
| Minimal | pivot | r-cvd-div-m@m5c | 3 | 1 (33 %) | 19 | 53 % | 0.22 | -24.01 | tp1.6 sl4.8 tr0.8 h288 mn (8 · 3.72 · 1.77) |
| Minimal | clamp | r-cvd-div-m@m5c | 3 | 1 (33 %) | 17 | 53 % | 0.21 | -24.35 | tp1.6 sl4.8 tr0.8 h288 mn (7 · 3.15 · 1.39) |
| Minimal | pivot | break-squeeze-t10@m5 | 40 | 12 (30 %) | 132 | 70 % | 0.69 | -24.82 | – |
| Minimal | pulse | trend-adx-20@m5c | 4 | 0 (0 %) | 10 | 40 % | 0.07 | -24.88 | – |
| Minimal | pulse | break-don55@m5 | 6 | 0 (0 %) | 40 | 45 % | 0.46 | -25.02 | tp1.4 sl4.2 tr0.7 h192 mn (6 · 0.49 · -2.50) |
| Minimal | snap | mc-rsrev-6@m5 | 2 | 0 (0 %) | 48 | 42 % | 0.59 | -25.86 | tp1.6 sl2.4 tr1.2 h288 mn (25 · 0.59 · -12.90) |
| Minimal | magnet | break-don20@m5 | 9 | 0 (0 %) | 7 | 0 % | 0.00 | -26.30 | – |
| Minimal | ribbon | ichi-tk-9@m1c | 3 | 0 (0 %) | 33 | 64 % | 0.51 | -26.40 | tp1.6 sl4 tr0 h1440 mn (11 · 0.58 · -7.00) |
| Minimal | revert | mc-vwapx-15@m15c | 14 | 3 (21 %) | 14 | 21 % | 0.13 | -26.97 | – |
| Minimal | follow | trend-st-21-3@m1c | 5 | 2 (40 %) | 565 | 66 % | 0.94 | -27.06 | tp1.6 sl2.4 tr0 h960 mn (104 · 1.12 · 10.41) |
| Minimal | pivot | willr-7-95@m1 | 5 | 0 (0 %) | 97 | 60 % | 0.76 | -27.37 | tp1.6 sl4.8 tr0.8 h1440 mn (18 · 0.82 · -3.64) |
| Minimal | sweep | willr-21-95@m1 | 15 | 6 (40 %) | 175 | 67 % | 0.86 | -27.69 | tp1.6 sl2.4 tr1.2 h960 mn (12 · 1.28 · 2.88) |
| Minimal | snap | ema-21-55@m1c | 4 | 0 (0 %) | 80 | 60 % | 0.57 | -27.91 | tp1 sl3 tr0.5 h960 mn (20 · 0.56 · -5.95) |
| Minimal | pivot | mc-rsit5-20@m15c | 10 | 0 (0 %) | 10 | 0 % | 0.00 | -28.10 | – |
| Minimal | sandwich | break-don40@m5 | 27 | 7 (26 %) | 239 | 59 % | 0.85 | -28.12 | tp1.4 sl4.2 tr1.05 h192 mn (8 · 1.37 · 1.68) |
| Minimal | sandwich | break-don55@m5 | 21 | 2 (10 %) | 187 | 52 % | 0.80 | -28.33 | tp1.4 sl4.2 tr1.05 h288 mn (8 · 1.37 · 1.68) |
| Minimal | sandwich | trend-st-14-4@m1c | 2 | 0 (0 %) | 90 | 71 % | 0.73 | -28.49 | tp1.4 sl4.2 tr0 h960 mn (46 · 0.73 · -14.09) |
| Minimal | snap | r-linreg@m5 | 9 | 0 (0 %) | 51 | 51 % | 0.49 | -28.58 | tp1.6 sl2.4 tr0 h192 mn (6 · 0.77 · -1.28) |
| Minimal | sandwich | aroon-14@m5 | 4 | 0 (0 %) | 34 | 47 % | 0.42 | -28.63 | tp1.4 sl2.8 tr0 h192 mn (9 · 0.46 · -5.58) |
| Minimal | pivot | break-vol-1.3@m15 | 5 | 0 (0 %) | 15 | 20 % | 0.06 | -30.25 | – |
| Minimal | ribbon | willr-7-95@m1 | 2 | 0 (0 %) | 49 | 53 % | 0.46 | -30.34 | tp1.6 sl3.2 tr0.8 h1440 mn (24 · 0.47 · -14.49) |
| Minimal | pulse | ema-slope@m5c | 7 | 0 (0 %) | 91 | 59 % | 0.71 | -30.76 | tp1.4 sl4.2 tr0.7 h288 mn (12 · 0.77 · -2.19) |
| Minimal | pulse | break-don40@m5 | 8 | 1 (13 %) | 53 | 49 % | 0.50 | -30.94 | tp1.4 sl4.2 tr1.05 h288 mn (6 · 1.09 · 0.38) |
| Minimal | sandwich | mc-rsrev-6@m15 | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -32.19 | – |
| Minimal | pulse | mc-rsrev-6@m15 | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -32.19 | – |
| Minimal | magnet | break-atr-2@m1 | 1 | 0 (0 %) | 47 | 47 % | 0.49 | -32.62 | tp1.6 sl2.4 tr0 h960 mn (47 · 0.49 · -32.62) |
| Minimal | pulse | macd-hist-19-39-9@m5 | 3 | 0 (0 %) | 14 | 21 % | 0.10 | -32.80 | tp1.4 sl2.8 tr0 h192 mn (5 · 0.10 · -10.80) |
| Minimal | pulse | trend-ema-20-50@m5c | 14 | 2 (14 %) | 71 | 42 % | 0.43 | -32.89 | tp0.8 sl2 tr0.4 h192 mn (6 · 0.33 · -2.41) |
| Minimal | snap | mc-rsi5-15@m5 | 3 | 0 (0 %) | 33 | 48 % | 0.31 | -33.26 | tp1 sl3 tr0.75 h192 mn (11 · 0.32 · -11.03) |
| Minimal | clamp | willr-14-95@m1 | 4 | 0 (0 %) | 192 | 58 % | 0.76 | -33.70 | tp1.2 sl3.6 tr0.6 h1440 mn (49 · 0.80 · -6.29) |
| Minimal | sandwich | act-hf@m5 | 10 | 0 (0 %) | 50 | 60 % | 0.38 | -33.92 | tp1.2 sl2.4 tr0.6 h192 mn (5 · 0.47 · -2.77) |
| Minimal | pulse | act-hf@m5 | 10 | 0 (0 %) | 50 | 60 % | 0.38 | -33.92 | tp1.2 sl2.4 tr0.6 h192 mn (5 · 0.47 · -2.77) |
| Minimal | clamp | r-stc@m5 | 4 | 0 (0 %) | 50 | 62 % | 0.49 | -33.97 | tp1.2 sl3 tr0.9 h288 mn (13 · 0.51 · -6.27) |
| Minimal | pivot | mc-rsi2-10@m5c | 10 | 0 (0 %) | 49 | 51 % | 0.43 | -33.99 | tp1.4 sl2.8 tr1.05 h288 mn (5 · 0.74 · -0.82) |
| Minimal | sandwich | hma-55@m1c | 49 | 22 (45 %) | 1007 | 63 % | 0.95 | -34.07 | tp1.6 sl3.2 tr0 h1440 mn (17 · 1.92 · 9.40) |
| Minimal | follow | r-pin-m@m5 | 6 | 0 (0 %) | 132 | 67 % | 0.77 | -34.35 | tp1.6 sl3.2 tr0 h192 mn (23 · 0.97 · -0.74) |
| Minimal | ribbon | ema-slope-20@m1 | 5 | 0 (0 %) | 18 | 28 % | 0.11 | -37.36 | – |
| Minimal | pulse | r-streak@m5 | 4 | 0 (0 %) | 40 | 55 % | 0.40 | -37.58 | tp1.6 sl4.8 tr0.8 h192 mn (10 · 0.44 · -8.79) |
| Minimal | sandwich | rsi-fast@m5c | 5 | 0 (0 %) | 40 | 43 % | 0.34 | -37.76 | tp1.2 sl1.8 tr0.9 h192 mn (8 · 0.38 · -5.09) |
| Minimal | sandwich | mc-rsi7-20@m5c | 5 | 0 (0 %) | 40 | 43 % | 0.34 | -37.76 | tp1.2 sl1.8 tr0.9 h192 mn (8 · 0.38 · -5.09) |
| Minimal | snap | rsi-fast@m5c | 5 | 0 (0 %) | 40 | 43 % | 0.34 | -37.76 | tp1.2 sl1.8 tr0.9 h192 mn (8 · 0.38 · -5.09) |
| Minimal | snap | mc-rsi7-20@m5c | 5 | 0 (0 %) | 40 | 43 % | 0.34 | -37.76 | tp1.2 sl1.8 tr0.9 h192 mn (8 · 0.38 · -5.09) |
| Minimal | magnet | mc-rsi2-10@m5c | 14 | 0 (0 %) | 19 | 11 % | 0.05 | -39.10 | – |
| Minimal | sandwich | kama-10@m5 | 15 | 0 (0 %) | 30 | 50 % | 0.24 | -39.15 | – |
| Minimal | sandwich | r-streak@m5 | 5 | 0 (0 %) | 50 | 60 % | 0.49 | -39.19 | tp1.6 sl4.8 tr0 h192 mn (10 · 0.65 · -5.20) |
| Minimal | sandwich | r-fvg@m5 | 27 | 9 (33 %) | 148 | 69 % | 0.76 | -39.27 | tp1.6 sl4.8 tr0 h192 mn (5 · 1.12 · 0.60) |
| Minimal | sandwich | macd-zero@m5c | 4 | 0 (0 %) | 77 | 65 % | 0.63 | -39.75 | tp1.6 sl4.8 tr0 h288 mn (18 · 0.73 · -6.80) |
| Minimal | sandwich | dir-emax-12-26@m5c | 4 | 0 (0 %) | 77 | 65 % | 0.63 | -39.75 | tp1.6 sl4.8 tr0 h288 mn (18 · 0.73 · -6.80) |
| Minimal | ribbon | mc-rsi2-10@m5c | 11 | 0 (0 %) | 54 | 50 % | 0.42 | -39.98 | tp1.4 sl2.8 tr1.05 h288 mn (5 · 0.74 · -0.82) |
| Minimal | pulse | move-impulse-10-2@m5 | 20 | 3 (15 %) | 92 | 59 % | 0.68 | -40.35 | tp1.6 sl4 tr0.8 h192 mn (5 · 0.73 · -2.28) |
| Minimal | sandwich | ema-50-100@m15c | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -40.80 | – |
| Minimal | pulse | ema-50-100@m15c | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -40.80 | – |
| Minimal | clamp | willr-14-90@m5c | 8 | 0 (0 %) | 77 | 47 % | 0.42 | -42.51 | tp1.4 sl2.1 tr0.7 h192 mn (10 · 0.52 · -3.38) |
| Minimal | clamp | rsi-fast@m5 | 3 | 0 (0 %) | 81 | 60 % | 0.53 | -42.61 | tp1.6 sl3.2 tr1.2 h288 mn (27 · 0.55 · -13.76) |
| Minimal | clamp | mc-rsi7-20@m5 | 3 | 0 (0 %) | 81 | 60 % | 0.53 | -42.61 | tp1.6 sl3.2 tr1.2 h288 mn (27 · 0.55 · -13.76) |
| Minimal | pulse | hma-55@m5c | 11 | 2 (18 %) | 45 | 36 % | 0.37 | -42.77 | tp0.8 sl2.4 tr0.4 h192 mn (5 · 0.04 · -5.05) |
| Minimal | sandwich | rsi-fast@m5 | 3 | 0 (0 %) | 63 | 51 % | 0.40 | -43.56 | tp1 sl2.5 tr0.75 h288 mn (21 · 0.49 · -10.43) |
| Minimal | sandwich | mc-rsi7-20@m5 | 3 | 0 (0 %) | 63 | 51 % | 0.40 | -43.56 | tp1 sl2.5 tr0.75 h288 mn (21 · 0.49 · -10.43) |
| Minimal | magnet | act-burst-2.5@x4@m1 | 3 | 0 (0 %) | 27 | 48 % | 0.25 | -43.57 | tp1.4 sl4.2 tr0 h960 mn (9 · 0.34 · -11.60) |
| Minimal | pulse | ema-slope@m1c | 13 | 0 (0 %) | 156 | 69 % | 0.75 | -44.41 | tp1.6 sl4 tr0 h960 mn (12 · 1.00 · -0.00) |
| Minimal | magnet | cci-40-100@m1c | 2 | 0 (0 %) | 141 | 57 % | 0.72 | -44.46 | tp1.6 sl2.4 tr0 h1440 mn (70 · 0.72 · -22.00) |
| Minimal | ribbon | macd-zero@m1c | 8 | 0 (0 %) | 231 | 71 % | 0.82 | -46.37 | tp1.4 sl4.2 tr0 h1440 mn (28 · 1.00 · -0.00) |
| Minimal | ribbon | dir-emax-12-26@m1c | 8 | 0 (0 %) | 231 | 71 % | 0.82 | -46.37 | tp1.4 sl4.2 tr0 h1440 mn (28 · 1.00 · -0.00) |
| Minimal | follow | mc-lag-3@m15c | 22 | 2 (9 %) | 66 | 41 % | 0.25 | -48.41 | – |
| Minimal | snap | cmf-20-0.05@m5 | 17 | 0 (0 %) | 85 | 58 % | 0.44 | -48.53 | tp1.2 sl1.8 tr0.9 h192 mn (5 · 0.94 · -0.14) |
| Minimal | ribbon | dir-vwap@m1c | 4 | 0 (0 %) | 102 | 55 % | 0.59 | -49.86 | tp1.6 sl3.2 tr0 h960 mn (26 · 0.77 · -6.70) |
| Minimal | pulse | trend-ema-12-26@m5 | 10 | 0 (0 %) | 28 | 0 % | 0.00 | -51.97 | – |
| Minimal | pivot | break-squeeze-30@m5 | 6 | 0 (0 %) | 42 | 57 % | 0.19 | -52.25 | tp1.4 sl4.2 tr0.7 h288 mn (7 · 0.29 · -6.38) |
| Minimal | pulse | move-impulse-20-2.5@m5c | 13 | 0 (0 %) | 44 | 55 % | 0.33 | -52.75 | – |
| Minimal | pivot | break-don20@m5 | 10 | 0 (0 %) | 46 | 46 % | 0.24 | -53.29 | tp1.2 sl3.6 tr0.6 h288 mn (5 · 0.34 · -2.72) |
| Minimal | sandwich | trend-adx@m5 | 6 | 0 (0 %) | 77 | 62 % | 0.54 | -53.96 | tp1.4 sl4.2 tr0 h288 mn (12 · 0.55 · -8.00) |
| Minimal | magnet | mc-tstreak-4@m5 | 66 | 17 (26 %) | 377 | 62 % | 0.80 | -53.99 | tp1.6 sl4.8 tr0 h288 mn (5 · ∞ (no loss) · 7.00) |
| Minimal | pulse | dir-vwap@m5c | 10 | 1 (10 %) | 84 | 54 % | 0.41 | -54.00 | tp1.4 sl4.2 tr1.05 h288 mn (7 · 1.10 · 0.45) |
| Minimal | pulse | mc-rsi4-20@m5c | 14 | 0 (0 %) | 86 | 53 % | 0.44 | -54.49 | tp1 sl2 tr0 h192 mn (7 · 0.91 · -0.40) |
| Minimal | pulse | obv-50@m1c | 10 | 0 (0 %) | 270 | 72 % | 0.82 | -55.20 | tp1.6 sl4 tr0 h960 mn (26 · 0.90 · -2.80) |
| Minimal | pulse | r-fisher-m@m5 | 7 | 0 (0 %) | 77 | 58 % | 0.40 | -56.33 | tp1 sl2.5 tr0.75 h192 mn (11 · 0.51 · -5.32) |
| Minimal | sandwich | trend-st-28-6@m15 | 30 | 0 (0 %) | 60 | 50 % | 0.34 | -57.20 | – |
| Minimal | ribbon | trix-15@m1c | 4 | 0 (0 %) | 231 | 61 % | 0.76 | -59.52 | tp1.6 sl3.2 tr0 h1440 mn (57 · 0.82 · -11.40) |
| Minimal | pulse | dir-vwap-30@m5 | 11 | 0 (0 %) | 44 | 16 % | 0.03 | -59.63 | – |
| Minimal | snap | willr-14-95@m1 | 9 | 0 (0 %) | 300 | 61 % | 0.66 | -59.90 | tp1.2 sl2.4 tr0.6 h960 mn (34 · 0.73 · -5.17) |
| Minimal | clamp | mc-rsi5-20@m5c | 11 | 0 (0 %) | 152 | 54 % | 0.68 | -60.59 | tp1.4 sl4.2 tr1.05 h192 mn (14 · 0.84 · -2.44) |
| Minimal | revert | r-session-trend-m@m5c | 2 | 0 (0 %) | 44 | 41 % | 0.19 | -60.64 | tp1.6 sl3.2 tr1.2 h192 mn (22 · 0.19 · -30.32) |
| Minimal | sweep | r-streak@m30 | 10 | 0 (0 %) | 80 | 57 % | 0.48 | -62.38 | tp1.6 sl4.8 tr1.2 h32 mn (8 · 0.65 · -3.49) |
| Minimal | snap | mc-z-20@m5c | 11 | 0 (0 %) | 142 | 59 % | 0.56 | -62.76 | tp1 sl3 tr0.75 h288 mn (14 · 0.73 · -2.63) |
| Minimal | pivot | dir-st@m1c | 11 | 1 (9 %) | 234 | 55 % | 0.71 | -63.39 | tp1.6 sl2.4 tr1.2 h1440 mn (19 · 1.15 · 2.73) |
| Minimal | pivot | trend-st-7-2@m1c | 11 | 1 (9 %) | 234 | 55 % | 0.71 | -63.39 | tp1.6 sl2.4 tr1.2 h1440 mn (19 · 1.15 · 2.73) |
| Minimal | clamp | bb-bounce@m5c | 6 | 0 (0 %) | 41 | 44 % | 0.17 | -63.45 | tp1.6 sl4.8 tr0.8 h288 mn (7 · 0.22 · -8.43) |
| Minimal | clamp | z-20-2@m5c | 6 | 0 (0 %) | 41 | 44 % | 0.17 | -63.45 | tp1.6 sl4.8 tr0.8 h288 mn (7 · 0.22 · -8.43) |
| Minimal | clamp | willr-21-90@m5c | 19 | 1 (5 %) | 218 | 54 % | 0.67 | -65.72 | tp1.6 sl4.8 tr0.8 h192 mn (10 · 1.50 · 2.64) |
| Minimal | follow | trend-st-28-6@m1c | 8 | 0 (0 %) | 417 | 66 % | 0.83 | -66.13 | tp1.2 sl3 tr0.9 h960 mn (58 · 0.92 · -3.69) |
| Minimal | pulse | kelt-20-1.5@m5 | 19 | 3 (16 %) | 71 | 48 % | 0.48 | -66.17 | tp1.4 sl2.8 tr0 h192 mn (5 · 0.27 · -6.60) |
| Minimal | follow | move-impulse@m1c | 3 | 0 (0 %) | 349 | 56 % | 0.72 | -66.57 | tp1.4 sl4.2 tr0.7 h960 mn (111 · 0.83 · -12.35) |
| Minimal | pulse | aroon-25@m5 | 26 | 4 (15 %) | 181 | 50 % | 0.65 | -67.11 | tp1.2 sl3 tr0.9 h192 mn (7 · 1.14 · 0.89) |
| Minimal | sandwich | ema-slope-34@m1c | 8 | 0 (0 %) | 197 | 65 % | 0.69 | -67.34 | tp1.2 sl3.6 tr0.9 h1440 mn (25 · 0.74 · -6.06) |
| Minimal | snap | act-burst-1.5@m5 | 5 | 0 (0 %) | 107 | 51 % | 0.50 | -69.12 | tp1.6 sl4 tr0.8 h288 mn (22 · 0.54 · -10.23) |
| Minimal | pulse | mc-rsi9-20@m5 | 10 | 0 (0 %) | 106 | 51 % | 0.43 | -70.30 | tp1.2 sl3.6 tr0.6 h192 mn (10 · 0.70 · -2.31) |
| Minimal | pulse | r-chand@m5 | 6 | 0 (0 %) | 18 | 6 % | 0.02 | -71.81 | – |
| Minimal | snap | rsi-fast@m5 | 5 | 0 (0 %) | 100 | 47 % | 0.39 | -71.93 | tp1 sl2.5 tr0.75 h192 mn (20 · 0.45 · -11.23) |
| Minimal | snap | mc-rsi7-20@m5 | 5 | 0 (0 %) | 100 | 47 % | 0.39 | -71.93 | tp1 sl2.5 tr0.75 h192 mn (20 · 0.45 · -11.23) |
| Minimal | ribbon | move-swing@m1 | 4 | 0 (0 %) | 117 | 58 % | 0.49 | -72.35 | tp1.6 sl4.8 tr1.2 h1440 mn (29 · 0.63 · -14.96) |
| Minimal | snap | r-ultimate@m5 | 7 | 0 (0 %) | 98 | 57 % | 0.46 | -72.89 | tp1.6 sl2.4 tr1.2 h192 mn (14 · 0.70 · -3.98) |
| Minimal | pulse | ichi-tk-9@m5c | 14 | 0 (0 %) | 135 | 61 % | 0.60 | -74.07 | tp1.6 sl4.8 tr1.2 h192 mn (9 · 0.94 · -0.62) |
| Minimal | pulse | cci-40-200@x4@m5 | 6 | 0 (0 %) | 120 | 49 % | 0.43 | -76.06 | tp1.4 sl2.8 tr0.7 h288 mn (20 · 0.54 · -8.02) |
| Minimal | sandwich | break-squeeze-30@m5 | 29 | 0 (0 %) | 145 | 63 % | 0.57 | -77.24 | tp1.4 sl2.1 tr0 h192 mn (5 · 0.78 · -1.00) |
| Minimal | pulse | dir-emax@m5c | 24 | 6 (25 %) | 186 | 41 % | 0.57 | -78.71 | tp1.6 sl4.8 tr0.8 h192 mn (7 · 1.55 · 2.80) |
| Minimal | pulse | ema-9-21@m5c | 24 | 6 (25 %) | 186 | 41 % | 0.57 | -78.71 | tp1.6 sl4.8 tr0.8 h192 mn (7 · 1.55 · 2.80) |
| Minimal | pulse | willr-28-90@m5c | 12 | 0 (0 %) | 68 | 41 % | 0.16 | -79.21 | tp1.6 sl4.8 tr0.8 h192 mn (5 · 0.41 · -3.03) |
| Minimal | snap | r-zdist@m5 | 4 | 0 (0 %) | 118 | 61 % | 0.48 | -79.58 | tp1.4 sl4.2 tr0 h288 mn (28 · 0.68 · -11.20) |
| Minimal | magnet | kama-10@m1c | 6 | 0 (0 %) | 102 | 58 % | 0.45 | -81.00 | tp1.6 sl4.8 tr0.8 h960 mn (17 · 0.62 · -8.25) |
| Minimal | clamp | trend-st-21-3@m1c | 3 | 0 (0 %) | 114 | 46 % | 0.36 | -82.62 | tp1.2 sl2.4 tr0.9 h960 mn (38 · 0.38 · -24.66) |
| Minimal | magnet | ema-pullback-50@m1 | 8 | 0 (0 %) | 183 | 62 % | 0.68 | -83.40 | tp1.6 sl4.8 tr1.2 h960 mn (23 · 0.84 · -4.86) |
| Minimal | sandwich | ema-slope@m1c | 13 | 0 (0 %) | 623 | 70 % | 0.86 | -85.81 | tp1.6 sl4.8 tr0 h1440 mn (44 · 0.95 · -2.40) |
| Minimal | sandwich | trend-st-14-2@m1c | 8 | 0 (0 %) | 190 | 55 % | 0.63 | -86.14 | tp1.6 sl2.4 tr1.2 h1440 mn (23 · 0.83 · -4.54) |
| Minimal | pulse | rsi-fast@m5 | 6 | 0 (0 %) | 126 | 51 % | 0.40 | -87.13 | tp1 sl2.5 tr0.75 h192 mn (21 · 0.49 · -10.43) |
| Minimal | pulse | mc-rsi7-20@m5 | 6 | 0 (0 %) | 126 | 51 % | 0.40 | -87.13 | tp1 sl2.5 tr0.75 h192 mn (21 · 0.49 · -10.43) |
| Minimal | ribbon | trix-9@m30 | 63 | 21 (33 %) | 63 | 33 % | 0.22 | -87.60 | – |
| Minimal | pulse | macd-zero@m5c | 12 | 0 (0 %) | 121 | 45 % | 0.46 | -89.09 | tp1.4 sl4.2 tr1.05 h288 mn (9 · 0.62 · -5.04) |
| Minimal | pulse | dir-emax-12-26@m5c | 12 | 0 (0 %) | 121 | 45 % | 0.46 | -89.09 | tp1.4 sl4.2 tr1.05 h288 mn (9 · 0.62 · -5.04) |
| Minimal | sandwich | kama-20@m5 | 66 | 12 (18 %) | 284 | 66 % | 0.68 | -89.48 | tp1.6 sl2.4 tr0 h192 mn (5 · 0.81 · -1.00) |
| Minimal | ribbon | obv-50@m1c | 5 | 0 (0 %) | 274 | 70 % | 0.74 | -89.74 | tp1.6 sl4.8 tr0 h960 mn (52 · 0.81 · -12.65) |
| Minimal | pulse | break-squeeze-30@m5 | 32 | 0 (0 %) | 163 | 61 % | 0.55 | -89.75 | tp1.4 sl2.1 tr0 h192 mn (5 · 0.78 · -1.00) |
| Minimal | sandwich | trend-ribbon@m1c | 11 | 0 (0 %) | 150 | 58 % | 0.52 | -89.87 | tp1.6 sl4.8 tr0 h1440 mn (12 · 0.84 · -2.40) |
| Minimal | sandwich | willr-21-90@m5c | 22 | 0 (0 %) | 139 | 42 % | 0.33 | -92.85 | tp1.4 sl4.2 tr1.05 h288 mn (6 · 0.69 · -1.44) |
| Minimal | clamp | rsi-14-20-80@m5 | 20 | 0 (0 %) | 98 | 41 % | 0.40 | -92.98 | tp1.2 sl1.8 tr0.9 h192 mn (5 · 0.60 · -2.41) |
| Minimal | sweep | mc-rsi4-15@m30 | 12 | 0 (0 %) | 72 | 50 % | 0.30 | -93.46 | tp1.6 sl4 tr1.2 h32 mn (6 · 0.45 · -4.68) |
| Minimal | sweep | mc-rsi3-10@m30 | 12 | 0 (0 %) | 72 | 50 % | 0.30 | -93.46 | tp1.6 sl4 tr1.2 h32 mn (6 · 0.45 · -4.68) |
| Minimal | sandwich | break-squeeze@m5 | 24 | 0 (0 %) | 92 | 50 % | 0.21 | -94.69 | – |
| Minimal | pulse | break-squeeze@m5 | 24 | 0 (0 %) | 92 | 50 % | 0.21 | -94.69 | – |
| Minimal | pulse | ema-slope-20-10@m5c | 8 | 0 (0 %) | 103 | 50 % | 0.37 | -96.59 | tp1.2 sl3.6 tr0.6 h192 mn (13 · 0.28 · -6.16) |
| Minimal | sweep | mc-z-25@m5 | 11 | 0 (0 %) | 33 | 15 % | 0.07 | -96.87 | – |
| Minimal | sandwich | r-chand@m5 | 10 | 0 (0 %) | 40 | 38 % | 0.14 | -97.25 | – |
| Minimal | revert | act-chop@m15c | 14 | 0 (0 %) | 112 | 62 % | 0.47 | -97.55 | tp1.4 sl3.5 tr0 h64 mn (8 · 0.54 · -5.10) |
| Minimal | pulse | break-squeeze-t25@m5 | 28 | 0 (0 %) | 136 | 53 % | 0.30 | -100.92 | tp0.8 sl2 tr0.6 h192 mn (5 · 0.48 · -1.30) |
| Minimal | pulse | trend-ema-20-50@m5 | 20 | 1 (5 %) | 180 | 43 % | 0.37 | -101.14 | tp1.6 sl4.8 tr0.8 h288 mn (7 · 1.01 · 0.04) |
| Minimal | sandwich | obv-50@m1c | 9 | 0 (0 %) | 590 | 70 % | 0.83 | -105.76 | tp1.4 sl4.2 tr1.05 h960 mn (64 · 0.92 · -5.34) |
| Minimal | pulse | aroon-14@m5 | 14 | 0 (0 %) | 52 | 33 % | 0.15 | -109.10 | – |
| Minimal | pulse | break-don10@m5 | 23 | 0 (0 %) | 135 | 41 % | 0.39 | -113.87 | tp1.4 sl4.2 tr1.05 h192 mn (5 · 0.81 · -0.82) |
| Minimal | ribbon | aroon-14@m5 | 34 | 0 (0 %) | 51 | 0 % | 0.00 | -115.54 | – |
| Minimal | clamp | mc-rsi5-15@m5 | 8 | 0 (0 %) | 132 | 48 % | 0.32 | -116.91 | tp1.4 sl3.5 tr1.05 h192 mn (16 · 0.41 · -11.02) |
| Minimal | pulse | ema-slope-20@m5c | 35 | 8 (23 %) | 242 | 46 % | 0.56 | -117.58 | tp1.6 sl4.8 tr0.8 h192 mn (6 · 1.48 · 2.44) |
| Minimal | sandwich | move-impulse-20-2.5@m1c | 12 | 0 (0 %) | 84 | 38 % | 0.18 | -117.61 | tp1.4 sl4.2 tr0.7 h960 mn (7 · 0.16 · -7.48) |
| Minimal | pivot | trend-st-21-5@m1c | 28 | 4 (14 %) | 834 | 67 % | 0.86 | -121.84 | tp1.6 sl4.8 tr1.2 h960 mn (26 · 1.08 · 2.27) |
| Minimal | sandwich | squeeze-20@m5 | 31 | 0 (0 %) | 154 | 47 % | 0.29 | -122.85 | tp0.8 sl2.4 tr0.4 h192 mn (5 · 0.64 · -0.33) |
| Minimal | magnet | ema-slope-34@m1c | 75 | 26 (35 %) | 960 | 64 % | 0.82 | -123.11 | tp1.4 sl2.8 tr1.05 h1440 mn (12 · 1.92 · 5.58) |
| Minimal | ribbon | ema-slope-20-10@m1c | 33 | 8 (24 %) | 865 | 69 % | 0.84 | -124.16 | tp1.4 sl4.2 tr0 h1440 mn (24 · 1.36 · 6.40) |
| Minimal | sandwich | cci-40-200@x4@m5 | 11 | 0 (0 %) | 225 | 52 % | 0.46 | -129.16 | tp1.2 sl3 tr0.6 h288 mn (21 · 0.66 · -6.07) |
| Minimal | snap | cci-40-200@x4@m5 | 11 | 0 (0 %) | 214 | 52 % | 0.46 | -129.53 | tp1.2 sl3 tr0.6 h288 mn (20 · 0.65 · -6.26) |
| Minimal | snap | willr-21-90@m5c | 26 | 0 (0 %) | 166 | 45 % | 0.31 | -131.53 | tp1.4 sl4.2 tr1.05 h192 mn (6 · 0.69 · -1.44) |
| Minimal | ribbon | ema-slope-20-10@m30 | 36 | 10 (28 %) | 62 | 16 % | 0.08 | -132.40 | – |
| Minimal | pivot | hma-55@m1c | 40 | 11 (28 %) | 691 | 56 % | 0.77 | -133.28 | tp1.2 sl3.6 tr0.9 h960 mn (15 · 2.21 · 9.86) |
| Minimal | magnet | dir-emax-20-50@m1c | 27 | 5 (19 %) | 578 | 64 % | 0.77 | -135.38 | tp1.6 sl4 tr1.2 h1440 mn (20 · 1.35 · 5.99) |
| Minimal | ribbon | r-chand@m5 | 12 | 0 (0 %) | 36 | 11 % | 0.03 | -136.63 | – |
| Minimal | sweep | trend-st-14-4@m1c | 19 | 2 (11 %) | 140 | 52 % | 0.49 | -137.83 | tp1.6 sl4 tr1.2 h960 mn (7 · 1.02 · 0.22) |
| Minimal | follow | obv-50@m1c | 12 | 1 (8 %) | 2104 | 69 % | 0.92 | -139.13 | tp1.6 sl4.8 tr0 h960 mn (137 · 1.06 · 8.60) |
| Minimal | ribbon | dir-emax@m1c | 21 | 0 (0 %) | 165 | 49 % | 0.39 | -141.86 | tp1.6 sl4 tr0 h1440 mn (6 · 0.67 · -2.80) |
| Minimal | ribbon | ema-9-21@m1c | 21 | 0 (0 %) | 165 | 49 % | 0.39 | -141.86 | tp1.6 sl4 tr0 h1440 mn (6 · 0.67 · -2.80) |
| Minimal | sandwich | rsi-7-15-85@m5 | 22 | 0 (0 %) | 108 | 7 % | 0.03 | -143.78 | tp1 sl2 tr0.5 h192 mn (5 · 0.00 · -4.82) |
| Minimal | sandwich | mc-rsi7-15@m5 | 22 | 0 (0 %) | 108 | 7 % | 0.03 | -143.78 | tp1 sl2 tr0.5 h192 mn (5 · 0.00 · -4.82) |
| Minimal | snap | rsi-7-15-85@m5 | 22 | 0 (0 %) | 108 | 7 % | 0.03 | -143.78 | tp1 sl2 tr0.5 h192 mn (5 · 0.00 · -4.82) |
| Minimal | snap | mc-rsi7-15@m5 | 22 | 0 (0 %) | 108 | 7 % | 0.03 | -143.78 | tp1 sl2 tr0.5 h192 mn (5 · 0.00 · -4.82) |
| Minimal | magnet | mc-rsi4-15@m5 | 19 | 0 (0 %) | 304 | 61 % | 0.58 | -148.46 | tp1.4 sl3.5 tr1.05 h288 mn (16 · 0.73 · -3.16) |
| Minimal | clamp | mc-rsi4-20@m5c | 13 | 0 (0 %) | 180 | 57 % | 0.46 | -149.09 | tp1.2 sl3 tr0.9 h192 mn (14 · 0.59 · -7.94) |
| Minimal | pulse | dir-vwap-30@m5c | 29 | 0 (0 %) | 99 | 17 % | 0.09 | -156.52 | – |
| Minimal | ribbon | trix-9@m1c | 27 | 1 (4 %) | 516 | 67 % | 0.70 | -161.80 | tp1.6 sl4 tr0 h1440 mn (17 · 1.08 · 1.40) |
| Minimal | sandwich | mc-rsi5-20@m5c | 26 | 0 (0 %) | 234 | 44 % | 0.50 | -165.13 | tp1.4 sl2.1 tr1.05 h192 mn (9 · 0.77 · -2.15) |
| Minimal | snap | mc-rsi5-20@m5c | 26 | 0 (0 %) | 234 | 44 % | 0.50 | -165.13 | tp1.4 sl2.1 tr1.05 h192 mn (9 · 0.77 · -2.15) |
| Minimal | pulse | trend-adx@m5 | 38 | 0 (0 %) | 152 | 45 % | 0.35 | -166.85 | tp1.4 sl2.1 tr0 h192 mn (5 · 0.35 · -4.50) |
| Minimal | sandwich | r-fisher-m@m5 | 20 | 0 (0 %) | 240 | 52 % | 0.41 | -167.05 | tp1.4 sl2.1 tr1.05 h192 mn (12 · 0.57 · -5.04) |
| Minimal | sandwich | r-streak-m@m5 | 25 | 0 (0 %) | 125 | 41 % | 0.23 | -169.33 | tp1 sl2 tr0.5 h192 mn (5 · 0.27 · -4.11) |
| Minimal | clamp | dir-thrust@m5c | 28 | 0 (0 %) | 44 | 0 % | 0.00 | -171.20 | – |
| Minimal | sandwich | willr-14-90@m5c | 48 | 0 (0 %) | 370 | 50 % | 0.45 | -171.90 | tp0.8 sl2 tr0.6 h192 mn (9 · 0.87 · -0.57) |
| Minimal | sandwich | kama-20@m5c | 95 | 0 (0 %) | 190 | 50 % | 0.43 | -172.43 | – |
| Minimal | magnet | kama-20@m1c | 30 | 3 (10 %) | 422 | 58 % | 0.64 | -173.47 | tp1.4 sl3.5 tr0.7 h1440 mn (15 · 1.21 · 2.38) |
| Minimal | pulse | break-don20@m5 | 44 | 0 (0 %) | 259 | 43 % | 0.43 | -174.91 | tp1.6 sl4.8 tr0.8 h192 mn (5 · 0.83 · -0.87) |
| Minimal | magnet | r-pin-m@m15 | 48 | 0 (0 %) | 48 | 0 % | 0.00 | -176.80 | – |
| Minimal | pulse | ema-slope-20@m5 | 42 | 6 (14 %) | 299 | 45 % | 0.51 | -177.13 | tp1.6 sl4.8 tr0.8 h192 mn (6 · 1.48 · 2.44) |
| Minimal | pulse | mc-rsi5-20@m5c | 18 | 0 (0 %) | 144 | 38 % | 0.22 | -179.12 | tp1 sl2 tr0 h192 mn (8 · 0.36 · -5.60) |
| Minimal | snap | macd-hist-19-39-9@m1 | 93 | 22 (24 %) | 1173 | 61 % | 0.78 | -179.76 | tp1.4 sl2.1 tr0.7 h960 mn (13 · 1.78 · 3.69) |
| Minimal | ribbon | ema-slope-34@m1c | 56 | 9 (16 %) | 673 | 59 % | 0.72 | -181.30 | tp1.4 sl3.5 tr0.7 h1440 mn (10 · 1.65 · 3.01) |
| Minimal | pulse | ema-slope-10@m5 | 43 | 0 (0 %) | 124 | 33 % | 0.26 | -184.63 | – |
| Minimal | pulse | trend-adx-20@m5 | 41 | 0 (0 %) | 164 | 45 % | 0.34 | -185.00 | tp1 sl2.5 tr0.75 h192 mn (5 · 0.39 · -4.91) |
| Minimal | snap | willr-28-90@m5c | 36 | 0 (0 %) | 266 | 47 % | 0.32 | -185.20 | tp1.4 sl4.2 tr1.05 h192 mn (7 · 0.75 · -1.12) |
| Minimal | sandwich | willr-28-90@m5c | 40 | 0 (0 %) | 305 | 47 % | 0.34 | -195.01 | tp1.4 sl4.2 tr1.05 h192 mn (7 · 0.75 · -1.12) |
| Minimal | pivot | r-chand@m5 | 13 | 0 (0 %) | 104 | 36 % | 0.17 | -195.56 | tp1.6 sl4.8 tr1.2 h288 mn (8 · 0.33 · -12.51) |
| Minimal | pulse | ichi-cloud-9@m5c | 25 | 0 (0 %) | 114 | 34 % | 0.18 | -203.93 | tp1.2 sl3.6 tr0.6 h192 mn (5 · 0.13 · -6.90) |
| Minimal | pivot | dir-emax-20-50@m1c | 15 | 0 (0 %) | 520 | 63 % | 0.68 | -204.07 | tp1.6 sl4.8 tr1.2 h1440 mn (32 · 0.88 · -4.64) |
| Minimal | snap | trix-15@m5 | 12 | 0 (0 %) | 86 | 28 % | 0.05 | -204.52 | tp1.6 sl4 tr1.2 h192 mn (7 · 0.09 · -15.28) |
| Minimal | pivot | trend-st-21-3@m1c | 11 | 0 (0 %) | 292 | 39 % | 0.41 | -213.88 | tp1.4 sl2.1 tr0.7 h1440 mn (29 · 0.48 · -13.58) |
| Minimal | pulse | willr-14-90@m5c | 54 | 0 (0 %) | 362 | 46 % | 0.33 | -226.65 | tp0.8 sl2 tr0.6 h192 mn (8 · 0.62 · -1.65) |
| Minimal | magnet | trend-st-21-5@m1c | 40 | 8 (20 %) | 816 | 63 % | 0.73 | -245.89 | tp1.4 sl2.8 tr1.05 h960 mn (20 · 1.13 · 2.41) |
| Minimal | follow | trend-st-14-4@m1c | 30 | 3 (10 %) | 2370 | 68 % | 0.89 | -249.44 | tp1.6 sl4.8 tr0 h1440 mn (63 · 1.08 · 5.00) |
| Minimal | pulse | willr-21-90@m5c | 50 | 0 (0 %) | 251 | 30 % | 0.15 | -261.15 | tp0.8 sl2 tr0.6 h192 mn (6 · 0.39 · -2.67) |
| Minimal | magnet | trend-st-21-3@m1c | 65 | 11 (17 %) | 1222 | 63 % | 0.76 | -263.55 | tp1.4 sl4.2 tr1.05 h960 mn (19 · 1.28 · 4.25) |
| Minimal | magnet | mc-rsrev-3@m5 | 16 | 0 (0 %) | 267 | 55 % | 0.37 | -267.24 | tp1.2 sl3.6 tr0.9 h192 mn (17 · 0.46 · -10.39) |
| Minimal | sandwich | ema-slope-10@m1c | 31 | 0 (0 %) | 201 | 31 % | 0.16 | -298.15 | tp0.8 sl1.2 tr0.6 h960 mn (8 · 0.25 · -6.28) |
| Minimal | pivot | ema-21-55@m1c | 32 | 7 (22 %) | 1326 | 64 % | 0.77 | -303.60 | tp1.4 sl4.2 tr0.7 h1440 mn (44 · 1.24 · 6.61) |
| Minimal | ribbon | trend-st@m1c | 22 | 0 (0 %) | 327 | 43 % | 0.29 | -314.38 | tp1.2 sl1.8 tr0.6 h960 mn (15 · 0.50 · -6.23) |
| Minimal | ribbon | macd-cross@m1 | 19 | 1 (5 %) | 2033 | 63 % | 0.81 | -322.26 | tp1.6 sl4 tr0.8 h1440 mn (100 · 1.04 · 3.40) |
| Minimal | ribbon | ema-slope@m1c | 36 | 1 (3 %) | 1345 | 65 % | 0.74 | -367.84 | tp1.4 sl4.2 tr1.05 h1440 mn (34 · 1.04 · 1.29) |
| Minimal | magnet | ema-slope@m1c | 62 | 4 (6 %) | 1139 | 58 % | 0.61 | -394.52 | tp1.4 sl2.8 tr1.05 h1440 mn (17 · 1.17 · 2.60) |
| Minimal | snap | mc-mturn-5@m5 | 32 | 0 (0 %) | 160 | 15 % | 0.04 | -406.58 | tp1.6 sl4.8 tr0.8 h192 mn (5 · 0.07 · -5.68) |
| Minimal | clamp | rsi-fast@m5c | 38 | 0 (0 %) | 456 | 41 % | 0.30 | -429.61 | tp1.4 sl2.1 tr0.7 h192 mn (12 · 0.35 · -7.62) |
| Minimal | clamp | mc-rsi7-20@m5c | 38 | 0 (0 %) | 456 | 41 % | 0.30 | -429.61 | tp1.4 sl2.1 tr0.7 h192 mn (12 · 0.35 · -7.62) |
| Minimal | ribbon | dir-emax-20-50@m1c | 36 | 2 (6 %) | 2868 | 67 % | 0.82 | -465.30 | tp1.2 sl3.6 tr0.9 h960 mn (86 · 1.04 · 2.31) |
| Minimal | sandwich | dir-st@m1c | 26 | 0 (0 %) | 517 | 42 % | 0.30 | -466.16 | tp1 sl2.5 tr0.5 h960 mn (21 · 0.39 · -10.23) |
| Minimal | sandwich | trend-st-7-2@m1c | 26 | 0 (0 %) | 517 | 42 % | 0.30 | -466.16 | tp1 sl2.5 tr0.5 h960 mn (21 · 0.39 · -10.23) |
| Minimal | magnet | trix-15@m1c | 42 | 0 (0 %) | 882 | 56 % | 0.49 | -516.67 | tp1.2 sl3.6 tr0 h1440 mn (20 · 0.79 · -4.00) |
| Minimal | ribbon | ema-21-55@m1c | 55 | 6 (11 %) | 5261 | 67 % | 0.86 | -588.95 | tp1.2 sl3.6 tr0.9 h960 mn (97 · 1.09 · 6.51) |
| Minimal | follow | ichi-cloud-9@m1c | 46 | 6 (13 %) | 4663 | 64 % | 0.82 | -632.34 | tp1.4 sl4.2 tr0 h1440 mn (79 · 1.27 · 16.40) |
| Minimal | pivot | trend-st-14-4@m1c | 51 | 1 (2 %) | 1642 | 55 % | 0.64 | -662.25 | tp1.4 sl4.2 tr0.7 h960 mn (37 · 1.00 · 0.11) |
| Minimal | magnet | trend-st-14-4@m1c | 38 | 0 (0 %) | 928 | 46 % | 0.34 | -966.43 | tp1 sl2 tr0.5 h960 mn (30 · 0.47 · -14.29) |
| Minimal | ribbon | trend-st-14-4@m1c | 47 | 0 (0 %) | 1866 | 57 % | 0.55 | -973.49 | tp1.4 sl4.2 tr0.7 h1440 mn (43 · 0.90 · -3.31) |
| Short | ribbon | r-chand-m@m15 | 96 | 94 (98 %) | 370 | 91 % | 9.68 | 502.69 | – |
| Short | sweep | r-bb-adx@m15 | 67 | 67 (100 %) | 161 | 80 % | 55.31 | 358.46 | – |
| Short | revert | r-star@m30 | 60 | 60 (100 %) | 178 | 98 % | 20.07 | 324.17 | – |
| Short | ribbon | move-impulse-20-2.5@m15c | 74 | 74 (100 %) | 148 | 96 % | 279.04 | 234.03 | – |
| Short | sweep | trend-ema-50-200@m15c | 6 | 6 (100 %) | 268 | 77 % | 1.61 | 166.12 | tp2.8 sl5.6 tr1.4 h96 sh (43 · 2.06 · 37.33) |
| Short | clamp | break-retest@m15 | 25 | 25 (100 %) | 98 | 80 % | 13.33 | 135.34 | – |
| Short | ribbon | trend-st@m15c | 12 | 12 (100 %) | 43 | 95 % | 434.62 | 97.30 | – |
| Short | sweep | r-pin-m@m15 | 23 | 23 (100 %) | 80 | 85 % | 28.48 | 96.34 | – |
| Short | sweep | break-vol@m15 | 31 | 15 (48 %) | 124 | 74 % | 3.35 | 82.14 | – |
| Short | ribbon | move-impulse-20-2.5@m15 | 8 | 8 (100 %) | 24 | 96 % | 325.08 | 47.26 | – |
| Short | ribbon | dir-vwap@m15c | 7 | 7 (100 %) | 23 | 96 % | 305.03 | 45.48 | – |
| Short | sweep | break-vol-2@m15 | 25 | 11 (44 %) | 75 | 75 % | 2.63 | 43.61 | – |
| Short | pivot | break-squeeze-t10@m15 | 24 | 24 (100 %) | 24 | 100 % | ∞ (no loss) | 43.40 | – |
| Short | clamp | mfi-14-10@m15 | 12 | 12 (100 %) | 36 | 78 % | 58.49 | 42.44 | – |
| Short | clamp | aroon-14@m15c | 13 | 11 (85 %) | 55 | 71 % | 1.99 | 35.41 | tp2.6 sl3.9 tr1.95 h64 sh (5 · 1.69 · 2.95) |
| Short | follow | r-pin-m@m30 | 8 | 8 (100 %) | 28 | 86 % | 9.49 | 32.43 | – |
| Short | clamp | r-session-trend-m@m15c | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 25.84 | – |
| Short | sweep | r-pin-m@m30 | 6 | 6 (100 %) | 12 | 100 % | ∞ (no loss) | 25.60 | – |
| Short | clamp | act-shift@m15c | 4 | 4 (100 %) | 12 | 83 % | 83.49 | 23.80 | – |
| Short | ribbon | r-chand@m15 | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 23.15 | – |
| Short | sweep | r-inside@m15 | 10 | 10 (100 %) | 10 | 100 % | ∞ (no loss) | 23.00 | – |
| Short | ribbon | ema-slope@m15 | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 21.12 | tp2.4 sl2.4 tr1.8 h64 sh (5 · ∞ (no loss) · 10.56) |
| Short | ribbon | ema-slope@m15c | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 21.12 | tp2.4 sl2.4 tr1.8 h64 sh (5 · ∞ (no loss) · 10.56) |
| Short | ribbon | dir-vwap-240@m15c | 5 | 4 (80 %) | 72 | 71 % | 1.23 | 18.53 | tp2.8 sl5.6 tr0 h96 sh (10 · 1.79 · 9.20) |
| Short | ribbon | willr-28-95@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 17.80 | – |
| Short | ribbon | ichi-cloud-20@m15c | 5 | 5 (100 %) | 31 | 58 % | 1.63 | 17.38 | tp2.8 sl4.2 tr0 h64 sh (6 · 2.29 · 5.85) |
| Short | ribbon | ema-slope-34@m15 | 18 | 16 (89 %) | 18 | 89 % | 61.26 | 16.91 | – |
| Short | ribbon | ema-slope-34@m15c | 18 | 16 (89 %) | 18 | 89 % | 61.26 | 16.91 | – |
| Short | sweep | r-pdhl-m@m30 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 14.80 | – |
| Short | ribbon | macd-zero@m15 | 8 | 7 (88 %) | 48 | 73 % | 1.77 | 14.66 | tp1.8 sl1.8 tr1.35 h96 sh (6 · 2.18 · 3.36) |
| Short | ribbon | dir-emax-12-26@m15 | 8 | 7 (88 %) | 48 | 73 % | 1.77 | 14.66 | tp1.8 sl1.8 tr1.35 h96 sh (6 · 2.18 · 3.36) |
| Short | ribbon | dir-vwap@m15 | 1 | 1 (100 %) | 5 | 100 % | ∞ (no loss) | 12.00 | tp2.6 sl3.9 tr0 h96 sh (5 · ∞ (no loss) · 12.00) |
| Short | clamp | move-impulse-20-2.5@m15c | 2 | 2 (100 %) | 18 | 78 % | 1.74 | 11.71 | tp2.4 sl3.6 tr0 h64 sh (9 · 2.03 · 7.80) |
| Short | ribbon | r-camarilla@m15c | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 9.29 | – |
| Short | ribbon | r-td@m30 | 2 | 2 (100 %) | 6 | 100 % | ∞ (no loss) | 7.50 | – |
| Short | sweep | break-don40@m15 | 1 | 1 (100 %) | 19 | 58 % | 1.38 | 6.66 | tp2.4 sl3.6 tr1.2 h96 sh (19 · 1.38 · 6.66) |
| Short | ribbon | macd-zero@m15c | 4 | 4 (100 %) | 24 | 71 % | 1.52 | 5.77 | tp2 sl2 tr1 h96 sh (6 · 4.15 · 2.69) |
| Short | ribbon | dir-emax-12-26@m15c | 4 | 4 (100 %) | 24 | 71 % | 1.52 | 5.77 | tp2 sl2 tr1 h96 sh (6 · 4.15 · 2.69) |
| Short | sweep | r-rsi2@m30 | 1 | 1 (100 %) | 5 | 60 % | 3.01 | 4.81 | tp2.6 sl3.9 tr0 h32 sh (5 · 3.01 · 4.81) |
| Short | sweep | break-squeeze-t10@m15c | 5 | 4 (80 %) | 9 | 89 % | 1.84 | 3.69 | – |
| Short | ribbon | trend-st-21-5@m15c | 2 | 2 (100 %) | 25 | 64 % | 1.08 | 1.91 | tp2.6 sl3.9 tr1.95 h96 sh (12 · 1.09 · 1.14) |
| Short | clamp | r-qh-flow-m@m15c | 15 | 10 (67 %) | 10 | 100 % | ∞ (no loss) | 1.84 | – |
| Short | sweep | r-elder@m30 | 4 | 2 (50 %) | 10 | 60 % | 1.20 | 1.60 | – |
| Short | sweep | break-vol-1.3@m15 | 9 | 8 (89 %) | 81 | 67 % | 1.00 | -0.35 | tp2.6 sl3.9 tr1.95 h64 sh (9 · 1.04 · 0.35) |
| Short | sweep | r-linreg@m15c | 3 | 1 (33 %) | 9 | 67 % | 0.94 | -0.70 | – |
| Short | sweep | r-td-m@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.86 | -1.60 | – |
| Short | ribbon | trend-st-21-3@m15c | 1 | 0 (0 %) | 7 | 71 % | 0.47 | -3.31 | tp2.2 sl4.4 tr1.1 h64 sh (7 · 0.47 · -3.31) |
| Short | sweep | willr-7-90@m30 | 4 | 2 (50 %) | 29 | 55 % | 0.90 | -3.96 | tp2.8 sl5.6 tr2.1 h32 sh (7 · 1.17 · 1.33) |
| Short | clamp | break-don40@m15 | 1 | 0 (0 %) | 7 | 57 % | 0.65 | -4.67 | tp2.8 sl4.2 tr2.1 h64 sh (7 · 0.65 · -4.67) |
| Short | follow | r-td@m15c | 16 | 8 (50 %) | 86 | 65 % | 0.88 | -6.29 | tp1.8 sl2.7 tr0 h64 sh (5 · 2.21 · 3.50) |
| Short | sweep | willr-28-95@m30 | 2 | 0 (0 %) | 6 | 33 % | 0.43 | -6.80 | – |
| Short | ribbon | sar-0.01@m15c | 4 | 0 (0 %) | 6 | 0 % | 0.00 | -7.33 | – |
| Short | ribbon | move-impulse@m15 | 6 | 0 (0 %) | 12 | 33 % | 0.44 | -8.49 | – |
| Short | ribbon | trend-st-21-5@m15 | 1 | 0 (0 %) | 19 | 47 % | 0.67 | -8.85 | tp2.8 sl4.2 tr2.1 h64 sh (19 · 0.67 · -8.85) |
| Short | revert | r-klinger-m@m15c | 4 | 0 (0 %) | 12 | 42 % | 0.51 | -10.13 | – |
| Short | follow | break-squeeze-t25@m30 | 1 | 0 (0 %) | 11 | 45 % | 0.48 | -10.78 | tp2.6 sl3.9 tr1.3 h32 sh (11 · 0.48 · -10.78) |
| Short | pivot | r-nr-break-m@m15 | 4 | 0 (0 %) | 12 | 33 % | 0.41 | -10.80 | – |
| Short | follow | break-squeeze-t10@m15c | 4 | 0 (0 %) | 8 | 50 % | 0.11 | -11.36 | – |
| Short | sweep | r-streak@m30 | 2 | 0 (0 %) | 16 | 50 % | 0.54 | -12.38 | tp1.8 sl3.6 tr1.35 h32 sh (8 · 0.69 · -3.58) |
| Short | clamp | move-swing-16@m15 | 6 | 2 (33 %) | 6 | 33 % | 0.01 | -12.67 | – |
| Short | sweep | bb-bounce-50-2@m15c | 1 | 0 (0 %) | 12 | 58 % | 0.40 | -13.16 | tp2.6 sl5.2 tr1.3 h96 sh (12 · 0.40 · -13.16) |
| Short | sweep | z-50-2@m15c | 1 | 0 (0 %) | 12 | 58 % | 0.40 | -13.16 | tp2.6 sl5.2 tr1.3 h96 sh (12 · 0.40 · -13.16) |
| Short | revert | r-bos@m15c | 2 | 0 (0 %) | 12 | 33 % | 0.35 | -13.43 | tp2.8 sl4.2 tr1.4 h96 sh (6 · 0.41 · -5.32) |
| Short | clamp | rsi-mid-60-40@m15 | 16 | 4 (25 %) | 28 | 57 % | 0.70 | -14.10 | – |
| Short | clamp | rsi-mid-60-40@m15c | 17 | 4 (24 %) | 30 | 57 % | 0.71 | -15.05 | – |
| Short | pivot | r-fakeout@m30 | 29 | 0 (0 %) | 29 | 0 % | 0.00 | -15.10 | – |
| Short | revert | r-donch-vol-m@m30 | 2 | 0 (0 %) | 8 | 25 % | 0.19 | -15.60 | – |
| Short | revert | break-vol-2@x4@m15 | 5 | 1 (20 %) | 5 | 20 % | 0.13 | -17.80 | – |
| Short | clamp | break-vol-1.3@m15 | 4 | 0 (0 %) | 8 | 50 % | 0.10 | -18.07 | – |
| Short | revert | mfi-14-20@m30 | 3 | 0 (0 %) | 18 | 39 % | 0.42 | -25.02 | tp2.8 sl4.2 tr0 h32 sh (6 · 0.59 · -5.40) |
| Short | pivot | r-chand@m15 | 28 | 8 (29 %) | 78 | 62 % | 0.75 | -25.21 | – |
| Short | pivot | break-don40@m15 | 4 | 0 (0 %) | 28 | 57 % | 0.59 | -25.39 | tp2.8 sl4.2 tr2.1 h64 sh (7 · 0.68 · -4.25) |
| Short | revert | r-donch-vol-m@m15 | 3 | 0 (0 %) | 18 | 33 % | 0.36 | -28.81 | tp2.4 sl3.6 tr1.2 h96 sh (6 · 0.52 · -6.41) |
| Short | follow | break-squeeze-t10@m30 | 3 | 0 (0 %) | 24 | 46 % | 0.44 | -29.12 | tp2.6 sl3.9 tr1.95 h32 sh (8 · 0.64 · -5.98) |
| Short | revert | r-stc-m@m15c | 12 | 0 (0 %) | 26 | 27 % | 0.32 | -35.43 | – |
| Short | ribbon | cci-14-200@x4@m15 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -39.60 | – |
| Short | pivot | r-clv-thrust@m15 | 4 | 0 (0 %) | 8 | 0 % | 0.00 | -44.80 | – |
| Short | clamp | break-atr-2@m15 | 15 | 0 (0 %) | 15 | 0 % | 0.00 | -49.80 | – |
| Short | magnet | break-don55@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -53.40 | – |
| Short | magnet | break-vol-1.3@m15 | 76 | 20 (26 %) | 152 | 53 % | 0.71 | -56.90 | – |
| Short | clamp | r-clv-thrust@m15 | 9 | 0 (0 %) | 18 | 0 % | 0.00 | -93.80 | – |
| Short | sweep | cci-40-200@x4@m30 | 8 | 0 (0 %) | 38 | 16 % | 0.07 | -100.00 | tp2.8 sl2.8 tr1.4 h32 sh (5 · 0.11 · -5.99) |
| Short | magnet | r-pin@m15 | 27 | 0 (0 %) | 27 | 0 % | 0.00 | -100.60 | – |
| Short | magnet | break-don40@m15 | 22 | 1 (5 %) | 44 | 25 % | 0.19 | -112.60 | – |
| Short | ribbon | act-hf@m30 | 7 | 0 (0 %) | 42 | 0 % | 0.00 | -138.00 | tp2.4 sl2.4 tr0 h48 sh (6 · 0.00 · -15.60) |
| Short | ribbon | r-klinger@m30 | 37 | 0 (0 %) | 37 | 0 % | 0.00 | -154.50 | – |
| Short | pivot | break-vol-1.3@m15 | 20 | 0 (0 %) | 60 | 30 % | 0.09 | -165.94 | – |
| Short | revert | act-chop@m15c | 33 | 0 (0 %) | 255 | 58 % | 0.56 | -190.91 | tp2.4 sl3.6 tr0 h64 sh (8 · 0.96 · -0.40) |
| Short | sweep | r-rsi2@m15 | 21 | 0 (0 %) | 89 | 37 % | 0.11 | -193.75 | tp2.6 sl2.6 tr1.95 h64 sh (5 · 0.14 · -5.45) |
| Short | sweep | rsi-7-15-85@m30 | 53 | 6 (11 %) | 212 | 35 % | 0.41 | -253.92 | – |
| Short | magnet | r-pin-m@m15 | 69 | 0 (0 %) | 69 | 0 % | 0.00 | -260.21 | – |
| Short | sweep | r-vortex-m@m30 | 39 | 0 (0 %) | 119 | 0 % | 0.00 | -458.40 | – |
| General | ribbon | r-chand-m@m15 | 35 | 33 (94 %) | 126 | 75 % | 4.20 | 249.83 | – |
| General | ribbon | move-impulse-20-2.5@m15c | 33 | 33 (100 %) | 63 | 94 % | 385.55 | 215.79 | – |
| General | ribbon | trend-st@m15c | 15 | 15 (100 %) | 53 | 96 % | 860.76 | 192.92 | – |
| General | ribbon | trend-st-14-4@m15c | 9 | 9 (100 %) | 80 | 71 % | 2.86 | 146.62 | tp3.6 sl3.6 tr2.7 h96 gn (8 · 3.97 · 22.60) |
| General | ribbon | move-impulse-20-2.5@m15 | 14 | 14 (100 %) | 42 | 100 % | ∞ (no loss) | 115.58 | – |
| General | ribbon | ema-slope-34@m15 | 28 | 27 (96 %) | 28 | 96 % | 2711.73 | 103.23 | – |
| General | ribbon | ema-slope-34@m15c | 28 | 27 (96 %) | 28 | 96 % | 2711.73 | 103.23 | – |
| General | sweep | break-retest@m30 | 5 | 5 (100 %) | 77 | 68 % | 2.30 | 99.50 | tp4.4 sl3.3 tr0 h48 gn (15 · 2.40 · 24.50) |
| General | ribbon | trix-15@m15c | 4 | 4 (100 %) | 55 | 71 % | 2.83 | 96.17 | tp4 sl4 tr0 h64 gn (14 · 4.50 · 29.88) |
| General | ribbon | macd-zero@m15 | 13 | 13 (100 %) | 69 | 64 % | 2.36 | 81.06 | tp4.4 sl2.2 tr0 h64 gn (6 · 2.71 · 8.23) |
| General | ribbon | dir-emax-12-26@m15 | 13 | 13 (100 %) | 69 | 64 % | 2.36 | 81.06 | tp4.4 sl2.2 tr0 h64 gn (6 · 2.71 · 8.23) |
| General | ribbon | macd-zero@m15c | 13 | 13 (100 %) | 69 | 64 % | 2.36 | 81.06 | tp4.4 sl2.2 tr0 h64 gn (6 · 2.71 · 8.23) |
| General | ribbon | dir-emax-12-26@m15c | 13 | 13 (100 %) | 69 | 64 % | 2.36 | 81.06 | tp4.4 sl2.2 tr0 h64 gn (6 · 2.71 · 8.23) |
| General | ribbon | ema-slope@m15 | 5 | 5 (100 %) | 30 | 83 % | 5.92 | 77.30 | tp4.4 sl3.3 tr0 h64 gn (6 · 6.00 · 17.50) |
| General | sweep | obv-50@m30 | 2 | 2 (100 %) | 95 | 54 % | 1.42 | 62.39 | tp4.4 sl3.3 tr0 h48 gn (46 · 1.43 · 31.50) |
| General | ribbon | ema-slope@m15c | 4 | 4 (100 %) | 24 | 83 % | 5.90 | 59.80 | tp4.4 sl3.3 tr0 h64 gn (6 · 6.00 · 17.50) |
| General | sweep | ema-pullback@m15c | 8 | 8 (100 %) | 40 | 78 % | 2.88 | 57.38 | tp4.4 sl3.3 tr0 h64 gn (5 · 4.80 · 13.30) |
| General | sweep | r-rsi2@m30 | 8 | 8 (100 %) | 34 | 65 % | 3.13 | 56.08 | tp4.4 sl4.4 tr3.3 h32 gn (5 · 5.27 · 10.21) |
| General | ribbon | willr-28-95@m15c | 13 | 13 (100 %) | 13 | 100 % | ∞ (no loss) | 42.84 | – |
| General | follow | trix-15@m15c | 3 | 3 (100 %) | 81 | 65 % | 1.40 | 40.26 | tp4.4 sl4.4 tr0 h64 gn (27 · 1.50 · 21.05) |
| General | pivot | act-shift@m15c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 32.00 | – |
| General | ribbon | willr-28-95@m15 | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 26.40 | – |
| General | clamp | break-retest@m15 | 8 | 7 (88 %) | 32 | 63 % | 2.03 | 22.92 | – |
| General | ribbon | ema-slope-200@m15c | 3 | 3 (100 %) | 53 | 62 % | 1.44 | 22.53 | tp4 sl4 tr2 h64 gn (19 · 1.63 · 9.52) |
| General | ribbon | dir-vwap@m15c | 3 | 3 (100 %) | 8 | 88 % | 463.08 | 21.90 | – |
| General | ribbon | trend-st-21-5@m15c | 2 | 2 (100 %) | 25 | 48 % | 1.84 | 21.88 | tp4 sl4 tr2 h96 gn (12 · 1.87 · 11.12) |
| General | clamp | aroon-14@m15c | 10 | 9 (90 %) | 39 | 59 % | 1.48 | 20.09 | tp4 sl4 tr2 h64 gn (5 · 1.17 · 0.75) |
| General | sweep | r-inside@m15 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 19.80 | – |
| General | follow | trix-15@m30 | 3 | 3 (100 %) | 49 | 69 % | 1.29 | 19.68 | tp4.4 sl4.4 tr2.2 h32 gn (17 · 1.50 · 9.14) |
| General | ribbon | dir-vwap@m15 | 1 | 1 (100 %) | 5 | 100 % | ∞ (no loss) | 19.00 | tp4 sl4 tr0 h96 gn (5 · ∞ (no loss) · 19.00) |
| General | sweep | r-session-trend@m15c | 2 | 2 (100 %) | 9 | 89 % | 5.66 | 17.69 | tp3.6 sl3.6 tr0 h64 gn (5 · 3.58 · 9.80) |
| General | clamp | r-session-trend-m@m15c | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 14.47 | – |
| General | revert | r-star@m30 | 13 | 8 (62 %) | 39 | 59 % | 1.25 | 14.19 | – |
| General | ribbon | dir-vwap-240@m15c | 3 | 3 (100 %) | 42 | 62 % | 1.23 | 12.74 | tp4.4 sl4.4 tr2.2 h96 gn (15 · 1.34 · 6.31) |
| General | ribbon | trend-ema-50-200@m15c | 9 | 6 (67 %) | 132 | 56 % | 1.08 | 12.71 | tp3.6 sl3.6 tr2.7 h64 gn (14 · 1.82 · 11.14) |
| General | ribbon | ema-slope-20-10@m15 | 2 | 2 (100 %) | 16 | 56 % | 2.03 | 11.48 | tp3.2 sl1.6 tr0 h96 gn (7 · 2.22 · 6.60) |
| General | pivot | move-impulse-20-2.5@m15c | 1 | 1 (100 %) | 5 | 80 % | 3.62 | 11.00 | tp4 sl4 tr0 h64 gn (5 · 3.62 · 11.00) |
| General | sweep | break-don40@m15 | 1 | 1 (100 %) | 17 | 76 % | 1.65 | 9.86 | tp3.6 sl3.6 tr1.8 h96 gn (17 · 1.65 · 9.86) |
| General | follow | r-orb@m15c | 4 | 4 (100 %) | 6 | 67 % | 2.40 | 9.80 | – |
| General | ribbon | trend-st-21-5@m15 | 4 | 4 (100 %) | 75 | 55 % | 1.09 | 8.55 | tp4 sl4 tr2 h64 gn (20 · 1.16 · 4.10) |
| General | revert | r-fakeout@m15c | 1 | 1 (100 %) | 19 | 58 % | 1.11 | 3.55 | tp4 sl4 tr3 h64 gn (19 · 1.11 · 3.55) |
| General | revert | r-bos@m15c | 1 | 1 (100 %) | 5 | 60 % | 1.37 | 3.40 | tp4.4 sl4.4 tr0 h64 gn (5 · 1.37 · 3.40) |
| General | ribbon | r-streak@m15 | 1 | 1 (100 %) | 7 | 57 % | 1.21 | 2.60 | tp4 sl4 tr3 h96 gn (7 · 1.21 · 2.60) |
| General | revert | rsi-div@m30 | 1 | 1 (100 %) | 20 | 55 % | 1.08 | 2.40 | tp3.2 sl3.2 tr0 h48 gn (20 · 1.08 · 2.40) |
| General | follow | r-streak@m15 | 1 | 1 (100 %) | 9 | 56 % | 1.09 | 1.58 | tp4 sl4 tr3 h96 gn (9 · 1.09 · 1.58) |
| General | ribbon | trix-9@m15 | 2 | 1 (50 %) | 9 | 44 % | 1.02 | 0.36 | tp4.4 sl4.4 tr3.3 h64 gn (6 · 1.09 · 0.82) |
| General | clamp | break-don10@m15c | 1 | 0 (0 %) | 6 | 67 % | 0.97 | -0.26 | tp4.4 sl4.4 tr2.2 h64 gn (6 · 0.97 · -0.26) |
| General | sweep | r-linreg@m15c | 16 | 7 (44 %) | 38 | 45 % | 0.99 | -0.81 | – |
| General | pivot | r-chand@m15 | 4 | 0 (0 %) | 8 | 25 % | 0.89 | -1.02 | – |
| General | sweep | r-elder@m30 | 2 | 0 (0 %) | 6 | 33 % | 0.83 | -1.20 | – |
| General | sweep | r-pin-m@m15 | 2 | 1 (50 %) | 8 | 50 % | 0.67 | -1.81 | – |
| General | follow | r-pin-m@m30 | 8 | 4 (50 %) | 29 | 55 % | 0.88 | -4.21 | – |
| General | magnet | break-vol-1.3@m15 | 22 | 10 (45 %) | 43 | 56 % | 0.92 | -4.49 | – |
| General | revert | r-klinger-m@m15c | 9 | 4 (44 %) | 22 | 50 % | 0.87 | -4.76 | – |
| General | revert | r-donch-vol-m@m15 | 1 | 0 (0 %) | 6 | 33 % | 0.56 | -5.85 | tp3.6 sl3.6 tr1.8 h96 gn (6 · 0.56 · -5.85) |
| General | sweep | break-squeeze-t25@m30 | 1 | 0 (0 %) | 7 | 43 % | 0.59 | -6.92 | tp4 sl4 tr3 h48 gn (7 · 0.59 · -6.92) |
| General | clamp | break-don20@m15c | 1 | 0 (0 %) | 7 | 43 % | 0.41 | -7.46 | tp4 sl4 tr2 h64 gn (7 · 0.41 · -7.46) |
| General | sweep | bb-bounce-50-2@m15c | 2 | 0 (0 %) | 23 | 43 % | 0.76 | -9.50 | tp3.2 sl3.2 tr0 h64 gn (12 · 0.79 · -4.10) |
| General | sweep | z-50-2@m15c | 2 | 0 (0 %) | 23 | 43 % | 0.76 | -9.50 | tp3.2 sl3.2 tr0 h64 gn (12 · 0.79 · -4.10) |
| General | sweep | break-vol-1.3@m15c | 2 | 0 (0 %) | 9 | 33 % | 0.46 | -10.16 | tp4 sl4 tr3 h64 gn (5 · 0.50 · -4.52) |
| General | clamp | rsi-mid-60-40@m15 | 6 | 0 (0 %) | 12 | 50 % | 0.57 | -10.25 | – |
| General | sweep | cci-40-200@x4@m30 | 1 | 0 (0 %) | 5 | 0 % | 0.00 | -14.50 | tp3.6 sl2.7 tr0 h32 gn (5 · 0.00 · -14.50) |
| General | sweep | rsi-7-15-85@m30 | 2 | 0 (0 %) | 8 | 25 % | 0.28 | -14.61 | – |
| General | ribbon | obv-50@m15c | 2 | 0 (0 %) | 19 | 26 % | 0.51 | -16.40 | tp3.6 sl1.8 tr0 h96 gn (11 · 0.64 · -5.80) |
| General | sweep | willr-28-95@m30 | 9 | 0 (0 %) | 23 | 39 % | 0.65 | -17.20 | – |
| General | magnet | kelt-20-2@m15 | 6 | 0 (0 %) | 17 | 41 % | 0.53 | -18.57 | – |
| General | revert | r-clv-thrust@m15c | 2 | 0 (0 %) | 8 | 25 % | 0.06 | -21.69 | – |
| General | magnet | r-pin-m@m15 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -22.80 | – |
| General | sweep | willr-7-90@m30 | 6 | 0 (0 %) | 48 | 46 % | 0.69 | -25.44 | tp4.4 sl4.4 tr3.3 h32 gn (7 · 0.88 · -0.83) |
| General | follow | ema-pullback-50@m30 | 1 | 0 (0 %) | 28 | 46 % | 0.50 | -26.59 | tp4 sl4 tr2 h48 gn (28 · 0.50 · -26.59) |
| General | revert | r-stc-m@m15c | 6 | 0 (0 %) | 11 | 0 % | 0.00 | -26.82 | – |
| General | ribbon | cmf-20-0.05@m15c | 3 | 0 (0 %) | 24 | 50 % | 0.34 | -31.11 | tp3.6 sl3.6 tr2.7 h96 gn (8 · 0.48 · -7.83) |
| General | revert | mfi-14-20@m30 | 9 | 2 (22 %) | 52 | 42 % | 0.73 | -33.30 | tp4.4 sl4.4 tr2.2 h32 gn (5 · 1.44 · 4.06) |
| General | ribbon | cci-14-200@x4@m15 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -39.00 | – |
| General | revert | r-donch-vol-m@m30 | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -46.00 | – |
| General | magnet | break-don55@m15 | 16 | 0 (0 %) | 16 | 0 % | 0.00 | -64.60 | – |
| General | follow | r-qh-rev@m15c | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -76.20 | – |
| General | ribbon | act-hf@m30 | 4 | 0 (0 %) | 24 | 0 % | 0.00 | -87.00 | tp3.6 sl2.7 tr0 h48 gn (6 · 0.00 · -17.40) |
| General | follow | rsi-14-20-80@m15c | 6 | 0 (0 %) | 42 | 5 % | 0.06 | -90.71 | tp3.2 sl2.4 tr0 h64 gn (7 · 0.21 · -11.47) |
| General | revert | rsi-mom-14-20@m15c | 6 | 0 (0 %) | 42 | 5 % | 0.06 | -90.71 | tp3.2 sl2.4 tr0 h64 gn (7 · 0.21 · -11.47) |
| General | ribbon | r-klinger@m30 | 28 | 0 (0 %) | 28 | 0 % | 0.00 | -105.40 | – |
| General | magnet | break-don40@m15 | 18 | 0 (0 %) | 35 | 11 % | 0.02 | -118.88 | – |
| General | sweep | r-rsi2@m15 | 16 | 0 (0 %) | 71 | 25 % | 0.15 | -128.26 | tp4 sl3 tr0 h64 gn (5 · 0.60 · -2.84) |
| General | sweep | r-vortex-m@m30 | 12 | 0 (0 %) | 39 | 0 % | 0.00 | -135.00 | – |
| Long | ribbon | r-chand-m@m15 | 50 | 50 (100 %) | 160 | 70 % | 2.92 | 382.70 | – |
| Long | ribbon | dir-vwap-240@m15c | 24 | 23 (96 %) | 238 | 58 % | 2.00 | 348.15 | tp5.6 sl5.6 tr4.2 h64 lg (10 · 3.83 · 34.30) |
| Long | ribbon | move-impulse-20-2.5@m15c | 29 | 29 (100 %) | 53 | 100 % | ∞ (no loss) | 282.78 | – |
| Long | ribbon | trend-st@m15c | 23 | 23 (100 %) | 62 | 97 % | 524.10 | 277.99 | – |
| Long | ribbon | trix-15@m15c | 13 | 13 (100 %) | 130 | 60 % | 2.02 | 212.04 | tp6 sl4.5 tr0 h64 lg (11 · 2.47 · 20.98) |
| Long | ribbon | trend-st-14-4@m15c | 9 | 9 (100 %) | 69 | 70 % | 2.11 | 111.47 | tp5.6 sl5.6 tr2.8 h96 lg (8 · 2.31 · 15.22) |
| Long | sweep | ema-pullback@m15c | 16 | 16 (100 %) | 69 | 77 % | 2.25 | 104.88 | tp4.8 sl3.6 tr0 h64 lg (5 · 4.84 · 14.60) |
| Long | ribbon | ema-slope-34@m15 | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 102.00 | – |
| Long | ribbon | ema-slope-34@m15c | 20 | 20 (100 %) | 20 | 100 % | ∞ (no loss) | 102.00 | – |
| Long | ribbon | trend-ema-50-200@m15c | 21 | 11 (52 %) | 210 | 57 % | 1.29 | 100.65 | tp5.6 sl5.6 tr4.2 h64 lg (9 · 2.96 · 27.17) |
| Long | follow | r-orb@m15c | 21 | 19 (90 %) | 28 | 75 % | 5.53 | 97.01 | – |
| Long | ribbon | ema-slope@m15c | 5 | 5 (100 %) | 23 | 83 % | 8.47 | 92.60 | tp6 sl3 tr0 h64 lg (5 · 7.25 · 20.00) |
| Long | ribbon | move-impulse-20-2.5@m15 | 7 | 7 (100 %) | 19 | 100 % | ∞ (no loss) | 82.80 | – |
| Long | ribbon | macd-zero@m15 | 8 | 8 (100 %) | 43 | 65 % | 2.81 | 78.56 | tp6 sl3 tr0 h64 lg (6 · 2.79 · 11.43) |
| Long | ribbon | dir-emax-12-26@m15 | 8 | 8 (100 %) | 43 | 65 % | 2.81 | 78.56 | tp6 sl3 tr0 h64 lg (6 · 2.79 · 11.43) |
| Long | ribbon | macd-zero@m15c | 8 | 8 (100 %) | 43 | 65 % | 2.81 | 78.56 | tp6 sl3 tr0 h64 lg (6 · 2.79 · 11.43) |
| Long | ribbon | dir-emax-12-26@m15c | 8 | 8 (100 %) | 43 | 65 % | 2.81 | 78.56 | tp6 sl3 tr0 h64 lg (6 · 2.79 · 11.43) |
| Long | pivot | trend-st-14-4@m30 | 2 | 2 (100 %) | 12 | 100 % | ∞ (no loss) | 73.33 | tp6.4 sl6.4 tr0 h48 lg (6 · ∞ (no loss) · 37.20) |
| Long | sweep | willr-28-95@m30 | 16 | 16 (100 %) | 19 | 84 % | 6.27 | 63.28 | – |
| Long | follow | trix-15@m15c | 2 | 2 (100 %) | 43 | 67 % | 1.89 | 58.65 | tp4.8 sl4.8 tr0 h96 lg (19 · 1.99 · 29.80) |
| Long | pivot | kelt-20-2.5@m30 | 5 | 5 (100 %) | 10 | 100 % | ∞ (no loss) | 51.60 | – |
| Long | pivot | obv-20@m30 | 4 | 4 (100 %) | 16 | 75 % | 2.85 | 48.86 | – |
| Long | pivot | trend-st@m30 | 1 | 1 (100 %) | 6 | 100 % | ∞ (no loss) | 36.13 | tp6.4 sl6.4 tr4.8 h48 lg (6 · ∞ (no loss) · 36.13) |
| Long | pivot | act-shift@m15c | 2 | 2 (100 %) | 7 | 100 % | ∞ (no loss) | 35.80 | – |
| Long | sweep | r-inside@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 30.47 | – |
| Long | ribbon | ema-slope-100@m15 | 2 | 2 (100 %) | 25 | 48 % | 1.79 | 28.65 | tp5.6 sl2.8 tr0 h96 lg (12 · 1.80 · 14.40) |
| Long | clamp | aroon-14@m15c | 7 | 7 (100 %) | 19 | 63 % | 3.78 | 24.76 | – |
| Long | revert | r-bos@m15c | 6 | 5 (83 %) | 29 | 59 % | 1.41 | 24.52 | tp5.6 sl4.2 tr0 h64 lg (5 · 1.84 · 7.40) |
| Long | ribbon | ichi-cloud-20@m15c | 1 | 1 (100 %) | 5 | 60 % | 4.59 | 24.24 | tp6.4 sl6.4 tr4.8 h64 lg (5 · 4.59 · 24.24) |
| Long | ribbon | ema-slope-100@m15c | 2 | 2 (100 %) | 21 | 48 % | 1.79 | 23.85 | tp5.6 sl2.8 tr0 h96 lg (10 · 1.80 · 12.00) |
| Long | ribbon | ema-slope-200@m15c | 4 | 4 (100 %) | 46 | 74 % | 1.28 | 19.58 | tp5.6 sl5.6 tr2.8 h96 lg (12 · 1.40 · 7.01) |
| Long | sweep | r-linreg@m15c | 13 | 10 (77 %) | 29 | 48 % | 1.30 | 17.29 | – |
| Long | ribbon | willr-21-95@m30 | 5 | 5 (100 %) | 8 | 63 % | 2.60 | 15.99 | – |
| Long | ribbon | trix-9@m15 | 10 | 7 (70 %) | 37 | 59 % | 1.26 | 15.71 | tp6 sl6 tr4.5 h64 lg (6 · 2.03 · 6.68) |
| Long | sweep | break-vol-2@m15 | 2 | 2 (100 %) | 6 | 67 % | 9.69 | 11.18 | – |
| Long | ribbon | r-streak@m15 | 7 | 3 (43 %) | 48 | 58 % | 1.09 | 9.61 | tp6.4 sl4.8 tr0 h96 lg (7 · 1.65 · 9.80) |
| Long | ribbon | ema-slope-20-10@m15 | 12 | 8 (67 %) | 84 | 44 % | 1.07 | 9.07 | tp6 sl4.5 tr0 h64 lg (6 · 2.64 · 8.18) |
| Long | sweep | r-pdhl-m@m30 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 8.96 | – |
| Long | sweep | r-rsi2@m30 | 2 | 2 (100 %) | 6 | 67 % | 1.85 | 8.80 | – |
| Long | follow | trix-15@m30 | 1 | 1 (100 %) | 16 | 63 % | 1.24 | 7.23 | tp4.8 sl4.8 tr0 h32 lg (16 · 1.24 · 7.23) |
| Long | follow | r-linreg@m15c | 1 | 1 (100 %) | 7 | 57 % | 1.61 | 7.00 | tp4.8 sl3.6 tr0 h96 lg (7 · 1.61 · 7.00) |
| Long | sweep | r-pin-m@m30 | 4 | 4 (100 %) | 8 | 50 % | 1.35 | 5.50 | – |
| Long | clamp | break-don10@m15c | 2 | 2 (100 %) | 9 | 56 % | 1.35 | 5.37 | tp4.8 sl3.6 tr0 h64 lg (5 · 1.50 · 3.77) |
| Long | follow | r-td@m15c | 2 | 2 (100 %) | 8 | 50 % | 1.23 | 4.00 | – |
| Long | magnet | kelt-20-2@m15c | 19 | 12 (63 %) | 38 | 50 % | 1.04 | 3.27 | – |
| Long | sweep | break-don40@m15 | 1 | 1 (100 %) | 12 | 58 % | 1.04 | 1.46 | tp6.4 sl6.4 tr4.8 h96 lg (12 · 1.04 · 1.46) |
| Long | revert | r-klinger-m@m15c | 12 | 7 (58 %) | 18 | 39 % | 1.04 | 1.40 | – |
| Long | clamp | break-retest@m15 | 5 | 3 (60 %) | 20 | 60 % | 0.99 | -0.14 | – |
| Long | ribbon | r-sweep-m@m15 | 6 | 5 (83 %) | 19 | 47 % | 0.99 | -0.28 | – |
| Long | follow | r-streak@m15 | 3 | 1 (33 %) | 27 | 56 % | 0.98 | -1.42 | tp5.2 sl5.2 tr0 h96 lg (9 · 1.16 · 3.40) |
| Long | ribbon | break-atr-2@m15 | 3 | 0 (0 %) | 9 | 33 % | 0.90 | -1.80 | – |
| Long | magnet | kelt-20-1.5@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.55 | -5.39 | – |
| Long | ribbon | ema-slope-200@m15 | 3 | 1 (33 %) | 34 | 68 % | 0.92 | -5.72 | tp5.6 sl5.6 tr2.8 h96 lg (13 · 1.05 · 1.21) |
| Long | clamp | r-streak@m15 | 2 | 0 (0 %) | 7 | 57 % | 0.47 | -6.25 | – |
| Long | pivot | r-streak@m15 | 4 | 1 (25 %) | 12 | 67 % | 0.72 | -6.37 | – |
| Long | ribbon | ema-slope-20-10@m15c | 12 | 2 (17 %) | 68 | 41 % | 0.95 | -6.48 | tp6 sl3 tr0 h64 lg (7 · 0.94 · -0.77) |
| Long | pivot | break-don55@m15c | 2 | 0 (0 %) | 6 | 33 % | 0.62 | -7.60 | – |
| Long | sweep | willr-7-90@m30 | 4 | 2 (50 %) | 28 | 57 % | 0.82 | -7.81 | tp6 sl6 tr3 h32 lg (7 · 1.41 · 3.84) |
| Long | revert | r-star@m30 | 25 | 14 (56 %) | 58 | 47 % | 0.92 | -8.29 | – |
| Long | revert | rsi-div@m30 | 1 | 0 (0 %) | 13 | 38 % | 0.78 | -9.00 | tp6.4 sl4.8 tr0 h48 lg (13 · 0.78 · -9.00) |
| Long | sweep | r-pin-m@m15 | 2 | 0 (0 %) | 7 | 14 % | 0.10 | -11.73 | – |
| Long | pivot | break-don40@m15c | 7 | 1 (14 %) | 35 | 40 % | 0.86 | -12.80 | tp6.4 sl3.2 tr0 h96 lg (5 · 1.22 · 2.20) |
| Long | follow | r-pin-m@m30 | 6 | 0 (0 %) | 23 | 39 % | 0.66 | -14.17 | – |
| Long | sweep | bb-mid@m15 | 1 | 0 (0 %) | 18 | 33 % | 0.63 | -16.18 | tp5.6 sl4.2 tr0 h64 lg (18 · 0.63 · -16.18) |
| Long | magnet | break-vol-1.3@m15 | 12 | 7 (58 %) | 20 | 35 % | 0.58 | -17.50 | – |
| Long | sweep | ema-50-100@m30 | 5 | 2 (40 %) | 152 | 50 % | 0.95 | -18.33 | tp6.4 sl6.4 tr3.2 h32 lg (45 · 1.20 · 14.17) |
| Long | revert | mfi-14-20@m30 | 7 | 1 (14 %) | 36 | 50 % | 0.78 | -18.85 | tp4.8 sl4.8 tr0 h32 lg (5 · 1.38 · 3.80) |
| Long | magnet | move-impulse@m15c | 24 | 0 (0 %) | 18 | 0 % | 0.00 | -20.41 | – |
| Long | follow | rsi-14-20-80@m15c | 3 | 0 (0 %) | 18 | 61 % | 0.36 | -22.48 | tp5.2 sl5.2 tr2.6 h64 lg (6 · 0.45 · -5.92) |
| Long | revert | rsi-mom-14-20@m15c | 3 | 0 (0 %) | 18 | 61 % | 0.36 | -22.48 | tp5.2 sl5.2 tr2.6 h64 lg (6 · 0.45 · -5.92) |
| Long | sweep | break-vol-1.3@m15c | 5 | 0 (0 %) | 21 | 38 % | 0.55 | -28.49 | tp6 sl6 tr3 h64 lg (5 · 0.50 · -6.52) |
| Long | revert | break-vol-2@m15 | 1 | 0 (0 %) | 8 | 13 % | 0.04 | -29.33 | tp6.4 sl4.8 tr0 h64 lg (8 · 0.04 · -29.33) |
| Long | ribbon | r-linreg@m30 | 5 | 0 (0 %) | 5 | 0 % | 0.00 | -31.40 | – |
| Long | ribbon | trix-9@m30 | 10 | 1 (10 %) | 10 | 10 % | 0.00 | -36.52 | – |
| Long | sweep | r-vortex-m@m30 | 3 | 0 (0 %) | 9 | 0 % | 0.00 | -37.00 | – |
| Long | ribbon | act-hf@m30 | 2 | 0 (0 %) | 12 | 0 % | 0.00 | -38.40 | tp4.8 sl2.4 tr0 h48 lg (6 · 0.00 · -15.60) |
| Long | revert | r-star-m@m30 | 30 | 0 (0 %) | 10 | 0 % | 0.00 | -40.80 | – |
| Long | ribbon | r-clv-thrust@m30 | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -45.40 | – |
| Long | sweep | squeeze-20@m15 | 4 | 0 (0 %) | 32 | 31 % | 0.52 | -46.93 | tp5.2 sl3.9 tr0 h96 lg (8 · 0.73 · -5.50) |
| Long | ribbon | obv-50@m15c | 4 | 0 (0 %) | 26 | 27 % | 0.34 | -49.71 | tp6.4 sl3.2 tr0 h64 lg (7 · 0.39 · -10.37) |
| Long | magnet | kelt-20-2@m15 | 30 | 4 (13 %) | 80 | 38 % | 0.73 | -50.84 | – |
| Long | magnet | r-pin-m@m15 | 9 | 0 (0 %) | 9 | 0 % | 0.00 | -53.40 | – |
| Long | magnet | break-don55@m15 | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -53.80 | – |
| Long | magnet | break-don40@m15 | 10 | 0 (0 %) | 18 | 0 % | 0.00 | -59.50 | – |
| Long | ribbon | cci-14-200@x4@m15 | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -60.00 | – |
| Long | follow | trend-ema-20-50@m30 | 13 | 7 (54 %) | 292 | 45 % | 0.91 | -65.74 | tp6.4 sl3.2 tr0 h48 lg (24 · 1.09 · 4.80) |
| Long | sweep | cci-40-200@x4@m30 | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -74.40 | – |
| Long | ribbon | cmf-20-0.05@m15c | 5 | 0 (0 %) | 33 | 15 % | 0.24 | -74.90 | tp4.8 sl3.6 tr0 h96 lg (7 · 0.48 · -9.80) |
| Long | ribbon | ema-slope-20-10@m30 | 20 | 3 (15 %) | 21 | 14 % | 0.03 | -77.23 | – |
| Long | sweep | rsi-7-15-85@m30 | 15 | 0 (0 %) | 54 | 48 % | 0.41 | -87.26 | – |
| Long | follow | r-pin-m@m15 | 4 | 0 (0 %) | 45 | 16 % | 0.27 | -95.64 | tp6.4 sl6.4 tr4.8 h64 lg (10 · 0.36 · -22.11) |
| Long | follow | rsi-14-20-80@m30 | 7 | 0 (0 %) | 68 | 49 % | 0.38 | -97.52 | tp5.2 sl5.2 tr2.6 h32 lg (10 · 0.74 · -4.23) |
| Long | revert | rsi-mom-14-20@m30 | 7 | 0 (0 %) | 68 | 49 % | 0.38 | -97.52 | tp5.2 sl5.2 tr2.6 h32 lg (10 · 0.74 · -4.23) |
| Long | pivot | r-clv-thrust@m15 | 9 | 0 (0 %) | 18 | 0 % | 0.00 | -106.80 | – |
| Long | follow | r-qh-rev@m30 | 12 | 0 (0 %) | 61 | 31 % | 0.48 | -112.56 | tp5.2 sl5.2 tr3.9 h48 lg (5 · 0.90 · -1.64) |
| Long | follow | r-qh-rev-m@m15 | 5 | 0 (0 %) | 20 | 0 % | 0.00 | -117.60 | – |
| Long | sweep | r-sweep-m@m30 | 13 | 0 (0 %) | 26 | 4 % | 0.00 | -126.22 | – |
| Long | follow | ema-pullback-50@m30 | 15 | 1 (7 %) | 277 | 49 % | 0.82 | -133.01 | tp6.4 sl6.4 tr3.2 h48 lg (18 · 1.17 · 7.35) |
| Long | ribbon | r-klinger@m30 | 30 | 0 (0 %) | 30 | 0 % | 0.00 | -134.00 | – |
| Long | pivot | r-sweep@m15 | 8 | 0 (0 %) | 24 | 0 % | 0.00 | -144.00 | – |
| Long | ribbon | ema-slope@m30 | 13 | 0 (0 %) | 26 | 4 % | 0.01 | -149.32 | – |
| Long | revert | r-donch-vol-m@m30 | 14 | 0 (0 %) | 47 | 2 % | 0.03 | -187.60 | – |
| Long | follow | r-qh-rev@m15c | 23 | 0 (0 %) | 69 | 0 % | 0.00 | -331.80 | – |
| Wide | ribbon | r-chand-m@m15 | 12 | 12 (100 %) | 48 | 100 % | ∞ (no loss) | 134.98 | – |
| Wide | magnet | move-cont@m15 | 13 | 13 (100 %) | 13 | 100 % | ∞ (no loss) | 25.27 | – |
| Wide | sweep | willr-50-90@m1c | 30 | 24 (80 %) | 330 | 50 % | 1.12 | 15.03 | tp0.64 sl0.54 tr0 h480 axd-atr2h axis (11 · 1.50 · 1.53) |
| Wide | magnet | obv-20@m15c | 7 | 7 (100 %) | 35 | 60 % | 1.84 | 13.57 | tp0.8 sl0.8 tr0 h32 ax-fib2 axis (5 · 2.37 · 2.41) |
| Wide | magnet | ema-slope-10@m15c | 4 | 4 (100 %) | 8 | 100 % | ∞ (no loss) | 11.06 | – |
| Wide | pivot | act-shift@m15 | 6 | 6 (100 %) | 6 | 100 % | ∞ (no loss) | 9.46 | – |
| Wide | follow | mc-spike-2.5@m30 | 15 | 15 (100 %) | 75 | 60 % | 1.23 | 9.38 | tp1.13 sl1.13 tr0 h16 ax-volume2 axis (5 · 1.31 · 0.92) |
| Wide | sweep | r-td@m30 | 9 | 9 (100 %) | 18 | 50 % | 4.66 | 6.58 | – |
| Wide | ribbon | move-impulse-20-2.5@m15 | 3 | 3 (100 %) | 6 | 100 % | ∞ (no loss) | 6.40 | – |
| Wide | sweep | r-sweep@m5 | 3 | 3 (100 %) | 15 | 80 % | 10.94 | 5.96 | tp0.76 sl0.68 tr0 h96 ax-volume2 axis (5 · 10.94 · 1.99) |
| Wide | sandwich | ema-pullback-50@m5 | 2 | 2 (100 %) | 6 | 67 % | 2.23 | 4.82 | – |
| Wide | clamp | act-burst-2.5@m15 | 3 | 3 (100 %) | 15 | 40 % | 1.28 | 2.81 | tp0.8 sl0.8 tr0 h32 ax-fib2 axis (5 · 1.28 · 0.94) |
| Wide | ribbon | mc-mrsi2-10@m15c | 6 | 6 (100 %) | 18 | 67 % | 1.72 | 2.13 | – |
| Wide | clamp | r-pin-m@m15 | 6 | 3 (50 %) | 24 | 25 % | 1.06 | 1.38 | – |
| Wide | magnet | ema-slope-20-10@m15 | 1 | 1 (100 %) | 14 | 64 % | 1.03 | 0.29 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (14 · 1.03 · 0.29) |
| Wide | magnet | trix-9@m15c | 1 | 0 (0 %) | 11 | 64 % | 1.00 | -0.03 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (11 · 1.00 · -0.03) |
| Wide | magnet | sar-std@m15c | 3 | 0 (0 %) | 6 | 50 % | 0.99 | -0.03 | – |
| Wide | magnet | trix-9@m15 | 1 | 0 (0 %) | 13 | 62 % | 0.96 | -0.35 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (13 · 0.96 · -0.35) |
| Wide | pivot | r-camarilla@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.65 | -1.11 | – |
| Wide | revert | r-star@m30 | 12 | 9 (75 %) | 12 | 75 % | 0.91 | -1.85 | – |
| Wide | sweep | willr-21-95@m15c | 5 | 0 (0 %) | 10 | 50 % | 0.66 | -3.49 | – |
| Wide | ribbon | aroon-25@m30 | 6 | 0 (0 %) | 6 | 0 % | 0.00 | -4.20 | – |
| Wide | magnet | ema-slope-20@m15c | 1 | 0 (0 %) | 6 | 33 % | 0.34 | -4.61 | tp0.8 sl0.8 tr0 h32 ax-geo2 axis (6 · 0.34 · -4.61) |
| Wide | ribbon | dir-emax@m1c | 1 | 0 (0 %) | 9 | 22 % | 0.49 | -5.15 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (9 · 0.49 · -5.15) |
| Wide | ribbon | ema-9-21@m1c | 1 | 0 (0 %) | 9 | 22 % | 0.49 | -5.15 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (9 · 0.49 · -5.15) |
| Wide | sandwich | trix-15@m15 | 3 | 0 (0 %) | 6 | 50 % | 0.39 | -5.73 | – |
| Wide | pulse | r-valuearea@m1 | 3 | 0 (0 %) | 18 | 33 % | 0.41 | -6.00 | tp0.64 sl0.54 tr0 h480 ax-volume2 axis (6 · 0.41 · -2.00) |
| Wide | ribbon | trix-9@m1c | 3 | 0 (0 %) | 42 | 29 % | 0.69 | -6.59 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (14 · 0.69 · -2.20) |
| Wide | sandwich | r-chand-m@m1 | 3 | 0 (0 %) | 21 | 29 % | 0.29 | -7.05 | tp0.64 sl0.54 tr0 h480 ax-volume2 axis (7 · 0.29 · -2.35) |
| Wide | sweep | willr-21-90@m5c | 3 | 0 (0 %) | 9 | 33 % | 0.28 | -7.10 | – |
| Wide | sandwich | trend-ema@m5 | 3 | 0 (0 %) | 30 | 30 % | 0.50 | -8.36 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (10 · 0.50 · -2.79) |
| Wide | sandwich | rsi-mid-52-48@m5 | 3 | 0 (0 %) | 30 | 30 % | 0.50 | -8.36 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (10 · 0.50 · -2.79) |
| Wide | pivot | r-sweep-m@m5 | 12 | 3 (25 %) | 36 | 50 % | 0.61 | -8.39 | – |
| Wide | ribbon | ema-slope-20-10@m30 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -8.40 | – |
| Wide | ribbon | ema-slope@m30 | 6 | 0 (0 %) | 12 | 0 % | 0.00 | -8.59 | – |
| Wide | magnet | ema-pullback@m5 | 3 | 0 (0 %) | 12 | 0 % | 0.00 | -8.73 | – |
| Wide | magnet | mc-rsimid-14@m5 | 3 | 0 (0 %) | 24 | 13 % | 0.26 | -11.56 | tp0.76 sl0.68 tr0 h96 axd-linear2 axis (8 · 0.26 · -3.85) |
| Wide | clamp | r-sweep-m@m5 | 10 | 1 (10 %) | 22 | 27 % | 0.29 | -11.91 | – |
| Wide | ribbon | move-impulse-20-2.5@m30 | 18 | 0 (0 %) | 18 | 0 % | 0.00 | -12.60 | – |
| Wide | revert | r-bos@m15c | 9 | 0 (0 %) | 45 | 40 % | 0.58 | -15.83 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (5 · 0.73 · -1.05) |
| Wide | pulse | trend-st-21-5@m1c | 1 | 0 (0 %) | 19 | 21 % | 0.18 | -15.97 | tp0.64 sl0.54 tr0 h480 axd-atr2 axis (19 · 0.18 · -15.97) |
| Wide | pivot | move-cont@m15c | 4 | 3 (75 %) | 16 | 44 % | 0.63 | -16.36 | – |
| Wide | sweep | mc-rsi4-15@m30 | 3 | 0 (0 %) | 12 | 25 % | 0.23 | -16.45 | – |
| Wide | ribbon | ema-slope-20@m1 | 3 | 0 (0 %) | 15 | 0 % | 0.00 | -18.90 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (5 · 0.00 · -5.85) |
| Wide | pivot | move-cont@m15 | 4 | 0 (0 %) | 28 | 43 % | 0.62 | -20.90 | tp0.8 sl0.8 tr0 h32 ax-linear2 axis (7 · 0.90 · -1.21) |
| Wide | ribbon | trix-9@m30 | 21 | 0 (0 %) | 21 | 0 % | 0.00 | -22.26 | – |
| Wide | ribbon | ichi-tk-20@m1c | 3 | 0 (0 %) | 93 | 26 % | 0.40 | -26.42 | tp0.64 sl0.54 tr0 h480 axd-geo2h axis (31 · 0.40 · -8.81) |
| Wide | revert | r-fvg-m@m5 | 3 | 0 (0 %) | 51 | 41 % | 0.45 | -28.29 | tp0.76 sl0.68 tr0 h96 ax-linear2 axis (17 · 0.45 · -9.43) |
| Wide | sandwich | ema-slope-34@m1c | 6 | 0 (0 %) | 114 | 26 % | 0.50 | -29.17 | tp0.64 sl0.54 tr0 h480 axd-geo2h axis (19 · 0.47 · -4.69) |
| Wide | clamp | break-don40@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.04 | -29.90 | – |
| Wide | clamp | break-don55@m15 | 2 | 0 (0 %) | 6 | 33 % | 0.04 | -29.90 | – |
| Wide | pivot | break-don55@m15c | 4 | 0 (0 %) | 12 | 33 % | 0.12 | -30.73 | – |
| Wide | sweep | cci-40-200@x4@m30 | 6 | 0 (0 %) | 18 | 0 % | 0.00 | -34.36 | – |
| Wide | ribbon | ema-slope-34@m1c | 5 | 0 (0 %) | 50 | 24 % | 0.41 | -36.68 | tp0.64 sl0.54 tr0 h480 axd-fib2h axis (10 · 0.49 · -3.27) |
| Wide | magnet | sar-0.01@m15c | 15 | 0 (0 %) | 45 | 33 % | 0.25 | -37.70 | – |
| Wide | sweep | cci-14-100@m1c | 13 | 0 (0 %) | 414 | 38 % | 0.80 | -40.25 | tp0.64 sl0.54 tr0 h480 axd-geo2h axis (28 · 0.84 · -2.04) |
| Wide | pulse | ema-slope@m1c | 3 | 0 (0 %) | 42 | 14 % | 0.20 | -40.49 | tp0.64 sl0.54 tr0 h480 axd-atr2h axis (14 · 0.24 · -11.10) |
| Wide | pulse | trend-st-28-6@m1c | 3 | 0 (0 %) | 56 | 27 % | 0.25 | -40.88 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (18 · 0.36 · -10.46) |
| Wide | pulse | trend-st-35-7@m1c | 2 | 0 (0 %) | 52 | 31 % | 0.17 | -42.28 | tp0.64 sl0.54 tr0 h480 axd-fib2h axis (26 · 0.19 · -17.66) |
| Wide | follow | rsi-14-20-80@m15c | 12 | 0 (0 %) | 24 | 0 % | 0.00 | -44.89 | – |
| Wide | revert | rsi-mom-14-20@m15c | 12 | 0 (0 %) | 24 | 0 % | 0.00 | -44.89 | – |
| Wide | ribbon | trend-ema-20-50@m1 | 6 | 0 (0 %) | 114 | 18 % | 0.31 | -45.45 | tp0.64 sl0.54 tr0 h480 axd-geo2 axis (18 · 0.34 · -7.53) |
| Wide | sweep | trend-st@m1c | 9 | 0 (0 %) | 66 | 23 % | 0.39 | -53.80 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (7 · 0.50 · -3.16) |
| Wide | pivot | break-don40@m15 | 4 | 0 (0 %) | 16 | 25 % | 0.06 | -60.62 | – |
| Wide | pivot | break-don40@m15c | 4 | 0 (0 %) | 16 | 25 % | 0.06 | -60.62 | – |
| Wide | pulse | dir-vwap-240@m5c | 9 | 0 (0 %) | 207 | 36 % | 0.56 | -80.97 | tp0.76 sl0.68 tr0 h96 ax-atr2 axis (24 · 0.56 · -7.83) |
| Wide | follow | trend-adx@m1c | 16 | 0 (0 %) | 317 | 41 % | 0.63 | -90.08 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (19 · 0.95 · -0.61) |
| Wide | revert | break-atr-1.5@m5c | 3 | 0 (0 %) | 18 | 17 % | 0.07 | -104.85 | tp0.76 sl0.68 tr0 h96 ax-geo2 axis (6 · 0.10 · -22.83) |
| Wide | follow | r-zdist-m@m5c | 22 | 0 (0 %) | 220 | 15 % | 0.20 | -116.97 | tp0.76 sl0.68 tr0 h96 axd-atr2h axis (10 · 0.26 · -4.18) |
| Wide | sandwich | ema-slope@m1c | 4 | 0 (0 %) | 189 | 18 % | 0.26 | -200.72 | tp0.64 sl0.54 tr0 h480 axd-fib2 axis (45 · 0.24 · -40.43) |
| Wide | pivot | ema-21-55@m1c | 6 | 0 (0 %) | 258 | 22 % | 0.26 | -210.45 | tp0.64 sl0.54 tr0 h480 axd-volume2 axis (42 · 0.35 · -27.52) |
| Wide | follow | ema-pullback-50@m30 | 11 | 0 (0 %) | 77 | 8 % | 0.03 | -221.70 | tp1.13 sl1.13 tr0 h16 ax-atr2 axis (7 · 0.09 · -10.62) |
| Signals | follow | sig-swing-m@m15 | 30 | 30 (100 %) | 732 | 83 % | 2.94 | 1276.76 | tp6 sl12 tr0 h96 (12 · ∞ (no loss) · 69.60) |
| Signals | follow | sig-rsi-mid-m@m15 | 30 | 30 (100 %) | 542 | 89 % | 7.68 | 1183.55 | tp4 sl12 tr0 h96 (17 · ∞ (no loss) · 64.60) |
| Signals | follow | sig-impulse-s@m15 | 30 | 29 (97 %) | 805 | 80 % | 2.18 | 1112.27 | tp5 sl15 tr2 h96 (33 · 43.27 · 62.87) |
| Signals | follow | sig-heikin-ashi-s@m15 | 30 | 28 (93 %) | 1095 | 77 % | 1.69 | 1043.03 | tp4 sl12 tr3.2 h96 (33 · 4.95 · 73.29) |
| Signals | follow | sig-thrust-s@m15 | 30 | 30 (100 %) | 663 | 83 % | 2.22 | 993.54 | tp4 sl12 tr0 h96 (17 · 4.98 · 48.60) |
| Signals | follow | sig-swing-s@m15 | 30 | 30 (100 %) | 652 | 82 % | 2.08 | 880.50 | tp8 sl24 tr4.8 h96 (14 · 202.36 · 59.79) |
| Signals | follow | sig-r-fractal-s@m15 | 30 | 30 (100 %) | 475 | 83 % | 2.82 | 778.95 | tp3 sl6 tr0 h96 (23 · 4.74 · 46.40) |
| Signals | follow | sig-s2-range-shift-m@m15 | 30 | 26 (87 %) | 466 | 84 % | 2.75 | 723.81 | tp4 sl6 tr0 h96 (17 · 9.81 · 54.60) |
| Signals | follow | sig-s2-block-stack-s@m15 | 30 | 29 (97 %) | 468 | 83 % | 2.49 | 720.46 | tp4 sl8 tr0 h96 (15 · 6.49 · 45.00) |
| Signals | follow | sig-cmf-m@m15 | 30 | 29 (97 %) | 690 | 79 % | 1.75 | 701.69 | tp2.5 sl3.75 tr0 h96 (37 · 2.50 · 41.35) |
| Signals | follow | sig-s2-atr-break-m@m15 | 30 | 28 (93 %) | 577 | 79 % | 2.02 | 698.08 | tp4 sl12 tr2.4 h96 (21 · 4.65 · 45.94) |
| Signals | follow | sig-supertrend-s@m15 | 30 | 27 (90 %) | 533 | 80 % | 1.94 | 687.61 | tp8 sl24 tr3.2 h96 (13 · ∞ (no loss) · 60.66) |
| Signals | follow | sig-hma-s@m15 | 30 | 26 (87 %) | 886 | 76 % | 1.49 | 675.84 | tp6 sl18 tr2.4 h96 (30 · 245.01 · 62.40) |
| Signals | follow | sig-thrust-m@m15 | 30 | 30 (100 %) | 696 | 79 % | 1.66 | 666.51 | tp5 sl10 tr0 h96 (14 · 6.12 · 52.20) |
| Signals | follow | sig-macd-hist-m@m15 | 30 | 24 (80 %) | 896 | 76 % | 1.46 | 640.05 | tp4 sl12 tr0 h96 (22 · 3.11 · 51.60) |
| Signals | follow | sig-r-vol-regime-s@m15 | 30 | 30 (100 %) | 257 | 90 % | 9.93 | 637.94 | tp3 sl9 tr2.4 h96 (14 · 156.97 · 36.17) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 26 (87 %) | 804 | 76 % | 1.54 | 631.74 | tp6 sl18 tr3.6 h96 (16 · 18.73 · 49.95) |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 25 (83 %) | 829 | 78 % | 1.46 | 624.79 | tp6 sl18 tr2.4 h96 (27 · 179.93 · 59.74) |
| Signals | follow | sig-ema-cross-fast-s@m15 | 30 | 22 (73 %) | 792 | 76 % | 1.41 | 612.74 | tp8 sl24 tr3.2 h96 (20 · ∞ (no loss) · 79.88) |
| Signals | follow | sig-atr-break-m@m15 | 30 | 29 (97 %) | 378 | 81 % | 2.82 | 595.83 | tp8 sl24 tr6.4 h96 (6 · ∞ (no loss) · 46.80) |
| Signals | follow | sig-macd-cross-m@m15 | 30 | 27 (90 %) | 631 | 79 % | 1.60 | 593.96 | tp6 sl18 tr2.4 h96 (18 · 735.48 · 53.59) |
| Signals | follow | sig-r-fractal-m@m15 | 30 | 29 (97 %) | 352 | 82 % | 2.82 | 578.14 | tp6 sl18 tr3.6 h96 (9 · 113.15 · 36.27) |
| Signals | follow | sig-macd-hist-s@m15 | 30 | 23 (77 %) | 884 | 74 % | 1.39 | 569.77 | tp6 sl18 tr2.4 h96 (30 · 9.43 · 61.14) |
| Signals | follow | sig-macd-cross-s@m15 | 30 | 23 (77 %) | 884 | 74 % | 1.39 | 569.77 | tp6 sl18 tr2.4 h96 (30 · 9.43 · 61.14) |
| Signals | follow | sig-s2-atr-break-s@m15 | 30 | 29 (97 %) | 538 | 78 % | 1.86 | 567.26 | tp4 sl12 tr1.6 h96 (31 · 14.22 · 45.38) |
| Signals | follow | sig-donchian-m@m15 | 30 | 28 (93 %) | 357 | 83 % | 2.68 | 559.73 | tp4 sl12 tr0 h96 (9 · ∞ (no loss) · 34.20) |
| Signals | follow | sig-s2-adx-gate-s@m15 | 30 | 27 (90 %) | 557 | 80 % | 1.63 | 550.04 | tp6 sl18 tr2.4 h96 (16 · ∞ (no loss) · 47.89) |
| Signals | follow | sig-kama-s@m15 | 30 | 26 (87 %) | 822 | 77 % | 1.38 | 548.10 | tp5 sl15 tr3 h96 (28 · 2.58 · 48.12) |
| Signals | follow | sig-s2-range-shift-s@m15 | 30 | 29 (97 %) | 342 | 83 % | 2.72 | 546.92 | tp3 sl6 tr0 h96 (15 · 6.32 · 33.00) |
| Signals | follow | sig-r-awesome-s@m15 | 30 | 25 (83 %) | 690 | 77 % | 1.53 | 521.30 | tp5 sl10 tr0 h96 (13 · 5.65 · 47.40) |
| Signals | follow | sig-r-inside-s@m15 | 30 | 30 (100 %) | 161 | 94 % | 370.40 | 510.06 | tp4 sl6 tr0 h96 (6 · ∞ (no loss) · 22.80) |
| Signals | follow | sig-s2-stoch-swing-s@m15 | 30 | 23 (77 %) | 577 | 76 % | 1.54 | 489.38 | tp8 sl24 tr4.8 h96 (9 · 4.85 · 39.22) |
| Signals | follow | sig-sar-m@m15 | 30 | 21 (70 %) | 743 | 74 % | 1.34 | 474.88 | tp8 sl24 tr6.4 h96 (12 · 3.28 · 55.21) |
| Signals | follow | sig-stoch-rsi-s@m15 | 30 | 24 (80 %) | 837 | 76 % | 1.32 | 467.89 | tp8 sl24 tr4.8 h96 (14 · ∞ (no loss) · 62.96) |
| Signals | follow | sig-s2-block-scale-m@m15 | 30 | 21 (70 %) | 861 | 73 % | 1.29 | 437.42 | tp6 sl18 tr3.6 h96 (21 · 3.56 · 47.04) |
| Signals | follow | sig-sar-s@m15 | 30 | 25 (83 %) | 826 | 76 % | 1.31 | 422.20 | tp5 sl15 tr2 h96 (39 · 3.82 · 43.56) |
| Signals | follow | sig-cci-m@m15 | 30 | 29 (97 %) | 326 | 83 % | 1.96 | 420.85 | tp8 sl24 tr3.2 h96 (8 · ∞ (no loss) · 36.04) |
| Signals | follow | sig-r-awesome-m@m15 | 30 | 25 (83 %) | 385 | 78 % | 1.90 | 412.37 | tp5 sl15 tr4 h96 (9 · ∞ (no loss) · 34.48) |
| Signals | follow | sig-impulse-m@m15 | 30 | 24 (80 %) | 475 | 78 % | 1.50 | 382.99 | tp5 sl15 tr2 h96 (20 · 14.00 · 36.70) |
| Signals | follow | sig-s2-block-scale-s@m15 | 30 | 21 (70 %) | 921 | 73 % | 1.22 | 376.28 | tp5 sl15 tr3 h96 (27 · 2.59 · 48.50) |
| Signals | follow | sig-s2-confluence-s@m15 | 30 | 20 (67 %) | 516 | 75 % | 1.35 | 318.49 | tp6 sl18 tr2.4 h96 (14 · 16329.57 · 47.90) |
| Signals | follow | sig-donchian-s@m15 | 30 | 23 (77 %) | 482 | 77 % | 1.35 | 311.83 | tp6 sl12 tr0 h96 (8 · 3.33 · 28.40) |
| Signals | follow | sig-atr-break-s@m15 | 30 | 21 (70 %) | 751 | 74 % | 1.23 | 300.13 | tp3 sl6 tr0 h96 (36 · 1.87 · 37.80) |
| Signals | follow | sig-williams-r-s@m15 | 30 | 19 (63 %) | 475 | 74 % | 1.36 | 298.48 | tp8 sl24 tr3.2 h96 (12 · 3530.13 · 51.11) |
| Signals | follow | sig-s2-range-break-s@m15 | 30 | 27 (90 %) | 243 | 77 % | 1.85 | 281.61 | tp5 sl10 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-s2-block-stack-m@m15 | 30 | 24 (80 %) | 329 | 77 % | 1.48 | 280.43 | tp6 sl18 tr3.6 h96 (8 · ∞ (no loss) · 36.35) |
| Signals | follow | sig-obv-m@m15 | 30 | 22 (73 %) | 481 | 77 % | 1.34 | 271.07 | tp8 sl24 tr3.2 h96 (11 · ∞ (no loss) · 28.68) |
| Signals | follow | sig-r-vol-regime-m@m15 | 30 | 29 (97 %) | 119 | 91 % | 10.24 | 262.42 | tp3 sl6 tr0 h96 (6 · ∞ (no loss) · 16.80) |
| Signals | follow | sig-keltner-s@m15 | 30 | 26 (87 %) | 377 | 79 % | 1.37 | 262.19 | tp5 sl10 tr0 h96 (8 · 3.29 · 23.40) |
| Signals | follow | sig-r-connors-m@m15 | 30 | 24 (80 %) | 340 | 76 % | 1.45 | 258.72 | tp6 sl18 tr2.4 h96 (13 · 205.66 · 37.07) |
| Signals | follow | sig-s2-stoch-swing-m@m15 | 30 | 23 (77 %) | 278 | 77 % | 1.58 | 258.02 | tp6 sl18 tr2.4 h96 (9 · 168.32 · 28.49) |
| Signals | follow | sig-s2-range-break-m@m15 | 30 | 24 (80 %) | 221 | 81 % | 1.87 | 254.31 | tp5 sl10 tr0 h96 (6 · ∞ (no loss) · 28.80) |
| Signals | follow | sig-ema-cross-s@m15 | 30 | 20 (67 %) | 386 | 75 % | 1.36 | 252.16 | tp6 sl18 tr2.4 h96 (11 · 14.25 · 36.87) |
| Signals | follow | sig-rsi-momentum-s@m15 | 30 | 25 (83 %) | 126 | 79 % | 3.42 | 237.84 | tp3 sl6 tr0 h96 (5 · ∞ (no loss) · 14.00) |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 30 | 23 (77 %) | 212 | 76 % | 1.79 | 234.18 | tp6 sl18 tr2.4 h96 (8 · 69.46 · 20.53) |
| Signals | follow | sig-r-session-trend-s@m15 | 30 | 21 (70 %) | 268 | 78 % | 1.54 | 233.85 | tp4 sl6 tr0 h96 (11 · 6.13 · 31.80) |
| Signals | follow | sig-supertrend-m@m15 | 30 | 27 (90 %) | 180 | 83 % | 1.77 | 225.44 | tp6 sl9 tr0 h96 (6 · 3.15 · 19.80) |
| Signals | follow | sig-ema-cross-m@m15 | 30 | 25 (83 %) | 110 | 83 % | 4.31 | 219.74 | tp4 sl12 tr1.6 h96 (7 · 22.50 · 8.69) |
| Signals | follow | sig-macd-slow-m@m15 | 30 | 19 (63 %) | 577 | 73 % | 1.18 | 219.28 | tp8 sl24 tr3.2 h96 (14 · 702.77 · 57.14) |
| Signals | follow | sig-cmf-s@m15 | 30 | 23 (77 %) | 644 | 75 % | 1.18 | 214.16 | tp5 sl15 tr2 h96 (27 · 2.86 · 28.81) |
| Signals | follow | sig-r-nr-break-m@m15 | 30 | 19 (63 %) | 695 | 74 % | 1.14 | 176.41 | tp5 sl15 tr0 h96 (12 · 3.47 · 37.60) |
| Signals | follow | sig-act-hf-s@m15 | 30 | 22 (73 %) | 729 | 73 % | 1.11 | 157.40 | tp3 sl9 tr0 h96 (27 · 2.43 · 39.60) |
| Signals | follow | sig-williams-r-m@m15 | 30 | 15 (50 %) | 694 | 74 % | 1.10 | 134.43 | tp8 sl24 tr4.8 h96 (8 · ∞ (no loss) · 50.47) |
| Signals | follow | sig-squeeze-m@m15 | 30 | 30 (100 %) | 34 | 97 % | 6215.96 | 133.38 | – |
| Signals | follow | sig-bollinger-s@m15 | 30 | 17 (57 %) | 482 | 73 % | 1.13 | 124.34 | tp8 sl24 tr3.2 h96 (11 · 1110.38 · 37.77) |
| Signals | follow | sig-zscore-s@m15 | 30 | 17 (57 %) | 482 | 73 % | 1.13 | 124.34 | tp8 sl24 tr3.2 h96 (11 · 1110.38 · 37.77) |
| Signals | follow | sig-stoch-rsi-m@m15 | 30 | 13 (43 %) | 724 | 73 % | 1.08 | 123.99 | tp8 sl24 tr4.8 h96 (10 · ∞ (no loss) · 50.27) |
| Signals | follow | sig-st-slow-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 121.81 | – |
| Signals | follow | sig-r-inside-m@m15 | 30 | 30 (100 %) | 30 | 100 % | ∞ (no loss) | 121.81 | – |
| Signals | follow | sig-kama-m@m15 | 30 | 17 (57 %) | 630 | 73 % | 1.08 | 106.96 | tp5 sl15 tr3 h96 (19 · 2.02 · 31.09) |
| Signals | follow | sig-ema-pullback-s@m15 | 30 | 22 (73 %) | 668 | 74 % | 1.06 | 97.55 | tp5 sl10 tr0 h96 (13 · 1.57 · 17.40) |
| Signals | follow | sig-rsi-reversal-s@m15 | 30 | 19 (63 %) | 100 | 77 % | 1.48 | 91.26 | tp3 sl6 tr0 h96 (5 · 1.81 · 5.00) |
| Signals | follow | sig-vwap-m@m15 | 30 | 16 (53 %) | 293 | 71 % | 1.15 | 81.81 | tp6 sl18 tr2.4 h96 (9 · 194.29 · 27.76) |
| Signals | follow | sig-s2-vol-break-s@m15 | 28 | 20 (71 %) | 81 | 75 % | 1.81 | 73.13 | tp6 sl18 tr2.4 h96 (5 · 6.43 · 2.83) |
| Signals | follow | sig-volume-break-m@m15 | 28 | 20 (71 %) | 89 | 74 % | 1.62 | 67.41 | tp3 sl9 tr1.8 h96 (5 · 9.55 · 5.31) |
| Signals | follow | sig-act-burst-m@m15 | 30 | 15 (50 %) | 349 | 71 % | 1.07 | 53.08 | tp4 sl12 tr1.6 h96 (14 · 66.07 · 26.08) |
| Signals | follow | sig-volume-break-s@m15 | 30 | 23 (77 %) | 65 | 72 % | 1.55 | 50.82 | – |
| Signals | follow | sig-r-nr-break-s@m15 | 30 | 15 (50 %) | 676 | 72 % | 1.04 | 48.66 | tp5 sl15 tr4 h96 (17 · 4.11 · 47.39) |
| Signals | follow | sig-ichimoku-s@m15 | 30 | 14 (47 %) | 441 | 74 % | 1.05 | 44.24 | tp4 sl12 tr1.6 h96 (19 · 2.49 · 18.36) |
| Signals | follow | sig-r-linreg-s@m15 | 30 | 19 (63 %) | 637 | 73 % | 1.02 | 36.65 | tp5 sl15 tr4 h96 (15 · 1.72 · 22.17) |
| Signals | follow | sig-mfi-m@m15 | 30 | 19 (63 %) | 73 | 73 % | 1.27 | 32.10 | tp3 sl9 tr1.2 h96 (8 · 0.71 · -2.74) |
| Signals | follow | sig-mfi-s@m15 | 23 | 16 (70 %) | 29 | 76 % | 2.00 | 26.97 | – |
| Signals | follow | sig-bollinger-m@m15 | 30 | 18 (60 %) | 317 | 76 % | 1.04 | 25.64 | tp8 sl24 tr3.2 h96 (7 · ∞ (no loss) · 28.50) |
| Signals | follow | sig-r-session-trend-m@m15 | 30 | 17 (57 %) | 210 | 76 % | 1.03 | 13.97 | tp3 sl6 tr0 h96 (9 · 3.61 · 16.20) |
| Signals | follow | sig-ichimoku-m@m15 | 30 | 14 (47 %) | 247 | 72 % | 1.00 | 0.67 | tp8 sl24 tr4.8 h96 (5 · ∞ (no loss) · 21.96) |
| Signals | follow | sig-ema-pullback-m@m15 | 30 | 14 (47 %) | 371 | 71 % | 1.00 | -1.81 | tp4 sl12 tr1.6 h96 (19 · 2.68 · 21.72) |
| Signals | follow | sig-s2-st-trail-m@m15 | 30 | 12 (40 %) | 110 | 74 % | 0.99 | -4.08 | tp3 sl9 tr1.2 h96 (5 · 44.88 · 6.67) |
| Signals | follow | sig-s2-ema-cross-s@m15 | 20 | 11 (55 %) | 58 | 71 % | 0.87 | -12.66 | tp3 sl9 tr1.2 h96 (5 · 0.19 · -7.49) |
| Signals | follow | sig-s2-ema-cross-m@m15 | 8 | 1 (13 %) | 8 | 13 % | 0.02 | -26.06 | – |
| Signals | follow | sig-rsi-reversal-m@m15 | 25 | 9 (36 %) | 80 | 69 % | 0.86 | -27.11 | tp2.5 sl5 tr0 h96 (5 · 1.77 · 4.00) |
| Signals | follow | sig-trix-s@m15 | 30 | 13 (43 %) | 391 | 71 % | 0.97 | -30.24 | tp8 sl24 tr3.2 h96 (8 · 20.07 · 30.37) |
| Signals | follow | sig-ema-trend-m@m15 | 30 | 14 (47 %) | 401 | 70 % | 0.96 | -37.46 | tp6 sl18 tr2.4 h96 (12 · 13.49 · 34.35) |
| Signals | follow | sig-zscore-m@m15 | 26 | 14 (54 %) | 203 | 72 % | 0.88 | -41.08 | tp3 sl9 tr2.4 h96 (10 · 2.49 · 13.66) |
| Signals | follow | sig-s2-rsi-revert-m@m15 | 28 | 9 (32 %) | 108 | 66 % | 0.83 | -43.51 | tp3 sl9 tr2.4 h96 (5 · 0.96 · -0.34) |
| Signals | follow | sig-rsi-mid-s@m15 | 30 | 14 (47 %) | 811 | 70 % | 0.98 | -48.91 | tp6 sl18 tr2.4 h96 (23 · 3.70 · 51.43) |
| Signals | follow | sig-s2-vol-break-m@m15 | 30 | 13 (43 %) | 117 | 68 % | 0.82 | -52.26 | tp3 sl9 tr1.2 h96 (7 · 9.15 · 5.62) |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 12 (40 %) | 526 | 69 % | 0.95 | -61.95 | tp5 sl15 tr4 h96 (11 · 1.42 · 12.80) |
| Signals | follow | sig-s2-active-hf-m@m15 | 30 | 15 (50 %) | 837 | 69 % | 0.96 | -63.21 | tp5 sl15 tr4 h96 (14 · 3.47 · 37.95) |
| Signals | follow | sig-adx-m@m15 | 30 | 16 (53 %) | 222 | 64 % | 0.87 | -66.14 | tp5 sl10 tr0 h96 (6 · 2.35 · 13.80) |
| Signals | follow | sig-reclaim-m@m15 | 30 | 10 (33 %) | 527 | 68 % | 0.92 | -97.94 | tp6 sl18 tr2.4 h96 (13 · ∞ (no loss) · 46.84) |
| Signals | follow | sig-cci-s@m15 | 30 | 9 (30 %) | 594 | 69 % | 0.92 | -99.01 | tp6 sl18 tr2.4 h96 (22 · 2.89 · 35.18) |
| Signals | follow | sig-vwap-s@m15 | 30 | 12 (40 %) | 568 | 69 % | 0.91 | -118.08 | tp5 sl15 tr2 h96 (19 · 2.74 · 26.89) |
| Signals | follow | sig-ema-slope-s@m15 | 30 | 10 (33 %) | 499 | 69 % | 0.90 | -129.73 | tp8 sl24 tr3.2 h96 (12 · 663.72 · 53.96) |
| Signals | follow | sig-s2-active-hf-s@m15 | 30 | 14 (47 %) | 827 | 68 % | 0.92 | -139.91 | tp5 sl15 tr4 h96 (14 · 3.47 · 37.95) |
| Signals | follow | sig-ema-cross-fast-m@m15 | 30 | 7 (23 %) | 312 | 68 % | 0.83 | -149.65 | tp8 sl24 tr3.2 h96 (7 · 18.83 · 27.20) |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 28 | 9 (32 %) | 83 | 53 % | 0.46 | -149.69 | tp2.5 sl3.75 tr0 h96 (8 · 0.58 · -6.60) |
| Signals | follow | sig-act-hf-m@m15 | 30 | 9 (30 %) | 721 | 68 % | 0.91 | -166.80 | tp5 sl15 tr3 h96 (19 · 2.06 · 32.33) |
| Signals | follow | sig-hma-m@m15 | 30 | 13 (43 %) | 353 | 67 % | 0.83 | -172.68 | tp5 sl15 tr0 h96 (8 · 2.21 · 18.40) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 30 | 0 (0 %) | 161 | 55 % | 0.63 | -177.51 | tp5 sl15 tr3 h96 (5 · 0.95 · -0.83) |
| Signals | follow | sig-reclaim-s@m15 | 30 | 11 (37 %) | 746 | 69 % | 0.90 | -177.74 | tp6 sl18 tr2.4 h96 (22 · 3.36 · 43.11) |
| Signals | follow | sig-adx-s@m15 | 30 | 12 (40 %) | 345 | 66 % | 0.81 | -183.73 | tp6 sl18 tr2.4 h96 (10 · ∞ (no loss) · 32.76) |
| Signals | follow | sig-s2-adx-gate-m@m15 | 30 | 8 (27 %) | 330 | 67 % | 0.80 | -190.15 | tp8 sl24 tr4.8 h96 (6 · 4.79 · 25.17) |
| Signals | follow | sig-obv-s@m15 | 30 | 9 (30 %) | 600 | 68 % | 0.86 | -200.13 | tp6 sl18 tr2.4 h96 (19 · 13.54 · 39.91) |
| Signals | follow | sig-trix-m@m15 | 30 | 5 (17 %) | 201 | 63 % | 0.66 | -222.69 | tp5 sl15 tr0 h96 (5 · 1.26 · 4.00) |
| Signals | follow | sig-ema-trend-s@m15 | 30 | 8 (27 %) | 556 | 70 % | 0.84 | -231.52 | tp3 sl9 tr1.2 h96 (29 · 1.59 · 16.96) |
| Signals | follow | sig-st-slow-s@m15 | 30 | 5 (17 %) | 447 | 68 % | 0.81 | -241.98 | tp8 sl24 tr3.2 h96 (10 · 1.84 · 20.37) |
| Signals | follow | sig-s2-st-trail-s@m15 | 30 | 9 (30 %) | 447 | 66 % | 0.80 | -262.48 | tp8 sl24 tr4.8 h96 (9 · 1.78 · 19.04) |
| Signals | follow | sig-ema-slope-m@m15 | 30 | 11 (37 %) | 140 | 51 % | 0.44 | -270.61 | tp5 sl15 tr2 h96 (6 · 43.88 · 7.92) |
| Signals | follow | sig-squeeze-s@m15 | 30 | 4 (13 %) | 129 | 59 % | 0.40 | -321.08 | tp3 sl9 tr1.2 h96 (5 · ∞ (no loss) · 8.56) |
| Signals | follow | sig-keltner-m@m15 | 30 | 4 (13 %) | 262 | 66 % | 0.55 | -382.78 | tp3 sl9 tr1.2 h96 (17 · 1.96 · 9.84) |
| Signals | follow | sig-r-connors-s@m15 | 30 | 1 (3 %) | 91 | 37 % | 0.18 | -405.23 | tp3 sl9 tr1.2 h96 (5 · 0.42 · -5.35) |
| Signals | follow | sig-act-burst-s@m15 | 30 | 7 (23 %) | 781 | 66 % | 0.77 | -440.68 | tp8 sl24 tr3.2 h96 (18 · 3.35 · 24.48) |
| Signals | follow | sig-s2-confluence-m@m15 | 30 | 6 (20 %) | 547 | 64 % | 0.67 | -532.19 | tp8 sl24 tr3.2 h96 (12 · 441.80 · 35.89) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 8.000% | sl 3.00× | tr 0.40× | 121 | 110 (91 %) | 1309 | 87 % | 2.65 | 2447.34 |
| Signals | tp 6.000% | sl 3.00× | tr 0.40× | 122 | 106 (87 %) | 1839 | 85 % | 2.38 | 2384.12 |
| Signals | tp 5.000% | sl 3.00× | tr 0.40× | 122 | 107 (88 %) | 2155 | 84 % | 2.10 | 2092.93 |
| Signals | tp 5.000% | sl 3.00× | tr 0.60× | 122 | 106 (87 %) | 1654 | 83 % | 1.82 | 1936.20 |
| Signals | tp 6.000% | sl 3.00× | tr 0.60× | 120 | 99 (83 %) | 1264 | 81 % | 1.93 | 1816.40 |
| Signals | tp 5.000% | sl 3.00× | tr 0.80× | 121 | 97 (80 %) | 1259 | 80 % | 1.69 | 1728.42 |
| Signals | tp 5.000% | sl 3.00× | tr off | 120 | 97 (81 %) | 1075 | 83 % | 1.54 | 1509.36 |
| Signals | tp 6.000% | sl 3.00× | tr 0.80× | 119 | 89 (75 %) | 1026 | 80 % | 1.61 | 1456.39 |
| Signals | tp 8.000% | sl 3.00× | tr 0.60× | 117 | 86 (74 %) | 908 | 81 % | 1.65 | 1425.92 |
| Signals | tp 8.000% | sl 3.00× | tr 0.80× | 114 | 85 (75 %) | 660 | 81 % | 1.51 | 1276.34 |
| Signals | tp 6.000% | sl 3.00× | tr off | 116 | 77 (66 %) | 825 | 81 % | 1.36 | 1030.37 |
| Signals | tp 4.000% | sl 3.00× | tr 0.60× | 122 | 87 (71 %) | 2127 | 77 % | 1.28 | 997.48 |
| Signals | tp 4.000% | sl 3.00× | tr 0.80× | 122 | 81 (66 %) | 1760 | 77 % | 1.26 | 946.96 |
| Signals | tp 4.000% | sl 3.00× | tr off | 122 | 76 (62 %) | 1459 | 80 % | 1.25 | 894.56 |
| Signals | tp 3.000% | sl 2.00× | tr off | 123 | 73 (59 %) | 2530 | 72 % | 1.18 | 793.73 |
| Signals | tp 4.000% | sl 3.00× | tr 0.40× | 123 | 81 (66 %) | 2727 | 77 % | 1.24 | 781.41 |
| Signals | tp 2.500% | sl 3.00× | tr off | 122 | 70 (57 %) | 2543 | 80 % | 1.17 | 690.76 |
| Signals | tp 3.000% | sl 3.00× | tr off | 122 | 73 (60 %) | 2217 | 79 % | 1.15 | 622.33 |
| Signals | tp 5.000% | sl 2.00× | tr off | 121 | 71 (59 %) | 1268 | 71 % | 1.17 | 615.76 |
| Signals | tp 3.000% | sl 3.00× | tr 0.80× | 122 | 74 (61 %) | 2423 | 74 % | 1.14 | 554.39 |
| Signals | tp 6.000% | sl 2.00× | tr off | 120 | 64 (53 %) | 948 | 71 % | 1.15 | 518.76 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 123 | 83 (67 %) | 3371 | 75 % | 1.15 | 515.14 |
| Signals | tp 4.000% | sl 2.00× | tr off | 122 | 58 (48 %) | 1722 | 70 % | 1.06 | 269.96 |
| Signals | tp 3.000% | sl 3.00× | tr 0.60× | 123 | 71 (58 %) | 2774 | 77 % | 1.05 | 217.71 |
| Long | tp 5.600% | sl 0.50× | tr off | 46 | 28 (61 %) | 227 | 48 % | 1.57 | 196.81 |
| General | tp 4.400% | sl 0.75× | tr off | 73 | 35 (48 %) | 273 | 55 % | 1.45 | 193.05 |
| Signals | tp 3.000% | sl 1.50× | tr off | 123 | 66 (54 %) | 2910 | 64 % | 1.04 | 183.00 |
| Minimal | tp 1.400% | sl 3.00× | tr 0.75× | 277 | 155 (56 %) | 4666 | 70 % | 1.04 | 172.76 |
| General | tp 4.000% | sl 1.00× | tr off | 59 | 25 (42 %) | 118 | 66 % | 2.00 | 146.41 |
| General | tp 4.000% | sl 0.75× | tr off | 44 | 24 (55 %) | 122 | 61 % | 1.82 | 124.11 |
| Long | tp 6.400% | sl 1.00× | tr 0.75× | 46 | 19 (41 %) | 157 | 54 % | 1.31 | 118.67 |
| Long | tp 5.200% | sl 0.50× | tr off | 42 | 23 (55 %) | 130 | 51 % | 1.67 | 118.19 |
| Long | tp 4.800% | sl 1.00× | tr off | 63 | 26 (41 %) | 176 | 58 % | 1.29 | 100.41 |
| General | tp 4.400% | sl 1.00× | tr off | 58 | 24 (41 %) | 159 | 58 % | 1.37 | 99.57 |
| General | tp 3.600% | sl 1.00× | tr 0.75× | 34 | 14 (41 %) | 76 | 64 % | 2.08 | 98.27 |
| Short | tp 2.800% | sl 2.00× | tr off | 49 | 24 (49 %) | 121 | 76 % | 1.68 | 95.94 |
| General | tp 3.200% | sl 0.50× | tr off | 29 | 21 (72 %) | 86 | 64 % | 2.73 | 94.16 |
| Long | tp 6.000% | sl 0.50× | tr off | 41 | 20 (49 %) | 166 | 43 % | 1.31 | 88.87 |
| Signals | tp 5.000% | sl 1.50× | tr off | 121 | 67 (55 %) | 1481 | 62 % | 1.02 | 85.66 |
| General | tp 4.000% | sl 0.50× | tr off | 27 | 17 (63 %) | 97 | 52 % | 1.71 | 70.69 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Wide | tp 0.640% | sl 0.84× | tr off | 121 | 24 (20 %) | 2228 | 32 % | 0.47 | -906.45 |
| Minimal | tp 1.000% | sl 3.00× | tr off | 202 | 72 (36 %) | 1728 | 68 % | 0.55 | -778.35 |
| Minimal | tp 1.200% | sl 3.00× | tr off | 221 | 87 (39 %) | 4237 | 76 % | 0.84 | -624.08 |
| Minimal | tp 1.600% | sl 2.50× | tr off | 296 | 95 (32 %) | 4909 | 72 % | 0.89 | -616.16 |
| Minimal | tp 1.200% | sl 3.00× | tr 0.50× | 219 | 70 (32 %) | 3532 | 59 % | 0.76 | -548.10 |
| Minimal | tp 1.000% | sl 3.00× | tr 0.75× | 209 | 68 (33 %) | 2042 | 58 % | 0.71 | -512.16 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.50× | 370 | 146 (39 %) | 5153 | 66 % | 0.88 | -511.41 |
| Minimal | tp 1.600% | sl 2.50× | tr 0.50× | 304 | 112 (37 %) | 5219 | 65 % | 0.88 | -509.82 |
| Minimal | tp 1.400% | sl 2.50× | tr off | 217 | 83 (38 %) | 4052 | 72 % | 0.88 | -488.77 |
| Minimal | tp 1.200% | sl 2.50× | tr off | 142 | 52 (37 %) | 1377 | 68 % | 0.67 | -447.13 |
| Minimal | tp 1.200% | sl 2.00× | tr 0.75× | 111 | 26 (23 %) | 1543 | 55 % | 0.67 | -436.24 |
| Minimal | tp 1.200% | sl 2.50× | tr 0.75× | 167 | 64 (38 %) | 1692 | 58 % | 0.73 | -435.23 |
| Minimal | tp 1.600% | sl 2.00× | tr 0.75× | 202 | 84 (42 %) | 3426 | 62 % | 0.87 | -430.92 |
| Minimal | tp 1.200% | sl 2.50× | tr 0.50× | 146 | 46 (32 %) | 1506 | 55 % | 0.62 | -430.91 |
| Minimal | tp 1.400% | sl 3.00× | tr off | 312 | 127 (41 %) | 5570 | 77 % | 0.92 | -419.20 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 105 (54) | 122720 | 18292 | 18292 | 0 | baseRange 92276 · baseTarget 12152 |
| Micro | trailing | 105 (54) | 245440 | 36584 | 36584 | 0 | baseRange 184552 · baseTarget 24304 |
| Minimal | normal | 369 (355) | 95200 | 39520 | 39520 | 0 | baseTarget 33760 · baseRange 21920 |
| Minimal | trailing | 369 (355) | 190400 | 79040 | 79040 | 0 | baseTarget 67520 · baseRange 43840 |
| Short | normal | 263 (205) | 64152 | 12504 | 12504 | 0 | baseTarget 7260 · baseRange 44388 |
| Short | trailing | 263 (205) | 128304 | 25008 | 25008 | 0 | baseTarget 14520 · baseRange 88776 |
| General | normal | 263 (215) | 42768 | 9258 | 9258 | 0 | baseRange 29160 · baseTarget 4350 |
| General | trailing | 263 (215) | 28512 | 6172 | 6172 | 0 | baseRange 19440 · baseTarget 2900 |
| Long | normal | 263 (222) | 53460 | 14478 | 14478 | 0 | baseTarget 6012 · baseRange 32970 |
| Long | trailing | 263 (222) | 35640 | 9652 | 9652 | 0 | baseTarget 4008 · baseRange 21980 |
| Wide | axis | 369 (369) | 107100 | 107100 | 107100 | 0 | – |
| Wide | dca | 369 (369) | 9520 | 9520 | 9520 | 0 | – |
| Wide | dca-active | 369 (369) | 9520 | 9520 | 9520 | 0 | – |

Engine indications Base evaluated that built no set: 22 (bb-walk, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-25, mc-bbrk-20, mc-rsit3-20, mc-rsit3-25, mc-rsit3-30, mc-rsit7-20, mc-rsit7-25, mc-rsit7-30, mc-rsit9-25, mc-tcross-513, mc-wick-2, r-bbw-expand, r-bbw-expand-m, r-capit, r-capit-m, r-roofing-m, r-squeeze-m, rsi-mom-14-25, willr-7-80).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.3 % | tp 0.35 % | tp 0.4 % | tp 0.45 % | tp 0.5 % | tp 0.55 % | tp 0.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | – | – | 0.24 (5100) | 0.32 (5260) | 0.34 (5346) | 0.38 (5690) | 0.41 (6366) |
| 1.14× | – | 0.19 (4902) | – | – | – | – | – |
| 1.25× | – | 0.21 (4854) | 0.27 (5046) | 0.32 (5228) | 0.33 (5320) | 0.40 (5660) | 0.43 (6332) |
| 1.33× | 0.15 (4922) | – | – | – | – | – | – |
| 1.5× | 0.17 (4890) | 0.21 (4848) | 0.26 (5022) | 0.32 (5210) | 0.36 (5292) | 0.40 (5616) | 0.44 (6230) |
| 1.75× | 0.17 (4890) | 0.21 (4830) | 0.28 (4998) | 0.33 (5180) | 0.37 (5222) | 0.41 (5550) | 0.44 (6210) |
| 2× | 0.17 (4872) | 0.23 (4806) | 0.28 (4972) | 0.36 (5122) | 0.37 (5186) | 0.41 (5516) | 0.48 (6179) |
| 2.25× | 0.17 (4862) | 0.23 (4790) | 0.30 (4932) | 0.36 (5106) | 0.39 (5156) | 0.44 (5470) | 0.48 (6115) |
| 2.5× | 0.18 (4848) | 0.24 (4748) | 0.30 (4916) | 0.38 (5072) | 0.39 (5109) | 0.42 (5446) | 0.48 (6067) |
| 2.75× | 0.19 (4824) | 0.24 (4726) | 0.30 (4882) | 0.38 (5031) | 0.37 (5091) | 0.43 (5392) | 0.47 (6027) |
| 3× | 0.19 (4796) | 0.25 (4712) | 0.31 (4872) | 0.36 (5009) | 0.38 (5053) | 0.43 (5367) | 0.53 (5945) |
| 3.25× | 0.19 (4784) | 0.26 (4696) | 0.31 (4830) | 0.36 (4983) | 0.39 (5019) | 0.47 (5312) | 0.57 (5884) |
| 3.5× | 0.19 (4770) | 0.26 (4678) | 0.30 (4822) | 0.36 (4965) | 0.40 (5009) | 0.52 (5266) | 0.57 (5860) |
| 3.75× | 0.20 (4750) | 0.25 (4650) | 0.31 (4790) | 0.38 (4933) | 0.43 (4958) | 0.56 (5237) | 0.59 (5788) |
| 4× | 0.21 (4746) | 0.25 (4642) | 0.31 (4786) | 0.41 (4889) | 0.49 (4880) | 0.55 (5211) | 0.57 (5774) |
| 4.25× | 0.21 (4706) | 0.25 (4622) | 0.32 (4754) | 0.46 (4831) | 0.50 (4900) | 0.57 (5173) | 0.56 (5758) |
| 4.5× | 0.20 (4698) | 0.25 (4610) | 0.34 (4720) | 0.48 (4807) | 0.51 (4864) | 0.57 (5161) | 0.57 (5774) |
| 4.75× | 0.20 (4682) | 0.26 (4586) | 0.38 (4692) | 0.50 (4799) | 0.51 (4856) | 0.56 (5149) | 0.55 (5770) |
| 5× | 0.21 (4674) | 0.27 (4580) | 0.41 (4638) | 0.51 (4757) | 0.52 (4830) | 0.56 (5145) | 0.53 (5770) |

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
| 2.25× | – | – | – | – | – | – | ∞ (5) |
| 2.5× | – | – | – | – | – | – | 0.06 (10) |
| 2.75× | – | – | – | – | – | 0.05 (20) | 0.22 (40) |
| 3× | – | – | – | – | – | 0.05 (20) | 0.28 (72) |
| 3.25× | – | – | – | – | – | 1.91 (38) | 0.62 (100) |
| 3.5× | – | – | – | – | 0.31 (12) | 1.49 (103) | 0.59 (102) |
| 3.75× | – | – | – | 0.26 (12) | 1.17 (41) | 0.62 (101) | 0.84 (118) |
| 4× | – | – | – | – | 0.49 (65) | 0.63 (105) | 0.80 (118) |
| 4.25× | – | – | – | 39.62 (34) | 0.54 (71) | 0.82 (74) | 0.77 (91) |
| 4.5× | – | – | – | 0.61 (58) | 0.67 (69) | 1.44 (67) | 0.38 (129) |
| 4.75× | – | – | 13.48 (34) | 0.66 (64) | 0.65 (69) | 1.41 (67) | 0.92 (270) |
| 5× | – | – | 0.47 (58) | 0.92 (62) | 2.84 (69) | 1.38 (67) | 1.97 (234) |

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
| 2.75× | – | – | – | – | – | – | ∞ (4) |
| 3× | – | – | – | – | – | – | – |
| 3.25× | – | – | – | – | – | – | ∞ (4) |
| 3.5× | – | – | – | – | – | – | ∞ (4) |
| 3.75× | – | – | – | – | – | – | ∞ (5) |
| 4× | – | – | – | – | – | – | ∞ (1) |
| 4.25× | – | – | – | – | 0.00 (4) | ∞ (1) | ∞ (1) |
| 4.5× | – | – | – | – | 0.00 (2) | ∞ (1) | ∞ (2) |
| 4.75× | – | – | – | – | – | ∞ (1) | 0.85 (15) |
| 5× | – | – | – | – | – | – | 0.75 (7) |

### Minimal — every config computed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 0.56 (61944) | 0.63 (75018) | 0.76 (80679) | 0.82 (96786) | 0.84 (108958) |
| 2× | 0.59 (58932) | 0.72 (71504) | 0.78 (76847) | 0.84 (92290) | 0.90 (102541) |
| 2.5× | 0.65 (56717) | 0.72 (69448) | 0.82 (74398) | 0.87 (88667) | 0.88 (99809) |
| 3× | 0.66 (55393) | 0.71 (68031) | 0.85 (72765) | 0.91 (86368) | 0.91 (96529) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 0.61 (524) | 0.61 (652) | 0.70 (3011) | 0.77 (4079) | 0.85 (5831) |
| 2× | 0.59 (1240) | 0.71 (2210) | 0.70 (3834) | 0.77 (4265) | 0.89 (10032) |
| 2.5× | 0.57 (1967) | 0.69 (3646) | 0.68 (4575) | 0.92 (12096) | 0.91 (14960) |
| 3× | 0.59 (2759) | 0.63 (5533) | 0.85 (11830) | 0.95 (15239) | 0.94 (15870) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % | tp 1 % | tp 1.2 % | tp 1.4 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|
| 1.5× | 0.38 (45) | 1.66 (103) | 0.46 (198) | 0.71 (370) | 1.19 (616) |
| 2× | 0.55 (97) | 0.54 (257) | 0.57 (319) | 0.79 (641) | 1.15 (897) |
| 2.5× | 0.30 (196) | 0.75 (350) | 0.68 (553) | 1.08 (1047) | 1.05 (1383) |
| 3× | 0.48 (292) | 0.65 (547) | 1.00 (780) | 1.14 (1307) | 1.24 (1473) |

### Short — every config computed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.94 (12263) | 1.03 (12316) | 0.92 (12712) | 0.93 (13262) | 1.00 (13541) | 1.06 (14500) |
| 1.5× | 1.01 (11476) | 1.16 (11232) | 1.10 (11651) | 1.07 (12087) | 1.10 (12592) | 1.12 (13407) |
| 2× | 1.09 (10801) | 1.16 (10835) | 1.03 (11345) | 1.04 (11699) | 1.08 (12037) | 1.16 (12573) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.87 (102) | 1.11 (130) | 0.66 (133) | 1.07 (119) | 0.75 (156) | 0.80 (227) |
| 1.5× | 1.46 (140) | 0.84 (146) | 0.83 (151) | 1.02 (291) | 1.10 (395) | 0.74 (434) |
| 2× | 1.39 (180) | 1.06 (201) | 1.06 (217) | 0.99 (264) | 0.89 (425) | 0.98 (475) |

### Short — orders executed

| stop ÷ target | tp 1.8 % | tp 2 % | tp 2.2 % | tp 2.4 % | tp 2.6 % | tp 2.8 % |
|---|---:|---:|---:|---:|---:|---:|
| 1× | 0.09 (10) | 0.47 (18) | 0.48 (19) | 0.60 (40) | 1.31 (45) | 1.31 (65) |
| 1.5× | 1.46 (37) | 0.67 (51) | 0.71 (54) | 0.92 (63) | 0.82 (74) | 0.74 (137) |
| 2× | 0.46 (28) | 0.68 (50) | 0.49 (54) | 0.68 (61) | 0.84 (99) | 1.28 (116) |

### General — every config computed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.14 (4464) | 1.13 (4761) | 1.21 (4800) | 1.12 (5237) |
| 0.75× | 1.14 (4121) | 1.21 (4301) | 1.29 (4327) | 1.23 (4648) |
| 1× | 1.21 (11783) | 1.23 (12470) | 1.16 (12638) | 1.08 (13327) |

### General — configs that passed their evaluation

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 2.73 (86) | 1.22 (100) | 1.71 (97) | 1.16 (90) |
| 0.75× | 1.42 (134) | 1.07 (149) | 1.82 (122) | 1.45 (273) |
| 1× | 1.08 (246) | 1.38 (287) | 1.17 (551) | 1.10 (572) |

### General — orders executed

| stop ÷ target | tp 3.2 % | tp 3.6 % | tp 4 % | tp 4.4 % |
|---|---:|---:|---:|---:|
| 0.5× | 1.25 (7) | 1.28 (7) | 0.53 (10) | 0.78 (11) |
| 0.75× | 1.26 (23) | 1.93 (22) | 2.05 (32) | 1.24 (66) |
| 1× | 1.05 (84) | 0.95 (94) | 1.49 (83) | 1.00 (106) |

### Long — every config computed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.07 (4830) | 1.09 (4692) | 1.08 (5180) | 1.04 (4913) | 1.09 (5571) |
| 0.75× | 1.14 (4223) | 1.10 (4217) | 1.03 (4571) | 1.09 (4168) | 1.09 (4862) |
| 1× | 1.10 (12409) | 1.07 (12268) | 1.15 (13179) | 1.06 (12573) | 1.07 (14380) |

### Long — configs that passed their evaluation

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.41 (124) | 1.67 (130) | 1.57 (227) | 1.31 (166) | 0.94 (207) |
| 0.75× | 1.01 (135) | 0.75 (160) | 1.01 (198) | 0.89 (206) | 0.73 (267) |
| 1× | 1.09 (461) | 0.96 (446) | 1.10 (405) | 0.87 (435) | 1.09 (518) |

### Long — orders executed

| stop ÷ target | tp 4.8 % | tp 5.2 % | tp 5.6 % | tp 6 % | tp 6.4 % |
|---|---:|---:|---:|---:|---:|
| 0.5× | 1.18 (5) | 1.43 (18) | 1.37 (24) | 1.38 (18) | 0.90 (23) |
| 0.75× | 0.95 (25) | 0.54 (13) | 0.68 (15) | 0.56 (17) | 0.76 (22) |
| 1× | 0.53 (41) | 0.60 (51) | 0.73 (45) | 0.75 (47) | 1.21 (86) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.40 (329673) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.53 (20550) | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.52 (269251) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.62 (19406) | 0.48 (11055) | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | 0.68 (18714) | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | 0.61 (10663) | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.65 (10437) | – | – | – | – |
| 1× | – | – | – | 0.43 (230770) | – | – | – | 0.56 (56961) | 0.54 (9119) | – | 0.80 (3151) | – | 0.71 (8721) | 0.77 (8209) | 0.92 (2848) | 0.99 (2537) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.08 % | tp 1.13 % | tp 1.2 % | tp 1.62 % | tp 1.7 % | tp 2.11 % | tp 2.6 % | tp 3.5 % | tp 3.68 % | tp 4.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.84× | 0.47 (2228) | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.36 (686) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 1× | – | – | – | 0.68 (508) | – | – | – | 0.23 (284) | – | – | – | – | – | – | – | – |

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
