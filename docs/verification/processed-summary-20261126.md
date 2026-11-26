# Modeled stage coverage without a checkpoint copy — 26 November 2026

The focused 12-symbol 24-hour replay at `2160424` reached approximately 4.3 GiB RSS near the end of
its trading window, then peaked at 7,003,952 KiB while finishing and auditing. Its result contained no
funded orders. One contributing allocation is the modeled processed-stage report: its default full
result contains both a per-set summary and a cloned checkpoint, while the frozen session report uses
only aggregate Validation and Real coverage and never writes that checkpoint to its dump.

An explicit `processedStages.reportDetail: "summary"` option keeps all ordinary model admissions,
closes, costs, gates, independent contexts and aggregate coverage unchanged, but returns
`processedStageSummary` instead of `processedStages` and does not materialize the per-set summaries
or checkpoint. This option cannot be used as a restart checkpoint or evidence of paper/venue ownership.
The normal default still returns the complete modeled report and checkpoint. The frozen offline replay
requests summary mode and records that choice in its protocol and output. The paper overview and session
report consume the aggregate from either representation, without equating it to funded execution.

A synthetic 12,000-set comparison produced identical aggregate coverage SHA-256
`8aca268deedabecedecca8471a38b46b8df733760389c9de09de827b548ac157`. Retained heap after report
construction was 24.57 MiB with the full report and 0.03 MiB with summary-only; observed peak RSS was
193,224 versus 136,400 KiB. The full and summary timings were 479 and 23 ms in these single local runs.
Other local tests were running, so timings and peak RSS are indicative rather than controlled benchmarks.
`scripts/perf/processed-summary-bench.mjs` reproduces the comparison. A full walk-forward fixture
also compares every trade, gate skip, step, feed row and coverage aggregate, and a worker transport test
compares both modes. Large coverage scans yield during iteration instead of monopolizing one long slice.
An offline one-symbol, two-hour-prehistory/one-hour diagnostic completed 63/63 report checks and
preserved the explicitly labeled summary-only coverage in both its raw and HTML data; no context passed
Base in that tiny fixture, so it does not establish trade performance. The application development build
and packaged worker parity check both passed.
The full 12-symbol session must be rerun to establish its actual memory and execution result.
