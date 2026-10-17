# Hosted regular core audit 39077361130 — failed

[Run 39077361130](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077361130),
job `117527184101`, tested commit
`f75026f0d675e95fdf0a5d94e1de2aadf2f4ccb3`, frozen calculation-source SHA-256
`bc7216bd7ab6000b7651a5d83054a16887854097a31847e7701b9a92754693f7`.
The complete regular offline audit finished with **2,086 pass, nine fail, zero
cancelled and two skipped**, across 2,097 tests and 334 suites. Duration was
2,440,894.088435ms (40m40.894s). Its offline runner listed 178 files at
concurrency 1. This is a completed failing audit, not an unfinished test run.

Dependency installation, TypeScript, the client/server/core-worker development
build and 57 serial script regressions passed. The two slow checks and every
20/22-symbol market replay were skipped after the core failure. No candle
scoring, hourly PF, funded-order result or prospective exclusion is established.
The separate edge-repair verification run 39078415117 on source
`e1b28d07657b104fb9710233e3141b51d4ee3bbb9265b6027a8e8787972cc890` remains
active at this checkpoint and is a different source scope. Its completion must
be observed separately; this report neither cancels it nor declares any of
these nine failures resolved.

The five exact logs are preserved here. `manifest.json` records every byte
count/hash, all nine failing test locations, the top 15 suite durations and the
verified source artifact ZIP SHA-256:
`df25f2d3628dd59c0729c870c24b70230506d0f3a410aa60f45c3cd80b625578`.
No signed download URL or private execution ledger is included.

## Nine failing checks

| Test source | Failing check |
|---|---|
|`src/core/adjust.test.ts:111:3`|adjusted protects and paused sets reach tapes and execution|
|`src/core/completeness.test.ts:513:3`|every leaf is referenced by its last path segment or its full path|
|`src/core/processing.test.ts:98:3`|returns a state per bar for every indication, without throwing, and fires on the test series|
|`src/core/server/control-audit.test.ts:220:3`|the backstop is re-priced when lanes with a wider stop join (new stop first, old one cancelled)|
|`src/core/server/control-sizing.test.ts:316:3`|the live status says when the volume factor has no effect, and from which factor it would size|
|`src/core/server/control.test.ts:522:3`|converges to the targets on every step over 400 random steps and never touches foreign positions|
|`src/core/server/control.test.ts:1124:3`|unknown account equity or a missing price never closes a held position|
|`src/core/server/runtime.test.ts:442:3`|keeps the event loop responsive during a compute|
|`src/core/signal-trailing-only.test.ts:387:3`|a no-TP lane cancels an aggregate target while capped siblings keep their own exact target|

## Slowest 15 top-level suites

These are recorded named suite durations, with nested suite records and the
repeated failure recap excluded. File paths locate the source for a prospective
sharding plan; several rows can share a file. These times are not independent
end-to-end file timings and must not be summed as a new measured wall time.
The runtime suite includes the failing responsiveness check. Moving a test to
another shard does not resolve its assertion.

| Suite | Seconds | Result | Source locator |
|---|---:|---|---|
|runtime coordination|936.440|failed|`src/core/server/runtime.test.ts`|
|every type and range reaches the Real stage and the paper book|258.741|passed|`src/core/book-coverage.test.ts`|
|processing through the stages, every strategy type, every toggle combination|210.765|passed|`src/core/processing.test.ts`|
|Block matrix at the Real stage|192.370|passed|`src/core/sim/block-matrix.test.ts`|
|self-healing|135.936|passed|`src/core/server/heal.test.ts`|
|Base-stage validated count|91.084|passed|`src/core/server/base-count.test.ts`|
|progress reporting|73.031|passed|`src/core/regression.test.ts`, `src/core/server/runtime.test.ts`|
|fast loops|70.661|passed|`src/core/server/fast.test.ts`|
|server function contract: every field a page reads is returned|56.027|passed|`src/core/api-contract.test.ts`|
|memory guard in the runtime|44.042|passed|`src/core/server/memguard-runtime.test.ts`|
|memory fallback: carried range on new bars|41.932|passed|`src/core/server/memguard-carried.test.ts`|
|trading end to end: engine → paper book → live control → venue|38.870|passed|`src/core/server/trading-e2e.test.ts`|
|stuck requests never stop the live step|38.212|passed|`src/core/exchange/stuck-requests.test.ts`|
|pipeline|33.150|passed|`src/core/pipeline/core.test.ts`|
|worker pool|32.483|passed|`src/core/server/pool.test.ts`|

Keep the frozen source and failed evidence intact. Corrections are being
consolidated separately into a future v5 source before the first market score.
They need focused reproduction, complete regular/slow verification and newly
sealed matching study protocols. No merge, live deployment/reload, exclusion
or market-performance claim follows from this audit.
