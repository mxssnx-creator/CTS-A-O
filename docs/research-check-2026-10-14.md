# Bounded public-market research check — 2026-10-14

The unchanged lean 1-minute research pipeline **lost on the held-out window**: return PF **0.4605** over **83 simulated closes** after a modeled 0.20% round-trip cost. This is simulation evidence, not account execution evidence. No settings were tuned and no configurations were promoted or reloaded.

| Sample | Closed trades | Return PF | Mean net return per close |
| --- | ---: | ---: | ---: |
| Selection / first half | 25 | 2.5493 | +0.2190% |
| Held out / second half | 83 | 0.4605 | −0.2097% |

The held-out sample had 34 wins and 49 losses. Positive net returns sum to 14.8600895863 percentage points and absolute negative net returns to 32.2660674319; their ratio is 0.4605485195. The sum of returns is −17.40598 percentage points, not an account ROI. Reported drawdown time is 215.35 hours.

## Frozen source and coverage

- Source code: `69347e5cee60c7f6ff5a486999fbe8f3f08d2851`. The runner, configuration, pipeline, portfolio, last-N optimizer and metric modules were unchanged during this check.
- Data: BingX public perpetual-swap `/openApi/swap/v3/quote/klines`, 1-minute closed candles. No credentials or exchange mutations.
- Universe fixed before inspecting results: BTC-USDT, ETH-USDT, SOL-USDT, XRP-USDT, BNB-USDT, DOGE-USDT, ADA-USDT, TRX-USDT. This uses the first eight entries of the repository's existing `MAJORS` list, not a ranking derived from the held-out market.
- Data window: **2026-09-26 21:25:00 UTC → 2026-10-14 21:25:00 UTC**, end exclusive; 25,920 candles per symbol, 207,360 total, no missing minute intervals.
- Scope: existing `core-run.mjs` lean pipeline, with 32 valid 1-minute combo runs out of 259 requested default lane combinations. The cache supplies 1-minute series only; the 5/15/30-minute lanes do not run. This is not the full runtime grid, live desk configuration or balance-based execution model.
- The repository's 18-day horizon, focus, gates, tactics, refinement and 0.002 round-trip cost were unchanged; only the bounded eight-symbol research scope was specified. Fees/slippage are modeled, not measured from fills.

## Holdout boundary

The split is **2026-10-05 21:24:30 UTC**. Combo ranking, refinement choice, last-N choice, portfolio membership and hour-guard selection use first-half evidence. Subsequent admission gates use previously closed trades.

`src/core/pipeline/portfolio.ts` assigns first-half trades by `exitT <= splitT` and held-out trades by **`entryT >= splitT`**, excluding straddlers. The reported earliest held-out entry is **2026-10-05 22:04:00 UTC**, after the split. Counts reconcile: 108 full-sample closes = 25 selection closes + 83 held-out closes; no selected portfolio straddlers were excluded. The last held-out close is 2026-10-14 11:07:00 UTC. Thus this portfolio's held-out sample is based on entries after the split, not merely exits after it. This boundary check does not make the limited research model a deployable full-runtime replay.

## Reproduction metadata

```bash
node --max-old-space-size=512 --experimental-strip-types --no-warnings \
  scripts/core-run.mjs --symbols 8 --days 18 --tf 1 \
  --cache runs/research-market-20261014/market-cache.json --json \
  > runs/research-market-20261014/replay-report-verified.json
```

The frozen cache was fetched using `fetchHistory(symbol, 1, 25920, { nowT: 1792013100000, pauseMs: 150 })` for each symbol in the listed order, then serialized as a symbol-to-candle-array object. The command above must reuse that frozen cache; fetching a new current window would be a different experiment.

- Cache bytes: 15,777,273; SHA-256: `03aa4dbaaaad3a4f009d86818fca76b17ebc407e976913dab9733a4370e458e5`.
- Verified report SHA-256: `6dc5c1d34b00c0164f5ed1b58225ce1115b38ff66280490026c7892bab6ec087`.
- Completed in 5.57 seconds, exit 0; monitored peak RSS approximately 348 MiB, under the 900 MiB guard. An identical frozen replay produced the same portfolio and metrics; it was repeated to verify resource measurement, without tuning.

Raw market cache and generated reports remain under ignored `runs/research-market-20261014/`; they are not committed. These results provide no evidence for execution PF above 1 and were not used to promote a configuration.
