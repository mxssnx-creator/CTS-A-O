# Signal and position evaluation cache — 26 November 2026

The simulated run's change index is attached to engine tapes. Signal tapes are evaluated separately for hourly
validation reporting. The memo previously treated a forward clock as proof that every tape was indexed, so an
unindexed Signal could keep its earlier result after its own closes settled. A deterministic six-hour replay
reproduced an hourly Signal row showing one close where its own causal history had four. The regression checks
each recorded hour against an uncached evaluation of that exact Signal tape. This establishes a reporting defect;
it does not establish the effect on any particular funded order or the profitability of a replay.

The fast path now applies only to members of the attached tape set, within the indexed time interval, and only
when the cached result was established against the current index. Other tapes use their own close-time lookup.
Backward queries, queries beyond the indexed interval, and reattaching a different tape set cannot poison later
forward reads. The strict prior-close boundary and existing in-place event permutation are unchanged.

The fix retains a weak membership set while the run is active. In one isolated 800,000-empty-tape synthetic
measurement, the attached-index heap delta was approximately 0.02 MB before and 33.6 MB with membership tracking;
this is a correctness cost, not a full-run peak-memory measurement. The event index remains bounded by its actual
close count, and the weak set does not retain tapes after the run releases them. Unit regressions cover missing
Signal membership, changing own history, reattachment, backwards clocks and out-of-range clocks; existing tests
also verify that an indexed unchanged tape is not reopened.

Market reports from earlier source revisions cannot certify their recorded hourly Signal validation rows after
this defect was identified. A new frozen replay and separate funded-order audit are required; no earlier result is
relabelled as a pass.

The default independent-config selection also constructed a full tape-ID Map on each decision even though only the
optional ladder-needs-base policy reads it. The Map is now built only when that policy is enabled. A synthetic four-pass
selection over 25,000 tapes with 100 passing picks took 92 ms before and 77 ms after, with identical output checksum
`1b729a7e7b1a765e660c08c4a3f238a82b0574af0042b6cf3c5321b9d8cfdcb4`. The optional enabled path retained the same
checksum as well. This is one small synthetic comparison, not a completed market-session or live-latency result.
`position-selection-bench.mjs` and `eval-index-membership-bench.mjs` reproduce the isolated measurements.
