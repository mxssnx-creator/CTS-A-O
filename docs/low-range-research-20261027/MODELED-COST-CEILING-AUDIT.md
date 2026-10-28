# Modeled-cost ceiling and held positions — code audit

This is an implementation assessment, not a change to the current operator
policy. The modeled round-trip cost defaults to **0.15%**, and the runtime
currently caps it at **0.15%**. The separately named fixed PositionCost range
reference is **0.20%** and the bot-statistics stress reference is **0.40%**;
neither changes the runtime's 0.15% cost ceiling. Actual confirmed venue fees
are separate and are not capped by the modeled ceiling. See
`src/core/model-cost.ts`, `src/core/bot-stats.ts` and
`src/core/server/cost-default-runtime.test.ts`.

The ceiling cannot safely be expanded by changing a single constant while
claiming that saved configurations and held positions retain identical
behavior:

- `mergeSettings` in `src/core/server/runtime.server.ts` clamps the effective
  cost when loading settings but does not overwrite every durable custom
  value. The existing migration tests intentionally preserve custom source
  values. A higher global cap could silently make a previously clamped saved
  cost effective on restart. The live auto-cost adjuster also uses the same
  ceiling; raising it globally would expand its authority for already-enabled
  desks. Any future opt-in must preserve the prior effective default, durable
  provenance and existing auto-cost authority.
- The Low-Range generator adds the configured modeled cost to TP, SL and trail
  distances; Micro's price target and optional net-stop floor also depend on
  that cost. Changing it can create different configuration IDs and requires
  fresh, exact Base and later evaluations. `computeKey` includes economic
  settings, but preserved or open positions still require their own tested
  reconciliation. `OpenPosition` does not generally store an entry-time model
  cost, and the paper tick and rebuilt held tapes use current `settings.cost`.
  Historic Exit separately captures cost in its exit-protection state. Do not
  assume a cost edit leaves an ordinary held position's modeled MTM or eventual
  return unchanged without an explicit ownership/restart test.
- `LANE_MIN.tp` and the Micro-family opportunity hurdle use the fixed default
  `RT_COST`; they are not automatically raised with a higher user-selected
  model cost. Review their semantics before claiming that targets or signal
  hurdles cover a higher cost. See `src/core/sim/backtest.ts`,
  `src/core/pipeline/pipeline.ts` and `src/core/indications/micro-family.ts`.
- The existing trailing-only policy in `src/core/sim/trailing.ts` caps the
  stop and trailing gap at **3%**. This can truncate a requested Low-Range
  stop ratio even at today's cost: step 6, 0.2% step, ratio 3.5, cost 0.15%
  requests a 4.35% stop, but its no-TP sibling is capped at 3%. For a
  hypothetical 1.5% cost and permitted 0.8% step, the requested minimum
  trail gap is 3.1% but the no-TP cap forces 3%. These are code-level examples,
  not instructions to change the cap. A future higher-cost path must resolve
  such cap/floor and requested-ratio conflicts explicitly rather than claim
  that both policies hold.
- `checkSettings` accepts per-side taker fees up to 1% and slippage up to 2%,
  whose modeled two-sided sum could reach 6%; the current model applies its
  smaller explicit ceiling. Fee edits derive the model with five fractional
  decimal places, while the percentage input displays four decimal places and
  configuration distance IDs retain six fractional price decimals. Settings,
  errors and reports must disclose the applied model value, and any precision
  or cap change needs boundary and identity tests. Historical reports that
  hard-code the old 0.15% ceiling must not be relabeled as results from a new
  cost policy.

## Existing-cost grid-count correction

The cost also affects rounding and no-TP deduplication. With the default grid,
Low-Range enabled at step `0.0000013`, no-TP on and modeled cost `0.0001`,
the prior `gridVariants` used the default cost and returned **4,158**, while
`protectGrid(15, grid, 0.0001)` built **4,212**. Both values are below the
100,000 cap; this example does not by itself prove an over-limit admission.

The accompanying correction passes the effective cost to `gridVariants`,
including the merged grid, direct cost updates, fee-only updates, and preset
edits/backtests using the current desk cost. It checks before publishing a new
settings patch. Preset application still goes through the normal settings
guard; presets do not carry cost or fee fields. The default cost and ceiling
are unchanged. Existing startup/reload behavior is intentionally unchanged:
refusing to start a previously saved oversized grid could prevent recovery of
held positions and their native protection. Safe startup quarantine and a
recovery path for such legacy settings require separate proof.

Before considering any future higher-cost option, preserve the current
operator ceiling by default; explicitly scope any opt-in and auto-cost
authority; validate effective merged grid and cap/floor compatibility; and
test exact Base/worker/tape parity, entry-time held protection, restart,
funded-versus-actual cost accounting and historic report provenance. No
configuration or profitable future PF can be inferred merely from such a
change.
