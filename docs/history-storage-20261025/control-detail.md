# Exact-minute Signal control detail

PF neutral is 1; modeled round-trip cost is 0.15% once. These are historical public-candle simulations, not exchange returns. Clocks below are UTC. Signals use 150h history and Last4. Ordinary ranges are deliberately excluded from this Signal control and are tested separately.

Orders below are independently tracked config orders. Positions group orders by symbol and direction; group position counts can overlap and must not be summed. Last4 percentages use every config × symbol × direction context, including empty ones. Qualified historical PF and subsequent executed PF describe different samples.

## Window offset 0h

Source: `562927400fb3e59a984e13130e9145f825e48855c563f41ad9cc13a7c9bbd986`. Configs 126,249; sources 118; source lanes 663; symbols 12; historical closes 10,764,881; missing configured cells 0.

| Dimension / group | Configs | Last4 ready, start → end | Qualified history PF at end | Executed PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---:|---:|---:|---:|---:|---:|
| strategyRange / Exit | 67 | 32.40% → 36.07% | 11.1964 | no losses | 46 / 7 / 39 | 8 / 1 / 7 |
| strategyRange / Signals | 126,182 | 33.41% → 33.71% | 4.6024 | 4.8548 | 430 / 364 / 66 | 11 / 6 / 5 |
| type / exit | 67 | 32.40% → 36.07% | 11.1964 | no losses | 46 / 7 / 39 | 8 / 1 / 7 |
| type / normal | 27,625 | 32.84% → 33.11% | 2.7399 | 5.6381 | 50 / 48 / 2 | 8 / 6 / 2 |
| type / trailing | 82,645 | 33.49% → 33.79% | 5.1729 | 4.4247 | 320 / 262 / 58 | 9 / 4 / 5 |
| type / trailing-only | 15,912 | 34.03% → 34.39% | 4.6175 | 6.8465 | 60 / 54 / 6 | 7 / 4 / 3 |
| parameterRange / short | 61,711 | 37.11% → 37.41% | 4.7069 | 6.4266 | 282 / 237 / 45 | 9 / 4 / 5 |
| parameterRange / medium | 61,664 | 28.86% → 29.17% | 4.6450 | 2.9301 | 182 / 122 / 60 | 13 / 5 / 8 |
| parameterRange / short+medium | 2,874 | 51.59% → 51.78% | 3.9734 | 10.2709 | 12 / 12 / 0 | 4 / 4 / 0 |
| lane / 15 | 36,783 | 39.72% → 40.19% | 5.1350 | 2.9228 | 322 / 217 / 105 | 13 / 4 / 9 |
| lane / 1 | 45,527 | 13.61% → 13.64% | 4.5056 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| lane / 5 | 43,939 | 48.66% → 49.10% | 4.5559 | 12.0335 | 154 / 154 / 0 | 4 / 4 / 0 |
| symbol / BTC-USDT | 126,249 | 3.58% → 3.60% | no closes | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / ETH-USDT | 126,249 | 22.94% → 23.21% | 5.2602 | no closes | 1 / 0 / 1 | 1 / 0 / 1 |
| symbol / BNB-USDT | 126,249 | 2.20% → 2.26% | 59.9464 | no closes | 6 / 0 / 6 | 1 / 0 / 1 |
| symbol / SOL-USDT | 126,249 | 36.95% → 37.26% | 4.1429 | no closes | 22 / 0 / 22 | 1 / 0 / 1 |
| symbol / XRP-USDT | 126,249 | 26.97% → 27.33% | 6.3733 | no closes | 8 / 0 / 8 | 1 / 0 / 1 |
| symbol / DOGE-USDT | 126,249 | 35.16% → 35.61% | 5.5080 | 0.0952 | 18 / 9 / 9 | 1 / 0 / 1 |
| symbol / ADA-USDT | 126,249 | 55.11% → 55.26% | 5.3947 | no closes | 7 / 0 / 7 | 1 / 0 / 1 |
| symbol / LINK-USDT | 126,249 | 35.99% → 36.07% | 5.1919 | 0.2105 | 63 / 48 / 15 | 2 / 1 / 1 |
| symbol / AVAX-USDT | 126,249 | 47.48% → 47.55% | 3.9847 | 0.0006 | 41 / 25 / 16 | 1 / 0 / 1 |
| symbol / LTC-USDT | 126,249 | 28.86% → 29.03% | 5.2995 | 1.3382 | 90 / 69 / 21 | 1 / 0 / 1 |
| symbol / DOT-USDT | 126,249 | 72.10% → 72.45% | 3.1182 | 23.9431 | 210 / 210 / 0 | 3 / 3 / 0 |
| symbol / BCH-USDT | 126,249 | 33.61% → 34.96% | 3.4477 | 1.1077 | 10 / 10 / 0 | 2 / 2 / 0 |

### Minute calculations, hourly reporting

| Hour UTC | Executed PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Peak DD during hour |
|---|---:|---:|---:|---:|---:|
| 10-16 21:00 | 1.6716 | 222 / 26 / 196 | 8 / 1 / 7 | 10.002178 | 0.0430% |
| 10-16 22:00 | 0.2681 | 0 / 91 / 105 | 0 / 1 / 6 | 9.994201 | 0.0958% |
| 10-16 23:00 | — | 0 / 0 / 105 | 0 / 0 / 6 | 9.994295 | 0.1010% |
| 10-17 00:00 | 0.0000 | 14 / 3 / 116 | 2 / 0 / 8 | 9.996793 | 0.0770% |
| 10-17 01:00 | 0.0014 | 2 / 21 / 97 | 0 / 0 / 8 | 9.997400 | 0.0627% |
| 10-17 02:00 | 0.3401 | 2 / 4 / 95 | 0 / 0 / 8 | 9.995141 | 0.0979% |
| 10-17 03:00 | 0.0742 | 42 / 8 / 129 | 4 / 0 / 12 | 9.991507 | 0.1206% |
| 10-17 04:00 | 13.6377 | 113 / 118 / 124 | 0 / 2 / 10 | 9.999485 | 0.1316% |
| 10-17 05:00 | 28.4980 | 70 / 69 / 125 | 1 / 1 / 10 | 10.005283 | 0.0436% |
| 10-17 06:00 | 31.7701 | 10 / 27 / 108 | 0 / 0 / 10 | 10.005555 | 0.0213% |
| 10-17 07:00 | no losses | 1 / 4 / 105 | 0 / 1 / 9 | 10.006195 | 0.0328% |
| 10-17 08:00 | — | 0 / 0 / 105 | 0 / 0 / 9 | 10.006026 | 0.0313% |

### Protection distances

| Type / distance family | SL fraction min–max | SL/TP min–max | Trail activation min–max | Trail gap min–max | Hold hours min–max |
|---|---:|---:|---:|---:|---:|
| exit / short / signal | 0.0123–0.03 | 0.173077–0.558659 | 0.0177–0.03 | 0.0177–0.03 | 22.5–22.5 |
| exit / medium / signal | 0.0131–0.03 | 0.158451–0.614754 | 0.0161–0.03 | 0.015774–0.03 | 22.5–22.5 |
| normal / short / signal | 0.005–0.03 | 0.5–3 | — | — | 0.75–48 |
| trailing / short / signal | 0.0092–0.03 | 0.375–3 | 0.0017–0.03 | 0.002–0.03 | 0.75–48 |
| trailing-only / short / signal | 0.0063–0.03 | — | 0.0021–0.02 | 0.0025–0.03 | 48–48 |
| normal / medium / signal | 0.005–0.03 | 0.5–3 | — | — | 0.75–48 |
| trailing / medium / signal | 0.0092–0.03 | 0.375–3 | 0.0017–0.03 | 0.002–0.03 | 0.75–48 |
| trailing-only / medium / signal | 0.0063–0.03 | — | 0.0021–0.02 | 0.0025–0.03 | 48–48 |
| normal / short+medium / signal | 0.005–0.03 | 0.5–3 | — | — | 0.75–48 |
| trailing / short+medium / signal | 0.0092–0.03 | 0.375–3 | 0.0017–0.03 | 0.002–0.03 | 0.75–48 |
| trailing-only / short+medium / signal | 0.0063–0.03 | — | 0.0021–0.02 | 0.0025–0.03 | 48–48 |

### Every built source

| Source | Configs | Last4 ready at end | Executed PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---:|---:|---:|---:|---:|
| adx | 1145 | 44.41% | no closes | 2 / 0 / 2 | 1 / 0 / 1 |
| donchian | 1145 | 48.08% | no closes | 1 / 0 / 1 | 1 / 0 / 1 |
| r-bos | 1153 | 16.48% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-klinger | 1167 | 36.85% | no losses | 36 / 6 / 30 | 6 / 1 / 5 |
| r-rvi | 1148 | 46.80% | 0.0083 | 7 / 4 / 3 | 1 / 0 / 1 |
| r-vol-regime | 1146 | 41.38% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-range-break | 1143 | 37.25% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-range-shift | 1143 | 40.46% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| sar | 1149 | 61.29% | 3.5887 | 17 / 7 / 10 | 5 / 0 / 5 |
| r-apz-reclaim | 1140 | 1.62% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-frama-pullback | 1142 | 48.43% | 314.8044 | 13 / 13 / 0 | 1 / 1 / 0 |
| r-st-pullback | 1141 | 40.39% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-cross | 1140 | 13.86% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| macd-cross | 1146 | 59.08% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| rsi-reversal | 1140 | 19.46% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| bollinger | 1140 | 30.24% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| supertrend | 1140 | 28.18% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ichimoku | 1140 | 27.24% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| stoch-rsi | 1146 | 60.48% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| keltner | 1140 | 35.96% | no losses | 50 / 50 / 0 | 1 / 1 / 0 |
| vwap | 1142 | 37.68% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| hma | 1141 | 53.26% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| cci | 1143 | 40.91% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| squeeze | 1140 | 2.18% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| aroon | 1140 | 51.47% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| williams-r | 1145 | 55.72% | no losses | 1 / 1 / 0 | 1 / 1 / 0 |
| mfi | 1141 | 24.24% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| obv | 1140 | 47.58% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| cmf | 1142 | 53.37% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| trix | 1140 | 23.83% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| kama | 1140 | 58.55% | 362.1642 | 4 / 4 / 0 | 2 / 2 / 0 |
| heikin-ashi | 1147 | 70.07% | 0.2154 | 26 / 26 / 0 | 3 / 3 / 0 |
| zscore | 1140 | 35.46% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-slope | 1140 | 25.92% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| macd-hist | 1144 | 64.76% | 2.9349 | 82 / 60 / 22 | 3 / 1 / 2 |
| volume-break | 1140 | 28.40% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ichi-cloud | 1140 | 20.57% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| rsi-momentum | 1140 | 0.31% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-trend | 1142 | 30.66% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| atr-break | 1143 | 59.59% | 0.1836 | 18 / 18 / 0 | 2 / 2 / 0 |
| act-burst | 1143 | 48.87% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| thrust | 1143 | 61.40% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| impulse | 1142 | 58.57% | no losses | 9 / 9 / 0 | 1 / 1 / 0 |
| swing | 1145 | 55.96% | no losses | 2 / 2 / 0 | 1 / 1 / 0 |
| rsi-mid | 1142 | 52.13% | 6.8666 | 37 / 37 / 0 | 1 / 1 / 0 |
| bb-walk | 1140 | 30.24% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-pullback | 1142 | 28.93% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-cross-fast | 1140 | 34.69% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| reclaim | 1143 | 44.76% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| act-hf | 1145 | 61.72% | 0.0000 | 7 / 4 / 3 | 1 / 0 / 1 |
| macd-slow | 1143 | 57.57% | no losses | 1 / 1 / 0 | 1 / 1 / 0 |
| st-slow | 1140 | 11.65% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-ema-cross | 1140 | 1.06% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-rsi-revert | 1140 | 29.32% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-st-trail | 1140 | 13.20% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-bb-bounce | 1140 | 43.82% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-vwap-axis | 1140 | 1.85% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-vol-break | 1144 | 46.40% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-adx-gate | 1140 | 42.15% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-stoch-swing | 1140 | 54.26% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-confluence | 1142 | 48.88% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-atr-break | 1149 | 56.10% | 0.0000 | 8 / 4 / 4 | 1 / 0 / 1 |
| s2-active-hf | 1146 | 68.16% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-block-stack | 1147 | 55.11% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-block-scale | 1151 | 50.59% | no closes | 2 / 0 / 2 | 1 / 0 / 1 |
| r-squeeze | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-donch-vol | 1140 | 4.28% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-sweep | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-capit | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-vwap-reclaim | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-cvd-div | 1140 | 49.62% | no losses | 36 / 36 / 0 | 1 / 1 / 0 |
| r-rsi2 | 1140 | 16.80% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-bb-adx | 1140 | 24.24% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-bbw-expand | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-session-trend | 1140 | 32.79% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-zdist | 1140 | 23.79% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-clv-thrust | 1140 | 8.94% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-nr-break | 1146 | 67.33% | 0.1279 | 33 / 5 / 28 | 4 / 2 / 2 |
| r-roofing | 1140 | 0.75% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fisher | 1143 | 53.23% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-connors | 1140 | 26.82% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-stc | 1142 | 54.09% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-vortex | 1140 | 34.62% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-tsi | 1142 | 29.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-elder | 1140 | 10.21% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-awesome | 1144 | 38.61% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-linreg | 1148 | 42.56% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fractal | 1140 | 34.86% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-camarilla | 1140 | 16.66% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fakeout | 1140 | 41.74% | no losses | 2 / 2 / 0 | 1 / 1 / 0 |
| r-spring | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-valuearea | 1140 | 17.49% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-orb | 1140 | 1.44% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-pdhl | 1140 | 2.60% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-choch | 1140 | 7.58% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fvg | 1140 | 10.26% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-inside | 1140 | 9.46% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-engulf | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-pin | 1140 | 0.78% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-star | 1140 | 0.98% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-streak | 1140 | 1.04% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-laguerre | 1142 | 54.45% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-chand | 1140 | 58.38% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r60-i1 | 583 | 51.73% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r65-i1 | 570 | 48.35% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r70-i1 | 571 | 49.28% | 3731.7535 | 22 / 22 / 0 | 1 / 1 / 0 |
| coordination-band-r75-i1 | 575 | 56.48% | 0.1806 | 46 / 46 / 0 | 1 / 1 / 0 |
| coordination-band-r80-i1 | 577 | 57.60% | 0.0000 | 2 / 2 / 0 | 2 / 2 / 0 |
| coordination-band-r60-i2 | 570 | 34.20% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r65-i2 | 572 | 38.74% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r70-i2 | 570 | 41.83% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r75-i2 | 577 | 47.99% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r80-i2 | 572 | 47.74% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r60-i3 | 570 | 45.49% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r65-i3 | 573 | 44.57% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r70-i3 | 576 | 49.97% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r75-i3 | 576 | 59.11% | 5.6170 | 4 / 4 / 0 | 3 / 3 / 0 |
| coordination-band-r80-i3 | 579 | 59.64% | 11.3831 | 8 / 8 / 0 | 2 / 2 / 0 |

## Window offset 12h

Source: `393fdfb39930f969c8b1ac85d2f86975db86f05e919979f29f36478ee17246e7`. Configs 126,289; sources 118; source lanes 663; symbols 12; historical closes 10,999,508; missing configured cells 0.

| Dimension / group | Configs | Last4 ready, start → end | Qualified history PF at end | Executed PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---:|---:|---:|---:|---:|---:|
| strategyRange / Exit | 10 | 20.00% → 37.50% | 41.3906 | no losses | 8 / 7 / 1 | 3 / 2 / 1 |
| strategyRange / Signals | 126,279 | 33.75% → 34.31% | 4.6037 | 0.0466 | 855 / 273 / 582 | 1 / 0 / 1 |
| type / exit | 10 | 20.00% → 37.50% | 41.3906 | no losses | 8 / 7 / 1 | 3 / 2 / 1 |
| type / normal | 27,630 | 33.12% → 33.65% | 2.8439 | 0.0000 | 96 / 41 / 55 | 1 / 0 / 1 |
| type / trailing | 82,737 | 33.83% → 34.43% | 5.1488 | 0.1159 | 632 / 174 / 458 | 1 / 0 / 1 |
| type / trailing-only | 15,912 | 34.39% → 34.86% | 4.5862 | 0.0882 | 127 / 58 / 69 | 1 / 0 / 1 |
| parameterRange / short | 61,742 | 37.43% → 38.03% | 4.6319 | 0.0904 | 477 / 176 / 301 | 4 / 2 / 2 |
| parameterRange / medium | 61,666 | 29.20% → 29.74% | 4.6149 | 0.0394 | 270 / 96 / 174 | 1 / 0 / 1 |
| parameterRange / short+medium | 2,881 | 51.87% → 52.44% | 4.3572 | 0.0280 | 116 / 8 / 108 | 1 / 0 / 1 |
| lane / 15 | 36,770 | 40.24% → 41.28% | 4.8244 | no losses | 8 / 7 / 1 | 3 / 2 / 1 |
| lane / 1 | 45,530 | 13.64% → 13.64% | 4.4176 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| lane / 5 | 43,989 | 49.12% → 49.88% | 4.5774 | 0.0466 | 855 / 273 / 582 | 1 / 0 / 1 |
| symbol / BTC-USDT | 126,289 | 3.58% → 3.70% | no closes | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / ETH-USDT | 126,289 | 23.24% → 24.05% | 5.1250 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / BNB-USDT | 126,289 | 2.26% → 2.59% | no closes | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / SOL-USDT | 126,289 | 37.30% → 37.62% | 4.2871 | no losses | 2 / 1 / 1 | 1 / 0 / 1 |
| symbol / XRP-USDT | 126,289 | 27.36% → 27.73% | 6.4432 | no losses | 3 / 3 / 0 | 1 / 1 / 0 |
| symbol / DOGE-USDT | 126,289 | 35.65% → 36.45% | 6.3329 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / ADA-USDT | 126,289 | 55.29% → 55.93% | 5.7676 | 0.0466 | 855 / 273 / 582 | 1 / 0 / 1 |
| symbol / LINK-USDT | 126,289 | 36.12% → 37.45% | 4.4411 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / AVAX-USDT | 126,289 | 47.59% → 48.02% | 3.5871 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / LTC-USDT | 126,289 | 29.06% → 30.15% | 5.9041 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| symbol / DOT-USDT | 126,289 | 72.49% → 72.60% | 2.9107 | no losses | 3 / 3 / 0 | 1 / 1 / 0 |
| symbol / BCH-USDT | 126,289 | 34.99% → 35.47% | 3.4176 | no closes | 0 / 0 / 0 | 0 / 0 / 0 |

### Minute calculations, hourly reporting

| Hour UTC | Executed PF | Orders opened / settled / held | Positions opened / closed / held | End equity | Peak DD during hour |
|---|---:|---:|---:|---:|---:|
| 10-17 09:00 | — | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000% |
| 10-17 10:00 | — | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000% |
| 10-17 11:00 | — | 0 / 0 / 0 | 0 / 0 / 0 | 10.000000 | 0.0000% |
| 10-17 12:00 | — | 5 / 0 / 5 | 2 / 0 / 2 | 10.000179 | 0.0009% |
| 10-17 13:00 | — | 0 / 0 / 5 | 0 / 0 / 2 | 10.000098 | 0.0017% |
| 10-17 14:00 | — | 0 / 0 / 5 | 0 / 0 / 2 | 9.999921 | 0.0033% |
| 10-17 15:00 | — | 655 / 0 / 660 | 2 / 0 / 4 | 9.994687 | 0.1117% |
| 10-17 16:00 | 0.0000 | 46 / 67 / 639 | 0 / 0 / 4 | 10.005689 | 0.2350% |
| 10-17 17:00 | 0.1814 | 157 / 165 / 631 | 0 / 0 / 4 | 9.973399 | 0.5060% |
| 10-17 18:00 | 0.0640 | 0 / 29 / 602 | 0 / 2 / 2 | 9.933206 | 1.0134% |
| 10-17 19:00 | 0.0000 | 0 / 19 / 583 | 0 / 0 / 2 | 9.908627 | 1.1482% |
| 10-17 20:00 | — | 0 / 0 / 583 | 0 / 0 / 2 | 9.913915 | 1.1745% |

### Protection distances

| Type / distance family | SL fraction min–max | SL/TP min–max | Trail activation min–max | Trail gap min–max | Hold hours min–max |
|---|---:|---:|---:|---:|---:|
| exit / short / signal | 0.0178–0.03 | 0.40407–2 | 0.0189–0.03 | 0.0189–0.03 | 22.5–22.5 |
| normal / short / signal | 0.005–0.03 | 0.5–3 | — | — | 0.75–48 |
| trailing / short / signal | 0.0092–0.03 | 0.375–3 | 0.0017–0.03 | 0.002–0.03 | 0.75–48 |
| trailing-only / short / signal | 0.0063–0.03 | — | 0.0021–0.02 | 0.0025–0.03 | 48–48 |
| normal / medium / signal | 0.005–0.03 | 0.5–3 | — | — | 0.75–48 |
| trailing / medium / signal | 0.0092–0.03 | 0.375–3 | 0.0017–0.03 | 0.002–0.03 | 0.75–48 |
| trailing-only / medium / signal | 0.0063–0.03 | — | 0.0021–0.02 | 0.0025–0.03 | 48–48 |
| normal / short+medium / signal | 0.005–0.03 | 0.5–3 | — | — | 0.75–48 |
| trailing / short+medium / signal | 0.0092–0.03 | 0.375–3 | 0.0017–0.03 | 0.002–0.03 | 0.75–48 |
| trailing-only / short+medium / signal | 0.0063–0.03 | — | 0.0021–0.02 | 0.0025–0.03 | 48–48 |

### Every built source

| Source | Configs | Last4 ready at end | Executed PF | Orders opened / settled / held | Positions opened / closed / held |
|---|---:|---:|---:|---:|---:|
| r-bos | 1148 | 17.56% | no losses | 8 / 7 / 1 | 3 / 2 / 1 |
| s2-atr-break | 1158 | 56.63% | 0.1108 | 46 / 11 / 35 | 1 / 0 / 1 |
| r-apz-reclaim | 1140 | 1.62% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-frama-pullback | 1145 | 49.65% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-st-pullback | 1142 | 42.49% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-cross | 1140 | 13.94% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| macd-cross | 1146 | 60.12% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| rsi-reversal | 1140 | 19.72% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| bollinger | 1140 | 30.76% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| supertrend | 1140 | 28.91% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| donchian | 1143 | 48.53% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| sar | 1146 | 62.57% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ichimoku | 1140 | 27.92% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| stoch-rsi | 1147 | 60.96% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| keltner | 1140 | 36.81% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| adx | 1140 | 44.70% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| vwap | 1142 | 38.03% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| hma | 1143 | 54.10% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| cci | 1143 | 42.14% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| squeeze | 1140 | 2.24% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| aroon | 1141 | 51.99% | 0.0704 | 3 / 3 / 0 | 1 / 1 / 0 |
| williams-r | 1148 | 56.75% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| mfi | 1141 | 24.91% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| obv | 1141 | 49.66% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| cmf | 1142 | 54.51% | 0.0077 | 39 / 20 / 19 | 1 / 0 / 1 |
| trix | 1140 | 24.65% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| kama | 1142 | 59.17% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| heikin-ashi | 1150 | 71.12% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| zscore | 1140 | 36.21% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-slope | 1140 | 26.03% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| macd-hist | 1146 | 65.71% | 0.0000 | 19 / 1 / 18 | 1 / 0 / 1 |
| volume-break | 1141 | 28.85% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ichi-cloud | 1140 | 21.06% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| rsi-momentum | 1140 | 0.31% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-trend | 1142 | 30.98% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| atr-break | 1143 | 60.06% | 0.0496 | 54 / 22 / 32 | 1 / 0 / 1 |
| act-burst | 1143 | 49.67% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| thrust | 1143 | 62.29% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| impulse | 1143 | 59.63% | 0.0000 | 20 / 2 / 18 | 1 / 0 / 1 |
| swing | 1144 | 56.32% | 0.0821 | 67 / 31 / 36 | 1 / 0 / 1 |
| rsi-mid | 1143 | 52.64% | 0.1820 | 10 / 5 / 5 | 1 / 0 / 1 |
| bb-walk | 1140 | 30.83% | 0.0000 | 15 / 5 / 10 | 1 / 0 / 1 |
| ema-pullback | 1143 | 29.25% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| ema-cross-fast | 1140 | 35.16% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| reclaim | 1143 | 45.04% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| act-hf | 1145 | 62.58% | 0.0838 | 55 / 25 / 30 | 1 / 0 / 1 |
| macd-slow | 1143 | 58.54% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| st-slow | 1140 | 11.70% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-ema-cross | 1140 | 1.06% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-rsi-revert | 1140 | 29.48% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-st-trail | 1140 | 13.31% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-bb-bounce | 1140 | 44.03% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-vwap-axis | 1140 | 1.86% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-vol-break | 1152 | 47.08% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-adx-gate | 1140 | 42.91% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-stoch-swing | 1144 | 54.66% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-confluence | 1142 | 49.57% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-range-break | 1142 | 37.52% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-active-hf | 1164 | 68.82% | 0.0383 | 96 / 42 / 54 | 1 / 0 / 1 |
| s2-range-shift | 1141 | 40.62% | 0.2668 | 15 / 8 / 7 | 1 / 0 / 1 |
| s2-block-stack | 1147 | 55.62% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| s2-block-scale | 1153 | 51.51% | 0.0000 | 115 / 23 / 92 | 1 / 0 / 1 |
| r-squeeze | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-donch-vol | 1140 | 4.37% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-sweep | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-capit | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-vwap-reclaim | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-cvd-div | 1141 | 50.16% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-rsi2 | 1140 | 17.28% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-bb-adx | 1140 | 24.67% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-bbw-expand | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-session-trend | 1140 | 33.03% | 0.0662 | 26 / 25 / 1 | 1 / 0 / 1 |
| r-zdist | 1140 | 24.68% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-vol-regime | 1140 | 41.83% | 0.6858 | 5 / 4 / 1 | 1 / 0 / 1 |
| r-clv-thrust | 1140 | 9.08% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-nr-break | 1149 | 68.49% | 0.1417 | 74 / 29 / 45 | 1 / 0 / 1 |
| r-roofing | 1140 | 0.75% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fisher | 1141 | 54.16% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-connors | 1140 | 27.64% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-stc | 1142 | 54.69% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-vortex | 1140 | 36.57% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-tsi | 1145 | 29.84% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-elder | 1140 | 11.20% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-awesome | 1146 | 39.22% | no closes | 27 / 0 / 27 | 1 / 0 / 1 |
| r-linreg | 1149 | 43.87% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fractal | 1140 | 35.18% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-camarilla | 1140 | 17.86% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fakeout | 1140 | 42.57% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-spring | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-valuearea | 1140 | 18.28% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-orb | 1140 | 1.44% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-pdhl | 1140 | 2.60% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-choch | 1140 | 7.77% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-fvg | 1140 | 10.96% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-inside | 1140 | 10.73% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-engulf | 1140 | 0.00% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-pin | 1140 | 0.78% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-star | 1140 | 0.98% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-streak | 1140 | 1.04% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-laguerre | 1142 | 55.10% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-chand | 1140 | 58.60% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-klinger | 1140 | 38.21% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| r-rvi | 1149 | 47.77% | no closes | 4 / 0 / 4 | 1 / 0 / 1 |
| coordination-band-r60-i1 | 583 | 52.33% | no closes | 6 / 0 / 6 | 1 / 0 / 1 |
| coordination-band-r65-i1 | 570 | 48.92% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r70-i1 | 571 | 50.34% | no closes | 2 / 0 / 2 | 1 / 0 / 1 |
| coordination-band-r75-i1 | 576 | 57.05% | 0.0000 | 36 / 4 / 32 | 1 / 0 / 1 |
| coordination-band-r80-i1 | 574 | 57.78% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r60-i2 | 570 | 35.36% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r65-i2 | 572 | 39.61% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r70-i2 | 570 | 42.43% | 0.0000 | 5 / 5 / 0 | 1 / 1 / 0 |
| coordination-band-r75-i2 | 586 | 48.55% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r80-i2 | 577 | 49.10% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r60-i3 | 570 | 46.25% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r65-i3 | 573 | 44.92% | 0.0000 | 45 / 2 / 43 | 1 / 0 / 1 |
| coordination-band-r70-i3 | 576 | 51.05% | 1.0134 | 9 / 4 / 5 | 1 / 0 / 1 |
| coordination-band-r75-i3 | 579 | 59.61% | no closes | 0 / 0 / 0 | 0 / 0 / 0 |
| coordination-band-r80-i3 | 583 | 60.14% | 0.0000 | 62 / 2 / 60 | 1 / 0 / 1 |
