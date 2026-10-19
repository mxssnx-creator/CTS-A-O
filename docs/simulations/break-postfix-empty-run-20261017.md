# Break empty-run and reporting regression check — 17 October 2026

## Protocol

Offline replay of the same cached nine-symbol public 1-minute OHLCV feed used
by the matched Micro Break comparison. The old and updated arms use the same
feed, cost, size, lanes and gates. The run was tested on source commit
`cae2ec669b2d69ecbeb664d9853715a2dcfb9efb`.

- Evaluation: 2026-10-14 16:00–22:00 UTC (six hours).
- Simulation: 2026-10-14 22:00–2026-10-15 04:00 UTC (six hours).
- Nine symbols, 1/5/15-minute lanes, Micro Break only, Signals disabled.
- 0.20% round-trip modeled cost; equity sizing at 2% and 10× leverage.
- Base qualification unchanged: at least 12 closes and return PF ≥ 1.10.
- No tuning was performed after observing the sample.

Feed SHA-256:
`7cd1feaf3590379a0f62129ae6822903dad4019c8163523933976ca19a4109f9`.
Frozen settings SHA-256 (legacy / updated):
`ec4e9feb339dc29d09484c0a98537087390b494a6ffb8bb4c3a26879ac11103c` /
`063981c215134a675f0866288f3c78c337737a50e556fa1349bb2e762b5e29c8`.

## Results

| Arm | IDs | Base evaluated | Base passed | Orders | Return PF | Base compute | Peak RSS | Consistency checks |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| Legacy | 4 | 20 | 0 | 0 | Unavailable | 372 ms | 356 MB | 53/53 |
| Updated | 60 | 60 | 0 | 0 | Unavailable | 1,102 ms | 409 MB | 53/53 |

Each arm covered all 9 loaded symbols. All six hourly buckets had zero closed
orders, unchanged $1,000 balance and equity, no open orders, and no positive
or negative return. That means hourly success is unmeasured (0 of 6 hours with
any closes), not six losing hours. Return PF and cash PF are both unavailable;
the run did not produce a return sample.

| UTC hour | Closed orders | Return PF | Cash PF | Net | Balance / end equity |
|---|---:|---:|---:|---:|---:|
| 22:00 | 0 | – | – | $0.00 | $1,000.00 |
| 23:00 | 0 | – | – | $0.00 | $1,000.00 |
| 00:00 | 0 | – | – | $0.00 | $1,000.00 |
| 01:00 | 0 | – | – | $0.00 | $1,000.00 |
| 02:00 | 0 | – | – | $0.00 | $1,000.00 |
| 03:00 | 0 | – | – | $0.00 | $1,000.00 |

The Base gate diagnostics identify minimum close count as the first failed
gate for all evaluated pairs. The 60-ID arm evaluates three times as many
pairs as the legacy arm, with correspondingly higher compute and peak memory;
it admitted no additional pairs in this six-hour sample. This is a real
qualification shortfall for this window, not an execution failure or a PF of
zero. Do not lower the qualification floor based on this empty sample.

## Reporting and harness corrections

- Base pair rows and range medians no longer label an empty sample PF as zero.
- Empty simulation, connection, prehistoric and saved-preset reports now mark
  PF unavailable. Runtime logs also print “unavailable” for no closes and
  distinguish a no-loss qualification score from finite PF.
- If no pair passes Base, coverage is counted from the processed candle
  universe rather than the admitted-tape set; valid empty strategy/range
  output does not fail activity checks.
- The primary return-PF report check now fails if any close has unknown or
  inconsistent unit-return evidence.

Regression verification: empty Base, empty simulation/preset, no-loss and
incomplete unit-return cases are covered by focused tests. Break/pipeline/
range/session/reporting/preset tests passed 67/67;
`npm run typecheck -- --pretty false` and `npm run build:dev` passed.
The build includes core-worker packaging. The replay was offline; no venue
connection, exchange order, deployment or reload was performed.

## Comparison with the earlier positive smoke

The broad systemwide 6-hour smoke has 792 funded closes at return PF 2.374852,
cash PF 2.223031, and 4/6 positive hours. It is a useful check that the shared
replay and accounting path can create and score orders. It is not a matched
Break result: it uses a different focus, four-symbol feed, indication mix and
strategy universe. Therefore it does not change the conclusion for these
Break-only settings. The full broad-session hourly, range and volume results
are in [`systemwide-pf-volume-audit-20261016.md`](../sims/systemwide-pf-volume-audit-20261016.md).

No Break configuration is promoted from this sample. Profitability, useful
trade frequency and positive-hour rate still require qualifying, nonempty
held-out data.
