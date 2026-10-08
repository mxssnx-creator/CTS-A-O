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
