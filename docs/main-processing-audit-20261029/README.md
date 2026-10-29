# Main processing audit — 29 October 2026

The reporting bugs are fixed. **The later executed PF remains 0.273050873; this is not a profitability repair or a completed stage-chain rollout.**

The baseline and final actual-runtime repeat use eight fixed symbols, 24 hours of evaluated prehistory (7 October 12:00–8 October 12:00 UTC), and 24 hours of trading (8–9 October 12:00 UTC). Another 24 hours initializes indicators only. The repeat's frozen feed contains exactly 4,320 minute bars per symbol: 72 hours total. Symbols: ADA, APT, ARB, ATOM, AVAX, BCH, BNB and BTC, all USDT pairs, selected before scoring. This is a bounded diagnostic grid: 51 focus pairs, automatically included ordinary Micro sources, one prespecified TP per enabled range, endpoint SL ratios, Normal/Trailing/trailing-only, DCA and Axis. Signal and independent Exit fitting use an explicitly recorded 24-hour study override, rather than claiming 150 hours from missing data. Production floors, costs, Last-N counts and sample gates are preserved.

Open [report.html](report.html) for the hourly heatmap, all 2,468 calculated config records, all 3,108 funded order records, close reasons, holds and the 114 baseline switch controls. Config and order tables render 100 rows at a time. Complete JSONL/CSV exports retain every row. Full source/context evidence is in [main-processing.json.gz](main-processing.json.gz), and all three runs, checksummed sidecars and failed attempts are retained in [evidence.tar.gz](evidence.tar.gz). [summary.json](summary.json) and [protocol.json](protocol.json) record the settings and source/feed hashes. These are offline modeled orders; no exchange account was used.

## Confirmed defects and repairs

1. `api-data.ts:primarySimSummary` appended `openAtEnd` to the headline PF while its `executed`, type, config and hourly groups used closed orders. A regression with two known closes has PF 1.36, but adding a losing held mark previously made the headline 0.026667 with three “orders.” The closed headline now remains PF 1.36 and two settled orders; the held loss remains in `markedStats`, the complete ownership counts and the mark-inclusive sized diagnostic. Explicit preset mark-inclusive views retain their own basis. The test failed before the repair and passes after it.
2. The validation headline and range/type/lane aggregates used pooled GP/GL, rather than the requested equal-weight mean of individually passing sets. For passing PFs 8 and 2, the requested mean is 5, while their example pooled ratio is 28/11. `validated-set-pf.ts` accumulates an online mean without retaining additional trade histories. No-loss sets are separately counted; the gate's finite score 4 is never averaged as measured PF. Missing/legacy per-set evidence stays unavailable. Rejected candidates affect evaluated counts, not passing PF.
3. Overview, Statistics, Prehistoric and Stages/listing views now share the same mean, validation denominator, snapshot clock and explicit subsequent closed/marked execution samples. All admitted losing orders remain in execution statistics. Filtered lane/type/range means are tested against independent per-set inputs.
4. The generic freeze tool's claim of “22 symbols” was a stale literal. It now records the actual symbol count and supplied study metadata, and does not assert that arbitrary supplied overrides left all thresholds unchanged.

## Actual financial result

| Cohort | Result |
| --- | --- |
| Base representatives, including independent Exit | 143/1,398 (10.2289%) |
| Initial engine config validation | 405/1,276 (31.7398%) |
| Initial selected-set historical PF | Finite mean 17.399524089 across 399 finite sets; six additional no-loss sets |
| Later funded closed PF | 0.273050872975075, 3,108 closes |
| Positions opened / closed / held | 52 / 49 / 3 |
| Orders opened / closed / held | 3,116 / 3,108 / 8 |
| Current paper selection after computation | Zero engine configs and two Signal configs; previously admitted holdings remain tracked |
| Venue-owned/funded exchange PF | Unavailable |

| Strategy | Funded closes | Later unit PF |
| --- | ---: | ---: |
| Normal | 930 | 0.3248553011 |
| Trailing | 855 | 0.2655707288 |
| Trailing only | 138 | 0.4169639097 |
| DCA | 621 | 0.2527146482 |
| Axis | 564 | 0.2206470633 |
| Signal / independent Historic Exit | 0 | Unavailable |

Minimal contributed 1,923 closes at PF 0.3089078441; Wide ladder configurations contributed 1,185 at PF 0.2463347460. Micro, Short, General and Long produced no funded close in this window. A configured or historically passing lane is not an executed order.

The low result is present on the exact source cohort too: all 3,108 funded closes match their own config × symbol × direction × entry × exit source rows, with zero missing identities and zero changed returns. Before and after reporting changes, every funded trade, held record, allocation and total report is identical. Trade checksum: `551700fb1fa1c1c9b9595851bbb6cc56de995243e747ec19a06a97f821af33b8`.

## What closes the orders

Normal TP worked: 446 TP closes; 442 SL closes and 42 timed closes. Trailing had 273 TP, 281 SL, 257 trail and 44 time closes. Trailing-only had 67 trail, 59 SL and 12 time closes. DCA had 352 TP, 213 SL and 56 time closes; Axis had 151 TP, 380 SL, 11 breakeven and 22 time closes. Every close is listed with its exact config and duration.

Normal/Trailing timed closes in this frozen grid occur at 960 minutes (16 hours); DCA/Axis timed closes occur at 480 minutes (8 hours). These are their configured own holds, not the Micro 15-minute cap. The capped Micro lane had no funded close in this session, so it cannot explain these 3,108 outcomes. Separate deterministic 72-hour regressions verify Micro TP, 15-minute expiry on a 30-minute source, retained stop ownership, restart, and tick deadlines. The production hold/protection fixes were merged in PR234.

The independent price/cost audit checks 1,923 Normal/Trailing closes against `side × (exit − entry)/entry − 0.0015`. All match within compact Float32 price precision (maximum return difference 9.69e−8). No second cost deduction is present there. The same ordinary closes have gross price-return PF 0.4229628771 before costs, so fees alone do not explain their loss. DCA/Axis intrinsic ladders are not falsely treated as simple price returns: their full source/execution parity passes, and their deterministic cost/ownership regressions are separate. The exact strategy result includes their losing internal ladder contributions. No fee was lowered or loss removed to obtain a different PF.

## Remaining Main architecture issue

Current Main admission still evaluates the candidate tapes. The systemwide persistent architecture requested by the operator—new Base-linked Main sets, independent Main processing/own close histories, new Real sets, Overall processing, then final Active ownership—remains unfinished in draft #219. The experimental adapter must not be activated as if complete. This release changes reporting and diagnostic evidence, not that admission architecture.

Every funded entry passed a fresh reconstruction of its current Base, config, own-direction and configured symbol gate. The own-direction minimum observed count was 12. However, 3,087 entries had fewer than nine earlier closes on their own symbol/direction; the minimum was one. That reflects the current separate symbol-gate warmup and pooled-across-symbol config evidence. It is not proof that the requested independent processed-set Last-N gates exist. Do not silently substitute a stricter symbol gate, raw candidates, sibling results or insufficient “warming” samples for the missing predecessor-stage adapter.

Even a correct causal processed-set chain cannot guarantee a high PF on future outcomes. Historical passing windows and later admitted outcomes are different samples. The regression contract requires identical returns when the *same* closed cohort is compared, which passes here. It does not permit erasing later losses because a set ceases to qualify.

## Coverage, performance and validation

The actual report checks remain **76/78 passing**, not a full catalog pass. Two coverage checks fail: 1,461/1,634 expected Base combinations and 13/16 indication categories were evaluated. The 30-minute causal Base prefix has 96 bars; the production minimum is 120. With 24 hours of trading and a 72-hour total limit, sufficient 30-minute startup history cannot be supplied. That absence is reported, not promoted as a passing result or repaired by extending the study beyond three days.

The repeat took **12.29 seconds**, **521.3 MiB peak RSS** (Python `resource` child-process measurement), with the already-recorded 114 switch controls omitted. The original controls raised RSS as high as 1,282 MB; that larger sweep is not the repeat's memory measurement. Fixed market-data replay made no exchange REST calls. Rate-limit and live-order behavior were not inferred from this offline session.

Local validation: 247 guarded core regressions pass, including cost, TP/trailing, minute caps/recovery, independent Exit coordination/caps, publication, 844-source Micro/Inverse order identity, exact admission and source/execution parity. The 40-hour Last-N scalar fixture checks more than 10,000 decisions across N=1/2/3/5/8/9/10/12/15/20/25/30/35/40/50/75 and all requested range floors, with both sides and exact clock boundaries. Separate API-contract, script/UI-helper, typecheck and build results are recorded in the release handoff. HTML JavaScript syntax is checked; no local browser visual inspection is claimed.

Final local verification: 247 guarded core regressions; 24 API-contract checks and eight durable paper/runtime checks; seven script/UI-helper checks; TypeScript, scoped ESLint (zero errors; existing warnings only), and the full development/core-worker build pass. The shared current listing now displays read failures. Config details separate exact current validation, exact subsequent execution and archived model scores; the old Main database-results tab is replaced by the validated listing, while historical evaluation remains accessible and explicitly labeled.

The final actual-runtime repeat used published code checkpoint `d40ecf85ce27c0a680b778ffdb201e7e9ec245fa`; its frozen economic source hash is `a069ea7d66827c26b75be02d4b8c48875f1a836822815bfdac08336159316c0a`. Later UI error presentation and audit-input guards do not alter those sealed economic sources or observed results. The current audit-input guard was rerun against the actual final raw evidence and reproduces the archived result exactly.

## Concurrent Main integration follow-up

Main advanced to `ad5e33a` while the PR checks ran. The range qualification/Axis coverage and adverse observed stop-gap repairs were merged into the reporting branch, resolving only a handoff-document conflict. A pair passing one range can no longer lend Base proof to a failed sibling when diagnostic range expansion is enabled. The exact combined economic checkpoint is `67ccf745046c853b75f1ccb3c22e37bd783bcd24`, source hash `5b7b4e53ce0b093458de4ebf9be6389203b5c2defd3043b4260ba9cbecc74e50`.

The refreshed actual-runtime run again uses exactly72h total. All2,468 source tapes, all3,108 funded closes, all8held orders and every allocation reproduce the original cohort exactly; PF remains0.273050873. Time11.997s; peak RSS531.7MiB. This study uses `baseRanges=true`; it does not establish the financial impact of the diagnostic expansion defect. The separate bounded24-case range/type/side/allSets matrix reproduces and fixes that failure. Cost/gap/hold/reporting checks, explicit Axis worker coverage, typecheck, development/core-worker build and30h packaged-worker incremental/stop-gap parity pass. See [merged-main-verification.json](merged-main-verification.json) and [protocol-merged-main.json](protocol-merged-main.json).

Both complete hosted workflows passed on the earlier `b9414ec` source. Further commits explicitly skip the inherited full workflows because those contain18-day synthetic-market fixtures beyond the requested72h maximum. The combined source is verified with the bounded suites and actual-runtime run above; old CI results must not be attributed to a newer head. The report's historical dataset and the new combined-source cohort are exactly equal, with failed30m coverage retained. The persistent own Main/Real adapter is still unfinished and venue PF remains unavailable.
