# Coordination interval index memory — 26 November 2026

After a completed simulation, paper coordination builds an entry-time index of
ordinary engine candidates so Signal confirmation can ask whether a candidate
was open at an exact historical entry. The earlier implementation first created
one two-element array per interval and then created two typed output columns.

The index now collects numeric entry and exit columns and stably sorts compact
integer indices. It emits the same entry column and running maximum exit column,
including equal-entry ordering, and releases each temporary group after building
it. Exit strategies and Signal candidates remain excluded from the confirmation
pool. The existing cache, time boundaries and admission policies are unchanged.

On one 500,000-interval synthetic fixture, the output SHA-256 was identical
(`305d487e988fed33268aa93f818b69ef89464ed901521fc8696e24048f87b3f2`).
The earlier build took 532 ms and retained an additional 82.6 MiB of JavaScript
heap during construction; the new build took 293 ms and 49.5 MiB. Array buffers
increased from 7.6 to 9.5 MiB for the temporary index. These are single-process
fixture measurements under shared host load, not a market run or a guarantee that
the full event-loop cycle completes within 500 ms. Large index construction is
still synchronous and remains a responsiveness concern.

Run the fixture with `node --expose-gc --experimental-strip-types
scripts/perf/coordination-index-memory.mjs [repository-root]` against each source
revision in separate processes. The root argument defaults to the current
directory.
