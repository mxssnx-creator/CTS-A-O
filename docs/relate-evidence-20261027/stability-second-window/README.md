# Second historical stability comparison

All ten tested policies lost on this window. This is an additional comparison, not proof of stable future performance: it was selected after examining the first window, and the archived feed had been used in earlier Signal studies. The policy list and inputs were frozen in commit `480787f` before this comparison was run. No setting was promoted.

The modeled trading period is **16 October 21:00–17 October 21:00 UTC**, with the preceding 24 hours of evaluation and a further 24-hour indicator warm-up. The source is the archived Binance USD-M minute feed, cropped without changing the candles. Its 12 symbols are BTC, ETH, BNB, SOL, XRP, DOGE, ADA, LINK, AVAX, LTC, DOT and BCH. This differs in both venue and two symbols from the [recent BingX window](../stability-diagnostic/README.md), so it is not a controlled single-variable comparison between the days.

The reduced Micro/Minimal desk, six focus entries, one-minute lane, 0.15% modeled round-trip cost and causal admission gates match the first investigation. Normal and Trailing were enabled; Signals, Block, DCA, Axis, Historic Exit and Relate were off. Account funding/exposure caps were off. The primary PF uses settled **unit returns**, not dollar-weighted results or actual venue fills.

At **16 October 21:00 UTC**, the post-Base selection-pool validation was **PF 3.898302**, with **54/168 (32.14%) configurations passing**. The baseline then produced modeled settled PF **0.260276**, with **35 positions opened / 29 closed / 6 held** and **191 orders opened / 166 settled / 25 held**. Of those 166 closes, 38 were positive and 128 negative. The validation and settlement PFs measure different periods and overlapping cohorts.

The baseline's settled orders also lost in each enabled range/type group:

| Range | Type | Settled orders | Positive / negative | Unit-return PF |
|---|---|---:|---:|---:|
| Micro | Normal | 32 | 0 / 32 | 0.000000 |
| Micro | Trailing | 63 | 15 / 48 | 0.225775 |
| Minimal | Normal | 33 | 11 / 22 | 0.633720 |
| Minimal | Trailing | 38 | 12 / 26 | 0.278925 |

These groups partition the settled baseline; the small samples and overlapping configurations do not establish results for other ranges, strategy types or indications.

Counts below are opened / closed-or-settled / held. Hours 6–8 are shown at the same relative point as the earlier comparison, without assuming a corresponding shock. Skip counts are rejected candidate events, not unique missed orders; Last-25 additionally rejected 22 candidate events in both its standalone and crowd-10 rows.

| Policy | Settled PF | Positive | Positions | Orders | Hours 6–8 PF (closes) | Final 12h PF (closes) | Cap skips |
|---|---:|---:|---:|---:|---:|---:|---:|
| Unlimited | 0.260276 | 22.89% | 35/29/6 | 191/166/25 | 0.200628 (12) | 0.704352 (64) | 0 |
| Last-15 | 0.260276 | 22.89% | 35/29/6 | 191/166/25 | 0.200628 (12) | 0.704352 (64) | 0 |
| Last-25 | 0.146866 | 18.24% | 35/29/6 | 173/148/25 | 0.200628 (12) | 0.385023 (46) | 0 |
| Symbol 5 | 0.517303 | 35.05% | 36/30/6 | 112/97/15 | 0.395663 (5) | 1.070875 (54) | 134 |
| Symbol 20 | 0.271817 | 23.23% | 35/29/6 | 180/155/25 | 0.259929 (9) | 0.704352 (64) | 26 |
| Symbol 50 | 0.260276 | 22.89% | 35/29/6 | 191/166/25 | 0.200628 (12) | 0.704352 (64) | 0 |
| Crowd 5 | 0.331552 | 27.07% | 35/29/6 | 158/133/25 | 0.332188 (9) | 0.701243 (60) | 38 |
| Crowd 10 | 0.287064 | 24.36% | 35/29/6 | 181/156/25 | 0.287290 (11) | 0.704352 (64) | 10 |
| Crowd 20 | 0.260276 | 22.89% | 35/29/6 | 191/166/25 | 0.200628 (12) | 0.704352 (64) | 0 |
| Crowd 10 + Last-25 | 0.162727 | 19.57% | 35/29/6 | 163/138/25 | 0.287290 (11) | 0.385023 (46) | 10 |

The symbol-20 case had PF **1.259723** on 1,398 settled orders in the recent window and **0.271817** on 155 settled orders here. That contrast is not proof that the cap causes the difference: the market, period and symbols also changed. It does show that the earlier positive result is insufficient to establish stable performance. Here, Last-15, symbol-50 and crowd-20 each reproduced the baseline's recorded settled fields, held fields and hourly selection arrays exactly.

The [protocol](protocol.json) records the frozen policies, source commit and SHA-256 hashes of the feed, original archive and desk. [summary.json](summary.json) retains every hourly and segment statistic; the complete [receipt](receipt.json), portable gzip records and [manifest](portable-manifest.json) retain every arm. All ten passed the same modeled identity, minute-bar/open-price, recorded hourly selection, volume and net-return audits as the recent window, with no recorded memory fallback or abort. These checks do not prove per-entry Last-N decisions, execution latency, actual funding, fills or venue behavior.

From the repository root, independently verify the preserved data:

```sh
node --experimental-strip-types --no-warnings scripts/audit-stability-study.mjs docs/relate-evidence-20261027/stability-second-window
```
