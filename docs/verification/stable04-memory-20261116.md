# Stable-04 memory verification — 16 November 2026

The previous twelve-symbol replay aborted under the host memory guard. A retry was interrupted before Base
finished, so neither attempt established post-Base PF, validation percentage or executed PF.

## Fixes

- The runtime memory guard previously checked only the process's own cgroup. An unlimited child or one with a
  generous limit could hide a tighter parent, even though the parent also accounts for sibling usage. It now chooses
  the lowest available headroom among visible cgroup-v1/v2 ancestors, treats a zero limit as binding, and reports the
  scope responsible for the estimate. Existing cache-credit rules are unchanged. Missing/unreadable limits remain
  unknown; this is not a claim that limits outside the visible hierarchy can be detected.
- An optional process RSS ceiling (`CTS_CORE_MEM_RSS_HARD_MB`, with
  `CTS_CORE_MEM_RSS_SOFT_MB` defaulting to 85% of the ceiling) includes worker threads and native allocations in
  pressure decisions and diagnostics. It also limits automatic worker sizing. No RSS ceiling is assumed when the
  setting is absent; a configured ceiling is an additional guard, not proof a kernel kill is impossible.
- History spills previously used `/tmp` unconditionally; on this host `/tmp` is a RAM-backed tmpfs and contained
  approximately 2.8 GB of spill files. When temporary storage is RAM-backed and the application working directory
  is known to be disk-backed, spills now use `.cts-core/history` there. `CTS_CORE_HISTORY_DIR` explicitly overrides
  the location. When no disk-backed location can be selected, the original temp location remains with a warning.
  Spill-directory creation failures are classified as storage errors, preventing an unbounded worker fallback.
- Automatic spill cleanup now checks the Linux PID namespace as well as the PID. The same shared temp filesystem can
  be visible from different namespaces, so an apparently absent PID was not proof that another session had stopped.
  Unscoped legacy spills and spills from another or unknown namespace are preserved for safe manual identification.
- Automatic Block candidate windows previously stored separate copies of identical accepted close histories. They
  now share one history with sufficient retention for the longest window, while preserving independent pauses,
  source-specific evidence and entry-time decisions. Legacy unstamped candidates are all judged before the incoming
  close is recorded. Scoring also reads each bounded tail directly instead of copying it on every close. No
  configurations or trade outcomes are discarded to achieve this reduction.
- Four disposable symbol, direction, evaluation-view and Signal index caches previously bounded only their key
  counts. They now account for retained typed-array bytes, with a combined default budget of 128 MiB divided evenly
  among the caches (`CTS_CORE_DERIVED_CACHE_MB`, 1–1024 MiB). Oversized values remain available to the current
  calculation and are recomputed on demand rather than retained. The budget does not include source histories or
  temporary buffers in an active calculation and is not a total-process memory limit.
- Chunked session reports now project allocation rows as they are written instead of building a second full array
  of per-order objects. The non-chunked format remains unchanged, and the streamed sidecars retain all rows in order.
- Worker replies now intern repeated tape and open-position strings as each reply is retained, instead of waiting
  until the full tape cohort has accumulated. The final merge still preserves pair order and exact position data.

## Evidence

The ancestor cases failed on source tree `474bfaf575c390791266f3e633af39935edbdf5d` and pass with the fix. The
existing cgroup cache, fallback, Block, recovery and admission tests also pass. The isolated retained-heap benchmark
(`node --expose-gc --experimental-strip-types scripts/perf/benchmark-block-memory.mjs 2500 40`) held 2,500 config
histories across 40 closes each: measured heap growth was approximately 8.94 MB before and 1.90 MB after, with the
same `82b07e43ee70ade938e9f56b0ae5da5b34c80c3aa6d6b5bf2bbd25e47c6b2596` decision checksum. These are one local
measurement, not a claim about the full application's peak memory or profit.

The deterministic trace in `scripts/perf/compare-block-trace.mjs` produced the same
`cdd5bf52db44f577411d3ef889c75904ccbd9e8aa0751b3e3b56a33a6bad01c4` checksum on the baseline and modified code.
Its scenarios include both history sources, independent and shared windows, timed and fixed windows, pauses,
unknown returns, and stamped and unstamped closes.

With the derived-index budget set to 1 MiB, six tapes of 20,000 closes each exercised cache eviction. Recomputed
symbol, direction and Signal evaluations matched their original results, and the recorded retained buffers in each
index cache stayed within its quarter of the budget.

History-storage tests verify disk-root selection, configured root use by both tapes and transfer manifests, exact
history round trips, and preservation of legacy and foreign-namespace spill directories.

The chunked-report test confirms allocation projection is lazy and repeatable; a complete sidecar replay also
matched the former hydrated report and standalone HTML evidence exactly.

On a local 20,000-tape fixture with four open and four pending rows per tape, early interning reduced retained heap
from approximately 39.0 MB to 24.5 MB with identical data SHA-256. A runtime test exercised the actual worker-reply
path. This isolated measurement is not a full-run RSS result.

## Full replay

A fresh offline 12-symbol replay was run on remote commit `5e901cf53c96ef27f2813579650c97f833d1287f`, source tree
`474bfaf575c390791266f3e633af39935edbdf5d`, using the causal feed and 24-hour prehistory / 24-hour simulation described
in `stable04-cadence-replay-20261116.md`. It uses three workers, 192 MiB retained-history and 64 MiB decoded-cache
budgets. The dump contains ever-seated or executed histories rather than every rejected configuration; the engine
evaluation itself is unchanged. This run started before the fixes above. It received SIGKILL after 1,271 seconds
at approximately 79% of strategy tape construction; peak child RSS was 3,828,148 KiB. Host available memory was low
and another verification task briefly ran concurrently, but the kernel's precise kill reason is unavailable. No
completed hourly results, post-Base PF, validation percentage or execution PF were produced. A subsequent retry must
use fewer workers and reserve memory for the process rather than treating this partial run as an acceptance.

A further retry started on commit `1a9cb896b74d3b3a1c4e47bcdd4534315d520ed8`, tree
`250630be3081445684c72f0841700dc95251bc96`, with two workers, 128 MiB retained-history, 32 MiB decoded-history,
64 MiB derived-index budgets and a 3,200 MiB RSS hard guard. It retains the same 12-symbol feed and simulation
windows. It was deliberately stopped at 96% of Base after identifying the RAM-backed spill location; the memory
guard did not fire. This partial attempt produced no result. The next retry uses disk-backed spill storage; the
streamed-report change can render its raw dump without recalculating trades.

The disk-backed retry started from remote commit `500c54d56081f01f4987c919b11111cb5917f8fb`, tree
`c6b35f554ae7c8a70d0f3e50144b2418c1586e0e`. It uses the same frozen feed, 12 symbols, 24-hour evaluation history,
24-hour simulation and seven-day Signal warmup. Two workers use 128 MiB retained-history, 32 MiB decoded-history and
64 MiB derived-index budgets, with an RSS soft guard of 2,800 MiB and hard guard of 3,200 MiB. Its private spill root
was verified on disk-backed workspace storage. This checkpoint records the launch, not an outcome; hourly results,
post-Base PF, validated percentage and execution PF remain unavailable until the run completes. The guard later
stopped this attempt at 70% of strategy tape construction when RSS reached its 3,200 MiB limit; the sampled disk
spill had reached 1,943,790,477 bytes. The fallback was rejected and no hourly result was produced. The next attempt
must use a smaller worker footprint and the early-interning change while retaining the same full input and policy.
