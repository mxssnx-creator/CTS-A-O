# 12 h simulated session — 20 symbols, 24 h pre-historic + 12 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-04 15:00 → 2026-10-05 15:00 UTC, run 2026-10-05 15:00 → 2026-10-06 03:00 UTC. Symbols: BCH-USDT, SOL-USDT, BR-USDT, XRP-USDT, ORCA-USDT, ZRO-USDT, DIA-USDT, PARTI-USDT, LYN-USDT, AIN-USDT, QNT-USDT, NIL-USDT, API3-USDT, HAJIMI-USDT, NIGHT-USDT, SAND-USDT, PUMP-USDT, GRIFFAIN-USDT, HUMA-USDT, STABLE-USDT.

Settings (desk, docs/sims/micro-2026-10-08/desks/MB.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / axis, ranges micro / short / general / long (micro on), caps: positions none, signal positions none, coordination on, signals validated on their last 0. Block overall, 8 levels, Active from 5, ratio 0.5, max 4× per source, the stack up to 8×. Balance $20.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/MB-w-rally/html/index.html](runs/MB-w-rally/html/index.html) · numbers: `runs/MB-w-rally/html/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $20.00 → $26.46 | $23.70 | $6.46 (32.32 %) | 4.24 | 3.77 | 1.50 | 0.05 | $2.02 (8.75 %) | 3927 | 37 | 81.31 % | 12 / 12 | $18.59 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 23 positions / 4082 orders, MTM -$2.77 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 56 orders capped to $0, 3578 scaled down (open at end: 99 capped, 3908 scaled) · binding: position cap 6250, gross cap 7080. **Without the caps:** balance $20.00 → $60.84 (204.20 %) · PF $ 3.42 · equity at end $16.45 · equity max drawdown $48.47 (109.18 %) · margin used max $397.08 · infeasible: margin exceeded equity for 661 min.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.40 (no compounding) the same orders net $26.63 (133.17 %), closed-order max drawdown $1.37.

Engine: Base 1122/25098 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 286/19072 · PF 1.68 · Micro 65/5900 · PF 2.47 · Short 470/8176 · PF 1.65 · General 470/8176 · PF 1.55 · Long 614/8176 · PF 1.49 · Signals 126/126), Main 1057 pairs, 158467 tapes, Real seats: 6554 engine configs + 3750 signal configs (every config of the active signals), compute 205 s, peak RSS 4682 MB. Consistency checks: 54 of 55 pass.

## Findings

- **Strategy types positive:** Signal · Trailing $3.22 (PF 11.15, 1473 orders) · Signal · Normal $2.41 (PF 2.88, 1390 orders) · Trailing $0.55 (PF 3.56, 644 orders) · Normal $0.27 (PF 2.51, 420 orders).
- **Strategy types losing:** none.
- **Engine vs signals:** Engine $0.83 (PF 3.08, 1064 orders) · Signals $5.64 (PF 4.52, 2863 orders).
- **Indication kinds positive:** osc $0.51 (PF 12.75, 150 orders) · signal:bollinger $0.49 (PF 308.90, 39 orders) · signal:s2-stoch-swing $0.47 (PF 8.31, 65 orders) · signal:s2-vol-break $0.32 (PF 27.51, 27 orders) · signal:kama $0.29 (PF 12.56, 83 orders) · signal:s2-block-scale $0.29 (PF 2.79, 174 orders).
- **Indication kinds losing:** signal:act-burst -$0.11 (PF 0.00, 6 orders) · move -$0.07 (PF 0.22, 13 orders) · signal:williams-r -$0.07 (PF 0.55, 72 orders) · volume -$0.06 (PF 0.02, 93 orders) · active -$0.04 (PF 0.22, 39 orders) · signal:s2-atr-break -$0.01 (PF 0.83, 44 orders).
- **Signal sources positive:** bollinger $0.49 (PF 308.90, 39 orders) · s2-stoch-swing $0.47 (PF 8.31, 65 orders) · s2-vol-break $0.32 (PF 27.51, 27 orders) · kama $0.29 (PF 12.56, 83 orders) · s2-block-scale $0.29 (PF 2.79, 174 orders) · r-awesome $0.23 (PF 5.01, 115 orders) · s2-block-stack $0.23 (PF 4141.36, 50 orders) · ichimoku $0.21 (PF 1112.14, 55 orders).
- **Signal sources losing:** act-burst -$0.11 (PF 0.00, 6 orders) · williams-r -$0.07 (PF 0.55, 72 orders) · s2-atr-break -$0.01 (PF 0.83, 44 orders) · ema-pullback -$0.01 (PF 0.90, 42 orders).
- **Symbols:** best ORCA-USDT $1.20 (PF 14.99, 711 orders) · NIGHT-USDT $0.79 (PF 73.15, 517 orders) · DIA-USDT $0.64 (PF 11.46, 289 orders); worst HAJIMI-USDT -$0.11 (PF 0.09, 118 orders) · NIL-USDT -$0.08 (PF 0.77, 240 orders) · HUMA-USDT -$0.03 (PF 0.89, 113 orders).
- **Block volume:** ×1 $6.46 (unit PF 3.77, 3927).
- **Lanes:** 5m -$0.03 (PF 0.28, 24) · 5m+ -$0.02 (PF 0.11, 15) · 15m $6.27 (PF 4.58, 3237) · 15m+ $0.18 (PF 11.23, 351) · 30m $0.06 (PF 1.33, 300); **ranges:** Micro -$0.04 (PF 0.22, 39) · Short $0.57 (PF 3.38, 711) · General $0.28 (PF 4.13, 251) · Long $0.02 (PF 2.68, 63) · Signals $5.64 (PF 4.52, 2863); **sides:** Long $6.04 (PF 4.20, 3846) · Short $0.42 (PF 4.83, 81).
- **Hours:** 12 green / 0 red / 0 flat of 12 full hours; first order opened 15:00 UTC; best hour 20:00 $1.16, worst hour 22:00 $0.06.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | $20.92 | $20.97 | 7.61 % | $12.59 | 159 | 17 / 3 / 14 | 133 | 4.51 | 5.72 | $0.92 | 0.53 | 0.14 | $0.92 | 4.51 |
| 16:00 | $21.47 | $21.26 | 6.34 % | $15.03 | 159 | 6 / 4 / 16 | 133 | 4.30 | 4.05 | $0.55 | 1.53 | 0.26 | $1.47 | 4.43 |
| 17:00 | $21.60 | $21.81 | 3.91 % | $15.12 | 173 | 1 / 0 / 17 | 140 | 54.64 | 19.99 | $0.14 | 2.53 | 0.00 | $1.60 | 4.72 |
| 18:00 | $22.53 | $22.17 | 3.53 % | $15.77 | 406 | 3 / 0 / 20 | 376 | 29.29 | 19.78 | $0.93 | 0.27 | 0.02 | $2.53 | 6.47 |
| 19:00 | $22.96 | $22.37 | 2.68 % | $16.08 | 326 | 3 / 2 / 21 | 282 | 6.15 | 7.46 | $0.43 | 1.27 | 0.08 | $2.96 | 6.42 |
| 20:00 | $24.13 | $24.00 | 0.45 % | $16.89 | 410 | 1 / 1 / 21 | 396 | 17.72 | 29.01 | $1.16 | 0.03 | 0.03 | $4.13 | 7.70 |
| 21:00 | $24.94 | $24.03 | 2.82 % | $17.46 | 282 | 1 / 1 / 21 | 259 | 27.15 | 25.99 | $0.81 | 0.42 | 0.02 | $4.94 | 8.63 |
| 22:00 | $25.00 | $24.01 | 2.89 % | $17.50 | 241 | 1 / 0 / 22 | 171 | 1.16 | 1.43 | $0.06 | 1.42 | 5.48 | $5.00 | 5.92 |
| 23:00 | $25.46 | $24.65 | 0.31 % | $17.82 | 299 | 1 / 1 / 22 | 205 | 3.90 | 2.12 | $0.46 | 2.42 | 0.16 | $5.46 | 5.65 |
| 00:00 | $25.89 | $24.58 | 1.00 % | $18.12 | 467 | 2 / 2 / 22 | 371 | 3.50 | 3.46 | $0.43 | 0.80 | 0.13 | $5.89 | 5.37 |
| 01:00 | $26.19 | $23.17 | 6.66 % | $18.35 | 392 | 1 / 0 / 23 | 314 | 3.15 | 2.62 | $0.29 | 1.80 | 0.12 | $6.19 | 5.17 |
| 02:00 | $26.46 | $23.70 | 4.54 % | $18.59 | 613 | 0 / 0 / 23 | 413 | 1.54 | 1.71 | $0.28 | 2.80 | 0.70 | $6.46 | 4.24 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 420 | 28 | 2.51 | 1.63 | 65.95 % | $0.27 | 2.75 | 0.30 | 0.40 % | 8 / 12 |
| Trailing | 644 | 32 | 3.56 | 2.93 | 76.86 % | $0.55 | 1.75 | 0.18 | 0.49 % | 11 / 12 |
| Signal · Normal | 1390 | 30 | 2.88 | 2.90 | 83.24 % | $2.41 | 2.50 | 0.11 | 1.15 % | 10 / 12 |
| Signal · Trailing | 1473 | 25 | 11.15 | 13.20 | 85.81 % | $3.22 | 1.25 | 0.03 | 0.36 % | 12 / 12 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Plain | 420 | 28 | 2.51 | 1.63 | 65.95 % | $0.27 | 2.75 | 0.30 | 0.40 % | 8 / 12 |
| Trailing · Plain | 644 | 32 | 3.56 | 2.93 | 76.86 % | $0.55 | 1.75 | 0.18 | 0.49 % | 11 / 12 |
| Signal · Normal · Plain | 1390 | 30 | 2.88 | 2.90 | 83.24 % | $2.41 | 2.50 | 0.11 | 1.15 % | 10 / 12 |
| Signal · Trailing · Plain | 1473 | 25 | 11.15 | 13.20 | 85.81 % | $3.22 | 1.25 | 0.03 | 0.36 % | 12 / 12 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| osc | 150 | 8 | 12.75 | 3.88 | 80.00 % | $0.51 | 2.50 | 0.05 | 0.12 % | 8 / 10 |
| signal:bollinger | 39 | 3 | 308.90 | 34.80 | 97.44 % | $0.49 | 2.25 | 0.00 | 0.01 % | 4 / 4 |
| signal:s2-stoch-swing | 65 | 6 | 8.31 | 6.13 | 84.62 % | $0.47 | 1.50 | 0.10 | 0.23 % | 5 / 6 |
| signal:s2-vol-break | 27 | 1 | 27.51 | 27.51 | 74.07 % | $0.32 | 4.50 | 0.04 | 0.06 % | 4 / 5 |
| signal:kama | 83 | 5 | 12.56 | 6.83 | 80.72 % | $0.29 | 2.75 | 0.05 | 0.07 % | 5 / 8 |
| signal:s2-block-scale | 174 | 7 | 2.79 | 5.69 | 88.51 % | $0.29 | 1.25 | 0.29 | 0.41 % | 7 / 8 |
| trend | 278 | 11 | 7.81 | 8.70 | 85.61 % | $0.29 | 2.50 | 0.06 | 0.09 % | 9 / 11 |
| signal:r-awesome | 115 | 7 | 5.01 | 2.17 | 79.13 % | $0.23 | 3.50 | 0.22 | 0.25 % | 8 / 9 |
| signal:s2-block-stack | 50 | 3 | 4141.36 | 410.40 | 96.00 % | $0.23 | 5.50 | 0.00 | 0.00 % | 6 / 6 |
| signal:ichimoku | 55 | 5 | 1112.14 | 37.87 | 96.36 % | $0.21 | 0.25 | 0.00 | 0.00 % | 5 / 5 |
| signal:ema-slope | 14 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.21 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:s2-confluence | 72 | 4 | 3.07 | 8.02 | 86.11 % | $0.20 | 8.25 | 0.35 | 0.36 % | 5 / 8 |
| signal:stoch-rsi | 144 | 9 | 11.70 | 8.31 | 92.36 % | $0.20 | 4.25 | 0.06 | 0.06 % | 5 / 8 |
| signal:macd-cross | 48 | 5 | 54.13 | 4.25 | 89.58 % | $0.20 | 0.50 | 0.02 | 0.02 % | 7 / 7 |
| signal:cmf | 167 | 10 | 44.03 | 12.62 | 92.81 % | $0.20 | 1.50 | 0.01 | 0.01 % | 9 / 10 |
| signal:thrust | 86 | 7 | 114.65 | 121.14 | 95.35 % | $0.17 | 2.00 | 0.01 | 0.00 % | 10 / 10 |
| signal:r-nr-break | 105 | 8 | 24.34 | 6.57 | 84.76 % | $0.17 | 2.00 | 0.03 | 0.03 % | 7 / 9 |
| signal:macd-slow | 87 | 5 | 2.55 | 9.37 | 91.95 % | $0.16 | 0.75 | 0.55 | 0.44 % | 6 / 8 |
| signal:s2-range-break | 60 | 2 | 82.53 | 68.22 | 91.67 % | $0.15 | 2.50 | 0.01 | 0.01 % | 6 / 6 |
| signal:atr-break | 18 | 2 | 30.90 | 5.42 | 83.33 % | $0.14 | 11.50 | 0.03 | 0.02 % | 1 / 2 |
| signal:impulse | 95 | 5 | 39.04 | 17.18 | 86.32 % | $0.13 | 1.25 | 0.02 | 0.01 % | 8 / 9 |
| signal:r-linreg | 89 | 6 | 15.11 | 4.82 | 87.64 % | $0.13 | 2.75 | 0.06 | 0.04 % | 6 / 7 |
| signal:adx | 49 | 3 | 124.32 | 234.18 | 95.92 % | $0.13 | 2.25 | 0.01 | 0.00 % | 6 / 7 |
| signal:trix | 43 | 2 | 25.10 | 4.96 | 86.05 % | $0.12 | 2.75 | 0.03 | 0.02 % | 7 / 8 |
| signal:r-session-trend | 14 | 2 | 9.12 | 1.99 | 78.57 % | $0.10 | 10.75 | 0.12 | 0.06 % | 2 / 4 |
| signal:heikin-ashi | 204 | 16 | 1.31 | 1.17 | 64.71 % | $0.10 | 5.50 | 1.04 | 0.49 % | 5 / 10 |
| direction | 191 | 9 | 5.66 | 1.40 | 68.59 % | $0.09 | 2.75 | 0.08 | 0.04 % | 8 / 10 |
| signal:s2-range-shift | 32 | 5 | 3.61 | 3.74 | 81.25 % | $0.08 | 3.00 | 0.34 | 0.13 % | 6 / 7 |
| signal:s2-adx-gate | 19 | 3 | 443.61 | 142.84 | 94.74 % | $0.07 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| signal:s2-bb-bounce | 29 | 3 | 332.67 | 109.60 | 82.76 % | $0.07 | 1.75 | 0.00 | 0.00 % | 4 / 6 |
| macd | 82 | 3 | 99.97 | 74.04 | 98.78 % | $0.06 | 5.50 | 0.01 | 0.00 % | 5 / 5 |
| signal:act-hf | 73 | 7 | 5.73 | 14.06 | 89.04 % | $0.05 | 2.75 | 0.17 | 0.05 % | 5 / 8 |
| signal:s2-st-trail | 26 | 1 | 230.30 | 229.89 | 92.31 % | $0.05 | 4.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:vwap | 10 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.05 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:hma | 33 | 3 | 8838.00 | 2029.64 | 96.97 % | $0.04 | 1.75 | 0.00 | 0.00 % | 5 / 5 |
| signal:r-vol-regime | 10 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.04 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:swing | 69 | 5 | 615.14 | 27.71 | 94.20 % | $0.04 | 2.00 | 0.00 | 0.00 % | 6 / 7 |
| signal:ema-cross | 53 | 3 | 1.64 | 2.32 | 73.58 % | $0.04 | 6.00 | 0.97 | 0.18 % | 4 / 8 |
| signal:donchian | 13 | 4 | 33.65 | 11.98 | 84.62 % | $0.03 | 6.50 | 0.03 | 0.01 % | 2 / 4 |
| ema | 116 | 4 | 26.21 | 23.91 | 79.31 % | $0.03 | 5.25 | 0.02 | 0.00 % | 5 / 7 |
| signal:rsi-reversal | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:rsi-mid | 31 | 4 | 12.15 | 5.31 | 87.10 % | $0.03 | 0.75 | 0.08 | 0.01 % | 2 / 3 |
| signal:macd-hist | 63 | 6 | 1.70 | 2.22 | 77.78 % | $0.03 | 3.00 | 1.38 | 0.18 % | 4 / 7 |
| signal:obv | 58 | 8 | 1.30 | 1.24 | 75.86 % | $0.02 | 5.75 | 2.90 | 0.33 % | 4 / 8 |
| signal:zscore | 17 | 2 | 257.55 | 123.75 | 94.12 % | $0.02 | 0.50 | 0.00 | 0.00 % | 4 / 4 |
| signal:ema-cross-fast | 45 | 4 | 1.93 | 6.42 | 88.89 % | $0.02 | 6.00 | 0.87 | 0.08 % | 7 / 9 |
| signal:s2-active-hf | 5 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.02 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:reclaim | 95 | 5 | 1.24 | 2.21 | 80.00 % | $0.01 | 5.50 | 3.82 | 0.26 % | 4 / 5 |
| signal:r-fractal | 12 | 2 | 33.80 | 54.62 | 83.33 % | $0.01 | 6.25 | 0.03 | 0.00 % | 3 / 4 |
| rsi | 26 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:cci | 36 | 7 | 328.58 | 6.33 | 91.67 % | $0.01 | 0.25 | 0.00 | 0.00 % | 5 / 5 |
| break | 51 | 9 | 1.13 | 1.65 | 66.67 % | $0.01 | 7.25 | 5.45 | 0.23 % | 4 / 8 |
| signal:ema-trend | 30 | 3 | 3.26 | 1.25 | 63.33 % | $0.01 | 4.75 | 0.26 | 0.01 % | 1 / 4 |
| smooth | 20 | 6 | 1.58 | 0.60 | 35.00 % | $0.01 | 3.75 | 1.21 | 0.04 % | 3 / 5 |
| signal:sar | 16 | 5 | 1.58 | 1.03 | 50.00 % | $0.01 | 5.00 | 1.50 | 0.04 % | 2 / 4 |
| channel | 4 | 3 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 4 / 4 |
| signal:r-inside | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:r-connors | 10 | 2 | 308.10 | 347.89 | 90.00 % | $0.00 | 1.00 | 0.00 | 0.00 % | 4 / 4 |
| signal:squeeze | 4 | 1 | 64.18 | 63.57 | 75.00 % | $0.00 | 3.50 | 0.02 | 0.00 % | 1 / 1 |
| signal:keltner | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| ichimoku | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:ema-pullback | 42 | 9 | 0.90 | 0.52 | 52.38 % | -$0.01 | 7.50 | – | 0.16 % | 3 / 5 |
| signal:s2-atr-break | 44 | 6 | 0.83 | 0.65 | 63.64 % | -$0.01 | 3.25 | – | 0.29 % | 3 / 6 |
| active | 39 | 13 | 0.22 | 0.77 | 76.92 % | -$0.04 | 11.83 | – | 0.28 % | 6 / 8 |
| volume | 93 | 2 | 0.02 | 0.03 | 2.15 % | -$0.06 | 8.00 | – | 0.33 % | 1 / 4 |
| signal:williams-r | 72 | 6 | 0.55 | 4.87 | 81.94 % | -$0.07 | 0.50 | – | 0.78 % | 1 / 2 |
| move | 13 | 4 | 0.22 | 0.43 | 46.15 % | -$0.07 | 12.00 | – | 0.46 % | 3 / 4 |
| signal:act-burst | 6 | 1 | 0.00 | 0.00 | 16.67 % | -$0.11 | 8.25 | – | 0.55 % | 1 / 3 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| bollinger | 39 | 3 | 308.90 | 34.80 | 97.44 % | $0.49 | 2.25 | 0.00 | 0.01 % | 4 / 4 |
| s2-stoch-swing | 65 | 6 | 8.31 | 6.13 | 84.62 % | $0.47 | 1.50 | 0.10 | 0.23 % | 5 / 6 |
| s2-vol-break | 27 | 1 | 27.51 | 27.51 | 74.07 % | $0.32 | 4.50 | 0.04 | 0.06 % | 4 / 5 |
| kama | 83 | 5 | 12.56 | 6.83 | 80.72 % | $0.29 | 2.75 | 0.05 | 0.07 % | 5 / 8 |
| s2-block-scale | 174 | 7 | 2.79 | 5.69 | 88.51 % | $0.29 | 1.25 | 0.29 | 0.41 % | 7 / 8 |
| r-awesome | 115 | 7 | 5.01 | 2.17 | 79.13 % | $0.23 | 3.50 | 0.22 | 0.25 % | 8 / 9 |
| s2-block-stack | 50 | 3 | 4141.36 | 410.40 | 96.00 % | $0.23 | 5.50 | 0.00 | 0.00 % | 6 / 6 |
| ichimoku | 55 | 5 | 1112.14 | 37.87 | 96.36 % | $0.21 | 0.25 | 0.00 | 0.00 % | 5 / 5 |
| ema-slope | 14 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.21 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| s2-confluence | 72 | 4 | 3.07 | 8.02 | 86.11 % | $0.20 | 8.25 | 0.35 | 0.36 % | 5 / 8 |
| stoch-rsi | 144 | 9 | 11.70 | 8.31 | 92.36 % | $0.20 | 4.25 | 0.06 | 0.06 % | 5 / 8 |
| macd-cross | 48 | 5 | 54.13 | 4.25 | 89.58 % | $0.20 | 0.50 | 0.02 | 0.02 % | 7 / 7 |
| cmf | 167 | 10 | 44.03 | 12.62 | 92.81 % | $0.20 | 1.50 | 0.01 | 0.01 % | 9 / 10 |
| thrust | 86 | 7 | 114.65 | 121.14 | 95.35 % | $0.17 | 2.00 | 0.01 | 0.00 % | 10 / 10 |
| r-nr-break | 105 | 8 | 24.34 | 6.57 | 84.76 % | $0.17 | 2.00 | 0.03 | 0.03 % | 7 / 9 |
| macd-slow | 87 | 5 | 2.55 | 9.37 | 91.95 % | $0.16 | 0.75 | 0.55 | 0.44 % | 6 / 8 |
| s2-range-break | 60 | 2 | 82.53 | 68.22 | 91.67 % | $0.15 | 2.50 | 0.01 | 0.01 % | 6 / 6 |
| atr-break | 18 | 2 | 30.90 | 5.42 | 83.33 % | $0.14 | 11.50 | 0.03 | 0.02 % | 1 / 2 |
| impulse | 95 | 5 | 39.04 | 17.18 | 86.32 % | $0.13 | 1.25 | 0.02 | 0.01 % | 8 / 9 |
| r-linreg | 89 | 6 | 15.11 | 4.82 | 87.64 % | $0.13 | 2.75 | 0.06 | 0.04 % | 6 / 7 |
| adx | 49 | 3 | 124.32 | 234.18 | 95.92 % | $0.13 | 2.25 | 0.01 | 0.00 % | 6 / 7 |
| trix | 43 | 2 | 25.10 | 4.96 | 86.05 % | $0.12 | 2.75 | 0.03 | 0.02 % | 7 / 8 |
| r-session-trend | 14 | 2 | 9.12 | 1.99 | 78.57 % | $0.10 | 10.75 | 0.12 | 0.06 % | 2 / 4 |
| heikin-ashi | 204 | 16 | 1.31 | 1.17 | 64.71 % | $0.10 | 5.50 | 1.04 | 0.49 % | 5 / 10 |
| s2-range-shift | 32 | 5 | 3.61 | 3.74 | 81.25 % | $0.08 | 3.00 | 0.34 | 0.13 % | 6 / 7 |
| s2-adx-gate | 19 | 3 | 443.61 | 142.84 | 94.74 % | $0.07 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| s2-bb-bounce | 29 | 3 | 332.67 | 109.60 | 82.76 % | $0.07 | 1.75 | 0.00 | 0.00 % | 4 / 6 |
| act-hf | 73 | 7 | 5.73 | 14.06 | 89.04 % | $0.05 | 2.75 | 0.17 | 0.05 % | 5 / 8 |
| s2-st-trail | 26 | 1 | 230.30 | 229.89 | 92.31 % | $0.05 | 4.00 | 0.00 | 0.00 % | 3 / 3 |
| vwap | 10 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.05 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| hma | 33 | 3 | 8838.00 | 2029.64 | 96.97 % | $0.04 | 1.75 | 0.00 | 0.00 % | 5 / 5 |
| r-vol-regime | 10 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.04 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| swing | 69 | 5 | 615.14 | 27.71 | 94.20 % | $0.04 | 2.00 | 0.00 | 0.00 % | 6 / 7 |
| ema-cross | 53 | 3 | 1.64 | 2.32 | 73.58 % | $0.04 | 6.00 | 0.97 | 0.18 % | 4 / 8 |
| donchian | 13 | 4 | 33.65 | 11.98 | 84.62 % | $0.03 | 6.50 | 0.03 | 0.01 % | 2 / 4 |
| rsi-reversal | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| rsi-mid | 31 | 4 | 12.15 | 5.31 | 87.10 % | $0.03 | 0.75 | 0.08 | 0.01 % | 2 / 3 |
| macd-hist | 63 | 6 | 1.70 | 2.22 | 77.78 % | $0.03 | 3.00 | 1.38 | 0.18 % | 4 / 7 |
| obv | 58 | 8 | 1.30 | 1.24 | 75.86 % | $0.02 | 5.75 | 2.90 | 0.33 % | 4 / 8 |
| zscore | 17 | 2 | 257.55 | 123.75 | 94.12 % | $0.02 | 0.50 | 0.00 | 0.00 % | 4 / 4 |
| ema-cross-fast | 45 | 4 | 1.93 | 6.42 | 88.89 % | $0.02 | 6.00 | 0.87 | 0.08 % | 7 / 9 |
| s2-active-hf | 5 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.02 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| reclaim | 95 | 5 | 1.24 | 2.21 | 80.00 % | $0.01 | 5.50 | 3.82 | 0.26 % | 4 / 5 |
| r-fractal | 12 | 2 | 33.80 | 54.62 | 83.33 % | $0.01 | 6.25 | 0.03 | 0.00 % | 3 / 4 |
| cci | 36 | 7 | 328.58 | 6.33 | 91.67 % | $0.01 | 0.25 | 0.00 | 0.00 % | 5 / 5 |
| ema-trend | 30 | 3 | 3.26 | 1.25 | 63.33 % | $0.01 | 4.75 | 0.26 | 0.01 % | 1 / 4 |
| sar | 16 | 5 | 1.58 | 1.03 | 50.00 % | $0.01 | 5.00 | 1.50 | 0.04 % | 2 / 4 |
| r-inside | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| r-connors | 10 | 2 | 308.10 | 347.89 | 90.00 % | $0.00 | 1.00 | 0.00 | 0.00 % | 4 / 4 |
| squeeze | 4 | 1 | 64.18 | 63.57 | 75.00 % | $0.00 | 3.50 | 0.02 | 0.00 % | 1 / 1 |
| keltner | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| ema-pullback | 42 | 9 | 0.90 | 0.52 | 52.38 % | -$0.01 | 7.50 | – | 0.16 % | 3 / 5 |
| s2-atr-break | 44 | 6 | 0.83 | 0.65 | 63.64 % | -$0.01 | 3.25 | – | 0.29 % | 3 / 6 |
| williams-r | 72 | 6 | 0.55 | 4.87 | 81.94 % | -$0.07 | 0.50 | – | 0.78 % | 1 / 2 |
| act-burst | 6 | 1 | 0.00 | 0.00 | 16.67 % | -$0.11 | 8.25 | – | 0.55 % | 1 / 3 |

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
