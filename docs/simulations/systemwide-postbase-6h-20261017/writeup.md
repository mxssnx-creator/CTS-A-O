# 6 h simulated session — 9 symbols, 6 h pre-historic + 6 h run

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-14 16:00 → 2026-10-14 22:00 UTC, run 2026-10-14 22:00 → 2026-10-15 04:00 UTC. Signals use the same 6 h minimal evaluated history; no additional Signal warmup was loaded. Symbols: AVAX-USDT, ADA-USDT, DOGE-USDT, LINK-USDT, ETH-USDT, SOL-USDT, XRP-USDT, BNB-USDT, BTC-USDT.

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.
PF benchmark scope: funded settled orders executed by Base-qualified, post-Base validated configs. Pre-validation/unfiltered candidate PF is diagnostic only and excluded from the benchmark.

Settings (desk, flags): stage gate min PF 1.1, focus 97 pairs, disabled kinds none, toggles normal / trailing / block / dca, ranges micro / minimal / short / general / long (micro on), caps: positions none, signal positions 250, coordination on, signals validated on their last 25. Block overall, 8 levels, Active from 2, ratio 0.5, total max 8× including base and all sources. Balance $10.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [docs/simulations/systemwide-postbase-6h-20261017/html/index.html](simulations/systemwide-postbase-6h-20261017/html/index.html) · numbers: `docs/simulations/systemwide-postbase-6h-20261017/html/data.json`.

## Result

| balance | equity at end | net | Return PF | cash PF (base $1) | sized $ PF diagnostic | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $10.00 → $9.83 | $9.43 | -$0.17 (-1.71 %) | 1.90 | 1.90 | 0.75 | 2.50 | – | $0.71 (7.09 %) | 7946 | 48 | 61.67 % | 2 / 6 | $6.88 |

Simulated live sizing replay (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 10 positions / 1600 orders, MTM -$0.39 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 2746 orders capped to $0, 7934 scaled down (open at end: 313 capped, 1283 scaled) · binding: position cap 12260, gross cap 1025. **Without the caps:** balance $10.00 → $17.07 (70.70 %) · Return PF 1.90 · cash PF (base $1) 1.90 · sized $ PF diagnostic 1.44 · equity at end $5.14 · equity max drawdown $50.05 (220.54 %) · margin used max $606.22 · infeasible: margin exceeded equity for 355 min.

Separate virtual diagnostic: 10692 closes · Return PF 1.90 before funding allocation; 2746 zero allocations, 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

PF benchmark scope: funded settled orders executed by configs that passed Base and the later config validation/seating gates; pre-validation candidate PF is diagnostic only. Return PF is primary: positive net returns ÷ absolute negative net returns of those orders, after modeled costs. Cash PF (base $1) applies each canonical unit return to equal $1 notionals and should match Return PF. Sized $ PF is a separate diagnostic using actual funded sizes (2.0 % of the realized equity per unit, compounding); it can differ as order sizes vary. At a fixed unit of $0.20 (no compounding) the same orders net $1.89 (18.90 %), closed-order max drawdown $0.78.

Engine Base 53/854 pairs passed; Signals 0/126 representative pairs pass the diagnostic gate (excluded from Base totals) (per range, passed / evaluated pairs · median Base gate PF score of passed pairs: Wide 0/154 · Micro 53/700 · median gate PF score 4.00 · Minimal 13/854 · median gate PF score 4.00 · Short 0/89 · General 0/89 · Long 0/89 · Signals 0/126), Main 53 pairs, 33034 tapes, Real seats: 295 engine configs + 0 signal configs (every config of the active signals), compute 33 s, peak RSS 851 MB. Consistency checks: 66 of 66 pass.

## Findings

- **Strategy types positive:** Normal $0.13 (PF 4.31, 2438 orders) · DCA $0.01 (PF ∞ (no loss), 8 orders).
- **Strategy types losing:** Trailing -$0.31 (PF 1.33, 5500 orders).
- **Engine vs signals:** Engine -$0.17 (PF 1.90, 7946 orders).
- **Indication kinds positive:** none.
- **Indication kinds losing:** active -$0.17 (PF 1.90, 7946 orders).
- **Signal sources positive:** none.
- **Signal sources losing:** none.
- **Symbols:** best BNB-USDT $0.06 (PF 18.15, 1013 orders) · ETH-USDT $0.06 (PF 3.70, 3153 orders) · SOL-USDT $0.04 (PF 3.99, 236 orders); worst AVAX-USDT -$0.14 (PF 0.07, 270 orders) · ADA-USDT -$0.13 (PF 0.20, 468 orders) · DOGE-USDT -$0.09 (PF 2.37, 1373 orders).
- **Block volume:** ×1 -$0.10 (Return PF 2.12, 3541) · ×2–3 $0.02 (Return PF ∞ (no loss), 8) · ×3–4 $0.00 (Return PF –, 0) · ×4–6 -$0.15 (Return PF 1.94, 1036) · ×6–8 $0.06 (Return PF 1.67, 3361).
- **Lanes:** 5m $0.13 (PF 0.83, 2604) · 5m+ $0.00 (PF 21.81, 306) · 15m -$0.15 (PF 2.70, 4409) · 15m+ -$0.15 (PF 1.80, 627); **ranges:** Micro -$0.20 (PF 1.60, 7212) · Minimal $0.02 (PF 10.72, 726) · Wide $0.01 (PF ∞ (no loss), 8); **sides:** Long -$0.44 (PF 0.27, 1936) · Short $0.27 (PF 6.35, 6010).
- **Hours:** 2 green / 4 red / 0 flat of 6 full hours; first order opened 22:00 UTC; best hour 03:00 $0.10, worst hour 02:00 -$0.27.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | DDT now (h) | DDR (hour) | cum net | cum Return PF | cum sized $ PF diagnostic |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | $10.00 | $9.91 | 1.12 % | $6.00 | 824 | 9 / 0 / 9 | 252 | 0.74 | 0.74 | 0.69 | -$0.00 | 0.80 | – | -$0.00 | 0.74 | 0.69 |
| 23:00 | $9.99 | $9.91 | 1.06 % | $5.97 | 488 | 0 / 1 / 8 | 190 | 0.68 | 0.68 | 0.50 | -$0.00 | 1.80 | – | -$0.01 | 0.72 | 0.63 |
| 00:00 | $10.01 | $9.96 | 0.58 % | $5.31 | 974 | 0 / 1 / 7 | 616 | 3.17 | 3.17 | 2.40 | $0.01 | 2.80 | 0.44 | $0.01 | 1.55 | 1.27 |
| 01:00 | $10.00 | $9.92 | 0.93 % | $4.36 | 1444 | 1 / 0 / 8 | 344 | 0.62 | 0.62 | 0.53 | -$0.01 | 3.80 | – | $0.00 | 1.09 | 1.03 |
| 02:00 | $9.73 | $9.50 | 5.14 % | $6.81 | 3502 | 29 / 23 / 14 | 3030 | 2.22 | 2.22 | 0.57 | -$0.27 | 4.80 | – | -$0.27 | 1.87 | 0.59 |
| 03:00 | $9.83 | $9.43 | 5.82 % | $6.88 | 714 | 2 / 6 / 10 | 468 | 2.55 | 2.55 | 4.35 | $0.10 | 5.80 | 0.20 | -$0.17 | 1.90 | 0.75 |

## Per strategy type

| type | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2438 | 33 | 4.31 | 4.31 | 1.86 | 94.50 % | $0.13 | 0.83 | 1.05 | 1.33 % | 6 / 6 |
| Trailing | 5500 | 39 | 1.33 | 1.33 | 0.43 | 47.05 % | -$0.31 | 5.75 | – | 4.20 % | 2 / 6 |
| Trailing only | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| DCA | 8 | 4 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| Signal · Normal | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| Signal · Trailing | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| Signal · Trailing only | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |

| type · sub-type | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block | 1374 | 32 | 3.45 | 3.45 | 2.33 | 93.74 % | $0.12 | 0.92 | 0.75 | 0.90 % | 6 / 6 |
| Normal · Plain | 1064 | 8 | 5.55 | 5.55 | 1.13 | 95.49 % | $0.01 | 1.50 | 6.66 | 0.49 % | 4 / 5 |
| Trailing · Block | 3026 | 37 | 1.26 | 1.26 | 0.45 | 50.17 % | -$0.19 | 2.42 | – | 3.09 % | 2 / 6 |
| Trailing · Plain | 2474 | 12 | 1.41 | 1.41 | 0.39 | 43.25 % | -$0.11 | 4.25 | – | 1.52 % | 0 / 6 |
| DCA · Block | 5 | 2 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.01 | 0.00 | 0.00 | 0.00 % | 1 / 1 |
| DCA · Plain | 3 | 3 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 100.00 % | $0.00 | 0.00 | 0.00 | 0.00 % | 1 / 1 |

## Per indication kind

| indication kind | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| active | 7946 | 48 | 1.90 | 1.90 | 0.75 | 61.67 % | -$0.17 | 2.50 | – | 5.19 % | 2 / 6 |

## Per signal source

| source | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

Window of 6 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
