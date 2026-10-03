# Minimum hourly success (`gates.minGreen`) — sweep (October 2026)

The fixed selection (the default, and x01's) already favours configs that are green most hours:
- A config's **hourly success** is the share of its exit-hours in the window whose summed result is positive.
- Its seat score is `lcb × (0.5 + hourly success)`.
- A config below the minimum hourly success does not run at all.

The minimum was fixed at 0.5. It is now `gates.minGreen`, with the default unchanged at 0.5.

## Sweep

**Setup**
- Same 24 h window (ending 2026-10-02 23:00 UTC) and 12 symbols as the final all-on simulation.
- x01's strategy settings: Normal only when Block raises it, Trailing, Block at most 4× per source, DCA one add, Axis (rungs 1.5×), signals; micro off.
- Every config on its own seat.
- Replayed with fixed $5 units on $1,000.
- All runs pass 38 / 38 checks.

| min. hourly success | orders | PF | net | win rate | max equity DD | DDR | DDT |
|---|---:|---:|---:|---:|---:|---:|---:|
| **0.5 (default)** | 27,275 | **1.66** | **+$7,526** | 61.8 % | 42.3 % | **0.24** | 6.0 h |
| 0.6 | 17,146 | 1.54 | +$3,873 | 61.6 % | 46.9 % | 0.49 | 6.0 h |
| 0.7 | 5,740 | 1.56 | +$1,337 | 65.1 % | 53.3 % | 0.75 | 8.3 h |
| 0.8 | 1,850 | 1.52 | +$431 | 72.5 % | 36.1 % | 1.22 | 8.5 h |

A stricter minimum raises the win rate but keeps configs with many small wins and few large losses. PF falls,
the drawdown ratio grows fivefold, and the orders and the net shrink with it.

By type at 0.7:
- Signals improve: PF 1.90 → 2.19.
- DCA turns negative: PF 1.36 → 0.91.
- Normal and Trailing stay about the same, but with a fifth of the orders.

At 0.5 the run matches the final all-on simulation exactly: 27,275 orders, PF 1.66. That run had micro on, but no
micro cell traded.

**Result:** keep 0.5. The best configs by hourly success already lead through the score; requiring more hourly
success only removes good configs.
