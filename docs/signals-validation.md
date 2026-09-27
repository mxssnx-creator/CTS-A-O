# Signal guards — validation (real BingX data, 12 symbols, 4 separate days)

Each row replays the same engine tapes; per day: all orders / PF · signal orders / PF.

```
no guards (as before the fix)  d1 all 944/1.66 sig 896/1.76 | d2 all 1149/0.94 sig 1129/0.98 | d3 all 716/1.01 sig 684/1.04 | d4 all 2008/2.28 sig 1912/2.36
last-8 guard only              d1 all 939/1.66 sig 891/1.76 | d2 all 1127/0.97 sig 1107/1.01 | d3 all 714/1.01 sig 682/1.05 | d4 all 1979/2.27 sig 1883/2.35
last-8 + cluster 60m/8/60%     d1 all 840/2.18 sig 792/2.39 | d2 all 1248/0.88 sig 1224/0.92 | d3 all 620/1.05 sig 587/1.11 | d4 all 1979/2.27 sig 1883/2.35
last-8 + cluster 30m/6/60%     d1 all 876/1.74 sig 827/1.85 | d2 all 1273/0.91 sig 1249/0.95 | d3 all 603/1.06 sig 570/1.13 | d4 all 1979/2.27 sig 1883/2.35
last-8 + cluster 120m/12/60%   d1 all 922/1.65 sig 874/1.75 | d2 all 1287/0.91 sig 1263/0.96 | d3 all 680/0.98 sig 647/1.02 | d4 all 1979/2.27 sig 1883/2.35
guard last-5 + cluster         d1 all 836/2.19 sig 788/2.41 | d2 all 1230/0.88 sig 1206/0.92 | d3 all 614/1.05 sig 581/1.11 | d4 all 1950/2.33 sig 1854/2.42
guard last-12 + cluster        d1 all 845/2.17 sig 797/2.38 | d2 all 1266/0.86 sig 1242/0.90 | d3 all 622/1.05 sig 589/1.11 | d4 all 1993/2.28 sig 1897/2.35
```

Default: last-8 guard (fixed — it never matched before) + loss-cluster guard 60 min / 8 losses / 60 %. Better PF on days 1 and 3, equal on day 4, slightly lower on day 2 (a losing day either way). Signal candidates keep being computed while paused.

## Active-signal ranking (4 separate days; orders · PF · positive hours · max drawdown)

```
net ranking, 50 (old)      act  50 | d1  986 PF 1.44 +h 51% dd 442 | d2 1219 PF 0.74 +h 29% dd 860 | d3  637 PF 0.78 +h 42% dd 716 | d4 2502 PF 1.96 +h 71% dd 513
drawdown, block≥50%, 50    act  50 | d1  974 PF 1.30 +h 50% dd 507 | d2 1382 PF 0.87 +h 29% dd 660 | d3  775 PF 0.90 +h 36% dd 592 | d4 2485 PF 1.86 +h 71% dd 513
drawdown, block≥60%, 50    act  27 | d1  531 PF 1.49 +h 53% dd 230 | d2  891 PF 1.03 +h 32% dd 312 | d3  517 PF 1.03 +h 49% dd 186 | d4 1186 PF 1.62 +h 63% dd 248
drawdown, block≥70%, 50    act   3 | d1  122 PF 1.33 +h 52% dd 154 | d2   95 PF 0.79 +h 43% dd 83 | d3   77 PF 0.31 +h 38% dd 168 | d4  150 PF 1.90 +h 65% dd 66
drawdown, block≥60%, 30    act  27 | d1  531 PF 1.49 +h 53% dd 230 | d2  891 PF 1.03 +h 32% dd 312 | d3  517 PF 1.03 +h 49% dd 186 | d4 1186 PF 1.62 +h 63% dd 248
drawdown, block≥60%, 100   act  27 | d1  531 PF 1.49 +h 53% dd 230 | d2  891 PF 1.03 +h 32% dd 312 | d3  517 PF 1.03 +h 49% dd 186 | d4 1186 PF 1.62 +h 63% dd 248
```

Default: drawdown ranking (net ÷ max drawdown) with ≥ 60 % positive 4-hour blocks — halves the drawdown on every day, PF up on 3 of 4 days, about half the orders. No setting made nearly every hour positive on this data (best 32–63 % of hours).
