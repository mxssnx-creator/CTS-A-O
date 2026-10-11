# Signals-only 12 h, round 2 — U3 (8 Oct): not publishable, nothing traded

Desk: `docs/sims/sig12h-2026-10-08/desks2/U3.json` (commit b299265). Normal stops 1.5 / 2 / 3× target; Trailing trail
0.6 / 0.8 / 1.0 / 1.2 × target with stop 3× (wide); hold 24 h. 20 symbols, 24 h pre-history + 12 h run
(2026-10-07 12:00 → 2026-10-08 00:00 UTC), `CTS_CORE_VARIANTS=1`, `CTS_CORE_COMPARE=0`, 3 workers.

## Outcome

- **The run executed 0 orders.** Signals, engine, Normal, Trailing: all zero. Balance $20.00 → $20.00.
- **Checks: `44/49 ok`. FAILED:** execution: range mc, sh, gn, lg executed orders; **execution: signals executed orders**.
  Under the report's rule (`docs/report-integrity.md`) nothing is published. No Artifact was created.
- **Signals-only condition:** holds trivially (0 executed orders, so 0 engine orders and 0 non-signal orders).
- **sig:confirm: 41,630 signal entries blocked, 100 % of signal candidates.** The brief expected this to fall well
  below round 1. It did not: it is all of them. Round 1 blocked everything for the same reason (see below).
- **Wall time:** about 22 min (started 01:23:35 UTC, finished about 01:45 UTC; the Base stage alone ran about 13 min).

## Why nothing traded

Signal confirmation (`wf.coord.confirm: true`) admits a signal only while an engine candidate, taken or not, is open
on its symbol and direction. This desk sets `wf.excludeRanges` to all six engine ranges (mc, mn, mp, sh, gn, lg), and
the README's round-2 premise is that engine candidates "are built and counted for confirmation". In this run they were
not counted: the range exclusion is applied before any entry, so no engine candidate ever reached the confirmation pool
(`src/core/sim/walkforward.ts:2907` returns `rangeOff` first). Every signal entry therefore failed `sig:confirm`.

I did not change code (the brief forbids it), so I have not confirmed the exact drop point in the pool builder. What is
confirmed: the desk excludes every engine range, every signal entry is refused by `sig:confirm`, and the run has no
executed order at all.

The two failing groups of checks differ in kind:

- **mc, sh, gn, lg "executed orders"** are expected to fail. Those ranges are excluded on purpose; the check is not
  meant for an excluded range.
- **"signals executed orders"** is the real failure. It is the same cause as above.

## Requested for the operator

- Decide how the engine's candidates should reach the confirmation pool while their ranges are excluded from entry:
  (a) keep the engine ranges in the confirmation pool but out of entry, or (b) confirm signals against signal-only units.
  This changes desk semantics, so it is not decided here.
- U0–U2 in `desks2/` use the same exclusion, so they are not expected to trade either. Not run.

## Not computed

The brief asks for signals PF, net, per-source / per-symbol, hour-by-hour, and hindsight best-config tables. With 0
executed orders those tables are empty, and the candidate-level signal configs in `session.md` are un-confirmed tapes
(what the gate prevented), so presenting them as trading results would be misleading. Not written up. The raw data is
in `runs/U3/raw.json` (not committed, per the brief); the signal config tables are in `session.md` lines 575–654.

## Files

- `session.md`, `writeup.md`, `html/` (`index.html`, `data.json`): copied from `runs/U3/`.
- `raw.json` not committed (per the brief).
