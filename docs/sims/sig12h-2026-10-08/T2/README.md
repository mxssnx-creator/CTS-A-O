# T2 — signals only, tight trails (12 h, 20 symbols, 7 Oct 12:00 → 8 Oct 00:00 UTC)

Desk `../desks/T2.json`: V3 + Trailing trail 0.25 / 0.4 / 0.6 of target with stop 2×, engine ranges off.
Run at 22d8482, 24 h pre-history + 12 h run, balance $20, `CTS_CORE_VARIANTS=1`, 3 workers. Wall time 751 s (12.5 min;
compute #4 516 s, 107 variant runs). Files: `session.md`, `writeup.md`, `html/` (raw.json not committed).

**Checks: 40/41 ok — FAILED: execution: signals executed orders.** The report was not published as an Artifact.

## Result: the book traded nothing

| | value |
|---|---:|
| orders closed / open at end | 0 / 0 |
| PF closed / PF incl. open | – / – |
| net closed / net incl. open | 0 / 0 |
| signal candidates skipped | 43,041 — **all `sig:confirm`** |

Cause: signal confirmation (`wf.coord.confirm: true`, a positive coordination) lets a signal enter only while an
engine candidate is open on its symbol in its direction. This desk turns every engine range off (Normal off, Micro /
Minimal / Short / General / Long off, Wide excluded, Axis / DCA / Block off — 0 of 22,684 engine tapes evaluated), so
no engine candidate ever exists and no signal can confirm. Every T-desk built the same way (engine off, confirm on)
will trade 0 orders. Signals-only needs either confirmation off for this test (an operator decision: the coordination
measured PF 1.32 → 1.58) or a confirmation source that does not need the engine seated (code change, not done here).
Signals-only check: nothing executed, so no non-signal order traded either.

The hour-by-hour, type, trail-ratio, stop-ratio, per-source and per-symbol tables of the executed book are all empty.

## Variants (same tapes, one switch each) — the rows that traded

Unit basis (% of one unit, after 0.20 % cost). PF incl. open = gross profit ÷ (gross loss + |open MTM|) — the open
orders at the end are pooled into one MTM figure in the variant summary.

| variant | orders closed | WR | PF closed | open at end | PF incl. open | net closed | net incl. open | max DD | long / short |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| baseline (as run) | 0 | – | – | 0 | – | 0 | 0 | 0 | – |
| Signal confirmation off (= Coordination off) | 2439 | 44.2 % | 0.24 | 2538 | 0.15 | -6850 | -12124 | 7066 | L 736 PF 0.61 / S 1703 PF 0.17 |
| Signal acceptance and confirmation off | 3575 | 50.9 % | 0.36 | 3421 | 0.22 | -7208 | -14282 | 8262 | L 1047 PF 0.88 / S 2528 PF 0.26 |
| DCA on *(engine, not signals)* | 519 | 60.9 % | 0.55 | 727 | 0.26 | -407 | -1415 | 586 | L 194 PF 0.50 / S 325 PF 0.57 |
| Axis on *(engine, not signals)* | 143 | 57.3 % | 4.08 | 391 | 0.34 | 137 | -350 | 15 | L 26 PF 1.22 / S 117 PF 4.49 |

Every other row (signal ranking drawdown / lowdd, signal acceptance off alone, own last-N off, active signals
100 / 200, caps, lanes, …) is "no effect": 0 orders, because confirmation still blocks every entry. No signal variant
beats a PF-1 book; the rows that trade lose heavily, shorts most.

Skips inside "Signal confirmation off": signal PF 12,479 · signal side 11,450 · duplicate 7,815 · loss cluster 6,320.

### Hour by hour — "Signal confirmation off" (the only signals-only book that traded)

| hour (UTC) | orders closed | net (unit %) | cumulative net |
|---|---:|---:|---:|
| 12:00 | 253 | -384 | -384 |
| 13:00 | 219 | 241 | -142 |
| 14:00 | 262 | 329 | 187 |
| 15:00 | 397 | -2218 | -2031 |
| 16:00 | 94 | -31 | -2062 |
| 17:00 | 128 | 177 | -1885 |
| 18:00 | 111 | -41 | -1926 |
| 19:00 | 113 | -176 | -2102 |
| 20:00 | 164 | -634 | -2736 |
| 21:00 | 238 | -1196 | -3932 |
| 22:00 | 287 | -1943 | -5875 |
| 23:00 | 173 | -975 | -6850 |

The variant summary carries no per-hour PF or open count, and no per-source / per-symbol / per-trail split.

## Signal configs on their own closes (not executed): per source

The active signal units' configs (3,345 of 3,780 entered while their pair × symbol × direction was active), each on
its own closes inside the run — what the signals did, before the confirmation gate. Normal: 1634 configs, 9046 closes,
PF 0.50, net -15,259 %; Trailing: 1711 configs, 12,641 closes, PF 0.49, net -13,294 %. Sorted by net.

| source | configs | positive | closes | WR | PF unit | net % |
|---|---:|---:|---:|---:|---:|---:|
| s2-stoch-swing | 60 | 41 (68 %) | 607 | 75 % | 1.53 | 442.77 |
| obv | 60 | 44 (73 %) | 604 | 74 % | 1.46 | 347.31 |
| act-burst | 59 | 49 (83 %) | 371 | 76 % | 1.79 | 321.80 |
| ema-cross | 50 | 38 (76 %) | 140 | 84 % | 3.71 | 214.80 |
| volume-break | 55 | 50 (91 %) | 56 | 89 % | 10.21 | 159.48 |
| mfi | 30 | 29 (97 %) | 73 | 90 % | 8.58 | 127.79 |
| s2-ema-cross | 30 | 24 (80 %) | 33 | 82 % | 8.42 | 105.26 |
| ema-cross-fast | 60 | 39 (65 %) | 356 | 73 % | 1.19 | 96.72 |
| s2-range-break | 47 | 34 (72 %) | 73 | 74 % | 1.67 | 67.93 |
| r-vol-regime | 33 | 22 (67 %) | 59 | 58 % | 1.80 | 46.83 |
| rsi-momentum | 25 | 23 (92 %) | 25 | 92 % | 3.39 | 40.46 |
| atr-break | 59 | 34 (58 %) | 354 | 61 % | 0.96 | -25.15 |
| s2-vol-break | 54 | 29 (54 %) | 131 | 72 % | 0.83 | -49.04 |
| s2-st-trail | 44 | 27 (61 %) | 49 | 55 % | 0.39 | -64.36 |
| keltner | 50 | 17 (34 %) | 133 | 50 % | 0.76 | -75.06 |
| supertrend | 50 | 26 (52 %) | 221 | 61 % | 0.69 | -142.74 |
| st-slow | 47 | 15 (32 %) | 73 | 47 % | 0.30 | -152.14 |
| r-inside | 19 | 0 (0 %) | 27 | 7 % | 0.00 | -156.14 |
| donchian | 44 | 11 (25 %) | 187 | 57 % | 0.60 | -171.82 |
| rsi-reversal | 40 | 12 (30 %) | 45 | 31 % | 0.09 | -198.25 |
| ema-slope | 58 | 14 (24 %) | 243 | 65 % | 0.63 | -199.81 |
| s2-rsi-revert | 57 | 21 (37 %) | 146 | 51 % | 0.42 | -257.18 |
| squeeze | 52 | 18 (35 %) | 53 | 34 % | 0.05 | -295.83 |
| ichimoku | 49 | 16 (33 %) | 209 | 53 % | 0.44 | -310.58 |
| vwap | 60 | 16 (27 %) | 436 | 63 % | 0.66 | -310.98 |
| trix | 55 | 12 (22 %) | 150 | 49 % | 0.26 | -345.89 |
| r-connors | 45 | 20 (44 %) | 190 | 58 % | 0.39 | -362.83 |
| adx | 60 | 16 (27 %) | 336 | 60 % | 0.58 | -377.93 |
| s2-adx-gate | 60 | 13 (22 %) | 442 | 64 % | 0.62 | -380.03 |
| r-fractal | 44 | 6 (14 %) | 97 | 22 % | 0.04 | -408.08 |
| macd-hist | 60 | 12 (20 %) | 645 | 61 % | 0.65 | -484.21 |
| williams-r | 60 | 12 (20 %) | 548 | 56 % | 0.65 | -494.70 |
| s2-confluence | 60 | 16 (27 %) | 711 | 62 % | 0.66 | -497.04 |
| macd-slow | 60 | 9 (15 %) | 439 | 56 % | 0.52 | -579.54 |
| s2-bb-bounce | 60 | 16 (27 %) | 319 | 49 % | 0.42 | -586.83 |
| s2-range-shift | 52 | 5 (10 %) | 191 | 35 % | 0.21 | -587.07 |
| s2-block-stack | 58 | 6 (10 %) | 300 | 50 % | 0.41 | -591.02 |
| s2-active-hf | 58 | 4 (7 %) | 607 | 56 % | 0.56 | -623.86 |
| macd-cross | 60 | 4 (7 %) | 465 | 55 % | 0.48 | -661.62 |
| act-hf | 59 | 10 (17 %) | 521 | 55 % | 0.48 | -677.22 |
| bollinger | 60 | 6 (10 %) | 433 | 54 % | 0.52 | -692.91 |
| reclaim | 60 | 6 (10 %) | 655 | 62 % | 0.57 | -694.76 |
| hma | 59 | 5 (8 %) | 434 | 52 % | 0.41 | -724.65 |
| s2-block-scale | 60 | 8 (13 %) | 622 | 59 % | 0.50 | -757.14 |
| zscore | 60 | 1 (2 %) | 335 | 48 % | 0.38 | -786.99 |
| ema-pullback | 60 | 7 (12 %) | 488 | 58 % | 0.39 | -797.35 |
| ema-trend | 60 | 8 (13 %) | 530 | 59 % | 0.45 | -799.97 |
| r-awesome | 58 | 6 (10 %) | 323 | 42 % | 0.23 | -850.75 |
| sar | 59 | 2 (3 %) | 554 | 52 % | 0.41 | -915.77 |
| kama | 59 | 4 (7 %) | 674 | 57 % | 0.45 | -938.09 |
| stoch-rsi | 60 | 7 (12 %) | 762 | 58 % | 0.45 | -953.15 |
| rsi-mid | 58 | 3 (5 %) | 385 | 42 % | 0.22 | -961.80 |
| r-nr-break | 55 | 1 (2 %) | 319 | 39 % | 0.21 | -995.72 |
| cci | 60 | 0 (0 %) | 541 | 55 % | 0.41 | -1015.22 |
| cmf | 57 | 2 (4 %) | 409 | 47 % | 0.25 | -1025.92 |
| thrust | 59 | 1 (2 %) | 560 | 51 % | 0.36 | -1044.01 |
| r-linreg | 60 | 4 (7 %) | 572 | 54 % | 0.38 | -1044.33 |
| swing | 59 | 1 (2 %) | 522 | 50 % | 0.30 | -1054.77 |
| impulse | 60 | 2 (3 %) | 404 | 42 % | 0.22 | -1069.44 |
| s2-atr-break | 60 | 2 (3 %) | 403 | 41 % | 0.24 | -1077.63 |
| r-session-trend | 60 | 5 (8 %) | 453 | 49 % | 0.33 | -1085.98 |
| heikin-ashi | 59 | 1 (2 %) | 644 | 54 % | 0.38 | -1170.81 |

Per-symbol and per-trail-ratio splits of these configs are not in the dump.

## Optimal per source — HINDSIGHT, an upper bound

Per source: of the best config the report records for each of the source's indications, the one with the highest PF
over the run (≥ 3 closes). Symbols pooled (the dump has no source × symbol split, so the operator's per source ×
symbol table cannot be built from this run). Picked after the fact: it is an upper bound, not a tradeable result.
What the system actually traded there: nothing (every entry blocked by confirmation).

| source | best config | stop ÷ tp | trail ÷ tp | closes | PF | net % |
|---|---|---:|---:|---:|---:|---:|
| s2-confluence | `sig-s2-confluence-m@m15|tp8|sl16|tr3.2|h96` | 2.00 | 0.40 | 6 | 487.74 | 15.36 |
| act-hf | `sig-act-hf-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 7 | 448.37 | 13.48 |
| supertrend | `sig-supertrend-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 6 | 259.97 | 11.33 |
| mfi | `sig-mfi-m@m15|tp3|sl6|tr0.75|h96` | 2.00 | 0.25 | 5 | 191.10 | 3.83 |
| reclaim | `sig-reclaim-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 12 | 148.87 | 18.45 |
| vwap | `sig-vwap-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 9 | 103.46 | 12.78 |
| ema-pullback | `sig-ema-pullback-m@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 7 | 78.94 | 7.03 |
| s2-active-hf | `sig-s2-active-hf-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 5 | 67.16 | 8.79 |
| williams-r | `sig-williams-r-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 5 | 57.32 | 17.39 |
| s2-vol-break | `sig-s2-vol-break-m@m15|tp3|sl6|tr0.75|h96` | 2.00 | 0.25 | 5 | 30.47 | 3.04 |
| rsi-mid | `sig-rsi-mid-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 7 | 21.63 | 4.13 |
| adx | `sig-adx-m@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 5 | 18.48 | 4.71 |
| hma | `sig-hma-m@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 5 | 17.20 | 7.65 |
| r-linreg | `sig-r-linreg-s@m15|tp8|sl16|tr3.2|h96` | 2.00 | 0.40 | 5 | 8.55 | 5.09 |
| trix | `sig-trix-s@m15|tp3|sl6|tr0.75|h96` | 2.00 | 0.25 | 8 | 8.22 | 4.76 |
| macd-slow | `sig-macd-slow-m@m15|tp4|sl8|tr1|h96` | 2.00 | 0.25 | 7 | 6.63 | 7.45 |
| s2-stoch-swing | `sig-s2-stoch-swing-m@m15|tp6|sl12|tr0|h96` | 2.00 | 0.00 | 5 | 4.00 | 29.00 |
| ema-trend | `sig-ema-trend-m@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 6 | 4.00 | 6.94 |
| ema-cross | `sig-ema-cross-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 5 | 4.00 | 10.77 |
| ema-slope | `sig-ema-slope-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 5 | 4.00 | 3.35 |
| ema-cross-fast | `sig-ema-cross-fast-m@m15|tp3|sl6|tr0.75|h96` | 2.00 | 0.25 | 5 | 4.00 | 5.46 |
| kama | `sig-kama-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 6 | 4.00 | 6.64 |
| obv | `sig-obv-m@m15|tp5|sl7.5|tr0|h96` | 1.50 | 0.00 | 6 | 4.00 | 28.80 |
| act-burst | `sig-act-burst-s@m15|tp5|sl15|tr0|h96` | 3.00 | 0.00 | 6 | 4.00 | 28.80 |
| r-vol-regime | `sig-r-vol-regime-s@m15|tp3|sl6|tr0.75|h96` | 2.00 | 0.25 | 6 | 3.33 | 2.37 |
| macd-hist | `sig-macd-hist-m@m15|tp3|sl9|tr0|h96` | 3.00 | 0.00 | 10 | 2.74 | 16.00 |
| atr-break | `sig-atr-break-s@m15|tp5|sl10|tr3|h96` | 2.00 | 0.60 | 7 | 2.43 | 14.63 |
| s2-block-scale | `sig-s2-block-scale-s@m15|tp4|sl6|tr0|h96` | 1.50 | 0.00 | 8 | 1.84 | 10.40 |
| donchian | `sig-donchian-s@m15|tp3|sl6|tr0|h96` | 2.00 | 0.00 | 5 | 1.81 | 5.00 |
| s2-adx-gate | `sig-s2-adx-gate-s@m15|tp2.5|sl7.5|tr0|h96` | 3.00 | 0.00 | 14 | 1.79 | 12.20 |
| keltner | `sig-keltner-s@m15|tp4|sl8|tr1|h96` | 2.00 | 0.25 | 5 | 1.68 | 0.22 |
| bollinger | `sig-bollinger-m@m15|tp5|sl10|tr1.25|h96` | 2.00 | 0.25 | 6 | 1.54 | 5.52 |
| s2-block-stack | `sig-s2-block-stack-s@m15|tp3|sl6|tr0|h96` | 2.00 | 0.00 | 8 | 1.35 | 4.40 |
| macd-cross | `sig-macd-cross-s@m15|tp3|sl6|tr1.2|h96` | 2.00 | 0.40 | 17 | 1.34 | 4.79 |
| sar | `sig-sar-m@m15|tp5|sl10|tr3|h96` | 2.00 | 0.60 | 5 | 1.12 | 1.26 |
| r-session-trend | `sig-r-session-trend-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 6 | 1.12 | 1.90 |
| stoch-rsi | `sig-stoch-rsi-m@m15|tp5|sl10|tr1.25|h96` | 2.00 | 0.25 | 22 | 1.11 | 2.41 |
| cmf | `sig-cmf-m@m15|tp4|sl8|tr1|h96` | 2.00 | 0.25 | 12 | 1.07 | 0.67 |
| heikin-ashi | `sig-heikin-ashi-s@m15|tp5|sl7.5|tr0|h96` | 1.50 | 0.00 | 8 | 1.04 | 0.90 |
| zscore | `sig-zscore-s@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 6 | 1.03 | 0.42 |
| thrust | `sig-thrust-m@m15|tp2.5|sl7.5|tr0|h96` | 3.00 | 0.00 | 13 | 1.00 | -0.10 |
| s2-bb-bounce | `sig-s2-bb-bounce-m@m15|tp5|sl10|tr1.25|h96` | 2.00 | 0.25 | 5 | 0.98 | -0.22 |
| r-awesome | `sig-r-awesome-m@m15|tp5|sl10|tr2|h96` | 2.00 | 0.40 | 5 | 0.97 | -0.26 |
| swing | `sig-swing-s@m15|tp2.5|sl3.75|tr0|h96` | 1.50 | 0.00 | 12 | 0.82 | -3.65 |
| cci | `sig-cci-m@m15|tp8|sl16|tr2|h96` | 2.00 | 0.25 | 6 | 0.81 | -3.06 |
| ichimoku | `sig-ichimoku-s@m15|tp2.5|sl7.5|tr0|h96` | 3.00 | 0.00 | 7 | 0.75 | -3.90 |
| r-nr-break | `sig-r-nr-break-m@m15|tp2.5|sl3.75|tr0|h96` | 1.50 | 0.00 | 9 | 0.73 | -4.30 |
| s2-atr-break | `sig-s2-atr-break-m@m15|tp3|sl6|tr0|h96` | 2.00 | 0.00 | 10 | 0.68 | -8.00 |
| r-connors | `sig-r-connors-m@m15|tp3|sl4.5|tr0|h96` | 1.50 | 0.00 | 6 | 0.60 | -5.70 |
| impulse | `sig-impulse-s@m15|tp6|sl12|tr2.4|h96` | 2.00 | 0.40 | 6 | 0.58 | -5.72 |
| s2-range-shift | `sig-s2-range-shift-m@m15|tp3|sl6|tr1.2|h96` | 2.00 | 0.40 | 5 | 0.45 | -6.89 |
| r-fractal | `sig-r-fractal-s@m15|tp2.5|sl3.75|tr0|h96` | 1.50 | 0.00 | 5 | 0.39 | -7.25 |
| s2-rsi-revert | `sig-s2-rsi-revert-s@m15|tp3|sl6|tr0.75|h96` | 2.00 | 0.25 | 8 | 0.18 | -10.59 |
| **book of each source’s best** | 53 configs | | | **390** | **1.73** | **288.5** |