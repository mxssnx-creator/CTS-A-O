# 24 h simulated session — 5 symbols, 24 h pre-historic + 24 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-09-30 23:00 → 2026-10-01 23:00 UTC, run 2026-10-01 23:00 → 2026-10-02 23:10 UTC. Symbols: LYN-USDT, EVAA-USDT, SAND-USDT, MOVR-USDT, QNT-USDT.

Settings (desk, docs/session-24h/desk-settings.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / block / blockActive / dca / dcaActive / axis, ranges minimal / short / general / long (micro off), caps: positions none, signal positions none, coordination off, signals validated on their last 10. Block overall, 8 levels, Active from 2, ratio 0.25, max 4×. Balance $1000.00, each order unit 2.0 % of equity at entry, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [docs/session-24h/index.html](session-24h/index.html) · numbers: `docs/session-24h/data.json`.

## Result

| balance | net | PF | unit PF | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $1000.00 → -$165.15 | -$1165.15 (-116.51 %) | 0.61 | 1.14 | 10.92 | – | $2890.30 (108.83 %) | 622 | 13 | 67.68 % | 11 / 24 | $2738.25 |

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). **The equity reached $0 at 2026-10-02 15:15 UTC (lowest -$234.51): at this sizing with no position caps the account would have been liquidated there.**

Engine: Base 563/16524 passed, Main 563 pairs, 123768 tapes, Real 1021, compute 147 s, peak RSS 2166 MB. Consistency checks: 25 of 25 pass.

## Findings

- **Strategy types positive:** Normal $92.80 (PF 1.34, 187 orders) · Trailing $26.12 (PF 1.16, 113 orders).
- **Strategy types losing:** Signal · Normal -$699.37 (PF 0.48, 158 orders) · Signal · Trailing -$584.70 (PF 0.53, 164 orders).
- **Engine vs signals:** Engine $118.92 (PF 1.27, 300 orders) · Signals -$1284.07 (PF 0.50, 322 orders).
- **Indication kinds positive:** osc $73.20 (PF 1.42, 114 orders) · channel $49.09 (PF 11.24, 18 orders) · macd $4.36 (PF 3.61, 7 orders) · rsi $2.43 (PF 1.07, 31 orders).
- **Indication kinds losing:** volume -$680.14 (PF 0.50, 181 orders) · direction -$275.86 (PF 0.22, 42 orders) · break -$244.78 (PF 0.57, 102 orders) · bollinger -$30.46 (PF 0.47, 16 orders) · move -$26.96 (PF 0.12, 14 orders) · active -$21.27 (PF 0.95, 87 orders).
- **Signal sources positive:** rsi-mid $20.46 (PF ∞, 14 orders) · r-connors $10.14 (PF ∞, 7 orders).
- **Signal sources losing:** s2-vol-break -$753.37 (PF 0.44, 147 orders) · s2-block-scale -$276.92 (PF 0.21, 29 orders) · r-vol-regime -$133.25 (PF 0.65, 53 orders) · s2-atr-break -$120.24 (PF 0.00, 5 orders) · s2-range-shift -$30.89 (PF 0.92, 64 orders).
- **Symbols:** best EVAA-USDT $49.02 (PF 1.90, 91 orders) · LYN-USDT $27.92 (PF 3.65, 55 orders); worst SAND-USDT -$874.20 (PF 0.63, 368 orders) · MOVR-USDT -$367.88 (PF 0.38, 108 orders).

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 23:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 00:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 01:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 02:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 03:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 04:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 05:00 | $1116.82 | $1139.57 | 2.75 % | $309.81 | 18 | 1 / 0 / 2 | 18 | ∞ | ∞ | $116.82 | 0.18 | 0.00 | $116.82 | ∞ |
| 06:00 | $763.54 | $696.04 | 41.36 % | $429.08 | 29 | 5 / 3 / 3 | 8 | 0.11 | 0.12 | -$353.28 | 0.78 | – | -$236.46 | 0.40 |
| 07:00 | $788.20 | $719.22 | 39.41 % | $155.92 | 12 | 0 / 1 / 2 | 10 | 4.72 | 4.32 | $24.66 | 1.78 | 0.15 | -$211.80 | 0.48 |
| 08:00 | $798.71 | $694.35 | 41.51 % | $641.06 | 9 | 1 / 0 / 3 | 7 | 94.15 | 94.15 | $10.51 | 2.78 | 0.01 | -$201.29 | 0.50 |
| 09:00 | $807.45 | $693.01 | 41.62 % | $1031.06 | 48 | 0 / 0 / 3 | 25 | 1.11 | 1.12 | $8.74 | 3.78 | 8.94 | -$192.55 | 0.60 |
| 10:00 | $1017.99 | $1051.82 | 11.39 % | $1987.36 | 50 | 0 / 0 / 3 | 49 | 50.31 | 49.26 | $210.54 | 4.78 | 0.02 | $17.99 | 1.04 |
| 11:00 | $2094.70 | $2054.36 | 22.65 % | $2738.25 | 165 | 0 / 0 / 3 | 164 | 116.38 | 88.50 | $1076.71 | 0.02 | 0.01 | $1094.70 | 3.20 |
| 12:00 | $1940.38 | $1109.38 | 58.23 % | $2738.25 | 24 | 0 / 0 / 3 | 7 | 0.27 | 0.51 | -$154.33 | 1.02 | – | $940.38 | 2.32 |
| 13:00 | $1818.10 | $1176.89 | 55.69 % | $2135.09 | 8 | 0 / 0 / 3 | 1 | 0.02 | 0.02 | -$122.28 | 2.02 | – | $818.10 | 1.98 |
| 14:00 | $1085.16 | $184.50 | 93.05 % | $2013.21 | 33 | 1 / 0 / 4 | 1 | 0.00 | 0.00 | -$732.93 | 3.02 | – | $85.16 | 1.05 |
| 15:00 | $595.97 | -$117.70 | 104.43 % | $1112.43 | 16 | 1 / 0 / 5 | 3 | 0.01 | 0.01 | -$489.20 | 4.02 | – | -$404.03 | 0.80 |
| 16:00 | $613.91 | $26.27 | 99.01 % | $850.25 | 18 | 0 / 0 / 5 | 14 | 3.65 | 3.36 | $17.95 | 5.02 | 0.20 | -$386.09 | 0.81 |
| 17:00 | $653.29 | $79.65 | 97.00 % | $868.20 | 25 | 0 / 0 / 5 | 20 | 3.96 | 3.61 | $39.37 | 6.02 | 0.19 | -$346.71 | 0.83 |
| 18:00 | -$194.51 | -$217.39 | 108.19 % | $976.65 | 75 | 1 / 2 / 5 | 29 | 0.07 | 0.16 | -$847.80 | 7.02 | – | -$1194.51 | 0.60 |
| 19:00 | -$187.54 | -$193.01 | 107.27 % | $136.42 | 9 | 3 / 0 / 7 | 8 | ∞ | 20.53 | $6.97 | 8.02 | 0.00 | -$1187.54 | 0.60 |
| 20:00 | -$206.98 | -$177.24 | 106.67 % | $100.76 | 15 | 0 / 2 / 5 | 8 | 0.30 | 0.45 | -$19.45 | 9.02 | – | -$1206.98 | 0.60 |
| 21:00 | -$172.20 | -$167.58 | 106.31 % | $65.46 | 24 | 0 / 1 / 4 | 13 | ∞ | 1.29 | $34.78 | 10.02 | 0.00 | -$1172.20 | 0.61 |
| 22:00 | -$165.15 | -$165.15 | 106.22 % | $13.07 | 44 | 0 / 4 / 0 | 36 | ∞ | 3.92 | $7.06 | 11.02 | 0.00 | -$1165.15 | 0.61 |
| 23:00 (10 min) | -$165.15 | -$165.15 | 106.22 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 11.18 | – | -$1165.15 | 0.61 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 187 | 24 | 1.34 | 1.88 | 66.84 % | $92.80 | 11.17 | 1.61 | 12.63 % | 11 / 18 |
| Trailing | 113 | 25 | 1.16 | 1.49 | 68.14 % | $26.12 | 11.17 | 3.23 | 7.80 % | 11 / 17 |
| Signal · Normal | 158 | 7 | 0.48 | 0.92 | 67.09 % | -$699.37 | 11.17 | – | 79.53 % | 6 / 14 |
| Signal · Trailing | 164 | 4 | 0.53 | 0.92 | 68.90 % | -$584.70 | 10.92 | – | 71.64 % | 8 / 14 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block Active | 187 | 24 | 1.34 | 1.88 | 66.84 % | $92.80 | 11.17 | 1.61 | 12.63 % | 11 / 18 |
| Trailing · Block Active | 113 | 25 | 1.16 | 1.49 | 68.14 % | $26.12 | 11.17 | 3.23 | 7.80 % | 11 / 17 |
| Signal · Normal · Block Active | 158 | 7 | 0.48 | 0.92 | 67.09 % | -$699.37 | 11.17 | – | 79.53 % | 6 / 14 |
| Signal · Trailing · Block Active | 164 | 4 | 0.53 | 0.92 | 68.90 % | -$584.70 | 10.92 | – | 71.64 % | 8 / 14 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| osc | 114 | 20 | 1.42 | 1.97 | 70.18 % | $73.20 | 11.17 | 1.10 | 7.26 % | 11 / 17 |
| channel | 18 | 12 | 11.24 | 5.81 | 88.89 % | $49.09 | 1.50 | 0.10 | 0.47 % | 7 / 9 |
| macd | 7 | 6 | 3.61 | 1.70 | 71.43 % | $4.36 | 6.17 | 0.38 | 0.17 % | 2 / 5 |
| rsi | 31 | 8 | 1.07 | 1.98 | 83.87 % | $2.43 | 8.92 | 13.21 | 3.12 % | 5 / 10 |
| trend | 10 | 6 | 0.05 | 0.39 | 50.00 % | -$14.76 | 9.67 | – | 1.56 % | 0 / 5 |
| active | 87 | 7 | 0.95 | 1.97 | 74.71 % | -$21.27 | 10.92 | – | 27.62 % | 8 / 13 |
| move | 14 | 10 | 0.12 | 0.34 | 28.57 % | -$26.96 | 15.92 | – | 2.70 % | 2 / 7 |
| bollinger | 16 | 7 | 0.47 | 1.70 | 68.75 % | -$30.46 | 11.17 | – | 5.00 % | 3 / 7 |
| break | 102 | 9 | 0.57 | 0.74 | 61.76 % | -$244.78 | 16.92 | – | 39.69 % | 8 / 15 |
| direction | 42 | 11 | 0.22 | 0.47 | 57.14 % | -$275.86 | 11.42 | – | 32.69 % | 4 / 11 |
| volume | 181 | 9 | 0.50 | 1.06 | 67.40 % | -$680.14 | 10.92 | – | 81.21 % | 10 / 16 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rsi-mid | 14 | 1 | ∞ | ∞ | 100.00 % | $20.46 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| r-connors | 7 | 1 | ∞ | ∞ | 100.00 % | $10.14 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| obv | 3 | 1 | – | 0.00 | 0.00 % | $0.00 | 0.00 | – | 0.00 % | 0 / 2 |
| s2-range-shift | 64 | 1 | 0.92 | 2.11 | 78.13 % | -$30.89 | 10.92 | – | 28.41 % | 5 / 8 |
| s2-atr-break | 5 | 1 | 0.00 | 0.00 | 0.00 % | -$120.24 | 11.17 | – | 12.02 % | 0 / 4 |
| r-vol-regime | 53 | 2 | 0.65 | 0.72 | 67.92 % | -$133.25 | 16.92 | – | 37.77 % | 5 / 6 |
| s2-block-scale | 29 | 4 | 0.21 | 0.42 | 55.17 % | -$276.92 | 11.42 | – | 32.59 % | 3 / 8 |
| s2-vol-break | 147 | 2 | 0.44 | 0.91 | 65.31 % | -$753.37 | 10.92 | – | 84.51 % | 6 / 11 |

Window of 24 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
