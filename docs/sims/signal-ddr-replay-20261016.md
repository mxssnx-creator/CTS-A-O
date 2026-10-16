# Simulated trading session — 4 symbols, 6 h pre-historic + 6 h run (tactics default, signals on)

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only). Timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 15m), strategies Normal, Trailing, DCA with Block, signals. Signals use the same 6 h minimal evaluated history; no additional Signal warmup was loaded. Balance $1000.00; each order volume unit = 2.0 % of the realized equity at entry ($19.94–$20.67 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-14T22:00 → 2026-10-15T04:00 UTC. Engine Base 3/794 pairs passed; Signals 0/504 representative pairs pass the diagnostic gate (excluded from Base totals) — per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 0/154 · Micro 3/640 · PF 4.00 · Minimal 0/794 · Short 0/89 · General 0/89 · Long 0/89 · Signals 0/504; Main 3 pairs, 19270 tapes, Real seats: 4 engine configs + 0 signal configs (every config of the active signals), compute 10 s. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $1000.00 → $1004.42 (0.44 %, closed orders) · equity at end $1000.70 (open at end: 3 positions / 41 orders, MTM -$3.72 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF 2.37 (net returns on funded settled orders) · cash PF diagnostic 2.22 (same orders after sizing) · 4 positions / 792 funded orders · 936 virtual closes (144 zero allocations) · WR 67.42 % · DDT (closed trades, $) 2.50 h · DDR 0.63 · equity max drawdown $29.53 (2.87 %) · margin used max $225.08 · open avg 1.88 pos / 180.17 orders (peak 3 / 396)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Generated candidates use completed entries inside the minimal evaluated history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 504 | 504 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 144 orders capped to $0, 792 scaled down (open at end: 0 capped, 36 scaled) · binding: position cap 972, gross cap 0. **Without the caps:** balance $1000.00 → $1019.81 (1.98 %) · Return PF 2.58 · cash PF diagnostic 1.83 · equity at end $1000.60 · equity max drawdown $191.08 (16.17 %) · margin used max $1224.27 · infeasible: margin exceeded equity for 105 min.
**Virtual diagnostic:** 936 closes · Return PF 2.58 before funding allocation; 144 zero allocations and 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

| Base gate | PF | closes | DDR | pairs at the default cell | pairs in a range | share | median PF of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 0 | 3  | 0.4 % | – |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 0 | 3 (+0) | 0.4 % | – |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 0 | 3 (+0) | 0.4 % | – |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 0 | 3 (+0) | 0.4 % | – |
| closes ≥ 6 | 1.00 | 6 | 1 | 0 | 11 (+8) | 1.4 % | – |
| closes ≥ 20 | 1.00 | 20 | 1 | 0 | 0 (-3) | 0.0 % | – |
| closes ≥ 30 | 1.00 | 30 | 1 | 0 | 0 (-3) | 0.0 % | – |
| DDR off | 1.00 | 12 | off | 0 | 3 (+0) | 0.4 % | – |
| DDR ≤ 2 | 1.00 | 12 | 2 | 0 | 3 (+0) | 0.4 % | – |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 0 | 3 (+0) | 0.4 % | – |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 0 | 3 (+0) | 0.4 % | – |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 0 | 11 (+8) | 1.4 % | – |


### Base by range: which gate removes each pair

Each pair at the range's own cell against the range's minimum. "first" = the first gate missed (closes → net → PF → DDR); "only" = pairs that miss that one gate alone (removing it admits them).

| range | evaluated | passed | share | first: closes / net / PF / DDR | only: closes / net / PF / DDR | median PF, only DDR |
|---|---:|---:|---:|---|---|---:|
| Wide | 154 | 0 | 0.0 % | 154 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Micro | 640 | 3 | 0.5 % | 637 / 0 / 0 / 0 | 228 / 0 / 0 / 0 | – |
| Minimal | 794 | 0 | 0.0 % | 794 / 0 / 0 / 0 | 167 / 0 / 0 / 0 | – |
| Short | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| General | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Long | 89 | 0 | 0.0 % | 89 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |


### After each evaluation: PF and sets validated

Base: the pairs validated and their PF taken together (a pass needs net > 0, so PF > 1). Validation: the sets validated at the run start and their PF taken together on the validation window (signals: units active in the run). Orders: the run's funded settled orders and their realized PF; known zero allocations are excluded.

| range | Base PF | pairs validated | effective validation min PF | validation PF | sets validated | orders PF | orders |
|---|---:|---:|---|---:|---:|---:|---:|
| Wide | – | 0 of 154 | not recorded | – | – | – | 0 |
| Micro | – | 3 of 640 | 1.05 | 3.88 | 240 of 952 | 2.37 | 792 |
| Minimal | – | 0 of 794 | not recorded | – | – | – | 0 |
| Short | – | 0 of 89 | not recorded | – | – | – | 0 |
| General | – | 0 of 89 | not recorded | – | – | – | 0 |
| Long | – | 0 of 89 | not recorded | – | – | – | 0 |
| Signals | – | 0 of 504 | – | – | 0 units active | – | 0 |


### Each range at every step

Per range over the run's 6 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 952 | 6 / 6 | 5 | 5 | 1430 | 1848 | 972 |
| Wide | 48 | 6 / 6 | 1 | 1 | 4 | 5 | 5 |
| Signals | 18270 | 6 / 6 | 0 | 0 | 0 | 0 | 0 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 0 / 92 | 68 / 24 | 4.88 | 4.88 | 74 % | $0.54 | $1000.54 | $998.24 | $996.66 | 0.49 % | 0.67 | $150.00 | 2 / 74 |
| 23:00 | 0 / 52 | 0 / 52 | 0.00 | 0.00 | 0 % | -$0.26 | $1000.28 | $995.76 | $994.77 | 0.68 % | 1.67 | $225.08 | 3 / 284 |
| 00:00 | 1 / 150 | 124 / 26 | 5.82 | 10.69 | 83 % | $2.25 | $1002.53 | $999.92 | $989.92 | 1.17 % | 0.13 | $225.04 | 2 / 196 |
| 01:00 | 0 / 120 | 68 / 52 | 4.38 | 4.94 | 57 % | $0.71 | $1003.24 | $1001.03 | $996.54 | 1.17 % | 1.13 | $150.49 | 2 / 344 |
| 02:00 | 2 / 318 | 274 / 44 | 13.36 | 17.88 | 86 % | $3.76 | $1007.00 | $1004.97 | $999.20 | 2.64 % | 0.52 | $150.49 | 1 / 96 |
| 03:00 | 0 / 60 | 0 / 60 | 0.00 | 0.00 | 0 % | -$2.58 | $1004.42 | $1000.70 | $998.89 | 2.87 % | 1.52 | $75.52 | 3 / 41 |

**Last hour (03:00):** open at end: 3 positions / 41 orders, MTM -$3.72 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $1000.70 = balance $1004.42 + MTM -$3.72.

**Hours positive:** 4 of 6 full hours · flat 0 · negative 2

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* = positive net returns ÷ absolute negative net returns (primary); *cash PF diagnostic* = gross profit $ ÷ gross loss $ on those same orders after sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 15m |
|---|---:|
| 22:00 | 92 · 4.88 · $0.54 |
| 23:00 | 52 · 0.00 · -$0.26 |
| 00:00 | 150 · 5.82 · $2.25 |
| 01:00 | 120 · 4.38 · $0.71 |
| 02:00 | 318 · 13.36 · $3.76 |
| 03:00 | 60 · 0.00 · -$2.58 |

## Hour by hour per type (orders · Return PF · WR · net $)

The type columns (Normal, Trailing, Trailing only, Signal · Normal, Signal · Trailing, Signal · Trailing only) are one partition of the orders closed in the hour; *of which* columns are subsets of them.

| hour (UTC) | orders closed | Normal | Trailing | Trailing only | Signal · Normal | Signal · Trailing | Signal · Trailing only | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 92 | 26 · ∞ (no loss) · 100 % · $0.40 | 66 · 2.03 · 64 % · $0.14 | – | – | – | – | – | – |
| 23:00 | 52 | – | 52 · 0.00 · 0 % · -$0.26 | – | – | – | – | 52 · 0.00 · 0 % · -$0.26 | – |
| 00:00 | 226 | 46 · ∞ (no loss) · 100 % · $0.76 | 104 · 3.99 · 75 % · $1.49 | – | – | – | – | 46 · 0.80 · 43 % · -$0.05 | – |
| 01:00 | 162 | 52 · ∞ (no loss) · 100 % · $0.69 | 68 · 0.86 · 24 % · $0.02 | – | – | – | – | 54 · 2.58 · 52 % · $0.24 | – |
| 02:00 | 344 | 86 · ∞ (no loss) · 100 % · $0.66 | 232 · 9.70 · 81 % · $3.10 | – | – | – | – | 238 · 8.17 · 82 % · $1.92 | – |
| 03:00 | 60 | 14 · 0.00 · 0 % · -$1.25 | 46 · 0.00 · 0 % · -$1.32 | – | – | – | – | 60 · 0.00 · 0 % · -$2.58 | – |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (full history, each pair at its default protect and its ranges' cells): 794 engine pairs evaluated, 3 passed (any range); Signal pairs are measured separately. Each column below is a later stage of the same run: *pool* = every config of the passed pairs (19270 tapes, signals included), Normal / Trailing / Trailing only apart; *seated* = the configs that took a seat (240); *executed* = the orders the run actually traded through every gate, cap and Block volume. Unit PF: every order at one unit after the 0.20 % cost.

| hour (UTC) | all configs (pool) | pool Normal | pool Trailing | pool Trailing only | seated configs | executed (all types) | executed Normal | executed Trailing | executed Trailing only | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 652 · 0.41 | 68 · ∞ (no loss) | 584 · 0.21 | – | 184 · 4.88 | 92 · 4.88 | 26 · ∞ (no loss) | 66 · 2.03 | – | – | – |
| 23:00 | 526 · 0.00 | – | 526 · 0.00 | – | 16 · 0.00 | 52 · 0.00 | – | 52 · 0.00 | – | 52 · 0.00 | – |
| 00:00 | 1451 · 2.07 | 196 · 17.08 | 1252 · 1.64 | 3 · 0.00 | 266 · ∞ (no loss) | 226 · 9.65 | 66 · ∞ (no loss) | 160 · 7.02 | – | 46 · 0.80 | – |
| 01:00 | 1265 · 0.33 | 96 · 4.38 | 1118 · 0.22 | 51 · 0.14 | 128 · 0.93 | 162 · 1.84 | 52 · ∞ (no loss) | 110 · 0.36 | – | 96 · 1.00 | – |
| 02:00 | 8622 · 1.39 | 3219 · 1.21 | 3954 · 1.70 | 1421 · 1.36 | 590 · 4.08 | 344 · 14.28 | 112 · ∞ (no loss) | 232 · 9.70 | – | 264 · 9.10 | – |
| 03:00 | 3035 · 1.02 | 390 · 0.90 | 1824 · 0.80 | 809 · 1.49 | 382 · 0.25 | 60 · 0.00 | 14 · 0.00 | 46 · 0.00 | – | 60 · 0.00 | – |
| **total** | **15551 · 1.29** | **3969 · 1.22** | **9258 · 1.31** | **2284 · 1.38** | **1566 · 1.58** | **936 · 2.58** | **270 · 3.60** | **666 · 2.21** | **–** | **518 · 1.11** | **–** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 224 | 210 / 14 | 3.02 | 1.99 | $1.25 | 93.75 % | 1.50 |
| Trailing | 568 | 324 / 244 | 2.11 | 2.34 | $3.17 | 57.04 % | 2.50 |
| Trailing only | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signal · Normal | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signal · Trailing | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signal · Trailing only | 0 | 0 / 0 | – | – | $0.00 | – | – |
| total | 792 | 534 / 258 | 2.37 | 2.22 | $4.42 | 67.42 % | 2.50 |
| of which Block-raised | 450 | 242 / 208 | 1.12 | 0.79 | -$0.72 | 53.78 % | 3.25 |
| of which Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Engine (no signals) | 792 | 534 / 258 | 2.37 | 2.22 | $4.42 | 67.42 % | 2.50 |

## Timeframe lanes

| lane | orders | Return PF | cash PF diagnostic | net |
|---|---:|---:|---:|---:|
| 15m | 792 | 2.37 | 2.22 | $4.42 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | Return PF | cash PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 792 | 534 / 258 | 2.37 | 2.22 | $4.42 | 67.42 % | 2.50 |
| Minimal | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Short | 0 | 0 / 0 | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Wide | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Micro | 876 | symPf 452 · duplicate 424 |

## Base said, the book did — the same ranges on the same basis

The primary result and the gates use net return PF. Base lists a median across passed sets on its validation
sample; the simulated book pools its closed-order returns in the run. Those samples and reducers differ, so
their difference alone does not establish edge loss or a sizing effect. Cash PF is a separate diagnostic on
the same closed orders as the book's return PF; unequal notionals can change cash PF without changing return PF.

| range | Base passed (median return PF, validation sample) | simulated return PF (run closes) | cash PF diagnostic (same run closes) | orders |
|---|---:|---:|---:|---:|
| Micro | 4.00 | 2.37 | 2.22 | 792 |
| Minimal | – | – | – | 0 |
| Short | – | – | – | 0 |
| General | – | – | – | 0 |
| Long | – | – | – | 0 |
| Wide | – | – | – | 0 |
| Signals | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (240 of 964 evaluated, 1000 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (0 units active at the run start, 0 over the run, 0 of 18270 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 92 | 64 (70 %) | 508 | 88 % | 1.46 | 29.60 |
| Micro | trailing | 148 | 128 (86 %) | 1058 | 55 % | 1.68 | 52.55 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 240 | 192 (80 %) | 1566 | 66 % | 1.58 | 82.15 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (336 h) ≥ max(3, 12) closes, positive net, PF ≥ its full indication's range minimum (stage 1.1; general 1.12, long 1.18, micro 1.05, minimal 1.08; full indication-aware Tactic floor 1.1, retaining stricter settings; mixed indication groups can have different minima), drawdown time ≤ min(163.33 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 336 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 163.33 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 0 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss uses the runtime's no-loss gate score, not an exact finite ratio).

| range | configs | evaluated | passed | median PF (evaluated) | median PF (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 952 | 952 | 240 | 1.69 | 3.57 | 18.00–18.00 (median 18.00) | 198 | 328 | 6 | 0 | 174 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 |  |
| Minimal | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Short | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| General | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Long | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Wide | 48 | 12 | 0 | 2.00 | – | 18.00–18.00 (median 18.00) | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 36 | 0 |  |
| Signals | 18270 | – | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 18270 signal tapes, 0 units (pair × symbol × direction) active at the run start, 0 over the run; 0 configs entered while their unit was active — seated per unit and step, not configEval |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 238 | 138 (58 %) | 974 | 83 % | 1.16 | 25.45 |
| Micro | trailing | 714 | 222 (31 %) | 6794 | 35 % | 0.34 | -900.22 |
| Wide | axis | 24 | 0 (0 %) | 12 | 0 % | 0.00 | -10.40 |
| Wide | dca | 12 | 12 (100 %) | 16 | 100 % | ∞ (no loss) | 25.10 |
| Wide | dca-active | 12 | 0 (0 %) | 12 | 0 % | 0.00 | -16.18 |
| Signals | normal | 7560 | 819 (11 %) | 2995 | 67 % | 1.22 | 430.23 |
| Signals | trailing | 7308 | 881 (12 %) | 2464 | 73 % | 4.80 | 1451.06 |
| Signals | trailing-only | 3402 | 695 (20 %) | 2284 | 51 % | 1.38 | 425.54 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 240 | 192 (80 %) | 1566 | 66 % | 1.58 | 82.15 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-rsit2-30@m15 | 98 | 86 (88 %) | 736 | 65 % | 1.70 | 44.17 | tp0.4 sl1.3 tr0 h64 mc (7 · ∞ (no loss) · 1.40) |
| Micro | follow | mc-rsit2-25@m15 | 98 | 72 (73 %) | 638 | 60 % | 1.30 | 19.17 | tp0.4 sl1.3 tr0 h64 mc (6 · ∞ (no loss) · 1.20) |
| Micro | follow | mc-rsi2-25@m15 | 44 | 34 (77 %) | 192 | 85 % | 2.15 | 18.81 | tp0.4 sl1.3 tr0.3 h64 mc (5 · 5.59 · 0.66) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Micro | tp 0.400% (net 0.200%) | sl 3.25× | tr off | 6 | 6 (100 %) | 34 | 100 % | ∞ (no loss) | 6.80 |
| Micro | tp 0.400% (net 0.200%) | sl 3.50× | tr off | 6 | 6 (100 %) | 34 | 100 % | ∞ (no loss) | 6.80 |
| Micro | tp 0.400% (net 0.200%) | sl 3.75× | tr off | 6 | 6 (100 %) | 34 | 100 % | ∞ (no loss) | 6.80 |
| Micro | tp 0.400% (net 0.200%) | sl 4.00× | tr off | 6 | 6 (100 %) | 34 | 100 % | ∞ (no loss) | 6.80 |
| Micro | tp 0.400% (net 0.200%) | sl 4.25× | tr off | 6 | 6 (100 %) | 34 | 100 % | ∞ (no loss) | 6.80 |
| Micro | tp 0.400% (net 0.200%) | sl 4.50× | tr off | 6 | 6 (100 %) | 30 | 100 % | ∞ (no loss) | 6.00 |
| Micro | tp 0.400% (net 0.200%) | sl 4.75× | tr off | 6 | 6 (100 %) | 30 | 100 % | ∞ (no loss) | 6.00 |
| Micro | tp 0.400% (net 0.200%) | sl 5.00× | tr off | 6 | 6 (100 %) | 30 | 100 % | ∞ (no loss) | 6.00 |
| Micro | tp 0.400% (net 0.200%) | sl 3.25× | tr 0.75× | 6 | 6 (100 %) | 44 | 77 % | 3.46 | 4.84 |
| Micro | tp 0.400% (net 0.200%) | sl 3.50× | tr 0.75× | 6 | 6 (100 %) | 44 | 77 % | 3.46 | 4.84 |
| Micro | tp 0.400% (net 0.200%) | sl 3.75× | tr 0.75× | 6 | 6 (100 %) | 44 | 77 % | 3.46 | 4.84 |
| Micro | tp 0.400% (net 0.200%) | sl 4.00× | tr 0.75× | 6 | 6 (100 %) | 44 | 77 % | 3.46 | 4.84 |
| Micro | tp 0.400% (net 0.200%) | sl 4.25× | tr 0.75× | 6 | 6 (100 %) | 44 | 77 % | 3.46 | 4.84 |
| Micro | tp 0.400% (net 0.200%) | sl 4.50× | tr 0.75× | 6 | 6 (100 %) | 44 | 77 % | 3.46 | 4.84 |
| Micro | tp 0.400% (net 0.200%) | sl 4.75× | tr 0.75× | 6 | 6 (100 %) | 40 | 75 % | 3.06 | 4.04 |
| Micro | tp 0.400% (net 0.200%) | sl 5.00× | tr 0.75× | 6 | 6 (100 %) | 40 | 75 % | 3.06 | 4.04 |
| Micro | tp 0.400% (net 0.200%) | sl 3.00× | tr 0.75× | 4 | 4 (100 %) | 34 | 76 % | 3.10 | 3.52 |
| Micro | tp 0.500% (net 0.300%) | sl 3.75× | tr 0.75× | 4 | 4 (100 %) | 22 | 45 % | 2.22 | 1.65 |
| Micro | tp 0.500% (net 0.300%) | sl 4.00× | tr 0.75× | 4 | 4 (100 %) | 22 | 45 % | 2.22 | 1.65 |
| Micro | tp 0.500% (net 0.300%) | sl 4.25× | tr 0.75× | 4 | 4 (100 %) | 22 | 45 % | 2.22 | 1.65 |
| Micro | tp 0.500% (net 0.300%) | sl 4.50× | tr 0.75× | 4 | 4 (100 %) | 22 | 45 % | 2.22 | 1.65 |
| Micro | tp 0.500% (net 0.300%) | sl 4.75× | tr 0.75× | 4 | 4 (100 %) | 22 | 45 % | 2.22 | 1.65 |
| Micro | tp 0.500% (net 0.300%) | sl 5.00× | tr 0.75× | 4 | 4 (100 %) | 22 | 45 % | 2.22 | 1.65 |
| Micro | tp 0.400% (net 0.200%) | sl 1.75× | tr off | 4 | 4 (100 %) | 30 | 87 % | 1.44 | 1.60 |
| Micro | tp 0.400% (net 0.200%) | sl 2.00× | tr off | 4 | 4 (100 %) | 30 | 87 % | 1.30 | 1.20 |
| Micro | tp 0.500% (net 0.300%) | sl 2.75× | tr 0.75× | 4 | 4 (100 %) | 26 | 38 % | 1.55 | 1.06 |
| Micro | tp 0.500% (net 0.300%) | sl 3.00× | tr 0.75× | 4 | 4 (100 %) | 26 | 38 % | 1.55 | 1.06 |
| Micro | tp 0.500% (net 0.300%) | sl 3.25× | tr 0.75× | 4 | 4 (100 %) | 26 | 38 % | 1.55 | 1.06 |
| Micro | tp 0.500% (net 0.300%) | sl 3.50× | tr 0.75× | 4 | 4 (100 %) | 26 | 38 % | 1.55 | 1.06 |
| Micro | tp 0.400% (net 0.200%) | sl 2.25× | tr off | 6 | 6 (100 %) | 44 | 86 % | 1.15 | 1.00 |
| Micro | tp 0.500% (net 0.300%) | sl 3.75× | tr 0.50× | 4 | 4 (100 %) | 30 | 47 % | 1.25 | 0.61 |
| Micro | tp 0.500% (net 0.300%) | sl 4.00× | tr 0.50× | 4 | 4 (100 %) | 30 | 47 % | 1.25 | 0.61 |
| Micro | tp 0.500% (net 0.300%) | sl 4.25× | tr 0.50× | 4 | 4 (100 %) | 30 | 47 % | 1.25 | 0.61 |
| Micro | tp 0.500% (net 0.300%) | sl 4.50× | tr 0.50× | 4 | 4 (100 %) | 30 | 47 % | 1.25 | 0.61 |
| Micro | tp 0.500% (net 0.300%) | sl 4.75× | tr 0.50× | 4 | 4 (100 %) | 30 | 47 % | 1.25 | 0.61 |
| Micro | tp 0.500% (net 0.300%) | sl 5.00× | tr 0.50× | 4 | 4 (100 %) | 30 | 47 % | 1.25 | 0.61 |
| Micro | tp 0.500% (net 0.300%) | sl 2.25× | tr 0.50× | 4 | 2 (50 %) | 34 | 41 % | 1.21 | 0.52 |
| Micro | tp 0.500% (net 0.300%) | sl 2.50× | tr 0.50× | 4 | 2 (50 %) | 34 | 41 % | 1.21 | 0.52 |
| Micro | tp 0.500% (net 0.300%) | sl 2.75× | tr 0.50× | 4 | 2 (50 %) | 34 | 41 % | 1.21 | 0.52 |
| Micro | tp 0.500% (net 0.300%) | sl 3.00× | tr 0.50× | 4 | 2 (50 %) | 34 | 41 % | 1.21 | 0.52 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Micro | tp 0.500% (net 0.300%) | sl 2.00× | tr off | 6 | 0 (0 %) | 22 | 55 % | 0.30 | -8.40 |
| Micro | tp 0.500% (net 0.300%) | sl 1.75× | tr off | 6 | 0 (0 %) | 22 | 55 % | 0.33 | -7.15 |
| Micro | tp 0.500% (net 0.300%) | sl 1.25× | tr off | 4 | 0 (0 %) | 22 | 45 % | 0.30 | -6.90 |
| Micro | tp 0.500% (net 0.300%) | sl 2.50× | tr 0.75× | 4 | 0 (0 %) | 30 | 33 % | 0.39 | -4.74 |
| Micro | tp 0.500% (net 0.300%) | sl 2.25× | tr 0.75× | 4 | 0 (0 %) | 30 | 33 % | 0.41 | -4.24 |
| Micro | tp 0.400% (net 0.200%) | sl 3.00× | tr off | 4 | 0 (0 %) | 30 | 87 % | 0.93 | -0.40 |
| Micro | tp 0.400% (net 0.200%) | sl 2.50× | tr off | 4 | 2 (50 %) | 30 | 87 % | 1.08 | 0.40 |
| Micro | tp 0.500% (net 0.300%) | sl 3.50× | tr 0.50× | 4 | 2 (50 %) | 34 | 41 % | 1.21 | 0.52 |
| Micro | tp 0.500% (net 0.300%) | sl 3.25× | tr 0.50× | 4 | 2 (50 %) | 34 | 41 % | 1.21 | 0.52 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 3 (3) | 714 | 238 | 238 | 0 | baseTarget 476 |
| Micro | trailing | 3 (3) | 2142 | 714 | 714 | 0 | baseTarget 1428 |
| Minimal | normal | 3 (0) | 378 | 0 | 0 | 0 | baseRange 378 |
| Minimal | trailing | 3 (0) | 1134 | 0 | 0 | 0 | baseRange 1134 |
| Wide | axis | 3 (3) | 24 | 24 | 24 | 0 | – |
| Wide | dca | 3 (3) | 12 | 12 | 12 | 0 | – |
| Wide | dca-active | 3 (3) | 12 | 12 | 12 | 0 | – |

Engine indications Base evaluated that built no set: 166 (act-burst-2.5@x4, act-chop@x4, bb-walk@x4, break-atr-2@x4, break-vol-2@x4, break-vol@x4, cci-14-200@x4, cci-40-200@x4, cfl-trend-50, dir-emax, dir-emax-12-26, dir-emax-5-13, dir-vwap-240, ema-50-100, ema-9-21, ema-slope, ema-stoch, hma-55, htfpb-4, htfpb-8, ichi-cloud-20, ichi-cloud-9, ichi-tk-9, macd-zero, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-10, mc-brk-20, mc-burst-2, mc-burst-3, mc-climax-3, mc-climax-4, mc-engulf-20, mc-exh-12-3, mc-exh-12-5, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.4 % | tp 0.5 % | tp 0.7 % |
|---|---:|---:|---:|
| 1× | 0.28 (308) | 0.29 (230) | 0.18 (48) |
| 1.25× | 0.52 (266) | 0.33 (216) | 0.16 (48) |
| 1.5× | 0.53 (266) | 0.33 (212) | 0.14 (48) |
| 1.75× | 0.52 (258) | 0.28 (208) | 0.13 (48) |
| 2× | 0.48 (258) | 0.26 (208) | 0.41 (30) |
| 2.25× | 0.45 (258) | 0.29 (196) | 0.54 (30) |
| 2.5× | 0.43 (258) | 0.28 (196) | 0.54 (30) |
| 2.75× | 0.40 (258) | 0.48 (166) | 0.54 (30) |
| 3× | 0.41 (250) | 0.49 (166) | 0.54 (30) |
| 3.25× | 0.54 (222) | 0.48 (166) | 0.54 (30) |
| 3.5× | 0.52 (222) | 0.47 (166) | 0.54 (30) |
| 3.75× | 0.62 (222) | 0.46 (158) | 0.54 (30) |
| 4× | 0.60 (222) | 0.53 (154) | 0.54 (30) |
| 4.25× | 0.58 (222) | 0.52 (154) | 0.54 (30) |
| 4.5× | 0.54 (218) | 0.51 (154) | 0.54 (30) |
| 4.75× | 0.50 (214) | 0.50 (154) | 0.54 (30) |
| 5× | 0.60 (206) | 0.49 (154) | 0.54 (30) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.4 % | tp 0.5 % | tp 0.7 % |
|---|---:|---:|---:|
| 1× | – | – | 0.00 (2) |
| 1.25× | – | 0.30 (22) | – |
| 1.5× | – | – | – |
| 1.75× | 1.44 (30) | 0.33 (22) | – |
| 2× | 1.30 (30) | 0.30 (22) | – |
| 2.25× | 1.15 (44) | 0.63 (72) | – |
| 2.5× | 1.08 (30) | 0.60 (72) | – |
| 2.75× | – | 1.36 (60) | – |
| 3× | 1.43 (64) | 1.36 (60) | – |
| 3.25× | 6.93 (78) | 1.36 (60) | – |
| 3.5× | 6.93 (78) | 1.36 (60) | – |
| 3.75× | 6.93 (78) | 1.60 (52) | – |
| 4× | 6.93 (78) | 1.60 (52) | – |
| 4.25× | 6.93 (78) | 1.60 (52) | – |
| 4.5× | 6.52 (74) | 1.60 (52) | – |
| 4.75× | 6.11 (70) | 1.60 (52) | – |
| 5× | 6.11 (70) | 1.60 (52) | – |

### Micro — orders executed

| stop ÷ target | tp 0.4 % | tp 0.5 % | tp 0.7 % |
|---|---:|---:|---:|
| 1× | – | – | – |
| 1.25× | – | ∞ (2) | 0.00 (2) |
| 1.5× | – | – | 0.00 (2) |
| 1.75× | 0.67 (8) | 0.84 (8) | 0.00 (2) |
| 2× | 0.60 (8) | ∞ (6) | 2.36 (6) |
| 2.25× | 1.09 (14) | 0.99 (22) | 2.36 (6) |
| 2.5× | 1.00 (14) | 0.92 (22) | 2.36 (6) |
| 2.75× | 0.46 (8) | 2.99 (30) | 2.36 (6) |
| 3× | 1.20 (24) | 2.99 (30) | 2.36 (6) |
| 3.25× | 5.56 (34) | 2.99 (30) | 2.36 (6) |
| 3.5× | 5.56 (34) | 2.99 (30) | 2.36 (6) |
| 3.75× | 5.56 (34) | 2.99 (30) | 2.36 (6) |
| 4× | 5.56 (34) | 2.99 (30) | 2.36 (6) |
| 4.25× | 5.56 (34) | 2.99 (30) | 2.36 (6) |
| 4.5× | 5.56 (34) | 2.99 (30) | 2.36 (6) |
| 4.75× | 5.56 (34) | 2.99 (30) | 2.36 (6) |
| 5× | 5.56 (34) | 2.99 (30) | 2.36 (6) |

### Wide — every config computed

| stop ÷ target | tp 0.8 % | tp 1.2 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|
| 1× | 0.21 (20) | 1.37 (8) | 1.97 (6) | 1.91 (6) |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.8 % | tp 1.2 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|
| 1× | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.8 % | tp 1.2 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|
| 1× | – | – | – | – |
