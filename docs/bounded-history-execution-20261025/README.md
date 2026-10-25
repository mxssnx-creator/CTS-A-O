# Exact-minute Signal activation — verification in progress

A regression reproduces a Signal that fails its own Last-N at the hourly selection snapshot, passes after a subsequent close and still misses its next minute entry. Simulated Signal activation now refreshes each minute, independently of ordinary selection and hourly reporting. Completed-hour ranking statistics are reused; the exact own-config verdicts and the independent classic/coordination caps apply at the current minute. No threshold or risk gate changes. Exit keeps its independent qualification.

The uncached scalar ranking and cached ranking produce identical ordered keys at all tested minutes, including capped families, backward clocks and held-only configs. Original failing and corrected logs are retained. The public-history sample benchmark uses 5,052 configs, 439,887 closes and 61 timestamps: 182.144ms fresh median versus 23.065ms cached median (not a live exchange SLA). Full 12-hour/12-symbol replays and the complete DCA/Block matrix are pending at this checkpoint.

The preceding main release is PR200, merge `4731ebd237875078d5f3be0fba0ef46ef6779f18`. It passed 4,350 tests. Its later 12-hour window has settled post-Base PF 0.067947; do not label it stable or start unrestricted X02 based on that result.

The previous all-range ordinary recovery attempt also failed: job121218878033 in run40209962757 exhausted memory during Tapes, about13.9GB RSS at67% across2119pairs. No completed simulation or PF may be inferred from that attempt. Bounded history storage/processing remains active work; the current activation correction does not claim to resolve that memory failure. Fractional Exit tactics and full actual VST comparison remain outstanding.
