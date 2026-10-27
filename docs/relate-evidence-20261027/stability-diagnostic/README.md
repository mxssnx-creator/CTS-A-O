# Stability investigation — 27 October 2026

These are independent causal replays of policies on **the same already examined window**. The policy choices and the two-hour loss interval were selected after seeing the data. They are not a fresh holdout, actual venue executions, or a basis for promoting a setting. All outcomes, including the losses and rejected candidate events, are retained.

The input is the sealed public 12-symbol 1-minute feed and reduced Micro/Minimal desk described in the [main report](../REPORT.md). Its trading window is **26 October 13:00–27 October 13:00 UTC**, after 24 hours of evaluation prehistory and an additional 24-hour indicator warm-up. Normal and Trailing were enabled; Block, DCA, Axis, Historic Exit, Signals and Relate were off. Funding/exposure caps were off. The replay uses unit-return PF after the modeled 0.15% round-trip cost; it is not a cash-weighted or actual-fill PF.

At the start, the post-Base engine selection-pool validation was **PF 2.877097**, with **343/732 (46.86%) configurations passing**. This validation pools overlapping historical configuration results; it is a different cohort and period from the subsequent modeled settled orders.

## What changed in the baseline

The baseline produced **9,784 modeled orders opened, 7,785 settled and 1,999 held**, and **71 modeled position episodes opened, 59 closed and 12 held**. The settled unit-return PF was **0.752695**; 4,239 closes were positive and 3,546 negative. The average net winning return was about **0.4529%**, while the average net losing return was about **0.7193%**. Thus the 54.45% positive rate was insufficient to offset the larger average loss in this sample.

The PF was **2.047443** over the first six hours, **0.038424** during 26 October 19:00–21:00 UTC, and **1.537582** in the final 12 hours. The two-hour interval contained **1,725 closes**, of which 1,579 were losses, and contributed about **57.8%** of the day's summed gross unit losses. These are correlated configuration observations; they are not independent account outcomes. The decline is not monotonic: later results partially recovered. A high historical validation PF does not ensure a future execution PF.

Within this reduced, Relate-off baseline, every enabled range/type group had a settled PF below 1:

| Range | Type | Settled orders | Positive / negative | Unit-return PF |
|---|---|---:|---:|---:|
| Micro | Normal | 2152 | 1209 / 943 | 0.716101 |
| Micro | Trailing | 1560 | 744 / 816 | 0.584212 |
| Minimal | Normal | 2076 | 1140 / 936 | 0.833574 |
| Minimal | Trailing | 1997 | 1146 / 851 | 0.837182 |

These groups partition the baseline's settled rows. They do not establish performance for disabled strategies or every configured indication.

The separate order identity audit found no duplicate whole-order identities in the baseline. At 552 symbol/side/onset combinations, multiple distinct configurations entered together; as many as 106 distinct configurations shared one onset. This is concentration, not proof of duplicates or actual exposure. The large order count does not demonstrate that every configured order could have been funded or filled.

## Additional Last-N and simultaneous per-symbol limits

Each row reran admission on the candle history with the indicated policy; it is not a post-hoc removal of losing rows. “Symbol 5/20/50” limits simultaneously open **engine** orders per symbol across sides; it does not limit independent configuration calculations. The recorded skip count is rejected candidate events, not distinct missed orders. The existing per-entry config/direction validation and its `validLastN=15` remained active in all rows. “Last-15/25” adds the separate execution Last-N gate.

Counts are opened / closed-or-settled / held. Shock and final-12h cells show settled unit-return PF and the number of closes in that interval.

| Policy | Settled PF | Positive | Positions | Orders | Shock PF (closes) | Final 12h PF (closes) | Symbol-cap skips |
|---|---:|---:|---:|---:|---:|---:|---:|
| Unlimited | 0.752695 | 54.45% | 71/59/12 | 9784/7785/1999 | 0.038424 (1725) | 1.537582 (3502) | 0 |
| Last-15 | 0.752695 | 54.45% | 71/59/12 | 9784/7785/1999 | 0.038424 (1725) | 1.537582 (3502) | 0 |
| Last-25 | 0.767716 | 54.77% | 71/59/12 | 9400/7411/1989 | 0.040831 (1609) | 1.548957 (3482) | 0 |
| Symbol 5 | 1.344475 | 62.33% | 90/78/12 | 429/377/52 | 0.103214 (34) | 1.016575 (203) | 16399 |
| Symbol 20 | 1.259723 | 63.38% | 82/70/12 | 1619/1398/221 | 0.123699 (147) | 1.216239 (724) | 12954 |
| Symbol 50 | 1.063122 | 60.88% | 77/65/12 | 3650/3116/534 | 0.049921 (419) | 1.409669 (1620) | 9193 |
| Last-15 + symbol 20 | 1.259723 | 63.38% | 82/70/12 | 1619/1398/221 | 0.123699 (147) | 1.216239 (724) | 12954 |

Last-25 also had **564** execution-Last-N candidate skips. Adding Last-15 produced the same recorded closed/open order fields and hourly selection records as the corresponding unlimited and symbol-20 controls. The positive full-window PF under a symbol cap comes with substantially fewer modeled orders and a losing shock interval; it does not prove stability. A cap can split one overlapping position episode into several, so the episode count need not fall with the order count. No cap or Last-N setting was changed as a result of this post-hoc comparison.

## Same-onset crowding limits

The [separate crowding protocol](../stability-crowding/protocol.json) limits admitted orders sharing a range, symbol, side and exact entry time. Entries at different times remain independent; all configured calculations remain enabled. It was rerun after the first attempt stopped for memory headroom. All four alternatives below had a **lower** full-window PF than the uncapped control.

| Policy | Settled PF | Positive | Positions | Orders | Shock PF (closes) | Final 12h PF (closes) | Crowd skips |
|---|---:|---:|---:|---:|---:|---:|---:|
| Unlimited | 0.752695 | 54.45% | 71/59/12 | 9784/7785/1999 | 0.038424 (1725) | 1.537582 (3502) | 0 |
| Crowd 5 | 0.737700 | 53.23% | 76/64/12 | 3970/3201/769 | 0.058853 (838) | 1.148567 (1284) | 7631 |
| Crowd 10 | 0.714852 | 52.89% | 74/62/12 | 6309/5061/1248 | 0.049407 (1241) | 1.207597 (2091) | 4557 |
| Crowd 20 | 0.710576 | 53.57% | 72/60/12 | 8595/6882/1713 | 0.040899 (1614) | 1.363042 (2970) | 1574 |
| Crowd 10 + Last-25 | 0.723943 | 53.25% | 74/62/12 | 6175/4931/1244 | 0.051130 (1195) | 1.216273 (2080) | 4442 |

The combined crowd-10/Last-25 case additionally had **318** execution-Last-N skips. These skipped events are causal decisions under that policy, not losses deleted from a common completed book.

## Checks and reproduction

The [protocol](protocol.json), [summary](summary.json), [receipt](receipt.json), portable gzip session files and their [manifest](portable-manifest.json) preserve all seven rows above; the [crowding directory](../stability-crowding/) contains the five crowding rows. Summary `rawSha256` values identify the original sidecar headers; the manifest hashes identify the hydrated portable gzip files, which are different bytes. The economic source was `704fcf8b08644f98986d47e318abc26b8a20dc12`. Both studies used the same feed SHA-256 `e0a687b8f1799201cfa8a062ef54555271bbfb9248c34b5d1814273222a7b3bb` and reduced desk SHA-256 `0514856b61d1e8362b4d8fc38d0042756953699d512498fd1d4ad98adc609ecf`.

For every portable case, the independent checks verified whole-order identity uniqueness, the 51,840 contiguous minute bars, selection membership in the last recorded hourly cohort, supported plain-strategy sizing, entries at the next lane bar's first-minute open, exit prices within their recorded lane bar, and net unit-return arithmetic within `1e-6`. All reported hourly and segment counts and PF values were recalculated from the portable settled rows. The baseline's settled rows, held rows and hourly validations also match the previous saved off-baseline stream. The audit does **not** independently prove every per-entry Last-N decision, the exit trigger's intrabar order, venue fills, execution latency, or exchange/account feasibility.

After fixing delayed-entry clocks, progressive candle refresh and in-flight universe replacement, the baseline was rerun on economic source `11451de6afe3639b23859abc4eaaea7cd23f0220`. All 7,785 settled order records, 1,999 held records and hourly validation records matched the earlier baseline under the recorded field comparison. Its [protocol, summary, receipt and portable data](post-fix/) are retained separately. The reduced replay took **26.18 seconds** for its compute, with **466 MiB** reported peak RSS and **44 ms** reported maximum event-loop lag; this is one offline reduced-grid run, not a 50-symbol or live-cycle benchmark.

After making Base diagnostics cooperative, the same baseline was rerun on `02ad0ae9fd6324a5ebeaaba4bf2590ca4bb63796`. Every recorded settled-order field, held-order field and hourly validation array again matched the earlier baseline; the separate portable price, selection and identity audit passed. Its [protocol, summary, receipt and portable data](post-slicing/) are retained. This reduced replay reported **23.36 seconds** compute, **518 MiB** peak RSS and **63.93 ms** maximum event-loop lag, with a 5,097,472,000-byte combined cgroup peak. These single reduced runs are not a controlled full-grid or live-cycle performance comparison. The separate [diagnostic responsiveness investigation](../base-diagnostics-profile/) records a completed microbenchmark and both interrupted large after-tests.

From the repository root, verify the preserved data and reported statistics with:

```sh
node --experimental-strip-types --no-warnings scripts/audit-stability-study.mjs docs/relate-evidence-20261027/stability-diagnostic
node --experimental-strip-types --no-warnings scripts/audit-stability-study.mjs docs/relate-evidence-20261027/stability-crowding
node --experimental-strip-types --no-warnings scripts/audit-stability-study.mjs docs/relate-evidence-20261027/stability-diagnostic/post-fix
node --experimental-strip-types --no-warnings scripts/audit-stability-study.mjs docs/relate-evidence-20261027/stability-diagnostic/post-slicing
node --require ./scripts/lib/core-test-offline-guard.cjs --test scripts/lib/replay-price-audit.test.mjs scripts/lib/stability-study-audit.test.mjs
```

Per-case audit output is stored in `portable-verification.json` in each directory. The first interrupted crowding attempt is retained as [interrupted-receipt.json](../stability-crowding/interrupted-receipt.json); the complete retry's receipt remains separate. Further investigation needs an unseen period, the full requested strategy grid and independently reconciled venue fills. No future PF or order-count stability can be inferred from these replays alone.
