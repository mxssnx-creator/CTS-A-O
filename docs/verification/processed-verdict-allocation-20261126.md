# Processed-stage verdict allocations — 26 November 2026

The owned-stage coverage report visits every visible configuration × symbol ×
direction context, including the many contexts without a completed window. It
previously allocated a new empty history and sliced a new array for each cold
verdict, then allocated a negative-filter result even when that filter was off.
The verdict now reads the existing bounded history directly and shares immutable
empty history. Unknown and insufficient observations, signed blocks, optional
negative filters and the exact stage thresholds keep their previous semantics.

The synthetic `scripts/perf/processed-verdict-scan.mjs` fixture scans 500,000
contexts, including cold, qualifying, losing and unknown windows. Before and
after output had the same SHA-256
`a0f0af21bf8caf54492dc4ad473851a589b9caaabba40454176e1f1467807b06`.
One pair of runs measured 932 → 895 ms and additional heap at the end of the scan
of 21.2 → 18.6 MiB; these small measurements vary with collection and host load.
A separate four-hour synthetic staged replay retained the identical full-result
hash and 1,120 trades. These figures are not market results and do not establish
full-catalog memory coverage.

The offline launcher also records a signal name when its child is terminated by
the host. A signal is reported as a termination, without guessing whether an
external memory limit or another cause sent it, and without marking the run
complete.
