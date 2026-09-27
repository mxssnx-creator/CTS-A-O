# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off, signals on)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T21:00 → 2026-09-27T03:26 UTC. Engine: Base 887/11048 passed, Main 887 pairs, 63170 tapes, Real 1128, compute 19 s.

**Result:** balance $10.00 → $31.82 (218.15 %) · PF 1.53 · 25 positions / 388 orders · WR 64.69 % · DDT 4.43 h · equity max drawdown $43.69 (71.10 %) · margin used max $154.00 · open avg 5.52 pos / 43.97 orders (peak 10 / 109)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 6 / 84 | 29.57 | $11.81 | $21.81 | $21.21 | $8.71 | $108.40 | 9 / 63 |
| 22:00 | 9 / 105 | 32.74 | $31.29 | $53.10 | $45.87 | $19.31 | $153.90 | 10 / 78 |
| 23:00 | 7 / 66 | 0.25 | -$7.66 | $45.44 | $30.72 | $30.72 | $154.00 | 8 / 68 |
| 00:00 | 8 / 46 | 0.20 | -$16.40 | $29.04 | $28.98 | $17.76 | $92.20 | 4 / 21 |
| 01:00 | 3 / 32 | 0.90 | -$0.60 | $28.44 | $28.53 | $27.45 | $25.20 | 1 / 1 |
| 02:00 | 8 / 35 | 1.28 | $0.78 | $29.22 | $29.55 | $25.69 | $42.10 | 1 / 1 |
| 03:00 | 3 / 20 | 5.11 | $2.59 | $31.82 | $31.84 | $27.02 | $24.40 | 1 / 1 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 206 | 1.33 | $7.70 | 66.02 % |
| Trailing | 171 | 2.21 | $16.86 | 65.50 % |
| Axis | 3 | 4.00 | $1.57 | 100.00 % |
| DCA | 8 | 0.00 | -$4.32 | 0.00 % |
| Block-raised | 388 | 1.53 | $21.82 | 64.69 % |
| Signals | 366 | 1.60 | $21.13 | 65.03 % |
| Engine (no signals) | 22 | 1.12 | $0.69 | 59.09 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 1m | 139 | 0.92 | -$0.64 |
| 5m | 137 | 1.60 | $8.25 |
| 5m+ | 6 | 1.52 | $0.54 |
| 15m | 98 | 2.10 | $15.32 |
| 1m+ | 2 | 4.00 | $0.51 |
| 30m | 6 | 0.49 | -$2.16 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 495 | 1.41 | 398.18 |
| Trailing only | 0 | 0.00 | 0.00 |
| Normal off, Block + DCA | 488 | 1.42 | 400.43 |
| Normal off · Trailing + Block Active | 457 | 1.29 | 328.41 |
| Normal + Trailing + Block Active | 608 | 1.32 | 388.92 |
| Normal off · Trailing + Axis | 7 | 1.74 | 15.15 |
| Normal only | 275 | 1.35 | 73.97 |
| Normal + Trailing + Block | 608 | 1.34 | 433.29 |
| DCA only | 37 | 1.03 | 3.84 |
| Normal + DCA Active | 272 | 1.24 | 55.96 |
| Axis only | 7 | 1.74 | 15.15 |
| All on + Axis (no Active) | 498 | 1.44 | 429.64 |
| Normal + Trailing | 488 | 1.46 | 159.66 |
| Block Active | 608 | 1.32 | 388.92 |
| DCA Active only | 6 | 0.14 | -19.75 |
| Normal off · Trailing + DCA | 37 | 1.03 | 3.84 |
| Normal + Axis | 282 | 1.48 | 101.50 |
| Block Active + DCA Active | 500 | 1.45 | 409.38 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
