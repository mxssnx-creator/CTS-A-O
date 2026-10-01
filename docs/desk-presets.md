# Desk presets — measured on complete simulated sessions

16 symbols, 12 h pre-historic + 24 h simulated per window, windows ending 0 / 24 / 48 h ago. Real BingX 1m data, 0.20 % round-trip cost on every close, $10 balance, 2 % of equity per order at 10×. A preset is kept when the windows together clear PF 1.3 with a positive net and at least two of three windows are positive; experiments are reported only.

| preset | kept | PF (all) | worst PF | orders / day | WR | net % (sum) | max equity DD % | green hours | positive windows |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Desk default · ranges gated | yes | 2.27 | 2.13 | 337.33 | 75.10 % | 89.38 | 41.07 | 54 % | 3 / 3 |
| Low drawdown | yes | 2.60 | 2.23 | 211.33 | 79.50 % | 33.15 | 19.34 | 49 % | 3 / 3 |
| High frequency | no | 1.20 | 0.84 | 91.00 | 66.67 % | 1.38 | 1.87 | 35 % | 2 / 3 |
| Combined · every range gated + Block | yes | 2.29 | 2.15 | 398.33 | 73.64 % | 93.19 | 41.13 | 53 % | 3 / 3 |
| All configs · highest frequency | yes | 2.10 | 1.97 | 835.00 | 74.61 % | 164.53 | 36.30 | 69 % | 3 / 3 |
| Tight stop floor (0.3 %) | no | 2.26 | 2.11 | 336.00 | 75.00 % | 89.11 | 41.07 | 53 % | 3 / 3 |
| Wide stop floor (0.8 %) | no | 2.23 | 0.95 | 382.00 | 76.18 % | 91.33 | 41.07 | 58 % | 2 / 3 |

## Desk default · ranges gated

The engine defaults with the range gate (last 50 closes at PF 1.35) and the horizon fit.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-09-30 17:00 → 2026-10-01 17:46 | 2.13 | 439 | 73.35 % | 36.21 | 41.07 | 58 % | Wide 435 · 2.15, Short 4 · 0.00 | 1081 | 9 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 13.99 | 36 | 88.89 % | 4.57 | 1.07 | 46 % | Wide 31 · 18.10, Short 5 · 1.90 | 1071 | 11 |
| 2026-09-28 17:00 → 2026-09-29 17:00 | 2.27 | 537 | 75.61 % | 48.60 | 13.96 | 58 % | Wide 519 · 2.29, Short 18 · 0.97 | 1086 | 19 |

## Low drawdown

Fewer, stricter positions: at most 6 positions and 8 seats per family, min PF 1.35, Normal + Trailing only (no Block / DCA volume).

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-09-30 17:00 → 2026-10-01 17:48 | 2.23 | 397 | 75.06 % | 16.49 | 19.34 | 54 % | Wide 393 · 2.26, Short 4 · 0.00 | 1180 | 17 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 10.30 | 25 | 84.00 % | 1.47 | 0.49 | 33 % | Wide 20 · 13.15, Short 5 · 1.90 | 1066 | 9 |
| 2026-09-28 17:00 → 2026-09-29 17:00 | 3.11 | 212 | 87.26 % | 15.18 | 6.06 | 58 % | Wide 212 · 3.11 | 1139 | 10 |

## High frequency

1m and 5m lanes, range seats, up to 20 positions and 24 seats per family; the short range beside the wide targets.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-09-30 17:00 → 2026-10-01 17:50 | 0.84 | 14 | 57.14 % | -0.10 | 0.33 | 25 % | Wide 10 · 1.45, Short 4 · 0.00 | 311 | 2 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 1.47 | 17 | 76.47 % | 0.21 | 0.31 | 25 % | Wide 9 · 1.74, Short 8 · 1.16 | 300 | 2 |
| 2026-09-28 17:00 → 2026-09-29 17:00 | 1.21 | 242 | 66.53 % | 1.27 | 1.87 | 54 % | Wide 120 · 1.24, Short 122 · 1.19 | 354 | 2 |

## Combined · every range gated + Block

Short, minimal and micro ranges with their own seats, each through the range gate and the horizon fit, with Block.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-09-30 17:00 → 2026-10-01 17:51 | 2.15 | 436 | 73.39 % | 36.55 | 41.13 | 54 % | Wide 432 · 2.18, Short 4 · 0.00 | 1266 | 11 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 9.73 | 36 | 86.11 % | 4.07 | 1.07 | 42 % | Wide 27 · 16.18, Short 9 · 1.48 | 1225 | 10 |
| 2026-09-28 17:00 → 2026-09-29 17:00 | 2.32 | 723 | 73.17 % | 52.57 | 15.12 | 63 % | Wide 521 · 2.49, Short 122 · 1.28, Minimal 80 · 0.74 | 1275 | 21 |

## All configs · highest frequency

Every indication × bot, every range (gated), every strategy (Normal, Trailing, Block, DCA, Axis). Measured and set at 8 symbols (every combo on more symbols needs more memory).

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-09-30 17:00 → 2026-10-01 17:53 | 1.97 | 1135 | 74.10 % | 73.84 | 36.30 | 67 % | Wide 819 · 2.10, Short 245 · 0.97, Minimal 71 · 1.01 | 4613 | 69 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 2.66 | 348 | 77.87 % | 20.55 | 9.77 | 67 % | Wide 242 · 2.95, Short 72 · 1.03, Minimal 25 · 2.16, Micro 9 · 4.00 | 2446 | 42 |
| 2026-09-28 17:00 → 2026-09-29 17:00 | 2.14 | 1022 | 74.07 % | 70.14 | 17.51 | 75 % | Wide 486 · 2.47, Short 365 · 1.17, Minimal 155 · 0.70, Micro 16 · 6.92 | 3208 | 49 |

## Tight stop floor (0.3 %)

Default book with the wide-grid stop and trail floor at 0.3 %.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-09-30 17:00 → 2026-10-01 17:57 | 2.11 | 435 | 73.10 % | 35.78 | 41.07 | 54 % | Wide 431 · 2.14, Short 4 · 0.00 | 1151 | 18 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 13.99 | 36 | 88.89 % | 4.57 | 1.07 | 46 % | Wide 31 · 18.10, Short 5 · 1.90 | 1072 | 10 |
| 2026-09-28 17:00 → 2026-09-29 17:00 | 2.28 | 537 | 75.61 % | 48.76 | 13.86 | 58 % | Wide 520 · 2.28, Short 17 · 1.32 | 1089 | 10 |

## Wide stop floor (0.8 %)

Default book with the wide-grid stop and trail floor at 0.8 %.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-09-30 17:00 → 2026-10-01 17:59 | 2.11 | 435 | 73.10 % | 35.78 | 41.07 | 54 % | Wide 431 · 2.14, Short 4 · 0.00 | 1134 | 10 |
| 2026-09-29 18:00 → 2026-09-30 18:00 | 7.34 | 367 | 89.10 % | 57.51 | 13.47 | 75 % | Wide 364 · 7.32, Short 3 · 4.00 | 1077 | 10 |
| 2026-09-28 18:00 → 2026-09-29 18:00 | 0.95 | 344 | 66.28 % | -1.96 | 17.78 | 46 % | Wide 267 · 0.98, Short 77 · 0.73 | 1054 | 12 |

