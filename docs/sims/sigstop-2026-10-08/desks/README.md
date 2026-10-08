# Signal stop / hold variants (8 Oct)

The x01 desk of 7 Oct ~23:45 (signals, vol factor 1, trailing-stop signals live) with one signal setting changed per
variant. The desks' simulated runs show signals at PF ~1.7 on closed orders while ~7,000 orders are still open at the
end at PF ~0.3 (winners reach the target fast, losers sit open between stops at 3× the target for up to 48 h). The
variants are judged on PF including the open orders marked at the end, in two windows (the latest 24 h and the
6 Oct rally), per docs/positive-coordinations.md (a setting changes only on a causal comparison that beats it).

| variant | signals.normal.slOfTp | signals.trailing.slOfTp | signals.holdH |
|---|---|---|---|
| V0 (desk as is) | [3] | 3 | 48 |
| V1 (code default) | [1.5, 2, 3] | 3 | 48 |
| V2 | [1.5, 2, 3] | 2 | 48 |
| V3 | [1.5, 2, 3] | 3 | 24 |

## Round 2 (operator, 8 Oct ~01:15: "Optimize v3 to run better than v0, test with max 12hrs hold")

V0 vs V3 on PF including the open orders (round 1): falling 0.40 vs 0.34 (Signals 0.39 vs 0.33), rally 2.78 vs 2.82
(Signals 2.81 vs 2.85) — V3 does not beat V0 in both windows. Variants of V3 with a hold of at most 12 h:

| variant | change from V3 |
|---|---|
| H1 | signals.holdH 12 |
| H2 | signals.holdH 6 |
| H3 | holdH 12 + signals.trailing trailOfTp [0.25, 0.4, 0.6], slOfTp 2 (tight trails) |
| H4 | holdH 12 + signals.accept.hours 24 (was 48) + signals.sideAccept hours 12, minTrades 10 (was 24 h / 20): faster to follow a regime change |
