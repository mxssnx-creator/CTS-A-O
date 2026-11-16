# Signal source filters — minimum signals a day, drop losing sources (16 November 2026)

Operator request: remove non-performing sources and sources with too few signals, require at least **2 signals a day per
symbol**, make it a setting, and so cut the Signal work (fewer pairs to build tapes for, fewer to validate every step).

## Settings (`signals`, Settings → Signals)

| setting | default | meaning |
|---|---:|---|
| `minPerDay` | 2 | a source (signal pair) is evaluated only if, on at least one symbol, its own Base history shows at least this many signal entries a day. 0 = off |
| `dropLosing` | on | a source whose own Base history is losing is not evaluated: at least `minTrades` closes on some symbol, pooled net not positive and pooled PF below 1 |

Both are validated by `checkSettings` and carried by `signalSettings` / the desk snapshots.

## Rules (`signalSourcesToDrop`, applied in `signalEvaluationPairs`)

- The rate is the source's Base closes on a symbol divided by the days of history behind its lane (first bar of the lane to the
  cut). Closes are at most the signal entries a single position slot can take, so the count is a lower bound of the real rate;
  a source that clears the bar certainly fires that often.
- A history shorter than 6 hours (`SIGNAL_RATE_MIN_DAYS`) says nothing about a daily rate: the rate rule is skipped.
- A source without a Base run is **kept**: no evidence is not a veto. So is a source with fewer than `minTrades` closes for the
  losing rule.
- **Coordinators** (`sig-coord-…`, composites of several sources) are not sources and are never filtered here; they keep their
  own rules.
- The filters run on top of the Base gate when it is on (`baseGate`), and on every configured pair when it is off (the default),
  which is where the work was: with the gate off, all ~380 configured Signal pairs computed all their configs.
- It runs on the Base compute, from history before the cut only: nothing from the run window decides.

## What it does not do

- It does not change how a kept source is qualified: its configs still need their own Last-N, PF and stage floors.
- It judges the representative (default-protect) Base run. A source that only works with a protection the representative cell
  does not use can be dropped by `dropLosing`; switch it off (or set `minPerDay` to 0) to keep every source computed.
- The per-symbol rule is "at least one symbol": a symbol that fires less often than the minimum in a kept source is still
  subject to the usual own-close windows, which a sparse symbol cannot fill.

Code: `src/core/signals.ts` (`signalSourcesToDrop`, `signalEvaluationPairs`), `src/core/signal-config.ts`,
`src/core/settings-check.ts`, `src/core/server/runtime.server.ts` (history days per lane), settings page (Signals).
Tests: `src/core/signal-source-filter.test.ts`.
