# Old PR #219 — current-target Settings and preset control (15 November 2026)

## Scope and disposition

Draft PR #219 was compared from common base `a50a10e297654f6f90a731d8f269ffde7bcf2d94` and old head
`ad9271b3f93bb0ddfac742805103b9ae3eefefc4` against current `main`
`abaff28ee098b08fe257209eea63a47ef28e761c`. The old Stage implementation is not overlaid: current main already
contains the newer opt-in `NativeProcessedStageAdapter`, durable paper checkpoint and exact venue-admission
provenance. Only the missing current-target operator control is integrated.

## Reproduced gap and correction

Current main persisted `wf.processedStages` but exposed no Settings or preset control. More importantly, an omitted
JSON key means “keep the current policy”, while `undefined` is omitted by JSON. An operator therefore could not
disable a previously persisted processed-stage policy through the supported UI/API path.

- Settings now exposes an explicit opt-in switch plus independent Main-predecessor and Real-predecessor close counts,
  each range-checked from 1 through 200.
- Preset editing retains the exact optional policy and sends an explicit `null` when disabled.
- The server sanitizer treats only explicit `null` (or legacy `false`) as a disable patch. An omitted key still
  leaves the current policy unchanged.
- The UI states that the policy does not manufacture history or waive ownership, risk, cost or venue checks.
- API-contract coverage treats both nested values as optional because the adapter remains off unless selected.

Existing held exposure remains under the established protection/reconciliation path when the policy is disabled.
No default, PF threshold, admission window or historical result is changed.

## Verification and limits

The focused adapter/admission/durability/parent-isolation/runtime/API inventory passes 89 tests: 86 passed, zero
failed or cancelled and three explicit skips. The complete Core inventory passes 4,961 tests: 4,958 passed, zero
failed or cancelled and three explicit skips. TypeScript and the production/core-worker build pass.

No account credential was loaded and no x01/x02 request, order, position, deployment or service was changed. No PF
was measured. This operator control is not proof of exact funded per-parent quantities, partial-fill/reduction/restart
parity, Active-to-Live execution, twelve-symbol coverage or sufficient independent forward samples. Draft #219 stays
open and all earlier losses and failed attempts remain unchanged.
