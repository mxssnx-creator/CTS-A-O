# Stable version — 7 Oct 2026

Operator, 6 Oct night: *mark this version as stable; see the processing and structure as stable; rely on later
issues or poor results to check.* Tag `stable-2026-10-07` (the merge of PR #110 into `main`).

## What is stable

- **Engine stages** Base → Main → Tapes → Real seats → entry → book, with long and short independent (#108), the
  signal-processing fixes (#108) and the live step that never stalls on a request (#111).
- **Live control** (overall mode): lanes merged per symbol × side, one backstop stop per side, the fixes D1, D3–D6,
  a stop-out after a reduce never reopens the same position (`externalCloses`).
- **Live exchange results judge** (`src/core/live-record.ts`): each lane is attributed the exchange's own fill
  prices (`live_lane_trades`, keyed like the paper position: config × symbol × side × entry). Live validation (per
  config and per group), auto-adjust and the acceptance coordinations (engine direction, signal, signal direction)
  read that record once it holds enough closes, and the simulated record until then.
- **Live vs system** (`src/core/live-diff.ts`): every exchange order next to the same paper order, per range and hour,
  written by a desk every round (`live-vs-system.md`) and by `scripts/core-live-diff.mjs` on a snapshot.
- **Session reports** with per-range and per-side skips, the signal funnel, execution checks and the variants (range
  off, entry crowding, engine direction per indication among them).

## The measured desk (v3) — two 24 h windows, 30 symbols, same code

| window (UTC) | orders | PF unit | net (Σ trade %) | as v1 desk |
|---|---:|---:|---:|---|
| 5 Oct 15:00 → 6 Oct 15:00 | 10,714 | 3.65 | +19,241 | 5,999 · PF 2.36 |
| 4 Oct 15:00 → 5 Oct 15:00 | 7,893 | 2.30 | +10,372 | 4,597 · PF 1.64 |

5–6 Oct as sized: $10.00 → $14.00 (+40.0 %), PF $ 3.81, 23 / 24 green hours, max drawdown 15.1 % (`sims/sim24h-2026-10-06/v3b.html`).

The v3 desk = `sims/sim24h-2026-10-06/x01-desk.json` (v2: signals active `count 0`, ranking `net`, engine direction
acceptance on with Micro judged per indication, Block off, signals' own last-N off, `minQty` sizing × 2) plus
`wf.entryCrowd {"mc": 3}` (at most 3 Micro configs per symbol × side × bar) and auto-adjust `{window 25,
triggerPf 1.0, recoverPf 1.3}`. The two additions are in the operator's desk patch; the permission rules of this
environment kept them out of the committed desk file.

## From here on

No further restructuring on its own: a change follows a reported issue or a poor live result — the live-vs-system
diff (a range or hour where the exchange departs from the system), live validation pausing configs, auto-adjust
widening sets — and is measured as a variant on the same tapes before it becomes a default
(`docs/positive-coordinations.md`).
