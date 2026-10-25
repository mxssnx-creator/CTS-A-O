# Frozen recovery comparison

Retrospective funded modeled post-Base execution; no venue profitability claim. PF 1 is neutral; modeled costs are 0.15% once. Losses and endpoint holdings are retained. The two reused windows are not untouched forward evidence.

Source: `9a088c40224a49e9f98cf1ba0f36f302e0dcf2abcc45b2ed179f3701c59644f3`. Eight broad ordinary arms remain separate; no completion claimed here.

| Case | Settled unit PF | Orders opened / settled / held | Positions opened / closed / held | Peak equity DD % | Ending equity change % | Native wall s / peak child MiB |
|---|---:|---|---|---:|---:|---|
| control-0 | 4.9611 | 449 / 366 / 83 | 14 / 6 / 8 | 0.1316 | 0.0613 | 642.5 / 3557.7 |
| control-12 | 0.0679 | 860 / 278 / 582 | 4 / 2 / 2 | 1.1700 | -0.8572 | 663.9 / 3872.6 |
| dca-unit-0 | 2.7134 | 410 / 327 / 83 | 14 / 6 / 8 | 0.1359 | 0.0068 | 404.5 / 3983.1 |
| dca-unit-12 | 0.0643 | 960 / 282 / 678 | 4 / 2 / 2 | 1.4299 | -1.0402 | 708.7 / 3959.1 |
| dca-weighted-0 | 2.7359 | 411 / 328 / 83 | 14 / 6 / 8 | 0.1360 | 0.0075 | 413.7 / 3979.7 |
| dca-weighted-12 | 0.0643 | 976 / 282 / 694 | 4 / 2 / 2 | 1.6444 | -1.1409 | 705.4 / 3975.0 |
| dca-active-0 | 2.9802 | 395 / 312 / 83 | 14 / 6 / 8 | 0.1316 | 0.0085 | 425.7 / 4311.1 |
| dca-active-12 | 0.0679 | 860 / 278 / 582 | 4 / 2 / 2 | 1.1700 | -0.8572 | 705.0 / 3990.6 |
| dca-block-0 | 2.7134 | 410 / 327 / 83 | 14 / 6 / 8 | 0.1359 | 0.0068 | 709.5 / 3955.5 |
| dca-block-12 | 0.0643 | 960 / 282 / 678 | 4 / 2 / 2 | 1.4306 | -1.0408 | 690.8 / 3971.4 |

Counts are modeled funded configuration orders and overlapping symbol/direction position episodes. Native runtime plus export timing is host dependent; these timings do not establish a controlled speedup.

## control-0

12 symbols; 118 sources; 663 source/lane pairs; 126,249 configs; 10,764,881 historical closes; 0 missing configured cells. 366 exact settled matches, zero missing/mismatched returns. 39,389,688 scalar comparisons. Green/red/flat hours: 5/5/2. Endpoint held MTM: -0.004431.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| parameterRange | short | 61711 | 37.41 | 85.46 | 5802 | 4.7069 | 6.4266 | 272 / 237 / 35 | 9 / 4 / 5 |
| strategyRange | Exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| lane | 15 | 36783 | 40.19 | 78.94 | 1639 | 5.1350 | 2.9737 | 295 / 212 / 83 | 12 / 4 / 8 |
| parameterRange | medium | 61664 | 29.17 | 78.69 | 3242 | 4.6450 | 3.0172 | 165 / 117 / 48 | 12 / 5 / 7 |
| type | normal | 27625 | 33.11 | 82.48 | 871 | 2.7399 | 5.6222 | 49 / 47 / 2 | 8 / 6 / 2 |
| strategyRange | Signals | 126182 | 33.71 | 82.48 | 9540 | 4.6024 | 4.9274 | 425 / 359 / 66 | 11 / 6 / 5 |
| lane | 1 | 45527 | 13.64 | 81.17 | 354 | 4.5056 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82645 | 33.79 | 82.38 | 7232 | 5.1729 | 4.5205 | 316 / 258 / 58 | 9 / 4 / 5 |
| type | trailing-only | 15912 | 34.39 | 82.98 | 1437 | 4.6175 | 6.8465 | 60 / 54 / 6 | 7 / 4 / 3 |
| lane | 5 | 43939 | 49.10 | 86.82 | 7641 | 4.5559 | 12.0335 | 154 / 154 / 0 | 4 / 4 / 0 |
| parameterRange | short+medium | 2874 | 51.78 | 100.00 | 590 | 3.9734 | 10.2709 | 12 / 12 / 0 | 4 / 4 / 0 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-16 21:00 | 1.6716 | 222 / 26 / 196 | 8 / 1 / 7 | 10.002178 | 0.0430 |
| 10-16 22:00 | 0.2681 | 0 / 91 / 105 | 0 / 1 / 6 | 9.994201 | 0.0958 |
| 10-16 23:00 | empty | 0 / 0 / 105 | 0 / 0 / 6 | 9.994295 | 0.1010 |
| 10-17 00:00 | 0.0000 | 14 / 3 / 116 | 2 / 0 / 8 | 9.996793 | 0.1010 |
| 10-17 01:00 | 0.0014 | 2 / 21 / 97 | 0 / 0 / 8 | 9.997400 | 0.1010 |
| 10-17 02:00 | 0.3401 | 2 / 4 / 95 | 0 / 0 / 8 | 9.995141 | 0.1010 |
| 10-17 03:00 | 0.0742 | 42 / 8 / 129 | 4 / 0 / 12 | 9.991507 | 0.1206 |
| 10-17 04:00 | 13.6377 | 113 / 118 / 124 | 0 / 2 / 10 | 9.999485 | 0.1316 |
| 10-17 05:00 | 28.4980 | 54 / 69 / 109 | 0 / 1 / 9 | 10.005523 | 0.1316 |
| 10-17 06:00 | 4.0000 | 0 / 22 / 87 | 0 / 0 / 9 | 10.005864 | 0.1316 |
| 10-17 07:00 | 4.0000 | 0 / 4 / 83 | 0 / 1 / 8 | 10.006518 | 0.1316 |
| 10-17 08:00 | empty | 0 / 0 / 83 | 0 / 0 / 8 | 10.006134 | 0.1316 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 78, "block": 26}`. This is an admission diagnostic, not permission to bypass later gates.

## control-12

12 symbols; 118 sources; 663 source/lane pairs; 126,289 configs; 10,999,508 historical closes; 0 missing configured cells. 278 exact settled matches, zero missing/mismatched returns. 39,402,168 scalar comparisons. Green/red/flat hours: 0/4/8. Endpoint held MTM: -0.078471.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| parameterRange | short | 61742 | 38.03 | 85.52 | 6952 | 4.6319 | 0.0904 | 476 / 176 / 300 | 4 / 2 / 2 |
| strategyRange | Exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| lane | 15 | 36770 | 41.28 | 79.67 | 1913 | 4.8244 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| type | normal | 27630 | 33.65 | 82.65 | 1068 | 2.8439 | 0.0000 | 93 / 39 / 54 | 1 / 0 / 1 |
| strategyRange | Signals | 126279 | 34.31 | 82.72 | 11416 | 4.6037 | 0.0480 | 852 / 271 / 581 | 1 / 0 / 1 |
| lane | 1 | 45530 | 13.64 | 81.17 | 374 | 4.4176 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82737 | 34.43 | 82.66 | 8683 | 5.1488 | 0.1159 | 632 / 174 / 458 | 1 / 0 / 1 |
| type | trailing-only | 15912 | 34.86 | 83.15 | 1665 | 4.5862 | 0.0882 | 127 / 58 / 69 | 1 / 0 / 1 |
| lane | 5 | 43989 | 49.88 | 86.88 | 9149 | 4.5774 | 0.0480 | 852 / 271 / 581 | 1 / 0 / 1 |
| parameterRange | medium | 61666 | 29.74 | 79.11 | 3796 | 4.6149 | 0.0425 | 268 / 94 / 174 | 1 / 0 / 1 |
| parameterRange | short+medium | 2881 | 52.44 | 100.00 | 688 | 4.3572 | 0.0280 | 116 / 8 / 108 | 1 / 0 / 1 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-17 09:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 10:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 11:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 12:00 | empty | 5 / 0 / 5 | 2 / 0 / 2 | 10.000179 | 0.0009 |
| 10-17 13:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 10.000098 | 0.0017 |
| 10-17 14:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 9.999921 | 0.0033 |
| 10-17 15:00 | empty | 653 / 0 / 658 | 2 / 0 / 4 | 9.994707 | 0.1115 |
| 10-17 16:00 | 0.0000 | 46 / 67 / 637 | 0 / 0 / 4 | 10.005674 | 0.2343 |
| 10-17 17:00 | 0.1814 | 156 / 165 / 628 | 0 / 0 / 4 | 9.973508 | 0.5041 |
| 10-17 18:00 | 0.0707 | 0 / 27 / 601 | 0 / 2 / 2 | 9.933542 | 1.0092 |
| 10-17 19:00 | 0.0000 | 0 / 19 / 582 | 0 / 0 / 2 | 9.909004 | 1.1437 |
| 10-17 20:00 | empty | 0 / 0 / 582 | 0 / 0 / 2 | 9.914283 | 1.1700 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 32, "block": 28, "own-validation-at-selection-clock": 39}`. This is an admission diagnostic, not permission to bypass later gates.

## dca-unit-0

12 symbols; 118 sources; 663 source/lane pairs; 148,293 configs; 12,403,956 historical closes; 0 missing configured cells. 327 exact settled matches, zero missing/mismatched returns. 46,267,416 scalar comparisons. Green/red/flat hours: 5/5/2. Endpoint held MTM: -0.004431.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| parameterRange | short | 69883 | 36.72 | 85.77 | 6419 | 4.7550 | 2.9769 | 251 / 216 / 35 | 9 / 4 / 5 |
| strategyRange | Exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| lane | 15 | 43411 | 38.97 | 79.60 | 1758 | 4.8144 | 0.3785 | 253 / 170 / 83 | 11 / 3 / 8 |
| parameterRange | medium | 69836 | 28.63 | 79.52 | 3596 | 4.5637 | 1.9402 | 147 / 99 / 48 | 12 / 5 / 7 |
| type | normal | 27625 | 33.11 | 82.48 | 871 | 2.7399 | 3.0372 | 34 / 32 / 2 | 7 / 5 / 2 |
| strategyRange | Signals | 148226 | 32.99 | 83.54 | 10953 | 4.6289 | 2.6832 | 386 / 320 / 66 | 11 / 6 / 5 |
| lane | 1 | 53355 | 13.32 | 82.34 | 422 | 5.2633 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82645 | 33.79 | 82.38 | 7232 | 5.1729 | 2.5025 | 277 / 219 / 58 | 9 / 4 / 5 |
| type | trailing-only | 15912 | 34.39 | 82.98 | 1437 | 4.6175 | 6.8465 | 60 / 54 / 6 | 7 / 4 / 3 |
| type | dca | 11022 | 43.75 | 95.75 | 1409 | 4.7576 | 0.4646 | 15 / 15 / 0 | 4 / 4 / 0 |
| type | dca-active | 11022 | 13.97 | 83.46 | 4 | 2.3499 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51527 | 48.33 | 88.13 | 8867 | 4.6121 | 12.2848 | 157 / 157 / 0 | 4 / 4 / 0 |
| parameterRange | short+medium | 8574 | 38.15 | 98.22 | 1032 | 4.4226 | 10.2709 | 12 / 12 / 0 | 4 / 4 / 0 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-16 21:00 | 1.6716 | 234 / 26 / 208 | 8 / 1 / 7 | 10.002436 | 0.0468 |
| 10-16 22:00 | 0.2166 | 0 / 103 / 105 | 0 / 1 / 6 | 9.993885 | 0.1007 |
| 10-16 23:00 | empty | 0 / 0 / 105 | 0 / 0 / 6 | 9.993979 | 0.1053 |
| 10-17 00:00 | 0.0000 | 14 / 3 / 116 | 2 / 0 / 8 | 9.996477 | 0.1053 |
| 10-17 01:00 | 0.0014 | 2 / 21 / 97 | 0 / 0 / 8 | 9.997084 | 0.1053 |
| 10-17 02:00 | 0.3401 | 2 / 4 / 95 | 0 / 0 / 8 | 9.994824 | 0.1053 |
| 10-17 03:00 | 0.0742 | 43 / 8 / 130 | 4 / 0 / 12 | 9.991176 | 0.1249 |
| 10-17 04:00 | 14.1317 | 115 / 121 / 124 | 0 / 2 / 10 | 9.999315 | 0.1359 |
| 10-17 05:00 | 11.4916 | 0 / 32 / 92 | 0 / 1 / 9 | 9.999940 | 0.1359 |
| 10-17 06:00 | 4.0000 | 0 / 5 / 87 | 0 / 0 / 9 | 10.000409 | 0.1359 |
| 10-17 07:00 | 4.0000 | 0 / 4 / 83 | 0 / 1 / 8 | 10.001063 | 0.1359 |
| 10-17 08:00 | empty | 0 / 0 / 83 | 0 / 0 / 8 | 10.000679 | 0.1359 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 78, "block": 26}`. This is an admission diagnostic, not permission to bypass later gates.

## dca-unit-12

12 symbols; 118 sources; 663 source/lane pairs; 148,333 configs; 12,678,987 historical closes; 0 missing configured cells. 282 exact settled matches, zero missing/mismatched returns. 46,279,896 scalar comparisons. Green/red/flat hours: 0/4/8. Endpoint held MTM: -0.096335.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| parameterRange | short | 69914 | 37.39 | 85.99 | 7649 | 4.7380 | 0.0904 | 508 / 176 / 332 | 4 / 2 / 2 |
| strategyRange | Exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| lane | 15 | 43398 | 40.07 | 80.36 | 2084 | 4.8162 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| type | normal | 27630 | 33.65 | 82.65 | 1068 | 2.8439 | 0.0000 | 93 / 39 / 54 | 1 / 0 / 1 |
| strategyRange | Signals | 148323 | 33.63 | 83.85 | 13065 | 4.7027 | 0.0454 | 952 / 275 / 677 | 1 / 0 / 1 |
| lane | 1 | 53358 | 13.34 | 82.53 | 466 | 5.2246 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82737 | 34.43 | 82.66 | 8683 | 5.1488 | 0.1159 | 632 / 174 / 458 | 1 / 0 / 1 |
| type | trailing-only | 15912 | 34.86 | 83.15 | 1665 | 4.5862 | 0.0882 | 127 / 58 / 69 | 1 / 0 / 1 |
| type | dca | 11022 | 44.61 | 95.75 | 1643 | 5.2168 | 0.0000 | 100 / 4 / 96 | 1 / 0 / 1 |
| type | dca-active | 11022 | 14.88 | 84.98 | 6 | 2.5689 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51577 | 49.21 | 88.17 | 10535 | 4.6766 | 0.0454 | 952 / 275 / 677 | 1 / 0 / 1 |
| parameterRange | medium | 69838 | 29.20 | 79.95 | 4266 | 4.5787 | 0.0369 | 279 / 98 / 181 | 1 / 0 / 1 |
| parameterRange | short+medium | 8581 | 39.09 | 98.22 | 1170 | 4.9327 | 0.0280 | 173 / 8 / 165 | 1 / 0 / 1 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-17 09:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 10:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 11:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 12:00 | empty | 5 / 0 / 5 | 2 / 0 / 2 | 10.000179 | 0.0009 |
| 10-17 13:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 10.000098 | 0.0017 |
| 10-17 14:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 9.999921 | 0.0033 |
| 10-17 15:00 | empty | 672 / 0 / 677 | 2 / 0 / 4 | 9.996272 | 0.1043 |
| 10-17 16:00 | 0.0000 | 48 / 67 / 658 | 0 / 0 / 4 | 10.008155 | 0.2289 |
| 10-17 17:00 | 0.1814 | 235 / 165 / 728 | 0 / 0 / 4 | 9.973781 | 0.5531 |
| 10-17 18:00 | 0.0588 | 0 / 31 / 697 | 0 / 2 / 2 | 9.921326 | 1.2171 |
| 10-17 19:00 | 0.0000 | 0 / 19 / 678 | 0 / 0 / 2 | 9.888958 | 1.3950 |
| 10-17 20:00 | empty | 0 / 0 / 678 | 0 / 0 / 2 | 9.895977 | 1.4299 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 32, "block": 28, "own-validation-at-selection-clock": 55}`. This is an admission diagnostic, not permission to bypass later gates.

Own activation reasons at the exact entry: `{"recent": 82, "block": 28, "active": 5}`. The hourly selection delay remains a separate unresolved behavior; successful activation alone is not complete funded execution proof.

## dca-weighted-0

12 symbols; 118 sources; 663 source/lane pairs; 148,293 configs; 12,413,096 historical closes; 0 missing configured cells. 328 exact settled matches, zero missing/mismatched returns. 46,267,416 scalar comparisons. Green/red/flat hours: 5/5/2. Endpoint held MTM: -0.004431.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| parameterRange | short | 69883 | 36.73 | 85.77 | 6552 | 4.8999 | 3.0164 | 252 / 217 / 35 | 9 / 4 / 5 |
| strategyRange | Exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| lane | 15 | 43411 | 39.01 | 79.60 | 1762 | 4.9317 | 0.3785 | 253 / 170 / 83 | 11 / 3 / 8 |
| parameterRange | medium | 69836 | 28.65 | 79.52 | 3653 | 4.7477 | 1.9402 | 147 / 99 / 48 | 12 / 5 / 7 |
| type | normal | 27625 | 33.11 | 82.48 | 871 | 2.7399 | 3.0372 | 34 / 32 / 2 | 7 / 5 / 2 |
| strategyRange | Signals | 148226 | 33.01 | 83.54 | 11153 | 4.8220 | 2.7057 | 387 / 321 / 66 | 11 / 6 / 5 |
| lane | 1 | 53355 | 13.33 | 82.34 | 538 | 6.8397 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82645 | 33.79 | 82.38 | 7232 | 5.1729 | 2.5025 | 277 / 219 / 58 | 9 / 4 / 5 |
| type | trailing-only | 15912 | 34.39 | 82.98 | 1437 | 4.6175 | 6.8465 | 60 / 54 / 6 | 7 / 4 / 3 |
| type | dca | 11022 | 44.03 | 95.75 | 1609 | 5.5244 | 0.6764 | 16 / 16 / 0 | 3 / 3 / 0 |
| type | dca-active | 11022 | 13.97 | 83.46 | 4 | 2.3499 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51527 | 48.35 | 88.13 | 8947 | 4.7698 | 12.3993 | 158 / 158 / 0 | 4 / 4 / 0 |
| parameterRange | short+medium | 8574 | 38.24 | 98.22 | 1042 | 4.8425 | 10.2709 | 12 / 12 / 0 | 4 / 4 / 0 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-16 21:00 | 1.6716 | 234 / 26 / 208 | 8 / 1 / 7 | 10.002436 | 0.0468 |
| 10-16 22:00 | 0.2166 | 0 / 103 / 105 | 0 / 1 / 6 | 9.993885 | 0.1007 |
| 10-16 23:00 | empty | 0 / 0 / 105 | 0 / 0 / 6 | 9.993979 | 0.1053 |
| 10-17 00:00 | 0.0000 | 14 / 3 / 116 | 2 / 0 / 8 | 9.996477 | 0.1053 |
| 10-17 01:00 | 0.0014 | 2 / 21 / 97 | 0 / 0 / 8 | 9.997084 | 0.1053 |
| 10-17 02:00 | 0.3401 | 2 / 4 / 95 | 0 / 0 / 8 | 9.994824 | 0.1053 |
| 10-17 03:00 | 0.0742 | 44 / 8 / 131 | 4 / 0 / 12 | 9.991161 | 0.1249 |
| 10-17 04:00 | 14.3569 | 115 / 122 / 124 | 0 / 2 / 10 | 9.999382 | 0.1360 |
| 10-17 05:00 | 11.4916 | 0 / 32 / 92 | 0 / 1 / 9 | 10.000007 | 0.1360 |
| 10-17 06:00 | 4.0000 | 0 / 5 / 87 | 0 / 0 / 9 | 10.000476 | 0.1360 |
| 10-17 07:00 | 4.0000 | 0 / 4 / 83 | 0 / 1 / 8 | 10.001130 | 0.1360 |
| 10-17 08:00 | empty | 0 / 0 / 83 | 0 / 0 / 8 | 10.000746 | 0.1360 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 78, "block": 26}`. This is an admission diagnostic, not permission to bypass later gates.

## dca-weighted-12

12 symbols; 118 sources; 663 source/lane pairs; 148,333 configs; 12,688,324 historical closes; 0 missing configured cells. 282 exact settled matches, zero missing/mismatched returns. 46,279,896 scalar comparisons. Green/red/flat hours: 0/4/8. Endpoint held MTM: -0.106403.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| parameterRange | short | 69914 | 37.41 | 85.99 | 7762 | 4.8715 | 0.0904 | 512 / 176 / 336 | 4 / 2 / 2 |
| strategyRange | Exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| lane | 15 | 43398 | 40.11 | 80.36 | 2103 | 4.9014 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| type | normal | 27630 | 33.65 | 82.65 | 1068 | 2.8439 | 0.0000 | 93 / 39 / 54 | 1 / 0 / 1 |
| strategyRange | Signals | 148323 | 33.66 | 83.85 | 13256 | 4.8169 | 0.0454 | 968 / 275 / 693 | 1 / 0 / 1 |
| lane | 1 | 53358 | 13.35 | 82.53 | 558 | 6.5975 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82737 | 34.43 | 82.66 | 8683 | 5.1488 | 0.1159 | 632 / 174 / 458 | 1 / 0 / 1 |
| type | trailing-only | 15912 | 34.86 | 83.15 | 1665 | 4.5862 | 0.0882 | 127 / 58 / 69 | 1 / 0 / 1 |
| type | dca | 11022 | 44.91 | 95.75 | 1834 | 5.5217 | 0.0000 | 116 / 4 / 112 | 1 / 0 / 1 |
| type | dca-active | 11022 | 14.88 | 84.98 | 6 | 2.5689 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51577 | 49.24 | 88.17 | 10615 | 4.7613 | 0.0454 | 968 / 275 / 693 | 1 / 0 / 1 |
| parameterRange | medium | 69838 | 29.23 | 79.95 | 4263 | 4.6853 | 0.0369 | 285 / 98 / 187 | 1 / 0 / 1 |
| parameterRange | short+medium | 8581 | 39.17 | 98.22 | 1251 | 4.9259 | 0.0280 | 179 / 8 / 171 | 1 / 0 / 1 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-17 09:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 10:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 11:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 12:00 | empty | 5 / 0 / 5 | 2 / 0 / 2 | 10.000179 | 0.0009 |
| 10-17 13:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 10.000098 | 0.0017 |
| 10-17 14:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 9.999921 | 0.0033 |
| 10-17 15:00 | empty | 679 / 0 / 684 | 2 / 0 / 4 | 10.000410 | 0.0788 |
| 10-17 16:00 | 0.0000 | 49 / 67 / 666 | 0 / 0 / 4 | 10.013843 | 0.2372 |
| 10-17 17:00 | 0.1814 | 243 / 165 / 744 | 0 / 0 / 4 | 9.982663 | 0.5523 |
| 10-17 18:00 | 0.0588 | 0 / 31 / 713 | 0 / 2 / 2 | 9.917574 | 1.3777 |
| 10-17 19:00 | 0.0000 | 0 / 19 / 694 | 0 / 0 / 2 | 9.877085 | 1.6005 |
| 10-17 20:00 | empty | 0 / 0 / 694 | 0 / 0 / 2 | 9.885909 | 1.6444 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 32, "block": 28, "own-validation-at-selection-clock": 39}`. This is an admission diagnostic, not permission to bypass later gates.

## dca-active-0

12 symbols; 118 sources; 663 source/lane pairs; 148,293 configs; 12,403,956 historical closes; 0 missing configured cells. 312 exact settled matches, zero missing/mismatched returns. 46,267,416 scalar comparisons. Green/red/flat hours: 5/5/2. Endpoint held MTM: -0.004431.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| parameterRange | short | 69883 | 36.72 | 85.77 | 6419 | 4.7550 | 3.5526 | 236 / 201 / 35 | 9 / 4 / 5 |
| strategyRange | Exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| lane | 15 | 43411 | 38.97 | 79.60 | 1758 | 4.8144 | 0.4361 | 241 / 158 / 83 | 11 / 3 / 8 |
| parameterRange | medium | 69836 | 28.63 | 79.52 | 3596 | 4.5637 | 1.9402 | 147 / 99 / 48 | 12 / 5 / 7 |
| type | normal | 27625 | 33.11 | 82.48 | 871 | 2.7399 | 3.0372 | 34 / 32 / 2 | 7 / 5 / 2 |
| strategyRange | Signals | 148226 | 32.99 | 83.54 | 10953 | 4.6289 | 2.9464 | 371 / 305 / 66 | 11 / 6 / 5 |
| lane | 1 | 53355 | 13.32 | 82.34 | 422 | 5.2633 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82645 | 33.79 | 82.38 | 7232 | 5.1729 | 2.5025 | 277 / 219 / 58 | 9 / 4 / 5 |
| type | trailing-only | 15912 | 34.39 | 82.98 | 1437 | 4.6175 | 6.8465 | 60 / 54 / 6 | 7 / 4 / 3 |
| type | dca | 11022 | 43.75 | 95.75 | 1409 | 4.7576 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | dca-active | 11022 | 13.97 | 83.46 | 4 | 2.3499 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51527 | 48.33 | 88.13 | 8867 | 4.6121 | 12.0335 | 154 / 154 / 0 | 4 / 4 / 0 |
| parameterRange | short+medium | 8574 | 38.15 | 98.22 | 1032 | 4.4226 | 10.2709 | 12 / 12 / 0 | 4 / 4 / 0 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-16 21:00 | 1.6716 | 222 / 26 / 196 | 8 / 1 / 7 | 10.002178 | 0.0430 |
| 10-16 22:00 | 0.2681 | 0 / 91 / 105 | 0 / 1 / 6 | 9.994201 | 0.0958 |
| 10-16 23:00 | empty | 0 / 0 / 105 | 0 / 0 / 6 | 9.994295 | 0.1010 |
| 10-17 00:00 | 0.0000 | 14 / 3 / 116 | 2 / 0 / 8 | 9.996793 | 0.1010 |
| 10-17 01:00 | 0.0014 | 2 / 21 / 97 | 0 / 0 / 8 | 9.997400 | 0.1010 |
| 10-17 02:00 | 0.3401 | 2 / 4 / 95 | 0 / 0 / 8 | 9.995141 | 0.1010 |
| 10-17 03:00 | 0.0742 | 42 / 8 / 129 | 4 / 0 / 12 | 9.991507 | 0.1206 |
| 10-17 04:00 | 13.6377 | 113 / 118 / 124 | 0 / 2 / 10 | 9.999485 | 0.1316 |
| 10-17 05:00 | 11.4916 | 0 / 32 / 92 | 0 / 1 / 9 | 10.000109 | 0.1316 |
| 10-17 06:00 | 4.0000 | 0 / 5 / 87 | 0 / 0 / 9 | 10.000579 | 0.1316 |
| 10-17 07:00 | 4.0000 | 0 / 4 / 83 | 0 / 1 / 8 | 10.001232 | 0.1316 |
| 10-17 08:00 | empty | 0 / 0 / 83 | 0 / 0 / 8 | 10.000848 | 0.1316 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 78, "block": 26}`. This is an admission diagnostic, not permission to bypass later gates.

## dca-active-12

12 symbols; 118 sources; 663 source/lane pairs; 148,333 configs; 12,678,987 historical closes; 0 missing configured cells. 278 exact settled matches, zero missing/mismatched returns. 46,279,896 scalar comparisons. Green/red/flat hours: 0/4/8. Endpoint held MTM: -0.078471.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| parameterRange | short | 69914 | 37.39 | 85.99 | 7649 | 4.7380 | 0.0904 | 476 / 176 / 300 | 4 / 2 / 2 |
| strategyRange | Exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| lane | 15 | 43398 | 40.07 | 80.36 | 2084 | 4.8162 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| type | normal | 27630 | 33.65 | 82.65 | 1068 | 2.8439 | 0.0000 | 93 / 39 / 54 | 1 / 0 / 1 |
| strategyRange | Signals | 148323 | 33.63 | 83.85 | 13065 | 4.7027 | 0.0480 | 852 / 271 / 581 | 1 / 0 / 1 |
| lane | 1 | 53358 | 13.34 | 82.53 | 466 | 5.2246 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82737 | 34.43 | 82.66 | 8683 | 5.1488 | 0.1159 | 632 / 174 / 458 | 1 / 0 / 1 |
| type | trailing-only | 15912 | 34.86 | 83.15 | 1665 | 4.5862 | 0.0882 | 127 / 58 / 69 | 1 / 0 / 1 |
| type | dca | 11022 | 44.61 | 95.75 | 1643 | 5.2168 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | dca-active | 11022 | 14.88 | 84.98 | 6 | 2.5689 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51577 | 49.21 | 88.17 | 10535 | 4.6766 | 0.0480 | 852 / 271 / 581 | 1 / 0 / 1 |
| parameterRange | medium | 69838 | 29.20 | 79.95 | 4266 | 4.5787 | 0.0425 | 268 / 94 / 174 | 1 / 0 / 1 |
| parameterRange | short+medium | 8581 | 39.09 | 98.22 | 1170 | 4.9327 | 0.0280 | 116 / 8 / 108 | 1 / 0 / 1 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-17 09:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 10:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 11:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 12:00 | empty | 5 / 0 / 5 | 2 / 0 / 2 | 10.000179 | 0.0009 |
| 10-17 13:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 10.000098 | 0.0017 |
| 10-17 14:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 9.999921 | 0.0033 |
| 10-17 15:00 | empty | 653 / 0 / 658 | 2 / 0 / 4 | 9.994707 | 0.1115 |
| 10-17 16:00 | 0.0000 | 46 / 67 / 637 | 0 / 0 / 4 | 10.005674 | 0.2343 |
| 10-17 17:00 | 0.1814 | 156 / 165 / 628 | 0 / 0 / 4 | 9.973508 | 0.5041 |
| 10-17 18:00 | 0.0707 | 0 / 27 / 601 | 0 / 2 / 2 | 9.933542 | 1.0092 |
| 10-17 19:00 | 0.0000 | 0 / 19 / 582 | 0 / 0 / 2 | 9.909004 | 1.1437 |
| 10-17 20:00 | empty | 0 / 0 / 582 | 0 / 0 / 2 | 9.914283 | 1.1700 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 32, "block": 28, "own-validation-at-selection-clock": 55}`. This is an admission diagnostic, not permission to bypass later gates.

## dca-block-0

12 symbols; 118 sources; 663 source/lane pairs; 148,293 configs; 12,403,956 historical closes; 0 missing configured cells. 327 exact settled matches, zero missing/mismatched returns. 46,267,416 scalar comparisons. Green/red/flat hours: 5/5/2. Endpoint held MTM: -0.004431.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| parameterRange | short | 69883 | 36.72 | 85.77 | 6419 | 4.7550 | 2.9769 | 251 / 216 / 35 | 9 / 4 / 5 |
| strategyRange | Exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 24 / 7 / 17 | 5 / 1 / 4 |
| lane | 15 | 43411 | 38.97 | 79.60 | 1758 | 4.8144 | 0.3785 | 253 / 170 / 83 | 11 / 3 / 8 |
| parameterRange | medium | 69836 | 28.63 | 79.52 | 3596 | 4.5637 | 1.9402 | 147 / 99 / 48 | 12 / 5 / 7 |
| type | normal | 27625 | 33.11 | 82.48 | 871 | 2.7399 | 3.0372 | 34 / 32 / 2 | 7 / 5 / 2 |
| strategyRange | Signals | 148226 | 32.99 | 83.54 | 10953 | 4.6289 | 2.6832 | 386 / 320 / 66 | 11 / 6 / 5 |
| lane | 1 | 53355 | 13.32 | 82.34 | 422 | 5.2633 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82645 | 33.79 | 82.38 | 7232 | 5.1729 | 2.5025 | 277 / 219 / 58 | 9 / 4 / 5 |
| type | trailing-only | 15912 | 34.39 | 82.98 | 1437 | 4.6175 | 6.8465 | 60 / 54 / 6 | 7 / 4 / 3 |
| type | dca | 11022 | 43.75 | 95.75 | 1409 | 4.7576 | 0.4646 | 15 / 15 / 0 | 4 / 4 / 0 |
| type | dca-active | 11022 | 13.97 | 83.46 | 4 | 2.3499 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51527 | 48.33 | 88.13 | 8867 | 4.6121 | 12.2848 | 157 / 157 / 0 | 4 / 4 / 0 |
| parameterRange | short+medium | 8574 | 38.15 | 98.22 | 1032 | 4.4226 | 10.2709 | 12 / 12 / 0 | 4 / 4 / 0 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-16 21:00 | 1.6716 | 234 / 26 / 208 | 8 / 1 / 7 | 10.002436 | 0.0468 |
| 10-16 22:00 | 0.2166 | 0 / 103 / 105 | 0 / 1 / 6 | 9.993885 | 0.1007 |
| 10-16 23:00 | empty | 0 / 0 / 105 | 0 / 0 / 6 | 9.993979 | 0.1053 |
| 10-17 00:00 | 0.0000 | 14 / 3 / 116 | 2 / 0 / 8 | 9.996477 | 0.1053 |
| 10-17 01:00 | 0.0014 | 2 / 21 / 97 | 0 / 0 / 8 | 9.997084 | 0.1053 |
| 10-17 02:00 | 0.3401 | 2 / 4 / 95 | 0 / 0 / 8 | 9.994824 | 0.1053 |
| 10-17 03:00 | 0.0742 | 43 / 8 / 130 | 4 / 0 / 12 | 9.991176 | 0.1249 |
| 10-17 04:00 | 14.1317 | 115 / 121 / 124 | 0 / 2 / 10 | 9.999315 | 0.1359 |
| 10-17 05:00 | 11.4916 | 0 / 32 / 92 | 0 / 1 / 9 | 9.999940 | 0.1359 |
| 10-17 06:00 | 4.0000 | 0 / 5 / 87 | 0 / 0 / 9 | 10.000409 | 0.1359 |
| 10-17 07:00 | 4.0000 | 0 / 4 / 83 | 0 / 1 / 8 | 10.001063 | 0.1359 |
| 10-17 08:00 | empty | 0 / 0 / 83 | 0 / 0 / 8 | 10.000679 | 0.1359 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 78, "block": 26}`. This is an admission diagnostic, not permission to bypass later gates.

## dca-block-12

12 symbols; 118 sources; 663 source/lane pairs; 148,333 configs; 12,678,987 historical closes; 0 missing configured cells. 282 exact settled matches, zero missing/mismatched returns. 46,279,896 scalar comparisons. Green/red/flat hours: 0/4/8. Endpoint held MTM: -0.096392.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| parameterRange | short | 69914 | 37.39 | 85.99 | 7649 | 4.7380 | 0.0904 | 508 / 176 / 332 | 4 / 2 / 2 |
| strategyRange | Exit | 10 | 37.50 | 100.00 | 20 | 41.3906 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| lane | 15 | 43398 | 40.07 | 80.36 | 2084 | 4.8162 | no losses (no finite ratio) | 8 / 7 / 1 | 3 / 2 / 1 |
| type | normal | 27630 | 33.65 | 82.65 | 1068 | 2.8439 | 0.0000 | 93 / 39 / 54 | 1 / 0 / 1 |
| strategyRange | Signals | 148323 | 33.63 | 83.85 | 13065 | 4.7027 | 0.0454 | 952 / 275 / 677 | 1 / 0 / 1 |
| lane | 1 | 53358 | 13.34 | 82.53 | 466 | 5.2246 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82737 | 34.43 | 82.66 | 8683 | 5.1488 | 0.1159 | 632 / 174 / 458 | 1 / 0 / 1 |
| type | trailing-only | 15912 | 34.86 | 83.15 | 1665 | 4.5862 | 0.0882 | 127 / 58 / 69 | 1 / 0 / 1 |
| type | dca | 11022 | 44.61 | 95.75 | 1643 | 5.2168 | 0.0000 | 100 / 4 / 96 | 1 / 0 / 1 |
| type | dca-active | 11022 | 14.88 | 84.98 | 6 | 2.5689 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| lane | 5 | 51577 | 49.21 | 88.17 | 10535 | 4.6766 | 0.0454 | 952 / 275 / 677 | 1 / 0 / 1 |
| parameterRange | medium | 69838 | 29.20 | 79.95 | 4266 | 4.5787 | 0.0369 | 279 / 98 / 181 | 1 / 0 / 1 |
| parameterRange | short+medium | 8581 | 39.09 | 98.22 | 1170 | 4.9327 | 0.0280 | 173 / 8 / 165 | 1 / 0 / 1 |

Group position episodes overlap; do not sum them into the account's position count.

| UTC hour start | Settled PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Minute peak equity DD % |
|---|---:|---|---|---:|---:|
| 10-17 09:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 10:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 11:00 | empty | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000 |
| 10-17 12:00 | empty | 5 / 0 / 5 | 2 / 0 / 2 | 10.000179 | 0.0009 |
| 10-17 13:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 10.000098 | 0.0017 |
| 10-17 14:00 | empty | 0 / 0 / 5 | 0 / 0 / 2 | 9.999921 | 0.0033 |
| 10-17 15:00 | empty | 672 / 0 / 677 | 2 / 0 / 4 | 9.996272 | 0.1043 |
| 10-17 16:00 | 0.0000 | 48 / 67 / 658 | 0 / 0 / 4 | 10.008155 | 0.2289 |
| 10-17 17:00 | 0.1814 | 235 / 165 / 728 | 0 / 0 / 4 | 9.973762 | 0.5534 |
| 10-17 18:00 | 0.0588 | 0 / 31 / 697 | 0 / 2 / 2 | 9.921281 | 1.2176 |
| 10-17 19:00 | 0.0000 | 0 / 19 / 678 | 0 / 0 / 2 | 9.888897 | 1.3956 |
| 10-17 20:00 | empty | 0 / 0 / 678 | 0 / 0 / 2 | 9.895920 | 1.4306 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 32, "block": 28, "own-validation-at-selection-clock": 55}`. This is an admission diagnostic, not permission to bypass later gates.

Complete per-source/symbol/type/range details, protection limits and all hourly qualification totals are in [financial-results.json.gz](financial-results.json.gz). No profitable-default or X02 release decision follows from an empty, partial or losing arm.
