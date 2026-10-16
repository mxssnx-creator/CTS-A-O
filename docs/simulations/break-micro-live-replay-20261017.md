# Break Micro live processing and replay verification

Tested source: `f5e50d97199c1c977fe81fdd7077cd6b68cbfdb6` (tree
`b140f5bb2c0dbd63a4b121263a498f56c5f734ed`), prepared as a follow-up on
`feat/break-micro-short-channel-20261017` after PR #153 merged its live refresh
path; follow-up PR [#155](https://github.com/mxssnx-creator/CTS-A-O/pull/155).
Test code was based on main
`83585ef6b12c215fa0ee6a0dd2f8cfacba35b6cf`.

## Live processing path

- The default 100 ms runtime tick checks for newly closed 1m bars. The market
  pull waits for the close plus a 2-second exchange publication grace.
- Fast entries default to selected Break configs. A 5m or 15m config refreshes
  only when its own lane closes. `CTS_CORE_FAST_ENTRIES=1` enables all selected
  indication types; `=off` disables this fast path.
- A priority worker rebuilds only selected tape IDs from a bounded recent
  candle tail, using shared bar buffers. Refreshed tapes are published to both
  Entries and Overall; the usual entry checks still apply.
- Signals more than 15 seconds after the candle close are suppressed, including
  when the worker is unavailable or processing runs long. The status records
  `delayMs` and the suppression reason. Replay/backtest never invokes this live
  path.

These are verified runtime code paths. This workspace has no authenticated
exchange host, so no live venue run, order, deployment or reload is claimed.

## Matched 9-symbol replay

Both arms used the same cached public 1m feed and the same six-hour pre-trade
evaluation plus six-hour trade window. Costs, tactics, sizing, range and exit
settings were held fixed. The qualification floor stayed at 12 Base closes and
return PF ≥ 1.10. No gate was relaxed for the main comparison.

| Measure | Legacy Micro Break | Updated Break Micro |
|---|---:|---:|
| Indication IDs | 4 | 60 |
| Base pairs evaluated | 20 | 60 |
| Base pairs passed | 0 | 0 |
| Simulated orders | 0 | 0 |
| Return PF / win rate | Unavailable | Unavailable |
| Flat UTC hourly buckets | 6/6 | 6/6 |
| Base compute time | 412 ms | 1,272 ms |
| Peak RSS | 368 MB | 413 MB |

No config passed the unchanged Base gate, so neither arm produced scored
orders. PF and win rate are **unavailable**, not zero. All six trade-window
hours had no closes; hourly success is therefore unmeasured. The updated set
did not demonstrate more orders, better PF or positive hourly success on this
sample. It also used more Base compute time and memory because it evaluates
three times as many pairs.

The updated catalog contains 144 total identities: 84 standard plus 60 Micro.
The 60-ID replay covers the Micro-eligible 5m/15m anchors, including the new
8-bar Donchian and 8-bar retest variants. Each keeps separate profile and
drawdown identities.

## Reproducibility and limits

- Run directory: `runs/break-micro-9x6-retro-20261015/fastchannels-9x6-20261017/`
- Symbols: BTC, ETH, SOL, XRP, BNB, DOGE, ADA, AVAX and LINK, each against
  USDT.
- Evaluation: 2026-10-14 16:00–22:00 UTC. Trade: 2026-10-14 22:00–2026-10-15
  04:00 UTC.
- Trimmed feed SHA-256:
  `7cd1feaf3590379a0f62129ae6822903dad4019c8163523933976ca19a4109f9`.
- Old/new settings SHA-256:
  `ec4e9feb339dc29d09484c0a98537087390b494a6ffb8bb4c3a26879ac11103c` /
  `063981c215134a675f0866288f3c78c337737a50e556fa1349bb2e762b5e29c8`.
- The report uses modeled one-unit net returns after costs as primary PF; cash
  PF is separate. With no closes, neither PF basis nor win rate is available.
- This is a retrospective development sample, not held-out evidence. Do not
  select a config from it or infer future profitability. A longer untouched
  sample is needed to assess order count, PF and hourly success rates.

## Verification

- Break suite: 8/8.
- Focused Break/Relate/Micro/pipeline bundle: 43/43.
- UI indication tests: 7/7.
- Realtime close timing, lane scheduling, freshness and tape-helper tests: 3/3.
- TypeScript check and development build with core-worker packaging: pass.
- Scoped ESLint: 0 errors, 4 unused-variable warnings in runtime/session files.
- No venue-contacting broad suite or authenticated live execution test was run.
