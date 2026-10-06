# 24 h simulation — signals with a lean engine, 30 symbols (6 Oct 2026)

Simulated trading only (public BingX 1m klines, nothing live). Code: `claude/sim3h-fixes` at 3cf45d9 + docs (all 70
test files pass; the 6 Oct fixes included). Window 5 Oct 15:00 → 6 Oct 15:00 UTC, 24 h pre-history.

Settings: the desk of the 3 h brief (`docs/sims/sim3h-2026-10-06/desk.json`) with
`{"signals":{"count":0},"grid":{"minimal":false,"minimalPlus":{"enabled":false}}}` and `toggles.axis false`
(operator, 6 Oct: signals with the most symbols that fit, Micro on). Signal confirmation stays on (a positive
coordination), so the engine runs Micro / Short / General / Long Normal and Trailing beside the signals.

## Result

| balance | PF $ | PF unit | orders | green hours | equity max DD | checks | peak RSS |
|---|---:|---:|---:|---:|---:|---|---:|
| $10.00 → $11.13 (+11.26 %) | 1.33 | 1.19 | 10,425 | 16 / 24 | 14.75 % | 49 / 49 | 5.2 GB |

| part | orders | PF $ | net |
|---|---:|---:|---:|
| **Signals** | 400 | **8.26** | **+$0.77** |
| Engine | 10,025 | 1.11 | +$0.36 |
| Micro | 1,573 | 0.35 | −$0.10 |
| Short | 5,111 | 1.11 | +$0.25 |
| General | 1,648 | 1.32 | +$0.09 |
| Long | 1,693 | 1.22 | +$0.12 |
| long side / short side | 5,802 / 4,623 | 3.46 / 0.34 | +$2.68 / −$1.56 |

Signals: 68 % of the profit from 4 % of the orders, every one of them long (the signal direction acceptance held the
short signals back: 1,851 skips, in a window where shorts lost). 87,553 signal candidates still fell outside the
active set with `count 0` — the validation filters (net > 0, 60 % positive 4 h blocks, net ÷ drawdown²) keep most
signals inactive.

## Variants on the same tapes (PF unit, net Σ trade %)

| variant | orders | PF unit | net |
|---|---:|---:|---:|
| baseline (as above) | 10,425 | 1.19 | +8,556 |
| signals off | 10,025 | 1.13 | +5,231 |
| signal ranking `net` | 11,309 | 1.48 | +23,330 |
| signal ranking `drawdown` | 10,745 | 1.47 | +21,598 |
| signals' own last-N off | 12,296 | 1.41 | +19,633 |
| signal confirmation off | 10,658 | 1.23 | +10,342 |
| engine direction acceptance on | 5,660 | 2.59 | +23,268 |
| conflict block on | 6,147 | 1.90 | +16,926 |
| validation last 50 | 6,230 | 1.61 | +13,515 |
| Block off | 10,425 | 1.42 | +4,669 |

One window. Engine direction acceptance won this window (PF 2.59) and lost the 5 Oct 3 h one (0.57 → 0.54); the
signal ranking (`lowdd` → `net` / `drawdown`) won here and was neutral on 6 Oct 10–13 (0.38 → 0.39). Defaults stay;
a second 24 h window decides (docs/positive-coordinations.md).

Files: `s24.html` (full report), `s24.md` (write-up).

## s24b — the same window with Block off, engine direction acceptance on, the Micro RSI grid

Code `claude/sim3h-fixes` at 1e31da2 (all 71 test files pass; runtime.test's event-loop timing check failed only while
this run held both cores and passes alone, 27 / 27). Same desk, `toggles.block false`, `axis false`.

| balance | PF $ | PF unit | orders | green hours | equity max DD | checks |
|---|---:|---:|---:|---:|---:|---|
| $10.00 → $12.47 (+24.73 %) | 1.91 | 2.36 | 5,999 | 17 / 24 | 18.16 % | 49 / 49 |

| range | orders | PF $ | PF unit |
|---|---:|---:|---:|
| Signals | 429 | 5.15 | — |
| Micro | 855 | 0.47 | 0.27 |
| Short | 2,604 | 1.87 | — |
| General | 975 | 1.56 | — |
| Long | 1,136 | 1.60 | — |

Every order was long: engine direction acceptance kept every short group out in a window where shorts lost.
Micro still loses forward (its Base-passed pairs median PF 2.89, traded 0.27; the whole Micro universe trades PF
0.64–0.78 forward after the 0.2 % round trip) — the second 24 h measurement in which it loses (s24: 0.35).

Variants on the same tapes (PF unit, net Σ trade %), the ones that move orders or PF most:

| variant | orders | PF unit | net |
|---|---:|---:|---:|
| baseline | 5,999 | 2.36 | +6,948 |
| **signals' own last-N off** | **8,066** | **2.78** | **+11,116** |
| signal ranking `net` | 6,925 | 2.60 | +8,955 |
| signals last 10 (x01's real-money floor) | 6,357 | 2.46 | +7,739 |
| engine direction acceptance off | 10,777 | 1.28 | +3,414 |
| engine direction acceptance window 48 h | 6,209 | 2.37 | +7,011 |
| symbol gate off | 7,864 | 2.30 | +9,149 |
| validation last 50 (x01's real-money floor) | 3,852 | 2.23 | +4,143 |
| Block on | 5,999 | 2.32 | +26,312 (volume) |

Files: `s24b.html` (full report), `s24b.md` (write-up).

## x01 live desk (operator, 6 Oct night: the better variant, medium volume factor)

`x01-live-patch.json` (the change) and `x01-desk.json` (the whole desk: s24b's settings + the patch, with Axis and the
Base set floor PF 1 kept on as positive coordinations; validated with `checkSettings` / `checkMerged`, no warning).
Signals' own last-N off; `live.ratio 2` with `sizing.mode minQty` (each lane unit = 2 × the exchange minimum). On
mainnet the runtime keeps its real-money floors (signals last 10, validation last 50, entry last 25) unless
`CTS_CORE_MAINNET_WAIVE_FLOORS=1`. Start (keys from the host environment, `BINGX_X01_API_KEY` / `BINGX_X01_SECRET`):

```
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_LIVE_TAG=CTSX1L_ \
  node --max-old-space-size=7168 --expose-gc --experimental-strip-types --no-warnings scripts/core-live-test.mjs \
  --name x01-live --conn bingx-x01 --mainnet yes --max-loss <USDT> --on-max-loss pause \
  --symbols 30 --hours 0 --every 15 --out runs/x01-live --patch-file docs/sims/sim24h-2026-10-06/x01-desk.json
```

The same with `--conn bingx-vst-02` (keys `BINGX_X02_API_KEY` / `BINGX_X02_SECRET`, no `--mainnet` / `--max-loss`)
is the demo test.
