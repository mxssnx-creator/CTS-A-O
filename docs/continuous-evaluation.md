# Continuous evaluation — no hourly decision clock (16 November 2026)

## The limitation that was removed

The walk-forward re-derived the validated set and the **seat picks once per step (`stepH`, 1 h)**, and only the configs picked at
the start of the hour could enter during it. A config whose own windows qualified at minute 10 waited for minute 60; one that
stopped qualifying kept entering until the next boundary. Every entry was already judged on the closes before the entry
(`execDecision` → `positionConfigEval(tp, entryT, …)`), so the hourly list was an extra, stale gate in front of a correct one.
A finer `stepH` does not cure it: the entry between two clock ticks is still missed, and each step re-scored every tape (the
12-symbol runs sat at "step 0/12" for many minutes).

`sim/continuous-evaluation.test.ts` pins it: nine own closes settle at minute 90; the first entry is at minute 100 (it was
120), a strict setting waits for the full window (160, was 180), the result does not depend on `stepH`, a window that turns
losing stops new entries inside the hour, and contexts stay independent.

## What changed (`continuous`, default on; `decisionMin`, default 1)

1. **Exact evaluation memo.** A tape's verdict depends on the clock only through the number of closes settled before it
   (`lowerBound(exitT, t)`). `configEvalSummary` keeps a run-scoped memo by tape and that count, so a re-derivation re-evaluates
   only the tapes with a newly settled close and returns exactly what a fresh evaluation would.
2. **Picks re-derived inside the step** every `decisionMin` minutes (`selectPositionsGen` over all engine tapes, free of the
   hourly validated list). With `portfolio` 0 (no seat cap, the default) the picks are exactly the configs that pass.
3. **Entries are no longer skipped.** The queue used to advance unselected histories to the end of the hour (a speed-up that
   assumed a frozen selection). In continuous mode it advances only to the current batch.
4. **Progress follows the simulated clock**, not completed hours: the engine reports the simulated minute at every batch, the bar
   and label show "n h mm min simulated", on the main thread and from the owned worker alike.

## Scope and limits

- Applies to the position-count policy in fixed seat mode with validated seating, no per-range selection modes and no frozen
  `validated` snapshot. Anything else keeps the hourly selection (documented, unchanged).
- Signals already ran at one-minute batches with their own causal activation; unchanged.
- The hourly step log still records the picks the step started with (its validation summaries stay hourly records).
- Cost: one pass over the tapes' cached verdicts per `decisionMin`, plus an evaluation for each tape that settled a close. Raise
  `decisionMin` (1–60) to trade latency for speed; `continuous: false` restores the hourly behaviour.
- Fewer closes are weaker evidence: partial windows (`lastNFloor`) and continuous entry both admit a config earlier than before.
  The result half is never waived and a window that turns negative stops entries at the next batch.

Code: `src/core/sim/walkforward.ts` (`configEvalSummary` memo, `walkForwardGen` batch loop), `src/core/progress.ts`
(`simulationClock`), `src/core/server/tapes.worker.ts`, `src/core/server/runtime.server.ts` (`WF_KEYS`).
Tests: `sim/continuous-evaluation.test.ts`, `progress-clock.test.ts`.
