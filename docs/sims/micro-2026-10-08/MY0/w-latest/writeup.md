# 12 h simulated session — 20 symbols, 24 h pre-historic + 12 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-06 12:00 → 2026-10-07 12:00 UTC, run 2026-10-07 12:00 → 2026-10-08 00:00 UTC. Symbols: ORCA-USDT, SOL-USDT, BCH-USDT, XRP-USDT, W-USDT, NEAR-USDT, JUP-USDT, BOME-USDT, PUMP-USDT, GRIFFAIN-USDT, LYN-USDT, SAND-USDT, ZRO-USDT, HAJIMI-USDT, AIN-USDT, MMT-USDT, BR-USDT, AVNT-USDT, AVAX-USDT, S-USDT.

Settings (desk, docs/sims/micro-2026-10-08/desks/MY0.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / axis, ranges micro / short / general / long (micro on), caps: positions none, signal positions none, coordination on, signals validated on their last 0. Block overall, 8 levels, Active from 5, ratio 0.5, max 4× per source, the stack up to 8×. Balance $20.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/MY0-w-latest/html/index.html](runs/MY0-w-latest/html/index.html) · numbers: `runs/MY0-w-latest/html/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $20.00 → $19.47 | $15.56 | -$0.53 (-2.67 %) | 0.90 | 0.42 | 8.75 | – | $10.01 (39.22 %) | 3802 | 46 | 42.92 % | 4 / 12 | $16.21 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 35 positions / 3475 orders, MTM -$3.91 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 173 orders capped to $0, 3372 scaled down (open at end: 193 capped, 3195 scaled) · binding: position cap 4731, gross cap 6195. **Without the caps:** balance $20.00 → -$3.23 (-116.15 %) · PF $ 0.43 · equity at end -$26.59 · equity max drawdown $52.99 (206.55 %) · margin used max $151.66 · infeasible: margin exceeded equity for 631 min.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.40 (no compounding) the same orders net -$22.33 (-111.64 %), closed-order max drawdown $26.41.

Engine: Base 1294/25098 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 324/19072 · PF 1.55 · Micro 220/5900 · PF 2.26 · Short 646/8176 · PF 1.50 · General 499/8176 · PF 1.50 · Long 568/8176 · PF 1.50 · Signals 126/126), Main 1243 pairs, 230261 tapes, Real seats: 5986 engine configs + 3780 signal configs (every config of the active signals), compute 151 s, peak RSS 6443 MB. Consistency checks: 55 of 55 pass.

## Findings

- **Strategy types positive:** Trailing $0.32 (PF 1.34, 1611 orders) · Axis $0.07 (PF 3.94, 61 orders).
- **Strategy types losing:** Signal · Trailing -$0.43 (PF 0.73, 502 orders) · Normal -$0.28 (PF 0.69, 1045 orders) · Signal · Normal -$0.21 (PF 0.88, 583 orders).
- **Engine vs signals:** Engine $0.10 (PF 1.06, 2717 orders) · Signals -$0.64 (PF 0.81, 1085 orders).
- **Indication kinds positive:** signal:cci $0.61 (PF 11.28, 50 orders) · volume $0.60 (PF 1.70, 514 orders) · signal:supertrend $0.39 (PF 417.42, 42 orders) · signal:r-session-trend $0.33 (PF 2.76, 52 orders) · signal:ema-cross-fast $0.13 (PF ∞ (no loss), 15 orders) · trend $0.10 (PF 1.50, 843 orders).
- **Indication kinds losing:** signal:r-linreg -$0.63 (PF 0.14, 65 orders) · signal:thrust -$0.50 (PF 0.00, 39 orders) · signal:macd-cross -$0.31 (PF 0.05, 46 orders) · signal:s2-confluence -$0.24 (PF 0.02, 35 orders) · ichimoku -$0.16 (PF 0.00, 110 orders) · break -$0.14 (PF 0.54, 233 orders).
- **Signal sources positive:** cci $0.61 (PF 11.28, 50 orders) · supertrend $0.39 (PF 417.42, 42 orders) · r-session-trend $0.33 (PF 2.76, 52 orders) · ema-cross-fast $0.13 (PF ∞ (no loss), 15 orders) · obv $0.06 (PF 20.53, 22 orders) · atr-break $0.05 (PF ∞ (no loss), 29 orders) · stoch-rsi $0.05 (PF 1.38, 52 orders) · mfi $0.03 (PF ∞ (no loss), 2 orders).
- **Signal sources losing:** r-linreg -$0.63 (PF 0.14, 65 orders) · thrust -$0.50 (PF 0.00, 39 orders) · macd-cross -$0.31 (PF 0.05, 46 orders) · s2-confluence -$0.24 (PF 0.02, 35 orders) · macd-slow -$0.13 (PF 0.07, 47 orders) · keltner -$0.13 (PF 0.00, 19 orders) · hma -$0.12 (PF 0.38, 43 orders) · s2-atr-break -$0.07 (PF 0.01, 19 orders).
- **Symbols:** best GRIFFAIN-USDT $1.21 (PF 5.26, 180 orders) · BR-USDT $0.90 (PF 3.20, 294 orders) · AIN-USDT $0.53 (PF 21.92, 120 orders); worst W-USDT -$1.28 (PF 0.12, 686 orders) · JUP-USDT -$0.95 (PF 0.08, 350 orders) · SAND-USDT -$0.83 (PF 0.08, 299 orders).
- **Block volume:** ×1 -$0.53 (unit PF 0.42, 3802).
- **Lanes:** 1m+ -$0.02 (PF 0.16, 28) · 5m $0.00 (PF ∞ (no loss), 3) · 15m -$0.19 (PF 0.94, 2112) · 15m+ -$0.03 (PF 0.97, 1221) · 30m -$0.29 (PF 0.49, 438); **ranges:** Micro -$0.01 (PF 0.42, 12) · Short -$0.03 (PF 0.95, 1570) · General -$0.21 (PF 0.45, 550) · Long $0.27 (PF 1.34, 524) · Wide $0.07 (PF 3.94, 61) · Signals -$0.64 (PF 0.81, 1085); **sides:** Long $0.60 (PF 5.20, 509) · Short -$1.13 (PF 0.77, 3293).
- **Hours:** 4 green / 8 red / 0 flat of 12 full hours; first order opened 12:00 UTC; best hour 12:00 $2.00, worst hour 22:00 -$1.61.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | $22.00 | $22.29 | 12.72 % | $10.13 | 139 | 16 / 2 / 14 | 123 | 9.50 | 9.64 | $2.00 | 0.28 | 0.04 | $2.00 | 9.50 |
| 13:00 | $22.47 | $22.98 | 10.01 % | $14.13 | 64 | 3 / 0 / 17 | 62 | 491.76 | 519.35 | $0.47 | 1.28 | 0.00 | $2.47 | 11.44 |
| 14:00 | $23.28 | $23.08 | 9.60 % | $16.08 | 157 | 2 / 2 / 17 | 141 | 21.12 | 16.72 | $0.81 | 2.28 | 0.03 | $3.28 | 12.85 |
| 15:00 | $22.27 | $21.25 | 16.76 % | $16.21 | 310 | 11 / 4 / 24 | 171 | 0.15 | 0.46 | -$1.01 | 3.28 | – | $2.27 | 2.56 |
| 16:00 | $22.22 | $21.45 | 15.99 % | $15.59 | 207 | 6 / 2 / 28 | 92 | 0.51 | 0.63 | -$0.06 | 4.28 | – | $2.22 | 2.41 |
| 17:00 | $22.27 | $21.37 | 16.31 % | $15.61 | 290 | 1 / 1 / 28 | 238 | 1.58 | 3.95 | $0.06 | 5.28 | 0.62 | $2.27 | 2.36 |
| 18:00 | $22.25 | $20.54 | 19.55 % | $15.61 | 147 | 1 / 1 / 28 | 94 | 0.57 | 1.44 | -$0.02 | 6.28 | – | $2.25 | 2.31 |
| 19:00 | $22.12 | $20.13 | 21.17 % | $15.58 | 147 | 1 / 0 / 29 | 67 | 0.30 | 0.54 | -$0.14 | 7.28 | – | $2.12 | 2.10 |
| 20:00 | $22.00 | $19.01 | 25.56 % | $15.48 | 478 | 1 / 0 / 30 | 110 | 0.60 | 0.26 | -$0.12 | 8.28 | – | $2.00 | 1.90 |
| 21:00 | $22.00 | $18.93 | 25.86 % | $15.45 | 576 | 1 / 0 / 31 | 254 | 1.00 | 0.54 | -$0.00 | 9.28 | – | $2.00 | 1.81 |
| 22:00 | $20.38 | $16.56 | 35.16 % | $15.40 | 863 | 3 / 2 / 32 | 190 | 0.07 | 0.14 | -$1.61 | 10.28 | – | $0.38 | 1.09 |
| 23:00 | $19.47 | $15.56 | 39.07 % | $14.27 | 424 | 3 / 0 / 35 | 90 | 0.03 | 0.05 | -$0.92 | 11.28 | – | -$0.53 | 0.90 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 1045 | 23 | 0.69 | 0.29 | 26.03 % | -$0.28 | 8.75 | – | 3.74 % | 6 / 12 |
| Trailing | 1611 | 24 | 1.34 | 0.43 | 43.76 % | $0.32 | 8.00 | 2.25 | 3.37 % | 5 / 12 |
| Axis | 61 | 15 | 3.94 | 1.82 | 36.07 % | $0.07 | 6.25 | 0.30 | 0.11 % | 2 / 6 |
| Signal · Normal | 583 | 26 | 0.88 | 0.52 | 53.86 % | -$0.21 | 9.25 | – | 5.27 % | 5 / 12 |
| Signal · Trailing | 502 | 32 | 0.73 | 0.49 | 63.55 % | -$0.43 | 2.25 | – | 6.70 % | 8 / 12 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Plain | 1045 | 23 | 0.69 | 0.29 | 26.03 % | -$0.28 | 8.75 | – | 3.74 % | 6 / 12 |
| Trailing · Plain | 1611 | 24 | 1.34 | 0.43 | 43.76 % | $0.32 | 8.00 | 2.25 | 3.37 % | 5 / 12 |
| Axis · Plain | 61 | 15 | 3.94 | 1.82 | 36.07 % | $0.07 | 6.25 | 0.30 | 0.11 % | 2 / 6 |
| Signal · Normal · Plain | 583 | 26 | 0.88 | 0.52 | 53.86 % | -$0.21 | 9.25 | – | 5.27 % | 5 / 12 |
| Signal · Trailing · Plain | 502 | 32 | 0.73 | 0.49 | 63.55 % | -$0.43 | 2.25 | – | 6.70 % | 8 / 12 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| signal:cci | 50 | 7 | 11.28 | 7.58 | 92.00 % | $0.61 | 7.50 | 0.09 | 0.28 % | 5 / 8 |
| volume | 514 | 19 | 1.70 | 0.42 | 32.68 % | $0.60 | 9.75 | 1.22 | 3.42 % | 7 / 12 |
| signal:supertrend | 42 | 3 | 417.42 | 137.65 | 90.48 % | $0.39 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| signal:r-session-trend | 52 | 2 | 2.76 | 1.13 | 63.46 % | $0.33 | 11.25 | 0.24 | 0.38 % | 4 / 6 |
| signal:ema-cross-fast | 15 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.13 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| trend | 843 | 14 | 1.50 | 0.81 | 55.87 % | $0.10 | 5.25 | 1.49 | 0.72 % | 5 / 10 |
| signal:obv | 22 | 5 | 20.53 | 1.48 | 72.73 % | $0.06 | 5.25 | 0.04 | 0.01 % | 4 / 5 |
| signal:atr-break | 29 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.05 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| signal:stoch-rsi | 52 | 6 | 1.38 | 0.55 | 63.46 % | $0.05 | 5.50 | 2.43 | 0.61 % | 4 / 10 |
| signal:mfi | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:s2-block-scale | 44 | 4 | 1.11 | 1.98 | 81.82 % | $0.02 | 6.50 | 8.65 | 0.81 % | 3 / 5 |
| signal:heikin-ashi | 24 | 4 | 1.82 | 3.65 | 91.67 % | $0.02 | 3.75 | 1.21 | 0.11 % | 2 / 3 |
| signal:williams-r | 36 | 3 | 2.57 | 3.90 | 86.11 % | $0.02 | 2.25 | 0.64 | 0.06 % | 2 / 4 |
| signal:s2-vol-break | 23 | 1 | 2.95 | 2.95 | 86.96 % | $0.01 | 7.50 | 0.51 | 0.04 % | 1 / 3 |
| signal:r-awesome | 24 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:act-burst | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:r-vol-regime | 7 | 1 | 95.21 | 95.62 | 85.71 % | $0.01 | 0.75 | 0.01 | 0.00 % | 2 / 2 |
| signal:s2-ema-cross | 8 | 1 | 51.83 | 51.86 | 87.50 % | $0.01 | 3.25 | 0.02 | 0.00 % | 2 / 3 |
| signal:ema-slope | 17 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:reclaim | 12 | 4 | 13.07 | 2.59 | 83.33 % | $0.00 | 0.25 | 0.05 | 0.00 % | 3 / 3 |
| signal:r-connors | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:r-fractal | 23 | 2 | 78.23 | 638.18 | 95.65 % | $0.00 | 6.00 | 0.01 | 0.00 % | 4 / 4 |
| signal:s2-stoch-swing | 14 | 2 | 1.66 | 0.09 | 42.86 % | $0.00 | 4.50 | 1.53 | 0.03 % | 2 / 4 |
| signal:ichimoku | 10 | 1 | 71.92 | 72.54 | 80.00 % | $0.00 | 4.75 | 0.01 | 0.00 % | 1 / 2 |
| signal:ema-cross | 31 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| signal:macd-hist | 30 | 4 | 1.37 | 0.31 | 43.33 % | $0.00 | 6.75 | 2.72 | 0.01 % | 1 / 7 |
| signal:ema-trend | 14 | 2 | ∞ (no loss) | 1.35 | 85.71 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 2 |
| signal:s2-bb-bounce | 2 | 1 | 23.90 | 24.81 | 50.00 % | $0.00 | 4.50 | 0.04 | 0.00 % | 1 / 2 |
| signal:vwap | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:s2-adx-gate | 14 | 1 | – | 0.00 | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 5 |
| signal:rsi-mid | 8 | 2 | 0.02 | 0.48 | 25.00 % | -$0.00 | 9.50 | – | 0.00 % | 1 / 3 |
| signal:r-nr-break | 4 | 2 | 0.65 | 0.05 | 25.00 % | -$0.00 | 3.75 | – | 0.01 % | 1 / 3 |
| rsi | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 8.00 | – | 0.00 % | 0 / 2 |
| smooth | 73 | 6 | 0.46 | 0.76 | 42.47 % | -$0.00 | 5.25 | – | 0.03 % | 4 / 7 |
| signal:cmf | 25 | 3 | 0.01 | 0.00 | 8.00 % | -$0.00 | 9.50 | – | 0.02 % | 0 / 5 |
| active | 21 | 6 | 0.63 | 1.97 | 66.67 % | -$0.00 | 9.75 | – | 0.05 % | 3 / 5 |
| signal:sar | 14 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.75 | – | 0.02 % | 0 / 5 |
| macd | 5 | 5 | 0.00 | 0.03 | 20.00 % | -$0.00 | 8.50 | – | 0.02 % | 0 / 4 |
| signal:s2-range-shift | 3 | 2 | 0.00 | 0.00 | 0.00 % | -$0.01 | 10.00 | – | 0.03 % | 0 / 2 |
| channel | 5 | 3 | 0.00 | 0.00 | 0.00 % | -$0.01 | 9.00 | – | 0.05 % | 0 / 4 |
| bollinger | 79 | 9 | 0.29 | 0.26 | 37.97 % | -$0.01 | 7.93 | – | 0.05 % | 1 / 6 |
| signal:s2-block-stack | 24 | 4 | 0.27 | 3.39 | 75.00 % | -$0.02 | 10.25 | – | 0.11 % | 3 / 6 |
| direction | 145 | 13 | 0.19 | 0.21 | 26.90 % | -$0.02 | 8.00 | – | 0.11 % | 2 / 8 |
| signal:adx | 2 | 1 | 0.00 | 0.00 | 0.00 % | -$0.03 | 9.50 | – | 0.13 % | 0 / 1 |
| signal:kama | 43 | 7 | 0.18 | 0.14 | 37.21 % | -$0.03 | 4.75 | – | 0.18 % | 5 / 11 |
| signal:ema-pullback | 19 | 3 | 0.49 | 0.50 | 78.95 % | -$0.03 | 7.75 | – | 0.18 % | 3 / 5 |
| signal:act-hf | 8 | 3 | 0.00 | 0.03 | 25.00 % | -$0.04 | 10.50 | – | 0.18 % | 0 / 2 |
| signal:s2-active-hf | 4 | 2 | 0.07 | 0.07 | 50.00 % | -$0.04 | 9.25 | – | 0.20 % | 2 / 3 |
| signal:swing | 7 | 3 | 0.00 | 0.00 | 0.00 % | -$0.04 | 10.50 | – | 0.19 % | 0 / 4 |
| ema | 230 | 12 | 0.02 | 0.21 | 24.35 % | -$0.05 | 12.00 | – | 0.23 % | 2 / 10 |
| signal:impulse | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 11.00 | – | 0.26 % | 0 / 4 |
| signal:s2-atr-break | 19 | 3 | 0.01 | 0.04 | 26.32 % | -$0.07 | 5.75 | – | 0.35 % | 1 / 6 |
| move | 149 | 14 | 0.28 | 0.12 | 14.09 % | -$0.08 | 12.00 | – | 0.38 % | 2 / 8 |
| osc | 306 | 15 | 0.11 | 0.16 | 31.37 % | -$0.12 | 8.00 | – | 0.59 % | 1 / 8 |
| signal:hma | 43 | 3 | 0.38 | 0.25 | 34.88 % | -$0.12 | 11.00 | – | 1.00 % | 3 / 8 |
| signal:keltner | 19 | 2 | 0.00 | 0.00 | 0.00 % | -$0.13 | 9.00 | – | 0.63 % | 0 / 5 |
| signal:macd-slow | 47 | 5 | 0.07 | 0.09 | 34.04 % | -$0.13 | 4.50 | – | 0.69 % | 3 / 10 |
| break | 233 | 12 | 0.54 | 0.15 | 21.46 % | -$0.14 | 8.50 | – | 1.41 % | 3 / 11 |
| ichimoku | 110 | 11 | 0.00 | 0.21 | 20.00 % | -$0.16 | 8.00 | – | 0.78 % | 0 / 9 |
| signal:s2-confluence | 35 | 7 | 0.02 | 0.28 | 45.71 % | -$0.24 | 4.75 | – | 1.19 % | 2 / 5 |
| signal:macd-cross | 46 | 4 | 0.05 | 0.04 | 17.39 % | -$0.31 | 8.75 | – | 1.59 % | 3 / 8 |
| signal:thrust | 39 | 8 | 0.00 | 0.03 | 17.95 % | -$0.50 | 10.50 | – | 2.50 % | 2 / 8 |
| signal:r-linreg | 65 | 2 | 0.14 | 0.08 | 30.77 % | -$0.63 | 8.50 | – | 3.63 % | 3 / 8 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cci | 50 | 7 | 11.28 | 7.58 | 92.00 % | $0.61 | 7.50 | 0.09 | 0.28 % | 5 / 8 |
| supertrend | 42 | 3 | 417.42 | 137.65 | 90.48 % | $0.39 | 1.00 | 0.00 | 0.00 % | 5 / 5 |
| r-session-trend | 52 | 2 | 2.76 | 1.13 | 63.46 % | $0.33 | 11.25 | 0.24 | 0.38 % | 4 / 6 |
| ema-cross-fast | 15 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.13 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| obv | 22 | 5 | 20.53 | 1.48 | 72.73 % | $0.06 | 5.25 | 0.04 | 0.01 % | 4 / 5 |
| atr-break | 29 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.05 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| stoch-rsi | 52 | 6 | 1.38 | 0.55 | 63.46 % | $0.05 | 5.50 | 2.43 | 0.61 % | 4 / 10 |
| mfi | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| s2-block-scale | 44 | 4 | 1.11 | 1.98 | 81.82 % | $0.02 | 6.50 | 8.65 | 0.81 % | 3 / 5 |
| heikin-ashi | 24 | 4 | 1.82 | 3.65 | 91.67 % | $0.02 | 3.75 | 1.21 | 0.11 % | 2 / 3 |
| williams-r | 36 | 3 | 2.57 | 3.90 | 86.11 % | $0.02 | 2.25 | 0.64 | 0.06 % | 2 / 4 |
| s2-vol-break | 23 | 1 | 2.95 | 2.95 | 86.96 % | $0.01 | 7.50 | 0.51 | 0.04 % | 1 / 3 |
| r-awesome | 24 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| act-burst | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| r-vol-regime | 7 | 1 | 95.21 | 95.62 | 85.71 % | $0.01 | 0.75 | 0.01 | 0.00 % | 2 / 2 |
| s2-ema-cross | 8 | 1 | 51.83 | 51.86 | 87.50 % | $0.01 | 3.25 | 0.02 | 0.00 % | 2 / 3 |
| ema-slope | 17 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| reclaim | 12 | 4 | 13.07 | 2.59 | 83.33 % | $0.00 | 0.25 | 0.05 | 0.00 % | 3 / 3 |
| r-connors | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| r-fractal | 23 | 2 | 78.23 | 638.18 | 95.65 % | $0.00 | 6.00 | 0.01 | 0.00 % | 4 / 4 |
| s2-stoch-swing | 14 | 2 | 1.66 | 0.09 | 42.86 % | $0.00 | 4.50 | 1.53 | 0.03 % | 2 / 4 |
| ichimoku | 10 | 1 | 71.92 | 72.54 | 80.00 % | $0.00 | 4.75 | 0.01 | 0.00 % | 1 / 2 |
| ema-cross | 31 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 6 / 6 |
| macd-hist | 30 | 4 | 1.37 | 0.31 | 43.33 % | $0.00 | 6.75 | 2.72 | 0.01 % | 1 / 7 |
| ema-trend | 14 | 2 | ∞ (no loss) | 1.35 | 85.71 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 2 |
| s2-bb-bounce | 2 | 1 | 23.90 | 24.81 | 50.00 % | $0.00 | 4.50 | 0.04 | 0.00 % | 1 / 2 |
| vwap | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-adx-gate | 14 | 1 | – | 0.00 | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 5 |
| rsi-mid | 8 | 2 | 0.02 | 0.48 | 25.00 % | -$0.00 | 9.50 | – | 0.00 % | 1 / 3 |
| r-nr-break | 4 | 2 | 0.65 | 0.05 | 25.00 % | -$0.00 | 3.75 | – | 0.01 % | 1 / 3 |
| cmf | 25 | 3 | 0.01 | 0.00 | 8.00 % | -$0.00 | 9.50 | – | 0.02 % | 0 / 5 |
| sar | 14 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 10.75 | – | 0.02 % | 0 / 5 |
| s2-range-shift | 3 | 2 | 0.00 | 0.00 | 0.00 % | -$0.01 | 10.00 | – | 0.03 % | 0 / 2 |
| s2-block-stack | 24 | 4 | 0.27 | 3.39 | 75.00 % | -$0.02 | 10.25 | – | 0.11 % | 3 / 6 |
| adx | 2 | 1 | 0.00 | 0.00 | 0.00 % | -$0.03 | 9.50 | – | 0.13 % | 0 / 1 |
| kama | 43 | 7 | 0.18 | 0.14 | 37.21 % | -$0.03 | 4.75 | – | 0.18 % | 5 / 11 |
| ema-pullback | 19 | 3 | 0.49 | 0.50 | 78.95 % | -$0.03 | 7.75 | – | 0.18 % | 3 / 5 |
| act-hf | 8 | 3 | 0.00 | 0.03 | 25.00 % | -$0.04 | 10.50 | – | 0.18 % | 0 / 2 |
| s2-active-hf | 4 | 2 | 0.07 | 0.07 | 50.00 % | -$0.04 | 9.25 | – | 0.20 % | 2 / 3 |
| swing | 7 | 3 | 0.00 | 0.00 | 0.00 % | -$0.04 | 10.50 | – | 0.19 % | 0 / 4 |
| impulse | 4 | 2 | 0.00 | 0.00 | 0.00 % | -$0.05 | 11.00 | – | 0.26 % | 0 / 4 |
| s2-atr-break | 19 | 3 | 0.01 | 0.04 | 26.32 % | -$0.07 | 5.75 | – | 0.35 % | 1 / 6 |
| hma | 43 | 3 | 0.38 | 0.25 | 34.88 % | -$0.12 | 11.00 | – | 1.00 % | 3 / 8 |
| keltner | 19 | 2 | 0.00 | 0.00 | 0.00 % | -$0.13 | 9.00 | – | 0.63 % | 0 / 5 |
| macd-slow | 47 | 5 | 0.07 | 0.09 | 34.04 % | -$0.13 | 4.50 | – | 0.69 % | 3 / 10 |
| s2-confluence | 35 | 7 | 0.02 | 0.28 | 45.71 % | -$0.24 | 4.75 | – | 1.19 % | 2 / 5 |
| macd-cross | 46 | 4 | 0.05 | 0.04 | 17.39 % | -$0.31 | 8.75 | – | 1.59 % | 3 / 8 |
| thrust | 39 | 8 | 0.00 | 0.03 | 17.95 % | -$0.50 | 10.50 | – | 2.50 % | 2 / 8 |
| r-linreg | 65 | 2 | 0.14 | 0.08 | 30.77 % | -$0.63 | 8.50 | – | 3.63 % | 3 / 8 |

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
