# Post-Base procedure and hourly audit — 21 October 2026

PR: https://github.com/mxssnx-creator/CTS-A-O/pull/190. Base main `720299c235b6a50ca223daa1b5e9d2d935bf36c4`. Frozen production: local `2edac0c`, remote `31b66ac08257de40f5064336cfac5ce849fb3748`; runtime manifest `110b13ff9f42232e39d346430bf1a6adf254a8fefe49a69cde626d972c912f71`. Later commits change the audit launcher/reference, runner, tests and evidence only.

Four reproduced procedure defects are fixed:

- The shared Base predicate retained pair/range/target proof but omitted optional exact-cell proof. Fixed/hourly selection already checked cells separately; Durable, direct entry and native promotion could accept a rejected sibling stop/trailing cell. Cell proof now belongs to the shared predicate. Twenty-four range/side/Normal/Trailing cases and an actual native-promotion regression pass. Existing held-position exits remain independent of new-entry permission.
- Incremental `seedTape` used raw warmed signals instead of the explicit replay evaluation boundary, and universe growth discarded that boundary. The reproduction had 31 closes instead of 11; all four tapes were rejected by seed parity. Seeds/growth now preserve the boundary and a changed boundary requires a fresh seed. Full tape, return, open and pending parity passes.
- This audit launcher loaded later feed candles for earlier requested windows. Entry times were bounded, but future maturities were called settled results inside the declared six-hour period. Clip source bars at `endT`; independently reject future settlements and reconcile every reporting hour. On 13 October, 195 of the old 231 closes belonged later; on 14 October, 80 of 128 did. Preserve those old results as superseded entry-cohort diagnostics. This changes the audit's time scope; it does not turn a strategy loss into a win.
- The core test runner accepted missing explicit files/directories and duplicate aliases. A misspelled Signal-history path was silently omitted among successful files. Validate the requested inventory before spawning. The initial related invocation covered seven real files, 77 tests; the actual Signal-history file was then run in the separate 59-test lifecycle group.

Primary PF uses modeled settled unit net returns; external execution multiples are removed once and the 0.15% round trip is already included. These audits do not establish funding or venue fills. Empty PF is unavailable. A no-loss score of 4 is explicitly identified rather than called a measured finite ratio. Open marks are separate.

| UTC six-hour window | Scope | Base passed/evaluated | Settled orders | Settled PF | Positive / negative / empty hours | Open marks |
|---|---|---:|---:|---:|---:|---:|
| 13 Oct 15–21 | 12-symbol bounded ranges | 5/20 | 36 | 31.386887 | 3 / 0 / 3 | 195 |
| 14 Oct 15–21 | 12-symbol bounded ranges | 5/20 | 48 | 0.224484 | 1 / 1 / 4 | 80 |
| 15 Oct 15–21 | 12-symbol bounded ranges | 4/20 | 6 | no losses; score 4 | 1 / 0 / 5 | 0 |
| 16 Oct 15–21 | 12-symbol bounded ranges | 7/20 | 193 | 0 | 0 / 3 / 3 | 5 |
| 17 Oct 15–21 | 22-symbol legacy Micro, hold ≤15m | 64/700 | 680 | 1.337123 | 1 / 2 / 3 | 0 |

The 13 October endpoint marks have PF 1.074990 and +4.788788 return percentage points; they are not 195 settled wins. The 22-symbol Micro hours are PF 0 / 2.252299 / 0.036520, followed by three empty hours. Its cumulative PF after active hours is 0 / 1.773925 / 1.337123. Consistent hourly/window PF above one is **not achieved**.

All 963 settled executions match their exact candidate identity, prices, exit, reason and unit return: zero missing/mismatched returns or failed current entry proofs, and no empty own-symbol proof. Cost reconstruction error ≤8.211e-8 comes from compact price columns. The separate scalar DOT trace finds one original onset copied across 193 independent Minimal protection configs. The 14:45 failed-high source bar emits −1; `revert` enters Long at 15:00. Cached minute lows touch every recorded hard stop at its reported 15m settlement bucket. Modeled cost is present exactly once. The losing future cohort is not evidence that its previously passing history was below the gate.

Independent own-direction evaluation matches **548,576 hourly decisions** over five runs, including failing and never-selected configs. The initial extension of the existing scalar reference reported 13 mismatches: that reference explicitly covered modern Micro with a 1.1 family floor, whereas the new scope also includes legacy `mc-*` with its configured 1.05 range floor. Passing indication identity to the scalar resolves all 13 without changing production gates, sample rows or returns. The failed extension is archived.

Complete registry checks: 1,860 specs / 37,786 eligible bot/lane pairs; 627,984 synthetic identity cells; 5,580 positive and 5,580 losing own hourly cases. All registered sources on the cached 20-symbol native feed pass six hourly prefix cuts and three unfinished-higher-bar cuts (7/17/37 minutes), zero violations. This is source causality/correctness evidence, not an exhaustive financial Cartesian replay.

Fresh local checks: 98 focused + 77 related + 59 actual Signal-history/lifecycle/mirror tests; 23 procedure/reference/launcher tests; types and production build pass. Changed-file lint: zero errors (one pre-existing `walkforward.ts` warning). Packaged worker SHA256 `5c7b9a19d051ee12ff4c223295664a09c950455a1e7cf6e013ad4f0768dd5f98`; built app also contains the new incremental boundary propagation. Exact Signal CI 39541882409 is green; full Exit CI 39541882421 is still in progress at assembly. No complete all-core success is claimed yet.

Machine evidence: `report.json`, `dot-onset.json`, `universal-plan.json` and `evidence.tar.gz`. The archive retains protocols, all exact executions, full parity rows, initial failures, final logs and both scored/final audit source snapshots. Original feed provenance limitations remain explicit. No deployment, hosted restart, account/database mutation or venue action occurred.
