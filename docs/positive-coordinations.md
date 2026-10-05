# Positive coordinations — keep them

The operator's standing instruction: the coordinations below were validated as positive and stay on in every future
change (code defaults, presets, x01's settings and patches). A change that turns one off or weakens it needs a new
causal comparison that beats it, recorded here. `src/core/positive-defaults.test.ts` pins the code defaults, and a
desk prints a warning at start and on every patch that leaves one of them off (`positiveCoordWarnings`).

| Coordination | Setting | Evidence |
|---|---|---|
| Signal confirmation: a signal enters only while an engine position is open on its symbol in its direction | `wf.coord = { enabled: true, confirm: true }` | 8 causal days × 12 symbols: signal PF 1.32 → 1.58, drawdown halved (signals-validation.md). x01 paper, 15 h on 5 Oct: confirmed signal trades PF 7.29 (595, +27.5 %), unconfirmed PF 0.57 (333, −10.4 %) |
| Hour lock, losing-hour cooldown, opposite-entry blocking | `coord.hourLock 0`, `cooldown "off"`, `conflict false` | each cost net on every variant (signals-validation.md) |
| Signal acceptance (source × symbol × direction × type) | `signals.accept = { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 }` | without acceptance signal units PF 0.4–0.7; the operator's evaluation is PF 1.3 |
| Signal direction acceptance (each side's signals pooled) | `signals.sideAccept = { enabled: true, minPf: 1.3, hours: 24, minTrades: 20 }` | x01, 48 h on 5 Oct: long PF 3–44, short PF 0.1–0.3 per 12 h |
| Signals trade their own base | `signals.ownBase: true` | the engine's Normal off / Block Active skip left signals ~16 closes a day |
| Signal volatility floor | `signals.filter.volFloor: 0.003` | the move must be worth the 0.2 % round trip (worst drawdown 523 vs 660) |
| Engine direction acceptance (type family × range × side) | `wf.engineSideAccept = { enabled: true, minPf: 1.05, hours: 3, minTrades: 30 }` on x01 (code default off until a multi-window simulation confirms it) | x01 paper replay, 5 Oct: opened shorts PF 1.25 / held 0.51; everything opened PF 1.70 vs 1.0 |
| Normal and Trailing enabled and running, Block Active off | `toggles.normal: true`, `trailing: true`, `blockActive: false` (code default) | operator, 5 Oct: with Block Active (minimum level 5) only Block-raised entries opened — a 2 h Micro run traded Axis alone |
| Axis on x01 | `toggles.axis: true` | profitable on both sides on x01 (24 h: long PF 1.37, short PF 1.19) |
| DCA off on x01 | `toggles.dca: false` | lost in every last-N variant of the x01 simulation (PF 0.60–0.81) |
| Base builds a pair's sets from PF 1 up | `gates.baseSetsMinPf: 1` (code default) | operator, 5 Oct: "it is about the stage Base eval for sets with PF 1+ — that unfiltered sets come out under PF 1 is normal; keep all processing and validate the better ones by PF and DDT". Every set still clears its own stage / range minimum before it trades, so this widens what is computed, never what trades |
| Sample warm-up: a drawdown that cannot be computed yet is valid until it can | `gates.warmup: true` (code default) | operator, 5 Oct: "if no DDT available because of too few previous positions, calculate as valid until enough exist, then evaluate normally". It waives the DRAWDOWN half (DDT, DDR) of a last-N window shorter than N, a symbol the config has no close on yet, and fewer than two stability blocks. The RESULT half is never waived: a config without its last-N closes still does not clear a last-N PF gate. Measured (12 h / 20 symbols / every range, 5 Oct): waiving the result half as well let 8,427 extra orders through on samples of a few closes and took the window from PF 1.108 (net +2,527 % in trade units) to PF 0.818 (net −14,467 %) — mostly Micro and Minimal cells whose last-50 range gate was waived |
| Independent configs: every config of every Base-validated pair is its own seat (all strategy types, all cells), evaluated on its own results | `wf.seatPer: "config"` (code default; x01) | one seat per pair × family traded only the best-scored config of each set; independent configs are pinned in independence.test.ts |
| Base-validated targets: the tape stage builds only the range targets whose Base cells passed | `grid.baseTargets: true` (code default) | two causal windows, 20 symbols, 2 h pre + 2 h run (5 Oct 12:00Z / 06:00Z): identical passed sets (2/2 and 10/10 Micro normal, 0/0 and 8/8 trailing) and identical orders, with 29–36 % fewer Micro sets built, 40–50 % fewer Micro configs evaluated, the evaluated pool's median PF up (0.45 → 0.51, 0.48 → 0.58) and compute 162 → 93 s / 147 → 97 s |
| Live fill within every budget | kept configs held to the budget; exposure, stop-risk and worst-case budgets | kept whole, the fill overshot ~6× and every position was squeezed to the exchange minimum |
| Allocator caps for every long-running process | `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576` | without them x01 held 11 GB RSS on a 2.6 GB heap |

## Operator decisions that narrow the live book (processing unchanged)

5 Oct, x01: "let only trailing plain and signals trailing plain run live, and increase the vol factor by 5 times.
After that don't touch live any more — just fix issues by regular monitoring, work locally." Applied as
`live.kinds: ["trailing"]`, `live.plainOnly: true`, `live.ratio: 2 → 10`.

Every coordination above stays on in processing: Axis, Block, DCA and the Normal base keep computing, validating and
paper-trading, and their record keeps accruing — `live.kinds` only narrows what the live control sends to the
exchange. Positions already held of a kind no longer sent are still managed and closed. Reverting is a patch, not a
code change: drop `kinds` and `plainOnly` (the backup of the previous patch is `patch.json.prev-allkinds`).

Symmetry is pinned as well: `src/core/indications/symmetry.test.ts` fails when an indication or the simulator treats a
falling market differently from a rising one. The Stable-02 confluence port is the one exception: it keeps the desk's
own rule bit for bit (its overlapping RSI bands give 45–55 to long), as validated with the desk's sources.

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
