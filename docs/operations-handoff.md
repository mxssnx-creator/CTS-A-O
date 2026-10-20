
## Incremental cycle (`runtime.cycle`)

`settings.runtime = { cycle: "full" | "incremental", heavyEveryBars }` (default "full"; "incremental" is opt-in until it has
run beside a full desk). In "incremental" the heavy compute (Base, Main, tapes, simulated run, Adjust, Audit, Compare)
runs at the first cycle, at every hour boundary (the seats are hourly), every `heavyEveryBars` bars (60) and whenever the
settings, the universe or the auto-adjust change. Between them a light cycle (`status.cycleMode`, phase `Light`) grows
the tail universe by the closed bars, continues the validated set's Normal / Trailing / ATR tapes from a stored
simulation state (`simulateFrom`, `extendTape`), rebuilds the other kinds in the set (DCA, Axis, signals) on the grown
universe, keeps the hour's seats and runs the paper step on the validated tapes. Equality with a full recompute:
`src/core/sim/backtest-resume.test.ts`, `tape-extend.test.ts`, `src/core/server/cycle-incremental.test.ts`.
Profile: `scripts/bench-cycle.mjs`.
