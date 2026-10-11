# 18 h simulated session — 30 symbols, 12 h pre-historic + 18 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-06 18:00 → 2026-10-07 06:00 UTC, run 2026-10-07 06:00 → 2026-10-08 00:00 UTC. Symbols: ORCA-USDT, SOL-USDT, BCH-USDT, XRP-USDT, JUP-USDT, W-USDT, NEAR-USDT, BOME-USDT, GRIFFAIN-USDT, PUMP-USDT, NMR-USDT, SAND-USDT, LYN-USDT, ZRO-USDT, AIN-USDT, BR-USDT, S-USDT, AVAX-USDT, MMT-USDT, AVNT-USDT, A-USDT, ZEC-USDT, QNT-USDT, PLUME-USDT, BANK-USDT, DRIFT-USDT, STX-USDT, ETHFI-USDT, HOME-USDT, INJ-USDT.

Settings (desk, /tmp/x01-desk.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / axis, ranges micro / short / general / long (micro on), caps: positions none, signal positions none, coordination on, signals validated on their last 0. Block overall, 8 levels, Active from 5, ratio 0.5, max 4× per source, the stack up to 8×. Balance $19.70, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/x01-18h/html/index.html](runs/x01-18h/html/index.html) · numbers: `runs/x01-18h/html/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $19.70 → $19.80 | $16.52 | $0.10 (0.52 %) | 1.03 | 0.57 | 7.75 | 19.05 | $4.75 (22.34 %) | 4612 | 71 | 61.25 % | 12 / 18 | $15.23 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 46 positions / 6387 orders, MTM -$3.28 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 86 orders capped to $0, 4321 scaled down (open at end: 7 capped, 6326 scaled) · binding: position cap 3979, gross cap 10481. **Without the caps:** balance $19.70 → -$11.99 (-160.88 %) · PF $ 0.49 · equity at end -$101.60 · equity max drawdown $139.02 (374.40 %) · margin used max $372.31 · infeasible: margin exceeded equity for 1053 min.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.39 (no compounding) the same orders net -$19.20 (-97.48 %), closed-order max drawdown $32.78.

Engine: Base 1384/25098 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 404/19072 · PF 1.58 · Micro 185/5900 · PF 2.26 · Short 691/8176 · PF 1.52 · General 562/8176 · PF 1.54 · Long 587/8176 · PF 1.56 · Signals 126/126), Main 1311 pairs, 214035 tapes, Real seats: 8489 engine configs + 2520 signal configs (every config of the active signals), compute 313 s, peak RSS 6387 MB. Consistency checks: 55 of 55 pass.

## Findings

- **Strategy types positive:** Trailing $0.76 (PF 3.47, 1130 orders) · Normal $0.26 (PF 1.65, 656 orders).
- **Strategy types losing:** Signal · Trailing -$0.54 (PF 0.76, 2107 orders) · Signal · Normal -$0.37 (PF 0.63, 668 orders) · Axis -$0.00 (PF 0.93, 51 orders).
- **Engine vs signals:** Engine $1.02 (PF 2.44, 1837 orders) · Signals -$0.92 (PF 0.72, 2775 orders).
- **Indication kinds positive:** signal:williams-r $0.50 (PF 9.89, 174 orders) · trend $0.49 (PF 6.24, 404 orders) · smooth $0.44 (PF 14.15, 177 orders) · osc $0.26 (PF 3.14, 507 orders) · signal:supertrend $0.25 (PF 36.97, 58 orders) · signal:s2-stoch-swing $0.17 (PF 2.44, 119 orders).
- **Indication kinds losing:** signal:r-nr-break -$0.93 (PF 0.00, 43 orders) · signal:ema-trend -$0.52 (PF 0.17, 72 orders) · signal:rsi-reversal -$0.18 (PF 0.00, 30 orders) · signal:s2-atr-break -$0.13 (PF 0.02, 33 orders) · signal:r-connors -$0.10 (PF 0.25, 65 orders) · direction -$0.08 (PF 0.28, 73 orders).
- **Signal sources positive:** williams-r $0.50 (PF 9.89, 174 orders) · supertrend $0.25 (PF 36.97, 58 orders) · s2-stoch-swing $0.17 (PF 2.44, 119 orders) · s2-vwap-axis $0.11 (PF ∞ (no loss), 16 orders) · ema-cross $0.06 (PF 216.68, 29 orders) · adx $0.05 (PF 2.32, 48 orders) · s2-active-hf $0.05 (PF 18.12, 54 orders) · squeeze $0.04 (PF 1022.25, 7 orders).
- **Signal sources losing:** r-nr-break -$0.93 (PF 0.00, 43 orders) · ema-trend -$0.52 (PF 0.17, 72 orders) · rsi-reversal -$0.18 (PF 0.00, 30 orders) · s2-atr-break -$0.13 (PF 0.02, 33 orders) · r-connors -$0.10 (PF 0.25, 65 orders) · heikin-ashi -$0.05 (PF 0.06, 46 orders) · r-awesome -$0.05 (PF 0.07, 32 orders) · kama -$0.04 (PF 0.02, 71 orders).
- **Symbols:** best S-USDT $0.86 (PF 71.14, 121 orders) · PUMP-USDT $0.34 (PF 155.00, 456 orders) · GRIFFAIN-USDT $0.29 (PF 4.12, 41 orders); worst DRIFT-USDT -$1.36 (PF 0.05, 501 orders) · BR-USDT -$0.56 (PF 0.14, 250 orders) · W-USDT -$0.15 (PF 0.79, 789 orders).
- **Block volume:** ×1 $0.10 (unit PF 0.57, 4612).
- **Lanes:** 1m -$0.00 (PF 0.00, 12) · 1m+ $0.00 (PF –, 21) · 5m $0.00 (PF 2.45, 51) · 5m+ $0.00 (PF ∞ (no loss), 3) · 15m -$0.61 (PF 0.82, 3341) · 15m+ $1.06 (PF 6.61, 862) · 30m -$0.35 (PF 0.15, 322); **ranges:** Micro $0.00 (PF 2.47, 54) · Short $0.64 (PF 2.43, 1408) · General $0.27 (PF 28.17, 166) · Long $0.11 (PF 1.44, 158) · Wide -$0.00 (PF 0.93, 51) · Signals -$0.92 (PF 0.72, 2775); **sides:** Long -$0.11 (PF 0.89, 511) · Short $0.22 (PF 1.07, 4101).
- **Hours:** 12 green / 6 red / 0 flat of 18 full hours; first order opened 06:00 UTC; best hour 10:00 $0.64, worst hour 18:00 -$0.94.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 06:00 | $19.88 | $19.32 | 3.72 % | $13.98 | 54 | 27 / 0 / 27 | 41 | 2.03 | 2.11 | $0.18 | 0.90 | 0.94 | $0.18 | 2.03 |
| 07:00 | $20.15 | $19.53 | 2.68 % | $14.10 | 130 | 6 / 0 / 33 | 120 | 73.75 | 12.55 | $0.27 | 1.90 | 0.00 | $0.45 | 3.50 |
| 08:00 | $20.06 | $19.83 | 1.20 % | $14.10 | 126 | 7 / 3 / 37 | 102 | 0.70 | 2.35 | -$0.09 | 2.90 | – | $0.36 | 1.74 |
| 09:00 | $20.36 | $20.42 | 0.54 % | $14.25 | 194 | 3 / 2 / 38 | 158 | 7.25 | 5.28 | $0.31 | 0.12 | 0.08 | $0.66 | 2.24 |
| 10:00 | $21.01 | $20.10 | 2.23 % | $14.72 | 259 | 2 / 1 / 39 | 243 | 12.49 | 18.84 | $0.64 | 0.87 | 0.03 | $1.31 | 3.22 |
| 11:00 | $21.26 | $20.76 | 1.39 % | $14.88 | 206 | 4 / 0 / 43 | 172 | 6.87 | 4.03 | $0.25 | 0.23 | 0.08 | $1.56 | 3.47 |
| 12:00 | $21.38 | $20.19 | 4.13 % | $15.00 | 277 | 2 / 3 / 42 | 214 | 1.68 | 2.19 | $0.12 | 1.23 | 0.83 | $1.68 | 3.07 |
| 13:00 | $21.54 | $20.47 | 2.79 % | $15.07 | 373 | 3 / 1 / 44 | 321 | 1.56 | 4.90 | $0.15 | 2.23 | 0.97 | $1.84 | 2.69 |
| 14:00 | $21.66 | $20.90 | 0.76 % | $15.16 | 158 | 1 / 1 / 44 | 135 | 72.08 | 29.57 | $0.13 | 3.23 | 0.00 | $1.96 | 2.81 |
| 15:00 | $21.73 | $19.63 | 7.70 % | $15.23 | 284 | 2 / 3 / 43 | 227 | 1.69 | 2.24 | $0.07 | 0.92 | 0.56 | $2.03 | 2.71 |
| 16:00 | $21.51 | $20.08 | 5.59 % | $15.23 | 271 | 3 / 1 / 45 | 201 | 0.28 | 0.60 | -$0.22 | 1.92 | – | $1.81 | 2.21 |
| 17:00 | $21.55 | $19.70 | 7.37 % | $15.09 | 137 | 0 / 0 / 45 | 118 | 30.84 | 16.57 | $0.04 | 2.92 | 0.02 | $1.85 | 2.23 |
| 18:00 | $20.61 | $18.84 | 11.45 % | $15.10 | 367 | 1 / 0 / 46 | 143 | 0.04 | 0.09 | -$0.94 | 3.92 | – | $0.91 | 1.37 |
| 19:00 | $20.62 | $18.95 | 10.89 % | $14.43 | 73 | 1 / 0 / 47 | 55 | 3.22 | 1.91 | $0.01 | 4.92 | 0.30 | $0.92 | 1.37 |
| 20:00 | $20.36 | $18.29 | 14.02 % | $14.43 | 203 | 0 / 0 / 47 | 123 | 0.06 | 0.65 | -$0.26 | 5.92 | – | $0.66 | 1.24 |
| 21:00 | $20.49 | $18.78 | 11.71 % | $14.35 | 329 | 0 / 0 / 47 | 227 | 2.25 | 1.11 | $0.14 | 6.92 | 0.49 | $0.79 | 1.28 |
| 22:00 | $20.17 | $17.41 | 18.17 % | $14.35 | 773 | 0 / 1 / 46 | 164 | 0.49 | 0.09 | -$0.33 | 7.92 | – | $0.47 | 1.13 |
| 23:00 | $19.80 | $16.52 | 22.34 % | $14.12 | 398 | 0 / 0 / 46 | 61 | 0.23 | 0.04 | -$0.36 | 8.92 | – | $0.10 | 1.03 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 656 | 50 | 1.65 | 0.62 | 46.95 % | $0.26 | 10.00 | 0.57 | 0.72 % | 8 / 18 |
| Trailing | 1130 | 61 | 3.47 | 0.81 | 54.96 % | $0.76 | 11.00 | 0.11 | 0.42 % | 12 / 17 |
| Axis | 51 | 9 | 0.93 | 2.79 | 60.78 % | -$0.00 | 13.87 | – | 0.02 % | 4 / 8 |
| Signal · Normal | 668 | 46 | 0.63 | 0.42 | 58.23 % | -$0.37 | 8.75 | – | 3.37 % | 10 / 18 |
| Signal · Trailing | 2107 | 45 | 0.76 | 0.56 | 70.05 % | -$0.54 | 7.75 | – | 6.03 % | 11 / 18 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Plain | 656 | 50 | 1.65 | 0.62 | 46.95 % | $0.26 | 10.00 | 0.57 | 0.72 % | 8 / 18 |
| Trailing · Plain | 1130 | 61 | 3.47 | 0.81 | 54.96 % | $0.76 | 11.00 | 0.11 | 0.42 % | 12 / 17 |
| Axis · Plain | 51 | 9 | 0.93 | 2.79 | 60.78 % | -$0.00 | 13.87 | – | 0.02 % | 4 / 8 |
| Signal · Normal · Plain | 668 | 46 | 0.63 | 0.42 | 58.23 % | -$0.37 | 8.75 | – | 3.37 % | 10 / 18 |
| Signal · Trailing · Plain | 2107 | 45 | 0.76 | 0.56 | 70.05 % | -$0.54 | 7.75 | – | 6.03 % | 11 / 18 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| signal:williams-r | 174 | 17 | 9.89 | 1.37 | 77.01 % | $0.50 | 3.50 | 0.08 | 0.19 % | 13 / 17 |
| trend | 404 | 17 | 6.24 | 1.01 | 60.40 % | $0.49 | 3.25 | 0.09 | 0.23 % | 12 / 17 |
| smooth | 177 | 3 | 14.15 | 14.97 | 94.92 % | $0.44 | 8.00 | 0.05 | 0.12 % | 7 / 9 |
| osc | 507 | 23 | 3.14 | 0.44 | 44.18 % | $0.26 | 11.25 | 0.29 | 0.38 % | 9 / 15 |
| signal:supertrend | 58 | 9 | 36.97 | 1.92 | 86.21 % | $0.25 | 3.50 | 0.01 | 0.01 % | 11 / 11 |
| signal:s2-stoch-swing | 119 | 14 | 2.44 | 1.04 | 76.47 % | $0.17 | 11.75 | 0.51 | 0.43 % | 9 / 13 |
| signal:s2-vwap-axis | 16 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.11 | 0.00 | 0.00 | 0.00 % | 4 / 4 |
| signal:ema-cross | 29 | 2 | 216.68 | 635.18 | 93.10 % | $0.06 | 4.25 | 0.00 | 0.00 % | 5 / 6 |
| signal:adx | 48 | 6 | 2.32 | 0.26 | 52.08 % | $0.05 | 6.75 | 0.45 | 0.11 % | 8 / 11 |
| break | 218 | 25 | 3.13 | 0.45 | 42.20 % | $0.05 | 10.00 | 0.30 | 0.07 % | 7 / 16 |
| signal:s2-active-hf | 54 | 10 | 18.12 | 5.73 | 92.59 % | $0.05 | 2.00 | 0.06 | 0.01 % | 13 / 14 |
| signal:squeeze | 7 | 3 | 1022.25 | 61.87 | 71.43 % | $0.04 | 11.50 | 0.00 | 0.00 % | 3 / 5 |
| signal:s2-confluence | 67 | 9 | 66.36 | 10.13 | 91.04 % | $0.04 | 2.00 | 0.01 | 0.00 % | 9 / 10 |
| signal:ema-slope | 42 | 7 | 4448.00 | 618.02 | 97.62 % | $0.03 | 0.75 | 0.00 | 0.00 % | 10 / 10 |
| signal:s2-rsi-revert | 70 | 6 | 11.26 | 2.03 | 85.71 % | $0.02 | 3.75 | 0.07 | 0.01 % | 10 / 13 |
| signal:s2-st-trail | 30 | 2 | 2.23 | 1.11 | 76.67 % | $0.02 | 5.00 | 0.72 | 0.06 % | 4 / 5 |
| volume | 195 | 28 | 1.12 | 0.54 | 49.23 % | $0.01 | 11.00 | 6.52 | 0.48 % | 8 / 14 |
| signal:cmf | 27 | 5 | 16.14 | 1.35 | 77.78 % | $0.01 | 6.50 | 0.07 | 0.00 % | 4 / 7 |
| signal:zscore | 12 | 3 | 29.22 | 2.05 | 91.67 % | $0.01 | 0.75 | 0.04 | 0.00 % | 3 / 4 |
| signal:rsi-mid | 13 | 4 | 5332.50 | 576.12 | 92.31 % | $0.01 | 8.00 | 0.00 | 0.00 % | 3 / 4 |
| signal:mfi | 73 | 5 | 1.45 | 1.28 | 82.19 % | $0.01 | 6.00 | 1.58 | 0.08 % | 9 / 11 |
| signal:obv | 95 | 9 | 1.39 | 0.66 | 73.68 % | $0.01 | 2.00 | 2.27 | 0.11 % | 10 / 14 |
| bollinger | 48 | 7 | 6.85 | 0.63 | 64.58 % | $0.01 | 5.75 | 0.15 | 0.01 % | 4 / 9 |
| signal:ichimoku | 29 | 5 | 1.44 | 0.35 | 79.31 % | $0.01 | 2.00 | 2.24 | 0.07 % | 7 / 9 |
| signal:keltner | 27 | 3 | 1.75 | 0.36 | 59.26 % | $0.01 | 4.75 | 1.33 | 0.04 % | 7 / 10 |
| signal:impulse | 34 | 8 | 1.76 | 0.51 | 67.65 % | $0.01 | 9.00 | 1.06 | 0.03 % | 6 / 10 |
| signal:trix | 23 | 5 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 7 / 7 |
| signal:r-vol-regime | 13 | 3 | 115.17 | 111.55 | 84.62 % | $0.00 | 1.00 | 0.01 | 0.00 % | 5 / 5 |
| signal:s2-block-stack | 57 | 6 | 1.08 | 0.72 | 73.68 % | $0.00 | 7.75 | 7.45 | 0.12 % | 7 / 11 |
| signal:s2-ema-cross | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:volume-break | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:ema-cross-fast | 27 | 7 | 1.71 | 1.44 | 88.89 % | $0.00 | 3.50 | 1.07 | 0.01 % | 11 / 13 |
| signal:r-inside | 21 | 2 | 1.25 | 0.23 | 61.90 % | $0.00 | 7.25 | 4.05 | 0.01 % | 3 / 5 |
| signal:s2-bb-bounce | 52 | 5 | 1.21 | 0.61 | 65.38 % | $0.00 | 7.75 | 4.29 | 0.01 % | 6 / 9 |
| active | 66 | 20 | 1.11 | 0.44 | 59.09 % | $0.00 | 17.92 | 6.10 | 0.01 % | 5 / 10 |
| signal:donchian | 3 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| signal:cci | 28 | 9 | 1.00 | 0.60 | 75.00 % | $0.00 | 7.75 | 198.30 | 0.06 % | 5 / 10 |
| sar | 6 | 2 | 0.72 | 0.31 | 33.33 % | -$0.00 | 17.50 | – | 0.01 % | 1 / 4 |
| ema | 9 | 5 | 0.62 | 0.12 | 11.11 % | -$0.00 | 14.25 | – | 0.02 % | 1 / 4 |
| channel | 9 | 2 | 0.00 | 0.16 | 11.11 % | -$0.00 | 13.87 | – | 0.01 % | 1 / 2 |
| signal:bollinger | 60 | 7 | 0.93 | 0.92 | 71.67 % | -$0.00 | 2.25 | – | 0.14 % | 10 / 13 |
| signal:s2-range-shift | 2 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 13.25 | – | 0.01 % | 0 / 1 |
| signal:act-burst | 11 | 3 | 0.53 | 0.14 | 36.36 % | -$0.00 | 10.00 | – | 0.03 % | 2 / 4 |
| signal:hma | 45 | 10 | 0.89 | 0.75 | 68.89 % | -$0.00 | 7.50 | – | 0.13 % | 4 / 8 |
| signal:vwap | 42 | 8 | 0.57 | 0.18 | 47.62 % | -$0.00 | 9.25 | – | 0.05 % | 5 / 9 |
| signal:st-slow | 38 | 4 | 0.40 | 0.34 | 52.63 % | -$0.00 | 9.00 | – | 0.02 % | 2 / 6 |
| signal:r-fractal | 8 | 5 | 0.02 | 0.02 | 37.50 % | -$0.00 | 8.00 | – | 0.02 % | 2 / 6 |
| signal:r-session-trend | 41 | 9 | 0.54 | 0.87 | 70.73 % | -$0.00 | 2.75 | – | 0.04 % | 5 / 9 |
| signal:atr-break | 10 | 2 | 0.39 | 0.73 | 80.00 % | -$0.01 | 3.75 | – | 0.04 % | 3 / 5 |
| signal:thrust | 75 | 8 | 0.78 | 2.13 | 78.67 % | -$0.01 | 4.00 | – | 0.17 % | 11 / 14 |
| signal:s2-adx-gate | 48 | 8 | 0.60 | 0.46 | 66.67 % | -$0.01 | 3.25 | – | 0.16 % | 7 / 11 |
| signal:swing | 20 | 7 | 0.52 | 0.19 | 60.00 % | -$0.01 | 2.25 | – | 0.15 % | 5 / 7 |
| signal:r-linreg | 73 | 8 | 0.64 | 0.52 | 60.27 % | -$0.02 | 4.00 | – | 0.27 % | 7 / 10 |
| signal:s2-vol-break | 7 | 3 | 0.02 | 0.12 | 57.14 % | -$0.02 | 7.75 | – | 0.10 % | 2 / 3 |
| signal:act-hf | 36 | 9 | 0.20 | 0.09 | 41.67 % | -$0.02 | 5.75 | – | 0.13 % | 4 / 7 |
| signal:s2-block-scale | 35 | 11 | 0.28 | 0.11 | 40.00 % | -$0.02 | 5.75 | – | 0.15 % | 6 / 10 |
| signal:sar | 50 | 11 | 0.75 | 0.23 | 48.00 % | -$0.02 | 2.75 | – | 0.23 % | 4 / 7 |
| signal:macd-cross | 124 | 11 | 0.63 | 0.67 | 74.19 % | -$0.02 | 4.75 | – | 0.31 % | 10 / 15 |
| signal:macd-slow | 74 | 8 | 0.62 | 0.24 | 58.11 % | -$0.03 | 5.75 | – | 0.27 % | 8 / 12 |
| signal:ema-pullback | 104 | 11 | 0.44 | 1.83 | 86.54 % | -$0.03 | 4.50 | – | 0.24 % | 12 / 14 |
| signal:reclaim | 72 | 11 | 0.31 | 0.36 | 62.50 % | -$0.03 | 7.75 | – | 0.17 % | 8 / 15 |
| rsi | 28 | 6 | 0.17 | 0.13 | 28.57 % | -$0.03 | 18.00 | – | 0.18 % | 2 / 6 |
| signal:macd-hist | 59 | 14 | 0.28 | 0.17 | 49.15 % | -$0.03 | 3.75 | – | 0.22 % | 8 / 14 |
| signal:stoch-rsi | 92 | 13 | 0.36 | 0.25 | 51.09 % | -$0.03 | 5.75 | – | 0.23 % | 6 / 14 |
| signal:kama | 71 | 8 | 0.02 | 0.12 | 42.25 % | -$0.04 | 8.25 | – | 0.23 % | 8 / 14 |
| signal:r-awesome | 32 | 7 | 0.07 | 0.05 | 34.38 % | -$0.05 | 7.75 | – | 0.28 % | 4 / 9 |
| signal:heikin-ashi | 46 | 12 | 0.06 | 0.14 | 39.13 % | -$0.05 | 8.00 | – | 0.29 % | 4 / 8 |
| move | 63 | 15 | 0.30 | 0.26 | 33.33 % | -$0.06 | 18.00 | – | 0.31 % | 3 / 11 |
| macd | 34 | 10 | 0.07 | 0.05 | 17.65 % | -$0.07 | 15.75 | – | 0.35 % | 3 / 11 |
| direction | 73 | 14 | 0.28 | 0.42 | 36.99 % | -$0.08 | 15.75 | – | 0.54 % | 1 / 11 |
| signal:r-connors | 65 | 9 | 0.25 | 0.17 | 50.77 % | -$0.10 | 8.00 | – | 0.65 % | 5 / 10 |
| signal:s2-atr-break | 33 | 7 | 0.02 | 0.04 | 18.18 % | -$0.13 | 11.75 | – | 0.68 % | 2 / 9 |
| signal:rsi-reversal | 30 | 3 | 0.00 | 0.03 | 26.67 % | -$0.18 | 13.50 | – | 0.90 % | 2 / 6 |
| signal:ema-trend | 72 | 7 | 0.17 | 0.17 | 48.61 % | -$0.52 | 18.00 | – | 2.62 % | 6 / 11 |
| signal:r-nr-break | 43 | 9 | 0.00 | 0.09 | 39.53 % | -$0.93 | 17.75 | – | 4.71 % | 1 / 8 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| williams-r | 174 | 17 | 9.89 | 1.37 | 77.01 % | $0.50 | 3.50 | 0.08 | 0.19 % | 13 / 17 |
| supertrend | 58 | 9 | 36.97 | 1.92 | 86.21 % | $0.25 | 3.50 | 0.01 | 0.01 % | 11 / 11 |
| s2-stoch-swing | 119 | 14 | 2.44 | 1.04 | 76.47 % | $0.17 | 11.75 | 0.51 | 0.43 % | 9 / 13 |
| s2-vwap-axis | 16 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.11 | 0.00 | 0.00 | 0.00 % | 4 / 4 |
| ema-cross | 29 | 2 | 216.68 | 635.18 | 93.10 % | $0.06 | 4.25 | 0.00 | 0.00 % | 5 / 6 |
| adx | 48 | 6 | 2.32 | 0.26 | 52.08 % | $0.05 | 6.75 | 0.45 | 0.11 % | 8 / 11 |
| s2-active-hf | 54 | 10 | 18.12 | 5.73 | 92.59 % | $0.05 | 2.00 | 0.06 | 0.01 % | 13 / 14 |
| squeeze | 7 | 3 | 1022.25 | 61.87 | 71.43 % | $0.04 | 11.50 | 0.00 | 0.00 % | 3 / 5 |
| s2-confluence | 67 | 9 | 66.36 | 10.13 | 91.04 % | $0.04 | 2.00 | 0.01 | 0.00 % | 9 / 10 |
| ema-slope | 42 | 7 | 4448.00 | 618.02 | 97.62 % | $0.03 | 0.75 | 0.00 | 0.00 % | 10 / 10 |
| s2-rsi-revert | 70 | 6 | 11.26 | 2.03 | 85.71 % | $0.02 | 3.75 | 0.07 | 0.01 % | 10 / 13 |
| s2-st-trail | 30 | 2 | 2.23 | 1.11 | 76.67 % | $0.02 | 5.00 | 0.72 | 0.06 % | 4 / 5 |
| cmf | 27 | 5 | 16.14 | 1.35 | 77.78 % | $0.01 | 6.50 | 0.07 | 0.00 % | 4 / 7 |
| zscore | 12 | 3 | 29.22 | 2.05 | 91.67 % | $0.01 | 0.75 | 0.04 | 0.00 % | 3 / 4 |
| rsi-mid | 13 | 4 | 5332.50 | 576.12 | 92.31 % | $0.01 | 8.00 | 0.00 | 0.00 % | 3 / 4 |
| mfi | 73 | 5 | 1.45 | 1.28 | 82.19 % | $0.01 | 6.00 | 1.58 | 0.08 % | 9 / 11 |
| obv | 95 | 9 | 1.39 | 0.66 | 73.68 % | $0.01 | 2.00 | 2.27 | 0.11 % | 10 / 14 |
| ichimoku | 29 | 5 | 1.44 | 0.35 | 79.31 % | $0.01 | 2.00 | 2.24 | 0.07 % | 7 / 9 |
| keltner | 27 | 3 | 1.75 | 0.36 | 59.26 % | $0.01 | 4.75 | 1.33 | 0.04 % | 7 / 10 |
| impulse | 34 | 8 | 1.76 | 0.51 | 67.65 % | $0.01 | 9.00 | 1.06 | 0.03 % | 6 / 10 |
| trix | 23 | 5 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 7 / 7 |
| r-vol-regime | 13 | 3 | 115.17 | 111.55 | 84.62 % | $0.00 | 1.00 | 0.01 | 0.00 % | 5 / 5 |
| s2-block-stack | 57 | 6 | 1.08 | 0.72 | 73.68 % | $0.00 | 7.75 | 7.45 | 0.12 % | 7 / 11 |
| s2-ema-cross | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| volume-break | 5 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| ema-cross-fast | 27 | 7 | 1.71 | 1.44 | 88.89 % | $0.00 | 3.50 | 1.07 | 0.01 % | 11 / 13 |
| r-inside | 21 | 2 | 1.25 | 0.23 | 61.90 % | $0.00 | 7.25 | 4.05 | 0.01 % | 3 / 5 |
| s2-bb-bounce | 52 | 5 | 1.21 | 0.61 | 65.38 % | $0.00 | 7.75 | 4.29 | 0.01 % | 6 / 9 |
| donchian | 3 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| cci | 28 | 9 | 1.00 | 0.60 | 75.00 % | $0.00 | 7.75 | 198.30 | 0.06 % | 5 / 10 |
| bollinger | 60 | 7 | 0.93 | 0.92 | 71.67 % | -$0.00 | 2.25 | – | 0.14 % | 10 / 13 |
| s2-range-shift | 2 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 13.25 | – | 0.01 % | 0 / 1 |
| act-burst | 11 | 3 | 0.53 | 0.14 | 36.36 % | -$0.00 | 10.00 | – | 0.03 % | 2 / 4 |
| hma | 45 | 10 | 0.89 | 0.75 | 68.89 % | -$0.00 | 7.50 | – | 0.13 % | 4 / 8 |
| vwap | 42 | 8 | 0.57 | 0.18 | 47.62 % | -$0.00 | 9.25 | – | 0.05 % | 5 / 9 |
| st-slow | 38 | 4 | 0.40 | 0.34 | 52.63 % | -$0.00 | 9.00 | – | 0.02 % | 2 / 6 |
| r-fractal | 8 | 5 | 0.02 | 0.02 | 37.50 % | -$0.00 | 8.00 | – | 0.02 % | 2 / 6 |
| r-session-trend | 41 | 9 | 0.54 | 0.87 | 70.73 % | -$0.00 | 2.75 | – | 0.04 % | 5 / 9 |
| atr-break | 10 | 2 | 0.39 | 0.73 | 80.00 % | -$0.01 | 3.75 | – | 0.04 % | 3 / 5 |
| thrust | 75 | 8 | 0.78 | 2.13 | 78.67 % | -$0.01 | 4.00 | – | 0.17 % | 11 / 14 |
| s2-adx-gate | 48 | 8 | 0.60 | 0.46 | 66.67 % | -$0.01 | 3.25 | – | 0.16 % | 7 / 11 |
| swing | 20 | 7 | 0.52 | 0.19 | 60.00 % | -$0.01 | 2.25 | – | 0.15 % | 5 / 7 |
| r-linreg | 73 | 8 | 0.64 | 0.52 | 60.27 % | -$0.02 | 4.00 | – | 0.27 % | 7 / 10 |
| s2-vol-break | 7 | 3 | 0.02 | 0.12 | 57.14 % | -$0.02 | 7.75 | – | 0.10 % | 2 / 3 |
| act-hf | 36 | 9 | 0.20 | 0.09 | 41.67 % | -$0.02 | 5.75 | – | 0.13 % | 4 / 7 |
| s2-block-scale | 35 | 11 | 0.28 | 0.11 | 40.00 % | -$0.02 | 5.75 | – | 0.15 % | 6 / 10 |
| sar | 50 | 11 | 0.75 | 0.23 | 48.00 % | -$0.02 | 2.75 | – | 0.23 % | 4 / 7 |
| macd-cross | 124 | 11 | 0.63 | 0.67 | 74.19 % | -$0.02 | 4.75 | – | 0.31 % | 10 / 15 |
| macd-slow | 74 | 8 | 0.62 | 0.24 | 58.11 % | -$0.03 | 5.75 | – | 0.27 % | 8 / 12 |
| ema-pullback | 104 | 11 | 0.44 | 1.83 | 86.54 % | -$0.03 | 4.50 | – | 0.24 % | 12 / 14 |
| reclaim | 72 | 11 | 0.31 | 0.36 | 62.50 % | -$0.03 | 7.75 | – | 0.17 % | 8 / 15 |
| macd-hist | 59 | 14 | 0.28 | 0.17 | 49.15 % | -$0.03 | 3.75 | – | 0.22 % | 8 / 14 |
| stoch-rsi | 92 | 13 | 0.36 | 0.25 | 51.09 % | -$0.03 | 5.75 | – | 0.23 % | 6 / 14 |
| kama | 71 | 8 | 0.02 | 0.12 | 42.25 % | -$0.04 | 8.25 | – | 0.23 % | 8 / 14 |
| r-awesome | 32 | 7 | 0.07 | 0.05 | 34.38 % | -$0.05 | 7.75 | – | 0.28 % | 4 / 9 |
| heikin-ashi | 46 | 12 | 0.06 | 0.14 | 39.13 % | -$0.05 | 8.00 | – | 0.29 % | 4 / 8 |
| r-connors | 65 | 9 | 0.25 | 0.17 | 50.77 % | -$0.10 | 8.00 | – | 0.65 % | 5 / 10 |
| s2-atr-break | 33 | 7 | 0.02 | 0.04 | 18.18 % | -$0.13 | 11.75 | – | 0.68 % | 2 / 9 |
| rsi-reversal | 30 | 3 | 0.00 | 0.03 | 26.67 % | -$0.18 | 13.50 | – | 0.90 % | 2 / 6 |
| ema-trend | 72 | 7 | 0.17 | 0.17 | 48.61 % | -$0.52 | 18.00 | – | 2.62 % | 6 / 11 |
| r-nr-break | 43 | 9 | 0.00 | 0.09 | 39.53 % | -$0.93 | 17.75 | – | 4.71 % | 1 / 8 |

Window of 18 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
