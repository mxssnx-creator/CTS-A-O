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

Verified on VST (DOGE, outside the desk's universe): partial stops and take-profits on one side beside a closePosition
stop and take-profit, a partial trailing stop, and 70 partial orders after the backstop on one side — all accepted
(≈ 0.6 s an order). Tests: `lane-orders.test.ts` (planner, fills, cancel-before-reduce, trailing both directions,
pacing).

## From here on

No further restructuring on its own: a change follows a reported issue or a poor live result — the live-vs-system
diff (a range or hour where the exchange departs from the system), live validation pausing configs, auto-adjust
widening sets — and is measured as a variant on the same tapes before it becomes a default
(`docs/positive-coordinations.md`).
