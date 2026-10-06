# 3 h simulation with 3 h pre-history — 6 Oct 2026

**Tests on the merged head (main 1251c57 + the fixes below): PASS.** `npx tsc --noEmit` clean; all 70 `src/core/**/*.test.ts`
files pass, one at a time (`src/core/server/runtime.test.ts`: 27 tests, 316 s on an idle machine; `memguard.test.ts`
9 tests; `memguard-runtime.test.ts` 3 tests).

12 symbols, `--pre 3 --run 3 --focus all --desk desk.json` (the desk of the brief), every computation on
(`CTS_CORE_VARIANTS=1`), public BingX 1m klines. Allocator caps on every run.

**Status: not stable and not good — stopped after 2 iterations on the operator's request to push and merge.** Every
consistency check passes and the report is now correct, but the engine traded at PF unit 0.57 and 0.38 in the two
windows, far below the targets (PF unit ≥ 1.5, PF $ ≥ 1.3, ≥ 1,000 orders, ≥ 2 of 3 green hours). No code defect
found explains the loss (below). The levers that change it are strategy defaults and positive coordinations,
which stay as they are until a multi-window comparison beats them.

## Iterations

| it | commit | window (UTC) | orders | PF unit | PF $ | net | green hours | max equity DD | checks | peak RSS |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|
| i1 | 1924b74 | 5 Oct 22:00 → 6 Oct 01:57 (3 h 57 min: defect 3) | 4,036 | 0.57 | 0.89 | −$0.23 (−2.31 %) | 2 / 3 | 9.54 % | 43/43 (44/44 re-rendered) | 5.6 GB |
| i2 | db5694c + 283f10a | 6 Oct 10:00 → 13:00 (3.0 h) | 3,371 | 0.38 | 0.96 | −$0.10 (−0.99 %) | 1 / 3 | 12.50 % | 43/43 (44/44 re-rendered) | 6.9 GB |

No crash, no OOM, no memory fallback. Signals executed 0 orders in both windows (defect 2 and the measurement below).

## Defects found and fixed

| # | file | cause | fix | test |
|---|---|---|---|---|
| 1 | `scripts/core-session.mjs` | **Every HTML report page was blank.** `clientMain` (embedded with `toString()`) called the script's top-level `baseGateRows`, which does not exist in the browser: `ReferenceError` at load (since 106301d). | The page carries its own copy. | `src/core/report-page.test.ts` type-checks `clientMain` alone against the DOM globals and fails on any name the page cannot reach (fails without the fix). |
| 2 | `src/core/sim/walkforward.ts` | A signal candidate outside the step's active ranking was dropped **without a skip reason** — runs whose signals never traded showed ~80 signal skips instead of 7,000–10,000. | Counted as `signalInactive`. | `signal-gates.test.ts` |
| 3 | `scripts/core-session.mjs`, `src/core/session-window.ts` | **"3 h run" simulated 3 h 57 min**: run up to now, the walk-forward floors its start to the hour (four hour rows, the last partial). | The cut defaults to the current full hour (`--to-now` keeps the old feed). | `session-window.test.ts` |
| 4 | `scripts/core-session.mjs`, `src/core/signals.ts` | **Seated signals over-counted**: the report keyed the active set by pair, counting every symbol's closes of an active pair (840 "seated" signal configs at PF 72 next to a book with no signal order). The engine gates per pair × symbol. | `signalSeatSymbols`: seated only on the active symbols, their closes only. | `signals.test.ts` |
| 5 | `scripts/core-session.mjs`, `src/core/positions.ts` | **Hour table positions did not add up** (22:00: 21 opened, 5 closed, 20 open): episodes built from closed orders only while the hour-end count included orders still open at the end. | `positionEpisodes` over the whole book, opens bucketed as the minute marks see them; new check open(h) = open(h−1) + opened − closed. | `positions.test.ts` + the report check |
| 6 | `scripts/core-session.mjs` | Minimal plus on with no stored cell showed a bare "no config sets built". | States the cause: it builds only stored cells (`cells: []` in the desk); `checkSettings` refuses that combination. | replay of i1 |
| — | `src/core/sim/report-variants.ts` | The signal ranking had no measurement. | `signals.count` 0 / 100 / 200 and `rank` drawdown / lowdd / net join the session variants. | `report-variants.test.ts` |

`scripts/losing_configs.py` (losing configs per direction with their geometry and the pooled tables) is in the repo.

Checked and **not** defects: look-ahead in Base — every bot × every indication (563 ids, 33,828 combinations on 1m and 15m, three cut points) is prefix-stable, now a test in `core.test.ts`; Block stacking to 8× with `maxMult 4` (overall mode stacks per source within 8×, audited);
PF $ far above PF unit in Short / General (the live caps zero or scale later entries on a crowded symbol × side —
the "sizing" column); the unit PF is the engine's Block-weighted `r` (one-unit PF 0.65 vs 0.57 on i1); the trailing
exit simulation (stop before target inside a bar, the trail moves after the bar — conservative).

## Why signals do not trade (measured, default unchanged)

Over the i2 window the signal pool was the strongest part of the engine on i1 (Normal PF 6.84 / Trailing PF 4.35 over
3,584 closes), yet 10,407 signal candidates fell outside the active set. The active ranking (`signals.count 50`,
`rank lowdd` = net ÷ drawdown², drawdown floored at 0.5) fills its 50 slots with signals that fire about once a
day: a few clean wins over 14 days score highest. 1 of the 50 active keys entered in the 3 h (diagnostic run,
6 Oct 23:00–02:00). The same set feeds live control, so x01's signals rarely get an order.

Variants on i2's own tapes (PF unit, net Σ trade %): baseline 0.38 / −13,328 · every validated signal active 0.40 /
−13,294 (+59 orders) · 200 active 0.40 · rank net 0.39 · rank drawdown 0.38. Small and one window: the code default
stays; the x01 patch below is the operator's call.

## Final tables (i2)

| range | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| Micro | 90 | 0.08 | 0.05 | −$0.01 |
| Minimal | 1,678 | 0.78 | 0.51 | −$0.38 |
| Minimal plus | 0 | – | – | on with no stored cell (by design) |
| Short | 788 | 0.97 | 0.24 | −$0.02 |
| General | 260 | 2.06 | 0.62 | $0.11 |
| Long | 301 | 2.27 | 0.93 | $0.24 |
| Wide (Axis) | 254 | 0.28 | 0.14 | −$0.04 |
| Signals | 0 | – | – | outside the active set (above) |

| type | orders | PF $ | PF unit | net |
|---|---:|---:|---:|---:|
| Normal | 1,137 | 0.91 | 0.37 | −$0.11 |
| Trailing | 1,980 | 1.03 | 0.39 | $0.05 |
| Axis | 254 | 0.28 | 0.14 | −$0.04 |
| DCA | 0 | – | – | off on the desk |
| Block-raised (of which) | 2,301 | 0.71 | 0.34 | −$0.64 |

Ranges / types at PF < 1 over ≥ 30 closes, with the recorded cause: Minimal, Short, Micro, Wide and every type
lose forward after passing Base at median PF 1.5–1.9 ("Base → book" 0.02–0.62) — selection that does not hold out
of sample in these two windows, not a gate or evaluation mismatch (seat, entry and book agree). Engine direction
acceptance would have cut i2's loss (PF 0.38 → 0.88) but not i1's (0.57 → 0.54); it stays off (operator, 6 Oct).

Files: `i2.html` (the full report), `i2.md` (write-up), `x01-signals-patch.json`.

## Follow-up, 6 Oct afternoon (operator: Micro seats, Minimal, PF from Base to the book, Axis, stages)

### Micro: do the other seats perform like the executed ones?

| Micro | i1 (5 Oct night) | i2 (6 Oct 10–13) |
|---|---|---|
| executed | 101 orders, PF 18.6 | 90 orders, PF 0.05 |
| every seated config (executed or not) | 127 closes, PF 25.0 | 162 closes, PF 0.05 |
| every Micro config (unfiltered) | PF 0.44 / 0.24 (normal / trailing) | PF 0.39 / 0.40 |

Seat → book is consistent: the seats that did not execute would have done what the executed ones did. The seat
selection beat the unfiltered pool in i1 and not in i2 — Micro's i1 edge did not repeat.

### Minimal: old ladder (desk) vs the new one (main, 1.5–3×, floors 0.6 % / 0.3 %), same candles

| window | ladder | Minimal orders | Minimal PF | Minimal net (Σ %) | all orders PF |
|---|---|---:|---:|---:|---:|
| 5 Oct 23:00–6 Oct 02:00 | old (desk) | 2,465 | 0.61 | −892 | 0.70 |
| | new | 5,460 | 0.61 | −2,158 | 0.66 |
| 6 Oct 10:00–13:00 | old (desk) | 1,678 | 0.51 | −816 | 0.38 |
| | new | 4,098 | 0.53 | −2,099 | 0.43 |

The new ladder more than doubles Minimal's orders at the same PF: it does not fix Minimal. No Minimal geometry won in
both windows (stops 1× lose most). Minimal now also runs Micro's indications (`grid.minimal.microInds`, default on).

### Defects fixed (each with a regression test)

| # | file | cause | fix | test |
|---|---|---|---|---|
| 7 | `src/core/sim/axis.ts` | **Axis hybrid trail collapsed onto the close**: the gap was the stop distance after each trail step, so it shrank every step until every hybrid exit paid about the cost. | The gap is fixed at arming (Stable-02). | `axis.test.ts` (fails without: exits at 99.57) |
| 8 | `axis.ts`, `domain/types.ts`, `walkforward.ts` | **Breakeven exits recorded as `sl`**: 232 "stop-outs" of 254 Axis orders were largely breakevens at −cost. | Exit reason `be` (appended to the stored reasons). | `axis.test.ts` |
| 9 | `src/core/pipeline/pipeline.ts` | **Base's trailed cell was not the traded cell**: no trailing stop ratio, trail floor not ÷ trailStep, no trailStep / trailFree. | Built as the grid builds it. | `micro-range.test.ts` (every Base trailed cell is a grid cell) |
| 10 | `walkforward.ts` | **Held configs kept taking seats after Base dropped their cell**: paper's seats were rebuilt unfiltered and seated by the pair alone. | Held-only tapes serve their position, take no new seat (carried through packTapes). | `micro-range.test.ts`, `independence.test.ts` |
| 11 | `walkforward.ts`, `scripts/core-session.mjs` | Skip reasons were global: which gate held back Micro's seats could not be read. | `skipsByRange`; the report lists skips per range. | `signal-gates.test.ts` |
| 12 | `scripts/core-session.mjs` | Coverage proved config sets exist, not that anything traded; the trailing check ignored `kindExecutable`. | Execution checks per strategy type, range and signals. | report checks |

Normal and Trailing: both on and trading (i2: 1,137 / 1,980 orders); no path turns them off with the toggles on —
an entry Block does not raise trades at its unit only when its own recent closes clear `normalBaseMinPf` 1.05.
Axis revert keeps its stop one step from the average (the documented port of the old desk): rung 2 can never fill.
Not changed; `axis.exits: "fixed"` is the measured alternative.
