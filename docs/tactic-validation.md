# Tactic held-out validation

Offline simulation of the first-class Tactic indication family. No orders, promotions or settings changes. These results do not establish live profitability.

Primary mode: **Current default entry filters**, using `entrySignal(follow, indication, cache, DEFAULT_TACTICS)`. Exact tactics: `{"session":false,"volRegime":true,"trendStrength":true,"chopRegime":false,"cooldown":false,"cooldownBars":4}`; effective cooldown 0 bars. Effective per-indication filter keys are retained in JSON, including the existing low-ADX exemption for mean reversion and adaptive. This reproduces the default entry filters and cooldown with the disclosed research protects; it does not reproduce full runtime account coordination, stage gates or position sizing. The raw onset study cannot establish default-system performance.

Source: ADA-USDT, BNB-USDT, BTC-USDT, DOGE-USDT, ETH-USDT, SOL-USDT, TRX-USDT, XRP-USDT; 207,360 completed 1m candles, 2026-09-26T21:25:00.000Z to 2026-10-14T21:25:00.000Z exclusive, 0 gaps. Chronological split: **2026-10-05T21:25:00.000Z**. IS has 103,680 source candles; OOS starts with fresh flat positions and warmed causal context.

70 distinct technique/range/lane groups; 1680 IS protect candidates; 24 protect cells per group. The five techniques each have short and medium ranges. Lanes are independent and combined 1/5/15m plus independent 30m; 30m combined is identical and counted once. Follow entries use state onsets; long and short slots run independently.

The frozen grid is TP 0.6/1.2/2.4%, stop 0.75/1.5× TP, trailing disabled or 0.5× TP, hold 2/8 hours (24 cells). Hold periods use equal wall time; these explicit distances are not lane-scaled. Every settled or endpoint-marked return deducts **0.2% roundtrip cost** (0.1% per side). This is a static cost model; actual commissions, funding, execution slippage and capital/margin constraints are not reproduced. Closed signals enter at the next bar open; stops precede targets when both occur within a bar, and completed-bar trailing updates apply to the next bar. Source gaps fail validation.

Selection reads only physically truncated IS candles. It first considers configurations with at least 30 IS settled closes, return PF ≥1.1 and positive net returns both closed and including endpoint open marks, then ranks by IS net-return sum including those marks (ties: closed net, sample count, ID). A group without a qualifying cell keeps an explicitly unqualified diagnostic winner. All selected IDs freeze before OOS evaluation. **2/70 groups qualified in IS**; **8/70 diagnostic OOS groups meet the same screen**. OOS results never select pool membership.

Primary PF uses the shared return-based profitFactor helper. Gross positive/negative net-return sums and exact finite ratios are retained in JSON. A starred PF uses the existing no-loss sentinel 4, not an exact measured ratio; no-loss exactRatio is null. Net and drawdown below are sums of per-trade return **percentage points**, not account ROI or account drawdown. Open marks include the modeled roundtrip cost and are shown separately from settled-close PF. Pools combine overlapping independent configuration copies and are not an executable account portfolio.

| OOS pool | Closes | Return PF | Net points | Max DD points | Opens | PF incl. open marks | Net incl. marks |
|---|---:|---:|---:|---:|---:|---:|---:|
| All selected groups (diagnostic) | 8418 | 0.786 | -870.926 | 1053.898 | 195 | 0.781 | -908.148 |
| IS-qualified selected groups only | 130 | 0.662 | -24.173 | 31.594 | 2 | 0.655 | -25.066 |

| Technique/range/lane | IS qualified | IS closes | IS return PF | OOS closes | OOS return PF | OOS net points | OOS DD points | Opens | OOS PF incl. marks | OOS screen |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tactic-trend-s@m1 | no | 376 | 0.644 | 379 | 0.909 | -18.983 | 42.019 | 12 | 0.892 | fail |
| tactic-trend-s@m1c | no | 34 | 0.484 | 80 | 0.504 | -11.981 | 14.082 | 1 | 0.496 | fail |
| tactic-trend-s@m5 | no | 257 | 0.668 | 310 | 0.882 | -16.699 | 28.835 | 5 | 0.880 | fail |
| tactic-trend-s@m5c | no | 75 | 0.555 | 96 | 0.708 | -7.346 | 9.973 | 1 | 0.697 | fail |
| tactic-trend-s@m15 | no | 93 | 0.391 | 215 | 0.790 | -16.648 | 20.950 | 4 | 0.789 | fail |
| tactic-trend-s@m15c | no | 34 | 0.722 | 75 | 1.377 | 13.235 | 13.422 | 1 | 1.387 | pass |
| tactic-trend-s@m30 | no | 8 | 0.993 | 72 | 1.001 | 0.056 | 24.951 | 2 | 1.001 | fail |
| tactic-trend-m@m1 | no | 349 | 0.647 | 338 | 0.850 | -28.025 | 48.114 | 8 | 0.842 | fail |
| tactic-trend-m@m1c | no | 8 | 1.065 | 18 | 0.766 | -1.715 | 2.615 | 0 | 0.766 | fail |
| tactic-trend-m@m5 | no | 161 | 0.569 | 183 | 1.150 | 13.925 | 31.192 | 6 | 1.147 | pass |
| tactic-trend-m@m5c | no | 34 | 0.558 | 43 | 0.730 | -3.272 | 5.172 | 0 | 0.730 | fail |
| tactic-trend-m@m15 | no | 50 | 0.602 | 101 | 1.063 | 3.538 | 24.819 | 6 | 1.123 | fail |
| tactic-trend-m@m15c | no | 32 | 0.543 | 92 | 0.686 | -10.944 | 19.159 | 0 | 0.686 | fail |
| tactic-trend-m@m30 | no | 6 | 1.025 | 62 | 0.799 | -7.828 | 20.765 | 1 | 0.827 | fail |
| tactic-pullback-s@m1 | no | 262 | 0.640 | 281 | 0.705 | -48.367 | 50.271 | 7 | 0.682 | fail |
| tactic-pullback-s@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-s@m5 | no | 147 | 0.497 | 164 | 0.466 | -29.961 | 30.811 | 2 | 0.460 | fail |
| tactic-pullback-s@m5c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-s@m15 | no | 26 | 0.625 | 69 | 0.566 | -7.466 | 8.056 | 1 | 0.561 | fail |
| tactic-pullback-s@m15c | no | 1 | 4.000* | 12 | 0.446 | -2.338 | 2.338 | 0 | 0.446 | fail |
| tactic-pullback-s@m30 | no | 2 | 0.000 | 46 | 0.381 | -9.119 | 9.119 | 0 | 0.381 | fail |
| tactic-pullback-m@m1 | no | 212 | 0.546 | 222 | 0.630 | -49.624 | 49.841 | 5 | 0.625 | fail |
| tactic-pullback-m@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-m@m5 | no | 95 | 0.355 | 105 | 0.619 | -14.019 | 17.758 | 2 | 0.609 | fail |
| tactic-pullback-m@m5c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-m@m15 | no | 14 | 0.334 | 47 | 0.336 | -10.861 | 11.261 | 0 | 0.336 | fail |
| tactic-pullback-m@m15c | no | 3 | 0.168 | 12 | 0.245 | -3.322 | 3.322 | 0 | 0.245 | fail |
| tactic-pullback-m@m30 | no | 3 | 0.308 | 26 | 1.002 | 0.013 | 2.200 | 0 | 1.002 | fail |
| tactic-mean-reversion-s@m1 | no | 322 | 0.881 | 304 | 0.666 | -65.714 | 67.369 | 9 | 0.664 | fail |
| tactic-mean-reversion-s@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-mean-reversion-s@m5 | no | 140 | 0.628 | 132 | 0.611 | -33.041 | 38.621 | 14 | 0.621 | fail |
| tactic-mean-reversion-s@m5c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-mean-reversion-s@m15 | yes | 33 | 1.139 | 91 | 0.488 | -28.508 | 32.863 | 2 | 0.483 | fail |
| tactic-mean-reversion-s@m15c | no | 6 | 1.096 | 20 | 0.909 | -1.139 | 8.420 | 2 | 0.751 | fail |
| tactic-mean-reversion-s@m30 | no | 2 | 4.000* | 59 | 0.425 | -12.716 | 14.716 | 2 | 0.415 | fail |
| tactic-mean-reversion-m@m1 | no | 292 | 0.910 | 267 | 0.553 | -78.346 | 80.000 | 10 | 0.553 | fail |
| tactic-mean-reversion-m@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-mean-reversion-m@m5 | no | 121 | 0.877 | 95 | 0.515 | -32.173 | 32.640 | 10 | 0.534 | fail |
| tactic-mean-reversion-m@m5c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-mean-reversion-m@m15 | no | 21 | 0.840 | 60 | 0.609 | -16.671 | 20.195 | 2 | 0.598 | fail |
| tactic-mean-reversion-m@m15c | no | 2 | 0.000 | 17 | 0.780 | -1.836 | 6.786 | 2 | 0.594 | fail |
| tactic-mean-reversion-m@m30 | no | 2 | 4.000* | 36 | 0.392 | -8.700 | 8.850 | 2 | 0.378 | fail |
| tactic-breakout-s@m1 | no | 340 | 0.601 | 340 | 0.821 | -36.155 | 40.396 | 8 | 0.810 | fail |
| tactic-breakout-s@m1c | no | 22 | 0.830 | 33 | 1.985 | 6.018 | 3.551 | 0 | 1.985 | pass |
| tactic-breakout-s@m5 | no | 180 | 0.588 | 203 | 0.582 | -36.737 | 36.845 | 1 | 0.579 | fail |
| tactic-breakout-s@m5c | yes | 32 | 1.213 | 39 | 1.276 | 4.335 | 11.493 | 0 | 1.276 | pass |
| tactic-breakout-s@m15 | no | 39 | 0.357 | 94 | 0.356 | -17.347 | 17.347 | 0 | 0.356 | fail |
| tactic-breakout-s@m15c | no | 15 | 0.228 | 40 | 0.389 | -8.810 | 8.885 | 0 | 0.389 | fail |
| tactic-breakout-s@m30 | no | 3 | 0.320 | 38 | 1.991 | 4.433 | 2.073 | 0 | 1.991 | pass |
| tactic-breakout-m@m1 | no | 508 | 0.515 | 572 | 0.628 | -80.785 | 86.195 | 1 | 0.627 | fail |
| tactic-breakout-m@m1c | no | 11 | 1.255 | 24 | 1.137 | 1.984 | 9.428 | 0 | 1.137 | fail |
| tactic-breakout-m@m5 | no | 180 | 0.459 | 197 | 0.507 | -33.537 | 33.760 | 0 | 0.507 | fail |
| tactic-breakout-m@m5c | no | 21 | 0.796 | 29 | 2.264 | 14.662 | 8.718 | 0 | 2.264 | fail |
| tactic-breakout-m@m15 | no | 34 | 0.359 | 72 | 0.426 | -11.449 | 11.449 | 0 | 0.426 | fail |
| tactic-breakout-m@m15c | no | 14 | 0.171 | 40 | 0.474 | -7.111 | 7.864 | 0 | 0.474 | fail |
| tactic-breakout-m@m30 | no | 2 | 0.000 | 36 | 0.489 | -5.430 | 7.694 | 0 | 0.489 | fail |
| tactic-adaptive-s@m1 | no | 417 | 0.739 | 417 | 0.842 | -38.549 | 49.470 | 12 | 0.832 | fail |
| tactic-adaptive-s@m1c | no | 65 | 0.443 | 122 | 1.034 | 1.015 | 12.605 | 1 | 1.020 | fail |
| tactic-adaptive-s@m5 | no | 244 | 0.584 | 258 | 0.986 | -2.033 | 36.819 | 14 | 0.966 | fail |
| tactic-adaptive-s@m5c | no | 100 | 0.568 | 132 | 0.823 | -6.350 | 15.334 | 1 | 0.814 | fail |
| tactic-adaptive-s@m15 | no | 72 | 0.542 | 183 | 0.802 | -23.693 | 36.148 | 6 | 0.811 | fail |
| tactic-adaptive-s@m15c | no | 59 | 0.671 | 152 | 1.367 | 15.294 | 13.534 | 1 | 1.363 | pass |
| tactic-adaptive-s@m30 | no | 16 | 0.673 | 164 | 0.642 | -22.646 | 30.570 | 0 | 0.642 | fail |
| tactic-adaptive-m@m1 | no | 401 | 0.704 | 397 | 0.855 | -33.182 | 41.126 | 10 | 0.847 | fail |
| tactic-adaptive-m@m1c | no | 34 | 0.979 | 57 | 1.202 | 2.987 | 7.390 | 0 | 1.202 | pass |
| tactic-adaptive-m@m5 | no | 213 | 0.618 | 221 | 0.996 | -0.462 | 41.575 | 9 | 0.981 | fail |
| tactic-adaptive-m@m5c | no | 48 | 0.522 | 78 | 1.102 | 2.198 | 13.130 | 0 | 1.102 | pass |
| tactic-adaptive-m@m15 | no | 69 | 0.513 | 152 | 0.944 | -5.248 | 27.827 | 5 | 0.972 | fail |
| tactic-adaptive-m@m15c | no | 35 | 0.333 | 112 | 0.865 | -5.241 | 21.739 | 0 | 0.865 | fail |
| tactic-adaptive-m@m30 | no | 5 | 1.850 | 87 | 0.947 | -2.494 | 25.001 | 7 | 0.859 | fail |


## Separate raw onset diagnostic

This second mode uses comboSignal without DEFAULT_TACTICS and independently selects its own 1680 IS cells with the same PF ≥1.1 protocol. It is not mixed into the primary mode or chosen on OOS performance. 2/70 raw groups qualify in IS.

| Raw OOS pool | Closes | Return PF | Net points | Max DD points | Opens | PF incl. open marks | Net incl. marks |
|---|---:|---:|---:|---:|---:|---:|---:|
| All raw selected groups (diagnostic) | 11029 | 0.718 | -1622.546 | 1678.967 | 289 | 0.709 | -1713.829 |
| Raw IS-qualified selected groups | 102 | 0.644 | -23.025 | 37.610 | 8 | 0.579 | -30.304 |

Raw selected IDs, all cells, all70 group outcomes, context and trade hashes are separate under rawDiagnostic in JSON. Neither mode is selected or retuned on its OOS result.

Context breakdowns in JSON attribute each OOS settled close to the technique's completed signal-bar regime, volatility band, trend alignment, adaptive method, direction and symbol. These are post-selection diagnostics, not further filters. Combined-lane contexts describe the base lane; higher-lane agreement is part of the signal pipeline. All IS cells, selected protects, counts, return sums, drawdowns, trade hashes and entry/exit bounds are retained in the reproducible JSON. No parameter or technique is claimed to be best outside this source window and symbol sample and disclosed grid.

Reproduce from the repository root:

```sh
node --experimental-strip-types --no-warnings --max-old-space-size=768 scripts/core-tactic-research.mjs --mode both --cache runs/research-market-20261014/market-cache.json --split 2026-10-05T21:25:00.000Z --out runs/tactic-research-20261014/report.json --markdown docs/tactic-validation.md
node --experimental-strip-types --no-warnings --test scripts/core-tactic-research.test.mjs
```

Cache SHA256: `03aa4dbaaaad3a4f009d86818fca76b17ebc407e976913dab9733a4370e458e5`. Source fingerprint: `52973146aa8c5a810cd35c70aa0d2b944c27370666bc4a1f9a7e0256551b7c6b`. Selection SHA256: `8d0ef93a1ed29b8e0ed507847ba3c01671bbe907290f990c453b72d172296ab2`. Deterministic report SHA256: `73079f3b6ad82614a8c6a85ed26b2897affad38d86d53d3687e86dae85e749b6`. Raw market and generated JSON remain outside Git; the command regenerates them from the stated cache. The runner uses no network or account access.

Verification: all 9 focused research regressions passed, including all 70 raw and default-filter prefix/future-poison checks, boundary/cost fixtures, independent IS selection under poisoned OOS, and mode provenance. Two complete runs produced byte-identical JSON with the report hash above (18.28 and 18.39 seconds; peak resident memory 417 and 440 MiB). The independently reviewed default-mode IS-qualified pool remains below PF 1 after costs; no settings were promoted.

Resampling retains only complete, epoch-aligned buckets. Available bars per symbol are identical across the eight gap-free source series:

| Lane minutes | IS completed bars | Full feature bars | OOS eligible entry bars | First eligible OOS open | Final completed close |
|---|---:|---:|---:|---|---|
| 1 | 12960 | 25920 | 12960 | 2026-10-05 21:25Z | 2026-10-14 21:25Z |
| 5 | 2592 | 5184 | 2592 | 2026-10-05 21:25Z | 2026-10-14 21:25Z |
| 15 | 863 | 1727 | 863 | 2026-10-05 21:30Z | 2026-10-14 21:15Z |
| 30 | 431 | 863 | 431 | 2026-10-05 21:30Z | 2026-10-14 21:00Z |

Endpoint open marks use each lane's final completed close above; they are not a fresh price quote at the 1m source endpoint. The incomplete higher-timeframe edge buckets are excluded. Eligible bars describe data availability, not accepted entry signals or trades.
