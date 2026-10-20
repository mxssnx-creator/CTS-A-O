# CTS-A-O operations handoff

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
