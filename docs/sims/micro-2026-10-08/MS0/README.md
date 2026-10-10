# MS0 — Micro switch: engine direction acceptance without the Micro split

Desk: `docs/sims/micro-2026-10-08/desks/MS0.json`, used as is. It is the V3 base (`desks/MB.json`) with ONE switch:
`wf.engineSideAccept.perInd` `["mc"]` → `[]` (the engine direction acceptance no longer splits Micro per indication).
Everything else is V3, including the signal settings. Settings: enabled, minPf 1.05, hours 24, minTrades 30.

Run: `scripts/core-session.mjs --symbols 20 --pre 24 --run 12 --focus all --balance 20 --max-wait-min 300`,
`CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`, `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`.
The two windows ran one after the other (`w-latest`, then `w-rally`), in one detached job.

Basis of the numbers below: `raw.json` of each window. Micro = the `mc-` indications whose price target is at or below
0.6 % (reproduces the report's Micro row: 28 closes, 22 wins, PF unit 0.64). R = the engine's unit result per order.
PF incl. open = Σ positive R ÷ |Σ negative R| over the closed orders plus the open orders' marked-to-market R.

## Window `w-latest` — 7 Oct 12:00 → 8 Oct 00:00 UTC

| (a) Micro | orders closed | PF closed (R) | open at end | PF incl. open (R) | net closed (R) | net incl. open (R) | report sized PF $ / net $ |
|---|---:|---:|---:|---:|---:|---:|---|
| Micro | 28 (22 wins) | 0.637 | 0 | 0.637 | −0.048 | −0.048 | 0.40 / −$0.03 |

(b) Why Micro candidates did not execute: **engineSide 609 · lastN 105 · crowd 59 · symPf 6** (779 skipped in total).

(c) Micro Base: evaluated 5,900 pairs, passed 220, median Base PF 2.26. Seated Micro configs: normal 839 (143 positive,
470 closes, PF 0.16), trailing 471 (39 positive, 491 closes, PF 0.08); together 1,310 (182 positive, 961 closes, PF 0.12).

(d) Whole book: 2,378 closed + 2,791 open = **5,169 orders**; PF closed 0.427, **PF incl. open 0.271**; net incl. open −89.19 R.
Report: balance $20.00 → $18.64 closed; equity at end $14.88 (MTM −$3.76).

(e) Checks: **`checks: 55/55 ok`**.

## Window `w-rally` — 5 Oct 15:00 → 6 Oct 03:00 UTC

| (a) Micro | orders closed | PF closed (R) | open at end | PF incl. open (R) | net closed (R) | net incl. open (R) | report sized PF $ / net $ |
|---|---:|---:|---:|---:|---:|---:|---|
| Micro | 0 | – (no order) | 0 | – | 0 | 0 | – / $0.00 |

(b) Why Micro candidates did not execute: **engineSide 1,959 · lastN 670 · symPf 66** (2,695 skipped in total).

(c) Micro Base: evaluated 5,900 pairs, passed 65, median Base PF 2.47 (traded PF unit: none). Seated Micro configs:
normal 649 (280 positive, 1,121 closes, PF 0.91), trailing 598 (458 positive, 1,730 closes, PF 1.82); together 1,247
(738 positive, 2,851 closes, PF 1.26). These are the seated configs' own closes in the run, not executed orders: no Micro
order executed in this window.

(d) Whole book: 3,888 closed + 4,079 open = **7,967 orders**; PF closed 3.795, **PF incl. open 1.184**; net incl. open
+16.61 R. Report: balance $20.00 → $26.52 closed; equity at end $23.74 (MTM −$2.77).

(e) Checks: **`checks: 53/55 ok — FAILED: execution: strategy type axis executed orders; execution: range mc executed orders`**.
The run's process exited with status 1 on these two failed checks. The report is not clean under `docs/report-integrity.md`
(its checks must read N/N ok before publishing); the numbers are reported as the run wrote them.

## Reading the two windows

- Micro traded 28 orders in `w-latest` (PF 0.64 unit, net ≈ 0) and none in `w-rally`. In `w-rally` the engine rejected
  2,695 Micro candidates, 1,959 of them on engineSide: this is the switch's effect, and the check that flags Micro
  executing nothing is the failed one above.
- Whole book: `w-latest` PF incl. open 0.271 (net −89 R), `w-rally` PF incl. open 1.184 (net +17 R). The windows are
  opposite in direction, so one pair says little about the switch on its own.

## Files

- `w-latest/session.md`, `w-latest/writeup.md`; `w-rally/session.md`, `w-rally/writeup.md`
  (html, raw.json and the rest stay in `runs/`, git-ignored).

## Branch note

The checked-out local branch `claude/sim3h-fixes` (59b9c97) has 12 commits not on origin, and origin is at 5fe8219.
The runs and this commit are based on origin's tip 5fe8219, which contains the MS0 desk. The local-only commits are
not pushed by this change.
