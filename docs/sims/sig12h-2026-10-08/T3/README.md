# Signals-only 12 h — variant T3 (wide trails)

Desk `docs/sims/sig12h-2026-10-08/desks/T3.json`: V3 with Trailing trail 0.6 / 0.8 / 1.0 / 1.2 of target, stop 3×, and every engine range off.
20 symbols, 24 h pre-history, run 2026-10-07 12:00 → 2026-10-08 00:00 UTC, balance $20, `CTS_CORE_VARIANTS=1`. Wall time 526 s (compute 91 s).

**Checks: 40/41 ok — FAILED: execution: signals executed orders.** The report is not published as an Artifact, because the integrity rule requires every check to pass.

## Result: no orders

| | value |
|---|---|
| orders executed (any type) | **0** (engine 0, signals 0) |
| open at end | 0 |
| PF closed / PF incl. open / net | – / – / 0 |
| signal candidates skipped | **41,630, all `sig:confirm`** |

Why: signal confirmation (`wf.coord.confirm`, a positive coordination) lets a signal enter only while an engine candidate is open on its symbol in its direction. This desk turns off every engine range (Normal off; Micro / Short / General / Long off and excluded; Axis / DCA / Block off; the remaining Wide pool has `type off` for all 22,684 configs). That leaves no engine candidates, so no signal is ever confirmed. The baseline variant reproduces the session run (0 orders). T0–T2 use the same base and probably have the same problem.

Because nothing was executed, the requested book breakdowns are all empty: Normal vs Trailing, trail ratio, stop ratio, source, symbol, hour by hour, and best per source × symbol. The hindsight bound per source × symbol cannot be computed either, because the dump has no config × symbol results (`cfgInfo` and `trades` are empty).

## Variants that traded (same tapes, one switch each)

| variant | orders | PF unit | net % (unit) |
|---|---:|---:|---:|
| baseline (as run) | 0 | – | 0 |
| Signal confirmation off | 1,766 | 0.22 | −7,517.69 |
| Coordination off | 1,766 | 0.22 | −7,517.69 |
| Signal acceptance and confirmation off | 2,693 | 0.35 | −7,881.28 |
| Axis on (engine) | 115 | 5.56 | +194.82 |
| DCA on (engine) | 334 | 0.54 | −433.23 |

Every other one of the 107 rows had 0 orders ("no effect"). This includes signal ranking drawdown / lowdd, acceptance off, entry last-N off/5 and Active signals 100/200. None of them beats the baseline on signals. With confirmation off, the signals lose heavily (PF 0.22), so confirmation stays on.

## Config level (not traded): each signal config on its own closes in the run, unit basis

| set | type | configs | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|
| every signal config | Normal (tr0) | 1,890 | 20,812 | 66 % | 0.97 | −1,681 |
| every signal config | Trailing | 2,520 | 17,341 | 78 % | **1.40** | **+15,215** |
| active units (seated) | Normal | 1,637 | 9,259 | 54 % | 0.53 | −14,324 |
| active units (seated) | Trailing | 1,877 | 6,923 | 66 % | 0.60 | −10,272 |

In this window the acceptance-selected (active) signal units did much worse than the unfiltered pool.

Trail ratio, from the report's best / worst cells (35 seated cells, ≥ 10 closes): net % summed tr 0.6 −2,043 (2,212 closes), 0.8 −2,627 (1,727), 1.0 −2,800 (1,492), 1.2 −2,800 (1,492; identical to 1.0), tr0 −14,324 (9,259). Stop ratio: 1.5× −5,238, 2× −4,969, 3× −14,388 (3× has the most closes). The best cells are tp 8 % / sl 3× with tr 1.0 or 1.2 (PF 6.12, +372 %) and tr 0.6 (PF 2.77, +343 %).

Sources (seated, run window, by net %):

| best | PF | net % | worst | PF | net % |
|---|---:|---:|---|---:|---:|
| s2-stoch-swing | 1.93 | +687 | swing | 0.24 | −1,521 |
| act-burst | 2.16 | +538 | thrust | 0.26 | −1,312 |
| obv | 1.52 | +366 | heikin-ashi | 0.41 | −1,188 |
| ema-cross | 6.21 | +303 | impulse | 0.22 | −1,171 |
| ema-cross-fast | 1.55 | +239 | s2-atr-break | 0.17 | −1,089 |

There is no per-symbol table for signal configs in the report.

## Needed for a usable signals-only run

Either keep the engine ranges computing candidates without trading them (confirmation counts "taken or not"), or rerun with an explicit operator override of confirmation. The variants above show what that override costs: PF 0.22.
