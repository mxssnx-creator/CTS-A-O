# Indications × timeframes — independent and combined

40 symbols · 90.0 days of real BingX 15m data (2026-06-28 → 2026-09-26) · half A → 2026-08-12 selects, half B validates · cost 0.2% round trip · 147 indications × follow/revert × 6 protects per timeframe · combined = the same indication agrees on the higher timeframe(s): 15m → 60m

## Pooled (every indication × bot × protect; no selection)

| timeframe | mode | variants | pass both halves (PF ≥ 1.1, ≥ 60 trades) | pooled PF A | pooled PF B | trades/day per variant |
|---|---|---:|---:|---:|---:|---:|
| 15m | independent | 1764 | 0 | 0.76 | 0.80 | 86.40 |
| 15m | combined | 1764 | 0 | 0.75 | 0.80 | 51.12 |

## Both-halves survivors (0)

| tf | mode | combo | TP | SL | hold (bars) | A n | A PF | B n | B PF | B trades/day | green hours B |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## Every indication, one by one: best variant on A → half-B PF (trades in B)

| kind | indication | 15m | 15m comb. |
|---|---|---:|---:|
| trend | trend-ema | 0.79 (4490) | 0.66 (4196) |
| trend | trend-adx | 0.87 (2773) | 0.57 (1685) |
| trend | trend-st | 0.96 (2628) | 0.77 (2240) |
| trend | trend-ribbon | 0.69 (3351) | 0.66 (2605) |
| break | break-don20 | 0.80 (4386) | 0.71 (2194) |
| break | break-vol | 0.72 (2473) | 0.60 (811) |
| break | break-atr | 0.80 (4702) | 0.75 (2328) |
| break | break-squeeze | 0.73 (2098) | 0.62 (181) |
| break | break-retest | 0.76 (3913) | 0.58 (809) |
| break | break-fail | 0.79 (5641) | 0.65 (2497) |
| active | act-burst | 0.77 (4487) | 0.81 (2123) |
| active | act-shift | 0.83 (2289) | 1.25 (579) |
| active | act-hf | 0.82 (6137) | 0.77 (3786) |
| active | act-chop | 0.84 (2453) | 1.06 (68) |
| direction | dir-emax | 0.99 (3530) | 0.70 (3244) |
| direction | dir-st | 0.94 (4034) | 0.65 (3511) |
| direction | dir-vwap | 1.03 (3213) | 0.83 (2962) |
| direction | dir-macd | 0.88 (4997) | 0.71 (4420) |
| direction | dir-thrust | 0.88 (5665) | 0.77 (2959) |
| direction | dir-reclaim | 1.05 (4631) | 0.88 (2012) |
| move | move-impulse | 0.79 (5112) | 0.75 (3817) |
| move | move-swing | 0.82 (5952) | 0.76 (4761) |
| move | move-cont | 1.04 (5619) | 0.72 (545) |
| rsi | rsi-extreme | 0.74 (2485) | 0.60 (970) |
| rsi | rsi-mid | 0.77 (4878) | 0.67 (4225) |
| rsi | rsi-fast | 0.71 (2750) | 0.70 (796) |
| rsi | rsi-div | 0.60 (2612) | 0.47 (362) |
| bollinger | bb-bounce | 0.77 (5754) | 0.73 (1672) |
| bollinger | bb-walk | 0.80 (3981) | 0.95 (355) |
| bollinger | bb-mid | 1.04 (4758) | 0.81 (1834) |
| bollinger | bb-wick | 0.76 (6902) | 0.70 (2880) |
| sar | sar-std | 0.93 (5186) | 0.94 (4448) |
| sar | sar-fast | 0.90 (5032) | 0.79 (6860) |
| sar | sar-flip | 0.93 (5186) | 0.96 (2298) |
| macd | macd-cross | 0.88 (4997) | 0.96 (1597) |
| macd | macd-hist | 0.91 (5376) | 0.94 (4658) |
| macd | macd-zero | 0.96 (3073) | 0.76 (2799) |
| ema | ema-21-55 | 0.87 (1913) | 0.81 (1615) |
| ema | ema-pullback | 0.64 (4595) | 0.74 (1327) |
| ema | ema-slope | 0.92 (2852) | 0.79 (2742) |
| ema | ema-stoch | 1.07 (4156) | 0.66 (753) |
| trend | trend-ema-5-20 | 0.87 (4191) | 0.67 (4410) |
| trend | trend-ema-12-26 | 0.72 (4231) | 0.69 (3902) |
| trend | trend-ema-20-50 | 0.67 (3109) | 0.71 (2885) |
| trend | trend-ema-50-200 | 0.82 (1772) | 0.71 (1423) |
| trend | trend-adx-20 | 0.70 (3555) | 0.63 (2624) |
| trend | trend-adx-30 | 0.75 (2533) | 0.57 (1071) |
| trend | trend-st-7-2 | 0.94 (4034) | 0.65 (3511) |
| trend | trend-st-14-4 | 0.85 (2111) | 0.98 (1528) |
| trend | trend-st-21-5 | 0.71 (1663) | 0.81 (1087) |
| break | break-don10 | 0.77 (4968) | 0.78 (3807) |
| break | break-don40 | 0.81 (4059) | 0.69 (1653) |
| break | break-don55 | 0.77 (3040) | 0.64 (1360) |
| break | break-vol-1.3 | 0.75 (2934) | 0.64 (1075) |
| break | break-vol-2 | 0.75 (2023) | 0.62 (568) |
| break | break-atr-0.9 | 0.80 (7541) | 0.74 (4432) |
| break | break-atr-1.5 | 0.83 (3488) | 0.74 (1272) |
| break | break-atr-2 | 0.82 (1960) | 1.08 (649) |
| active | act-burst-1.5 | 0.81 (5340) | 0.81 (3089) |
| active | act-burst-2.5 | 0.81 (2616) | 0.73 (1030) |
| active | act-hf-5 | 0.82 (4987) | 0.76 (3710) |
| active | act-hf-8 | 0.81 (7403) | 0.71 (3110) |
| direction | dir-emax-5-13 | 1.03 (4411) | 0.67 (5154) |
| direction | dir-emax-12-26 | 0.96 (3073) | 0.76 (2799) |
| direction | dir-emax-20-50 | 0.87 (2159) | 0.80 (1782) |
| direction | dir-vwap-30 | 1.02 (4267) | 0.68 (4127) |
| direction | dir-vwap-120 | 0.79 (2037) | 0.83 (2338) |
| direction | dir-vwap-240 | 0.74 (1494) | 0.79 (1644) |
| direction | dir-thrust-4 | 0.85 (4368) | 0.78 (1116) |
| direction | dir-reclaim-50 | 0.96 (3377) | 0.95 (1169) |
| move | move-impulse-4-1.2 | 0.79 (4790) | 0.72 (3494) |
| move | move-impulse-10-2 | 0.78 (4612) | 0.61 (2339) |
| move | move-impulse-20-2.5 | 0.85 (4202) | 0.72 (2306) |
| move | move-swing-16 | 0.79 (7535) | 0.66 (4098) |
| move | move-swing-32 | 0.78 (5125) | 0.66 (3407) |
| rsi | rsi-14-25-75 | 0.68 (1268) | 0.62 (431) |
| rsi | rsi-14-20-80 | 0.75 (592) | 0.86 (193) |
| rsi | rsi-21-30-70 | 0.72 (1229) | 0.55 (531) |
| rsi | rsi-7-15-85 | 0.72 (1516) | 0.68 (328) |
| rsi | rsi-mom-10-25 | 0.73 (2517) | 0.64 (872) |
| rsi | rsi-mom-14-15 | 0.64 (195) | – |
| rsi | rsi-mom-14-20 | 0.75 (592) | 0.86 (193) |
| rsi | rsi-mom-14-25 | 0.68 (1268) | 0.62 (431) |
| rsi | rsi-mom-21-15 | – | – |
| rsi | rsi-mom-21-20 | 0.79 (214) | – |
| rsi | rsi-mom-21-25 | 0.72 (541) | 0.80 (200) |
| rsi | rsi-mid-60-40 | 0.72 (4923) | 0.66 (3105) |
| rsi | rsi-mid-52-48 | 0.82 (4575) | 0.71 (4454) |
| bollinger | bb-bounce-20-2.5 | 0.75 (3250) | 0.76 (561) |
| bollinger | bb-bounce-20-3 | 0.75 (1500) | 0.80 (119) |
| bollinger | bb-bounce-50-2 | 0.76 (4245) | 0.73 (1341) |
| bollinger | bb-walk-50 | 0.77 (2864) | 0.73 (865) |
| sar | sar-0.01 | 0.93 (4450) | 0.67 (3795) |
| sar | sar-0.03 | 0.71 (4805) | 0.94 (4406) |
| macd | macd-cross-5-35-5 | 0.87 (5658) | 0.86 (4430) |
| macd | macd-hist-5-35-5 | 0.88 (4951) | 0.78 (6839) |
| macd | macd-cross-8-21-5 | 0.85 (4880) | 0.96 (3254) |
| macd | macd-hist-8-21-5 | 0.85 (4880) | 0.79 (6584) |
| macd | macd-cross-19-39-9 | 0.92 (4610) | 0.95 (961) |
| macd | macd-hist-19-39-9 | 0.92 (4610) | 0.70 (3936) |
| ema | ema-9-21 | 0.99 (3530) | 0.70 (3244) |
| ema | ema-50-100 | 0.73 (1264) | 0.66 (890) |
| ema | ema-slope-20 | 0.99 (4061) | 0.70 (3757) |
| ema | ema-slope-100 | 0.84 (2028) | 0.78 (1894) |
| ema | ema-pullback-50 | 0.70 (3364) | 0.81 (520) |
| osc | cci-14-100 | 0.80 (5583) | 0.72 (3757) |
| osc | cci-14-200 | 0.75 (3621) | 0.68 (432) |
| osc | cci-20-100 | 0.79 (5263) | 0.70 (3436) |
| osc | cci-20-200 | 0.75 (3505) | 0.61 (585) |
| osc | cci-40-100 | 0.77 (4633) | 0.63 (2747) |
| osc | cci-40-200 | 0.79 (3150) | 0.77 (647) |
| osc | willr-14-80 | 0.80 (7646) | 0.75 (4607) |
| osc | willr-14-90 | 0.81 (6905) | 0.78 (2870) |
| osc | willr-28-80 | 0.81 (6837) | 0.65 (3210) |
| osc | willr-28-90 | 0.81 (5972) | 0.70 (2122) |
| osc | srsi-14-10 | 0.90 (5310) | 0.84 (1829) |
| osc | srsi-14-20 | 0.86 (5570) | 0.83 (3092) |
| osc | z-20-2 | 0.77 (5754) | 0.73 (1672) |
| osc | z-20-2.5 | 0.75 (3250) | 0.76 (561) |
| osc | z-50-2 | 0.76 (4245) | 0.73 (1341) |
| osc | z-50-2.5 | 0.80 (2579) | 1.03 (659) |
| volume | mfi-14-20 | 0.78 (2852) | 1.11 (593) |
| volume | mfi-14-10 | 0.79 (1114) | 1.06 (119) |
| volume | obv-20 | 0.95 (4509) | 0.73 (4456) |
| volume | obv-50 | 0.83 (3810) | 0.81 (3161) |
| volume | cmf-20-0.05 | 0.84 (4488) | 0.74 (3478) |
| volume | cmf-20-0.1 | 0.81 (4279) | 0.75 (2693) |
| channel | kelt-20-1.5 | 0.77 (5043) | 0.68 (2148) |
| channel | kelt-20-2 | 0.79 (3286) | 0.66 (1338) |
| channel | kelt-20-2.5 | 0.76 (2137) | 0.63 (825) |
| channel | squeeze-20 | 0.76 (2811) | 0.75 (345) |
| channel | squeeze-30 | 0.87 (1396) | 0.38 (56) |
| channel | aroon-14 | 0.77 (5185) | 0.61 (2662) |
| channel | aroon-25 | 0.78 (5347) | 0.68 (2118) |
| ichimoku | ichi-tk-9 | 0.92 (4126) | 0.61 (3392) |
| ichimoku | ichi-cloud-9 | 0.72 (4830) | 0.63 (2631) |
| ichimoku | ichi-tk-20 | 0.72 (2484) | 0.67 (2072) |
| ichimoku | ichi-cloud-20 | 0.78 (2488) | 0.58 (1444) |
| smooth | hma-16 | 0.96 (5598) | 0.78 (4600) |
| smooth | hma-32 | 0.93 (5225) | 1.08 (3846) |
| smooth | hma-55 | 0.90 (4071) | 0.65 (3610) |
| smooth | trix-9 | 0.97 (3711) | 0.64 (3236) |
| smooth | trix-15 | 0.90 (2856) | 0.83 (2211) |
| smooth | kama-10 | 0.97 (4953) | 0.76 (4898) |
| smooth | kama-20 | 1.08 (4193) | 0.71 (4223) |
| smooth | ha-1 | 0.72 (5267) | 0.76 (7922) |
| smooth | ha-3 | 0.73 (5418) | 0.78 (4981) |