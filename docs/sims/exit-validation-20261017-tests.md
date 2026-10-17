# Exit implementation verification

Processing-fixture checkpoint:
`2303ee765c566f48b65fa7df05dc52c555f2e1f9`, tree
`4b27345eabc0daa0f3894d89bab1575b1836cda3`.

Production source checkpoint: `9fb5e4c1e68e2e63945139c7d1cad3f1217f6158`, tree
`d4cd5bc4c3e6441f7bf26e170be2bd41c522d8c6`, on
[PR #149](https://github.com/mxssnx-creator/CTS-A-O/pull/149).
Later evidence commits change documentation and the ignore rule for the
reproducible expanded result. The processing-fixture follow-up changes only
tests; production code and the sealed replay source hashes remain unchanged.

## Test gates

The first final plain `npm test` attempt passed scripts and components but its
core processing fixture exhausted a 400-second setup watchdog before any of its
128 toggle cases ran. The CPU-active fixture inherited 2,656 production grid
cells. That failed attempt is retained; a bounded representative fixture is
verified before restarting the full command. It passes 6/6 tests in 201.9 seconds:
setup completes in 155.6 seconds and all 128 toggle combinations pass in 35.4
seconds. A fresh plain full command is now running on the exact checkpoint
above then failed one phone Overview assertion: its readiness probe could match
one digit in the navigation/body before main content rendered, whereas the
assertion requires five digits in main. The follow-up requires main to exist
and contain at least five digits within the unchanged 60-second wait. The final
number, error, overflow and server-error assertions are unchanged. No production
UI code changed. The next full run is pending this test-only checkpoint.
Partial stages are recorded
separately and are not presented as a completed full gate.

| Check | Result |
|---|---|
| Earlier completed script stage | 455 passed, 0 failed, 8 missing-template checks skipped |
| Earlier app/components stage | 78 passed, 0 failed, 0 skipped |
| Latest complete-command attempt | Script stage: 454 passed, 1 phone readiness assertion failed, 8 template skips; exit 1 |
| Fresh `npm test` | Pending matched-main readiness checkpoint |
| `npm run test:core:slow` | Pending, after the normal gate |
| Exit parity with two actual worker threads | 1/1 passed; exact configs and every diagnostic count match local calculation |
| Bounded processing fixture | 6/6 passed, including every original assertion and all 128 toggle masks |
| `npm run typecheck -- --pretty false` | Passed |
| `env -u DATABASE_URL npm run build` | Passed, including packaged core worker; no external database migration |
| `npm run lint` | Passed: 0 errors, 17 existing warnings |
| `git diff --check` | Passed |

The eight script skips are four checks requiring the absent `.grok/app-env.json`
and four requiring the absent `.grok/skills/og` template package. No template
assets were fabricated to turn these unrelated environment checks green.
The two separate slow runtime cases remain enabled in their dedicated command.
All test stages use the before-import offline transport guard. Exchange
credentials are removed from child environments and live execution is disabled.
The extra two-worker run used the sanitized core invocation with only
`CTS_CORE_WORKERS` changed to `2`; a test-process-only after hook confirmed
`poolSize() === 2` and `poolWorkers() === 2` before pool cleanup. It ran the existing
Historic Exit parity case without changing repository source or test files.

The processing-fixture grid uses at most 96 existing representative cells rather
than inheriting 2,656 production cells. Every enabled range retains multiple TP
and SL values, Normal/Trailing modes, both hold horizons and its original floors
and ownership rules. Every indication/lane Base combo, all 128 toggle masks,
audits, exact DCA/Axis independence checks, gates, costs, history, symbols and
full DCA/Axis/Signals configuration remain unchanged. No timeout was increased.
Full production-grid cell identity/cardinality is tested separately by
`ranges.test.ts`. Setup now prints phase diagnostics on failure and cleans up
owned runtime/worker resources. Independent read review found no weakened
original assertion or economic gate.

The final browser functional fixture passed all four assertions both alone and
inside the normal test gate: every desktop/phone page, real computed comparison
rows, settings edits/saves, and no unhandled server errors. The initial readiness
probe now consumes its complete streamed SSR response. No server-error assertion
was weakened. Built Statistics was also visually checked at desktop and mobile
sizes: independent Strategy groups, Normal/Trailing range partitions, Historic
Exit caption, zero horizontal overflow, no app exceptions or local request failures.
External Google Fonts and existing Grok branding requests were unavailable in
this environment and are recorded separately from app failures.

## Correctness scope

- Exit retains its own static-SL, adaptive-SL and trailing configurations, with
  separate long/short history, PF qualification, feedback and order identities.
  Range admission and scaling apply to Normal/Trailing; Exit uses native fitted
  TP/SL/trailing distances and complete indication entries.
- Simulation and held-position processing share completed-bar protection logic.
  Static SL remains fixed; adaptive and trailing stops ratchet without loosening;
  TP changes are bounded and causal. Held IDs, carry/restart state, partial/full
  reductions and duplicate-bar protection are covered by regression checks.
- Worker and local history calculations share a 16-pair bound. Exact indication
  inventory participates in cache identity. The bounded local fallback preserves
  exact configurations and diagnostics while releasing caches on completion,
  generator return and throw. Worker cancellation cannot start local fallback.
- Eight focused real preset tests pass: exact ordered local/worker trades versus
  direct fit/tape/WF calculation; sufficient fetched/native history; lookback-zero
  lane history; sparse 30m execution and report end; unchanged Normal cohort;
  cancellation without result publication and with cache cleanup.

## Performance and market evidence

The dense excursion fixture improved from 156.77 ms to 15.59 ms with exact
reference equivalence and O(hold) deque storage. This is a calculation benchmark,
not a claim that the entire application is ten times faster.

The [final-source regression](exit-validation-20261017-cache-regression.md) retains
all 794 configured pairs and compares every economic field with the frozen
reused-history run. It took 38.1 seconds with 246.5 MiB model peak RSS; the exact
comparison raised process peak RSS to 297.9 MiB. All trades, open marks,
config/step evaluations, hourly/family returns and rejection diagnostics match.

There were 109 settled modeled orders at unit-return PF 19.554, but the 206 open
marks make the combined endpoint diagnostic losing: PF 0.774226 and net -14.416
return points. Only 8/24 hours had profitable settled closes. This does not
establish consistently positive performance. Full protocols, unchanged gates,
costs, losses and empty samples remain in the [simulation summary](exit-validation-20261017-summary.md).

No running instance, live account or venue orders were accessed or changed.
Existing cached preset results with Exit enabled were previously calculated
without Exit. Back them up and re-evaluate them before live reload or reliance on
their PF; this source correction does not certify old cached performance.
