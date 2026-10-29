# Base range admission and Axis coverage — 29 October 2026

## Realtime stop-gap and cost follow-up

The realtime tick book previously marked a stop crossing at the stop level even when the first available quote
was already beyond it. The tick now uses that adverse observed quote as a conservative paper mark, while a TP
crossing continues to use its configured target. A quote is an execution estimate, not proof of an exchange fill;
venue-owned fills and their measured commissions remain authoritative. Previously recorded hits are not rewritten.
Each exact range/direction keeps its own stop and the first recorded crossing cannot be repriced by a later quote.
Completed-bar ratcheting, target-free trailing-only behavior and expiry remain separate.

Short synthetic fixtures (at most 45 minutes) cover TP, SL, ambiguous same-bar touches, stop gaps, independent
range siblings, long/short, Normal, Trailing and Trailing-only across 1/5/15-minute clocks. The focused matrix
tests 0.12% and 0.15% modeled costs: Normal returns subtract once; DCA, DCA Active and Axis subtract once per
filled weighted leg; a replacement of an open mark by a settled return does not charge it again. The worker and
runtime publication tests verify observed gap marks and exact own-hit persistence. Fee-provenance tests retain
confirmed zero/measured commissions and keep unknown actual fees as estimates, not verified execution PF.
The combined focused accounting, ownership, simulation parity, worker and exit suite passed; TypeScript,
development build and scoped lint passed (five existing runtime unused-variable warnings). The packaged worker
also passed its own incremental/tick parity and long/short stop-gap checks using 30 hours of synthetic candles.
The complete hosted/core inventory was deliberately not run because it includes fixtures over 72 total hours.

This is a correctness repair and synthetic coverage, not a new forward-market result. The replay below predates
the tick change and does not exercise the new realtime path. Existing open positions and exchange fills were not
restated; full Main/Real/Active/Live integration and broader venue/market validation remain unfinished.

## Changes

With `grid.baseRanges=false`, Base formerly published the expanded builder range list as the list of qualified
ranges. A pair that passed Minimal could therefore lend that pass to a failed Short range. `basePass` now keeps
the actual `setsPassTags` results separate from the builder's wider `pairTags` on both the normal compute and
preset paths. Expanding construction remains available for diagnostics. Normal, Trailing, Trailing-only, DCA,
DCA Active and Axis use the corrected range gate in either direction. The existing explicitly separate untagged
ladder admission policy and Historic Exit's independent Base gate are unchanged.

Range-specific Axis tapes also lacked build-stat records, producing a failed coverage reconciliation even when
the tapes existed. They now contribute grid/built/kept counts, duplicate/Base-filter reasons and distinct
protection values. A retained but filtered held Axis tape is counted as an exit-only exclusion, never a kept set.
Local and worker results agree. Neither repair installs the unfinished persistent stage adapter in draft #219.

## Bounded market replay

Retrospective cached Binance USD-M data for eight fixed symbols, 8 October 12:00 to 9 October 12:00 UTC, 24 h
evaluated prehistory and 24 h indicator-only warmup (72 h total). Two frozen EMA/RSI indications, follow/revert,
5/15m lanes, a limited Minimal/Short grid, Normal/Trailing/DCA/Axis and Block were configured. DCA Active, Signals,
Historic Exit, Micro and other ranges were outside scope. The traded lanes were 5m. This is a modeled funded
replay, not an exchange fill or fresh holdout. The requested 0.12% cost is a sensitivity on this previously
examined window; the released CTS-A-O default remains 0.15%, and neither result changes that default.

| Round-trip cost | Base pairs | Initial Minimal validation | Later funded-model orders | Settled return PF | Long / short | Ending modeled equity |
| --- | --- | --- | --- | --- | --- | --- |
| 0.15% | 1/8 (12.5%) | 11/17 (64.71%), historical PF 3.72 | 94/94/0 opened/settled/held | 0.337338 | 2 / 92 | $9.9173 |
| 0.12% | 1/8 (12.5%) | 12/17 (70.59%), historical PF 4.07 | 114/114/0 opened/settled/held | 0.353138 | 3 / 111 | $9.9069 |

At 0.12% Wide validation was 1/9 (11.11%, historical PF 2.64), with 7 settled orders at PF 0.4195. Minimal had
107 settled orders at PF 0.3504. Short passed 0/4 Base pairs, so its validation and execution PF are unavailable.
The 0.12% run had 14/14/0 positions opened/closed/held, 3 green, 4 negative and 17 flat hours and 1.071% maximum
equity drawdown. No closed-order allocation was zero or unknown. Reported historical validation and later
execution are different samples. Both cost variants produced 68/68 session checks; independent exact-cohort
audits matched 94/94 and 114/114 funded closes respectively, with zero missing or mismatched source returns.

The chosen market sample did not contain a qualified pair with an applicable failed sibling range, so it does
not measure the financial impact of the range-admission change. Twenty-four independent synthetic regressions
reproduce that defect across six types, both sides and both all-sets modes. The two recorded market runs retain
their losses and do not establish a strategy edge. The first 0.15% run failed 2/68 coverage checks before the
Axis bookkeeping repair; it is preserved separately and is not represented as a passing run.

## Verification and remaining work

Focused suites: 119 admission/Axis/identity/stage tests; 14 worker-pool checks plus the new per-range Axis
worker parity; 103 Base/Live/paper/publication checks; 65 session/report tests; 53 accounting negative/parity
checks; six funded-cohort and Micro identity checks. Typecheck, development build and scoped lint pass (existing
warnings remain). The full suite was not run because it includes an 18-day synthetic market fixture, beyond the
operator's 72-hour total-window limit. Some inherited unit-test fixtures in the focused suites nevertheless used
synthetic histories longer than 72 hours; they should not have been run under that limit and will not be repeated.
The new Axis coverage fixtures were subsequently bounded to 72 hours. The final 0.12% replay's one cold compute was 335 ms, not a warmed foreground
cycle benchmark.

The production Base→Main→Real processed-set adapter, Overall strategy placement, durable ownership/restart,
Active-to-Live mapping, and independent Signal and Exit end-to-end coverage remain incomplete. The legacy replay
used Main validation Last-12 and an additional entry Last-N of 0; it does not implement or prove the requested
separate Real Last-15 processed-set gate. It produced only three long orders and a losing forward PF. Do not merge
the draft as a completed strategy progression, claim profitable Live execution, or infer that a high historical
validation score must persist into future trades. Preserve entry-time losses and actual venue fees.

The exact source files used by the 0.12%/0.15% replays are sealed in each generated protocol using
`sessionStudySourceFiles`; the final source seal was `8ca81c3bf51fa534f1c7e8d0e37481249f61b7f990d16cd3b83cad4cbdae5423`.
`scripts/study-base-range-admission-20261029.mjs OUTPUT [0.0001|0.00025]` prepares a frozen input from the tracked
public cache, where the last argument is per-side slippage. Run the session with the generated `desk.json`,
`protocol.json` and `feed.json`, `--symbols 8 --pre 24 --run 24 --end-at 2026-10-09T12:00:00Z`,
`--evaluation-from 2026-10-07T12:00:00Z --selection-hours 24 --replay-preload-all --signals off`, and the frozen
account parameters ($10, 10x, 0.2%). An explicit `--frozen-session` is required for settings/feed/source checks.
