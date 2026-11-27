# Cold processed-set memory — 26 November 2026

The prior focused replay held 1,749,972 entry events for insufficient own Validation history. Most
modeled contexts therefore had no orders in their later stages. Previously each such context eagerly
allocated separate empty histories, counters and Real verdict counts even before those stages existed.

Empty internal histories, zero counters and zero Real verdicts are now shared as immutable values and
copied on the first write to that exact context/stage. Checkpoints materialize independent mutable
values again; a caller changing one checkpoint record cannot change another or the live book. Restore
validates the unchanged version-3 checkpoint and reuses shared empty state. No economic window,
order, cost, gate, loss, result or persisted field is removed or pooled.

A synthetic 30,000-set run with one processed close per set retained 33.68 MiB before this change and
23.84 MiB afterward. Peak RSS observed while also creating the complete checkpoint was 265,328 versus
202,828 KiB. Both complete version-3 snapshots had SHA-256
`692bfd89d2b0720349022b7f0e39c1e14ea6744f3a7a4a3a3a106728c634ec1a`. The same four-hour
owned-stage fixture produced 1,120 trades and complete-result SHA-256
`4fa477fed8913517444aa0417962e2d65c80b4209757eb5b9bc86e655baa70b4` before and after. These are
synthetic measurements, not estimates of market profitability or the full-catalog peak. The benchmark is
`scripts/perf/processed-cold-sets-bench.mjs`; regression tests cover isolation, checkpoint mutation,
restoration and promotion from a cold state.
