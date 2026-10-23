# Simulated trading session — 12 symbols, 100 h pre-historic + 12 h run (tactics default, signals on)

Offline replay from the supplied cached candle feed (no market-data requests; original provider not recorded; simulated orders only; no exchange execution proof). Timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 30m), strategies Normal, Trailing, signals. Configured Signal gate history 100 h; available evaluated prehistory 100 h, short by 0 h; indicator-only warm-up 273 h. The 100 h general engine prehistory is a separate boundary. Balance $10.00; each order volume unit = 0.1 % of the realized account balance at entry ($0.01–$0.01 before volume factors) at 10×; 0.15 % round-trip cost on every close. Window 2026-10-16T21:00 → 2026-10-17T09:00 UTC. Engine Base 35/380 pairs passed; Signals 23/380 representative pairs pass the diagnostic gate (excluded from Base totals) — per range, passed / evaluated pairs · applied Base PF floor and passed-pair PF scores: Wide min PF 1.00 · 0/0 · Micro min PF 1.05 · 0/0 (judged at the default cell — Wide's figures) · Minimal min PF 1.10 · 0/0 (judged at the default cell — Wide's figures) · Short min PF 1.10 · 0/0 (judged at the default cell — Wide's figures) · General min PF 1.20 · 0/0 (judged at the default cell — Wide's figures) · Long min PF 1.30 · 0/0 (judged at the default cell — Wide's figures) · Signals min PF 1.50 · 23/380 · median gate PF score 1.95; Main 0 pairs, 121535 tapes. First simulated step at 2026-10-16T21:00:00.000Z: 0 engine configs selected (Signal activation is separate). Paper selection after compute as of 2026-10-17T09:00:00.000Z: 0 engine configs + 191 Signal configs (complete paper step). Compute 458 s. The combined account PF includes both Base-qualified engine orders and separately activated Signal orders; the Base-to-execution benchmark is engine-only, and Signal PF is separate. Pre-validation candidate-pool PF is diagnostic. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings))):** balance $10.00 → $10.00 (0.00 %, closed orders) · equity at end $10.00 (open at end: 1 virtual positions / 4 virtual orders (4 funded), MTM -$0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF ∞ (no loss) · cash PF (base $1) ∞ (no loss) · sized $ PF diagnostic ∞ (no loss) · 1 closed position episodes / 5 funded orders opened (1 settled, 4 still open) · 1 virtual closes (0 zero allocations) · WR 100.00 % · DDT (closed trades, $) 0.00 h · DDR 0.00 · equity max drawdown $0.00 (0.05 %) · margin used max $0.03 · funded open avg 0.47 pos / 1.72 orders (peak 2 / 5)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Configured Signal gate history 100 h; available evaluated prehistory 100 h, short by 0 h; indicator-only warm-up 273 h. The 100 h general engine prehistory is a separate boundary. Missing history is not a pass. Generated candidates use completed entries inside that available Signal history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1.5 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 380 | 182 | 0 | 3168 | 3168 | 2890 | 223 | 9 | 118 |
**Caps:** position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings)) — 0 orders capped to $0, 0 scaled down (open at end: 0 capped, 0 scaled) · binding: position cap 0, gross cap 0. **Without the caps:** balance $10.00 → $10.00 (0.00 %) · Return PF ∞ (no loss) · cash PF (base $1) ∞ (no loss) · sized $ PF diagnostic ∞ (no loss) · equity at end $10.00 · equity max drawdown $0.00 (0.05 %) · margin used max $0.03.
**Virtual diagnostic:** 1 closes · Return PF ∞ (no loss) before funding allocation; 0 zero allocations and 0 unknown allocations. Position episodes and explicitly virtual counts describe the native virtual book. Funded opening/settlement totals and headline occupancy use verified allocations; PF uses funded settled orders.

### Base gate: what each change would admit

From the same Base results — no recompute. The PF floor here changes the untagged / Wide fallback only; configured Micro, Minimal, Short, General and Long floors stay in force. "Pairs in a range" is what the tape stage builds from.

The median is the runtime's Base gate PF score. A no-loss pair uses the finite score 4; that is a qualification score, not an exact PF.

| Base gate | wide / fallback PF floor | closes | DDR | pairs at the default cell | pairs in a range | share | median PF score of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 0 | 0  | 0.0 % | – |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 0 | 0 (+0) | 0.0 % | – |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 0 | 0 (+0) | 0.0 % | – |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 0 | 0 (+0) | 0.0 % | – |
| closes ≥ 6 | 1.00 | 6 | 1 | 0 | 0 (+0) | 0.0 % | – |
| closes ≥ 20 | 1.00 | 20 | 1 | 0 | 0 (+0) | 0.0 % | – |
| closes ≥ 30 | 1.00 | 30 | 1 | 0 | 0 (+0) | 0.0 % | – |
| DDR off | 1.00 | 12 | off | 0 | 0 (+0) | 0.0 % | – |
| DDR ≤ 2 | 1.00 | 12 | 2 | 0 | 0 (+0) | 0.0 % | – |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 0 | 0 (+0) | 0.0 % | – |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 0 | 0 (+0) | 0.0 % | – |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 0 | 0 (+0) | 0.0 % | – |



### After each evaluation: PF and sets validated

Base: the Base-passed pairs pooled on their gross return basis; no-loss samples show ∞ (no loss), while the runtime's finite no-loss gate score is shown separately in the run summary. Validation: the sets validated at the run start and their gross-return PF pooled on the validation window (signals: units active in the run). Orders: the run's funded settled orders and their realized PF; known zero allocations are excluded.
With Axis perRange off, Wide-labeled validation and orders also include independent untagged DCA/Axis configs from pairs that qualified in another range, following the recorded builder admission policy.

| range | Base pooled PF | pairs validated | effective validation min PF | validation PF | sets validated | orders PF | orders |
|---|---:|---:|---|---:|---:|---:|---:|
| Wide | – | 0 of 0 | not recorded | – | – | – | 0 |
| Micro | – | 0 of 0 | not recorded | – | – | – | 0 |
| Minimal | – | 0 of 0 | not recorded | – | – | – | 0 |
| Short | – | 0 of 0 | not recorded | – | – | – | 0 |
| General | – | 0 of 0 | not recorded | – | – | – | 0 |
| Long | – | 0 of 0 | not recorded | – | – | – | 0 |
| Signals | 2.04 | 23 of 380 | – | – | 627 units active | ∞ (no loss) | 1 |


### Each range at every step

Per range over the run's 12 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Signals | 121535 | 12 / 12 | 12 | 1 | 4567 | 45 | 5 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 22:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 23:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 00:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 01:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 02:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.00 % | 0.00 | $0.00 | 0 / 0 |
| 03:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.00 % | 0.02 | $0.03 | 2 / 5 |
| 04:00 | 1 / 1 | 1 / 0 | ∞ (no loss) | ∞ (no loss) | 100 % | $0.00 | $10.00 | $10.00 | $10.00 | 0.04 % | 1.02 | $0.03 | 1 / 4 |
| 05:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.05 % | 2.02 | $0.03 | 1 / 4 |
| 06:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.05 % | 3.02 | $0.03 | 1 / 4 |
| 07:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.05 % | 4.02 | $0.03 | 1 / 4 |
| 08:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.05 % | 5.02 | $0.03 | 1 / 4 |

**Last hour (08:00):** open at end: 1 virtual positions / 4 virtual orders (4 funded), MTM -$0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $10.00 = balance $10.00 + MTM -$0.00.

**Hours positive:** 1 of 12 full hours · flat 11 · negative 0

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* and *cash PF (base $1)* use the same canonical unit returns and should match; *sized $ PF diagnostic* = gross realized cash gains ÷ losses on those same orders after actual sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 5m | 30m |
|---|---:|---:|
| 21:00 | – | – |
| 22:00 | – | – |
| 23:00 | – | – |
| 00:00 | – | – |
| 01:00 | – | – |
| 02:00 | – | – |
| 03:00 | – | – |
| 04:00 | 1 · ∞ (no loss) · $0.00 | – |
| 05:00 | – | – |
| 06:00 | – | – |
| 07:00 | – | – |
| 08:00 | – | – |

## Hour by hour per type (funded orders · Return PF · WR · net $)

The strategy columns partition funded orders; virtual closes also include zero-allocated closes. *Of which* columns are subsets of the funded orders.

| hour (UTC) | funded orders closed | virtual closes | Normal | Trailing | Trailing only | Signal · Normal | Signal · Trailing | Signal · Trailing only | Signal · Exit | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 22:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 23:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 00:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 01:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 02:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 03:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 04:00 | 1 | 1 | – | – | – | 1 · ∞ (no loss) · 100 % · $0.00 | – | – | – | – | 1 · ∞ (no loss) · 100 % · $0.00 |
| 05:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 06:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 07:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 08:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |

## Post-Base paper Live gate

The paper entry stage independently checks each selected config's own last 25 settled post-Base execution closes since 2026-10-16T21:00:00.000Z against the stricter of its range PF floor and the Live PF floor. At the final paper step, 0 config windows had enough closes to be judged: 0 passed and 0 were paused; 0 new entry candidates were rejected by this gate. Exchange closes used: 0. Group last-N: 0.

The hourly order and PF tables above describe the causal walk-forward simulation. They are not rewritten by this later paper-stage gate; this section reports the gate's separate progress and skips.

## Stage funnel, hour by hour (post-gate virtual closes · one-unit PF)

Base (each pair at its default protect and its ranges' cells): 0 engine pairs evaluated, 0 passed (any range); Signal pairs are measured separately. Later stages: *candidate pool* = every config of the Base-passed pairs (121535 tapes; diagnostic, before config validation), Normal / Trailing / Trailing only apart; *post-Base config passes* = 8 distinct configs passed at least one causal config-evaluation step across the window (a config can pass again in a later hour; the hourly row below counts those repeat pass instances). At run start, use the separate config-evaluation denominator/pass count and first simulated-step selection when recorded; the later paper/current selection is a separate snapshot; *post-gate virtual closes* = simulated trades that passed the causal config, coordination, caps and Block gates, before account funding/allocation. This count can include zero-allocated trades; funded settled orders and their PF are reported separately above. One-unit PF is every virtual close normalized to one unit after the 0.15 % cost. Config-evaluation history is 100 h (max of longH and preH); Base history is reported separately. Replay-only selection-window override: 100 h; it does not change normal runtime settings. The additional per-config entry last-N check is off (wf.lastN = 0); configEval still validates configs before seating. Separate post-Base paper Live-entry replay: last 25 closes per config, from 2026-10-16T21:00:00.000Z; see the Live gate section for judged and rejected counts.

| hour (UTC) | candidate pool (pre-validation) | pool Normal | pool Trailing | pool Trailing only | post-Base config-pass instances (hourly; may repeat) | post-gate virtual closes (pre-funding) | virtual Normal | virtual Trailing | virtual Trailing only | virtual Block-raised | virtual Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 806 · 0.51 | 382 · 0.53 | 422 · 0.48 | 2 · 0.00 | – | – | – | – | – | – | – |
| 22:00 | 1874 · 0.04 | 873 · 0.04 | 947 · 0.04 | 54 · 0.00 | – | – | – | – | – | – | – |
| 23:00 | 982 · 0.03 | 374 · 0.06 | 464 · 0.04 | 144 · 0.00 | – | – | – | – | – | – | – |
| 00:00 | 481 · 0.28 | 183 · 0.22 | 254 · 0.45 | 44 · 0.08 | – | – | – | – | – | – | – |
| 01:00 | 1061 · 0.52 | 393 · 0.36 | 562 · 0.56 | 106 · 3.00 | – | – | – | – | – | – | – |
| 02:00 | 2125 · 0.02 | 566 · 0.05 | 907 · 0.02 | 652 · 0.00 | – | – | – | – | – | – | – |
| 03:00 | 3439 · 0.07 | 891 · 0.11 | 1492 · 0.08 | 1053 · 0.02 | 3 · 30.99 | – | – | – | – | – | – |
| 04:00 | 5604 · 0.45 | 1177 · 0.40 | 2583 · 0.49 | 1843 · 0.45 | 2 · ∞ (no loss) | 1 · ∞ (no loss) | – | – | – | – | 1 · ∞ (no loss) |
| 05:00 | 11806 · 0.59 | 1510 · 0.52 | 5540 · 0.66 | 4756 · 0.57 | – | – | – | – | – | – | – |
| 06:00 | 4340 · 0.24 | 1490 · 0.28 | 1806 · 0.42 | 1044 · 0.01 | – | – | – | – | – | – | – |
| 07:00 | 10983 · 0.55 | 2720 · 0.32 | 4577 · 0.67 | 3681 · 0.62 | 5 · ∞ (no loss) | – | – | – | – | – | – |
| 08:00 | 262 · 2.51 | 206 · 2.66 | 56 · 0.57 | – | – | – | – | – | – | – | – |
| **total** | **43763 · 0.37** | **10765 · 0.29** | **19610 · 0.45** | **13379 · 0.35** | **10 · 235.85** | **1 · ∞ (no loss)** | **–** | **–** | **–** | **–** | **1 · ∞ (no loss)** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Trailing | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Normal | 1 | 1 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| Signal · Trailing | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Exit | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| total | 1 | 1 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| of which Block-raised | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| of which Signals | 1 | 1 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| of which Engine (no signals) | 0 | 0 / 0 | – | – | – | $0.00 | – | – |

## Timeframe lanes

| lane | orders | Return PF | cash PF (base $1) | sized $ PF diagnostic | net |
|---|---:|---:|---:|---:|---:|
| 5m | 1 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 |
| 30m | 0 | – | – | – | $0.00 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Minimal | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Short | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Wide | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signals | 1 | 1 / 0 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | $0.00 | 100.00 % | 0.00 |
| Exit | 0 | 0 / 0 | – | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 40 | sig:signalValid 37 · sig:signalPf 3 |

## Base said, the book did — the same ranges on the same basis

The combined account result includes every funded engine and Signal order. For the Base-to-execution benchmark, engine range rows contain only funded orders from Base-qualified pairs whose configs passed post-Base validation; Signals are separately activated, qualified and reported. All PF gates use net returns. Base lists a median gate score across passed pairs on its Base sample; a no-loss Base sample has an exact pooled PF of ∞ and a separate finite gate score. The run PF is on the actual executed order cohort. These samples and reducers differ, so
their difference alone does not establish edge loss or a sizing effect. Cash PF is a separate diagnostic on
the same closed orders as the book's return PF; unequal notionals can change cash PF without changing return PF.

| range | Base passed (median gate score, validation sample) | simulated return PF (run closes) | cash PF (base $1) | sized $ PF diagnostic (same run closes) | orders |
|---|---:|---:|---:|---:|---:|
| Micro (Base at the default cell) | – | – | – | – | 0 |
| Minimal (Base at the default cell) | – | – | – | – | 0 |
| Short (Base at the default cell) | – | – | – | – | 0 |
| General (Base at the default cell) | – | – | – | – | 0 |
| Long (Base at the default cell) | – | – | – | – | 0 |
| Wide | – | – | – | – | 0 |
| Signals | 1.95 | ∞ (no loss) | ∞ (no loss) | ∞ (no loss) | 1 |
| Exit | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 0 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (388 units active at the run start, 627 over the run, 8 of 121535 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | exit | 7 | 7 (100 %) | 9 | 89 % | 221.56 | 12.81 |
| Signals | normal | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 0.83 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:coordination-band-r60-i3 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 10.31 |
| Signals | signal:r-frama-pullback | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 0.83 |
| Signals | signal:r-klinger | 2 | 2 (100 %) | 4 | 75 % | 44.04 | 2.50 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (100 h) ≥ max(3, 12) closes, positive net, PF ≥ its full indication's range minimum (stage 1.1; general 1.2, long 1.3, micro 1.05, minimal 1.1, short 1.1; full indication-aware Tactic floor 1.1, retaining stricter settings; mixed indication groups can have different minima), drawdown time ≤ min(48.61 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 100 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 48.61 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 0 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss uses the runtime's no-loss gate score, not an exact finite ratio).

| range | configs | evaluated | passed | median PF score (evaluated) | median PF score (passed) | DDT limit h (min–max) | closes | net | pf | pre | lcb | lastN | rangeGate | context | ddt | ddr | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no Micro indication in the focus |
| Minimal | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Short | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| General | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Long | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Wide | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Signals | 121535 | – | 388 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 121535 signal tapes, 388 units (pair × symbol × direction) active at the run start, 627 over the run; 8 configs entered while their unit was active — seated per unit and step, not configEval |

## Diagnostic: every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.15 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes. This all-candidate table is diagnostic only: it is not the PF benchmark and does not qualify or dilute the post-Base execution cohort.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | exit | 12 | 7 (58 %) | 9 | 89 % | 221.56 | 12.81 |
| Signals | normal | 33846 | 1826 (5 %) | 10765 | 27 % | 0.29 | -8588.60 |
| Signals | trailing | 51077 | 5565 (11 %) | 19610 | 43 % | 0.45 | -9136.99 |
| Signals | trailing-only | 36600 | 3996 (11 %) | 13379 | 43 % | 0.35 | -8528.96 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:coordination-band-r60-i3 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 10.31 |
| Signals | signal:r-frama-pullback | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 0.83 |
| Signals | signal:r-klinger | 2 | 2 (100 %) | 4 | 75 % | 44.04 | 2.50 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 7.61 |
| Signals | 1.25 | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 7.61 |
| Signals | 1.35 | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 7.61 |
| Signals | 1.5 | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 7.61 |
| Signals | 1.75 | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 7.61 |
| Signals | 2 | 2 | 2 (100 %) | 2 | 100 % | ∞ (no loss) | 5.08 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | exit | sig-coord-v2-r60-n3-i3-br9a60mhgf0326kw8ow07@m30 | 5 | 5 (100 %) | 5 | 100 % | ∞ (no loss) | 10.31 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Wide | exit | 2 (2) | 12 | 12 | 12 | 0 | – |

Engine indications Base evaluated that built no set: 0.
