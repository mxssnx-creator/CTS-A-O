# Trail sweep F5 — signals only, two windows (8 Oct)

Desk: `desks/F5.json` (used as is). Trailing distances 0.6 / 0.8 / 1.0 of target, trail stop 3×. Signal Normal stops
1.5 / 2 / 3× target. Hold 12 h, 20 symbols, confirm on, balance $20, 24 h pre-history, 12 h run.
Command: `scripts/core-session.mjs --symbols 20 --pre 24 --run 12 --focus all --desk …/F5.json --balance 20 --max-wait-min 300 --end-at <END>`
with `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`. The two windows ran one after the other.

## Desk settings (from F5.json)

| setting | value |
|---|---|
| Engine grids / execution | `toggles`: normal false, trailing true, block false, blockActive false, dca false, dcaActive false, axis false; `wf.excludeRanges` mc, mn, mp, sh, gn, lg; `live.excludeRanges` wide |
| Signals source / candidates | `signals.enabled` true; `signals.trailing.trailOfTp` 0.6 / 0.8 / 1.0; `signals.trailing.slOfTp` 3; `signals.normal.slOfTp` 1.5 / 2 / 3; `signals.holdH` 12 |
| Confirmation | `wf.coord` enabled true, confirm true, hourLock 0, cooldown off, conflict false |
| Acceptance | `signals.accept` on (minPf 1.3, 48 h, 6 trades); `signals.sideAccept` on (minPf 1.3, 24 h, 20 trades); `wf.engineSideAccept` on (minPf 1.05, 24 h, 30 trades) |
| Universe / run | 20 symbols, `symbolRank` volatility1h, `forceSymbols` XRP, SOL, BCH; balance $20; sizing minQty 2 % |

## Results

Window `w-latest`: 7 Oct 12:00 → 8 Oct 00:00 UTC (pre-history 6 Oct 12:00 → 7 Oct 12:00).
Window `w-rally`: 5 Oct 15:00 → 6 Oct 03:00 UTC (pre-history 4 Oct 15:00 → 5 Oct 15:00).

No window traded. PF and net are undefined where there are no closed or open orders (shown as –).

### Summary

| window | orders closed | Signals | Signals trailing (tr>0) | Signals fixed (tr0) | PF closed | PF incl. open | net closed | net incl. open | open at end | engine orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| w-latest | 0 | 0 | 0 | 0 | – | – | $0.00 (0.00 %) · Σ 0 % | $0.00 · Σ 0 % | 0 | 0 |
| w-rally | 0 | 0 | 0 | 0 | – | – | $0.00 (0.00 %) · Σ 0 % | $0.00 · Σ 0 % | 0 | 0 |

### Per range (w-latest and w-rally identical)

| range | orders closed | PF closed | open at end | PF incl. open | net closed (Σ %) | net incl. open (Σ %) |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 0 | – | 0 | – | 0 | 0 |
| Short | 0 | – | 0 | – | 0 | 0 |
| General | 0 | – | 0 | – | 0 | 0 |
| Long | 0 | – | 0 | – | 0 | 0 |
| Wide | 0 | – | 0 | – | 0 | 0 |
| Signals | 0 | – | 0 | – | 0 | 0 |

The report's range table gives 0 orders for every range; there are no Signals trailing or fixed rows to split.

### Why nothing traded

| window | seated engine configs | seated signal configs | signal candidates skipped | skip reason |
|---|---:|---:|---:|---|
| w-latest | 0 | 3780 | 43,244 | `sig:confirm` 43,244 |
| w-rally | 0 | 3780 | 50,150 | `sig:confirm` 50,150 |

Every signal was blocked by the confirmation gate. A signal enters only while an engine candidate on its symbol and
direction is open (docs/positive-coordinations.md). With the engine's executed configs at 0, that candidate never
exists, so no signal trades. The engine's candidate pool was large (w-latest hour 12:00: 26,808 configs in the pool,
1,233 seated in that hour's row), but none reached the Real seat stage. This is a finding about the F5 desk's engine
settings, not a sizing issue. Diagnosing it needs a code change, which this run did not make.

### Hour by hour — w-latest (7 Oct 12:00 → 8 Oct 00:00 UTC)

| hour (UTC) | orders closed | PF closed | net | cumulative net | open positions at hour end |
|---|---:|---:|---:|---:|---:|
| 12:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 13:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 14:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 15:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 16:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 17:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 18:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 19:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 20:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 21:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 22:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 23:00 | 0 | – | – | $0.00 | $0.00 | 0 / 0 / 0 |

### Hour by hour — w-rally (5 Oct 15:00 → 6 Oct 03:00 UTC)

| hour (UTC) | orders closed | PF closed | net | cumulative net | open positions at hour end |
|---|---:|---:|---:|---:|---:|
| 15:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 16:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 17:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 18:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 19:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 20:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 21:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 22:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 23:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 00:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 01:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |
| 02:00 | 0 | – | $0.00 | $0.00 | 0 / 0 / 0 |


Every hour of both windows shows 0 orders closed, 0 net and 0 open positions; the report's hourly tables carry no trades. The w-rally figures match w-latest because neither window traded.

Engine orders: **0 in both windows** (signals-only run as specified).

## Consistency checks (the report's own line)

- `w-latest`: `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`
- `w-rally`: `checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution: range gn executed orders; execution: range lg executed orders; execution: signals executed orders`

Each failing check reports 0 executed orders for its range or for signals. The engine ranges mc, sh, gn and lg are
excluded by the desk (`wf.excludeRanges`), and the signals executed 0 of 43,244 (w-latest) and 0 of 50,150 (w-rally)
candidates. The report is still written; the run exited with status 1.

## Files

- `w-latest/session.md`, `w-latest/writeup.md`, `w-latest/html/` (raw.json not copied)
- `w-rally/session.md`, `w-rally/writeup.md`, `w-rally/html/` (raw.json not copied)
