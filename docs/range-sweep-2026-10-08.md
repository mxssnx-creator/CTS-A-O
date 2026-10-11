# Range sweep, 8 Oct — General and Long (gn, lg)

Operator, 8 Oct: fix General and Long so they trade with many orders and a positive profit factor, each range with its
own indications, bots and coordinations (independent of the ranges that already perform). The target, as answered:
**per range, PF including open positions > 1 in BOTH 12 h windows, and at least 300 closed orders per range per
window.** Settings are chosen and judged on the two windows (in-sample: the choice is made on the windows it is judged
on, so every result here is optimistic).

Windows (UTC): rally 5 Oct 15:00 → 6 Oct 03:00; latest (falling) 7 Oct 12:00 → 8 Oct 00:00. 20 symbols, 24 h
pre-history, 12 h run, balance $20, desk R1 (`docs/sims/ranges-2026-10-08/desks/R1.json`: V3 with the Minimum range
on). Every session ran with `CTS_CORE_VARIANTS=1`; the variant rows are walk-forward re-runs on the session's own
tapes, so a gate lever never rebuilds a tape.

## What was built

- **Per-range coordination (`RangeGrid.coord`, `RangeCoord`)** — `validLastN` (seat validation window), `lastN`
  (execution window per side), `symGate`, `engineSide` (engine direction acceptance), and two allow-lists: `bots`
  and `indFamilies` (trend / reversion / breakout, `src/core/range-coord.ts`). Undefined = the global value, so a
  range without a coordination is unchanged. Judged on the range's own candidates only (`src/core/sim/range-override.test.ts`:
  a General seat window refuses a General config and leaves a Micro config's trades byte-identical).
- **Allow-lists are candidate rules**: a config outside a range's bots or families is not a candidate of that range
  (filtered at the walk-forward entry; per-config seats make this the same as a tape-stage rule).
- **Settings checks** for every lever and list (`src/core/range-coord-settings.test.ts`).
- **Explicit refusals** (from the 8 Oct Axis investigation): `skipsByKind` in the walk-forward result, and the session
  checks name the gate that refused every candidate of a family that executed nothing.
- **Sweep tooling**: `CTS_CORE_VARIANT_SET=ranges` (the gate and allow-list levers below, `rangeLeverVariants`),
  `CTS_CORE_VARIANT_SET=none` (the baseline row alone, for per-range numbers), `CTS_CORE_RANGE_VARIANTS=<file>`
  (combinations as data, `rangeComboVariants`), per-range numbers in every variant row (`byRange`, `rangePfIncl`),
  and `scripts/range-sweep-table.mjs` (acceptance per range from the session logs).
- **Micro scan** (`scripts/micro-scan.mjs`): the Micro indications × lanes × exit cells on the engine's own tapes
  (`docs/micro-scan-2026-10-08.md`).

## Stage A — one lever at a time, General and Long together

Levers (walk-forward gates and allow-lists, so one tape build serves all of them):

| lever | baseline | levers tried |
|---|---|---|
| seat validation window `validLastN` | 15 | 5, 10, 20 |
| execution window `lastN` | 15 | 10, 25 |
| symbol gate | provenSide | off |
| engine direction acceptance | on | off |
| range minimum PF | 1.05 | 1.12, 1.18 |
| crowding cap per bar | none | 1, 3 |
| bots | every bot | follow only, revert only, follow + revert |
| indication families | every family | trend, reversion, breakout |

**Status: running.** The sweep runs as one `scripts/core-session.mjs` session per window (desk R1, `CTS_CORE_RANGE_VARIANTS` with
23 combinations: the 17 single levers above and six combinations). The results table is written from the session logs
by `scripts/range-sweep-table.mjs` once both windows finish; no lever has been judged yet, so no lever is adopted.

## Not in this stage

- Tape-level levers (the 5 m lane for General and Long; the stop and target ladders; the engine tactics): each needs a
  tape build, so one session per window. Queued after Stage A; results in the sections below when they finish.
- Per-range tactics (their own filters per range, with a tactic key in the config id): not built. The engine tactics
  are one object for every range; `T1` (volatility regime and trend strength on) reports the per-range effect of
  turning them on, which decides whether a per-range version is worth building.

## Decision

**Pending.** Acceptance is per range: PF including open orders above 1 in both windows and at least 300 closed orders in
each window. Until the Stage A table is written, General and Long stay as they are in the desk (no coordination set), and
no range is deployed to x02.
