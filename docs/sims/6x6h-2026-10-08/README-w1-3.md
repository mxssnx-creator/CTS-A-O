# 6 × 6 h trade simulation, windows 1–3: the V3 desk (8 Oct)

Operator, 8 Oct: "run 6x6h trade sim until all and everything is completely working.. high amount of orders and high
PF". Desk: the live desks' current settings, V3 (`docs/sims/sigstop-2026-10-08/desks/V3.json`: signal stops
1.5 / 2 / 3× the target, trailing signals 3×, hold 24 h). This file covers windows 1–3; windows 4–6 are run by another
session. Simulation only: no exchange, no keys, no orders.

Command per window (sequential, 3 workers, 4 cores / 16 GB):

```
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=3 \
node --max-old-space-size=8192 --expose-gc --experimental-strip-types --no-warnings scripts/core-session.mjs \
  --symbols 30 --pre 24 --run 6 --focus all --desk docs/sims/sigstop-2026-10-08/desks/V3.json --balance 20 \
  --max-wait-min 240 --wf '{"simH":6}' --end-at <END> ...
```

**`--wf '{"simH":6}'` is needed.** V3.json carries `wf.preH 24 / wf.simH 24`. core-session spreads the desk's `wf`
after `simH: runH`, so the desk silently overrides `--run 6`. The log header still prints "6h simulated", but the
run is 24 h. The first w1 run went that way: 7 Oct 00:00 → 8 Oct 00:00, 57 min; it is kept as `w1-24h/`. Any
desk-file run whose `--run N` differs from the desk's `simH` needs the flag. Without it, three "6 h" windows
ending 6 h apart are three overlapping 24 h windows.

| window | run (UTC) | wall time | checks |
|---|---|---:|---|
| w1 | 7 Oct 18:00 → 8 Oct 00:00 | 25.8 min | **54/55** — FAILED: strategy type axis executed orders |
| w2 | 7 Oct 12:00 → 18:00 | 25.2 min | **54/55** — FAILED: strategy type axis executed orders |
| w3 | 7 Oct 06:00 → 12:00 | 25.4 min | **52/55** — FAILED: axis executed orders; range sh executed orders; range lg executed orders |
| w1-24h (reference) | 7 Oct 00:00 → 8 Oct 00:00 | 57.4 min | 55/55 |

The variants baseline "reproduces the session run" in every window. No window passed every check, so no report is
published as an Artifact (docs/report-integrity.md). w1's HTML is in `w1/html/`.

All numbers below are in trade units: every order at one unit, net = Σ r in %. They come from `raw.json`: the
closed trades, plus the orders still open at the end marked at the last close (`openEnd[].mtmR`, exact: executed
through every gate and cap). **PF incl. open** = (gross profit of the closed trades + the open orders' positive
marks) ÷ (gross loss of the closed trades + the open orders' negative marks). The full tables, per range × type, are
in `wN/tables.md`.

## Result per window

| window | closed orders | PF closed | net closed % | open at end | PF incl. open | net incl. open % | $ book (20 → balance · equity) |
|---|---:|---:|---:|---:|---:|---:|---|
| w1 18–24 h | 943 | 0.40 | −1,225 | 3,662 | **0.17** | −6,517 | $19.74 · $16.91 |
| w2 12–18 h | 843 | 0.82 | −303 | 2,365 | **0.44** | −2,853 | $20.77 · $17.54 |
| w3 06–12 h | 918 | 3.93 | +1,669 | 2,347 | **1.74** | +1,843 | $20.95 · $20.55 |
| 3 windows | 2,704 | — | +141 | 8,374 | — | −7,527 | |
| w1-24h (00–24 h) | 11,372 | 0.59 | −10,859 | 8,381 | 0.34 | −32,741 | $19.05 · $15.74 |

### Per range (closed · PF closed · open at end · PF incl. open · net incl. open %)

| range | w1 | w2 | w3 |
|---|---|---|---|
| Micro | 12 · 0.31 · 0 · 0.31 · −5 | 6 · ∞ · 0 · ∞ · +2 | 24 · 0.29 · 0 · 0.29 · −12 |
| Short | 509 · 0.20 · 581 · 0.15 · −1,686 | 165 · 1.88 · 325 · 1.18 · +55 | 0 (check failed) |
| General | 44 · 0.13 · 61 · 0.24 · −104 | 27 · 0.63 · 274 · 1.09 · +15 | 34 · 13.28 · 9 · 10.75 · +99 |
| Long | 17 · 0.01 · 109 · 0.13 · −143 | 19 · 1.42 · 275 · 1.03 · +6 | 0 (check failed) |
| Wide (Axis) | 0 (check failed) | 0 (check failed) | 0 (check failed) |
| **Signals** | 361 · 0.83 · 2,911 · 0.17 · −4,578 | 626 · 0.72 · 1,491 · 0.34 · −2,931 | 860 · 3.91 · 2,338 · 1.72 · +1,756 |

### Per type

| type | w1 | w2 | w3 |
|---|---|---|---|
| normal | 194 · 0.15 · 299 · 0.15 · −742 | 109 · 1.27 · 473 · 1.21 · +76 | 42 · 5.06 · 4 · 4.86 · +61 |
| trailing | 388 · 0.21 · 452 · 0.16 · −1,196 | 108 · 1.95 · 401 · 1.01 · +2 | 16 · 3.70 · 5 · 3.40 · +26 |
| axis | 0 | 0 | 0 |
| signals normal (fixed) | 206 · 0.45 · 1,390 · 0.17 · −2,282 | 336 · 0.54 · 696 · 0.33 · −1,560 | 453 · 2.73 · 1,147 · 1.72 · +883 |
| signals trailing | 155 · 4.33 · 1,521 · 0.17 · −2,296 | 290 · 1.21 · 795 · 0.35 · −1,371 | 407 · 8.09 · 1,191 · 1.71 · +873 |

### Per side

| side | w1 | w2 | w3 |
|---|---|---|---|
| long | 64 · 0.83 · 1,314 · 0.24 · −998 | 242 · 1.77 · 615 · 0.79 · −207 | 113 · 0.04 · 308 · **0.01** · −2,191 |
| short | 879 · 0.38 · 2,348 · 0.15 · −5,518 | 601 · 0.63 · 1,750 · 0.35 · −2,646 | 805 · 121.7 · 2,039 · **16.19** · +4,033 |
| of which signals long | 61 · 0.83 · 1,314 · 0.24 · −998 | 236 · 1.77 · 615 · 0.79 · −208 | 95 · 0.04 · 308 · 0.01 · −2,178 |
| of which signals short | 300 · 0.82 · 1,597 · 0.15 · −3,580 | 390 · 0.47 · 876 · 0.20 · −2,723 | 765 · 206 · 2,030 · 16.40 · +3,933 |

## Diagnosis

1. **The open book decides each window, and it is the signals' open book.** Signals hold 63–99 % of the orders
   open at the end: 2,911 / 1,491 / 2,338 against 361 / 626 / 860 closed. Median age at the end is 2.0–2.5 h. A
   24 h hold cannot resolve in a 6 h window. The open orders mark at PF 0.08 / 0.14 / 1.09. Closed signal results
   are not the result: w1 signals trailing closes at **PF 4.33** (WR 89 %) and ends at **PF 0.17** with the 1,521
   open ones.
2. **Signal stop-outs cost two to four target hits.** Signal targets close at +2.9 to +3.9 % per order. Signal
   normal stop-outs close at −5.5 / −7.2 / −6.0 %, signal trailing stop-outs at −9.2 / −13.7 / −10.0 %. That book
   needs a WR above ~70 % (normal) and ~80 % (trailing) to break even. It reached that only in w3 (normal 84 %,
   trailing 92 %); in w1 / w2 signal normal won 46 % / 56 %. By the desk's stop ratio, PF incl. open per signal
   normal ladder is 1.5×: 0.17 / 0.39 / 1.93; 2×: 0.16 / 0.34 / 1.69; 3×: 0.17 / 0.26 / 1.57. The tighter 1.5×
   stop is the best or equal normal cell in every window, and 3× is the worst normal cell in w2 and w3.
3. **One side carries each window, and it switches.** The side acceptance does not catch the switch inside 6 h.
   w3: shorts PF incl. open 16.2 (+4,033 %), longs 0.01 (−2,191 %: 308 open longs, every one under water). w2:
   longs 0.79 against shorts 0.35. w1: both lose (0.24 / 0.15). The 24 h reference: shorts 7,305 open at PF 0.08.
4. **The engine ranges lose with the market, not by construction.** In w2 Short / General / Long end at PF incl.
   open 1.18 / 1.09 / 1.03, and in w3 General ends at 10.75. In w1 Short (509 orders, PF 0.20) and Long (17
   orders, PF 0.01) lose most of the engine's −1,938 %. Micro loses in w1 and w3 (PF 0.31 / 0.29 on 12 / 24
   orders).
5. **Axis never traded (the failed check in every window).** It passed seat evaluation (320 / 312 / 259 configs).
   Its candidates were held back by `engineSide` (214 / 241 / 78), `symPf` (185 / 67 / 9) and `lastN`
   (135 / 219 / 29). In w3 no Short or Long order executed. Short's 1,783 candidates were skipped (lastN 1,026,
   engineSide 540, symPf 217), and so were Long's 1,257 (lastN 779, engineSide 411, symPf 67).
6. **Gates that hold entries back** (first gate failed, per window):
   - Signals 19,921 / 36,448 / 34,645. `sig:confirm` is the largest every time: 10,173 / 16,006 / 16,618. Then
     `signalPf` 4,556 / 5,496 / 5,004, `signalCluster` 1,080 / 6,832 / 5,178, and duplicate.
   - Engine: `lastN` first in every range but Micro (Short 3,118 / 3,901 / 1,026). Micro's first gate is `crowd`
     in w3 (1,722) and `engineSide` in w2 (1,018).
7. **Configs that passed Base / seat evaluation but never traded.** Seat evaluation passed Micro 2,151 / 4,177 /
   1,918, Short 4,218 / 2,941 / 1,892, General 1,032 / 827 / 617, Long 1,355 / 973 / 1,046 and Wide 320 / 312 /
   259 configs. Distinct configs that traded (closed or open):
   - Micro: 9 / 6 / 18
   - Short: 530 / 297 / 0
   - General: 81 / 154 / 22
   - Long: 103 / 167 / 0
   - Wide: 0 / 0 / 0
   - Signals: 1,846 / 1,528 / 1,968 of 3,342 / 3,342 / 3,430 active units

   Between 81 % and 100 % of the passed engine configs never took an order in the window. Base also evaluated
   77–85 engine indications that built no set.

## Variants (CTS_CORE_VARIANTS=1: one switch flipped on the same tapes)

The variant rows carry the open orders' net (`openNet`) but not its gross split. So PF incl. open for a variant is
approximated as (gp + max(openNet, 0)) ÷ (gl + max(−openNet, 0)), and **net incl. open** (net + openNet) is exact. The
full ranked tables are in `wN/tables.md`.

**No variant row raises both PF incl. open and orders in all three windows by a real margin.** On the
approximation, five rows pass in all three: `gate:minGreen-0`, `gate:minGreen-0.4`, `gate:rangeGate-off`,
`gate:rangeGate-n15` and `sig:accept`. Each passes by ≤ 0.01 PF, and the first four add 2–24 orders. Exact net incl.
open, against the baseline per window:

| variant | w1 orders · net incl. open | w2 | w3 |
|---|---|---|---|
| baseline | 943 · −6,517 | 843 · −2,853 | 918 · +1,843 |
| `sig:accept` (signal acceptance off) | 1,153 · −8,746 | 1,105 · −3,273 | 1,810 · +5,780 |
| `sig:engineSide` (engine direction acceptance off) | 1,208 · −6,442 | 1,463 · −1,877 | 1,517 · +478 |
| `sig:accept-confirm` (acceptance + confirmation off) | 2,044 · −11,515 | 2,676 · −9,660 | 3,326 · +4,867 |
| `gate:validLastN-50` | 1,160 · −6,470 | 1,080 · −2,277 | 875 · +650 |
| `gate:minGreen-0` (green-hour gate off) | 957 · −6,562 | 865 · −2,878 | 942 · +1,880 |
| `gate:rangeGate-off` | 963 · −6,557 | 845 · −2,850 | 919 · +1,853 |
| `gate:lossPrior` (loss prior on) | 918 · −6,412 | 824 · −2,740 | 909 · +1,858 |
| `coord:s2Windows` (Stable-02 windows on) | 554 · −4,769 | 478 · −1,935 | 838 · +1,855 |

- Signal acceptance off has more orders and a higher closed PF in all three windows (0.49 / 1.08 / 7.64 against
  0.40 / 0.82 / 3.93). It loses net incl. open in w1 and w2 (−2,230 / −420), so it does not beat the coordination
  (docs/positive-coordinations.md keeps it on).
- Engine direction acceptance off doubles orders in w2 / w3. It wins w1 / w2 but costs −1,365 in w3.
- Rows that raise net incl. open in all three windows only by trading less: `coord:s2Windows`, `gate:lossPrior`,
  `gate:rangeGate-n25` and `gate:rangeGate-n100`.
- Tactic rows are `recompute` (not run). DCA Active and the Block rows are n/a with Block off.

## What to fix next (not changed here: no code or desk change in this session)

- The signal geometry, not a gate. The stop-out costs 2–4 target hits, and losers sit open for up to 24 h while
  winners close at the target. The V3 measurement compares hold and stop ratios; within V3 the 1.5× normal stop is
  the best or equal normal cell in every window, and 3× is the worst normal cell in w2 and w3. A run with signals trailing at
  2× and hold ≤ 6 h is the comparison to make.
- Axis cannot trade under `engineSide` + `symPf` + `lastN` in these windows. The execution check fails on it every
  time. Either Axis gets its own direction record or it is turned off on this desk, decided by a comparison
  (`type:axis` off changes almost nothing here: w1 942 orders against 943).
- A desk with `wf.simH` should not override an explicit `--run` (or the log should print the effective `simH`). That
  is a code change for another session.
