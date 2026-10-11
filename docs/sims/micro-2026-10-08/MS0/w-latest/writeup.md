# 12 h simulated session — 20 symbols, 24 h pre-historic + 12 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-06 12:00 → 2026-10-07 12:00 UTC, run 2026-10-07 12:00 → 2026-10-08 00:00 UTC. Symbols: XRP-USDT, BCH-USDT, ORCA-USDT, SOL-USDT, W-USDT, BOME-USDT, NEAR-USDT, PUMP-USDT, JUP-USDT, GRIFFAIN-USDT, ZRO-USDT, LYN-USDT, HAJIMI-USDT, SAND-USDT, AIN-USDT, MMT-USDT, AVAX-USDT, AVNT-USDT, BR-USDT, S-USDT.

Settings (desk, docs/sims/micro-2026-10-08/desks/MS0.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / axis, ranges micro / short / general / long (micro on), caps: positions none, signal positions none, coordination on, signals validated on their last 0. Block overall, 8 levels, Active from 5, ratio 0.5, max 4× per source, the stack up to 8×. Balance $20.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/MS0-w-latest/html/index.html](runs/MS0-w-latest/html/index.html) · numbers: `runs/MS0-w-latest/html/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $20.00 → $18.64 | $14.88 | -$1.36 (-6.82 %) | 0.70 | 0.43 | 9.25 | – | $8.71 (36.98 %) | 2378 | 45 | 44.62 % | 5 / 12 | $15.10 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 35 positions / 2791 orders, MTM -$3.76 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 59 orders capped to $0, 1997 scaled down (open at end: 46 capped, 2632 scaled) · binding: position cap 2773, gross cap 4165. **Without the caps:** balance $20.00 → $4.77 (-76.13 %) · PF $ 0.43 · equity at end -$16.38 · equity max drawdown $40.52 (171.78 %) · margin used max $104.50 · infeasible: margin exceeded equity for 586 min.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.40 (no compounding) the same orders net -$14.73 (-73.66 %), closed-order max drawdown $17.87.

Engine: Base 1294/25098 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 324/19072 · PF 1.55 · Micro 220/5900 · PF 2.26 · Short 646/8176 · PF 1.50 · General 499/8176 · PF 1.50 · Long 568/8176 · PF 1.50 · Signals 126/126), Main 1236 pairs, 227464 tapes, Real seats: 5986 engine configs + 3780 signal configs (every config of the active signals), compute 181 s, peak RSS 6424 MB. Consistency checks: 55 of 55 pass.

## Findings

- **Strategy types positive:** none.
- **Strategy types losing:** Normal -$0.48 (PF 0.26, 470 orders) · Trailing -$0.45 (PF 0.29, 781 orders) · Signal · Normal -$0.24 (PF 0.87, 583 orders) · Signal · Trailing -$0.19 (PF 0.87, 502 orders) · Axis -$0.00 (PF 0.97, 42 orders).
- **Engine vs signals:** Engine -$0.93 (PF 0.29, 1293 orders) · Signals -$0.43 (PF 0.87, 1085 orders).
- **Indication kinds positive:** signal:cci $0.59 (PF 11.24, 50 orders) · signal:supertrend $0.37 (PF 400.93, 42 orders) · signal:r-session-trend $0.29 (PF 2.29, 52 orders) · signal:s2-block-scale $0.16 (PF 1.85, 44 orders) · signal:ema-cross-fast $0.12 (PF ∞ (no loss), 15 orders) · signal:atr-break $0.06 (PF ∞ (no loss), 29 orders).
- **Indication kinds losing:** volume -$0.70 (PF 0.14, 243 orders) · signal:r-linreg -$0.55 (PF 0.16, 65 orders) · signal:thrust -$0.44 (PF 0.00, 39 orders) · signal:kama -$0.25 (PF 0.01, 43 orders) · signal:s2-confluence -$0.25 (PF 0.02, 35 orders) · signal:macd-cross -$0.17 (PF 0.09, 46 orders).
- **Signal sources positive:** cci $0.59 (PF 11.24, 50 orders) · supertrend $0.37 (PF 400.93, 42 orders) · r-session-trend $0.29 (PF 2.29, 52 orders) · s2-block-scale $0.16 (PF 1.85, 44 orders) · ema-cross-fast $0.12 (PF ∞ (no loss), 15 orders) · atr-break $0.06 (PF ∞ (no loss), 29 orders) · stoch-rsi $0.06 (PF 1.50, 52 orders) · obv $0.06 (PF 25.56, 22 orders).
- **Signal sources losing:** r-linreg -$0.55 (PF 0.16, 65 orders) · thrust -$0.44 (PF 0.00, 39 orders) · kama -$0.25 (PF 0.01, 43 orders) · s2-confluence -$0.25 (PF 0.02, 35 orders) · macd-cross -$0.17 (PF 0.09, 46 orders) · hma -$0.12 (PF 0.36, 43 orders) · keltner -$0.09 (PF 0.00, 19 orders) · macd-slow -$0.09 (PF 0.14, 47 orders).
- **Symbols:** best GRIFFAIN-USDT $0.58 (PF 5.25, 63 orders) · AIN-USDT $0.51 (PF 20.73, 119 orders) · ORCA-USDT $0.43 (PF 5.61, 147 orders); worst W-USDT -$1.23 (PF 0.09, 463 orders) · JUP-USDT -$0.90 (PF 0.10, 230 orders) · SAND-USDT -$0.65 (PF 0.11, 170 orders).
- **Block volume:** ×1 -$1.36 (unit PF 0.43, 2378).
- **Lanes:** 1m+ -$0.02 (PF 0.00, 18) · 5m $0.01 (PF ∞ (no loss), 14) · 5m+ -$0.03 (PF 0.27, 9) · 15m -$0.49 (PF 0.86, 1640) · 15m+ -$0.67 (PF 0.18, 567) · 30m -$0.17 (PF 0.27, 130); **ranges:** Micro -$0.03 (PF 0.40, 28) · Short -$0.51 (PF 0.27, 836) · General -$0.13 (PF 0.23, 238) · Long -$0.26 (PF 0.29, 149) · Wide -$0.00 (PF 0.97, 42) · Signals -$0.43 (PF 0.87, 1085); **sides:** Long $0.62 (PF 4.71, 501) · Short -$1.98 (PF 0.55, 1877).
- **Hours:** 5 green / 7 red / 0 flat of 12 full hours; first order opened 12:00 UTC; best hour 12:00 $0.82, worst hour 22:00 -$1.47.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | $20.82 | $20.97 | 10.97 % | $7.97 | 83 | 17 / 3 / 14 | 68 | 4.77 | 4.78 | $0.82 | 0.28 | 0.14 | $0.82 | 4.77 |
| 13:00 | $21.10 | $21.48 | 8.79 % | $10.71 | 61 | 2 / 0 / 16 | 56 | 14.38 | 27.37 | $0.28 | 1.28 | 0.07 | $1.10 | 5.61 |
| 14:00 | $21.82 | $21.39 | 9.20 % | $13.80 | 96 | 3 / 2 / 17 | 82 | 14.66 | 11.26 | $0.72 | 2.28 | 0.05 | $1.82 | 7.25 |
| 15:00 | $21.11 | $20.07 | 14.79 % | $15.10 | 179 | 10 / 3 / 24 | 112 | 0.22 | 0.67 | -$0.71 | 3.28 | – | $1.11 | 1.92 |
| 16:00 | $21.07 | $20.30 | 13.79 % | $14.77 | 129 | 6 / 3 / 27 | 59 | 0.60 | 0.60 | -$0.04 | 4.28 | – | $1.07 | 1.83 |
| 17:00 | $21.14 | $20.07 | 14.79 % | $14.81 | 209 | 1 / 1 / 27 | 177 | 1.77 | 8.57 | $0.07 | 5.28 | 0.80 | $1.14 | 1.82 |
| 18:00 | $21.07 | $19.32 | 17.97 % | $14.80 | 65 | 1 / 1 / 27 | 41 | 0.28 | 1.10 | -$0.06 | 6.28 | – | $1.07 | 1.73 |
| 19:00 | $20.98 | $19.01 | 19.28 % | $14.75 | 114 | 1 / 0 / 28 | 59 | 0.41 | 0.66 | -$0.10 | 7.28 | – | $0.98 | 1.60 |
| 20:00 | $20.84 | $17.96 | 23.73 % | $14.68 | 413 | 1 / 0 / 29 | 108 | 0.57 | 0.31 | -$0.14 | 8.28 | – | $0.84 | 1.43 |
| 21:00 | $20.86 | $17.87 | 24.13 % | $14.65 | 337 | 1 / 0 / 30 | 117 | 1.11 | 0.35 | $0.03 | 9.28 | 4.68 | $0.86 | 1.40 |
| 22:00 | $19.39 | $15.72 | 33.27 % | $14.60 | 435 | 4 / 2 / 32 | 124 | 0.07 | 0.20 | -$1.47 | 10.28 | – | -$0.61 | 0.84 |
| 23:00 | $18.64 | $14.88 | 36.84 % | $13.57 | 257 | 3 / 0 / 35 | 58 | 0.03 | 0.05 | -$0.76 | 11.28 | – | -$1.36 | 0.70 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 470 | 23 | 0.26 | 0.27 | 26.38 % | -$0.48 | 10.92 | – | 2.57 % | 3 / 11 |
| Trailing | 781 | 25 | 0.29 | 0.34 | 37.00 % | -$0.45 | 12.00 | – | 2.25 % | 3 / 12 |
| Axis | 42 | 10 | 0.97 | 1.89 | 35.71 % | -$0.00 | 11.80 | – | 0.11 % | 1 / 5 |
| Signal · Normal | 583 | 26 | 0.87 | 0.52 | 53.86 % | -$0.24 | 9.25 | – | 5.63 % | 4 / 12 |
| Signal · Trailing | 502 | 32 | 0.87 | 0.49 | 63.55 % | -$0.19 | 2.00 | – | 5.87 % | 8 / 12 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Plain | 470 | 23 | 0.26 | 0.27 | 26.38 % | -$0.48 | 10.92 | – | 2.57 % | 3 / 11 |
| Trailing · Plain | 781 | 25 | 0.29 | 0.34 | 37.00 % | -$0.45 | 12.00 | – | 2.25 % | 3 / 12 |
| Axis · Plain | 42 | 10 | 0.97 | 1.89 | 35.71 % | -$0.00 | 11.80 | – | 0.11 % | 1 / 5 |
| Signal · Normal · Plain | 583 | 26 | 0.87 | 0.52 | 53.86 % | -$0.24 | 9.25 | – | 5.63 % | 4 / 12 |
| Signal · Trailing · Plain | 502 | 32 | 0.87 | 0.49 | 63.55 % | -$0.19 | 2.00 | – | 5.87 % | 8 / 12 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| signal:cci | 50 | 7 | 11.24 | 7.58 | 92.00 % | $0.59 | 7.50 | 0.09 | 0.27 % | 5 / 8 |
| signal:supertrend | 42 | 3 | 400.93 | 137.65 | 90.48 % | $0.37 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| signal:r-session-trend | 52 | 2 | 2.29 | 1.13 | 63.46 % | $0.29 | 11.25 | 0.41 | 0.58 % | 4 / 6 |
| signal:s2-block-scale | 44 | 4 | 1.85 | 1.98 | 81.82 % | $0.16 | 8.75 | 0.98 | 0.77 % | 3 / 5 |
| signal:ema-cross-fast | 15 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.12 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:atr-break | 29 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.06 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| signal:stoch-rsi | 52 | 6 | 1.50 | 0.55 | 63.46 % | $0.06 | 5.25 | 1.86 | 0.56 % | 4 / 10 |
| signal:obv | 22 | 5 | 25.56 | 1.48 | 72.73 % | $0.06 | 5.25 | 0.04 | 0.01 % | 4 / 5 |
| signal:heikin-ashi | 24 | 4 | 2.48 | 3.65 | 91.67 % | $0.03 | 3.75 | 0.68 | 0.10 % | 2 / 3 |
| trend | 390 | 16 | 1.18 | 0.68 | 49.49 % | $0.03 | 5.50 | 3.82 | 0.51 % | 5 / 10 |
| signal:mfi | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:williams-r | 36 | 3 | 2.84 | 3.90 | 86.11 % | $0.03 | 2.25 | 0.54 | 0.07 % | 2 / 4 |
| break | 64 | 8 | 1.91 | 0.07 | 7.81 % | $0.02 | 11.25 | 1.07 | 0.12 % | 1 / 7 |
| signal:s2-vol-break | 23 | 1 | 2.95 | 2.95 | 86.96 % | $0.02 | 7.50 | 0.51 | 0.05 % | 1 / 3 |
| signal:r-awesome | 24 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:act-burst | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:s2-ema-cross | 8 | 1 | 51.72 | 51.86 | 87.50 % | $0.01 | 3.25 | 0.02 | 0.00 % | 2 / 3 |
| signal:r-fractal | 23 | 2 | 128.64 | 638.18 | 95.65 % | $0.01 | 6.00 | 0.01 | 0.00 % | 4 / 4 |
| signal:reclaim | 12 | 4 | 24.13 | 2.59 | 83.33 % | $0.01 | 0.25 | 0.04 | 0.00 % | 3 / 3 |
| signal:r-vol-regime | 7 | 1 | 95.47 | 95.62 | 85.71 % | $0.01 | 0.75 | 0.01 | 0.00 % | 2 / 2 |
| signal:ema-slope | 17 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:r-connors | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:ichimoku | 10 | 1 | 71.81 | 72.54 | 80.00 % | $0.00 | 4.75 | 0.01 | 0.00 % | 1 / 2 |
| signal:ema-cross | 31 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| signal:r-nr-break | 4 | 2 | 7.15 | 0.05 | 25.00 % | $0.00 | 3.75 | 0.16 | 0.00 % | 1 / 3 |
| signal:ema-trend | 14 | 2 | 1.88 | 1.35 | 85.71 % | $0.00 | 3.50 | 1.14 | 0.00 % | 1 / 2 |
| signal:s2-bb-bounce | 2 | 1 | 26.00 | 24.81 | 50.00 % | $0.00 | 4.50 | 0.04 | 0.00 % | 1 / 2 |
| signal:vwap | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| channel | 2 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 7.00 | – | 0.00 % | 0 / 1 |
| signal:s2-range-shift | 3 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 1.50 | – | 0.00 % | 0 / 2 |
| signal:sar | 14 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.75 | – | 0.00 % | 0 / 5 |
| signal:rsi-mid | 8 | 2 | 0.03 | 0.48 | 25.00 % | -$0.00 | 9.50 | – | 0.00 % | 1 / 3 |
| signal:s2-stoch-swing | 14 | 2 | 0.87 | 0.09 | 42.86 % | -$0.00 | 5.00 | – | 0.06 % | 2 / 4 |
| signal:macd-hist | 30 | 4 | 0.66 | 0.31 | 43.33 % | -$0.00 | 6.75 | – | 0.03 % | 1 / 7 |
| signal:s2-adx-gate | 14 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 8.75 | – | 0.01 % | 0 / 5 |
| signal:cmf | 25 | 3 | 0.01 | 0.00 | 8.00 % | -$0.01 | 9.50 | – | 0.03 % | 0 / 5 |
| smooth | 59 | 6 | 0.10 | 0.51 | 32.20 % | -$0.01 | 8.00 | – | 0.03 % | 2 / 8 |
| macd | 3 | 3 | 0.02 | 0.06 | 33.33 % | -$0.01 | 8.50 | – | 0.06 % | 1 / 3 |
| bollinger | 37 | 8 | 0.14 | 0.23 | 43.24 % | -$0.02 | 8.00 | – | 0.09 % | 2 / 6 |
| signal:swing | 7 | 3 | 0.00 | 0.00 | 0.00 % | -$0.02 | 10.50 | – | 0.09 % | 0 / 4 |
| ema | 113 | 9 | 0.05 | 0.14 | 15.04 % | -$0.02 | 8.50 | – | 0.10 % | 1 / 7 |
| direction | 81 | 12 | 0.18 | 0.22 | 29.63 % | -$0.02 | 8.00 | – | 0.11 % | 2 / 8 |
| rsi | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.03 | 8.75 | – | 0.13 % | 0 / 2 |
| active | 37 | 10 | 0.48 | 2.74 | 83.78 % | -$0.03 | 10.50 | – | 0.22 % | 4 / 6 |
| signal:s2-block-stack | 24 | 4 | 0.17 | 3.39 | 75.00 % | -$0.03 | 10.25 | – | 0.20 % | 3 / 6 |
| signal:s2-active-hf | 4 | 2 | 0.07 | 0.07 | 50.00 % | -$0.04 | 9.25 | – | 0.19 % | 2 / 3 |
| signal:adx | 2 | 1 | 0.00 | 0.00 | 0.00 % | -$0.04 | 9.50 | – | 0.20 % | 0 / 1 |
| ichimoku | 79 | 9 | 0.01 | 0.35 | 22.78 % | -$0.04 | 8.00 | – | 0.21 % | 0 / 6 |
| signal:act-hf | 8 | 3 | 0.00 | 0.03 | 25.00 % | -$0.04 | 10.50 | – | 0.21 % | 0 / 2 |
| signal:impulse | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 11.00 | – | 0.24 % | 0 / 4 |
| move | 45 | 10 | 0.06 | 0.10 | 17.78 % | -$0.05 | 12.00 | – | 0.24 % | 1 / 6 |
| signal:ema-pullback | 19 | 3 | 0.46 | 0.50 | 78.95 % | -$0.05 | 7.75 | – | 0.26 % | 3 / 5 |
| osc | 136 | 13 | 0.10 | 0.12 | 23.53 % | -$0.07 | 8.50 | – | 0.34 % | 2 / 8 |
| signal:s2-atr-break | 19 | 3 | 0.02 | 0.04 | 26.32 % | -$0.08 | 5.75 | – | 0.38 % | 1 / 6 |
| signal:macd-slow | 47 | 5 | 0.14 | 0.09 | 34.04 % | -$0.09 | 4.50 | – | 0.48 % | 3 / 10 |
| signal:keltner | 19 | 2 | 0.00 | 0.00 | 0.00 % | -$0.09 | 9.00 | – | 0.44 % | 0 / 5 |
| signal:hma | 43 | 3 | 0.36 | 0.25 | 34.88 % | -$0.12 | 11.00 | – | 0.93 % | 3 / 8 |
| signal:macd-cross | 46 | 4 | 0.09 | 0.04 | 17.39 % | -$0.17 | 4.50 | – | 0.90 % | 3 / 8 |
| signal:s2-confluence | 35 | 7 | 0.02 | 0.28 | 45.71 % | -$0.25 | 4.75 | – | 1.24 % | 2 / 5 |
| signal:kama | 43 | 7 | 0.01 | 0.14 | 37.21 % | -$0.25 | 9.75 | – | 1.27 % | 5 / 11 |
| signal:thrust | 39 | 8 | 0.00 | 0.03 | 17.95 % | -$0.44 | 10.50 | – | 2.23 % | 2 / 8 |
| signal:r-linreg | 65 | 2 | 0.16 | 0.08 | 30.77 % | -$0.55 | 8.50 | – | 3.25 % | 3 / 8 |
| volume | 243 | 17 | 0.14 | 0.25 | 26.34 % | -$0.70 | 12.00 | – | 3.48 % | 4 / 11 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cci | 50 | 7 | 11.24 | 7.58 | 92.00 % | $0.59 | 7.50 | 0.09 | 0.27 % | 5 / 8 |
| supertrend | 42 | 3 | 400.93 | 137.65 | 90.48 % | $0.37 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| r-session-trend | 52 | 2 | 2.29 | 1.13 | 63.46 % | $0.29 | 11.25 | 0.41 | 0.58 % | 4 / 6 |
| s2-block-scale | 44 | 4 | 1.85 | 1.98 | 81.82 % | $0.16 | 8.75 | 0.98 | 0.77 % | 3 / 5 |
| ema-cross-fast | 15 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.12 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| atr-break | 29 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.06 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| stoch-rsi | 52 | 6 | 1.50 | 0.55 | 63.46 % | $0.06 | 5.25 | 1.86 | 0.56 % | 4 / 10 |
| obv | 22 | 5 | 25.56 | 1.48 | 72.73 % | $0.06 | 5.25 | 0.04 | 0.01 % | 4 / 5 |
| heikin-ashi | 24 | 4 | 2.48 | 3.65 | 91.67 % | $0.03 | 3.75 | 0.68 | 0.10 % | 2 / 3 |
| mfi | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| williams-r | 36 | 3 | 2.84 | 3.90 | 86.11 % | $0.03 | 2.25 | 0.54 | 0.07 % | 2 / 4 |
| s2-vol-break | 23 | 1 | 2.95 | 2.95 | 86.96 % | $0.02 | 7.50 | 0.51 | 0.05 % | 1 / 3 |
| r-awesome | 24 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| act-burst | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-ema-cross | 8 | 1 | 51.72 | 51.86 | 87.50 % | $0.01 | 3.25 | 0.02 | 0.00 % | 2 / 3 |
| r-fractal | 23 | 2 | 128.64 | 638.18 | 95.65 % | $0.01 | 6.00 | 0.01 | 0.00 % | 4 / 4 |
| reclaim | 12 | 4 | 24.13 | 2.59 | 83.33 % | $0.01 | 0.25 | 0.04 | 0.00 % | 3 / 3 |
| r-vol-regime | 7 | 1 | 95.47 | 95.62 | 85.71 % | $0.01 | 0.75 | 0.01 | 0.00 % | 2 / 2 |
| ema-slope | 17 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| r-connors | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| ichimoku | 10 | 1 | 71.81 | 72.54 | 80.00 % | $0.00 | 4.75 | 0.01 | 0.00 % | 1 / 2 |
| ema-cross | 31 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| r-nr-break | 4 | 2 | 7.15 | 0.05 | 25.00 % | $0.00 | 3.75 | 0.16 | 0.00 % | 1 / 3 |
| ema-trend | 14 | 2 | 1.88 | 1.35 | 85.71 % | $0.00 | 3.50 | 1.14 | 0.00 % | 1 / 2 |
| s2-bb-bounce | 2 | 1 | 26.00 | 24.81 | 50.00 % | $0.00 | 4.50 | 0.04 | 0.00 % | 1 / 2 |
| vwap | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-range-shift | 3 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 1.50 | – | 0.00 % | 0 / 2 |
| sar | 14 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.75 | – | 0.00 % | 0 / 5 |
| rsi-mid | 8 | 2 | 0.03 | 0.48 | 25.00 % | -$0.00 | 9.50 | – | 0.00 % | 1 / 3 |
| s2-stoch-swing | 14 | 2 | 0.87 | 0.09 | 42.86 % | -$0.00 | 5.00 | – | 0.06 % | 2 / 4 |
| macd-hist | 30 | 4 | 0.66 | 0.31 | 43.33 % | -$0.00 | 6.75 | – | 0.03 % | 1 / 7 |
| s2-adx-gate | 14 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 8.75 | – | 0.01 % | 0 / 5 |
| cmf | 25 | 3 | 0.01 | 0.00 | 8.00 % | -$0.01 | 9.50 | – | 0.03 % | 0 / 5 |
| swing | 7 | 3 | 0.00 | 0.00 | 0.00 % | -$0.02 | 10.50 | – | 0.09 % | 0 / 4 |
| s2-block-stack | 24 | 4 | 0.17 | 3.39 | 75.00 % | -$0.03 | 10.25 | – | 0.20 % | 3 / 6 |
| s2-active-hf | 4 | 2 | 0.07 | 0.07 | 50.00 % | -$0.04 | 9.25 | – | 0.19 % | 2 / 3 |
| adx | 2 | 1 | 0.00 | 0.00 | 0.00 % | -$0.04 | 9.50 | – | 0.20 % | 0 / 1 |
| act-hf | 8 | 3 | 0.00 | 0.03 | 25.00 % | -$0.04 | 10.50 | – | 0.21 % | 0 / 2 |
| impulse | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 11.00 | – | 0.24 % | 0 / 4 |
| ema-pullback | 19 | 3 | 0.46 | 0.50 | 78.95 % | -$0.05 | 7.75 | – | 0.26 % | 3 / 5 |
| s2-atr-break | 19 | 3 | 0.02 | 0.04 | 26.32 % | -$0.08 | 5.75 | – | 0.38 % | 1 / 6 |
| macd-slow | 47 | 5 | 0.14 | 0.09 | 34.04 % | -$0.09 | 4.50 | – | 0.48 % | 3 / 10 |
| keltner | 19 | 2 | 0.00 | 0.00 | 0.00 % | -$0.09 | 9.00 | – | 0.44 % | 0 / 5 |
| hma | 43 | 3 | 0.36 | 0.25 | 34.88 % | -$0.12 | 11.00 | – | 0.93 % | 3 / 8 |
| macd-cross | 46 | 4 | 0.09 | 0.04 | 17.39 % | -$0.17 | 4.50 | – | 0.90 % | 3 / 8 |
| s2-confluence | 35 | 7 | 0.02 | 0.28 | 45.71 % | -$0.25 | 4.75 | – | 1.24 % | 2 / 5 |
| kama | 43 | 7 | 0.01 | 0.14 | 37.21 % | -$0.25 | 9.75 | – | 1.27 % | 5 / 11 |
| thrust | 39 | 8 | 0.00 | 0.03 | 17.95 % | -$0.44 | 10.50 | – | 2.23 % | 2 / 8 |
| r-linreg | 65 | 2 | 0.16 | 0.08 | 30.77 % | -$0.55 | 8.50 | – | 3.25 % | 3 / 8 |

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
