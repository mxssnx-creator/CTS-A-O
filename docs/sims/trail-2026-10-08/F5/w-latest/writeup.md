# 12 h simulated session — 20 symbols, 24 h pre-historic + 12 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-06 12:00 → 2026-10-07 12:00 UTC, run 2026-10-07 12:00 → 2026-10-08 00:00 UTC. Symbols: XRP-USDT, BCH-USDT, SOL-USDT, ORCA-USDT, W-USDT, BOME-USDT, NEAR-USDT, PUMP-USDT, JUP-USDT, NMR-USDT, LYN-USDT, ZRO-USDT, SAND-USDT, GRIFFAIN-USDT, AIN-USDT, AVNT-USDT, BR-USDT, AVAX-USDT, HAJIMI-USDT, MMT-USDT.

Settings (desk, docs/sims/trail-2026-10-08/desks/F5.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles trailing, ranges micro / short / general / long (micro on), caps: positions none, signal positions none, coordination on, signals validated on their last 0. Block overall, 8 levels, Active from 5, ratio 0.5, max 4× per source, the stack up to 8×. Balance $20.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [runs/w-latest/html/index.html](runs/w-latest/html/index.html) · numbers: `runs/w-latest/html/data.json`.

## Result

| balance | equity at end | net | PF $ | PF unit | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $20.00 → $20.00 | $20.00 | $0.00 (0.00 %) | – | – | 0.00 | – | $0.00 (0.00 %) | 0 | 0 | 0.00 % | 0 / 12 | $0.00 |

As live sizes it (position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings))); open at end: 0 positions / 0 orders, MTM $0.00 (exact: executed by the engine through every gate, cap and Block volume, marked to market).

**Caps:** position cap 0.75× equity per symbol × side, gross cap 7× equity (x01 defaults (no live caps in the settings)) — 0 orders capped to $0, 0 scaled down · binding: position cap 0, gross cap 0. **Without the caps:** balance $20.00 → $20.00 (0.00 %) · PF $ – · equity at end $20.00 · equity max drawdown $0.00 (0.00 %) · margin used max $0.00.

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $0.40 (no compounding) the same orders net $0.00 (0.00 %), closed-order max drawdown $0.00.

Engine: Base 1354/25098 pairs passed (incl. signal pairs; per range, passed / evaluated pairs · median Base PF of the passed pairs: Wide 351/19072 · PF 1.54 · Micro 233/5900 · PF 2.26 · Short 642/8176 · PF 1.47 · General 514/8176 · PF 1.50 · Long 570/8176 · PF 1.51 · Signals 126/126), Main 1228 pairs, 215798 tapes, Real seats: 0 engine configs + 3780 signal configs (every config of the active signals), compute 184 s, peak RSS 5194 MB. Consistency checks: 44 of 49 pass.

## Findings

- **Strategy types positive:** none.
- **Strategy types losing:** none.
- **Engine vs signals:** .
- **Indication kinds positive:** none.
- **Indication kinds losing:** none.
- **Signal sources positive:** none.
- **Signal sources losing:** none.
- **Symbols:** best none; worst none.
- **Block volume:** .
- **Lanes:** ; **ranges:** ; **sides:** .
- **Hours:** 0 green / 0 red / 12 flat of 12 full hours; first order opened never; best hour 12:00 $0.00, worst hour 12:00 $0.00.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 13:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 14:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 15:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 16:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 17:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 18:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 19:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 20:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 21:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 22:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 23:00 | $20.00 | $20.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

Window of 12 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
