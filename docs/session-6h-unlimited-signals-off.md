# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off, signals off)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T19:00 → 2026-09-27T01:00 UTC. Engine: Base 732/10952 passed, Main 732 pairs, 51240 tapes, Real 724, compute 39 s.

**Result:** balance $10.00 → $50.15 (401.53 %) · PF 1.50 · 23 positions / 465 orders · WR 61.29 % · DDT 1.50 h · equity max drawdown $96.09 (67.64 %) · margin used max $156.10 · open avg 7.28 pos / 83.20 orders (peak 10 / 156)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 19:00 | 3 / 7 | 33.82 | $0.45 | $10.45 | $10.47 | $9.20 | $44.20 | 8 / 41 |
| 20:00 | 6 / 24 | 6.16 | $3.02 | $13.47 | $15.88 | $8.79 | $137.90 | 9 / 140 |
| 21:00 | 8 / 67 | 0.86 | -$1.45 | $12.02 | $17.87 | $10.98 | $156.10 | 9 / 126 |
| 22:00 | 12 / 160 | 24.68 | $81.04 | $93.06 | $132.18 | $17.77 | $144.70 | 8 / 129 |
| 23:00 | 14 / 169 | 0.36 | -$28.73 | $64.33 | $61.32 | $57.25 | $123.90 | 9 / 87 |
| 00:00 | 5 / 38 | 0.33 | -$14.18 | $50.15 | $50.15 | $45.96 | $40.90 | 0 / 0 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 298 | 1.19 | $10.79 | 60.74 % |
| Trailing | 160 | 2.41 | $29.99 | 63.75 % |
| Axis | 0 | – | $0.00 | – |
| DCA | 7 | 0.26 | -$0.62 | 28.57 % |
| Block-raised | 465 | 1.50 | $40.15 | 61.29 % |
| Signals | 0 | – | $0.00 | – |
| Engine (no signals) | 465 | 1.50 | $40.15 | 61.29 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 5m+ | 146 | 0.30 | -$27.86 |
| 1m+ | 75 | 1.73 | $3.50 |
| 1m | 18 | 0.54 | -$0.53 |
| 5m | 57 | 0.57 | -$4.32 |
| 15m+ | 52 | 2.90 | $13.55 |
| 15m | 35 | 1.03 | $0.31 |
| 30m | 82 | 8.31 | $55.50 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 476 | 1.47 | 772.94 |
| Trailing only | 515 | 1.86 | 582.26 |
| Normal off, Block + DCA | 465 | 1.46 | 762.06 |
| Normal off · Trailing + Block Active | 458 | 1.51 | 815.55 |
| Normal + Trailing + Block Active | 458 | 1.51 | 815.55 |
| Normal off · Trailing + Axis | 516 | 1.87 | 584.12 |
| Normal only | 588 | 1.49 | 435.64 |
| Normal + Trailing + Block | 472 | 1.52 | 826.07 |
| DCA only | 360 | 1.02 | 20.55 |
| Normal + DCA Active | 602 | 1.45 | 411.59 |
| Axis only | 20 | 0.49 | -41.99 |
| All on + Axis (no Active) | 476 | 1.47 | 772.94 |
| Normal + Trailing | 524 | 1.73 | 569.89 |
| Block Active | 458 | 1.51 | 815.55 |
| DCA Active only | 103 | 0.99 | -1.34 |
| Normal off · Trailing + DCA | 535 | 1.75 | 558.81 |
| Normal + Axis | 586 | 1.47 | 426.10 |
| Block Active + DCA Active | 465 | 1.50 | 803.06 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
