# Micro switch MY0 — symbol gate off, two windows

Desk: `desks/MY0.json`, used as is. It is the V3 base (MB) with one switch: `wf.symGate` `"off"` (MB: `"provenSide"`).
Signals stay on as in V3. Run: `scripts/core-session.mjs`, 20 symbols, 24 h pre, 12 h run, focus all, balance $20,
`CTS_CORE_WORKERS=3`, `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`, one window after the other.

Open-at-end and PF incl. open are computed from `raw.json` (r units: the closed `r` plus each open order's mark `mtmR`).
PF closed is shown as the report's dollar PF and, in brackets, the r-basis PF. Net is the report's dollars, with the r sum in brackets.

## Window w-latest — 7 Oct 12:00 → 8 Oct 00:00 UTC

Checks: **55/55 ok** (published: `w-latest/session.md`, `w-latest/writeup.md`).

**(a) Micro row**

| orders closed | PF closed | open at end | PF incl. open | net closed | net incl. open |
|---:|---:|---:|---:|---:|---:|
| 12 | 0.42 ($) [0.13 r] | 3 | 0.12 [r] | −$0.01 [−0.132 r] | −0.143 r |

**(b) Why candidates did not execute, Micro:** crowd 589 · engineSide 108 · lastN 95 (792 skipped in total).

**(c) Micro Base and seats:** Base passed 220 / 5900 pairs, median PF 2.26. Seated: normal 839, trailing 471, active 1310.

**(d) Whole book:** 3802 orders closed, 3475 open; PF incl. open 0.29 [r] (PF closed $ 0.90; unit 0.42).

**(e) Checks:** 55/55 ok.

## Window w-rally — 5 Oct 15:00 → 6 Oct 03:00 UTC

Checks: **54/55 — FAILED: "execution: strategy type axis executed orders"**. Under CLAUDE.md
(`docs/report-integrity.md`) this report is not published: the session and writeup files are withheld from the commit.
Axis was enabled and seated (Wide Axis 306 configs), but no Axis order executed; the Wide range traded 0 orders.
The figures below are the run's own output, recorded for the record, not a published result.

**(a) Micro row**

| orders closed | PF closed | open at end | PF incl. open | net closed | net incl. open |
|---:|---:|---:|---:|---:|---:|
| 42 | 0.22 ($) [0.83 r] | 3 | 0.72 [r] | −$0.04 [−0.028 r] | −0.055 r |

**(b) Why candidates did not execute, Micro:** crowd 1790 · engineSide 681 · lastN 96 · duplicate 83 (2650 skipped in total).

**(c) Micro Base and seats:** Base passed 65 / 5900 pairs, median PF 2.47. Seated: normal 649, trailing 598, active 1247.

**(d) Whole book:** 4173 orders closed, 4177 open; PF incl. open 1.16 [r] (PF closed $ 4.13; unit 3.47).

**(e) Checks:** 54/55, failed "execution: strategy type axis executed orders".
