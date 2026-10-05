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
| Axis on x01 | `toggles.axis: true` | profitable on both sides on x01 (24 h: long PF 1.37, short PF 1.19) |
| DCA off on x01 | `toggles.dca: false` | lost in every last-N variant of the x01 simulation (PF 0.60–0.81) |
| Live fill within every budget | kept configs held to the budget; exposure, stop-risk and worst-case budgets | kept whole, the fill overshot ~6× and every position was squeezed to the exchange minimum |
| Allocator caps for every long-running process | `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576` | without them x01 held 11 GB RSS on a 2.6 GB heap |

Symmetry is pinned as well: `src/core/indications/symmetry.test.ts` fails when an indication or the simulator treats a
falling market differently from a rising one. The Stable-02 confluence port is the one exception: it keeps the desk's
own rule bit for bit (its overlapping RSI bands give 45–55 to long), as validated with the desk's sources.
