# Micro switch MC6 — crowd cap 6, two windows

Desk: `docs/sims/micro-2026-10-08/desks/MC6.json`, used as is. It is the V3 base (`desks/MB.json`) with ONE switch:
`wf.entryCrowd.mc` 3 → 6 (the Micro entry crowd cap). `diff MB.json MC6.json` is that one line. Signals stay on as in V3.

Run settings (both windows): 20 symbols (volatility1h rank), 24 h pre-history, 12 h simulated, `--focus all`,
balance $20, `--max-wait-min 300`, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`,
`MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`. Run one after the other, never in parallel.
Desk settings that matter here: coordinations as in `docs/positive-coordinations.md` (`wf.coord` confirm on,
`signals.accept` 1.3 / 6 trades / 48 h, `signals.sideAccept` 1.3 / 20 / 24 h, `wf.engineSideAccept` on with
`perInd: ["mc"]`, `wf.symGate` provenSide, `wf.seatPer` config, `gates.warmup` on, `gates.baseSetsMinPf` 1);
toggles normal / trailing / axis on, block / DCA off; `live.kinds` trailing; `live.excludeRanges` wide;
`grid.micro.minSlNet` 0.002; `signals.holdH` 24, `signals.normal.slOfTp` [1.5, 2, 3].

Definitions. PF closed = gross profit ÷ gross loss over the closed orders. PF incl. open = the same with each open
order's mark (`mtmR` in `raw.json` `openEnd`) added on its side, computed in r units from `raw.json`. Report PF $ /
PF unit are shown where the report states them. "net incl. open" is in r units, because the report states
per-range net in $ for closed orders only; the book's open mark in $ is stated for the whole book (see below).

## Window w-latest — 7 Oct 12:00 → 8 Oct 00:00 UTC (exit 0)

| | Micro row |
|---|---|
| (a) orders closed / PF closed | **21** (8 W / 13 L) · PF $ 0.20 · PF unit 0.11 (r 0.114) |
| (a) open at end / PF incl. open | **6** · PF incl. open r **0.106** |
| (a) net closed / net incl. open | −$0.03 (r −0.248) · r **−0.270** |
| (b) skips, per range | crowd 577 · lastN 95 · engineSide 94 · symPf 14 (total 780) |
| (c) Micro Base line | Base passed 220 / evaluated 5,900 · median PF 2.26 |
| (c) seated configs, Micro | configs 75,992 · evaluated 68,912 · passed 1,310 |
| (d) whole book | closed **2,371** + open **2,795** = 5,166 orders · PF incl. open r **0.271** (closed: r 0.426, PF unit 0.43; net closed −$1.39) |
| (e) checks | **`checks: 55/55 ok`** |

Book at end: 35 positions open, MTM −$3.77, equity $14.84 (balance $18.61).

## Window w-rally — 5 Oct 15:00 → 6 Oct 03:00 UTC (exit 1 — FAILED CHECK)

| | Micro row |
|---|---|
| (a) orders closed / PF closed | **74** (58 W / 16 L) · PF $ 0.24 · PF unit 0.96 (r 0.959) |
| (a) open at end / PF incl. open | **6** · PF incl. open r **0.793** |
| (a) net closed / net incl. open | −$0.07 (r −0.011) · r **−0.065** |
| (b) skips, per range | crowd 1,640 · engineSide 677 · lastN 146 · duplicate 118 · symPf 34 (total 2,615) |
| (c) Micro Base line | Base passed 65 / evaluated 5,900 · median PF 2.47 |
| (c) seated configs, Micro | configs 27,948 · evaluated 18,036 · passed 1,247 |
| (d) whole book | closed **3,962** + open **4,085** = 8,047 orders · PF incl. open r **1.18** (closed: r 3.76, PF unit 3.76; net closed +66.6 r, incl. open +16.5 r) |
| (e) checks | **`checks: 54/55 ok — FAILED: execution: strategy type axis executed orders`** |

The failing check is real: this window executed **zero Axis orders** (no `axis` tag in `raw.json` closed or open
records). The run exited 1 after printing the check. Per `docs/report-integrity.md` a report with a failed check is not
published, so the w-rally numbers above are reported as measured but are not a validated result until that check
passes. No code under `src/` or `scripts/` was changed (the instructions forbid it), so the cause is left for a
separate investigation. Book at end: 23 positions open, MTM −$2.76, equity $23.67 (balance $26.43).

## Reading the two windows together

Micro's closed PF is 0.11 (unit) in the latest window and 0.96 in the rally window; the rally window's Micro sample is
74 closes against 21. Including the open Micro orders moves PF incl. open to 0.106 and 0.793. Crowd is the largest
Micro skip reason in both windows (577 and 1,640). These two windows do not include a cap-3 run on the same tapes, so
they do not measure the effect of the switch; that needs the MB comparison. Both are 12 h samples.

## Files

- `w-latest/session.md`, `w-latest/writeup.md`
- `w-rally/session.md`, `w-rally/writeup.md`
HTML and `raw.json` are kept out of the commit, as instructed; `raw.json` was used for the r-unit figures above.
