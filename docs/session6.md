# Simulated trading session: 6 symbols, 24 h + 20 h pre-historic

**Setup:**
- Engine: the engine itself (`scripts/core-session.mjs`), on real BingX 1m data.
- Market: the 6 most volatile symbols (1 h), every timeframe lane (1 / 5 / 15 / 30 min, independent and combined).
- Strategies: every strategy with Block, and signals on.
- Money: $100 start balance, 2 % of equity per order unit at 10×, 0.20 % round-trip cost on every close.
- Window: 2026-10-01 14:00 → 2026-10-02 14:00 UTC, with 20 h of pre-historic calculation before it.

## Results

| run | orders | positions | PF | WR | result | equity max DD | DDT (closes) |
|---|---:|---:|---:|---:|---:|---:|---:|
| before (one seat per pair, no tactics, no DDR) | 472 | 24 | 1.52 | 68.2 % | +67.7 % | 58.6 % | 19.3 h |
| **defaults** | 208 | 23 | **2.77** | 75.5 % | +68.0 % | **24.8 %** | 19.0 h |
| **High order count** preset | 653 | 26 | 2.24 | 74.9 % | **+214.7 %** | 80.2 % | 16.5 h |

The defaults behind the second row:
- trend strength + volatility regime;
- every evaluated config trades, with its own family seats;
- DDR 1;
- DCA 2 levels / 5 stages;
- Block Overall at 8×.

The High order count preset relaxes the gates:
- no 50-close validation;
- no live last-N;
- min PF 1.05;
- symbol veto.

Each run's complete hour-by-hour report is in `docs/session6/`:
- per lane and per type;
- execution presets on the same tapes;
- ranges;
- every config.

## Per strategy type

| run | type | orders | PF | net |
|---|---|---:|---:|---:|
| defaults | Normal | 99 | 2.97 | $35.30 |
| defaults | Trailing | 109 | 2.59 | $32.69 |
| defaults | Signals | 83 | 71.67 | $60.38 |
| defaults | Engine (no signals) | 125 | 1.24 | $7.61 |
| High order count | Normal | 317 | 2.24 | $89.99 |
| High order count | Trailing | 322 | 2.25 | $121.15 |
| High order count | DCA | 14 | 2.11 | $3.56 |
| High order count | Signals | 370 | 2.55 | $163.89 |
| High order count | Engine (no signals) | 283 | 1.86 | $50.81 |

## Reading

- **The new defaults** earn the same as before at nearly twice the PF and less than half the drawdown.
- **The High order count preset** triples the orders and the result, all lanes trade, and DCA too. It carries an 80 % equity drawdown.
- **One window is a sample.** On the window ending 15:00 UTC, an hour later, the defaults executed only 4 orders, and the gates are why. The 12-window gate sweep in `docs/block-sweep.md` is the basis for the defaults: PF 1.81 and net ÷ drawdown 1.80, against 1.35 and 0.78 with relaxed gates.
