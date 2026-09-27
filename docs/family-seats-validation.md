# DCA / Axis seats — validation (real data, 12 symbols, 4 separate days)

```
old gate (pass without base)   d1 all 1223/1.25 dca 25/0.90 axis 17/0.25 | d2 all 1332/0.93 dca 34/1.96 axis 9/4.00 | d3 all 1097/1.01 dca 11/0.70 axis 16/0.51 | d4 all 2445/1.77 dca 20/0.45 axis 4/0.13
new gate (needs base)          d1 all 1223/1.25 dca 25/0.90 axis 17/0.25 | d2 all 1332/0.93 dca 34/1.96 axis 9/4.00 | d3 all 1097/1.01 dca 11/0.70 axis 16/0.51 | d4 all 2445/1.77 dca 20/0.45 axis 4/0.13
no family seats                d1 all 1204/1.39 dca 0/0.00 axis 3/4.00 | d2 all 1398/1.16 dca 0/0.00 axis 3/1.85 | d3 all 1072/1.01 dca 0/0.00 axis 6/0.14 | d4 all 2578/1.77 dca 0/0.00 axis 2/4.00
```

Separate DCA / Axis seats lowered PF on 2 of 4 days (equal on 2): one seat per pair is the default. The 'needs a base' gate never triggered on real data (every DCA / Axis pair had a base) and is kept as a guard.
