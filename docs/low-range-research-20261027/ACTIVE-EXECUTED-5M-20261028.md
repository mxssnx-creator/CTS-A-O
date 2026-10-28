# Active validated configs vs executed 5m model results

This is a same-feed offline replay, not exchange fill evidence. The line-by-line CSV contains every config in the initial Active validated set and its exact-ID closed model results. Open-at-end positions are excluded from PF and counted separately (0 in this run). PF is gross positive return divided by absolute gross negative return on per-unit model returns after modeled costs.

- Feed/window: 20 symbols, 5m lane, 2026-10-19 00:00–2026-10-20 00:00 UTC; 12h prehistory; Low-Range max hold 60m; 0.15% modeled round-trip cost.
- Seat rule: `validated`; the initial Active set V has 15,212 configs and 869,377 validation closes; its pooled config-evaluation PF is 5.2712.
- Executed: 14,503 of 15,212 Active configs generated 206,189 closed modeled orders; every executed config ID is in V (0 outside V). PF 0.4357; net -341.6617 units; wins/losses 84,127/122,062; average hold 56.54m.
- No exchange fills were read in this replay; Mirror to Live / Exchange PF must be read from the live ledger separately.

| Strategy | Active configs | Active validation closes | Active validation PF | Executed configs | Executed closes | Executed PF | Net units | Win rate | Avg hold | TP | SL | Trail | Time |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 3,117 | 181,557 | 5.1586 | 3,027 | 44,006 | 0.4272 | -78.7199 | 40.31% | 56.47m | 3,796 | 1,939 | 0 | 38,271 |
| trailing | 6,987 | 394,130 | 4.9051 | 6,643 | 92,334 | 0.4402 | -149.6109 | 40.52% | 56.31m | 5,589 | 3,165 | 4,384 | 79,196 |
| trailing-only | 5,108 | 293,690 | 5.8099 | 4,833 | 69,849 | 0.4354 | -113.3309 | 41.49% | 56.89m | 0 | 2,924 | 5,876 | 61,049 |
| **All strategies** | **15,212** | **869,377** | **5.2712** | **14,503** | **206,189** | **0.4357** | **-341.6617** | **40.80%** | **56.54m** | **9,385** | **8,028** | **10,260** | **178,516** |

## Same-feed Low-Range hold-cap comparison

Each row reruns Base evaluation, initial config validation, and execution with the same 20-symbol feed and 12h prehistory; changing the cap changes the admitted set as well as exit timing. PF is the one-unit modeled return PF from closed execution orders.

| Max hold | Base PF | Active validation PF | Active configs | Executed PF | Executed closes | Time exits | Normal PF | Trailing PF | Trailing-only PF |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 15m | 2.74 | 4.24 | 10,898 | 0.0114 | 42,469 | 41,568 (97.9%) | 0.0222 | 0.0153 | 0.0000 |
| 30m | 4.36 | 6.06 | 9,791 | 0.0706 | 52,058 | 44,081 (84.7%) | 0.0825 | 0.0899 | 0.0287 |
| **60m** | **5.70** | **5.27** | **15,212** | **0.4357** | **206,189** | **178,516 (86.6%)** | **0.4272** | **0.4402** | **0.4354** |
| 180m | 3.24 | 4.57 | 10,439 | 0.2706 | 129,337 | 73,487 (56.8%) | 0.3079 | 0.2933 | 0.2309 |

The 60m cap is the best of these four tested caps and is now the Low-Range default. It still has PF below 1, so it is not a profitable or stability guarantee. Micro was disabled throughout; its separate 15m setting did not affect these 5m results.

## Interpretation

The high Active PF is a historical validation measure; the much lower Executed PF is the forward-window result for those same IDs. This replay does not support calling the forward PF high. The validated-seat fix prevents configs outside V from being seated, but it cannot make a validated config retain its validation PF after the market sample changes. The time-cap comparison shows the 60m cap performs best among the tested choices, while time exits still dominate and leave the executed PF below 1.

## Line-by-line inventory

See [active-executed-5m-60m-20261028.csv](active-executed-5m-60m-20261028.csv) for one row per each of the 15,212 exact 5m Active config IDs, with Active validation and Executed model close counts, PF, net, win rate, average hold and exit-reason counts.

See [active-executed-5m-orders-60m-20261028.csv.gz](active-executed-5m-orders-60m-20261028.csv.gz) for all 206,189 individual model closes, one row per close, including the exact config ID, symbol, direction, timestamps, prices, net unit return after modeled cost, hold duration, exit reason, and that config's Active validation PF. Re-aggregating those rows gives PF 0.4356558717, net -341.6616916 units, and average hold 56.5405m; every row's config ID exists in the Active config inventory.
