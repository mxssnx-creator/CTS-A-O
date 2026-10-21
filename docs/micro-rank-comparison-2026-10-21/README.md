# Paired twelve-symbol ranking Trade Sim

Compare the existing `volatility1h` and `change1h5m` production selectors using the same 24 archived Binance USD-M contracts. Choose twelve once at 19 October 2026 12:00 UTC and retain that selection through 20 October 00:00 UTC. This is a historical fixed-universe comparison, not exchange-wide listing research or hourly rebalancing.

- Evaluated prehistory: 19 October 00:00–12:00 UTC (12h).
- Trading: 19 October 12:00–20 October 00:00 UTC (12h).
- Older 18 October candles initialize indicators only (24h additional warmup).
- Native, checksum-verified 1m archives; completed 5m/15m execution lanes. No synthetic 5s/sub-minute history.
- Existing **1H Volatility**: mean `(hourHigh-hourLow)/hourClose` over **three** completed hourly candles (3h lookback).
- **1H Change**: sum of the twelve absolute relative close-to-close 5m changes divided by twelve; thirteen completed 5m closes spanning one hour. The net hourly return is a separate diagnostic.
- Causal liquidity: preceding 24h sum of minute close × base volume, explicitly an OHLCV quote-volume approximation. Future endpoint tickers cannot select symbols.
- Both rules choose the same twelve contracts at this cutoff, in different orders. Run both independently and compare every exact funded close; never assume ordering invariance.

All 868 requested Micro/Inverse sources retain their own full configured Micro/Minimal/Short/General Normal, capped Trailing and Trailing-only grids plus independently fitted Exit. Other source families, Signals, Block, Axis and DCA are disabled in this frozen research scope. Base/config/range/direction/Last-N gates remain intact. Model account: $10,000, fixed $2 order notional, 10× leverage. Modeled round-trip cost is 0.15%, charged once. Retain any capital infeasibility, losses, empty cohorts and open MTM; a complete grid is not automatically a viable live portfolio.

`expected-v4.json` freezes final source **f704356e936a30cc7ae3415f5a58a04dccbf7d81198935414b4d42efb2c0d661**, both causal selections, definitions, history, window and common economic settings before either case scores. Original v1/v2/v3 expected files remain immutable. The v1 startup and historical-clock failures are retained separately. The final repair gives offline ranking its historical clock, derives/retains genuine 5m ranking bars, and bounds each feed read by the earlier caller time and replay endpoint. Scheduler/live clocks, trade costs, gates and symbol lists are unchanged.

The workflow runs each case in an isolated worker job, then independently audits prices/protection/cost, exact funded tape/execution identity and PF, every scalar own-config hourly decision and all initial-set transitions. The report reads actual allocation evidence via `readFundedSession`; virtual orders and unknown ownership cannot become funded PF. Per-case artifacts retain full tapes, histories, native HTML, protocols and audit JSON. The standalone comparison is generated only from completed audited outputs. Historical Base/config PF and later funded execution PF retain distinct sample denominators.

An additional hourly Top-12 selection diagnostic uses the same past-only 24-contract feed. It does not retroactively change either traded universe or claim returns for untested hourly reselection.

## Reproduce

Use the final report branch checkpoint with economic source matching `expected-v4.json`; future main changes cannot be substituted silently. Install the locked dependencies and build the worker. Run:

```sh
node --experimental-strip-types --no-warnings .github/audits/micro-rank-comparison.mjs prepare --out runs/micro-rank-reproduction --expected-file docs/micro-rank-comparison-2026-10-21/expected-v4.json
node --experimental-strip-types --no-warnings .github/audits/micro-rank-comparison.mjs run --rank volatility1h --out runs/micro-rank-reproduction --workers 2
node --experimental-strip-types --no-warnings .github/audits/micro-rank-comparison.mjs run --rank change1h5m --out runs/micro-rank-reproduction --workers 2
```

Run all five case audits shown in `.github/workflows/micro-rank-comparison.yml` before building the comparison:

```sh
node --experimental-strip-types --no-warnings scripts/report-micro-rank-comparison.mjs runs/micro-rank-reproduction docs/micro-rank-comparison-2026-10-21
```

No market-data request is needed for replay. Source, feed, selection and protocol seals refuse substitutions. A different source requires a new pre-scoring protocol; do not rewrite previous outcomes or financial receipts.

## Completed result

Final run 39548800331: Volatility **160,300 funded settled closes, unit PF 1.0852160377**; Change **160,220, PF 1.0834427433**. Both have **7 positive / 5 negative hours**. Micro execution remains approximately **PF 0.680**. Full modeled grid is capital-infeasible: maximum margin $18,010.20 / $17,999.00 versus $10,000 initial capital. No hourly-profitability or live-readiness certificate.

The 160,071 shared closes have identical verified unit returns (zero mismatches); 229 / 149 closes occur only in one case. All 35 shared configs whose initial gate decision changes have exactly the same historical rows/returns and equal decisions under a common diagnostic ordering. Production explicitly preserves universe priority across equal entry/exit timestamps; Last-N and chronological drawdown are order-sensitive. Native coverage also retains 28 additional built/initially checked cells in Volatility at one source’s Base target filter. These differences are shown, never removed by reordering the traded input or weakening gates. Both case-specific scalar audits cover every own hourly decision without errors.

Both repeated sources 431ca46 and eb588571 produce identical funded identity/return cohorts in each case; see `repeat-parity-v2-v3.json`. The feed-clock repair did not improve the financial outcome artificially. `verification-v4.json` retains checksummed artifacts, all stage/range numbers, source seals and measured limits.

`report.html` is standalone and works offline: 13 responsive charts, range/type/side filters, all hourly PF/count changes, Base → Config → Seating → Execution stages, ranking scores and hourly ranking-only diagnostics, every funded config with losses searchable, all 868 requested indications including empty outcomes, and complete audit/settings provenance. Browser checks passed at 1440px and 390px, no page errors, no external requests or root overflow; filter totals and PF match actual funded rows.

## Exact combined release source

The final comparison uses source f704356e at e2a91c7, byte-identical economically to PR test merge46ae9aca (main1f6 plus Micro11780ad). This includes the existing exact Base-cell admission and incremental evaluation-boundary fixes from main. Both case-specific funded identity/return cohorts remain exactly equal to archived v3; see `repeat-parity-v3-v4.json`. Original v3 HTML and JSON remain in `v3/`, with their original source and all losses.

The exact combined production tree passed the full repository workflow39545983417: 676 script tests (8 absent optional fixture skips),83 app/component tests,3,125 ordinary core passes plus the2 default-excluded runtime tests separately. Types and production build pass; lint has0 errors and44 existing warnings. Repeated source-f704 partition CI39548800345 covers all262 core files, with complete slow/catalog/native/unfinished-bar audit39548800340 and120-symbol stress. The archived financial outcomes are not evidence for any later changed economic source.

PR184 merged as7ba74e8f970aeb7fc8531e6fbc57026a1c821e93; its tree exactly matches tested PR merge46ae9aca and calculation sourcef704356e. The additional full24-symbol control39548800357 also passes all60 report and all price/cost/scalar/transition/funded parity checks:373,222 closes,PF1.5730241054,nine positive/three negative hours. Micro remainsPF0.793984 and the full grid remains capital-infeasible. See ../micro-24-sim-2026-10-21/v10-verification.json; do not mix that universe with the twelve-symbol comparison.
