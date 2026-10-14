# The Base gate, October 2026 — protocol 4 (frozen 2026-10-11T15:09:19Z)

Adds one lever to PROTOCOL-3: the Base stage's PF gate (the stage after Base evaluation that keeps pairs at PF ≥ the
range minimum). The windows, the halves, the selection and the judge rules of PROTOCOL-3 are kept. Frozen before any
variant is run.

## What was measured before this protocol (not used for the choice)

- Two causal 48 h windows, full engine, default settings (2026-09-29 11:00Z–10-01 11:00Z and 10-03 11:00Z–10-05 11:00Z,
  the window ends 10-01 and 10-05):
  - window ending 10-01: 133 Base pairs, 19 pass the gate (14 %), 16 of them trade in the window; the survivors' pooled
    window PF is 0.50 (1,196 trades);
  - window ending 10-05: 2 pairs pass, neither trades.
- Among the survivors, a higher pre-window Base PF did not predict the window PF: pre PF 1.05–1.2 earned 0.58, pre PF ≥ 1.2
  earned 0.48. The gate's ranking has no out-of-window value in this sample.
- The gate cannot be loosened through the settings: `minPfOf` clamps each range minimum to at least 1.05. A test of a
  looser gate would need a code change, and is not in this protocol.

## Variants (fixed here)

Each variant is one settings patch on the same five D1 windows (scripts/eval-gate.mjs, full engine, DCA / Block / Axis off):

- V0 (baseline): no patch (default gates: minPf 1.1; range minimums micro 1.05, minimal 1.08, general 1.12, long 1.18;
  minTrades 12; maxDdr 1).
- V1: `minTrades` 30 (a Base pair needs 30 closes, not 12).
- V2: the four range minimums at 1.25.
- V3: `maxDdr` 0.5 (the drawdown ratio of the Base window at most 0.5).

## Selection and judge (PROTOCOL-3 rules)

- D1a: entries 2026-09-29 11:00Z to 10-04 11:00Z. D1b: entries 10-04 11:00Z to 10-09 11:00Z.
- The variant with the best PF at 0.2 % on D1a among variants with at least 30 trades on D1a is chosen. All four variants
  are reported with their D1a and D1b numbers.
- The chosen variant passes when on D1b it has PF ≥ 1.2 at 0.2 % with at least 30 trades, at least 30 events, both sides
  with trades, and 2/3 of its 8 h blocks at PF ≥ 1. D1b is still read after the same feed, so a pass is in-sample until
  the forward record confirms it.

## What the funnel must report (continuously, every window)

- Base pairs evaluated, pairs that pass the gate (the survival share), survivors that trade in the window, the window PF of
  the survivors and of all trades, and the pre-window Base PF against the window PF of each survivor.
- A variant that improves D1a PF by letting fewer pairs through is reported as a survival change, not as a better filter,
  unless its D1b figure also holds.

## Not decided here

- A change to the desk's defaults needs the causal comparison in docs/positive-coordinations.md and the operator's
  approval. This protocol only measures.
