# Signal evaluator performance — 2026-10-21

## Change

`configEval` evaluates each Signal config for every unique symbol and both
directions. It used to serialize the same cache signature for each
symbol-direction context, then allocate intermediate arrays to collect and
reduce the passing contexts. The evaluator now builds that signature once,
aggregates the same results in one pass, and preallocates only the returned
context array. Symbol order, direction order, sum order, first failure, gates,
336-hour Signal history, and returned context contents stay unchanged.

Code commit: `03eeeb18a7689b9384f8925c8da725f5f940b43f` (parent
`8249317c21e9821d250b32af1b39c8118543a828`). No PF formulas, floors, Last-N
checks, execution logic, or economic settings changed.

## Measured result

The committed reproduction script is
[`scripts/perf/signal-eval-bench.ts`](../../scripts/perf/signal-eval-bench.ts).
Each process evaluates 2,000 deterministic Signal configs against 12 symbols,
both directions, 16 closes per context, and a configured 336-hour lookback for
five passes. The fixture is synthetic performance input, not market or trading
evidence; its all-pass count must not be read as profitability.

Three paired processes on the same Node 24.19 runtime produced:

| Metric | Parent | Optimized | Change |
|---|---:|---:|---:|
| Median warm-pass time | 706.89 ms | 528.54 ms | 25.2% faster |
| Highest process RSS across three runs | 424.14 MiB | 387.66 MiB | 8.6% lower |
| Evaluations / contexts per process | 10,000 / 240,000 | 10,000 / 240,000 | same |
| Output SHA-256 | `51023a46c164150b066033cec70c41a14a81a9a2a3751066e404d9758072599d` | same | exact |

The RSS figure is the maximum observed across the three benchmark processes,
including fixture allocation. It shows the effect on this workload, not a
system-wide memory guarantee. The repeated full-runtime cold-compute probes
did not finish within their diagnostic time budgets, so no end-to-end cycle
speed or live-trading performance claim is made.

Reproduce from the repository root:

```sh
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 \
  node --expose-gc --max-old-space-size=2048 \
  --experimental-strip-types --no-warnings \
  scripts/perf/signal-eval-bench.ts
```

## Correctness checks

The final local regression run passed 146 tests across these eight files:

- `src/core/signal-pf15.test.ts`
- `src/core/signals-independence.test.ts`
- `src/core/signals-e2e.test.ts`
- `src/core/signals-history-matrix.test.ts`
- `src/core/server/compute-publication.test.ts`
- `src/core/server/cycle-incremental.test.ts`
- `src/core/sim/validation-memory.test.ts`
- `src/core/sim/selection-index.test.ts`

These cover exact symbol/direction validation, full 336-hour Signal history,
Last-N behavior, full-versus-incremental parity, atomic compute publication,
and compact validation summaries. Full GitHub checks remain the merge gate.
The local workspace lacks the linked `node_modules` target, so `tsc` was not
available locally; the hosted typecheck/build/lint jobs must pass before merge.

No deployment, live reload, or venue order was run.
