# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T16:00 → 2026-09-26T22:46 UTC. Engine: Base 629/10952 passed, Main 140 pairs, 9800 tapes, Real 12, compute 5 s.

**Result:** balance $10.00 → $13.77 (37.74 %) · PF 6.37 · 17 positions / 18 orders · WR 88.89 % · DDT 0.77 h · equity max drawdown $0.55 (4.38 %) · margin used max $6.30 · open avg 2.61 pos / 2.75 orders (peak 5 / 6)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 16:00 | 1 / 1 | 4.00 | $0.61 | $10.61 | $10.60 | $10.00 | $0.90 | 1 / 1 |
| 17:00 | 3 / 3 | 4.00 | $0.40 | $11.01 | $11.31 | $10.51 | $3.90 | 3 / 3 |
| 18:00 | 4 / 4 | 37.27 | $0.52 | $11.53 | $11.89 | $11.32 | $5.50 | 3 / 3 |
| 19:00 | 2 / 2 | 4.00 | $0.35 | $11.88 | $12.40 | $11.79 | $3.30 | 3 / 3 |
| 20:00 | 1 / 1 | 4.00 | $0.18 | $12.06 | $12.03 | $12.00 | $5.20 | 4 / 5 |
| 21:00 | 6 / 7 | 3.49 | $1.72 | $13.77 | $13.95 | $12.06 | $6.30 | 2 / 2 |
| 22:00 | 0 / 0 | – | $0.00 | $13.77 | $13.77 | $13.77 | $0.00 | 0 / 0 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 5 | 3.84 | $1.96 | 80.00 % |
| Trailing | 13 | 128.49 | $1.82 | 92.31 % |
| Axis | 0 | – | $0.00 | – |
| DCA | 0 | – | $0.00 | – |
| Block-raised | 18 | 6.37 | $3.77 | 88.89 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 15m | 1 | 4.00 | $0.61 |
| 1m | 1 | 4.00 | $0.04 |
| 1m+ | 12 | 125.55 | $1.78 |
| 15m+ | 1 | 4.00 | $0.54 |
| 5m+ | 2 | 0.61 | -$0.27 |
| 30m | 1 | 4.00 | $1.07 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 18 | 6.37 | 75.48 |
| Trailing only | 23 | 4.15 | 35.84 |
| Normal off, Block + DCA | 18 | 6.37 | 75.48 |
| Normal off · Trailing + Block Active | 18 | 6.37 | 75.48 |
| Normal + Trailing + Block Active | 18 | 6.37 | 75.48 |
| Normal off · Trailing + Axis | 23 | 4.15 | 35.84 |
| Normal only | 17 | 3.29 | 24.13 |
| Normal + Trailing + Block | 18 | 6.37 | 75.48 |
| DCA only | 31 | 1.13 | 6.54 |
| Normal + DCA Active | 17 | 3.29 | 24.13 |
| Axis only | 3 | 0.26 | -15.38 |
| All on + Axis (no Active) | 18 | 6.37 | 75.48 |
| Normal + Trailing | 18 | 6.90 | 37.72 |
| Block Active | 18 | 6.37 | 75.48 |
| DCA Active only | 10 | 0.18 | -31.24 |
| Normal off · Trailing + DCA | 21 | 5.46 | 53.52 |
| Normal + Axis | 17 | 3.29 | 24.13 |
| Block Active + DCA Active | 18 | 6.37 | 75.48 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
