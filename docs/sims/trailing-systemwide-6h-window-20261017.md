# Simulated trading session — 4 symbols, 6 h pre-historic + 6 h run (tactics default, signals on)

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only). Timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m, 5m), strategies Normal, Trailing, DCA with Block, signals. Signals use the same 6 h minimal evaluated history; no additional Signal warmup was loaded. Balance $10.00; each order volume unit = 0.1 % of the realized account balance at entry ($0.01–$0.01 before volume factors) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-14T15:00 → 2026-10-14T21:00 UTC. Engine Base 4/854 pairs passed; Signals 2/504 representative pairs pass the diagnostic gate (excluded from Base totals) — per range, passed / evaluated pairs · median Base gate PF score of passed pairs (no-loss pooled PF called out): Wide 0/154 · Micro 1/700 · median gate PF score 1.78 · Minimal 4/854 · median gate PF score 1.78 · Short 0/89 · General 0/89 · Long 0/89 · Signals 2/504 · median gate PF score 1.75; Main 4 pairs, 43768 tapes, Real seats: 12 engine configs + 0 signal configs (every config of the active signals), compute 55 s. PF benchmarks below use only funded settled orders executed by post-Base validated configs; pre-validation candidate-pool PF is a diagnostic. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings))):** balance $10.00 → $10.00 (-0.01 %, closed orders) · equity at end $9.97 (open at end: 7 positions / 109 orders, MTM -$0.02 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF 0.63 · cash PF (base $1) 0.63 · sized $ PF diagnostic 0.93 · 19 positions / 273 funded orders · 273 virtual closes (0 zero allocations) · WR 43.22 % · DDT (closed trades, $) 3.00 h · DDR – (net ≤ 0) · equity max drawdown $0.04 (0.43 %) · margin used max $0.60 · open avg 2.49 pos / 28.27 orders (peak 5 / 80)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Generated candidates use completed entries inside the minimal evaluated history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 504 | 503 | 0 | 12 | 12 | 12 | 0 | 0 | 0 |
**Caps:** position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings)) — 0 orders capped to $0, 0 scaled down (open at end: 0 capped, 0 scaled) · binding: position cap 0, gross cap 0. **Without the caps:** balance $10.00 → $10.00 (-0.01 %) · Return PF 0.63 · cash PF (base $1) 0.63 · sized $ PF diagnostic 0.93 · equity at end $9.97 · equity max drawdown $0.04 (0.43 %) · margin used max $0.60.
**Virtual diagnostic:** 273 closes · Return PF 0.63 before funding allocation; 0 zero allocations and 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

The median is the runtime's Base gate PF score. A no-loss pair uses the finite score 4; that is a qualification score, not an exact PF.

| Base gate | PF floor | closes | DDR | pairs at the default cell | pairs in a range | share | median PF score of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 0 | 4  | 0.5 % | – |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 0 | 4 (+0) | 0.5 % | – |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 0 | 4 (+0) | 0.5 % | – |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 0 | 4 (+0) | 0.5 % | – |
| closes ≥ 6 | 1.00 | 6 | 1 | 4 | 35 (+31) | 4.1 % | 3.408 |
| closes ≥ 20 | 1.00 | 20 | 1 | 0 | 0 (-4) | 0.0 % | – |
| closes ≥ 30 | 1.00 | 30 | 1 | 0 | 0 (-4) | 0.0 % | – |
| DDR off | 1.00 | 12 | off | 3 | 7 (+3) | 0.8 % | 1.136 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 1 | 5 (+1) | 0.6 % | 1.278 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 0 | 0 (-4) | 0.0 % | – |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 3 | 7 (+3) | 0.8 % | 1.136 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 19 | 38 (+34) | 4.4 % | 1.278 |


### Base by range: which gate removes each pair

Each pair at the range's own cell against the range's minimum. "first" = the first gate missed (closes → net → PF → DDR); "only" = pairs that miss that one gate alone (removing it admits them).

| range | evaluated | passed | share | first: closes / net / PF / DDR | only: closes / net / PF / DDR | median PF, only DDR |
|---|---:|---:|---:|---|---|---:|
| Wide | 154 | 0 | 0.0 % | 153 / 1 / 0 / 0 | 7 / 0 / 0 / 0 | – |
| Micro | 700 | 1 | 0.1 % | 699 / 0 / 0 / 0 | 282 / 0 / 0 / 0 | – |
| Minimal | 854 | 4 | 0.5 % | 850 / 0 / 0 / 0 | 273 / 0 / 0 / 0 | – |
| Short | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 6 / 0 / 0 / 0 | – |
| General | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Long | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |


### After each evaluation: PF and sets validated

Base: the Base-passed pairs pooled on their gross return basis; no-loss samples show ∞ (no loss), while the runtime's finite no-loss gate score is shown separately in the run summary. Validation: the sets validated at the run start and their gross-return PF pooled on the validation window (signals: units active in the run). Orders: the run's funded settled orders and their realized PF; known zero allocations are excluded.

| range | Base pooled PF | pairs validated | effective validation min PF | validation PF | sets validated | orders PF | orders |
|---|---:|---:|---|---:|---:|---:|---:|
| Wide | – | 0 of 154 | not recorded | – | – | ∞ (no loss) | 9 |
| Micro | 1.78 | 1 of 700 | 1.05 | 6.51 | 16 of 136 | 2.15 | 168 |
| Minimal | 1.66 | 4 of 854 | 1.08 | 4.58 | 8 of 224 | 0.62 | 64 |
| Short | – | 0 of 89 | not recorded | – | – | – | 0 |
| General | – | 0 of 89 | not recorded | – | – | – | 0 |
| Long | – | 0 of 89 | not recorded | – | – | – | 0 |
| Signals | 1.75 | 2 of 504 | – | – | 125 units active | 0.10 | 32 |


### Each range at every step

Per range over the run's 6 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Minimal | 224 | 6 / 6 | 6 | 6 | 62 | 116 | 92 |
| Wide | 64 | 6 / 6 | 5 | 4 | 22 | 18 | 18 |
| Micro | 136 | 6 / 6 | 6 | 5 | 140 | 244 | 206 |
| Signals | 43344 | 6 / 6 | 6 | 3 | 372 | 1041 | 66 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 4 / 110 | 41 / 69 | 1.44 | 0.94 | 37 % | -$0.00 | $10.00 | $10.00 | $10.00 | 0.07 % | 0.85 | $0.10 | 3 / 36 |
| 16:00 | 1 / 16 | 14 / 2 | 29.98 | 5.54 | 88 % | $0.00 | $10.00 | $9.98 | $9.97 | 0.31 % | 1.85 | $0.34 | 3 / 66 |
| 17:00 | 0 / 54 | 22 / 32 | 0.40 | 0.40 | 41 % | -$0.00 | $10.00 | $9.99 | $9.96 | 0.43 % | 2.85 | $0.60 | 6 / 82 |
| 18:00 | 2 / 53 | 32 / 21 | 1.68 | 3.93 | 60 % | $0.01 | $10.01 | $9.99 | $9.99 | 0.43 % | 0.97 | $0.42 | 5 / 83 |
| 19:00 | 1 / 7 | 2 / 5 | 0.07 | 0.10 | 29 % | -$0.00 | $10.00 | $9.98 | $9.97 | 0.43 % | 1.97 | $0.27 | 7 / 110 |
| 20:00 | 1 / 33 | 7 / 26 | 0.15 | 0.26 | 21 % | -$0.00 | $10.00 | $9.97 | $9.97 | 0.43 % | 2.97 | $0.49 | 7 / 109 |

**Last hour (20:00):** open at end: 7 positions / 109 orders, MTM -$0.02 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $9.97 = balance $10.00 + MTM -$0.02.

**Hours positive:** 2 of 6 full hours · flat 0 · negative 4

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* and *cash PF (base $1)* use the same canonical unit returns and should match; *sized $ PF diagnostic* = gross realized cash gains ÷ losses on those same orders after actual sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 1m | 5m |
|---|---:|---:|
| 15:00 | 6 · 0.08 · -$0.00 | 104 · 3.45 · $0.00 |
| 16:00 | 8 · ∞ (no loss) · $0.00 | 8 · 10.47 · $0.00 |
| 17:00 | – | 54 · 0.40 · -$0.00 |
| 18:00 | 1 · 0.00 · -$0.00 | 52 · 2.55 · $0.01 |
| 19:00 | 1 · 0.00 · -$0.00 | 6 · 0.09 · -$0.00 |
| 20:00 | – | 33 · 0.15 · -$0.00 |

## Hour by hour per type (funded orders · Return PF · WR · net $)

The strategy columns partition funded orders; virtual closes also include zero-allocated closes. *Of which* columns are subsets of the funded orders.

| hour (UTC) | funded orders closed | virtual closes | Normal | Trailing | Trailing only | DCA | Signal · Normal | Signal · Trailing | Signal · Trailing only | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 110 | 110 | – | 104 · 3.45 · 38 % · $0.00 | – | – | 6 · 0.08 · 17 % · -$0.00 | – | – | 4 · 0.00 · 0 % · -$0.00 | 6 · 0.08 · 17 % · -$0.00 |
| 16:00 | 16 | 16 | – | 8 · 10.47 · 75 % · $0.00 | – | – | – | 8 · ∞ (no loss) · 100 % · $0.00 | – | 4 · 2.05 · 50 % · $0.00 | 8 · ∞ (no loss) · 100 % · $0.00 |
| 17:00 | 54 | 54 | – | 54 · 0.40 · 41 % · -$0.00 | – | – | – | – | – | 54 · 0.40 · 41 % · -$0.00 | – |
| 18:00 | 53 | 53 | – | 48 · 4.49 · 63 % · $0.01 | – | 2 · ∞ (no loss) · 100 % · $0.00 | 1 · 0.00 · 0 % · -$0.00 | – | 2 · 0.00 · 0 % · -$0.00 | 50 · 4.92 · 64 % · $0.01 | 3 · 0.00 · 0 % · -$0.00 |
| 19:00 | 7 | 7 | – | 4 · 0.00 · 0 % · -$0.00 | – | 2 · ∞ (no loss) · 100 % · $0.00 | 1 · 0.00 · 0 % · -$0.00 | – | – | 6 · 0.09 · 33 % · -$0.00 | 1 · 0.00 · 0 % · -$0.00 |
| 20:00 | 33 | 33 | 2 · ∞ (no loss) · 100 % · $0.00 | 12 · 0.00 · 0 % · -$0.00 | – | 5 · ∞ (no loss) · 100 % · $0.00 | – | 10 · 0.00 · 0 % · -$0.00 | 4 · 0.00 · 0 % · -$0.00 | 18 · 1.26 · 33 % · -$0.00 | 14 · 0.00 · 0 % · -$0.00 |

## Post-Base paper Live gate

The paper entry stage independently checks each selected config's own last 25 settled post-Base execution closes since 2026-10-14T15:00:00.000Z against the stricter of its range PF floor and the Live PF floor. At the final paper step, 0 config windows had enough closes to be judged: 0 passed and 0 were paused; 0 new entry candidates were rejected by this gate. Exchange closes used: 0. Group last-N: 0.

The hourly order and PF tables above describe the causal walk-forward simulation. They are not rewritten by this later paper-stage gate; this section reports the gate's separate progress and skips.

## Stage funnel, hour by hour (post-gate virtual closes · one-unit PF)

Base (each pair at its default protect and its ranges' cells): 854 engine pairs evaluated, 4 passed (any range); Signal pairs are measured separately. Later stages: *candidate pool* = every config of the Base-passed pairs (43768 tapes; diagnostic, before config validation), Normal / Trailing / Trailing only apart; *post-Base validated / seated* = configs that passed config evaluation (801); *post-gate virtual closes* = simulated trades that passed the causal config, coordination, caps and Block gates, before account funding/allocation. This count can include zero-allocated trades; funded settled orders and their PF are reported separately above. One-unit PF is every virtual close normalized to one unit after the 0.20 % cost. Config-evaluation history is 6 h (max of longH and preH); Base history is reported separately. Replay-only selection-window override: 6 h; it does not change normal runtime settings. The additional per-config entry last-N check is off (wf.lastN = 0); configEval still validates configs before seating. Separate post-Base paper Live-entry replay: last 25 closes per config, from 2026-10-14T15:00:00.000Z; see the Live gate section for judged and rejected counts.

| hour (UTC) | candidate pool (pre-validation) | pool Normal | pool Trailing | pool Trailing only | post-Base validated / seated | post-gate virtual closes (pre-funding) | virtual Normal | virtual Trailing | virtual Trailing only | virtual Block-raised | virtual Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15:00 | 10460 · 0.63 | 4991 · 0.56 | 3988 · 1.05 | 1459 · 0.28 | 303 · 1.13 | 110 · 1.44 | – | 104 · 3.45 | – | 4 · 0.00 | 6 · 0.08 |
| 16:00 | 7681 · 0.76 | 3305 · 0.66 | 3171 · 1.69 | 1168 · 0.33 | 415 · 0.15 | 16 · 29.98 | – | 8 · 10.47 | – | 4 · 2.05 | 8 · ∞ (no loss) |
| 17:00 | 5266 · 0.61 | 1908 · 0.57 | 2537 · 0.87 | 801 · 0.34 | 217 · 1.28 | 54 · 0.40 | – | 54 · 0.40 | – | 54 · 0.40 | – |
| 18:00 | 4402 · 0.66 | 1602 · 0.41 | 2079 · 3.77 | 688 · 0.32 | 76 · 0.64 | 53 · 1.68 | – | 48 · 4.49 | – | 50 · 4.92 | 3 · 0.00 |
| 19:00 | 7372 · 0.95 | 2826 · 0.92 | 3272 · 1.30 | 1248 · 0.51 | 118 · 1.78 | 7 · 0.07 | – | 4 · 0.00 | – | 6 · 0.09 | 1 · 0.00 |
| 20:00 | 4815 · 0.54 | 1653 · 0.58 | 2300 · 0.74 | 847 · 0.15 | 82 · 0.43 | 33 · 0.15 | 2 · ∞ (no loss) | 12 · 0.00 | – | 18 · 1.26 | 14 · 0.00 |
| **total** | **39996 · 0.69** | **16285 · 0.62** | **17347 · 1.19** | **6211 · 0.31** | **1211 · 0.52** | **273 · 0.63** | **2 · ∞ (no loss)** | **230 · 1.18** | **–** | **136 · 0.77** | **32 · 0.10** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2 | 2 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| Trailing | 230 | 98 / 132 | 1.18 | 1.18 | 1.04 | $0.00 | 42.61 % | 3.00 |
| Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| DCA | 9 | 9 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| Signal · Normal | 8 | 1 / 7 | 0.05 | 0.05 | 0.05 | -$0.00 | 12.50 % | 5.68 |
| Signal · Trailing | 18 | 8 / 10 | 0.18 | 0.18 | 0.18 | -$0.00 | 44.44 % | 4.70 |
| Signal · Trailing only | 6 | 0 / 6 | 0.00 | 0.00 | 0.00 | -$0.00 | 0.00 % | 2.58 |
| total | 273 | 118 / 155 | 0.63 | 0.63 | 0.93 | -$0.00 | 43.22 % | 3.00 |
| of which Block-raised | 136 | 64 / 72 | 0.77 | 0.77 | 1.08 | $0.00 | 47.06 % | 3.08 |
| of which Signals | 32 | 9 / 23 | 0.10 | 0.10 | 0.10 | -$0.00 | 28.13 % | 5.68 |
| of which Engine (no signals) | 241 | 109 / 132 | 1.40 | 1.40 | 1.22 | $0.00 | 45.23 % | 3.00 |

## Timeframe lanes

| lane | orders | Return PF | cash PF (base $1) | sized $ PF diagnostic | net |
|---|---:|---:|---:|---:|---:|
| 1m | 16 | 0.29 | 0.29 | 0.29 | -$0.00 |
| 5m | 257 | 0.72 | 0.72 | 0.99 | -$0.00 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 168 | 72 / 96 | 2.15 | 2.15 | 1.23 | $0.00 | 42.86 % | 2.75 |
| Minimal | 64 | 28 / 36 | 0.62 | 0.62 | 0.83 | -$0.00 | 43.75 % | 3.00 |
| Short | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Wide | 9 | 9 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| Signals | 32 | 9 / 23 | 0.10 | 0.10 | 0.10 | -$0.00 | 28.13 % | 5.68 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 975 | sig:confirm 840 · sig:signalValid 70 · sig:signalPf 36 · sig:signalSide 20 · sig:signalCluster 9 |
| Micro | 38 | symPf 38 |
| Minimal | 24 | symPf 22 · duplicate 2 |

## Base said, the book did — the same ranges on the same basis

The primary result and the gates use net return PF. Base lists a median gate score across passed sets on its validation
sample; a no-loss Base sample has an exact pooled PF of ∞ and a separate finite gate score. The simulated book pools its closed-order returns in the run. Those samples and reducers differ, so
their difference alone does not establish edge loss or a sizing effect. Cash PF is a separate diagnostic on
the same closed orders as the book's return PF; unequal notionals can change cash PF without changing return PF.

| range | Base passed (median gate score, validation sample) | simulated return PF (run closes) | cash PF (base $1) | sized $ PF diagnostic (same run closes) | orders |
|---|---:|---:|---:|---:|---:|
| Micro | 1.78 | 2.15 | 2.15 | 1.23 | 168 |
| Minimal | 1.78 | 0.62 | 0.62 | 0.83 | 64 |
| Short | – | – | – | – | 0 |
| General | – | – | – | – | 0 |
| Long | – | – | – | – | 0 |
| Wide | – | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 9 |
| Signals | 1.75 | 0.10 | 0.10 | 0.10 | 32 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (24 of 376 evaluated, 424 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (32 units active at the run start, 125 over the run, 777 of 43344 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | trailing | 16 | 12 (75 %) | 168 | 48 % | 1.34 | 8.39 |
| Minimal | trailing | 8 | 2 (25 %) | 92 | 37 % | 0.37 | -14.04 |
| Signals | normal | 321 | 96 (30 %) | 403 | 35 % | 0.40 | -183.45 |
| Signals | trailing | 409 | 213 (52 %) | 495 | 50 % | 0.81 | -24.04 |
| Signals | trailing-only | 47 | 10 (21 %) | 53 | 26 % | 0.05 | -38.03 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 16 | 12 (75 %) | 168 | 48 % | 1.34 | 8.39 |
| Minimal | active | 8 | 2 (25 %) | 92 | 37 % | 0.37 | -14.04 |
| Signals | signal:act-hf | 69 | 51 (74 %) | 111 | 77 % | 1.69 | 22.47 |
| Signals | signal:adx | 73 | 21 (29 %) | 121 | 31 % | 0.33 | -43.79 |
| Signals | signal:cci | 34 | 16 (47 %) | 34 | 47 % | 3.89 | 7.00 |
| Signals | signal:ema-pullback | 9 | 4 (44 %) | 9 | 44 % | 0.34 | -2.60 |
| Signals | signal:heikin-ashi | 18 | 10 (56 %) | 18 | 56 % | 1.60 | 0.60 |
| Signals | signal:kama | 85 | 30 (35 %) | 85 | 35 % | 0.31 | -37.12 |
| Signals | signal:r-linreg | 110 | 60 (55 %) | 144 | 53 % | 1.73 | 22.58 |
| Signals | signal:r-nr-break | 150 | 21 (14 %) | 162 | 13 % | 0.06 | -144.12 |
| Signals | signal:rsi-mid | 18 | 10 (56 %) | 18 | 56 % | 1.60 | 0.60 |
| Signals | signal:s2-block-scale | 22 | 0 (0 %) | 28 | 14 % | 0.01 | -33.35 |
| Signals | signal:s2-confluence | 34 | 17 (50 %) | 34 | 50 % | 0.36 | -8.45 |
| Signals | signal:stoch-rsi | 152 | 79 (52 %) | 184 | 51 % | 0.67 | -25.74 |
| Signals | signal:thrust | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -3.60 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (6 h) ≥ max(3, 12) closes, positive net, PF ≥ its full indication's range minimum (stage 1.1; micro 1.05, minimal 1.08, general 1.12, long 1.18; full indication-aware Tactic floor 1.1, retaining stricter settings; mixed indication groups can have different minima), drawdown time ≤ min(2.92 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 6 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 2.92 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 0 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss uses the runtime's no-loss gate score, not an exact finite ratio).

| range | configs | evaluated | passed | median PF score (evaluated) | median PF score (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 136 | 136 | 16 | 1.48 | 6.51 | 2.92–2.92 (median 2.92) | 48 | 44 | 2 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |  |
| Minimal | 224 | 224 | 8 | 1.12 | 7.07 | 2.92–2.92 (median 2.92) | 26 | 80 | 14 | 0 | 86 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |  |
| Short | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| General | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Long | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Wide | 64 | 16 | 0 | 4.00 | – | 2.92–2.92 (median 2.92) | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 48 | 0 |  |
| Signals | 43344 | – | 32 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 43344 signal tapes, 32 units (pair × symbol × direction) active at the run start, 125 over the run; 777 configs entered while their unit was active — seated per unit and step, not configEval |

## Diagnostic: every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes. This all-candidate table is diagnostic only: it is not the PF benchmark and does not qualify or dilute the post-Base execution cohort.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 34 | 28 (82 %) | 150 | 87 % | 3.65 | 75.50 |
| Micro | trailing | 102 | 68 (67 %) | 1080 | 51 % | 1.34 | 73.03 |
| Minimal | normal | 56 | 38 (68 %) | 216 | 88 % | 2.98 | 108.58 |
| Minimal | trailing | 168 | 118 (70 %) | 1798 | 54 % | 1.65 | 185.98 |
| Wide | axis | 32 | 14 (44 %) | 108 | 56 % | 1.11 | 4.16 |
| Wide | dca | 16 | 8 (50 %) | 29 | 100 % | ∞ (no loss) | 18.19 |
| Wide | dca-active | 16 | 15 (94 %) | 16 | 94 % | 13.51 | 15.27 |
| Signals | normal | 21168 | 2384 (11 %) | 15919 | 44 % | 0.60 | -4428.54 |
| Signals | trailing | 17640 | 3379 (19 %) | 14469 | 56 % | 1.14 | 416.70 |
| Signals | trailing-only | 4536 | 789 (17 %) | 6211 | 44 % | 0.31 | -1868.99 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 16 | 12 (75 %) | 168 | 48 % | 1.34 | 8.39 |
| Minimal | active | 8 | 2 (25 %) | 92 | 37 % | 0.37 | -14.04 |
| Signals | signal:act-hf | 69 | 51 (74 %) | 111 | 77 % | 1.69 | 22.47 |
| Signals | signal:adx | 73 | 21 (29 %) | 121 | 31 % | 0.33 | -43.79 |
| Signals | signal:cci | 34 | 16 (47 %) | 34 | 47 % | 3.89 | 7.00 |
| Signals | signal:ema-pullback | 9 | 4 (44 %) | 9 | 44 % | 0.34 | -2.60 |
| Signals | signal:heikin-ashi | 18 | 10 (56 %) | 18 | 56 % | 1.60 | 0.60 |
| Signals | signal:kama | 85 | 30 (35 %) | 85 | 35 % | 0.31 | -37.12 |
| Signals | signal:r-linreg | 110 | 60 (55 %) | 144 | 53 % | 1.73 | 22.58 |
| Signals | signal:r-nr-break | 150 | 21 (14 %) | 162 | 13 % | 0.06 | -144.12 |
| Signals | signal:rsi-mid | 18 | 10 (56 %) | 18 | 56 % | 1.60 | 0.60 |
| Signals | signal:s2-block-scale | 22 | 0 (0 %) | 28 | 14 % | 0.01 | -33.35 |
| Signals | signal:s2-confluence | 34 | 17 (50 %) | 34 | 50 % | 0.36 | -8.45 |
| Signals | signal:stoch-rsi | 152 | 79 (52 %) | 184 | 51 % | 0.67 | -25.74 |
| Signals | signal:thrust | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -3.60 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-rsit2-20@m5 | 16 | 12 (75 %) | 168 | 48 % | 1.34 | 8.39 | tp1 sl3.75 tr0.25 h192 mc (10 · 3.20 · 1.44) |
| Minimal | follow | mc-rsi2-30@m5 | 4 | 2 (50 %) | 36 | 61 % | 1.56 | 0.93 | tp1.1 sl3.3 tr0.3 h192 mn (14 · 1.84 · 0.49) |
| Minimal | follow | mc-rsit3-30@m5 | 4 | 0 (0 %) | 56 | 21 % | 0.28 | -14.97 | tp1.2 sl3.3 tr0.3 h192 mn (14 · 0.28 · -3.59) |
| Signals | follow | sig-r-linreg-m@m1 | 77 | 44 (57 %) | 111 | 55 % | 2.79 | 31.36 | – |
| Signals | follow | sig-act-hf-s@m1 | 38 | 26 (68 %) | 80 | 75 % | 1.52 | 14.85 | – |
| Signals | follow | sig-act-hf-m@m1 | 31 | 25 (81 %) | 31 | 81 % | 2.93 | 7.62 | – |
| Signals | follow | sig-cci-s@m1 | 34 | 16 (47 %) | 34 | 47 % | 3.89 | 7.00 | – |
| Signals | follow | sig-heikin-ashi-s@m5 | 18 | 10 (56 %) | 18 | 56 % | 1.60 | 0.60 | – |
| Signals | follow | sig-rsi-mid-m@m5 | 18 | 10 (56 %) | 18 | 56 % | 1.60 | 0.60 | – |
| Signals | follow | sig-stoch-rsi-m@m1 | 77 | 47 (61 %) | 95 | 51 % | 0.99 | -0.36 | – |
| Signals | follow | sig-ema-pullback-s@m5 | 9 | 4 (44 %) | 9 | 44 % | 0.34 | -2.60 | – |
| Signals | follow | sig-s2-confluence-s@m1 | 34 | 17 (50 %) | 34 | 50 % | 0.36 | -8.45 | – |
| Signals | follow | sig-r-linreg-s@m1 | 33 | 16 (48 %) | 33 | 48 % | 0.34 | -8.78 | – |
| Signals | follow | sig-s2-block-scale-s@m5 | 11 | 0 (0 %) | 14 | 14 % | 0.01 | -16.67 | – |
| Signals | follow | sig-s2-block-scale-m@m5 | 11 | 0 (0 %) | 14 | 14 % | 0.01 | -16.67 | – |
| Signals | follow | sig-stoch-rsi-s@m1 | 75 | 32 (43 %) | 89 | 51 % | 0.43 | -25.37 | – |
| Signals | follow | sig-kama-s@m1 | 85 | 30 (35 %) | 85 | 35 % | 0.31 | -37.12 | – |
| Signals | follow | sig-adx-s@m1 | 73 | 21 (29 %) | 121 | 31 % | 0.33 | -43.79 | – |
| Signals | follow | sig-r-nr-break-s@m1 | 82 | 11 (13 %) | 82 | 13 % | 0.10 | -62.31 | – |
| Signals | follow | sig-r-nr-break-m@m1 | 68 | 10 (15 %) | 80 | 13 % | 0.03 | -81.81 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 1.660% | sl 2.82× | tr 0.76× | 9 | 9 (100 %) | 10 | 100 % | ∞ (no loss) | 11.71 |
| Signals | tp 1.420% | sl 2.75× | tr 0.75× | 10 | 8 (80 %) | 11 | 82 % | 48.12 | 8.58 |
| Signals | tp 1.190% | sl 2.64× | tr 0.73× | 10 | 6 (60 %) | 12 | 67 % | 23.25 | 6.74 |
| Signals | tp 1.420% | sl 2.75× | tr 0.57× | 10 | 6 (60 %) | 12 | 67 % | 78.54 | 5.06 |
| Signals | tp 0.980% | sl 2.42× | tr 0.68× | 11 | 9 (82 %) | 13 | 69 % | 2.35 | 4.04 |
| Signals | tp 1.190% | sl 2.64× | tr 0.56× | 10 | 9 (90 %) | 12 | 75 % | 9.66 | 3.57 |
| Signals | tp 1.660% | sl 2.82× | tr 0.58× | 9 | 6 (67 %) | 10 | 70 % | 8.24 | 3.50 |
| Signals | tp 2.160% | sl 2.88× | tr 0.40× | 10 | 6 (60 %) | 11 | 64 % | 12.40 | 3.45 |
| Micro | tp 1.000% (net 0.800%) | sl 3.75× | tr 0.25× | 2 | 2 (100 %) | 20 | 50 % | 3.20 | 2.87 |
| Micro | tp 1.000% (net 0.800%) | sl 4.00× | tr 0.25× | 2 | 2 (100 %) | 20 | 50 % | 3.20 | 2.87 |
| Micro | tp 1.000% (net 0.800%) | sl 4.25× | tr 0.25× | 2 | 2 (100 %) | 20 | 50 % | 3.20 | 2.87 |
| Micro | tp 1.000% (net 0.800%) | sl 4.50× | tr 0.25× | 2 | 2 (100 %) | 20 | 50 % | 3.20 | 2.87 |
| Micro | tp 1.000% (net 0.800%) | sl 4.75× | tr 0.25× | 2 | 2 (100 %) | 20 | 50 % | 3.20 | 2.87 |
| Micro | tp 1.000% (net 0.800%) | sl 5.00× | tr 0.25× | 2 | 2 (100 %) | 20 | 50 % | 3.20 | 2.87 |
| Signals | tp 1.190% | sl 2.64× | tr 0.40× | 11 | 8 (73 %) | 13 | 69 % | 4.47 | 1.73 |
| Signals | tp 2.160% | sl 2.88× | tr 0.22× | 11 | 8 (73 %) | 13 | 69 % | 4.47 | 1.73 |
| Signals | tp 1.660% | sl 2.82× | tr 0.40× | 10 | 8 (80 %) | 11 | 73 % | 4.85 | 1.59 |
| Signals | tp 2.160% | sl 2.88× | tr 0.31× | 10 | 8 (80 %) | 11 | 73 % | 4.85 | 1.59 |
| Signals | tp 1.660% | sl 2.82× | tr 0.31× | 10 | 8 (80 %) | 12 | 75 % | 4.57 | 1.52 |
| Signals | tp 1.420% | sl 2.75× | tr 0.41× | 10 | 8 (80 %) | 12 | 67 % | 3.73 | 1.07 |
| Minimal | tp 1.100% | sl 3.00× | tr 0.27× | 2 | 2 (100 %) | 28 | 64 % | 1.84 | 0.99 |
| Signals | tp 1.420% | sl 2.75× | tr 0.32× | 11 | 6 (55 %) | 14 | 57 % | 1.84 | 0.72 |
| Signals | tp 0.980% | sl 2.42× | tr 0.53× | 11 | 8 (73 %) | 13 | 69 % | 1.19 | 0.58 |
| Signals | tp 1.190% | sl 2.64× | tr 0.28× | 11 | 6 (55 %) | 14 | 50 % | 1.56 | 0.43 |
| Signals | tp 1.190% | sl 2.64× | tr 0.34× | 11 | 4 (36 %) | 13 | 31 % | 1.48 | 0.38 |
| Signals | tp 1.660% | sl 2.82× | tr 0.24× | 11 | 4 (36 %) | 13 | 31 % | 1.48 | 0.38 |
| Signals | tp 1.420% | sl 2.75× | tr 0.25× | 11 | 6 (55 %) | 14 | 50 % | 1.25 | 0.20 |
| Signals | tp 0.980% | sl 2.42× | tr 0.30× | 11 | 6 (55 %) | 14 | 57 % | 0.53 | -1.49 |
| Signals | tp 0.980% | sl 2.42× | tr 0.35× | 11 | 6 (55 %) | 14 | 50 % | 0.47 | -1.63 |
| Signals | tp 0.880% | sl 2.27× | tr off | 8 | 5 (63 %) | 10 | 70 % | 0.72 | -1.84 |
| Signals | tp 0.980% | sl 2.42× | tr 0.41× | 11 | 3 (27 %) | 13 | 23 % | 0.34 | -2.20 |
| Signals | tp 0.650% | sl 0.80× | tr off | 8 | 2 (25 %) | 12 | 33 % | 0.31 | -3.96 |
| Signals | tp 0.650% | sl 0.82× | tr off | 8 | 2 (25 %) | 12 | 33 % | 0.31 | -4.04 |
| Micro | tp 1.000% (net 0.800%) | sl 3.25× | tr 0.25× | 2 | 0 (0 %) | 24 | 42 % | 0.50 | -4.18 |
| Signals | tp 0.650% | sl 0.86× | tr off | 8 | 2 (25 %) | 12 | 33 % | 0.30 | -4.28 |
| Signals | tp 0.720% | sl 0.74× | tr off | 8 | 2 (25 %) | 11 | 27 % | 0.27 | -4.28 |
| Micro | tp 1.000% (net 0.800%) | sl 3.50× | tr 0.25× | 2 | 0 (0 %) | 24 | 42 % | 0.47 | -4.68 |
| Signals | tp 0.720% | sl 0.81× | tr off | 8 | 2 (25 %) | 11 | 27 % | 0.25 | -4.68 |
| Signals | tp 0.650% | sl 0.97× | tr off | 8 | 2 (25 %) | 12 | 33 % | 0.27 | -4.84 |
| Signals | tp 0.650% | sl 1.42× | tr 0.42× | 11 | 3 (27 %) | 15 | 33 % | 0.23 | -4.93 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 0.000% | sl Infinity× | tr Infinity× | 47 | 10 (21 %) | 53 | 26 % | 0.05 | -38.03 |
| Signals | tp 1.420% | sl 0.77× | tr off | 8 | 0 (0 %) | 10 | 10 % | 0.11 | -10.39 |
| Signals | tp 0.720% | sl 1.75× | tr 0.56× | 11 | 2 (18 %) | 15 | 20 % | 0.10 | -9.59 |
| Signals | tp 0.720% | sl 1.75× | tr 0.47× | 11 | 2 (18 %) | 15 | 27 % | 0.11 | -9.38 |
| Signals | tp 1.190% | sl 0.77× | tr off | 8 | 0 (0 %) | 10 | 10 % | 0.10 | -9.09 |
| Signals | tp 0.880% | sl 1.24× | tr off | 8 | 1 (13 %) | 10 | 20 % | 0.13 | -8.96 |
| Signals | tp 1.190% | sl 0.96× | tr off | 8 | 0 (0 %) | 10 | 20 % | 0.18 | -8.74 |
| Signals | tp 1.190% | sl 0.61× | tr off | 8 | 1 (13 %) | 11 | 9 % | 0.11 | -8.21 |
| Signals | tp 0.720% | sl 1.75× | tr 0.40× | 11 | 3 (27 %) | 15 | 33 % | 0.14 | -8.00 |
| Signals | tp 1.420% | sl 0.58× | tr off | 8 | 1 (13 %) | 10 | 10 % | 0.13 | -7.96 |
| Minimal | tp 1.200% | sl 3.00× | tr 0.25× | 2 | 0 (0 %) | 28 | 21 % | 0.27 | -7.79 |
| Signals | tp 0.980% | sl 0.94× | tr off | 8 | 1 (13 %) | 10 | 20 % | 0.17 | -7.40 |
| Signals | tp 1.420% | sl 0.97× | tr off | 8 | 1 (13 %) | 10 | 30 % | 0.33 | -7.40 |
| Minimal | tp 1.200% | sl 2.75× | tr 0.25× | 2 | 0 (0 %) | 28 | 21 % | 0.28 | -7.19 |
| Signals | tp 0.720% | sl 1.75× | tr 0.36× | 11 | 3 (27 %) | 15 | 27 % | 0.16 | -7.04 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 4 (1) | 952 | 34 | 34 | 0 | baseRange 714 · baseTarget 204 |
| Micro | trailing | 4 (1) | 2856 | 102 | 102 | 0 | baseRange 2142 · baseTarget 612 |
| Minimal | normal | 4 (4) | 504 | 56 | 56 | 0 | baseTarget 448 |
| Minimal | trailing | 4 (4) | 1512 | 168 | 168 | 0 | baseTarget 1344 |
| Wide | axis | 4 (4) | 32 | 32 | 32 | 0 | – |
| Wide | dca | 4 (4) | 16 | 16 | 16 | 0 | – |
| Wide | dca-active | 4 (4) | 16 | 16 | 16 | 0 | – |

Engine indications Base evaluated that built no set: 225 (act-burst-2.5@x4, act-chop@x4, bb-walk@x4, break-atr-2@x4, break-mc-rel-don-15-dd24-balanced, break-mc-rel-don-15-dd24-guarded, break-mc-rel-don-15-dd48-balanced, break-mc-rel-don-15-dd48-guarded, break-mc-rel-don-5-dd24-balanced, break-mc-rel-don-5-dd24-guarded, break-mc-rel-don-5-dd48-balanced, break-mc-rel-don-5-dd48-guarded, break-mc-rel-don-5x15-dd24-balanced, break-mc-rel-don-5x15-dd24-guarded, break-mc-rel-don-5x15-dd48-balanced, break-mc-rel-don-5x15-dd48-guarded, break-mc-rel-don8-15-dd24-balanced, break-mc-rel-don8-15-dd24-guarded, break-mc-rel-don8-15-dd48-balanced, break-mc-rel-don8-15-dd48-guarded, break-mc-rel-don8-5-dd24-balanced, break-mc-rel-don8-5-dd24-guarded, break-mc-rel-don8-5-dd48-balanced, break-mc-rel-don8-5-dd48-guarded, break-mc-rel-don8-5x15-dd24-balanced, break-mc-rel-don8-5x15-dd24-guarded, break-mc-rel-don8-5x15-dd48-balanced, break-mc-rel-don8-5x15-dd48-guarded, break-mc-rel-retest-15-dd24-balanced, break-mc-rel-retest-15-dd24-guarded, break-mc-rel-retest-15-dd48-balanced, break-mc-rel-retest-15-dd48-guarded, break-mc-rel-retest-5-dd24-balanced, break-mc-rel-retest-5-dd24-guarded, break-mc-rel-retest-5-dd48-balanced, break-mc-rel-retest-5-dd48-guarded, break-mc-rel-retest-5x15-dd24-balanced, break-mc-rel-retest-5x15-dd24-guarded, break-mc-rel-retest-5x15-dd48-balanced, break-mc-rel-retest-5x15-dd48-guarded, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 1 % |
|---|---:|
| 1× | 0.68 (122) |
| 1.25× | 0.65 (116) |
| 1.5× | 0.81 (104) |
| 1.75× | 2.62 (84) |
| 2× | 2.41 (84) |
| 2.25× | 2.19 (86) |
| 2.5× | 2.08 (84) |
| 2.75× | 1.87 (80) |
| 3× | 1.56 (74) |
| 3.25× | 1.73 (56) |
| 3.5× | 1.65 (56) |
| 3.75× | 5.81 (52) |
| 4× | 5.81 (52) |
| 4.25× | 5.59 (46) |
| 4.5× | 5.59 (46) |
| 4.75× | 5.59 (46) |
| 5× | 6.76 (42) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 1 % |
|---|---:|
| 1× | – |
| 1.25× | – |
| 1.5× | – |
| 1.75× | – |
| 2× | – |
| 2.25× | – |
| 2.5× | – |
| 2.75× | – |
| 3× | – |
| 3.25× | 0.50 (24) |
| 3.5× | 0.47 (24) |
| 3.75× | 3.20 (20) |
| 4× | 3.20 (20) |
| 4.25× | 3.20 (20) |
| 4.5× | 3.20 (20) |
| 4.75× | 3.20 (20) |
| 5× | 3.20 (20) |

### Micro — orders executed

| stop ÷ target | tp 1 % |
|---|---:|
| 1× | – |
| 1.25× | – |
| 1.5× | – |
| 1.75× | – |
| 2× | – |
| 2.25× | – |
| 2.5× | – |
| 2.75× | – |
| 3× | – |
| 3.25× | 1.84 (20) |
| 3.5× | 3.41 (16) |
| 3.75× | 1.98 (18) |
| 4× | 1.98 (18) |
| 4.25× | 2.14 (24) |
| 4.5× | 2.14 (24) |
| 4.75× | 2.14 (24) |
| 5× | 2.14 (24) |

### Minimal — every config computed

| stop ÷ target | tp 1 % | tp 1.1 % | tp 1.2 % |
|---|---:|---:|---:|
| 1.5× | 0.84 (178) | 0.47 (92) | 2.30 (78) |
| 1.75× | 3.88 (142) | 1.79 (82) | 2.09 (78) |
| 2× | 3.62 (142) | 1.66 (84) | 2.05 (80) |
| 2.25× | 3.34 (144) | 2.10 (88) | 1.89 (80) |
| 2.5× | 3.19 (142) | 1.87 (70) | 1.82 (74) |
| 2.75× | 2.95 (138) | 0.71 (52) | 1.22 (54) |
| 3× | 2.48 (126) | 1.56 (36) | 1.14 (54) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 1 % | tp 1.1 % | tp 1.2 % |
|---|---:|---:|---:|
| 1.5× | – | – | – |
| 1.75× | – | – | – |
| 2× | – | – | – |
| 2.25× | – | – | – |
| 2.5× | – | – | – |
| 2.75× | – | – | 0.28 (28) |
| 3× | – | 1.56 (36) | 0.27 (28) |

### Minimal — orders executed

| stop ÷ target | tp 1 % | tp 1.1 % | tp 1.2 % |
|---|---:|---:|---:|
| 1.5× | 0.00 (2) | – | – |
| 1.75× | – | – | – |
| 2× | ∞ (2) | – | – |
| 2.25× | – | – | – |
| 2.5× | – | – | – |
| 2.75× | – | – | 0.56 (22) |
| 3× | – | 0.86 (16) | 0.52 (22) |

### Wide — every config computed

| stop ÷ target | tp 0.76 % | tp 0.91 % | tp 1.62 % | tp 2.11 % |
|---|---:|---:|---:|---:|
| 0.89× | 1.40 (128) | – | – | – |
| 0.93× | – | ∞ (17) | – | – |
| 0.98× | – | – | ∞ (4) | – |
| 0.99× | – | – | – | 4.70 (4) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.76 % | tp 0.91 % | tp 1.62 % | tp 2.11 % |
|---|---:|---:|---:|---:|
| 0.89× | – | – | – | – |
| 0.93× | – | – | – | – |
| 0.98× | – | – | – | – |
| 0.99× | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.76 % | tp 0.91 % | tp 1.62 % | tp 2.11 % |
|---|---:|---:|---:|---:|
| 0.89× | ∞ (6) | – | – | – |
| 0.93× | – | ∞ (3) | – | – |
| 0.98× | – | – | – | – |
| 0.99× | – | – | – | – |
