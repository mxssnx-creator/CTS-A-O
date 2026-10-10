# Trail-distance sweep, signals only, 12 h hold, 20 symbols (8 Oct)

Operator (8 Oct): signals fixed for a better PF with a 12 h hold; test trail distances. The per-source and per-symbol
selection stays as the code has it; only the trail distance (`signals.trailing.trailOfTp`) and trail stop
(`signals.trailing.slOfTp`) change.

Base for every desk: the U1 desk (`docs/sims/sig12h-2026-10-08/desks2/U1.json`): engine grids on, engine execution off
(toggles normal/axis/dca/block off, every engine range excluded), signal Normal stops 1.5 / 2 / 3× target, confirm on,
accept and sideAccept defaults, 20 symbols. Changed here: `signals.holdH` 24 → **12**, and the trailing grid.

| desk | trail distances (share of target) | trail stop |
|---|---|---|
| F1 | 0.2 / 0.3 / 0.4 | 2× |
| F2 | 0.3 / 0.4 / 0.5 | 2× |
| F3 | 0.4 / 0.6 / 0.8 | 2× |
| F4 | 0.4 / 0.6 / 0.8 | 3× |
| F5 | 0.6 / 0.8 / 1.0 | 3× |
| F6 | 0.2 / 0.3 / 0.4 | 3× |

Windows: latest 12 h (7 Oct 12:00 → 8 Oct 00:00 UTC) and the 6 Oct rally 12 h (5 Oct 15:00 → 6 Oct 03:00 UTC), each with
24 h pre-history, 20 symbols, balance 20.

Adoption (2-of-2 rule): a desk replaces V0 only if it beats V0 on PF including open orders in both windows, with orders
not lower than V0. Results are added under `docs/sims/trail-2026-10-08/F*/` when the sessions finish.
