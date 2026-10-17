# Exact-config Signals: frozen public-candle study

Protocol fixed before scoring the new source on 2026-10-17. Offline modeled results only.

## Source and splits

22 genuine Binance USD-M symbols: BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX,
LINK, LTC, DOT, ATOM, APT, NEAR, SUI, TRX, UNI, FIL, ETC, ARB, OP, XLM (USDT).
The 20-symbol development universe excludes OP and XLM. Fixed forced symbols
prevent retrospective endpoint ticker ranking.

| Purpose | Evaluated prehistory (UTC) | Trading (UTC) | Symbols |
|---|---|---|---:|
| Development, baseline and corrected | Oct 12 03:00–09:00 | Oct 12 09:00–15:00 | 20 |
| All-ranges selection audit | Oct 13 09:00–15:00 | Oct 13 15:00–Oct 14 15:00 | 22 |
| Untouched final check | Oct 15 15:00–21:00 | Oct 15 21:00–Oct 16 21:00 | 22 |

Source covers Sep 26 through Oct 17 00:00 exclusive: 665,280 native 1-minute
bars, 30,240 per symbol; 462 daily archives and official SHA256 checksums.
All timestamps, gaps and duplicates checked. Older candles initialize indicators
only, behind `evaluationFromT`; evaluated selection history remains six hours.
Source differs from the earlier BingX history and cannot establish venue parity.

Feed SHA256: `84e29bb4e729e6f4e213ba1c8e6eb8c1a11ecbc0a8b3f65e958a4563040f8019`.
Manifest SHA256: `714024ec7e1dbbe00464c381867346025f13efe06dd1943362c35b794df6e1d0`.
Rebuild with `scripts/build-public-eval-feed.mjs`; source URLs and per-archive
checksums are retained in its manifest.

## Identical economics

Both development arms use fully materialized baseline defaults normalized by
the actual runtime, modeled round-trip cost 0.15%, balance $10, leverage 10,
equity sizing 0.1%, Signal count 0 (unlimited), all existing ranges, both
directions, final exchange position cap 100 and live trading disabled.
The baseline is commit `2860c3f` with common reporting/freeze instrumentation;
the corrected arm changes exact Signal qualification/acceptance and defaults.
Settings and walk-forward options must compare exactly between arms.
Source files, feed bytes, actual runtime settings, sizing and time boundaries
are sealed before computation. Smaller universes and memory-degraded results
cannot certify completion.

No PF, minimum sample, drawdown, Last-N or range floor is lowered. Primary
scores follow Base-qualified engine configs through funded settled executions;
independently qualified exact Signal configs and the combined funded account
are reported separately. Sized-dollar PF is diagnostic. Empty/insufficient
samples remain explicit. No-loss PF sentinels are not finite measured ratios.

## Adjustment policy

All configured indications/ranges remain enabled until the full 22-symbol,
24-hour selection audit has completed. Only then may persistent losing cells
with at least 50 funded settled closes spanning at least three symbols be
proposed for a research-only disabled set. Insufficient/empty cells stay
enabled; individual losing clock hours are not fitted. Any proposed subset is
compared with the unpruned policy on the untouched final window. No automatic
live promotion follows a profitable backtest.

Performance checks record elapsed time, peak RSS, compute/coverage telemetry
and worker/fallback state with one replay at a time and four workers. Safe
optimizations must preserve causal decisions and exact config identities.

Results and measured limitations will be appended after the frozen runs.
