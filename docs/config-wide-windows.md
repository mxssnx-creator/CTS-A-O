# Config-wide own-close windows — why and how (17 November 2026)

## In one sentence

Judge every configuration on **its own last N closes across all symbols and sides**, not on each symbol × side separately.
On the same market window this lifted the executed PF from **0.56 to 1.33** and turned a $10 test balance from $7.95 into $13.40.

## The problem it fixes

Since 11 November each config × symbol × direction had to fill its own windows (Base 40 / Main 40 / Real 12 / Entry 12
closes, partial floor 9). A config that wins on its pair as a whole rarely has 9 closes on one symbol and one side:

- Long-hold ranges (General, Long) almost never filled a per-context window, so they stopped executing (Long 6 orders,
  General 1) — although the configs seated at the run start earned PF 1.9–3.4 on all their closes in that window.
- High-frequency ranges (Minimal) filled their windows easily and took the whole book (287 of 322 orders, PF 0.60).

So the per-context rule did not make execution more selective — it shifted it to the configs with the most closes.

## The measurement (causal: same tapes, same window, one setting changed)

Recorded BingX feed, 6 symbols, 12 h pre-history, 12 h run, every other setting equal.

| | per symbol × side | config-wide |
|---|---:|---:|
| funded orders | 322 | 466 |
| executed PF | 0.56 | **1.33** |
| balance ($10 start) | $7.95 | **$13.40** |
| General | 1 order | 40 @ PF 2.79 |
| Long | 6 @ 0.50 | 96 @ PF 1.82 |
| Minimal | 287 @ 0.60 | 292 @ PF 1.10 |
| Micro | 13 @ **1.43** | 14 @ 0.21 |

Micro was the one range that did better per context, so Micro uses both views.

## The rule (CTS-A-O defaults)

`gates.positionWindows.scope`:

| scope | a lane qualifies when | default for |
|---|---|---|
| `config` | the config's own last N closes (all symbols, both sides) pass | **every range** |
| `both` | its own symbol × side window **and** the config's record pass | **Micro** (`byRange.mc.scope`) |
| `context` | its own symbol × side closes pass | option (and live promotion, always) |
| `auto` | its own window once it holds its floor, else the config's record | option |

Each config is still judged only on **its own** closes — never on another config's, another range's or another type's.
Independence between configs, types and Active modes is unchanged (`docs/strategy-independence.md`).

**Real money stays per context.** Live promotion (`livePromotionGate`) always judges each exact symbol × side on its
own closes: a winning long record never promotes an unproven short, nor one symbol another.

## For other projects

- Check how a configuration's last-N window is cut. If it is per symbol (or per symbol × side), measure the config-wide
  window on the same data before keeping it: per-symbol windows starve long-hold configurations and hand the book to the
  busiest ones.
- Compare causally: same tapes, same window, one setting changed, executed PF and orders per range next to each other.
- Keep the live / real-money promotion gate on the exact lane.

## Where

Code: `src/core/position-windows.ts` (`PositionScope`, defaults), `src/core/sim/walkforward.ts` (`positionContextEval`),
`src/core/server/runtime.server.ts` (`liveContextWf`). Tests: `sim/continuous-evaluation.test.ts`,
`sim/position-windows.test.ts` (per-context semantics), `server/live-promotion.test.ts`. Record:
`docs/positive-coordinations.md` ("Config-wide own-close windows"). Causal variants on one window:
`CTS_CORE_VARIANTS_EXTRA` (scripts/core-session.mjs).
