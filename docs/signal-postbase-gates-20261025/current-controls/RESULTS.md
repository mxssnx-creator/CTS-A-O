# Frozen recovery comparison

Retrospective funded modeled post-Base execution; no venue profitability claim. PF 1 is neutral; modeled costs are 0.15% once. Losses and endpoint holdings are retained. The two reused windows are not untouched forward evidence.

Source: `9ac49d0c8c5daeca5942e90f5100169ff0382afdc57e5268729054878b7cfee1`. Eight broad ordinary arms remain separate; no completion claimed here.

| Case | Settled unit PF | Orders opened / settled / held | Positions opened / closed / held | Peak equity DD % | Ending equity change % | Native wall s / peak child MiB |
|---|---:|---|---|---:|---:|---|
| control-0 | 4.8880 | 476 / 371 / 105 | 15 / 6 / 9 | 0.1316 | 0.0603 | 529.5 / 3522.6 |
| control-12 | 0.0679 | 860 / 278 / 582 | 4 / 2 / 2 | 1.1700 | -0.8572 | 549.6 / 3491.1 |
| dca-unit-0 | pending | — | — | — | — | — |
| dca-unit-12 | pending | — | — | — | — | — |
| dca-weighted-0 | pending | — | — | — | — | — |
| dca-weighted-12 | pending | — | — | — | — | — |
| dca-active-0 | pending | — | — | — | — | — |
| dca-active-12 | pending | — | — | — | — | — |
| dca-block-0 | pending | — | — | — | — | — |
| dca-block-12 | pending | — | — | — | — | — |

Counts are modeled funded configuration orders and overlapping symbol/direction position episodes. Native runtime plus export timing is host dependent; these timings do not establish a controlled speedup.

## control-0

12 symbols; 118 sources; 663 source/lane pairs; 126,249 configs; 10,764,881 historical closes; 0 missing configured cells. 371 exact settled matches, zero missing/mismatched returns. 39,389,688 scalar comparisons. Green/red/flat hours: 5/5/2. Endpoint held MTM: -0.004520.

Last-4 percentages below are endpoint readiness, before the remaining PF/sample gates. Exact contexts count every config × symbol × direction; any-context configs have at least one ready context. Qualified history PF and later settled execution PF have different cohorts.

| Dimension | Type / range | Configs | Last-4 exact contexts % | Any-context configs % | Contexts passing all evaluation gates | Qualified historical PF | Executed settled PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| type | exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 46 / 7 / 39 | 8 / 1 / 7 |
| parameterRange | short | 61711 | 37.41 | 85.46 | 5802 | 4.7069 | 6.4266 | 282 / 237 / 45 | 9 / 4 / 5 |
| strategyRange | Exit | 67 | 36.07 | 98.51 | 94 | 11.1964 | no losses (no finite ratio) | 46 / 7 / 39 | 8 / 1 / 7 |
| lane | 15 | 36783 | 40.19 | 78.94 | 1639 | 5.1350 | 2.9228 | 322 / 217 / 105 | 13 / 4 / 9 |
| parameterRange | medium | 61664 | 29.17 | 78.69 | 3242 | 4.6450 | 2.9301 | 182 / 122 / 60 | 13 / 5 / 8 |
| type | normal | 27625 | 33.11 | 82.48 | 871 | 2.7399 | 5.6381 | 50 / 48 / 2 | 8 / 6 / 2 |
| strategyRange | Signals | 126182 | 33.71 | 82.48 | 9540 | 4.6024 | 4.8548 | 430 / 364 / 66 | 11 / 6 / 5 |
| lane | 1 | 45527 | 13.64 | 81.17 | 354 | 4.5056 | empty | 0 / 0 / 0 | 0 / 0 / 0 |
| type | trailing | 82645 | 33.79 | 82.38 | 7232 | 5.1729 | 4.4247 | 320 / 262 / 58 | 9 / 4 / 5 |
| type | trailing-only | 15912 | 34.39 | 82.98 | 1437 | 4.6175 | 6.8465 | 60 / 54 / 6 | 7 / 4 / 3 |
| lane | 5 | 43939 | 49.10 | 86.82 | 7641 | 4.5559 | 12.0335 | 154 / 154 / 0 | 4 / 4 / 0 |
| parameterRange | short+medium | 2874 | 51.78 | 100.00 | 590 | 3.9734 | 10.2709 | 12 / 12 / 0 | 4 / 4 / 0 |

Group position episodes overlap; do not sum them into the account's position count.

| Type / range | SL minimum–maximum % | Maximum SL/TP ratio | Minimum trail activation % | Minimum trail gap % | Maximum hold hours | Maximum qualified-history DDT hours |
|---|---:|---:|---:|---:|---:|---:|
| type: exit | 1.2300–3.0000 | 0.6148 | 1.6100 | 1.5774 | 22.5000 | 58.2500 |
| strategyRange: Exit | 1.2300–3.0000 | 0.6148 | 1.6100 | 1.5774 | 22.5000 | 58.2500 |
| type: normal | 0.5000–3.0000 | 3.0000 | unavailable | unavailable | 48.0000 | 72.7500 |
| strategyRange: Signals | 0.5000–3.0000 | 3.0000 | 0.1700 | 0.2000 | 48.0000 | 72.9167 |
| type: trailing | 0.9200–3.0000 | 3.0000 | 0.1700 | 0.2000 | 48.0000 | 72.9167 |
| type: trailing-only | 0.6300–3.0000 | unavailable | 0.2100 | 0.2500 | 48.0000 | 72.9167 |

Protection extrema describe the configured/built inventory, not recommended optimal settings. A zero trail distance includes configs without trailing; unavailable SL/TP has no valid TP denominator. DDT is duration under the prior realized-return peak, not margin usage.

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
| 10-17 05:00 | 28.4980 | 70 / 69 / 125 | 1 / 1 / 10 | 10.005283 | 0.1316 |
| 10-17 06:00 | 31.7701 | 10 / 27 / 108 | 0 / 0 / 10 | 10.005555 | 0.1316 |
| 10-17 07:00 | 4.0000 | 1 / 4 / 105 | 0 / 1 / 9 | 10.006195 | 0.1316 |
| 10-17 08:00 | empty | 0 / 0 / 105 | 0 / 0 / 9 | 10.006026 | 0.1316 |

Earlier-snapshot reasons for independently valid but unselected candidates: `{"recent": 78, "block": 26}`. This is an admission diagnostic, not permission to bypass later gates.

Own activation reasons at the exact entry: `{"recent": 78, "block": 26}`. The hourly selection delay remains a separate unresolved behavior; successful activation alone is not complete funded execution proof.

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

| Type / range | SL minimum–maximum % | Maximum SL/TP ratio | Minimum trail activation % | Minimum trail gap % | Maximum hold hours | Maximum qualified-history DDT hours |
|---|---:|---:|---:|---:|---:|---:|
| type: exit | 1.7800–3.0000 | 2.0000 | 1.8900 | 1.8900 | 22.5000 | 67.7500 |
| strategyRange: Exit | 1.7800–3.0000 | 2.0000 | 1.8900 | 1.8900 | 22.5000 | 67.7500 |
| type: normal | 0.5000–3.0000 | 3.0000 | unavailable | unavailable | 48.0000 | 72.7500 |
| strategyRange: Signals | 0.5000–3.0000 | 3.0000 | 0.1700 | 0.2000 | 48.0000 | 72.9167 |
| type: trailing | 0.9200–3.0000 | 3.0000 | 0.1700 | 0.2000 | 48.0000 | 72.9167 |
| type: trailing-only | 0.6300–3.0000 | unavailable | 0.2100 | 0.2500 | 48.0000 | 72.9167 |

Protection extrema describe the configured/built inventory, not recommended optimal settings. A zero trail distance includes configs without trailing; unavailable SL/TP has no valid TP denominator. DDT is duration under the prior realized-return peak, not margin usage.

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

Own activation reasons at the exact entry: `{"recent": 66, "block": 28, "active": 5}`. The hourly selection delay remains a separate unresolved behavior; successful activation alone is not complete funded execution proof.

Complete per-source/symbol/type/range details, protection limits and all hourly qualification totals are in [financial-results.json.gz](financial-results.json.gz). No profitable-default or X02 release decision follows from an empty, partial or losing arm.
