# CTS-A Core v2 — hour-by-hour simulated runs

9 symbols · 5m bars · 6h requested run 2026-10-14T22h → 2026-10-15T04h UTC · pre-calc 6h · cost 0.2% round trip · min PF 1.1 (neutral 1.0)
Base tapes: 24552 (every indication × bot × protect × sub-strategy). Patch: `{"preH":6,"simH":6,"stepH":1,"protects":[{"tp":0.026,"sl":0.039,"trail":0,"hold":96},{"tp":0.026,"sl":0.039,"trail":0.0104,"trailStep":1,"trailFree":false,"hold":96}],"dcaProtects":[{"tp":0.008,"sl":0.016,"trail":0,"hold":96}]}`

Primary PF, net and counts use settled simulated one-unit net returns after costs. Open endpoint marks and size-weighted simulated results are separate diagnostics. GP/GL and net are percentage points. A no-loss PF uses the shared engine sentinel 4, not an exact finite ratio. Exits at an hour boundary belong to the hour that just ended.

## Summary

| preset | settled closes | WR | return PF | net % | green active hours | worst hour % | MDD % | DDT h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| normal | 0 | 0% | 0.00 | 0.00 | 0/0 | 0.00 | 0.00 | 0.0 |
| normal-trailing | 5 | 80% | 21.59 | 3.18 | 1/1 | 0.00 | 0.15 | 0.9 |
| trailing | 0 | 0% | 0.00 | 0.00 | 0/0 | 0.00 | 0.00 | 0.0 |

## normal

Toggles: normal on · trailing off · block off · blockActive off · dca off · dcaActive off · axis off
Actual simulated window: 2026-10-14T22:00:00.000Z → 2026-10-15T04:00:00.000Z.
**Settled total** n 0 · WR 0% · return PF 0.00 · GP 0.00 / GL 0.00 · net 0.00% · green active hours 0/0 (0%) · worst hour 0.00% · MDD 0.00% · DDT 0.0h
Endpoint marks: n 1 · net -1.14%; settled + endpoint marks return PF 0.00 · n 1 · net -1.14%. Size-weighted simulated diagnostic: PF 0.00 · net 0.00%.
By kind: –
Skipped: symPf 1

| hour (UTC) | closes | wins | losses | return PF | net % | cumulative % | normal | trailing | trailing-only | DCA | DCA active | Axis | avg Block level | avg DCA volume | real | skipped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10-14 22:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 2 | 0 |
| 10-14 23:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 3 | 0 |
| 10-15 00:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 3 | 0 |
| 10-15 01:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 2 | 0 |
| 10-15 02:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 2 | 1 |
| 10-15 03:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 2 | 0 |

PF marked with an asterisk is the shared no-loss sentinel, not a finite measured ratio.

## normal-trailing

Toggles: normal on · trailing on · block off · blockActive off · dca off · dcaActive off · axis off
Actual simulated window: 2026-10-14T22:00:00.000Z → 2026-10-15T04:00:00.000Z.
**Settled total** n 5 · WR 80% · return PF 21.59 · GP 3.33 / GL 0.15 · net 3.18% · green active hours 1/1 (100%) · worst hour 0.00% · MDD 0.15% · DDT 0.9h
Endpoint marks: n 4 · net -4.57%; settled + endpoint marks return PF 0.73 · n 9 · net -1.39%. Size-weighted simulated diagnostic: PF 21.59 · net 3.18%.
By kind: trailing n5 return PF 21.59 net 3.18%
Skipped: duplicate 13 · symPf 6

| hour (UTC) | closes | wins | losses | return PF | net % | cumulative % | normal | trailing | trailing-only | DCA | DCA active | Axis | avg Block level | avg DCA volume | real | skipped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10-14 22:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 12 | 0 |
| 10-14 23:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 12 | 0 |
| 10-15 00:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 12 | 0 |
| 10-15 01:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 11 | 1 |
| 10-15 02:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 11 | 18 |
| 10-15 03:00 | 5 | 4 | 1 | 21.59 | 3.18 | 3.18 | 0 | 5 | 0 | 0 | 0 | 0 | 0.0 | – | 11 | 0 |

PF marked with an asterisk is the shared no-loss sentinel, not a finite measured ratio.

## trailing

Toggles: normal off · trailing on · block on · blockActive off · dca off · dcaActive off · axis off
Actual simulated window: 2026-10-14T22:00:00.000Z → 2026-10-15T04:00:00.000Z.
**Settled total** n 0 · WR 0% · return PF 0.00 · GP 0.00 / GL 0.00 · net 0.00% · green active hours 0/0 (0%) · worst hour 0.00% · MDD 0.00% · DDT 0.0h
Endpoint marks: n 0 · net 0.00%; settled + endpoint marks return PF 0.00 · n 0 · net 0.00%. Size-weighted simulated diagnostic: PF 0.00 · net 0.00%.
By kind: –
Skipped: normalOff 20 · symPf 8

| hour (UTC) | closes | wins | losses | return PF | net % | cumulative % | normal | trailing | trailing-only | DCA | DCA active | Axis | avg Block level | avg DCA volume | real | skipped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10-14 22:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 12 | 0 |
| 10-14 23:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 12 | 0 |
| 10-15 00:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 12 | 0 |
| 10-15 01:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 11 | 2 |
| 10-15 02:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 11 | 26 |
| 10-15 03:00 | 0 | 0 | 0 | – | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | – | – | 11 | 0 |

PF marked with an asterisk is the shared no-loss sentinel, not a finite measured ratio.

## Direction, order, and volume audit

The settled `normal+trailing` sample contains five strategy orders, all long and zero short. All five closed in the 03:00–04:00 UTC bucket; the earlier five buckets had no settled closes. The `normal` and `trailing-only` presets had no settled closes in any bucket. This short window does not establish that short configurations or trailing-only configurations qualify; the recorded skip counts are shown above.

| settled order | symbol | side | kind | entry UTC | exit UTC | net return | vol | multiplier | coordination volume |
|---:|---|---|---|---|---|---:|---:|---:|---:|
| 1 | ADA-USDT | long | trailing | 2026-10-15 02:30 | 2026-10-15 03:05 | +1.1151% | 1 | 1 | 1 |
| 2 | LINK-USDT | long | trailing | 2026-10-15 02:30 | 2026-10-15 03:05 | +0.4419% | 1 | 1 | 1 |
| 3 | SOL-USDT | long | trailing | 2026-10-15 02:30 | 2026-10-15 03:05 | +0.6625% | 1 | 1 | 1 |
| 4 | ADA-USDT | long | trailing | 2026-10-15 02:30 | 2026-10-15 03:05 | +1.1151% | 1 | 1 | 1 |
| 5 | BNB-USDT | long | trailing | 2026-10-15 02:30 | 2026-10-15 03:55 | −0.1544% | 1 | 1 | 1 |

The ADA rows are distinct strategy/config orders on one symbol and side; they are not two exchange position slots. Every sampled order had unit volume and multiplier 1, so this run does not exercise Block or coordination-volume stacking. Its settled-only PF of 21.59 (4 wins, 1 loss) is paired with four open endpoint marks totaling −4.57%; including those marks gives PF 0.73 and net −1.39%. No PF or profitability qualification should be inferred from this five-close sample.

## Method and limits

This is a cached, in-sample smoke run over nine symbols, resampled from 1m candles to 5m bars, with six hours of prehistory and a six-hour simulated window (2026-10-14 22:00 through 2026-10-15 04:00 UTC). Round-trip cost is 0.2%. To keep the local run within memory, it uses two wide-range protect profiles (fixed and trailing) plus one DCA protect profile, rather than the full range grid. It did not use venue fills, test every range, or qualify a live promotion. The results are diagnostic only.
