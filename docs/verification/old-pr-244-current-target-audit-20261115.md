# Old PR #244 current-target audit — 2026-11-15

## Scope and graph

This audit compares old draft PR #244 without merging its branch:

- old head: `c28b730a034dbaa0577ace6fed492970a7058e3f`
- current target before this audit: `231e776dd2ca4c738ad12f441d5deed56e7c2e57`
- common base: `9f054c30250b5998fef173da8d11e6c93ef0f646`
- graph difference at the audit: 50 old-head-only commits and 90 target-only commits

The old head is a WIP combination commit. One parent is the common base, which is the already merged PR #246
release. Its other parent carries the disabled research-stage branch. Applying the old head would therefore
overlay 104 changed paths and an obsolete stage/settings/runtime implementation over the newer target.

## Claim-by-claim disposition

| Old #244 claim or component | Current-target evidence | Disposition |
| --- | --- | --- |
| Independent Trailing-only Base cells | PR #246 merge `9f054c30250b5998fef173da8d11e6c93ef0f646` is an ancestor of current main. Current `trailing-only-base-proof.test.ts` proves independent cells through worker and in-process publication. | Already integrated; do not reapply. |
| Capped minute execution and hard wall-clock holds | PR #233 release merge `12e1f04` is an ancestor of current main. The current model retains `capped-execution.ts`, hard-hold identity, tick clock provenance, restart continuation and DCA/Axis parity. | Already integrated and subsequently extended. |
| PF neutral at one | PR #239 merge `af8a790` is an ancestor of current main. Current metric and systemwide tests cover tiny scales, grouped/Signal/owned windows and fail-closed missing raw returns. | Already integrated and superseded. |
| Prevent raw conflict-rejected candidates from satisfying processed Main/Real | The old expected-failure draft is replaced by `processed-main-conflict.test.ts`; the current native replay records all 14 own losses, excludes 14 rejected winning siblings, and opens no validated/active child from those wins. | Replaced by a passing production-path regression. |
| Separate Base → Main → Real processed sets and restart ownership | The research-only `StageChainBook` is replaced by `ProcessedSetBook`, `ProcessedReplay` and `NativeProcessedStageAdapter`. Current target retains exact config/symbol/side/kind/lane/economic-revision identity, consecutive predecessor windows, complete-parent accounting, entry-time frozen policy and durable restart state. | Replaced by the current persistent implementation. |
| Settings and preset policy | Current Settings/preset integration from PR #270 exposes the opt-in Main/Real predecessor counts and an explicit disable path. | Replaced by current-target control; old UI is not copied. |
| Persistent venue admission provenance | PRs #267/#268 retain the durable paper checkpoint and exact processed policy/stage through pre-dispatch reservation, lane ledger and restart. | Newer implementation; old draft had no equivalent complete path. |
| Old stage-window reports, scripts and archived model PF | They describe bounded historical research and explicitly state that exchange PF is unavailable. They are not production dependencies and are not copied into current runtime. | Retained in old PR history only; not evidence for current live profitability. |

The old `StageChainBook`, `stage-policy`, `stage-source`, `stage-window-index`, draft migration and related UI
files are deliberately absent from current main. Their supported behavior exists in the newer processed-set,
replay, persistent adapter and venue-provenance paths above. Reintroducing them would create a second stage model,
weaken the current fail-closed boundaries and overwrite later settings/runtime work.

## Current-target verification

The following current-target groups were run together:

- capped minute execution, wall-clock holds, continuation and independent minute-kernel parity;
- independent Trailing-only Base proof through worker and in-process paths;
- PF-neutral-at-one metric and systemwide recovery behavior;
- processed conflict, replay, complete-parent accounting, durable adapter and admission boundary;
- native parent isolation and restart ownership.

Result: **105 tests passed, 0 failed, 0 skipped, 0 todo**.

This verification is mechanical source and accounting evidence. It does not measure a new market cohort, post-Base
PF, venue PF or deployment state. No credential was loaded and no account, order, position, service or deployment
was changed.

## Conclusion

PR #244 has no remaining release-ready source correction that should be overlaid on the current target. Its
production-relevant parts are either already in the common-base release or superseded by the newer persistent
processed-stage implementation. Close the old draft without merging its branch, after this audit is published on
current main. Full funded parent-quantity attribution, fresh twelve-symbol x02 evidence, paired Sim/Venue returns
and sufficient independent forward samples remain separate open work under #219 and the cross-project acceptance.
