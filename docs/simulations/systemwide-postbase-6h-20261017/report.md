# Simulated trading session — 9 symbols, 6 h pre-historic + 6 h run (tactics default, signals on)

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only). Timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+), strategies Normal, Trailing, DCA with Block, signals. Signals use the same 6 h minimal evaluated history; no additional Signal warmup was loaded. Balance $10.00; each order volume unit = 2.0 % of the realized equity at entry ($0.20–$0.36 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-14T22:00 → 2026-10-15T04:00 UTC. Engine Base 53/854 pairs passed; Signals 0/126 representative pairs pass the diagnostic gate (excluded from Base totals) — per range, passed / evaluated pairs · median Base gate PF score of passed pairs (no-loss pooled PF called out): Wide 0/154 · Micro 53/700 · median gate PF score 4.00 · Minimal 13/854 · median gate PF score 4.00 · Short 0/89 · General 0/89 · Long 0/89 · Signals 0/126; Main 53 pairs, 33034 tapes, Real seats: 295 engine configs + 0 signal configs (every config of the active signals), compute 33 s. PF benchmarks below use only funded settled orders executed by post-Base validated configs; pre-validation candidate-pool PF is a diagnostic. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $10.00 → $9.83 (-1.71 %, closed orders) · equity at end $9.43 (open at end: 10 positions / 1600 orders, MTM -$0.39 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF 1.90 · cash PF (base $1) 1.90 · sized $ PF diagnostic 0.75 · 48 positions / 7946 funded orders · 10692 virtual closes (2746 zero allocations) · WR 61.67 % · DDT (closed trades, $) 2.50 h · DDR – (net ≤ 0) · equity max drawdown $0.71 (7.09 %) · margin used max $6.88 · open avg 7.44 pos / 3748.07 orders (peak 14 / 6509)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Generated candidates use completed entries inside the minimal evaluated history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 126 | 124 | 8 | 8 | 8 | 4 | 4 | 0 | 0 |
**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 2746 orders capped to $0, 7934 scaled down (open at end: 313 capped, 1283 scaled) · binding: position cap 12260, gross cap 1025. **Without the caps:** balance $10.00 → $17.07 (70.70 %) · Return PF 1.90 · cash PF (base $1) 1.90 · sized $ PF diagnostic 1.44 · equity at end $5.14 · equity max drawdown $50.05 (220.54 %) · margin used max $606.22 · infeasible: margin exceeded equity for 355 min.
**Virtual diagnostic:** 10692 closes · Return PF 1.90 before funding allocation; 2746 zero allocations and 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

The median is the runtime's Base gate PF score. A no-loss pair uses the finite score 4; that is a qualification score, not an exact PF.

| Base gate | PF floor | closes | DDR | pairs at the default cell | pairs in a range | share | median PF score of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 0 | 53  | 6.2 % | – |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 0 | 53 (+0) | 6.2 % | – |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 0 | 53 (+0) | 6.2 % | – |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 0 | 53 (+0) | 6.2 % | – |
| closes ≥ 6 | 1.00 | 6 | 1 | 0 | 78 (+25) | 9.1 % | – |
| closes ≥ 20 | 1.00 | 20 | 1 | 0 | 3 (-50) | 0.4 % | – |
| closes ≥ 30 | 1.00 | 30 | 1 | 0 | 0 (-53) | 0.0 % | – |
| DDR off | 1.00 | 12 | off | 0 | 53 (+0) | 6.2 % | – |
| DDR ≤ 2 | 1.00 | 12 | 2 | 0 | 53 (+0) | 6.2 % | – |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 0 | 53 (+0) | 6.2 % | – |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 0 | 53 (+0) | 6.2 % | – |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 0 | 78 (+25) | 9.1 % | – |


### Base by range: which gate removes each pair

Each pair at the range's own cell against the range's minimum. "first" = the first gate missed (closes → net → PF → DDR); "only" = pairs that miss that one gate alone (removing it admits them).

| range | evaluated | passed | share | first: closes / net / PF / DDR | only: closes / net / PF / DDR | median PF, only DDR |
|---|---:|---:|---:|---|---|---:|
| Wide | 154 | 0 | 0.0 % | 154 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Micro | 700 | 53 | 7.6 % | 647 / 0 / 0 / 0 | 271 / 0 / 0 / 0 | – |
| Minimal | 854 | 13 | 1.5 % | 841 / 0 / 0 / 0 | 231 / 0 / 0 / 0 | – |
| Short | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| General | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Long | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |


### After each evaluation: PF and sets validated

Base: the Base-passed pairs pooled on their gross return basis; no-loss samples show ∞ (no loss), while the runtime's finite no-loss gate score is shown separately in the run summary. Validation: the sets validated at the run start and their gross-return PF pooled on the validation window (signals: units active in the run). Orders: the run's funded settled orders and their realized PF; known zero allocations are excluded.

| range | Base pooled PF | pairs validated | effective validation min PF | validation PF | sets validated | orders PF | orders |
|---|---:|---:|---|---:|---:|---:|---:|
| Wide | – | 0 of 154 | not recorded | – | – | ∞ (no loss) | 8 |
| Micro | 220.32 | 53 of 700 | 1.05 | 8.47 | 9668 of 25704 | 1.60 | 7212 |
| Minimal | 10.37 | 13 of 854 | 1.08 | 14.26 | 960 of 1568 | 10.72 | 726 |
| Short | – | 0 of 89 | not recorded | – | – | – | 0 |
| General | – | 0 of 89 | not recorded | – | – | – | 0 |
| Long | – | 0 of 89 | not recorded | – | – | – | 0 |
| Signals | – | 0 of 126 | – | – | 0 units active | – | 0 |


### Each range at every step

Per range over the run's 6 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 25704 | 6 / 6 | 6 | 6 | 27000 | 30550 | 11394 |
| Wide | 848 | 6 / 6 | 5 | 5 | 57 | 183 | 74 |
| Minimal | 1568 | 6 / 6 | 4 | 4 | 2052 | 1734 | 824 |
| Signals | 4914 | 6 / 6 | 0 | 0 | 0 | 0 | 0 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 0 / 824 | 252 / 572 | 0.74 | 0.69 | 31 % | -$0.00 | $10.00 | $9.91 | $9.91 | 1.12 % | 0.80 | $6.00 | 9 / 5323 |
| 23:00 | 1 / 488 | 190 / 298 | 0.68 | 0.50 | 39 % | -$0.00 | $9.99 | $9.91 | $9.88 | 1.32 % | 1.80 | $5.97 | 8 / 6527 |
| 00:00 | 1 / 974 | 616 / 358 | 3.17 | 2.40 | 63 % | $0.01 | $10.01 | $9.96 | $9.87 | 1.49 % | 2.80 | $5.31 | 7 / 5581 |
| 01:00 | 0 / 1444 | 344 / 1100 | 0.62 | 0.53 | 24 % | -$0.01 | $10.00 | $9.92 | $9.90 | 1.49 % | 3.80 | $4.36 | 8 / 4110 |
| 02:00 | 23 / 3502 | 3030 / 472 | 2.22 | 0.57 | 87 % | -$0.27 | $9.73 | $9.50 | $9.33 | 6.88 % | 4.80 | $6.81 | 14 / 308 |
| 03:00 | 6 / 714 | 468 / 246 | 2.55 | 4.35 | 66 % | $0.10 | $9.83 | $9.43 | $9.31 | 7.09 % | 5.80 | $6.88 | 10 / 1600 |

**Last hour (03:00):** open at end: 10 positions / 1600 orders, MTM -$0.39 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $9.43 = balance $9.83 + MTM -$0.39.

**Hours positive:** 2 of 6 full hours · flat 0 · negative 4

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* and *cash PF (base $1)* use the same canonical unit returns and should match; *sized $ PF diagnostic* = gross realized cash gains ÷ losses on those same orders after actual sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ |
|---|---:|---:|---:|---:|
| 22:00 | 212 · 1.23 · -$0.00 | – | 612 · 0.60 · -$0.00 | – |
| 23:00 | 222 · 0.59 · $0.00 | 204 · 6.61 · $0.00 | 62 · 0.00 · -$0.00 | – |
| 00:00 | 490 · 1.12 · $0.01 | 102 · ∞ (no loss) · $0.00 | 382 · 5.93 · $0.01 | 0 · – · $0.00 |
| 01:00 | 246 · 0.82 · -$0.00 | 0 · – · $0.00 | 1086 · 0.56 · -$0.00 | 112 · 0.82 · -$0.00 |
| 02:00 | 800 · 0.54 · $0.02 | – | 2187 · 3.80 · -$0.14 | 515 · 1.86 · -$0.15 |
| 03:00 | 634 · 2.08 · $0.11 | – | 80 · 16.65 · -$0.01 | – |

## Hour by hour per type (funded orders · Return PF · WR · net $)

The strategy columns partition funded orders; virtual closes also include zero-allocated closes. *Of which* columns are subsets of the funded orders.

| hour (UTC) | funded orders closed | virtual closes | Normal | Trailing | Trailing only | DCA | Signal · Normal | Signal · Trailing | Signal · Trailing only | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 824 | 1090 | 122 · ∞ (no loss) · 100 % · $0.01 | 702 · 0.34 · 19 % · -$0.01 | – | – | – | – | – | 186 · 1.67 · 49 % · -$0.00 | – |
| 23:00 | 488 | 624 | 70 · 2.07 · 89 % · $0.00 | 418 · 0.42 · 31 % · -$0.00 | – | – | – | – | – | 364 · 0.49 · 37 % · -$0.00 | – |
| 00:00 | 974 | 1398 | 248 · 16.20 · 98 % · $0.01 | 726 · 2.12 · 52 % · $0.01 | – | – | – | – | – | 516 · 6.17 · 82 % · $0.01 | – |
| 01:00 | 1444 | 1764 | 236 · 66.00 · 99 % · $0.01 | 1208 · 0.10 · 9 % · -$0.01 | – | – | – | – | – | 938 · 0.60 · 26 % · -$0.01 | – |
| 02:00 | 3502 | 4958 | 1554 · 3.30 · 92 % · $0.02 | 1940 · 1.79 · 82 % · -$0.30 | – | 8 · ∞ (no loss) · 100 % · $0.01 | – | – | – | 1779 · 1.69 · 82 % · -$0.17 | – |
| 03:00 | 714 | 858 | 208 · ∞ (no loss) · 100 % · $0.09 | 506 · 1.51 · 51 % · $0.01 | – | – | – | – | – | 622 · 3.62 · 75 % · $0.10 | – |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (each pair at its default protect and its ranges' cells): 854 engine pairs evaluated, 53 passed (any range); Signal pairs are measured separately. Later stages: *candidate pool* = every config of the Base-passed pairs (33034 tapes; diagnostic, before config validation), Normal / Trailing / Trailing only apart; *post-Base validated / seated* = configs that passed config evaluation (10636); *simulated execution* = orders that passed the causal config, coordination, caps and Block gates. Unit PF is every close at one unit after the 0.20 % cost. Config-evaluation history is 6 h (max of longH and preH); Base history is reported separately. Replay-only selection-window override: 6 h; it does not change normal runtime settings. The additional per-config entry last-N check is off (wf.lastN = 0); configEval still validates configs before seating.Native liveLastN is not replayed unless --live-since is set.

| hour (UTC) | candidate pool (pre-validation) | pool Normal | pool Trailing | pool Trailing only | post-Base validated / seated | simulated executed (all types) | executed Normal | executed Trailing | executed Trailing only | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 20668 · 0.70 | 1158 · 12.62 | 19462 · 0.57 | – | 3194 · 2.88 | 1090 · 1.86 | 182 · ∞ (no loss) | 908 · 1.23 | – | 452 · 8.34 | – |
| 23:00 | 15986 · 0.12 | 432 · 3.17 | 15554 · 0.07 | – | 1004 · 0.56 | 624 · 0.58 | 76 · 2.27 | 548 · 0.37 | – | 500 · 0.45 | – |
| 00:00 | 27422 · 0.87 | 2658 · 17.24 | 24724 · 0.60 | 3 · 0.00 | 5220 · 3.97 | 1398 · 2.80 | 374 · 23.35 | 1024 · 1.72 | – | 922 · 3.73 | – |
| 01:00 | 25834 · 0.30 | 1852 · 4.84 | 23906 · 0.16 | 60 · 0.10 | 6236 · 0.57 | 1764 · 0.63 | 324 · 83.33 | 1440 · 0.09 | – | 1216 · 0.66 | – |
| 02:00 | 136098 · 0.64 | 31713 · 0.80 | 101582 · 0.55 | 1312 · 2.65 | 40203 · 0.65 | 4958 · 2.21 | 2176 · 3.14 | 2774 · 1.81 | – | 2297 · 1.73 | – |
| 03:00 | 92104 · 0.54 | 14430 · 0.89 | 76575 · 0.45 | 274 · 2.58 | 20819 · 0.79 | 858 · 1.47 | 208 · ∞ (no loss) | 650 · 0.87 | – | 750 · 1.82 | – |
| **total** | **318112 · 0.60** | **52243 · 0.91** | **261803 · 0.49** | **1649 · 2.63** | **76676 · 0.72** | **10692 · 1.90** | **3340 · 4.15** | **7344 · 1.34** | **–** | **6137 · 1.71** | **–** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2438 | 2304 / 134 | 4.31 | 4.31 | 1.86 | $0.13 | 94.50 % | 0.83 |
| Trailing | 5500 | 2588 / 2912 | 1.33 | 1.33 | 0.43 | -$0.31 | 47.05 % | 5.75 |
| Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| DCA | 8 | 8 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.01 | 100.00 % | 0.00 |
| Signal · Normal | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Trailing | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| total | 7946 | 4900 / 3046 | 1.90 | 1.90 | 0.75 | -$0.17 | 61.67 % | 2.50 |
| of which Block-raised | 4405 | 2811 / 1594 | 1.72 | 1.72 | 0.85 | -$0.07 | 63.81 % | 2.42 |
| of which Signals | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| of which Engine (no signals) | 7946 | 4900 / 3046 | 1.90 | 1.90 | 0.75 | -$0.17 | 61.67 % | 2.50 |

## Timeframe lanes

| lane | orders | Return PF | cash PF (base $1) | sized $ PF diagnostic | net |
|---|---:|---:|---:|---:|---:|
| 5m | 2604 | 0.83 | 0.83 | 1.61 | $0.13 |
| 5m+ | 306 | 21.81 | 21.81 | 21.81 | $0.00 |
| 15m | 4409 | 2.70 | 2.70 | 0.50 | -$0.15 |
| 15m+ | 627 | 1.80 | 1.80 | 0.07 | -$0.15 |

## Execution presets on the same tapes

Preset aggregates without recorded unit-return provenance retain their archived values; their primary return PF is unavailable.

The stored preset sample may include endpoint marks; it is separate from the closed-order headline.

| preset | stored outcomes | Return PF | stored net % (recorded basis) |
|---|---:|---:|---:|
| All on (no Active) | 4411 | 1.16 | 91.02 |
| Normal only | 968 | 5.80 | 262.80 |
| Normal + Trailing | 4410 | 1.16 | 90.42 |
| Trailing only | 0 | – | 0.00 |
| Normal + Trailing + Block | 4410 | 1.16 | 90.42 |
| Block Active | 0 | – | 0.00 |
| Normal off, Block + DCA | 871 | 0.17 | -231.76 |
| DCA only | 1 | ∞ (no loss) | 0.60 |
| DCA Active only | 0 | – | 0.00 |
| Normal off · Trailing + Block Active | 0 | – | 0.00 |
| Normal + DCA Active | 968 | 5.80 | 262.80 |
| Normal off · Trailing + DCA | 871 | 0.17 | -231.76 |
| Normal + Trailing + Block Active | 0 | – | 0.00 |
| Axis only | 0 | – | 0.00 |
| Normal + Axis | 968 | 5.80 | 262.80 |
| Normal off · Trailing + Axis | 0 | – | 0.00 |
| All on + Axis (no Active) | 4411 | 1.16 | 91.02 |
| Block Active + DCA Active | 0 | – | 0.00 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 7212 | 4396 / 2816 | 1.60 | 1.60 | 0.71 | -$0.20 | 60.95 % | 2.50 |
| Minimal | 726 | 496 / 230 | 10.72 | 10.72 | 4.06 | $0.02 | 68.32 % | 4.25 |
| Short | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Wide | 8 | 8 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.01 | 100.00 % | 0.00 |
| Signals | 0 | 0 / 0 | – | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Micro | 19156 | duplicate 13200 · symPf 5956 |
| Minimal | 910 | duplicate 618 · symPf 292 |
| Wide | 109 | duplicate 57 · symPf 52 |

## Base said, the book did — the same ranges on the same basis

The primary result and the gates use net return PF. Base lists a median gate score across passed sets on its validation
sample; a no-loss Base sample has an exact pooled PF of ∞ and a separate finite gate score. The simulated book pools its closed-order returns in the run. Those samples and reducers differ, so
their difference alone does not establish edge loss or a sizing effect. Cash PF is a separate diagnostic on
the same closed orders as the book's return PF; unequal notionals can change cash PF without changing return PF.

| range | Base passed (median gate score, validation sample) | simulated return PF (run closes) | cash PF (base $1) | sized $ PF diagnostic (same run closes) | orders |
|---|---:|---:|---:|---:|---:|
| Micro | 4.00 | 1.60 | 1.60 | 0.71 | 7212 |
| Minimal | 4.00 | 10.72 | 10.72 | 4.06 | 726 |
| Short | – | – | – | – | 0 |
| General | – | – | – | – | 0 |
| Long | – | – | – | – | 0 |
| Wide | – | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 8 |
| Signals | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (10636 of 27484 evaluated, 28120 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (0 units active at the run start, 0 over the run, 0 of 4914 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 4008 | 1662 (41 %) | 25568 | 81 % | 0.79 | -1683.15 |
| Micro | trailing | 5660 | 2100 (37 %) | 46856 | 50 % | 0.67 | -4124.91 |
| Minimal | normal | 292 | 70 (24 %) | 762 | 62 % | 0.55 | -257.80 |
| Minimal | trailing | 668 | 244 (37 %) | 3464 | 51 % | 0.81 | -253.77 |
| Wide | dca | 8 | 2 (25 %) | 26 | 77 % | 0.27 | -42.37 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 9668 | 3762 (39 %) | 72424 | 61 % | 0.72 | -5808.06 |
| Minimal | active | 960 | 314 (33 %) | 4226 | 53 % | 0.73 | -511.57 |
| Wide | active | 8 | 2 (25 %) | 26 | 77 % | 0.27 | -42.37 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (6 h) ≥ max(3, 12) closes, positive net, PF ≥ its full indication's range minimum (stage 1.1; micro 1.05, minimal 1.08, general 1.12, long 1.18; full indication-aware Tactic floor 1.1, retaining stricter settings; mixed indication groups can have different minima), drawdown time ≤ min(2.92 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 6 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 2.92 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 0 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss uses the runtime's no-loss gate score, not an exact finite ratio).

| range | configs | evaluated | passed | median PF score (evaluated) | median PF score (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 25704 | 25704 | 9668 | 1.81 | 4.00 | 2.92–2.92 (median 2.92) | 1254 | 8666 | 368 | 3196 | 1356 | 0 | 990 | 10 | 194 | 2 | 0 | 0 | 0 |  |
| Minimal | 1568 | 1568 | 960 | 4.00 | 7.31 | 2.92–2.92 (median 2.92) | 98 | 138 | 38 | 234 | 56 | 0 | 40 | 0 | 4 | 0 | 0 | 0 | 0 |  |
| Short | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| General | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Long | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Wide | 848 | 212 | 8 | 4.00 | 4.00 | 2.92–2.92 (median 2.92) | 204 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 636 | 0 |  |
| Signals | 4914 | – | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 4914 signal tapes, 0 units (pair × symbol × direction) active at the run start, 0 over the run; 0 configs entered while their unit was active — seated per unit and step, not configEval |

## Diagnostic: every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes. This all-candidate table is diagnostic only: it is not the PF benchmark and does not qualify or dilute the post-Base execution cohort.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 6426 | 2690 (42 %) | 50182 | 76 % | 0.80 | -3164.45 |
| Micro | trailing | 19278 | 4566 (24 %) | 251236 | 39 % | 0.45 | -33368.21 |
| Minimal | normal | 392 | 162 (41 %) | 1460 | 77 % | 1.10 | 65.18 |
| Minimal | trailing | 1176 | 462 (39 %) | 9936 | 43 % | 0.82 | -460.02 |
| Wide | axis | 424 | 4 (1 %) | 1291 | 9 % | 0.08 | -1064.10 |
| Wide | dca | 212 | 148 (70 %) | 520 | 95 % | 2.02 | 256.19 |
| Wide | dca-active | 212 | 14 (7 %) | 606 | 12 % | 0.13 | -594.48 |
| Signals | normal | 1890 | 397 (21 %) | 601 | 94 % | 12.01 | 1613.55 |
| Signals | trailing | 1890 | 430 (23 %) | 631 | 100 % | ∞ (no loss) | 1709.57 |
| Signals | trailing-only | 1134 | 533 (47 %) | 1649 | 64 % | 2.63 | 1615.10 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 9668 | 3762 (39 %) | 72424 | 61 % | 0.72 | -5808.06 |
| Minimal | active | 960 | 314 (33 %) | 4226 | 53 % | 0.73 | -511.57 |
| Wide | active | 8 | 2 (25 %) | 26 | 77 % | 0.27 | -42.37 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-rsi3-30@m5 | 284 | 250 (88 %) | 3510 | 66 % | 2.91 | 474.24 | tp0.7 sl1.4 tr0 h192 mc (8 · ∞ (no loss) · 4.00) |
| Micro | follow | mc-rsi2-25@m5 | 220 | 190 (86 %) | 4658 | 69 % | 1.62 | 421.30 | tp0.7 sl1.4 tr0 h192 mc (17 · 5.00 · 6.40) |
| Micro | follow | mc-rsi2-30@m5 | 148 | 130 (88 %) | 2740 | 75 % | 1.96 | 400.47 | tp0.7 sl1.925 tr0 h192 mc (15 · ∞ (no loss) · 7.50) |
| Micro | follow | mc-rsit2-20@m5 | 158 | 130 (82 %) | 2650 | 81 % | 1.70 | 306.95 | tp0.6 sl2.25 tr0 h192 mc (14 · ∞ (no loss) · 5.60) |
| Micro | follow | mc-rsi2-20@m5 | 192 | 164 (85 %) | 3824 | 65 % | 1.50 | 243.75 | tp0.6 sl1.35 tr0 h192 mc (14 · 3.35 · 3.65) |
| Micro | follow | mc-rsit2-30@m15 | 460 | 360 (78 %) | 2306 | 63 % | 1.49 | 235.64 | tp0.4 sl1.8 tr0 h64 mc (10 · ∞ (no loss) · 2.00) |
| Micro | follow | mc-rsit2-30@m5 | 72 | 64 (89 %) | 1338 | 86 % | 2.40 | 219.23 | tp0.6 sl2.25 tr0 h192 mc (16 · ∞ (no loss) · 6.40) |
| Micro | follow | mc-rsit2-25@m5 | 110 | 80 (73 %) | 2298 | 75 % | 1.67 | 212.77 | tp0.6 sl2.25 tr0 h192 mc (16 · ∞ (no loss) · 6.40) |
| Micro | follow | mc-rsit2-25@m15 | 492 | 348 (71 %) | 2514 | 56 % | 1.29 | 153.87 | tp0.4 sl1.8 tr0 h64 mc (8 · ∞ (no loss) · 1.60) |
| Micro | follow | mc-rsit3-30@m5 | 162 | 124 (77 %) | 2534 | 76 % | 1.33 | 137.17 | tp0.6 sl1.35 tr0 h192 mc (12 · 2.84 · 2.85) |
| Micro | follow | mc-tpull-8@m15 | 128 | 126 (98 %) | 802 | 77 % | 5.45 | 136.88 | tp0.6 sl0.75 tr0 h64 mc (6 · ∞ (no loss) · 2.40) |
| Micro | follow | mc-rsit2-20@m15 | 328 | 214 (65 %) | 1700 | 63 % | 1.23 | 97.93 | tp0.4 sl1.8 tr0 h64 mc (6 · ∞ (no loss) · 1.20) |
| Micro | follow | mc-rsit4-30@m5 | 80 | 62 (78 %) | 878 | 85 % | 1.37 | 63.78 | tp0.6 sl1.05 tr0 h192 mc (10 · 2.88 · 2.35) |
| Micro | follow | mc-rsit2-15@m5 | 96 | 72 (75 %) | 1244 | 81 % | 1.18 | 46.21 | tp0.6 sl1.35 tr0 h192 mc (11 · 2.58 · 2.45) |
| Micro | follow | mc-rsit2-10@m5 | 184 | 108 (59 %) | 1664 | 81 % | 1.10 | 44.09 | tp0.7 sl0.875 tr0.525 h192 mc (8 · 3.26 · 2.42) |
| Micro | follow | mc-rsit3-20@m5 | 98 | 60 (61 %) | 854 | 85 % | 1.18 | 43.60 | tp0.8 sl1 tr0.6 h192 mc (8 · 2.73 · 2.28) |
| Micro | follow | mc-rsit3-25@m5 | 88 | 52 (59 %) | 968 | 81 % | 1.15 | 31.34 | tp0.6 sl1.05 tr0 h192 mc (9 · 2.56 · 1.95) |
| Micro | follow | mc-macdh@m5 | 38 | 30 (79 %) | 622 | 78 % | 1.26 | 26.20 | tp0.5 sl1.875 tr0 h192 mc (14 · 1.88 · 1.82) |
| Micro | follow | mc-rsi2-15@m15 | 122 | 68 (56 %) | 548 | 73 % | 1.17 | 18.10 | tp0.5 sl1.375 tr0.375 h64 mc (5 · 10.35 · 1.08) |
| Micro | follow | mc-rsi4-30@m5 | 218 | 140 (64 %) | 1264 | 59 % | 1.06 | 12.24 | tp0.5 sl1.625 tr0 h192 mc (5 · ∞ (no loss) · 1.50) |
| Micro | follow | mc-rsi2-15@m5 | 156 | 98 (63 %) | 2112 | 63 % | 0.98 | -5.95 | tp0.4 sl1.3 tr0.3 h192 mc (13 · 2.82 · 1.16) |
| Micro | follow | mc-rsit4-25@m5 | 26 | 8 (31 %) | 234 | 79 % | 0.89 | -6.20 | tp0.5 sl1 tr0 h192 mc (9 · 2.00 · 1.20) |
| Micro | follow | mc-rsi3-20@m15 | 70 | 30 (43 %) | 328 | 79 % | 0.87 | -10.81 | tp0.5 sl1.125 tr0 h64 mc (5 · 0.91 · -0.13) |
| Micro | follow | mc-rsit5-30@m5 | 40 | 12 (30 %) | 398 | 77 % | 0.86 | -12.98 | tp0.5 sl1.25 tr0 h192 mc (9 · 1.66 · 0.95) |
| Micro | follow | mc-rsit3-15@m5 | 76 | 26 (34 %) | 608 | 83 % | 0.87 | -17.16 | tp0.5 sl0.875 tr0 h192 mc (8 · 1.95 · 1.02) |
| Micro | follow | mc-rsi4-30@m15 | 18 | 0 (0 %) | 58 | 48 % | 0.11 | -45.60 | tp0.4 sl1.2 tr0 h64 mc (5 · 0.10 · -3.80) |
| Micro | follow | mc-mturn-10@m5 | 246 | 104 (42 %) | 1136 | 81 % | 0.89 | -51.75 | tp0.8 sl0.8 tr0 h192 mc (5 · 2.40 · 1.40) |
| Micro | follow | mc-rsit4-20@m5 | 58 | 4 (7 %) | 500 | 76 % | 0.64 | -54.18 | tp0.6 sl0.75 tr0 h192 mc (9 · 3.37 · 2.25) |
| Micro | follow | mc-rsi5-30@m5 | 168 | 88 (52 %) | 1130 | 55 % | 0.72 | -59.02 | tp0.5 sl1.375 tr0.375 h192 mc (6 · 13.35 · 1.39) |
| Micro | follow | mc-rsi3-15@m5 | 80 | 32 (40 %) | 290 | 35 % | 0.22 | -70.70 | tp0.4 sl1.3 tr0.2 h192 mc (6 · 0.51 · -0.38) |
| Micro | follow | mc-rsi5-25@m5 | 90 | 16 (18 %) | 598 | 53 % | 0.41 | -93.67 | tp0.4 sl1.3 tr0.3 h192 mc (6 · 6.83 · 0.85) |
| Micro | follow | mc-rsi4-20@m5 | 92 | 16 (17 %) | 514 | 50 % | 0.33 | -105.29 | tp0.4 sl1.3 tr0.3 h192 mc (5 · 5.46 · 0.65) |
| Micro | follow | mc-mturn-10@m15 | 72 | 18 (25 %) | 502 | 48 % | 0.35 | -110.55 | tp0.4 sl1.8 tr0 h64 mc (6 · ∞ (no loss) · 1.20) |
| Micro | follow | mc-rsit3-20@m15 | 78 | 6 (8 %) | 794 | 46 % | 0.39 | -119.98 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsit2-10@m15 | 94 | 18 (19 %) | 662 | 32 % | 0.29 | -127.54 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsi4-25@m5 | 142 | 16 (11 %) | 1016 | 58 % | 0.49 | -151.83 | tp0.4 sl1.3 tr0.3 h192 mc (7 · 8.19 · 1.05) |
| Micro | follow | mc-rsi3-25@m15 | 84 | 0 (0 %) | 396 | 52 % | 0.25 | -154.45 | tp0.4 sl1.3 tr0.3 h64 mc (6 · 0.34 · -1.16) |
| Micro | follow | mc-rsit2-15@m15 | 162 | 54 (33 %) | 1082 | 42 % | 0.44 | -173.84 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsi3-25@m5 | 216 | 50 (23 %) | 2024 | 56 % | 0.64 | -177.35 | tp0.4 sl1.3 tr0.3 h192 mc (10 · 1.94 · 0.58) |
| Micro | follow | mc-rsi2-25@m5c | 170 | 32 (19 %) | 816 | 44 % | 0.26 | -246.81 | tp0.4 sl1.3 tr0.3 h192 mc (5 · 2.05 · 0.31) |
| Micro | follow | mc-rsi3-20@m5 | 174 | 16 (9 %) | 918 | 58 % | 0.37 | -258.93 | tp0.4 sl1.3 tr0.3 h192 mc (7 · 2.29 · 0.56) |
| Micro | follow | mc-rsi2-30@m5c | 138 | 0 (0 %) | 670 | 51 % | 0.28 | -260.40 | tp0.6 sl1.35 tr0.45 h192 mc (5 · 0.69 · -0.54) |
| Micro | follow | mc-rsit3-30@m15 | 226 | 78 (35 %) | 1590 | 41 % | 0.45 | -261.19 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsit4-30@m15 | 236 | 54 (23 %) | 2058 | 35 % | 0.40 | -293.68 | tp0.4 sl1.8 tr0 h64 mc (6 · ∞ (no loss) · 1.20) |
| Micro | follow | mc-rsi2-20@m15c | 230 | 48 (21 %) | 844 | 50 % | 0.32 | -298.05 | tp0.5 sl1 tr0.375 h64 mc (5 · 0.65 · -0.49) |
| Micro | follow | mc-rsit3-25@m15 | 220 | 54 (25 %) | 1744 | 31 % | 0.31 | -323.89 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-macdh@m15 | 132 | 30 (23 %) | 1002 | 39 % | 0.20 | -374.91 | tp0.5 sl1.875 tr0.375 h64 mc (5 · 1.16 · 0.08) |
| Micro | follow | mc-rsi2-20@m15 | 408 | 48 (12 %) | 1432 | 40 % | 0.34 | -553.16 | tp0.5 sl1.375 tr0.375 h64 mc (5 · 0.53 · -0.79) |
| Micro | follow | mc-rsi3-30@m15 | 342 | 0 (0 %) | 1042 | 29 % | 0.14 | -818.49 | tp0.7 sl1.225 tr0.35 h64 mc (6 · 0.22 · -1.78) |
| Micro | follow | mc-rsi2-25@m15c | 348 | 0 (0 %) | 1048 | 35 % | 0.14 | -845.43 | tp0.7 sl0.7 tr0 h64 mc (5 · 0.37 · -1.70) |
| Micro | follow | mc-rsi2-30@m15 | 444 | 12 (3 %) | 2340 | 52 % | 0.39 | -903.45 | tp0.7 sl1.575 tr0.525 h64 mc (7 · 1.28 · 0.55) |
| Micro | follow | mc-rsi2-30@m15c | 510 | 22 (4 %) | 1712 | 50 % | 0.30 | -1052.67 | tp0.8 sl0.8 tr0 h64 mc (5 · 0.90 · -0.20) |
| Micro | follow | mc-rsi2-25@m15 | 444 | 0 (0 %) | 1910 | 40 % | 0.24 | -1093.95 | tp1 sl1.75 tr0.5 h64 mc (5 · 0.72 · -0.63) |
| Minimal | follow | mc-rsit2-30@m15 | 150 | 118 (79 %) | 564 | 67 % | 2.37 | 163.02 | tp1.1 sl1.65 tr0.55 h64 mn (5 · 1.95 · 1.75) |
| Minimal | follow | mc-rsit2-25@m15 | 120 | 90 (75 %) | 442 | 60 % | 1.66 | 71.12 | tp1 sl1.5 tr0.5 h64 mn (5 · 1.88 · 1.50) |
| Minimal | follow | mc-rsit2-20@m5 | 12 | 12 (100 %) | 154 | 86 % | 4.00 | 59.39 | tp0.8 sl2.2 tr0.6 h192 mn (12 · 56.35 · 6.48) |
| Minimal | follow | mc-rsi2-25@m5 | 28 | 18 (64 %) | 536 | 59 % | 1.67 | 55.60 | tp0.8 sl1.4 tr0 h192 mn (14 · 4.88 · 6.20) |
| Minimal | follow | mc-rsi2-30@m5 | 20 | 18 (90 %) | 350 | 60 % | 1.71 | 40.90 | tp0.8 sl1.4 tr0 h192 mn (13 · 4.50 · 5.60) |
| Minimal | follow | mc-mturn-10@m5 | 28 | 26 (93 %) | 136 | 82 % | 1.46 | 21.20 | tp0.8 sl1.2 tr0 h192 mn (5 · 1.71 · 1.00) |
| Minimal | follow | mc-rsit2-20@m15 | 34 | 20 (59 %) | 146 | 66 % | 1.08 | 4.81 | tp0.8 sl1.6 tr0.6 h64 mn (5 · 0.91 · -0.19) |
| Minimal | follow | mc-rsi3-30@m15 | 42 | 0 (0 %) | 98 | 29 % | 0.19 | -70.42 | – |
| Minimal | follow | mc-rsi2-25@m15c | 42 | 0 (0 %) | 136 | 40 % | 0.23 | -80.19 | tp0.8 sl1.2 tr0.3 h64 mn (5 · 0.22 · -2.29) |
| Minimal | follow | mc-rsi2-20@m15 | 82 | 0 (0 %) | 292 | 29 % | 0.33 | -108.42 | tp0.8 sl1.4 tr0.4 h64 mn (5 · 0.00 · -1.96) |
| Minimal | follow | mc-rsi2-30@m15 | 114 | 0 (0 %) | 478 | 39 % | 0.41 | -188.61 | tp0.8 sl1.6 tr0.6 h64 mn (7 · 0.86 · -0.30) |
| Minimal | follow | mc-rsi2-25@m15 | 120 | 0 (0 %) | 428 | 31 % | 0.27 | -231.45 | tp1 sl1.75 tr0.5 h64 mn (5 · 0.72 · -0.63) |
| Minimal | follow | mc-rsi2-30@m15c | 168 | 12 (7 %) | 466 | 50 % | 0.40 | -248.52 | tp0.8 sl1.2 tr0.4 h64 mn (5 · 0.42 · -1.67) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Micro | tp 0.500% (net 0.300%) | sl 3.75× | tr off | 90 | 66 (73 %) | 650 | 92 % | 1.60 | 66.75 |
| Micro | tp 0.500% (net 0.300%) | sl 4.00× | tr off | 90 | 66 (73 %) | 650 | 92 % | 1.51 | 60.00 |
| Micro | tp 0.600% (net 0.400%) | sl 3.75× | tr off | 52 | 32 (62 %) | 334 | 92 % | 1.93 | 59.50 |
| Micro | tp 0.600% (net 0.400%) | sl 4.00× | tr off | 52 | 32 (62 %) | 334 | 92 % | 1.82 | 55.60 |
| Micro | tp 0.600% (net 0.400%) | sl 3.00× | tr off | 52 | 30 (58 %) | 342 | 90 % | 1.81 | 55.20 |
| Micro | tp 0.500% (net 0.300%) | sl 4.25× | tr off | 90 | 66 (73 %) | 650 | 92 % | 1.42 | 53.25 |
| Micro | tp 0.600% (net 0.400%) | sl 4.25× | tr off | 52 | 32 (62 %) | 334 | 92 % | 1.72 | 51.70 |
| Micro | tp 0.600% (net 0.400%) | sl 3.25× | tr off | 52 | 30 (58 %) | 342 | 90 % | 1.69 | 50.10 |
| Micro | tp 0.600% (net 0.400%) | sl 4.50× | tr off | 52 | 32 (62 %) | 334 | 92 % | 1.63 | 47.80 |
| Micro | tp 0.500% (net 0.300%) | sl 4.50× | tr off | 90 | 60 (67 %) | 650 | 92 % | 1.35 | 46.50 |
| Micro | tp 0.600% (net 0.400%) | sl 3.50× | tr off | 52 | 30 (58 %) | 342 | 90 % | 1.58 | 45.00 |
| Micro | tp 0.600% (net 0.400%) | sl 4.75× | tr off | 52 | 32 (62 %) | 324 | 92 % | 1.50 | 39.90 |
| Micro | tp 0.500% (net 0.300%) | sl 4.75× | tr off | 90 | 60 (67 %) | 650 | 92 % | 1.29 | 39.75 |
| Micro | tp 0.600% (net 0.400%) | sl 2.50× | tr off | 54 | 24 (44 %) | 368 | 86 % | 1.43 | 38.00 |
| Micro | tp 0.600% (net 0.400%) | sl 5.00× | tr off | 52 | 32 (62 %) | 324 | 92 % | 1.43 | 36.00 |
| Micro | tp 0.600% (net 0.400%) | sl 2.75× | tr off | 56 | 26 (46 %) | 378 | 86 % | 1.36 | 34.20 |
| Micro | tp 0.500% (net 0.300%) | sl 3.25× | tr off | 82 | 38 (46 %) | 578 | 89 % | 1.28 | 33.15 |
| Micro | tp 0.500% (net 0.300%) | sl 5.00× | tr off | 90 | 58 (64 %) | 650 | 92 % | 1.23 | 33.00 |
| Micro | tp 0.500% (net 0.300%) | sl 3.50× | tr off | 84 | 40 (48 %) | 608 | 89 % | 1.22 | 29.40 |
| Micro | tp 0.500% (net 0.300%) | sl 3.00× | tr off | 82 | 36 (44 %) | 586 | 87 % | 1.22 | 27.80 |
| Minimal | tp 0.800% | sl 2.75× | tr 0.75× | 24 | 14 (58 %) | 154 | 70 % | 1.75 | 27.70 |
| Minimal | tp 0.800% | sl 2.25× | tr 0.75× | 24 | 14 (58 %) | 158 | 68 % | 1.64 | 25.30 |
| Micro | tp 0.400% (net 0.200%) | sl 4.50× | tr off | 106 | 64 (60 %) | 874 | 92 % | 1.19 | 25.20 |
| Minimal | tp 0.800% | sl 3.00× | tr 0.75× | 24 | 14 (58 %) | 154 | 70 % | 1.62 | 24.90 |
| Micro | tp 0.600% (net 0.400%) | sl 3.00× | tr 0.75× | 66 | 44 (67 %) | 552 | 60 % | 1.23 | 24.61 |
| Minimal | tp 0.800% | sl 2.50× | tr 0.75× | 24 | 14 (58 %) | 158 | 68 % | 1.50 | 21.70 |
| Micro | tp 0.600% (net 0.400%) | sl 2.25× | tr off | 60 | 30 (50 %) | 434 | 82 % | 1.18 | 21.50 |
| Micro | tp 0.800% (net 0.600%) | sl 2.25× | tr 0.75× | 24 | 14 (58 %) | 138 | 65 % | 1.52 | 18.36 |
| Micro | tp 0.400% (net 0.200%) | sl 4.75× | tr off | 106 | 60 (57 %) | 872 | 92 % | 1.13 | 18.00 |
| Micro | tp 0.600% (net 0.400%) | sl 3.25× | tr 0.75× | 66 | 42 (64 %) | 550 | 60 % | 1.16 | 17.81 |
| Micro | tp 0.800% (net 0.600%) | sl 2.75× | tr 0.75× | 24 | 14 (58 %) | 136 | 66 % | 1.45 | 16.76 |
| Micro | tp 0.400% (net 0.200%) | sl 3.25× | tr 0.75× | 38 | 26 (68 %) | 392 | 64 % | 1.44 | 15.27 |
| Micro | tp 0.800% (net 0.600%) | sl 2.50× | tr 0.75× | 24 | 14 (58 %) | 138 | 65 % | 1.39 | 15.16 |
| Micro | tp 0.800% (net 0.600%) | sl 3.00× | tr 0.75× | 24 | 14 (58 %) | 136 | 66 % | 1.35 | 13.96 |
| Micro | tp 0.700% (net 0.500%) | sl 2.75× | tr 0.75× | 34 | 20 (59 %) | 252 | 63 % | 1.20 | 13.33 |
| Minimal | tp 0.800% | sl 2.00× | tr 0.75× | 22 | 12 (55 %) | 138 | 67 % | 1.31 | 12.97 |
| Micro | tp 0.400% (net 0.200%) | sl 4.00× | tr 0.75× | 56 | 34 (61 %) | 654 | 64 % | 1.18 | 12.62 |
| Micro | tp 0.400% (net 0.200%) | sl 3.75× | tr 0.75× | 54 | 34 (63 %) | 628 | 64 % | 1.17 | 11.83 |
| Micro | tp 0.600% (net 0.400%) | sl 3.50× | tr 0.75× | 66 | 42 (64 %) | 550 | 60 % | 1.10 | 11.81 |
| Micro | tp 0.400% (net 0.200%) | sl 5.00× | tr off | 106 | 58 (55 %) | 872 | 92 % | 1.07 | 11.20 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Micro | tp 0.500% (net 0.300%) | sl 2.00× | tr off | 64 | 16 (25 %) | 494 | 61 % | 0.39 | -139.80 |
| Micro | tp 0.500% (net 0.300%) | sl 2.50× | tr 0.75× | 54 | 6 (11 %) | 476 | 46 % | 0.37 | -112.65 |
| Micro | tp 0.400% (net 0.200%) | sl 2.75× | tr off | 66 | 12 (18 %) | 536 | 73 % | 0.41 | -111.80 |
| Micro | tp 0.400% (net 0.200%) | sl 3.00× | tr off | 78 | 10 (13 %) | 624 | 77 % | 0.47 | -108.80 |
| Micro | tp 0.500% (net 0.300%) | sl 2.25× | tr 0.75× | 52 | 4 (8 %) | 416 | 43 % | 0.33 | -108.13 |
| Micro | tp 0.500% (net 0.300%) | sl 2.25× | tr off | 74 | 20 (27 %) | 538 | 70 % | 0.53 | -101.85 |
| Micro | tp 0.500% (net 0.300%) | sl 1.50× | tr off | 32 | 4 (13 %) | 246 | 44 % | 0.25 | -98.70 |
| Micro | tp 0.400% (net 0.200%) | sl 2.50× | tr off | 60 | 12 (20 %) | 502 | 73 % | 0.44 | -92.80 |
| Micro | tp 0.500% (net 0.300%) | sl 3.25× | tr 0.75× | 76 | 20 (26 %) | 700 | 52 % | 0.56 | -87.50 |
| Micro | tp 0.600% (net 0.400%) | sl 1.75× | tr off | 48 | 16 (33 %) | 360 | 61 % | 0.50 | -87.00 |
| Micro | tp 0.500% (net 0.300%) | sl 3.00× | tr 0.75× | 76 | 20 (26 %) | 704 | 52 % | 0.57 | -83.55 |
| Micro | tp 0.600% (net 0.400%) | sl 2.00× | tr 0.75× | 40 | 8 (20 %) | 306 | 42 % | 0.39 | -80.57 |
| Micro | tp 0.400% (net 0.200%) | sl 2.25× | tr off | 46 | 4 (9 %) | 336 | 67 % | 0.36 | -78.40 |
| Micro | tp 0.600% (net 0.400%) | sl 1.50× | tr off | 30 | 6 (20 %) | 202 | 48 % | 0.33 | -78.20 |
| Micro | tp 0.500% (net 0.300%) | sl 2.50× | tr off | 76 | 28 (37 %) | 548 | 75 % | 0.61 | -77.10 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 29 (29) | 12614 | 6426 | 6426 | 0 | baseTarget 6188 |
| Micro | trailing | 29 (29) | 37842 | 19278 | 19278 | 0 | baseTarget 18564 |
| Minimal | normal | 29 (8) | 6678 | 392 | 392 | 0 | baseRange 5040 · baseTarget 1246 |
| Minimal | trailing | 29 (8) | 20034 | 1176 | 1176 | 0 | baseRange 15120 · baseTarget 3738 |
| Wide | axis | 29 (29) | 424 | 424 | 424 | 0 | – |
| Wide | dca | 29 (29) | 212 | 212 | 212 | 0 | – |
| Wide | dca-active | 29 (29) | 212 | 212 | 212 | 0 | – |

Engine indications Base evaluated that built no set: 200 (act-burst-2.5@x4, act-chop@x4, bb-walk@x4, break-atr-2@x4, break-mc-rel-don-15-dd24-balanced, break-mc-rel-don-15-dd24-guarded, break-mc-rel-don-15-dd48-balanced, break-mc-rel-don-15-dd48-guarded, break-mc-rel-don-5-dd24-balanced, break-mc-rel-don-5-dd24-guarded, break-mc-rel-don-5-dd48-balanced, break-mc-rel-don-5-dd48-guarded, break-mc-rel-don-5x15-dd24-balanced, break-mc-rel-don-5x15-dd24-guarded, break-mc-rel-don-5x15-dd48-balanced, break-mc-rel-don-5x15-dd48-guarded, break-mc-rel-don8-15-dd24-balanced, break-mc-rel-don8-15-dd24-guarded, break-mc-rel-don8-15-dd48-balanced, break-mc-rel-don8-15-dd48-guarded, break-mc-rel-don8-5-dd24-balanced, break-mc-rel-don8-5-dd24-guarded, break-mc-rel-don8-5-dd48-balanced, break-mc-rel-don8-5-dd48-guarded, break-mc-rel-don8-5x15-dd24-balanced, break-mc-rel-don8-5x15-dd24-guarded, break-mc-rel-don8-5x15-dd48-balanced, break-mc-rel-don8-5x15-dd48-guarded, break-mc-rel-retest-15-dd24-balanced, break-mc-rel-retest-15-dd24-guarded, break-mc-rel-retest-15-dd48-balanced, break-mc-rel-retest-15-dd48-guarded, break-mc-rel-retest-5-dd24-balanced, break-mc-rel-retest-5-dd24-guarded, break-mc-rel-retest-5-dd48-balanced, break-mc-rel-retest-5-dd48-guarded, break-mc-rel-retest-5x15-dd24-balanced, break-mc-rel-retest-5x15-dd24-guarded, break-mc-rel-retest-5x15-dd48-balanced, break-mc-rel-retest-5x15-dd48-guarded, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.4 % | tp 0.5 % | tp 0.6 % | tp 0.7 % | tp 0.8 % | tp 0.9 % | tp 1 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 0.23 (6924) | 0.29 (6064) | 0.37 (4282) | 0.42 (1964) | 0.40 (1294) | 0.30 (694) | 0.27 (524) |
| 1.25× | 0.26 (6594) | 0.35 (5724) | 0.40 (4014) | 0.45 (1884) | 0.40 (1220) | 0.34 (636) | 0.36 (420) |
| 1.5× | 0.30 (6340) | 0.37 (5482) | 0.47 (3856) | 0.48 (1778) | 0.46 (1152) | 0.47 (558) | 0.58 (338) |
| 1.75× | 0.33 (6094) | 0.38 (5368) | 0.49 (3688) | 0.58 (1708) | 0.61 (1068) | 0.57 (516) | 0.54 (324) |
| 2× | 0.38 (5992) | 0.39 (5194) | 0.58 (3570) | 0.74 (1638) | 0.70 (1020) | 0.61 (482) | 0.68 (300) |
| 2.25× | 0.38 (5948) | 0.47 (5032) | 0.79 (3434) | 0.87 (1580) | 0.80 (966) | 0.60 (476) | 0.62 (300) |
| 2.5× | 0.38 (5826) | 0.46 (4986) | 0.86 (3368) | 0.84 (1558) | 0.78 (960) | 0.59 (472) | 0.58 (300) |
| 2.75× | 0.37 (5786) | 0.60 (4872) | 0.83 (3356) | 0.96 (1524) | 0.76 (956) | 0.56 (472) | 0.54 (300) |
| 3× | 0.42 (5690) | 0.64 (4792) | 0.88 (3310) | 0.93 (1518) | 0.72 (956) | 0.52 (472) | 0.50 (300) |
| 3.25× | 0.53 (5586) | 0.63 (4774) | 0.85 (3296) | 0.92 (1514) | 0.68 (956) | 0.47 (466) | 0.47 (300) |
| 3.5× | 0.52 (5576) | 0.64 (4726) | 0.82 (3294) | 0.88 (1514) | 0.63 (946) | 0.44 (464) | 0.45 (300) |
| 3.75× | 0.55 (5518) | 0.67 (4668) | 0.81 (3286) | 0.85 (1514) | 0.60 (946) | 0.42 (464) | 0.42 (300) |
| 4× | 0.55 (5504) | 0.66 (4652) | 0.78 (3286) | 0.81 (1506) | 0.58 (946) | 0.40 (464) | 0.40 (298) |
| 4.25× | 0.55 (5476) | 0.64 (4650) | 0.75 (3286) | 0.78 (1506) | 0.55 (946) | 0.38 (464) | 0.38 (298) |
| 4.5× | 0.56 (5422) | 0.62 (4650) | 0.73 (3286) | 0.75 (1506) | 0.54 (944) | 0.36 (460) | 0.37 (294) |
| 4.75× | 0.55 (5410) | 0.60 (4650) | 0.69 (3248) | 0.73 (1506) | 0.50 (934) | 0.35 (460) | 0.35 (288) |
| 5× | 0.54 (5390) | 0.58 (4650) | 0.67 (3248) | 0.70 (1506) | 0.48 (930) | 0.38 (444) | 0.34 (288) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.4 % | tp 0.5 % | tp 0.6 % | tp 0.7 % | tp 0.8 % | tp 0.9 % | tp 1 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 0.17 (56) | 0.20 (138) | 0.37 (96) | 0.57 (118) | 0.32 (116) | 0.30 (94) | 0.29 (120) |
| 1.25× | 0.17 (118) | 0.16 (160) | 0.32 (190) | 0.40 (116) | 0.40 (160) | 0.37 (192) | 0.44 (104) |
| 1.5× | 0.19 (228) | 0.26 (418) | 0.29 (332) | 0.55 (246) | 0.49 (236) | 0.51 (226) | 0.76 (140) |
| 1.75× | 0.19 (260) | 0.35 (374) | 0.45 (668) | 0.81 (426) | 0.80 (382) | 0.63 (222) | 0.70 (128) |
| 2× | 0.26 (550) | 0.38 (818) | 0.53 (814) | 0.96 (448) | 0.65 (322) | 0.80 (196) | 1.05 (112) |
| 2.25× | 0.29 (716) | 0.44 (1182) | 0.99 (1002) | 0.87 (434) | 0.90 (380) | 0.73 (196) | 0.95 (112) |
| 2.5× | 0.33 (974) | 0.49 (1304) | 1.08 (978) | 0.81 (430) | 0.83 (380) | 0.68 (196) | 0.87 (112) |
| 2.75× | 0.33 (1134) | 0.77 (1376) | 1.04 (986) | 0.99 (448) | 0.80 (378) | 0.63 (196) | 0.80 (112) |
| 3× | 0.46 (1354) | 0.82 (1570) | 1.37 (1020) | 0.93 (448) | 0.74 (378) | 0.59 (196) | 0.74 (112) |
| 3.25× | 0.86 (1236) | 0.82 (1558) | 1.29 (1018) | 0.87 (448) | 0.69 (378) | 0.53 (194) | 0.69 (112) |
| 3.5× | 0.77 (1586) | 0.89 (1556) | 1.22 (1018) | 0.82 (448) | 0.64 (372) | 0.50 (194) | 0.64 (112) |
| 3.75× | 0.81 (1756) | 1.12 (1760) | 1.27 (1010) | 0.78 (448) | 0.60 (372) | 0.47 (194) | 0.60 (112) |
| 4× | 0.80 (1778) | 1.09 (1756) | 1.21 (1010) | 0.73 (444) | 0.57 (372) | 0.45 (194) | 0.57 (110) |
| 4.25× | 0.85 (1880) | 1.04 (1756) | 1.15 (1010) | 0.69 (444) | 0.54 (372) | 0.43 (194) | 0.54 (110) |
| 4.5× | 1.02 (2044) | 1.00 (1756) | 1.10 (1010) | 0.66 (444) | 0.54 (370) | 0.41 (190) | 0.51 (110) |
| 4.75× | 0.98 (2036) | 0.96 (1756) | 1.01 (984) | 0.63 (444) | 0.49 (362) | 0.39 (190) | 0.49 (110) |
| 5× | 0.95 (2036) | 0.93 (1756) | 0.97 (984) | 0.61 (444) | 0.47 (358) | 0.37 (190) | 0.46 (110) |

### Micro — orders executed

| stop ÷ target | tp 0.4 % | tp 0.5 % | tp 0.6 % | tp 0.7 % | tp 0.8 % | tp 0.9 % | tp 1 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 0.51 (20) | 0.69 (28) | 1.05 (44) | ∞ (6) | 9.57 (8) | ∞ (10) | ∞ (18) |
| 1.25× | 0.44 (30) | 3.98 (30) | 8.22 (32) | ∞ (6) | 25.58 (20) | 13.70 (22) | ∞ (20) |
| 1.5× | 0.52 (38) | 2.02 (52) | 4.35 (42) | 22.02 (12) | 17.44 (30) | 3.06 (28) | 21.83 (26) |
| 1.75× | 0.98 (38) | 1.62 (48) | 1.35 (40) | 14.33 (26) | 10.39 (34) | 1.99 (34) | 3.45 (28) |
| 2× | 0.95 (62) | 1.46 (64) | 1.92 (58) | 5.60 (28) | 6.89 (36) | 5.36 (32) | 2.91 (30) |
| 2.25× | 1.27 (82) | 1.69 (92) | 1.22 (62) | 6.07 (36) | 6.89 (36) | 5.36 (32) | 2.66 (30) |
| 2.5× | 0.90 (90) | 1.52 (96) | 1.22 (68) | 6.07 (36) | 6.89 (36) | 5.36 (32) | 2.46 (30) |
| 2.75× | 0.84 (100) | 1.20 (130) | 1.16 (68) | 5.18 (38) | 7.65 (38) | 5.36 (32) | 2.28 (30) |
| 3× | 1.53 (114) | 0.98 (136) | 0.92 (74) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 2.13 (30) |
| 3.25× | 1.61 (152) | 1.15 (138) | 1.17 (72) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 2.00 (30) |
| 3.5× | 1.23 (164) | 1.10 (138) | 1.18 (74) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 1.88 (30) |
| 3.75× | 0.92 (182) | 0.80 (148) | 1.13 (74) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 1.78 (30) |
| 4× | 0.80 (186) | 0.78 (150) | 1.08 (74) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 1.68 (30) |
| 4.25× | 0.96 (196) | 0.75 (150) | 1.04 (74) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 1.60 (30) |
| 4.5× | 0.85 (204) | 0.73 (150) | 1.09 (80) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 1.52 (30) |
| 4.75× | 0.82 (204) | 0.68 (162) | 1.05 (80) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 1.45 (30) |
| 5× | 0.83 (224) | 0.66 (162) | 1.01 (80) | 5.18 (38) | 7.65 (38) | 5.64 (38) | 1.39 (30) |

### Minimal — every config computed

| stop ÷ target | tp 0.8 % | tp 0.9 % | tp 1 % | tp 1.1 % |
|---|---:|---:|---:|---:|
| 1.5× | 0.59 (1038) | 0.58 (510) | 0.72 (224) | 0.99 (84) |
| 1.75× | 0.80 (958) | – | 0.70 (210) | 1.41 (76) |
| 1.76× | – | 0.79 (468) | – | – |
| 2× | 0.99 (906) | 1.05 (438) | 0.89 (194) | 1.28 (76) |
| 2.24× | – | 0.99 (432) | – | – |
| 2.25× | 1.15 (860) | – | 0.82 (194) | 1.17 (76) |
| 2.5× | 1.08 (854) | 0.92 (432) | 0.76 (194) | 1.08 (76) |
| 2.74× | – | 0.87 (432) | – | – |
| 2.75× | 1.10 (846) | – | 0.70 (194) | 1.00 (76) |
| 3× | 1.04 (846) | 0.82 (432) | 0.66 (194) | 0.93 (76) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 0.8 % | tp 0.9 % | tp 1 % | tp 1.1 % |
|---|---:|---:|---:|---:|
| 1.5× | 0.46 (216) | 0.35 (138) | 0.74 (104) | 0.96 (38) |
| 1.75× | 0.83 (392) | – | 0.69 (92) | 1.39 (28) |
| 1.76× | – | 0.54 (148) | – | – |
| 2× | 0.72 (348) | 0.71 (126) | 1.01 (80) | 1.23 (28) |
| 2.24× | – | 0.65 (126) | – | – |
| 2.25× | 0.91 (390) | – | 0.91 (80) | 1.11 (28) |
| 2.5× | 0.84 (390) | 0.60 (126) | 0.83 (80) | 1.00 (28) |
| 2.74× | – | 0.55 (126) | – | – |
| 2.75× | 0.83 (386) | – | 0.76 (80) | 0.92 (28) |
| 3× | 0.78 (386) | 0.51 (126) | 0.70 (80) | 0.85 (28) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % | tp 0.9 % | tp 1 % | tp 1.1 % |
|---|---:|---:|---:|---:|
| 1.5× | 15.83 (26) | 3.34 (26) | 48.83 (20) | 75.03 (20) |
| 1.75× | 9.34 (30) | – | 25.91 (22) | 58.36 (16) |
| 1.76× | – | 2.11 (32) | – | – |
| 2× | 6.89 (36) | 6.37 (32) | 25.91 (22) | 58.36 (16) |
| 2.24× | – | 6.37 (32) | – | – |
| 2.25× | 6.89 (36) | – | 25.91 (22) | 58.36 (16) |
| 2.5× | 6.89 (36) | 6.37 (32) | 25.91 (22) | 58.36 (16) |
| 2.74× | – | 6.37 (32) | – | – |
| 2.75× | 7.65 (38) | – | 25.91 (22) | 58.36 (16) |
| 3× | 7.65 (38) | 6.37 (32) | 25.91 (22) | 58.36 (16) |

### Wide — every config computed

| stop ÷ target | tp 0.76 % | tp 0.8 % | tp 0.91 % | tp 1.2 % | tp 1.62 % | tp 2.11 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.89× | 0.29 (926) | – | – | – | – | – | – | – |
| 0.93× | – | – | 1.72 (204) | – | – | – | – | – |
| 0.98× | – | – | – | – | 1.34 (127) | – | – | – |
| 0.99× | – | – | – | – | – | 0.93 (94) | – | – |
| 1× | – | 0.12 (759) | – | 0.30 (134) | – | – | 0.28 (91) | 0.29 (82) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.76 % | tp 0.8 % | tp 0.91 % | tp 1.2 % | tp 1.62 % | tp 2.11 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.89× | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – |
| 1× | – | 0.27 (26) | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.76 % | tp 0.8 % | tp 0.91 % | tp 1.2 % | tp 1.62 % | tp 2.11 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.89× | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – |
| 1× | – | ∞ (3) | – | ∞ (1) | – | – | ∞ (2) | ∞ (2) |
