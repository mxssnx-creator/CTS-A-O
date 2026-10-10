# x01 signals-only desk, 50 symbols — host runbook (10 Oct)

Real money (BingX mainnet). Start it on a host that stays up; a cloud sandbox is reclaimed when its session ends and takes the desk with it
(the exchange-side stops stay, nothing manages the positions).

## What it runs

- Signals only: every engine strategy type off (`toggles` all false), so the engine's Base combos and tapes are not processed
  (`src/core/active-processing.ts`). Confirmation off (`wf.coord.confirm = false`): it needs engine candidates a signals-only desk does not have.
- 50 pinned symbols (`forceSymbols` in `x01-signals-only.patch.json`, the list of the 12 h rally recording).
- Open signal positions capped at 100 (`signals.maxPositions`, long and short apart; no order cap). Volume factor 1.2 (`live.ratio`,
  operator 10 Oct; the caps still bound the size). Loss guard `--max-loss 2` USDT, free-margin floor from `x01.settings.json`, order tag `CTSV2X_`.
- Measured on the rally window, 12 h + 12 h, replayed from a recorded feed: 5,482 closed signal orders, PF 8.65 closed, **PF 0.60 including open**,
  6,296 positions still open at the end, marked −3,687 %. Peak 2.8 GB resident, event-loop max 91 ms, first compute 4.7 s. The closed PF alone is
  not the result; the open book is larger than the closed book.

## Start

```
cd <checkout>                      # this branch: claude/sim3h-fixes
export BINGX_API_KEY=...           # the x01 account's keys, environment only
export BINGX_API_SECRET=...
docs/live-coordination/start-x01-signals.sh --dry-run      # prints what it would do, starts nothing
docs/live-coordination/start-x01-signals.sh                # asks you to type START
```

The script installs the patch into `$CTS_DESK_DATA/x01/patch.json` (default `/var/lib/cts-a-o/desks`), starts the desk with `launch.sh x01`,
and prints the first status. A fresh data directory starts with no recorded positions: positions the earlier x01 desk opened stay on the
exchange with their stops, untracked by this desk. To continue the earlier desk's identity instead, copy its `live-x01` directory into
`$CTS_DESK_DATA/x01/` before starting.

## Watch

```
CTS_DESK_DATA=/var/lib/cts-a-o/desks docs/live-coordination/x01-status.sh --watch     # every 5 minutes
```

It prints the status file's age (STALE if the desk stopped), open positions, loss check, memory, exchange calls and bans, last compute.

## Revert rules (decide before the start)

- Loss guard trips, or free margin sits at the floor for an hour: pause opening and look.
- Signal PF closed below 1 for six consecutive hours, or exchange and system PF apart by more than 0.5 for three hours: restore the previous
  settings (`launch.sh restart x01` with the earlier patch) and report.
- Host memory above 14 GB, or compute above the cycle budget for an hour: restart with `launch.sh restart x01` (graceful SIGUSR2).

## Stop

`kill -USR2 $(pgrep -f 'core-live-test.mjs --name x01 ')` — state saved, nothing closed.

## Keys

Never commit them. The keys used while this was prepared appeared in a chat transcript; rotate them.
