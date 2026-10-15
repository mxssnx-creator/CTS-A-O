# CTS-A-O operations handoff

Updated 2026-10-15. Repository: `mxssnx-creator/CTS-A-O`.

## 15 October continuation — in progress

The operator explicitly confirmed **CTS-A-O**. Main was reloaded and remains `54b35b08606faff332f4637f889d2a8a2cabce2b` (merged PR #135). The separate CTS-G replay/checkpoints are outside this task.

Work continues on `fix/report-pf-20261015`, draft PR #136; main is backed up as `backup/pre-report-pf-20261015`. The first validated diagnostic checkpoint is `cc2652ecb057dc289f80df87c7f92230665af082`. Do not mistake this partial draft checkpoint for the complete fix or a release.

The audit reproduced a release-critical modeled-volume basis error: one-unit returns +0.8%/-1%, multiplied externally by 2/1, were scored as sized PF 1.60 instead of primary unit-return PF 0.80. Readiness and paper proof could therefore accept a losing unit-return sample. The corrective work preserves weighted execution returns, cash P&L and equity, and adds explicit unit-return scoring to qualification and reporting. Direct modeled trades retain their own multiplier; archived paper records did not, so no missing multiplier is guessed. New nullable `unit_r` evidence is being persisted; unknown closes remain in chronological windows and cannot be skipped to qualify older winners. Intrinsic DCA/Axis ladder semantics remain part of the config's unit result; external Block/coordination volume is removed for primary PF.

Additional confirmed corrections include Tactic's indication-aware 1.1 floor in Overview/session counts, no-loss sentinel provenance and unavailable PF differences, exact hourly close boundaries, independent opposite-direction research slots, and explicit diagnostic/probe/legacy bases. Source/test integration is still underway; use the final PR/handoff verification before merging or deploying. The prior 90-day research used no external execution multiplier and remains a frozen historical study, not proof of this runtime's live results.

Live access was rechecked on 15 October: both recorded hosts are unreachable, no Tailscale session, SSH identity/agent or local tunnel exists, and the external rename target is still not identified. No live deployment or exchange orders occurred.

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

## Verification

Latest completed checks during this follow-up:

| Check | Result |
| --- | --- |
| Full core with execution/Signal/Tactic/Base-count source | 1,598 passed, 0 failed, 2 slow-test skips; 1,018.8 seconds |
| Complete scripts, including research and packaged-worker builder | 293 passed, 0 failed, 8 environment/browser skips |
| Platform, accounting, authentication and UI helpers | 69 passed |
| API contracts, including independent Signal type search and cached Base counts | 22 passed |
| Base/tape consistency including nonempty Tactic Normal/Trailing cases | Pass |
| Independent pending lifecycle review | 65 passed |
| Signal focused and full-source/end-to-end checks | 77 passed |
| Signal worker/history/cancellation checks | 25 passed |
| Full ESLint after production packaging | 0 errors, 24 existing warnings |
| TypeScript after production packaging | Pass |
| Final production build and app page sweep | Build passed; 26/26 pages passed |
| Production count/settings/detail/statistics interactions | Desktop/mobile passed; original Focus/kind restored |
| Latest dev/build authentication agreement | Pass, sign-in enabled |
| Production pool/resolver/count job, duplicate modules and legacy reload | 39 passed; independent old-module reproduction passed |

The full core run passed. It began at the complete Base-count source checkpoint; the later production packaging/shared-state/restart changes additionally passed 39 focused core tests, full script tests, typecheck, lint and rebuilt production verification. The actual default production worker (without a path override) completed a bounded synthetic fixture of 600/600 configured/evaluated cells across 30 full pairs: 37 passed return PF >=1.1, 36 passed all Base gates and only 1/30 representative pairs was admitted. These are fixture results, not live-market counts or profitability. Type toggling, all ten choices, Include action, filtered configs/detail, count/no-match filters, settings persistence and fresh desktop/mobile Statistics/count views passed with zero app errors or overflow. This fixture had zero active Signal rows; typed identity is covered by focused regressions rather than a claim of observed live rows.

The configured network blocks Google Fonts and the external required Grok extension. The raw production smoke exits 2 for those third-party ERR_EMPTY_RESPONSE resources; application requests, all 26 pages and functional assertions passed. Do not suppress or remove those dependencies to manufacture a clean network result. Preview/browser QA processes were stopped after verification.

## Research and live deployment limits

Public BingX research data covers eight symbols and 18 closed days. The earlier narrow lean runner covered only 32 of 259 requested combinations, not the full engine. Its held-out 83 closes produced return PF 0.46055 after modeled costs despite IS PF 2.549; it was not promoted. See `docs/research-check-2026-10-14.md`.

Tactic's frozen 1,680-cell comparison separately selects current-default-entry-filter and raw-diagnostic modes on physically truncated IS data, then evaluates OOS. At the operator's PF 1.1 screen, the default-filter IS-qualified pool returns PF 0.661652 across 130 OOS closes; raw returns PF 0.643878 across 102. One preselected default-filter Short breakout/combined-5m member returns PF 1.275618 across 39 OOS closes, while the whole pool is negative. Do not substitute that member after seeing OOS. Research protects are explicitly fixed distances, not lane-scaled runtime grid cells, and portfolio coordination/capital limits are absent. See `docs/tactic-validation.md`.

A separate protocol was frozen before new-symbol performance access: AVAX/LINK/LTC/SUI/NEAR/DOT/ATOM/APT, 90 days, first 60 IS and final 30 OOS, unchanged techniques/grid/cost/modes and PF 1.1/minimum 30 IS screening. Acquisition validated 1,036,800 closed 1m candles without gaps/duplicates. Six default-filter IS-qualified groups produced 910 OOS settled closes at return PF **1.117865539**, or **1.116471777** including seven open marks. The losing 30m medium pullback remains included; neither mode nor pool membership was selected on OOS. All 70 diagnostic default groups together remain negative (PF 0.899959). Raw mode's one preselected group produced PF 1.815373 on only 27 OOS closes, below the 30-close sample screen.

Two full runs produced byte-identical research JSON, SHA256 `5f40353363fd4d6a8f3054a6dbcee33726bfca93b3daca81878b38b95b8a2c3d`; independent review recomputed IS selection from all 1,680 cells and verified protocol/cache/manifests, pooled sums and repeated output. The positive pool has maximum drawdown 186.772 return points versus net +106.424 points, with 561.917 hours of drawdown time. This is a historical new-symbol sample with overlapping dates/correlated markets, not live evidence or independent account ROI. Full runtime gates, funding, actual slippage, account sizing and capital coordination are absent. No live promotion is justified by the pooled research result. See `docs/tactic-validation-independent.md`. No OOS tuning or mode selection is authorized by a desire for positive results.

No exchange credentials or reachable authenticated live route are available in this environment. There is no configured Tailscale client/session, SSH identity or deployment workflow; recorded hosts `152.53.114.112` and `100.105.148.7` are unreachable. No live orders were placed and no reload or live PF-above-1 claim is justified.

The exact external resource `imperative-greeting-fox` was absent from source, connected Sites and connected Vercel name lookups. Its requested industrial rename remains pending an exact resource identity. Do not rename a guessed deployment.
