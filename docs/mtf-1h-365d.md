# Indications × timeframes — independent and combined

40 symbols · 365.0 days of real BingX 60m data (2025-09-26 → 2026-09-26) · half A → 2026-03-28 selects, half B validates · cost 0.2% round trip · 147 indications × follow/revert × 6 protects per timeframe · combined = the same indication agrees on the higher timeframe(s): 60m → 240m

## Pooled (every indication × bot × protect; no selection)

| timeframe | mode | variants | pass both halves (PF ≥ 1.1, ≥ 60 trades) | pooled PF A | pooled PF B | trades/day per variant |
|---|---|---:|---:|---:|---:|---:|
| 60m | independent | 1764 | 16 | 0.86 | 0.85 | 29.97 |
| 60m | combined | 1764 | 49 | 0.86 | 0.85 | 16.37 |

## Both-halves survivors (65)

| tf | mode | combo | TP | SL | hold (bars) | A n | A PF | B n | B PF | B trades/day | green hours B |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 60m | independent | follow·rsi-mom-14-15 | 5.20% | 5.20% | 16 | 239 | 1.62 | 175 | 1.55 | 0.96 | 56% |
| 60m | independent | follow·rsi-mom-21-20 | 5.20% | 5.20% | 16 | 214 | 1.53 | 173 | 1.45 | 0.95 | 55% |
| 60m | independent | follow·rsi-mom-14-15 | 5.20% | 10.40% | 16 | 239 | 1.42 | 175 | 1.58 | 0.96 | 59% |
| 60m | combined | follow·bb-walk | 5.20% | 5.20% | 16 | 372 | 1.42 | 385 | 1.35 | 2.11 | 56% |
| 60m | independent | follow·rsi-mom-21-20 | 5.20% | 10.40% | 16 | 214 | 1.36 | 173 | 1.33 | 0.95 | 58% |
| 60m | independent | follow·rsi-mom-14-15 | 3.12% | 6.24% | 16 | 245 | 1.38 | 179 | 1.31 | 0.98 | 62% |
| 60m | combined | follow·bb-walk | 8.32% | 8.32% | 16 | 365 | 1.73 | 368 | 1.30 | 2.02 | 52% |
| 60m | independent | follow·rsi-mom-21-25 | 5.20% | 5.20% | 16 | 661 | 1.34 | 557 | 1.30 | 3.05 | 50% |
| 60m | independent | follow·rsi-mom-21-25 | 5.20% | 10.40% | 16 | 661 | 1.33 | 556 | 1.29 | 3.05 | 53% |
| 60m | combined | follow·bb-walk | 5.20% | 10.40% | 16 | 372 | 1.46 | 385 | 1.29 | 2.11 | 57% |
| 60m | combined | follow·kelt-20-2.5 | 8.32% | 8.32% | 16 | 818 | 1.27 | 800 | 1.34 | 4.38 | 51% |
| 60m | independent | follow·rsi-mom-14-15 | 8.32% | 8.32% | 16 | 232 | 1.26 | 169 | 1.46 | 0.93 | 53% |
| 60m | combined | follow·break-vol-2 | 8.32% | 16.64% | 16 | 649 | 1.28 | 412 | 1.26 | 2.26 | 51% |
| 60m | combined | follow·kelt-20-2.5 | 8.32% | 16.64% | 16 | 818 | 1.25 | 799 | 1.34 | 4.38 | 51% |
| 60m | independent | follow·rsi-mom-21-20 | 3.12% | 6.24% | 16 | 222 | 1.28 | 180 | 1.24 | 0.99 | 63% |
| 60m | combined | follow·bb-walk | 3.12% | 6.24% | 16 | 380 | 1.24 | 398 | 1.40 | 2.18 | 65% |
| 60m | combined | revert·bb-bounce-20-3 | 8.32% | 8.32% | 16 | 103 | 1.56 | 109 | 1.23 | 0.60 | 44% |
| 60m | combined | revert·z-50-2.5 | 8.32% | 8.32% | 16 | 503 | 1.90 | 653 | 1.21 | 3.58 | 49% |
| 60m | combined | revert·cci-14-200 | 5.20% | 10.40% | 16 | 421 | 2.02 | 422 | 1.21 | 2.31 | 56% |
| 60m | combined | revert·z-50-2.5 | 8.32% | 16.64% | 16 | 503 | 1.77 | 653 | 1.21 | 3.58 | 50% |
| 60m | independent | follow·rsi-mom-14-15 | 8.32% | 16.64% | 16 | 232 | 1.21 | 169 | 1.38 | 0.93 | 54% |
| 60m | combined | follow·break-vol-2 | 5.20% | 10.40% | 16 | 659 | 1.21 | 416 | 1.28 | 2.28 | 54% |
| 60m | combined | follow·bb-walk-50 | 8.32% | 16.64% | 16 | 665 | 1.22 | 843 | 1.20 | 4.62 | 50% |
| 60m | combined | follow·break-vol-2 | 8.32% | 8.32% | 16 | 649 | 1.36 | 412 | 1.20 | 2.26 | 49% |
| 60m | independent | follow·rsi-mom-21-25 | 8.32% | 16.64% | 16 | 635 | 1.49 | 524 | 1.20 | 2.87 | 48% |
| 60m | independent | follow·rsi-mom-14-15 | 3.12% | 3.12% | 16 | 245 | 1.39 | 180 | 1.19 | 0.99 | 55% |
| 60m | combined | revert·z-50-2.5 | 5.20% | 10.40% | 16 | 517 | 1.86 | 685 | 1.19 | 3.75 | 55% |
| 60m | combined | revert·act-chop | 8.32% | 16.64% | 16 | 106 | 1.19 | 82 | 1.32 | 0.45 | 50% |
| 60m | combined | revert·rsi-14-25-75 | 8.32% | 8.32% | 16 | 441 | 1.18 | 401 | 1.20 | 2.20 | 46% |
| 60m | combined | follow·rsi-mom-14-25 | 8.32% | 8.32% | 16 | 441 | 1.18 | 401 | 1.20 | 2.20 | 46% |
| 60m | independent | follow·rsi-mom-21-25 | 8.32% | 8.32% | 16 | 635 | 1.51 | 524 | 1.17 | 2.87 | 47% |
| 60m | combined | follow·bb-walk-50 | 8.32% | 8.32% | 16 | 665 | 1.32 | 845 | 1.17 | 4.63 | 49% |
| 60m | combined | follow·break-vol-2 | 5.20% | 5.20% | 16 | 659 | 1.23 | 417 | 1.17 | 2.28 | 51% |
| 60m | combined | revert·bb-bounce-20-3 | 5.20% | 10.40% | 16 | 103 | 1.17 | 110 | 1.29 | 0.60 | 49% |
| 60m | independent | follow·rsi-mom-21-20 | 8.32% | 16.64% | 16 | 207 | 1.16 | 167 | 1.25 | 0.92 | 53% |
| 60m | combined | follow·bb-walk | 8.32% | 16.64% | 16 | 365 | 1.69 | 368 | 1.16 | 2.02 | 52% |
| 60m | combined | follow·bb-walk-50 | 5.20% | 10.40% | 16 | 687 | 1.16 | 885 | 1.22 | 4.85 | 54% |
| 60m | combined | follow·kelt-20-2.5 | 5.20% | 10.40% | 16 | 834 | 1.15 | 825 | 1.29 | 4.52 | 56% |
| 60m | combined | follow·bb-walk-50 | 5.20% | 5.20% | 16 | 689 | 1.14 | 888 | 1.18 | 4.87 | 50% |
| 60m | combined | revert·act-chop | 8.32% | 8.32% | 16 | 106 | 1.14 | 82 | 1.27 | 0.45 | 50% |
| 60m | combined | revert·rsi-14-25-75 | 8.32% | 16.64% | 16 | 441 | 1.14 | 401 | 1.28 | 2.20 | 47% |
| 60m | combined | follow·rsi-mom-14-25 | 8.32% | 16.64% | 16 | 441 | 1.14 | 401 | 1.28 | 2.20 | 47% |
| 60m | combined | follow·kelt-20-2.5 | 3.12% | 6.24% | 16 | 870 | 1.14 | 866 | 1.16 | 4.75 | 60% |
| 60m | independent | follow·rsi-mom-21-20 | 8.32% | 8.32% | 16 | 207 | 1.14 | 167 | 1.41 | 0.92 | 53% |
| 60m | combined | follow·kelt-20-2.5 | 5.20% | 5.20% | 16 | 836 | 1.14 | 831 | 1.22 | 4.55 | 52% |
| 60m | combined | follow·break-vol-2 | 3.12% | 6.24% | 16 | 677 | 1.25 | 423 | 1.14 | 2.32 | 59% |
| 60m | combined | revert·bb-bounce-20-3 | 8.32% | 16.64% | 16 | 103 | 1.48 | 109 | 1.13 | 0.60 | 44% |
| 60m | combined | revert·bb-bounce-20-3 | 5.20% | 5.20% | 16 | 103 | 1.31 | 110 | 1.13 | 0.60 | 46% |
| 60m | combined | revert·cci-40-200 | 8.32% | 8.32% | 16 | 585 | 1.15 | 652 | 1.13 | 3.57 | 49% |
| 60m | combined | revert·bb-bounce-50-2 | 8.32% | 16.64% | 16 | 1156 | 1.36 | 1488 | 1.13 | 8.15 | 49% |
| 60m | combined | revert·z-50-2 | 8.32% | 16.64% | 16 | 1156 | 1.36 | 1488 | 1.13 | 8.15 | 49% |
| 60m | combined | revert·cci-14-200 | 8.32% | 16.64% | 16 | 414 | 1.89 | 420 | 1.13 | 2.30 | 49% |
| 60m | combined | revert·z-50-2.5 | 5.20% | 5.20% | 16 | 519 | 1.73 | 688 | 1.13 | 3.77 | 51% |
| 60m | combined | follow·break-atr-2 | 5.20% | 10.40% | 16 | 613 | 1.17 | 580 | 1.13 | 3.18 | 53% |
| 60m | combined | revert·cci-14-200 | 8.32% | 8.32% | 16 | 414 | 1.91 | 420 | 1.12 | 2.30 | 48% |
| 60m | combined | follow·act-burst-2.5 | 8.32% | 16.64% | 16 | 898 | 1.16 | 857 | 1.12 | 4.70 | 47% |
| 60m | combined | revert·act-chop | 3.12% | 6.24% | 16 | 106 | 1.12 | 82 | 1.12 | 0.45 | 52% |
| 60m | combined | revert·bb-bounce-50-2 | 5.20% | 10.40% | 16 | 1202 | 1.19 | 1557 | 1.12 | 8.53 | 52% |
| 60m | combined | revert·z-50-2 | 5.20% | 10.40% | 16 | 1202 | 1.19 | 1557 | 1.12 | 8.53 | 52% |
| 60m | combined | follow·act-burst-2.5 | 8.32% | 8.32% | 16 | 906 | 1.23 | 871 | 1.12 | 4.77 | 45% |

## Every indication, one by one: best variant on A → half-B PF (trades in B)

| kind | indication | 60m | 60m comb. |
|---|---|---:|---:|
| trend | trend-ema | 0.89 (6474) | 0.87 (5786) |
| trend | trend-adx | 0.87 (3857) | 0.81 (1847) |
| trend | trend-st | 0.82 (3919) | 0.78 (2527) |
| trend | trend-ribbon | 0.83 (4286) | 0.83 (3226) |
| break | break-don20 | 0.89 (5816) | 0.91 (2563) |
| break | break-vol | 0.94 (2826) | 1.10 (684) |
| break | break-atr | 0.98 (6048) | 1.00 (2544) |
| break | break-squeeze | 0.85 (2529) | 0.88 (209) |
| break | break-retest | 0.82 (4298) | 0.79 (698) |
| break | break-fail | 0.79 (6784) | 0.73 (2565) |
| active | act-burst | 0.84 (5878) | 1.01 (2459) |
| active | act-shift | 0.75 (2339) | 0.55 (504) |
| active | act-hf | 0.88 (9073) | 1.00 (4878) |
| active | act-chop | 0.92 (2298) | 1.32 (82) |
| direction | dir-emax | 0.75 (4739) | 0.79 (4102) |
| direction | dir-st | 0.97 (5043) | 0.89 (4257) |
| direction | dir-vwap | 0.82 (4279) | 0.86 (4241) |
| direction | dir-macd | 0.92 (6986) | 0.86 (5925) |
| direction | dir-thrust | 0.88 (8274) | 0.98 (4006) |
| direction | dir-reclaim | 0.89 (6712) | 0.89 (2751) |
| move | move-impulse | 0.84 (7272) | 0.87 (4086) |
| move | move-swing | 0.87 (9172) | 0.86 (6634) |
| move | move-cont | 0.77 (9387) | 1.03 (832) |
| rsi | rsi-extreme | 0.93 (3042) | 1.10 (1012) |
| rsi | rsi-mid | 0.82 (7219) | 0.77 (6609) |
| rsi | rsi-fast | 0.90 (3371) | 1.00 (860) |
| rsi | rsi-div | 0.91 (3100) | 0.92 (285) |
| bollinger | bb-bounce | 0.92 (6253) | 1.08 (1853) |
| bollinger | bb-walk | 0.93 (4379) | 1.30 (368) |
| bollinger | bb-mid | 0.79 (7126) | 0.89 (2483) |
| bollinger | bb-wick | 0.78 (7874) | 0.96 (3598) |
| sar | sar-std | 0.88 (8056) | 0.93 (6423) |
| sar | sar-fast | 0.81 (9614) | 0.85 (7540) |
| sar | sar-flip | 0.88 (8056) | 0.94 (2938) |
| macd | macd-cross | 0.92 (6986) | 0.87 (1822) |
| macd | macd-hist | 0.83 (9298) | 0.88 (7023) |
| macd | macd-zero | 0.87 (4213) | 0.79 (3431) |
| ema | ema-21-55 | 0.83 (2466) | 0.81 (1898) |
| ema | ema-pullback | 0.88 (6926) | 0.86 (1690) |
| ema | ema-slope | 0.86 (3997) | 0.85 (3541) |
| ema | ema-stoch | 0.79 (6552) | 0.89 (847) |
| trend | trend-ema-5-20 | 0.81 (6608) | 0.89 (6159) |
| trend | trend-ema-12-26 | 0.90 (6020) | 0.85 (5254) |
| trend | trend-ema-20-50 | 0.85 (4576) | 0.89 (3877) |
| trend | trend-ema-50-200 | 0.77 (2472) | 0.96 (1748) |
| trend | trend-adx-20 | 0.90 (4829) | 0.84 (3091) |
| trend | trend-adx-30 | 0.94 (2748) | 0.70 (990) |
| trend | trend-st-7-2 | 0.97 (5043) | 0.89 (4257) |
| trend | trend-st-14-4 | 0.83 (2516) | 0.86 (1666) |
| trend | trend-st-21-5 | 0.82 (1759) | 0.99 (1131) |
| break | break-don10 | 0.90 (7057) | 0.86 (4123) |
| break | break-don40 | 0.89 (4204) | 0.96 (1722) |
| break | break-don55 | 0.92 (3564) | 0.91 (1434) |
| break | break-vol-1.3 | 0.94 (3593) | 1.07 (1025) |
| break | break-vol-2 | 1.02 (2074) | 1.20 (412) |
| break | break-atr-0.9 | 0.84 (8797) | 0.93 (4122) |
| break | break-atr-1.5 | 1.03 (4124) | 1.07 (1352) |
| break | break-atr-2 | 1.09 (2208) | 1.05 (566) |
| active | act-burst-1.5 | 0.87 (7327) | 0.94 (3697) |
| active | act-burst-2.5 | 1.01 (3224) | 1.12 (871) |
| active | act-hf-5 | 0.85 (8421) | 0.90 (4511) |
| active | act-hf-8 | 0.89 (7913) | 0.94 (3824) |
| direction | dir-emax-5-13 | 0.89 (6516) | 0.81 (5572) |
| direction | dir-emax-12-26 | 0.87 (4213) | 0.79 (3431) |
| direction | dir-emax-20-50 | 0.85 (2956) | 0.84 (2033) |
| direction | dir-vwap-30 | 0.76 (5923) | 0.87 (5583) |
| direction | dir-vwap-120 | 0.91 (3042) | 0.84 (3030) |
| direction | dir-vwap-240 | 0.99 (2024) | 0.94 (2105) |
| direction | dir-thrust-4 | 0.83 (5967) | 0.92 (1135) |
| direction | dir-reclaim-50 | 0.80 (4891) | 0.72 (1568) |
| move | move-impulse-4-1.2 | 0.84 (7967) | 0.94 (5054) |
| move | move-impulse-10-2 | 0.79 (6614) | 0.80 (2903) |
| move | move-impulse-20-2.5 | 0.85 (5581) | 1.01 (2292) |
| move | move-swing-16 | 0.94 (8234) | 0.92 (5538) |
| move | move-swing-32 | 0.86 (7811) | 0.95 (4477) |
| rsi | rsi-14-25-75 | 1.03 (1508) | 1.20 (401) |
| rsi | rsi-14-20-80 | 1.01 (580) | 0.93 (145) |
| rsi | rsi-21-30-70 | 1.07 (1379) | 0.65 (396) |
| rsi | rsi-7-15-85 | 0.87 (1720) | 0.76 (299) |
| rsi | rsi-mom-10-25 | 0.91 (3051) | 1.15 (890) |
| rsi | rsi-mom-14-15 | 1.55 (175) | – |
| rsi | rsi-mom-14-20 | 1.01 (580) | 0.93 (145) |
| rsi | rsi-mom-14-25 | 1.03 (1508) | 1.20 (401) |
| rsi | rsi-mom-21-15 | – | – |
| rsi | rsi-mom-21-20 | 1.45 (173) | – |
| rsi | rsi-mom-21-25 | 1.17 (524) | 0.87 (146) |
| rsi | rsi-mid-60-40 | 0.91 (6825) | 0.78 (4076) |
| rsi | rsi-mid-52-48 | 0.85 (6670) | 0.87 (6198) |
| bollinger | bb-bounce-20-2.5 | 0.95 (4057) | 0.94 (554) |
| bollinger | bb-bounce-20-3 | 1.07 (1684) | 1.23 (109) |
| bollinger | bb-bounce-50-2 | 0.92 (4196) | 1.09 (1493) |
| bollinger | bb-walk-50 | 0.89 (3202) | 1.17 (845) |
| sar | sar-0.01 | 0.91 (6343) | 0.74 (4997) |
| sar | sar-0.03 | 0.82 (8979) | 0.92 (7058) |
| macd | macd-cross-5-35-5 | 0.79 (9174) | 0.80 (4451) |
| macd | macd-hist-5-35-5 | 0.79 (9174) | 0.85 (7558) |
| macd | macd-cross-8-21-5 | 0.79 (8963) | 0.85 (3816) |
| macd | macd-hist-8-21-5 | 0.79 (8963) | 0.89 (7216) |
| macd | macd-cross-19-39-9 | 0.94 (6018) | 0.90 (1165) |
| macd | macd-hist-19-39-9 | 0.79 (6082) | 0.89 (5025) |
| ema | ema-9-21 | 0.75 (4739) | 0.79 (4102) |
| ema | ema-50-100 | 0.80 (1399) | 0.84 (947) |
| ema | ema-slope-20 | 0.76 (5561) | 0.84 (4946) |
| ema | ema-slope-100 | 0.82 (2820) | 0.87 (2499) |
| ema | ema-pullback-50 | 0.91 (5005) | 0.95 (615) |
| osc | cci-14-100 | 0.92 (8350) | 0.90 (4896) |
| osc | cci-14-200 | 0.93 (4811) | 1.21 (422) |
| osc | cci-20-100 | 0.95 (7684) | 0.88 (4505) |
| osc | cci-20-200 | 0.95 (4446) | 1.07 (548) |
| osc | cci-40-100 | 0.88 (6082) | 1.03 (3338) |
| osc | cci-40-200 | 0.92 (2983) | 1.13 (652) |
| osc | willr-14-80 | 0.94 (8483) | 0.93 (5141) |
| osc | willr-14-90 | 0.93 (7210) | 0.97 (2919) |
| osc | willr-28-80 | 0.89 (7412) | 0.99 (4151) |
| osc | willr-28-90 | 0.87 (6326) | 1.00 (2557) |
| osc | srsi-14-10 | 0.88 (7535) | 0.87 (2153) |
| osc | srsi-14-20 | 0.87 (8021) | 0.87 (3912) |
| osc | z-20-2 | 0.92 (6253) | 1.08 (1853) |
| osc | z-20-2.5 | 0.95 (4057) | 0.94 (554) |
| osc | z-50-2 | 0.92 (4196) | 1.09 (1493) |
| osc | z-50-2.5 | 0.87 (2662) | 1.21 (653) |
| volume | mfi-14-20 | 0.95 (3330) | 1.36 (599) |
| volume | mfi-14-10 | 1.10 (1118) | – |
| volume | obv-20 | 0.86 (7009) | 0.79 (6293) |
| volume | obv-50 | 0.79 (4562) | 0.84 (4845) |
| volume | cmf-20-0.05 | 0.78 (6732) | 0.88 (4892) |
| volume | cmf-20-0.1 | 0.79 (6638) | 0.88 (3311) |
| channel | kelt-20-1.5 | 0.90 (5272) | 1.00 (2422) |
| channel | kelt-20-2 | 0.95 (3729) | 1.03 (1401) |
| channel | kelt-20-2.5 | 0.96 (2417) | 1.34 (800) |
| channel | squeeze-20 | 0.92 (3664) | 0.90 (417) |
| channel | squeeze-30 | 0.82 (1543) | – |
| channel | aroon-14 | 0.96 (7695) | 1.06 (3441) |
| channel | aroon-25 | 0.78 (6953) | 0.85 (2279) |
| ichimoku | ichi-tk-9 | 0.77 (5587) | 0.76 (4287) |
| ichimoku | ichi-cloud-9 | 0.84 (5130) | 0.79 (3110) |
| ichimoku | ichi-tk-20 | 0.72 (3175) | 0.90 (2268) |
| ichimoku | ichi-cloud-20 | 0.81 (3128) | 0.88 (1806) |
| smooth | hma-16 | 0.83 (8884) | 0.85 (8098) |
| smooth | hma-32 | 0.80 (7192) | 0.82 (5868) |
| smooth | hma-55 | 0.76 (5780) | 0.91 (4526) |
| smooth | trix-9 | 0.78 (5130) | 0.77 (4215) |
| smooth | trix-15 | 0.86 (3663) | 0.79 (2639) |
| smooth | kama-10 | 0.95 (7239) | 0.79 (7071) |
| smooth | kama-20 | 0.77 (6266) | 0.87 (5904) |
| smooth | ha-1 | 0.76 (9490) | 0.86 (8979) |
| smooth | ha-3 | 0.84 (9638) | 0.87 (5623) |