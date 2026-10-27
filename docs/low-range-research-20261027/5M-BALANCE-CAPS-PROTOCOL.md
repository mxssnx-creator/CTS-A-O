# Low-Range 5m balance-cap follow-up

Status: **completed and audited offline replay.** This is a post-hoc,
retrospective follow-up to the 20-symbol 5m run ending
20 October 2026 00:00 UTC. It is not an independent holdout or venue test.

## Preserved baseline

The original run used indicator warm-up from 18 October 00:00 UTC, Base and
prehistory from 18 October 12:00 UTC, and a 24-hour trading window from
19 October 00:00 to 20 October 00:00 UTC. It evaluated the 195 Low-Range
sources on the 5m Short lane, with entry tactics off, modeled 0.15% round-trip
cost and the full configured Short protection grid. Historic Exit, DCA, Axis,
Block and Signals were outside its scope.

At the initial cut, **10,439 / 14,702 configurations validated after Base
(71.00%)**, pooled historical return PF **4.571**. The subsequent modeled
account settled **144,863 orders at return PF 0.259**. It ended with realized
balance $2.36 from $10 and exceeded marked equity in required margin for 635
minutes, so its uncapped account was financially infeasible. These outcomes
are simulated funded allocations, not venue fills. Preserve the original
protocol and result independently; new evidence cannot erase that finding.

## Follow-up change and actual cap semantics

Copy and hash-check the exact original feed, symbols, history and clock
boundaries. Normalize the original frozen settings and walk-forward options
through the current runtime. Require byte-equivalent canonical settings and
options except for these three explicit `live` fields:

- `maxPositionX = 0.5`: up to 0.5 × realized wallet **balance** of notional
  per symbol and side at the model's entry allocation;
- `maxExposureX = 1`: up to 1 × realized wallet **balance** in total gross
  long-plus-short notional at entry allocation;
- `exposureScaler = true`.

The current report-book allocator uses realized balance for its caps. These
are not caps based on marked equity, and it is inaccurate to describe them as
such. The model allocates the simultaneous entry batch against remaining cap
room; it does not assert that existing holdings are immediately liquidated
when later balance or marked equity declines. Measure margin-versus-equity
feasibility at every observation rather than assuming the caps guarantee it.

No PF thresholds, target, stop, trailing, strategy identities, indications,
source selection, cost model, order unit, leverage, replay dates or data are
to change. The cap can cause scaled or zero allocations, so the later funded
order cohort and PF can differ even with the same candidate tape. Report
funded settled orders, known-zero allocations, unknown funding, positions and
endpoint holdings separately. A reduced drawdown or a high historic PF does not
prove positive future returns or justify excluding losses.

## Source and audit requirements

Before preparation, commit the complete economic source including the final
source guard. The launcher rejects uncommitted tracked or untracked sealed
economic files, hashes every source file and the launcher, verifies the parent
protocol and feed, and rejects normalization that changes any other setting or
walk-forward option. It produces a new protocol and feed copy without writing
to the original run. The original source-set SHA-256 was
`86fb0a4ada247b7049704b2948bb15b45a87c4ee776ec024f9022ff44bebd2d6`;
its exact protocol SHA-256 is
`6ee855cf2bebff9e0f353f135560148b9b2bccb633271fd53c010fe669c87be9`.
The launcher pins both the parent protocol bytes and the source manifest.
Any newer source seal and its differences must remain explicit.

After running, check the report-book cap source is the normalized runtime
settings, verify the exact 0.5× and 1× values, run the standard full
session/allocation and Base-cell audits, and report any source mismatch,
unknown funding, zero allocations, memory degradation, losses or margin
exceedance. The launcher's `verify` mode records those caps and whether margin
exceedance was observed; it is not a substitute for the independent audits.
Report initial post-Base historical PF and passed/evaluated counts separately
from the later funded-settled PF for this exact capped run.

## Completed capped replay

The frozen run used commit `582e209cc3e94ce25981c716263389d65952c3e6` and
economic source-set SHA-256
`d4847b799025e5309ce575e762e38525e93016350244b8457fcc5e7102e29d42`.
Its 19 October 00:00–20 October 00:00 UTC, 20-symbol, 5m Short initial cohort
had **10,439 / 14,702 post-Base configurations validated (71.00%)**, pooled
historical return PF **4.5708**. The later modeled funded-settled cohort was
**135,811 orders at unit-return PF 0.27496**. Realized balance declined from
$10 to **$9.7111**; marked ending equity was **$9.7099**. There were five
positive, 17 negative and two flat modeled cash hours. These results are
retrospective and do not establish live profitability.

There were 79 / 77 / 2 funded positions opened / closed / held and
135,818 / 135,811 / 7 funded orders opened / settled / held. Another 9,052
settled candidates and three endpoint candidates had known zero allocation;
unknown allocations were zero. The recorded caps were 0.5× per symbol and
side and 1× gross, both relative to realized balance. The modeled account
recorded **zero margin-exceedance minutes** during this window; this is a
measured property of this simulation, not a general feasibility guarantee.

| Target | Validated / evaluated | Historical PF | Funded settled | Later modeled PF |
| --- | ---: | ---: | ---: | ---: |
| 2 | 734 / 1,076 (68.22%) | 3.237 | 8,824 | 0.474 |
| 3 | 1,674 / 1,923 (87.05%) | 4.661 | 16,450 | 0.215 |
| 4 | 1,148 / 1,963 (58.48%) | 4.718 | 13,367 | 0.228 |
| 5 | 1,660 / 2,543 (65.28%) | 4.521 | 19,889 | 0.324 |
| 6 | 1,608 / 2,442 (65.85%) | 4.520 | 20,536 | 0.361 |
| Trailing-only, no TP | 3,615 / 4,755 (76.03%) | 4.806 | 56,745 | 0.232 |

No-TP siblings have no unique originating target step and remain separate.
The original and capped runs' complete ordered virtual trade records,
Base-pair rows, 24 validation-step records and endpoint virtual orders have
matching hashes. Their source seals differ: three files changed between them
(`live-parent-isolation.ts`, `live.server.ts` and `runtime.server.ts`). Thus,
the pre-allocation match is established for this observed replay only; the
later funded cohorts differ because the cap scaled or withheld allocation.

The allocation reconciliation passed 16/16 checks; an independently recomputed
Base audit verified all 144,863 virtual closes against their exact passing
cells. The corrected progression audit matched and checked the own-direction
history of all 135,811 funded closes, independently checked all 352,848
recorded validation-step decisions, and found no violations. The per-step
summary and independent cross-receipt reconciliation agree on funded counts,
gains, losses and cash. The first progression audit's failed receipt remains
preserved: its audit implementation had treated 9,052 known-zero allocation
rows as funded, plus a consequent total-count mismatch. The corrected audit
excludes known zero funding and still fails unknown or negative allocations.
No production deployment or venue execution is implied.
