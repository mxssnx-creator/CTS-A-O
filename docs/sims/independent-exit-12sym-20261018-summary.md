# 24 h simulated session — 12 symbols, 24 h pre-historic + 24 h run

Offline replay from the supplied cached candle feed (no market-data requests; original provider not recorded; simulated orders only; no exchange execution proof), the engine itself (Base → Main → Real over the 1 / 5 / 15 min lanes), 24 h prehistory 2026-10-14 21:00 → 2026-10-15 21:00 UTC, then 24 h run 2026-10-15 21:00 → 2026-10-16 21:00 UTC. Signals use the same 24 h minimal evaluated history; no additional Signal warmup was loaded. Config evaluation uses the separately recorded 24 h selection lookback. Symbols: ADA-USDT, APT-USDT, ARB-USDT, ATOM-USDT, AVAX-USDT, BCH-USDT, BNB-USDT, BTC-USDT, DOGE-USDT, DOT-USDT, ETC-USDT, ETH-USDT.

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.
The combined account PF includes all funded settled orders, including Signals. The Base-to-execution benchmark below isolates engine orders from Base-qualified pairs whose configs passed post-Base validation; Signal orders use their own activation and qualification and remain separate. Pre-validation/unfiltered candidate PF is diagnostic only.

Settings (desk, flags): stage gate min PF 1.1, focus 97 pairs, disabled kinds none, toggles normal / trailing / exit / block / dca, ranges micro / minimal / short / general / long (micro on), caps: positions none, signal positions 250, coordination on, signals validated on their last 25. Block overall, 8 levels, Active from 2, ratio 0.5, total max 8× including base and all sources. Balance $1000.00, each order unit 0.1 % of the realized equity per unit, compounding, 10× for the margin, 0.15 % round-trip cost per close.

Full report with diagrams: [HTML report](independent-exit-12sym-20261018-report/index.html) · full numbers: `independent-exit-12sym-20261018-report/data.json` · [feed and run protocol](independent-exit-12sym-20261018-protocol.json) · [filtered input feed archive](independent-exit-12sym-20261018-feed.json.gz). The replay reused a cached public-candle source; venue provenance was not independently audited. Source feed SHA-256 `b70c3f0aff8b1d5b98f01ad2acac840c8560be2fa832e0c95615f8abf051c521`; filtered input raw SHA-256 `06b5ecdce0df0cc4870ca7f0202050fdc3668d5d346f17785b927e8ad41232df`.

## Result

| balance | equity at end | net | Return PF | cash PF (base $1) | sized $ PF diagnostic | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $1000.00 → -$169.03 | -$310.83 | -$1169.03 (-116.90 %) | 0.64 | 0.64 | 0.52 | 17.50 | – | $1462.77 (135.72 %) | 61806 | 51 | 61.51 % | 8 / 24 | $11240.10 |

Simulated live sizing replay (position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings))); open at end: 24 positions / 4440 orders, MTM -$141.80 (exact: executed by the engine through every gate, cap and Block volume, marked to market) · **infeasible: margin exceeded equity** (1201 min, first 23:30 UTC, max margin ÷ equity –×).

**Caps:** position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings)) — 0 orders capped to $0, 0 scaled down (open at end: 0 capped, 0 scaled) · binding: position cap 0, gross cap 0. **Without the caps:** balance $1000.00 → -$169.03 (-116.90 %) · Return PF 0.64 · cash PF (base $1) 0.64 · sized $ PF diagnostic 0.52 · equity at end -$310.83 · equity max drawdown $1462.77 (135.72 %) · margin used max $11240.10 · infeasible: margin exceeded equity for 1201 min.

Separate virtual diagnostic: 64151 closes · Return PF 0.66 before funding allocation; 2345 zero allocations, 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

Combined-book PF includes engine and independently qualified Signal orders. The Base-to-execution benchmark uses funded settled engine orders from Base-qualified pairs whose configs passed later validation/seating; Signals are reported as their own cohort. Pre-validation candidate PF is diagnostic only. Return PF is primary: positive net returns ÷ absolute negative net returns after modeled costs. Cash PF (base $1) applies each canonical unit return to equal $1 notionals and should match Return PF. Sized $ PF is a separate diagnostic using actual funded sizes (0.1 % of the realized equity per unit, compounding); it can differ as order sizes vary. At a fixed unit of $1.00 (no compounding) the same orders net -$134.68 (-13.47 %), closed-order max drawdown $170.60. **The equity reached $0 at 2026-10-16 13:09 UTC (lowest -$384.97): at this sizing with no position caps the account would have been liquidated there.**

Engine Base 203/1562 pairs passed; Signals 1/141 representative pairs pass the diagnostic gate (excluded from Base totals) (per range, passed / evaluated pairs · applied Base PF floor and passed-pair PF scores: Wide min PF 1.00 · 2/92 · median gate PF score 1.99 · Micro min PF 1.05 · 100/444 · median gate PF score 3.05 · Minimal min PF 1.10 · 122/536 · median gate PF score 2.17 · Short min PF 1.10 · 2/27 · median gate PF score 1.98 · General min PF 1.20 · 0/27 · Long min PF 1.30 · 0/27 · Signals min PF 1.00 · 1/141 · median gate PF score 3.50), Main 149 pairs, 111173 tapes, First simulated step at 2026-10-15T21:00:00.000Z: 14643 engine configs selected (Signal activation is separate). Paper selection after compute as of 2026-10-16T21:00:00.000Z: 2396 engine configs + 1224 Signal configs (complete paper step)., compute 57 s, peak RSS 3389 MB. Consistency checks: 66 of 66 pass.

## Base-to-execution progression

All PF values are net unit-return PF after modeled costs. The run's combined funded book is shown separately because it also contains Signal orders.

| stage / cohort | evaluated | passed or executed | PF |
|---|---:|---:|---:|
| Base engine pairs (any enabled range) | 1562 | 203 | see per-range Base pooled PF below |
| Main | 203 Base-qualified pairs | 149 pairs · 111173 tapes | candidate pool is diagnostic |
| Config evaluation at run start | 67043 engine configs | 14643 passed | see per-range validation PF below |
| First simulated-step selection | – | 14643 engine configs at 2026-10-15T21:00:00.000Z | – |
| Paper/current selection after compute | – | 2396 engine + 1224 Signal configs | – |
| Funded engine execution | – | 61806 settled orders | 0.64 |
| Signal execution (separate cohort) | – | 0 settled orders | – |
| Combined funded account | – | 61806 settled orders | 0.64 |

First simulated step at 2026-10-15T21:00:00.000Z: 14643 engine configs selected (Signal activation is separate). Paper selection after compute as of 2026-10-16T21:00:00.000Z: 2396 engine configs + 1224 Signal configs (complete paper step).

## Independent Exit strategy coverage and outcome

Exit runs as a bot-free source family through the normal causal Base → Main → Real and risk/execution gates. With 1 / 5 / 15 minute lanes and single-lane plus higher-timeframe combinations enabled, its source inventory was 1,026 pairs: 50 Tactic variants and 196 relation variants were included without requiring a Bot to select them. The five independently fitted protection families are static stop-loss, adaptive stop-loss, trailing stop, breakeven, and trailing-only.

| Exit stage | Count |
|---|---:|
| Bot-free source pairs evaluated by Normal Base | 1,026 |
| Passed Base gates | 54 |
| Protection candidates tested after causal history split | 192 |
| Exit configurations qualified on validation | 7 |
| Funded Exit orders in the 24 h run | 12 |

The Exit orders returned PF **0.253** and **−$0.366**; only **1 of 6 active Exit hours** was green. The overlay executed without Bot selection, but these held-out results do not support a profitability claim. The full account also lost money (PF 0.639, −$1,169.03; 8/24 green hours) and exceeded modeled equity with its uncapped 10× sizing. Do not infer future performance or enable live execution from this replay.

## Findings

- **Strategy types positive:** none.
- **Strategy types losing:** Trailing -$662.43 (PF 0.67, 40533 orders) · Normal -$480.42 (PF 0.61, 21001 orders) · DCA -$25.82 (PF 0.25, 260 orders) · exit -$0.37 (PF 0.25, 12 orders).
- **Engine vs signals:** Engine -$1169.03 (PF 0.64, 61806 orders).
- **Indication kinds positive:** none.
- **Indication kinds losing:** active -$556.55 (PF 0.62, 32846 orders) · break -$449.50 (PF 0.72, 24549 orders) · osc -$157.56 (PF 0.37, 4299 orders) · rsi -$5.40 (PF 0.30, 102 orders) · direction -$0.03 (PF 0.00, 10 orders).
- **Signal sources positive:** none.
- **Signal sources losing:** none.
- **Symbols:** best DOGE-USDT $65.09 (PF 4.89, 4161 orders) · ETC-USDT $35.61 (PF 3.74, 2715 orders) · BTC-USDT $28.11 (PF 1.45, 3269 orders); worst AVAX-USDT -$391.98 (PF 0.29, 6089 orders) · ADA-USDT -$224.99 (PF 0.24, 4151 orders) · ARB-USDT -$202.91 (PF 0.43, 7189 orders).
- **Block volume:** ×1 -$8.26 (Return PF 0.56, 3460) · ×1–1.5 -$1.25 (Return PF 0.14, 150) · ×1.5–2 -$2.63 (Return PF 0.59, 697) · ×2–3 $1.33 (Return PF 1.43, 1083) · ×3–4 $1.97 (Return PF 1.67, 737) · ×4–6 -$161.71 (Return PF 0.52, 9252) · ×6–8 -$998.49 (Return PF 0.66, 46427).
- **Lanes:** 1m -$154.42 (PF 0.51, 6686) · 5m -$766.22 (PF 0.68, 41406) · 5m+ -$65.95 (PF 0.68, 5841) · 15m -$182.44 (PF 0.51, 7873); **ranges:** Micro -$558.53 (PF 0.58, 33381) · Minimal -$572.38 (PF 0.70, 27937) · Short -$11.94 (PF 0.80, 216) · Wide -$26.18 (PF 0.25, 272); **sides:** Long -$1380.99 (PF 0.32, 34905) · Short $211.95 (PF 2.20, 26901).
- **Hours:** 8 green / 16 red / 0 flat of 24 full hours; first order opened 21:00 UTC; best hour 02:00 $39.44, worst hour 15:00 -$561.60.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | DDT now (h) | DDR (hour) | cum net | cum Return PF | cum sized $ PF diagnostic |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | $1011.59 | $974.43 | 4.11 % | $877.53 | 834 | 8 / 1 / 7 | 588 | 1.81 | 1.81 | 3.09 | $11.59 | 0.33 | 0.35 | $11.59 | 1.81 | 3.09 |
| 22:00 | $1044.03 | $1007.00 | 2.92 % | $953.80 | 1095 | 0 / 0 / 7 | 1017 | 5.35 | 5.35 | 8.36 | $32.44 | 0.58 | 0.07 | $44.03 | 3.19 | 5.43 |
| 23:00 | $1033.50 | $996.00 | 3.98 % | $1143.89 | 234 | 1 / 0 / 8 | 102 | 0.18 | 0.18 | 0.18 | -$10.53 | 1.58 | – | $33.50 | 2.11 | 2.48 |
| 00:00 | $1040.65 | $1005.92 | 3.02 % | $1105.90 | 374 | 0 / 0 / 8 | 266 | 13.37 | 13.37 | 13.00 | $7.15 | 2.58 | 0.08 | $40.65 | 2.31 | 2.74 |
| 01:00 | $1043.11 | $971.53 | 6.52 % | $1571.77 | 851 | 3 / 0 / 11 | 509 | 0.80 | 0.80 | 1.12 | $2.45 | 0.72 | 4.07 | $43.11 | 1.62 | 1.98 |
| 02:00 | $1082.55 | $932.85 | 10.24 % | $2040.55 | 2147 | 2 / 0 / 13 | 1379 | 2.15 | 2.15 | 2.42 | $39.44 | 1.72 | 0.27 | $82.55 | 1.80 | 2.15 |
| 03:00 | $1042.42 | $834.67 | 22.56 % | $3524.79 | 3802 | 4 / 1 / 16 | 2632 | 0.84 | 0.84 | 0.74 | -$40.13 | 0.68 | – | $42.42 | 1.20 | 1.19 |
| 04:00 | $1037.09 | $865.11 | 19.73 % | $2838.11 | 322 | 0 / 0 / 16 | 150 | 0.47 | 0.47 | 0.36 | -$5.33 | 1.68 | – | $37.09 | 1.18 | 1.16 |
| 05:00 | $1033.13 | $785.73 | 27.10 % | $4012.77 | 843 | 4 / 1 / 19 | 473 | 0.87 | 0.87 | 0.83 | -$3.97 | 2.68 | – | $33.13 | 1.16 | 1.13 |
| 06:00 | $1023.88 | $789.83 | 26.72 % | $3692.22 | 311 | 2 / 0 / 21 | 125 | 0.31 | 0.31 | 0.36 | -$9.24 | 3.68 | – | $23.88 | 1.11 | 1.09 |
| 07:00 | $1017.08 | $713.68 | 33.78 % | $4333.80 | 1198 | 1 / 2 / 20 | 472 | 0.53 | 0.53 | 0.63 | -$6.81 | 4.68 | – | $17.08 | 1.06 | 1.06 |
| 08:00 | $974.12 | $679.63 | 36.94 % | $4585.34 | 1807 | 1 / 0 / 21 | 872 | 0.41 | 0.41 | 0.47 | -$42.95 | 5.68 | – | -$25.88 | 0.90 | 0.93 |
| 09:00 | $1002.82 | $679.98 | 36.91 % | $4579.34 | 1390 | 0 / 0 / 21 | 954 | 1.59 | 1.59 | 3.77 | $28.69 | 6.68 | 0.10 | $2.82 | 0.94 | 1.01 |
| 10:00 | $1011.17 | $550.83 | 48.89 % | $6784.05 | 2966 | 2 / 0 / 23 | 1836 | 1.20 | 1.20 | 1.14 | $8.35 | 7.68 | 2.23 | $11.17 | 0.98 | 1.03 |
| 11:00 | $977.41 | $403.19 | 62.59 % | $9711.65 | 4863 | 0 / 0 / 23 | 3094 | 0.84 | 0.84 | 0.79 | -$33.76 | 8.68 | – | -$22.59 | 0.94 | 0.96 |
| 12:00 | $844.06 | $45.25 | 95.80 % | $9708.46 | 4941 | 0 / 0 / 23 | 2363 | 0.38 | 0.38 | 0.39 | -$133.34 | 9.68 | – | -$155.94 | 0.79 | 0.81 |
| 13:00 | $795.81 | -$10.49 | 100.97 % | $10290.49 | 2527 | 1 / 0 / 24 | 1211 | 0.39 | 0.39 | 0.36 | -$48.25 | 10.68 | – | -$204.19 | 0.76 | 0.77 |
| 14:00 | $768.63 | -$90.08 | 108.36 % | $11240.10 | 4153 | 2 / 2 / 24 | 2758 | 1.05 | 1.05 | 0.75 | -$27.18 | 11.68 | – | -$231.37 | 0.79 | 0.77 |
| 15:00 | $207.03 | -$305.69 | 128.36 % | $11240.10 | 13258 | 0 / 1 / 23 | 7748 | 0.40 | 0.40 | 0.33 | -$561.60 | 12.68 | – | -$792.97 | 0.61 | 0.57 |
| 16:00 | $62.04 | -$311.97 | 128.95 % | $5374.69 | 4480 | 1 / 0 / 24 | 2627 | 0.46 | 0.46 | 0.24 | -$145.00 | 13.68 | – | -$937.96 | 0.60 | 0.54 |
| 17:00 | -$150.85 | -$342.74 | 131.80 % | $4234.04 | 9111 | 0 / 0 / 24 | 6714 | 0.83 | 0.83 | 0.43 | -$212.89 | 14.68 | – | -$1150.85 | 0.64 | 0.52 |
| 18:00 | -$163.68 | -$361.76 | 133.56 % | $1197.93 | 209 | 0 / 0 / 24 | 76 | 0.37 | 0.37 | 0.12 | -$12.83 | 15.68 | – | -$1163.68 | 0.64 | 0.52 |
| 19:00 | -$169.04 | -$323.42 | 130.01 % | $1117.38 | 83 | 0 / 0 / 24 | 46 | 0.61 | 0.61 | 0.17 | -$5.36 | 16.68 | – | -$1169.04 | 0.64 | 0.52 |
| 20:00 | -$169.03 | -$310.83 | 128.84 % | $1062.81 | 7 | 0 / 0 / 24 | 2 | 0.15 | 0.15 | 1.04 | $0.00 | 17.68 | 28.33 | -$1169.03 | 0.64 | 0.52 |

## Per strategy type

| type | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| exit | 12 | 12 | 0.25 | 0.25 | 0.38 | 33.33 % | -$0.37 | 9.25 | – | 0.05 % | 1 / 6 |
| Normal | 21001 | 50 | 0.61 | 0.61 | 0.52 | 68.08 % | -$480.42 | 17.50 | – | 50.37 % | 7 / 24 |
| Trailing | 40533 | 59 | 0.67 | 0.67 | 0.53 | 58.10 % | -$662.43 | 17.50 | – | 70.56 % | 7 / 24 |
| Trailing only | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| DCA | 260 | 58 | 0.25 | 0.25 | 0.24 | 62.31 % | -$25.82 | 12.35 | – | 2.85 % | 14 / 20 |
| Signal · Normal | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| Signal · Trailing | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |
| Signal · Trailing only | 0 | 0 | – | – | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 0 |

| type · sub-type | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| exit · Block | 12 | 12 | 0.25 | 0.25 | 0.38 | 33.33 % | -$0.37 | 9.25 | – | 0.05 % | 1 / 6 |
| Normal · Block | 19978 | 51 | 0.64 | 0.64 | 0.52 | 68.56 % | -$474.55 | 17.50 | – | 49.86 % | 7 / 23 |
| Normal · Plain | 1023 | 26 | 0.32 | 0.32 | 0.32 | 58.75 % | -$5.87 | 23.58 | – | 0.62 % | 6 / 22 |
| Trailing · Block | 38117 | 62 | 0.66 | 0.66 | 0.53 | 57.95 % | -$660.43 | 17.50 | – | 70.40 % | 7 / 23 |
| Trailing · Plain | 2416 | 34 | 0.76 | 0.76 | 0.81 | 60.55 % | -$2.00 | 19.50 | – | 0.60 % | 10 / 21 |
| DCA · Block | 239 | 56 | 0.27 | 0.27 | 0.24 | 64.44 % | -$25.43 | 12.35 | – | 2.81 % | 14 / 20 |
| DCA · Plain | 21 | 10 | 0.10 | 0.10 | 0.10 | 38.10 % | -$0.39 | 17.27 | – | 0.04 % | 3 / 7 |

## Per indication kind

| indication kind | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| direction | 10 | 1 | 0.00 | 0.00 | 0.00 | 0.00 % | -$0.03 | 24.00 | – | 0.00 % | 0 / 3 |
| rsi | 102 | 8 | 0.30 | 0.30 | 0.29 | 52.94 % | -$5.40 | 10.30 | – | 0.75 % | 4 / 11 |
| osc | 4299 | 25 | 0.37 | 0.37 | 0.30 | 52.06 % | -$157.56 | 22.73 | – | 15.76 % | 4 / 19 |
| break | 24549 | 31 | 0.72 | 0.72 | 0.56 | 63.78 % | -$449.50 | 17.50 | – | 52.00 % | 10 / 22 |
| active | 32846 | 63 | 0.62 | 0.62 | 0.52 | 61.09 % | -$556.55 | 9.42 | – | 60.96 % | 9 / 24 |

## Per signal source

| source | orders | positions | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

Window of 24 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
