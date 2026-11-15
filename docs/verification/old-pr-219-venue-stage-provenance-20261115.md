# Old PR #219 — venue-stage provenance continuation (15 November 2026)

## Scope and old-draft disposition

Draft PR #219 remains an evidence source, not a merge candidate. This continuation starts from current `main`
`fee2c520910d12224e0668c1a175bcff5b400bbc` after the durable paper-parent checkpoint repair. It ports only the
still-missing venue-stage provenance onto that current target. No old branch tree was overlaid and no newer fix was
replaced.

The defect was narrower than order ownership itself: an owned native request already had a durable exact parent
allocation before dispatch, but that allocation and the terminal lane ledger did not retain the processed stage or
the exact windows/cost revision that admitted the parent. A later restart or audit could therefore prove which
configuration caused the request, but not that the same parent had reached `active` under the current processed-stage
policy.

## Current-main integration

When `wf.processedStages` is enabled:

- a paper parent freezes both its processed stage and a stable revision of the exact validation window, Real window
  and modeled cost when it is first admitted;
- the existing durable pre-dispatch `liveEntryParents` reservation carries that stage and revision beside the exact
  parent ID;
- a native open or increase fails closed before the venue call unless every contributing parent is `active` under the
  current exact revision; missing, predecessor-stage and stale evidence cannot open exposure;
- a pending request retains the frozen evidence through process/database restart and transfers it to `liveLaneOpen`
  when ownership is observed;
- terminal `live_lane_trades` rows retain the same evidence, and journal replay preserves it;
- an existing database is upgraded with nullable columns. Historical rows stay historical and are not relabeled as
  active.

The guard applies only to new/increased exposure. Existing owned positions, reductions and protection remain
manageable if settings change, so stale admission evidence cannot strand risk.

## Verification

Regressions cover non-active rejection, stale-revision rejection, exact-active admission, pre-dispatch reservation,
pending-request restart, terminal retention, journal replay, pure lane attribution and legacy-schema upgrade. The
focused relations/ownership inventory, processed/live/native/control inventory, strategy-feature suite, Last-N Block
suite, TypeScript check, scoped lint and development/core-worker build pass on this source. The complete Core inventory
also passes: 4,954 tests, 4,951 passed, zero failed/cancelled and three explicitly skipped.

No account key was loaded and no x01/x02 request, order, position, deployment or service change was made. PF was not
measured; all prior losses and failed attempts remain unchanged.

## Remaining boundary

This is durable **admission provenance**, not a funded allocation proof. The desk can net several logical parents into
one symbol/direction venue position, while the lane attribution remains nominal. A real bounded x02 forward run must
still establish exact per-parent quantities across partial fills, increases, reductions, protection fills and restart,
then compare the same episodes with their modeled returns and actual fees/funding/spread/slippage. Settings/UI controls,
twelve-symbol coverage and sufficient independent forward samples also remain open.

Therefore draft #219 stays open. This source must not be described as complete live parity, positive PF, profitable,
deployed or production-ready.
