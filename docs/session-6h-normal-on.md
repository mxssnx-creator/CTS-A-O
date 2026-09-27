# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off, signals on)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T21:00 → 2026-09-27T03:26 UTC. Engine: Base 887/11048 passed, Main 887 pairs, 63170 tapes, Real 1128, compute 19 s.

**Result:** balance $10.00 → $32.06 (220.58 %) · PF 1.49 · 26 positions / 503 orders · WR 63.22 % · DDT 4.43 h · equity max drawdown $46.77 (70.87 %) · margin used max $165.90 · open avg 5.65 pos / 54.77 orders (peak 10 / 131)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 7 / 114 | 20.51 | $12.75 | $22.75 | $22.14 | $8.53 | $118.00 | 9 / 83 |
| 22:00 | 10 / 138 | 31.09 | $33.47 | $56.23 | $48.66 | $20.16 | $165.90 | 10 / 96 |
| 23:00 | 7 / 85 | 0.26 | -$8.23 | $48.00 | $32.64 | $32.64 | $165.00 | 8 / 84 |
| 00:00 | 8 / 57 | 0.19 | -$17.79 | $30.21 | $30.04 | $19.22 | $97.70 | 4 / 22 |
| 01:00 | 3 / 38 | 0.84 | -$1.02 | $29.19 | $29.28 | $28.20 | $27.60 | 1 / 1 |
| 02:00 | 9 / 48 | 1.08 | $0.30 | $29.49 | $29.82 | $26.11 | $47.10 | 2 / 3 |
| 03:00 | 3 / 23 | 4.93 | $2.57 | $32.06 | $32.08 | $27.26 | $24.40 | 1 / 1 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 268 | 1.34 | $8.53 | 66.42 % |
| Trailing | 224 | 2.03 | $16.27 | 61.16 % |
| Axis | 3 | 4.00 | $1.57 | 100.00 % |
| DCA | 8 | 0.00 | -$4.32 | 0.00 % |
| Block-raised | 388 | 1.53 | $21.83 | 64.69 % |
| Signals | 481 | 1.54 | $21.37 | 63.41 % |
| Engine (no signals) | 22 | 1.12 | $0.69 | 59.09 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 1m | 179 | 0.89 | -$1.10 |
| 5m | 180 | 1.59 | $8.79 |
| 5m+ | 6 | 1.52 | $0.54 |
| 15m | 130 | 2.00 | $15.48 |
| 1m+ | 2 | 4.00 | $0.51 |
| 30m | 6 | 0.49 | -$2.16 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 495 | 1.41 | 398.51 |
| Trailing only | 0 | 0.00 | 0.00 |
| Normal off, Block + DCA | 488 | 1.42 | 400.76 |
| Normal off · Trailing + Block Active | 457 | 1.29 | 328.74 |
| Normal + Trailing + Block Active | 608 | 1.32 | 389.25 |
| Normal off · Trailing + Axis | 7 | 1.74 | 15.15 |
| Normal only | 275 | 1.35 | 73.97 |
| Normal + Trailing + Block | 608 | 1.34 | 433.62 |
| DCA only | 37 | 1.03 | 3.84 |
| Normal + DCA Active | 272 | 1.24 | 55.96 |
| Axis only | 7 | 1.74 | 15.15 |
| All on + Axis (no Active) | 498 | 1.44 | 429.96 |
| Normal + Trailing | 488 | 1.46 | 159.66 |
| Block Active | 608 | 1.32 | 389.25 |
| DCA Active only | 6 | 0.14 | -19.75 |
| Normal off · Trailing + DCA | 37 | 1.03 | 3.84 |
| Normal + Axis | 282 | 1.48 | 101.50 |
| Block Active + DCA Active | 500 | 1.45 | 409.71 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
