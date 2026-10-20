# 12 h simulated session — 4 symbols, 48 h pre-historic + 12 h run

> Historical baseline: this replay predates the expanded 86-cell Signal grid. See [`expanded-grid validation`](../trailing-signal-expanded-grid-20261016.md) for the run with the lower defaults.

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-12 09:00 → 2026-10-14 09:00 UTC, run 2026-10-14 09:00 → 2026-10-14 21:00 UTC. Signals use the same 48 h minimal evaluated history; no additional Signal warmup was loaded. Symbols: ATOM-USDT, APT-USDT, NEAR-USDT, DOT-USDT.

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.

Settings (desk, flags): stage gate min PF 1.1, focus 37 pairs, disabled kinds none, toggles normal / trailing / block / dca, ranges micro / minimal / short / general / long (micro on), caps: positions none, signal positions 100, coordination on, signals validated on their last 25. Block overall, 8 levels, Active from 2, ratio 0.5, total max 8× including base and all sources. Balance $10.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

The supporting HTML chart bundle, raw engine dump, and preflight are preserved in the local ignored run folder; this tracked summary contains the reviewed hourly, range, Signal, and execution tables.

## Result

| balance | equity at end | net | Return PF | cash PF diagnostic | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $10.00 → $10.42 | $10.15 | $0.42 (4.20 %) | 15.69 | 12.99 | 1.92 | 0.03 | $0.35 (3.35 %) | 1805 | 9 | 87.81 % | 8 / 12 | $3.96 |

Simulated live sizing replay (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 6 positions / 357 orders, MTM -$0.27 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 138 orders capped to $0, 1769 scaled down (open at end: 11 capped, 337 scaled) · binding: position cap 2255, gross cap 0. **Without the caps:** balance $10.00 → $30.74 (207.44 %) · Return PF 16.83 · cash PF diagnostic 9.27 · equity at end $16.86 · equity max drawdown $31.99 (97.75 %) · margin used max $271.31 · infeasible: margin exceeded equity for 506 min.

Separate virtual diagnostic: 1943 closes · Return PF 16.83 before funding allocation; 138 zero allocations, 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

Return PF is primary: positive net returns ÷ absolute negative net returns of the funded settled orders, after modeled costs. Cash PF is a separate diagnostic on those same orders after sizing (2.0 % of the realized equity per unit, compounding, × the Block multiple). At a fixed unit of $0.20 (no compounding) the same orders net $2.34 (23.37 %), closed-order max drawdown $0.12.

Engine Base 78/794 pairs passed; Signals 44/504 representative pairs pass the diagnostic gate (excluded from Base totals) (per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 11/154 · PF 1.75 · Micro 27/640 · PF 2.05 · Minimal 60/794 · PF 1.85 · Short 15/89 · PF 1.77 · General 12/89 · PF 1.53 · Long 10/89 · PF 1.63 · Signals 44/504 · PF 1.45), Main 78 pairs, 50169 tapes, Real seats: 1935 engine configs + 2726 signal configs (every config of the active signals), compute 12 s, peak RSS 877 MB. Consistency checks: 65 of 65 pass.

## Findings

- **Strategy types positive:** Normal $0.20 (PF 13.27, 468 orders) · Trailing $0.18 (PF 16.83, 1283 orders) · Signal · Trailing $0.02 (PF 20.22, 27 orders) · Signal · Normal $0.01 (PF ∞ (no loss), 16 orders) · DCA $0.00 (PF 290.60, 11 orders).
- **Strategy types losing:** none.
- **Engine vs signals:** Engine $0.39 (PF 15.33, 1762 orders) · Signals $0.03 (PF 51.27, 43 orders).
- **Indication kinds positive:** ichimoku $0.18 (PF 10.49, 758 orders) · active $0.17 (PF 47.42, 892 orders) · bollinger $0.03 (PF 60.63, 62 orders) · signal:ema-trend $0.01 (PF ∞ (no loss), 4 orders) · signal:s2-ema-cross $0.01 (PF 22.52, 9 orders) · signal:act-burst $0.01 (PF ∞ (no loss), 2 orders).
- **Indication kinds losing:** signal:ema-slope -$0.00 (PF 0.00, 1 orders).
- **Signal sources positive:** ema-trend $0.01 (PF ∞ (no loss), 4 orders) · s2-ema-cross $0.01 (PF 22.52, 9 orders) · act-burst $0.01 (PF ∞ (no loss), 2 orders) · reclaim $0.00 (PF ∞ (no loss), 1 orders) · rsi-mid $0.00 (PF ∞ (no loss), 6 orders) · supertrend $0.00 (PF 21.08, 9 orders) · ema-cross-fast $0.00 (PF ∞ (no loss), 3 orders) · r-session-trend $0.00 (PF 10.31, 2 orders).
- **Signal sources losing:** ema-slope -$0.00 (PF 0.00, 1 orders).
- **Symbols:** best ATOM-USDT $0.12 (PF 49.87, 592 orders) · APT-USDT $0.11 (PF 62.85, 302 orders) · NEAR-USDT $0.10 (PF 4.73, 446 orders); worst none.
- **Block volume:** ×1 $0.10 (Return PF 201.05, 167) · ×1–1.5 -$0.00 (Return PF 0.00, 1) · ×3–4 $0.03 (Return PF ∞ (no loss), 3) · ×4–6 $0.08 (Return PF 41.28, 188) · ×6–8 $0.20 (Return PF 12.24, 1446).
- **Lanes:** 1m $0.09 (PF ∞ (no loss), 14) · 5m $0.15 (PF 63.68, 954) · 5m+ $0.18 (PF 10.49, 758) · 15m -$0.01 (PF 2.87, 79); **ranges:** Micro $0.02 (PF 108.03, 288) · Minimal $0.36 (PF 13.32, 1463) · Short $0.00 (PF –, 0) · Wide $0.00 (PF 290.60, 11) · Signals $0.03 (PF 51.27, 43); **sides:** Long $0.01 (PF 0.58, 30) · Short $0.41 (PF 16.66, 1775).
- **Hours:** 8 green / 1 red / 3 flat of 12 full hours; first order opened 12:00 UTC; best hour 14:00 $0.29, worst hour 20:00 -$0.01.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | Return PF | cash PF diagnostic | net | DDT now (h) | DDR (hour) | cum net | cum Return PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 09:00 | $10.00 | $10.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 10:00 | $10.00 | $10.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 11:00 | $10.00 | $10.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 12:00 | $10.02 | $9.95 | 0.79 % | $2.54 | 9 | 6 / 2 / 4 | 9 | ∞ (no loss) | ∞ (no loss) | $0.02 | 0.48 | 0.00 | $0.02 | ∞ (no loss) |
| 13:00 | $10.07 | $10.18 | 0.00 % | $3.02 | 197 | 0 / 0 / 4 | 119 | 11.18 | 4.28 | $0.04 | 0.00 | 0.20 | $0.07 | 12.75 |
| 14:00 | $10.36 | $10.15 | 2.74 % | $2.76 | 1261 | 2 / 1 / 5 | 1185 | 13.97 | 20.61 | $0.29 | 0.77 | 0.05 | $0.36 | 13.84 |
| 15:00 | $10.40 | $10.41 | 0.39 % | $1.88 | 132 | 0 / 0 / 5 | 132 | ∞ (no loss) | ∞ (no loss) | $0.04 | 0.12 | 0.00 | $0.40 | 15.42 |
| 16:00 | $10.40 | $10.24 | 2.00 % | $1.80 | 37 | 0 / 0 / 5 | 31 | 5.20 | 9.06 | $0.00 | 1.12 | 0.12 | $0.40 | 15.30 |
| 17:00 | $10.41 | $10.22 | 2.20 % | $3.52 | 14 | 1 / 0 / 6 | 14 | ∞ (no loss) | ∞ (no loss) | $0.01 | 2.12 | 0.00 | $0.41 | 15.52 |
| 18:00 | $10.42 | $10.19 | 2.46 % | $3.68 | 140 | 0 / 0 / 6 | 83 | 16.42 | 10.91 | $0.01 | 3.12 | 0.10 | $0.42 | 15.56 |
| 19:00 | $10.43 | $10.21 | 2.28 % | $3.68 | 12 | 0 / 0 / 6 | 12 | ∞ (no loss) | ∞ (no loss) | $0.00 | 4.12 | 0.00 | $0.43 | 15.77 |
| 20:00 | $10.42 | $10.15 | 2.83 % | $3.96 | 3 | 0 / 0 / 6 | 0 | 0.00 | 0.00 | -$0.01 | 5.12 | – | $0.42 | 15.69 |

## Per strategy type

| type | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 468 | 7 | 13.27 | 25.64 | 97.01 % | $0.20 | 1.08 | 0.04 | 0.07 % | 7 / 7 |
| Trailing | 1283 | 8 | 16.83 | 7.81 | 84.57 % | $0.18 | 2.67 | 0.07 | 0.12 % | 6 / 7 |
| Trailing only | 0 | 0 | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| DCA | 11 | 4 | 290.60 | 225.50 | 90.91 % | $0.00 | 2.75 | 0.00 | 0.00 % | 3 / 4 |
| Signal · Normal | 16 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| Signal · Trailing | 27 | 5 | 20.22 | 35.44 | 74.07 % | $0.02 | 3.92 | 0.03 | 0.00 % | 5 / 6 |
| Signal · Trailing only | 0 | 0 | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |

| type · sub-type | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block | 428 | 5 | 12.23 | 21.58 | 96.73 % | $0.17 | 1.08 | 0.04 | 0.07 % | 6 / 6 |
| Normal · Plain | 40 | 3 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| Trailing · Block | 1198 | 6 | 15.11 | 6.49 | 83.47 % | $0.14 | 2.67 | 0.09 | 0.12 % | 5 / 6 |
| Trailing · Plain | 85 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.03 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| DCA · Block | 11 | 4 | 290.60 | 225.50 | 90.91 % | $0.00 | 2.75 | 0.00 | 0.00 % | 3 / 4 |
| Signal · Normal · Plain | 16 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| Signal · Trailing · Block | 1 | 1 | 0.00 | 0.00 | 0.00 % | -$0.00 | 3.25 | – | 0.00 % | 0 / 1 |
| Signal · Trailing · Plain | 26 | 4 | 21.39 | 35.64 | 76.92 % | $0.02 | 3.92 | 0.03 | 0.00 % | 5 / 6 |

## Per indication kind

| indication kind | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ichimoku | 758 | 4 | 10.49 | 13.28 | 91.69 % | $0.18 | 1.92 | 0.07 | 0.13 % | 7 / 8 |
| active | 892 | 10 | 47.42 | 10.37 | 88.12 % | $0.17 | 2.75 | 0.07 | 0.12 % | 5 / 6 |
| bollinger | 62 | 3 | 60.63 | 51.59 | 74.19 % | $0.03 | 4.00 | 0.01 | 0.00 % | 2 / 4 |
| signal:ema-trend | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:s2-ema-cross | 9 | 1 | 22.52 | 22.54 | 77.78 % | $0.01 | 3.92 | 0.05 | 0.00 % | 5 / 6 |
| signal:act-burst | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:reclaim | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:rsi-mid | 6 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| signal:supertrend | 9 | 1 | 21.08 | 20.77 | 66.67 % | $0.00 | 5.67 | 0.05 | 0.00 % | 2 / 3 |
| rsi | 50 | 1 | 1.66 | 1.66 | 44.00 % | $0.00 | 2.67 | 1.38 | 0.01 % | 1 / 1 |
| signal:ema-cross-fast | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| signal:r-session-trend | 2 | 1 | 10.31 | 9.90 | 50.00 % | $0.00 | 6.17 | 0.11 | 0.00 % | 1 / 2 |
| signal:trix | 6 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| trend | 0 | 1 | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| signal:ema-slope | 1 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 3.25 | – | 0.00 % | 0 / 1 |

## Per signal source

| source | orders | positions | Return PF | cash PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ema-trend | 4 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| s2-ema-cross | 9 | 1 | 22.52 | 22.54 | 77.78 % | $0.01 | 3.92 | 0.05 | 0.00 % | 5 / 6 |
| act-burst | 2 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| reclaim | 1 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| rsi-mid | 6 | 2 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| supertrend | 9 | 1 | 21.08 | 20.77 | 66.67 % | $0.00 | 5.67 | 0.05 | 0.00 % | 2 / 3 |
| ema-cross-fast | 3 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| r-session-trend | 2 | 1 | 10.31 | 9.90 | 50.00 % | $0.00 | 6.17 | 0.11 | 0.00 % | 1 / 2 |
| trix | 6 | 1 | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| ema-slope | 1 | 2 | 0.00 | 0.00 | 0.00 % | -$0.00 | 3.25 | – | 0.00 % | 0 / 1 |

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
