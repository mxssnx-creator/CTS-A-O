# Signals progression audit — 21 October 2026

The recovered fixes are published in [PR 189](https://github.com/mxssnx-creator/CTS-A-O/pull/189). The user explicitly authorized push and merge. Use that PR's checks and merge record for the final repository-wide CI/merge outcome; the table below records fresh local verification, not a claim that every repository test ran locally.

Tested local code: `ef0a9275247e22339b17e33f4847e77893fc26d9`.
Published code: `534492d622db6be370079e08b94fdbb2dfbb566c`.
Both trees: `9442ef46aef790ad27eb68c47af26ad5ef7c0479`.
Base: `fafdea2f5ebe8c903a16f2edd8be34606f746c2f`.
Following test-harness and lifecycle-reference fixes leave production source unchanged; their exact commits and final CI results are recorded in PR 189.

## Corrected behavior

1. The full local/fallback tape builder now uses the same independent Signal universe as workers, instead of ordinary strategy history. The controlled regression previously produced 17 local closes versus 33 worker closes for the same config; their complete columns, pending/open positions, activation keys and modeled executions now match.
2. Incremental Signal rebuilds reconstruct the configured independent history from the current candle store and preserve the replay evaluation boundary.
3. Incremental coordinators use their own protections and entry floors, separately from ordinary Signal sources. Exact config IDs, tape columns and open/pending records survive rebuilds on worker and local paths.
4. Foreground historic coordinator fitting receives the enabled ranges' own PF floors, matching the existing preset-backtest policy. Disabled ranges receive no variants; a winning sibling cannot override another range's threshold.
5. Historic fitting emits bounded, monotonic pair-weighted progress through MFE sampling (25%) and candidate evaluation (75%), with yields between candidates for generation/memory checks. Local and worker paths share the contract; 100% is reported only after fitting completes. This is work progress, not an elapsed-time estimate.
6. UI counts now distinguish qualified range/config variants from PF-tested candidates and include Normal TP/SL exits. The Settings save test waits for initial finite requests before asserting button state.

## Fresh local verification

| Check | Result |
| --- | --- |
| Signals, simulation, worker pool, stages and memory cleanup: 21 files / 43 suites | 294 passed, zero failures/skips |
| New actual-runtime regression cases (included in 294) | 3 passed; all 3 fail against the original runtime |
| Complete-job progress reporting | 3 passed |
| Full incremental lifecycle fixture | 2 passed; 49,719 tape states and matching decisions covering 7,446 open positions across three light cycles |
| Functional UI: every computed page on desktop/phone, Settings edit/save/restore, server errors | 4 passed |
| TypeScript | Passed |
| Production app and packaged worker build | Passed; DATABASE_URL unset, migration skipped |
| Changed-file lint | Zero errors; five pre-existing unused-import warnings |
| Development and rebuilt Settings render, desktop/mobile | Visible content, no console/page errors or overflow; no baseline divergence; all four screenshots visually inspected |

Final broad suite duration: 120.30 seconds. Complete-job progress: 10.23 seconds. Functional UI: 43.16 seconds. These are test durations, not live cycle latency measurements.

The production worker contains the new candidate-evaluation progress code and worker progress messages. Worker SHA-256: `e6f95d8ecd2f4c08d8b3e056e6898ce86e7d678fb8653bb17e0a564fc40817dd`.

The 294-test command selects: signal-accept-index, signal-coordination-feature, signal-coordination, signal-discovery, signal-hist, signal-pf15, signal-research-sources, signal-trailing-only, signals-activation-report, signals-e2e, signals-history-matrix, signals-independence, signals, sim/signal-fixes, sim/signal-gates, sim/signal-stop-policy, sim/signal-window, server/signal-progress, server/stage-lifecycle, server/pool, server/mem-lifetime (all under src/core, .test.ts). Progress command: `node scripts/test-core.mjs '--test-name-pattern=progress reporting' src/core/server/runtime.test.ts`.

## Recovery and limits

The original unpushed audit commits (`65da64ce`, `f6493f03`) disappeared when the workspace was restored. This publication is a recovery against the latest available main with new code commits and freshly repeated verification; it does not rely on lost logs or claim byte identity with those lost commits. The first reconstructed progress test used the wrong label prefix; it was corrected before the final green run. Initial browser attempts failed because the restored test environment lacked usable fonts; using the installed system font configuration resolved the crash. The first render baseline sampled a loading screen; waiting for the actual Settings Save control produced matching final renders. Product code was not changed to hide these harness failures.

The completed legacy cycle-incremental run exposed its stale reference calculation: Signal tapes were rebuilt on ordinary strategy history (271 actual closes versus 61 reference closes for one config). Its reference now uses independent Signal history and separate coordinator protections. The next run matched tapes but exposed a stale seat assertion: light cycles explicitly reuse the hour's selection, so the test now asserts exact retained picks/eligibility rather than running a separate selection that omits validated/range policy. The fixture pins 6h evaluation plus 6h simulation and 72h independent Signal history instead of inheriting production 336h/48h defaults. All three cycles, all tape columns/open/pending comparisons, original minimum sample assertions and exact paper-decision comparisons remain. The final run passes 2/2 in 134.94 seconds, comparing 49,719 tape states and decisions covering 7,446 open positions. Follow-up typecheck and lint pass. Complete default/slow CI remains recorded in PR 189. The new bounded runtime tests already exercise the actual rebuild method against full worker/local results.

Initial PR CI passed typecheck, lint, production build and the independent-config workflow, then stopped on four cancelled UI tests: Vite dependency re-optimization left speculative module requests pending after document replacement. The request observer now waits for finite document/fetch/XHR requests while keeping browser console/page-error checks, computed-page assertions and Settings edit/save/restore. All four local UI checks pass with this correction (45.64 seconds); follow-up typecheck and changed-test lint pass. Existing strict economic gates, costs, losses and unknown-evidence rules are unchanged. No research source seal was rewritten.

A passing correctness suite does not prove every-hour profitability, a sub-500ms full-history refresh, or correct venue-owned live execution. The test feed is deterministic synthetic data. No live instance, database, settings or venue orders were changed in this audit. Publishing/merging source alone does not update an existing running process: a verified deployment must back up settings/durable state/database, rebuild the worker, restart the correct instance, verify its commit identity and reconcile owned positions. The existing handoff records unavailable authenticated host/deployment access; that must be resolved before claiming these fixes are active on the remote live instance.
