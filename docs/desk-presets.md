# Desk presets — measured on complete simulated sessions

> **Re-measure of 2 Oct (this file).** All 14 candidates ran on the three windows ending 0 / 24 / 48 h before 16:40 UTC. The latest 24 h were thin: most presets traded only 4–20 orders there, at PF below 1. Only two candidates cleared the keep rule:
> - **High order count**: PF 1.72, +387 %, 2 / 3 windows positive. It is added to the app's presets as `desk-high-orders`.
> - **Low drawdown**: PF 1.24, which is below the app's PF 1.3 floor for presets.
>
> The app's other desk presets keep their own measurement of 28 Sep – 1 Oct; each preset shows its period and windows. This re-measure is the evidence that those presets are regime-dependent.

12 symbols, 12 h pre-historic + 24 h simulated per window, windows ending 0 / 24 / 48 h ago. Real BingX 1m data, 0.20 % round-trip cost on every close, $10 balance, 2 % of equity per order at 10×. A preset is kept when the windows together clear PF 1.1 with a positive net and at least two of three windows are positive; experiments are reported only.

| preset | kept | PF (all) | worst PF | orders / day | WR | net % (sum) | max equity DD % | green hours | positive windows |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Desk default · ranges gated | no | 1.48 | 0.49 | 233.00 | 68.96 % | -3.28 | 136.33 | 25 % | 1 / 3 |
| Low drawdown | yes | 1.24 | 0.44 | 176.00 | 69.32 % | 3.90 | 16.84 | 26 % | 2 / 3 |
| High frequency | no | 99.00 | 0.00 | 2.00 | 100.00 % | 1.45 | 1.03 | 3 % | 1 / 3 |
| Combined · every range gated + Block | no | 1.28 | 0.49 | 350.33 | 66.60 % | -209.22 | 150.06 | 28 % | 1 / 3 |
| All configs · highest frequency | no | 1.21 | 1.19 | 2524.67 | 62.46 % | -129.97 | 350.46 | 65 % | 2 / 3 |
| Tight stop floor (0.3 %) | no | 1.57 | 0.21 | 101.00 | 66.01 % | 31.80 | 87.28 | 18 % | 1 / 3 |
| Wide stop floor (0.8 %) | no | 1.57 | 0.21 | 101.00 | 66.01 % | 31.80 | 87.28 | 18 % | 1 / 3 |
| Block Overall · 8× stack | no | 1.58 | 0.19 | 76.00 | 63.16 % | 27.13 | 32.71 | 18 % | 1 / 3 |
| Block shared · 8× stack | no | 1.68 | 0.19 | 74.67 | 62.50 % | 13.54 | 16.35 | 19 % | 1 / 3 |
| Block additive · 8× stack | no | 1.67 | 0.19 | 74.67 | 62.50 % | 17.78 | 21.77 | 19 % | 1 / 3 |
| General + Long ranges | no | 1.64 | 0.19 | 80.00 | 62.50 % | 4.68 | 5.46 | 21 % | 1 / 3 |
| Wide targets · tight stops (heatmap) | no | 3.57 | 0.00 | 84.00 | 80.95 % | 11.89 | 16.56 | 14 % | 1 / 3 |
| Wide targets · tight stops + Block Overall | no | 3.28 | 0.00 | 82.67 | 81.45 % | 78.78 | 100.96 | 13 % | 1 / 3 |
| High order count · every evaluated config | yes | 1.72 | 1.26 | 746.67 | 72.28 % | 387.19 | 223.34 | 51 % | 2 / 3 |

## Desk default · ranges gated

The engine defaults with the range gate (last 50 closes at PF 1.35) and the horizon fit.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 16:00 → 2026-10-02 16:42 | 0.49 | 13 | 30.77 % | -4.17 | 7.90 | 4 % | Wide 7 · 0.00 | 678 | 20 |
| 2026-09-30 16:00 → 2026-10-01 16:00 | 1.50 | 668 | 69.46 % | -3.25 | 136.33 | 58 % | Wide 369 · 1.31, Short 18 · 1.04 | 712 | 27 |
| 2026-09-29 16:00 → 2026-09-30 16:00 | 5.91 | 18 | 77.78 % | 4.13 | 4.25 | 13 % | Wide 11 · 3.49, Short 7 · 4.00 | 700 | 19 |

## Low drawdown

Fewer, stricter positions: at most 6 positions and 8 seats per family, min PF 1.35, Normal + Trailing only (no Block / DCA volume).

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 16:00 → 2026-10-02 16:45 | 0.44 | 13 | 30.77 % | -0.64 | 0.90 | 8 % | Wide 7 · 0.00 | 674 | 19 |
| 2026-09-30 16:00 → 2026-10-01 16:00 | 1.28 | 505 | 70.50 % | 4.40 | 16.84 | 63 % | Wide 311 · 1.06, Short 10 · 0.87 | 744 | 20 |
| 2026-09-29 16:00 → 2026-09-30 16:00 | 2.37 | 10 | 60.00 % | 0.14 | 0.54 | 8 % | Wide 7 · 1.33, Short 3 · 4.00 | 691 | 18 |

## High frequency

1m and 5m lanes, range seats, up to 20 positions and 24 seats per family; the short range beside the wide targets.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 16:00 → 2026-10-02 16:47 | 0.00 | 0 | 0.00 % | 0.00 | 0.00 | 0 % | – | 264 | 3 |
| 2026-09-30 16:00 → 2026-10-01 16:00 | 0.00 | 0 | 0.00 % | 0.00 | 0.00 | 0 % | – | 275 | 4 |
| 2026-09-29 16:00 → 2026-09-30 16:00 | 4.00 | 6 | 100.00 % | 1.45 | 1.03 | 8 % | Short 5 · 4.00, Minimal 1 · 4.00 | 294 | 3 |

## Combined · every range gated + Block

Short, minimal and micro ranges with their own seats, each through the range gate and the horizon fit, with Block.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 16:00 → 2026-10-02 16:48 | 0.49 | 19 | 26.32 % | -4.50 | 8.12 | 8 % | Wide 7 · 0.00 | 751 | 20 |
| 2026-09-30 16:00 → 2026-10-01 16:00 | 1.30 | 1014 | 67.16 % | -208.85 | 150.06 | 63 % | Wide 374 · 1.21, Short 135 · 0.65 | 828 | 25 |
| 2026-09-29 16:00 → 2026-09-30 16:00 | 5.91 | 18 | 77.78 % | 4.13 | 4.25 | 13 % | Wide 11 · 3.49, Short 7 · 4.00 | 749 | 22 |

## All configs · highest frequency

Every indication × bot, every range (gated), every strategy (Normal, Trailing, Block, DCA, Axis). Measured and set at 8 symbols (every combo on more symbols needs more memory).

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 16:00 → 2026-10-02 16:51 | 1.53 | 357 | 67.23 % | 32.70 | 43.66 | 71 % | Wide 106 · 1.43, Short 118 · 1.65 | 2526 | 141 |
| 2026-09-30 16:00 → 2026-10-01 16:00 | 1.19 | 6050 | 62.73 % | -229.74 | 350.46 | 67 % | Wide 753 · 0.79, Short 1530 · 1.00, Minimal 3 · 0.00 | 4315 | 212 |
| 2026-09-29 16:00 → 2026-09-30 16:00 | 1.29 | 1167 | 59.64 % | 67.07 | 31.11 | 58 % | Wide 92 · 2.56, Short 422 · 1.24, Minimal 78 · 0.58 | 3397 | 185 |

## Tight stop floor (0.3 %)

Default book with the wide-grid stop and trail floor at 0.3 %.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:02 | 0.49 | 13 | 30.77 % | -4.17 | 7.90 | 4 % | Wide 7 · 0.00 | 651 | 19 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 2.02 | 267 | 70.79 % | 43.70 | 87.28 | 42 % | Wide 154 · 2.89, Short 3 · 0.28 | 690 | 21 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.21 | 23 | 30.43 % | -7.73 | 15.14 | 8 % | Wide 16 · 0.13, Minimal 3 · 0.91 | 649 | 18 |

## Wide stop floor (0.8 %)

Default book with the wide-grid stop and trail floor at 0.8 %.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:04 | 0.49 | 13 | 30.77 % | -4.17 | 7.90 | 4 % | Wide 7 · 0.00 | 666 | 19 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 2.02 | 267 | 70.79 % | 43.70 | 87.28 | 42 % | Wide 154 · 2.89, Short 3 · 0.28 | 729 | 21 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.21 | 23 | 30.43 % | -7.73 | 15.14 | 8 % | Wide 16 · 0.13, Minimal 3 · 0.91 | 661 | 18 |

## Block Overall · 8× stack

Every source (overall, symbol, direction, indication) its own Block: 8 levels, Active from 2, ratio 0.5, each source up to 7× extra, stack ≤ 8×, 7 volume steps (one lot each). General + Long ranges (Minimal / Short lose after costs).

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:06 | 0.49 | 13 | 30.77 % | -4.17 | 7.90 | 4 % | Wide 7 · 0.00 | 686 | 17 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 2.28 | 195 | 69.23 % | 39.00 | 32.71 | 46 % | Wide 84 · 5.84 | 645 | 19 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.19 | 20 | 25.00 % | -7.70 | 15.14 | 4 % | Wide 16 · 0.13 | 640 | 17 |

## Block shared · 8× stack

The strongest source raises the volume: 4 levels, Active from 1, ratio 0.5, stack ≤ 8×, 7 volume steps. General + Long ranges.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:08 | 0.57 | 14 | 35.71 % | -1.34 | 2.98 | 8 % | Wide 7 · 0.00 | 613 | 15 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 2.36 | 190 | 68.42 % | 17.76 | 16.35 | 46 % | Wide 84 · 5.29 | 673 | 18 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.19 | 20 | 25.00 % | -2.89 | 5.82 | 4 % | Wide 16 · 0.13 | 612 | 16 |

## Block additive · 8× stack

The sources add their levels: 4 levels, Active from 1, ratio 1, stack ≤ 4×, 7 volume steps (best pooled PF of the 8× sweep). General + Long ranges.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:11 | 0.52 | 14 | 35.71 % | -2.06 | 4.04 | 8 % | Wide 7 · 0.00 | 623 | 16 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 2.34 | 190 | 68.42 % | 23.68 | 21.77 | 46 % | Wide 84 · 5.29 | 643 | 18 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.19 | 20 | 25.00 % | -3.85 | 7.72 | 4 % | Wide 16 · 0.13 | 641 | 17 |

## General + Long ranges

Only the ranges that carry the edge after costs: General 16–22× and Long 24–32× position cost; Normal + Trailing, no Block volume.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:13 | 0.40 | 19 | 26.32 % | -0.95 | 1.18 | 8 % | Wide 7 · 0.00 | 608 | 16 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 2.47 | 201 | 69.65 % | 6.59 | 5.46 | 50 % | Wide 84 · 5.29 | 635 | 17 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.19 | 20 | 25.00 % | -0.96 | 1.96 | 4 % | Wide 16 · 0.13 | 638 | 16 |

## Wide targets · tight stops (heatmap)

The heatmap leaders: TP 6–8 % with SL 0.5–0.75 × TP, trailing off / 0.5 / 0.75 (sim PF 1.37–1.51, positive in 5–6 of 6 windows); ranges off.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:15 | 0.00 | 0 | 0.00 % | 0.00 | 0.00 | 0 % | – | 575 | 13 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 3.57 | 252 | 80.95 % | 11.89 | 16.56 | 42 % | Wide 252 · 3.57 | 608 | 16 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.00 | 0 | 0.00 % | 0.00 | 0.00 | 0 % | – | 582 | 14 |

## Wide targets · tight stops + Block Overall

The heatmap leaders (TP 6–8 %, SL 0.5–0.75 × TP) with Block Overall at 8× stack.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:17 | 0.00 | 0 | 0.00 % | 0.00 | 0.00 | 0 % | – | 578 | 13 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 3.28 | 248 | 81.45 % | 78.78 | 100.96 | 38 % | Wide 248 · 3.28 | 629 | 15 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 0.00 | 0 | 0.00 % | 0.00 | 0.00 | 0 % | – | 577 | 14 |

## High order count · every evaluated config

The defaults with relaxed gates: no 50-close seat validation, no live last-N, min PF 1.05, symbol gate in veto mode, DDR 1. 12 windows: 4× the orders and 2.5× the net of the defaults, at PF 1.35 instead of 1.81 and a larger drawdown.

| window (UTC) | PF | orders | WR | net % | equity DD % | green hours | ranges (orders · PF) | memory MB | compute s |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 2026-10-01 17:00 → 2026-10-02 17:19 | 1.43 | 488 | 70.08 % | 0.21 | 73.79 | 42 % | Wide 392 · 1.25, Short 3 · 0.75 | 714 | 19 |
| 2026-09-30 17:00 → 2026-10-01 17:00 | 1.26 | 952 | 66.28 % | -106.10 | 223.34 | 63 % | Wide 500 · 1.15, Short 22 · 1.14 | 786 | 21 |
| 2026-09-29 17:00 → 2026-09-30 17:00 | 3.01 | 800 | 80.75 % | 493.08 | 68.25 | 50 % | Wide 682 · 3.49, Short 9 · 1.12, Minimal 3 · 0.91 | 691 | 18 |

