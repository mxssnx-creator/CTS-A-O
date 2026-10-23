# Simulated trading session — 12 symbols, 100 h pre-historic + 12 h run (tactics default, signals on)

Offline replay from the supplied cached candle feed (no market-data requests; original provider not recorded; simulated orders only; no exchange execution proof). Timeframe lanes 1 / 5 / 15 / 30 min set (independent + combined; traded: 5m, 15m, 30m), strategies Normal, Trailing, signals. Configured Signal gate history 100 h; available evaluated prehistory 100 h, short by 0 h; indicator-only warm-up 273 h. The 100 h general engine prehistory is a separate boundary. Balance $10.00; each order volume unit = 0.1 % of the realized account balance at entry ($0.01–$0.01 before volume factors) at 10×; 0.15 % round-trip cost on every close. Window 2026-10-16T21:00 → 2026-10-17T09:00 UTC. Engine Base 52/884 pairs passed; Signals 41/884 representative pairs pass the diagnostic gate (excluded from Base totals) — per range, passed / evaluated pairs · applied Base PF floor and passed-pair PF scores: Wide min PF 1.00 · 0/0 · Micro min PF 1.05 · 0/0 (judged at the default cell — Wide's figures) · Minimal min PF 1.10 · 0/0 (judged at the default cell — Wide's figures) · Short min PF 1.10 · 0/0 (judged at the default cell — Wide's figures) · General min PF 1.20 · 0/0 (judged at the default cell — Wide's figures) · Long min PF 1.30 · 0/0 (judged at the default cell — Wide's figures) · Signals min PF 1.50 · 41/884 · median gate PF score 1.89; Main 0 pairs, 242565 tapes. First simulated step at 2026-10-16T21:00:00.000Z: 0 engine configs selected (Signal activation is separate). Paper selection after compute as of 2026-10-17T09:00:00.000Z: 0 engine configs + 1901 Signal configs (complete paper step). Compute 681 s. The combined account PF includes both Base-qualified engine orders and separately activated Signal orders; the Base-to-execution benchmark is engine-only, and Signal PF is separate. Pre-validation candidate-pool PF is diagnostic. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings))):** balance $10.00 → $10.00 (-0.01 %, closed orders) · equity at end $10.00 (open at end: 3 virtual positions / 17 virtual orders (17 funded), MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF 1.64 · cash PF (base $1) 1.64 · sized $ PF diagnostic 0.68 · 10 closed position episodes / 140 funded orders opened (123 settled, 17 still open) · 123 virtual closes (0 zero allocations) · WR 37.40 % · DDT (closed trades, $) 10.75 h · DDR – (net ≤ 0) · equity max drawdown $0.02 (0.16 %) · margin used max $0.24 · funded open avg 4.08 pos / 38.48 orders (peak 6 / 75)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Configured Signal gate history 100 h; available evaluated prehistory 100 h, short by 0 h; indicator-only warm-up 273 h. The 100 h general engine prehistory is a separate boundary. Missing history is not a pass. Generated candidates use completed entries inside that available Signal history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1.5 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 884 | 254 | 132 | 25050 | 25050 | 25038 | 12 | 0 | 0 |
**Caps:** position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings)) — 0 orders capped to $0, 0 scaled down (open at end: 0 capped, 0 scaled) · binding: position cap 0, gross cap 0. **Without the caps:** balance $10.00 → $10.00 (-0.01 %) · Return PF 1.64 · cash PF (base $1) 1.64 · sized $ PF diagnostic 0.68 · equity at end $10.00 · equity max drawdown $0.02 (0.16 %) · margin used max $0.24.
**Virtual diagnostic:** 123 closes · Return PF 1.64 before funding allocation; 0 zero allocations and 0 unknown allocations. Position episodes and explicitly virtual counts describe the native virtual book. Funded opening/settlement totals and headline occupancy use verified allocations; PF uses funded settled orders.

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
| Signals | 1.96 | 41 of 884 | – | – | 5183 units active | 1.64 | 123 |


### Each range at every step

Per range over the run's 12 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Signals | 242565 | 12 / 12 | 12 | 6 | 36036 | 361 | 140 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 0 / 10 | 4 / 6 | 0.62 | 0.62 | 40 % | -$0.00 | $10.00 | $10.00 | $9.99 | 0.07 % | 0.00 | $0.24 | 5 / 75 |
| 22:00 | 0 / 21 | 9 / 12 | 0.91 | 0.91 | 43 % | -$0.00 | $10.00 | $9.99 | $9.99 | 0.13 % | 1.00 | $0.24 | 5 / 54 |
| 23:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $9.99 | $9.99 | 0.16 % | 2.00 | $0.22 | 5 / 54 |
| 00:00 | 0 / 2 | 0 / 2 | 0.00 | 0.00 | 0 % | -$0.00 | $10.00 | $10.00 | $9.99 | 0.16 % | 3.00 | $0.22 | 6 / 54 |
| 01:00 | 3 / 13 | 1 / 12 | 0.00 | 0.00 | 8 % | -$0.00 | $10.00 | $10.00 | $10.00 | 0.16 % | 4.00 | $0.22 | 3 / 41 |
| 02:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $9.99 | 0.16 % | 0.35 | $0.21 | 3 / 41 |
| 03:00 | 0 / 24 | 0 / 24 | 0.00 | 0.00 | 0 % | -$0.00 | $10.00 | $10.00 | $9.99 | 0.16 % | 1.35 | $0.21 | 6 / 36 |
| 04:00 | 2 / 26 | 25 / 1 | 20.41 | 20.41 | 96 % | $0.00 | $10.00 | $10.00 | $10.00 | 0.16 % | 2.35 | $0.05 | 4 / 28 |
| 05:00 | 0 / 10 | 7 / 3 | 4.02 | 4.02 | 70 % | $0.00 | $10.00 | $10.00 | $10.00 | 0.16 % | 3.35 | $0.03 | 5 / 20 |
| 06:00 | 2 / 3 | 0 / 3 | 0.00 | 0.00 | 0 % | -$0.00 | $10.00 | $10.00 | $10.00 | 0.16 % | 4.35 | $0.03 | 4 / 31 |
| 07:00 | 1 / 14 | 0 / 14 | 0.00 | 0.00 | 0 % | -$0.00 | $10.00 | $10.00 | $10.00 | 0.16 % | 5.35 | $0.03 | 3 / 17 |
| 08:00 | 0 / 0 | 0 / 0 | – | – | – | $0.00 | $10.00 | $10.00 | $10.00 | 0.16 % | 6.35 | $0.02 | 3 / 17 |

**Last hour (08:00):** open at end: 3 virtual positions / 17 virtual orders (17 funded), MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end $10.00 = balance $10.00 + MTM $0.00.

**Hours positive:** 2 of 12 full hours · flat 3 · negative 7

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* and *cash PF (base $1)* use the same canonical unit returns and should match; *sized $ PF diagnostic* = gross realized cash gains ÷ losses on those same orders after actual sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 5m | 15m | 30m |
|---|---:|---:|---:|
| 21:00 | – | 10 · 0.62 · -$0.00 | – |
| 22:00 | – | 21 · 0.91 · -$0.00 | – |
| 23:00 | – | – | – |
| 00:00 | – | 2 · 0.00 · -$0.00 | – |
| 01:00 | – | 11 · 0.00 · -$0.00 | 2 · 0.00 · -$0.00 |
| 02:00 | – | – | – |
| 03:00 | – | 24 · 0.00 · -$0.00 | – |
| 04:00 | 14 · 6.12 · $0.00 | – | 12 · ∞ (no loss) · $0.00 |
| 05:00 | 10 · 4.02 · $0.00 | – | – |
| 06:00 | 1 · 0.00 · -$0.00 | 2 · 0.00 · -$0.00 | – |
| 07:00 | – | – | 14 · 0.00 · -$0.00 |
| 08:00 | – | – | – |

## Hour by hour per type (funded orders · Return PF · WR · net $)

The strategy columns partition funded orders; virtual closes also include zero-allocated closes. *Of which* columns are subsets of the funded orders.

| hour (UTC) | funded orders closed | virtual closes | Normal | Trailing | Trailing only | Signal · Normal | Signal · Trailing | Signal · Trailing only | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 10 | 10 | – | – | – | 1 · ∞ (no loss) · 100 % · $0.00 | 9 · 0.59 · 33 % · -$0.00 | – | – | 10 · 0.62 · 40 % · -$0.00 |
| 22:00 | 21 | 21 | – | – | – | – | 19 · 0.88 · 42 % · -$0.00 | 2 · 1.28 · 50 % · $0.00 | – | 21 · 0.91 · 43 % · -$0.00 |
| 23:00 | 0 | 0 | – | – | – | – | – | – | – | – |
| 00:00 | 2 | 2 | – | – | – | – | 2 · 0.00 · 0 % · -$0.00 | – | – | 2 · 0.00 · 0 % · -$0.00 |
| 01:00 | 13 | 13 | – | – | – | 1 · 0.00 · 0 % · -$0.00 | 12 · 0.00 · 8 % · -$0.00 | – | – | 13 · 0.00 · 8 % · -$0.00 |
| 02:00 | 0 | 0 | – | – | – | – | – | – | – | – |
| 03:00 | 24 | 24 | – | – | – | – | 12 · 0.00 · 0 % · -$0.00 | 12 · 0.00 · 0 % · -$0.00 | 24 · 0.00 · 0 % · -$0.00 | 24 · 0.00 · 0 % · -$0.00 |
| 04:00 | 26 | 26 | – | – | – | 6 · ∞ (no loss) · 100 % · $0.00 | 13 · 10.87 · 92 % · $0.00 | 7 · ∞ (no loss) · 100 % · $0.00 | – | 26 · 20.41 · 96 % · $0.00 |
| 05:00 | 10 | 10 | – | – | – | 3 · 2.15 · 67 % · $0.00 | 3 · 3.86 · 33 % · $0.00 | 4 · ∞ (no loss) · 100 % · $0.00 | – | 10 · 4.02 · 70 % · $0.00 |
| 06:00 | 3 | 3 | – | – | – | 1 · 0.00 · 0 % · -$0.00 | 2 · 0.00 · 0 % · -$0.00 | – | – | 3 · 0.00 · 0 % · -$0.00 |
| 07:00 | 14 | 14 | – | – | – | 2 · 0.00 · 0 % · -$0.00 | 12 · 0.00 · 0 % · -$0.00 | – | – | 14 · 0.00 · 0 % · -$0.00 |
| 08:00 | 0 | 0 | – | – | – | – | – | – | – | – |

## Post-Base paper Live gate

The paper entry stage independently checks each selected config's own last 25 settled post-Base execution closes since 2026-10-16T21:00:00.000Z against the stricter of its range PF floor and the Live PF floor. At the final paper step, 0 config windows had enough closes to be judged: 0 passed and 0 were paused; 0 new entry candidates were rejected by this gate. Exchange closes used: 0. Group last-N: 0.

The hourly order and PF tables above describe the causal walk-forward simulation. They are not rewritten by this later paper-stage gate; this section reports the gate's separate progress and skips.

## Stage funnel, hour by hour (post-gate virtual closes · one-unit PF)

Base (each pair at its default protect and its ranges' cells): 0 engine pairs evaluated, 0 passed (any range); Signal pairs are measured separately. Later stages: *candidate pool* = every config of the Base-passed pairs (242565 tapes; diagnostic, before config validation), Normal / Trailing / Trailing only apart; *post-Base config passes* = 134 distinct configs passed at least one causal config-evaluation step across the window (a config can pass again in a later hour; the hourly row below counts those repeat pass instances). At run start, use the separate config-evaluation denominator/pass count and first simulated-step selection when recorded; the later paper/current selection is a separate snapshot; *post-gate virtual closes* = simulated trades that passed the causal config, coordination, caps and Block gates, before account funding/allocation. This count can include zero-allocated trades; funded settled orders and their PF are reported separately above. One-unit PF is every virtual close normalized to one unit after the 0.15 % cost. Config-evaluation history is 100 h (max of longH and preH); Base history is reported separately. Replay-only selection-window override: 100 h; it does not change normal runtime settings. The additional per-config entry last-N check is off (wf.lastN = 0); configEval still validates configs before seating. Separate post-Base paper Live-entry replay: last 25 closes per config, from 2026-10-16T21:00:00.000Z; see the Live gate section for judged and rejected counts.

| hour (UTC) | candidate pool (pre-validation) | pool Normal | pool Trailing | pool Trailing only | post-Base config-pass instances (hourly; may repeat) | post-gate virtual closes (pre-funding) | virtual Normal | virtual Trailing | virtual Trailing only | virtual Block-raised | virtual Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 6753 · 0.38 | 1522 · 0.43 | 5085 · 0.38 | 146 · 0.01 | 10 · 0.62 | 10 · 0.62 | – | – | – | – | 10 · 0.62 |
| 22:00 | 13489 · 0.07 | 3246 · 0.06 | 10040 · 0.07 | 203 · 0.35 | 21 · 0.91 | 21 · 0.91 | – | – | – | – | 21 · 0.91 |
| 23:00 | 5615 · 0.15 | 1309 · 0.11 | 4121 · 0.17 | 184 · 0.09 | 1 · ∞ (no loss) | – | – | – | – | – | – |
| 00:00 | 5297 · 0.28 | 1107 · 0.17 | 3726 · 0.34 | 453 · 0.22 | 13 · 9.10 | 2 · 0.00 | – | – | – | – | 2 · 0.00 |
| 01:00 | 7854 · 0.36 | 1583 · 0.24 | 5515 · 0.45 | 752 · 0.24 | 17 · 0.03 | 13 · 0.00 | – | – | – | – | 13 · 0.00 |
| 02:00 | 7094 · 0.09 | 1293 · 0.12 | 3750 · 0.13 | 2046 · 0.03 | 5 · 0.47 | – | – | – | – | – | – |
| 03:00 | 14360 · 0.12 | 2595 · 0.19 | 7476 · 0.16 | 4265 · 0.03 | 48 · 9.27 | 24 · 0.00 | – | – | – | 24 · 0.00 | 24 · 0.00 |
| 04:00 | 19388 · 1.19 | 3498 · 0.70 | 11877 · 1.53 | 3990 · 1.07 | 55 · 28.80 | 26 · 20.41 | – | – | – | – | 26 · 20.41 |
| 05:00 | 18710 · 0.91 | 2953 · 0.70 | 10923 · 1.04 | 4822 · 0.84 | 22 · 3.89 | 10 · 4.02 | – | – | – | – | 10 · 4.02 |
| 06:00 | 7537 · 0.29 | 2109 · 0.22 | 4033 · 0.56 | 1393 · 0.06 | 5 · 0.00 | 3 · 0.00 | – | – | – | – | 3 · 0.00 |
| 07:00 | 17045 · 0.26 | 3607 · 0.16 | 9501 · 0.35 | 3936 · 0.18 | 15 · 0.27 | 14 · 0.00 | – | – | – | – | 14 · 0.00 |
| 08:00 | 1927 · 0.18 | 1256 · 0.14 | 569 · 0.67 | 102 · 0.30 | – | – | – | – | – | – | – |
| **total** | **125069 · 0.32** | **26078 · 0.26** | **76616 · 0.42** | **22292 · 0.20** | **212 · 2.99** | **123 · 1.64** | **–** | **–** | **–** | **24 · 0.00** | **123 · 1.64** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Trailing | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Normal | 14 | 9 / 5 | 2.54 | 2.54 | 2.54 | $0.00 | 64.29 % | 6.67 |
| Signal · Trailing | 84 | 25 / 59 | 1.14 | 1.14 | 0.56 | -$0.00 | 29.76 % | 10.75 |
| Signal · Trailing only | 25 | 12 / 13 | 2.83 | 2.83 | 0.38 | -$0.00 | 48.00 % | 10.75 |
| total | 123 | 46 / 77 | 1.64 | 1.64 | 0.68 | -$0.00 | 37.40 % | 10.75 |
| of which Block-raised | 24 | 0 / 24 | 0.00 | 0.00 | 0.00 | -$0.00 | 0.00 % | 11.50 |
| of which Signals | 123 | 46 / 77 | 1.64 | 1.64 | 0.68 | -$0.00 | 37.40 % | 10.75 |
| of which Engine (no signals) | 0 | 0 / 0 | – | – | – | $0.00 | – | – |

## Timeframe lanes

| lane | orders | Return PF | cash PF (base $1) | sized $ PF diagnostic | net |
|---|---:|---:|---:|---:|---:|
| 5m | 25 | 2.78 | 2.78 | 2.78 | $0.00 |
| 15m | 70 | 0.23 | 0.23 | 0.06 | -$0.00 |
| 30m | 28 | 3.80 | 3.80 | 3.80 | $0.00 |

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
| Signals | 123 | 46 / 77 | 1.64 | 1.64 | 0.68 | -$0.00 | 37.40 % | 10.75 |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Signals | 221 | sig:signalValid 144 · sig:signalPf 77 |

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
| Signals | 1.89 | 1.64 | 1.64 | 0.68 | 123 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (0 of 0 evaluated, 0 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (3650 units active at the run start, 5183 over the run, 134 of 242565 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | exit | 26 | 20 (77 %) | 83 | 89 % | 4.71 | 39.62 |
| Signals | normal | 14 | 11 (79 %) | 16 | 69 % | 2.61 | 5.16 |
| Signals | trailing | 68 | 24 (35 %) | 87 | 32 % | 1.25 | 2.42 |
| Signals | trailing-only | 26 | 12 (46 %) | 26 | 46 % | 2.63 | 2.69 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 0.83 |
| Signals | signal:act-hf | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -0.16 |
| Signals | signal:adx | 19 | 14 (74 %) | 68 | 91 % | 6.45 | 34.59 |
| Signals | signal:atr-break | 4 | 1 (25 %) | 4 | 25 % | 4.71 | 1.41 |
| Signals | signal:coordination-band-r75-i1 | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -2.85 |
| Signals | signal:donchian | 1 | 1 (100 %) | 3 | 67 % | 1.55 | 0.90 |
| Signals | signal:heikin-ashi | 19 | 7 (37 %) | 21 | 33 % | 1.32 | 0.75 |
| Signals | signal:hma | 2 | 2 (100 %) | 2 | 100 % | ∞ (no loss) | 0.19 |
| Signals | signal:impulse | 2 | 2 (100 %) | 2 | 100 % | ∞ (no loss) | 0.28 |
| Signals | signal:kama | 3 | 1 (33 %) | 3 | 33 % | 10.44 | 1.48 |
| Signals | signal:macd-cross | 1 | 0 (0 %) | 2 | 50 % | 0.37 | -1.66 |
| Signals | signal:macd-hist | 13 | 5 (38 %) | 22 | 41 % | 0.61 | -0.76 |
| Signals | signal:macd-slow | 14 | 12 (86 %) | 14 | 86 % | 1.79 | 2.12 |
| Signals | signal:r-fakeout | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.80 |
| Signals | signal:r-frama-pullback | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 1.76 |
| Signals | signal:r-klinger | 2 | 2 (100 %) | 4 | 75 % | 44.04 | 2.50 |
| Signals | signal:rsi-mid | 4 | 4 (100 %) | 4 | 100 % | ∞ (no loss) | 1.94 |
| Signals | signal:s2-active-hf | 14 | 10 (71 %) | 24 | 42 % | 3.19 | 6.13 |
| Signals | signal:s2-atr-break | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -0.16 |
| Signals | signal:sar | 2 | 2 (100 %) | 5 | 100 % | ∞ (no loss) | 1.51 |
| Signals | signal:williams-r | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.12 |

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
| Signals | 242565 | – | 3650 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 242565 signal tapes, 3650 units (pair × symbol × direction) active at the run start, 5183 over the run; 134 configs entered while their unit was active — seated per unit and step, not configEval |

## Diagnostic: every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.15 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes. This all-candidate table is diagnostic only: it is not the PF benchmark and does not qualify or dilute the post-Base execution cohort.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | exit | 27 | 20 (74 %) | 83 | 89 % | 4.71 | 39.62 |
| Signals | normal | 53118 | 3198 (6 %) | 26078 | 30 % | 0.26 | -15722.28 |
| Signals | trailing | 136680 | 15207 (11 %) | 76616 | 42 % | 0.42 | -25312.53 |
| Signals | trailing-only | 52740 | 5224 (10 %) | 22292 | 38 % | 0.20 | -18480.87 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | signal:act-burst | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 0.83 |
| Signals | signal:act-hf | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -0.16 |
| Signals | signal:adx | 19 | 14 (74 %) | 68 | 91 % | 6.45 | 34.59 |
| Signals | signal:atr-break | 4 | 1 (25 %) | 4 | 25 % | 4.71 | 1.41 |
| Signals | signal:coordination-band-r75-i1 | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -2.85 |
| Signals | signal:donchian | 1 | 1 (100 %) | 3 | 67 % | 1.55 | 0.90 |
| Signals | signal:heikin-ashi | 19 | 7 (37 %) | 21 | 33 % | 1.32 | 0.75 |
| Signals | signal:hma | 2 | 2 (100 %) | 2 | 100 % | ∞ (no loss) | 0.19 |
| Signals | signal:impulse | 2 | 2 (100 %) | 2 | 100 % | ∞ (no loss) | 0.28 |
| Signals | signal:kama | 3 | 1 (33 %) | 3 | 33 % | 10.44 | 1.48 |
| Signals | signal:macd-cross | 1 | 0 (0 %) | 2 | 50 % | 0.37 | -1.66 |
| Signals | signal:macd-hist | 13 | 5 (38 %) | 22 | 41 % | 0.61 | -0.76 |
| Signals | signal:macd-slow | 14 | 12 (86 %) | 14 | 86 % | 1.79 | 2.12 |
| Signals | signal:r-fakeout | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.80 |
| Signals | signal:r-frama-pullback | 3 | 3 (100 %) | 3 | 100 % | ∞ (no loss) | 1.76 |
| Signals | signal:r-klinger | 2 | 2 (100 %) | 4 | 75 % | 44.04 | 2.50 |
| Signals | signal:rsi-mid | 4 | 4 (100 %) | 4 | 100 % | ∞ (no loss) | 1.94 |
| Signals | signal:s2-active-hf | 14 | 10 (71 %) | 24 | 42 % | 3.19 | 6.13 |
| Signals | signal:s2-atr-break | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -0.16 |
| Signals | signal:sar | 2 | 2 (100 %) | 5 | 100 % | ∞ (no loss) | 1.51 |
| Signals | signal:williams-r | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -0.12 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Signals | 1.1 | 24 | 10 (42 %) | 35 | 49 % | 1.50 | 1.55 |
| Signals | 1.25 | 17 | 7 (41 %) | 24 | 42 % | 1.10 | 0.27 |
| Signals | 1.35 | 14 | 4 (29 %) | 21 | 33 % | 0.51 | -1.27 |
| Signals | 1.5 | 11 | 2 (18 %) | 17 | 24 % | 0.30 | -1.27 |
| Signals | 1.75 | 11 | 2 (18 %) | 17 | 24 % | 0.30 | -1.27 |
| Signals | 2 | 8 | 1 (13 %) | 13 | 23 % | 0.19 | -1.16 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Signals | exit | sig-adx-m@m5 | 13 | 9 (69 %) | 43 | 88 % | 7.55 | 28.11 | – |
| Signals | exit | sig-adx-s@m15 | 6 | 5 (83 %) | 25 | 96 % | 4.14 | 6.48 | tp1.64 sl1.19 tr0 h60 tm3 hxL1 (5 · ∞ (no loss) · 1.71) |
| Signals | follow | sig-s2-active-hf-s@m30 | 7 | 5 (71 %) | 12 | 42 % | 3.19 | 3.06 | – |
| Signals | follow | sig-s2-active-hf-m@m30 | 7 | 5 (71 %) | 12 | 42 % | 3.19 | 3.06 | – |
| Signals | follow | sig-macd-slow-s@m5 | 14 | 12 (86 %) | 14 | 86 % | 1.79 | 2.12 | – |
| Signals | exit | sig-sar-m@m15 | 2 | 2 (100 %) | 5 | 100 % | ∞ (no loss) | 1.51 | – |
| Signals | follow | sig-macd-hist-m@m15 | 13 | 5 (38 %) | 22 | 41 % | 0.61 | -0.76 | – |
| Signals | follow | sig-heikin-ashi-s@m15 | 13 | 5 (38 %) | 15 | 33 % | 0.33 | -1.11 | – |
| Signals | follow | sig-coord-v2-r75-n3-i1-brb7f16q855gqwbnqzfnj@m15 | 24 | 0 (0 %) | 24 | 0 % | 0.00 | -2.85 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 0.000% | sl Infinity× | tr Infinity× | 32 | 17 (53 %) | 52 | 71 % | 4.57 | 10.65 |
| Signals | tp 2.120% | sl 1.00× | tr 0.95× | 6 | 6 (100 %) | 12 | 50 % | 4.46 | 4.16 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| – | | | | | | | | | |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Wide | exit | 7 (7) | 27 | 27 | 27 | 0 | – |

Engine indications Base evaluated that built no set: 0.
