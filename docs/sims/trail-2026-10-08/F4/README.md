# Sims: trail sweep F4, two windows (signals only)

**Result: both windows executed 0 orders.** Every signal entry the run considered was skipped by the `sig:confirm`
gate (45,403 in the latest window, 52,276 in the rally window). Engine orders are 0 in both windows (0 engine seats,
`realEngine` 0), as signals-only requires. Nothing closed and nothing was open at the end, so every PF and net
below is empty or zero.

The likely cause, which I did not verify in code: the confirmation coordination needs an engine candidate open on the
symbol in the signal's direction (`docs/positive-coordinations.md`). The desk seats 0 engine configs (the report says
"Real seats: 0 engine configs + 3780 signal configs"), so no engine candidate can ever confirm a signal. The desk was
run as given, and the code was not changed.

## Desk settings (`desks/F4.json`, used as is)

| Setting | Value |
|---|---|
| Engine | grids on; execution off (`toggles`: normal false, trailing true, block false, dca / axis false; `live.source` "signals") |
| Signal Normal stops | `signals.normal.slOfTp` [1.5, 2, 3] × target |
| Signal trailing | `signals.trailing.trailOfTp` [0.4, 0.6, 0.8] × target, trail stop `slOfTp` 3 |
| Hold | `signals.holdH` 12 h |
| Symbols | 20 (`symbolRank` volatility1h; `forceSymbols` XRP, SOL, BCH) |
| Coordination | `wf.coord` enabled, `confirm` true, `hourLock` 0, `cooldown` off, `conflict` false |
| Signal acceptance | `signals.accept` on: PF 1.3, 48 h, 6 trades; `signals.sideAccept` on: PF 1.3, 24 h, 20 trades |
| Engine direction acceptance | `wf.engineSideAccept` on: PF 1.05, 24 h, 30 trades |
| Gates | `gates.minPf` 1.05, every range `rangeMinPf` 1.05, `baseSetsMinPf` 1 |
| Live | `ratio` 1, `notionalUsd` 1, `liveLastN` 25, `kinds` ["trailing"], `excludeRanges` ["wide"], `requireReady` false |
| Adjust | off |

Run command, both windows: `--symbols 20 --pre 24 --run 12 --focus all --balance 20 --max-wait-min 300`, with
`CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3` and `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`.
The windows ran one after the other. The variants table is off, so the "reproduces the session run" line does not apply.

## Window w-latest: 2026-10-07 12:00 → 2026-10-08 00:00 UTC (12 h)

### Totals by range

Unit basis: net is Σ trade %. PF is over closed trades. The "open" columns are the orders still open at the end.

| Range | Orders closed | PF closed | Open at end | PF incl. open | Net closed | Net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| **Total** | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Micro | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Short | 0 | – | 0 | – | 0.00 % | 0.00 % |
| General | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Long | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Wide | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Signals | 0 | – | 0 | – | 0.00 % | 0.00 % |

### Signals by stop type

| Stop type | Orders closed | Open at end | Net incl. open |
|---|---:|---:|---:|
| Trailing (tr > 0) | 0 | 0 | 0.00 % |
| Fixed (tr 0) | 0 | 0 | 0.00 % |

Context (not orders): the report's "Seated configs" table counts each signal config's own standalone closes, which the
book did not execute. Normal 1,675 configs, 10,540 closes, PF unit 0.65, net −10,995.87 %. Trailing 1,633 configs,
8,395 closes, PF unit 0.86, net −2,558.65 %.

### Hour by hour

Open is open positions at the hour end. Every hour is flat, so the PF and cumulative columns are empty or zero.

| Hour (UTC) | Orders closed | PF closed | Net | Cum net | Open at hour end |
|---|---:|---:|---:|---:|---:|
| 12:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 13:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 14:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 15:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 16:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 17:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 18:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 19:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 20:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 21:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 22:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 23:00 | 0 | – | 0.00 % | 0.00 % | 0 |

### Checks

```
checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders
```

The five failing checks each expect 1 (orders > 0) and got 0: Micro (`mc`), Short (`sh`), General (`gn`), Long
(`lg`), and Signals. Wide was not in the failing list. The report was written anyway.

## Window w-rally: 2026-10-05 15:00 → 2026-10-06 03:00 UTC (12 h, the 6 Oct rally)

### Totals by range

| Range | Orders closed | PF closed | Open at end | PF incl. open | Net closed | Net incl. open |
|---|---:|---:|---:|---:|---:|---:|
| **Total** | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Micro | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Short | 0 | – | 0 | – | 0.00 % | 0.00 % |
| General | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Long | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Wide | 0 | – | 0 | – | 0.00 % | 0.00 % |
| Signals | 0 | – | 0 | – | 0.00 % | 0.00 % |

### Signals by stop type

| Stop type | Orders closed | Open at end | Net incl. open |
|---|---:|---:|---:|
| Trailing (tr > 0) | 0 | 0 | 0.00 % |
| Fixed (tr 0) | 0 | 0 | 0.00 % |

Context (not orders): the seated signal configs' own standalone closes. Normal 1,707 configs, 14,016 closes, PF unit
1.96, net +18,213.65 %. Trailing 1,694 configs, 14,359 closes, PF unit 2.57, net +19,346.94 %. These are the configs'
own simulated closes, not the book, and the book executed none of them. The engine's "Real seats" line reads the same
as the latest window: 0 engine configs, 3,780 signal configs.

### Hour by hour

| Hour (UTC) | Orders closed | PF closed | Net | Cum net | Open at hour end |
|---|---:|---:|---:|---:|---:|
| 15:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 16:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 17:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 18:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 19:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 20:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 21:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 22:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 23:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 00:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 01:00 | 0 | – | 0.00 % | 0.00 % | 0 |
| 02:00 | 0 | – | 0.00 % | 0.00 % | 0 |

### Checks

```
checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders
```

Same five failing checks as the latest window, each expecting 1 and getting 0. The report was written anyway.

## Engine orders

Engine orders = 0 in both windows (`engine.realEngine` 0; the engine's own order count is 0). Signals-only holds.

## Checks summary and what was not run

- `src/core/report-page.test.ts`: 2 of 2 pass (`# pass 2`, `# fail 0`). The first run could not start because the
  `typescript` package was not installed. Setup ran `npm ci --ignore-scripts`, which does not change the lockfile.
- The browser page load (zero `pageerror`) was not checked.
- The variants baseline was not run (`CTS_CORE_VARIANTS=0`), and neither was the compare (`CTS_CORE_COMPARE=0`).

## Files

Per window in `w-latest/` and `w-rally/`: `session.md`, `writeup.md`, and `html/` (`index.html`, `data.json`).
`raw.json` was not copied, as the task asked.
