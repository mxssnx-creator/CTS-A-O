# Ranges validation — Short, Minimal, Micro, Minimal plus

All results below come from real BingX 1-minute data with a 0.20 % round-trip cost on every close, using `scripts/core-session.mjs`. The windows are 24 h, ending 2026-10-01 16:00–16:20 UTC. Each config is computed independently at unit size, whether or not it took a seat. The run's executed book (sizing, Block, caps) is reported separately.

## Ranges

| range | targets | stops | trailing | tracking kind |
|---|---|---|---|---|
| Short | 0.6 – 1.2 % (3–6× cost) | 1–3× target, step 0.25 | 0.5× / 0.75× target, stop ≥ 2× | `H` |
| Minimal | 0.2 – 0.8 %, step 0.1 % | 1–2×, step 0.25 | 0.5× / 0.75×, stop ≥ 2× | `N` |
| Micro | 0.1 – 0.4 %, step 0.025 % | 1–3×, step 0.5 | 0.5× / 0.75×, stated stop | `U` |
| Minimal plus | 0.4 – 1.0 % (2–5× cost), step 0.25× | 0.5–3×, step 0.25 | 0.5× / 0.75×, stop ≥ 2.5× | `M` |

- **Fixed distances.** A range cell keeps its price distances on every lane. It is not lane-scaled, and the wide grid's 0.5 % stop floor does not apply; each range keeps its own minimum stop and trail.
- **Own ids.** Range cells carry their range in the config id (`|sh`, `|mn`, `|mc`, `|mp`). Their live orders carry the tracking kind in the client id.
- **Off by default:** Micro, Minimal and Minimal plus. Short stays on, behind the range gate.

## 1. 16 symbols, focus set, 24 h (fit off, gate off)

| range | type | configs | positive | closes | WR | PF |
|---|---|---:|---:|---:|---:|---:|
| Micro | normal | 6,500 | 4 % | 94,728 | 20 % | 0.05 |
| Micro | trailing | 13,000 | 4 % | 189,456 | 20 % | 0.05 |
| Minimal | normal | 3,500 | 7 % | 50,862 | 33 % | 0.20 |
| Minimal | trailing | 1,400 | 9 % | 20,284 | 39 % | 0.21 |
| Short | normal | 3,600 | 13 % | 50,726 | 55 % | 0.48 |
| Short | trailing | 4,000 | 16 % | 55,790 | 59 % | 0.50 |
| Wide | normal | 4,365 | 50 % | 51,655 | 67 % | 1.02 |

- **Cost floor:** a target below the 0.20 % cost cannot win after cost, so every Micro cell under 0.2 % loses by construction.
- **Best Short cell:** TP 1.2 %, SL 3×, PF 0.85.
- **Executed book:** PF 1.84, +38.8 %, but equity drawdown 48 %.

## 2. 8 symbols, every indication × bot, 24 h, horizon fit on

The fit computes a range cell only where its target lies within 0.2–2.5× of the indication's typical move (σ₁ₘ · √(period · lane minutes)). At least two targets per range are kept as coverage.

| range | type | configs | positive | closes | WR | PF |
|---|---|---:|---:|---:|---:|---:|
| Micro | normal | 23,380 | 10 % | 252,848 | 48 % | 0.18 |
| Micro | trailing | 46,760 | 9 % | 508,318 | 44 % | 0.17 |
| Minimal | normal | 24,780 | 25 % | 255,696 | 55 % | 0.50 |
| Minimal | trailing | 9,912 | 25 % | 102,044 | 56 % | 0.47 |
| Short | normal | 46,116 | 36 % | 448,455 | 66 % | 0.78 |
| Short | trailing | 51,240 | 38 % | 499,184 | 65 % | 0.77 |
| Wide | normal | 17,037 | 53 % | 140,380 | 65 % | 1.16 |
| Wide | trailing | 17,037 | 54 % | 145,035 | 66 % | 1.06 |
| Wide | axis | 8,848 | 32 % | 22,586 | 64 % | 1.10 |

With the fit, every range improves (Micro 0.05 → 0.18, Minimal 0.20 → 0.50, Short 0.50 → 0.78), but all of them stay below PF 1.

**Indications with at least 200 closes in the window, positive vs all:**

| range | positive / all |
|---|---:|
| Micro | 8 / 711 |
| Minimal | 86 / 491 |
| Short | 254 / 795 |
| Wide | 388 / 663 |

Most positive range indications are breakout or short-horizon reversal setups on the 1m / 5m lanes: `break-don40@m1`, `r-pin@m1`, `ema-slope-20@m1c`, `break-atr-1.5@m1c`, `willr-14-80@m1c`, `r-camarilla-m@m1`. Each individual config there has only 5–8 closes, which is why the range gate below asks for 50 closes first.

## Causal last-50 gate

A config qualifies when its last 50 closes before the run clear the min PF. The table shows the result inside the run (8 symbols, fit on):

| range | min PF | configs | positive | closes | PF |
|---|---|---:|---:|---:|---:|
| Minimal | 1.10 | 370 | 12 % | 9,642 | 0.59 |
| Minimal | 1.35 | 54 | 19 % | 1,044 | 0.54 |
| Short | 1.10 | 10,299 | 25 % | 237,731 | 0.81 |
| Short | 1.35 | 4,611 | 26 % | 115,267 | 0.83 |
| Short | 1.75 | 1,106 | 31 % | 28,191 | 0.86 |
| Short | 2.00 | 490 | 32 % | 12,199 | 0.85 |

A higher gate PF selects slightly better configs, but none of them stays above PF 1 forward. In the executed book, the Real-stage gates (window PF, net > 0, lower confidence bound, green hours) and the range gate seated no range cell in either run, which is correct.

## Defaults

- **Range gate on:** last 50 closes at PF 1.35 (`grid.rangeGate`). This is also an exact memory saving. A range tape with fewer than 50 closes in total can never seat, so it is not kept. On the 8-symbol, every-indication run that is 236k → 128k tapes and peak RSS 6.9 → 5.0 GB, with an identical result (PF 2.163, 808 orders).
- **Horizon fit on** (`grid.rangeFit`). Without it, the full-universe run with Micro + Minimal was OOM-killed above 8.8 GB.
- **Micro, Minimal and Minimal plus stay off.** Short stays on behind the gate, so it trades only once a cell proves itself.
- **Minimal plus:** no cell cleared the gate, so no cells are stored and the range stays off.

## Live check on BingX VST (x02)

Each range ran as its own demo desk with its own tracking tag: `CTSV2U_` Micro, `CTSV2H_` Short, `CTSV2N_` Minimal. The gates were relaxed (min PF 1.05, no validation last-N) so they could trade at all. See `docs/live-vst-ranges.md`.

## Reproduce

```bash
node --experimental-strip-types scripts/core-session.mjs --symbols 16 --pre 12 --run 24 \
  --settings '{"grid":{"micro":{…},"minimal":{…},"rangeFit":{"enabled":true}}}' --out runs/ranges
node --experimental-strip-types scripts/core-mem-probe.mjs --symbols 8 --settings '{…}'
```
