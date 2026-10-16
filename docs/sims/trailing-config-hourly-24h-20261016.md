# 24 h simulated session — 4 symbols, 48 h pre-historic + 24 h run

> Historical baseline: this replay predates the expanded 86-cell Signal grid. See [`expanded-grid validation`](../trailing-signal-expanded-grid-20261016.md) for the run with the lower defaults.

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-11 21:00 → 2026-10-13 21:00 UTC, run 2026-10-13 21:00 → 2026-10-14 21:00 UTC. Signals use the same 48 h minimal evaluated history; no additional Signal warmup was loaded. Symbols: ATOM-USDT, APT-USDT, NEAR-USDT, DOT-USDT.

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.

Settings (desk, flags): stage gate min PF 1.1, focus 37 pairs, disabled kinds none, toggles normal / trailing / block / dca, ranges micro / minimal / short / general / long (micro on), caps: positions none, signal positions 100, coordination on, signals validated on their last 25. Block overall, 8 levels, Active from 2, ratio 0.5, total max 8× including base and all sources. Balance $10.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

The supporting HTML chart bundle, raw engine dump, and preflight are preserved in the local ignored run folder; this tracked summary contains the reviewed hourly, range, Signal, and execution tables.

## Result

| balance | equity at end | net | Return PF | cash PF diagnostic | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $10.00 → $10.38 | $10.13 | $0.38 (3.83 %) | 4.96 | 1.91 | 8.22 | 0.58 | $0.33 (3.27 %) | 2212 | 15 | 82.64 % | 13 / 24 | $4.03 |

Simulated live sizing replay (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 7 positions / 362 orders, MTM -$0.25 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 191 orders capped to $0, 2119 scaled down (open at end: 11 capped, 335 scaled) · binding: position cap 2656, gross cap 0. **Without the caps:** balance $10.00 → $35.88 (258.77 %) · Return PF 5.47 · cash PF diagnostic 6.12 · equity at end $19.73 · equity max drawdown $37.28 (97.50 %) · margin used max $316.45 · infeasible: margin exceeded equity for 1306 min.

Separate virtual diagnostic: 2403 closes · Return PF 5.47 before funding allocation; 191 zero allocations, 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

Return PF is primary: positive net returns ÷ absolute negative net returns of the funded settled orders, after modeled costs. Cash PF is a separate diagnostic on those same orders after sizing (2.0 % of the realized equity per unit, compounding, × the Block multiple). At a fixed unit of $0.20 (no compounding) the same orders net $2.38 (23.80 %), closed-order max drawdown $0.28.

Engine Base 85/794 pairs passed; Signals 47/504 representative pairs pass the diagnostic gate (excluded from Base totals) (per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 11/154 · PF 1.79 · Micro 27/640 · PF 2.23 · Minimal 64/794 · PF 1.85 · Short 17/89 · PF 1.80 · General 12/89 · PF 1.64 · Long 11/89 · PF 1.51 · Signals 47/504 · PF 1.45), Main 85 pairs, 53035 tapes, Real seats: 1935 engine configs + 2690 signal configs (every config of the active signals), compute 16 s, peak RSS 997 MB. Consistency checks: 65 of 65 pass.

## Findings

- **Strategy types positive:** Normal $0.26 (PF 7.06, 612 orders) · Trailing $0.08 (PF 3.90, 1540 orders) · Signal · Trailing $0.02 (PF 20.22, 27 orders) · Signal · Normal $0.01 (PF ∞ (no loss), 16 orders) · DCA $0.00 (PF 11.34, 17 orders).
- **Strategy types losing:** none.
- **Engine vs signals:** Engine $0.35 (PF 4.83, 2169 orders) · Signals $0.03 (PF 51.27, 43 orders).
- **Indication kinds positive:** ichimoku $0.16 (PF 10.49, 758 orders) · active $0.12 (PF 2.49, 1156 orders) · rsi $0.06 (PF 21.24, 192 orders) · bollinger $0.02 (PF 60.63, 62 orders) · signal:ema-trend $0.01 (PF ∞ (no loss), 4 orders) · signal:s2-ema-cross $0.01 (PF 22.52, 9 orders).
- **Indication kinds losing:** ema -$0.01 (PF 0.00, 1 orders) · signal:ema-slope -$0.00 (PF 0.00, 1 orders).
- **Signal sources positive:** ema-trend $0.01 (PF ∞ (no loss), 4 orders) · s2-ema-cross $0.01 (PF 22.52, 9 orders) · act-burst $0.01 (PF ∞ (no loss), 2 orders) · reclaim $0.00 (PF ∞ (no loss), 1 orders) · rsi-mid $0.00 (PF ∞ (no loss), 6 orders) · supertrend $0.00 (PF 21.08, 9 orders) · ema-cross-fast $0.00 (PF ∞ (no loss), 3 orders) · r-session-trend $0.00 (PF 10.31, 2 orders).
- **Signal sources losing:** ema-slope -$0.00 (PF 0.00, 1 orders).
- **Symbols:** best APT-USDT $0.20 (PF 63.39, 304 orders) · ATOM-USDT $0.14 (PF 3.05, 969 orders) · NEAR-USDT $0.09 (PF 4.53, 462 orders); worst DOT-USDT -$0.04 (PF 11.65, 477 orders).
- **Block volume:** ×1 $0.13 (Return PF 14.49, 284) · ×1–1.5 -$0.00 (Return PF 0.00, 1) · ×1.5–2 $0.03 (Return PF ∞ (no loss), 6) · ×4–6 -$0.20 (Return PF 0.89, 291) · ×6–8 $0.42 (Return PF 13.73, 1630).
- **Lanes:** 1m $0.15 (PF 2.66, 92) · 5m $0.17 (PF 81.83, 1076) · 5m+ $0.16 (PF 10.49, 758) · 15m -$0.10 (PF 0.26, 285) · 30m -$0.01 (PF 0.00, 1); **ranges:** Micro -$0.03 (PF 1.54, 434) · Minimal $0.39 (PF 7.34, 1717) · Short $0.00 (PF –, 0) · Long -$0.01 (PF 0.00, 1) · Wide $0.00 (PF 11.34, 17) · Signals $0.03 (PF 51.27, 43); **sides:** Long -$0.28 (PF 0.02, 160) · Short $0.66 (PF 17.41, 2052).
- **Hours:** 13 green / 5 red / 6 flat of 24 full hours; first order opened 21:00 UTC; best hour 14:00 $0.30, worst hour 05:00 -$0.16.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | Return PF | cash PF diagnostic | net | DDT now (h) | DDR (hour) | cum net | cum Return PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | $10.00 | $10.00 | 0.01 % | $0.02 | 0 | 1 / 0 / 1 | 0 | – | – | $0.00 | 0.07 | – | $0.00 | – |
| 22:00 | $10.01 | $9.99 | 0.55 % | $0.77 | 67 | 1 / 0 / 2 | 37 | 5.84 | 5.84 | $0.01 | 0.18 | 0.09 | $0.01 | 5.84 |
| 23:00 | $10.01 | $9.98 | 0.57 % | $1.47 | 8 | 0 / 0 / 2 | 8 | ∞ (no loss) | ∞ (no loss) | $0.00 | 1.18 | 0.00 | $0.01 | 6.05 |
| 00:00 | $10.01 | $9.93 | 1.13 % | $2.22 | 32 | 1 / 0 / 3 | 2 | 0.13 | 0.13 | -$0.00 | 2.18 | – | $0.01 | 3.20 |
| 01:00 | $10.01 | $9.82 | 2.19 % | $2.54 | 17 | 1 / 0 / 4 | 12 | 0.56 | 0.92 | -$0.00 | 3.18 | – | $0.01 | 1.95 |
| 02:00 | $10.01 | $9.77 | 2.74 % | $2.49 | 0 | 0 / 0 / 4 | 0 | – | – | $0.00 | 4.18 | – | $0.01 | 1.95 |
| 03:00 | $10.04 | $9.83 | 2.15 % | $2.77 | 46 | 0 / 0 / 4 | 24 | 0.88 | 2.90 | $0.04 | 5.18 | 0.37 | $0.04 | 1.26 |
| 04:00 | $10.04 | $9.82 | 2.19 % | $2.43 | 0 | 0 / 0 / 4 | 0 | – | – | $0.00 | 6.18 | – | $0.04 | 1.26 |
| 05:00 | $9.89 | $9.91 | 1.31 % | $2.63 | 72 | 0 / 2 / 2 | 16 | 0.13 | 0.35 | -$0.16 | 7.18 | – | -$0.11 | 0.46 |
| 06:00 | $9.89 | $9.88 | 1.58 % | $0.85 | 8 | 0 / 0 / 2 | 4 | 2.14 | 2.14 | $0.00 | 8.18 | 0.88 | -$0.11 | 0.46 |
| 07:00 | $9.89 | $9.86 | 1.80 % | $0.53 | 7 | 0 / 0 / 2 | 6 | 0.32 | 1.04 | $0.00 | 9.18 | 23.27 | -$0.11 | 0.46 |
| 08:00 | $9.89 | $9.87 | 1.67 % | $1.35 | 0 | 3 / 0 / 5 | 0 | – | – | $0.00 | 10.18 | – | -$0.11 | 0.46 |
| 09:00 | $9.96 | $9.93 | 1.15 % | $1.35 | 16 | 0 / 2 / 3 | 10 | 0.69 | 7.80 | $0.07 | 11.18 | 0.10 | -$0.04 | 0.48 |
| 10:00 | $9.96 | $9.90 | 1.44 % | $0.56 | 0 | 0 / 0 / 3 | 0 | – | – | $0.00 | 12.18 | – | -$0.04 | 0.48 |
| 11:00 | $9.96 | $9.88 | 1.61 % | $0.56 | 0 | 0 / 0 / 3 | 0 | – | – | $0.00 | 13.18 | – | -$0.04 | 0.48 |
| 12:00 | $9.95 | $9.89 | 1.46 % | $2.57 | 143 | 5 / 4 / 4 | 133 | 5.53 | 0.98 | -$0.00 | 14.18 | – | -$0.05 | 1.15 |
| 13:00 | $10.01 | $10.14 | 0.00 % | $2.81 | 197 | 0 / 0 / 4 | 119 | 11.18 | 7.57 | $0.06 | 0.00 | 0.13 | $0.01 | 1.49 |
| 14:00 | $10.32 | $10.13 | 2.57 % | $2.84 | 1261 | 3 / 1 / 6 | 1185 | 13.97 | 21.16 | $0.30 | 0.77 | 0.04 | $0.32 | 4.32 |
| 15:00 | $10.36 | $10.37 | 0.37 % | $1.94 | 132 | 0 / 0 / 6 | 132 | ∞ (no loss) | ∞ (no loss) | $0.04 | 0.12 | 0.00 | $0.36 | 4.71 |
| 16:00 | $10.36 | $10.21 | 1.87 % | $1.84 | 37 | 0 / 0 / 6 | 31 | 5.20 | 6.06 | $0.00 | 1.12 | 0.19 | $0.36 | 4.71 |
| 17:00 | $10.37 | $10.18 | 2.17 % | $3.58 | 14 | 1 / 0 / 7 | 14 | ∞ (no loss) | ∞ (no loss) | $0.01 | 2.12 | 0.00 | $0.37 | 4.77 |
| 18:00 | $10.38 | $10.16 | 2.36 % | $3.76 | 140 | 0 / 0 / 7 | 83 | 16.42 | 15.67 | $0.02 | 3.12 | 0.06 | $0.38 | 4.91 |
| 19:00 | $10.39 | $10.18 | 2.17 % | $3.76 | 12 | 0 / 0 / 7 | 12 | ∞ (no loss) | ∞ (no loss) | $0.00 | 4.12 | 0.00 | $0.39 | 4.96 |
| 20:00 | $10.38 | $10.13 | 2.66 % | $4.03 | 3 | 0 / 0 / 7 | 0 | 0.00 | 0.00 | -$0.01 | 5.12 | – | $0.38 | 4.96 |

## Per strategy type

| type | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 612 | 10 | 7.06 | 3.56 | 93.46 % | $0.26 | 6.72 | 0.29 | 0.77 % | 12 / 13 |
| Trailing | 1540 | 14 | 3.90 | 1.26 | 78.25 % | $0.08 | 8.87 | 1.90 | 1.57 % | 9 / 16 |
| Trailing only | 0 | 0 | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| DCA | 17 | 7 | 11.34 | 4.35 | 88.24 % | $0.00 | 15.75 | 0.29 | 0.01 % | 6 / 8 |
| Signal · Normal | 16 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| Signal · Trailing | 27 | 5 | 20.22 | 35.45 | 74.07 % | $0.02 | 3.92 | 0.03 | 0.00 % | 5 / 6 |
| Signal · Trailing only | 0 | 0 | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |

| type · sub-type | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block | 534 | 11 | 6.27 | 3.10 | 92.51 % | $0.22 | 11.33 | 0.37 | 0.79 % | 10 / 12 |
| Normal · Plain | 78 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.05 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| Trailing · Block | 1377 | 12 | 3.71 | 1.10 | 79.81 % | $0.03 | 8.95 | 5.07 | 1.58 % | 7 / 13 |
| Trailing · Plain | 163 | 4 | 6.96 | 3.91 | 65.03 % | $0.05 | 10.65 | 0.17 | 0.09 % | 3 / 6 |
| DCA · Block | 16 | 6 | 11.03 | 4.16 | 87.50 % | $0.00 | 15.50 | 0.31 | 0.01 % | 5 / 7 |
| DCA · Plain | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| Signal · Normal · Plain | 16 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| Signal · Trailing · Block | 1 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 3.25 | – | 0.00 % | 0 / 1 |
| Signal · Trailing · Plain | 26 | 4 | 21.39 | 35.66 | 76.92 % | $0.02 | 3.92 | 0.03 | 0.00 % | 5 / 6 |

## Per indication kind

| indication kind | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ichimoku | 758 | 4 | 10.49 | 12.14 | 91.69 % | $0.16 | 1.92 | 0.08 | 0.13 % | 7 / 8 |
| active | 1156 | 12 | 2.49 | 1.39 | 76.90 % | $0.12 | 10.73 | 2.00 | 2.41 % | 12 / 15 |
| rsi | 192 | 7 | 21.24 | 1.61 | 84.38 % | $0.06 | 11.48 | 1.64 | 0.91 % | 3 / 4 |
| bollinger | 62 | 3 | 60.63 | 27.13 | 74.19 % | $0.02 | 4.00 | 0.03 | 0.01 % | 2 / 4 |
| signal:ema-trend | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:s2-ema-cross | 9 | 1 | 22.52 | 22.50 | 77.78 % | $0.01 | 3.92 | 0.05 | 0.00 % | 5 / 6 |
| signal:act-burst | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:reclaim | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:rsi-mid | 6 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:supertrend | 9 | 1 | 21.08 | 20.68 | 66.67 % | $0.00 | 5.67 | 0.05 | 0.00 % | 2 / 3 |
| signal:ema-cross-fast | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:r-session-trend | 2 | 1 | 10.31 | 9.90 | 50.00 % | $0.00 | 6.17 | 0.11 | 0.00 % | 1 / 2 |
| signal:trix | 6 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| break | 0 | 1 | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| trend | 0 | 1 | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| signal:ema-slope | 1 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 3.25 | – | 0.00 % | 0 / 1 |
| ema | 1 | 1 | 0.00 | 0.00 | 0.00 % | -$0.01 | 24.00 | – | 0.07 % | 0 / 1 |

## Per signal source

| source | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ema-trend | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-ema-cross | 9 | 1 | 22.52 | 22.50 | 77.78 % | $0.01 | 3.92 | 0.05 | 0.00 % | 5 / 6 |
| act-burst | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| reclaim | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| rsi-mid | 6 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| supertrend | 9 | 1 | 21.08 | 20.68 | 66.67 % | $0.00 | 5.67 | 0.05 | 0.00 % | 2 / 3 |
| ema-cross-fast | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| r-session-trend | 2 | 1 | 10.31 | 9.90 | 50.00 % | $0.00 | 6.17 | 0.11 | 0.00 % | 1 / 2 |
| trix | 6 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| ema-slope | 1 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 3.25 | – | 0.00 % | 0 / 1 |

Window of 24 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
