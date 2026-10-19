# Ranges and order count, October 2026 — protocol 5 (frozen 2026-10-11T17:27:43Z)

Adds the range levers to PROTOCOL-3 and PROTOCOL-4 (the windows, the halves, the selection and the judge rules are kept).
Frozen before any variant in this list is read.

## What was measured before this protocol

- Full engine, five 48 h causal windows, default settings (`runs/eval/gate/v0-base.json`, `sig-all-v0.json`):
  - Minimal 3,119 orders, PF 0.27 (D1a 0.45, D1b 0.24); Short 378, PF 0.74 (D1b: no trades); Long 234, PF 0.34 (no D1b
    trades); General 187, PF 0.32 (no D1b trades); signals 298, PF 0.60 (D1b 0.39); Wide and Micro: no orders.
- Micro and Minimal plus are off in the default Base (`grid.micro` and `grid.minimalPlus.enabled` absent or false), so they
  produce nothing. Wide passes Base on 4 pairs and seats no config.
- Order count is not limited by seats: `portfolio` 0 means no cap (`seatsOf`, `walkforward.ts`). The orders are limited by
  the gates: minTrades 12, the range gate (`gates.rangeGate`: last 75 closes at PF ≥ 1.35 for range cells), and the stage
  gates.

## Variants (fixed here)

Each is one run of `scripts/eval-gate.mjs` over the five D1 windows, engine only, DCA / Block / Axis off:

- V1 `micro-on`: the complete Micro range (`grid.micro` = `MICRO_RANGE` with `ownInds`), default gates.
- V2 `gate-range-1.0`: `gates.rangeGate.minPf` 1.0 (range cells seat at PF 1.0 over their last 75 closes).
- V3 `micro-gate-range-1.0`: V1 and V2 together.
- V4 `mintrades-6`: `gates.minTrades` 6 (a Base pair with 6 closes, not 12).

## Selection and judge (PROTOCOL-3 rules)

- D1a: entries 2026-09-29 11:00Z to 10-04 11:00Z. D1b: entries 10-04 11:00Z to 10-09 11:00Z.
- The variant with the best PF at 0.2 % on D1a among those with at least 30 trades on D1a is chosen. All variants are
  reported with orders, D1a and D1b PF per range.
- A pass needs PF ≥ 1.2 at 0.2 % on D1b with at least 30 trades, 30 events, both sides with trades, and 2/3 of 8 h blocks at
  PF ≥ 1. D1b is still read after the same feed, so a pass is in-sample until the forward record confirms it.

## Reporting rules

- Orders and PF are always reported together. A variant that raises orders and lowers PF is reported as that trade-off,
  not as an improvement.
- No variant is applied to the desk. A passing variant is a proposal for the operator's approval, with its causal
  comparison recorded in docs/positive-coordinations.md.

## Erratum (frozen, 2026-10-11T17:41Z)

- V2 and V3 named the range gate as `gates.rangeGate`. The reader is `grid.rangeGate` (`rangeGateOf(s.grid)`,
  `src/core/minimal-coord.ts:391`). The first V2 run used the wrong path: its numbers equal the default run (3,918 trades,
  PF D1 0.33), so it changed nothing and is not a finding. It is kept aside in `runs/eval/gate/invalid/`.
- The variants are unchanged in intent and are run with the correct path: V2 `grid.rangeGate` {enabled true, lastN 75,
  minPf 1.0}; V3 V1's Micro patch plus V2's `grid.rangeGate`. V4 `gates.minTrades` 6 is unaffected.
- No selection has been made from any run.
