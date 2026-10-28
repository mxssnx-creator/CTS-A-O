# Low-Range short-to-medium window screen — 28 October 2026

This is a retrospective, unallocated research screen; it is not production execution, exchange fills, or a fresh holdout. It reruns the same cached 20-symbol Binance USD-M minute feed used by the earlier Low-Range studies. Initial evaluation is **2026-10-08 12:00–2026-10-09 12:00 UTC**; the forward window is **2026-10-09 12:00–2026-10-10 12:00 UTC**. The 24-hour samples overlap earlier examined research and should not be interpreted as independent evidence.

## Frozen scope

- 10 lookbacks: 1, 2, 3, 6, 9, 12, 18, 24, 36, 48 completed bars; 5 methods; 13 relations; 1m, 5m, 15m; 2 matched protection cells per source = **3,900 cells**.
- Short range only, step 3, SL ratio 1.0, modeled 0.15% round-trip cost, Normal TP plus a trailing reference at ratio 0.5; all use the measured 60-minute cap (bars scaled by timeframe).
- Base/range floors and `rangeGate` were enabled from the frozen runtime defaults: minimum 12 closes, range PF floor 1.1, last-N 75 and range PF 1.35.
- Forward entry screening now requires the exact config ID to have been in the initial validated set V, then rechecks its own direction at each later entry. This matches validated-seat processing; Base-only cells that never entered V are excluded from forward execution.

## Overall result

- Base passed **47/3,900** protection cells. **27** exact config IDs entered V; **27/94** direction contexts passed initial validation.
- Initial validated-direction PF was **2.905**. Those V config IDs produced **80** forward settled trades: **30 wins / 50 losses**, PF **0.683**, with 0 positions open at the end.
- Forward direction mix was 74 Long and 6 Short closes. The aggregate decline remains after excluding config IDs outside initial V; this screen therefore found no wrong-config-ID leak as the explanation. It does not demonstrate that the forward PF is high or stable.

## Per-window and timeframe listing

Each window/timeframe row contains 130 cells (65 method-relation sources × 2 protection variants). `Active IDs` counts configs entering initial V. PF fields use gross gains divided by gross losses; `—` means no settled forward trades.

| Window | TF | Cells | Base pass | Active IDs | Direction contexts | Initial directions passed | Historical PF | Forward closes | Forward PF |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 1 | 5m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 1 | 15m | 130 | 5 | 1 | 10 | 1 | 2.046 | 6 | 0.679 |
| 2 | 1m | 130 | 1 | 0 | 2 | 0 | — | 0 | — |
| 2 | 5m | 130 | 1 | 1 | 2 | 1 | 3.599 | 1 | 0.000 |
| 2 | 15m | 130 | 4 | 0 | 8 | 0 | — | 0 | — |
| 3 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 3 | 5m | 130 | 12 | 10 | 24 | 10 | 3.734 | 22 | 1.917 |
| 3 | 15m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 6 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 6 | 5m | 130 | 3 | 2 | 6 | 2 | 1.899 | 3 | 0.000 |
| 6 | 15m | 130 | 6 | 4 | 12 | 4 | 2.313 | 4 | 0.117 |
| 9 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 9 | 5m | 130 | 2 | 2 | 4 | 2 | 2.317 | 22 | 1.447 |
| 9 | 15m | 130 | 1 | 0 | 2 | 0 | — | 0 | — |
| 12 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 12 | 5m | 130 | 7 | 6 | 14 | 6 | 2.643 | 21 | 0.461 |
| 12 | 15m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 18 | 1m | 130 | 1 | 1 | 2 | 1 | 2.508 | 1 | 0.000 |
| 18 | 5m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 18 | 15m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 24 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 24 | 5m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 24 | 15m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 36 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 36 | 5m | 130 | 4 | 0 | 8 | 0 | — | 0 | — |
| 36 | 15m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 48 | 1m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 48 | 5m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |
| 48 | 15m | 130 | 0 | 0 | 0 | 0 | — | 0 | — |

## Exact active config and direction rows

These rows include both directions for every config ID that entered initial V. A row whose direction did not pass at the initial timestamp can only contribute later trades when its own direction gate passes at that entry; the config ID still has to be in V. `Normal` and `Trail` distinguish the two protection cells.

| Window | TF | Protection | Direction | Initial side | Initial N / PF or fail | Forward closes | Forward GP | Forward GL | Forward PF | Config ID |
|---:|---:|---|---:|---|---:|---:|---:|---:|---:|---|
| 1 | 15m | Normal | Long | pass | 20 / 2.046 | 6 | 0.012860 | 0.018935 | 0.679 | `follow|low-range-1-edge-turn-trend-breakout@m15|tp0.75|sl0.75|tr0|h4|sh` |
| 1 | 15m | Normal | Short | fail | 9 / closes | 0 | 0.000000 | 0.000000 | — | `follow|low-range-1-edge-turn-trend-breakout@m15|tp0.75|sl0.75|tr0|h4|sh` |
| 2 | 5m | Normal | Long | pass | 14 / 3.599 | 1 | 0.000000 | 0.009000 | 0.000 | `follow|low-range-2-edge-turn-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 2 | 5m | Normal | Short | fail | 15 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-2-edge-turn-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Trail | Long | pass | 38 / 3.049 | 2 | 0.000000 | 0.004053 | 0.000 | `follow|low-range-3-breakout-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Trail | Short | fail | 28 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-breakout-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Normal | Long | pass | 38 / 3.447 | 5 | 0.006000 | 0.004483 | 1.338 | `follow|low-range-3-breakout-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Normal | Short | fail | 28 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-breakout-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Trail | Long | pass | 38 / 3.049 | 2 | 0.000000 | 0.004053 | 0.000 | `follow|low-range-3-breakout-trend-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Trail | Short | fail | 28 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-breakout-trend-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Normal | Long | pass | 38 / 3.447 | 5 | 0.006000 | 0.004483 | 1.338 | `follow|low-range-3-breakout-trend-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Normal | Short | fail | 28 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-breakout-trend-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Trail | Long | pass | 24 / 4.002 | 2 | 0.006000 | 0.000428 | 14.033 | `follow|low-range-3-compression-break-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Trail | Short | fail | 12 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-compression-break-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Normal | Long | pass | 24 / 4.555 | 2 | 0.006000 | 0.000428 | 14.033 | `follow|low-range-3-compression-break-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Normal | Short | fail | 12 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-compression-break-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Trail | Long | pass | 24 / 4.002 | 2 | 0.006000 | 0.000428 | 14.033 | `follow|low-range-3-compression-break-trend-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Trail | Short | fail | 12 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-compression-break-trend-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Normal | Long | pass | 24 / 4.555 | 2 | 0.006000 | 0.000428 | 14.033 | `follow|low-range-3-compression-break-trend-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Normal | Short | fail | 12 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-compression-break-trend-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Trail | Long | pass | 20 / 5.079 | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Trail | Short | fail | 17 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 3 | 5m | Normal | Long | pass | 20 / 5.143 | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 3 | 5m | Normal | Short | fail | 17 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-3-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 6 | 5m | Normal | Long | pass | 40 / 1.785 | 2 | 0.000000 | 0.011162 | 0.000 | `follow|low-range-6-mid-reclaim-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 6 | 5m | Normal | Short | fail | 42 / lcb | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-mid-reclaim-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 6 | 5m | Normal | Long | pass | 12 / 2.475 | 1 | 0.000000 | 0.009000 | 0.000 | `follow|low-range-6-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 6 | 5m | Normal | Short | fail | 9 / closes | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 6 | 15m | Trail | Long | fail | 13 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-edge-turn-trend-move-reverse@m15|tp0.75|sl0.75|tr0.55|h4|sh` |
| 6 | 15m | Trail | Short | pass | 14 / 2.726 | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-edge-turn-trend-move-reverse@m15|tp0.75|sl0.75|tr0.55|h4|sh` |
| 6 | 15m | Normal | Long | fail | 13 / net | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-edge-turn-trend-move-reverse@m15|tp0.75|sl0.75|tr0|h4|sh` |
| 6 | 15m | Normal | Short | pass | 14 / 2.092 | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-edge-turn-trend-move-reverse@m15|tp0.75|sl0.75|tr0|h4|sh` |
| 6 | 15m | Trail | Long | fail | 16 / pf | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-edge-turn-trend@m15|tp0.75|sl0.75|tr0.55|h4|sh` |
| 6 | 15m | Trail | Short | pass | 19 / 2.421 | 2 | 0.001051 | 0.009000 | 0.117 | `follow|low-range-6-edge-turn-trend@m15|tp0.75|sl0.75|tr0.55|h4|sh` |
| 6 | 15m | Normal | Long | fail | 16 / lcb | 0 | 0.000000 | 0.000000 | — | `follow|low-range-6-edge-turn-trend@m15|tp0.75|sl0.75|tr0|h4|sh` |
| 6 | 15m | Normal | Short | pass | 19 / 2.179 | 2 | 0.001051 | 0.009000 | 0.117 | `follow|low-range-6-edge-turn-trend@m15|tp0.75|sl0.75|tr0|h4|sh` |
| 9 | 5m | Trail | Long | pass | 15 / 2.456 | 11 | 0.024369 | 0.015912 | 1.532 | `follow|low-range-9-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 9 | 5m | Trail | Short | fail | 9 / closes | 0 | 0.000000 | 0.000000 | — | `follow|low-range-9-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 9 | 5m | Normal | Long | pass | 15 / 2.192 | 11 | 0.024369 | 0.017781 | 1.370 | `follow|low-range-9-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 9 | 5m | Normal | Short | fail | 9 / closes | 0 | 0.000000 | 0.000000 | — | `follow|low-range-9-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 12 | 5m | Trail | Long | fail | 9 / closes | 1 | 0.000826 | 0.000000 | no-loss | `follow|low-range-12-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 12 | 5m | Trail | Short | pass | 15 / 2.539 | 1 | 0.000000 | 0.000720 | 0.000 | `follow|low-range-12-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 12 | 5m | Normal | Long | fail | 9 / closes | 1 | 0.000826 | 0.000000 | no-loss | `follow|low-range-12-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 12 | 5m | Normal | Short | pass | 15 / 2.271 | 1 | 0.000000 | 0.000720 | 0.000 | `follow|low-range-12-mid-reclaim-trend-breakout-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 12 | 5m | Trail | Long | pass | 23 / 2.450 | 8 | 0.012415 | 0.024875 | 0.499 | `follow|low-range-12-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 12 | 5m | Trail | Short | fail | 24 / lcb | 0 | 0.000000 | 0.000000 | — | `follow|low-range-12-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 12 | 5m | Normal | Long | pass | 23 / 2.450 | 7 | 0.012000 | 0.024093 | 0.498 | `follow|low-range-12-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 12 | 5m | Normal | Short | fail | 24 / lcb | 0 | 0.000000 | 0.000000 | — | `follow|low-range-12-mid-reclaim-trend-breakout@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 12 | 5m | Trail | Long | pass | 24 / 2.960 | 1 | 0.000000 | 0.003081 | 0.000 | `follow|low-range-12-mid-reclaim-trend-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 12 | 5m | Trail | Short | fail | 23 / lastN | 0 | 0.000000 | 0.000000 | — | `follow|low-range-12-mid-reclaim-trend-move-reverse@m5|tp0.75|sl0.75|tr0.55|h12|sh` |
| 12 | 5m | Normal | Long | pass | 24 / 3.145 | 1 | 0.000000 | 0.003081 | 0.000 | `follow|low-range-12-mid-reclaim-trend-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 12 | 5m | Normal | Short | fail | 23 / lcb | 0 | 0.000000 | 0.000000 | — | `follow|low-range-12-mid-reclaim-trend-move-reverse@m5|tp0.75|sl0.75|tr0|h12|sh` |
| 18 | 1m | Normal | Long | pass | 16 / 2.508 | 1 | 0.000000 | 0.009000 | 0.000 | `follow|low-range-18-mid-reclaim-trend-breakout-move-follow@m1|tp0.75|sl0.75|tr0|h60|sh` |
| 18 | 1m | Normal | Short | fail | 10 / closes | 0 | 0.000000 | 0.000000 | — | `follow|low-range-18-mid-reclaim-trend-breakout-move-follow@m1|tp0.75|sl0.75|tr0|h60|sh` |

## Exit-cap check and interpretation

The separately audited 5m production-path cohort in [ACTIVE-EXECUTED-5M-20261028.md](ACTIVE-EXECUTED-5M-20261028.md) is a different 24-hour period. On that cohort, the best tested maximum hold was **60 minutes** among 15/30/60/180; 180 minutes was worse (PF 0.2706 vs 0.4357 at 60). Nevertheless, 86.6% of 60-minute executed closes were time exits, average hold was 56.54 minutes, and those time exits had PF 0.3434 and net −338.9 model units. This establishes time exits as the dominant losing exit class in that cohort, but raising the cap to 180 minutes did not fix expectancy. It is not evidence of venue fills.

The Base-to-forward PF drop is reproduced even when forward candidates are restricted to exact initial V config IDs. The evidence points to forward/regime deterioration plus time-cap exits, rather than invalid IDs being seated. The tests and exit controls can ensure configs, directions, targets, and protection are processed consistently; they cannot guarantee future PF. New ranges stay opt-in pending untouched forward validation.

## Reproduction seal

- Run: `node --experimental-strip-types --no-warnings scripts/low-range-short-24h-research.mjs <fresh-output-dir> --window-screen`.
- Completed cells: 3,900; elapsed: 24.77 s; peak process RSS: 386,748,416 bytes.
- Ledger SHA-256: `ce1a7f133c0bcd3644cb67fcb6b62003802fde369ecf57e57b63904928b390c7`.
- Protocol source hash: `9b6bafecb148c1ff5085830766e62a4a03aa4f90b42161e61cc519330cc456af`; test hash: `4668d1e1076f0f655d4dee730415a73540cda3ff33edc237487b06cc224375a7`; runner hash: `6b7e2c5d002946e4ce3448348d236e75ec7113798c190271468e61ac3da2969b`; feed hash: `a7beade8b9f2da1f5c2d5fda9b8ef32a4ce5bcc045ad10c67cd5678333c4224e`.
