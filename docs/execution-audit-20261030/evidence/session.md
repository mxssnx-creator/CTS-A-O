# Simulated trading session — 8 symbols, 12 h pre-historic + 12 h run (tactics default, signals on)

Offline replay from the supplied cached candle feed (no market-data requests; original provider not recorded; simulated orders only; no exchange execution proof). Timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 1m), strategies Normal, Trailing, Axis, DCA with Block, signals. Configured Signal gate history 12 h; available evaluated prehistory 12 h, short by 0 h; indicator-only warm-up 0 h. The 12 h general engine prehistory is a separate boundary. Balance $10.00; each order volume unit = 0.1 % of the realized account balance at entry ($0.01–$0.01 before volume factors) at 10×; 0.15 % round-trip cost on every close. Window 2026-10-09T00:00 → 2026-10-09T12:00 UTC. Engine Base 120/27242 pairs passed; Signals 0/42 representative pairs pass the diagnostic gate (excluded from Base totals) — per range, passed / evaluated pairs · applied Base PF floor and passed-pair PF scores: Wide min PF 1.25 · 8/18268 · median gate PF score 1.72 · Micro min PF 1.05 · 0/4692 · Minimal min PF 1.08 · 13/24012 · median gate PF score 2.41 · Short min PF 1.12 · 0/0 (judged at the default cell — Wide's figures) · General min PF 1.25 · 0/0 (judged at the default cell — Wide's figures) · Long min PF 1.50 · 0/0 (judged at the default cell — Wide's figures) · Signals min PF 1.50 · 0/42; Main 15 pairs, 818 tapes. First simulated step at 2026-10-09T00:00:00.000Z: 6 engine configs selected (Signal activation is separate). Paper selection after compute as of 2026-10-09T12:00:00.000Z: 4 engine configs + 0 Signal configs (complete paper step). Compute 17 s. The combined account PF includes both Base-qualified engine orders and separately activated Signal orders; the Base-to-execution benchmark is engine-only, and Signal PF is separate. Pre-validation candidate-pool PF is diagnostic. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings))):** balance $10.00 → $10.03 (0.31 %, closed orders) · equity at end $10.03 (open at end: 5 virtual positions / 13 virtual orders (13 funded), MTM -$0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF 3.60 · cash PF (base $1) 3.60 · sized $ PF diagnostic 5.36 · 51 funded positions / 307 orders opened (46 positions / 294 orders settled; 5 positions / 13 orders still open) · 294 virtual closes (0 zero allocations) · WR 87.76 % · DDT (closed trades, $) 4.23 h · DDR 0.11 · equity max drawdown $0.02 (0.20 %) · margin used max $0.19 · funded open avg 6.33 pos / 23.73 orders (peak 8 / 41)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, Short minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward unit returns exclude the recorded combined external execution multiplier, including any Block, Relate, coordination, range and strategy factors; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Configured Signal gate history 12 h; available evaluated prehistory 12 h, short by 0 h; indicator-only warm-up 0 h. The 12 h general engine prehistory is a separate boundary. Missing history is not a pass. Generated candidates use completed entries inside that available Signal history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1.5 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 42 | 42 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
**Caps:** position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings)) — 0 orders capped to $0, 0 scaled down (open at end: 0 capped, 0 scaled) · binding: position cap 0, gross cap 0. **Without the caps:** balance $10.00 → $10.03 (0.31 %) · Return PF 3.60 · cash PF (base $1) 3.60 · sized $ PF diagnostic 5.36 · equity at end $10.03 · equity max drawdown $0.02 (0.20 %) · margin used max $0.19.
**Virtual diagnostic:** 294 closes · Return PF 3.60 before funding allocation; 0 zero allocations and 0 unknown allocations. Position episodes and explicitly virtual counts describe the native virtual book. Funded opening/settlement totals and headline occupancy use verified allocations; PF uses funded settled orders.

### Base gate: what each change would admit

From the same Base results — no recompute. The PF floor here changes the untagged / Wide fallback only; configured Micro, Minimal, Short, General and Long floors stay in force. "Pairs in a range" is what the tape stage builds from.

The median is the runtime's Base gate PF score. A no-loss pair uses the finite score 4; that is a qualification score, not an exact PF.

| Base gate | wide / fallback PF floor | closes | DDR | pairs at the default cell | pairs in a range | share | median PF score of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.25 | 12 | 1 | 10 | 15  | 0.1 % | 1.891 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 10 | 15 (+0) | 0.1 % | 1.891 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 10 | 15 (+0) | 0.1 % | 1.891 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 10 | 15 (+0) | 0.1 % | 1.891 |
| closes ≥ 6 | 1.25 | 6 | 1 | 24 | 34 (+19) | 0.1 % | 2.062 |
| closes ≥ 20 | 1.25 | 20 | 1 | 0 | 1 (-14) | 0.0 % | – |
| closes ≥ 30 | 1.25 | 30 | 1 | 0 | 0 (-15) | 0.0 % | – |
| DDR off | 1.25 | 12 | off | 28 | 41 (+26) | 0.2 % | 1.547 |
| DDR ≤ 2 | 1.25 | 12 | 2 | 25 | 31 (+16) | 0.1 % | 1.547 |
| DDR ≤ 0.5 | 1.25 | 12 | 0.5 | 3 | 6 (-9) | 0.0 % | 2.578 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 49 | 46 (+31) | 0.2 % | 1.289 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 113 | 101 (+86) | 0.4 % | 1.375 |


### Base by range: which gate removes each pair

Each pair at the range's own cell against the range's minimum. "first" = the first gate missed (closes → net → PF → DDR); "only" = pairs that miss that one gate alone (removing it admits them).

| range | min PF | evaluated | passed | share | first: closes / net / PF / DDR | only: closes / net / PF / DDR | median PF, only DDR |
|---|---:|---:|---:|---:|---|---|---:|
| Wide | 1.25 | 18268 | 8 | 0.0 % | 18018 / 215 / 14 / 13 | 10 / 0 / 0 / 13 | 1.547 |
| Micro | 1.05 | 4692 | 0 | 0.0 % | 4692 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | – |
| Minimal | 1.08 | 24012 | 13 | 0.1 % | 23619 / 350 / 4 / 26 | 16 / 0 / 0 / 26 | 1.238 |


### After each evaluation: PF and sets validated

Base: the Base-passed pairs pooled on their gross return basis; no-loss samples show ∞ (no loss), while the runtime's finite no-loss gate score is shown separately in the run summary. Validation: the sets validated at the run start and their gross-return PF pooled on the validation window (signals: units active in the run). Orders: the run's funded settled orders and their realized PF; known zero allocations are excluded.
Validation percentages use the displayed Base-qualified config inventory, including disabled types; the separate evaluated count excludes those types. Zero or missing denominators are unavailable, not 0%. Signals require their exact-context audit; active units are not a validation percentage.
With Axis perRange off, Wide-labeled validation and orders also include independent untagged DCA/Axis configs from pairs that qualified in another range, following the recorded builder admission policy.

| range | Base pooled PF | pairs validated (%) | effective validation min PF | post-Base validation PF | sets validated (%) | settled execution PF | orders |
|---|---:|---:|---|---:|---:|---:|---:|
| Wide | 2.04 | 8 of 18268 (0.04%) | 1.25 | ∞ (no loss) | 4 of 240 (1.67%) | 2.91 | 184 |
| Micro | – | 0 of 4692 (0.00%) | not recorded | – | – | – | 0 |
| Minimal | 2.39 | 13 of 24012 (0.05%) | 1.08 | 55.81 | 2 of 56 (3.57%) | 11.01 | 110 |
| Short | – | 0 of 0 (percentage unavailable) | not recorded | – | – | – | 0 |
| General | – | 0 of 0 (percentage unavailable) | not recorded | – | – | – | 0 |
| Long | – | 0 of 0 (percentage unavailable) | not recorded | – | – | – | 0 |
| Signals | – | 0 of 42 (0.00%) | – | unavailable (use exact-context audit) | 0 units active; validation percentage unavailable | – | 0 |


### Each range at every step

Per range over the run's 12 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Minimal | 74 | 12 / 12 | 12 | 11 | 23 | 227 | 116 |
| Wide | 240 | 12 / 12 | 9 | 8 | 35 | 340 | 191 |
| Signals | 504 | 12 / 12 | 0 | 0 | 0 | 0 | 0 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 2 / 10 | 10 / 0 | ∞ (no loss) | ∞ (no loss) | 100 % | $0.00 | $10.00 | $10.00 | $10.00 | 0.02 % | 0.07 | $0.05 | 6 / 31 |
| 01:00 | 5 / 59 | 57 / 2 | 365.03 | 375.01 | 97 % | $0.01 | $10.01 | $10.01 | $10.00 | 0.02 % | 0.05 | $0.09 | 6 / 23 |
| 02:00 | 2 / 44 | 40 / 4 | 539.72 | 169.39 | 91 % | $0.01 | $10.01 | $10.01 | $10.00 | 0.08 % | 0.10 | $0.14 | 7 / 22 |
| 03:00 | 3 / 25 | 21 / 4 | 40.08 | 11.06 | 84 % | $0.00 | $10.02 | $10.02 | $10.01 | 0.08 % | 0.63 | $0.11 | 8 / 21 |
| 04:00 | 6 / 29 | 27 / 2 | 138.66 | 53.61 | 93 % | $0.00 | $10.02 | $10.02 | $10.02 | 0.08 % | 0.20 | $0.09 | 6 / 15 |
| 05:00 | 8 / 32 | 30 / 2 | 68.69 | 24.94 | 94 % | $0.00 | $10.02 | $10.02 | $10.02 | 0.08 % | 0.23 | $0.07 | 5 / 17 |
| 06:00 | 3 / 18 | 16 / 2 | 12777.67 | 4626.28 | 89 % | $0.00 | $10.03 | $10.03 | $10.02 | 0.08 % | 0.55 | $0.10 | 6 / 17 |
| 07:00 | 6 / 39 | 26 / 13 | 1.46 | 2.11 | 67 % | $0.00 | $10.03 | $10.03 | $10.02 | 0.10 % | 0.43 | $0.19 | 7 / 29 |
| 08:00 | 4 / 13 | 10 / 3 | 0.15 | 0.74 | 77 % | -$0.00 | $10.03 | $10.03 | $10.02 | 0.15 % | 1.43 | $0.15 | 6 / 26 |
| 09:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.03 | $10.03 | $10.02 | 0.15 % | 2.43 | $0.12 | 6 / 26 |
| 10:00 | 0 / 3 | 0 / 3 | 0.00 | 0.00 | 0 % | -$0.00 | $10.03 | $10.02 | $10.02 | 0.20 % | 3.43 | $0.12 | 6 / 26 |
| 11:00 | 7 / 22 | 21 / 1 | 754.10 | 304.96 | 95 % | $0.01 | $10.03 | $10.03 | $10.02 | 0.20 % | 4.43 | $0.13 | 5 / 13 |

**Last hour (11:00):** open at end: 5 virtual positions / 13 virtual orders (13 funded), MTM -$0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $10.03 = balance $10.03 + MTM -$0.00.

**Hours positive:** 9 of 12 full hours · flat 1 · negative 2

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* and *cash PF (base $1)* use the same canonical unit returns and should match; *sized $ PF diagnostic* = gross realized cash gains ÷ losses on those same orders after actual sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 1m |
|---|---:|
| 00:00 | 10 · ∞ (no loss) · $0.00 |
| 01:00 | 59 · 365.03 · $0.01 |
| 02:00 | 44 · 539.72 · $0.01 |
| 03:00 | 25 · 40.08 · $0.00 |
| 04:00 | 29 · 138.66 · $0.00 |
| 05:00 | 32 · 68.69 · $0.00 |
| 06:00 | 18 · 12777.67 · $0.00 |
| 07:00 | 39 · 1.46 · $0.00 |
| 08:00 | 13 · 0.15 · -$0.00 |
| 09:00 | – |
| 10:00 | 3 · 0.00 · -$0.00 |
| 11:00 | 22 · 754.10 · $0.01 |

## Hour by hour per type (funded orders · Return PF · WR · net $)

The strategy columns partition funded orders; virtual closes also include zero-allocated closes. *Of which* columns are subsets of the funded orders.

| hour (UTC) | funded orders closed | virtual closes | Normal | Trailing | Trailing only | DCA | Signal · Normal | Signal · Trailing | Signal · Trailing only | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 10 | 10 | – | 2 · ∞ (no loss) · 100 % · $0.00 | – | 8 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 7 · ∞ (no loss) · 100 % · $0.00 | – |
| 01:00 | 59 | 59 | – | 18 · 113.10 · 89 % · $0.00 | – | 41 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 44 · 257.75 · 95 % · $0.01 | – |
| 02:00 | 44 | 44 | – | 18 · 130.32 · 78 % · $0.00 | – | 26 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 39 · 473.70 · 90 % · $0.01 | – |
| 03:00 | 25 | 25 | – | 8 · 5.26 · 50 % · $0.00 | – | 17 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 25 · 40.08 · 84 % · $0.00 | – |
| 04:00 | 29 | 29 | – | 10 · 36.98 · 80 % · $0.00 | – | 19 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 28 · 130.96 · 93 % · $0.00 | – |
| 05:00 | 32 | 32 | – | 8 · 16.20 · 75 % · $0.00 | – | 24 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 32 · 68.69 · 94 % · $0.00 | – |
| 06:00 | 18 | 18 | – | 6 · 2996.25 · 67 % · $0.00 | – | 12 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 18 · 12777.67 · 89 % · $0.00 | – |
| 07:00 | 39 | 39 | – | 18 · 3.75 · 33 % · $0.00 | – | 21 · 1.26 · 95 % · $0.00 | – | – | – | 39 · 1.46 · 67 % · $0.00 | – |
| 08:00 | 13 | 13 | – | 8 · ∞ (no loss) · 100 % · $0.00 | – | 5 · 0.03 · 40 % · -$0.00 | – | – | – | 13 · 0.15 · 77 % · -$0.00 | – |
| 09:00 | 0 | 0 | – | – | – | – | – | – | – | – | – |
| 10:00 | 3 | 3 | – | 3 · 0.00 · 0 % · -$0.00 | – | – | – | – | – | 3 · 0.00 · 0 % · -$0.00 | – |
| 11:00 | 22 | 22 | – | 11 · 215.15 · 91 % · $0.00 | – | 11 · ∞ (no loss) · 100 % · $0.00 | – | – | – | 22 · 754.10 · 95 % · $0.01 | – |

## Post-Base paper Live gate

The paper entry stage independently checks each selected config's own last 25 settled post-Base execution closes since 2026-10-09T00:00:00.000Z against the stricter of its range PF floor and the Live PF floor. At the final paper step, 0 config windows had enough closes to be judged: 0 passed and 0 were paused; 0 new entry candidates were rejected by this gate. Exchange closes used: 0. Group last-N: 0.

The hourly order and PF tables above describe the causal walk-forward simulation. They are not rewritten by this later paper-stage gate; this section reports the gate's separate progress and skips.

## Stage funnel, hour by hour (post-gate virtual closes · one-unit PF)

Base (each pair at its default protect and its ranges' cells): 27200 engine pairs evaluated, 119 passed (any range); Signal pairs are measured separately. Later stages: *candidate pool* = every config of the Base-passed pairs (818 tapes; diagnostic, before config validation), Normal / Trailing / Trailing only apart; *post-Base config passes* = 6 distinct configs passed at least one causal config-evaluation step across the window (a config can pass again in a later hour; the hourly row below counts those repeat pass instances). At run start, use the separate config-evaluation denominator/pass count and first simulated-step selection when recorded; the later paper/current selection is a separate snapshot; *post-gate virtual closes* = simulated trades that passed the causal config, coordination, caps and Block gates, before account funding/allocation. This count can include zero-allocated trades; funded settled orders and their PF are reported separately above. One-unit PF is every virtual close normalized to one unit after the 0.15 % cost. Config-evaluation history is 12 h (max of longH and preH); Base history is reported separately. Replay-only selection-window override: 12 h; it does not change normal runtime settings. The additional per-config entry last-N check is off (wf.lastN = 0); configEval still validates configs before seating. Separate post-Base paper Live-entry replay: last 25 closes per config, from 2026-10-09T00:00:00.000Z; see the Live gate section for judged and rejected counts.

| hour (UTC) | candidate pool (pre-validation) | pool Normal | pool Trailing | pool Trailing only | post-Base config-pass instances (hourly; may repeat) | post-gate virtual closes (pre-funding) | virtual Normal | virtual Trailing | virtual Trailing only | virtual Block-raised | virtual Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 00:00 | 447 · 1.26 | 48 · 2.36 | 107 · 1.56 | 99 · 0.83 | 21 · 30.58 | 10 · ∞ (no loss) | – | 2 · ∞ (no loss) | – | 7 · ∞ (no loss) | – |
| 01:00 | 1635 · 0.41 | 230 · 0.92 | 302 · 0.81 | 256 · 0.49 | 71 · 0.51 | 59 · 365.03 | – | 18 · 113.10 | – | 44 · 257.75 | – |
| 02:00 | 1777 · 0.67 | 209 · 0.82 | 357 · 0.97 | 333 · 0.93 | 71 · 0.69 | 44 · 539.72 | – | 18 · 130.32 | – | 39 · 473.70 | – |
| 03:00 | 1067 · 0.39 | 108 · 0.80 | 167 · 0.53 | 213 · 0.96 | 33 · 0.39 | 25 · 40.08 | – | 8 · 5.26 | – | 25 · 40.08 | – |
| 04:00 | 1390 · 0.37 | 224 · 0.81 | 305 · 0.54 | 244 · 0.43 | 54 · 0.23 | 29 · 138.66 | – | 10 · 36.98 | – | 28 · 130.96 | – |
| 05:00 | 1212 · 0.29 | 202 · 0.74 | 211 · 0.52 | 178 · 0.49 | 57 · 0.20 | 32 · 68.69 | – | 8 · 16.20 | – | 32 · 68.69 | – |
| 06:00 | 867 · 0.81 | 165 · 0.99 | 200 · 0.81 | 147 · 0.59 | 36 · 2.33 | 18 · 12777.67 | – | 6 · 2996.25 | – | 18 · 12777.67 | – |
| 07:00 | 1584 · 0.50 | 225 · 0.55 | 379 · 0.49 | 329 · 0.88 | 62 · 0.27 | 39 · 1.46 | – | 18 · 3.75 | – | 39 · 1.46 | – |
| 08:00 | 1253 · 0.60 | 164 · 0.91 | 252 · 0.62 | 242 · 0.39 | 64 · 0.57 | 13 · 0.15 | – | 8 · ∞ (no loss) | – | 13 · 0.15 | – |
| 09:00 | 535 · 1.36 | 75 · 0.59 | 111 · 0.55 | 82 · 0.22 | 28 · 2.45 | – | – | – | – | – | – |
| 10:00 | 743 · 1.40 | 92 · 0.84 | 124 · 0.96 | 160 · 1.85 | 29 · 4.06 | 3 · 0.00 | – | 3 · 0.00 | – | 3 · 0.00 | – |
| 11:00 | 1686 · 1.12 | 236 · 0.76 | 311 · 0.58 | 298 · 0.57 | 69 · 2.90 | 22 · 754.10 | – | 11 · 215.15 | – | 22 · 754.10 | – |
| **total** | **14196 · 0.57** | **1978 · 0.80** | **2826 · 0.65** | **2581 · 0.66** | **595 · 0.54** | **294 · 3.60** | **–** | **110 · 11.01** | **–** | **270 · 3.27** | **–** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Trailing | 110 | 78 / 32 | 11.01 | 11.01 | 9.96 | $0.02 | 70.91 % | 3.00 |
| Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| DCA | 184 | 180 / 4 | 2.91 | 2.91 | 2.84 | $0.01 | 97.83 % | 4.42 |
| Signal · Normal | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Trailing | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| total | 294 | 258 / 36 | 3.60 | 3.60 | 5.36 | $0.03 | 87.76 % | 4.23 |
| of which Block-raised | 270 | 234 / 36 | 3.27 | 3.27 | 5.19 | $0.03 | 86.67 % | 4.23 |
| of which Signals | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| of which Engine (no signals) | 294 | 258 / 36 | 3.60 | 3.60 | 5.36 | $0.03 | 87.76 % | 4.23 |

## Timeframe lanes

| lane | orders | Return PF | cash PF (base $1) | sized $ PF diagnostic | net |
|---|---:|---:|---:|---:|---:|
| 1m | 294 | 3.60 | 3.60 | 5.36 | $0.03 |

A 12 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Minimal | 110 | 78 / 32 | 11.01 | 11.01 | 9.96 | $0.02 | 70.91 % | 3.00 |
| Short | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| General | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Wide | 184 | 180 / 4 | 2.91 | 2.91 | 2.84 | $0.01 | 97.83 % | 4.42 |
| Signals | 0 | 0 / 0 | – | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Wide | 149 | directionValidation 113 · configValidation 31 · symPf 5 |
| Minimal | 111 | directionValidation 100 · configValidation 7 · symPf 4 |

## Base said, the book did — the same ranges on the same basis

The combined account result includes every funded engine and Signal order. For the Base-to-execution benchmark, engine range rows contain only funded orders from Base-qualified pairs whose configs passed post-Base validation; Signals are separately activated, qualified and reported. All PF gates use net returns. Base lists a median gate score across passed pairs on its Base sample; a no-loss Base sample has an exact pooled PF of ∞ and a separate finite gate score. The run PF is on the actual executed order cohort. These samples and reducers differ, so
their difference alone does not establish edge loss or a sizing effect. Cash PF is a separate diagnostic on
the same closed orders as the book's return PF; unequal notionals can change cash PF without changing return PF.

| range | Base passed (median gate score, validation sample) | simulated return PF (run closes) | cash PF (base $1) | sized $ PF diagnostic (same run closes) | orders |
|---|---:|---:|---:|---:|---:|
| Micro | – | – | – | – | 0 |
| Minimal | 2.41 | 11.01 | 11.01 | 9.96 | 110 |
| Short (Base at the default cell) | – | – | – | – | 0 |
| General (Base at the default cell) | – | – | – | – | 0 |
| Long (Base at the default cell) | – | – | – | – | 0 |
| Wide | 1.72 | 2.91 | 2.91 | 2.84 | 184 |
| Signals | – | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (6 of 236 evaluated, 314 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (0 units active at the run start, 0 over the run, 0 of 504 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | trailing | 2 | 0 (0 %) | 222 | 59 % | 0.75 | -17.34 |
| Wide | dca | 4 | 0 (0 %) | 373 | 86 % | 0.51 | -196.98 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | break | 2 | 0 (0 %) | 222 | 59 % | 0.75 | -17.34 |
| Wide | break | 3 | 0 (0 %) | 276 | 86 % | 0.55 | -129.60 |
| Wide | direction | 1 | 0 (0 %) | 97 | 86 % | 0.39 | -67.38 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (12 h) ≥ max(3, 12) closes, positive net, PF ≥ its full indication's range minimum (stage 1.25; general 1.25, long 1.5, micro 1.05, minimal 1.08, short 1.12; full indication-aware Tactic floor 1.1, Short floor 1.1, retaining stricter settings; mixed indication groups can have different minima), drawdown time ≤ min(5.83 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 12 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 5.83 h), drawdown ratio ≤ 1, last 12 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 0 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss uses the runtime's no-loss gate score, not an exact finite ratio).

| range | configs | evaluated | passed | median PF score (evaluated) | median PF score (passed) | DDT limit h (min–max) | closes | net | pf | pre | lcb | lastN | rangeGate | context | ddt | ddr | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no Micro indication in the focus |
| Minimal | 74 | 56 | 2 | 4.00 | 55.81 | 5.83–5.83 (median 5.83) | 54 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18 |  |
| Short | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| General | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Long | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Wide | 240 | 180 | 4 | 4.00 | 4.00 | 5.83–5.83 (median 5.83) | 176 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 60 | 0 |  |
| Signals | 504 | – | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 504 signal tapes, 0 units (pair × symbol × direction) active at the run start, 0 over the run; 0 configs entered while their unit was active — seated per unit and step, not configEval |

## Diagnostic: every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.15 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes. This all-candidate table is diagnostic only: it is not the PF benchmark and does not qualify or dilute the post-Base execution cohort.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | normal | 24 | 5 (21 %) | 1702 | 67 % | 0.80 | -182.90 |
| Minimal | trailing | 24 | 0 (0 %) | 2270 | 55 % | 0.64 | -301.02 |
| Minimal | trailing-only | 26 | 1 (4 %) | 2300 | 56 % | 0.68 | -281.59 |
| Wide | axis | 120 | 10 (8 %) | 1014 | 33 % | 0.25 | -631.42 |
| Wide | dca | 60 | 0 (0 %) | 4336 | 83 % | 0.56 | -2407.64 |
| Wide | dca-active | 60 | 0 (0 %) | 1461 | 33 % | 0.40 | -374.97 |
| Signals | normal | 126 | 9 (7 %) | 276 | 55 % | 0.76 | -24.22 |
| Signals | trailing | 252 | 14 (6 %) | 556 | 50 % | 0.69 | -53.25 |
| Signals | trailing-only | 126 | 3 (2 %) | 281 | 45 % | 0.50 | -37.01 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | break | 2 | 0 (0 %) | 222 | 59 % | 0.75 | -17.34 |
| Wide | break | 3 | 0 (0 %) | 276 | 86 % | 0.55 | -129.60 |
| Wide | direction | 1 | 0 (0 %) | 97 | 86 % | 0.39 | -67.38 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Minimal | follow | r-nr-break-m@m1 | 2 | 0 (0 %) | 222 | 59 % | 0.75 | -17.34 | tp0.8 sl2.4 tr0.4 h960 mn (99 · 0.85 · -4.57) |
| Wide | follow | dir-thrust@m1 | 1 | 0 (0 %) | 97 | 86 % | 0.39 | -67.38 | tp0.5 sl0.54 tr0 h480 dc2s1q0g0.5r2.5m2 dca (97 · 0.39 · -67.38) |
| Wide | follow | r-nr-break-m@m1 | 3 | 0 (0 %) | 276 | 86 % | 0.55 | -129.60 | tp0.81 sl0.84 tr0 h480 dc2s1q0g0.5r2.5m2 dca (69 · 0.61 · -37.29) |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | tp 0.800% | sl 3.00× | tr 0.50× | 1 | 0 (0 %) | 99 | 66 % | 0.85 | -4.57 |
| Minimal | tp 0.800% | sl 1.50× | tr 0.50× | 1 | 0 (0 %) | 123 | 54 % | 0.67 | -12.77 |
| Wide | tp 0.810% | sl 1.04× | tr off | 1 | 0 (0 %) | 69 | 80 % | 0.61 | -37.29 |
| Wide | tp 0.550% | sl 1.07× | tr off | 1 | 0 (0 %) | 101 | 87 % | 0.54 | -44.27 |
| Wide | tp 0.500% | sl 1.08× | tr off | 2 | 0 (0 %) | 203 | 87 % | 0.44 | -115.42 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept before the pre-run range gate, rejected by that gate, eligible after it, dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept before gate | gate rejected | eligible | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| Minimal | normal | 15 (12) | 30 | 24 | 24 | 0 | 24 | 0 | baseRange 4 · baseTarget 2 |
| Minimal | trailing | 15 (12) | 30 | 24 | 24 | 0 | 24 | 0 | baseRange 4 · baseTarget 2 |
| Minimal | trailing-only | 15 (13) | 30 | 26 | 26 | 0 | 26 | 0 | baseRange 4 |
| Wide | axis | 15 (15) | 120 | 120 | 120 | 0 | 120 | 0 | – |
| Wide | dca | 15 (15) | 60 | 60 | 60 | 0 | 60 | 0 | – |
| Wide | dca-active | 15 (15) | 60 | 60 | 60 | 0 | 60 | 0 | – |

Engine indications Base evaluated that built no set: 1527 (act-burst, act-burst-1.5, act-burst-2.5, act-burst-2.5@x4, act-chop, act-chop@x4, act-hf, act-hf-8, act-shift, aroon-14, aroon-25, bb-bounce, bb-bounce-20-2.5, bb-bounce-20-3, bb-bounce-50-2, bb-mid, bb-walk, bb-walk-50, bb-walk@x4, bb-wick, break-atr, break-atr-0.9, break-atr-1.5, break-atr-2, break-atr-2@x4, break-don10, break-don20, break-don40, break-don55, break-fail, break-mc-rel-don-5-dd24-balanced, break-mc-rel-don-5-dd24-guarded, break-mc-rel-don-5-dd48-balanced, break-mc-rel-don-5-dd48-guarded, break-mc-rel-don-5x15-dd24-balanced, break-mc-rel-don-5x15-dd24-guarded, break-mc-rel-don-5x15-dd48-balanced, break-mc-rel-don-5x15-dd48-guarded, break-mc-rel-don8-5-dd24-balanced, break-mc-rel-don8-5-dd24-guarded, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Minimal — every config computed

| stop ÷ target | tp 0.8 % |
|---|---:|
| 1.5× | 0.67 (2301) |
| 3× | 0.81 (1671) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 0.8 % |
|---|---:|
| 1.5× | 0.67 (123) |
| 3× | 0.85 (99) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % |
|---|---:|
| 1.5× | 6.97 (51) |
| 3× | 20.96 (59) |

### Wide — every config computed

| stop ÷ target | tp 0.5 % | tp 0.55 % | tp 0.81 % | tp 1.01 % |
|---|---:|---:|---:|---:|
| 1.02× | – | – | – | 0.64 (1175) |
| 1.04× | – | – | 0.60 (1322) | – |
| 1.07× | – | 0.47 (1599) | – | – |
| 1.08× | 0.39 (2715) | – | – | – |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.5 % | tp 0.55 % | tp 0.81 % | tp 1.01 % |
|---|---:|---:|---:|---:|
| 1.02× | – | – | – | – |
| 1.04× | – | – | 0.61 (69) | – |
| 1.07× | – | 0.54 (101) | – | – |
| 1.08× | 0.44 (203) | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.5 % | tp 0.55 % | tp 0.81 % | tp 1.01 % |
|---|---:|---:|---:|---:|
| 1.02× | – | – | – | – |
| 1.04× | – | – | 3.35 (34) | – |
| 1.07× | – | 2.69 (48) | – | – |
| 1.08× | 2.79 (102) | – | – | – |
