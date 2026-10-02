# Block sweep: types, Active, block count, ratio, steps, pause, max stack

All runs use real BingX 1-minute data, replayed through the engine (`scripts/core-block-sweep.mjs`, pooled by
`scripts/core-block-sweep-report.mjs`):
- **Windows:** 24 h each, ending 0, 24, 48, 72, 96 and 120 h ago, with 12 h of pre-calculation before each.
- **Symbols:** 12 per window, the most volatile over 1 h.
- **Comparison:** every variant runs the Real-stage walk-forward on the same tapes. Only the Block settings differ.
- **Universes:** top-12 volatile, next-12 volatile (offset 12), and volume-ranked.

PF is pooled as Σ gross profit ÷ Σ gross loss over all windows.

## Default settings (line by line)

| setting | value | meaning |
|---|---|---|
| Block | on | Block runs at the Real stage |
| Block Active | on, from level 2 | entries below level 2 are skipped (also with Normal on) |
| Type | Overall | each source is its own Block and adds its own position (ratio · its level) |
| Sources | overall, symbol, direction, indication | config and type sources off |
| Block count (max level) | 8 | levels n = 1..8: a positive sum of the last n closes is one level |
| Ratio | 0.5 | each level adds 0.5 × the unit |
| Max stack | 8× | shared / additive: volume ≤ 8× · Overall: each source ≤ 7× extra, the stack ≤ 8× (scaled down in proportion) |
| Volume steps | 7 | raises move in whole units (7 steps of 1×): live, one more exchange-minimum lot per step |
| Pause | 0 | off: in every stage, a pause after a win only lowered PF |
| Live sizing | minimum quantity | one unit = the symbol's exchange minimum; Block volume = whole multiples of it |
| Live leverage | maximum | each symbol and side set to the exchange maximum before the first open |

The TP ranges, as position-cost multiples of the 0.2 % cost:

| range | multiples | TP | SL × TP | trailing |
|---|---|---|---|---|
| Minimal | 4–8 × | 0.8–1.6 % | 1, 1.5, 2 | off, 0.5, 0.75 |
| Short | 9–14 × | 1.8–2.8 % | 1, 1.5, 2 | off, 0.5, 0.75 |
| General | 16–22 × (step 2) | 3.2–4.4 % | 0.5, 0.75, 1 | off, 0.5, 0.75 |
| Long | 24–32 × (step 2) | 4.8–6.4 % | 0.5, 0.75, 1 | off, 0.5, 0.75 |

## Stage 1: type × Active × block count × ratio (top-12, 6 windows)

| variant | closes | PF | net / max DD |
|---|---:|---:|---:|
| no Block (Normal on) | 1,435 | 1.448 | 3.33 |
| Overall, Active 2, L8, r0.5 | 1,273 | 1.538 | 6.03 |
| shared, Active 1, L4, r0.5 | 1,250 | 1.458 | 5.16 |
| additive, Active 1, L4, r0.5 | 1,250 | 1.457 | 5.16 |

- Active 1 to 3 always beat Active off.
- Overall needs level 2 or more.
- Shared and additive are best at L4.

## Stage 2: steps × pause × max multiple

- **Pause:** pause 2 or 4 lowered PF for every type:
  - Overall: 1.53 → 1.33;
  - shared: 1.46 → 1.36–1.38.
- **Steps:** neutral, within ±0.005 PF.
- **Max multiple:** 2 gave the best return per drawdown at that time (Overall 6.32).

## Stage 3: sources × Normal

- **Overall:** best with the overall, symbol, direction and indication sources:
  - net / max DD 6.32 with those sources;
  - 5.96 with config added;
  - 5.89 with the former default sources;
  - 4.26 with the config source alone.
- **Normal:** on and off give the same result while Active is on.

## Verification: 18 windows over 3 universes (max multiple 2)

| variant | PF pooled | net / Σ DD |
|---|---:|---:|
| Overall, Active 2, L8, r0.5, m2, st3 | 1.279 | 1.90 |
| shared, Active 1, L4, r0.5, m2 | 1.194 | 1.39 |
| additive, Active 1, L4, r0.5, m2 | 1.185 | 1.34 |
| former default (shared, all sources, L6, r0.2, m2.5) | 1.175 | 1.01 |
| no Block | 1.151 | 0.78 |

Per range, on the same tapes:

| range | PF |
|---|---:|
| Long | 1.264 |
| General | 1.07 |
| Short | 0.856 |
| Minimal | 0.814 |

The wider targets carry the edge.

## Stage 5: max stack 8× for every type (12 windows, top-12 + next-12, run later on fresher data)

| variant | closes | PF pooled | PF top-12 | PF next-12 | positive windows | worst DD % | avg DDT h | avg volume |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| additive act1 L4 r1 m4 st7 | 1917 | 1.129 | 1.356 | 0.535 | 6/12 | 1178.5 | 12.3 | 3.57 |
| additive act1 L4 r1 m4 st0 | 1917 | 1.129 | 1.356 | 0.535 | 6/12 | 1177.7 | 12.3 | 3.57 |
| additive act1 L4 r1 m4 st3 | 1917 | 1.129 | 1.356 | 0.535 | 6/12 | 1177.7 | 12.3 | 3.57 |
| shared act1 L4 r0.5 m4 st3 | 1917 | 1.126 | 1.344 | 0.542 | 6/12 | 881.8 | 12.0 | 2.61 |
| shared act1 L4 r0.5 m8 st7 | 1917 | 1.126 | 1.344 | 0.542 | 6/12 | 881.8 | 12.0 | 2.61 |
| additive act1 L4 r0.5 m2 st0 | 1917 | 1.125 | 1.352 | 0.530 | 6/12 | 591.8 | 12.2 | 1.82 |
| shared act1 L4 r1 m4 st0 | 1917 | 1.125 | 1.346 | 0.540 | 6/12 | 1171.1 | 12.0 | 3.48 |
| shared act1 L4 r1 m4 st3 | 1917 | 1.125 | 1.346 | 0.540 | 6/12 | 1171.1 | 12.0 | 3.48 |
| additive act1 L4 r0.5 m2 st7 | 1917 | 1.125 | 1.351 | 0.530 | 6/12 | 591.8 | 12.2 | 1.82 |
| shared act1 L4 r1 m4 st7 | 1917 | 1.124 | 1.346 | 0.539 | 6/12 | 1170.1 | 12.0 | 3.48 |
| additive act1 L4 r0.5 m2 st3 | 1917 | 1.124 | 1.351 | 0.529 | 6/12 | 591.8 | 12.2 | 1.82 |
| shared act1 L4 r0.5 m4 st7 | 1917 | 1.122 | 1.334 | 0.549 | 7/12 | 917.1 | 11.9 | 2.63 |
| shared act1 L4 r0.5 m2 st0 | 1917 | 1.122 | 1.348 | 0.529 | 6/12 | 588.5 | 12.2 | 1.81 |
| shared act1 L4 r0.5 m2 st7 | 1917 | 1.122 | 1.348 | 0.529 | 6/12 | 589.0 | 12.2 | 1.81 |
| shared act1 L4 r0.5 m2 st3 | 1917 | 1.122 | 1.348 | 0.529 | 6/12 | 589.6 | 12.2 | 1.82 |
| shared act1 L4 r0.5 m8 st3 | 1917 | 1.122 | 1.348 | 0.528 | 6/12 | 986.3 | 12.2 | 3.06 |
| shared act1 L4 r1 m2 st0 | 1917 | 1.122 | 1.348 | 0.528 | 6/12 | 591.8 | 12.2 | 1.83 |
| shared act1 L4 r1 m2 st3 | 1917 | 1.122 | 1.348 | 0.528 | 6/12 | 591.8 | 12.2 | 1.83 |
| shared act1 L4 r1 m2 st7 | 1917 | 1.122 | 1.348 | 0.528 | 6/12 | 591.8 | 12.2 | 1.83 |
| additive act1 L4 r1 m2 st0 | 1917 | 1.122 | 1.348 | 0.528 | 6/12 | 591.8 | 12.2 | 1.83 |
| additive act1 L4 r1 m2 st3 | 1917 | 1.122 | 1.348 | 0.528 | 6/12 | 591.8 | 12.2 | 1.83 |
| additive act1 L4 r1 m2 st7 | 1917 | 1.122 | 1.348 | 0.528 | 6/12 | 591.8 | 12.2 | 1.83 |
| shared act1 L4 r0.5 m4 st0 | 1917 | 1.120 | 1.333 | 0.547 | 7/12 | 875.6 | 11.9 | 2.53 |
| shared act1 L4 r0.5 m8 st0 | 1917 | 1.120 | 1.333 | 0.547 | 7/12 | 875.6 | 11.9 | 2.53 |
| shared act1 L4 r1 m8 st0 | 1917 | 1.120 | 1.330 | 0.551 | 7/12 | 1455.3 | 11.9 | 4.15 |
| shared act1 L4 r1 m8 st7 | 1917 | 1.120 | 1.330 | 0.551 | 7/12 | 1455.3 | 11.9 | 4.15 |
| no-block normal | 2146 | 1.119 | 1.332 | 0.546 | 6/12 | 351.5 | 12.9 | 0.92 |
| overall act2 L8 r0.5 m8 st7 | 1903 | 1.118 | 1.285 | 0.594 | 6/12 | 2465.9 | 11.7 | 6.21 |
| overall act2 L8 r0.5 m4 st7 | 1903 | 1.118 | 1.282 | 0.595 | 6/12 | 2406.2 | 11.8 | 5.93 |
| overall act2 L8 r0.5 m4 st0 | 1903 | 1.117 | 1.281 | 0.595 | 6/12 | 2409.7 | 12.1 | 5.91 |
| overall act2 L8 r0.5 m8 st0 | 1903 | 1.116 | 1.280 | 0.594 | 6/12 | 2466.1 | 11.7 | 6.10 |
| overall act2 L8 r0.5 m4 st3 | 1903 | 1.116 | 1.282 | 0.595 | 6/12 | 2426.0 | 11.8 | 6.03 |
| additive act1 L4 r0.5 m4 st7 | 1917 | 1.115 | 1.327 | 0.546 | 7/12 | 1170.0 | 12.1 | 3.35 |
| additive act1 L4 r0.5 m4 st3 | 1917 | 1.114 | 1.326 | 0.546 | 6/12 | 1166.0 | 12.0 | 3.39 |
| shared act1 L4 r1 m8 st3 | 1917 | 1.112 | 1.315 | 0.555 | 7/12 | 1649.5 | 11.7 | 4.62 |
| additive act1 L4 r0.5 m4 st0 | 1917 | 1.111 | 1.322 | 0.547 | 6/12 | 1170.6 | 12.1 | 3.33 |
| overall act2 L8 r0.5 m8 st3 | 1903 | 1.111 | 1.289 | 0.577 | 6/12 | 2536.8 | 12.3 | 6.54 |
| overall act2 L8 r1 m4 st0 | 1903 | 1.106 | 1.284 | 0.574 | 6/12 | 2499.0 | 12.5 | 6.41 |
| overall act2 L8 r1 m4 st3 | 1903 | 1.106 | 1.284 | 0.574 | 6/12 | 2499.0 | 12.5 | 6.41 |
| additive act1 L4 r1 m8 st0 | 1917 | 1.105 | 1.302 | 0.562 | 6/12 | 2572.6 | 12.3 | 6.34 |
| additive act1 L4 r1 m8 st7 | 1917 | 1.105 | 1.302 | 0.562 | 6/12 | 2572.6 | 12.3 | 6.34 |
| overall act2 L8 r1 m4 st7 | 1903 | 1.104 | 1.283 | 0.572 | 5/12 | 2509.6 | 12.5 | 6.43 |
| additive act1 L4 r1 m8 st3 | 1917 | 1.103 | 1.308 | 0.548 | 7/12 | 2485.4 | 12.3 | 6.48 |
| additive act1 L4 r0.5 m8 st3 | 1917 | 1.101 | 1.267 | 0.588 | 6/12 | 2883.7 | 11.9 | 5.13 |
| additive act1 L4 r0.5 m8 st0 | 1917 | 1.093 | 1.257 | 0.592 | 6/12 | 2932.5 | 12.4 | 4.85 |
| additive act1 L4 r0.5 m8 st7 | 1917 | 1.092 | 1.256 | 0.596 | 6/12 | 2921.7 | 12.5 | 5.00 |
| overall act2 L8 r0.5 m2 st0 | 1903 | 1.092 | 1.256 | 0.584 | 4/12 | 1547.0 | 13.0 | 3.48 |
| overall act2 L8 r1 m2 st0 | 1903 | 1.092 | 1.256 | 0.584 | 4/12 | 1547.0 | 13.0 | 3.48 |
| overall act2 L8 r0.5 m2 st3 | 1903 | 1.092 | 1.256 | 0.584 | 4/12 | 1547.0 | 13.0 | 3.48 |
| overall act2 L8 r1 m2 st3 | 1903 | 1.092 | 1.256 | 0.584 | 4/12 | 1547.0 | 13.0 | 3.48 |
| overall act2 L8 r0.5 m2 st7 | 1903 | 1.092 | 1.256 | 0.584 | 4/12 | 1547.0 | 13.0 | 3.48 |
| overall act2 L8 r1 m2 st7 | 1903 | 1.092 | 1.256 | 0.584 | 4/12 | 1547.0 | 13.0 | 3.48 |
| overall act2 L8 r1 m8 st0 | 1903 | 1.086 | 1.273 | 0.551 | 5/12 | 2678.8 | 12.4 | 6.87 |
| overall act2 L8 r1 m8 st7 | 1903 | 1.086 | 1.273 | 0.551 | 5/12 | 2678.8 | 12.4 | 6.87 |
| overall act2 L8 r1 m8 st3 | 1903 | 1.084 | 1.276 | 0.544 | 5/12 | 2647.1 | 12.4 | 6.92 |
## Reading

- **Block amplifies the base.** Where the base wins (top-12: PF 1.33), every Block type wins more. Where the base loses (next-12 universe: PF 0.55), Block loses more.
- **The type differences are small and change with the period:**
  - in the first 18 windows, Overall led (1.279 vs shared 1.194);
  - on the later 12 windows, shared and additive led by about 0.01 PF (1.12–1.13 vs Overall 1.118 at 8×).
- **8× stack:**
  - Overall: raises PF over the 2× cap (1.118 vs 1.092);
  - shared and additive: stay flat, because at L4 with ratio 0.5 they rarely reach 3×.
- **Steps:**
  - 7 steps (1× each) are as good as continuous;
  - they map exactly onto whole exchange lots at minimum quantity.
- **Pause:** lowers PF in every stage, so it stays off.
- **Ranges:**
  - Minimal (PF 0.36–0.49) and Short (0.85–0.93) lose after costs in every Block variant;
  - General (1.34–1.49) and Long (1.18–1.28) carry the result.

## Max drawdown ratio (DDR) gate: 12 windows (top-12 + next-12 volatile), default settings

DDR = a config's largest drawdown ÷ its net result over the window. It applies in Base, every seat selection, the seat validation and the Real / Live last-N.

| universe | variant | orders | PF | net % | Σ max DD % | net ÷ Σ DD | positive windows | avg DDT h |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| top-12 volatile | ddr off | 1191 | 1.298 | 3979 | 5827 | 0.68 | 6/6 | 10.7 |
| top-12 volatile | ddr 3 | 1165 | 1.284 | 3759 | 5861 | 0.64 | 6/6 | 10.8 |
| top-12 volatile | ddr 2 | 1129 | 1.264 | 3418 | 5812 | 0.59 | 5/6 | 10.8 |
| top-12 volatile | ddr 1.5 | 1100 | 1.281 | 3543 | 5689 | 0.62 | 5/6 | 10.8 |
| top-12 volatile | ddr 1 | 1031 | 1.314 | 3699 | 5337 | 0.69 | 5/6 | 11.5 |
| top-12 volatile | ddr 0.75 | 964 | 1.270 | 3046 | 5204 | 0.59 | 5/6 | 10.3 |
| top-12 volatile | ddr 0.5 | 759 | 1.306 | 2727 | 3767 | 0.72 | 5/6 | 7.6 |
| top-12 volatile | ddr off, no block | 1366 | 1.394 | 824 | 796 | 1.04 | 6/6 | 10.3 |
| top-12 volatile | ddr 1, no block | 1180 | 1.433 | 777 | 727 | 1.07 | 6/6 | 10.8 |
| next-12 volatile | ddr off | 125 | 0.648 | -533 | 1248 | -0.43 | 1/6 | 6.2 |
| next-12 volatile | ddr 3 | 123 | 0.638 | -547 | 1263 | -0.43 | 1/6 | 6.2 |
| next-12 volatile | ddr 2 | 116 | 0.635 | -527 | 1259 | -0.42 | 1/6 | 6.2 |
| next-12 volatile | ddr 1.5 | 109 | 0.613 | -534 | 1250 | -0.43 | 1/6 | 6.2 |
| next-12 volatile | ddr 1 | 88 | 0.547 | -540 | 1114 | -0.48 | 1/6 | 6.6 |
| next-12 volatile | ddr 0.75 | 82 | 0.730 | -246 | 843 | -0.29 | 2/6 | 3.7 |
| next-12 volatile | ddr 0.5 | 43 | 0.482 | -305 | 564 | -0.54 | 2/6 | 4.5 |
| next-12 volatile | ddr off, no block | 180 | 0.806 | -50 | 189 | -0.27 | 1/6 | 8.8 |
| next-12 volatile | ddr 1, no block | 130 | 0.760 | -46 | 158 | -0.29 | 1/6 | 10.9 |
| pooled | ddr off | 1316 | 1.232 | 3446 | 7075 | 0.49 | 7/12 | 8.4 |
| pooled | ddr 3 | 1288 | 1.218 | 3211 | 7123 | 0.45 | 7/12 | 8.5 |
| pooled | ddr 2 | 1245 | 1.201 | 2891 | 7071 | 0.41 | 6/12 | 8.5 |
| pooled | ddr 1.5 | 1209 | 1.215 | 3009 | 6938 | 0.43 | 6/12 | 8.5 |
| pooled | ddr 1 | 1119 | 1.244 | 3159 | 6451 | 0.49 | 6/12 | 9.0 |
| pooled | ddr 0.75 | 1046 | 1.230 | 2800 | 6047 | 0.46 | 7/12 | 7.0 |
| pooled | ddr 0.5 | 802 | 1.255 | 2422 | 4331 | 0.56 | 7/12 | 6.1 |
| pooled | ddr off, no block | 1546 | 1.329 | 774 | 985 | 0.79 | 7/12 | 9.6 |
| pooled | ddr 1, no block | 1310 | 1.368 | 731 | 885 | 0.83 | 7/12 | 10.9 |

**Default: DDR 1.** It keeps 85 % of the orders, raises PF (1.232 → 1.244) and lowers the drawdown 9 %. **DDR 0.5** is the low-drawdown setting: drawdown −39 % and DDT 6.1 h, but 39 % fewer orders.

The no-Block rows show the cost of the 8× stack: about 7× the drawdown for 4.5× the net. Its net ÷ drawdown is 0.79–0.83, against 0.49 with Block.

## Selection: seats, positions cap, coordination, stack (stage 7, 12 windows)

Every config is computed and evaluated, and the variants differ only in how many of the evaluated configs trade.

| universe | variant | orders | PF | net % | Σ max DD % | net ÷ Σ DD | positive windows |
|---|---|---:|---:|---:|---:|---:|---:|
| top-12 | seats unlimited, family seats | 1046 | 1.314 | 3688 | 5218 | 0.71 | 3/6 |
| top-12 | seats 16 (default) · Block off | 1167 | 1.291 | 567 | 916 | 0.62 | 5/6 |
| top-12 | seats unlimited · Block off | 1221 | 1.290 | 584 | 935 | 0.62 | 5/6 |
| top-12 | seats 16 (default) · stack 4× | 1005 | 1.281 | 3287 | 5780 | 0.57 | 4/6 |
| top-12 | seats unlimited · stack 4× | 1058 | 1.281 | 3392 | 5851 | 0.58 | 4/6 |
| top-12 | seats 32 | 1058 | 1.281 | 3492 | 6096 | 0.57 | 4/6 |
| top-12 | seats unlimited | 1058 | 1.281 | 3492 | 6096 | 0.57 | 4/6 |
| top-12 | seats unlimited · confirm off | 1058 | 1.281 | 3492 | 6096 | 0.57 | 4/6 |
| top-12 | seats unlimited, no lane minimum | 1058 | 1.281 | 3492 | 6096 | 0.57 | 4/6 |
| top-12 | seats unlimited, positions unlimited | 1058 | 1.281 | 3492 | 6096 | 0.57 | 4/6 |
| top-12 | seats 32, positions unlimited | 1058 | 1.281 | 3492 | 6096 | 0.57 | 4/6 |
| top-12 | seats 16 (default) | 1005 | 1.280 | 3371 | 6016 | 0.56 | 4/6 |
| top-12 | seats 16 (default) · confirm off | 1005 | 1.280 | 3371 | 6016 | 0.56 | 4/6 |
| top-12 | seats unlimited · stack 2× | 1058 | 1.233 | 1645 | 3448 | 0.48 | 4/6 |
| top-12 | seats 16 (default) · conflict on | 937 | 1.209 | 2435 | 6052 | 0.40 | 4/6 |
| top-12 | seats 16 (default) · stack 2× | 1005 | 1.205 | 1405 | 3448 | 0.41 | 4/6 |
| top-12 | seats unlimited · conflict on | 984 | 1.200 | 2412 | 6189 | 0.39 | 4/6 |
| next-12 | seats 16 (default) · Block off | 137 | 0.695 | -61 | 172 | -0.36 | 2/6 |
| next-12 | seats unlimited · Block off | 137 | 0.695 | -61 | 172 | -0.36 | 2/6 |
| next-12 | seats 16 (default) | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats 16 (default) · confirm off | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats 32 | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats unlimited | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats unlimited · confirm off | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats unlimited, no lane minimum | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats unlimited, family seats | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats unlimited, positions unlimited | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats 32, positions unlimited | 93 | 0.571 | -450 | 988 | -0.46 | 2/6 |
| next-12 | seats 16 (default) · conflict on | 92 | 0.569 | -452 | 991 | -0.46 | 2/6 |
| next-12 | seats unlimited · conflict on | 92 | 0.569 | -452 | 991 | -0.46 | 2/6 |
| next-12 | seats 16 (default) · stack 4× | 93 | 0.564 | -455 | 988 | -0.46 | 2/6 |
| next-12 | seats unlimited · stack 4× | 93 | 0.564 | -455 | 988 | -0.46 | 2/6 |
| next-12 | seats 16 (default) · stack 2× | 93 | 0.542 | -299 | 623 | -0.48 | 2/6 |
| next-12 | seats unlimited · stack 2× | 93 | 0.542 | -299 | 623 | -0.48 | 2/6 |
| pooled | seats unlimited, family seats | 1139 | 1.253 | 3238 | 6206 | 0.52 | 5/12 |
| pooled | seats unlimited · Block off | 1358 | 1.236 | 523 | 1107 | 0.47 | 7/12 |
| pooled | seats 16 (default) · Block off | 1304 | 1.236 | 505 | 1088 | 0.46 | 7/12 |
| pooled | seats 32 | 1151 | 1.226 | 3042 | 7085 | 0.43 | 6/12 |
| pooled | seats unlimited | 1151 | 1.226 | 3042 | 7085 | 0.43 | 6/12 |
| pooled | seats unlimited · confirm off | 1151 | 1.226 | 3042 | 7085 | 0.43 | 6/12 |
| pooled | seats unlimited, no lane minimum | 1151 | 1.226 | 3042 | 7085 | 0.43 | 6/12 |
| pooled | seats unlimited, positions unlimited | 1151 | 1.226 | 3042 | 7085 | 0.43 | 6/12 |
| pooled | seats 32, positions unlimited | 1151 | 1.226 | 3042 | 7085 | 0.43 | 6/12 |
| pooled | seats unlimited · stack 4× | 1151 | 1.224 | 2938 | 6839 | 0.43 | 6/12 |
| pooled | seats 16 (default) | 1098 | 1.223 | 2921 | 7004 | 0.42 | 6/12 |
| pooled | seats 16 (default) · confirm off | 1098 | 1.223 | 2921 | 7004 | 0.42 | 6/12 |
| pooled | seats 16 (default) · stack 4× | 1098 | 1.223 | 2832 | 6769 | 0.42 | 6/12 |
| pooled | seats unlimited · stack 2× | 1151 | 1.175 | 1347 | 4070 | 0.33 | 6/12 |
| pooled | seats 16 (default) · conflict on | 1029 | 1.156 | 1983 | 7042 | 0.28 | 6/12 |
| pooled | seats unlimited · conflict on | 1076 | 1.149 | 1960 | 7180 | 0.27 | 6/12 |
| pooled | seats 16 (default) · stack 2× | 1098 | 1.148 | 1106 | 4071 | 0.27 | 6/12 |

**New defaults:**
- **Unlimited seats:** every config that passes PF, DDT, DDR and the validation trades.
- **Family seats:** Normal / Trailing, DCA and Axis each take their own seats, and DCA / Axis need no base to beat.

Pooled PF 1.253 vs 1.223 for the former 16 seats with one seat per pair; net ÷ drawdown 0.52 vs 0.42. The books of the types are independent.

**Unchanged:**
- **Positions cap and lane minimum:** never binding.
- **Signal confirmation:** no effect here (signals are off in this sweep).
- **Conflict blocking:** lowers PF (1.15–1.16), so it stays off.
- **Stack:** 4× ≈ 8×, while 2× lowers PF and net, so 8× stays.

## Tactics (6 windows × 12 symbols, current selection defaults; each tactic its own compute)

| tactics | variant | orders | PF | net % | Σ max DD % | net ÷ Σ DD | positive windows |
|---|---|---:|---:|---:|---:|---:|---:|
| none | default | 1046 | 1.313 | 3676 | 5218 | 0.70 | 3/6 |
| none | Block off | 1200 | 1.367 | 681 | 751 | 0.91 | 4/6 |
| session | default | 264 | 1.387 | 1088 | 1577 | 0.69 | 2/6 |
| session | Block off | 376 | 1.168 | 110 | 295 | 0.37 | 2/6 |
| volRegime | default | 818 | 1.309 | 2919 | 4175 | 0.70 | 5/6 |
| volRegime | Block off | 946 | 1.332 | 491 | 605 | 0.81 | 5/6 |
| trendStrength | default | 710 | 1.597 | 4521 | 3157 | 1.43 | 4/6 |
| trendStrength | Block off | 807 | 1.634 | 731 | 418 | 1.75 | 4/6 |
| cooldown | default | 744 | 1.420 | 3192 | 3064 | 1.04 | 4/6 |
| cooldown | Block off | 838 | 1.296 | 376 | 485 | 0.78 | 4/6 |
| ts+cd | default | 629 | 1.721 | 4300 | 1902 | 2.26 | 4/6 |
| ts+cd | Block off | 728 | 1.712 | 686 | 294 | 2.33 | 5/6 |
| ts+vr | default | 688 | 1.859 | 5582 | 2791 | 2.00 | 6/6 |
| ts+vr | Block off | 752 | 1.946 | 892 | 381 | 2.34 | 5/6 |

Abbreviations: ts = trend strength, cd = cooldown, vr = volatility regime.

**Default: trend strength + volatility regime.** Compared with no tactics:
- PF 1.313 → 1.859;
- net +52 %;
- drawdown −47 %;
- positive in 6 of 6 windows (vs 3 of 6);
- orders −34 %.

Trend strength + cooldown has the lowest drawdown (net ÷ DD 2.26). The session filter alone cuts orders by three quarters for little gain.

## Gates: validation, live last-N, DDR, symbol gate (12 windows, tactics on)

These variants explain the 6-symbol session window, which ended 15:00 UTC on Oct 2. On that window the defaults executed only 4 orders.

| universe | variant | orders | PF | net % | Σ max DD % | net ÷ Σ DD | positive windows |
|---|---|---:|---:|---:|---:|---:|---:|
| top-12 | defaults | 688 | 1.859 | 5580 | 2794 | 2.00 | 6/6 |
| top-12 | validation 20 | 1263 | 1.337 | 5729 | 7880 | 0.73 | 5/6 |
| top-12 | validation off | 1250 | 1.289 | 4917 | 7824 | 0.63 | 4/6 |
| top-12 | validation off + live last-N off | 2350 | 1.416 | 12963 | 13088 | 0.99 | 5/6 |
| top-12 | validation off + DDR off | 1310 | 1.336 | 5859 | 7866 | 0.74 | 4/6 |
| top-12 | validation, last-N, DDR off | 2363 | 1.428 | 13328 | 13197 | 1.01 | 5/6 |
| top-12 | validation, last-N off, DDR 1 | 2350 | 1.416 | 12963 | 13088 | 0.99 | 5/6 |
| top-12 | all relaxed (PF 1.05, symbol veto) | 2545 | 1.460 | 15215 | 13337 | 1.14 | 5/6 |
| top-12 | all relaxed, DDR 1 | 2532 | 1.449 | 14862 | 13226 | 1.12 | 5/6 |
| next-12 | defaults | 37 | 0.765 | -76 | 271 | -0.28 | 0/6 |
| next-12 | validation 20 | 145 | 0.955 | -74 | 1417 | -0.05 | 3/6 |
| next-12 | validation off | 119 | 0.837 | -237 | 1214 | -0.20 | 3/6 |
| next-12 | validation off + live last-N off | 385 | 0.773 | -1305 | 3923 | -0.33 | 3/6 |
| next-12 | validation off + DDR off | 122 | 0.905 | -133 | 1164 | -0.11 | 3/6 |
| next-12 | validation, last-N, DDR off | 387 | 0.786 | -1226 | 3876 | -0.32 | 3/6 |
| next-12 | validation, last-N off, DDR 1 | 385 | 0.773 | -1305 | 3923 | -0.33 | 3/6 |
| next-12 | all relaxed (PF 1.05, symbol veto) | 429 | 0.754 | -1525 | 4190 | -0.36 | 3/6 |
| next-12 | all relaxed, DDR 1 | 426 | 0.751 | -1541 | 4158 | -0.37 | 3/6 |
| pooled | defaults | 725 | 1.807 | 5504 | 3065 | 1.80 | 6/12 |
| pooled | validation 20 | 1408 | 1.303 | 5655 | 9297 | 0.61 | 8/12 |
| pooled | validation off | 1369 | 1.253 | 4680 | 9038 | 0.52 | 7/12 |
| pooled | validation off + live last-N off | 2735 | 1.316 | 11658 | 17012 | 0.69 | 8/12 |
| pooled | validation off + DDR off | 1432 | 1.304 | 5725 | 9030 | 0.63 | 7/12 |
| pooled | validation, last-N, DDR off | 2750 | 1.328 | 12102 | 17073 | 0.71 | 8/12 |
| pooled | validation, last-N off, DDR 1 | 2735 | 1.316 | 11658 | 17012 | 0.69 | 8/12 |
| pooled | all relaxed (PF 1.05, symbol veto) | 2974 | 1.348 | 13690 | 17527 | 0.78 | 8/12 |
| pooled | all relaxed, DDR 1 | 2958 | 1.339 | 13321 | 17384 | 0.77 | 8/12 |

**Defaults kept.** The defaults keep the highest PF (1.807 pooled) and the best return per drawdown (1.80), positive in 6 of 6 top-12 windows. Their losses on the next-12 universe stay small.

**Relaxed gates trade much more, at a lower PF:**
- 4× the orders and 2.5× the net;
- PF 1.35 and 5.7× the drawdown;
- the relaxed gates are no 50-close validation, no live last-N, min PF 1.05 and the symbol gate in veto mode.

They are the **High order count** desk preset.
