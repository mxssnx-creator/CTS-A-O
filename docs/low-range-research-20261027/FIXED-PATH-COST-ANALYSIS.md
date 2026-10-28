# Low-Range fixed-path cost decomposition — 27 October 2026

This is a descriptive re-analysis of the **already examined**, post-hoc
balance-capped 20-symbol Short-range replay. The window is 19 October 00:00 to
20 October 00:00 UTC, five-minute candles, tactics off, 12 hours' evaluated
prehistory, and Normal, Trailing and trailing-only types. Short is the
strategy's range name; the replay includes both long and short directions.
The run's source checkpoint is `582e209` and its source seal is
`d4847b799025e5309ce575e762e38525e93016350244b8457fcc5e7102e29d42`.
The historical Base, PF gates, entries and protection distances were not
changed for this analysis.

The starting post-Base cohort had **10,439 / 14,702 (71.00%)** validated
configs, pooled historical unit-return PF **4.570829**. Their later replay
settled **135,811 known-positive-allocation modeled orders** with pooled net
unit-return PF **0.274964**. There were seven funded endpoint-open orders;
they are not settled and are excluded here. There were 9,052 further
known-zero-allocated settled candidate rows; they are not counted as funded.
This is a simulation, not venue execution or a fresh holdout.

## Equal-order returns, with cost added back on the observed path

The protocol modeled a 15 basis point (0.15%) round-trip deduction. For these
Normal and Trailing records the archived unit return is the price return minus
that deduction. The replay includes neither DCA nor Axis. With all observed
entries, exits, admissions, quantities and clocks fixed, the calculation is:

`mean frozen-path gross bp = mean observed net unit-return bp + 15 bp`

This subtracts no extra fee and does not divide by or multiply by leverage.
It weights each settled modeled order equally, including separately configured
orders that overlap in time. It is therefore not account return, a count of
independent market observations, or a confidence interval. A large number of
rows does not make one day's overlapping signals independent. The gross column
is an arithmetic reconstruction for the same selected trades, **not a
zero-cost rerun**: changing cost can change the strategy's protection distances,
gates, selected trades, fills and allocations.

| Target step | Long settles | Long net bp | Long fixed-path gross bp | Short settles | Short net bp | Short fixed-path gross bp |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 7,392 | -15.31 | -0.31 | 1,432 | -45.28 | -30.28 |
| 3 | 10,168 | -37.44 | -22.44 | 6,282 | -44.64 | -29.64 |
| 4 | 10,172 | -41.53 | -26.53 | 3,195 | -40.50 | -25.50 |
| 5 | 14,830 | -28.07 | -13.07 | 5,059 | -38.03 | -23.03 |
| 6 | 15,149 | -19.84 | -4.84 | 5,387 | -37.20 | -22.20 |
| Trailing-only / no TP | 41,755 | -24.38 | -9.38 | 14,990 | -46.46 | -31.46 |
| Total | 99,466 | -26.65 | -11.65 | 36,345 | -43.03 | -28.03 |

Combined across directions, the equal-order mean was **-31.04 bp net** and
**-16.04 bp** on the fixed path after adding back 15 bp. Every listed step and
direction has a negative fixed-path gross mean in this particular sample;
the long step-2 value is close to zero and rounded to two decimals. This does
not demonstrate that another cost model, date, market, gate or sizing policy
would be unprofitable. In this sample, the fixed-path price movement itself
contributed to the loss; the modeled transaction cost is not the only cause.
These figures do not identify Historic Exit as a cause: it was disabled.

## Verification and reproduction

From the repository root, run with the saved study directory as the argument:

```
node --experimental-strip-types --no-warnings scripts/low-range-fixed-path-cost.mjs /path/to/low-range-continuity-195-oct19-5m-balance-caps-20261027
node --experimental-strip-types --no-warnings --test scripts/low-range-fixed-path-cost.test.mjs
```

The runner streams and checks each saved sidecar's hash, matches all 144,863
report rows to the saved raw trades in order, rejects unknown allocations and
unsupported types, excludes known-zero allocations, and verifies each
funded row's stored price return against its recorded unit return within
serialization precision. The largest difference was **0.001141 bp**. It
independently reconciles each step's count, long/short split, net profit/loss
and cash against the prior `runtime-step-detail.json`; inputs, source seal,
cohort counts and detailed values are captured in
`runtime-195-5m-capped/fixed-path-cost-summary.json`. The full saved raw
session and sidecars are required to rerun it; the committed summary alone is
not a substitute for those inputs. The three arithmetic and fail-closed unit
tests passed.

## Market and validation limits

The cached feed is Binance USD-M candles, while the live executor targets
BingX. Matching the saved Binance tape proves arithmetic and simulation
consistency for that feed, not equivalence of BingX quotes, order book,
trigger prices, funding, contract rules, fills, spread or slippage. Candles
also cannot establish the true intra-bar ordering; this simulator checks a
stop before a target when both can be touched. A venue-specific, time-aligned
data and order/fill reconciliation is needed before any live-performance
claim. A realized-balance allocation cap is not a full venue margin model.

Primary research reinforces the need for separate forward validation:

- Kitron and Wengrowicz's 2026 [preprint on 15-minute cryptocurrency
  reversal](https://arxiv.org/abs/2608.21888) reports statistically observable
  directional reversal in its spot sample, with a peak gross edge around
  1.3 bp per trade versus a 5 bp benchmark round trip. Its sample and trading
  rules differ from this replay; it does not validate these futures configs.
- Bysik and Ślepaczuk's [hourly Bitcoin walk-forward
  study](https://arxiv.org/abs/2606.00060) reports that naive sign trading
  failed under its 10 bp cost assumption, while selected cost-aware rules
  improved its results. That is motivation for a new hypothesis, not proof
  that such a filter will work here.
- Novy-Marx's [multi-signal backtest research](https://www.nber.org/papers/w21329)
  documents severe selection bias when combinations are chosen in sample;
  Bailey et al.'s [probability-of-backtest-overfitting
  paper](https://papers.ssrn.com/sol3/Papers.cfm?abstract_id=2326253) develops
  a diagnostic for selection across alternatives. Neither turns this small,
  already examined sample into a holdout.

For future tests, freeze the indication universe, exact per-direction gates,
cost assumptions and selection rule before observing a new period; use
several non-overlapping forward windows and exclude training outcomes that
extend into the next evaluation window. Preserve all tried variants and their
post-Base counts, and report realized/marked portfolio outcomes alongside the
historical PF and settled trade PF. Stress spreads, fees, funding and delayed
or missed fills using observed venue data. Treat overlapping strategies and
symbols as dependent when estimating uncertainty; a time-block procedure must
not pretend that individual shared-clock trades are independent. These are
research requirements, not a guarantee of any positive hour or future PF.
