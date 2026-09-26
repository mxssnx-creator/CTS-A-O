# Indications × timeframes — independent and combined

39 symbols · 365.0 days of real BingX 60m data (2024-09-26 → 2025-09-26) · half A → 2025-03-28 selects, half B validates · cost 0.2% round trip · 147 indications × follow/revert × 6 protects per timeframe · combined = the same indication agrees on the higher timeframe(s): 60m → 240m

## Pooled (every indication × bot × protect; no selection)

| timeframe | mode | variants | pass both halves (PF ≥ 1.1, ≥ 60 trades) | pooled PF A | pooled PF B | trades/day per variant |
|---|---|---:|---:|---:|---:|---:|
| 60m | independent | 1764 | 27 | 0.89 | 0.87 | 29.34 |
| 60m | combined | 1764 | 93 | 0.89 | 0.87 | 15.89 |

## Both-halves survivors (120)

| tf | mode | combo | TP | SL | hold (bars) | A n | A PF | B n | B PF | B trades/day | green hours B |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 60m | combined | revert·cci-20-200 | 8.32% | 8.32% | 16 | 437 | 1.55 | 402 | 1.67 | 2.20 | 52% |
| 60m | combined | revert·cci-20-200 | 8.32% | 16.64% | 16 | 436 | 1.51 | 402 | 1.60 | 2.20 | 53% |
| 60m | combined | follow·break-vol-2 | 8.32% | 8.32% | 16 | 682 | 1.47 | 384 | 1.45 | 2.10 | 48% |
| 60m | combined | revert·cci-20-200 | 5.20% | 5.20% | 16 | 439 | 1.61 | 405 | 1.44 | 2.22 | 51% |
| 60m | combined | follow·break-vol-2 | 5.20% | 5.20% | 16 | 701 | 1.52 | 404 | 1.43 | 2.21 | 52% |
| 60m | combined | revert·bb-bounce-20-2.5 | 8.32% | 8.32% | 16 | 420 | 1.40 | 372 | 1.65 | 2.04 | 51% |
| 60m | combined | revert·z-20-2.5 | 8.32% | 8.32% | 16 | 420 | 1.40 | 372 | 1.65 | 2.04 | 51% |
| 60m | combined | follow·bb-walk | 8.32% | 8.32% | 16 | 369 | 1.50 | 291 | 1.40 | 1.59 | 50% |
| 60m | combined | follow·break-vol-2 | 5.20% | 10.40% | 16 | 700 | 1.40 | 404 | 1.53 | 2.21 | 56% |
| 60m | combined | follow·break-vol-2 | 8.32% | 16.64% | 16 | 680 | 1.43 | 384 | 1.40 | 2.10 | 49% |
| 60m | combined | revert·cci-20-200 | 5.20% | 10.40% | 16 | 439 | 1.49 | 405 | 1.39 | 2.22 | 56% |
| 60m | independent | follow·rsi-mom-21-20 | 8.32% | 8.32% | 16 | 120 | 1.38 | 140 | 1.52 | 0.77 | 50% |
| 60m | combined | follow·break-vol | 5.20% | 5.20% | 16 | 1126 | 1.38 | 756 | 1.36 | 4.14 | 51% |
| 60m | combined | follow·bb-walk | 5.20% | 5.20% | 16 | 373 | 1.44 | 296 | 1.36 | 1.62 | 53% |
| 60m | combined | revert·bb-bounce-20-2.5 | 5.20% | 5.20% | 16 | 427 | 1.35 | 373 | 1.59 | 2.04 | 56% |
| 60m | combined | revert·z-20-2.5 | 5.20% | 5.20% | 16 | 427 | 1.35 | 373 | 1.59 | 2.04 | 56% |
| 60m | combined | follow·bb-walk | 8.32% | 16.64% | 16 | 369 | 1.34 | 291 | 1.37 | 1.59 | 52% |
| 60m | combined | revert·cci-40-200 | 8.32% | 8.32% | 16 | 536 | 1.34 | 474 | 1.88 | 2.60 | 54% |
| 60m | combined | follow·break-vol | 5.20% | 10.40% | 16 | 1119 | 1.34 | 755 | 1.41 | 4.14 | 56% |
| 60m | combined | follow·break-vol | 8.32% | 8.32% | 16 | 1078 | 1.32 | 728 | 1.45 | 3.99 | 50% |
| 60m | combined | follow·break-vol | 8.32% | 16.64% | 16 | 1072 | 1.32 | 727 | 1.39 | 3.98 | 51% |
| 60m | combined | follow·break-vol-2 | 3.12% | 3.12% | 16 | 711 | 1.32 | 411 | 1.33 | 2.25 | 52% |
| 60m | independent | follow·rsi-mom-14-15 | 8.32% | 8.32% | 16 | 127 | 1.31 | 142 | 2.03 | 0.78 | 55% |
| 60m | combined | follow·break-vol-2 | 3.12% | 6.24% | 16 | 711 | 1.31 | 411 | 1.30 | 2.25 | 58% |
| 60m | combined | revert·bb-bounce-20-2.5 | 8.32% | 16.64% | 16 | 419 | 1.29 | 372 | 1.59 | 2.04 | 53% |
| 60m | combined | revert·z-20-2.5 | 8.32% | 16.64% | 16 | 419 | 1.29 | 372 | 1.59 | 2.04 | 53% |
| 60m | independent | follow·rsi-mom-21-20 | 5.20% | 10.40% | 16 | 124 | 1.32 | 149 | 1.28 | 0.82 | 58% |
| 60m | combined | follow·act-burst-2.5 | 8.32% | 16.64% | 16 | 678 | 1.28 | 674 | 1.29 | 3.69 | 52% |
| 60m | combined | follow·bb-walk | 3.12% | 3.12% | 16 | 375 | 1.28 | 305 | 1.35 | 1.67 | 55% |
| 60m | independent | follow·rsi-mom-21-20 | 5.20% | 5.20% | 16 | 124 | 1.27 | 149 | 1.74 | 0.82 | 56% |
| 60m | independent | follow·rsi-mom-21-20 | 3.12% | 3.12% | 16 | 132 | 1.26 | 157 | 1.70 | 0.86 | 60% |
| 60m | combined | follow·squeeze-20 | 8.32% | 8.32% | 16 | 367 | 1.26 | 364 | 1.61 | 1.99 | 56% |
| 60m | combined | follow·squeeze-20 | 5.20% | 5.20% | 16 | 369 | 1.26 | 366 | 1.44 | 2.01 | 56% |
| 60m | combined | follow·squeeze-20 | 3.12% | 6.24% | 16 | 371 | 1.29 | 369 | 1.25 | 2.02 | 60% |
| 60m | independent | follow·rsi-mom-21-20 | 8.32% | 16.64% | 16 | 120 | 1.33 | 140 | 1.25 | 0.77 | 51% |
| 60m | combined | follow·bb-walk | 5.20% | 10.40% | 16 | 373 | 1.40 | 296 | 1.25 | 1.62 | 58% |
| 60m | combined | revert·cci-40-200 | 5.20% | 5.20% | 16 | 563 | 1.25 | 484 | 1.71 | 2.65 | 54% |
| 60m | combined | revert·cci-20-200 | 3.12% | 6.24% | 16 | 445 | 1.30 | 410 | 1.24 | 2.25 | 58% |
| 60m | combined | revert·cci-14-200 | 8.32% | 8.32% | 16 | 323 | 1.98 | 295 | 1.24 | 1.62 | 48% |
| 60m | combined | follow·squeeze-20 | 8.32% | 16.64% | 16 | 367 | 1.23 | 364 | 1.56 | 1.99 | 56% |
| 60m | combined | follow·act-burst-2.5 | 5.20% | 5.20% | 16 | 720 | 1.23 | 720 | 1.39 | 3.95 | 52% |
| 60m | combined | follow·bb-walk | 3.12% | 6.24% | 16 | 374 | 1.26 | 304 | 1.22 | 1.67 | 62% |
| 60m | combined | revert·bb-bounce-20-2.5 | 3.12% | 3.12% | 16 | 440 | 1.22 | 375 | 1.22 | 2.05 | 48% |
| 60m | combined | revert·z-20-2.5 | 3.12% | 3.12% | 16 | 440 | 1.22 | 375 | 1.22 | 2.05 | 48% |
| 60m | independent | follow·rsi-mom-14-15 | 5.20% | 10.40% | 16 | 135 | 1.21 | 150 | 1.83 | 0.82 | 61% |
| 60m | combined | revert·cci-20-200 | 3.12% | 3.12% | 16 | 446 | 1.35 | 411 | 1.21 | 2.25 | 49% |
| 60m | combined | follow·act-burst-2.5 | 3.12% | 6.24% | 16 | 723 | 1.21 | 738 | 1.31 | 4.04 | 61% |
| 60m | combined | follow·break-vol-1.3 | 5.20% | 5.20% | 16 | 1529 | 1.27 | 1216 | 1.21 | 6.66 | 49% |
| 60m | independent | follow·rsi-mom-14-15 | 8.32% | 16.64% | 16 | 127 | 1.21 | 142 | 1.78 | 0.78 | 56% |
| 60m | combined | follow·break-atr-1.5 | 8.32% | 16.64% | 16 | 1108 | 1.21 | 1168 | 1.24 | 6.40 | 55% |
| 60m | combined | follow·squeeze-20 | 5.20% | 10.40% | 16 | 368 | 1.20 | 364 | 1.48 | 1.99 | 57% |
| 60m | combined | follow·break-vol-1.3 | 5.20% | 10.40% | 16 | 1522 | 1.22 | 1214 | 1.20 | 6.65 | 55% |
| 60m | combined | follow·macd-cross | 5.20% | 10.40% | 16 | 1588 | 1.20 | 1820 | 1.31 | 9.97 | 52% |
| 60m | combined | follow·act-burst-2.5 | 3.12% | 3.12% | 16 | 728 | 1.20 | 744 | 1.27 | 4.08 | 53% |
| 60m | combined | follow·break-vol | 3.12% | 6.24% | 16 | 1155 | 1.20 | 775 | 1.25 | 4.25 | 58% |
| 60m | combined | revert·act-chop | 3.12% | 6.24% | 16 | 87 | 1.19 | 72 | 1.63 | 0.39 | 67% |
| 60m | combined | follow·act-burst-2.5 | 5.20% | 10.40% | 16 | 706 | 1.19 | 709 | 1.39 | 3.88 | 59% |
| 60m | combined | follow·macd-cross | 8.32% | 16.64% | 16 | 1570 | 1.19 | 1806 | 1.33 | 9.90 | 51% |
| 60m | combined | revert·cci-40-200 | 5.20% | 10.40% | 16 | 563 | 1.19 | 484 | 1.77 | 2.65 | 59% |
| 60m | independent | revert·rsi-14-20-80 | 8.32% | 8.32% | 16 | 507 | 1.25 | 572 | 1.18 | 3.13 | 48% |

## Every indication, one by one: best variant on A → half-B PF (trades in B)

| kind | indication | 60m | 60m comb. |
|---|---|---:|---:|
| trend | trend-ema | 0.87 (5978) | 0.86 (5382) |
| trend | trend-adx | 0.65 (3711) | 0.84 (1925) |
| trend | trend-st | 1.03 (3245) | 0.95 (2419) |
| trend | trend-ribbon | 0.81 (3736) | 0.89 (2959) |
| break | break-don20 | 0.81 (5874) | 0.97 (2493) |
| break | break-vol | 0.97 (3093) | 1.36 (756) |
| break | break-atr | 0.98 (5745) | 1.19 (2314) |
| break | break-squeeze | 0.78 (2420) | 1.38 (207) |
| break | break-retest | 1.04 (5021) | 0.86 (774) |
| break | break-fail | 1.02 (6348) | 0.93 (2797) |
| active | act-burst | 0.98 (5474) | 1.11 (2044) |
| active | act-shift | 1.10 (2158) | 0.78 (381) |
| active | act-hf | 0.96 (8710) | 0.98 (5128) |
| active | act-chop | 1.05 (2008) | 1.63 (72) |
| direction | dir-emax | 0.74 (4243) | 0.90 (3670) |
| direction | dir-st | 0.89 (4758) | 0.78 (3879) |
| direction | dir-vwap | 0.77 (3894) | 0.85 (3816) |
| direction | dir-macd | 0.79 (7111) | 0.92 (5649) |
| direction | dir-thrust | 0.90 (8134) | 0.98 (4284) |
| direction | dir-reclaim | 0.88 (6205) | 0.96 (2306) |
| move | move-impulse | 0.87 (6922) | 0.89 (4344) |
| move | move-swing | 0.91 (8711) | 0.99 (6566) |
| move | move-cont | 0.96 (8446) | 0.75 (718) |
| rsi | rsi-extreme | 0.93 (3181) | 1.19 (1089) |
| rsi | rsi-mid | 0.88 (6740) | 0.82 (5498) |
| rsi | rsi-fast | 1.01 (3508) | 1.17 (848) |
| rsi | rsi-div | 0.71 (3416) | 0.98 (261) |
| bollinger | bb-bounce | 0.94 (6731) | 1.12 (1724) |
| bollinger | bb-walk | 0.99 (4454) | 1.40 (291) |
| bollinger | bb-mid | 0.85 (6719) | 1.06 (1922) |
| bollinger | bb-wick | 1.00 (8292) | 1.00 (2829) |
| sar | sar-std | 0.95 (7612) | 0.93 (6233) |
| sar | sar-fast | 0.89 (8153) | 0.99 (7350) |
| sar | sar-flip | 0.95 (7612) | 1.08 (3138) |
| macd | macd-cross | 0.79 (7110) | 1.33 (1806) |
| macd | macd-hist | 0.84 (10495) | 0.97 (6798) |
| macd | macd-zero | 0.71 (3720) | 0.92 (3050) |
| ema | ema-21-55 | 0.98 (2377) | 1.00 (1846) |
| ema | ema-pullback | 0.99 (6436) | 0.73 (1350) |
| ema | ema-slope | 0.69 (3527) | 1.00 (3175) |
| ema | ema-stoch | 0.75 (5656) | 1.04 (813) |
| trend | trend-ema-5-20 | 0.93 (6112) | 0.81 (5677) |
| trend | trend-ema-12-26 | 0.94 (5749) | 0.82 (4853) |
| trend | trend-ema-20-50 | 0.74 (4122) | 0.81 (3537) |
| trend | trend-ema-50-200 | 0.97 (2350) | 0.86 (1692) |
| trend | trend-adx-20 | 0.71 (4489) | 0.89 (3079) |
| trend | trend-adx-30 | 0.67 (2821) | 0.94 (1059) |
| trend | trend-st-7-2 | 0.89 (4758) | 0.78 (3879) |
| trend | trend-st-14-4 | 0.80 (2380) | 1.07 (1624) |
| trend | trend-st-21-5 | 1.12 (1752) | 1.20 (1163) |
| break | break-don10 | 0.88 (6884) | 0.90 (4198) |
| break | break-don40 | 0.90 (4383) | 1.05 (1762) |
| break | break-don55 | 0.94 (3731) | 1.04 (1476) |
| break | break-vol-1.3 | 0.96 (4175) | 1.21 (1216) |
| break | break-vol-2 | 0.97 (2188) | 1.45 (384) |
| break | break-atr-0.9 | 0.84 (7692) | 1.10 (3856) |
| break | break-atr-1.5 | 1.01 (3746) | 1.24 (1168) |
| break | break-atr-2 | 1.04 (1911) | 1.07 (499) |
| active | act-burst-1.5 | 0.84 (7270) | 1.00 (3424) |
| active | act-burst-2.5 | 1.14 (2663) | 1.29 (674) |
| active | act-hf-5 | 0.91 (8364) | 0.92 (4543) |
| active | act-hf-8 | 0.92 (7570) | 0.97 (4037) |
| direction | dir-emax-5-13 | 0.82 (5718) | 0.84 (5121) |
| direction | dir-emax-12-26 | 0.71 (3720) | 0.92 (3050) |
| direction | dir-emax-20-50 | 1.00 (2483) | 1.02 (1949) |
| direction | dir-vwap-30 | 0.86 (5361) | 0.74 (5073) |
| direction | dir-vwap-120 | 0.96 (2640) | 0.95 (2783) |
| direction | dir-vwap-240 | 1.02 (1846) | 0.90 (2041) |
| direction | dir-thrust-4 | 0.90 (6050) | 0.89 (1449) |
| direction | dir-reclaim-50 | 0.75 (4356) | 1.07 (1237) |
| move | move-impulse-4-1.2 | 0.92 (7608) | 0.97 (5194) |
| move | move-impulse-10-2 | 0.95 (5984) | 1.08 (2957) |
| move | move-impulse-20-2.5 | 0.97 (5159) | 0.80 (2276) |
| move | move-swing-16 | 0.94 (7896) | 0.95 (5503) |
| move | move-swing-32 | 1.00 (6729) | 1.04 (4230) |
| rsi | rsi-14-25-75 | 1.03 (1573) | 0.59 (422) |
| rsi | rsi-14-20-80 | 1.18 (572) | 0.91 (125) |
| rsi | rsi-21-30-70 | 1.06 (1464) | 0.69 (457) |
| rsi | rsi-7-15-85 | 1.09 (1624) | 0.57 (302) |
| rsi | rsi-mom-10-25 | 0.98 (3169) | 1.30 (945) |
| rsi | rsi-mom-14-15 | 0.36 (134) | – |
| rsi | rsi-mom-14-20 | 1.18 (572) | 0.91 (125) |
| rsi | rsi-mom-14-25 | 1.03 (1573) | 0.59 (422) |
| rsi | rsi-mom-21-15 | – | – |
| rsi | rsi-mom-21-20 | 0.44 (130) | – |
| rsi | rsi-mom-21-25 | 1.35 (515) | 0.98 (123) |
| rsi | rsi-mid-60-40 | 0.84 (6655) | 0.94 (3960) |
| rsi | rsi-mid-52-48 | 0.87 (6152) | 0.94 (5803) |
| bollinger | bb-bounce-20-2.5 | 1.02 (4050) | 1.65 (372) |
| bollinger | bb-bounce-20-3 | 1.12 (1447) | 0.83 (50) |
| bollinger | bb-bounce-50-2 | 0.93 (4050) | 1.28 (1354) |
| bollinger | bb-walk-50 | 0.97 (3350) | 1.11 (807) |
| sar | sar-0.01 | 0.87 (6359) | 0.91 (4805) |
| sar | sar-0.03 | 0.87 (8643) | 0.98 (6899) |
| macd | macd-cross-5-35-5 | 0.79 (8690) | 1.08 (4075) |
| macd | macd-hist-5-35-5 | 0.79 (8690) | 1.02 (7131) |
| macd | macd-cross-8-21-5 | 0.81 (8565) | 1.06 (3462) |
| macd | macd-hist-8-21-5 | 0.81 (8565) | 1.03 (6998) |
| macd | macd-cross-19-39-9 | 0.94 (5593) | 1.02 (1055) |
| macd | macd-hist-19-39-9 | 0.94 (5594) | 0.99 (4971) |
| ema | ema-9-21 | 0.74 (4243) | 0.90 (3670) |
| ema | ema-50-100 | 1.11 (1326) | 1.06 (949) |
| ema | ema-slope-20 | 0.72 (5014) | 0.84 (4520) |
| ema | ema-slope-100 | 0.99 (2608) | 1.06 (2371) |
| ema | ema-pullback-50 | 0.99 (4485) | 0.74 (466) |
| osc | cci-14-100 | 0.84 (7993) | 0.92 (4802) |
| osc | cci-14-200 | 0.99 (4860) | 1.24 (295) |
| osc | cci-20-100 | 0.95 (8153) | 0.94 (4339) |
| osc | cci-20-200 | 1.04 (4513) | 1.67 (402) |
| osc | cci-40-100 | 1.00 (5876) | 1.04 (3222) |
| osc | cci-40-200 | 1.02 (2866) | 1.88 (474) |
| osc | willr-14-80 | 0.94 (8180) | 0.96 (5205) |
| osc | willr-14-90 | 0.81 (7368) | 1.00 (3235) |
| osc | willr-28-80 | 1.04 (7195) | 1.07 (4054) |
| osc | willr-28-90 | 1.04 (6482) | 1.12 (2653) |
| osc | srsi-14-10 | 0.85 (8538) | 1.06 (2389) |
| osc | srsi-14-20 | 0.89 (8586) | 1.02 (4207) |
| osc | z-20-2 | 0.94 (6731) | 1.12 (1724) |
| osc | z-20-2.5 | 1.02 (4050) | 1.65 (372) |
| osc | z-50-2 | 0.93 (4050) | 1.28 (1354) |
| osc | z-50-2.5 | 1.04 (2568) | 1.34 (484) |
| volume | mfi-14-20 | 1.15 (2975) | 0.98 (360) |
| volume | mfi-14-10 | 1.49 (671) | – |
| volume | obv-20 | 0.86 (6395) | 0.87 (6349) |
| volume | obv-50 | 0.94 (4385) | 0.93 (4542) |
| volume | cmf-20-0.05 | 0.87 (6465) | 0.85 (4698) |
| volume | cmf-20-0.1 | 0.80 (6437) | 0.83 (3143) |
| channel | kelt-20-1.5 | 0.79 (5218) | 1.11 (2532) |
| channel | kelt-20-2 | 1.01 (3756) | 1.27 (1392) |
| channel | kelt-20-2.5 | 1.04 (2474) | 1.39 (785) |
| channel | squeeze-20 | 1.05 (3705) | 1.61 (364) |
| channel | squeeze-30 | 1.05 (1260) | – |
| channel | aroon-14 | 0.86 (7380) | 0.99 (3414) |
| channel | aroon-25 | 0.79 (6060) | 0.75 (2049) |
| ichimoku | ichi-tk-9 | 0.81 (5092) | 0.92 (3938) |
| ichimoku | ichi-cloud-9 | 0.91 (4353) | 1.00 (2935) |
| ichimoku | ichi-tk-20 | 0.79 (3173) | 0.95 (2077) |
| ichimoku | ichi-cloud-20 | 0.84 (2778) | 0.92 (1648) |
| smooth | hma-16 | 0.82 (8677) | 1.03 (7147) |
| smooth | hma-32 | 0.91 (6561) | 0.90 (5494) |
| smooth | hma-55 | 0.80 (5027) | 0.89 (4070) |
| smooth | trix-9 | 0.75 (4474) | 0.93 (3694) |
| smooth | trix-15 | 1.04 (3683) | 0.74 (2428) |
| smooth | kama-10 | 0.97 (6855) | 0.89 (6677) |
| smooth | kama-20 | 0.84 (6209) | 0.97 (5642) |
| smooth | ha-1 | 1.00 (9023) | 0.97 (8524) |
| smooth | ha-3 | 0.89 (8589) | 0.98 (5663) |