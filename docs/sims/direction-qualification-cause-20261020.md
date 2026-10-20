# Direction and empty-symbol qualification causes — 20 October 2026

Two admission bugs are reproduced and corrected. Long history could qualify an unobserved Short, and the `provenSide` symbol gate could accept an empty result during warmup. The fixed 22-symbol repeat now settles **680 modeled orders at unit-return PF 1.337123**, instead of 1,184 at PF 0.408581 after the direction-only fix. **Consistently profitable execution across all windows/ranges is still unproven:** the bounded multi-range repeat retains 193 losses at PF 0, and the profitable aggregate window contains two losing active hours.

Tested implementation: `b545bfda5280de4b8b5afcd29141fbc7e813d850`; direction implementation: `d61c1fadaba89c5b6808b914e6246d1b34d982ed`. Published code checkpoint: `26a5107e5b931493dee3878b3274ca315fe282be`, exact matching tree `bf8fb60609f182e4a2d86966590ef96dcaa940f9`. Review: [draft PR 182](https://github.com/mxssnx-creator/CTS-A-O/pull/182). Main remains `4588030b946740d493cf0e0d629aa2722aa6211c`; no live reload, selected-account change or venue action occurred.

## First cause: direction evidence was borrowed

Every one of the 6,716 orders in the difficult 12-symbol baseline was Short. All 6,716 passed the pooled config check but failed their own direction's full minimum-close check. At 2026-10-15 15:00 UTC, for example, `follow|mc-rsi7-25@m5c|tp0.95|sl0.95|tr0.7125|h3|mc` opened ARB-USDT Short. The container's PF was **8.116158 on 18 Long closes**; the Short had **zero closes and no measured PF**. Its stop returned −1.1%, comprising the 0.95% price stop and 0.15% round-trip cost.

`validLastN=15` and range Last-N 75 were evaluated on combined directions. The additional execution `lastN=0` disabled the only remaining direction-specific filter. Checking only the direction's Last-N was insufficient: an intermediate repeat still executed 1,104 orders at PF 0.002214 because full sample/confidence evidence remained pooled. That failed attempt is preserved in the machine-readable evidence.

Full config validation now runs independently per **config × direction, across symbols**: configured sample, net return/PF, prior, pre-window, confidence, Last-N/range Last-N, drawdown, green share and stability. Only independently passing directions contribute to validated container statistics and fixed/hourly/Durable selection. Every entry rechecks its concrete direction; native promotion does too. A losing opposite direction cannot qualify or veto a separately passing direction. Rejected candidates remain available for subsequent independent learning, and actual execution losses remain recorded.

The earlier attempt to impose the complete twelve-close minimum separately on every symbol was an overrestriction. This fix retains the separately configured symbol gate rather than repeating the full config sample on each symbol. The previous pooled-direction explanation in [final-window-admission-20261020.md](final-window-admission-20261020.md) is therefore superseded.

## Second cause: empty symbol results were accepted as proven

With direction validation corrected, the latest 22-symbol window settled 1,184 orders at PF 0.408581. All entries passed their own full direction check. However, **504 had zero prior closes on their own symbol/direction**. The `provenSide` warmup implementation skipped result judgment when `n=0`, effectively borrowing another symbol's evidence. All 504 lost. The other 680 had their own symbol result and returned PF 1.337123.

Both `proven` and `provenSide` now reject an empty result even with warmup enabled or `symMinN=0`. Warmup may still admit a **positive observed** sample below the configured count floor; it cannot invent a measured PF. An explicitly disabled symbol gate and the separately configured veto modes keep their own semantics. Entry and native promotion call the same gate, and independent modeled/owned execution proof remains required for live promotion.

The final full replay independently reproduces 680 orders at PF 1.337123; it is not a post-hoc filtered score. The emitted order cohort and every entry's current Base/config/direction/symbol qualification are checked again after execution. This window has at least 18 own-direction closes and at least one positive own-symbol close at every entry. Normal minimums, range thresholds, costs, targets and sizing were not lowered or optimized on the losses.

## Frozen final repetitions

Each run uses the recorded cached feed and unchanged endpoint, a 24h Base/config window, available earlier source history for Last-N, and six evaluated forward hours. Micro maximum hold is exactly 15 minutes. Signals and independent Exit are excluded from these engine-only economic replays; independent Signal history remains 336h and is covered by separate regression tests.

| Run | Forward UTC date, 15:00–21:00 | Base passed/evaluated | Validated config containers at start | Settled modeled orders | Unit-return PF |
|---|---|---:|---:|---:|---:|
| micro12-d0 | 2026-10-16 | 4/700 | 373 | 0 | unavailable |
| micro12-d1 | 2026-10-15 | 18/700 | 2,038 | 0 | unavailable |
| micro12-d2 | 2026-10-14 | 10/700 | 79 | 0 | unavailable |
| micro12-d3 | 2026-10-13 | 0/572 | 0 | 0 | unavailable |
| extended22-d0 | 2026-10-17 | 64/700 | 1,737 | 680 | 1.337123 |
| extended22-d1 | 2026-10-16 | 10/700 | 0 | 0 | unavailable |
| extended22-d2 | 2026-10-15 | 83/700 | 1,698 | 0 | unavailable |
| extended22-d3 | 2026-10-14 | 21/700 | 0 | 0 | unavailable |
| bounded12, configured multiple ranges | 2026-10-16 | 7/20 | 966 | 193 | 0.000000 |

Historical validated sets do not imply a matching currently valid entry exists. In micro12-d1, 28,903 attempted entries fail their own current direction proof; the initially valid direction is not the direction entering. In micro12-d2, 79 entries fail the configured symbol result gate. Neither case is a blanket final-window lock. Recovery and actual execution with positive own evidence are covered across all seven ranges. A window with no Base passes still cannot open an order. Empty execution PF is unavailable, never a passing high-PF result.

## Parity, costs and performance

All **873 final executions** (680 Micro and 193 Minimal) match the exact config/symbol/side/entry candidate's entry price, exit time, exit price, exit reason and unit net return, with **zero return difference**, missing candidates or qualification violations. Every final order has own-symbol history. Price-based cost reconstruction differs from the configured 0.0015 by at most `8.211e-8`, consistent with compact price precision; no duplicate cost deduction was found.

The 193 Minimal losses had at least twelve own-direction closes, historical direction PF at least 2.267510, at least five own-symbol closes and own-symbol PF at least 1.106383 at entry. Their candidate and executed returns are identical. This tested loss is not explained by either corrected evidence leak or an execution-return mismatch; no additional cause is asserted without evidence.

Prefix audits rebuild only the actually available history at seven hourly cutoffs: 49 Micro comparisons and 7 comparisons on the executed Minimal source, with zero changed historical closes. These checks cover the enumerated tested sources, not every possible indication. The eight frozen pre-symbol-fix windows also produce byte-identical execution archives before/after the directional early-rejection optimization. Compact direction caches retain at most two views per source config and reject clearly insufficient samples before materializing a view. Cached held-only eligibility refreshes on the same tape array. Original source rows and longer Last-N history are preserved.

The [JSON evidence](direction-qualification-cause-20261020.json) records source/settings/feed/harness hashes, hourly stage counts, every final run, failed intermediate scores, causal examples, cost/parity summaries and verification. The accompanying [raw evidence archive](direction-qualification-cause-20261020-evidence.tar.gz) preserves the original nine execution archives, complete protocols/results, per-entry parity/evaluation records, baseline losses, failed intermediate runs and verification logs; each member's byte hash is checked against the manifest. The 12-symbol cached venue provenance was not independently audited. The 22-symbol public archive was restored against every original manifest chunk and gzip SHA-256 `1373d0a7fab7528d0528573385e19dfecf6f4ab353194231c639103af29aadcd`. These are retrospective software regressions, not untouched strategy holdouts or venue-owned fills.

## Verification and remaining blocker

The final read-only PR refresh finds **15 open PRs including this draft**; main is still unchanged. The earlier eleven-PR comparison remains in the original investigation. New concurrent drafts are recorded with exact heads in the JSON evidence: PR 183 (`cc291637`) adds Inverse/history/memory research; PR 184 (`4542d60d`) forks the earlier integration checkpoint and adds Micro/Inverse grids, central parity checks and API pacing; PR 185 (`e1d337e0`) changes Signal/DCA/Block identities and defaults. Their engine sources lack the two current admission guards. They remain separate, rather than replacing the frozen evaluator or silently changing this replay's grid/denominator. Any subsequent integration must preserve these guards and repeat the same entry regressions. PR 181's refreshed head (`26a0ab63`) also includes separate small-wallet x01 risk/exposure overrides; the already selected hold fixes are retained without promoting those account-specific overrides to global defaults.

The final source passes **127 focused tests, 132 broader simulation tests and 204 tests in the other 17 simulation files**. The separate slow runtime Block matrix passes **36/36** source/volume/pause audit cases. These disjoint segments cover all 40 simulation test files plus Base-cohort/native-promotion tests: **499 passing tests in total**, checked in segments rather than one all-core invocation. The first broad attempts exposed stale fixtures expecting empty/insufficient config history or unknown returns to execute. Corrected fixtures supply independent positive evidence, preserve Block-book separation and reject unknown results. Production thresholds were not weakened.

Coverage includes all seven ranges, own-direction sample/confidence/Last-N, empty symbol evidence, positive thin-sample warmup, native promotion, held-only cache changes, exact-close boundaries, separate Signal 336h history, costs and exits. TypeScript passes; lint has zero errors and 28 existing warnings. The production build passes; the freshly rebuilt worker is explicitly checked for the new empty-evidence guard. DATABASE_URL was unset and migration was skipped. Desktop/phone UI passes **4/4**, including Settings save and no unhandled application errors. An earlier 43-file broad command was interrupted under shared-host memory pressure; no complete all-core green run is claimed.

The draft is a validated correction of specific admission defects. The consistently high execution-PF objective remains unmet because the multi-range repeat and two active hours of the positive aggregate window still lose. No profitable release or exhaustive absence of other bugs is claimed.
