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
