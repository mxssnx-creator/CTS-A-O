# Signals audit, 8 Oct 2026

Audit of the signal items D1–D8 and the stage findings B1 and I3 on branch `claude/sim3h-fixes`, checked against the
committed code at `25057fe`. Commits and tests are listed per item. No measured result is claimed here: the default
outcomes that change are decided by the simulations (2 of 2 windows).

| Item | Verdict | Commit | Test | Note |
|---|---|---|---|---|
| D1 confirmation pool read range-gated picks | confirmed, fixed | `66f152f` | `sim/signal-range-independent.test.ts` | pool selected under range-neutral options; execution keeps its range settings |
| D2 run start changed the direction gate, guard and pool | confirmed, fixed | `cec0e0a` | `sim/run-warmup.test.ts` | records fed from a warm-up: 48 h at the defaults |
| D3 config id omitted trail step and trail-free | refuted for the live ids; latent collision, fixed | `5a15ff8` | `sim/trail-step-id.test.ts` | no default run reaches it; existing ids unchanged |
| D4 held position kept the other source's lanes | confirmed, fixed | `dbd9e04` | `server/live-signals-lanes.test.ts` | deployment note below |
| D5 open and per-direction signal caps | refuted | `e1a8c94` | `sim/signal-caps-direction.test.ts` | `signalMaxOpen` is one pool; the per-direction cap is `signalMaxPositions` |
| D6 seat symbols keyed without the side | confirmed, dead code, fixed | `155b4c3` | `sim/signal-seat-side.test.ts` | no production caller; the report seat logic is a separate path and is unchanged |
| D7 entry window stated in comments | comment corrected, default unchanged | `e1a8c94` | `sim/signal-last-n-window.test.ts` | entry reads `min(lastN, signalValidLastN)`: 15 at the defaults; comments said 25 |
| D8 validation window beyond the ranking window | refuted | `e1a8c94` | `sim/signal-validate-window.test.ts` | `min(validateH, windowH)` gives the same result |
| B1 live and paper confirmation index | fixed, as in the stage report | `25057fe` | `sim/confirm-index-parity.test.ts` | live, paper and simulation read one range-neutral pool |
| I3 Stable-02 feed from the range-gated picks | fixed, as in the stage report | `25057fe` | `sim/signal-stable02-range-independent.test.ts` | Stable-02 feed is range-neutral |

## Notes

- **D4 deployment note (x01).** `runs/x01-desk.json` has `live.source` "signals". With `dbd9e04`, an engine-opened x01
  position is closed on the next control step. Do not deploy to x01 without the operator's decision on that. x02
  (`source` "all") is unaffected.
- **Default outcomes.** D1, D2, B1 and I3 change the signal results at the code defaults: the confirmation pool (D1,
  B1, I3) and the records the direction gate and guard read (D2) change. Measured later: the simulations decide the adoption, on 2 of 2 windows
  (`docs/positive-coordinations.md`, 8 Oct entry). D3, D5, D6, D7 and D8 change no default; D4 changes none for
  `source` "all".
- **Pinned, not changed.** `e1a8c94` adds the tests for D5, D7 and D8, so a later change to the entry window, the caps
  or the validation window shows up.
- **Report seat logic.** The "840 seated signal configs" row of `docs/report-integrity.md` and defect 4 of
  `docs/sims/sim3h-2026-10-06/README.md` cite `scripts/core-session.mjs` lines ~666–741 (`sigActiveKey` ~715), not
  `signalSeatSymbols`. `155b4c3` (D6) did not touch that path.

## Adoption priorities (operator, 8 Oct, latest)

Hourly success first, then signal PF including open positions, then signal orders, each at least as good as the
baseline on both windows (`docs/positive-coordinations.md`, "Signal adoption priorities"). The baseline table is there
too. The new-code result is not recorded yet.

## Corrections from the diff audit (8 Oct, after the 24 h reruns)

A read-only audit of every change between `ebe643e` (the parent of the first 8 Oct change, verified to reproduce the old
code exactly on the pinned universes) and HEAD classified each commit by its effect on Signals numbers. The labels above
were corrected where the audit found them wrong:

- **`c2d757d` (rangeFit keeps every General and Long target; Micro in the default grid).** Labelled BUG-FIX, but it moves
  default engine numbers: `DEFAULT_SETTINGS.grid` now carries Micro (`config.ts`, 1,272 config ids before, 4,104 now), and
  the fit keeps the General and Long cells. The confirmation pool is built from those candidates, so Signals numbers move
  through it: a range setting changes signal decisions, which the invariance rule forbids. Open decision (Micro in the grid,
  and the pool's dependence on the fit).
- **`66f152f` (D1 confirmation pool) and `cec0e0a` (D2 warm-up).** Both change default Signals numbers, as the table
  above says. D2 also changes the early-run signal volume (`sig:signalSide` skips in the first hours), which the earlier
  wording "changes no signal volume" denied.
- **`25057fe` (B1, I3).** I3 (the Stable-02 feed) changes simulated numbers only when `coord.s2Windows` or `s2RelVolume` is
  on (both off by default), not "only in the live path". B1 (the live and paper confirmation index) changes default
  numbers off the walk-forward path.
- **`32f438b` (live confirmation after the run's end).** Live-only and a behaviour change, not a parity fix: the simulation
  has no judgment after its end. Its magnitude is unmeasured.
- **`8739754` (parity fixes, 8 Oct).** The live signal cap now counts each direction apart: at the default (100) live may
  hold up to 100 long and 100 short signal positions, where it held 100 combined. The exchange acceptance index now counts
  entries and includes closes at the decision time: live acceptance decisions change at the defaults once the exchange
  record holds `minTrades` closes. The Stable-02 pause at paper and live now matches its key, but it is inert unless
  `coord.s2Windows` is on. The side-window trim (2x fallback) moves no default number. The commit message's "No default
  changes" holds for the simulation only.
- **`a8808f1` (per-range minimums).** Intended. The audit found no Signals path from it at the defaults (Base reads
  `baseSetsMinPf`, the confirmation pool clears `rangeMinPf`). The coordination record had no entry for these values; the
  8 Oct entry in `docs/positive-coordinations.md` now records them and their causal table.
- **`40a42d8` (the report's execution check).** Its check passed a family with no order whenever a refusal was recorded, not
  when every candidate was refused. Fixed in `f8af499` (`src/core/session-checks.ts`): the walk-forward result counts the
  candidates that reach the decision, and the check requires the refusals to cover them.
