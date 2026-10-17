# Balance sizing and cap replay — 2026-10-17

## Scope

Offline replays of two adjacent 24-hour windows from the cached eight-symbol feed, each with 48 hours of prehistory. The windows are 2026-10-13 21:00–2026-10-14 21:00 UTC and 2026-10-12 21:00–2026-10-13 21:00 UTC. Both use the same feed and are not independent holdouts. Signals received no additional warmup. Starting balance was $10, sizing was 0.1% of realized equity per base order unit, leverage 10×, and modeled round-trip costs 0.20% per close. No exchange orders were sent.

The replay uses **unit-return PF** for normalized per-order returns and **cash PF** for balance-sized allocations. The two metrics can differ because caps, compounding, and funded allocations change the cash weights. Net cash and marked equity are reported separately.

## Cap comparison

Only the report-time position and gross caps changed within each window. Both settings applied to the same recorded trades.

| Window | Position / gross cap | Funded closes | Unit-return PF | Cash PF | Net cash | Max equity drawdown | Green / red / flat hours |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Oct 13–14 | 0.75× / 7× | 4,126 | 0.751 | 0.814 | −$0.16659 | $0.85049 (8.48%) | 10 / 10 / 4 |
| Oct 13–14 | **0.25× / 2×** | **4,588** | 0.794 | 1.038 | **+$0.01324** | **$0.20279 (2.03%)** | 10 / 10 / 4 |
| Oct 12–13 | 0.75× / 7× | 25,231 | 0.926 | 0.906 | −$0.32942 | $2.82372 (24.16%) | 7 / 17 / 0 |
| Oct 12–13 | **0.25× / 2×** | **25,446** | 0.942 | 0.974 | **−$0.02970** | **$0.80194 (7.63%)** | 6 / 18 / 0 |

The 0.25× per-position and 2× gross caps reduced drawdown and loss on both windows while funding slightly more closes. They did not make both windows profitable: unit PF remained below 1, and the adjacent day still had 18 red hours. These measured caps are now the equity-relative defaults in live settings, the settings UI, and replay fallback. This is a risk-control adjustment, not a profitability claim.

The uncapped comparison on Oct 12–13 ended at balance $4.83 and marked equity $1.97, with a 93.35% equity drawdown and 1,381 minutes above available equity. The old uncapped summary mixed unit-return PF with cash/equity outcomes; the reports now name the bases separately.

## Volume-factor checks

The base order unit is already balance-relative: 0.1% of realized equity, not a fixed order notional. A 0.05% test with 0.25× / 2× caps returned cash PF 0.845 and −$0.05231 on Oct 13–14, and cash PF 0.962 and −$0.04028 on Oct 12–13. It did not improve either cash result, so the base remains 0.1%.

All engine ranges and Signal short/medium factors default to neutral 1×. Micro's older factory value of 2.5× is migrated back to 1×; explicit custom values remain. A same-tape allocation sensitivity lowered Minimal, General, and Long to 0.6× while leaving other groups at 1×. It changed Oct 13–14 to cash PF 0.921 / −$0.04042, and Oct 12–13 to cash PF 0.949 / −$0.07906. That did not beat neutral sizing, so those ranges remain neutral rather than being tuned to these two days.

In the Oct 13–14 window, Signal Trailing had 146 funded closes, unit PF 11.63, and +$0.00499 net cash at 0.75× / 7× caps; Signal Normal had 3 losing closes and Trailing-only had 6 winning closes. On the adjacent day, Signals had 597 funded closes across types at unit PF 1.27 and +$0.01639 net cash at the 0.75× / 7× comparison caps. The Signal results do not offset the engine's weak ranges or establish repeatable performance.

## Configuration correction

`s2VolumeFactor` was introduced under a mistaken interpretation of “Stable-02,” which is a branch name. That independent setting has been removed from the runtime, simulator, and settings UI. Existing S2 relation sizing (`s2Increase`) and the separate Signal losing-hour hedge factor remain. The one-time settings migration removes the stray `s2VolumeFactor` while preserving configured relation increments and other custom settings.

Each report replay passed 127/127 consistency checks. This cached sample does not establish positive PF for every hour, range, or configuration, and it is not live or held-out evidence. See [the expanded Signal grid validation](../trailing-signal-expanded-grid-20261016.md) for configuration coverage.
