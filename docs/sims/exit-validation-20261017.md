# Exit causal validation — reused public history

Retrospective reused cached public market candles; no new or unseen market-performance claim. Four fixed symbols; 16 initialized indication/bot/lane pairs; all three Exit config sets and both sides are reported, including empty outcomes. No new market-data requests or exchange orders.

Window: **2026-10-17T15:00:00.000Z → 2026-10-17T21:00:00.000Z**. Exactly six hours of evaluated prehistory precede trading. Seventy-two older hours initialize indicators behind explicit evaluationFromT; they supply no scored entries. Modeled round-trip cost: **0.20%**.

The frozen production settings retain their PF, minimum-close, DDR, last-N, confidence, hourly-success and symbol-side gates. Exit candidates have their own prehistory fit/holdout admission and subsequent seat/entry validation; Normal/Trailing Base and range admission is deliberately empty. No failing gate is relaxed to create orders. TP/SL fitting is fixed at the trading boundary for this check; gates continue reading only prior settled closes.

Settled modeled orders: **0**; primary unit-return PF: **empty**; sum of unit returns: **0.000 percentage points**. Positive settled hours: **0/6**, flat: 6, negative: 0. Endpoint marks: 0, reported separately. This is virtual model evidence without account allocation; order counts are modeled settled config orders, never venue fills.

| Independent Exit set | Side | Holdout-qualified configs | Seat-qualified at start | Settled orders | Unit PF | Net return points |
|---|---|---:|---:|---:|---:|---:|
| static-sl | Long | 0 | 0 | 0 | empty | 0.000 |
| static-sl | Short | 0 | 0 | 0 | empty | 0.000 |
| adaptive-sl | Long | 0 | 0 | 0 | empty | 0.000 |
| adaptive-sl | Short | 0 | 0 | 0 | empty | 0.000 |
| trailing | Long | 0 | 0 | 0 | empty | 0.000 |
| trailing | Short | 0 | 0 | 0 | empty | 0.000 |

| Hour UTC | Settled orders | Unit PF | Net return points |
|---|---:|---:|---:|
| 2026-10-17T15:00 | 0 | empty | 0.000 |
| 2026-10-17T16:00 | 0 | empty | 0.000 |
| 2026-10-17T17:00 | 0 | empty | 0.000 |
| 2026-10-17T18:00 | 0 | empty | 0.000 |
| 2026-10-17T19:00 | 0 | empty | 0.000 |
| 2026-10-17T20:00 | 0 | empty | 0.000 |

Qualification diagnostics: {"pairs":16,"noPrehistory":0,"insufficientEntries":16,"candidates":0,"capped":0,"evaluated":0,"insufficientTrades":0,"pfRejected":0,"ddrRejected":0,"qualified":0}. Entry skip reasons: {}. Every accepted config and its own initial seat evaluation and forward returns are in the result JSON. Each hourly JSON row also contains all six independent set/side slices.

Correctness checks passed: production settings validation and lane normalization; exact WF/settings gate and cost parity; truncated-prehistory versus future-present fit/holdout parity; no range tags; exact side identity; no duplicate config or modeled entry; no pre-evaluation entries; independent family and hourly settled-return reconciliation. Runtime 1746 ms; process maximum RSS 114.5 MiB; one process, no worker fan-out. Worker/parallel parity, order ownership and live protection are covered by separate project tests; this harness does not reproduce exchange execution.

Empty or insufficient outcomes establish no profitability result. A no-loss sample is labeled explicitly; its runtime qualification score uses the existing finite sentinel and is not presented as an exact measured PF. Reused retrospective history and a six-hour development window cannot establish durable profitability or positive results in every hour. Intrabar OHLC uncertainty and modeled costs remain limitations.

Reproduce from the committed bounded public input and frozen protocol:

```sh
node --max-old-space-size=768 --experimental-strip-types --no-warnings scripts/exit-validation-20261017.mjs --run
```

Protocol SHA-256: 26341ddcc00c6990d91c02c048f2e6a9d0fd45905d856bdd0c2caf172025e6bd. Bounded compressed input SHA-256: ee3271be1948c6d9a873ca7a1e04549c407f6a06d167df6d488fb6716c7723b4. The protocol records complete settings, source hashes and original cached-feed provenance. Source mismatches stop scoring.
