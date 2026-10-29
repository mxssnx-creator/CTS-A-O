# Own model-stream recovery — 29 October 2026

Two actual `walkForward` regressions failed before the fix: an own PF gate could stop its only learning stream
permanently, and portfolio funding caps could hide twelve own model losses and leave that context warming.
`ProcessedValidationBook` now admits an upstream-qualified own model slot before the downstream PF/funding
decision. Only its observed close advances that context. Overlapping candidates, stale retries, sibling contexts,
Base/strategy rejects and endpoint marks cannot replace its observations. Unknown unit evidence stays unknown.

The source flag and the accepted Real flag are distinct: a failed downstream gate can keep learning but cannot
feed accepted Real/Overall history. An account-cap rejection after every model gate passes is an accepted MODEL
order, not a funded trade or a venue fill. Funded counters and retained losses are unchanged. Legacy mode keeps
its original gate order. This is the Last-N-only production loop; the full persistent stage adapter remains pending.

Validation:70 focused Base/processed/Block/Relate/parity checks pass;27 source/window checks pass; typecheck
and scoped lint pass (one existing warning). The two red failures are preserved in the local test log.

A sequential48h SYNTHETIC mechanics stress(24h prehistory+24h trading,20symbols) passes6720 exact contexts
and2419200 model-source orders across seven strategy types, six economic ranges, four indication lanes and both
sides. DCA and DCA Active use separate batches because the legacy toggle selects a variant. Optimized wall time
61.219s; walkForward processing58.116s; max sampled batch-end heap183.74MiB; process high-water RSS609.43MiB.
One batch is retained at a time, with a768MiB heap ceiling. Full evidence remains outside git. This is not a
measurement of market/venue profitability, cold market ingestion, incremental foreground latency or every
possible production settings combination. New studies reject total windows exceeding72h including prehistory.

The first stress launcher wrongly enabled the legacy DCA Active switch for ordinary DCA, producing an empty
DCA batch. Two failed launches are retained; only the corrected scoped run is accepted. A subsequent static
type error used numeric0 for the optional crowd-map setting; it now explicitly uses `undefined` (the same
disabled control), and typecheck and the bounded-window regressions pass.

Latest real-market audit remains OLD policy PF1.1,20symbols,Low-Range step3 Normal/Trailing,
8Oct12:00–9Oct12:00UTC,24h prehistory,1/5/15m indications with1m execution,Base40+15/Main50+15/Real15:
Base10/4800(0.2083%),historical PF1.205231; subsequent Main PF0.617328, positions307/305/2 and
orders1585/1583/2 opened/closed/held. Real0/1585(0%); Active PF unavailable; exchange/funded fills unverified.

Do not enable/merge draft219 as a completed Base→Main→Real→Active adapter based on these primitive checks.
