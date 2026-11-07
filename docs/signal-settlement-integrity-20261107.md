# Signal settlement ordering — 7 November 2026

## Defect and repair

Signal acceptance and cluster windows scanned backwards and stopped at the first old close, but stored closes in delivery order. A delayed settlement could therefore hide newer losses. Reproduction: +0.01 at hour 9, −0.02 at hour 9.5, then a late +0.10 from hour 1. At hour 10, the two-hour window incorrectly became empty instead of reporting two closes and PF 0.5; the insufficient-sample path could admit the losing lane.

Keep these tapes ordered by settlement timestamp, using constant-time append for normal delivery and binary insertion for a delayed close. Pruning uses the newest recorded timestamp. Reject invalid timestamps before changing evidence. Preserve the existing source/side/population identities, onset deduplication, thresholds and accepted-modeled-order provenance. Future closes and sibling records cannot supply a queried window.

## Verification

On parent `9f054c30250b5998fef173da8d11e6c93ef0f646`, the patched tree passes typecheck, production build and 29 bounded tests in these files:

- `signal-close-order.test.ts`: delayed settlement, future/sibling isolation, cluster populations and invalid timestamps.
- `signal-unknown-windows.test.ts`, `signals-append.test.ts`, `metrics/pf-neutral.test.ts`.
- `sim/signal-postbase-feedback.test.ts`, `sim/exit-coordination-isolation.test.ts`.

Reproduce with `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 node scripts/test-core.mjs` followed by the six `src/core/` paths above. These are accounting/causality regressions, not a new market profitability study. The legacy unbounded CI suite is skipped under the repository's 72-hour total-history rule.

## Evidence and remaining work

No new market or venue PF is measured by this repair. Latest previously recorded eight-symbol cohort remains unchanged: 8–9 October, 24h trading + 24h evaluated prehistory + 24h indicator warmup; Base 143/1,398 (10.2289%); initial post-Base config validation 405/1,276 (31.7398%), finite historical mean PF 17.399524089 plus six no-loss sets. Subsequent funded modeled execution PF was 0.273050873, positions 52/49/3 and orders 3,116/3,108/8 opened/closed/held. See `operations-handoff.md` for the exact old evidence. These historical validation and execution cohorts are different; neither proves current profitability.

The persistent Base→Main→Real runtime adapter in draft #219 is still not integrated. This patch does not claim to complete that work, authenticate an exchange, deploy a live instance or demonstrate high future PF.

## Rules for future changes

Retain every admitted order's later loss, including after its config stops qualifying. Keep settlement time separate from arrival time; test delayed, duplicate and future evidence without borrowing sibling history. Re-run the causal regressions before changing Signal feedback, and report subsequent execution separately from historical passing windows. A high past PF cannot guarantee high future PF; regression protection can enforce correct evidence and configured admission rules, not market outcomes.
