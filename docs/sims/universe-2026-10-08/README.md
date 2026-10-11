# Pinned universes, 8 Oct

A session asks for 30 symbols but loads the symbols that have candles when it starts. The backfill decides which, so two
runs of the same window could load different symbols. Two falling runs did: the old code loaded DRIFT-USDT and the new code
TIA-USDT, and the session still said "30 symbols" while every dump held 29.

Each comparison now uses a pinned list (`settings.forceSymbols`, 29 symbols, the set the runs loaded):

- `pin-fal.json`: the falling window (end 8 Oct 00:00), the 29 symbols of the new-code falling run.
- `pin-ral.json`: the rally window (end 6 Oct 15:00), the 29 symbols of the rally runs (identical across old, parent and new).
- `pin-fal-noside.json`, `pin-ral-noside.json`: the same with `signals.sideAccept` off (the "trade both directions" variant).

The session script checks every run: `universe: N symbols loaded of M asked`. A run that loads fewer than it asked fails the
checks (rc 1) and is not comparable with a run of the same window. `src/core/session-universe.ts` holds the rule, tested in
`src/core/session-universe.test.ts`.
