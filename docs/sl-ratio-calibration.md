# Calculated minimal and maximal stop ratio (SL / TP) — 16 November 2026

## What the settings mean

Each automatic stop policy (`slAuto`) of the engine ranges, Micro and Low-Range has a **minimum**, a **maximum**, a
**step** and a **fallback**. With *calculate the best minimal and maximal ratio* on (the default, `adaptive`), the minimum and
maximum are the **limits**, not the candidates that get built:

1. For every **TP step** of a range, Base runs one reference cell with the stop at the maximum (no trailing) and keeps the
   **last N settled samples** (N = the range's Base window: 40, Micro / Minimal 30). Each sample is its net return and its
   maximum adverse excursion.
2. Every ratio on the grid (minimum … maximum, by the step) is scored on those samples: a sample whose adverse excursion
   reached the stop becomes a loss of the stop distance plus the round-trip cost; every other sample keeps its result.
   The score is PF, ties by net.
3. The **best minimal and maximal ratio** are the two edges of the **near-optimal interval** around the best-scoring ratio:
   every contiguous ratio with a score of at least `(1 − tolerance) × best` (default tolerance 0.1), plus one candidate beyond each
   edge (the margin), clamped to the limits.
4. Base simulates **only the ratios inside the interval**; the tape stage (Main, Signals, Real) builds only those too
   (`ComboRun.rangeSl` → `pairSl` → reason `baseStop`).
5. **Too few samples** (fewer than `minSamples`, default 20), an unusable reference, or one candidate only: the limits themselves are
   used and nothing is filtered — the former behaviour. A manual list (`slAuto` off) and `adaptive: false` build every ratio.

The interval is recalculated on every Base compute from the samples that exist at that cut, so it follows the market and uses
nothing from the future. It is a **search range, not an admission**: each cell inside it is still judged by its own causal gates
(Last-N, PF, stage floors), and the cost / minimum-distance floors still apply to every stop.

## Why this is cheaper

A TP step used to build and simulate every ratio of the grid (10 on the ordinary ranges, 15 on Micro / Low-Range) in every stage.
Now Base runs one reference cell plus the ratios inside the interval, and the later stages build only that interval. The saving is
expected to be largest in the tape stages. It has not been measured on a full run yet: compare the built config count of a run
with `adaptive` on and off (`docs/sim-results/`, `scripts/sim-compare.mjs`).

## Limits to keep in mind

- The replay of a tighter stop on the reference samples is exact for the stop alone; it ignores that a different exit would
  re-time the next entry. It only chooses where to search; Base then simulates the ratios for real.
- With a very small sample the interval can be wide (little information) or collapse onto one ratio plus the margin.
- Trailing, DCA and Axis cells of a range use the interval of that range's TP step. Signal configs have their own Base and are
  not narrowed yet: their ratios stay the fixed 0.5 – 1.5 candidates (step 0.25).

## Where it lives

`src/core/sl-calibration.ts` (pure calculation), `src/core/sl-ratios.ts` (`adaptive`, `tolerance`, `minSamples`, validation),
`src/core/pipeline/pipeline.ts` (`withSlCal`, `referenceSamples`, `rangeBaseStats`), `src/core/server/runtime.server.ts`
(`pairSl`), `src/core/sim/walkforward.ts` (`baseStop`), settings page `SlRatioEditor`.
Tests: `sl-calibration.test.ts`, `sl-calibration-base.test.ts`.
