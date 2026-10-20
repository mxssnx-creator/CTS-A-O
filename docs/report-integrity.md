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

## Same simulated cohort: mandatory PF equality — 20 October 2026

A source tape and its executed **simulation** must have identical unit returns and PF for the **same** config × symbol × side × entry × exit sample. Normalize an explicitly recorded external execution multiplier exactly once. Do not deduct the modeled round-trip cost again. Missing provenance, a missing close, a duplicate close or a different return is an audit failure, never a no-loss winner.

`auditStateGen` now checks each simulated execution against its exact source tape after every compute, alongside the existing PF/trade-list and one-time-cost checks. `tapeReturnIndex` uses the exact config and settlement identity; sibling wins cannot satisfy it. `audit-negative.test.ts` corrupts source returns, identities, timestamps and multipliers and verifies failures. `sim/simulation-parity.test.ts` covers 168 type/range/lane/side combinations. `scripts/audit-simulation-parity.mjs RAW_JSON OUT_JSON` independently reconciles saved tapes and executions, with hourly and range PF on identical samples. Its regression rejects doubled costs, duplicates, wrong directions and unknown multiplier evidence.

Do not label historical gate-window PF as the later execution PF. Preserve the window, gate stage, funded/virtual status, closed/marked status and unit/cash basis with each value. On the archived 20-symbol replay, 416,561 overlapping historical config closes give gate PF 2.38235474; the later 49,259 funded simulated closes give **both** source-tape and execution PF 0.218922909, with zero per-trade discrepancies. This is a measured difference between samples, not authority to rewrite losses.

A separate bug in the new Micro stage audit grouped exits exactly on an hour into the next reporting hour. It now uses the central `settledHourT`: an exit at 01:00 belongs to the completed 00:00–01:00 reporting hour. The regression includes a boundary example that previously changed the positive-hour count from one to two. Execution admission clocks deliberately differ where their documented half-open decision window requires it; do not blindly replace clock buckets with reporting buckets. The correction affects reporting and research selection hour counts, not the archived aggregate PF.

## Omitted independent orders: Micro/Inverse collision — 20 October 2026

The exact-cohort PF audit above proved the returns of admitted orders. It did not prove completeness of admission. A later trace found that `orderCfgKey` removed the indication ID for Micro and Inverse sources. Different profiles, timeframe subsets and mirrored sources could therefore collide when protection, symbol, side and onset coincided. The archived v7 run recorded 97,398 duplicate rejections. This was a real independence bug; the archived PF is the correct arithmetic for an incorrectly restricted cohort, not a certified complete result.

The key now preserves full current and legacy Micro/Inverse config identities for both settled and open orders. `micro-order-identity.test.ts` covers 844 sources through order keys, Paper diffs and native lane keys, and runs a real walk-forward with identical simultaneous candidates. The old source fails both tests and admits one of 844; the corrected source admits all 844 with zero duplicate rejections. Retry deduplication of the same config and existing unrelated engine/Axis alias policies remain covered.

Replay the exact original 616-source market window with `prepare-micro-identity-reference.mjs`, then `micro-study.mjs run`. Discovery of the subsequently added methods is excluded for that comparison; actual settings, gate options, feed bytes, original source IDs and matching Exit sources are checked before scoring. Do not infer that all previously duplicate-rejected events will now execute: own entry/config/context gates still apply. Keep pre-fix v4 optimization results separate from corrected v5 results with unchanged windows, costs and selection rules. `audit-stage-transition.mjs` verifies recorded rolling decisions against each config's own historical tape and reports where sets stop passing; `audit-micro-stages.mjs` also publishes first admission rejection counts.


## Funded cohort required in standalone stage/parity audits — 21 October 2026

The new standalone Micro audits initially treated every saved virtual close as funded. That coincided with the original v7 cohort, but failed after independent admission increased positions: v8 has 131,858 virtual closes, 126,342 funded closes and 5,516 known zero allocations. The correct primary PF is 0.1019563106, not the virtual diagnostic 0.1136128974. This reporting bug cannot be repaired by changing trade returns or charging costs again.

`readFundedSession` now requires actual per-close report allocations, verifies exact identity/index, volume, notional product, protocol/window and aggregate counts, excludes known zero allocations, and refuses unknown ownership. Archived all-funded reports are sufficient only when they explicitly prove zero exclusions and unknowns and exactly match every raw close. Stage, parity, transition and independent price/gate audits consume this shared cohort. `--chunk-allocations` now records the actual allocations without requiring unrelated Signal research. Regression fixtures include an unfunded winner in a distinct strategy type, corrupted/missing/duplicate funding evidence and unknown allocations; both saved stage and tape audits must return the same funded PF.

The full-report hourly membership control also compared a funded type count with all virtual hourly types. It now counts funded hourly types on both sides while preserving zero-funded virtual activity. The original failed report remains in CI evidence and the deterministic repair passes all 60 controls. Paper lifecycle fixtures must seed a real sizing allocation and equity together; JSON snapshots omit undefined optional properties, so restart fixtures must not require those nonexistent properties. Do not weaken ownership, source-return or equity checks to satisfy these fixtures.


## Full registry hourly correctness audit — 21 October 2026

The universal audit under `.github/audits/universal-correctness.mjs` freezes its runtime manifest and cached native feed before running. It covers all registered specs, source/lane/type/range identities and positive/negative own hourly gate fixtures; the native run compares complete past states and actual Bot/tactics entries against six shorter histories. Preserve the complete family ledger and disclose synthetic versus historical evidence. Zero future-data discrepancies are correctness evidence, not proof of profitable future orders. The Signal allow-mode integration fixture must keep its original confirmation catalog and dispose background work even when setup times out; catalog growth must not silently turn a three-source test into a full new-family search. Dedicated universal and full-family tests retain the expanded coverage.
