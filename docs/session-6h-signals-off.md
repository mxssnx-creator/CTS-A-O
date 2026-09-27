# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off, signals off)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T17:00 → 2026-09-26T23:50 UTC. Engine: Base 597/10952 passed, Main 140 pairs, 9800 tapes, Real 12, compute 11 s.

**Result:** balance $10.00 → $11.66 (16.59 %) · PF 1.36 · 15 positions / 28 orders · WR 71.43 % · DDT 1.83 h · equity max drawdown $3.40 (26.81 %) · margin used max $16.30 · open avg 2.88 pos / 5.73 orders (peak 5 / 15)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 17:00 | 3 / 5 | 4.00 | $1.34 | $11.34 | $11.62 | $9.89 | $5.50 | 2 / 2 |
| 18:00 | 1 / 1 | 4.00 | $0.16 | $11.50 | $11.70 | $11.62 | $6.60 | 5 / 6 |
| 19:00 | 3 / 3 | 4.00 | $0.53 | $12.03 | $12.32 | $11.81 | $9.90 | 4 / 9 |
| 20:00 | 2 / 2 | 0.52 | -$0.16 | $11.87 | $10.60 | $9.28 | $15.40 | 4 / 12 |
| 21:00 | 4 / 12 | 0.45 | -$2.35 | $9.52 | $10.87 | $9.98 | $16.30 | 3 / 9 |
| 22:00 | 1 / 3 | 4.00 | $1.79 | $11.30 | $12.27 | $9.88 | $3.30 | 1 / 1 |
| 23:00 | 2 / 2 | 4.00 | $0.35 | $11.66 | $11.66 | $11.26 | $1.10 | 0 / 0 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 26 | 1.37 | $1.38 | 73.08 % |
| Trailing | 2 | 1.35 | $0.27 | 50.00 % |
| Axis | 0 | – | $0.00 | – |
| DCA | 0 | – | $0.00 | – |
| Block-raised | 28 | 1.36 | $1.66 | 71.43 % |
| Signals | 0 | – | $0.00 | – |
| Engine (no signals) | 28 | 1.36 | $1.66 | 71.43 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 1m | 6 | 2.62 | $0.52 |
| 1m+ | 7 | 4.00 | $1.24 |
| 5m | 8 | 0.56 | -$0.94 |
| 5m+ | 4 | 0.63 | -$0.50 |
| 30m | 2 | 4.00 | $2.13 |
| 15m | 1 | 0.00 | -$0.79 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 27 | 1.13 | 11.84 |
| Trailing only | 30 | 1.51 | 14.76 |
| Normal off, Block + DCA | 27 | 1.13 | 11.84 |
| Normal off · Trailing + Block Active | 28 | 1.36 | 33.18 |
| Normal + Trailing + Block Active | 28 | 1.36 | 33.18 |
| Normal off · Trailing + Axis | 30 | 1.51 | 14.76 |
| Normal only | 30 | 1.09 | 4.66 |
| Normal + Trailing + Block | 28 | 1.36 | 33.18 |
| DCA only | 26 | 0.70 | -22.80 |
| Normal + DCA Active | 30 | 1.09 | 4.66 |
| Axis only | 4 | 0.17 | -25.55 |
| All on + Axis (no Active) | 27 | 1.13 | 11.84 |
| Normal + Trailing | 28 | 1.35 | 14.96 |
| Block Active | 28 | 1.36 | 33.18 |
| DCA Active only | 7 | 4.04 | 7.45 |
| Normal off · Trailing + DCA | 26 | 0.69 | -25.61 |
| Normal + Axis | 30 | 1.09 | 4.66 |
| Block Active + DCA Active | 28 | 1.36 | 33.18 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
