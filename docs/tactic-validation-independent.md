# Tactic held-out validation

Offline simulation of the first-class Tactic indication family. No orders, promotions or settings changes. These results do not establish live profitability.

Primary mode: **Current default entry filters**, using `entrySignal(follow, indication, cache, DEFAULT_TACTICS)`. Exact tactics: `{"session":false,"volRegime":true,"trendStrength":true,"chopRegime":false,"cooldown":false,"cooldownBars":4}`; effective cooldown 0 bars. Effective per-indication filter keys are retained in JSON, including the existing low-ADX exemption for mean reversion and adaptive. This reproduces the default entry filters and cooldown with the disclosed research protects; it does not reproduce full runtime account coordination, stage gates or position sizing. The raw onset study cannot establish default-system performance.

Source: APT-USDT, ATOM-USDT, AVAX-USDT, DOT-USDT, LINK-USDT, LTC-USDT, NEAR-USDT, SUI-USDT; 1,036,800 completed 1m candles, 2026-07-16T21:25:00.000Z to 2026-10-14T21:25:00.000Z exclusive, 0 gaps. Chronological split: **2026-09-14T21:25:00.000Z**. IS has 691,200 source candles; OOS starts with fresh flat positions and warmed causal context.

70 distinct technique/range/lane groups; 1680 IS protect candidates; 24 protect cells per group. The five techniques each have short and medium ranges. Lanes are independent and combined 1/5/15m plus independent 30m; 30m combined is identical and counted once. Follow entries use state onsets; long and short slots run independently.

The frozen grid is TP 0.6/1.2/2.4%, stop 0.75/1.5× TP, trailing disabled or 0.5× TP, hold 2/8 hours (24 cells). Hold periods use equal wall time; these explicit distances are not lane-scaled. Every settled or endpoint-marked return deducts **0.2% roundtrip cost** (0.1% per side). This is a static cost model; actual commissions, funding, execution slippage and capital/margin constraints are not reproduced. Closed signals enter at the next bar open; stops precede targets when both occur within a bar, and completed-bar trailing updates apply to the next bar. Source gaps fail validation.

Selection reads only physically truncated IS candles. It first considers configurations with at least 30 IS settled closes, return PF ≥1.1 and positive net returns both closed and including endpoint open marks, then ranks by IS net-return sum including those marks (ties: closed net, sample count, ID). A group without a qualifying cell keeps an explicitly unqualified diagnostic winner. All selected IDs freeze before OOS evaluation. **6/70 groups qualified in IS**; **19/70 diagnostic OOS groups meet the same screen**. OOS results never select pool membership.

Primary PF uses the shared return-based profitFactor helper. Gross positive/negative net-return sums and exact finite ratios are retained in JSON. A starred PF uses the existing no-loss sentinel 4, not an exact measured ratio; no-loss exactRatio is null. Net and drawdown below are sums of per-trade return **percentage points**, not account ROI or account drawdown. Open marks include the modeled roundtrip cost and are shown separately from settled-close PF. Pools combine overlapping independent configuration copies and are not an executable account portfolio.

| OOS pool | Closes | Return PF | Net points | Max DD points | Opens | PF incl. open marks | Net incl. marks |
|---|---:|---:|---:|---:|---:|---:|---:|
| All selected groups (diagnostic) | 30362 | 0.900 | -2969.214 | 4743.728 | 240 | 0.896 | -3110.551 |
| IS-qualified selected groups only | 910 | 1.118 | 106.424 | 186.772 | 7 | 1.116 | 105.416 |

| Technique/range/lane | IS qualified | IS closes | IS return PF | OOS closes | OOS return PF | OOS net points | OOS DD points | Opens | OOS PF incl. marks | OOS screen |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tactic-trend-s@m1 | no | 2719 | 0.729 | 1681 | 0.817 | -357.900 | 373.009 | 12 | 0.815 | fail |
| tactic-trend-s@m1c | no | 311 | 0.751 | 148 | 0.961 | -4.489 | 31.433 | 0 | 0.961 | fail |
| tactic-trend-s@m5 | no | 1654 | 0.682 | 1062 | 0.806 | -173.119 | 267.366 | 7 | 0.802 | fail |
| tactic-trend-s@m5c | no | 422 | 0.848 | 226 | 1.259 | 52.256 | 57.863 | 0 | 1.259 | pass |
| tactic-trend-s@m15 | no | 745 | 0.926 | 482 | 1.190 | 87.195 | 86.605 | 7 | 1.176 | pass |
| tactic-trend-s@m15c | no | 468 | 0.996 | 293 | 1.386 | 98.374 | 44.675 | 1 | 1.377 | pass |
| tactic-trend-s@m30 | yes | 459 | 1.134 | 343 | 1.205 | 69.432 | 61.762 | 3 | 1.204 | pass |
| tactic-trend-m@m1 | no | 2487 | 0.726 | 1463 | 0.844 | -258.398 | 323.235 | 8 | 0.841 | fail |
| tactic-trend-m@m1c | no | 125 | 0.765 | 40 | 1.311 | 9.527 | 8.281 | 0 | 1.311 | pass |
| tactic-trend-m@m5 | no | 1297 | 0.809 | 742 | 1.023 | 17.135 | 171.243 | 8 | 1.013 | fail |
| tactic-trend-m@m5c | no | 287 | 0.661 | 137 | 1.117 | 8.479 | 14.672 | 0 | 1.117 | pass |
| tactic-trend-m@m15 | no | 668 | 0.926 | 454 | 1.133 | 53.764 | 72.667 | 6 | 1.130 | pass |
| tactic-trend-m@m15c | no | 369 | 0.892 | 228 | 1.390 | 77.544 | 39.182 | 2 | 1.387 | pass |
| tactic-trend-m@m30 | yes | 375 | 1.260 | 281 | 1.104 | 29.883 | 79.395 | 3 | 1.105 | pass |
| tactic-pullback-s@m1 | no | 2043 | 0.761 | 1045 | 0.815 | -217.869 | 257.097 | 12 | 0.809 | fail |
| tactic-pullback-s@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-s@m5 | no | 892 | 0.740 | 445 | 0.910 | -41.310 | 126.146 | 7 | 0.902 | fail |
| tactic-pullback-s@m5c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-s@m15 | no | 366 | 1.016 | 221 | 1.194 | 28.817 | 39.967 | 2 | 1.191 | pass |
| tactic-pullback-s@m15c | no | 63 | 0.871 | 33 | 1.373 | 6.011 | 6.445 | 0 | 1.373 | pass |
| tactic-pullback-s@m30 | yes | 182 | 1.126 | 99 | 1.118 | 11.142 | 26.904 | 0 | 1.118 | pass |
| tactic-pullback-m@m1 | no | 1649 | 0.759 | 780 | 0.962 | -29.411 | 144.243 | 8 | 0.958 | fail |
| tactic-pullback-m@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-m@m5 | no | 658 | 0.735 | 343 | 0.859 | -35.967 | 64.907 | 4 | 0.849 | fail |
| tactic-pullback-m@m5c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-pullback-m@m15 | yes | 239 | 1.146 | 116 | 1.135 | 15.108 | 27.621 | 1 | 1.125 | pass |
| tactic-pullback-m@m15c | yes | 30 | 1.501 | 14 | 1.138 | 1.192 | 4.788 | 0 | 1.138 | fail |
| tactic-pullback-m@m30 | yes | 110 | 1.299 | 57 | 0.675 | -20.332 | 30.719 | 0 | 0.675 | fail |
| tactic-mean-reversion-s@m1 | no | 2209 | 0.749 | 1394 | 0.830 | -264.895 | 274.844 | 9 | 0.827 | fail |
| tactic-mean-reversion-s@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-mean-reversion-s@m5 | no | 1229 | 0.679 | 762 | 0.821 | -97.617 | 112.400 | 11 | 0.817 | fail |
| tactic-mean-reversion-s@m5c | no | 0 | 0.000 | 1 | 0.000 | -0.650 | 0.650 | 0 | 0.000 | fail |
| tactic-mean-reversion-s@m15 | no | 688 | 0.707 | 369 | 0.701 | -72.196 | 72.754 | 1 | 0.698 | fail |
| tactic-mean-reversion-s@m15c | no | 85 | 0.897 | 47 | 0.630 | -22.081 | 28.144 | 0 | 0.630 | fail |
| tactic-mean-reversion-s@m30 | no | 314 | 0.579 | 190 | 0.539 | -55.458 | 59.489 | 1 | 0.534 | fail |
| tactic-mean-reversion-m@m1 | no | 2160 | 0.752 | 1424 | 0.818 | -210.439 | 225.260 | 6 | 0.815 | fail |
| tactic-mean-reversion-m@m1c | no | 0 | 0.000 | 0 | 0.000 | 0.000 | 0.000 | 0 | 0.000 | fail |
| tactic-mean-reversion-m@m5 | no | 836 | 0.763 | 500 | 0.834 | -81.073 | 107.648 | 11 | 0.837 | fail |
| tactic-mean-reversion-m@m5c | no | 5 | 4.000* | 1 | 0.000 | -1.100 | 1.100 | 0 | 0.000 | fail |
| tactic-mean-reversion-m@m15 | no | 422 | 0.793 | 254 | 0.803 | -36.120 | 47.903 | 1 | 0.798 | fail |
| tactic-mean-reversion-m@m15c | no | 74 | 0.906 | 39 | 0.980 | -0.789 | 14.862 | 0 | 0.980 | fail |
| tactic-mean-reversion-m@m30 | no | 279 | 0.443 | 173 | 0.429 | -41.357 | 42.847 | 0 | 0.429 | fail |
| tactic-breakout-s@m1 | no | 2114 | 0.761 | 1384 | 0.821 | -287.120 | 305.866 | 9 | 0.819 | fail |
| tactic-breakout-s@m1c | no | 79 | 0.658 | 63 | 0.931 | -1.743 | 7.696 | 0 | 0.931 | fail |
| tactic-breakout-s@m5 | no | 941 | 0.760 | 573 | 0.824 | -117.771 | 186.711 | 10 | 0.814 | fail |
| tactic-breakout-s@m5c | no | 156 | 0.782 | 89 | 2.009 | 53.546 | 14.176 | 0 | 2.009 | pass |
| tactic-breakout-s@m15 | no | 376 | 0.850 | 227 | 0.766 | -42.361 | 61.518 | 1 | 0.760 | fail |
| tactic-breakout-s@m15c | no | 190 | 0.897 | 107 | 0.865 | -11.241 | 21.929 | 0 | 0.865 | fail |
| tactic-breakout-s@m30 | no | 215 | 0.828 | 127 | 1.050 | 4.306 | 23.472 | 1 | 1.037 | fail |
| tactic-breakout-m@m1 | no | 1987 | 0.707 | 1323 | 0.818 | -203.594 | 231.718 | 8 | 0.813 | fail |
| tactic-breakout-m@m1c | no | 74 | 0.764 | 50 | 0.541 | -11.449 | 12.297 | 0 | 0.541 | fail |
| tactic-breakout-m@m5 | no | 761 | 0.811 | 452 | 0.922 | -38.821 | 134.693 | 5 | 0.912 | fail |
| tactic-breakout-m@m5c | no | 135 | 0.889 | 76 | 1.463 | 16.725 | 9.731 | 0 | 1.463 | pass |
| tactic-breakout-m@m15 | no | 324 | 0.944 | 198 | 0.822 | -24.468 | 51.326 | 0 | 0.822 | fail |
| tactic-breakout-m@m15c | no | 175 | 0.847 | 96 | 0.730 | -14.049 | 15.722 | 0 | 0.730 | fail |
| tactic-breakout-m@m30 | no | 177 | 0.855 | 130 | 0.945 | -4.804 | 27.697 | 1 | 0.934 | fail |
| tactic-adaptive-s@m1 | no | 2894 | 0.749 | 1845 | 0.816 | -397.324 | 413.092 | 13 | 0.813 | fail |
| tactic-adaptive-s@m1c | no | 467 | 0.831 | 263 | 1.095 | 19.399 | 42.827 | 0 | 1.095 | fail |
| tactic-adaptive-s@m5 | no | 1780 | 0.742 | 1103 | 0.828 | -221.700 | 331.120 | 13 | 0.823 | fail |
| tactic-adaptive-s@m5c | no | 524 | 0.842 | 308 | 1.252 | 71.640 | 62.289 | 0 | 1.252 | pass |
| tactic-adaptive-s@m15 | no | 1011 | 0.871 | 638 | 0.983 | -11.554 | 126.709 | 7 | 0.975 | fail |
| tactic-adaptive-s@m15c | no | 543 | 0.928 | 351 | 1.247 | 79.781 | 61.708 | 1 | 1.240 | pass |
| tactic-adaptive-s@m30 | no | 644 | 0.863 | 435 | 1.085 | 38.183 | 63.419 | 5 | 1.080 | fail |
| tactic-adaptive-m@m1 | no | 2759 | 0.755 | 1737 | 0.827 | -350.535 | 372.353 | 13 | 0.826 | fail |
| tactic-adaptive-m@m1c | no | 294 | 0.623 | 126 | 1.084 | 5.387 | 15.766 | 0 | 1.084 | fail |
| tactic-adaptive-m@m5 | no | 1776 | 0.770 | 1178 | 0.816 | -180.368 | 250.867 | 10 | 0.809 | fail |
| tactic-adaptive-m@m5c | no | 355 | 0.812 | 187 | 1.423 | 63.001 | 22.276 | 0 | 1.423 | pass |
| tactic-adaptive-m@m15 | no | 1002 | 0.936 | 703 | 0.932 | -36.593 | 123.855 | 6 | 0.925 | fail |
| tactic-adaptive-m@m15c | no | 493 | 0.829 | 324 | 1.215 | 59.409 | 50.317 | 2 | 1.213 | pass |
| tactic-adaptive-m@m30 | no | 544 | 0.907 | 382 | 1.079 | 31.613 | 70.186 | 4 | 1.076 | fail |


## Separate raw onset diagnostic

This second mode uses comboSignal without DEFAULT_TACTICS and independently selects its own 1680 IS cells with the same PF ≥1.1 protocol. It is not mixed into the primary mode or chosen on OOS performance. 1/70 raw groups qualify in IS.

| Raw OOS pool | Closes | Return PF | Net points | Max DD points | Opens | PF incl. open marks | Net incl. marks |
|---|---:|---:|---:|---:|---:|---:|---:|
| All raw selected groups (diagnostic) | 41475 | 0.890 | -4741.471 | 6425.245 | 328 | 0.887 | -4924.992 |
| Raw IS-qualified selected groups | 27 | 1.815 | 9.815 | 4.653 | 0 | 1.815 | 9.815 |

Raw selected IDs, all cells, all70 group outcomes, context and trade hashes are separate under rawDiagnostic in JSON. Neither mode is selected or retuned on its OOS result.

Context breakdowns in JSON attribute each OOS settled close to the technique's completed signal-bar regime, volatility band, trend alignment, adaptive method, direction and symbol. These are post-selection diagnostics, not further filters. Combined-lane contexts describe the base lane; higher-lane agreement is part of the signal pipeline. All IS cells, selected protects, counts, return sums, drawdowns, trade hashes and entry/exit bounds are retained in the reproducible JSON. No parameter or technique is claimed to be best outside this source window and symbol sample and disclosed grid.

Reproduce from the repository root:

```sh
node --experimental-strip-types --no-warnings --max-old-space-size=768 scripts/core-tactic-research.mjs --mode both --cache runs/research-tactic-independent-20261014/market-cache.json --split 2026-09-14T21:25:00.000Z --out runs/research-tactic-independent-20261014/research-report.json --markdown docs/tactic-validation-independent.md
node --experimental-strip-types --no-warnings --test scripts/core-tactic-research.test.mjs
```

Cache SHA256: `09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4`. Source fingerprint: `f62aeaca0e988e269ef67e34c4339ce23b1566ec38b8cfa0080ae760386167d5`. Selection SHA256: `1e1ec0580c0f06c426d80301248adc09bc158104e34bbb126f625553d430ad0d`. Deterministic report SHA256: `5f40353363fd4d6a8f3054a6dbcee33726bfca93b3daca81878b38b95b8a2c3d`. Raw market and generated JSON remain outside Git; the command regenerates them from the stated cache. The runner uses no network or account access.

The exact report hash above belongs to the two recorded runs at source checkpoint `4c2f814c6c62c100f89d6f2adaf1ff6f7dfffe0f`. Reproducing that exact JSON requires that source checkpoint and cache. Later production worker packaging and pool fixes change the embedded wrapper-source fingerprint and therefore the report hash when rerunning newer source; they do not retune the frozen strategy components or selection rules.

## Acquisition freeze and scope

This second sample uses eight fixed new instruments: APT, ATOM, AVAX, DOT, LINK, LTC, NEAR and SUI against USDT. Its strategy components, 24-cell grid, two modes, costs, minimum 30 IS closes, PF ≥1.1 threshold and first-60/final-30-day split were recorded before public acquisition and before any new-sample return evaluation. The raw study and default-filter study each made their own IS selection. Neither mode nor individual pool membership was chosen using OOS outcomes. The six default-mode preselected groups retain the losing medium pullback 30m member; no losing OOS sibling was removed.

The new instruments are disjoint from the earlier eight-symbol sample, but the final dates overlap that study and crypto markets can share common moves. This is not an independent market regime, a statistical significance claim, or a new live execution record. The 18-day negative result remains preserved in tactic-validation.md. All 70 diagnostic groups remain available, including unqualified results. The raw preselected result has only 27 OOS closes and fails the disclosed 30-close diagnostic sample screen despite its positive PF.

The default preselected pool has 910 settled OOS closes at return PF 1.117865539, or 1.116471777 including seven open marks. Its maximum drawdown is 186.772 return percentage points against net +106.424 points; maximum drawdown time is 561.917 hours. Those are independent configuration return sums, not funded account returns. This study does not apply all runtime gates, portfolio risk limits or account sizing; a positive pooled PF cannot qualify an individual failing configuration or authorize a live promotion.

The public cache contains 1,036,800 original closed 1m candles (691,200 IS, 345,600 OOS), with zero gaps or duplicate timestamps. The independent validator checked every expected timestamp, OHLCV/schema, hashes and frozen component files before research. All ten explicitly frozen strategy component hashes still match the pre-acquisition snapshot; the imported math/indicators.ts hash is unchanged too. The full source wrapper fingerprint differs from that earlier snapshot because the background Base count implementation, worker/runtime integration, execution reject fix and test fixture were completed during acquisition. These changes are recorded in the complete source-file hash lists; they did not retune this runner's Tactic rules, entry filters, protect grid, costs or selection policy.

| Acquisition evidence | SHA256 |
|---|---|
| Frozen protocol | 30c38e4283afe22536f2f2be8795245bd1fcd1a4700c85ede7a02ea030d1c50b |
| Market manifest | c5d65e5fb6c378070704eea1deeb94384a4bf68e5faea346181a0e7c9dc2ee6d |
| Pre-acquisition engine fingerprint | 005e181268be39039a38d405d79999e6e7d3f0bb868ec7a807bbaf1bb46478ac |
| Independent validation | 894c0412ec474026cc9e05ecfcf397ed28bdfabb7adcddf975def425df28cce7 |

Resampling retains complete, epoch-aligned buckets only. Available bars per symbol are identical across all eight gap-free source series:

| Lane minutes | IS completed bars | Full feature bars | OOS eligible entry bars | First eligible OOS open | Final completed close |
|---|---:|---:|---:|---|---|
| 1 | 86400 | 129600 | 43200 | 2026-09-14 21:25Z | 2026-10-14 21:25Z |
| 5 | 17280 | 25920 | 8640 | 2026-09-14 21:25Z | 2026-10-14 21:25Z |
| 15 | 5759 | 8639 | 2879 | 2026-09-14 21:30Z | 2026-10-14 21:15Z |
| 30 | 2879 | 4319 | 1439 | 2026-09-14 21:30Z | 2026-10-14 21:00Z |

Endpoint marks use each lane's final completed close above and are not a fresh quote at the 1m source endpoint. Incomplete higher-timeframe edge buckets are excluded. Eligible bars measure data availability, not accepted entry signals or trades.

Verification: all 9 focused research regressions passed. Two complete source-stable runs produced byte-identical JSON (SHA256 `5f40353363fd4d6a8f3054a6dbcee33726bfca93b3daca81878b38b95b8a2c3d`), taking 105.43 and 104.59 seconds with peak resident memory 821.3 and 817.8 MiB under the 768 MiB JavaScript heap setting. Both before/after source checks passed; neither run changed any strategy, parameter, mode or pool selection after OOS evaluation.
