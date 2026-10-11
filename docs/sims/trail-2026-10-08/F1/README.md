# Trail sweep F1 — two 12 h windows, signals only

Desk: `docs/sims/trail-2026-10-08/desks/F1.json` (used as is). Engine grids on, engine execution off (`kinds: ["trailing"]`, `source: "signals"`). Signal Normal stops 1.5 / 2 / 3× target; trailing distances 0.2 / 0.3 / 0.4 of target with trail stop 2×; hold 12 h; 20 symbols; signal confirmation on (`wf.coord.confirm: true`).

Run command (each window one after the other, detached):

```
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3 node --max-old-space-size=8192 --expose-gc --experimental-strip-types --no-warnings scripts/core-session.mjs --symbols 20 --pre 24 --run 12 --focus all --desk docs/sims/trail-2026-10-08/desks/F1.json --balance 20 --max-wait-min 300 --end-at <END> ...
```

| window | NAME | run (UTC) | `--end-at` |
|---|---|---|---|
| latest | `w-latest` | 7 Oct 12:00 → 8 Oct 00:00 | 2026-10-08T00:00:00Z |
| 6 Oct rally | `w-rally` | 5 Oct 15:00 → 6 Oct 03:00 | 2026-10-06T03:00:00Z |

Both windows: `balance $20.00`, 24 h pre-historic, 12 h run. Both processes exited with code 1 because the report's checks failed (see below); the reports were written in full.

## Result

**Engine orders: 0 in both windows** (signals-only). The report's "Engine (no signals)" row is 0 orders, the engine's signals block reports 0 orders and 0 trades, and `raw.json` holds no closed trades and no open orders in either window. Engine seats: 0 engine configs in both windows (signal configs only, 3,780 in the latest window).

Every order count is 0, so every PF, net and open-order figure below is empty or zero. PF incl. open is undefined (no gross profit and no gross loss, no open order to mark).

| window | orders closed | Signals | Signals trailing (tr>0) | Signals fixed (tr0) | PF closed | PF incl. open | net closed | net incl. open | open at end |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `w-latest` | 0 | 0 | 0 | 0 | – | – | $0.00 (0.00 %) | $0.00 | 0 |
| `w-rally` | 0 | 0 | 0 | 0 | – | – | $0.00 (0.00 %) | $0.00 | 0 |

Net is in $ as sized; the unit-basis Σ trade % is 0.00 % in both windows.

### Per range (both windows)

| range | `w-latest` orders | `w-latest` PF | `w-latest` net | `w-rally` orders | `w-rally` PF | `w-rally` net |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 0 | – | $0.00 | 0 | – | $0.00 |
| Short | 0 | – | $0.00 | 0 | – | $0.00 |
| General | 0 | – | $0.00 | 0 | – | $0.00 |
| Long | 0 | – | $0.00 | 0 | – | $0.00 |
| Wide | 0 | – | $0.00 | 0 | – | $0.00 |
| Signals | 0 | – | $0.00 | 0 | – | $0.00 |

### Why no signal traded

Signal candidates were all skipped at the confirmation gate (`sig:confirm`), the first gate they failed:

| window | signal candidates skipped | first gate |
|---|---:|---|
| `w-latest` | 50,514 | `sig:confirm` 50,514 |
| `w-rally` | 58,498 | `sig:confirm` 58,498 |

With engine execution off and 0 engine seats, no engine candidate is open on any symbol, so the confirmation rule (a signal enters only while an engine candidate is open on its symbol in its direction) never passes. This is the likely cause; the report does not state it as a finding, and I did not verify it further (no code was changed).

The seat-evaluation table in each `session.md` (section "Seat evaluation") lists simulated entries for the signal configs by Normal and Trailing. These are not executed orders and are not in the book above. For reference: `w-latest` Normal 1,668 / Trailing 1,756 entries; `w-rally` Normal 1,694 / Trailing 1,737.

### Hour by hour

Every hour in both windows: 0 orders closed, PF –, net $0.00, cumulative net $0.00, 0 open positions at the hour end. Cumulative PF –. The report's hourly table lists "flat 12, negative 0, positive 0" for each window.

`w-latest` (7 Oct 12:00 → 8 Oct 00:00 UTC)

| hour (UTC) | orders closed | PF | net | cum. net | open positions at hour end |
|---|---:|---:|---:|---:|---:|
| 12:00 | 0 | – | $0.00 | $0.00 | 0 |
| 13:00 | 0 | – | $0.00 | $0.00 | 0 |
| 14:00 | 0 | – | $0.00 | $0.00 | 0 |
| 15:00 | 0 | – | $0.00 | $0.00 | 0 |
| 16:00 | 0 | – | $0.00 | $0.00 | 0 |
| 17:00 | 0 | – | $0.00 | $0.00 | 0 |
| 18:00 | 0 | – | $0.00 | $0.00 | 0 |
| 19:00 | 0 | – | $0.00 | $0.00 | 0 |
| 20:00 | 0 | – | $0.00 | $0.00 | 0 |
| 21:00 | 0 | – | $0.00 | $0.00 | 0 |
| 22:00 | 0 | – | $0.00 | $0.00 | 0 |
| 23:00 | 0 | – | $0.00 | $0.00 | 0 |

`w-rally` (5 Oct 15:00 → 6 Oct 03:00 UTC)

| hour (UTC) | orders closed | PF | net | cum. net | open positions at hour end |
|---|---:|---:|---:|---:|---:|
| 15:00 | 0 | – | $0.00 | $0.00 | 0 |
| 16:00 | 0 | – | $0.00 | $0.00 | 0 |
| 17:00 | 0 | – | $0.00 | $0.00 | 0 |
| 18:00 | 0 | – | $0.00 | $0.00 | 0 |
| 19:00 | 0 | – | $0.00 | $0.00 | 0 |
| 20:00 | 0 | – | $0.00 | $0.00 | 0 |
| 21:00 | 0 | – | $0.00 | $0.00 | 0 |
| 22:00 | 0 | – | $0.00 | $0.00 | 0 |
| 23:00 | 0 | – | $0.00 | $0.00 | 0 |
| 00:00 | 0 | – | $0.00 | $0.00 | 0 |
| 01:00 | 0 | – | $0.00 | $0.00 | 0 |
| 02:00 | 0 | – | $0.00 | $0.00 | 0 |

## Checks

Both reports print the same line (`log.txt`, last line):

- `w-latest`: `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`
- `w-rally`: `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`

The five failing checks are all "executed orders" checks, and each one fails because its count is 0 (the book is empty in both windows, see the tables above). The report's "Consistency checks: 44 of 49 pass" line matches in both writeups. The report is still written, as the run contract allows.

The variants table was not run (`CTS_CORE_VARIANTS=0`) and the compare run was off (`CTS_CORE_COMPARE=0`), as set in the command.

## Files

- `w-latest/session.md`, `w-latest/writeup.md`, `w-latest/html/` (the HTML report; `data.json` and `index.html`)
- `w-rally/session.md`, `w-rally/writeup.md`, `w-rally/html/`
- `raw.json` was not copied (kept in `runs/`, which is git-ignored).
