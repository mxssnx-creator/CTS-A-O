# Spilled endpoint marks — 26 November 2026

The full catalog can contain millions of positions open at the end of a replay.
When these positions have been spilled to disk, the old endpoint-mark path read
the tape's mutable `open` array and kept the entire deserialized object list on
that tape. Once many tapes were visited, those lists could accumulate even
though a replay mark only needs symbol, direction, entry time and price, marked
return and weight.

The scheduler now reads a spilled list once and retains compact numeric marking
fields for eligible replay work. An existing or subsequently materialized mutable
position list remains authoritative. Unusual positions that cannot be encoded
use the original lossless read-only path. Endpoint marks remain held exposure,
not settled Last-N observations; no prices, costs, gates or account allocations
are changed.

A deterministic fixture of 20,000 spilled tapes and 160,000 endpoint marks
returned the same output SHA-256
`426c3055957b384b500b280df2bbeebe296d654132cf6e306074a99ec40417d2`.
One pair of runs measured 3,521 → 3,027 ms, 40,000 → 20,000 position reads,
and 77.5 → 35.2 MiB additional retained JavaScript heap after collection; peak
RSS was 419.6 → 397.0 MiB. The fixture's measured timings vary with host load.
Tests cover ordinary and Signal scheduling, mutation after scheduling, unusual
symbols, checksum failure, stage decisions and worker transfer. This synthetic
measurement does not establish that the full-catalog replay will finish within
the memory or latency target.

The two-worker settings-storm test now waits for the requested settings and
their matching completed paper step. It also accepts a subsequent compute in
progress, so a brief idle state need not be observed. The deadline and the
checks on the published simulation and paper positions remain in place.
