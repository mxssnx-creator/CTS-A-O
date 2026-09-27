# 6 × 6 h simulated trading — current vs Stable-02 Block coordination

Real BingX 1m data, 12 symbols, six consecutive 6-hour windows. Each window is a **complete computation** replayed as of its own end (the engine sees only candles closed by then): 6 h pre-historic window, Base → Main → Real → simulation, every lane and strategy, signals with confirmation, Block. Balance $10 at the start of every window, 2 % of equity per order unit, 10× leverage, 0.20 % round-trip cost.

*Current* = the defaults. *Stable-02* = the same plus the Stable-02 Block coordination (last-6 symbol windows + relation volume).

## Per window

| window (UTC) | current: orders · PF · net · max equity DD | Stable-02: orders · PF · net · max equity DD |
|---|---|---|
| 26 03:00–09:00 | 74 · 0.60 · -1.7 % · 3.5 % | 72 · 0.55 · -3.4 % · 6.3 % |
| 26 09:00–15:00 | 101 · 1.62 · +1.9 % · 2.1 % | 66 · 1.70 · +2.7 % · 2.6 % |
| 26 15:00–21:00 | 406 · 4.50 · +24.8 % · 30.5 % | 396 · 3.89 · +31.0 % · 41.5 % |
| 26 21:00–03:00 | 793 · 43.23 · +175.1 % · 14.9 % | 791 · 51.12 · +406.5 % · 22.0 % |
| 27 03:00–09:00 | 207 · 4.16 · +13.7 % · 8.4 % | 99 · 1.58 · +3.4 % · 6.0 % |
| 27 09:00–15:55 | 497 · 0.65 · -6.9 % · 12.7 % | 454 · 0.94 · -1.8 % · 15.2 % |

**Current:** 21 of 36 full hours positive · PF over all windows 4.77 · compounded over the 6 windows ×3.64
**Stable-02:** 22 of 36 full hours positive · PF over all windows 5.60 · compounded over the 6 windows ×6.68

## Hour by hour (both variants side by side)

| hour (UTC) | cur orders | cur PF | cur net $ | cur equity DD % | S2 orders | S2 PF | S2 net $ | S2 equity DD % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 26 03:00 | 0 | – | +0.00 | 0.0 | 0 | – | +0.00 | 0.0 |
| 26 04:00 | 1 | 4.00 | +0.00 | 0.1 | 1 | 4.00 | +0.00 | 0.1 |
| 26 05:00 | 0 | – | +0.00 | 0.2 | 0 | – | +0.00 | 0.3 |
| 26 06:00 | 13 | 1.60 | +0.03 | 0.2 | 13 | 1.49 | +0.05 | 0.5 |
| 26 07:00 | 14 | 2.44 | +0.05 | 0.3 | 13 | 2.16 | +0.07 | 0.6 |
| 26 08:00 | 46 | 0.22 | -0.26 | 3.5 | 45 | 0.21 | -0.47 | 6.3 |
| 26 09:00 | 6 | 4.00 | +0.03 | 0.3 | 6 | 4.00 | +0.03 | 0.3 |
| 26 10:00 | 9 | 1.41 | +0.01 | 0.9 | 9 | 1.82 | +0.02 | 1.5 |
| 26 11:00 | 6 | 0.04 | -0.08 | 1.3 | 4 | 0.04 | -0.14 | 1.9 |
| 26 12:00 | 24 | 0.19 | -0.06 | 2.0 | 5 | 0.62 | -0.01 | 2.4 |
| 26 13:00 | 12 | 1.32 | +0.01 | 2.1 | 8 | 1.62 | +0.02 | 2.6 |
| 26 14:00 | 44 | 3.77 | +0.28 | 2.1 | 34 | 3.15 | +0.34 | 2.6 |
| 26 15:00 | 229 | 4.00 | +2.03 | 16.9 | 230 | 4.00 | +2.05 | 16.9 |
| 26 16:00 | 92 | 0.92 | -0.04 | 30.5 | 89 | 0.88 | -0.10 | 41.5 |
| 26 17:00 | 49 | 41.72 | +0.63 | 30.5 | 47 | 4.00 | +1.17 | 41.5 |
| 26 18:00 | 13 | 0.51 | -0.10 | 30.5 | 12 | 0.59 | -0.14 | 41.5 |
| 26 19:00 | 10 | 15.06 | +0.07 | 30.5 | 9 | 4.00 | +0.15 | 41.5 |
| 26 20:00 | 13 | 0.15 | -0.11 | 30.5 | 9 | 0.66 | -0.02 | 41.5 |
| 26 21:00 | 34 | 0.02 | -0.09 | 4.0 | 34 | 0.02 | -0.09 | 4.0 |
| 26 22:00 | 457 | 165.52 | +6.27 | 14.9 | 457 | 160.51 | +11.80 | 22.0 |
| 26 23:00 | 14 | 4.00 | +0.55 | 14.9 | 14 | 4.00 | +1.28 | 22.0 |
| 27 00:00 | 16 | 2.32 | +0.18 | 14.9 | 16 | 2.32 | +0.47 | 22.0 |
| 27 01:00 | 250 | 240.48 | +10.13 | 14.9 | 248 | 318.24 | +26.06 | 22.0 |
| 27 02:00 | 22 | 5.88 | +0.47 | 14.9 | 22 | 5.88 | +1.12 | 22.0 |
| 27 03:00 | 5 | 4.00 | +0.03 | 0.1 | 5 | 4.00 | +0.03 | 0.1 |
| 27 04:00 | 25 | 2.26 | +0.09 | 1.4 | 23 | 1.72 | +0.09 | 2.4 |
| 27 05:00 | 23 | 0.93 | -0.01 | 3.5 | 23 | 0.85 | -0.04 | 6.0 |
| 27 06:00 | 6 | 0.85 | -0.01 | 3.5 | 2 | 4.00 | +0.06 | 6.0 |
| 27 07:00 | 18 | 0.55 | -0.06 | 3.5 | 10 | 0.30 | -0.12 | 6.0 |
| 27 08:00 | 130 | 22.38 | +1.33 | 8.4 | 36 | 5.92 | +0.32 | 6.0 |
| 27 09:00 | 69 | 0.02 | -0.49 | 7.7 | 69 | 0.02 | -0.49 | 7.7 |
| 27 10:00 | 18 | 0.09 | -0.14 | 8.9 | 16 | 0.13 | -0.13 | 8.5 |
| 27 11:00 | 101 | 1.30 | +0.04 | 12.7 | 95 | 1.89 | +0.17 | 15.2 |
| 27 12:00 | 78 | 1.78 | +0.10 | 12.7 | 77 | 3.08 | +0.30 | 15.2 |
| 27 13:00 | 16 | 1.15 | +0.01 | 12.7 | 13 | 7.86 | +0.14 | 15.2 |
| 27 14:00 | 57 | 0.38 | -0.10 | 12.7 | 56 | 0.40 | -0.17 | 15.2 |
| 27 15:00 (partial) | 158 | 0.83 | -0.10 | 12.7 | 128 | 1.01 | +0.01 | 15.2 |

### Reading the big windows

In 26 21:00–03:00 two hours (22:00 and 01:00) carried most of the result: one strong move taken by hundreds of signal orders at once (up to 240 open), each configuration of each confirmed signal counted as its own 2 % unit in this simulation. Live merges all lanes into one control position per symbol and direction (capped at $200 and 12 positions), so live exposure in such hours is far smaller — and so would the losses be in the opposite case. Treat the net of those two hours as an upper bound, not as expected live P&L.
