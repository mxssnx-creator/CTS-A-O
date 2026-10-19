# PF search, October 2026 — protocol 3 (frozen 2026-10-11T14:43:30Z)

Supersedes the window and the halves of PROTOCOL-2 (frozen 2026-10-11T14:09:47Z). The selection and judge rules of
PROTOCOL-2 (best PF at 0.2 % on D1a with at least 30 trades; PF ≥ 1.2, 30 trades, 30 events, both sides, 2/3 of blocks on
D1b) are kept. Changing a rule after a result is seen needs a new dated protocol file.

## Why the earlier window was withdrawn

- PROTOCOL-2 said "312 h simulated from 2026-09-26 11:00Z". The session clamps the simulated run to 240 h
  (src/core/server/runtime.server.ts, `num("simH", 1, 240)`), so that run was 2026-09-29 11:00Z to 2026-10-09 11:00Z.
- A 240 h causal run trades only in its first 1–2 days. Measured on the same feed and end time (no family filter):
  - 24 h run: 1,059 trades across the whole window (2026-10-08 11:30Z to 10-09 10:35Z).
  - 48 h run: 2,595 trades across the window, with a quiet stretch on 10-08 00:00–12:00Z.
  - 96 h run: 0 trades.
  - 240 h run: 886 trades, all entered by 2026-09-30 19:45Z. Longer lane history (tfDays 1 and 5 set to 11 days) did not
    change the cut: 1,217 trades, all by 2026-10-01 04:00Z.
  - The parent commit (0dc4883) gives the same 886 trades, so the cut is not from the performance commit.
- Cause: the causal Base ranking (causalBase) is taken from the history before the run start and frozen for the run; the
  seated configs stop passing the selection gates after the first days, so the run stops trading. A 240 h family run
  therefore measures the first days of a frozen choice, not the family over the window.
- The family files of that run (140 runs, 90 finished) are kept as the record in `runs/eval-240h-invalid/` and are not
  used for any verdict.

## Windows (fixed here, before any new family result is read)

- D1 window: entries from 2026-09-29 11:00Z to 2026-10-09 11:00Z (240 h).
- Unit of evaluation: five consecutive causal 48 h windows, each with 24 h pre-history, each ending on the hour:
  1. 2026-09-29 11:00Z to 2026-10-01 11:00Z
  2. 2026-10-01 11:00Z to 2026-10-03 11:00Z
  3. 2026-10-03 11:00Z to 2026-10-05 11:00Z
  4. 2026-10-05 11:00Z to 2026-10-07 11:00Z
  5. 2026-10-07 11:00Z to 2026-10-09 11:00Z
- Each window is its own causal session (scripts/core-session.mjs --end-at <window end> --run 48 --pre 24, causalBase on),
  so each window's Base and seats are chosen only from history before that window. Trades are kept when their entry falls
  in the window, and the windows are concatenated. A trade is never counted twice.
- D1a (choose): entries from 2026-09-29 11:00Z to 2026-10-04 11:00Z (5 days).
- D1b (judge): entries from 2026-10-04 11:00Z to 2026-10-09 11:00Z (5 days). The halves are cut by entry time.
- H (holdout, forward only): unchanged from PROTOCOL-2.

## What is seen and what is not

- The aggregate numbers of the withdrawn 240 h runs were read before this protocol. They are not used for choosing, and
  they say nothing about the rolling windows. The rolling windows are first read after this freeze.
- D1b is still read after the same D1 feed, so it is not a clean judge. A D1b pass is in-sample until the forward record
  (H) confirms it, as PROTOCOL-2 says.

## Levers and units

- Units as PROTOCOL-2: family, family × long / short, and each config. Engine families first (14); the 126 signal families
  follow after the engine families are done, and are reported as not yet evaluated until they are.
- Multiplicity is counted and printed by scripts/eval-pf-search.mjs (schema 3 files).

## Known limits of this protocol

- A 48 h window is short: a unit needs 30 trades in D1a and 30 events in D1b, which the families may not reach. A unit
  with too few trades is reported as "not judged", never as a pass.
- Rolling windows make each window's selection causal, but the selection still depends on the 24 h pre-history.
- The run is the desk's engine (caps, costs and settings as the desk), with DCA, Block and Axis off, as in PROTOCOL.md.
