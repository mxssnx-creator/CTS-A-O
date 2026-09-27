# Simulated trading session — 12 symbols, 6 h pre-historic + 6 h run (tactics off, signals on)

Real BingX 1m data, every timeframe lane (1 / 5 / 15 / 30 min, independent + combined), every strategy (Normal, Trailing, DCA, DCA Active, Axis) with Block. Balance $10.00; each order volume unit = $5.00 notional at 10× (margin $0.50); 0.20 % round-trip cost on every close. Window 2026-09-26T19:00 → 2026-09-27T01:00 UTC. Engine: Base 732/11048 passed, Main 732 pairs, 52260 tapes, Real 1744, compute 39 s.

**Result:** balance $10.00 → $60.88 (508.77 %) · PF 1.31 · 22 positions / 1288 orders · WR 64.67 % · DDT 1.83 h · equity max drawdown $176.64 (87.57 %) · margin used max $427.30 · open avg 7.93 pos / 210.75 orders (peak 10 / 418)

## Hour by hour

| hour (UTC) | positions / orders closed | PF | net | balance | equity (end) | equity low | margin max | open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 19:00 | 6 / 31 | 40.55 | $2.69 | $12.69 | $13.00 | $10.59 | $94.60 | 8 / 90 |
| 20:00 | 7 / 121 | 8.70 | $12.15 | $24.84 | $24.12 | $9.99 | $367.90 | 10 / 360 |
| 21:00 | 11 / 263 | 1.65 | $12.97 | $37.81 | $41.30 | $14.96 | $427.30 | 10 / 343 |
| 22:00 | 14 / 383 | 16.08 | $123.46 | $161.27 | $189.01 | $37.48 | $394.30 | 9 / 284 |
| 23:00 | 16 / 338 | 0.35 | -$45.38 | $115.88 | $92.45 | $89.98 | $330.30 | 10 / 247 |
| 00:00 | 6 / 152 | 0.18 | -$55.01 | $60.88 | $60.88 | $25.07 | $158.50 | 0 / 0 |

## Strategies

| strategy | orders | PF | net | WR |
|---|---:|---:|---:|---:|
| Normal | 778 | 1.17 | $18.20 | 63.88 % |
| Trailing | 498 | 1.57 | $32.89 | 66.27 % |
| Axis | 3 | 4.00 | $0.60 | 100.00 % |
| DCA | 9 | 0.27 | -$0.81 | 33.33 % |
| Block-raised | 1288 | 1.31 | $50.88 | 64.67 % |
| Signals | 680 | 1.01 | $0.73 | 64.26 % |
| Engine (no signals) | 608 | 1.53 | $50.15 | 65.13 % |

## Timeframe lanes

| lane | orders | PF | net |
|---|---:|---:|---:|
| 5m | 553 | 1.03 | $1.16 |
| 5m+ | 228 | 0.61 | -$19.05 |
| 15m | 252 | 0.88 | -$5.94 |
| 1m+ | 89 | 1.95 | $4.80 |
| 1m | 30 | 1.39 | $0.44 |
| 15m+ | 53 | 2.91 | $13.68 |
| 30m | 83 | 8.35 | $55.78 |

## Execution presets on the same tapes

| preset | orders | PF | net % of notional |
|---|---:|---:|---:|
| All on (no Active) | 1316 | 1.29 | 985.97 |
| Trailing only | 915 | 1.68 | 690.34 |
| Normal off, Block + DCA | 1298 | 1.29 | 976.82 |
| Normal off · Trailing + Block Active | 1276 | 1.31 | 1021.75 |
| Normal + Trailing + Block Active | 1276 | 1.31 | 1021.75 |
| Normal off · Trailing + Axis | 918 | 1.68 | 698.41 |
| Normal only | 966 | 1.40 | 486.33 |
| Normal + Trailing + Block | 1309 | 1.32 | 1046.00 |
| DCA only | 360 | 1.02 | 20.55 |
| Normal + DCA Active | 979 | 1.37 | 463.92 |
| Axis only | 20 | 0.49 | -41.99 |
| All on + Axis (no Active) | 1319 | 1.29 | 998.01 |
| Normal + Trailing | 1309 | 1.36 | 568.73 |
| Block Active | 1276 | 1.31 | 1021.75 |
| DCA Active only | 103 | 0.99 | -1.34 |
| Normal off · Trailing + DCA | 941 | 1.62 | 673.70 |
| Normal + Axis | 971 | 1.38 | 470.55 |
| Block Active + DCA Active | 1285 | 1.30 | 1005.50 |

A 6 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.
