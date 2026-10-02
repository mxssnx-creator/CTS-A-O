# 24 h simulated session — 5 symbols, 24 h pre-historic + 24 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-09-30 22:00 → 2026-10-01 22:00 UTC, run 2026-10-01 22:00 → 2026-10-02 22:57 UTC. Symbols: SAND-USDT, QNT-USDT, LYN-USDT, MOVR-USDT, EVAA-USDT.

Settings (desk, docs/session-24h/desk-settings.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / block / blockActive / dca / dcaActive / axis, ranges minimal / short / general / long (micro off), caps: positions none, signal positions none, coordination off, signals validated on their last 10. Block overall, 8 levels, Active from 2, ratio 0.25, max 4×. Balance $1000.00, each order unit 2.0 % of equity at entry, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [docs/session-24h/index.html](session-24h/index.html) · numbers: `docs/session-24h/data.json`.

## Result

| balance | net | PF | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $1000.00 → -$165.78 | -$1165.78 (-116.58 %) | 0.62 | 10.70 | – | $2934.23 (108.75 %) | 618 | 13 | 68.45 % | 10 / 24 | $2783.19 |

Engine: Base 559/16524 passed, Main 559 pairs, 122874 tapes, Real 1048, compute 139 s, peak RSS 2193 MB. Consistency checks: 25 of 25 pass.

## Findings

- **Strategy types positive:** Normal $95.61 (PF 1.35, 184 orders) · Trailing $33.81 (PF 1.21, 113 orders).
- **Strategy types losing:** Signal · Normal -$706.44 (PF 0.48, 157 orders) · Signal · Trailing -$588.75 (PF 0.53, 164 orders).
- **Engine vs signals:** Engine $129.42 (PF 1.30, 297 orders) · Signals -$1295.20 (PF 0.51, 321 orders).
- **Indication kinds positive:** osc $78.09 (PF 1.44, 114 orders) · channel $50.34 (PF 11.28, 18 orders) · macd $4.46 (PF 3.63, 7 orders) · rsi $2.05 (PF 1.06, 31 orders).
- **Indication kinds losing:** volume -$690.40 (PF 0.50, 180 orders) · direction -$279.33 (PF 0.22, 42 orders) · break -$242.27 (PF 0.58, 97 orders) · move -$27.15 (PF 0.13, 14 orders) · bollinger -$26.71 (PF 0.54, 18 orders) · active -$19.83 (PF 0.95, 87 orders).
- **Signal sources positive:** rsi-mid $20.89 (PF ∞, 14 orders) · r-connors $10.35 (PF ∞, 7 orders).
- **Signal sources losing:** s2-vol-break -$765.59 (PF 0.44, 147 orders) · s2-block-scale -$280.42 (PF 0.21, 29 orders) · r-vol-regime -$128.57 (PF 0.66, 53 orders) · s2-atr-break -$122.26 (PF 0.00, 5 orders) · s2-range-shift -$29.59 (PF 0.92, 64 orders).
- **Symbols:** best EVAA-USDT $50.37 (PF 1.97, 89 orders) · LYN-USDT $28.27 (PF 3.65, 53 orders); worst SAND-USDT -$875.97 (PF 0.63, 369 orders) · MOVR-USDT -$368.45 (PF 0.38, 107 orders).

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 23:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 00:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 01:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 02:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 03:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 04:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | $0.00 | 0.00 | – | $0.00 | – |
| 05:00 | $1116.82 | $1139.57 | 2.75 % | $309.81 | 18 | 1 / 0 / 2 | 18 | ∞ | $116.82 | 0.18 | 0.00 | $116.82 | ∞ |
| 06:00 | $764.92 | $702.27 | 40.84 % | $429.08 | 28 | 5 / 3 / 3 | 8 | 0.11 | -$351.90 | 0.78 | – | -$235.08 | 0.41 |
| 07:00 | $805.78 | $736.79 | 37.93 % | $178.88 | 17 | 0 / 1 / 2 | 15 | 7.03 | $40.86 | 1.78 | 0.09 | -$194.22 | 0.52 |
| 08:00 | $816.52 | $711.02 | 40.10 % | $656.52 | 9 | 1 / 0 / 3 | 7 | 94.15 | $10.74 | 2.78 | 0.01 | -$183.48 | 0.54 |
| 09:00 | $824.41 | $708.75 | 40.29 % | $1055.22 | 48 | 0 / 0 / 3 | 25 | 1.09 | $7.89 | 3.78 | 10.25 | -$175.59 | 0.64 |
| 10:00 | $1039.58 | $1075.75 | 9.38 % | $2011.10 | 50 | 0 / 0 / 3 | 49 | 50.30 | $215.17 | 4.78 | 0.02 | $39.58 | 1.08 |
| 11:00 | $2129.84 | $2089.87 | 22.54 % | $2783.19 | 164 | 0 / 0 / 3 | 163 | 117.83 | $1090.25 | 0.02 | 0.01 | $1129.84 | 3.26 |
| 12:00 | $1973.18 | $1128.97 | 58.16 % | $2783.19 | 24 | 0 / 0 / 3 | 7 | 0.27 | -$156.66 | 1.02 | – | $973.18 | 2.36 |
| 13:00 | $1848.84 | $1197.59 | 55.61 % | $2169.48 | 8 | 0 / 0 / 3 | 1 | 0.02 | -$124.33 | 2.02 | – | $848.84 | 2.01 |
| 14:00 | $1104.29 | $189.56 | 92.97 % | $2045.57 | 33 | 1 / 0 / 4 | 1 | 0.00 | -$744.55 | 3.02 | – | $104.29 | 1.07 |
| 15:00 | $606.89 | -$117.59 | 104.36 % | $1129.70 | 16 | 1 / 0 / 5 | 3 | 0.01 | -$497.40 | 4.02 | – | -$393.11 | 0.81 |
| 16:00 | $625.45 | $27.19 | 98.99 % | $858.58 | 18 | 0 / 0 / 5 | 14 | 3.69 | $18.56 | 5.02 | 0.19 | -$374.55 | 0.82 |
| 17:00 | $662.33 | $79.74 | 97.04 % | $874.63 | 24 | 0 / 0 / 5 | 19 | 3.72 | $36.87 | 6.02 | 0.21 | -$337.67 | 0.84 |
| 18:00 | -$195.85 | -$218.89 | 108.11 % | $984.58 | 74 | 1 / 2 / 5 | 29 | 0.07 | -$858.17 | 7.02 | – | -$1195.85 | 0.60 |
| 19:00 | -$188.80 | -$194.06 | 107.19 % | $137.93 | 8 | 3 / 0 / 7 | 7 | ∞ | $7.04 | 8.02 | 0.00 | -$1188.80 | 0.61 |
| 20:00 | -$208.09 | -$178.06 | 106.60 % | $101.95 | 15 | 0 / 2 / 5 | 8 | 0.31 | -$19.29 | 9.02 | – | -$1208.09 | 0.60 |
| 21:00 | -$172.93 | -$168.25 | 106.24 % | $66.28 | 22 | 0 / 2 / 3 | 13 | ∞ | $35.16 | 10.02 | 0.00 | -$1172.93 | 0.62 |
| 22:00 (57 min) | -$165.78 | -$165.78 | 106.14 % | $13.25 | 42 | 0 / 3 / 0 | 36 | ∞ | $7.15 | 10.97 | 0.00 | -$1165.78 | 0.62 |

## Per strategy type

| type | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 184 | 23 | 1.35 | 68.48 % | $95.61 | 10.95 | 1.59 | 12.75 % | 11 / 18 |
| Trailing | 113 | 25 | 1.21 | 69.03 % | $33.81 | 10.95 | 2.54 | 7.87 % | 11 / 17 |
| Signal · Normal | 157 | 7 | 0.48 | 67.52 % | -$706.44 | 10.95 | – | 80.18 % | 6 / 13 |
| Signal · Trailing | 164 | 4 | 0.53 | 68.90 % | -$588.75 | 10.70 | – | 72.17 % | 8 / 14 |

| type · sub-type | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block Active | 184 | 23 | 1.35 | 68.48 % | $95.61 | 10.95 | 1.59 | 12.75 % | 11 / 18 |
| Trailing · Block Active | 113 | 25 | 1.21 | 69.03 % | $33.81 | 10.95 | 2.54 | 7.87 % | 11 / 17 |
| Signal · Normal · Block Active | 157 | 7 | 0.48 | 67.52 % | -$706.44 | 10.95 | – | 80.18 % | 6 / 13 |
| Signal · Trailing · Block Active | 164 | 4 | 0.53 | 68.90 % | -$588.75 | 10.70 | – | 72.17 % | 8 / 14 |

## Per indication kind

| indication kind | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| osc | 114 | 20 | 1.44 | 70.18 % | $78.09 | 10.95 | 1.05 | 7.35 % | 11 / 17 |
| channel | 18 | 12 | 11.28 | 88.89 % | $50.34 | 1.50 | 0.10 | 0.48 % | 7 / 9 |
| macd | 7 | 6 | 3.63 | 71.43 % | $4.46 | 5.95 | 0.38 | 0.17 % | 2 / 5 |
| rsi | 31 | 8 | 1.06 | 83.87 % | $2.05 | 8.70 | 15.96 | 3.17 % | 5 / 10 |
| trend | 10 | 6 | 0.05 | 50.00 % | -$15.01 | 9.45 | – | 1.59 % | 0 / 5 |
| active | 87 | 7 | 0.95 | 74.71 % | -$19.83 | 10.70 | – | 27.92 % | 8 / 13 |
| bollinger | 18 | 8 | 0.54 | 72.22 % | -$26.71 | 10.95 | – | 5.07 % | 4 / 8 |
| move | 14 | 10 | 0.13 | 28.57 % | -$27.15 | 15.70 | – | 2.71 % | 2 / 7 |
| break | 97 | 8 | 0.58 | 64.95 % | -$242.27 | 16.70 | – | 39.55 % | 8 / 15 |
| direction | 42 | 11 | 0.22 | 57.14 % | -$279.33 | 11.20 | – | 33.10 % | 4 / 11 |
| volume | 180 | 9 | 0.50 | 67.78 % | -$690.40 | 10.70 | – | 81.96 % | 10 / 16 |

## Per signal source

| source | orders | positions | PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rsi-mid | 14 | 1 | ∞ | 100.00 % | $20.89 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| r-connors | 7 | 1 | ∞ | 100.00 % | $10.35 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| obv | 2 | 1 | – | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 1 |
| s2-range-shift | 64 | 1 | 0.92 | 78.13 % | -$29.59 | 10.70 | – | 28.72 % | 5 / 8 |
| s2-atr-break | 5 | 1 | 0.00 | 0.00 % | -$122.26 | 10.95 | – | 12.23 % | 0 / 4 |
| r-vol-regime | 53 | 2 | 0.66 | 67.92 % | -$128.57 | 16.70 | – | 37.77 % | 5 / 6 |
| s2-block-scale | 29 | 4 | 0.21 | 55.17 % | -$280.42 | 11.20 | – | 33.00 % | 3 / 8 |
| s2-vol-break | 147 | 2 | 0.44 | 65.31 % | -$765.59 | 10.70 | – | 85.38 % | 6 / 11 |

Window of 24 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
