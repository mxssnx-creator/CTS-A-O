# Exact-configuration, direction and hour outcomes

These follow-up summaries use the funded, settled modeled orders already
recorded in two retrospective Low-Range Short studies. They do not rerun or
modify either strategy, nor do they show exchange fills or a new holdout.
Each row keeps one exact configuration and one direction, with orders pooled
across the study's 20 symbols. Both directions of every configuration in the
recorded progression are listed, including directions with no settled orders.
Direction-specific historical Base results were not captured; these later
return rows are **not** direction validation results.

The exploratory diagnostic requires at least **20** funded settled orders,
at least **3** active close-hours, and a unit-return PF of at least **1.1** in
every active hour. An hour with positive gains and no losses is called
**no loss** and satisfies that specific condition; an all-flat hour does not.
Empty hours are displayed explicitly and are not included in the active-hour
condition. This post-hoc rule cannot establish continuous future PF, and
shared-symbol/time trades are not independent observations.

| Replay | Initial post-Base validation and historical PF | Later funded modeled unit PF | Exact config × direction contexts | Eligible | Every active hour ≥ 1.1 |
| --- | --- | ---: | ---: | ---: | ---: |
| 19 Oct 00:00–20 Oct 00:00 UTC, 5m, capped | 10,439 / 14,702 (71.00%), PF 4.570829 | 0.274964 on 135,811 settled orders | 29,404 | 693 | 0 / 693 (0.00%) |
| 9 Oct 12:00–10 Oct 12:00 UTC, 15m | 1,047 / 2,715 (38.56%), PF 23.055106 | 0.078848 on 2,156 settled orders | 5,430 | 0 | unavailable: no eligible contexts |

Both use previously inspected Binance USD-M candles and tactics-off settings
selected after earlier coverage results. Historic Exit, DCA and Axis were
excluded. The 5m 0.5× per-symbol/side and 1× gross caps use realized balance;
9,052 known-zero-allocated settled candidates are excluded. The 15m result
uses its own source, history and settings and is not a controlled comparison
with the 5m period. Funding, open positions, incomplete venue fees, spreads,
slippage, model path assumptions and cross-venue differences remain material.
The live executor uses BingX; the modeled feed is Binance.

The analyzer streams the checksummed `sizedOrders` session sidecar, rejects
unknown/negative allocation, missing price-return or sized-cash evidence and
unknown config/direction, and checks every close timestamp with the runtime's
`settledHourT`: a close exactly at an hour belongs to the preceding hour.
It reconciles all 24 hourly totals, config-direction totals and each direction
to the independent funded audit's count, unit gains/losses and sized cash;
the saved audit's protocol, raw-header and allocation-header hashes must match.
The compressed JSON beside each study's evidence retains all compact rows,
hourly observations, hashes and the exploratory summary. The full checksummed
session inputs are required to reproduce them.

After the existing funded, Base-cell and progression audits succeed:

```
node --experimental-strip-types --no-warnings scripts/low-range-config-hours.mjs STUDY_DIR
python scripts/render-low-range-runtime-details.py STUDY_DIR OUTPUT.html
node --experimental-strip-types --no-warnings --test scripts/low-range-config-hours.test.mjs scripts/low-range-config-hours-ui.test.mjs
node scripts/test-low-range-runtime-report.mjs OUTPUT.html STUDY_DIR
node scripts/test-low-range-config-hours-report.mjs OUTPUT.html STUDY_DIR
```

Use a fresh output name: the analyzer refuses to overwrite an existing result.
The self-contained report retains the earlier summary, progression, step,
symbol, hour, heatmap and native charts, and adds a searchable, paginated
config × direction table with all 24 hourly PF states. Client rendering,
search, pagination, zero/no-loss/flat handling and HTML parsing were tested in
an isolated DOM stub; visual inspection in a graphical browser remains open.
