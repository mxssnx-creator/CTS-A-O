# Live test on BingX VST (x02) — every config set, independently

Each config set ran as its own desk with its own tracking tag, on its own slice of the symbol ranking, at minimum volume (each order at the contract's exchange minimum, at most $10 per position). The desks were checked every 10 minutes. Exchange results are read back by each tag's own client ids (fills, realized profit, fees). Simulation numbers use the engine's 0.20 % round-trip cost.

What each number covers:

- **Live** (own orders, positions, won, live PF, net, fees, and the exchange tables): every own order of the tag on the exchange over the whole run, across restarts, including the closes at the end.
- **Paper** (paper PF · closes): the paper book's closes since the desk's last start.
- **Simulated**: the last compute — the simulated run PF and orders, the seats, and the indication-type tables over the simulated window.
- **Hours**: the desk's last process segment (see the run history).

## Overview

| desk | tag | symbols | last segment h | computes | sim PF · orders | seats | paper PF · closes | live PF | own orders | positions (open) | won | live net USDT | fees USDT |
|---|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|---:|---:|
| all-configs | CTSV2F_ | 12 (36+) | 0.67 | 38 | 2.20 · 570 | 34 | 5.73 · 18 | 0.74 | 116 | 42 (0) | 15 | -0.60 | 0.42 |
| combined | CTSV2C_ | 12 (24+) | 0.67 | 41 | 0.83 · 77 | 8 | 0.00 · 1 | 0.60 | 94 | 32 (0) | 9 | -0.76 | 0.32 |
| default | CTSV2A_ | 12 (0+) | 0.86 | 56 | 2.04 · 440 | 32 | 0.74 · 13 | 1.05 | 177 | 27 (0) | 14 | 0.15 | 0.40 |
| low-drawdown | CTSV2L_ | 12 (12+) | 0.85 | 52 | 4.00 · 5 | 0 | – | – | 0 | 0 (0) | 0 | 0.00 | 0.00 |
| micro | CTSV2U_ | 12 (72+) | 0.67 | 33 | 0.87 · 1183 | 98 | – | 0.00 | 9 | 3 (0) | 0 | -0.21 | 0.03 |
| minimal | CTSV2N_ | 12 (60+) | 0.78 | 49 | 0.59 · 531 | 27 | – | 0.89 | 11 | 4 (0) | 3 | -0.02 | 0.04 |
| plus | CTSV2P_ | 12 (84+) | 0.75 | 28 | 0.51 · 511 | 28 | 0.00 · 7 | 0.37 | 35 | 11 (0) | 4 | -0.25 | 0.12 |
| short | CTSV2H_ | 12 (48+) | 0.80 | 48 | 1.21 · 1432 | 36 | 1.25 · 39 | 1.53 | 93 | 31 (0) | 16 | 0.49 | 0.32 |

## all-configs (CTSV2F_)

**Settings.** 12 symbols (ADA-USDT, ARB-USDT, ETHFI-USDT, KAITO-USDT, LIGHTER-USDT, MOODENG-USDT, ONDO-USDT, PLUME-USDT, POL-USDT, TAO-USDT, VIRTUAL-USDT, ZK-USDT); focus every indication × bot; wide off, minimal 7×5×3, micro 13×5×3; range gate on, fit on, range seats on; toggles normal, trailing, block, dca, axis; min PF default; probe off; cycle 250 ms.

**Engine.** 38 computes (last 59 s), state computing, simulated run PF 2.20 over 570 orders, 34 seats; memory 2107 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:11 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| active | 1324 · 208 · 58407 · 0.63 | 144 · 3847 · 1.49 | 140 · 52 · 0.72 · 59 % | 63 % | 42.55 h | 12.69 |
| bollinger | 800 · 29 · 12155 · 0.32 | 27 · 256 · 2.56 | – | – | – | – |
| break | 3244 · 1514 · 85619 · 0.94 | 1114 · 24714 · 2.36 | 344 · 35 · 3.09 · 79 % | 79 % | 14.08 h | 29.04 |
| channel | 668 · 202 · 3409 · 0.41 | 190 · 683 · 4.57 | 7 · 6 · 1.60 · 71 % | 71 % | 24.50 h | 2.00 |
| direction | 1804 · 200 · 178155 · 0.55 | 158 · 5148 · 1.40 | 1 · 1 · 4.00 · 100 % | 100 % | 0.00 h | 2.27 |
| ema | 1352 · 46 · 142622 · 0.53 | 28 · 825 · 1.44 | – | – | – | – |
| ichimoku | 650 · 18 · 48600 · 0.41 | 16 · 305 · 1.55 | – | – | – | – |
| macd | 242 · 4 · 28669 · 0.44 | 2 · 48 · 1.35 | – | – | – | – |
| move | 488 · 49 · 24984 · 0.42 | 44 · 230 · 3.11 | – | – | – | – |
| osc | 40 · 0 · 184 · 0.31 | – | – | – | – | – |
| rsi | 1900 · 45 · 147517 · 0.41 | 38 · 830 · 1.49 | 5 · 5 · 0.09 · 40 % | 67 % | 1.50 h | 1.11 |
| smooth | 164 · 4 · 16423 · 0.55 | 3 · 80 · 1.36 | – | – | – | – |
| trend | 2080 · 211 · 112211 · 0.53 | 131 · 14355 · 1.33 | 99 · 45 · 2.08 · 77 % | 67 % | 8.80 h | 7.18 |

### Exchange, by own client ids

| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |
|---|---:|---:|---:|---:|---:|---:|
| Wide / mixed | 42 | 15 | 0.74 | -0.60 | 0.42 | 0.10 |

| symbol | side | range | opened | last | orders | net USDT | open |
|---|---|---|---|---|---:|---:|---|
| BLUAI-USDT | SHORT | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | 0.21 | no |
| BLUAI-USDT | LONG | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | -0.26 | no |
| DEEP-USDT | SHORT | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | 0.02 | no |
| DEEP-USDT | LONG | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | -0.05 | no |
| SPX-USDT | SHORT | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | -0.03 | no |
| SPX-USDT | LONG | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | -0.00 | no |
| STX-USDT | SHORT | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | -0.03 | no |
| STX-USDT | LONG | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | -0.01 | no |
| SYRUP-USDT | SHORT | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | 0.01 | no |
| SYRUP-USDT | LONG | Wide / mixed | 2026-10-01 20:01 | 2026-10-01 20:23 | 2 | -0.03 | no |
| KAITO-USDT | LONG | Wide / mixed | 2026-10-01 20:23 | 2026-10-02 02:03 | 2 | 0.22 | no |
| MOODENG-USDT | SHORT | Wide / mixed | 2026-10-01 20:23 | 2026-10-01 20:45 | 2 | -0.01 | no |
| POL-USDT | LONG | Wide / mixed | 2026-10-01 20:23 | 2026-10-02 02:11 | 2 | 0.08 | no |
| VIRTUAL-USDT | SHORT | Wide / mixed | 2026-10-01 20:23 | 2026-10-01 22:25 | 2 | 0.10 | no |
| VIRTUAL-USDT | LONG | Wide / mixed | 2026-10-01 20:23 | 2026-10-01 20:45 | 2 | -0.05 | no |
| ZK-USDT | LONG | Wide / mixed | 2026-10-01 20:23 | 2026-10-01 20:45 | 2 | -0.05 | no |
| ETHFI-USDT | LONG | Wide / mixed | 2026-10-01 20:45 | 2026-10-02 04:01 | 2 | -0.14 | no |
| LIGHTER-USDT | LONG | Wide / mixed | 2026-10-01 20:45 | 2026-10-02 03:48 | 2 | -0.44 | no |
| MOODENG-USDT | LONG | Wide / mixed | 2026-10-01 20:45 | 2026-10-01 21:35 | 2 | -0.11 | no |
| ZK-USDT | SHORT | Wide / mixed | 2026-10-01 20:45 | 2026-10-02 02:11 | 2 | -0.53 | no |
| ARB-USDT | LONG | Wide / mixed | 2026-10-01 21:03 | 2026-10-02 04:01 | 2 | 0.19 | no |
| ONDO-USDT | LONG | Wide / mixed | 2026-10-01 21:03 | 2026-10-02 04:01 | 2 | 0.08 | no |
| TAO-USDT | LONG | Wide / mixed | 2026-10-01 21:03 | 2026-10-01 21:29 | 2 | -0.11 | no |
| VIRTUAL-USDT | LONG | Wide / mixed | 2026-10-01 21:03 | 2026-10-01 21:03 | 2 | -0.02 | no |
| VIRTUAL-USDT | LONG | Wide / mixed | 2026-10-01 21:09 | 2026-10-02 04:01 | 2 | 0.10 | no |
| TAO-USDT | LONG | Wide / mixed | 2026-10-01 21:31 | 2026-10-01 22:25 | 2 | 0.01 | no |
| MOODENG-USDT | LONG | Wide / mixed | 2026-10-01 21:47 | 2026-10-02 02:03 | 2 | 0.04 | no |
| TAO-USDT | SHORT | Wide / mixed | 2026-10-01 22:25 | 2026-10-01 22:50 | 2 | 0.03 | no |
| ZK-USDT | LONG | Wide / mixed | 2026-10-01 22:25 | 2026-10-01 22:50 | 2 | -0.04 | no |
| ONDO-USDT | SHORT | Wide / mixed | 2026-10-01 22:50 | 2026-10-02 04:01 | 2 | -0.03 | no |
| PLUME-USDT | LONG | Wide / mixed | 2026-10-01 22:50 | 2026-10-02 04:01 | 2 | 0.17 | no |
| KAITO-USDT | SHORT | Wide / mixed | 2026-10-02 02:03 | 2026-10-02 04:01 | 2 | -0.04 | no |
| LIGHTER-USDT | SHORT | Wide / mixed | 2026-10-02 02:03 | 2026-10-02 02:03 | 2 | -0.01 | no |
| TAO-USDT | LONG | Wide / mixed | 2026-10-02 02:03 | 2026-10-02 04:01 | 2 | 0.11 | no |
| LIGHTER-USDT | SHORT | Wide / mixed | 2026-10-02 02:04 | 2026-10-02 02:04 | 2 | -0.01 | no |
| LIGHTER-USDT | SHORT | Wide / mixed | 2026-10-02 02:06 | 2026-10-02 02:06 | 2 | -0.01 | no |
| LIGHTER-USDT | SHORT | Wide / mixed | 2026-10-02 02:10 | 2026-10-02 02:10 | 2 | -0.01 | no |
| VIRTUAL-USDT | SHORT | Wide / mixed | 2026-10-02 02:11 | 2026-10-02 04:01 | 2 | -0.09 | no |
| ZK-USDT | SHORT | Wide / mixed | 2026-10-02 02:11 | 2026-10-02 04:01 | 2 | -0.16 | no |
| LIGHTER-USDT | SHORT | Wide / mixed | 2026-10-02 02:18 | 2026-10-02 02:18 | 2 | -0.01 | no |
| LIGHTER-USDT | SHORT | Wide / mixed | 2026-10-02 02:34 | 2026-10-02 02:34 | 2 | -0.01 | no |
| LIGHTER-USDT | SHORT | Wide / mixed | 2026-10-02 03:00 | 2026-10-02 04:01 | 2 | 0.32 | no |

**Paper closes during the run (range: closes · PF · $ at the live unit).** Short: 13 · 68.20 · 0.19; Wide: 4 · 1.09 · 0.00; Minimal: 1 · 4.00 · 0.01.

## combined (CTSV2C_)

**Settings.** 12 symbols (COOKIE-USDT, DEEP-USDT, ENA-USDT, FLOCK-USDT, HANA-USDT, KITE-USDT, ORCA-USDT, SPX-USDT, STX-USDT, WLD-USDT, XPL-USDT, ZEC-USDT); focus 16 pairs; wide off, minimal 7×5×3, micro 13×5×3; range gate on, fit on, range seats on; toggles normal, trailing, block; min PF default; probe off; cycle 250 ms.

**Engine.** 41 computes (last 15 s), state running, simulated run PF 0.83 over 77 orders, 8 seats; memory 1508 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:11 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| bollinger | 120 · 51 · 620 · 0.88 | 50 · 326 · 2.05 | – | – | – | – |
| break | 244 · 22 · 3399 · 0.47 | 20 · 174 · 1.45 | – | – | – | – |
| direction | 1286 · 47 · 154239 · 0.61 | 31 · 1236 · 1.30 | 17 · 8 · 0.58 · 47 % | 75 % | 43.50 h | 8.30 |
| ema | 916 · 56 · 105477 · 0.60 | 27 · 1559 · 1.34 | 22 · 11 · 1.73 · 64 % | 64 % | 34.00 h | 5.78 |
| ichimoku | 588 · 19 · 47692 · 0.60 | 12 · 563 · 1.19 | 15 · 7 · 0.46 · 33 % | 44 % | 38.00 h | 9.16 |
| macd | 242 · 10 · 28399 · 0.64 | 7 · 278 · 1.27 | – | – | – | – |
| move | 204 · 8 · 16751 · 0.51 | 5 · 161 · 1.28 | 2 · 2 · 29.53 · 50 % | 50 % | 2.00 h | 0.68 |
| osc | 244 · 97 · 3313 · 1.02 | 74 · 1124 · 1.68 | – | – | – | – |
| rsi | 2522 · 145 · 142781 · 0.42 | 118 · 1817 · 1.64 | 10 · 8 · 0.34 · 30 % | 43 % | 23.00 h | 6.85 |
| smooth | 188 · 7 · 19691 · 0.65 | 5 · 198 · 1.39 | 5 · 5 · 1.61 · 60 % | 60 % | 47.50 h | 2.55 |
| trend | 384 · 9 · 39306 · 0.59 | 4 · 133 · 1.31 | 2 · 2 · 1.24 · 50 % | 50 % | 20.00 h | 1.28 |

### Exchange, by own client ids

| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |
|---|---:|---:|---:|---:|---:|---:|
| Wide / mixed | 31 | 9 | 0.61 | -0.74 | 0.31 | 0.10 |
| Short | 1 | 0 | 0.00 | -0.02 | 0.01 | 0.10 |

| symbol | side | range | opened | last | orders | net USDT | open |
|---|---|---|---|---|---:|---:|---|
| ENA-USDT | SHORT | Wide / mixed | 2026-10-01 19:40 | 2026-10-01 20:17 | 2 | -0.05 | no |
| FARTCOIN-USDT | SHORT | Wide / mixed | 2026-10-01 19:40 | 2026-10-01 20:17 | 2 | -0.33 | no |
| JUP-USDT | SHORT | Wide / mixed | 2026-10-01 19:40 | 2026-10-01 20:17 | 2 | -0.15 | no |
| ON-USDT | SHORT | Wide / mixed | 2026-10-01 19:40 | 2026-10-01 20:17 | 2 | -0.02 | no |
| ON-USDT | LONG | Short | 2026-10-01 19:40 | 2026-10-01 20:17 | 2 | -0.02 | no |
| SOON-USDT | SHORT | Wide / mixed | 2026-10-01 19:40 | 2026-10-01 20:17 | 2 | -0.09 | no |
| SOON-USDT | LONG | Wide / mixed | 2026-10-01 19:40 | 2026-10-01 20:17 | 2 | 0.06 | no |
| NEAR-USDT | SHORT | Wide / mixed | 2026-10-01 19:56 | 2026-10-01 20:17 | 2 | -0.01 | no |
| NEAR-USDT | LONG | Wide / mixed | 2026-10-01 19:56 | 2026-10-01 20:17 | 2 | -0.01 | no |
| SUI-USDT | SHORT | Wide / mixed | 2026-10-01 20:06 | 2026-10-01 20:17 | 2 | 0.06 | no |
| SUI-USDT | LONG | Wide / mixed | 2026-10-01 20:06 | 2026-10-01 20:17 | 2 | -0.09 | no |
| COOKIE-USDT | LONG | Wide / mixed | 2026-10-01 20:17 | 2026-10-01 20:39 | 2 | -0.00 | no |
| DEEP-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:01 | 2 | 0.36 | no |
| ENA-USDT | SHORT | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:01 | 2 | 0.00 | no |
| HANA-USDT | SHORT | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:01 | 2 | -0.13 | no |
| ORCA-USDT | SHORT | Wide / mixed | 2026-10-01 20:39 | 2026-10-01 22:03 | 2 | 0.00 | no |
| ORCA-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:01 | 2 | 0.10 | no |
| SPX-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 02:02 | 2 | 0.04 | no |
| STX-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:01 | 2 | -0.03 | no |
| XPL-USDT | SHORT | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 02:30 | 2 | -0.10 | no |
| ZEC-USDT | SHORT | Wide / mixed | 2026-10-01 21:03 | 2026-10-02 04:01 | 2 | -0.03 | no |
| WLD-USDT | SHORT | Wide / mixed | 2026-10-01 21:25 | 2026-10-02 02:08 | 2 | -0.03 | no |
| WLD-USDT | LONG | Wide / mixed | 2026-10-01 21:25 | 2026-10-02 02:08 | 2 | 0.12 | no |
| XPL-USDT | LONG | Wide / mixed | 2026-10-01 22:03 | 2026-10-01 22:04 | 2 | -0.02 | no |
| ORCA-USDT | SHORT | Wide / mixed | 2026-10-01 22:04 | 2026-10-01 22:54 | 2 | -0.12 | no |
| COOKIE-USDT | LONG | Wide / mixed | 2026-10-01 23:00 | 2026-10-02 02:02 | 2 | 0.40 | no |
| DEEP-USDT | SHORT | Wide / mixed | 2026-10-02 02:02 | 2026-10-02 04:01 | 2 | -0.28 | no |
| FLOCK-USDT | SHORT | Wide / mixed | 2026-10-02 02:02 | 2026-10-02 04:01 | 2 | -0.11 | no |
| KITE-USDT | LONG | Wide / mixed | 2026-10-02 02:02 | 2026-10-02 04:01 | 2 | -0.02 | no |
| SPX-USDT | SHORT | Wide / mixed | 2026-10-02 02:02 | 2026-10-02 04:01 | 2 | -0.08 | no |
| STX-USDT | SHORT | Wide / mixed | 2026-10-02 02:02 | 2026-10-02 04:01 | 2 | -0.11 | no |
| WLD-USDT | SHORT | Wide / mixed | 2026-10-02 02:30 | 2026-10-02 04:01 | 2 | -0.05 | no |

**Paper closes during the run (range: closes · PF · $ at the live unit).** Wide: 1 · 0.00 · -0.03.

## default (CTSV2A_)

**Settings.** 12 symbols (AT-USDT, BLUAI-USDT, GRASS-USDT, LYN-USDT, MOVE-USDT, MOVR-USDT, NIGHT-USDT, PUMP-USDT, QNT-USDT, RESOLV-USDT, UAI-USDT, ZRO-USDT); focus 16 pairs; wide off; range gate on, fit on, range seats off; toggles default; min PF default; probe off; cycle 250 ms.

**Engine.** 56 computes (last 14 s), state computing, simulated run PF 2.04 over 440 orders, 32 seats; memory 976 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:51 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| active | 156 · 46 · 1565 · 1.64 | 30 · 350 · 6.26 | – | – | – | – |
| bollinger | 40 · 31 · 248 · 1.97 | 27 · 211 · 2.10 | – | – | – | – |
| break | 196 · 90 · 4672 · 1.44 | 86 · 1267 · 2.28 | 3 · 3 · 4.00 · 100 % | 100 % | 0.00 h | 2.98 |
| direction | 672 · 114 · 67792 · 0.73 | 95 · 3596 · 1.47 | 151 · 27 · 1.92 · 60 % | 64 % | 23.25 h | 22.87 |
| ema | 578 · 110 · 57664 · 0.77 | 95 · 3727 · 1.50 | 132 · 25 · 1.79 · 60 % | 59 % | 20.75 h | 20.45 |
| ichimoku | 296 · 67 · 19886 · 0.88 | 54 · 1851 · 1.76 | 54 · 20 · 2.24 · 67 % | 70 % | 15.00 h | 10.42 |
| macd | 116 · 27 · 10958 · 0.79 | 24 · 864 · 1.37 | 28 · 17 · 5.28 · 68 % | 65 % | 11.50 h | 3.24 |
| move | 116 · 22 · 8974 · 0.83 | 20 · 791 · 1.79 | 6 · 5 · 67.35 · 83 % | 100 % | 5.50 h | 1.26 |
| osc | 120 · 87 · 675 · 4.42 | 79 · 592 · 5.10 | – | – | – | – |
| rsi | 728 · 65 · 53466 · 0.68 | 57 · 1461 · 1.78 | 6 · 6 · 0.56 · 50 % | 50 % | 13.20 h | 2.82 |
| smooth | 116 · 15 · 10822 · 0.70 | 13 · 495 · 1.50 | 5 · 5 · 2.77 · 60 % | 75 % | 5.00 h | 1.08 |
| trend | 192 · 35 · 16750 · 0.78 | 31 · 1036 · 1.66 | 55 · 20 · 1.66 · 65 % | 72 % | 10.25 h | 12.77 |

### Exchange, by own client ids

| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |
|---|---:|---:|---:|---:|---:|---:|
| Wide / mixed | 27 | 14 | 1.05 | 0.15 | 0.40 | 0.11 |

| symbol | side | range | opened | last | orders | net USDT | open |
|---|---|---|---|---|---:|---:|---|
| AT-USDT | SHORT | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:38 | 2 | -0.23 | no |
| AT-USDT | LONG | Wide / mixed | 2026-10-01 19:35 | 2026-10-02 04:00 | 2 | 0.37 | no |
| GRASS-USDT | SHORT | Wide / mixed | 2026-10-01 19:35 | 2026-10-02 04:00 | 2 | -0.03 | no |
| GRASS-USDT | LONG | Wide / mixed | 2026-10-01 19:35 | 2026-10-02 04:00 | 2 | 0.01 | no |
| LYN-USDT | SHORT | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 19:53 | 2 | -0.20 | no |
| LYN-USDT | LONG | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:38 | 2 | 0.20 | no |
| MOVE-USDT | LONG | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:17 | 2 | 0.03 | no |
| NIGHT-USDT | LONG | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:17 | 2 | 0.23 | no |
| RESOLV-USDT | SHORT | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:18 | 2 | -0.23 | no |
| RESOLV-USDT | LONG | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:38 | 2 | 0.33 | no |
| ZRO-USDT | SHORT | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:39 | 2 | -0.13 | no |
| ZRO-USDT | LONG | Wide / mixed | 2026-10-01 19:35 | 2026-10-01 20:18 | 2 | 0.21 | no |
| LYN-USDT | SHORT | Wide / mixed | 2026-10-01 19:56 | 2026-10-01 20:01 | 2 | -0.08 | no |
| LYN-USDT | SHORT | Wide / mixed | 2026-10-01 20:18 | 2026-10-02 02:57 | 2 | -0.33 | no |
| MOVE-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:00 | 2 | -0.37 | no |
| NIGHT-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:00 | 2 | -0.19 | no |
| PUMP-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:00 | 2 | 0.04 | no |
| RESOLV-USDT | SHORT | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:00 | 4 | -0.31 | no |
| UAI-USDT | SHORT | Wide / mixed | 2026-10-01 20:39 | 2026-10-01 20:57 | 2 | -0.40 | no |
| UAI-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-01 21:09 | 2 | 0.36 | no |
| ZRO-USDT | LONG | Wide / mixed | 2026-10-01 20:39 | 2026-10-02 04:00 | 2 | -0.23 | no |
| QNT-USDT | LONG | Wide / mixed | 2026-10-01 20:57 | 2026-10-02 04:00 | 98 | -0.18 | no |
| RESOLV-USDT | LONG | Wide / mixed | 2026-10-01 21:09 | 2026-10-02 02:00 | 2 | 0.56 | no |
| ZRO-USDT | SHORT | Wide / mixed | 2026-10-01 21:09 | 2026-10-01 22:21 | 2 | 0.41 | no |
| PUMP-USDT | SHORT | Wide / mixed | 2026-10-01 22:21 | 2026-10-02 04:00 | 2 | 0.15 | no |
| ZRO-USDT | SHORT | Wide / mixed | 2026-10-02 02:00 | 2026-10-02 04:00 | 2 | 0.09 | no |
| NIGHT-USDT | SHORT | Wide / mixed | 2026-10-02 02:57 | 2026-10-02 04:00 | 2 | 0.07 | no |

**Paper closes during the run (range: closes · PF · $ at the live unit).** Wide: 13 · 0.74 · -0.18.

## low-drawdown (CTSV2L_)

**Settings.** 12 symbols (2Z-USDT, AAVE-USDT, AGT-USDT, FARTCOIN-USDT, INIT-USDT, JUP-USDT, NEAR-USDT, ON-USDT, PROMPT-USDT, SOPH-USDT, SUI-USDT, SYRUP-USDT); focus 16 pairs; wide off; range gate on, fit on, range seats off; toggles normal, trailing; min PF 1.35; probe off; cycle 250 ms.

**Engine.** 52 computes (last 12 s), state computing, simulated run PF 4.00 over 5 orders, 0 seats; memory 910 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:51 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| active | 116 · 91 · 617 · 1.44 | 86 · 496 · 1.77 | – | – | – | – |
| bollinger | 40 · 0 · 14 · 0.00 | – | – | – | – | – |
| break | 276 · 32 · 1843 · 0.52 | 23 · 106 · 1.74 | – | – | – | – |
| direction | 810 · 81 · 77867 · 0.70 | 32 · 1347 · 1.24 | – | – | – | – |
| ema | 618 · 83 · 54275 · 0.72 | 49 · 4479 · 1.18 | – | – | – | – |
| ichimoku | 348 · 16 · 20689 · 0.56 | 11 · 321 · 1.24 | – | – | – | – |
| macd | 154 · 4 · 14274 · 0.59 | 1 · 31 · 1.17 | – | – | – | – |
| move | 116 · 24 · 8227 · 0.72 | 24 · 812 · 1.74 | – | – | – | – |
| osc | 276 · 94 · 1057 · 0.68 | 68 · 353 · 1.67 | – | – | – | – |
| rsi | 770 · 23 · 50007 · 0.50 | 11 · 196 · 1.87 | 5 · 3 · 4.00 · 100 % | 100 % | 0.00 h | 0.54 |
| smooth | 116 · 17 · 9717 · 0.72 | 12 · 405 · 1.26 | – | – | – | – |
| trend | 232 · 6 · 15252 · 0.64 | 1 · 35 · 1.15 | – | – | – | – |

### Exchange, by own client ids

No own order reached the exchange.



**Paper closes during the run (range: closes · PF · $ at the live unit).** none.

## micro (CTSV2U_)

**Settings.** 12 symbols (BEAT-USDT, BITLIGHT-USDT, BOME-USDT, EUL-USDT, FF-USDT, GIGGLE-USDT, KAIA-USDT, PNUT-USDT, RIVER-USDT, TRUMPSOL-USDT, XPIN-USDT, ZORA-USDT); focus every indication × bot; wide off, micro 13×5×3; range gate off, fit off, range seats on; toggles normal, trailing; min PF 1.05; probe top 20 per range; cycle 250 ms.

**Engine.** 33 computes (last 65 s), state computing, simulated run PF 0.87 over 1183 orders, 98 seats; memory 2066 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:14 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| break | 2166 · 377 · 19570 · 0.09 | 26 · 179 · 5.65 | 178 · 12 · 0.26 · 72 % | 50 % | 32.78 h | 7.74 |
| channel | 406 · 3 · 804 · 0.04 | – | – | – | – | – |
| direction | 3722 · 72 · 424003 · 0.15 | 59 · 1071 · 1.31 | 368 · 12 · 1.91 · 90 % | 75 % | 15.57 h | 2.88 |
| ema | 2030 · 23 · 313995 · 0.15 | 17 · 297 · 1.64 | – | – | – | – |
| ichimoku | 2436 · 40 · 132926 · 0.14 | 27 · 212 · 4.20 | – | – | – | – |
| macd | 406 · 6 · 61180 · 0.14 | 5 · 50 · 1.29 | – | – | – | – |
| move | 406 · 1 · 47209 · 0.12 | 1 · 29 · 1.28 | – | – | – | – |
| rsi | 1704 · 52 · 119183 · 0.14 | 48 · 742 · 1.71 | 560 · 14 · 1.23 · 83 % | 79 % | 23.77 h | 5.44 |
| smooth | 406 · 7 · 57010 · 0.13 | 6 · 42 · 1.59 | – | – | – | – |
| trend | 2418 · 180 · 106162 · 0.14 | 23 · 238 · 1.77 | 60 · 4 · 1.12 · 93 % | 50 % | 15.92 h | 1.09 |

### Exchange, by own client ids

| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |
|---|---:|---:|---:|---:|---:|---:|
| Micro | 3 | 0 | 0.00 | -0.21 | 0.03 | 0.10 |

| symbol | side | range | opened | last | orders | net USDT | open |
|---|---|---|---|---|---:|---:|---|
| PNUT-USDT | LONG | Micro | 2026-10-01 20:44 | 2026-10-01 21:47 | 2 | -0.11 | no |
| ZORA-USDT | LONG | Micro | 2026-10-01 20:44 | 2026-10-01 21:08 | 2 | -0.04 | no |
| XPIN-USDT | SHORT | Micro | 2026-10-02 03:00 | 2026-10-02 04:02 | 2 | -0.06 | no |

**Paper closes during the run (range: closes · PF · $ at the live unit).** none.

## minimal (CTSV2N_)

**Settings.** 12 symbols (AIXBT-USDT, BABY-USDT, BLESS-USDT, BROCCOLI-USDT, DOOD-USDT, DRIFT-USDT, ILV-USDT, INJ-USDT, NIL-USDT, REDSTONE-USDT, S-USDT, WAL-USDT); focus every indication × bot; wide off, minimal 7×5×3; range gate off, fit off, range seats on; toggles normal, trailing; min PF 1.05; probe top 20 per range; cycle 250 ms.

**Engine.** 49 computes (last 52 s), state computing, simulated run PF 0.59 over 531 orders, 27 seats; memory 1377 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:50 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| active | 60 · 32 · 1474 · 1.06 | 24 · 615 · 1.65 | 10 · 5 · 0.20 · 40 % | 50 % | 4.83 h | 0.84 |
| break | 774 · 88 · 16900 · 0.50 | 71 · 1063 · 1.47 | 275 · 24 · 0.52 · 56 % | 48 % | 37.40 h | 12.83 |
| channel | 114 · 8 · 778 · 0.38 | 7 · 37 · 2.75 | – | – | – | – |
| direction | 958 · 72 · 97521 · 0.48 | 59 · 2272 · 1.47 | 113 · 21 · 0.98 · 72 % | 69 % | 17.40 h | 2.52 |
| ema | 1030 · 104 · 91938 · 0.45 | 80 · 1474 · 1.64 | 60 · 22 · 0.55 · 65 % | 57 % | 11.95 h | 1.65 |
| ichimoku | 342 · 24 · 32059 · 0.40 | 24 · 449 · 1.72 | – | – | – | – |
| macd | 114 · 11 · 15702 · 0.41 | 6 · 114 · 2.26 | – | – | – | – |
| move | 114 · 1 · 11591 · 0.32 | – | – | – | – | – |
| rsi | 508 · 11 · 23250 · 0.35 | 9 · 165 · 1.33 | 15 · 9 · 0.07 · 27 % | 17 % | 33.13 h | 1.36 |
| smooth | 180 · 20 · 16999 · 0.47 | 16 · 269 · 1.79 | 58 · 14 · 0.77 · 69 % | 55 % | 22.75 h | 1.36 |
| trend | 1368 · 130 · 38984 · 0.47 | 101 · 1534 · 1.77 | – | – | – | – |

### Exchange, by own client ids

| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |
|---|---:|---:|---:|---:|---:|---:|
| Minimal | 4 | 3 | 0.89 | -0.02 | 0.04 | 0.10 |

| symbol | side | range | opened | last | orders | net USDT | open |
|---|---|---|---|---|---:|---:|---|
| PLUME-USDT | LONG | Minimal | 2026-10-01 20:01 | 2026-10-01 20:44 | 2 | 0.01 | no |
| INJ-USDT | LONG | Minimal | 2026-10-01 22:15 | 2026-10-01 22:27 | 2 | 0.00 | no |
| NIL-USDT | SHORT | Minimal | 2026-10-01 22:15 | 2026-10-02 04:02 | 2 | 0.14 | no |
| NIL-USDT | LONG | Minimal | 2026-10-01 22:15 | 2026-10-02 04:02 | 2 | -0.17 | no |

**Paper closes during the run (range: closes · PF · $ at the live unit).** none.

## plus (CTSV2P_)

**Settings.** 12 symbols (ALLO-USDT, API3-USDT, AVAX-USDT, COW-USDT, EVAA-USDT, HOLO-USDT, KERNEL-USDT, LINK-USDT, MMT-USDT, PARTI-USDT, SAFE-USDT, SIGN-USDT); focus every indication × bot; wide off, plus 221 cells; range gate off, fit off, range seats on; toggles normal, trailing; min PF 1.05; probe top 20 per range; cycle 250 ms.

**Engine.** 28 computes (last 89 s), state computing, simulated run PF 0.51 over 511 orders, 28 seats; memory 2344 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:49 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| active | 304 · 151 · 10024 · 1.04 | 127 · 4249 · 1.47 | 46 · 28 · 0.99 · 67 % | 55 % | 23.58 h | 0.75 |
| break | 2646 · 627 · 22137 · 0.68 | 527 · 4597 · 1.70 | 57 · 21 · 0.42 · 44 % | 29 % | 39.33 h | 2.62 |
| direction | 3206 · 25 · 331558 · 0.57 | 21 · 294 · 1.38 | 6 · 3 · 0.00 · 0 % | 0 % | 1.23 h | 0.66 |
| ema | 2160 · 15 · 247378 · 0.56 | 4 · 225 · 1.21 | – | – | – | – |
| ichimoku | 2406 · 168 · 136176 · 0.51 | 139 · 4130 · 1.42 | 400 · 25 · 0.51 · 65 % | 40 % | 37.50 h | 27.12 |
| macd | 458 · 1 · 52519 · 0.60 | – | – | – | – | – |
| move | 916 · 113 · 59280 · 0.44 | 75 · 2064 · 1.33 | – | – | – | – |
| rsi | 2290 · 14 · 99338 · 0.40 | 5 · 59 · 1.63 | – | – | – | – |
| smooth | 458 · 10 · 50490 · 0.61 | 10 · 76 · 2.09 | – | – | – | – |
| trend | 2290 · 41 · 107136 · 0.50 | 24 · 270 · 1.76 | 2 · 2 · 4.00 · 100 % | 100 % | 0.00 h | 0.48 |

### Exchange, by own client ids

| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |
|---|---:|---:|---:|---:|---:|---:|
| Minimal plus | 11 | 4 | 0.37 | -0.25 | 0.12 | 0.10 |

| symbol | side | range | opened | last | orders | net USDT | open |
|---|---|---|---|---|---:|---:|---|
| API3-USDT | SHORT | Minimal plus | 2026-10-01 20:45 | 2026-10-01 22:14 | 2 | 0.07 | no |
| HOLO-USDT | SHORT | Minimal plus | 2026-10-01 20:45 | 2026-10-01 21:14 | 2 | 0.00 | no |
| KERNEL-USDT | LONG | Minimal plus | 2026-10-01 20:45 | 2026-10-01 21:14 | 2 | -0.03 | no |
| PARTI-USDT | LONG | Minimal plus | 2026-10-01 21:08 | 2026-10-01 21:14 | 2 | -0.03 | no |
| SIGN-USDT | SHORT | Minimal plus | 2026-10-01 21:08 | 2026-10-02 02:17 | 2 | -0.13 | no |
| ALLO-USDT | SHORT | Minimal plus | 2026-10-01 21:25 | 2026-10-02 02:08 | 2 | 0.02 | no |
| PARTI-USDT | LONG | Minimal plus | 2026-10-01 21:25 | 2026-10-01 22:14 | 4 | -0.11 | no |
| API3-USDT | SHORT | Minimal plus | 2026-10-01 22:34 | 2026-10-01 23:04 | 2 | -0.04 | no |
| KERNEL-USDT | LONG | Minimal plus | 2026-10-01 22:41 | 2026-10-01 22:55 | 2 | -0.02 | no |
| ALLO-USDT | LONG | Minimal plus | 2026-10-02 02:08 | 2026-10-02 03:02 | 2 | -0.03 | no |
| SAFE-USDT | SHORT | Minimal plus | 2026-10-02 02:19 | 2026-10-02 04:03 | 2 | 0.05 | no |

**Paper closes during the run (range: closes · PF · $ at the live unit).** Minimal plus: 7 · 0.00 · -0.16.

## short (CTSV2H_)

**Settings.** 12 symbols (0G-USDT, 1000PEPE-USDT, AVNT-USDT, BERA-USDT, LA-USDT, MERL-USDT, OPENLEDGER-USDT, POPCAT-USDT, REZ-USDT, SOON-USDT, UNI-USDT, W-USDT); focus every indication × bot; wide off, short 4×9×3; range gate off, fit off, range seats on; toggles normal, trailing; min PF 1.05; probe top 20 per range; cycle 250 ms.

**Engine.** 48 computes (last 59 s), state computing, simulated run PF 1.21 over 1432 orders, 36 seats; memory 1691 MB; live step: armed (overall control orders).

### By indication type (simulated window 2026-09-30 02:00 → 2026-10-02 02:50 UTC)

| type | Base: configs · positive · closes · PF | evaluated PF ≥ 1.1: configs · closes · PF | executed: orders · positions · PF · WR | positive hours | drawdown time | equity DD % |
|---|---|---|---|---:|---:|---:|
| break | 2618 · 1576 · 38641 · 1.15 | 1271 · 20963 · 2.12 | 69 · 35 · 1.08 · 68 % | 67 % | 33.87 h | 1.95 |
| channel | 162 · 21 · 17031 · 0.72 | 19 · 924 · 1.30 | 349 · 74 · 1.07 · 79 % | 63 % | 17.50 h | 5.91 |
| direction | 1300 · 415 · 111286 · 0.78 | 357 · 8794 · 1.73 | 2 · 1 · 4.00 · 100 % | 100 % | 0.00 h | 0.33 |
| ema | 1106 · 419 · 85473 · 0.82 | 387 · 9638 · 1.86 | 728 · 92 · 2.44 · 84 % | 76 % | 8.25 h | 6.72 |
| ichimoku | 628 · 49 · 43511 · 0.60 | 30 · 777 · 1.59 | 16 · 16 · 0.53 · 63 % | 50 % | 8.92 h | 1.30 |
| macd | 492 · 319 · 18921 · 0.97 | 287 · 2513 · 4.51 | – | – | – | – |
| move | 442 · 27 · 25489 · 0.63 | 22 · 375 · 1.53 | 244 · 30 · 0.44 · 60 % | 40 % | 41.00 h | 20.95 |
| rsi | 628 · 20 · 33816 · 0.48 | 10 · 483 · 1.25 | – | – | – | – |
| sar | 168 · 146 · 468 · 11.11 | 144 · 432 · 21.53 | – | – | – | – |
| smooth | 504 · 127 · 20622 · 0.72 | 126 · 1472 · 3.50 | – | – | – | – |
| trend | 1118 · 465 · 36049 · 0.74 | 439 · 5256 · 2.31 | 24 · 18 · 5.26 · 88 % | 85 % | 14.25 h | 0.44 |

### Exchange, by own client ids

| range (id letter) | positions | won | PF | net USDT | fees USDT | fee % of notional |
|---|---:|---:|---:|---:|---:|---:|
| Short | 31 | 16 | 1.53 | 0.49 | 0.32 | 0.10 |

| symbol | side | range | opened | last | orders | net USDT | open |
|---|---|---|---|---|---:|---:|---|
| 0G-USDT | SHORT | Short | 2026-10-01 20:23 | 2026-10-01 22:04 | 2 | 0.05 | no |
| AVNT-USDT | SHORT | Short | 2026-10-01 20:23 | 2026-10-01 20:45 | 2 | 0.01 | no |
| BERA-USDT | SHORT | Short | 2026-10-01 20:23 | 2026-10-02 02:04 | 2 | 0.04 | no |
| LA-USDT | SHORT | Short | 2026-10-01 20:23 | 2026-10-02 04:02 | 2 | -0.13 | no |
| POPCAT-USDT | SHORT | Short | 2026-10-01 20:23 | 2026-10-02 02:58 | 2 | -0.25 | no |
| REZ-USDT | LONG | Short | 2026-10-01 20:23 | 2026-10-01 21:03 | 2 | -0.03 | no |
| SOON-USDT | SHORT | Short | 2026-10-01 20:23 | 2026-10-01 20:45 | 2 | -0.17 | no |
| UNI-USDT | LONG | Short | 2026-10-01 20:23 | 2026-10-02 04:02 | 2 | -0.00 | no |
| W-USDT | SHORT | Short | 2026-10-01 20:23 | 2026-10-01 22:04 | 2 | 0.17 | no |
| OPENLEDGER-USDT | SHORT | Short | 2026-10-01 20:45 | 2026-10-02 04:02 | 2 | -0.06 | no |
| OPENLEDGER-USDT | LONG | Short | 2026-10-01 20:45 | 2026-10-02 02:16 | 2 | -0.00 | no |
| POPCAT-USDT | LONG | Short | 2026-10-01 20:45 | 2026-10-01 21:25 | 2 | -0.02 | no |
| SOON-USDT | SHORT | Short | 2026-10-01 21:03 | 2026-10-01 22:04 | 2 | 0.20 | no |
| W-USDT | LONG | Short | 2026-10-01 21:31 | 2026-10-02 04:02 | 2 | 0.03 | no |
| REZ-USDT | LONG | Short | 2026-10-01 22:04 | 2026-10-01 22:26 | 2 | -0.01 | no |
| SOON-USDT | LONG | Short | 2026-10-01 22:04 | 2026-10-01 22:26 | 2 | -0.02 | no |
| 1000PEPE-USDT | SHORT | Short | 2026-10-01 22:14 | 2026-10-02 04:02 | 2 | -0.04 | no |
| 1000PEPE-USDT | LONG | Short | 2026-10-01 22:14 | 2026-10-02 02:31 | 2 | 0.08 | no |
| SOON-USDT | SHORT | Short | 2026-10-01 22:14 | 2026-10-01 22:51 | 2 | 0.04 | no |
| AVNT-USDT | SHORT | Short | 2026-10-01 22:26 | 2026-10-01 22:51 | 2 | 0.03 | no |
| LA-USDT | LONG | Short | 2026-10-01 22:26 | 2026-10-02 02:04 | 2 | 0.07 | no |
| UNI-USDT | SHORT | Short | 2026-10-01 22:51 | 2026-10-01 22:57 | 2 | -0.01 | no |
| AVNT-USDT | SHORT | Short | 2026-10-01 23:04 | 2026-10-02 04:02 | 3 | -0.08 | no |
| SOON-USDT | SHORT | Short | 2026-10-01 23:04 | 2026-10-02 02:04 | 2 | 0.31 | no |
| 0G-USDT | SHORT | Short | 2026-10-02 02:04 | 2026-10-02 04:02 | 2 | 0.04 | no |
| REZ-USDT | SHORT | Short | 2026-10-02 02:04 | 2026-10-02 02:58 | 2 | 0.01 | no |
| W-USDT | SHORT | Short | 2026-10-02 02:04 | 2026-10-02 04:02 | 2 | -0.02 | no |
| SOON-USDT | LONG | Short | 2026-10-02 02:31 | 2026-10-02 04:02 | 2 | 0.21 | no |
| 1000PEPE-USDT | LONG | Short | 2026-10-02 02:58 | 2026-10-02 04:02 | 2 | 0.10 | no |
| BERA-USDT | SHORT | Short | 2026-10-02 02:58 | 2026-10-02 04:02 | 2 | -0.08 | no |
| OPENLEDGER-USDT | LONG | Short | 2026-10-02 02:58 | 2026-10-02 04:02 | 2 | 0.01 | no |

**Paper closes during the run (range: closes · PF · $ at the live unit).** Short: 39 · 1.25 · 0.06.

## Run history

Every desk keeps its state and order ledger across a restart (its own client ids stay the same tag).

Restarts of every desk:

- 20:14:50 UTC — relaunch: 12 symbols per desk, volatility1h, disjoint offsets
- 20:36:08 UTC — restart all: shared ban file, no local calls during a ban, one history read per monitor round
- 20:56:40 UTC — restart all: shared book read across desks
- 21:58:55 UTC — restart all: trade through open-orders bans (positions fresh, open orders of the last read)
- 22:20:52 UTC — restart all: bans recorded per endpoint
- 22:45:51 UTC — restart all: shared positions reads, balance cache, cancel bans non-blocking
- 01:59:51 UTC — resume after container restart (state + snapshots kept)
- 02:53:47 UTC — restart all: no resize of one exchange lot (increase/reduce loop)

Restarts of one desk:

- 20:31:19 UTC — micro (CTSV2U_) alone, heap 2560 MB: after OOM
- 21:11:17 UTC — plus (CTSV2P_) alone, heap 2560 MB: after OOM
- 21:34:41 UTC — plus (CTSV2P_) alone, heap 2560 MB: after OOM
- 21:35:26 UTC — micro (CTSV2U_) alone, heap 2304 MB: after OOM
- 21:49:44 UTC — micro (CTSV2U_) alone, heap 2304 MB: after OOM

## Issues found during the run, and their fixes

Every fix is in this branch, each with a test, and was rolled out to the running desks by restarting them.

| # | Found | Cause | Fix |
|---|---|---|---|
| 1 | Out-of-memory kills of the micro and plus desks at 12 symbols | Micro's 195-cell grid has very frequent trades, so long tapes over 18 days of history; plus has 221 cells × 30 pairs | Micro: 8 days of history and a 120 h long window; plus: 15 pairs per symbol. Both keep all their cells and 12 symbols |
| 2 | Desks paused by BingX rate-limit bans (100410) most of the time | The demo account is shared with other systems (about 68 open orders tagged `CTSAV2_` and about 35 from three other bots). Their traffic keeps the open-orders limit tripped, while our calls during a ban kept extending it | No signed call is sent during a ban; a ban is shared across processes (`CTS_BINGX_BAN_FILE`), with a random 5–60 s jitter per process |
| 3 | The order history was read 16 times per 10 minutes | Every desk and the monitor read the whole account history | The monitor reads it once per round for every desk; desks read it only in their final report |
| 4 | Open-orders and positions read once per desk | Each desk reads the same account book | Shared book (`CTS_BINGX_BOOK_FILE`). A desk reuses another desk's read only when that read is newer than its own last order or cancel and within its sync period |
| 5 | Still about 84 % of the time paused | Only the open-orders endpoint was banned, but the live step paused on any ban | Bans are per endpoint. During an open-orders ban the live step uses fresh positions with the last open orders read (`book.ordersAt`): it opens, reduces and closes; stop repairs and leftover cancels wait for a fresh read. Cancel bans do not pause it either; klines pause only on public-endpoint bans |
| 6 | A ban on one endpoint paused every call | The ban was recorded from BingX's message before the endpoint was appended | The ban is recorded with its endpoint |
| 7 | Many positions and balance reads during bans | Positions-only reads were not shared; balance read every step | Positions-only reads are shared too; balance is cached for 60 s |
| 8 | One position doubled to twice the $10 cap (plus desk, PARTI) after an out-of-memory restart | The own-quantity ledger was a plain sum: a close of a position whose open was lost with the killed process ate into the next open, so the desk added a second open | Own quantity is computed in time order and floored at 0 (`ownLedger`) |
| 9 | Monitor false alarms (client ids not in the ledger, stalled computes) | It compared against a status file older than the orders, or written by an earlier process of the same tag | Only ids created by the current process and older than its status are checked |
| 10 | Monitor round timed out during a ban | Its retries waited for the ban to end | It uses the desks' shared book during an open-orders ban; the round log records the real exit code |
| 11 | Desks lost to container restarts (23:04, 01:59 and about 03:05 UTC) | The cloud container was replaced | Each desk restores its state and order ledger from its snapshot; own positions kept their exchange stops in between. The last segment (from 02:53) ended with the third restart, before its planned end at 03:37 |
| 12 | Increase and reduce of one lot alternated on every step (QNT-USDT, 33 times in 10 min) | At minimum volume the target is the exchange minimum (min notional / price rounded up to the lot), which moves by one lot as the price crosses a lot boundary | No resize of one lot or less (`planControl` lots) |
| 13 | Micro and minimal desks sent almost no orders although they had seats | Their simulated runs lose after the 0.20 % round-trip cost (sim net −136 % and −23 %), so the engine's hour guard holds back new entries in losing hours. The probe only skips the selection gates, not the risk guards | None needed: the guard works as designed. Their few orders match their losing simulation |
| 14 | Cancels by order id failed; the account was blocked for cancels (109400, over 20 errors in 8 min) | BingX order ids are 19-digit integers that a JSON number rounds (…2168064 read as …2168000) | Responses are parsed with integers of 16+ digits kept as strings (`parseExact`). The 6 stops left on flat symbols after the run were then cancelled |

**Close-out.** Each tag's results were read back from the exchange by its own client ids. Then every tag's own net quantity was closed at market (51 positions) and the 6 leftover own stops were cancelled. A re-read shows 0 open own positions and 0 own open orders for every `CTSV2*` tag. The exchange results above include these closing trades.

## Monitoring

19 rounds (every 10 min). Problems reported:

- CTSV2F_: desk process not running
- CTSV2F_: status 22 min old
- CTSV2F_: last compute 25 min ago
- CTSV2F_: 16 own client id(s) not in the ledger (CTSV2F_CMUPZEKC2E4Q1, CTSV2F_CMUPZEL2R9JFF)
- CTSV2U_: last compute 22 min ago
- CTSV2N_: last compute 20 min ago
- CTSV2P_: last compute 22 min ago
- CTSV2H_: last compute 21 min ago
- CTSV2H_: 9 own client id(s) not in the ledger (CTSV2H_HMUPZEWS81NEI, CTSV2H_HMUPZEXTBEH9K)
- CTSV2F_: last compute 20 min ago
- CTSV2F_: 6 own client id(s) not in the ledger (CTSV2F_EMUQ0TR58H19M, CTSV2F_EMUQ0TRUTAM2F)
- CTSV2C_: last compute 23 min ago
- CTSV2C_: 1 own client id(s) not in the ledger (CTSV2C_EMUQ0U1OIK9XP)
- CTSV2A_: last compute 23 min ago
- CTSV2A_: 2 own client id(s) not in the ledger (CTSV2A_CMUQ0LUFTDAEN, CTSV2A_EMUQ0M4WE33MO)
- CTSV2U_: last compute 20 min ago
- CTSV2N_: last compute 17 min ago
- CTSV2P_: last compute 18 min ago
- CTSV2H_: 2 own client id(s) not in the ledger (CTSV2H_CMUQ0TWQLAF6R, CTSV2H_HMUQ0TXBKDK18)
- CTSV2C_: last compute 22 min ago
- CTSV2U_: desk process not running
- CTSV2P_: PARTI-USDT LONG notional 20.00 above min volume
- CTSV2H_: last compute 19 min ago
- CTSV2F_: 1 own client id(s) not in the ledger (CTSV2F_SMUQ06YIH23SK)
- CTSV2U_: status 20 min old
- CTSV2U_: last compute 26 min ago
- CTSV2N_: last compute 16 min ago
- CTSV2P_: desk process not running
- CTSV2C_: last compute 21 min ago
- CTSV2A_: last compute 21 min ago
- CTSV2P_: last compute 17 min ago
- CTSV2F_: status 19 min old
- CTSV2F_: last compute 28 min ago
- CTSV2C_: desk process not running
- CTSV2H_: desk process not running
- CTSV2H_: status 16 min old
- CTSV2H_: last compute 16 min ago
- CTSV2U_: last compute 19 min ago
- CTSV2P_: last compute 20 min ago
- CTSV2F_: status 191 min old
- CTSV2F_: last compute 192 min ago
- CTSV2C_: status 192 min old
- CTSV2C_: last compute 192 min ago
- CTSV2A_: desk process not running
- CTSV2A_: status 194 min old
- CTSV2A_: last compute 195 min ago
- CTSV2L_: desk process not running
- CTSV2L_: status 193 min old
- CTSV2L_: last compute 194 min ago
- CTSV2U_: status 188 min old
- CTSV2U_: last compute 190 min ago
- CTSV2N_: desk process not running
- CTSV2N_: status 189 min old
- CTSV2N_: last compute 190 min ago
- CTSV2P_: status 187 min old
- CTSV2P_: last compute 189 min ago
- CTSV2H_: status 190 min old
- CTSV2H_: last compute 191 min ago
- CTSV2H_: AVNT-USDT SHORT notional 20.00 above min volume
- CTSV2F_: status 17 min old
- CTSV2F_: last compute 18 min ago
- CTSV2C_: status 18 min old
- CTSV2C_: last compute 19 min ago
- CTSV2U_: last compute 15 min ago
