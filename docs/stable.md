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

What the exchange carries per position: one close-position stop (the backstop: the widest lane stop × 1.2, at most
20 %). Each lane's own TP, SL and trailing exit is sent by the desk as a market reduce / close when the tick sees it
crossed — one exchange position holds many lanes with different levels, so no single exchange TP / trailing order
can stand for them.

## From here on

No further restructuring on its own: a change follows a reported issue or a poor live result — the live-vs-system
diff (a range or hour where the exchange departs from the system), live validation pausing configs, auto-adjust
widening sets — and is measured as a variant on the same tapes before it becomes a default
(`docs/positive-coordinations.md`).
