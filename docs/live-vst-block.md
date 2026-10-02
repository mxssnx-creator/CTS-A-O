# Block desks live on x02 VST

3 desks ran side by side on the demo account (bingx-vst-02), each with its own client-id tag, on the 12 most volatile symbols of the last hour: ZK-USDT, GRASS-USDT, ZRO-USDT, BLUAI-USDT, ILV-USDT, SOON-USDT, ETHFI-USDT, FARTCOIN-USDT, NIL-USDT, BROCCOLI-USDT, 1000PEPE-USDT, SYRUP-USDT.
- **Leverage and size:** maximum leverage per symbol and side; minimum exchange quantity per order (the Block volume in whole lots).
- **Paper book:** the desk's forward book on live prices, at the same moments as its orders.
- **Exchange result:** read back from the exchange order history by the desk's tag (realized profit and fees per position).

## Summary

| desk | tag | hours | paper closes | paper WR | paper PF | paper $ | exchange orders | exchange positions | exchange PF | exchange net $ | fees $ | sim PF (engine) | sim closes | avg slip % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Overall | CTSV2O_ | 4.00 | 131 | 50.38 % | 0.52 | -10.04 | 51 | 13 | 0.34 | -11.46 | -0.84 | 1.19 | 552 | 0.16 |
| Shared | CTSV2S_ | 4.00 | 67 | 43.28 % | 1.02 | 0.05 | 45 | 10 | 0.88 | -0.65 | -0.51 | 1.03 | 440 | 0.08 |
| Additive | CTSV2D_ | 4.00 | 177 | 67.80 % | 1.21 | 2.42 | 49 | 12 | 0.43 | -5.99 | -0.59 | 0.74 | 818 | 0.06 |

## Overall (CTSV2O_)

- **Run:** 4.00 h, ending 2026-10-02 18:17 UTC (final status).
- **Engine:** 154 recomputes, last one 91.85 s; 35 configs in Real.
- **Memory:** RSS 1204 MB, heap 184 MB.
- **Fills:** 26, average slippage 0.16 %.

Paper book per range (live prices):

| range | closes | WR | PF | $ |
|---|---:|---:|---:|---:|
| Minimal | 21 | 66.67 % | 0.88 | -0.14 |
| Short | 36 | 58.33 % | 0.58 | -2.81 |
| General | 42 | 35.71 % | 0.46 | -4.29 |
| Long | 32 | 50.00 % | 0.48 | -2.80 |

Exchange result per kind (tag CTSV2O_):

| kind | positions | wins | PF | net $ | fees $ | opened notional $ | fee % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Wide / mixed | 9 | 2 | 0.20 | -10.39 | -0.63 | 799.00 | 0.08 |
| unknown | 3 | 1 | 0.65 | -1.56 | -0.16 | 168.00 | 0.10 |
| Short | 1 | 1 | 99.00 | 0.49 | -0.05 | 48.00 | 0.10 |

Own orders by kind letter:

| kind | status | orders |
|---|---|---:|
| I | ok | 5 |
| O | ok | 16 |
| R | ok | 4 |
| S | ok | 16 |
| X | ok | 1 |

Exchange calls (rate-limit pauses in brackets):

- GET /openApi/swap/v2/trade/openOrders: 60 (11)
- GET /openApi/swap/v2/user/positions: 431 (19)
- GET /openApi/swap/v2/user/balance: 215 (2)
- POST /openApi/swap/v1/positionSide/dual: 1
- POST /openApi/swap/v2/trade/marginType: 7
- GET /openApi/swap/v2/trade/leverage: 7
- POST /openApi/swap/v2/trade/order: 42
- DELETE /openApi/swap/v2/trade/order: 1 (1)
- GET /openApi/swap/v2/trade/allOrders: 4

Base results per indication type over the engine's window (2026-09-30 18:00 → 2026-10-02 18:14 UTC), every config, before any selection:

| indication | configs | positive | closes | PF |
|---|---:|---:|---:|---:|
| break | 673 | 526 | 15687 | 1.70 |
| channel | 206 | 47 | 7666 | 0.85 |
| bollinger | 238 | 34 | 12161 | 0.82 |
| move | 444 | 70 | 13119 | 0.79 |
| trend | 1200 | 404 | 39640 | 0.79 |
| osc | 186 | 23 | 8002 | 0.77 |
| ema | 1338 | 257 | 66802 | 0.76 |
| smooth | 1044 | 200 | 38075 | 0.76 |
| direction | 1914 | 253 | 84575 | 0.73 |
| ichimoku | 764 | 65 | 30468 | 0.71 |
| rsi | 536 | 97 | 30917 | 0.71 |
| macd | 216 | 3 | 15108 | 0.65 |

## Shared (CTSV2S_)

- **Run:** 4.00 h, ending 2026-10-02 18:17 UTC (final status).
- **Engine:** 142 recomputes, last one 89.68 s; 36 configs in Real.
- **Memory:** RSS 1642 MB, heap 285 MB.
- **Fills:** 26, average slippage 0.08 %.

Paper book per range (live prices):

| range | closes | WR | PF | $ |
|---|---:|---:|---:|---:|
| Minimal | 13 | 38.46 % | 0.27 | -0.45 |
| Long | 31 | 38.71 % | 1.06 | 0.12 |
| Short | 14 | 50.00 % | 0.90 | -0.04 |
| General | 9 | 55.56 % | 3.41 | 0.42 |

Exchange result per kind (tag CTSV2S_):

| kind | positions | wins | PF | net $ | fees $ | opened notional $ | fee % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Wide / mixed | 10 | 5 | 0.88 | -0.65 | -0.51 | 603.00 | 0.08 |

Own orders by kind letter:

| kind | status | orders |
|---|---|---:|
| I | ok | 10 |
| O | ok | 11 |
| R | ok | 5 |
| S | ok | 11 |

Exchange calls (rate-limit pauses in brackets):

- GET /openApi/swap/v2/user/balance: 217 (1)
- POST /openApi/swap/v1/positionSide/dual: 1
- POST /openApi/swap/v2/trade/marginType: 6
- GET /openApi/swap/v2/trade/leverage: 6
- POST /openApi/swap/v2/trade/order: 37
- GET /openApi/swap/v2/trade/openOrders: 80 (17)
- GET /openApi/swap/v2/user/positions: 426 (6)
- GET /openApi/swap/v2/trade/allOrders: 4

Base results per indication type over the engine's window (2026-09-30 18:00 → 2026-10-02 18:16 UTC), every config, before any selection:

| indication | configs | positive | closes | PF |
|---|---:|---:|---:|---:|
| bollinger | 16 | 4 | 38 | 4.43 |
| break | 971 | 524 | 19244 | 1.03 |
| channel | 202 | 63 | 4773 | 0.93 |
| sar | 202 | 56 | 21234 | 0.89 |
| smooth | 610 | 85 | 27902 | 0.80 |
| trend | 2694 | 831 | 81271 | 0.79 |
| ema | 1588 | 272 | 64691 | 0.77 |
| direction | 1556 | 300 | 66608 | 0.76 |
| macd | 210 | 2 | 11740 | 0.72 |
| ichimoku | 578 | 21 | 24005 | 0.71 |
| rsi | 458 | 30 | 24912 | 0.60 |
| move | 196 | 0 | 8531 | 0.55 |

## Additive (CTSV2D_)

- **Run:** 4.00 h, ending 2026-10-02 18:18 UTC (final status).
- **Engine:** 140 recomputes, last one 98.16 s; 44 configs in Real.
- **Memory:** RSS 1594 MB, heap 218 MB.
- **Fills:** 27, average slippage 0.06 %.

Paper book per range (live prices):

| range | closes | WR | PF | $ |
|---|---:|---:|---:|---:|
| Minimal | 14 | 85.71 % | 2.39 | 0.42 |
| General | 54 | 64.81 % | 1.12 | 0.57 |
| Long | 39 | 71.79 % | 1.56 | 1.15 |
| Short | 70 | 64.29 % | 1.06 | 0.29 |

Exchange result per kind (tag CTSV2D_):

| kind | positions | wins | PF | net $ | fees $ | opened notional $ | fee % |
|---|---:|---:|---:|---:|---:|---:|---:|
| unknown | 3 | 2 | 0.26 | -1.06 | -0.09 | 94.00 | 0.10 |
| Wide / mixed | 8 | 2 | 0.27 | -6.68 | -0.44 | 478.00 | 0.09 |
| Short | 1 | 1 | 99.00 | 1.75 | -0.06 | 56.00 | 0.10 |

Own orders by kind letter:

| kind | status | orders |
|---|---|---:|
| I | ok | 4 |
| O | ok | 12 |
| R | ok | 10 |
| S | ok | 12 |
| X | ok | 1 |

Exchange calls (rate-limit pauses in brackets):

- GET /openApi/swap/v2/user/positions: 434 (6)
- GET /openApi/swap/v2/trade/openOrders: 135 (18)
- GET /openApi/swap/v2/user/balance: 219
- POST /openApi/swap/v1/positionSide/dual: 1
- POST /openApi/swap/v2/trade/marginType: 8
- GET /openApi/swap/v2/trade/leverage: 8
- POST /openApi/swap/v2/trade/leverage: 2
- POST /openApi/swap/v2/trade/order: 39
- DELETE /openApi/swap/v2/trade/order: 1 (1)
- GET /openApi/swap/v2/trade/allOrders: 4

Base results per indication type over the engine's window (2026-09-30 18:00 → 2026-10-02 18:17 UTC), every config, before any selection:

| indication | configs | positive | closes | PF |
|---|---:|---:|---:|---:|
| sar | 110 | 94 | 9699 | 1.31 |
| smooth | 786 | 376 | 44413 | 0.98 |
| break | 1203 | 505 | 42624 | 0.96 |
| move | 1081 | 444 | 38285 | 0.94 |
| macd | 202 | 29 | 11468 | 0.83 |
| direction | 1540 | 436 | 67857 | 0.83 |
| ema | 1386 | 325 | 63613 | 0.81 |
| trend | 1210 | 366 | 31492 | 0.67 |
| bollinger | 382 | 14 | 8481 | 0.61 |
| ichimoku | 970 | 190 | 31339 | 0.60 |
| osc | 206 | 2 | 5073 | 0.59 |
| rsi | 504 | 15 | 24306 | 0.48 |
| volume | 206 | 3 | 3077 | 0.47 |
