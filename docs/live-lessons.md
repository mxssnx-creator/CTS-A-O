# Live lessons (October 2026) — check these before changing the live path

Each entry was found on x01, real money, on 3 October 2026. Each has the same shape as at least one other spot in
the code, so look for the pattern, not only the spot.

## 1. A guard that saturates selects nothing

A rolling statistic over a pooled, high-frequency source with a small window is almost always on the same side.

**Example: Block.** Block levels judged the last 1–8 closes of pooled sources (overall, symbol, direction,
indication). Those sources close thousands of times a day, so:

- 84 % of entries ran at the top level, at 7–8× volume;
- the PF as traded equalled the PF per unit;
- with Normal set to "only when Block raises it", Normal traded nearly everywhere.

**Fix:** `block.window`, so a level judges n × window closes. The sweep picks the value.

**Same shape elsewhere:**

- auto-adjust judges a pooled set on 15 closes;
- the S2 relation count is pinned at its cap;
- signal acceptance counts correlated copies as independent closes.

**Check:** measure the distribution a guard produces in a simulation dump. If more than about 80 % of entries share
one value, the guard is not selecting.

## 2. Clamps that silently override a setting

**Example: range gate.** The code clamped the range gate's min PF to at least 1.1, and the settings check rejected
lower values, so an operator could not judge micro or minimal at the Base minimum of 1.05.

**Fixed:**

- the range gate floor is 1.05;
- the minimal-plus floor is 1.05 (it was 1.2).

**Still snapped by design:** `gates.minPf` (1.05–1.50) and `maxDdtH` (2–35 h). The bounds are now documented on
`Gates`.

**Rule:** a floor that differs from a setting's documented range must be in the setting's doc comment, or the
settings check must reject the value instead of the runtime snapping it.

## 3. A live budget must be filled, spread and stable

The exchange budget is the account exposure cap (5× or 10× equity on about $40). Four failures came up:

- **Too many configs.** Thousands of configs cannot fit. Their targets summed to about $169,000 against a $207 cap,
  so scaling floored every position at the exchange minimum, long and short alike. The book was hedged (net 0.3×
  equity) and only paid fees, and the volume factor had no effect. Fix: `live.top: "fill"`, the best configs by
  score until the budget is used.
- **No per-position cap.** The fill put 8.7× equity net long into three correlated symbols. Fix: set
  `live.maxNotionalUsd`; the fill counts each position at most at that cap.
- **Stopping at the first misfit.** The fill stopped at the first config that did not fit and left half the budget
  unused. Fix: skip it and continue.
- **Re-ranking from scratch.** Every compute (about 90 s) re-ranked all configs, so a config moving a few places
  closed and reopened positions: about 540 fills an hour, with fees near 9 % of equity an hour. Fix: the configs
  kept last step come first (`prefer`, kv `controlTopKept`).

**Rule:** any selection the live path follows needs hysteresis. Find what changes between two consecutive computes
and what that costs at the exchange.

## 4. Changing a config's id is a live trade

An id carries the stop, target and trail. Auto-adjust widens a set's stop, which renames every config in the set.
Their live positions close and reopen under the new ids.

On x01, auto-adjust is nearly frozen: window 100, trigger PF 0.5, recover PF 3. Auto-cost is off too: it only ever
raised the cost and forced a recompute each time.

**Rule:** anything that rewrites a config id, or a parameter inside the id, must carry held positions over.

## 5. Every restart and settings change rebuilds the book

Ten changes in one hour (restarts, cap changes, symbol count, toggles) each rebuilt x01's book, about 50 fills each.

**Rules:**

- batch live changes;
- measure steady-state churn only 15 minutes or more after the last change;
- prefer patch-file changes (applied live) over restarts;
- `launch.sh restart` must re-exec by absolute path. `exec "$0"` failed and left x01 down for 2.5 minutes.

## 6. Read the exchange, not the desk's files

- **Database lags.** The desk keeps its database in memory and snapshots it every 10 minutes, so the file lags.
  Account, positions and stops come from the exchange: `x01-mon.sh`, `core-live-report.mjs ownResults`.
- **Shared account.** Attribute by client order id prefix: `CTSV2X_` is x01, `CTSA` is CTS-A. On 3 October the SOL
  long and short both belonged to x01; the health script had wrongly counted SOL as CTS-A's.
- **Paper is not proof.** Paper PF above 1 is not live profit. Compare the exchange's realized P&L and fees per own
  order for the same hours.

## 7. Evaluate a gate at entry time, never at exit

A group live gate replayed with closes known at exit looked excellent (Long 0.83 → 2.90). Decided at entry, as
live must, every window cut the result (`docs/live-group-validation.md`). Any replay of a gate must use only data
before the entry.

## 8. Ranges that never clear their cost

**Micro.** Targets of 0.10–0.40 % sit at or below the round trip: 0.20 % in the simulation, about 0.15 % measured
live.

**Minimal.** Lost in every window and variant: PF 0.43–0.85, at 0.15 % cost, with 2–4× targets, with tighter
stops.

Both stay evaluable at the Base minimum (operator's choice); the top-config ranking decides whether they reach the
exchange.

**Rule:** a range needs its target to clear the measured cost by a wide margin before it can carry real money.

## 9. On a shared account, count only your own legs

CTS-A shares x01 with the desk. Its protect-gap gate counted every position on the account, including the desk's,
which carry stops but no take-profit orders. The gap read 12 for good, so the gate closed every order pass: CTS-A
placed nothing for an hour, and never repriced its own limits left from the previous session (11 hours old).
Two places did the same count (the book read and the cover pass); both now count own legs only (cts-a #5, #6).

**Rule:** every count that gates an order pass must use the same ownership filter as the pass it gates.

## 10. Ownership must survive a complete fill

CTS-A claimed a leg only while a tagged order on it and the position were visible in the same snapshot, and dropped
a resting entry's claim while the leg had no position yet. A limit entry that filled completely left neither, so the
leg read as foreign: no stop, no take-profit. Two minutes after the gate reopened, four own legs (about $108 on $35
equity) were unstopped. CTS-A was stopped and its book closed by tag; legs are now also claimed from the order ledger
(own entry orders of the last 10 minutes it did not cancel, cts-a #7). A watchdog (`/tmp/claude-0/ctsa/watchdog.mjs`)
stops CTS-A and closes its own legs when one stays unstopped for 30 s.

**Rules:**

- after reopening any gate on real money, check every own leg for a stop within the first minutes;
- close by tag (`flatten`, own net only), never by symbol: a close-out caught three more fills that landed while it
  ran, so repeat it until the tag has no orders left;
- in scripts, never `kill $(pgrep -f <pattern>)`: the pattern matches the shell running it. Use
  `ps -eo pid,args | awk '/pattern/ && !/awk/'`.
