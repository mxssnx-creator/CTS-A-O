# Bounded all-context position indexing — 15 November 2026

The bounded 72-hour/12-symbol Real CPU profile identified exact-context lookup
and history-column access among the expensive paths. The source target for this
follow-up is `c4bbf934db8da50071cf15013c4f42ac8fb65977`, including the independent
history-retention correction and the documentation-only old-PR audit.

## Correction

Count-based aggregate selection and Signal ranking require every symbol/side
context of each immutable tape. Previously each symbol separately scanned the
same full columns to build its own index. Prepare all contexts together using
two linear column passes, then reuse their chronological indices. Duplicate
symbol slots map to their first canonical name slot, preserving the previous
lookup semantics.

The derived cache remains limited to 512 tapes. Its completeness marker is a
WeakSet of cache maps and does not retain evicted generations. Native callers
asking for one context still build only that context. Invalid ownership or
chronology fails the existing validation before preparation. This does not
change samples, costs, ordering, gates, PF floors or source tape precision.

## Verification

A new twelve-symbol fixture has 1,536 declared unit-return observations within
64 minutes, both directions and duplicate symbol slots. It compares every
aggregate context with the scalar context evaluator at forward and backward
clocks. The first column-traversal check fails against the prior source:
38,425 symbol-column getter calls. After the correction the same first call
uses 1,563, with 25 on each repeated cached evaluation.

The fixture also compares the complete evaluation on a real one-byte-cache
TapeHistoryStore against ordinary columns after forced cache reloads, then
forces 514 derived keys through the 512-tape cache and checks rebuilt contexts.

The final guarded suite passes 56/56 tests, zero failures/skips/TODOs, across
context indexing, count windows, derived-cache eviction, history retention,
Signal activation, atomic publication and incremental/full cycles. Typecheck
and diff check pass. Position-policy CI runs the new regression explicitly.

Getter counts are an algorithmic regression metric, not an end-to-end speedup
or trading result. The ongoing full replay is frozen on the preceding
memory-fixed source; it cannot certify this newer optimization. Complete
12-symbol forward processing and sufficient positive after-cost PF remain
separate acceptance requirements.
