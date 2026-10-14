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

## Memory (14 Oct)

Operator, 13 Oct: "Optimize for lower mem usage systemwide." On this 16 GB host the desk ran 3.4–5.1 GB RSS (4.56 GB
at +10 min after every boot), `runtime.test.ts` reached 7.3 GB, eval children ran two at a time, and all 8 desk
memory-fallback steps of 13 Oct came while an eval or a session ran beside the desk. A read-only audit (41 of 60
findings kept, each traced in code) set the steps. Each step changes where and how long memory is held, never what
is computed. An adversarial review of the commits (4 reviewers, every finding verified against the code) found 3
defects and 4 smaller gaps, all fixed with tests that fail before the fix (027248e).

**Identical, checked.** `scripts/core-golden.mjs` is a fixed synthetic runtime: end 2026-10-13 12:00Z, 4 symbols,
every lane, Micro on, the classic signal sources. It computes three times, the third at the lightest fallback level,
and hashes every component with sha256: Base and Main summaries, ranked, armed, the tape columns, open and pending
orders, the simulated run's trades / stats / steps / skips, the paper selection, positions and book, listings and
disabled signals. `--check` compares with `scripts/core-golden.json`. Every commit reproduces `7567d622…` for
CTS_CORE_WORKERS 0, 1 and 2. Eval sessions on the code before the work (ee4be88) and after give identical dumps
apart from timings (12 symbols: 15,384 trades). An eval-gate window gives an identical output apart from its compute
time and the new VmHWM field.

| where | change | measured |
|---|---|---|
| tests | `CoreRuntime.dispose()`: the stall watch, healer, memory timer, progress timeout and loop monitor kept every stopped runtime reachable. `trackRuntimes()` does stop → close the pool → dispose. The pool's idle timer no longer holds its caller's context. Compare runs are off unless a test checks them. The test command lines get `--max-old-space-size=4096 --heap-growing-percent=50 --expose-gc` and oom_score_adj 1000 | runtime.test.ts **7.3 → 1.3 GB** peak; the whole core suite (two files at a time) **2.2–2.4 GB** summed |
| eval runners | Children are admitted by memory, one at a time (`admitter`: MemAvailable − 3,000 MB ≥ expected peak × children; the expected peak is the largest VmHWM of a child that finished, 7,000 / 4,000 MB to start). VmHWM per window goes into the summary. The feed's start is read in 8 MB chunks; the 318 MB feed was held as a Buffer for the whole gate. Each window is reduced as it finishes | one 12-symbol window: parent **428 → 135–173 MB**, child **1,511 → 1,302–1,325 MB** |
| sessions | The feed store is pruned to what the engine reads: tfMin and the ranking's 1 h bars, up to the cut. A `--dump-only` run keeps tape trades only with `--tape-trades`. The runtime is disposed and its pool closed, then collected once the engine has returned | 6-symbol dump-only session: heap after the collection **427 → 22 MB**; the session's peak 12 symbols **1,563–1,589 → 1,409–1,423 MB** without flags |
| eval child flags | `--heap-growing-percent=50`, no `--expose-gc`. `--expose-gc` makes each worker collect after every reply: at 60 symbols that cost 10 % more compute (Tapes 11.5 → 17 s) for 76 MB less | 60 symbols, VmHWM: none 1,838 · growing step 1,781 (same compute) · both 1,705 MB |
| desk boot | The candles are streamed from SQLite as arrays (`CoreDb.iterate`, `setReturnArrays`); before, 1.55 M row objects of ~670 B were built at once | x01 at +10 min after the boot: **4.56 → 2.53 GB** RSS (heap 0.58 GB, array buffers 0.22 GB, native 1.21 GB; 3.82 GB at most in those 10 min). Restarted 06:02:44Z with SIGUSR2, positions kept |
| desk computes | At the swap, the previous tape set's index and live books are released. The universe's indicator memos are cleared after the signal history, and also when it aborts. Base and the tapes share one bar set. `results.by_sym` is no longer stored (no reader). Preset backtest runs are slimmed. Signal acceptance counts are Int32, with scratch freed per group. The status guard replay feeds only the lists its count reads. Signal candidates share one key per pair × symbol × direction. Worker replies are interned. Main keeps trades only for the two runs per leader that Validation can take | x01 over the 41 min after +10 min: RSS low / median / peak **2.47 / 2.57 / 3.36 GB** (the 86 min before the restart: 3.70 / 3.86 / 4.41 GB). The first 8 computes: event loop max 424–1,138 ms, median ~830 (the 20 before: 984–1,612, median ~1,300); compute 176–195 s (165–184 s before, a series already drifting up: 155 → 185 s over the hours before; the eval runs showed the new code no slower) |
| worker | After 1 s without a message, a last-resort major GC returns the pages (a plain `gc()` leaves them committed) | microbench **899 → 84 MB** RSS |

The desk keeps `--expose-gc` and its per-reply worker collection, unchanged since 6 Oct.

**Not done, on the record:**
- the progressive start in one batch for replays: it changes eval results;
- base-count stopping at Base: the allSets tape stage would no longer run end to end;
- a main-thread last-resort GC: 2–2.7 s pauses;
- lower heap or worker limits: a worker OOM moves the compute onto the live thread;
- malloc_trim or jemalloc;
- tape layout rewrites;
- releasing the signal and non-carried tapes after the paper step on x01: the live step reads the selected, held and
  signal tapes during computes.

**Next:** the candles in their own file DB (−120 MB native) and candle columns (−200 MB heap, ~11 M fewer objects per
major GC), each after the desk measurement.

## Sources

- [NearForm: the impact of --max-semi-space-size on garbage collection efficiency](https://nearform.com/digital-community/optimising-node-js-applications-the-impact-of-max-semi-space-size-on-garbage-collection-efficiency/)
- [Platformatic: V8 memory management and GC tuning](https://blog.platformatic.dev/optimizing-nodejs-performance-v8-memory-management-and-gc-tuning)
- [nodejs/node #42511: increase the default max semi-space size](https://github.com/nodejs/node/issues/42511)
- [Node.js docs: worker threads (transfer vs SharedArrayBuffer)](https://nodejs.org/api/worker_threads.html)
- [Leapcell: understanding and taming event loop lag](https://leapcell.io/blog/understanding-and-taming-event-loop-lag-in-node-js-applications)
- [Shift Asia: garbage collection in Node.js (typed arrays outside the object heap)](https://shiftasia.com/community/understanding-garbage-collection-in-node-js/)
- [PowerSync: SQLite optimizations (transactions, prepared statements)](https://powersync.com/blog/sqlite-optimizations-for-ultra-high-performance)
