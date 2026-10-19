# Execution fidelity — the system ↔ exchange relation

The relation between what the system recorded (the paper book) and what the exchange executed is the primary
invariant of a live desk. Every comparison, gate, proof and report that reads the exchange record goes through
`src/core/relation.ts`; `src/core/relation.test.ts` must pass.

## What went wrong (14 Oct)

The desk report showed a real PF of 0.20 against the system's 1.36. Nothing traded that badly. The record was
wrong in three ways:

- **Different windows.** The system side read `paper_trades`, which is trimmed to 20,000 rows (oldest
  12 Oct 23:41). Only 46 of 126 exchange signal rows found a counterpart.
- **Manual rows counted as own.** The operator's manual closes (reason `hand`) were counted as the desk's.
- **Restart stops at prices never reached.** The 11 Oct 01:06 relaunch booked 99 stops at their trigger prices:
  −1002.9 % booked, against −58.4 % at market.

Own lanes only, matched against the paper book's own record (`paper_book_trades`, complete since 10 Oct 23:55):

| Window | Own signal lanes | Matched | Exchange PF | System PF |
|---|---:|---:|---:|---:|
| Since 13 Oct 18:55 | 38 | 38 | 2.39 | 1.27 |
| All time | 58 | 42 (16 system rows dropped) | 2.09 | 1.21 |

Since 13 Oct 18:55 there are 6 real positions (own fills, USD) at PF 2.40, +0.22 USD. One further position was
ended by an order not ours and is counted apart.

## The rules

1. **One predicate for an own close.** An own close is one of `exit`, `stop`, `target` or `liq` (a liquidation of
   own quantity is an own loss). The 01:06 restart window's stops are not own (`RESTART_WINDOWS`). Neither are:
   - `hand`: an order that is not ours closed the lane. The operator's quantity is never the desk's.
   - `unverified`: a stop or target that the bars cannot prove was reached.

   Use `OWN_CLOSE_SQL` in SQL and `isOwnClose` / `closeClassOf` in code. A reader that needs every row (the
   writer, the trim, a reconciliation, a test of the writer) carries `// relation: all rows — <why>` beside its
   query. The source scan in `relation.test.ts` fails on any other `FROM` / `JOIN live_lane_trades`.
2. **Count rows that are not own apart.** Never drop them silently. botStats reports `hand` / `unverified` /
   `restart`. relationOf reports them under `counts.excluded`. statistics books a position an order not ours ended
   as reason `hand`, and a position whose cause is not proven (the unverified marker, or a flat marker priced from the
   lane exit or the venue) as reason `flat`: both stay in the balance and are left out of every PF, counted apart.
3. **Manual quantity is never own.** Own quantity is only what own fills prove. The operator's position is never
   closed or re-stopped, and never shapes own exits (liquidation clamp, closePosition). In hedge mode an exit is
   bounded to the own quantity.
4. **Compare over the same window.**
   - The system side is `paper_book_trades`, the book's own record. It is matched on the lane's paper position
     `cfg|sym|side|entryT`, with a Block leg's `|blk:<src>` removed.
   - `db.trim()` never deletes a paper book close that an exchange lane has.
   - The window starts at max(from, the paper book's oldest close). Own exchange lanes before that are
     `outsideCoverage`, never "exchange only".
   - A lane whose paper position is still open is `systemOpen`. A paper position that left the book without a close
     is `systemDropped`.
5. **Two units, side by side.** Per lane (trade %, the matched lanes) and per real position (USD, own fills via
   `statistics.liveTrades`, positions ended by an order not ours or whose cause is not proven, left out). The check
   raises an alarm when the two disagree about PF 1.
6. **One sign and an exact decomposition.** gap = exchange − system: negative means the exchange did worse. The
   prices are E_s (sim entry), E_h (book adoption, `held_px`), E_e (exchange join), X_s (system exit) and X_e
   (exchange exit). For a single-leg lane:
   - entry (adoption) = side · (X_s/E_h − X_s/E_s)
   - entry (join) = side · (X_s/E_e − X_s/E_h): the entry-timing share
   - exit = side · (X_e − X_s)/E_e
   - fees = −(measured cost − model cost)

   The four parts sum to r_ex − r_sys exactly; a property test checks this. Without an adoption price the whole
   entry share is in entry (join). A ladder, or a row without prices, is "undecomposed" and listed as such.
7. **The executable record.** A paper position carries `heldPx`, the market price when the book adopted it (a
   ticker at most 30 s old, else the last 1m close), set once beside `heldAt`. `paper_book_trades` stores `held_px`,
   `entry` and `exit`. `executableR` re-prices a single-leg close at the adoption price, keeping the same exit and
   the same cost. The desk's book line shows PF ideal / executable. heldPx depends on the wall clock, so the golden
   digest drops it: Sim, Base and paper decisions stay bit-identical.
8. **The standing check.** Each desk report (every 5 min) runs `relationCheck` over the last 48 h. It writes
   `doc.relation` to status.json and a stderr line, and raises a warn event at most once an hour per alarm kind. It
   judges only once there are ≥ 20 matched lanes from ≥ 3 events. The alarms:
   - PF exchange / PF system at the join price is outside 0.67–1.5.
   - Exchange-only + unverified rows are more than 20 % of the own rows.
   - Per-position and per-lane PF disagree about PF 1.

   The entry-timing share is reported but never raises an alarm. The check has no trading effect.

## Reader checklist

Before adding or changing a reader of `live_lane_trades`, `live_orders` or `live_fills`:

- Does it judge, accept, prove, adjust or report on results? Then it uses `OWN_CLOSE_SQL` / `isOwnClose`.
- Does it compare with the system? Then it uses `relationOf`, which brings the paper book's own record, the same
  window, the coverage cut and the sign.
- Does it mix trade % with USD? Then it shows both, never one in place of the other.
- Does it need every row? Then it carries `// relation: all rows — <why>`.
- Does `relation.test.ts` pass?

## Where

- `src/core/relation.ts`: `OWN_CLOSE_SQL`, `isOwnClose`, `closeClassOf`, `RESTART_WINDOWS`, `relationOf`,
  `relationMd`, `gapParts`, `executableR`, `relationCheck`, `relationWarnsDue` and `relationLine`.
- The readers:
  - `runtime.server.ts`: `exchangeRecords` (live last-N, engine proof, live validation), `exchangeAccept` (signal,
    direction and engine direction acceptance) and `adjustExchangeTrades` (auto-adjust).
  - `bot-stats.ts`: `botStatsFromRows`.
  - `scripts/core-live-promote.mjs`.
  - `statistics.ts`: `liveTrades` / `buildStatistics`.
- The reports: `scripts/core-live-test.mjs` (live-vs-system.md, `doc.liveVsSystem`, `doc.relation`) and
  `scripts/core-live-diff.mjs` (any desk snapshot, `--since ISO`, `--json`). `src/core/live-diff.ts` stays only
  for the simulated run vs the paper book (sim-vs-paper.md).
