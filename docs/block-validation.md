# Block validation on real BingX data (12 symbols)

Each variant replays the same engine tapes; one row per variant, one column per separate day (orders / PF).

## Days 1–2 (selection)

```
Block off, Normal on                 day1 n  1226 PF 0.91 | day2 n  2185 PF 1.68
Active 6/10 · Normal on              day1 n  1167 PF 0.91 | day2 n  1961 PF 1.56
Active 6/10 · Normal off             day1 n   926 PF 0.98 | day2 n  1762 PF 1.71
Active 7/10 · Normal on              day1 n  1115 PF 0.84 | day2 n  1938 PF 1.57
Active 7/10 · Normal off             day1 n   815 PF 0.95 | day2 n  1616 PF 1.72
Active 8/10 · Normal on              day1 n  1099 PF 0.83 | day2 n  2042 PF 1.68
Active 8/10 · Normal off             day1 n   711 PF 0.89 | day2 n  1407 PF 1.79
config alone · Normal off            day1 n   926 PF 0.98 | day2 n  1762 PF 1.71
overall alone · Normal off           day1 n   642 PF 0.70 | day2 n  1450 PF 1.82
symbol alone · Normal off            day1 n   435 PF 1.01 | day2 n  1145 PF 1.41
direction alone · Normal off         day1 n   638 PF 2.70 | day2 n  1445 PF 1.59
indication alone · Normal off        day1 n   668 PF 0.88 | day2 n  1230 PF 1.93
type alone · Normal off              day1 n   709 PF 0.53 | day2 n  1706 PF 1.69
symbol+direction shared · off        day1 n   746 PF 2.00 | day2 n  1654 PF 1.43
indication+type shared · off         day1 n   995 PF 0.85 | day2 n  1797 PF 1.54
all shared · off                     day1 n  1136 PF 0.85 | day2 n  2274 PF 1.69
symbol+direction additive · off      day1 n   427 PF 1.75 | day2 n  1145 PF 2.63
indication+type additive · off       day1 n   589 PF 0.50 | day2 n  1216 PF 2.02
all additive · off                   day1 n   707 PF 0.71 | day2 n  1318 PF 1.50
```

## Days 1–4 of a 4-day run (days 1–2 unseen by the selection)

```
current · Normal on              d1  920 0.77 | d2 1661 1.16 | d3 1225 1.15 | d4 2058 1.52
current · Normal off             d1  797 0.76 | d2 1216 1.13 | d3  972 1.20 | d4 1720 1.60
direction alone · off            d1  581 0.92 | d2 1122 1.62 | d3  559 1.73 | d4 1405 1.51
sym+dir additive A12 · on        d1  965 1.16 | d2 1608 1.25 | d3  675 0.69 | d4 2275 1.58
sym+dir additive A12 · off       d1  505 1.38 | d2  922 1.19 | d3  258 0.53 | d4 1342 1.50
sym+dir additive A10 · off       d1  712 1.03 | d2 1341 1.22 | d3  652 0.64 | d4 1685 1.90
sym+dir additive A14 · off       d1  481 1.34 | d2  790 1.14 | d3  379 0.34 | d4 1296 1.50
cfg+sym+dir additive A18 · off   d1  664 1.09 | d2 1103 1.22 | d3  588 0.66 | d4 1590 1.65

```

Chosen default: Block source direction (shared), Block Active ≥ 6 of 10 — better PF than the config-set source on 5 of 6 days; symbol + direction additive failed a day (PF 0.53).
