# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off, signals on)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T18:00 → 2026-09-27T00:58 UTC. Engine: Base 629/11048 passed, Main 629 pairs, 44960 tapes, Real 978, compute 33 s.

**Result:** balance $10.00 → $64.85 (548.45 %) · PF 2.45 · 20 positions / 719 orders · WR 72.18 % · DDT 1.67 h · equity max drawdown $29.74 (31.98 %) · margin used max $172.90 · open avg 4.70 pos / 64.13 orders (peak 9 / 174)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18:00 | 1 / 14 | 0.00 | -$1.89 | $8.11 | $7.97 | $7.14 | $24.90 | 3 / 14 |
| 19:00 | 4 / 33 | 23.92 | $2.05 | $10.16 | $10.46 | $6.89 | $78.90 | 7 / 81 |
| 20:00 | 8 / 115 | 4.40 | $7.83 | $17.99 | $14.53 | $8.11 | $145.80 | 7 / 133 |
| 21:00 | 9 / 192 | 2.49 | $15.94 | $33.93 | $27.46 | $8.63 | $172.90 | 5 / 59 |
| 22:00 | 8 / 177 | 7.04 | $37.08 | $71.00 | $76.05 | $30.44 | $112.10 | 4 / 38 |
| 23:00 | 7 / 125 | 0.92 | -$0.63 | $70.38 | $64.62 | $63.26 | $114.00 | 4 / 52 |
| 00:00 | 4 / 63 | 0.34 | -$5.53 | $64.85 | $64.85 | $63.33 | $62.70 | 0 / 0 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 377 | 1.84 | $20.97 | 72.41 % |
| Trailing | 338 | 3.86 | $33.88 | 71.89 % |
| Axis | 3 | 0.71 | -$0.27 | 66.67 % |
| DCA | 1 | 4.00 | $0.26 | 100.00 % |
| Block-raised | 719 | 2.45 | $54.85 | 72.18 % |
| Signals | 698 | 2.28 | $45.20 | 71.78 % |
| Engine (no signals) | 21 | 5.11 | $9.64 | 85.71 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 5m | 515 | 1.13 | $4.42 |
| 15m | 190 | 11.17 | $40.56 |
| 5m+ | 2 | 4.00 | $0.84 |
| 15m+ | 4 | 4.00 | $2.92 |
| 1m | 1 | 4.00 | $0.10 |
| 30m | 7 | 4.00 | $5.99 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 746 | 2.46 | 1110.33 |
| Trailing only | 372 | 2.98 | 326.36 |
| Normal off, Block + DCA | 730 | 2.45 | 1094.48 |
| Normal off · Trailing + Block Active | 715 | 2.49 | 1097.12 |
| Normal + Trailing + Block Active | 715 | 2.49 | 1097.12 |
| Normal off · Trailing + Axis | 375 | 2.81 | 320.59 |
| Normal only | 385 | 1.94 | 243.38 |
| Normal + Trailing + Block | 744 | 2.53 | 1128.34 |
| DCA only | 41 | 1.01 | 0.83 |
| Normal + DCA Active | 388 | 1.95 | 246.26 |
| Axis only | 1 | 4.00 | 5.30 |
| All on + Axis (no Active) | 749 | 2.42 | 1104.84 |
| Normal + Trailing | 744 | 2.56 | 582.76 |
| Block Active | 715 | 2.49 | 1097.12 |
| DCA Active only | 23 | 1.20 | 7.12 |
| Normal off · Trailing + DCA | 336 | 1.85 | 193.93 |
| Normal + Axis | 387 | 1.96 | 249.60 |
| Block Active + DCA Active | 716 | 2.50 | 1102.40 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
