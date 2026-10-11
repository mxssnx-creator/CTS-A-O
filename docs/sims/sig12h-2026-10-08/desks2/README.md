# Signals-only 12 h, round 2 (8 Oct)

Round 1 (T0–T3) traded nothing: the desks switched every engine grid off, so no engine candidate existed and signal
confirmation (which counts engine candidates taken or not) blocked every signal entry. Operator choice, 8 Oct: confirm
on every candidate.

Round 2 keeps the engine grids on: the engine's candidates are built and counted for confirmation, but nothing engine
executes — Normal / Axis / DCA / Block are off in the toggles, and every engine range (mc, mn, mp, sh, gn, lg) is
excluded (wf.excludeRanges). Signals run their own Normal and Trailing. No code change.

| variant | signal settings (as T0–T3) |
|---|---|
| U0 | Normal stops 3× target, Trailing trail 0.4/0.6/0.8 stop 3×, hold 48 h |
| U1 | Normal stops 1.5/2/3×, Trailing trail 0.4/0.6/0.8 stop 3×, hold 24 h (V3) |
| U2 | U1 + Trailing trail 0.25/0.4/0.6 stop 2× (tight) |
| U3 | U1 + Trailing trail 0.6/0.8/1.0/1.2 stop 3× (wide) |
