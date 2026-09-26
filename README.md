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
npm test               # platform tests + core tests (engine, recovery, races, live planner)
npm run typecheck
npm run build
```

Node 22+ (uses the built-in `node:sqlite`, in memory). Optional snapshot of the in-memory database:
`CTS_CORE_SNAPSHOT=/var/lib/cts-a-o/core.sqlite`.

## Install on a Linux server

```bash
git clone https://github.com/mxssnx-creator/CTS-A-O.git && cd CTS-A-O
sudo ./scripts/linux/cts.sh install                       # name cts-a-o, port 8080
sudo ./scripts/linux/cts.sh install --name desk --port 9000
```

At the end it prints the state and the URLs (`http://<server-ip>:<port>/v2`). Every command is idempotent:
installed dependencies (Node.js ≥ 22.13, git, curl, util-linux) are kept, an installed instance is only brought up,
an unchanged source is not rebuilt.

| command | what it does |
|---|---|
| `install` | dependencies, service user, build (node server), service (systemd, or a supervisor where there is none), health check |
| `update [--force]` | builds the new version next to the running one, switches, restarts (seconds), rolls back if it is not healthy |
| `reinstall` | stops and kills everything of the old program, deletes it, installs fresh |
| `remove [--purge]` | stops and deletes the program; `--purge` also deletes the data |
| `start` · `stop` · `restart` · `status` · `logs` | service control |

Options: `--name` `--port` `--host` `--dir` (program, `/opt/NAME`) `--data` (data, `/var/lib/NAME`) `--repo` `--branch`
`--source DIR` (install from a local checkout). Later commands reuse the saved options; with one instance installed
`--name` can be left out.

**Data stays where it is.** `/var/lib/NAME` holds `env` (environment: exchange keys, `CTS_CORE_LIVE`, proxy …),
`state.json` (settings, presets, backtests, adjuster), `core.sqlite` (statistics, trades, runs, evaluations, candles)
and `logs/`. Install, update, reinstall and remove never touch it — only `remove --purge` does. A stop, update or
reboot saves the state and the database snapshot first; the next start restores both.

## What it does

| Stage | |
|---|---|
| **Base** | 988 combos: 156 indication configs (10 + 5 common kinds, fine parameter ranges, and 1h+4h combined variants) (trend, break, active, direction, move, rsi, bollinger, sar, macd, ema — each with parameter families) × 8 fade bots + `follow` + `revert` |
| **Main** | the top Base combos expanded into every protect variant (TP × SL ratio × min SL × trail × min trail × hold) and sub-strategy (normal, trailing, DCA, DCA Active) |
| **Real** | durable winners over a 14-day window that still work in the 20 h pre-historic window; last-N, Block / Block Active, caps and hour guard; executed on paper every bar |
| **Live** | off by default; requires Settings → Live, `CTS_CORE_LIVE=1`, API keys, and a rolling simulated run with PF ≥ 1.10 and stable |

Live keys (host environment only): `BINGX_X01_API_KEY/SECRET` (mainnet), `BINGX_V01_*`, `BINGX_X02_*` (testnet).
Orders carry `CTSB…` client ids; other orders and positions on the account are never touched.

## Tactics and presets

Switchable entry tactics (session, volatility regime, trend strength, cooldown), a "fixed set" selection mode and
presets that carry their measured results (PF, green-hour success ratio, trades/day, win rate, out-of-time year).
The RSI-extreme momentum family on 1h is the first setup that stays at or above break-even on a year no selection
saw — details and every number in [`docs/tactics.md`](docs/tactics.md).

## Indications × timeframes and the simulated trading matrix

Every indication one by one on 1m, 5m, 15m and 1h, independent and combined with higher timeframes, and a
complete matrix of settings × execution presets (Normal / Trailing on-off, Block / DCA, Active) over three
periods — [`docs/indications-mtf.md`](docs/indications-mtf.md), [`docs/matrix.md`](docs/matrix.md).

## UI

`/v2`: Overview · Base → Live · Configs · Bot × Indication · Hour by hour · Compare presets · Paper & Live ·
Presets · Market · Engine · Settings. Four designs (Studio, Graphite, Terminal, Aurora) and a compact density.

## Research tools

```bash
npm run core:run      -- --symbols 40 --days 7                 # pipeline report
npm run core:compare  -- --cache candles.json                  # presets over repeated 2-day walk-forward runs
npm run core:sweep    -- --cache candles.json                  # last-N × SL ratio × trailing sweep
npm run core:hourly   -- --cache candles.json --out docs/core-hourly
node --experimental-strip-types scripts/core-longrun.mjs  --cache c15m.json --srctf 15   # 90-day causal run
node --experimental-strip-types scripts/core-research.mjs --cache c15m.json --srctf 15 --tf 15
node --experimental-strip-types scripts/core-adjust.mjs --cache c1h.json --srctf 60 --tf 60 --out docs/adjust-1h
node --experimental-strip-types scripts/core-family.mjs --cache c1h.json --srctf 60 --tf 60 --out docs/family-1h
node --experimental-strip-types scripts/core-longrun.mjs --cache c1h.json --srctf 60 --tf 60 --patch '{"mode":"fixed"}' --settings '{"tactics":{"volRegime":true},"focus":[…]}'
node scripts/core-presets-gen.mjs                              # research presets from docs/tactics/*.json
node --experimental-strip-types scripts/core-oot.mjs      --cache c1h.json --srctf 60 --research docs/research-1h.json
```

## Honest status

The RSI-extreme momentum family on 1h (see Tactics) reaches walk-forward PF 1.07–1.16 over the research year and 1.01–1.11 on the
unseen prior year, with 6–12 orders a day. The edge is small. Everything else below stays true for the full combo universe.
On 90 days of real data (and a year for the out-of-time check) no configuration is durably profitable after
the 0.2 % round-trip cost; 1-minute trading (hundreds of orders per hour) loses heavily. The engine reports
this truthfully and keeps the Live stage shut until the rolling simulation proves otherwise.
