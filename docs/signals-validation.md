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

## Negative-hour hedge and Stable-02 Block coordination (fixed) — 8 days and a 6 × 6 h replay

Negative-hour hedge: signals whose own results were positive in the past hours the executed book lost trade
(without confirmation) while the book is losing. Stable-02 coordination now judges symbols on every candidate
result (the first version judged executed orders only, so a held-back symbol never came back).

8 continuous days, one computation over the whole history, 12 symbols:

```
current                  8d 3366 PF 1.60 +h 51% dd 2021 net 4467
+S2 windows only         8d 1514 PF 1.54 +h 48% dd  747 net 1887
+S2 both (fixed)         8d 1514 PF 1.54 +h 48% dd 1345 net 3390
+hedge PF ≥ 1.3, n ≥ 5   8d 11374 PF 0.91 +h 42% dd 5484 net -2084
+hedge PF ≥ 2, n ≥ 10    8d 4468 PF 1.65 +h 51% dd 2007 net 5816   (hedge orders PF 1.79)
+S2 +hedge (prev hour)   8d 2147 PF 1.63 +h 45% dd 1570 net 5969
```

6 × 6 h replay (every window a complete computation as of its own end, 6 h pre-historic), the stricter test:

```
current            compounded ×1.88 · 21 / 36 hours positive · worst window equity DD 52.8 %
+hedge             compounded ×1.47 · 22 / 36 · 52.9 %
+S2 +hedge         compounded ×1.30 · 23 / 36 · 88.5 %
```

The replay does not confirm the 8-day probe: both stay available (Settings → Coordination) but off. The hedge
defaults to the strict selection (PF ≥ 2 over ≥ 10 results in the book's losing hours).

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

## Raw signal edge and the research sources (opt-in)

Diagnostic on the raw signal tapes (every onset of every source, ATR exits, no ranking, no coordination; 8
symbols, 2 days): **1.57 M trades, PF 0.72, average −0.169 % per trade** — about the round-trip cost (0.2 %), i.e.
no gross edge. By lane: 15m PF 0.89, 5m 0.76, 1m 0.67. By side: long 0.82, short 0.62. Only `rsi-momentum` was
above 1 (PF 1.32, 1 713 trades); every other source lost. Selecting among them cannot create an edge the raw
signals do not have; what helps is trading fewer, larger moves:

- longer lanes (15m / 30m) and a volatility floor (`signals.filter.volFloor`, ATR ÷ price) — first screening,
  one 2-day window: 15m + 30m with a 0.6 % floor and both exit models turned the signal orders from PF 0.4 to
  ≈ 1 (best combination 1.78 on 80 orders); 1m / 5m lanes lower it;
- a trend filter (`signals.filter.trendH`, EMA of that many hours) was mixed and stays off.

Added from the literature review (docs in `src/core/indications/research.ts`): 14 sources — squeeze release,
Donchian + volume + CLV, stop-run reversal, forced-flow fade, VWAP reclaim, volume-delta divergence, RSI(2) + trend,
Bollinger extreme with low ADX, bandwidth expansion, session trend, distance z-score fade, regime breakout, CLV
thrust, NR7 breakout — each in a short and a medium range, causal (prefix-tested). They are **available but off
by default** (`signals.sources`) until a multi-window comparison shows them better; the entry filter defaults
are off for the same reason.

## Signal exits, lanes and filters — four replay windows (new defaults)

Causal replay windows (8 symbols, 2 days each, ending now / 14 h / 30 h / 60 h earlier; ranking per step from
closed results, confirmation on, cap 8 per symbol). Per window: total PF / net / drawdown, then the signal orders'
count / PF / net (Σ trade %). Sums over the windows.

```
lanes 15m + 30m vs adding 5m (both exits, floor 0.6 %)   net 3447 vs 2476 (5m: signal PF 0.61 in the weakest window)
exits (15m + 30m, floor 0.6 %)   pct  signals +1845 · both +965 · atr −311 (atr lost in 2 of 3 windows)
sources (same settings)          old sources +1078 · research sources +59 (kept off)
trend filter 4 h                 worse in 2 of 3 windows (off)

percent grid (15m + 30m, 3 windows)          net   signals   orders  worst dd
  default grid (tp 1.5–4 %)                  3636    +1090     1153     660
  bigger targets (2.5–6 % / 3–8 %)           4723    +2170      895     446   ← targets ≥ 4–5× the 0.2 % cost
  tighter stops (0.75–1.5 × target)          3176     +653     1063     422
  wider stops (1.5–3 × target)               3779    +1200     1063     522
  trailing tight / wide                      3807 / 3728
  16 orders per symbol                       4893    +2347     2037    1037   (drawdown doubles)
  4 orders per symbol                        3042     +496      604     326

combinations (4 windows)                                     net   signals  worst dd  signal PF per window
  bigger targets, hold 48 h, stops 1.5–3×, floor 0.3 %       7402    +3754     523     1.13 / 2.28 / 2.93 / 4.93   ← defaults
  bigger targets, hold 72 h, floor 0.3 %                     7152    +3370     461     1.15 / 1.84 / 4.45 / 2.46
  bigger targets, hold 48 h, floor 0.3 %                     6628    +3117     659
  + ATR exits (both)                                         3997    +1174     712
  16 → 6 orders per symbol                                   5857    +2346     529
```

Defaults now: signal lanes 15m + 30m, percent exits, Normal targets 2.5–6 % with stops 1.5 / 2 / 3 × target,
Trailing targets 3–8 % with stops 3 × target, hold 48 h, volatility floor 0.3 % (ATR ÷ price). Tighter stops
lowered the result in every window: with a 0.2 % round trip a stop inside the bar noise is hit before the move
develops (the stop floors stay at 0.5 %). More orders per symbol raised net and doubled the drawdown, so the cap
stays 8. Databases still on the former defaults are migrated (v10); values a user changed stay.

## PF acceptance (source × symbol × direction × type) and 32 orders per symbol

`signals.accept` (on by default: minimum PF 1.18, window 48 h, at least 6 closes): a signal trades only while its
group — one source (every lane, range and config pooled) on one symbol, direction and type (Normal / Trailing) —
had a profit factor of at least 1.18 over the closed candidates of the last 48 h before the entry (causal; the
candidates keep being computed). Four replay windows, 15m + 30m lanes, percent exits:

```
                       signal orders  signal net   worst dd   signal PF per window
acceptance off              992          +3194       1469     1.58 / 1.36 / 2.79 / 2.06
PF ≥ 1.18 (default)         839          +3320       1133     1.24 / 1.53 / 4.75 / 8.43
PF ≥ 1.0 / 1.1 / 1.3 / 1.5  842 / 842 / 837 / 837   +3331 / +3331 / +3293 / +3287   (thresholds barely differ:
                                                     the minimum-closes gate and the pooled groups decide)
window 24 h / 96 h           837 / 839   +3407 / +3320   ·   min closes 3 / 12   +3458 / +2978
```

Orders per symbol with the acceptance on (worst drawdown = Σ trade % from the peak):

```
   8 orders    824 signal orders   signal net  +2722   worst dd  1133
  16 orders   1502                             +4987             2068
  32 orders   2516                            +10221             3536   ← default (chosen by the user)
  unlimited   7620                            +35445            11901
```

Net grows about linearly with the cap, the drawdown faster: at 32 a single window's drawdown (3.4 k) exceeds
that window's net (2.5 k). Each open order carries 2 % of equity at the sizing default, so 32 on one symbol is
64 % of the equity in notional (at 10× leverage) on that symbol — the position caps (12 symbol × direction) and the
live control's margin caps still apply. Databases on the former 8 move to 32 (migration v11).

### Minimum PF 1.25 (four windows, 32 orders per symbol)

```
min PF   signal orders   signal net   worst dd   signal PF per window
1.18         2500         +11365       3294      1.11 / 2.41 / 4.52 / 12.32
1.25         2487         +11214       3294      1.08 / 2.41 / 4.52 / 12.28   ← default (requested)
1.35         2479         +11120       3294      1.08 / 2.41 / 4.52 / 11.78
1.50         2479         +11182       3294      1.09 / 2.41 / 4.52 / 11.74
```

The threshold changes little (−1.3 % net from 1.18 to 1.25): the minimum-closes gate and the pooled groups decide
which signals trade. A 12 h session with the new defaults: docs/session-12h-v3.md.

### 120 orders per symbol and minimum PF 1.8 (defaults)

Four windows, 15m + 30m, percent exits, 120 orders per symbol (the newest window is the last 2 days of data at
the time of the run; the earlier windows are 14 / 30 / 60 h older):

```
min PF   signal orders   signal net   worst dd   signal PF per window
1.25         5282         +23050       8994      0.89 / 2.28 / 4.47 / 4.38
1.5          5263         +22948       9195      0.89 / 2.28 / 4.47 / 4.26
1.8          5240         +22703       9195      0.87 / 2.29 / 4.47 / 4.37   ← default (requested)
2.2          5161         +22240       9195      0.85 / 2.25 / 4.47 / 4.37
```

The threshold again changes little (1.8 vs 1.25: −1.5 % net, −0.8 % orders). The newest window is the weak one
for signals (PF 0.87, net −1698, worst drawdown 8994 with 120 orders): the run of the two newest days lost, the
three older windows gained. 12 h session (12 symbols, 12 h pre-historic, $10, replay ending 2 h ago, 120 orders,
PF 1.8): docs/session-12h-v4.md.

### Positions and orders apart (signals)

Signals count **positions** (distinct symbol × direction, long and short apart) and **orders** (every order and
partial) separately: `signals.maxPositions` (default 100, its own cap next to the engine's 12) and
`signals.perSymbol` / `signals.maxOpen` (default 0 = unlimited orders). The status shows positions / orders for the
simulated book (with the peaks) and for the paper book now. Four windows: the position cap (12 / 30 / 100 /
unlimited) changed nothing — signal positions only open on symbols where the engine already holds a position
(confirmation), so they stay below the engine's own 12; unlimited orders instead of 120 per symbol: signal net
+36578 vs +22703, worst drawdown 9610 vs 9195.

## Research sources (two batches, 38 sources) — per-source check

Per-source net over the four newest windows (all research sources on, 15m + 30m, percent exits) and the four
older windows (not used for the choice):

```
group                     newest 4 windows                     older 4 windows (96 / 132 / 168 / 204 h back)
older sources only        net 41642  worst dd 10535  (3 of 4 +)   net  6717  worst dd 7028
research sources only     net 29387  worst dd  3467  (4 of 4 +)   all 38: net 12919  dd 2023 (3 of 4 +)
older + 8 chosen research —                                       net  9127  worst dd 5200  (better in 3 of 4)
8 chosen research only    —                                       net 16572  worst dd 3387  (3 of 4 +)
```

On: regime breakout, regression channel, session trend, fractal breakout, AO saucer, inside-bar break, NR7 break,
Connors RSI (positive in every window they appeared in, hundreds of orders). Off (available): the rest — no
evidence, too few orders (opening-range, Camarilla, value area) or negative (Vortex, fair value gap, Elder ray,
break of structure, VWAP reclaim). The choice used the newest four windows; the older four confirm the direction
(lower drawdown, more net than the older sources alone) but are a small sample of two-day windows.

12 h session with these defaults (replay ending 2 h ago): docs/session-12h-v6.md.

### Position caps in live

The control planner counts positions apart by class as well: a (symbol, direction) position with any engine lane
order is an engine position (capped by Settings → Live → Max positions), one held only by signal lanes is a signal
position (capped by Signals → Max positions, default 100). The lane orders on a position are not limited.

### Strongly negative sources switched off

Per-source net over eight replay windows (four newest + four older, 15m + 30m, percent exits; net = Σ trade %):

```
source           windows +/−  orders    net
r-bos               1 / 3       121   −1167   (research, already off)
aroon               1 / 2       120    −952   ← switched off
r-vortex            0 / 1        39    −645   (research, off)
r-fvg               0 / 1        13    −528   (research, off)
ichi-cloud          0 / 2        66    −462   ← switched off
bb-walk             1 / 1        41    −349   ← switched off
r-vwap-reclaim      0 / 2        22    −340   (research, off)
```

Aroon, Ichimoku cloud and Bollinger walk were on by default and are off now (a user's explicit setting still
wins). Four newest windows without them: net 50584 vs 49711 (worst drawdown 9233 vs 9555; the weakest window
+100 vs −794, one window −625 net lower).
