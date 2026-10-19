# 12 h session sim — 30 symbols (11 Oct 2026)

Requested: a 12 h trade simulation "for Signals", 30 symbols, hourly stats + diagrams.

- Window: pre-historic 2026-10-09 13:00 → 2026-10-10 13:00 UTC; run 2026-10-10 13:00 → 2026-10-11 01:00 UTC.
- Real BingX 1m public data, the engine itself (Base → Main → Real, lanes 1/5/15/30m), start balance $20.
- Report: `index.html` (hourly tables + diagrams), `writeup.md` (key tables), `data.json` / `session.json` (numbers).

## Result (engine)

Balance $20.00 → $22.49, **net +$2.49 (+12.4 %)**, PF 2.33, 1,647 orders, WR 77.7 %, **9/12 green hours**.
Trailing +$1.43 (PF 2.70) · Normal +$1.06 (PF 2.03). Best hour 18:00 +$0.72; worst 13:00 −$0.31.

## Signals executed 0 — why (the point of this run)

Every one of the 1,647 orders is **engine** (Normal/Trailing; rsi/osc/break). **Signals executed 0** both with the
engine off (first attempt: all entries skipped `sig:confirm` — no engine candidate to confirm against) and with the
engine on (this run: 675 signal candidates skipped — `sig:confirm 429`, `sig:signalValid 245`).

This is structural, not a defect: signals **fire ~once per day** and enter only while an aligned engine candidate is
open (confirmation, a positive coordination) AND after clearing their own last-N validation. A **12 h window is too
short** to execute them — matching the operator's prior note that "almost no signal reached a control order" in short
windows. The report still carries signals' **seated / evaluated** PF per source (e.g. `s2-active-hf`, `r-inside` rank
high), just ~no executed signal orders.

**To see executed SIGNAL performance:** use a longer window (≥ 24–48 h run) or read the live desk's accumulating
record (`runs/x01-signals`). A 12 h sim is suitable for engine behaviour and signal *evaluation*, not signal execution.

## Integrity checks

`checks: 50/55` — the 5 reds are **coverage** (short / general / long ranges and axis executed nothing this
signals-focused window, and one indication kind not evaluated). They are honest "traded nothing" flags for this
window/config, not blank-report or math errors. `CTS_CORE_VARIANTS=0` (the ~30 variant reruns were skipped to keep
runtime bounded and avoid starving the concurrent live desk).
