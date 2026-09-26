# Indications one by one — 1m, 5m, 15m, 1h — independent and combined

Every indication is tested one at a time with `scripts/core-mtf.mjs`: 156 in total, including the 42 common indicators added
here (CCI, Williams %R, Stoch RSI, z-score, MFI, OBV, CMF, Keltner, squeeze, Aroon, Ichimoku, HMA, TRIX, KAMA and
Heikin-Ashi, each over a fine range of parameters).

- Each one runs × {follow, revert} × 6 protects scaled to the timeframe.
- **Independent** = the indication's own timeframe only.
- **Combined** = the same signal, kept only where the same indication agrees on the higher timeframes
  (1m → 5m + 15m, 5m → 15m, 15m → 1h, 1h → 4h). Higher timeframes use completed bars only.
- Half A selects and half B validates. Every run uses real BingX data and the 0.2 % round-trip cost.

| data | timeframe | mode | pass both halves (PF ≥ 1.1) | pooled PF (A / B) |
|---|---|---|---:|---:|
| 20 days of 1m | 1m | independent / combined | 0 / 0 | 0.49 / 0.51 · 0.50 / 0.53 |
| 20 days of 1m | 5m | independent / combined | 0 / 0 | 0.72 / 0.73 · 0.72 / 0.74 |
| 20 days of 1m | 15m | independent / combined | 15 / 19 | 0.81 / 0.82 · 0.82 / 0.82 |
| 90 days of 15m | 15m | independent / combined | 0 / 0 | 0.76 / 0.80 · 0.75 / 0.80 |
| research year of 1h | 1h | independent / combined | 16 / **49** | 0.86 / 0.85 |
| prior year of 1h | 1h | independent / combined | 27 / **93** | 0.89 / 0.87 |

- **1m and 5m cannot carry the 0.2 % cost.** 1m gives 1000+ orders a day per variant at PF about 0.5. Combining with 5m and 15m
  cuts the orders to a third but does not change the PF.
- The 15m survivors on 20 days (the Ichimoku cloud 20/60/120 led with PF 1.5–1.9) **vanish over 90 days**. They were an artifact of the short window.
- **On 1h, 4h agreement roughly triples the number of survivors in both years.** 31 variants pass all four halves
  across two years. They became the `…@x4` indications: bb-walk, break-vol, break-vol-2, break-atr-2,
  act-burst-2.5 and act-chop, plus CCI 14/40 ±200 and z-score 50 ±2.5.

Full per-indication tables: `docs/mtf-1m.md`, `docs/mtf-15m-90d.md`, `docs/mtf-1h-365d.md`, `docs/mtf-1h-prev.md`.

## Complete simulated trading matrix (`scripts/core-matrix.mjs`, `docs/matrix.md`)

- **Settings variants (16):** signal set {RSI momentum, robust 1h+4h set} × tactic {none, volatility} × Block/DCA {standard, strong}
  × last-N {0, 12}.
- **Execution presets (14):** every combination of Normal and Trailing on or off, Block and/or DCA, with and without Active.
- **Periods (3):** the research year, the prior year, and Apr → Sep 2024. The 2024 period was never used for any selection;
  BingX serves 1h history back to April 2024.

Every cell is a complete causal walk-forward over the whole period: 48 h runs, 20 h pre-calc, fixed selection.

- **2 of 224 combinations reach PF ≥ 1.05 in all three periods:** the robust 1h+4h set, **Trailing only, last-N 12**,
  with PF 1.17 / 1.10 / 1.11 at about 8–9 orders a day.
- **last-N 12 is the systematic that carries out of time.** In the 2024 period the RSI-momentum set goes from a median PF
  of 0.94 without it to 1.05 with it, across every execution preset.
- The robust set without last-N scores PF 0.90–0.93 in 2024. Choosing indications across two years still overfits,
  and only the gate carries the edge forward.
- Median over settings, 2024 period: Normal only 0.98, Block Active 0.96, Block Active + DCA Active 0.98,
  **DCA only 0.81, DCA Active only 0.75**. DCA without Normal or Trailing is the weakest option.

The best combinations (ranked by their worst period, one per execution preset) are the research presets in `/v2/presets`.
Each shows all three periods.
