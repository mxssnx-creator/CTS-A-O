# Additional Signal sources and bounded trailing — protocol 2026-10-20

These are research candidates, independently selectable in Signal settings. They are disabled in production defaults until separate forward evidence qualifies them. Literature does not establish positive hourly trading returns after costs.

| Source | Primary formula source | Frozen entry adaptation |
|---|---|---|
| APZ reclaim | Lee Leibfarth, *Trading With An Adaptive Price Zone*, TASC September 2006; [original publisher](https://traders.com/documentation/feedbk_docs/2006/09/Abstracts_new/Leibfart/lieb.html), [publisher's implementations](https://traders.com/documentation/feedbk_docs/2006/09/TradersTips/TradersTips.html) | Double-smoothed EMA of closes and high-low range; short 5 / 2×, medium 8 / 2.5×. Closed-bar recovery inside the band, ADX14 below 25. The reclaim confirmation and parameters are CTS research choices. |
| FRAMA pullback | [MetaQuotes platform documentation](https://www.metatrader5.com/en/terminal/help/indicators/trend_indicators/fama), [MetaQuotes reference implementation](https://www.mql5.com/en/code/72); developer [Ehlers' paper index](https://www.mesasoftware.com/TechnicalArticles.htm) | Trailing halves of 16/32 bars determine fractal dimension and alpha exp(-4.6(D−1)), bounded 0.01–1. Close reclaims the adaptive average in its three-bar slope direction. No forward-indexed half-window. |
| Supertrend pullback | [TradingView platform formula](https://www.tradingview.com/support/solutions/43000634738-supertrend/) | Existing causal Supertrend bands with 7 / 2× or 14 / 2.5× ATR. Close reclaims EMA9 in an unchanged Supertrend direction; distinct from the existing flip entry. |

Each source has independent short/medium IDs and 1/5/15/30m lanes, exact protection/type/config identities and per-symbol/direction Last-N evidence. Tests compare complete prefixes with truncated histories and mirrored prices.

The Signal history window is 336 hours independently of the engine's 24-hour broad window. Physical backfill includes this history plus indicator warmup and simulation, and extended Signal lane universes do not expand ordinary engine cohorts. Explicit replay evaluation boundaries remain respected.

Signal settings expose a 0.2–3% stop/activation/entry-anchored peak-gap ceiling (`trailMax`). New defaults use 3%. Legacy IDs without a ceiling retain 2%. The config ID includes the ceiling; held orders never inherit a wider ceiling from changed settings. Ratios 0.5/1/1.5 are separate study scenarios, not pooled qualification. Historical protection scoring uses the same final cap as its actual simulation. Gaps and fees may cause a realized loss greater than the stop distance and remain in measured returns.

The 12-symbol study protocol seals 384 hours of public one-minute BingX candles: 24h indicator warmup, 336h evaluated prehistory, 12h development and 12h confirmation. All configured sources plus these three research sources are evaluated on the production 15m Signal lane, both parameter ranges, percent/ATR/historic protection grids, DCA, DCA Active and Axis. Multiple 1/2/3% ceilings and 0.5/1/1.5 ratios are scored independently. The new-source lane sweep separately checks all four lanes.

Results are settled accepted **virtual** orders before funding, in independent source scenarios. Shared account funding, pooled-side acceptance, loss-cluster coordination, engine confirmation and Block are outside this isolated comparison and are not silently treated as actual funded/venue execution. The production qualification gates are not weakened. Empty/insufficient and losing configurations remain in the report. Best-group selection uses development only and is frozen before looking at confirmation.

The original source study preceded authenticated X02 access. The subsequent X02 VST follow-up verified 28 actual opens, protection/repair/restart/close handling and 60 measured fill commissions, ending with an empty account book and restored settings. This is technical fixture evidence, distinct from source profitability. See [strategy-defaults-20261020.md](strategy-defaults-20261020.md). No hosted deployment/reload was performed.
