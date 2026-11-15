# Count Signal activation: bounded own-history summaries — 15 November 2026

Base source: `e462ce19b58ba59bd6caeb6eab416ab03aa56a3c`.

## Independently reproduced defects and cost

The old count activation cache used one global earliest-close boundary. Every
unrelated config close reopened and reranked all histories. It also reused a
previous active set at the same clock after policy changes. Two regressions
fail before the correction: one unaffected tape incurs 1,500 exit-column and
8,180 return-column accesses across twenty unrelated closes; changing the PF
policy retains obsolete active keys instead of the independent scalar result.

A fresh twelve-symbol, fixed 72-hour-feed CPU diagnostic on the base source
samples the first Real phase for 120.727 seconds, then deliberately exits 73.
Inclusive history-column work is 60.964 seconds, count activation 30.670 seconds
and initial entry-queue construction 30.421 seconds; groups overlap and cannot
be added. GC self time is 27.188 seconds. This is a bounded diagnostic, not a
completed simulation, a PF result or a live measurement. Original evidence is
retained with the cross-project report.

## Current-target correction

- Count ranking caches each exact tape's scalar rows until its next own strict
  settled-close boundary. Ranking/family caps and current Exit keys still use
  the same scalar rules at every decision.
- Rejections with insufficient own counts sleep only until enough own closes
  could exist. This uses future close timestamps as a necessary-count bound,
  never future returns or a future admission verdict. A close exactly at the
  decision timestamp remains excluded. Mature losing windows recheck at their
  next own close.
- Immutable stored empty rows use bounded compact vectors: 80 reserved bytes
  per retained catalog slot. Remaining space holds scalar rows with conservative
  object reservations. The complete component budget stays 64 MiB; oversized
  work remains scalar and unretained, with cooperative yields preserved.
- Policy, durable mode, count blocks, protection floor, ownership flags,
  backwards clocks and source identity invalidate relevant evidence. Stored
  generations are registered through a browser-safe module; explicit cache
  reset or store closure invalidates their derived summaries without loading
  binary columns. Unknown getter histories remain scalar.
- Plain column identities use WeakRefs. Scalar rows and compact metadata do not
  pin evicted history arenas. The server's Node filesystem/compression module
  is not imported into the browser calculation graph.

No return, precision, fee, PF threshold, history, strategy switch or stored loss
is changed. This does not integrate funded parent allocation, partial/restart
venue proof or the remaining draft #219 acceptance.

## Local verification and remaining acceptance

The focused inventory passes **69/69**, including strict close boundaries,
different own contexts, policy/ownership/source changes, reverse clocks,
cache budgets, cancellation, a closed/damaged store and actual GC of an evicted
arena. The unaffected tape now has zero repeated column accesses. The
550-stored-tape fixture has zero reloads after warmup under a 1 MiB component
budget, exceeding the former 512-tape derived-cache working set.

Eight complete independent before/after constructed replays across
1/5/15/30-minute lanes, Normal/Trailing/Trailing-only, four selection intervals
and ranking off/on are exactly equal. Every case contains 2,880 modeled orders,
4,896 candidates and twelve reporting hours. Small-fixture timings vary;
these comparisons establish correctness, not an across-the-board speed claim.
Typecheck passes; scoped lint has zero errors and two pre-existing warnings.

An initial new threshold fixture had an incorrect close clock and observed a
still-resident working item; its failed run is preserved. The corrected fixture
forces a genuine cold read without changing the immutable generation and
verifies the exact fourth-close boundary. Production logic was not loosened.

Full Core verification, required exact-head CI, complete twelve-symbol replay
and sufficient independent owned forward/venue samples remain pending. Do not
claim positive PF, complete live acceptance, deployment or improved full-market
runtime until measured. No account key was loaded into these offline processes,
and no account, order, position, service or deployment was changed.
