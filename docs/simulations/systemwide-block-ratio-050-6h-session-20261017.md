# Simulated trading session — 9 symbols, 6 h pre-historic + 6 h run (tactics default, signals off)

Offline replay from the supplied cached candle feed (no market-data requests; simulated orders only). Timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 5m+, 15m, 15m+), strategies Normal, Trailing, DCA with Block. Signals use the same 6 h minimal evaluated history; no additional Signal warmup was loaded. Balance $10.00; each order volume unit = 2.0 % of the realized equity at entry ($0.20–$0.32 before the caps) at 10×; 0.20 % round-trip cost on every close. Window 2026-10-14T22:00 → 2026-10-15T04:00 UTC. Engine Base 53/665 pairs passed — per range, passed / evaluated pairs · median Base gate PF score of passed pairs (no-loss pooled PF called out): Wide 0/24 · Micro 53/641 · median gate PF score 4.00 · Minimal 13/665 · median gate PF score 4.00 · Short 0/20 · General 0/20 · Long 0/20; Main 53 pairs, 28120 tapes, Real seats: 49 engine configs + 0 signal configs (every config of the active signals), compute 16 s. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))):** balance $10.00 → $9.79 (-2.10 %, closed orders) · equity at end $9.38 (open at end: 10 positions / 461 orders, MTM -$0.41 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF 2.83 (net returns on funded settled orders) · cash PF diagnostic 0.66 (same orders after sizing) · 31 positions / 3711 funded orders · 4531 virtual closes (820 zero allocations) · WR 78.07 % · DDT (closed trades, $) 1.58 h · DDR – (net ≤ 0) · equity max drawdown $0.77 (7.72 %) · margin used max $6.85 · open avg 6.68 pos / 1843.74 orders (peak 11 / 3197)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Generated candidates use completed entries inside the minimal evaluated history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 820 orders capped to $0, 3649 scaled down (open at end: 39 capped, 422 scaled) · binding: position cap 4922, gross cap 330. **Without the caps:** balance $10.00 → $16.61 (66.08 %) · Return PF 2.99 · cash PF diagnostic 2.01 · equity at end $12.90 · equity max drawdown $23.16 (117.23 %) · margin used max $317.88 · infeasible: margin exceeded equity for 345 min.
**Virtual diagnostic:** 4531 closes · Return PF 2.99 before funding allocation; 820 zero allocations and 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

### Base gate: what each change would admit

From the same Base results — no recompute. "pairs in a range" is what the tape stage builds from.

The median is the runtime's Base gate PF score. A no-loss pair uses the finite score 4; that is a qualification score, not an exact PF.

| Base gate | PF floor | closes | DDR | pairs at the default cell | pairs in a range | share | median PF score of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 0 | 53  | 8.0 % | – |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 0 | 53 (+0) | 8.0 % | – |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 0 | 53 (+0) | 8.0 % | – |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 0 | 53 (+0) | 8.0 % | – |
| closes ≥ 6 | 1.00 | 6 | 1 | 0 | 76 (+23) | 11.4 % | – |
| closes ≥ 20 | 1.00 | 20 | 1 | 0 | 3 (-50) | 0.5 % | – |
| closes ≥ 30 | 1.00 | 30 | 1 | 0 | 0 (-53) | 0.0 % | – |
| DDR off | 1.00 | 12 | off | 0 | 53 (+0) | 8.0 % | – |
| DDR ≤ 2 | 1.00 | 12 | 2 | 0 | 53 (+0) | 8.0 % | – |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 0 | 53 (+0) | 8.0 % | – |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 0 | 53 (+0) | 8.0 % | – |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 0 | 76 (+23) | 11.4 % | – |


### Base by range: which gate removes each pair

Each pair at the range's own cell against the range's minimum. "first" = the first gate missed (closes → net → PF → DDR); "only" = pairs that miss that one gate alone (removing it admits them).

| range | evaluated | passed | share | first: closes / net / PF / DDR | only: closes / net / PF / DDR | median PF, only DDR |
|---|---:|---:|---:|---|---|---:|
| Wide | 24 | 0 | 0.0 % | 24 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Micro | 641 | 53 | 8.3 % | 588 / 0 / 0 / 0 | 238 / 0 / 0 / 0 | – |
| Minimal | 665 | 13 | 2.0 % | 652 / 0 / 0 / 0 | 216 / 0 / 0 / 0 | – |
| Short | 20 | 0 | 0.0 % | 20 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| General | 20 | 0 | 0.0 % | 20 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Long | 20 | 0 | 0.0 % | 20 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |


### After each evaluation: PF and sets validated

Base: the Base-passed pairs pooled on their gross return basis; no-loss samples show ∞ (no loss), while the runtime's finite no-loss gate score is shown separately in the run summary. Validation: the sets validated at the run start and their gross-return PF pooled on the validation window (signals: units active in the run). Orders: the run's funded settled orders and their realized PF; known zero allocations are excluded.

| range | Base pooled PF | pairs validated | effective validation min PF | validation PF | sets validated | orders PF | orders |
|---|---:|---:|---|---:|---:|---:|---:|
| Wide | – | 0 of 24 | not recorded | – | – | ∞ (no loss) | 7 |
| Micro | 220.32 | 53 of 641 | 1.05 | 24.79 | 5300 of 25704 | 2.35 | 3400 |
| Minimal | 10.37 | 13 of 665 | 1.08 | 35.93 | 540 of 1568 | 28.03 | 304 |
| Short | – | 0 of 20 | not recorded | – | – | – | 0 |
| General | – | 0 of 20 | not recorded | – | – | – | 0 |
| Long | – | 0 of 20 | not recorded | – | – | – | 0 |


### Each range at every step

Per range over the run's 6 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 25704 | 6 / 6 | 6 | 6 | 12084 | 10722 | 4646 |
| Wide | 848 | 6 / 6 | 5 | 5 | 39 | 97 | 42 |
| Minimal | 1568 | 6 / 6 | 4 | 3 | 756 | 542 | 304 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 0 / 408 | 304 / 104 | 4.89 | 7.70 | 75 % | $0.03 | $10.03 | $9.93 | $9.93 | 0.83 % | 0.80 | $5.92 | 9 / 2621 |
| 23:00 | 1 / 156 | 122 / 34 | 3.24 | 28.12 | 78 % | $0.00 | $10.03 | $9.94 | $9.92 | 1.02 % | 1.80 | $5.92 | 8 / 3235 |
| 00:00 | 1 / 610 | 454 / 156 | 4.98 | 6.03 | 74 % | $0.02 | $10.05 | $9.98 | $9.91 | 1.07 % | 2.80 | $5.69 | 7 / 2741 |
| 01:00 | 0 / 552 | 272 / 280 | 2.68 | 3.16 | 49 % | $0.01 | $10.06 | $9.97 | $9.93 | 1.07 % | 3.80 | $5.19 | 8 / 2145 |
| 02:00 | 17 / 1797 | 1557 / 240 | 2.45 | 0.36 | 87 % | -$0.38 | $9.68 | $9.45 | $9.39 | 6.22 % | 4.80 | $6.77 | 13 / 180 |
| 03:00 | 6 / 188 | 188 / 0 | ∞ (no loss) | ∞ (no loss) | 100 % | $0.11 | $9.79 | $9.38 | $9.24 | 7.72 % | 5.80 | $6.85 | 10 / 461 |

**Last hour (03:00):** open at end: 10 positions / 461 orders, MTM -$0.41 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $9.38 = balance $9.79 + MTM -$0.41.

**Hours positive:** 5 of 6 full hours · flat 0 · negative 1

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* = positive net returns ÷ absolute negative net returns (primary); *cash PF diagnostic* = gross profit $ ÷ gross loss $ on those same orders after sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 5m | 5m+ | 15m | 15m+ |
|---|---:|---:|---:|---:|
| 22:00 | 220 · 14.98 · $0.02 | – | 188 · 2.14 · $0.01 | – |
| 23:00 | 82 · 3.46 · $0.00 | 68 · ∞ (no loss) · $0.00 | 6 · 0.00 · -$0.00 | – |
| 00:00 | 338 · 2.33 · $0.00 | 42 · 8.69 · $0.00 | 230 · 22.71 · $0.01 | – |
| 01:00 | 148 · 3.54 · -$0.00 | 8 · ∞ (no loss) · $0.00 | 378 · 2.14 · $0.00 | 18 · ∞ (no loss) · $0.01 |
| 02:00 | 384 · 0.26 · -$0.08 | – | 1240 · 9.28 · -$0.11 | 173 · 0.99 · -$0.19 |
| 03:00 | 142 · ∞ (no loss) · $0.10 | – | 46 · ∞ (no loss) · $0.01 | – |

## Hour by hour per type (funded orders · Return PF · WR · net $)

The strategy columns partition funded orders; virtual closes also include zero-allocated closes. *Of which* columns are subsets of the funded orders.

| hour (UTC) | funded orders closed | virtual closes | Normal | Trailing | Trailing only | DCA | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 408 | 408 | 160 · ∞ (no loss) · 100 % · $0.02 | 248 · 2.33 · 58 % · $0.01 | – | – | 220 · 14.98 · 92 % · $0.02 | – |
| 23:00 | 156 | 162 | 68 · 2.82 · 91 % · $0.00 | 88 · 3.85 · 68 % · $0.00 | – | – | 102 · 1.81 · 67 % · -$0.00 | – |
| 00:00 | 610 | 644 | 292 · 27.07 · 99 % · $0.01 | 318 · 2.11 · 52 % · $0.01 | – | – | 464 · 5.91 · 80 % · $0.01 | – |
| 01:00 | 552 | 678 | 242 · ∞ (no loss) · 100 % · $0.01 | 310 · 0.25 · 10 % · $0.00 | – | – | 358 · 3.79 · 58 % · $0.01 | – |
| 02:00 | 1797 | 2451 | 1244 · 2.47 · 89 % · -$0.20 | 546 · 2.32 · 80 % · -$0.19 | – | 7 · ∞ (no loss) · 100 % · $0.00 | 932 · 1.32 · 78 % · -$0.37 | – |
| 03:00 | 188 | 188 | 188 · ∞ (no loss) · 100 % · $0.11 | – | – | – | 188 · ∞ (no loss) · 100 % · $0.11 | – |

## Stage funnel, hour by hour (orders closed · unit PF)

Base (each pair at its default protect and its ranges' cells): 665 engine pairs evaluated, 53 passed (any range); Signal pairs are measured separately. Later stages: *candidate pool* = every config of the Base-passed pairs (28120 tapes; diagnostic, before config validation), Normal / Trailing / Trailing only apart; *post-Base validated / seated* = configs that passed config evaluation (5848); *simulated execution* = orders that passed the causal config, coordination, caps and Block gates. Unit PF is every close at one unit after the 0.20 % cost. Config-evaluation history is 6 h (max of longH and preH); Base history is reported separately. Replay-only selection-window override: 6 h; it does not change normal runtime settings.The additional per-config entry last-N check is off (wf.lastN = 0); configEval still validates configs before seating. Causal simulated post-Base execution-PF gate: last 25 closes per config, from 2026-10-14T22:00:00.000Z; future exits are excluded.

| hour (UTC) | candidate pool (pre-validation) | pool Normal | pool Trailing | pool Trailing only | post-Base validated / seated | simulated executed (all types) | executed Normal | executed Trailing | executed Trailing only | executed Block-raised | executed Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 20668 · 0.70 | 1158 · 12.62 | 19462 · 0.57 | – | 1134 · 9.10 | 408 · 4.89 | 160 · ∞ (no loss) | 248 · 2.33 | – | 220 · 14.98 | – |
| 23:00 | 15986 · 0.12 | 432 · 3.17 | 15554 · 0.07 | – | 278 · 4.06 | 162 · 3.40 | 74 · 3.09 | 88 · 3.85 | – | 108 · 1.97 | – |
| 00:00 | 27419 · 0.87 | 2658 · 17.24 | 24724 · 0.60 | – | 2414 · 9.07 | 644 · 5.26 | 326 · 29.50 | 318 · 2.11 | – | 498 · 6.32 | – |
| 01:00 | 25774 · 0.30 | 1852 · 4.84 | 23906 · 0.16 | – | 2188 · 1.80 | 678 · 2.15 | 286 · ∞ (no loss) | 392 · 0.18 | – | 468 · 2.34 | – |
| 02:00 | 133599 · 0.54 | 31112 · 0.66 | 100996 · 0.50 | – | 20355 · 0.57 | 2451 · 2.72 | 1770 · 2.86 | 674 · 2.41 | – | 1490 · 1.67 | – |
| 03:00 | 91785 · 0.54 | 14430 · 0.89 | 76530 · 0.45 | – | 7645 · 1.19 | 188 · ∞ (no loss) | 188 · ∞ (no loss) | – | – | 188 · ∞ (no loss) | – |
| **total** | **315231 · 0.53** | **51642 · 0.81** | **261172 · 0.47** | **–** | **34014 · 0.73** | **4531 · 2.99** | **2804 · 3.93** | **1720 · 1.95** | **–** | **2972 · 2.20** | **–** |

Replay-only minimum green-hour fraction for config selection: 100% of the selection window. This bounded offline override does not change normal runtime settings.

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2194 | 2052 / 142 | 3.58 | 0.88 | -$0.04 | 93.53 % | 1.58 |
| Trailing | 1510 | 838 / 672 | 2.00 | 0.30 | -$0.17 | 55.50 % | 1.75 |
| Trailing only | 0 | 0 / 0 | – | – | $0.00 | – | – |
| DCA | 7 | 7 / 0 | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| total | 3711 | 2897 / 814 | 2.83 | 0.66 | -$0.21 | 78.07 % | 1.58 |
| of which Block-raised | 2264 | 1764 / 500 | 1.99 | 0.54 | -$0.22 | 77.92 % | 2.42 |
| of which Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |
| of which Engine (no signals) | 3711 | 2897 / 814 | 2.83 | 0.66 | -$0.21 | 78.07 % | 1.58 |

## Timeframe lanes

| lane | orders | Return PF | cash PF diagnostic | net |
|---|---:|---:|---:|---:|
| 5m | 1314 | 0.93 | 1.35 | $0.05 |
| 5m+ | 118 | 21.64 | 61.01 | $0.00 |
| 15m | 2088 | 7.23 | 0.69 | -$0.08 |
| 15m+ | 191 | 1.08 | 0.06 | -$0.18 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | Return PF | cash PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Micro | 3400 | 2634 / 766 | 2.35 | 0.61 | -$0.24 | 77.47 % | 1.58 |
| Minimal | 304 | 256 / 48 | 28.03 | 4.21 | $0.02 | 84.21 % | 4.25 |
| Short | 0 | 0 / 0 | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | $0.00 | – | – |
| Wide | 7 | 7 / 0 | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| Signals | 0 | 0 / 0 | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Micro | 6076 | duplicate 5124 · symPf 952 |
| Minimal | 238 | duplicate 210 · symPf 28 |
| Wide | 55 | duplicate 35 · symPf 20 |

## Base said, the book did — the same ranges on the same basis

The primary result and the gates use net return PF. Base lists a median gate score across passed sets on its validation
sample; a no-loss Base sample has an exact pooled PF of ∞ and a separate finite gate score. The simulated book pools its closed-order returns in the run. Those samples and reducers differ, so
their difference alone does not establish edge loss or a sizing effect. Cash PF is a separate diagnostic on
the same closed orders as the book's return PF; unequal notionals can change cash PF without changing return PF.

| range | Base passed (median gate score, validation sample) | simulated return PF (run closes) | cash PF diagnostic (same run closes) | orders |
|---|---:|---:|---:|---:|
| Micro | 4.00 | 2.35 | 0.61 | 3400 |
| Minimal | 4.00 | 28.03 | 4.21 | 304 |
| Short | – | – | – | 0 |
| General | – | – | – | 0 |
| Long | – | – | – | 0 |
| Wide | – | ∞ (no loss) | ∞ (no loss) | 7 |
| Signals | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (5848 of 27484 evaluated, 28120 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (0 units active at the run start, 0 over the run, 0 of 0 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 3396 | 1406 (41 %) | 20128 | 83 % | 0.81 | -1198.00 |
| Micro | trailing | 1904 | 656 (34 %) | 12236 | 56 % | 0.63 | -1541.01 |
| Minimal | normal | 258 | 62 (24 %) | 568 | 62 % | 0.53 | -220.20 |
| Minimal | trailing | 282 | 98 (35 %) | 1056 | 59 % | 0.84 | -85.69 |
| Wide | dca | 8 | 2 (25 %) | 26 | 77 % | 0.27 | -42.37 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 5300 | 2062 (39 %) | 32364 | 73 % | 0.74 | -2739.01 |
| Minimal | active | 540 | 160 (30 %) | 1624 | 60 % | 0.69 | -305.89 |
| Wide | active | 8 | 2 (25 %) | 26 | 77 % | 0.27 | -42.37 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (6 h) ≥ max(3, 12) closes, positive net, PF ≥ its full indication's range minimum (stage 1.1; micro 1.05, minimal 1.08, general 1.12, long 1.18; full indication-aware Tactic floor 1.1, retaining stricter settings; mixed indication groups can have different minima), drawdown time ≤ min(2.92 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 6 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 2.92 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 100 %. Real entries then check the last 0 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss uses the runtime's no-loss gate score, not an exact finite ratio).

| range | configs | evaluated | passed | median PF score (evaluated) | median PF score (passed) | DDT limit h (min–max) | closes | net | pf | ddt | ddr | pre | lastN | rangeGate | lcb | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 25704 | 25704 | 5300 | 1.81 | 4.00 | 2.92–2.92 (median 2.92) | 1254 | 8666 | 368 | 3318 | 1236 | 0 | 1030 | 10 | 192 | 4330 | 0 | 0 | 0 |  |
| Minimal | 1568 | 1568 | 540 | 4.00 | 4.00 | 2.92–2.92 (median 2.92) | 98 | 138 | 38 | 272 | 28 | 0 | 44 | 0 | 4 | 406 | 0 | 0 | 0 |  |
| Short | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| General | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Long | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Wide | 848 | 212 | 8 | 4.00 | 4.00 | 2.92–2.92 (median 2.92) | 204 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 636 | 0 |  |

## Every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.20 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 6426 | 2690 (42 %) | 50182 | 76 % | 0.80 | -3164.45 |
| Micro | trailing | 19278 | 4566 (24 %) | 251236 | 39 % | 0.45 | -33368.21 |
| Minimal | normal | 392 | 162 (41 %) | 1460 | 77 % | 1.10 | 65.18 |
| Minimal | trailing | 1176 | 462 (39 %) | 9936 | 43 % | 0.82 | -460.02 |
| Wide | axis | 424 | 4 (1 %) | 1291 | 9 % | 0.08 | -1064.10 |
| Wide | dca | 212 | 148 (70 %) | 520 | 95 % | 2.02 | 256.19 |
| Wide | dca-active | 212 | 14 (7 %) | 606 | 12 % | 0.13 | -594.48 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 5300 | 2062 (39 %) | 32364 | 73 % | 0.74 | -2739.01 |
| Minimal | active | 540 | 160 (30 %) | 1624 | 60 % | 0.69 | -305.89 |
| Wide | active | 8 | 2 (25 %) | 26 | 77 % | 0.27 | -42.37 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-rsi2-30@m5 | 80 | 80 (100 %) | 1322 | 88 % | 2.82 | 315.49 | tp0.7 sl1.925 tr0 h192 mc (15 · ∞ (no loss) · 7.50) |
| Micro | follow | mc-rsi2-25@m5 | 108 | 108 (100 %) | 2010 | 78 % | 1.87 | 276.16 | tp0.6 sl1.65 tr0 h192 mc (17 · 3.46 · 4.55) |
| Micro | follow | mc-rsit2-30@m15 | 212 | 190 (90 %) | 648 | 88 % | 4.03 | 211.14 | tp0.4 sl1.8 tr0 h64 mc (10 · ∞ (no loss) · 2.00) |
| Micro | follow | mc-rsit2-20@m5 | 74 | 66 (89 %) | 1162 | 91 % | 2.24 | 205.66 | tp0.6 sl2.25 tr0 h192 mc (14 · ∞ (no loss) · 5.60) |
| Micro | follow | mc-rsit2-25@m5 | 52 | 50 (96 %) | 966 | 95 % | 2.95 | 187.40 | tp0.6 sl2.25 tr0 h192 mc (16 · ∞ (no loss) · 6.40) |
| Micro | follow | mc-rsi3-30@m5 | 76 | 72 (95 %) | 812 | 87 % | 7.10 | 164.26 | tp0.6 sl1.65 tr0 h192 mc (8 · ∞ (no loss) · 3.20) |
| Micro | follow | mc-rsit2-30@m5 | 40 | 40 (100 %) | 716 | 96 % | 3.55 | 157.75 | tp0.6 sl2.25 tr0 h192 mc (16 · ∞ (no loss) · 6.40) |
| Micro | follow | mc-rsit2-25@m15 | 264 | 200 (76 %) | 1014 | 70 % | 1.65 | 118.90 | tp0.4 sl1.8 tr0 h64 mc (8 · ∞ (no loss) · 1.60) |
| Micro | follow | mc-rsi2-20@m5 | 74 | 72 (97 %) | 1434 | 78 % | 1.74 | 117.85 | tp0.5 sl1.375 tr0 h192 mc (15 · 2.67 · 2.62) |
| Micro | follow | mc-rsit2-20@m15 | 118 | 86 (73 %) | 512 | 88 % | 2.02 | 99.60 | tp0.4 sl1.8 tr0 h64 mc (6 · ∞ (no loss) · 1.20) |
| Micro | follow | mc-rsit3-30@m5 | 60 | 60 (100 %) | 838 | 92 % | 1.69 | 94.65 | tp0.5 sl1.375 tr0 h192 mc (15 · 2.67 · 2.62) |
| Micro | follow | mc-tpull-8@m15 | 58 | 58 (100 %) | 350 | 97 % | 48.88 | 86.79 | tp0.6 sl0.9 tr0 h64 mc (5 · ∞ (no loss) · 2.00) |
| Micro | follow | mc-rsi4-30@m5 | 102 | 76 (75 %) | 490 | 81 % | 1.85 | 53.50 | tp0.5 sl1.625 tr0 h192 mc (5 · ∞ (no loss) · 1.50) |
| Micro | follow | mc-rsit2-10@m5 | 110 | 70 (64 %) | 974 | 84 % | 1.13 | 33.55 | tp0.7 sl1.05 tr0.525 h192 mc (8 · 2.80 · 2.25) |
| Micro | follow | mc-rsit4-30@m5 | 42 | 36 (86 %) | 458 | 87 % | 1.29 | 29.27 | tp0.5 sl1.25 tr0 h192 mc (11 · 2.07 · 1.55) |
| Micro | follow | mc-macdh@m5 | 18 | 18 (100 %) | 258 | 93 % | 1.54 | 22.35 | tp0.5 sl1.875 tr0 h192 mc (14 · 1.88 · 1.82) |
| Micro | follow | mc-rsi2-15@m5 | 56 | 46 (82 %) | 632 | 85 % | 1.18 | 21.92 | tp0.5 sl1.375 tr0 h192 mc (10 · 1.71 · 1.12) |
| Micro | follow | mc-rsit2-15@m5 | 32 | 24 (75 %) | 420 | 90 % | 1.24 | 19.00 | tp0.6 sl1.5 tr0 h192 mc (11 · 2.35 · 2.30) |
| Micro | follow | mc-rsit3-25@m5 | 52 | 34 (65 %) | 572 | 81 % | 1.13 | 15.66 | tp0.6 sl1.05 tr0 h192 mc (9 · 2.56 · 1.95) |
| Micro | follow | mc-rsi3-20@m15 | 44 | 30 (68 %) | 170 | 91 % | 1.64 | 15.15 | tp0.5 sl1.125 tr0 h64 mc (5 · 0.91 · -0.13) |
| Micro | follow | mc-rsit3-20@m5 | 36 | 20 (56 %) | 320 | 89 % | 1.07 | 6.35 | tp0.6 sl1.8 tr0.45 h192 mc (9 · 1.60 · 1.20) |
| Micro | follow | mc-rsi2-15@m15 | 94 | 46 (49 %) | 406 | 72 % | 1.06 | 5.33 | tp0.4 sl1.3 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsi5-30@m5 | 112 | 68 (61 %) | 626 | 74 % | 1.03 | 3.60 | tp0.5 sl1.375 tr0.375 h192 mc (6 · 13.35 · 1.39) |
| Micro | follow | mc-rsit5-30@m5 | 18 | 6 (33 %) | 168 | 89 % | 0.96 | -1.65 | tp0.5 sl1.875 tr0 h192 mc (9 · 1.16 · 0.32) |
| Micro | follow | mc-rsit4-25@m5 | 6 | 0 (0 %) | 54 | 89 % | 0.76 | -3.00 | tp0.4 sl1.8 tr0 h192 mc (9 · 0.80 · -0.40) |
| Micro | follow | mc-mturn-10@m5 | 144 | 58 (40 %) | 656 | 83 % | 0.96 | -8.55 | tp0.8 sl0.8 tr0 h192 mc (5 · 2.40 · 1.40) |
| Micro | follow | mc-mturn-10@m15 | 42 | 18 (43 %) | 230 | 83 % | 0.77 | -13.55 | tp0.4 sl1.8 tr0 h64 mc (6 · ∞ (no loss) · 1.20) |
| Micro | follow | mc-rsit3-15@m5 | 48 | 14 (29 %) | 384 | 81 % | 0.85 | -14.01 | tp0.5 sl1 tr0.375 h192 mc (8 · 1.35 · 0.47) |
| Micro | follow | mc-rsit3-20@m15 | 40 | 6 (15 %) | 342 | 58 % | 0.61 | -25.55 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsit2-15@m15 | 74 | 36 (49 %) | 354 | 76 % | 0.67 | -39.35 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsi4-30@m15 | 18 | 0 (0 %) | 58 | 48 % | 0.11 | -45.60 | tp0.4 sl1.2 tr0 h64 mc (5 · 0.10 · -3.80) |
| Micro | follow | mc-rsit3-30@m15 | 76 | 36 (47 %) | 374 | 74 % | 0.62 | -50.25 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsit4-20@m5 | 48 | 0 (0 %) | 412 | 75 % | 0.58 | -56.96 | tp0.5 sl1.75 tr0.375 h192 mc (8 · 0.86 · -0.28) |
| Micro | follow | mc-rsi3-15@m5 | 78 | 32 (41 %) | 286 | 36 % | 0.23 | -67.10 | tp0.4 sl1.3 tr0.2 h192 mc (6 · 0.51 · -0.38) |
| Micro | follow | mc-rsi3-25@m5 | 102 | 14 (14 %) | 782 | 76 % | 0.70 | -73.85 | tp0.6 sl1.35 tr0 h192 mc (6 · 1.29 · 0.45) |
| Micro | follow | mc-rsit4-30@m15 | 112 | 36 (32 %) | 760 | 54 % | 0.60 | -74.41 | tp0.4 sl1.8 tr0 h64 mc (6 · ∞ (no loss) · 1.20) |
| Micro | follow | mc-rsi3-25@m15 | 42 | 0 (0 %) | 162 | 64 % | 0.25 | -78.45 | tp0.5 sl1.125 tr0 h64 mc (5 · 0.34 · -1.75) |
| Micro | follow | mc-rsit2-10@m15 | 66 | 18 (27 %) | 368 | 47 % | 0.34 | -81.99 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsi5-25@m5 | 84 | 16 (19 %) | 560 | 53 % | 0.41 | -85.97 | tp0.4 sl1.3 tr0.3 h192 mc (6 · 6.83 · 0.85) |
| Micro | follow | mc-rsi4-20@m5 | 88 | 16 (18 %) | 496 | 50 % | 0.34 | -98.99 | tp0.4 sl1.3 tr0.3 h192 mc (5 · 5.46 · 0.65) |
| Micro | follow | mc-rsi4-25@m5 | 114 | 16 (14 %) | 742 | 71 % | 0.54 | -111.91 | tp0.4 sl1.3 tr0.3 h192 mc (7 · 8.19 · 1.05) |
| Micro | follow | mc-rsi2-30@m5c | 62 | 0 (0 %) | 282 | 60 % | 0.27 | -112.80 | tp0.4 sl1.3 tr0 h192 mc (5 · 0.53 · -0.70) |
| Micro | follow | mc-rsi2-20@m15c | 134 | 48 (36 %) | 358 | 57 % | 0.33 | -132.09 | tp0.4 sl1 tr0 h64 mc (5 · 0.25 · -1.80) |
| Micro | follow | mc-rsi3-20@m5 | 106 | 16 (15 %) | 518 | 65 % | 0.38 | -141.10 | tp0.4 sl1.3 tr0.3 h192 mc (7 · 2.29 · 0.56) |
| Micro | follow | mc-rsi2-25@m5c | 102 | 16 (16 %) | 476 | 52 % | 0.28 | -148.92 | tp0.4 sl1.3 tr0.3 h192 mc (5 · 2.05 · 0.31) |
| Micro | follow | mc-rsit3-25@m15 | 124 | 36 (29 %) | 894 | 45 % | 0.40 | -150.16 | tp0.4 sl1.8 tr0 h64 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-macdh@m15 | 66 | 18 (27 %) | 418 | 47 % | 0.19 | -194.55 | tp0.4 sl1.6 tr0 h64 mc (5 · 0.44 · -1.00) |
| Micro | follow | mc-rsi3-30@m15 | 210 | 0 (0 %) | 518 | 44 % | 0.19 | -425.51 | – |
| Micro | follow | mc-rsi2-20@m15 | 282 | 30 (11 %) | 932 | 51 % | 0.35 | -467.05 | tp0.4 sl1.4 tr0 h64 mc (5 · 0.50 · -0.80) |
| Micro | follow | mc-rsi2-30@m15 | 264 | 10 (4 %) | 1102 | 62 % | 0.42 | -480.44 | tp0.7 sl1.75 tr0.525 h64 mc (7 · 1.18 · 0.38) |
| Micro | follow | mc-rsi2-25@m15c | 250 | 0 (0 %) | 794 | 42 % | 0.18 | -547.25 | tp0.5 sl1 tr0.375 h64 mc (5 · 0.23 · -1.99) |
| Micro | follow | mc-rsi2-30@m15c | 310 | 16 (5 %) | 904 | 57 % | 0.30 | -623.61 | tp0.8 sl1 tr0 h64 mc (5 · 0.75 · -0.60) |
| Micro | follow | mc-rsi2-25@m15 | 276 | 0 (0 %) | 870 | 52 % | 0.24 | -645.71 | tp0.4 sl1.6 tr0 h64 mc (6 · 0.56 · -0.80) |
| Minimal | follow | mc-rsit2-30@m15 | 90 | 76 (84 %) | 220 | 92 % | 5.08 | 133.78 | tp1.1 sl1.65 tr0.55 h64 mn (5 · 1.95 · 1.75) |
| Minimal | follow | mc-rsit2-25@m15 | 62 | 48 (77 %) | 102 | 86 % | 2.56 | 39.48 | – |
| Minimal | follow | mc-rsi2-25@m5 | 10 | 10 (100 %) | 160 | 63 % | 2.14 | 31.97 | tp0.8 sl1.6 tr0.6 h192 mn (16 · 2.50 · 3.60) |
| Minimal | follow | mc-rsi2-30@m5 | 8 | 8 (100 %) | 112 | 64 % | 1.97 | 21.31 | tp0.8 sl1.8 tr0.6 h192 mn (14 · 2.22 · 2.96) |
| Minimal | follow | mc-mturn-10@m5 | 12 | 12 (100 %) | 56 | 86 % | 1.89 | 13.60 | tp0.8 sl1.4 tr0.6 h192 mn (5 · 1.50 · 0.80) |
| Minimal | follow | mc-rsi2-25@m15c | 14 | 0 (0 %) | 36 | 56 % | 0.39 | -18.80 | – |
| Minimal | follow | mc-rsi3-30@m15 | 28 | 0 (0 %) | 56 | 50 % | 0.30 | -39.20 | – |
| Minimal | follow | mc-rsi2-20@m15 | 52 | 0 (0 %) | 164 | 48 % | 0.40 | -76.56 | – |
| Minimal | follow | mc-rsi2-30@m15 | 72 | 0 (0 %) | 240 | 48 % | 0.44 | -98.44 | tp0.8 sl1.6 tr0.6 h64 mn (7 · 0.86 · -0.30) |
| Minimal | follow | mc-rsi2-25@m15 | 80 | 0 (0 %) | 196 | 40 % | 0.27 | -149.16 | tp0.8 sl1.4 tr0.6 h64 mn (5 · 0.37 · -2.05) |
| Minimal | follow | mc-rsi2-30@m15c | 112 | 6 (5 %) | 282 | 53 % | 0.40 | -163.88 | tp0.8 sl1.2 tr0.4 h64 mn (5 · 0.42 · -1.67) |

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
| Micro | tp 0.600% (net 0.400%) | sl 5.00× | tr off | 52 | 32 (62 %) | 324 | 92 % | 1.43 | 36.00 |
| Micro | tp 0.500% (net 0.300%) | sl 5.00× | tr off | 90 | 58 (64 %) | 650 | 92 % | 1.23 | 33.00 |
| Micro | tp 0.400% (net 0.200%) | sl 4.50× | tr off | 106 | 64 (60 %) | 874 | 92 % | 1.19 | 25.20 |
| Micro | tp 0.500% (net 0.300%) | sl 3.25× | tr off | 74 | 32 (43 %) | 486 | 88 % | 1.21 | 22.55 |
| Micro | tp 0.400% (net 0.200%) | sl 4.75× | tr off | 106 | 60 (57 %) | 872 | 92 % | 1.13 | 18.00 |
| Micro | tp 0.500% (net 0.300%) | sl 3.50× | tr off | 78 | 34 (44 %) | 524 | 88 % | 1.15 | 17.70 |
| Micro | tp 0.600% (net 0.400%) | sl 2.75× | tr off | 46 | 16 (35 %) | 278 | 85 % | 1.21 | 16.70 |
| Micro | tp 0.400% (net 0.200%) | sl 4.50× | tr 0.75× | 30 | 24 (80 %) | 312 | 65 % | 1.66 | 16.19 |
| Micro | tp 0.400% (net 0.200%) | sl 3.75× | tr 0.75× | 26 | 22 (85 %) | 248 | 65 % | 1.93 | 15.64 |
| Micro | tp 0.400% (net 0.200%) | sl 4.75× | tr 0.75× | 30 | 24 (80 %) | 308 | 65 % | 1.61 | 15.19 |
| Micro | tp 0.400% (net 0.200%) | sl 5.00× | tr 0.75× | 30 | 24 (80 %) | 308 | 65 % | 1.60 | 14.99 |
| Micro | tp 0.400% (net 0.200%) | sl 4.00× | tr 0.75× | 28 | 22 (79 %) | 276 | 65 % | 1.67 | 14.44 |
| Micro | tp 0.400% (net 0.200%) | sl 4.25× | tr 0.75× | 28 | 22 (79 %) | 276 | 65 % | 1.65 | 14.24 |
| Micro | tp 0.400% (net 0.200%) | sl 3.25× | tr 0.75× | 22 | 18 (82 %) | 200 | 64 % | 1.86 | 11.80 |
| Micro | tp 0.400% (net 0.200%) | sl 3.50× | tr 0.75× | 22 | 18 (82 %) | 200 | 64 % | 1.86 | 11.80 |
| Micro | tp 0.400% (net 0.200%) | sl 5.00× | tr off | 106 | 58 (55 %) | 872 | 92 % | 1.07 | 11.20 |
| Micro | tp 0.600% (net 0.400%) | sl 2.50× | tr off | 40 | 12 (30 %) | 224 | 83 % | 1.15 | 9.80 |
| Micro | tp 0.700% (net 0.500%) | sl 2.75× | tr off | 20 | 8 (40 %) | 76 | 84 % | 1.25 | 6.50 |
| Minimal | tp 0.800% | sl 2.25× | tr 0.75× | 14 | 6 (43 %) | 102 | 59 % | 1.17 | 5.11 |
| Micro | tp 0.800% (net 0.600%) | sl 2.25× | tr 0.75× | 14 | 6 (43 %) | 102 | 59 % | 1.17 | 5.11 |
| Micro | tp 0.700% (net 0.500%) | sl 3.00× | tr off | 20 | 8 (40 %) | 76 | 84 % | 1.16 | 4.40 |
| Minimal | tp 0.800% | sl 2.75× | tr 0.75× | 14 | 6 (43 %) | 100 | 60 % | 1.14 | 4.31 |
| Micro | tp 0.800% (net 0.600%) | sl 2.75× | tr 0.75× | 14 | 6 (43 %) | 100 | 60 % | 1.14 | 4.31 |
| Minimal | tp 1.100% | sl 1.50× | tr 0.50× | 2 | 2 (100 %) | 10 | 80 % | 1.95 | 3.50 |
| Minimal | tp 1.100% | sl 1.75× | tr 0.75× | 4 | 2 (50 %) | 10 | 80 % | 1.70 | 2.96 |
| Micro | tp 0.800% (net 0.600%) | sl 1.00× | tr off | 2 | 2 (100 %) | 10 | 80 % | 2.40 | 2.80 |
| Micro | tp 0.800% (net 0.600%) | sl 1.00× | tr 0.75× | 2 | 2 (100 %) | 10 | 80 % | 2.40 | 2.80 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Micro | tp 0.500% (net 0.300%) | sl 2.25× | tr off | 52 | 6 (12 %) | 316 | 60 % | 0.34 | -109.95 |
| Micro | tp 0.400% (net 0.200%) | sl 3.00× | tr off | 58 | 2 (3 %) | 372 | 70 % | 0.33 | -104.80 |
| Micro | tp 0.400% (net 0.200%) | sl 2.75× | tr off | 36 | 4 (11 %) | 242 | 62 % | 0.25 | -89.60 |
| Micro | tp 0.500% (net 0.300%) | sl 2.50× | tr off | 56 | 14 (25 %) | 336 | 68 % | 0.45 | -84.70 |
| Micro | tp 0.400% (net 0.200%) | sl 2.50× | tr off | 32 | 2 (6 %) | 198 | 58 % | 0.23 | -78.00 |
| Micro | tp 0.500% (net 0.300%) | sl 2.00× | tr off | 28 | 4 (14 %) | 164 | 51 % | 0.26 | -70.80 |
| Micro | tp 0.600% (net 0.400%) | sl 1.50× | tr off | 22 | 4 (18 %) | 164 | 46 % | 0.31 | -66.40 |
| Micro | tp 0.600% (net 0.400%) | sl 2.00× | tr off | 32 | 4 (13 %) | 176 | 58 % | 0.39 | -62.80 |
| Micro | tp 0.400% (net 0.200%) | sl 2.25× | tr off | 18 | 0 (0 %) | 98 | 43 % | 0.14 | -53.20 |
| Micro | tp 0.500% (net 0.300%) | sl 2.50× | tr 0.75× | 22 | 2 (9 %) | 176 | 43 % | 0.31 | -50.24 |
| Micro | tp 0.600% (net 0.400%) | sl 1.75× | tr off | 24 | 6 (25 %) | 164 | 57 % | 0.43 | -49.90 |
| Micro | tp 0.400% (net 0.200%) | sl 4.00× | tr off | 88 | 26 (30 %) | 708 | 87 % | 0.73 | -46.40 |
| Micro | tp 0.500% (net 0.300%) | sl 2.25× | tr 0.75× | 22 | 2 (9 %) | 176 | 43 % | 0.34 | -44.74 |
| Micro | tp 0.400% (net 0.200%) | sl 2.00× | tr off | 16 | 0 (0 %) | 90 | 42 % | 0.15 | -44.40 |
| Micro | tp 0.400% (net 0.200%) | sl 3.75× | tr off | 88 | 26 (30 %) | 712 | 86 % | 0.74 | -43.80 |

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

Engine indications Base evaluated that built no set: 121 (break-mc-rel-don8-5-dd24-balanced, dir-emax, dir-emax-12-26, dir-emax-5-13, dir-vwap-240, ema-50-100, ema-9-21, ema-slope, ema-stoch, hma-55, ichi-cloud-20, ichi-cloud-9, ichi-tk-9, macd-zero, mc-act-idio-2, mc-act-idio-3, mc-act-mkt-18, mc-act-mkt-25, mc-bbrk-20, mc-bbx-20, mc-bbx-25, mc-brk-10, mc-brk-20, mc-burst-2, mc-burst-3, mc-climax-3, mc-climax-4, mc-engulf-20, mc-exh-12-3, mc-exh-12-5, mc-exh-4-3, mc-exh-4-5, mc-fbo-48, mc-fbo-96, mc-ibrk, mc-irsi2-10, mc-ivwapd-2, mc-iz-25, mc-lag-12, mc-lag-3, …).

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
| 1× | 0.21 (34) | 0.10 (32) | – | – | 2.40 (20) | – | – |
| 1.25× | 0.13 (54) | 0.12 (40) | 0.18 (20) | – | 1.08 (38) | 1.06 (12) | 0.45 (40) |
| 1.5× | 0.14 (92) | 0.21 (84) | 0.34 (196) | 0.61 (42) | 0.55 (34) | 0.36 (40) | 0.67 (68) |
| 1.75× | 0.16 (154) | 0.23 (102) | 0.43 (212) | 0.60 (58) | 0.47 (74) | 0.54 (66) | 0.62 (60) |
| 2× | 0.16 (226) | 0.30 (264) | 0.39 (240) | 0.64 (124) | 0.75 (122) | 0.63 (54) | 0.94 (50) |
| 2.25× | 0.15 (248) | 0.34 (492) | 0.58 (228) | 0.72 (140) | 0.85 (142) | 0.57 (54) | 0.84 (50) |
| 2.5× | 0.20 (348) | 0.40 (512) | 0.96 (300) | 0.75 (182) | 0.78 (142) | 0.52 (54) | 0.76 (50) |
| 2.75× | 0.22 (420) | 0.73 (660) | 1.01 (354) | 1.04 (206) | 0.77 (140) | 0.48 (54) | 0.70 (50) |
| 3× | 0.36 (642) | 0.77 (646) | 1.49 (470) | 0.96 (206) | 0.71 (140) | 0.44 (54) | 0.64 (50) |
| 3.25× | 0.87 (750) | 0.91 (756) | 1.38 (468) | 0.90 (206) | 0.66 (140) | 0.41 (54) | 0.60 (50) |
| 3.5× | 0.80 (926) | 0.97 (776) | 1.29 (468) | 0.84 (206) | 0.61 (138) | 0.38 (54) | 0.56 (50) |
| 3.75× | 0.83 (1030) | 1.35 (892) | 1.44 (460) | 0.79 (206) | 0.57 (138) | 0.36 (54) | 0.52 (50) |
| 4× | 0.81 (1054) | 1.28 (892) | 1.36 (460) | 0.74 (202) | 0.54 (138) | 0.34 (54) | 0.49 (50) |
| 4.25× | 0.90 (1068) | 1.21 (892) | 1.29 (460) | 0.70 (202) | 0.51 (138) | 0.32 (54) | 0.46 (50) |
| 4.5× | 1.20 (1256) | 1.16 (892) | 1.22 (460) | 0.67 (202) | 0.48 (138) | 0.31 (52) | 0.44 (50) |
| 4.75× | 1.15 (1250) | 1.10 (892) | 1.11 (442) | 0.63 (202) | 0.44 (134) | 0.29 (52) | 0.42 (50) |
| 5× | 1.10 (1250) | 1.06 (892) | 1.06 (442) | 0.61 (202) | 0.42 (132) | 0.28 (52) | 0.40 (50) |

### Micro — orders executed

| stop ÷ target | tp 0.4 % | tp 0.5 % | tp 0.6 % | tp 0.7 % | tp 0.8 % | tp 0.9 % | tp 1 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 0.57 (22) | 0.11 (10) | – | – | – | – | – |
| 1.25× | 0.32 (26) | 0.73 (12) | ∞ (6) | – | ∞ (2) | – | ∞ (8) |
| 1.5× | 0.37 (30) | 0.87 (28) | 4.17 (30) | – | ∞ (2) | 0.42 (6) | ∞ (14) |
| 1.75× | 0.60 (38) | 1.03 (34) | ∞ (12) | ∞ (2) | 23.87 (6) | 28.07 (12) | ∞ (14) |
| 2× | 0.98 (42) | 1.12 (42) | 14.69 (16) | 5.94 (10) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 2.25× | 0.90 (42) | 1.37 (56) | 11.10 (20) | 11.88 (16) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 2.5× | 0.75 (50) | 1.30 (60) | 1.41 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 2.75× | 0.66 (54) | 1.85 (66) | 8.32 (16) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 3× | 1.21 (80) | 1.31 (76) | 9.71 (18) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 3.25× | 2.15 (100) | 1.72 (74) | 9.71 (18) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 3.5× | 1.54 (106) | 1.63 (74) | 11.10 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 3.75× | 1.30 (120) | 1.15 (78) | 11.10 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 4× | 1.16 (114) | 1.17 (82) | 11.10 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 4.25× | 1.99 (110) | 1.12 (82) | 11.10 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 4.5× | 1.48 (120) | 1.07 (82) | 11.10 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 4.75× | 1.41 (120) | 1.02 (82) | 11.10 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |
| 5× | 1.44 (126) | 0.98 (82) | 11.10 (20) | 13.86 (18) | 8.12 (12) | 28.07 (12) | ∞ (14) |

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
| 1.5× | 0.55 (34) | 0.36 (40) | 0.59 (54) | 1.07 (32) |
| 1.75× | 0.47 (74) | – | 0.53 (46) | 1.91 (22) |
| 1.76× | – | 0.54 (66) | – | – |
| 2× | 0.75 (122) | 0.63 (54) | 0.79 (38) | 1.69 (22) |
| 2.24× | – | 0.57 (54) | – | – |
| 2.25× | 0.85 (142) | – | 0.71 (38) | 1.52 (22) |
| 2.5× | 0.78 (142) | 0.52 (54) | 0.64 (38) | 1.37 (22) |
| 2.74× | – | 0.48 (54) | – | – |
| 2.75× | 0.77 (140) | – | 0.59 (38) | 1.26 (22) |
| 3× | 0.71 (140) | 0.44 (54) | 0.54 (38) | 1.16 (22) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % | tp 0.9 % | tp 1 % | tp 1.1 % |
|---|---:|---:|---:|---:|
| 1.5× | ∞ (2) | 0.42 (6) | ∞ (12) | ∞ (14) |
| 1.75× | 23.87 (6) | – | ∞ (12) | ∞ (10) |
| 1.76× | – | 29.23 (12) | – | – |
| 2× | 8.12 (12) | 29.23 (12) | ∞ (12) | ∞ (10) |
| 2.24× | – | 29.23 (12) | – | – |
| 2.25× | 8.12 (12) | – | ∞ (12) | ∞ (10) |
| 2.5× | 8.12 (12) | 29.23 (12) | ∞ (12) | ∞ (10) |
| 2.74× | – | 29.23 (12) | – | – |
| 2.75× | 8.12 (12) | – | ∞ (12) | ∞ (10) |
| 3× | 8.12 (12) | 29.23 (12) | ∞ (12) | ∞ (10) |

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
| 1× | – | ∞ (3) | – | – | – | – | ∞ (2) | ∞ (2) |
