# Old #219: pending parent retention after a partial entry

Common base: `a50a10e297654f6f90a731d8f269ffde7bcf2d94`.
Old draft head: `ad9271b3f93bb0ddfac742805103b9ae3eefefc4`.
Current target audited: `4009a6e73d7e1c38e131733484c050b9b375b368`.
Locally tested source checkpoint: `c1b94badd9e99273f82c783ed8e7ad56e2faf2cc`.
Remote target backup: `backup/own-parent-start-20261115` at the target above.

The common base and old draft already contain the `liveEntryParents` checkpoint
and its cleanup after lane attribution. They do not contain the current frozen
`processedStage`/`processedPolicy` venue provenance. Current main has that newer
provenance and the opt-in durable paper-stage adapter, but retains the earlier
cleanup condition: any attributed parent retires the request map immediately.
The stale branch is not overlaid or merged.

An initial nonzero partial fill creates a `liveLaneOpen` attribution while its
entry remains pending. Cleanup then deletes the request-to-parent checkpoint,
even though another cumulative fill, sparse status poll or restart can still
require that exact request identity and Active policy. A lane attribution is not
evidence that an entry request has finished.

Cleanup now requires both absence of pending status/payload and either complete
parent attribution or no remaining exposure. The independent pending-status flag
is retained even when a parseable pending payload is unavailable. Terminal
filled/cancelled entries still retire their request checkpoint after attribution;
held lane provenance and existing protection/exit handling remain intact.

## Verification

The exact final 28-test fixture fails four added cases against a detached,
unchanged target; all 28 pass after repair. The final fixture SHA-256 is
`9a8efac68a6e96a2daabac6fa199d39f64da727fb09dfb6a4811b6f1d7daa2b3`.
Long and Short each cover partial entry, first lane attribution, disk restart,
stale zero cumulative reply, exact policy retention, terminal full fill or
partial cancellation, no duplicate entry, retained quantity/protection, and final
owned close. The mock recognizes entry/close by hedge direction, preserving the
hard final-flat assertion. The initial failed mock classification and all earlier
baseline attempts are retained in the cross-project report evidence.

Expanded affected inventory: 199 tests passed, zero failures/skips. Typecheck and
production/core-worker build pass without a database URL; scoped lint has zero
errors and one pre-existing unused-variable warning. Required PR verification
now explicitly includes parent/partial/checkpoint tests and bounded idle dev and
production desktop/mobile render checks with account access disabled. Local
Chromium exists but its launch fails on a denied Unix socket; no permission or
sandbox protection was bypassed. Hosted render results and exact final-head CI
remain publication evidence rather than assumed local success.

## Remaining scope

These are synthetic transport/recovery fixtures with seeded Active metadata,
not naturally earned Active qualification, a funded forward run, or a new market
sample. Nominal lane rows still do not prove per-parent funded quantities across
multiple netted parents. Additional/Overall placement, exact funded allocations,
Active-to-Live fill proof, real twelve-symbol x02 coverage, model/venue parity and
sufficient independent forward results remain open. Keep #219 draft/open.

Latest market-result scope remains unchanged: the completed retrospective
twelve-symbol, 12h evaluated prehistory + 12h replay on a 72h physical feed has
post-Base run-start validation at 2026-10-16 09:00 UTC of 0/153,298 ordinary
configs (0%, insufficient), unavailable passing/settled execution PF, and zero
funded modeled positions/orders opened/settled/held. No new PF, real exchange
order, account/service change or deployment is established by this correction.
