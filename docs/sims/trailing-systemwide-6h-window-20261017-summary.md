# 6 h simulated session — 4 symbols, 6 h pre-historic + 6 h run

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-14 09:00 → 2026-10-14 15:00 UTC, run 2026-10-14 15:00 → 2026-10-14 21:00 UTC. Signals use the same 6 h minimal evaluated history; no additional Signal warmup was loaded. Symbols: ATOM-USDT, APT-USDT, NEAR-USDT, DOT-USDT.

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.
PF benchmark scope: funded settled orders executed by Base-qualified, post-Base validated configs. Pre-validation/unfiltered candidate PF is diagnostic only and excluded from the benchmark.

Settings (desk, flags): stage gate min PF 1.1, focus 97 pairs, disabled kinds none, toggles normal / trailing / block / dca, ranges micro / minimal / short / general / long (micro on), caps: positions none, signal positions 250, coordination on, signals validated on their last 25. Block overall, 8 levels, Active from 2, ratio 0.5, total max 8× including base and all sources. Balance $10.00, each order unit 0.1 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/trailing-range-hourly-20261016/html-current-6h/index.html](runs/trailing-range-hourly-20261016/html-current-6h/index.html) · numbers: `runs/trailing-range-hourly-20261016/html-current-6h/data.json`.

## Result

| balance | equity at end | net | Return PF | cash PF (base $1) | sized $ PF diagnostic | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $10.00 → $10.00 | $9.97 | -$0.00 (-0.01 %) | 0.63 | 0.63 | 0.93 | 3.00 | – | $0.04 (0.43 %) | 273 | 19 | 43.22 % | 2 / 6 | $0.60 |

Simulated live sizing replay (position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings))); open at end: 7 positions / 109 orders, MTM -$0.02 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings)) — 0 orders capped to $0, 0 scaled down (open at end: 0 capped, 0 scaled) · binding: position cap 0, gross cap 0. **Without the caps:** balance $10.00 → $10.00 (-0.01 %) · Return PF 0.63 · cash PF (base $1) 0.63 · sized $ PF diagnostic 0.93 · equity at end $9.97 · equity max drawdown $0.04 (0.43 %) · margin used max $0.60.

Separate virtual diagnostic: 273 closes · Return PF 0.63 before funding allocation; 0 zero allocations, 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

PF benchmark scope: funded settled orders executed by configs that passed Base and the later config validation/seating gates; pre-validation candidate PF is diagnostic only. Return PF is primary: positive net returns ÷ absolute negative net returns of those orders, after modeled costs. Cash PF (base $1) applies each canonical unit return to equal $1 notionals and should match Return PF. Sized $ PF is a separate diagnostic using actual funded sizes (0.1 % of the realized equity per unit, compounding); it can differ as order sizes vary. At a fixed unit of $0.01 (no compounding) the same orders net -$0.00 (-0.03 %), closed-order max drawdown $0.00.

Engine Base 4/854 pairs passed; Signals 2/504 representative pairs pass the diagnostic gate (excluded from Base totals) (per range, passed / evaluated pairs · median Base gate PF score of passed pairs: Wide 0/154 · Micro 1/700 · median gate PF score 1.78 · Minimal 4/854 · median gate PF score 1.78 · Short 0/89 · General 0/89 · Long 0/89 · Signals 2/504 · median gate PF score 1.75), Main 4 pairs, 43768 tapes, Real seats: 12 engine configs + 0 signal configs (every config of the active signals), compute 55 s, peak RSS 606 MB. Consistency checks: 66 of 66 pass.

## Findings

- **Strategy types positive:** DCA $0.00 (PF ∞ (no loss), 9 orders) · Trailing $0.00 (PF 1.18, 230 orders) · Normal $0.00 (PF ∞ (no loss), 2 orders).
- **Strategy types losing:** Signal · Trailing -$0.00 (PF 0.18, 18 orders) · Signal · Normal -$0.00 (PF 0.05, 8 orders) · Signal · Trailing only -$0.00 (PF 0.00, 6 orders).
- **Engine vs signals:** Engine $0.00 (PF 1.40, 241 orders) · Signals -$0.00 (PF 0.10, 32 orders).
- **Indication kinds positive:** active $0.00 (PF 1.40, 241 orders).
- **Indication kinds losing:** signal:s2-block-scale -$0.00 (PF 0.00, 16 orders) · signal:act-hf -$0.00 (PF 0.29, 16 orders).
- **Signal sources positive:** none.
- **Signal sources losing:** s2-block-scale -$0.00 (PF 0.00, 16 orders) · act-hf -$0.00 (PF 0.29, 16 orders).
- **Symbols:** best ATOM-USDT $0.01 (PF 2.19, 56 orders); worst APT-USDT -$0.00 (PF 0.39, 143 orders) · NEAR-USDT -$0.00 (PF 0.76, 42 orders) · DOT-USDT -$0.00 (PF 0.10, 32 orders).
- **Block volume:** ×1 -$0.00 (Return PF 0.56, 137) · ×1.5–2 -$0.00 (Return PF 0.20, 8) · ×2–3 $0.00 (Return PF ∞ (no loss), 2) · ×3–4 $0.00 (Return PF ∞ (no loss), 1) · ×4–6 $0.00 (Return PF 13.01, 6) · ×6–8 $0.00 (Return PF 1.22, 119).
- **Lanes:** 1m -$0.00 (PF 0.29, 16) · 5m -$0.00 (PF 0.72, 257); **ranges:** Micro $0.00 (PF 2.15, 168) · Minimal -$0.00 (PF 0.62, 64) · Wide $0.00 (PF ∞ (no loss), 9) · Signals -$0.00 (PF 0.10, 32); **sides:** Long -$0.00 (PF 0.35, 43) · Short $0.00 (PF 0.85, 230).
- **Hours:** 2 green / 4 red / 0 flat of 6 full hours; first order opened 15:00 UTC; best hour 18:00 $0.01, worst hour 20:00 -$0.00.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | DDT now (h) | DDR (hour) | cum net | cum Return PF | cum sized $ PF diagnostic |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | $10.00 | $10.00 | 0.06 % | $0.10 | 110 | 7 / 4 / 3 | 41 | 1.44 | 1.44 | 0.94 | -$0.00 | 0.85 | – | -$0.00 | 1.44 | 0.94 |
| 16:00 | $10.00 | $9.98 | 0.24 % | $0.34 | 16 | 1 / 1 / 3 | 14 | 29.98 | 29.98 | 5.56 | $0.00 | 1.85 | 0.22 | $0.00 | 1.77 | 1.20 |
| 17:00 | $10.00 | $9.99 | 0.13 % | $0.60 | 54 | 3 / 0 / 6 | 22 | 0.40 | 0.40 | 0.40 | -$0.00 | 2.85 | – | -$0.00 | 1.46 | 0.73 |
| 18:00 | $10.01 | $9.99 | 0.13 % | $0.42 | 53 | 1 / 2 / 5 | 32 | 1.68 | 1.68 | 3.93 | $0.01 | 0.97 | 0.15 | $0.01 | 1.52 | 1.65 |
| 19:00 | $10.00 | $9.98 | 0.23 % | $0.27 | 7 | 3 / 1 / 7 | 2 | 0.07 | 0.07 | 0.10 | -$0.00 | 1.97 | – | $0.00 | 0.97 | 1.24 |
| 20:00 | $10.00 | $9.97 | 0.28 % | $0.49 | 33 | 1 / 1 / 7 | 7 | 0.15 | 0.15 | 0.26 | -$0.00 | 2.97 | – | -$0.00 | 0.63 | 0.93 |

## Per strategy type

| type | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2 | 1 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| Trailing | 230 | 15 | 1.18 | 1.18 | 1.04 | 42.61 % | $0.00 | 3.00 | 12.39 | 0.06 % | 3 / 6 |
| Trailing only | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| DCA | 9 | 5 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| Signal · Normal | 8 | 1 | 0.05 | 0.05 | 0.05 | 12.50 % | -$0.00 | 5.68 | – | 0.01 % | 0 / 3 |
| Signal · Trailing | 18 | 2 | 0.18 | 0.18 | 0.18 | 44.44 % | -$0.00 | 4.70 | – | 0.02 % | 1 / 2 |
| Signal · Trailing only | 6 | 1 | 0.00 | 0.00 | 0.00 | 0.00 % | -$0.00 | 2.58 | – | 0.01 % | 0 / 2 |

| type · sub-type | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block | 2 | 1 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| Trailing · Block | 126 | 9 | 0.52 | 0.52 | 0.89 | 42.86 % | -$0.00 | 3.08 | – | 0.06 % | 2 / 6 |
| Trailing · Plain | 104 | 7 | 4.55 | 4.55 | 4.55 | 42.31 % | $0.00 | 0.83 | 0.28 | 0.01 % | 2 / 2 |
| DCA · Block | 8 | 4 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| DCA · Plain | 1 | 1 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| Signal · Normal · Plain | 8 | 1 | 0.05 | 0.05 | 0.05 | 12.50 % | -$0.00 | 5.68 | – | 0.01 % | 0 / 3 |
| Signal · Trailing · Plain | 18 | 2 | 0.18 | 0.18 | 0.18 | 44.44 % | -$0.00 | 4.70 | – | 0.02 % | 1 / 2 |
| Signal · Trailing only · Plain | 6 | 1 | 0.00 | 0.00 | 0.00 | 0.00 % | -$0.00 | 2.58 | – | 0.01 % | 0 / 2 |

## Per indication kind

| indication kind | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| active | 241 | 19 | 1.40 | 1.40 | 1.22 | 45.23 % | $0.00 | 3.00 | 1.39 | 0.04 % | 3 / 6 |
| signal:act-hf | 16 | 1 | 0.29 | 0.29 | 0.29 | 56.25 % | -$0.00 | 5.68 | – | 0.01 % | 1 / 4 |
| signal:s2-block-scale | 16 | 1 | 0.00 | 0.00 | 0.00 | 0.00 % | -$0.00 | 2.58 | – | 0.03 % | 0 / 2 |

## Per signal source

| source | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| act-hf | 16 | 1 | 0.29 | 0.29 | 0.29 | 56.25 % | -$0.00 | 5.68 | – | 0.01 % | 1 / 4 |
| s2-block-scale | 16 | 1 | 0.00 | 0.00 | 0.00 | 0.00 % | -$0.00 | 2.58 | – | 0.03 % | 0 / 2 |

Window of 6 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
