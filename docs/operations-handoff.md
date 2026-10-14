# CTS-A-O operations handoff

Updated 2026-10-14. Repository: `mxssnx-creator/CTS-A-O`.

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

Current follow-up: branch `fix/fill-return-pf-20261014`, PR #135. First validated reporting checkpoint: `c3e84490d5dc83db4dee68d89c77629fd30e7f9a`. Final source verification and checkpoint are in progress; consult the PR before assuming the later working changes were merged. These source backups do not contain a production database or private runtime settings. Back up live settings, durable state and a consistent database snapshot before deploying.

## Implemented corrections

- Primary execution reporting and UI use the same settled owned close slices, including partial reductions. History preserves exact identities and latest cumulative orders instead of rounding unsafe venue IDs or summing duplicate cumulative records. Paper/session/coordination outputs explicitly identify their evidence basis.
- Actual quantity, price, fees and pending lifecycle survive crash recovery in both live modes. Pending zero entries cannot adopt unrelated venue positions. Protective closes honor actual zero/partial results. Actual exit timestamps determine history windows. Proven external stop losses are attributed once; ambiguous extra late fills remain explicitly unresolved.
- Account sizing uses verified current account equity; unknown or stale values never become a paper $1,000 live balance. Retry quantities pass risk/margin checks again. Wallet balance, equity, ledger net and reconstructed history remain separately labeled.
- Signal qualification is independent by full range/lane/type; order, paper, lane and stats keys preserve exact configs. Exchange acceptance and simulation agree on onset sample count and settled return PF.
- Signal historical MFE calculations use the existing bounded worker pool with shared causal bars, pair isolation, deterministic merge, held-config preservation, generator fallback and cancellation/memory guards.
- Tactic is registered as an indication family, with the standard Base → Live evaluation path and human labels in settings, presets, configs and statistics. Its calculation recovers after gaps/invalid candles using fresh valid segments.
- Higher-timeframe aggregation rejects incomplete source buckets and malformed duplicate/non-increasing timestamps. Tail resampling matches the last complete buckets of full resampling.
- Supervisor and monitoring fixes from PR #134 preserve exact process identity, fail closed on process-query failure and respect procfs PID namespaces.

## Verification

Latest completed checks during this follow-up:

| Check | Result |
| --- | --- |
| Full merged core before the later Signal/Tactic work | 1,507 passed, 0 failed, 2 skipped |
| Scripts before the new Tactic research runner | 280 passed, 0 failed, 8 environment/browser skips |
| Platform and UI helpers | 66 passed |
| API contracts, including independent Signal type search | 21 passed |
| Base/tape consistency including nonempty Tactic Normal/Trailing cases | Pass |
| Independent pending lifecycle review | 65 passed |
| Signal focused and full-source/end-to-end checks | 77 passed |
| Signal worker/history/cancellation checks | 25 passed |
| Full ESLint at this checkpoint | 0 errors, 24 existing warnings |

Final all-core run, build, production browser checks and Tactic research are pending at this checkpoint. Development browser checks already passed 4 functional cases and 26 page/connection/SSE cases across desktop/mobile; production verification will use the final build.

The configured network blocks Google Fonts and the external required Grok extension; application requests were clean in development QA. Do not suppress or remove those dependencies to manufacture a clean network result.

## Research and live deployment limits

Public BingX research data covers eight symbols and 18 closed days; its cache is ignored by Git. The earlier narrow lean runner covered only 32 of 259 requested existing combinations, not the full engine. Its held-out 83 closes produced return PF 0.46055 after modeled costs despite IS PF 2.549. It did not qualify and was not promoted. See `docs/research-check-2026-10-14.md`. Tactic's separate reproducible technique/timeframe comparison is in progress.

No exchange credentials or reachable authenticated live route are available in this environment. There is no configured Tailscale client/session, SSH identity or deployment workflow; recorded hosts `152.53.114.112` and `100.105.148.7` are unreachable. No live orders were placed and no reload or live PF-above-1 claim is justified.

The exact external resource `imperative-greeting-fox` was absent from source, connected Sites and connected Vercel name lookups. Its requested industrial rename remains pending an exact resource identity. Do not rename a guessed deployment.
