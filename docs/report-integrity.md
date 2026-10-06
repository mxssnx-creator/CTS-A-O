# Session report integrity — what broke, and the guard that keeps it from breaking again

The session report (`scripts/core-session.mjs` → session.md, writeup, `html/index.html`) is how the operator reads
every run. On 6 Oct it showed wrong or no results for these reasons. Each now has a guard that fails loudly; a
change to the report or the engine's run accounting must keep every guard green.

| What the operator saw | Cause | Guard |
|---|---|---|
| **The HTML report was blank** (no tables, no charts) | `clientMain` — the page's code, embedded with `toString()` — called the script's top-level `baseGateRows`, which does not exist in the browser: a `ReferenceError` at load stopped the whole page (since 106301d). | `src/core/report-page.test.ts` type-checks `clientMain` alone against the DOM globals and fails on any name the page cannot reach. **Rule: the page code never calls a top-level helper of the script — it carries its own copy.** |
| **A "3 h run" covered 3 h 57 min** (four hour rows, the last partial; green hours out of 3 while 4 rows showed) | The session ran up to "now" and the walk-forward floors its start to the hour. | `src/core/session-window.test.ts`: the cut defaults to the current full hour (`--to-now` keeps the old feed). |
| **Positions per hour did not add up** (opened / closed / open) | Position episodes were built from the closed orders only, the hour-end count from every order. | `positionEpisodes` (`src/core/positions.test.ts`) and the report check *positions open(h) = open(h−1) + opened(h) − closed(h)*. |
| **"840 seated signal configs at PF 72" next to a book with no signal order** | The active signal set was keyed by pair, the engine gates it per pair × symbol. | `signalSeatSymbols` (`src/core/signals.test.ts`). |
| **Signals executed 0 orders with ~80 signal skips** | Candidates outside the active set were dropped without a reason. | `signalInactive` counted (`signal-gates.test.ts`); skip reasons per range (`skipsByRange`). |
| **"Checks N/N ok" with an enabled range or signals trading nothing** | Coverage checked that config sets exist, not that anything traded. | Execution checks per strategy type, range and signals in the report. |
| **Axis read as 232 stop-outs of 254** | Breakeven exits were labelled `sl`. | Exit reason `be` (`axis.test.ts`). |

## The variants table

The "Types on / off" / "Adjustments on / off" rows are the session's walk-forward re-run on its own final tapes,
one switch flipped at a time (`runVariants`, `src/core/sim/report-variants.ts`). They are a causal comparison on
the same data — the basis for any default change (docs/positive-coordinations.md) — and are kept that way:

- every variant row reruns `walkForward` on the same `rt.tapes` and options with exactly one change; the baseline
  row must print "reproduces the session run" in the log, otherwise the table is not comparable;
- a variant never changes the tapes (a change that needs new tapes is a `recompute` row, listed, not run);
- `report-variants.test.ts` pins the list (no variant equals the baseline value it flips; every row has its id).

24 h, 30 symbols, 6 Oct (docs/sims/sim24h-2026-10-06): as run PF unit 1.19 / +8,556 %; signal ranking `net` 1.48 /
+23,330 %; engine direction acceptance on 2.59 / +23,268 %.

## Before publishing a report

1. `node --experimental-strip-types --no-warnings --test src/core/report-page.test.ts` passes.
2. The run log ends with `checks: N/N ok` and the variants baseline "reproduces the session run".
3. The page opens without a console error (`runs/htmlcheck.mjs`-style Chromium load: zero `pageerror`).
