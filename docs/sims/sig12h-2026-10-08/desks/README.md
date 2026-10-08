# Signals-only 12 h variants (8 Oct)

Operator, 8 Oct: "Fix Signals, Update to perform better and do 12h trade sim with 20 symbols only for Signal.. test also with different trail ranges and relatives coordinations (optimal, best PF for each source, symbol independent)".

Base: the live x01 desk (V3) with the engine ranges off (Normal toggle off, Micro / Short / General / Long grids off and excluded, Axis / DCA / Block off), 20 symbols, 24 h pre-history, 12 h run.

| variant | signal settings |
|---|---|
| T0 | signal grid as before V3: Normal stops 3x target, Trailing trail 0.4/0.6/0.8 of target with stop 3x, hold 48 h |
| T1 | V3 (live now): Normal stops 1.5/2/3x, Trailing trail 0.4/0.6/0.8 stop 3x, hold 24 h |
| T2 | tight trails: V3 + Trailing trail 0.25/0.4/0.6 of target with stop 2x |
| T3 | wide trails: V3 + Trailing trail 0.6/0.8/1.0/1.2 of target with stop 3x |
