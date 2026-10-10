# Micro switch study — MB (V3 base), two windows

Desk: `docs/sims/micro-2026-10-08/desks/MB.json`, used as is (the V3 desk, no switch changed; the BASE of the Micro
switch study). Branch `claude/sim3h-fixes` (29b4c92 or later). Each window ran alone, one after the other, with
`CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`, `--symbols 20 --pre 24 --run 12 --focus all --balance 20
--max-wait-min 300`, `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`.

## Desk settings (as in MB.json)

| Setting | Value |
|---|---|
| Symbols | 20 (`symbolRank volatility1h`, offset 0) |
| History / run | 24 h pre-historic + 12 h simulated (`wf.preH 24`, `wf.simH 12`) |
| Strategy toggles | normal on, trailing on, axis on; block off, blockActive off, dca off, dcaActive off |
| Signals | on as in V3: `wf.coord` confirm on, `hourLock 0`, `cooldown off`, `conflict false`; `symGate provenSide`; `seatPer config` |
| Engine direction acceptance | on: `minPf 1.05`, `hours 24`, `minTrades 30`, `perInd ["mc"]` |
| Gates | `lastN 15`, `validLastN 15`, `normalBaseMinPf 1.05`, `entryCrowd { mc: 3 }`, `maxPositions 0`, `maxOpen 0` |
| Live (simulated book) | `notionalUsd 1`, `ratio 1`, `maxPositionX 0`, `maxExposureX 0`, `maxRiskPct 0`, `maxBackstopLossPct 0`, `maxNotionalUsd 0`, `kinds ["trailing"]`, `source "signals"`, `excludeRanges ["wide"]`, `liveLastN 25`, `requireReady false` |
| Sizing | book balance 20, `equityPct 0.02` per order unit, leverage 10× |

## Window w-latest — 7 Oct 12:00 → 8 Oct 00:00 UTC

Files: `w-latest/session.md`, `w-latest/writeup.md`. Log: `checks: 55/55 ok`.

| | Micro |
|---|---|
| (a) orders closed | 12 (5 wins / 7 losses) |
| (a) PF closed | 0.13 (on r) |
| (a) open at end | 3 |
| (a) PF incl. open | 0.12 |
| (a) net closed | −13.21 % (Σr, % of one unit) |
| (a) net incl. open | −14.32 % (open mark −1.10 %) |
| (b) Why candidates did not execute, Micro | 792 skipped: crowd 589 · lastN 95 · engineSide 94 · symPf 14 |
| (c) Micro Base | 220 / 5,900 pairs passed, median passed PF 2.26 |
| (c) Seated configs (Micro) | normal 839 configs, 470 closes, PF 0.16 · trailing 471 configs, 491 closes, PF 0.08 · signal units 1,310 (961 closes, PF 0.12) |
| (d) Whole book | 5,156 orders (2,362 closed + 2,794 open); PF incl. open 0.27 (closed-only PF 0.43) |
| (e) Checks | `checks: 55/55 ok` |

## Window w-rally — 5 Oct 15:00 → 6 Oct 03:00 UTC

Files: `w-rally/session.md`, `w-rally/writeup.md`. Log: **`checks: 54/55 ok — FAILED: execution: strategy type axis executed orders`**
(the run exited with status 1). The report's Strategies table has no Axis row: Axis executed 0 orders in this window,
although the seat evaluation counts 306 seated Wide-axis configs. The report is therefore not validated under the
report-integrity rule; its numbers are shown as the run produced them.

| | Micro |
|---|---|
| (a) orders closed | 39 (30 wins / 9 losses) |
| (a) PF closed | 0.77 (on r) |
| (a) open at end | 3 |
| (a) PF incl. open | 0.66 |
| (a) net closed | −3.81 % (Σr, % of one unit) |
| (a) net incl. open | −6.50 % (open mark −2.69 %) |
| (b) Why candidates did not execute, Micro | 2,653 skipped: crowd 1,764 · engineSide 673 · lastN 108 · duplicate 74 · symPf 34 |
| (c) Micro Base | 65 / 5,900 pairs passed, median passed PF 2.47 |
| (c) Seated configs (Micro) | normal 649 configs, 1,121 closes, PF 0.91 · trailing 598 configs, 1,730 closes, PF 1.82 · signal units 1,247 (2,851 closes, PF 1.26) |
| (d) Whole book | 8,009 orders (3,927 closed + 4,082 open); PF incl. open 1.18 (closed-only PF unit 3.77) |
| (e) Checks | `checks: 54/55 ok` — one FAILED: execution, strategy type axis executed orders |

## Notes on the figures

- PF closed = Σ gross profit / Σ gross loss over the closed orders' per-order return r. PF incl. open adds each open
  order's mark-to-market r (`openEnd.mtmR`, from `raw.json`) to the same sums. Net = Σr × 100 (% of one unit). The
  closed PF of the Micro row and the whole book match the report's PF unit (Micro 0.13 / 0.77; book 3.77 in w-rally).
- Micro = config ids with the `mc` range tag (`rangeOfId`). Skip reasons and Base / seated figures are the report's own.

## Commit

Only files under `docs/sims/micro-2026-10-08/MB/` (this README, `w-latest/` and `w-rally/` with session.md and
writeup.md). html/ and raw.json stay in `runs/` (ignored by git).
