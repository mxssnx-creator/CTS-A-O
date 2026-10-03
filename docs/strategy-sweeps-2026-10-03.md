# Strategy sweeps, 3 October 2026 — Axis, micro / minimal, Block window, stage min PF

## Common setup

- **Data:** 12 volatile BingX symbols, real 1-minute bars.
- **Windows:** 24 h of pre-history plus a 24 h run.
- **Strategy settings (x01's):**
  - Normal only when Block raises it, plus Trailing;
  - Block at most 4× per source;
  - DCA with one add;
  - Axis with rungs at 1.5×;
  - signals on;
  - every config on its own seat.
- **Sizing:** replayed with fixed $5 units on $1,000.
- **Checks:** every run passes its consistency checks (38/38, or 39/39 with signals).

## Axis (Axis only, signals off, fixed window to 2 October 23:00 UTC)

| variant | orders | PF | net |
|---|---:|---:|---:|
| A0 revert, rungs 1.5× (default) | 87 | 0.65 | −$3.42 |
| **A1 desk mode** | **511** | **1.08** | **+$1.37** |
| A2 desk + hybrid | 347 | 1.09 | +$0.92 |
| A3 min displacement 1.0 | 38 | 0.39 | −$2.66 |
| A4 fixed exits | 83 | 0.51 | −$6.40 |
| A5 rung ratio 3 | 96 | 0.65 | −$6.35 |
| A6 one level | 67 | 0.36 | −$2.30 |
| A7 centre 60 min | 41 | 0.20 | −$3.92 |

- Desk mode is the only structure above break-even, with six times the orders. x01 runs it.
- The code default stays `revert`. An earlier 4-window test did not find desk mode robust, and this is one more
  window, not a proof.
- Axis is a small contributor either way.

## Micro and minimal (fixed window)

| variant | micro | minimal | whole run |
|---|---|---|---|
| H1 (30-cell micro, 0.20 % cost) | no trades | PF 0.50 | PF 1.66 |
| M1 micro targets 0.4–0.8 % | 98, PF 0.39 | PF 0.52 | PF 1.65 |
| M2 cost 0.15 % (x01's measured) | 75, PF 0.52 | 3,335, PF 0.62 | PF 1.54, DD 89 % |
| N1 minimal at 0.15 % | — | 3,335, PF 0.62 | PF 1.54 |
| N2 minimal stops 0.5–1× target | — | 592, PF 0.43 | PF 1.68, DD 41 % |

On the latest window, minimal reached PF 0.80 (every config) and 0.85 (top 100).

**Neither range has an edge in any variant or window.**
- Micro's targets (0.10–0.40 %) sit at or below the round-trip cost.
- Minimal is stopped out more often than it wins.

Both stay evaluable at the Base minimum (operator's choice: range gate PF 1.05). The live top-config ranking keeps
them off the exchange unless they score among the best.

## Block pooled-source window (`block.window`)

| window | fixed window | latest window, top 100 |
|---|---|---|
| 1 (default) | PF 1.66, +$7,526, DD 42 %, 81 % at level 8 | PF 1.37, +$1,159, DD 43 %, 78 % at level 8 |
| 10 | PF 1.65, +$7,787, DD 43 %, 78 % | — |
| **25** | **PF 1.67, +$7,996**, DD 43 %, 74 % | **PF 1.39, +$1,173**, DD 46 %, 67 % |
| 50 | PF 1.65, +$7,880, DD 45 %, 77 % | PF 1.38, +$1,101, DD 47 % |

- Window 25 is the best on both windows. x01 runs it.
- The gain is small. Block works mechanically (levels, legs, steps and pause are all tested), but the pooled
  sources' recent results predict little.
- The selection comes from the configs' own gates and the score.

## Stage min PF (latest window, top 100)

| min PF | orders | PF | net | max DD |
|---|---:|---:|---:|---:|
| **1.05** | 5,543 | **1.37** | **+$1,159** | **43 %** |
| 1.1 | 4,712 | 1.32 | +$862 | 52 % |
| 1.2 | 3,833 | 1.35 | +$727 | 46 % |

A stricter Base gate drops configs without raising PF. Base stays at 1.05, as on x01.
