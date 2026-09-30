# Minimal Coord.

Short range and minimal range, kept in `src/core/minimal-coord.ts`, separate from the wide protect grid.

- Minimal: take-profit 1×–3× position cost, step 0.25. Stops 1×–2× the target, step 0.25. Trailing cells force the stop to at least 2× the target.
- Short: take-profit 3×–6× position cost. Stops 1×–3× the target, step 0.25.
- Minimal plus: see `docs/minimal-plus.md`. Disabled by default.

A cell is one take-profit, one stop multiple, one trail and one hold. Distances are fractions of price. The live desk builds these through the same protect grid as the wide book.
