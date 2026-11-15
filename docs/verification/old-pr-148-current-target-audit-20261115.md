# Old PR #148 current-target audit — 2026-11-15

This audit compares the old branch's changes from the common base with the
current implementation. No old branch material is overlaid on current main.

| Reference | Exact commit |
| --- | --- |
| Common base | `b6094a4395a79689804c0956c1c826e0de0b0017` |
| Old draft #148 | `d9834d6692c8f9b32a2d560ee133abd23e5d08e0` |
| Current target | `3eccd495454d93e06e99a570a8ae5af111571039` |
| Current integration origin | `ea85aba61f468a9be837defd3b98cc26e864d217` |

The old branch has 11 exclusive commits and a 48-file delta (+3,133/-196).
The target has 688 exclusive commits from the shared base. Ancestry alone
does not prove integration; the following mapping uses current code and tests.

| Old claim | Current implementation and disposition |
| --- | --- |
| Nine cumulative thresholds 60–100%, each with Short/Medium/both source masks | Superseded by `signal-coordination.ts`: five disjoint v2 bands 60–65/65–70/70–75/75–80/80–100, crossed with independent input masks. Legacy v1 cumulative thresholds through 100% still parse for held-position recovery. `signal-coordination-feature.test.ts` verifies boundaries, both directions, source voting and identities. Do not restore overlapping threshold entries. |
| Each source votes once; conflicting variants abstain | Integrated in `signalCoordinationVoteCounts`; current fixtures verify quiet/conflicting sources and minimum active votes. |
| Independent configuration, lane, direction and normal/trailing identities | Integrated in current registry/combos, protection identities, active-unit caps, live grouping and exact ledger configuration paths. Current feature and statistics tests cover these interfaces; this is not proof of venue fills. |
| Independent Short/Normal/Long historical PF floors and no untagged coordinator when all ranges are disabled | Integrated in `signal-hist.ts` and current coordinator range/history helpers. Existing tests verify per-range floors, stricter custom floors, no sibling cloning and held-config retention after grid/range changes. |
| Retain 8x coordinator sizing, 1x other combined indications | Superseded by current neutral 1x defaults and configurable 0.1–5 ratios. `volume-factor.ts` handles both v1 and v2 plus standalone/combined lanes; factors change sizing once and leave primary unit-return PF unchanged. `volume-factor.test.ts` verifies the current policy. Do not restore the older 8x default or 1–22-only validator. |
| Tracking/statistics preserve coordinator type and range | Integrated in current `statistics.ts`, `live-validation.ts` and live ledger configuration paths; feature tests explicitly verify type, range, side acceptance separation and exact close identity. |
| Research-grid correction withdrawing invalid four-source results | Already retained in `docs/signal-research-results-20261015.md` and `docs/range-admission-diagnosis-20261015.md`. Withdrawn PF remains historical, not restored as acceptance. |
| Expanded retrospective coordinator replay | Historical methods/results remain in the existing replay documents. Later `signals-coordination-stability-v2-20261017.md` explicitly records v2 semantics and withdrawn/incomplete runtime-gate evidence. Those old overlapping multi-day samples do not qualify the current target or substitute for the current bounded forward run. |

## Verification and decision

The guarded current-target run passes **73/73 tests**, zero failures, skips or
TODOs, across coordinator features, volume factors, historical range gates,
statistics and indication UI identity. No runtime implementation change is
needed for the claims above. Only this audit record is proposed for publication.

After a green exact-head audit publication, close old #148 without merging its
stale tree. Retain the archived losses, invalidated research conclusions and
incomplete replay limitations. The independent twelve-symbol replay, complete
functional coverage and sufficient owned forward/venue PF acceptance remain
open; no profitability or live-execution success is asserted by this audit.
