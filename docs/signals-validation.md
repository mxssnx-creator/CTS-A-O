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
