# Retain exact request parent history after terminal cleanup

Target: main `e17d77c7e1e1914bee7e3ff1c17f51b3aac7d6b0`, backed up remotely as
`backup/own-history-start-20261115`. Old #219 common base `a50a10e2` and draft head
`ad9271b3` lack this historical per-request record, as does the target. No old
branch overlay or economic policy change is involved.

The pending `liveEntryParents` map now survives initial partial attribution, but
terminal cleanup still retires it. Nominal `liveLaneOpen` is keyed by episode,
contains no measured parent quantity and ultimately retires too. Thus later
durable order/fill rows cannot independently recover their original request's
exact config/processed-stage/policy through these transient maps.

Checkpoint `liveEntryParentHistory:<coid>` before dispatch, using the existing
durable journal and state flush. The record contains original parents, key,
submission clock and account fingerprint hash. Insert-only retention separates
historical provenance from the active reservation lifecycle. No credentials,
inferred fill quantity or guessed parent weights are stored. Rejected or unsent
requests can have a provenance record; it does not prove any execution. Read
actual order status and cumulative `live_fills` by exact COID separately.

Focused tests require history to exist inside the mocked market call, retain it
across partial/stale replies, terminal full/cancelled outcomes, final owned close
and a second disk restart, for both Long and Short. Injected history journal
failure must prevent market dispatch. The identical final fixture is also run
against the unchanged target. All tests are offline synthetic fixtures, including
seeded Active metadata, never natural qualification or venue proof.

This bounded retention change does not implement per-parent entry/exit quantity,
weighted notional, reductions, fees, funding or multi-parent allocation. It does
not alter nominal rows, admission, exits, price references, gates or defaults.
It never promotes the history to verified-venue evidence. Keep #219 draft/open.

Unchanged last completed market cohort: twelve symbols, 72h physical feed,
12h evaluated prehistory plus 12h retrospective replay; run-start 2026-10-16
09:00 UTC. Post-Base 0/153,298 (0%, insufficient closes), passing return PF and
funded settled execution PF unavailable. Funded modeled positions/orders
0 opened / 0 settled / 0 held. No financial samples, account writes, deployment,
service modifications or funded session in this change. Full functions, native
twelve-symbol coverage, exact funded allocation and positive independent forward
acceptance remain open.
