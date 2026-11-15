# Old PR #179 and #180 current-target audit (2026-11-15)

## Scope and comparison

The two branches share common base `4588030b946740d493cf0e0d629aa2722aa6211c` and were reviewed separately
against target `main` `2f89d9874bc8e3322d6ad1cf60926f2f0a56e188`.

| PR | old head | target-only commits | old-only commits | old diff from base |
|---|---|---:|---:|---:|
| #179 | `02582ecd6814c55136617c979de40487363ed532` | 621 | 5 | 8 files, +56 / -24 |
| #180 | `d89b01aa5182f9a818f367cee2e960ed8e96e1d0` | 621 | 16 | 36 files, +290 / -90 |

Neither old head nor any of its sampled production commits is an ancestor of current `main`. The branch trees were
therefore not merged or overlaid. Each claim was mapped to the current implementation and only the remaining behavior
was changed on the current target.

## PR #179: direction acceptance defaults

| old claim | current-target result | disposition |
|---|---|---|
| Engine direction acceptance off by default | `ENGINE_SIDE_ACCEPT.enabled` is already `false`, with the current test pinning PF 1.05 / 24 h / 30 closes | integrated by newer mainline work |
| Signal direction acceptance off by default | current target still had `DEFAULT_SIGNALS.sideAccept.enabled = true` despite the later 19 Oct operator override | **integrated here**: default is false; the PF 1.3 / 24 h / 20-trade gate remains available as an opt-in |
| Do not warn merely because the optional signal-side gate is off | current warning still treated off as a degraded positive coordination | **integrated here**: only an enabled gate below PF 1.3 warns |
| Remove stale Exit Settings `NOT_SHOWN` entries | current completeness table already validates all Exit leaves and contains none of the stale exceptions | integrated/replaced by current Settings completeness |
| Rewrite old x01 desk/simulation JSON snapshots | those files are historical inputs and do not control a running desk; changing them would rewrite recorded evidence | intentionally not copied; no x01 setting, service or account was touched |

The 5 Oct pooled side split remains documented as historical evidence. It is not promoted to fresh forward or live
proof and does not silently cancel the later operator override. Turning the setting on still activates exactly the
preserved PF-qualified policy.

## PR #180: measurement, Settings completeness and accumulated branch work

PR #180's title/body describe a documentation measurement and stale Settings-list cleanup, but its branch later
accumulated unrelated commits. They were reviewed rather than assumed to be part of one releasable change.

| accumulated claim/change | current-target result | disposition |
|---|---|---|
| Record the 19 Oct engine-side measurement | exact recorded ON/OFF values are added to `docs/positive-coordinations.md`, explicitly labeled historical and contrary to the selected default | integrated as documentation, not PF proof |
| Clear stale Exit Settings exceptions | all cited Exit fields are already first-class validated UI leaves | already integrated |
| Signal and Trailing-only protection capped at 3% | current `signalTrailMax`, `capSignalProtect`, `capTrailingOnlyProtect`, durable config tokens and restore/tick enforcement implement a 3% hard ceiling, with newer independent protections | superseded by stronger current implementation |
| Flatten only when live writes are armed | current report refuses before any request unless `CTS_CORE_LIVE=1`, rejects mainnet unless separately allowed, cancels own resting entries, scopes quantity by tag and never retries an uncertain write | superseded by stronger current ownership/write controls |
| Fixed 0.15% round-trip / PositionCost constants | current model resolves maker/taker roles, fee-relative slippage and account/symbol/time-scoped exchange snapshots, while actual fills retain measured price/commission without double charging | obsolete; fixed-cost branch not copied |
| Axis on by default | the old branch admitted it lacked a default causal comparison; current target deliberately keeps Axis opt-in while providing Axis-only and combined presets and independent execution | not integrated; no evidence-backed default change |
| 336-hour fixture expansion and assorted fixture repairs | current Signal/Exit history policies, migrations and bounded tests have since changed substantially; old fixture-only commits do not establish a production defect | superseded; stale fixtures not copied |

## Current-target verification

The combined focused suite exercised defaults/warnings, Settings completeness, walk-forward behavior, Signal
discovery and execution, independent Trailing-only protections, 3% caps, dynamic cost/runtime migration and the
tag-scoped flatten/report path:

- 489 tests passed;
- 0 failed, cancelled, skipped or todo;
- TypeScript typecheck passed.

No credential was loaded. No exchange, account, order, position, service, deployment or production setting was read or
written. No PF was measured or claimed. Fresh x02 ownership clearance, twelve-symbol funded acceptance, Sim/Venue
parity and sufficient independent forward samples remain separate open acceptance work.

## Closure decision

After this current-target change is merged with its exact required CI head, close old drafts #179 and #180 without
merging their stale branch trees. The audit preserves their still-relevant operator behavior and documentation while
leaving obsolete fixed-cost, unmeasured-default and historical-snapshot changes out.
