# Independent lanes and Low-Range progression — 27 October 2026

This note supersedes earlier statements that Low-Range is unregistered. The
family is registered and opt-in for the Short range. Its 195 sources include
the original 75 and 120 independently keyed past-move variants. The source
identities, range, direction, strategy type and protection must remain separate
from Base through validation, ownership and each own exit. `AGENTS.project.md`
contains the standing operator rule. Short's effective minimum return PF is
1.1, retaining any stricter explicit range value.

## 20-symbol production-path replays

Both replays froze the economic-source file hash
`86fb0a4ada247b7049704b2948bb15b45a87c4ee776ec024f9022ff44bebd2d6`, used
the Short grid, all 195 sources and steps 2–6 plus trailing-only cells, modeled
0.15% round-trip cost and enabled Normal/Trailing. Entry tactics were disabled
as a post-hoc follow-up to the earlier empty default-tactics sample. Other
indications, Historic Exit, Axis and DCA were outside these two replays. The
cached market data had been examined previously. Neither run is venue execution
or evidence that future PF will stay above 1.

At **2026-10-09 12:00 UTC**, the 15m run passed Base for 28/195 source pairs;
**1,047/2,715 (38.56%)** configs validated at the run start, with historical
pooled return PF **23.055106**. During the following 24h, funded-model unit
return PF was **0.078848** on **2,156 settled orders**; 2,156/2,156/0 orders
and 17/17/0 positions opened/settled-or-closed/held. There were 3 positive,
9 negative and 12 flat hours. The allocation was feasible under this modeled
margin check. All 65,160 recorded hourly config checks matched an independent
scalar reference; every settled order matched its exact source tape and passed
its own direction check at entry.

At **2026-10-19 00:00 UTC**, the 5m run passed Base for 68/195 source pairs;
**10,439/14,702 (71.00%)** configs validated at the run start, with historical
pooled PF **4.570829**. During the following 24h, modeled settled PF was
**0.258533** on **144,863 settled orders**; 144,873/144,863/10 orders and
80/77/3 positions opened/settled-or-closed/held. There were 2 positive,
20 negative and 2 flat hours. This allocation is **infeasible**: modeled margin
exceeded equity for 635 minutes. Closed balance fell from $10 to $2.359923;
open marks are separate. All 352,848 hourly config checks matched the scalar
reference; every settled order matched its exact tape and own entry-time
direction gate. These two timeframes and histories differ and are not a
controlled apples-to-apples comparison.

The 15m run was repeated after integrating the live ownership and native-exit
repair, at source checkpoint `552095a` and economic file seal
`5bea55c6a56440e2e7cb0071bfcb9cbc05ac50d9f798accb6cf119e5d53e49a0`.
Its Base rows, ordered trades, endpoint holdings and all 24 validation steps
matched the earlier 15m replay exactly; all 65,160 scalar checks, 2,156 exact
tape matches and the allocation/Base-cell audits passed again. Evidence and
comparison hashes are in `runtime-195-15m-final/`.

The first attempt to replay that second window on 15m had only 96 pre-start
bars, less than the runtime's 120-bar universe minimum, and failed Base and
indication coverage. Its validation percentage and PF are unavailable, not
zero. The 5m follow-up used the same 20 symbols with 12h indicator warm-up,
12h evaluated prehistory and 24h simulation; it is a different lane.

A post-hoc capped replay of the same 5m input uses **0.5× realized balance**
per symbol/side and **1× realized balance** gross. Its initial post-Base
validation remains **10,439/14,702 (71.00%)**, historical PF **4.570829**.
It settled **135,811 funded-modeled orders** at later unit-return PF
**0.274964**; 135,818/135,811/7 orders and 79/77/2 positions opened/
settled-or-closed/held. Known-zero allocations account for 9,052 further
virtual settled records and three virtual endpoint holdings; they do not
enter funded PF. No modeled margin exceedance was observed, but closed balance
fell from $10 to **$9.711091**, with five positive, 17 negative and two flat
hours. Base, 352,848 step checks, all 135,811 funded tape matches and
allocation reconciliation passed. The original and capped ordered virtual
cohorts and hourly validation records matched exactly. This comparison was
selected after observing the uncapped margin failure and is not a holdout.

The first progression-audit attempt incorrectly treated known-zero
allocations as funded and failed; its failure receipt is retained. The audit
and step report now exclude known zero, fail unknown allocations, and were
retested. See `runtime-195-5m-capped/` for the protocol, failure summary,
complete compressed progression and reconciliation evidence.

Full protocols, Base-cell receipts, compact allocation audits, step/symbol/
hour data and compressed per-config progression are retained in
`runtime-195-15m/` and `runtime-195-5m/`. The standalone HTML reports also
contain the complete 20-symbol × 24-hour rows and diagrams. Their client
rendering and HTML parse were tested; real browser visual QA remains open.

## New past-move candidate study

In the separate 1m/5m/15m retrospective research cohort, **1,108/5,834
(18.99%)** config-direction contexts validated after Base, historical PF
**3.23**. Following only initially validated contexts with causal own-gate
rechecks produced **8,481 settled overlapping unallocated candidate records**
at PF **0.720**, with four held candidates. These are not funded orders or
venue fills. Full and stratified audits, protocol and relation details are in
`past-move-candidate-v1/` and `PAST-MOVE-METHOD.md`.

## Mixed Historic Exit probe

The default-tactics 12-symbol replay used a separate 150h evaluation/fitting
window and 24h simulation. At start **72/728 (9.89%)** ordinary configs
validated, historical PF **3.114704**; 141 later modeled settled Trailing
orders had PF **71.545129**, while 121 orders remained held. Historic Exit
evaluated 10 source pairs and passed **0/10** at Base, so no Exit config or
order was tested and Exit post-Base PF/percentage are unavailable. The high
settled PF is not a full account or future-profit proof. The preserved compact
evidence is in `exit-mixed-150h-default/`.

The post-hoc expanded inventory at final source `552095a` evaluated **40/40**
Historic Exit source pairs and passed **0/40** at Base, so Exit still has no
post-Base validation or executed orders in this sample. At run start **72/1,344
(5.36%)** ordinary configs validated, historical PF **3.114704**. Later
modeled Trailing PF remained **71.545129** on 141 settled orders, with 121
orders still held. This is the same market window and not a separate holdout.
The source seal, report reconciliation and exact summary are preserved in
`exit-mixed-150h-expanded/`.

An initial mixed launcher failed settings normalization before scoring; its
corrected launcher froze a third identical normalization. Preserve that failed
attempt. The expanded Exit inventory is an audited post-hoc test with an
empty Exit result, not proof of mixed Exit execution.

## Integrated follow-up, 27 October 2026

The parallel Relate branch through `cb6d629` was semantically incorporated and
recorded as local merge ancestry. Its old measured study remains attributed to
its original source. A reproduced Relate Active-gate bypass was corrected
separately. Current economic source checkpoint `c910672` has SHA-256
`edc598b9c7e04b98429a9cfe0a77ea12b3642ade2964079d97af6f3ed76e082d`.
Compact protocols, audits, hourly progression and per-direction outcomes for
these three final-source replays are retained in `runtime-c910672/`.

The 20-symbol 15m Short-range replay on 9 October 12:00–10 October 12:00 UTC
repeated at that checkpoint: 1,047/2,715 configurations validated (38.56%,
historical pooled PF 23.0551); 2,156 subsequent funded-modeled settled orders
had return PF 0.078848. Base cells, allocation, 2,156 entry-direction/tape
matches and 65,160 scalar hourly checks passed; ordered Base, trades, holdings
and validation matched the earlier final replay. Entry tactics were off as a
post-hoc choice, and Historic Exit was excluded.

The 20-symbol 5m Short-range replay on 19 October 00:00–20 October 00:00 UTC
also repeated at that checkpoint: 10,439/14,702 configurations validated at
start (71.00%, historical pooled PF 4.570829). Later, 135,811 settled funded-
modeled orders had unit-return PF 0.274964; 135,818/135,811/7 orders and
79/77/2 positions opened/settled-or-closed/held. Known-zero allocation excluded
9,052 further settled candidates; no modeled margin exceedance was observed
under the post-hoc realized-balance caps. All 352,848 scalar hourly checks,
135,811 own-tape/direction matches and Base/allocation audits passed. Its
ordered virtual trades, Base proofs, validation steps and endpoint virtual
orders match the original uncapped replay. This is previously examined Binance
USD-M data, not BingX fills or an untouched holdout; Historic Exit was disabled.

For each exact config and direction, the detailed report shows the subsequent
modeled outcomes separately across all 24 close-hour bins, including empty
directions. In the 5m run, 0/693 contexts with at least 20 settled orders in
at least three active hours had PF at least 1.1 in every active hour. This is a
post-hoc consistency screen, not a direction-level Base validation percentage
or evidence that any strategy will be profitable in future.

The separate 12-symbol, 150h-fit mixed Exit replay at `c910672` again produced
0/40 independently evaluated Exit pairs passing Base, so no Exit execution or
post-Base PF/percentage was available. Ordinary configs validated 72/1,344
(5.36%, historical PF 3.114704); the later 141 modeled settled orders had PF
71.545129 while 121 orders remained held. This incomplete and small settled
sample is not proof of ongoing profitability or mixed Exit execution.

The live executor now conservatively admits at most one owned parent per
netted symbol/side, retains unresolved legacy parents and their protection,
and records native close quantity, price and fees only when verified. It
protects existing native exits during cap pressure and holds unknown fills or
cancellations for reconciliation. This reduces live concurrency; non-atomic
venue exits and existing shared exposure still prevent a full isolation
guarantee. Partial recovery can temporarily lack the exact native stop, and
paper-only time/trailing exits can wait for venue fill or reconciliation.

The 0.15% modeled-cost ceiling remains an operator policy. It can understate
larger real costs; actual venue fees remain separate. Changing cost while a
paper position is held can change that position's modeled accounting because
ordinary entries do not persist a proven entry-time cost. Low-Range no-TP
siblings retain the existing 3% stop/gap ceiling, which truncates or merges
some high-ratio cells. Other range families do not have a common absolute
step. Base cell statistics pool long and short outcomes; later direction
checks are separate. Do not claim universal independent Base proof or a
systemwide cost-plus-step floor. See `MODELED-COST-CEILING-AUDIT.md` and
`CONFIG-DIRECTION-HOURS.md`.

Combined TypeScript checking passed at `c910672`. Focused offline regressions
included 161 execution-budget cases, 114 lifecycle/order-side cases, 76 native
ownership/fill cases, 113 Historic Exit floor cases, 405 settings/preset cases
and independent reproduction tests, with their stated source combinations.
The 317-file full core suite completed against `c910672` with exit 1: 3,894
passed, 58 failed, two were skipped and none were canceled. It exposed the
foreign-side orphan-stop defect and 48 legacy drain-fixture failures; later
test corrections retained 18 unresolved shared-side protection-repair failures.
The exact TAP, failure list, inventory, memory trace and receipt are preserved
in `core-audit-c910672/`. A previous `96ca6cf` full run was interrupted after
36 top-level results and is not a pass. Newer live fixes require their own
retests. Real-browser visual QA, actual venue verification, historically
stable PF and external publication are unresolved.

## Remaining release boundaries

No live reload, venue execution, public push or external merge has occurred. The local
guard blocks new ambiguous parents, preserves native protection through mode
drain, and restores cancelled native exits only with verified quantities and
saved levels. Default aggregate/one-way venue positions still cannot establish
separate historical parent quantities without durable fill provenance and
reconciliation. A paper-triggered time/trailing exit can wait during a mode
drain. Venue gaps, refusal and delayed execution prevent a guarantee of exact
stop prices. See `docs/live-parent-isolation.md`.
Legacy pair-seat mode intentionally coordinates variants within a range/type;
default config-seat mode is individual. Full CI, browser visual QA, low-range
systemwide stop/trailing-floor migration, and matching Axis/DCA/Historic Exit
Low-Range qualification remain outstanding. An automatic review previously
rejected public push of the branch and derived research without explicit
disclosure authorization; do not bypass that rejection.
