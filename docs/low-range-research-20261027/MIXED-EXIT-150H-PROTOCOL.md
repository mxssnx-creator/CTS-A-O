# Mixed ordinary and Historic Exit coexistence replay

This protocol is declared before running the frozen case. It asks whether the production pipeline can calculate, qualify, and process separately owned ordinary Normal/Trailing orders and Historic Exit orders together. It is a bounded diagnostic, not an optimization, a fresh holdout, or evidence of venue fills.

The fixed public-candle cache is `scripts/studies/signals-coverage/feed.json.gz`, containing 12 symbols. Minute and hourly candles must be continuous for every symbol from 2026-10-06 11:00 through 2026-10-17 21:00 UTC. The first 100 hours initialize indicators only. Evaluation uses 150 hours from 2026-10-10 15:00 through 2026-10-16 21:00 UTC; the simulated trading window is the next 24 hours through 2026-10-17 21:00 UTC. The feed and these markets were previously examined, so no unseen-data claim is justified.

The fixed ordinary source scope is Follow EMA 9/21 and Follow RSI momentum 14/20 on configured 1, 5, and 15 minute lanes, including production-generated combined lanes. Ordinary Minimal and Short use their full unchanged configured TP, SL, trailing, and hold arrays. Historic Exit fits each supported source independently with its default 150-hour history, candidate families, limits, 30-entry minimum, Last-4, PF and drawdown rules. Its extra Tactic, Relation and Micro source catalogs are outside this bounded case; the Normal/Trailing sources above still feed its bot-free Exit sources. The engine uses its default tactics, stage gates, cost and per-range floors. Signals, Low-Range, Block, DCA, Axis, other ordinary ranges, and live connections are deliberately outside the case.

The modeled account starts at $10 with 0.2% equity sizing and 10× leverage. Separate order and position counts, endpoint-held marks, and any infeasible funding or coverage warnings must remain visible. Report Base pair counts, the exact post-Base configuration denominator, passed count and historical unit-return PF, then later accepted modeled and funded-settled outcomes by strategy and range. An empty or insufficient sample has an unavailable PF and cannot demonstrate profitability or independence. The no-loss score is not a finite measured PF. All results remain retrospective; positive historical selection cannot establish continued profitability.

Preparation validates production settings normalization twice, the full required feed and causal windows, unchanged default gates/tactics/cost, and the actual ordinary-source inventory. It requires committed economic source, seals every imported core file and report helper, the feed, the launcher and this protocol, and preserves failed attempts in their own directories. The run rechecks these seals before invoking the normal offline `core-session` path. A completed replay must pass its native reconciliation and separate session audit before its figures are used; zero activity is retained as a valid empty outcome, with the absence of an exercised close marked explicitly.

Commands after the economic source is frozen and committed:

```sh
node --experimental-strip-types --no-warnings scripts/exit-mixed-150h-study.mjs prepare --out runs/exit-mixed-150h-24h-NEW
node --experimental-strip-types --no-warnings scripts/exit-mixed-150h-study.mjs run --out runs/exit-mixed-150h-24h-NEW
```

Run this memory-intensive case separately from other candidate replays. Do not overwrite an existing output directory. Source changes after preparation invalidate the seal and require a new attempt.
