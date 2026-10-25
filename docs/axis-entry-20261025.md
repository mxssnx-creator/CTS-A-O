# Axis entry must match funded notional

Axis assigns each leg an original quote-notional weight and computes its return as the weighted sum of per-leg net returns. Its combined entry incorrectly used a quote-weighted arithmetic price. For one unit at 98.5 and one at 97.5, that produced entry 98 instead of total notional / total acquired quantity = 97.99744897959184. Marking the recorded combined order therefore disagreed with its own simulator, even after every leg was already filled.

Both Revert and Desk now use the harmonic entry implied by those same funded weights. Single-leg entries stay exact. Leg returns and the modeled 0.15% round-trip deduction are unchanged; no second cost or extra volume factor is introduced. Managed targets, stops and breakeven decisions use this corrected entry, so multi-leg future outcomes can change. Existing archived Axis outcomes are not rewritten or certified as the new model.

Eight regression cases cover both modes, Long/Short and unit/2.5 addition weights, comparing actual simulated open and settled aggregate returns with independent per-fill arithmetic. All eight failed on the preceding implementation. The corrected code passes 109 Axis, incremental, identity and exact-cohort checks plus 74 DCA, owned-paper and promotion checks. Build, typecheck and scoped lint pass. Broader CI and native results remain pending for this revision.

This does not repair the separate report approximation that attributes a ladder's final volume from the parent entry time. Causal per-leg minute equity and fractional strategy Exit remain outstanding; low-drawdown or venue-readiness certification is not claimed. Before a deployed runtime reload, back up settings/state/database and retire or re-evaluate affected cached research results. Existing owned venue fills and held protection must be preserved.

## Minimal Plus publication follow-up

The first 12-symbol/12-hour EMA ordinary replay failed two coverage assertions: builder-kept totals were compared with post-range-gate active tapes. Preserve `runs/axis-entry-20261025` as failed evidence (7,076 opened / 4,882 settled / 2,194 held orders; 15 opened / 4 closed / 11 held positions; settled PF 1.336606, equity DD 22.5921%). This is not a full-family or profitability acceptance.

The runtime now records pre-run gate rejections separately, retains rejected held configs as exit-management-only tapes without materializing their history, and publishes those records atomically with the generation. Coverage also checks all built strategy kinds plus optional Minimal Plus and Wide. Existing PF and chronological windows remain unchanged. Reports distinguish built-retained, gate-rejected and eligible sets. Unexplained missing active tapes still fail.

Three broad CI assertions retained arithmetic average prices after the Axis correction; they now independently assert total notional / total quantity while retaining stop/fill assertions. Local publication, causal boundaries, source ownership, order-side and compute-publication tests pass (106 combined). Report regressions and a fresh frozen native replay are being verified; do not reuse the initial failed replay as acceptance.
