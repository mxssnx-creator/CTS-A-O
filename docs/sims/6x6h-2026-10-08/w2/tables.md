window 2026-10-07T12:00:00.000Z → 2026-10-07T18:00:00.000Z · simH 6 · runSeconds 1503

**Total / per range**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 843 | 0.82 | -303 | 2,365 | 0.25 | -2,550 | 0.44 | -2,853 |
| Micro | 6 | ∞ | 2 | 0 | – | 0 | ∞ | 2 |
| Short | 165 | 1.88 | 117 | 325 | 0.66 | -61 | 1.18 | 55 |
| General | 27 | 0.63 | -20 | 274 | 1.29 | 35 | 1.09 | 15 |
| Long | 19 | 1.42 | 13 | 275 | 0.96 | -7 | 1.03 | 6 |
| Signals | 626 | 0.72 | -414 | 1,491 | 0.14 | -2,518 | 0.34 | -2,931 |

**Per type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 109 | 1.27 | 37 | 473 | 1.18 | 39 | 1.21 | 76 |
| signals normal | 336 | 0.54 | -499 | 696 | 0.14 | -1,061 | 0.33 | -1,560 |
| signals trailing | 290 | 1.21 | 85 | 795 | 0.14 | -1,457 | 0.35 | -1,371 |
| trailing | 108 | 1.95 | 74 | 401 | 0.70 | -72 | 1.01 | 2 |

**Per side**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 242 | 1.77 | 220 | 615 | 0.40 | -427 | 0.79 | -207 |
| short | 601 | 0.63 | -522 | 1,750 | 0.21 | -2,124 | 0.35 | -2,646 |
| signals long | 236 | 1.77 | 218 | 615 | 0.40 | -427 | 0.79 | -208 |
| signals short | 390 | 0.47 | -632 | 876 | 0.06 | -2,091 | 0.20 | -2,723 |

**Range × type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| General · normal | 16 | 1.38 | 9 | 150 | 1.53 | 32 | 1.49 | 40 |
| General · trailing | 11 | 0.07 | -29 | 124 | 1.06 | 4 | 0.73 | -25 |
| Long · normal | 15 | 1.22 | 7 | 199 | 1.27 | 24 | 1.26 | 31 |
| Long · trailing | 4 | ∞ | 6 | 76 | 0.54 | -31 | 0.63 | -25 |
| Micro · normal | 6 | ∞ | 2 | 0 | – | 0 | ∞ | 2 |
| Short · normal | 72 | 1.23 | 20 | 124 | 0.75 | -17 | 1.02 | 3 |
| Short · trailing | 93 | 3.06 | 97 | 201 | 0.60 | -45 | 1.33 | 52 |
| Signals · signals normal | 336 | 0.54 | -499 | 696 | 0.14 | -1,061 | 0.33 | -1,560 |
| Signals · signals trailing | 290 | 1.21 | 85 | 795 | 0.14 | -1,457 | 0.35 | -1,371 |

**Variants** (reproduces: true) — PF incl. open ≈ (gp + max(openNet,0)) / (gl + max(−openNet,0))

| id | label | orders | PF closed | net % | open end | open net % | PF incl. open≈ | net incl. open % | beats baseline (PF incl. open AND orders) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| type:normal | Normal off | 32 | 31.27 | 124 | 41 | 7 | 33.07 | 132 |  |
| sig:count-200 | Active signals 200 | 479 | 5.20 | 941 | 1,043 | -1 | 5.19 | 941 |  |
| sig:count-100 | Active signals 100 | 439 | 4.43 | 768 | 982 | 50 | 4.66 | 818 |  |
| sig:rank-lowdd | Signal ranking lowdd | 731 | 2.30 | 1,028 | 1,448 | -405 | 1.52 | 623 |  |
| sig:signals | Signals off | 217 | 1.51 | 111 | 874 | -33 | 1.31 | 78 |  |
| type:crowd-sig-1 | Signals: at most 1 per bar | 281 | 1.29 | 94 | 920 | -56 | 1.10 | 38 |  |
| type:crowd-sig-3 | Signals: at most 3 per bar | 376 | 1.30 | 134 | 1,038 | -179 | 0.93 | -45 |  |
| sig:rank-drawdown | Signal ranking drawdown | 802 | 1.93 | 897 | 1,979 | -1,048 | 0.93 | -151 |  |
| type:crowd-sig-10 | Signals: at most 10 per bar | 587 | 1.20 | 157 | 1,475 | -706 | 0.63 | -549 |  |
| sig:engineSide | Engine direction acceptance off | 1,463 | 1.29 | 580 | 2,642 | -2,457 | 0.58 | -1,877 | **yes** |
| gate:validLastN-50 | Validation last 50 | 1,080 | 1.52 | 604 | 2,674 | -2,881 | 0.44 | -2,277 | **yes** |
| sig:engineSidePerInd-all | Engine direction acceptance per indication: every range | 1,062 | 1.02 | 37 | 2,436 | -2,549 | 0.43 | -2,513 | **yes** |
| sig:accept | Signal acceptance off | 1,105 | 1.08 | 147 | 2,976 | -3,421 | 0.39 | -3,273 | **yes** |
| gate:signalLastN-10 | Signals last 10 | 440 | 0.78 | -185 | 1,205 | -891 | 0.39 | -1,076 |  |
| gate:validLastN-35 | Validation last 35 | 1,087 | 1.38 | 475 | 2,902 | -3,259 | 0.38 | -2,784 | **yes** |
| coord:hourLock | Hour lock 1 % | 646 | 0.82 | -247 | 1,600 | -1,568 | 0.38 | -1,815 |  |
| gate:symGate-off | Symbol gate off | 1,127 | 0.89 | -218 | 2,982 | -2,811 | 0.38 | -3,028 | **yes** |
| type:dca | DCA on | 989 | 0.95 | -94 | 2,485 | -2,687 | 0.38 | -2,781 | **yes** |
| gate:signalLastN-15 | Signals last 15 | 398 | 0.77 | -184 | 1,175 | -836 | 0.37 | -1,020 |  |
| gate:validLastN-100 | Validation last 100 | 1,006 | 1.34 | 404 | 2,656 | -3,056 | 0.37 | -2,652 | **yes** |
| gate:validLastN-75 | Validation last 75 | 1,079 | 1.21 | 283 | 2,725 | -3,084 | 0.37 | -2,801 | **yes** |
| gate:validLastN-25 | Validation last 25 | 1,099 | 0.79 | -457 | 2,407 | -2,428 | 0.37 | -2,885 | **yes** |
| gate:signalLastN-25 | Signals last 25 | 395 | 0.79 | -171 | 1,213 | -931 | 0.37 | -1,102 |  |
| gate:signalLastN-5 | Signals last 5 | 492 | 0.72 | -281 | 1,320 | -960 | 0.37 | -1,241 |  |
| type:trailing | Trailing off | 406 | 0.58 | -474 | 1,050 | -728 | 0.36 | -1,202 |  |
| type:block | Block on | 843 | 0.83 | -963 | 2,365 | -7,714 | 0.35 | -8,678 |  |
| sig:engineSide-hours3 | Engine direction acceptance window 3 h | 892 | 0.82 | -318 | 2,389 | -2,471 | 0.34 | -2,789 | **yes** |
| gate:maxPositions | Position cap 12 | 838 | 0.82 | -308 | 2,095 | -2,451 | 0.34 | -2,760 |  |
| coord:conflict | Conflict block on | 727 | 0.77 | -357 | 1,767 | -2,019 | 0.34 | -2,376 |  |
| gate:validLastN-20 | Validation last 20 | 1,000 | 0.72 | -600 | 2,347 | -2,427 | 0.34 | -3,028 | **yes** |
| sig:accept-confirm | Signal acceptance and confirmation off | 2,676 | 0.91 | -507 | 6,041 | -9,153 | 0.34 | -9,660 | **yes** |
| gate:lossPrior | Loss prior on | 824 | 0.81 | -319 | 2,294 | -2,421 | 0.33 | -2,740 |  |
| gate:lastN-50 | Entry last 50 | 795 | 0.89 | -177 | 1,808 | -2,552 | 0.33 | -2,729 |  |
| gate:lastN-30 | Entry last 30 | 842 | 0.84 | -267 | 2,057 | -2,498 | 0.33 | -2,766 |  |
| gate:minGreen-0 | Green-hour gate off | 865 | 0.81 | -330 | 2,437 | -2,548 | 0.33 | -2,878 | **yes** |
| gate:minGreen-0.4 | Green hours ≥ 40 % | 865 | 0.81 | -330 | 2,437 | -2,548 | 0.33 | -2,878 | **yes** |
| gate:lastN-0 | Entry last-N off | 837 | 0.82 | -295 | 2,109 | -2,485 | 0.33 | -2,781 |  |
| gate:lastN-25 | Entry last 25 | 837 | 0.82 | -295 | 2,109 | -2,485 | 0.33 | -2,781 |  |
| gate:rangeGate-n100 | Range gate last 100 | 843 | 0.83 | -295 | 2,362 | -2,545 | 0.33 | -2,840 |  |
| gate:rangeGate-n50 | Range gate last 50 | 835 | 0.83 | -287 | 2,338 | -2,542 | 0.33 | -2,830 |  |
| gate:rangeGate-off | Range gate off | 845 | 0.82 | -298 | 2,368 | -2,552 | 0.33 | -2,850 | **yes** |
| gate:rangeGate-n15 | Range gate last 15 | 845 | 0.82 | -298 | 2,368 | -2,552 | 0.33 | -2,850 | **yes** |
| type:crowd-mc-10 | Micro: at most 10 per bar | 857 | 0.82 | -299 | 2,365 | -2,550 | 0.33 | -2,849 | **yes** |
| gate:rangeGate-n25 | Range gate last 25 | 843 | 0.83 | -296 | 2,362 | -2,551 | 0.33 | -2,847 |  |
| gate:rangeGate-allRanges | Range gate on General and Long too | 841 | 0.83 | -295 | 2,359 | -2,551 | 0.33 | -2,846 |  |
| type:crowd-mc-0 | Micro: no crowding cap | 901 | 0.82 | -313 | 2,365 | -2,550 | 0.33 | -2,863 | **yes** |
| baseline | Baseline (as run) | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:blockActive | Block Active on | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:axis | Axis off | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:crowd-wide-1 | Wide (incl. Axis, DCA): at most 1 per bar | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:crowd-wide-3 | Wide (incl. Axis, DCA): at most 3 per bar | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:crowd-wide-10 | Wide (incl. Axis, DCA): at most 10 per bar | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:ladder-needs-base | Axis / DCA only beside their pair's seated Normal | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:range-off-mn | Minimal off | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| type:range-off-mp | Minimal plus off | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| sig:engineSide-minPf1.2 | Engine direction acceptance PF 1.2 | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| sig:engineSide-minPf1.3 | Engine direction acceptance PF 1.3 | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| sig:engineSide-minTrades10 | Engine direction acceptance 10 closes | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| coord:hedge | Negative-hour hedge on | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| gate:symMinN-1 | Symbol gate closes 1 | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| gate:symMinN-5 | Symbol gate closes 5 | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| gate:symMinN-10 | Symbol gate closes 10 | 843 | 0.82 | -303 | 2,365 | -2,550 | 0.33 | -2,853 |  |
| sig:engineSide-hours48 | Engine direction acceptance window 48 h | 843 | 0.82 | -303 | 2,368 | -2,550 | 0.33 | -2,853 |  |
| sig:engineSide-minTrades60 | Engine direction acceptance 60 closes | 843 | 0.82 | -303 | 2,368 | -2,550 | 0.33 | -2,853 |  |
| type:crowd-mc-1 | Micro: at most 1 per bar | 839 | 0.82 | -304 | 2,365 | -2,550 | 0.33 | -2,854 |  |
| gate:lastN-20 | Entry last 20 | 840 | 0.81 | -319 | 2,211 | -2,510 | 0.33 | -2,829 |  |
| type:range-off-mc | Micro off | 837 | 0.82 | -304 | 2,365 | -2,550 | 0.33 | -2,855 |  |
| sig:engineSidePerInd-off | Engine direction acceptance per indication: pooled per range | 837 | 0.82 | -304 | 2,365 | -2,550 | 0.33 | -2,855 |  |
| gate:rangeGate-n35 | Range gate last 35 | 841 | 0.82 | -306 | 2,356 | -2,547 | 0.33 | -2,853 |  |
| sig:engineSide-hours12 | Engine direction acceptance window 12 h | 857 | 0.82 | -316 | 2,365 | -2,550 | 0.33 | -2,867 |  |
| type:crowd-lg-3 | Long: at most 3 per bar | 838 | 0.82 | -297 | 2,146 | -2,561 | 0.33 | -2,858 |  |
| gate:rangeGate-pf1.2 | Range gate PF 1.20 | 835 | 0.82 | -298 | 2,344 | -2,552 | 0.33 | -2,850 |  |
| gate:lastNFloor-8 | Last-N floor 8 | 840 | 0.82 | -304 | 2,284 | -2,573 | 0.33 | -2,877 |  |
| type:crowd-lg-10 | Long: at most 10 per bar | 843 | 0.82 | -303 | 2,230 | -2,587 | 0.33 | -2,890 |  |
| gate:lastN-35 | Entry last 35 | 829 | 0.84 | -262 | 1,964 | -2,538 | 0.33 | -2,800 |  |
| type:crowd-lg-1 | Long: at most 1 per bar | 830 | 0.82 | -301 | 2,114 | -2,548 | 0.33 | -2,850 |  |
| gate:rangeGate-pf1.35 | Range gate PF 1.35 | 808 | 0.83 | -287 | 2,261 | -2,525 | 0.33 | -2,813 |  |
| gate:lastN-10 | Entry last 10 | 968 | 0.78 | -426 | 2,802 | -2,713 | 0.33 | -3,140 |  |
| type:crowd-gn-10 | General: at most 10 per bar | 843 | 0.82 | -303 | 2,218 | -2,624 | 0.32 | -2,926 |  |
| type:range-off-gn | General off | 816 | 0.83 | -282 | 2,091 | -2,586 | 0.32 | -2,868 |  |
| type:crowd-gn-1 | General: at most 1 per bar | 825 | 0.82 | -294 | 2,109 | -2,594 | 0.32 | -2,888 |  |
| type:range-off-lg | Long off | 824 | 0.81 | -316 | 2,090 | -2,543 | 0.32 | -2,859 |  |
| type:crowd-gn-3 | General: at most 3 per bar | 834 | 0.82 | -307 | 2,140 | -2,610 | 0.32 | -2,917 |  |
| sig:confirm | Signal confirmation off | 1,910 | 0.74 | -1,124 | 4,507 | -5,809 | 0.32 | -6,933 |  |
| coord:all | Coordination off | 1,910 | 0.74 | -1,124 | 4,507 | -5,809 | 0.32 | -6,933 |  |
| gate:lastN-75 | Entry last 75 | 895 | 0.79 | -379 | 2,157 | -2,733 | 0.32 | -3,112 |  |
| gate:validLastN-0 | Validation last-N off | 1,492 | 0.74 | -745 | 3,449 | -3,890 | 0.32 | -4,634 |  |
| gate:lastN-5 | Entry last 5 | 959 | 0.74 | -522 | 2,741 | -2,746 | 0.31 | -3,267 |  |
| gate:symGate-proven | Symbol gate proven | 930 | 0.74 | -500 | 2,500 | -2,780 | 0.31 | -3,280 |  |
| gate:symGate-veto | Symbol gate veto | 930 | 0.74 | -500 | 2,504 | -2,783 | 0.31 | -3,283 |  |
| gate:lastNFloor-3 | Last-N floor 3 | 999 | 0.69 | -643 | 2,529 | -2,723 | 0.30 | -3,365 |  |
| type:crowd-sh-10 | Short: at most 10 per bar | 755 | 0.74 | -429 | 2,175 | -2,526 | 0.30 | -2,955 |  |
| coord:s2Windows | Stable-02 windows on | 478 | 0.91 | -83 | 1,191 | -1,852 | 0.30 | -1,935 |  |
| gate:validLastN-10 | Validation last 10 | 944 | 0.69 | -631 | 2,360 | -2,742 | 0.29 | -3,372 |  |
| gate:rangeGate-strict | Range gate on its full last N | 698 | 0.64 | -606 | 2,140 | -2,005 | 0.29 | -2,611 |  |
| gate:lastNFloor-10 | Last-N floor 10 | 773 | 0.74 | -447 | 2,263 | -2,596 | 0.29 | -3,042 |  |
| gate:warmup | Sample warm-up off (strict) | 755 | 0.73 | -443 | 2,171 | -2,565 | 0.29 | -3,008 |  |
| gate:lossPrior-strictRange | Loss prior on, range gate on its full last N | 690 | 0.64 | -605 | 2,136 | -2,005 | 0.29 | -2,610 |  |
| gate:lastNFloor-15 | Last-N floor 15 | 764 | 0.73 | -455 | 2,247 | -2,602 | 0.29 | -3,057 |  |
| type:crowd-sh-3 | Short: at most 3 per bar | 708 | 0.74 | -427 | 2,094 | -2,501 | 0.29 | -2,928 |  |
| type:crowd-sh-1 | Short: at most 1 per bar | 690 | 0.73 | -423 | 2,061 | -2,493 | 0.29 | -2,915 |  |
| type:range-off-sh | Short off | 678 | 0.73 | -419 | 2,040 | -2,489 | 0.28 | -2,908 |  |
| gate:sideGateN | Direction gate 10 | 730 | 0.72 | -456 | 1,851 | -2,544 | 0.28 | -3,000 |  |
| gate:lastNFloor-0 | Last-N floor off | 649 | 0.61 | -638 | 2,017 | -1,896 | 0.28 | -2,534 |  |
| gate:minGreen-0.6 | Green hours ≥ 60 % | 485 | 1.26 | 164 | 1,471 | -2,340 | 0.27 | -2,175 |  |
| coord:cooldown-signals | Cooldown signals | 667 | 0.63 | -603 | 1,795 | -2,377 | 0.25 | -2,979 |  |
| gate:lastNFloor-25 | Last-N floor 25 | 714 | 0.63 | -630 | 2,218 | -2,525 | 0.25 | -3,155 |  |
| coord:cooldown-all | Cooldown all | 592 | 0.55 | -717 | 983 | -2,463 | 0.22 | -3,180 |  |

not run: type:dcaActive (na), block:off-mc (na), block:off-mn (na), block:off-sh (na), block:mode-shared (na), block:mode-additive (na), block:steps (na), tactic:session (recompute), tactic:volRegime (recompute), tactic:trendStrength (recompute), tactic:chopRegime (recompute), tactic:cooldown (recompute)
