# Signals Coordination expanded offline replay

Run: 2026-10-17T05:04:04.995Z. Retrospective offline simulation on the same frozen candle cache as the 2026-10-17 baseline; it is not a forward or live-account result.

**Evidence status:** the figures below predate the runtime/replay exact-timestamp tie-order correction. The matching raw report and SHA-256-verified candle cache are not present in this checkout, so the pre-Base and post-Base market metrics and seven reported admissions have not been rerun against the corrected ordering. Treat them as historical diagnostics, not current validation.

## Scope

- Five ratios (60%, 65%, 70%, 75%, 80%) × three independent Short / Medium / combined source-input masks; the 80% identity covers through 100%.
- 63032 config-side rows across 15 coordinator identities, both directions, Short / Normal / Long exit tags, Normal / Trailing strategies, and historic configs that cleared IS gates.
- Full runtime grid: 2100 protections per coordinator identity (750 Normal + 1350 Trailing) × 15 identities = 31500 protection identities / 63000 directional config-side rows. Normal expanded from 4,500 to 11,250 unique protections across the 15 identities with 12 h, 32 h and 48 h untrailed holds. Trailing expanded from 13,500 to 20,250 with 48 h holds; the 48 h cells produced Strategy Base passes on the frozen IS replay. The 36-protection subset is an internal v2 coverage comparison, not v1 semantic parity.
- At the IS cutoff, each pooled long/short config is admitted only by the runtime Strategy Base evaluator, including rolling last-N PF, DDR, DDT, pre-window, range and stability gates. The Signals pair-level Base toggle is off; Strategy Base validation remains required for each protection config. No separate full-period IS PF/net screen is imposed, because runtime selects against its rolling evaluation window. Endpoint marks are reported as OOS diagnostics and are not an IS admission gate.
- Cost 0.20% round trip. PF uses gross-positive / absolute-gross-negative unit returns. Pooled results count overlapping independent configs and are not portfolio ROI or account orders.

Cache SHA-256: 09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4. 8 symbols, IS 2026-07-23T21:25:00.000Z through 2026-09-14T21:25:00.000Z, OOS through 2026-10-14T21:25:00.000Z. The cache was already used for tactic research, so this evidence is retrospective.

## OOS by domination ratio and input mask

| Ratio band | Inputs | IS-qualified / config sides | Rejections (pair Base / Strategy Base) | All configs: closes · PF · net points | Qualified: closes · PF · net points · PF with marks | Active / green hours |
|---:|---|---:|---|---:|---:|---:|
| 60–65% | Short | 0 / 4200 | 0 / 4200 | 649399 · 0.908 · -75210.0 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 60–65% | Medium | 0 / 4202 | 0 / 4202 | 412065 · 1.001 · 593.1 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 60–65% | Short + Medium | 14 / 4204 | 0 / 4190 | 529046 · 0.980 · -12872.4 | 1570 · 1.025 · 72.5 · 1.008 | 320 / 52.8% |
| 65–70% | Short | 0 / 4200 | 0 / 4200 | 694309 · 0.917 · -70170.3 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 65–70% | Medium | 0 / 4206 | 0 / 4206 | 504950 · 1.009 · 5333.2 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 65–70% | Short + Medium | 0 / 4200 | 0 / 4200 | 569833 · 0.972 · -18917.1 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 70–75% | Short | 0 / 4200 | 0 / 4200 | 710638 · 1.046 · 35826.3 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 70–75% | Medium | 0 / 4208 | 0 / 4208 | 574867 · 1.032 · 21366.0 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 70–75% | Short + Medium | 0 / 4200 | 0 / 4200 | 652612 · 0.988 · -9304.7 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 75–80% | Short | 0 / 4200 | 0 / 4200 | 802563 · 1.013 · 11833.1 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 75–80% | Medium | 0 / 4200 | 0 / 4200 | 697100 · 1.133 · 99358.5 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 75–80% | Short + Medium | 0 / 4200 | 0 / 4200 | 847448 · 1.005 · 4618.6 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 80–100% | Short | 0 / 4200 | 0 / 4200 | 817307 · 1.009 · 8356.3 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 80–100% | Medium | 0 / 4212 | 0 / 4212 | 632500 · 1.146 · 99849.4 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |
| 80–100% | Short + Medium | 0 / 4200 | 0 / 4200 | 862978 · 1.020 · 19370.4 | 0 · N/A · 0.0 · N/A | 0 / 0.0% |

Ratios are disjoint bands: 60%, 65%, 70%, and 75% each cover through (but exclude) the next lower edge; 80% covers the full range through 100%. Quiet sources abstain and only active, non-conflicting votes form the denominator.

## Aggregate performance

| Cohort | Independent closes | PF | Net points | PF including endpoint marks | Net including marks |
|---|---:|---:|---:|---:|---:|
| All configs | 9957615 | 1.011 | 120030.4 | 1.006 | 65809.1 |
| IS-qualified pool | 1570 | 1.025 | 72.5 | 1.008 | 23.1 |

### Exit range

| Range | Closes | PF | Net points |
|---|---:|---:|---:|
| short | 0 | N/A | 0.0 |
| normal | 1570 | 1.025 | 72.5 |
| long | 0 | N/A | 0.0 |

### Strategy type

| Type | Closes | PF | Net points |
|---|---:|---:|---:|
| normal | 695 | 1.012 | 14.6 |
| trailing | 875 | 1.036 | 57.8 |

### Strategy Base gates and passing trailing configurations

The runtime evaluator admitted 3 of 11250 unique Normal configs and 4 of 20266 unique Trailing configs on IS. First-failure counts: `{"normal":{"net":8565,"pf":1915,"pre":277,"lcb":282,"lastN":203,"rangeGate":1,"passed":3,"ddt":4},"trailing":{"net":17949,"pf":1687,"lcb":273,"pre":147,"lastN":201,"ddt":5,"passed":4}}`. Passing Trailing configs below rank by runtime-window PF, then last-N PF, using IS only.

| Coordinator / mask | Range | TP / SL / trail / hold | Last-N PF | Runtime-window PF | Runtime gate |
|---|---|---|---:|---:|---|
| r60-i3 | normal | 0.04 / 0.06 / 0.03 / 192 | 2.038 | 1.492 | pass |
| r60-i3 | normal | 0.042 / 0.063 / 0.0315 / 192 | 2.071 | 1.475 | pass |
| r60-i3 | normal | 0.038 / 0.0475 / 0.0285 / 192 | 1.735 | 1.333 | pass |
| r60-i3 | normal | 0.044 / 0.055 / 0.033 / 192 | 1.669 | 1.288 | pass |

Qualified pool: 14 config-side IDs (14 standard, 0 historic). Historic diagnostics: 180 evaluated candidates from 15 pairs; 16 range-tagged configs passed; 138 failed PF/net, 34 failed DDR, 0 lacked the required closes. PF floors: sh 1.1, gn 1.12, lg 1.18.

## Hourly results and volume factor

Across 720 OOS clock hours, 320 had settled closes; 169 were green (52.8% of active hours). Median active-hour PF 1.258. Worst active hour: 2026-10-08T15:00:00.000Z, 17 closes, PF 0.108, net -67.9 points. Groups are shown individually above; positive results were not universal.

| Size factor | Unit PF | Closes | Linear size-only net points |
|---:|---:|---:|---:|
| 1× | 1.025 | 1570 | 72.5 |
| 8× | 1.025 | 1570 | 579.7 |
| 22× | 1.025 | 1570 | 1594.3 |

Default coordinator extra factor is 8× normal; other combined-indication defaults are neutral at 1×. A multiplier scales losses and gains together and cannot improve PF. These points omit compounding, concurrent exposure, caps, funding and execution effects.

## Earlier-result comparison

| Current v2 cohort | Closes | PF | Net points | Active / green hours |
|---|---:|---:|---:|---:|
| 36-protection sample, all ratios | 0 | N/A | 0.0 | 0 / 0.0% |
| Full runtime grid, all ratios | 1570 | 1.025 | 72.5 | 320 / 52.8% |

The previous cumulative-threshold replay is not directly comparable with these v2 band results; its figures remain in the archived v1 report as historical reference only. The two current rows use identical selection rules and band semantics; the sample is a subset of the full runtime grid.

## Regression and limits

The runner asserts all ratio identities, band boundaries, complete runtime-grid count, sample membership, data hash, pair-level Base behavior, runtime Strategy Base/Last-N gates and IS/OOS boundaries. Empty qualified groups are rendered as N/A with rejection counts.

- The runner asserts all ratios, identities, complete runtime-grid count, baseline-sample membership, data hash and IS/OOS boundaries.
- This does not test venue fills, account-level position-stack reconciliation or live order handling. Existing offline accounting/position tests cover those code paths separately.
- No external orders were sent. Cached-market results do not establish future profitability, safe sizing or success in every hour.
