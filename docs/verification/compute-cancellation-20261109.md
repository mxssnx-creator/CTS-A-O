# Owned research cancellation — 9 November 2026

Stopping a runtime, disposing it, resyncing its universe or changing its economic settings previously left its
Base and tape-building worker calls running. Only the final Real research worker received cancellation.
The abandoned jobs could keep both active and queued pool slots, delaying the current revision. Background
Base config counts had the same problem: cancellation fenced publication but did not stop the worker call.

Each computation now owns a cancellation signal from preparation through Base, independent Exit/Signal
history, tape construction and Real simulation. Replacement aborts only that computation's jobs and closes
its local generators and unpublished history. Cancellation cannot trigger the main-thread fallback or error
backoff. Background Base counts also abort their old call before running the replacement. Timing-only and
unchanged settings preserve current work; research replacement does not change the live generation.
Completed cohort reporting finishes after atomic publication. Held quantities and protective stops remain owned.

## Reproductions and verification

The new actual-runtime worker reproduction failed in all four cases on the previous source: stop, settings,
resync and disposal each left unfinished Base work beyond the one-second test deadline. The separate Base
count reproduction also failed before its fix. They pass after the fixes. The runtime reproduction holds an
unrelated worker active, cancels both queued and running owned work, verifies unchanged held protections,
rejects worker-failure/local fallback classification and confirms that no partial computation publishes.

Measured cancellation latency in one bounded synthetic run: stop 2.961 ms, settings 3.484 ms, resync 2.730 ms,
disposal 2.784 ms. This measures cancellation/termination, not order execution or whole-cycle latency.
Its input is one symbol with ten hours of artificial one-minute bars. No account is started.

- 115 focused checks pass across cancellation, Base counts, publication, worker retirement/ownership,
  worker/local Real parity, incremental/full processing and Signal history.
- Micro indication/context/order identity, cost/trailing and predecessor checks: 37 pass and one existing
  expected failure remains. That failure still proves raw conflict-rejected wins can contaminate later admission.
- Typecheck and production/core-worker build pass. Scoped lint has no errors and five pre-existing unused-import warnings.
- The unchanged original slow storm test passes in 493.613 s (490.497 s cold compute), below its original 900 s
  wait ceiling. The prior hosted run 42545646689 timed out. No fixture, gate, history, timeout or concurrency was
  changed to obtain this result. This legacy synthetic lifecycle stress is separate from a bounded market study.

The full slow suite and hosted checks are recorded in the publication evidence; do not infer their status from
the single storm result. The cold stress log records a 169 ms maximum event-loop delay and 129 ms worst recent
slice; those are not a live-order latency guarantee or an under-500 ms full-compute result.

Commands:

```sh
node scripts/test-core.mjs src/core/server/compute-cancellation.test.ts src/core/server/compute-worker-retirement.test.ts src/core/server/compute-publication.test.ts src/core/server/base-config-job.test.ts src/core/server/pool-progress-timeout.test.ts src/core/server/owned-worker.test.ts src/core/server/research-real.worker.test.ts src/core/server/cycle-incremental.test.ts src/core/signals-history-matrix.test.ts
node scripts/test-core.mjs --slow
npm run typecheck
env -u DATABASE_URL CTS_CORE_STATE=off CTS_CORE_AUTOSTART=0 CTS_CORE_LIVE=0 npm run build
```

## Trading scope and remaining work

No preset, PF threshold, fee, position size or trading account was changed. No new market replay or verified
venue PF is reported. The persistent Base → Main → Real predecessor adapter remains incomplete in runtime
and walk-forward admission. The older WIP's warming-pass model helper is not a substitute for that architecture
and was not transplanted or enabled. No x01 deployment/start occurred.

Unchanged OLD 8–9 October cohort: Base 143/1,398 (10.2289%); post-Base historical contexts 405/1,276
(31.7398%), finite mean historical PF 17.399524089 plus six no-loss contexts. Subsequent funded-model PF
0.273050873; positions 52 opened / 49 closed / 3 held and orders 3,116 / 3,108 / 8. That cohort used old
economics and cannot validate today's configuration. Current post-Base and venue execution PF are unavailable.

CTS-G and CTS-A's earlier independent Micro fixes remain separate releases (G PR #157 and A PR #16).
Neither a passing mechanical regression nor another project's results prove profitable future execution.
