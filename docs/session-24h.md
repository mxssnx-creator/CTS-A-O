# 24 h simulated session — 12 symbols, 24 h pre-historic + 24 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-09-30 23:00 → 2026-10-01 23:00 UTC, run 2026-10-01 23:00 → 2026-10-02 23:06 UTC. Symbols: LYN-USDT, EVAA-USDT, SAND-USDT, MOVR-USDT, QNT-USDT, PUMP-USDT, INIT-USDT, NIGHT-USDT, 2Z-USDT, GRIFFAIN-USDT, MERL-USDT, WLD-USDT.

Settings (desk, docs/session-24h/desk-settings.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / block / blockActive / dca / dcaActive / axis, ranges minimal / short / general / long (micro off), caps: positions none, signal positions none, coordination off, signals validated on their last 10. Block overall, 8 levels, Active from 2, ratio 0.25, max 4×. Balance $1000.00, each order unit 2.0 % of equity at entry, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [docs/session-24h/index.html](session-24h/index.html) · numbers: `docs/session-24h/data.json`.

## Result

| balance | net | PF | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $1000.00 → $749.70 | -$250.30 (-25.03 %) | 0.90 | 8.85 | – | $1562.81 (70.49 %) | 599 | 31 | 59.93 % | 11 / 24 | $2369.93 |

Engine: Base 502/16524 passed, Main 521 pairs, 114246 tapes, Real 1192, compute 175 s, peak RSS 3652 MB. Consistency checks: 25 of 25 pass.

## Findings

- **Strategy types positive:** Normal $162.74 (PF 1.28, 233 orders) · Trailing $138.06 (PF 1.37, 163 orders).
- **Strategy types losing:** Signal · Trailing -$319.10 (PF 0.64, 113 orders) · Signal · Normal -$232.01 (PF 0.66, 90 orders).
- **Engine vs signals:** Engine $300.80 (PF 1.31, 396 orders) · Signals -$551.11 (PF 0.65, 203 orders).
- **Indication kinds positive:** bollinger $131.63 (PF 4.21, 40 orders) · rsi $80.17 (PF 1.65, 54 orders) · channel $59.80 (PF 2.89, 26 orders) · active $54.43 (PF 1.37, 29 orders) · osc $41.05 (PF 1.51, 32 orders) · macd $5.86 (PF 2.22, 4 orders).
- **Indication kinds losing:** direction -$300.25 (PF 0.51, 96 orders) · break -$138.94 (PF 0.47, 35 orders) · volume -$91.38 (PF 0.88, 127 orders) · ema -$52.89 (PF 0.55, 37 orders) · smooth -$12.30 (PF 0.74, 15 orders) · move -$12.16 (PF 0.43, 4 orders).
- **Signal sources positive:** rsi-mid $66.27 (PF ∞, 12 orders) · s2-range-shift $35.64 (PF 1.25, 26 orders) · r-connors $15.37 (PF ∞, 3 orders).
- **Signal sources losing:** s2-block-scale -$366.77 (PF 0.31, 55 orders) · s2-vol-break -$159.02 (PF 0.77, 87 orders) · s2-atr-break -$101.39 (PF 0.07, 7 orders) · r-vol-regime -$29.51 (PF 0.70, 11 orders) · obv -$11.71 (PF 0.00, 2 orders).
- **Symbols:** best PUMP-USDT $227.99 (PF 2.48, 79 orders) · 2Z-USDT $211.78 (PF ∞, 29 orders) · MOVR-USDT $178.48 (PF 1.71, 91 orders); worst SAND-USDT -$889.74 (PF 0.49, 229 orders) · WLD-USDT -$99.54 (PF 0.22, 31 orders) · GRIFFAIN-USDT -$69.09 (PF 0.10, 24 orders).

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 23:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 00:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 01:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 02:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 03:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 04:00 | $1000.00 | $999.60 | 0.04 % | $20.00 | 0 | 0 / 0 / 1 | 0 | – | $0.00 | 0.02 | – | $0.00 | – |
| 05:00 | $1088.82 | $1110.81 | 2.25 % | $248.74 | 13 | 2 / 0 / 2 | 13 | ∞ | $88.82 | 0.18 | 0.00 | $88.82 | ∞ |
| 06:00 | $1040.99 | $1005.95 | 15.34 % | $331.36 | 17 | 1 / 0 / 3 | 12 | 0.57 | -$47.83 | 0.78 | – | $40.99 | 1.36 |
| 07:00 | $1124.78 | $1092.64 | 8.04 % | $331.36 | 14 | 0 / 1 / 4 | 14 | ∞ | $83.79 | 1.78 | 0.00 | $124.78 | 2.11 |
| 08:00 | $1184.44 | $1094.26 | 7.90 % | $370.51 | 10 | 3 / 0 / 5 | 9 | 622.21 | $59.66 | 2.78 | 0.00 | $184.44 | 2.64 |
| 09:00 | $1205.60 | $1093.59 | 8.40 % | $1662.29 | 13 | 1 / 0 / 7 | 9 | 3.83 | $21.16 | 0.58 | 0.35 | $205.60 | 2.71 |
| 10:00 | $1387.71 | $1480.16 | 2.62 % | $1720.58 | 36 | 1 / 0 / 7 | 35 | 33.12 | $182.11 | 0.05 | 0.03 | $387.71 | 4.09 |
| 11:00 | $1963.91 | $1960.93 | 11.55 % | $2369.93 | 74 | 0 / 0 / 7 | 73 | 158.54 | $576.20 | 0.02 | 0.01 | $963.91 | 8.46 |
| 12:00 | $2031.29 | $1644.87 | 25.81 % | $2369.93 | 35 | 0 / 1 / 7 | 23 | 1.50 | $67.38 | 1.02 | 1.85 | $1031.29 | 4.91 |
| 13:00 | $2154.73 | $1840.45 | 16.98 % | $2023.07 | 39 | 1 / 1 / 6 | 30 | 2.30 | $123.44 | 2.02 | 0.69 | $1154.73 | 4.22 |
| 14:00 | $1833.02 | $1288.29 | 41.89 % | $1702.27 | 21 | 0 / 0 / 8 | 3 | 0.03 | -$321.71 | 3.02 | – | $833.02 | 2.21 |
| 15:00 | $1652.73 | $941.71 | 57.52 % | $1712.29 | 56 | 4 / 2 / 10 | 14 | 0.21 | -$180.29 | 4.02 | – | $652.73 | 1.71 |
| 16:00 | $1806.69 | $1151.13 | 48.08 % | $1597.80 | 47 | 3 / 3 / 9 | 31 | 2.88 | $153.96 | 5.02 | 0.41 | $806.69 | 1.81 |
| 17:00 | $1763.74 | $1128.81 | 49.08 % | $1875.79 | 19 | 4 / 0 / 12 | 9 | 0.47 | -$42.95 | 6.02 | – | $763.74 | 1.71 |
| 18:00 | $764.08 | $701.08 | 68.38 % | $2036.55 | 108 | 4 / 8 / 11 | 32 | 0.19 | -$999.66 | 7.02 | – | -$235.92 | 0.90 |
| 19:00 | $772.39 | $725.89 | 67.26 % | $557.16 | 14 | 5 / 1 / 14 | 6 | 1.25 | $8.31 | 8.02 | 2.15 | -$227.61 | 0.90 |
| 20:00 | $711.55 | $749.54 | 66.19 % | $560.74 | 10 | 2 / 2 / 12 | 3 | 0.12 | -$60.84 | 9.02 | – | -$288.45 | 0.88 |
| 21:00 | $670.88 | $700.87 | 68.39 % | $560.74 | 37 | 0 / 6 / 6 | 13 | 0.55 | -$40.67 | 10.02 | – | -$329.12 | 0.87 |
| 22:00 | $749.70 | $749.70 | 66.18 % | $310.70 | 36 | 0 / 6 / 0 | 30 | 3.64 | $78.81 | 11.02 | 0.20 | -$250.30 | 0.90 |
| 23:00 (6 min) | $749.70 | $749.70 | 66.18 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 11.12 | – | -$250.30 | 0.90 |

## Per strategy type

| type | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 233 | 44 | 1.28 | 51.07 % | $162.74 | 9.35 | 1.18 | 14.96 % | 11 / 18 |
| Trailing | 163 | 39 | 1.37 | 60.74 % | $138.06 | 5.60 | 0.81 | 9.38 % | 13 / 18 |
| Signal · Normal | 90 | 8 | 0.66 | 66.67 % | -$232.01 | 10.85 | – | 43.87 % | 5 / 13 |
| Signal · Trailing | 113 | 6 | 0.64 | 71.68 % | -$319.10 | 8.85 | – | 53.97 % | 10 / 15 |

| type · sub-type | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block Active | 233 | 44 | 1.28 | 51.07 % | $162.74 | 9.35 | 1.18 | 14.96 % | 11 / 18 |
| Trailing · Block Active | 163 | 39 | 1.37 | 60.74 % | $138.06 | 5.60 | 0.81 | 9.38 % | 13 / 18 |
| Signal · Normal · Block Active | 90 | 8 | 0.66 | 66.67 % | -$232.01 | 10.85 | – | 43.87 % | 5 / 13 |
| Signal · Trailing · Block Active | 113 | 6 | 0.64 | 71.68 % | -$319.10 | 8.85 | – | 53.97 % | 10 / 15 |

## Per indication kind

| indication kind | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| bollinger | 40 | 19 | 4.21 | 82.50 % | $131.63 | 6.75 | 0.14 | 1.64 % | 12 / 12 |
| rsi | 54 | 17 | 1.65 | 72.22 % | $80.17 | 10.85 | 1.12 | 7.74 % | 9 / 13 |
| channel | 26 | 14 | 2.89 | 69.23 % | $59.80 | 5.10 | 0.41 | 2.28 % | 8 / 10 |
| active | 29 | 4 | 1.37 | 68.97 % | $54.43 | 10.85 | 2.29 | 10.59 % | 5 / 11 |
| osc | 32 | 14 | 1.51 | 59.38 % | $41.05 | 7.50 | 0.77 | 3.11 % | 6 / 9 |
| macd | 4 | 3 | 2.22 | 75.00 % | $5.86 | 4.10 | 0.82 | 0.48 % | 2 / 3 |
| ichimoku | 19 | 8 | 0.89 | 42.11 % | -$4.71 | 8.00 | – | 2.22 % | 4 / 6 |
| trend | 81 | 24 | 0.95 | 41.98 % | -$10.61 | 9.35 | – | 9.23 % | 7 / 13 |
| move | 4 | 4 | 0.43 | 25.00 % | -$12.16 | 14.60 | – | 2.10 % | 1 / 3 |
| smooth | 15 | 6 | 0.74 | 33.33 % | -$12.30 | 9.60 | – | 3.74 % | 3 / 7 |
| ema | 37 | 6 | 0.55 | 29.73 % | -$52.89 | 9.60 | – | 9.61 % | 3 / 7 |
| volume | 127 | 17 | 0.88 | 70.08 % | -$91.38 | 10.85 | – | 43.49 % | 10 / 16 |
| break | 35 | 12 | 0.47 | 51.43 % | -$138.94 | 16.85 | – | 18.04 % | 5 / 11 |
| direction | 96 | 18 | 0.51 | 63.54 % | -$300.25 | 7.35 | – | 43.59 % | 7 / 11 |

## Per signal source

| source | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rsi-mid | 12 | 1 | ∞ | 100.00 % | $66.27 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| s2-range-shift | 26 | 2 | 1.25 | 69.23 % | $35.64 | 10.85 | 4.03 | 12.18 % | 4 / 9 |
| r-connors | 3 | 1 | ∞ | 100.00 % | $15.37 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| obv | 2 | 1 | 0.00 | 0.00 % | -$11.71 | 4.10 | – | 1.17 % | 0 / 2 |
| r-vol-regime | 11 | 2 | 0.70 | 72.73 % | -$29.51 | 16.85 | – | 9.93 % | 3 / 4 |
| s2-atr-break | 7 | 1 | 0.07 | 14.29 % | -$101.39 | 11.10 | – | 10.14 % | 0 / 4 |
| s2-vol-break | 87 | 2 | 0.77 | 72.41 % | -$159.02 | 10.85 | – | 44.60 % | 5 / 9 |
| s2-block-scale | 55 | 5 | 0.31 | 65.45 % | -$366.77 | 7.35 | – | 44.94 % | 6 / 9 |

Window of 24 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
