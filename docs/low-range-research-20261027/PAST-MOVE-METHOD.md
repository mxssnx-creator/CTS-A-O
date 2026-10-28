# Low-Range past-move relations

The original 75 Low-Range sources retain their identities and calculations.
There are now 120 additional opt-in sources: each of five entry methods and
three channel windows has eight independently identified past-move relations.
The source family remains disabled by default. Its Short protection cells and
Base and post-Base qualification continue to use each source's exact identity.

For signal bar `i` and channel length `w`, form the previous channel from bars
`i-w` through `i-1`. Let its log width be `log(high / low)`, and let the
previous log displacement be `log(close[i-1] / close[i-w])`. The current
signal bar is excluded from the displacement and channel. A displacement of at
least 20% of the channel's log width is an up move; one at or below minus 20%
is a down move; anything between is neutral. Log ratios make the movement
classification symmetric when prices are reciprocally mirrored.
The 20% threshold is a fixed exploratory design choice, not an optimized or
proven parameter. Invalid bars or timestamp gaps require a fresh full window.
The existing Low-Range width filter still applies.

Each method has follow and reverse relations, then each again in combination
with the existing Trend filter, the existing short Breakout filter, and both
filters together. A relation can suppress a signal; it never copies a
sibling's Base proof, validation or order identity. The signal bar is closed
before the modeled entry at the next bar's open. The original 75 state series
were checked for exact equality across 20 symbols, three timeframes, and
8,208,000 values on the cached 7–10 October 2026 candle data; this is a
compatibility check, not profitability evidence.

## Research context

- Shen, Urquhart and Wang's Bitcoin study reports intraday momentum associated
  with higher trading activity and volatility in its own design:
  <https://research.birmingham.ac.uk/en/publications/bitcoin-intraday-time-series-momentum/>.
- Fičura's crypto research finds that weekly momentum and reversal differ
  with size and liquidity in the studied cross-section:
  <https://wp.ffu.vse.cz/artkey/wps-202301-0003_impact-of-size-and-volume-on-cryptocurrency-momentum-and-reversal.php>.
- Bysik and Ślepaczuk study Bitcoin models with transaction costs:
  <https://arxiv.org/abs/2606.00060>. Bailey and coauthors describe the
  dangers of backtest overfitting:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2308659>.

These studies motivate considering both follow and reverse behavior and
checking costs and stability; their market samples, horizons and signals differ
from this system. They do not validate any of the new relations or imply that
their PF will persist.

## Retrospective cohort

`scripts/low-range-past-move-24h-research.mjs` evaluates the 120 new sources,
20 cached symbols, independent 1/5/15-minute bars, and all distinct ordinary
and capped-trailing Low-Range protection cells for steps 2–6. There are no
trailing-only cells in this candidate diagnostic. It uses fixed modeled
round-trip cost and the configured Short Base PF floor of 1.1. Results are
separated into Base cell counts, initial post-Base config × direction counts
and historical PF, and later candidate outcomes. Only configurations and
directions that passed at the initial cut enter the followed cohort; each
retains its own causal re-evaluation at the entry clock. This evaluation still
uses that configuration's candidate history pooled across symbols, and later
positions are hypothetical, overlapping and unallocated. It does not apply the
runtime's symbol-specific admissions or represent actual orders and fills.

The 24-hour outcome window and its preceding history were already examined in
other studies, so this is not an untouched out-of-sample test. The runner also
accepts an earlier explicit end clock for a second, overlapping retrospective
period when the complete 72-hour input exists. It is a stability comparison,
not an independent holdout. The prior report
must remain attached to the prior frozen source and cohort. No amount of
post-hoc filtering can establish future hourly success; genuinely untouched
multi-window, portfolio-constrained and venue-reconciled evaluation remains
necessary before any profitability or deployment claim.

## Completed candidate result

For the 8 October 12:00–9 October 12:00 UTC initial history and the following
9 October 12:00–10 October 12:00 UTC observation, 2,917 / 74,880 exact cells
passed the Short Base screen. Of the resulting 5,834 direction contexts,
**1,108 validated (18.99%)**, with pooled historical return PF **3.2333**.
The 1.1 Short Base floor coexisted with the configured higher 75-close
range gate of 1.35 and the other unmodified validation gates.

The initially validated cohort later produced **8,481 settled candidate
records**, **4 endpoint-open candidates**, and candidate PF **0.7200**; the
24 hourly aggregates were nine positive, 15 negative and zero flat. These are
overlapping hypothetical records, not funded orders or live positions.
They use the same configuration's pre-entry candidate history pooled across
symbols and recheck the direction gate at each entry.

| Step | Validated / evaluated | Historical PF | Later candidate closes | Later candidate PF |
| --- | ---: | ---: | ---: | ---: |
| 2 | 64 / 336 (19.05%) | 4.370 | 392 | 1.042 |
| 3 | 198 / 814 (24.32%) | 3.867 | 1,113 | 1.062 |
| 4 | 236 / 1,072 (22.01%) | 3.967 | 1,318 | 0.632 |
| 5 | 286 / 1,718 (16.65%) | 2.966 | 2,294 | 0.671 |
| 6 | 324 / 1,894 (17.11%) | 3.017 | 3,364 | 0.691 |

The full 74,880-cell inventory, unique identities, aggregate and per-symbol/hour
reconciliation audit passed; separate causal recomputations checked 42
step-stratified cells and 62 relation-stratified cells across all eight new
relations, using only bars available at the initial cut. The samples may
overlap. The candidate
report's JavaScript was tested for 100 symbol rows, 2,400 symbol-hour rows,
and the step selector; no graphical browser inspection was performed. Peak
RSS was 382 MB and measured peak cgroup usage was 5.30 GB under the 6.10 GB
abort guard. The complete compact run artifacts are in
`past-move-candidate-v1/`; its economic source-set SHA-256 is
`86fb0a4ada247b7049704b2948bb15b45a87c4ee776ec024f9022ff44bebd2d6`.

The trend-move-reverse group had later candidate PF 1.424 across 2,667 closes,
and trend-breakout-move-reverse had 2.197 across 276 closes. These are
observed after the fact on overlapping candidates from the same previously
examined window; they are leads for untouched, account-constrained testing,
not independent profitability proof or a reason to promote them.
