# Indication adjustments — 60m

40 symbols · 365 days of real BingX data · half A → 2026-03-28 (select) · half B → 2026-09-26 (validate) · cost 0.2% round trip · 98 indications × follow/revert × 17 filters × 2 protects (TP 5.2% SL 7.8% hold 8; TP 7.0% SL 17.5% hold 24)

**Both-halves survivors** (PF ≥ 1.1 in A and B, ≥ 30 trades each): 22 of 6664.

## Filter robustness (vs the same indication × bot × protect without filter)

| filter | compared | better in both halves | pooled PF A | pooled PF B | plain PF B | trades kept (B) |
|---|---:|---:|---:|---:|---:|---:|
| btcAgainst | 392 | 38.0% | 0.85 | 0.86 | 0.84 | 64.9% |
| slope50 | 392 | 36.2% | 0.89 | 0.86 | 0.84 | 65.6% |
| adx25 | 392 | 33.9% | 0.85 | 0.85 | 0.84 | 45.1% |
| volHi | 392 | 33.9% | 0.87 | 0.86 | 0.84 | 52.4% |
| adx20 | 392 | 29.6% | 0.85 | 0.84 | 0.84 | 66.5% |
| euUs | 392 | 29.3% | 0.86 | 0.85 | 0.84 | 69.2% |
| htf | 392 | 27.0% | 0.85 | 0.87 | 0.84 | 64.5% |
| volume | 392 | 24.7% | 0.86 | 0.84 | 0.84 | 30.4% |
| asia | 392 | 24.5% | 0.86 | 0.84 | 0.84 | 52.9% |
| adxLo20 | 392 | 23.2% | 0.86 | 0.84 | 0.84 | 42.7% |
| stretch2 | 392 | 21.2% | 0.85 | 0.83 | 0.84 | 74.2% |
| htfAgainst | 392 | 20.2% | 0.86 | 0.82 | 0.84 | 64.3% |
| quiet | 392 | 18.6% | 0.85 | 0.84 | 0.84 | 65.4% |
| btc | 392 | 16.6% | 0.86 | 0.83 | 0.84 | 64.9% |
| volLo | 392 | 13.3% | 0.84 | 0.82 | 0.84 | 55.6% |
| rsiRoom | 392 | 9.2% | 0.84 | 0.83 | 0.84 | 90.7% |

## Survivors

| combo | filter | protect | A n | A PF | B n | B PF | B net % |
|---|---|---:|---:|---:|---:|---:|---:|
| revert·rsi-14-20-80 | euUs | 1 | 497 | 1.29 | 400 | 1.39 | 272.22 |
| revert·rsi-14-20-80 | btcAgainst | 0 | 56 | 1.27 | 87 | 1.26 | 29.32 |
| revert·rsi-14-25-75 | euUs | 1 | 1186 | 1.21 | 1042 | 1.22 | 369.58 |
| revert·rsi-14-25-75 | volume | 1 | 959 | 1.20 | 681 | 1.21 | 230.72 |
| revert·rsi-21-30-70 | volume | 1 | 908 | 1.21 | 619 | 1.19 | 195.88 |
| revert·rsi-14-20-80 | adx25 | 1 | 644 | 1.31 | 527 | 1.18 | 195.46 |
| revert·rsi-14-20-80 | btc | 1 | 676 | 1.24 | 518 | 1.16 | 167.53 |
| revert·rsi-14-20-80 | volHi | 1 | 531 | 1.28 | 469 | 1.14 | 142.64 |
| revert·rsi-14-20-80 | adx20 | 1 | 696 | 1.24 | 565 | 1.14 | 160.05 |
| revert·rsi-14-25-75 | adx25 | 1 | 1280 | 1.14 | 1200 | 1.16 | 339.33 |
| revert·rsi-14-25-75 | adx20 | 1 | 1463 | 1.13 | 1361 | 1.13 | 308.36 |
| revert·rsi-14-20-80 | none | 1 | 709 | 1.24 | 578 | 1.12 | 146.88 |
| revert·rsi-14-20-80 | quiet | 1 | 151 | 1.15 | 200 | 1.12 | 51.87 |
| revert·rsi-14-20-80 | slope50 | 1 | 697 | 1.26 | 575 | 1.12 | 143.14 |
| revert·rsi-14-25-75 | volHi | 1 | 993 | 1.12 | 1044 | 1.21 | 382.69 |
| revert·rsi-14-20-80 | htf | 1 | 691 | 1.26 | 577 | 1.12 | 142.04 |
| revert·rsi-21-30-70 | euUs | 1 | 1135 | 1.12 | 935 | 1.29 | 447.30 |
| revert·rsi-14-20-80 | btcAgainst | 1 | 51 | 1.35 | 80 | 1.11 | 19.16 |
| revert·rsi-14-25-75 | htf | 1 | 1467 | 1.15 | 1407 | 1.11 | 273.80 |
| follow·break-atr-2 | adx25 | 1 | 987 | 1.29 | 1039 | 1.11 | 205.30 |
| revert·bb-bounce-20-3 | volHi | 1 | 897 | 1.11 | 938 | 1.12 | 204.71 |
| revert·rsi-14-25-75 | btc | 1 | 1469 | 1.16 | 1297 | 1.10 | 228.12 |

## Every indication: best filter × protect chosen on A → B (plain = best unfiltered on A)

| kind | indication | bot | filter | A PF (n) | B PF (n) | plain A PF | plain B PF |
|---|---|---|---|---:|---:|---:|---:|
| break | break-don40 | revert | slope50 | 1.03 (556) | 1.20 (559) | 0.77 | 0.91 |
| rsi | rsi-21-30-70 | revert | volume | 1.21 (908) | 1.19 (619) | 1.08 | 1.10 |
| break | break-atr-2 | follow | adx25 | 1.29 (987) | 1.11 (1039) | 1.10 | 0.90 |
| rsi | rsi-14-25-75 | revert | slope50 | 1.17 (1488) | 1.10 (1425) | 1.14 | 1.10 |
| break | break-vol-2 | follow | volHi | 1.14 (1263) | 1.10 (1107) | 0.96 | 0.82 |
| rsi | rsi-14-20-80 | revert | volume | 1.46 (485) | 1.08 (283) | 1.24 | 1.12 |
| direction | dir-vwap | revert | adx20 | 0.97 (2010) | 1.08 (2025) | 0.95 | 0.99 |
| trend | trend-st-14-4 | revert | btc | 0.93 (636) | 1.07 (672) | 0.77 | 0.92 |
| active | act-shift | revert | btc | 1.17 (1463) | 1.05 (1415) | 0.99 | 0.79 |
| break | break-vol | follow | volHi | 1.08 (1547) | 1.04 (1481) | 0.95 | 0.94 |
| direction | dir-macd | revert | adx20 | 1.05 (4017) | 1.02 (4047) | 0.99 | 0.97 |
| macd | macd-cross | revert | adx20 | 1.05 (4012) | 1.02 (4047) | 1.00 | 0.97 |
| break | break-atr-1.5 | follow | adx25 | 1.22 (1756) | 1.00 (1836) | 1.02 | 0.82 |
| rsi | rsi-fast | follow | slope50 | 0.95 (755) | 0.99 (661) | 0.82 | 0.88 |
| ema | ema-slope | revert | htfAgainst | 1.06 (2398) | 0.98 (2472) | 0.92 | 0.78 |
| rsi | rsi-extreme | revert | volume | 1.10 (1633) | 0.97 (1269) | 1.01 | 0.96 |
| break | break-don55 | revert | slope50 | 1.36 (195) | 0.97 (198) | 0.79 | 0.86 |
| break | break-don55 | follow | adx25 | 1.08 (1639) | 0.97 (1726) | 1.00 | 0.87 |
| direction | dir-vwap-120 | follow | asia | 1.07 (1316) | 0.97 (1636) | 0.88 | 0.78 |
| move | move-impulse | revert | euUs | 1.00 (4702) | 0.97 (4589) | 0.90 | 0.85 |
| move | move-swing-32 | follow | volHi | 1.12 (2713) | 0.96 (3135) | 0.96 | 0.81 |
| trend | trend-st-21-5 | revert | quiet | 1.08 (533) | 0.96 (718) | 0.71 | 0.84 |
| macd | macd-zero | revert | htfAgainst | 1.04 (2340) | 0.96 (2445) | 0.91 | 0.78 |
| direction | dir-emax-12-26 | revert | htfAgainst | 1.04 (2340) | 0.96 (2445) | 0.91 | 0.78 |
| break | break-don10 | revert | slope50 | 0.94 (3795) | 0.95 (3747) | 0.86 | 0.97 |
| active | act-burst | revert | stretch2 | 1.17 (3618) | 0.95 (3586) | 1.05 | 0.89 |
| bollinger | bb-bounce | follow | slope50 | 0.91 (2496) | 0.95 (2575) | 0.90 | 0.90 |
| trend | trend-st | revert | htfAgainst | 1.01 (1819) | 0.94 (1998) | 0.88 | 0.95 |
| break | break-vol-1.3 | revert | slope50 | 1.00 (1383) | 0.94 (1056) | 0.88 | 0.80 |
| ema | ema-stoch | follow | volume | 1.09 (1483) | 0.94 (1390) | 0.92 | 0.92 |
| trend | trend-ema-5-20 | revert | adxLo20 | 0.94 (2871) | 0.93 (2899) | 0.91 | 0.96 |
| rsi | rsi-mid-52-48 | revert | volume | 0.96 (2252) | 0.93 (2042) | 0.92 | 0.98 |
| active | act-hf | follow | volHi | 1.06 (3697) | 0.92 (4062) | 0.94 | 0.91 |
| ema | ema-slope-20 | revert | btcAgainst | 1.05 (3583) | 0.92 (3562) | 0.95 | 0.90 |
| break | break-atr | follow | volHi | 1.21 (2634) | 0.92 (3019) | 1.06 | 0.90 |
| direction | dir-emax | follow | asia | 0.91 (2395) | 0.92 (2814) | 0.81 | 0.84 |
| ema | ema-9-21 | follow | asia | 0.91 (2395) | 0.92 (2814) | 0.81 | 0.84 |
| trend | trend-adx-30 | follow | none | 1.12 (2533) | 0.92 (2427) | 1.12 | 0.92 |
| bollinger | bb-bounce | revert | volume | 1.03 (2902) | 0.92 (2317) | 0.92 | 0.87 |
| active | act-hf-8 | revert | euUs | 0.98 (5080) | 0.92 (5053) | 0.92 | 0.88 |
| rsi | rsi-7-15-85 | revert | none | 1.21 (1741) | 0.92 (1624) | 1.21 | 0.92 |
| break | break-vol | revert | slope50 | 1.01 (1039) | 0.91 (754) | 0.86 | 0.79 |
| bollinger | bb-bounce-50-2 | revert | btc | 1.13 (3192) | 0.91 (3212) | 1.10 | 0.93 |
| move | move-swing-16 | revert | slope50 | 0.99 (4492) | 0.91 (4394) | 0.89 | 0.90 |
| move | move-impulse-10-2 | revert | quiet | 0.98 (2994) | 0.91 (3374) | 0.84 | 0.93 |
| macd | macd-cross-19-39-9 | follow | asia | 0.94 (2841) | 0.91 (3016) | 0.80 | 0.84 |
| macd | macd-hist-19-39-9 | follow | asia | 0.94 (2841) | 0.91 (3016) | 0.78 | 0.84 |
| bollinger | bb-wick | revert | asia | 1.00 (3264) | 0.91 (3708) | 0.88 | 0.91 |
| direction | dir-reclaim-50 | revert | euUs | 1.03 (3319) | 0.91 (3171) | 0.97 | 0.95 |
| direction | dir-emax | revert | btcAgainst | 1.04 (3110) | 0.91 (3085) | 0.96 | 0.89 |
| ema | ema-9-21 | revert | btcAgainst | 1.04 (3110) | 0.91 (3085) | 0.96 | 0.89 |
| active | act-hf-5 | follow | asia | 1.07 (4652) | 0.91 (4875) | 0.88 | 0.88 |
| direction | dir-st | revert | htfAgainst | 1.04 (2839) | 0.90 (2907) | 0.91 | 0.89 |
| trend | trend-st-7-2 | revert | htfAgainst | 1.04 (2839) | 0.90 (2907) | 0.91 | 0.89 |
| move | move-impulse-4-1.2 | revert | adxLo20 | 0.94 (2843) | 0.90 (2947) | 0.92 | 0.85 |
| direction | dir-vwap-120 | revert | slope50 | 0.99 (1919) | 0.90 (2135) | 0.83 | 0.92 |
| direction | dir-thrust-4 | follow | adx25 | 1.13 (2603) | 0.90 (2522) | 1.02 | 0.88 |
| ema | ema-21-55 | revert | slope50 | 1.04 (530) | 0.90 (561) | 0.91 | 0.84 |
| break | break-vol-2 | revert | slope50 | 0.95 (712) | 0.90 (520) | 0.84 | 0.77 |
| bollinger | bb-bounce-20-2.5 | revert | volume | 1.18 (2362) | 0.90 (1710) | 1.01 | 0.88 |
| trend | trend-ema | revert | slope50 | 0.96 (3782) | 0.90 (3800) | 0.90 | 0.97 |
| active | act-hf | revert | adxLo20 | 0.87 (3203) | 0.89 (3258) | 0.90 | 0.86 |
| move | move-swing-16 | follow | adx25 | 1.04 (3319) | 0.89 (3268) | 0.91 | 0.84 |
| move | move-cont | revert | volume | 1.06 (1495) | 0.89 (1761) | 0.93 | 0.88 |
| active | act-hf-5 | revert | adxLo20 | 0.90 (3070) | 0.89 (3095) | 0.93 | 0.85 |
| break | break-atr-0.9 | follow | volHi | 1.06 (3186) | 0.89 (3523) | 0.96 | 0.91 |
| ema | ema-slope-100 | revert | adx25 | 0.99 (784) | 0.89 (760) | 0.85 | 0.81 |
| bollinger | bb-bounce-50-2 | follow | slope50 | 1.05 (493) | 0.89 (512) | 0.74 | 0.88 |
| break | break-squeeze | follow | htfAgainst | 1.06 (792) | 0.89 (939) | 0.84 | 0.82 |
| rsi | rsi-mid | revert | htfAgainst | 0.95 (4277) | 0.89 (4502) | 0.94 | 0.91 |
| break | break-don20 | follow | volHi | 1.09 (2262) | 0.89 (2639) | 0.98 | 0.83 |
| rsi | rsi-mid-52-48 | follow | btcAgainst | 0.93 (3557) | 0.88 (3837) | 0.84 | 0.79 |
| direction | dir-st | follow | volHi | 1.12 (2190) | 0.88 (2266) | 0.92 | 0.86 |
| trend | trend-st-7-2 | follow | volHi | 1.12 (2190) | 0.88 (2266) | 0.92 | 0.86 |
| trend | trend-ribbon | follow | asia | 1.00 (1603) | 0.88 (1797) | 0.88 | 0.82 |
| trend | trend-adx-30 | revert | btc | 0.85 (776) | 0.88 (896) | 0.69 | 0.71 |
| rsi | rsi-fast | revert | btc | 1.11 (2909) | 0.88 (2605) | 1.07 | 0.88 |
| move | move-swing | follow | asia | 1.00 (5524) | 0.88 (5511) | 0.87 | 0.85 |
| rsi | rsi-mid | follow | volHi | 0.93 (2691) | 0.88 (2978) | 0.82 | 0.80 |
| ema | ema-slope-20 | follow | volHi | 0.93 (2219) | 0.88 (2271) | 0.80 | 0.85 |
| bollinger | bb-walk-50 | follow | btc | 1.13 (2639) | 0.87 (2580) | 1.09 | 0.88 |
| active | act-chop | revert | asia | 1.17 (873) | 0.87 (1057) | 0.99 | 0.84 |
| trend | trend-ema-12-26 | revert | adx25 | 0.95 (2208) | 0.87 (2195) | 0.88 | 0.96 |
| direction | dir-vwap-240 | follow | btcAgainst | 1.19 (1120) | 0.87 (1200) | 0.95 | 0.91 |
| direction | dir-thrust | revert | volume | 0.72 (2911) | 0.87 (2679) | 0.85 | 0.87 |
| ema | ema-pullback | revert | volHi | 1.00 (2524) | 0.87 (2748) | 0.91 | 0.87 |
| move | move-impulse-10-2 | follow | adxLo20 | 0.99 (2309) | 0.87 (2323) | 0.90 | 0.83 |
| bollinger | bb-wick | follow | htfAgainst | 1.01 (4548) | 0.86 (4730) | 0.95 | 0.90 |
| sar | sar-std | follow | adxLo20 | 1.07 (2517) | 0.86 (2445) | 0.89 | 0.83 |
| sar | sar-flip | follow | adxLo20 | 1.07 (2517) | 0.86 (2445) | 0.89 | 0.83 |
| active | act-burst-1.5 | revert | rsiRoom | 1.03 (5736) | 0.86 (5659) | 1.01 | 0.89 |
| break | break-atr | revert | quiet | 0.92 (1405) | 0.85 (2475) | 0.83 | 0.81 |
| active | act-burst-2.5 | revert | volLo | 1.19 (1369) | 0.85 (1277) | 0.98 | 0.81 |
| trend | trend-ema-50-200 | revert | btcAgainst | 1.04 (1318) | 0.85 (1363) | 0.88 | 0.83 |
| break | break-atr-1.5 | revert | quiet | 1.00 (457) | 0.85 (1266) | 0.83 | 0.78 |
| rsi | rsi-mid-60-40 | follow | htfAgainst | 1.03 (1810) | 0.85 (1833) | 0.91 | 0.83 |
| break | break-atr-0.9 | revert | quiet | 0.94 (2937) | 0.85 (3855) | 0.84 | 0.81 |
| trend | trend-ema | follow | btcAgainst | 0.96 (4262) | 0.85 (4830) | 0.85 | 0.78 |
| trend | trend-adx | revert | btc | 0.92 (1411) | 0.85 (1494) | 0.76 | 0.76 |
| bollinger | bb-bounce-20-2.5 | follow | quiet | 1.13 (585) | 0.85 (1271) | 0.83 | 0.85 |
| break | break-don40 | follow | btc | 1.15 (3235) | 0.84 (3188) | 1.09 | 0.83 |
| direction | dir-reclaim-50 | follow | slope50 | 0.98 (2708) | 0.84 (2756) | 0.83 | 0.79 |
| macd | macd-cross-5-35-5 | revert | volLo | 1.02 (3489) | 0.84 (3789) | 0.84 | 1.00 |
| macd | macd-hist-5-35-5 | revert | volLo | 1.02 (3489) | 0.84 (3789) | 0.85 | 1.00 |
| trend | trend-ema-5-20 | follow | btcAgainst | 0.93 (5108) | 0.84 (5595) | 0.84 | 0.80 |
| active | act-burst-2.5 | follow | slope50 | 1.13 (2428) | 0.84 (2253) | 0.97 | 0.79 |
| trend | trend-ema-20-50 | follow | adxLo20 | 1.05 (2204) | 0.83 (2284) | 0.96 | 0.87 |
| active | act-burst | follow | slope50 | 1.03 (5199) | 0.83 (5053) | 0.83 | 0.77 |
| bollinger | bb-mid | revert | volLo | 1.03 (3087) | 0.82 (3329) | 0.97 | 0.89 |
| active | act-burst-1.5 | follow | slope50 | 1.00 (7139) | 0.82 (7163) | 0.80 | 0.83 |
| direction | dir-vwap | follow | quiet | 1.00 (2400) | 0.82 (2719) | 0.82 | 0.74 |
| bollinger | bb-walk | revert | slope50 | 1.00 (1364) | 0.82 (1443) | 0.87 | 0.85 |
| rsi | rsi-div | follow | volume | 1.08 (326) | 0.82 (382) | 0.79 | 0.77 |
| move | move-impulse-20-2.5 | follow | btc | 1.05 (3612) | 0.82 (3487) | 0.94 | 0.78 |
| direction | dir-emax-5-13 | follow | volHi | 0.96 (2478) | 0.82 (2540) | 0.82 | 0.86 |
| break | break-fail | revert | stretch2 | 1.03 (3563) | 0.82 (3646) | 0.91 | 0.94 |
| move | move-impulse-20-2.5 | revert | slope50 | 0.94 (1833) | 0.81 (1720) | 0.86 | 0.96 |
| rsi | rsi-extreme | follow | asia | 1.04 (1348) | 0.81 (1386) | 0.80 | 0.84 |
| macd | macd-cross-8-21-5 | revert | volLo | 1.02 (3410) | 0.81 (3680) | 0.85 | 0.99 |
| macd | macd-hist-8-21-5 | revert | volLo | 1.02 (3410) | 0.81 (3680) | 0.85 | 0.99 |
| macd | macd-hist | revert | asia | 0.94 (5297) | 0.81 (5613) | 0.83 | 0.82 |
| ema | ema-21-55 | follow | volHi | 1.06 (985) | 0.81 (1112) | 0.92 | 0.77 |
| direction | dir-thrust | follow | volLo | 1.03 (3508) | 0.81 (3730) | 0.93 | 0.90 |
| move | move-impulse-4-1.2 | follow | htfAgainst | 1.03 (4031) | 0.80 (4271) | 0.85 | 0.89 |
| ema | ema-50-100 | revert | volHi | 1.23 (549) | 0.80 (627) | 0.92 | 0.91 |
| ema | ema-slope-100 | follow | volLo | 0.98 (1245) | 0.80 (1467) | 0.86 | 0.76 |
| move | move-swing | revert | volume | 0.99 (3143) | 0.80 (2894) | 0.89 | 0.88 |
| macd | macd-zero | follow | volLo | 1.06 (1818) | 0.80 (2049) | 0.86 | 0.75 |
| direction | dir-emax-12-26 | follow | volLo | 1.06 (1818) | 0.80 (2049) | 0.86 | 0.75 |
| sar | sar-fast | follow | adxLo20 | 1.04 (2779) | 0.79 (2899) | 0.91 | 0.79 |
| move | move-swing-32 | revert | slope50 | 0.87 (3608) | 0.79 (3576) | 0.82 | 0.96 |
| macd | macd-cross-5-35-5 | follow | volume | 1.05 (2988) | 0.79 (2836) | 0.88 | 0.82 |
| macd | macd-hist-5-35-5 | follow | volume | 1.04 (2989) | 0.79 (2836) | 0.88 | 0.82 |
| bollinger | bb-mid | follow | volHi | 0.97 (2676) | 0.79 (2790) | 0.82 | 0.86 |
| trend | trend-adx-20 | follow | volLo | 1.08 (2138) | 0.79 (2288) | 0.94 | 0.82 |
| direction | dir-reclaim | follow | volHi | 0.97 (2599) | 0.79 (2735) | 0.85 | 0.86 |
| break | break-atr-2 | revert | volLo | 1.06 (794) | 0.79 (759) | 0.81 | 0.77 |
| macd | macd-cross-8-21-5 | follow | volume | 1.12 (2887) | 0.79 (2613) | 0.89 | 0.84 |
| macd | macd-hist-8-21-5 | follow | volume | 1.12 (2892) | 0.79 (2613) | 0.90 | 0.84 |
| rsi | rsi-mid-60-40 | revert | slope50 | 0.89 (2748) | 0.79 (2771) | 0.90 | 0.92 |
| sar | sar-0.01 | follow | volHi | 0.98 (2513) | 0.79 (2586) | 0.86 | 0.83 |
| rsi | rsi-7-15-85 | follow | asia | 1.09 (660) | 0.78 (678) | 0.67 | 0.97 |
| direction | dir-emax-20-50 | revert | volHi | 1.05 (1238) | 0.78 (1388) | 0.97 | 0.82 |
| direction | dir-macd | follow | volume | 0.92 (1899) | 0.78 (1625) | 0.77 | 0.82 |
| macd | macd-cross | follow | volume | 0.93 (1893) | 0.78 (1625) | 0.77 | 0.82 |
| ema | ema-pullback-50 | follow | htfAgainst | 0.82 (532) | 0.78 (528) | 0.86 | 0.85 |
| sar | sar-0.03 | follow | volume | 1.06 (3513) | 0.78 (2939) | 0.96 | 0.83 |
| bollinger | bb-bounce-20-3 | revert | htfAgainst | 1.55 (362) | 0.77 (282) | 1.01 | 0.99 |
| bollinger | bb-walk-50 | revert | slope50 | 1.32 (135) | 0.76 (143) | 0.77 | 0.86 |
| trend | trend-ema-50-200 | follow | volume | 1.06 (484) | 0.76 (488) | 0.86 | 0.93 |
| ema | ema-slope | follow | volHi | 0.98 (1590) | 0.76 (1662) | 0.89 | 0.74 |
| macd | macd-hist | follow | volume | 0.95 (3581) | 0.76 (3478) | 0.92 | 0.85 |
| trend | trend-ema-20-50 | revert | slope50 | 0.89 (1503) | 0.76 (1552) | 0.82 | 0.88 |
| sar | sar-fast | revert | volLo | 0.93 (3629) | 0.76 (3899) | 0.84 | 0.99 |
| active | act-hf-8 | follow | volLo | 0.97 (3267) | 0.76 (3565) | 0.84 | 0.88 |
| break | break-don10 | follow | volHi | 1.07 (4218) | 0.76 (4844) | 0.93 | 0.82 |
| trend | trend-ribbon | revert | adx25 | 1.02 (962) | 0.75 (908) | 0.91 | 0.83 |
| trend | trend-st-21-5 | follow | btc | 1.20 (1458) | 0.75 (1372) | 1.02 | 0.76 |
| direction | dir-thrust-4 | revert | volume | 0.86 (1521) | 0.75 (1273) | 0.80 | 0.90 |
| trend | trend-ema-12-26 | follow | volume | 0.98 (1956) | 0.75 (1718) | 0.86 | 0.77 |
| sar | sar-0.03 | revert | volLo | 0.93 (3462) | 0.75 (3688) | 0.85 | 0.97 |
| move | move-impulse | follow | adx25 | 0.95 (4446) | 0.75 (4504) | 0.86 | 0.82 |
| active | act-shift | follow | adxLo20 | 1.06 (608) | 0.74 (686) | 0.78 | 0.83 |
| direction | dir-vwap-30 | follow | volHi | 0.97 (3605) | 0.74 (3820) | 0.78 | 0.84 |
| direction | dir-emax-20-50 | follow | volLo | 1.09 (1192) | 0.74 (1353) | 0.91 | 0.77 |
| ema | ema-pullback | follow | volume | 0.94 (2226) | 0.74 (2023) | 0.84 | 0.87 |
| trend | trend-adx-20 | revert | volLo | 0.90 (3024) | 0.74 (3314) | 0.81 | 0.76 |
| ema | ema-pullback-50 | revert | htf | 1.10 (384) | 0.74 (380) | 0.89 | 0.87 |
| break | break-retest | revert | adxLo20 | 1.14 (1179) | 0.74 (1163) | 0.91 | 0.77 |
| break | break-fail | follow | slope50 | 0.96 (3038) | 0.73 (3125) | 0.88 | 0.84 |
| sar | sar-std | revert | volLo | 0.94 (3173) | 0.73 (3387) | 0.86 | 0.92 |
| sar | sar-flip | revert | volLo | 0.94 (3173) | 0.73 (3387) | 0.86 | 0.92 |
| break | break-vol-1.3 | follow | volLo | 1.10 (1711) | 0.73 (1536) | 0.95 | 0.91 |
| rsi | rsi-14-25-75 | follow | asia | 1.14 (649) | 0.73 (670) | 0.65 | 0.77 |
| move | move-cont | follow | volLo | 0.95 (3648) | 0.73 (3857) | 0.85 | 0.94 |
| break | break-don20 | revert | slope50 | 0.88 (2643) | 0.72 (2617) | 0.86 | 0.91 |
| bollinger | bb-bounce-20-3 | follow | quiet | 0.97 (131) | 0.72 (391) | 0.84 | 0.78 |
| macd | macd-cross-19-39-9 | revert | volLo | 1.15 (3913) | 0.71 (4316) | 0.99 | 0.93 |
| macd | macd-hist-19-39-9 | revert | volLo | 1.15 (3913) | 0.71 (4316) | 1.00 | 0.93 |
| ema | ema-stoch | revert | slope50 | 1.01 (1024) | 0.71 (1069) | 0.86 | 0.84 |
| direction | dir-reclaim | revert | volLo | 0.96 (5398) | 0.71 (5923) | 0.91 | 0.89 |
| break | break-retest | follow | volLo | 1.01 (1717) | 0.70 (1878) | 0.93 | 0.92 |
| bollinger | bb-walk | follow | htfAgainst | 1.23 (942) | 0.70 (1018) | 0.91 | 0.86 |
| direction | dir-vwap-30 | revert | volLo | 1.06 (4302) | 0.70 (4843) | 0.99 | 0.91 |
| rsi | rsi-14-20-80 | follow | quiet | 1.45 (149) | 0.70 (192) | 0.80 | 0.67 |
| rsi | rsi-div | revert | volLo | 1.20 (1261) | 0.70 (1298) | 1.01 | 1.11 |
| direction | dir-emax-5-13 | revert | volLo | 1.05 (4520) | 0.69 (5031) | 0.94 | 0.89 |
| rsi | rsi-21-30-70 | follow | asia | 1.16 (696) | 0.69 (644) | 0.75 | 0.70 |
| ema | ema-50-100 | follow | volLo | 1.17 (687) | 0.67 (721) | 0.86 | 0.83 |
| trend | trend-adx | follow | volLo | 1.22 (1600) | 0.66 (1672) | 1.00 | 0.85 |
| trend | trend-st | follow | volLo | 1.22 (1409) | 0.66 (1643) | 0.91 | 0.74 |
| direction | dir-vwap-240 | revert | volLo | 0.82 (1448) | 0.66 (1609) | 0.80 | 0.79 |
| sar | sar-0.01 | revert | volLo | 1.04 (3707) | 0.64 (4156) | 0.92 | 0.92 |
| break | break-squeeze | revert | slope50 | 0.92 (1131) | 0.64 (1245) | 0.90 | 0.88 |
| active | act-chop | follow | btc | 0.89 (655) | 0.63 (798) | 0.78 | 0.87 |
| trend | trend-st-14-4 | follow | volLo | 1.37 (994) | 0.63 (1107) | 0.99 | 0.69 |