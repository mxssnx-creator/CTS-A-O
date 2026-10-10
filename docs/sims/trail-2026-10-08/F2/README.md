# Trail sweep F2 — signals only, two 12 h windows

Desk: `docs/sims/trail-2026-10-08/desks/F2.json` (used as is). Engine grids on, engine execution off. Signals only:
signal Normal stops 1.5 / 2 / 3× target; trailing distances 0.3 / 0.4 / 0.5 of target with trail stop 2×; hold 12 h;
20 symbols; signal confirmation on. Balance $20.00, 10× leverage, 0.20 % round trip per close.

Command per window (`scripts/core-session.mjs`, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`,
`--symbols 20 --pre 24 --run 12 --focus all --balance 20 --max-wait-min 300`), run one after the other.

| Window | End (UTC) | Run (UTC) | Pre-historic (UTC) |
|---|---|---|---|
| w-latest | 2026-10-08 00:00 | 7 Oct 12:00 → 8 Oct 00:00 | 6 Oct 12:00 → 7 Oct 12:00 |
| w-rally | 2026-10-06 03:00 | 5 Oct 15:00 → 6 Oct 03:00 | 4 Oct 15:00 → 5 Oct 15:00 |

## Result

**Both windows traded nothing.** Engine orders: **0** in both (raw.json `trades` is empty). Signal orders: **0** in
both. Every signal entry candidate was skipped by the `sig:confirm` gate: 48,133 in w-latest, 55,377 in w-rally
(report: "Every entry candidate … the run skipped", table "Signals | sig:confirm"). The per-config figures in the
report (for example `signal:ichimoku` 39 closes, net −286.75) are independent per-config evaluations on each config's
own closes, not the executed book; the book is 0 in every range.

Per range, orders closed, PF closed, open at end, PF incl. open, net closed and net incl. open are all 0 / – / 0 /
– / $0.00 (0.00 %) / $0.00 (0.00 %) in both windows. PF is undefined with no closed or open orders (gross profit and
gross loss are both 0).

### Window w-latest (7 Oct 12:00 → 8 Oct 00:00 UTC)

| Scope | Orders closed | PF closed | Open at end | PF incl. open | Net closed (Σ trade %) | Net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| **Total** | 0 | – | 0 | – | 0.00 % ($0.00) | 0.00 % ($0.00) |
| Micro | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Short | 0 | – | 0 | – | 0.00 % | 0.00 % |
| General | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Long | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Wide | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Signals | 0 | – | 0 | – | 0.00 % | 0.00 % |

Signals by stop type: trailing (tr>0) 0 orders, fixed (tr0) 0 orders.

Hour by hour (report hourly table; every hour identical):

| Hour (UTC) | Orders closed | PF closed | Net | Cum net | Open at hour end |
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

Checks line (log.txt, last line): `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh
executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`
The five failing checks each show 0 executed orders where the check requires orders (Micro, Short, General, Long and
Signals). The report was written anyway.

### Window w-rally (5 Oct 15:00 → 6 Oct 03:00 UTC)

| Scope | Orders closed | PF closed | Open at end | PF incl. open | Net closed (Σ trade %) | Net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| **Total** | 0 | – | 0 | – | 0.00 % ($0.00) | 0.00 % ($0.00) |
| Micro | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Short | 0 | – | 0 | – | 0.00 % | 0.00 % |
| General | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Long | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Wide | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Signals | 0 | – | 0 | – | 0.00 % | 0.00 % |

Signals by stop type: trailing (tr>0) 0 orders, fixed (tr0) 0 orders.

Hour by hour (report hourly table; every hour identical):

| Hour (UTC) | Orders closed | PF closed | Net | Cum net | Open at hour end |
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

Checks line (log.txt, last line): `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh
executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`
Same five failing checks, each at 0 executed orders. The report was written anyway.

## Guard before publishing

`node --experimental-strip-types --no-warnings --test src/core/report-page.test.ts`: 2 / 2 pass (after `npm ci`
installed the declared `typescript` dependency; before that the test could not load the package).

## Files

- `w-latest/session.md`, `w-latest/writeup.md`, `w-latest/html/` (index.html, data.json)
- `w-rally/session.md`, `w-rally/writeup.md`, `w-rally/html/` (index.html, data.json)
- `raw.json` (2.3 MB per window) is not copied.

## Open question

With engine execution off, `sig:confirm` blocked every signal candidate in both windows. The confirmation rule
(docs/positive-coordinations.md) needs an engine candidate open on the symbol in the signal's direction, and this
desk runs the engine grids without executing. Why no candidate counted here is not verified; this is what the
numbers show.
