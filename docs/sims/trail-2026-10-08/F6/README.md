# Trail sweep F6 — signals only, two 12 h windows

Desk: `docs/sims/trail-2026-10-08/desks/F6.json` (used as is). Branch `claude/sim3h-fixes`, commit `0c8c751` at run start.
Command: `scripts/core-session.mjs --symbols 20 --pre 24 --run 12 --focus all --desk F6.json --balance 20 --max-wait-min 300`
with `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`, `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`, run one after the other.

## Result: no orders in either window

Both windows executed **0 orders**. Every signal candidate was skipped by the `sig:confirm` gate, so nothing traded.
This is not a report fault: `raw.json` agrees (`signals.trades: 0`, `signals.orders: 0`, `openEnd: []`, `engine.realEngine: 0`).

Cause (from the reports' "Why candidates did not execute" table): `wf.coord.confirm: true` lets a signal enter only while an
**engine candidate** is open on its symbol in that direction. With engine execution off and 0 engine configs seated
(`engine.real` = 3,780, all signal configs; `realEngine` = 0), no engine candidate ever exists, so every signal fails confirm.
Window 1: 50,971 candidates skipped, all `sig:confirm`. Window 2: 58,021 skipped, all `sig:confirm`.

Engine orders: **0 in both windows** (signals-only holds).

The sweep therefore gives no PF or net for the trail distances. Setting `confirm` off or running the engine's candidates
would be a change to the desk or code; that is not done here (the desk is used as is, and no code was changed).

## Desk settings (F6.json)

| Setting | Value |
|---|---|
| Symbols | 20 (`symbolRank` volatility1h), forced: XRP, SOL, BCH |
| Pre-history / run | 24 h / 12 h |
| Balance, sizing | $20.00; `minQty`, 2 % |
| Engine toggles | normal off, trailing on, block off, dca off, axis off |
| Live source | `signals`, kinds `trailing`, `excludeRanges: [wide]` |
| Signal stops, normal | `slOfTp` 1.5 / 2 / 3 (× target) |
| Signal stops, trailing | `trailOfTp` 0.2 / 0.3 / 0.4 of target, `slOfTp` 3 (trail stop 3×) |
| Hold | 12 h (`signals.holdH`) |
| Signal acceptance | on (48 h, PF 1.3, ≥ 6 trades); side acceptance on (24 h, PF 1.3, ≥ 20) |
| Confirmation | `wf.coord`: enabled, **confirm on**, hourLock 0, cooldown off, conflict off |
| Engine grids | micro / short / general / long defined; engine execution off (no engine order) |

## Window 1 — latest 12 h (2026-10-07 12:00 → 2026-10-08 00:00 UTC), `w-latest`

| Scope | Orders closed | PF closed | Open at end | PF incl. open | Net closed | Net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| Total | 0 | – | 0 | – | $0.00 (0 units) | $0.00 (0 units) |
| Micro | 0 | – | 0 | – | $0.00 | $0.00 |
| Short | 0 | – | 0 | – | $0.00 | $0.00 |
| General | 0 | – | 0 | – | $0.00 | $0.00 |
| Long | 0 | – | 0 | – | $0.00 | $0.00 |
| Wide | 0 | – | 0 | – | $0.00 | $0.00 |
| Signals | 0 | – | 0 | – | $0.00 | $0.00 |

Signals by stop type: trailing (tr > 0) 0 orders; fixed (tr 0) 0 orders.

Hour by hour (UTC):

| Hour | Orders closed | PF closed | Net | Cum net | Open positions at end |
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

Checks: **`checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`**
(five failed execution checks, all because no order executed: each enabled range and the signals show 0 orders.)

## Window 2 — 6 Oct rally 12 h (2026-10-05 15:00 → 2026-10-06 03:00 UTC), `w-rally`

| Scope | Orders closed | PF closed | Open at end | PF incl. open | Net closed | Net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| Total | 0 | – | 0 | – | $0.00 (0 units) | $0.00 (0 units) |
| Micro | 0 | – | 0 | – | $0.00 | $0.00 |
| Short | 0 | – | 0 | – | $0.00 | $0.00 |
| General | 0 | – | 0 | – | $0.00 | $0.00 |
| Long | 0 | – | 0 | – | $0.00 | $0.00 |
| Wide | 0 | – | 0 | – | $0.00 | $0.00 |
| Signals | 0 | – | 0 | – | $0.00 | $0.00 |

Signals by stop type: trailing (tr > 0) 0 orders; fixed (tr 0) 0 orders.

Hour by hour (UTC):

| Hour | Orders closed | PF closed | Net | Cum net | Open positions at end |
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

Checks: **`checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`**
(same five checks, same cause: 0 orders; 58,021 signal candidates skipped by `sig:confirm`.)

## Files

- `w-latest/` and `w-rally/`: `session.md`, `writeup.md`, `html/` (raw.json not copied).
- Source logs and raw dumps stay in the session's `runs/` folder, which is not committed.

PF "–" means no closed trade (no gross profit or loss), so no PF can be computed, including with open orders.
