# Fixed processed cohort and changing seats — 26 November 2026

During a replay with owned-stage progression, the Base-qualified processed cohort is fixed while the
selected seats can change on each decision clock. The scheduler previously rebuilt a union containing
that entire fixed cohort after every changed selection. It now checks membership in the fixed cohort or
the changing seats without copying the fixed cohort. Entries remain in their original timestamp order;
Base-qualified warmup, active seats, gates, caps and candidate outcomes are unchanged.

A synthetic fixture with 100,000 fixed IDs, 80 refreshes and 10,000 membership queries per refresh
produced the same 500,707 hits and SHA-256
`00471ea2a49b394c693d7f45956c89c54d81d9a3308663e22650d4b0bfa5c57a` for both versions. One local
run took 1,158 ms with copying and 238 ms with membership checks; retained heap was 1.76 versus 0.63 MiB
and observed peak RSS 148,256 versus 132,548 KiB. These synthetic figures are not end-to-end replay
latency or market results. `scripts/perf/processed-seat-union-bench.mjs` reproduces the comparison.

Scheduling tests compare every emitted trade against an explicitly copied union across changing seats.
The four-hour owned-stage walk-forward fixture also retained 1,120 trades and complete-result SHA-256
`4fa477fed8913517444aa0417962e2d65c80b4209757eb5b9bc86e655baa70b4`. A full 12-symbol replay is
still required to measure the complete workload and its funded execution PF. Type checking and the
packaged worker's Real, stage-summary, incremental-tape and stop-gap parity checks passed.
