# Causal family evaluation, October 2026 — protocol (frozen 2026-10-11T13:07:10Z)

Frozen before any D1 result is read. Changing a rule below after a result is seen needs a new dated protocol file.

## Families (140)

- Engine: follow and revert × the ranges mc, mp, mn, sh, gn, lg, wide (14). Each family is one bot and one range.
- Signal: the **63 enabled sources** (signal-config defaults: sourcesMode "deny", 33 sources set false) × short and medium
  (126). The earlier "54" in the approval came from a stale comment; the enabled count is 63.
- Not families: DCA, Block and Axis are separate strategies on top of the bot × range families; every family run turns them
  off (dca, dcaActive, block, blockActive, axis = false).

## Windows

- D1 (development, in-sample for every verdict): the run ends at 2026-10-09T11:00:00Z (the freeze minus the 48 h purge,
  hour-floored), 312 h simulated, 24 h pre-calculated. Causal (causalBase on), caps as the desk, one family per process.
- H (holdout, forward only): exchange closes with exit time at or after 2026-10-11T11:03:00Z (restart rows excluded).
  Nothing is judged on H until a family has 150 trades and 30 independent events (criteria: docs/bot-stability-criteria.md).

## Cells and verdicts

- Each family's cell (symbol × direction × range × tp × sl × trail × hold) is chosen on D1 only, by PF at 0.2 % among
  configs with at least 30 trades on D1. A family with no positive D1 cell is "not positive" and stops.
- A D1-only verdict is labelled in-sample and is never a pass. No re-selection on H. No multiple-comparison correction.

## Data and checkpoints

- Feed: runs/eval/feed.json, built read-only from runs/x01-signals/core.sqlite (60 symbols, 1 m bars, lanes 5/15/30 m
  resampled with the engine's resample()). Its SHA-256 is recorded in every family's output.
- Each family writes runs/eval/<family>.json (stats, cells, feed hash, window). A family is skipped only when its file exists
  with the same feed hash and window.
