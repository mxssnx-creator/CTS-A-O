# Last-N, stage, cost, and execution audit — 28 October 2026

This report separates Base candidate screening, initial validated Active IDs (V), runtime direction and entry gates, and modeled forward closes. “Executed” in these cached-feed screens means the model admitted and closed an order; it does not mean an exchange fill. Mirror-to-Live and venue fills remain separate. The 3,900-cell short-to-medium screen is retrospective, reuses previously examined Binance USD-M minute data, and is not an untouched holdout or production result.

## Diagnosis

- The 5m Active-to-forward PF collapse is not caused by low-PF config IDs leaking into execution: all 14,503 model-executed config IDs are in the 15,212-ID initial Active set. The same Active cohort goes from historical PF 5.2712 to forward PF 0.4357 across 206,189 modeled closes.
- The dominant 5m exit is the 60-minute time cap: 178,516 closes (86.6%) with PF 0.3434 and net −338.90 model units. 60 minutes was the best of tested 15/30/60/180-minute caps, but PF remains below 1; 180 minutes was worse at 0.2706. The cap explains much of the loss but is not the only cause.
- The position-return ledger deducts the modeled 0.15% round-trip cost once. Reconstructed side-aware price return differs by at most 1.07×10⁻⁷ per row. With fees set to zero, the same cohort still has PF 0.9274 and net −32.38. Costs magnify an already negative gross edge; cost accounting alone does not explain the drop.
- In the short-range screen, default gates admit 27 exact Active config IDs and 23 produce forward closes; none of the executed IDs is outside V. Historical validated-direction PF is 2.9046; those same IDs produce 80 forward closes at PF 0.683.

## Base Last-N sensitivity

Counterfactual Base Last-N was applied after the existing aggregate Base gate. N=0 means this additional Base Last-N is off. Validation N=15 and range N=75 stay fixed.

| Last-N | Base pass | Active IDs (removed/added vs control) | Executed IDs | Forward pass/candidates | Settled (W/L) | GP/GL | PF | Normal PF | Trailing PF | Range rejects |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |
| 5 | 26/3,900 | 20 (7−/0+) | 20 | 75/628 | 75 (28/47) | 0.1237/0.1571 | 0.787 | 0.715 | 0.926 | 0 |
| 15 | 35/3,900 | 21 (6−/0+) | 17 | 71/672 | 71 (27/44) | 0.1127/0.1591 | 0.708 | 0.737 | 0.660 | 0 |
| 50 | 45/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |
| 100 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |
| 200 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |

Base N=5 and N=15 remove Base-passing cells and Active IDs; N=50 removes two Base cells but leaves all 27 V IDs unchanged. N=100 and N=200 make no decision changes on this sample. None of these Base Last-N settings yields aggregate forward PF ≥1.

## Validation Last-N sensitivity

Base Last-N is off and range Last-N stays at 75. Validation N uses the runtime `validLastN` path.

| Last-N | Base pass | Active IDs (removed/added vs control) | Executed IDs | Forward pass/candidates | Settled (W/L) | GP/GL | PF | Normal PF | Trailing PF | Range rejects |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 47/3,900 | 19 (8−/0+) | 17 | 68/537 | 68 (27/41) | 0.1269/0.1295 | 0.980 | 0.898 | 1.134 | 0 |
| 15 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |
| 50 | 47/3,900 | 27 (0−/0+) | 23 | 106/864 | 106 (43/63) | 0.1773/0.2367 | 0.749 | 0.678 | 0.924 | 8 |
| 100 | 47/3,900 | 27 (0−/0+) | 23 | 106/864 | 106 (43/63) | 0.1773/0.2367 | 0.749 | 0.678 | 0.924 | 8 |
| 200 | 47/3,900 | 27 (0−/0+) | 23 | 106/864 | 106 (43/63) | 0.1773/0.2367 | 0.749 | 0.678 | 0.924 | 8 |

N=5 retains 19 of the baseline 27 Active IDs and 17 generate closes; PF is 0.980, still below 1. N=15 has 27 Active IDs, 23 executed IDs and PF 0.683. N=50/100/200 admit 106 closes at PF 0.749; they keep the same 27 Active IDs but change forward entry eligibility. Increasing N changes the sample and results, but does not stabilize aggregate PF.

## Range-gate Last-N sensitivity

The range gate stays enabled (`minPf=1.35`, floor 5, warm-up on). “Range rejects” counts candidate entries whose first failed gate was range Last-N.

### Validation N=15

| Last-N | Base pass | Active IDs (removed/added vs control) | Executed IDs | Forward pass/candidates | Settled (W/L) | GP/GL | PF | Normal PF | Trailing PF | Range rejects |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 47/3,900 | 22 (5−/0+) | 18 | 56/656 | 56 (21/35) | 0.1023/0.1152 | 0.889 | 0.826 | 1.010 | 56 |
| 50 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |
| 75 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |
| 150 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |
| 250 | 47/3,900 | 27 (0−/0+) | 23 | 80/864 | 80 (30/50) | 0.1258/0.1841 | 0.683 | 0.618 | 0.810 | 0 |

At N=5, the range gate rejects 56 first-failure candidates, reduces V from 27 to 22 IDs, and produces 56 closes at PF 0.889. At N=50/75/150/250 it rejects zero candidates in this validation-N=15 path and the results are identical. The gate is enabled but non-binding at those N values in this sample.

### Validation N=200

| Last-N | Base pass | Active IDs (removed/added vs control) | Executed IDs | Forward pass/candidates | Settled (W/L) | GP/GL | PF | Normal PF | Trailing PF | Range rejects |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 47/3,900 | 22 (5−/0+) | 18 | 72/656 | 72 (28/44) | 0.1279/0.1449 | 0.883 | 0.760 | 1.157 | 96 |
| 50 | 47/3,900 | 27 (0−/0+) | 23 | 106/864 | 106 (43/63) | 0.1773/0.2367 | 0.749 | 0.678 | 0.924 | 8 |
| 75 | 47/3,900 | 27 (0−/0+) | 23 | 106/864 | 106 (43/63) | 0.1773/0.2367 | 0.749 | 0.678 | 0.924 | 8 |
| 150 | 47/3,900 | 27 (0−/0+) | 23 | 106/864 | 106 (43/63) | 0.1773/0.2367 | 0.749 | 0.678 | 0.924 | 8 |
| 250 | 47/3,900 | 27 (0−/0+) | 23 | 106/864 | 106 (43/63) | 0.1773/0.2367 | 0.749 | 0.678 | 0.924 | 8 |

At range N=5, 96 candidate entries fail the range gate first and the screen produces 72 closes at PF 0.883. At range N=50/75/150/250, eight candidate entries fail that gate first and outputs are identical: 106 closes at PF 0.749. This confirms the gate is active and explains why changing 75 to 50/150/250 does not change this sample.

## Forward first-failure attribution

Default path (Base N off, validation N=15, range N=75): 864 potential forward entries were checked; 80 passed and 784 were rejected. Each candidate is counted once at its first failed check.

| First failed check | Count |
|---|---:|
| net | 361 |
| closes | 186 |
| lcb | 91 |
| lastN | 76 |
| green | 52 |
| pf | 18 |

The default path has zero range-gate first failures. With validation N=200 and range N=75, eight are range-gate failures. All 21 arms enforce initial V membership before forward entry evaluation; executed IDs remain a subset of exact Active IDs. The detailed CSV lists each config ID, Base pass, direction verdict, forward first-failure counts, settled count, GP/GL and PF.

## 5m cost and exit audit

The cost sweep adds back the original modeled 0.15% fee to each stored net return and applies the listed cost once.

| Round-trip cost | Closes | Net model units | PF |
|---:|---:|---:|---:|
| 0.00% | 206,189 | -32.38 | 0.9274 |
| 0.15% | 206,189 | -341.66 | 0.4357 |
| 0.30% | 206,189 | -650.95 | 0.1967 |
| 0.50% | 206,189 | -1063.32 | 0.0692 |

| Exit reason | Closes | Share | Average hold | Net after 0.15% | PF after 0.15% |
|---|---:|---:|---:|---:|---:|
| sl | 8,028 | 3.9% | 30.14m | -84.25 | 0.0000 |
| time | 178,516 | 86.6% | 60.00m | -338.90 | 0.3434 |
| tp | 9,385 | 4.6% | 35.38m | 66.86 | no-loss |
| trail | 10,260 | 5.0% | 36.37m | 14.64 | 3.9070 |

Normal / trailing / trailing-only at modeled 0.15% are respectively 44,006 closes / PF 0.4272; 92,334 / PF 0.4402; and 69,849 / PF 0.4354. See the [config inventory](ACTIVE-EXECUTED-5M-20261028.md) and [individual close ledger](active-executed-5m-orders-60m-20261028.csv.gz).

## Scope and artifacts

- Cached 20-symbol Binance USD-M minute data; evaluation and forward windows overlap prior research; no independent holdout, exchange fills, or live-account result is claimed.
- The short-range screen separates Normal and Trailing; the 5m reproduction separately includes Normal, trailing and trailing-only.
- [Per-config, per-direction sensitivity rows](lastn-cost-sensitivity-20261028.csv.gz) contain Base, validation, gate and forward metrics. [Per-strategy and per-timeframe summaries](lastn-cost-sensitivity-summary-20261028.csv) preserve full-precision counts and PF.
- Order-level source: [206,189 modeled 5m closes](active-executed-5m-orders-60m-20261028.csv.gz).
- Reproduce with `node --experimental-strip-types --no-warnings scripts/low-range-short-24h-research.mjs <fresh-output-dir> --window-screen`, adding `--base-last-n=N`, `--valid-last-n=N`, and/or `--range-last-n=N`. Outputs record feed/source/test/runner hashes and ledger SHA-256.
