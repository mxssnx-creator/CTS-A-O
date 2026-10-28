# Relate maximum SL: bounded model evaluation

**Status: partial implementation, local branch only. Do not deploy or merge this setting as a complete live stop-loss control.**

Source checkpoint: `f3d217869829cf0444703d8d0bfe157875c77860`. This study predates the unmerged independent Exit-lane work in the parallel checkout; no integration with that work is claimed.

The setting uses 0.25%–1.5% in 0.25 percentage-point steps, default 0.75% of original entry. As a conservative model admission rule, Relate raises only on existing fixed-entry stops already within the limit. It does not move a stop. ATR, DCA and Axis paths lack a proved fixed initial-stop bound and receive no Relate raise; the existing Max-stack ladder reservation still applies. Active skipping is bypassed when the stop is not eligible. Already-held positions retain their captured settings.

A complete implementation needs causal re-simulation of changed entry/exit and re-entry times, per-entry ATR and ladder fill protection, owned partial-fill/restart reconciliation, and live Entries/Overall stop handling. Live minimum-stop widening and venue tick/minimum rounding can exceed the configured limit. Exchange fills can gap beyond a stop. None of those is certified here.

## Replay scope

Twelve named symbols from the sealed prior Binance USD-M feed; 24-hour evaluation from 2026-10-26 01:00 UTC, followed by a 12-hour modeled trade window 2026-10-27 01:00–13:00 UTC. Reduced 1m Micro/Minimal grid from the existing desk: Normal and Trailing on; Signal, Historic Exit, DCA, Axis and Block off. These are previously examined candles, not a fresh holdout. The 0.15% round-trip modeled cost, causal selection and Real-stage settings were retained. The additional paper Live-entry replay uses last-25; config validation last-N is 15, while the separate extra config entry last-N was 0 in the desk.

Fixed $2 modeled unit, $10,000 starting balance, 10× leverage. Balance caps mode was on but both position and exposure limits were zero in the recorded effective settings, so no balance caps applied. Exchange minima, order ownership, partial fills and actual live trades were not tested. The Relate-on arm used Auto, all eight relation sources, PF ≥ 1.5, last 250, minimum 60, max stack 250 and Max SL 0.75%.

At trade start, Base accepted **55/134 pairs**. Post-Base config evaluation had **489/1,176 (41.58%)** passing, pooled return PF **3.815123**. This historical selection sample is distinct from the following settled funded-model orders.

| Metric | Relate off | Relate on |
| --- | ---: | ---: |
| Settled return PF | 1.073082 | 1.127375 |
| Settled cash PF | 1.073082 | 1.114268 |
| Positive settled orders | 2976/4976 (59.81%) | 2921/4816 (60.65%) |
| Positions opened / closed / held | 35 / 23 / 12 | 35 / 23 / 12 |
| Orders opened / settled / held | 8,713 / 4,976 / 3,737 | 8,540 / 4,816 / 3,724 |
| Settled net | $1.77 | $2.63 |
| Held-order endpoint mark | $-56.05 | $-56.00 |
| Positive / negative / flat settled hours | 7 / 5 / 0 | 7 / 5 / 0 |

The on arm selected a different cohort because Auto Active can skip entries, so this aggregate difference does not establish a causal improvement from increased volume. Only **106** settled orders were actually raised; **25/106 (23.58%)** were positive, with unit-return PF **0.161479**. Their widest parsed original stop was **0.70%**. The held mark is separate from the settled result and is much larger than the settled gain.

| Range | Relate off: settled orders / return PF | Relate on: settled orders / return PF |
| --- | ---: | ---: |
| Micro | 2,443 / 0.780699 | 2,283 / 0.844329 |
| Minimal | 2,533 / 1.480052 | 2,533 / 1.480052 |

| Hour beginning UTC | Off orders / return PF | On orders / return PF |
| --- | ---: | ---: |
| 01:00 | 132 / 5.017472 | 132 / 5.017472 |
| 02:00 | 20 / 1.776428 | 20 / 1.776428 |
| 03:00 | 45 / 1.150570 | 44 / 1.139303 |
| 04:00 | 46 / 0.230847 | 46 / 0.230847 |
| 05:00 | 426 / 0.239728 | 424 / 0.234579 |
| 06:00 | 349 / 0.696052 | 344 / 0.690648 |
| 07:00 | 589 / 1.148446 | 586 / 1.169400 |
| 08:00 | 238 / 19.360959 | 218 / 18.304949 |
| 09:00 | 1,011 / 63.764367 | 1,005 / 63.465527 |
| 10:00 | 737 / 2.627814 | 694 / 3.272334 |
| 11:00 | 339 / 0.459365 | 320 / 0.453397 |
| 12:00 | 1,044 / 0.256244 | 983 / 0.270505 |

## Checks and performance

Both reports passed 68/68 internal checks. Independent whole-order identity audit found no duplicate entries or closed events. The candle audit verified selection, entry/exit bar prices and modeled returns across all 12 hourly validation steps; maximum return error was 1.03e-7. Exact report allocation matched every settled row, with zero unknown or zero-allocated rows. These are model checks, not venue identity or fill checks.

One cold compute used 20.94s and 498 MB peak RSS off, 20.60s and 476 MB on. The cgroup high-water marks were 5.500 and 5.542 GB; both stayed below the study safeguard and recorded no engine fallback or memory abort. These are not warmed foreground-cycle latency benchmarks.

The focused source suite had **589/589 passing** including settings completeness, real-bar long/short guard checks, Auto, Active, strategy independence, DCA/Axis, entry identity and modeled costs. Another **127/127 synthetic tests** passed across entry execution, control mirroring/orders, accounting and live promotion. All **4/4 funded-cohort tests** passed in a separate retry after the sequential receipt recorded that file as not started. Typecheck passed. Two attempts to run the broader combined execution-control suite were stopped by the shared 5.75 GB cgroup safeguard; those aggregate runs remain incomplete. The prior PR 207 CI covers the pre-change tree only.

The full economic inputs and original evidence checksums are in `protocol.json` and `receipt.json`. `summary.json` contains the hourly, range, raised-subset and allocation results. The compressed candle feed and desk snapshot are already tracked at `docs/relate-evidence-20261027/`.
