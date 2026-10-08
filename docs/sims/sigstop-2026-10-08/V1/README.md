# V1: signal stop variant (code default)

The desk is `docs/sims/sigstop-2026-10-08/desks/V1.json`. Signal Normal stops are 1.5 / 2 / 3× the target, and each
config is evaluated and seated on its own. Signal Trailing stops are 3×, and hold is 48 h. Both sessions ran on branch
`claude/sim3h-fixes` at 4fd24f6, one after the other, with 30 symbols, 24 h pre + 24 h run, focus all, balance $20,
3 workers, and `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0`. These are simulations only: no live trading and no orders.

How the tables are built (computed from `raw.json`):
- Each order counts as one unit. Net is Σ trade % (r × 100) and PF is gross profit ÷ gross loss. The closed PF matches the report's "PF unit".
- The open orders at the end are `raw.openEnd`. They are exact: the engine executed them through every gate and cap, then marked them to market at the last close.
- "PF incl. open" and "net incl. open" add each open order's mark r to the closed orders.
- The range comes from the config id (Axis has no range tag, so it shows under Wide, as in the report).
- The Signals rows are split by stop type (`tr>0` is trailing, `tr0` is fixed). The stop ratio is `sl ÷ tp` from the config id.

## w-latest: 7 Oct 00:00Z → 8 Oct 00:00Z (the latest 24 h, a falling market)

Checks: `checks: 55/55 ok`. Wall time is 1,270 s (21 min). The report's runSeconds is 1,228.

| group | orders closed | PF closed | open at end | PF incl. open | net closed % | net incl. open % |
|---|---:|---:|---:|---:|---:|---:|
| Total | 10,465 | 0.54 | 7,969 | 0.34 | -11,492 | -30,687 |
| Micro | 87 | 0.37 | 5 | 0.37 | -34 | -34 |
| Short | 3,826 | 0.46 | 672 | 0.39 | -3,609 | -4,825 |
| General | 363 | 0.65 | 56 | 0.61 | -246 | -295 |
| Long | 267 | 0.56 | 118 | 0.51 | -337 | -462 |
| Wide | 104 | 0.39 | 0 | 0.39 | -48 | -48 |
| Signals | 5,818 | 0.57 | 7,118 | 0.32 | -7,218 | -25,023 |
| Signals trailing | 2,734 | 0.76 | 3,771 | 0.31 | -1,422 | -12,776 |
| Signals fixed | 3,084 | 0.46 | 3,347 | 0.33 | -5,796 | -12,247 |
| Signals fixed sl/tp 1.5 | 1,250 | 0.42 | 974 | 0.37 | -2,339 | -3,490 |
| Signals fixed sl/tp 2 | 1,048 | 0.43 | 1,093 | 0.34 | -2,206 | -4,047 |
| Signals fixed sl/tp 3 | 786 | 0.56 | 1,280 | 0.30 | -1,251 | -4,710 |
| Signals trailing sl/tp 3 | 2,734 | 0.76 | 3,771 | 0.31 | -1,422 | -12,776 |

## w-rally: 5 Oct 15:00Z → 6 Oct 15:00Z (the 6 Oct rally window of v3b)

Checks: `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders`. Axis traded nothing in this window, which is why Wide shows 0. The run exits with code 1 because of that check. Wall time is 1,023 s (17 min). The report's runSeconds is 999.

| group | orders closed | PF closed | open at end | PF incl. open | net closed % | net incl. open % |
|---|---:|---:|---:|---:|---:|---:|
| Total | 11,110 | 4.21 | 5,548 | 2.55 | +23,764 | +21,440 |
| Micro | 108 | 0.50 | 6 | 0.49 | -26 | -27 |
| Short | 1,324 | 2.71 | 325 | 2.66 | +1,729 | +1,818 |
| General | 508 | 2.13 | 136 | 2.39 | +626 | +812 |
| Long | 590 | 2.40 | 387 | 3.09 | +1,181 | +1,928 |
| Wide | 0 | – | 0 | – | +0 | +0 |
| Signals | 8,580 | 5.10 | 4,694 | 2.51 | +20,254 | +16,909 |
| Signals trailing | 4,341 | 9.76 | 2,452 | 2.91 | +11,188 | +9,305 |
| Signals fixed | 4,239 | 3.47 | 2,242 | 2.21 | +9,065 | +7,604 |
| Signals fixed sl/tp 1.5 | 1,592 | 2.31 | 715 | 1.91 | +2,457 | +2,254 |
| Signals fixed sl/tp 2 | 1,385 | 3.81 | 754 | 2.31 | +3,130 | +2,627 |
| Signals fixed sl/tp 3 | 1,262 | 6.13 | 773 | 2.50 | +3,479 | +2,724 |
| Signals trailing sl/tp 3 | 4,341 | 9.76 | 2,452 | 2.91 | +11,188 | +9,305 |

## Reading

- **Falling market (w-latest):** Signals lose with or without the open orders: PF 0.57 on closed orders and 0.32 with the open ones included. That is 7,118 open orders against 5,818 closed. Trailing (3×) has the best closed PF at 0.76, but it ends with the most open orders (3,771) and its PF with the open orders included is 0.31. Among the fixed stops, the closed PF rises with the stop (1.5× 0.42, 2× 0.43, 3× 0.56), and the PF with the open orders included falls with the stop (0.37, 0.34, 0.30). The wider stop wins on closed orders only because its losers are still open.
- **Rally (w-rally):** Signals have a closed PF of 5.10 and a PF of 2.51 with the open orders included. Trailing 3× gives 9.76 closed and 2.91 with the open orders. Fixed stops give 1.5× 2.31 / 1.91, 2× 3.81 / 2.31 and 3× 6.13 / 2.50. In this window the wider stop leads on both measures, but the gap narrows by about half or more once the open orders are included.
- Taking both windows together, the open orders at the end take back most of the closed-order edge of the wide (3×) stops. V0 / V2 / V3 give the comparison on the same windows.
