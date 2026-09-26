# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics all)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T16:00 → 2026-09-26T22:47 UTC. Engine: Base 506/10952 passed, Main 140 pairs, 9800 tapes, Real 12, compute 9 s.

**Result:** balance $10.00 → $10.95 (9.47 %) · PF 1.31 · 9 positions / 17 orders · WR 64.71 % · DDT 3.45 h · equity max drawdown $1.06 (9.57 %) · margin used max $9.60 · open avg 3.52 pos / 3.96 orders (peak 7 / 9)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 16:00 | 1 / 3 | 9.72 | $0.62 | $10.62 | $10.46 | $9.98 | $5.90 | 3 / 4 |
| 17:00 | 3 / 3 | 4.00 | $0.29 | $10.92 | $11.03 | $10.46 | $7.20 | 5 / 6 |
| 18:00 | 5 / 6 | 0.47 | -$0.80 | $10.11 | $10.18 | $10.01 | $9.60 | 6 / 6 |
| 19:00 | 1 / 1 | 0.00 | -$0.47 | $9.64 | $10.44 | $10.08 | $5.20 | 4 / 4 |
| 20:00 | 0 / 0 | – | $0.00 | $9.64 | $10.77 | $10.35 | $4.30 | 4 / 4 |
| 21:00 | 4 / 4 | 2.27 | $1.30 | $10.95 | $10.93 | $10.48 | $4.30 | 2 / 2 |
| 22:00 | 0 / 0 | – | $0.00 | $10.95 | $10.95 | $10.95 | $0.00 | 0 / 0 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 12 | 1.80 | $1.58 | 75.00 % |
| Trailing | 5 | 0.44 | -$0.63 | 40.00 % |
| Axis | 0 | – | $0.00 | – |
| DCA | 0 | – | $0.00 | – |
| Block-raised | 17 | 1.31 | $0.95 | 64.71 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 1m | 2 | 0.72 | -$0.02 |
| 15m | 3 | 0.42 | -$0.61 |
| 15m+ | 1 | 4.00 | $0.26 |
| 1m+ | 3 | 4.00 | $0.36 |
| 30m | 3 | 4.00 | $2.51 |
| 5m | 4 | 0.43 | -$0.53 |
| 5m+ | 1 | 0.00 | -$1.03 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 14 | 0.38 | -78.58 |
| Trailing only | 19 | 2.46 | 25.63 |
| Normal off, Block + DCA | 14 | 0.38 | -78.58 |
| Normal off · Trailing + Block Active | 17 | 1.31 | 18.95 |
| Normal + Trailing + Block Active | 17 | 1.31 | 18.95 |
| Normal off · Trailing + Axis | 19 | 2.46 | 25.63 |
| Normal only | 25 | 1.44 | 15.01 |
| Normal + Trailing + Block | 18 | 1.39 | 23.70 |
| DCA only | 25 | 0.81 | -7.12 |
| Normal + DCA Active | 25 | 1.44 | 15.01 |
| Axis only | 0 | 0.00 | 0.00 |
| All on + Axis (no Active) | 14 | 0.38 | -78.58 |
| Normal + Trailing | 18 | 1.49 | 14.55 |
| Block Active | 17 | 1.31 | 18.95 |
| DCA Active only | 7 | 0.37 | -11.35 |
| Normal off · Trailing + DCA | 28 | 0.83 | -10.03 |
| Normal + Axis | 25 | 1.44 | 15.01 |
| Block Active + DCA Active | 17 | 1.31 | 18.95 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
