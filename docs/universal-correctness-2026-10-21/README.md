# Universal indication, strategy and range audit

The frozen runtime source is ae7b2021fbdce8c3432329781dfc19a651c7e1fc488b3826874af741e69befaa. CI 39508546694 passes both universal and optional slow jobs. Final primary CI 39509771569 passes all six jobs on commit 4e0ed5cae46ee06d8c37a64aeea5e81df629a704 (tree 64b81989c421973e963052a8a0a787b09e59c06b). The exact union of all three functional partitions is 213 files: 2,377 pass, zero failures/cancellations and two explicit optional slow exclusions; those same two tests pass in the separate slow run. Thus all 2,379 distinct core tests, including optional slow tests, have passing evidence. The report/funding/offline script matrix additionally passes 50/50. See core-inventory-final.json and ci-final.json for file-level coverage and verified artifact digests. No venue orders or authenticated market calls occur.

The catalog covers 1,708 registered specifications in 19 families and 36,596 engine bot/lane combinations. Configured protection identities are checked exhaustively per lane; 606,032 source/lane/type/range/direction contracts check exact tape returns and reject corrupted cost, sibling, side, symbol and time evidence. The seven strategy types and seven range tags remain explicit. Wide and Minimal Plus receive disclosed supplemental identity-test cells because the exact default grid has no static cells for them; this is not a full Cartesian market portfolio run.

Every source also receives three stable positive and three losing own-history gate checks: 5,124 passing and 5,124 failing decisions. Later losses cannot rewrite earlier decisions, and an alternate tape with the same ID cannot contaminate cached qualification.

On the fixed cached native 20-symbol history (96h, ending 10 October 2026 12:00 UTC), all eligible indication states and actual Bot entries with default remove-only tactics are compared against six shorter histories at consecutive hourly cuts. All 742,080 state-prefix and 4,590,120 entry-prefix comparisons pass, covering 1,698,255,600 historical state bars. The complete family ledger is in causal.json. Quiet market rules remain quiet; the separate core rich/mirrored fixtures prove each registered source can fire in both directions.

Both slow runtime tests pass: a mixed-operation storm and the background preset backtest. The raw receipt is runtime-slow.txt. The Signal allow-mode integration fixture now pins its original confirmation catalog, retains all three assertions and cleans up on cancellation; its targeted successful receipt is signals-allow-fixed-catalog.txt. Its expanded catalog timeout is retained in prior CI evidence and is not a passing run.

This is strong bounded correctness and causality evidence. It does not establish hourly profitable market returns. The repeated Micro financial study still loses on later validation and confirmation; see ../micro-optimization-2026-10-20/v6-final-results.json. The corrected original-window financially allocated 126,342-close cohort has PF 0.101956311, equal to its matching source tape. Positive synthetic fixtures and historical gate PF must never replace those actual simulated losses.

Reproduce with Node 24 and locked dependencies:

```sh
node --expose-gc --experimental-strip-types --no-warnings .github/audits/universal-correctness.mjs catalog
node --expose-gc --experimental-strip-types --no-warnings .github/audits/universal-correctness.mjs identity
node --expose-gc --experimental-strip-types --no-warnings .github/audits/universal-correctness.mjs causal
node --expose-gc --experimental-strip-types --no-warnings .github/audits/universal-correctness.mjs causal-partial
```

Revision 2 additionally preregisters cuts 7, 17 and 37 minutes into an hour to detect unfinished-higher-bar leakage. The original hourly-only plan remains in plan-v1-hourly.json. CI 39510692041 passes this extension for all 1,708 specs: 371,040 state-prefix comparisons, 2,295,060 Bot-entry comparisons and 829,196,560 compared historical state bars, with zero violations. See causal-partial.json. Together the two native audits cover 1,113,120 state-prefix and 6,885,180 entry-prefix comparisons at nine cuts. The extension does not change the prior audit or market conclusions.

The final primary run repeats all five financial cases and reproduces each complete filtered-stage JSON exactly against CI 39506738033; repeated-market-stages.json retains the comparisons. The 120-symbol stress run makes two computations, coalesces 100 requests and preserves a maximum of one simultaneous computation. Its 100ms progress timer makes 1,603 checks with maximum observed lag 58.951ms on this runner; this is a measured bounded run, not a universal timing guarantee. Report desktop/mobile checks have no page errors or document overflow.

Use the source/feed seals in plan.json. Preserve incomplete and failed receipts; never relax the gates to turn a failure into a pass.
