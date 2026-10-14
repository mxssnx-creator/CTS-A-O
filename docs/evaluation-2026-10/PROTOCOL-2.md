# PF search, October 2026 — protocol 2 (frozen 2026-10-11T14:09:47Z)

Written after the first family evaluation (PROTOCOL.md, frozen 2026-10-11T13:07:10Z) and before the second run that
stores each family's trades. Changing a rule below after a result is seen needs a new dated protocol file.

## What was already seen (read this first)

- The whole D1 window (2026-09-26 11:00Z to 2026-10-09 11:00Z) was read in aggregate for 89 families before this
  protocol was written. The best family then had PF 0.71 at 0.2 %. No family was positive.
- So D1b is **not a clean judge**: its trades were part of what was already read. A pass on D1b is a weaker result than a
  pass on unseen data. The only clean judge is the forward record H (below).
- The feed holds candles from 2026-09-23 14:00Z to 2026-10-11 14:00Z (1 m, 60 symbols; sha256 84c7eb2d40e1…). Before
  2026-09-26 there are three days, too few for a judge. No earlier window exists in the feed.

## Windows

- D1a (choose): entries from 2026-09-26 11:00Z to 2026-10-02 11:00Z.
- D1b (judge, seen, see above): entries from 2026-10-02 11:00Z to 2026-10-09 11:00Z.
- A trade belongs to the half its paper entry falls in (entryT). The run is the one of PROTOCOL.md: 312 h simulated ending
  2026-10-09T11:00Z, 24 h pre-calculated, causal, caps as the desk, one family per process, DCA / Block / Axis off.
- H (holdout, forward only): exchange closes with exit at or after 2026-10-11T11:03Z (restart rows excluded). Not judged
  until a unit has 150 trades and 30 events (docs/bot-stability-criteria.md).

## Levers (the units tried)

Each unit is the same trades cut three ways, so the multiplicity is visible:

1. the family (bot × range; signal source × short / medium): 140 families;
2. the family's long side only and short side only: 280 units;
3. each config (cell) of each family: the config id (exit grid tp / sl / trail / hold, and the range tag).

New rules and indications (higher-timeframe trend agreement, ATR-percentile regime, time-of-day filter, range break against
mean reversion) are **not** in this pass. Each needs its own indication or filter with a hand-computed unit test before
it can be a lever; they are the next protocol, not this one.

## Selection (D1a)

- The unit with the best PF at 0.2 % among the units with at least 30 trades on D1a is the frozen choice. The top 10 are
  listed with their D1b numbers so that the choice cannot hide the others.
- No re-selection after the D1b numbers are read.

## Judge (D1b, seen)

A chosen unit passes D1b when all hold:

- PF at 0.2 % ≥ 1.2 with at least 30 trades;
- at least 30 independent events (symbol, side, 15-minute entry bar);
- both sides have at least one trade;
- at least 2/3 of its 8-hour blocks with 3 or more trades have PF ≥ 1 at 0.2 %.

A D1b pass is **in-sample**: it is labelled as such, and it is not a live candidate on its own.

## Forward confirmation (H)

- A candidate that passes D1b goes to the forward record. It is judged on H with the frozen criteria of
  docs/bot-stability-criteria.md (150 trades, 30 events, 30 per side, PF ≥ 1 at 0.2 % and 0.4 %, 2/3 of blocks).
- Nothing on H is judged before the criteria are met. Nothing on H is used to choose.

## Reporting

- Every unit tried is counted, and the count is printed with the result (scripts/eval-pf-search.mjs).
- A unit that is best on D1a and fails D1b is reported as overfitting, not promoted.
- If no unit passes D1b, the report says so with the best D1b figure. A passing unit is proposed, never applied to the
  desk: the desk's settings change only with the operator's approval.
