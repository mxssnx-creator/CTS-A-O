# Twenty-two-symbol source study — completed results

Both frozen 24-hour windows completed and independently reconciled **16/16 checks**. The final window has positive settled returns, but both modeled accounts are financially infeasible. Signals and trailing-only have no funded settled closes. No configuration was pruned and no live promotion is authorized.

## Frozen scope and accounting

The fixed universe contains BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, LINK, LTC, DOT, ATOM, APT, NEAR, SUI, TRX, UNI, FIL, ETC, ARB, OP and XLM against USDT. Native Binance USD-M history, modeled round-trip cost 0.15%, $10 starting balance, 10× leverage and 0.1% equity sizing are common. Each session has six evaluated prehistory hours, with older indicator-only warmup fenced by `evaluationFromT`. Selection trades 13 October 15:00–14 October 15:00 UTC; final trades 15 October 21:00–16 October 21:00 UTC. Final retains the predeclared all-range control: selection found no eligible research-pruning subset.

Primary PF uses post-Base/config-qualified, positively allocated **canonical unit net returns**. External execution multipliers are removed; intrinsic ladder semantics remain. Equal-$1 cash-return PF uses the same base-one return arithmetic. **Sized-dollar PF** below weights the actual allocated cash returns once and is diagnostic. Endpoint marks are separate from settled PF. Empty PF is unavailable; “no loss” is an unbounded measured ratio, with any finite gate sentinel kept separate.

“Funded” means positive modeled allocation, not a proven exchange fill or financeable account. The frozen position/gross balance ratios are 0/0 (uncapped exposure). Orders/configs remain distinct from the 100 Symbol×Direction exchange position ceiling. Live is disabled; no liquidation is invented for an insolvent modeled account.

## Actual outcomes

| Window | Funded settled closes | Unit PF | Sized-dollar PF diagnostic | Settled cash net $ | Cash-positive hours | Unit-PF-positive hours |
|---|---:|---:|---:|---:|---:|---:|
| Selection | 127,501 | 0.7482100874336749 | 0.5577795858920908 | −27.70922118 | 10/24 | 11/24 |
| Untouched final | 127,210 | 1.4597019133430162 | 1.387921086678422 | +15.40882058 | 16/24 | 13/24 |

Engine and combined cohorts are identical in these sessions: each trades all 22 symbols. Every Signal strategy type is empty. Selection has 44,652 executed exact configs and 126,582 additional planned closes with zero allocation; final has 24,065 executed configs and no zero allocations. Empty/zero-funded rows never inflate primary funded PF.

| Window | End balance $ | End marked equity $ | Minimum marked equity $ | Marked max DD | Peak modeled margin $ | Feasible | Endpoint open orders |
|---|---:|---:|---:|---:|---:|---|---:|
| Selection | −17.709221 | −27.496041 | −29.602125 | 368.5843% | 443.333509 | false | 77,773 |
| Untouched final | 25.408821 | 16.572633 | 0.062921 | 99.4610% | 269.209240 | false | 9,302 |

The final account's positive closed cash and 16 cash-positive hours do not establish acceptable risk: marked equity falls to $0.062921, peak margin reaches $269.209240 and reported drawdown is 99.4610%. These are report-model diagnostics with intrinsic ladder limitations, rather than a verified venue liquidation/funding path.

## Base/config progression and Signals

| Window | Engine Base pairs passed/evaluated | Run-start config cells passed/evaluated | Representative Signal Base diagnostic |
|---|---:|---:|---:|
| Selection | 261/854 | 55,985/215,948 | 1/126 |
| Final | 113/854 | 29,196/85,068 | 0/126 |

Run-start config counts, representative Base pairs, later exact Signal gates, endpoint paper snapshots and funded closes have distinct denominators. The Signal representative Base diagnostic uses floor 1.0; the corrected exact historical/Last-N Signal floor remains 1.1. Selection later records 1,150 `signalValid`, 49 `signalPf`, 223 confirmation and 51 cluster skips; final records 763 `signalValid`, 271 `signalSide`, 43 `signalPf` and 34 cluster skips. Endpoint paper snapshots show 137/489 Signal configs respectively, while both funded settled Signal samples remain empty. These counts provide no reason to waive history or PF qualification.

### Exact Signal activation-to-entry flow

The representative Signal Base counts above are diagnostics: `baseGate=false`, so they are not a blanket entry veto. All three protection types and both directions activate. Every active entry attempt is explained by a recorded first failing causal gate; none passes all gates, and zero reaches funding. There is no unexplained activation-to-funding loss in these captures.

| Window | Active entry attempts | Own `signalValid` | Confirmation | Side gate | Own PF | Cluster | Taken |
|---|---:|---:|---:|---:|---:|---:|---:|
| Selection | 1,473 | 1,150 | 223 | 0 | 49 | 51 | 0 |
| Final | 1,111 | 763 | 0 | 271 | 43 | 34 | 0 |

Each row's first-failure counters sum exactly to its active-attempt count. `signalValid` combines the config's last 25 outcomes, minimum five observations, minimum unit PF 1.1 and drawdown checks; the artifact does not split that failure into sample/PF/drawdown components. These failures cannot all be called insufficient history. The captured settled active-candidate counts (1,446/949) exclude open attempts and use a different denominator; they are not funded closes. Endpoint paper snapshots (137/489 configs) are another phase.


## Types, ranges and directions

The following exact cohort tables come from the independent reconciliation. Displayed PF is rounded; full precision and every empty group remain in `audit.json`.

### Selection

**Type**

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Engine · dca | 898 | 22 | 1.0234 | -0.11051768 |
| Engine · normal | 44559 | 22 | 0.8972 | -8.00686358 |
| Engine · trailing | 82044 | 22 | 0.6414 | -19.59183991 |

**Range**

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Micro | 68672 | 22 | 0.6879 | -14.94571948 |
| Minimal | 57885 | 22 | 0.7990 | -12.66786020 |
| Short | 46 | 5 | 3.0763 | 0.01487619 |
| Wide | 898 | 22 | 1.0234 | -0.11051768 |
| Minimal plus | 0 | 0 | empty | 0.00000000 |
| General | 0 | 0 | empty | 0.00000000 |
| Long | 0 | 0 | empty | 0.00000000 |
| Signals | 0 | 0 | empty | 0.00000000 |

**Direction**

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Long | 40983 | 22 | 2.4263 | 12.79218432 |
| Short | 86518 | 22 | 0.4970 | -40.50140550 |

### Untouched final

**Type**

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Engine · dca | 1832 | 22 | 1.9592 | 0.94555962 |
| Engine · normal | 37721 | 22 | 1.4325 | 5.47334741 |
| Engine · trailing | 87657 | 22 | 1.4627 | 8.98991355 |

**Range**

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Micro | 71854 | 22 | 1.7211 | 11.30373015 |
| Minimal | 53450 | 22 | 1.2237 | 3.15891805 |
| Short | 74 | 2 | 1.5415 | 0.00061276 |
| Wide | 1832 | 22 | 1.9592 | 0.94555962 |
| Minimal plus | 0 | 0 | empty | 0.00000000 |
| General | 0 | 0 | empty | 0.00000000 |
| Long | 0 | 0 | empty | 0.00000000 |
| Signals | 0 | 0 | empty | 0.00000000 |

**Direction**

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Long | 68885 | 22 | 0.8690 | -12.10485411 |
| Short | 58325 | 22 | 3.9709 | 27.51367469 |

## Every hour, including directions and protection types

All hours below contain Engine funded closes; Signals are empty throughout. Normal is TP/SL, Trailing is capped Normal+Trailing, and trailing-only is empty. DCA contributes the remainder where Normal + Trailing counts are below the total. Account table PF columns distinguish primary unit PF from sized-dollar PF. Equity and margin are separate marked account diagnostics. Boundary closes belong to the preceding hour.

### Selection — account and settled execution

| UTC hour | Funded closes | Unit PF | Sized-dollar PF diagnostic | Sized cash net $ | Marked equity $ | Peak margin $ |
|---|---:|---:|---:|---:|---:|---:|
| 2026-10-13 15:00 | 15,205 | 4.9486 | 8.1716 | 1.95288693 | 7.374497 | 170.574636 |
| 2026-10-13 16:00 | 16,600 | 4.3707 | 4.2212 | 4.93519971 | 7.942234 | 240.310284 |
| 2026-10-13 17:00 | 7,901 | 2.1163 | 2.0036 | 1.60041393 | 4.653544 | 375.051052 |
| 2026-10-13 18:00 | 19,572 | 0.6374 | 0.5282 | -6.35819820 | -9.030129 | 443.333509 |
| 2026-10-13 19:00 | 18,715 | 0.6361 | 0.4186 | -8.37302356 | -13.616298 | 438.185595 |
| 2026-10-13 20:00 | 9,917 | 0.3917 | 0.1444 | -4.52554499 | -24.905859 | 352.278197 |
| 2026-10-13 21:00 | 4,551 | 0.4768 | 0.1519 | -2.98279949 | -20.415032 | 324.685835 |
| 2026-10-13 22:00 | 4,586 | 13.5541 | 14.6349 | 2.36138112 | -7.980183 | 301.216879 |
| 2026-10-13 23:00 | 1,649 | 15.7721 | 14.2850 | 0.53846409 | -7.815215 | 267.999466 |
| 2026-10-14 00:00 | 4,377 | 0.1489 | 0.1112 | -6.13823181 | -11.526834 | 257.133578 |
| 2026-10-14 01:00 | 2,511 | 2.2572 | 2.9075 | 0.25123480 | -19.485810 | 220.428301 |
| 2026-10-14 02:00 | 519 | 2.0511 | 2.1036 | 0.09463976 | -23.865611 | 202.551278 |
| 2026-10-14 03:00 | 910 | 0.5634 | 0.7909 | -0.08131010 | -25.009191 | 198.377120 |
| 2026-10-14 04:00 | 937 | 4.5945 | 5.6047 | 0.32560825 | -23.770063 | 192.522084 |
| 2026-10-14 05:00 | 1,844 | 1.1068 | 0.9810 | -0.01843812 | -20.063565 | 186.121576 |
| 2026-10-14 06:00 | 2,498 | 0.1226 | 0.1974 | -0.15554177 | -22.362336 | 172.519779 |
| 2026-10-14 07:00 | 2,426 | 0.1144 | 0.1090 | -1.28757108 | -24.313433 | 168.344271 |
| 2026-10-14 08:00 | 2,122 | 0.4731 | 0.4404 | -0.53250228 | -26.535044 | 150.140964 |
| 2026-10-14 09:00 | 3,102 | 0.1117 | 0.0775 | -3.98960452 | -28.732500 | 134.485638 |
| 2026-10-14 10:00 | 3,698 | 0.0691 | 0.0285 | -5.36465693 | -28.135299 | 106.719058 |
| 2026-10-14 11:00 | 510 | 0.0087 | 0.0103 | -0.17001612 | -28.246341 | 72.299403 |
| 2026-10-14 12:00 | 1,939 | 3.2066 | 2.5296 | 0.61718081 | -26.477568 | 71.004243 |
| 2026-10-14 13:00 | 676 | 1.3622 | 1.2280 | 0.05766113 | -27.247061 | 59.201363 |
| 2026-10-14 14:00 | 736 | 0.1234 | 0.1459 | -0.46645271 | -27.496041 | 55.632089 |

### Selection — direction and protection type

Cells show funded closes / unit PF.

| UTC hour | Long | Short | Normal | Normal + trailing | Trailing-only closes |
|---|---|---|---|---|---:|
| 2026-10-13 15:00 | 4809 / 0.8161 | 10396 / 18.9409 | 4438 / 6.3171 | 10722 / 4.1902 | 0 |
| 2026-10-13 16:00 | 9638 / 14.4819 | 6962 / 1.5969 | 4030 / 5.1999 | 12472 / 3.9895 | 0 |
| 2026-10-13 17:00 | 2947 / 3.2609 | 4954 / 1.6273 | 2362 / 3.4749 | 5498 / 1.4303 | 0 |
| 2026-10-13 18:00 | 7798 / 28.6018 | 11774 / 0.1877 | 6408 / 0.7676 | 13048 / 0.5339 | 0 |
| 2026-10-13 19:00 | 6481 / 91.3291 | 12234 / 0.2654 | 6012 / 0.8033 | 12570 / 0.5560 | 0 |
| 2026-10-13 20:00 | 1886 / 22.3594 | 8031 / 0.2470 | 2850 / 0.3957 | 6996 / 0.3851 | 0 |
| 2026-10-13 21:00 | 886 / 6.5200 | 3665 / 0.3594 | 1842 / 0.6388 | 2684 / 0.3229 | 0 |
| 2026-10-13 22:00 | 155 / 0.0308 | 4431 / 48.5575 | 2168 / 12.2327 | 2338 / 16.8634 | 0 |
| 2026-10-13 23:00 | 119 / 0.0939 | 1530 / 31.6265 | 686 / no loss | 882 / 16.2801 | 0 |
| 2026-10-14 00:00 | 1225 / 66.3906 | 3152 / 0.0155 | 2014 / 0.2374 | 2298 / 0.0587 | 0 |
| 2026-10-14 01:00 | 249 / 0.1982 | 2262 / 3.2640 | 516 / 9.5194 | 1954 / 0.3851 | 0 |
| 2026-10-14 02:00 | 99 / 2.5004 | 420 / 1.9534 | 272 / 9.5406 | 174 / 1.2965 | 0 |
| 2026-10-14 03:00 | 514 / 1.7270 | 396 / 0.2496 | 382 / 0.9374 | 504 / 0.3057 | 0 |
| 2026-10-14 04:00 | 263 / 27.0696 | 674 / 3.3971 | 474 / 8.5464 | 458 / 1.9480 | 0 |
| 2026-10-14 05:00 | 536 / 0.0124 | 1308 / no loss | 1180 / 1.2382 | 664 / 0.8953 | 0 |
| 2026-10-14 06:00 | 670 / 0.0000 | 1828 / 0.2555 | 1273 / 0.2234 | 1225 / 0.0646 | 0 |
| 2026-10-14 07:00 | 830 / 0.2944 | 1596 / 0.0631 | 1174 / 0.1812 | 1252 / 0.0705 | 0 |
| 2026-10-14 08:00 | 931 / 0.9423 | 1191 / 0.2437 | 1127 / 0.7620 | 995 / 0.2200 | 0 |
| 2026-10-14 09:00 | 288 / 0.0130 | 2814 / 0.1344 | 1525 / 0.1966 | 1577 / 0.0526 | 0 |
| 2026-10-14 10:00 | 103 / 0.0000 | 3595 / 0.0719 | 1485 / 0.0974 | 2213 / 0.0507 | 0 |
| 2026-10-14 11:00 | 1 / 0.0000 | 509 / 0.0088 | 269 / 0.0066 | 241 / 0.0116 | 0 |
| 2026-10-14 12:00 | 141 / 0.0000 | 1798 / 140.5930 | 1403 / 3.3510 | 536 / 2.9081 | 0 |
| 2026-10-14 13:00 | 136 / 0.0000 | 540 / no loss | 359 / 1.2046 | 317 / 1.6009 | 0 |
| 2026-10-14 14:00 | 278 / 0.0000 | 458 / 0.3106 | 310 / 0.1516 | 426 / 0.1020 | 0 |

### Untouched final — account and settled execution

| UTC hour | Funded closes | Unit PF | Sized-dollar PF diagnostic | Sized cash net $ | Marked equity $ | Peak margin $ |
|---|---:|---:|---:|---:|---:|---:|
| 2026-10-15 21:00 | 11,535 | 3.5422 | 3.1362 | 1.38658910 | 0.203094 | 160.001444 |
| 2026-10-15 22:00 | 20,047 | 12.3279 | 10.4127 | 7.16127855 | 12.340452 | 160.682605 |
| 2026-10-15 23:00 | 2,829 | 0.1408 | 0.0614 | -2.83574242 | 7.630359 | 88.856595 |
| 2026-10-16 00:00 | 3,173 | 0.3136 | 0.2323 | -1.88343056 | 9.510528 | 86.868043 |
| 2026-10-16 01:00 | 5,380 | 2.0216 | 1.9241 | 1.30417093 | 10.971806 | 80.124156 |
| 2026-10-16 02:00 | 2,493 | 0.8869 | 1.0712 | 0.06926967 | 12.261594 | 43.449789 |
| 2026-10-16 03:00 | 3,918 | 0.7233 | 0.7797 | -0.28362740 | 11.965308 | 54.676089 |
| 2026-10-16 04:00 | 490 | 0.7645 | 0.6208 | -0.04618450 | 11.979134 | 38.555017 |
| 2026-10-16 05:00 | 1,267 | 0.8596 | 0.7048 | -0.12644825 | 12.121593 | 43.567787 |
| 2026-10-16 06:00 | 416 | 0.8495 | 2.4998 | 0.10220519 | 12.066977 | 40.725220 |
| 2026-10-16 07:00 | 462 | 2.1777 | 3.4206 | 0.12578334 | 12.039998 | 38.593223 |
| 2026-10-16 08:00 | 1,085 | 0.2433 | 0.2628 | -1.09552610 | 12.137639 | 37.052202 |
| 2026-10-16 09:00 | 772 | 0.1355 | 0.3480 | -0.32576523 | 12.025746 | 32.499636 |
| 2026-10-16 10:00 | 434 | 1.0324 | 1.7992 | 0.05911165 | 12.005205 | 29.011074 |
| 2026-10-16 11:00 | 1,090 | 1.7254 | 1.8758 | 0.16384867 | 12.268163 | 33.447736 |
| 2026-10-16 12:00 | 1,672 | 1.5057 | 2.0402 | 0.39659834 | 11.103978 | 67.197209 |
| 2026-10-16 13:00 | 5,556 | 2.0649 | 2.1647 | 0.63966236 | 8.888182 | 139.125150 |
| 2026-10-16 14:00 | 6,381 | 1.4799 | 1.5824 | 0.72221790 | 9.612848 | 172.847610 |
| 2026-10-16 15:00 | 21,158 | 1.7964 | 1.5104 | 3.68159651 | 10.819188 | 269.209240 |
| 2026-10-16 16:00 | 11,527 | 1.5182 | 1.6086 | 1.98612762 | 11.722268 | 269.125949 |
| 2026-10-16 17:00 | 17,077 | 0.9611 | 1.0493 | 0.59061853 | 15.499642 | 239.685694 |
| 2026-10-16 18:00 | 4,628 | 6.5426 | 6.9496 | 3.38277571 | 16.825343 | 181.931064 |
| 2026-10-16 19:00 | 3,007 | 1.2472 | 1.5692 | 0.42132407 | 17.002746 | 141.792691 |
| 2026-10-16 20:00 | 813 | 0.3759 | 0.4131 | -0.18763310 | 16.572633 | 138.316709 |

### Untouched final — direction and protection type

Cells show funded closes / unit PF.

| UTC hour | Long | Short | Normal | Normal + trailing | Trailing-only closes |
|---|---|---|---|---|---:|
| 2026-10-15 21:00 | 11311 / 3.8512 | 224 / 0.3846 | 3820 / 8.4192 | 7680 / 2.2770 | 0 |
| 2026-10-15 22:00 | 19635 / 18.1418 | 412 / 0.4536 | 7112 / 15.8943 | 12852 / 10.3915 | 0 |
| 2026-10-15 23:00 | 1902 / 0.0037 | 927 / 41.8096 | 1230 / 0.1381 | 1594 / 0.1408 | 0 |
| 2026-10-16 00:00 | 2161 / 0.1762 | 1012 / 18.6084 | 1308 / 0.2598 | 1856 / 0.4138 | 0 |
| 2026-10-16 01:00 | 4825 / 4.0040 | 555 / 0.0900 | 2582 / 2.1325 | 2770 / 1.7816 | 0 |
| 2026-10-16 02:00 | 1751 / 1.6689 | 742 / 0.3039 | 960 / 0.7900 | 1522 / 1.0023 | 0 |
| 2026-10-16 03:00 | 965 / 0.1598 | 2953 / 4.3248 | 576 / 0.2913 | 3334 / 1.3180 | 0 |
| 2026-10-16 04:00 | 433 / 2.5673 | 57 / 0.1902 | 46 / 9.9167 | 442 / 0.2959 | 0 |
| 2026-10-16 05:00 | 1046 / 6.2358 | 221 / 0.1043 | 134 / 3.6760 | 1108 / 0.7018 | 0 |
| 2026-10-16 06:00 | 332 / 5.6759 | 84 / 0.0990 | 112 / 2.3860 | 292 / 0.4899 | 0 |
| 2026-10-16 07:00 | 357 / 3.6503 | 105 / 1.1819 | 94 / 3.0145 | 366 / 1.7464 | 0 |
| 2026-10-16 08:00 | 618 / 0.1119 | 467 / 1.1769 | 409 / 0.2431 | 643 / 0.2217 | 0 |
| 2026-10-16 09:00 | 403 / 16.0553 | 369 / 0.0090 | 192 / 0.2136 | 568 / 0.0874 | 0 |
| 2026-10-16 10:00 | 303 / 1.7494 | 131 / 0.4073 | 96 / 1.8641 | 317 / 0.7045 | 0 |
| 2026-10-16 11:00 | 900 / 36.1020 | 190 / 0.1292 | 204 / 2.1925 | 851 / 1.4699 | 0 |
| 2026-10-16 12:00 | 1016 / 7.2350 | 656 / 0.6102 | 578 / 1.6614 | 1016 / 1.2677 | 0 |
| 2026-10-16 13:00 | 1657 / 1.7800 | 3899 / 2.2983 | 855 / 3.0198 | 4649 / 1.6401 | 0 |
| 2026-10-16 14:00 | 3058 / 3.0284 | 3323 / 0.9252 | 1510 / 1.8476 | 4796 / 1.2474 | 0 |
| 2026-10-16 15:00 | 6196 / 0.2802 | 14962 / 34.3789 | 6620 / 1.4506 | 14292 / 1.9909 | 0 |
| 2026-10-16 16:00 | 3383 / 0.2841 | 8144 / 11.5611 | 2769 / 1.9212 | 8618 / 1.2477 | 0 |
| 2026-10-16 17:00 | 5445 / 0.1003 | 11632 / 34.7940 | 5251 / 0.9171 | 11241 / 0.9417 | 0 |
| 2026-10-16 18:00 | 238 / 0.0053 | 4390 / 62.8061 | 940 / 7.5718 | 3508 / 5.8737 | 0 |
| 2026-10-16 19:00 | 666 / 0.6675 | 2341 / 2.2860 | 213 / 2.3661 | 2694 / 1.8510 | 0 |
| 2026-10-16 20:00 | 284 / 0.1821 | 529 / 0.7291 | 110 / 0.2315 | 648 / 0.9804 | 0 |

## Pruning and resource findings

No exact config/direction cell meets the frozen sample/symbol/persistent-loss criteria; the selection audit produced **zero research pruning proposals**. Range-level aggregate losses cannot replace exact-cell evidence. The positive Short aggregate is also thin: selection has 46 closes over five symbols; final has 74 over only two. Empty/insufficient cells stay enabled. The final check is not a new selection opportunity.

| Window | Capture runtime seconds | Strategy compute seconds | Reported peak RSS MB | Fallback count | Independent checks |
|---|---:|---:|---:|---:|---|
| Selection | 157 | 99.055 | 6,769 | 0 | 16/16 pass |
| Untouched final | 70 | 65.190 | 3,157 | 0 | 16/16 pass |

Lossless sidecars preserve every tape, validation and allocation row with byte/count/order/SHA checks. Independent audits match CI math/cohort/account/hourly output, apart from generation time. Simulation resource numbers above are distinct from local independent audit timings (selection 153.48 seconds, final 46.22 seconds). No strategy/default changes were fitted to these outcomes.

The DCA engine endpoint return and account minute mark use different entry bases, as documented in the [development report](development20-results-20261017.md#endpoint-dca-mark-basis-discrepancy). Settled unit/cash accounting is independently reconciled; account minute/endpoint fields retain their stated report-model basis. Fixing the small contribution-export mismatch is separate from reconstructing actual timed ladder-leg holdings.

## Exact evidence

[Actions run 39077484680](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077484680), remote head `c62701343668b5b87f2bfd5644eb46ff0f44b4f5`. The feed SHA256 is `84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`. Protocols and source seals define each exact arm; no earlier capture failure or virtual console PF substitutes for these completed funded outputs.

| Window | Artifact ID | Verified ZIP SHA256 | Frozen protocol SHA256 |
|---|---:|---|---|
| Selection | 12117726795 | `ca0b1d2536b5d7211e995bb3beee4aa57d0ab3024a4f5b77dd396a4fc8d6e71c` | `60eb59bfe1028c1e4d35b368c6a56505289fed0adac9ca733373858be9e57b50` |
| Untouched final | 12117618959 | `72f6eb424dca80665acf0645d69b15ee30a5d0bf6407bbeabb270e0d57e0a899` | `d8e9ff14e65674e7905f3ad7b0e6a1ab1c8503a2fe828d1d21f1e19ce02e4a60` |

Preserved case roots: `runs/exact-signal-study-ci-v3/{selection22,final22}/`. Each includes the exact ZIP and safe extraction receipt; `artifact/` contains raw/report headers, every referenced sidecar, freeze/source proofs and the complete CI audit. `independent/` contains reconciled `audit.json`, `audit.md`, `detailed-hourly.json`, `detailed-hourly.md` and gate-flow summaries. Source/account execution evidence remains offline modeled evidence.
