# Bot stability criteria (frozen)

Frozen on the date below, before any hold-out result is read. Changing a number here after a result is seen is not
allowed; a new criterion is a new dated file.

Frozen: 2026-10-11 (UTC, see the commit that adds this file).

## What "stable and consistently positive" means

A bot family (a bot × range; e.g. `eng follow mn`, `sig follow wide`) is positive when all of these hold on its
hold-out:

1. **Sample.** At least 150 trades (one config's paper position closed on the exchange = one trade) AND at least 30
   independent events. An event = a distinct (symbol, side, paper entry bar). Many configs of one family enter the same
   symbol on the same bar, so 150 trades can be only a handful of events; the events floor is the independent sample.
   (The operator's "Balanced" criterion counted trades; the events floor is added here as the stricter reading.)
2. **Net PF at 0.2%.** Every trade re-priced at a 0.2% round-trip cost (the stored return, plus the difference where its
   fee was unmeasured) has PF ≥ 1.
3. **Stress.** The same trades at 0.4% round trip have PF ≥ 1.
4. **Both sides.** Long and short each have PF ≥ 1 on their own, with at least 30 trades per side or the side is
   reported as not judged.
5. **Consistency.** At least 2/3 of 8 h blocks that hold 3+ trades have PF ≥ 1.

Below the sample floors a family is "not judged", never a pass.

## Hold-out

- The hold-out is **forward data after the freeze date** (exchange closes and paper closes on live prices recorded after
  2026-10-11 11:03 UTC, the freeze). Every window in the repository before this date is development data: the six windows behind
  the coordinations are all rallies and were used to choose the parameters.
- Falling-market check: one window with a negative median symbol return where the family stays at PF ≥ 1 (Strict
  only). Not available in the repository yet; not claimed.

## Rules that apply to every number

- Exchange closes come from `live_lane_trades`, one row per config's trade; the paper record is labelled as paper.
- A fill with no commission in its reply is **unmeasured**, not zero (`parseFill` returns null; `liveCost` is null
  until 20 fills carry a fee). Unmeasured fees are re-priced at the 0.2% model cost in the 0.2% and 0.4% columns.
- The 01:06 UTC restart booked 99 stop rows at trigger prices (exit_t 1791680800000–1791680801000). They are excluded
  from every judgement and kept in the table as a count.
- Before a family is judged, its trades are read from the database per trade and per event (not per entry bar of all
  configs together).

## Current status (not a verdict)

| family | trades (clean) | events | PF stored | PF 0.2% | PF 0.4% | verdict |
|---|---|---|---|---|---|---|
| eng follow mn | 120 | 7 | 1.22 | 0.92 | 0.69 | not judged (events < 30); disabled 11 Oct |
| eng revert mn | 76 | 5 | 0.69 | 0.51 | 0.35 | not judged (events < 30); disabled 11 Oct |
| sig follow wide | 20 | 6 | 0.00 | 0.00 | 0.00 | not judged; still running |
| the other bots | 0 live trades | 0 | — | — | — | not judged; need the hold-out simulation |
