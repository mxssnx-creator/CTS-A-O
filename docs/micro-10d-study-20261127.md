# Micro simulation on 50 BingX contracts

The scored period ran from 17 November 01:00 to 27 November 01:00 Vienna time. Four days of evaluated prehistory began 13 November 01:00. The preceding day initialized indicators. The feed contained 1,080,000 contiguous completed minute bars across 50 pinned USDT perpetual contracts. Packed feed SHA-256 `dc73441ce8371857d6ae5c47f1f6dfb974761426c3d0756d62f750e08746e49c`.

The matrix measured 206 independent source, timeframe, hold and stage-policy profiles on 1, 5, 15 and 30-minute lanes. All profiles built 24 distinct Micro protection cells across Normal, Trailing and Trailing-only. Evaluation cost was 0.176% round trip. Net targets were 0.20%, 0.30%, 0.40% and 0.60%. Price-target stop ratios were 0.75 and 1.25. Fifteen and 30-minute holds were scored with completed one-minute execution prices. The 30-minute 4/2/2 arm retained the same Base proof and added faster downstream evaluation.

## Funded modeled confirmation

Explicit focus `follow|micro-1-adx-pullback-selective@m1` is the measured research lane. It uses Wilder DMI(14), ADX ≥22, ordered EMA(9) and EMA(26), and a completed close reclaiming EMA(9) in the matching direction. The lane uses the normal Micro registry and configuration IDs. Select its exact focus with timeframe 1 enabled and `grid.micro.minTf` set to 1. Its tested protection grid used a 30-minute hold, normal and trailing enabled, `trailOfTp` 0 or 0.65 and the grid above. For the offline replay, set `wf.processedStages.baseScope` to `context`, enable `rollingBase`, use independent Auto PF ratio 4 and set 4/2/2 predecessor counts at Main, Real and Exec.

At 27 November 01:00 Vienna time, post-Base PF was **5.392** with **3/2,400 (0.125%)** exact contexts passing. The funded modeled book opened and closed 11 positions and settled all 56 orders, at return PF **1.648**. The run recorded four positive hours out of 240 (1.67%) and 0.000973% marked equity drawdown on $10,000 starting equity and $2 per order. The first five days settled two losing orders. The second five days settled 54 at PF 2.182. Fifty-five settlements were short and one was long. Both directions retain separate entries and qualification. The native engine matched the independent screen's counts and gross returns and passed 59 reconciliation checks. Funded settlement SHA-256 `d68e2ce2a93efa80b93ad52a74ee498ae545023a68c48f3c2814e8cb42b13f2c`.

| Other screened profiles | Hold and stages | Modeled settled orders | Entire window PF | First half PF | Second half PF |
|---|---|---:|---:|---:|---:|
| Existing 1m Micro drawdown turn | 15m · 6/4/4 | 27 | 0.366 | 0.418 | 0.304 |
| 5m PSAR flip, fast | 30m · 4/2/2 | 41 | 2.269 | 2.375 | 0.422 |
| 5m wick reclaim, fast | 30m · 4/2/2 | 126 | 1.159 | 2.955 | 0.293 |
| Existing 15m market momentum | 30m · 4/2/2 | 152 | 1.031 | 0.000 | 1.077 |
| Existing 1m RSI 52/48 | 30m · 4/2/2 | 147 | 0.690 | 0.778 | 0.481 |

The chronological default-selection rule required PF ≥1.05 and at least 20 distinct entry onsets in each five-day half. Zero profiles met it. The ADX result supports an explicitly selectable research lane. The Stable-04 merge candidate includes the opt-in offline rolling Base path and reproduced the same 56 funded orders, cutoff gates and all 240 hourly rows. The comparison on the same branch with fixed Base passed 0/1 pooled pairs, built no exact contexts and opened no orders. Post-Base PF and validation percentage were unavailable on that comparison. In rolling mode, the 96 evaluated prehistory hours build each exact context before the scoring clock. The earlier indicator-only day supplies no entry samples.

## Performance and independent evidence

The minute execution clock shares immutable price alignment between protection and indication calculations on the same symbol and source timeframe. Candidate signals retain separate sparse projections. In an alternating 1,440-call benchmark over 12 real markets and three source timeframes, median projection time fell from 219.4 ms to 10.2 ms. All 108 signal and numeric parity checks passed. The 50-symbol rolling ADX native compute took 7.6 seconds on the Stable-04 candidate. Three paired symbol-batching checks matched candidate counts, stage decisions, settled returns and marked drawdown.

- [BingX public market data endpoint](https://github.com/BingX-API/api-ai-skills/blob/main/skills/swap-market/api-reference.md)
- [Intraday cryptocurrency momentum and reversal](https://www.sciencedirect.com/science/article/abs/pii/S1062940822000833)
- [Transaction costs in one-minute crypto rules](https://doi.org/10.1016/j.intfin.2022.101601)
- [Wilder ADX and directional movement](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/average-directional-index-adx)
