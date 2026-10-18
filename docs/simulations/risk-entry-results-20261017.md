# Frozen account-risk holdout: four completed arms

All four 22-symbol, 24-hour research arms completed with source, storage and arithmetic checks passing. **The prespecified candidate `entry5-gross1` fails research acceptance.** It reduced modeled account drawdown but lost money and its execution Return PF remained below 1.2. No settings, ranges, indications or configs were pruned or promoted live.

## Frozen protocol and independent checks

- Plan: [prespecified risk-entry study](risk-entry-study-plan-20261017.md). Candidate remained fixed before outcomes; the other three arms are diagnostic.
- Trading: **2026-10-14 21:00 → 2026-10-15 21:00 UTC**, with evaluated prehistory 2026-10-14 15:00–21:00 UTC. The physical feed has 22 symbols and 665,280 one-minute bars.
- Economic source: `fdabcdb3f9daf17160873f98962dc265f9142159`, all 82 core-file hashes checked. Actions head: `2cd0c29433407abbff452f71041b991351e303cf`; run [39077541410](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077541410).
- Feed SHA256: `84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`. Retained official archive/checksum provenance was independently verified.
- Every arm: cost 0.15%, starting balance $10, equity sizing 0.1%, leverage 10, live disabled, exchange position limit 100, per-Symbol+Direction account ratio 0.75. Gross ratio is 7 or 1. Strategy/config processing and ranges retain their frozen settings. Earlier development books were uncapped; this is an explicit account-risk policy change.
- Full saved WF is `simH=24/preH=6/longH=6/causalBase=true/recordValidation=true`. Entry variants change only exact-config Last-N 5 or 15 and its 1.2 floor; control disables this entry filter.
- Each ZIP digest matched GitHub; archive paths and extraction were checked. Every history/allocation chunk, ordered payload hash and count was verified. Identical tape histories reused a completed semantic verification only after exact manifest/count/chunk-byte SHA parity; each arm has its own funded allocation, gate-membership, cash and minute-account audit.
- Primary samples are funded settled close slices from post-Base Engine configs, with Signals separately qualified. Unknown/dust ownership or missing unit-return evidence cannot pass. Unit PF removes only verified external execution multipliers; cash uses recorded sized return × funded unit notional exactly once.
- Every funded Engine entry belongs to a Base-passed pair and its recorded exact config/current seat. Recorded config PF gross arithmetic is checked. This verifies recorded causal decisions; it does not independently rerun the full DDT/DDR/Last-N decision engine.
- All 1,440 completed-minute account marks, minimum equity, drawdown, margin-shortfall count and hourly account endpoints were independently recomputed. **DCA account marks use the existing aggregate parent average entry × final volume model.** Actual per-leg timing/funding is not exported. These modeled drawdown/feasibility results do not certify venue execution or causal per-leg capital requirements. Engine endpoint marks remain separately disclosed.
- Resource retry: explicit 8 GiB Node old-space flag on isolated standard 16 GB runners, inherited by worker isolates; physical memory guards remain. Background preset comparison is off. Lossless bounded sidecars retain every row. Production settings were unchanged. Initial capture-OOM attempts remain preserved and do not supply economic outcomes.

## Funded post-Base outcomes

Engine and combined results are identical because **Signals executed zero funded closes in every arm**. Empty Signals are uncertified and cannot establish that Normal, Normal+Trailing or trailing-only Signals are profitable. Every arm traded both Engine directions and all 22 symbols. Closed cash, marked ending equity and drawdown are separate measures.

| Arm | Funded closes | Funded config IDs | Unit PF | Sized-dollar PF diagnostic | Closed cash $ | Marked end $ | Marked DD | Positive hours |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| control-entry0-gross7 | 789,873 | 78,500 | 0.691260716 | 0.731093349 | -1.018721445 | 8.472082337 | 19.093101% | 14/24 |
| entry5-gross7 | 595,448 | 71,626 | 0.834692837 | 0.760829145 | -0.880352619 | 8.540239362 | 18.628678% | 16/24 |
| entry5-gross1 | 604,153 | 72,814 | 0.824573475 | 0.802336863 | -0.093895327 | 9.829475158 | 2.335710% | 16/24 |
| entry15-gross1 | 680,439 | 74,917 | 0.711549623 | 0.707301348 | -0.145745160 | 9.782791727 | 2.576313% | 16/24 |

All four arms fail their prespecified acceptance criteria. The candidate has low modeled drawdown and 16 positive hours, but negative cash and ending equity below starting capital. More positive hours do not offset larger losing hours. No diagnostic arm replaces the candidate.

## Direction and account feasibility

| Arm | Long closes | Long unit PF | Short closes | Short unit PF | Minimum marked equity $ | Margin-shortfall minutes | Feasible |
|---|---:|---:|---:|---:|---:|---:|---|
| control-entry0-gross7 | 374,062 | 0.789163861 | 415,811 | 0.625211089 | 8.310854528 | 0 | True |
| entry5-gross7 | 273,573 | 0.718010611 | 321,875 | 0.940693144 | 8.393063194 | 0 | True |
| entry5-gross1 | 282,297 | 0.701458749 | 321,856 | 0.941324776 | 9.809586812 | 0 | True |
| entry15-gross1 | 309,769 | 0.698673193 | 370,670 | 0.720793877 | 9.762995884 | 0 | True |

Both directions traded, but neither direction achieves profitable primary unit PF in these arms. Sized-dollar returns can differ with unequal allocation sizes and cannot replace unit PF.

| Arm | Independent current-seat/config-step pass identities | Verified validation steps | Failed prespecified criteria |
|---|---:|---:|---|
| control-entry0-gross7 | 241,192 | 24 | primary post-Base Engine finite return PF > 1.2; combined funded finite return PF > 1.2; at least 16 of 24 cash-positive hours; positive closed cash and marked ending equity above starting capital; marked equity drawdown <= 10% |
| entry5-gross7 | 198,700 | 24 | primary post-Base Engine finite return PF > 1.2; combined funded finite return PF > 1.2; positive closed cash and marked ending equity above starting capital; marked equity drawdown <= 10% |
| entry5-gross1 | 202,234 | 24 | primary post-Base Engine finite return PF > 1.2; combined funded finite return PF > 1.2; positive closed cash and marked ending equity above starting capital |
| entry15-gross1 | 221,365 | 24 | primary post-Base Engine finite return PF > 1.2; combined funded finite return PF > 1.2; positive closed cash and marked ending equity above starting capital |

## Hourly funded execution

Each hour is UTC and uses settled exits in `(hour start, hour end]`. These are funded close slices, not accepted requests or whole-position episodes. Unit PF is measured from gain/loss returns on that same funded sample. Signals are empty throughout; no Signal PF is invented. Hour-end marked equity includes still-open funded orders and is distinct from hourly settled cash.

### control-entry0-gross7

| UTC hour start | Engine / combined funded closes | Unit PF | Closed cash $ | Hour-end marked equity $ |
|---|---:|---:|---:|---:|
| 2026-10-14 21:00 | 18,847 | 6.081587812 | +0.060914919 | 9.953868 |
| 2026-10-14 22:00 | 20,901 | 1.756417660 | -0.000166192 | 9.928448 |
| 2026-10-14 23:00 | 11,571 | 3.899738531 | +0.025275766 | 9.905490 |
| 2026-10-15 00:00 | 16,100 | 1.752620281 | +0.002793153 | 9.933686 |
| 2026-10-15 01:00 | 21,305 | 2.286485855 | +0.029468206 | 9.987949 |
| 2026-10-15 02:00 | 81,087 | 0.682842272 | -0.039186252 | 9.830784 |
| 2026-10-15 03:00 | 19,601 | 1.017082299 | +0.171709285 | 9.962674 |
| 2026-10-15 04:00 | 28,184 | 0.970275251 | +0.029731907 | 9.878150 |
| 2026-10-15 05:00 | 42,658 | 1.625769073 | +0.080641493 | 9.820231 |
| 2026-10-15 06:00 | 37,931 | 3.076516649 | +0.058988222 | 10.039223 |
| 2026-10-15 07:00 | 13,581 | 1.053407789 | +0.016198734 | 10.031228 |
| 2026-10-15 08:00 | 30,631 | 0.796946288 | -0.000526848 | 10.001980 |
| 2026-10-15 09:00 | 37,693 | 5.803685812 | +0.042827039 | 10.044460 |
| 2026-10-15 10:00 | 57,146 | 1.949484792 | +0.013341768 | 10.135438 |
| 2026-10-15 11:00 | 29,392 | 3.892716233 | +0.013055974 | 10.113801 |
| 2026-10-15 12:00 | 63,273 | 1.685981975 | +0.044852879 | 10.115987 |
| 2026-10-15 13:00 | 94,173 | 0.687737664 | -0.039684760 | 10.072965 |
| 2026-10-15 14:00 | 94,124 | 0.616315927 | -0.359746507 | 9.455038 |
| 2026-10-15 15:00 | 36,760 | 0.034107977 | -0.735641373 | 8.667143 |
| 2026-10-15 16:00 | 14,444 | 1.400907259 | -0.016322524 | 8.902161 |
| 2026-10-15 17:00 | 9,226 | 0.056206784 | -0.116817569 | 8.584803 |
| 2026-10-15 18:00 | 3,663 | 0.099364708 | -0.118889319 | 8.484170 |
| 2026-10-15 19:00 | 5,821 | 0.086408204 | -0.182029017 | 8.380736 |
| 2026-10-15 20:00 | 1,761 | 0.216690593 | +0.000489571 | 8.472082 |

### entry5-gross7

| UTC hour start | Engine / combined funded closes | Unit PF | Closed cash $ | Hour-end marked equity $ |
|---|---:|---:|---:|---:|
| 2026-10-14 21:00 | 11,346 | 5.920953270 | +0.077643386 | 9.980948 |
| 2026-10-14 22:00 | 16,189 | 2.138814731 | +0.000827076 | 9.954706 |
| 2026-10-14 23:00 | 9,853 | 4.182844521 | +0.030122131 | 9.935785 |
| 2026-10-15 00:00 | 13,286 | 1.738745779 | +0.005500866 | 9.964220 |
| 2026-10-15 01:00 | 17,940 | 2.550598605 | +0.038772781 | 10.009175 |
| 2026-10-15 02:00 | 53,799 | 0.649285576 | -0.140356788 | 9.689290 |
| 2026-10-15 03:00 | 14,453 | 2.245822330 | +0.242553713 | 10.057777 |
| 2026-10-15 04:00 | 22,564 | 0.801628359 | +0.011164608 | 9.798887 |
| 2026-10-15 05:00 | 34,912 | 2.130887614 | +0.101601458 | 9.889596 |
| 2026-10-15 06:00 | 29,099 | 3.335107213 | +0.074303196 | 10.100685 |
| 2026-10-15 07:00 | 11,639 | 0.911525942 | +0.017016435 | 10.047416 |
| 2026-10-15 08:00 | 25,086 | 0.770273111 | +0.002785908 | 10.007293 |
| 2026-10-15 09:00 | 30,043 | 5.285864267 | +0.045568568 | 10.070351 |
| 2026-10-15 10:00 | 48,236 | 1.834869581 | +0.022572277 | 10.196502 |
| 2026-10-15 11:00 | 25,130 | 4.226498433 | +0.013004170 | 10.170664 |
| 2026-10-15 12:00 | 56,709 | 1.740891571 | +0.050597608 | 10.212847 |
| 2026-10-15 13:00 | 74,726 | 0.667765930 | +0.007626195 | 10.175192 |
| 2026-10-15 14:00 | 61,923 | 0.719460397 | -0.371374144 | 9.476225 |
| 2026-10-15 15:00 | 16,211 | 0.044917559 | -0.668803397 | 8.697999 |
| 2026-10-15 16:00 | 10,452 | 2.221051889 | -0.017311896 | 8.938562 |
| 2026-10-15 17:00 | 5,729 | 0.078729549 | -0.116240670 | 8.625569 |
| 2026-10-15 18:00 | 1,987 | 0.097774245 | -0.125397391 | 8.538590 |
| 2026-10-15 19:00 | 3,339 | 0.082291464 | -0.179668130 | 8.447317 |
| 2026-10-15 20:00 | 797 | 0.185808492 | -0.002860579 | 8.540239 |

### entry5-gross1

| UTC hour start | Engine / combined funded closes | Unit PF | Closed cash $ | Hour-end marked equity $ |
|---|---:|---:|---:|---:|
| 2026-10-14 21:00 | 16,045 | 8.052971192 | +0.011568084 | 9.999103 |
| 2026-10-14 22:00 | 17,473 | 1.960821695 | -0.000239326 | 9.994882 |
| 2026-10-14 23:00 | 10,228 | 4.246059993 | +0.004746596 | 9.994126 |
| 2026-10-15 00:00 | 13,556 | 1.747417882 | +0.002797970 | 10.000004 |
| 2026-10-15 01:00 | 18,117 | 2.544676594 | +0.004915048 | 10.002925 |
| 2026-10-15 02:00 | 55,445 | 0.579995580 | -0.021483693 | 9.959313 |
| 2026-10-15 03:00 | 14,527 | 2.232249439 | +0.031789693 | 10.007753 |
| 2026-10-15 04:00 | 22,565 | 0.802034845 | +0.000996598 | 9.975490 |
| 2026-10-15 05:00 | 34,915 | 2.130018983 | +0.015277637 | 9.986784 |
| 2026-10-15 06:00 | 29,099 | 3.335107213 | +0.010035222 | 10.016117 |
| 2026-10-15 07:00 | 11,643 | 0.912134382 | +0.002325132 | 10.012540 |
| 2026-10-15 08:00 | 25,086 | 0.770273111 | +0.000335462 | 10.007289 |
| 2026-10-15 09:00 | 30,043 | 5.285864267 | +0.006502418 | 10.014296 |
| 2026-10-15 10:00 | 48,236 | 1.834869581 | +0.003126324 | 10.031014 |
| 2026-10-15 11:00 | 25,154 | 4.228460959 | +0.001961350 | 10.026490 |
| 2026-10-15 12:00 | 56,709 | 1.740891571 | +0.007782772 | 10.030260 |
| 2026-10-15 13:00 | 74,811 | 0.664529273 | +0.001572152 | 10.025577 |
| 2026-10-15 14:00 | 61,923 | 0.719460397 | -0.047888944 | 9.938180 |
| 2026-10-15 15:00 | 16,283 | 0.046443063 | -0.080513198 | 9.848370 |
| 2026-10-15 16:00 | 10,460 | 2.221093168 | -0.001891326 | 9.876462 |
| 2026-10-15 17:00 | 5,731 | 0.078956106 | -0.012141695 | 9.838298 |
| 2026-10-15 18:00 | 1,987 | 0.097774245 | -0.017220883 | 9.826883 |
| 2026-10-15 19:00 | 3,320 | 0.083248427 | -0.019486078 | 9.815710 |
| 2026-10-15 20:00 | 797 | 0.185808492 | +0.001237357 | 9.829475 |

### entry15-gross1

| UTC hour start | Engine / combined funded closes | Unit PF | Closed cash $ | Hour-end marked equity $ |
|---|---:|---:|---:|---:|
| 2026-10-14 21:00 | 17,201 | 7.823679194 | +0.011704491 | 9.999309 |
| 2026-10-14 22:00 | 18,885 | 1.895581799 | -0.000280815 | 9.995005 |
| 2026-10-14 23:00 | 10,886 | 4.039290230 | +0.004526940 | 9.994088 |
| 2026-10-15 00:00 | 14,880 | 1.740159137 | +0.002857021 | 9.999887 |
| 2026-10-15 01:00 | 19,877 | 2.386561208 | +0.004458280 | 10.003462 |
| 2026-10-15 02:00 | 62,801 | 0.544047152 | -0.052095737 | 9.907731 |
| 2026-10-15 03:00 | 15,419 | 2.241504976 | +0.036680712 | 9.974723 |
| 2026-10-15 04:00 | 23,165 | 0.727783288 | +0.002665935 | 9.956232 |
| 2026-10-15 05:00 | 36,121 | 2.154011132 | +0.018605288 | 9.958802 |
| 2026-10-15 06:00 | 30,954 | 2.826953135 | +0.008241479 | 9.989536 |
| 2026-10-15 07:00 | 12,681 | 0.882057305 | +0.002064288 | 9.989519 |
| 2026-10-15 08:00 | 28,142 | 0.736491639 | +0.000220956 | 9.985068 |
| 2026-10-15 09:00 | 35,149 | 6.705227486 | +0.007193220 | 9.992162 |
| 2026-10-15 10:00 | 54,018 | 2.149675117 | +0.003924542 | 10.007315 |
| 2026-10-15 11:00 | 27,409 | 3.936958311 | +0.001879988 | 10.002522 |
| 2026-10-15 12:00 | 59,619 | 1.822480696 | +0.007973167 | 10.004562 |
| 2026-10-15 13:00 | 83,204 | 0.689058277 | -0.002605514 | 9.998160 |
| 2026-10-15 14:00 | 75,625 | 0.594718609 | -0.054145443 | 9.907485 |
| 2026-10-15 15:00 | 26,507 | 0.031887156 | -0.095890844 | 9.811996 |
| 2026-10-15 16:00 | 11,975 | 1.788396177 | +0.000142676 | 9.841117 |
| 2026-10-15 17:00 | 7,184 | 0.057345287 | -0.012147188 | 9.798218 |
| 2026-10-15 18:00 | 2,881 | 0.091821916 | -0.020444249 | 9.783035 |
| 2026-10-15 19:00 | 4,536 | 0.089121624 | -0.022612522 | 9.770268 |
| 2026-10-15 20:00 | 1,320 | 0.203379158 | +0.001338169 | 9.782792 |

## Marks, volume and identical virtual strategies

The two entry-5 arms have **identical complete virtual close rows**, SHA256 `e1a697954d0aa5257ee08ed0fdbfe9cbfdac1a3d5a2abd45e8e3d65a405dca22`. Different funded cohorts and sizes result from final account caps and changing realized balances; the virtual strategy economics were unchanged. Sizing is not used to improve the primary unit return on an unchanged funded sample.

| Arm | Account minute-close open MTM $ | Engine endpoint open-mark export $ | Engine minus account $ |
|---|---:|---:|---:|
| control-entry0-gross7 | -0.509196218 | -0.509558930 | -0.000362711 |
| entry5-gross7 | -0.579408019 | -0.579926852 | -0.000518833 |
| entry5-gross1 | -0.076629515 | -0.076690704 | -0.000061189 |
| entry15-gross1 | -0.071463113 | -0.071517937 | -0.000054824 |

The DCA mark-basis difference is disclosed; account ending equity reconciles with the independently recomputed minute-close account mark, not the native engine endpoint export. Settled cash and unit PF are unaffected by this endpoint distinction.

## Reproducible evidence

Common instrumentation/source seal: `d3d99408adc40db8839f55503fd73628d3867ae0a61aa61d8846634767d8292f`. Verified complete ZIPs remain in the workspace and GitHub Actions retains artifacts for seven days. A full-raw durable archive attempt timed out without a receipt, so long-term full-raw archival is unconfirmed. Compact proofs, frozen protocols and the hourly report are supplied separately for archival. Expanded redundant histories may be removed locally only after verification; the untouched exact ZIPs retain lossless recovery.

| Arm | Artifact | ZIP SHA256 |
|---|---|---|
| control-entry0-gross7 | [12118321078](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077541410/artifacts/12118321078) | `95686b6a4e03893623212233f84465e563e1378de8195e41299be0187c8e6fbd` |
| entry5-gross7 | [12117234936](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077541410/artifacts/12117234936) | `ecea1310db6ce2e81371d908b501e34eeeab7478726f72dfc70a4e00967c2d95` |
| entry5-gross1 | [12118410011](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077541410/artifacts/12118410011) | `634e3ea6960471e7aeb9e99971100079c1af3b417897784d9a226a66ef5acc6b` |
| entry15-gross1 | [12118375185](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39077541410/artifacts/12118375185) | `99699c68ac78b63277ebefe6bf741d93c41a185fdd4f1ff2311791eed5a7bec3` |

The previous [20-symbol development results](development20-results-20261017.md) and [separate 22-symbol source study](source22-results-20261017.md) have different windows and account policies; their outcomes are not substituted for this holdout. No live promotion follows from this research.
