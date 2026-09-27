# Signal order cap per symbol — 6 × 6 h replay

Real BingX 1m data, 12 symbols, six consecutive 6-hour windows, each a complete computation as of its own end (6 h pre-historic window), defaults otherwise (stop / trailing floors 0.5 %). $10 per window, 2 % of equity per order unit, 10×, 0.20 % round trip.

| window (UTC) | uncapped: orders · PF · net · max DD | cap 24: orders · PF · net · max DD | cap 8: orders · PF · net · max DD |
|---|---|---|---|
| 26 07:00–13:00 | 273 · 0.67 · -3.6 % · 6.5 % | 194 · 0.98 · -0.1 % · 3.2 % | 117 · 1.31 · +1.1 % · 2.0 % |
| 26 13:00–19:00 | 43 · 3.66 · +3.3 % · 1.3 % | 43 · 3.66 · +3.3 % · 1.3 % | 43 · 3.66 · +3.3 % · 1.3 % |
| 26 19:00–01:00 | 819 · 3.51 · +61.7 % · 52.9 % | 267 · 2.61 · +14.5 % · 15.4 % | 135 · 2.36 · +6.1 % · 6.3 % |
| 27 01:00–07:00 | 569 · 1.22 · +1.3 % · 40.8 % | 260 · 1.24 · +3.5 % · 9.7 % | 162 · 1.84 · +6.7 % · 3.8 % |
| 27 07:00–13:00 | 414 · 0.44 · -20.8 % · 32.2 % | 220 · 0.78 · -3.0 % · 9.9 % | 127 · 1.16 · +0.8 % · 3.4 % |
| 27 13:00–19:41 | 387 · 2.85 · +18.3 % · 13.4 % | 162 · 1.12 · +0.7 % · 4.3 % | 84 · 1.33 · +1.0 % · 1.8 % |

| | compounded | positive windows | positive hours | worst equity DD |
|---|---:|---:|---:|---:|
| uncapped | ×1.53 | 4 / 6 | 22 / 36 | 52.9 % |
| cap 24 | ×1.19 | 4 / 6 | 24 / 36 | 15.4 % |
| cap 8 (default) | ×1.20 | 6 / 6 | 25 / 36 | 6.3 % |

Uncapped, one strong move is taken by hundreds of signal orders at once (every configuration of every confirmed signal is its own order), which makes the big windows (+62 %) and the big losses (−21 %, 53 % equity drawdown). Capped at 8 open signal orders per symbol, every window ends positive and the worst drawdown is 6.3 %; the total is lower because the largest single window is smaller. The last window (ago 0) of the capped runs is one hour later than the uncapped one.
