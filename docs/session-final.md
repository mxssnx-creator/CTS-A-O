# 24 h simulated session — 12 symbols, 24 h pre-historic + 24 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-10-01 07:00 → 2026-10-02 07:00 UTC, run 2026-10-02 07:00 → 2026-10-03 07:00 UTC. Symbols: SAND-USDT, LYN-USDT, EVAA-USDT, MOVR-USDT, QNT-USDT, NIGHT-USDT, PUMP-USDT, 2Z-USDT, INIT-USDT, GRIFFAIN-USDT, WLD-USDT, MERL-USDT.

Settings (desk, docs/session-24h/desk-settings.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles trailing / block / blockActive / dca / axis, ranges micro / minimal / short / general / long (micro on), caps: positions none, signal positions none, coordination off, signals validated on their last 0. Block overall, 8 levels, Active from 2, ratio 0.5, max 4×. Balance $1000.00, each order unit a fixed $5.00 per unit, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [docs/session-final/index.html](session-final/index.html) · numbers: `docs/session-final/data.json`.

## Result

| balance | net | PF | unit PF | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $1000.00 → $2159.48 | $1159.48 (115.95 %) | 1.37 | 1.37 | 9.00 | 0.49 | $883.33 (43.37 %) | 5543 | 85 | 62.22 % | 14 / 24 | $4015.57 |

PF = gross profit $ ÷ gross loss $ as sized (a fixed $5.00 per unit, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing).

Engine: Base 403/16524 passed, Main 437 pairs, 120650 tapes, Real 1451, compute 43 s, peak RSS 4032 MB. Consistency checks: 39 of 39 pass.

## Findings

- **Strategy types positive:** Signal · Trailing $526.11 (PF 4.02, 503 orders) · Signal · Normal $320.81 (PF 2.13, 490 orders) · Trailing $141.41 (PF 1.17, 1463 orders) · Normal $122.45 (PF 1.08, 2389 orders) · DCA $43.33 (PF 1.12, 547 orders) · Axis $5.38 (PF 1.85, 151 orders).
- **Strategy types losing:** none.
- **Engine vs signals:** Engine $312.57 (PF 1.12, 4550 orders) · Signals $846.92 (PF 2.85, 993 orders).
- **Indication kinds positive:** volume $491.50 (PF 1.57, 1483 orders) · break $426.89 (PF 3.55, 479 orders) · active $129.03 (PF 1.89, 183 orders) · bollinger $89.88 (PF 1.75, 256 orders) · direction $75.92 (PF 1.50, 376 orders) · move $54.07 (PF 1.34, 358 orders).
- **Indication kinds losing:** ichimoku -$44.90 (PF 0.71, 175 orders) · sar -$42.44 (PF 0.17, 66 orders) · osc -$28.16 (PF 0.75, 121 orders) · channel -$24.41 (PF 0.75, 103 orders) · trend -$10.39 (PF 0.95, 353 orders) · ema -$5.48 (PF 0.93, 267 orders).
- **Signal sources positive:** r-vol-regime $329.69 (PF 742.18, 216 orders) · s2-vol-break $206.02 (PF 1.92, 351 orders) · s2-range-shift $132.49 (PF 2.01, 172 orders) · s2-block-scale $112.06 (PF 5.91, 140 orders) · volume-break $52.20 (PF 653.50, 30 orders) · s2-adx-gate $27.51 (PF ∞, 20 orders) · ema-pullback $12.85 (PF ∞, 11 orders).
- **Signal sources losing:** keltner -$14.51 (PF 0.00, 7 orders) · s2-block-stack -$9.27 (PF 0.07, 8 orders) · r-session-trend -$2.09 (PF 0.05, 2 orders) · s2-range-break -$0.02 (PF 1.00, 36 orders).
- **Symbols:** best SAND-USDT $859.30 (PF 2.28, 1298 orders) · EVAA-USDT $361.37 (PF 3.38, 538 orders) · NIGHT-USDT $344.38 (PF 2.33, 704 orders); worst QNT-USDT -$351.06 (PF 0.15, 318 orders) · PUMP-USDT -$227.12 (PF 0.38, 388 orders) · MERL-USDT -$223.67 (PF 0.43, 465 orders).
- **Block volume:** ×1 $5.38 (unit PF 1.85, 151) · ×1.5–2 $1.75 (unit PF 1.25, 59) · ×2–3 -$68.25 (unit PF 0.20, 178) · ×3–4 -$25.07 (unit PF 0.80, 358) · ×4–6 $35.37 (unit PF 2.71, 116) · ×6–8 $1210.32 (unit PF 1.42, 4681).
- **Lanes:** 1m -$5.85 (PF 0.89, 269) · 1m+ $0.78 (PF 1.07, 53) · 5m -$0.38 (PF 0.99, 116) · 5m+ -$29.47 (PF 0.55, 127) · 15m $644.23 (PF 1.57, 1995) · 15m+ $173.74 (PF 1.16, 1936) · 30m $376.44 (PF 1.54, 1047); **ranges:** Wide $895.62 (PF 2.08, 1691) · General $216.81 (PF 1.26, 1425) · Long $14.56 (PF 1.02, 1072) · Short $55.21 (PF 1.14, 813) · Minimal -$22.72 (PF 0.85, 542); **sides:** Long $1661.82 (PF 2.05, 3519) · Short -$502.33 (PF 0.67, 2024).
- **Hours:** 14 green / 10 red / 0 flat of 24 full hours; first order opened 07:00 UTC; best hour 03:00 $580.23, worst hour 14:00 -$310.17.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 07:00 | $1045.24 | $1009.16 | 2.28 % | $1019.79 | 39 | 11 / 4 / 11 | 37 | 55.77 | 55.77 | $45.24 | 0.05 | 0.01 | $45.24 | 55.77 |
| 08:00 | $1008.14 | $845.17 | 18.16 % | $1178.71 | 112 | 8 / 4 / 12 | 53 | 0.57 | 0.57 | -$37.10 | 1.05 | – | $8.14 | 1.09 |
| 09:00 | $1054.13 | $984.49 | 6.69 % | $1524.36 | 129 | 4 / 1 / 15 | 90 | 2.17 | 2.17 | $45.99 | 0.18 | 0.53 | $54.13 | 1.43 |
| 10:00 | $1172.75 | $1242.11 | 2.82 % | $2224.50 | 132 | 5 / 1 / 18 | 114 | 6.72 | 6.72 | $118.62 | 0.05 | 0.08 | $172.75 | 2.18 |
| 11:00 | $1696.15 | $1728.51 | 15.13 % | $2237.29 | 442 | 1 / 2 / 19 | 386 | 6.08 | 6.08 | $523.41 | 0.02 | 0.19 | $696.15 | 3.79 |
| 12:00 | $1912.89 | $1763.26 | 13.43 % | $2311.43 | 221 | 5 / 3 / 19 | 186 | 7.29 | 7.29 | $216.74 | 1.02 | 0.08 | $912.89 | 4.22 |
| 13:00 | $1948.76 | $1832.99 | 10.00 % | $2407.07 | 198 | 3 / 4 / 18 | 114 | 1.45 | 1.45 | $35.87 | 2.02 | 0.67 | $948.76 | 3.61 |
| 14:00 | $1638.59 | $1421.97 | 30.18 % | $2376.64 | 288 | 3 / 4 / 20 | 41 | 0.04 | 0.04 | -$310.17 | 3.02 | – | $638.59 | 1.93 |
| 15:00 | $1458.10 | $1234.01 | 39.41 % | $2252.36 | 214 | 5 / 4 / 19 | 66 | 0.15 | 0.15 | -$180.49 | 4.02 | – | $458.10 | 1.51 |
| 16:00 | $1787.30 | $1629.86 | 19.98 % | $2267.14 | 357 | 5 / 4 / 20 | 300 | 5.05 | 5.05 | $329.20 | 5.02 | 0.12 | $787.30 | 1.80 |
| 17:00 | $1736.93 | $1564.09 | 23.20 % | $2318.82 | 157 | 2 / 3 / 19 | 69 | 0.54 | 0.54 | -$50.37 | 6.02 | – | $736.93 | 1.68 |
| 18:00 | $1632.07 | $1413.06 | 30.62 % | $2258.82 | 511 | 8 / 9 / 18 | 257 | 0.75 | 0.75 | -$104.85 | 7.02 | – | $632.07 | 1.42 |
| 19:00 | $1689.20 | $1412.66 | 30.64 % | $3167.68 | 97 | 2 / 2 / 18 | 73 | 2.91 | 2.91 | $57.13 | 8.02 | 0.21 | $689.20 | 1.45 |
| 20:00 | $1714.42 | $1665.58 | 18.22 % | $3574.57 | 130 | 2 / 1 / 18 | 96 | 1.60 | 1.60 | $25.22 | 9.02 | 0.87 | $714.42 | 1.45 |
| 21:00 | $1731.77 | $1497.24 | 26.49 % | $3999.57 | 202 | 0 / 2 / 17 | 124 | 1.15 | 1.15 | $17.35 | 10.02 | 2.19 | $731.77 | 1.43 |
| 22:00 | $2020.89 | $1836.64 | 9.82 % | $4015.57 | 283 | 2 / 2 / 17 | 258 | 9.58 | 9.58 | $289.12 | 11.02 | 0.05 | $1020.89 | 1.59 |
| 23:00 | $1895.92 | $1791.73 | 12.03 % | $3560.00 | 449 | 6 / 5 / 18 | 216 | 0.68 | 0.68 | -$124.97 | 12.02 | – | $895.92 | 1.42 |
| 00:00 | $1641.43 | $1461.97 | 28.22 % | $2456.79 | 500 | 1 / 2 / 16 | 223 | 0.50 | 0.50 | -$254.49 | 13.02 | – | $641.43 | 1.24 |
| 01:00 | $1574.95 | $1451.95 | 28.71 % | $1431.43 | 175 | 0 / 2 / 16 | 73 | 0.57 | 0.57 | -$66.48 | 14.02 | – | $574.95 | 1.21 |
| 02:00 | $1595.11 | $1629.74 | 19.98 % | $1489.00 | 109 | 4 / 3 / 16 | 72 | 1.27 | 1.27 | $20.16 | 15.02 | 2.21 | $595.11 | 1.21 |
| 03:00 | $2175.35 | $2094.91 | 9.42 % | $1489.00 | 375 | 3 / 3 / 15 | 361 | 194.05 | 194.05 | $580.23 | 0.65 | 0.00 | $1175.35 | 1.41 |
| 04:00 | $2144.25 | $2116.26 | 8.50 % | $1024.50 | 124 | 0 / 2 / 14 | 59 | 0.56 | 0.56 | -$31.10 | 1.65 | – | $1144.25 | 1.39 |
| 05:00 | $2105.86 | $2113.39 | 8.63 % | $830.79 | 154 | 2 / 4 / 11 | 67 | 0.69 | 0.69 | -$38.39 | 2.65 | – | $1105.86 | 1.36 |
| 06:00 | $2159.48 | $2159.48 | 6.63 % | $354.93 | 145 | 3 / 14 / 0 | 114 | 2.32 | 2.32 | $53.63 | 3.65 | 0.30 | $1159.48 | 1.37 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 2389 | 78 | 1.08 | 1.08 | 54.46 % | $122.45 | 8.25 | 2.32 | 20.62 % | 12 / 24 |
| Trailing | 1463 | 75 | 1.17 | 1.17 | 59.26 % | $141.41 | 7.50 | 1.74 | 18.05 % | 13 / 24 |
| Axis | 151 | 24 | 1.85 | 1.85 | 70.86 % | $5.38 | 9.25 | 0.55 | 0.30 % | 15 / 19 |
| DCA | 547 | 97 | 1.12 | 1.12 | 66.91 % | $43.33 | 7.32 | 2.12 | 8.39 % | 13 / 24 |
| Signal · Normal | 490 | 10 | 2.13 | 2.13 | 81.22 % | $320.81 | 16.25 | 0.67 | 16.60 % | 11 / 19 |
| Signal · Trailing | 503 | 5 | 4.02 | 4.02 | 81.51 % | $526.11 | 14.25 | 0.20 | 8.18 % | 15 / 23 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block Active | 2389 | 78 | 1.08 | 1.08 | 54.46 % | $122.45 | 8.25 | 2.32 | 20.62 % | 12 / 24 |
| Trailing · Block Active | 1463 | 75 | 1.17 | 1.17 | 59.26 % | $141.41 | 7.50 | 1.74 | 18.05 % | 13 / 24 |
| Axis · Plain | 151 | 24 | 1.85 | 1.85 | 70.86 % | $5.38 | 9.25 | 0.55 | 0.30 % | 15 / 19 |
| DCA · Block Active | 547 | 97 | 1.12 | 1.12 | 66.91 % | $43.33 | 7.32 | 2.12 | 8.39 % | 13 / 24 |
| Signal · Normal · Block Active | 490 | 10 | 2.13 | 2.13 | 81.22 % | $320.81 | 16.25 | 0.67 | 16.60 % | 11 / 19 |
| Signal · Trailing · Block Active | 503 | 5 | 4.02 | 4.02 | 81.51 % | $526.11 | 14.25 | 0.20 | 8.18 % | 15 / 23 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| volume | 1483 | 39 | 1.57 | 1.57 | 65.07 % | $491.50 | 9.00 | 0.35 | 12.17 % | 15 / 24 |
| break | 479 | 45 | 3.55 | 3.55 | 80.58 % | $426.89 | 12.50 | 0.16 | 6.14 % | 19 / 24 |
| active | 183 | 11 | 1.89 | 1.89 | 69.40 % | $129.03 | 15.25 | 0.96 | 10.86 % | 10 / 18 |
| bollinger | 256 | 23 | 1.75 | 1.75 | 75.00 % | $89.88 | 7.50 | 0.46 | 3.72 % | 14 / 20 |
| direction | 376 | 42 | 1.50 | 1.50 | 64.89 % | $75.92 | 17.75 | 0.91 | 6.32 % | 15 / 22 |
| move | 358 | 43 | 1.34 | 1.34 | 69.27 % | $54.07 | 9.00 | 1.23 | 5.98 % | 11 / 21 |
| smooth | 119 | 29 | 2.04 | 2.04 | 71.43 % | $33.37 | 7.00 | 0.30 | 0.95 % | 13 / 20 |
| rsi | 1183 | 51 | 1.02 | 1.02 | 54.27 % | $15.73 | 7.32 | 19.13 | 23.56 % | 13 / 24 |
| macd | 21 | 14 | 0.71 | 0.71 | 85.71 % | -$1.10 | 16.08 | – | 0.32 % | 9 / 11 |
| ema | 267 | 32 | 0.93 | 0.93 | 52.43 % | -$5.48 | 17.50 | – | 4.02 % | 14 / 22 |
| trend | 353 | 41 | 0.95 | 0.95 | 53.54 % | -$10.39 | 17.25 | – | 6.36 % | 13 / 23 |
| channel | 103 | 29 | 0.75 | 0.75 | 53.40 % | -$24.41 | 13.25 | – | 5.89 % | 8 / 20 |
| osc | 121 | 37 | 0.75 | 0.75 | 43.80 % | -$28.16 | 20.50 | – | 4.59 % | 9 / 22 |
| sar | 66 | 6 | 0.17 | 0.17 | 33.33 % | -$42.44 | 23.75 | – | 4.43 % | 2 / 7 |
| ichimoku | 175 | 22 | 0.71 | 0.71 | 47.43 % | -$44.90 | 14.00 | – | 9.43 % | 8 / 16 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| r-vol-regime | 216 | 4 | 742.18 | 742.18 | 98.15 % | $329.69 | 1.75 | 0.00 | 0.02 % | 6 / 6 |
| s2-vol-break | 351 | 1 | 1.92 | 1.92 | 76.07 % | $206.02 | 18.75 | 0.95 | 15.38 % | 9 / 16 |
| s2-range-shift | 172 | 2 | 2.01 | 2.01 | 70.93 % | $132.49 | 15.25 | 0.87 | 10.16 % | 5 / 12 |
| s2-block-scale | 140 | 3 | 5.91 | 5.91 | 85.71 % | $112.06 | 11.75 | 0.14 | 1.48 % | 10 / 16 |
| volume-break | 30 | 1 | 653.50 | 653.50 | 96.67 % | $52.20 | 0.00 | 0.00 | 0.01 % | 1 / 1 |
| s2-adx-gate | 20 | 2 | ∞ | ∞ | 100.00 % | $27.51 | 0.00 | 0.00 | 0.00 % | 4 / 4 |
| ema-pullback | 11 | 1 | ∞ | ∞ | 100.00 % | $12.85 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| s2-range-break | 36 | 1 | 1.00 | 1.00 | 61.11 % | -$0.02 | 19.00 | – | 5.53 % | 2 / 7 |
| r-session-trend | 2 | 1 | 0.05 | 0.05 | 50.00 % | -$2.09 | 6.00 | – | 0.22 % | 1 / 2 |
| s2-block-stack | 8 | 2 | 0.07 | 0.07 | 50.00 % | -$9.27 | 9.00 | – | 0.99 % | 2 / 4 |
| keltner | 7 | 2 | 0.00 | 0.00 | 0.00 % | -$14.51 | 9.25 | – | 1.45 % | 0 / 3 |

Window of 24 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
