# Micro gross-edge scan, 8 Oct

Operator, 8 Oct: fix Micro so it works better, with many orders. The approved plan says research first: keep only the
cells that are positive on the training data (20 Sep – 4 Oct) and on both 12 h windows, force nothing.

Script: `scripts/micro-scan.mjs`. Table: `docs/sims/micro-scan-2026-10-08/scan.md`; every cell built:
`docs/sims/micro-scan-2026-10-08/cells.csv.gz` (training, rally and latest closes and PF, net and gross).

## Setup

- Candles: a read-only copy of the x02 desk database (1-minute candles, 30 symbols, 20 Sep 02:19 → 8 Oct 02:18).
  The lanes are resampled from it (5m / 15m / 30m), as the engine does.
- Indications: every Micro indication (`mc-…`, the engine's own registry) on every lane, with its c variant, for the
  two bots that take a stretch's direction (follow) or its fade (revert): 1,180 combos.
- Exit cells (28): ATR cells — stop = sl × ATR(14), target = tpRatio × stop, sl ∈ {1, 1.5, 2, 3}, tpRatio ∈ {1, 1.5, 2,
  3}; fixed cells — target 0.3 / 0.6 / 1.2 %, stop = k × target (k ∈ {1.75, 3.5}), trail 0 or half the target. 24-bar hold.
- Every cell is built by the engine's tape builder twice: at the round-trip cost 0.2 % and at cost 0 (gross). 31,696
  cells had at least one close in the training data.
- Pre-screen (training only): net PF > 1 with at least 200 closes.

## Result

| | cells | 15m / 30m / 5m lanes | ATR cells / fixed cells | closes per cell in the rally / latest window (median, max) |
|---|---:|---|---|---|
| built (with a training close) | 31,696 | | | |
| gross PF > 1 on training (n ≥ 200) | 8,055 (25 %) | | | |
| net PF > 1 on training (n ≥ 200): the pre-screen | 571 (1.8 %) | 276 / 123 / 172 | 549 / 22 | 19 (78) / 11 (53) |
| pre-screen and net PF > 1 in both windows | 55 | 35 / 12 / 8 | 55 / 0 | 22 (47) / 14 (34) |

The costs decide. A quarter of the cells keep a gross edge on the training data, and 1.8 % keep it after the 0.2 %
round trip. Among the survivors the wide ATR stops dominate (2 and 3 ATR: 367 of 571 cells, 41 of the 55 two-window
cells), and the bots split evenly (follow 310, revert 261).

Two facts limit what the survivors can show:

- Sample size. The median survivor has 19 closes in the rally window and 11 in the latest window; the largest has 78 and
  53. The operator's acceptance needs PF including open > 1 in both windows and at least 300 closed orders per range per
  window. No cell reaches 300 closes in one window.
- Overlap. Cells with the same indication and bot and different exits take the same entries, so the 571 (and the 55)
  are not independent. The best training cell, `mc-mturn-10@m15c`, follow, a 1.2 % target with a 1.75 × stop, has 216
  training closes at net PF 1.36 (gross 1.83) and no close at all in either window.

## Decision

- Micro does not reach the target on this evidence. Nothing is forced: the desk keeps the Micro range as it is
  (grid.micro, targets 0.1–0.4 % net), and the 55 two-window cells are reported, not traded.
- Retargeting Micro to ATR cells needs an mc-only ATR field in the Micro grid (the Stable-02 exit model exists in the
  engine, `Protect.atr`, but no range grid carries it), and the Micro base stops are hard-coded (`MICRO_BASE_SL`). That is
  a code change with its own tests and a session on the two windows. It is the next step if the operator wants it; it
  would not by itself lift the sample: the number of closes is set by the signals, not by the number of cells.
