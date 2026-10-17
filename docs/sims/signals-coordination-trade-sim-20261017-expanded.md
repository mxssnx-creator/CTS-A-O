# Signals Coordination expanded offline replay

Run: 2026-10-17T01:48:37.970Z. Retrospective offline simulation on the same frozen candle cache as the 2026-10-17 baseline; it is not a forward or live-account result.

## Scope

- All nine ratios from 60% through 100% in 5-point steps × three independent Short / Medium / combined source-input masks; 63 enabled sources on the default 15-minute lane.
- 64850 config-side rows across 27 coordinator identities, both directions, Short / Normal / Long exit tags, Normal / Trailing strategies, and historic configs that cleared IS gates.
- Full runtime grid: 1200 protections per coordinator identity × 27 identities = 32400 protection identities / 64800 directional config-side rows. The baseline's 36-protection sample remains a compatibility check.
- IS selection froze IDs before OOS: at least 30 settled closes, PF ≥ 1.1, positive net, and endpoint-marked PF ≥ 1.1. Historic candidates also clear their own range PF floor.
- Cost 0.20% round trip. PF uses gross-positive / absolute-gross-negative unit returns. Pooled results count overlapping independent configs and are not portfolio ROI or account orders.

Cache SHA-256: 09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4. 8 symbols, IS 2026-07-23T21:25:00.000Z through 2026-09-14T21:25:00.000Z, OOS through 2026-10-14T21:25:00.000Z. The cache was already used for tactic research, so this evidence is retrospective.

## OOS by domination ratio and input mask

| Ratio | Inputs | IS-qualified / config sides | All configs: closes · PF · net points | Qualified: closes · PF · net points · PF with marks | Active / green hours |
|---:|---|---:|---:|---:|---:|
| 60% | Short | 52 / 2400 | 460333 · 0.860 · -78019.4 | 7589 · 1.284 · 3632.1 · 1.284 | 302 / 58.6% |
| 60% | Medium | 131 / 2400 | 241901 · 0.997 · -776.1 | 13458 · 1.167 · 3019.4 · 1.162 | 341 / 39.3% |
| 60% | Short + Medium | 40 / 2400 | 378917 · 0.933 · -29105.0 | 5249 · 1.231 · 2146.2 · 1.208 | 245 / 65.7% |
| 65% | Short | 222 / 2400 | 467784 · 0.855 · -80216.9 | 35717 · 1.278 · 14280.9 · 1.277 | 508 / 49.8% |
| 65% | Medium | 841 / 2400 | 260750 · 1.059 · 16410.0 | 95811 · 1.228 · 25953.1 · 1.224 | 510 / 46.9% |
| 65% | Short + Medium | 0 / 2400 | 396191 · 0.929 · -32250.8 | 0 · 0.000 · 0.0 · 0.000 | 0 / 0.0% |
| 70% | Short | 532 / 2400 | 465226 · 0.976 · -12214.8 | 93935 · 1.291 · 34926.8 · 1.289 | 578 / 45.8% |
| 70% | Medium | 833 / 2400 | 288350 · 1.013 · 4032.0 | 104847 · 1.136 · 17885.4 · 1.133 | 511 / 45.6% |
| 70% | Short + Medium | 431 / 2400 | 410345 · 0.957 · -19556.6 | 67934 · 1.241 · 22931.8 · 1.241 | 546 / 43.4% |
| 75% | Short | 667 / 2400 | 464618 · 1.014 · 6778.4 | 118990 · 1.368 · 50731.6 · 1.366 | 562 / 48.6% |
| 75% | Medium | 1097 / 2408 | 321624 · 1.063 · 20946.2 | 163678 · 1.141 · 25524.5 · 1.137 | 542 / 41.9% |
| 75% | Short + Medium | 641 / 2400 | 426448 · 1.089 · 38285.0 | 111386 · 1.322 · 44193.2 · 1.322 | 553 / 45.9% |
| 80% | Short | 541 / 2400 | 480069 · 1.000 · -160.9 | 92182 · 1.353 · 40815.7 · 1.353 | 514 / 44.2% |
| 80% | Medium | 1077 / 2412 | 371184 · 1.154 · 57186.7 | 190944 · 1.362 · 69893.4 · 1.361 | 558 / 45.3% |
| 80% | Short + Medium | 633 / 2400 | 508061 · 1.014 · 7304.0 | 126162 · 1.313 · 47787.4 · 1.309 | 568 / 42.4% |
| 85% | Short | 761 / 2400 | 547446 · 1.044 · 23983.8 | 156532 · 1.325 · 54860.7 · 1.320 | 562 / 45.6% |
| 85% | Medium | 903 / 2400 | 468447 · 1.078 · 36525.2 | 179450 · 1.331 · 63320.1 · 1.327 | 563 / 41.4% |
| 85% | Short + Medium | 828 / 2400 | 560991 · 1.008 · 4756.3 | 182188 · 1.314 · 60739.3 · 1.314 | 578 / 43.3% |
| 90% | Short | 547 / 2400 | 509081 · 0.955 · -24028.0 | 95637 · 1.106 · 13281.4 · 1.106 | 544 / 39.5% |
| 90% | Medium | 1060 / 2400 | 453172 · 1.105 · 47175.3 | 217325 · 1.270 · 58548.1 · 1.267 | 561 / 42.6% |
| 90% | Short + Medium | 854 / 2400 | 438263 · 0.988 · -5767.7 | 153283 · 1.068 · 13004.0 · 1.068 | 567 / 40.6% |
| 95% | Short | 690 / 2400 | 290604 · 1.183 · 50435.0 | 75601 · 1.282 · 24870.0 · 1.282 | 437 / 45.3% |
| 95% | Medium | 1015 / 2400 | 278377 · 1.060 · 16628.1 | 121755 · 1.135 · 18792.3 · 1.130 | 535 / 42.2% |
| 95% | Short + Medium | 1681 / 2430 | 190405 · 1.274 · 48185.5 | 125095 · 1.324 · 43593.4 · 1.300 | 555 / 45.6% |
| 100% | Short | 642 / 2400 | 81948 · 1.346 · 24841.5 | 17361 · 1.513 · 8377.6 · 1.513 | 224 / 47.8% |
| 100% | Medium | 1183 / 2400 | 61706 · 1.025 · 1649.2 | 29838 · 1.186 · 6033.8 · 1.186 | 206 / 46.1% |
| 100% | Short + Medium | 426 / 2400 | 56382 · 1.264 · 14946.1 | 8631 · 1.468 · 4945.2 · 1.468 | 213 / 53.5% |

The 100% threshold requires unanimity of active, non-conflicting source votes; quiet sources abstain. The equality boundary is inclusive.

## Aggregate performance

| Cohort | Independent closes | PF | Net points | PF including endpoint marks | Net including marks |
|---|---:|---:|---:|---:|---:|
| All configs | 9878623 | 1.013 | 137972.4 | 1.007 | 68653.9 |
| IS-qualified pool | 2590578 | 1.260 | 774087.5 | 1.257 | 766777.0 |

### Exit range

| Range | Closes | PF | Net points |
|---|---:|---:|---:|
| short | 401082 | 1.234 | 88403.1 |
| normal | 812901 | 1.221 | 197036.3 |
| long | 1376595 | 1.286 | 488648.1 |

### Strategy type

| Type | Closes | PF | Net points |
|---|---:|---:|---:|
| normal | 728494 | 1.265 | 263964.4 |
| trailing | 1862084 | 1.258 | 510123.1 |

Qualified pool: 18328 config-side IDs (18300 standard, 28 historic). Historic diagnostics: 324 evaluated candidates from 27 pairs; 25 range-tagged configs passed; 266 failed PF/net, 48 failed DDR, 0 lacked the required closes. PF floors: sh 1.1, gn 1.12, lg 1.18.

## Hourly results and volume factor

Across 720 OOS clock hours, 706 had settled closes; 289 were green (40.9% of active hours). Median active-hour PF 0.315. Worst active hour: 2026-09-23T14:00:00.000Z, 28814 closes, PF 0.023, net -133326.4 points. Groups are shown individually above; positive results were not universal.

| Size factor | Unit PF | Closes | Linear size-only net points |
|---:|---:|---:|---:|
| 1× | 1.260 | 2590578 | 774087.5 |
| 8× | 1.260 | 2590578 | 6192699.8 |
| 22× | 1.260 | 2590578 | 17029924.4 |

Default coordinator extra factor is 8× normal; other combined-indication defaults are neutral at 1×. A multiplier scales losses and gains together and cannot improve PF. These points omit compounding, concurrent exposure, caps, funding and execution effects.

## Earlier-result comparison

| Cohort | Previous run | Expanded full-grid run |
|---|---:|---:|
| 60–80% baseline 36-protection sample | 35607 closes · PF 1.284 · 13694.8 points | 35607 closes · PF 1.284 · 13694.8 points |
| 60–80% full runtime grid | — | 1226374 closes · PF 1.275 · 403399.3 points |
| 60–80% historic protections | 2262 closes · PF 1.165 · 483.4 points | 1508 closes · PF 1.165 · 322.3 points |
| Added 85–100% standard protections | — | 1361247 closes · PF 1.246 · 369895.2 points |
| Added 85–100% historic protections | — | 1449 closes · PF 1.277 · 470.7 points |

The baseline's 1,080 standard config-side rows match exactly (zero count/PF/net mismatches). The historic pool is smaller at the old thresholds because each range now has to clear its own stage PF floor. For the old-ratio baseline sample, active-hour green share moved from 43.9% (277/631) to 41.6% (280/673). Across the full expanded grid it is 40.9% (289/706); adding configs increased activity, not consistency.

## Regression and limits

Compared to the previous standard sample: 1080 of 1080 config-side rows, 0 mismatches. Historic rows may change because of the corrected per-range PF gates.

- The runner asserts all ratios, identities, complete runtime-grid count, baseline-sample membership, data hash and IS/OOS boundaries.
- This does not test venue fills, account-level position-stack reconciliation or live order handling. Existing offline accounting/position tests cover those code paths separately.
- No external orders were sent. Cached-market results do not establish future profitability, safe sizing or success in every hour.
