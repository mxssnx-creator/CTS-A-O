# Micro implementation and review evidence

Status: research implementation; **not accepted as a profitable production release**. Read `report.html` or `summary.json`. Modeled PF is 0.218923, with 3 positive / 9 negative hours. The uncapped all-config sizing replay exceeds account margin; these counts are not feasible native fills.

## Current continuation

Current code contains 364 Micro + 364 inverse identities (26 techniques), including four added continuation/activity/direction methods. The financial replay below remains the original frozen 616-ID sample. Its exact-cohort reconciliation in `simulation-parity.json` matches all 49,259 tape/execution closes and unit returns: PF 0.218922909 on both sides, every hour and range equal. The central runtime now checks this identity after each compute. See `../micro-legacy-2026-10-20/README.md` for the recovered older positive window, and `../micro-optimization-2026-10-20/plan.json` for the unscored 728-ID continuation.

## What changed in the archived 616-ID replay

- Micro has 22 methods, 2 profiles and every nonempty 1/5/15m subset: 308 independent IDs. Another 308 inverse IDs reverse the input signal before entry and qualify on their own net returns. The additional existing 114 inverse primitives remain separate.
- Every configured TP/SL/trailing/hold cell is evaluated at Base for these families. Micro, Minimal, Short and General remain separate. Shared cached features do not share qualification or order identity. Worker and local results match for all 616 new IDs.
- Modeled execution costs are capped at 0.0015 round trip, deducted once. Measured owned fees remain actual. The 0.002 distance reference is not an additional transaction fee. Paper adjustment no longer charges an already-net close again.
- A dedicated deadline-based 100ms progress loop checks active execution, without overlapping native steps. Lag and missed deadlines are reported. It retains the official BingX REST endpoints, authentication, rate limits, book-cache policy and WebSocket protocol. No official Node SDK was found in the official BingX repositories; no community package is presented as an official library.
- Concurrent book/account/contract reads share one in-flight request per connection. Revision fencing prevents a read begun before an own order/cancel from returning as current, even before a cache exists or within the same millisecond. Stricter freshness requests remain stricter. Independent lane orders retain bounded batches of four; exchange bans stop subsequent batches.
- Stop/restart epochs fence queued callbacks and late results. Changed settings block new exposure until the new Paper book is complete; owned reductions and protection continue.
- Genuine 5s bars can be built from public trades. Missing periods are not invented. The collected archive is a short compatibility/causality test, not the requested complete 12h high-frequency test. The normal production lanes remain 1/5/15m.

## Reproduce the financial replay

Use Node 24, the repository dependencies and the code whose SHA256 matches the protocol. `reproduction-feed.json.gz` is the exact 20-symbol native history used by the measured replay, compressed losslessly.

```sh
node --experimental-strip-types --no-warnings scripts/micro-study.mjs prepare \
  --feed docs/micro-2026-10-20/reproduction-feed.json.gz --out runs/micro-reproduction
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 \
  node --experimental-strip-types --no-warnings scripts/micro-study.mjs run \
  --out runs/micro-reproduction --workers 2
node --experimental-strip-types --no-warnings scripts/audit-micro-execution.mjs runs/micro-reproduction
```

Before accepting a reproduction, compare its `source.sha256`, `feed.sha256`, `actualSettings`, `actualWf` and window to the saved protocol. A new local path and parent-feed hash are expected when resealing the supplied excerpt; economic settings and the actual feed hash must match. The current protocol is the v7 source reseal after API-cache corrections. The previous frozen protocol and summary are retained as `protocol-v6.json` and `summary-v6.json`; `replay-comparison.json` records identical economic and hourly results. This repetition is not a new holdout. Do not edit an archived protocol or replace losing outputs with a different sample.

## Functional and load checks

```sh
npm run typecheck
npm run build
node scripts/test-core.mjs src/core/indications/micro-family.test.ts \
  src/core/indications/inverse.test.ts src/core/sim/micro-cost-trailing-audit.test.ts \
  src/core/server/execution-progress.test.ts
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_WORKERS=2 \
  node --require ./scripts/lib/core-test-offline-guard.cjs --expose-gc \
  --max-old-space-size=3072 --experimental-strip-types --no-warnings \
  scripts/stress-micro-runtime.mjs --out runs/micro-stress-reproduction
```

The 120-symbol test is synthetic load, uses four Micro protect cells and an injected execution callback, and sends no venue orders. Full four-range financial grids are tested separately on 20 real symbols. Do not combine its synthetic PF with the financial replay.

## Operation

The normal registry/default Focus includes the families. Saved custom Focus is retained: Settings offers an additive “Include Micro” control and type switch. Keep the normal validation and live-readiness gates. Do not promote this losing historical result to live execution. Before any eventual live reload, back up the runtime state and own-order ledgers, rebuild the worker bundle, check actual selected-account balances/holdings, retain native stops, and reconcile unresolved fills. A 100ms timer does not guarantee 100ms exchange latency or eliminate main-thread stalls.

Primary exchange references: https://github.com/BingX-API and https://github.com/BingX-API/api-ai-skills/blob/main/skills/swap-ws-market/api-reference.md.

The final shared-load 120-symbol run completed 2 computations and 100 coalesced requests without overlap, but recorded a maximum execution-check delay of 5.89 seconds during contention. The earlier isolated checkpoint measured 230 ms. Neither establishes a hard 100ms latency SLA; process isolation and real exchange latency remain unverified.
