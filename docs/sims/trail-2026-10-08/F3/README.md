# Trail sweep F3 — signals only, 12 h hold, 20 symbols (8 Oct)

Desk: `docs/sims/trail-2026-10-08/desks/F3.json` (used as is). Trailing distances 0.4 / 0.6 / 0.8 of target, trail stop 2×.
Two windows, run one after the other: **w-latest** (7 Oct 12:00 → 8 Oct 00:00 UTC) and **w-rally** (5 Oct 15:00 → 6 Oct 03:00 UTC).
Each with 24 h pre-history, 20 symbols, balance $20.

**Result in one line: both windows executed zero orders.** Every signal candidate was stopped by the `sig:confirm` gate,
so there is nothing to compare against V0 and F3 cannot be adopted or rejected on these two windows.

## Desk settings (from F3.json)

| setting | value |
|---|---|
| symbols / symbolRank | 20 / volatility1h |
| signals enabled, source | on; `live.source` = signals; `live.kinds` = trailing |
| signals.normal stop ÷ target | 1.5 / 2 / 3 |
| signals.trailing.trailOfTp | 0.4 / 0.6 / 0.8 |
| signals.trailing.slOfTp (trail stop) | 2 |
| signals.holdH | 12 |
| wf.coord | enabled, confirm **true**, hourLock 0, cooldown off, conflict false |
| signals.accept | enabled, minPf 1.3, hours 48, minTrades 6 |
| signals.sideAccept | enabled, minPf 1.3, hours 24, minTrades 20 |
| engine toggles | normal false, block false, dca false, axis false, **trailing true** |
| engine grids | present (`grid` block), execution off per brief |
| sizing | minQty, pct 0.02 |

Note on `engine toggles.trailing: true`: the desk file has it set, while the brief describes engine execution as off.
Engine orders were 0 in both windows, so the result does not depend on this flag. It is recorded here as found.

## Checks

- **w-latest:** `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`
- **w-rally:** `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`

The five failing checks are the execution checks that expect each enabled range and the signals to trade. Each one fails
because that range or signals executed 0 orders. The report still wrote all its files. Skip counts from the report:
- w-latest: Signals 45,234 skipped, all `sig:confirm`.
- w-rally: Signals 52,348 skipped, all `sig:confirm`.

The report shows 0 engine configs seated in both windows (`Real seats: 0 engine configs + 3780 signal configs`), and
engine execution is off. So no engine candidate exists for `confirm` to match. This is an inference from the report, not
a separately tested cause.

Engine orders: **0 in both windows** (signals-only run, as required). Both `raw.json` files give `trades: 0` and `openEnd: 0`.

## Window 1 — w-latest (7 Oct 12:00 → 8 Oct 00:00 UTC)

### Totals and per range

PF incl. open is undefined here: there is no gross profit and no gross loss, so the ratio is `–`.

| range | orders closed | PF closed | open orders at end | PF incl. open | net closed | net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 0 | – | 0 | – | $0.00 | $0.00 |
| Short | 0 | – | 0 | – | $0.00 | $0.00 |
| General | 0 | – | 0 | – | $0.00 | $0.00 |
| Long | 0 | – | 0 | – | $0.00 | $0.00 |
| Wide | 0 | – | 0 | – | $0.00 | $0.00 |
| Signals | 0 | – | 0 | – | $0.00 | $0.00 |
| **Total** | **0** | **–** | **0** | **–** | **$0.00** | **$0.00** |

Net is in dollars from the report's sized result. The brief asks for net as unit Σ trade %, and with no trades that is 0 %.

### Signals by stop type

| stop type | config id | orders closed | PF closed | net |
|---|---|---:|---:|---:|
| trailing (tr>0) | — | 0 | – | $0.00 |
| fixed (tr0) | — | 0 | – | $0.00 |

### Hour by hour (UTC)

| hour | orders closed | PF closed | net | cum net | open positions at hour end |
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

Hours positive 0 of 12, flat 12, negative 0.

## Window 2 — w-rally (5 Oct 15:00 → 6 Oct 03:00 UTC)

### Totals and per range

| range | orders closed | PF closed | open orders at end | PF incl. open | net closed | net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 0 | – | 0 | – | $0.00 | $0.00 |
| Short | 0 | – | 0 | – | $0.00 | $0.00 |
| General | 0 | – | 0 | – | $0.00 | $0.00 |
| Long | 0 | – | 0 | – | $0.00 | $0.00 |
| Wide | 0 | – | 0 | – | $0.00 | $0.00 |
| Signals | 0 | – | 0 | – | $0.00 | $0.00 |
| **Total** | **0** | **–** | **0** | **–** | **$0.00** | **$0.00** |

### Signals by stop type

| stop type | config id | orders closed | PF closed | net |
|---|---|---:|---:|---:|
| trailing (tr>0) | — | 0 | – | $0.00 |
| fixed (tr0) | — | 0 | – | $0.00 |

### Hour by hour (UTC)

| hour | orders closed | PF closed | net | cum net | open positions at hour end |
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

Hours positive 0 of 12, flat 12, negative 0.

## Summary

| window | orders closed (total / Signals / trailing / fixed) | PF closed | PF incl. open | net incl. open | open at end | checks |
|---|---|---|---|---|---|---|
| w-latest | 0 / 0 / 0 / 0 | – | – | $0.00 | 0 | 44/49 ok (5 failed, see above) |
| w-rally | 0 / 0 / 0 / 0 | – | – | $0.00 | 0 | 44/49 ok (5 failed, see above) |

## Files

Each folder has `session.md`, `writeup.md` and `html/` from its run. `raw.json` is not copied, per the brief.
- `w-latest/` — 12 h, 7 Oct 12:00 → 8 Oct 00:00 UTC
- `w-rally/` — 12 h, 5 Oct 15:00 → 6 Oct 03:00 UTC

Run commands and logs are in `runs/w-latest/` and `runs/w-rally/` (not committed, the `runs/` directory is git-ignored).
