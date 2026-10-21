# Paired 12-symbol Trade Sim

Frozen before scoring: `expected-v1.json`, current main economic source `61b56cee42745c066877f8b605041dcb54274a874d8686a7f1fe52b2f6a5ad46`.
Both cases use the same native Binance USD-M archive feed, 24h indicator-only warmup, 12h evaluated prehistory and 12h trading
(19 October 2026 12:00 to 20 October 00:00 UTC). Every configured Micro/Inverse source and Micro/Minimal/Short/General grid
plus fitted Exit keeps its own unchanged gates. Fixed modeled $2 notional, $10,000 initial model capital, 0.15% round trip once.
Funding/capital feasibility and all losing hours must remain visible. No live exchange execution is performed.

Production ranking options are used directly, on native bars completed before the common trade start:

- `volatility1h`: mean high-low/close of the last **three completed hourly candles**. The existing option's three-hour lookback is unchanged.
- `change1h5m`: average of **twelve absolute consecutive 5m close changes** over the last hour, using thirteen completed closes.

Candidate universe: the same 24 checksum-verified archived contracts; this is not an exchange-wide historical listing survey.
Liquidity uses the preceding 24h minute close × base-volume approximation, never the future endpoint ticker. Twelve symbols
are selected once at the start; future candles and outcomes cannot alter selection. At this cutoff both rules choose the same
twelve symbols in different orders. Run both independently and report the measured cohort equality or any discrepancy.

The workflow freezes and validates both actual normalized settings/WF protocols before either scores, then runs the two cases
on independent runners. All price/cost, funded-return, stage, exact-cohort and full scalar hourly audits are required; failures
and partial evidence are retained. `plan.json` and both ranking files accompany each artifact. A detailed standalone comparison
HTML and the native per-case multi-chart reports follow only after both complete. No positive-result assumption is made.
