# Stable-04 memory verification — 16 November 2026

The previous twelve-symbol replay aborted under the host memory guard. A retry was interrupted before Base
finished, so neither attempt established post-Base PF, validation percentage or executed PF.

## Fixes

- The runtime memory guard previously checked only the process's own cgroup. An unlimited child or one with a
  generous limit could hide a tighter parent, even though the parent also accounts for sibling usage. It now chooses
  the lowest available headroom among visible cgroup-v1/v2 ancestors, treats a zero limit as binding, and reports the
  scope responsible for the estimate. Existing cache-credit rules are unchanged. Missing/unreadable limits remain
  unknown; this is not a claim that limits outside the visible hierarchy can be detected.
- Automatic Block candidate windows previously stored separate copies of identical accepted close histories. They
  now share one history with sufficient retention for the longest window, while preserving independent pauses,
  source-specific evidence and entry-time decisions. Legacy unstamped candidates are all judged before the incoming
  close is recorded. No configurations or trade outcomes are discarded to achieve this reduction.

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

## Full replay

A fresh offline 12-symbol replay was started on remote commit `5e901cf53c96ef27f2813579650c97f833d1287f`, source tree
`474bfaf575c390791266f3e633af39935edbdf5d`, using the causal feed and 24-hour prehistory / 24-hour simulation described
in `stable04-cadence-replay-20261116.md`. It uses three workers, 192 MiB retained-history and 64 MiB decoded-cache
budgets. The dump contains ever-seated or executed histories rather than every rejected configuration; the engine
evaluation itself is unchanged. This run started before the fixes above, and its outcome must be reported separately.
