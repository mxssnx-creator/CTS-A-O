> Historical PR #139 record. This document preserves its own source, six-arm study, verification counts and evidence archive. For the subsequent independently reviewed Overall Block release and current operational state, read [operations-handoff.md](operations-handoff.md) and [work-tasks.md](work-tasks.md). Its auxiliary candidate-history semantics are superseded by the explicit history selector in the subsequent release.

# Frozen Block comparison — 16 October 2026

No Block arm met the prespecified improvement criteria. Every arm had no admitted execution in development fold1. In fold2 all six arms produced the same 792 positive-owned settled close slices, unit-return PF 2.374851521792727 and settled net +4.418713040563437 USDT. That is zero measured PF uplift against OFF, below the required 20%. Endpoint marks differ and stay outside settled PF. No default, gate or mode is promoted from this retrospective result.

Continuous hourly positive PF was not achieved: in fold2, 23:00–00:00 UTC and 03:00–04:00 UTC had owned settled return PF 0 (52 and 60 losing slices respectively). Those losses remain in the aggregate and every arm.

These are not the most recent six hours relative to 16 October 2026. The latest available frozen data end on 15 October 2026 at 04:00 UTC. A current X02/live/latest-feed route was unavailable, so the earlier request for the latest six hours is not established by these reused historical folds.

These are continuous native paper allocations on reused development data, not venue fills or live-account evidence. 792 model-owned slices do not mean 792 exchange fills. Coverage/activity checks failed where scopes were empty or had no built/admitted configs; successful computation does not make those scopes complete or profitable.

## Source and frozen protocol

| Item | Value |
| --- | --- |
| Source checkpoint | `94192e597554bb75117420bdadd9a26c9f05a5f4` |
| Production/harness source SHA-256 | `29bc62138857e59a303ab4093aedade5238903cc8d2ae27d2339cd4e17f3fe35` |
| Protocol SHA-256 | `0fa183c7491cd401e3ae89900799994085918f10fe60966ddc6d314273a130b8` |
| Execution | v22.23.3; one offline worker; 44.261s for both folds/six arms |
| Scope | BTC-USDT, ETH-USDT, SOL-USDT, XRP-USDT; full current configured exit ladders |
| Cost/book | 0.20% modeled round-trip cost; starting balance 1000 USDT; equityPct 2%; leverage 10; unchanged native caps |
| Network/live orders | Zero network requests; no live orders |
| External evidence | `/workspace/backups/CTS-A-O/20261016-block-comparison/attempt-04` |
| Protocol equivalence | `protocol-equivalence.json`: six arms, feed hashes/dates, full actual settings/WF, cost/book/budget/criteria identical to attempt03 |
| Earlier attempt | attempt02 (old Overall semantics) and attempt03 (before isolated pool cancellation fix) remain preserved; neither substitutes for this final attempt04 result |

All settings were materialized through the stopped production runtime and exactly checked before the first compute. One native tape calculation per fold was reused by six chronological walk-forward arms. Full trade/open/step/Signal digests reproduced the native baseline exactly before comparison. The 108-file source seal was verified before and after scoring. `source-delta.json` proves the only production/harness difference from attempt03 is `src/core/server/pool.server.ts` (worker cancellation). `outcome-equivalence.json` confirms all 12 scoped numerical summaries, native raw trades/admissions/opens/validation/Signal/tapes, and full native book curves/allocations/partitions/checks are exactly unchanged. The pool fix changes no trading math, study settings or targets. These dates were previously researched; neither fold is an untouched holdout. Older candles only initialize indicators, never enlarge the evaluated preparation sample.

| Fold | Evaluated preparation (6h) | Execution (6h) | Execution Europe/Vienna | 1m bars/symbol | Gaps | Feed SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| development-1 | 10-13 16:00–10-13 22:00 UTC | 10-13 22:00–10-14 04:00 UTC | 10-14 00:00–10-14 06:00 CEST | 16980 | 0 | `070b3958dcd352e178c599bde3c63e12e447f695cd8e18cbfec6b5279bd843dc` |
| development-2 | 10-14 16:00–10-14 22:00 UTC | 10-14 22:00–10-15 04:00 UTC | 10-15 00:00–10-15 06:00 CEST | 16980 | 0 | `c64767ea9aaec18fe4b062fdd2ffd991983e6c38f4702c1906cffae523d0918e` |

Each supplied feed spans 283h, offering up to 271h of earlier indicator-only data before the 6h evaluated preparation and 6h execution. Native retention remains unchanged: 1m keeps up to 3 days, 5m up to 8 days, and 15m/30m up to 18 days. Thus lower-timeframe histories do not consume all 271 earlier hours. These are configured retention limits, not recorded per-lane warmup telemetry. The performance preparation remains exactly 6h. Europe/Vienna is CEST (UTC+02:00) for these dates.

| Arm | Block | Mode | Total mult cap | Ratio | Diagnostic |
| --- | --- | --- | --- | --- | --- |
| off | False | overall | 8 | 0.2 | True |
| overall8 | True | overall | 8 | 0.2 | False |
| shared8 | True | shared | 8 | 0.2 | False |
| shared8r04 | True | shared | 8 | 0.4 | True |
| additive8 | True | additive | 8 | 0.2 | False |
| overall2 | True | overall | 2 | 0.2 | True |

Every arm keeps Overall, Symbol, Direction and Indication sources enabled, Config/Type off. BlockActive, Axis and DCAActive remain off. Native Normal/Trailing/DCA and independent Signal Normal/capped-trailing/trailing-only policies remain unchanged; Signal-specific DCA/Axis remain off. Stored disabled-type hypotheses do not imply enabled execution. Code default Block ratio remains 0.5; study ratio 0.2 and prespecified higher Shared ratio 0.4 are explicit research assumptions.

## Return sample, gates and source-book scopes

Primary PF is GP/GL of verified modeled unit-net returns on positive-owned settled close slices after configured costs. External Block/coordination scaling is removed; intrinsic ladder behavior remains part of its config. Cash PF/net use the same owned slices. Known-zero allocations remain separate; unknown units/ownership would make the primary sample unavailable. Endpoint marks stay outside settled PF. No-loss sentinels are labeled rather than called finite measured PF. Return/cash tables display full double precision; native balance/equity/hour-DD fields retain recorded six-decimal display precision. Raw JSON preserves source values.

Global Overall learns only settled orders admitted at the final modeled Real entry boundary after modeled entry checks and before cash allocation. Auxiliary Symbol/Direction/Indication/Type books retain closed Real-selected candidate histories, including later entry rejects/unfunded candidates. Config remains exact cfg×symbol×direction; Signal own-Block is separate. The Indication source pools registry family×direction, while report `byRelation` uses full indication×symbol×direction. Source levels/counts do not imply funded ownership or venue fills.

Base, post-Base selection, return-PF, range, side/entry and allocation gates were not relaxed. Frozen WF gates include minimum PF 1.1, minimum 12 trades, existing range thresholds/warmup/preGate, Signal acceptance/side acceptance and positive coordinations. Exact config/lane/range/type/side identities remain independent. Whole-arm PF cannot qualify a sibling or supply its missing live evidence.

Each arm retains six `hourlyStageSnapshots` and zero-preserving hour×type×side cells. Validation checks are prior selection windows pooled over symbols/sides, not universally Main or executed counts; overlapping check n values are not summed. Shared native `funnel`/`basePairs` retain beforeBase/afterBase representative, pool and seated hypothetical cohorts under their original labels. Exact own hourly Base/Main PF is unavailable where native telemetry did not record the cohort (`stagePfAvailability`). Preparation has no actual shared-wallet/executed-order claim. Block traces are captured entry-time raw/effective levels and inspected closed-tail counts; absent means not computed, not zero, and does not certify durable SQL closed traces.

| Fold | Base combos evaluated | Requested combos | Base-passing combos | Engine grid cells considered | Engine configs built | Signal config records | Selection steps | Range steps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| development-1 | 920 | 920 | 0 | 0 | 0 | 4914 | 6 | 6 |
| development-2 | 920 | 920 | 3 | 4416 | 1000 | 4914 | 6 | 6 |

Fold1 has no Base-passing engine combo or admitted execution. Fold2 builds engine configs only for three Micro indication/lane combos; non-Micro range and Signal execution scopes remain empty. Native checks retain 15 failures per fold1 arm and 9 per fold2 arm. These configuration/activity gaps remain visible. Built catalogs distinguish disabled hypotheses; none is reported as a passing execution sample.

## Whole-arm settled results (12 rows)

| Fold | Arm | Owned settled n | Unit GP | Unit GL | Exact unit PF | Same-slice cash PF | Settled cash net USDT | End balance | End equity incl marks | Minute-close DD % | Max owned external mult |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| development-1 | off | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000000000 | — |
| development-1 | overall8 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000000000 | — |
| development-1 | shared8 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000000000 | — |
| development-1 | shared8r04 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000000000 | — |
| development-1 | additive8 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000000000 | — |
| development-1 | overall2 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000000000 | — |
| development-2 | off | 792 | 1.2969028679597718 | 0.54609850597344556 | 2.3748515217927268 | 2.2230310512345781 | 4.4187130405634374 | 1004.418713 | 1000.661431 | 2.871664944657 | 1 |
| development-2 | overall8 | 792 | 1.2969028679597718 | 0.54609850597344556 | 2.3748515217927268 | 2.2230310512345781 | 4.4187130405634374 | 1004.418713 | 1000.786972 | 2.871664944657 | 5 |
| development-2 | shared8 | 792 | 1.2969028679597718 | 0.54609850597344556 | 2.3748515217927268 | 2.2230310512345781 | 4.4187130405634374 | 1004.418713 | 1000.703278 | 2.871664944657 | 2 |
| development-2 | shared8r04 | 792 | 1.2969028679597718 | 0.54609850597344556 | 2.3748515217927268 | 2.2230310512345781 | 4.4187130405634374 | 1004.418713 | 1000.786972 | 2.871664944657 | 4 |
| development-2 | additive8 | 792 | 1.2969028679597718 | 0.54609850597344556 | 2.3748515217927268 | 2.2230310512345781 | 4.4187130405634374 | 1004.418713 | 1000.828819 | 2.871664944657 | 7 |
| development-2 | overall2 | 792 | 1.2969028679597718 | 0.54609850597344556 | 2.3748515217927268 | 2.2230310512345781 | 4.4187130405634374 | 1004.418713 | 1000.703278 | 2.871664944657 | 2 |

Assessment DD uses unrounded native minute-close extrema, not rounded sampled curve points. It is not a tick/wick adverse bound or liquidation guarantee. Fold2 exact maximum equity drawdown is 29.53296055637111 USDT (2.8716649446570645%), minimum minute equity 989.9244919775578 USDT and maximum margin 225.081139238653 USDT for every arm. The 73-point curve is sampled and can miss between-sample or intraminute extremes.

| Fold | Arm | Modeled unique entries | Modeled settled slices | Positive-owned settled | Zero settled | Unknown settled | Modeled end opens | Positive-owned opens | Zero opens | Max native modeled open orders | Max symbol-side positions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| development-1 | off | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| development-1 | overall8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| development-1 | shared8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| development-1 | shared8r04 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| development-1 | additive8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| development-1 | overall2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| development-2 | off | 977 | 936 | 792 | 144 | 0 | 41 | 41 | 0 | 396 | 3 |
| development-2 | overall8 | 977 | 936 | 792 | 144 | 0 | 41 | 41 | 0 | 396 | 3 |
| development-2 | shared8 | 977 | 936 | 792 | 144 | 0 | 41 | 41 | 0 | 396 | 3 |
| development-2 | shared8r04 | 977 | 936 | 792 | 144 | 0 | 41 | 41 | 0 | 396 | 3 |
| development-2 | additive8 | 977 | 936 | 792 | 144 | 0 | 41 | 41 | 0 | 396 | 3 |
| development-2 | overall2 | 977 | 936 | 792 | 144 | 0 | 41 | 41 | 0 | 396 | 3 |

Each fold2 arm ends with 41 positive-owned model orders in 3 symbol-side positions; 36 opens were scaled. Its owned settled sample is 224 Normal and 568 Trailing slices. Five DCA orders are open at the endpoint, with no settled DCA sample or measured DCA PF. Continuous paper amounts may be below venue minimum order/quantity sizes. Exchange precision, partial venue fills, latency, funding and liquidation are not reconstructed. Open and settled counts are different samples.

## Prespecified assessment and cap reconciliation

Each candidate had to pass every fold: ≥30 positive-owned settled slices, zero unknown primary evidence, finite measured unit PF≥1.1 and ≥1.20×OFF, exact minute-close equity DD≤10% and no worse than OFF. These are frozen research targets, not production gates. Fold1 fails the sample/known measured-PF/reference criteria. Fold2 passes sample/known-PF/absolute-PF/DD but PF/OFF=1, failing the 20% uplift. No candidate passes both folds. Cap2 provides no measured DD reduction here; higher Shared ratio provides no settled PF improvement.

| Arm | Matched owned slices | Changed external mult slices | Raw unequal allocated-dollar slices | Max raw allocated-dollar difference USDT |
| --- | --- | --- | --- | --- |
| off | 792 | 0 | 0 | 0 |
| overall8 | 792 | 390 | 42 | 2.6645352591003757e-15 |
| shared8 | 792 | 390 | 0 | 0 |
| shared8r04 | 792 | 390 | 0 | 0 |
| additive8 | 792 | 390 | 136 | 6.2172489379008766e-15 |
| overall2 | 792 | 390 | 0 | 0 |

Requested stacks did change. Binding position caps absorbed common raises: allocatedNotional=desiredUnit×volume×availablePositionRoom/sumWanted; unitNotional=allocatedNotional/volume. Settled dollars/cash can therefore agree while multipliers differ. All 792 settled allocations were scaled; 144 other settled slices received zero. There were 972 position-cap interventions including opens and 0 gross-cap interventions. Native fallback caps are 0.75×equity per symbol-side and 7×equity gross, not verified live settings. Raw floating differences above are preserved. Endpoint allocations/marks differ, explaining different end equity despite equal settled cash. The common exact owned-slice intersection is 792 in fold2 and 0 in fold1, a separate diagnostic rather than a whole-arm substitute.

## Aggregate execution hours (72 rows)

All six hours remain for each arm/fold. Close buckets are (start,end]; step telemetry is [start,end). GP/GL/PF/cash use the same owned settled slices. Hour balance/equity/DD are native six-decimal display values; unrounded whole-period minute extrema govern assessment. Native opened/open-end counters are modeled orders, not exchange fills. Positions are symbol-side groups.

| Fold | Arm | UTC hour | Vienna hour | Virtual closed | Owned closed | Zero closed | Unit GP | Unit GL | Exact unit PF | Cash PF | Cash net USDT | Balance | Equity | Hour DD % | Native modeled opened | Native modeled end-open | Positions opened/closed/end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| development-1 | off | 10-13 22:00–10-13 23:00 UTC | 10-14 00:00–10-14 01:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | off | 10-13 23:00–10-14 00:00 UTC | 10-14 01:00–10-14 02:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | off | 10-14 00:00–10-14 01:00 UTC | 10-14 02:00–10-14 03:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | off | 10-14 01:00–10-14 02:00 UTC | 10-14 03:00–10-14 04:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | off | 10-14 02:00–10-14 03:00 UTC | 10-14 04:00–10-14 05:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | off | 10-14 03:00–10-14 04:00 UTC | 10-14 05:00–10-14 06:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall8 | 10-13 22:00–10-13 23:00 UTC | 10-14 00:00–10-14 01:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall8 | 10-13 23:00–10-14 00:00 UTC | 10-14 01:00–10-14 02:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall8 | 10-14 00:00–10-14 01:00 UTC | 10-14 02:00–10-14 03:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall8 | 10-14 01:00–10-14 02:00 UTC | 10-14 03:00–10-14 04:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall8 | 10-14 02:00–10-14 03:00 UTC | 10-14 04:00–10-14 05:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall8 | 10-14 03:00–10-14 04:00 UTC | 10-14 05:00–10-14 06:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8 | 10-13 22:00–10-13 23:00 UTC | 10-14 00:00–10-14 01:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8 | 10-13 23:00–10-14 00:00 UTC | 10-14 01:00–10-14 02:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8 | 10-14 00:00–10-14 01:00 UTC | 10-14 02:00–10-14 03:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8 | 10-14 01:00–10-14 02:00 UTC | 10-14 03:00–10-14 04:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8 | 10-14 02:00–10-14 03:00 UTC | 10-14 04:00–10-14 05:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8 | 10-14 03:00–10-14 04:00 UTC | 10-14 05:00–10-14 06:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8r04 | 10-13 22:00–10-13 23:00 UTC | 10-14 00:00–10-14 01:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8r04 | 10-13 23:00–10-14 00:00 UTC | 10-14 01:00–10-14 02:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8r04 | 10-14 00:00–10-14 01:00 UTC | 10-14 02:00–10-14 03:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8r04 | 10-14 01:00–10-14 02:00 UTC | 10-14 03:00–10-14 04:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8r04 | 10-14 02:00–10-14 03:00 UTC | 10-14 04:00–10-14 05:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | shared8r04 | 10-14 03:00–10-14 04:00 UTC | 10-14 05:00–10-14 06:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | additive8 | 10-13 22:00–10-13 23:00 UTC | 10-14 00:00–10-14 01:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | additive8 | 10-13 23:00–10-14 00:00 UTC | 10-14 01:00–10-14 02:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | additive8 | 10-14 00:00–10-14 01:00 UTC | 10-14 02:00–10-14 03:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | additive8 | 10-14 01:00–10-14 02:00 UTC | 10-14 03:00–10-14 04:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | additive8 | 10-14 02:00–10-14 03:00 UTC | 10-14 04:00–10-14 05:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | additive8 | 10-14 03:00–10-14 04:00 UTC | 10-14 05:00–10-14 06:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall2 | 10-13 22:00–10-13 23:00 UTC | 10-14 00:00–10-14 01:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall2 | 10-13 23:00–10-14 00:00 UTC | 10-14 01:00–10-14 02:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall2 | 10-14 00:00–10-14 01:00 UTC | 10-14 02:00–10-14 03:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall2 | 10-14 01:00–10-14 02:00 UTC | 10-14 03:00–10-14 04:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall2 | 10-14 02:00–10-14 03:00 UTC | 10-14 04:00–10-14 05:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-1 | overall2 | 10-14 03:00–10-14 04:00 UTC | 10-14 05:00–10-14 06:00 CEST | 0 | 0 | 0 | — | — | unavailable | unavailable | — | 1000.000000 | 1000.000000 | 0.000000 | 0 | 0 | 0/0/0 |
| development-2 | off | 10-14 22:00–10-14 23:00 UTC | 10-15 00:00–10-15 01:00 CEST | 92 | 92 | 0 | 0.088902867959774576 | 0.018221575621310847 | 4.8789890516273022 | 4.87898905162732 | 0.54092825769232733 | 1000.540928 | 998.244001 | 0.494700 | 166 | 74 | 2/0/2 |
| development-2 | off | 10-14 23:00–10-15 00:00 UTC | 10-15 01:00–10-15 02:00 CEST | 52 | 52 | 0 | 0 | 0.056316831437936629 | 0 | 0 | -0.26101640887369143 | 1000.279912 | 995.762207 | 0.682500 | 262 | 284 | 1/0/3 |
| development-2 | off | 10-15 00:00–10-15 01:00 UTC | 10-15 02:00–10-15 03:00 CEST | 226 | 150 | 76 | 0.29200000000000137 | 0.050162114301046418 | 5.8211262437538451 | 10.69284892136417 | 2.2534964344564825 | 1002.533408 | 999.917933 | 1.166700 | 138 | 196 | 0/1/2 |
| development-2 | off | 10-15 01:00–10-15 02:00 UTC | 10-15 03:00–10-15 04:00 CEST | 162 | 120 | 42 | 0.16400000000000414 | 0.037419017206762786 | 4.3827981663389117 | 4.9355026331543854 | 0.70557391674104986 | 1003.238982 | 1001.029001 | 0.761300 | 174 | 344 | 0/0/2 |
| development-2 | off | 10-15 02:00–10-15 03:00 UTC | 10-15 04:00–10-15 05:00 CEST | 344 | 318 | 26 | 0.75200000000000555 | 0.056286087491407573 | 13.360317505010507 | 17.876249802172953 | 3.757743787451866 | 1006.996726 | 1004.970281 | 2.637500 | 196 | 96 | 1/2/1 |
| development-2 | off | 10-15 03:00–10-15 04:00 UTC | 10-15 05:00–10-15 06:00 CEST | 60 | 60 | 0 | 0 | 0.32769287991498103 | 0 | 0 | -2.578012946904606 | 1004.418713 | 1000.661431 | 2.871700 | 0 | 41 | 2/0/3 |
| development-2 | overall8 | 10-14 22:00–10-14 23:00 UTC | 10-15 00:00–10-15 01:00 CEST | 92 | 92 | 0 | 0.088902867959774576 | 0.018221575621310847 | 4.8789890516273022 | 4.87898905162732 | 0.54092825769232733 | 1000.540928 | 998.244001 | 0.494700 | 166 | 74 | 2/0/2 |
| development-2 | overall8 | 10-14 23:00–10-15 00:00 UTC | 10-15 01:00–10-15 02:00 CEST | 52 | 52 | 0 | 0 | 0.056316831437936629 | 0 | 0 | -0.26101640887369143 | 1000.279912 | 995.762207 | 0.682500 | 262 | 284 | 1/0/3 |
| development-2 | overall8 | 10-15 00:00–10-15 01:00 UTC | 10-15 02:00–10-15 03:00 CEST | 226 | 150 | 76 | 0.29200000000000137 | 0.050162114301046418 | 5.8211262437538451 | 10.69284892136417 | 2.2534964344564825 | 1002.533408 | 999.917933 | 1.166700 | 138 | 196 | 0/1/2 |
| development-2 | overall8 | 10-15 01:00–10-15 02:00 UTC | 10-15 03:00–10-15 04:00 CEST | 162 | 120 | 42 | 0.16400000000000414 | 0.037419017206762786 | 4.3827981663389117 | 4.9355026331543854 | 0.70557391674104986 | 1003.238982 | 1001.029001 | 0.761300 | 174 | 344 | 0/0/2 |
| development-2 | overall8 | 10-15 02:00–10-15 03:00 UTC | 10-15 04:00–10-15 05:00 CEST | 344 | 318 | 26 | 0.75200000000000555 | 0.056286087491407573 | 13.360317505010507 | 17.876249802172929 | 3.7577437874518655 | 1006.996726 | 1004.970281 | 2.637500 | 196 | 96 | 1/2/1 |
| development-2 | overall8 | 10-15 03:00–10-15 04:00 UTC | 10-15 05:00–10-15 06:00 CEST | 60 | 60 | 0 | 0 | 0.32769287991498103 | 0 | 0 | -2.578012946904606 | 1004.418713 | 1000.786972 | 2.871700 | 0 | 41 | 2/0/3 |
| development-2 | shared8 | 10-14 22:00–10-14 23:00 UTC | 10-15 00:00–10-15 01:00 CEST | 92 | 92 | 0 | 0.088902867959774576 | 0.018221575621310847 | 4.8789890516273022 | 4.87898905162732 | 0.54092825769232733 | 1000.540928 | 998.244001 | 0.494700 | 166 | 74 | 2/0/2 |
| development-2 | shared8 | 10-14 23:00–10-15 00:00 UTC | 10-15 01:00–10-15 02:00 CEST | 52 | 52 | 0 | 0 | 0.056316831437936629 | 0 | 0 | -0.26101640887369143 | 1000.279912 | 995.762207 | 0.682500 | 262 | 284 | 1/0/3 |
| development-2 | shared8 | 10-15 00:00–10-15 01:00 UTC | 10-15 02:00–10-15 03:00 CEST | 226 | 150 | 76 | 0.29200000000000137 | 0.050162114301046418 | 5.8211262437538451 | 10.69284892136417 | 2.2534964344564825 | 1002.533408 | 999.917933 | 1.166700 | 138 | 196 | 0/1/2 |
| development-2 | shared8 | 10-15 01:00–10-15 02:00 UTC | 10-15 03:00–10-15 04:00 CEST | 162 | 120 | 42 | 0.16400000000000414 | 0.037419017206762786 | 4.3827981663389117 | 4.9355026331543854 | 0.70557391674104986 | 1003.238982 | 1001.029001 | 0.761300 | 174 | 344 | 0/0/2 |
| development-2 | shared8 | 10-15 02:00–10-15 03:00 UTC | 10-15 04:00–10-15 05:00 CEST | 344 | 318 | 26 | 0.75200000000000555 | 0.056286087491407573 | 13.360317505010507 | 17.876249802172953 | 3.757743787451866 | 1006.996726 | 1004.970281 | 2.637500 | 196 | 96 | 1/2/1 |
| development-2 | shared8 | 10-15 03:00–10-15 04:00 UTC | 10-15 05:00–10-15 06:00 CEST | 60 | 60 | 0 | 0 | 0.32769287991498103 | 0 | 0 | -2.578012946904606 | 1004.418713 | 1000.703278 | 2.871700 | 0 | 41 | 2/0/3 |
| development-2 | shared8r04 | 10-14 22:00–10-14 23:00 UTC | 10-15 00:00–10-15 01:00 CEST | 92 | 92 | 0 | 0.088902867959774576 | 0.018221575621310847 | 4.8789890516273022 | 4.87898905162732 | 0.54092825769232733 | 1000.540928 | 998.244001 | 0.494700 | 166 | 74 | 2/0/2 |
| development-2 | shared8r04 | 10-14 23:00–10-15 00:00 UTC | 10-15 01:00–10-15 02:00 CEST | 52 | 52 | 0 | 0 | 0.056316831437936629 | 0 | 0 | -0.26101640887369143 | 1000.279912 | 995.762207 | 0.682500 | 262 | 284 | 1/0/3 |
| development-2 | shared8r04 | 10-15 00:00–10-15 01:00 UTC | 10-15 02:00–10-15 03:00 CEST | 226 | 150 | 76 | 0.29200000000000137 | 0.050162114301046418 | 5.8211262437538451 | 10.69284892136417 | 2.2534964344564825 | 1002.533408 | 999.917933 | 1.166700 | 138 | 196 | 0/1/2 |
| development-2 | shared8r04 | 10-15 01:00–10-15 02:00 UTC | 10-15 03:00–10-15 04:00 CEST | 162 | 120 | 42 | 0.16400000000000414 | 0.037419017206762786 | 4.3827981663389117 | 4.9355026331543854 | 0.70557391674104986 | 1003.238982 | 1001.029001 | 0.761300 | 174 | 344 | 0/0/2 |
| development-2 | shared8r04 | 10-15 02:00–10-15 03:00 UTC | 10-15 04:00–10-15 05:00 CEST | 344 | 318 | 26 | 0.75200000000000555 | 0.056286087491407573 | 13.360317505010507 | 17.876249802172953 | 3.757743787451866 | 1006.996726 | 1004.970281 | 2.637500 | 196 | 96 | 1/2/1 |
| development-2 | shared8r04 | 10-15 03:00–10-15 04:00 UTC | 10-15 05:00–10-15 06:00 CEST | 60 | 60 | 0 | 0 | 0.32769287991498103 | 0 | 0 | -2.578012946904606 | 1004.418713 | 1000.786972 | 2.871700 | 0 | 41 | 2/0/3 |
| development-2 | additive8 | 10-14 22:00–10-14 23:00 UTC | 10-15 00:00–10-15 01:00 CEST | 92 | 92 | 0 | 0.088902867959774576 | 0.018221575621310847 | 4.8789890516273022 | 4.87898905162732 | 0.54092825769232733 | 1000.540928 | 998.244001 | 0.494700 | 166 | 74 | 2/0/2 |
| development-2 | additive8 | 10-14 23:00–10-15 00:00 UTC | 10-15 01:00–10-15 02:00 CEST | 52 | 52 | 0 | 0 | 0.056316831437936629 | 0 | 0 | -0.26101640887369143 | 1000.279912 | 995.762207 | 0.682500 | 262 | 284 | 1/0/3 |
| development-2 | additive8 | 10-15 00:00–10-15 01:00 UTC | 10-15 02:00–10-15 03:00 CEST | 226 | 150 | 76 | 0.29200000000000137 | 0.050162114301046418 | 5.8211262437538451 | 10.69284892136417 | 2.2534964344564825 | 1002.533408 | 999.917933 | 1.166700 | 138 | 196 | 0/1/2 |
| development-2 | additive8 | 10-15 01:00–10-15 02:00 UTC | 10-15 03:00–10-15 04:00 CEST | 162 | 120 | 42 | 0.16400000000000414 | 0.037419017206762786 | 4.3827981663389117 | 4.9355026331543854 | 0.70557391674104986 | 1003.238982 | 1001.029001 | 0.761300 | 174 | 344 | 0/0/2 |
| development-2 | additive8 | 10-15 02:00–10-15 03:00 UTC | 10-15 04:00–10-15 05:00 CEST | 344 | 318 | 26 | 0.75200000000000555 | 0.056286087491407573 | 13.360317505010507 | 17.876249802172964 | 3.757743787451866 | 1006.996726 | 1004.970281 | 2.637500 | 196 | 96 | 1/2/1 |
| development-2 | additive8 | 10-15 03:00–10-15 04:00 UTC | 10-15 05:00–10-15 06:00 CEST | 60 | 60 | 0 | 0 | 0.32769287991498103 | 0 | 0 | -2.578012946904606 | 1004.418713 | 1000.828819 | 2.871700 | 0 | 41 | 2/0/3 |
| development-2 | overall2 | 10-14 22:00–10-14 23:00 UTC | 10-15 00:00–10-15 01:00 CEST | 92 | 92 | 0 | 0.088902867959774576 | 0.018221575621310847 | 4.8789890516273022 | 4.87898905162732 | 0.54092825769232733 | 1000.540928 | 998.244001 | 0.494700 | 166 | 74 | 2/0/2 |
| development-2 | overall2 | 10-14 23:00–10-15 00:00 UTC | 10-15 01:00–10-15 02:00 CEST | 52 | 52 | 0 | 0 | 0.056316831437936629 | 0 | 0 | -0.26101640887369143 | 1000.279912 | 995.762207 | 0.682500 | 262 | 284 | 1/0/3 |
| development-2 | overall2 | 10-15 00:00–10-15 01:00 UTC | 10-15 02:00–10-15 03:00 CEST | 226 | 150 | 76 | 0.29200000000000137 | 0.050162114301046418 | 5.8211262437538451 | 10.69284892136417 | 2.2534964344564825 | 1002.533408 | 999.917933 | 1.166700 | 138 | 196 | 0/1/2 |
| development-2 | overall2 | 10-15 01:00–10-15 02:00 UTC | 10-15 03:00–10-15 04:00 CEST | 162 | 120 | 42 | 0.16400000000000414 | 0.037419017206762786 | 4.3827981663389117 | 4.9355026331543854 | 0.70557391674104986 | 1003.238982 | 1001.029001 | 0.761300 | 174 | 344 | 0/0/2 |
| development-2 | overall2 | 10-15 02:00–10-15 03:00 UTC | 10-15 04:00–10-15 05:00 CEST | 344 | 318 | 26 | 0.75200000000000555 | 0.056286087491407573 | 13.360317505010507 | 17.876249802172953 | 3.757743787451866 | 1006.996726 | 1004.970281 | 2.637500 | 196 | 96 | 1/2/1 |
| development-2 | overall2 | 10-15 03:00–10-15 04:00 UTC | 10-15 05:00–10-15 06:00 CEST | 60 | 60 | 0 | 0 | 0.32769287991498103 | 0 | 0 | -2.578012946904606 | 1004.418713 | 1000.703278 | 2.871700 | 0 | 41 | 2/0/3 |

## Whole-period type × direction (144 rows)

Every native type/direction remains, including disabled/empty cells. These are exact settled-slice groups, not source-book counts. Long=+1, short=−1. Full hour×type×side and exact config/symbol/lane/range detail stays in external JSON.

| Fold | Arm | Type | Direction | Virtual n | Owned n | Zero n | Unknown n | Unit GP | Unit GL | Exact unit PF | Same-slice cash PF | Cash net USDT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| development-1 | off | normal | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | normal | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | trailing | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | trailing | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | off | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | normal | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | normal | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | trailing | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | trailing | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall8 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | normal | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | normal | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | trailing | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | trailing | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | normal | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | normal | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | trailing | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | trailing | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | shared8r04 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | normal | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | normal | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | trailing | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | trailing | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | additive8 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | normal | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | normal | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | trailing | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | trailing | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-1 | overall2 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | normal | long | 14 | 14 | 0 | 0 | 0 | 0.15950000000000022 | 0 | 0 | -1.2548123265234465 |
| development-2 | off | normal | short | 256 | 210 | 46 | 0 | 0.48200000000000492 | 0 | no losses (sentinel) | no losses | 2.5031348480572966 |
| development-2 | off | trailing | long | 46 | 46 | 0 | 0 | 0 | 0.16819287991498061 | 0 | 0 | -1.323200620381161 |
| development-2 | off | trailing | short | 620 | 522 | 98 | 0 | 0.8149028679597784 | 0.21840562605846428 | 3.731144122366334 | 5.3420249277556868 | 4.4935911394107277 |
| development-2 | off | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | off | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | normal | long | 14 | 14 | 0 | 0 | 0 | 0.15950000000000022 | 0 | 0 | -1.2548123265234465 |
| development-2 | overall8 | normal | short | 256 | 210 | 46 | 0 | 0.48200000000000492 | 0 | no losses (sentinel) | no losses | 2.5031348480572966 |
| development-2 | overall8 | trailing | long | 46 | 46 | 0 | 0 | 0 | 0.16819287991498061 | 0 | 0 | -1.323200620381161 |
| development-2 | overall8 | trailing | short | 620 | 522 | 98 | 0 | 0.8149028679597784 | 0.21840562605846428 | 3.731144122366334 | 5.342024927755685 | 4.4935911394107277 |
| development-2 | overall8 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall8 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | normal | long | 14 | 14 | 0 | 0 | 0 | 0.15950000000000022 | 0 | 0 | -1.2548123265234465 |
| development-2 | shared8 | normal | short | 256 | 210 | 46 | 0 | 0.48200000000000492 | 0 | no losses (sentinel) | no losses | 2.5031348480572966 |
| development-2 | shared8 | trailing | long | 46 | 46 | 0 | 0 | 0 | 0.16819287991498061 | 0 | 0 | -1.323200620381161 |
| development-2 | shared8 | trailing | short | 620 | 522 | 98 | 0 | 0.8149028679597784 | 0.21840562605846428 | 3.731144122366334 | 5.3420249277556868 | 4.4935911394107277 |
| development-2 | shared8 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | normal | long | 14 | 14 | 0 | 0 | 0 | 0.15950000000000022 | 0 | 0 | -1.2548123265234465 |
| development-2 | shared8r04 | normal | short | 256 | 210 | 46 | 0 | 0.48200000000000492 | 0 | no losses (sentinel) | no losses | 2.5031348480572966 |
| development-2 | shared8r04 | trailing | long | 46 | 46 | 0 | 0 | 0 | 0.16819287991498061 | 0 | 0 | -1.323200620381161 |
| development-2 | shared8r04 | trailing | short | 620 | 522 | 98 | 0 | 0.8149028679597784 | 0.21840562605846428 | 3.731144122366334 | 5.3420249277556868 | 4.4935911394107277 |
| development-2 | shared8r04 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | shared8r04 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | normal | long | 14 | 14 | 0 | 0 | 0 | 0.15950000000000022 | 0 | 0 | -1.2548123265234465 |
| development-2 | additive8 | normal | short | 256 | 210 | 46 | 0 | 0.48200000000000492 | 0 | no losses (sentinel) | no losses | 2.5031348480572966 |
| development-2 | additive8 | trailing | long | 46 | 46 | 0 | 0 | 0 | 0.16819287991498061 | 0 | 0 | -1.323200620381161 |
| development-2 | additive8 | trailing | short | 620 | 522 | 98 | 0 | 0.8149028679597784 | 0.21840562605846428 | 3.731144122366334 | 5.3420249277556877 | 4.4935911394107286 |
| development-2 | additive8 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | additive8 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | normal | long | 14 | 14 | 0 | 0 | 0 | 0.15950000000000022 | 0 | 0 | -1.2548123265234465 |
| development-2 | overall2 | normal | short | 256 | 210 | 46 | 0 | 0.48200000000000492 | 0 | no losses (sentinel) | no losses | 2.5031348480572966 |
| development-2 | overall2 | trailing | long | 46 | 46 | 0 | 0 | 0 | 0.16819287991498061 | 0 | 0 | -1.323200620381161 |
| development-2 | overall2 | trailing | short | 620 | 522 | 98 | 0 | 0.8149028679597784 | 0.21840562605846428 | 3.731144122366334 | 5.3420249277556868 | 4.4935911394107277 |
| development-2 | overall2 | trailing-only | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | trailing-only | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | axis | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | axis | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | dca | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | dca | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | dca-active | long | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |
| development-2 | overall2 | dca-active | short | 0 | 0 | 0 | 0 | — | — | unavailable | unavailable | — |

## External artifacts and reproduction

The independent attempt03 audit reconciled all 12 raw/allocation/return-GP-GL/cash samples and every hourly/type/side/indication/lane/range/relation partition, and independently reconstructed the exact minute-risk totals. Across enabled arms, recorded global Overall counts and levels matched their own prior final-Real-admitted settled orders; OFF traces remained absent. A separate lightweight attempt04 review verified the current 108 source hashes, pool-only source delta, exact raw/allocation/candle/risk parity with attempt03, and direct owned GP/GL/cash totals, with zero discrepancies. It preserves the independently reconstructed risk result without claiming a second heavy reconstruction. The attempt04 `independent-accounting-review.json` records the checks. This accounting/source audit does not override the native coverage/activity failures or failed improvement criteria.

The external attempt04 directory retains protocol, protocol/outcome equivalence proofs, source delta/seal, comparison, progress/logs and both exact frozen feeds. Each arm/fold retains native raw input, native report JSON/HTML, full zero-preserving evidence, compact comparison input and summary. This includes exact config/symbol/direction cells, traces, disabled/unknown states, shared funnel/base pairs, validation, endpoint marks and every native check. Large raw data stay outside Git; the operations handoff records the durable downloadable archive.

Reproduce with Node22.23.3 and `--experimental-strip-types --no-warnings`: `scripts/core-block-comparison.mjs prepare OUTPUT_DIR`, then `seal-source OUTPUT_DIR/protocol.json FINAL_COMMIT`, then `run OUTPUT_DIR/protocol.json`, using the prescribed frozen inputs. Existing protocols cannot be overwritten. This is the frozen attempt04 result, not permission to optimize these dates. No live deployment or venue performance is certified.
