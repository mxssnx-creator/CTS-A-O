# Persistent processed-stage adapter — 12 November 2026

## Old PR #219 disposition

Draft PR #219 (`wip/lastn-only-validation-20261028`, head `ad9271b3`) is not a release candidate. It contains 38
commits and 73 changed files from old base `a50a10e`; the current target at the start of this integration was main
`63c2a1bf`. The current main and the draft head have no merge base in the published graph, while the draft's recorded
base remains an ancestor of its head. The branch therefore was inspected as evidence only and was not merged or
overlaid. Its simulation primitives and later partial-parent repair were already present in newer form; its own
documentation still explicitly left persistent paper/venue admission pending.

## Current-main integration (paper predecessor path)

The missing bridge is implemented on current main as an opt-in, fail-closed policy:

- `wf.processedStages` is now a persisted/sanitized runtime setting (`validationN` and `realN`, each 1–200).
- Only a paper entry that passed the current runtime's selection, coordination, execution and cap checks enters the
  persistent processed book. Raw candidates never seed either window.
- Every complete config × symbol × direction × strategy kind × indication/policy/economic-revision identity owns its
  separate post-Base, validated and active history. The configured cost is part of the economic revision.
- Predecessor-stage parents continue on paper so their exact terminal returns can form the next causal window. They do
  not reach native Live promotion. An active entry's stage is frozen at admission; a later loss blocks only later
  parents and does not reclassify or orphan held protection.
- Exact terminal paper parents settle once. Partial-parent accounting remains in `ProcessedSetBook` snapshot v3; the
  adapter adds a bounded recent terminal-parent receipt list so checkpoint replay is idempotent.
- The adapter checkpoint is journaled under `processedNativePaperV1`. On restart, a checkpoint parent with no matching
  paper position is retained as an unknown terminal result, never converted to a win or silently discarded. A malformed
  checkpoint makes native stage admission unavailable rather than starting a clean book.
- Pending Entries and Overall control both use the same exact paper entry-stage gate through `livePromotionGate`; existing
  venue ownership continues to be managed even when no new exposure qualifies.

No qualification floor was lowered. Costs, volume factors and realized returns are not applied again by the stage
book. The feature remains opt-in; this change does not start a connection, alter an account, claim a venue fill or
establish positive PF.

## Verification and remaining boundary

- Focused processed-stage, paper-admission, strict promotion, native Entries and accounting checks pass.
- The former expected-failing Main→Real TODO is now an ordinary passing restart/frozen-policy regression.
- TypeScript typecheck passes.
- No exchange request or funded demo session was made in this integration step.

The broad local core inventory was also attempted and is **not** recorded as green. Four assertions fail: two stale
Axis fixtures expect 90 admissions but receive 60, `trailing-only` is one-sided in the coverage fixture, and the rich
market fixture does not activate every Tactic-DCA cell on both sides. The same failures reproduce on the untouched
exact base `63c2a1bf`; they were not introduced by this adapter. They remain visible work rather than being skipped or
rewritten as an adapter pass.

This is not the whole #219 draft. A separate persistent venue-own-stage ledger, partial-fill/restart correlation,
Settings/UI controls, full repository CI, a fresh bounded twelve-symbol x02 forward run, venue-return parity, and
sufficient independent forward samples remain required before any live or profitability conclusion. The current
paper checkpoint must not be described as venue-stage proof.
