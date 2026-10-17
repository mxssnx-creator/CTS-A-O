# Signals coordination sizing comparison — 2026-10-17

## Replay setup

This is an offline replay using the same cached four-symbol feed as the expanded Signal run: ATOM, APT, NEAR, and DOT; 48 hours of prehistory; 24 scored hours from 2026-10-13 21:00 to 2026-10-14 21:00 UTC; 1/5/15/30 minute lanes; simulated orders; and 0.20% round-trip costs. The full run was repeated after building the current core worker. Only the Stable-02 volume factor changed between the comparisons; `s2Increase` remained 0.4, the hedge stayed disabled, and the independent hedge factor remained neutral.

## Stable-02 factor comparison

| S2 volume factor | Funded closes | Return PF | Cash PF | Net | Positive / negative / flat hours |
|---:|---:|---:|---:|---:|---:|
| 1.0× | 2,184 | 4.7231 | 2.0245 | +$0.4453 | 14 / 4 / 6 |
| 1.4× | 2,184 | 4.7231 | 2.0245 | +$0.4453 | 14 / 4 / 6 |
| 1.6× | 2,184 | 4.7231 | 2.0245 | +$0.4453 | 14 / 4 / 6 |

Each run contained 2,381 virtual closes, including 197 orders with zero allocation. The 572 Stable-02-adjusted closes had the same realized `coordVol` distribution in all three runs: 223 at 1.1429×, 3 at 1.3333×, 171 at 1.6×, and 175 at 1.8×. The configured increase already reached the Stable-02 ceiling or the lower shared Block/risk allocation cap on this slice, so increasing its independent factor did not change orders, return PF, cash PF, or hourly outcomes. No negative-hour hedge entries were selected.

The factor remains available as a per-coordination setting but stays neutral by default because the measured replay showed no benefit from raising it. The hedge factor is tested separately in the synthetic entry-sizing integration test; the historical 24-hour replay did not activate the hedge.

## Signal and range outcomes

The expanded standard grid requested 10,836 Signal configs across 126 active source/range combinations. The 24-hour report captured 11,146 Signal config rows including retained/historical rows and processed every hourly step (24/24). Ten representative Signal pairs passed the diagnostic gate, 202 Signal units were active, and only 15 Signal closes were funded. Their return PF was 0.0309, with 2 wins and 13 losses (−$0.0073). The configuration grid processed successfully, but this sample does not support a high-PF Signal claim.

| Range | Funded closes | Return PF | Net |
|---|---:|---:|---:|
| Micro | 434 | 1.5406 | −$0.0268 |
| Minimal | 1,717 | 7.3362 | +$0.4823 |
| Short | 0 | unavailable | $0.0000 |
| General | 0 | unavailable | $0.0000 |
| Long | 1 | 0.0000 | −$0.0073 |
| Wide | 17 | 11.3408 | +$0.0043 |
| Signals | 15 | 0.0309 | −$0.0073 |

General, Long, and Wide each processed their tapes through all 24 hourly steps. General generated candidate/order activity but had no funded settled close; Long had one funded loss; Wide had 17 funded closes. The corresponding full range-grid, sizing, and execution tests passed. The sparse funded counts for General and Long are not a config-processing failure and do not justify loosening gates from this sample.

## Verification and limits

- Focused Signal/range/live-sizing/audit/simulation bundle: 220/220 passed.
- Signal research and progress capture tests: 11/11 passed.
- TypeScript typecheck passed.
- Development client, SSR, and core-worker build passed.
- Scoped ESLint passed with four existing unused-variable warnings; full ESLint passed after marking the CommonJS preload's required `require()` calls as intentional.
- The 24-hour replay is retrospective and uses one correlated four-symbol market window. It is not held-out evidence, venue execution, or proof of positive PF every hour. No qualification gate or numeric default was loosened or tuned to this sample.
