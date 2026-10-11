# Signals-only 12 h — variant T0 (signal grid before V3)

Desk `docs/sims/sig12h-2026-10-08/desks/T0.json`: Normal stops 3× target, Trailing trail 0.4 / 0.6 / 0.8 of target with stop 3×, hold 48 h; engine ranges off (Normal toggle off, every grid off, Axis / DCA / Block off). 20 symbols, 24 h pre-history, run 2026-10-07 12:00 → 2026-10-08 00:00 UTC, balance $20, `CTS_CORE_VARIANTS=1`, 3 workers. Simulation only.

Wall time: 497 s (session + 107 variant re-runs). Peak RSS 1.8 GB (variants ~2.9 GB).
Checks: **40/41 ok — FAILED: execution: signals executed orders**. `report-page.test.ts`: 2/2 pass. Variants baseline reproduces the session run.
Because a check failed, the HTML report was **not** published as an Artifact (docs/report-integrity.md). It is in `html/` for reference.

## Result: no orders

| | orders closed | PF closed | open at end | PF incl. open | net closed | net incl. open | WR | max DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Signals (as run) | 0 | – | 0 | – | 0 | 0 | – | 0 |

Every executed order would have been a `sig-` config, but none executed. 126/126 signal pairs passed Base, 2,520 signal configs were seated (2,460 units active), and **all 23,874 signal entry candidates were skipped by `sig:confirm`**. Signal confirmation (`wf.coord.confirm`, a positive coordination) admits a signal only while an engine candidate is open on its symbol in its direction. With Normal, every grid, Axis and DCA off, nothing produced an engine candidate. The 428 Wide pairs and 25,204 tapes were built, but the desk's `wf.excludeRanges` plus Normal off left 0 engine seats.

So the type, trail-ratio, stop-ratio, per-source, per-symbol, hour-by-hour and hindsight best-per-source × symbol tables are all empty for T0 as run. The other three desks (T1–T3) share the same engine-off base and should hit the same wall.

## Variants (same tapes, one switch each). Only rows that traded are listed; every other row has 0 orders

Unit basis: net is the sum of per-order returns in %. "PF incl. open" is approximate: the variant summary records only the open orders' net mark, so it is gross profit ÷ (gross loss + |open net|).

| variant | orders (all) | Signals orders | Signals PF closed | Signals net % | all PF closed | open at end | open net % | PF incl. open (≈) | max DD % | longs n · PF | shorts n · PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| baseline (as run) | 0 | 0 | – | 0 | – | 0 | 0 | – | 0 | – | – |
| **Axis on** | 117 | 59 | **70.8** | +148.8 | 5.34 | 312 | −262 | 0.64 | 10 | 32 · 29.98 | 85 · 3.88 |
| **DCA on** | 376 | 272 | **1.49** | +210.7 | 1.40 | 663 | −895 | 0.51 | 152 | 193 · 3.89 | 183 · 0.64 |
| Signal confirmation off | 1,354 | 1,354 | 0.38 | −3,322 | 0.38 | 2,359 | −5,013 | 0.19 | 3,397 | 627 · 1.35 | 727 · 0.16 |
| Signal acceptance + confirmation off | 1,821 | 1,821 | 0.48 | −3,258 | 0.48 | 3,093 | −7,136 | 0.23 | 3,634 | 723 · 1.55 | 1,098 · 0.27 |
| Coordination off | 1,354 | 1,354 | 0.38 | −3,322 | 0.38 | 2,359 | −5,013 | 0.19 | 3,397 | 627 · 1.35 | 727 · 0.16 |

Signal ranking net / drawdown / lowdd, acceptance off, own last-N, entry / validation last-N, symbol gate, and range gate all show "no effect": 0 orders, because confirmation blocks every candidate first. Normal on and the tactic rows are `recompute` rows (they need new tapes) and were not run.

### Hour by hour (UTC, closes per hour · net % unit), the variants that traded

| hour | Axis on n | net | DCA on n | net | confirm off n | net |
|---|---:|---:|---:|---:|---:|---:|
| 12 | 32 | +59 | 60 | +30 | 134 | −602 |
| 13 | 5 | 0 | 8 | +10 | 77 | +91 |
| 14 | 8 | +26 | 15 | +29 | 133 | +227 |
| 15 | 3 | −1 | 9 | −1 | 187 | −1,595 |
| 16 | 14 | −8 | 44 | +70 | 40 | +42 |
| 17 | 8 | +28 | 15 | +10 | 51 | +90 |
| 18 | 15 | +3 | 25 | +16 | 62 | +26 |
| 19 | 17 | +2 | 34 | +40 | 64 | +25 |
| 20 | 0 | 0 | 42 | +33 | 54 | +95 |
| 21 | 3 | +2 | 62 | +54 | 124 | −112 |
| 22 | 11 | +40 | 40 | +55 | 284 | −741 |
| 23 | 1 | +4 | 22 | −140 | 144 | −867 |

(These include the Axis / DCA orders; the variant summary has no per-hour Signals split.)

## Reading

- A signals-only desk built by switching every engine type off cannot trade while confirmation is on. That is the cause of "Signals executed 0 orders", not the signal grid.
- Confirmation is still the right coordination. Without it, Signals lose (PF 0.38, shorts 0.16). With an engine candidate source present, Signals are positive: PF 1.49 beside DCA and PF 70.8 beside Axis (59 orders, a small sample). This is consistent with docs/positive-coordinations.md.
- To get a signals-only book, keep an engine type running as the *confirmation source* while executing signal orders only (for example Axis or Normal candidates computed but not traded), or re-run T0–T3 with Axis on. A code change is out of scope for this session.
- Hindsight best config per source × symbol: not computable from this run. There were no signal closes, and the dump keeps no per-config tape closes for untraded signal configs.
