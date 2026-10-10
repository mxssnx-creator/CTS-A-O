# 6x6h trade simulation — windows 4–6 (V3 desk), 8 Oct

Desk `docs/sims/sigstop-2026-10-08/desks/V3.json` (signal stops 1.5 / 2 / 3× target, trailing signals 3×, hold 24 h),
branch `claude/sim3h-fixes` at b34e16d, 30 symbols, 24 h pre-history, 6 h run, balance $20, `CTS_CORE_VARIANTS=1`,
3 workers, 4 cores / 16 GB. Runs went one after the other. Simulation only, no orders anywhere. No code or desk change.

```
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=3 \
node --max-old-space-size=8192 --expose-gc --experimental-strip-types --no-warnings scripts/core-session.mjs \
  --symbols 30 --pre 24 --run 6 --focus all --desk docs/sims/sigstop-2026-10-08/desks/V3.json --balance 20 \
  --max-wait-min 240 --wf '{"simH":6}' --end-at <END> --out … --html … --writeup … --dump …
```

**`--wf '{"simH":6}'` is needed** (windows 1–3 found the same thing). V3.json carries `wf.simH 24`, and core-session
spreads the desk's `wf` after `simH: runH`, so without the flag `--run 6` simulates 24 h. The report title still says
"6 h". The first pass of w4–w6 ran without the flag: three overlapping 24 h windows. They are kept in `w4-24h/` …
`w6-24h/` and summarised at the end. `w4/` … `w6/` are the 6 h runs.

| window | `--end-at` | run window | wall time | checks | variants baseline |
|---|---|---|---:|---|---|
| w4 | 2026-10-07T06:00Z | 07 Oct 00:00 → 06:00 | 1,270 s | 54/55 ok — FAILED: execution: strategy type axis executed orders | reproduces the session run |
| w5 | 2026-10-07T00:00Z | 06 Oct 18:00 → 24:00 | 1,140 s | 54/55 ok — FAILED: execution: strategy type axis executed orders | reproduces the session run |
| w6 | 2026-10-06T18:00Z | 06 Oct 12:00 → 18:00 | 1,252 s | 54/55 ok — FAILED: execution: strategy type axis executed orders | reproduces the session run |

Unit basis throughout: every order at one unit, net = Σ r × 100 (% of one unit), PF = gross profit ÷ gross loss.
"PF incl. open" adds the orders still open at the end, marked at the last close (`raw.openEnd[].mtmR`), to the closed
trades' r. It is computed from raw.json and is exact for the baselines.

## Summary (unit basis)

| | w4 orders (+open) | PF closed | PF incl. open | net incl. open | w5 orders (+open) | PF closed | PF incl. open | net incl. open | w6 orders (+open) | PF closed | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **total** | 2,713 (+2,542) | 3.35 | **1.44** | **+2,217** | 658 (+2,665) | 2.47 | **0.73** | **−815** | 1,718 (+3,632) | 1.58 | **0.72** | **−1,932** |
| Micro | 18 | 0.58 | 0.58 | −4 | 22 (+3) | 0.81 | 0.87 | −1 | 13 (+2) | 0.40 | 0.35 | −5 |
| Short | 1,148 (+220) | 2.77 | 2.52 | +1,023 | 114 (+114) | 4.62 | 1.97 | +107 | 160 (+100) | 0.12 | 0.10 | −435 |
| General | 21 (+7) | ∞ | ∞ | +88 | 41 (+118) | 0.32 | 0.44 | −85 | 103 (+65) | 0.14 | 0.15 | −298 |
| Long | 99 (+157) | 1.37 | 1.36 | +91 | 32 (+196) | 0.16 | 0.37 | −171 | 96 (+166) | 0.16 | 0.21 | −409 |
| Wide (Axis) | 0 | – | – | 0 | 0 | – | – | 0 | 0 | – | – | 0 |
| Signals | 1,427 (+2,158) | 3.90 | 1.25 | +1,019 | 449 (+2,234) | 4.16 | 0.73 | −664 | 1,346 (+3,299) | 2.89 | 0.86 | −785 |
| · signals fixed | 709 (+1,066) | 2.13 | 1.00 | +4 | 218 (+1,152) | 2.23 | 0.62 | −516 | 686 (+1,657) | 1.86 | 0.81 | −577 |
| · signals trailing | 718 (+1,092) | 16.25 | 1.58 | +1,015 | 231 (+1,082) | 23.93 | 0.86 | −148 | 660 (+1,642) | 7.21 | 0.92 | −208 |
| engine normal | 375 (+166) | 2.56 | 2.45 | +505 | 108 (+243) | 0.73 | 0.68 | −93 | 278 (+184) | 0.12 | 0.15 | −843 |
| engine trailing | 911 (+218) | 2.56 | 2.18 | +693 | 101 (+188) | 0.93 | 0.78 | −57 | 94 (+149) | 0.20 | 0.17 | −304 |
| engine axis | 0 | – | – | 0 | 0 | – | – | 0 | 0 | – | – | 0 |
| long side | 1,045 (+484) | 1.10 | 1.12 | +187 | 602 (+1,939) | 2.97 | 0.86 | −319 | 1,416 (+2,208) | 1.47 | 0.58 | −2,459 |
| short side | 1,668 (+2,058) | 7.44 | 1.58 | +2,031 | 56 (+726) | 0.28 | 0.35 | −495 | 302 (+1,424) | 2.21 | 1.45 | +527 |

As sized by the live caps ($20, 0.75× / 7×): w4 $20 → $22.94 closed, equity at end $20.29 (PF $ 2.31). w5 $20.23 /
$19.27 (PF $ 1.24). w6 $19.83 / $18.37 (PF $ 0.90).

## Diagnosis

1. **The open signal book decides PF incl. open.** Signals close at PF 3.90 / 4.16 / 2.89, but 2,158 / 2,234 /
   3,299 signal orders are still open at the end, marked at −1,984 / −1,555 / −3,058. That takes Signals to 1.25 /
   0.73 / 0.86 and the book to 1.44 / 0.73 / 0.72. The 24 h hold cannot resolve inside a 6 h window: every open
   signal order is 0–12 h old, and 66–76 % of the 0–6 h ones are under water. The closed signals are mostly target
   hits (tp 1,026 / 295 / 880 against sl 160 / 46 / 177), so the high closed PF is the winners closing first while
   the losers stay open. Trailing signals show the gap most: PF closed 16.25 / 23.93 / 7.21 against incl. open
   1.58 / 0.86 / 0.92.
2. **The losing direction changes per window.** w4: shorts carry the book (+2,031, PF incl. open 1.58), while the
   signal longs lose (PF closed 0.30). w5: shorts lose (0.35, −495). w6: longs lose (0.58, −2,459). Every Short /
   General / Long order in w5 and w6 was long (Range × side tables; only Micro took shorts), and in w6 all engine ranges went under at once (Short / General
   / Long WR 19 % / 12 % / 14 %, PF incl. open 0.10 / 0.15 / 0.21). The signals' direction acceptance skipped 5,046 /
   1,962 / 2,407 entries (sig:signalSide).
3. **Engine ranges.** Short is the only engine range positive in two of three windows (2.52 / 1.97 / 0.10). General
   and Long lose in w5 and w6. Engine normal and trailing both lose in w5 and w6 (normal 0.68 / 0.15, trailing 0.78 /
   0.17). In w6 the seated configs themselves ran at PF 0.28–0.82 on their own closes inside the run (session.md
   "Seated configs over the run window"). So the run-start selection failed out of sample; the execution gates did
   not cause it.
4. **Configs that passed but never traded or barely traded.**
   - Axis: 265 / 229 / 288 Axis configs seated, 0 executed in every window. Every candidate failed engineSide /
     lastN / symPf (Wide skips 368 / 93 / 387). This is the one failing check, the same as in windows 1–3. Those
     seated Axis configs ran at PF 1.02 / 3.74 / 0.96 on their own closes, so in w5 the gates held back a winning set.
     `type:axis` off still moves orders in w6 (−44), probably because Axis candidates count toward signal
     confirmation (not verified).
   - Micro: 1,650 / 1,206 / 1,716 configs seated, 13 / 20 / 13 of them traded, 18 / 22 / 13 orders. Skips: crowd
     255 / 302 / 333 and lastN 66 / 232 / 276. Seated Micro ran at PF 30.3 / 1.45 (w4 normal / trailing), 11.7 / 9.7
     (w5), 0.30 / 0.15 (w6), so the crowding cap held back winners in w4 / w5 and losers in w6. `type:crowd-mc-0`
     (no cap) is in the variants table.
   - Base passed 1,100–1,250 pairs per window (see each session.md header). Wide pairs feed Axis only.
5. **Gates that held entries back.** For Signals (39,994 / 26,695 / 36,462 skips): confirm 14,260 / 15,839 /
   19,332, duplicate 10,087 / 4,087 / 7,860, signalPf 6,350 / 3,142 / 3,698, signalSide, signalCluster. For the
   engine: lastN first (Short 2,319 / 515 / 983), then engineSide and symPf. Opening the big gates adds orders and
   loses net incl. open in at least two windows:
   - confirmation off: +1,359 / +1,214 / +2,096 orders, net incl. open −2,852 / −3,430 / −90 (baseline +2,217 /
     −815 / −1,932);
   - signal acceptance off: +356 / +190 / +329 orders, +2,527 / −192 / −2,587;
   - engine direction acceptance off: +388 / +45 / +848 orders, +2,271 / −825 / −2,784;
   - acceptance + confirmation off: +2,016 / +1,611 / +2,955 orders, −2,686 / −3,010 / +637.

   The positive coordinations stay on (docs/positive-coordinations.md).
6. **Variant rows that beat the baseline in all three windows** (exact net incl. open up in w4, w5 and w6; none
   raises orders in all three):

   | variant | Δ net incl. open w4 / w5 / w6 | Δ orders w4 / w5 / w6 | windows 1–3 (README-w1-3, w*/tables.md) |
   |---|---|---|---|
   | `gate:minGreen-0.6` (green hours ≥ 60 %) | +360 / +546 / +870 | −118 / −193 / −373 | +886 / +678 / **−650** |
   | `coord:conflict` (conflict block on) | +1,507 / +373 / +291 | −624 / −68 / −140 | +199 / +477 / **−235** |
   | `gate:lastN-50` (entry last 50) | +171 / +24 / +166 | **+124 / +17** / −87 | +902 / +124 / **−101** |
   | `gate:lastN-30` (entry last 30) | +158 / +78 / +412 | −42 / −18 / −154 | +573 / +87 / **−32** |
   | `sig:engineSidePerInd-off`, `type:crowd-mc-1`, `type:range-off-mc` | +1 … +8 | −5 … −22 | mixed, ±12 |

   **No row beats the baseline in all six windows.** Each of the four real winners here loses in w3, which is the
   one clearly profitable window of w1–3 (baseline +1,843). They earn by trading less in losing hours and cost the
   winning ones. `gate:lastN-50` comes closest to "more orders and higher PF": orders up in w4 / w5, net incl. open
   up in five of six windows. `coord:conflict` is listed as a positive coordination (off). Here it wins five of six,
   but it loses w3, so it does not beat the coordination.
   The 24 h pass's winner `gate:validLastN-20` (below) loses here in all three (−1,230 / −292 / −960).

   What would move PF incl. open is the signal geometry, item 1: the stop ratio, the trail and the hold against a
   window. No variant row changes those. They are desk settings and need recompute runs (V-desks), not the variants
   table.

## w4 — tables

Entries window 2026-10-07T00:00:00.000Z → 2026-10-07T06:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 2713 | 82 % | 3.35 | 4125 | 2542 | -1908 | 1.44 | 2217 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 18 | 83 % | 0.58 | -4 | 0 | 0 | 0.58 | -4 |
| Short | 1148 | 80 % | 2.77 | 996 | 220 | 27 | 2.52 | 1023 |
| General | 21 | 100 % | ∞ | 77 | 7 | 11 | ∞ | 88 |
| Long | 99 | 64 % | 1.37 | 53 | 157 | 38 | 1.36 | 91 |
| Signals | 1427 | 85 % | 3.90 | 3003 | 2158 | -1984 | 1.25 | 1019 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 375 | 80 % | 2.56 | 443 | 166 | 63 | 2.45 | 505 |
| signals fixed | 709 | 79 % | 2.13 | 1025 | 1066 | -1021 | 1.00 | 4 |
| signals trailing | 718 | 92 % | 16.25 | 1978 | 1092 | -963 | 1.58 | 1015 |
| trailing | 911 | 79 % | 2.56 | 680 | 218 | 13 | 2.18 | 693 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 1045 | 71 % | 1.10 | 108 | 484 | 78 | 1.12 | 187 |
| short | 1668 | 89 % | 7.44 | 4017 | 2058 | -1986 | 1.58 | 2031 |

**Per range × side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro long | 9 | 100 % | ∞ | 4 | 0 | 0 | ∞ | 4 |
| Micro short | 9 | 67 % | 0.19 | -7 | 0 | 0 | 0.19 | -7 |
| Short long | 770 | 80 % | 2.77 | 612 | 176 | 117 | 3.02 | 729 |
| Short short | 378 | 80 % | 2.77 | 384 | 44 | -91 | 1.94 | 293 |
| General short | 21 | 100 % | ∞ | 77 | 7 | 11 | ∞ | 88 |
| Long long | 76 | 53 % | 0.59 | -60 | 142 | 16 | 0.82 | -45 |
| Long short | 23 | 100 % | ∞ | 114 | 15 | 22 | 175.11 | 136 |
| Signals long | 190 | 43 % | 0.30 | -447 | 166 | -55 | 0.50 | -502 |
| Signals short | 1237 | 92 % | 9.69 | 3450 | 1992 | -1929 | 1.48 | 1521 |

**Per range × type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro · normal | 6 | 100 % | ∞ | 2 | 0 | 0 | ∞ | 2 |
| Micro · trailing | 12 | 75 % | 0.39 | -6 | 0 | 0 | 0.39 | -6 |
| Short · normal | 313 | 82 % | 2.74 | 352 | 85 | 31 | 2.65 | 383 |
| Short · trailing | 835 | 79 % | 2.79 | 644 | 135 | -4 | 2.45 | 640 |
| General · normal | 13 | 100 % | ∞ | 49 | 0 | 0 | ∞ | 49 |
| General · trailing | 8 | 100 % | ∞ | 27 | 7 | 11 | ∞ | 38 |
| Long · normal | 43 | 56 % | 1.49 | 39 | 81 | 32 | 1.61 | 71 |
| Long · trailing | 56 | 70 % | 1.22 | 14 | 76 | 6 | 1.15 | 20 |
| Signals · signals fixed | 709 | 79 % | 2.13 | 1025 | 1066 | -1021 | 1.00 | 4 |
| Signals · signals trailing | 718 | 92 % | 16.25 | 1978 | 1092 | -963 | 1.58 | 1015 |


## w5 — tables

Entries window 2026-10-06T18:00:00.000Z → 2026-10-07T00:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 658 | 78 % | 2.47 | 837 | 2665 | -1652 | 0.73 | -815 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 22 | 77 % | 0.81 | -1 | 3 | 0 | 0.87 | -1 |
| Short | 114 | 89 % | 4.62 | 136 | 114 | -29 | 1.97 | 107 |
| General | 41 | 32 % | 0.32 | -69 | 118 | -16 | 0.44 | -85 |
| Long | 32 | 13 % | 0.16 | -118 | 196 | -52 | 0.37 | -171 |
| Signals | 449 | 84 % | 4.16 | 890 | 2234 | -1555 | 0.73 | -664 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 108 | 62 % | 0.73 | -45 | 243 | -49 | 0.68 | -93 |
| signals fixed | 218 | 80 % | 2.23 | 316 | 1152 | -832 | 0.62 | -516 |
| signals trailing | 231 | 88 % | 23.93 | 574 | 1082 | -722 | 0.86 | -148 |
| trailing | 101 | 68 % | 0.93 | -9 | 188 | -48 | 0.78 | -57 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 602 | 80 % | 2.97 | 912 | 1939 | -1231 | 0.86 | -319 |
| short | 56 | 61 % | 0.28 | -75 | 726 | -420 | 0.35 | -495 |

**Per range × side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro long | 9 | 100 % | ∞ | 4 | 0 | 0 | ∞ | 4 |
| Micro short | 13 | 62 % | 0.31 | -5 | 3 | 0 | 0.37 | -5 |
| Short long | 114 | 89 % | 4.62 | 136 | 114 | -29 | 1.97 | 107 |
| General long | 41 | 32 % | 0.32 | -69 | 118 | -16 | 0.44 | -85 |
| Long long | 32 | 13 % | 0.16 | -118 | 196 | -52 | 0.37 | -171 |
| Signals long | 406 | 86 % | 6.21 | 960 | 1511 | -1134 | 0.90 | -174 |
| Signals short | 43 | 60 % | 0.28 | -70 | 723 | -421 | 0.35 | -491 |

**Per range × type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro · normal | 21 | 81 % | 0.96 | -0 | 3 | 0 | 1.03 | 0 |
| Micro · trailing | 1 | 0 % | 0.00 | -1 | 0 | 0 | 0.00 | -1 |
| Short · normal | 46 | 96 % | 8.00 | 78 | 38 | -15 | 2.89 | 64 |
| Short · trailing | 68 | 85 % | 3.18 | 57 | 76 | -14 | 1.56 | 43 |
| General · normal | 24 | 21 % | 0.27 | -51 | 88 | -13 | 0.41 | -64 |
| General · trailing | 17 | 47 % | 0.43 | -18 | 30 | -4 | 0.51 | -22 |
| Long · normal | 17 | 6 % | 0.07 | -71 | 114 | -22 | 0.33 | -93 |
| Long · trailing | 15 | 20 % | 0.26 | -47 | 82 | -30 | 0.42 | -77 |
| Signals · signals fixed | 218 | 80 % | 2.23 | 316 | 1152 | -832 | 0.62 | -516 |
| Signals · signals trailing | 231 | 88 % | 23.93 | 574 | 1082 | -722 | 0.86 | -148 |


## w6 — tables

Entries window 2026-10-06T12:00:00.000Z → 2026-10-06T18:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 1718 | 68 % | 1.58 | 1330 | 3632 | -3262 | 0.72 | -1932 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 13 | 54 % | 0.40 | -4 | 2 | -1 | 0.35 | -5 |
| Short | 160 | 19 % | 0.12 | -356 | 100 | -78 | 0.10 | -435 |
| General | 103 | 12 % | 0.14 | -257 | 65 | -41 | 0.15 | -298 |
| Long | 96 | 14 % | 0.16 | -326 | 166 | -84 | 0.21 | -409 |
| Signals | 1346 | 82 % | 2.89 | 2273 | 3299 | -3058 | 0.86 | -785 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 278 | 16 % | 0.12 | -759 | 184 | -85 | 0.15 | -843 |
| signals fixed | 686 | 77 % | 1.86 | 836 | 1657 | -1413 | 0.81 | -577 |
| signals trailing | 660 | 87 % | 7.21 | 1437 | 1642 | -1645 | 0.92 | -208 |
| trailing | 94 | 19 % | 0.20 | -185 | 149 | -119 | 0.17 | -304 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 1416 | 64 % | 1.47 | 917 | 2208 | -3377 | 0.58 | -2459 |
| short | 302 | 83 % | 2.21 | 412 | 1424 | 115 | 1.45 | 527 |

**Per range × side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro long | 8 | 63 % | 4.44 | 2 | 2 | -1 | 1.44 | 1 |
| Micro short | 5 | 40 % | 0.12 | -6 | 0 | 0 | 0.12 | -6 |
| Short long | 160 | 19 % | 0.12 | -356 | 100 | -78 | 0.10 | -435 |
| General long | 103 | 12 % | 0.14 | -257 | 65 | -41 | 0.15 | -298 |
| Long long | 96 | 14 % | 0.16 | -326 | 166 | -84 | 0.21 | -409 |
| Signals long | 1049 | 81 % | 3.14 | 1855 | 1875 | -3173 | 0.71 | -1318 |
| Signals short | 297 | 84 % | 2.25 | 418 | 1424 | 115 | 1.46 | 533 |

**Per range × type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro · normal | 10 | 70 % | 0.42 | -4 | 2 | -1 | 0.37 | -5 |
| Micro · trailing | 3 | 0 % | 0.00 | -0 | 0 | 0 | 0.00 | -0 |
| Short · normal | 110 | 20 % | 0.13 | -259 | 60 | -44 | 0.11 | -303 |
| Short · trailing | 50 | 16 % | 0.10 | -97 | 40 | -34 | 0.07 | -131 |
| General · normal | 78 | 9 % | 0.12 | -208 | 30 | -16 | 0.14 | -225 |
| General · trailing | 25 | 20 % | 0.21 | -49 | 35 | -25 | 0.16 | -73 |
| Long · normal | 80 | 10 % | 0.12 | -287 | 92 | -23 | 0.19 | -310 |
| Long · trailing | 16 | 31 % | 0.38 | -38 | 74 | -61 | 0.27 | -99 |
| Signals · signals fixed | 686 | 77 % | 1.86 | 836 | 1657 | -1413 | 0.81 | -577 |
| Signals · signals trailing | 660 | 87 % | 7.21 | 1437 | 1642 | -1645 | 0.92 | -208 |


## Variants (CTS_CORE_VARIANTS=1): the session's walk-forward rerun on its own tapes, one switch at a time

Each cell: orders (Δ vs that window's baseline) · PF closed · PF incl. open ≈ · net incl. open. The variant rows record
the open orders as one net (`openNet`), so their PF incl. open is ≈: (gp + max(openNet, 0)) ÷ (gl + max(−openNet, 0)).
On 6 h windows that is far from the exact value: the baselines are ≈ 1.61 / 0.63 / 0.65 against exact 1.44 / 0.73 /
0.72. **Net incl. open (net + openNet) is exact**, and it is the ranking basis. Rows marked "na" / "recompute" by the
report (DCA Active, Block sub-modes, tactics) were not run and are left out.

| baseline | 2713 · 3.35 · 1.61 · 2217 | 658 · 2.47 · 0.63 · -815 | 1718 · 1.58 · 0.65 · -1932 | |

### Rows that raise net incl. open (exact) in every window

| variant | w4: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w5: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w6: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | wins in all |
|---|---|---|---|---|
| Engine direction acceptance per indication: pooled per range (`sig:engineSidePerInd-off`) | 2704 (-9) · 3.37 · 1.61 · 2225 | 645 (-13) · 2.50 · 0.63 · -810 | 1713 (-5) · 1.58 · 0.65 · -1926 | PF incl. open, net incl. open, PF closed |
| Conflict block on (`coord:conflict`) | 2089 (-624) · 4.53 · 3.61 · 3724 | 590 (-68) · 2.95 · 0.76 · -442 | 1578 (-140) · 1.69 · 0.68 · -1641 | PF incl. open, net incl. open, PF closed |
| Entry last 30 (`gate:lastN-30`) | 2671 (-42) · 3.66 · 1.67 · 2375 | 640 (-18) · 2.95 · 0.65 · -737 | 1564 (-154) · 1.85 · 0.70 · -1520 | PF incl. open, net incl. open, PF closed |
| Entry last 50 (`gate:lastN-50`) | 2837 (+124) · 3.34 · 1.64 · 2388 | 675 (+17) · 2.52 · 0.64 · -791 | 1631 (-87) · 1.68 · 0.67 · -1766 | PF incl. open, net incl. open |
| Green hours ≥ 60 % (`gate:minGreen-0.6`) | 2595 (-118) · 3.60 · 1.81 · 2577 | 465 (-193) · 4.16 · 0.80 · -269 | 1345 (-373) · 1.95 · 0.74 · -1062 | PF incl. open, net incl. open, PF closed |
| Micro: at most 1 per bar (`type:crowd-mc-1`) | 2701 (-12) · 3.36 · 1.61 · 2220 | 644 (-14) · 2.48 · 0.63 · -815 | 1710 (-8) · 1.58 · 0.65 · -1929 | net incl. open, PF closed |
| Micro off (`type:range-off-mc`) | 2695 (-18) · 3.37 · 1.61 · 2221 | 636 (-22) · 2.49 · 0.63 · -814 | 1705 (-13) · 1.58 · 0.65 · -1927 | net incl. open, PF closed |

### Rows that raise orders AND net incl. open in every window 

| variant | w4: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w5: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w6: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | wins in all |
|---|---|---|---|---|

### Every row

| variant | w4: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w5: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w6: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | wins in all |
|---|---|---|---|---|
| Normal off (`type:normal`) | 189 (-2524) · 1.84 · 0.95 · -22 | 0 (-658) · 0.00 · – · 0 | 218 (-1500) · 16.32 · 1.08 · 47 | – |
| Trailing off (`type:trailing`) | 1022 (-1691) · 2.61 · 1.43 · 762 | 293 (-365) · 2.09 · 0.68 · -305 | 928 (-790) · 1.00 · 0.56 · -1448 | – |
| Block on (`type:block`) | 2713 (+0) · 3.59 · 1.78 · 10330 | 658 (+0) · 3.48 · 0.65 · -2272 | 1718 (+0) · 1.64 · 0.64 · -6044 | PF closed |
| Block Active on (`type:blockActive`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| DCA on (`type:dca`) | 2737 (+24) · 3.37 · 1.51 · 1994 | 667 (+9) · 2.36 · 0.63 · -826 | 1779 (+61) · 1.59 · 0.66 · -1946 | orders |
| Axis off (`type:axis`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1674 (-44) · 1.52 · 0.63 · -2020 | – |
| Micro: at most 1 per bar (`type:crowd-mc-1`) | 2701 (-12) · 3.36 · 1.61 · 2220 | 644 (-14) · 2.48 · 0.63 · -815 | 1710 (-8) · 1.58 · 0.65 · -1929 | net incl. open, PF closed |
| Micro: at most 10 per bar (`type:crowd-mc-10`) | 2755 (+42) · 3.32 · 1.60 · 2210 | 690 (+32) · 2.45 · 0.64 · -813 | 1739 (+21) · 1.58 · 0.65 · -1930 | orders |
| Micro: no crowding cap (`type:crowd-mc-0`) | 2952 (+239) · 3.32 · 1.61 · 2253 | 902 (+244) · 2.56 · 0.66 · -749 | 2003 (+285) · 1.44 · 0.63 · -2136 | orders |
| Short: at most 1 per bar (`type:crowd-sh-1`) | 1615 (-1098) · 3.59 · 1.39 · 1231 | 558 (-100) · 2.32 · 0.58 · -911 | 1570 (-148) · 1.86 · 0.70 · -1538 | – |
| Short: at most 3 per bar (`type:crowd-sh-3`) | 1690 (-1023) · 3.58 · 1.41 · 1301 | 574 (-84) · 2.30 · 0.58 · -913 | 1589 (-129) · 1.82 · 0.69 · -1594 | – |
| Short: at most 10 per bar (`type:crowd-sh-10`) | 1865 (-848) · 3.44 · 1.43 · 1418 | 603 (-55) · 2.30 · 0.59 · -912 | 1643 (-75) · 1.70 · 0.67 · -1766 | – |
| General: at most 1 per bar (`type:crowd-gn-1`) | 2693 (-20) · 3.31 · 1.58 · 2135 | 627 (-31) · 2.83 · 0.65 · -748 | 1633 (-85) · 1.76 · 0.68 · -1674 | – |
| General: at most 3 per bar (`type:crowd-gn-3`) | 2695 (-18) · 3.31 · 1.58 · 2146 | 639 (-19) · 2.66 · 0.64 · -779 | 1653 (-65) · 1.72 · 0.68 · -1729 | – |
| General: at most 10 per bar (`type:crowd-gn-10`) | 2702 (-11) · 3.33 · 1.59 · 2177 | 657 (-1) · 2.47 · 0.64 · -807 | 1691 (-27) · 1.63 · 0.66 · -1864 | – |
| Long: at most 1 per bar (`type:crowd-lg-1`) | 2622 (-91) · 3.50 · 1.60 · 2131 | 632 (-26) · 3.12 · 0.68 · -650 | 1634 (-84) · 1.83 · 0.70 · -1571 | PF closed |
| Long: at most 3 per bar (`type:crowd-lg-3`) | 2633 (-80) · 3.46 · 1.60 · 2132 | 641 (-17) · 2.94 · 0.68 · -676 | 1654 (-64) · 1.77 · 0.69 · -1656 | PF closed |
| Long: at most 10 per bar (`type:crowd-lg-10`) | 2664 (-49) · 3.35 · 1.59 · 2151 | 654 (-4) · 2.57 · 0.65 · -752 | 1694 (-24) · 1.64 · 0.66 · -1846 | – |
| Signals: at most 1 per bar (`type:crowd-sig-1`) | 1381 (-1332) · 2.43 · 2.44 · 1181 | 247 (-411) · 0.91 · 0.61 · -184 | 478 (-1240) · 0.22 · 0.18 · -1301 | – |
| Signals: at most 3 per bar (`type:crowd-sig-3`) | 1548 (-1165) · 2.33 · 1.96 · 1140 | 311 (-347) · 1.09 · 0.63 · -233 | 646 (-1072) · 0.37 · 0.28 · -1433 | – |
| Signals: at most 10 per bar (`type:crowd-sig-10`) | 2066 (-647) · 2.58 · 1.71 · 1493 | 479 (-179) · 1.62 · 0.68 · -358 | 1046 (-672) · 0.81 · 0.46 · -1705 | – |
| Wide (incl. Axis, DCA): at most 1 per bar (`type:crowd-wide-1`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Wide (incl. Axis, DCA): at most 3 per bar (`type:crowd-wide-3`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Wide (incl. Axis, DCA): at most 10 per bar (`type:crowd-wide-10`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Axis / DCA only beside their pair's seated Normal (`type:ladder-needs-base`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1704 (-14) · 1.56 · 0.65 · -1930 | – |
| Micro off (`type:range-off-mc`) | 2695 (-18) · 3.37 · 1.61 · 2221 | 636 (-22) · 2.49 · 0.63 · -814 | 1705 (-13) · 1.58 · 0.65 · -1927 | net incl. open, PF closed |
| Minimal off (`type:range-off-mn`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Minimal plus off (`type:range-off-mp`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Short off (`type:range-off-sh`) | 1565 (-1148) · 3.63 · 1.38 · 1195 | 544 (-114) · 2.32 · 0.57 · -921 | 1558 (-160) · 1.89 · 0.71 · -1498 | – |
| General off (`type:range-off-gn`) | 2692 (-21) · 3.31 · 1.58 · 2129 | 617 (-41) · 2.94 · 0.65 · -729 | 1615 (-103) · 1.79 · 0.69 · -1634 | – |
| Long off (`type:range-off-lg`) | 2614 (-99) · 3.53 · 1.60 · 2126 | 626 (-32) · 3.23 · 0.68 · -644 | 1622 (-96) · 1.87 · 0.70 · -1523 | PF closed |
| Signals off (`sig:signals`) | 1286 (-1427) · 2.56 · 2.67 · 1198 | 209 (-449) · 0.82 · 0.61 · -150 | 372 (-1346) · 0.14 · 0.12 · -1147 | – |
| Signal confirmation off (`sig:confirm`) | 4072 (+1359) · 1.72 · 0.75 · -2852 | 1872 (+1214) · 1.46 · 0.49 · -3430 | 3814 (+2096) · 2.38 · 0.99 · -90 | orders |
| Engine direction acceptance off (`sig:engineSide`) | 3101 (+388) · 2.98 · 1.55 · 2271 | 703 (+45) · 2.37 · 0.64 · -825 | 2566 (+848) · 1.05 · 0.61 · -2784 | orders |
| Engine direction acceptance window 3 h (`sig:engineSide-hours3`) | 2702 (-11) · 3.52 · 1.72 · 2514 | 502 (-156) · 3.24 · 0.61 · -763 | 1811 (+93) · 1.53 · 0.65 · -1991 | – |
| Engine direction acceptance window 12 h (`sig:engineSide-hours12`) | 2637 (-76) · 3.57 · 1.69 · 2382 | 679 (+21) · 2.41 · 0.63 · -824 | 1578 (-140) · 1.88 · 0.70 · -1542 | – |
| Engine direction acceptance window 48 h (`sig:engineSide-hours48`) | 2630 (-83) · 3.43 · 1.61 · 2161 | 649 (-9) · 2.48 · 0.63 · -814 | 1716 (-2) · 1.58 · 0.65 · -1933 | – |
| Engine direction acceptance PF 1.2 (`sig:engineSide-minPf1.2`) | 2487 (-226) · 3.90 · 1.73 · 2371 | 544 (-114) · 2.32 · 0.57 · -921 | 1654 (-64) · 1.69 · 0.67 · -1792 | – |
| Engine direction acceptance PF 1.3 (`sig:engineSide-minPf1.3`) | 1689 (-1024) · 4.24 · 1.49 · 1487 | 537 (-121) · 2.40 · 0.58 · -893 | 1585 (-133) · 1.81 · 0.69 · -1621 | – |
| Engine direction acceptance 10 closes (`sig:engineSide-minTrades10`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Engine direction acceptance 60 closes (`sig:engineSide-minTrades60`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Engine direction acceptance per indication: every range (`sig:engineSidePerInd-all`) | 2880 (+167) · 2.96 · 1.53 · 2100 | 661 (+3) · 2.60 · 0.65 · -775 | 2419 (+701) · 1.08 · 0.62 · -2630 | orders |
| Engine direction acceptance per indication: pooled per range (`sig:engineSidePerInd-off`) | 2704 (-9) · 3.37 · 1.61 · 2225 | 645 (-13) · 2.50 · 0.63 · -810 | 1713 (-5) · 1.58 · 0.65 · -1926 | PF incl. open, net incl. open, PF closed |
| Signal acceptance off (`sig:accept`) | 3069 (+356) · 3.91 · 1.58 · 2527 | 848 (+190) · 3.25 · 0.91 · -192 | 2047 (+329) · 1.63 · 0.63 · -2587 | orders, PF closed |
| Signal acceptance and confirmation off (`sig:accept-confirm`) | 4729 (+2016) · 1.97 · 0.79 · -2686 | 2269 (+1611) · 1.73 · 0.58 · -3010 | 4673 (+2955) · 2.57 · 1.06 · 637 | orders |
| Active signals 100 (`sig:count-100`) | 1306 (-1407) · 2.56 · 2.57 · 1144 | 429 (-229) · 3.36 · 2.58 · 620 | 461 (-1257) · 0.35 · 0.28 · -1078 | – |
| Active signals 200 (`sig:count-200`) | 1324 (-1389) · 2.72 · 2.91 · 1370 | 453 (-205) · 3.55 · 3.11 · 725 | 674 (-1044) · 0.77 · 0.54 · -871 | – |
| Signal ranking drawdown (`sig:rank-drawdown`) | 1836 (-877) · 2.33 · 1.92 · 1539 | 504 (-154) · 1.29 · 0.54 · -771 | 1214 (-504) · 1.36 · 0.56 · -1862 | – |
| Signal ranking lowdd (`sig:rank-lowdd`) | 1620 (-1093) · 2.34 · 2.57 · 1748 | 444 (-214) · 1.90 · 0.94 · -56 | 963 (-755) · 1.07 · 0.48 · -1840 | – |
| Coordination off (`coord:all`) | 4072 (+1359) · 1.72 · 0.75 · -2852 | 1872 (+1214) · 1.46 · 0.49 · -3430 | 3814 (+2096) · 2.38 · 0.99 · -90 | orders |
| Hour lock 1 % (`coord:hourLock`) | 404 (-2309) · 3.65 · 4.15 · 975 | 385 (-273) · 3.67 · 1.24 · 167 | 751 (-967) · 1.46 · 0.68 · -722 | PF incl. open |
| Cooldown signals (`coord:cooldown-signals`) | 2230 (-483) · 3.70 · 1.58 · 1657 | 658 (+0) · 2.47 · 0.63 · -815 | 766 (-952) · 0.62 · 0.34 · -2036 | – |
| Cooldown all (`coord:cooldown-all`) | 2131 (-582) · 3.78 · 1.57 · 1578 | 658 (+0) · 2.47 · 0.63 · -815 | 584 (-1134) · 0.84 · 0.41 · -1401 | – |
| Conflict block on (`coord:conflict`) | 2089 (-624) · 4.53 · 3.61 · 3724 | 590 (-68) · 2.95 · 0.76 · -442 | 1578 (-140) · 1.69 · 0.68 · -1641 | PF incl. open, net incl. open, PF closed |
| Stable-02 windows on (`coord:s2Windows`) | 1787 (-926) · 2.76 · 1.40 · 1145 | 441 (-217) · 1.98 · 0.46 · -995 | 1231 (-487) · 1.15 · 0.56 · -1773 | – |
| Negative-hour hedge on (`coord:hedge`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Entry last-N off (`gate:lastN-0`) | 2542 (-171) · 3.55 · 1.61 · 2162 | 649 (-9) · 2.71 · 0.65 · -747 | 1577 (-141) · 1.90 · 0.70 · -1496 | PF incl. open, PF closed |
| Entry last 5 (`gate:lastN-5`) | 2435 (-278) · 3.20 · 1.48 · 1745 | 651 (-7) · 2.40 · 0.62 · -860 | 1714 (-4) · 1.63 · 0.66 · -1891 | – |
| Entry last 10 (`gate:lastN-10`) | 2905 (+192) · 3.31 · 1.63 · 2375 | 734 (+76) · 2.14 · 0.63 · -887 | 1755 (+37) · 1.56 · 0.65 · -1973 | orders |
| Entry last 20 (`gate:lastN-20`) | 2576 (-137) · 3.36 · 1.56 · 2046 | 628 (-30) · 2.56 · 0.63 · -785 | 1641 (-77) · 1.75 · 0.68 · -1678 | PF closed |
| Entry last 25 (`gate:lastN-25`) | 2542 (-171) · 3.55 · 1.61 · 2162 | 649 (-9) · 2.71 · 0.65 · -747 | 1577 (-141) · 1.90 · 0.70 · -1496 | PF incl. open, PF closed |
| Entry last 30 (`gate:lastN-30`) | 2671 (-42) · 3.66 · 1.67 · 2375 | 640 (-18) · 2.95 · 0.65 · -737 | 1564 (-154) · 1.85 · 0.70 · -1520 | PF incl. open, net incl. open, PF closed |
| Entry last 35 (`gate:lastN-35`) | 2678 (-35) · 3.64 · 1.66 · 2365 | 654 (-4) · 2.50 · 0.62 · -863 | 1587 (-131) · 1.78 · 0.69 · -1576 | PF closed |
| Entry last 50 (`gate:lastN-50`) | 2837 (+124) · 3.34 · 1.64 · 2388 | 675 (+17) · 2.52 · 0.64 · -791 | 1631 (-87) · 1.68 · 0.67 · -1766 | PF incl. open, net incl. open |
| Entry last 75 (`gate:lastN-75`) | 3067 (+354) · 3.13 · 1.62 · 2440 | 744 (+86) · 2.79 · 0.71 · -627 | 1751 (+33) · 1.52 · 0.64 · -2025 | orders |
| Validation last-N off (`gate:validLastN-0`) | 3889 (+1176) · 2.34 · 1.21 · 1284 | 1215 (+557) · 1.91 · 0.58 · -1543 | 2889 (+1171) · 1.47 · 0.69 · -2744 | orders |
| Validation last 10 (`gate:validLastN-10`) | 2221 (-492) · 3.27 · 1.30 · 1168 | 692 (+34) · 3.73 · 0.89 · -178 | 1831 (+113) · 1.79 · 0.74 · -1366 | – |
| Validation last 20 (`gate:validLastN-20`) | 3139 (+426) · 2.08 · 1.21 · 987 | 932 (+274) · 2.12 · 0.61 · -1107 | 1699 (-19) · 1.49 · 0.55 · -2892 | – |
| Validation last 25 (`gate:validLastN-25`) | 3243 (+530) · 2.02 · 1.16 · 800 | 868 (+210) · 1.88 · 0.60 · -1008 | 1846 (+128) · 1.27 · 0.53 · -3285 | orders |
| Validation last 35 (`gate:validLastN-35`) | 3231 (+518) · 2.01 · 1.15 · 775 | 894 (+236) · 1.78 · 0.58 · -1052 | 1908 (+190) · 1.27 · 0.53 · -3296 | orders |
| Validation last 50 (`gate:validLastN-50`) | 3400 (+687) · 2.35 · 1.18 · 1020 | 861 (+203) · 2.00 · 0.69 · -641 | 2352 (+634) · 1.56 · 0.68 · -2463 | orders |
| Validation last 75 (`gate:validLastN-75`) | 3215 (+502) · 2.17 · 1.07 · 383 | 915 (+257) · 2.01 · 0.73 · -573 | 2302 (+584) · 1.79 · 0.84 · -987 | orders |
| Validation last 100 (`gate:validLastN-100`) | 3289 (+576) · 2.33 · 1.13 · 737 | 1001 (+343) · 2.35 · 0.90 · -199 | 2400 (+682) · 1.67 · 0.85 · -928 | orders |
| Signals last 5 (`gate:signalLastN-5`) | 1890 (-823) · 2.85 · 1.41 · 989 | 405 (-253) · 1.62 · 0.57 · -520 | 918 (-800) · 1.24 · 0.61 · -1107 | – |
| Signals last 10 (`gate:signalLastN-10`) | 1753 (-960) · 2.85 · 1.51 · 1031 | 369 (-289) · 1.41 · 0.58 · -441 | 772 (-946) · 1.03 · 0.59 · -969 | – |
| Signals last 15 (`gate:signalLastN-15`) | 1692 (-1021) · 2.84 · 1.45 · 915 | 346 (-312) · 1.40 · 0.60 · -370 | 694 (-1024) · 0.86 · 0.51 · -1072 | – |
| Signals last 25 (`gate:signalLastN-25`) | 1637 (-1076) · 2.98 · 1.57 · 1028 | 351 (-307) · 1.40 · 0.60 · -387 | 687 (-1031) · 0.83 · 0.51 · -1055 | – |
| Symbol gate veto (`gate:symGate-veto`) | 2743 (+30) · 3.28 · 1.58 · 2179 | 668 (+10) · 2.51 · 0.66 · -741 | 1754 (+36) · 1.50 · 0.64 · -2041 | orders |
| Symbol gate proven (`gate:symGate-proven`) | 2714 (+1) · 3.42 · 1.60 · 2216 | 653 (-5) · 2.64 · 0.66 · -726 | 1728 (+10) · 1.55 · 0.65 · -1970 | – |
| Symbol gate off (`gate:symGate-off`) | 3004 (+291) · 2.98 · 1.53 · 2162 | 700 (+42) · 2.45 · 0.65 · -793 | 1910 (+192) · 1.39 · 0.62 · -2277 | orders |
| Sample warm-up off (strict) (`gate:warmup`) | 1828 (-885) · 3.55 · 1.39 · 1275 | 463 (-195) · 2.50 · 0.51 · -1033 | 1256 (-462) · 1.88 · 0.60 · -1891 | PF closed |
| Last-N floor off (`gate:lastNFloor-0`) | 1864 (-849) · 3.26 · 1.33 · 1098 | 454 (-204) · 2.06 · 0.50 · -1033 | 1276 (-442) · 1.33 · 0.49 · -2582 | – |
| Last-N floor 3 (`gate:lastNFloor-3`) | 2858 (+145) · 3.46 · 1.67 · 2470 | 673 (+15) · 2.51 · 0.64 · -795 | 1719 (+1) · 1.58 · 0.65 · -1934 | orders |
| Last-N floor 8 (`gate:lastNFloor-8`) | 2512 (-201) · 3.09 · 1.47 · 1712 | 620 (-38) · 2.55 · 0.62 · -828 | 1687 (-31) · 1.62 · 0.66 · -1896 | – |
| Last-N floor 10 (`gate:lastNFloor-10`) | 2044 (-669) · 3.34 · 1.41 · 1393 | 580 (-78) · 2.45 · 0.59 · -886 | 1680 (-38) · 1.63 · 0.66 · -1874 | – |
| Last-N floor 15 (`gate:lastNFloor-15`) | 2033 (-680) · 3.36 · 1.41 · 1394 | 502 (-156) · 2.14 · 0.51 · -1083 | 1430 (-288) · 1.33 · 0.51 · -2598 | – |
| Last-N floor 25 (`gate:lastNFloor-25`) | 2033 (-680) · 3.36 · 1.41 · 1394 | 502 (-156) · 2.14 · 0.51 · -1083 | 1400 (-318) · 1.29 · 0.50 · -2694 | – |
| Range gate off (`gate:rangeGate-off`) | 2739 (+26) · 3.37 · 1.64 · 2309 | 658 (+0) · 2.47 · 0.63 · -815 | 1720 (+2) · 1.58 · 0.65 · -1931 | – |
| Range gate last 15 (`gate:rangeGate-n15`) | 2739 (+26) · 3.37 · 1.64 · 2309 | 658 (+0) · 2.47 · 0.63 · -815 | 1720 (+2) · 1.58 · 0.65 · -1931 | – |
| Range gate last 25 (`gate:rangeGate-n25`) | 2727 (+14) · 3.36 · 1.63 · 2293 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1927 | – |
| Range gate last 35 (`gate:rangeGate-n35`) | 2701 (-12) · 3.39 · 1.59 · 2176 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1926 | – |
| Range gate last 50 (`gate:rangeGate-n50`) | 2694 (-19) · 3.34 · 1.60 · 2189 | 658 (+0) · 2.47 · 0.63 · -817 | 1717 (-1) · 1.58 · 0.65 · -1926 | – |
| Range gate last 100 (`gate:rangeGate-n100`) | 2709 (-4) · 3.35 · 1.60 · 2210 | 658 (+0) · 2.47 · 0.63 · -819 | 1720 (+2) · 1.58 · 0.65 · -1930 | – |
| Range gate PF 1.20 (`gate:rangeGate-pf1.2`) | 2687 (-26) · 3.34 · 1.60 · 2177 | 657 (-1) · 2.50 · 0.64 · -805 | 1711 (-7) · 1.59 · 0.66 · -1904 | – |
| Range gate PF 1.35 (`gate:rangeGate-pf1.35`) | 2635 (-78) · 3.40 · 1.59 · 2154 | 642 (-16) · 2.53 · 0.60 · -924 | 1689 (-29) · 1.63 · 0.68 · -1736 | PF closed |
| Range gate on its full last N (`gate:rangeGate-strict`) | 1941 (-772) · 3.32 · 1.38 · 1290 | 537 (-121) · 2.34 · 0.61 · -793 | 1568 (-150) · 1.70 · 0.66 · -1764 | – |
| Range gate on General and Long too (`gate:rangeGate-allRanges`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.64 · -798 | 1712 (-6) · 1.60 · 0.66 · -1908 | – |
| Loss prior on (`gate:lossPrior`) | 2601 (-112) · 3.30 · 1.57 · 2053 | 638 (-20) · 2.45 · 0.62 · -830 | 1711 (-7) · 1.58 · 0.65 · -1934 | – |
| Loss prior on, range gate on its full last N (`gate:lossPrior-strictRange`) | 1913 (-800) · 3.28 · 1.36 · 1211 | 536 (-122) · 2.34 · 0.61 · -790 | 1568 (-150) · 1.70 · 0.66 · -1763 | – |
| Symbol gate closes 1 (`gate:symMinN-1`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Symbol gate closes 5 (`gate:symMinN-5`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Symbol gate closes 10 (`gate:symMinN-10`) | 2713 (+0) · 3.35 · 1.61 · 2217 | 658 (+0) · 2.47 · 0.63 · -815 | 1718 (+0) · 1.58 · 0.65 · -1932 | – | no effect
| Green-hour gate off (`gate:minGreen-0`) | 2718 (+5) · 3.33 · 1.60 · 2209 | 662 (+4) · 2.45 · 0.64 · -781 | 1745 (+27) · 1.53 · 0.64 · -2018 | orders |
| Green hours ≥ 40 % (`gate:minGreen-0.4`) | 2718 (+5) · 3.33 · 1.60 · 2209 | 662 (+4) · 2.45 · 0.64 · -781 | 1745 (+27) · 1.53 · 0.64 · -2018 | orders |
| Green hours ≥ 60 % (`gate:minGreen-0.6`) | 2595 (-118) · 3.60 · 1.81 · 2577 | 465 (-193) · 4.16 · 0.80 · -269 | 1345 (-373) · 1.95 · 0.74 · -1062 | PF incl. open, net incl. open, PF closed |
| Direction gate 10 (`gate:sideGateN`) | 2339 (-374) · 3.34 · 1.52 · 1767 | 555 (-103) · 2.37 · 0.57 · -945 | 1493 (-225) · 2.16 · 0.74 · -1235 | – |
| Position cap 12 (`gate:maxPositions`) | 2265 (-448) · 4.23 · 1.71 · 2172 | 607 (-51) · 2.47 · 0.61 · -868 | 1680 (-38) · 1.62 · 0.66 · -1869 | – |

## Appendix — the 24 h pass (without `--wf '{"simH":6}'`; `w4-24h/` … `w6-24h/`)

The same command without the flag simulated 24 h ending at each `--end-at`. These windows overlap, 18 h between
neighbours. Wall time: 3,250 s (rerun after a container restart killed the first attempt at variant 97/108) / 3,000 s /
2,960 s. Checks: 54/55 ok — FAILED: execution: strategy type axis executed orders, in all three.

### w4-24h

Entries window 2026-10-06T06:00:00.000Z → 2026-10-07T06:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 19356 | 70 % | 1.34 | 10307 | 9659 | -14679 | 0.91 | -4372 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 48 | 65 % | 0.29 | -30 | 0 | 0 | 0.29 | -30 |
| Short | 2859 | 62 % | 1.03 | 80 | 348 | 408 | 1.17 | 488 |
| General | 884 | 43 % | 0.64 | -513 | 74 | 63 | 0.69 | -450 |
| Long | 1224 | 36 % | 0.41 | -1931 | 380 | 155 | 0.49 | -1775 |
| Signals | 14341 | 76 % | 1.56 | 12700 | 8857 | -15306 | 0.94 | -2605 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 2039 | 45 % | 0.65 | -1390 | 322 | 110 | 0.69 | -1281 |
| signals fixed | 7452 | 71 % | 1.19 | 2947 | 4027 | -5498 | 0.89 | -2551 |
| signals trailing | 6889 | 82 % | 2.37 | 9754 | 4830 | -9808 | 1.00 | -54 |
| trailing | 2976 | 57 % | 0.72 | -1003 | 480 | 517 | 0.87 | -486 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 12962 | 62 % | 0.94 | -1344 | 6003 | -9062 | 0.71 | -10405 |
| short | 6394 | 85 % | 2.84 | 11650 | 3656 | -5617 | 1.43 | 6033 |


### w5-24h

Entries window 2026-10-06T00:00:00.000Z → 2026-10-07T00:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 8548 | 81 % | 2.55 | 13754 | 6744 | -8377 | 1.27 | 5377 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 52 | 73 % | 0.67 | -7 | 0 | 0 | 0.67 | -7 |
| Short | 492 | 73 % | 1.89 | 270 | 164 | -10 | 1.63 | 260 |
| General | 171 | 47 % | 0.85 | -44 | 138 | 32 | 0.97 | -12 |
| Long | 315 | 59 % | 1.59 | 331 | 297 | 57 | 1.51 | 388 |
| Signals | 7518 | 83 % | 2.72 | 13203 | 6145 | -8456 | 1.26 | 4747 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 528 | 62 % | 1.45 | 328 | 307 | 55 | 1.43 | 383 |
| signals fixed | 3813 | 81 % | 2.30 | 6204 | 3118 | -3675 | 1.27 | 2528 |
| signals trailing | 3705 | 85 % | 3.39 | 7000 | 3027 | -4781 | 1.26 | 2219 |
| trailing | 502 | 67 % | 1.51 | 223 | 292 | 24 | 1.38 | 247 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 8015 | 82 % | 3.13 | 14812 | 6274 | -7279 | 1.46 | 7533 |
| short | 533 | 58 % | 0.44 | -1058 | 470 | -1098 | 0.30 | -2156 |


### w6-24h

Entries window 2026-10-05T18:00:00.000Z → 2026-10-06T18:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 12428 | 75 % | 1.74 | 12763 | 8536 | -18144 | 0.86 | -5381 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 112 | 76 % | 0.97 | -1 | 2 | -1 | 0.94 | -2 |
| Short | 755 | 56 % | 0.84 | -170 | 173 | -35 | 0.82 | -205 |
| General | 424 | 37 % | 0.62 | -353 | 116 | -30 | 0.62 | -383 |
| Long | 436 | 45 % | 0.97 | -31 | 285 | -115 | 0.89 | -146 |
| Signals | 10701 | 79 % | 1.94 | 13319 | 7960 | -17964 | 0.87 | -4645 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 1072 | 49 % | 0.78 | -445 | 330 | -101 | 0.76 | -546 |
| signals fixed | 5704 | 75 % | 1.53 | 5180 | 3754 | -6438 | 0.93 | -1257 |
| signals trailing | 4997 | 83 % | 2.84 | 8139 | 4206 | -11526 | 0.81 | -3387 |
| trailing | 655 | 52 % | 0.89 | -111 | 246 | -80 | 0.85 | -190 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 11317 | 75 % | 1.90 | 13182 | 6641 | -17796 | 0.87 | -4615 |
| short | 1111 | 70 % | 0.84 | -418 | 1895 | -348 | 0.83 | -766 |


24 h pass findings, in brief: the same shape as the 6 h windows. Signals PF closed 1.56 / 2.72 / 1.94 against incl.
open 0.94 / 1.26 / 0.87, with 8,857 / 6,145 / 7,960 signal orders open at the end. 57–97 % of the open signal orders
were under water in every age bucket, and 12–24 h-old orders were the worst. General lost in all three. Axis
executed 0 in all three. Variants raising PF incl. open ≈ in all three 24 h windows: `gate:validLastN-20` (also net incl. open, and orders
+1,383 / +562 / +1,087), `type:range-off-gn` and `gate:rangeGate-n25` (also net incl. open, fewer orders), and
`type:crowd-gn-1` / `-3` and `gate:maxPositions` (PF ≈ only). On the 6 h windows `gate:validLastN-20` loses in all three.
