# Post-Base loss drawdown and stop-grid comparison

12 symbols; 16 October 2026 21:00–17 October 2026 09:00 UTC (23:00–11:00 Vienna). Twelve hours of evaluated history plus 24 hours of indicator warmup; minute pricing and entry/exit calculations. Retrospective cached BingX experiment, not an unseen profitability test.

**These are funded modeled orders from the Base-qualified, subsequently validated execution path, not unfiltered pre-Base returns.** Historical qualification and future execution are different samples. A passing historical PF does not mathematically guarantee a profitable next order or hour. The independent entry audit checks saved own-direction historical PF/Last-N at each settled order’s entry, but does not reconstruct unexported exact Base-cell metadata.

Equity = initial equity + realized net P&L + open-position net P&L. Margin is reported separately and is not subtracted from equity. Peak drawdown = largest (prior equity peak − current equity) / prior peak. Loss below initial = max(0, initial − lowest equity) / initial. Both include losses and open P&L. Negative modeled equity is retained; a real account could not continue through ruin.

All rows include their independent Exit cohort. Do not sum separate portfolios. Initial equity $10, unchanged 0.2% sizing and 10× leverage, no account exposure caps. Only the ordinary configured stop-ratio ladder changes. TP, trailing choices, fees, PF gates, Last-N and Exit are unchanged. Fewer configured stops also change admissions, order counts and exposure; drawdown reduction cannot be attributed solely to a per-order improvement.

A configured ratio ceiling is not a universal realized-loss bound: lane scaling, mandatory minimum stops, price rounding and gaps remain. Actual executed configuration ratios are disclosed below. Trailing-only has no TP and is excluded from SL/TP ratios.

| Arm | Positions opened / held | Orders opened / settled / held | PF | Lowest equity $ | Loss below initial % | Peak equity DD % | End equity $ | Green / red / flat hours | Compute s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| wide baseline | 50 / 22 | 11827 / 4616 / 7211 | 0.592 | 8.66724 | 13.33 | 15.04 | 9.36159 | 7 / 5 / 0 | 61.5 |
| short baseline | 43 / 20 | 185881 / 46215 / 139666 | 2.016 | -17.29429 | 272.94 | 231.95 | 4.17431 | 7 / 4 / 1 | 694.2 |
| wide-cap1 | 49 / 16 | 1328 / 591 / 737 | 0.280 | 9.85385 | 1.46 | 1.49 | 9.92838 | 5 / 7 / 0 | 16.8 |
| wide-cap05 | 49 / 14 | 714 / 483 / 231 | 0.132 | 9.93730 | 0.63 | 0.65 | 9.95116 | 3 / 9 / 0 | 14.2 |
| short-cap1 | 48 / 13 | 5498 / 1452 / 4046 | 0.663 | 9.20474 | 7.95 | 8.22 | 9.74292 | 7 / 4 / 1 | 68.8 |
| short-cap125 | 48 / 18 | 21001 / 5818 / 15183 | 0.984 | 7.14613 | 28.54 | 30.98 | 9.40901 | 6 / 5 / 1 | 177.1 |
| short-cap15 | 48 / 18 | 47954 / 12378 / 35576 | 1.391 | 3.37847 | 66.22 | 68.97 | 8.87215 | 7 / 4 / 1 | 313.3 |

## Protection and audit evidence

| Arm / range | Max configured executed SL % | Max executed SL/TP | Min nonzero trailing % | Native checks | Entry failures / tested closes | Hourly discrepancies / decisions |
|---|---:|---:|---:|---:|---:|---:|
| wide baseline / Wide | 5.790 | 1.9829 | 0.500 | 56/56 | prior report | prior report |
| short baseline / Short | 7.000 | 2.5000 | 0.450 | 58/58 | prior report | prior report |
| wide-cap1 / Wide | 2.930 | 1.0337 | 0.500 | 56/56 | 0 / 591 | 0 / 26664 |
| wide-cap05 / Wide | 1.520 | 0.7079 | 0.500 | 56/56 | 0 / 483 | 0 / 19752 |
| short-cap1 / Short | 2.800 | 1.0000 | 0.450 | 58/58 | 0 / 1452 | 0 / 133176 |
| short-cap125 / Short | 3.500 | 1.2500 | 0.450 | 58/58 | 0 / 5818 | 0 / 422376 |
| short-cap15 / Short | 4.200 | 1.5000 | 0.450 | 58/58 | 0 / 12378 | 0 / 827880 |

## Fix and current decision

Large Micro/Minimal simulations completed calculation but failed export because their selected-config metadata records exceeded the 8 MiB chunk limit (17,455,990 / 13,541,750 bytes). Validation sidecar v2 streams selected identities individually, preserving order, duplicates, all gate checks, bounded chunks and checksums. The reader retains v1 compatibility. Original failure tails are retained here.

No candidate is promoted merely because drawdown falls. Require preserved post-Base execution PF above 1, sufficient own samples, acceptable loss drawdown, and later chronological validation. Completed 1×/0.5× Wide and 1× Short candidates fail the PF requirement. Production strategy defaults are unchanged.

Only arms with completed details and audits are certified above; remaining Short experiments and the separate Micro/Minimal/General/Long matrix are pending until independently audited. Minimal Plus still has no selected ordinary cells. Signals retain their own 150h policy and independent Exit; this ordinary-range experiment does not certify new Signal profitability.

Checks: 44 sidecar/consumer tests; 41 funded-cohort/native-report tests; margin-versus-loss replay regression; 13 trailing/readiness tests; build and TypeScript. This is not a claim of full-system stability or live profitability.

## Separate exposure-capped replay of Short 1.5×

Same native candidate orders, with maximum funded notional 0.5× realized balance per symbol/direction and 2× overall. This is an alternative funding profile, not a new market simulation or a stop-only gain. 46 positions opened / 15 held; 15194 orders opened / 3508 settled / 11686 held.

Return PF **1.162964**; peak equity DD **2.725%**; lowest equity **$9.741976**; loss below initial **2.580%**; ending equity **$9.916556**. Positive/negative/flat hours: 5/6/1. Sized-dollar PF diagnostic **0.412972**. Different allocations and held losses mean return PF above 1 does not establish a dollar profit.

All funded closed orders are an exact-return subset of the independently entry-audited native cohort; all 58 report checks pass. Native minimum order sizes and liquidation mechanics are not certified by this replay. No production promotion or positive-stability claim.
