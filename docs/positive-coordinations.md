# Positive coordinations — keep them

The operator's standing instruction: the coordinations below were validated as positive and stay on in every future
change (code defaults, presets, x01's settings and patches). A change that turns one off or weakens it needs a new
causal comparison that beats it, recorded here. `src/core/positive-defaults.test.ts` pins the code defaults, and a
desk prints a warning at start and on every patch that leaves one of them off (`positiveCoordWarnings`).

| Coordination | Setting | Evidence |
|---|---|---|
| Signal confirmation: a signal enters only while an engine candidate (taken or not, since 6 Oct — see below) is open on its symbol in its direction | `wf.coord = { enabled: true, confirm: true }` | 8 causal days × 12 symbols: signal PF 1.32 → 1.58, drawdown halved (signals-validation.md). x01 paper, 15 h on 5 Oct: confirmed signal trades PF 7.29 (595, +27.5 %), unconfirmed PF 0.57 (333, −10.4 %) |
| Hour lock, losing-hour cooldown, opposite-entry blocking | `coord.hourLock 0`, `cooldown "off"`, `conflict false` | each cost net on every variant (signals-validation.md) |
| Signal acceptance (source × symbol × direction × type) | `signals.accept = { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 }` | without acceptance signal units PF 0.4–0.7; the operator's evaluation is PF 1.3 |
| Signal direction acceptance (each side's signals pooled — the run's active candidates, counted per signal entry since 6 Oct) | `signals.sideAccept = { enabled: true, minPf: 1.3, hours: 24, minTrades: 20 }` | x01, 48 h on 5 Oct: long PF 3–44, short PF 0.1–0.3 per 12 h |
| Signals trade their own base | `signals.ownBase: true` | the engine's Normal off / Block Active skip left signals ~16 closes a day |
| Signal volatility floor | `signals.filter.volFloor: 0.003` | the move must be worth the 0.2 % round trip (worst drawdown 523 vs 660) |
| Engine direction acceptance (type family × range × side) — **operator: ON, 6 Oct evening** (see below) | `wf.engineSideAccept = { enabled: true, minPf: 1.05, hours: 24, minTrades: 30 }` — code default on since 6 Oct evening (off earlier that day) | x01 paper replay, 5 Oct: opened shorts PF 1.25 / held 0.51; everything opened PF 1.70 vs 1.0. Same tapes, 12 symbols, 6 h + 6 h, 5–6 Oct: OFF let in 187 shorts at PF 0.05 (net −2,222 % in trade units), the window's PF 3.62 → 1.82 |
| Normal and Trailing enabled and running, Block Active off | `toggles.normal: true`, `trailing: true`, `blockActive: false` (code default) | operator, 5 Oct: with Block Active (minimum level 5) only Block-raised entries opened — a 2 h Micro run traded Axis alone |
| Axis on x01 | `toggles.axis: true` | profitable on both sides on x01 (24 h: long PF 1.37, short PF 1.19) |
| DCA off on x01 | `toggles.dca: false` | lost in every last-N variant of the x01 simulation (PF 0.60–0.81) |
| Base builds a pair's sets from PF 1 up | `gates.baseSetsMinPf: 1` (code default) | operator, 5 Oct: "it is about the stage Base eval for sets with PF 1+ — that unfiltered sets come out under PF 1 is normal; keep all processing and validate the better ones by PF and DDT". Every set still clears its own stage / range minimum before it trades, so this widens what is computed, never what trades |
| Sample warm-up: a drawdown that cannot be computed yet is valid until it can | `gates.warmup: true` (code default) | operator, 5 Oct: "if no DDT available because of too few previous positions, calculate as valid until enough exist, then evaluate normally". It waives the DRAWDOWN half (DDT, DDR) of a last-N window shorter than N, a symbol the config has no close on yet, and fewer than two stability blocks. The RESULT half is never waived: a config without its last-N closes still does not clear a last-N PF gate. Measured (12 h / 20 symbols / every range, 5 Oct): waiving the result half as well let 8,427 extra orders through on samples of a few closes and took the window from PF 1.108 (net +2,527 % in trade units) to PF 0.818 (net −14,467 %) — mostly Micro and Minimal cells whose last-50 range gate was waived |
| Independent configs: every config of every Base-validated pair is its own seat (all strategy types, all cells), evaluated on its own results | `wf.seatPer: "config"` (code default; x01) | one seat per pair × family traded only the best-scored config of each set; independent configs are pinned in independence.test.ts |
| Base-validated targets: the tape stage builds only the range targets whose Base cells passed | `grid.baseTargets: true` (code default) | two causal windows, 20 symbols, 2 h pre + 2 h run (5 Oct 12:00Z / 06:00Z): identical passed sets (2/2 and 10/10 Micro normal, 0/0 and 8/8 trailing) and identical orders, with 29–36 % fewer Micro sets built, 40–50 % fewer Micro configs evaluated, the evaluated pool's median PF up (0.45 → 0.51, 0.48 → 0.58) and compute 162 → 93 s / 147 → 97 s |
| Live fill within every budget | kept configs held to the budget; exposure, stop-risk and worst-case budgets | kept whole, the fill overshot ~6× and every position was squeezed to the exchange minimum |
| Allocator caps for every long-running process | `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576` | without them x01 held 11 GB RSS on a 2.6 GB heap |

## Operator overrides of a measured coordination

6 Oct — **engine direction acceptance off; Long and Short always run both directions.** The comparison above does NOT
beat the coordination: on the same tapes switching it off let in 187 shorts at PF 0.05 and took the window from PF 3.62
to 1.82 (net −37 %). Shown to the operator before the decision; the operator chose both directions anyway and asked for
every losing config to be listed by direction with its stop / target ratio, trail distance and stop distance, so the
losing geometry can be fixed at its source rather than gated (the Base min-PF sweep session lists them per run). The
code default stays off, as it was; the signals' own direction acceptance (`signals.sideAccept`) and the symbol gate
stay on. The Settings page states the measured cost next to the switch.

6 Oct — **Micro's stop floor 0.2 % net of the position cost, computed from the cost; Micro stop ratios up to 5×.**
`grid.micro.minSlNet: 0.002` (code default): every Micro cell is evaluated and traded at a stop of at least
0.2 % + the round-trip cost (0.4 % at today's 0.2 %; the measured live cost raises it), in place of the blanket 0.5 %
evaluation floor (which stays for every other range). `MICRO_SL` runs 1 … 5 (was … 3.5) and Micro's Base tries 5× as
well. The 5 Oct measurement above found the reward:risk ≥ 1 region losing and Micro earning only at stops 2.75–3.5×
its target — the ladder now reaches further into that band, and the floor change is the operator's decision, measured
by the range session runs (Micro old floor / new floor, ladder 3.5 / 5) before x01 trades Micro.

6 Oct — **Minimal's stops and trailing floor widened.** `MINIMAL_RANGE.slOfTp` 1.5 / 2 / 2.5 / 3 (was 1 / 1.5 / 2),
`minSl` 0.6 % (was 0.5 %), `minTrail` 0.3 % (was 0.2 %) — the operator's decision. The one measurement on record
(12 h, 5 Oct, "Stop ratio by range") had Minimal best at 2.0×, the top of the old ladder, and worst at 1.0×; the
range runs compare the old and the new ladder before x01 trades Minimal.

6 Oct — **excluding "wide" leaves out only the Wide grid.** On x01 `live.excludeRanges: ["wide"]` matched every
untagged id, so every signal config and every Axis / DCA ladder was held back with the Wide grid (Signals paper PF
12.5 at the time). Fixed in code (`rangeExcluded`); x01's patch dropped the exclusion when it switched to signals
trailing plain at volume factor 500 on every evaluated symbol, loss bounds 0.50 / 0.50 unchanged.

6 Oct — **Long and short run independently, everywhere** (operator: "Always process long and short both and make
sure it runs independently"). No coordination above is switched off; the ones that pooled both directions now
judge each direction on its own record:

- **One position slot per config × symbol × direction.** Every simulator (Normal / Trailing `simulate`, DCA and DCA
  Active, Axis revert and desk, Axis per range, Base's `runCombo`) held one slot per config × symbol: an open long
  dropped every short signal until it closed (and its pending intent was 0). Each direction now runs on its own
  side-filtered copy of the signal (`splitSides` / `bothSides` in backtest.ts) and the results merge; a one-sided
  signal runs once on the signal itself — the old result bit for bit (pinned in `sim/both-sides.test.ts`). Base's
  per-symbol stats are over the merged closes. Compute: a combo whose signal has both directions simulates twice.
- **Symbol gate default `provenSide`** (was `proven`, both sides' closes pooled). The gate stays on — same rule, on
  the entry's own direction. The settings page falls back to it as well.
- **Last-N execution gates per direction** (`lastNSideOk`): the `lastN` gate and the Normal base PF judge the last N
  closes of the entry's side. On a tape whose last closes are all one side it is exactly the old gate. A side with
  fewer than N own closes is held as before (the result half is never waived; `lastNFloor` still admits a shorter
  sample). The **seat validation stays pooled** (`validOk`, also the signals' `signalValid`): a seat is the config as
  one unit, and the entry's own direction is judged by the last-N gate.
- **Signals: active units are pair × symbol × direction** (`sigActiveKey`: `bot|ind|sym|side`). Base keeps per-side
  stats (`SymStat.sides`), the causal ranking (`signalIndex` / `activeSignalsAt`), the hedge keys, the best-first
  order, the simulation's candidates, paper and the pending entries all key by side; a pre-split record without
  `sides` activates both directions as one unit.
- **Signal loss-cluster guard per direction:** a cluster of losing shorts pauses only the shorts.
- **Signal position cap per direction:** `signals.maxPositions` (100) caps long positions and short positions each
  (simulation, paper, pending entries). The engine's `maxPositions` keeps counting both (a measured preset value).
- **Block sources `symbol` and `indication` per direction** (`direction` already was; `overall` and `type` pool by
  definition).
- **Stable-02 symbol windows per direction** (`S2Coord`, found by the 6 Oct regression suite): the last-N window and
  the rolling 24-result PF are kept per symbol × direction, so losing shorts never hold back the symbol's longs. The
  coordination stays on (`coord.s2Windows` unchanged); only its key gained the side. The relation volume is unchanged
  (it already judges `side:` and `leg:` relations apart).
- Keys that could now collide carry the side: the run's dupe check, the Block feed candidate key, the paper position
  id (persisted stop hits written before are still read). `WalkForwardResult` adds `bySide` and `skipsBySide`.
- Unchanged by design: the Stable-02 confluence rule (the documented exception), the signals' own direction
  acceptance (already per side), the engine direction acceptance (per side, off as recorded above).

6 Oct — **signal-processing fixes (operator-requested: "fix the verified signal-processing defects").** No coordination
is switched off; these are defects in how the coordinations above counted or what they judged, fixed in code:

- **Signal confirmation judges the engine candidates, not only the executed orders.** The simulation accepted a
  signal only while an EXECUTED engine order was open on its symbol and side; an engine candidate the engine
  processed but did not take (a cap, a last-N gate, a duplicate) never confirmed. Run A: 112 confirmation refusals
  against 138 executed signal orders. Confirmation now asks whether an engine candidate of the run (taken or not)
  entered at or before the signal and had not closed yet (`coordBlock(…, confirmPool)`; the run counts them per
  symbol × side as they are processed and close). Paper and the pending entries judge the same: the run's engine
  candidates (`sim.feed`, which now carries each candidate's entry) overlapping the entry, the engine tape positions
  open now and the book's engine positions — before, paper looked only at the positions open now.
- **One signal entry counts once** in the signal acceptance (`minTrades` 6), the direction acceptance (`minTrades` 20)
  and the loss cluster (8 losses / 60 min). The k configs of a unit share an entry, so one onset closing in 15–20
  configs reached all three minimums alone. The count is now of entries (indication × symbol × direction × entry
  time); the acceptance PF stays over every close; the loss cluster judges each entry on its first close.
- **Direction acceptance pools the run's active candidates only.** The pooled side record was built from every signal
  tape, active or not (the units the ranking had dropped included). It is now fed from the run's candidates as they
  close (the same feed paper, live and the audit replay). The per-group acceptance keeps the tape record.
- **`signals.count` 50 → 100**, a consequence of the per-side split: a unit is now pair × symbol × direction, so the 50
  measured pair × symbol units are 100 per-side units — the same coverage as the measured setting.
- **The recent validation is unchanged** (a unit needs a close and a positive result in the last `validateH` hours;
  verified in both the Base and the per-step ranking). Requiring one close PER CONFIG (`recentN ≥ 1`, the step
  ranking averages over the configs) left no unit active on the synthetic desk — configs hold up to 48 h — so it is a
  ranking change, not a fix, and is not applied.
- **`signals.sourcesMode`** `"deny"` (default, unchanged: a missing source is on) or `"allow"` (only the sources set
  true run) — a desk listing 12 sources true ran 63 of 96 under the deny-list reading.
- The preset backtest builds its signal tapes with the entry filter (volatility floor) as the compute does; signal
  skips are named `sig:<why>` apart from the engine's; the simulation reports its signal candidates and the inactive
  ones as `signalFunnel`; paper's dropped entries are counted in `status.paperSkips` and live's inactive signal lanes
  in `control.inactiveSignal`; the session report counts seated signal UNITS per step, not every config of a pair.

## Operator decisions that narrow the live book (processing unchanged)

5 Oct, x01: "let only trailing plain and signals trailing plain run live, and increase the vol factor by 5 times.
After that don't touch live any more — just fix issues by regular monitoring, work locally." Applied as
`live.kinds: ["trailing"]`, `live.plainOnly: true`, `live.ratio: 2 → 10`.

7 Oct ~22:45, x01: "Use the dynamic signals stops as validated by x02 run" — `live.kinds: ["trailing"]` (signal
configs whose stop trails). x02 record (snapshot 22:40): simulated book trailing 14,484 closes PF 1.34 vs fixed 2,988
PF 0.81; exchange lane closes trailing 5,953 PF 1.14 vs fixed 1,364 PF 1.05.

8 Oct ~00:20, x01 and x02: "Use v3 .. also for x02 .. change now" — `signals.normal.slOfTp [1.5, 2, 3]` (the code
default; the desks had pinned [3]) and `signals.holdH 24` (was 48): variant V3 of the signal stop / hold comparison
(`docs/sims/sigstop-2026-10-08/`), applied on the operator's call before its results came in. Why it was tested: the
desks' simulated runs showed signals at PF ~1.7 on closed orders while ~7,000 orders stayed open at the end at PF ~0.3
(stops at 3× the target, held up to 48 h: winners close at the target, losers stay open). The V0–V3 results, scored
on PF including the open orders, are recorded in that folder; revert by a patch (the previous desks are backed up).

Every coordination above stays on in processing: Axis, Block, DCA and the Normal base keep computing, validating and
paper-trading, and their record keeps accruing — `live.kinds` only narrows what the live control sends to the
exchange. Positions already held of a kind no longer sent are still managed and closed. Reverting is a patch, not a
code change: drop `kinds` and `plainOnly` (the backup of the previous patch is `patch.json.prev-allkinds`).

Symmetry is pinned as well: `src/core/indications/symmetry.test.ts` fails when an indication or the simulator treats a
falling market differently from a rising one. The Stable-02 confluence port is the one exception: it keeps the desk's
own rule bit for bit (its overlapping RSI bands give 45–55 to long), as validated with the desk's sources.

## x02 VST: every positive-PF set, completely, at the minimum volume factor (5 Oct)

5 Oct, operator: "make sure the calc positive PF work also live — run on x02 VST all positive ones completely,
check live and make sure all running correctly, fix issues. Run with min vol factor." The demo desk is therefore
the mirror image of x01's narrowed live book: nothing is held back from live, and positivity is decided only by
the calculations.

| What the desk runs | Setting (`runs/x02/patch.json`) |
| --- | --- |
| every range | `grid.micro / minimal / short / general / long` all on, plus the Wide grid |
| every strategy type | `toggles` normal, trailing, block, dca, dcaActive, axis on (Axis with its full variant set: 2 modes x 2 hybrids x 5 ranges x 3 level counts) |
| signals with their own sets | `signals.strategies: { dca: true, axis: true }`, `ownBase: true`, the measured-positive sources only |
| no live narrowing | no `kinds`, no `plainOnly`, no `source`, no `maxSymbols`, `maxPositions: 0`, `maxNotionalUsd: 0` |
| every risk budget off | `maxExposureX / maxRiskPct / maxBackstopLossPct / maxPositionX` all 0 — at the minimum size they could only drop sets, never protect anything (equity 475,622 USDT demo) |
| the minimum volume factor | `live.ratio: 1` with `notionalUsd 1`: every order is raised to the exchange minimum, so size is the smallest the venue accepts |
| positivity from the gates alone | per-range PF 1.05, `baseSetsMinPf: 1`, DDT/DDR with the sample warm-up, `liveLastN: 25`, signal acceptance PF 1.3 / 48 h |

Two positive coordinations are kept even here, because they are measurements and not narrowings: **Block Active
off** (with it on, only Block-raised entries open — Normal and Trailing barely run) and the **signal direction
acceptance** at PF 1.3 / 24 h / 20 trades. The desk's start patch had both the other way round and the engine said
so on the spot ("positive coordination: Block Active is on …"), which is what that warning is for.

First compute, 16 symbols, 5 Oct 19:59 UTC — the positive-PF calculation runs for every range at once:

| Range | Base sets passed | median PF of all | PF of the passed sets |
| --- | --- | --- | --- |
| Wide | 418 / 17,952 | 0.52 | **1.53** |
| Micro | 26 / 2,900 | 0.25 | **2.26** |
| Minimal | 717 / 17,952 | 0.71 | **1.58** |
| Short | 692 / 7,696 | 0.78 | **1.55** |
| General | 866 / 7,696 | 0.79 | **1.53** |
| Long | 1,090 / 7,696 | 0.68 | **1.55** |
| Signals | 126 / 126 | 0.84 | **1.25** |

3,935 sets passed of 69,018 evaluated (5.7 %), and the simulated run of what passed came to PF **1.28** over
16,854 orders. The account other systems share carries 29 foreign positions, so their symbols are never touched:
`forceSymbols` is empty and 16 symbols are ranked so enough non-foreign ones remain.

## Micro: the reward:risk ≥ 1 region does not perform — the wide-stop band does (5 Oct)

Operator, 5 Oct: "disable reward risk and other adjustments for range Micro if not performing." Measured on the
8 h / 20 symbols session (`scratchpad/mic/rep-f50.md`, 1,356 Micro positions, range PF 0.64 / 0.72, net −$0.05):
the Micro cells that earn are the ones with a stop **wider** than the target, and every tighter cell loses.

| Micro cell (price target · stop) | reward:risk | positions | wins | PF | net (trade units) |
| --- | --- | --- | --- | --- | --- |
| 0.600 % · 3.00× | 0.33 | 32 | 22 (69 %) | ∞ (no loss) | **+16.00** |
| 0.600 % · 2.75× | 0.36 | 30 | 18 (60 %) | ∞ (no loss) | **+14.40** |
| 0.550 % · 3.25× | 0.31 | 30 | 18 (60 %) | ∞ (no loss) | **+12.60** |
| 0.550 % · 2.75× | 0.36 | 30 | 18 (60 %) | ∞ (no loss) | **+12.60** |
| 0.400 % · 3.50× | 0.29 | 10 | 0 (0 %) | 0.22 | −10.00 |
| 0.550 % · 2.00× | 0.50 | 14 | 0 (0 %) | 0.36 | −10.00 |

So the conclusion is the opposite of the reward:risk framing that motivated the per-range evaluation floor:
Micro earns at reward:risk **0.31–0.36** with a high win rate, not at reward:risk ≥ 1.

- **The per-range `minSlEval` lever stays unset** on every desk. It exists to allow a stop *tighter* than the
  target (reward:risk above 1); the measurement says that region is where Micro loses. The blanket 0.5 %
  evaluation floor stays.
- **A live-settings defect this exposed:** both desks carried `grid.micro.slOfTp: [0.5, 0.75, 1, 1.5, 2]` while
  the code default `MICRO_SL` runs `1 … 3.5`. The desks' ladder stopped at 2×, so the only Micro cells that earned
  (2.75×–3.5×) **could not be built at all**, while the sub-1 ratios it did carry collapse onto the 0.5 %
  evaluation floor and lost at every cell. x02 now runs the full ladder `1, 1.25 … 3.5`; x01's Micro reaches paper
  only (live is signals trailing plain), so it takes the same ladder at its next restart.

## x01: the live volume factor is bounded by the loss bound, not by the factor (5 Oct)

Raising `live.ratio` 2 → 10 → 20 → 60 changed no order size. The engine says why, every compute: *"volume factor
60 has no effect — all 6 positions sit at the per-position cap 5.84 USD (raise maxPositionX / maxNotionalUsd or
lower the factor to size by volume)"*. The chain is `want = notionalUsd x vol x ratio`, then `min(per-position
cap)`, then the common stop-risk and worst-case scalers. With equity 5.84 USDT and `maxPositionX: 1.0` the cap is
5.84 USD, and the stop-risk budget (`maxRiskPct: 0.5`) then scales every target by 0.43 to hold Σ notional x stop
distance at half the equity. Raising the per-position cap does not add volume: the risk scaler would simply scale
further to the same Σ. **The traded volume is at the operator's own loss bound** — every stop hitting at once
costs half the equity — and more volume means a larger loss bound, not a larger factor. The factor stays at 60 so
sizes track the budgets as the equity grows.

## Micro, measured (12 h / 20 symbols / every range, 5 Oct)

Micro passes Base better than any other range and loses forward at every cell. 1,394 normal configs, 480 passed,
median PF **1.646** after Base; traded, its 111 cells came to PF **0.10–0.25** on 2,972 closes.

| sl ÷ tp | cells | closes | win rate | PF |
|---|---:|---:|---:|---:|
| 1.00 | 2 | 50 | 28 % | 0.216 |
| 1.50 | 9 | 274 | 28 % | 0.173 |
| 2.00 | 13 | 396 | 32 % | 0.151 |
| 2.50 | 13 | 336 | 32 % | 0.107 |
| 3.50 | 10 | 222 | 37 % | 0.107 |

| price target | closes | win rate | PF |
|---|---:|---:|---:|
| 0.35 % | 82 | 54 % | 0.145 |
| 0.40 % | 132 | 55 % | 0.178 |
| 0.50 % | 600 | 27 % | 0.101 |
| 0.60 % | 1,006 | 30 % | 0.145 |

The win rate falls as the target grows, which is what near-random movement gives. Every cell has reward:risk at or
below 1, because the 0.5 % evaluation stop floor (`grid.minSlEval`, the operator's blanket rule) is wider than a
0.35–0.45 % target and `MICRO_SL` starts at 1.0 for the rest. At a 55 % win rate a 0.40 % target with a 0.30 %
stop would be PF ≈ 1.6 — that cell is the one the floor forbids.

So Micro keeps computing (its record accrues, its indications can improve) and does not trade as configured. The
lever is `grid.micro.minSlEval` with `grid.micro.minSl`: a per-range evaluation floor, so Micro can be measured at
0.25 % while every other range keeps 0.5 %. Unset by default — nothing changes until a run shows it works.

## Stop ratio by range, one window — measured, NOT applied

Same 12 h run, every traded cell grouped by stop ÷ target. The ranges want opposite things, and the direction is
consistent within each one:

| range | closes | best ratio | PF there | worst ratio | PF there |
|---|---:|---:|---:|---:|---:|
| Long | 1,926 | 0.50 | 2.280 | 0.75 | 1.203 |
| General | 1,765 | 0.75 | 1.802 | 0.50 | 1.572 |
| Short | 5,380 | 2.00 | 1.400 | 1.00 | 1.123 |
| Wide | 5,772 | 1.82 | 1.724 | 1.38 | 0.083 |
| Minimal | 14,326 | 2.00 | 1.022 | 1.00 | 0.741 |
| Signals | 7,434 | 3.00 | 0.743 | — | all below 1 |
| Micro | 2,972 | 1.00 | 0.216 | 2.75 | 0.104 |

The win rate rises with the ratio everywhere (a wider stop is hit less often), so the PF ordering is the part that
carries information: General and Long earn more with stops INSIDE their target, Short, Minimal and Wide with stops
at twice it.

**No default changed on this.** One window, and the cells in it are the ones that passed the gates, so the
comparison is not out of sample. The signal percent targets in particular stay as they are: they were positive in
4 of 4 replay windows (docs/signals-validation.md), and this window's read (targets 4–5 % at PF 0.57–0.75 against
2.5–3 % at 0.82–1.07) is one window against four. A per-range ratio change needs the same multi-window treatment
before it becomes a default.

## Signal ranking and engine direction acceptance, two 3 h windows (6 Oct) — measured, defaults unchanged

docs/sims/sim3h-2026-10-06: the session's variants on its own tapes (PF unit, net Σ trade %).

| variant | 5 Oct 22:00–01:57 | 6 Oct 10:00–13:00 |
|---|---|---|
| baseline (desk of the brief) | 0.57 / −9,645 | 0.38 / −13,328 |
| engine direction acceptance on | 0.54 / −8,866 | 0.88 / −778 |
| every validated signal active (`signals.count 0`) | not measured | 0.40 / −13,294 (+59 orders) |
| 200 active signals | not measured | 0.40 / −13,284 |
| signal ranking net / drawdown | not measured | 0.39 / 0.38 |

Engine direction acceptance cut the second window's loss 17× and did nothing for the first: it stays off (the
operator's decision above). Signals traded 0 orders in both windows: the active ranking (`count 50`, `rank lowdd`)
fills its slots with signals that fire about once a day, and 7,000–10,000 signal candidates per 3 h fell outside it
(now counted as `signalInactive`). `signals.count 0` is the x01 patch the operator asked for
(`docs/sims/sim3h-2026-10-06/x01-signals-patch.json`); the code default stays 50 until more windows decide.

## Minimal's new ladder, two windows (6 Oct) — measured

Same candles, 12 symbols, 3 h + 3 h, desk of the brief with only Minimal's grid changed: the new ladder (stops
1.5–3×, floor 0.6 %, trail floor 0.3 %) against the desk's old one (1–2×, 0.4 % / 0.2 %). Minimal orders 2,465 →
5,460 and 1,678 → 4,098 at PF 0.61 → 0.61 and 0.51 → 0.53: twice the orders at the same PF, twice the loss. The code
default (main) and the desk stay as they are; Minimal now also runs Micro's indications (`grid.minimal.microInds`,
operator 6 Oct) — measured next.

## Engine direction acceptance back ON (operator, 6 Oct evening)

The 24 h run on 30 symbols (docs/sims/sim24h-2026-10-06) measured it on its own tapes: PF unit 1.19 → **2.59**,
net +8,556 → **+23,268 %** (Σ trade %), orders 10,425 → 5,660; the 3 h windows of the same day 0.38 → 0.88 and
0.57 → 0.54. Operator: "Engine direction acceptance on". Code default `{ enabled: true, minPf: 1.05, hours: 24,
minTrades: 30 }` (the measured setting), pinned in positive-defaults.test.ts; a desk that turns it off is warned.
The session variants show it off and each of its parameters (window 3 / 12 / 48 h, PF 1.2 / 1.3, 10 / 60 closes)
next to the as-run row. This supersedes the morning's OFF decision above.

## Block off on the desks (operator, 6 Oct evening) — and what is "wrong" with it

24 h, 30 symbols (docs/sims/sim24h-2026-10-06, Block on as run): Block raised 6,605 of 10,425 orders, 5,400 of them
at the full overall stack (8×: four sources × `maxMult − 1` = 3 each, capped at 8 — overall mode's documented design,
pinned in block.test.ts; the report now says "max 4× per source · stack ≤ 8×"). The raised orders traded PF unit
1.26, the unraised ones 1.58; Short's unraised orders PF 16.4 against 1.19 raised; Micro had no unraised order
at all (PF 0.56). Block raises after recent wins, and in this window results reverted after wins — the premise,
not a code defect. Variant on the same tapes: Block off PF unit 1.19 → 1.42 (net 8,556 → 4,669 %).
Operator: "Disable Block but fix it" → `toggles.block: false` on the desks and the x01 patch; the code default and
Block's computation stay (it keeps computing, and the session variants show it on / off and off per range).

## Ranges trade on earlier results of PF 1.2 (operator, 7 Oct) — reverted to 1.05 the same afternoon

**Status: reverted, 7 Oct ~14:50.** The operator's "positive earlier results PF over 1.2" asked for the simulations'
*results*, not a 1.2 gate: both desks run `gates.rangeMinPf` 1.05 for every range and `grid.rangeGate.minPf` 1.05 again,
as the positive simulations did. The record below stays as the measurement it was.

Operator, 7 Oct ~14:00: "fix Ranges etc to work with positive earlier results PF over 1.2". On both desks (x01 runs
x02's config since 14:10, operator: "Use the same config for x01 as its on x02"): each range's evaluation minimum
`gates.rangeMinPf` micro / minimal / short / general / long 1.05 → **1.2**, and the range gate `grid.rangeGate.minPf`
(last 75 closes; Micro, Minimal, Minimal plus, Short) 1.05 → **1.2**. A narrowing: no coordination is switched off.

| range gate PF (same tapes, 24 h) | as run (1.05) | 1.2 |
|---|---|---|
| s24b | 5,999 orders, net +6,948 % | 5,873 orders, +6,794 % |
| s24c | 4,597 orders, +3,650 % | 4,531 orders, +3,673 % |
| v3c | 7,893 orders, +10,372 % | 7,827 orders, +10,394 % |

Within ±2 % in every window: the gate at 1.2 costs nothing measurable. The per-range evaluation minimum at 1.2 has no
session variant yet — the next sessions measure it. Unchanged: `gates.minPf` 1.05 (the Wide grid's minimum and the
readiness check's), `baseSetsMinPf` 1 (Base keeps building every set from PF 1), and the **engine direction
acceptance at PF 1.05** — at 1.2 it cost net in all three windows (s24b +6,948 → +4,338 %, s24c +3,650 →
+2,699 %, v3c +10,372 → +8,709 %), so the measured coordination stays.

## Live decisions, 7 Oct evening (operator)

- **Auto-adjust off on both desks (7 Oct ~14:40).** It never acted in the positive simulations; live it had widened
  82 of 140 sets on x02 and 69 of 123 on x01, up to 2× their validated stop and trail — the desks' configs no longer
  traded what had been validated. `adjust.enabled false` in both desk patches; the code default stays on until a
  causal comparison decides it.
- **x01 sizing (19:00):** with lane sizing the worst-case budget (every exchange backstop filling at once ≤
  `maxBackstopLossPct` × equity; the signal configs' backstops sit at the 20 % ceiling) sized every position and
  cancelled the volume factor. Operator: medium budgets — `live.maxBackstopLossPct` 0.5 → 0.85, `live.maxRiskPct`
  0.5 → 0.7 (gross ~87 → ~158 USD at equity ~36; worst case ~85 % of equity). The status hint now names the budget
  that scales every position (`controlSizing.scaledBy`).
- **x01 loss limit (19:00):** the larger of 2 USDT and 25 % of the wallet balance, re-read at every check
  (`--max-loss-pct 25`; ~8.4 USDT at a 33.7 USDT wallet).
- **x01 mainnet gates waived (19:00, operator's explicit choice):** the readiness check and the last-N floors
  (25 / 50 / signals 10) were in no simulation; "signals last 10" cut net 30–60 % in all six measured windows
  (v3b 11,147 vs 17,041 net incl. the open book). Waived in the host process (`CTS_CORE_MAINNET_WAIVE_READY=1`,
  `CTS_CORE_MAINNET_WAIVE_FLOORS=1`, `live.requireReady false`).

## Contradicted by the variant tables — measuring on a falling window before any change

Net including the book open at the end, six recorded 24 h windows (v3b, v3c, v2b, s24, s24b, s24c — every one a
rally: v3b traded 10,673 longs and 41 shorts):

| change | windows better | v3b (as run 17,041) | v3c (as run 1,731) |
|---|---:|---:|---:|
| signal acceptance off | 6 of 6 | 19,697 | 1,827 |
| signal confirmation off | 5 of 6 (1 equal) | 20,717 | 2,824 |
| Direction gate 10 | 4 of 6 | 17,694 | 1,477 |
| validation last 25 (the closest to live validation `liveLastN 25`) | 1 of 5 | 15,532 | 1,627 |

Both coordinations stay on until the falling window of 6–7 Oct (session `crash1`) and the combined row (acceptance and
confirmation off together) are measured; the rule above applies (a change must beat the current setting causally).

