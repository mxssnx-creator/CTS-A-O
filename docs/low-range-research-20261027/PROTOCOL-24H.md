# Low-Range expanded 20-symbol / 24-hour research protocol

Frozen before this expanded run, after observing the separate six-hour probe.
The already-examined Binance USD-M minute feed is retrospective, so neither
this period nor its 20 symbols are presented as fresh holdout evidence.

Warm indicators from 2026-10-07 12:00 UTC, use the next 24 hours
(2026-10-08 12:00–2026-10-09 12:00 UTC) for initial Base/selection, and report
the following 24 hours (2026-10-09 12:00–2026-10-10 12:00 UTC). All 20
symbols must have complete contiguous native one-minute candles. Derive 5m and
15m bars from those same completed minutes. Use the three independent lanes;
these are not multi-timeframe combined engine lanes.

Evaluate all five methods (edge turn, failed break, channel breakout, midpoint
reclaim, compression breakout), three lookbacks, and five relation modes
(standalone, trend, six-bar breakout, activity, trend plus breakout). A channel
break above a 12/24/48-bar high necessarily also clears its six-bar high, so
some breakout-relation identities are economically redundant. Retain and
label those identities; they are not independent evidence.

For each signal and lane evaluate steps 2, 3, 4, 5 and 6; SL ratios 0.5 through
3.5 by 0.25; trail ratios 0, 0.25, 0.5 and 0.75; Micro, Minimal and Short
holds/range tags independently. One step is provisionally the existing fixed
0.20% range-construction reference, modeled round-trip cost is 0.15%, and the
cost-aware equations are specified in `PROTOCOL.md`. Distinct requested ratios
that resolve to the same price distances and hold after hard floors are one
economic cell, not multiple trades. Counts disclose both the requested and
distinct inventories.

For each economic cell, use its entire 24-hour prehistory with the existing
`rangeCellPass`; for each direction of a passing cell, use the existing
`configDirectionEval` with unchanged default gate settings and a 24-hour
history. Report initial historical validation PF and both the denominator
conditional on Base and the full candidate-context denominator. Empty and
insufficient contexts remain in those denominators. An initial no-loss score
is the engine's sentinel, not an exact finite ratio.

The later diagnostic examines each independently simulated candidate-tape
entry only if its initial Base cell passed and its own direction-specific
configuration evaluation passes at that entry time. The engine's simulator
uses next-bar entries, pessimistic same-bar stop-before-target checks,
completed-bar trailing ratchets and deducts cost once. Report closed returns
and endpoint-open counts separately, with hours binned by close time. Candidate
tapes overlap: they are not account-sized orders, live execution, venue fills,
the complete production pipeline or a funded equity curve. Symbol-specific
admission, portfolio coordination, order ownership, spread, actual fees,
slippage and the effect of rejecting a shadow position are not simulated.

Record every economic-cell result to a checksummed ledger and report incomplete
or memory-aborted work as incomplete. Preserve the source, runner, data and
protocol hashes. Retain losing, empty and insufficient results; do not promote
a candidate based solely on this post-hoc exploration.
