# Post-Base continuity investigation — 20 October 2026

The progression defects are fixed in the integration branch. **Consistently high forward PF and many executed orders are not established.** A passing historical PF cannot certify the returns of an entry that has not settled. Zero executed orders have unavailable PF; they are never scored as profitable.

The earlier 12-symbol Micro result of 9,310 closes at PF 0.057618 was real modeled loss. Every one was a short. Its config containers passed their aggregate candidate history, but that did not prove each entry's exact symbol/direction Last-N. The initial continuity-only repair still allowed those orders. The final repair requires the concrete entry context and preserves rejected candidates for independent learning.

## Corrected behavior

- Preserve the exact Base-qualified pair/range/target before `allSets` diagnostic expansion. Diagnostic TP cells cannot acquire entry permission. Preserve this map across settings refresh, native admission and preset calculations.
- Fixed, hourly and durable seats use the same current config evaluation. Recheck at every new entry, and again at native promotion; stale seats and held configs cannot open new orders after failing their own current gates. Held exits retain their management path.
- Require the configured validation Last-N and range Last-N on the exact config × symbol × direction. A config container can seat when at least one context passes; only passing contexts may execute. Keep the configured sample floors, PF, costs, drawdown and warmup rules; do not waive result evidence.
- Fix multi-timeframe symbol indexing: `syms` contains repeated names, `makeTape` can store the last slot, and `indexOf` found the first. Context queries now include every slot of the same symbol. This fixes Signal Last-N too.
- Last-N retains each lane's configured source history independently of the 24-hour broad evaluation window. Signals retain their separate 336-hour history and normal source calculations.
- Carry exact maximum hold minutes into Base and tape lanes. A 15-minute cap cannot become a 30/60-minute hold on slower lanes; a lane that cannot express one whole bar inside the cap cannot build a new cell.
- Integrate independent Signal peak trailing, trailing-only identity and 2% protection from PR 175, retaining measured MARKET-fill quantities and fail-closed return accounting from current main. Preserve 0.15% configured round-trip execution cost and the separate 0.2% target construction basis.
- Integrate cooperative stable merge sorting from PR 168. Ordering and tie stability are tested; the runtime can yield during large sorts.

## Frozen retrospective checks

The harness is `scripts/audit-postbase-continuity.mjs`. It freezes source/settings/feed hashes before scoring. Micro maximum hold is 15 minutes; Base and broad config evaluation remain 24 hours; Last-N can use earlier completed source closes. Each entry is checked for exact Base admission and current config/context qualification. Only settled modeled unit-net returns score PF. Signals and independent Exit are excluded from these engine-only replays and are tested separately.

The 12-symbol cached source covers five days; its venue provenance was not independently audited. The additional 22-symbol archive was restored from PR 164 and verified against every encoded/decoded chunk hash and gzip manifest hash (`1373d0a7fab7528d0528573385e19dfecf6f4ab353194231c639103af29aadcd`); it contains completed public OHLCV from 1–17 October. These are retrospective cached-feed checks, not an untouched alpha holdout or venue execution.

| Run | Base pairs passed/evaluated | Qualified config containers at start | Exact qualified entry contexts at start | Settled orders | Return PF |
|---|---:|---:|---:|---:|---:|
| d0 | 4/700 | 1 | 1 | 0 | unavailable |
| d1 | 18/700 | 103 | 351 | 0 | unavailable |
| d2 | 10/700 | 0 | 0 | 0 | unavailable |
| d3 | 0/572 | 0 | 0 | 0 | unavailable |
| extended22 | 64/700 | 274 | 1071 | 0 | unavailable |
| extended22-d1 | 10/700 | 22 | 110 | 0 | unavailable |
| extended22-d2 | 83/700 | 596 | 2254 | 999 | 0.023841401187696717 |
| extended22-d3 | 21/700 | 364 | 1068 | 0 | unavailable |

The previous entry-continuity baseline (9d6deae) closed 12,471 orders at PF 0.065504 in the difficult 12-symbol window; **3,224** entries already failed the exact config evaluation at their own entry times. Rechecking at entry removes this stale-seat leakage. Its next continuity-only run still closed 9,310 at PF 0.057618: fixing stale seats alone did not create an edge. The exact-context repair blocks admissions that lack their own proof; an empty execution cohort is not a high-PF result. On the extended22-d2 window, even fully qualified entries still produced 999 modeled closes at PF 0.023841. Historical exact-context validation therefore does not establish a forward edge; this remains an explicit unresolved performance blocker.

All machine-readable protocols, source hashes, settings, counts, losses and result scopes are retained in `postbase-continuity-20261020.json`. The larger original feed remains on the reviewed remote branch; it is not resealed as a new frozen research protocol.

## Open work comparison

Started from `origin/main` 4588030b946740d493cf0e0d629aa2722aa6211c and inspected all 11 open PR heads plus 89 remote branches. The integration branch has separate merge/cherry-pick provenance; branches with incompatible older accounting were not merged wholesale.

| PR | Disposition in integration branch |
|---|---|
| 172 | Reconciled by merge; current main already preserves nonfinite PF guards. |
| 173 | Reconciled by merge; current main already preserves confirmed MARKET fill accounting. |
| 175 | Merged independent peak trailing, strict 2% Signal protection and tests; current accounting retained. |
| 181 | Selected per-range maxHoldMin/Base-hold commits; reject older unknown-unit-as-1 accounting and conflicting 3% caps. Other branch work remains separate. |
| 168 | Selected stable yielding-sort implementation and ordering regression. Older broad source replacement and frozen replay snapshots remain separate. |
| 180 | Selected explicit fixture windows, bounded second-compute trigger and live-report environment guard; retain main's costs/default policies. |
| 179 | Retained overlapping source policies already on main; removed stale Settings completeness exclusions. |
| 148, 164, 165 | Compare against current Base/replay/accounting safeguards; retain current source where already superseded. PR 164 public feed is used only as separately hashed audit input. |
| 132 | Older shared branch with extensive unrelated history remains separate; no wholesale overwrite of current execution/accounting. |

## Verification and release boundary

Focused checks include exact pair/range/target admission, all seven ranges, current entry/native qualification, repeated symbol slots, Signal history, range hold limits, ownership/partial fills and UI. TypeScript and production build pass; UI functional checks pass 4/4 on desktop/phone including Settings save. A full core run exposed stale fixture assumptions and runtime timeout failures; corrected fixtures are rerun individually. Full green release validation is still pending and is recorded in the operations handoff. No live deployment or venue order was made.
