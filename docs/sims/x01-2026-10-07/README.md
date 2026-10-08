# x01 24 h session with the x01 desk (trailing signals, factor 1) — 7 Oct 2026

Simulation only (no live trading, no orders). Real BingX 1m data, 30 symbols (volatility1h, forced XRP / SOL / BCH),
24 h pre-historic + 24 h run, window **2026-10-06 23:00 → 2026-10-07 23:00 UTC**, balance $41. Code: `claude/sim3h-fixes`
at 7b32e4a ("Base 2.2× faster"). Desk: the x01 settings as sent (live `kinds: ["trailing"]`, `source: "signals"`,
`excludeRanges: ["wide"]`, ratio 1, lanes [15], 12 signal sources on, Block / DCA off, Axis on).

```
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=0 CTS_CORE_WORKERS=3 \
/usr/bin/time -v node --max-old-space-size=8192 --expose-gc --experimental-strip-types --no-warnings \
  scripts/core-session.mjs --symbols 30 --pre 24 --run 24 --focus all --desk /tmp/x01-desk.json --balance 41 \
  --max-wait-min 300 --end-at 2026-10-07T23:00:00Z --out … --html … --writeup … --dump …
```

Files: `session.md` (full report), `writeup.md`, `html/index.html` (interactive report; data embedded, `data.json` the
same data). Report checks **55/55 ok**; `src/core/report-page.test.ts` 2/2 pass; the page loads in Chromium with no
page error (91 tables, 5 charts).

## Headline

| | value |
|---|---|
| Balance (closed orders) | $41.00 → **$39.98** (−$1.02, −2.48 %) |
| Equity at end (incl. open MTM) | **$34.43** (54 positions / 7,852 orders open, MTM −$5.55) |
| PF closed | **$ 0.92** · unit 0.91 |
| PF incl. open (unit basis) | **0.54** |
| Orders / positions | 7,857 closed orders · 99 positions · WR 63.7 % · 169 capped to $0 |
| Drawdown | equity max DD **$9.35 (22.60 %)** · DDT closed 12.25 h · equity DDT 23.5 h (equity never regained its first-hour peak) |
| Hours | 14 green / 10 red of 24 · best 06:00 +$1.04 · worst 15:00 −$2.32 |
| Peak margin | $30.79 |

### Per range and Signals (closed orders)

| range | orders | PF $ | PF unit | net | WR |
|---|---:|---:|---:|---:|---:|
| Micro | 62 | 0.07 | 0.55 | −$0.06 | 72.6 % |
| Short | 2,113 | 0.74 | 0.33 | −$0.90 | 36.5 % |
| General | 272 | 0.07 | 0.34 | −$0.29 | 29.4 % |
| Long | 217 | 0.13 | 0.46 | −$0.66 | 35.5 % |
| Wide | 84 | 0.32 | 0.27 | −$0.01 | 20.2 % |
| **Signals** | 5,109 | **1.12** | **1.30** | **+$0.90** | 78.7 % |

Engine (no signals): 2,748 orders, PF $ 0.58, −$1.92. Base → book on the unit basis: every engine range traded at
0.18–0.31 of its Base median PF.

### The x01 book as sent: trailing-stop signal configs

Live sends only signal configs with a trailing stop (config id `tr` > 0). Unit basis (every order at one unit, 0.20 %
cost included); "incl. open" adds the orders still open at the end, marked to market. Net in Σ trade %.

| book | orders closed | PF $ closed | PF unit closed | net $ closed | net unit closed | open at end | PF unit incl. open | net unit incl. open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Signal, trailing (tr > 0) — the x01 book** | 3,935 | **1.20** | **1.40** | **+$1.08** | +2,236 % | 5,543 | **0.61** | −6,604 % |
| Signal, fixed stop (tr0) | 1,174 | 0.92 | 1.10 | −$0.18 | +267 % | 1,750 | 0.62 | −2,200 % |
| All signals | 5,109 | 1.12 | 1.30 | +$0.90 | +2,503 % | 7,293 | 0.61 | −8,803 % |
| All kinds | 7,857 | 0.92 | 0.91 | −$1.02 | −1,187 % | 7,852 | 0.54 | −13,393 % |

The trailing signal book is the only positive type on closed orders (PF $ 1.20, 19 of 24 green hours, DDT 7.25 h). Its
end-of-run open book is larger than its closed one and marks deep red, so including open it is PF 0.61. The report
gives the open MTM in dollars only for the whole book (−$5.55), so the "incl. open" columns are on the unit basis.

### Live sizing

The **live sizing replay** section is *not computed* in this report: the run used `CTS_CORE_VARIANTS=0`, which skips
it (and the variants tables). What the report does give, as live sizes it (2 % of equity per unit, position cap
0.75× equity per symbol × side, gross cap 7× equity, x01 defaults since the desk sets no live caps): 169 orders
capped to $0, 7,458 scaled down, binding position cap 2,923 / gross cap 15,209. **Without the caps**, the same orders end
at $28.23 (−31.15 %), PF $ 0.89, equity at end −$80.00, max DD 293.6 %, margin over equity for 1,395 min.

## Timing

Host: 4 cores, 16 GB, 3 workers.

| | this run (7b32e4a) | previous x01 (d5dac9a, end 22:00) |
|---|---:|---:|
| Wall time (`/usr/bin/time`) | **26 min 18 s (1,578 s)** | — |
| Session time (to compute #4 done) | **1,531 s** (report: 1,534 s) | ~1,900 s |
| CPU | user 4,363 s + sys 179 s (287 %) | — |
| Max RSS | 6.29 GiB (6,594,652 kB; report peak 6,746 MB) | — |
| Base per compute | ~75 / ~105 / ~175 / ~225 s (8 / 16 / 24 / 30 symbols) | ~300 s |

Per phase, from the log's `[N s] <state> <phase>` lines (30 s samples, so boundaries are ±15 s):

| compute | symbols | backfill | Base | Tapes | Signals | Real + Paper | compute (log) |
|---|---:|---:|---:|---:|---:|---:|---:|
| #1 | 8 | 1–31 | 31–~105 (~75 s) | ~105–~228 (~125 s) | – | ~228–~271 | 240 s |
| #2 | 16 | ~271–~300 | 305–~410 (~105 s) | ~410–~595 (~185 s) | ~595–~625 | ~625–~651 | 351 s |
| #3 | 24 | ~651–~690 | ~690–~866 (~175 s) | ~866–~1,018 (~150 s) | (within Tapes) | ~1,018–~1,061 | 371 s |
| #4 | 30 | ~1,061–~1,094 | ~1,094–~1,320 (~225 s) | ~1,320–~1,502 (~180 s) | (within Tapes) | ~1,502–1,531 | 434 s |

Base on the full 30 symbols took ~225 s (±15 s) against ~300 s before, about 1.3–1.4× faster on this shared 4-core host
(not the 2.2× the commit measured). The session as a whole took ~1,530 s against ~1,900 s, about 20 % faster. Tapes
(~180 s at 30 symbols) are now as large a share of a compute as Base.
