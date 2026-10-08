# V0 — the desk as is (signals.normal.slOfTp [3], signals.trailing.slOfTp 3, signals.holdH 48)

Desk `docs/sims/sigstop-2026-10-08/desks/V0.json`, commit 4fd24f6. 30 symbols, 24 h pre-history, 24 h run, focus all,
balance $20, `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`, 4 cores / 16 GB. The two sessions ran one
after the other.

Unit basis: every order at one unit after the 0.20 % round-trip cost; net = Σ trade % (Σ r × 100). *PF incl. open* =
gross profit / gross loss over the closed orders' r plus the open orders' mark r at the end (raw.json `openEnd.mtmR`,
rule "exact": executed by the engine through every gate and cap, marked to market at the last close). Signals are split
by the config id's stop: `tr>0` = trailing, `tr0` = fixed. The PF closed column matches the report's per-range "PF unit".

## w-latest — 2026-10-07T00:00 → 2026-10-08T00:00 UTC (the latest 24 h, a falling market)

`checks: 55/55 ok` · wall time 1,504 s (session runSeconds 1,458) · book: $20.00 → $19.65 closed, equity at the end $15.78

| range | orders closed | PF closed | open at end | PF open (mark) | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|---|
| **Total** | 10,208 | 0.77 | 8,778 | 0.10 | **0.40** | −4,343.5 % | −26,532.8 % |
| Micro | 87 | 0.37 | 5 | 0.00 | 0.37 | −33.8 % | −33.9 % |
| Short | 3,825 | 0.46 | 672 | 0.05 | 0.39 | −3,610.5 % | −4,826.3 % |
| General | 363 | 0.65 | 56 | 0.18 | 0.61 | −246.0 % | −295.3 % |
| Long | 267 | 0.56 | 118 | 0.28 | 0.51 | −337.0 % | −461.6 % |
| Wide (axis) | 104 | 0.39 | 0 | – | 0.39 | −48.4 % | −48.4 % |
| **Signals** | 5,562 | 0.99 | 7,927 | 0.11 | **0.39** | −67.8 % | −20,867.4 % |
| Signals trailing (tr>0) | 4,286 | 1.08 | 5,998 | 0.11 | 0.39 | +559.4 % | −15,504.8 % |
| Signals fixed (tr0) | 1,276 | 0.82 | 1,929 | 0.10 | 0.39 | −627.2 % | −5,362.6 % |

## w-rally — 2026-10-05T15:00 → 2026-10-06T15:00 UTC (the 6 Oct rally window)

`checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` (the session exits 1 on it) · wall time
815 s (session runSeconds 799) · book: $20.00 → $28.52 closed, equity at the end $27.25

The failed check: Wide (axis) executed no order in this window. The report's skip line for Wide: lastN 345 ·
engineSide 256 · symPf 69 (670 skips). Every axis candidate was gated out, so nothing crashed. The other 54 checks
pass.

| range | orders closed | PF closed | open at end | PF open (mark) | PF incl. open | net closed | net incl. open |
|---|---|---|---|---|---|---|---|
| **Total** | 8,766 | 5.31 | 4,355 | 0.65 | **2.78** | +19,760.7 % | +17,839.2 % |
| Micro | 108 | 0.50 | 6 | 0.00 | 0.49 | −25.7 % | −27.1 % |
| Short | 1,324 | 2.71 | 325 | 2.07 | 2.66 | +1,729.2 % | +1,818.4 % |
| General | 508 | 2.13 | 136 | 7.36 | 2.39 | +626.0 % | +811.7 % |
| Long | 590 | 2.40 | 387 | 10.44 | 3.09 | +1,181.2 % | +1,927.9 % |
| Wide (axis) | 0 | – | 0 | – | – | 0 | 0 |
| **Signals** | 6,236 | 8.66 | 3,501 | 0.44 | **2.81** | +16,250.0 % | +13,308.3 % |
| Signals trailing (tr>0) | 4,830 | 9.79 | 2,652 | 0.47 | 2.91 | +12,360.2 % | +10,264.3 % |
| Signals fixed (tr0) | 1,406 | 6.44 | 849 | 0.33 | 2.54 | +3,889.8 % | +3,044.0 % |

## Reading

- In both windows the signals' open orders mark far below the closed ones (PF 0.11 / 0.44 open against 0.99 / 8.66
  closed), the pattern the variants are meant to address. In the falling window they turn Signals' −68 % closed into
  −20,867 % with the open orders. In the rally they still leave Signals at PF 2.81 including the open orders.
- In both windows, trailing signals beat fixed ones on closed orders (1.08 vs 0.82; 9.79 vs 6.44). Including the
  open orders the two are close (0.39 vs 0.39; 2.91 vs 2.54).
- V0 is the baseline for V1–V3 (same windows, same flags).
