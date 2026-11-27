# Direct post-Base Execute Last-N matrix

- 16 full-level historical runs; 8 symbols; 12 h of prehistory and 12 h evaluated.
- Base lanes: Long 10–50 by 10, Short 4–16 by 4 and Last 1–5; Short and Last both signs.
- Direct Exec lanes: positive Short 8/12/16/20, negative Short 8/12, and Last 1–5 in both signs.
- Each run reports all 24000 Base×Exec policy pairs.
- Main and Real were bypassed by the offline test policy. Direct fills updated independent Base×Exec lane histories.
- Each path’s hour-success rate uses all 12 run hours as the denominator.
- Axis/Block comparison: neither, both at factor 1, each separately at factor 1, and Axis factor 0.1 with and without Block at Base 2.5 / Exec 2.5.

## Observed result

All 16 runs produced 6 closed and 7 opened unique simulated orders, run PF 10.783, and 3/12 green hours (25.0%). The baseline passed 9 of 441,600 final Base context-policy checks and 85 of 26,496,000 Base×Exec paths. The combined Axis+Block case had 9 Base passes and 85 qualified Exec paths, with 41,856,000 paths evaluated. None of the PF floor or Axis/Block variants increased the unique order count or green-hour share in this sample.

This short sample is not enough to establish stable profitability.

- Detailed standalone report: [index.html](./index.html). Compressed source data: [matrix-data.json.gz](./matrix-data.json.gz).

All orders are simulated from the cached feed. No exchange execution occurred. See the report for PF, sample-size and overlap definitions.
