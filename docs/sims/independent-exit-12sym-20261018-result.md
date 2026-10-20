# Simulated trading session — 12 symbols, 24 h pre-historic + 24 h run (tactics default, signals on)

Offline replay from the supplied cached candle feed (no market-data requests; original provider not recorded; simulated orders only; no exchange execution proof). Timeframe lanes 1 / 5 / 15 min set (independent + combined; traded: 1m, 5m, 5m+, 15m), strategies Normal, Trailing, DCA with Block, signals. Signals use the same 24 h minimal evaluated history; no additional Signal warmup was loaded. Balance $1000.00; each order volume unit = 0.1 % of the realized account balance at entry ($0.00–$1.13 before volume factors) at 10×; 0.15 % round-trip cost on every close. Window 2026-10-15T21:00 → 2026-10-16T21:00 UTC. Engine Base 203/1562 pairs passed; Signals 1/141 representative pairs pass the diagnostic gate (excluded from Base totals) — per range, passed / evaluated pairs · applied Base PF floor and passed-pair PF scores: Wide min PF 1.00 · 2/92 · median gate PF score 1.99 · Micro min PF 1.05 · 100/444 · median gate PF score 3.05 · Minimal min PF 1.10 · 122/536 · median gate PF score 2.17 · Short min PF 1.10 · 2/27 · median gate PF score 1.98 · General min PF 1.20 · 0/27 · Long min PF 1.30 · 0/27 · Signals min PF 1.00 · 1/141 · median gate PF score 3.50; Main 149 pairs, 111173 tapes. First simulated step at 2026-10-15T21:00:00.000Z: 14643 engine configs selected (Signal activation is separate). Paper selection after compute as of 2026-10-16T21:00:00.000Z: 2396 engine configs + 1224 Signal configs (complete paper step). Compute 57 s. The combined account PF includes both Base-qualified engine orders and separately activated Signal orders; the Base-to-execution benchmark is engine-only, and Signal PF is separate. Pre-validation candidate-pool PF is diagnostic. Causal: Base / Main / Real ranked on the history before the run.

**Simulated result (live sizing replay, position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings))):** balance $1000.00 → -$169.03 (-116.90 %, closed orders) · equity at end -$310.83 (open at end: 24 positions / 4440 orders, MTM -$141.80 (exact: executed by the engine through every gate, cap and Block volume, marked to market)) · Return PF 0.64 · cash PF (base $1) 0.64 · sized $ PF diagnostic 0.52 · 51 positions / 61806 funded orders · 64151 virtual closes (2345 zero allocations) · WR 61.51 % · DDT (closed trades, $) 17.50 h · DDR – (net ≤ 0) · equity max drawdown $1462.77 (135.72 %) · margin used max $11240.10 · open avg 16.86 pos / 5196.07 orders (peak 24 / 16368) · **infeasible: margin exceeded equity** (1201 min, first 23:30 UTC, max margin ÷ equity –×)

Qualification uses the recorded full indication's runtime gates; Tactic minimum return PF 1.1, preserving stricter settings. No-loss qualification uses the runtime score 4.
Direct walk-forward order returns exclude each recorded Block/coordination execution multiple; ladder/tape leg semantics remain. Cash, equity and sizing retain the stored weighted results.


### Signal historic Trailing qualification

Generated candidates use completed entries inside the minimal evaluated history (configured MFE minimum 30) and are re-simulated with the lane protect, signal filter, cooldown and modeled costs. A candidate qualifies only with at least 30 closed trades, PF ≥ 1 and DDR ≤ 1.

| pairs | pairs with insufficient entries | trails below minimum | candidates | PF-tested | insufficient closes | PF/net rejected | DDR rejected | qualified |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 141 | 120 | 0 | 252 | 252 | 204 | 28 | 14 | 6 |
**Caps:** position cap 0× balance per symbol × side, gross cap 0× balance (balance-volume defaults (no balance caps in the settings)) — 0 orders capped to $0, 0 scaled down (open at end: 0 capped, 0 scaled) · binding: position cap 0, gross cap 0. **Without the caps:** balance $1000.00 → -$169.03 (-116.90 %) · Return PF 0.64 · cash PF (base $1) 0.64 · sized $ PF diagnostic 0.52 · equity at end -$310.83 · equity max drawdown $1462.77 (135.72 %) · margin used max $11240.10 · infeasible: margin exceeded equity for 1201 min.
**Virtual diagnostic:** 64151 closes · Return PF 0.66 before funding allocation; 2345 zero allocations and 0 unknown allocations. Position episodes, entry requests and open-order counts describe the native virtual book; settled order counts and PF use the owned cohort.

### Base gate: what each change would admit

From the same Base results — no recompute. The PF floor here changes the untagged / Wide fallback only; configured Micro, Minimal, Short, General and Long floors stay in force. "Pairs in a range" is what the tape stage builds from.

The median is the runtime's Base gate PF score. A no-loss pair uses the finite score 4; that is a qualification score, not an exact PF.

| Base gate | wide / fallback PF floor | closes | DDR | pairs at the default cell | pairs in a range | share | median PF score of the passed |
|---|---:|---:|---:|---:|---:|---:|---:|
| as run | 1.00 | 12 | 1 | 18 | 150  | 28.0 % | 2.277 |
| PF ≥ 1.00 | 1.00 | 12 | 1 | 18 | 150 (+0) | 28.0 % | 2.277 |
| PF ≥ 1.05 | 1.05 | 12 | 1 | 18 | 150 (+0) | 28.0 % | 2.277 |
| PF ≥ 1.20 | 1.20 | 12 | 1 | 18 | 150 (+0) | 28.0 % | 2.277 |
| closes ≥ 6 | 1.00 | 6 | 1 | 41 | 201 (+51) | 37.5 % | 2.420 |
| closes ≥ 20 | 1.00 | 20 | 1 | 10 | 82 (-68) | 15.3 % | 2.360 |
| closes ≥ 30 | 1.00 | 30 | 1 | 3 | 40 (-110) | 7.5 % | 1.888 |
| DDR off | 1.00 | 12 | off | 84 | 207 (+57) | 38.6 % | 1.287 |
| DDR ≤ 2 | 1.00 | 12 | 2 | 38 | 182 (+32) | 34.0 % | 1.713 |
| DDR ≤ 0.5 | 1.00 | 12 | 0.5 | 10 | 83 (-67) | 15.5 % | 3.281 |
| PF ≥ 1.00 · DDR off | 1.00 | 12 | off | 84 | 207 (+57) | 38.6 % | 1.287 |
| PF ≥ 1.00 · DDR off · closes ≥ 6 | 1.00 | 6 | off | 125 | 277 (+127) | 51.7 % | 1.446 |


### Base by range: which gate removes each pair

Each pair at the range's own cell against the range's minimum. "first" = the first gate missed (closes → net → PF → DDR); "only" = pairs that miss that one gate alone (removing it admits them).

| range | min PF | evaluated | passed | share | first: closes / net / PF / DDR | only: closes / net / PF / DDR | median PF, only DDR |
|---|---:|---:|---:|---:|---|---|---:|
| Wide | 1.00 | 92 | 2 | 2.2 % | 67 / 19 / 0 / 4 | 13 / 0 / 0 / 4 | 1.368 |
| Micro | 1.05 | 444 | 100 | 22.5 % | 211 / 66 / 12 / 55 | 129 / 0 / 0 / 55 | 1.311 |
| Minimal | 1.10 | 536 | 122 | 22.8 % | 308 / 36 / 14 / 56 | 133 / 0 / 0 / 56 | 1.301 |
| Short | 1.10 | 27 | 2 | 7.4 % | 25 / 0 / 0 / 0 | 10 / 0 / 0 / 0 | – |
| General | 1.20 | 27 | 0 | 0.0 % | 26 / 0 / 1 / 0 | 10 / 0 / 0 / 0 | – |
| Long | 1.30 | 27 | 0 | 0.0 % | 27 / 0 / 0 / 0 | 9 / 0 / 0 / 0 | – |


### After each evaluation: PF and sets validated

Base: the Base-passed pairs pooled on their gross return basis; no-loss samples show ∞ (no loss), while the runtime's finite no-loss gate score is shown separately in the run summary. Validation: the sets validated at the run start and their gross-return PF pooled on the validation window (signals: units active in the run). Orders: the run's funded settled orders and their realized PF; known zero allocations are excluded.
With Axis perRange off, Wide-labeled validation and orders also include independent untagged DCA/Axis configs from pairs that qualified in another range, following the recorded builder admission policy.

| range | Base pooled PF | pairs validated | effective validation min PF | validation PF | sets validated | orders PF | orders |
|---|---:|---:|---|---:|---:|---:|---:|
| Wide | 1.95 | 2 of 92 | 1.10 | 5.95 | 68 of 2391 | 0.25 | 272 |
| Micro | 2.66 | 100 of 444 | 1.05–1.10 (varies by indication) | 3.65 | 8579 of 41072 | 0.58 | 33381 |
| Minimal | 2.11 | 122 of 536 | 1.10 | 3.04 | 5978 of 25200 | 0.70 | 27937 |
| Short | 1.87 | 2 of 27 | 1.10 | 2.22 | 18 of 168 | 0.80 | 216 |
| General | – | 0 of 27 | not recorded | – | – | – | 0 |
| Long | – | 0 of 27 | not recorded | – | – | – | 0 |
| Signals | 3.50 | 1 of 141 | – | – | 7019 units active | – | 0 |


### Each range at every step

Per range over the run's 24 steps: its tapes, the steps with configs validated (signals: active units) and with orders taken, and the totals.

| range | tapes | steps processed | steps with validated configs | steps with orders | validated (config × step) | candidates | orders |
|---|---:|---:|---:|---:|---:|---:|---:|
| Minimal | 25200 | 24 / 24 | 24 | 23 | 68482 | 41091 | 30736 |
| Micro | 41072 | 24 / 24 | 24 | 22 | 108304 | 47920 | 37249 |
| Wide | 2384 | 24 / 24 | 24 | 22 | 814 | 402 | 313 |
| Short | 168 | 24 / 24 | 24 | 7 | 745 | 283 | 281 |
| exit | 7 | 24 / 24 | 6 | 5 | 6 | 15 | 12 |
| Signals | 42342 | 24 / 24 | 24 | 0 | 55218 | 5696 | 0 |

## Hour by hour

| hour (UTC) | virtual positions / owned orders closed | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | WR | net | balance | equity (end) | equity low | equity max DD % (so far) | DD time now (h, equity) | margin max | virtual open pos / orders |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 1 / 834 | 588 / 246 | 1.81 | 3.09 | 71 % | $11.59 | $1011.59 | $974.43 | $965.54 | 4.98 % | 0.33 | $877.53 | 7 / 1054 |
| 22:00 | 0 / 1095 | 1017 / 78 | 5.35 | 8.36 | 93 % | $32.44 | $1044.03 | $1007.00 | $981.74 | 4.98 % | 0.58 | $953.80 | 7 / 1367 |
| 23:00 | 0 / 234 | 102 / 132 | 0.18 | 0.18 | 44 % | -$10.53 | $1033.50 | $996.00 | $952.53 | 8.17 % | 1.58 | $1143.89 | 8 / 1617 |
| 00:00 | 0 / 374 | 266 / 108 | 13.37 | 13.00 | 71 % | $7.15 | $1040.65 | $1005.92 | $968.65 | 8.17 % | 2.58 | $1105.90 | 8 / 1243 |
| 01:00 | 0 / 851 | 509 / 342 | 0.80 | 1.12 | 60 % | $2.45 | $1043.11 | $971.53 | $971.53 | 8.17 % | 0.72 | $1571.77 | 11 / 2498 |
| 02:00 | 0 / 2147 | 1379 / 768 | 2.15 | 2.42 | 64 % | $39.44 | $1082.55 | $932.85 | $932.85 | 10.24 % | 1.72 | $2040.55 | 13 / 2697 |
| 03:00 | 1 / 3802 | 2632 / 1170 | 0.84 | 0.74 | 69 % | -$40.13 | $1042.42 | $834.67 | $820.43 | 23.88 % | 0.68 | $3524.79 | 16 / 3936 |
| 04:00 | 0 / 322 | 150 / 172 | 0.47 | 0.36 | 47 % | -$5.33 | $1037.09 | $865.11 | $827.04 | 23.88 % | 1.68 | $2838.11 | 16 / 3818 |
| 05:00 | 1 / 843 | 473 / 370 | 0.87 | 0.83 | 56 % | -$3.97 | $1033.13 | $785.73 | $755.88 | 29.87 % | 2.68 | $4012.77 | 19 / 5177 |
| 06:00 | 0 / 311 | 125 / 186 | 0.31 | 0.36 | 40 % | -$9.24 | $1023.88 | $789.83 | $769.31 | 29.87 % | 3.68 | $3692.22 | 21 / 5123 |
| 07:00 | 2 / 1198 | 472 / 726 | 0.53 | 0.63 | 39 % | -$6.81 | $1017.08 | $713.68 | $701.46 | 34.92 % | 4.68 | $4333.80 | 20 / 6594 |
| 08:00 | 0 / 1807 | 872 / 935 | 0.41 | 0.47 | 48 % | -$42.95 | $974.12 | $679.63 | $650.68 | 39.63 % | 5.68 | $4585.34 | 21 / 6166 |
| 09:00 | 0 / 1390 | 954 / 436 | 1.59 | 3.77 | 69 % | $28.69 | $1002.82 | $679.98 | $655.06 | 39.63 % | 6.68 | $4579.34 | 21 / 6068 |
| 10:00 | 0 / 2966 | 1836 / 1130 | 1.20 | 1.14 | 62 % | $8.35 | $1011.17 | $550.83 | $550.83 | 48.89 % | 7.68 | $6784.05 | 23 / 7870 |
| 11:00 | 0 / 4863 | 3094 / 1769 | 0.84 | 0.79 | 64 % | -$33.76 | $977.41 | $403.19 | $394.49 | 63.40 % | 8.68 | $9711.65 | 23 / 13140 |
| 12:00 | 0 / 4941 | 2363 / 2578 | 0.38 | 0.39 | 48 % | -$133.34 | $844.06 | $45.25 | $45.25 | 95.80 % | 9.68 | $9708.46 | 23 / 12483 |
| 13:00 | 0 / 2527 | 1211 / 1316 | 0.39 | 0.36 | 48 % | -$48.25 | $795.81 | -$10.49 | -$30.28 | 102.81 % | 10.68 | $10290.49 | 24 / 15564 |
| 14:00 | 2 / 4153 | 2758 / 1395 | 1.05 | 0.75 | 66 % | -$27.18 | $768.63 | -$90.08 | -$112.28 | 110.42 % | 11.68 | $11240.10 | 24 / 17894 |
| 15:00 | 1 / 13258 | 7748 / 5510 | 0.40 | 0.33 | 58 % | -$561.60 | $207.03 | -$305.69 | -$305.69 | 128.36 % | 12.68 | $11240.10 | 23 / 12878 |
| 16:00 | 0 / 4480 | 2627 / 1853 | 0.46 | 0.24 | 59 % | -$145.00 | $62.04 | -$311.97 | -$323.14 | 129.98 % | 13.68 | $5374.69 | 24 / 11434 |
| 17:00 | 0 / 9111 | 6714 / 2397 | 0.83 | 0.43 | 74 % | -$212.89 | -$150.85 | -$342.74 | -$382.32 | 135.47 % | 14.68 | $4234.04 | 24 / 3801 |
| 18:00 | 0 / 209 | 76 / 133 | 0.37 | 0.12 | 36 % | -$12.83 | -$163.68 | -$361.76 | -$384.97 | 135.72 % | 15.68 | $1197.93 | 24 / 4598 |
| 19:00 | 0 / 83 | 46 / 37 | 0.61 | 0.17 | 55 % | -$5.36 | -$169.04 | -$323.42 | -$380.68 | 135.72 % | 16.68 | $1117.38 | 24 / 4577 |
| 20:00 | 0 / 7 | 2 / 5 | 0.15 | 1.04 | 29 % | $0.00 | -$169.03 | -$310.83 | -$332.70 | 135.72 % | 17.68 | $1062.81 | 24 / 4440 |

**Last hour (20:00):** open at end: 24 positions / 4440 orders, MTM -$141.80 (exact: executed by the engine through every gate, cap and Block volume, marked to market); equity at the end -$310.83 = balance -$169.03 + MTM -$141.80.

**Hours positive:** 8 of 24 full hours · flat 0 · negative 16

*DD time now* = time since the equity (open positions marked to market) last stood at its peak, at the end of the hour; *DDT (closed trades)* in the result line is the drawdown time of the closed-trade curve. *Return PF* and *cash PF (base $1)* use the same canonical unit returns and should match; *sized $ PF diagnostic* = gross realized cash gains ÷ losses on those same orders after actual sizing; ∞ (no loss) = no losing order.

## Hour by hour per timeframe lane (orders · Return PF · net $)

| hour (UTC) | 1m | 5m | 5m+ | 15m |
|---|---:|---:|---:|---:|
| 21:00 | 2 · 0.00 · -$0.02 | 438 · 57.69 · $14.98 | 38 · 2.16 · -$0.19 | 356 · 0.27 · -$3.18 |
| 22:00 | 82 · ∞ (no loss) · $5.00 | 464 · 67.62 · $13.89 | 153 · ∞ (no loss) · $9.23 | 396 · 1.07 · $4.32 |
| 23:00 | 22 · 0.02 · -$2.16 | 46 · ∞ (no loss) · $1.06 | 2 · 0.00 · -$0.27 | 164 · 0.12 · -$9.15 |
| 00:00 | – | 183 · 14.83 · $3.12 | – | 191 · 12.22 · $4.03 |
| 01:00 | 157 · 2.55 · $4.72 | 304 · 0.24 · -$10.44 | 232 · 4.56 · $5.22 | 158 · 3.41 · $2.96 |
| 02:00 | 255 · 0.53 · -$2.84 | 1324 · 5.83 · $52.08 | 378 · 0.32 · -$5.90 | 190 · 0.35 · -$3.90 |
| 03:00 | 808 · 0.16 · -$55.64 | 2197 · 1.09 · -$5.20 | 463 · 18.15 · $28.30 | 334 · 0.54 · -$7.58 |
| 04:00 | 42 · 0.35 · -$0.64 | 102 · 0.14 · -$6.15 | 72 · 4.44 · $0.50 | 106 · 2.52 · $0.96 |
| 05:00 | 463 · 1.62 · $4.90 | 202 · 0.04 · -$12.20 | 26 · ∞ (no loss) · $1.61 | 152 · 1.61 · $1.73 |
| 06:00 | 201 · 0.15 · -$8.70 | 72 · 0.13 · -$3.44 | 8 · ∞ (no loss) · $0.13 | 30 · 74.32 · $2.76 |
| 07:00 | 254 · 1.14 · $2.86 | 403 · 0.62 · -$1.99 | 77 · 0.22 · -$0.39 | 464 · 0.32 · -$7.28 |
| 08:00 | 640 · 0.64 · -$5.59 | 219 · 0.13 · -$6.39 | 52 · 0.00 · -$2.41 | 896 · 0.36 · -$28.56 |
| 09:00 | 355 · 0.14 · -$2.93 | 481 · 71.46 · $25.82 | 177 · 2.49 · -$0.43 | 377 · 4.87 · $6.24 |
| 10:00 | 166 · 0.39 · -$3.96 | 2202 · 1.34 · $14.14 | 187 · 1.75 · $1.99 | 411 · 1.81 · -$3.81 |
| 11:00 | 1256 · 0.46 · -$34.22 | 2628 · 3.33 · $49.39 | 333 · 0.29 · -$18.25 | 646 · 0.33 · -$30.69 |
| 12:00 | 392 · 0.07 · -$27.62 | 3195 · 0.43 · -$64.29 | 563 · 1.26 · $0.39 | 791 · 0.24 · -$41.83 |
| 13:00 | 75 · 4.73 · $1.89 | 1917 · 0.31 · -$47.10 | 325 · 0.57 · -$4.34 | 210 · 1.45 · $1.30 |
| 14:00 | 95 · 0.23 · -$3.64 | 2722 · 1.28 · -$6.70 | 875 · 1.74 · -$1.98 | 461 · 0.45 · -$14.86 |
| 15:00 | 580 · 1.35 · $4.66 | 10972 · 0.37 · -$504.87 | 1052 · 0.51 · -$25.07 | 654 · 0.38 · -$36.33 |
| 16:00 | 82 · 1.66 · $0.79 | 3875 · 0.50 · -$113.95 | 288 · 0.10 · -$22.54 | 235 · 0.60 · -$9.30 |
| 17:00 | 644 · 0.79 · -$22.14 | 7315 · 0.91 · -$150.77 | 532 · 0.29 · -$30.49 | 620 · 0.91 · -$9.48 |
| 18:00 | 76 · 0.19 · -$6.03 | 103 · 0.68 · -$5.93 | 4 · 0.00 · -$0.12 | 26 · 0.00 · -$0.75 |
| 19:00 | 39 · 0.28 · -$3.11 | 40 · 1.40 · -$1.30 | 4 · 0.00 · -$0.95 | 0 · – · $0.00 |
| 20:00 | – | 2 · ∞ (no loss) · $0.03 | 0 · – · $0.00 | 5 · 0.00 · -$0.03 |

## Hour by hour per type (funded orders · Return PF · WR · net $)

The strategy columns partition funded orders; virtual closes also include zero-allocated closes. *Of which* columns are subsets of the funded orders.

| hour (UTC) | funded orders closed | virtual closes | exit | Normal | Trailing | Trailing only | DCA | Signal · Normal | Signal · Trailing | Signal · Trailing only | of which Block-raised | of which Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 834 | 834 | – | 286 · 1.05 · 85 % · $3.46 | 548 · 2.67 · 63 % · $8.13 | – | – | – | – | – | 576 · 3.83 · 67 % · $11.79 | – |
| 22:00 | 1095 | 1095 | – | 434 · 2.41 · 93 % · $11.28 | 656 · 11.54 · 93 % · $20.99 | – | 5 · ∞ (no loss) · 100 % · $0.17 | – | – | – | 1069 · 11.59 · 95 % · $33.00 | – |
| 23:00 | 234 | 234 | – | 124 · 0.11 · 37 % · -$8.09 | 110 · 0.36 · 51 % · -$2.43 | – | – | – | – | – | 224 · 0.18 · 43 % · -$10.53 | – |
| 00:00 | 374 | 374 | – | 136 · ∞ (no loss) · 100 % · $4.89 | 236 · 4.83 · 54 % · $2.16 | – | 2 · ∞ (no loss) · 100 % · $0.10 | – | – | – | 338 · 12.97 · 70 % · $7.04 | – |
| 01:00 | 851 | 851 | – | 344 · 0.92 · 81 % · $3.63 | 501 · 0.69 · 45 % · -$1.45 | – | 6 · ∞ (no loss) · 100 % · $0.27 | – | – | – | 829 · 0.80 · 60 % · $2.45 | – |
| 02:00 | 2147 | 2147 | – | 478 · 1.64 · 82 % · $10.83 | 1663 · 2.50 · 59 % · $28.34 | – | 6 · ∞ (no loss) · 100 % · $0.27 | – | – | – | 2075 · 2.15 · 65 % · $39.38 | – |
| 03:00 | 3802 | 3802 | – | 1336 · 0.54 · 69 % · -$41.92 | 2454 · 1.15 · 69 % · $0.92 | – | 12 · ∞ (no loss) · 100 % · $0.87 | – | – | – | 3740 · 0.84 · 70 % · -$40.02 | – |
| 04:00 | 322 | 322 | – | 98 · 0.43 · 57 % · -$2.19 | 220 · 0.45 · 41 % · -$3.40 | – | 4 · ∞ (no loss) · 100 % · $0.26 | – | – | – | 320 · 0.45 · 46 % · -$5.36 | – |
| 05:00 | 843 | 843 | – | 253 · 1.16 · 67 % · $0.36 | 584 · 0.65 · 51 % · -$4.54 | – | 6 · ∞ (no loss) · 100 % · $0.22 | – | – | – | 843 · 0.87 · 56 % · -$3.97 | – |
| 06:00 | 311 | 311 | – | 95 · 0.61 · 52 % · -$0.59 | 210 · 0.13 · 34 % · -$8.81 | – | 6 · 1.62 · 67 % · $0.16 | – | – | – | 293 · 0.35 · 43 % · -$9.01 | – |
| 07:00 | 1198 | 1198 | – | 231 · 0.52 · 63 % · -$1.53 | 967 · 0.53 · 34 % · -$5.27 | – | – | – | – | – | 1158 · 0.57 · 41 % · -$6.51 | – |
| 08:00 | 1807 | 1807 | – | 536 · 0.31 · 40 % · -$24.05 | 1263 · 0.50 · 51 % · -$19.28 | – | 8 · ∞ (no loss) · 100 % · $0.37 | – | – | – | 1765 · 0.44 · 49 % · -$42.29 | – |
| 09:00 | 1390 | 1390 | – | 427 · 2.24 · 92 % · $13.34 | 940 · 1.59 · 58 % · $17.14 | – | 23 · 0.22 · 65 % · -$1.78 | – | – | – | 1265 · 4.53 · 71 % · $30.71 | – |
| 10:00 | 2966 | 2966 | – | 962 · 1.09 · 74 % · -$0.05 | 1985 · 1.40 · 56 % · $11.19 | – | 19 · 0.18 · 53 % · -$2.78 | – | – | – | 2709 · 1.13 · 59 % · $7.73 | – |
| 11:00 | 4863 | 4863 | 3 · ∞ (no loss) · 100 % · $0.17 | 1593 · 0.95 · 76 % · -$4.43 | 3216 · 0.79 · 58 % · -$26.93 | – | 51 · 0.33 · 57 % · -$2.57 | – | – | – | 4744 · 0.92 · 65 % · -$31.73 | – |
| 12:00 | 4941 | 4941 | 1 · 0.00 · 0 % · -$0.05 | 1918 · 0.44 · 59 % · -$49.91 | 3017 · 0.31 · 40 % · -$83.78 | – | 5 · ∞ (no loss) · 100 % · $0.40 | – | – | – | 4889 · 0.39 · 48 % · -$132.25 | – |
| 13:00 | 2527 | 2527 | 1 · 0.00 · 0 % · -$0.03 | 886 · 0.50 · 63 % · -$20.11 | 1633 · 0.27 · 40 % · -$28.33 | – | 7 · 6.13 · 86 % · $0.23 | – | – | – | 2267 · 0.39 · 49 % · -$48.01 | – |
| 14:00 | 4153 | 4153 | 2 · 0.68 · 50 % · -$0.01 | 1277 · 0.92 · 75 % · -$10.94 | 2866 · 1.13 · 63 % · -$16.31 | – | 8 · 8.68 · 75 % · $0.08 | – | – | – | 3521 · 0.98 · 65 % · -$27.83 | – |
| 15:00 | 13258 | 13258 | 2 · 0.00 · 0 % · -$0.15 | 4512 · 0.33 · 55 % · -$250.63 | 8729 · 0.45 · 60 % · -$311.86 | – | 15 · ∞ (no loss) · 100 % · $1.04 | – | – | – | 12161 · 0.38 · 58 % · -$560.28 | – |
| 16:00 | 4480 | 4480 | – | 1441 · 0.52 · 70 % · -$53.37 | 3026 · 0.42 · 53 % · -$90.44 | – | 13 · 0.24 · 46 % · -$1.19 | – | – | – | 4416 · 0.48 · 59 % · -$144.37 | – |
| 17:00 | 9111 | 10004 | 3 · 0.00 · 0 % · -$0.29 | 3456 · 0.98 · 77 % · -$55.96 | 5606 · 0.80 · 72 % · -$138.97 | – | 46 · 0.07 · 33 % · -$17.67 | – | – | – | 8858 · 0.85 · 74 % · -$212.61 | – |
| 18:00 | 209 | 516 | – | 130 · 0.86 · 58 % · -$3.85 | 79 · 0.00 · 0 % · -$8.98 | – | 0 · – · NaN % · $0.00 | – | – | – | 205 · 0.39 · 37 % · -$12.75 | – |
| 19:00 | 83 | 983 | – | 45 · 1.92 · 78 % · -$0.57 | 22 · 0.28 · 50 % · -$0.49 | – | 16 · 0.00 · 0 % · -$4.30 | – | – | – | 79 · 0.60 · 56 % · -$5.38 | – |
| 20:00 | 7 | 252 | – | 3 · 0.00 · 0 % · -$0.02 | 2 · 0.00 · 0 % · -$0.01 | – | 2 · ∞ (no loss) · 100 % · $0.03 | – | – | – | 2 · ∞ (no loss) · 100 % · $0.03 | – |

## Post-Base paper Live gate

The paper entry stage independently checks each selected config's own last 25 settled post-Base execution closes since 2026-10-18T22:18:34.773Z against the stricter of its range PF floor and the Live PF floor. At the final paper step, 0 config windows had enough closes to be judged: 0 passed and 0 were paused; 0 new entry candidates were rejected by this gate. Exchange closes used: 0. Group last-N: 0.

The hourly order and PF tables above describe the causal walk-forward simulation. They are not rewritten by this later paper-stage gate; this section reports the gate's separate progress and skips.

## Stage funnel, hour by hour (post-gate virtual closes · one-unit PF)

Base (each pair at its default protect and its ranges' cells): 1562 engine pairs evaluated, 149 passed (any range); Signal pairs are measured separately. Later stages: *candidate pool* = every config of the Base-passed pairs (111173 tapes; diagnostic, before config validation), Normal / Trailing / Trailing only apart; *post-Base config passes* = 16445 distinct configs passed at least one causal config-evaluation step across the window (a config can pass again in a later hour; the hourly row below counts those repeat pass instances). At run start, use the separate config-evaluation denominator/pass count and first simulated-step selection when recorded; the later paper/current selection is a separate snapshot; *post-gate virtual closes* = simulated trades that passed the causal config, coordination, caps and Block gates, before account funding/allocation. This count can include zero-allocated trades; funded settled orders and their PF are reported separately above. One-unit PF is every virtual close normalized to one unit after the 0.15 % cost. Config-evaluation history is 24 h (max of longH and preH); Base history is reported separately. Replay-only selection-window override: 24 h; it does not change normal runtime settings. The additional per-config entry last-N check is off (wf.lastN = 0); configEval still validates configs before seating.Native liveLastN is not replayed unless --live-since is set.

| hour (UTC) | candidate pool (pre-validation) | pool Normal | pool Trailing | pool Trailing only | post-Base config-pass instances (hourly; may repeat) | post-gate virtual closes (pre-funding) | virtual Normal | virtual Trailing | virtual Trailing only | virtual Block-raised | virtual Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 21:00 | 17683 · 2.09 | 2947 · 2.23 | 14497 · 2.07 | 40 · 1.23 | 1377 · 0.92 | 834 · 1.81 | 286 · 1.05 | 548 · 2.67 | – | 576 · 3.83 | – |
| 22:00 | 21280 · 1.07 | 3892 · 1.55 | 16699 · 0.93 | 298 · 1.49 | 2149 · 1.41 | 1095 · 5.35 | 434 · 2.41 | 656 · 11.54 | – | 1069 · 11.59 | – |
| 23:00 | 14253 · 5.09 | 2168 · 1.86 | 11755 · 7.43 | 83 · 1.09 | 1249 · 1.71 | 234 · 0.18 | 124 · 0.11 | 110 · 0.36 | – | 224 · 0.18 | – |
| 00:00 | 5963 · 3.08 | 989 · 4.05 | 4850 · 2.50 | 58 · 3.27 | 539 · 7.59 | 374 · 13.37 | 136 · ∞ (no loss) | 236 · 4.83 | – | 338 · 12.97 | – |
| 01:00 | 19555 · 1.54 | 5308 · 2.44 | 13894 · 1.20 | 125 · 0.12 | 1691 · 0.45 | 851 · 0.80 | 344 · 0.92 | 501 · 0.69 | – | 829 · 0.80 | – |
| 02:00 | 31044 · 0.86 | 6949 · 1.10 | 23398 · 0.76 | 254 · 0.09 | 3809 · 0.32 | 2147 · 2.15 | 478 · 1.64 | 1663 · 2.50 | – | 2075 · 2.15 | – |
| 03:00 | 37720 · 1.51 | 9201 · 1.03 | 27357 · 1.83 | 276 · 0.69 | 7547 · 1.40 | 3802 · 0.84 | 1336 · 0.54 | 2454 · 1.15 | – | 3740 · 0.84 | – |
| 04:00 | 7790 · 0.81 | 1222 · 2.99 | 6254 · 0.38 | 42 · 5.86 | 587 · 0.14 | 322 · 0.47 | 98 · 0.43 | 220 · 0.45 | – | 320 · 0.45 | – |
| 05:00 | 20924 · 1.89 | 4068 · 2.91 | 16168 · 1.47 | 246 · 1.52 | 2365 · 0.77 | 843 · 0.87 | 253 · 1.16 | 584 · 0.65 | – | 843 · 0.87 | – |
| 06:00 | 7249 · 0.78 | 1508 · 1.60 | 5621 · 0.48 | 20 · 0.05 | 763 · 0.15 | 311 · 0.31 | 95 · 0.61 | 210 · 0.13 | – | 293 · 0.35 | – |
| 07:00 | 22378 · 1.97 | 3006 · 2.64 | 18807 · 1.65 | 214 · 2.83 | 2516 · 0.58 | 1198 · 0.53 | 231 · 0.52 | 967 · 0.53 | – | 1158 · 0.57 | – |
| 08:00 | 28304 · 1.10 | 8896 · 1.49 | 18716 · 0.91 | 283 · 0.58 | 3827 · 0.96 | 1807 · 0.41 | 536 · 0.31 | 1263 · 0.50 | – | 1765 · 0.44 | – |
| 09:00 | 34742 · 1.57 | 7199 · 2.39 | 26694 · 1.32 | 313 · 0.51 | 4580 · 0.78 | 1390 · 1.59 | 427 · 2.24 | 940 · 1.59 | – | 1265 · 4.53 | – |
| 10:00 | 70854 · 5.26 | 14740 · 4.33 | 54868 · 5.97 | 329 · 1.30 | 10118 · 3.21 | 2966 · 1.20 | 962 · 1.09 | 1985 · 1.40 | – | 2709 · 1.13 | – |
| 11:00 | 77891 · 0.96 | 19078 · 1.35 | 57286 · 0.80 | 491 · 0.13 | 10092 · 1.14 | 4863 · 0.84 | 1593 · 0.95 | 3216 · 0.79 | – | 4744 · 0.92 | – |
| 12:00 | 122454 · 0.92 | 25334 · 0.95 | 94546 · 0.89 | 645 · 0.46 | 16478 · 0.75 | 4941 · 0.38 | 1918 · 0.44 | 3017 · 0.31 | – | 4889 · 0.39 | – |
| 13:00 | 72491 · 1.23 | 10334 · 1.48 | 60714 · 1.12 | 306 · 0.76 | 9228 · 0.90 | 2527 · 0.39 | 886 · 0.50 | 1633 · 0.27 | – | 2267 · 0.39 | – |
| 14:00 | 123373 · 0.82 | 29108 · 0.95 | 91479 · 0.74 | 631 · 0.13 | 19637 · 0.83 | 4153 · 1.05 | 1277 · 0.92 | 2866 · 1.13 | – | 3521 · 0.98 | – |
| 15:00 | 252449 · 0.67 | 62330 · 0.59 | 183771 · 0.70 | 1778 · 0.47 | 37578 · 0.63 | 13258 · 0.40 | 4512 · 0.33 | 8729 · 0.45 | – | 12161 · 0.38 | – |
| 16:00 | 124833 · 0.24 | 27555 · 0.32 | 94286 · 0.20 | 637 · 0.09 | 14975 · 0.39 | 4480 · 0.46 | 1441 · 0.52 | 3026 · 0.42 | – | 4416 · 0.48 | – |
| 17:00 | 399552 · 0.56 | 104050 · 0.49 | 284483 · 0.60 | 4161 · 1.52 | 49793 · 0.56 | 10004 · 0.89 | 3686 · 1.02 | 6269 · 0.87 | – | 9751 · 0.91 | – |
| 18:00 | 115687 · 0.25 | 25394 · 0.33 | 88898 · 0.21 | 502 · 0.04 | 13380 · 0.30 | 516 · 0.58 | 150 · 0.97 | 360 · 0.29 | – | 512 · 0.60 | – |
| 19:00 | 96166 · 1.50 | 12122 · 1.41 | 81303 · 1.58 | 522 · 0.75 | 10847 · 1.22 | 983 · 2.38 | 299 · 4.82 | 665 · 3.42 | – | 977 · 2.43 | – |
| 20:00 | 18763 · 0.91 | 4479 · 1.34 | 13022 · 1.21 | 109 · 0.33 | 1692 · 1.57 | 252 · 3.78 | 57 · 12.63 | 192 · 2.30 | – | 247 · 4.88 | – |
| **total** | **1743398 · 0.70** | **391877 · 0.73** | **1309366 · 0.69** | **12363 · 0.66** | **226817 · 0.66** | **64151 · 0.66** | **21559 · 0.63** | **42310 · 0.69** | **–** | **60689 · 0.67** | **–** |

## Strategies

The type rows are one partition of the book (they add up to *total*); *of which* rows are subsets. DDT on each group's own $ curve, to the run end.

| strategy | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| exit | 12 | 4 / 8 | 0.25 | 0.25 | 0.38 | -$0.37 | 33.33 % | 9.25 |
| Normal | 21001 | 14297 / 6704 | 0.61 | 0.61 | 0.52 | -$480.42 | 68.08 % | 17.50 |
| Trailing | 40533 | 23551 / 16982 | 0.67 | 0.67 | 0.53 | -$662.43 | 58.10 % | 17.50 |
| Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| DCA | 260 | 162 / 98 | 0.25 | 0.25 | 0.24 | -$25.82 | 62.31 % | 12.35 |
| Signal · Normal | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Trailing | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Signal · Trailing only | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| total | 61806 | 38014 / 23792 | 0.64 | 0.64 | 0.52 | -$1169.03 | 61.51 % | 17.50 |
| of which Block-raised | 58346 | 35942 / 22404 | 0.64 | 0.64 | 0.52 | -$1160.77 | 61.60 % | 17.50 |
| of which Signals | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| of which Engine (no signals) | 61806 | 38014 / 23792 | 0.64 | 0.64 | 0.52 | -$1169.03 | 61.51 % | 17.50 |

## Timeframe lanes

| lane | orders | Return PF | cash PF (base $1) | sized $ PF diagnostic | net |
|---|---:|---:|---:|---:|---:|
| 1m | 6686 | 0.51 | 0.51 | 0.51 | -$154.42 |
| 5m | 41406 | 0.68 | 0.68 | 0.53 | -$766.22 |
| 5m+ | 5841 | 0.68 | 0.68 | 0.63 | -$65.95 |
| 15m | 7873 | 0.51 | 0.51 | 0.44 | -$182.44 |

A 24 h window is a short sample: it shows the engine processing correctly and its current edge, not a durable result.

## Ranges in the executed book

Signals are a range of their own (signal configs carry no range tag); every enabled range listed.

| range | orders | wins / losses | Return PF | cash PF (base $1) | sized $ PF diagnostic | net | WR | DDT (h) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 33381 | 20879 / 12502 | 0.58 | 0.58 | 0.49 | -$558.53 | 62.55 % | 17.33 |
| Minimal | 27937 | 16861 / 11076 | 0.70 | 0.70 | 0.55 | -$572.38 | 60.35 % | 17.50 |
| Short | 216 | 108 / 108 | 0.80 | 0.80 | 0.37 | -$11.94 | 50.00 % | 18.25 |
| General | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Long | 0 | 0 / 0 | – | – | – | $0.00 | – | – |
| Wide | 272 | 166 / 106 | 0.25 | 0.25 | 0.25 | -$26.18 | 61.03 % | 12.35 |
| Signals | 0 | 0 / 0 | – | – | – | $0.00 | – | – |

### Why candidates did not execute, per range

Every entry candidate of a seated config (and of an active signal) the run skipped, by the first gate it failed.

| range | skipped | reasons (count) |
|---|---:|---|
| Micro | 10671 | symPf 7867 · duplicate 2804 |
| Minimal | 10355 | symPf 8906 · duplicate 1449 |
| Signals | 5696 | sig:signalValid 2026 · sig:signalCluster 1936 · sig:signalSide 1639 · sig:signalPf 95 |
| Wide | 89 | duplicate 49 · symPf 40 |
| Wide | 3 | symPf 3 |
| Short | 2 | symPf 2 |

## Base said, the book did — the same ranges on the same basis

The combined account result includes every funded engine and Signal order. For the Base-to-execution benchmark, engine range rows contain only funded orders from Base-qualified pairs whose configs passed post-Base validation; Signals are separately activated, qualified and reported. All PF gates use net returns. Base lists a median gate score across passed pairs on its Base sample; a no-loss Base sample has an exact pooled PF of ∞ and a separate finite gate score. The run PF is on the actual executed order cohort. These samples and reducers differ, so
their difference alone does not establish edge loss or a sizing effect. Cash PF is a separate diagnostic on
the same closed orders as the book's return PF; unequal notionals can change cash PF without changing return PF.

| range | Base passed (median gate score, validation sample) | simulated return PF (run closes) | cash PF (base $1) | sized $ PF diagnostic (same run closes) | orders |
|---|---:|---:|---:|---:|---:|
| Micro | 3.05 | 0.58 | 0.58 | 0.49 | 33381 |
| Minimal | 2.17 | 0.70 | 0.70 | 0.55 | 27937 |
| Short | 1.98 | 0.80 | 0.80 | 0.37 | 216 |
| General | – | – | – | – | 0 |
| Long | – | – | – | – | 0 |
| Wide | 1.99 | 0.25 | 0.25 | 0.25 | 272 |
| Signals | 3.50 | – | – | – | 0 |

## Seated configs over the run window, by range and type

Engine configs that passed the seat evaluation (configEval) at the run start (14643 of 67043 evaluated, 68831 engine tapes) and the signal configs' entries made while their unit (pair × symbol × direction) was active at the entry's step (1033 units active at the run start, 7019 over the run, 1802 of 42342 signal configs with such an entry), each on its own closes inside the run (entries ≥ start, exits ≤ end). Net in % of one unit; PF unit basis.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 2984 | 1262 (42 %) | 43714 | 74 % | 0.67 | -7701.02 |
| Micro | trailing | 5595 | 2697 (48 %) | 84565 | 59 % | 0.60 | -15384.98 |
| Minimal | normal | 1724 | 787 (46 %) | 23828 | 68 % | 0.84 | -3298.76 |
| Minimal | trailing | 4254 | 1757 (41 %) | 69009 | 60 % | 0.69 | -13302.92 |
| Short | normal | 2 | 0 (0 %) | 12 | 50 % | 0.52 | -10.37 |
| Short | trailing | 16 | 2 (13 %) | 132 | 45 % | 0.37 | -69.59 |
| Wide | dca | 68 | 23 (34 %) | 873 | 77 % | 0.58 | -432.11 |
| Signals | normal | 735 | 55 (7 %) | 1735 | 24 % | 0.20 | -2334.42 |
| Signals | trailing | 800 | 344 (43 %) | 2221 | 51 % | 0.38 | -1230.04 |
| Signals | trailing-only | 267 | 68 (25 %) | 728 | 41 % | 0.26 | -564.24 |

| range | indication kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 6645 | 2613 (39 %) | 98951 | 61 % | 0.54 | -24500.40 |
| Micro | break | 1934 | 1346 (70 %) | 29328 | 75 % | 1.17 | 1414.40 |
| Minimal | active | 3969 | 1634 (41 %) | 56710 | 60 % | 0.66 | -14487.19 |
| Minimal | break | 1684 | 854 (51 %) | 29827 | 68 % | 0.99 | -110.70 |
| Minimal | osc | 308 | 56 (18 %) | 5900 | 51 % | 0.43 | -1891.56 |
| Minimal | rsi | 17 | 0 (0 %) | 400 | 59 % | 0.64 | -112.23 |
| Short | active | 8 | 2 (25 %) | 76 | 42 % | 0.38 | -17.80 |
| Short | direction | 10 | 0 (0 %) | 68 | 50 % | 0.40 | -62.16 |
| Wide | active | 37 | 22 (59 %) | 451 | 82 % | 1.01 | 2.01 |
| Wide | break | 25 | 0 (0 %) | 384 | 74 % | 0.36 | -375.90 |
| Wide | osc | 6 | 1 (17 %) | 38 | 53 % | 0.19 | -58.22 |
| Signals | signal:act-burst | 20 | 5 (25 %) | 34 | 35 % | 0.26 | -33.05 |
| Signals | signal:act-hf | 91 | 39 (43 %) | 304 | 50 % | 0.42 | -134.82 |
| Signals | signal:atr-break | 39 | 10 (26 %) | 117 | 35 % | 0.16 | -166.41 |
| Signals | signal:bollinger | 18 | 17 (94 %) | 29 | 79 % | 14.05 | 24.35 |
| Signals | signal:cci | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -0.26 |
| Signals | signal:cmf | 65 | 20 (31 %) | 113 | 50 % | 0.29 | -93.87 |
| Signals | signal:coordination-band-r75-i3 | 104 | 12 (12 %) | 104 | 12 % | 0.01 | -362.24 |
| Signals | signal:coordination-band-r80-i3 | 106 | 8 (8 %) | 146 | 18 % | 0.02 | -223.24 |
| Signals | signal:donchian | 56 | 4 (7 %) | 119 | 11 % | 0.04 | -215.42 |
| Signals | signal:heikin-ashi | 83 | 23 (28 %) | 276 | 42 % | 0.41 | -222.38 |
| Signals | signal:hma | 45 | 12 (27 %) | 124 | 45 % | 0.47 | -52.62 |
| Signals | signal:impulse | 57 | 7 (12 %) | 117 | 16 % | 0.07 | -175.94 |
| Signals | signal:keltner | 15 | 0 (0 %) | 16 | 0 % | 0.00 | -34.92 |
| Signals | signal:macd-cross | 28 | 5 (18 %) | 29 | 17 % | 0.04 | -55.54 |
| Signals | signal:macd-hist | 63 | 26 (41 %) | 209 | 58 % | 0.90 | -12.28 |
| Signals | signal:macd-slow | 30 | 11 (37 %) | 51 | 33 % | 0.10 | -60.65 |
| Signals | signal:obv | 13 | 1 (8 %) | 18 | 17 % | 0.01 | -27.67 |
| Signals | signal:r-awesome | 19 | 15 (79 %) | 20 | 75 % | 2.13 | 13.78 |
| Signals | signal:r-fractal | 30 | 3 (10 %) | 43 | 12 % | 0.04 | -88.48 |
| Signals | signal:r-linreg | 54 | 15 (28 %) | 126 | 48 % | 0.24 | -97.13 |
| Signals | signal:r-nr-break | 45 | 14 (31 %) | 118 | 43 % | 0.37 | -68.42 |
| Signals | signal:r-session-trend | 21 | 0 (0 %) | 21 | 0 % | 0.00 | -40.72 |
| Signals | signal:r-vol-regime | 18 | 0 (0 %) | 24 | 4 % | 0.01 | -67.34 |
| Signals | signal:reclaim | 6 | 3 (50 %) | 6 | 50 % | 0.93 | -0.10 |
| Signals | signal:rsi-mid | 38 | 10 (26 %) | 48 | 29 % | 0.19 | -52.91 |
| Signals | signal:s2-active-hf | 98 | 23 (23 %) | 755 | 44 % | 0.35 | -537.43 |
| Signals | signal:s2-adx-gate | 26 | 0 (0 %) | 26 | 0 % | 0.00 | -54.01 |
| Signals | signal:s2-atr-break | 85 | 22 (26 %) | 427 | 49 % | 0.42 | -203.34 |
| Signals | signal:s2-bb-bounce | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 15.61 |
| Signals | signal:s2-block-scale | 46 | 8 (17 %) | 229 | 45 % | 0.37 | -152.17 |
| Signals | signal:s2-block-stack | 29 | 7 (24 %) | 42 | 24 % | 0.08 | -40.47 |
| Signals | signal:s2-range-break | 53 | 10 (19 %) | 88 | 16 % | 0.08 | -122.85 |
| Signals | signal:s2-range-shift | 29 | 2 (7 %) | 35 | 14 % | 0.09 | -47.01 |
| Signals | signal:s2-rsi-revert | 14 | 13 (93 %) | 21 | 90 % | 13.39 | 22.31 |
| Signals | signal:s2-stoch-swing | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 0.22 |
| Signals | signal:s2-vol-break | 70 | 8 (11 %) | 160 | 26 % | 0.11 | -247.46 |
| Signals | signal:sar | 78 | 31 (40 %) | 208 | 41 % | 0.35 | -134.80 |
| Signals | signal:stoch-rsi | 83 | 32 (39 %) | 201 | 45 % | 0.47 | -125.32 |
| Signals | signal:swing | 79 | 17 (22 %) | 219 | 37 % | 0.17 | -265.97 |
| Signals | signal:thrust | 7 | 2 (29 %) | 9 | 22 % | 0.31 | -4.81 |
| Signals | signal:volume-break | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -2.17 |
| Signals | signal:vwap | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -1.27 |
| Signals | signal:williams-r | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -3.82 |
| Signals | signal:zscore | 18 | 17 (94 %) | 29 | 79 % | 14.05 | 24.35 |

### Seat evaluation (configEval) at the run start, per range (configs failing at each gate, first gate missed)

Each engine config on its own closes at the run start (configEval: the gates the seat selection applies — not the Base stage, which ranks bot × indication pairs): over the selection window (24 h) ≥ max(3, 12) closes, positive net, PF ≥ its full indication's range minimum (stage 1.1; micro 1.05, minimal 1.1, short 1.1, general 1.2, long 1.3; full indication-aware Tactic floor 1.1, retaining stricter settings; mixed indication groups can have different minima), drawdown time ≤ min(11.67 h, 35 h × span ÷ 72 h), span = the tape's own history inside the 24 h window (ddtLimitH: a 1m tape with 72 h of history → 35 h; a full window → 11.67 h), drawdown ratio ≤ 1, last 15 closes at the same PF / DDT, range cells' last 75 at PF ≥ 1.35, positive lower-confidence bound, green hours ≥ 50 %. Real entries then check the last 0 closes again. Signal configs are not evaluated here: they are seated by their own signal activation. PF medians: the configEval window PF of every evaluated config / of the passed ones (unit basis; a config with no loss uses the runtime's no-loss gate score, not an exact finite ratio).

| range | configs | evaluated | passed | median PF score (evaluated) | median PF score (passed) | DDT limit h (min–max) | closes | net | pf | pre | lcb | lastN | rangeGate | ddt | ddr | green | stable | type off | pair not Base-passed | note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Micro | 41072 | 41072 | 8579 | 1.19 | 3.86 | 11.67–11.67 (median 11.67) | 513 | 17355 | 1071 | 0 | 9545 | 3059 | 16 | 230 | 134 | 570 | 0 | 0 | 0 |  |
| Minimal | 25200 | 25200 | 5978 | 1.49 | 3.13 | 11.67–11.67 (median 11.67) | 158 | 5372 | 1498 | 0 | 8109 | 3382 | 2 | 284 | 131 | 286 | 0 | 0 | 0 |  |
| Short | 168 | 168 | 18 | 1.89 | 2.30 | 11.67–11.67 (median 11.67) | 64 | 40 | 0 | 0 | 46 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |  |
| General | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Long | 0 | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 0 configs — no config sets built for this range |
| Wide | 2391 | 603 | 68 | 1.06 | 4.09 | 11.67–11.67 (median 11.67) | 139 | 211 | 41 | 0 | 127 | 17 | 0 | 0 | 0 | 0 | 0 | 1788 | 0 |  |
| Signals | 42342 | – | 1033 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 42342 signal tapes, 1033 units (pair × symbol × direction) active at the run start, 7019 over the run; 1802 configs entered while their unit was active — seated per unit and step, not configEval |

## Diagnostic: every config over the run window, by range and type (context: seated or not)

Each config computed independently (unit size, 0.15 % cost per close), on the book's rule (entries ≥ start, exits ≤ end); net in % of one unit summed over the closes. This all-candidate table is diagnostic only: it is not the PF benchmark and does not qualify or dilute the post-Base execution cohort.

| range | type | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | normal | 10268 | 3565 (35 %) | 203547 | 64 % | 0.57 | -54673.87 |
| Micro | trailing | 30804 | 10499 (34 %) | 718799 | 50 % | 0.48 | -169084.22 |
| Minimal | normal | 6300 | 2924 (46 %) | 101061 | 67 % | 0.84 | -13799.66 |
| Minimal | trailing | 18900 | 9338 (49 %) | 401268 | 62 % | 0.85 | -31018.50 |
| Short | normal | 42 | 14 (33 %) | 246 | 50 % | 0.67 | -123.88 |
| Short | trailing | 126 | 32 (25 %) | 920 | 47 % | 0.50 | -501.03 |
| Wide | axis | 1192 | 178 (15 %) | 16703 | 44 % | 0.63 | -3496.12 |
| Wide | dca | 596 | 328 (55 %) | 8814 | 78 % | 0.94 | -478.57 |
| Wide | dca-active | 596 | 138 (23 %) | 4014 | 39 % | 0.55 | -1321.57 |
| Wide | exit | 7 | 3 (43 %) | 261 | 41 % | 0.30 | -101.68 |
| Signals | normal | 16542 | 6467 (39 %) | 87023 | 46 % | 0.81 | -22159.63 |
| Signals | trailing | 24666 | 12880 (52 %) | 188379 | 65 % | 0.97 | -3810.34 |
| Signals | trailing-only | 1134 | 449 (40 %) | 12363 | 57 % | 0.66 | -2958.38 |

## Range cells by indication kind (seated configs; signal configs by source)

| range | kind | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | active | 6645 | 2613 (39 %) | 98951 | 61 % | 0.54 | -24500.40 |
| Micro | break | 1934 | 1346 (70 %) | 29328 | 75 % | 1.17 | 1414.40 |
| Minimal | active | 3969 | 1634 (41 %) | 56710 | 60 % | 0.66 | -14487.19 |
| Minimal | break | 1684 | 854 (51 %) | 29827 | 68 % | 0.99 | -110.70 |
| Minimal | osc | 308 | 56 (18 %) | 5900 | 51 % | 0.43 | -1891.56 |
| Minimal | rsi | 17 | 0 (0 %) | 400 | 59 % | 0.64 | -112.23 |
| Short | active | 8 | 2 (25 %) | 76 | 42 % | 0.38 | -17.80 |
| Short | direction | 10 | 0 (0 %) | 68 | 50 % | 0.40 | -62.16 |
| Wide | active | 37 | 22 (59 %) | 451 | 82 % | 1.01 | 2.01 |
| Wide | break | 25 | 0 (0 %) | 384 | 74 % | 0.36 | -375.90 |
| Wide | osc | 6 | 1 (17 %) | 38 | 53 % | 0.19 | -58.22 |
| Signals | signal:act-burst | 20 | 5 (25 %) | 34 | 35 % | 0.26 | -33.05 |
| Signals | signal:act-hf | 91 | 39 (43 %) | 304 | 50 % | 0.42 | -134.82 |
| Signals | signal:atr-break | 39 | 10 (26 %) | 117 | 35 % | 0.16 | -166.41 |
| Signals | signal:bollinger | 18 | 17 (94 %) | 29 | 79 % | 14.05 | 24.35 |
| Signals | signal:cci | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -0.26 |
| Signals | signal:cmf | 65 | 20 (31 %) | 113 | 50 % | 0.29 | -93.87 |
| Signals | signal:coordination-band-r75-i3 | 104 | 12 (12 %) | 104 | 12 % | 0.01 | -362.24 |
| Signals | signal:coordination-band-r80-i3 | 106 | 8 (8 %) | 146 | 18 % | 0.02 | -223.24 |
| Signals | signal:donchian | 56 | 4 (7 %) | 119 | 11 % | 0.04 | -215.42 |
| Signals | signal:heikin-ashi | 83 | 23 (28 %) | 276 | 42 % | 0.41 | -222.38 |
| Signals | signal:hma | 45 | 12 (27 %) | 124 | 45 % | 0.47 | -52.62 |
| Signals | signal:impulse | 57 | 7 (12 %) | 117 | 16 % | 0.07 | -175.94 |
| Signals | signal:keltner | 15 | 0 (0 %) | 16 | 0 % | 0.00 | -34.92 |
| Signals | signal:macd-cross | 28 | 5 (18 %) | 29 | 17 % | 0.04 | -55.54 |
| Signals | signal:macd-hist | 63 | 26 (41 %) | 209 | 58 % | 0.90 | -12.28 |
| Signals | signal:macd-slow | 30 | 11 (37 %) | 51 | 33 % | 0.10 | -60.65 |
| Signals | signal:obv | 13 | 1 (8 %) | 18 | 17 % | 0.01 | -27.67 |
| Signals | signal:r-awesome | 19 | 15 (79 %) | 20 | 75 % | 2.13 | 13.78 |
| Signals | signal:r-fractal | 30 | 3 (10 %) | 43 | 12 % | 0.04 | -88.48 |
| Signals | signal:r-linreg | 54 | 15 (28 %) | 126 | 48 % | 0.24 | -97.13 |
| Signals | signal:r-nr-break | 45 | 14 (31 %) | 118 | 43 % | 0.37 | -68.42 |
| Signals | signal:r-session-trend | 21 | 0 (0 %) | 21 | 0 % | 0.00 | -40.72 |
| Signals | signal:r-vol-regime | 18 | 0 (0 %) | 24 | 4 % | 0.01 | -67.34 |
| Signals | signal:reclaim | 6 | 3 (50 %) | 6 | 50 % | 0.93 | -0.10 |
| Signals | signal:rsi-mid | 38 | 10 (26 %) | 48 | 29 % | 0.19 | -52.91 |
| Signals | signal:s2-active-hf | 98 | 23 (23 %) | 755 | 44 % | 0.35 | -537.43 |
| Signals | signal:s2-adx-gate | 26 | 0 (0 %) | 26 | 0 % | 0.00 | -54.01 |
| Signals | signal:s2-atr-break | 85 | 22 (26 %) | 427 | 49 % | 0.42 | -203.34 |
| Signals | signal:s2-bb-bounce | 14 | 14 (100 %) | 14 | 100 % | ∞ (no loss) | 15.61 |
| Signals | signal:s2-block-scale | 46 | 8 (17 %) | 229 | 45 % | 0.37 | -152.17 |
| Signals | signal:s2-block-stack | 29 | 7 (24 %) | 42 | 24 % | 0.08 | -40.47 |
| Signals | signal:s2-range-break | 53 | 10 (19 %) | 88 | 16 % | 0.08 | -122.85 |
| Signals | signal:s2-range-shift | 29 | 2 (7 %) | 35 | 14 % | 0.09 | -47.01 |
| Signals | signal:s2-rsi-revert | 14 | 13 (93 %) | 21 | 90 % | 13.39 | 22.31 |
| Signals | signal:s2-stoch-swing | 1 | 1 (100 %) | 1 | 100 % | ∞ (no loss) | 0.22 |
| Signals | signal:s2-vol-break | 70 | 8 (11 %) | 160 | 26 % | 0.11 | -247.46 |
| Signals | signal:sar | 78 | 31 (40 %) | 208 | 41 % | 0.35 | -134.80 |
| Signals | signal:stoch-rsi | 83 | 32 (39 %) | 201 | 45 % | 0.47 | -125.32 |
| Signals | signal:swing | 79 | 17 (22 %) | 219 | 37 % | 0.17 | -265.97 |
| Signals | signal:thrust | 7 | 2 (29 %) | 9 | 22 % | 0.31 | -4.81 |
| Signals | signal:volume-break | 2 | 0 (0 %) | 2 | 0 % | 0.00 | -2.17 |
| Signals | signal:vwap | 1 | 0 (0 %) | 1 | 0 % | 0.00 | -1.27 |
| Signals | signal:williams-r | 3 | 0 (0 %) | 3 | 0 % | 0.00 | -3.82 |
| Signals | signal:zscore | 18 | 17 (94 %) | 29 | 79 % | 14.05 | 24.35 |

## Causal last-50 gate on the seated configs: their last 50 closes before the run cleared the PF, then inside the run

| range | min PF | configs | positive | closes | WR | PF unit | net % |
|---|---|---:|---:|---:|---:|---:|---:|
| Micro | 1.1 | 290 | 36 (12 %) | 14067 | 59 % | 0.66 | -1828.66 |
| Micro | 1.25 | 282 | 28 (10 %) | 13654 | 58 % | 0.65 | -1841.75 |
| Micro | 1.35 | 270 | 26 (10 %) | 12992 | 58 % | 0.64 | -1812.29 |
| Micro | 1.5 | 244 | 20 (8 %) | 11632 | 58 % | 0.62 | -1771.58 |
| Micro | 1.75 | 180 | 14 (8 %) | 8488 | 60 % | 0.67 | -1139.74 |
| Micro | 2 | 142 | 4 (3 %) | 6592 | 60 % | 0.63 | -1034.40 |
| Minimal | 1.1 | 140 | 32 (23 %) | 6762 | 57 % | 0.80 | -535.24 |
| Minimal | 1.25 | 140 | 32 (23 %) | 6762 | 57 % | 0.80 | -535.24 |
| Minimal | 1.35 | 138 | 30 (22 %) | 6646 | 56 % | 0.80 | -541.14 |
| Minimal | 1.5 | 136 | 28 (21 %) | 6518 | 57 % | 0.79 | -543.73 |
| Minimal | 1.75 | 114 | 16 (14 %) | 5569 | 55 % | 0.76 | -526.26 |
| Minimal | 2 | 86 | 8 (9 %) | 4170 | 54 % | 0.72 | -480.24 |
| Wide | 1.1 | 2 | 0 (0 %) | 117 | 76 % | 0.46 | -57.07 |
| Wide | 1.25 | 2 | 0 (0 %) | 117 | 76 % | 0.46 | -57.07 |
| Wide | 1.35 | 2 | 0 (0 %) | 117 | 76 % | 0.46 | -57.07 |
| Wide | 1.5 | 2 | 0 (0 %) | 117 | 76 % | 0.46 | -57.07 |
| Wide | 1.75 | 2 | 0 (0 %) | 117 | 76 % | 0.46 | -57.07 |
| Wide | 2 | 2 | 0 (0 %) | 117 | 76 % | 0.46 | -57.07 |

## Indications per range (seated configs of the indication together; positive net first, then by net)

| range | bot | indication | configs | positive | closes | WR | PF unit | net % | best config (closes · PF unit · net %) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Micro | follow | mc-rsit14-25@m5 | 344 | 318 (92 %) | 5274 | 87 % | 2.37 | 931.92 | tp0.95 sl2.1375 tr0.475 h192 mc (14 · 90.79 · 7.76) |
| Micro | follow | mc-rsit4-30@m5c | 374 | 332 (89 %) | 3774 | 73 % | 2.70 | 801.84 | tp0.95 sl2.85 tr0 h192 mc (7 · ∞ (no loss) · 5.60) |
| Micro | follow | break-mc-rel-retest8-5x15-dd48-balanced@m5 | 428 | 358 (84 %) | 4624 | 74 % | 1.92 | 636.83 | tp0.65 sl0.975 tr0.4875 h192 mc (10 · 11.74 · 3.66) |
| Micro | follow | mc-exh-12-5@m5 | 296 | 224 (76 %) | 2390 | 83 % | 2.70 | 505.57 | tp0.75 sl1.6875 tr0 h192 mc (7 · ∞ (no loss) · 4.20) |
| Micro | follow | mc-rsit9-15@m5 | 134 | 134 (100 %) | 629 | 100 % | ∞ (no loss) | 439.80 | tp0.95 sl1.6625 tr0.7125 h192 mc (5 · ∞ (no loss) · 4.00) |
| Micro | follow | mc-rsi14-25@m5c | 282 | 282 (100 %) | 846 | 85 % | 46.15 | 326.37 | – |
| Micro | follow | break-mc-rel-retest8-5-dd48-balanced@m5 | 362 | 242 (67 %) | 6178 | 74 % | 1.14 | 322.03 | tp0.95 sl1.1875 tr0 h192 mc (16 · 2.59 · 6.39) |
| Micro | follow | mc-rsidiv-14@m5 | 72 | 60 (83 %) | 1712 | 64 % | 2.71 | 284.37 | tp0.75 sl3.1875 tr0 h192 mc (12 · ∞ (no loss) · 7.20) |
| Micro | follow | mc-mrsi2-10@m15 | 514 | 418 (81 %) | 1542 | 83 % | 3.35 | 281.71 | – |
| Micro | follow | break-mc-rel-retest-5x15-dd48-balanced@m5 | 152 | 138 (91 %) | 1702 | 82 % | 3.48 | 253.88 | tp0.45 sl0.9 tr0 h192 mc (10 · ∞ (no loss) · 3.00) |
| Micro | follow | mc-streak-4@m15 | 20 | 20 (100 %) | 308 | 100 % | ∞ (no loss) | 221.76 | tp0.95 sl3.0875 tr0 h64 mc (15 · ∞ (no loss) · 12.00) |
| Micro | follow | break-mc-rel-don-15-dd24-balanced@m15 | 222 | 162 (73 %) | 3794 | 75 % | 1.22 | 188.31 | tp0.55 sl1.925 tr0 h64 mc (17 · 3.08 · 4.33) |
| Micro | follow | mc-irsi2-10@m5 | 286 | 163 (57 %) | 7661 | 71 % | 1.07 | 163.54 | tp0.95 sl4.75 tr0 h192 mc (17 · ∞ (no loss) · 13.60) |
| Micro | follow | break-mc-rel-don-15-dd48-balanced@m15 | 180 | 126 (70 %) | 3080 | 79 % | 1.24 | 155.59 | tp0.55 sl1.925 tr0 h64 mc (17 · 3.08 · 4.33) |
| Micro | follow | mc-turn-10@m5 | 156 | 98 (63 %) | 1876 | 67 % | 1.36 | 134.81 | tp0.65 sl1.4625 tr0 h192 mc (10 · ∞ (no loss) · 5.00) |
| Micro | follow | break-mc-rel-don8-15-dd48-balanced@m15 | 122 | 86 (70 %) | 2216 | 82 % | 1.29 | 134.41 | tp0.55 sl1.925 tr0 h64 mc (18 · 3.28 · 4.73) |
| Micro | follow | break-mc-rel-retest8-5-dd24-balanced@m5 | 38 | 38 (100 %) | 648 | 74 % | 1.50 | 119.14 | tp0.95 sl1.1875 tr0 h192 mc (17 · 1.94 · 5.05) |
| Micro | follow | mc-rsit5-15@m5 | 12 | 12 (100 %) | 184 | 90 % | 2.50 | 75.28 | tp0.95 sl4.75 tr0.7125 h192 mc (19 · 3.42 · 8.49) |
| Micro | follow | mc-mrsi2-10@m5 | 4 | 4 (100 %) | 62 | 97 % | 5.15 | 38.68 | tp0.95 sl4.75 tr0 h192 mc (16 · ∞ (no loss) · 12.80) |
| Micro | follow | mc-rsit7-15@m5 | 4 | 4 (100 %) | 50 | 100 % | ∞ (no loss) | 35.00 | tp0.85 sl3.825 tr0 h192 mc (14 · ∞ (no loss) · 9.80) |
| Micro | follow | mc-rsit9-20@m5 | 4 | 4 (100 %) | 50 | 100 % | ∞ (no loss) | 35.00 | tp0.85 sl3.825 tr0 h192 mc (14 · ∞ (no loss) · 9.80) |
| Micro | follow | mc-rsit7-20@m5 | 8 | 8 (100 %) | 105 | 89 % | 2.06 | 34.50 | tp0.95 sl4.75 tr0.7125 h192 mc (16 · 3.08 · 7.02) |
| Micro | follow | break-mc-rel-retest8-5x15-dd24-balanced@m5 | 16 | 14 (88 %) | 164 | 71 % | 1.59 | 32.45 | tp0.95 sl0.95 tr0.475 h192 mc (11 · 13.11 · 4.78) |
| Micro | follow | mc-bbx-25@m5 | 8 | 8 (100 %) | 198 | 79 % | 1.34 | 31.07 | tp0.95 sl4.75 tr0 h192 mc (17 · 3.94 · 9.55) |
| Micro | follow | mc-vwapd-2@m15 | 4 | 4 (100 %) | 36 | 100 % | ∞ (no loss) | 28.80 | tp0.95 sl4.5125 tr0 h64 mc (9 · ∞ (no loss) · 7.20) |
| Micro | follow | break-mc-rel-don8-5-dd48-balanced@m5 | 32 | 22 (69 %) | 674 | 79 % | 1.09 | 21.65 | tp0.55 sl1.925 tr0 h192 mc (21 · 1.83 · 3.45) |
| Micro | follow | mc-rsit4-10@m5 | 4 | 4 (100 %) | 46 | 91 % | 2.09 | 17.53 | tp0.95 sl4.5125 tr0 h192 mc (13 · 2.95 · 6.35) |
| Micro | follow | mc-engulf-20@m5 | 2 | 2 (100 %) | 35 | 94 % | 2.83 | 17.07 | tp0.95 sl4.5125 tr0 h192 mc (19 · 3.09 · 9.74) |
| Micro | follow | mc-rsit3-20@m15 | 18 | 12 (67 %) | 215 | 84 % | 1.12 | 14.41 | tp0.85 sl4.25 tr0 h64 mc (11 · 2.47 · 4.17) |
| Micro | follow | mc-rsi9-15@m5 | 12 | 12 (100 %) | 60 | 100 % | ∞ (no loss) | 12.00 | tp0.35 sl1.6625 tr0 h192 mc (5 · ∞ (no loss) · 1.00) |
| Micro | follow | mc-rsi4-15@m5c | 2 | 2 (100 %) | 23 | 91 % | 3.33 | 11.75 | tp0.95 sl2.375 tr0 h192 mc (12 · 3.49 · 6.28) |
| Micro | follow | break-mc-rel-don8-15-dd24-balanced@m15 | 8 | 8 (100 %) | 144 | 83 % | 1.38 | 11.55 | tp0.55 sl1.1 tr0 h64 mc (18 · 1.60 · 2.25) |
| Micro | follow | mc-lag-12@m5 | 18 | 18 (100 %) | 18 | 100 % | ∞ (no loss) | 9.00 | – |
| Micro | follow | mc-rsi4-5@m5 | 8 | 8 (100 %) | 72 | 86 % | 3.55 | 8.91 | tp0.35 sl1.75 tr0 h192 mc (8 · ∞ (no loss) · 1.60) |
| Micro | follow | mc-rsit3-5@m5 | 2 | 2 (100 %) | 21 | 90 % | 1.92 | 7.29 | tp0.95 sl4.5125 tr0 h192 mc (12 · 2.71 · 5.55) |
| Micro | follow | mc-rsi9-20@m5c | 2 | 2 (100 %) | 8 | 100 % | ∞ (no loss) | 1.60 | – |
| Micro | follow | mc-lag-6@m5 | 144 | 98 (68 %) | 190 | 76 % | 0.86 | -6.20 | – |
| Micro | follow | mc-rsrev-3@m15 | 2 | 0 (0 %) | 16 | 50 % | 0.43 | -7.50 | tp0.85 sl1.4875 tr0 h64 mc (8 · 0.43 · -3.75) |
| Micro | follow | break-mc-rel-don8-5-dd24-balanced@m5 | 4 | 0 (0 %) | 94 | 72 % | 0.80 | -9.68 | tp0.55 sl2.6125 tr0 h192 mc (23 · 0.97 · -0.29) |
| Micro | follow | break-mc-rel-don8-5x15-dd48-balanced@m5 | 8 | 0 (0 %) | 114 | 79 % | 0.77 | -10.78 | tp0.55 sl1.65 tr0 h192 mc (14 · 0.81 · -1.00) |
| Micro | follow | break-mc-rel-don8-5x15-dd24-balanced@m5 | 2 | 0 (0 %) | 28 | 43 % | 0.38 | -15.60 | tp0.95 sl1.425 tr0 h192 mc (14 · 0.38 · -7.80) |
| Micro | follow | mc-rsit4-25@m15 | 58 | 34 (59 %) | 749 | 70 % | 0.94 | -23.84 | tp0.85 sl4.25 tr0.6375 h64 mc (12 · 12.85 · 6.46) |
| Micro | follow | mc-rsit2-20@m5c | 26 | 6 (23 %) | 426 | 68 % | 0.78 | -26.06 | tp0.45 sl0.9 tr0 h192 mc (16 · 1.24 · 0.75) |
| Micro | follow | mc-rsit2-10@m15 | 8 | 2 (25 %) | 87 | 79 % | 0.64 | -26.30 | tp0.85 sl4.25 tr0 h64 mc (10 · 1.43 · 1.90) |
| Micro | follow | mc-rsit3-15@m15 | 6 | 2 (33 %) | 56 | 75 % | 0.50 | -27.63 | tp0.85 sl4.0375 tr0 h64 mc (8 · 1.17 · 0.71) |
| Micro | follow | mc-rsimid-14@m15 | 12 | 0 (0 %) | 84 | 43 % | 0.38 | -32.80 | tp0.65 sl0.65 tr0 h64 mc (7 · 0.47 · -1.70) |
| Micro | follow | break-mc-rel-don-5-dd48-balanced@m5 | 46 | 14 (30 %) | 968 | 74 % | 0.92 | -34.91 | tp0.85 sl2.55 tr0 h192 mc (18 · 1.30 · 2.40) |
| Micro | follow | break-mc-rel-don-5x15-dd48-balanced@m5 | 8 | 0 (0 %) | 118 | 68 % | 0.46 | -36.95 | tp0.55 sl1.65 tr0 h192 mc (14 · 0.56 · -3.20) |
| Micro | follow | mc-rsit2-15@m15 | 12 | 1 (8 %) | 200 | 76 % | 0.67 | -53.21 | tp0.85 sl4.25 tr0 h64 mc (15 · 1.26 · 1.87) |
| Micro | follow | mc-tmom-3@m15 | 74 | 20 (27 %) | 1204 | 75 % | 0.86 | -55.70 | tp0.55 sl1.7875 tr0 h64 mc (15 · 1.34 · 1.33) |
| Micro | follow | mc-rsit2-20@m15 | 12 | 0 (0 %) | 251 | 75 % | 0.60 | -83.75 | tp0.85 sl4.25 tr0 h64 mc (18 · 0.90 · -1.13) |
| Micro | follow | mc-ibrk@m15 | 36 | 0 (0 %) | 504 | 66 % | 0.59 | -91.74 | tp0.55 sl1.1 tr0 h64 mc (14 · 0.80 · -1.00) |
| Micro | follow | mc-tpull-8@m5 | 48 | 12 (25 %) | 2877 | 59 % | 0.87 | -92.64 | tp0.55 sl1.925 tr0 h288 mc (47 · 1.32 · 3.95) |
| Micro | follow | mc-rsit2-5@m15 | 56 | 10 (18 %) | 440 | 73 % | 0.63 | -95.54 | tp0.75 sl3.75 tr0 h64 mc (7 · ∞ (no loss) · 4.20) |
| Micro | follow | mc-burst-2@m15 | 4 | 0 (0 %) | 172 | 45 % | 0.38 | -101.80 | tp0.95 sl1.9 tr0 h64 mc (37 · 0.46 · -18.85) |
| Micro | follow | mc-rsit7-30@m15 | 10 | 0 (0 %) | 102 | 53 % | 0.19 | -127.93 | tp0.75 sl3.75 tr0 h64 mc (9 · 0.31 · -8.10) |
| Micro | follow | mc-trsi2-10@m5c | 118 | 14 (12 %) | 428 | 50 % | 0.42 | -210.50 | tp0.75 sl0.75 tr0 h192 mc (5 · 0.44 · -1.50) |
| Micro | follow | mc-rsit2-25@m15 | 14 | 0 (0 %) | 467 | 70 % | 0.47 | -220.33 | tp0.75 sl3.75 tr0 h64 mc (31 · 0.53 · -12.90) |
| Micro | follow | mc-brk-20@m5c | 92 | 11 (12 %) | 1261 | 63 % | 0.59 | -344.00 | tp0.95 sl4.275 tr0.7125 h192 mc (12 · 1.40 · 1.83) |
| Micro | follow | mc-rsit3-30@m15 | 28 | 0 (0 %) | 560 | 65 % | 0.42 | -347.78 | tp0.85 sl4.25 tr0 h64 mc (16 · 0.69 · -4.10) |
| Micro | follow | break-mc-rel-retest-5-dd48-balanced@m5 | 306 | 138 (45 %) | 4782 | 69 % | 0.85 | -353.52 | tp0.95 sl1.1875 tr0.7125 h192 mc (15 · 1.94 · 3.93) |
| Micro | follow | mc-rsimid-14@m5 | 42 | 0 (0 %) | 1334 | 60 % | 0.47 | -356.56 | tp0.95 sl1.425 tr0.475 h192 mc (32 · 0.62 · -5.54) |
| Micro | follow | mc-rsit4-20@m15 | 60 | 18 (30 %) | 500 | 62 % | 0.37 | -366.56 | tp0.95 sl4.275 tr0 h64 mc (6 · ∞ (no loss) · 4.80) |
| Micro | follow | mc-burst-2@m5c | 32 | 0 (0 %) | 1334 | 66 % | 0.38 | -409.64 | tp0.45 sl2.25 tr0.3375 h192 mc (40 · 0.49 · -8.25) |
| Micro | follow | mc-rsit5-30@m15 | 74 | 16 (22 %) | 1028 | 61 % | 0.50 | -438.87 | tp0.95 sl4.275 tr0 h96 mc (10 · 1.63 · 2.77) |
| Micro | follow | mc-rsit5-25@m15 | 72 | 19 (26 %) | 722 | 59 % | 0.37 | -466.46 | tp0.95 sl4.75 tr0 h64 mc (7 · ∞ (no loss) · 5.60) |
| Micro | follow | mc-rsit5-20@m15 | 58 | 0 (0 %) | 492 | 47 % | 0.17 | -546.51 | tp0.75 sl3.75 tr0 h64 mc (7 · 0.38 · -4.80) |
| Micro | follow | mc-rsit3-10@m15 | 76 | 0 (0 %) | 676 | 43 % | 0.15 | -726.80 | tp0.75 sl3.75 tr0.5625 h64 mc (6 · 0.60 · -1.57) |
| Micro | follow | mc-rsit3-25@m15 | 76 | 1 (1 %) | 1319 | 51 % | 0.38 | -738.15 | tp0.95 sl4.5125 tr0 h64 mc (14 · 1.03 · 0.27) |
| Micro | follow | mc-rsit2-25@m5c | 281 | 58 (21 %) | 5987 | 62 % | 0.65 | -821.35 | tp0.95 sl4.75 tr0.7125 h192 mc (10 · 21.48 · 5.35) |
| Micro | follow | mc-rsit4-30@m15 | 106 | 12 (11 %) | 1698 | 54 % | 0.43 | -850.46 | tp0.95 sl4.275 tr0 h64 mc (13 · 2.17 · 5.17) |
| Micro | follow | mc-brk-10@m5c | 128 | 0 (0 %) | 1909 | 60 % | 0.41 | -945.14 | tp0.75 sl2.8125 tr0 h192 mc (15 · 0.81 · -1.69) |
| Micro | follow | mc-tpull-13@m5 | 222 | 26 (12 %) | 10456 | 61 % | 0.71 | -1160.64 | tp0.95 sl4.75 tr0.475 h192 mc (34 · 1.45 · 4.74) |
| Micro | follow | mc-tcross-513@m5 | 198 | 0 (0 %) | 5802 | 60 % | 0.59 | -1177.39 | tp0.95 sl0.95 tr0 h288 mc (28 · 0.97 · -0.40) |
| Micro | follow | mc-tmom-5@m5 | 390 | 16 (4 %) | 4942 | 54 % | 0.50 | -1297.60 | tp0.95 sl4.0375 tr0 h192 mc (8 · 1.34 · 1.41) |
| Micro | follow | mc-mturn-10@m15 | 150 | 0 (0 %) | 2470 | 56 % | 0.36 | -1519.46 | tp0.95 sl4.0375 tr0.7125 h64 mc (13 · 0.85 · -1.28) |
| Micro | follow | mc-mturn-5@m15 | 308 | 12 (4 %) | 1448 | 19 % | 0.05 | -1639.59 | tp0.65 sl2.1125 tr0.1625 h64 mc (6 · 0.06 · -3.61) |
| Micro | follow | mc-rsit2-30@m5c | 234 | 2 (1 %) | 5287 | 60 % | 0.46 | -1738.71 | tp0.95 sl4.75 tr0.7125 h192 mc (12 · 1.39 · 2.04) |
| Micro | follow | mc-burst-3@m15 | 144 | 0 (0 %) | 3532 | 52 % | 0.36 | -2181.91 | tp0.95 sl4.275 tr0 h64 mc (16 · 0.78 · -2.88) |
| Micro | follow | mc-engulf-20@m15 | 360 | 68 (19 %) | 2520 | 35 % | 0.18 | -2380.15 | tp0.95 sl2.6125 tr0 h64 mc (5 · 0.43 · -3.13) |
| Micro | follow | mc-macdh@m15 | 284 | 0 (0 %) | 8226 | 36 % | 0.14 | -7232.78 | tp0.95 sl4.275 tr0 h64 mc (13 · 0.99 · -0.05) |
| Minimal | follow | mc-rsit14-25@m5 | 148 | 148 (100 %) | 1807 | 91 % | 6.22 | 1040.25 | tp1.6 sl2.4 tr0 h192 mn (8 · ∞ (no loss) · 11.60) |
| Minimal | follow | mc-rsit4-30@m5c | 253 | 243 (96 %) | 2015 | 78 % | 6.37 | 826.70 | tp1.3 sl2.92 tr0 h192 mn (7 · ∞ (no loss) · 8.05) |
| Minimal | follow | mc-bbx-25@m5 | 158 | 152 (96 %) | 3648 | 76 % | 1.40 | 826.34 | tp1.4 sl4.2 tr1.05 h192 mn (17 · 3.79 · 12.14) |
| Minimal | follow | break-mc-rel-retest8-5-dd48-balanced@m5 | 368 | 310 (84 %) | 5450 | 72 % | 1.30 | 758.61 | tp1.5 sl3.38 tr0 h192 mn (12 · 1.91 · 6.44) |
| Minimal | follow | mc-rsit9-15@m5 | 180 | 180 (100 %) | 881 | 100 % | ∞ (no loss) | 749.38 | tp1.4 sl2.1 tr0 h192 mn (5 · ∞ (no loss) · 6.25) |
| Minimal | follow | mc-irsi2-10@m5 | 183 | 157 (86 %) | 4140 | 71 % | 1.49 | 748.02 | tp1.6 sl4 tr0 h192 mn (18 · 2.80 · 14.90) |
| Minimal | follow | mc-rsit7-15@m5 | 50 | 50 (100 %) | 439 | 96 % | 12.37 | 448.66 | tp1.3 sl3.9 tr0 h192 mn (12 · ∞ (no loss) · 13.80) |
| Minimal | follow | mc-rsit9-20@m5 | 62 | 62 (100 %) | 545 | 90 % | 4.81 | 440.58 | tp1.3 sl3.9 tr0 h192 mn (11 · ∞ (no loss) · 12.65) |
| Minimal | follow | mc-mrsi2-10@m5 | 34 | 34 (100 %) | 495 | 88 % | 3.84 | 371.56 | tp1.6 sl4.8 tr0 h192 mn (12 · ∞ (no loss) · 17.40) |
| Minimal | follow | mc-rsit5-15@m5 | 26 | 26 (100 %) | 364 | 88 % | 4.42 | 273.38 | tp1.6 sl4.8 tr0 h192 mn (11 · ∞ (no loss) · 15.95) |
| Minimal | follow | mc-rsit7-20@m5 | 30 | 30 (100 %) | 338 | 91 % | 3.12 | 249.40 | tp1.6 sl4.8 tr0 h192 mn (10 · ∞ (no loss) · 14.50) |
| Minimal | follow | mc-rsi3-15@m5c | 14 | 14 (100 %) | 140 | 100 % | ∞ (no loss) | 188.60 | tp1.6 sl4 tr0 h192 mn (11 · ∞ (no loss) · 15.95) |
| Minimal | follow | break-mc-rel-retest8-5-dd24-balanced@m5 | 77 | 55 (71 %) | 1195 | 74 % | 1.19 | 119.37 | tp0.9 sl1.35 tr0.45 h192 mn (17 · 3.99 · 6.31) |
| Minimal | follow | mc-exh-12-3@m5 | 14 | 14 (100 %) | 207 | 85 % | 2.06 | 119.05 | tp1.6 sl4.4 tr0 h192 mn (13 · 3.82 · 12.85) |
| Minimal | follow | break-mc-rel-retest8-5x15-dd48-balanced@m5 | 56 | 48 (86 %) | 560 | 68 % | 1.85 | 104.60 | tp0.8 sl1.2 tr0.3 h192 mn (11 · 8.10 · 3.29) |
| Minimal | follow | mc-exh-12-5@m5 | 22 | 22 (100 %) | 166 | 96 % | 11.52 | 89.42 | tp0.8 sl1.8 tr0 h192 mn (7 · ∞ (no loss) · 4.55) |
| Minimal | follow | break-vol@x4@m1 | 98 | 53 (54 %) | 3788 | 70 % | 1.04 | 84.14 | tp1.4 sl3.85 tr1.05 h960 mn (35 · 2.03 · 13.77) |
| Minimal | follow | break-mc-rel-don8-5-dd48-balanced@m5 | 94 | 53 (56 %) | 1267 | 73 % | 1.09 | 82.87 | tp1.6 sl3.2 tr0.8 h192 mn (14 · 3.39 · 8.22) |
| Minimal | follow | mc-rsidiv-14@m5 | 16 | 14 (88 %) | 310 | 72 % | 5.79 | 81.31 | tp1.4 sl4.2 tr0 h288 mn (7 · ∞ (no loss) · 8.75) |
| Minimal | follow | mc-rsi4-30@m15 | 10 | 9 (90 %) | 237 | 83 % | 3.05 | 75.49 | tp1.5 sl4.5 tr0.37 h64 mn (27 · 32.61 · 10.79) |
| Minimal | follow | mc-rsit5-10@m5 | 9 | 9 (100 %) | 80 | 93 % | 152.50 | 75.48 | tp1.6 sl4.4 tr0 h192 mn (8 · ∞ (no loss) · 11.60) |
| Minimal | follow | mc-rsi7-20@m5 | 6 | 6 (100 %) | 64 | 97 % | 10.36 | 74.90 | tp1.5 sl4.12 tr0 h192 mn (11 · ∞ (no loss) · 14.85) |
| Minimal | follow | mc-rsi2-30@m15 | 4 | 4 (100 %) | 194 | 70 % | 2.15 | 62.27 | tp1.6 sl4.8 tr0.8 h64 mn (48 · 2.49 · 17.44) |
| Minimal | follow | mc-rsit4-15@m5 | 6 | 6 (100 %) | 100 | 86 % | 2.31 | 59.72 | tp1.6 sl4.8 tr1.2 h192 mn (18 · 4.12 · 15.62) |
| Minimal | follow | break-mc-rel-don8-5-dd24-balanced@m5 | 66 | 46 (70 %) | 998 | 72 % | 1.09 | 56.18 | tp1.6 sl3.2 tr0.8 h192 mn (16 · 1.61 · 4.12) |
| Minimal | follow | mc-rsi14-25@m5c | 34 | 34 (100 %) | 102 | 86 % | 51.33 | 56.09 | – |
| Minimal | follow | mc-rsi4-15@m5c | 8 | 8 (100 %) | 90 | 91 % | 3.71 | 55.20 | tp1.2 sl2.4 tr0 h192 mn (12 · 4.53 · 9.00) |
| Minimal | follow | break-mc-rel-don-5-dd48-balanced@m5 | 62 | 34 (55 %) | 844 | 71 % | 1.09 | 54.01 | tp1.6 sl3.2 tr0.8 h192 mn (13 · 3.30 · 7.90) |
| Minimal | follow | mc-engulf-20@m5 | 4 | 4 (100 %) | 58 | 86 % | 3.66 | 50.62 | tp1.6 sl4.4 tr1.2 h192 mn (16 · 4.14 · 14.31) |
| Minimal | follow | mc-rsit4-10@m5 | 5 | 5 (100 %) | 38 | 92 % | 9.49 | 39.67 | tp1.6 sl4.8 tr0 h192 mn (9 · ∞ (no loss) · 13.05) |
| Minimal | follow | mc-vwapd-3@m5c | 3 | 3 (100 %) | 30 | 93 % | 7.96 | 35.50 | tp1.6 sl2.4 tr0 h192 mn (11 · 5.69 · 11.95) |
| Minimal | follow | mc-rsit5-20@m5 | 2 | 2 (100 %) | 29 | 93 % | 321.91 | 34.95 | tp1.6 sl4.8 tr1.2 h192 mn (17 · 375.29 · 20.38) |
| Minimal | follow | mc-rsit3-5@m5 | 5 | 5 (100 %) | 33 | 91 % | 8.46 | 34.87 | tp1.6 sl4.8 tr0 h192 mn (8 · ∞ (no loss) · 11.60) |
| Minimal | follow | mc-rsit3-10@m5 | 2 | 2 (100 %) | 36 | 78 % | 3.51 | 26.25 | tp1.6 sl4.8 tr1.2 h192 mn (20 · 3.95 · 15.40) |
| Minimal | follow | mc-streak-4@m15 | 2 | 2 (100 %) | 30 | 100 % | ∞ (no loss) | 25.50 | tp1 sl3 tr0 h64 mn (15 · ∞ (no loss) · 12.75) |
| Minimal | follow | mc-rsi2-5@m5c | 2 | 2 (100 %) | 20 | 100 % | ∞ (no loss) | 23.00 | tp1.3 sl3.57 tr0 h192 mn (11 · ∞ (no loss) · 12.65) |
| Minimal | follow | mc-rsi2-20@m15 | 4 | 4 (100 %) | 142 | 76 % | 1.84 | 20.32 | tp1.6 sl4.4 tr0.4 h64 mn (36 · 1.90 · 5.28) |
| Minimal | follow | mc-lag-12@m5 | 50 | 16 (32 %) | 50 | 32 % | 5.09 | 13.66 | – |
| Minimal | follow | mc-rsi5-15@m5c | 2 | 2 (100 %) | 14 | 100 % | ∞ (no loss) | 11.90 | tp1 sl1.75 tr0 h192 mn (7 · ∞ (no loss) · 5.95) |
| Minimal | follow | mc-tpull-8@m5 | 8 | 8 (100 %) | 488 | 56 % | 1.11 | 11.37 | tp0.8 sl2 tr0.4 h192 mn (58 · 1.22 · 2.95) |
| Minimal | follow | mc-rsi2-10@m5c | 1 | 1 (100 %) | 7 | 100 % | ∞ (no loss) | 10.15 | tp1.6 sl4.4 tr0 h288 mn (7 · ∞ (no loss) · 10.15) |
| Minimal | follow | mc-rsi5-15@m5 | 1 | 1 (100 %) | 11 | 91 % | 3.19 | 9.95 | tp1.6 sl4.4 tr0 h288 mn (11 · 3.19 · 9.95) |
| Minimal | follow | mc-rsi3-5@m5 | 2 | 2 (100 %) | 7 | 100 % | ∞ (no loss) | 9.75 | – |
| Minimal | follow | mc-rsi4-10@m5 | 1 | 1 (100 %) | 5 | 100 % | ∞ (no loss) | 7.25 | tp1.6 sl4.4 tr0 h288 mn (5 · ∞ (no loss) · 7.25) |
| Minimal | follow | mc-rsi7-25@m5 | 1 | 1 (100 %) | 8 | 88 % | 2.05 | 5.20 | tp1.6 sl4.8 tr0 h288 mn (8 · 2.05 · 5.20) |
| Minimal | revert | cci-14-200@x4@m1 | 46 | 30 (65 %) | 226 | 54 % | 1.11 | 4.93 | tp0.8 sl2 tr0.4 h960 mn (5 · 26.83 · 2.01) |
| Minimal | follow | mc-rsi5-20@m5 | 1 | 1 (100 %) | 7 | 86 % | 1.76 | 3.75 | tp1.6 sl4.8 tr0 h288 mn (7 · 1.76 · 3.75) |
| Minimal | follow | mc-rsi4-15@m5 | 1 | 1 (100 %) | 10 | 80 % | 1.17 | 1.70 | tp1.6 sl4.8 tr0 h288 mn (10 · 1.17 · 1.70) |
| Minimal | follow | break-mc-rel-retest8-5x15-dd24-balanced@m5 | 8 | 6 (75 %) | 80 | 70 % | 1.04 | 1.62 | tp1 sl1.5 tr0 h192 mn (10 · 1.20 · 1.00) |
| Minimal | follow | mc-bbx-20@m15 | 2 | 2 (100 %) | 26 | 62 % | 1.09 | 0.73 | tp1.2 sl3.6 tr0.6 h64 mn (13 · 1.09 · 0.37) |
| Minimal | follow | mc-rsi4-25@m15 | 2 | 0 (0 %) | 22 | 64 % | 0.87 | -3.07 | tp1.6 sl3.6 tr0 h64 mn (11 · 0.88 · -1.34) |
| Minimal | follow | break-mc-rel-don-5-dd24-balanced@m5 | 2 | 0 (0 %) | 38 | 68 % | 0.85 | -4.29 | tp1.2 sl3.3 tr0.6 h192 mn (19 · 0.85 · -2.14) |
| Minimal | follow | mc-rsi4-20@m15 | 2 | 0 (0 %) | 16 | 63 % | 0.72 | -5.60 | tp1.6 sl3.2 tr0 h64 mn (8 · 0.72 · -2.80) |
| Minimal | follow | r-vol-regime-m@m15 | 42 | 0 (0 %) | 6 | 0 % | 0.00 | -8.10 | – |
| Minimal | follow | mc-rsi5-25@m15 | 2 | 0 (0 %) | 18 | 56 % | 0.54 | -12.30 | tp1.6 sl3.2 tr0 h64 mn (9 · 0.54 · -6.15) |
| Minimal | follow | mc-rsimid-14@m15 | 4 | 0 (0 %) | 28 | 43 % | 0.34 | -15.40 | tp0.8 sl1.2 tr0 h64 mn (7 · 0.36 · -3.45) |
| Minimal | follow | break-mc-rel-don8-5x15-dd24-balanced@m5 | 2 | 0 (0 %) | 26 | 38 % | 0.32 | -17.90 | tp1 sl1.5 tr0 h192 mn (13 · 0.32 · -8.95) |
| Minimal | follow | break-atr-2@x4@m5 | 8 | 0 (0 %) | 18 | 44 % | 0.21 | -19.50 | – |
| Minimal | follow | mc-rsit2-30@m15 | 2 | 0 (0 %) | 67 | 61 % | 0.52 | -29.65 | tp1.3 sl3.25 tr0.97 h64 mn (34 · 0.54 · -14.25) |
| Minimal | follow | break-vol@x4@m5 | 25 | 7 (28 %) | 326 | 57 % | 0.73 | -38.92 | tp0.8 sl2.4 tr0 h192 mn (11 · 2.55 · 3.95) |
| Minimal | follow | mc-burst-2@m5c | 8 | 0 (0 %) | 207 | 62 % | 0.68 | -53.96 | tp1.3 sl3.25 tr0 h192 mn (23 · 0.96 · -0.85) |
| Minimal | follow | mc-rsit2-15@m15 | 20 | 8 (40 %) | 324 | 69 % | 0.73 | -62.84 | tp1.6 sl4.8 tr0.8 h64 mn (15 · 1.97 · 5.13) |
| Minimal | follow | mc-rsit2-20@m15 | 6 | 0 (0 %) | 126 | 62 % | 0.46 | -65.14 | tp1.3 sl3.9 tr0.97 h64 mn (20 · 0.59 · -6.91) |
| Minimal | follow | mc-brk-20@m5c | 16 | 0 (0 %) | 241 | 54 % | 0.52 | -65.34 | tp1 sl3 tr0.75 h192 mn (13 · 0.93 · -0.42) |
| Minimal | follow | mc-rsit3-20@m15 | 10 | 0 (0 %) | 148 | 55 % | 0.45 | -73.83 | tp1.3 sl3.9 tr0.65 h64 mn (15 · 0.77 · -1.94) |
| Minimal | follow | break-mc-rel-don8-5x15-dd48-balanced@m5 | 14 | 0 (0 %) | 114 | 56 % | 0.51 | -75.23 | tp1.6 sl4.8 tr0.8 h192 mn (8 · 0.62 · -3.77) |
| Minimal | follow | rgm-20@m15 | 14 | 0 (0 %) | 156 | 26 % | 0.26 | -81.34 | tp1.2 sl2.1 tr0.3 h64 mn (11 · 0.51 · -1.89) |
| Minimal | follow | rsi-mom-14-20@m1 | 17 | 0 (0 %) | 400 | 59 % | 0.64 | -112.23 | tp1.5 sl3.38 tr0 h1440 mn (17 · 0.92 · -1.45) |
| Minimal | follow | mc-rsit7-30@m15 | 16 | 6 (38 %) | 132 | 58 % | 0.21 | -118.20 | tp1.6 sl4.4 tr0.8 h64 mn (7 · 10.71 · 3.27) |
| Minimal | follow | mc-trsi2-10@m5c | 191 | 63 (33 %) | 535 | 59 % | 0.72 | -119.26 | – |
| Minimal | follow | mc-rsit4-25@m15 | 72 | 38 (53 %) | 871 | 59 % | 0.73 | -150.99 | tp1.6 sl4.8 tr1.2 h96 mn (6 · ∞ (no loss) · 7.40) |
| Minimal | follow | mc-rsimid-14@m5 | 26 | 0 (0 %) | 676 | 57 % | 0.62 | -197.21 | tp1.3 sl1.95 tr0.97 h192 mn (25 · 0.77 · -4.89) |
| Minimal | follow | mc-rsit2-25@m5c | 36 | 12 (33 %) | 733 | 58 % | 0.48 | -212.42 | tp0.9 sl2.7 tr0.3 h192 mn (24 · 1.22 · 0.92) |
| Minimal | follow | mc-mturn-5@m15 | 34 | 0 (0 %) | 154 | 16 % | 0.03 | -230.38 | tp0.8 sl1.8 tr0.3 h64 mn (5 · 0.03 · -6.81) |
| Minimal | follow | mc-brk-10@m5c | 38 | 0 (0 %) | 579 | 54 % | 0.46 | -235.79 | tp1.1 sl3.02 tr0.83 h192 mn (14 · 0.78 · -2.14) |
| Minimal | follow | break-vol-2@x4@m5 | 132 | 24 (18 %) | 896 | 52 % | 0.57 | -238.59 | tp1.6 sl2.4 tr0.8 h192 mn (6 · 1.62 · 1.67) |
| Minimal | follow | mc-tmom-3@m5 | 24 | 0 (0 %) | 735 | 62 % | 0.67 | -238.77 | tp1.4 sl2.1 tr0 h192 mn (28 · 0.86 · -3.50) |
| Minimal | follow | break-vol-2@x4@m1 | 258 | 112 (43 %) | 8933 | 66 % | 0.93 | -327.29 | tp1.3 sl3.57 tr0.97 h960 mn (29 · 1.93 · 10.59) |
| Minimal | follow | mc-rsit3-25@m15 | 60 | 13 (22 %) | 893 | 57 % | 0.58 | -355.67 | tp1.6 sl4.8 tr0.8 h64 mn (13 · 1.63 · 3.34) |
| Minimal | follow | mc-tpull-13@m5 | 112 | 18 (16 %) | 5320 | 55 % | 0.77 | -505.93 | tp0.9 sl1.35 tr0.67 h192 mn (40 · 1.28 · 4.23) |
| Minimal | follow | mc-rsit5-25@m15 | 70 | 16 (23 %) | 698 | 51 % | 0.32 | -508.44 | tp1.6 sl4.8 tr0.8 h64 mn (7 · ∞ (no loss) · 3.70) |
| Minimal | follow | mc-rsit4-20@m15 | 62 | 6 (10 %) | 498 | 53 % | 0.28 | -528.94 | tp1.6 sl4.8 tr0.8 h64 mn (5 · ∞ (no loss) · 3.16) |
| Minimal | follow | mc-tcross-513@m5 | 98 | 0 (0 %) | 2005 | 61 % | 0.66 | -535.25 | tp1 sl1.5 tr0.5 h192 mn (27 · 0.95 · -0.61) |
| Minimal | follow | mc-rsit5-30@m15 | 92 | 26 (28 %) | 1177 | 54 % | 0.48 | -567.11 | tp1.6 sl4.8 tr0.8 h64 mn (12 · 23.03 · 7.69) |
| Minimal | follow | mc-burst-2@m15 | 36 | 0 (0 %) | 1086 | 50 % | 0.45 | -633.10 | tp1.4 sl3.85 tr1.05 h64 mn (21 · 0.60 · -8.51) |
| Minimal | follow | break-mc-rel-retest-5-dd48-balanced@m5 | 372 | 106 (28 %) | 5288 | 65 % | 0.81 | -642.28 | tp0.9 sl1.35 tr0.45 h192 mn (15 · 2.91 · 4.13) |
| Minimal | revert | cci-40-200@x4@m5 | 116 | 14 (12 %) | 1001 | 48 % | 0.26 | -704.43 | tp1.4 sl4.2 tr0.7 h192 mn (5 · 44.15 · 1.90) |
| Minimal | follow | mc-rsit3-30@m15 | 56 | 6 (11 %) | 1066 | 58 % | 0.42 | -706.68 | tp1.6 sl4.4 tr0.8 h64 mn (17 · 1.14 · 1.32) |
| Minimal | follow | mc-tmom-5@m5 | 211 | 2 (1 %) | 2261 | 60 % | 0.57 | -743.74 | tp1.4 sl4.2 tr1.05 h192 mn (6 · 1.18 · 0.78) |
| Minimal | follow | mc-rsit4-30@m15 | 126 | 18 (14 %) | 1836 | 52 % | 0.44 | -1037.51 | tp1.5 sl4.5 tr1.12 h64 mn (11 · 1.95 · 4.63) |
| Minimal | follow | mc-rsit2-30@m5c | 120 | 2 (2 %) | 2559 | 54 % | 0.42 | -1187.18 | tp1.2 sl3.6 tr0.3 h192 mn (27 · 1.05 · 0.26) |
| Minimal | revert | cci-40-200@x4@m1 | 146 | 12 (8 %) | 4673 | 51 % | 0.48 | -1192.05 | tp1.3 sl3.25 tr0.97 h1440 mn (20 · 1.87 · 6.41) |
| Minimal | follow | mc-mturn-10@m15 | 186 | 0 (0 %) | 2745 | 53 % | 0.39 | -2218.65 | tp1.4 sl4.2 tr0.7 h64 mn (13 · 0.94 · -0.49) |
| Minimal | follow | mc-engulf-20@m15 | 438 | 110 (25 %) | 2594 | 38 % | 0.25 | -2280.40 | tp1.3 sl2.92 tr0 h64 mn (5 · 0.56 · -2.69) |
| Minimal | follow | mc-burst-3@m15 | 178 | 2 (1 %) | 3795 | 51 % | 0.41 | -2533.51 | tp1.4 sl4.2 tr0 h64 mn (14 · 1.05 · 0.70) |
| Minimal | follow | mc-macdh@m15 | 234 | 0 (0 %) | 4994 | 37 % | 0.18 | -5467.28 | tp1.6 sl4.4 tr1.2 h64 mn (10 · 0.97 · -0.30) |
| Short | follow | rgm-20@m15 | 8 | 2 (25 %) | 76 | 42 % | 0.38 | -17.80 | tp2.2 sl3.3 tr0.55 h64 sh (9 · 1.00 · 0.00) |
| Short | revert | dir-emax-5-13@m15 | 10 | 0 (0 %) | 68 | 50 % | 0.40 | -62.16 | tp2 sl4.5 tr1.5 h64 sh (6 · 0.58 · -3.99) |
| Wide | follow | mc-rsit4-30@m5c | 3 | 3 (100 %) | 18 | 100 % | ∞ (no loss) | 19.35 | tp0.91 sl0.85 tr0 h96 dca (7 · ∞ (no loss) · 6.06) |
| Wide | follow | mc-rsit5-30@m15 | 2 | 2 (100 %) | 23 | 96 % | 5.77 | 18.61 | tp0.8 sl0.8 tr0 h32 dca (14 · ∞ (no loss) · 11.04) |
| Wide | follow | mc-rsit4-25@m15 | 2 | 2 (100 %) | 22 | 95 % | 5.61 | 17.96 | tp0.8 sl0.8 tr0 h32 dca (13 · ∞ (no loss) · 10.39) |
| Wide | follow | mc-rsidiv-14@m5 | 2 | 2 (100 %) | 28 | 93 % | 4.65 | 16.66 | tp0.91 sl0.85 tr0 h96 dca (13 · 5.01 · 9.14) |
| Wide | follow | mc-bbx-25@m5 | 1 | 1 (100 %) | 13 | 77 % | 2.62 | 16.31 | tp2.11 sl2.08 tr0 h96 dca (13 · 2.62 · 16.31) |
| Wide | follow | mc-rsit7-20@m5 | 2 | 2 (100 %) | 25 | 68 % | 1.85 | 14.82 | tp2.11 sl2.08 tr0 h96 dca (12 · 2.02 · 8.88) |
| Wide | follow | mc-streak-4@m15 | 1 | 1 (100 %) | 16 | 100 % | ∞ (no loss) | 10.40 | tp0.8 sl0.8 tr0 h32 dca (16 · ∞ (no loss) · 10.40) |
| Wide | follow | mc-rsit5-20@m15 | 1 | 1 (100 %) | 8 | 100 % | ∞ (no loss) | 7.80 | tp0.8 sl0.8 tr0 h32 dca (8 · ∞ (no loss) · 7.80) |
| Wide | follow | mc-rsit9-15@m5 | 2 | 2 (100 %) | 10 | 100 % | ∞ (no loss) | 6.85 | tp0.91 sl0.85 tr0 h96 dca (5 · ∞ (no loss) · 3.80) |
| Wide | follow | mc-engulf-20@m15 | 2 | 2 (100 %) | 5 | 100 % | ∞ (no loss) | 4.72 | – |
| Wide | follow | mc-rsit5-15@m5 | 1 | 1 (100 %) | 17 | 59 % | 1.29 | 4.57 | tp2.11 sl2.08 tr0 h96 dca (17 · 1.29 · 4.57) |
| Wide | follow | mc-rsit4-30@m15 | 2 | 1 (50 %) | 25 | 88 % | 1.05 | 1.14 | tp0.8 sl0.8 tr0 h32 dca (15 · 1.22 · 2.11) |
| Wide | revert | cci-14-200@x4@m1 | 2 | 1 (50 %) | 10 | 80 % | 1.02 | 0.08 | tp0.68 sl0.59 tr0 h480 dca (5 · 1.06 · 0.12) |
| Wide | follow | mc-rsit3-25@m15 | 1 | 0 (0 %) | 15 | 87 % | 0.98 | -0.20 | tp0.8 sl0.8 tr0 h32 dca (15 · 0.98 · -0.20) |
| Wide | follow | mc-rsit2-20@m15 | 1 | 0 (0 %) | 21 | 86 % | 0.71 | -6.51 | tp0.8 sl0.8 tr0 h32 dca (21 · 0.71 · -6.51) |
| Wide | follow | break-mc-rel-retest8-5x15-dd24-balanced@m5 | 1 | 0 (0 %) | 6 | 67 % | 0.43 | -7.94 | tp1.62 sl1.58 tr0 h96 dca (6 · 0.43 · -7.94) |
| Wide | follow | mc-rsit3-30@m15 | 1 | 0 (0 %) | 18 | 83 % | 0.62 | -8.46 | tp0.8 sl0.8 tr0 h32 dca (18 · 0.62 · -8.46) |
| Wide | follow | mc-burst-2@m5c | 1 | 0 (0 %) | 25 | 80 % | 0.54 | -11.25 | tp0.76 sl0.68 tr0 h96 dca (25 · 0.54 · -11.25) |
| Wide | follow | mc-mturn-10@m15 | 1 | 0 (0 %) | 15 | 80 % | 0.47 | -11.96 | tp0.8 sl0.8 tr0 h32 dca (15 · 0.47 · -11.96) |
| Wide | follow | mc-brk-10@m5c | 1 | 0 (0 %) | 15 | 73 % | 0.36 | -12.11 | tp0.76 sl0.68 tr0 h96 dca (15 · 0.36 · -12.11) |
| Wide | follow | mc-irsi2-10@m5 | 2 | 0 (0 %) | 44 | 77 % | 0.64 | -13.24 | tp0.91 sl0.85 tr0 h96 dca (22 · 0.71 · -5.35) |
| Wide | follow | break-atr-2@x4@m5 | 3 | 0 (0 %) | 9 | 22 % | 0.08 | -16.16 | – |
| Wide | follow | mc-tmom-5@m5 | 4 | 2 (50 %) | 32 | 69 % | 0.51 | -17.19 | tp0.76 sl0.68 tr0 h96 dca (11 · 1.35 · 1.43) |
| Wide | follow | mc-rsit2-25@m5c | 2 | 0 (0 %) | 25 | 76 % | 0.45 | -19.96 | tp0.76 sl0.68 tr0 h96 dca (14 · 0.47 · -9.50) |
| Wide | follow | break-vol@x4@m5 | 3 | 0 (0 %) | 34 | 76 % | 0.49 | -23.64 | tp0.76 sl0.68 tr0 h96 dca (13 · 0.67 · -3.60) |
| Wide | follow | break-vol-2@x4@m1 | 1 | 0 (0 %) | 47 | 77 % | 0.46 | -23.69 | tp0.68 sl0.59 tr0 h480 dca (47 · 0.46 · -23.69) |
| Wide | follow | break-vol-2@x4@m5 | 3 | 0 (0 %) | 21 | 62 % | 0.26 | -34.63 | tp0.76 sl0.68 tr0 h96 dca (7 · 0.28 · -7.85) |
| Wide | follow | mc-rsit2-30@m5c | 2 | 0 (0 %) | 31 | 74 % | 0.34 | -36.33 | tp0.76 sl0.68 tr0 h96 dca (17 · 0.35 · -17.83) |
| Wide | follow | break-mc-rel-don-5-dd48-balanced@m5 | 2 | 0 (0 %) | 21 | 67 % | 0.35 | -38.22 | tp1.62 sl1.58 tr0 h96 dca (11 · 0.37 · -18.12) |
| Wide | follow | break-mc-rel-retest8-5-dd24-balanced@m5 | 3 | 0 (0 %) | 44 | 80 % | 0.37 | -50.87 | tp1.62 sl1.58 tr0 h96 dca (12 · 0.51 · -11.37) |
| Wide | follow | break-mc-rel-retest8-5-dd48-balanced@m5 | 3 | 0 (0 %) | 44 | 80 % | 0.37 | -50.87 | tp1.62 sl1.58 tr0 h96 dca (12 · 0.51 · -11.37) |
| Wide | follow | break-vol@x4@m1 | 2 | 0 (0 %) | 117 | 76 % | 0.46 | -57.07 | tp0.68 sl0.59 tr0 h480 dca (58 · 0.47 · -27.84) |
| Wide | revert | cci-40-200@x4@m5 | 4 | 0 (0 %) | 28 | 43 % | 0.14 | -58.30 | tp0.91 sl0.85 tr0 h96 dca (8 · 0.51 · -3.67) |
| Wide | follow | break-mc-rel-retest-5-dd48-balanced@m5 | 3 | 0 (0 %) | 41 | 71 % | 0.25 | -72.82 | tp1.62 sl1.58 tr0 h96 dca (11 · 0.28 · -23.26) |
| Signals | follow | sig-bollinger-s@m15 | 18 | 17 (94 %) | 29 | 79 % | 14.05 | 24.35 | – |
| Signals | follow | sig-zscore-s@m15 | 18 | 17 (94 %) | 29 | 79 % | 14.05 | 24.35 | – |
| Signals | follow | sig-s2-rsi-revert-s@m15 | 14 | 13 (93 %) | 21 | 90 % | 13.39 | 22.31 | – |
| Signals | follow | sig-r-awesome-s@m15 | 19 | 15 (79 %) | 20 | 75 % | 2.13 | 13.78 | – |
| Signals | follow | sig-macd-hist-m@m15 | 48 | 21 (44 %) | 193 | 61 % | 1.08 | 8.19 | tp3 sl9 tr0.9 h192 (5 · ∞ (no loss) · 4.20) |
| Signals | follow | sig-s2-bb-bounce-s@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 7.80 | – |
| Signals | follow | sig-s2-bb-bounce-m@m15 | 7 | 7 (100 %) | 7 | 100 % | ∞ (no loss) | 7.80 | – |
| Signals | follow | sig-reclaim-s@m15 | 6 | 3 (50 %) | 6 | 50 % | 0.93 | -0.10 | – |
| Signals | follow | sig-s2-range-shift-s@m15 | 7 | 0 (0 %) | 9 | 11 % | 0.20 | -3.49 | – |
| Signals | follow | sig-thrust-m@m15 | 7 | 2 (29 %) | 9 | 22 % | 0.31 | -4.81 | – |
| Signals | follow | sig-sar-m@m15 | 33 | 19 (58 %) | 52 | 60 % | 0.77 | -6.80 | – |
| Signals | follow | sig-rsi-mid-m@m15 | 19 | 10 (53 %) | 29 | 48 % | 0.49 | -12.54 | – |
| Signals | follow | sig-cmf-s@m15 | 29 | 15 (52 %) | 50 | 58 % | 0.51 | -18.55 | – |
| Signals | follow | sig-macd-cross-s@m15 | 15 | 5 (33 %) | 16 | 31 % | 0.11 | -20.47 | – |
| Signals | follow | sig-macd-hist-s@m15 | 15 | 5 (33 %) | 16 | 31 % | 0.11 | -20.47 | – |
| Signals | follow | sig-obv-s@m15 | 13 | 1 (8 %) | 18 | 17 % | 0.01 | -27.67 | – |
| Signals | follow | sig-stoch-rsi-m@m15 | 33 | 12 (36 %) | 49 | 45 % | 0.30 | -30.13 | – |
| Signals | follow | sig-act-burst-s@m15 | 20 | 5 (25 %) | 34 | 35 % | 0.26 | -33.05 | – |
| Signals | follow | sig-keltner-m@m15 | 15 | 0 (0 %) | 16 | 0 % | 0.00 | -34.92 | – |
| Signals | follow | sig-macd-cross-m@m15 | 13 | 0 (0 %) | 13 | 0 % | 0.00 | -35.07 | – |
| Signals | follow | sig-rsi-mid-s@m15 | 19 | 0 (0 %) | 19 | 0 % | 0.00 | -40.37 | – |
| Signals | follow | sig-s2-block-stack-s@m15 | 29 | 7 (24 %) | 42 | 24 % | 0.08 | -40.47 | tp1.5 sl1.12 tr0 h192 (6 · 0.21 · -5.00) |
| Signals | follow | sig-r-session-trend-m@m15 | 21 | 0 (0 %) | 21 | 0 % | 0.00 | -40.72 | – |
| Signals | follow | sig-s2-range-shift-m@m15 | 22 | 2 (9 %) | 26 | 15 % | 0.08 | -43.52 | – |
| Signals | follow | sig-r-fractal-s@m15 | 18 | 3 (17 %) | 27 | 19 % | 0.07 | -43.62 | – |
| Signals | follow | sig-r-fractal-m@m15 | 12 | 0 (0 %) | 16 | 0 % | 0.00 | -44.87 | – |
| Signals | follow | sig-r-linreg-m@m15 | 30 | 10 (33 %) | 88 | 56 % | 0.32 | -47.64 | tp1 sl0.5 tr0 h192 (5 · 0.87 · -0.25) |
| Signals | follow | sig-s2-atr-break-m@m15 | 47 | 17 (36 %) | 292 | 61 % | 0.72 | -49.16 | tp3 sl9 tr0.6 h192 (10 · 15.30 · 4.09) |
| Signals | follow | sig-r-linreg-s@m15 | 24 | 5 (21 %) | 38 | 32 % | 0.14 | -49.49 | – |
| Signals | follow | sig-s2-range-break-m@m15 | 26 | 6 (23 %) | 42 | 17 % | 0.09 | -52.13 | – |
| Signals | follow | sig-hma-s@m15 | 45 | 12 (27 %) | 124 | 45 % | 0.47 | -52.62 | tp1.5 sl0.75 tr0 h192 (5 · 2.25 · 2.25) |
| Signals | follow | sig-impulse-m@m15 | 21 | 0 (0 %) | 34 | 0 % | 0.00 | -53.95 | – |
| Signals | follow | sig-s2-adx-gate-s@m15 | 26 | 0 (0 %) | 26 | 0 % | 0.00 | -54.01 | – |
| Signals | follow | sig-macd-slow-s@m15 | 30 | 11 (37 %) | 51 | 33 % | 0.10 | -60.65 | – |
| Signals | follow | sig-act-hf-s@m15 | 46 | 19 (41 %) | 153 | 48 % | 0.44 | -61.58 | tp1 sl3 tr0.3 h192 (6 · 1.58 · 0.78) |
| Signals | follow | sig-r-nr-break-m@m15 | 43 | 14 (33 %) | 116 | 44 % | 0.38 | -66.37 | tp1.5 sl4.5 tr0.45 h192 (5 · 1.53 · 0.71) |
| Signals | follow | sig-donchian-m@m15 | 24 | 2 (8 %) | 37 | 14 % | 0.05 | -67.26 | – |
| Signals | follow | sig-r-vol-regime-s@m15 | 18 | 0 (0 %) | 24 | 4 % | 0.01 | -67.34 | – |
| Signals | follow | sig-s2-range-break-s@m15 | 27 | 4 (15 %) | 46 | 15 % | 0.07 | -70.73 | – |
| Signals | follow | sig-act-hf-m@m15 | 45 | 20 (44 %) | 151 | 52 % | 0.39 | -73.23 | tp3 sl9 tr0.9 h192 (5 · 18.71 · 1.48) |
| Signals | follow | sig-cmf-m@m15 | 36 | 5 (14 %) | 63 | 44 % | 0.20 | -75.32 | – |
| Signals | follow | sig-stoch-rsi-s@m15 | 50 | 20 (40 %) | 152 | 45 % | 0.51 | -95.18 | tp0 sl1.5 tr0.5 h192 to (5 · 2.00 · 1.74) |
| Signals | follow | sig-heikin-ashi-m@m15 | 30 | 4 (13 %) | 59 | 27 % | 0.08 | -96.38 | – |
| Signals | follow | sig-s2-vol-break-s@m15 | 27 | 0 (0 %) | 41 | 5 % | 0.02 | -98.48 | – |
| Signals | follow | sig-impulse-s@m15 | 36 | 7 (19 %) | 83 | 23 % | 0.09 | -121.99 | – |
| Signals | follow | sig-heikin-ashi-s@m15 | 53 | 19 (36 %) | 217 | 46 % | 0.53 | -126.00 | tp3 sl9 tr0.9 h192 (5 · ∞ (no loss) · 6.38) |
| Signals | follow | sig-sar-s@m15 | 45 | 12 (27 %) | 156 | 35 % | 0.28 | -128.00 | tp1.5 sl4.5 tr0.45 h192 (6 · 2.49 · 1.20) |
| Signals | follow | sig-swing-m@m15 | 34 | 5 (15 %) | 75 | 29 % | 0.09 | -129.64 | – |
| Signals | follow | sig-swing-s@m15 | 45 | 12 (27 %) | 144 | 41 % | 0.23 | -136.33 | tp3 sl9 tr0.6 h192 (5 · 7.78 · 1.64) |
| Signals | follow | sig-donchian-s@m15 | 32 | 2 (6 %) | 82 | 10 % | 0.04 | -148.16 | tp1.5 sl0.75 tr0 h192 (5 · 0.37 · -2.25) |
| Signals | follow | sig-s2-vol-break-m@m15 | 43 | 8 (19 %) | 119 | 33 % | 0.16 | -148.98 | tp1 sl0.75 tr0 h192 (5 · 0.24 · -2.75) |
| Signals | follow | sig-s2-block-scale-s@m15 | 46 | 8 (17 %) | 229 | 45 % | 0.37 | -152.17 | tp1.5 sl4.5 tr0.6 h192 (6 · 0.97 · -0.15) |
| Signals | follow | sig-s2-atr-break-s@m15 | 38 | 5 (13 %) | 135 | 24 % | 0.12 | -154.17 | tp1.5 sl4.5 tr0.3 h192 (7 · 1.28 · 0.19) |
| Signals | follow | sig-atr-break-s@m15 | 39 | 10 (26 %) | 117 | 35 % | 0.16 | -166.41 | tp1 sl3 tr0.4 h192 (8 · 0.45 · -4.21) |
| Signals | follow | sig-coord-v2-r80-n3-i3-b8nmkj3gro7l7ufsbgf@m15 | 106 | 8 (8 %) | 146 | 18 % | 0.02 | -223.24 | – |
| Signals | follow | sig-s2-active-hf-s@m15 | 48 | 11 (23 %) | 371 | 44 % | 0.36 | -247.24 | tp4 sl12 tr0.8 h192 (10 · 21.69 · 5.47) |
| Signals | follow | sig-s2-active-hf-m@m15 | 50 | 12 (24 %) | 384 | 44 % | 0.33 | -290.19 | tp3 sl9 tr0.6 h192 (11 · 3.75 · 3.75) |
| Signals | follow | sig-coord-v2-r75-n3-i3-b8nmkj3gro7l7ufsbgf@m15 | 104 | 12 (12 %) | 104 | 12 % | 0.01 | -362.24 | – |

## Best range cells by net (seated configs, ≥ 10 closes, all pairs together)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Minimal | tp 1.600% | sl 3.00× | tr 0.75× | 52 | 46 (88 %) | 537 | 82 % | 2.43 | 306.70 |
| Minimal | tp 1.600% | sl 2.75× | tr off | 47 | 37 (79 %) | 383 | 86 % | 1.98 | 236.00 |
| Minimal | tp 1.500% | sl 2.75× | tr off | 43 | 30 (70 %) | 420 | 84 % | 1.75 | 203.56 |
| Minimal | tp 1.600% | sl 2.75× | tr 0.75× | 43 | 37 (86 %) | 436 | 79 % | 1.81 | 181.88 |
| Minimal | tp 1.600% | sl 3.00× | tr off | 43 | 30 (70 %) | 355 | 85 % | 1.69 | 177.87 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.50× | 54 | 42 (78 %) | 741 | 80 % | 1.59 | 169.35 |
| Minimal | tp 1.600% | sl 2.50× | tr off | 41 | 29 (71 %) | 391 | 81 % | 1.54 | 160.29 |
| Minimal | tp 1.400% | sl 3.00× | tr off | 38 | 30 (79 %) | 361 | 85 % | 1.66 | 152.92 |
| Minimal | tp 1.500% | sl 3.00× | tr off | 38 | 26 (68 %) | 334 | 84 % | 1.57 | 137.67 |
| Minimal | tp 1.500% | sl 3.00× | tr 0.75× | 42 | 34 (81 %) | 438 | 80 % | 1.42 | 112.22 |
| Minimal | tp 1.600% | sl 2.75× | tr 0.50× | 50 | 37 (74 %) | 711 | 77 % | 1.33 | 100.77 |
| Micro | tp 0.950% (net 0.800%) | sl 5.00× | tr off | 51 | 33 (65 %) | 573 | 88 % | 1.31 | 95.40 |
| Minimal | tp 1.400% | sl 3.00× | tr 0.75× | 42 | 29 (69 %) | 450 | 74 % | 1.31 | 82.16 |
| Micro | tp 0.950% (net 0.800%) | sl 4.75× | tr off | 53 | 35 (66 %) | 612 | 87 % | 1.23 | 80.53 |
| Minimal | tp 1.600% | sl 3.00× | tr 0.25× | 34 | 22 (65 %) | 646 | 62 % | 1.55 | 77.67 |
| Minimal | tp 1.600% | sl 2.50× | tr 0.75× | 34 | 26 (76 %) | 383 | 74 % | 1.31 | 77.43 |
| Minimal | tp 1.400% | sl 3.00× | tr 0.50× | 46 | 30 (65 %) | 606 | 74 % | 1.22 | 52.32 |
| Micro | tp 0.950% (net 0.800%) | sl 5.00× | tr 0.75× | 40 | 26 (65 %) | 464 | 78 % | 1.23 | 50.33 |
| Signals | tp 3.000% | sl 3.00× | tr 0.20× | 42 | 34 (81 %) | 124 | 71 % | 4.21 | 46.17 |
| Minimal | tp 1.600% | sl 1.50× | tr off | 33 | 19 (58 %) | 370 | 67 % | 1.15 | 45.51 |
| Minimal | tp 1.400% | sl 2.75× | tr off | 39 | 23 (59 %) | 458 | 77 % | 1.10 | 38.63 |
| Signals | tp 4.000% | sl 3.00× | tr 0.20× | 35 | 34 (97 %) | 79 | 82 % | 24.52 | 37.54 |
| Signals | tp 3.000% | sl 3.00× | tr 0.30× | 26 | 24 (92 %) | 62 | 94 % | 98.60 | 33.67 |
| Minimal | tp 1.500% | sl 3.00× | tr 0.50× | 52 | 33 (63 %) | 680 | 75 % | 1.09 | 30.49 |
| Micro | tp 0.950% (net 0.800%) | sl 1.00× | tr off | 18 | 12 (67 %) | 342 | 62 % | 1.20 | 28.50 |
| Micro | tp 0.950% (net 0.800%) | sl 1.00× | tr 0.50× | 8 | 8 (100 %) | 84 | 67 % | 3.32 | 25.80 |
| Micro | tp 0.750% (net 0.600%) | sl 1.00× | tr 0.50× | 12 | 10 (83 %) | 172 | 67 % | 1.75 | 24.91 |
| Minimal | tp 0.800% | sl 1.50× | tr 0.38× | 10 | 8 (80 %) | 80 | 73 % | 3.99 | 24.02 |
| Micro | tp 0.950% (net 0.800%) | sl 4.50× | tr off | 41 | 22 (54 %) | 460 | 85 % | 1.08 | 23.11 |
| Signals | tp 3.000% | sl 3.00× | tr 0.40× | 22 | 20 (91 %) | 42 | 95 % | 171.90 | 22.73 |
| Micro | tp 0.950% (net 0.800%) | sl 1.25× | tr 0.75× | 16 | 10 (63 %) | 285 | 65 % | 1.19 | 21.67 |
| Micro | tp 0.550% (net 0.400%) | sl 2.00× | tr 0.50× | 10 | 10 (100 %) | 124 | 79 % | 2.27 | 21.25 |
| Signals | tp 5.000% | sl 3.00× | tr 0.20× | 26 | 22 (85 %) | 45 | 78 % | 39.61 | 21.11 |
| Micro | tp 0.550% (net 0.400%) | sl 2.25× | tr 0.50× | 10 | 10 (100 %) | 124 | 79 % | 2.06 | 19.60 |
| Micro | tp 0.850% (net 0.700%) | sl 1.25× | tr off | 8 | 6 (75 %) | 172 | 69 % | 1.30 | 19.04 |
| Micro | tp 0.650% (net 0.500%) | sl 1.50× | tr 0.50× | 12 | 10 (83 %) | 124 | 66 % | 2.00 | 18.12 |
| Micro | tp 0.950% (net 0.800%) | sl 5.00× | tr 0.50× | 44 | 25 (57 %) | 623 | 70 % | 1.07 | 17.45 |
| Wide | tp 0.800% | sl 1.00× | tr off | 11 | 6 (55 %) | 138 | 91 % | 1.19 | 17.24 |
| Signals | tp 4.000% | sl 3.00× | tr 0.30× | 22 | 20 (91 %) | 37 | 95 % | 126.30 | 16.66 |
| Signals | tp 6.000% | sl 3.00× | tr 0.20× | 22 | 20 (91 %) | 37 | 95 % | 126.30 | 16.66 |

## Worst range cells by net (seated configs, the rows not in the best table)

| range | TP | SL | trail | configs | positive | closes | WR | PF unit | net % |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Signals | tp 0.000% | sl Infinity× | tr Infinity× | 267 | 68 (25 %) | 728 | 41 % | 0.26 | -564.24 |
| Micro | tp 0.750% (net 0.600%) | sl 4.50× | tr off | 50 | 13 (26 %) | 695 | 72 % | 0.45 | -375.00 |
| Micro | tp 0.750% (net 0.600%) | sl 4.75× | tr off | 50 | 10 (20 %) | 681 | 74 % | 0.45 | -367.65 |
| Micro | tp 0.750% (net 0.600%) | sl 5.00× | tr off | 64 | 14 (22 %) | 851 | 77 % | 0.53 | -353.40 |
| Micro | tp 0.650% (net 0.500%) | sl 5.00× | tr off | 46 | 10 (22 %) | 664 | 76 % | 0.46 | -299.80 |
| Minimal | tp 1.500% | sl 2.50× | tr 0.50× | 46 | 15 (33 %) | 655 | 65 % | 0.50 | -283.56 |
| Minimal | tp 1.400% | sl 2.50× | tr 0.50× | 37 | 11 (30 %) | 540 | 64 % | 0.44 | -278.07 |
| Micro | tp 0.750% (net 0.600%) | sl 4.75× | tr 0.75× | 44 | 8 (18 %) | 543 | 61 % | 0.41 | -269.27 |
| Micro | tp 0.950% (net 0.800%) | sl 4.00× | tr 0.50× | 38 | 10 (26 %) | 597 | 58 % | 0.43 | -268.44 |
| Minimal | tp 1.300% | sl 2.50× | tr 0.75× | 40 | 14 (35 %) | 648 | 59 % | 0.57 | -268.36 |
| Micro | tp 0.850% (net 0.700%) | sl 4.50× | tr off | 48 | 10 (21 %) | 645 | 76 % | 0.57 | -259.10 |
| Minimal | tp 1.200% | sl 2.75× | tr 0.50× | 40 | 12 (30 %) | 636 | 61 % | 0.52 | -255.91 |
| Micro | tp 0.850% (net 0.700%) | sl 4.25× | tr 0.75× | 34 | 4 (12 %) | 470 | 60 % | 0.43 | -253.73 |
| Minimal | tp 1.600% | sl 2.25× | tr 0.50× | 46 | 19 (41 %) | 671 | 69 % | 0.57 | -252.38 |
| Micro | tp 0.750% (net 0.600%) | sl 4.50× | tr 0.75× | 42 | 8 (19 %) | 539 | 61 % | 0.43 | -247.68 |

## Config sets: completeness (the Base gate decides which pairs and targets build)

Every indication × range × strategy type: the grid's cells (target × stop × trail × hold), built (simulated), kept (can take a seat), dropped for too few closes (the range gate's last N can never be met), and not built by reason (baseRange: the pair did not pass Base in that range; baseTarget: the target did not pass Base; duplicate: two grid cells map onto one config on a slow lane).

| range | type | indications (with sets) | grid cells | built | kept | too few closes | not built |
|---|---|---:|---:|---:|---:|---:|---|
| Micro | normal | 106 (87) | 32130 | 10268 | 10268 | 0 | baseTarget 13532 · baseRange 8330 |
| Micro | trailing | 106 (87) | 96390 | 30804 | 30804 | 0 | baseTarget 40596 · baseRange 24990 |
| Minimal | normal | 117 (99) | 18774 | 6300 | 6300 | 0 | baseTarget 9072 · baseRange 3402 |
| Minimal | trailing | 117 (99) | 56322 | 18900 | 18900 | 0 | baseTarget 27216 · baseRange 10206 |
| Short | normal | 4 (2) | 336 | 42 | 42 | 0 | baseRange 168 · baseTarget 126 |
| Short | trailing | 4 (2) | 1008 | 126 | 126 | 0 | baseRange 504 · baseTarget 378 |
| General | normal | 4 (0) | 384 | 0 | 0 | 0 | baseRange 384 |
| General | trailing | 4 (0) | 1152 | 0 | 0 | 0 | baseRange 1152 |
| Long | normal | 4 (0) | 480 | 0 | 0 | 0 | baseRange 480 |
| Long | trailing | 4 (0) | 1440 | 0 | 0 | 0 | baseRange 1440 |
| Wide | axis | 117 (117) | 1192 | 1192 | 1192 | 0 | – |
| Wide | dca | 117 (117) | 596 | 596 | 596 | 0 | – |
| Wide | dca-active | 117 (117) | 596 | 596 | 596 | 0 | – |
| Wide | exit | 2 (2) | 7 | 7 | 7 | 0 | – |

Engine indications Base evaluated that built no set: 245 (act-burst-2.5@x4, act-chop@x4, bb-walk@x4, break-mc-rel-don-15-dd24-guarded, break-mc-rel-don-15-dd48-guarded, break-mc-rel-don-5-dd24-guarded, break-mc-rel-don-5-dd48-guarded, break-mc-rel-don-5x15-dd24-balanced, break-mc-rel-don-5x15-dd24-guarded, break-mc-rel-don-5x15-dd48-guarded, break-mc-rel-don8-15-dd24-guarded, break-mc-rel-don8-15-dd48-guarded, break-mc-rel-don8-5-dd24-guarded, break-mc-rel-don8-5-dd48-guarded, break-mc-rel-don8-5x15-dd24-guarded, break-mc-rel-don8-5x15-dd48-guarded, break-mc-rel-reclaim8-15-dd24-balanced, break-mc-rel-reclaim8-15-dd24-guarded, break-mc-rel-reclaim8-15-dd48-balanced, break-mc-rel-reclaim8-15-dd48-guarded, break-mc-rel-reclaim8-5-dd24-balanced, break-mc-rel-reclaim8-5-dd24-guarded, break-mc-rel-reclaim8-5-dd48-balanced, break-mc-rel-reclaim8-5-dd48-guarded, break-mc-rel-reclaim8-5x15-dd24-balanced, break-mc-rel-reclaim8-5x15-dd24-guarded, break-mc-rel-reclaim8-5x15-dd48-balanced, break-mc-rel-reclaim8-5x15-dd48-guarded, break-mc-rel-retest-15-dd24-balanced, break-mc-rel-retest-15-dd24-guarded, break-mc-rel-retest-15-dd48-balanced, break-mc-rel-retest-15-dd48-guarded, break-mc-rel-retest-5-dd24-balanced, break-mc-rel-retest-5-dd24-guarded, break-mc-rel-retest-5-dd48-guarded, break-mc-rel-retest-5x15-dd24-balanced, break-mc-rel-retest-5x15-dd24-guarded, break-mc-rel-retest-5x15-dd48-guarded, break-mc-rel-retest8-15-dd24-balanced, break-mc-rel-retest8-15-dd24-guarded, …).

## Heatmaps: target × stop per range (PF unit, closes; every type and trail together)

### Micro — every config computed

| stop ÷ target | tp 0.35 % | tp 0.45 % | tp 0.55 % | tp 0.65 % | tp 0.75 % | tp 0.85 % | tp 0.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 0.28 (4490) | 0.29 (6112) | 0.39 (8524) | 0.35 (10600) | 0.33 (12599) | 0.41 (11472) | 0.55 (17835) |
| 1.25× | 0.31 (4422) | 0.30 (6008) | 0.42 (8280) | 0.34 (10080) | 0.32 (12045) | 0.43 (10944) | 0.57 (16937) |
| 1.5× | 0.35 (4354) | 0.34 (5896) | 0.45 (7968) | 0.36 (9743) | 0.32 (11641) | 0.42 (10384) | 0.56 (16086) |
| 1.75× | 0.36 (4326) | 0.36 (5758) | 0.45 (7734) | 0.34 (9581) | 0.34 (10877) | 0.42 (9974) | 0.58 (14996) |
| 2× | 0.41 (4274) | 0.37 (5652) | 0.46 (7651) | 0.36 (9021) | 0.34 (10563) | 0.44 (9286) | 0.62 (13989) |
| 2.25× | 0.40 (4236) | 0.38 (5602) | 0.45 (7487) | 0.35 (8849) | 0.34 (9980) | 0.44 (8780) | 0.71 (13109) |
| 2.5× | 0.42 (4224) | 0.38 (5538) | 0.45 (7307) | 0.36 (8320) | 0.35 (9512) | 0.48 (8193) | 0.72 (12746) |
| 2.75× | 0.42 (4196) | 0.37 (5442) | 0.48 (7065) | 0.38 (8154) | 0.38 (8650) | 0.48 (7911) | 0.76 (12043) |
| 3× | 0.44 (4196) | 0.38 (5294) | 0.50 (6931) | 0.38 (7862) | 0.38 (8539) | 0.52 (7207) | 0.73 (11813) |
| 3.25× | 0.45 (4160) | 0.38 (5214) | 0.50 (6841) | 0.43 (7434) | 0.39 (8385) | 0.49 (7158) | 0.77 (11295) |
| 3.5× | 0.44 (4126) | 0.40 (5064) | 0.52 (6711) | 0.41 (7418) | 0.42 (7623) | 0.47 (7100) | 0.85 (10877) |
| 3.75× | 0.45 (4066) | 0.39 (5048) | 0.57 (6502) | 0.41 (7260) | 0.40 (7597) | 0.54 (6714) | 0.87 (10701) |
| 4× | 0.45 (4018) | 0.41 (4974) | 0.56 (6468) | 0.46 (6734) | 0.39 (7567) | 0.56 (6554) | 0.96 (10546) |
| 4.25× | 0.45 (3980) | 0.42 (4908) | 0.57 (6416) | 0.44 (6708) | 0.44 (7229) | 0.56 (6468) | 1.20 (10102) |
| 4.5× | 0.48 (3902) | 0.45 (4786) | 0.57 (6314) | 0.43 (6703) | 0.44 (7087) | 0.61 (6394) | 1.49 (9864) |
| 4.75× | 0.48 (3880) | 0.47 (4726) | 0.57 (6250) | 0.44 (6595) | 0.44 (7013) | 0.78 (6076) | 1.49 (9774) |
| 5× | 0.47 (3842) | 0.46 (4714) | 0.55 (6238) | 0.47 (6471) | 0.51 (6927) | 0.95 (5878) | 1.58 (9658) |

### Micro — configs that passed their evaluation

| stop ÷ target | tp 0.35 % | tp 0.45 % | tp 0.55 % | tp 0.65 % | tp 0.75 % | tp 0.85 % | tp 0.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 0.34 (52) | 0.42 (346) | 0.66 (546) | 0.98 (468) | 0.98 (882) | 0.95 (663) | 1.21 (753) |
| 1.25× | 0.48 (242) | 0.59 (614) | 0.93 (540) | 1.00 (688) | 0.90 (787) | 1.21 (495) | 1.05 (675) |
| 1.5× | 0.69 (344) | 1.03 (498) | 1.00 (662) | 0.84 (749) | 1.09 (499) | 0.76 (536) | 0.65 (1031) |
| 1.75× | 0.72 (374) | 0.87 (836) | 1.06 (706) | 1.11 (747) | 0.42 (825) | 0.69 (885) | 0.65 (971) |
| 2× | 0.89 (472) | 0.97 (1080) | 1.13 (878) | 0.48 (989) | 0.57 (957) | 0.52 (718) | 0.57 (792) |
| 2.25× | 0.82 (622) | 1.13 (1040) | 1.07 (718) | 0.58 (1141) | 0.53 (1082) | 0.63 (652) | 0.61 (606) |
| 2.5× | 0.99 (648) | 1.09 (1106) | 0.74 (934) | 0.58 (982) | 0.47 (1084) | 0.52 (482) | 0.73 (1000) |
| 2.75× | 1.00 (686) | 0.95 (964) | 0.84 (1134) | 0.56 (1062) | 0.55 (1046) | 0.57 (734) | 0.81 (893) |
| 3× | 1.01 (634) | 0.62 (1026) | 0.70 (1168) | 0.57 (1160) | 0.51 (848) | 0.81 (839) | 0.60 (1163) |
| 3.25× | 1.05 (586) | 0.68 (1154) | 0.66 (1208) | 0.58 (1102) | 0.56 (854) | 0.59 (1300) | 0.55 (1327) |
| 3.5× | 0.99 (526) | 0.61 (1082) | 0.65 (1445) | 0.53 (910) | 0.56 (1051) | 0.61 (1136) | 0.48 (1778) |
| 3.75× | 1.24 (384) | 0.51 (1184) | 0.67 (1174) | 0.60 (1032) | 0.53 (1514) | 0.48 (1395) | 0.49 (1743) |
| 4× | 1.17 (384) | 0.48 (1308) | 0.67 (1372) | 0.63 (992) | 0.51 (1528) | 0.46 (1772) | 0.52 (2002) |
| 4.25× | 0.93 (516) | 0.43 (1518) | 0.75 (1528) | 0.59 (1663) | 0.48 (1792) | 0.48 (1713) | 0.70 (1842) |
| 4.5× | 0.45 (684) | 0.53 (1208) | 0.74 (1568) | 0.57 (1584) | 0.45 (2211) | 0.50 (2128) | 0.89 (1738) |
| 4.75× | 0.49 (706) | 0.56 (1310) | 0.76 (1696) | 0.55 (1834) | 0.45 (2187) | 0.68 (1990) | 0.97 (1928) |
| 5× | 0.47 (930) | 0.55 (1302) | 0.72 (2072) | 0.47 (2228) | 0.50 (2554) | 0.77 (1848) | 1.10 (2004) |

### Micro — orders executed

| stop ÷ target | tp 0.35 % | tp 0.45 % | tp 0.55 % | tp 0.65 % | tp 0.75 % | tp 0.85 % | tp 0.95 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 0.10 (10) | 0.37 (28) | 0.69 (58) | 0.74 (56) | 0.70 (36) | 0.43 (130) | 0.51 (140) |
| 1.25× | 0.06 (14) | 1.08 (64) | 0.54 (56) | 0.58 (84) | 0.36 (109) | 0.59 (235) | 0.34 (192) |
| 1.5× | 0.51 (54) | 1.14 (66) | 0.54 (78) | 0.41 (119) | 0.32 (169) | 0.49 (230) | 0.63 (336) |
| 1.75× | 0.51 (46) | 0.68 (116) | 0.33 (117) | 0.43 (200) | 0.27 (172) | 0.36 (263) | 0.53 (374) |
| 2× | 0.46 (66) | 0.73 (142) | 0.25 (218) | 0.45 (206) | 0.33 (227) | 0.31 (238) | 0.59 (380) |
| 2.25× | 0.43 (110) | 0.35 (168) | 0.31 (217) | 0.50 (193) | 0.28 (241) | 0.50 (199) | 0.62 (267) |
| 2.5× | 0.52 (122) | 0.43 (184) | 0.41 (275) | 0.40 (233) | 0.37 (265) | 0.43 (216) | 0.81 (352) |
| 2.75× | 0.40 (106) | 0.40 (200) | 0.44 (298) | 0.47 (287) | 0.58 (253) | 0.55 (283) | 0.68 (368) |
| 3× | 0.34 (148) | 0.44 (208) | 0.48 (394) | 0.50 (310) | 0.50 (258) | 0.58 (329) | 0.63 (424) |
| 3.25× | 0.24 (120) | 0.46 (229) | 0.63 (411) | 0.63 (296) | 0.68 (282) | 0.51 (345) | 0.47 (372) |
| 3.5× | 0.24 (138) | 0.36 (273) | 1.02 (511) | 0.61 (336) | 0.77 (367) | 0.50 (330) | 0.54 (378) |
| 3.75× | 0.36 (105) | 0.39 (287) | 0.95 (546) | 0.67 (386) | 0.73 (417) | 0.48 (362) | 0.64 (361) |
| 4× | 0.30 (98) | 0.44 (412) | 0.83 (581) | 0.71 (407) | 0.75 (413) | 0.51 (371) | 0.77 (359) |
| 4.25× | 0.32 (104) | 0.61 (497) | 0.98 (655) | 0.62 (473) | 0.55 (408) | 0.57 (364) | 0.83 (335) |
| 4.5× | 0.30 (165) | 0.58 (505) | 0.73 (678) | 0.60 (469) | 0.52 (435) | 0.56 (368) | 0.99 (380) |
| 4.75× | 0.31 (160) | 0.62 (525) | 0.74 (737) | 0.59 (475) | 0.63 (393) | 0.71 (365) | 0.96 (385) |
| 5× | 0.28 (187) | 0.67 (513) | 0.68 (691) | 0.68 (490) | 0.74 (429) | 0.86 (401) | 0.88 (364) |

### Minimal — every config computed

| stop ÷ target | tp 0.8 % | tp 0.9 % | tp 1 % | tp 1.1 % | tp 1.2 % | tp 1.3 % | tp 1.4 % | tp 1.5 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.5× | 0.59 (6137) | 0.58 (6791) | 0.65 (6557) | 0.58 (6044) | 0.57 (9973) | 0.61 (11865) | 0.71 (10311) | 0.73 (11024) | 0.87 (15243) |
| 1.75× | 0.58 (5913) | – | 0.68 (6233) | 0.62 (5640) | 0.68 (9111) | 0.66 (11008) | 0.71 (9875) | 0.79 (10136) | 0.92 (14243) |
| 1.76× | – | 0.62 (6383) | – | – | – | – | – | – | – |
| 2× | 0.63 (5600) | 0.64 (6195) | 0.74 (5885) | 0.68 (5355) | 0.68 (8782) | 0.71 (10046) | 0.73 (9219) | 0.78 (9734) | 1.13 (13098) |
| 2.24× | – | 0.68 (5881) | – | – | – | – | – | – | – |
| 2.25× | 0.65 (5408) | – | 0.76 (5759) | 0.69 (5164) | 0.71 (8200) | 0.68 (9793) | 0.77 (8694) | 0.94 (8967) | 1.27 (12626) |
| 2.5× | 0.68 (5167) | 0.69 (5785) | 0.78 (5567) | 0.67 (5041) | 0.69 (8072) | 0.81 (9143) | 0.89 (8188) | 1.04 (8722) | 1.79 (11832) |
| 2.74× | – | 0.72 (5617) | – | – | – | – | – | – | – |
| 2.75× | 0.69 (5094) | – | 0.76 (5491) | 0.64 (4991) | 0.84 (7556) | 0.86 (8819) | 0.99 (7966) | 1.47 (8074) | 2.28 (11401) |
| 3× | 0.71 (4998) | 0.70 (5499) | 0.73 (5451) | 0.75 (4715) | 0.89 (7376) | 1.06 (8484) | 1.48 (7425) | 1.66 (7825) | 2.71 (11137) |

### Minimal — configs that passed their evaluation

| stop ÷ target | tp 0.8 % | tp 0.9 % | tp 1 % | tp 1.1 % | tp 1.2 % | tp 1.3 % | tp 1.4 % | tp 1.5 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.5× | 0.68 (983) | 0.61 (1439) | 0.75 (1773) | 0.66 (1324) | 0.67 (1234) | 0.75 (1230) | 0.76 (1045) | 0.76 (873) | 0.86 (1231) |
| 1.75× | 0.54 (1299) | – | 0.61 (1366) | 0.63 (1104) | 0.77 (674) | 0.76 (715) | 0.69 (1437) | 0.82 (1218) | 0.78 (1332) |
| 1.76× | – | 0.71 (1510) | – | – | – | – | – | – | – |
| 2× | 0.64 (1462) | 0.61 (1181) | 0.68 (1052) | 0.69 (940) | 0.83 (1254) | 0.82 (1297) | 0.66 (1616) | 0.68 (1609) | 0.72 (1535) |
| 2.24× | – | 0.64 (787) | – | – | – | – | – | – | – |
| 2.25× | 0.61 (1239) | – | 0.73 (921) | 0.67 (1145) | 0.85 (1258) | 0.75 (1582) | 0.63 (1698) | 0.65 (1946) | 0.67 (2014) |
| 2.5× | 0.69 (1346) | 0.60 (817) | 0.74 (1295) | 0.63 (1359) | 0.71 (1529) | 0.59 (1817) | 0.62 (2049) | 0.59 (1782) | 1.03 (1919) |
| 2.74× | – | 0.70 (1037) | – | – | – | – | – | – | – |
| 2.75× | 0.62 (1318) | – | 0.67 (1417) | 0.55 (1539) | 0.55 (1919) | 0.65 (2070) | 0.75 (2225) | 1.04 (1867) | 1.52 (2115) |
| 3× | 0.71 (1718) | 0.71 (1612) | 0.62 (1697) | 0.52 (1654) | 0.56 (1885) | 0.75 (2152) | 1.27 (2057) | 1.23 (2040) | 1.81 (2279) |

### Minimal — orders executed

| stop ÷ target | tp 0.8 % | tp 0.9 % | tp 1 % | tp 1.1 % | tp 1.2 % | tp 1.3 % | tp 1.4 % | tp 1.5 % | tp 1.6 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.5× | 0.26 (207) | 0.61 (402) | 0.42 (440) | 0.39 (304) | 0.53 (313) | 0.55 (341) | 0.52 (376) | 0.72 (254) | 0.77 (356) |
| 1.75× | 0.28 (266) | – | 0.44 (425) | 0.45 (316) | 0.77 (314) | 0.67 (313) | 0.58 (483) | 0.62 (422) | 0.70 (448) |
| 1.76× | – | 0.44 (406) | – | – | – | – | – | – | – |
| 2× | 0.30 (298) | 0.46 (433) | 0.52 (415) | 0.53 (276) | 0.79 (447) | 0.74 (551) | 0.64 (502) | 0.69 (444) | 0.77 (451) |
| 2.24× | – | 0.50 (409) | – | – | – | – | – | – | – |
| 2.25× | 0.39 (304) | – | 0.61 (292) | 0.70 (317) | 0.84 (505) | 0.65 (493) | 0.81 (532) | 0.78 (520) | 0.93 (508) |
| 2.5× | 0.42 (450) | 0.47 (366) | 0.67 (534) | 0.66 (400) | 0.73 (537) | 0.95 (606) | 0.82 (576) | 0.99 (507) | 0.87 (449) |
| 2.74× | – | 0.56 (433) | – | – | – | – | – | – | – |
| 2.75× | 0.45 (431) | – | 0.66 (471) | 0.59 (465) | 0.91 (598) | 0.99 (601) | 1.11 (609) | 1.13 (487) | 1.25 (480) |
| 3× | 0.59 (511) | 0.70 (631) | 0.58 (541) | 0.78 (496) | 0.93 (572) | 1.18 (597) | 1.17 (547) | 1.19 (484) | 1.12 (475) |

### Short — every config computed

| stop ÷ target | tp 2 % | tp 2.2 % | tp 2.4 % |
|---|---:|---:|---:|
| 1× | 0.28 (68) | 0.69 (64) | 0.67 (58) |
| 1.25× | 0.23 (68) | 0.56 (64) | 0.55 (58) |
| 1.5× | 0.20 (68) | 0.74 (56) | 0.98 (48) |
| 1.75× | 0.24 (58) | 1.27 (52) | 0.86 (48) |
| 2× | 0.25 (54) | 1.13 (52) | 0.94 (46) |
| 2.25× | 0.48 (54) | 1.01 (52) | 0.84 (46) |
| 2.5× | 0.43 (54) | 0.92 (52) | 0.76 (46) |

### Short — configs that passed their evaluation

| stop ÷ target | tp 2 % | tp 2.2 % | tp 2.4 % |
|---|---:|---:|---:|
| 1× | – | 0.37 (20) | – |
| 1.25× | – | 0.32 (20) | – |
| 1.5× | – | 1.00 (18) | 0.27 (18) |
| 1.75× | – | – | – |
| 2× | – | – | – |
| 2.25× | 0.38 (28) | – | – |
| 2.5× | 0.40 (40) | – | – |

### Short — orders executed

| stop ÷ target | tp 2 % | tp 2.2 % | tp 2.4 % |
|---|---:|---:|---:|
| 1× | – | 1.02 (28) | 1.17 (16) |
| 1.25× | – | 0.83 (28) | 0.95 (16) |
| 1.5× | – | 0.49 (22) | 0.69 (22) |
| 1.75× | – | 0.91 (20) | 0.67 (20) |
| 2× | – | 0.90 (9) | 1.36 (9) |
| 2.25× | 0.00 (4) | 0.80 (6) | 0.80 (4) |
| 2.5× | 0.00 (6) | 0.00 (2) | 0.72 (4) |

### Wide — every config computed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.02 % | tp 1.08 % | tp 1.2 % | tp 1.57 % | tp 1.62 % | tp 2.11 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.82× | – | – | – | – | – | – | – | – | – | 3.16 (18) | – | – | – | – |
| 0.84× | 0.47 (215) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.54 (209) | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.77 (13447) | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.60 (188) | 0.90 (2474) | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | 0.70 (171) | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | 0.79 (1878) | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.79 (1676) | – | – |
| 1× | – | – | – | 0.53 (7086) | – | – | – | – | 0.91 (972) | – | – | – | 0.88 (663) | 0.98 (552) |
| 1.78× | – | – | – | – | – | – | 0.17 (68) | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | 0.22 (117) | – | – | – | – | – | – | – |

### Wide — configs that passed their evaluation

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.02 % | tp 1.08 % | tp 1.2 % | tp 1.57 % | tp 1.62 % | tp 2.11 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.82× | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.84× | 0.47 (64) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.48 (110) | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.46 (210) | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | – | 0.47 (158) | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | 0.40 (97) | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.82 (66) | – | – |
| 1× | – | – | – | 1.19 (138) | – | – | – | – | 1.77 (30) | – | – | – | – | – |
| 1.78× | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | – | – | – | – | – | – | – | – |

### Wide — orders executed

| stop ÷ target | tp 0.64 % | tp 0.68 % | tp 0.76 % | tp 0.8 % | tp 0.9 % | tp 0.91 % | tp 1.02 % | tp 1.08 % | tp 1.2 % | tp 1.57 % | tp 1.62 % | tp 2.11 % | tp 2.6 % | tp 3.5 % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.82× | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.84× | 0.24 (51) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.87× | – | 0.26 (50) | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.89× | – | – | 0.22 (56) | – | – | – | – | – | – | – | – | – | – | – |
| 0.93× | – | – | – | – | 0.41 (20) | 0.19 (35) | – | – | – | – | – | – | – | – |
| 0.95× | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 0.98× | – | – | – | – | – | – | – | – | – | – | 0.11 (25) | – | – | – |
| 0.99× | – | – | – | – | – | – | – | – | – | – | – | 0.40 (9) | – | – |
| 1× | – | – | – | ∞ (7) | – | – | – | – | ∞ (2) | – | – | – | ∞ (3) | ∞ (2) |
| 1.78× | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| 2× | – | – | – | – | – | – | 0.25 (12) | – | – | – | – | – | – | – |
