# Final-window admission scope correction — 20 October 2026

**Superseded direction/empty-evidence policy:** pooled Long/Short validation and zero-close symbol warmup below admitted unproven entries. The reproduced causes, independent direction evaluator, corrected proven-symbol rule and final nine-window results are in [direction-qualification-cause-20261020.md](direction-qualification-cause-20261020.md). The losses below remain historical evidence.

The previous full-context change blocked all four fixed Micro windows by applying config-level evidence requirements separately to every symbol and direction. That was a scope regression, not proof that every configured set was invalid. This correction restores the configured validation contract. **Consistently profitable forward execution remains unproven.** Losses are retained and an empty sample has unavailable PF.

## Cause and correction

The exact rejection diagnostic on the difficult 12-symbol window recorded 125,664 context checks at each hourly snapshot. All failed the newly imposed twelve-close minimum; every context had at most six closes inside 24 hours. The minimum of twelve belongs to the exact config set. `validLastN` (15) and range Last-N (75, with the configured partial-sample floor) also belong to that config; they were additionally imposed on each symbol and direction without a setting selecting that policy.

`configEval` now uses the identical config population and full configured PF, sample, pre-window, LCB, Last-N, range, drawdown, green-hour and stability gates with or without Base provenance. Base admission still restricts the exact pair/range/target. Unrelated configs, lanes, protection types and ranges cannot donate results. No losing row within a config is removed from its PF sample.

The existing symbol gate retains its own modes (`off`, `veto`, `vetoSide`, `proven`, `provenSide`), lookback, `symMinN` and explicit warmup behavior. A configured losing-symbol veto still rejects entry. Entry and native promotion reuse the same rule. Config/range Last-N result evidence is never waived by symbol warmup. Signals retain their separate exact-context proof and 336h source history.

The Base-metadata-only selector branches are removed. Hourly selection again honors its configured net/LCB/score rank, and new Durable seats again require the configured positive-block fraction. Fixed selection retains its optimized window cursors and gate evaluator. Current gates are rechecked at entry; retained positions still manage exits only.

## Frozen regression windows

All runs are retrospective software checks on the same cached feeds and endpoints as the failed attempts, with Micro maximum hold 15 minutes, 24h Base/config history, configured Last-N, six simulated hours, unchanged costs and thresholds. Primary PF uses settled modeled unit-net returns. These are not venue-owned fills or untouched strategy holdouts. Each run records immutable source/settings/feed hashes and now records passed/selected/taken counts at every selection step.

Final source snapshot: local implementation `4e2b82d668ca0dd4f41dc592b099c472ddb5cb44`. Every entry passed the current exact Base/config/symbol rules; no qualification violations were found. The larger 22-symbol feed is the manifest-verified public source already described in the earlier investigation. A window with no Base-qualified pair must still reject new orders.

## Regression coverage

Every range (Wide, Micro, Minimal, Minimal Plus, Short, General, Long) tests the actual path from a sparse multi-symbol config through fixed/hourly/Durable seating to executed replay orders. Config sample counts and strict Last-N still reject insufficient sets; configured symbol/direction vetoes and strict unknown-evidence checks remain independent. A modeled loss is retained and deterioration blocks the subsequent entry. Repeated symbol slots and exact close/entry boundaries are covered. Separate regressions ensure Base metadata cannot change ranking, Durable stability, Signal history or the original lifecycle snapshot.

| Fixed run | Base passed/evaluated | Sets at start → end | Settled modeled orders | Unit-return PF |
|---|---:|---:|---:|---:|
| micro12-d0 | 4/700 | 1 → 158 | 1 | 0.000000 |
| micro12-d1 | 18/700 | 1339 → 0 | 6716 | 0.058019 |
| micro12-d2 | 10/700 | 821 → 519 | 337 | 0.000000 |
| micro12-d3 | 0/572 | 0 → 0 | 0 | unavailable |
| extended22-d2 | 83/700 | 604 → 42 | 4524 | 0.040518 |
| bounded12 | 7/20 | 342 → 35 | 536 | 0.480370 |

The artificial all-set rejection is removed. In the difficult 12-symbol window 1,339 sets qualify initially and 6,716 modeled closes execute; 3,902 later entries are refused by their current config gates. The larger difficult window executes 4,524 closes. The zero-order oldest window has zero Base-qualified pairs, so retaining its rejection is correct. No replay in this table demonstrates high forward PF. The severe forward losses remain a strategy/evidence blocker, not a passing release result.

The complete source/settings/feed protocols, all recorded validation steps and baseline rejection diagnostics are in `final-window-admission-20261020.json`. Signals and independent Exit are excluded from the engine-only replay; their separate rules are checked by regressions.

## Verification and publication boundary

Final admission/native regression tests pass **47/47** (27 scope/execution tests and 20 native promotion tests). The remaining simulation segment passes **64/64**, including selection-index, Signal gates/protection and ordering. TypeScript, production build and desktop/phone functional UI **4/4** pass. Lint has zero errors and 28 existing warnings. The first build cleanup failed with `ENOTEMPTY`; removing only generated build output and rerunning passed without changing source or data.

The broader 43-file invocation returned exit zero but its log ends before the runner's final totals. It is retained as incomplete verification rather than counted as a complete green core run. A full immutable all-core release run and positive forward/venue-owned evidence remain outstanding. The admission correction is for review in draft PR 182; main and live remain unchanged.

Published code/evidence checkpoint: `5820f50bf520716ca0ca4f6f247f15c06b4cc594` in [draft PR 182](https://github.com/mxssnx-creator/CTS-A-O/pull/182). Its complete Git tree equals local review checkpoint `89ab76f`; later publication notes change documentation only.
