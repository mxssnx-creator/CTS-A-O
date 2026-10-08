# 12 h simulated session — 20 symbols, 24 h pre-historic + 12 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-04 15:00 → 2026-10-05 15:00 UTC, run 2026-10-05 15:00 → 2026-10-06 03:00 UTC. Symbols: BCH-USDT, SOL-USDT, XRP-USDT, BR-USDT, ORCA-USDT, PARTI-USDT, DIA-USDT, ZRO-USDT, LYN-USDT, AIN-USDT, HAJIMI-USDT, API3-USDT, QNT-USDT, NIL-USDT, NIGHT-USDT, SAND-USDT, PUMP-USDT, GRIFFAIN-USDT, HUMA-USDT, STABLE-USDT.

Settings (desk, docs/sims/micro-2026-10-08/desks/MV5.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / axis, ranges micro / short / general / long (micro on), caps: positions none, signal positions none, coordination on, signals validated on their last 0. Block overall, 8 levels, Active from 5, ratio 0.5, max 4× per source, the stack up to 8×. Balance $20.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/MV5-w-rally/html/index.html](runs/MV5-w-rally/html/index.html) · numbers: `runs/MV5-w-rally/html/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $20.00 → $25.14 | $22.56 | $5.14 (25.69 %) | 4.17 | 3.98 | 1.50 | 0.05 | $2.45 (10.96 %) | 3577 | 38 | 81.30 % | 12 / 12 | $17.65 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 23 positions / 4193 orders, MTM -$2.58 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 214 orders capped to $0, 3141 scaled down (open at end: 99 capped, 4013 scaled) · binding: position cap 5846, gross cap 7022. **Without the caps:** balance $20.00 → $54.96 (174.79 %) · PF $ 3.41 · equity at end $12.37 · equity max drawdown $45.87 (112.23 %) · margin used max $379.51 · infeasible: margin exceeded equity for 616 min.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.40 (no compounding) the same orders net $25.13 (125.66 %), closed-order max drawdown $1.67.

Engine: Base 1122/25098 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126), Main 1057 pairs, 157517 tapes, Real seats: 6807 engine configs + 3750 signal configs (every config of the active signals), compute 154 s, peak RSS 5248 MB. Consistency checks: 54 of 55 pass.

## Findings

- **Strategy types positive:** Signal · Trailing $2.64 (PF 14.05, 1479 orders) · Signal · Normal $2.06 (PF 3.11, 1360 orders) · Trailing $0.30 (PF 2.16, 435 orders) · Normal $0.13 (PF 1.71, 303 orders).
- **Strategy types losing:** none.
- **Engine vs signals:** Engine $0.43 (PF 1.97, 738 orders) · Signals $4.71 (PF 4.99, 2839 orders).
- **Indication kinds positive:** signal:s2-stoch-swing $0.65 (PF 15.22, 87 orders) · signal:kama $0.45 (PF 18.74, 83 orders) · signal:ichimoku $0.36 (PF 3639.48, 55 orders) · signal:s2-bb-bounce $0.30 (PF 2284.20, 29 orders) · signal:r-awesome $0.29 (PF 9.67, 121 orders) · osc $0.23 (PF 6.84, 140 orders).
- **Indication kinds losing:** signal:act-burst -$0.11 (PF 0.00, 6 orders) · signal:williams-r -$0.07 (PF 0.54, 101 orders) · signal:reclaim -$0.06 (PF 0.32, 95 orders) · volume -$0.05 (PF 0.01, 89 orders) · break -$0.05 (PF 0.44, 58 orders) · move -$0.02 (PF 0.88, 66 orders).
- **Signal sources positive:** s2-stoch-swing $0.65 (PF 15.22, 87 orders) · kama $0.45 (PF 18.74, 83 orders) · ichimoku $0.36 (PF 3639.48, 55 orders) · s2-bb-bounce $0.30 (PF 2284.20, 29 orders) · r-awesome $0.29 (PF 9.67, 121 orders) · heikin-ashi $0.22 (PF 2.87, 153 orders) · macd-cross $0.19 (PF 73.62, 48 orders) · stoch-rsi $0.18 (PF 7.26, 148 orders).
- **Signal sources losing:** act-burst -$0.11 (PF 0.00, 6 orders) · williams-r -$0.07 (PF 0.54, 101 orders) · reclaim -$0.06 (PF 0.32, 95 orders) · s2-block-stack -$0.02 (PF 0.55, 32 orders) · ema-pullback -$0.01 (PF 0.79, 48 orders) · macd-hist -$0.00 (PF 0.95, 63 orders) · ema-trend -$0.00 (PF 0.68, 30 orders) · s2-atr-break -$0.00 (PF 0.99, 61 orders).
- **Symbols:** best ORCA-USDT $0.88 (PF 18.10, 540 orders) · DIA-USDT $0.73 (PF 13.34, 342 orders) · NIGHT-USDT $0.67 (PF 103.07, 272 orders); worst HAJIMI-USDT -$0.10 (PF 0.10, 130 orders) · NIL-USDT -$0.09 (PF 0.72, 263 orders) · HUMA-USDT -$0.03 (PF 0.91, 129 orders).
- **Block volume:** ×1 $5.14 (unit PF 3.98, 3577).
- **Lanes:** 5m -$0.03 (PF 0.27, 24) · 5m+ $0.00 (PF ∞ (no loss), 12) · 15m $5.02 (PF 4.45, 3183) · 15m+ $0.13 (PF 26.08, 112) · 30m $0.01 (PF 1.06, 246); **ranges:** Micro -$0.03 (PF 0.32, 36) · Short $0.23 (PF 1.77, 409) · General $0.23 (PF 3.22, 227) · Long -$0.00 (PF 0.95, 66) · Signals $4.71 (PF 4.99, 2839); **sides:** Long $5.02 (PF 4.45, 3527) · Short $0.11 (PF 1.70, 50).
- **Hours:** 12 green / 0 red / 0 flat of 12 full hours; first order opened 15:00 UTC; best hour 18:00 $0.93, worst hour 17:00 $0.01.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | $20.46 | $20.38 | 8.88 % | $10.53 | 144 | 16 / 2 / 14 | 107 | 2.26 | 2.81 | $0.46 | 0.57 | 0.56 | $0.46 | 2.26 |
| 16:00 | $20.90 | $20.31 | 9.21 % | $14.63 | 86 | 5 / 4 / 15 | 77 | 5.57 | 7.33 | $0.44 | 1.57 | 0.18 | $0.90 | 2.96 |
| 17:00 | $20.91 | $20.93 | 6.41 % | $14.64 | 46 | 1 / 0 / 16 | 34 | 6.41 | 7.39 | $0.01 | 2.57 | 0.09 | $0.91 | 2.98 |
| 18:00 | $21.84 | $21.58 | 3.51 % | $15.29 | 334 | 4 / 0 / 20 | 329 | 4415.88 | 1625.51 | $0.93 | 3.57 | 0.00 | $1.84 | 5.00 |
| 19:00 | $22.16 | $21.49 | 3.92 % | $15.51 | 276 | 2 / 2 / 20 | 218 | 3.88 | 4.70 | $0.32 | 4.57 | 0.12 | $2.16 | 4.79 |
| 20:00 | $23.08 | $22.76 | 0.50 % | $16.15 | 397 | 1 / 1 / 20 | 385 | 15.08 | 43.32 | $0.91 | 0.03 | 0.06 | $3.08 | 5.84 |
| 21:00 | $23.75 | $23.15 | 2.58 % | $16.62 | 288 | 2 / 1 / 21 | 266 | 63.74 | 55.75 | $0.67 | 0.42 | 0.01 | $3.75 | 6.79 |
| 22:00 | $24.01 | $23.22 | 2.28 % | $16.80 | 220 | 0 / 0 / 21 | 174 | 2.82 | 3.12 | $0.26 | 1.42 | 0.37 | $4.01 | 6.08 |
| 23:00 | $24.19 | $23.69 | 0.28 % | $16.93 | 255 | 1 / 0 / 22 | 170 | 2.28 | 1.88 | $0.18 | 2.42 | 0.41 | $4.19 | 5.49 |
| 00:00 | $24.56 | $23.37 | 1.93 % | $17.19 | 402 | 2 / 3 / 21 | 317 | 5.13 | 3.34 | $0.37 | 0.80 | 0.06 | $4.56 | 5.46 |
| 01:00 | $24.78 | $21.95 | 7.90 % | $17.35 | 312 | 1 / 0 / 22 | 252 | 2.82 | 2.28 | $0.22 | 1.80 | 0.15 | $4.78 | 5.18 |
| 02:00 | $25.14 | $22.56 | 5.35 % | $17.65 | 817 | 1 / 0 / 23 | 579 | 1.74 | 2.02 | $0.35 | 2.80 | 0.62 | $5.14 | 4.17 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 303 | 26 | 1.71 | 0.70 | 44.88 % | $0.13 | 5.00 | 0.83 | 0.56 % | 6 / 12 |
| Trailing | 435 | 31 | 2.16 | 1.75 | 68.05 % | $0.30 | 1.75 | 0.65 | 0.96 % | 10 / 12 |
| Signal · Normal | 1360 | 29 | 3.11 | 3.66 | 85.66 % | $2.06 | 0.50 | 0.13 | 1.17 % | 10 / 11 |
| Signal · Trailing | 1479 | 26 | 14.05 | 29.01 | 88.64 % | $2.64 | 1.50 | 0.03 | 0.39 % | 12 / 12 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Plain | 303 | 26 | 1.71 | 0.70 | 44.88 % | $0.13 | 5.00 | 0.83 | 0.56 % | 6 / 12 |
| Trailing · Plain | 435 | 31 | 2.16 | 1.75 | 68.05 % | $0.30 | 1.75 | 0.65 | 0.96 % | 10 / 12 |
| Signal · Normal · Plain | 1360 | 29 | 3.11 | 3.66 | 85.66 % | $2.06 | 0.50 | 0.13 | 1.17 % | 10 / 11 |
| Signal · Trailing · Plain | 1479 | 26 | 14.05 | 29.01 | 88.64 % | $2.64 | 1.50 | 0.03 | 0.39 % | 12 / 12 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| signal:s2-stoch-swing | 87 | 7 | 15.22 | 8.48 | 87.36 % | $0.65 | 1.50 | 0.05 | 0.16 % | 8 / 8 |
| signal:kama | 83 | 5 | 18.74 | 6.83 | 80.72 % | $0.45 | 2.75 | 0.03 | 0.07 % | 5 / 8 |
| signal:ichimoku | 55 | 5 | 3639.48 | 37.87 | 96.36 % | $0.36 | 0.25 | 0.00 | 0.00 % | 5 / 5 |
| signal:s2-bb-bounce | 29 | 3 | 2284.20 | 109.60 | 82.76 % | $0.30 | 1.75 | 0.00 | 0.00 % | 4 / 6 |
| signal:r-awesome | 121 | 8 | 9.67 | 3.35 | 82.64 % | $0.29 | 2.00 | 0.09 | 0.13 % | 8 / 9 |
| osc | 140 | 8 | 6.84 | 2.68 | 70.71 % | $0.23 | 2.50 | 0.11 | 0.12 % | 7 / 10 |
| signal:heikin-ashi | 153 | 15 | 2.87 | 4.19 | 81.70 % | $0.22 | 4.25 | 0.35 | 0.40 % | 7 / 10 |
| trend | 169 | 10 | 8.34 | 4.77 | 78.70 % | $0.21 | 1.75 | 0.09 | 0.09 % | 9 / 10 |
| signal:macd-cross | 48 | 5 | 73.62 | 4.25 | 89.58 % | $0.19 | 0.50 | 0.01 | 0.01 % | 7 / 7 |
| signal:stoch-rsi | 148 | 10 | 7.26 | 8.36 | 92.57 % | $0.18 | 4.50 | 0.13 | 0.11 % | 6 / 9 |
| signal:s2-block-scale | 147 | 8 | 2.11 | 4.18 | 85.03 % | $0.17 | 2.75 | 0.68 | 0.57 % | 6 / 9 |
| signal:atr-break | 25 | 3 | 34.92 | 6.19 | 84.00 % | $0.15 | 5.00 | 0.03 | 0.02 % | 2 / 4 |
| signal:r-nr-break | 94 | 8 | 22.64 | 7.44 | 87.23 % | $0.14 | 2.50 | 0.04 | 0.03 % | 6 / 9 |
| signal:r-linreg | 98 | 7 | 19.47 | 5.31 | 88.78 % | $0.14 | 2.25 | 0.03 | 0.02 % | 6 / 7 |
| signal:s2-adx-gate | 44 | 3 | 534.13 | 404.81 | 95.45 % | $0.14 | 1.00 | 0.00 | 0.00 % | 8 / 8 |
| signal:impulse | 113 | 5 | 22.99 | 11.91 | 84.96 % | $0.13 | 1.25 | 0.03 | 0.02 % | 7 / 9 |
| signal:s2-range-break | 60 | 2 | 77.76 | 68.22 | 91.67 % | $0.13 | 2.50 | 0.01 | 0.01 % | 6 / 6 |
| signal:cmf | 137 | 9 | 48.35 | 12.07 | 93.43 % | $0.13 | 1.50 | 0.02 | 0.01 % | 9 / 10 |
| signal:thrust | 73 | 6 | 73.99 | 107.87 | 94.52 % | $0.12 | 2.00 | 0.01 | 0.01 % | 7 / 7 |
| signal:adx | 49 | 3 | 110.86 | 234.18 | 95.92 % | $0.12 | 2.25 | 0.01 | 0.00 % | 6 / 7 |
| ema | 39 | 1 | 246.62 | 271.18 | 94.87 % | $0.11 | 0.25 | 0.00 | 0.00 % | 4 / 4 |
| signal:ema-cross | 34 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.09 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:hma | 42 | 4 | 1179.18 | 36.60 | 95.24 % | $0.09 | 1.25 | 0.00 | 0.00 % | 6 / 6 |
| signal:trix | 20 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.08 | 0.00 | 0.00 | 0.00 % | 5 / 5 |
| signal:ema-slope | 14 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.08 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:act-hf | 103 | 8 | 8.05 | 17.61 | 92.23 % | $0.08 | 1.50 | 0.08 | 0.03 % | 4 / 8 |
| signal:s2-range-shift | 32 | 5 | 2.47 | 3.74 | 81.25 % | $0.06 | 6.00 | 0.62 | 0.18 % | 6 / 7 |
| signal:obv | 56 | 8 | 6.10 | 1.98 | 80.36 % | $0.05 | 2.50 | 0.13 | 0.04 % | 4 / 7 |
| signal:r-vol-regime | 10 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.05 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:s2-confluence | 49 | 3 | 265.25 | 365.38 | 95.92 % | $0.04 | 3.00 | 0.00 | 0.00 % | 4 / 5 |
| signal:rsi-mid | 38 | 5 | 15.57 | 5.65 | 86.84 % | $0.04 | 0.75 | 0.04 | 0.01 % | 4 / 5 |
| signal:macd-slow | 87 | 5 | 1.41 | 9.37 | 91.95 % | $0.04 | 1.00 | 2.09 | 0.44 % | 6 / 8 |
| signal:swing | 96 | 7 | 14.97 | 21.71 | 91.67 % | $0.04 | 0.25 | 0.07 | 0.01 % | 7 / 7 |
| signal:rsi-reversal | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:s2-st-trail | 26 | 1 | 230.64 | 229.89 | 92.31 % | $0.03 | 4.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:zscore | 17 | 2 | 462.18 | 123.75 | 94.12 % | $0.03 | 0.50 | 0.00 | 0.00 % | 4 / 4 |
| signal:donchian | 13 | 4 | 35.07 | 11.98 | 84.62 % | $0.02 | 6.50 | 0.03 | 0.00 % | 2 / 4 |
| signal:vwap | 36 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.02 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:s2-active-hf | 5 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.02 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:sar | 16 | 5 | 4.00 | 1.03 | 50.00 % | $0.02 | 4.75 | 0.26 | 0.02 % | 2 / 4 |
| signal:ema-cross-fast | 34 | 3 | 819.81 | 468.35 | 94.12 % | $0.01 | 0.75 | 0.00 | 0.00 % | 5 / 5 |
| direction | 92 | 7 | 1.97 | 0.24 | 28.26 % | $0.01 | 2.50 | 0.53 | 0.03 % | 7 / 8 |
| signal:bollinger | 10 | 2 | 9.27 | 6.00 | 90.00 % | $0.01 | 2.75 | 0.12 | 0.01 % | 1 / 1 |
| channel | 9 | 3 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 4 / 4 |
| signal:r-fractal | 12 | 2 | 34.92 | 54.62 | 83.33 % | $0.01 | 6.25 | 0.03 | 0.00 % | 3 / 4 |
| signal:cci | 61 | 8 | 1.15 | 10.47 | 91.80 % | $0.00 | 11.00 | 6.81 | 0.10 % | 4 / 6 |
| signal:r-inside | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:r-connors | 10 | 2 | 413.17 | 347.89 | 90.00 % | $0.00 | 1.00 | 0.00 | 0.00 % | 4 / 4 |
| ichimoku | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:squeeze | 4 | 1 | 62.37 | 63.57 | 75.00 % | $0.00 | 3.50 | 0.02 | 0.00 % | 1 / 1 |
| signal:keltner | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:r-session-trend | 7 | 2 | 1.01 | 0.26 | 57.14 % | $0.00 | 10.50 | 88.26 | 0.05 % | 1 / 3 |
| macd | 1 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 8.00 | – | 0.00 % | 0 / 1 |
| signal:s2-atr-break | 61 | 6 | 0.99 | 1.58 | 77.05 % | -$0.00 | 3.25 | – | 0.19 % | 3 / 6 |
| signal:ema-trend | 30 | 3 | 0.68 | 1.25 | 63.33 % | -$0.00 | 5.00 | – | 0.01 % | 1 / 4 |
| signal:macd-hist | 63 | 6 | 0.95 | 2.22 | 77.78 % | -$0.00 | 3.00 | – | 0.20 % | 2 / 7 |
| smooth | 11 | 4 | 0.07 | 0.22 | 18.18 % | -$0.00 | 7.00 | – | 0.02 % | 1 / 3 |
| rsi | 15 | 2 | 0.00 | 0.01 | 6.67 % | -$0.00 | 8.00 | – | 0.02 % | 1 / 3 |
| signal:ema-pullback | 48 | 9 | 0.79 | 0.70 | 58.33 % | -$0.01 | 7.50 | – | 0.17 % | 3 / 5 |
| signal:s2-block-stack | 32 | 3 | 0.55 | 9.94 | 90.63 % | -$0.02 | 11.00 | – | 0.19 % | 2 / 3 |
| active | 46 | 15 | 0.53 | 4.19 | 86.96 % | -$0.02 | 11.83 | – | 0.19 % | 9 / 10 |
| move | 66 | 8 | 0.88 | 1.77 | 62.12 % | -$0.02 | 12.00 | – | 0.81 % | 6 / 7 |
| break | 58 | 13 | 0.44 | 1.70 | 68.97 % | -$0.05 | 12.00 | – | 0.31 % | 3 / 8 |
| volume | 89 | 2 | 0.01 | 0.01 | 1.12 % | -$0.05 | 8.00 | – | 0.27 % | 1 / 4 |
| signal:reclaim | 95 | 5 | 0.32 | 2.21 | 80.00 % | -$0.06 | 5.50 | – | 0.44 % | 4 / 5 |
| signal:williams-r | 101 | 6 | 0.54 | 6.99 | 87.13 % | -$0.07 | 0.50 | – | 0.76 % | 4 / 5 |
| signal:act-burst | 6 | 1 | 0.00 | 0.00 | 16.67 % | -$0.11 | 8.25 | – | 0.54 % | 1 / 3 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| s2-stoch-swing | 87 | 7 | 15.22 | 8.48 | 87.36 % | $0.65 | 1.50 | 0.05 | 0.16 % | 8 / 8 |
| kama | 83 | 5 | 18.74 | 6.83 | 80.72 % | $0.45 | 2.75 | 0.03 | 0.07 % | 5 / 8 |
| ichimoku | 55 | 5 | 3639.48 | 37.87 | 96.36 % | $0.36 | 0.25 | 0.00 | 0.00 % | 5 / 5 |
| s2-bb-bounce | 29 | 3 | 2284.20 | 109.60 | 82.76 % | $0.30 | 1.75 | 0.00 | 0.00 % | 4 / 6 |
| r-awesome | 121 | 8 | 9.67 | 3.35 | 82.64 % | $0.29 | 2.00 | 0.09 | 0.13 % | 8 / 9 |
| heikin-ashi | 153 | 15 | 2.87 | 4.19 | 81.70 % | $0.22 | 4.25 | 0.35 | 0.40 % | 7 / 10 |
| macd-cross | 48 | 5 | 73.62 | 4.25 | 89.58 % | $0.19 | 0.50 | 0.01 | 0.01 % | 7 / 7 |
| stoch-rsi | 148 | 10 | 7.26 | 8.36 | 92.57 % | $0.18 | 4.50 | 0.13 | 0.11 % | 6 / 9 |
| s2-block-scale | 147 | 8 | 2.11 | 4.18 | 85.03 % | $0.17 | 2.75 | 0.68 | 0.57 % | 6 / 9 |
| atr-break | 25 | 3 | 34.92 | 6.19 | 84.00 % | $0.15 | 5.00 | 0.03 | 0.02 % | 2 / 4 |
| r-nr-break | 94 | 8 | 22.64 | 7.44 | 87.23 % | $0.14 | 2.50 | 0.04 | 0.03 % | 6 / 9 |
| r-linreg | 98 | 7 | 19.47 | 5.31 | 88.78 % | $0.14 | 2.25 | 0.03 | 0.02 % | 6 / 7 |
| s2-adx-gate | 44 | 3 | 534.13 | 404.81 | 95.45 % | $0.14 | 1.00 | 0.00 | 0.00 % | 8 / 8 |
| impulse | 113 | 5 | 22.99 | 11.91 | 84.96 % | $0.13 | 1.25 | 0.03 | 0.02 % | 7 / 9 |
| s2-range-break | 60 | 2 | 77.76 | 68.22 | 91.67 % | $0.13 | 2.50 | 0.01 | 0.01 % | 6 / 6 |
| cmf | 137 | 9 | 48.35 | 12.07 | 93.43 % | $0.13 | 1.50 | 0.02 | 0.01 % | 9 / 10 |
| thrust | 73 | 6 | 73.99 | 107.87 | 94.52 % | $0.12 | 2.00 | 0.01 | 0.01 % | 7 / 7 |
| adx | 49 | 3 | 110.86 | 234.18 | 95.92 % | $0.12 | 2.25 | 0.01 | 0.00 % | 6 / 7 |
| ema-cross | 34 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.09 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| hma | 42 | 4 | 1179.18 | 36.60 | 95.24 % | $0.09 | 1.25 | 0.00 | 0.00 % | 6 / 6 |
| trix | 20 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.08 | 0.00 | 0.00 | 0.00 % | 5 / 5 |
| ema-slope | 14 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.08 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| act-hf | 103 | 8 | 8.05 | 17.61 | 92.23 % | $0.08 | 1.50 | 0.08 | 0.03 % | 4 / 8 |
| s2-range-shift | 32 | 5 | 2.47 | 3.74 | 81.25 % | $0.06 | 6.00 | 0.62 | 0.18 % | 6 / 7 |
| obv | 56 | 8 | 6.10 | 1.98 | 80.36 % | $0.05 | 2.50 | 0.13 | 0.04 % | 4 / 7 |
| r-vol-regime | 10 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.05 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-confluence | 49 | 3 | 265.25 | 365.38 | 95.92 % | $0.04 | 3.00 | 0.00 | 0.00 % | 4 / 5 |
| rsi-mid | 38 | 5 | 15.57 | 5.65 | 86.84 % | $0.04 | 0.75 | 0.04 | 0.01 % | 4 / 5 |
| macd-slow | 87 | 5 | 1.41 | 9.37 | 91.95 % | $0.04 | 1.00 | 2.09 | 0.44 % | 6 / 8 |
| swing | 96 | 7 | 14.97 | 21.71 | 91.67 % | $0.04 | 0.25 | 0.07 | 0.01 % | 7 / 7 |
| rsi-reversal | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| s2-st-trail | 26 | 1 | 230.64 | 229.89 | 92.31 % | $0.03 | 4.00 | 0.00 | 0.00 % | 3 / 3 |
| zscore | 17 | 2 | 462.18 | 123.75 | 94.12 % | $0.03 | 0.50 | 0.00 | 0.00 % | 4 / 4 |
| donchian | 13 | 4 | 35.07 | 11.98 | 84.62 % | $0.02 | 6.50 | 0.03 | 0.00 % | 2 / 4 |
| vwap | 36 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.02 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| s2-active-hf | 5 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.02 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| sar | 16 | 5 | 4.00 | 1.03 | 50.00 % | $0.02 | 4.75 | 0.26 | 0.02 % | 2 / 4 |
| ema-cross-fast | 34 | 3 | 819.81 | 468.35 | 94.12 % | $0.01 | 0.75 | 0.00 | 0.00 % | 5 / 5 |
| bollinger | 10 | 2 | 9.27 | 6.00 | 90.00 % | $0.01 | 2.75 | 0.12 | 0.01 % | 1 / 1 |
| r-fractal | 12 | 2 | 34.92 | 54.62 | 83.33 % | $0.01 | 6.25 | 0.03 | 0.00 % | 3 / 4 |
| cci | 61 | 8 | 1.15 | 10.47 | 91.80 % | $0.00 | 11.00 | 6.81 | 0.10 % | 4 / 6 |
| r-inside | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| r-connors | 10 | 2 | 413.17 | 347.89 | 90.00 % | $0.00 | 1.00 | 0.00 | 0.00 % | 4 / 4 |
| squeeze | 4 | 1 | 62.37 | 63.57 | 75.00 % | $0.00 | 3.50 | 0.02 | 0.00 % | 1 / 1 |
| keltner | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| r-session-trend | 7 | 2 | 1.01 | 0.26 | 57.14 % | $0.00 | 10.50 | 88.26 | 0.05 % | 1 / 3 |
| s2-atr-break | 61 | 6 | 0.99 | 1.58 | 77.05 % | -$0.00 | 3.25 | – | 0.19 % | 3 / 6 |
| ema-trend | 30 | 3 | 0.68 | 1.25 | 63.33 % | -$0.00 | 5.00 | – | 0.01 % | 1 / 4 |
| macd-hist | 63 | 6 | 0.95 | 2.22 | 77.78 % | -$0.00 | 3.00 | – | 0.20 % | 2 / 7 |
| ema-pullback | 48 | 9 | 0.79 | 0.70 | 58.33 % | -$0.01 | 7.50 | – | 0.17 % | 3 / 5 |
| s2-block-stack | 32 | 3 | 0.55 | 9.94 | 90.63 % | -$0.02 | 11.00 | – | 0.19 % | 2 / 3 |
| reclaim | 95 | 5 | 0.32 | 2.21 | 80.00 % | -$0.06 | 5.50 | – | 0.44 % | 4 / 5 |
| williams-r | 101 | 6 | 0.54 | 6.99 | 87.13 % | -$0.07 | 0.50 | – | 0.76 % | 4 / 5 |
| act-burst | 6 | 1 | 0.00 | 0.00 | 16.67 % | -$0.11 | 8.25 | – | 0.54 % | 1 / 3 |

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
