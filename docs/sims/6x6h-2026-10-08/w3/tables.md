window 2026-10-07T06:00:00.000Z → 2026-10-07T12:00:00.000Z · simH 6 · runSeconds 1521

**Total / per range**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 918 | 3.93 | 1,669 | 2,347 | 1.09 | 174 | 1.74 | 1,843 |
| Micro | 24 | 0.29 | -12 | 0 | – | 0 | 0.29 | -12 |
| General | 34 | 13.28 | 98 | 9 | 1.23 | 0 | 10.75 | 99 |
| Signals | 860 | 3.91 | 1,583 | 2,338 | 1.09 | 173 | 1.72 | 1,756 |

**Per type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 42 | 5.06 | 61 | 4 | 1.47 | 0 | 4.86 | 61 |
| signals normal | 453 | 2.73 | 738 | 1,147 | 1.18 | 145 | 1.72 | 883 |
| signals trailing | 407 | 8.09 | 844 | 1,191 | 1.03 | 28 | 1.71 | 873 |
| trailing | 16 | 3.70 | 26 | 5 | 1.06 | 0 | 3.40 | 26 |

**Per side**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 113 | 0.04 | -528 | 308 | 0.00 | -1,663 | 0.01 | -2,191 |
| short | 805 | 121.66 | 2,197 | 2,039 | 8.43 | 1,836 | 16.19 | 4,033 |
| signals long | 95 | 0.04 | -515 | 308 | 0.00 | -1,663 | 0.01 | -2,178 |
| signals short | 765 | 206.47 | 2,097 | 2,030 | 8.49 | 1,836 | 16.40 | 3,933 |

**Range × type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| General · normal | 21 | 18.74 | 67 | 4 | 1.47 | 0 | 15.46 | 68 |
| General · trailing | 13 | 8.35 | 31 | 5 | 1.06 | 0 | 6.69 | 31 |
| Micro · normal | 21 | 0.43 | -6 | 0 | – | 0 | 0.43 | -6 |
| Micro · trailing | 3 | 0.00 | -5 | 0 | – | 0 | 0.00 | -5 |
| Signals · signals normal | 453 | 2.73 | 738 | 1,147 | 1.18 | 145 | 1.72 | 883 |
| Signals · signals trailing | 407 | 8.09 | 844 | 1,191 | 1.03 | 28 | 1.71 | 873 |

**Variants** (reproduces: true) — PF incl. open ≈ (gp + max(openNet,0)) / (gl + max(−openNet,0))

| id | label | orders | PF closed | net % | open end | open net % | PF incl. open≈ | net incl. open % | beats baseline (PF incl. open AND orders) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| type:normal | Normal off | 31 | 4.00 | 62 | 193 | 288 | ∞ | 351 |  |
| sig:accept | Signal acceptance off | 1,810 | 7.64 | 4,500 | 3,253 | 1,281 | 9.53 | 5,780 | **yes** |
| gate:signalLastN-25 | Signals last 25 | 356 | 5.97 | 806 | 1,080 | 272 | 7.64 | 1,078 |  |
| coord:cooldown-all | Cooldown all | 412 | 5.15 | 844 | 1,397 | 390 | 7.06 | 1,234 |  |
| coord:cooldown-signals | Cooldown signals | 445 | 4.89 | 887 | 1,400 | 389 | 6.60 | 1,276 |  |
| gate:signalLastN-10 | Signals last 10 | 312 | 4.34 | 602 | 1,096 | 346 | 6.27 | 948 |  |
| gate:minGreen-0.6 | Green hours ≥ 60 % | 627 | 6.88 | 1,231 | 1,935 | -38 | 5.83 | 1,193 |  |
| gate:signalLastN-15 | Signals last 15 | 333 | 4.23 | 664 | 1,068 | 264 | 5.52 | 928 |  |
| coord:hourLock | Hour lock 1 % | 341 | 4.46 | 703 | 447 | 85 | 4.88 | 789 |  |
| coord:s2Windows | Stable-02 windows on | 838 | 4.28 | 1,607 | 2,061 | 248 | 4.78 | 1,855 |  |
| sig:signals | Signals off | 58 | 4.54 | 87 | 9 | 0 | 4.56 | 87 |  |
| sig:engineSide-hours12 | Engine direction acceptance window 12 h | 1,095 | 4.15 | 1,987 | 2,387 | 208 | 4.48 | 2,195 | **yes** |
| gate:lastNFloor-8 | Last-N floor 8 | 906 | 4.05 | 1,685 | 2,347 | 174 | 4.36 | 1,859 |  |
| gate:lastNFloor-10 | Last-N floor 10 | 903 | 4.05 | 1,684 | 2,347 | 174 | 4.36 | 1,858 |  |
| gate:validLastN-20 | Validation last 20 | 755 | 4.58 | 1,381 | 2,265 | -19 | 4.36 | 1,362 |  |
| gate:lossPrior | Loss prior on | 909 | 4.05 | 1,685 | 2,347 | 174 | 4.36 | 1,858 |  |
| type:range-off-mc | Micro off | 894 | 4.04 | 1,681 | 2,347 | 174 | 4.36 | 1,855 |  |
| gate:lastNFloor-15 | Last-N floor 15 | 899 | 4.04 | 1,681 | 2,346 | 172 | 4.35 | 1,853 |  |
| gate:lastNFloor-25 | Last-N floor 25 | 899 | 4.04 | 1,681 | 2,346 | 172 | 4.35 | 1,853 |  |
| gate:sideGateN | Direction gate 10 | 909 | 4.01 | 1,680 | 2,345 | 175 | 4.33 | 1,855 |  |
| type:crowd-mc-1 | Micro: at most 1 per bar | 902 | 4.01 | 1,677 | 2,347 | 174 | 4.32 | 1,851 |  |
| gate:minGreen-0 | Green-hour gate off | 942 | 4.07 | 1,750 | 2,394 | 130 | 4.30 | 1,880 | **yes** |
| gate:minGreen-0.4 | Green hours ≥ 40 % | 942 | 4.07 | 1,750 | 2,394 | 130 | 4.30 | 1,880 | **yes** |
| gate:warmup | Sample warm-up off (strict) | 879 | 3.95 | 1,632 | 2,343 | 174 | 4.27 | 1,806 |  |
| gate:lastN-10 | Entry last 10 | 920 | 3.94 | 1,668 | 2,355 | 186 | 4.26 | 1,854 | **yes** |
| gate:rangeGate-off | Range gate off | 919 | 3.93 | 1,669 | 2,362 | 184 | 4.26 | 1,853 | **yes** |
| gate:rangeGate-n15 | Range gate last 15 | 919 | 3.93 | 1,669 | 2,362 | 184 | 4.26 | 1,853 | **yes** |
| gate:rangeGate-n25 | Range gate last 25 | 919 | 3.93 | 1,669 | 2,362 | 184 | 4.26 | 1,853 | **yes** |
| gate:rangeGate-n35 | Range gate last 35 | 919 | 3.93 | 1,669 | 2,362 | 184 | 4.26 | 1,853 | **yes** |
| gate:rangeGate-n50 | Range gate last 50 | 919 | 3.93 | 1,669 | 2,362 | 184 | 4.26 | 1,853 | **yes** |
| gate:rangeGate-n100 | Range gate last 100 | 919 | 3.93 | 1,669 | 2,362 | 184 | 4.26 | 1,853 | **yes** |
| gate:lastNFloor-3 | Last-N floor 3 | 918 | 3.93 | 1,669 | 2,350 | 180 | 4.25 | 1,849 |  |
| baseline | Baseline (as run) | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:blockActive | Block Active on | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-sh-1 | Short: at most 1 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-sh-3 | Short: at most 3 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-sh-10 | Short: at most 10 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-lg-1 | Long: at most 1 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-lg-3 | Long: at most 3 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-lg-10 | Long: at most 10 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-wide-1 | Wide (incl. Axis, DCA): at most 1 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-wide-3 | Wide (incl. Axis, DCA): at most 3 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:crowd-wide-10 | Wide (incl. Axis, DCA): at most 10 per bar | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:range-off-mn | Minimal off | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:range-off-mp | Minimal plus off | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:range-off-sh | Short off | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| type:range-off-lg | Long off | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| sig:engineSide-minTrades10 | Engine direction acceptance 10 closes | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| sig:engineSide-minTrades60 | Engine direction acceptance 60 closes | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| coord:hedge | Negative-hour hedge on | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| gate:symMinN-1 | Symbol gate closes 1 | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| gate:symMinN-5 | Symbol gate closes 5 | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| gate:symMinN-10 | Symbol gate closes 10 | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| gate:maxPositions | Position cap 12 | 918 | 3.93 | 1,669 | 2,347 | 174 | 4.24 | 1,843 |  |
| sig:engineSidePerInd-off | Engine direction acceptance per indication: pooled per range | 906 | 3.93 | 1,666 | 2,347 | 174 | 4.23 | 1,839 |  |
| gate:rangeGate-allRanges | Range gate on General and Long too | 916 | 3.92 | 1,661 | 2,347 | 174 | 4.22 | 1,834 |  |
| type:crowd-gn-10 | General: at most 10 per bar | 913 | 3.90 | 1,651 | 2,347 | 174 | 4.21 | 1,825 |  |
| gate:lastN-0 | Entry last-N off | 899 | 3.88 | 1,629 | 2,345 | 183 | 4.21 | 1,812 |  |
| gate:lastN-25 | Entry last 25 | 899 | 3.88 | 1,629 | 2,345 | 183 | 4.21 | 1,812 |  |
| gate:lastN-30 | Entry last 30 | 904 | 3.88 | 1,629 | 2,345 | 183 | 4.20 | 1,811 |  |
| gate:lastN-20 | Entry last 20 | 904 | 3.88 | 1,627 | 2,344 | 181 | 4.20 | 1,808 |  |
| gate:rangeGate-pf1.2 | Range gate PF 1.20 | 915 | 3.92 | 1,662 | 2,335 | 149 | 4.18 | 1,811 |  |
| type:crowd-gn-3 | General: at most 3 per bar | 901 | 3.87 | 1,622 | 2,346 | 174 | 4.18 | 1,796 |  |
| gate:lastN-35 | Entry last 35 | 900 | 3.85 | 1,611 | 2,344 | 182 | 4.17 | 1,792 |  |
| type:dca | DCA on | 923 | 3.93 | 1,670 | 2,488 | 130 | 4.16 | 1,800 |  |
| type:trailing | Trailing off | 331 | 3.38 | 584 | 924 | 181 | 4.12 | 765 |  |
| gate:symGate-veto | Symbol gate veto | 931 | 3.82 | 1,657 | 2,347 | 178 | 4.12 | 1,834 |  |
| type:crowd-gn-1 | General: at most 1 per bar | 891 | 3.81 | 1,588 | 2,341 | 174 | 4.12 | 1,762 |  |
| gate:lastN-5 | Entry last 5 | 915 | 3.77 | 1,633 | 2,375 | 198 | 4.11 | 1,831 |  |
| gate:symGate-proven | Symbol gate proven | 929 | 3.81 | 1,651 | 2,347 | 178 | 4.11 | 1,829 |  |
| type:range-off-gn | General off | 884 | 3.80 | 1,571 | 2,338 | 173 | 4.11 | 1,744 |  |
| sig:engineSide-minPf1.2 | Engine direction acceptance PF 1.2 | 884 | 3.80 | 1,571 | 2,340 | 172 | 4.11 | 1,743 |  |
| sig:engineSide-minPf1.3 | Engine direction acceptance PF 1.3 | 878 | 3.80 | 1,568 | 2,338 | 173 | 4.10 | 1,741 |  |
| gate:symGate-off | Symbol gate off | 938 | 3.78 | 1,662 | 2,353 | 183 | 4.08 | 1,845 |  |
| gate:rangeGate-pf1.35 | Range gate PF 1.35 | 886 | 3.83 | 1,611 | 2,302 | 120 | 4.04 | 1,731 |  |
| type:axis | Axis off | 918 | 3.93 | 1,669 | 2,281 | 61 | 4.04 | 1,730 |  |
| type:ladder-needs-base | Axis / DCA only beside their pair's seated Normal | 918 | 3.93 | 1,669 | 2,281 | 61 | 4.04 | 1,730 |  |
| type:crowd-mc-10 | Micro: at most 10 per bar | 970 | 3.72 | 1,645 | 2,351 | 167 | 4.00 | 1,812 |  |
| gate:lastN-75 | Entry last 75 | 911 | 3.65 | 1,581 | 2,356 | 206 | 3.99 | 1,786 |  |
| gate:lastNFloor-0 | Last-N floor off | 760 | 3.65 | 1,402 | 2,023 | 183 | 3.99 | 1,585 |  |
| gate:rangeGate-strict | Range gate on its full last N | 760 | 3.65 | 1,402 | 2,023 | 183 | 3.99 | 1,585 |  |
| gate:lossPrior-strictRange | Loss prior on, range gate on its full last N | 760 | 3.65 | 1,402 | 2,023 | 183 | 3.99 | 1,585 |  |
| coord:conflict | Conflict block on | 817 | 3.60 | 1,408 | 2,125 | 201 | 3.97 | 1,608 |  |
| gate:lastN-50 | Entry last 50 | 892 | 3.61 | 1,544 | 2,348 | 199 | 3.95 | 1,742 |  |
| type:block | Block on | 918 | 3.65 | 4,547 | 2,347 | 449 | 3.91 | 4,997 |  |
| type:crowd-sig-10 | Signals: at most 10 per bar | 615 | 3.25 | 887 | 932 | 127 | 3.57 | 1,013 |  |
| gate:validLastN-25 | Validation last 25 | 825 | 4.71 | 1,515 | 2,532 | -150 | 3.45 | 1,365 |  |
| type:crowd-sig-1 | Signals: at most 1 per bar | 144 | 2.91 | 174 | 102 | 46 | 3.42 | 220 |  |
| type:crowd-sig-3 | Signals: at most 3 per bar | 281 | 2.88 | 352 | 295 | 82 | 3.32 | 434 |  |
| gate:validLastN-35 | Validation last 35 | 860 | 4.26 | 1,470 | 2,618 | -321 | 2.49 | 1,148 |  |
| gate:signalLastN-5 | Signals last 5 | 352 | 2.12 | 391 | 1,148 | 113 | 2.45 | 504 |  |
| sig:accept-confirm | Signal acceptance and confirmation off | 3,326 | 3.29 | 5,994 | 6,158 | -1,127 | 2.30 | 4,867 |  |
| type:crowd-mc-0 | Micro: no crowding cap | 2,124 | 2.12 | 1,309 | 2,479 | -22 | 2.08 | 1,287 |  |
| sig:engineSide-hours48 | Engine direction acceptance window 48 h | 1,006 | 2.00 | 1,091 | 2,465 | -81 | 1.86 | 1,009 |  |
| gate:validLastN-75 | Validation last 75 | 807 | 1.91 | 792 | 2,775 | -70 | 1.77 | 722 |  |
| gate:validLastN-0 | Validation last-N off | 1,216 | 2.06 | 1,393 | 3,333 | -249 | 1.73 | 1,144 |  |
| gate:validLastN-50 | Validation last 50 | 875 | 2.06 | 988 | 2,598 | -338 | 1.51 | 650 |  |
| sig:engineSide-hours3 | Engine direction acceptance window 3 h | 1,165 | 1.33 | 557 | 2,406 | 10 | 1.34 | 567 |  |
| sig:engineSidePerInd-all | Engine direction acceptance per indication: every range | 1,365 | 1.54 | 936 | 2,667 | -287 | 1.32 | 650 |  |
| gate:validLastN-100 | Validation last 100 | 781 | 1.51 | 526 | 2,681 | -159 | 1.31 | 367 |  |
| sig:engineSide | Engine direction acceptance off | 1,517 | 1.46 | 872 | 2,760 | -394 | 1.21 | 478 |  |
| sig:confirm | Signal confirmation off | 1,919 | 2.39 | 2,606 | 4,385 | -1,846 | 1.20 | 760 |  |
| coord:all | Coordination off | 1,919 | 2.39 | 2,606 | 4,385 | -1,846 | 1.20 | 760 |  |
| gate:validLastN-10 | Validation last 10 | 865 | 1.42 | 519 | 2,638 | -529 | 0.99 | -9 |  |
| sig:rank-drawdown | Signal ranking drawdown | 574 | 2.53 | 804 | 1,128 | -1,678 | 0.60 | -874 |  |
| sig:rank-lowdd | Signal ranking lowdd | 400 | 1.61 | 305 | 825 | -1,860 | 0.34 | -1,555 |  |
| sig:count-100 | Active signals 100 | 200 | 1.29 | 93 | 170 | -987 | 0.32 | -894 |  |
| sig:count-200 | Active signals 200 | 217 | 1.29 | 99 | 210 | -1,040 | 0.32 | -941 |  |

not run: type:dcaActive (na), block:off-mc (na), block:off-mn (na), block:off-sh (na), block:mode-shared (na), block:mode-additive (na), block:steps (na), tactic:session (recompute), tactic:volRegime (recompute), tactic:trendStrength (recompute), tactic:chopRegime (recompute), tactic:cooldown (recompute)
