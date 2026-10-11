# MC0 — Micro entry crowd cap off (two windows)

Desk `desks/MC0.json`, used as is: the V3 base (MB) with one switch, `wf.entryCrowd {}` (was `{"mc": 3}`). Signals on as in V3.
Run command: `scripts/core-session.mjs --symbols 20 --pre 24 --run 12 --focus all --balance 20 --max-wait-min 300`,
`CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3`, the two windows one after the other.

## Desk settings (MC0.json)

| setting | value |
|---|---|
| symbols / ranking | 20, `volatility1h`, `forceSymbols` XRP, SOL, BCH |
| warm-up / run | 24 h pre + 12 h simulated (`preH 24`, `simH 12`) |
| toggles | normal on, trailing on, axis on, block off, blockActive off, dca off, dcaActive off |
| entry crowd cap (switch) | `wf.entryCrowd {}` — Micro cap removed (was `{"mc": 3}`) |
| coordinations | `coord` enabled, confirm on, hourLock 0, cooldown off, conflict false; `engineSideAccept` on (PF 1.05 / 24 h / 30) |
| signals | enabled; `accept` PF 1.3 / 48 h / 6; `sideAccept` PF 1.3 / 24 h / 20; `holdH 24`; `normal.slOfTp [1.5, 2, 3]`; `count 0`, rank `net`; `ownBase` on |
| gates | `minPf 1.05`, `baseSetsMinPf 1`, per-range 1.05, `lastNFloor 5`, `minDdtH 18`; `wf.lastN 15`, `symGate provenSide`, `seatPer config` |
| Micro grid | tp 0.10–0.40 %, stop ladder 1–5× (`slOfTp`), trail 0 / 0.5 / 0.75, `minSl 0.5 %`, `minSlNet 0.2 %` |
| live (no order sent) | `ratio 1`, `notionalUsd 1`, `maxPositions 0`, `maxExposureX/maxRiskPct/maxBackstopLossPct/maxPositionX 0`, `kinds ["trailing"]`, `excludeRanges ["wide"]` |

## Results

Micro row = closed orders (raw.json `trades`, Micro = config id segment `|mc|`; the closed count 582 and wins 167 match the report's own row for w-latest).
PF incl. open = gross profit / gross loss over closed r plus the open orders' mark r (`mtmR`). Net = Σ r in % of trade units (×100 = %). The report's own net is in dollars.

| | w-latest (7 Oct 12:00 → 8 Oct 00:00 UTC) | w-rally (5 Oct 15:00 → 6 Oct 03:00 UTC) |
|---|---|---|
| **(a) Micro: orders closed** | 582 (wins 167) | 856 (wins 582) |
| Micro: PF closed | 0.071 | 0.835 |
| Micro: open at end | 8 | 24 |
| Micro: PF incl. open | 0.071 | 0.760 |
| Micro: net closed (Σ r) | −736 % | −36.2 % |
| Micro: net incl. open (Σ r) | −739 % | −57.8 % |
| **(b) Micro skip reasons** | lastN 109 · engineSide 94 · symPf 14 (217 skipped) | engineSide 939 · lastN 548 · duplicate 274 · symPf 54 (1,815 skipped) |
| **(c) Micro Base (evaluated / passed, median PF)** | 220 / 5,900 · PF 2.26 | 65 / 5,900 · PF 2.47 |
| Micro seated configs (report's seated table) | normal 839 · trailing 471 | normal 649 · trailing 598 |
| **(d) whole book: orders closed / open / total** | 2,932 / 2,799 / 5,731 | 4,744 / 4,103 / 8,847 |
| whole book: PF closed | 0.387 | 3.546 |
| whole book: PF incl. open | 0.259 | 1.173 |
| whole book: net incl. open (Σ r) | −9,653 % | +1,603 % |
| **(e) checks** | `checks: 55/55 ok` | `checks: 54/55 ok — FAILED: execution: strategy type axis executed orders` |

## Status of each window

- **w-latest — passes (55/55).** Its session.md and writeup.md are copied to `w-latest/`.
- **w-rally — NOT published.** Its run finished (exit 1 from the failed check) with `checks: 54/55 ok`: Axis executed no
  orders in that window while Axis is on in the desk. CLAUDE.md and `docs/report-integrity.md` allow a report to be
  published only with all checks green, so its session.md and writeup.md are not in this folder. The Micro numbers above
  come from its raw.json and are reported as measured, not as a published report. The Axis failure needs a decision
  (is Axis's zero execution a desk setting or an engine defect?) before this window is published.
