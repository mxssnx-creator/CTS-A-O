# 6x6h trade simulation — windows 4–6 (V3 desk), 8 Oct

Desk `docs/sims/sigstop-2026-10-08/desks/V3.json` (signal stops 1.5 / 2 / 3× target, hold 24 h), branch
`claude/sim3h-fixes` at b34e16d, 30 symbols, 24 h pre-history, `--run 6`, balance $20, `CTS_CORE_VARIANTS=1`,
3 workers, 4 cores / 16 GB. Runs one after the other. Simulation only, no orders anywhere.

| window | `--end-at` | book window (as run) | wall time | checks | variants baseline |
|---|---|---|---:|---|---|
| w4 | 2026-10-07T06:00Z | 06 Oct 06:00 → 07 Oct 06:00 | 3,250 s (rerun: the first run died with a container restart at variant 97/108) | 54/55 ok — FAILED: execution: strategy type axis executed orders | reproduces the session run |
| w5 | 2026-10-07T00:00Z | 06 Oct 00:00 → 07 Oct 00:00 | 3,000 s | 54/55 ok — FAILED: execution: strategy type axis executed orders | reproduces the session run |
| w6 | 2026-10-06T18:00Z | 05 Oct 18:00 → 06 Oct 18:00 | 2,960 s | 54/55 ok — FAILED: execution: strategy type axis executed orders | reproduces the session run |

**Each window simulated 24 h, not 6 h.** V3.json carries `"wf": { "simH": 24 }`, and core-session spreads the desk's
`wf` after `simH: runH` (`rt.updateSettings({}, { preH, simH: runH, ...wfExtra })`), so the desk overrides `--run 6`.
The report titles still say "6 h run". So w4–w6 are three 24 h windows that overlap (w4 and w5 share 18 h, w5 and w6
share 18 h). The same command used for windows 1–3 produces the same thing. To get a true 6 h window, pass
`--wf '{"simH":6}'` (or drop `simH` from the desk). No code was changed here. The section "Last 6 h of each
window" below slices each run's entries to its final 6 h, which is the nominal window. It is a slice of the 24 h run,
not a fresh 6 h run.

Unit basis throughout: every order at one unit, net = Σ r × 100 (% of one unit), PF = gross profit ÷ gross loss.
"PF incl. open" adds the orders still open at the end, marked at the last close (`raw.openEnd[].mtmR`), to the closed
trades' r. Computed from raw.json: `analyze.ts` in the session's scratchpad, not committed.

## Summary (unit basis, full 24 h windows)

| | w4 orders | PF closed | PF incl. open | net incl. open | w5 orders | PF closed | PF incl. open | net incl. open | w6 orders | PF closed | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **total** | 19,356 (+9,659 open) | 1.34 | **0.91** | −4,372 | 8,548 (+6,744) | 2.55 | **1.27** | +5,377 | 12,428 (+8,536) | 1.74 | **0.86** | −5,381 |
| Micro | 48 | 0.29 | 0.29 | −30 | 52 | 0.67 | 0.67 | −7 | 112 (+2) | 0.97 | 0.94 | −2 |
| Short | 2,859 (+348) | 1.03 | 1.17 | +488 | 492 (+164) | 1.89 | 1.63 | +260 | 755 (+173) | 0.84 | 0.82 | −205 |
| General | 884 (+74) | 0.64 | 0.69 | −450 | 171 (+138) | 0.85 | 0.97 | −12 | 424 (+116) | 0.62 | 0.62 | −383 |
| Long | 1,224 (+380) | 0.41 | 0.49 | −1,775 | 315 (+297) | 1.59 | 1.51 | +388 | 436 (+285) | 0.97 | 0.89 | −146 |
| Wide (Axis) | 0 | – | – | 0 | 0 | – | – | 0 | 0 | – | – | 0 |
| Signals | 14,341 (+8,857) | 1.56 | 0.94 | −2,605 | 7,518 (+6,145) | 2.72 | 1.26 | +4,747 | 10,701 (+7,960) | 1.94 | 0.87 | −4,645 |
| · signals fixed | 7,452 (+4,027) | 1.19 | 0.89 | −2,551 | 3,813 (+3,118) | 2.30 | 1.27 | +2,528 | 5,704 (+3,754) | 1.53 | 0.93 | −1,257 |
| · signals trailing | 6,889 (+4,830) | 2.37 | 1.00 | −54 | 3,705 (+3,027) | 3.39 | 1.26 | +2,219 | 4,997 (+4,206) | 2.84 | 0.81 | −3,387 |
| engine normal | 2,039 (+322) | 0.65 | 0.69 | −1,281 | 528 (+307) | 1.45 | 1.43 | +383 | 1,072 (+330) | 0.78 | 0.76 | −546 |
| engine trailing | 2,976 (+480) | 0.72 | 0.87 | −486 | 502 (+292) | 1.51 | 1.38 | +247 | 655 (+246) | 0.89 | 0.85 | −190 |
| long side | 12,962 (+6,003) | 0.94 | 0.71 | −10,405 | 8,015 (+6,274) | 3.13 | 1.46 | +7,533 | 11,317 (+6,641) | 1.90 | 0.87 | −4,615 |
| short side | 6,394 (+3,656) | 2.84 | 1.43 | +6,033 | 533 (+470) | 0.44 | 0.30 | −2,156 | 1,111 (+1,895) | 0.84 | 0.83 | −766 |

As sized by the live caps ($20, 0.75× / 7×): w4 $20 → $22.13 closed, equity at end $20.08 (PF $ 1.50); w5 → $23.16 /
$20.38 (PF $ 1.69); w6 → $24.77 / $20.94 (PF $ 1.93).

## Diagnosis

1. **The open signal book eats the closed profit in every window.** Signals close at PF 1.56 / 2.72 / 1.94 but leave
   8,857 / 6,145 / 7,960 orders open at the end, marked at −15,306 / −8,456 / −17,964. That takes Signals to PF incl.
   open 0.94 / 1.26 / 0.87, and the whole book to 0.91 / 1.27 / 0.86. 57–97 % of the open signal orders are under
   water in every age bucket. The worst are 12–24 h old (w6 18–24 h: 688 orders, 97 % under water, MTM −4,938; w5
   12–24 h: 2,016 orders, 87–89 %, −4,874). The hold (24 h) equals the window, so no signal reaches its hold exit
   inside the window: losers sit between the 1.5–3× stop and the target. The closed signal stops alone cost −22,245 /
   −7,564 / −14,034 against target hits of +33,039 / +19,813 / +26,035. Trailing signals show the closed-vs-open gap
   most (w4 PF closed 2.37 → incl. open 1.00; w6 2.84 → 0.81).
2. **The losing direction flips between windows.** w4: longs PF incl. open 0.71 (Signals long −8,611) and shorts
   1.43. w5: shorts 0.30 (−2,156). w6: shorts 0.83 and longs 0.87. The signal direction acceptance acted in w5 / w6
   (sig:signalSide 13,435 / 5,637 skips) but never in w4 (0), the window whose longs lost.
3. **Engine ranges: General loses in every window**: PF closed 0.64 / 0.85 / 0.62, incl. open 0.69 / 0.97 / 0.62.
   Long loses in w4 (0.41, −1,931 closed) and w6 (0.97 closed / 0.89 incl. open). Short is the only engine range
   positive in two of three (1.17 / 1.63 / 0.82 incl. open). In w6's last 6 h, Short / General / Long all collapsed
   (WR 19 % / 4 % / 5 %, PF incl. open 0.09 / 0.05 / 0.18): every engine order in w6 was long (Range × side tables), so a downturn in the last hours hit all three.
4. **Configs that passed but barely traded or never traded.**
   - Axis: 369 / 333 / 215 Axis configs were seated, and none executed in any window. Every candidate failed lastN /
     engineSide / symPf (Wide skips 1,471 / 493 / 451). This is the one failing check in all three windows. Those
     seated Axis configs ran at PF 0.90 / 0.63 / 0.72 on their own closes, so the gates held back a losing type.
     But the check reports "axis executed orders" as failed, and `Axis off` still moves 47–148 orders (Axis candidates
     still confirm signals).
   - Micro: 1,715 / 1,120 / 563 configs seated, 36 / 38 / 62 of them traded, 48 / 52 / 112 orders. The skips were
     crowd 1,096 / 649 / 1,298 and engineSide 706 / 1,105 / 616. The seated Micro configs themselves ran at PF 0.50–0.55
     (w4), so this is also a losing range held back.
   - Base passed 1,162 / 1,229 / 1,185 pairs (Wide 310 / 318 / 285 of them, for Axis only). Engine seats: 6,796 of
     133,151 configs evaluated in w4. Distinct engine configs with an order in w4: Short 1,373, Long 726, General 478,
     Micro 36.
5. **Gates that held entries back.** For Signals (116k / 109k / 109k skips): duplicate 48,305 / 27,164 / 34,847,
   confirm 40,800 / 41,328 / 35,635, signalPf 15,088 / 17,887 / 18,389, signalCluster 12,158 / 8,750 / 14,842. For the
   engine: lastN (Short 7,113 / 2,610 / 2,410, Long 2,652 / 1,577 / 1,549, General 1,996 / 801 / 1,138), symPf and
   engineSide. Opening those gates adds orders but does not raise PF incl. open in every window:
   - confirmation off: +6,533 / +4,671 / +5,619 orders, PF ≈ 0.84 / 1.16 / 0.97;
   - signal acceptance off: +3,773 / +2,205 / +2,534 orders, PF ≈ 0.92 / 1.25 / 0.85;
   - engine direction acceptance off: +1,662 / +858 / +1,386 orders, PF ≈ 0.92 / 1.27 / 0.82.

   The positive coordinations stay on (docs/positive-coordinations.md). None of these rows beats the baseline in all
   three windows.
6. **Variant rows that beat the baseline in all three windows** (PF incl. open ≈ up in w4, w5 and w6):
   - **`gate:validLastN-20`** (seat validation last 15 → 20) is the only row that also raises orders and net incl.
     open in all three: +1,383 / +562 / +1,087 orders, PF incl. open ≈ 0.90 → 0.91 / 1.31 → 1.32 / 0.85 → 0.92, net
     incl. open −4,372 → −4,291 / +5,377 → +5,645 / −5,381 → −2,861. The w4 and w5 PF margins are within the ≈ rounding.
     Only w6 is a clear gain. It is the candidate for windows 1–3 to confirm.
   - `type:range-off-gn` (General off): PF and net incl. open up in all three, orders −884 / −171 / −424.
   - `gate:rangeGate-n25`: PF ≈ and net incl. open up in all three, by a few units (orders −5 / +2 / +106).
   - `type:crowd-gn-1` / `-3` and `gate:maxPositions` (position cap 12): PF incl. open ≈ up in all three, orders down.

   No row raises orders and PF incl. open by a clear margin in all three windows. What decides PF incl. open here is
   the open signal book, item 1, and no variant row changes signal stops or hold. That would need a desk change,
   measured as a recompute.

## w4 — full window (24 h)

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

**Per range × side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro long | 21 | 62 % | 0.27 | -14 | 0 | 0 | 0.27 | -14 |
| Micro short | 27 | 67 % | 0.30 | -16 | 0 | 0 | 0.30 | -16 |
| Short long | 2829 | 61 % | 1.01 | 23 | 343 | 413 | 1.16 | 436 |
| Short short | 30 | 100 % | ∞ | 56 | 5 | -4 | 12.83 | 52 |
| General long | 884 | 43 % | 0.64 | -513 | 70 | 71 | 0.70 | -441 |
| General short | 0 | – | – | 0 | 4 | -8 | 0.00 | -8 |
| Long long | 1224 | 36 % | 0.41 | -1931 | 380 | 155 | 0.49 | -1775 |
| Signals long | 8004 | 69 % | 1.07 | 1090 | 5210 | -9701 | 0.70 | -8611 |
| Signals short | 6337 | 85 % | 2.84 | 11610 | 3647 | -5605 | 1.43 | 6005 |

**Per range × type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro · normal | 36 | 53 % | 0.17 | -34 | 0 | 0 | 0.17 | -34 |
| Micro · trailing | 12 | 100 % | ∞ | 5 | 0 | 0 | ∞ | 5 |
| Short · normal | 828 | 61 % | 0.94 | -71 | 92 | 27 | 0.96 | -44 |
| Short · trailing | 2031 | 62 % | 1.09 | 151 | 256 | 381 | 1.32 | 532 |
| General · normal | 493 | 38 % | 0.76 | -205 | 33 | 7 | 0.77 | -198 |
| General · trailing | 391 | 49 % | 0.49 | -307 | 41 | 56 | 0.59 | -252 |
| Long · normal | 682 | 29 % | 0.45 | -1080 | 197 | 75 | 0.51 | -1004 |
| Long · trailing | 542 | 45 % | 0.36 | -851 | 183 | 80 | 0.46 | -771 |
| Signals · signals fixed | 7452 | 71 % | 1.19 | 2947 | 4027 | -5498 | 0.89 | -2551 |
| Signals · signals trailing | 6889 | 82 % | 2.37 | 9754 | 4830 | -9808 | 1.00 | -54 |


## w5 — full window (24 h)

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

**Per range × side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro long | 30 | 90 % | 1.49 | 3 | 0 | 0 | 1.49 | 3 |
| Micro short | 22 | 50 % | 0.28 | -10 | 0 | 0 | 0.28 | -10 |
| Short long | 492 | 73 % | 1.89 | 270 | 164 | -10 | 1.63 | 260 |
| General long | 171 | 47 % | 0.85 | -44 | 138 | 32 | 0.97 | -12 |
| Long long | 315 | 59 % | 1.59 | 331 | 297 | 57 | 1.51 | 388 |
| Signals long | 7007 | 85 % | 3.45 | 14252 | 5675 | -7358 | 1.46 | 6893 |
| Signals short | 511 | 58 % | 0.44 | -1048 | 470 | -1098 | 0.30 | -2146 |

**Per range × type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro · normal | 43 | 77 % | 0.62 | -7 | 0 | 0 | 0.62 | -7 |
| Micro · trailing | 9 | 56 % | 1.31 | 0 | 0 | 0 | 1.31 | 0 |
| Short · normal | 170 | 77 % | 2.20 | 142 | 54 | -17 | 1.83 | 126 |
| Short · trailing | 322 | 71 % | 1.68 | 128 | 110 | 7 | 1.51 | 134 |
| General · normal | 117 | 44 % | 0.88 | -25 | 98 | 31 | 1.02 | 6 |
| General · trailing | 54 | 56 % | 0.76 | -19 | 40 | 1 | 0.83 | -18 |
| Long · normal | 198 | 56 % | 1.56 | 218 | 155 | 40 | 1.54 | 258 |
| Long · trailing | 117 | 63 % | 1.67 | 113 | 142 | 17 | 1.46 | 130 |
| Signals · signals fixed | 3813 | 81 % | 2.30 | 6204 | 3118 | -3675 | 1.27 | 2528 |
| Signals · signals trailing | 3705 | 85 % | 3.39 | 7000 | 3027 | -4781 | 1.26 | 2219 |


## w6 — full window (24 h)

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

**Per range × side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro long | 65 | 72 % | 0.85 | -3 | 2 | -1 | 0.81 | -4 |
| Micro short | 47 | 81 % | 1.13 | 2 | 0 | 0 | 1.13 | 2 |
| Short long | 755 | 56 % | 0.84 | -170 | 173 | -35 | 0.82 | -205 |
| General long | 424 | 37 % | 0.62 | -353 | 116 | -30 | 0.62 | -383 |
| Long long | 436 | 45 % | 0.97 | -31 | 285 | -115 | 0.89 | -146 |
| Signals long | 9637 | 80 % | 2.18 | 13739 | 6065 | -17616 | 0.88 | -3877 |
| Signals short | 1064 | 69 % | 0.84 | -420 | 1895 | -348 | 0.83 | -768 |

**Per range × type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro · normal | 86 | 83 % | 0.89 | -4 | 2 | -1 | 0.86 | -4 |
| Micro · trailing | 26 | 54 % | 2.35 | 2 | 0 | 0 | 2.35 | 2 |
| Short · normal | 365 | 58 % | 0.88 | -58 | 101 | -24 | 0.85 | -82 |
| Short · trailing | 390 | 54 % | 0.79 | -112 | 72 | -11 | 0.79 | -123 |
| General · normal | 284 | 34 % | 0.55 | -295 | 64 | -18 | 0.55 | -313 |
| General · trailing | 140 | 44 % | 0.79 | -59 | 52 | -12 | 0.78 | -70 |
| Long · normal | 337 | 42 % | 0.90 | -89 | 163 | -58 | 0.85 | -147 |
| Long · trailing | 99 | 54 % | 1.33 | 57 | 122 | -57 | 1.00 | 1 |
| Signals · signals fixed | 5704 | 75 % | 1.53 | 5180 | 3754 | -6438 | 0.93 | -1257 |
| Signals · signals trailing | 4997 | 83 % | 2.84 | 8139 | 4206 | -11526 | 0.81 | -3387 |


## Last 6 h of each window (entries in the final 6 h of the run, open orders marked at the end)

### w4

window 2026-10-07T00:00:00.000Z → 2026-10-07T06:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 2902 | 72 % | 1.36 | 1489 | 5013 | -4528 | 0.74 | -3039 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 3 | 100 % | ∞ | 1 | 0 | 0 | ∞ | 1 |
| Short | 593 | 77 % | 1.52 | 226 | 185 | 95 | 1.69 | 321 |
| General | 48 | 63 % | 1.11 | 6 | 28 | 9 | 1.22 | 15 |
| Long | 123 | 33 % | 0.28 | -285 | 124 | 21 | 0.44 | -265 |
| Signals | 2135 | 74 % | 1.48 | 1541 | 4676 | -4652 | 0.70 | -3111 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 229 | 54 % | 0.66 | -150 | 150 | 41 | 0.78 | -109 |
| signals fixed | 1131 | 66 % | 0.97 | -77 | 2205 | -2122 | 0.62 | -2199 |
| signals trailing | 1004 | 82 % | 3.22 | 1618 | 2471 | -2530 | 0.81 | -912 |
| trailing | 538 | 75 % | 1.22 | 98 | 187 | 83 | 1.35 | 181 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 1988 | 64 % | 0.84 | -600 | 2643 | -1771 | 0.69 | -2372 |
| short | 914 | 90 % | 6.48 | 2089 | 2370 | -2757 | 0.83 | -667 |


### w5

window 2026-10-06T18:00:00.000Z → 2026-10-07T00:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 1327 | 85 % | 4.58 | 2470 | 3089 | -2116 | 1.09 | 354 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 19 | 58 % | 0.52 | -4 | 0 | 0 | 0.52 | -4 |
| Short | 143 | 87 % | 3.90 | 148 | 104 | -11 | 2.24 | 136 |
| General | 35 | 60 % | 1.23 | 11 | 73 | 13 | 1.32 | 23 |
| Long | 28 | 46 % | 1.18 | 10 | 90 | -11 | 0.99 | -1 |
| Signals | 1102 | 87 % | 5.35 | 2305 | 2822 | -2106 | 1.05 | 199 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 125 | 70 % | 1.71 | 90 | 141 | -12 | 1.38 | 78 |
| signals fixed | 536 | 84 % | 3.06 | 987 | 1470 | -1061 | 0.96 | -74 |
| signals trailing | 566 | 89 % | 27.60 | 1318 | 1352 | -1045 | 1.16 | 273 |
| trailing | 100 | 82 % | 3.16 | 75 | 126 | 2 | 1.74 | 77 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 1314 | 85 % | 4.63 | 2476 | 3089 | -2116 | 1.09 | 360 |
| short | 13 | 38 % | 0.20 | -6 | 0 | 0 | 0.20 | -6 |


### w6

window 2026-10-06T12:00:00.000Z → 2026-10-06T18:00:00.000Z (entries in it; unit basis: r × 100 %)

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| total | 2383 | 77 % | 2.18 | 2929 | 4215 | -4966 | 0.78 | -2037 |

**Per range**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 13 | 77 % | 8.88 | 4 | 2 | -1 | 2.88 | 3 |
| Short | 70 | 19 % | 0.12 | -158 | 80 | -68 | 0.09 | -226 |
| General | 72 | 4 % | 0.02 | -222 | 55 | -37 | 0.05 | -259 |
| Long | 61 | 5 % | 0.07 | -247 | 132 | -73 | 0.18 | -320 |
| Signals | 2167 | 83 % | 2.96 | 3553 | 3946 | -4787 | 0.85 | -1234 |

**Per type**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 168 | 13 % | 0.05 | -515 | 144 | -73 | 0.10 | -588 |
| signals fixed | 1117 | 78 % | 1.94 | 1403 | 1988 | -2061 | 0.85 | -657 |
| signals trailing | 1050 | 88 % | 7.77 | 2149 | 1958 | -2726 | 0.86 | -577 |
| trailing | 48 | 15 % | 0.18 | -108 | 125 | -106 | 0.16 | -214 |

**Per side**

| group | closed | WR | PF closed | net closed | open at end | open MTM | PF incl. open | net incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| long | 2066 | 75 % | 2.09 | 2396 | 2957 | -4860 | 0.69 | -2464 |
| short | 317 | 87 % | 2.87 | 533 | 1258 | -106 | 1.37 | 427 |


## Variants (CTS_CORE_VARIANTS=1): the session's walk-forward rerun on its own tapes, one switch at a time

Each cell: orders (Δ vs that window's baseline) · PF closed · PF incl. open ≈ · net incl. open. The variant rows
record the open orders as one net (`openNet`), so their PF incl. open is ≈: (gp + max(openNet, 0)) ÷ (gl + max(−openNet, 0)).
That nets open winners against open losers. The baselines' exact values are 0.91 / 1.27 / 0.86 against ≈ 0.90 / 1.31 / 0.85.
Net incl. open (net + openNet) is exact. Rows marked "na" / "recompute" in the report (DCA Active, Block sub-modes,
tactics) were not run and are left out.

| baseline | 19356 · 1.34 · 0.90 · -4372 | 8548 · 2.55 · 1.31 · 5377 | 12428 · 1.74 · 0.85 · -5381 | |

### Rows that raise PF incl. open in every window

| variant | w4: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w5: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w6: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | wins in all |
|---|---|---|---|---|
| Validation last 20 (`gate:validLastN-20`) | 20739 (+1383) · 1.34 · 0.91 · -4291 | 9110 (+562) · 2.53 · 1.32 · 5645 | 13515 (+1087) · 1.82 · 0.92 · -2861 | PF incl. open, net incl. open, orders |
| General off (`type:range-off-gn`) | 18472 (-884) · 1.38 · 0.91 · -3923 | 8377 (-171) · 2.61 · 1.32 · 5389 | 12004 (-424) · 1.80 · 0.85 · -4998 | PF incl. open, net incl. open, PF closed |
| Range gate last 25 (`gate:rangeGate-n25`) | 19351 (-5) · 1.34 · 0.90 · -4366 | 8550 (+2) · 2.55 · 1.31 · 5394 | 12534 (+106) · 1.75 · 0.86 · -5087 | PF incl. open, net incl. open |
| General: at most 1 per bar (`type:crowd-gn-1`) | 18559 (-797) · 1.37 · 0.91 · -3951 | 8421 (-127) · 2.59 · 1.31 · 5373 | 12074 (-354) · 1.79 · 0.85 · -5028 | PF incl. open, PF closed |
| General: at most 3 per bar (`type:crowd-gn-3`) | 18675 (-681) · 1.37 · 0.91 · -4036 | 8469 (-79) · 2.57 · 1.31 · 5359 | 12167 (-261) · 1.78 · 0.85 · -5071 | PF incl. open, PF closed |
| Position cap 12 (`gate:maxPositions`) | 16509 (-2847) · 1.47 · 0.93 · -2900 | 8042 (-506) · 2.68 · 1.33 · 5373 | 11586 (-842) · 1.86 · 0.86 · -4636 | PF incl. open, PF closed |

### Rows that raise orders AND net incl. open in every window (PF incl. open not up everywhere)

| variant | w4: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w5: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w6: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | wins in all |
|---|---|---|---|---|

### Every row

| variant | w4: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w5: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | w6: orders (Δ) · PF closed · PF incl. open ≈ · net incl. open | wins in all |
|---|---|---|---|---|
| Normal off (`type:normal`) | 1408 (-17948) · 1.00 · 0.81 · -770 | 284 (-8264) · 1.24 · 0.76 · -184 | 760 (-11668) · 2.47 · 1.76 · 953 | – |
| Trailing off (`type:trailing`) | 8759 (-10597) · 1.11 · 0.87 · -2968 | 3799 (-4749) · 2.28 · 1.34 · 2685 | 6252 (-6176) · 1.49 · 0.94 · -954 | – |
| Block on (`type:block`) | 19356 (+0) · 1.42 · 0.97 · -3554 | 8548 (+0) · 2.65 · 1.32 · 15316 | 12428 (+0) · 1.71 · 0.84 · -16333 | – |
| Block Active on (`type:blockActive`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| DCA on (`type:dca`) | 19826 (+470) · 1.29 · 0.87 · -6347 | 8923 (+375) · 2.55 · 1.30 · 5410 | 12831 (+403) · 1.74 · 0.86 · -4964 | orders |
| Axis off (`type:axis`) | 19269 (-87) · 1.35 · 0.91 · -3818 | 8501 (-47) · 2.54 · 1.31 · 5292 | 12280 (-148) · 1.71 · 0.83 · -5872 | – |
| Micro: at most 1 per bar (`type:crowd-mc-1`) | 19324 (-32) · 1.34 · 0.90 · -4353 | 8514 (-34) · 2.55 · 1.31 · 5381 | 12355 (-73) · 1.74 · 0.85 · -5379 | net incl. open, PF closed |
| Micro: at most 10 per bar (`type:crowd-mc-10`) | 19438 (+82) · 1.34 · 0.90 · -4451 | 8630 (+82) · 2.54 · 1.31 · 5362 | 12619 (+191) · 1.74 · 0.85 · -5383 | orders |
| Micro: no crowding cap (`type:crowd-mc-0`) | 19947 (+591) · 1.31 · 0.89 · -5109 | 9010 (+462) · 2.51 · 1.30 · 5307 | 13286 (+858) · 1.71 · 0.84 · -5548 | orders |
| Short: at most 1 per bar (`type:crowd-sh-1`) | 16662 (-2694) · 1.37 · 0.89 · -4866 | 8120 (-428) · 2.57 · 1.30 · 5125 | 11745 (-683) · 1.79 · 0.85 · -5192 | PF closed |
| Short: at most 3 per bar (`type:crowd-sh-3`) | 16913 (-2443) · 1.37 · 0.89 · -4849 | 8210 (-338) · 2.55 · 1.30 · 5129 | 11856 (-572) · 1.79 · 0.85 · -5205 | – |
| Short: at most 10 per bar (`type:crowd-sh-10`) | 17446 (-1910) · 1.36 · 0.89 · -4773 | 8359 (-189) · 2.54 · 1.30 · 5184 | 12106 (-322) · 1.76 · 0.85 · -5333 | – |
| General: at most 1 per bar (`type:crowd-gn-1`) | 18559 (-797) · 1.37 · 0.91 · -3951 | 8421 (-127) · 2.59 · 1.31 · 5373 | 12074 (-354) · 1.79 · 0.85 · -5028 | PF incl. open, PF closed |
| General: at most 3 per bar (`type:crowd-gn-3`) | 18675 (-681) · 1.37 · 0.91 · -4036 | 8469 (-79) · 2.57 · 1.31 · 5359 | 12167 (-261) · 1.78 · 0.85 · -5071 | PF incl. open, PF closed |
| General: at most 10 per bar (`type:crowd-gn-10`) | 18914 (-442) · 1.36 · 0.91 · -4134 | 8532 (-16) · 2.55 · 1.31 · 5331 | 12313 (-115) · 1.76 · 0.85 · -5248 | – |
| Long: at most 1 per bar (`type:crowd-lg-1`) | 18235 (-1121) · 1.44 · 0.93 · -2764 | 8268 (-280) · 2.61 · 1.30 · 5051 | 12064 (-364) · 1.78 · 0.85 · -5286 | PF closed |
| Long: at most 3 per bar (`type:crowd-lg-3`) | 18381 (-975) · 1.43 · 0.93 · -2993 | 8326 (-222) · 2.60 · 1.30 · 5135 | 12162 (-266) · 1.77 · 0.85 · -5275 | PF closed |
| Long: at most 10 per bar (`type:crowd-lg-10`) | 18677 (-679) · 1.39 · 0.92 · -3571 | 8441 (-107) · 2.59 · 1.31 · 5298 | 12342 (-86) · 1.76 · 0.85 · -5252 | PF closed |
| Signals: at most 1 per bar (`type:crowd-sig-1`) | 6023 (-13333) · 0.75 · 0.77 · -2019 | 1572 (-6976) · 1.48 · 1.35 · 675 | 2497 (-9931) · 0.90 · 0.79 · -959 | – |
| Signals: at most 3 per bar (`type:crowd-sig-3`) | 7711 (-11645) · 0.87 · 0.80 · -2461 | 2439 (-6109) · 1.69 · 1.29 · 977 | 3752 (-8676) · 1.04 · 0.83 · -1197 | – |
| Signals: at most 10 per bar (`type:crowd-sig-10`) | 12401 (-6955) · 1.08 · 0.86 · -3139 | 4796 (-3752) · 2.09 · 1.24 · 1881 | 7182 (-5246) · 1.28 · 0.88 · -1861 | – |
| Wide (incl. Axis, DCA): at most 1 per bar (`type:crowd-wide-1`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Wide (incl. Axis, DCA): at most 3 per bar (`type:crowd-wide-3`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Wide (incl. Axis, DCA): at most 10 per bar (`type:crowd-wide-10`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Axis / DCA only beside their pair's seated Normal (`type:ladder-needs-base`) | 19269 (-87) · 1.35 · 0.91 · -3818 | 8501 (-47) · 2.54 · 1.31 · 5292 | 12310 (-118) · 1.72 · 0.84 · -5781 | – |
| Micro off (`type:range-off-mc`) | 19308 (-48) · 1.34 · 0.90 · -4343 | 8496 (-52) · 2.56 · 1.31 · 5383 | 12316 (-112) · 1.74 · 0.85 · -5379 | net incl. open, PF closed |
| Minimal off (`type:range-off-mn`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Minimal plus off (`type:range-off-mp`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Short off (`type:range-off-sh`) | 16497 (-2859) · 1.37 · 0.89 · -4860 | 8056 (-492) · 2.58 · 1.30 · 5117 | 11673 (-755) · 1.80 · 0.85 · -5176 | PF closed |
| General off (`type:range-off-gn`) | 18472 (-884) · 1.38 · 0.91 · -3923 | 8377 (-171) · 2.61 · 1.32 · 5389 | 12004 (-424) · 1.80 · 0.85 · -4998 | PF incl. open, net incl. open, PF closed |
| Long off (`type:range-off-lg`) | 18132 (-1224) · 1.46 · 0.94 · -2597 | 8233 (-315) · 2.62 · 1.30 · 4988 | 11992 (-436) · 1.79 · 0.85 · -5235 | PF closed |
| Signals off (`sig:signals`) | 5015 (-14341) · 0.68 · 0.77 · -1767 | 1030 (-7518) · 1.47 · 1.54 · 629 | 1727 (-10701) · 0.82 · 0.77 · -736 | – |
| Signal confirmation off (`sig:confirm`) | 25889 (+6533) · 1.27 · 0.84 · -10244 | 13219 (+4671) · 2.01 · 1.16 · 4590 | 18047 (+5619) · 1.86 · 0.97 · -1455 | orders |
| Engine direction acceptance off (`sig:engineSide`) | 21018 (+1662) · 1.34 · 0.92 · -3874 | 9406 (+858) · 2.32 · 1.27 · 4899 | 13814 (+1386) · 1.54 · 0.82 · -7004 | orders |
| Engine direction acceptance window 3 h (`sig:engineSide-hours3`) | 17575 (-1781) · 1.42 · 0.92 · -3328 | 8365 (-183) · 2.53 · 1.30 · 5086 | 12080 (-348) · 1.72 · 0.83 · -5893 | – |
| Engine direction acceptance window 12 h (`sig:engineSide-hours12`) | 18343 (-1013) · 1.38 · 0.90 · -4182 | 8512 (-36) · 2.55 · 1.31 · 5323 | 11827 (-601) · 1.85 · 0.87 · -4561 | – |
| Engine direction acceptance window 48 h (`sig:engineSide-hours48`) | 19351 (-5) · 1.34 · 0.90 · -4578 | 8738 (+190) · 2.51 · 1.31 · 5348 | 12456 (+28) · 1.73 · 0.85 · -5506 | – |
| Engine direction acceptance PF 1.2 (`sig:engineSide-minPf1.2`) | 18562 (-794) · 1.35 · 0.89 · -4742 | 8295 (-253) · 2.55 · 1.30 · 5217 | 12120 (-308) · 1.79 · 0.86 · -4926 | PF closed |
| Engine direction acceptance PF 1.3 (`sig:engineSide-minPf1.3`) | 18382 (-974) · 1.37 · 0.90 · -4296 | 8212 (-336) · 2.58 · 1.31 · 5270 | 11906 (-522) · 1.81 · 0.86 · -4902 | PF closed |
| Engine direction acceptance 10 closes (`sig:engineSide-minTrades10`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Engine direction acceptance 60 closes (`sig:engineSide-minTrades60`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Engine direction acceptance per indication: every range (`sig:engineSidePerInd-all`) | 20070 (+714) · 1.36 · 0.92 · -3548 | 8829 (+281) · 2.50 · 1.31 · 5353 | 13032 (+604) · 1.62 · 0.82 · -6508 | orders |
| Engine direction acceptance per indication: pooled per range (`sig:engineSidePerInd-off`) | 19323 (-33) · 1.34 · 0.90 · -4346 | 8496 (-52) · 2.56 · 1.31 · 5383 | 12385 (-43) · 1.74 · 0.85 · -5383 | PF closed |
| Signal acceptance off (`sig:accept`) | 23129 (+3773) · 1.43 · 0.92 · -4597 | 10753 (+2205) · 2.12 · 1.25 · 5744 | 14962 (+2534) · 1.74 · 0.85 · -6572 | orders |
| Signal acceptance and confirmation off (`sig:accept-confirm`) | 31353 (+11997) · 1.39 · 0.89 · -8992 | 16306 (+7758) · 1.79 · 1.12 · 4342 | 22332 (+9904) · 1.94 · 1.01 · 432 | orders |
| Active signals 100 (`sig:count-100`) | 5731 (-13625) · 0.83 · 0.82 · -1551 | 2032 (-6516) · 2.13 · 2.14 · 2423 | 2417 (-10011) · 0.72 · 0.47 · -4088 | – |
| Active signals 200 (`sig:count-200`) | 6100 (-13256) · 0.91 · 0.86 · -1269 | 2815 (-5733) · 1.87 · 1.79 · 2874 | 3108 (-9320) · 0.81 · 0.49 · -5275 | – |
| Signal ranking drawdown (`sig:rank-drawdown`) | 11346 (-8010) · 0.94 · 0.68 · -8937 | 5417 (-3131) · 2.10 · 1.33 · 3382 | 8388 (-4040) · 1.75 · 0.84 · -3906 | – |
| Signal ranking lowdd (`sig:rank-lowdd`) | 10233 (-9123) · 0.93 · 0.68 · -7693 | 4804 (-3744) · 2.01 · 1.35 · 3138 | 7606 (-4822) · 1.80 · 0.87 · -2667 | – |
| Coordination off (`coord:all`) | 25889 (+6533) · 1.27 · 0.84 · -10244 | 13219 (+4671) · 2.01 · 1.16 · 4590 | 18047 (+5619) · 1.86 · 0.97 · -1455 | orders |
| Hour lock 1 % (`coord:hourLock`) | 4651 (-14705) · 1.82 · 1.11 · 1019 | 2013 (-6535) · 2.59 · 1.66 · 1994 | 2439 (-9989) · 1.75 · 0.84 · -1106 | PF closed |
| Cooldown signals (`coord:cooldown-signals`) | 14548 (-4808) · 1.20 · 0.88 · -4002 | 5689 (-2859) · 2.50 · 1.34 · 3751 | 10730 (-1698) · 1.59 · 0.83 · -5249 | – |
| Cooldown all (`coord:cooldown-all`) | 14302 (-5054) · 1.32 · 0.89 · -3577 | 5111 (-3437) · 2.59 · 1.31 · 3266 | 10155 (-2273) · 1.66 · 0.84 · -4835 | – |
| Conflict block on (`coord:conflict`) | 12460 (-6896) · 1.68 · 1.22 · 5022 | 7299 (-1249) · 2.94 · 1.35 · 5056 | 10876 (-1552) · 1.76 · 0.79 · -7119 | PF closed |
| Stable-02 windows on (`coord:s2Windows`) | 10655 (-8701) · 1.24 · 0.74 · -7877 | 5253 (-3295) · 3.14 · 1.38 · 4080 | 7453 (-4975) · 1.97 · 1.03 · 584 | – |
| Negative-hour hedge on (`coord:hedge`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Entry last-N off (`gate:lastN-0`) | 18247 (-1109) · 1.37 · 0.90 · -4179 | 8297 (-251) · 2.58 · 1.29 · 4946 | 12169 (-259) · 1.77 · 0.85 · -5237 | PF closed |
| Entry last 5 (`gate:lastN-5`) | 18899 (-457) · 1.35 · 0.90 · -4611 | 8677 (+129) · 2.47 · 1.29 · 5103 | 12448 (+20) · 1.75 · 0.85 · -5375 | – |
| Entry last 10 (`gate:lastN-10`) | 19314 (-42) · 1.34 · 0.90 · -4590 | 8811 (+263) · 2.49 · 1.31 · 5499 | 12687 (+259) · 1.72 · 0.85 · -5436 | – |
| Entry last 20 (`gate:lastN-20`) | 18764 (-592) · 1.37 · 0.91 · -3996 | 8311 (-237) · 2.56 · 1.29 · 4947 | 12237 (-191) · 1.76 · 0.85 · -5226 | PF closed |
| Entry last 25 (`gate:lastN-25`) | 18247 (-1109) · 1.37 · 0.90 · -4179 | 8297 (-251) · 2.58 · 1.29 · 4946 | 12169 (-259) · 1.77 · 0.85 · -5237 | PF closed |
| Entry last 30 (`gate:lastN-30`) | 18254 (-1102) · 1.39 · 0.91 · -3877 | 8342 (-206) · 2.57 · 1.29 · 4923 | 12145 (-283) · 1.78 · 0.85 · -5087 | PF closed |
| Entry last 35 (`gate:lastN-35`) | 18011 (-1345) · 1.41 · 0.91 · -3782 | 8325 (-223) · 2.58 · 1.28 · 4892 | 12279 (-149) · 1.76 · 0.85 · -5219 | PF closed |
| Entry last 50 (`gate:lastN-50`) | 18767 (-589) · 1.36 · 0.90 · -4568 | 8413 (-135) · 2.54 · 1.28 · 4882 | 12276 (-152) · 1.76 · 0.85 · -5284 | – |
| Entry last 75 (`gate:lastN-75`) | 19704 (+348) · 1.33 · 0.90 · -4775 | 8914 (+366) · 2.48 · 1.30 · 5377 | 12512 (+84) · 1.74 · 0.84 · -5488 | orders |
| Validation last-N off (`gate:validLastN-0`) | 23681 (+4325) · 1.25 · 0.87 · -7174 | 12237 (+3689) · 2.03 · 1.14 · 3634 | 16401 (+3973) · 1.71 · 0.91 · -3770 | orders |
| Validation last 10 (`gate:validLastN-10`) | 18474 (-882) · 1.33 · 0.89 · -4890 | 9091 (+543) · 2.29 · 1.16 · 3284 | 13123 (+695) · 1.93 · 0.93 · -2281 | – |
| Validation last 20 (`gate:validLastN-20`) | 20739 (+1383) · 1.34 · 0.91 · -4291 | 9110 (+562) · 2.53 · 1.32 · 5645 | 13515 (+1087) · 1.82 · 0.92 · -2861 | PF incl. open, net incl. open, orders |
| Validation last 25 (`gate:validLastN-25`) | 20881 (+1525) · 1.30 · 0.88 · -5839 | 9807 (+1259) · 2.35 · 1.24 · 4756 | 13723 (+1295) · 1.80 · 0.92 · -3042 | orders |
| Validation last 35 (`gate:validLastN-35`) | 19500 (+144) · 1.15 · 0.77 · -11573 | 10261 (+1713) · 1.96 · 1.13 · 2760 | 13854 (+1426) · 1.82 · 0.91 · -3372 | orders |
| Validation last 50 (`gate:validLastN-50`) | 19627 (+271) · 1.17 · 0.78 · -11207 | 9445 (+897) · 1.92 · 1.00 · -98 | 13834 (+1406) · 1.77 · 0.90 · -3743 | orders |
| Validation last 75 (`gate:validLastN-75`) | 19079 (-277) · 1.22 · 0.81 · -9071 | 10234 (+1686) · 2.33 · 1.18 · 3716 | 14149 (+1721) · 1.74 · 0.90 · -3900 | – |
| Validation last 100 (`gate:validLastN-100`) | 20513 (+1157) · 1.27 · 0.86 · -6777 | 11090 (+2542) · 2.15 · 1.15 · 3519 | 14007 (+1579) · 1.78 · 0.90 · -3688 | orders |
| Signals last 5 (`gate:signalLastN-5`) | 9251 (-10105) · 1.02 · 0.77 · -4483 | 3613 (-4935) · 2.58 · 1.32 · 2047 | 5592 (-6836) · 1.75 · 0.87 · -1841 | – |
| Signals last 10 (`gate:signalLastN-10`) | 7683 (-11673) · 0.92 · 0.73 · -4157 | 2796 (-5752) · 2.62 · 1.46 · 2046 | 4526 (-7902) · 1.53 · 0.83 · -1904 | – |
| Signals last 15 (`gate:signalLastN-15`) | 7161 (-12195) · 0.91 · 0.74 · -3616 | 2521 (-6027) · 2.56 · 1.53 · 2028 | 4245 (-8183) · 1.55 · 0.89 · -1146 | – |
| Signals last 25 (`gate:signalLastN-25`) | 6910 (-12446) · 0.90 · 0.74 · -3383 | 2288 (-6260) · 2.48 · 1.53 · 1783 | 3951 (-8477) · 1.52 · 0.88 · -1087 | – |
| Symbol gate veto (`gate:symGate-veto`) | 18931 (-425) · 1.36 · 0.90 · -4225 | 8499 (-49) · 2.55 · 1.32 · 5399 | 12406 (-22) · 1.74 · 0.85 · -5411 | – |
| Symbol gate proven (`gate:symGate-proven`) | 18597 (-759) · 1.36 · 0.90 · -4208 | 8441 (-107) · 2.55 · 1.31 · 5290 | 12365 (-63) · 1.74 · 0.85 · -5361 | – |
| Symbol gate off (`gate:symGate-off`) | 20726 (+1370) · 1.29 · 0.89 · -5242 | 8875 (+327) · 2.50 · 1.31 · 5511 | 13004 (+576) · 1.72 · 0.86 · -5192 | orders |
| Sample warm-up off (strict) (`gate:warmup`) | 16287 (-3069) · 1.42 · 0.92 · -3240 | 7795 (-753) · 2.51 · 1.24 · 4147 | 11357 (-1071) · 1.84 · 0.85 · -5119 | – |
| Last-N floor off (`gate:lastNFloor-0`) | 17572 (-1784) · 1.36 · 0.90 · -4086 | 7859 (-689) · 2.50 · 1.27 · 4481 | 11340 (-1088) · 1.75 · 0.82 · -6233 | – |
| Last-N floor 3 (`gate:lastNFloor-3`) | 19486 (+130) · 1.35 · 0.91 · -4071 | 8563 (+15) · 2.55 · 1.31 · 5420 | 12456 (+28) · 1.73 · 0.85 · -5461 | orders |
| Last-N floor 8 (`gate:lastNFloor-8`) | 19093 (-263) · 1.35 · 0.90 · -4296 | 8358 (-190) · 2.56 · 1.30 · 5166 | 12178 (-250) · 1.77 · 0.85 · -5254 | PF closed |
| Last-N floor 10 (`gate:lastNFloor-10`) | 18791 (-565) · 1.35 · 0.90 · -4222 | 8295 (-253) · 2.55 · 1.30 · 5089 | 12027 (-401) · 1.79 · 0.85 · -5199 | PF closed |
| Last-N floor 15 (`gate:lastNFloor-15`) | 17951 (-1405) · 1.37 · 0.91 · -3688 | 7994 (-554) · 2.52 · 1.28 · 4700 | 11751 (-677) · 1.76 · 0.83 · -5762 | – |
| Last-N floor 25 (`gate:lastNFloor-25`) | 17935 (-1421) · 1.37 · 0.91 · -3732 | 7964 (-584) · 2.52 · 1.28 · 4673 | 11644 (-784) · 1.75 · 0.82 · -6060 | – |
| Range gate off (`gate:rangeGate-off`) | 19398 (+42) · 1.34 · 0.90 · -4390 | 8555 (+7) · 2.55 · 1.31 · 5360 | 12542 (+114) · 1.75 · 0.86 · -5085 | orders |
| Range gate last 15 (`gate:rangeGate-n15`) | 19398 (+42) · 1.34 · 0.90 · -4390 | 8555 (+7) · 2.55 · 1.31 · 5360 | 12542 (+114) · 1.75 · 0.86 · -5085 | orders |
| Range gate last 25 (`gate:rangeGate-n25`) | 19351 (-5) · 1.34 · 0.90 · -4366 | 8550 (+2) · 2.55 · 1.31 · 5394 | 12534 (+106) · 1.75 · 0.86 · -5087 | PF incl. open, net incl. open |
| Range gate last 35 (`gate:rangeGate-n35`) | 19353 (-3) · 1.34 · 0.90 · -4364 | 8468 (-80) · 2.51 · 1.29 · 5030 | 12436 (+8) · 1.74 · 0.85 · -5372 | – |
| Range gate last 50 (`gate:rangeGate-n50`) | 19317 (-39) · 1.34 · 0.90 · -4462 | 8549 (+1) · 2.55 · 1.31 · 5367 | 12428 (+0) · 1.74 · 0.85 · -5364 | – |
| Range gate last 100 (`gate:rangeGate-n100`) | 19370 (+14) · 1.34 · 0.90 · -4386 | 8548 (+0) · 2.55 · 1.31 · 5373 | 12516 (+88) · 1.76 · 0.86 · -5092 | – |
| Range gate PF 1.20 (`gate:rangeGate-pf1.2`) | 19263 (-93) · 1.34 · 0.90 · -4468 | 8438 (-110) · 2.51 · 1.29 · 5007 | 12381 (-47) · 1.74 · 0.85 · -5375 | – |
| Range gate PF 1.35 (`gate:rangeGate-pf1.35`) | 18997 (-359) · 1.35 · 0.91 · -4039 | 8401 (-147) · 2.52 · 1.29 · 5031 | 12287 (-141) · 1.75 · 0.85 · -5365 | – |
| Range gate on its full last N (`gate:rangeGate-strict`) | 18470 (-886) · 1.34 · 0.89 · -4690 | 8022 (-526) · 2.49 · 1.27 · 4613 | 11757 (-671) · 1.75 · 0.84 · -5692 | – |
| Range gate on General and Long too (`gate:rangeGate-allRanges`) | 19229 (-127) · 1.34 · 0.90 · -4580 | 8446 (-102) · 2.52 · 1.29 · 5054 | 12057 (-371) · 1.89 · 0.92 · -2592 | – |
| Loss prior on (`gate:lossPrior`) | 19265 (-91) · 1.34 · 0.90 · -4388 | 8450 (-98) · 2.56 · 1.31 · 5337 | 12352 (-76) · 1.75 · 0.85 · -5318 | – |
| Loss prior on, range gate on its full last N (`gate:lossPrior-strictRange`) | 18417 (-939) · 1.35 · 0.89 · -4670 | 8005 (-543) · 2.50 · 1.27 · 4617 | 11729 (-699) · 1.75 · 0.84 · -5682 | – |
| Symbol gate closes 1 (`gate:symMinN-1`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Symbol gate closes 5 (`gate:symMinN-5`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Symbol gate closes 10 (`gate:symMinN-10`) | 19356 (+0) · 1.34 · 0.90 · -4372 | 8548 (+0) · 2.55 · 1.31 · 5377 | 12428 (+0) · 1.74 · 0.85 · -5381 | – | no effect
| Green-hour gate off (`gate:minGreen-0`) | 19637 (+281) · 1.33 · 0.89 · -4938 | 8655 (+107) · 2.54 · 1.31 · 5382 | 12860 (+432) · 1.72 · 0.85 · -5382 | orders |
| Green hours ≥ 40 % (`gate:minGreen-0.4`) | 19637 (+281) · 1.33 · 0.89 · -4938 | 8655 (+107) · 2.54 · 1.31 · 5382 | 12860 (+432) · 1.72 · 0.85 · -5382 | orders |
| Green hours ≥ 60 % (`gate:minGreen-0.6`) | 16048 (-3308) · 1.31 · 0.84 · -6398 | 6512 (-2036) · 2.71 · 1.24 · 3273 | 9517 (-2911) · 1.75 · 0.80 · -5890 | – |
| Direction gate 10 (`gate:sideGateN`) | 18272 (-1084) · 1.39 · 0.91 · -3884 | 8127 (-421) · 2.67 · 1.31 · 5207 | 11978 (-450) · 1.80 · 0.86 · -4883 | PF closed |
| Position cap 12 (`gate:maxPositions`) | 16509 (-2847) · 1.47 · 0.93 · -2900 | 8042 (-506) · 2.68 · 1.33 · 5373 | 11586 (-842) · 1.86 · 0.86 · -4636 | PF incl. open, PF closed |
