# Exit comparison results — 25 October 2026 — Europe/Vienna

5 audited 12-hour replays, each with 12 symbols, 150h fitting history, 1/5/15m lanes and minute pricing. These are funded modeled executions, not venue fills. Policies are frozen before each replay. PF is gross gains divided by gross losses after costs: 1.0 is neutral, above 1 profitable, below 1 losing. Samples without losses show ∞; empty samples show no measured PF. Independent losses remain included.

Order counts are opened / settled / held; position counts are opened / closed / held. Positions can overlap across ranges or tactics and must not be added across groups. ∞ describes a positive sample with zero losses; it is not a finite PF of 4, and the settled count still matters.

| Scenario | Account PF | Equity DD | Account orders | Account positions | Exit PF | Exit orders | Exit positions | Wall seconds | Peak MiB |
|---|---:|---:|---|---|---:|---|---|---:|---:|
| cost-0 | 0.9771 | 0.1883% | 499/378/121 | 18/7/11 | 0.0393 | 129/74/55 | 10/3/7 | 627.1 | 3589.7 |
| cost-12 | 0.0899 | 1.5785% | 1152/336/816 | 11/7/4 | 0.2267 | 55/52/3 | 10/7/3 | 663.3 | 3622.6 |
| slices-0 | 3.0665 | 0.1369% | 449/382/67 | 11/5/6 | 0.0000 | 19/18/1 | 1/0/1 | 623.4 | 3510.4 |
| slices-12 | 0.0480 | 1.1631% | 852/271/581 | 1/0/1 | — (empty) | 0/0/0 | 0/0/0 | 396.0 | 3517.5 |
| slices--12 | 2.0136 | 5.5674% | 12277/8672/3605 | 23/13/10 | ∞ (no losses) | 3/3/0 | 1/1/0 | 629.5 | 3606.3 |

![Performance and allocation counts](comparison.svg)

![Hourly account equity](hourly-equity.svg)

Hourly results below use settled-close reporting bins; calculations still use minute prices. Cohort-boundary holdings are included by the independent position/order ledger. The coverage archive counts both directions for every config, including the ineligible opposite side of side-specific Exit IDs; those all-orientation percentages must not be presented as eligible-side percentages.

## cost-0

Independent Exit Base: 28 / 663 source-lane pairs passed. Its holdout evaluated 6852 candidate configs and retained 418; 418 Exit configs were built. These are distinct stages, not order counts.

All Signal/Exit configs built: 126600 across 118 sources and 663 source lanes; missing configured cells: 0. At run start, 7534 configs had a passing exact symbol/direction context; 10332 / 3038400 all-orientation contexts passed all gates. Signals use independent exact-config qualification, not the representative Base-pair result.

| Executed range/type | Orders | Positions | PF (neutral 1) | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| Signals / all | 370/304/66 | 11/6/5 | 2.8779 | 0.767428 | 0.266658 |
| Signals / trailing | 276/218/58 | 9/4/5 | 2.4068 | 0.459449 | 0.190898 |
| Signals / trailing-only | 60/54/6 | 7/4/3 | 6.8465 | 0.139975 | 0.020445 |
| Signals / normal | 34/32/2 | 7/5/2 | 3.0372 | 0.168004 | 0.055316 |
| Exit / all | 129/74/55 | 10/3/7 | 0.0393 | 0.021260 | 0.540476 |
| Exit / exit:trailing-only | 69/40/29 | 7/3/4 | 0.0868 | 0.021260 | 0.244811 |
| Exit / exit:trailing | 35/17/18 | 7/2/5 | 0.0000 | 0.000000 | 0.173363 |
| Exit / exit:breakeven | 11/5/6 | 5/1/4 | 0.0000 | 0.000000 | 0.033678 |
| Exit / exit:static-sl | 5/5/0 | 2/2/0 | 0.0000 | 0.000000 | 0.033678 |
| Exit / exit:adaptive-sl | 9/7/2 | 5/3/2 | 0.0000 | 0.000000 | 0.054947 |

| Exit tactic | Orders | Positions | PF | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| static-sl | 5/5/0 | 2/2/0 | 0.0000 | 0.000000 | 0.033678 |
| adaptive-sl | 9/7/2 | 5/3/2 | 0.0000 | 0.000000 | 0.054947 |
| trailing | 35/17/18 | 7/2/5 | 0.0000 | 0.000000 | 0.173363 |
| breakeven | 11/5/6 | 5/1/4 | 0.0000 | 0.000000 | 0.033678 |
| trailing-only | 69/40/29 | 7/3/4 | 0.0868 | 0.021260 | 0.244811 |

| Range/type | Configs | Sources | Symbols | Configs with any Last-4 at start | All-orientation contexts Last-4 | Max SL/TP | Min trail gap |
|---|---:|---:|---:|---:|---:|---:|---:|
| type: exit | 418 | 12 | 12 | 98.80% | 46.41% | 2 | 0.002 |
| strategyRange: Exit | 418 | 12 | 12 | 98.80% | 46.41% | 2 | 0.002 |
| lane: 15 | 37134 | 118 | 12 | 78.29% | 39.81% | 3 | 0.002 |
| type: normal | 27625 | 118 | 12 | 82.16% | 32.84% | 3 | — |
| strategyRange: Signals | 126182 | 118 | 12 | 82.11% | 33.41% | 3 | 0.002 |
| lane: 1 | 45527 | 118 | 12 | 80.87% | 13.61% | 2.6785714285714284 | 0.0025 |
| type: trailing | 82645 | 118 | 12 | 81.99% | 33.49% | 3 | 0.002 |
| type: trailing-only | 15912 | 118 | 12 | 82.68% | 34.03% | — | 0.0025 |
| lane: 5 | 43939 | 118 | 12 | 86.79% | 48.66% | 2.7040816326530615 | 0.00275 |

| Hour Vienna | Orders | Positions | Settled PF | Equity | Max DD so far | Exit settled |
|---|---|---|---:|---:|---:|---:|
| 10-16 23:00 CEST | 226/26/200 | 8/1/7 | 1.6716 | 10.002433 | 0.0453% | 0 |
| 10-17 00:00 CEST | 2/93/109 | 1/0/8 | 0.2870 | 9.994063 | 0.0990% | 8 |
| 10-17 01:00 CEST | 0/1/108 | 0/0/8 | 0.0000 | 9.993753 | 0.1062% | 1 |
| 10-17 02:00 CEST | 40/3/145 | 3/0/11 | 0.0000 | 9.996146 | 0.1062% | 0 |
| 10-17 03:00 CEST | 56/21/180 | 0/0/11 | 0.0014 | 9.996916 | 0.1062% | 0 |
| 10-17 04:00 CEST | 11/4/187 | 0/0/11 | 0.3401 | 9.992805 | 0.1394% | 0 |
| 10-17 05:00 CEST | 52/13/226 | 6/2/15 | 0.2192 | 9.985860 | 0.1883% | 6 |
| 10-17 06:00 CEST | 112/129/209 | 0/2/13 | 3.5717 | 9.994476 | 0.1883% | 11 |
| 10-17 07:00 CEST | 0/32/177 | 0/1/12 | 11.4916 | 9.994134 | 0.1883% | 0 |
| 10-17 08:00 CEST | 0/12/165 | 0/1/11 | 0.4128 | 9.994116 | 0.1883% | 7 |
| 10-17 09:00 CEST | 0/39/126 | 0/0/11 | 0.0170 | 9.994171 | 0.1883% | 36 |
| 10-17 10:00 CEST | 0/5/121 | 0/0/11 | 0.0000 | 9.994311 | 0.1883% | 5 |

## cost-12

Independent Exit Base: 27 / 663 source-lane pairs passed. Its holdout evaluated 7896 candidate configs and retained 278; 278 Exit configs were built. These are distinct stages, not order counts.

All Signal/Exit configs built: 126557 across 118 sources and 663 source lanes; missing configured cells: 0. At run start, 7320 configs had a passing exact symbol/direction context; 9895 / 3037368 all-orientation contexts passed all gates. Signals use independent exact-config qualification, not the representative Base-pair result.

| Executed range/type | Orders | Positions | PF (neutral 1) | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| Exit / all | 55/52/3 | 10/7/3 | 0.2267 | 0.077389 | 0.341377 |
| Exit / exit:adaptive-sl | 4/4/0 | 2/2/0 | 0.0000 | 0.000000 | 0.057200 |
| Exit / exit:breakeven | 4/4/0 | 1/1/0 | — (flat) | 0.000000 | 0.000000 |
| Exit / exit:trailing-only | 30/29/1 | 10/9/1 | 0.7340 | 0.067855 | 0.092451 |
| Exit / exit:trailing | 17/15/2 | 7/5/2 | 0.0497 | 0.009534 | 0.191726 |
| Signals / all | 1097/284/813 | 1/0/1 | 0.0399 | 0.037326 | 0.934846 |
| Signals / trailing | 812/175/637 | 1/0/1 | 0.1117 | 0.025495 | 0.228311 |
| Signals / normal | 121/49/72 | 1/0/1 | 0.0000 | 0.000000 | 0.549374 |
| Signals / trailing-only | 164/60/104 | 1/0/1 | 0.0753 | 0.011831 | 0.157160 |

| Exit tactic | Orders | Positions | PF | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| static-sl | 0/0/0 | 0/0/0 | empty | 0 | 0 |
| adaptive-sl | 4/4/0 | 2/2/0 | 0.0000 | 0.000000 | 0.057200 |
| trailing | 17/15/2 | 7/5/2 | 0.0497 | 0.009534 | 0.191726 |
| breakeven | 4/4/0 | 1/1/0 | — (flat) | 0.000000 | 0.000000 |
| trailing-only | 30/29/1 | 10/9/1 | 0.7340 | 0.067855 | 0.092451 |

| Range/type | Configs | Sources | Symbols | Configs with any Last-4 at start | All-orientation contexts Last-4 | Max SL/TP | Min trail gap |
|---|---:|---:|---:|---:|---:|---:|---:|
| type: exit | 278 | 10 | 12 | 100.00% | 42.22% | 3.5714285714285716 | 0.0021 |
| strategyRange: Exit | 278 | 10 | 12 | 100.00% | 42.22% | 3.5714285714285716 | 0.0021 |
| lane: 15 | 37038 | 118 | 12 | 79.09% | 40.26% | 3.5714285714285716 | 0.002 |
| type: normal | 27630 | 118 | 12 | 82.48% | 33.12% | 3 | — |
| strategyRange: Signals | 126279 | 118 | 12 | 82.49% | 33.75% | 3 | 0.002 |
| lane: 1 | 45530 | 118 | 12 | 81.17% | 13.64% | 2.6785714285714284 | 0.0025 |
| type: trailing | 82737 | 118 | 12 | 82.40% | 33.83% | 3 | 0.002 |
| type: trailing-only | 15912 | 118 | 12 | 82.98% | 34.39% | — | 0.0025 |
| lane: 5 | 43989 | 118 | 12 | 86.84% | 49.12% | 2.7040816326530615 | 0.00275 |

| Hour Vienna | Orders | Positions | Settled PF | Equity | Max DD so far | Exit settled |
|---|---|---|---:|---:|---:|---:|
| 10-17 11:00 CEST | 28/0/28 | 2/0/2 | — (flat/empty) | 9.999254 | 0.0081% | 0 |
| 10-17 12:00 CEST | 1/16/13 | 1/1/2 | — (flat/empty) | 9.999209 | 0.0111% | 16 |
| 10-17 13:00 CEST | 2/0/15 | 1/0/3 | — (flat/empty) | 9.998514 | 0.0152% | 0 |
| 10-17 14:00 CEST | 11/1/25 | 2/0/5 | 0.0000 | 9.998197 | 0.0202% | 1 |
| 10-17 15:00 CEST | 6/10/21 | 2/0/7 | 0.0460 | 9.997312 | 0.0278% | 10 |
| 10-17 16:00 CEST | 0/3/18 | 0/0/7 | 0.4074 | 9.996884 | 0.0316% | 3 |
| 10-17 17:00 CEST | 656/0/674 | 2/0/9 | — (flat/empty) | 9.992243 | 0.1339% | 0 |
| 10-17 18:00 CEST | 47/71/650 | 1/1/9 | 0.0105 | 10.003495 | 0.2591% | 4 |
| 10-17 19:00 CEST | 390/168/872 | 0/2/7 | 0.3665 | 9.959373 | 0.6483% | 3 |
| 10-17 20:00 CEST | 11/40/843 | 0/2/5 | 0.0784 | 9.903602 | 1.3531% | 12 |
| 10-17 21:00 CEST | 0/27/816 | 0/1/4 | 0.0002 | 9.869334 | 1.5416% | 3 |
| 10-17 22:00 CEST | 0/0/816 | 0/0/4 | — (flat/empty) | 9.876716 | 1.5785% | 0 |

## slices-0

Independent Exit Base: 28 / 663 source-lane pairs passed. Its holdout evaluated 6852 candidate configs and retained 31; 31 Exit configs were built. These are distinct stages, not order counts.

All Signal/Exit configs built: 126213 across 118 sources and 663 source lanes; missing configured cells: 0. At run start, 7259 configs had a passing exact symbol/direction context; 9812 / 3029112 all-orientation contexts passed all gates. Signals use independent exact-config qualification, not the representative Base-pair result.

| Executed range/type | Orders | Positions | PF (neutral 1) | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| Signals / all | 430/364/66 | 11/6/5 | 4.8548 | 1.316576 | 0.271190 |
| Signals / trailing | 320/262/58 | 9/4/5 | 4.4247 | 0.864724 | 0.195429 |
| Signals / trailing-only | 60/54/6 | 7/4/3 | 6.8465 | 0.139975 | 0.020445 |
| Signals / normal | 50/48/2 | 8/6/2 | 5.6381 | 0.311877 | 0.055316 |
| Exit / all | 19/18/1 | 1/0/1 | 0.0000 | 0.000000 | 0.158158 |
| Exit / exit:static-sl | 4/4/0 | 1/1/0 | 0.0000 | 0.000000 | 0.030491 |
| Exit / exit:breakeven | 2/2/0 | 1/1/0 | 0.0000 | 0.000000 | 0.015245 |
| Exit / exit:adaptive-sl | 2/2/0 | 1/1/0 | 0.0000 | 0.000000 | 0.019722 |
| Exit / exit:trailing | 4/4/0 | 1/1/0 | 0.0000 | 0.000000 | 0.037966 |
| Exit / exit:trailing-only | 7/6/1 | 1/0/1 | 0.0000 | 0.000000 | 0.054733 |

| Exit tactic | Orders | Positions | PF | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| static-sl | 4/4/0 | 1/1/0 | 0.0000 | 0.000000 | 0.030491 |
| adaptive-sl | 2/2/0 | 1/1/0 | 0.0000 | 0.000000 | 0.019722 |
| trailing | 4/4/0 | 1/1/0 | 0.0000 | 0.000000 | 0.037966 |
| breakeven | 2/2/0 | 1/1/0 | 0.0000 | 0.000000 | 0.015245 |
| trailing-only | 7/6/1 | 1/0/1 | 0.0000 | 0.000000 | 0.054733 |

| Range/type | Configs | Sources | Symbols | Configs with any Last-4 at start | All-orientation contexts Last-4 | Max SL/TP | Min trail gap |
|---|---:|---:|---:|---:|---:|---:|---:|
| type: exit | 31 | 4 | 12 | 100.00% | 44.22% | 2 | 0.00585 |
| strategyRange: Exit | 31 | 4 | 12 | 100.00% | 44.22% | 2 | 0.00585 |
| lane: 15 | 36747 | 118 | 12 | 78.07% | 39.74% | 3 | 0.002 |
| type: normal | 27625 | 118 | 12 | 82.16% | 32.84% | 3 | — |
| strategyRange: Signals | 126182 | 118 | 12 | 82.11% | 33.41% | 3 | 0.002 |
| lane: 1 | 45527 | 118 | 12 | 80.87% | 13.61% | 2.6785714285714284 | 0.0025 |
| type: trailing | 82645 | 118 | 12 | 81.99% | 33.49% | 3 | 0.002 |
| type: trailing-only | 15912 | 118 | 12 | 82.68% | 34.03% | — | 0.0025 |
| lane: 5 | 43939 | 118 | 12 | 86.79% | 48.66% | 2.7040816326530615 | 0.00275 |

| Hour Vienna | Orders | Positions | Settled PF | Equity | Max DD so far | Exit settled |
|---|---|---|---:|---:|---:|---:|
| 10-16 23:00 CEST | 216/26/190 | 7/1/6 | 1.6716 | 10.001795 | 0.0396% | 0 |
| 10-17 00:00 CEST | 0/85/105 | 0/0/6 | 0.2113 | 9.994125 | 0.0911% | 0 |
| 10-17 01:00 CEST | 0/0/105 | 0/0/6 | — (flat/empty) | 9.994219 | 0.0980% | 0 |
| 10-17 02:00 CEST | 0/3/102 | 0/0/6 | 0.0000 | 9.996869 | 0.0980% | 0 |
| 10-17 03:00 CEST | 19/21/100 | 0/0/6 | 0.0014 | 9.997030 | 0.0980% | 0 |
| 10-17 04:00 CEST | 0/4/96 | 0/0/6 | 0.3401 | 9.994624 | 0.0996% | 0 |
| 10-17 05:00 CEST | 42/7/131 | 4/0/10 | 0.0000 | 9.990808 | 0.1226% | 0 |
| 10-17 06:00 CEST | 113/124/120 | 0/2/8 | 5.3750 | 9.998516 | 0.1369% | 6 |
| 10-17 07:00 CEST | 59/69/110 | 0/1/7 | 28.4980 | 10.004272 | 0.1369% | 0 |
| 10-17 08:00 CEST | 0/27/83 | 0/0/7 | 31.7729 | 10.004452 | 0.1369% | 0 |
| 10-17 09:00 CEST | 0/16/67 | 0/1/6 | 0.2140 | 10.004867 | 0.1369% | 12 |
| 10-17 10:00 CEST | 0/0/67 | 0/0/6 | — (flat/empty) | 10.004389 | 0.1369% | 0 |

## slices-12

Independent Exit Base: 27 / 663 source-lane pairs passed. Its holdout evaluated 7896 candidate configs and retained 0; 0 Exit configs were built. These are distinct stages, not order counts.

All Signal/Exit configs built: 126279 across 118 sources and 663 source lanes; missing configured cells: 0. At run start, 7096 configs had a passing exact symbol/direction context; 9637 / 3030696 all-orientation contexts passed all gates. Signals use independent exact-config qualification, not the representative Base-pair result.

| Executed range/type | Orders | Positions | PF (neutral 1) | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| Signals / all | 852/271/581 | 1/0/1 | 0.0480 | 0.037326 | 0.777424 |
| Signals / trailing | 632/174/458 | 1/0/1 | 0.1159 | 0.025495 | 0.220064 |
| Signals / normal | 93/39/54 | 1/0/1 | 0.0000 | 0.000000 | 0.423199 |
| Signals / trailing-only | 127/58/69 | 1/0/1 | 0.0882 | 0.011831 | 0.134160 |

| Exit tactic | Orders | Positions | PF | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| static-sl | 0/0/0 | 0/0/0 | empty | 0 | 0 |
| adaptive-sl | 0/0/0 | 0/0/0 | empty | 0 | 0 |
| trailing | 0/0/0 | 0/0/0 | empty | 0 | 0 |
| breakeven | 0/0/0 | 0/0/0 | empty | 0 | 0 |
| trailing-only | 0/0/0 | 0/0/0 | empty | 0 | 0 |

| Range/type | Configs | Sources | Symbols | Configs with any Last-4 at start | All-orientation contexts Last-4 | Max SL/TP | Min trail gap |
|---|---:|---:|---:|---:|---:|---:|---:|
| type: normal | 27630 | 118 | 12 | 82.48% | 33.12% | 3 | — |
| strategyRange: Signals | 126279 | 118 | 12 | 82.49% | 33.75% | 3 | 0.002 |
| lane: 1 | 45530 | 118 | 12 | 81.17% | 13.64% | 2.6785714285714284 | 0.0025 |
| type: trailing | 82737 | 118 | 12 | 82.40% | 33.83% | 3 | 0.002 |
| type: trailing-only | 15912 | 118 | 12 | 82.98% | 34.39% | — | 0.0025 |
| lane: 5 | 43989 | 118 | 12 | 86.84% | 49.12% | 2.7040816326530615 | 0.00275 |
| lane: 15 | 36760 | 118 | 12 | 78.93% | 40.25% | 3 | 0.002 |

| Hour Vienna | Orders | Positions | Settled PF | Equity | Max DD so far | Exit settled |
|---|---|---|---:|---:|---:|---:|
| 10-17 11:00 CEST | 0/0/0 | 0/0/0 | — (flat/empty) | 10.000000 | 0.0000% | 0 |
| 10-17 12:00 CEST | 0/0/0 | 0/0/0 | — (flat/empty) | 10.000000 | 0.0000% | 0 |
| 10-17 13:00 CEST | 0/0/0 | 0/0/0 | — (flat/empty) | 10.000000 | 0.0000% | 0 |
| 10-17 14:00 CEST | 0/0/0 | 0/0/0 | — (flat/empty) | 10.000000 | 0.0000% | 0 |
| 10-17 15:00 CEST | 0/0/0 | 0/0/0 | — (flat/empty) | 10.000000 | 0.0000% | 0 |
| 10-17 16:00 CEST | 0/0/0 | 0/0/0 | — (flat/empty) | 10.000000 | 0.0000% | 0 |
| 10-17 17:00 CEST | 650/0/650 | 1/0/1 | — (flat/empty) | 9.994461 | 0.1116% | 0 |
| 10-17 18:00 CEST | 46/67/629 | 0/0/1 | 0.0000 | 10.005009 | 0.2328% | 0 |
| 10-17 19:00 CEST | 156/165/620 | 0/0/1 | 0.1814 | 9.972970 | 0.5001% | 0 |
| 10-17 20:00 CEST | 0/20/600 | 0/0/1 | 0.0000 | 9.933356 | 1.0028% | 0 |
| 10-17 21:00 CEST | 0/19/581 | 0/0/1 | 0.0000 | 9.908838 | 1.1368% | 0 |
| 10-17 22:00 CEST | 0/0/581 | 0/0/1 | — (flat/empty) | 9.914125 | 1.1631% | 0 |

## slices--12

Independent Exit Base: 30 / 663 source-lane pairs passed. Its holdout evaluated 5970 candidate configs and retained 14; 14 Exit configs were built. These are distinct stages, not order counts.

All Signal/Exit configs built: 126095 across 118 sources and 663 source lanes; missing configured cells: 0. At run start, 4161 configs had a passing exact symbol/direction context; 5045 / 3026280 all-orientation contexts passed all gates. Signals use independent exact-config qualification, not the representative Base-pair result.

| Executed range/type | Orders | Positions | PF (neutral 1) | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| Signals / all | 12274/8669/3605 | 23/13/10 | 2.0130 | 33.133748 | 16.460035 |
| Signals / normal | 1357/1059/298 | 27/17/10 | 0.8731 | 3.544842 | 4.060050 |
| Signals / trailing | 9270/6531/2739 | 26/16/10 | 2.2694 | 25.011643 | 11.021273 |
| Signals / trailing-only | 1647/1079/568 | 25/16/9 | 3.3200 | 4.577263 | 1.378712 |
| Exit / all | 3/3/0 | 1/1/0 | ∞ (no losses) | 0.009871 | 0.000000 |
| Exit / exit:adaptive-sl | 1/1/0 | 1/1/0 | ∞ (no losses) | 0.003290 | 0.000000 |
| Exit / exit:trailing | 2/2/0 | 1/1/0 | ∞ (no losses) | 0.006581 | 0.000000 |

| Exit tactic | Orders | Positions | PF | Gross unit gain | Gross unit loss |
|---|---|---|---:|---:|---:|
| static-sl | 0/0/0 | 0/0/0 | empty | 0 | 0 |
| adaptive-sl | 1/1/0 | 1/1/0 | ∞ (no losses) | 0.003290 | 0.000000 |
| trailing | 2/2/0 | 1/1/0 | ∞ (no losses) | 0.006581 | 0.000000 |
| breakeven | 0/0/0 | 0/0/0 | empty | 0 | 0 |
| trailing-only | 0/0/0 | 0/0/0 | empty | 0 | 0 |

| Range/type | Configs | Sources | Symbols | Configs with any Last-4 at start | All-orientation contexts Last-4 | Max SL/TP | Min trail gap |
|---|---:|---:|---:|---:|---:|---:|---:|
| type: exit | 14 | 2 | 12 | 100.00% | 38.10% | 0.4261363636363636 | 0.024275 |
| strategyRange: Exit | 14 | 2 | 12 | 100.00% | 38.10% | 0.4261363636363636 | 0.024275 |
| lane: 15 | 36721 | 118 | 12 | 75.07% | 37.13% | 3 | 0.002 |
| type: normal | 27625 | 118 | 12 | 78.03% | 30.75% | 3 | — |
| strategyRange: Signals | 126081 | 118 | 12 | 78.03% | 31.06% | 3 | 0.002 |
| lane: 1 | 45526 | 118 | 12 | 73.15% | 12.43% | 2.6785714285714284 | 0.0025 |
| type: trailing | 82544 | 118 | 12 | 77.92% | 31.05% | 3 | 0.002 |
| type: trailing-only | 15912 | 118 | 12 | 78.58% | 31.66% | — | 0.0025 |
| lane: 5 | 43848 | 118 | 12 | 85.57% | 45.33% | 2.7040816326530615 | 0.00275 |

| Hour Vienna | Orders | Positions | Settled PF | Equity | Max DD so far | Exit settled |
|---|---|---|---:|---:|---:|---:|
| 10-16 11:00 CEST | 0/0/0 | 0/0/0 | — (flat/empty) | 10.000000 | 0.0000% | 0 |
| 10-16 12:00 CEST | 69/37/32 | 2/0/2 | 29.1667 | 10.001622 | 0.0131% | 0 |
| 10-16 13:00 CEST | 627/135/524 | 3/0/5 | 0.1318 | 9.996770 | 0.0995% | 0 |
| 10-16 14:00 CEST | 604/489/639 | 1/1/5 | 7.6658 | 10.026705 | 0.0995% | 0 |
| 10-16 15:00 CEST | 474/424/689 | 5/1/9 | 8.7709 | 10.019680 | 0.2392% | 0 |
| 10-16 16:00 CEST | 199/342/546 | 3/1/11 | 3.1439 | 10.049145 | 0.3896% | 0 |
| 10-16 17:00 CEST | 1494/901/1139 | 6/3/14 | 2.0368 | 10.064821 | 0.3896% | 0 |
| 10-16 18:00 CEST | 1055/399/1795 | 0/2/12 | 0.9040 | 10.055664 | 1.1805% | 0 |
| 10-16 19:00 CEST | 3046/2320/2521 | 2/4/10 | 3.8378 | 10.142653 | 2.3327% | 0 |
| 10-16 20:00 CEST | 2656/1479/3698 | 1/1/10 | 4.7822 | 10.196795 | 2.5580% | 0 |
| 10-16 21:00 CEST | 2053/1827/3924 | 0/0/10 | 0.3588 | 9.944971 | 4.8760% | 0 |
| 10-16 22:00 CEST | 0/319/3605 | 0/0/10 | 0.0219 | 9.839222 | 5.5674% | 3 |
