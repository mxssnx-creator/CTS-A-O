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

The service runs from the project directory. `install` builds the project in place (`npm ci`, then the node-server
build into `<project>/.output`) and the unit starts `<project>/.output/server/index.mjs`. Nothing is copied to `/opt`
and nothing is cloned. The unit is rendered from `scripts/linux/cts-a-o.service.template`.

At the end it prints the state and the URLs (`http://<server-ip>:<port>/v2`). Every command is idempotent:
installed dependencies (Node.js ≥ 22.13, git, curl, util-linux) are kept, an installed instance is only brought up,
and `npm ci` runs only when `package-lock.json` changed.

| command | what it does |
|---|---|
| `install [--clean]` | dependencies, service user, build in the project, service (systemd, or a supervisor where there is none), health check. `--clean` first deletes the persistent data (see below) |
| `update [--force]` | rebuilds the project in place, restarts, health check. A failed build stops the update before the restart; there is no rollback to an earlier build |
| `reinstall` | `remove`, then `install`: the data and the saved options are kept |
| `remove` | stops the service and deletes what install generated: the unit, the launcher, the registry line and `<project>/.output`. The data, the saved options, the build logs, the service user and the project tree are kept |
| `start` · `stop` · `restart` · `status` · `logs` | service control |

Resources are measured at every start:
- the heap is `CTS_HEAP_PCT` % (default 85) of the memory available to the service, minus room for native memory and the worker threads;
- one worker per CPU, with a larger young generation and thread pool;
- the service runs with a higher CPU / IO weight, nice −5, and is the last process to be OOM-killed.

Options: `--name` `--port` `--host` `--dir` (the project; default: the checkout that contains `cts.sh`) `--data`
(data, `/var/lib/NAME`) `--source DIR` (copy a checkout into the project before the build: sandbox or offline).
Later commands reuse the saved options in `/etc/cts/NAME.conf`; with one instance installed `--name` can be left out.
`--root DIR` runs the same logic under a temporary prefix without systemd, for the tests (`scripts/linux/cts.test.mjs`).

**Data stays on the server.** `/var/lib/NAME` holds `env` (environment: exchange keys, `CTS_CORE_LIVE`, proxy …),
`state.json` (settings, presets, backtests, adjuster), `core.sqlite` (statistics, trades, runs, evaluations, candles)
and `logs/`. `/etc/cts/NAME.conf` holds the saved options and `/var/log/NAME-build` the build logs. install, update,
reinstall and remove never delete them, and `remove --purge` is refused: `install --clean` is the one way to delete
them. It is off by default: it stops the service, prints each path it deletes (data directory, saved options, build
logs), then installs fresh. A stop, update or reboot saves the state and the database snapshot first; the next start
restores both.

## What it does

| Stage | |
|---|---|
| **Base** | 988 combos: 156 indication configs (10 + 5 common kinds, fine parameter ranges, and 1h+4h combined variants) (trend, break, active, direction, move, rsi, bollinger, sar, macd, ema — each with parameter families) × 8 fade bots + `follow` + `revert` |
| **Main** | the top Base combos expanded into every protect variant (TP × SL ratio × min SL × trail × min trail × hold) and sub-strategy (normal, trailing, DCA, DCA Active) |
| **Real** | durable winners over a 14-day window that still work in the 20 h pre-historic window; last-N, Block / Block Active, caps and hour guard; executed on paper every bar |
| **Live** | off by default; requires Settings → Live, `CTS_CORE_LIVE=1`, API keys, and a rolling simulated run with PF ≥ 1.10 and stable |

Live keys (host environment only): `BINGX_X01_API_KEY/SECRET` (mainnet), `BINGX_V01_*`, `BINGX_X02_*` (testnet).
Orders carry `CTSB…` client ids; other orders and positions on the account are never touched. A symbol with any
foreign order or position is skipped entirely, and where someone else adds to the same symbol and direction as an
own position (the exchange merges them), only the quantity this system opened (its own order ledger) is reduced or
closed — the excess is never touched (event `live: … the excess is not ours`).

**Unattended live on a server** (`/var/lib/NAME/env`, then `sudo ./scripts/linux/cts.sh restart`):

```
BINGX_X01_API_KEY=…
BINGX_X01_SECRET=…
CTS_CORE_LIVE=1              # host arm: without it no order is ever sent
CTS_CORE_SYMBOLS=30          # universe size
CTS_CORE_LIVE_CONN=bingx-x01 # mainnet
CTS_CORE_LIVE_AUTO=1         # Settings → Live on (0 = off)
```

The last three are applied once per set of values, so switching Live off in the UI stays off across restarts
until the env values change. The service starts on boot and is restarted after a crash; orders start only once
the rolling simulated run is ready (PF ≥ 1.10 and stable).

## Connections

Each exchange connection (`bingx-x01` mainnet, `bingx-vst-01`, `bingx-vst-02` demo) runs its own runtime side by side. Each one has its own settings, presets, paper book, live ledger, state file (`state.<conn>.json`) and snapshot (`core.<conn>.sqlite`). The primary connection keeps the original `state.json`.

The runtimes share three things:
- the market feed: identical requests are sent once;
- one worker pool, capped at the cores and queued;
- the exchange rate-limit pause.

The selector at the top picks the connection that every page shows. Pages refresh on that connection's server-sent events (`/api/core/events`: state, progress, compute done, paper step, live step, settings). Engine → Connections switches each connection on or off. On the host, `CTS_CORE_CONNS=all` or a comma list chooses which connections run, and `CTS_CORE_PRIMARY_CONN` picks the one that keeps the original state.

## Protect ranges

Short (0.6–1.2 %), Minimal (0.2–0.8 %), Micro (0.1–0.4 %) and Minimal plus (2–5× cost) sit beside the wide grid.
- **Own ids.** Every range has its own config ids and its own live tracking kind (`H`, `N`, `U`, `M`).
- **Fixed distances.** Range cells keep their price distances and their own stop / trail floors on every lane.
- **Range gate** (on by default): a range cell seats only after its last 50 closes clear PF 1.35.
- **Horizon fit** (on by default): a range target is computed only where it fits the indication's typical move, with at least two targets kept per range.
- **Off by default:** Micro, Minimal and Minimal plus. After the 0.20 % cost they lose on every indication tested ([`docs/ranges-validation.md`](docs/ranges-validation.md)).

Settings and the preset dialog edit each range as min · max · step.

## Statistics

`/v2/statistics` shows the selected connection's simulated run (full detail) or its paper book:
- balance, equity, drawdown, margin used and the open book (sets, positions, orders) on one time axis;
- types and sub-configs (Block raised / Block Active level, DCA / DCA Active, Axis, Signals);
- each sub-strategy with and without, from the execution presets computed on the same tapes;
- ranges, lanes, indication kinds, bots, sides, exit reasons, hours, days, weekday × hour;
- every config with its parameters and dates (expandable rows, CSV export).

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
node scripts/core-desk-presets.mjs --candidates docs/desk-candidates.json   # desk presets over 3 × 24 h sessions
node --experimental-strip-types scripts/core-mem-probe.mjs --symbols 8      # RSS / heap / buffers per compute phase
CTS_CORE_LIVE_TAG=CTSV2D_ node --experimental-strip-types scripts/core-live-test.mjs --name desk --settings runs/desk.json
node --experimental-strip-types scripts/core-live-report.mjs --tag CTSV2D_ [--flatten]   # exchange result per range
node scripts/core-ui-qa.mjs                                     # every page, desktop + mobile, connection switch, events
node --experimental-strip-types scripts/core-oot.mjs      --cache c1h.json --srctf 60 --research docs/research-1h.json
```

## Honest status

The RSI-extreme momentum family on 1h (see Tactics) reaches walk-forward PF 1.07–1.16 over the research year and 1.01–1.11 on the
unseen prior year, with 6–12 orders a day. The edge is small. Everything else below stays true for the full combo universe.
On 90 days of real data (and a year for the out-of-time check) no configuration is durably profitable after
the 0.2 % round-trip cost; 1-minute trading (hundreds of orders per hour) loses heavily. The engine reports
this truthfully and keeps the Live stage shut until the rolling simulation proves otherwise.
