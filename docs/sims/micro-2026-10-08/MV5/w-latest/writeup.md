# 12 h simulated session — 20 symbols, 24 h pre-historic + 12 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-06 12:00 → 2026-10-07 12:00 UTC, run 2026-10-07 12:00 → 2026-10-08 00:00 UTC. Symbols: ORCA-USDT, SOL-USDT, XRP-USDT, BCH-USDT, W-USDT, PUMP-USDT, NEAR-USDT, JUP-USDT, BOME-USDT, GRIFFAIN-USDT, HAJIMI-USDT, LYN-USDT, SAND-USDT, ZRO-USDT, AIN-USDT, MMT-USDT, AVAX-USDT, BR-USDT, AVNT-USDT, S-USDT.

Settings (desk, docs/sims/micro-2026-10-08/desks/MV5.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / axis, ranges micro / short / general / long (micro on), caps: positions none, signal positions none, coordination on, signals validated on their last 0. Block overall, 8 levels, Active from 5, ratio 0.5, max 4× per source, the stack up to 8×. Balance $20.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/MV5-w-latest/html/index.html](runs/MV5-w-latest/html/index.html) · numbers: `runs/MV5-w-latest/html/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $20.00 → $18.50 | $14.37 | -$1.50 (-7.51 %) | 0.66 | 0.36 | 9.25 | – | $9.08 (38.81 %) | 2489 | 48 | 40.38 % | 5 / 12 | $15.04 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 35 positions / 2956 orders, MTM -$4.13 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 43 orders capped to $0, 2117 scaled down (open at end: 83 capped, 2720 scaled) · binding: position cap 2744, gross cap 4394. **Without the caps:** balance $20.00 → $1.76 (-91.22 %) · PF $ 0.37 · equity at end -$20.14 · equity max drawdown $44.16 (188.39 %) · margin used max $106.77 · infeasible: margin exceeded equity for 598 min.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.40 (no compounding) the same orders net -$18.33 (-91.64 %), closed-order max drawdown $20.67.

Engine: Base 1294/25098 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 324/19072 · PF 1.55 · Micro 220/5900 · PF 2.26 · Short 646/8176 · PF 1.50 · General 499/8176 · PF 1.50 · Long 568/8176 · PF 1.50 · Signals 126/126), Main 1255 pairs, 236887 tapes, Real seats: 8132 engine configs + 3780 signal configs (every config of the active signals), compute 179 s, peak RSS 6500 MB. Consistency checks: 55 of 55 pass.

## Findings

- **Strategy types positive:** none.
- **Strategy types losing:** Trailing -$0.45 (PF 0.19, 819 orders) · Normal -$0.40 (PF 0.18, 522 orders) · Signal · Normal -$0.38 (PF 0.80, 602 orders) · Signal · Trailing -$0.25 (PF 0.83, 515 orders) · Axis -$0.02 (PF 0.19, 31 orders).
- **Engine vs signals:** Engine -$0.87 (PF 0.19, 1372 orders) · Signals -$0.64 (PF 0.81, 1117 orders).
- **Indication kinds positive:** signal:cci $0.59 (PF 11.29, 50 orders) · signal:supertrend $0.37 (PF 426.71, 42 orders) · signal:r-session-trend $0.29 (PF 2.30, 52 orders) · signal:s2-block-scale $0.16 (PF 1.85, 51 orders) · signal:ema-cross-fast $0.12 (PF ∞ (no loss), 15 orders) · signal:obv $0.06 (PF 29.16, 22 orders).
- **Indication kinds losing:** signal:r-linreg -$0.53 (PF 0.16, 65 orders) · volume -$0.51 (PF 0.05, 194 orders) · signal:thrust -$0.44 (PF 0.00, 39 orders) · signal:s2-confluence -$0.28 (PF 0.01, 35 orders) · signal:kama -$0.25 (PF 0.01, 43 orders) · signal:macd-cross -$0.17 (PF 0.08, 46 orders).
- **Signal sources positive:** cci $0.59 (PF 11.29, 50 orders) · supertrend $0.37 (PF 426.71, 42 orders) · r-session-trend $0.29 (PF 2.30, 52 orders) · s2-block-scale $0.16 (PF 1.85, 51 orders) · ema-cross-fast $0.12 (PF ∞ (no loss), 15 orders) · obv $0.06 (PF 29.16, 22 orders) · stoch-rsi $0.04 (PF 1.34, 52 orders) · atr-break $0.04 (PF ∞ (no loss), 29 orders).
- **Signal sources losing:** r-linreg -$0.53 (PF 0.16, 65 orders) · thrust -$0.44 (PF 0.00, 39 orders) · s2-confluence -$0.28 (PF 0.01, 35 orders) · kama -$0.25 (PF 0.01, 43 orders) · macd-cross -$0.17 (PF 0.08, 46 orders) · swing -$0.13 (PF 0.00, 12 orders) · hma -$0.12 (PF 0.36, 43 orders) · keltner -$0.09 (PF 0.00, 19 orders).
- **Symbols:** best GRIFFAIN-USDT $0.60 (PF 5.23, 78 orders) · AIN-USDT $0.50 (PF 23.69, 94 orders) · ORCA-USDT $0.46 (PF 5.98, 160 orders); worst W-USDT -$1.23 (PF 0.09, 505 orders) · JUP-USDT -$0.95 (PF 0.07, 248 orders) · SAND-USDT -$0.36 (PF 0.11, 132 orders).
- **Block volume:** ×1 -$1.50 (unit PF 0.36, 2489).
- **Lanes:** 1m+ -$0.02 (PF 0.00, 17) · 5m $0.00 (PF ∞ (no loss), 3) · 15m -$0.90 (PF 0.76, 1742) · 15m+ -$0.58 (PF 0.07, 597) · 30m $0.00 (PF 1.00, 130); **ranges:** Micro -$0.00 (PF 0.96, 19) · Short -$0.55 (PF 0.18, 925) · General -$0.13 (PF 0.14, 259) · Long -$0.17 (PF 0.21, 138) · Wide -$0.02 (PF 0.19, 31) · Signals -$0.64 (PF 0.81, 1117); **sides:** Long $0.57 (PF 4.77, 532) · Short -$2.07 (PF 0.52, 1957).
- **Hours:** 5 green / 7 red / 0 flat of 12 full hours; first order opened 12:00 UTC; best hour 14:00 $0.72, worst hour 22:00 -$1.56.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | $20.64 | $20.79 | 11.16 % | $8.38 | 75 | 18 / 4 / 14 | 55 | 3.21 | 3.23 | $0.64 | 0.28 | 0.29 | $0.64 | 3.21 |
| 13:00 | $20.94 | $21.22 | 9.31 % | $12.22 | 55 | 3 / 0 / 17 | 53 | 327.98 | 403.97 | $0.29 | 1.28 | 0.00 | $0.94 | 4.20 |
| 14:00 | $21.66 | $21.27 | 9.11 % | $14.83 | 97 | 4 / 3 / 18 | 85 | 15.00 | 11.46 | $0.72 | 2.28 | 0.05 | $1.66 | 5.81 |
| 15:00 | $21.20 | $20.12 | 14.00 % | $15.04 | 113 | 11 / 4 / 25 | 62 | 0.24 | 0.37 | -$0.46 | 3.28 | – | $1.20 | 2.27 |
| 16:00 | $21.16 | $20.22 | 13.60 % | $14.84 | 119 | 6 / 2 / 29 | 53 | 0.55 | 0.64 | -$0.04 | 4.28 | – | $1.16 | 2.13 |
| 17:00 | $21.19 | $20.05 | 14.32 % | $14.87 | 182 | 2 / 1 / 30 | 147 | 1.35 | 4.56 | $0.03 | 5.28 | 1.76 | $1.19 | 2.06 |
| 18:00 | $21.20 | $19.22 | 17.85 % | $14.85 | 83 | 1 / 1 / 30 | 51 | 1.84 | 1.69 | $0.01 | 6.28 | 0.92 | $1.20 | 2.06 |
| 19:00 | $21.09 | $18.96 | 18.97 % | $14.84 | 142 | 0 / 1 / 29 | 61 | 0.30 | 0.44 | -$0.11 | 7.28 | – | $1.09 | 1.84 |
| 20:00 | $21.03 | $17.83 | 23.79 % | $14.76 | 462 | 1 / 0 / 30 | 108 | 0.72 | 0.26 | -$0.06 | 8.28 | – | $1.03 | 1.67 |
| 21:00 | $20.93 | $17.57 | 24.90 % | $14.72 | 425 | 1 / 0 / 31 | 148 | 0.72 | 0.33 | -$0.10 | 9.28 | – | $0.93 | 1.50 |
| 22:00 | $19.37 | $15.19 | 35.11 % | $14.65 | 456 | 4 / 2 / 33 | 122 | 0.07 | 0.19 | -$1.56 | 10.28 | – | -$0.63 | 0.82 |
| 23:00 | $18.50 | $14.37 | 38.61 % | $13.56 | 280 | 2 / 0 / 35 | 60 | 0.03 | 0.05 | -$0.87 | 11.28 | – | -$1.50 | 0.66 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 522 | 22 | 0.18 | 0.19 | 20.88 % | -$0.40 | 12.00 | – | 2.00 % | 2 / 10 |
| Trailing | 819 | 24 | 0.19 | 0.22 | 30.89 % | -$0.45 | 12.00 | – | 2.24 % | 4 / 11 |
| Axis | 31 | 8 | 0.19 | 0.89 | 16.13 % | -$0.02 | 11.80 | – | 0.10 % | 1 / 6 |
| Signal · Normal | 602 | 27 | 0.80 | 0.50 | 52.49 % | -$0.38 | 9.25 | – | 6.30 % | 4 / 12 |
| Signal · Trailing | 515 | 32 | 0.83 | 0.48 | 62.52 % | -$0.25 | 2.00 | – | 6.02 % | 8 / 12 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Plain | 522 | 22 | 0.18 | 0.19 | 20.88 % | -$0.40 | 12.00 | – | 2.00 % | 2 / 10 |
| Trailing · Plain | 819 | 24 | 0.19 | 0.22 | 30.89 % | -$0.45 | 12.00 | – | 2.24 % | 4 / 11 |
| Axis · Plain | 31 | 8 | 0.19 | 0.89 | 16.13 % | -$0.02 | 11.80 | – | 0.10 % | 1 / 6 |
| Signal · Normal · Plain | 602 | 27 | 0.80 | 0.50 | 52.49 % | -$0.38 | 9.25 | – | 6.30 % | 4 / 12 |
| Signal · Trailing · Plain | 515 | 32 | 0.83 | 0.48 | 62.52 % | -$0.25 | 2.00 | – | 6.02 % | 8 / 12 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| signal:cci | 50 | 7 | 11.29 | 7.58 | 92.00 % | $0.59 | 7.50 | 0.10 | 0.27 % | 5 / 8 |
| signal:supertrend | 42 | 3 | 426.71 | 137.65 | 90.48 % | $0.37 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| signal:r-session-trend | 52 | 2 | 2.30 | 1.13 | 63.46 % | $0.29 | 11.25 | 0.41 | 0.57 % | 4 / 6 |
| signal:s2-block-scale | 51 | 5 | 1.85 | 1.98 | 76.47 % | $0.16 | 8.75 | 0.99 | 0.77 % | 3 / 6 |
| signal:ema-cross-fast | 15 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.12 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:obv | 22 | 5 | 29.16 | 1.48 | 72.73 % | $0.06 | 5.25 | 0.03 | 0.01 % | 4 / 5 |
| signal:stoch-rsi | 52 | 6 | 1.34 | 0.55 | 63.46 % | $0.04 | 5.50 | 2.76 | 0.61 % | 4 / 10 |
| signal:atr-break | 29 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.04 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| signal:williams-r | 36 | 3 | 4.38 | 3.90 | 86.11 % | $0.03 | 2.25 | 0.30 | 0.04 % | 2 / 4 |
| signal:mfi | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:heikin-ashi | 26 | 5 | 2.27 | 3.60 | 84.62 % | $0.03 | 6.75 | 0.76 | 0.10 % | 2 / 4 |
| trend | 396 | 16 | 1.19 | 0.29 | 35.35 % | $0.02 | 5.25 | 3.16 | 0.26 % | 6 / 10 |
| signal:s2-vol-break | 23 | 1 | 2.95 | 2.95 | 86.96 % | $0.01 | 7.50 | 0.51 | 0.03 % | 1 / 3 |
| signal:r-awesome | 24 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:reclaim | 12 | 4 | 22.57 | 2.59 | 83.33 % | $0.01 | 0.25 | 0.05 | 0.00 % | 3 / 3 |
| signal:r-fractal | 23 | 2 | 143.88 | 638.18 | 95.65 % | $0.01 | 6.00 | 0.01 | 0.00 % | 4 / 4 |
| signal:ema-slope | 17 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:r-vol-regime | 7 | 1 | 95.98 | 95.62 | 85.71 % | $0.01 | 0.75 | 0.01 | 0.00 % | 2 / 2 |
| signal:r-connors | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:act-burst | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:s2-stoch-swing | 14 | 2 | 1.73 | 0.09 | 42.86 % | $0.00 | 4.50 | 1.37 | 0.03 % | 2 / 4 |
| signal:s2-ema-cross | 8 | 1 | 51.59 | 51.86 | 87.50 % | $0.00 | 3.25 | 0.02 | 0.00 % | 2 / 3 |
| signal:ichimoku | 10 | 1 | 73.12 | 72.54 | 80.00 % | $0.00 | 4.75 | 0.01 | 0.00 % | 1 / 2 |
| signal:ema-cross | 31 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| signal:macd-hist | 30 | 4 | 1.19 | 0.31 | 43.33 % | $0.00 | 6.75 | 5.28 | 0.02 % | 1 / 7 |
| signal:ema-trend | 14 | 2 | ∞ (no loss) | 1.35 | 85.71 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 2 |
| signal:r-nr-break | 4 | 2 | 4.52 | 0.05 | 25.00 % | $0.00 | 3.75 | 0.28 | 0.00 % | 1 / 3 |
| direction | 86 | 10 | 1.10 | 0.35 | 40.70 % | $0.00 | 5.25 | 8.71 | 0.02 % | 3 / 7 |
| signal:s2-block-stack | 24 | 4 | 1.04 | 3.39 | 75.00 % | $0.00 | 10.25 | 24.83 | 0.04 % | 3 / 6 |
| signal:s2-bb-bounce | 2 | 1 | 23.25 | 24.81 | 50.00 % | $0.00 | 4.50 | 0.04 | 0.00 % | 1 / 2 |
| macd | 2 | 2 | 1.34 | 0.11 | 50.00 % | $0.00 | 3.25 | 2.96 | 0.00 % | 1 / 2 |
| signal:vwap | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:s2-adx-gate | 14 | 1 | – | 0.00 | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 5 |
| active | 19 | 7 | 0.96 | 0.12 | 42.11 % | -$0.00 | 9.75 | – | 0.03 % | 2 / 5 |
| signal:rsi-mid | 8 | 2 | 0.05 | 0.48 | 25.00 % | -$0.00 | 9.50 | – | 0.00 % | 1 / 3 |
| channel | 2 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 7.00 | – | 0.00 % | 0 / 1 |
| signal:sar | 15 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.75 | – | 0.00 % | 0 / 6 |
| signal:s2-range-shift | 3 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.00 | – | 0.00 % | 0 / 2 |
| ema | 65 | 8 | 0.35 | 0.14 | 15.38 % | -$0.01 | 9.75 | – | 0.03 % | 1 / 6 |
| smooth | 90 | 6 | 0.09 | 0.45 | 34.44 % | -$0.01 | 8.00 | – | 0.04 % | 2 / 8 |
| bollinger | 31 | 8 | 0.59 | 0.11 | 35.48 % | -$0.01 | 8.00 | – | 0.10 % | 2 / 8 |
| rsi | 7 | 3 | 0.00 | 0.00 | 0.00 % | -$0.03 | 8.75 | – | 0.13 % | 0 / 3 |
| signal:ema-pullback | 21 | 3 | 0.71 | 0.74 | 80.95 % | -$0.03 | 7.75 | – | 0.26 % | 3 / 5 |
| signal:s2-active-hf | 4 | 2 | 0.07 | 0.07 | 50.00 % | -$0.04 | 9.25 | – | 0.19 % | 2 / 3 |
| signal:act-hf | 8 | 3 | 0.00 | 0.03 | 25.00 % | -$0.04 | 10.50 | – | 0.21 % | 0 / 2 |
| ichimoku | 129 | 10 | 0.02 | 0.33 | 25.58 % | -$0.04 | 8.00 | – | 0.21 % | 1 / 8 |
| signal:impulse | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 11.00 | – | 0.24 % | 0 / 4 |
| signal:adx | 15 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 9.50 | – | 0.24 % | 0 / 4 |
| signal:cmf | 27 | 4 | 0.00 | 0.00 | 7.41 % | -$0.06 | 11.00 | – | 0.32 % | 0 / 5 |
| osc | 191 | 15 | 0.09 | 0.10 | 20.94 % | -$0.07 | 8.75 | – | 0.36 % | 3 / 9 |
| signal:s2-atr-break | 19 | 3 | 0.01 | 0.04 | 26.32 % | -$0.08 | 5.75 | – | 0.40 % | 1 / 6 |
| signal:macd-slow | 47 | 5 | 0.14 | 0.09 | 34.04 % | -$0.08 | 4.50 | – | 0.46 % | 3 / 10 |
| signal:keltner | 19 | 2 | 0.00 | 0.00 | 0.00 % | -$0.09 | 9.00 | – | 0.45 % | 0 / 5 |
| break | 100 | 11 | 0.19 | 0.03 | 12.00 % | -$0.10 | 11.25 | – | 0.64 % | 2 / 9 |
| move | 60 | 8 | 0.02 | 0.05 | 15.00 % | -$0.11 | 6.50 | – | 0.55 % | 1 / 5 |
| signal:hma | 43 | 3 | 0.36 | 0.25 | 34.88 % | -$0.12 | 11.00 | – | 0.92 % | 3 / 8 |
| signal:swing | 12 | 4 | 0.00 | 0.00 | 0.00 % | -$0.13 | 11.00 | – | 0.67 % | 0 / 5 |
| signal:macd-cross | 46 | 4 | 0.08 | 0.04 | 17.39 % | -$0.17 | 8.75 | – | 0.90 % | 3 / 8 |
| signal:kama | 43 | 7 | 0.01 | 0.14 | 37.21 % | -$0.25 | 9.75 | – | 1.27 % | 5 / 11 |
| signal:s2-confluence | 35 | 7 | 0.01 | 0.28 | 45.71 % | -$0.28 | 4.75 | – | 1.41 % | 2 / 5 |
| signal:thrust | 39 | 8 | 0.00 | 0.03 | 17.95 % | -$0.44 | 10.50 | – | 2.21 % | 2 / 8 |
| volume | 194 | 16 | 0.05 | 0.20 | 19.07 % | -$0.51 | 12.00 | – | 2.55 % | 4 / 10 |
| signal:r-linreg | 65 | 2 | 0.16 | 0.08 | 30.77 % | -$0.53 | 8.50 | – | 3.16 % | 3 / 8 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cci | 50 | 7 | 11.29 | 7.58 | 92.00 % | $0.59 | 7.50 | 0.10 | 0.27 % | 5 / 8 |
| supertrend | 42 | 3 | 426.71 | 137.65 | 90.48 % | $0.37 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| r-session-trend | 52 | 2 | 2.30 | 1.13 | 63.46 % | $0.29 | 11.25 | 0.41 | 0.57 % | 4 / 6 |
| s2-block-scale | 51 | 5 | 1.85 | 1.98 | 76.47 % | $0.16 | 8.75 | 0.99 | 0.77 % | 3 / 6 |
| ema-cross-fast | 15 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.12 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| obv | 22 | 5 | 29.16 | 1.48 | 72.73 % | $0.06 | 5.25 | 0.03 | 0.01 % | 4 / 5 |
| stoch-rsi | 52 | 6 | 1.34 | 0.55 | 63.46 % | $0.04 | 5.50 | 2.76 | 0.61 % | 4 / 10 |
| atr-break | 29 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.04 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| williams-r | 36 | 3 | 4.38 | 3.90 | 86.11 % | $0.03 | 2.25 | 0.30 | 0.04 % | 2 / 4 |
| mfi | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| heikin-ashi | 26 | 5 | 2.27 | 3.60 | 84.62 % | $0.03 | 6.75 | 0.76 | 0.10 % | 2 / 4 |
| s2-vol-break | 23 | 1 | 2.95 | 2.95 | 86.96 % | $0.01 | 7.50 | 0.51 | 0.03 % | 1 / 3 |
| r-awesome | 24 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| reclaim | 12 | 4 | 22.57 | 2.59 | 83.33 % | $0.01 | 0.25 | 0.05 | 0.00 % | 3 / 3 |
| r-fractal | 23 | 2 | 143.88 | 638.18 | 95.65 % | $0.01 | 6.00 | 0.01 | 0.00 % | 4 / 4 |
| ema-slope | 17 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| r-vol-regime | 7 | 1 | 95.98 | 95.62 | 85.71 % | $0.01 | 0.75 | 0.01 | 0.00 % | 2 / 2 |
| r-connors | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| act-burst | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-stoch-swing | 14 | 2 | 1.73 | 0.09 | 42.86 % | $0.00 | 4.50 | 1.37 | 0.03 % | 2 / 4 |
| s2-ema-cross | 8 | 1 | 51.59 | 51.86 | 87.50 % | $0.00 | 3.25 | 0.02 | 0.00 % | 2 / 3 |
| ichimoku | 10 | 1 | 73.12 | 72.54 | 80.00 % | $0.00 | 4.75 | 0.01 | 0.00 % | 1 / 2 |
| ema-cross | 31 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| macd-hist | 30 | 4 | 1.19 | 0.31 | 43.33 % | $0.00 | 6.75 | 5.28 | 0.02 % | 1 / 7 |
| ema-trend | 14 | 2 | ∞ (no loss) | 1.35 | 85.71 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 2 |
| r-nr-break | 4 | 2 | 4.52 | 0.05 | 25.00 % | $0.00 | 3.75 | 0.28 | 0.00 % | 1 / 3 |
| s2-block-stack | 24 | 4 | 1.04 | 3.39 | 75.00 % | $0.00 | 10.25 | 24.83 | 0.04 % | 3 / 6 |
| s2-bb-bounce | 2 | 1 | 23.25 | 24.81 | 50.00 % | $0.00 | 4.50 | 0.04 | 0.00 % | 1 / 2 |
| vwap | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-adx-gate | 14 | 1 | – | 0.00 | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 5 |
| rsi-mid | 8 | 2 | 0.05 | 0.48 | 25.00 % | -$0.00 | 9.50 | – | 0.00 % | 1 / 3 |
| sar | 15 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.75 | – | 0.00 % | 0 / 6 |
| s2-range-shift | 3 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.00 | – | 0.00 % | 0 / 2 |
| ema-pullback | 21 | 3 | 0.71 | 0.74 | 80.95 % | -$0.03 | 7.75 | – | 0.26 % | 3 / 5 |
| s2-active-hf | 4 | 2 | 0.07 | 0.07 | 50.00 % | -$0.04 | 9.25 | – | 0.19 % | 2 / 3 |
| act-hf | 8 | 3 | 0.00 | 0.03 | 25.00 % | -$0.04 | 10.50 | – | 0.21 % | 0 / 2 |
| impulse | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 11.00 | – | 0.24 % | 0 / 4 |
| adx | 15 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 9.50 | – | 0.24 % | 0 / 4 |
| cmf | 27 | 4 | 0.00 | 0.00 | 7.41 % | -$0.06 | 11.00 | – | 0.32 % | 0 / 5 |
| s2-atr-break | 19 | 3 | 0.01 | 0.04 | 26.32 % | -$0.08 | 5.75 | – | 0.40 % | 1 / 6 |
| macd-slow | 47 | 5 | 0.14 | 0.09 | 34.04 % | -$0.08 | 4.50 | – | 0.46 % | 3 / 10 |
| keltner | 19 | 2 | 0.00 | 0.00 | 0.00 % | -$0.09 | 9.00 | – | 0.45 % | 0 / 5 |
| hma | 43 | 3 | 0.36 | 0.25 | 34.88 % | -$0.12 | 11.00 | – | 0.92 % | 3 / 8 |
| swing | 12 | 4 | 0.00 | 0.00 | 0.00 % | -$0.13 | 11.00 | – | 0.67 % | 0 / 5 |
| macd-cross | 46 | 4 | 0.08 | 0.04 | 17.39 % | -$0.17 | 8.75 | – | 0.90 % | 3 / 8 |
| kama | 43 | 7 | 0.01 | 0.14 | 37.21 % | -$0.25 | 9.75 | – | 1.27 % | 5 / 11 |
| s2-confluence | 35 | 7 | 0.01 | 0.28 | 45.71 % | -$0.28 | 4.75 | – | 1.41 % | 2 / 5 |
| thrust | 39 | 8 | 0.00 | 0.03 | 17.95 % | -$0.44 | 10.50 | – | 2.21 % | 2 / 8 |
| r-linreg | 65 | 2 | 0.16 | 0.08 | 30.77 % | -$0.53 | 8.50 | – | 3.16 % | 3 / 8 |

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
