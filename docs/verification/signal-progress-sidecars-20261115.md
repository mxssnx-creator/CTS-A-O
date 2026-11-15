# Complete Signal detail persistence — 15 November 2026

The full default retrospective twelve-symbol replay on the exact PR279 tree
`78cf4ac4caa4c89806f9470fded86a2e717f9e23` completed all twelve forward hours in
2,935.838 seconds. Its 635,271,931-byte raw JSON header contained 631,816,936 bytes
of Signal progress. The ordinary reader then failed with `RangeError: Invalid string
length`. A completed calculation whose evidence cannot be reopened is not a usable report.

The writer now automatically moves the complete `signalProgress.configs` and
`signalProgress.requestedConfigs` arrays into ordered, bounded, checksummed JSONL
sidecars. Metadata and explicit empty placeholders remain in the header. Default
readers restore the legacy shape; selective readers and iterators retain and verify
unloaded evidence. Invalid keys, mixed unhashed inline details, corrupt/missing
chunks and interrupted writes fail closed. Cleanup includes only the referenced
owned chunks. There is no change to trading, history, fees, prices or PF gates.

Ordinary report rendering verifies these catalogs without retaining unused detail
arrays. Re-export streams existing catalogs into fresh sidecars; it does not silently
replace them with empty arrays. The report's exact funded subset remains independent.

## Same-run recovery and evidence

The original file remains unchanged, SHA256
`c1a9e591c489507504c512059fde7df37af469a80ce4f78fb8bbb5e50d1ebb25`.
A byte-copy extraction and the new writer produced a 3,828,347-byte portable header.
Every original metadata value and existing tape/clock manifest was checked. Ordered
canonical row hashes match for all 174,369 effective config rows and 207,740 requested
config rows. Full sidecar verification also exhausted all 331,423 tapes and 22,326,422
candidate-history rows. These are historical model observations, not executions.
The portable header shares the original tape chunks; retain both headers and all
their referenced chunks. This is one economic cohort, not a second simulation/sample.

The ordinary report renders with 77/77 integrity checks. Exact native report allocation
verification records zero funded modeled closes, zero unknown allocations and no held
orders. Post-Base validation at run start, 2026-10-16 09:00 UTC, passed 0/153,298
evaluated ordinary configs (0%); the separate Signal catalog and disabled types are not
included in that denominator. Every evaluated ordinary config failed its close-count
requirement. Passing historical post-Base PF and execution PF are therefore unavailable.
Base pair acceptance is separately 318/2,404. Empty execution is not positive PF.

The fixed universe was AVAX, DOT, ATOM, APT, BTC, ETH, BNB, DOGE, ADA, BCH, ETC and ARB,
all USDT. Physical data span 72h; evaluated prehistory 12h and forward 12h, ending
2026-10-16 21:00 UTC. Ordinary/Trailing/Exit/Block/DCA toggles were on; Axis and Active
variants were off. The independent 150h Signal fitting default cannot be certified
from this shorter physical feed. This is not all-toggle coverage or a venue test.
Model cost remains 0.00176; no actual fee/fill calibration is inferred.

## Verification status

Six new codec regressions fail before the repair and pass after it. Focused existing
codec, funded-cohort, Signal capture/report and file-consumer tests pass. The full
script attempt is preserved: it exposed two newly sidecar-bound fixture rows larger
than their artificial 512-byte chunk budget, one independently reproduced baseline
JSON/undefined fixture mismatch, and an unavailable local Chromium executable. The
Signal fixture budget now fits its complete 1,922-byte row; production's 8MiB bound
is unchanged. CLI JSON equality compares the serialized shape, retaining every
numeric setting and gate. No test is removed or skipped by this patch.

Final frozen runnable-script inventory and exact-head required hosted checks are
recorded separately at publication. The local browser failure is not a render pass;
the successful market HTML generation is not live or profitability acceptance.
No account/order/position/service/deployment writes occurred. All earlier losses and
failed runs remain retained. Draft219 and the full forward acceptance remain open.
