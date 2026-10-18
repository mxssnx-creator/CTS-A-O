# 12-symbol Exit strategy replay — hourly consistency gate

## Protocol

Frozen offline replay using 12 USDT symbols (ADA, APT, ARB, ATOM, AVAX, BCH, BNB, BTC, DOGE, DOT, ETC, ETH), 168 hours of prehistory, then 24 hours from 2026-10-16 21:00 to 2026-10-17 21:00 UTC. Engine configuration selection was causal and the compared runs used the same feed, focus set (97 pairs), modeled cost (0.15% round trip), starting balance ($10), sizing (0.1% of balance per unit), leverage (10×), and default strategy toggles except the Exit-off control. Orders were simulated only.

Frozen feed SHA-256: `c526912a3e11762dff41759e5c737f298f6bd331e3198f1a06e880a20e48cdc9`.

The updated Exit candidate gate requires at least half of active UTC exit hours to be profitable in its later prehistory holdout, when that holdout contains at least six active hours. Sparse validation still uses the existing trade-count, PF, net-return, and drawdown gates.

## Results

| Run | Exit orders | Exit PF | Exit net | Total orders | Total PF | Closed net | End marked equity | Max equity DD | Green / red / flat hours |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Exit enabled (before hour gate) | 186 | 2.34 | $0.048 | 3023 | 1.73 | $0.224 | $9.806 | $0.635 (6.09%) | 11 / 10 / 3 |
| Exit disabled | 0 | — | — | 2837 | 1.68 | $0.247 | $10.043 | $0.412 (3.94%) | 9 / 10 / 5 |
| Exit enabled (hour gate ≥50%) | 185 | 2.33 | $0.047 | 3022 | 1.73 | $0.223 | $9.811 | $0.625 (6.00%) | 11 / 10 / 3 |

With the old Exit gate, Exit added 186 orders at PF 2.34 and the total account had two more green hours than the Exit-off control (11 vs 9). The hourly consistency gate removed one Exit order in this sample; total PF, net, ending marked equity, and hourly colors remained essentially unchanged. This verifies the gate path but does not show a meaningful gain from it on this single window. The red hours and the largest equity drawdown remain, so the replay does not establish an every-hour strategy.

The Exit-off control finished with more closed net but lower PF and fewer green hours. Exit-enabled runs carried more open marked losses at the cutoff, so closed balance and ending equity differ. No claim is made that the historical window predicts future results.

## Hourly settled P&L

Dollars settled during each UTC hour; positive values are green. Values are rounded to $0.001.

| UTC hour | Exit before gate | Exit off | Exit with 50% gate |
|---|---:|---:|---:|
| 21:00 | $0.000 | $0.000 | $0.000 |
| 22:00 | $0.000 | $0.000 | $0.000 |
| 23:00 | -$0.000 | $0.000 | -$0.000 |
| 00:00 | -$0.000 | -$0.000 | -$0.000 |
| 01:00 | $0.000 | $0.000 | $0.000 |
| 02:00 | $0.000 | $0.000 | $0.000 |
| 03:00 | $0.051 | $0.059 | $0.051 |
| 04:00 | $0.426 | $0.485 | $0.426 |
| 05:00 | $0.040 | $0.045 | $0.040 |
| 06:00 | $0.000 | $0.000 | $0.000 |
| 07:00 | -$0.010 | -$0.011 | -$0.010 |
| 08:00 | $0.000 | $0.000 | $0.000 |
| 09:00 | -$0.253 | -$0.256 | -$0.253 |
| 10:00 | -$0.008 | -$0.006 | -$0.008 |
| 11:00 | -$0.004 | -$0.001 | -$0.004 |
| 12:00 | -$0.045 | -$0.038 | -$0.045 |
| 13:00 | -$0.015 | -$0.015 | -$0.015 |
| 14:00 | $0.008 | $0.003 | $0.008 |
| 15:00 | $0.011 | $0.003 | $0.011 |
| 16:00 | $0.005 | -$0.022 | $0.005 |
| 17:00 | $0.038 | $0.018 | $0.038 |
| 18:00 | $0.074 | $0.067 | $0.074 |
| 19:00 | -$0.079 | -$0.077 | -$0.079 |
| 20:00 | -$0.016 | -$0.007 | -$0.016 |

Checks: all three session runs completed with 66/66 replay consistency checks. Source artifacts include the full session JSON and HTML for each run in the workspace session directory.
