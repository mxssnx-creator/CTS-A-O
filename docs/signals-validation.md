# Signals — causal validation and coordination (current defaults)

Everything below is **causal**: at every simulated step the active signals are ranked only on signal-tape
results that closed before it (hourly index), and coordination tactics only see executed orders closed before
an entry. Real BingX data, 12 symbols, 1m history 10 days, 8 separate days (days 8–5 were never used for any
choice, days 4–1 chose the source list in the first probe). Per row: orders · PF · positive hours · max
drawdown (Σ trade %) · net (Σ trade %).

The earlier tables further down chose active signals from the whole Base history, which includes the tested
days (look-ahead); they overstated signals. Measured causally, signals without coordination lowered PF:

```
engine only                    8d  829 PF 1.29 +h 60% dd  751 net  862
29 src · lowdd · val           8d 1687 PF 1.19 +h 53% dd 1353 net  901   (with a 60-min loss guard)
5 src · lowdd · val            8d 1127 PF 1.23 +h 59% dd  802 net  817   (5 best sources, chosen in-sample)
validation window 12 h / 6 h   8d PF 1.14 / 1.11 (24 h best)
```

## Coordination tactics (Settings → Coordination, on by default)

```
engine                 d8-5  438 PF 1.63 +h 64% dd 271 net  624 | d4-1  405 PF 1.33 +h 64% dd 381 net  576 || 8d  843 PF 1.44 +h 64% dd  625 net 1200
engine conflict        d8-5  337 PF 1.76 +h 60% dd 264 net  583 | d4-1  326 PF 1.30 +h 59% dd 528 net  449 || 8d  663 PF 1.45 +h 60% dd  768 net 1033
engine lock3           d8-5  325 PF 1.48 +h 60% dd 171 net  361 | d4-1  311 PF 1.02 +h 65% dd 259 net   28 || 8d  636 PF 1.19 +h 62% dd  383 net  388
engine lock10          d8-5  375 PF 1.32 +h 60% dd 241 net  302 | d4-1  335 PF 1.32 +h 65% dd 259 net  362 || 8d  710 PF 1.32 +h 62% dd  477 net  664
engine cooldown        d8-5  373 PF 1.52 +h 60% dd 271 net  478 | d4-1  323 PF 1.28 +h 65% dd 340 net  432 || 8d  696 PF 1.37 +h 63% dd  562 net  910
sig (no coordination)  d8-5  941 PF 1.02 +h 51% dd 452 net   37 | d4-1 1215 PF 1.50 +h 58% dd 766 net 1668 || 8d 2156 PF 1.32 +h 54% dd 1215 net 1705
sig confirm            d8-5  676 PF 1.29 +h 57% dd 297 net  378 | d4-1  792 PF 1.76 +h 63% dd 428 net 1657 || 8d 1468 PF 1.58 +h 60% dd  580 net 2035
sig confirm conflict   d8-5  470 PF 1.63 +h 59% dd 281 net  544 | d4-1  663 PF 1.71 +h 57% dd 695 net 1370 || 8d 1133 PF 1.69 +h 59% dd  857 net 1914
sig cooldown signals   d8-5  822 PF 1.06 +h 54% dd 445 net   96 | d4-1  968 PF 1.32 +h 57% dd 780 net 1009 || 8d 1790 PF 1.23 +h 54% dd 1222 net 1106
sig confirm lock6      d8-5  505 PF 1.33 +h 59% dd 306 net  321 | d4-1  499 PF 1.42 +h 62% dd 245 net  557 || 8d 1004 PF 1.38 +h 60% dd  353 net  878
```

Tuning around confirmation (refreshed data, same 8 days shifted by the new bars):

```
engine                  8d  838 PF 1.34 +h 65% dd 577 net  955
lowdd confirm           8d 1457 PF 1.49 +h 59% dd 490 net 1769
drawdown confirm        8d 2104 PF 1.49 +h 58% dd 521 net 2163
net confirm             8d 5774 PF 1.17 +h 47% dd 2565 net 2289
lowdd confirm v12       8d 1415 PF 1.41 +h 59% dd 594 net 1482
lowdd confirm no-val    8d 1587 PF 1.43 +h 60% dd 598 net 1652
lowdd confirm, hour-loss stop off   8d 1844 PF 1.63 +h 63% dd 442 net 2532   ← defaults
```

Defaults: signal ranking **lowdd** (net ÷ drawdown², must have recovered its drawdown), validation on the
latest 24 h, **signal confirmation on** (a signal enters only while an engine position is open on its symbol
in its direction), hour-loss stop off. The hour profit lock, the losing-hour cooldown and opposite-entry
blocking stay available but off: each cost net on these days. About 60–65 % of hours are positive; no tested
tactic made nearly every hour positive without giving up most of the profit (the hour lock raises the positive
share slightly but cuts net by half or more).

## More sources (43) and the source stability gate — continuous 8-day run

One continuous simulation over 8 days (the gate needs executed history), split by exit time; defaults
otherwise (lowdd ranking, signal confirmation).

```
engine               d8-5  532 PF 1.66 +h 71% dd  326 net 1002 | d4-1  588 PF 1.26 +h 59% dd 1562 net  691 || 8d 1120 PF 1.40 +h 64% dd 1581 net 1693
29 src, no gate      d8-5 1058 PF 1.55 +h 70% dd  358 net 1099 | d4-1 1561 PF 1.55 +h 59% dd 1511 net 2230 || 8d 2619 PF 1.55 +h 65% dd 1536 net 3329
43 src, no gate      d8-5 1433 PF 1.45 +h 61% dd  307 net 1154 | d4-1 1613 PF 1.58 +h 59% dd 1568 net 2316 || 8d 3046 PF 1.53 +h 60% dd 1741 net 3470
43 gate 1d 50% n5    8d 2590 PF 1.37 +h 60% dd 1938 net 2283
43 gate 2d 50% n5    8d 2569 PF 1.39 +h 59% dd 1650 net 2341
43 gate 2d 67% n5    8d 2401 PF 1.50 +h 61% dd 1536 net 2671
43 gate 3d 50% n5    8d 2258 PF 1.36 +h 59% dd 1596 net 2070
43 gate 2d 50% n10   8d 2429 PF 1.42 +h 59% dd 1689 net 2557
29 gate 2d 50% n5    8d 2074 PF 1.36 +h 63% dd 1716 net 2075
```

14 sources added from existing registry computations (EMA trend, ATR breakout, activity burst, thrust,
impulse, swing, RSI mid cross, Bollinger walk, EMA pullback, fast EMA cross, level reclaim, high-frequency
activity, slow MACD, slow Supertrend): 43 sources give slightly more net than 29 at about the same PF, with a
somewhat deeper drawdown. All 43 are on by default; the lowdd ranking and confirmation select among them.

The stability gate (a source pauses while its own executed orders of the latest days lost) cost net at every
setting — pausing after a losing stretch misses the rebound — so it is available in Settings but off by
default. A first version judged sources on their raw tape results; since raw signals mostly lose and only
confirmed ones pay, it switched nearly every source off and was replaced.

## Stable-02 entries, indications and ATR exits — continuous 8-day run

15 entry signals and 11 indications ported from CTS-A branch Stable-02 (`s2-…`, signal sources; tested bar for
bar against the desk's own code) and its ATR exit model (stop = k × ATR(14) at entry, target = ratio × stop,
optional trailing, short hold). One continuous simulation, 12 symbols, defaults otherwise.

```
engine                 8d  825 PF 1.01 +h 55% dd  969 net   23
43 src, pct exits      8d 2784 PF 1.07 +h 51% dd 1983 net  412   (previous default)
43 src, atr exits      8d 1277 PF 1.22 +h 55% dd 1047 net  740
43 src, both exits     8d 2177 PF 1.31 +h 52% dd 1327 net 1477
s2 only, pct exits     8d 2622 PF 1.22 +h 50% dd 2130 net 1758
s2 only, atr exits     8d  923 PF 0.99 +h 55% dd  968 net  -43
all src, pct exits     8d 4457 PF 1.36 +h 48% dd 2132 net 3610
all src, both exits    d8-5 829 PF 1.37 +h 65% dd 247 net 524 | d4-1 2752 PF 2.10 +h 48% dd 2135 net 6776
                       8d 3581 PF 1.96 +h 56% dd 2135 net 7301   ← default
```

Default: all 58 sources with percent + ATR exits (48 configs per signal). Cost: about 2× the signal tapes and
compute time. The ported indications run as signal sources only (not engine combos).

---

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

## Best first vs by config id at the same entry time (4 days; orders · PF · positive hours · drawdown)

```
best first           d1  517 PF 1.68 +h 58% dd 186 | d2  867 PF 0.77 +h 32% dd 419 | d3  498 PF 1.50 +h 44% dd 217 | d4 1298 PF 1.97 +h 67% dd 229
by config id (old)   d1  517 PF 1.69 +h 58% dd 186 | d2  867 PF 0.77 +h 32% dd 419 | d3  498 PF 1.50 +h 44% dd 217 | d4 1298 PF 1.96 +h 67% dd 229
```

Practically identical (a capped slot is rarely contested at the same instant); best first stays the default.
