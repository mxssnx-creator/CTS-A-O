# Expanded mixed ordinary and Historic Exit replay

This is a **post-hoc coverage follow-up** to the separately sealed two-source mixed replay, in which all 10 Historic Exit source pairs failed their own Base gate. The initial result and its failed Exit evidence remain unchanged. Expanding the source inventory after that observation is not a predeclared head-to-head comparison, a fresh holdout, or evidence that any Exit source will pass.

The fixed source inventory is the complete seven-source RSI momentum subset of the archived `FORMER_FOCUS_13OCT` (`rsi-mom-10-25`, `14-15`, `14-20`, `14-25`, `21-15`, `21-20`, `21-25`) plus `ema-9-21`, which appeared in the earlier Exit validation protocol. They are all included before this follow-up is scored; no source is selected or discarded from the later execution outcome. Follow runs on 1, 5 and 15 minute single and production-generated combined lanes. Historic Exit derives its own bot-free sources from this inventory and evaluates its own Base and protection configurations.

The same cached 12-symbol Binance USD-M candle feed and retrospective time window are used: 100 hours of indicator-only warmup from 2026-10-06 11:00 UTC, 150 hours of evaluated prehistory from 2026-10-10 15:00 UTC, and 24 simulated trading hours from 2026-10-16 21:00 to 2026-10-17 21:00 UTC. Older warmup must not enter validation. The feed has been examined previously and has no independent venue-execution evidence.

Ordinary Minimal and Short retain all configured TP, SL, trailing and hold arrays. Historic Exit retains its default 150-hour fit, candidate families and limits, 30-entry minimum, Last-4, PF, drawdown and hourly-consistency gates. Ordinary default tactics remain on: Exit is an independent indication path and does not inherit those remove-only filters. Default stage/range gates and modeled round-trip costs stay unchanged. Signals, Low-Range, Block, DCA, Axis, other ordinary ranges and the additional Exit Tactic, Relation and Micro source catalogs are outside this bounded case.

The modeled account starts at $10 with 0.2% equity sizing and 10× leverage. Report the exact Base pair and post-Base configuration passed/evaluated counts, historical unit-return PF on the passed cohort, and later funded-settled performance separately by type and range, alongside held orders and position counts. Empty, insufficient, losing and unknown outcomes remain visible. A no-loss score is not an exact finite PF. This replay tests the declared processing path only; it cannot establish stable future profitability or prove live fills.

The launcher verifies complete contiguous input, production normalization, unchanged default gates/tactics/cost, all eight declared sources, and the committed economic-source checkpoint. It seals the exact source files, input, launcher and this protocol; the normal offline `core-session` path checks the seals before scoring. A completed run needs its native reconciliation and an independent session audit. Preserve a failed startup or run in its own output directory and never overwrite it.

After source freeze and after other memory-intensive studies complete:

```sh
node --experimental-strip-types --no-warnings scripts/exit-mixed-150h-expanded-study.mjs prepare --out runs/exit-mixed-150h-expanded-NEW
node --experimental-strip-types --no-warnings scripts/exit-mixed-150h-expanded-study.mjs run --out runs/exit-mixed-150h-expanded-NEW
```
