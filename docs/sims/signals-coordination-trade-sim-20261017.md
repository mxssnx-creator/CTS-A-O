# Signals Coordination offline trade simulation — 2026-10-17

This is a retrospective, offline coordinator simulation using the exact frozen candle cache referenced by `docs/signal-research-protocol-20261016.json` (SHA-256 `09efe84ff135bad1458995ac36df9bb209e1d56fab671375d171b3c76abdefa4`). The cache was recovered from a sibling workspace. It covers eight public-market symbols from 2026-07-16 through 2026-10-14; the measured window is 53 IS days followed by 30 OOS days, split at 2026-09-14 21:25 UTC. The cache had previously been used for Tactic research, so this is retrospective evidence, not a fresh global or forward sample.

## Frozen evaluation scope

- Current default source selection: 63 enabled sources; minimum 3 directional source votes.
- All five domination ratios (60%, 65%, 70%, 75%, 80%) × all three input masks (Short only, Medium only, both) ran independently on the default 15-minute signal lane.
- Exit families were Short (`sh`), Normal/General (`gn`) and Long (`lg`); normal and trailing config types and both directions were evaluated.
- Standard protections: the runtime produces 1,200 configurations across these three exit families. The market replay used a deterministic even-spaced subset of 36 from the runtime grid's generation order: six normal and six trailing protections per range. It did not score every standard protection in the full grid.
- Historical MFE: 180 candidate templates were calculated across the 15 coordinator identities using only IS data. Five passed the existing PF/drawdown gates and were cloned into 15 range-tagged protections. No historical configs were fabricated for identities with no passing history.
- The resulting research matrix contained 1,110 config-side rows: 1,080 standard sampled rows and 30 historical rows. Each config was simulated independently across eight symbols. OOS positions started flat. Signals used the current `entrySignal(follow, ...)`, default tactics and Signal filter; each simulated close paid 0.20% modeled round-trip cost.
- IS selection required at least 30 settled closes, PF ≥ 1.1, positive net, and PF ≥ 1.1 with endpoint marks. All OOS results are descriptive; no OOS winner was promoted or retuned.

PF is the gross-positive / absolute-gross-negative ratio of unit net returns. Return points are sums of independent trade percentages, not account ROI. Config copies overlap in symbols, sides and time; the pooled count is not a portfolio order count.

## OOS results by domination and input mask

“All configs” includes every evaluated row, including rows that did not pass IS. “IS-qualified” includes only the config-side IDs frozen before OOS. A group with zero IS-qualified rows has no selected OOS sample.

| Domination | Inputs | IS-qualified / evaluated | All-config OOS: closes · PF · net points | IS-qualified OOS: closes · PF · net points · PF with endpoint marks |
|---:|---|---:|---:|---:|
| 60% | Short | 5 / 72 | 13,599 · 0.868 · −2,263.6 | 679 · 1.385 · +465.0 · 1.385 |
| 60% | Medium | 5 / 72 | 7,193 · 0.989 · −92.0 | 486 · 1.237 · +167.5 · 1.215 |
| 60% | Short + Medium | 5 / 72 | 11,182 · 0.936 · −863.3 | 620 · 1.357 · +398.2 · 1.331 |
| 65% | Short | 9 / 72 | 13,854 · 0.871 · −2,189.3 | 1,289 · 1.440 · +885.8 · 1.438 |
| 65% | Medium | 28 / 72 | 7,744 · 1.031 · +275.8 | 3,133 · 1.173 · +699.2 · 1.161 |
| 65% | Short + Medium | 0 / 72 | 11,747 · 0.906 · −1,353.7 | 0 · — · 0.0 · — |
| 70% | Short | 14 / 72 | 13,732 · 0.985 · −241.9 | 2,259 · 1.329 · +1,103.4 · 1.327 |
| 70% | Medium | 24 / 72 | 8,515 · 0.998 · −20.5 | 2,870 · 1.102 · +425.8 · 1.090 |
| 70% | Short + Medium | 15 / 72 | 12,119 · 0.934 · −963.0 | 2,248 · 1.256 · +899.6 · 1.256 |
| 75% | Short | 17 / 72 | 13,745 · 1.000 · +1.3 | 2,786 · 1.418 · +1,533.6 · 1.416 |
| 75% | Medium | 38 / 84 | 11,114 · 1.061 · +741.3 | 5,563 · 1.121 · +796.1 · 1.120 |
| 75% | Short + Medium | 20 / 72 | 12,652 · 1.057 · +790.1 | 3,347 · 1.312 · +1,432.8 · 1.312 |
| 80% | Short | 16 / 72 | 14,260 · 0.981 · −304.7 | 2,605 · 1.362 · +1,306.9 · 1.362 |
| 80% | Medium | 39 / 90 | 13,160 · 1.125 · +1,895.4 | 6,427 · 1.333 · +2,568.9 · 1.317 |
| 80% | Short + Medium | 19 / 72 | 15,089 · 1.005 · +87.3 | 3,557 · 1.306 · +1,495.4 · 1.294 |

The “evaluated” count rises above 72 in some groups because the IS history calculator added range-tagged historic protections. These rows remain grouped with their exact coordinator identity.

## Aggregate, ranges, strategy types and history

| Cohort | OOS closes | PF | Net return points |
|---|---:|---:|---:|
| All evaluated configs | 179,705 | 0.978 | −4,500.8 |
| Entire IS-qualified pool | 37,869 | 1.277 | +14,178.2 |
| IS-qualified standard sample | 35,607 | 1.284 | +13,694.8 |
| IS-qualified historic MFE configs | 2,262 | 1.165 | +483.4 |

The IS-qualified pool had a 56.2% win rate and 123 open endpoint marks. Including those marks, PF was 1.270 and net return points were +13,904.6. Historical calculation diagnostics were 15 coordinator pairs checked, 180 candidates evaluated, five qualified templates (15 after range tagging), 155 PF rejections and 20 drawdown-ratio rejections.

| Exit family | OOS closes | PF | Net return points |
|---|---:|---:|---:|
| Short | 8,713 | 1.194 | +1,897.7 |
| Normal / General | 12,884 | 1.249 | +4,339.2 |
| Long | 16,272 | 1.331 | +7,941.2 |

| Strategy type | OOS closes | PF | Net return points |
|---|---:|---:|---:|
| Normal | 21,206 | 1.259 | +7,735.0 |
| Trailing | 16,663 | 1.301 | +6,443.2 |

## Hourly consistency and volume factor

Of 720 OOS clock hours, 631 had settled closes; 277 of those active hours were net positive (43.9%). Median active-hour PF was 0.328. The worst active hour was 2026-09-23 14:00 UTC: 413 closes, PF 0.002, net −2,211.4 return points. The sample does not show consistent positive hourly results.

The default coordinator volume factor is 8×. Applying one constant size multiplier preserves unit-return PF and linearly scales both gains and losses before account caps, compounding, simultaneous position limits and execution effects:

| Volume factor | Unit PF | Simulated closes | Linear size diagnostic, net return points |
|---:|---:|---:|---:|
| 1× | 1.277 | 37,869 | +14,178.2 |
| 8× | 1.277 | 37,869 | +113,425.4 |
| 22× | 1.277 | 37,869 | +311,919.9 |

These are size-only diagnostics, not cash P&L or an account-level simulation. The 8× factor increases loss size as well as gain size; this replay does not establish a safe or profitable live notional.

## Verification and limits

- Offline focused core run after correcting a flaky synthetic E2E assertion: **422 passed, 0 failed** across coordination, history, Signals, volume factors, execution accounting, order quantity, statistics and settings-completeness tests.
- `npm run typecheck` passed. The already completed branch checks also include development build, lint and UI tests; the broad `npm test` command was not run because its core stage had previously been blocked by automatic review over potential external BingX access.
- No exchange credentials or orders were used. This replay does not test live venue fills, funding, portfolio netting, account caps or multi-order position-stack reconciliation. Existing offline execution/ledger tests cover order ownership, partial fills, closes and statistics, but this market PF is not a live execution result.
- The all-config diagnostic loses, hourly consistency is weak, the protection grid is sampled, and the candle cache is reused retrospective evidence. Do not interpret the selected pool as a deployable portfolio or change live settings from these results alone.
