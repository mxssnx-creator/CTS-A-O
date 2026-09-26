# CTS-A-O

A crypto-futures research and paper-trading desk for BingX perpetuals, built on **real market data only**.
Every indication × bot × protect × sub-strategy is calculated independently, walked forward honestly
(no look-ahead, pessimistic intrabar fills, 0.2 % round-trip cost on every close), and promoted through
**Base → Main → Real → Live**. The Live stage is off by default and gated hard.

The full design, the reliability audit and every measured result are in [`docs/core-v2.md`](docs/core-v2.md).

## Run

```bash
npm install
npm run dev            # http://localhost:8080 — the engine starts with the server (CTS_CORE_AUTOSTART=0 disables)
npm test               # platform tests + 50 core tests (engine, recovery, races, live planner)
npm run typecheck
npm run build
```

Node 22+ (uses the built-in `node:sqlite`, in memory). Optional snapshot of the in-memory database:
`CTS_CORE_SNAPSHOT=/var/lib/cts-a-o/core.sqlite`.

## What it does

| Stage | |
|---|---|
| **Base** | 988 combos: 98 indication configs (trend, break, active, direction, move, rsi, bollinger, sar, macd, ema — each with parameter families) × 8 fade bots + `follow` + `revert` |
| **Main** | the top Base combos expanded into every protect variant (TP × SL ratio × min SL × trail × min trail × hold) and sub-strategy (normal, trailing, DCA, DCA Active) |
| **Real** | durable winners over a 14-day window that still work in the 20 h pre-historic window; last-N, Block / Block Active, caps and hour guard; executed on paper every bar |
| **Live** | off by default; requires Settings → Live, `CTS_CORE_LIVE=1`, API keys, and a rolling simulated run with PF ≥ 1.10 and stable |

Live keys (host environment only): `BINGX_X01_API_KEY/SECRET` (mainnet), `BINGX_V01_*`, `BINGX_X02_*` (testnet).
Orders carry `CTSB…` client ids; other orders and positions on the account are never touched.

## UI

`/v2`: Overview · Base → Live · Configs · Bot × Indication · Hour by hour · Compare presets · Paper & Live ·
Market · Engine · Settings. Four designs (Studio, Graphite, Terminal, Aurora) and a compact density.

## Research tools

```bash
npm run core:run      -- --symbols 40 --days 7                 # pipeline report
npm run core:compare  -- --cache candles.json                  # presets over repeated 2-day walk-forward runs
npm run core:sweep    -- --cache candles.json                  # last-N × SL ratio × trailing sweep
npm run core:hourly   -- --cache candles.json --out docs/core-hourly
node --experimental-strip-types scripts/core-longrun.mjs  --cache c15m.json --srctf 15   # 90-day causal run
node --experimental-strip-types scripts/core-research.mjs --cache c15m.json --srctf 15 --tf 15
node --experimental-strip-types scripts/core-oot.mjs      --cache c1h.json --srctf 60 --research docs/research-1h.json
```

## Honest status

On 90 days of real data (and a year for the out-of-time check) no configuration is durably profitable after
the 0.2 % round-trip cost; 1-minute trading (hundreds of orders per hour) loses heavily. The engine reports
this truthfully and keeps the Live stage shut until the rolling simulation proves otherwise.
