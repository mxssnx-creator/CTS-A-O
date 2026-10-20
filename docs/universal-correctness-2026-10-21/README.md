# Universal indication, strategy and range audit

The frozen runtime source is ae7b2021fbdce8c3432329781dfc19a651c7e1fc488b3826874af741e69befaa. CI 39508546694 passes both universal and optional slow jobs. No venue orders or authenticated market calls occur.

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
```

Revision 2 additionally preregisters cuts 7, 17 and 37 minutes into an hour to detect unfinished-higher-bar leakage. The original hourly-only plan remains in plan-v1-hourly.json. This extension is pending its separate CI receipt; it does not change the completed prior audit or market conclusions.

Use the source/feed seals in plan.json. Preserve incomplete and failed receipts; never relax the gates to turn a failure into a pass.
