# Old PR #164/#165 current-target audit — 2026-11-15

## Scope and method

This is a claim-by-claim audit of old draft PRs #164 and #165. Their branch
trees are not merged. Each old branch is compared with its shared base and
with the current audited target, then only a still-relevant missing correction
is applied on top of the current target.

| Item | Exact commit | Delta from shared base |
| --- | --- | --- |
| Shared base | `d1364e54d4cf853eb9a73e257375d53d84f0d960` | — |
| PR #164 | `abc49a8743e69e8cf22f8cf0d2833e0be1d1bd07` | 7 old-only commits; 138 files; +21,462/-452 |
| PR #165 | `5316e8a29c8970b2fc2bea42bc0decc42da31b44` | 6 old-only commits; 91 files; +7,650/-572 |
| Audited target | `b21e7a093eb577bb23e9e540c587977b9180917f` | 675 target-only commits from the shared base |

The large old deltas contain historical fixtures, generated evidence and
superseded implementations. Copying either old tree would overwrite later
safety, cost and execution work.

## PR #164 claim mapping

| Old claim | Current-target disposition |
| --- | --- |
| Exact Base qualification shared by selection, entry, native execution and reporting | Integrated and superseded by the canonical Base cohort, Base-evaluation parity and strict live-promotion tests. |
| Held exit identities and independent DCA/Axis processing | Integrated in held-Base and strategy-identity paths; covered by the current focused suite. |
| A lower live PF threshold must not weaken a range's post-Base floor | Integrated; the current regression explicitly verifies this invariant. |
| Signal coordination/source/stage identities remain independent | Integrated in current Signal coordination identity and volume-factor paths. |
| Break `reclaim8` is opt-in while existing defaults remain unchanged | Integrated and covered by current production preflight tests. |
| Replay requires the complete universe and rejects incomplete or mismatched economics | Integrated and strengthened by current replay-universe and exact preflight checks. |
| Historical fixed 0.15% studies and incomplete runs | Retained only as historical evidence. They do not establish current PF and are not copied into production defaults. |

## PR #165 claim mapping

| Old claim | Current-target disposition |
| --- | --- |
| Symbol-major/timestamp ordering, completed-hour handling and Last-N causality | Integrated and covered by current causal-range-fit and symbol/direction tie-order tests. |
| Held exact exit identity and sizing | Integrated in current held-Base/exit-only coverage. |
| Full replay universe and causal fit | Integrated; incomplete replay admission remains rejected. |
| Memory admission and bounded planning | Superseded by current replay planning and bounded admission implementation. |
| Job-scoped ownership/cancellation and buffers | Integrated in current worker ownership and cancellation paths. |
| Physical worker retirement before Real and scratch release | Integrated and covered by current worker-retirement/spawn-failure tests. |

## Missing current-target correction

The production implementation already uses dynamic venue costs once and keeps
the configured Micro grid independent from the runtime protection floor. One
old replay test still asserted the removed fixed-cost representation:
`grid.micro.minSlNet` and a cost-mutated `grid.micro.minSl`.

Only that stale test is corrected. It now verifies the current contract:

- the raw Micro grid and evaluation floor remain `0.001`;
- the Micro net distance remains `0.1%`;
- `protectFloor.minSl` is the dynamic venue cost plus the net distance exactly
  once; and
- changing cost changes the protection floor, not the configured Micro grid.

No runtime gate is lowered, no loss is removed, and no historical PF sample is
reclassified.

## Verification

The first replay/script run is deliberately retained: 58/59 tests passed and
`scripts/core-22-symbol-study.test.mjs` failed on the stale fixed-cost
assertions described above. After correcting only those assertions:

- replay/script suite: 59/59 passed;
- combined current-target suite: 254/254 passed, 0 failed, skipped or todo;
- TypeScript typecheck: passed.

The combined suite covers Base cohort parity, held Base-failed exit-only
behavior, strict own-evidence live promotion, post-Base PF-floor independence,
complete replay admission, worker retirement/ownership, Signal identities,
Break opt-in behavior, causal ordering and dynamic cost protection.

## Publication decision

Publish this small current-target correction and this audit document through a
new exact-head PR. Merge only if all required checks are green. After that,
close old drafts #164 and #165 without merging their stale branch trees, with a
separate claim mapping and exact publication evidence on each PR.

This audit is a functionality/regression result, not a live-trading or positive
PF acceptance. A fresh fixed-universe forward simulation and a separately
authorized, ownership-safe x02 run remain required for those claims.
