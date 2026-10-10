window 2026-10-07T18:00:00.000Z → 2026-10-08T00:00:00.000Z · simH 6 · runSeconds 1542

**Total / per range**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 943 | 0.40 | -1,225 | 3,662 | 0.09 | -5,291 | 0.17 | -6,517 |
| Micro | 12 | 0.31 | -5 | 0 | – | 0 | 0.31 | -5 |
| Short | 509 | 0.20 | -949 | 581 | 0.09 | -737 | 0.15 | -1,686 |
| General | 44 | 0.13 | -96 | 61 | 0.68 | -9 | 0.24 | -104 |
| Long | 17 | 0.01 | -58 | 109 | 0.20 | -85 | 0.13 | -143 |
| Signals | 361 | 0.83 | -118 | 2,911 | 0.08 | -4,460 | 0.17 | -4,578 |

**Per type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 194 | 0.15 | -441 | 299 | 0.14 | -301 | 0.15 | -742 |
| signals normal | 206 | 0.45 | -336 | 1,390 | 0.09 | -1,946 | 0.17 | -2,282 |
| signals trailing | 155 | 4.33 | 218 | 1,521 | 0.07 | -2,514 | 0.17 | -2,296 |
| trailing | 388 | 0.21 | -666 | 452 | 0.11 | -530 | 0.16 | -1,196 |

**Per side**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 64 | 0.83 | -16 | 1,314 | 0.20 | -983 | 0.24 | -998 |
| short | 879 | 0.38 | -1,209 | 2,348 | 0.06 | -4,309 | 0.15 | -5,518 |
| signals long | 61 | 0.83 | -15 | 1,314 | 0.20 | -983 | 0.24 | -998 |
| signals short | 300 | 0.82 | -102 | 1,597 | 0.04 | -3,478 | 0.15 | -3,580 |

**Range × type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| General · normal | 35 | 0.08 | -88 | 36 | 0.56 | -8 | 0.16 | -96 |
| General · trailing | 9 | 0.47 | -7 | 25 | 0.92 | -1 | 0.64 | -8 |
| Long · normal | 13 | 0.00 | -52 | 75 | 0.12 | -81 | 0.08 | -134 |
| Long · trailing | 4 | 0.08 | -6 | 34 | 0.72 | -4 | 0.53 | -10 |
| Micro · normal | 9 | 0.33 | -5 | 0 | – | 0 | 0.33 | -5 |
| Micro · trailing | 3 | 0.00 | -0 | 0 | – | 0 | 0.00 | -0 |
| Short · normal | 137 | 0.19 | -296 | 188 | 0.11 | -212 | 0.16 | -507 |
| Short · trailing | 372 | 0.20 | -653 | 393 | 0.08 | -525 | 0.15 | -1,178 |
| Signals · signals normal | 206 | 0.45 | -336 | 1,390 | 0.09 | -1,946 | 0.17 | -2,282 |
| Signals · signals trailing | 155 | 4.33 | 218 | 1,521 | 0.07 | -2,514 | 0.17 | -2,296 |

**Variants** (reproduces: true) — PF incl. open ≈ (gp + max(openNet,0)) / (gl + max(−openNet,0))

| id | label | orders | PF closed | net % | open end | open net % | PF incl. open≈ | net incl. open % | beats baseline (PF incl. open AND orders) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| sig:accept-confirm | Signal acceptance and confirmation off | 2,044 | 0.84 | -548 | 8,200 | -10,967 | 0.20 | -11,515 | **yes** |
| sig:engineSide-hours3 | Engine direction acceptance window 3 h | 822 | 0.74 | -334 | 3,615 | -4,546 | 0.16 | -4,880 |  |
| coord:hourLock | Hour lock 1 % | 629 | 0.52 | -562 | 2,663 | -3,161 | 0.14 | -3,723 |  |
| gate:validLastN-0 | Validation last-N off | 1,596 | 0.39 | -1,988 | 4,750 | -6,030 | 0.14 | -8,018 | **yes** |
| sig:count-100 | Active signals 100 | 608 | 0.23 | -1,049 | 950 | -936 | 0.14 | -1,985 |  |
| gate:validLastN-35 | Validation last 35 | 1,183 | 0.42 | -1,366 | 3,857 | -5,068 | 0.13 | -6,434 | **yes** |
| gate:validLastN-50 | Validation last 50 | 1,160 | 0.43 | -1,308 | 4,170 | -5,162 | 0.13 | -6,470 | **yes** |
| sig:engineSide | Engine direction acceptance off | 1,208 | 0.43 | -1,307 | 4,218 | -5,135 | 0.13 | -6,442 | **yes** |
| gate:validLastN-75 | Validation last 75 | 1,094 | 0.45 | -1,208 | 4,085 | -5,221 | 0.13 | -6,429 | **yes** |
| gate:symGate-off | Symbol gate off | 1,325 | 0.41 | -1,586 | 3,894 | -5,683 | 0.13 | -7,269 | **yes** |
| sig:confirm | Signal confirmation off | 1,445 | 0.49 | -1,612 | 5,632 | -8,526 | 0.13 | -10,138 | **yes** |
| coord:all | Coordination off | 1,445 | 0.49 | -1,612 | 5,632 | -8,526 | 0.13 | -10,138 | **yes** |
| type:block | Block on | 943 | 0.33 | -7,021 | 3,662 | -16,361 | 0.13 | -23,382 |  |
| sig:count-200 | Active signals 200 | 599 | 0.22 | -1,057 | 1,109 | -1,049 | 0.13 | -2,106 |  |
| sig:engineSidePerInd-all | Engine direction acceptance per indication: every range | 1,137 | 0.40 | -1,332 | 3,912 | -5,196 | 0.12 | -6,528 | **yes** |
| gate:maxPositions | Position cap 12 | 799 | 0.53 | -709 | 3,589 | -5,143 | 0.12 | -5,852 |  |
| type:crowd-sig-10 | Signals: at most 10 per bar | 830 | 0.31 | -1,291 | 2,126 | -2,934 | 0.12 | -4,225 |  |
| gate:symGate-proven | Symbol gate proven | 1,043 | 0.40 | -1,372 | 3,654 | -5,344 | 0.12 | -6,716 | **yes** |
| gate:symGate-veto | Symbol gate veto | 1,043 | 0.40 | -1,372 | 3,658 | -5,347 | 0.12 | -6,720 | **yes** |
| gate:signalLastN-5 | Signals last 5 | 647 | 0.25 | -1,092 | 1,338 | -1,600 | 0.12 | -2,692 |  |
| gate:validLastN-100 | Validation last 100 | 884 | 0.46 | -979 | 3,901 | -5,076 | 0.12 | -6,055 |  |
| gate:validLastN-10 | Validation last 10 | 1,055 | 0.40 | -1,321 | 3,722 | -5,267 | 0.12 | -6,588 | **yes** |
| type:crowd-sig-1 | Signals: at most 1 per bar | 638 | 0.20 | -1,196 | 914 | -1,066 | 0.12 | -2,261 |  |
| sig:signals | Signals off | 582 | 0.19 | -1,108 | 751 | -831 | 0.12 | -1,939 |  |
| gate:validLastN-25 | Validation last 25 | 1,056 | 0.38 | -1,402 | 3,755 | -5,048 | 0.12 | -6,450 | **yes** |
| gate:signalLastN-25 | Signals last 25 | 621 | 0.23 | -1,090 | 1,016 | -1,361 | 0.12 | -2,451 |  |
| gate:signalLastN-10 | Signals last 10 | 617 | 0.22 | -1,100 | 1,051 | -1,319 | 0.12 | -2,419 |  |
| type:axis | Axis off | 942 | 0.40 | -1,221 | 3,560 | -4,993 | 0.12 | -6,214 |  |
| type:ladder-needs-base | Axis / DCA only beside their pair's seated Normal | 942 | 0.40 | -1,221 | 3,560 | -4,993 | 0.12 | -6,214 |  |
| gate:signalLastN-15 | Signals last 15 | 618 | 0.22 | -1,093 | 1,001 | -1,289 | 0.11 | -2,382 |  |
| gate:minGreen-0.6 | Green hours ≥ 60 % | 713 | 0.51 | -710 | 3,362 | -4,921 | 0.11 | -5,631 |  |
| gate:sideGateN | Direction gate 10 | 770 | 0.45 | -896 | 3,071 | -4,738 | 0.11 | -5,635 |  |
| gate:validLastN-20 | Validation last 20 | 1,048 | 0.38 | -1,396 | 3,660 | -5,212 | 0.11 | -6,608 | **yes** |
| type:crowd-mc-0 | Micro: no crowding cap | 1,057 | 0.41 | -1,228 | 3,662 | -5,291 | 0.11 | -6,519 | **yes** |
| gate:lastN-20 | Entry last 20 | 776 | 0.47 | -846 | 3,593 | -5,141 | 0.11 | -5,987 |  |
| type:range-off-lg | Long off | 926 | 0.41 | -1,167 | 3,553 | -5,206 | 0.11 | -6,373 |  |
| sig:accept | Signal acceptance off | 1,153 | 0.49 | -1,166 | 5,444 | -7,580 | 0.11 | -8,746 | **yes** |
| gate:rangeGate-n50 | Range gate last 50 | 955 | 0.40 | -1,222 | 3,672 | -5,315 | 0.11 | -6,537 | **yes** |
| type:crowd-sig-3 | Signals: at most 3 per bar | 699 | 0.22 | -1,290 | 1,239 | -1,579 | 0.11 | -2,869 |  |
| gate:rangeGate-off | Range gate off | 963 | 0.40 | -1,241 | 3,675 | -5,316 | 0.11 | -6,557 | **yes** |
| gate:rangeGate-n15 | Range gate last 15 | 963 | 0.40 | -1,241 | 3,675 | -5,316 | 0.11 | -6,557 | **yes** |
| type:crowd-lg-1 | Long: at most 1 per bar | 929 | 0.41 | -1,182 | 3,573 | -5,231 | 0.11 | -6,413 |  |
| gate:rangeGate-n25 | Range gate last 25 | 942 | 0.41 | -1,200 | 3,650 | -5,289 | 0.11 | -6,489 |  |
| gate:lossPrior-strictRange | Loss prior on, range gate on its full last N | 912 | 0.41 | -1,167 | 3,330 | -5,198 | 0.11 | -6,365 |  |
| type:crowd-sh-3 | Short: at most 3 per bar | 527 | 0.61 | -408 | 3,193 | -4,712 | 0.11 | -5,120 |  |
| coord:cooldown-all | Cooldown all | 584 | 0.38 | -817 | 1,831 | -3,129 | 0.11 | -3,946 |  |
| type:crowd-lg-3 | Long: at most 3 per bar | 935 | 0.40 | -1,201 | 3,592 | -5,253 | 0.11 | -6,454 |  |
| gate:lossPrior | Loss prior on | 918 | 0.41 | -1,176 | 3,573 | -5,236 | 0.11 | -6,412 |  |
| type:crowd-gn-3 | General: at most 3 per bar | 925 | 0.41 | -1,174 | 3,625 | -5,296 | 0.11 | -6,470 |  |
| gate:rangeGate-pf1.2 | Range gate PF 1.20 | 901 | 0.41 | -1,126 | 3,563 | -5,213 | 0.11 | -6,339 |  |
| gate:lastNFloor-3 | Last-N floor 3 | 949 | 0.40 | -1,222 | 3,662 | -5,291 | 0.11 | -6,513 | **yes** |
| type:crowd-mc-10 | Micro: at most 10 per bar | 967 | 0.40 | -1,239 | 3,662 | -5,291 | 0.11 | -6,531 | **yes** |
| gate:rangeGate-n35 | Range gate last 35 | 945 | 0.40 | -1,213 | 3,662 | -5,305 | 0.11 | -6,518 | **yes** |
| gate:rangeGate-strict | Range gate on its full last N | 925 | 0.40 | -1,211 | 3,419 | -5,253 | 0.11 | -6,464 |  |
| type:crowd-lg-10 | Long: at most 10 per bar | 942 | 0.40 | -1,222 | 3,629 | -5,282 | 0.11 | -6,504 |  |
| type:crowd-gn-10 | General: at most 10 per bar | 940 | 0.40 | -1,215 | 3,640 | -5,296 | 0.11 | -6,511 |  |
| gate:minGreen-0 | Green-hour gate off | 957 | 0.39 | -1,258 | 3,679 | -5,304 | 0.11 | -6,562 | **yes** |
| gate:minGreen-0.4 | Green hours ≥ 40 % | 957 | 0.39 | -1,258 | 3,679 | -5,304 | 0.11 | -6,562 | **yes** |
| gate:rangeGate-allRanges | Range gate on General and Long too | 938 | 0.40 | -1,220 | 3,657 | -5,287 | 0.11 | -6,507 |  |
| sig:engineSide-hours12 | Engine direction acceptance window 12 h | 942 | 0.40 | -1,225 | 3,437 | -5,290 | 0.11 | -6,515 |  |
| baseline | Baseline (as run) | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| type:blockActive | Block Active on | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| type:crowd-wide-1 | Wide (incl. Axis, DCA): at most 1 per bar | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| type:crowd-wide-3 | Wide (incl. Axis, DCA): at most 3 per bar | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| type:crowd-wide-10 | Wide (incl. Axis, DCA): at most 10 per bar | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| type:range-off-mn | Minimal off | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| type:range-off-mp | Minimal plus off | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| sig:engineSide-minPf1.2 | Engine direction acceptance PF 1.2 | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| sig:engineSide-minPf1.3 | Engine direction acceptance PF 1.3 | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| sig:engineSide-minTrades10 | Engine direction acceptance 10 closes | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| sig:engineSide-minTrades60 | Engine direction acceptance 60 closes | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| coord:hedge | Negative-hour hedge on | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| gate:symMinN-1 | Symbol gate closes 1 | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| gate:symMinN-5 | Symbol gate closes 5 | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| gate:symMinN-10 | Symbol gate closes 10 | 943 | 0.40 | -1,225 | 3,662 | -5,291 | 0.11 | -6,517 |  |
| gate:lastNFloor-0 | Last-N floor off | 925 | 0.40 | -1,211 | 3,352 | -5,278 | 0.11 | -6,489 |  |
| sig:engineSide-hours48 | Engine direction acceptance window 48 h | 946 | 0.40 | -1,232 | 3,662 | -5,291 | 0.11 | -6,523 |  |
| type:crowd-mc-1 | Micro: at most 1 per bar | 935 | 0.40 | -1,222 | 3,662 | -5,291 | 0.11 | -6,513 |  |
| type:range-off-gn | General off | 899 | 0.41 | -1,130 | 3,601 | -5,283 | 0.11 | -6,412 |  |
| type:range-off-mc | Micro off | 931 | 0.40 | -1,220 | 3,662 | -5,291 | 0.11 | -6,511 |  |
| sig:engineSidePerInd-off | Engine direction acceptance per indication: pooled per range | 931 | 0.40 | -1,220 | 3,662 | -5,291 | 0.11 | -6,511 |  |
| type:crowd-sh-10 | Short: at most 10 per bar | 675 | 0.50 | -703 | 3,327 | -4,913 | 0.11 | -5,616 |  |
| type:crowd-gn-1 | General: at most 1 per bar | 911 | 0.41 | -1,156 | 3,613 | -5,293 | 0.11 | -6,448 |  |
| gate:lastNFloor-15 | Last-N floor 15 | 929 | 0.40 | -1,219 | 3,448 | -5,307 | 0.11 | -6,527 |  |
| gate:lastNFloor-25 | Last-N floor 25 | 929 | 0.40 | -1,219 | 3,448 | -5,307 | 0.11 | -6,527 |  |
| gate:lastN-0 | Entry last-N off | 736 | 0.47 | -804 | 3,594 | -5,087 | 0.11 | -5,891 |  |
| gate:lastN-25 | Entry last 25 | 736 | 0.47 | -804 | 3,594 | -5,087 | 0.11 | -5,891 |  |
| gate:rangeGate-n100 | Range gate last 100 | 939 | 0.39 | -1,233 | 3,657 | -5,283 | 0.11 | -6,516 |  |
| gate:lastNFloor-8 | Last-N floor 8 | 943 | 0.40 | -1,225 | 3,495 | -5,370 | 0.11 | -6,595 |  |
| gate:rangeGate-pf1.35 | Range gate PF 1.35 | 843 | 0.43 | -1,024 | 3,518 | -5,158 | 0.11 | -6,183 |  |
| gate:lastNFloor-10 | Last-N floor 10 | 930 | 0.40 | -1,218 | 3,495 | -5,370 | 0.11 | -6,588 |  |
| type:crowd-sh-1 | Short: at most 1 per bar | 471 | 0.65 | -330 | 3,122 | -4,609 | 0.11 | -4,939 |  |
| type:range-off-sh | Short off | 434 | 0.67 | -277 | 3,081 | -4,554 | 0.11 | -4,831 |  |
| type:trailing | Trailing off | 399 | 0.31 | -779 | 1,545 | -2,174 | 0.11 | -2,954 |  |
| type:dca | DCA on | 1,090 | 0.35 | -1,607 | 3,852 | -5,859 | 0.11 | -7,466 |  |
| gate:lastN-30 | Entry last 30 | 746 | 0.40 | -1,024 | 3,534 | -4,920 | 0.10 | -5,944 |  |
| coord:conflict | Conflict block on | 907 | 0.36 | -1,295 | 2,892 | -5,022 | 0.10 | -6,318 |  |
| gate:lastN-35 | Entry last 35 | 719 | 0.41 | -978 | 3,535 | -4,930 | 0.10 | -5,908 |  |
| coord:cooldown-signals | Cooldown signals | 785 | 0.29 | -1,297 | 2,231 | -3,385 | 0.10 | -4,681 |  |
| gate:lastN-75 | Entry last 75 | 708 | 0.44 | -795 | 3,512 | -4,805 | 0.10 | -5,600 |  |
| gate:warmup | Sample warm-up off (strict) | 851 | 0.38 | -1,211 | 3,385 | -5,218 | 0.10 | -6,429 |  |
| gate:lastN-50 | Entry last 50 | 645 | 0.45 | -787 | 3,470 | -4,827 | 0.10 | -5,615 |  |
| gate:lastN-10 | Entry last 10 | 1,174 | 0.32 | -1,796 | 3,786 | -5,628 | 0.10 | -7,425 |  |
| sig:rank-lowdd | Signal ranking lowdd | 631 | 0.26 | -1,051 | 1,684 | -2,289 | 0.10 | -3,341 |  |
| gate:lastN-5 | Entry last 5 | 1,188 | 0.27 | -2,077 | 3,781 | -5,711 | 0.09 | -7,788 |  |
| sig:rank-drawdown | Signal ranking drawdown | 635 | 0.21 | -1,177 | 2,056 | -2,951 | 0.07 | -4,128 |  |
| coord:s2Windows | Stable-02 windows on | 554 | 0.27 | -912 | 2,487 | -3,857 | 0.07 | -4,769 |  |
| type:normal | Normal off | 23 | 0.06 | -87 | 253 | -891 | 0.01 | -978 |  |

not run: type:dcaActive (na), block:off-mc (na), block:off-mn (na), block:off-sh (na), block:mode-shared (na), block:mode-additive (na), block:steps (na), tactic:session (recompute), tactic:volRegime (recompute), tactic:trendStrength (recompute), tactic:chopRegime (recompute), tactic:cooldown (recompute)
