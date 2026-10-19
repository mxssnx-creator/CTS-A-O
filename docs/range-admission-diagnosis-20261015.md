# Engine range admission diagnosis, 15 October 2026

This is a read-only reduction of the frozen attempt-03 six-hour simulation, not a new strategy run or live result. The trading window is 14 October 22:00–15 October 04:00 UTC; evaluated prehistory is the preceding six hours. Older bars initialize indicators only. Source, raw trades and the normalized allocation book are preserved under `runs/signal-6x6-20261015-0400/attempt-03-independent-signal-cells/`.

The range tags are **Micro=`mc`, Minimal=`mn`, Short=`sh`, General=`gn`, Long=`lg`**. “Minimum” refers to Minimal here. An indication's Short/Medium parameter family and a trade's long/short direction are different dimensions. The six failed checks in the previous report concern Short/General/Long, not Micro/Minimal.

## Admission and forward results

| Range | Base pairs passing / eligible | Built effective configs | Initial configEval passes | Initially qualified tape candidates: forward PF / closes | Accepted virtual orders: PF / settled slices | Funded owned orders: PF / settled slices |
|---|---:|---:|---:|---:|---:|---:|
| Micro |64 /640|38,216|16,716|0.968887 /152,660|0.770631 /30,690|**0.843915 /23,294**|
| Minimal |28 /794|3,640|2,170|1.331271 /13,830|1.312051 /3,298|**1.381520 /2,746**|
| Short |0 /89|0|0|Unavailable /0|Unavailable /0|Unavailable /0|

Candidate tapes overlap across protection variants and are diagnostic. Accepted virtual orders passed the runtime execution gates before modeled account allocation. Primary modeled execution PF includes only the positive allocated settled close slices, after the existing 1e-9 USD allocation precision policy, using net unit returns without external Block/coordination multiples. Cash PF is a separate diagnostic on the same owned sample: Micro 0.707941/net−$30.551530; Minimal 1.593675/net+$3.634444. Endpoint marks remain separate.

All groups reconcile to the original funded book:26,098 settled slices, returnPF 0.9016968601, cashPF 0.7599364745 and net−$26.63299385. There are 7,956 zero-allocation virtual closes and zero unknown allocation identities. This does not establish actual exchange performance.

## First rejection waterfall

Base retains both the first failing gate and failures that miss only one condition. Micro has 576 first failures at the minimum 12 closes, but only 249 miss closes alone. Minimal has 766 first close-count failures, of which 244 miss only that condition. All 89 Short pairs first fail closes, and **none** fails closes alone. Reducing the sample threshold by itself would not make those 89 Short pairs otherwise qualified; their remaining failure detail was not retained per pair.

| Initial configEval first result | Micro | Minimal |
|---|---:|---:|
| Pass |16,716|2,170|
| Closes |1,610|252|
| Nonpositive net |11,734|392|
| PF |438|152|
| Drawdown ratio |4,314|282|
| Last-N |2,844|306|
| Lower-confidence bound |520|72|
| Green-hour share |40|14|
| Total built |38,216|3,640|

The unchanged Base build floor isPF 1 with 12 closes and DDR≤1; later config gates retain Micro 1.05, Minimal 1.08, Short 1.1 and Tactic's minimum 1.1. A broader Base build floor never authorizes a trade below its later gates. Initial qualified historical pools have high PF (Micro 7.905786; Minimal 9.906653), yet Micro subsequently loses. Historical best-cell selection is therefore not evidence of positive execution.

The Main-stage grid inventory is complete for the pairs that reached Main: Micro 60,928 cells=38,216 built+22,712 `baseTarget` skips; Minimal 33,768=3,640 built+10,472 `baseTarget`+19,656 `baseRange` skips. Short's 1,008, General's 1,152 and Long's 1,440 recorded cells all skip `baseRange`. These three inventories cover only the three non-Micro pairs that reached Main. They are not the full configured grids of every Base-rejected eligible pair.

Every one of the original 62 reconciliation-check records remains unchanged. The six failures are `coverage: range sh/gn/lg has config sets` and `execution: range sh/gn/lg executed orders`. Each has expected 1/actual 0. Complete Signal history calculation is separate:504 pairs and 19,278 effective protection configs were built, but funded Signal entries and settled closes remain zero.

## Funded direction and protection details

| Range/type | Long slices / return PF | Short slices / return PF |
|---|---:|---:|
| Micro Normal |4,182 /0.360948|5,188 /17.453493|
| Micro Trailing |7,600 /0.367193|6,324 /4.067955|
| Minimal Normal |386 /0.477835|454 /No losses|
| Minimal Trailing |788 /0.516210|1,118 /11.429127|

The asymmetry is a retrospective diagnostic. It does not authorize removing longs after seeing these returns. All winning and losing directions remain in the evidence. A no-loss sample has no measured finite ratio; the engine's score 4 is not reported as PF 4.

Of 76,432 built Micro config-sides,10,944 have a funded close and only 16 have at least 12 funded settled slices during this six-hour window (four finite PF≥1.1 and 12 no-loss samples). Minimal has 1,506 active funded config-sides out of 7,280, but none has 12 funded closes. A positive range aggregate therefore does not independently prove every protection cell. Separate research qualification will require at least 30 unique settled onsets per exact config/symbol/direction, with partial closes deduplicated and correlated market observations disclosed.

## Structural findings and testable hypotheses

- The causal Base universe is physically truncated to trade start. Best-cell Base prioritizes an actually passing cell before net ranking. Neither suspected lookahead nor a losing representative overriding a passing sibling is present in this saved run.
- Base normally measures untrailed cells at the first hold; Micro samples five of its 17 stop ratios. `baseTrailCells` is an existing optional additional trailing cell per target. This is documented admission scope, not full evaluation of every later TP/SL/trailing/hold config. A frozen comparison can test whether adding those causal trailing Base cells increases subsequently qualified and funded profitable configs. More unfiltered cells alone are not success.
- Extending evaluated historical evidence can resolve a sample shortage without lowering gates. It cannot rescue nonpositive net or losing PF, and longer forward evidence is required for exact-config execution proof.
- The long/short deterioration warrants a frozen test of the existing engine side-acceptance policy. It is disabled in the saved default run; enabling its existingPF 1.05/24 h/30-close rule adds a gate. Both directions and refused candidates must remain reported.
- Micro's 0.20% round-trip cost is material relative to its 0.4–1.0% default gross targets. Cost assumptions must remain fixed. Removing fees or narrowing the denominator would manufacture improvement.
- A separate source audit found custom SL/trailing-step parity defects; their correction is being verified independently. Shipped step 1 defaults are byte-identical, so these defects do not explain this default six-hour loss.
- Pre-fix settings prose understated the actual ladders: Short is 9–14× cost with SL 1–2.5×, Minimal steps 0.5× cost, Micro net targets 0.2–0.8%. Actual saved effective IDs/distances are authoritative; copied old prose is not.

Broader saved research is useful for generating hypotheses, not substituting qualification proof. Old research files lack current range/side/ownership provenance;105 and 102 raw survivor rows collapse to 17 and 14 unique effective protects. The narrow 1 m selected replay loses OOS (PF 0.460549/83 closes). The newer four-source Signal “Short” parameter family is not engine range`sh`; its archived 1 m PF and the archived short-direction screen are withdrawn pending the runtime-parity rerun in `docs/signal-research-protocol-20261016.json`. No source is promoted by this diagnosis.

## Exact evidence

`runs/range-admission-audit-20261015/audit.json` records input hashes, full Base/build/initial-evaluation waterfalls, all six hourly validation snapshots, allocation reconciliation and exact indication/type/direction summaries. `exact-config-side-evidence.csv` retains 83,712 Micro/Minimal config-side rows with effective TP/SL/trail/hold identities, initial qualification, available side history, virtual closes, funded closes, gross sums, no-loss truth and zero allocations. Missing retained tape histories are unknown, not zero. `funded-protection-summary.json` and range/type/side CSVs retain complete posthoc groupings.

The bounded follow-up rules are frozen in `runs/range-study-20261015/protocol.json` before scoring. Its three profiles retain all protection cells and all current gates; findings concern a fixed four-symbol 15 m regular/combined development scope only. Model execution must wait for the final source freeze. Newly accessed 04:00–07:00 UTC data is only a provisional three-hour outer sample; no acquisition is authorized until the selected profile/identity/source freeze.
