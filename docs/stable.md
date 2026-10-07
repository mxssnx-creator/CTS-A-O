# Stable version — 7 Oct 2026

Operator, 6 Oct night: *mark this version as stable; see the processing and structure as stable; rely on later
issues or poor results to check.* Tag `stable-2026-10-07` (the merge of PR #110 into `main`).

## What is stable

- **Engine stages** Base → Main → Tapes → Real seats → entry → book, with long and short independent (#108), the
  signal-processing fixes (#108) and the live step that never stalls on a request (#111).
- **Live control** (overall mode): lanes merged per symbol × side, one backstop stop per side, the fixes D1, D3–D6,
  a stop-out after a reduce never reopens the same position (`externalCloses`).
- **Live exchange results judge** (`src/core/live-record.ts`): each lane is attributed the exchange's own fill
  prices (`live_lane_trades`, keyed like the paper position: config × symbol × side × entry). Live validation (per
  config and per group), auto-adjust and the acceptance coordinations (engine direction, signal, signal direction)
  read that record once it holds enough closes, and the simulated record until then.
- **Live vs system** (`src/core/live-diff.ts`): every exchange order next to the same paper order, per range and hour,
  written by a desk every round (`live-vs-system.md`) and by `scripts/core-live-diff.mjs` on a snapshot.
- **Session reports** with per-range and per-side skips, the signal funnel, execution checks and the variants (range
  off, entry crowding, engine direction per indication among them).

## The measured desk (v3) — two 24 h windows, 30 symbols, same code

| window (UTC) | orders | PF unit | net (Σ trade %) | as v1 desk |
|---|---:|---:|---:|---|
| 5 Oct 15:00 → 6 Oct 15:00 | 10,714 | 3.65 | +19,241 | 5,999 · PF 2.36 |
| 4 Oct 15:00 → 5 Oct 15:00 | 7,893 | 2.30 | +10,372 | 4,597 · PF 1.64 |

As sized: 5–6 Oct $10.00 → $14.00 (+40.0 %), PF $ 3.81, 23 / 24 green hours, max drawdown 15.1 %
(`sims/sim24h-2026-10-06/v3b.html`, checks 50 / 51: Axis traded nothing); 4–5 Oct $10.00 → $12.04 (+20.4 %),
PF $ 2.53, 18 / 24 green hours, max drawdown 12.2 % (`v3c.html`, checks 51 / 51).

The v3 desk = `sims/sim24h-2026-10-06/x01-desk.json` (v2: signals active `count 0`, ranking `net`, engine direction
acceptance on with Micro judged per indication, Block off, signals' own last-N off, `minQty` sizing × 2) plus
`wf.entryCrowd {"mc": 3}` (at most 3 Micro configs per symbol × side × bar) and auto-adjust `{window 25,
triggerPf 1.0, recoverPf 1.3}`. The two additions are in the operator's desk patch; the permission rules of this
environment kept them out of the committed desk file.

## Live fixes from the x02 demo desk (7 Oct)

The first hour of the BingX VST desk (v3 desk, 30 symbols) showed control orders working (0 errors, 0 partial
fills, send → confirm ≈ 0.7 s, every position's stop placed ≈ 0.7 s after its open, targets = held within the
rebalance band) and four defects, fixed with tests:

- **A multi-second freeze of the live tick.** Every compute replaced the tapes with a slimmed copy, and the first
  live step after it rebuilt the acceptance indices synchronously (loop max 3.5 s). The full set's indices are now
  carried to the slim set (`carryGuardIndices`): no rebuild, and the record stays the simulation's (all candidates).
  The exchange record is passed per guard (`ExchangeAccept`), never stored on the shared index, so a simulation on the
  same tapes never reads live closes.
- **Trailing stops stood still between computes.** SL and TP crossings were seen at tick time, but a trailing stop
  only moved when the next compute rebuilt the book (minutes). The tick now follows each trailing position's lane bar
  and advances its stop with the simulation's own rule when the bar closes (`tickTrail` / `trailBar`); a rebuilt
  position keeps what the tick advanced (`carryTrail`).
- **Late adoption.** Positions the paper book adopts after a compute (minutes after their bar) were opened at a price
  that had run away: 45 such lanes traded PF 0.38. `live.maxChase` (default 0.25): a lane joins the exchange only
  while the price has run at most that fraction of its target distance past its paper entry; a lane on the exchange
  stays.
- **A held config lost its tape** when its range tape had fewer closes than the range gate (dropped for memory): the
  position was carried without exit tracking. A held config now keeps its tape, held-only.

What the exchange carries per position (since the follow-up below): a close-position stop and a close-position
take-profit. Each lane's own TP, SL and trailing exit is still sent by the desk as a market reduce / close when the
tick sees it crossed — one exchange position holds many lanes with different levels — and the two venue orders are
the position's backstops on either side, for a gap or a desk that is down.

## Follow-up (7 Oct): complete control orders, minimum size, allowed stop distance, a stall-free compute start

- **Take-profit per position.** Next to its stop every position carries a `TAKE_PROFIT_MARKET` (closePosition) 1.2 ×
  the farthest lane target's distance beyond the price (`tpDistFor`; at most 90 %, none for a target further out) —
  never before any lane's own target, so the desk's lane exits come first. Placed at the open (a refusal never closes
  the position), repaired when missing, re-priced only when the farthest target moved past it or it was left far out
  (`tpFits`, at most once a minute), removed while a lane without a target is on the position (trailing free with its
  trail armed). Long and short alike: SELL above the price for a long, BUY below for a short.
- **Closes by the exchange are booked at the order that filled** (`closedBy`): the take-profit gone and the stop
  resting → a take-profit exit at its price (`live_lane_trades.reason = "target"`); the stop gone → a stop exit; both
  resting → by hand; both gone → the level nearer to the price.
- **A stop is never loosened by a moving price.** The backstop sits 1.2 × the widest lane stop's distance from the
  price (1 % … 20 %); a resting stop tighter than that is now kept while it lies beyond every lane's own stop
  (`ControlTarget.stopPx`) — the 1 % floor no longer walked it away from a pullback, nor a rally widened it. Lanes
  that trail move it with them, up for a long and down for a short. While a lane's stop lies beyond the 20 % cap
  (signals' 24 % stops) the backstop stays a 20 % gap guard measured from the price, so slow moves never cut a lane.
- **Allowed stop distance, automatically:** at least the venue's clearance (as before: a "too close" refusal widens
  it and is learned), and now never past the liquidation price the exchange reports for the position — kept 80 % of
  the way to it at most (cross margin on a large account reports none: unchanged).
- **Minimum size:** `live.positionSize: "min"` holds every exchange position at `ratio` exchange minimums whatever
  its lanes (x02: ratio 1 — the minimum itself). The position opens with its first lane and closes with its last,
  never resized; every symbol × side the paper book holds fits the budgets.
- **Completeness in the desk log:** `control orders: N positions · N stops · N take-profits` each round, with the keys
  missing either (`ControlStatus.protect`), and `control keys: …` naming why a paper key has no exchange position
  (`KeyFunnel`).
- **The compute start no longer stalls the tick:** the tape compaction runs in slices (`slimTapes` → `drive`), and
  desks skip the preset comparison (`CTS_CORE_COMPARE=0`, 72 s of a 188 s compute).

## Lane control orders (7 Oct, `live.laneOrders`)

The operator: "still less control orders". One exchange position holds every lane of its symbol × side (873 paper
lanes on 31 positions on x02), so the venue carried one stop and one take-profit per position. With
`live.laneOrders: true` every lane the exchange holds is one exchange minimum and carries its **own** orders
(`lane-orders.ts`):

- a partial `STOP_MARKET` (kind V) at the lane's own stop — a trailing lane's stop is moved on the exchange as the
  desk trails it, bar by bar like the simulation, toward the price only;
- a partial `TAKE_PROFIT_MARKET` (kind Y) at the lane's own target (none for a lane without one);
- the closePosition backstop (kind S, 1.2 × the widest lane stop) behind them all; no position-wide take-profit.

The venue executes each lane's exit at its level whatever the desk is doing (a compute, a stall, a restart). A lane
order that fills is that lane's exit — booked at the fill in `live_lane_trades` (reason stop / target), its sibling
cancelled (the venue links nothing), the lane held back so it is never reopened. A lane that leaves the paper book has
its orders cancelled before the position is reduced; a cancel refused because the order filled is that exit, never a
second one. A lane counts with the quantity it entered with (the exchange minimum is 2 USDT ÷ price: it moves).
At most 60 lane orders a step, 4 in flight (different lanes side by side), every stop before any take-profit. If the backstop cannot be placed while lane stops
rest, the position is not closed for it (retried later).

**The venue's limits (x02, 7 Oct).** BingX caps an account's open TP/SL orders at **200** (every symbol together):
the first rollout filled it (31 backstops + 169 lane stops) and was refused from then on ("The number of your TP/SL
orders has exceeded the limit"); retried every step, the refusals drew BingX's error-rate ban (110206: "over 20 …
requests within 480000 ms … can retry after time") on the order endpoint — which then refused two backstops as well.
So: the desk keeps at most `live.maxVenueOrders` (default 190) own TP/SL orders; every position's backstop comes
first (the lane orders farthest from triggering are cancelled to make room for a missing one); the lane orders
nearest to triggering take the rest — about 1 in 6 lane exits on x02's 1,000 lanes; the others exit through the desk
at market when their level is crossed, as before. A "limit exceeded" answer pauses new lane orders for 2 minutes, a
lane refused otherwise backs off on its own, and a 110206 answer pauses the endpoint until its retry time.

**Two control-order modes** (Settings → Live → Control orders; operator, 7 Oct): *overall* (`live.laneOrders` off) —
per symbol × direction only: one stop beyond the position's outer stop range and one take-profit beyond its outer
target, the partials (each lane's own exits) by the system; lane orders left from a partials run are cancelled.
*partials* (`live.laneOrders` on) — each lane's own stop and take-profit on the exchange within the venue budget, the
position's stop behind them. Under a full budget, the farthest resting lane orders give their slot to candidates
less than half as far from triggering (at most 4 a step).

Verified on VST (DOGE, outside the desk's universe): partial stops and take-profits on one side beside a closePosition
stop and take-profit, a partial trailing stop, and 70 partial orders after the backstop on one side — all accepted
(≈ 0.6 s an order). Tests: `lane-orders.test.ts` (planner, fills, cancel-before-reduce, trailing both directions,
pacing).

**Readiness judges what the desk sends (x01, 7 Oct).** The mainnet readiness check (simulated run PF ≥ min and
stable) read the whole run: 0.73 over 17,485 orders, the engine's ranges under 1 after the 02:00 crash (General 0.81,
Long 0.68), while the Signals stood at 1.58 over 9,685 — so a desk sending Signals only (operator: "Put Signals live
on x01 NOW") opened nothing. When `live.source`, `kinds`, `excludeRanges` or `plainOnly` narrow what reaches the
exchange, the check now reads the run over those configs' orders (`runSubset`: the closed orders and the ones open at
the end marked to market; the closed ones per 8-hour block for stability — the walk-forward's own rule, now one
function). The reason names the subset ("simulated run of what this desk sends (signals, without wide: 9,685
orders) PF …"). It is never switched off by this: a desk whose sent configs lose in simulation still opens nothing.
Tests: `readiness.test.ts`.

**Auto-adjust reaches the sets it judges (x02, 7 Oct).** The engine's sets lost in the 02:00 crash (paper since 00:55:
General 200 orders PF 0.07, Long 203 PF 0.27, Short 583 PF 0.44 — 882 of the 986 engine orders were longs; in the
hour before, Long PF 11, Short PF 32; the Short range's 104 shorts made PF 5.3). The adjuster stepped 23 engine sets to
levels 1–4, but its steps are an absolute minimum stop / trail (1.2–1.4 %), under the sets' own stops (1.6–6.4 %): it
changed nothing they traded, and every new close stepped a set again on the same crash losers still in its window.
Two levers, off by default (the defaults are unchanged): `adjust.slScale` / `trailScale` widen a failing set's own
stop / trailing distance per level (× 1 + level × scale, up to `scaleMax`; an ATR protect's stop multiple likewise,
its target kept), and `adjust.stepEvery` asks for that many new closes after a step before the next. Operator, 7 Oct:
"if strategies configs sets fail … adjust trail ranges and min sl distances until its working on live, then put the
working ones live on x01" — on for both desks (x02 tests on the demo exchange; x01's engine keeps the same sets while
it sends Signals only). In the crash, wider stops did not survive (paper: stops of 6.4 % lost as the 3 % ones did);
trailing did better than no trailing at every stop size — the live record decides. Tests: `adjust.test.ts`.

**Promotion from the demo twin (x02 → x01, 7 Oct).** "… then put the working ones live on x01": an engine range
reaches x01's exchange once x02's own exchange record (live_lane_trades) proves it — its last 30 closes there (at
least 20) at PF ≥ 1.2 — and leaves again under PF 1.0 (`src/core/live-promote.ts`, `scripts/core-live-promote.mjs`,
run every 10 minutes). Every range starts off; the decision is x01's `live.excludeRanges` (with `source: "all"` and
`kinds: normal / trailing` — the Axis / DCA ladders are not ranges and stay off), so a range left out keeps computing,
paper-trading and auto-adjusting on x01 too. Signals are not managed by it (the readiness check and the live
validation judge them). First decision (x02, 04:36): Short on (last 30 closes PF 3.40), General off (0.01), Long off
(0.69). x01's readiness check then reads the Signals and the Short range together. Tests: `live-promote.test.ts`.

**A restart continues the paper book (x02, 7 Oct 04:42).** Deploying (SIGUSR2, then the same command) closed 21
of x02's 34 exchange positions within a minute of the first compute: the paper book carries the open positions — the
ones whose configs are no longer selected stay held, and their configs keep a tape — but it is not a durable key, so a
desk process found it only in the snapshot, which `start()` restores after the runtime read the book in its
constructor: the book started empty, those configs got no tape, their lanes left and the control closed the
positions. `start()` now reads the book again once the snapshot is restored (event "paper book continued from the
snapshot: N open position(s)"). Every deploy today before this fix ran the same risk; 04:35 was the first with many
held unselected configs (after the crash, live validation had paused them). Test: `runtime.test.ts` (fails without
the fix).

**Live-speed and venue fixes (7 Oct).** (1) The venue-budget trim cancelled one lane order every second on x02: it
trimmed to the line new orders fill up to, so one order over it (a new position's backstop) was cancelled and placed
again each step — it now trims only 2 orders above that line (still 3 under the venue cap for missing backstops).
(2) The ledger trim's "last flat marker of this key" lookup scanned the whole table per row (2.9 s at 10,000 day-old
rows on held keys, every 30 s, growing with the ledger): an index on `live_orders (cfg, kind)` makes it a seek (20,000
rows ≈ 60 ms). (3) The stall watch named the last live phase while no step ran; the phase is cleared when a step ends
and `pendingEntries` has its own label. (4) The desk report's indication table (every tape and candle, 2–4 s in one
piece each half hour) yields every 12 ms. Tests: `lane-orders.test.ts` (no churn one over the line),
`control-audit.test.ts` (index seek, trim time).

## From here on

No further restructuring on its own: a change follows a reported issue or a poor live result — the live-vs-system
diff (a range or hour where the exchange departs from the system), live validation pausing configs, auto-adjust
widening sets — and is measured as a variant on the same tapes before it becomes a default
(`docs/positive-coordinations.md`).
