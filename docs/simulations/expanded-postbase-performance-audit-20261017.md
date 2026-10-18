# Expanded post-Base performance audit — 2026-10-17

This is a read-only source audit of the frozen indication implementation inspected at
`acba8770500bacabd0941c0b9b0c7750fd93ae5b`. Later documentation commits may advance
the branch. No indication formula, setting, qualification rule, code or replay input
was changed for this audit. No local simulation, runtime benchmark or additional test
suite was run. Counts below follow the source logic; they are not measured speedups
or total process-memory estimates.

## Shared calculations and retained array payloads

| Component | Shared context arrays per series | Payload per input bar | Lifetime and reuse |
|---|---|---:|---|
| Break | Nine `Int8Array` source/trend arrays and seventeen `Float32Array` feature arrays | 77 bytes | `break.ts` → `context()` memoizes `break:shared:context:v1`; every source, DD window, profile and trend subset reads that context. Base workers retain it between indication groups, then release it at the end of their message. |
| Legacy Micro market relations | Four `Float64Array` fit arrays and one `Uint32Array` contiguous-history array | 36 bytes | `micro.ts` → `microRel()` memoizes `mc:rel:60`. Relation events read the same fit and history arrays within that `SeriesCache`; no fit arrays are allocated for each TP/SL/trailing cell. |
| Relate | Three byte arrays and seven `Float32Array` feature arrays | 31 bytes | `relate.ts` → `context()` and `trendSeries()` share feature/trend arrays within a `SeriesCache`. `relateState()` memoizes the exact subset/mode/profile result; its regular and Micro aliases share that formula result while retaining different registry/config identities. |

These are **context-array payloads only**. They exclude typed-array object headers,
Maps, OHLCV columns, market-reference arrays, other indicator memos, output signal
arrays, tapes/trades, temporary prefix/deque arrays, sliced gap segments, allocator
overhead and worker/runtime objects. Gap processing can temporarily hold both the
full output context and a segment context. These numbers must not be presented as
RSS, peak memory, or an entire lane's memory cost.

`src/core/sim/walkforward.ts` → `buildTapesIter()` computes `entrySignal()` into
`sigs` before iterating the pair's protect cells and strategy variants. Distinct
TP/SL/trailing/hold cells therefore reuse source signals; their separate trade
simulations are required to preserve independent config outcomes. Source, profile,
range and strategy identities are not collapsed by this sharing.

## Release and live-update lifecycle

- `src/core/indications/cache.ts` → `SeriesCache.memo()`, `clear()` and
  `forgetSuffix()` scope caches to a series. `setMarket()` clears dependent
  state when its market source/timeframe/factor changes.
- `src/core/pipeline/pipeline.ts` → `baseRuns()` groups rows by
  `laneOf(ind).base`. With worker `release=true`, it calls
  `clear(["bot:", "break:shared:"])` after each group and
  `clear(["bot:"])` after all groups. Temporary combo signals are not retained
  for every range cell.
- `src/core/server/tapes.worker.ts` creates `makeUniverse(...)` inside each
  message handler. Its `s1` branch calls `baseRuns(..., release=true)`. The
  universe and indicator caches are not a permanent worker-global cache;
  `collectSoon()` also schedules collection after work completes.
- `src/core/server/runtime.server.ts` → `compute()` clears `uStage.caches` and
  the separate full-universe caches in a `finally` block after signal-history
  preparation. `lastUniverse` can retain source bars for detail views, but those
  stage indicator memos have been explicitly cleared.
- `runtime.server.ts` → `fastStep()` selects only seated IDs whose lanes pass
  `fastEntryLaneDue()`, and uses `onlyIds` for the worker rebuild. A 5m/15m
  selected source is not rebuilt on every 1m close merely because a faster
  engine tick occurs. The rebuild has a finite tail (`FAST_TAIL_H` plus its
  configured warmup); this is a full calculation on that tail, not a claim of
  incremental constant-time indicator updates.
- `src/core/indications/registry.ts` → `laneOf()` caps its module-level lane
  memo by clearing after 200,000 entries. `src/core/sim/walkforward.ts` likewise
  caps its signal-config memo. The reviewed indication contexts themselves
  have fixed feature counts and registered parameter sets.

No unbounded cache-retention path was found in these reviewed paths. This is not
a heap-profile result and does not certify a live latency or RSS target.

## Verified bounded repetition

### Partition boundaries can repeat an indication's work

`src/core/server/partition.ts` → `partitionByIndication()` sorts rows by the
full indication ID, computes `ceil(rows / parts)`, and cuts the sorted rows by
that row count. It does not keep a whole indication group indivisible.

An exact arithmetic model of that function gives:

| Input | Requested parts | Nonempty part sizes | Distinct message universes for that same indication |
|---|---:|---|---:|
| Nine bot rows of one exact indication ID | 8 | 2, 2, 2, 2, 1 | 5 |
| Nine bot rows of one exact indication ID | 2 | 5, 4 | 2 |

Since `tapes.worker.ts` creates a universe per message, the split can rebuild the
same source context in each message, including when a single worker processes
the messages sequentially. This affects computation, not the set of combo rows
or their qualification. It is not evidence of duplicate orders.

`src/core/server/partition.test.ts` has a test titled “one indication's combos are
never split across parts (contiguous after the sort)”, but its assertion actually
allows the indication in two adjacent parts for that fixture. Its title and the
stronger introductory comment do not express the implemented guarantee. A large
single group can span more than two parts, as the nine-row/eight-part model shows.

### What `workers=1` means for the frozen study

`scripts/core-22-symbol-study.mjs` → `studyEnvironment()` and
`.github/workflows/expanded-postbase-study.yml` select
`CTS_CORE_WORKERS=1`. `src/core/server/pool.server.ts` → `poolSize()` therefore
returns one. Both `runtime.server.ts` → `compute()` and `presetBase()` still call
`partitionByIndication(..., n * 2)`, so they request **two Base message parts**.
One worker does not remove the message boundary or share an indicator cache
between those messages.

The particular multiple-bots/same-exact-ID example above is not demonstrated for
the frozen study focus. Read-only inspection of the baseline/candidate v4 settings
found 97/109 focus entries and 24 pins; the only base ID with two chosen bot types,
`dir-emax-5-13`, is selected on different explicit lanes. `baseFocus()` appends
legacy Micro IDs under `follow`, and Signal processing uses its own source pairs.
No timing benefit or exact count of duplicated current-study context builds is
claimed without observing the actual partition inventory.

There is nevertheless verified repeated family work within the one-worker path:
the release policy retains `break:shared:` only. `mc:rel:60`, `relate:context:v1`,
`relate:trend:v1`, and Relate state keys are removed between distinct Base ID
groups. A later Micro relation/Relate sibling in the same message rebuilds those
features. This is a bounded memory-versus-computation tradeoff, not an allocation
leak. Break shares its feature context across sibling groups in the same message;
no family context survives into a different message universe.

## Acceptance for a future whole-indication partition change

A future performance-only change should be evaluated independently of the frozen
study. It should:

1. Preserve every input combo exactly once, including stable identity/order
   reconstruction, empty inputs, a single part, more parts than groups, and one
   group larger than a target part.
2. Assert that no exact indication ID spans parts; explicitly decide whether
   sharing should be grouped by full lane ID or by `laneOf(ind).base`, since
   current Base release groups use the latter.
3. Compare worker/in-process Base statistics, range/target passes, config IDs,
   independent validations and resulting executions on identical causal inputs.
   A scheduling change must not select different economic candidates.
4. Extend `partition.test.ts` with the large single-group case and replace its
   contradictory title/assertion contract with the intended guarantee.
5. Disclose the load-balance tradeoff: indivisible groups can leave a worker idle
   or create a longer final job. First/last completion time and peak RSS should
   be measured on a representative workload before claiming a speedup.
6. Preserve cancellation, progress, owner scoping and finite cache lifetimes;
   retaining every formula output across all groups is not a prerequisite.

Relevant existing coverage to retain includes
`src/core/indications/break.test.ts` (“retains independent profile activity
qualification and shares one bounded source context”),
`src/core/indications/micro-rel.test.ts` (gap exclusion, causal prefixes and exact
gapless fit/RSI parity), `src/core/indications/relate.test.ts` (subset causality and
gap warmup), `src/core/server/partition.test.ts`, and worker/preset cohort parity
coverage in `src/core/server/base-cohort.test.ts`. These references identify
existing checks; this audit did not rerun them.
