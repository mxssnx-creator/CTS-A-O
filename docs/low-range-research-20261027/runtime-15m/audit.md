# Frozen session reconciliation

Study: low-range-20-symbol-15m-24h · development · offline modeled execution only.

20 symbols, 2026-10-09T12:00:00.000Z → 2026-10-10T12:00:00.000Z (24h).

Reconciliation: PASS; pruning assessment: not allowed.

| Cohort | Funded settled closes | Unit PF | Sized net $ |
|---|---:|---|---:|
| Combined | 1883 | 0.0781 | -0.16214748 |
| Engine | 1883 | 0.0781 | -0.16214748 |
| Signals | 0 | empty | 0.00000000 |

## Type

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Engine · normal | 474 | 9 | 0.1250 | -0.04190648 |
| Engine · trailing | 780 | 9 | 0.0914 | -0.05598456 |
| Engine · trailing-only | 629 | 5 | 0.0318 | -0.06425645 |
| Engine · dca | 0 | 0 | empty | 0.00000000 |
| Engine · dca-active | 0 | 0 | empty | 0.00000000 |
| Engine · axis | 0 | 0 | empty | 0.00000000 |
| Signals · normal | 0 | 0 | empty | 0.00000000 |
| Signals · trailing | 0 | 0 | empty | 0.00000000 |
| Signals · trailing-only | 0 | 0 | empty | 0.00000000 |
| Signals · dca | 0 | 0 | empty | 0.00000000 |
| Signals · dca-active | 0 | 0 | empty | 0.00000000 |
| Signals · axis | 0 | 0 | empty | 0.00000000 |

## Range

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Short | 1883 | 9 | 0.0781 | -0.16214748 |
| Micro | 0 | 0 | empty | 0.00000000 |
| Minimal | 0 | 0 | empty | 0.00000000 |
| Minimal plus | 0 | 0 | empty | 0.00000000 |
| General | 0 | 0 | empty | 0.00000000 |
| Long | 0 | 0 | empty | 0.00000000 |
| Wide | 0 | 0 | empty | 0.00000000 |
| Signals | 0 | 0 | empty | 0.00000000 |

## Direction

| Group | Closes | Symbols | Unit PF | Sized net $ |
|---|---:|---:|---|---:|
| Long | 347 | 7 | 0.0035 | -0.08756751 |
| Short | 1536 | 5 | 0.1530 | -0.07457997 |

## Hourly funded execution (UTC)

| Hour | Engine closes | Engine PF | Signal closes | Signal PF | Combined PF | Sized net $ |
|---|---:|---|---:|---|---|---:|
| 2026-10-09 12:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-09 13:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-09 14:00 | 129 | 0.0410 | 0 | empty | 0.0410 | -0.00373780 |
| 2026-10-09 15:00 | 140 | no losses (gate score 4; exact ratio unavailable) | 0 | empty | no losses (gate score 4; exact ratio unavailable) | 0.00515222 |
| 2026-10-09 16:00 | 1056 | 0.0036 | 0 | empty | 0.0036 | -0.07787578 |
| 2026-10-09 17:00 | 225 | 1.1103 | 0 | empty | 1.1103 | 0.00081323 |
| 2026-10-09 18:00 | 13 | 0.0000 | 0 | empty | 0.0000 | -0.00105717 |
| 2026-10-09 19:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-09 20:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-09 21:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-09 22:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-09 23:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-10 00:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-10 01:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-10 02:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-10 03:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-10 04:00 | 28 | 0.0000 | 0 | empty | 0.0000 | -0.00066337 |
| 2026-10-10 05:00 | 14 | no losses (gate score 4; exact ratio unavailable) | 0 | empty | no losses (gate score 4; exact ratio unavailable) | 0.00003339 |
| 2026-10-10 06:00 | 12 | 0.0000 | 0 | empty | 0.0000 | -0.00261958 |
| 2026-10-10 07:00 | 10 | 0.0000 | 0 | empty | 0.0000 | -0.00291726 |
| 2026-10-10 08:00 | 256 | 0.0000 | 0 | empty | 0.0000 | -0.07927537 |
| 2026-10-10 09:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-10 10:00 | 0 | empty | 0 | empty | empty | 0.00000000 |
| 2026-10-10 11:00 | 0 | empty | 0 | empty | empty | 0.00000000 |

## Qualification and account

Base 18/75 pairs; run-start configs 559/1469.

Closed net $-0.16214700; ending balance $9.83785300; marked ending equity $9.83785300; equity max drawdown 2.3182%.

Elapsed 4s; compute 4021.514937ms; peak RSS 339MB.

## Pruning evidence

Only completed frozen 22-symbol/24h selection evidence; PF<1 and negative unit net with negative unit net in both chronological halves. Candidates are research proposals, never automatic changes. Empty/insufficient cells stay enabled. Untouched final comparison still required.

Research-only proposals: 0. Exact config/direction rows, sample denominators, chronological halves, every failure and performance telemetry are retained in the JSON. No config was disabled by this audit.

## Checks

| Check | Result |
|---|---|
| 16 reconciliation checks | PASS |
