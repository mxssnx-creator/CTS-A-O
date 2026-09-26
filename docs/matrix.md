# Simulated trading matrix

16 settings variants × 14 execution presets × 3 periods (cur, prev, prev2) — every cell a complete causal walk-forward long run of 48 h runs on real 1h BingX data, 0.2% round-trip cost. Variant id = signal set – tactic – Block/DCA settings – last-N.

**Qualifying (PF ≥ 1.05 and ≥ 3 orders/day in every period): 2 of 224.**

| variant | execution | cur PF (orders/day · green h) | prev PF (orders/day · green h) | prev2 PF (orders/day · green h) | worst PF |
|---|---|---:|---:|---:|---:|
| robust-none-std-ln12 | Trailing only | 1.17 (8.36 · 56%) | 1.10 (8.98 · 55%) | 1.11 (9.44 · 52%) | **1.10** |
| robust-none-strong-ln12 | Trailing only | 1.17 (8.36 · 56%) | 1.10 (8.98 · 55%) | 1.11 (9.44 · 52%) | **1.10** |
| mom-none-std-ln12 | Block Active + DCA Active | 1.03 (7.01 · 50%) | 1.04 (8.65 · 50%) | 1.05 (8.21 · 51%) | 1.03 |
| mom-none-strong-ln12 | Block Active | 1.04 (8.33 · 52%) | 1.03 (8.84 · 51%) | 1.06 (8.94 · 49%) | 1.03 |
| mom-none-strong-ln12 | Normal off · Trailing + Block Active | 1.04 (8.33 · 52%) | 1.03 (8.84 · 51%) | 1.06 (8.94 · 49%) | 1.03 |
| mom-none-strong-ln12 | Normal + Trailing + Block Active | 1.04 (8.33 · 52%) | 1.03 (8.84 · 51%) | 1.06 (8.94 · 49%) | 1.03 |
| mom-none-std-ln12 | Normal + Trailing + Block | 1.03 (9.09 · 51%) | 1.03 (9.61 · 52%) | 1.06 (9.73 · 48%) | 1.03 |
| mom-none-std-ln12 | All on (no Active) | 1.06 (9.57 · 51%) | 1.03 (10.16 · 53%) | 1.06 (9.62 · 49%) | 1.03 |
| mom-none-std-ln12 | Normal off, Block + DCA | 1.08 (9.24 · 52%) | 1.03 (9.96 · 54%) | 1.06 (9.35 · 50%) | 1.03 |
| mom-none-strong-ln12 | Normal + Trailing + Block | 1.04 (9.07 · 51%) | 1.03 (9.55 · 52%) | 1.05 (9.72 · 47%) | 1.03 |
| mom-none-std-ln12 | Block Active | 1.04 (8.59 · 52%) | 1.02 (9.23 · 52%) | 1.07 (9.27 · 49%) | 1.02 |
| mom-none-std-ln12 | Normal off · Trailing + Block Active | 1.04 (8.59 · 52%) | 1.02 (9.23 · 52%) | 1.07 (9.27 · 49%) | 1.02 |
| mom-none-std-ln12 | Normal + Trailing + Block Active | 1.04 (8.59 · 52%) | 1.02 (9.23 · 52%) | 1.07 (9.27 · 49%) | 1.02 |
| mom-none-std-ln12 | Normal off · Trailing + DCA | 1.07 (9.92 · 54%) | 1.02 (10.20 · 54%) | 1.02 (9.86 · 51%) | 1.02 |
| robust-none-strong-ln12 | Normal off, Block + DCA | 1.05 (8.95 · 54%) | 1.07 (9.15 · 52%) | 1.02 (9.41 · 51%) | 1.02 |
| mom-none-std-ln12 | Normal + Trailing | 1.01 (9.11 · 51%) | 1.03 (9.61 · 52%) | 1.02 (9.73 · 48%) | 1.01 |
| mom-none-strong-ln12 | Normal + Trailing | 1.01 (9.11 · 51%) | 1.03 (9.61 · 52%) | 1.02 (9.73 · 48%) | 1.01 |
| robust-none-strong-ln0 | All on (no Active) | 1.04 (12.59 · 53%) | 1.06 (12.69 · 52%) | 1.01 (13.04 · 50%) | 1.01 |
| mom-none-strong-ln12 | Block Active + DCA Active | 1.03 (5.53 · 50%) | 1.01 (6.97 · 51%) | 1.12 (6.24 · 48%) | 1.01 |
| robust-none-strong-ln12 | Normal off · Trailing + DCA | 1.14 (9.08 · 58%) | 1.06 (9.75 · 55%) | 1.00 (10.13 · 53%) | 1.00 |
| mom-none-std-ln12 | Normal only | 1.05 (8.70 · 49%) | 1.06 (9.23 · 51%) | 1.00 (9.70 · 46%) | 1.00 |
| mom-none-strong-ln12 | Normal only | 1.05 (8.70 · 49%) | 1.06 (9.23 · 51%) | 1.00 (9.70 · 46%) | 1.00 |
| robust-none-strong-ln12 | All on (no Active) | 1.06 (9.14 · 55%) | 1.07 (9.50 · 52%) | 1.00 (9.75 · 51%) | 1.00 |
| robust-vol-std-ln12 | Normal only | 1.10 (7.21 · 52%) | 1.11 (6.93 · 50%) | 0.99 (6.47 · 47%) | 0.99 |
| robust-vol-strong-ln12 | Normal only | 1.10 (7.21 · 52%) | 1.11 (6.93 · 50%) | 0.99 (6.47 · 47%) | 0.99 |
| robust-vol-strong-ln12 | Block Active + DCA Active | 1.05 (5.79 · 52%) | 1.10 (5.79 · 51%) | 0.99 (5.66 · 49%) | 0.99 |
| robust-none-strong-ln0 | Normal off, Block + DCA | 1.04 (12.11 · 54%) | 1.08 (11.93 · 53%) | 0.98 (12.33 · 50%) | 0.98 |
| mom-none-strong-ln12 | All on (no Active) | 1.02 (9.54 · 51%) | 0.98 (10.32 · 53%) | 1.07 (10.09 · 48%) | 0.98 |
| robust-none-std-ln12 | Block Active + DCA Active | 1.12 (7.56 · 52%) | 1.07 (7.74 · 50%) | 0.98 (7.82 · 48%) | 0.98 |
| mom-none-std-ln12 | Normal + DCA Active | 0.98 (7.22 · 48%) | 1.07 (8.80 · 49%) | 1.02 (8.20 · 48%) | 0.98 |
| mom-none-std-ln12 | Trailing only | 1.01 (9.16 · 53%) | 0.98 (9.52 · 53%) | 1.01 (9.81 · 49%) | 0.98 |
| mom-none-strong-ln12 | Trailing only | 1.01 (9.16 · 53%) | 0.98 (9.52 · 53%) | 1.01 (9.81 · 49%) | 0.98 |
| mom-none-strong-ln12 | Normal off, Block + DCA | 1.03 (9.21 · 52%) | 0.98 (10.12 · 54%) | 1.07 (9.74 · 48%) | 0.98 |
| robust-vol-strong-ln12 | Block Active | 1.06 (6.69 · 52%) | 1.11 (6.51 · 51%) | 0.98 (6.18 · 49%) | 0.98 |
| robust-vol-strong-ln12 | Normal off · Trailing + Block Active | 1.06 (6.69 · 52%) | 1.11 (6.51 · 51%) | 0.98 (6.18 · 49%) | 0.98 |
| robust-vol-strong-ln12 | Normal + Trailing + Block Active | 1.06 (6.69 · 52%) | 1.11 (6.51 · 51%) | 0.98 (6.18 · 49%) | 0.98 |
| mom-none-std-ln0 | Normal only | 1.02 (16.79 · 50%) | 0.97 (16.84 · 50%) | 0.98 (17.79 · 46%) | 0.97 |
| mom-none-strong-ln0 | Normal only | 1.02 (16.79 · 50%) | 0.97 (16.84 · 50%) | 0.98 (17.79 · 46%) | 0.97 |
| mom-none-strong-ln12 | Normal + DCA Active | 0.97 (5.89 · 47%) | 1.04 (7.49 · 51%) | 1.06 (6.78 · 48%) | 0.97 |
| mom-vol-std-ln12 | Normal off · Trailing + DCA | 1.08 (7.71 · 55%) | 0.97 (7.27 · 54%) | 0.98 (6.64 · 51%) | 0.97 |
| robust-none-strong-ln0 | Normal + Trailing + Block | 1.04 (12.44 · 52%) | 1.08 (12.57 · 52%) | 0.96 (12.90 · 50%) | 0.96 |
| robust-vol-strong-ln12 | Normal off · Trailing + DCA | 1.14 (7.87 · 58%) | 0.96 (7.66 · 54%) | 1.00 (7.43 · 51%) | 0.96 |
| robust-none-std-ln12 | Normal + DCA Active | 1.14 (7.69 · 51%) | 1.07 (8.14 · 48%) | 0.96 (7.94 · 46%) | 0.96 |
| robust-none-strong-ln12 | Block Active | 1.08 (7.96 · 52%) | 1.14 (8.09 · 53%) | 0.96 (8.38 · 50%) | 0.96 |
| robust-none-strong-ln12 | Normal off · Trailing + Block Active | 1.08 (7.96 · 52%) | 1.14 (8.09 · 53%) | 0.96 (8.38 · 50%) | 0.96 |
| robust-none-strong-ln12 | Normal + Trailing + Block Active | 1.08 (7.96 · 52%) | 1.14 (8.09 · 53%) | 0.96 (8.38 · 50%) | 0.96 |
| mom-none-strong-ln0 | Block Active + DCA Active | 1.04 (8.18 · 50%) | 0.97 (9.39 · 50%) | 0.96 (9.07 · 48%) | 0.96 |
| mom-none-std-ln0 | Normal + Trailing + Block | 1.05 (17.55 · 52%) | 0.96 (17.13 · 51%) | 0.99 (18.40 · 49%) | 0.96 |
| robust-none-std-ln0 | Block Active | 1.03 (11.01 · 52%) | 1.10 (10.75 · 52%) | 0.96 (11.48 · 49%) | 0.96 |
| robust-none-std-ln0 | Normal off · Trailing + Block Active | 1.03 (11.01 · 52%) | 1.10 (10.75 · 52%) | 0.96 (11.48 · 49%) | 0.96 |
| robust-none-std-ln0 | Normal + Trailing + Block Active | 1.03 (11.01 · 52%) | 1.10 (10.75 · 52%) | 0.96 (11.48 · 49%) | 0.96 |
| robust-none-std-ln0 | Block Active + DCA Active | 1.05 (9.72 · 51%) | 1.09 (9.71 · 51%) | 0.96 (10.18 · 48%) | 0.96 |
| mom-none-strong-ln0 | Normal + Trailing + Block | 1.07 (17.53 · 52%) | 0.96 (17.08 · 51%) | 0.99 (18.39 · 49%) | 0.96 |
| mom-none-std-ln0 | All on (no Active) | 1.05 (17.95 · 52%) | 0.96 (17.56 · 51%) | 0.98 (18.48 · 50%) | 0.96 |
| robust-none-std-ln12 | Block Active | 1.08 (8.25 · 52%) | 1.12 (8.33 · 52%) | 0.96 (8.86 · 50%) | 0.96 |
| robust-none-std-ln12 | Normal off · Trailing + Block Active | 1.08 (8.25 · 52%) | 1.12 (8.33 · 52%) | 0.96 (8.86 · 50%) | 0.96 |
| robust-none-std-ln12 | Normal + Trailing + Block Active | 1.08 (8.25 · 52%) | 1.12 (8.33 · 52%) | 0.96 (8.86 · 50%) | 0.96 |
| robust-none-strong-ln12 | Block Active + DCA Active | 1.10 (6.62 · 53%) | 1.14 (7.11 · 53%) | 0.95 (7.07 · 47%) | 0.95 |
| robust-vol-std-ln12 | Normal + DCA Active | 1.09 (6.61 · 50%) | 1.11 (6.44 · 50%) | 0.95 (6.06 · 44%) | 0.95 |
| robust-vol-strong-ln12 | Normal + DCA Active | 1.08 (6.02 · 51%) | 1.15 (6.02 · 51%) | 0.95 (5.80 · 46%) | 0.95 |
| robust-vol-strong-ln0 | Block Active | 1.08 (8.56 · 53%) | 1.08 (7.95 · 50%) | 0.95 (7.70 · 47%) | 0.95 |
| robust-vol-strong-ln0 | Normal off · Trailing + Block Active | 1.08 (8.56 · 53%) | 1.08 (7.95 · 50%) | 0.95 (7.70 · 47%) | 0.95 |
| robust-vol-strong-ln0 | Normal + Trailing + Block Active | 1.08 (8.56 · 53%) | 1.08 (7.95 · 50%) | 0.95 (7.70 · 47%) | 0.95 |
| robust-vol-strong-ln12 | Normal off, Block + DCA | 1.08 (7.69 · 54%) | 1.04 (7.12 · 51%) | 0.95 (7.01 · 46%) | 0.95 |
| robust-none-std-ln0 | Normal + Trailing + Block | 1.04 (12.42 · 52%) | 1.08 (12.58 · 52%) | 0.95 (12.91 · 50%) | 0.95 |
| robust-none-std-ln12 | Normal only | 1.09 (8.51 · 52%) | 1.12 (8.88 · 49%) | 0.95 (8.98 · 49%) | 0.95 |
| robust-none-strong-ln12 | Normal only | 1.09 (8.51 · 52%) | 1.12 (8.88 · 49%) | 0.95 (8.98 · 49%) | 0.95 |
| mom-none-std-ln0 | Normal + Trailing | 1.03 (17.59 · 52%) | 0.95 (17.19 · 51%) | 0.96 (18.52 · 49%) | 0.95 |
| mom-none-strong-ln0 | Normal + Trailing | 1.03 (17.59 · 52%) | 0.95 (17.19 · 51%) | 0.96 (18.52 · 49%) | 0.95 |
| robust-none-std-ln0 | Normal only | 1.00 (12.13 · 49%) | 1.09 (12.32 · 50%) | 0.94 (12.47 · 47%) | 0.94 |
| robust-none-strong-ln0 | Normal only | 1.00 (12.13 · 49%) | 1.09 (12.32 · 50%) | 0.94 (12.47 · 47%) | 0.94 |
| mom-vol-strong-ln12 | Normal off · Trailing + DCA | 1.10 (7.61 · 55%) | 0.94 (7.46 · 54%) | 1.08 (6.56 · 52%) | 0.94 |
| robust-vol-strong-ln12 | All on (no Active) | 1.09 (7.86 · 55%) | 1.04 (7.33 · 50%) | 0.94 (7.14 · 46%) | 0.94 |
| mom-none-strong-ln12 | Normal off · Trailing + DCA | 1.01 (9.92 · 55%) | 0.94 (10.73 · 54%) | 1.04 (10.21 · 50%) | 0.94 |
| robust-vol-strong-ln0 | Block Active + DCA Active | 1.07 (7.10 · 51%) | 1.05 (7.00 · 50%) | 0.94 (6.93 · 46%) | 0.94 |
| mom-vol-std-ln12 | Trailing only | 1.06 (7.22 · 53%) | 0.94 (6.69 · 52%) | 0.96 (6.19 · 49%) | 0.94 |
| mom-vol-strong-ln12 | Trailing only | 1.06 (7.22 · 53%) | 0.94 (6.69 · 52%) | 0.96 (6.19 · 49%) | 0.94 |
| mom-none-strong-ln0 | Normal + DCA Active | 0.94 (11.19 · 47%) | 0.96 (12.66 · 50%) | 0.95 (12.52 · 47%) | 0.94 |
| mom-none-strong-ln0 | Block Active | 1.07 (12.44 · 52%) | 1.01 (12.47 · 51%) | 0.94 (13.29 · 49%) | 0.94 |
| mom-none-strong-ln0 | Normal off · Trailing + Block Active | 1.07 (12.44 · 52%) | 1.01 (12.47 · 51%) | 0.94 (13.29 · 49%) | 0.94 |

## By execution preset (median over settings variants)

| execution | median PF cur | median PF prev | median PF prev2 |
|---|---:|---:|---:|
| Trailing only | 1.06 | 1.02 | 0.92 |
| Block Active + DCA Active | 1.07 | 1.04 | 0.98 |
| Block Active | 1.08 | 1.07 | 0.96 |
| Normal off · Trailing + Block Active | 1.08 | 1.07 | 0.96 |
| Normal + Trailing + Block Active | 1.08 | 1.07 | 0.96 |
| Normal + Trailing + Block | 1.08 | 1.04 | 0.96 |
| All on (no Active) | 1.07 | 1.03 | 0.98 |
| Normal off, Block + DCA | 1.06 | 1.03 | 0.95 |
| Normal off · Trailing + DCA | 1.07 | 0.99 | 0.91 |
| Normal + Trailing | 1.06 | 1.07 | 0.93 |
| Normal only | 1.07 | 1.09 | 0.98 |
| Normal + DCA Active | 1.06 | 1.07 | 0.95 |
| DCA only | 1.02 | 1.00 | 0.81 |
| DCA Active only | 1.02 | 1.00 | 0.75 |

## By settings variant (median over execution presets)

| variant | median PF cur | median PF prev | median PF prev2 |
|---|---:|---:|---:|
| mom-none-std-ln0 | 1.05 | 0.97 | 0.94 |
| mom-none-std-ln12 | 1.04 | 1.03 | 1.05 |
| mom-none-strong-ln0 | 1.04 | 0.96 | 0.94 |
| mom-none-strong-ln12 | 1.03 | 1.03 | 1.06 |
| mom-vol-std-ln0 | 1.08 | 0.93 | 0.95 |
| mom-vol-std-ln12 | 1.08 | 0.91 | 1.04 |
| mom-vol-strong-ln0 | 1.07 | 0.93 | 0.93 |
| mom-vol-strong-ln12 | 1.09 | 0.88 | 1.06 |
| robust-none-std-ln0 | 1.03 | 1.07 | 0.92 |
| robust-none-std-ln12 | 1.09 | 1.10 | 0.95 |
| robust-none-strong-ln0 | 1.04 | 1.08 | 0.93 |
| robust-none-strong-ln12 | 1.08 | 1.10 | 0.96 |
| robust-vol-std-ln0 | 1.06 | 1.05 | 0.90 |
| robust-vol-std-ln12 | 1.09 | 1.10 | 0.91 |
| robust-vol-strong-ln0 | 1.07 | 1.05 | 0.91 |
| robust-vol-strong-ln12 | 1.09 | 1.08 | 0.95 |