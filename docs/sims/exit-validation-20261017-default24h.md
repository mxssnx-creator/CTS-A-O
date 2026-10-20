# Exit causal validation — reused public history

Retrospective reused cached public market candles; no new or unseen market-performance claim. Four fixed symbols; 794 actual default initialized indication/bot/lane pairs; all three Exit config sets and both sides are reported, including empty outcomes. No new market-data requests or exchange orders.

Window: **2026-10-16T21:00:00.000Z → 2026-10-17T21:00:00.000Z**. 168 hours of evaluated prehistory precede trading. Seventy-two older hours initialize indicators behind explicit evaluationFromT; they supply no scored entries. Modeled round-trip cost: **0.20%**.

The frozen production settings retain their PF, minimum-close, DDR, last-N, confidence, hourly-success and symbol-side gates. Exit candidates have their own prehistory fit/holdout admission and subsequent seat/entry validation; Normal/Trailing Base and range admission is deliberately empty. New Exit config sets use unrestricted completed indication entries, independently of global remove-only entry tactics. No PF, close-count or drawdown gate is relaxed to create orders. TP/SL fitting is fixed at the trading boundary for this check; gates continue reading only prior settled closes.

Settled modeled orders: **109**; primary unit-return PF: **19.554**; sum of unit returns: **39.158 percentage points**. Positive settled hours: **8/24**, flat: 16, negative: 0. Endpoint marks: 206, totaling -53.574 return points, reported separately. Settled plus endpoint-mark diagnostic PF: 0.774, net -14.416 points. This is virtual model evidence without account allocation; order counts are modeled settled config orders, never venue fills.

| Independent Exit set | Side | Holdout-qualified configs | Seat-qualified at start | Settled orders | Unit PF | Net return points |
|---|---|---:|---:|---:|---:|---:|
| static-sl | Long | 0 | 0 | 0 | empty | 0.000 |
| static-sl | Short | 441 | 42 | 35 | 13.407 | 25.027 |
| adaptive-sl | Long | 9 | 0 | 0 | empty | 0.000 |
| adaptive-sl | Short | 444 | 69 | 53 | no losses | 11.100 |
| trailing | Long | 23 | 0 | 0 | empty | 0.000 |
| trailing | Short | 319 | 21 | 21 | 33.471 | 3.031 |

| Hour UTC | Settled orders | Unit PF | Net return points |
|---|---:|---:|---:|
| 2026-10-16T21:00 | 0 | empty | 0.000 |
| 2026-10-16T22:00 | 0 | empty | 0.000 |
| 2026-10-16T23:00 | 0 | empty | 0.000 |
| 2026-10-17T00:00 | 0 | empty | 0.000 |
| 2026-10-17T01:00 | 0 | empty | 0.000 |
| 2026-10-17T02:00 | 0 | empty | 0.000 |
| 2026-10-17T03:00 | 0 | empty | 0.000 |
| 2026-10-17T04:00 | 0 | empty | 0.000 |
| 2026-10-17T05:00 | 0 | empty | 0.000 |
| 2026-10-17T06:00 | 0 | empty | 0.000 |
| 2026-10-17T07:00 | 0 | empty | 0.000 |
| 2026-10-17T08:00 | 0 | empty | 0.000 |
| 2026-10-17T09:00 | 0 | empty | 0.000 |
| 2026-10-17T10:00 | 0 | empty | 0.000 |
| 2026-10-17T11:00 | 0 | empty | 0.000 |
| 2026-10-17T12:00 | 1 | no losses | 1.024 |
| 2026-10-17T13:00 | 0 | empty | 0.000 |
| 2026-10-17T14:00 | 15 | no losses | 1.839 |
| 2026-10-17T15:00 | 7 | no losses | 6.442 |
| 2026-10-17T16:00 | 16 | no losses | 17.497 |
| 2026-10-17T17:00 | 8 | no losses | 3.012 |
| 2026-10-17T18:00 | 22 | no losses | 3.426 |
| 2026-10-17T19:00 | 19 | no losses | 4.628 |
| 2026-10-17T20:00 | 21 | 1.611 | 1.289 |

Qualification diagnostics: {"pairs":794,"noPrehistory":0,"insufficientEntries":553,"candidates":5488,"capped":1612,"evaluated":5488,"insufficientTrades":964,"pfRejected":2540,"ddrRejected":748,"qualified":1236}. Entry skip reasons: {"duplicate":14,"symPf":34}. Every accepted config and its own initial seat evaluation and forward returns are in the result JSON. Each hourly JSON row also contains all six independent set/side slices.

Correctness checks passed: production settings validation and lane normalization; exact WF/settings gate and cost parity; truncated-prehistory versus future-present fit/holdout parity; no range tags; exact side identity; no duplicate config or modeled entry; no pre-evaluation entries; independent family and hourly settled-return reconciliation. Runtime 44700 ms; process maximum RSS 243.4 MiB; one process, 16-pair fit/build chunks with indicator memo release, followed by one unified WF over every retained qualifying config. Caps, portfolio and ranking are the unchanged default WF values; only strategy isolation and the explicit replay window are overridden. No worker fan-out. Worker/parallel parity, order ownership and live protection are covered by separate project tests; this harness does not reproduce exchange execution.

Empty or insufficient outcomes establish no profitability result. A no-loss sample is labeled explicitly; its runtime qualification score uses the existing finite sentinel and is not presented as an exact measured PF. Reused retrospective history and a 24-hour development window cannot establish durable profitability or positive results in every hour. Intrabar OHLC uncertainty and modeled costs remain limitations.

Reproduce from the committed bounded public input and frozen protocol:

```sh
node --expose-gc --max-old-space-size=512 --experimental-strip-types --no-warnings scripts/exit-validation-20261017-default24h.mjs --run
```

Protocol SHA-256: 679862904ce7f5197a8ce9ce998dfb876f5162b3723bd128973b9f427fe896cf. Bounded compressed input SHA-256: 13e771c3f047fed23bdf5bd39a7a7063175285a35a1391dfaba1d5e2d5b348c2. The protocol records complete settings, source hashes and original cached-feed provenance. Source mismatches stop scoring.

The complete result JSON is also persisted losslessly as `exit-validation-20261017-default24h-result.json.gz` (SHA-256 `edd76f2185630a94addd0b92bfd77d03b5f6ba84f0400fdd84f9f123a2e036e8`). Its decompressed JSON SHA-256 is `13c6a76f7763809f0ddb67a5f5fb00ae234af23f716aaab51141fc0b815d30d4`. It retains every initial config evaluation, per-step validation, settled order and open endpoint mark.
