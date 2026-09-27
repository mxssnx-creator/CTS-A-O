# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off, signals on)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T17:00 → 2026-09-26T23:50 UTC. Engine: Base 597/11016 passed, Main 140 pairs, 10820 tapes, Real 1032, compute 12 s.

**Result:** balance $10.00 → $44.47 (344.67 %) · PF 1.96 · 23 positions / 625 orders · WR 73.28 % · DDT 0.83 h · equity max drawdown $17.13 (28.43 %) · margin used max $114.80 · open avg 6.27 pos / 64.36 orders (peak 8 / 117)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 17:00 | 5 / 21 | 1.79 | $0.72 | $10.72 | $11.93 | $9.76 | $43.30 | 6 / 36 |
| 18:00 | 6 / 97 | 2.95 | $6.33 | $17.05 | $13.35 | $11.03 | $105.70 | 8 / 62 |
| 19:00 | 9 / 55 | 4.58 | $4.54 | $21.59 | $20.44 | $13.75 | $93.80 | 7 / 92 |
| 20:00 | 8 / 115 | 1.64 | $3.73 | $25.32 | $19.12 | $16.00 | $114.80 | 8 / 88 |
| 21:00 | 9 / 142 | 0.69 | -$5.55 | $19.77 | $19.43 | $17.30 | $113.50 | 7 / 54 |
| 22:00 | 8 / 162 | 6.88 | $25.63 | $45.40 | $46.41 | $17.46 | $84.80 | 6 / 36 |
| 23:00 | 8 / 33 | 0.65 | -$0.93 | $44.47 | $44.57 | $43.13 | $29.10 | 1 / 1 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 350 | 1.77 | $18.04 | 73.71 % |
| Trailing | 275 | 2.31 | $16.43 | 72.73 % |
| Axis | 0 | – | $0.00 | – |
| DCA | 0 | – | $0.00 | – |
| Block-raised | 625 | 1.96 | $34.47 | 73.28 % |
| Signals | 589 | 1.92 | $29.79 | 72.84 % |
| Engine (no signals) | 36 | 2.26 | $4.68 | 80.56 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 1m | 7 | 3.17 | $0.69 |
| 1m+ | 11 | 4.00 | $1.95 |
| 15m | 199 | 2.59 | $20.64 |
| 5m | 401 | 1.43 | $9.19 |
| 5m+ | 5 | 0.89 | -$0.14 |
| 30m | 2 | 4.00 | $2.13 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 661 | 2.00 | 725.17 |
| Trailing only | 268 | 1.14 | 28.75 |
| Normal off, Block + DCA | 633 | 1.96 | 689.00 |
| Normal off · Trailing + Block Active | 625 | 1.96 | 689.34 |
| Normal + Trailing + Block Active | 625 | 1.96 | 689.34 |
| Normal off · Trailing + Axis | 268 | 1.14 | 28.75 |
| Normal only | 387 | 1.87 | 226.81 |
| Normal + Trailing + Block | 666 | 2.03 | 749.75 |
| DCA only | 26 | 0.70 | -22.80 |
| Normal + DCA Active | 387 | 1.87 | 226.81 |
| Axis only | 4 | 0.17 | -25.55 |
| All on + Axis (no Active) | 661 | 2.00 | 725.17 |
| Normal + Trailing | 644 | 2.10 | 408.82 |
| Block Active | 625 | 1.96 | 689.34 |
| DCA Active only | 7 | 4.04 | 7.45 |
| Normal off · Trailing + DCA | 268 | 0.99 | -1.28 |
| Normal + Axis | 387 | 1.87 | 226.81 |
| Block Active + DCA Active | 625 | 1.96 | 689.34 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
