# Signal stop cap and trailing correctness — 18 October 2026

Scope: source changes layered on accounting PR #172 (`bc8506757ea1bfe2e071772480a45735075fc2d6`). This is not a venue deployment, a completed full-suite release, or profitability evidence.

## Policy

Signal positions have an initial adverse stop distance no greater than 2% of entry, before trailing activation. Tighter requested stops stay tighter. Apply the cap after lane scaling, feedback, ATR resolution, and on restored/pending paper positions. DCA and Axis Signal ladders cannot place their initial protection beyond that cap. Trailing activation and effective peak gaps are also bounded to 2%; the absolute Signal gap never exceeds 2% of entry after a large favorable move. None of these limits caps actual fill losses: gaps, fees and slippage remain in returns.

The optional `signals.trailRatios` list defines independent peak-gap multipliers (0.1–2, at most eight). Absent means the existing scalar policy, not a newly selected “winner”. With activation 1%, peak 104, and entry 100, ratios 0.5 / 0.75 / 1 put long stops at 103.48 / 103.22 / 102.96. Shorts mirror through their favorable lows. The ratio multiplies the activation distance; it is not the fraction of accumulated profit retained. No trade-size or PF gate is changed by the ratio.

Normal fixed TP/SL, trailing with TP, trailing-only, and independent Historic Exit remain distinct. Ordinary ratios and trail-free mode now have exact config-ID suffixes; restore preserves those modes. The shared bar/tick ratchet never loosens a tighter stop and only applies a completed bar's extrema to subsequent execution. Native Entries remains unavailable for managed trailing exits by design; Overall mode manages those exits. Native fixed Signal protection is checked again from the actual fill and refuses retry distances above 2%.

## Findings and corrections

- Wider Signal stops previously survived lane/floor/ATR adjustments. The effective policy is now enforced at the simulation, pending/restored book, contribution and native fixed-entry boundaries.
- Ordinary trailing ratios and free/capped mode were absent from config identity. They could share a history or restore the wrong protection; IDs now preserve them.
- The fixed-price sink optimization could skip dynamic Historic Exit updates. Those configurations now remain on the causal bar scanner.
- A restored ordinary position acquired an irrelevant `exitProtection: undefined` field. Only a real protection state is added.
- Capped requests that collapse to the same physical protection are evaluated once. Configured raw cells remain distinct from effective/evaluated counts; higher counts are not invented.
- Updated stale fixtures: the configured cost replaces an old hardcoded 0.20% assumption; independent Historic Exit uses its own protection floor; exact Signal activation fixtures provide exact config IDs.

## Verification record

The focused 96-test protection batch passed locally, including both directions, ATR caps, independent ratios, no-TP behavior, gaps and cost arithmetic, restore/tick behavior, DCA/Axis stops, worker/serialized tape parity, native actual-fill protection, and Historic Exit sink parity. A first broader 56-test-file inventory plus one inadvertently included source file recorded 618 runner items, 612 passing and six failing. All failures were retained; they identified the stale fixtures and restore issue above. The corrected full inventory is rerun separately; do not relabel the first attempt green.

The candidate-lifetime fixture now supplies exact Signal activation keys. On identical input its complete output matches a separately extracted pre-trailing source archive (`9c037e2bc3d050136e1a8ca4397bb7669b90c00c`): 60 candidates, 48 feed rows, 42 settled rows, zero inactive rows. Full-output SHA-256 is `83198b23fe37899b152593f52c3818c37a3396cebcce621bf5bb9662fc3f6159`; progress SHA-256 is `9b11bef4ae499a18825a4df9d13223436fe392839fbdbd07240611de0404a59a`. This is functional parity, not market profitability.

## Release limitations

Complete release tests, hosted typecheck/build, mixed-book venue stop behavior, and authenticated X02 VST reconciliation must be verified before deployment. An aggregate catastrophe backstop is not a substitute for proof that each Signal lane's stop executed. No mainnet/VST order was placed here. A new frozen retrospective comparison is required to rank ratios; old economic-source manifests must not be bypassed or reused as though they describe this source.
