# 24 h simulated session — 12 symbols, 24 h pre-historic + 24 h run, desk settings

Real BingX 1m data (public market data only), the engine itself (Base → Main → Real over the 1 / 5 / 15 / 30 min lanes), pre-historic 2026-09-30 23:00 → 2026-10-01 23:00 UTC, run 2026-10-01 23:00 → 2026-10-02 23:20 UTC. Symbols: SAND-USDT, EVAA-USDT, LYN-USDT, MOVR-USDT, QNT-USDT, 2Z-USDT, INIT-USDT, NIGHT-USDT, PUMP-USDT, GRIFFAIN-USDT, WLD-USDT, MERL-USDT.

Settings (desk, docs/session-24h/desk-settings.json): stage gate min PF 1.05, focus every combo, disabled kinds none, toggles normal / trailing / block / blockActive / dca / dcaActive / axis, ranges minimal / short / general / long (micro off), caps: positions none, signal positions none, coordination off, signals validated on their last 10. Block overall, 8 levels, Active from 2, ratio 0.25, max 4×. Balance $1000.00, each order unit 2.0 % of the realized equity per unit, compounding, 10× for the margin, 0.20 % round-trip cost per close.

Full report with diagrams: [docs/session-24h/index.html](session-24h/index.html) · numbers: `docs/session-24h/data.json`.

## Result

| balance | net | PF | unit PF | DDT (h) | DDR | equity max DD | orders | positions | WR | green hours | peak margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $1000.00 → $737.47 | -$262.53 (-26.25 %) | 0.90 | 1.16 | 9.08 | – | $1723.16 (72.02 %) | 581 | 35 | 59.38 % | 12 / 24 | $2602.02 |

PF = gross profit $ ÷ gross loss $ as sized (2.0 % of the realized equity per unit, compounding, × the Block multiple); unit PF = the same orders each at one unit (the engine's PF, independent of the sizing). At a fixed unit of $20.00 (no compounding) the same orders net $233.79 (23.38 %), closed-order max drawdown $878.57.

Engine: Base 471/16524 passed, Main 494 pairs, 108414 tapes, Real 1179, compute 237 s, peak RSS 3928 MB. Consistency checks: 26 of 26 pass.

## Findings

- **Strategy types positive:** Trailing $179.84 (PF 1.50, 155 orders) · Normal $140.12 (PF 1.22, 227 orders).
- **Strategy types losing:** Signal · Trailing -$362.04 (PF 0.63, 110 orders) · Signal · Normal -$220.44 (PF 0.69, 89 orders).
- **Engine vs signals:** Engine $319.96 (PF 1.32, 382 orders) · Signals -$582.49 (PF 0.65, 199 orders).
- **Indication kinds positive:** bollinger $140.87 (PF 4.20, 39 orders) · rsi $93.00 (PF 1.69, 54 orders) · channel $67.75 (PF 3.33, 26 orders) · active $57.32 (PF 1.36, 29 orders) · osc $36.81 (PF 1.38, 33 orders) · macd $2.23 (PF 1.24, 5 orders).
- **Indication kinds losing:** direction -$435.74 (PF 0.39, 78 orders) · volume -$78.15 (PF 0.91, 131 orders) · break -$65.50 (PF 0.65, 33 orders) · ema -$60.89 (PF 0.55, 38 orders) · move -$12.62 (PF 0.51, 5 orders) · ichimoku -$5.34 (PF 0.87, 16 orders).
- **Signal sources positive:** rsi-mid $72.57 (PF ∞, 12 orders) · r-vol-regime $60.82 (PF ∞, 7 orders) · s2-range-shift $39.35 (PF 1.25, 26 orders) · r-connors $16.83 (PF ∞, 3 orders).
- **Signal sources losing:** s2-block-scale -$468.21 (PF 0.28, 55 orders) · s2-vol-break -$180.77 (PF 0.76, 87 orders) · s2-atr-break -$110.76 (PF 0.07, 7 orders) · obv -$12.31 (PF 0.00, 2 orders).
- **Symbols:** best PUMP-USDT $232.64 (PF 2.43, 74 orders) · 2Z-USDT $224.32 (PF ∞, 29 orders) · MOVR-USDT $199.30 (PF 1.85, 86 orders); worst SAND-USDT -$927.11 (PF 0.50, 226 orders) · WLD-USDT -$102.05 (PF 0.23, 30 orders) · GRIFFAIN-USDT -$79.38 (PF 0.10, 25 orders).
- **Block volume:** ×1.5–2 -$103.80 (unit PF 0.29, 53) · ×2–3 -$55.63 (unit PF 0.98, 105) · ×3–4 -$0.52 (unit PF 0.96, 19) · ×4–6 $269.33 (unit PF 2.10, 107) · ×6–8 -$371.91 (unit PF 1.11, 297).
- **Lanes:** 5m+ $7.85 (PF 1.22, 13) · 15m -$588.86 (PF 0.69, 287) · 15m+ $216.34 (PF 1.46, 189) · 30m $102.15 (PF 1.38, 92); **ranges:** Long $194.23 (PF 1.35, 195) · General $125.97 (PF 1.43, 126) · Short $2.45 (PF 1.02, 60) · Wide -$582.49 (PF 0.65, 199) · Minimal -$2.69 (PF 0.00, 1); **sides:** Long -$866.16 (PF 0.65, 415) · Short $603.63 (PF 3.64, 166).
- **Hours:** 12 green / 6 red / 6 flat of 24 full hours; first order opened 05:00 UTC; best hour 11:00 $624.98, worst hour 18:00 -$1149.71.

## Hour by hour

| hour (UTC) | balance | equity | DD % (end) | margin | orders closed | pos opened / closed / open | wins | PF | unit PF | net | DDT now (h) | DDR (hour) | cum net | cum PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 23:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 00:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 01:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 02:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 03:00 | $1000.00 | $1000.00 | 0.00 % | $0.00 | 0 | 0 / 0 / 0 | 0 | – | – | $0.00 | 0.00 | – | $0.00 | – |
| 04:00 | $1000.00 | $999.60 | 0.04 % | $20.00 | 0 | 0 / 0 / 1 | 0 | – | – | $0.00 | 0.02 | – | $0.00 | – |
| 05:00 | $1088.82 | $1110.81 | 2.25 % | $248.74 | 13 | 2 / 0 / 2 | 13 | ∞ | ∞ | $88.82 | 0.18 | 0.00 | $88.82 | ∞ |
| 06:00 | $1135.86 | $1115.34 | 6.13 % | $366.80 | 15 | 2 / 2 / 3 | 12 | 3.69 | 3.91 | $47.04 | 0.78 | 0.24 | $135.86 | 8.78 |
| 07:00 | $1206.29 | $1179.40 | 4.40 % | $366.80 | 11 | 1 / 1 / 4 | 11 | ∞ | ∞ | $70.43 | 0.77 | 0.00 | $206.29 | 12.82 |
| 08:00 | $1295.85 | $1164.74 | 5.59 % | $483.05 | 12 | 3 / 0 / 6 | 11 | 855.11 | 952.08 | $89.56 | 1.77 | 0.00 | $295.85 | 17.84 |
| 09:00 | $1320.17 | $1185.14 | 7.87 % | $1821.71 | 13 | 1 / 0 / 7 | 9 | 3.98 | 4.02 | $24.33 | 0.32 | 0.34 | $320.17 | 13.44 |
| 10:00 | $1520.52 | $1593.23 | 2.74 % | $1879.48 | 36 | 1 / 0 / 7 | 35 | 29.25 | 26.98 | $200.35 | 0.05 | 0.04 | $520.52 | 16.86 |
| 11:00 | $2145.51 | $2113.73 | 11.65 % | $2602.02 | 73 | 0 / 0 / 7 | 72 | 157.05 | 141.80 | $624.98 | 0.02 | 0.01 | $1145.51 | 32.10 |
| 12:00 | $2219.05 | $1743.27 | 27.13 % | $2602.02 | 36 | 0 / 1 / 7 | 23 | 1.50 | 2.04 | $73.54 | 1.02 | 1.85 | $1219.05 | 7.64 |
| 13:00 | $2328.42 | $1938.67 | 18.97 % | $2212.47 | 34 | 1 / 0 / 7 | 26 | 2.16 | 2.67 | $109.37 | 2.02 | 0.83 | $1328.42 | 5.78 |
| 14:00 | $1977.02 | $1377.53 | 42.42 % | $1930.31 | 21 | 0 / 1 / 8 | 3 | 0.03 | 0.03 | -$351.40 | 3.02 | – | $977.02 | 2.53 |
| 15:00 | $1796.12 | $1028.20 | 57.02 % | $1894.67 | 54 | 4 / 2 / 10 | 13 | 0.21 | 0.24 | -$180.90 | 4.02 | – | $796.12 | 1.92 |
| 16:00 | $2001.95 | $1261.72 | 47.26 % | $1814.60 | 45 | 3 / 3 / 9 | 32 | 4.55 | 5.44 | $205.83 | 5.02 | 0.19 | $1001.95 | 2.08 |
| 17:00 | $1953.34 | $1222.46 | 48.90 % | $2122.83 | 18 | 5 / 0 / 13 | 8 | 0.46 | 0.45 | -$48.62 | 6.02 | – | $953.34 | 1.94 |
| 18:00 | $803.63 | $705.95 | 70.49 % | $2235.27 | 107 | 3 / 9 / 11 | 28 | 0.17 | 0.18 | -$1149.71 | 7.02 | – | -$196.37 | 0.92 |
| 19:00 | $816.99 | $730.27 | 69.48 % | $622.47 | 14 | 7 / 2 / 14 | 6 | 1.37 | 0.77 | $13.36 | 8.02 | 1.43 | -$183.01 | 0.93 |
| 20:00 | $717.15 | $748.68 | 68.71 % | $616.81 | 9 | 2 / 2 / 12 | 3 | 0.08 | 0.08 | -$99.84 | 9.02 | – | -$282.85 | 0.89 |
| 21:00 | $664.56 | $693.36 | 71.02 % | $603.49 | 34 | 0 / 5 / 7 | 12 | 0.43 | 0.38 | -$52.59 | 10.02 | – | -$335.44 | 0.87 |
| 22:00 | $745.68 | $739.29 | 69.10 % | $343.75 | 34 | 0 / 6 / 1 | 28 | 3.74 | 3.42 | $81.13 | 11.02 | 0.19 | -$254.32 | 0.90 |
| 23:00 (20 min) | $737.47 | $737.47 | 69.17 % | $19.55 | 2 | 0 / 1 / 0 | 0 | 0.00 | 0.00 | -$8.21 | 11.35 | – | -$262.53 | 0.90 |

## Per strategy type

| type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal | 227 | 44 | 1.22 | 1.45 | 48.90 % | $140.12 | 9.58 | 1.37 | 14.92 % | 10 / 19 |
| Trailing | 155 | 39 | 1.50 | 1.68 | 60.65 % | $179.84 | 5.83 | 0.62 | 9.02 % | 12 / 19 |
| Signal · Normal | 89 | 7 | 0.69 | 1.01 | 67.42 % | -$220.44 | 11.08 | – | 45.67 % | 6 / 13 |
| Signal · Trailing | 110 | 6 | 0.63 | 0.81 | 72.73 % | -$362.04 | 9.08 | – | 59.10 % | 10 / 14 |

| type · sub-type | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal · Block Active | 227 | 44 | 1.22 | 1.45 | 48.90 % | $140.12 | 9.58 | 1.37 | 14.92 % | 10 / 19 |
| Trailing · Block Active | 155 | 39 | 1.50 | 1.68 | 60.65 % | $179.84 | 5.83 | 0.62 | 9.02 % | 12 / 19 |
| Signal · Normal · Block Active | 89 | 7 | 0.69 | 1.01 | 67.42 % | -$220.44 | 11.08 | – | 45.67 % | 6 / 13 |
| Signal · Trailing · Block Active | 110 | 6 | 0.63 | 0.81 | 72.73 % | -$362.04 | 9.08 | – | 59.10 % | 10 / 14 |

## Per indication kind

| indication kind | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| bollinger | 39 | 19 | 4.20 | 4.14 | 82.05 % | $140.87 | 6.75 | 0.14 | 1.77 % | 11 / 11 |
| rsi | 54 | 17 | 1.69 | 2.80 | 72.22 % | $93.00 | 11.08 | 1.05 | 8.32 % | 9 / 13 |
| channel | 26 | 14 | 3.33 | 3.33 | 69.23 % | $67.75 | 5.33 | 0.32 | 2.03 % | 8 / 10 |
| active | 29 | 4 | 1.36 | 2.02 | 68.97 % | $57.32 | 11.08 | 2.42 | 11.60 % | 5 / 11 |
| osc | 33 | 15 | 1.38 | 1.32 | 57.58 % | $36.81 | 7.50 | 0.94 | 3.41 % | 6 / 9 |
| macd | 5 | 4 | 1.24 | 0.56 | 60.00 % | $2.23 | 5.50 | 2.12 | 0.47 % | 2 / 4 |
| trend | 78 | 22 | 1.00 | 0.99 | 41.03 % | -$0.30 | 5.58 | – | 7.72 % | 5 / 13 |
| smooth | 16 | 5 | 0.96 | 1.31 | 31.25 % | -$1.95 | 9.83 | – | 2.33 % | 4 / 7 |
| ichimoku | 16 | 8 | 0.87 | 1.33 | 43.75 % | -$5.34 | 9.00 | – | 2.13 % | 4 / 6 |
| move | 5 | 5 | 0.51 | 0.63 | 40.00 % | -$12.62 | 14.83 | – | 2.56 % | 2 / 4 |
| ema | 38 | 6 | 0.55 | 0.84 | 26.32 % | -$60.89 | 9.83 | – | 10.56 % | 5 / 10 |
| break | 33 | 12 | 0.65 | 0.83 | 51.52 % | -$65.50 | 11.08 | – | 14.12 % | 4 / 11 |
| volume | 131 | 18 | 0.91 | 1.34 | 70.23 % | -$78.15 | 11.08 | – | 44.50 % | 11 / 16 |
| direction | 78 | 12 | 0.39 | 0.44 | 62.82 % | -$435.74 | 7.58 | – | 54.28 % | 6 / 10 |

## Per signal source

| source | orders | positions | PF | unit PF | WR | net | DDT (h) | DDR | max DD % | green h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rsi-mid | 12 | 1 | ∞ | ∞ | 100.00 % | $72.57 | 0.00 | 0.00 | 0.00 % | 3 / 3 |
| r-vol-regime | 7 | 1 | ∞ | ∞ | 100.00 % | $60.82 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| s2-range-shift | 26 | 2 | 1.25 | 2.01 | 69.23 % | $39.35 | 11.08 | 3.98 | 13.10 % | 4 / 9 |
| r-connors | 3 | 1 | ∞ | ∞ | 100.00 % | $16.83 | 0.00 | 0.00 | 0.00 % | 2 / 2 |
| obv | 2 | 1 | 0.00 | 0.00 | 0.00 % | -$12.31 | 4.33 | – | 1.23 % | 0 / 2 |
| s2-atr-break | 7 | 1 | 0.07 | 0.07 | 14.29 % | -$110.76 | 11.33 | – | 11.08 % | 0 / 4 |
| s2-vol-break | 87 | 2 | 0.76 | 1.17 | 72.41 % | -$180.77 | 11.08 | – | 47.45 % | 5 / 9 |
| s2-block-scale | 55 | 5 | 0.28 | 0.30 | 65.45 % | -$468.21 | 7.58 | – | 54.32 % | 6 / 9 |

Window of 24 h: a single short sample — it shows the engine and the desk settings processing correctly on real data and their current edge, not a durable result.
