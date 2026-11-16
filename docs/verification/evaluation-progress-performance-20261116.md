# Evaluation, progression and history scheduling — 16 November 2026

The final application source is local `6228046c3e690709804bba2325e7b051b80f7378`
and published `863dda465d7e761d79681eb44add113e3f3206a0`, identical tree
`e5569a467dc5be3bf689bf280d536c343aa8ffc5`. Subsequent evidence commits alter
only documentation. Main before repairs is `f20e07d5aaf400b05a53f64a78ffbb5713c7a0c4`,
retained at `backup/evaluation-progress-start-20261116`. PR #286 contains these
changes. No live engine, monitoring, exchange/account or running service was started.

## Reproduced defects and repairs

- Replacing symbol/direction columns on a tape wrapper retained its stale cached
  ownership. The old owner could still qualify and the new owner could not progress.
  Source-aware indices now invalidate by immutable generation or column identity;
  unregistered getters remain uncached.
- A malformed own timestamp disappeared and exposed older winning closes. Sibling
  symbols diluted the evaluator denominator. Both preserve exact own evidence now;
  unknown chronology remains unavailable.
- Independent long/short/minimal block statistics showed the scalar window instead
  of the actual long-block PF and total requested observations. A regression showed
  PF 0.095238 instead of 12 for the declared long block. Ranking also admitted a
  Main score from a context that failed another required stage; only passing
  contexts now contribute. Explicit external sizing is removed once.
- Full-context evaluation shares validated source reads and indices; summaries avoid
  retained per-context objects. Last-N readiness reads columns once and uses numeric
  context slots. Signal rejection checkpoints yield according to elapsed work.
- Simulation progress shows active work phases without counting internal helper
  checkpoints as completed hours. Completed steps update immediately; the final
  history audit has a separate label. Real reaching 100% does not mean the full
  job is finished.
- The engine entry queue repeatedly reloaded unselected compressed histories each
  minute. It now advances those cursors through the caller-frozen selection interval,
  retaining the boundary for the next selection. No return or accepted trade changes.
  A test reduced first-hour unselected column reads from 240 to 2 and preserved
  240 selected closes, losses and four open marks, including cache eviction.

## Requested comparison against November 14

Compared `codex/complete-strategy-fixtures-20261114` at `ba0d53b5`, merged as
`1cf7742d329e01a0a859bae4c3026da026964468` on November 14 at 23:48 UTC
(November 15 00:48 CET), and preceding main `c699c0108359dcaac5fd729694f6b1082e24a585`, active throughout
November14 CET. Both source states received the synthetic controls.
Main/Real/Entry 40/12/12 and the enabled range Last-75/PF1.35 gate are unchanged.

On a bounded deterministic fixture, November 14 froze a Base-qualified config
out after its initial 11 closes; later completion of Last-12 still admitted zero
entries. The November 15 progression repair and current source admit 15 subsequent
entries at causal clocks, while the losing control admits none. November 14 and
initial baseline both fail replaced-ownership recovery; this release passes it.
These are synthetic controls, not market profitability results.

All 10,733,173 retained candidate rows were scanned with verified sidecar checksums.
The least and most sampled configurations per family/type/range supplied 18 tapes
and 5,184 exact hourly context evaluations. November 14 and final-source gate
verdicts and numeric diagnostics match exactly, with zero passes. This is a
comparison on retained market histories, not a fresh full November 14 candle/tape
builder replay. Maximum own observations are 62, below the unchanged Last-75 gate.

Older Stable-01/02/03 and the October 25 verified checkpoint predate count policy
`140c1d89` (November 11). They cannot supply pooled sibling evidence for current
own-context Last-N rules. The preserved October 25 ordinary checkpoint at
`85bd8196` reports historical PF5.619923 and 5,091/44,623 validated (11.4089%),
later funded settled PF1.336606, 15/4/11 positions and 7,076/4,882/2,194 orders
opened/closed/held, equity drawdown22.5921%. It trades October17, not the current
October16 fixture, and uses different settings/costs. Separate Signal execution
PF0.065995 remains losing. No fresh rerun of that older checkpoint is claimed.

The old selected-config entry loop at `43d31126` helped locate the repeated
unselected-history regression introduced in `32eb9a19`. Baseline profiling attributes
777.722 seconds inclusively to that queue, supporting the targeted scheduling repair.

## Completed 12-symbol / 12h prehistory + 12h native replays

Frozen minute feed SHA256
`4f216ba2a165e29206ad169ad55158dc6914d744e6123afff64c905f0adc94ab`.
Physical/evaluated history: October15 21:00–October16 21:00 UTC; trading09:00–21:00.
Symbols: ADA, APT, ARB, ATOM, AVAX, BCH, BNB, BTC, DOGE, DOT, ETC, ETH (USDT).
No added warmup. Modeled round-trip cost0.176%, charged once.

| Run | Source | Compute s | Peak RSS MB | Loop max ms | Last hourly validated/evaluated | Funded settled PF | Orders opened/settled/held | Integrity |
|---|---|---:|---:|---:|---|---|---|---|
| Unchanged baseline | f20e07d5 | 2640.714 | 2398 | 2462.056 | 0/246345 (0.000%) | unavailable | 0/0/0 | 77/77 |
| Evaluation repairs | 6f89afd3 | 2765.604 | 2555 | 3487.564 | 0/246345 (0.000%) | unavailable | 0/0/0 | 77/77 |
| Ordinary off: Block + Axis | 9414f6a0 | 2822.796 | 2515 | 2269.118 | 0/246345 (0.000%) | unavailable | 0/0/0 | 77/77 |
| Final scheduling repair | 6228046c | 1770.240 | 2244 | 1632.633 | 0/246345 (0.000%) | unavailable | 0/0/0 | 77/77 |

All twelve hourly rows and range/type/sample diagnostics are retained in the
separate HTML/JSON evidence. No funded positions/orders opened, settled or held;
balance/equity remain10, drawdown0. Empty PF is unavailable, not neutral1 or a pass.
The final scheduling run preserves baseline hourly results, candidate chunk hashes,
validation, coverage counts and modeled totals exactly.

Baseline, initial repairs and final scheduling use CPU profiling; the separate
Ordinary-off Block/Axis run does not. Native RSS is decimal MB (bytes/1,000,000). Runs overlap host work, so these are observed
timings, not isolated speedup or live latency guarantees. The independent run uses
progress source9414f6a0/treecdb586d before the later queue optimization, with Ordinary
off, processed-order Block/Block-Active on, all Block relations on and Axis excluded
from Block sizing. This source/config distinction is explicit in its protocol.

Observed final compute decreased2640.714→1770.240 seconds (33.0%), with the
simulation phase2063.090→1107.764 seconds. Queue-inclusive profile time decreased
777.722→189.964 seconds; sampled peak RSS2398→2244MB; cold-loop maximum2462→1633ms.
These overlapping-run observations do not establish a complete warmed500ms cycle.

## Verification

- Final source: 29 targeted cases, zero failures/skips; typecheck and production/core
  worker build pass. The original failures remain in evidence.
- All required CI on863dda46 succeeds: [policy/render43873499977](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/43873499977),
  [integrity43873499876](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/43873499876),
  [strategy43873499889](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/43873499889).
  Policy has679 engine and118 report/provenance passes, no failures/skips.
- Actual runtime stage lifecycle, cancellation, timeout and publication checks pass;
  final labels were rechecked. Dev/production desktop/mobile settings screenshots
  from artifact14228533629 were retrieved and visually inspected; functional settings
  and computed-page interactions pass. These UI checks use an isolated synthetic runtime.
- Count-work synthetic benchmark:750configs ×24contexts ×5decisions. Result hashes
  are identical before/after. Empty histories593.20→23.89ms; four own closes488.22→454.89ms;
  48own closes724.24→697.51ms. The empty-case improvement is not a full-simulation speedup.
- Synthetic warmed mark/protection/publication:200positions p95 1.50ms/max4.90ms;
  20,000positions p95 79.02ms/max86.94ms, scalar parity. Excludes selection, DB,
  network and worker startup; not a complete live-cycle latency measurement.
- Independent Block/Axis positive and losing controls pass for long/short, Shared/
  Additive/Overall and Ordinary off. An empty market execution cohort does not prove
  profitable independent strategy behavior.

## Automatic SL and remaining acceptance

Auto SL construction retains .25–2.5 by.25/fallback1; Micro/Low-Range .2–1.6 by.1/
fallback1; Signal Historic1–2 by1/fallback1. Bounds, finite values, manual overrides,
validation and fallback behavior pass regressions. A fallback is a candidate, not
an admission override. These settings are not a demonstrated economic optimum.

No configured history, PF floor, sample count, fee or custom SL policy was weakened.
Current12+12h evidence does not satisfy the requested positive funded PF/many-orders
acceptance. A complete warmed foreground cycle below500ms, profitable held-out
execution and venue-owned fill reconciliation are not established. Preserve the
separate unfinished funded-stage/venue acceptance in draft#219 and keep live/monitoring
stopped. Source correctness and an empty backtest do not authorize a profitability claim.
