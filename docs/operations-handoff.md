## 2026-10-28 — Validation defaults and preserved prior evidence

Fresh Signal and Exit defaults use Last-12, the partial-sample floor is nine and Base defaults to Last-40. A one-time
transaction backs up saved settings, walk-forward options, presets and cached reports before upgrading undersized
saved samples. It preserves stricter saved choices, retires affected or unidentifiable preset caches and marks their
old PF unavailable. Explicit optional entry filters set to zero remain off. Direct later settings and preset changes
can still select undersized samples; the requested complete Last-N-only policy remains unfinished in draft PR #219.
Historic Exit candidate fitting and holdout, loaded-history retention, live promotion and per-step hold controls
still require further work. No sustained funded PF or exchange-fill PF has been demonstrated.

The cached 2026-10-09 12:00 UTC Low-Range Short screen has 25/90 validated historical contexts at unit PF 2.891881.
Its separate later model has 37 closes at PF 0.963800, with 17/17/0 positions and 37/37/0 orders opened/closed/held.
Those retrospective results are not live qualification rules or exchange fills.

## 2026-10-28 — Bybit cooldown and shared-budget hardening

Bybit rate-limit responses now publish a unique atomic cooldown marker in
addition to the SQLite record. A locked SQLite writer can no longer silently
discard a cooldown: other local clients see the longest marker deadline, even
after a restart, and recheck it before dispatch. The client honors the longest
valid venue reset or Retry-After deadline. If cooldown persistence is entirely
unavailable, the reporting client remains locally blocked and reports failure;
sharing cannot be guaranteed when both local storage mechanisms fail. This
budget covers cooperating processes using the same host and budget path, not
other applications or hosts sharing an IP. Bounded reads retain per-item errors;
uncertain writes are not automatically resubmitted.

The Bybit mocked suite passes 25 tests, including four real worker processes,
SQLite lock contention, restart, cooldown ordering and un-retried writes. The
full Exit Verification workflow for merged PR #217 passed its quality, four
core partitions, slow-runtime and final verification jobs. No exchange account,
venue fill or running deployment was tested or changed. Bybit remains an
unconnected foundation, as described below.

## 2026-10-28 — Bybit V5 foundation, not connected to execution

Added Bybit linear-USDT REST primitives with network-scoped HMAC signing,
paginated contracts and book reads, closed candles, exact tick/quantity steps,
order acknowledgements, per-client-id reconciliation, partial executions and
USDT coin accounting. No acknowledgment is treated as a fill and absent fees
remain unknown. A host-shared SQLite request budget reserves slots for
protection, stops on IP/endpoint cooldowns, and rejects stale queued writes;
bounded read batches retain each error separately. The isolated mocked suite
passes 22 cases. No Bybit network, account, actual order, or fill was tested.

This is a foundation only. `CoreRuntime` and its live executor remain BingX
specific; Bybit is not a selectable connection, market feed or live venue. A
safe completion requires integrating feed/stream, exact owned order journaling,
partial-fill recovery, per-lane TP/SL/trailing and position reconciliation,
then testnet verification. Regional hosts, non-USDT products, venue funding and
full fee accounting are also not implemented. Do not claim Bybit is operational
or enable live trading based on these primitives alone.
Relevant venue contracts: https://bybit-exchange.github.io/docs/v5/guide,
https://bybit-exchange.github.io/docs/v5/rate-limit and
https://bybit-exchange.github.io/docs/v5/order/create-order. Bybit documents
partial success and per-order quota use for linear batch writes; this checkpoint
does not submit batches or assume an all-or-nothing result.

## 2026-10-28 — CI and new rolling-validation instruction

PR #215 merged Base Last-40 and the hold-cell fix. Its CI exposed archived
study and synthetic aggregate fixtures that did not supply Base-40 proof, plus
one lifecycle snapshot whose serialized options predate the new gate. Isolate
the synthetic floor fixtures, retain Base-40 with an explicit two-close sample
in the cell-topology fixture, and freeze the archived Last-15 study and
lifecycle settings; dedicated chronological Base proof tests remain enabled.
These are fixture/protocol corrections, not changed live admission rules. The
latest user instruction is to remove hour/day-based performance qualification
and use the preceding completed Last-N closes for each set. That runtime change
and the requested minimum nine validation closes have not yet been completed.
Historical candles remain necessary for indicators; an offline subsequent replay
was measurement only and is not a live rule.

The post-Base research cohort at 2026-10-09 12:00 UTC was 25/90 contexts
(27.78%) at historical PF 2.891881; its separate modeled 37 closes were PF
0.963800. No venue-fill PF is available. Bybit integration is under development
and is not yet wired to the running executor or proven against an exchange.

## 2026-10-28 — Base Last-40, Validation Last-12 and trailing audit

Base Last-N is now a selectable gate (default 40, 0 off) using each computed
Base cell's own chronological recent closes, with last-N floor and optional loss
prior. Missing, stale, invalid or unordered proof fails closed. Worker, local,
preset and Signal-Exit Base paths receive the proof. Default general seat
validation is Last-12, and the x01 validation floor is 12; stricter explicitly
saved values survive. Signal and Exit overrides retain their own policies, and
this does not establish independent Base-40 evaluation for every ladder or
Signal config. Recompute prior Base proofs rather than translating stale keys.

Trailing-only candidate deduplication now distinguishes minute caps before
lane conversion. A constructed 10/15-minute collision lost the second cell
before the fix and retains both after it; the observed historical PF decline
has not been attributed to this defect. A 122-case focused trailing audit passed
long/short ratchet, TP, stop, gap, tick, restart, Signal, DCA, Axis, Historic
Exit and Paper ownership cases. DCA and managed Axis use their own exits rather
than inheriting the Normal trailing grid.

The most recent bounded 20-symbol Low-Range Short screen applied the production
Base-40 gate to 3,900 candidate histories. At 2026-10-09 12:00 UTC, 45 Base
cells passed and 25/90 direction contexts (27.78%) validated at historical PF
2.891881 over the preceding 24h. Its separate next-24h walk-forward produced
37 unallocated modeled closes at PF 0.963800: 23 Normal at 0.852229 and 14
Trailing at 1.210925. Positions opened/closed/held were 17/17/0 and orders
37/37/0. Close reasons: 16 time, 6 SL, 13 TP and 2 trail. The 74 candidate
screen closes at PF 0.805556 are a different cohort. All 37 selected closes
matched exact validated source tapes; no venue fills or future performance are
proved. Full per-cell, direction, hourly and order listings and source/feed
hashes are in `docs/trailing-audit-20261028/report.html` and `README.md`.

Local targeted suites passed after updating fixtures to supply the new evidence;
the complete inventory run was initiated against intermediate files and exposed
fixture failures that were subsequently rerun and corrected, so it is not a
clean final pass. PR #212 merged the Exit routing and retention fixes; PR #213
merged its worker-fixture correction. Their GitHub checks must be inspected for
final status. This work has not changed a running instance, exchange or host
settings. The requested per-step hold controls and per-config automatic hold
optimization are still outstanding; no tested hold cap demonstrated stable
high forward PF.

## 2026-10-28 — Historic Exit opt-in, exact lanes and held recovery

Historic Exit is disabled by default. A one-time, transactional migration backs
up existing saved settings and disables the running setting; an explicit later
opt-in remains enabled. Saved presets are not rewritten. When enabled, its
source inventory is limited to configured, available entry lanes and their
allowed type/timeframe switches. Each Historic Exit source and config must
still pass its own Base and holdout gates. A held Signal Exit is not used as a
new source merely because it remains held. Normal/Trailing TP, SL and stops
are unchanged.

Two position-retention defects were found. First, Signal-sourced Historic Exit
pairs were moved to the ordinary Signal group before held Exit tapes were built;
the exact Exit tape could disappear when discovery was disabled. Keep those
pairs on the Exit path and rebuild only their held configuration. Second, the
runtime explicitly removed old paper positions with no timeframe suffix. They
now remain in the paper book with their original protection and a reconciliation
warning, while no timeframe, tape, new entry or close is invented. Their original
timeframe and actual venue status remain unknown: retention is not proof of a
venue stop or close. Verify and reconcile those legacy positions before making a
live-execution claim. Full and incremental exact-owner close logic remains in
force for identifiable lanes.

Retrospective Base-40/Validation-12 research, at the 2026-10-09 12:00 UTC
cut using the previous 24h, passed 25/86 direction contexts (29.07%) at
historical PF 2.891881. The separate next-24h walk-forward recorded 37 modeled
closes at PF 0.963800, with positions 17/17/0 and orders 37/37/0
opened/closed/held. This study excludes Historic Exit, is not a live venue
measurement, and does not establish that the source-scope or retention fixes
cause or cure the forward decline. PR #211's Exit verification and Exact Signal
study have both completed successfully. Base Last-N 40, Validation Last-N 12,
per-step hold controls and independent automatic hold optimization remain open.
No running instance, exchange, or saved host settings were modified here.

## 2026-10-28 — Micro hold and exact Base proof checkpoint

A 20-symbol retrospective Micro hold comparison covered 429 scoped Follow
indication/lane pairs, steps 1–4, 1/5/15m lanes and Normal, capped Trailing,
and trailing-only. At a 15m cap, 1/24 direction contexts (4.17%) passed
historical validation at PF 3.3132, followed by four modeled closes at PF
0.4104. At 20m, 17/52 (32.69%) passed at PF 3.3395, followed by 140 closes at
PF 0.4613. At 30m, 22/78 (28.21%) passed at PF 3.6716, followed by 176 closes
at PF 0.5385. At 50m, 27/130 (20.77%) passed at PF 3.8619, followed by 134
closes at PF 0.4408. These are overlapping, unallocated modeled results using
Validation Last-N 15, not venue fills or a fresh holdout. None supports a
profitable default. Positions opened/closed/held were 4/4/0, 20/20/0, 26/26/0
and 29/29/0 respectively; modeled order counts are 4/4/0, 140/140/0,
176/176/0 and 134/134/0.

Exact Base-cell proofs now retain minute caps, use the actual lane hold in
both Base and tape admission, and include independently enabled trailing-only
cells for legacy range sources. Feedback needs its own exact proof and held
unqualified positions stay protected without new admission. Recompute old Base
proofs from the original data on upgrade; old reference-bar keys or cells
measured under a lost minute cap must not be silently translated into proof.
The Base 40 / Validation 12 research screen passed 43/3,900 Base cells and
25/86 (29.07%) historical directions at PF 2.8919; its separate forward
walk-forward modeled 37 closes at PF 0.9638. This Base 40 gate is not yet a
production setting. The requested production Base 40 / Validation 12 defaults,
per-step hold controls and per-config Auto Mode still require implementation and
validation. No live account, deployment or settings changed. Full details,
source/feed seals, per-config rows and close ledgers are in
`docs/micro-step-holds-20261028/README.md`.

## 2026-10-28 — Base 60 / Validation 8, 10, 12 and selector integrity

On the 20-symbol retrospective Low-Range Short 1m/5m/15m cohort, Base passed
47/3,900 cells. For the 2026-10-08 12:00–2026-10-09 12:00 UTC evaluation,
Validation Last-N 8/10/12 passed 18/94 (19.15%), 24/94 (25.53%) and 25/94
(26.60%) direction contexts at historical unit-return PF 2.8663, 3.0102 and
2.8919 respectively. In the subsequent 24-hour unallocated walk-forward,
modeled closes were 31/39/37 at PF 1.0592/0.7929/0.9638; position counts
opened/closed/held were 15/15/0, 18/18/0 and 17/17/0, while order counts were
31/31/0, 39/39/0 and 37/37/0. They are not actual funded or venue results.

This is a research-only Base-60 prefilter after the aggregate Base gate, not
an implemented live Base-60 setting; 38 of 47 passing cells had fewer than
60 closes under warmup. x01 normally floors Validation Last-N to 50 unless the
host explicitly waives it. Normal TP, stop, trailing and hold paths and modeled
one-time costs reconciled against independent OHLC replay for all 213 screen
closes; every 107 walk-forward closes matched an audited screen order and the
source tape. Time exits dominated losses; no consistent-high-PF claim is
supported. `selectAt` and `selectDurable` now honor validated Signal membership,
and `selectFixedGen` invalidates stale cached eligibility after in-place Set
membership changes. These fixes were independently reproduced but were not
shown to cause this particular Low-Range decline. The tested source commit was `8aa066cc840fb24d574bbd73bf2e770ebd385196`,
merged by PR #209 as `bd64e1acdf83b05ef3591615e62906b42fa685bf`; their source
trees are identical. The exact source and feed hashes are in the evidence
protocols. Local typecheck, build, lint (warnings only) and 146 focused tests
passed; GitHub Exact Signal study and Exit verification passed. No live settings
or running instance changed. See `docs/low-range-research-20261027/BASE60-VALIDATION-8-10-12-20261028.md`
for frozen source hashes, detailed reports, tests, limitations and raw ledgers.
Known unresolved: active-position modeled cost changes need entry-time cost
provenance; exchange fees, execution and venue TP/SL were not measured.

## 2026-10-27 — Low-Range progression and independent lanes

The latest audited 20-symbol Short replay on the 5m lane validated
**10,439/14,702 configs (71.00%)**, historical return PF **4.570829** at
2026-10-19 00:00 UTC. Its later modeled settled PF was **0.258533** over
144,863 orders; the account allocation was infeasible for 635 minutes.
The post-hoc balance-capped allocation on the identical virtual cohort had
later modeled PF **0.274964** on 135,811 funded settled orders, seven funded
orders held and no observed margin exceedance; its historical validation is
the same 10,439/14,702 (71.00%) at PF 4.570829.
The separate 15m replay validated **1,047/2,715 (38.56%)**, historical PF
**23.055106**, with later modeled settled PF **0.078848** on 2,156 orders.
These are different 24h retrospective windows and not venue fills. Read
`docs/low-range-research-20261027/PROGRESSION-HANDOFF.md` first for exact
boundaries, source seal, position/order counts, audits, failed attempts and
open release blockers. Low-Range is now registered and opt-in; the earlier
unregistered research description below is retained as historical context.

## 2026-10-27 — Low-Range isolated research; not production-integrated

Source checkpoint `bd20431` froze the 75-candidate Low-Range research module and the
20-symbol, 24-hour protocol. This is **not a registered indication**, Settings feature,
complete runtime test or venue execution, and must not be promoted as one. The
provisional step is the existing fixed 0.20% range reference; modeled round-trip
cost is 0.15%. See `docs/low-range-research-20261027/PROTOCOL-24H.md`.

For the retrospective initial evaluation at **2026-10-09 12:00 UTC**, 4,043 of
140,400 distinct cells passed the Base-style cell gate; **1,139/8,086 (14.09%)**
associated direction contexts passed config validation, at pooled historical
unit-return PF **3.889810**. As a separate coverage denominator, 1,139/280,800
prospective cell-direction contexts is 0.4056%; failed-Base contexts were not
post-Base evaluated. Historical context results overlap.

During **2026-10-09 12:00–2026-10-10 12:00 UTC**, the later dynamically gated,
unallocated candidate tapes settled 17,266 records (15,250 Long / 2,016 Short)
at unit-return PF **0.816072**, with 69 endpoint-open candidate records; 7 of
24 aggregate candidate hours were positive and 17 negative. Records overlap
across configs and cannot be treated as funded orders or account P&L. A weaker
six-hour prototype from the earlier checkpoint has separate evidence and must
not be substituted for this 24-hour result.

The ledger audit checked every cell and unique identity; an independent
selection-clock-only recomputation covered 43 stratified cells. Eleven focused
Low-Range and existing cost/trailing checks passed and TypeScript passed before
the run. The research run took about 238 seconds with sampled peak RSS about
405 MB; this is neither the complete production pipeline nor a foreground-cycle
latency measurement. Its fixed protocol, raw summaries and complete compressed
cell ledger are under `docs/low-range-research-20261027/`. Results do not
establish profitable live settings. Production registration, settings, exact
Base-to-tape/restart integration, complete functional/visual QA, funded replay,
demo and later forward evidence remain open. The normal post-Base reporting
standard in `AGENTS.project.md` continues for every future update.

The step-2 and step-3 15m breakout subgroups were subsequently checked on the
earlier **2026-10-08 12:00–2026-10-09 12:00 UTC** period using a 24-hour
prior evaluation. All **2,925** distinct cells were computed and **0** passed
Base; therefore post-Base validation percentage and PF and later qualifying
candidate PF are unavailable, not 0. The cell ledger audit passed and two
failed-Base cells were independently recomputed without future candles. This
period overlaps the main study's selection history and is not an independent
holdout. See `PROTOCOL-BREAKOUT-CROSSCHECK.md` and `crosscheck-*` evidence.

## 2026-10-27 — Causal entry-stop foundation and Historic Exit restoration

This section preserves the original parallel checkpoint and its own test/result provenance; subsequent integration does not imply production enforcement or a live release.

User confirmed the default limit is **0.75% of the original entry** and wants the separate Exit-lane work combined later. On local branch `feat/relate-max-sl-20261027`, source checkpoint `7d06cb1ad40e4579c0fda1d7c22ce51ada909153` adds an opt-in per-entry stop to the bar simulator. The chosen limit and config × symbol × side × entry owner survive simulated restart, and invalid or crossed-lane saved states fail closed. It handles both directions, ATR resolution, ordinary trailing, early exits, subsequent signals and adverse gap fills without changing the config's target or Historic Exit adaptation anchors. The coordinator does not yet call this API: it is not an enabled Real or live enforcement path. Compact tapes, realtime delta appends and incremental extensions explicitly reject capped entries until their schema can preserve the stop provenance. The prior conservative Relate eligibility guard remains active.

A separate **reproduced simulation-state bug** was fixed: JSON restored Historic Exit position and protection records as disconnected objects, leaving published protection history stale while the position advanced. Restore verifies the two saved copies and reconnects them; contradictory state is rejected. This does not demonstrate the cause of the observed PF drop, nor does it substitute for the parallel chat's Exit-lane and venue ownership changes. The complete remaining integration sequence and [verification details](relate-max-sl-evidence-20261027/CAUSAL-STOP-HANDOFF.md) are saved alongside the earlier study.

At `7d06cb1`, **115 focused checks passed**, including all six stop settings, long/short, modeled gaps, incremental and restart parity, Exit protection, Relate and Micro/Inverse order identity. Changed core modules and their imports passed a scoped typecheck. Full-project typecheck is **incomplete**: one 512 MB heap attempt exhausted its heap and another was stopped by the shared-memory safeguard. There is no new 12-symbol replay, live execution, full build or integration with the parallel branch at this checkpoint. The prior full typecheck and 12-symbol results below belong to `f3d2178`, not `7d06cb1`. Do not merge, push or reload before the requested later combination and the checks described in the handoff.

Unchanged 12-symbol reduced cohort at **2026-10-27 01:00 UTC**: post-Base config PF **3.815123**, **489/1,176 (41.58%)** validated. Subsequent modeled settled PF **1.073082 off / 1.127375 on**, positions **35/23/12** in both arms and orders **8,713/4,976/3,737 off / 8,540/4,816/3,724 on** opened/settled/held. The older Oct 26 14:00 Vienna cohort: post-Base PF **2.877097**, **343/732 (46.86%)**, later modeled settled PF **0.752695**, positions **71/59/12**, orders **9,784/7,785/1,999**. No figures are live fills.

## 2026-10-27 — Relate max SL: partial model guard, not ready for live release

**Integration update:** The source and study described below use `f3d2178`, where Active admission was bypassed for ineligible stops. Subsequent fix `78bfbd3` preserves Active admission for all stops while suppressing raises for ineligible stops. Its passing focused tests do not rerun or revise this older study; the integrated result must be measured independently. This model guard does not establish live stop-loss enforcement.

Local branch `feat/relate-max-sl-20261027`, economic source checkpoint `f3d217869829cf0444703d8d0bfe157875c77860`, adds a Settings value 0.25%–1.5% by 0.25 percentage point, default 0.75%. It only permits a modeled Relate raise when an existing fixed stop is already within the limit; it does not tighten exits. ATR, DCA and Axis cannot receive the raise without proved entry-time/ladder stop paths. Max-stack reservation still applies, and Active skipping is bypassed on ineligible stops. The existing precomputed tape contains exit timing and returns before the Relate decision; changing a paper or native stop alone would leave that tape, re-entry timing and PF false. The final implementation still needs causal replay, captured ownership/partials and native Entries/Overall protection checks. In particular the live minimum stop and venue rounding can widen beyond the limit. Do not push, merge or reload this partial change as completed live protection. The separate Exit-lane work in the parallel checkout was not merged, changed or tested with this branch; combine and retest it later as requested.

The retained [12-symbol 12-hour reduced study](relate-max-sl-evidence-20261027/README.md) uses prior examined candles, 24h history, 0.15% cost, Normal/Trailing only and an uncapped $10,000/$2 account model. At **2026-10-27 01:00 UTC** post-Base config pooled PF was **3.815123** with **489/1,176 (41.58%)** validated; Base accepted **55/134**. Subsequent funded-model settled PF was **1.073082 off** and **1.127375 on**, positions **35/23/12** in both arms, orders **8,713/4,976/3,737 off** and **8,540/4,816/3,724 on** opened/settled/held. The 106 actually raised settled orders had PF **0.161479** and 25 wins. Relate-on settled $2.63 while endpoint held marks were −$56.00. The aggregate difference includes Auto skips and does not demonstrate that raising volume improved performance; this was not a live fill or a fresh holdout.

At `f3d2178`, **589/589 focused tests**, **127/127 synthetic execution/control/accounting/promotion tests** and **4/4 funded-cohort tests** passed, as did typecheck; both session reports passed 68/68 checks plus the independent identity, candle and exact allocation audits. Two aggregate execution-test attempts were stopped by the shared 5.75 GB cgroup safeguard; their unfinished tests are not passes. No post-change production build, exchange execution, 50-symbol run or merged-branch integration is claimed. Both replay arms completed without memory fallback; one cold compute used 20.94/20.60 seconds and 498/476 MB peak RSS off/on.

Unchanged prior comparisons: Oct 26 14:00 Vienna post-Base PF **2.877097**, **343/732 (46.86%)**, then modeled settled PF **0.752695**, positions **71/59/12** and orders **9,784/7,785/1,999** opened/settled/held. Oct 16 23:00 Vienna post-Base PF **3.898302**, **54/168 (32.14%)**, then modeled settled PF **0.260276**, positions **35/29/6** and orders **191/166/25**. Preserve those exact cohort and time distinctions.

## 2026-10-27 — PR 207 merged; release verification and live limits

PR [#207](https://github.com/mxssnx-creator/CTS-A-O/pull/207) merged as `d00b20c56c5d58694e0009eb36b2a1af51814df7`. Its tested head `ba1abbe1c08f63ba21e11a7e0f0fe4a67a7dfc3f` and merge had tree `06fd0e9a89e662b1370d3eeea927407c81901b89`, byte-identical to local source checkpoint `35112f3e5aafd5f2db432b71d279ef13ec149297`. The original 28-commit local history is preserved and checksum-verified on [archive/stability-local-history-20261027](https://github.com/mxssnx-creator/CTS-A-O/tree/archive/stability-local-history-20261027/docs/source-archives/stability-20261027); instructions there restore its original commit IDs. Main before merge is preserved as `backup/main-before-stability-relate-20261027`.

GitHub [Exit verification](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/40575775948) passed: the four core partitions had **3678 passed, zero failed/cancelled and two skipped**; the two separately selected slow-runtime tests passed. The quality job passed typecheck, lint, the production app/worker build, **747 script/browser tests with eight skipped**, and **86 app/component tests**. [Exact Signal study](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/40575776279) passed its offline build and targeted checks; its research and untouched-window jobs were skipped, not passed. These checks supersede the earlier incomplete local full-build attempts, without turning them into passes.

A further final-source 150-hour Last-6 historical replay was stopped by its 5.75 GB cgroup safeguard before a result; Last-4 was not started. Its [receipt](https://github.com/mxssnx-creator/CTS-A-O/blob/archive/stability-local-history-20261027/docs/source-archives/stability-20261027/signal-final-replay-interrupted.json) is retained separately. The earlier completed Last-4/Last-6 comparison remains retrospective, not a final-source rerun or live execution.

The x02 observer's last status was at **17:57 UTC** and it is not confirmed running in this environment. Do not infer the present venue book from that old status or a historical flat read: obtain a fresh signed book, reconcile ownership and protection, and use a supported consistent current database snapshot plus settings backup before any restart or live reload. No live restart or deployment is claimed here. Relate Auto still lacks independent funded-policy feedback, and the Overall live Max-stack ceiling across aggregation, venue rounding and partial fills remains unverified. These are open release limitations, not evidence of a profitable or safe live result.

The unchanged **26 October 13:00 UTC** reduced 12-symbol Micro/Minimal post-Base selection-pool PF was **2.877097**, **343/732 (46.86%)** passing; the subsequent modeled settled PF was **0.752695**, positions **71/59/12**, orders **9784/7785/1999**. The second **16 October 21:00 UTC** 12-symbol cohort had post-Base PF **3.898302**, **54/168 (32.14%)** passing, and subsequent modeled settled PF **0.260276**, positions **35/29/6**, orders **191/166/25**. Count triples are opened / closed or settled / held; neither cohort is a venue-fill result.

## 2026-10-27 — stale market data and entry-clock corrections

Final economic source `02ad0ae9fd6324a5ebeaaba4bf2590ca4bb63796` also makes the three Base range, gate-sensitivity and failure-reason summaries yield through the runtime's existing cancellation-aware scheduler. A CPU profile on an archived synthetic four-symbol run found a 1102 ms main-thread pause in those synchronous diagnostics while Tapes was displayed; this was not the final tape merge. The new pair counters report completed work. A 4097-pair recorded-output test preserves the old summaries exactly, and tests interrupt each new phase by failure, settings change and generation change without publishing incomplete qualifications. The production driver also has event-loop/cancellation integration tests. The affected six-file group passed **127/127**, five Signal runtime/gate files passed **23/23** on `02ad0ae`, and typecheck passed. The Signal runner initially had a local syntax error before the tests started; the corrected runner and its result are retained separately. Results overlap the previously recorded suites, and these are not a full-source repeat of the 150-hour Signal historical comparison.

Three alternating 16,000-pair diagnostic-only runs had maximum timer gaps of **450.75–480.72 ms before**, versus **27.58–29.45 ms after**; all six result hashes matched. The after measurement uses the actual sliced driver but excludes UI progress callbacks. Both attempts to measure the larger processing fixture after the change were interrupted by their memory safeguard, so they are not passing full-workload latency results. The profiles, interrupted receipts, benchmark script and measurements are in `docs/relate-evidence-20261027/base-diagnostics-profile/`.

The same 12-symbol baseline was rerun on `02ad0ae`: all **7785** settled records, **1999** held records and hourly validation arrays matched the original baseline, and portable price, identity and selection audits passed. Compute was **23.36 s**, reported peak **518 MiB RSS**, and event-loop maximum **63.93 ms** in this one reduced offline fixture. The combined cgroup peaked at **5,097,472,000 bytes**. See `docs/relate-evidence-20261027/stability-diagnostic/post-slicing/` for the sealed protocol, run receipt, summary and portable recheck. These are modeled results with caps off, not venue fills, a fresh holdout or a full-grid/live performance guarantee.

Two attempts at the latest production app build reached the memory safeguard at **5,787,869,184** and **5,807,542,272 bytes** while compiling the server; neither is a completed build. The normal worker-packaging command consequently failed because a completed server output was absent. The actual worker bundle was then built and syntax-checked successfully in an isolated dummy server layout; this does not substitute for the complete application build. Its receipt, test receipt and both interrupted build receipts are stored with the diagnostic profile. The earlier production build passed on `38c9c7d`, not the final source. Local generated `.vercel` output is incomplete; no deployment was made.

The **2026-10-26 13:00 UTC** reduced Micro/Minimal post-Base engine selection pool measured **PF 2.877097**, **343/732 (46.86%)** passing. The subsequent **26 October 13:00–27 October 13:00 UTC** Relate-off modeled settled unit-return PF was **0.752695**, with **71/59/12 positions** and **9784/7785/1999 orders** opened/closed-or-settled/held. No venue fills are implied. The full investigation and every post-hoc Last-N, symbol-cap and crowding arm are in `docs/relate-evidence-20261027/stability-diagnostic/README.md` with sealed inputs and portable output. Some symbol caps increased full-window PF but removed many otherwise admitted orders and still lost during the shock; all tested same-onset crowding limits reduced full-window PF. None was promoted.

A second historical 12-symbol Binance USD-M window, **16 October 21:00–17 October 21:00 UTC**, was predeclared after examining the first window. Its post-Base selection-pool PF was **3.898302**, **54/168 (32.14%)** passing at the start; the later Relate-off modeled settled PF was **0.260276**, with **35/29/6 positions** and **191/166/25 orders** opened/closed-or-settled/held. Every one of the ten tested Last-N, per-symbol and same-onset crowding policies had settled PF below 1. The symbol-20 case was **0.271817** on 155 settled orders here, versus **1.259723** on 1398 in the recent window; the periods, two symbols and venues differ, so this is a robustness warning, not a controlled causal attribution. The archived data had been used in earlier Signal studies and is not claimed as a guaranteed unseen holdout. See `docs/relate-evidence-20261027/stability-second-window/README.md`.

Economic source `11451de6afe3639b23859abc4eaaea7cd23f0220` fixes three reproduced runtime defects: a delayed full or fast paper step used its old simulation clock to accept an hours-old new position; loaded startup batches stopped refreshing closed bars during a long compute; and an in-flight candle reply could append to a reset or replaced symbol series. New entries are checked against the current market step both on collection and immediately before admission, while held positions and offline/synthetic clocks retain their own behavior. Loaded live batches poll during compute with the existing request pacing, but not during backfill, universe reset or replay; old requests are rejected if the universe or series changed. The corresponding tests failed on their parents and pass after the fixes.

The **42-test** focused market/replay/clock/serial group and a separate 61-test paper/promotion/Relate/atomic-publication group passed with `11451de` runtime code, as did typecheck and production build (database migration explicitly skipped because `DATABASE_URL` was absent). A later **654-test** run over 19 order, control, partial, sizing, lane and lifecycle files passed with the runtime fixes and the disabled diagnostic patch present. A synthetic 50-symbol partial-batch refresh checked each symbol once, with at most two concurrent mocked requests and no duplicated requests; this is not an exchange latency or 50-symbol live test. A further five fast-entry and incremental-cycle integration tests passed on the same runtime code, comparing **552 tape states and 3497 open positions** against a full recompute. One synthetic cold compute in that group recorded **506 ms** maximum event-loop lag; it does not establish the under-500 ms target. ESLint reported no errors and five existing unused-import warnings. The 65-file simulation suite passed **952/952** on the corrected runtime, with peak combined cgroup use **5,865,009,152 bytes**; another synthetic compute in that suite recorded **1526 ms** maximum loop lag in Tapes. Groups overlap; no latest-source full-suite pass is claimed. The earlier full-suite attempt on `704fcf8` had **1053 passes, zero ordinary test failures and 214 cancellations** after its memory safeguard stopped it at 6,221,651,968 cgroup bytes. The later test cancellation is not a passing full suite. Watchdog receipts are retained in the evidence folder.

An independent rerun on `11451de` matched all **7785** prior baseline settled order records, **1999** held records and hourly validation arrays; [post-fix evidence](relate-evidence-20261027/stability-diagnostic/post-fix/) preserves its protocol, raw output, hashes and audit. The reduced 12-symbol compute took **26.18 s**, with reported peak **466 MiB RSS** and **44 ms** event-loop maximum; this is not the full grid or a warmed live-cycle guarantee. A separately sampled stall-probe attempt was stopped by its watchdog at **5,760,098,304 bytes** before completing. The earlier synthetic full compute still reached 1116–1297 ms maximum event-loop lag, so the 500 ms target remains unproven.

A later isolated stall-probe run completed and caught an **1185 ms** Tapes-stage pause. Its recorded **150 ms** main-thread CPU covered only the period after the one-second probe threshold, and the old rule labeled runnable samples as `js` without requiring sufficient CPU. That attribution is invalid; the cause remains unknown. The diagnostic now saves an approximate CPU baseline near the last heartbeat and requires sufficient measured CPU before assigning `js`; a late watchdog sample may still undercount and remains `unknown`. The two new regressions failed on the old implementation and passed after the fix, and the complete seven-test stall-probe group passed. See `tape-probe-final.json` and its watchdog receipt; no speed improvement is claimed from fixing the diagnostic.

The corrected probe was then rerun at its normal **1000 ms** threshold on source `38c9c7d`: one synthetic test passed, the maximum recorded loop delay was **968 ms**, and no stall met the probe threshold. A second isolated-source run lowered only the opt-in probe threshold to **500 ms**. It passed and captured a **1007 ms** Tapes-stage pause with approximately **960 ms** of main-thread CPU; measured final worker-reply retain and merge slices were about **3.1 ms** and **2.4 ms**. The probe cannot identify a particular JavaScript or native function, and the lack of a reported GC event does not prove GC was absent. These are synthetic four-symbol results, not a live-cycle guarantee; the 500 ms target remains unmet. The separate source-copy patch and receipts are recorded in `tape-probe-500.json`.

A signed **bingx-vst-02** demo-book read at **2026-10-27 17:04:26 UTC** showed **0 venue positions and 0 open orders**. At **17:56:04 UTC**, the headless observer had **13/50 symbols**, Base **27.17%**, no completed compute, paper step, paper position, ledger order or filled entry. It still runs the frozen **`9b78b29`** source; none of the later speed or stale-data fixes is active there. A separate shell can read its status but cannot signal its process from this PID namespace (`ESRCH`); no current supported database snapshot was obtained and it was not restarted. Before any later restart, obtain a fresh signed book, reconcile owned/in-flight orders and protective stops, wait for live work, and take the supported consistent snapshot plus settings backup. Do not treat the older preflight snapshot as current, and do not touch foreign positions. Temporary credential copies used for the read were removed. Process survival after this environment ends is not guaranteed.

The full-grid replay remains incomplete after its memory-watchdog stop, no actual demo fills or browser test are available, and Overall live per-parent Relate Max stack across venue rounding, partials and aggregation is still not proved. Relate Auto's current unit-PF scoring does not provide the requested independent causal funded-feedback ratio optimization. Continue those separately; do not claim guaranteed stable or profitable performance from an examined 24-hour sample.

## 2026-10-27 — Progress coverage and order identity work in progress

The 2026-10-26 13:00 UTC reduced-cohort post-Base engine validation PF remains **2.877097**, **343/732 (46.86%)**; subsequent modeled Relate-off settled PF for 2026-10-26 13:00–2026-10-27 13:00 UTC is **0.752695**, with **71/59/12 positions** and **9784/7785/1999 orders** opened/closed-or-settled/held. These are separate historical samples, not venue fills. Across the 23 overlapping modeled comparison arms, the new `scripts/audit-modeled-orders.mjs` independently finds no repeated full config/symbol/side/onset, canonical entry collision, repeated closed event, invalid identity or unknown settled return; its 222,398 rows are repeated comparison-arm observations, not independent executions. The off arm has 574 configurations, 5323 Normal and 4461 Trailing orders, and 552 shared symbol/side/onset groups (maximum 106 distinct configurations at one onset). DCA, Axis and Historic Exit were off for that replay. See `docs/relate-evidence-20261027/order-identity-audit.json` and the report. Actual fill ownership, funding and economic quality are separate questions.

Progress and Stage pages now display the **last completed** cohort's Normal, Trailing, DCA, DCA Active, Axis and Historic Exit tape counts, split into engine and Signals with held-only and carried provenance; it is explicitly unavailable before a completed compute. Block and Relate are adjustments, not tape kinds. Counts do not establish validation, funding or venue execution. The counters publish atomically with the matching simulation and remain unchanged on failure or supersession. The 128-toggle synthetic matrix passed with DCA/Axis independent of Normal/Trailing, and compares the published per-kind counts to the actual tapes; it uses a representative grid and is not complete production-grid performance evidence.

Worker tape replies are now interned and restored to their original pair order in bounded yielding slices. A 18000-tape, 360000-open/36000-pending synthetic merge benchmark preserved the exact digest; two runs showed 47–50 ms maximum timer gaps before and 18–29 ms after, with total merge wall time 43–46 ms versus 64–72 ms and sampled RSS 115 MiB versus 117–130 MiB. This isolated benchmark is not a live guarantee. A separate cold synthetic compute still recorded **1297 ms** event-loop lag, including a **1241 ms** Tapes-stage recent lag, so the <500 ms goal remains unproven. The worker phase now reports measured reply-retain and merge slices rather than a fabricated zero; worker-message delivery/deserialization is outside those direct slice metrics and the stall probe remains necessary.

A second instrumented synthetic cold compute finished in 134.2 seconds with **1116 ms** maximum loop lag and **1076 ms** recent Tapes-stage lag. Its measured final strategy-tape reply/merge slice was **3.15 ms**, the longest individual retain rounded below 1 ms and merge was **1.58 ms**; message delivery and other stage work remain outside those measurements. The sampling probe was not enabled in that run, so the stall's root cause remains unknown. The target remains unmet.

Relate Auto now folds ratios dominated by the unchanged unit-return-PF tie break. The optimized decision exactly matched checkpoint `9b78b29` on 1000 varied histories (517 produced choices), including missing/extreme returns; an independent scalar oracle checked the full ratio/step/Active grid on multiple caps and an overflow boundary. Three alternating 50-symbol synthetic runs reduced median update-and-decision time from **2.038–2.280 ms** to **0.157–0.167 ms**, with p95 **2.384–2.644 ms** versus **0.403–1.035 ms**; see `relate-auto-fold-benchmark.json`. This is local function timing on a shared host, not a live-cycle guarantee or the requested causal funded-feedback optimizer. The running demo uses the older frozen `9b78b29` source and has not been reloaded for this optimization.

Current scoped verification: the offline order/control/Relate/accounting group passed **285** tests; the separate order identity, hedge/one-way, lane-order and incremental group passed **181** tests; the representative strategy matrix passed all **128 toggle combinations**; the indication, Signal, Micro, Axis, range and Historic Exit group passed **159** tests. The Signal-history matrix now includes the current **150h** default on both local and worker runtime paths and passed **59** tests. These groups overlap and do not establish unobserved live or full-grid coverage. The coverage/publication/worker focused groups, the rendered coverage table checks, typecheck and production build passed; scoped lint has no errors and five existing unused-import warnings in `runtime.server.ts`. Chromium is unavailable locally, so no browser pass is claimed.

The v7 full-grid historical retry was stopped by its own memory watchdog at **2026-10-27 16:06:52 UTC**, with combined cgroup peak **6,250,213,376 bytes** and last recorded Tapes progress **39%**. No full-grid PF, completed coverage or pass result exists. The previous x02 observer was no longer running at the next check; its last recorded observation was 15:55 UTC, with 13/50 symbols, zero completed computes, paper steps, live ledger orders or filled entries. A fresh signed x02 demo-book read at **16:10 UTC** showed zero positions and zero orders. Saved state and the last preflight SQLite snapshot were backed up, but no later runtime snapshot was present, so the stopped process's in-memory state cannot be recovered from that backup. Recheck the venue book immediately before any restart; never imply current live parity or fills.

The isolated x02 demo observer restarted at **16:23 UTC** after a fresh signed flat-book preflight and a new settings/consistent SQLite snapshot, with 50 symbols requested and Relate Auto enabled. The observer uses a frozen export of commit `9b78b29`, not the subsequent Auto optimization. At **16:28 UTC**, its status reported the first 13 symbols loaded, Base about 7.5%, zero completed computes, paper steps, paper positions, recorded live orders or fills. It remains a headless scratch process with no hosted UI or verified execution PF; process survival is not guaranteed. Observer state is in `/workspace/scratch/1acb10a11301/relate-study-20261027/x02-runtime/status-progress.json`; preserve the existing explicit Overall Relate Max-stack caveat and reconcile owned activity/protection before any restart or source reload. Credentials are never committed.

After the Auto optimization, **107** focused Relate, admission, audit and realtime tests passed; the additional full-grid scalar oracle and overflow cases pass, typecheck and production build pass, and scoped lint reports no errors. These checks do not resolve the modeled-versus-live Overall Max-stack boundary or prove positive forward performance.

## 2026-10-27 — Relate and x02 demo work in progress

Local implementation checkpoint `d0237255b9a9e44e94bf33e26a95b26cfde0ec13`, parent `4e91e0b568d5461a44dbd2f36562e6d044b2aee8`, branch `fix/session-replay-window-precedence-20261026`; this is a **work-in-progress checkpoint, not a release**. Preserve all existing working-tree changes and the unresolved boundaries below. Relate defaults off, Auto on when enabled; the 250-close window requires at least 60 known accepted closes. Ratio, steps, Active threshold, independent relations, Shared/Additive stacking, capped external factors, captured entry provenance and shadow-only Active progression are implemented. Paper selection now reports a separately labeled post-Base validation summary; a frozen running process does not yet contain that final display change.

The reproducible **reduced Micro/Minimal** 12-symbol study is `docs/relate-evidence-20261027/REPORT.md`. Its post-Base engine selection-pool PF at **2026-10-26 13:00 UTC** was **2.877097**, with **343/732 (46.86%)** evaluated configs validated. The subsequent **2026-10-26 13:00–2026-10-27 13:00 UTC** modeled Relate-off settled return PF was **0.752695**, with **71/59/12 positions** and **9784/7785/1999 orders** opened/closed-or-settled/held. The all-relation Auto arm had settled return PF **0.568415**, **71/59/12 positions** and **7150/5676/1474 orders**. This retrospective, account-cap-disabled diagnostic is not actual execution or a profitable recommendation. Manual and highest-step results, sources, settings, samples and the 23-arm report checks remain in the report. The smaller focused Last-4 versus Last-6 Signal checks on this recent window produced no active contexts or settled orders; both execution PFs for that window are unavailable.

The historical Relate study's source was reconstructed from the saved overlay on `d0237255b9a9e44e94bf33e26a95b26cfde0ec13`; its 162-file economic inventory exactly matched `e0e8636c4fae198d17a85dad040c55ffb3c5637a584eaacf0b62a6a91e3b89cb`. The repeat matched the original baseline digest and all 23 arms' trade, open-order, validation, per-range step and skip arrays. Instructions and `reproduction-verification.json` are in the report. This is repeatability on the already examined feed, not a new holdout or latest-source live result.

The separate post-hoc allocation sensitivity applied 0.2× position and 1× gross-exposure caps to those existing streams. The all-relations 2.6-ratio/5-step arm had modeled settled return PF **1.005802**, sized-dollar PF **1.061101**, **75/63/12 positions** and **7426/5916/1510 orders**; 1,869 settled and 489 held candidate orders received zero allocation. This is **not** a causal funded-feedback simulation: removed/scaled orders still influenced the original Relate decisions. The Relate-off arm under those caps remained return PF **0.752695** with **71/59/12 positions** and **9784/7785/1999 orders**. Four arm reports passed 67/67 consistency checks; the receipt and exact caveats are in `allocation-sensitivity.json` and `REPORT.md`. Do not promote the high-ratio result without an independent causal rerun and holdout.

A separate retrospective Signal comparison on **2026-10-16 21:00–2026-10-17 21:00 UTC** used 12 archived Binance USD-M symbols, 150h Signal prehistory, 103 enabled sources, 1m/5m lanes and reduced protection grids; the representative Signal Base gate was disabled. Last-4 at the start validated **195/79,104 (0.2465%)** exact config × symbol × direction contexts with pooled qualified-history PF **2.596721**; Last-6 validated **174/79,104 (0.2200%)**, PF **2.595649**. Later modeled settled unit PFs were **0.248539** with **4/4/0 positions and 24/24/0 orders**, versus **0.693775** with **5/5/0 positions and 21/21/0 orders**, respectively. Both lost money, the 21–24 order samples overlap, and this already-examined window is not a holdout or proof of a positive setting. Each full-history rerun passed 56/56 report checks; its complete configured 3,296-tape Signal grid passed 1,977,600 exact hourly scalar comparisons, with no missing cells, memory fallback or abort. The `REPORT.md`, `signal-last4-last6.json`, settings, frozen protocols and compressed per-config and grouped audits retain the evidence. Corrected-source economic inventory SHA `0571cd00f5a1d9d3488c17ec336c618ac9c79872d3970fe4005c171fe0fd5f2b`, archived input SHA `e21d39b0b7583685e2fe355f6261e0860deff3057ca5c81b43a6c3cf374e2f03`.

A separate full default-grid 12-symbol run completed tape construction but timed out after 20 minutes at Real step 0/24, with zero completed computes. Its failure is retained at `/workspace/scratch/1acb10a11301/relate-study-20261027/full-grid.log`; it produced no valid full-grid PF or coverage result. Four superseded full-core runs were deliberately interrupted when the source changed; one found a stale Active-boundary fixture, which now passes with the other 324 Settings completeness checks. The fourth was stopped when the DCA/Axis audit discrepancy below was found. The full-core run completed against source inventory SHA-256 `58b0de7934a817f0b10135214f268d50620696584fdedffe810486aa027837f0` (`src` and `scripts`, manifest in the study directory): **3,639 passed, 2 skipped, 0 failed** across 292 files, `full-core-sealed-v5.log`, duration about 36.6 minutes. The modeled-ladder correction passed 168 focused Relate/live/admission/DCA/Axis tests, including Micro/Minimal paper and walk-forward cap checks; a subsequent 65-test run also checks the maximum real Axis ladder. Worker-focused checks passed 25/25 and 36/36; session/accounting/Signal-audit scripts passed 62/62; app/components passed 86/86. Final-source typecheck and production build pass, and project-wide lint reports zero errors and 42 warnings. The separate scripts stage recorded 731 passes and eight skips, but four browser cases were cancelled because Chromium is unavailable; no browser pass is claimed.

Base workers now refresh their inactivity timeout only when valid progress advances, with an independent one-hour hard deadline per part. A Base worker timeout aborts that compute instead of retrying the full job on the live event loop; the previous published cohort remains. This addresses a suspected source of cold-start stalls, not a measured improvement on x02: its running frozen process predates this fix. Its 30-second status timer had a maximum observed gap of 78.6 seconds in the early startup sample, which is not a measurement of warmed live tick latency.

The corrected-source core suite's large synthetic cold compute logged a worst tape-building slice of **1,139 ms** during one concurrent run. It is not a warmed production cycle measurement, but it does not meet the 500 ms target and needs profiling. One candidate for inspection is the unsliced `tapesFor` reply interning/bucket pass in `runtime.server.ts`; native structured-clone delivery and other slices are also possible causes, so no root cause or improvement is claimed yet. Do not infer a foreground speed guarantee from the standalone Relate adjustment benchmark.

The Real-stage audit now uses the same entry-time reserved ceiling as the DCA and Axis simulator, and separately checks the complete modeled volume including filled ladder weight. Previously it expected the unreserved ceiling and could reject correct ladder entries; it also checked only external multipliers and could miss an excessive filled weight. The new regression reproduced failures for both DCA and Axis before the fix; afterward 117 focused audit, Relate, realtime and Axis cases passed, including corrupted/unknown volume checks. Both Signal full-history reruns on the corrected source reproduced their earlier report totals and every hourly exact-context result; the original and corrected source seals and audits are preserved.

The full-grid historical study was retried on the then-current source in `/workspace/scratch/1acb10a11301/relate-study-20261027/full-grid-retry-v3/`, with two workers, lower scheduling priority, a 60-minute compute deadline, and a separate watchdog that stops only its own replay child if cgroup memory rises above 6.2 GB. At **2026-10-27 14:37:42 UTC** the combined cgroup reached **6.220 GB** during concurrent core tests, x02 and short allocation replays; the watchdog stopped this run during tape construction, last logged at **18%**, with zero completed computes. It has no full-grid PF, validated coverage or complete speed result. The command, guard, terminal receipt and logs are retained in `full-grid-watchdog.mjs` and `full-grid-retry-v3/` in the study directory. After the core suite completed, an isolated retry was briefly started in `full-grid-retry-v5/` and deliberately stopped before completing Base so that the two separately designated slow core cases could run without competing for memory. The two slow cases subsequently passed (stress and preset backtest, `full-core-slow-v5.log`; peak combined cgroup about 3.73 GB, watchdog did not stop them). An isolated two-worker retry in `full-grid-retry-v6/` was stopped by the same watchdog at **2026-10-27 15:47 UTC** after combined cgroup memory reached **6.245 GB**; its last logged tape progress was **43%**, with no completed compute. A further guarded retry was running at **15:52 UTC** in `full-grid-retry-v7/`, last logged at **6%** tape construction, with one worker, a 16 MiB in-memory history budget and lossless disk spill, and a 90-minute launcher deadline; gates, full history and data window are unchanged. Only report results if that replay completes and its memory and coverage evidence is verified.

`full-grid-report-watch.mjs` watches only that offline retry: after a successful terminal receipt it renders the report under its own memory and time limits, or records an incomplete state after a failed run. Its success path was checked against the saved off-baseline raw stream and reproduced the expected PF, and its failure path refused to render a failed fixture. A rendered report still requires a human/agent review of its checks, memory coverage, cohorts and clock before it is claimed; process survival beyond this environment is not guaranteed.

An isolated **bingx-vst-02** demo engine was started with 50 requested symbols and Relate Auto enabled, using its own credentials and no synthetic promotion evidence. The signed preflight at **2026-10-27 13:36 UTC** showed zero venue positions and orders; the project database was consistently snapshotted and isolated settings persisted before start. Another signed book read at **15:50 UTC** was flat (0 positions, 0 orders). At **15:52 UTC**, 13/50 symbols were loaded, the first Base pass was unfinished, and no paper steps, paper positions, live ledger orders or filled entries had been recorded. This is a headless test on frozen source `139a258e90bf2ae7c47ed549eded81b3c1bb3c32317c29cc6f6a6838f30bda06`, which predates the modeled-ladder, worker-timeout and progress changes; it is not a hosted deployment, completed 50-symbol test or latest UI. Status is in `/workspace/scratch/1acb10a11301/relate-study-20261027/x02-runtime/status.json`; always re-read the signed venue book, reconcile owned orders/protections and take a supported consistent database snapshot plus settings backup before any restart. Never commit the credentials or account records.

The temporary on-disk credential copy was removed after the last signed read; the running isolated process already holds its own credentials in memory. A future independent signed read must securely reacquire the credentials. The signed 15:50 book result is a point-in-time observation, not a guarantee of the later venue state.

**Known unresolved correctness boundary:** Newly admitted modeled DCA and Axis positions now reserve the possible ladder weight at entry, so supported ladders fit Max stack without using future fill knowledge; this can conservatively undersize their first leg. Previously held entries retain their captured multiplier. Entries mode separately rechecks its captured ceiling after venue rounding, but Overall live aggregation, risk sizing and venue minimums do **not** yet guarantee the same per-position ceiling. Do not call this a complete exchange cap, promote this change, or claim simulated/live volume parity until per-position aggregate/partial execution and reconciliation are implemented and tested. The Settings hint discloses this Overall limitation. Auto currently scores unit-return PF/positive rate, which cannot distinguish ratios or step depths for the same Active subset: ties favor ratio 0.2 and the configured steps. Hypothetical sized PF is diagnostic only, not a tested optimizer. The Settings hint and research report disclose this limit; full per-candidate causal allocation validation remains future work. Full-grid performance, actual demo fills and positive held-out execution remain unproven.

Next implementation work: persist each live parent's original base and captured stack ceiling at first adoption, retain that provenance through settings edits/restarts and partial exits, and attribute aggregated quantities consistently across hedged/one-way, risk and minimum-lane sizing. A new or increased venue order must remain within each applicable parent ceiling after lot/minimum rounding and pending-fill reconciliation; unknown legacy provenance must remain unknown while held positions keep protective management. Test multiple parents sharing a symbol/direction, opposite directions, minimum raises, partial fills/exits, delayed acknowledgments, reload and concurrent account-cap changes with an independent exchange ledger. For Auto, compare candidate policies on independent causal admission/funding histories and a separate holdout while retaining return-based PF as the primary gate; do not use a post-hoc sized PF as though it were that result. Repeat the small source-sealed Signal audit if core economic files change.

## 2026-10-25 — paired trailing retest complete; replay deadlines fixed

Both gap-half windows completed native69/69 checks and coverage/export/admission audits. Endpoint exact-context post-Base PF4.613320 /4.498920, validated0.283409%(4100/1446672) /0.339581%(4911/1446192). Separate settled funded PF8.381491 /0.052474. UTC windows Oct16 21:00–Oct17 09:00 and Oct17 09:00–21:00. Positions14/5/9 and5/2/3;orders229/160/69 and813/121/692 (opened/closed-or-settled/held). Full hourly results and source seals: docs/signal-pf-drop-20261025. No defaults promoted: later-window PF worsens versus control0.065995. Diagnostic reused windows are not holdout proof.

Broad old ordinary offset0 cases (micro1 and1.5) failed after the outer3h timeout, retaining run logs/artifacts12616647706/12616881270; their PF and validation are unavailable. Found core-session ignored its own deadline with zero computes and could publish stale partial results with an earlier compute. Fix rejects both cases, rejects stale Paper output, validates finite positive deadlines, and disposes runtime/timers/pool on failures as well as success. Local45/45 report/deadline regressions pass, including offline child process termination and no successful dump. This does not solve the underlying heavy ordinary computation. Later-window old workflow jobs need checking. No X02 or50-symbol trade run yet;50-symbol market data is prepared. Baseline branch remains5121115.

## 2026-10-25 — verified breakpoint merged; PF-drop investigation continuing

PR205 merged as92d6836a102db836d87fd72e30a11a4d6c829c4f. Exact tested head85bd819 and all seven CI40238823849 jobs pass;4,390 tests,zero failures,eight template skips,two slow exclusions verified separately. Local41 report checks,80/80 replay checks,29 identical hydrated session fields and266 hourly/group percentage assertions over10 older audited cases pass. Named breakpoint documentation: docs/breakpoints/verified-20261025. Main refreshed; no live deployment or X02 change. The checkpoint is software/reporting stability, not financial stability.

Always show post-Base PF and validated percentage in chat: ordinary startPF5.619923,11.4089%(5091/44623 evaluated),settledPF1.336606; Signals endpointPF4.608184,0.3773%(11436/3030936 exact contexts),settledPF0.065995. Positions15/4/11 and4/2/2;orders7076/4882/2194 and863/280/583. Opened/closed-or-settled/held. Preserve the original failing Signal report and its unchanged-raw corrected report separately.

User's latest task continues beyond the breakpoint: diagnose the validation-to-settlement PF drop, adjust configs and retest, retaining this baseline. New exact-funded-entry trace on frozen9b8 source:280/280 settled Signal orders passed own config and Last-N at entry;273/280 wereADA shorts(PF0.046633),214 entered15:50UTC.128 trailing closes were gross-positive but net-negative after0.15% cost. No invalid funded admission found in that cohort. Configuration-only gap-half experiment is frozen on source2cc4c0b4a8ecdb4343a1401527f75b5373e052085123f361e85f6d42e1c04cae in CTS-A-O-fifty/runs/signal-gap-study-20261025; gap-half-12 started, gap-half-0 awaits it. Do not edit its economic source until native/audits complete. No experimental defaults promoted.

50-symbol data preparation pushed as885b8af on feat/fifty-symbol-study-20261025:600/600 archives,864000minute bars,zero errors; archive libfile_4acf29eb0904819197974c394ea5face. Data-only; no50-symbol trade run yet. Broad old-source ordinary workflow40226266532 still running/queued. Continue both modes/all configured types, held-out50-symbol tests, fractional Exit and minute per-leg equity work. X02 remains unstarted under the user's prior stability condition; reconcile and back up before any live reload.

## 2026-10-25 — mandatory PF / validation percentage reporting

User requires every chat and information update to show post-Base return PF and validated percentage, with passed/evaluated counts, timestamp/window and cohort. Persisted in AGENTS.project.md for subsequent project chats. Ordinary EMA start validation PF5.619923,11.4089% (5091/44623 evaluated); later settled PF1.336606, positions15/4/11,orders7076/4882/2194. Signals endpoint validation PF4.608184,0.3773% (11436/3030936 exact contexts), later settled PF0.065995,positions4/2/2,orders863/280/583. Count triples opened/closed-or-settled/held. These are unchanged frozen results; no live activity or financial stability claim.

Report-only changes add percentages with denominators to session range tables and audited recovery endpoint/hourly tables. Missing denominators are unavailable. Ordinary Base-qualified inventory includes440 disabled types (45063 total versus44623 evaluated); report scope explicitly distinguishes these. Signal active units and Last-4 readiness are not validation. Local41 report tests pass; representative audited Signal report generation passes. Full final CI and broad ordinary jobs remain pending at this checkpoint. See docs/postbase-reporting-20261025.

## 2026-10-25 — PR203/204 merged; source refreshed, no live activation

PR203 merged as `5113aba0fb1f9afd96f6b4ea688e871db0e81e3b`; PR204 merged as `eb9a555bcb4ddee58ec4f86e801ae1f9412796b3`. Local main refreshed and exact combined tested tree verified: `c21222fee56f8743fbb128a0872afb498d49032a`. Backup branch `backup/main-before-axis-publication-20261025` preserves abe5e49. Both final heads (6d2bf59/d6da8b8) passed all seven CI jobs in 40235937270/40235988433. Combined release: 4,390 passes, zero failures, eight template skips; two slow core exclusions passed separately. Offline build and endpoint report pass.

See `docs/release-20261025/README.md` and receipts for final source-frozen simulation, audit and archive provenance. Ordinary EMA: 80/80 checks and 4,882 exact funded-close matches plus independent Base/funding/hourly audits pass; positions15/4/11, orders7076/4882/2194, PF1.336606, equityDD22.5921%,196 over-margin minutes. Later Signal: positions4/2/2, orders863/280/583, PF0.065995; 39,402,168 scalar comparisons and 29 strict parity sections pass. Original native command exited1 due to Signal Exit cohort-report assertion; original failure retained, report-only regeneration passes69/69 with all raw/history/allocation inputs unchanged. Do not relabel original native command a pass. Count triples opened/closed-or-settled/held.

No live settings, connection, venue order or deployment changed. No measured new entry-ready recovery in these final controls; audited94 unselected candidates fail66 recent-history/28 Block gates. Do not force entries or waive PF thresholds. Full-family ordinary workflow40226266532 remains running/queued on earlier source at this checkpoint; fractional Exit tactics and causal per-leg minute equity work remain incomplete. Financial stability for unrestricted X02 VST remains unmet. Before live reload: consistent DB/settings/state backup, owned-position reconciliation and reevaluation of incompatible Axis caches. Continue unfinished scope; this source release is not production-ready or positive-performance certification.

## 2026-10-25 — final local Axis/Minimal Plus/Exit evidence; CI pending

Head8221a2bf corrected independent Exit Base proof in report dumps. Frozen source cb4a1ca7591a76b20cdc5a479719094cbe66399342ec1af3a7ae419a26b3e517 completed the 12-symbol/12h EMA ordinary run with80/80 checks,4882 exact funded close matches and the independent frozen-study audit all passing. 131.278s including export/audits,1489.11MiB peak; compute100.857s. Orders7076/4882/2194; positions15/4/11; PF1.336606. Drawdown22.5921%,196 over-margin minutes, thus unsuitable for unrestricted live promotion. No cap omissions: zero capped/scaled allocations. All201 additional order/capacity/identity/activation/partial-fill checks pass after fixing fixture shutdown to flush buffered state before SQLite close. Full CI is pending for this final test/evidence checkpoint.

PR204 contains independent lossless minute-selection export optimization, source9e8dd15c: same saved Signal run reports19.929→15.071s /2006→1699MiB with all73 hydrated top-level field hashes identical,160clocks/1428676keys preserved; no economics change. Build/types/tests pass, remote CI pending. Its branch predates PR203; integrate and verify combined report before merge. Full-family ordinary study40226266532 remains pending. No venue action this continuation, no X02 running claim, and no guarantee of stable positive PF.

## 2026-10-25 — Axis and held Minimal Plus correction under final verification

PR203 follow-up preserves Minimal Plus held tapes when their pre-run gate rejects new entry, with independent rejection accounting. Coverage now includes every built kind and optional MP/Wide. First EMA native attempt failed coverage; preserve its original results. Three broad CI failures were stale arithmetic-average Axis expectations and now use funded notional/quantity. Local 106 focused tests pass; report/build/type checks and fresh frozen native run in progress. Source 236adbf24aa337e9c886016d58b3aeace2eb0d77a6ef14c96e3c852d74e4bbd4; `runs/axis-publication-20261025`, 12 symbols/12h ordinary EMA, all enabled protections, minute pricing. No venue action or new-position increase claimed. Full-family CI study still running. Signals later-window PF remains below one; live stability has not passed.

## 2026-10-25 — performance release merged; Axis correction under verification

PR #202 merged as `abe5e49ebc330d2717c6ed45aaa448121f5e2f2f`, main fetched/reloaded; remote backup `backup/main-before-history-storage-20261025` retains `69bf5ffa945b2cecacc8bb34de77f58a215c5a4f`. Tested head `84e5755dad7c69a83a519b4e0d171330586e0526` passed all seven CI jobs in 40230641697 (all 285 core files; 4,371 passes across core/slow/script/browser/component checks, eight template skips; two slow exclusions passed separately) and exact-Signal study 40230641774.

Full source `f09e2ed2aec72b0eb6c5770fc47df903b4d268f0bf56998b4fad2f575401cfaa` 12-symbol/12h later-window replay completed in 776.848 s / 3,106.13 MiB peak, versus local resident control 1,198.019 s / 4,314.48 MiB. Compute 718.817 s. All 68 checks and 39,402,168 scalar comparisons pass. Complete 126,289-config / 10,999,508-close journals are byte-identical. All 29 legacy comparison sections, every funded order/held allocation and hourly account field agree; 158 added PF metadata fields independently checked. Orders 863/280/583, positions 4/2/2, settled PF 0.065995. Losing financial results remain unchanged. Reports and exact comparisons are in docs/history-storage-20261025.

All ten minute-control/DCA/Block arms completed. First window control PF4.888011; later DCA PF0.062541. The full ordinary study 40226266532 remains active: first two all-range arms running, later two queued at this checkpoint. Do not invent progress, claim completion or discard timeout/OOM failures. It runs the earlier bounded-history source 393fdfb, not the Axis correction.

Isolated follow-up `fix/axis-unit-entry-20261025` corrects Axis harmonic average-entry accounting in both Revert and Desk. Eight independent per-leg regressions fail old code; 183 focused tests, typecheck, build and scoped lint pass after correction. See docs/axis-entry-20261025.md. Multi-leg managed exits can change; broader CI and native coverage still required. Full native source must remain frozen during any further replay/audit.

No venue requests, orders, production settings or live reload were performed. X02 authentication/CTS-A-O endpoint is absent in this workspace, and financial stability remains unmet. Earlier personal-context host belonged to CTS-K-N and must not be used. Fractional Exit and causal per-leg minute equity remain incomplete. Continue authorized work; this is not completion, positive-PF certification or a claim that X02 is running.

## 2026-10-25 — bounded-history continuation in progress (superseded checkpoint)

PR #201 merged as `69bf5ffa945b2cecacc8bb34de77f58a215c5a4f`; main reloaded. Both Signal control windows completed: earlier PF 4.888011, orders 476/371/105 and positions 15/6/9; later PF 0.065995, orders 863/280/583 and positions 4/2/2 (opened/settled-or-closed/held). Later audit: 39,402,168 comparisons, zero missing configured cells, zero remaining entry-ready hourly-clock omissions; all 278 prior closes keep their exact returns. Financial stability is still not met.

The history-storage branch adds bounded lossless columns, cancellable per-reply consumption, streaming worker manifests, bounded derived views and a faster exact-minute own-context cache. See `docs/history-storage-20261025/README.md`. Frozen source `393fdfb39930f969c8b1ac85d2f86975db86f05e919979f29f36478ee17246e7`; local `runs/bounded-history-20261025/control-12` started. Do not edit economic source in that checkout while the native run and audits are active. Continue the all-range runs, Exit partials and X02 work; this checkpoint is not completion or a profitability claim.

# 25 October — exact-minute Signal activation, full verification in progress

Main PR200 is merged as4731ebd237875078d5f3be0fba0ef46ef6779f18; final d29 head passed4350tests. Continued work is on fix/bounded-history-execution-20261025. A new synthetic regression proves a valid Signal entry was omitted after its Last-N recovered within an ordinary hourly selection step. SignalActivationBook reuses completed-hour ranking stats and evaluates own config gates each minute, preserving family caps and independent Exit keys. Recorded signalSteps now capture changed minute snapshots; ordinary/reporting steps remain unchanged. 63activation/PF/report tests plus27independence/gate/window checks pass. The benchmark matches all61timestamps on5052sampledconfigs:median182.144ms full vs23.065ms cached. Full native and final CI are pending; see docs/bounded-history-execution-20261025.

Latest old ordinary recovery job121218878033 failed atTapes67%,2119pairs,about13.9GB RSS. Preserve this failure; no financial result. Other old ordinary jobs may still run/queue. Memory-bounded full-history processing and fractionalExit remain outstanding. Current local control12 replay uses source562927400fb3e59a984e13130e9145f825e48855c563f41ad9cc13a7c9bbd986; do not edit economic source before its audit completes, or use an isolated checkout. No X02/deployment/venue writes this continuation. User explicitly wants continued fixes, complete trade simulation, then X02VST under the previously stated stability condition, plus push/merge; do not stop at the checkpoint or claim unfinished work is complete.

# 25 October — shared Signal gates verified; financial stability remains unmet

Economic source 9ac49d0c8c5daeca5942e90f5100169ff0382afdc57e5268729054878b7cfee1, code/test checkpoint f2a52dd2f162926ababce6fa46a35b89be9d6c1d. All seven CI jobs in 40213941363 pass: 4,350 passes, no failures/cancellations, eight template skips, two ordinary slow exclusions verified separately. The earlier 4989173 failure was one remaining raw-direction fixture that expected candidate closes in the shared Signal record; its own-candidate and raw-direction assertions are retained and explicitly separated from accepted-order feedback. No production gate was weakened to satisfy tests.

Two complete 12-symbol/150h/Last4/12h native controls plus 78,791,856 independent scalar comparisons pass. Original PF 4.888011, orders 476/371/105 opened/settled/held, positions 15/6/9 opened/closed/held, peak equity loss DD0.1316%. All366 prior settled orders retain identical returns and common PF4.961150; five closes were added. Following window PF0.067947 unchanged, orders860/278/582, positions4/2/2, DD1.1700%. Own history/qualification/selection/protection records are identical before/after. Computations499.904/519.572s, native/export529.493/549.643s, childpeak3522.6/3491.1MiB. Database benchmark100krows/20revisions preserves all decisions: median.353ms versus237.406ms full read. Native synthetic adapter verifies qualified entry while income loading remains pending.

Detailed report and hourly figures: docs/signal-postbase-gates-20261025/REPORT.md. Ten earlier recovery arms completed on source9a088 (complete-9a088 report); later PF remains.064–.068. The older broad ordinary hold0 attempt timed out10800s at Base76%; hold15 exhausted memory during tapes at14143MB RSS. Their failure artifacts are retained. The separate eight-arm ordinary study remains incomplete. Five exact-entry own-activation-ready observations in the later control remain outside the earlier hourly selection snapshot; global ranking/risk/funding eligibility is unverified, so no missing funded-order or clock-fix claim. Fractional Exit scale-outs are still incomplete.

PR200 contains the verified code correction; consult its merge record for the eventual main SHA. This evidence/report checkpoint changes no economic source. No X02 orders, connection settings, live process or deployment were changed. Stability required for unrestricted VST activation remains unmet; do not claim production-ready profitability or waive gates. A live reload still requires its consistent DB/settings/state backup and owned-position reconciliation.

# 25 October — Signal shared post-Base feedback repair (verification in progress)

Checkpoint 9e2bf8dfa56cc29d0119d75e6236519210415ac4 has now passed all seven CI jobs in workflow 40211817304: quality including real browser, four complete core partitions, slow runtime and verify. Its economic source remains 9a088c40224a49e9f98cf1ba0f36f302e0dcf2abcc45b2ed179f3701c59644f3. Do not attribute those results to subsequent source edits.

New regression reproduces rejected/unproven candidate closes entering Signal shared direction and loss-cluster feedback. `feedBooks` now admits only settled `accepted:true` orders to those two shared gates; exact-config own candidate validation and the explicit raw candidate direction diagnostic are unchanged. Existing PF/sample/window thresholds remain. The accepted marker is modeled Real admission, not proof of venue fill. Settings help explains the new evidence scope and sparse-history policy. Focused 132/132 plus three dedicated feedback/full-walk-forward/persistence tests pass; before-fix failures retained in docs/signal-postbase-gates-20261025. Full CI and native economic comparison for this change are pending at this checkpoint.

The prior frozen recovery matrix has nine Signal jobs complete and one in progress; the first two broad ordinary jobs remain running and six queued. Known later-window PF is below one. Five exact-entry activation-ready observations were absent from the previous hourly selection snapshot; their shared ranking/risk/funding eligibility remains unaudited, so they are not proven missing funded orders and no clock repair is claimed. No X02 connection, venue order, deployment or live reload changed. The old source financial results remain separate and no stable-profitability claim is supported.

## 25 October — CLI fee-provenance correction and frozen recovery results

Economic source9a088c40224a49e9f98cf1ba0f36f302e0dcf2abcc45b2ed179f3701c59644f3 remains unchanged from06ced23. CI40209962685 all4core partitions andslow-runtime PASS;quality FAILED one real CLIprimaryPF issue (estimated fee returns counted as measured despiteUIunknown). Fixed core-live-report primaryPF/nullunknowncounts/basis andmixedcohort regression;local29focused,718scripts+8templateskips,86app/components pass;typespass/lint0errors43warnings. Follow-upheadCIrequired. Browserdesktop/mobile/settingssavepassed in06cedqualitybeforetheCLIassertion. Verificationreceipt in docs/recovery-live-accounting-20261025.

Currentstudy40209962757 has10Signal+8ordinary arms. FiveSignalreceipts audited atcheckpoint:control0 PF4.96115/orders449-366-83/positions14-6-8;control12 PF.067947/orders860-278-582/positions4-2-2;DCAunit0 PF2.713399/orders410-327-83/positions14-6-8;DCAunit12 PF.064292/orders960-282-678/positions4-2-2;DCAweighted0 PF2.7359/orders411-328-83/positions14-6-8. Ordertriplesopened/settled/held;positiontriplesopened/closed/held. Fulltype/range/Last4/hourlyreceipts in RESULTS.md andfinancial-results.json,rebuild with scripts/summarize-recovery-study.py. Localunit12 andremote exacteconomic/group/evaluationcountsidentical. Unit12audit46,279,896scalar comparisons/282exactmatches,0missing0mismatch.

Admissiontrace clarified115ownPFvalidunselected:82recentfail,28consistencyblockfail,5ownactivationready atentry. Of55newlyownvalidsincehourlysnapshot,50stillfailactivation. Those5snapshot delays remainunresolved,notyetcompletefunded/nativeeligibility. Do not claimallvalidatedentriesexecuted. Scripts/audit-signal-admission.mjs optionalsecondoutputname retains oldreceipt. No core selection change made.

Recoveryworkflow nowexplicitdispatchonly so reportfixesdonotduplicatethealreadyrunning18arms. Pending ordinary remainspending;no merge/reload/X02launch,stablepositiveconditionunmet. Corrected protocoltext3%defaultSignalcap;oldfrozenprotocol preservedwitherratum. Unrelateduntracked docs/signal-exit-ranges-20261025 leftalone.

## 25 October — post-Base admission, DCA/Block and live accounting checkpoint

User prioritizes exact post-Base PF through execution, ready lanes without unrelated blocking, 0.15% modeled round-trip costs, and complete ordinary/Signal tests before X02 VST. New changes are documented in docs/recovery-live-accounting-20261025/README.md. Native admission now uses indexed Last-N per exact lane, with valid clock/version caching and unknown evidence preserved. Synthetic100k rows:271.317ms→0.359ms median,20 identical verdicts. Qualified live mock order opens while history is pending. Real exchange income history is asynchronous, scoped, resumable, durable and separates signed costs/funding from transfers; actual PF requires measured fees/fill prices. Merged configurations cannot attribute all returns to the first cfg.

DCA defaults2 additions within2%, old-factory backed-up migration, explicit capped identity; default1%/2% with current3%Signalcap; explicit2%cap fits0.8%/1.6%. Frozen study policy text mislabels2%asdefault; preserve protocol and publish wording erratum, actualsettings3%arecorrect. Correct harmonic cost/quantity average fixes unchanged-price MTM drift. Block source ratios and holdUntilNet opt-in retain independent entry-attributed extra-leg balances; unknown cannot raise. Experimental profiles are NOT proven profitable or promoted. Local full-core attempt3528passed/3failed/2slow exclusions; repaired targeted248pass, original lifecyclehashpreserved. Final-source CI still required. Types/build pass, lint0errors/43warnings. New recovery workflow declares10Signal and8ordinary12h/12symbol arms including Micro SLratio1/1.5/2, all19ordinaryfamilies plus no-indication,38,402combos. No venue/account mutation or reload; keep PR200 draft until evidence supports release.

Previous e089 CI40204700430 all7jobsSUCCESS. Both foreground native controls complete: originalPF4.96115,449/366/83orders,14/6/8positions; laterPF.067947,860/278/582orders,4/2/2positions.68checkseach,78,791,856scalarcomparisons,totalhistoricalbyteparitypassed. See foreground receipts under docs/expanded-exit-review-20261025. Losing laterwindow stillblocks stabilityclaim. Old ordinarycb441 workflow40200402203stillrunning; do notcountaspass.

## 25 October — foreground equity race and missing-quote correction

Latest production source fc0797430294d8f287a6f021c81994fc2e4e5a5c7d2228cf8923bac2062c1c0b fixes two ticker accounting defects. CI40202736648 on display checkpoint ef38a5e6afa2c654f5ca461122b12982d71b850d passed quality/browser/build and other core/slow jobs but core2 failed the paper-equity audit. A deterministic200-position fixture reproduced partial local tick publication before matching equity. Local TickMathBook now owns private position/Exit state, returns detached patches, publishes with equity atomically, and discards canceled partial progress. Guard against replacement of the whole paper book, even with the same positions array. Also retain prior unquoted-symbol marks on the first and subsequent frames; a fixed test previously showed+0.85 instead of-1.15. Audits/gates unchanged. 65targeted tests and3worker/outage parity tests pass; types/build pass, lint0errors/5existingwarnings. FinalCI and nativeSignal controls on this source still required. Preserved failure and before/after receipts: docs/expanded-exit-review-20261025/tick-equity-repair.json.

Exit-only expansion independently preserves every126182/126279Signal tape and10760734/10998889history closes in original/later windows; own type/range start/end proofs equal. Settings change only Exit, but explicitly enabled shared direction/cluster controls may change executedSignal cohorts. Reproduce with scripts/compare-exit-signal-history.py. PFneutral1; no experimental positive default promotion. Original/later Expanded ExitPF.0393/.2267 remain prior-source financial evidence, not a claim about an unfinished current run. Both full ordinary cb441 processing jobs remain running; no merge or live reload.

## 25 October — Expanded PF review, neutral display and processing parity

PR200 remains open on fix/signal-exit-horizon-20261025. Tested engine checkpoint d02ab91c6c2beae9cec0086d0fdfca8feb2b5191 passes all seven CI40200849871 jobs: 4,324 test passes, eight template skips; the two ordinary slow exclusions pass separately. Economic source remains cb4415d4bf602c10ef1946178352c37d7bc6622f0bee19f68728b0daf4648d5b. UI follow-up sets default PF colors neutral at1 and positive above1 while preserving explicit qualification floors; verified all-zero unit samples show Flat (no ratio). Fifteen focused accounting checks pass; final follow-up CI must be checked. No strategy thresholds or economic calculation changed in the display follow-up.

Processing workflow40200402203: both 12-symbol/12h Signal controls PASS, each68nativechecks; combined78,791,856scalar comparisons pass. Complete journals retain21,764,389historical closes across252,538configuration tapes byte-for-byte against source39c13875. All frozen input/settings, catalog/hourly/gate verdicts and funded settled/held orders are exactly equal. Original control PF4.96115, orders449/366/83, positions14/6/8; laterPF.067947, orders860/278/582, positions4/2/2. Times406.30/368.15s, childRSS3581.34/3531.20MiB; separate-host comparisons do not prove speedup and native RSS did not decrease. Read docs/expanded-exit-review-20261025/README.md, processing-native.json and both processing-parity receipts. New scripts reproduce both semantic and streaming-byte comparisons.

Both full ordinary processing jobs (all19families, hold0/15, later12hwindow) remain in progress. Earlier ordinary matrices contain preserved memory-aborted runs around14GB RSS. New Base messages cap256combos; local tape caches release every16pairs and completion/cancel. Controlled synthetic1080tapes/212784closes/1575open/199pending are identical; RSS365→276MiB but elapsed2.18→3.45s. Do not claim full ordinary completion until actual artifacts/audits pass. Bounded-history and all cost/net/trend study workflows are now manual-only.

Financial objective remains unmet. Corrected Expanded Exit PF.039335/.226697 across original/later windows; 1h/3h direction filters across all three windows also below1. The later Expanded Signals sample has1,097config orders sharing one ADA short position, settledPF.039928 and separately endpoint-marked diagnosticPF.003086. Default Exit control's1350minhold exceeds the12hscored window, so seven winning closes cannot certify its remaining holdings. All16cost/net/trend arms, prior failures, empty samples and source distinctions are preserved. No experimental financial default promotion; PFneutral1, no-loss positive samples have no finite ratio, empty/flat unavailable. Full per-type counts and endpoint diagnoses are in the central review.

No release/merge/live reload. Fractional scale-outs within one Exit config remain incomplete. Ordinary broad functionality, best hold defaults and stable positive execution remain unresolved. Earlier readonly-test-fixture CI failure and premature typecheck claim remain recorded in verification.json; correction d02 passed fullCI.

## 25 October — active ordinary/Exit/hold/volume work (not released)

PR200 branch fix/signal-exit-horizon-20261025; source checkpoint463ae2e7d71864cb0640b3cc426a48e06b5e51e2. Ordinary 12-symbol/12h comparison40190814481: four hold policies (original,15,30,60min for Minimal+Short) × original/later windows,150h available/100h ordinary selection, all19 indication families/38402 bot-lane pairs, all strategy toggles, Wide and Minimal Plus explicitly activated. Four running/four queued at this checkpoint. Signals off. Full raw minute receipts and failures uploaded per arm. No PF result yet; do not claim best hold defaults. Earlier CI463ae all core/slow partitions pass; quality browser fixture failed because Minimal/Short were disabled. Fixture now explicitly enables/restores those ranges.

Exit retention now follows independent holdout qualification instead of allowing failed candidates to consume the cap. Signal trailing-gap eligibility now matches the tape builder: activation × trailStep must meet minTrail. The earlier expanded-later source7c30 run had493 qualified/492 built because sig-s2-range-shift-m lost one trailTooShort cell; preserve this failed receipt. Added regression for rejected gaps and executable fit/tape count parity. No guard lowered.

Operator subsequently requested neutral volume ratios:0.1–5,step0.1,default1 for all indication types and strategy ranges. Implemented shared normalization/validation, ordinary standalone+combined type ratios applied once, neutral Coordination/Axis defaults, independent Exit range sizing (no Wide/Signal-range inheritance), common simulation/paper/live range resolver, Settings fields, backed-up once-only old-factory migration. Valid custom ratios retained; out-of-bound legacy ratios clamped with original backup; existing held quantities preserved. The old combinedVolumeFactors storage key now represents both standalone and combined lanes. Frozen ordinary matrix463ae predates these requested sizing changes (Axis remains0.1 in its protocol); it is not a replay of the newer neutral-sizing defaults.

Local334 volume/settings/live-planner tests +4 focused Signal settings +229 execution/accounting/Exit/hold tests pass; typecheck and build pass. Final UI save/reload and full CI still required. User also requests continuously improved1/5/15m Exit SL/trail variants and partial tactics, including Signals. Partial Exit implementation is NOT yet complete; existing fixed Exit simulator emits one terminal close and partial ownership must be designed/tested before enabling new tactics. No production/live setting was changed, no merge/deployment/reload in this work.

Earlier Signal expansion7c30 results: original expanded Exit PF0.240311 vs original control0.486516; later control0.382169 vs expanded0.125983 (expanded later coverage failed as above). Later whole-account PF0.060109/0.062091. Expansion is optional and NOT promoted as profitable defaults. Full workflow40189111292 archives retained under runs/signal-exit-range-results; expanded-later extracted fully. Original expanded172 orders opened/93settled/79held and10positions opened/2closed/8held; later expanded168/36/132 orders,16/5/11positions. No successful profitability claim.

Release: PR199 merged as ecf384a25f6ccaf967cd69817d27b962c29c42a3 after all final-code CI passed. Previous main1061ed4 is remotely backed up at backup/main-before-ready-20261025. This documentation checkpoint contains no code changes. Full replay raw archive: libfile_f41ae4bc461881919a6ca64ff42214dd. No live trading instance reloaded; do not infer venue readiness from offline PF.

## 25 October — original positive Signals/Trailing result reproduced

Code checkpoint df96f8cbbf93d5d1c678e0d9bc594d8e0193c161 (PR199). Economic source 3d99231e34678de8c3213faaa19a81204d3dd415376b369201cddfe910d11d40. User rejected tighter stop trials; none had been promoted, so original production grids remain unchanged. Added signed PF edge (PF minus 1) beside conventional PF, with unavailable/no-loss provenance; conventional gates remain unchanged. Settings explicitly describe classic/coordinated Signals → own Signals range + independent Exit, ordinary sources → enabled ordinary ranges + Exit excluding Signals.

Fresh exact 150h/Last4/12-symbol/12h replay matches older positive archive in all29 comparison sections, including hourly gates/config contexts/admission. Every stored field of339funded closes,97held orders and all allocations matches archived originals exactly. Settled PF2.907107, Signals3.058940, Trailing2.549281, Trailing-only6.846530. Positions14opened/6closed/8held; orders436opened/339settled/97held. All68native checks and49,955,880scalar comparisons pass,160,115configs/118sources/884source-lanes,zero missing cells. ExitPF.486516/7settled and5negative settled-return hours remain. LogPF1.07 includes97endpoint marks, a different sample from settled PF2.907107; no economic regression reproduced. Do not tune away preserved losses on this reused window.

Compute565.316s, native/report600.361s, childpeak4090.27MiB, independentaudit93.113s. Not a controlled speed comparison. Detailed results and exact hashes: docs/signals-regression-20261025/. Full local raw: runs/signals-regression-20261025/last4; original archive materialized separately and verified against funded readers. Comparator scripts/compare-signal-regression.mjs prevents silently comparing changed inputs or dropped orders.

Local268focused core +15accounting/comparison tests pass, types/build/scopedlint pass. df96 CI quality40186846240 passes721script/browser +84component tests (8template skips), desktop/phone/settingssave included. Local Chromium unavailable/download invalid; successful CI is the browser evidence. Full CI now passes all4partitions and slow-runtime:4,298passes,zero failures/cancellations,8template skips (two ordinary slow exclusions pass separately). Exact-Signal/endpoint CI pass; verification.json records exact jobs. No live settings changed or connection reloaded during this verification; release status must be checked before claiming merge/deploy.

### Completed stop-grid matrix

All ten candidate native runs completed; remote matrix40184860919 all4jobs SUCCESS. Long.75 whole-armPF.101833, peakDD38.0631%,minimum equity$6.457285;5151settledorders. No studies remain running locally for this turn. All native, exact-return, own-entry and hourly audits passed. Six ordinary ranges covered; Minimal Plus remains unconfigured, Signals unchanged on their own policy. Shared risk replay Short2 is strongest measured combination (PF2.014093/DD2.3035%), but end equity$9.932115 and6negativehours mean stability/profitability goal remains unmet. No financial default promotion. Report rebuilt with all candidate results; reproducible remote raw evidence is in workflow40184860919 artifacts. Never promote low-PF caps just because loss drawdown falls.

### Strongest tested candidate and remaining study

Short2 raw simulation complete: PF1.699, peak equityDD163.1641%, minimum equity -$7.645524; all58reportchecks,30938exactsource/own-directionentrychecks,1719816hourlydecisions pass. Shared notional caps .5× per symbol/direction /2× overall applied as separate report funding replay yield PF2.014093, peakDD2.3035%, minEq$9.779655, endEq$9.932115, cash-weightedPF1.009685;46positionsopened/29closed/17held,32720ordersopened/9770settled/22950held,5green/6red/1flat. All9770 funded closes retain exact original source returns/own-entry evidence, all58 nativechecks pass. This preserves high unit PF and lowers LOSS drawdown, but DOES NOT establish positive ending equity or hourly stability. Candidate only; no live/default settings changed.

Micro1,Minimal1,General.75 remote native+entry+hourly checks passed (40184860919). Whole-armPF .213158/.135481/.280817 respectively, rejected as profitable settings. Long.75 still running at checkpoint. Local docs/repro protocols retained. New large-export proof:110000configIDs,19358916-byte legacy metadata →3chunks each≤8388608bytes,exact ordered SHA preserved,1.413s,330.6MB sampledRSS. Study workflow now manual-only to prevent repeat runs on report updates. All financial failures remain visible.

### Stop comparison follow-up

Short1.25 completes PF.983847, peakDD30.9789%, so fails PF objective. Short1.5 PF1.390668, peakDD68.9742%, min equity$3.378472: preserves PF>1 but remains high risk. Separate report-only funding replay (maxPositionX.5,maxExposureX2) yields PF1.162964, peakDD2.725%, min equity$9.741976, end$9.916556; 46 positions opened/15held,15194orders opened/3508settled/11686held,5green/6red/1flat hours. All3508 funded closes exactly subset original12378 with unchanged returns, all58 nativechecks pass. Cash-weighted PF.412972, so not a positive dollar outcome. Do not present risk caps as improved intrinsic returns or profitable live qualification.

Fixed summary report override to load held allocations from the selected report, not the original uncapped report; supports explicit output path for retaining both. Short2 local run still active; remote stop matrix40184860919 runs Micro1/Minimal1/General.75/Long.75. Published checkpoint6df281d contains export fix, study settings and earlier evidence. No production defaults changed; goal of stable positive performance remains unmet.

## 25 October — loss drawdown and post-Base stop comparison

User explicitly means loss/open-P&L equity drawdown, not margin usage, and wants preserved high post-Base PF. Reconfirmed equity arithmetic excludes margin; new full native replay regression varies leverage 1→100 with identical funded notionals and proves unchanged P&L/PF/minimum equity/drawdown while margin changes 100×.

Work based on PR199 head 921612d. Fixed actual high-cell evidence-export failure: completed Micro/Minimal runs produced 17,455,990 /13,541,750-byte selected-config metadata exceeding 8MiB. Validation sidecar v2 streams selected config IDs losslessly; reader still accepts v1. 44 sidecar/consumer tests pass, 41 report/funded tests plus margin-specific regression, 13 trailing/readiness tests, types/build pass. No economic production default changed.

Stop experiments use scripts/micro-study.mjs --sl-ratio-cap (configured ladder ceiling; mandatory floors may yield higher actual ratios, disclosed). Same frozen 12 symbols/window, full 1m pricing and original PF/gates/sizing/cost/Exit. Wide baseline whole-arm PF .592, peak DD15.04%; cap1 PF.280 DD1.49%; cap0.5 PF.132 DD.649%. Short baseline PF2.016, peakDD231.95%, loss below initial272.94%; cap1 PF.663, peakDD8.22%, loss below initial7.95%. These tight candidates FAIL the PF objective and are not promoted. Short1.5/2 continue; report/docs/postbase-stop-study-20261025 retained protocols, own-entry and exact-return audits. First2,526 settled entries: zero own-direction gate failures, zero missing/mismatched source closes.

Local runs/stop-study-* contain complete raw sidecars. scripts/summarize-stop-study.py rebuilds compact report. Workflow stop-loss-range-study.yml runs Micro1, Minimal1, General.75, Long.75 with full native reports and independent entry/hour audits. Pending studies are not successes. Main is not merged/reloaded; X02 remains clean from preceding technical test, no venue actions this turn. Stable positive execution across ranges remains UNMET. Do not weaken gates, discard losing evidence or attribute lower DD exclusively to stops when admission/exposure counts also change.

## 25 October 2026 — ready-book execution and seven-range evidence (PR199)

Branch `fix/live-ready-progress-20261025`, simulation capacity source `b8d4247b79fb98cfecc740f4f36bce3e3af08d99`. Main has not been merged/reloaded for this change. Backup `backup/main-before-ready-20261025` exists. Report: `docs/live-ready-ranges-20261025/report.md`.

Completed five 12-hour arms (Short, General, Long, Wide, Minimal Plus); all corrected native report and exact-return parity checks pass. Independent scalar hourly audit: 7,097,568 decisions, zero discrepancies. General's old auditor falsely rounded a tiny positive LCB to zero; exact binary rational boundary checking fixes the auditor only. Eleven auditor tests pass. Original failure and precision receipt retained. Minimal Plus has no selected ordinary cells. Short PF exceeds 2 but modeled equity drawdown exceeds 231%; General/Long also exceed capital. No profitable promotion.

Micro/Minimal original 4 GB heap attempts failed. Workflow 40149774312 retries unchanged economic protocols with 8 GB heap, still pending at this checkpoint. Do not claim full range completion. Original workflow 40148371319 preserves raw evidence; detailed local files under runs/ready-ranges-remote-20261025. The capacity workflow is now manual-only to avoid redundant expensive reruns.

X02 VST technical lifecycle completed and independently reconciled: 14 positions, 84 accepted orders, 42 fills, 42 cancelled controls, zero final positions/orders, settings restored. Synthetic qualification is not actual strategy profitability. No further venue action needed.

Full CI at b8d passed quality, slow runtime and three core partitions; partition 3 timed out an ordinary Exit Base test that inadvertently included expanded Signals defaults. Scoped that fixture to ordinary sources (Signals have separate runtime tests); all 22 Exit tests now pass in 1.93s. Production gates/defaults unchanged. New source still requires CI before merging. Regular reporting must retain failures, exact ownership and independent range/type denominators.

## Signal-only coordination and 150h history — merged and verified, 24 October 2026

PR198 branch fix/signal-coordination-own-grid-20261024 from main cb7685c. Economic source619ba50f37a7c1e9c8a10ee5167a37baf44306b48b32df7a198f0b10c3cf781e. Signal/Exit defaults150h with atomic backup/once migration; Last4 unchanged. Runtime and presets use own Signal grid. Exact legacy held tagged identities stay exit-only. Incremental capture is selected/held only; complete discovery histories retained. UI no longer depends on ordinary grid switches.

Final offline12-symbol/12h minute replay completed:160115configs,122/122Exit,0missingcells,68/68native checks,49955880scalar comparisons,339/339exact settled matches.14positions(6closed/8held),436orders(339settled/97held),PF2.907107,maxequityDD0.292961%,equity+0.109625%. Endpoint Last4:78.48%configs with a ready context,31.06%exact contexts; own minimum sample5.55%,9822contexts/7221configs pass all evaluation gates. Exit and15m lose;1m has noorders;5settled-unit-return hours lose. Do not claim uniformly positive results.

Compute600.663s/native-report638.379s/childpeak4092.84MiB. Timing not a controlled speed comparison. Raw successful and failed/superseded runs archived as libfile_891c9c830bf88191aeaf107c759e8b2b; checksum in docs/signals-own-grid-150h-20261024/archives.json. Report and compact complete receipts in that directory. Two100h attempts superseded; first150h startup rejected ordinary longH mismatch, corrected launcher keeps ordinary100h. Quality CI interrupted while an obsolete catalog fixture expanded expected ordinary protections; fixed helper fourth argument and focused3tests pass in0.45s. Earlier four stale100h/range expectations also corrected. Build/types and216+6+23+103+4focused tests pass. Final complete CI has passed; no deployment or venue/account actions occurred. Keep earlier evidence below.

PR198 merged as `1ce96f68ebabab090735e7529ad138702342d9dc` after final head `47600029d7e284fa86db3e03e1251a7d0f047f83` passed verification40128771044, exact-study40128770989 and report-preview40128771061. All 4,289 tests pass: 3,489 ordinary core, 2 slow runtime, 715 scripts, 83 app/component. Eight template-only skips; two slow tests excluded from ordinary partitions passed separately. Types/build pass, lint zero errors/43 existing warnings. Report desktop/mobile visually inspected, clean console/no page overflow. Remote backup: `backup/main-before-signals150-20261024-cb7685c`. Final verification logs, source fingerprint parity and release receipt are preserved in docs/signals-own-grid-150h-20261024. The following documentation-only checkpoint changes no economic source. No running-instance deployment or venue/account actions.

## Expanded defaults, Last-4 and order reconciliation — completed, 24 October 2026 UTC

PR197 merged as `ff394919f99696e5a545d02ec1e0c2af8399dee9` after final head `080566d5dde7f66d37ca639f8315de910cd76f73` passed CI40104548738, Exact Signal40104548816 and preview40104548817. Merge tree `68832c2a1e67da7630ad729b958c9eff1d7411d2` exactly matches the tested head. The local checkout was fast-forwarded to main. Economic source remains `6d18d75b8ae3e437ba069eeb86dacce98d1f76f0b9efde72d5559db8d5cf44ca`; this follow-up only preserves documentation/evidence. Remote backup: `backup/main-before-expanded-last4-20261024-8ee9073`.

Expanded source/grid defaults and atomic backed-up migrations are implemented. Signal/Exit Last-N is 4; own full-history minimum 12, fitting minimum 30 and PF floors remain. Shared position/order episode counts retain held siblings; native total/hour labels now use complete funded ledgers, with old settled-subset counts explicitly diagnostic. Base detail recomputes from its published engine/independent Signal history and frozen costs/settings, rather than newer engine-only inputs.

All 4,287 tests pass: 3,487 ordinary core across the full 271-file inventory, two slow runtime, 715 script and 83 app/component. Eight template-only script skips; the two slow tests were excluded from ordinary partitions and passed separately. Types/build pass, lint zero errors/43 existing warnings. Synthetic independence proves 1,728 orders across 24 position episodes, with 1,152 peak orders and 576 sibling-held reopens. All 112 range/type/side partial-to-final-closure cases and the 128-toggle matrix pass. Existing restart/unknown-fill/fees/ownership guards remain active.

Final source-sealed paired native workflow40103220690 passes both 12-symbol,100h-history,12h minute-price Last8/Last4 replays, 68/68 native checks per arm, 151,626,072 scalar comparisons and desktop/mobile verification. Last4:242,988 configs,16,929,954 historic closes,14 position openings (9 closed/5 held),203 orders (186 settled/17 held),peak9 positions/88 orders,settled unit PF1.882191,max equity DD0.1945%,equity+0.00092%. Last8:11 positions/153 orders,PF1.815398. Seven losing return hours and the losing15m lane remain;1m/combined ranges have no funded orders. DCA/Block/Axis are off in this financial profile and are not requalified as profitable by lifecycle tests. Last4 qualification:83.39% of configurations have four closes somewhere,29.40% of exact config/symbol/side contexts have four,1.61% meet own full-history sample minimum,2,786 exact contexts across2,220 configs pass all endpoint evaluation gates.

Final two-worker hosted Last4 compute806.465s/native-report865.062s/child peak3,809.26MiB; Last8 509.022s/544.297s/4,570.95MiB. The final-source four-worker local repeat is exactly equal in all catalog/group/hour/ledger/execution-context/admission outcomes:526.952s/581.216s/4,810.95MiB, with75,812,256 scalar comparisons. These separate-host timings are not a speedup claim. No memory aborts or fallback reductions. Read `docs/signals-expanded-last4-20261024/README.md`, `report.html`, `release.json`, `performance.json` and the exact source/worker parity receipts. Complete raw archives and prior failures are retained and indexed. No venue orders, account writes or running-instance reload occurred. Preserve prior evidence below.

## Completed Signal coverage fixes and verification — 23 October 2026 (UTC)

PR196 source checkpoint `8b2b389cf0f3eb21668934c1fdb87fa2d08e9642` (local equivalent `640d8d1079dec034aec631627f7d96bb6782e48d`, tree `6b202a4f3f78f762a78fdefc08e362eec4105ada`) has economic source `aeec5a59086e1145a52009f580bd29ecf7042eb6c174677f099a284fe397c82e`. Signals-only range qualification, pooled-fitting versus own-context sample separation, bounded derived caches, indexed yielding selection, complete catalog audits and separate built/opening/settled/endpoint counters are implemented. Final documentation commits preserve that economic source.

All five source-sealed native replays in CI40033630586 pass: 12 symbols,100h evaluated history,Last-8,12h trading on minute prices. Expanded final:242993configs,16932927history closes,153funded openings (135settled,18open),unitPF1.815398,cashPF1.059,equity+0.00269%,maxDD0.1933%. DCA:436785configs,196openings (135settled,61open),same settled unitPF but equity-1.3015% and maxDD5.0263%. Block does not resolve the open DCA losses. Active has no qualifying ladder trades; regular DCA and DCA Active are alternative execution modes with both histories independently built. Axis is disabled in these financial profiles, not absent from systemwide tests.

Full CI40033630566 passes all270 core files (3362ordinary+2slow),715script and83app/component tests,types/build;8template-only skips,lint0errors/43warnings. Registry40033630489 passes1972specs,38402source/lane combinations and20-symbol full/prefix/unfinished-bar causality. 522563496 scalar comparisons across all five cases have zero discrepancies. Exact byte comparisons preserve all242565old expanded tapes and16855856closes, adding428configs/77071closes. Read docs/signals-coverage-20261023/README.md,report.html,comparison-summary.json,source-verification.json and registry/. Full archives and hashes are indexed separately.

Same-data local cache control: main RSS4223→2064MB,compute419.0→383.4s. Exact selection-index benchmark40.444→0.608s across12cuts,largest slice2.793ms. New native timings use separate GitHub runners and cannot be compared directly to local wall times. Preserve original sparse/negative cases and the earlier heap OOM. Positive aggregate PF is not every-hour/lane profitability; seven hours and the15m lane still lose in the expanded final profile.

Main backup exists: `backup/main-before-signals-coverage-20261023-14182d9` at14182d9feab648eec25c9615471017a103273f57. User authorizes push/merge/main reload. PR196 merged as `4705c01077e95a1bef04f9d06724f0c473579a8c` after final head `c47494c6fe3256183ff8cb2dd0ae1b91e54584c9` passed CI40037966000 (4162 tests), Exact Signal40037966038, registry40037966155 and desktop/mobile preview40037966103. The original checkout is on main and was fast-forwarded to the merge; tree `7cf2cbf186e011e4648846fb760a3ebbf77cc3c2` exactly matches the tested head, and economic source remains aeec5a59. This documentation-only follow-up preserves the completed release and browser receipts in `docs/signals-coverage-20261023/release.json` and `verification/`. No venue orders, account writes or running-instance reload have occurred.

## Integrated PR184/191 checkpoint — 21 October 2026

Replay-only rank clocks and earlier caller bounds/native5m retention from PR184 are included with the112 context additions; truthful input-provider labels have a real prepare regression. New source seal`7368ba50ac6b77790d156c0d1ed509cc06fb1a6441cd5cdcee0d8712983dabb0`.334 integrated core tests +8 ranking/feed/provenance cases pass, as do types/lint/build. Both original/expanded provider simulations repeat exactly the prior economic results (PF0.810/0.453); every funded entry and full hourly reference passes again. All1,972 sources pass complete native hourly/unfinished-bar causality again. Preserve older02c receipts; their hardcoded Binance provider label is an explicit metadata erratum, not a change to the sealed BingX prices/returns. Integrated verification and GitHub exact-head status are authoritative; no live actions.

## 21 October 2026 — additive negative-hour contexts and chronological comparison

- PR190 exact Base-cell admission and incremental evaluation boundary merged after both complete workflows passed: main `1f6acd9328e05636ce3ff341e34628ea8e8aa762`; backup `backup/main-before-cohort-admission-20261021`.
- PR191 adds 112 independent Micro/Inverse Tactic/relative/market context sources alongside originals, with exact factory-only focus migration. Original 434 Micro vectors are unchanged; Signals retain independent 336h history and this Micro comparison retains15m maximum hold.
- All current1,972 sources and38,402 eligible Bot/lane pairs passed complete native hourly/unfinished-bar causality. Local21 focused +168 integration +4 UI cases, types, changed lint and app/worker build passed. Full PR191 CI status remains authoritative; initial UI Save-count race and browser setup failures are retained in evidence.
- Retrospective v4 negative-hour training: inverse5m Activity Acceleration Normal Micro Long PF3.21, Break Close selective Normal Micro Short PF4.57, Break Retest Trailing Micro Long PF1.39. These are training-selected, small-onset cohorts, not future evidence.
- Separate preregistered native BingX chronological24-symbol comparison (Oct20 12–24 UTC) is **negative**: original15,607 funded modeled closes PF0.810; original+contexts37,581 PF0.453. All15,607 originals remain identical. Added21,974 alone PF0.344. Do not claim stability or positive combined execution. Some relative variants have positive subgroup PF; they were not retrospectively substituted as the sole portfolio.
- Independent source/own-direction entry qualification passed all53,188 closes, with zero unknown returns or source mismatches.221,268 full-history hourly config decisions have zero scalar verdict/arithmetic discrepancies. Base pair/representative counts differ from full protection-cell evaluations; uncomputed cells are never certified as passing.
- Primary Binance Oct20 daily archives remained unavailable (24HTTP404; public REST probe451). Keep incomplete primary evidence separate from the all-BingX supplement. No venue orders, owned-fill proof, running-account updates or live reload occurred.
- Full plan, results, all failed/empty/losing outcomes and checksummed reproducible evidence: `docs/negative-hour-contexts-20261021/README.md`. Source manifest`02c34224ab02d7e9a70a9480c7756d4eb25ddfc0da2f33b6cee99ba38da9cb5a`; built worker`01e384633aeed37f363d2c1f130d5086a29e2d85003558a2c638da0b0d135280`.

# Exact-cohort procedure fixes and hourly verification — 21 October 2026

PR190: https://github.com/mxssnx-creator/CTS-A-O/pull/190. Main remains720299c. Production source local2edac0c / remote31b66ac (same tested tree); runtime manifest110b13ff9f42232e39d346430bf1a6adf254a8fefe49a69cde626d972c912f71. Audit/runner/reference checkpointa54c0b9 preserves optional exact Base cell permission at Durable/entry/native, bounded incremental replay history, declared audit settlement horizons and fail-closed explicit test inventories. Read docs/sims/cohort-procedure-audit-20261021/README.md and report.json first. Source-specific scalar floors are now explicit; no production floor changed. Complete evidence archive includes initial failures and original scored audit code.

Fresh234core checks in disjoint targeted groups,23script/reference/window tests,types/build pass; zero lint errors. Registry1860specs:627984synthetic identities,5580positive+5580losing hourly decisions; all20-symbol native six-hourly and three unfinished-bar prefix audits complete with zero violations.548576independent actual hourly direction decisions match.963settled modeled orders exactly match source identities/returns/cost once and current Base/direction/symbol proof. Full Exit CI39541882421 at31b66ac remains in progress; Exact Signal39541882409 green. Do not claim full CI completed until checked. No hosted reload or actual venue/account action.

Corrected six-hour repeats: Oct13bounded36settled PF31.386887 plus195open marks; Oct14bounded48PF.224484 plus80marks; Oct15bounded6no-loss score4; Oct16bounded193PF0 plus5marks; Oct17Micro22 680PF1.337123 with two losing hours. Old Oct13/14 launcher results included195/80future settlements beyond their declared stop and are superseded in scope, not erased. Consistent positive PF across hours/ranges remains unmet. Preserve Signal336h and Micro15m.

Latest operator steering requests additional independently qualified variants based on winners in negative hours, retaining originals in parallel. Initial small-window scan has no net-winning config in its negative hours (113mc-rsit5-10 variants each contain one small win but remain net losing). Broader previously published funded v4 archive at /workspace/scratch/e92abb680845/CTS-A-O/runs/ci-evidence-39532140644 has257095exact funded model closes,3negative hours,202positive source/type/range/side-hour groups and4852positive config/side-hour groups. This is retrospective training on a different old source, never current live/holdout proof. Current analysis scratch runs/funded-negative-hours-v4.json. Promising repeated groups: inverse-micro-5-activity-acceleration-fast Normal Micro Long (219closes/12summed hour-onsets,PF3.2122,two positive negative-portfolio hours); inverse-micro-5-break-close-selective Normal Micro Short (142closes/9onsets,PF4.5673); same source Trailing Minimal Short (250closes/6onsets,PF333.9947); inverse-micro-5-break-retest-fast Trailing Micro Long (494closes/8onsets,PF1.3869). Count unique onsets across the full cohort before choosing expansions. Preserve all source/config siblings, shared risk coordination, costs and independent forward gates; add new IDs and chronological validation instead of selecting by later losses. Expansion implementation is not complete yet.
# Completed twelve-symbol comparison and release merge — 21 October 2026 (UTC)

PR184 merged as 7ba74e8f970aeb7fc8531e6fbc57026a1c821e93. Its tree b22c5b68c6647f4297a91a1d684292de0eb9dfdf exactly matches tested PR merge46ae9aca. Economic source f704356e936a30cc7ae3415f5a58a04dccbf7d81198935414b4d42efb2c0d661 includes existing main1f6 Base-cell admission and incremental evaluation-boundary repairs. The source-sealed financial checkpoint is e2a91c7c84e29bd7bbfe092659a4ca14dbbb4016; report-only follow-up files do not change this economic source.

Final standalone report: docs/micro-rank-comparison-2026-10-21/report.html. Thirteen responsive charts, exact hours/stages/funded cohorts, all requested 868 Micro/Inverse sources, complete grid/config/loss coverage, ranking definitions and additional hourly ranking-only diagnostics. Trade window 19 Oct 12:00–20 Oct 00:00 UTC, evaluated prehistory 19 Oct 00:00–12:00 UTC, older 18 Oct candles indicator warmup only. Volatility uses three completed hourly ranges; Change averages twelve absolute five-minute relative distances. Both select the same twelve contracts at the cutoff, in different priority order.

Final paired run 39548800331: Volatility 160,300 funded modeled settled closes / PF 1.0852160377; Change 160,220 / PF 1.0834427433. Both have 7 positive / 5 negative hours. Micro remains about PF 0.680. The modeled full grid exceeds $10,000 capital (maximum margin $18,010.20/$17,999.00); no live-readiness or hourly-profitability certificate. Modeled round-trip cost 0.15% once. All 160,071 shared closes have identical verified unit returns. All 35 changed common initial config decisions have identical historical row/return multisets; stable universe order affects tied Last-N boundaries. Native coverage retains 28 additional Volatility cells at one Base target. Do not alphabetize the traded inputs or rewrite costs/gates to force equality. Historical gate cohorts and later executed closes remain distinct.

Every case passes 60 native report controls and independent prices/protection/cost, complete scalar-hourly, transition and exact funded tape/execution audits. V3 → V4 repeats retain every funded identity and unit return exactly; old v3 HTML/data remain in v3/. The final 262-file CI has 3,125 ordinary core passes plus both optional slow tests separately, full catalog/native/unfinished-bar/identity coverage (1,860 specs/627,984 identity cells), and120-symbol868-source stress. Full repository CI 39545983417 on the exact combined tree passes 676 script tests (8 absent optional fixtures), 83 app/component tests, 3,125 ordinary core + 2 slow; types/production build pass, lint0 errors/44 existing warnings. Stress:2 computes, 100 coalesced kicks, max 1 concurrent compute, 353.894 s, max 3524.50 MiB RSS; 100 ms control: 3537 checks, max lag 106.36 ms, one missed interval,no errors. This is not a hard 100 ms live SLA.

Final full24-symbol control 39548800357 also passes all audits: 373,222 closes / PF 1.5730241054,9 positive/3 negative hours, Micro 0.793984,capital infeasible. See v10-verification.json. It is a separate universe, not the twelve-symbol selector score. Retain all previous losses/failures/source seals; optional next-day 20 Oct archives were unavailable (404; local official REST 451), so no next-day PF exists.

Backup: backup/main-before-micro-12-symbol-20261021-1f6acd9. Code/report merge only: no exchange orders, live settings writes, direct deployment or running-instance reload performed. A repository merge does not certify actual owned fills or live profitability. Full receipts/settings/source hashes are in verification-v4.json and combined-default-verification.json.

# Earlier replay clock bound preserved — 21 October 2026 (UTC)

Final paired v3 source eb588571dfff70db0b79b4b0588fe1d9c5779c0d91aa4bc5011523e8054b7af9 also honors an earlier caller timestamp inside the offline feed wrapper. Previously the wrapper widened hourly ranking reads to the session endpoint even when rankUniverse requested trade start. Full forced symbol lists made that redundant internal ranking unable to change either frozen 12-symbol universe; nevertheless future ranking reads are now excluded. `boundedReplayFeed` covers native 1/5/60m reads, earlier history cuts and clamping of later cuts. Twenty-three targeted regressions pass. Both original symbol lists, economic settings, costs, gates, history and windows are unchanged; v1/v2 seals and their artifacts stay distinct. Paired v3 + full original 24-symbol v9 are pending. No live actions.

# Paired 12-symbol replay repair — 21 October 2026 (UTC)

Paired v1 run 39543724516 completed Volatility but Change failed before compute: the historical runtime ranker used today’s clock and the offline feed pruned its missing 5m lane. Preserve both artifacts and `docs/micro-rank-comparison-2026-10-21/replay-failure-v1.json`. Repair supplies a replay-only ranking clock to initial/preset ranking and derives completed 5m bars from genuine cached minute history. Live ranking still uses the wall clock. Both causal symbol selections, formulas, costs and gates remain unchanged. New source 431ca46de2df501dc8ac340e1acb5254054540237fe096ed4c0552cfc3f502ec; paired v2 freezes both protocols before scoring. Twenty targeted selection/runtime/report regressions pass; full CI and detailed HTML pending. No live execution, settings writes, deployment or reload.

# Requested paired 12-symbol comparison frozen — 21 October 2026 (UTC)

Latest user requests12symbols,12hTradeSim +12h evaluated prehistory,1HVolatility vs1HChange, detailed HTML
with multiple charts; push/merge remains authorized after completion. `docs/micro-rank-comparison-2026-10-21/expected-v1.json`
freezes source61b56, all868Micro/Inverse sources, identical full grids/fees/WF/account, both actual normalized
settings and the selections before any performance scoring. Production volatility1h uses the last THREE completed
1H candle ranges; change1h5m uses exactly twelve absolute consecutive5m returns/12. Preserve those actual rules.
Both pick the same12 of the same24 archived contracts at19Oct12:00UTC, in different orders; do NOT change the
cut/universe/formula to manufacture a difference. Two independent case runners and full source/execution,
price/cost, funded-cohort, stage and scalar-hourly audits precede a detailed standalone HTML comparison.

Candidate liquidity is reconstructed causally from prior24h minute close*base-volume, explicitly an approximation;
future endpoint tickers/candles cannot enter selection. Selection is fixed at the start, not retrospectively re-ranked.
Native archive coverage:18Oct00–20Oct00UTC; indicator-only warmup24h is separate. Keep all losing/empty results
and capital feasibility. No new financial results exist for these cases yet. Research helpers/tests/protocols do not
change the preserved main production source61b56. Four causal/formula/actual-prepare/tampering regressions pass;
the expected settings/selection check passes from a different output directory. Detailed HTML must be rendered
and visually checked on desktop/phone before delivery. No venue actions, live reload or deployment.

# Finish Micro verification on main720 — 21 October 2026 (UTC)

Main advanced to 720299c235b6a50ca223daa1b5e9d2d935bf36c4 via the combined Inverse/incremental merge,
already including Micro f03a36d and all 6/12/24/48 breakouts. Preserve its complete production source byte-for-byte:
61b56cee42745c066877f8b605041dcb54274a874d8686a7f1fe52b2f6a5ad46. The finishing PR adds no production
calculation changes. Retain the UI document-commit request observer fix, derive the negative Focus fixture from
MAX_FOCUS_PAIRS, isolate the genuinely blocked optional next-day research, and retain verified v5/v6 evidence.
Main's retained full 260-file CI and 20-symbol streaming/latency study belong to source61b56; this continuation's
24-symbol v5/v6 PF belongs to BF/7f source only. Freeze universal v10 and 24-symbol v7 before any new scoring.

Source7f completed two full24-symbol runs (39538794094 and39539472043): 373,222 funded modeled settled closes,
PF1.5730241054, 60 report checks, 1,036,596 own scalar decisions and185,520 transitions without discrepancies.
Latest prior branch3f full243-file partition CI39539852016 passes, including all235 ordinary files, seven heavy,
runtime and both120-symbol load jobs. Three negative hours, Micro PF0.79398 and capital infeasibility remain.
The newer source61b56 has not yet completed this continuation's24-symbol replay; never relabel older results.
No actual exchange orders, live settings writes, deployment or reload. PR184 still awaits its finishing checks.

# Main PR189 integration in verification — 21 October 2026 (UTC)

Main advanced to 3e2c11317cc5cc38300432e7e1e11ad4e669a3dc (PR189) before the authorized merge.
Integrate its independent Signal/coordinator rebuilds, own historic range floors, bounded fitting progress and UI
request fix. Keep this branch's immutable captured candle snapshot and generation/economic publication fences;
coordinators use their own grids on both worker and local paths. The expanded current runtime source is now
7f29b92555e77144326b374623f9fa14114d6f0cc21692c9b336b30d05241ccd. TypeScript passes. Freeze universal
v9 and 24-symbol v6 before scoring; v5 below remains evidence for its own source, not automatically promoted.
Fresh complete default/heavy/runtime/slow/stress/universal/financial and report checks are required before merge.
The blocked next-day workflow explicitly checks out f03a36d1, its original BF source and frozen plan, and keeps
its seven sealed candidates unchanged. New-main economic studies require new protocols, never rewritten seals.
No live reload, deployment or venue action.

# Expanded Micro verification — 21 October 2026 (UTC)

Current runtime manifest bf502cd9046ea8d3fe23701b0e549521618a143be948ba38f2269df7534d95a2,
868 independent Micro/Inverse sources, OHLC breakout horizons 6/12/24/48. The complete 24-symbol v5 historical
run passes all 60 report checks, every price/cost and source/execution comparison, 105,577 scalar tape checks /
1,036,596 hourly decisions, and 185,520 initial-set transitions. No gate or cost was changed to improve results.
373,222 funded modeled settled closes, unit PF 1.5730241054, nine positive / three negative settled hours.
Micro remains 0.7939837207; Minimal 2.0994887024, Short 2.4444110152, General 1.4737436987, Wide Exit 0.4656176670.
Base Micro representative PF 1.9240662812; initial Micro config gates PF 2.5891269435. These are different historical
cohorts. Identical funded execution/source cohorts match exactly at every trade and hour. The uncapped complete
grid is capital-infeasible (maximum modeled margin $32,063.20 against $10,000 initial capital); no live-readiness claim.
See v5-verification.json, retaining all losses and exact artifact/source checksums.

Earlier positive 9-symbol control re-run at the same 0.15% cost yields PF 2.5770087633 / 1,562 closes at both old
846d9aa and expanded bf502cd sources: every identity, unit return, total and hourly result identical. That original
uncapped sizing is also capital-infeasible; see legacy-expansion-parity.json. It is regression evidence, not a new
868-source performance sample. Previously archived studies and failures remain immutable.

Current-source heavy/runtime/stress/Axis-stress/universal/slow and Exact Signal builds passed. Ordinary CI exposed
one stale completeness fixture still expecting 1,001 focus pairs to exceed the former cap. It now tests the explicit
MAX_FOCUS_PAIRS + 1 boundary; all 314 completeness tests pass locally. Economic source is unchanged. Fresh full
CI is required at the test/workflow checkpoint before the already authorized push/merge. PR 184 remains open
until those checks finish; main backup fafdea2 exists. No deployment, live reload, settings change or venue orders.

The additional next-day attempt sealed seven training-only sources before acquisition, then failed on all 24
20 October archives (HTTP 404); the local official REST probe is HTTP 451. No later-day trades/PF exist. The failed
run 39536098285 and hashed selection are retained, not relabeled a pass. Additional research is isolated in the
explicit Frozen Micro next-day validation workflow, which recovers that same selection, checks source/script
seals before data acquisition, resumes retained archive failures and fails normally on unavailable data. Core
24-symbol correctness CI continues to run the entire original historical scope and seal its selection; nothing in
its calculation/financial assertions is waived. Do not reselect from holdout results or claim hourly profitability.
# Combined release verification — 21 October 2026

Authoritative combined production source: bb8b35674f282e9fe97c7220b8b28892fbf99fac, economic seal61b56cee42745c066877f8b605041dcb54274a874d8686a7f1fe52b2f6a5ad46. Maineb3c989 (including reviewed PR188 and PR189) is integrated without any source/test change; backup/main-before-combined-merge-20261021-eb3c989 preserves it. User explicitly authorizes final push and merge of PR186. Earlier handoffs below retain their historical scopes and pending states; current evidence is docs/combined-verification-2026-10-21/index.html and README.md.

Complete current-source CI:260 ordinary files,3095pass,zero failures/cancellations;2 optional slow cases pass separately;675scripts+8absent-template skips;83app/auth/component cases;types/build pass;lint0errors43existing warnings. All1860sources and627984synthetic identities pass; native20-symbol96h history with six hourly and three unfinished-bar cuts has zero violations. Source jobs:39538587337(core+120symbol stress),39538587353(slow+universal),39538587335(scripts/UI/app/types/lint/build). Exact Signal39538591254 checks/build pass; frozen archived financial arms are intentionally not rerun against a different source. Redundant full-default Exit workflow39538591261 is separately visible. Preserve failed former-focus and pre-fix lifecycle receipts; raw PF under1 remains normal for all types and no gate/cost/loss/golden output is weakened.

Warm20-symbol progress:505/2635configs,512admitted direction windows, all own Last15/15;60/60cycles under500ms, median94.14ms,p95177.32ms,max235.71ms. Tick median0.43ms/max1.87ms. Independent oracle505tapes/172109closes matches every column/prefix/open/pending value. Cold build10.89s,bootstrap4.27s,peak diagnostic RSS1337.34MiB include cold/oracle; network/venue excluded. Separate120-symbol868-source synthetic stress:2complete computes,100coalesced kicks,max1concurrent compute,4130native-progress callbacks;463s and3597MiB peak are cold-load scope. Reused retrospective data is not new held-out profitability evidence.

Integration includes Microf03a36d,Signals9444596/mainPR189,reviewed X02 3b427b3,Inversecc29163 and prior main work. Preserves stronger complete Historic Exit restoration, strict direction/ownership/unit/unknown-overflow proof and pending native-generation fences. Newly found: settingsStale never cleared after publication, preventing continued light processing and native entry release; now cleared only at exact revision publication while executionPending remains until matching Paper completion. Light cycles retain hourly seats. Exact former939-entry default Focus upgrades once to1079, including presets; custom/off choices and disabled kinds remain intact. New 6/12/24/48-bar OHLC, activity and failed-channel siblings are independent, with neutral momentum confirmation corrected.

No hosted reload, actual account/ledger/settings mutation, deployment or venue order in this audit. Before any real reload, identify authenticated target, back up settings/state/database consistently, verify built worker/running SHA and reconcile owned positions. A source merge is not evidence of live profitability. Existing other-chat research windows/source seals remain distinct; do not certify their frozen financial results using this source.

# Signals progression recovery and publication — 21 October 2026

[PR 189](https://github.com/mxssnx-creator/CTS-A-O/pull/189) publishes tested code `534492d622db6be370079e08b94fdbb2dfbb566c` (local `ef0a9275247e22339b17e33f4847e77893fc26d9`), with identical Git tree `9442ef46aef790ad27eb68c47af26ad5ef7c0479`, based on main `fafdea2f5ebe8c903a16f2edd8be34606f746c2f`. Test-harness and lifecycle-reference follow-ups leave production source unchanged. The user explicitly authorized push/merge. Refer to the PR's final checks and merge record for complete default/slow CI and the final merge SHA.

Independent Signal history now matches across full workers, local fallback and incremental rebuilds. Coordinators retain their own rebuild grids and enabled-range historical PF floors. Historic progress covers sampling and candidate evaluations with cancellation checkpoints, and the UI labels variant/candidate counts accurately. All three recreated actual-runtime regressions fail against the original runtime and pass after the fixes.

Fresh verification: **294/294** tests in 21 files, **3/3** complete-job progress tests, **4/4** functional desktop/phone UI tests, TypeScript and production build pass. Changed-file lint: zero errors/five existing warnings. Development and rebuilt Settings render correctly on desktop/mobile with no errors/overflow/baseline divergence. Packaged worker SHA-256 `e6f95d8ecd2f4c08d8b3e056e6898ce86e7d678fb8653bb17e0a564fc40817dd` contains the new progress implementation. Details and evidence boundaries: [signals-progress-audit-20261021.md](signals-progress-audit-20261021.md).

The old unpushed audit commits were absent after workspace restoration; this is freshly reverified recovery on current main. The completed legacy lifecycle run exposed a reference that still used short strategy history for Signals. The corrected bounded fixture uses independent Signal history/coordinator grids, asserts exact hourly seat retention and preserves full tape/paper comparisons: 2/2 pass across three cycles, 49,719 tape states and decisions covering 7,446 open positions. Typecheck and lint pass. Complete default/slow CI is linked in PR 189. Initial CI also exposed abandoned Vite module requests in the UI wait; the corrected finite-data wait passes all four local UI checks, typecheck and changed-test lint. No hosted reload, database/settings mutation or venue action occurred. Merge alone cannot certify the remote live process; verify authenticated deployment access, backups, rebuilt worker, running SHA and owned-position reconciliation before a live-effect claim. Existing economic research seals and qualification thresholds are unchanged.

# Combined system verification candidate — 21 October 2026 (Europe/Vienna)

# Micro expansion and next-day verification pending — 21 October 2026 (Europe/Vienna)

User explicitly requests the additional 6/12-bar breakouts and push/merge after completion. Main remains
fafdea2f5ebe8c903a16f2edd8be34606f746c2f; PR 184 is open. Current source manifest
bf502cd9046ea8d3fe23701b0e549521618a143be948ba38f2269df7534d95a2 adds independent OHLC breakout horizons
6/12/24/48, activity and failed-auction variants, all seven 1/5/15m subsets and both inverses: 868 first-class sources,
984 including legacy identity cases. Full registry 1,860 specs / 37,786 eligible bot/lane pairs. Default focus now exceeds
the former 1,000-pair validation cap; a bounded 2,000 cap keeps the expanded default valid. No economic gate weakened.

Concrete fixes: reject neutral-zero momentum confirmation (before-fix regression fails); Signal forward proof now
uses verified funded unit returns, finite explicit legacy multipliers and unknown-prefix Last-N rather than volume
or implicit one. Sliced proof reference preserves this contract and measured positive fixtures. Explicit raised-lane
fixture carries its Block level instead of inferring external provenance from ordinary volume. The latest targeted
Micro/Inverse/worker/identity group passes 14/14; preceding native/proof group 56/56 passes; audit/selection 10/10
and typecheck pass. Full current-source CI, expanded financial run and next-day validation are still required.

Previous 24-symbol v4 (846d9aa source, CI39532140644) computes all grids and passes all report/price/cost controls:
257,095 funded settled closes, unit PF 1.5369277555. Micro separately 0.7450644243; Minimal 2.0475000964;
Short 2.3868199477; General 1.5338949061. Nine positive, three negative settled hours. Source/execution returns
match; round trip 0.15% once. Original scalar audit failed because it pooled directions. Corrected independent
reference checks 87,234 tapes / 846,432 decisions, zero differences, missing histories or unexplained transitions.
Transition replay checks 175,272 initial-config decisions, zero mismatches after honoring the zero rejected-summary
contract. Both losses and initial CI failures remain retained. The two complete core-CI failures are fixture
provenance mismatches (lane-orders/live-stall); their repairs have focused passing evidence, not yet final CI.

Frozen next-day-plan-v1.json consumes only Micro-range funded training closes through 20 Oct 00:00 UTC to choose
an optional research shortlist; all config/direction/type/range gates still operate independently. Seal before
acquiring next-day native archives, evaluate 20 Oct 12:00–21 Oct 00:00 with independent 12h prehistory and 24h
indicator warmup. Preserve no candidate, insufficient, losing and failed collection outcomes; do not reselect using
validation. Universal v8 repeats all hourly and unfinished-bar checks on the expanded source. No merge,
deployment, live reload, setting write or venue order has been performed by this continuation yet.

# Nonfinite historical multiplier guard — 21 October 2026 (Europe/Vienna)

Before authorized merge, a new regression proved explicit Infinity in a legacy execution multiplier converted a loss to zero in SQL, falsely proving Last-2 PF. The engine and legacy relation SQL now accept only finite positive multipliers; zero/NaN/±Infinity remain unknown. The unknown row stays in its current own window and cannot select older wins. Engine/relation34tests pass, typecheck passes. Before-fix failure is retained in nonfinite-multiplier-before.txt. Main187's explicit legacy read also has the required classification comment; the source-scan guard remains enforced. Integrated UI4/4,225native/parser/control and68merge-targeted tests passed; full CI is still required at the new exact source.

Freeze a new24-symbol v4 attempt because the runtime source changed; v3 CI39531317444 and39531620068 remain superseded same-data studies, with no scoring-based retuning. Both retain identical economic settings/feed/windows; the new change only refuses invalid legacy multiplier evidence. Never relabel their source as the new one. Main backup fafdea2 remains valid;184 not yet merged. No deployment or actual venue orders.

# Main PR187 integration — 21 October 2026 (Europe/Vienna)

Main advanced to fafdea2f (PR187). Preserve its operator-approved x02 patch and explicit --legacy snapshot CLI. Backup branch backup/main-before-micro-merge-20261021-fafdea2 exists. Resolve overlapping trailing restore with the stronger complete scalar/ratchet/Historic Exit state restoration. Preserve the correctly scoped profiler directory else clause. PR187 also added a raw-r fallback for unknown Block unit evidence: this violates the standing unit-provenance rule and is removed; intentional unweighted synthetic fixtures already declare mult1. --legacy CLI stays labeled diagnostic, never ownership proof.

Economic runtime manifest remains exactly d85c8303696e07532beed81a710f7cd7c3f02ab5a4de0b7f586b51676de55de8 across this merge. Therefore ongoing frozen24-symbol study39531317444 and universal/slow39531317376 remain same-source evidence; require fresh full integrated inventory and PR checks at the new branch head before merging184. The final225/225 native+parser+control tests have zero failures, cancellations or TODOs; their complete log replaces the earlier in-progress snapshot.24-symbol study is scoring in CI, not yet a completed result. No venue execution or deployment.

# Native processing and accounting repair checkpoint — 21 October 2026 (Europe/Vienna)

User again authorizes Push/Merge. PR184 remains unmerged until fresh full checks pass. Remote checkpoint da88518d5355c898df7b19c5e939329487103699 (same tree as local ee9754f) retains all earlier failures; this checkpoint repairs the remaining reproduced integration defects. Both former take-profit-wording TODO cases now execute on long/short: exact too-close TP messages receive the same bounded retry as stop/trigger refusals; other venue errors retain their normal handling. New real fixes: mark-to-own-stop risk no longer clamped to a nearer backstop; immutable captured volume projected once; minimum-lane ordinary legacy entries retain one unit while explicit external factors stay fractional. Retained-module schema now gains nullable mult too. A generic external Flat marker previously skipped suppression because record() set keyState closed; manually closed positions reopened. Flat attribution/suppression now continues, including never-observed confirmed entries and measured full exits found on a wider relaunch history. Partial/unknown ownership freezes rather than declaring all own quantity closed. Unknown legacy volume cannot supply an external return multiplier or disappear from the current Last-N window.

Paper statistics use the append-only held forward book with its captured owned_notional_usd/vol and already weighted r exactly once, preserving unknown cash PF instead of re-pricing at today's paper settings. Nominal re-simulation is a different cohort. All old failed evidence remains. Focused native lifecycle177/177; owned-paper/budgets66/66; legacy proof/records/paper-runtime78/78; simulation-side84/84; paused-side9/9; full-versus-extended tapes10/10. Final combined local inventory was interrupted during real runtime setup under shared workspace memory pressure (other workspaces are not terminated); it is NOT a full pass. Fresh isolated full CI must cover all242files and both slow tests. Native boundary + parser final group is recorded in native-boundary-final.txt. Last typecheck passes; previous production build passes before the last source edits, so repeat exact-source build in CI. Lint has41existing warnings, zero errors.

Axis120-symbol real-runtime stress: six distinct lane sources ×45variants =270built Axis tapes, two computations,100coalesced kicks, one active computation,658MiBpeakRSS,14.625s,100msnative callback130calls. This is synthetic functional evidence, not actual API latency or profitability. The initial failed Axis fixture incorrectly expected diagnostic allSets to build all sibling lanes; that mode selects a best lane per indication. Fixed fixture uses six distinct sources spanning1/5/15m without weakening qualification.

A controlled replay against original9c037e2 with the identical fully frozen candidate harness has zero differences in every output field and option,42settled orders/48feed rows, identical four steps; old checksum drift was unrelated disabled Block/DCA/Axis metadata. Baseline parity receipt is adjacent.

Requested24-symbol retrospective12hprehistory+12hTradeSim remains pending. Attemptv3 is newly frozen by the committed launcher/CI before scoring. The public1mhistory is now persistent (reproduction-feed.json.gz plus48archive checksums/CRC manifest). Warmup24h is separate. New CI runs all built histories and funded PF/stage/scalar-hourly audits. Never reuse superseded v1/v2 as current proof or infer hourly market positivity. No deployment, live reload or actual venue order performed.

# Extended Axis / symbol ranking work in progress — 21 October 2026

Latest user steers: retain independent Axis sets and all coordinations; Axis execution volume per set =0.1 of the corresponding base set; exchange symbol selection =mean absolute percentage distance of twelve successive5m intervals over the last completed hour, sum/12. Symbol ranking uses13 genuine completed native5m closes, not a net hourly move or smoothed endpoints. Four bounded workers and shared per-feed, per-symbol immutable5m caches retain original REST pacing. Missing intervals/unknown history fail explicitly. Six ranking cases pass; Settings save/reload and every page on desktop/phone pass4/4. The initial local all-scripts run has666passes, zero assertion failures, eight absent-template skips and four cancelled UI cases solely because the default browser executable was absent; the explicit bundled-browser rerun passes4/4 including persistence of the new ranking.

Actual new bugs reproduced and fixed:90 Axis config/source/variant identities collapsed into one order; preserve full Axis identity, exact retries still dedupe. S2 unknown/overflowed closes failed open and tiny losing relation windows became no-loss winners; canonical PF and retained bounded unknown samples now hold them. Relation SQL ignored verified unit_r and guessed legacy volume; stored NULL remains unknown, matched rows remain in the sample, partial known subsets cannot judge. Legacy snapshot CLI remains a clearly labeled normalized diagnostic while full executable-book relation is preserved. Native lane projection reapplied an already captured range factor and resized held positions on settings edits; use captured volume once. New Axis0.1 execution factor shares the existing captured volFactor provenance through simulation, Paper, pending and native projection; unit PF remains unchanged. A further real full-versus-incremental trailing bug lost the reusable trailing object on resume; scalar state alone was insufficient. Restore ratchet and Historic Exit adaptation state; expanded38-case resume test passes, including all five Historic Exit policies.

PR184 is NOT merged. Remote head before this checkpoint:6e93533cbedb2a2ee22ebe11c161583e5412e1b0; main remains6cc6ef8. Complete prior1070 CI39524969204 exposed132failed and13cancelled tests in16ordinary files (not green); heavy/runtime/slow/universal/stress all pass at that OLD source. Ordinary ZIP SHA256 verified at runs/ci-evidence-39524969204/ordinary; report lists exact failures. Mostly integration fixture/contract drift remains to classify; backtest-resume/tape-extend were genuine production bugs. Local focused455/456 had one pending-timeout reconciliation assertion; exact two-case isolated rerun passes after an explicit unavailable-account fixture repair. Keep the full-group failure and investigate if repeated. Do not call a subset a full pass. Schema/ownership/account/budget/side-gate/report fixtures and resume extensions still need complete repair and re-verification before merge.

24-symbol archive acquisition succeeded:48official Binance USD-M daily archives (18–20Oct),69,120native1m bars, zero gaps/duplicates/errors.728Micro/Inverse sources, 12h prehistory +12h trading, separate24h indicator warmup, modeled cost0.15% once. Attemptv1 at1070 deliberately interrupted with own-sessionSIGINT before completion when wider bugs/new requests changed source; protocol/log/harness retained under docs/micro-24-sim-2026-10-21/interrupted-v1. Attemptv2 at3051197c was only prepared, never scored, and is superseded by subsequent Axis volume/resume fixes. Freeze a NEW exact-source protocol after fixes, run all24symbols, all built tape histories, funded exact-cohort parity and scalar hourly --require-all. No new24-symbol PF exists yet; no profitability claim, live reload or venue order.

# Final integration check follow-up — 21 October 2026

Combines published Inverse/performance PR 186 (7acdb355), Micro PR 184 (de1b87f9), main PRs 182/185 and main PR 181 (6cc6ef8). Current economic source manifest: `4c5aa081359cf084d5e8c37ecd0bb9bf8b39372475fc6d41ee9ce978ff4cb160`. Current candidate includes the further Micro/main181 checkpoint remote 6e93533. Production build/packaged worker and 94 focused lifecycle, cost/grid, atomic/cell-publication, long-Signal-history and API-budget tests pass. The preceding candidate passed the 44 simulator-continuation/identity/validation-memory regressions and TypeScript; complete final-source CI remains required. The preceding Micro integration checkpoint passed 97 focused tests. Initial duplicate-import/type seams and the detached callback stop race were corrected; earlier failed attempts remain in runs/functional-integration. Full combined current-source CI, 20-symbol universal audit, final performance remeasurement and UI verification remain pending at this checkpoint. Do not claim old market/latency results certify this changed source. No deployment, venue calls, live setting changes or orders in this integration task. User authorized push and final merge after verification.

Retains the owned-worker foreground path, independent Signal histories, full Micro/Inverse identity, exact Base cells/window rules, unit-return PF and funded diagnostics. The earlier main incremental implementation remains as the non-worker comparison/fallback; it must not run beside the primary worker continuation on the same cohort. New Base/cell proofs publish atomically. Pending native planning yields and checks its generation before calling the venue adapter. See docs/combined-verification-2026-10-21 for the frozen scope and subsequent evidence. Earlier handoffs below retain their own historical source scope.

# CTS-A-O operations handoff

## 21 October 2026 (Europe/Vienna) — incremental cycle release evidence

# Integrated PR 185 checkpoint — 20 October 2026
Final fixture follow-up: the integrated full core run reached all 209 files with 2,476 passes, nine stale fixture failures and two slow skips. The five corrected files pass **137/137**: separate positive config-direction proof for candidate-book tests, a fixed pending-bar clock, true Trade-return loss changes rather than detached prefix-sum edits, correct 4% mark-to-stop arithmetic, per-direction hand-counted validation and separate symbol-PF proof. Production code and the v6 economic source seal are unchanged. Final complete CI is linked in PR 185.


Current integrated code **`597670092e3f385d9786fd023d4ddbba66a99939`** preserves main **`dc8c3bb6a8a4d6176157534a6a9ecbf5773740f8`** (PR 182); backup `backup/main-before-pr185-20261020-dc8c3bb` exists. Engine direction/proven-symbol guards coexist with stricter Signal config/symbol/direction proof, capped trailing-only and weighted DCA. A reproduced Signal held-only cache defect is fixed: red before, 14/14 isolation cases green after. Integration made no venue/deployment/settings writes. X02 was reconfirmed read-only at 22:18:58.324Z with zero positions/orders.

Integrated simulation/native group: 613 passes and one lifecycle snapshot mismatch, then the corrected snapshot passes 1/1. The merged fixture explicitly freezes its old window/Exit-option inputs; the complete parsed result matches pre-merge source with zero differences (60 input, 48 feed, 42 settled). TypeScript and research-protocol 8/8 checks pass. Final complete CI and release commit are linked in PR 185; pre-integration 208-file counts below are distinct.

Integrated comparison `v6` seals source **`00ea02f0cdac575476cf7f7451b007c425ff70f38af761ec8f2929ce81b618ef`**, the same public 600h feed and the predeclared sixteen-arm selection protocol. Its final results are in PR 185 and the standalone report. The v5/e2414bbe figures below belong to the pre-integration revision, preserved with its exact original 130-file sealed source; its protocols are not rewritten to certify changed code. Empty samples and no-loss scores remain explicit, and reused retrospective results cannot establish consistent profit.

# GitHub merge scope — 21 October 2026

The user explicitly instructed "Merge github" for PR 182 after receiving the documented partial profitability result. This authorizes merging the verified admission fixes while retaining the losing multi-range window; it supersedes the earlier keep-draft instruction below. It does not establish a profitable release or change live settings, deployments or venue orders. Backup `backup/main-before-pr182-20261021` preserves main `4588030b946740d493cf0e0d629aa2722aa6211c`.

Merge preparation found two failed CI workflows on `6ed27d61`: Exit verification stopped at a stale UI fixture treating the implemented Breakeven suffix as unknown, and the archived 17 October study correctly rejected the changed economic-source inventory. The UI fixture now covers all five supported Exit families/directions and retains malformed/unknown rejection. The archived data/research chain is explicit workflow-dispatch only, matching the already reviewed PR 185 change; automatic current-code build, worker, report/audit and independent-config checks remain active. Economic source hashes and the study's strict source-drift guard are unchanged. Final local follow-up: app/components **80/80**, exact-study guards **9/9**, TypeScript and workflow YAML validation pass. The 499 segmented source checks and original economic results below remain unchanged; a full default/core green run is still not claimed.

# Direction and empty-symbol causes — 20 October 2026 (pre-merge evidence)

Frozen production implementation: `b545bfda5280de4b8b5afcd29141fbc7e813d850`, including direction fix `d61c1fadaba89c5b6808b914e6246d1b34d982ed`. Published code checkpoint: `26a5107e5b931493dee3878b3274ca315fe282be`, exact local tree `bf8fb60609f182e4a2d86966590ef96dcaa940f9`. Draft review: https://github.com/mxssnx-creator/CTS-A-O/pull/182. Main remains `4588030b946740d493cf0e0d629aa2722aa6211c`; no live reload, account/database change or venue action occurred. The earlier pooled-direction admission policy below is superseded.

Fixture and complete-evidence checkpoint: local `d3836e04e36f57c83b8ef0425e9d05a3db5162df`, published `4e92b4f24acb5db6bf5c1fb56ff465274039e599`, exact tree `91639643f1722d2f1ab0a8485a2ea8773b175f90`. All 499 segmented checks apply to the frozen production source plus these final qualified fixtures. Subsequent publication-note changes affect documentation only.

Two concrete evidence leaks explain previously admitted losses. All 6,716 Shorts in micro12-d1 borrowed Long sample/PF/confidence; the first config had 18 Long closes/PF 8.116158 and zero Short closes. Full configured evaluation now runs per config/direction across symbols through fixed/hourly/Durable selection, every entry and native promotion. Only passing directions contribute to validated aggregates. The separate configured symbol gate remains separate; do not reimpose the full twelve-close config minimum per symbol. Candidate learning retains rejected rows and historical/executed losses. Cached held-only eligibility refreshes correctly on reused arrays, with bounded compact direction views and early rejection of definite failures.

The direction-only 22-symbol repeat still had 1,184 closes/PF 0.408581. Its `provenSide` warmup incorrectly accepted 504 entries with zero own symbol/side closes; all 504 lost. `proven`/`provenSide` now require an observed result even with warmup or symMinN zero. Positive observed thin samples retain configured warmup; other symbol modes are unchanged. The complete final repeat settles **680 modeled orders at PF 1.337123**, reproducing the independently identified own-symbol cohort. Every final order passes current exact Base/config/direction/symbol proof.

Nine immutable final runs are detailed in `docs/sims/direction-qualification-cause-20261020.md` and `.json`. Four 12-symbol Micro windows and three older 22-symbol windows execute zero orders (PF unavailable); their explicit current-direction/symbol or historical evaluation failures remain recorded. The bounded multi-range run still settles **193 Minimal orders at PF 0**. All 873 final executions match their exact candidate prices/exits/reasons/unit returns with zero differences; all have own-symbol history. The losing Minimal cohort had own-direction PF ≥2.267510 and own-symbol PF ≥1.106383 at entry. Prefix audits total 56 comparisons with zero changed historical closes across the tested sources. Costs remain 0.15% once, Micro maximum hold 15 minutes and independent Signal history 336h. These are cached retrospective model results, not owned fills or an untouched alpha holdout.

Final verification: focused continuity/native/Base/lifecycle/Last-N **127/127**, broader 17-file simulation checks **132/132**, other 17 simulation files **204/204**, and the unchanged slow Block runtime matrix **36/36**. These disjoint segments cover all 40 simulation files plus Base/native tests, **499 passing tests** in segments. The first broad attempt had five stale Block fixtures; their corrected files pass in the final repeat, with full own config evidence and unknown-return rejection. No production threshold was lowered. TypeScript and production build pass; the newly rebuilt worker is explicitly checked for the empty-evidence guard (worker SHA-256 `6885033230af49e80c53f02d6749c6f497326f4424c68fa824bd126a1d52c94a`). DATABASE_URL was unset and migration was skipped. Lint has zero errors/28 existing warnings; desktop/phone functional UI passes **4/4**. The earlier broad 43-file command was interrupted under shared 8 GiB host pressure; no single all-core green invocation is claimed. Complete source/settings/feed/protocol hashes and all final/failed outcomes are preserved in the new JSON evidence. **The requested consistent high PF across ranges/windows remains unmet:** the bounded run and two active hours of the positive aggregate window lose. Keep PR 182 draft; do not call this an exhaustive bug-free or profitable release.

Final PR refresh: 15 open including this review. New concurrent research PRs 183 (`cc291637`), 184 (`4542d60d`, forked from the old integration head), and 185 (`e1d337e0`) do not yet include these two engine admission guards. Their Inverse/Micro grids, history/memory/API work and Signal/DCA/Block default changes remain separate; preserve the current independently tested guards when reconciling them. PR 181's latest `26a0ab63` also adds account-specific x01 wallet risk/exposure scripts; do not promote them to global policy. Exact refreshed heads, changed production-file inventories and selected evaluation/default diffs are in the new JSON report. The earlier eleven-PR integration disposition is retained below. Main was re-fetched and remains unchanged.

# Final-window admission correction — 20 October 2026 (superseded direction policy)

Core source `545d58977617d175892e747f3b09d787216ac779` continues the exact PR 183 tree on `codex/incremental-cycle-20261020`; review is https://github.com/mxssnx-creator/CTS-A-O/pull/186 (base `codex/inverse-indication-20261020`). Live BingX/non-replay continuations keep only selected validated configs plus held exit-only identities, captured simulator recipes, exact numeric source/market state and immutable append-only tapes. Discovery/Base/set evaluation remain background work on a five-minute default. Default fast entries cover all selected indications; explicit off/Break overrides remain. Research publishes its exact policy, tapes and book atomically. Partial symbol pulls are not consumed, cosmetic ticker metadata has its own five-second deadline, every changed progressive symbol population forces full research, and a replacement cohort immediately catches up even when its predecessor consumed the current bar.

Cycle and tick timers re-arm only after completion. Historical Live Real scans and large tick books run on bounded owned workers. Worker timeout/exit, Compare rejection/timeout and stalled paper ownership have scoped cancellation, generation fences and bounded retirement. No failed historical worker workload is retried on the main ticker. Background Compare does not block ordinary foreground updates. Guard/acceptance maps fork immutable groups; trailing changes made during a sliced paper update survive atomic publication. Private math uses geometric capacity; higher-timeframe OHLCV storage uses its own bar count. No requested history, losing observations, return math, PF floors or exact Last-N scopes are reduced.

Final frozen-source measurement (`runs/realtime-cycle-final-cohort.json`): 20 symbols, 1/5/15m, 636 post-Base/config-qualified production seats from previously executed identities, 60 chronological completed candle updates. Complete warmed cycle median **149.78 ms**, p95 **253.81 ms**, max **301.48 ms**, **0/60 >=500 ms**. Actual tick max **8.04 ms**. Every numeric tape/prefix/open/pending field on **636 tapes / 107,276 historical closes** exactly matches an independent full-history rebuild. This is a bounded previously-executed subset, not every possible qualified Discovery config. Already-received finalized candles, network/venue latency excluded. Cold candidate build **18.56 s**, private bootstrap **8.26 s**, full-history oracle **5.63 s**; total benchmark peak RSS **1298.26 MiB** includes archive/build/oracle, not just the warmed worker. No profitability claim. Core manifest SHA256 `ccd21b5bb3269ec58970bc6d044fbcbde4282b342632685d3aadf6f15f57acbf`; input archive `1373d0a7fab7528d0528573385e19dfecf6f4ab353194231c639103af29aadcd`. Prior failed/outlier attempts remain in the standalone report download.

Final focused regression: **133/133 in 15 complete files**, including source/math/market/cursor/tape parity, both directions/all simulator families, exact Real-worker results, late trailing publication, ingestion, generation/ownership/Compare recovery and every originally failing functional fixture. Replacement-specific suite **12/12**. Broad developmental run: **2,363 passed / 2,372 tests**, seven original failures, two optional skips, 220 files; the new Real-worker test adds the 221st file in focused coverage. Six functional/test-handshake findings were corrected and rerun; the unchanged strict cold responsiveness test passed twice in isolation after a 331-ms slice outlier. **This is composite evidence, not one immutable all-green broad invocation.** Cold synthetic stress can still have longer main-thread slices; the 500-ms proof concerns warmed Live continuation. Optional stress tests passed **2/2** in 395.01 s: mixed-operation storm, direct and queued two-day backtests, plus the actual clamped 30-day calculation with persisted finite verified unit-return PF and aligned diagrams. These tests started on `5bbe522`; the final Live-only cohort marker correction is independently covered by the 133/133 final suites and 12/12 cohort check. The interrupted earlier slow attempt remains archived.

TypeScript, production build and full lint passed (0 errors / 27 existing warnings). Actual packaged worker: three exact checks passed (incremental tapes, full historical Real, Long/Short tick). Dev/built desktop/phone UI: 4/4; report desktop/phone: 2/2, six SVGs, no document overflow and exact embedded archive download. Final artifacts: `docs/sims/incremental-cycle-20261020.html`, `.json.gz` and `incremental-core-verification-20261020.json.gz`. Reproduction/verification: `scripts/perf/realtime-cycle.mjs`, `report-incremental-cycle.py`, `collect-incremental-verification.py`, `verify-incremental-report.mjs`, `verify-incremental-built-worker.mjs`.

No main merge, deployment, live reload, account mutation or venue orders occurred. The running deployment identity/settings/database remain unverified. Previous economic studies below certify their recorded source and scope, not this release's live profitability or execution. Do not claim universal hard realtime, every-hour gains, venue fills or a live-profitability guarantee from these measurements.


## 20 October 2026 — systemwide memory corrections and final twenty-symbol evidence

Production economic source is local `5fac4ba` (remote `a22ee02b4b9a07390146cb40e055e405803cfd32`, tree `46b13a1f0ee13f96e5ea9ee806ea875113095cbb`) and still exactly matches all three final replay manifests. Later changes are test fixtures, benchmark fixture inputs, report generation, evidence and this handoff. Latest published checkpoint before final artifacts: remote `44596e9aba275c397f72305a797265bc7728e035` / local `fea38fa`. No deployment, account, venue order or live reload occurred. PR 183 remains a draft; main is unchanged.

Memory corrections: aggregate per-step validation diagnostics instead of config×hour rows; phase-local feed/cache release; allocation-free signal-config classification; early release of encoded engine-side buckets; RAM/cgroup-budgeted automatic worker count and default 2,048 MiB worker heap; actual worker heap OOM aborts without retrying the workload on the live server thread; each shared transfer arena is copied once and already shared bars are reused. Explicit worker/heap overrides remain. History, Float64 return math, Last-N populations and PF floors are unchanged. Project-wide standing instructions are in AGENTS.project.md. Raw PF below 1 remains normal for every indication/strategy type; admission floors begin at Base and later exact-config/range/explicit symbol gates stay independent.

Isolated retention benchmark: 99,520 configs × 24 steps / 2,388,480 diagnostic checks, all insufficient-history failures. Retained heap **268.890 → 29.077 MiB (−89.186%)**, max RSS 527.555 → 271.211 MiB, 2,107.34 → 980.86 ms. This is diagnostic memory, not a qualified trading sample. The 114-source/20-symbol/120h calculation digest is unchanged (`09dd5537326dca5133f6ce9046e5a580d8074411e4efef3c87238b9a6dc66d14`); new cold 1,332.59 ms / warm complete pass 2.695 ms / peak RSS 448.80 MiB. Host-load differences are not isolated causal performance comparisons.

All three final-source public-archive studies completed under 1,024 MiB V8 old-space plus exposed phase GC; typed arrays are outside that limit:

- 6h Base + 6h replay, 24h selection / 120h prior sources: 74/570 Base rows, 26,384 tapes, six Short model closes PF 1.745098, 14 losing open marks, combined PF **0.180679**; 616.88s / **2,933.75 MiB** peak RSS (earlier 3,321.36). Every order and economic field is exactly equal to the pre-memory checkpoint.
- 24h Base + 24h replay, 24h selection / 120h prior sources: 314/570 Base rows, 99,520 tapes, 12,544 closes / 4,075 executed configs, settled PF **1.033879**; Long 5,561 / PF 0.433085, Short 6,983 / PF 2.300745. 2,670 open marks lose 265.177880 unit pp; combined PF **0.995449**; 13 positive / 0 flat / 11 negative settled hours. 844.43s / **4,710.86 MiB** peak RSS. The earlier run at the same heap limit failed after tape construction; full diagnostics alone were not a solution.
- 336h Base and selection / 360h prior sources + 6h replay: 33/570 Base rows, 14,136 tapes, 127 model closes PF 20.147435; 476 open marks lose 562.999720 unit pp, combined PF **0.169864**; 106.47s / **1,064.36 MiB** peak RSS (earlier 1,751.70). Every order and economic field is exactly equal to the pre-memory checkpoint.

All have zero exact-entry qualification violations. Independent Python math.fsum reconciliation verifies settled/marked/combined GP, GL, net and return PF, every hour, both directions and all twenty symbols, using explicit recorded multipliers. Same previously examined, overlapping archive: no independent holdout, funded/margin feasibility, owned fills, consistently profitable Long/Short hours or high live-PF claim. Full ordinary ranges, Normal TP/SL and Trailing retain separate identities; named BTC/ETH references are individual legs, not atomic arbitrage.

Verification covers all **212 core test files** through an ordered 123-file prefix and 89-file checkpointed continuation. The environment recovered during the original full invocation: this is NOT one uninterrupted green command. Continuation: 823 cases, 821 accepted regular passes and two optional cases, both then separately passed (2/2, 497.89s). Four historical failures are preserved: one long-run responsiveness outlier (subsequently passed twice in isolation with unchanged <250ms slice / <1000ms timer limits), two restart fixtures requiring undefined JSON keys (only those keys removed; stops/targets/volume assertions retained), and one historical candidate benchmark hash affected solely by neutral new Inverse metadata (full non-options outputs equal to reference 9c037e2 and all pre-memory/current outputs equal; legacy fixture inputs pinned, original expected hash restored, grouped 106/106 passed). This does not certify a universal live-latency bound. The stress case's observed loop max was 1,391 ms; earlier long-run outliers remain visible.

Typecheck, lint (zero errors), production build and dev/built desktop/mobile app QA pass. Detailed report QA covers three studies, **33 SVG diagrams**, all 114 indication rows per study, source filters, paged order tables, full searches and JSON downloads on desktop/mobile with zero errors/overflow. Tables materialize at most 100 rows per study; lossless execution archives retain full precision and every loss. Factory Focus 211 / upgrade v37 and custom/all/off preservation remain. Inverse fast refresh is explicitly available through CTS_CORE_FAST_ENTRIES=all or 1; existing default break and actual host settings were not changed.

Report display uses Europe/Vienna; frozen raw protocol times remain Unix milliseconds. Final artifacts: `docs/sims/inverse-20-symbol-20261020.html`, metadata `.json.gz`, lossless `-executions.json.gz`, summary `.md`; `docs/sims/memory-systemwide-20261020.json` and lossless `memory-core-verification-20261020.json.gz`. Replay driver: scripts/audit-inverse.mjs; report: scripts/report-inverse-expanded.mjs / report-inverse.py; portable offline report QA: scripts/verify-inverse-report.mjs (CTS_REPORT_CHROMIUM optionally selects the installed browser). Raw local protocols/logs live in runs/inverse-20-*-lowmem-final and runs/memory-core-*. Never represent superseded or interrupted runs as a current completed profitability proof.

## 20 October 2026 — Inverse 114 identities (superseded pre-memory checkpoint)

Operator clarification applies to **every indication/strategy type**: unfiltered source/calculation PF below 1 is normal. PF admission floors above 1 start at Stage Base evaluation; later config/range/Last-N and explicit symbol gates remain independent. Never clamp or remove losing raw observations. Primary validated listings show only passed sets, their matching denominators and configured Last-N/history settings. The standing rule is in AGENTS.project.md and the Stage overview.

Source checkpoint `140f88a` is backed up as remote `3006d2aca68efee1229e3522f27964ba1eb4e603`, identical tree `873b1ce5437d8c787dc8f21cb9c8fddabacc8479`, merging corrected upstream `8e83ee99c7c4e01f5a6cb7df77d07c50c847c709`. Subsequent local `02158fd` fixes bounded synthetic fixtures and adds report details; production economic source is unchanged. Catalogue: 38 known/confirmed, 48 math/market, 16 Micro and 12 BTC/ETH reference-pair identities = 114, 570 eligible Base lanes; factory Focus 211, exact-default-only migration v37. New RSI2-turn and VWAP-deviation use completed causal history. Full ordinary range TP/SL/Trailing configuration remains unchanged.

Completed twenty-symbol public-archive studies: six-hour Base plus six-hour replay (24h config selection, 120h sources) passed 74/570 Base rows, built 26,384 configs, and closed six Short virtual orders at unit-return PF 1.745098; 1/4/1 positive/flat/negative hours, no Long closes, 857.16s / 3,321.4MiB peak RSS. The explicit **336h Base and config evaluation / 360h sources**, six-hour replay passed 33/570 Base rows, built 14,136 configs; 127 closes at PF 20.147435 (2 Long wins without a finite loss denominator, 125 Short closes PF 19.990552), 4/1/1 hours, 107.84s / 1,751.7MiB. Its 476 open endpoint marks total −562.999720 unit percentage points; settled plus marks PF 0.169864. The large settled-only PF therefore does not establish positive ending performance. Both studies have zero exact entry-qualification violations and frozen protocols. Same cached previously examined archive, overlapping windows, not independent holdouts or owned fills.

The 24h Base + 24h replay with 120h sources (314/570 Base passes) is retried with **identical protocol bytes** and earlier garbage collection (`--max-old-space-size=1024 --heap-growing-percent=20`) after concurrent-load memory pressure interrupted the first tape build. Preserve that attempt; no economic score was published from it. The new run is `runs/inverse-20-24h-memory`. The full 209-file regression is rerunning serially as `runs/inverse-20-core-verified.log`; interim failures were stale Signal trailing-only toggle expectations, a fixed Micro catalogue count, misplaced API fixture fields, and legacy aggregate-readiness fixtures reinstalling their exact-proof adapter. Corrections preserve production rules; targeted fixes pass (toggle/count 8/8, live controls 47/47, API 23/23, Inverse focused 35/35). Final full checks/report publication remain in progress.

Native live code allows independently qualified sets without a pooled unrelated simulation veto. Matching post-Base and verified owned execution proof, configured symbol vetoes, account/ownership/risk/protection checks remain. Synthetic native tests cover 12 and 20 symbols, Long/Short entries/exits and stop/TP orders. No venue orders, account changes, deployment or live reload occurred. Draft review remains PR 183. `scripts/report-inverse-expanded.mjs` / `report-inverse.py` generate a standalone HTML report with Last-N-qualified PF/counts, hourly/directional/symbol/range/type diagrams, full settings, source bounds, endpoint marks and runtime/RSS. Final report is pending the complete current evidence.

Realtime refresh configuration remains operator-controlled: `CTS_CORE_FAST_ENTRIES=all` (or `1`) refreshes selected Inverse 1/5/15m lanes on their own closes; the default `break` refresh path excludes Inverse. Full computes still process Inverse under either mode. Do not mistake the cold full-grid research build for live tick throughput or claim that the running host was switched to all-entry mode. The lane contract has an explicit Inverse scheduling check.

## 20 October 2026 — Inverse rebased onto corrected admission scope (superseded progress checkpoint)

Late upstream integration: `8e83ee99c7c4e01f5a6cb7df77d07c50c847c709` / scope fix `5820f50bf520716ca0ca4f6f247f15c06b4cc594`. `walkforward.ts`, continuous-validation tests and inherited audit source match upstream exactly. The previous per-symbol full-config policy was a regression: config minTrades/validLastN/range Last-N must stay on the exact config; the separately configured symbol/direction gate retains its own modes/window/minimum/warmup. Base provenance must not change qualification population, ranking or Durable stability. Explicit losing-symbol vetoes, strict config evidence, exact Base range/target admission and native proof remain intact.

The expanded 102-source studies on that withdrawn policy (967 24h closes PF 8.20, 17 Long closes PF 0.099; losing 6h and long-history cases) are **superseded**, preserved in `docs/sims/inverse-expanded-superseded-20261020.*`; they cannot certify this source. Fresh sealed 6h, 24h and 336h-selection/360h-source studies are running on the corrected scope. Current post-integration targeted checks pass 60/60; source hash parity is verified. Full immutable core regression, build/UI checks and final evidence publication are pending. No main merge, deployment, account or venue action occurred. Inverse's requested high forward PF and live profitability remain unproven.

The upstream investigation and its severe forward losses remain in `docs/sims/final-window-admission-20261020.md` / `.json`, inherited without rewriting evidence. PR 182 is a draft; Inverse review remains PR 183. The operator's Long/Short, all ordinary range/protection, extended-history and performance requirements are recorded in AGENTS.project.md, including the configured-scope rule.

## 20 October 2026 — Inverse expansion and extended-history repair (verification in progress)

Operator follow-up: Long and Short independently, multiple symbols and named reference pairs, full ordinary TP/SL and Trailing range coverage, longer source history and measured performance. The catalogue is now 102 identities (38 known/turn, 40 math/market, 12 dedicated Micro, 12 BTC/ETH spread/residual), all on 1/5/15m. They join the factory Focus (199 total entries); v36 migrates only the former factory Focus including presets, preserving custom/all/off choices. Inverse keeps the 1.1 minimum return-PF and stricter existing gates. Focus validation now supports 2,000 explicit entries.

Extended engine windows now extend backfill, retained candles and each lane consistently, and participate in the sliced-Base cache key. The former 1m/5m lane preferences no longer clip an explicitly longer evaluation. Source requirements also cover the supported 60-day WF window without rewriting saved lane preferences. Missing exchange history remains measured/limited evidence with a warning. The public archive only supports the separately tested 336h selection/360h source case, not a claimed 60-day market replay.

Initial targeted checks 75/75, history/schema checks 314/314, typecheck/build/lint and dev/built desktop/phone UI pass. Universal side coverage fixtures now supply the BTC/ETH peers that those sources require. Broad full-core regression and final sealed 6h/24h/long-history studies are in progress. First 6h replay (before the isolated runtime cache-key correction): 29/510 Base pairs, 3,656 tapes, 46 settled closes PF 0.789104, 30 losing endpoint marks, combined PF 0.142826. This fails economically and does not establish a profitable production release. Do not use a previous high trailing-only settled PF as certification of the expanded strategy cohort. No deployment, account or venue orders changed.

## 20 October 2026 — Inverse on final full-context validation (draft, not deployed)

Implementation checkpoint `4878badf253309aaa77df4b50261192fd5da42ae` integrates remote baseline `fb62831ba73656d2289aaacf6eaf7e97523da89e`; inherited files exactly match it. The 58-variant Inverse family retains independent 1/5/15m source/range/protection/symbol/direction gates. Earlier PF 3.153/7.209 evidence uses the superseded partial-context evaluator and cannot certify this final source.

Final 12-symbol 24h study: 135/290 Base pairs, 36,096 tapes, 134 executed configs, 422 modeled closes at unit-return PF **181.263142** after 0.15% modeled costs. All are Trailing Shorts on 1m, on APT/AVAX/DOT. Its 21 open marks lose -44.265491 unit percentage points; settled plus marks PF **4.936149**. 13 positive / 11 flat / 0 negative settled hours do not prove hourly equity gains. The separate latest standard 6h case has zero executions and unavailable PF. Fixed 336h-selection/360h-source sensitivity: 109 modeled closes at settled PF 5.008092, but 521 open endpoint marks lose 303.316822 unit percentage points, reducing settled-plus-marks PF to **0.228048**. This sensitivity fails economically; production defaults are unchanged. These retrospective overlapping samples cannot be added or used as funded/venue-owned proof.

Current targeted tests **91/91**, TypeScript, production build, changed-file lint and dev/built desktop/phone UI 4/4 pass. Native SimExchange covers opens, stop updates and closes for 12×Long/Short. Other strategy identities have separate regression fixtures; market-PF evidence above covers Normal/Trailing only. No funded-account/margin/equity-DD feasibility or actual venue-fill/profitability claim. No live connection or deployment changed. Existing Focus and independent live-promotion proof are retained. Detailed current and explicitly superseded evidence: `docs/sims/inverse-12-symbol-20261020.md` with sealed compressed protocols and executions. PR 183 remains a draft; continuous both-direction/live profitability is unresolved.

Updated 2026-10-20, UTC. Repository: `mxssnx-creator/CTS-A-O`.

## Strategy defaults and authenticated X02 follow-up — 20 October

Pre-integration tested code/fixture checkpoint: local **`7e62614c252f09c5aa547c54141928301a59c6f5`**. Following handoff edits are documentation only. The economic source seal remains `e2414bbe6a79da6638c402ae24e6605dfeee6084689993f2ecbba80fa6175779`; final remote release head and complete CI outcome are linked in PR 185. Earlier exact tree equivalence: local `92ad09a` / remote `a9f6038`, tree `1cf8c9cd2cbf3b4364d258b38f554e1fd645ff66`.

PR [185](https://github.com/mxssnx-creator/CTS-A-O/pull/185) publishes the exact tested local tree: economic checkpoint `86fcf5e`, fixture/UI checkpoint `7e22f25`, initial remote commit `107b4f2fe21c76af79f914f0c5b312fd697dd592`, tree `49df3af591bc0cec6eadcea63d132f72887ced8a`. Backup `backup/main-before-strategy-defaults-20261020` preserves `4588030b946740d493cf0e0d629aa2722aa6211c`. The latest explicit user “Push, merge” authorizes this publication; normal Git lacked local authentication, so the connected GitHub API published a tree verified byte-for-byte by Git tree hash.

Independent ordinary/Signal histories, no-TP trailing-only grids with a 3% initial maximum, one DCA addition of 2.5 original base units (3.5 total), immutable ladder identity and Overall Block relations are implemented. Live strategy history includes the complete requested performance window plus slow-lane indicator warmup; late own venue commissions reconcile only after protection.

Authenticated **X02 VST** testing is now complete: 28 actual opens across twelve symbols/both sides, 60 filled execution slices, 60/60 commissions measured, 9/9 pilot lifecycle phases. All twelve original symbol settings were restored. Final authenticated book at `2026-10-20T20:20:49.636Z`: **0 positions / 0 orders**. Technical fixture admission is not profitable strategy evidence. X01 credentials were untouched; raw account records remain private. No hosted deployment/reload occurred.

The completed sealed 600h `v5` sensitivity study ran 16/16 arms with 6,768 hourly own-config checks, strict Last-25/PF 1.5 and twelve symbols. Development built 50 configs after 1/42 pair Base passes; confirmation built 100 after 2/42. No active config passed every gate; zero funded/virtual closes, PF unavailable, no selected winner. Zero DD here means no exposure, not a profitable low-risk strategy. Do not relax gates or promote a preset from this result. Earlier insufficient-window/gzip attempts remain preserved separately.

The first full CI core run completed all 208 files with 2,430 passes / one Fast-loop timeout / two slow skips. The timeout was an implicit random-market entry requirement in a tick-mechanics fixture. Its feed is now pinned and its held Normal position uses explicit fixed-unit paper sizing; the five corrected Fast-loop checks pass. The remaining 47 local Signal/simulation files pass 525/525. A local full run was interrupted after its runtime checks; it is not claimed as one green full run. Use the final complete PR CI as the release gate.

TypeScript, lint, production build, desktop/mobile Settings and all-page functional UI checks pass. The fresh script stage has 624 passes/8 explicit skips, app/components 80/80, including actual all-page desktop/mobile browser checks with the explicit Chromium path. Both longer runtime tests pass: mixed-operation storm 319.5s and actual queued/repeated preset backtest 17.2s. The final Block matrix passes. The older browser-path failure and unbounded stress failures remain separately preserved. The 34-file targeted regression's stale fixtures were repaired and its three affected files rerun 52/52; the full 208-file core run and the complete per-commit CI outcomes are recorded in PR 185. Both the full default suite and longer runtime checks are release gates; use their linked final results instead of adding targeted rerun counts. See [strategy-defaults-20261020.md](strategy-defaults-20261020.md) for complete settings, order phases, candidate comparisons, evidence boundaries and any remaining release checks. Legacy economic preset caches require backed-up re-evaluation before a hosted reload.

## Latest local Signal PF 1.5 checkpoint — 20 October

Implementation and tested code: **`bc39e25`**, branch `fix/signals-history-matrix-20261020`. Every Signal source/range/lane/type/config/symbol/direction now shares its own PF>=1.5 historic/Last-N verdict across Strategy Base, selection, activation and native/model admission. Pure historic TP/SL runs independently of trailing; held zero-trailing IDs restore exactly; trailing-only Family-Seats are fixed. Stricter gates and the configured partial Last-N policy remain. Full historical fits require own N=25. Representative pair diagnostics remain separate from exact config qualification.

**377/377** targeted tests pass in 24 offline files, including deterministic 12-symbol/all-range/all-lane/all-type routing with 1,104 expected modeled closes, native-proof, stop/control and exchange regression checks. TypeScript, production build and desktop/mobile dev/built Settings checks pass. Initial failures and the interrupted v1 run are preserved; the previous broad repository audit remains incomplete.

Completed sealed `pf15-v2`: **88,621** configs, **17,706** own-Base passes at start, **21,083** configs passing at least one hourly Base evaluation, **4,542** configs with **7,055** accepted settled **virtual** closes. Return PF **1.112312**, hours **11 positive / 12 negative / 1 flat**. Development-selected 3% / ratio 1 / Trailing: development PF 3.839497, confirmation PF **1.370291**, total PF 2.499531. Confirmation does not meet PF 1.5. This is the reused retrospective public feed, not an untouched holdout, funded account or venue result. No every-hour profit or live promotion claim.

See [signal-pf15-20261020.md](signal-pf15-20261020.md) for exact policy, scope and protocol. At that earlier checkpoint X02 credentials were absent and public publication had been rejected. The authenticated X02 tests and explicitly authorized publication in the follow-up above supersede those access limitations; the original virtual Signal profitability numbers remain unchanged.


## Final full-context checkpoint — 20 October

Published tested code commit `5ce2cc21566af0fed6f93151184e2bbcb42e1927` (local implementation `2f48e3ff9fad0cd7fa27fc4f8bbb2170f35b99ee`) supersedes the intermediate `700a91b` validation logic below. The full gate runs independently per config/symbol/direction, including its own minimum sample, LCB, window, drawdown, green share and stability. Only passing contexts contribute to qualification/ranking; neither profitable nor losing unrelated pools can override a context. Additional execution Last-N uses the exact context. Compact views retain the actual evaluation window and required earlier Last-N rows, with one cached view per tape; cache changes and exact-entry-boundary closes have regressions.

Four final 12-symbol fixed windows complete with **zero qualified contexts at the recorded start/end snapshots, zero executed orders and unavailable PF**, preserving thresholds. This is correct refusal of unproven entries, **not** fulfillment of many orders with consistently high forward PF. Earlier extended 22-symbol full-context attempts before final compaction were memory-incomplete; their results cannot certify this final source. The old 999/PF0.023841 sample remains in the archive as an explicitly failed intermediate implementation.

Final targeted checks pass **83/83**; TypeScript passes. They cover all seven ranges, unrelated-pool independence, sample/LCB non-borrowing, all selection modes, native promotion, duplicate symbol slots, Last-N/history cache changes and exact-close boundaries. The later-core segment passed 184 tests before the final context changes. The simulation sweep passed 401/407; its six stale 24h-window fixture failures now pass in the explicitly pinned 18/18 Block admission fixture. The archived lifecycle snapshot remains exact after pinning its original input options; every non-options field matched reference source 9c037e2 before the fixture was updated. Production typecheck/build and UI are passing checkpoints; a single immutable full-green core run and profitable execution evidence remain pending. Do not deploy or merge as a completed profitability release.

The draft review is https://github.com/mxssnx-creator/CTS-A-O/pull/182. Use the GitHub connector to update its branch: Git CLI has no push credentials. Verify the remote Git tree equals the local tested tree before moving the branch. Main remains unchanged.

## Intermediate checkpoint (superseded by the final full-context logic above)

Tested implementation commit: `700a91b06dcf42a05321ca2a3986c0c33dac1846`.
Audit evidence update: `a00bfd8`. Integration branch: `codex/integrate-open-work-20261020`, based on main `4588030b946740d493cf0e0d629aa2722aa6211c`.
Remote backup `backup/main-before-open-integration-20261020` preserves that main head. No running instance, native connection, account state or venue order was changed.

New protections preserve exact Base-qualified TP targets separately from diagnostic construction; recheck the exact config at entry and native promotion; require its own symbol/direction Last-N and range Last-N; retain the configured lane history for count-based validation; and correct repeated-symbol indexing in multi-timeframe Signal/engine contexts. Maximum hold minutes now remain exact across lanes. Signals retain separate 336h source history. Integrated PR 175 independent peak trailing/2% Signal protection and selected PR 181 hold fixes, plus PR 168 stable yielding sorts. Current main's cost, ownership, confirmed-fill and unknown-return protections are retained.

**Unresolved operator objective:** consistently high forward execution PF with many orders is not established. The extended public 22-symbol cached replay still produced 999 fully qualified modeled closes at PF **0.023841** in one fixed window. Other exact-context windows produced no eligible executions; an empty cohort has unavailable PF. Native promotion still requires separate matching settled model and owned execution evidence and cannot use these pooled historical stats as execution proof. Do not enable a release or claim alpha from these results.

Details, the complete open-PR comparison and hashed retrospective protocols: `docs/sims/postbase-continuity-20261020.md` and `.json`. Original fixed-window losses are retained alongside the corrected admission counts. The larger public fixture is restored from PR 164 and checked against every manifest chunk and the archive hash; it is not a newly resealed holdout.

Verification completed: TypeScript; production build with DATABASE_URL unset; lint (0 errors, existing warnings); desktop/phone UI 4/4 including Settings save; focused continuity/qualification 67/67; independent Signal gates/context regressions 43/43; live budgets/regression 100/100; native promotion 20/20; Base count 2/2; recovery 7/7; lane lifecycle + independent Exit 17/17; script repairs 46/46. Some counts overlap and must not be added as distinct tests. The broad core runs found stale fixture assumptions, now corrected and rerun; runtime smoke cases also exceeded their 120s wait on this host. A single immutable all-green full-core run remains pending. No full-suite success is claimed.

Git CLI push has no HTTPS credentials in this workspace. Use the authenticated GitHub connector for an atomic review-branch tree/commit if available; preserve local commit provenance and verify identical source content after publication. Do not force-push or merge an unverified release.

Updated 2026-10-18, UTC. Repository: `mxssnx-creator/CTS-A-O`.

## Local checkpoint: bounded broad history and Last-N validation — 18 October

General walk-forward warm-up is now 6 hours and broad config selection is 24
hours. Seat validation continues to use its per-config Last-N sample (15
closes); the separate entry Last-N gate remains off per the measured evidence
below. Symbol-specific history (`symH`) is included when trimming runtime tape
history so that a longer requested symbol window is not silently truncated.
Per-symbol and per-side order caps remain unlimited (`0`).

An explicit `--focus all` on `core-session` now overrides a frozen settings
snapshot, rather than being overwritten by its saved focus. This was found when
the supposed all-focus replay still evaluated only the saved 36-pair subset.
The expanded default-focus rerun used a frozen snapshot with its narrow focus
removed (97 default pairs / 147 runtime combos), 9 symbols, 24 hours of
prehistory and 6 evaluated hours from the same offline feed. All **56/56**
report checks passed. Base passed **7/147** pairs; **1,388** configs passed at
least one post-Base evaluation; the replay closed **483** orders at return PF
**3.54**. At the tested 2% balance fraction the equity drawdown reached
253.44% and margin exceeded equity, so that sizing is infeasible. A 0.2%
fraction kept 483 orders and return PF 3.54, with equity drawdown 26.23%, but
still exceeded equity margin by 3.32×. These are separate risk sensitivity
runs, not a production sizing change, and the 6-hour result is not proof of
durable profitability. The all-718-pair experiment hit the local memory guard
after three retries and is incomplete; no counts from it are treated as
passing.

Verification: `scripts/core-session.test.mjs` passes **29/29**, gating and
stage-consistency tests pass **15/15**, TypeScript typecheck and
`git diff --check` pass. The bounded runtime replay completes in 6 seconds. The new
checkpoint is local and not pushed or merged.

## Independent Historic Exit implementation — 18 October

Exit Strategies now have a dedicated bot-free path through the normal causal
Base → Main → Real pipeline. The path enumerates existing configured sources
and adds Tactic, Relate, Break-relation and activity-profile sources
independently of Bot selection. It supports standalone 1 / 5 / 15 minute
lanes, higher-timeframe combinations, five protection families (static and
adaptive stop-loss, trailing stop, breakeven and trailing-only), causal fit
and validation windows, and the normal risk/execution gates. Settings,
runtime diagnostics, session evidence, recovery and the settings/stages UI
expose this lane explicitly. The Exit cohort must also pass its own Normal
Base PF, sample and drawdown gates before fitting or execution.

The 12-symbol 24 h prehistory + 24 h replay is fully recorded in
`docs/sims/independent-exit-12sym-20261018-summary.md`. It enumerated 1,026
bot-free pairs (50 Tactic and 196 relation variants), admitted 54 through
Base, tested 192 protection candidates and qualified 7 configs. Its 12
funded Exit closes returned PF 0.253 / −$0.366, with 1/6 active Exit hours
green. The complete uncapped 10× account lost $1,169.03 (PF 0.639), had 8/24
green hours and exceeded equity. This confirms the independent execution
path, not a profitable strategy or a live-ready sizing policy. No live
settings, venue orders, running instance, database or deployment were
changed. Do not tune on or promote from this replay.

## Latest checkpoint: equity drawdown audit — 18 October

PR [167](https://github.com/mxssnx-creator/CTS-A-O/pull/167) merged as
`1e529098b6a799e8acdbc123366196016643cf65`, tree
`dcbd75157e899c65f25b5bffb9946c2d128f452c`. Subsequent main integrations
advanced the base to `2ac457c9af4e38df4e07f880a65ba247d8b7ebc7`, tree
`73126c63b4f2b2519e5742c2cceb0622fc251e72`; backup
`backup/main-before-equity-dd-20261018-current` preserves that base. The
drawdown audit and its exact tested head are recorded in PR 170.
This continuation fixes Statistics/backtest equity marks and drawdown measurement only;
strategy, cost, PF, qualification, position sizing and execution code are
unchanged. Historical PF and hourly outcomes below remain the frozen record;
the recent 22-symbol final window's PF 1.4597 still had 99.461% maximum equity
drawdown and is not capital-feasible.

Statistics, backtest charts and the live-test report previously used a
one-minute candle's close at its open timestamp, before that candle had
completed. They now use only the latest fully closed bar at or before the mark
time. The Statistics timeline previously computed DD
from chart samples (up to 600 points), which could skip an intermediate equity
peak or trough. It now tracks peak-to-trough dollars, peak-relative percentage
and underwater duration at every minute and trade event; chart point count only
controls rendering. Active exposure is aggregated by symbol, and margin remains
an independent feasibility/readout metric, never an input to equity DD. A
deterministic 90-day, 22-symbol, 10,000-order synthetic profile completed in
59 ms with the local test fixture; this is an algorithm check, not a production
benchmark.

Focused Statistics/API/PF tests pass **49/49**, session-report tests pass
**28/28**, and TypeScript typecheck and production build pass. The equity regression verifies a
peak/trough between chart points and confirms leverage changes margin without
changing equity DD. An API regression verifies a mark from a bar only after its
close. PF and the executed trade cohort are unchanged. The prior frozen market
results remain the economic benchmark; the 6-hour PF 2.374852 result recorded
later in this handoff was from a separate historical window and is not proof
that this reporting correction improved strategy returns.

## Historical checkpoint: exact Signals, complete studies and performance — 17 October

Source [PR 163](https://github.com/mxssnx-creator/CTS-A-O/pull/163) is merged:
source merge `df34e931da4d9726e73feca1c0fbbf15fc7cb448`, exact tested tree
`1e0edfdd6d87e5ed43db464c1b4fb50a047ebf5e`. Risk PR 166 merged as
`09d800cc56946d1da120a03f96e2f382e7763d88`, tree
`225c65cb81eec46fd851c37e2663038733274865`. Backup
`backup/main-before-exact-signal-20261017` preserves `d1364e5`.
Economic checkpoint is `fdabcdb`; bounded capture/reader checkpoint `0b8c145`;
final source documentation checkpoint `3bcf204`. No live settings, venue orders,
running instance, database or deployment were changed. No browser render QA
or exchange-fill verification was performed in this pass.

### Correctness and performance changes

Exact Signal protection config × symbol × direction survives activation,
acceptance, Last-N, paper/live seating, hedge checks, audit, reporting and UI.
Empty siblings no longer dilute a good config, opposite-side results cannot
qualify a losing side, and absent engine selection no longer bypasses live
activation. Held configs remain exit-only. Fresh Signal count 0 is unlimited;
explicit custom counts remain respected. No PF/sample/DD gates were lowered.
Historical preparation takes the stricter Stage/custom Base-set PF floor.
Empty held-only Base results explicitly fail.

Canonical modeled round-trip cost is 0.15%. Migration v34 changes only the
exact former factory fee/slippage tuple, including matching preset settings;
custom/measured costs retain provenance. Range construction stays at 0.20%.
The earlier 0.20% versus 0.15% study also changed sizing 2%→0.1%, so it is not
a cost-only experiment. The old positive replay evaluated 336h, not 48h, and
cannot certify six evaluated hours. See the cost/positive-replay audit.

Bounded replay loads every requested symbol before first computation and blocks
partial/failed/short coverage; live startup stays progressive. Session CLI
background preset comparisons default off, explicit diagnostic opt-in retained.
Unique exact acceptance tapes build prefix results directly; generic duplicate,
pooled and unsorted fallback remains. The acceptance fixture preserved its hash
while changing 1,491→531 ms wall, 1,702→485 ms CPU and 259→177 MB RSS.

Session evidence is lossless, ordered and SHA256-sealed in ≤8 MiB JSONL chunks.
Tapes are exported lazily; trade/validation/allocation readers and Python bridge
support flat and chunked forms. Missing/unhydrated evidence fails explicitly.
Report HTML omits unused embedded allocation arrays while exact JSON retains
all rows. Current corrected20 HTML is 3,239,840 bytes versus 78,770,915; this is
not a claim that total archived storage shrank. A 12-million-row stress case
exceeding Node's old string limit wrote/verified at 347 MiB RSS. Regenerable
synthetic chunks were removed after preserving their measured proof.

### Completed, independently reconciled studies

CI [39077484680](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077484680)
passed all eight jobs: production build, worker packaging, typecheck,
193/193 targeted tests, four 20-symbol cases and both 22×24h windows.
All four current 20-symbol economic/allocation/account fingerprints match the original
runs exactly. Both 22-symbol audits passed 16/16, including every chunk, funded cohort,
unit/cash arithmetic, hourly result and settings/source provenance. Full 22-symbol
coverage used no fallback, degraded compute or aborts. Follow-up CI
[39080618483](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39080618483)
passed all eight jobs on PR 167, including the repeated six frozen replay cases;
endpoint tests also passed in
[39080618393](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39080618393).

| Model/window | Funded engine closes | Unit PF | Closed cash $ | Cash-positive hours | Capital feasible |
|---|---:|---:|---:|---:|---|
| 20-symbol baseline/current | 126,380 | 0.765632477 | -1.543603 | 4/6 | No |
| 20-symbol entry Last-N 5 | 87,179 | 1.267875180 | +12.395141 | 4/6 | No |
| 20-symbol entry Last-N 15 | 94,903 | 1.112511245 | +9.261089 | 5/6 | No |
| 22-symbol selection | 127,501 | 0.748210087 | -27.709200 | 10/24 | No |
| 22-symbol untouched final | 127,210 | 1.459701913 | +15.408821 | 16/24 | No |

These five source policies use actual position/gross ratios 0/0 (uncapped),
separate from the final exchange cap of 100 Symbol × Direction positions. Final 22-symbol
peak modeled margin is $269.20924 on $10 starting equity; marked DD 99.461%,
minimum equity $0.062921. Both directions traded, but final long PF 0.868962
versus short 3.970918. Signals and trailing-only funded samples remain empty.
A no-loss sentinel or empty cohort is never a measured passing finite PF.

Current corrected20 capture runtime is **185→62 s**, peak RSS
**11,555→3,123 MB**. Entry5 is 177→59 s / 11,169→3,081 MB; Entry15 is
198→57 s / 10,370→3,196 MB. These exclude report/audit durations; direct strategy
compute did not uniformly improve. Selection22 simulation/report/audit wall
was 192.850/259.333/22.763 s; final 89.378/77.018/11.218 s. All three report minute-book passes now cache immutable order units/volume/keys
and each symbol price once per minute. Snapshot caches stay separate for capped
and uncapped allocations. No arithmetic association or iteration order changed.
Patch `249d57a` (integration `069cb36`) passes 27/27 report tests and independent
review. All 468,368 orders, 63,360 symbol-minute marks and 18 old/new slices
match; all new full passes match applicable recorded results at six decimals.
The full eight-job replay/build CI passed on PR 167. A full end-to-end report
speedup was not established because the old-loop profiling attempt hit its
240-second watchdog and its retry was stopped; these are preserved as failed
attempts, not passing benchmarks. The 8,192 MiB V8 allowance applies to worker
isolates too, not a whole-process/runner cap. Isolated research used four CPU,
16 GiB runners; this does not resize the shared local eight-GiB environment.

Six hours are evaluated prehistory; older candles initialize indicators only
behind `evaluationFromT`. Source is 22 fixed genuine Binance USD-M symbols,
665,280 native 1-minute bars, Sep 26→Oct 17 00:00 exclusive, 462/462 official archive
checksums verified, no gaps/duplicates. Feed SHA256:
`84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`.
This source differs from earlier BingX evidence. Do not fit individual losing
hours. The completed selection found **zero eligible pruning proposals** under
the frozen ≥50 closes / ≥3 symbols / losses in both halves rule. All ranges stay
enabled; no defaults or live promotion follow from these experiments.

Signals did activate: all 1,473 selection / 1,111 final execution attempts have an
explicit first-failure reason before funding. Selection: own-history 1,150,
confirmation 223, cluster 51, own-PF 49. Final: own-history 763, side 271, own-PF 43,
cluster 34. Own-history combines sample/PF/DD checks; recorded artifacts do not
split its failures. Preparation snapshots and representative Base counts are
not admitted executions. There is no unexplained activation/funding drop in
these windows; no Signal passed all configured causal entry gates.

### Account-risk holdout and endpoint marks

[PR 166](https://github.com/mxssnx-creator/CTS-A-O/pull/166) is merged.
CI 39077541410 passed all six jobs. All four independent account-risk audits
passed, including matching frozen economics/caps, complete evidence provenance,
funded config membership, hourly cash and all 1,440 minute equity/margin values.
Each arm has position notional ratio 0.75 and gross ratio 7 or 1, unchanged
strategy universe, causal entry Last-N 0/5/15 and live disabled. The sole
prespecified candidate is entry5-gross1; a diagnostic cannot replace it after
scoring. All four policies fail the frozen profitability criteria.

| Risk arm | Funded closes | Unit PF | Closed cash $ | End marked equity $ | Maximum DD | Cash-green hours |
|---|---:|---:|---:|---:|---:|---:|
| Control, entry0 / gross7 | 789,873 | 0.691260716 | -1.018721 | 8.472082 | 19.0931% | 14/24 |
| Entry5 / gross7 | 595,448 | 0.834692837 | -0.880353 | 8.540239 | 18.6287% | 16/24 |
| Candidate entry5 / gross1 | 604,153 | 0.824573475 | -0.093895 | 9.829475 | 2.3357% | 16/24 |
| Entry15 / gross1 | 680,439 | 0.711549623 | -0.145745 | 9.782792 | 2.5763% | 16/24 |

All four are feasible within the configured aggregate-parent model, with no
modeled margin shortfall and both directions executed. Signals remain empty.
The two entry5 arms have identical ordered virtual-return hashes: their funded
cohort differences arise from final account caps. Gross1 reduced marked drawdown,
but none qualifies for live/default promotion. The minimum candidate marked
equity was $9.809587. Full outcomes and all 96 hourly rows are in the risk report.

A pre-existing DCA endpoint report mismatch affects 146 of 420 open DCA orders;
274 single-leg DCA and 22,388 non-DCA match. Engine equal-notional leg marks sum
to −$18.38877698447657; the unchanged arithmetic-entry minute account sums
to −$18.390983089577958, delta +$0.002206105101386. Additive amendment checkpoint
`e6c9caa` preserves every original field and frozen seal, explicitly adds engine
and book mark bases, and reconciles book marks to original equity−balance.
Its 16 tests and readback of 126,380 settled and 22,808 open rows pass; unchanged settled,
allocation, hourly and curve hashes are preserved. It does not reconstruct
causal leg fills: raw evidence lacks each leg's price/time/size ledger. Never
replace arithmetic entry with a harmonic entry retroactively. See the endpoint
amendment doc/proof; original inputs remain immutable.

Complete hourly/range/type/side/provenance tables:

- `simulations/completed-study-summary-20261017.md`
- `simulations/development20-results-20261017.md`
- `simulations/source22-results-20261017.md`
- `simulations/risk-entry-results-20261017.md`
- `simulations/endpoint-mark-amendment.md`
- `simulations/minute-report-cache-20261017.md`
- `simulations/session-evidence-format.md`

Earlier resource failures remain preserved: first22 stopped at 18/22, exit 143
with 15.3 GiB RSS and background comparisons; replacement22 computed then hit
Node's 512 MiB string limit; first four risk captures hit the default ~4 GiB heap.
None of those failed captures is funded performance evidence. The successful
bounded retries supersede completion claims, without deleting failure records.
Public source, original/replacement 20-symbol archives and independent proofs
are durably preserved. Saving the largest new 22/risk raw archives timed out
without receipts; their finalization outcome is uncertain. Do not automatically
retry those writes: the Library skill prohibits retrying uncertain finalization.
Full verified ZIPs remain local and in GitHub Actions with seven-day retention.
Future source/risk workflow uploads now request 90-day retention; this does not
extend the earlier artifacts retroactively.
A separate compact bundle preserves complete audit proofs, frozen protocols,
settings, source/ZIP hashes and the full endpoint report revision. It is saved as
`CTS-A-O-verified-audit-and-endpoint-evidence-2026-10-17.zip`
(20,280,672 bytes; SHA256
`73fdb7ddee83d5d4faef0bf1d2d00453427700c190f70a3a3db8ab2657c0d29d`).
The performance proof is included; end-to-end CI timing remains pending.
Git-backed source/docs stay in the repository. Do not touch unrelated local
jobs or `/workspace/startup.sh`, which belongs to another checkout.

## Systemwide PF scope and cash basis — 17 October

Systemwide test and simulation benchmarks now explicitly follow the validated
cohort: Base minimum-PF-qualified pairs → post-Base configs validated/seated →
funded settled orders actually executed. The evaluated/passed counts and each
later-stage count remain visible. Headline, hourly, range and strategy PF use
the executed cohort. The all-candidate/pre-validation PF table is labeled as a
diagnostic and is excluded from benchmark ranking and qualification. This is a
standing rule for future CTS-A-O work; do not optimize against an unfiltered
candidate aggregate.

Cash PF is the normalized base-$1 PF: each funded settled order contributes its
canonical unit return at equal $1 notional and should match Return PF. Actual
sized-dollar PF is separate because funded notionals differ. Cash P&L uses
`(1 + execution-weighted return) − 1`, then scales by funded unit notional; tiny
nonzero returns survive floating-point cancellation, and Block, coordination
and ladder volume are not applied twice. No profitability claim or live setting
change follows from this reporting fix.

The default replay is the cached six-hour evaluated prehistory plus six-hour
simulation. Its scored orders are already post-Base Real-stage executions;
the latest code change makes that cohort explicit in JSON evidence, Markdown,
write-up and HTML, and labels all-candidate tables diagnostic-only. Focused
verification and replay results are recorded in the audit below.

## Updated Micro defaults and runtime audit — 17 October

The 60 updated Micro Break IDs are now in the default focus, bringing it to 97
unique bot/indication pairs. Migration v28 upgrades only a saved prior-default
focus; a user-customized focus is preserved. The regression checks verify all
60 IDs are unique, eligible for processing and migrated without overwriting a
custom selection.

The audit found and fixed two correctness issues. A Base-failed held pair had
been omitted from `pairTags`, which meant “no Base filter” and could rebuild
every strategy range. The runtime now passes an explicit empty Base result and
the builder retains only exact held configs as held-only tapes, including DCA
and Axis ladders. A separate report check combined Signal tapes with engine
Base sets; the output now keeps combined totals while checking each population
against its own denominator.

Fast offline audit: nine cached symbols, six evaluated history hours plus six
simulated hours ending 2026-10-15 04:00 UTC, one worker, Signals enabled. All
66/66 report consistency checks pass. Base evaluated 854 engine pairs and
passed 53; 295 engine configs seated and 7,946 funded orders executed. The 60
Micro identities are present in the default focus and all 980 requested engine
and signal combos were processed. The signal trail screen qualified 0/126
pairs in this short window (124 had insufficient entries; eight candidates
were evaluated, four lacked the close minimum and four failed PF).

Result is not profitable: Return PF and normalized base-$1 PF were both 1.90,
while sized-dollar PF was 0.75; net was −$0.17 from $10, with 48 positions,
10,692 virtual closes (2,746 zero allocations), 7.09% maximum equity drawdown,
and two of six hours positive. Size weighting therefore turned a positive unit
PF into a negative cash result. The six hourly rows, all PF definitions, and
coverage details are in
[the detailed 6+6 audit report](simulations/systemwide-postbase-6h-20261017/report.md).
Engine peak RSS was 851 MB with full compute level, no memory fallback and no
aborts; the replay did not change live settings or place venue orders. No
profitability or live-promotion claim follows from this sample.

Focused verification on this checkpoint: the combined PF/report, worker pool,
Micro/default migration, seating, Break and stage bundle passes 76/76; TypeScript
typecheck, Node syntax and `git diff --check` pass. A full core suite was
running concurrently in the shared workspace; its completion status was
unavailable, so it is not counted as a completed pass.

## Break retest and market-gap correction — 17 October

Tested source checkpoint: local commit
`9b615befb9704e9f536a3a176673919abb296992`, tree
`ae42df80a9106eef60c1cee560faa2ded96b6476`, based on merged main
`9604431e5ab912f989aaa4282d344ec3bf87e89f`. GitHub mirror commit
`853f4526658654b18380fe547f51d2289de56b57` contains the same tested source
tree.

The Break retest state now cancels a pending long or short retest when a fresh
opposite Donchian cross occurs, for both regular and 8-bar channels. Market
returns now require immediately contiguous candles, and market-volume activity
restarts its 60-bar warmup after a gap. The shared market drawdown calculation
was factored without changing its formula. Regression coverage exercises both
reversal directions, gapped activity warmup, market-index continuity and Break
anchor-lane routing.

The default fast offline recheck used six evaluated prehistory hours plus six
simulated hours on the cached nine-symbol feed (through 2026-10-15 04:00 UTC),
Block ratio 0.2, Signals off, and a six-hour causal selection window. It
reproduced the saved ratio-0.2 report exactly apart from compute-time and
formatting text: 53/665 Base pairs passed, 49 engine configs seated, 3,759
funded orders, Return PF 2.86, sized cash PF 0.74, net -$0.14, and 6.64% max
equity drawdown. Five of six hours were cash-positive; 02:00 UTC lost $0.31 on
1,845 orders (cash PF 0.43). The simulation's $10 start balance differs from
the older positive $1,000 replay, so dollar totals are not directly comparable.

The earlier 0/60 Break-only smoke had zero Base-passing pairs because its
minimum close-count gate was unmet; PF was unavailable, not measured as zero.
The expanded Micro run above has orders. The older positive systemwide replay
used four symbols, 15-minute trading, Signals enabled and a different Base
cohort: 792 funded orders, Return PF 2.37, cash PF 2.22 and +$4.42, with 4/6
positive hours. These are different cohorts and settings, so the positive
result does not contradict the current loss. No gates were relaxed, no live
settings were changed, and no venue orders or deployment were used.

Verification on the tested source: 31/31 focused guarded core tests pass across
Break, market/Micro relations and lane routing; TypeScript typecheck passes;
`npm run build:dev` passes and packages the core worker; the replay's
consistency checks pass 64/64. The full repository core suite and live venue
execution were not run for this patch; profitability is not established by the
six-hour smoke.

## Break post-Base 12 h replay follow-up — 17 October

Detailed report: [break-postbase-12h-20261017.md](simulations/break-postbase-12h-20261017.md).

The corrected offline replay used 12 h of evaluated history plus 12 h of
simulated trading. The first 9×12 draft accidentally let config selection use
the default 336 h longH; that evidence is superseded for this request. The
replay launcher now preflights the complete normalized settings before scoring
and uses a bounded replay-only 12 h selection window. Production's 24 h
minimum longH and saved/live settings are unchanged. Historical native live
last-N settings are not simulator gates; the report no longer labels them as
such.

On the matched 9-symbol cached feed, the legacy 4-ID set passed 4/12 Base
Micro pairs, validated 696/3,128 post-Base configs at pooled Return PF 4.104,
then executed 1,563 simulated orders at PF 0.342. Updated Break passed 4/60,
validated 728/2,176 at PF 10.345, and executed 726 orders at PF 3.272 with
+$5.201 net and 2.71% equity maximum drawdown. Its hourly outcome was 3
positive, 6 flat and 3 negative hours; realized PF fell below 1 at 18:00,
19:00 and 23:00 UTC. The update improved aggregate quality while reducing
orders; it did not meet the every-active-hour goal.

An exploratory in-sample 70% green-hour config floor produced 616/2,176
validated configs at PF 13.391 and 566 simulated orders at PF 4.904, net
+$6.496. It reduced the 18:00 loss from 228 to 108 orders but kept the same
3/6/3 hourly outcome. This remains a test candidate only; do not promote or
retune it on the same window. A 3×4 config-floor/entry-last-N grid found no
hourly or aggregate execution improvement.

Verification: 18 matrix replays plus two current-source confirmation replays
passed 56/56 consistency checks each; session-report tests 15/15; the focused
Break/Micro/Relate/range/walk-forward/pipeline regression bundle passed
116/116 across 28 suites; TypeScript typecheck, Node syntax and diff checks
passed. The current-source replay hashes and matched baseline / 70% outcomes
are recorded in the detailed report. The cache contains only nine real
symbols, and no live venue execution or deployment was tested. Exact source
checkpoint `5372a70` (`feat: bound Break post-Base replay controls`) is mirrored
as GitHub commit `de6a1acb3917ef8739b034ac11329f535f067dcb` on
`fix-base-range-report-20261017`; GitHub verified the published branch. No
deployment or live trading change was made.

## Matched Block ratio check — 17 October

The paired six-hour systemwide replay is recorded in
[the Block ratio comparison](simulations/systemwide-block-ratio-comparison-20261017.md),
with complete hourly and range/lane/type reports for both runs. On the same
nine-symbol feed and gates, ratio 0.2 improved Return PF 2.83→2.86, sized cash
PF 0.66→0.74, funded orders 3,711→3,759, net −$0.21→−$0.14 and max equity
drawdown 7.72%→6.64%. The same 02:00 hour remained negative, so neither result
qualifies as consistently profitable and no live default was promoted.

## Relate indication and Micro verification

Implementation branch: `feat/relate-indication-20261016`. Remote safety
checkpoint `backup/pre-relate-20261016` preserves main
`ec30c30c80c9d5531e368ac7de5084d41ac79d23`. Main subsequently advanced to
`f659a266590722d1de6a33eb900c02ab90aa020b` with the independent Live exchange
slot-admission fix; remote backup `backup/pre-relate-main-update-20261016`
preserves that exact commit. The main tree was merged locally as `4ca2877`; the only
conflict was a gating-test fixture, resolved to the current positive-DDR sample.
The Relate work was merged by PR
[#146](https://github.com/mxssnx-creator/CTS-A-O/pull/146) at
`8750e259beafdf9d7ac98bc8a66c4ca6f2b878a1`. PR
[#151](https://github.com/mxssnx-creator/CTS-A-O/pull/151) then restored the
complete scheduler regression after a truncated test blob was detected and
merged at `10d50c5bb1f16fced70a5b5067a9f3bf6dcd8201`; that was main at the
Relate verification. PR #152 later advanced the docs baseline to
`83585ef6b12c215fa0ee6a0dd2f8cfacba35b6cf`, tree
`d843e839f7bab4992f355576f528cdf9c9673ab8`, the base for PR #153.

Original Relate source checkpoint: `ec0c489fc590a693fc67ca294401e66d328bda78`,
tree `494bb1047d1db9dc19339412cc3bd0d12375c919`; GitHub mirrored it at
`c748089523bec47f72fff49d51a5113f652ba41a` with the identical tree.

Relate has 40 stable exact identities: seven nonempty subsets of 1/5/15m × two
modes (Trend and Adaptive) × two drawdown/activity profiles, with 28 standard
IDs plus 12 Micro aliases. Each config runs once on its fastest/anchor lane;
higher-timeframe checks use completed bars. Micro aliases require the existing
5m Micro lane floor, keeping the known weak 1m Micro lane out. Standard 5m
identities remain eligible for Minimal and standard 15m identities for Short,
subject to each range's own lane and Base rules. Per-config memoized typed-array
calculations cover causal trend, ATR-normalized symbol and market drawdown,
last-bar/recent-part/activity-change ratios, and market activity. Relate shares
the independent Tactic/Relate Base measurement and 1.10 return-PF floor.

Current verification:

- Before the main update, guarded focused core regressions passed 141/141 across
  12 files and 30 suites; platform/UI tests passed 78/78 across 8 files and 16
  suites. These cover every Relate ID, Micro routing, causal 1/5/15m alignment,
  gap reset, completed higher bars, drawdown/activity guards, Base range cells,
  128 processing-toggle combinations and worker counts.
- On merged tree `73e5d82`, `npm run typecheck -- --pretty false` and
  `npm run build:dev` pass. The build packages the 24.65kB Relate client chunk
  and core worker bundle.
- ESLint on changed code files: 0 errors and 4 existing unused-variable
  warnings in `runtime.server.ts` and `walkforward.ts` (the two Markdown files
  are outside ESLint's configured file types). New Relate files are clean.
  `git diff --check` passes.
- Merged-tree targeted verification after the main update: 138/138 guarded
  offline core tests pass across 10 files, covering Relate/Tactic/Micro,
  completed higher bars, lane/range routing, pipeline causality, signal discovery,
  seats and gating. The focused UI suite passes 10/10 across two files.
- Hard-pressure memory guard: 1/1 passed. The former cycle-serialization test
  timed out after performing two full 4-symbol, 18-day synthetic portfolio
  runs; it now uses a controlled compute barrier, verifies one follow-up compute
  with no overlap, and passes 1/1 in under one second. This is a scheduler test,
  not a full runtime/processing stress run.
- A prior guarded 10-file run passed 181 tests and cancelled 3 processing cases
  after `processing.test.ts` hit its 400-second internal warm-up wait under
  concurrent load. Its 128-toggle matrix and two related processing cases remain
  incomplete.
- Synthetic indicator benchmark: 40 IDs × 10 symbols (1,973,360 config-bar
  visits over 126,670 source bars) completed in 210ms; after GC, ArrayBuffer
  growth was 15.16MB, heap growth 0.36MB and RSS growth 26.13MB. This measures
  calculation cost only, not strategy performance.

An earlier complete guarded core run on this source before fixture corrections
finished with 1,950 pass, 7 fail, 2 skipped, across 169 files. Every Relate
test passed. Four stale test expectations were corrected (Base fixtures now
state/disable the active DDR gate as intended; Signal counts reflect
lane-scaled `minTrail` filtering), and upstream PR #145 supplies the missing
report-page helper. The memguard hard-pressure assertion passes in a
targeted rerun. The former cycle-serialization timeout was traced to the test
running two full portfolio computations for a scheduling-only assertion; the
focused deterministic scheduler regression now passes. The full runtime and
processing suites have not been rerun after that test-scope change. Heavy
concurrent test processes used the shared host; none were killed. The full core
suite was not repeated.

The broad raw script-test command `node --test 'scripts/**/*.test.mjs'` was
stopped by automatic approval review because it could contact BingX endpoints.
It was not retried or routed around the block. The review result does not
establish whether a request was issued before termination; I made no manual
exchange calls or live-execution attempt. Safe focused/UI and guarded offline core tests above pass;
the broad script stage remains unverified pending an approved network-isolated
environment. The saved public market feed is historical and was not rescored;
no new held-out Micro performance, positive profitability, live execution or
deployment claim is established. Do not promote or deploy Relate from these
synthetic tests.

## Break relational indications and realtime refresh

Follow-up branch: `feat/break-micro-short-channel-20261017`; PR
[#155](https://github.com/mxssnx-creator/CTS-A-O/pull/155). PR #153, which
added the initial Break family and live refresh, is merged at
`3a6d67e77b5c730192b1db8dcaa6d4e82ffe03e0`. The exact tested local source
commit for this Micro extension is `f5e50d97199c1c977fe81fdd7077cd6b68cbfdb6` (tree
`b140f5bb2c0dbd63a4b121263a498f56c5f734ed`), based on main
`83585ef6b12c215fa0ee6a0dd2f8cfacba35b6cf` (tree
`d843e839f7bab4992f355576f528cdf9c9673ab8`).

The family has 144 exact identities: 84 standard and 60 Micro. Five sources
(Donchian, squeeze, retest, 8-bar Donchian and 8-bar retest) are crossed with
eligible 1/5/15m trend subsets, independent 24/48-bar drawdown windows and
Guarded/Balanced activity/market profiles. The short-channel sources are
Micro-only; every identity keeps its own fastest selected lane and order key.
Completed higher bars, gap warmup, prior-only channel/volatility features,
symbol/market drawdowns, activity-part/change ratios and market-relative
filters are exercised by the family tests. Break retains its 1.10 return-PF
floor through Base, selection and live eligibility.

Realtime refresh is Break-only by default; explicit `CTS_CORE_FAST_ENTRIES=1`
selects all indication types and `=off` disables the fast path. The 100 ms live
tick checks for a newly closed base bar; the market poll allows 2 seconds for
exchange candle publication. A higher-lane config refreshes only on its own
close. A priority worker rebuilds only selected IDs from a bounded tail and
publishes refreshed tapes to Entries and Overall. Signals older than 15 seconds
are suppressed. This is a code path with timing/freshness tests, not proof of
an authenticated live run; no venue order was sent.

The matched cached-feed replay uses 9 symbols, a six-hour Base-entry window and
a separate six-hour trade window. The unchanged qualification gates are 12
Base closes and return PF ≥ 1.10. The old four-ID Micro set evaluated 20 engine
pairs; the updated 60-ID Micro set evaluated 60. Neither arm had a passing Base
pair or placed any orders. PF and win rate are unavailable, not zero; all six
hourly buckets were flat. Base compute/RSS were 412 ms / 368 MB for the old set
and 1,272 ms / 413 MB for the updated set. Full inputs, settings hashes and
hourly outputs are recorded in
[`simulations/break-micro-live-replay-20261017.md`](simulations/break-micro-live-replay-20261017.md).
The short sample therefore does not meet the request for more orders, higher
PF or positive hourly success; these configs are not performance-qualified.

Verification:

- On exact source `f5e50d9`, the focused Break/Relate/Micro/pipeline bundle
  passes 43/43; Break-only tests pass 8/8; UI tests pass 7/7; realtime timing,
  freshness and tape-helper tests pass 3/3.
- `npm run typecheck -- --pretty false`, `npm run build:dev` and core-worker
  packaging pass. Scoped ESLint has 0 errors and four unused-variable warnings
  in `runtime.server.ts` and `scripts/core-session.mjs`.
- `git diff --check` and `node --check scripts/core-session.mjs` pass.

This is functional and matched-window simulation evidence only. It is not
held-out profitability evidence. No authenticated exchange execution,
deployment or live reload was verified. Full processing/runtime stress and the
venue-contacting broad script suite remain open. Do not promote Break based on
these results.


Validated source diff: `fix: score Break market relations prior-only`, verified locally as `dd5a2e3`. Applied to PR #155 branch `feat/break-micro-short-channel-20261017`. The rolling market beta, volatility and
residual baselines now exclude the bar being scored; a hand-calculated test
checks both z-scores. The hot path also avoids per-config trend Maps and
variadic finite-check arrays. Replay coverage now compares seatable tapes with
kept config sets, excluding held-only position-carry tapes.

The full review is in [`docs/break-review-20261017.md`](break-review-20261017.md).
It includes a matched offline 9-symbol, 24-hour-prehistory/24-hour-trade replay,
hour/config loss diagnosis and two adjacent-window Trailing ablations. The old
4-ID set returned PF 0.174 on 1,593 orders; the updated 60-ID Micro set returned
PF 0.447 on 11,851 orders in the matched window, with net cash −$43.10. The next
day returned PF 0.325 on 31,149 orders. These do not meet the requested positive
PF or hourly-success goals. Only nine real symbol feeds are cached, so a
12-symbol result is unavailable; the busiest replay peaked at 803 MB RSS.

Focused indication/market/Micro/pipeline/range tests pass 97/97; Break-specific
tests pass 9/9. Typecheck, development build and worker packaging pass. Replay
checks pass 55/55 on both traded windows and 53/53 on each Trailing-off run.
The Oct 11–12 no-seat replay placed no orders as expected; its old harness
incorrectly failed because it equated an empty admitted-tape set with zero
symbols processed and demanded active strategy configs. PR #155's reporting
correction fixes this zero-admission path and the primary PF evidence check.
The repeated 9-symbol 6h+6h no-trade comparison now reports PF unavailable and
passes 53/53 consistency checks on both arms. Full hourly details are in
[`docs/simulations/break-postfix-empty-run-20261017.md`](simulations/break-postfix-empty-run-20261017.md).
Source fix: `cae2ec669b2d69ecbeb664d9853715a2dcfb9efb`. Empty samples are
unavailable throughout sim, connection, prehistoric and preset APIs; runtime
logs no longer print 0.00, and no-loss sentinel scores are labeled. The
67/67 focused suite, typecheck and development build with worker packaging pass.
No live execution or deployment was attempted. Keep current strategy defaults;
do not promote from these samples.

## Continuation check — systemwide PF and volume audit

Validated local source commit: `86b018956a3edc995486a4d3489110ffe6fc93ef`;
published PR head: `f93bf39a17aa9d67512509a466ac755a7b3b36d6`. Both have the exact
tested source tree `38a13887ba443a3b310caa512bbadcd3830131b9`, based on merged
main `ad7f603c27abfb1b1df8f2ea3777314847aaa8b9` (PR #141). PR #142 is the
systemwide PF/volume audit fix. The remote backup
`backup/pre-systemwide-pf-audit-20261016` preserves that base before this fix.
The focused offline regression bundle passed **338/338 tests** across 32
suites in 15.4 seconds. `npm run typecheck -- --pretty false` and scoped ESLint
on the three changed source/test files also passed. The tests covered independent
Block relations, .2 ratio and stack cap behavior, accepted-order replay, unit
versus sized PF, cash reconciliation, ownership, the self-audit, and API reports.
Runtime state, autostart, comparison jobs and live execution were disabled; the
offline network guard was active.

The audit found one defect: its plain-close cost check defaulted missing modeled
volume evidence to multiplier 1, even though primary modeled PF correctly marked
that sample unknown. It now uses the canonical modeled-unit return helper,
requires a finite positive multiplier, and checks recorded position volume against
the external multiplier. A regression confirms missing multiplier evidence fails
the check. The statistics type comment now identifies recorded net points as
volume-weighted diagnostics, separate from normalized PF and dollar P&L.

The existing frozen 6h+6h Block study remains the strategy evidence and was not
rescored: 920 base combinations were evaluated per fold; fold 1 had no owned
settled closes; fold 2 had 792 settled slices at return PF 2.3748515, with no
settled PF uplift over Block Off. Two scored hours had PF zero and every native
Signal-activity check failed. This audit-only fix does not alter strategy sizing,
trade selection or the measured outcome. A fresh untouched market window and
authenticated account evidence are not available, so a profitable strategy
change, positive results in every hour, or live execution cannot be claimed.

Fast trading tests now default to six hours of evaluated prehistory plus six
hours of simulated trading; older indicator warmup remains outside the score
window. The existing frozen 6h+6h Block study remains the strategy evidence and
was not rescored on its reused folds: 920 base combinations were evaluated per
fold; fold 1 had no owned settled closes; fold 2 had 792 settled slices at return
PF 2.3748515, with no settled PF uplift over Block Off. Two scored hours had PF
zero and every native Signal-activity check failed. These results do not meet
the requested continuous-positive-hour outcome. A fresh untouched market window
and authenticated account evidence are not available in this workspace, so a
profitable strategy change or live execution claim cannot be verified here.

## 16 October Overall Block and execution correctness release

Current release: [PR #140](https://github.com/mxssnx-creator/CTS-A-O/pull/140).
Latest pushed combined production/test checkpoint:
`08cd452e16b37acac9799450066088ebceaa1314` (CP10), tree
`214927a2683e2ba2e69d8fcd4e6249c72effe71d`, direct parent
`da5fe49058bc721086d207ac4b34e67cab856b32` (CP9), then
`e6914363380599e1f49a837a3a7a835ff9276faf` (CP8). CP8's merge preserves parents
`c6ed5e9275a70f1fd995992f11a19cd9b57bf290` (CP7 direction correction) and
`fc2ec3b3e9e6fe61b55a95fd1ea8802103c564a8` (main PR #139). All seven offline broad/build/core checks pass. Evidence publication is tracked
below; this does not establish a live deployment or financial qualification.
The pre-release main is `0ade0fb2ba22a50e49cf03a9825ea612b4abc30f` (PR #138),
preserved remotely as `backup/pre-overall-block-20261016`.

Work is isolated in `CTS-A-O-block` on `fix/overall-block-relations-20261016`;
the original overlapping checkout is left intact. PR #139 historical study and
verification documents are retained with explicit historical banners. For another
chat, fetch the latest main containing PR #140 and read its final handoff and
standing rules; the final release documentation descends from tested computational
source `08cd452e`. Verify that source identity before changing code or deployment.
This instruction does not describe a completed live reload. Do not overwrite the
other checkout or merge an older overlapping branch over these contracts.
Source checkpoints were pushed regularly. Private credentials/account records
are excluded from Git and public research evidence.
Operational progress/standing rules are also backed up as
`backup/cp10-operations-progress-20261016` at `0d9c75dc4fc5aef62e295a8239468f57e82fe4c0`.
The verification toolchain and exact failed/intermediate source fixtures are
backed up as `backup/cp10-verification-toolchain-20261016` at
`c0e0a153bd80fece234d4f7fa35d150c72265d71` (tree `f2b5b4812126054a2aaa69daf4158f07a93e42c4`),
under `verification/overall-block-20261016/`. The earlier `c7241dde2f610296a7809733f306d6c1a436b1da`
snapshot is its direct parent. All original 17 program/fixture files stay unchanged;
the final standalone report QA harness and packaging wrapper bring the source
manifest to 19 files, plus README/manifest (21 files total). The final report
launch was inline Python, with actual argv/pins/results in its run receipt.
Historical fixtures intentionally include failures; helper paths reflect this
workspace. Both remote backup tips were independently verified when written.
These separate backup refs were created without changing the frozen release
HEAD, working source or default index.
The exact tested CP10 source is also independently retained as
`backup/pre-overall-block-final-20261016` at `08cd452e16b37acac9799450066088ebceaa1314`,
verified by remote ref before the documentation-only final checkpoint.

CP9 corrects completed/error-job rerun eligibility and owns each background
backtest through a controller, absolute deadline and tracked task. Stop, shutdown
and disposal cancel only that runtime's work; canceled worker tasks cannot fall
back locally, publish late results or start queued successors. Shared market reads
can finish for other consumers; canceled owner continuations cannot write caches
or progress. A fresh stopped runtime may backtest; a disposed runtime cannot.
The test tracker cancels and drains before closing the pool. A fresh process
restart is still required; old untracked hot-reload work is not certified.

The queue baseline reproduced three failures; identical tests now pass 7/7.
Lifecycle baseline reproduced six failures; final lifecycle scope passes 10/10.
The final nine-file focused bundle passes 57/57 plus the existing fallback 1/1;
global TypeScript passes and scoped lint has zero errors/three existing warnings.
Its actual before/after inventory is **505 files**. An earlier 510 claim was
corrected in the retained scope erratum; the later canonical 510-file inventory
is a distinct scope and does not establish the earlier window retroactively.
CP9 broad checks passed (455 scripts, eight standard skips; platform 77; lint
zero errors/21 warnings), and stopped-fixture build/UI passed (28 checks, 431
decoded responses, 18 save/reload pairs). Its fresh 20-capture comparison and
independent audit completed without economic defects; no arm qualified both folds.
The 168-file regular core run was deliberately interrupted with exit 130 after a
further preset edit/delete invalidation race was confirmed. It is incomplete;
slow tests never started. Attempt04 preserves the partial run, unchanged 510-file
source/dependencies, zero memory-event deltas and all 40 observed owned process
identities exited. CP10 now selectively invalidates changed or removed derived preset caches and
cancels only their matching calculation. All four active saved-list writers use
the same path; exact immutable settings/WF fences guard both final publications.
Metadata-only changes, unrelated work and research-copy originals remain valid.
The corrected coherent nine-file bundle passes 69/69 plus fallback 1/1, global
TypeScript and scoped lint (zero errors/three existing warnings). Its actual
510-file before/after inventory is unchanged; dependencies match, cgroup-event
deltas are zero and all 11 observed owned identities/wrapper exited.
Fresh release checks run against this frozen CP10 source: broad, early two slow
cases, UI, comparison/audit, then the 168-file regular suite. Both runtime-phase
receipts must match the same source/HEAD/tree; no combined invocation is invented.
CP10 broad checks now pass: 455 script tests/eight standard skips, platform
77/77, full lint zero errors/21 warnings. Source/HEAD/tree and dependencies are
unchanged; all 135 observed owned identities/wrapper exited. Whole concurrent
cgroup max events increased 24,445, with zero OOM/kill/high/low deltas and no
per-process attribution. The next normal production memory gate passed.
The exact two slow cases passed 2/2 in 233.530s (14:43:53–14:47:46 UTC). The
actual two-day, queued-repeat and clamped 30-day preset case passed in 55.25s.
All 510 source hashes/HEAD/tree and dependencies stayed unchanged; slow memory-
event deltas were zero and four observed owned identities plus wrapper/observer
exited. The later 168-file regular suite also passed on the identical source
freeze and dependencies, as recorded below. The untouched execution
pre-phase memory snapshot is authoritative; a standalone launch-named diagnostic
was overwritten by a post-cleanup preflight. Its original bytes were not saved;
separate post-cleanup data and an explicit provenance note preserve that limit.
CP10 build/UI also pass: build 3.25s, 14 checks each in production/development,
433 decoded responses, 18 confirmed save/reload pairs and 26 screenshots. Zero
app/decode errors or drain timeouts; 12 navigation capture gaps and 36 blocked
external requests per mode remain disclosed. All 279 core/UI hashes and
dependencies matched; private servers/ports/browser processes exited. Root
visually inspected four desktop/mobile captures. These stopped synthetic SQLite
fixtures verify presentation and API mechanics; they are not account/venue proof.
The fresh CP10 study completed all 20 captures in 71.046s. Independent audit
reconstructed all 7,200 causal minute points with zero economic defects/missing
marks; owner/proof stay immutable with separate final linkage. Its observed
results match the prior study: return PF 2.3748515218, no settled Block uplift,
Long PF zero, Signal activity zero and no profile qualifies both folds.
The final standard 168-file regular suite completed at 15:30:34 UTC: **1,946
passed, zero failed, two standard opt-in skips and zero cancellations**, 1,948
tests in 323 suites, phase duration 1,838.015s. It started at 14:59:56 UTC after
a uniquely named normal production memory gate passed. All 510 canonical,
expected, before, after and current source maps, HEAD/tree and dependency lock
match the separately executed earlier slow receipt. Dependencies: 423 present,
zero mismatches and 49 absent optional packages. Both phase memory-event deltas
are zero. All 126 observed regular PID/start identities, wrapper and observer
exited; the owned lock is absent and no signals were sent. The actual regular
and slow receipts remain separate; no combined run is invented. Source and HEAD
stayed frozen throughout the tests. All seven offline release checks pass.
The final 16-row functionality matrix independently verifies 80 distinct evidence
hash pairs and 46 current source bindings. The immutable integrated source seal
records that regular verification was pending at seal time; final actual receipts
supplement that historical state without rewriting the seal. Reports and artifact
QA run only after verified cleanup. No earlier result is relabeled CP10.
Existing live preset caches created before these corrections are unverified;
a consistent backup and re-evaluation or selective retirement of derived preset
results is required before live reload. No live cache or execution ledger was
modified in this session. CP8 remains available on remote backup
`backup/pre-backtest-lifecycle-20261016` at exact `e6914363`; CP9 is backed up as
`backup/pre-preset-invalidation-20261016` at exact `da5fe490`.

## Final offline evidence and continuation

The six-file nonprovisional report and both saved deliverables are complete.
The final release documentation changes only `AGENTS.project.md`, this handoff,
`docs/work-tasks.md` and `docs/positive-coordinations.md`; tested computational
source remains `08cd452e16b37acac9799450066088ebceaa1314`. PR #140 records the
final documentation checkpoint and merge identity. A documentation-only commit
is not a new computational test run or a live deployment.

| Saved artifact | Bytes | SHA-256 | Persistent file identity/version |
|---|---:|---|---|
| cts-ao-overall-block-20261016.html | 7,741,448 | `2aeb1cf9717a2d46f04bdc62400a5609c501b6d2d14f589e57890ff6fccd7da8` | `libfile_e50f79b418808191b32b054d9136d14d`, version 0 |
| cts-ao-overall-block-20261016.zip | 186,935,749 | `1581a1f2ab0e9bb6f6d4756184e358028848e6987545695d6fa21eaaef0cd14f` | `libfile_ec0fe486e4a8819186a1606275bd75d3`, version 0 |

Saved file IDs are `file_00000000cbe8820dba186a577589b9c7` and
`file_0000000053cc81f5af4f8813e0d0700f`, respectively. The complete sanitized save receipt is
`cts-overall-block-final-save-complete-20261016.json`, SHA-256
`4180d015a9a938f5c6ec13724d95525e984b458453a45e62672914c236111e90`.
The original ordered save retained a successful HTML and a definitively failed
ZIP transfer. Only the ZIP was retried with identical verified bytes staged in
the active conversation workspace; its prepared save succeeded. Original failure
and successful retry receipts remain preserved. No source/private account data
or screenshots were saved in either deliverable.

Strict final validation passes: 20 comparisons, 120 hourly rows and 5,616 virtual
settled slices (4,752 positive allocations and 864 known zeros). Repeated arms
share opportunities and are not independent market trials. Three embedded CSVs
match their physical bytes. Desktop and mobile each passed six table inventories,
four expandable sections and all three real CSV downloads: six byte-exact
downloads total, zero page/console/request errors, external requests or document
overflow. Root visually inspected both actual overview screenshots. Report
validation SHA-256 is `e410949c2c267c7b3120280756fe63977860ddcf106490cc52b94121af1977c9`;
final standalone QA is `c2109e08ef4fe914fb909b3b14ee94d149b6d25d082d29f11940f1531730ea7d`.
All owned report and browser resources exited before packaging.

The ZIP has **1,799 members**, covering 1,811 logical inputs/1,795 physical inputs,
the current protocol and all eight preserved study attempts plus four historical
core attempts. Public feed deduplication preserves 83,614,640 bytes through exact
manifest mappings. Full input credential scans, streaming copy hashes, every
member CRC, final input fingerprints and the whole ZIP hash pass. Six final report
files and four nested source-free baseline manifests were independently matched
inside the ZIP. Code bodies, dependencies, private databases and screenshots are
excluded; actual verification source is retained on the separate Git backup branch.
Archive manifest SHA-256: `111461354a8b3f29c9a4d9c821c594caf77e615eb5f8d8b8f9a9f48facdef696`.
Packaging receipt SHA-256: `bfb6d414b1bfb3c1159bc208539b5464ff09f64aa87714c0ab855dad8280d564`.
Packaging finished in 517.663s, exit zero. Whole concurrent cgroup max events
rose 34,845, with zero OOM/kill/high/low deltas; this is not process attribution.
All 510 computational source bytes, HEAD/tree and frozen metadata stayed unchanged.

The archived final evidence index is `f82a71b9846643efc0370c24b8b88c3370f0cdc8499c0ca5fb29dfbb5150f676`.
Outer archive/save identities are deliberately recorded after assembly, avoiding
self-hash cycles. A report-launch index was updated before being separately copied;
its exact prior bytes were recovered by reversing the documented record/status
append and matching the already recorded SHA-256. That explicit provenance and
all exact preserved launch metadata are included in the evidence.

All seven offline checks pass; no profile qualifies both research folds, and
settled Block PF/cash equals Off. Actual X02 account/execution PF, live reload,
full 25-symbol background-catalog compute performance and the external rename
remain unverified. Missing live access/resource identity remains a prerequisite,
not a request for another authorization. Preserve protection and take consistent
live backups before any eventual reload; re-evaluate or retire unversioned old
preset caches and restart the process.

Overall learns from settled accepted Real virtual orders before account funding.
Each exact config × symbol × direction, symbol × direction, global direction,
and exact indication/lane × direction keeps independent history and pauses.
Overall source legs share one total cap including base and relation volume.
Shared accepts any qualifying enabled relation and an optional independent
`sharedRatio`; Additive sums valid enabled levels. A positive 0.2 request remains
0.2 even with seven volume steps; larger step requests round down. Six-decimal
recording also rounds down, so tiny additions cannot inflate into a full micro-unit. Defaults for
ratio, steps and cap are unchanged. Current holdings retain their entry Block
multiple; actual confirmed quantity/equity resizing reconciles their protection.

Runtime restoration merges current defaults: persisted settings missing
`historySource` adopt accepted orders. Explicit `real-candidates` preserves the
legacy diagnostic across restart; only direct configs outside runtime default
merging have the unset-field legacy fallback. Neither history is venue-fill
proof. Empty accepted-history Block Active cannot invent a seed or borrow raw
wins; its explicit Signal own-base exception remains.

Native protection now follows confirmed parent quantities, weighted source
shares, one-way funded units, partial fills, cancellation races and refusals.
Provisional stop/TP IDs and residual quantity caps are durably checkpointed
before requests; required state/journal failure blocks new funding. Volume
uses verified selected-account equity and all enabled position/exposure/risk/
backstop/free-margin budgets. Unknown or pending quantities reserve capacity.
Cumulative receipts do not certify independently timed individual fill slices.

The shared worker pool synchronously cancels running calls across module copies,
including a queued successful reply and a reserved-worker handoff. A later ordinary
worker exit cannot inherit an earlier abort reason. This new shared schema requires
a fresh process restart; hot adoption of an older scheduler object is rejected.
The selected connection's missing-key help no longer directs X02 to X01 credentials.

Primary PF removes external Block × coordination weighting once, on the same
funded settled parent-close sample as cash reconciliation. Intrinsic ladder
semantics remain. Duplicate modeled parent closes reject scoring, regardless
of source legs/allocation indices. Unknown ownership/returns/overflow remain
unavailable; known zero allocations stay visible outside funded PF. General
session headlines, groups, hourly counts/returns/hold averages now share that
owned cohort. Virtual requests, episodes and marks are labeled separately.
Confirmed zero fees persist distinctly from unknown/legacy estimates. Live
statistics retain actual close notional even at zero return; cash no-loss
labels require explicit provenance.

The optional `sideGateN` filter now reads its own bounded all-candidate direction
history in simulation, runtime, audit and cached pending entries. Rejected losses
and winning recovery cannot disappear into accepted-only Block history. CP7
passes full regression/audit 93/93, Block 46/46, all 128 processing combinations,
global TypeScript and scoped lint. The seven-failure complete CP6 invocation and
its original stacks remain preserved. The historical CP8 regular verification
passed 1,917 cases with zero failures and two standard opt-in skips. Its separate
slow verification failed in the queued-preset wait; the preserved result is below.
CP9 queue eligibility and disposal fixes passed focused checks; the further CP10
preset-revision repair and current release status are described at the top. Main integration also preserves measured commission across
identical sparse cumulative-fill polls, while changed quantity or price requires
new fee evidence; all four added regression cases pass in the 62-case native focus.
The CP8 trace/rounding focus passed 102/102, global TypeScript and scoped lint.
An earlier 149-case matrix/replay focus is preserved before the narrow rounding
correction. The optional trace includes unknowns in available sample counts and
never changes admission or sizing. Historical CP8 standard core selection was 166
files plus two slow cases, with 508 source/config files. CP9/CP10 use 168 regular
files plus two slow cases and a separate 510-file release inventory.

### Preserved historical comparison on CP8

Ten arms × two six-hour execution windows, each with six hours of evaluated
preparation; older candles initialize indicators only. BTC/ETH/SOL/XRP,
unchanged complete configured focus/exits/cost/capital/settings and causal gates.
Protocol SHA256:
`70d7b62c80a11f1be2971e7873e1560f6c52f3d38c3526fb433ddfc6e553d99d`.
108-file source-set SHA256:
`48c4240a00b0243d2325c8079d36769dfb4bcb040d82c320fac3aa1e3ea4b87a`.
Source-freeze record SHA256:
`55c5470b6f806a7b2d6f0c5754e77a94359380e95b222b945dee3f52770ef906`.
Independent CP8 accounting audit SHA256:
`ca91afe47b7fefec45d7175aaca0c14efa4dc573b17e29cc6cfa1a1342423090`.
Parameter/source summary proof SHA256:
`5e29a2c9cc4f9cf23ce984acfef3cdedf025b21820a32f1f6e8ce6ad8a8accca`.
Final owner manifest SHA256:
`7a6665a76648a260cebe5c160bb9b02576d87326885de5f179d1c89231861945`.

All 20 fresh CP8 captures completed in 69.138s. Exact settings, feeds, folds,
arms and policy match the prior frozen protocol; no outcome-based retuning
occurred. The independent audit recomputed all owned cohorts, groups, hours,
closed/open cash allocations and 7,200 causal minute equity/margin points,
with zero economic defects. Raw CP6 economic identity was observed after
calculation, never required or assumed. This is reused retrospective evidence,
not an untouched holdout or venue execution.

The frozen study has `sideGateN: 0` and `blockTrace: false`; it does not activate
the newly repaired optional direction filter or diagnostic trace. Their enabled
runtime/simulation behavior is verified separately by focused regressions.
The original captured study is retained as attempt03, corrected CP5 comparison
as attempt04, memory-degraded CP6 refusal as attempt05, and the complete prior
CP6 capture as attempt06. Initial preservation manifests remain unchanged;
the later CP6 owner-binding copy has an append-only addendum. Earlier protocols,
raw outcomes, failed checks, incomplete diagnoses, errata and audits remain
retained. No source, memory threshold or strategy gate was waived.

The book is a **modeled $1,000 account**, sized at **2% of equity** with
**10× leverage** and fixed modeled **0.20% round-trip costs**. The research
launcher uses the frozen X01 fallback caps
`maxPositionX: 0.75` and `maxExposureX: 7` where its captured settings lack
positive caps; these are research inputs, not authenticated X02 account limits.
Drawdown measures unrounded model minute-close marked equity, including open
marks. It does not measure the worst intraminute mark or verify tick-level
fills, slippage, funding or liquidation behavior.

All 20 captures failed the native Signal-execution activity check. This study
does not establish active Signal execution or positive independent
Micro/Minimal/Short qualification. Engine/direction aggregate PF cannot
substitute for those missing exact cohorts.

No arm passes both folds. The first window and all Active arms have no owned
closes, hence unavailable PF. In the second window every non-Active arm has
792 funded parent closes (258 losses), 144 zero allocations retained separately,
return PF **2.3748515218**, cash PF **2.2230310512**, closed cash net **+4.41871304**
on the simulated $1,000 book, and exact minute-equity drawdown **2.8716649447%**.
Long direction (+1): 60 closes, all losses, PF **0**. Short direction (−1): 732
closes, PF **5.93804698**. These direction aggregates do not establish the
independent Micro/Minimal/Short range qualifications.
All 792 matched unit returns are identical to Off. Actual Block raises occur on
450 funded closes, but position caps neutralize their funded amounts; incremental
settled PF/cash benefit is zero. Shared 0.2/0.4 saturates the tested 2× cap at
observed levels, so this window cannot establish higher-Shared superiority.

Base computation completes 920/920 requested comparisons, while required range/
type coverage and activity conditions genuinely fail. `grid.allSets` is a mode,
not completion. Empty PF equality remains non-comparable (null serializes
unavailable values), never a manufactured numeric pass. No performance defaults,
promotion thresholds or losing/empty cohorts were changed to obtain success.

### Preserved verification snapshots and CP8 checks

| Check | Status |
|---|---|
| Prior Block relations/ratio/replay snapshot | 77 focused cases pass on their recorded checkpoint; retained historical evidence |
| Prior independent exits and modeled return provenance snapshot | 63 focused cases pass on their recorded checkpoint; final CP8 regular core also passes |
| Prior native quantities/protection/durability/fees snapshot | 167 focused cases pass on their recorded checkpoint; added CP8 sparse-fee focus passes 62/62 |
| Prior reporting/API/UI snapshots | 147 focused cases and 16 session follow-up cases pass on their respective recorded checkpoints |
| Complete scripts, 52 files | 455 pass, 8 standard skips, 0 failures/cancellations |
| Platform/auth/UI helpers, 8 files | 77 pass |
| Final CP8 Block trace/admission and conservative recording | 102 focused cases pass; earlier 149-case pre-quantization matrix/replay scope is retained separately |
| TypeScript | Final CP8 pass |
| Full ESLint | 0 errors, 22 existing warnings; scoped seven-file lint also clean |
| Preserved CP6 worker pool cancellation snapshot, 9 files | 59 tests pass; those pool source hashes remain unchanged in CP8 |
| Statistics property fixture repair | 3 focused tests / 700 cases pass; separate unknown losing-return regression retains cash/count and unavailable PF |
| Final production build | Pass on CP8, exit 0 in 3.16s; 277 source hashes unchanged |
| Stopped synthetic SQLite dev/production desktop/mobile UI fixtures | 14 checks each mode, 427 decoded API responses and 18 save/reload pairs; 0 app/decode errors, 18 navigation capture gaps and 36 blocked external requests per mode retained; selected X02 help verified; private processes stopped |
| Complete regular core, 166 files | 1,917 passed, 0 failed, 2 standard opt-in skips, 0 cancellations in 1,714.146s; all 508 source hashes unchanged; prior complete CP6 failure and CP5 partial failure preserved |
| Separate opt-in runtime slow cases | CP8: 1 passed, 1 failed, 0 skips/cancellations in 1,078.134s; timeout at runtime.test.ts:640 awaiting the queued 25-symbol preset; initial two-day result completed, 30-day assertion not reached |
| Historical comparison capture/accounting audit | All 20 fresh CP8 captured; independent 7,200-minute accounting audit passes; performance policy not met |

Focused counts overlap other suites and must not be added into a monolithic
claim. Checks use before-import nonlocal transport guards, sanitized credentials
and bounded workers; no venue traffic occurs. Original failed script fixtures
and browser setup attempts are preserved. Synthetic PF fixtures explicitly declare their known unit basis. Legacy raw-
bootstrap tests explicitly select candidate history; default accepted-history
checks, all 128 processing combinations and numeric/PF assertions remain. No
assertion, cost, sample or promotion gate was waived.
An invalid PID-namespace RSS trace in one broad wrapper is excluded from process/
memory conclusions; direct known host PID cleanup was separately verified.
The first CP5 complete-scope invocation was interrupted after two statistics
property fixture failures; it is incomplete, not a complete passing suite. Its
507 source hashes stayed unchanged and no OOM/kill occurred. The fixture now
declares multiplier 1 for intentionally unit trades without changing RNG calls
or the original assertions. The separate mixed-legacy case confirms unknown
returns cannot be silently treated as known. Both original failure stacks and
corrected focused results are preserved before the CP6 invocation. That complete
165-file run finished with 1,882 passed, seven failed, two standard opt-in skips
and zero cancellations; slow correctly did not start. Its seven actual causes
were repaired and focused-verified in CP7. The historical CP8 combined-source
regular run passed completely, but its separate slow phase failed. Full attempt03 retains
both raw logs, the actual stack, all 508 unchanged source hashes, exact matching
dependencies, zero memory-event deltas and verified cleanup of 129 owned identities
plus wrapper/observer. No signals were sent. Its failed release-status SHA256 is
`722928b70f12d8b734b00ad5bc3c074992fdb8b65801930b622a7e3d1bfe50c1`.
The fixture waited 600 seconds for a new 25-symbol preset introduced into the
catalog. Separate static and baseline checks found that a completed job ID was
wrongly excluded from later queues, and disposal failed to invalidate its running
backtest or prevent fallback, publication and next-queue work. Those defects were
corrected and focused-verified in CP9. The later preset-revision invalidation
race requires CP10 corrections and fresh release verification. The original
timeout remains a failed attempt; it is never relabeled as a passing workload.
Memory guards stay enabled. The prior CP6 full run initially observed conservative hard
pressure from active file cache, then passed the API contract after capacity
recovered. A later own-file cache hint preserved all 590 files' stat identities;
the bulk recovery had already occurred and is not attributed to that hint.
No source, memory threshold, trading gate or unrelated process changed. A saved
research lock reappeared after a successful unlink; its namespace-local PID is
not process ownership evidence and must never be used to kill a process.

### Live and remaining work

The operator explicitly requests actual x2 VST testing of opening, updating,
closing, protection, volume, statistics and sustained execution. Canonical
connection `bingx-vst-02` uses the VST host, but no usable authentication or
reachable host is available here. The documented live-host/SSH routes return ENETUNREACH on TCP port 22 from
this environment; no exchange API probe was made, and this does not prove
the hosts or venue are down. No venue order, live
reload or account success was verified. Before any authorized live change, take
settings/durable-state and database-supported consistent backups, verify the
actual selected demo account, and reconcile current own holdings/orders.

Open work: obtain authenticated x2 access, perform bounded venue lifecycle and
forward exact-config PF/volume/statistics checks, establish adequate independent
samples in both directions and each requested range/type, and measure future
Block benefit/drawdown without weakening gates. High order count and continuous
positive PF are unproven. The external rename of `imperative-greeting-fox` still
requires its exact deployment resource identity; no guessed resource was renamed.
A metadata-only check of connected Sites/Library/GitHub status surfaces found
no verified matching asset. Available GitHub tools cannot inventory Codespaces
or deployments; the prior Vercel inventory also found no matching project.
Evidence: `cts-block-rename-identity-20261016.json`, SHA256
`55c3cbd1bf2390e713e545bf1ea8cfbe9f2fc9403291bcc08d8583d1ceff2834`.

Historical CP8 UI and comparison results are preserved above; current CP9/CP10
status is at the top. The final evidence archive/report identity and complete
current regular/slow results will be filled after verification. See `docs/work-tasks.md` and `AGENTS.project.md`.

## 15 October post-Base promotion and range continuation — verified source and evidence

Active work is tracked in `docs/work-tasks.md`. Baseline main is `c70cbd25213bd072c341f5e20a8376d63b5ab121` (PR #137), preserved remotely as `backup/pre-promotion-range-20261015`. Implementation branch `fix/post-base-range-promotion-20261015` has [PR #138](https://github.com/mxssnx-creator/CTS-A-O/pull/138). It is not a live deployment.

Checkpoint `eb12239c32f50752b71cd039ebb1ceb851b36124` fixes custom Base/actual range stop and trailing-floor parity, with 79 focused tests and byte-identical shipped defaults. Checkpoint `790e5c292463d5dcae668b61f11ca628e277e07a` replaces range-wide nominal promotion with versioned exact config/symbol/direction evidence. The promoter preserves configured kinds, requires qualified post-Base and owned execution return proof, and retains the execution closes needed to recompute the runtime's actual last-N window. Independent guarded review passed 40 tests, including the pure promoter and strict runtime proof cases. Production runtime/UI/API source is frozen and pushed at `207e2170a9561e877bcc3b177be23bd88fccd365`, tree `4a39adb30b7055c7b36a09a70c2175952c4b1b21`. Focused checks pass: runtime/provenance/schema/readiness 64, Control/Entries fixtures 113, promoter 24, UI/API reporting 54, and an additional API contract fixture. TypeScript passes; focused lint has zero errors. The range comparison, production UI verification and affected integration-fixture corrections are complete; their exact scopes are recorded below.

The audit reproduced duplicate underlying fills inflating sample counts, stale aggregate PF relabeled to another last-N sample, dust allocations, nonfinite cumulative returns, and arithmetic tolerance turning a zero-P&L close into a no-loss win. Corrected paths use canonical net P&L/owned notional arithmetic and exact chronological windows. Reference evidence must not hide newer local losses or unknowns. Nominal `live_lane_trades` attribution cannot establish allocated execution ownership. Frozen UI/API changes distinguish post-Base accepted virtual outcomes before allocation, recorded paper diagnostics, allocated owned paper evidence and verified venue execution. They preserve unknown and losing closes instead of silently backfilling older wins.

The complete range diagnosis is in `docs/range-admission-diagnosis-20261015.md`. In the original six-hour funded replay, Micro return PF is 0.8439145865 on 23,294 settled slices, Minimal is 1.3815196967 on 2,746, and Short has zero funded closes. Positive pooled Minimal performance does not prove an individual config/direction. The three-profile follow-up protocol was frozen before scoring at 08:02:47 UTC, SHA-256 `c3bee5d76710d4de16c135ecae4cbaa5ac419549bd16b0b18134819558460316`. It keeps all gates and costs, uses exact regular/combined 15m IDs with 15/30m support, separates 205-hour indicator warmup from 72-hour evaluated prehistory, and compares two historical six-hour development folds.

The first study invocation preserved six startup failures before any strategy outcome: its launcher serialized a partial nested Micro range while the runtime requires the complete range object. The harness correction sends the full frozen materialized settings, applies production lane normalization (requested support 15/30m; actual base-data lanes 1/15/30m) and verifies exact settings/WF parity on all three stopped runtimes before scoring. Fourteen focused harness tests pass. The exact 32 focused outcome IDs and all 57,344 configured protects remain unchanged; no 1m outcome or gate change was added. Attempt 01, its original seal and all startup logs remain preserved. Attempt 02 ran against `3834804ffae367a0c0a4a7cab1330cf200ff4791`, source SHA `c4b9732334500c9047cd80b15be4cbaf17d964207032aabc27e28a36418ffaeb`, seal `594de3edc7f1d38eade322b4f70901b73b96216900db0d5a828b604416f1ef75`.

All six corrected engine attempts exited zero at full memory level. Three fold-1 cases had no new-entry opportunities and retain failed strategy activity/completeness status; fold 2 retains the failed Short activity check. All 18 failed-check occurrences remain visible. No profile qualified and no outer GET or live promotion occurred. The complete 18-range/864-hour report is `docs/range-study-results-20261015.md`. Short historical Base admission improved 1→3/3→4 pairs with trailing Base cells, and fold-1 configEval passes rose 139→183; execution stayed zero. The two eligible Short opportunities failed prior symbol-side PF 0.7959115653. Fold-2 Micro unit PF was 0.8616866761 for P0/P2 and 0.4904366222 for P1; P1 Minimal was 0.4437584524. Minimal P0/P2 had only 16 no-loss closes, insufficient for the frozen 30-onset rule. No exact config/symbol/direction research cohort has 30 historical onsets. All losses and both directions remain retained; cash PF above one never qualified losing unit PF. Independent reconciliation verified all outcomes, hourly zeros, frozen hashes and causal rejection evidence using less than 68 MiB. The focused 15/30m history reconstruction meets the requested horizons; the mandatory unfocused 1m series has only 66 pre-trade hours and is explicitly disclosed. Physical origins are reconstructed rather than recorded runtime telemetry. Four reporter tests pass. Independently reconciled whole-book fold-2 P0/P2 has 90 funded closes, primary return PF 1.0820357007 versus cash PF 1.3778827443 and net +$1.59559328813. P1 has 112 closes, return PF 0.4801513711 versus cash PF 1.2639199617 and net +$1.21446934408. Whole-book figures cannot qualify an individual range/config or replace the empty first fold. Selection remains NONE. The final reporter supplement is pushed at `a5442158a46268da560cbc175c807350fed4c17f`.

Full-repository lint passes with zero errors and 22 existing warnings. The broader script invocation recorded 414 passes, two functional-browser failures and eight skips. Only Compare's expected numbers were missing because the test inherited `CTS_CORE_COMPARE=0`; explicitly enabling comparisons inside its bounded fixture and waiting for comparison completion then passes all four functional cases. All 416 distinct active script cases are verified across those invocations; do not represent the original run as wholly green. Additional UI unit checks pass 24 cases. Guarded production build and final desktop/mobile QA pass: 11 grouped checks, 94 officially decoded API responses, 14 screenshots, zero app/decode/capture errors and 274 identical core/v2 source hashes from build through QA. Font/Grok requests were blocked and logged. Three scratch-probe mistakes are retained separately. The preview stop wrapper reported the prior PID-namespace mismatch; actual cleanup verified the owning exec ended, its reported host PID was absent and port 8081 refused connections.

The full 163-file core invocation completed in 1,833.51 seconds: **1,772 passed, 32 failed, two opt-in slow-test skips, zero cancelled**. All 242 core TypeScript files were byte-identical throughout; OOM counters did not increase. Twenty-six native-order fixtures supplied no exact settled promotion history, four engine-to-venue cases consequently had no admitted targets, and two SQL assertions ran under the broad wrapper's `CTS_CORE_STATE=off`. These are preserved failures, not a green monolithic run. Corrected guarded native/SQLite fixtures pass **37/37**, the isolated real-SQL resync case passes **1/1**, and final runtime/venue integration passes **7/7**. Only six test files changed after the full run; production source is unchanged. Across the complete invocation and affected reruns, **1,805 distinct current regular core cases** are covered, with two optional slow-test skips. No OOM counter increased.

The first E2E repair explicitly required an actual current paper lane to have sufficient positive exact post-Base history and failed its before hook. That unsuccessful attempt is preserved. The final fixture keeps the real computed runtime/book unchanged and asserts its cold start has zero owned execution history and sends no orders. A separate real CoreRuntime uses clearly declared synthetic settled model trades and independent known-$10-owned-paper history per config/symbol/side to test convergence, protective stops, independent hedges, no churn and ledger reconciliation. Its real readiness and strict promotion methods remain active; the former `requireReady:false` waiver is removed. The negative projection changes both canonical unit returns and sized returns, proving rejection instead of only corrupting cached PF. Synthetic mechanics do not establish profitable market or venue performance. Final E2E source SHA-256 is `f07853c400e81a0b6a4b8e72514a186d978e7bb424f423b6a38572d2e6d3d7e7`; final typecheck/scoped lint pass. Native/SQL fixture checkpoint is `089e6d6848c8d0e6a9ae75f1f2a93285d1779b15`.

Final tested source: **`f873221550c80933ebc7efbc7995ceba4ccead53`**, tree **`429085a0edda103f78c2078e0cc84f0d730503b2`**. Independent final review approved all six fixture repairs and the exact E2E source hash above. The later evidence-record checkpoint changes documentation only. Consult PR #138 for its final merge status/SHA.

Saved evidence: **`cts-ao-post-base-range-evidence-20261015.zip`**, **38,376,641 bytes**, SHA-256 **`b7a7143037ffddce14f2a3243f814cf47a9b0b99965ced62ac28ab17bbe2ef21`**. Saved file identity `libfile_45908e26864c8191a69be441754d7d13`, version `0`. Its 203 members include exact frozen feeds, all 18 range outcomes, 864 hourly cells, complete exact-config/direction and owned-close evidence, both development attempts, the original failed full test run, corrected reruns, final source hashes and successful production UI reports. All CRCs, original evidence sizes/CRCs and relative report links pass; no duplicate members, code trees or screenshots are included. The final verification summary explicitly limits PASS to the software/offline/synthetic scope and keeps strategy selection NONE. An incomplete temporary repack was detected and preserved separately; the verified evidence archive was intact, then repacked and fully checked before saving. No live or private account data is included.

Authenticated live access and the exact external rename target remain unavailable. No live reload, exchange request or order has occurred in this continuation. The prior operator authorization remains valid; do not ask for redundant permission, invent live proof or relax evidence gates.

## 15 October Signals continuation — verified source and evidence

Release branch: `fix/signal-trailing-20261015`, [PR #137](https://github.com/mxssnx-creator/CTS-A-O/pull/137). Tested implementation/report source is `b138428bc6beafe6407048baedf153a6d98f2cea`, tree `164a4ac3dea2481e2035ae3d26f0a0b539ccac57`; the final follow-up changes documentation only. Remote backup `backup/pre-signal-trailing-20261015` preserves main `31b1eebace3a5cab179ee5a61e4d28d58d57c791` (PR #136). Earlier source checkpoints remain in the release branch history. Consult the PR for its exact merge identity.

Signals add nine independent default trailing-only SL × trail sets: SL 1.5/3/6%, activation 0.5/1/2%, step 1, before existing lane scaling. They have `tp: 0`, `trailOnly: true`, kind `trailing-only` and config suffix `|to`; nondefault step is encoded. Normal/capped Trailing IDs remain unchanged. Held-only recovered configs retain exact distances and ratcheted stops through range changes, relative adjustments, worker transfer and restart, but cannot rank or re-enter. A capped Signal's explicit target must not inherit the global engine free-trail setting.

The account audit found desired reductions releasing spendable capacity before actual confirmation. New admission uses actual owned and unresolved quantities, current mark-to-stop risk and verified equity. Legacy Entries now receives the same gross/risk/backstop/free-margin and actual position caps while retaining its documented fixed-unit sizing; the ratio remains Overall-only. Confirmed but never-observed fills remain reserved until visibility or confirmed protective-close deltas reconcile them. Unknown protection/account/price blocks guarded growth while held protection continues.

The remaining Presets/CLI weighted-PF leaks are corrected. Endpoint-inclusive Preset backtest qualification stays endpoint-inclusive and is labeled; settled diagrams have a separate matching sample. New saved/auto/backtest records retain unit/gross/no-loss provenance. Old aggregate-only saved records remain unavailable as primary PF. An old unmarked auto PF cannot reject newer verified unit evidence. Cash curves and raw sized outcomes remain diagnostic.

The six-hour test is frozen to **15 October 00:00–06:00 Europe/Vienna**, with evaluated prehistory **14 October 18:00–00:00**. The original strict 12-hour dataset has 12 × 720 completed 1m bars, no gaps, SHA256 `89585cd14f0bde4c13636d3cd14d489b0762c3fe8b633424ba5205290925f3ae`. Its preserved first attempt produced zero trades/tapes and failed completeness checks: the default longer-lane indicator warmup was unavailable, and a Signals-only engine removed required confirmation candidates. This is an unsuccessful attempt, not evidence of profitable execution.

The revised protocol retains the exact six-hour performance and trading windows and every gate. Cached earlier candles initialize indicators only; replay-only constructor `evaluationFromT` excludes pre-floor entries from Base/tapes/MFE and workers. The default engine confirmation focus is restored, with Signal PF reported separately from the shared system cash book. A pre-floor held book causes an explicit rejection while preserving its existing protection. Revised 12-symbol warmup data has 303,840 valid 1m bars, SHA256 `92940eb92f38db51016280421c6d64ce4944f5e52950b09b3472a66414108a5b`; no further network acquisition was needed.

The second attempt exposed an actual discovery dependency: even with Signal `baseGate:false`, a sparse `DEFAULT_PROTECT` representative blocked every independent protection history. Discovery now calculates every configured initialized pair in that mode; explicit `baseGate:true` retains the representative gates. Typed/config PF, sample, guard, cluster and confirmation gates remain unchanged. Runtime and saved-preset backtests share the same helper. Discovery counts are separate from representative PF-qualified counts.

Final attempt 03 calculated **all 504 Signal pairs and all 19,278 effective protection configs** (19,656 requested). Normal and capped Trailing each have 7,560 effective cells; trailing-only has 4,158. On 1m, existing minimum-trail floors merge nine raw no-TP cells into six effective IDs; the 378 requested aliases remain visible. Independent candidate diagnostics after costs are Normal **17,266 closes/PF 1.152728** (8,759 long/8,507 short), TP+trail **16,365/PF 2.710891** (9,302/7,063), trailing-only **17,393/PF 0.752508** (9,226/8,167). These are unqualified independent tape calculations, not funded execution performance. The active-unit TP+trail subset retained all 20 losing short closes (PF 0.009424), rather than substituting the profitable full candidate pool.

A single capture-only repeat adds **18 type-hour and 288 type/range/lane/direction-hour cells**, retaining empty and unknown samples. Its frozen addendum SHA256 is `ccf887e9d99b1c0bea295c6245d909ea391b8f6a15deec7a37b308891f5a2d89`. Original trades, open positions, tape aggregates, configurations, settings, funnel and all 62 check records match exactly; only reporting fields and wall-clock/timing/memory measurements differ. Candidate partition sums reconcile within 1e-9. The 03:00–04:00 Vienna TP+trail cohort has ten closes and no losses; score 4 is a sentinel, not a measured finite PF.

The frozen replay is **56/62 checks, not an all-green execution result**. Engine ranges sh/gn/lg built zero admitted configs: all 1,008/1,152/1,440 respective grid cells were rejected by unchanged `baseRange` admission. Their three configuration-coverage and three activity checks therefore remain failed. Complete independent Signal history calculation is separate from those engine range admissions. The legacy raw execution check includes seven planned Signal endpoint entries and does not establish funded ownership.

**Funded Signal entries, settled closes and endpoint positions are all zero**, so primary Signal PF is unavailable in every hour/type. Seven planned short endpoint marks are retained separately and had numerical-zero capital allocation. Prehistory PF ≥1.1/minimum-three config-side diagnostics count 0 Normal, 114 TP+trail and 545 trailing-only passes, pooled across symbols; they are not actual Base admissions or exact-symbol activation proof. Do not relax gates or invent trades to claim that both directions executed.

Report-book ownership is determined after uniform USD roundoff normalization. `BOOK_NOTIONAL_EPS_USD=1e-9`, matching existing live monetary-comparison precision, zeros finite nonnegative allocated total notional at or below that tolerance before units/cash/book updates. Raw allocations and the pre-normalization book remain retained. Tiny positive floating cap residues cannot become funded trade counts. No engine, source, PF gate, costs or return was changed by this book-only repair. Final shared owned book: **26,098 settled close slices, return PF 0.9016968601, cash PF 0.7599364745**, net **−$26.63299385**, balance **$973.36700615**, equity **$943.502663**, max equity drawdown approximately **9.4313%**, from $1,000. The 34,054 virtual pre-sizing walk-forward records (PF 0.823968) are a separate diagnostic. Earlier strict-positive/dust ownership counts and PF are superseded.

The four-source Signal research result is withdrawn pending a corrected rerun. Its grid widened some fast-lane trailing configs below `minTrail`; runtime disables those configs after lane scaling. The corrected research runner now matches that behavior and verifies parity against `buildTapes`, yielding 2,320 config-side rows across 1,160 distinct protection configs. The referenced market cache is absent from this checkout, so no corrected PF or selection result is available. Archived performance figures in `docs/signal-research-results-20261015.md` are retained for traceability only and are not verified strategy performance. The four research sources remain default-disabled; this reused cache was retrospective chronological evidence, not an untouched global sample or live proof.

The default core test command and `test-all` now install a portable before-import offline Node transport guard, clear exchange/proxy credentials and propagate guard-first workers, including CJS watchdogs. It is a bounded Node test surface, not an OS sandbox. Failed child status, explicit slow-test policy, coverage/headroom/governor behavior and pinned synthetic dates are preserved; nested test-runner context is cleared. A delayed eval-gate mock now explicitly disables its own memory kill floor while keeping production guards unchanged. Generated `runs/` source snapshots are excluded from ESLint; active source is linted once. Final checks include script tests **396 passed/8 opt-in skipped**, platform **76 passed**, typecheck pass, lint **0 errors/22 existing warnings**, production build pass, and desktop/mobile production UI/SQLite checks (122 decoded API responses, no app/decode/capture errors; independent no-TP/source controls and measured/no-loss/unknown PF verified). External Fonts/Grok requests were blocked for offline QA.

The full 159-file core run finished in 1,663.77 seconds: **1,742 passed, one failed, two opt-in slow-test skips**. All 237 core TypeScript hashes stayed unchanged during that run. The sole failure was a progress fixture assuming its first job completed Paper. A forced memory-aborted first job reproduced that exact assertion; an unpressured original test passed. Production correctly terminated the aborted job and retried. The fixture now uses scoped deterministic memory thresholds, restores the prior environment/cache, and separately tests the real abort/retry path, including no premature compute/Paper publication, full completed stages, monotonicity and final book readiness. Both corrected cases pass. Production memory guards and all trading code remain unchanged. The complete corrected runtime file then passed **27 tests, zero failures and two opt-in skips** in 513.99 seconds, with all 237 hashes unchanged during that rerun. Across the full run and corrected runtime rerun, **1,744 distinct regular core cases are verified**, with two distinct slow-test skips. Only `src/core/server/runtime.test.ts` changed between runs. The original failed full-run evidence is retained; this is not represented as one wholly green monolithic invocation.

Implementation/report checkpoints are `1dd3f9364930afd79ce75616997e851746bd6814` (complete evidence helpers) and `4d73220adf7e4e1d10b725c911254a5ada199229` (exact literal UTC/Vienna workbook labels). The workbook includes a clearly labeled deterministic 3,024-row configuration index; all **38,556** full config-side rows and requested aliases remain in the evidence CSV/JSON. Timestamp export/readback, all 14 workbook reconciliations and all OpenXML parts pass.

Evidence artifacts: `cts-ao-signals-six-hour-20261015.xlsx` (401,901 bytes, SHA256 `350af44945b416e9854a2235bd8918c611caf2f80af8ef56ce30d1c84b6d4761`) and `cts-ao-signals-evidence-20261015.zip` (49,307,793 bytes, SHA256 `ae02c0f41bec0866d62a88dcc326b75321c25e8a835b1614cb180e80ba4dd887`). Both are saved successfully. The ZIP has 143 entries; its manifest verifies all other 142 files by byte count/SHA256, and CRC checks pass. It retains complete/repeated research, frozen public feeds, full six-hour configuration and hourly evidence, prior unsuccessful attempts, original and corrected QA runs, source manifests and a data dictionary. No screenshots, copied engine source trees, environment files or private/live database state are included. Evidence metadata records source `b138428bc6beafe6407048baedf153a6d98f2cea` and PR #137; its merge field is intentionally null because assembly preceded the merge.

Authenticated live host/deployment access and the exact `imperative-greeting-fox` resource identity are still absent. No live reload, external rename, live backup or exchange order has occurred in this continuation. Prior authorizations remain valid; access is the missing prerequisite.

## 15 October continuation — verified source and release record

The operator confirmed **CTS-A-O**. CTS-G's separate replay/checkpoints are outside this task. This release is carried by `fix/report-pf-20261015` and [PR #136](https://github.com/mxssnx-creator/CTS-A-O/pull/136). Its pre-release main is backed up as `backup/pre-report-pf-20261015` at `54b35b08606faff332f4637f889d2a8a2cabce2b` (PR #135). Consult PR #136 for the final merge identity.

The exact tested source is `fdec0ffe9756bee6641d5aa8c5f35c56edc4c932` (tree `d03d640032c4b0f5f3af9a7ca8b788f58a4f9a5c`, 73 changed paths). Production source was frozen at `8ffed441`; the subsequent source checkpoint changes only six existing test fixtures and this handoff. Known synthetic summaries now declare their unit basis; losing-PF assertions remain strict, and the trading E2E uses actual synthetic loss rows rather than corrupting only a cached PF. No production guard was relaxed. Final release changes after this checkpoint are documentation only.

The audit reproduced unit returns +0.8%/-1%, externally multiplied by 2/1, being scored as weighted PF 1.60 instead of primary return PF 0.80. Primary metrics, readiness, paper proof and reports now use explicit unit-return helpers. Direct modeled execution returns remove their recorded external **Block × coordination** multiplier; intrinsic DCA/Axis tape-leg semantics remain part of the config. Stored weighted returns, cash P&L, equity and sizing remain intact. Actual venue return/fee arithmetic is unchanged.

New paper closes persist nullable `unit_r` separately. Legacy rows lack recoverable multipliers and remain unknown; no guessed backfill is allowed. Unknown closes stay in the current chronological last-N/proof/adjustment window, block qualification, and cannot be skipped to select older winners. A complete actual exchange window can supersede paper evidence. Cached pre-upgrade simulation breakdowns are derived from their retained orders; aggregate-only archives without a unit basis expose unavailable primary PF and retain separately labeled sized diagnostics.

Reporting also preserves Tactic's full-indication minimum PF 1.1 and stricter settings, mixed groups' effective threshold ranges, exact hourly close bounds, independent opposite-direction research slots, no-loss provenance and unavailable PF differences. A no-loss score is not an exact finite ratio; unknown history must not hide a recorded loss. The frozen historical 90-day OOS PF 1.117865539 remains research only, with no retuning or promotion.

No live reload or exchange orders occurred. Recorded hosts remain unreachable; no authenticated Tailscale/SSH/deployment route is available. The requested industrial rename of `imperative-greeting-fox` still needs its exact external resource identity.

## Standing accounting and identity contract

The operator requires persistent work, remote backups and regular validated GitHub checkpoints. Read `AGENTS.project.md` when continuing in another chat.

**Return-based PF is primary everywhere:** sum positive net returns divided by absolute sum negative net returns on the same settled owned sample, after costs. Cash PF is a separately labeled reconciliation diagnostic. +1.36% on $100 and -1% on $680 gives return PF 1.36 and cash PF 0.20; comparing them as the same metric is wrong.

Match connection, ownership, settled close slices, partial quantities, costs and time bounds before comparing PF, net or history. Whole-position episodes are a separately labeled diagnostic. Expose the engine's no-loss score convention (`4`) with gross return sums and `noLoss/pfConvention`; do not present a sentinel as an exact measured finite ratio.

An accepted order is not a fill. Journal zero executed quantity and durable request identity before submission. Poll the original ID; explicit zero, partial, stale or malformed replies cannot invent ownership. A known stop loss remains recorded if a later cumulative entry creates unresolved chronology. Preserve its evidence and hold that key rather than silently rewriting history or claiming profit.

Signals retain full source, parameter range, lane, strategy type and protection-config identities. Empty/losing sibling types cannot dilute or qualify another type. Each config still passes its own minimum return-PF gate. A signal onset counts once inside its independent acceptance group; PF includes every settled return slice. Shared direction/account safety coordination remains separate. The 14 Oct operator instruction supersedes older source-wide pooling notes in `docs/positive-coordinations.md`.

**Tactic is a first-class indication type**, distinct from the existing remove-only Tactics entry filters. Trend, pullback, mean reversion, breakout and regime-adaptive techniques each have Short/Medium variants and use the existing independent/combined 1/5/15/30-minute pipeline. Keep their complete config identities. Historical and combined calculations must use completed, valid candles; return-PF qualification is evidence about the sampled past, never a guarantee of future returns.

## Backups and GitHub

Merged release PR #134: main `69347e5cee60c7f6ff5a486999fbe8f3f08d2851`.

Remote source backups:

- `backup/pre-execution-audit-20261014`: `061eedd5accb5f013e9d7f2910fc7222d8794fe8`.
- `backup/pre-fill-reconciliation-20261014`: `69347e5cee60c7f6ff5a486999fbe8f3f08d2851`.

Follow-up: branch `fix/fill-return-pf-20261014`, PR #135. Reporting checkpoint: `c3e84490d5dc83db4dee68d89c77629fd30e7f9a`; execution/Signal/Tactic checkpoint: `ab750d87b88957b83c765642259f4f0118685844`; complete Base-count source: `4c2f814c6c62c100f89d6f2adaf1ff6f7dfffe0f`; production worker packaging/shared scheduling and research: `70186289d371f27579cf14bd0e46000abaa11931`; final reviewed source including safe legacy restart guard: `fe1110d354d75ffa298df8a80a198b97656def0d`. Consult PR #135 for its final merge commit/status. These source backups do not contain a production database or private runtime settings. Back up live settings, durable state and a consistent database snapshot before deploying.

The public research evidence backup is `cts-ao-research-backup-20261014.zip`, 18,070,327 bytes, SHA256 `cd8633a7414d4145c0d004cd7abe57c30dff06cb5368f5a445c1d564081bc3da`. It contains both original public candle caches, frozen protocols/manifests, full reports, repeat metadata and per-file hashes; no credentials or private account records. It was saved separately from source control for future continuation.

## Implemented corrections

- Primary execution reporting and UI use the same settled owned close slices, including partial reductions. History preserves exact identities and latest cumulative orders instead of rounding unsafe venue IDs or summing duplicate cumulative records. Paper/session/coordination outputs explicitly identify their evidence basis.
- Actual quantity, price, fees and pending lifecycle survive crash recovery in both live modes. Pending zero entries cannot adopt unrelated venue positions. Protective closes honor actual zero/partial results. Actual exit timestamps determine history windows. Proven external stop losses are attributed once; ambiguous extra late fills remain explicitly unresolved.
- Account sizing uses verified current account equity; unknown or stale values never become a paper $1,000 live balance. Retry quantities pass risk/margin checks again. Wallet balance, equity, ledger net and reconstructed history remain separately labeled.
- Signal qualification is independent by full range/lane/type; order, paper, lane and stats keys preserve exact configs. Exchange acceptance and simulation agree on onset sample count and settled return PF.
- Signal historical MFE calculations use the existing bounded worker pool with shared causal bars, pair isolation, deterministic merge, held-config preservation, generator fallback and cancellation/memory guards.
- Tactic is registered as an indication family, with the standard Base → Live evaluation path and human labels in settings, presets, configs and statistics. Its calculation recovers after gaps/invalid candles using fresh valid segments.
- Tactic has a minimum return PF of 1.1 throughout Base and subsequent exact-config gates, retaining stricter settings. The actual full saved TP/SL/trail/hold grids are counted separately from representative admission, by full indication/lane/range/strategy, with configured, evaluated, PF-only and all-gate counts. Bounded background chunks use the same causal Base tapes, preserve whole-grid range fitting and release completed history. API reads cached snapshots and displays pending, partial, failure and stale states honestly.
- Existing measured Focus defaults remain intact. The explicit Include Tactic in Base focus action adds all ten Tactic bases to a nonempty Focus, preserves other pairs/pins and enables the kind; an empty Focus already includes all kinds. Settings persist and restore correctly.
- Production builds package a standalone ESM worker beside the server. Worker resolution honors an explicit operator path and otherwise finds that exact build artifact. Nitro module copies share worker queues, priority, abort and watchdog activity; an idle worker can no longer strand another copy's work.
- Upgrading a running old slots-only development pool explicitly requires a process restart. New code rejects the incompatible schema before mutating it, so both old running and separately queued calls finish normally. Fresh production boots and ordinary new-schema module copies share the complete pool state.
- A definite rejected emergency close clears its pending request identity in both entry-stop and stop-repair paths; unknown transport results retain their durable identity for polling. Stress fixtures distinguish definite venue rejection from ambiguous network failure.
- Higher-timeframe aggregation rejects incomplete source buckets and malformed duplicate/non-increasing timestamps. Tail resampling matches the last complete buckets of full resampling.
- Supervisor and monitoring fixes from PR #134 preserve exact process identity, fail closed on process-query failure and respect procfs PID namespaces.

## Preserved earlier verification and focused supplements (not CP10)

The following earlier invocation counts and separately labeled focused supplements
are historical evidence. They do not replace or add to the completed CP10 release
checks at the start of this handoff:

| Check | Result |
| --- | --- |
| Complete scripts | 344 passed, 8 environment/browser skips |
| Platform/authentication/UI helpers | 73 passed |
| Final CP8 Block trace/admission and conservative recording | 102 focused cases pass; earlier 149-case pre-quantization matrix/replay scope is retained separately |
| TypeScript | Final CP8 pass |
| Production build, including packaged worker | Pass |
| Full ESLint | 0 errors, 23 warnings |
| Offline page/viewport QA | 24 checks passed; static/local evidence |
| Runtime/API/SQLite browser fixtures | Desktop/mobile passed; return PF 1.36 versus cash PF 0.20; unknown legacy evidence retains its loss; no-loss differences remain unavailable |
| Bounded Tactic count fixture | 600 evaluated, 37 at PF floor, 36 passing all gates, 1 admitted representative pair |
| Core: all 151 test files, concurrency 1 | 1,653 passed, 4 temporary harness failures, 2 slow-test skips; 1,670.35 seconds |
| Corrected offline harness: all stall-probe tests | 6 passed, including all 4 previously failed cases; production source unchanged |

The complete core run used the normal test files with concurrency reduced to one, one compute worker and Compare disabled. All 228 core TypeScript file hashes remained unchanged during the run; cgroup OOM counters did not increase. Its exit code was 1: four stall-probe workers could not start because the temporary offline wrapper copied unsupported expanded Node test-runner flags into explicit worker arguments. Independent diagnosis captured `ERR_WORKER_INVALID_EXEC_ARGV`. Narrowing only that wrapper's inherited flag allowlist fixed all six probe tests, including the four failures, without source changes or waived assertions. This verifies 1,657 distinct core cases across the complete run and targeted correction; it is not a claim of one wholly green monolithic invocation.

Automatic approval review rejected the unrestricted test/QA process over possible BingX traffic with an unknown payload. Replacement checks omitted exchange credentials and installed a before-import nonlocal transport guard, including explicit CJS preload propagation into workers and Node children. Local proof covered denied HTTP/TLS/TCP/UDP/fetch paths and allowed loopback fixtures. Native exchange connectivity and funded trading were not tested.

The browser accounting checks exercised the actual local API and runtime-backed SQLite with seeded data. The refreshed `seeded-accounting-seroval-verified` report used Seroval's official decoder: measured/no-loss/unknown provenance remained false/true/null respectively, with 42 decoded responses, zero decode/app errors and 16 desktop/mobile screenshots. Two unrelated background response-body capture misses remain recorded; all required samples were captured. Earlier lossy collector reports are preserved and superseded. The Tactic counts are bounded synthetic worker/UI evidence, separate from representative admission and market profitability. Neither check establishes live execution PF.

The raw browser smoke still records the environment's existing Google Fonts/Grok `ERR_EMPTY_RESPONSE` failures; they were not hidden or removed. App assertions and viewport checks passed, and QA processes were stopped.

Live backup, deployment/reload, execution reconciliation and the external rename remain **blocked by unavailable authenticated host access/resource identity**. Before any live change, take settings, durable-state and consistent database backups. Restart the process for the previously documented worker-pool upgrade. Expect legacy unknown paper history to block new qualification until a complete verified current window exists; preserve held-position protection and never waive the PF/proof gates to manufacture readiness.

Keep source checkpoints and this handoff pushed to GitHub. Before any live change, back up settings, durable state and a consistent database snapshot. Never substitute fixture/research PF or a previous release's checks for final source and actual execution verification.

## Research and live deployment limits

Public BingX research data covers eight symbols and 18 closed days. The earlier narrow lean runner covered only 32 of 259 requested combinations, not the full engine. Its held-out 83 closes produced return PF 0.46055 after modeled costs despite IS PF 2.549; it was not promoted. See `docs/research-check-2026-10-14.md`.

Tactic's frozen 1,680-cell comparison separately selects current-default-entry-filter and raw-diagnostic modes on physically truncated IS data, then evaluates OOS. At the operator's PF 1.1 screen, the default-filter IS-qualified pool returns PF 0.661652 across 130 OOS closes; raw returns PF 0.643878 across 102. One preselected default-filter Short breakout/combined-5m member returns PF 1.275618 across 39 OOS closes, while the whole pool is negative. Do not substitute that member after seeing OOS. Research protects are explicitly fixed distances, not lane-scaled runtime grid cells, and portfolio coordination/capital limits are absent. See `docs/tactic-validation.md`.

A separate protocol was frozen before new-symbol performance access: AVAX/LINK/LTC/SUI/NEAR/DOT/ATOM/APT, 90 days, first 60 IS and final 30 OOS, unchanged techniques/grid/cost/modes and PF 1.1/minimum 30 IS screening. Acquisition validated 1,036,800 closed 1m candles without gaps/duplicates. Six default-filter IS-qualified groups produced 910 OOS settled closes at return PF **1.117865539**, or **1.116471777** including seven open marks. The losing 30m medium pullback remains included; neither mode nor pool membership was selected on OOS. All 70 diagnostic default groups together remain negative (PF 0.899959). Raw mode's one preselected group produced PF 1.815373 on only 27 OOS closes, below the 30-close sample screen.

Two full runs produced byte-identical research JSON, SHA256 `5f40353363fd4d6a8f3054a6dbcee33726bfca93b3daca81878b38b95b8a2c3d`; independent review recomputed IS selection from all 1,680 cells and verified protocol/cache/manifests, pooled sums and repeated output. The positive pool has maximum drawdown 186.772 return points versus net +106.424 points, with 561.917 hours of drawdown time. This is a historical new-symbol sample with overlapping dates/correlated markets, not live evidence or independent account ROI. Full runtime gates, funding, actual slippage, account sizing and capital coordination are absent. No live promotion is justified by the pooled research result. See `docs/tactic-validation-independent.md`. No OOS tuning or mode selection is authorized by a desire for positive results.

No exchange credentials or reachable authenticated live route are available in this environment. There is no configured Tailscale client/session, SSH identity or deployment workflow; recorded hosts `152.53.114.112` and `100.105.148.7` are unreachable. No live orders were placed and no reload or live PF-above-1 claim is justified.

The exact external resource `imperative-greeting-fox` was absent from source, connected Sites and connected Vercel name lookups. Its requested industrial rename remains pending an exact resource identity. Do not rename a guessed deployment.

## Fast 6h + 6h release check — 2026-10-16

The offline session uses the cached candle feed through 2026-10-15 04:00 UTC and exactly six evaluated prehistory hours. Signals receive no additional warmup. The feed is historical and was about 38 hours old at the replay; this is a smoke check, not a current-market or profitability claim. Full hourly, per-type, range, lane, sizing and Block-multiplier tables are in [`docs/sims/systemwide-pf-volume-audit-20261016.md`](sims/systemwide-pf-volume-audit-20261016.md).

- 6-hour session: 792 funded closes, Return PF 2.374852, sized-dollar PF diagnostic 2.223031, realized +$4.418713 from $1,000, end equity $1,000.703278, max equity drawdown 2.8717%, and 4/6 positive hours. Long had 60 losing orders; Short had 732 orders at PF 5.938047. The result is not positive in every hour.
- Range coverage: Micro executed 792 closes at PF 2.37. Minimal, Short, General and Long had no executed sets. Signals built 4,914 requested configs but had no active/executed units under the unchanged 24–48h gates. Keep these outcomes empty; do not relax gates using this short sample.
- Volume: ×1 had 342 closes at Return PF 30.806253 / cash PF 31.595471 / +$5.143369. ×1.5–2 had 450 closes at Return PF 1.116727 / cash PF 0.789638 / -$0.724656. The overall 936-close virtual Return PF is 2.578589; funding/caps reduce the owned sample to 792. Volume changes cash outcomes, not unit-return PF on an unchanged cohort.
- The report generator now carries the source mode into saved dumps, labels cached-feed replay accurately in both reports, and marks Signal history as the same minimal evaluated window. The local startup now resolves the repository root, uses the cgroup-bounded memory budget and available CPUs, and keeps the local app synthetic with autostart/live disabled.
- Checks: 383 focused strategy/Block/Signal/promotion tests and 143 balance/sizing tests passed; typecheck also passes after the report changes. The offline session itself completed in 12 seconds; its consistency report is 55/64 because the aforementioned ranges and Signals have no configs/orders in six hours.

GitHub state at this checkpoint: PR #142 is merged into current `main`; there are no open issues. Draft PR #132 remains unrelated and was not merged.

## Signals Coordination (Type) — 2026-10-16

Implementation is on `feat/signals-coordination-20261016` (draft PR [#148](https://github.com/mxssnx-creator/CTS-A-O/pull/148)). The initial implementation added five independent domination thresholds (60%, 65%, 70%, 75%, 80%); the 2026-10-17 expansion documented below extends the set through 100% at 5-point steps. Ratios run independently across enabled source pools and Short-only, Medium-only and combined source parameter inputs. Each source contributes at most one directional vote per bar; conflicting Short/Medium variants abstain, and quiet sources do not dilute the ratio. The default minimum is three active votes. Each threshold/input mix/lane remains a separate indication and strategy-PF identity, with a separate active-unit cap from classic Signals.

Coordinator protection configs are built only for the selected Short, Normal/General and Long exit ranges. Historical signal protection calculations are attached to each available range tag, and open coordinator configs retain their exact lane distances and range tag across range/grid changes. The backtest, worker tape build, realtime fast-entry path, simulation guard, live exchange acceptance, order tracking and statistics all handle the coordinator identity. Exchange client-order IDs retain the selected range letter; persisted config IDs retain the ratio/input/source pool and protect tag.

Verification uses synthetic fixtures only. The runtime smoke built all 15 coordinator pairs for the selected lane and reported 12,960 coordinator range/history configs; none met the active validation gate, so coordinator orders were zero and return PF was 0 (no hourly sample). This is not market evidence and does not show positive results or hourly success. The implementation uses the existing historical-calculation path when runtime candle history is available, but no fresh held-out coordinator replay or live execution check was performed. Do not relax the PF/sample gates based on the synthetic smoke.

Code verification: `npm run typecheck`, `npm run build:dev`, and lint for the new coordinator module/tests passed. Focused signal/statistics tests passed 109/109; range/gating tests passed 38/38; API reporting, execution quantity, and journal tests passed 55/55. The long runtime coordination suite completed successfully, including stop/restart, held-position, order-close and concurrency checks. An earlier combined run had one failure because it had already loaded the old range-floor test fixture before its correction; the corrected range/gating suite passes on a fresh process.

No exchange credentials were used and no live orders were placed. Preserve the existing return-PF and execution-proof requirements before any live promotion.

### Main integration and follow-up verification — 2026-10-17

The Signals Coordination branch now includes current `main` through `b6094a4` (Break and Relate indications). Merge resolution retains the coordination kind and its own worker bucket while keeping the realtime candle-close/mode gate and delay reporting. All three indication kinds have named UI labels and remain registered.

Post-merge checks: `npm run typecheck`, `npm run build:dev`, and `npm run lint` passed (0 lint errors, 21 existing warnings). Focused offline core runs passed 112 cases across 11 files and 399 cases across seven overlapping accounting, execution, statistics, completeness, and coordination files. UI tests passed 11/11; corrected Signal research-grid tests passed 8/8. These runs used the core offline transport guard and fixture data. The monolithic `npm test` was not completed: automatic review had blocked its broad core stage over potential BingX traffic, so it was not retried. The corrected market PF remains unavailable until the missing historical candle cache is restored.

### Offline coordinator OOS replay — 2026-10-17

The exact frozen candle cache was recovered from a sibling workspace and verified against the protocol SHA-256. The coordinator replay scored the default 63-source pool, all 15 ratio × input-mask identities, all three exit ranges, both sides and normal/trailing types on a 36-protection representative sample of the 1,200-protection runtime grid; five IS-validated historic MFE templates yielded 15 range-tagged configs. See [`docs/sims/signals-coordination-trade-sim-20261017.md`](sims/signals-coordination-trade-sim-20261017.md) for the full matrix.

The IS-qualified pool returned OOS unit PF 1.277 on 37,869 overlapping config-side close observations (PF 1.270 including endpoint marks). The all-config OOS diagnostic was negative (PF 0.978); only 277/631 active hours were green (43.9%). This is retrospective, previously reused data and not an account-level portfolio, live order count, execution PF or forward proof. The 8× factor leaves unit PF unchanged and scales both gains and losses; no live promotion or settings change was made from this replay.

The 8-file offline verification rerun after correcting the synthetic history availability assertion passed 422/422; typecheck passed. The history path remains conditional on its matured-entry/PF/drawdown gates, so a synthetic window may correctly produce no historic config.

### Expanded coordinator grid and range-specific historical gates — 2026-10-17

Draft PR [#148](https://github.com/mxssnx-creator/CTS-A-O/pull/148) extends the domination identities through 100% at 5-point intervals (60, 65, 70, 75, 80, 85, 90, 95 and 100). Settings display the complete ratio list. Historic coordinator protection calculations now retain a Short, Normal or Long range tag only when that range independently clears its configured stage PF floor; classic untagged Signal history retains its previous global floor. History calculation calls now pass the same final gates used by runtime settings. The 8× coordinator sizing multiplier and neutral 1× defaults for other combined indication types remain size-only settings; they do not alter unit PF.

The expanded replay used the frozen cache SHA-256 `09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4`, all 1,200 runtime protections, 27 ratio/input-mask identities, both sides, and normal/trailing exits. It scored 64,850 config-side rows including 50 historic sides. The IS-qualified OOS pool was 2,590,578 overlapping independent config-side closes at return PF 1.260086 and +774,087.5 unit-return points; including endpoint marks, PF was 1.256923 and net +766,777. The full unfiltered config pool was weaker at PF 1.013205. Across 720 OOS clock hours, 706 were active, 289 (40.9%) were green; the median active-hour PF was 0.315 and the worst hour returned -133,326.4 points across 28,814 overlapping simulated closes. Per-ratio/mask, range, strategy type, hourly and prior-run comparisons are in [`docs/sims/signals-coordination-trade-sim-20261017-expanded.md`](sims/signals-coordination-trade-sim-20261017-expanded.md).

The runner independently checks the complete grid size, all 27 identities, cache hash, IS/OOS boundaries and exact reproduction of all 1,080 prior standard sample rows (zero count/PF/net mismatches). This is retrospective, overlapping unit-return research; it is neither an account-level portfolio simulation nor live/forward validation. The poor hourly consistency and losing unfiltered pool are retained in the report. Size-only 8× and 22× point figures do not include capital constraints, simultaneous exposure, liquidation, funding or realistic execution and must not be read as account returns. Existing accounting and position-stack tests cover software paths, but this replay does not verify venue fills, account position reconciliation or live orders. No live settings or exchange orders were changed.

Final checks for this update: the focused signal/settings/accounting/position/statistics suites passed 547/547; the Stage/Base evaluation and worker-pool suite passed 53/53; the post-fix historical-range and Stage-consistency rerun passed 17/17. Typecheck and the development Vite/SSR/core-worker build passed. ESLint passed on all changed TypeScript and replay files with no warnings after removing three unused imports in the touched runtime module. The broader `npm run test:core` stage was not launched because the repository's prior automatic review blocked its BingX-capable transport; it was not bypassed or retried.

### Stable coordinator bands v2 — correction — 2026-10-17

This entry supersedes the preceding nine-ratio expansion description. The required configuration is five independent bands across three source-input masks (**15 coordinator identities**): 60–65%, 65–70%, 70–75%, 75–80%, and **80–100%**. The last band includes the full remainder through unanimity. Settings, generated identities, runtime voting, statistics labels and the replay use these five bands. New IDs use v2; old v1 threshold IDs remain readable and are retained only while an existing position needs its original exit tape.

Stage/Base replay selection is range-aware: Short PF ≥1.10, Normal ≥1.12, Long ≥1.18, with the same floor required on settled and endpoint-marked IS returns. The frozen replay covered all 1,200 protections per identity and both directions: **36,032 config sides**, 9,990 IS-qualified sides, and 1,626,887 overlapping qualified OOS closes at PF **1.390** (+705,225.2 unit-return points). Range PFs were Short 1.302, Normal 1.327, Long 1.443; Normal/Trailing PFs were 1.388/1.391. The unfiltered pool was PF 1.005. Only 307/696 active OOS hours were green (44.1%), so hourly success is not established. The earlier v1 positive result is not comparable because v1 used cumulative thresholds. Details: [`signals-coordination-trade-sim-20261017-expanded.md`](sims/signals-coordination-trade-sim-20261017-expanded.md) and [`signals-coordination-stability-v2-20261017.md`](sims/signals-coordination-stability-v2-20261017.md).

Current code checks passed: **75/75** focused signal/coordinator/history/volume tests; TypeScript typecheck; development client + SSR + core-worker build; changed-file ESLint and replay syntax checks. No live exchange orders were sent. The coordinator is marked stable for the verified offline band and accounting behavior; live execution and Exit-strategy market performance remain outside this certification. Future promotion continues to use per-config PF after Base and each range's own gate, and must keep execution PF, order throughput and hourly consistency as separate evidence.

## Break indication audit closure — 2026-10-17

Detailed source-fix replay and hour table: [`simulations/break-post-fix-9x12-20261017.md`](simulations/break-post-fix-9x12-20261017.md).

The indication audit fixed two real defects: market returns now require contiguous per-symbol closes, and market activity restarts its 60-bar warmup after a candle gap; a fresh opposite channel break cancels an older pending Break retest in the other direction. Market drawdown work was moved out of the per-bar inner loop. Break identities route only to their declared anchor lane, and the current lane audit covers Break and Relate.

The repeated corrected 9-symbol 12h-history/12h-trade replay passed 56/56 consistency checks for each matched arm and reproduced the previous result exactly: legacy Break 1,563 orders at return PF 0.342; updated Micro Break 726 orders at return PF 3.272. Updated hourly outcomes remain 3 positive, 6 flat and 3 negative; the 18:00, 19:00 and 23:00 UTC hours remain below PF 1. Thus the hourly-success target is still unmet. The replay uses the previously examined window and does not count as out-of-sample evidence.

The full offline core run traversed 170 test files and reported two stale test expectations. Both were corrected and focused reruns pass: Break/Micro/Relate/lane 38/38; corrected Base/Main processing assertion 1/1; seat/default migration 29/29; empty prehistory 7/7; session PF/accounting 23/23. The 128-toggle matrix passed in the full run. Typecheck, `build:dev` including the packaged core worker, and `git diff --check` pass. The monolithic full suite was not rerun after these test-only corrections; do not report it as wholly green.

## Balance sizing, caps and Signal ranges — 2026-10-17

Correction: the earlier coordination-factor follow-up treated “Stable-02” as a strategy coordinator. It is a branch name. The erroneous independent `s2VolumeFactor` setting and its earlier sweep were removed; existing S2 relation sizing (`s2Increase`) and the separate negative-hour Signal hedge factor remain. See [`the corrected coordination report`](sims/trailing-config-coordination-factors-20261017.md).

The base order unit is 0.2% of realized wallet balance, not a fixed order notional. Engine-range and Signal short/medium volume factors default to neutral 1×. The old Micro factory factor 2.5× migrates to 1× while custom saved factors are retained. Fixed-USD per-position ceilings are retired and ignored. Per-position and gross-exposure ratio budgets default to 0/off; if explicitly enabled, they are multiples of wallet balance, not equity or USD ceilings. Migration clears legacy USD ceilings, disables only the former factory ratio pair, and converts saved fixed/minimum-quantity sizing modes to balance-percent sizing while preserving custom balance ratios and volume factors.

Two adjacent cached-feed 24-hour replays used the same eight symbols, 48 hours of prehistory, $10 start balance, 10× leverage and 0.20% modeled round-trip cost. The interim 0.25× / 2× caps reduced drawdown versus 0.75× / 7× but left the adjacent day negative. A broader same-tape cap sweep selected 0.25× position / 0.75× gross: Oct 13–14 produced 4,861 funded closes, Return PF 1.013, cash PF 1.327, +$0.05343 cash and $10.02288 marked equity; Oct 12–13 produced 25,950 closes, Return PF 0.924, cash PF 1.349, +$0.12277 cash and $10.04716 marked equity. Max equity drawdown was 0.80% / 2.09%, with 12 / 8 / 4 and 8 / 16 / 0 green / red / flat hours. This improves the two sampled equity curves; it does not prove stable PF or positive results every hour. The unit Return PF remains below 1 on the second day.

A 0.05% equity sizing trial and a same-tape 0.6× trial on Minimal, General and Long did not improve both cash outcomes. These ranges remain neutral rather than being tuned on two adjacent windows. Signals were positive in aggregate in the sampled windows, particularly Trailing, while Normal was sparse and losses in engine General/Long and Minimal remain unresolved. Full metrics and the 127/127 replay consistency checks are in [`the balance sizing and cap report`](sims/trailing-balance-sizing-cap-replay-20261017.md). Those results used the then-active caps and do not measure the new uncapped balance-volume default.

A later no-cap sizing replay (`raw-24h.json`, cached four-symbol tape, $10 start, 0.1% balance unit) showed unit-return PF 7.36 and funded cash PF 11.71 across only 18 funded orders; ending marked equity was $9.94, so it did not show net positive equity. The 0.1% base unit is $0.01 before range/coordination factors and venue minimums. Its report's completeness check was 114/115 because the source engine dump records a memory fallback; disabling report-time sizing variants does not repair that source-run gate. This is an offline sizing replay of old recorded trades, not a fresh engine rerun, and is insufficient evidence for high order volume, stable hourly profit or live promotion.

No live orders were placed and no deployment was made. The replay data are retrospective and do not validate live fills, new market regimes or positive performance in every hour/range/configuration.

Verification follow-up: the 169-file core run exercised stage processing, Signal config identity and execution, account sizing, realtime progress, paper/live control, and restart recovery. Its first pass exposed six compatibility regressions: two old migration tests expected schema v26 instead of the current v28, the Settings completeness table omitted the four new cap/Signal-factor leaves, two cap-isolation fixtures inherited the new gross-cap default, and a gate fixture omitted drawdown evidence. Those cases were corrected; focused settings/control/gating checks passed 334/334, legacy migration tests 2/2, and v27→v28 cap migration 1/1. The repeat full `npm run test:core` passed **1,977 tests, 0 failed, 2 skipped, across 325 suites (169 files)**. Typecheck, the development client/SSR/core-worker build, and `git diff --check` passed after the fixes.

Post-restore verification: a repository stash/rebase merge was resolved while retaining the balance changes and mainline reporting fixes. The full core suite was stopped during that merge and has not been rerun end to end. Current checks completed after resolution: TypeScript typecheck; client/SSR/core-worker development build; account sizing and live range-factor tests (13/13); Entries execution tests serially (41/41); v10/v27/v28/v29 migration tests (4/4); balance sizing migration (1/1); isolated runtime self-audit (1/1); Signal discovery (4/4); session PF/CLI checks (2/2); and diff checks. A parallel multi-file test invocation produced post-test SQLite cleanup errors; its Entries suite passed when rerun serially. No live orders were placed.

## Independent config Last-N and short replay — 2026-10-17

The verified source/test/replay tree is `d219f35c96e94393778e7147b4d1d6e2f66a0121` (local commit `badb725540d883af03b601fb37acc25de551dea0`), published as PR #161 head `c499f3230e8fba686cfdbef3db04dcb9efb3b4d0` and merged into `main` as `9295c69e1ae56763cc4b7b65ed30082ed7a4e238` on 2026-10-17. It is based on merged PR #160. A schema-version collision from rebasing onto mainline v28 was corrected: expanded Signal/default migrations now run from v29 through v33, preserve custom saved settings, and keep the mainline v26-v28 migrations intact. Signal protection grids remain exhaustive; full config identities and per-config Last-N gates remain independent across ranges, lanes, types, directions and protection modes. The exchange position ceiling of 100 remains a Symbol+Direction live-stage limit; config/order seats remain independent of it.

Post-rebase verification: `npm run typecheck -- --pretty false` passed. The focused config-independence/history/volume matrix passed 48 tests; the exhaustive Signal discovery/config suites passed 40 tests across 17 suites; return-PF/statistics/reporting tests passed 27/27; and the offline-guarded session-report/qualification suite passed 18/18. These checks cover independent per-config selectors, separate Signal Normal/Trailing qualification, no sibling seat or trade sharing, minimal Signal history, range-specific volume factors, report scope after Base and later gates, PF/volume labeling, and the actual exhaustive grid through workers and local calculations. The full core suite has not been rerun after rebase.

The bounded engine replay is [`the six-hour report`](sims/trailing-systemwide-6h-window-20261017-summary.md), with [`full tables and hourly details`](sims/trailing-systemwide-6h-window-20261017.md). It uses four cached-feed symbols, 6h of evaluated history and 6h simulated (2026-10-14 09:00–15:00 / 15:00–21:00 UTC), config Last-N 25, min return-PF 1.1, and minimal Signal history. The source processed 854 engine config pairs for Base (4 passed), and separately measured 504 Signal representative pairs (2 passed the diagnostic gate, excluded from engine Base totals); Main had 4 pairs and Real had 12 engine configs / 0 Signal configs. The executed post-Base cohort closed 273 orders at Return PF 0.63, sized cash-PF diagnostic 0.93, 0.43% marked-equity max drawdown and 2/6 green hours; engine orders alone were PF 1.40 (241), while Signals were PF 0.10 (32). All 66 report consistency checks passed. This confirms processing and accounting on this window, while showing the desired positive-hour/PF outcome was not achieved. It is a short, previously examined cached-feed sample; do not tune on this same window or treat it as live evidence. No live orders or deployment were made.

## Last-N as-of and tie-order audit — 2026-10-17

The optimizer's reported `gateOpen` is now evaluated from closes settled at or before `nowT`; future closes cannot satisfy the current N sample. An N=0 selection is reported as ungated. Optimizer tape and result ordering now use stable exit-time, entry-time, config, symbol, side and return tie-breaks so simultaneous closes cannot make DDT/gate results depend on worker/input order. Pooled live-group Last-N samples likewise use a stable config/tape-index tie-break at the N cutoff.

Regression checks verify a passing close changes `gateOpen` exactly at its close timestamp, later closes are excluded, simultaneous optimizer inputs produce identical statistics/verdicts under permutation, and pooled live cutoff ties are stable. Both complete affected files passed: pipeline/live-validation 31/31. Typecheck, production build (including SSR/core worker) and `git diff --check` passed. The attempted full core run was stopped while a CPU-heavy book-coverage fixture was still running; its final summary/exit status was unavailable, so it is not counted as a full-suite pass. No market replay or exchange execution was run for this code-only correction; it does not establish higher PF/order volume or live profitability.

## Range-specific PF floors and Base-to-execution rerun — 17 October

Tested source checkpoint: `d561e4b` (`fix: enforce range PF floors through Base eval`).

The configured defaults now apply by Base range: Wide/fallback 1.00, Micro
1.05, Minimal 1.10, Short 1.10, General 1.20 and Long 1.30. `baseSetsMinPf`
only affects untagged Wide/fallback cells; tagged range floors remain active
through Base qualification and set construction. Report scope also separates
the Base-qualified engine execution benchmark from independently qualified
Signal orders and the all-funded combined account.

The matched cached-feed six-hour replay confirms Base passed 4/854 engine
pairs (Micro 1/700 at floor 1.05; Minimal 4/854 at floor 1.10; other configured
ranges passed none). Config evaluation at run start passed 24/376 with pooled
validation PF 6.511 for Micro and 4.578 for Minimal; 12 engine configs were
seated. Engine execution produced 241 settled orders at PF 1.404, including
Micro 168 at 2.152 and Minimal 64 at 0.624. Separate Signals produced 32
orders at PF 0.095; the combined 273-order book was PF 0.634 and 2/6 hours
were green. High pre-execution PF did not persist through every execution
range, so this sample does not support promotion or a profitability claim.
Full report: [range-floor rerun](simulations/trailing-range-floor-rerun-20261017.md).

A funnel-label ambiguity was fixed after inspecting the generated report:
walk-forward hourly config-pass counts may repeat the same config in later
hours, while the 801 run-window total is distinct configs passing at least one
step. The report now labels hourly pass instances and points readers to the
separate run-start 24/376 evaluation and 12 Real seats. The regenerated replay checks passed
66/66; the range/sets subset passed 35/35 and the complete focused bundle passed
73/73; TypeScript typecheck, production build, Node syntax and `git diff --check`
passed. No live orders, settings changes or deployment were made.

## 0.15% cost and positive replay audit — 2026-10-17

The requested 0.15% round-trip cost was tested in a matched full-engine replay
using a desk snapshot (0.05% taker plus 0.025% modeled slippage per side); the
production cost default remains 0.20%. On the same four-symbol 24-hour cached
window, 37-pair focus, 48h prehistory, corrected range floors, coordination,
and 0.75×/7× book caps, the 0.20% run produced 572 closes at Return/base-$1 PF
0.483424, sized-dollar PF 0.600055, −$0.295683, and 7/6/11 green/red/flat
hours. At 0.15%, 1,327 closes produced Return/base-$1 PF 0.712008,
sized-dollar PF 1.391965, +$0.093060, and 11/7/6 hours. Marked equity ended
at $9.961860 with 682 still-open orders marked −$0.131200. Range failures
remain: Short PF 0 (54 closes), General PF 0.003512 (121), Long PF 0 (59).
High Base passage is not carried through those execution cohorts. The 0.15%
replay passed 66/66 consistency checks; focused PF/accounting tests passed
34/34. Full details and the screenshot reconciliation are in
[`simulations/cost-015-and-positive-replay-audit-20261017.md`](simulations/cost-015-and-positive-replay-audit-20261017.md).

The saved older 0.20% positive replay independently reconciles to 2,184 funded
closes, Return/base-$1 PF 4.723109 and sized-dollar PF 2.024519. Its 2,169
engine + 15 Signal closes do not match the screenshot's separate “Signals 43 / PF
51.27” row; the screenshot hour summary also differs from the saved raw dump.
The archived positive result is retained for its own cohort, not treated as
20-symbol or corrected-current-floor proof. The only full-engine cached market
feed available here contains four symbols. A 40-symbol lean 1-minute research
study is not a full-engine 20-symbol substitute. No live settings, live orders,
or production cost defaults changed.
## Expanded 20/22-symbol post-Base study — checkpoint 2026-10-17

Current branch `fix/postbase-expanded-study-20261017`,
[PR #164](https://github.com/mxssnx-creator/CTS-A-O/pull/164); committed
source checkpoint `b1a0e714d268574d5ab5c21d89f1a99279596cf3`.
The [progress checkpoint](simulations/expanded-postbase-progress-20261017.md)
contains the full reproduction recipe, preserved failure and verification
details. The [frozen protocol](simulations/expanded-postbase-protocol-20261017.md)
specifies 20-symbol development and 22-symbol final 24h comparisons, each
with exactly 24h evaluated history, separate 205h indicator warmup, explicit
0.15% modeled cost and unchanged independent PF/sample gates. The 12 new
reclaim8 Break identities are opt-in; the original 60 default Micro IDs remain.

Source corrections separate diagnostic Base construction from genuinely
admitted pair/range identities, preserve their later-stage and Live floors,
and require causal Base even for fixed-focus preset replays. The first
`runs/postbase-dev20-baseline-20261017-v1/baseline-20/` attempt remains
incomplete: a partial-universe calculation hit the memory reserve and
fallback path, then its owned process was interrupted (SIGINT, exit 130).
Its protocol, command, log and `run-result.json` are preserved. Preload and
admission corrections and new sealed replay attempts remain open; no complete
20/22-symbol PF, orders or hourly result is claimed. Do not reuse that failed
attempt as a benchmark or call the source fixes profitability evidence.

The full public archive is saved and verified:
`cts-ao-22-symbol-public-20261017.tar.gz`, 15,868,857 bytes, SHA-256
`252bc0c3c43e66a7e2252450376b3c9cf1f475e11bcee15d79ebf0bdc3589938`.
It contains the 22-symbol feed, 374 raw public pages and acquisition/failure
provenance, with no credentials or private account records. The tracked
[data manifest](simulations/symbols22-data-20261017/README.md) records source
bounds and per-file hashes. The
[prior comparison audit](simulations/prior-comparison-audit-20261017.md)
records the old 336h selection and mixed sizing/cost/cohort differences.

The new read-only review helper and its eight synthetic tests verify
complete four-case envelopes, exact native allocation/unit-return accounting,
hash/settings parity and the prewritten prospective removal rule. Root
typecheck and development build passed; focused source-test evidence and
resolved stale fixtures are listed in the progress report without summing
overlapping runs. No configs have been removed. Complete both 22-symbol cases
before producing an exclusion list; any selected list requires another
prospective replay. No live deployment, reload or venue order was performed.


## Hosted full-audit and v4 replay checkpoint — 2026-10-17

Local source checkpoint `acba877` was published in
[PR #164](https://github.com/mxssnx-creator/CTS-A-O/pull/164) as remote commit
`f75026f0d675e95fdf0a5d94e1de2aadf2f4ccb3`, matching tree
`6909bf864945b0ed36aa4243175ef51bdbd29db1`. The cgroup hierarchy-root scanner
correction preserves unknown-reading rejection and the 4,096MiB admission
floor. The four newly sealed v4 protocols retain exactly the v3 economic
settings, feeds, ordered symbols, warmup, windows, sizing and gates; their
source-manifest SHA-256 is
`bc7216bd7ab6000b7651a5d83054a16887854097a31847e7701b9a92754693f7`.
See `docs/simulations/expanded-postbase-v4-index-20261017.json` for all four
protocol and runtime-settings hashes. No strategy outcome caused this reseal.

The failed hosted launch39076740047 is preserved in commit `b48e7dd` under
[`postbase-ci-interrupted-39076740047`](simulations/postbase-ci-interrupted-39076740047/README.md).
It passed install, typecheck, build and 55 offline script tests, decoded the
fixed public feed and prepared every case, then stopped before scoring on the
root-cgroup reading. It establishes no market PF or execution count.

The replacement
[hosted run39077361130](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077361130),
job `117527184101`, was active at this checkpoint; runtime setup, TypeScript
and the development build were verified. Its workflow requires the complete
178-file core audit and two slow synthetic checks before launching the four
serial offline replays. Those gates, the baseline/reclaim8 comparisons on
20/22 symbols, and the final hourly/exclusion review remain pending; no
current result is claimed. Preserve failure logs if any gate fails, and use
the exact pushed source and newly frozen protocols for any retry.

The public-data archive remains saved and hash-verified:
`cts-ao-22-symbol-public-20261017.tar.gz`, 15,868,857 bytes, SHA-256
`252bc0c3c43e66a7e2252450376b3c9cf1f475e11bcee15d79ebf0bdc3589938`.
The tracked encoded fixture reconstructs source-feed SHA-256
`02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e`.
Finish the hosted checks and complete both final22 cases before selecting any
prospective exclusions. No merge, live deployment/reload or exclusion was
performed; existing PF/sample and own-position protection gates remain.

## Independent Signal history, bounded trailing and X02 verification — 2026-10-20

Local branch `fix/signals-history-matrix-20261020`, code checkpoints `97fc3c6`
and `1a48c89`, plus final feed/fixture correction `025716f`. See [full evidence and reproduction notes](simulations/signals-12sym-20261020.md).
Signals now retain a separate 336h history including actual backfill/warmup,
configurable entry-anchored trailing ceilings up to 3%, and consistent
percent/ATR/historic/DCA/Axis protection identities. Multi-timeframe duplicate
symbol lookup no longer empties own Last-N evidence. Native admission rechecks
current own validation; held legacy positions retain their original ceiling.
APZ reclaim, FRAMA pullback and Supertrend pullback are opt-in research sources,
not enabled production defaults.

The complete 12-symbol main matrix contains 89,578 effective configs and
21,775 settled accepted virtual closes before account funding: PF 0.623875,
9/24 positive hours. The development-selected 3% / 0.5 / Trailing group has
1,758 closes, PF 3.617904; confirmation alone has 603 closes, PF 5.143839 and
9/12 positive hours. These are independent scenarios excluding shared side
acceptance/cluster/Block/engine coordination and funding, not funded portfolio
or venue results. The v5 repeat matches original counts/PF and adds per-symbol
results, individual accepted trades and sorted aggregate diagnostics. Protocol
SHA-256 `06e7c07c929dd1c8ac142065beddcea40ad6ef207becf7011a4c53eda3f9e417`.
The corrected four-lane new-source sweep has 12,549 configs / 3,042 virtual
closes, PF 1.569473; losing and insufficient cells are retained. No universally
positive or every-hour-positive result is claimed.

Typecheck, built worker and desktop/mobile Settings save/reload/bounds checks
pass. Focused source/engine/E2E (58), isolated pipeline (21), context/lane/
completeness/native (396), and corrected Control + cap regression (100) runs
pass; counts overlap. The first full audit and incomplete study attempts are
preserved, never promoted to successful benchmarks. A complete full-audit
retry also remains incomplete: its execution session disappeared without a terminal summary during the server Base-count runtime fixtures (exit code/signal unknown). Known failures were five stale 336h seat-fixture expectations and the missing independent Signal Trailing-only assertion. Corrected reruns pass: seats 30/30, processing 6/6 including all 128 toggle combinations. The later paging correction removes the fixed 20-page ceiling for >480h presets; feed/backfill 21/21, repeated typecheck and worker build pass. The study uses cached candles and retains its exact source manifest separately from this feed-only change. Do not call either broad audit fully green; finish remaining coverage on a stable runner.

Actual `bingx-vst-02` remains inaccessible: credential resolver has no key pair,
and the documented server route timed out. No actual venue order, live reload,
deployment or merge was performed. Git push was automatically rejected for
public code publication without sufficient explicit authorization and was not
bypassed. Code and a reviewable patch are prepared locally; publication still
requires user approval.


# Micro branch evidence before combined integration

# Integration follow-up: missing Trailing-only Base cells — 21 October 2026

Complete combined-source CI 39519260607 covered all 219 core files: 2,545 ordinary passes, two genuine Base/grid parity failures and two optional slow exclusions. Both slow tests and the 120-symbol stress passed; universal CI 39519260719 passed all 1,720 specs at the exact 9504 source. The two failures were not waived: main introduced executable Trailing-only siblings while Micro/Inverse completeBaseRangeProtects still omitted them. Base and execution now share canonical trailingOnlyProtects, preserving the executable grid's caps, duplicate handling, identities and all Normal/TP-trailing cells. Six full-grid parity modes test trailing-only off/on with peak-gap steps 0.5/1/2; worker/local Micro Base parity also passes. Focused correction group 83/83 green. Failed complete inventory is preserved in integration-before-grid-fix.json and the original universal plan in integration-universal-plan-v1.json. Final current-source CI is required before merge. No financial protocol, threshold or measured loss is rewritten.

# Main integration in verification — 21 October 2026

User explicitly authorized “Push, merge” and “Continue open work”. Main `47a90a61f8b03d1495d85fe9299d0e65b5e26f87` already contains PRs 182 and 185; PR 184 must target main, preserving both. Combined runtime source manifest `95046af82822b827573b13ed9a687957de8f620c0a454a1d3c4ff941f9db255d`. The 109fd/AE7 market experiments below remain exact archived pre-integration evidence, not a financial certificate for this changed combined source. Their protocols, losses and source guards are retained unchanged. Automatic Micro checks run the complete current regression inventory and stress; archived source-sealed studies require explicit dispatch and still reject source drift. A separately sealed integration universal plan covers the actual 1,720 registered specs and 37,016 bot/lane combinations.

Integration retains main’s independent Signal/strategy histories and exact per-direction proof, 3% maximum with tighter legacy stops, weighted DCA, ownership/reconciliation and Micro’s distinct order identities, funded cohort reporting, atomic publication and exact-count continuity. REST read failover consumes one common rolling budget for every actual host dispatch; writes still never fail over on an unknown outcome. A new actual-runtime regression reproduced local Signal tapes incorrectly using the short ordinary history despite workers receiving the independent long one; the local builder now uses its selected Signal universe. Before-fix failure is retained in `integration-history-before.txt`; the focused history, budget, retry and publication group passes 76/76 after repair. Integration typecheck/build and complete CI receipts are being finalized; no deployment, live settings write or venue order is part of this merge.

## Final hourly-progress correction verified — 21 October 2026 (Europe/Vienna)

All six final primary jobs in CI 39516742275 pass at remote commit `4e3fec4a8452d16e371cf5adfe1b8608ab94844a`, tree `a93715e29432b11659c19ef393e71ac1c89f45e1`. Runtime manifest `109fd1859eb0079134b54289ea06a0b5dc51573017bc150d8773f83eef7d611e`. Exact disjoint core inventory: 214 files, 2,386 ordinary passes, zero failures/cancellations, two optional slow exclusions. Both optional tests pass in CI 39516154063 at the same runtime manifest, covering all 2,388 distinct core tests. Report/funding/offline/scalar scripts pass 54/54. Build/typecheck pass. The memory fixture now observes actual in-flight cache construction while public lastUniverse remains the previous completed snapshot; all cleanup assertions remain and the fixture passes 10/10. Earlier failed/cancelled/coverage-refused receipts are retained. Older pending sections below are historical.

Real progress fixes: current Base/Exit/Signal/range proofs, Base counters/history, realtime arguments, build stats and matching tapes/simulation publish together after loop-generation and economic-revision checks. Interrupted/superseded work cannot withdraw active qualifications or append a false completed-history row. Exit Base proof is preserved on settings changes. Harmless live/timing/unchanged settings saves no longer cancel partial exact Base counting without a new compute; genuine economic changes still invalidate it. All nine new regression cases pass, including original-sweep continuation from 32 to all 65 fixture cells.

Final complete native 20-symbol original-window dump: 64,473 built config histories, 62,553 checks/hour, 750,636 scalar decisions. No missing histories, arithmetic/verdict disagreements or unexplained transitions. Every passing count obeys previous minus dropped plus gained, and every individual window-return delta equals incoming minus expired closes. At 10:00: 14,458 - 4,088 + 1,544 = 11,914. All passing and never-passing configs are included. The previous archive’s missing never-selected rows were explicitly refused before adding --tape-trades-all; keep that evidence. Full filtered-stage financial fields for the original replay and all four chronological study cases are identical to CI 39509771569 apart from source stamp, and selection focus/hold is unchanged. Funded original PF remains 0.101956311 / 126,342 closes, equal to matching tape; validation 0.118385, confirmation 0.032616. The live-progress defects do not erase these measured single-replay losses.

Same-source universal CI 39516154063 passes all 19 families / 1,708 specs, 606,032 identity contracts and all nine native hourly/unfinished-bar cuts: 1,113,120 state-prefix and 6,885,180 entry-prefix comparisons, zero violations. Both slow tests pass. All eight CI artifacts were SHA256-verified. New final report at docs/hourly-progress-2026-10-21/report.html; exact inventory, source/CI/artifact seals, scalar decisions and market comparisons in the adjacent JSON receipts. Desktop/mobile render checks pass. PR 184 remains draft; no deployment, merge or venue orders. Consistent hourly market profitability, native capital/ownership proof, genuine full 12h 5s coverage and a universal 100ms SLA remain unproven.

## Additional exact-counter progress fix — 21 October 2026

Three additional regressions prove live-only, timing-only and unchanged settings patches canceled a partial exact Base sweep without scheduling another compute. Cancellation now occurs only when the economic compute key changes; the same started sweep continues from 32 to all 65 fixture cells without resetting. Real cost changes still invalidate counts. The combined publication/counter suite passes 9/9; failed before-fix evidence is retained. The source is resealed as chronological v8, preserving v7/v6 economic settings, feed and selection rules. Intermediate source 8042 has CI 39515430798 / 39515430847 in progress; latest full verification is still required at the subsequent exact source. No venue orders or deployment.

## Active hourly-progress correction — 21 October 2026

A further real progress defect is reproduced against d76f9fb: compute published Base/Signal/range gates, Base counts/history and realtime arguments while old tapes/simulation still served execution. Interrupted/superseded jobs could leave mixed cohorts and false completed-history rows. New compute-publication regressions stage all of these until matching tape/simulation publication and recheck economic revision/generation across Paper idle. Timing/live-only settings edits retain the calculation. Exit Base proof is now carried through updateSettings too. Current six targeted publication tests pass; the prior failing reproduction is retained. Full exact-source verification is pending.

The independent scalar hourly audit covers every ever-selected config in the v9 archive: 18,505 tapes / 222,060 decisions, zero verdict/arithmetic differences and exact incoming-minus-expired conservation. All recorded passing counts are reproduced, including new gains (10:00: 4,088 dropped, 1,544 newly passing). The original archive lacks the 44,048 never-selected histories per hour: the strict initial coverage refusal is retained. New --tape-trades-all streams every built config for a fresh 750,636-decision scalar check with --require-all. No costs/gates/formulas or market windows are retuned. See docs/hourly-progress-2026-10-21/{README,plan}. Resealed chronological cases v7 preserve v6 settings/WF/feed/windows exactly. No venue orders, deployment or merge.

## Final verified checkpoint — 21 October 2026 (Europe/Vienna)

Primary CI 39509771569 is fully green: all six jobs pass at remote commit `4e0ed5cae46ee06d8c37a64aeea5e81df629a704`, tree `64b81989c421973e963052a8a0a787b09e59c06b`. Runtime manifest remains `ae7b2021fbdce8c3432329781dfc19a651c7e1fc488b3826874af741e69befaa`. The complete disjoint core inventory is 213 files: ordinary 2,377 pass, zero failures/cancellations, two optional slow exclusions. Both optional tests pass separately in CI 39508546694 at the same manifest, covering all 2,379 distinct core tests. Report/funding/offline scripts pass 50/50. Signal integration passes all three unchanged assertions after pinning its original confirmation catalog and preserving cancellation cleanup. Previous failures/cancellations remain archived; older pending notes below are historical.

Universal correctness covers 1,708 specs / 19 families, 36,596 bot/lane combinations, seven strategy types and seven range tags, with 606,032 explicit identity contracts. Six hourly cuts pass in CI 39508546694; the separately frozen unfinished-higher-bar cuts (7/17/37 minutes) pass in CI 39510692041 at remote `2c7ab7facf28b5bebad86b633d188e5efd544794`, tree `743b33bfc5495b6e7e5b0dd5231aaa07f9d7accf`. Combined native 20-symbol checks: 1,113,120 state-prefix / 6,885,180 Bot-entry comparisons and 2,527,452,160 state bars, zero future-data violations. This is bounded correctness evidence, not a full Cartesian market portfolio run. Wide/Minimal Plus supplemental static identity cells remain disclosed.

The final primary run repeats the original 20-symbol market and all four frozen research cases: every complete filtered-stage JSON is identical to CI 39506738033. Corrected original cohort: 126,342 funded closes, PF 0.1019563106, exact tape/execution parity; 5,516 known zero allocations, zero unknowns. Training standard PF 1.1681382 / fast 0.8593500; selected training PF 2.8779931 does not generalize: validation 0.1183849, confirmation 0.0326157. Own hourly passing sets still fall 14,458 to 68 with all 750,636 paired decisions identical. No further calculation defect explaining these market losses was found. Do not force sets to remain passing or recast historical gate PF as later execution PF.

Final stress: 120 synthetic symbols, all 728 Micro/mirror identities, two computes, 100 coalesced kicks, maximum one simultaneous compute; 1,603 execution timer checks with maximum observed lag 58.951ms on this isolated runner. Previous competing-load stalls remain retained; no universal 100ms SLA. Desktop/mobile report checks show zero page errors/overflow. All six primary artifact ZIPs and the extra causality artifact were SHA256-verified. Durable concise receipts: `docs/universal-correctness-2026-10-21/{ci-final,core-inventory-final,summary,causal-partial,repeated-market-stages}.json` and the linked Micro report. PR 184 remains draft; no deployment, merge or venue orders. Unresolved: consistent hourly profitability / production trading evidence, full real 12h 5s history, all-config capital feasibility and hard timing SLA.

# Universal registry/type/range correctness complete — 21 October 2026

Runtime source remains ae7b2021fbdce8c3432329781dfc19a651c7e1fc488b3826874af741e69befaa. Universal CI 39508546694 succeeds: all 1,708 registered specs / 19 families, 606,032 source/lane/type/range/side identity cells, 5,124 controlled passing hourly own-history checks and 5,124 controlled losing checks. On 20 real cached symbols over 96h, six hourly cuts yield 742,080 state-prefix and 4,590,120 Bot-entry/tactics-prefix comparisons, with zero future-data discrepancies. Includes 1/5/15/30m, independent/combined lanes. All seven range tags are checked; supplemental Wide/Minimal Plus identity cells are explicitly labeled, not claimed as a full Cartesian financial replay. See docs/universal-correctness-2026-10-21/{plan,summary,catalog,identity,causal}.json.

Both optional slow tests pass on that runner: mixed-operation storm and two-day background preset backtest (2/2, 133.4s combined). Initial slow workflow failed before tests because worker packaging requires the app build; corrected workflow uses build:dev. Preserve first failed build evidence.

Primary CI 39506738033: ordinary partition 206 files / 2,290 tests passes; runtime 1 file / 28 passes / 2 explicit slow exclusions passes; heavy partition has 5 files / 56 passes plus Signal allow-mode suite's 3 tests cancelled by its setup timeout. The Signal suite used the expanded default Micro/Inverse catalog despite testing only three allowed Signal sources. Its confirmation catalog is now pinned to the original source fixture, new unrelated families stay in dedicated coverage, and disposal/pool cleanup runs even on failure. Targeted repaired suite passes 3/3 in 7.37s. A final exact-checkout complete run remains necessary; do not label the prior run all-green.

Final v9 original market replay, v6 chronological study and 120-symbol load all pass on source ae7. Results exactly reproduce corrected-order economic outcomes: original funded 126,342 / PF 0.101956311; standard full training 345,778 / PF 1.168138; selected training 101,415 / PF 2.877993; later validation 4,007 / PF 0.118385; confirmation 40,604 / PF 0.032616. All post-Base stages and funded evidence are retained. No consistent hourly market profitability or live acceptance.

Final stress: 728 identities / 120 symbols, 2 computes, 100 coalesced kicks, max concurrent compute 1, 1,609 injected execution callbacks, 1,625 timer checks, maximum lag 38.737ms on this runner, no missed checks/errors. This is synthetic callback load, not venue execution latency. No deployment, merge or native orders.

# Gate/identity/funding verification — 21 October 2026

Current source manifest ae7b2021fbdce8c3432329781dfc19a651c7e1fc488b3826874af741e69befaa. Runtime economics match the corrected b0eb source; later changes are funding/report auditing, explanatory comments and lifecycle fixtures. v9 original-window and v6 chronological protocols have exactly the same economic settings/WF/feed/windows as their corrected-order predecessors. Do not retune from their known outcomes.

Controlled original 616-source window: all 750,636 recorded decisions and selected IDs match pre-fix v7, with zero missing earlier virtual trades or changed shared returns. Passing sets still fall from 14,458 to 68 as their own histories deteriorate; no gate-arithmetic disagreement exists. Duplicate rejections are now zero. New independent admission adds 82,599 settled virtual closes at PF 0.064664. Total virtual 131,858 / PF 0.113613; actual funded 126,342 / PF 0.101956311; known zero allocations 5,516. Funded tape/execution PF exactly equal; all entry/price/cost/protection checks pass. Original $10 scenario is infeasible. See order-replay-comparison.json and stage-transition.md.

The first corrected report failed one hourly coverage control by comparing funded types to virtual hourly types. Its deterministic report-only repair passes 60/60, with identical funded PF/cash. The standalone Micro audits now require actual per-close allocation evidence; legacy all-funded evidence is accepted only with explicit zero exclusions/unknowns. The original failed artifact is retained. The initial local report-only attempt was interrupted before outputs to disable unintended variant work and rerun serially; no engine score was altered.

Pre-identity-fix v4 and corrected-order v5 optimization results are both retained. Corrected v5 full standard training PF 1.168138 on 345,778 funded closes; selected training PF 2.877993 on 101,415 closes. Unchanged selected focus subsequently returns PF 0.118385 on 4,007 validation closes and 0.032616 on 40,604 confirmation closes. All four v5 reports prove zero zero/unknown allocations. This does not meet persistent profitability.

The pre-fix isolated full 212-file run completed: 2,372 pass, 3 failed assertions, 2 explicit slow-test skips. Two restart assertions incorrectly required an undefined field after JSON serialization; the fast-loop fixture replaced a position without allocating it. Both restart fixtures (2/2) and the full fast suite (5/5) now pass after meaningful fixture repairs. Funded consumer/stage/parity tests pass 9/9; complete report/funding script matrix passed 39/39 before adding its extra integration test, which separately passes. Typecheck/lint pass. A final exact-source complete 213-file core inventory is partitioned across isolated ordinary/heavy/runtime runners to retain coverage and avoid serial delay, alongside original-window/study/stress jobs. No native orders, deployment or merge.

History trace executes the actual order-key functions from ab38a7a, 36eb672, 47d70d8, e9f7968 and c8e97b8: identical collapsing policy; 32594ed fixes it. The older positive 9-symbol window is preserved separately at matched 0.15% costs. Do not claim it authenticates stable positive hourly performance on the later 20-symbol window. Profitability, feasible native sizing, full 12h genuine 5s evidence and universal 100ms latency remain unfulfilled.

# Micro/Inverse independent order admission — active correction, 20 October 2026

Source manifest `b0eb969dd109c5bfde95a4fd25fc79877d15521fae505737e43c8a72600f13d3` preserves full Micro/Inverse IDs in central closed/open order deduplication. The previous exact-cohort audit was correct for admitted trades but missed incorrectly omitted independent sources. Archived v7 had 97,398 duplicate rejections. `micro-order-identity.test.ts` proves old c8 source executes one of 844 identical independent sources, new source all 844; Paper/native keys retain both sides. Current focused identity/Signal/independence tests pass 36/36 and typecheck passes. See `docs/micro-2026-10-20/stage-transition.md` and the mandatory note in `docs/report-integrity.md`.

Own rolling gate arithmetic independently replays 173,496 decisions with no mismatch. Counts first fall at 10:00 UTC (14,458 to 11,914); exit-hour PF first becomes losing at 12:00. This set decline precedes duplicate admission and must not be conflated with it. The exact original 616-source window is frozen for corrected v8 comparison, with unchanged economic settings and gates. The 728-source optimization is resealed as v5; preserve completed pre-fix v4 scores/selection separately. Current market PF impact is not known until corrected replays complete.

CI 39500328398 on pre-identity-fix manifest 8855 completed study and stress. Selected training PF 2.5213 did not generalize: validation 0.175576, confirmation 0.0304892. All per-trade parity/audits pass. Stress processed 728 distinct IDs and 120 synthetic symbols, max timer lag 59.065ms on that runner; no universal latency SLA. Functional core inventory is still running. Local 3-file completion passed Micro 10/10 and processing 6/6; runtime suite was memory-killed before any tests and remains unverified locally, not failed assertions. Do not disable guards. No live deployment, merge or venue orders.

The correction requires its own full isolated functional, original-window, chronological study and stress jobs. Do not claim profitability until measured; retain all losses and unknowns. The full requested 12h genuine 5s dataset and native capital/ownership acceptance remain unresolved.

# Exact simulation parity and recovered comparison — active work, 20 October 2026

Current runtime source manifest: `8855f27c677a7d4b93e9b39a56667edb26f98ad5a0edc6d668efa0cc45b83539`. This adds a central execution-to-tape audit, without changing signals, gates or economic calculations. PR 184 remains draft. The previous `3b6b052…` financial comparisons are preserved.

User-requested intensive PF audit: all **49,259** funded simulated closes match their original exact config/symbol/side/entry/exit tape returns. Both PFs are **0.21892290918539928**; zero missing or mismatched trades, including every hour and range. `docs/micro-2026-10-20/simulation-parity.json` retains the receipt. Historical selected-window PF 2.38235474 concerns a different overlapping past sample; it cannot be substituted for those later closes. The runtime now verifies this exact-cohort identity after each compute. Negative audit tests pass **44/44**, the dedicated runtime parity test covers **168** independent combinations, the saved-evidence/clock regression set passes **5/5**, and the entire new Micro file passes **10/10**, including Last-N isolation of all **728** IDs. Typecheck passes.

A real reporting bug in the new stage audit assigned exact-hour settlements to the next hour. It now uses the existing central `settledHourT`; a regression catches the changed positive-hour count. Admission clocks with explicitly half-open decision windows remain deliberate. The permanent rule and reproduction checks are in `docs/report-integrity.md`.

Recovered earlier positive reference: native original feed matches all 3,330 original marks. The original archived 483 closes / PF 3.536442206 used 0.20% modeled costs. At the same 0.15% cost, recovered settings/focus and 9-symbol 6h window, reconstructed reference source gives 1,038 closes / PF 1.898224227; current comparison source gives 1,082 / PF 1.829613562, 56/56 report checks each. Common trade returns match exactly; current own-entry checks pass 1,082/1,082. Exit discovery differs. The report lacks original source-manifest authentication, and original uncapped sizing is capital-infeasible. See `docs/micro-legacy-2026-10-20/README.md` and `comparison.json`.

The current local completion queue has passed the full 10-test Micro file; corrected 128-toggle processing and runtime suites remain active/pending. Earlier independent file batches verified 209 of the previous 211-file inventory; the new parity file also passes. A single complete-source full-green sweep is still unclaimed.

Both unscored v3 standard training attempts were rejected by unchanged memory guards under competing external workspace load; no training PF is available. The v4 protocols reseal the audit-only source and retain exactly the original training feeds, normalized settings and chronology. `docs/micro-optimization-2026-10-20/plan.json` revision 3 records this. An offline 96h reproduction excerpt and runner-isolated CI workflow are prepared to run the complete core inventory, both training arms, sealed selection, unchanged validation/confirmation if eligible, and a 728-ID / 120-symbol stress test. Preserve all failed and empty results; no gate or memory guard may be weakened to force profit. Native execution, full 12h 5s coverage, a hard 100ms SLA and durable high-PF profitability remain unfulfilled.

# Micro optimization, filtered stages and request budgets — active work, 20 October 2026

Current runtime source checkpoint: `b786a26`; source manifest SHA256 `3b6b05207292a9fc625fabeae7bd4e06260f8854e474d62d6d78620c2e26146a`. Draft review remains https://github.com/mxssnx-creator/CTS-A-O/pull/184. No main/live deployment or venue order was performed.

Micro now has 26 methods × 2 profiles × 7 subsets = 364 IDs plus 364 independent mirrors. Added flow-break, trend-reclaim, market-continuation and direction-persist. Their prior-range opportunity hurdle is three modeled round-trip costs; original 308 signals match reference 47d70d8 bit-for-bit (924 symbol/ID comparisons). The expanded family/causality/worker/direction/cost checks pass 19/19; the additional golden regression is pending its final rerun. Existing custom focus remains explicit; all new methods keep own qualification and protection identities.

Native signed requests now use a nonblocking rolling budget backed by atomic SQLite on the local host, shared across credentials to avoid assuming different keys imply different UIDs. Conservative documented endpoint limits are used; trader accounts require CTS_BINGX_TRADER_RATE_LIMITS=1. New growth leaves two request slots for protection/reductions where the endpoint allowance permits. A local deferral is definitely not sent, never a late queued order or presumed fill. Durable not-sent markers override stale pending metadata across restart. Latest complete API/ownership/control set passes 224/224; the final focused restart/budget set passes 53/53. Shared file paths must coordinate every local process; other hosts need their own shared coordinator. This is not a hard latency guarantee.

Filtered PF is now derived separately in scripts/audit-micro-stages.mjs and docs/micro-2026-10-20/filtered-stages-v7.json. The original 616-source replay has 14,458 initially passed/seated configs with historical unit-return PF 2.38235 (416,561 overlapping config-history closes), but subsequent funded modeled execution PF 0.218923 on 49,259 closes. Per-range Base/config-gate/execution PF is shown in report.html. These are different cohorts/windows; passing historical PF must not be substituted for later execution losses. Base range PF remains explicitly pair-level representative evidence, not a full-cell count.

The new optimization is preregistered in docs/micro-optimization-2026-10-20/plan.json. Training: 8 October 00–12Z, validation: 9 October 00–12Z, confirmation: 10 October 00–12Z; each has 12h evaluation prehistory and separate 24h indicator warmup on 20 fixed public-history symbols. Two hold geometries retain complete configured TP/SL/trailing cells. Selection consumes only filtered training executions, requires its recorded sample/distinct-onset/hour/PF thresholds, and seals at most 24 source IDs before either later window. The fixed $2 notional / $10,000 balance is a modeled scenario, never actual selected-account data or venue-minimum evidence. No optimization profitability result is available yet.

Unscored below-floor sizing preflights and the first interrupted source reseal are retained. The v3 standard training attempt was memory-aborted while build/broad tests competed; its output cannot certify performance. Retry the SAME frozen v3 protocols only after the heavy regression queue completes and sufficient headroom is available. Do not weaken memory guards or use a degraded fallback result. The local final-seven regression queue is active; 204/211 core test files were verified in previous batches, with the seven heavy suites still pending. Build/typecheck pass at the latest runtime source; guard/stage script tests pass 12/12. Generic lifecycle fixtures retain their original catalog so the new exhaustive grids are tested in dedicated parity/replay/load runs.

Pending: complete the seven heavy suites and any reruns; retry both v3 training arms serially; run select-micro-optimization.mjs exactly once; freeze selected focus/hold unchanged for validation and confirmation; publish all positive/negative/empty stage values; run the expanded 728-ID maximum-symbol stress and final UI/build/typecheck; push exact verified tree and update PR 184. Profitability and production acceptance remain unfulfilled.

# Micro / Inverse implementation and review — 20 October 2026

Current runtime implementation checkpoint: `47d70d8`. Runtime source SHA256 `dc407e994040d9d10c7adb2983215e8898041548300f747705474ea802fadb50` is frozen in `docs/micro-2026-10-20/protocol.json`. Review branch `codex/micro-indication-20261020` builds on the PR 182 integration branch. Draft review: https://github.com/mxssnx-creator/CTS-A-O/pull/184. Published code checkpoint `dc902052b5e603f8790ea0672b960d0b1436a18c` has tree `b5aca781051b36d9070d40c82d91312d536945e6`, exactly matching local `47d70d8`. Later fixture/report updates are pending publication. Main and live deployments are unchanged; no exchange order was sent.

Micro has 308 IDs (22 methods × 2 profiles × all seven nonempty 1/5/15m subsets), with another 308 independently qualified inverse IDs. All configured range cells now participate in their Base evaluation. Modeled transaction costs are capped at 0.15% round trip and charged once; actual venue fees remain actual. Existing 0.2% range-distance references are not transaction costs. The native progress timer is separate at 100ms, serialized and fenced across stop/restart; existing protection continues while changed settings block new exposure.

Concurrent book/account/contract requests now coalesce per connection; revision fencing prevents a pre-order read from clearing a subsequent order/cancel invalidation, including the first cache miss and same-millisecond changes. Stricter freshness remains strict. Existing independent lane-order batches stay bounded at four and stop further batches on rate-limit answers. API/rate-limit/live-control regression passes 116/116. The v7 replay reseals this source; all economic totals and hourly outcomes exactly equal v6. Original v6 protocol and summary are retained.

Final 20-symbol replay: 12h evaluation prehistory + 12h trading + separate 24h indicator warmup; 60/60 report checks; 64,473 post-Base candidate configs, 62,553 initially evaluated and 14,458 initially passed. The 49,259 sized modeled settled closes return PF 0.218923, with 3 positive and 9 negative hours. Equity drawdown is 61.72%, and the uncapped full-config model exceeds equity margin for 495 minutes. Independent arithmetic, entry/gate and protection-path audit reports zero violations. These losses are not a fee/PF arithmetic error, and these order counts are not feasible native execution proof.

The final shared-load 120-symbol test completed two computations, 100 coalesced kicks and 3,766 execution checks without overlapping computes. Maximum observed check lag reached 5.89s under competing memory load (earlier isolated checkpoint 230ms). A hard 100ms latency guarantee is unfulfilled. Genuine 5s trade capture supplies an eight-minute compatibility/causality test for 19 observed symbols, not complete requested 12h subminute data. No official Node BingX SDK was located; the native official REST endpoints and WS protocol remain in use.

TypeScript and production build pass. Desktop/mobile dev functional tests pass 4/4; built output renders Micro/cost controls with no page errors or horizontal overflow. New exact-grid, worker parity, inverse, cost/trailing and execution stop/restart regressions pass. The broader 210-file core sweep is still being completed (191 files verified, 19 heavier files in the final queue); current per-file evidence and any uncompleted work must remain explicit in `docs/micro-2026-10-20/test-results.json`. Generic lifecycle fixtures retain their original 17 October source scope; separate full-family real replay and maximum-symbol stress cover the new catalog. Do not claim a single full-green core run until that file records it.

**Do not deploy or merge as a completed profitable production release.** Profitability, capital-feasible native execution, a strict 100ms SLA and full 12h 5s evidence remain unresolved. See `docs/micro-2026-10-20/report.html` and README for reproduction. Retain the losing evidence and native ownership/stop/quantity guards. Back up consistent runtime/database state and own-order ledgers before any future live reload.

# Final-window admission correction — 20 October 2026
# Signals progression recovery and publication — 21 October 2026

[PR 189](https://github.com/mxssnx-creator/CTS-A-O/pull/189) publishes tested code `534492d622db6be370079e08b94fdbb2dfbb566c` (local `ef0a9275247e22339b17e33f4847e77893fc26d9`), with identical Git tree `9442ef46aef790ad27eb68c47af26ad5ef7c0479`, based on main `fafdea2f5ebe8c903a16f2edd8be34606f746c2f`. Test-harness and lifecycle-reference follow-ups leave production source unchanged. The user explicitly authorized push/merge. Refer to the PR's final checks and merge record for complete default/slow CI and the final merge SHA.

Independent Signal history now matches across full workers, local fallback and incremental rebuilds. Coordinators retain their own rebuild grids and enabled-range historical PF floors. Historic progress covers sampling and candidate evaluations with cancellation checkpoints, and the UI labels variant/candidate counts accurately. All three recreated actual-runtime regressions fail against the original runtime and pass after the fixes.

Fresh verification: **294/294** tests in 21 files, **3/3** complete-job progress tests, **4/4** functional desktop/phone UI tests, TypeScript and production build pass. Changed-file lint: zero errors/five existing warnings. Development and rebuilt Settings render correctly on desktop/mobile with no errors/overflow/baseline divergence. Packaged worker SHA-256 `e6f95d8ecd2f4c08d8b3e056e6898ce86e7d678fb8653bb17e0a564fc40817dd` contains the new progress implementation. Details and evidence boundaries: [signals-progress-audit-20261021.md](signals-progress-audit-20261021.md).

The old unpushed audit commits were absent after workspace restoration; this is freshly reverified recovery on current main. The completed legacy lifecycle run exposed a reference that still used short strategy history for Signals. The corrected bounded fixture uses independent Signal history/coordinator grids, asserts exact hourly seat retention and preserves full tape/paper comparisons: 2/2 pass across three cycles, 49,719 tape states and decisions covering 7,446 open positions. Typecheck and lint pass. Complete default/slow CI is linked in PR 189. Initial CI also exposed abandoned Vite module requests in the UI wait; the corrected finite-data wait passes all four local UI checks, typecheck and changed-test lint. No hosted reload, database/settings mutation or venue action occurred. Merge alone cannot certify the remote live process; verify authenticated deployment access, backups, rebuilt worker, running SHA and owned-position reconciliation before a live-effect claim. Existing economic research seals and qualification thresholds are unchanged.

# Integrated PR 185 checkpoint — 20 October 2026
Final fixture follow-up: the integrated full core run reached all 209 files with 2,476 passes, nine stale fixture failures and two slow skips. The five corrected files pass **137/137**: separate positive config-direction proof for candidate-book tests, a fixed pending-bar clock, true Trade-return loss changes rather than detached prefix-sum edits, correct 4% mark-to-stop arithmetic, per-direction hand-counted validation and separate symbol-PF proof. Production code and the v6 economic source seal are unchanged. Final complete CI is linked in PR 185.


Current integrated code **`597670092e3f385d9786fd023d4ddbba66a99939`** preserves main **`dc8c3bb6a8a4d6176157534a6a9ecbf5773740f8`** (PR 182); backup `backup/main-before-pr185-20261020-dc8c3bb` exists. Engine direction/proven-symbol guards coexist with stricter Signal config/symbol/direction proof, capped trailing-only and weighted DCA. A reproduced Signal held-only cache defect is fixed: red before, 14/14 isolation cases green after. Integration made no venue/deployment/settings writes. X02 was reconfirmed read-only at 22:18:58.324Z with zero positions/orders.

Integrated simulation/native group: 613 passes and one lifecycle snapshot mismatch, then the corrected snapshot passes 1/1. The merged fixture explicitly freezes its old window/Exit-option inputs; the complete parsed result matches pre-merge source with zero differences (60 input, 48 feed, 42 settled). TypeScript and research-protocol 8/8 checks pass. Final complete CI and release commit are linked in PR 185; pre-integration 208-file counts below are distinct.

Integrated comparison `v6` seals source **`00ea02f0cdac575476cf7f7451b007c425ff70f38af761ec8f2929ce81b618ef`**, the same public 600h feed and the predeclared sixteen-arm selection protocol. Its final results are in PR 185 and the standalone report. The v5/e2414bbe figures below belong to the pre-integration revision, preserved with its exact original 130-file sealed source; its protocols are not rewritten to certify changed code. Empty samples and no-loss scores remain explicit, and reused retrospective results cannot establish consistent profit.

# GitHub merge scope — 21 October 2026

The user explicitly instructed "Merge github" for PR 182 after receiving the documented partial profitability result. This authorizes merging the verified admission fixes while retaining the losing multi-range window; it supersedes the earlier keep-draft instruction below. It does not establish a profitable release or change live settings, deployments or venue orders. Backup `backup/main-before-pr182-20261021` preserves main `4588030b946740d493cf0e0d629aa2722aa6211c`.

Merge preparation found two failed CI workflows on `6ed27d61`: Exit verification stopped at a stale UI fixture treating the implemented Breakeven suffix as unknown, and the archived 17 October study correctly rejected the changed economic-source inventory. The UI fixture now covers all five supported Exit families/directions and retains malformed/unknown rejection. The archived data/research chain is explicit workflow-dispatch only, matching the already reviewed PR 185 change; automatic current-code build, worker, report/audit and independent-config checks remain active. Economic source hashes and the study's strict source-drift guard are unchanged. Final local follow-up: app/components **80/80**, exact-study guards **9/9**, TypeScript and workflow YAML validation pass. The 499 segmented source checks and original economic results below remain unchanged; a full default/core green run is still not claimed.

# Direction and empty-symbol causes — 20 October 2026 (pre-merge evidence)

Frozen production implementation: `b545bfda5280de4b8b5afcd29141fbc7e813d850`, including direction fix `d61c1fadaba89c5b6808b914e6246d1b34d982ed`. Published code checkpoint: `26a5107e5b931493dee3878b3274ca315fe282be`, exact local tree `bf8fb60609f182e4a2d86966590ef96dcaa940f9`. Draft review: https://github.com/mxssnx-creator/CTS-A-O/pull/182. Main remains `4588030b946740d493cf0e0d629aa2722aa6211c`; no live reload, account/database change or venue action occurred. The earlier pooled-direction admission policy below is superseded.

Fixture and complete-evidence checkpoint: local `d3836e04e36f57c83b8ef0425e9d05a3db5162df`, published `4e92b4f24acb5db6bf5c1fb56ff465274039e599`, exact tree `91639643f1722d2f1ab0a8485a2ea8773b175f90`. All 499 segmented checks apply to the frozen production source plus these final qualified fixtures. Subsequent publication-note changes affect documentation only.

Two concrete evidence leaks explain previously admitted losses. All 6,716 Shorts in micro12-d1 borrowed Long sample/PF/confidence; the first config had 18 Long closes/PF 8.116158 and zero Short closes. Full configured evaluation now runs per config/direction across symbols through fixed/hourly/Durable selection, every entry and native promotion. Only passing directions contribute to validated aggregates. The separate configured symbol gate remains separate; do not reimpose the full twelve-close config minimum per symbol. Candidate learning retains rejected rows and historical/executed losses. Cached held-only eligibility refreshes correctly on reused arrays, with bounded compact direction views and early rejection of definite failures.

The direction-only 22-symbol repeat still had 1,184 closes/PF 0.408581. Its `provenSide` warmup incorrectly accepted 504 entries with zero own symbol/side closes; all 504 lost. `proven`/`provenSide` now require an observed result even with warmup or symMinN zero. Positive observed thin samples retain configured warmup; other symbol modes are unchanged. The complete final repeat settles **680 modeled orders at PF 1.337123**, reproducing the independently identified own-symbol cohort. Every final order passes current exact Base/config/direction/symbol proof.

Nine immutable final runs are detailed in `docs/sims/direction-qualification-cause-20261020.md` and `.json`. Four 12-symbol Micro windows and three older 22-symbol windows execute zero orders (PF unavailable); their explicit current-direction/symbol or historical evaluation failures remain recorded. The bounded multi-range run still settles **193 Minimal orders at PF 0**. All 873 final executions match their exact candidate prices/exits/reasons/unit returns with zero differences; all have own-symbol history. The losing Minimal cohort had own-direction PF ≥2.267510 and own-symbol PF ≥1.106383 at entry. Prefix audits total 56 comparisons with zero changed historical closes across the tested sources. Costs remain 0.15% once, Micro maximum hold 15 minutes and independent Signal history 336h. These are cached retrospective model results, not owned fills or an untouched alpha holdout.

Final verification: focused continuity/native/Base/lifecycle/Last-N **127/127**, broader 17-file simulation checks **132/132**, other 17 simulation files **204/204**, and the unchanged slow Block runtime matrix **36/36**. These disjoint segments cover all 40 simulation files plus Base/native tests, **499 passing tests** in segments. The first broad attempt had five stale Block fixtures; their corrected files pass in the final repeat, with full own config evidence and unknown-return rejection. No production threshold was lowered. TypeScript and production build pass; the newly rebuilt worker is explicitly checked for the empty-evidence guard (worker SHA-256 `6885033230af49e80c53f02d6749c6f497326f4424c68fa824bd126a1d52c94a`). DATABASE_URL was unset and migration was skipped. Lint has zero errors/28 existing warnings; desktop/phone functional UI passes **4/4**. The earlier broad 43-file command was interrupted under shared 8 GiB host pressure; no single all-core green invocation is claimed. Complete source/settings/feed/protocol hashes and all final/failed outcomes are preserved in the new JSON evidence. **The requested consistent high PF across ranges/windows remains unmet:** the bounded run and two active hours of the positive aggregate window lose. Keep PR 182 draft; do not call this an exhaustive bug-free or profitable release.

Final PR refresh: 15 open including this review. New concurrent research PRs 183 (`cc291637`), 184 (`4542d60d`, forked from the old integration head), and 185 (`e1d337e0`) do not yet include these two engine admission guards. Their Inverse/Micro grids, history/memory/API work and Signal/DCA/Block default changes remain separate; preserve the current independently tested guards when reconciling them. PR 181's latest `26a0ab63` also adds account-specific x01 wallet risk/exposure scripts; do not promote them to global policy. Exact refreshed heads, changed production-file inventories and selected evaluation/default diffs are in the new JSON report. The earlier eleven-PR integration disposition is retained below. Main was re-fetched and remains unchanged.

# Final-window admission correction — 20 October 2026 (superseded direction policy)

Published checkpoint: `5820f50bf520716ca0ca4f6f247f15c06b4cc594`, tree `da8c26aff20fc8e60f8b337482ee1a4a43ad3b06`, exactly matching local review checkpoint `89ab76fd73b50300c47d7cf48d5a26baf8d8184b`. Draft review: https://github.com/mxssnx-creator/CTS-A-O/pull/182. Subsequent publication-note changes affect documentation only.

Local tested implementation: `4e2b82d668ca0dd4f41dc592b099c472ddb5cb44` (scope/ranking fix `2393a13`). This supersedes the full-context admission policy in the older checkpoints below. Main remains `4588030b946740d493cf0e0d629aa2722aa6211c`; PR 182 remains a draft and no live deployment or venue action occurred.

The all-window zero-order result was a regression: config-level minTrades, validLastN and range Last-N had been additionally imposed on each symbol/direction. A diagnostic found all 125,664 hourly context checks failing the new twelve-close minimum, with at most six own closes in 24h. Config evidence now stays on the exact config; the existing separately configured symbol/direction gate is reused unchanged at entry and native promotion. Strict empty-result rejection remains even with symMinN zero. Full PF/sample/LCB/Last-N/range/DDT/DDR/green/stability gates, exact Base pair/range/target admission, current entry rechecks, Signal exact-context proof/336h history, owned native evidence, costs and held-position exit management are retained. Removed Base-only selector shortcuts also restore the configured hourly rank and Durable positive-block rule.

Six immutable final cached-feed replays are recorded in `docs/sims/final-window-admission-20261020.md` and `.json`. The difficult 12-symbol window admits 1,339 config sets initially and settles 6,716 modeled orders at unit-return PF 0.058019; the extended 22-symbol window settles 4,524 at PF 0.040518. The bounded multi-range run settles 536 at PF 0.480370. All entry invariants pass. The oldest Micro window has zero Base passes and correctly zero orders. The artificial admission deadlock is fixed; the requested consistently high forward PF is still unfulfilled. Never label these results profitable or live-ready. No actual order or owned fill is inferred from modeled executions.

Current verification: final scope/entry/native tests 47/47; config scope and actual execution, preserved losses, strict Last-N, symbol vetoes and within-hour deterioration cover all seven ranges. TypeScript and production build pass; the build's first generated-output cleanup attempt failed with ENOTEMPTY and passed after deleting only generated `.vercel/output` and rerunning. The remaining simulation segment passes 64/64; desktop/phone UI passes 4/4 and lint has zero errors with 28 existing warnings. The broader 43-file command exited zero but its log has no final totals, so no complete broad/core pass is claimed. The earlier incomplete/interrupted runs remain unclaimed. No release or merge as a completed profitability fix.

# CTS-A-O operations handoff

Updated 2026-10-20, UTC. Repository: `mxssnx-creator/CTS-A-O`.

## Strategy defaults and authenticated X02 follow-up — 20 October

Pre-integration tested code/fixture checkpoint: local **`7e62614c252f09c5aa547c54141928301a59c6f5`**. Following handoff edits are documentation only. The economic source seal remains `e2414bbe6a79da6638c402ae24e6605dfeee6084689993f2ecbba80fa6175779`; final remote release head and complete CI outcome are linked in PR 185. Earlier exact tree equivalence: local `92ad09a` / remote `a9f6038`, tree `1cf8c9cd2cbf3b4364d258b38f554e1fd645ff66`.

PR [185](https://github.com/mxssnx-creator/CTS-A-O/pull/185) publishes the exact tested local tree: economic checkpoint `86fcf5e`, fixture/UI checkpoint `7e22f25`, initial remote commit `107b4f2fe21c76af79f914f0c5b312fd697dd592`, tree `49df3af591bc0cec6eadcea63d132f72887ced8a`. Backup `backup/main-before-strategy-defaults-20261020` preserves `4588030b946740d493cf0e0d629aa2722aa6211c`. The latest explicit user “Push, merge” authorizes this publication; normal Git lacked local authentication, so the connected GitHub API published a tree verified byte-for-byte by Git tree hash.

Independent ordinary/Signal histories, no-TP trailing-only grids with a 3% initial maximum, one DCA addition of 2.5 original base units (3.5 total), immutable ladder identity and Overall Block relations are implemented. Live strategy history includes the complete requested performance window plus slow-lane indicator warmup; late own venue commissions reconcile only after protection.

Authenticated **X02 VST** testing is now complete: 28 actual opens across twelve symbols/both sides, 60 filled execution slices, 60/60 commissions measured, 9/9 pilot lifecycle phases. All twelve original symbol settings were restored. Final authenticated book at `2026-10-20T20:20:49.636Z`: **0 positions / 0 orders**. Technical fixture admission is not profitable strategy evidence. X01 credentials were untouched; raw account records remain private. No hosted deployment/reload occurred.

The completed sealed 600h `v5` sensitivity study ran 16/16 arms with 6,768 hourly own-config checks, strict Last-25/PF 1.5 and twelve symbols. Development built 50 configs after 1/42 pair Base passes; confirmation built 100 after 2/42. No active config passed every gate; zero funded/virtual closes, PF unavailable, no selected winner. Zero DD here means no exposure, not a profitable low-risk strategy. Do not relax gates or promote a preset from this result. Earlier insufficient-window/gzip attempts remain preserved separately.

The first full CI core run completed all 208 files with 2,430 passes / one Fast-loop timeout / two slow skips. The timeout was an implicit random-market entry requirement in a tick-mechanics fixture. Its feed is now pinned and its held Normal position uses explicit fixed-unit paper sizing; the five corrected Fast-loop checks pass. The remaining 47 local Signal/simulation files pass 525/525. A local full run was interrupted after its runtime checks; it is not claimed as one green full run. Use the final complete PR CI as the release gate.

TypeScript, lint, production build, desktop/mobile Settings and all-page functional UI checks pass. The fresh script stage has 624 passes/8 explicit skips, app/components 80/80, including actual all-page desktop/mobile browser checks with the explicit Chromium path. Both longer runtime tests pass: mixed-operation storm 319.5s and actual queued/repeated preset backtest 17.2s. The final Block matrix passes. The older browser-path failure and unbounded stress failures remain separately preserved. The 34-file targeted regression's stale fixtures were repaired and its three affected files rerun 52/52; the full 208-file core run and the complete per-commit CI outcomes are recorded in PR 185. Both the full default suite and longer runtime checks are release gates; use their linked final results instead of adding targeted rerun counts. See [strategy-defaults-20261020.md](strategy-defaults-20261020.md) for complete settings, order phases, candidate comparisons, evidence boundaries and any remaining release checks. Legacy economic preset caches require backed-up re-evaluation before a hosted reload.

## Latest local Signal PF 1.5 checkpoint — 20 October

Implementation and tested code: **`bc39e25`**, branch `fix/signals-history-matrix-20261020`. Every Signal source/range/lane/type/config/symbol/direction now shares its own PF>=1.5 historic/Last-N verdict across Strategy Base, selection, activation and native/model admission. Pure historic TP/SL runs independently of trailing; held zero-trailing IDs restore exactly; trailing-only Family-Seats are fixed. Stricter gates and the configured partial Last-N policy remain. Full historical fits require own N=25. Representative pair diagnostics remain separate from exact config qualification.

**377/377** targeted tests pass in 24 offline files, including deterministic 12-symbol/all-range/all-lane/all-type routing with 1,104 expected modeled closes, native-proof, stop/control and exchange regression checks. TypeScript, production build and desktop/mobile dev/built Settings checks pass. Initial failures and the interrupted v1 run are preserved; the previous broad repository audit remains incomplete.

Completed sealed `pf15-v2`: **88,621** configs, **17,706** own-Base passes at start, **21,083** configs passing at least one hourly Base evaluation, **4,542** configs with **7,055** accepted settled **virtual** closes. Return PF **1.112312**, hours **11 positive / 12 negative / 1 flat**. Development-selected 3% / ratio 1 / Trailing: development PF 3.839497, confirmation PF **1.370291**, total PF 2.499531. Confirmation does not meet PF 1.5. This is the reused retrospective public feed, not an untouched holdout, funded account or venue result. No every-hour profit or live promotion claim.

See [signal-pf15-20261020.md](signal-pf15-20261020.md) for exact policy, scope and protocol. At that earlier checkpoint X02 credentials were absent and public publication had been rejected. The authenticated X02 tests and explicitly authorized publication in the follow-up above supersede those access limitations; the original virtual Signal profitability numbers remain unchanged.


## Final full-context checkpoint — 20 October

Published tested code commit `5ce2cc21566af0fed6f93151184e2bbcb42e1927` (local implementation `2f48e3ff9fad0cd7fa27fc4f8bbb2170f35b99ee`) supersedes the intermediate `700a91b` validation logic below. The full gate runs independently per config/symbol/direction, including its own minimum sample, LCB, window, drawdown, green share and stability. Only passing contexts contribute to qualification/ranking; neither profitable nor losing unrelated pools can override a context. Additional execution Last-N uses the exact context. Compact views retain the actual evaluation window and required earlier Last-N rows, with one cached view per tape; cache changes and exact-entry-boundary closes have regressions.

Four final 12-symbol fixed windows complete with **zero qualified contexts at the recorded start/end snapshots, zero executed orders and unavailable PF**, preserving thresholds. This is correct refusal of unproven entries, **not** fulfillment of many orders with consistently high forward PF. Earlier extended 22-symbol full-context attempts before final compaction were memory-incomplete; their results cannot certify this final source. The old 999/PF0.023841 sample remains in the archive as an explicitly failed intermediate implementation.

Final targeted checks pass **83/83**; TypeScript passes. They cover all seven ranges, unrelated-pool independence, sample/LCB non-borrowing, all selection modes, native promotion, duplicate symbol slots, Last-N/history cache changes and exact-close boundaries. The later-core segment passed 184 tests before the final context changes. The simulation sweep passed 401/407; its six stale 24h-window fixture failures now pass in the explicitly pinned 18/18 Block admission fixture. The archived lifecycle snapshot remains exact after pinning its original input options; every non-options field matched reference source 9c037e2 before the fixture was updated. Production typecheck/build and UI are passing checkpoints; a single immutable full-green core run and profitable execution evidence remain pending. Do not deploy or merge as a completed profitability release.

The draft review is https://github.com/mxssnx-creator/CTS-A-O/pull/182. Use the GitHub connector to update its branch: Git CLI has no push credentials. Verify the remote Git tree equals the local tested tree before moving the branch. Main remains unchanged.

## Intermediate checkpoint (superseded by the final full-context logic above)

Tested implementation commit: `700a91b06dcf42a05321ca2a3986c0c33dac1846`.
Audit evidence update: `a00bfd8`. Integration branch: `codex/integrate-open-work-20261020`, based on main `4588030b946740d493cf0e0d629aa2722aa6211c`.
Remote backup `backup/main-before-open-integration-20261020` preserves that main head. No running instance, native connection, account state or venue order was changed.

New protections preserve exact Base-qualified TP targets separately from diagnostic construction; recheck the exact config at entry and native promotion; require its own symbol/direction Last-N and range Last-N; retain the configured lane history for count-based validation; and correct repeated-symbol indexing in multi-timeframe Signal/engine contexts. Maximum hold minutes now remain exact across lanes. Signals retain separate 336h source history. Integrated PR 175 independent peak trailing/2% Signal protection and selected PR 181 hold fixes, plus PR 168 stable yielding sorts. Current main's cost, ownership, confirmed-fill and unknown-return protections are retained.

**Unresolved operator objective:** consistently high forward execution PF with many orders is not established. The extended public 22-symbol cached replay still produced 999 fully qualified modeled closes at PF **0.023841** in one fixed window. Other exact-context windows produced no eligible executions; an empty cohort has unavailable PF. Native promotion still requires separate matching settled model and owned execution evidence and cannot use these pooled historical stats as execution proof. Do not enable a release or claim alpha from these results.

Details, the complete open-PR comparison and hashed retrospective protocols: `docs/sims/postbase-continuity-20261020.md` and `.json`. Original fixed-window losses are retained alongside the corrected admission counts. The larger public fixture is restored from PR 164 and checked against every manifest chunk and the archive hash; it is not a newly resealed holdout.

Verification completed: TypeScript; production build with DATABASE_URL unset; lint (0 errors, existing warnings); desktop/phone UI 4/4 including Settings save; focused continuity/qualification 67/67; independent Signal gates/context regressions 43/43; live budgets/regression 100/100; native promotion 20/20; Base count 2/2; recovery 7/7; lane lifecycle + independent Exit 17/17; script repairs 46/46. Some counts overlap and must not be added as distinct tests. The broad core runs found stale fixture assumptions, now corrected and rerun; runtime smoke cases also exceeded their 120s wait on this host. A single immutable all-green full-core run remains pending. No full-suite success is claimed.

Git CLI push has no HTTPS credentials in this workspace. Use the authenticated GitHub connector for an atomic review-branch tree/commit if available; preserve local commit provenance and verify identical source content after publication. Do not force-push or merge an unverified release.

Updated 2026-10-18, UTC. Repository: `mxssnx-creator/CTS-A-O`.

## Local checkpoint: bounded broad history and Last-N validation — 18 October

General walk-forward warm-up is now 6 hours and broad config selection is 24
hours. Seat validation continues to use its per-config Last-N sample (15
closes); the separate entry Last-N gate remains off per the measured evidence
below. Symbol-specific history (`symH`) is included when trimming runtime tape
history so that a longer requested symbol window is not silently truncated.
Per-symbol and per-side order caps remain unlimited (`0`).

An explicit `--focus all` on `core-session` now overrides a frozen settings
snapshot, rather than being overwritten by its saved focus. This was found when
the supposed all-focus replay still evaluated only the saved 36-pair subset.
The expanded default-focus rerun used a frozen snapshot with its narrow focus
removed (97 default pairs / 147 runtime combos), 9 symbols, 24 hours of
prehistory and 6 evaluated hours from the same offline feed. All **56/56**
report checks passed. Base passed **7/147** pairs; **1,388** configs passed at
least one post-Base evaluation; the replay closed **483** orders at return PF
**3.54**. At the tested 2% balance fraction the equity drawdown reached
253.44% and margin exceeded equity, so that sizing is infeasible. A 0.2%
fraction kept 483 orders and return PF 3.54, with equity drawdown 26.23%, but
still exceeded equity margin by 3.32×. These are separate risk sensitivity
runs, not a production sizing change, and the 6-hour result is not proof of
durable profitability. The all-718-pair experiment hit the local memory guard
after three retries and is incomplete; no counts from it are treated as
passing.

Verification: `scripts/core-session.test.mjs` passes **29/29**, gating and
stage-consistency tests pass **15/15**, TypeScript typecheck and
`git diff --check` pass. The bounded runtime replay completes in 6 seconds. The new
checkpoint is local and not pushed or merged.

## Independent Historic Exit implementation — 18 October

Exit Strategies now have a dedicated bot-free path through the normal causal
Base → Main → Real pipeline. The path enumerates existing configured sources
and adds Tactic, Relate, Break-relation and activity-profile sources
independently of Bot selection. It supports standalone 1 / 5 / 15 minute
lanes, higher-timeframe combinations, five protection families (static and
adaptive stop-loss, trailing stop, breakeven and trailing-only), causal fit
and validation windows, and the normal risk/execution gates. Settings,
runtime diagnostics, session evidence, recovery and the settings/stages UI
expose this lane explicitly. The Exit cohort must also pass its own Normal
Base PF, sample and drawdown gates before fitting or execution.

The 12-symbol 24 h prehistory + 24 h replay is fully recorded in
`docs/sims/independent-exit-12sym-20261018-summary.md`. It enumerated 1,026
bot-free pairs (50 Tactic and 196 relation variants), admitted 54 through
Base, tested 192 protection candidates and qualified 7 configs. Its 12
funded Exit closes returned PF 0.253 / −$0.366, with 1/6 active Exit hours
green. The complete uncapped 10× account lost $1,169.03 (PF 0.639), had 8/24
green hours and exceeded equity. This confirms the independent execution
path, not a profitable strategy or a live-ready sizing policy. No live
settings, venue orders, running instance, database or deployment were
changed. Do not tune on or promote from this replay.

## Latest checkpoint: equity drawdown audit — 18 October

PR [167](https://github.com/mxssnx-creator/CTS-A-O/pull/167) merged as
`1e529098b6a799e8acdbc123366196016643cf65`, tree
`dcbd75157e899c65f25b5bffb9946c2d128f452c`. Subsequent main integrations
advanced the base to `2ac457c9af4e38df4e07f880a65ba247d8b7ebc7`, tree
`73126c63b4f2b2519e5742c2cceb0622fc251e72`; backup
`backup/main-before-equity-dd-20261018-current` preserves that base. The
drawdown audit and its exact tested head are recorded in PR 170.
This continuation fixes Statistics/backtest equity marks and drawdown measurement only;
strategy, cost, PF, qualification, position sizing and execution code are
unchanged. Historical PF and hourly outcomes below remain the frozen record;
the recent 22-symbol final window's PF 1.4597 still had 99.461% maximum equity
drawdown and is not capital-feasible.

Statistics, backtest charts and the live-test report previously used a
one-minute candle's close at its open timestamp, before that candle had
completed. They now use only the latest fully closed bar at or before the mark
time. The Statistics timeline previously computed DD
from chart samples (up to 600 points), which could skip an intermediate equity
peak or trough. It now tracks peak-to-trough dollars, peak-relative percentage
and underwater duration at every minute and trade event; chart point count only
controls rendering. Active exposure is aggregated by symbol, and margin remains
an independent feasibility/readout metric, never an input to equity DD. A
deterministic 90-day, 22-symbol, 10,000-order synthetic profile completed in
59 ms with the local test fixture; this is an algorithm check, not a production
benchmark.

Focused Statistics/API/PF tests pass **49/49**, session-report tests pass
**28/28**, and TypeScript typecheck and production build pass. The equity regression verifies a
peak/trough between chart points and confirms leverage changes margin without
changing equity DD. An API regression verifies a mark from a bar only after its
close. PF and the executed trade cohort are unchanged. The prior frozen market
results remain the economic benchmark; the 6-hour PF 2.374852 result recorded
later in this handoff was from a separate historical window and is not proof
that this reporting correction improved strategy returns.

## Historical checkpoint: exact Signals, complete studies and performance — 17 October

Source [PR 163](https://github.com/mxssnx-creator/CTS-A-O/pull/163) is merged:
source merge `df34e931da4d9726e73feca1c0fbbf15fc7cb448`, exact tested tree
`1e0edfdd6d87e5ed43db464c1b4fb50a047ebf5e`. Risk PR 166 merged as
`09d800cc56946d1da120a03f96e2f382e7763d88`, tree
`225c65cb81eec46fd851c37e2663038733274865`. Backup
`backup/main-before-exact-signal-20261017` preserves `d1364e5`.
Economic checkpoint is `fdabcdb`; bounded capture/reader checkpoint `0b8c145`;
final source documentation checkpoint `3bcf204`. No live settings, venue orders,
running instance, database or deployment were changed. No browser render QA
or exchange-fill verification was performed in this pass.

### Correctness and performance changes

Exact Signal protection config × symbol × direction survives activation,
acceptance, Last-N, paper/live seating, hedge checks, audit, reporting and UI.
Empty siblings no longer dilute a good config, opposite-side results cannot
qualify a losing side, and absent engine selection no longer bypasses live
activation. Held configs remain exit-only. Fresh Signal count 0 is unlimited;
explicit custom counts remain respected. No PF/sample/DD gates were lowered.
Historical preparation takes the stricter Stage/custom Base-set PF floor.
Empty held-only Base results explicitly fail.

Canonical modeled round-trip cost is 0.15%. Migration v34 changes only the
exact former factory fee/slippage tuple, including matching preset settings;
custom/measured costs retain provenance. Range construction stays at 0.20%.
The earlier 0.20% versus 0.15% study also changed sizing 2%→0.1%, so it is not
a cost-only experiment. The old positive replay evaluated 336h, not 48h, and
cannot certify six evaluated hours. See the cost/positive-replay audit.

Bounded replay loads every requested symbol before first computation and blocks
partial/failed/short coverage; live startup stays progressive. Session CLI
background preset comparisons default off, explicit diagnostic opt-in retained.
Unique exact acceptance tapes build prefix results directly; generic duplicate,
pooled and unsorted fallback remains. The acceptance fixture preserved its hash
while changing 1,491→531 ms wall, 1,702→485 ms CPU and 259→177 MB RSS.

Session evidence is lossless, ordered and SHA256-sealed in ≤8 MiB JSONL chunks.
Tapes are exported lazily; trade/validation/allocation readers and Python bridge
support flat and chunked forms. Missing/unhydrated evidence fails explicitly.
Report HTML omits unused embedded allocation arrays while exact JSON retains
all rows. Current corrected20 HTML is 3,239,840 bytes versus 78,770,915; this is
not a claim that total archived storage shrank. A 12-million-row stress case
exceeding Node's old string limit wrote/verified at 347 MiB RSS. Regenerable
synthetic chunks were removed after preserving their measured proof.

### Completed, independently reconciled studies

CI [39077484680](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077484680)
passed all eight jobs: production build, worker packaging, typecheck,
193/193 targeted tests, four 20-symbol cases and both 22×24h windows.
All four current 20-symbol economic/allocation/account fingerprints match the original
runs exactly. Both 22-symbol audits passed 16/16, including every chunk, funded cohort,
unit/cash arithmetic, hourly result and settings/source provenance. Full 22-symbol
coverage used no fallback, degraded compute or aborts. Follow-up CI
[39080618483](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39080618483)
passed all eight jobs on PR 167, including the repeated six frozen replay cases;
endpoint tests also passed in
[39080618393](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39080618393).

| Model/window | Funded engine closes | Unit PF | Closed cash $ | Cash-positive hours | Capital feasible |
|---|---:|---:|---:|---:|---|
| 20-symbol baseline/current | 126,380 | 0.765632477 | -1.543603 | 4/6 | No |
| 20-symbol entry Last-N 5 | 87,179 | 1.267875180 | +12.395141 | 4/6 | No |
| 20-symbol entry Last-N 15 | 94,903 | 1.112511245 | +9.261089 | 5/6 | No |
| 22-symbol selection | 127,501 | 0.748210087 | -27.709200 | 10/24 | No |
| 22-symbol untouched final | 127,210 | 1.459701913 | +15.408821 | 16/24 | No |

These five source policies use actual position/gross ratios 0/0 (uncapped),
separate from the final exchange cap of 100 Symbol × Direction positions. Final 22-symbol
peak modeled margin is $269.20924 on $10 starting equity; marked DD 99.461%,
minimum equity $0.062921. Both directions traded, but final long PF 0.868962
versus short 3.970918. Signals and trailing-only funded samples remain empty.
A no-loss sentinel or empty cohort is never a measured passing finite PF.

Current corrected20 capture runtime is **185→62 s**, peak RSS
**11,555→3,123 MB**. Entry5 is 177→59 s / 11,169→3,081 MB; Entry15 is
198→57 s / 10,370→3,196 MB. These exclude report/audit durations; direct strategy
compute did not uniformly improve. Selection22 simulation/report/audit wall
was 192.850/259.333/22.763 s; final 89.378/77.018/11.218 s. All three report minute-book passes now cache immutable order units/volume/keys
and each symbol price once per minute. Snapshot caches stay separate for capped
and uncapped allocations. No arithmetic association or iteration order changed.
Patch `249d57a` (integration `069cb36`) passes 27/27 report tests and independent
review. All 468,368 orders, 63,360 symbol-minute marks and 18 old/new slices
match; all new full passes match applicable recorded results at six decimals.
The full eight-job replay/build CI passed on PR 167. A full end-to-end report
speedup was not established because the old-loop profiling attempt hit its
240-second watchdog and its retry was stopped; these are preserved as failed
attempts, not passing benchmarks. The 8,192 MiB V8 allowance applies to worker
isolates too, not a whole-process/runner cap. Isolated research used four CPU,
16 GiB runners; this does not resize the shared local eight-GiB environment.

Six hours are evaluated prehistory; older candles initialize indicators only
behind `evaluationFromT`. Source is 22 fixed genuine Binance USD-M symbols,
665,280 native 1-minute bars, Sep 26→Oct 17 00:00 exclusive, 462/462 official archive
checksums verified, no gaps/duplicates. Feed SHA256:
`84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`.
This source differs from earlier BingX evidence. Do not fit individual losing
hours. The completed selection found **zero eligible pruning proposals** under
the frozen ≥50 closes / ≥3 symbols / losses in both halves rule. All ranges stay
enabled; no defaults or live promotion follow from these experiments.

Signals did activate: all 1,473 selection / 1,111 final execution attempts have an
explicit first-failure reason before funding. Selection: own-history 1,150,
confirmation 223, cluster 51, own-PF 49. Final: own-history 763, side 271, own-PF 43,
cluster 34. Own-history combines sample/PF/DD checks; recorded artifacts do not
split its failures. Preparation snapshots and representative Base counts are
not admitted executions. There is no unexplained activation/funding drop in
these windows; no Signal passed all configured causal entry gates.

### Account-risk holdout and endpoint marks

[PR 166](https://github.com/mxssnx-creator/CTS-A-O/pull/166) is merged.
CI 39077541410 passed all six jobs. All four independent account-risk audits
passed, including matching frozen economics/caps, complete evidence provenance,
funded config membership, hourly cash and all 1,440 minute equity/margin values.
Each arm has position notional ratio 0.75 and gross ratio 7 or 1, unchanged
strategy universe, causal entry Last-N 0/5/15 and live disabled. The sole
prespecified candidate is entry5-gross1; a diagnostic cannot replace it after
scoring. All four policies fail the frozen profitability criteria.

| Risk arm | Funded closes | Unit PF | Closed cash $ | End marked equity $ | Maximum DD | Cash-green hours |
|---|---:|---:|---:|---:|---:|---:|
| Control, entry0 / gross7 | 789,873 | 0.691260716 | -1.018721 | 8.472082 | 19.0931% | 14/24 |
| Entry5 / gross7 | 595,448 | 0.834692837 | -0.880353 | 8.540239 | 18.6287% | 16/24 |
| Candidate entry5 / gross1 | 604,153 | 0.824573475 | -0.093895 | 9.829475 | 2.3357% | 16/24 |
| Entry15 / gross1 | 680,439 | 0.711549623 | -0.145745 | 9.782792 | 2.5763% | 16/24 |

All four are feasible within the configured aggregate-parent model, with no
modeled margin shortfall and both directions executed. Signals remain empty.
The two entry5 arms have identical ordered virtual-return hashes: their funded
cohort differences arise from final account caps. Gross1 reduced marked drawdown,
but none qualifies for live/default promotion. The minimum candidate marked
equity was $9.809587. Full outcomes and all 96 hourly rows are in the risk report.

A pre-existing DCA endpoint report mismatch affects 146 of 420 open DCA orders;
274 single-leg DCA and 22,388 non-DCA match. Engine equal-notional leg marks sum
to −$18.38877698447657; the unchanged arithmetic-entry minute account sums
to −$18.390983089577958, delta +$0.002206105101386. Additive amendment checkpoint
`e6c9caa` preserves every original field and frozen seal, explicitly adds engine
and book mark bases, and reconciles book marks to original equity−balance.
Its 16 tests and readback of 126,380 settled and 22,808 open rows pass; unchanged settled,
allocation, hourly and curve hashes are preserved. It does not reconstruct
causal leg fills: raw evidence lacks each leg's price/time/size ledger. Never
replace arithmetic entry with a harmonic entry retroactively. See the endpoint
amendment doc/proof; original inputs remain immutable.

Complete hourly/range/type/side/provenance tables:

- `simulations/completed-study-summary-20261017.md`
- `simulations/development20-results-20261017.md`
- `simulations/source22-results-20261017.md`
- `simulations/risk-entry-results-20261017.md`
- `simulations/endpoint-mark-amendment.md`
- `simulations/minute-report-cache-20261017.md`
- `simulations/session-evidence-format.md`

Earlier resource failures remain preserved: first22 stopped at 18/22, exit 143
with 15.3 GiB RSS and background comparisons; replacement22 computed then hit
Node's 512 MiB string limit; first four risk captures hit the default ~4 GiB heap.
None of those failed captures is funded performance evidence. The successful
bounded retries supersede completion claims, without deleting failure records.
Public source, original/replacement 20-symbol archives and independent proofs
are durably preserved. Saving the largest new 22/risk raw archives timed out
without receipts; their finalization outcome is uncertain. Do not automatically
retry those writes: the Library skill prohibits retrying uncertain finalization.
Full verified ZIPs remain local and in GitHub Actions with seven-day retention.
Future source/risk workflow uploads now request 90-day retention; this does not
extend the earlier artifacts retroactively.
A separate compact bundle preserves complete audit proofs, frozen protocols,
settings, source/ZIP hashes and the full endpoint report revision. It is saved as
`CTS-A-O-verified-audit-and-endpoint-evidence-2026-10-17.zip`
(20,280,672 bytes; SHA256
`73fdb7ddee83d5d4faef0bf1d2d00453427700c190f70a3a3db8ab2657c0d29d`).
The performance proof is included; end-to-end CI timing remains pending.
Git-backed source/docs stay in the repository. Do not touch unrelated local
jobs or `/workspace/startup.sh`, which belongs to another checkout.

## Systemwide PF scope and cash basis — 17 October

Systemwide test and simulation benchmarks now explicitly follow the validated
cohort: Base minimum-PF-qualified pairs → post-Base configs validated/seated →
funded settled orders actually executed. The evaluated/passed counts and each
later-stage count remain visible. Headline, hourly, range and strategy PF use
the executed cohort. The all-candidate/pre-validation PF table is labeled as a
diagnostic and is excluded from benchmark ranking and qualification. This is a
standing rule for future CTS-A-O work; do not optimize against an unfiltered
candidate aggregate.

Cash PF is the normalized base-$1 PF: each funded settled order contributes its
canonical unit return at equal $1 notional and should match Return PF. Actual
sized-dollar PF is separate because funded notionals differ. Cash P&L uses
`(1 + execution-weighted return) − 1`, then scales by funded unit notional; tiny
nonzero returns survive floating-point cancellation, and Block, coordination
and ladder volume are not applied twice. No profitability claim or live setting
change follows from this reporting fix.

The default replay is the cached six-hour evaluated prehistory plus six-hour
simulation. Its scored orders are already post-Base Real-stage executions;
the latest code change makes that cohort explicit in JSON evidence, Markdown,
write-up and HTML, and labels all-candidate tables diagnostic-only. Focused
verification and replay results are recorded in the audit below.

## Updated Micro defaults and runtime audit — 17 October

The 60 updated Micro Break IDs are now in the default focus, bringing it to 97
unique bot/indication pairs. Migration v28 upgrades only a saved prior-default
focus; a user-customized focus is preserved. The regression checks verify all
60 IDs are unique, eligible for processing and migrated without overwriting a
custom selection.

The audit found and fixed two correctness issues. A Base-failed held pair had
been omitted from `pairTags`, which meant “no Base filter” and could rebuild
every strategy range. The runtime now passes an explicit empty Base result and
the builder retains only exact held configs as held-only tapes, including DCA
and Axis ladders. A separate report check combined Signal tapes with engine
Base sets; the output now keeps combined totals while checking each population
against its own denominator.

Fast offline audit: nine cached symbols, six evaluated history hours plus six
simulated hours ending 2026-10-15 04:00 UTC, one worker, Signals enabled. All
66/66 report consistency checks pass. Base evaluated 854 engine pairs and
passed 53; 295 engine configs seated and 7,946 funded orders executed. The 60
Micro identities are present in the default focus and all 980 requested engine
and signal combos were processed. The signal trail screen qualified 0/126
pairs in this short window (124 had insufficient entries; eight candidates
were evaluated, four lacked the close minimum and four failed PF).

Result is not profitable: Return PF and normalized base-$1 PF were both 1.90,
while sized-dollar PF was 0.75; net was −$0.17 from $10, with 48 positions,
10,692 virtual closes (2,746 zero allocations), 7.09% maximum equity drawdown,
and two of six hours positive. Size weighting therefore turned a positive unit
PF into a negative cash result. The six hourly rows, all PF definitions, and
coverage details are in
[the detailed 6+6 audit report](simulations/systemwide-postbase-6h-20261017/report.md).
Engine peak RSS was 851 MB with full compute level, no memory fallback and no
aborts; the replay did not change live settings or place venue orders. No
profitability or live-promotion claim follows from this sample.

Focused verification on this checkpoint: the combined PF/report, worker pool,
Micro/default migration, seating, Break and stage bundle passes 76/76; TypeScript
typecheck, Node syntax and `git diff --check` pass. A full core suite was
running concurrently in the shared workspace; its completion status was
unavailable, so it is not counted as a completed pass.

## Break retest and market-gap correction — 17 October

Tested source checkpoint: local commit
`9b615befb9704e9f536a3a176673919abb296992`, tree
`ae42df80a9106eef60c1cee560faa2ded96b6476`, based on merged main
`9604431e5ab912f989aaa4282d344ec3bf87e89f`. GitHub mirror commit
`853f4526658654b18380fe547f51d2289de56b57` contains the same tested source
tree.

The Break retest state now cancels a pending long or short retest when a fresh
opposite Donchian cross occurs, for both regular and 8-bar channels. Market
returns now require immediately contiguous candles, and market-volume activity
restarts its 60-bar warmup after a gap. The shared market drawdown calculation
was factored without changing its formula. Regression coverage exercises both
reversal directions, gapped activity warmup, market-index continuity and Break
anchor-lane routing.

The default fast offline recheck used six evaluated prehistory hours plus six
simulated hours on the cached nine-symbol feed (through 2026-10-15 04:00 UTC),
Block ratio 0.2, Signals off, and a six-hour causal selection window. It
reproduced the saved ratio-0.2 report exactly apart from compute-time and
formatting text: 53/665 Base pairs passed, 49 engine configs seated, 3,759
funded orders, Return PF 2.86, sized cash PF 0.74, net -$0.14, and 6.64% max
equity drawdown. Five of six hours were cash-positive; 02:00 UTC lost $0.31 on
1,845 orders (cash PF 0.43). The simulation's $10 start balance differs from
the older positive $1,000 replay, so dollar totals are not directly comparable.

The earlier 0/60 Break-only smoke had zero Base-passing pairs because its
minimum close-count gate was unmet; PF was unavailable, not measured as zero.
The expanded Micro run above has orders. The older positive systemwide replay
used four symbols, 15-minute trading, Signals enabled and a different Base
cohort: 792 funded orders, Return PF 2.37, cash PF 2.22 and +$4.42, with 4/6
positive hours. These are different cohorts and settings, so the positive
result does not contradict the current loss. No gates were relaxed, no live
settings were changed, and no venue orders or deployment were used.

Verification on the tested source: 31/31 focused guarded core tests pass across
Break, market/Micro relations and lane routing; TypeScript typecheck passes;
`npm run build:dev` passes and packages the core worker; the replay's
consistency checks pass 64/64. The full repository core suite and live venue
execution were not run for this patch; profitability is not established by the
six-hour smoke.

## Break post-Base 12 h replay follow-up — 17 October

Detailed report: [break-postbase-12h-20261017.md](simulations/break-postbase-12h-20261017.md).

The corrected offline replay used 12 h of evaluated history plus 12 h of
simulated trading. The first 9×12 draft accidentally let config selection use
the default 336 h longH; that evidence is superseded for this request. The
replay launcher now preflights the complete normalized settings before scoring
and uses a bounded replay-only 12 h selection window. Production's 24 h
minimum longH and saved/live settings are unchanged. Historical native live
last-N settings are not simulator gates; the report no longer labels them as
such.

On the matched 9-symbol cached feed, the legacy 4-ID set passed 4/12 Base
Micro pairs, validated 696/3,128 post-Base configs at pooled Return PF 4.104,
then executed 1,563 simulated orders at PF 0.342. Updated Break passed 4/60,
validated 728/2,176 at PF 10.345, and executed 726 orders at PF 3.272 with
+$5.201 net and 2.71% equity maximum drawdown. Its hourly outcome was 3
positive, 6 flat and 3 negative hours; realized PF fell below 1 at 18:00,
19:00 and 23:00 UTC. The update improved aggregate quality while reducing
orders; it did not meet the every-active-hour goal.

An exploratory in-sample 70% green-hour config floor produced 616/2,176
validated configs at PF 13.391 and 566 simulated orders at PF 4.904, net
+$6.496. It reduced the 18:00 loss from 228 to 108 orders but kept the same
3/6/3 hourly outcome. This remains a test candidate only; do not promote or
retune it on the same window. A 3×4 config-floor/entry-last-N grid found no
hourly or aggregate execution improvement.

Verification: 18 matrix replays plus two current-source confirmation replays
passed 56/56 consistency checks each; session-report tests 15/15; the focused
Break/Micro/Relate/range/walk-forward/pipeline regression bundle passed
116/116 across 28 suites; TypeScript typecheck, Node syntax and diff checks
passed. The current-source replay hashes and matched baseline / 70% outcomes
are recorded in the detailed report. The cache contains only nine real
symbols, and no live venue execution or deployment was tested. Exact source
checkpoint `5372a70` (`feat: bound Break post-Base replay controls`) is mirrored
as GitHub commit `de6a1acb3917ef8739b034ac11329f535f067dcb` on
`fix-base-range-report-20261017`; GitHub verified the published branch. No
deployment or live trading change was made.

## Matched Block ratio check — 17 October

The paired six-hour systemwide replay is recorded in
[the Block ratio comparison](simulations/systemwide-block-ratio-comparison-20261017.md),
with complete hourly and range/lane/type reports for both runs. On the same
nine-symbol feed and gates, ratio 0.2 improved Return PF 2.83→2.86, sized cash
PF 0.66→0.74, funded orders 3,711→3,759, net −$0.21→−$0.14 and max equity
drawdown 7.72%→6.64%. The same 02:00 hour remained negative, so neither result
qualifies as consistently profitable and no live default was promoted.

## Relate indication and Micro verification

Implementation branch: `feat/relate-indication-20261016`. Remote safety
checkpoint `backup/pre-relate-20261016` preserves main
`ec30c30c80c9d5531e368ac7de5084d41ac79d23`. Main subsequently advanced to
`f659a266590722d1de6a33eb900c02ab90aa020b` with the independent Live exchange
slot-admission fix; remote backup `backup/pre-relate-main-update-20261016`
preserves that exact commit. The main tree was merged locally as `4ca2877`; the only
conflict was a gating-test fixture, resolved to the current positive-DDR sample.
The Relate work was merged by PR
[#146](https://github.com/mxssnx-creator/CTS-A-O/pull/146) at
`8750e259beafdf9d7ac98bc8a66c4ca6f2b878a1`. PR
[#151](https://github.com/mxssnx-creator/CTS-A-O/pull/151) then restored the
complete scheduler regression after a truncated test blob was detected and
merged at `10d50c5bb1f16fced70a5b5067a9f3bf6dcd8201`; that was main at the
Relate verification. PR #152 later advanced the docs baseline to
`83585ef6b12c215fa0ee6a0dd2f8cfacba35b6cf`, tree
`d843e839f7bab4992f355576f528cdf9c9673ab8`, the base for PR #153.

Original Relate source checkpoint: `ec0c489fc590a693fc67ca294401e66d328bda78`,
tree `494bb1047d1db9dc19339412cc3bd0d12375c919`; GitHub mirrored it at
`c748089523bec47f72fff49d51a5113f652ba41a` with the identical tree.

Relate has 40 stable exact identities: seven nonempty subsets of 1/5/15m × two
modes (Trend and Adaptive) × two drawdown/activity profiles, with 28 standard
IDs plus 12 Micro aliases. Each config runs once on its fastest/anchor lane;
higher-timeframe checks use completed bars. Micro aliases require the existing
5m Micro lane floor, keeping the known weak 1m Micro lane out. Standard 5m
identities remain eligible for Minimal and standard 15m identities for Short,
subject to each range's own lane and Base rules. Per-config memoized typed-array
calculations cover causal trend, ATR-normalized symbol and market drawdown,
last-bar/recent-part/activity-change ratios, and market activity. Relate shares
the independent Tactic/Relate Base measurement and 1.10 return-PF floor.

Current verification:

- Before the main update, guarded focused core regressions passed 141/141 across
  12 files and 30 suites; platform/UI tests passed 78/78 across 8 files and 16
  suites. These cover every Relate ID, Micro routing, causal 1/5/15m alignment,
  gap reset, completed higher bars, drawdown/activity guards, Base range cells,
  128 processing-toggle combinations and worker counts.
- On merged tree `73e5d82`, `npm run typecheck -- --pretty false` and
  `npm run build:dev` pass. The build packages the 24.65kB Relate client chunk
  and core worker bundle.
- ESLint on changed code files: 0 errors and 4 existing unused-variable
  warnings in `runtime.server.ts` and `walkforward.ts` (the two Markdown files
  are outside ESLint's configured file types). New Relate files are clean.
  `git diff --check` passes.
- Merged-tree targeted verification after the main update: 138/138 guarded
  offline core tests pass across 10 files, covering Relate/Tactic/Micro,
  completed higher bars, lane/range routing, pipeline causality, signal discovery,
  seats and gating. The focused UI suite passes 10/10 across two files.
- Hard-pressure memory guard: 1/1 passed. The former cycle-serialization test
  timed out after performing two full 4-symbol, 18-day synthetic portfolio
  runs; it now uses a controlled compute barrier, verifies one follow-up compute
  with no overlap, and passes 1/1 in under one second. This is a scheduler test,
  not a full runtime/processing stress run.
- A prior guarded 10-file run passed 181 tests and cancelled 3 processing cases
  after `processing.test.ts` hit its 400-second internal warm-up wait under
  concurrent load. Its 128-toggle matrix and two related processing cases remain
  incomplete.
- Synthetic indicator benchmark: 40 IDs × 10 symbols (1,973,360 config-bar
  visits over 126,670 source bars) completed in 210ms; after GC, ArrayBuffer
  growth was 15.16MB, heap growth 0.36MB and RSS growth 26.13MB. This measures
  calculation cost only, not strategy performance.

An earlier complete guarded core run on this source before fixture corrections
finished with 1,950 pass, 7 fail, 2 skipped, across 169 files. Every Relate
test passed. Four stale test expectations were corrected (Base fixtures now
state/disable the active DDR gate as intended; Signal counts reflect
lane-scaled `minTrail` filtering), and upstream PR #145 supplies the missing
report-page helper. The memguard hard-pressure assertion passes in a
targeted rerun. The former cycle-serialization timeout was traced to the test
running two full portfolio computations for a scheduling-only assertion; the
focused deterministic scheduler regression now passes. The full runtime and
processing suites have not been rerun after that test-scope change. Heavy
concurrent test processes used the shared host; none were killed. The full core
suite was not repeated.

The broad raw script-test command `node --test 'scripts/**/*.test.mjs'` was
stopped by automatic approval review because it could contact BingX endpoints.
It was not retried or routed around the block. The review result does not
establish whether a request was issued before termination; I made no manual
exchange calls or live-execution attempt. Safe focused/UI and guarded offline core tests above pass;
the broad script stage remains unverified pending an approved network-isolated
environment. The saved public market feed is historical and was not rescored;
no new held-out Micro performance, positive profitability, live execution or
deployment claim is established. Do not promote or deploy Relate from these
synthetic tests.

## Break relational indications and realtime refresh

Follow-up branch: `feat/break-micro-short-channel-20261017`; PR
[#155](https://github.com/mxssnx-creator/CTS-A-O/pull/155). PR #153, which
added the initial Break family and live refresh, is merged at
`3a6d67e77b5c730192b1db8dcaa6d4e82ffe03e0`. The exact tested local source
commit for this Micro extension is `f5e50d97199c1c977fe81fdd7077cd6b68cbfdb6` (tree
`b140f5bb2c0dbd63a4b121263a498f56c5f734ed`), based on main
`83585ef6b12c215fa0ee6a0dd2f8cfacba35b6cf` (tree
`d843e839f7bab4992f355576f528cdf9c9673ab8`).

The family has 144 exact identities: 84 standard and 60 Micro. Five sources
(Donchian, squeeze, retest, 8-bar Donchian and 8-bar retest) are crossed with
eligible 1/5/15m trend subsets, independent 24/48-bar drawdown windows and
Guarded/Balanced activity/market profiles. The short-channel sources are
Micro-only; every identity keeps its own fastest selected lane and order key.
Completed higher bars, gap warmup, prior-only channel/volatility features,
symbol/market drawdowns, activity-part/change ratios and market-relative
filters are exercised by the family tests. Break retains its 1.10 return-PF
floor through Base, selection and live eligibility.

Realtime refresh is Break-only by default; explicit `CTS_CORE_FAST_ENTRIES=1`
selects all indication types and `=off` disables the fast path. The 100 ms live
tick checks for a newly closed base bar; the market poll allows 2 seconds for
exchange candle publication. A higher-lane config refreshes only on its own
close. A priority worker rebuilds only selected IDs from a bounded tail and
publishes refreshed tapes to Entries and Overall. Signals older than 15 seconds
are suppressed. This is a code path with timing/freshness tests, not proof of
an authenticated live run; no venue order was sent.

The matched cached-feed replay uses 9 symbols, a six-hour Base-entry window and
a separate six-hour trade window. The unchanged qualification gates are 12
Base closes and return PF ≥ 1.10. The old four-ID Micro set evaluated 20 engine
pairs; the updated 60-ID Micro set evaluated 60. Neither arm had a passing Base
pair or placed any orders. PF and win rate are unavailable, not zero; all six
hourly buckets were flat. Base compute/RSS were 412 ms / 368 MB for the old set
and 1,272 ms / 413 MB for the updated set. Full inputs, settings hashes and
hourly outputs are recorded in
[`simulations/break-micro-live-replay-20261017.md`](simulations/break-micro-live-replay-20261017.md).
The short sample therefore does not meet the request for more orders, higher
PF or positive hourly success; these configs are not performance-qualified.

Verification:

- On exact source `f5e50d9`, the focused Break/Relate/Micro/pipeline bundle
  passes 43/43; Break-only tests pass 8/8; UI tests pass 7/7; realtime timing,
  freshness and tape-helper tests pass 3/3.
- `npm run typecheck -- --pretty false`, `npm run build:dev` and core-worker
  packaging pass. Scoped ESLint has 0 errors and four unused-variable warnings
  in `runtime.server.ts` and `scripts/core-session.mjs`.
- `git diff --check` and `node --check scripts/core-session.mjs` pass.

This is functional and matched-window simulation evidence only. It is not
held-out profitability evidence. No authenticated exchange execution,
deployment or live reload was verified. Full processing/runtime stress and the
venue-contacting broad script suite remain open. Do not promote Break based on
these results.


Validated source diff: `fix: score Break market relations prior-only`, verified locally as `dd5a2e3`. Applied to PR #155 branch `feat/break-micro-short-channel-20261017`. The rolling market beta, volatility and
residual baselines now exclude the bar being scored; a hand-calculated test
checks both z-scores. The hot path also avoids per-config trend Maps and
variadic finite-check arrays. Replay coverage now compares seatable tapes with
kept config sets, excluding held-only position-carry tapes.

The full review is in [`docs/break-review-20261017.md`](break-review-20261017.md).
It includes a matched offline 9-symbol, 24-hour-prehistory/24-hour-trade replay,
hour/config loss diagnosis and two adjacent-window Trailing ablations. The old
4-ID set returned PF 0.174 on 1,593 orders; the updated 60-ID Micro set returned
PF 0.447 on 11,851 orders in the matched window, with net cash −$43.10. The next
day returned PF 0.325 on 31,149 orders. These do not meet the requested positive
PF or hourly-success goals. Only nine real symbol feeds are cached, so a
12-symbol result is unavailable; the busiest replay peaked at 803 MB RSS.

Focused indication/market/Micro/pipeline/range tests pass 97/97; Break-specific
tests pass 9/9. Typecheck, development build and worker packaging pass. Replay
checks pass 55/55 on both traded windows and 53/53 on each Trailing-off run.
The Oct 11–12 no-seat replay placed no orders as expected; its old harness
incorrectly failed because it equated an empty admitted-tape set with zero
symbols processed and demanded active strategy configs. PR #155's reporting
correction fixes this zero-admission path and the primary PF evidence check.
The repeated 9-symbol 6h+6h no-trade comparison now reports PF unavailable and
passes 53/53 consistency checks on both arms. Full hourly details are in
[`docs/simulations/break-postfix-empty-run-20261017.md`](simulations/break-postfix-empty-run-20261017.md).
Source fix: `cae2ec669b2d69ecbeb664d9853715a2dcfb9efb`. Empty samples are
unavailable throughout sim, connection, prehistoric and preset APIs; runtime
logs no longer print 0.00, and no-loss sentinel scores are labeled. The
67/67 focused suite, typecheck and development build with worker packaging pass.
No live execution or deployment was attempted. Keep current strategy defaults;
do not promote from these samples.

## Continuation check — systemwide PF and volume audit

Validated local source commit: `86b018956a3edc995486a4d3489110ffe6fc93ef`;
published PR head: `f93bf39a17aa9d67512509a466ac755a7b3b36d6`. Both have the exact
tested source tree `38a13887ba443a3b310caa512bbadcd3830131b9`, based on merged
main `ad7f603c27abfb1b1df8f2ea3777314847aaa8b9` (PR #141). PR #142 is the
systemwide PF/volume audit fix. The remote backup
`backup/pre-systemwide-pf-audit-20261016` preserves that base before this fix.
The focused offline regression bundle passed **338/338 tests** across 32
suites in 15.4 seconds. `npm run typecheck -- --pretty false` and scoped ESLint
on the three changed source/test files also passed. The tests covered independent
Block relations, .2 ratio and stack cap behavior, accepted-order replay, unit
versus sized PF, cash reconciliation, ownership, the self-audit, and API reports.
Runtime state, autostart, comparison jobs and live execution were disabled; the
offline network guard was active.

The audit found one defect: its plain-close cost check defaulted missing modeled
volume evidence to multiplier 1, even though primary modeled PF correctly marked
that sample unknown. It now uses the canonical modeled-unit return helper,
requires a finite positive multiplier, and checks recorded position volume against
the external multiplier. A regression confirms missing multiplier evidence fails
the check. The statistics type comment now identifies recorded net points as
volume-weighted diagnostics, separate from normalized PF and dollar P&L.

The existing frozen 6h+6h Block study remains the strategy evidence and was not
rescored: 920 base combinations were evaluated per fold; fold 1 had no owned
settled closes; fold 2 had 792 settled slices at return PF 2.3748515, with no
settled PF uplift over Block Off. Two scored hours had PF zero and every native
Signal-activity check failed. This audit-only fix does not alter strategy sizing,
trade selection or the measured outcome. A fresh untouched market window and
authenticated account evidence are not available, so a profitable strategy
change, positive results in every hour, or live execution cannot be claimed.

Fast trading tests now default to six hours of evaluated prehistory plus six
hours of simulated trading; older indicator warmup remains outside the score
window. The existing frozen 6h+6h Block study remains the strategy evidence and
was not rescored on its reused folds: 920 base combinations were evaluated per
fold; fold 1 had no owned settled closes; fold 2 had 792 settled slices at return
PF 2.3748515, with no settled PF uplift over Block Off. Two scored hours had PF
zero and every native Signal-activity check failed. These results do not meet
the requested continuous-positive-hour outcome. A fresh untouched market window
and authenticated account evidence are not available in this workspace, so a
profitable strategy change or live execution claim cannot be verified here.

## 16 October Overall Block and execution correctness release

Current release: [PR #140](https://github.com/mxssnx-creator/CTS-A-O/pull/140).
Latest pushed combined production/test checkpoint:
`08cd452e16b37acac9799450066088ebceaa1314` (CP10), tree
`214927a2683e2ba2e69d8fcd4e6249c72effe71d`, direct parent
`da5fe49058bc721086d207ac4b34e67cab856b32` (CP9), then
`e6914363380599e1f49a837a3a7a835ff9276faf` (CP8). CP8's merge preserves parents
`c6ed5e9275a70f1fd995992f11a19cd9b57bf290` (CP7 direction correction) and
`fc2ec3b3e9e6fe61b55a95fd1ea8802103c564a8` (main PR #139). All seven offline broad/build/core checks pass. Evidence publication is tracked
below; this does not establish a live deployment or financial qualification.
The pre-release main is `0ade0fb2ba22a50e49cf03a9825ea612b4abc30f` (PR #138),
preserved remotely as `backup/pre-overall-block-20261016`.

Work is isolated in `CTS-A-O-block` on `fix/overall-block-relations-20261016`;
the original overlapping checkout is left intact. PR #139 historical study and
verification documents are retained with explicit historical banners. For another
chat, fetch the latest main containing PR #140 and read its final handoff and
standing rules; the final release documentation descends from tested computational
source `08cd452e`. Verify that source identity before changing code or deployment.
This instruction does not describe a completed live reload. Do not overwrite the
other checkout or merge an older overlapping branch over these contracts.
Source checkpoints were pushed regularly. Private credentials/account records
are excluded from Git and public research evidence.
Operational progress/standing rules are also backed up as
`backup/cp10-operations-progress-20261016` at `0d9c75dc4fc5aef62e295a8239468f57e82fe4c0`.
The verification toolchain and exact failed/intermediate source fixtures are
backed up as `backup/cp10-verification-toolchain-20261016` at
`c0e0a153bd80fece234d4f7fa35d150c72265d71` (tree `f2b5b4812126054a2aaa69daf4158f07a93e42c4`),
under `verification/overall-block-20261016/`. The earlier `c7241dde2f610296a7809733f306d6c1a436b1da`
snapshot is its direct parent. All original 17 program/fixture files stay unchanged;
the final standalone report QA harness and packaging wrapper bring the source
manifest to 19 files, plus README/manifest (21 files total). The final report
launch was inline Python, with actual argv/pins/results in its run receipt.
Historical fixtures intentionally include failures; helper paths reflect this
workspace. Both remote backup tips were independently verified when written.
These separate backup refs were created without changing the frozen release
HEAD, working source or default index.
The exact tested CP10 source is also independently retained as
`backup/pre-overall-block-final-20261016` at `08cd452e16b37acac9799450066088ebceaa1314`,
verified by remote ref before the documentation-only final checkpoint.

CP9 corrects completed/error-job rerun eligibility and owns each background
backtest through a controller, absolute deadline and tracked task. Stop, shutdown
and disposal cancel only that runtime's work; canceled worker tasks cannot fall
back locally, publish late results or start queued successors. Shared market reads
can finish for other consumers; canceled owner continuations cannot write caches
or progress. A fresh stopped runtime may backtest; a disposed runtime cannot.
The test tracker cancels and drains before closing the pool. A fresh process
restart is still required; old untracked hot-reload work is not certified.

The queue baseline reproduced three failures; identical tests now pass 7/7.
Lifecycle baseline reproduced six failures; final lifecycle scope passes 10/10.
The final nine-file focused bundle passes 57/57 plus the existing fallback 1/1;
global TypeScript passes and scoped lint has zero errors/three existing warnings.
Its actual before/after inventory is **505 files**. An earlier 510 claim was
corrected in the retained scope erratum; the later canonical 510-file inventory
is a distinct scope and does not establish the earlier window retroactively.
CP9 broad checks passed (455 scripts, eight standard skips; platform 77; lint
zero errors/21 warnings), and stopped-fixture build/UI passed (28 checks, 431
decoded responses, 18 save/reload pairs). Its fresh 20-capture comparison and
independent audit completed without economic defects; no arm qualified both folds.
The 168-file regular core run was deliberately interrupted with exit 130 after a
further preset edit/delete invalidation race was confirmed. It is incomplete;
slow tests never started. Attempt04 preserves the partial run, unchanged 510-file
source/dependencies, zero memory-event deltas and all 40 observed owned process
identities exited. CP10 now selectively invalidates changed or removed derived preset caches and
cancels only their matching calculation. All four active saved-list writers use
the same path; exact immutable settings/WF fences guard both final publications.
Metadata-only changes, unrelated work and research-copy originals remain valid.
The corrected coherent nine-file bundle passes 69/69 plus fallback 1/1, global
TypeScript and scoped lint (zero errors/three existing warnings). Its actual
510-file before/after inventory is unchanged; dependencies match, cgroup-event
deltas are zero and all 11 observed owned identities/wrapper exited.
Fresh release checks run against this frozen CP10 source: broad, early two slow
cases, UI, comparison/audit, then the 168-file regular suite. Both runtime-phase
receipts must match the same source/HEAD/tree; no combined invocation is invented.
CP10 broad checks now pass: 455 script tests/eight standard skips, platform
77/77, full lint zero errors/21 warnings. Source/HEAD/tree and dependencies are
unchanged; all 135 observed owned identities/wrapper exited. Whole concurrent
cgroup max events increased 24,445, with zero OOM/kill/high/low deltas and no
per-process attribution. The next normal production memory gate passed.
The exact two slow cases passed 2/2 in 233.530s (14:43:53–14:47:46 UTC). The
actual two-day, queued-repeat and clamped 30-day preset case passed in 55.25s.
All 510 source hashes/HEAD/tree and dependencies stayed unchanged; slow memory-
event deltas were zero and four observed owned identities plus wrapper/observer
exited. The later 168-file regular suite also passed on the identical source
freeze and dependencies, as recorded below. The untouched execution
pre-phase memory snapshot is authoritative; a standalone launch-named diagnostic
was overwritten by a post-cleanup preflight. Its original bytes were not saved;
separate post-cleanup data and an explicit provenance note preserve that limit.
CP10 build/UI also pass: build 3.25s, 14 checks each in production/development,
433 decoded responses, 18 confirmed save/reload pairs and 26 screenshots. Zero
app/decode errors or drain timeouts; 12 navigation capture gaps and 36 blocked
external requests per mode remain disclosed. All 279 core/UI hashes and
dependencies matched; private servers/ports/browser processes exited. Root
visually inspected four desktop/mobile captures. These stopped synthetic SQLite
fixtures verify presentation and API mechanics; they are not account/venue proof.
The fresh CP10 study completed all 20 captures in 71.046s. Independent audit
reconstructed all 7,200 causal minute points with zero economic defects/missing
marks; owner/proof stay immutable with separate final linkage. Its observed
results match the prior study: return PF 2.3748515218, no settled Block uplift,
Long PF zero, Signal activity zero and no profile qualifies both folds.
The final standard 168-file regular suite completed at 15:30:34 UTC: **1,946
passed, zero failed, two standard opt-in skips and zero cancellations**, 1,948
tests in 323 suites, phase duration 1,838.015s. It started at 14:59:56 UTC after
a uniquely named normal production memory gate passed. All 510 canonical,
expected, before, after and current source maps, HEAD/tree and dependency lock
match the separately executed earlier slow receipt. Dependencies: 423 present,
zero mismatches and 49 absent optional packages. Both phase memory-event deltas
are zero. All 126 observed regular PID/start identities, wrapper and observer
exited; the owned lock is absent and no signals were sent. The actual regular
and slow receipts remain separate; no combined run is invented. Source and HEAD
stayed frozen throughout the tests. All seven offline release checks pass.
The final 16-row functionality matrix independently verifies 80 distinct evidence
hash pairs and 46 current source bindings. The immutable integrated source seal
records that regular verification was pending at seal time; final actual receipts
supplement that historical state without rewriting the seal. Reports and artifact
QA run only after verified cleanup. No earlier result is relabeled CP10.
Existing live preset caches created before these corrections are unverified;
a consistent backup and re-evaluation or selective retirement of derived preset
results is required before live reload. No live cache or execution ledger was
modified in this session. CP8 remains available on remote backup
`backup/pre-backtest-lifecycle-20261016` at exact `e6914363`; CP9 is backed up as
`backup/pre-preset-invalidation-20261016` at exact `da5fe490`.

## Final offline evidence and continuation

The six-file nonprovisional report and both saved deliverables are complete.
The final release documentation changes only `AGENTS.project.md`, this handoff,
`docs/work-tasks.md` and `docs/positive-coordinations.md`; tested computational
source remains `08cd452e16b37acac9799450066088ebceaa1314`. PR #140 records the
final documentation checkpoint and merge identity. A documentation-only commit
is not a new computational test run or a live deployment.

| Saved artifact | Bytes | SHA-256 | Persistent file identity/version |
|---|---:|---|---|
| cts-ao-overall-block-20261016.html | 7,741,448 | `2aeb1cf9717a2d46f04bdc62400a5609c501b6d2d14f589e57890ff6fccd7da8` | `libfile_e50f79b418808191b32b054d9136d14d`, version 0 |
| cts-ao-overall-block-20261016.zip | 186,935,749 | `1581a1f2ab0e9bb6f6d4756184e358028848e6987545695d6fa21eaaef0cd14f` | `libfile_ec0fe486e4a8819186a1606275bd75d3`, version 0 |

Saved file IDs are `file_00000000cbe8820dba186a577589b9c7` and
`file_0000000053cc81f5af4f8813e0d0700f`, respectively. The complete sanitized save receipt is
`cts-overall-block-final-save-complete-20261016.json`, SHA-256
`4180d015a9a938f5c6ec13724d95525e984b458453a45e62672914c236111e90`.
The original ordered save retained a successful HTML and a definitively failed
ZIP transfer. Only the ZIP was retried with identical verified bytes staged in
the active conversation workspace; its prepared save succeeded. Original failure
and successful retry receipts remain preserved. No source/private account data
or screenshots were saved in either deliverable.

Strict final validation passes: 20 comparisons, 120 hourly rows and 5,616 virtual
settled slices (4,752 positive allocations and 864 known zeros). Repeated arms
share opportunities and are not independent market trials. Three embedded CSVs
match their physical bytes. Desktop and mobile each passed six table inventories,
four expandable sections and all three real CSV downloads: six byte-exact
downloads total, zero page/console/request errors, external requests or document
overflow. Root visually inspected both actual overview screenshots. Report
validation SHA-256 is `e410949c2c267c7b3120280756fe63977860ddcf106490cc52b94121af1977c9`;
final standalone QA is `c2109e08ef4fe914fb909b3b14ee94d149b6d25d082d29f11940f1531730ea7d`.
All owned report and browser resources exited before packaging.

The ZIP has **1,799 members**, covering 1,811 logical inputs/1,795 physical inputs,
the current protocol and all eight preserved study attempts plus four historical
core attempts. Public feed deduplication preserves 83,614,640 bytes through exact
manifest mappings. Full input credential scans, streaming copy hashes, every
member CRC, final input fingerprints and the whole ZIP hash pass. Six final report
files and four nested source-free baseline manifests were independently matched
inside the ZIP. Code bodies, dependencies, private databases and screenshots are
excluded; actual verification source is retained on the separate Git backup branch.
Archive manifest SHA-256: `111461354a8b3f29c9a4d9c821c594caf77e615eb5f8d8b8f9a9f48facdef696`.
Packaging receipt SHA-256: `bfb6d414b1bfb3c1159bc208539b5464ff09f64aa87714c0ab855dad8280d564`.
Packaging finished in 517.663s, exit zero. Whole concurrent cgroup max events
rose 34,845, with zero OOM/kill/high/low deltas; this is not process attribution.
All 510 computational source bytes, HEAD/tree and frozen metadata stayed unchanged.

The archived final evidence index is `f82a71b9846643efc0370c24b8b88c3370f0cdc8499c0ca5fb29dfbb5150f676`.
Outer archive/save identities are deliberately recorded after assembly, avoiding
self-hash cycles. A report-launch index was updated before being separately copied;
its exact prior bytes were recovered by reversing the documented record/status
append and matching the already recorded SHA-256. That explicit provenance and
all exact preserved launch metadata are included in the evidence.

All seven offline checks pass; no profile qualifies both research folds, and
settled Block PF/cash equals Off. Actual X02 account/execution PF, live reload,
full 25-symbol background-catalog compute performance and the external rename
remain unverified. Missing live access/resource identity remains a prerequisite,
not a request for another authorization. Preserve protection and take consistent
live backups before any eventual reload; re-evaluate or retire unversioned old
preset caches and restart the process.

Overall learns from settled accepted Real virtual orders before account funding.
Each exact config × symbol × direction, symbol × direction, global direction,
and exact indication/lane × direction keeps independent history and pauses.
Overall source legs share one total cap including base and relation volume.
Shared accepts any qualifying enabled relation and an optional independent
`sharedRatio`; Additive sums valid enabled levels. A positive 0.2 request remains
0.2 even with seven volume steps; larger step requests round down. Six-decimal
recording also rounds down, so tiny additions cannot inflate into a full micro-unit. Defaults for
ratio, steps and cap are unchanged. Current holdings retain their entry Block
multiple; actual confirmed quantity/equity resizing reconciles their protection.

Runtime restoration merges current defaults: persisted settings missing
`historySource` adopt accepted orders. Explicit `real-candidates` preserves the
legacy diagnostic across restart; only direct configs outside runtime default
merging have the unset-field legacy fallback. Neither history is venue-fill
proof. Empty accepted-history Block Active cannot invent a seed or borrow raw
wins; its explicit Signal own-base exception remains.

Native protection now follows confirmed parent quantities, weighted source
shares, one-way funded units, partial fills, cancellation races and refusals.
Provisional stop/TP IDs and residual quantity caps are durably checkpointed
before requests; required state/journal failure blocks new funding. Volume
uses verified selected-account equity and all enabled position/exposure/risk/
backstop/free-margin budgets. Unknown or pending quantities reserve capacity.
Cumulative receipts do not certify independently timed individual fill slices.

The shared worker pool synchronously cancels running calls across module copies,
including a queued successful reply and a reserved-worker handoff. A later ordinary
worker exit cannot inherit an earlier abort reason. This new shared schema requires
a fresh process restart; hot adoption of an older scheduler object is rejected.
The selected connection's missing-key help no longer directs X02 to X01 credentials.

Primary PF removes external Block × coordination weighting once, on the same
funded settled parent-close sample as cash reconciliation. Intrinsic ladder
semantics remain. Duplicate modeled parent closes reject scoring, regardless
of source legs/allocation indices. Unknown ownership/returns/overflow remain
unavailable; known zero allocations stay visible outside funded PF. General
session headlines, groups, hourly counts/returns/hold averages now share that
owned cohort. Virtual requests, episodes and marks are labeled separately.
Confirmed zero fees persist distinctly from unknown/legacy estimates. Live
statistics retain actual close notional even at zero return; cash no-loss
labels require explicit provenance.

The optional `sideGateN` filter now reads its own bounded all-candidate direction
history in simulation, runtime, audit and cached pending entries. Rejected losses
and winning recovery cannot disappear into accepted-only Block history. CP7
passes full regression/audit 93/93, Block 46/46, all 128 processing combinations,
global TypeScript and scoped lint. The seven-failure complete CP6 invocation and
its original stacks remain preserved. The historical CP8 regular verification
passed 1,917 cases with zero failures and two standard opt-in skips. Its separate
slow verification failed in the queued-preset wait; the preserved result is below.
CP9 queue eligibility and disposal fixes passed focused checks; the further CP10
preset-revision repair and current release status are described at the top. Main integration also preserves measured commission across
identical sparse cumulative-fill polls, while changed quantity or price requires
new fee evidence; all four added regression cases pass in the 62-case native focus.
The CP8 trace/rounding focus passed 102/102, global TypeScript and scoped lint.
An earlier 149-case matrix/replay focus is preserved before the narrow rounding
correction. The optional trace includes unknowns in available sample counts and
never changes admission or sizing. Historical CP8 standard core selection was 166
files plus two slow cases, with 508 source/config files. CP9/CP10 use 168 regular
files plus two slow cases and a separate 510-file release inventory.

### Preserved historical comparison on CP8

Ten arms × two six-hour execution windows, each with six hours of evaluated
preparation; older candles initialize indicators only. BTC/ETH/SOL/XRP,
unchanged complete configured focus/exits/cost/capital/settings and causal gates.
Protocol SHA256:
`70d7b62c80a11f1be2971e7873e1560f6c52f3d38c3526fb433ddfc6e553d99d`.
108-file source-set SHA256:
`48c4240a00b0243d2325c8079d36769dfb4bcb040d82c320fac3aa1e3ea4b87a`.
Source-freeze record SHA256:
`55c5470b6f806a7b2d6f0c5754e77a94359380e95b222b945dee3f52770ef906`.
Independent CP8 accounting audit SHA256:
`ca91afe47b7fefec45d7175aaca0c14efa4dc573b17e29cc6cfa1a1342423090`.
Parameter/source summary proof SHA256:
`5e29a2c9cc4f9cf23ce984acfef3cdedf025b21820a32f1f6e8ce6ad8a8accca`.
Final owner manifest SHA256:
`7a6665a76648a260cebe5c160bb9b02576d87326885de5f179d1c89231861945`.

All 20 fresh CP8 captures completed in 69.138s. Exact settings, feeds, folds,
arms and policy match the prior frozen protocol; no outcome-based retuning
occurred. The independent audit recomputed all owned cohorts, groups, hours,
closed/open cash allocations and 7,200 causal minute equity/margin points,
with zero economic defects. Raw CP6 economic identity was observed after
calculation, never required or assumed. This is reused retrospective evidence,
not an untouched holdout or venue execution.

The frozen study has `sideGateN: 0` and `blockTrace: false`; it does not activate
the newly repaired optional direction filter or diagnostic trace. Their enabled
runtime/simulation behavior is verified separately by focused regressions.
The original captured study is retained as attempt03, corrected CP5 comparison
as attempt04, memory-degraded CP6 refusal as attempt05, and the complete prior
CP6 capture as attempt06. Initial preservation manifests remain unchanged;
the later CP6 owner-binding copy has an append-only addendum. Earlier protocols,
raw outcomes, failed checks, incomplete diagnoses, errata and audits remain
retained. No source, memory threshold or strategy gate was waived.

The book is a **modeled $1,000 account**, sized at **2% of equity** with
**10× leverage** and fixed modeled **0.20% round-trip costs**. The research
launcher uses the frozen X01 fallback caps
`maxPositionX: 0.75` and `maxExposureX: 7` where its captured settings lack
positive caps; these are research inputs, not authenticated X02 account limits.
Drawdown measures unrounded model minute-close marked equity, including open
marks. It does not measure the worst intraminute mark or verify tick-level
fills, slippage, funding or liquidation behavior.

All 20 captures failed the native Signal-execution activity check. This study
does not establish active Signal execution or positive independent
Micro/Minimal/Short qualification. Engine/direction aggregate PF cannot
substitute for those missing exact cohorts.

No arm passes both folds. The first window and all Active arms have no owned
closes, hence unavailable PF. In the second window every non-Active arm has
792 funded parent closes (258 losses), 144 zero allocations retained separately,
return PF **2.3748515218**, cash PF **2.2230310512**, closed cash net **+4.41871304**
on the simulated $1,000 book, and exact minute-equity drawdown **2.8716649447%**.
Long direction (+1): 60 closes, all losses, PF **0**. Short direction (−1): 732
closes, PF **5.93804698**. These direction aggregates do not establish the
independent Micro/Minimal/Short range qualifications.
All 792 matched unit returns are identical to Off. Actual Block raises occur on
450 funded closes, but position caps neutralize their funded amounts; incremental
settled PF/cash benefit is zero. Shared 0.2/0.4 saturates the tested 2× cap at
observed levels, so this window cannot establish higher-Shared superiority.

Base computation completes 920/920 requested comparisons, while required range/
type coverage and activity conditions genuinely fail. `grid.allSets` is a mode,
not completion. Empty PF equality remains non-comparable (null serializes
unavailable values), never a manufactured numeric pass. No performance defaults,
promotion thresholds or losing/empty cohorts were changed to obtain success.

### Preserved verification snapshots and CP8 checks

| Check | Status |
|---|---|
| Prior Block relations/ratio/replay snapshot | 77 focused cases pass on their recorded checkpoint; retained historical evidence |
| Prior independent exits and modeled return provenance snapshot | 63 focused cases pass on their recorded checkpoint; final CP8 regular core also passes |
| Prior native quantities/protection/durability/fees snapshot | 167 focused cases pass on their recorded checkpoint; added CP8 sparse-fee focus passes 62/62 |
| Prior reporting/API/UI snapshots | 147 focused cases and 16 session follow-up cases pass on their respective recorded checkpoints |
| Complete scripts, 52 files | 455 pass, 8 standard skips, 0 failures/cancellations |
| Platform/auth/UI helpers, 8 files | 77 pass |
| Final CP8 Block trace/admission and conservative recording | 102 focused cases pass; earlier 149-case pre-quantization matrix/replay scope is retained separately |
| TypeScript | Final CP8 pass |
| Full ESLint | 0 errors, 22 existing warnings; scoped seven-file lint also clean |
| Preserved CP6 worker pool cancellation snapshot, 9 files | 59 tests pass; those pool source hashes remain unchanged in CP8 |
| Statistics property fixture repair | 3 focused tests / 700 cases pass; separate unknown losing-return regression retains cash/count and unavailable PF |
| Final production build | Pass on CP8, exit 0 in 3.16s; 277 source hashes unchanged |
| Stopped synthetic SQLite dev/production desktop/mobile UI fixtures | 14 checks each mode, 427 decoded API responses and 18 save/reload pairs; 0 app/decode errors, 18 navigation capture gaps and 36 blocked external requests per mode retained; selected X02 help verified; private processes stopped |
| Complete regular core, 166 files | 1,917 passed, 0 failed, 2 standard opt-in skips, 0 cancellations in 1,714.146s; all 508 source hashes unchanged; prior complete CP6 failure and CP5 partial failure preserved |
| Separate opt-in runtime slow cases | CP8: 1 passed, 1 failed, 0 skips/cancellations in 1,078.134s; timeout at runtime.test.ts:640 awaiting the queued 25-symbol preset; initial two-day result completed, 30-day assertion not reached |
| Historical comparison capture/accounting audit | All 20 fresh CP8 captured; independent 7,200-minute accounting audit passes; performance policy not met |

Focused counts overlap other suites and must not be added into a monolithic
claim. Checks use before-import nonlocal transport guards, sanitized credentials
and bounded workers; no venue traffic occurs. Original failed script fixtures
and browser setup attempts are preserved. Synthetic PF fixtures explicitly declare their known unit basis. Legacy raw-
bootstrap tests explicitly select candidate history; default accepted-history
checks, all 128 processing combinations and numeric/PF assertions remain. No
assertion, cost, sample or promotion gate was waived.
An invalid PID-namespace RSS trace in one broad wrapper is excluded from process/
memory conclusions; direct known host PID cleanup was separately verified.
The first CP5 complete-scope invocation was interrupted after two statistics
property fixture failures; it is incomplete, not a complete passing suite. Its
507 source hashes stayed unchanged and no OOM/kill occurred. The fixture now
declares multiplier 1 for intentionally unit trades without changing RNG calls
or the original assertions. The separate mixed-legacy case confirms unknown
returns cannot be silently treated as known. Both original failure stacks and
corrected focused results are preserved before the CP6 invocation. That complete
165-file run finished with 1,882 passed, seven failed, two standard opt-in skips
and zero cancellations; slow correctly did not start. Its seven actual causes
were repaired and focused-verified in CP7. The historical CP8 combined-source
regular run passed completely, but its separate slow phase failed. Full attempt03 retains
both raw logs, the actual stack, all 508 unchanged source hashes, exact matching
dependencies, zero memory-event deltas and verified cleanup of 129 owned identities
plus wrapper/observer. No signals were sent. Its failed release-status SHA256 is
`722928b70f12d8b734b00ad5bc3c074992fdb8b65801930b622a7e3d1bfe50c1`.
The fixture waited 600 seconds for a new 25-symbol preset introduced into the
catalog. Separate static and baseline checks found that a completed job ID was
wrongly excluded from later queues, and disposal failed to invalidate its running
backtest or prevent fallback, publication and next-queue work. Those defects were
corrected and focused-verified in CP9. The later preset-revision invalidation
race requires CP10 corrections and fresh release verification. The original
timeout remains a failed attempt; it is never relabeled as a passing workload.
Memory guards stay enabled. The prior CP6 full run initially observed conservative hard
pressure from active file cache, then passed the API contract after capacity
recovered. A later own-file cache hint preserved all 590 files' stat identities;
the bulk recovery had already occurred and is not attributed to that hint.
No source, memory threshold, trading gate or unrelated process changed. A saved
research lock reappeared after a successful unlink; its namespace-local PID is
not process ownership evidence and must never be used to kill a process.

### Live and remaining work

The operator explicitly requests actual x2 VST testing of opening, updating,
closing, protection, volume, statistics and sustained execution. Canonical
connection `bingx-vst-02` uses the VST host, but no usable authentication or
reachable host is available here. The documented live-host/SSH routes return ENETUNREACH on TCP port 22 from
this environment; no exchange API probe was made, and this does not prove
the hosts or venue are down. No venue order, live
reload or account success was verified. Before any authorized live change, take
settings/durable-state and database-supported consistent backups, verify the
actual selected demo account, and reconcile current own holdings/orders.

Open work: obtain authenticated x2 access, perform bounded venue lifecycle and
forward exact-config PF/volume/statistics checks, establish adequate independent
samples in both directions and each requested range/type, and measure future
Block benefit/drawdown without weakening gates. High order count and continuous
positive PF are unproven. The external rename of `imperative-greeting-fox` still
requires its exact deployment resource identity; no guessed resource was renamed.
A metadata-only check of connected Sites/Library/GitHub status surfaces found
no verified matching asset. Available GitHub tools cannot inventory Codespaces
or deployments; the prior Vercel inventory also found no matching project.
Evidence: `cts-block-rename-identity-20261016.json`, SHA256
`55c3cbd1bf2390e713e545bf1ea8cfbe9f2fc9403291bcc08d8583d1ceff2834`.

Historical CP8 UI and comparison results are preserved above; current CP9/CP10
status is at the top. The final evidence archive/report identity and complete
current regular/slow results will be filled after verification. See `docs/work-tasks.md` and `AGENTS.project.md`.

## 15 October post-Base promotion and range continuation — verified source and evidence

Active work is tracked in `docs/work-tasks.md`. Baseline main is `c70cbd25213bd072c341f5e20a8376d63b5ab121` (PR #137), preserved remotely as `backup/pre-promotion-range-20261015`. Implementation branch `fix/post-base-range-promotion-20261015` has [PR #138](https://github.com/mxssnx-creator/CTS-A-O/pull/138). It is not a live deployment.

Checkpoint `eb12239c32f50752b71cd039ebb1ceb851b36124` fixes custom Base/actual range stop and trailing-floor parity, with 79 focused tests and byte-identical shipped defaults. Checkpoint `790e5c292463d5dcae668b61f11ca628e277e07a` replaces range-wide nominal promotion with versioned exact config/symbol/direction evidence. The promoter preserves configured kinds, requires qualified post-Base and owned execution return proof, and retains the execution closes needed to recompute the runtime's actual last-N window. Independent guarded review passed 40 tests, including the pure promoter and strict runtime proof cases. Production runtime/UI/API source is frozen and pushed at `207e2170a9561e877bcc3b177be23bd88fccd365`, tree `4a39adb30b7055c7b36a09a70c2175952c4b1b21`. Focused checks pass: runtime/provenance/schema/readiness 64, Control/Entries fixtures 113, promoter 24, UI/API reporting 54, and an additional API contract fixture. TypeScript passes; focused lint has zero errors. The range comparison, production UI verification and affected integration-fixture corrections are complete; their exact scopes are recorded below.

The audit reproduced duplicate underlying fills inflating sample counts, stale aggregate PF relabeled to another last-N sample, dust allocations, nonfinite cumulative returns, and arithmetic tolerance turning a zero-P&L close into a no-loss win. Corrected paths use canonical net P&L/owned notional arithmetic and exact chronological windows. Reference evidence must not hide newer local losses or unknowns. Nominal `live_lane_trades` attribution cannot establish allocated execution ownership. Frozen UI/API changes distinguish post-Base accepted virtual outcomes before allocation, recorded paper diagnostics, allocated owned paper evidence and verified venue execution. They preserve unknown and losing closes instead of silently backfilling older wins.

The complete range diagnosis is in `docs/range-admission-diagnosis-20261015.md`. In the original six-hour funded replay, Micro return PF is 0.8439145865 on 23,294 settled slices, Minimal is 1.3815196967 on 2,746, and Short has zero funded closes. Positive pooled Minimal performance does not prove an individual config/direction. The three-profile follow-up protocol was frozen before scoring at 08:02:47 UTC, SHA-256 `c3bee5d76710d4de16c135ecae4cbaa5ac419549bd16b0b18134819558460316`. It keeps all gates and costs, uses exact regular/combined 15m IDs with 15/30m support, separates 205-hour indicator warmup from 72-hour evaluated prehistory, and compares two historical six-hour development folds.

The first study invocation preserved six startup failures before any strategy outcome: its launcher serialized a partial nested Micro range while the runtime requires the complete range object. The harness correction sends the full frozen materialized settings, applies production lane normalization (requested support 15/30m; actual base-data lanes 1/15/30m) and verifies exact settings/WF parity on all three stopped runtimes before scoring. Fourteen focused harness tests pass. The exact 32 focused outcome IDs and all 57,344 configured protects remain unchanged; no 1m outcome or gate change was added. Attempt 01, its original seal and all startup logs remain preserved. Attempt 02 ran against `3834804ffae367a0c0a4a7cab1330cf200ff4791`, source SHA `c4b9732334500c9047cd80b15be4cbaf17d964207032aabc27e28a36418ffaeb`, seal `594de3edc7f1d38eade322b4f70901b73b96216900db0d5a828b604416f1ef75`.

All six corrected engine attempts exited zero at full memory level. Three fold-1 cases had no new-entry opportunities and retain failed strategy activity/completeness status; fold 2 retains the failed Short activity check. All 18 failed-check occurrences remain visible. No profile qualified and no outer GET or live promotion occurred. The complete 18-range/864-hour report is `docs/range-study-results-20261015.md`. Short historical Base admission improved 1→3/3→4 pairs with trailing Base cells, and fold-1 configEval passes rose 139→183; execution stayed zero. The two eligible Short opportunities failed prior symbol-side PF 0.7959115653. Fold-2 Micro unit PF was 0.8616866761 for P0/P2 and 0.4904366222 for P1; P1 Minimal was 0.4437584524. Minimal P0/P2 had only 16 no-loss closes, insufficient for the frozen 30-onset rule. No exact config/symbol/direction research cohort has 30 historical onsets. All losses and both directions remain retained; cash PF above one never qualified losing unit PF. Independent reconciliation verified all outcomes, hourly zeros, frozen hashes and causal rejection evidence using less than 68 MiB. The focused 15/30m history reconstruction meets the requested horizons; the mandatory unfocused 1m series has only 66 pre-trade hours and is explicitly disclosed. Physical origins are reconstructed rather than recorded runtime telemetry. Four reporter tests pass. Independently reconciled whole-book fold-2 P0/P2 has 90 funded closes, primary return PF 1.0820357007 versus cash PF 1.3778827443 and net +$1.59559328813. P1 has 112 closes, return PF 0.4801513711 versus cash PF 1.2639199617 and net +$1.21446934408. Whole-book figures cannot qualify an individual range/config or replace the empty first fold. Selection remains NONE. The final reporter supplement is pushed at `a5442158a46268da560cbc175c807350fed4c17f`.

Full-repository lint passes with zero errors and 22 existing warnings. The broader script invocation recorded 414 passes, two functional-browser failures and eight skips. Only Compare's expected numbers were missing because the test inherited `CTS_CORE_COMPARE=0`; explicitly enabling comparisons inside its bounded fixture and waiting for comparison completion then passes all four functional cases. All 416 distinct active script cases are verified across those invocations; do not represent the original run as wholly green. Additional UI unit checks pass 24 cases. Guarded production build and final desktop/mobile QA pass: 11 grouped checks, 94 officially decoded API responses, 14 screenshots, zero app/decode/capture errors and 274 identical core/v2 source hashes from build through QA. Font/Grok requests were blocked and logged. Three scratch-probe mistakes are retained separately. The preview stop wrapper reported the prior PID-namespace mismatch; actual cleanup verified the owning exec ended, its reported host PID was absent and port 8081 refused connections.

The full 163-file core invocation completed in 1,833.51 seconds: **1,772 passed, 32 failed, two opt-in slow-test skips, zero cancelled**. All 242 core TypeScript files were byte-identical throughout; OOM counters did not increase. Twenty-six native-order fixtures supplied no exact settled promotion history, four engine-to-venue cases consequently had no admitted targets, and two SQL assertions ran under the broad wrapper's `CTS_CORE_STATE=off`. These are preserved failures, not a green monolithic run. Corrected guarded native/SQLite fixtures pass **37/37**, the isolated real-SQL resync case passes **1/1**, and final runtime/venue integration passes **7/7**. Only six test files changed after the full run; production source is unchanged. Across the complete invocation and affected reruns, **1,805 distinct current regular core cases** are covered, with two optional slow-test skips. No OOM counter increased.

The first E2E repair explicitly required an actual current paper lane to have sufficient positive exact post-Base history and failed its before hook. That unsuccessful attempt is preserved. The final fixture keeps the real computed runtime/book unchanged and asserts its cold start has zero owned execution history and sends no orders. A separate real CoreRuntime uses clearly declared synthetic settled model trades and independent known-$10-owned-paper history per config/symbol/side to test convergence, protective stops, independent hedges, no churn and ledger reconciliation. Its real readiness and strict promotion methods remain active; the former `requireReady:false` waiver is removed. The negative projection changes both canonical unit returns and sized returns, proving rejection instead of only corrupting cached PF. Synthetic mechanics do not establish profitable market or venue performance. Final E2E source SHA-256 is `f07853c400e81a0b6a4b8e72514a186d978e7bb424f423b6a38572d2e6d3d7e7`; final typecheck/scoped lint pass. Native/SQL fixture checkpoint is `089e6d6848c8d0e6a9ae75f1f2a93285d1779b15`.

Final tested source: **`f873221550c80933ebc7efbc7995ceba4ccead53`**, tree **`429085a0edda103f78c2078e0cc84f0d730503b2`**. Independent final review approved all six fixture repairs and the exact E2E source hash above. The later evidence-record checkpoint changes documentation only. Consult PR #138 for its final merge status/SHA.

Saved evidence: **`cts-ao-post-base-range-evidence-20261015.zip`**, **38,376,641 bytes**, SHA-256 **`b7a7143037ffddce14f2a3243f814cf47a9b0b99965ced62ac28ab17bbe2ef21`**. Saved file identity `libfile_45908e26864c8191a69be441754d7d13`, version `0`. Its 203 members include exact frozen feeds, all 18 range outcomes, 864 hourly cells, complete exact-config/direction and owned-close evidence, both development attempts, the original failed full test run, corrected reruns, final source hashes and successful production UI reports. All CRCs, original evidence sizes/CRCs and relative report links pass; no duplicate members, code trees or screenshots are included. The final verification summary explicitly limits PASS to the software/offline/synthetic scope and keeps strategy selection NONE. An incomplete temporary repack was detected and preserved separately; the verified evidence archive was intact, then repacked and fully checked before saving. No live or private account data is included.

Authenticated live access and the exact external rename target remain unavailable. No live reload, exchange request or order has occurred in this continuation. The prior operator authorization remains valid; do not ask for redundant permission, invent live proof or relax evidence gates.

## 15 October Signals continuation — verified source and evidence

Release branch: `fix/signal-trailing-20261015`, [PR #137](https://github.com/mxssnx-creator/CTS-A-O/pull/137). Tested implementation/report source is `b138428bc6beafe6407048baedf153a6d98f2cea`, tree `164a4ac3dea2481e2035ae3d26f0a0b539ccac57`; the final follow-up changes documentation only. Remote backup `backup/pre-signal-trailing-20261015` preserves main `31b1eebace3a5cab179ee5a61e4d28d58d57c791` (PR #136). Earlier source checkpoints remain in the release branch history. Consult the PR for its exact merge identity.

Signals add nine independent default trailing-only SL × trail sets: SL 1.5/3/6%, activation 0.5/1/2%, step 1, before existing lane scaling. They have `tp: 0`, `trailOnly: true`, kind `trailing-only` and config suffix `|to`; nondefault step is encoded. Normal/capped Trailing IDs remain unchanged. Held-only recovered configs retain exact distances and ratcheted stops through range changes, relative adjustments, worker transfer and restart, but cannot rank or re-enter. A capped Signal's explicit target must not inherit the global engine free-trail setting.

The account audit found desired reductions releasing spendable capacity before actual confirmation. New admission uses actual owned and unresolved quantities, current mark-to-stop risk and verified equity. Legacy Entries now receives the same gross/risk/backstop/free-margin and actual position caps while retaining its documented fixed-unit sizing; the ratio remains Overall-only. Confirmed but never-observed fills remain reserved until visibility or confirmed protective-close deltas reconcile them. Unknown protection/account/price blocks guarded growth while held protection continues.

The remaining Presets/CLI weighted-PF leaks are corrected. Endpoint-inclusive Preset backtest qualification stays endpoint-inclusive and is labeled; settled diagrams have a separate matching sample. New saved/auto/backtest records retain unit/gross/no-loss provenance. Old aggregate-only saved records remain unavailable as primary PF. An old unmarked auto PF cannot reject newer verified unit evidence. Cash curves and raw sized outcomes remain diagnostic.

The six-hour test is frozen to **15 October 00:00–06:00 Europe/Vienna**, with evaluated prehistory **14 October 18:00–00:00**. The original strict 12-hour dataset has 12 × 720 completed 1m bars, no gaps, SHA256 `89585cd14f0bde4c13636d3cd14d489b0762c3fe8b633424ba5205290925f3ae`. Its preserved first attempt produced zero trades/tapes and failed completeness checks: the default longer-lane indicator warmup was unavailable, and a Signals-only engine removed required confirmation candidates. This is an unsuccessful attempt, not evidence of profitable execution.

The revised protocol retains the exact six-hour performance and trading windows and every gate. Cached earlier candles initialize indicators only; replay-only constructor `evaluationFromT` excludes pre-floor entries from Base/tapes/MFE and workers. The default engine confirmation focus is restored, with Signal PF reported separately from the shared system cash book. A pre-floor held book causes an explicit rejection while preserving its existing protection. Revised 12-symbol warmup data has 303,840 valid 1m bars, SHA256 `92940eb92f38db51016280421c6d64ce4944f5e52950b09b3472a66414108a5b`; no further network acquisition was needed.

The second attempt exposed an actual discovery dependency: even with Signal `baseGate:false`, a sparse `DEFAULT_PROTECT` representative blocked every independent protection history. Discovery now calculates every configured initialized pair in that mode; explicit `baseGate:true` retains the representative gates. Typed/config PF, sample, guard, cluster and confirmation gates remain unchanged. Runtime and saved-preset backtests share the same helper. Discovery counts are separate from representative PF-qualified counts.

Final attempt 03 calculated **all 504 Signal pairs and all 19,278 effective protection configs** (19,656 requested). Normal and capped Trailing each have 7,560 effective cells; trailing-only has 4,158. On 1m, existing minimum-trail floors merge nine raw no-TP cells into six effective IDs; the 378 requested aliases remain visible. Independent candidate diagnostics after costs are Normal **17,266 closes/PF 1.152728** (8,759 long/8,507 short), TP+trail **16,365/PF 2.710891** (9,302/7,063), trailing-only **17,393/PF 0.752508** (9,226/8,167). These are unqualified independent tape calculations, not funded execution performance. The active-unit TP+trail subset retained all 20 losing short closes (PF 0.009424), rather than substituting the profitable full candidate pool.

A single capture-only repeat adds **18 type-hour and 288 type/range/lane/direction-hour cells**, retaining empty and unknown samples. Its frozen addendum SHA256 is `ccf887e9d99b1c0bea295c6245d909ea391b8f6a15deec7a37b308891f5a2d89`. Original trades, open positions, tape aggregates, configurations, settings, funnel and all 62 check records match exactly; only reporting fields and wall-clock/timing/memory measurements differ. Candidate partition sums reconcile within 1e-9. The 03:00–04:00 Vienna TP+trail cohort has ten closes and no losses; score 4 is a sentinel, not a measured finite PF.

The frozen replay is **56/62 checks, not an all-green execution result**. Engine ranges sh/gn/lg built zero admitted configs: all 1,008/1,152/1,440 respective grid cells were rejected by unchanged `baseRange` admission. Their three configuration-coverage and three activity checks therefore remain failed. Complete independent Signal history calculation is separate from those engine range admissions. The legacy raw execution check includes seven planned Signal endpoint entries and does not establish funded ownership.

**Funded Signal entries, settled closes and endpoint positions are all zero**, so primary Signal PF is unavailable in every hour/type. Seven planned short endpoint marks are retained separately and had numerical-zero capital allocation. Prehistory PF ≥1.1/minimum-three config-side diagnostics count 0 Normal, 114 TP+trail and 545 trailing-only passes, pooled across symbols; they are not actual Base admissions or exact-symbol activation proof. Do not relax gates or invent trades to claim that both directions executed.

Report-book ownership is determined after uniform USD roundoff normalization. `BOOK_NOTIONAL_EPS_USD=1e-9`, matching existing live monetary-comparison precision, zeros finite nonnegative allocated total notional at or below that tolerance before units/cash/book updates. Raw allocations and the pre-normalization book remain retained. Tiny positive floating cap residues cannot become funded trade counts. No engine, source, PF gate, costs or return was changed by this book-only repair. Final shared owned book: **26,098 settled close slices, return PF 0.9016968601, cash PF 0.7599364745**, net **−$26.63299385**, balance **$973.36700615**, equity **$943.502663**, max equity drawdown approximately **9.4313%**, from $1,000. The 34,054 virtual pre-sizing walk-forward records (PF 0.823968) are a separate diagnostic. Earlier strict-positive/dust ownership counts and PF are superseded.

The four-source Signal research result is withdrawn pending a corrected rerun. Its grid widened some fast-lane trailing configs below `minTrail`; runtime disables those configs after lane scaling. The corrected research runner now matches that behavior and verifies parity against `buildTapes`, yielding 2,320 config-side rows across 1,160 distinct protection configs. The referenced market cache is absent from this checkout, so no corrected PF or selection result is available. Archived performance figures in `docs/signal-research-results-20261015.md` are retained for traceability only and are not verified strategy performance. The four research sources remain default-disabled; this reused cache was retrospective chronological evidence, not an untouched global sample or live proof.

The default core test command and `test-all` now install a portable before-import offline Node transport guard, clear exchange/proxy credentials and propagate guard-first workers, including CJS watchdogs. It is a bounded Node test surface, not an OS sandbox. Failed child status, explicit slow-test policy, coverage/headroom/governor behavior and pinned synthetic dates are preserved; nested test-runner context is cleared. A delayed eval-gate mock now explicitly disables its own memory kill floor while keeping production guards unchanged. Generated `runs/` source snapshots are excluded from ESLint; active source is linted once. Final checks include script tests **396 passed/8 opt-in skipped**, platform **76 passed**, typecheck pass, lint **0 errors/22 existing warnings**, production build pass, and desktop/mobile production UI/SQLite checks (122 decoded API responses, no app/decode/capture errors; independent no-TP/source controls and measured/no-loss/unknown PF verified). External Fonts/Grok requests were blocked for offline QA.

The full 159-file core run finished in 1,663.77 seconds: **1,742 passed, one failed, two opt-in slow-test skips**. All 237 core TypeScript hashes stayed unchanged during that run. The sole failure was a progress fixture assuming its first job completed Paper. A forced memory-aborted first job reproduced that exact assertion; an unpressured original test passed. Production correctly terminated the aborted job and retried. The fixture now uses scoped deterministic memory thresholds, restores the prior environment/cache, and separately tests the real abort/retry path, including no premature compute/Paper publication, full completed stages, monotonicity and final book readiness. Both corrected cases pass. Production memory guards and all trading code remain unchanged. The complete corrected runtime file then passed **27 tests, zero failures and two opt-in skips** in 513.99 seconds, with all 237 hashes unchanged during that rerun. Across the full run and corrected runtime rerun, **1,744 distinct regular core cases are verified**, with two distinct slow-test skips. Only `src/core/server/runtime.test.ts` changed between runs. The original failed full-run evidence is retained; this is not represented as one wholly green monolithic invocation.

Implementation/report checkpoints are `1dd3f9364930afd79ce75616997e851746bd6814` (complete evidence helpers) and `4d73220adf7e4e1d10b725c911254a5ada199229` (exact literal UTC/Vienna workbook labels). The workbook includes a clearly labeled deterministic 3,024-row configuration index; all **38,556** full config-side rows and requested aliases remain in the evidence CSV/JSON. Timestamp export/readback, all 14 workbook reconciliations and all OpenXML parts pass.

Evidence artifacts: `cts-ao-signals-six-hour-20261015.xlsx` (401,901 bytes, SHA256 `350af44945b416e9854a2235bd8918c611caf2f80af8ef56ce30d1c84b6d4761`) and `cts-ao-signals-evidence-20261015.zip` (49,307,793 bytes, SHA256 `ae02c0f41bec0866d62a88dcc326b75321c25e8a835b1614cb180e80ba4dd887`). Both are saved successfully. The ZIP has 143 entries; its manifest verifies all other 142 files by byte count/SHA256, and CRC checks pass. It retains complete/repeated research, frozen public feeds, full six-hour configuration and hourly evidence, prior unsuccessful attempts, original and corrected QA runs, source manifests and a data dictionary. No screenshots, copied engine source trees, environment files or private/live database state are included. Evidence metadata records source `b138428bc6beafe6407048baedf153a6d98f2cea` and PR #137; its merge field is intentionally null because assembly preceded the merge.

Authenticated live host/deployment access and the exact `imperative-greeting-fox` resource identity are still absent. No live reload, external rename, live backup or exchange order has occurred in this continuation. Prior authorizations remain valid; access is the missing prerequisite.

## 15 October continuation — verified source and release record

The operator confirmed **CTS-A-O**. CTS-G's separate replay/checkpoints are outside this task. This release is carried by `fix/report-pf-20261015` and [PR #136](https://github.com/mxssnx-creator/CTS-A-O/pull/136). Its pre-release main is backed up as `backup/pre-report-pf-20261015` at `54b35b08606faff332f4637f889d2a8a2cabce2b` (PR #135). Consult PR #136 for the final merge identity.

The exact tested source is `fdec0ffe9756bee6641d5aa8c5f35c56edc4c932` (tree `d03d640032c4b0f5f3af9a7ca8b788f58a4f9a5c`, 73 changed paths). Production source was frozen at `8ffed441`; the subsequent source checkpoint changes only six existing test fixtures and this handoff. Known synthetic summaries now declare their unit basis; losing-PF assertions remain strict, and the trading E2E uses actual synthetic loss rows rather than corrupting only a cached PF. No production guard was relaxed. Final release changes after this checkpoint are documentation only.

The audit reproduced unit returns +0.8%/-1%, externally multiplied by 2/1, being scored as weighted PF 1.60 instead of primary return PF 0.80. Primary metrics, readiness, paper proof and reports now use explicit unit-return helpers. Direct modeled execution returns remove their recorded external **Block × coordination** multiplier; intrinsic DCA/Axis tape-leg semantics remain part of the config. Stored weighted returns, cash P&L, equity and sizing remain intact. Actual venue return/fee arithmetic is unchanged.

New paper closes persist nullable `unit_r` separately. Legacy rows lack recoverable multipliers and remain unknown; no guessed backfill is allowed. Unknown closes stay in the current chronological last-N/proof/adjustment window, block qualification, and cannot be skipped to select older winners. A complete actual exchange window can supersede paper evidence. Cached pre-upgrade simulation breakdowns are derived from their retained orders; aggregate-only archives without a unit basis expose unavailable primary PF and retain separately labeled sized diagnostics.

Reporting also preserves Tactic's full-indication minimum PF 1.1 and stricter settings, mixed groups' effective threshold ranges, exact hourly close bounds, independent opposite-direction research slots, no-loss provenance and unavailable PF differences. A no-loss score is not an exact finite ratio; unknown history must not hide a recorded loss. The frozen historical 90-day OOS PF 1.117865539 remains research only, with no retuning or promotion.

No live reload or exchange orders occurred. Recorded hosts remain unreachable; no authenticated Tailscale/SSH/deployment route is available. The requested industrial rename of `imperative-greeting-fox` still needs its exact external resource identity.

## Standing accounting and identity contract

The operator requires persistent work, remote backups and regular validated GitHub checkpoints. Read `AGENTS.project.md` when continuing in another chat.

**Return-based PF is primary everywhere:** sum positive net returns divided by absolute sum negative net returns on the same settled owned sample, after costs. Cash PF is a separately labeled reconciliation diagnostic. +1.36% on $100 and -1% on $680 gives return PF 1.36 and cash PF 0.20; comparing them as the same metric is wrong.

Match connection, ownership, settled close slices, partial quantities, costs and time bounds before comparing PF, net or history. Whole-position episodes are a separately labeled diagnostic. Expose the engine's no-loss score convention (`4`) with gross return sums and `noLoss/pfConvention`; do not present a sentinel as an exact measured finite ratio.

An accepted order is not a fill. Journal zero executed quantity and durable request identity before submission. Poll the original ID; explicit zero, partial, stale or malformed replies cannot invent ownership. A known stop loss remains recorded if a later cumulative entry creates unresolved chronology. Preserve its evidence and hold that key rather than silently rewriting history or claiming profit.

Signals retain full source, parameter range, lane, strategy type and protection-config identities. Empty/losing sibling types cannot dilute or qualify another type. Each config still passes its own minimum return-PF gate. A signal onset counts once inside its independent acceptance group; PF includes every settled return slice. Shared direction/account safety coordination remains separate. The 14 Oct operator instruction supersedes older source-wide pooling notes in `docs/positive-coordinations.md`.

**Tactic is a first-class indication type**, distinct from the existing remove-only Tactics entry filters. Trend, pullback, mean reversion, breakout and regime-adaptive techniques each have Short/Medium variants and use the existing independent/combined 1/5/15/30-minute pipeline. Keep their complete config identities. Historical and combined calculations must use completed, valid candles; return-PF qualification is evidence about the sampled past, never a guarantee of future returns.

## Backups and GitHub

Merged release PR #134: main `69347e5cee60c7f6ff5a486999fbe8f3f08d2851`.

Remote source backups:

- `backup/pre-execution-audit-20261014`: `061eedd5accb5f013e9d7f2910fc7222d8794fe8`.
- `backup/pre-fill-reconciliation-20261014`: `69347e5cee60c7f6ff5a486999fbe8f3f08d2851`.

Follow-up: branch `fix/fill-return-pf-20261014`, PR #135. Reporting checkpoint: `c3e84490d5dc83db4dee68d89c77629fd30e7f9a`; execution/Signal/Tactic checkpoint: `ab750d87b88957b83c765642259f4f0118685844`; complete Base-count source: `4c2f814c6c62c100f89d6f2adaf1ff6f7dfffe0f`; production worker packaging/shared scheduling and research: `70186289d371f27579cf14bd0e46000abaa11931`; final reviewed source including safe legacy restart guard: `fe1110d354d75ffa298df8a80a198b97656def0d`. Consult PR #135 for its final merge commit/status. These source backups do not contain a production database or private runtime settings. Back up live settings, durable state and a consistent database snapshot before deploying.

The public research evidence backup is `cts-ao-research-backup-20261014.zip`, 18,070,327 bytes, SHA256 `cd8633a7414d4145c0d004cd7abe57c30dff06cb5368f5a445c1d564081bc3da`. It contains both original public candle caches, frozen protocols/manifests, full reports, repeat metadata and per-file hashes; no credentials or private account records. It was saved separately from source control for future continuation.

## Implemented corrections

- Primary execution reporting and UI use the same settled owned close slices, including partial reductions. History preserves exact identities and latest cumulative orders instead of rounding unsafe venue IDs or summing duplicate cumulative records. Paper/session/coordination outputs explicitly identify their evidence basis.
- Actual quantity, price, fees and pending lifecycle survive crash recovery in both live modes. Pending zero entries cannot adopt unrelated venue positions. Protective closes honor actual zero/partial results. Actual exit timestamps determine history windows. Proven external stop losses are attributed once; ambiguous extra late fills remain explicitly unresolved.
- Account sizing uses verified current account equity; unknown or stale values never become a paper $1,000 live balance. Retry quantities pass risk/margin checks again. Wallet balance, equity, ledger net and reconstructed history remain separately labeled.
- Signal qualification is independent by full range/lane/type; order, paper, lane and stats keys preserve exact configs. Exchange acceptance and simulation agree on onset sample count and settled return PF.
- Signal historical MFE calculations use the existing bounded worker pool with shared causal bars, pair isolation, deterministic merge, held-config preservation, generator fallback and cancellation/memory guards.
- Tactic is registered as an indication family, with the standard Base → Live evaluation path and human labels in settings, presets, configs and statistics. Its calculation recovers after gaps/invalid candles using fresh valid segments.
- Tactic has a minimum return PF of 1.1 throughout Base and subsequent exact-config gates, retaining stricter settings. The actual full saved TP/SL/trail/hold grids are counted separately from representative admission, by full indication/lane/range/strategy, with configured, evaluated, PF-only and all-gate counts. Bounded background chunks use the same causal Base tapes, preserve whole-grid range fitting and release completed history. API reads cached snapshots and displays pending, partial, failure and stale states honestly.
- Existing measured Focus defaults remain intact. The explicit Include Tactic in Base focus action adds all ten Tactic bases to a nonempty Focus, preserves other pairs/pins and enables the kind; an empty Focus already includes all kinds. Settings persist and restore correctly.
- Production builds package a standalone ESM worker beside the server. Worker resolution honors an explicit operator path and otherwise finds that exact build artifact. Nitro module copies share worker queues, priority, abort and watchdog activity; an idle worker can no longer strand another copy's work.
- Upgrading a running old slots-only development pool explicitly requires a process restart. New code rejects the incompatible schema before mutating it, so both old running and separately queued calls finish normally. Fresh production boots and ordinary new-schema module copies share the complete pool state.
- A definite rejected emergency close clears its pending request identity in both entry-stop and stop-repair paths; unknown transport results retain their durable identity for polling. Stress fixtures distinguish definite venue rejection from ambiguous network failure.
- Higher-timeframe aggregation rejects incomplete source buckets and malformed duplicate/non-increasing timestamps. Tail resampling matches the last complete buckets of full resampling.
- Supervisor and monitoring fixes from PR #134 preserve exact process identity, fail closed on process-query failure and respect procfs PID namespaces.

## Preserved earlier verification and focused supplements (not CP10)

The following earlier invocation counts and separately labeled focused supplements
are historical evidence. They do not replace or add to the completed CP10 release
checks at the start of this handoff:

| Check | Result |
| --- | --- |
| Complete scripts | 344 passed, 8 environment/browser skips |
| Platform/authentication/UI helpers | 73 passed |
| Final CP8 Block trace/admission and conservative recording | 102 focused cases pass; earlier 149-case pre-quantization matrix/replay scope is retained separately |
| TypeScript | Final CP8 pass |
| Production build, including packaged worker | Pass |
| Full ESLint | 0 errors, 23 warnings |
| Offline page/viewport QA | 24 checks passed; static/local evidence |
| Runtime/API/SQLite browser fixtures | Desktop/mobile passed; return PF 1.36 versus cash PF 0.20; unknown legacy evidence retains its loss; no-loss differences remain unavailable |
| Bounded Tactic count fixture | 600 evaluated, 37 at PF floor, 36 passing all gates, 1 admitted representative pair |
| Core: all 151 test files, concurrency 1 | 1,653 passed, 4 temporary harness failures, 2 slow-test skips; 1,670.35 seconds |
| Corrected offline harness: all stall-probe tests | 6 passed, including all 4 previously failed cases; production source unchanged |

The complete core run used the normal test files with concurrency reduced to one, one compute worker and Compare disabled. All 228 core TypeScript file hashes remained unchanged during the run; cgroup OOM counters did not increase. Its exit code was 1: four stall-probe workers could not start because the temporary offline wrapper copied unsupported expanded Node test-runner flags into explicit worker arguments. Independent diagnosis captured `ERR_WORKER_INVALID_EXEC_ARGV`. Narrowing only that wrapper's inherited flag allowlist fixed all six probe tests, including the four failures, without source changes or waived assertions. This verifies 1,657 distinct core cases across the complete run and targeted correction; it is not a claim of one wholly green monolithic invocation.

Automatic approval review rejected the unrestricted test/QA process over possible BingX traffic with an unknown payload. Replacement checks omitted exchange credentials and installed a before-import nonlocal transport guard, including explicit CJS preload propagation into workers and Node children. Local proof covered denied HTTP/TLS/TCP/UDP/fetch paths and allowed loopback fixtures. Native exchange connectivity and funded trading were not tested.

The browser accounting checks exercised the actual local API and runtime-backed SQLite with seeded data. The refreshed `seeded-accounting-seroval-verified` report used Seroval's official decoder: measured/no-loss/unknown provenance remained false/true/null respectively, with 42 decoded responses, zero decode/app errors and 16 desktop/mobile screenshots. Two unrelated background response-body capture misses remain recorded; all required samples were captured. Earlier lossy collector reports are preserved and superseded. The Tactic counts are bounded synthetic worker/UI evidence, separate from representative admission and market profitability. Neither check establishes live execution PF.

The raw browser smoke still records the environment's existing Google Fonts/Grok `ERR_EMPTY_RESPONSE` failures; they were not hidden or removed. App assertions and viewport checks passed, and QA processes were stopped.

Live backup, deployment/reload, execution reconciliation and the external rename remain **blocked by unavailable authenticated host access/resource identity**. Before any live change, take settings, durable-state and consistent database backups. Restart the process for the previously documented worker-pool upgrade. Expect legacy unknown paper history to block new qualification until a complete verified current window exists; preserve held-position protection and never waive the PF/proof gates to manufacture readiness.

Keep source checkpoints and this handoff pushed to GitHub. Before any live change, back up settings, durable state and a consistent database snapshot. Never substitute fixture/research PF or a previous release's checks for final source and actual execution verification.

## Research and live deployment limits

Public BingX research data covers eight symbols and 18 closed days. The earlier narrow lean runner covered only 32 of 259 requested combinations, not the full engine. Its held-out 83 closes produced return PF 0.46055 after modeled costs despite IS PF 2.549; it was not promoted. See `docs/research-check-2026-10-14.md`.

Tactic's frozen 1,680-cell comparison separately selects current-default-entry-filter and raw-diagnostic modes on physically truncated IS data, then evaluates OOS. At the operator's PF 1.1 screen, the default-filter IS-qualified pool returns PF 0.661652 across 130 OOS closes; raw returns PF 0.643878 across 102. One preselected default-filter Short breakout/combined-5m member returns PF 1.275618 across 39 OOS closes, while the whole pool is negative. Do not substitute that member after seeing OOS. Research protects are explicitly fixed distances, not lane-scaled runtime grid cells, and portfolio coordination/capital limits are absent. See `docs/tactic-validation.md`.

A separate protocol was frozen before new-symbol performance access: AVAX/LINK/LTC/SUI/NEAR/DOT/ATOM/APT, 90 days, first 60 IS and final 30 OOS, unchanged techniques/grid/cost/modes and PF 1.1/minimum 30 IS screening. Acquisition validated 1,036,800 closed 1m candles without gaps/duplicates. Six default-filter IS-qualified groups produced 910 OOS settled closes at return PF **1.117865539**, or **1.116471777** including seven open marks. The losing 30m medium pullback remains included; neither mode nor pool membership was selected on OOS. All 70 diagnostic default groups together remain negative (PF 0.899959). Raw mode's one preselected group produced PF 1.815373 on only 27 OOS closes, below the 30-close sample screen.

Two full runs produced byte-identical research JSON, SHA256 `5f40353363fd4d6a8f3054a6dbcee33726bfca93b3daca81878b38b95b8a2c3d`; independent review recomputed IS selection from all 1,680 cells and verified protocol/cache/manifests, pooled sums and repeated output. The positive pool has maximum drawdown 186.772 return points versus net +106.424 points, with 561.917 hours of drawdown time. This is a historical new-symbol sample with overlapping dates/correlated markets, not live evidence or independent account ROI. Full runtime gates, funding, actual slippage, account sizing and capital coordination are absent. No live promotion is justified by the pooled research result. See `docs/tactic-validation-independent.md`. No OOS tuning or mode selection is authorized by a desire for positive results.

No exchange credentials or reachable authenticated live route are available in this environment. There is no configured Tailscale client/session, SSH identity or deployment workflow; recorded hosts `152.53.114.112` and `100.105.148.7` are unreachable. No live orders were placed and no reload or live PF-above-1 claim is justified.

The exact external resource `imperative-greeting-fox` was absent from source, connected Sites and connected Vercel name lookups. Its requested industrial rename remains pending an exact resource identity. Do not rename a guessed deployment.

## Fast 6h + 6h release check — 2026-10-16

The offline session uses the cached candle feed through 2026-10-15 04:00 UTC and exactly six evaluated prehistory hours. Signals receive no additional warmup. The feed is historical and was about 38 hours old at the replay; this is a smoke check, not a current-market or profitability claim. Full hourly, per-type, range, lane, sizing and Block-multiplier tables are in [`docs/sims/systemwide-pf-volume-audit-20261016.md`](sims/systemwide-pf-volume-audit-20261016.md).

- 6-hour session: 792 funded closes, Return PF 2.374852, sized-dollar PF diagnostic 2.223031, realized +$4.418713 from $1,000, end equity $1,000.703278, max equity drawdown 2.8717%, and 4/6 positive hours. Long had 60 losing orders; Short had 732 orders at PF 5.938047. The result is not positive in every hour.
- Range coverage: Micro executed 792 closes at PF 2.37. Minimal, Short, General and Long had no executed sets. Signals built 4,914 requested configs but had no active/executed units under the unchanged 24–48h gates. Keep these outcomes empty; do not relax gates using this short sample.
- Volume: ×1 had 342 closes at Return PF 30.806253 / cash PF 31.595471 / +$5.143369. ×1.5–2 had 450 closes at Return PF 1.116727 / cash PF 0.789638 / -$0.724656. The overall 936-close virtual Return PF is 2.578589; funding/caps reduce the owned sample to 792. Volume changes cash outcomes, not unit-return PF on an unchanged cohort.
- The report generator now carries the source mode into saved dumps, labels cached-feed replay accurately in both reports, and marks Signal history as the same minimal evaluated window. The local startup now resolves the repository root, uses the cgroup-bounded memory budget and available CPUs, and keeps the local app synthetic with autostart/live disabled.
- Checks: 383 focused strategy/Block/Signal/promotion tests and 143 balance/sizing tests passed; typecheck also passes after the report changes. The offline session itself completed in 12 seconds; its consistency report is 55/64 because the aforementioned ranges and Signals have no configs/orders in six hours.

GitHub state at this checkpoint: PR #142 is merged into current `main`; there are no open issues. Draft PR #132 remains unrelated and was not merged.

## Signals Coordination (Type) — 2026-10-16

Implementation is on `feat/signals-coordination-20261016` (draft PR [#148](https://github.com/mxssnx-creator/CTS-A-O/pull/148)). The initial implementation added five independent domination thresholds (60%, 65%, 70%, 75%, 80%); the 2026-10-17 expansion documented below extends the set through 100% at 5-point steps. Ratios run independently across enabled source pools and Short-only, Medium-only and combined source parameter inputs. Each source contributes at most one directional vote per bar; conflicting Short/Medium variants abstain, and quiet sources do not dilute the ratio. The default minimum is three active votes. Each threshold/input mix/lane remains a separate indication and strategy-PF identity, with a separate active-unit cap from classic Signals.

Coordinator protection configs are built only for the selected Short, Normal/General and Long exit ranges. Historical signal protection calculations are attached to each available range tag, and open coordinator configs retain their exact lane distances and range tag across range/grid changes. The backtest, worker tape build, realtime fast-entry path, simulation guard, live exchange acceptance, order tracking and statistics all handle the coordinator identity. Exchange client-order IDs retain the selected range letter; persisted config IDs retain the ratio/input/source pool and protect tag.

Verification uses synthetic fixtures only. The runtime smoke built all 15 coordinator pairs for the selected lane and reported 12,960 coordinator range/history configs; none met the active validation gate, so coordinator orders were zero and return PF was 0 (no hourly sample). This is not market evidence and does not show positive results or hourly success. The implementation uses the existing historical-calculation path when runtime candle history is available, but no fresh held-out coordinator replay or live execution check was performed. Do not relax the PF/sample gates based on the synthetic smoke.

Code verification: `npm run typecheck`, `npm run build:dev`, and lint for the new coordinator module/tests passed. Focused signal/statistics tests passed 109/109; range/gating tests passed 38/38; API reporting, execution quantity, and journal tests passed 55/55. The long runtime coordination suite completed successfully, including stop/restart, held-position, order-close and concurrency checks. An earlier combined run had one failure because it had already loaded the old range-floor test fixture before its correction; the corrected range/gating suite passes on a fresh process.

No exchange credentials were used and no live orders were placed. Preserve the existing return-PF and execution-proof requirements before any live promotion.

### Main integration and follow-up verification — 2026-10-17

The Signals Coordination branch now includes current `main` through `b6094a4` (Break and Relate indications). Merge resolution retains the coordination kind and its own worker bucket while keeping the realtime candle-close/mode gate and delay reporting. All three indication kinds have named UI labels and remain registered.

Post-merge checks: `npm run typecheck`, `npm run build:dev`, and `npm run lint` passed (0 lint errors, 21 existing warnings). Focused offline core runs passed 112 cases across 11 files and 399 cases across seven overlapping accounting, execution, statistics, completeness, and coordination files. UI tests passed 11/11; corrected Signal research-grid tests passed 8/8. These runs used the core offline transport guard and fixture data. The monolithic `npm test` was not completed: automatic review had blocked its broad core stage over potential BingX traffic, so it was not retried. The corrected market PF remains unavailable until the missing historical candle cache is restored.

### Offline coordinator OOS replay — 2026-10-17

The exact frozen candle cache was recovered from a sibling workspace and verified against the protocol SHA-256. The coordinator replay scored the default 63-source pool, all 15 ratio × input-mask identities, all three exit ranges, both sides and normal/trailing types on a 36-protection representative sample of the 1,200-protection runtime grid; five IS-validated historic MFE templates yielded 15 range-tagged configs. See [`docs/sims/signals-coordination-trade-sim-20261017.md`](sims/signals-coordination-trade-sim-20261017.md) for the full matrix.

The IS-qualified pool returned OOS unit PF 1.277 on 37,869 overlapping config-side close observations (PF 1.270 including endpoint marks). The all-config OOS diagnostic was negative (PF 0.978); only 277/631 active hours were green (43.9%). This is retrospective, previously reused data and not an account-level portfolio, live order count, execution PF or forward proof. The 8× factor leaves unit PF unchanged and scales both gains and losses; no live promotion or settings change was made from this replay.

The 8-file offline verification rerun after correcting the synthetic history availability assertion passed 422/422; typecheck passed. The history path remains conditional on its matured-entry/PF/drawdown gates, so a synthetic window may correctly produce no historic config.

### Expanded coordinator grid and range-specific historical gates — 2026-10-17

Draft PR [#148](https://github.com/mxssnx-creator/CTS-A-O/pull/148) extends the domination identities through 100% at 5-point intervals (60, 65, 70, 75, 80, 85, 90, 95 and 100). Settings display the complete ratio list. Historic coordinator protection calculations now retain a Short, Normal or Long range tag only when that range independently clears its configured stage PF floor; classic untagged Signal history retains its previous global floor. History calculation calls now pass the same final gates used by runtime settings. The 8× coordinator sizing multiplier and neutral 1× defaults for other combined indication types remain size-only settings; they do not alter unit PF.

The expanded replay used the frozen cache SHA-256 `09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4`, all 1,200 runtime protections, 27 ratio/input-mask identities, both sides, and normal/trailing exits. It scored 64,850 config-side rows including 50 historic sides. The IS-qualified OOS pool was 2,590,578 overlapping independent config-side closes at return PF 1.260086 and +774,087.5 unit-return points; including endpoint marks, PF was 1.256923 and net +766,777. The full unfiltered config pool was weaker at PF 1.013205. Across 720 OOS clock hours, 706 were active, 289 (40.9%) were green; the median active-hour PF was 0.315 and the worst hour returned -133,326.4 points across 28,814 overlapping simulated closes. Per-ratio/mask, range, strategy type, hourly and prior-run comparisons are in [`docs/sims/signals-coordination-trade-sim-20261017-expanded.md`](sims/signals-coordination-trade-sim-20261017-expanded.md).

The runner independently checks the complete grid size, all 27 identities, cache hash, IS/OOS boundaries and exact reproduction of all 1,080 prior standard sample rows (zero count/PF/net mismatches). This is retrospective, overlapping unit-return research; it is neither an account-level portfolio simulation nor live/forward validation. The poor hourly consistency and losing unfiltered pool are retained in the report. Size-only 8× and 22× point figures do not include capital constraints, simultaneous exposure, liquidation, funding or realistic execution and must not be read as account returns. Existing accounting and position-stack tests cover software paths, but this replay does not verify venue fills, account position reconciliation or live orders. No live settings or exchange orders were changed.

Final checks for this update: the focused signal/settings/accounting/position/statistics suites passed 547/547; the Stage/Base evaluation and worker-pool suite passed 53/53; the post-fix historical-range and Stage-consistency rerun passed 17/17. Typecheck and the development Vite/SSR/core-worker build passed. ESLint passed on all changed TypeScript and replay files with no warnings after removing three unused imports in the touched runtime module. The broader `npm run test:core` stage was not launched because the repository's prior automatic review blocked its BingX-capable transport; it was not bypassed or retried.

### Stable coordinator bands v2 — correction — 2026-10-17

This entry supersedes the preceding nine-ratio expansion description. The required configuration is five independent bands across three source-input masks (**15 coordinator identities**): 60–65%, 65–70%, 70–75%, 75–80%, and **80–100%**. The last band includes the full remainder through unanimity. Settings, generated identities, runtime voting, statistics labels and the replay use these five bands. New IDs use v2; old v1 threshold IDs remain readable and are retained only while an existing position needs its original exit tape.

Stage/Base replay selection is range-aware: Short PF ≥1.10, Normal ≥1.12, Long ≥1.18, with the same floor required on settled and endpoint-marked IS returns. The frozen replay covered all 1,200 protections per identity and both directions: **36,032 config sides**, 9,990 IS-qualified sides, and 1,626,887 overlapping qualified OOS closes at PF **1.390** (+705,225.2 unit-return points). Range PFs were Short 1.302, Normal 1.327, Long 1.443; Normal/Trailing PFs were 1.388/1.391. The unfiltered pool was PF 1.005. Only 307/696 active OOS hours were green (44.1%), so hourly success is not established. The earlier v1 positive result is not comparable because v1 used cumulative thresholds. Details: [`signals-coordination-trade-sim-20261017-expanded.md`](sims/signals-coordination-trade-sim-20261017-expanded.md) and [`signals-coordination-stability-v2-20261017.md`](sims/signals-coordination-stability-v2-20261017.md).

Current code checks passed: **75/75** focused signal/coordinator/history/volume tests; TypeScript typecheck; development client + SSR + core-worker build; changed-file ESLint and replay syntax checks. No live exchange orders were sent. The coordinator is marked stable for the verified offline band and accounting behavior; live execution and Exit-strategy market performance remain outside this certification. Future promotion continues to use per-config PF after Base and each range's own gate, and must keep execution PF, order throughput and hourly consistency as separate evidence.

## Break indication audit closure — 2026-10-17

Detailed source-fix replay and hour table: [`simulations/break-post-fix-9x12-20261017.md`](simulations/break-post-fix-9x12-20261017.md).

The indication audit fixed two real defects: market returns now require contiguous per-symbol closes, and market activity restarts its 60-bar warmup after a candle gap; a fresh opposite channel break cancels an older pending Break retest in the other direction. Market drawdown work was moved out of the per-bar inner loop. Break identities route only to their declared anchor lane, and the current lane audit covers Break and Relate.

The repeated corrected 9-symbol 12h-history/12h-trade replay passed 56/56 consistency checks for each matched arm and reproduced the previous result exactly: legacy Break 1,563 orders at return PF 0.342; updated Micro Break 726 orders at return PF 3.272. Updated hourly outcomes remain 3 positive, 6 flat and 3 negative; the 18:00, 19:00 and 23:00 UTC hours remain below PF 1. Thus the hourly-success target is still unmet. The replay uses the previously examined window and does not count as out-of-sample evidence.

The full offline core run traversed 170 test files and reported two stale test expectations. Both were corrected and focused reruns pass: Break/Micro/Relate/lane 38/38; corrected Base/Main processing assertion 1/1; seat/default migration 29/29; empty prehistory 7/7; session PF/accounting 23/23. The 128-toggle matrix passed in the full run. Typecheck, `build:dev` including the packaged core worker, and `git diff --check` pass. The monolithic full suite was not rerun after these test-only corrections; do not report it as wholly green.

## Balance sizing, caps and Signal ranges — 2026-10-17

Correction: the earlier coordination-factor follow-up treated “Stable-02” as a strategy coordinator. It is a branch name. The erroneous independent `s2VolumeFactor` setting and its earlier sweep were removed; existing S2 relation sizing (`s2Increase`) and the separate negative-hour Signal hedge factor remain. See [`the corrected coordination report`](sims/trailing-config-coordination-factors-20261017.md).

The base order unit is 0.2% of realized wallet balance, not a fixed order notional. Engine-range and Signal short/medium volume factors default to neutral 1×. The old Micro factory factor 2.5× migrates to 1× while custom saved factors are retained. Fixed-USD per-position ceilings are retired and ignored. Per-position and gross-exposure ratio budgets default to 0/off; if explicitly enabled, they are multiples of wallet balance, not equity or USD ceilings. Migration clears legacy USD ceilings, disables only the former factory ratio pair, and converts saved fixed/minimum-quantity sizing modes to balance-percent sizing while preserving custom balance ratios and volume factors.

Two adjacent cached-feed 24-hour replays used the same eight symbols, 48 hours of prehistory, $10 start balance, 10× leverage and 0.20% modeled round-trip cost. The interim 0.25× / 2× caps reduced drawdown versus 0.75× / 7× but left the adjacent day negative. A broader same-tape cap sweep selected 0.25× position / 0.75× gross: Oct 13–14 produced 4,861 funded closes, Return PF 1.013, cash PF 1.327, +$0.05343 cash and $10.02288 marked equity; Oct 12–13 produced 25,950 closes, Return PF 0.924, cash PF 1.349, +$0.12277 cash and $10.04716 marked equity. Max equity drawdown was 0.80% / 2.09%, with 12 / 8 / 4 and 8 / 16 / 0 green / red / flat hours. This improves the two sampled equity curves; it does not prove stable PF or positive results every hour. The unit Return PF remains below 1 on the second day.

A 0.05% equity sizing trial and a same-tape 0.6× trial on Minimal, General and Long did not improve both cash outcomes. These ranges remain neutral rather than being tuned on two adjacent windows. Signals were positive in aggregate in the sampled windows, particularly Trailing, while Normal was sparse and losses in engine General/Long and Minimal remain unresolved. Full metrics and the 127/127 replay consistency checks are in [`the balance sizing and cap report`](sims/trailing-balance-sizing-cap-replay-20261017.md). Those results used the then-active caps and do not measure the new uncapped balance-volume default.

A later no-cap sizing replay (`raw-24h.json`, cached four-symbol tape, $10 start, 0.1% balance unit) showed unit-return PF 7.36 and funded cash PF 11.71 across only 18 funded orders; ending marked equity was $9.94, so it did not show net positive equity. The 0.1% base unit is $0.01 before range/coordination factors and venue minimums. Its report's completeness check was 114/115 because the source engine dump records a memory fallback; disabling report-time sizing variants does not repair that source-run gate. This is an offline sizing replay of old recorded trades, not a fresh engine rerun, and is insufficient evidence for high order volume, stable hourly profit or live promotion.

No live orders were placed and no deployment was made. The replay data are retrospective and do not validate live fills, new market regimes or positive performance in every hour/range/configuration.

Verification follow-up: the 169-file core run exercised stage processing, Signal config identity and execution, account sizing, realtime progress, paper/live control, and restart recovery. Its first pass exposed six compatibility regressions: two old migration tests expected schema v26 instead of the current v28, the Settings completeness table omitted the four new cap/Signal-factor leaves, two cap-isolation fixtures inherited the new gross-cap default, and a gate fixture omitted drawdown evidence. Those cases were corrected; focused settings/control/gating checks passed 334/334, legacy migration tests 2/2, and v27→v28 cap migration 1/1. The repeat full `npm run test:core` passed **1,977 tests, 0 failed, 2 skipped, across 325 suites (169 files)**. Typecheck, the development client/SSR/core-worker build, and `git diff --check` passed after the fixes.

Post-restore verification: a repository stash/rebase merge was resolved while retaining the balance changes and mainline reporting fixes. The full core suite was stopped during that merge and has not been rerun end to end. Current checks completed after resolution: TypeScript typecheck; client/SSR/core-worker development build; account sizing and live range-factor tests (13/13); Entries execution tests serially (41/41); v10/v27/v28/v29 migration tests (4/4); balance sizing migration (1/1); isolated runtime self-audit (1/1); Signal discovery (4/4); session PF/CLI checks (2/2); and diff checks. A parallel multi-file test invocation produced post-test SQLite cleanup errors; its Entries suite passed when rerun serially. No live orders were placed.

## Independent config Last-N and short replay — 2026-10-17

The verified source/test/replay tree is `d219f35c96e94393778e7147b4d1d6e2f66a0121` (local commit `badb725540d883af03b601fb37acc25de551dea0`), published as PR #161 head `c499f3230e8fba686cfdbef3db04dcb9efb3b4d0` and merged into `main` as `9295c69e1ae56763cc4b7b65ed30082ed7a4e238` on 2026-10-17. It is based on merged PR #160. A schema-version collision from rebasing onto mainline v28 was corrected: expanded Signal/default migrations now run from v29 through v33, preserve custom saved settings, and keep the mainline v26-v28 migrations intact. Signal protection grids remain exhaustive; full config identities and per-config Last-N gates remain independent across ranges, lanes, types, directions and protection modes. The exchange position ceiling of 100 remains a Symbol+Direction live-stage limit; config/order seats remain independent of it.

Post-rebase verification: `npm run typecheck -- --pretty false` passed. The focused config-independence/history/volume matrix passed 48 tests; the exhaustive Signal discovery/config suites passed 40 tests across 17 suites; return-PF/statistics/reporting tests passed 27/27; and the offline-guarded session-report/qualification suite passed 18/18. These checks cover independent per-config selectors, separate Signal Normal/Trailing qualification, no sibling seat or trade sharing, minimal Signal history, range-specific volume factors, report scope after Base and later gates, PF/volume labeling, and the actual exhaustive grid through workers and local calculations. The full core suite has not been rerun after rebase.

The bounded engine replay is [`the six-hour report`](sims/trailing-systemwide-6h-window-20261017-summary.md), with [`full tables and hourly details`](sims/trailing-systemwide-6h-window-20261017.md). It uses four cached-feed symbols, 6h of evaluated history and 6h simulated (2026-10-14 09:00–15:00 / 15:00–21:00 UTC), config Last-N 25, min return-PF 1.1, and minimal Signal history. The source processed 854 engine config pairs for Base (4 passed), and separately measured 504 Signal representative pairs (2 passed the diagnostic gate, excluded from engine Base totals); Main had 4 pairs and Real had 12 engine configs / 0 Signal configs. The executed post-Base cohort closed 273 orders at Return PF 0.63, sized cash-PF diagnostic 0.93, 0.43% marked-equity max drawdown and 2/6 green hours; engine orders alone were PF 1.40 (241), while Signals were PF 0.10 (32). All 66 report consistency checks passed. This confirms processing and accounting on this window, while showing the desired positive-hour/PF outcome was not achieved. It is a short, previously examined cached-feed sample; do not tune on this same window or treat it as live evidence. No live orders or deployment were made.

## Last-N as-of and tie-order audit — 2026-10-17

The optimizer's reported `gateOpen` is now evaluated from closes settled at or before `nowT`; future closes cannot satisfy the current N sample. An N=0 selection is reported as ungated. Optimizer tape and result ordering now use stable exit-time, entry-time, config, symbol, side and return tie-breaks so simultaneous closes cannot make DDT/gate results depend on worker/input order. Pooled live-group Last-N samples likewise use a stable config/tape-index tie-break at the N cutoff.

Regression checks verify a passing close changes `gateOpen` exactly at its close timestamp, later closes are excluded, simultaneous optimizer inputs produce identical statistics/verdicts under permutation, and pooled live cutoff ties are stable. Both complete affected files passed: pipeline/live-validation 31/31. Typecheck, production build (including SSR/core worker) and `git diff --check` passed. The attempted full core run was stopped while a CPU-heavy book-coverage fixture was still running; its final summary/exit status was unavailable, so it is not counted as a full-suite pass. No market replay or exchange execution was run for this code-only correction; it does not establish higher PF/order volume or live profitability.

## Range-specific PF floors and Base-to-execution rerun — 17 October

Tested source checkpoint: `d561e4b` (`fix: enforce range PF floors through Base eval`).

The configured defaults now apply by Base range: Wide/fallback 1.00, Micro
1.05, Minimal 1.10, Short 1.10, General 1.20 and Long 1.30. `baseSetsMinPf`
only affects untagged Wide/fallback cells; tagged range floors remain active
through Base qualification and set construction. Report scope also separates
the Base-qualified engine execution benchmark from independently qualified
Signal orders and the all-funded combined account.

The matched cached-feed six-hour replay confirms Base passed 4/854 engine
pairs (Micro 1/700 at floor 1.05; Minimal 4/854 at floor 1.10; other configured
ranges passed none). Config evaluation at run start passed 24/376 with pooled
validation PF 6.511 for Micro and 4.578 for Minimal; 12 engine configs were
seated. Engine execution produced 241 settled orders at PF 1.404, including
Micro 168 at 2.152 and Minimal 64 at 0.624. Separate Signals produced 32
orders at PF 0.095; the combined 273-order book was PF 0.634 and 2/6 hours
were green. High pre-execution PF did not persist through every execution
range, so this sample does not support promotion or a profitability claim.
Full report: [range-floor rerun](simulations/trailing-range-floor-rerun-20261017.md).

A funnel-label ambiguity was fixed after inspecting the generated report:
walk-forward hourly config-pass counts may repeat the same config in later
hours, while the 801 run-window total is distinct configs passing at least one
step. The report now labels hourly pass instances and points readers to the
separate run-start 24/376 evaluation and 12 Real seats. The regenerated replay checks passed
66/66; the range/sets subset passed 35/35 and the complete focused bundle passed
73/73; TypeScript typecheck, production build, Node syntax and `git diff --check`
passed. No live orders, settings changes or deployment were made.

## 0.15% cost and positive replay audit — 2026-10-17

The requested 0.15% round-trip cost was tested in a matched full-engine replay
using a desk snapshot (0.05% taker plus 0.025% modeled slippage per side); the
production cost default remains 0.20%. On the same four-symbol 24-hour cached
window, 37-pair focus, 48h prehistory, corrected range floors, coordination,
and 0.75×/7× book caps, the 0.20% run produced 572 closes at Return/base-$1 PF
0.483424, sized-dollar PF 0.600055, −$0.295683, and 7/6/11 green/red/flat
hours. At 0.15%, 1,327 closes produced Return/base-$1 PF 0.712008,
sized-dollar PF 1.391965, +$0.093060, and 11/7/6 hours. Marked equity ended
at $9.961860 with 682 still-open orders marked −$0.131200. Range failures
remain: Short PF 0 (54 closes), General PF 0.003512 (121), Long PF 0 (59).
High Base passage is not carried through those execution cohorts. The 0.15%
replay passed 66/66 consistency checks; focused PF/accounting tests passed
34/34. Full details and the screenshot reconciliation are in
[`simulations/cost-015-and-positive-replay-audit-20261017.md`](simulations/cost-015-and-positive-replay-audit-20261017.md).

The saved older 0.20% positive replay independently reconciles to 2,184 funded
closes, Return/base-$1 PF 4.723109 and sized-dollar PF 2.024519. Its 2,169
engine + 15 Signal closes do not match the screenshot's separate “Signals 43 / PF
51.27” row; the screenshot hour summary also differs from the saved raw dump.
The archived positive result is retained for its own cohort, not treated as
20-symbol or corrected-current-floor proof. The only full-engine cached market
feed available here contains four symbols. A 40-symbol lean 1-minute research
study is not a full-engine 20-symbol substitute. No live settings, live orders,
or production cost defaults changed.
## Expanded 20/22-symbol post-Base study — checkpoint 2026-10-17

Current branch `fix/postbase-expanded-study-20261017`,
[PR #164](https://github.com/mxssnx-creator/CTS-A-O/pull/164); committed
source checkpoint `b1a0e714d268574d5ab5c21d89f1a99279596cf3`.
The [progress checkpoint](simulations/expanded-postbase-progress-20261017.md)
contains the full reproduction recipe, preserved failure and verification
details. The [frozen protocol](simulations/expanded-postbase-protocol-20261017.md)
specifies 20-symbol development and 22-symbol final 24h comparisons, each
with exactly 24h evaluated history, separate 205h indicator warmup, explicit
0.15% modeled cost and unchanged independent PF/sample gates. The 12 new
reclaim8 Break identities are opt-in; the original 60 default Micro IDs remain.

Source corrections separate diagnostic Base construction from genuinely
admitted pair/range identities, preserve their later-stage and Live floors,
and require causal Base even for fixed-focus preset replays. The first
`runs/postbase-dev20-baseline-20261017-v1/baseline-20/` attempt remains
incomplete: a partial-universe calculation hit the memory reserve and
fallback path, then its owned process was interrupted (SIGINT, exit 130).
Its protocol, command, log and `run-result.json` are preserved. Preload and
admission corrections and new sealed replay attempts remain open; no complete
20/22-symbol PF, orders or hourly result is claimed. Do not reuse that failed
attempt as a benchmark or call the source fixes profitability evidence.

The full public archive is saved and verified:
`cts-ao-22-symbol-public-20261017.tar.gz`, 15,868,857 bytes, SHA-256
`252bc0c3c43e66a7e2252450376b3c9cf1f475e11bcee15d79ebf0bdc3589938`.
It contains the 22-symbol feed, 374 raw public pages and acquisition/failure
provenance, with no credentials or private account records. The tracked
[data manifest](simulations/symbols22-data-20261017/README.md) records source
bounds and per-file hashes. The
[prior comparison audit](simulations/prior-comparison-audit-20261017.md)
records the old 336h selection and mixed sizing/cost/cohort differences.

The new read-only review helper and its eight synthetic tests verify
complete four-case envelopes, exact native allocation/unit-return accounting,
hash/settings parity and the prewritten prospective removal rule. Root
typecheck and development build passed; focused source-test evidence and
resolved stale fixtures are listed in the progress report without summing
overlapping runs. No configs have been removed. Complete both 22-symbol cases
before producing an exclusion list; any selected list requires another
prospective replay. No live deployment, reload or venue order was performed.


## Hosted full-audit and v4 replay checkpoint — 2026-10-17

Local source checkpoint `acba877` was published in
[PR #164](https://github.com/mxssnx-creator/CTS-A-O/pull/164) as remote commit
`f75026f0d675e95fdf0a5d94e1de2aadf2f4ccb3`, matching tree
`6909bf864945b0ed36aa4243175ef51bdbd29db1`. The cgroup hierarchy-root scanner
correction preserves unknown-reading rejection and the 4,096MiB admission
floor. The four newly sealed v4 protocols retain exactly the v3 economic
settings, feeds, ordered symbols, warmup, windows, sizing and gates; their
source-manifest SHA-256 is
`bc7216bd7ab6000b7651a5d83054a16887854097a31847e7701b9a92754693f7`.
See `docs/simulations/expanded-postbase-v4-index-20261017.json` for all four
protocol and runtime-settings hashes. No strategy outcome caused this reseal.

The failed hosted launch39076740047 is preserved in commit `b48e7dd` under
[`postbase-ci-interrupted-39076740047`](simulations/postbase-ci-interrupted-39076740047/README.md).
It passed install, typecheck, build and 55 offline script tests, decoded the
fixed public feed and prepared every case, then stopped before scoring on the
root-cgroup reading. It establishes no market PF or execution count.

The replacement
[hosted run39077361130](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077361130),
job `117527184101`, was active at this checkpoint; runtime setup, TypeScript
and the development build were verified. Its workflow requires the complete
178-file core audit and two slow synthetic checks before launching the four
serial offline replays. Those gates, the baseline/reclaim8 comparisons on
20/22 symbols, and the final hourly/exclusion review remain pending; no
current result is claimed. Preserve failure logs if any gate fails, and use
the exact pushed source and newly frozen protocols for any retry.

The public-data archive remains saved and hash-verified:
`cts-ao-22-symbol-public-20261017.tar.gz`, 15,868,857 bytes, SHA-256
`252bc0c3c43e66a7e2252450376b3c9cf1f475e11bcee15d79ebf0bdc3589938`.
The tracked encoded fixture reconstructs source-feed SHA-256
`02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e`.
Finish the hosted checks and complete both final22 cases before selecting any
prospective exclusions. No merge, live deployment/reload or exclusion was
performed; existing PF/sample and own-position protection gates remain.

## Independent Signal history, bounded trailing and X02 verification — 2026-10-20

Local branch `fix/signals-history-matrix-20261020`, code checkpoints `97fc3c6`
and `1a48c89`, plus final feed/fixture correction `025716f`. See [full evidence and reproduction notes](simulations/signals-12sym-20261020.md).
Signals now retain a separate 336h history including actual backfill/warmup,
configurable entry-anchored trailing ceilings up to 3%, and consistent
percent/ATR/historic/DCA/Axis protection identities. Multi-timeframe duplicate
symbol lookup no longer empties own Last-N evidence. Native admission rechecks
current own validation; held legacy positions retain their original ceiling.
APZ reclaim, FRAMA pullback and Supertrend pullback are opt-in research sources,
not enabled production defaults.

The complete 12-symbol main matrix contains 89,578 effective configs and
21,775 settled accepted virtual closes before account funding: PF 0.623875,
9/24 positive hours. The development-selected 3% / 0.5 / Trailing group has
1,758 closes, PF 3.617904; confirmation alone has 603 closes, PF 5.143839 and
9/12 positive hours. These are independent scenarios excluding shared side
acceptance/cluster/Block/engine coordination and funding, not funded portfolio
or venue results. The v5 repeat matches original counts/PF and adds per-symbol
results, individual accepted trades and sorted aggregate diagnostics. Protocol
SHA-256 `06e7c07c929dd1c8ac142065beddcea40ad6ef207becf7011a4c53eda3f9e417`.
The corrected four-lane new-source sweep has 12,549 configs / 3,042 virtual
closes, PF 1.569473; losing and insufficient cells are retained. No universally
positive or every-hour-positive result is claimed.

Typecheck, built worker and desktop/mobile Settings save/reload/bounds checks
pass. Focused source/engine/E2E (58), isolated pipeline (21), context/lane/
completeness/native (396), and corrected Control + cap regression (100) runs
pass; counts overlap. The first full audit and incomplete study attempts are
preserved, never promoted to successful benchmarks. A complete full-audit
retry also remains incomplete: its execution session disappeared without a terminal summary during the server Base-count runtime fixtures (exit code/signal unknown). Known failures were five stale 336h seat-fixture expectations and the missing independent Signal Trailing-only assertion. Corrected reruns pass: seats 30/30, processing 6/6 including all 128 toggle combinations. The later paging correction removes the fixed 20-page ceiling for >480h presets; feed/backfill 21/21, repeated typecheck and worker build pass. The study uses cached candles and retains its exact source manifest separately from this feed-only change. Do not call either broad audit fully green; finish remaining coverage on a stable runner.

Actual `bingx-vst-02` remains inaccessible: credential resolver has no key pair,
and the documented server route timed out. No actual venue order, live reload,
deployment or merge was performed. Git push was automatically rejected for
public code publication without sufficient explicit authorization and was not
bypassed. Code and a reviewable patch are prepared locally; publication still
requires user approval.

## Incremental cycle (`runtime.cycle`)

`settings.runtime = { cycle: "full" | "incremental", heavyEveryBars }` (default "full"; "incremental" is opt-in until it has
run beside a full desk). In "incremental" the heavy compute (Base, Main, tapes, simulated run, Adjust, Audit, Compare)
runs at the first cycle, at every hour boundary (the seats are hourly), every `heavyEveryBars` bars (60) and whenever the
settings, the universe or the auto-adjust change. Between them a light cycle (`status.cycleMode`, phase `Light`) grows
the tail universe by the closed bars, continues the validated set's Normal / Trailing / ATR tapes from a stored
simulation state (`simulateFrom`, `extendTape`), rebuilds the other kinds in the set (DCA, Axis, signals) on the grown
universe, keeps the hour's seats and runs the paper step on the validated tapes. Equality with a full recompute:
`src/core/sim/backtest-resume.test.ts`, `tape-extend.test.ts`, `src/core/server/cycle-incremental.test.ts`.
Profile: `scripts/bench-cycle.mjs`.

## Micro contexts: Node 24 CI crash follow-up — 2026-10-21

PR191 head `e274b11ff714a5f6be9bdffda4b574e809086227` passed types,
lint/build and 3,130 core cases but the pool cancellation test process aborted
inside V8 WASM code GC (not a trading assertion); two cases were skipped and
the slow CI step was consequently not run. Preserve the actual failure in
`docs/negative-hour-contexts-20261021/ci-node24-failure-e274.txt`.
The bounded core test child now runs Node24 with `--no-wasm-code-gc`, matching
the upstream runtime workaround (https://github.com/nodejs/node/issues/66366).
The real-spawn runner contract passes 4/4 and related cancellation/ownership/
priority/memory/module-copy tests pass 22/22. Production worker settings,
trading formulas, PF gates and economic source seal `15bee9d6359df10deefc71f511eba0604f2dacb674c9303add46a08ccc0cb4dc`
are unchanged. A new complete hosted run is required before merging PR191.
The repaired production source already passed both slow cases locally.

Training scope clarification: the older v4 training Micro winners used a
60-minute maximum hold. They are not proof of Micro15 profitability. The
frozen new comparison uses actual Micro15 cells and remains PF0.809978 original
versus PF0.452602 expanded. Its losing-hour posthoc diagnostic contains zero
net-positive Micro15 config-sides in either arm over their respective losing
portfolio hours. Keep longer-range positive subsets separately labeled; no
post-validation tuning, venue order, reload or deployment has occurred.


## Micro contexts: final verified merge — 2026-10-21

PR191 is merged as e287e234b4b99022db0f1e04e0d38ace1695d225. Its tree
102f8521873def2020d8a34436b198f980d60475 exactly matches fully verified
head8a8c364728dc574cc4bebbdbc9a8ee2c1440d698. Exit workflow39556680253
and Signal workflow39556680375 succeed. Default suite:690 script cases
passed/8 skipped,83 app cases passed,3132 core cases passed/2 slow skips;
both slow cases then passed separately. Types/lint0errors/app+worker build
pass. Keep all prior failing receipts and the explicit Node24 test workaround.

Final source15bee repeats the same funded modeled outcomes: original15607/
PF0.809978, expanded37581/PF0.452602. All2298898 candidate tuples and all
53188 funded fields match initial frozen data. Complete independent221268
hourly decisions and every entry own-direction qualification have zero errors.
112 additional context IDs preserve all original434 Micro recipes exactly.
General/Minimal/Short positive subgroups are posthoc diagnostics, not proven
Micro15 winners. Older training used60min hold. Actual Micro15: original144/
PF0, expanded2811/PF0.002830. In each arm's negative hours there are zero
positive Micro config-sides, including per-hour grouping. Expanded2607 losses
share only18 symbol/side/onsets and lose even before fixed costs. Do not call
this a high-PF release or promote a posthoc subset as a new holdout.

See docs/negative-hour-contexts-20261021/README.md, final-verification.json,
full negative-hour diagnostics and cost decomposition. Final evidence archive
includes verified receipts, source checkpoint mapping and honest primary-data
404 status. Code source seal15bee9d6359df10deefc71f511eba0604f2dacb674c9303add46a08ccc0cb4dc
is unchanged by the report-only follow-up. No venue execution, reload or
deployment was performed. Pre-upgrade cached preset/live evidence still needs
its own exact settings/source provenance check and backups before a live reload.

## Signal evaluator performance — 2026-10-21

Code commit `03eeeb18a7689b9384f8925c8da725f5f940b43f` optimizes the repeated
Signal config evaluator. It computes the identical cache key once per config
instead of once per symbol/direction and removes intermediate context
collection arrays. Economic calculations, PF gates, direction identity,
336-hour Signal history and Last-N evidence are unchanged. Exact benchmark and
limits: [performance report](performance-20261021/README.md).

Three paired runs of 2,000 configs × 12 symbols × 2 directions × 5 passes
reduced median warm time from 706.89 to 528.54 ms (25.2%) and the highest
observed process RSS from 424.14 to 387.66 MiB (8.6%). All 10,000 verdicts and
240,000 contexts match the parent's output hash exactly. These are synthetic
Signal-evaluation measurements, not system-wide cycle or profitability proof.

Local core regression: 146/146 passed across the eight source, history,
publication, incremental, validation-memory and selection-index tests listed
in the report. The workspace's `node_modules` link target is absent, so local
`tsc` was unavailable; hosted GitHub checks must pass before merge. No live
reload, deployment or venue order was performed. The end-to-end cold-compute
probe exceeded its diagnostic time budget; do not claim a full-cycle latency
improvement from this targeted change.

## Signals range, historic Exit, and state/worker performance — 2026-10-21

Work started from `main` at `a0c5604294192833c1a54802ad29d5066af40ec0`.
Validated source commit: `ae44fa7f47dc3361ad2e18e9f55a661ca9e2eab3`.
Signals now has its own `rangeOpts.sig` validation and entry Last-N controls;
Signal Exit configs keep exact source identities, use Signal history/filter and
trailing limits, pass a separate Exit Base evaluation, and build on the Signal
universe. Exit configs remain outside the Normal/Trailing active ranking cap.
Signal historic fitting prepares each source's filtered, causal bars and
direction views once, then reuses them for every protection candidate, retaining
the existing sample, ordering and PF/DDR/Last-N rules. Durable in-memory SQLite
state flushes now read serialized values in one indexed query and avoid parsing
and rebuilding large JSON caches. The bounded shared worker pool's existing
memory admission, priority, owner cancellation, timeout and OOM handling were
audited and exercised; live ownership checkpoints remain synchronous and
atomic before conditional orders can proceed.

Local validation on this source tree: `npm run typecheck`; `npm run build:dev`
(including the packaged production worker); 203 focused core cases across 21
suites; plus the packaged-worker Signal Exit filter/cap parity case (1/1),
`git diff --check`, and changed-file ESLint (0 errors, 5 existing warnings).
The focused regression set covers durable-state restart/snapshot restore,
Signal local/worker history parity, Exit Base parity, worker cancellation,
memory/ownership/priority/shared arenas, incremental/full-cycle parity and
atomic compute publication. The complete hosted suite is still required before
merge. The broad Prettier check reports pre-existing formatting differences in
the large runtime file; no whole-file reformat was applied. Exact source commit,
hosted checks, merge and branch reload are pending. No live instance reload,
deployment or venue order has been performed; a running-instance change still
requires the consistent settings/state/database backup above.

## Signals 12h simulation and throughput check — 2026-10-21

Validated code commit: `9c0fa4e527ed6739064dd98e28b51c26845803cd`.
The measured raw run is sealed to source SHA `d8140d72eca7b2d727e8325753ae34af05b0d570cb6b47f8bf4cbbcdfe98e9bc`;
the later report-only source SHA and the exact changed file are recorded in its
run manifest. No `src/core` economic code changed between the measured run and
the final report fix.

Two frozen runs used the same 12-symbol BingX 1m feed, 20 Oct 12:00–21 Oct
00:00 UTC trade window, $10 paper balance, 10× leverage, 0.1% equity sizing,
and unchanged Signal/Exit gates. The full 336h Signal and 168h Exit history
requirements were not reduced. Detailed result and phase timings:
[`docs/sims/signals-12h-20261021/RESULTS.md`](sims/signals-12h-20261021/RESULTS.md)
and its [frozen run manifest](sims/signals-12h-20261021/run-manifest.json).

The 48h local feed provided 24h of evaluated prehistory plus 12h of
indicator-only warm-up. Signal therefore lacked 312h of its configured history;
Exit lacked 144h. Of 380 configured Signal source/range/lane pairs, 285 reached
Base; the missing 95 were 30m lanes because 48h yields 96 bars per symbol,
below `makeUniverse`'s 120-bar minimum. The Signals Base range evaluated 285
pairs and 3 passed its representative gate. Signal historic processing had
285 insufficient-entry pairs and qualified none. Strategies Exit evaluated
285 pairs at its separate Base pass; 20 passed and all 20 lacked sufficient
historic entries. There were no selected configs, simulated orders, or measured
PF. The coverage check correctly remains failed (570/665 evaluations) until a
continuous 15-day 1m feed for the same symbols is available.

Two workers reduced compute from 106.512s to 87.852s (17.5%) with an identical
325,911-row tape checksum. Main-process peak RSS increased from 1,807 to
2,279MB. The cgroup peak observed after the two-worker run was 7.06GiB of 8GiB,
including reclaimable file cache, with no OOM events. Loop p99 rose from 40.5
to 54.1ms and slices over 40ms from 10 to 22; the test does not justify changing
the production worker default. Largest compute phases were Signal coordination
tapes, simulation, Signal history and Base. DB persistence phases remained under
10ms in the one-worker baseline.

Report fixes now count the separate Signal Exit Base pass and include Signal in
the indication-kind coverage check; gzip feeds are replayed directly, and
reports distinguish evaluated Signal history from general prehistory and
indicator warm-up. Validation: 44/44 focused session/feed/study tests,
`npm run typecheck`, changed-file ESLint (0 errors, 3 existing unused-variable
warnings), and `git diff --check`. The exact two-worker run was validated against
its frozen feed, symbol universe, window and source before the final
report-only coverage-kind adjustment. No runtime deployment or live reload was
performed; the full 15-day feed remains required for a complete evaluation.

## Hourly evaluation consistency — 2026-10-23

From `5a6285ecd5c10ff3743e621670e8831f559f611f`, repaired the initial validated
pool's pooled-direction/short-Signal-history calculation, Signal Exit cache
policy invalidation and future closes in the multi-window evaluator. Signal
evaluation also avoids allocating/sorting intermediate history Trade objects.
Details: [hourly evaluation report](hourly-evaluation-20261023/README.md).

Initial 13 regressions fail on the parent and pass after repair; the expanded
gate matrix passes 237/237 and selection-index checks 6/6. The initial TypeScript
check passes. Runtime source seal is
`f6befe08a4096687d33a469cc92a8abb65a38d2b2ffe5026a42849e59537de0e`.
Full release checks and the recovered 397h-feed Signals/Exit replay remain in
progress. No live deployment, database/settings change or venue order occurred.
Do not certify stable hourly profitability from this correctness checkpoint.


### 2026-10-23 — requested Signal 100h / Last-8 checkpoint

Operator supersedes 336h Signal and Last-25/Exit Last-12 defaults: Signal and Exit fitting now default to 100h, evaluation Last-8; one-minute source data, independent identities, PF/cost floors and full configured grids retained. Signal lane loading is bounded separately from ordinary retention on full/local/worker/incremental/preset paths, including Signal Base. One-time saved settings/preset migration keeps a backup and custom settings. MFE extrema extraction has exact scalar parity with linear-time queues. See `docs/hourly-evaluation-20261023/README.md` and `scripts/perf/signal-history-bench.ts`. 336h baseline aborted at Real for memory; no completed profit claim. 100h replay/release gates pending.

One-minute warmup refinement: keep derived lanes' common warmup (shrinking it changed recursive Signal decisions); trim only the 1m base lane to its own warmup +100h + simulation. All 9,963,600 entries across all12 symbols/380 configured combinations match the original warmup on the retained study window. Focused lane/runtime/preset tests69/69 pass; research preflight tests24/24 pass. Full suite pending; local UI test lacks the Playwright Chromium executable. CI's production app/worker build and targeted checks passed on the prior checkpoint, while the full workflow is still installing Chromium dependencies.


### Bounded Signal simulation and capacity checkpoint, 23 October

The isolated 12-symbol replay at source `68472702d84eab8a8d2e249fcde4a320a75c9bc1200f916b3f28d70176122193` completed historic preparation in approximately 260 seconds, then exhausted the 4096 MB V8 heap around 294 seconds in Real. This is a failed run, not PF evidence. Host RAM alone did not detect the separate heap ceiling.

The next checkpoint registers immutable acceptance tapes without expanding every config/symbol/direction prefix. Requested groups use an LRU bounded to 4096 groups / 32 MiB; eviction reconstructs from full evidence. Signal candidate indices use four bytes per row, and full candidate objects are assembled and released in one-minute batches. Workers and shared input references are retired before an explicit phase-boundary collection. The memory guard also checks V8 heap headroom.

Eight identical-tape, 12-hour before/after comparisons preserve the entire result (orders, open marks, candidate counts, skips, validations, feed and hourly summaries), at selection cadences of 1/60, 1/4, 1 and 3 hours, both static and ranked activation. Each has 4944 candidates / 2880 settled modeled orders; these synthetic outcomes are correctness fixtures. Small-fixture timings include cache/batching overhead and are not an end-to-end speedup claim. Targeted correctness/publication/memory checks: 195/195 pass.

Raised configurable ceilings: engine grid 20,000→100,000; Signal/coordination positive count cap 2000→10,000 (zero still unlimited); trailing-only grid 64→256; ATR grid 600→2400; historic grid 200→1000; Exit configs/source 128→512. Accepted Signal list values are retained up to the validator's 64-value limit instead of silently discarding values after eight. Trading costs, PF gates, configured default counts and account exposure settings are unchanged.

Hourly means reporting/consistency aggregation. OHLCV and entry/exit calculations remain minute based. Existing configurable background selection cadence remains separate from the causal gate checked at each entry timestamp. No artificial hourly profit/count monotonicity is imposed. The synthetic lifecycle test's unconditional positive terminal activation failed before these memory changes too; it now verifies the measured exact terminal activation, while deterministic positive/losing gate fixtures remain. Full market replay and release verification are pending.


### Multi-lane acceptance fallback repair

The first bounded-cache replay still failed at ~295 seconds / 4 GiB V8 heap. Profiling localized expansion to acceptance-index initialization. The production tape symbol dictionary repeats symbols across initialized lanes; the former unique-symbol precondition routed every such tape to the eager generic path. Canonical symbol slots now aggregate aliases in original close order, allowing the lazy path without dropping any return or onset. Duplicate-config and unordered-input fallbacks remain. Identity maps also reuse existing config strings. Between-slice heap checks bypass the one-second cached reading near the V8 limit.

39 targeted tests pass, including exact scalar alias aggregation, immutable incremental generations, memory checks, atomic publication and the complete candidate-lifetime snapshot. The earlier CI completed 3313 core cases with only one failing fixture: its archived 336h history was implicit and inherited the new 100h default. Pinning the archived 336h input yields the exact same 42 settled orders, 48 feed entries and full-result hash on parent 5a6285e and current code (`b88ca89d72f1217210603fb4aefa109920107fbfadd991a035cb8746f7629693`). No snapshot output was suppressed. A fresh isolated replay is required after this repair.


### Engine completion and report preflight

The alias-aware engine completed the full frozen 12h interval in 378,285 ms (121,440 unique config tapes, 6,202,813 historical closes); final paper selection had 98 configs. Approximate observed peak RSS was 4.04 GB, with V8 heap generally around 2 GB through Real. Report validation then rejected a launcher mismatch: the protocol used equityPct 0.001 while the report CLI default was 0.002. No funded PF/report from this run is certified. Report account settings now fail preflight before history calculation and are rechecked for render overrides.

This Signals-only fixture had all engine kinds disabled but retained the independent `coord.confirm` engine-confirmation switch, so its modeled execution sample was empty. The next study explicitly freezes that switch off to exercise the operator-requested standalone Signals/Exit path; no runtime confirmation behavior, cost, PF gate, historic sample or Last-N threshold is waived or silently changed. The launcher explicitly supplies `--pct 0.001`.


### Completed 12h replay and full-catalog arithmetic audit

The enabled standalone study used the frozen 12-symbol feed from 17 October, 09:00–21:00 UTC, 100h evaluation, Last-8 Signal validation, unchanged costs/PF/sample gates, independent Strategy Exit, and 1m execution. All 19 ordinary engine indication kinds remained disabled. Engine confirmation was explicitly disabled and Trailing execution enabled. The preceding run's 16 candidates were rejected by `sig:toggle`, not by a math or confirmation failure; it is preserved with its empty results.

Engine computation completed in **373,431 ms (6m 13s)**, peak recorded RSS **4051 MB**, no memory fallback or abort. The catalog retained **121,440 config tapes / 6,202,813 historical closes**. Event-loop p99 was 34.24 ms, worst observed pause 1327.50 ms; this is cold history/research throughput, not a guaranteed live tick deadline.

The native report and funded/hourly audit pass **58/58 checks**. There are **16 open modeled orders (one ADA short position), zero settled closes**, endpoint MTM **-$0.01784219**, ending modeled equity **$9.98215781** from $10. Settled PF is unavailable. The engine's old PF 0 / n 16 log included endpoint marks; compute status/log text now explicitly discloses that scope. This label-only followup does not change any calculation. The replay was sealed at source 6a81578275a64ed0ef43d48d133709023e94cd54987aff9e2f4c5c6b34a1c070, before that wording change. No positive forward PF claim is established.

The streaming arithmetic audit checked **26,055,133** exact config × symbol × direction windows at 13 hour boundaries across all 121,440 tapes, with **24,050,892** incoming-minus-expired conservation checks. Counts, gross returns, net and PF match the independent scalar arithmetic throughout. It took **67.51s**, sampled peak RSS **338.15 MB**. These checks cover raw window arithmetic; gate verdicts have the separate regression suite, and funded execution remains the native report's cohort. Falling qualified counts can reflect newly settled/expired evidence, and are not forced to be monotonic.

Strategy Exit processed all 380 Signal sources: 17 passed its Base stage, 24 protect candidates were evaluated, 7 failed PF and 17 failed green-hour share; none qualified in this sample. All losses and empty/insufficient cells remain visible. Reproduce the arithmetic audit with `node --experimental-strip-types --no-warnings scripts/perf/signal-window-audit.mjs REPLAY_DIRECTORY` at the sealed source. The compact measurements and hourly evidence are in `signals-memory-replay.json`.

Release CI now partitions the complete core inventory across four isolated runners with serial file execution, while script/browser/app checks and the two slow runtime cases run in separate jobs. The final `verify` requires every partition. The default local `npm test` still runs everything. A real seven-file/four-shard fixture verifies no omissions or duplication; all six runner tests and changed-script lint pass.

The exact tested source is preserved remotely at `ea262bb7af0a4fe5e0d571df688e54090056051a` (tree-identical to local checkpoint `59f1b6d`). Final TypeScript validation passes after the log wording correction.


### 25 October 2026 UTC — Exit timeframe/partial ownership verification

See docs/exit-policy-study-20261025/README.md and compact control-0 receipts. Signal study run 40192523659 has first control-0 successful (overall PF 4.96115, 445/366/79 opened/settled/held orders; 14/6/8 positions); other three scenarios still running at this checkpoint. Normal 38,402-source-combination matrices 40190814481 (former Axis sizing) and 40192176159 (neutral) remain running separately. Do not conflate policies or promote unverified fits.

Added 12 native Exit allocation lifecycle cases and all-five-set/both-side/1/5/15m simulation-tick-restart parity. Partial ownership is per-config allocation, not new intraconfig fractional exits. Two f526 CI fixture failures corrected without changing archived economic receipts or lifecycle hashes; focused six regressions pass. Exit study is now manual-only so future PR pushes do not repeat the expensive four-case study. Final follow-up CI still required. No merge or live reload at this checkpoint.


Signal study 40192523659 now completed all four scenarios successfully, with native/coverage/execution/admission audits passing. Complete comparison in docs/exit-policy-study-20261025/RESULTS.md: control Exit 7 wins / 0 losses in each window, but only trailing-only has settled evidence. Expanded Exit PF .042319/.225969, not promoted; whole-account later-window PF .067947/.089809. Details preserve all opened/settled/held order and position counts and hourly evidence, with no-loss PF labeled explicitly. Check follow-up CI 40193554626 on 0d78f37; browser/quality and slow runtime already pass. Ordinary matrices remain running.


### 25 October 2026 — expanded Exit cost-aware locks and chronological qualification

Operator asks to improve Expanded types and always show PF with neutral 1. Cost-aware Exit locks now capture modeled round-trip cost at entry: price breakeven no longer knowingly locks a modeled fee loss, adaptive locks cover cost after enough favorable movement. Persisted legacy states without cost retain their old contract; rebuilt/new states capture the active configured cost. Simulation, tick and restart parity covers all five tactics, 1/5/15m, both sides and costs 0/.0015/.002. Optional Exit validationSlices (1–4, omitted=1) requires every chronological held-out slice to meet the existing sample/PF/DDR gates, exposed in Settings. No production sample/PF gate weakened.

81 focused tests pass. Prior final CI325 failed only the relation-source scan: the new isolated lifecycle fixture read all settlement rows without its required explanatory marker. Added the exact all-rows-fixture rationale; relation tests pass. Fresh five-case study compares expanded cost-only and two-slice variants at original/later windows, plus two-slice at an earlier 12h window. Scripts/prepare-expanded-exit-cost-study.mjs seals policy before observation. New workflow expanded-exit-cost-study.yml has an initial PR trigger: change it to manual-only before a later push to avoid repeated costly runs. Baseline expanded Exit PF .042319/.225969; no new financial result yet. Pushed fixes are not a positive-performance claim.


Expanded follow-up: bb7c7cc cost/stability study run 40195897281 is running five cases, CI40195897166. Subsequent review found exact modeled net-breakeven could have signed floating-point residuals. Shared modeledPriceReturn now removes only cancellation noise within four machine-epsilon units, preserving losses/gains at 1e-10 and above; backtest close/MTM and runtime tick use the same helper. Verify source-specific results: the first cost-study cannot certify this later economic correction. A separate expanded-exit-net-study.yml repeats all five declared cases on corrected source; disable its initial PR trigger before the next push. Owned cost is retained across newer recalculations without loosening stops. Report generator now prints PF1 neutral, infinity only for positive zero-loss samples, and Vienna time labels. No new positive PF result has been established yet.


Expanded diagnostic round 3: intermediate bb7c7cc results remain losing (cost-12 Exit PF .195735, 53/50/3 orders and 10/7/3 positions; slices-0 Exit PF0, 20/19/1 orders and 1/0/1 positions). These precede exact-zero correction; no default promotion. Corrected five-case net study40196687465 on65f58ca is running. Baseline loss attribution: expanded-0 has45 losing time closes; expanded-12 has12 long SL closes contributing .3213 of .342477 gross unit losses. Next frozen tests use existing causal Signal/Exit EMA direction filter1h and3h across -12/0/+12h windows, unchanged PF/sample/cost gates and full Expanded fits. This is a declared diagnostic parameter comparison, not fresh out-of-sample proof. New workflow expanded-exit-trend-study.yml needs its one-time PR trigger removed on a subsequent push. No financial result for it yet.

Summary generation now skips reading multi-GB historical tapes when the initial validation catalog is absent (coverage comes from the independent archived audit). Exact reconstructed funded summary parity against control-0 passes. It labels zero-gain/zero-loss samples flat, never infinite, and formats PF1 neutral and infinity only for real positive/no-loss samples.

### 27 October 2026 — Low-Range Short, research only / local branch

See `docs/low-range-research-20261027/SHORT-HANDOFF.md` for source seals, scope, settings, exact formulas, audited 20-symbol/hourly results and remaining release work. On the tactics-off 15m production-path replay, initial post-Base validation was **559/1,469 configs (38.05%), historical PF 25.123751**; the subsequent 24h funded-model cohort had **1,883 settled orders / 14 positions, PF 0.078058**, zero held. This was an after-observation tactic comparison on previously examined data, not a fresh holdout or venue execution. The default-tactic replay had no Base-passed pairs and post-Base PF/percentage unavailable. The independent 1m/5m/15m candidate research had **952/6,446 validated (14.77%), historical PF 4.221097**, later unallocated candidate PF **0.822958**; do not combine these cohorts. The new feature stays off by default; the requested systemwide floor migration, full release/browser checks and external merge remain outstanding.

## Independent Exit and Low-Range follow-up — 27 October 2026

See `docs/low-range-research-20261027/PROGRESSION-HANDOFF.md` for the complete
current source, replay denominators, audit results, limits and report scope.
Economic source `c910672` / SHA-256
`edc598b9c7e04b98429a9cfe0a77ea12b3642ade2964079d97af6f3ed76e082d`
retains exact strategy/range/config lanes and adds conservative live-side
admission and verified native-exit handling. The parallel Relate branch through
`cb6d629` is incorporated locally and retains its original study provenance.

The final-source 20-symbol 5m capped Short-range replay, 19 October 00:00–20
October 00:00 UTC, validated 10,439/14,702 configs (71.00%, historical pooled
PF 4.570829); the later 135,811 settled funded-model orders had return PF
0.274964. Historic Exit was excluded, so this loss cannot be attributed to an
Exit collision. The final-source 12-symbol 150h-fit mixed Exit replay had 0/40
Exit pairs pass Base, leaving Exit post-Base validation and PF unavailable.
Its separate ordinary cohort was 72/1,344 validated (5.36%, historical PF
3.114704), followed by 141 settled modeled orders and 121 still held.

The complete 317-file offline core suite on `c910672` failed: 3,894 passed,
58 failed, two skipped and zero canceled; evidence is in
`docs/low-range-research-20261027/core-audit-c910672/`. Later fixes and tests
are in progress and require a new combined verification. Combined typecheck
passed for `c910672`. Actual venue fills,
non-atomic concurrent native exits, held-position cost changes, systemwide
cost-plus-step floors, long/short-specific Base proof, real-browser visual QA,
stable forward profitability and public publication remain unresolved. No
live settings, venue orders or deployment were changed.
