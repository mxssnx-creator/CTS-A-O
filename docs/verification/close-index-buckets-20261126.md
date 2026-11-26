# Bounded close-event indexing — 26 November 2026

A full continuous simulation indexes the closes in its decision window. The previous stable sort allocated a
four-byte permutation entry per close in addition to the 12-byte time/owner index, and its native comparator sort
could occupy the main thread without yielding. For exactly minute-aligned timestamps and a bounded time span, the
index now uses stable counting buckets. It keeps the original tape order for ties and yields during both scans.
Irregular timestamps and spans over 100,000 minutes retain the original stable permutation. Both paths preserve the
strict prior-close boundary; an event count outside the supported 32-bit index fails rather than wrapping.

Forty randomized aligned and forty irregular fixtures match the complete scalar time and owner arrays, including
ties, negative timestamps, partial-minute bounds and repeated clocks. A 1,000,000-event synthetic comparison
produced the same index SHA-256 `6c25f807f230f9e6efeecdf5d79cf5c544a78e2b5f9361dc037f97bf03a1a205`: the baseline
used 16,000,000 bytes of temporary/retained array buffers and took 735 ms; the minute-bucket path used 12,005,760
bytes and took 60 ms. Peak sampled RSS was 168,040 versus 147,984 KiB. One irregular run retained the same index
SHA-256 `50deccec7e89e8b74da8de2e9c53eb1d4162d4b4f04fedb8bbccdb2df44a2981` on both paths; its measured time was
283 versus 333 ms. These are isolated single measurements, not full-replay or live-cycle guarantees.

A separate four-hour synthetic walk-forward with 80 distinct engine/Signal tapes, 320 recorded hourly checks and
1,728 modeled closes returned exactly the same full-result SHA-256
`06e8c1c0c13b60fc09be12770dddded76270c40aaae005680857bbe4e334285e`. Its two measured times were 525 and 431 ms.
After incorporating the concurrent Base and owned-stage update, the same comparison again produced the identical
hash; under different load its times were 563 and 730 ms, so the complete fixture does not establish a speedup.
An additional small BTC market-tape sample contained ten closes, all minute aligned; it does not establish alignment
for the entire 12-symbol catalog. Reproduce the isolated comparisons with `scripts/perf/eval-event-index-bench.mjs`
and `scripts/perf/walk-forward-index-bench.mjs`. The full 12-symbol replay remains the acceptance test.
