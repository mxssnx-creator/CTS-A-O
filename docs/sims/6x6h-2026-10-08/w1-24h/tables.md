window 2026-10-07T00:00:00.000Z → 2026-10-08T00:00:00.000Z · simH 24 · runSeconds 3381

**Total / per range**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 11,372 | 0.59 | -10,859 | 8,381 | 0.08 | -21,882 | 0.34 | -32,741 |
| Micro | 87 | 0.37 | -34 | 5 | 0.00 | -0 | 0.37 | -34 |
| Short | 3,825 | 0.46 | -3,610 | 672 | 0.05 | -1,216 | 0.39 | -4,827 |
| General | 363 | 0.65 | -246 | 56 | 0.18 | -49 | 0.61 | -295 |
| Long | 267 | 0.56 | -337 | 118 | 0.28 | -125 | 0.51 | -462 |
| Wide | 104 | 0.39 | -48 | 0 | – | 0 | 0.39 | -48 |
| Signals | 6,726 | 0.63 | -6,584 | 7,530 | 0.08 | -20,492 | 0.33 | -27,075 |

**Per type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| axis | 104 | 0.39 | -48 | 0 | – | 0 | 0.39 | -48 |
| normal | 1,799 | 0.41 | -2,237 | 378 | 0.05 | -577 | 0.36 | -2,814 |
| signals normal | 3,539 | 0.51 | -5,716 | 3,481 | 0.09 | -7,726 | 0.33 | -13,442 |
| signals trailing | 3,187 | 0.86 | -868 | 4,049 | 0.07 | -12,765 | 0.32 | -13,633 |
| trailing | 2,743 | 0.54 | -1,990 | 473 | 0.10 | -813 | 0.46 | -2,803 |

**Per side**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 3,602 | 0.37 | -5,360 | 1,076 | 0.08 | -2,869 | 0.30 | -8,229 |
| short | 7,770 | 0.69 | -5,499 | 7,305 | 0.08 | -19,013 | 0.36 | -24,513 |
| signals long | 881 | 0.42 | -1,684 | 899 | 0.06 | -2,682 | 0.24 | -4,365 |
| signals short | 5,845 | 0.67 | -4,900 | 6,631 | 0.08 | -17,810 | 0.34 | -22,710 |

**Range × type**

| group | closed | PF closed | net closed % | open at end | PF open (mark) | net open % | **PF incl. open** | **net incl. open %** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| General · normal | 230 | 0.61 | -178 | 44 | 0.15 | -38 | 0.57 | -216 |
| General · trailing | 133 | 0.71 | -68 | 12 | 0.26 | -11 | 0.69 | -79 |
| Long · normal | 154 | 0.59 | -184 | 68 | 0.09 | -110 | 0.48 | -294 |
| Long · trailing | 113 | 0.52 | -153 | 50 | 0.72 | -15 | 0.55 | -168 |
| Micro · normal | 46 | 0.21 | -32 | 5 | 0.00 | -0 | 0.21 | -32 |
| Micro · trailing | 41 | 0.87 | -2 | 0 | – | 0 | 0.87 | -2 |
| Short · normal | 1,369 | 0.36 | -1,843 | 261 | 0.03 | -429 | 0.31 | -2,272 |
| Short · trailing | 2,456 | 0.53 | -1,767 | 411 | 0.05 | -787 | 0.44 | -2,554 |
| Signals · signals normal | 3,539 | 0.51 | -5,716 | 3,481 | 0.09 | -7,726 | 0.33 | -13,442 |
| Signals · signals trailing | 3,187 | 0.86 | -868 | 4,049 | 0.07 | -12,765 | 0.32 | -13,633 |
| Wide · axis | 104 | 0.39 | -48 | 0 | – | 0 | 0.39 | -48 |

**Variants** (reproduces: true) — PF incl. open ≈ (gp + max(openNet,0)) / (gl + max(−openNet,0))

| id | label | orders | PF closed | net % | open end | open net % | PF incl. open≈ | net incl. open % | beats baseline (PF incl. open AND orders) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| type:normal | Normal off | 523 | 0.83 | -167 | 260 | -459 | 0.56 | -625 |  |
| coord:conflict | Conflict block on | 6,554 | 0.69 | -3,989 | 3,756 | -8,643 | 0.42 | -12,632 |  |
| sig:accept-confirm | Signal acceptance and confirmation off | 19,490 | 0.79 | -8,776 | 13,961 | -37,871 | 0.41 | -46,647 | **yes** |
| sig:count-100 | Active signals 100 | 4,748 | 0.48 | -4,456 | 914 | -1,392 | 0.41 | -5,847 |  |
| sig:signals | Signals off | 4,646 | 0.48 | -4,276 | 851 | -1,390 | 0.41 | -5,666 |  |
| sig:count-200 | Active signals 200 | 4,779 | 0.48 | -4,483 | 957 | -1,566 | 0.41 | -6,048 |  |
| type:crowd-sig-1 | Signals: at most 1 per bar | 5,210 | 0.49 | -4,726 | 1,112 | -1,968 | 0.41 | -6,695 |  |
| type:crowd-sig-3 | Signals: at most 3 per bar | 6,112 | 0.51 | -5,583 | 1,739 | -3,471 | 0.39 | -9,054 |  |
| sig:engineSide | Engine direction acceptance off | 14,533 | 0.67 | -9,348 | 9,688 | -21,288 | 0.38 | -30,636 | **yes** |
| sig:accept | Signal acceptance off | 14,028 | 0.74 | -7,736 | 11,094 | -28,379 | 0.38 | -36,115 | **yes** |
| type:crowd-sig-10 | Signals: at most 10 per bar | 8,528 | 0.56 | -7,511 | 3,795 | -8,546 | 0.38 | -16,057 |  |
| gate:signalLastN-15 | Signals last 15 | 6,606 | 0.59 | -5,112 | 3,021 | -7,808 | 0.37 | -12,920 |  |
| gate:signalLastN-10 | Signals last 10 | 6,755 | 0.58 | -5,450 | 3,082 | -7,803 | 0.37 | -13,253 |  |
| gate:signalLastN-25 | Signals last 25 | 6,707 | 0.61 | -4,961 | 3,250 | -8,659 | 0.36 | -13,620 |  |
| coord:cooldown-all | Cooldown all | 7,880 | 0.64 | -6,151 | 5,143 | -13,235 | 0.36 | -19,386 |  |
| type:block | Block on | 11,372 | 0.61 | -35,822 | 8,381 | -65,713 | 0.35 | -101,534 |  |
| sig:engineSidePerInd-all | Engine direction acceptance per indication: every range | 12,353 | 0.63 | -10,016 | 8,890 | -21,651 | 0.35 | -31,667 | **yes** |
| gate:signalLastN-5 | Signals last 5 | 7,242 | 0.55 | -6,820 | 3,484 | -9,129 | 0.34 | -15,950 |  |
| sig:engineSide-hours48 | Engine direction acceptance window 48 h | 12,153 | 0.60 | -10,777 | 8,774 | -21,500 | 0.34 | -32,277 | **yes** |
| sig:confirm | Signal confirmation off | 14,750 | 0.60 | -14,583 | 9,951 | -27,893 | 0.34 | -42,477 | **yes** |
| coord:all | Coordination off | 14,750 | 0.60 | -14,583 | 9,951 | -27,893 | 0.34 | -42,477 | **yes** |
| gate:lastN-75 | Entry last 75 | 11,908 | 0.61 | -10,283 | 8,338 | -21,486 | 0.33 | -31,769 | **yes** |
| gate:symGate-off | Symbol gate off | 13,409 | 0.59 | -12,082 | 8,833 | -22,345 | 0.33 | -34,427 | **yes** |
| gate:validLastN-25 | Validation last 25 | 12,895 | 0.59 | -11,839 | 8,643 | -22,249 | 0.33 | -34,088 | **yes** |
| gate:validLastN-20 | Validation last 20 | 11,681 | 0.60 | -10,360 | 8,501 | -21,214 | 0.33 | -31,574 | **yes** |
| coord:s2Windows | Stable-02 windows on | 7,099 | 0.61 | -6,757 | 5,770 | -14,894 | 0.33 | -21,652 |  |
| gate:sideGateN | Direction gate 10 | 9,485 | 0.65 | -7,741 | 7,829 | -21,042 | 0.33 | -28,783 |  |
| gate:validLastN-0 | Validation last-N off | 17,919 | 0.53 | -19,259 | 10,383 | -25,322 | 0.33 | -44,581 | **yes** |
| gate:symGate-proven | Symbol gate proven | 11,526 | 0.60 | -10,582 | 8,449 | -21,920 | 0.32 | -32,502 | **yes** |
| gate:symGate-veto | Symbol gate veto | 11,623 | 0.59 | -10,775 | 8,461 | -21,939 | 0.32 | -32,714 | **yes** |
| gate:rangeGate-n50 | Range gate last 50 | 11,382 | 0.59 | -10,843 | 8,315 | -21,545 | 0.32 | -32,388 | **yes** |
| gate:rangeGate-n25 | Range gate last 25 | 11,385 | 0.59 | -10,706 | 8,380 | -21,887 | 0.32 | -32,593 | **yes** |
| type:trailing | Trailing off | 5,051 | 0.49 | -7,066 | 3,592 | -7,536 | 0.32 | -14,602 |  |
| sig:rank-drawdown | Signal ranking drawdown | 6,459 | 0.50 | -6,916 | 3,112 | -7,518 | 0.32 | -14,434 |  |
| gate:rangeGate-n35 | Range gate last 35 | 11,439 | 0.59 | -10,941 | 8,396 | -21,912 | 0.32 | -32,854 | **yes** |
| gate:lastN-50 | Entry last 50 | 10,938 | 0.59 | -10,381 | 8,176 | -21,312 | 0.32 | -31,694 |  |
| gate:minGreen-0 | Green-hour gate off | 11,484 | 0.58 | -10,945 | 8,395 | -21,894 | 0.32 | -32,839 | **yes** |
| gate:lastNFloor-3 | Last-N floor 3 | 11,386 | 0.59 | -10,856 | 8,428 | -21,847 | 0.32 | -32,703 | **yes** |
| sig:engineSide-hours3 | Engine direction acceptance window 3 h | 10,501 | 0.58 | -10,472 | 8,327 | -20,735 | 0.32 | -31,206 |  |
| gate:minGreen-0.4 | Green hours ≥ 40 % | 11,479 | 0.58 | -10,944 | 8,395 | -21,894 | 0.32 | -32,838 | **yes** |
| type:ladder-needs-base | Axis / DCA only beside their pair's seated Normal | 11,290 | 0.59 | -10,826 | 8,354 | -21,813 | 0.32 | -32,639 |  |
| gate:rangeGate-off | Range gate off | 11,584 | 0.58 | -11,171 | 8,424 | -21,967 | 0.32 | -33,138 | **yes** |
| gate:rangeGate-n15 | Range gate last 15 | 11,584 | 0.58 | -11,171 | 8,424 | -21,967 | 0.32 | -33,138 | **yes** |
| type:axis | Axis off | 11,266 | 0.59 | -10,818 | 8,354 | -21,813 | 0.32 | -32,631 |  |
| type:crowd-wide-3 | Wide (incl. Axis, DCA): at most 3 per bar | 11,321 | 0.59 | -10,821 | 8,381 | -21,882 | 0.32 | -32,703 |  |
| type:crowd-wide-10 | Wide (incl. Axis, DCA): at most 10 per bar | 11,352 | 0.59 | -10,840 | 8,381 | -21,882 | 0.32 | -32,722 |  |
| gate:rangeGate-allRanges | Range gate on General and Long too | 11,336 | 0.59 | -10,806 | 8,354 | -21,839 | 0.32 | -32,645 |  |
| type:crowd-wide-1 | Wide (incl. Axis, DCA): at most 1 per bar | 11,289 | 0.59 | -10,814 | 8,381 | -21,882 | 0.32 | -32,696 |  |
| baseline | Baseline (as run) | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| type:blockActive | Block Active on | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| type:range-off-mn | Minimal off | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| type:range-off-mp | Minimal plus off | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| sig:engineSide-minTrades10 | Engine direction acceptance 10 closes | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| sig:engineSide-minTrades60 | Engine direction acceptance 60 closes | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| coord:hedge | Negative-hour hedge on | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| gate:symMinN-1 | Symbol gate closes 1 | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| gate:symMinN-5 | Symbol gate closes 5 | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| gate:symMinN-10 | Symbol gate closes 10 | 11,372 | 0.59 | -10,859 | 8,381 | -21,882 | 0.32 | -32,741 |  |
| type:crowd-mc-1 | Micro: at most 1 per bar | 11,317 | 0.59 | -10,836 | 8,378 | -21,882 | 0.32 | -32,718 |  |
| type:crowd-mc-10 | Micro: at most 10 per bar | 11,524 | 0.58 | -10,937 | 8,382 | -21,882 | 0.32 | -32,819 |  |
| type:range-off-mc | Micro off | 11,285 | 0.59 | -10,826 | 8,376 | -21,882 | 0.32 | -32,707 |  |
| sig:engineSidePerInd-off | Engine direction acceptance per indication: pooled per range | 11,352 | 0.59 | -10,857 | 8,376 | -21,882 | 0.32 | -32,739 |  |
| gate:lastN-20 | Entry last 20 | 11,037 | 0.59 | -10,573 | 8,337 | -21,691 | 0.32 | -32,264 |  |
| gate:rangeGate-pf1.2 | Range gate PF 1.20 | 10,882 | 0.60 | -10,033 | 8,265 | -21,875 | 0.32 | -31,908 |  |
| gate:validLastN-35 | Validation last 35 | 14,035 | 0.55 | -14,612 | 9,012 | -23,229 | 0.32 | -37,840 |  |
| gate:rangeGate-n100 | Range gate last 100 | 11,380 | 0.58 | -11,033 | 8,383 | -21,894 | 0.32 | -32,927 |  |
| gate:lastN-10 | Entry last 10 | 12,143 | 0.58 | -11,627 | 8,592 | -22,366 | 0.32 | -33,993 |  |
| gate:lastN-0 | Entry last-N off | 11,113 | 0.58 | -10,658 | 8,363 | -21,671 | 0.32 | -32,329 |  |
| gate:lastN-35 | Entry last 35 | 10,740 | 0.59 | -10,390 | 8,246 | -21,388 | 0.32 | -31,778 |  |
| gate:lastN-25 | Entry last 25 | 11,049 | 0.58 | -10,673 | 8,363 | -21,671 | 0.32 | -32,344 |  |
| type:range-off-lg | Long off | 11,105 | 0.59 | -10,522 | 8,263 | -21,757 | 0.32 | -32,280 |  |
| type:dca | DCA on | 11,690 | 0.58 | -11,322 | 8,543 | -22,518 | 0.32 | -33,840 |  |
| coord:cooldown-signals | Cooldown signals | 8,896 | 0.54 | -9,159 | 5,588 | -14,059 | 0.32 | -23,218 |  |
| type:crowd-lg-1 | Long: at most 1 per bar | 11,157 | 0.58 | -10,654 | 8,301 | -21,795 | 0.32 | -32,449 |  |
| gate:lastN-30 | Entry last 30 | 10,842 | 0.58 | -10,533 | 8,290 | -21,501 | 0.32 | -32,033 |  |
| type:crowd-gn-10 | General: at most 10 per bar | 11,285 | 0.58 | -10,954 | 8,381 | -21,882 | 0.32 | -32,836 |  |
| type:crowd-gn-3 | General: at most 3 per bar | 11,169 | 0.58 | -10,792 | 8,366 | -21,867 | 0.32 | -32,659 |  |
| type:crowd-gn-1 | General: at most 1 per bar | 11,077 | 0.58 | -10,664 | 8,346 | -21,854 | 0.32 | -32,518 |  |
| type:crowd-lg-3 | Long: at most 3 per bar | 11,223 | 0.58 | -10,830 | 8,337 | -21,844 | 0.31 | -32,674 |  |
| type:crowd-lg-10 | Long: at most 10 per bar | 11,307 | 0.58 | -11,025 | 8,376 | -21,874 | 0.31 | -32,899 |  |
| type:range-off-gn | General off | 11,009 | 0.58 | -10,613 | 8,325 | -21,833 | 0.31 | -32,446 |  |
| gate:lossPrior | Loss prior on | 10,919 | 0.58 | -10,543 | 8,331 | -21,816 | 0.31 | -32,359 |  |
| gate:validLastN-50 | Validation last 50 | 13,704 | 0.53 | -14,706 | 8,818 | -21,851 | 0.31 | -36,557 |  |
| gate:rangeGate-pf1.35 | Range gate PF 1.35 | 10,387 | 0.59 | -9,797 | 8,178 | -21,683 | 0.31 | -31,479 |  |
| sig:rank-lowdd | Signal ranking lowdd | 5,656 | 0.50 | -5,500 | 2,770 | -6,417 | 0.31 | -11,917 |  |
| sig:engineSide-hours12 | Engine direction acceptance window 12 h | 10,975 | 0.57 | -10,993 | 8,241 | -21,855 | 0.31 | -32,848 |  |
| type:crowd-mc-0 | Micro: no crowding cap | 13,513 | 0.55 | -12,742 | 8,382 | -21,882 | 0.31 | -34,624 |  |
| type:crowd-sh-10 | Short: at most 10 per bar | 8,919 | 0.61 | -8,581 | 8,067 | -21,268 | 0.31 | -29,849 |  |
| type:crowd-sh-3 | Short: at most 3 per bar | 8,114 | 0.62 | -7,741 | 7,857 | -20,900 | 0.31 | -28,641 |  |
| gate:lastNFloor-8 | Last-N floor 8 | 10,888 | 0.57 | -10,985 | 8,345 | -21,879 | 0.31 | -32,864 |  |
| gate:lastNFloor-10 | Last-N floor 10 | 10,446 | 0.58 | -10,533 | 8,322 | -21,813 | 0.31 | -32,345 |  |
| gate:lastN-5 | Entry last 5 | 11,265 | 0.57 | -11,318 | 8,671 | -22,394 | 0.31 | -33,712 |  |
| type:crowd-sh-1 | Short: at most 1 per bar | 7,763 | 0.63 | -7,439 | 7,765 | -20,742 | 0.31 | -28,181 |  |
| gate:rangeGate-strict | Range gate on its full last N | 10,064 | 0.58 | -10,136 | 8,272 | -21,563 | 0.31 | -31,699 |  |
| type:range-off-sh | Short off | 7,547 | 0.63 | -7,249 | 7,709 | -20,666 | 0.31 | -27,915 |  |
| gate:validLastN-100 | Validation last 100 | 13,446 | 0.53 | -15,030 | 9,056 | -23,031 | 0.30 | -38,061 |  |
| gate:validLastN-75 | Validation last 75 | 13,668 | 0.53 | -15,037 | 9,257 | -23,367 | 0.30 | -38,404 |  |
| gate:minGreen-0.6 | Green hours ≥ 60 % | 9,781 | 0.58 | -9,759 | 7,783 | -21,273 | 0.30 | -31,032 |  |
| gate:lossPrior-strictRange | Loss prior on, range gate on its full last N | 9,815 | 0.58 | -9,881 | 8,229 | -21,513 | 0.30 | -31,394 |  |
| gate:lastNFloor-25 | Last-N floor 25 | 9,791 | 0.57 | -10,213 | 8,099 | -20,789 | 0.30 | -31,002 |  |
| gate:lastNFloor-15 | Last-N floor 15 | 9,850 | 0.56 | -10,388 | 8,172 | -21,106 | 0.30 | -31,495 |  |
| gate:maxPositions | Position cap 12 | 8,834 | 0.58 | -9,504 | 7,739 | -20,826 | 0.30 | -30,330 |  |
| gate:warmup | Sample warm-up off (strict) | 9,257 | 0.57 | -9,745 | 8,065 | -20,929 | 0.30 | -30,674 |  |
| sig:engineSide-minPf1.2 | Engine direction acceptance PF 1.2 | 10,363 | 0.55 | -11,409 | 8,343 | -21,834 | 0.30 | -33,243 |  |
| sig:engineSide-minPf1.3 | Engine direction acceptance PF 1.3 | 10,359 | 0.55 | -11,403 | 8,343 | -21,834 | 0.30 | -33,237 |  |
| gate:lastNFloor-0 | Last-N floor off | 9,574 | 0.56 | -10,247 | 8,056 | -20,683 | 0.30 | -30,929 |  |
| gate:validLastN-10 | Validation last 10 | 11,430 | 0.53 | -12,990 | 8,831 | -22,896 | 0.29 | -35,886 |  |
| coord:hourLock | Hour lock 1 % | 5,679 | 0.47 | -7,097 | 4,662 | -11,867 | 0.25 | -18,963 |  |

not run: type:dcaActive (na), block:off-mc (na), block:off-mn (na), block:off-sh (na), block:mode-shared (na), block:mode-additive (na), block:steps (na), tactic:session (recompute), tactic:volRegime (recompute), tactic:trendStrength (recompute), tactic:chopRegime (recompute), tactic:cooldown (recompute)
