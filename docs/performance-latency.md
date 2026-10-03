# Latency and compute speed (October 2026)

The live x01 desk held its event loop for 2–3.5 s at a time, computes took 7–23 minutes, and exchange calls timed out
or were refused with "timestamp is invalid" (signed, then sent seconds later). This page records what was measured,
what was changed and what was tried and rejected.

## How it was measured

- A main-thread CPU profile (`node --cpu-prof`) of a session at x01's scale: 21 symbols, every config its own seat,
  x01's strategy settings, micro off (`scripts/core-session.mjs`, fixed window ending 2026-10-02 23:00 UTC).
- The busy stretches of the main thread and the functions inside the long ones (a small analyser over the
  `.cpuprofile` samples), then each compute phase's longest slice (`status.phases`, now also in the session's raw
  output: `engine.loop`, `engine.phases`, `engine.stalls`).

## Causes and fixes

| cause | share / size | fix |
|---|---|---|
| walk-forward: every candidate scanned every open order 5 times (dupe, per symbol, total, per side, positions); open / pending orders kept in sorted arrays (linear insert, O(n) shift) | 85–90 % of the long stretches; single stretches of 11–18 s | `OpenCounts` (O(1) counters) and `ExitHeap` (min-heap by exit, then insertion order). Identical results: A/B against the former code with binding caps, coordination and the hour guard; property tests |
| memory guard forced a full GC every second under soft pressure | x01: 2–2.7 s stalls back to back | at most every 30 s and only after the heap grew 256 MB / 25 % |
| a memory abort marked the workers broken: the compute continued in-process on the main thread, permanently | a session crawled for 20 min | the abort aborts the compute; real worker failures retry after 10 min; no compute starts under hard pressure (lighter level, then a backoff wait) |
| tick: every paper position's mark-to-market rewritten every second (17k rows on x01), the closed P&L re-summed and every order key rebuilt every 100 ms | ~16 % of busy time | rows every 30 s (nothing reads them back), sums and units memoised per paper book, one stop-hit write per tick |
| control status held 3.3 MB of lane order ids, cloned on every 100 ms step and rewritten to the state file every second | — | a count per lane (only the count was ever read) |
| end-of-compute summaries in one piece: pre-historic stats, signal status, paper rows (one transaction of 100k+ upserts), sizing | 0.2–0.9 s each | generators driven in slices; rows in 2,000-row transactions; sizing events as packed integers sorted natively |
| the walk-forward feed sorted at the end | one long slice | collected in exit order as it settles (the heap pops in that order) |

Signed exchange requests refused for a stale timestamp executed nothing; they are now signed again once.

## Results

Session at x01's settings, 21 symbols (same trades and PF before and after, 38 / 38 checks):

| | before | after |
|---|---:|---:|
| full compute | 352 s | 98 s |
| session | 805 s | 359 s |
| event loop max / p99 | 1.7 s / – | 1.0 s / 152 ms |
| longest walk-forward slice | 11–18 s | 0.3 s |

x01 live (21–25 symbols, one worker): compute 433–533 s → 91–136 s, event loop max 1.5–3.5 s → 0.7–0.9 s
(p50 21 ms, p99 235 ms), no stale-timestamp refusals since.

## Second pass (worker phases, the tick)

A per-phase measure of the main thread's own time while workers run (`mainMs`, event-loop utilisation) showed the
Tapes phase costing the main thread 38 s of 64 s at 21 symbols. Splitting it:

| cause | fix |
|---|---|
| every received or allocated ArrayBuffer costs the main thread ~20 µs plus collector work (60k buffers: 1.15 s vs 0.10 s for the same bytes in 150 arenas); every tape had its own | a worker reply packs all its tapes into one arena (`packArena`): one buffer per reply instead of one per tape |
| the 100 ms tick marked every paper position at every tick (a price lookup and `Date.now()` each: 200k calls a second) | positions grouped by symbol once per book; a symbol is marked again only when its price moved (identical marks and stop checks) |
| the signal index built a key string per trade and grouped without yielding | keys and buckets resolved once per symbol slot; slices by trades processed |
| the paper step's opening passes over every tape ran back to back | yields between them |

Same 21-symbol session: event loop max 0.90 → 0.66 s, Base main-thread time 5.2 → 0.9 s, signal tapes 0.64 → 0.07 s;
the Tapes phase still costs the main thread ~35 s (100k tape objects received and kept; moving the compute into a
worker is the remaining step).

## Tried and rejected

- **A larger young generation** (`--max-semi-space-size`). Published results show large gains for allocation-heavy
  servers (scavenge time 30 % → 2 %, +20–27 % throughput). On this workload: 64 MB — compute 104 s vs 98 s, loop
  max 929 vs 1,040 ms, p99 269 vs 152 ms; 128 MB — 101 s, 914 ms, p99 288 ms, +400 MB RSS. No gain: the remaining
  cost is not young-generation collection. Not applied.

## What remains

- Stalls of 0.3–0.9 s while worker replies arrive in the Tapes phase (buffers are already transferred, not copied):
  most likely major collections of a large old generation. Fewer long-lived small objects (the walk-forward feed
  and its keys, per-tape objects) is the next step; typed-array columns keep data out of the GC's object graph.
- Moving the whole compute into a dedicated worker (the main thread keeps only the live tick and the exchange) would
  remove compute stalls from the live path entirely; it is a larger change to the runtime.

## Sources

- [NearForm: the impact of --max-semi-space-size on garbage collection efficiency](https://nearform.com/digital-community/optimising-node-js-applications-the-impact-of-max-semi-space-size-on-garbage-collection-efficiency/)
- [Platformatic: V8 memory management and GC tuning](https://blog.platformatic.dev/optimizing-nodejs-performance-v8-memory-management-and-gc-tuning)
- [nodejs/node #42511: increase the default max semi-space size](https://github.com/nodejs/node/issues/42511)
- [Node.js docs: worker threads (transfer vs SharedArrayBuffer)](https://nodejs.org/api/worker_threads.html)
- [Leapcell: understanding and taming event loop lag](https://leapcell.io/blog/understanding-and-taming-event-loop-lag-in-node-js-applications)
- [Shift Asia: garbage collection in Node.js (typed arrays outside the object heap)](https://shiftasia.com/community/understanding-garbage-collection-in-node-js/)
- [PowerSync: SQLite optimizations (transactions, prepared statements)](https://powersync.com/blog/sqlite-optimizations-for-ultra-high-performance)
