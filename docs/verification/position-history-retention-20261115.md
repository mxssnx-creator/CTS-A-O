# Position validation history retention — 15 November 2026

## Observed defect

The bounded 12-symbol, 72-hour CPU diagnostic on main
`d5dff2cee319eba82a249c5fbbd836a8b0504224` spent substantial sampled time
in garbage collection and immutable history-column loading. This is a
diagnostic, not a completed forward simulation or PF result.

`positionTapeValid` cached six column objects in a WeakMap value. A stored tape
wrapper stays alive for the calculation generation, so those objects retained
the complete shared decompressed history arena even after
`TapeHistoryStore.clearCache()`. A weak key did not make the value's references
weak while that key remained alive. The store's own bounded-cache accounting
therefore could not release these arenas.

## Correction

Retain only weak identities for the validated columns. A live ordinary tape
continues to own its own columns; a stored wrapper no longer owns an evicted
arena through validation metadata. Replaced or reloaded columns still cause a
complete ownership/chronology check. Malformed or null columns fail closed and
are not inserted as WeakRef targets. Source samples, precision, gates and
returns are unchanged.

## Verification

An isolated GC regression uses a real TapeHistoryStore with a one-byte cache.
It retains the wrapper, validates the history, clears the store cache, and
checks that the decompressed buffer can be collected. It then reads the same
wrapper again and requires successful reload/revalidation. The regression
failed against the original implementation and passes after the correction.
The fixture contains only 256 minute observations.

The focused guarded run passes 55 tests with no failures, skips or TODOs:
history retention, count-based qualification, derived-cache eviction,
Signal activation, atomic compute publication and incremental cycles.
Replacement/malformed-column regression is included. Typecheck passed.
The position-policy CI workflow now runs the retention regression explicitly.

This fixes a demonstrated ownership/retention defect. It does not establish an
end-to-end speedup, complete twelve-symbol processing, positive PF or venue
readiness. The earlier 50-minute incomplete replay and the subsequent CPU
diagnostic remain in the shared verification report. A fresh complete replay
with the 72-hour total bound is still required.
