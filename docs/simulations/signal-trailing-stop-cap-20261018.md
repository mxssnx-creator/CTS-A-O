# Signal stop cap and trailing correctness — 18 October 2026

Functional source commit: `795adf06d162e4b494c92c4ba2c84d76fc255ec1`, on `fix/signal-trailing-stop-cap-20261018`, draft PR #175. This builds on accounting PR #172 through `bc8506757ea1bfe2e071772480a45735075fc2d6`. It is not a venue deployment, a completed full-suite release, or profitability evidence. Current main advanced during this work; reconcile its changes before integration rather than replacing them.

## Stop and identity policy

Signal initial adverse stop distance is at most 2% of entry before trailing activation; tighter requested stops remain tighter. The cap applies after lane scaling, feedback and ATR resolution, and to pending/restored paper positions. Signal DCA/Axis initial protection is capped; deeper DCA rungs cannot fill through an already resting stop. This is a price-trigger-distance rule, not a guarantee of 2% maximum account or realized loss. Gap fills, slippage and fees remain in returns.

Ordinary simulator and runtime trailing share a completed-bar ratchet. Longs follow favorable highs, shorts favorable lows, and a tighter stop never loosens on a pullback or restore. Signal activation and effective peak gaps are capped at 2%, with an absolute gap ceiling of 2% of original entry even after a large favorable move. Historic Exit and Axis hybrid retain their independent algorithms rather than being relabeled as ordinary trailing.

Optional `signals.trailRatios` provides independent gap-ratio configurations (0.1–2, at most eight); absent preserves the scalar policy. With entry 100, activation 1%, and long peak 104, ratios 0.5 / 0.75 / 1 yield stops 103.48 / 103.22 / 102.96. The ratio multiplies activation distance, not accumulated profit. No winning default is selected without execution evidence.

Normal fixed TP/SL, trailing with TP, trailing-only and Historic Exit retain independent identities and histories. Ordinary ratios and free/TP mode now have exact ID suffixes and survive restore. Duplicate raw requests that collapse to one capped protection are evaluated once. No PF, sample or drawdown gate is lowered.

## Bugs corrected

- Signal stops could exceed 2% after lane/ATR/feedback adjustments.
- Ordinary trailing ratios and free/capped mode were absent from config identity.
- The fixed-price sink optimization could skip dynamic Historic Exit protection; these configs now use the causal scanner.
- Restore added an irrelevant `exitProtection: undefined` property; only actual state is restored.
- Native fixed Signal stops used the quote rather than enforcing the cap from the actual fill.
- Hosted Node 24 testing exposed outward venue-tick rounding beyond the cap. Capped stops now round toward entry while preserving required venue clearance. At fill 10.2, the four-decimal long stop is 9.996, not 9.9959. Incompatible clearance/cap requirements return no valid stop, and retries cannot silently widen it.

Native Entries still does not handle managed trailing exits; Overall manages those. The read-only Signal contribution projection preserves the position-cache identity. Mixed-book aggregate backstops require separate venue acceptance and are not proof that every Signal lane's stop executed.

## Verification

Final local run: **632 passed, 0 failed, 0 skipped across 57 test files**, 305.48 seconds, with unchanged source throughout. Source-manifest SHA-256: `dc15a0cf295d84d315280aa0abe0870be5982652c0c21b68c0e3f80858523faf`.

Hosted Node 24.21.0 run `39162470176`: **149/149 focused tests**, TypeScript, lint (0 errors; 30 warnings), development app and packaged worker build passed before publication. Two earlier hosted attempts retained one native-stop failure each; its tick-rounding cause was fixed, not removed from the assertions. Earlier local 56-file verification passed 617/617. The final local sweep includes the additional venue-price cases.

Coverage includes both directions, fixed/TP-trailing/no-TP modes, independent ratios and IDs, costs and gap fills, lane/ATR/feedback caps, monotonic restore, worker serialization, Base-to-seat-to-entry independence, DCA/Axis protection, actual-fill native protection and Historic Exit sink parity. This is not the complete repository npm test plus slow release suite.

A corrected exact-key candidate-lifetime fixture matches the separately extracted pre-trailing source `9c037e2bc3d050136e1a8ca4397bb7669b90c00c`: 60 candidates, 48 feed rows, 42 settled rows. Complete output SHA-256: `83198b23fe37899b152593f52c3818c37a3396cebcce621bf5bb9662fc3f6159`; progress SHA-256: `9b11bef4ae499a18825a4df9d13223436fe392839fbdbd07240611de0404a59a`. This is mechanical parity, not market profitability.

## Frozen 12-symbol ratio smoke study: rejected

Three cases were frozen before scoring: ratios 0.5, 0.75 and 1.0; six evaluated history hours and six execution hours; 0.15% round-trip modeled cost. Execution window: 16 October 2026 18:00–24:00 UTC. These are retrospective modeled orders, not venue fills. The smoke source preceded the venue-only rounding followup; preserve its original manifests.

The four selected Signal sources were EMA cross, RSI reversal, Donchian and Supertrend. Eight representative Signal pairs had zero Base passes; no Signal unit was seated or executed. The cases therefore cannot rank the ratios. The engine's default causal Micro expansion remained enabled: 642 pairs evaluated, 103 admitted.

| Ratio | Candidate configs | Selected configs | Modeled settled close slices | Unit-return PF | Sized-cash PF | Signal executions |
|---|---:|---:|---:|---:|---:|---:|
| 0.5 | 45,622 | 10,323 | 17,674 | 1.632028 | 0.918753 | 0 |
| 0.75 | 45,614 | 10,323 | 17,674 | 1.632028 | 0.918753 | 0 |
| 1.0 | 45,590 | 10,323 | 17,674 | 1.632028 | 0.918753 | 0 |

Each case passed 66/66 report-consistency checks. That is not strategy acceptance. Closed sized net was -$0.110311 from $10 start, marked ending equity $1.633039, equity MDD 97.0334%, and required margin exceeded equity in 316/360 minutes. Capital feasibility failed. Open endpoint marks remain separate from settled closes. Unequal sizes mean primary unit-return PF and cash PF are not interchangeable.

| UTC hour start | Modeled close slices | Unit-return PF | Cash PF | Closed net USD |
|---|---:|---:|---:|---:|
| 18:00 | 2,728 | 12.305418 | 3.553822 | +0.086761 |
| 19:00 | 7,099 | 4.588507 | 3.333486 | +0.457940 |
| 20:00 | 1,565 | 0.670283 | 0.505454 | -0.116209 |
| 21:00 | 3,400 | 0.797486 | 0.612231 | -0.147991 |
| 22:00 | 2,444 | 0.547617 | 0.362966 | -0.172782 |
| 23:00 | 438 | 0.105881 | 0.090230 | -0.218029 |

Two positive and four negative hours do not establish continuous success. No best Signal ratio is selected and no live promotion follows from this sample.

## Release limits

Reconcile current main, the later PR172 completeness-test addition and separate PR173 confirmed-fill work. Full integrated npm test/slow checks, capital-feasible matched studies with sufficient independent Signal samples, and authenticated X02 VST open/update/close/control reconciliation remain required. No venue order, deployment or merge to main was performed in this trailing task. Frozen old-source research manifests are not bypassed to obtain green studies.
