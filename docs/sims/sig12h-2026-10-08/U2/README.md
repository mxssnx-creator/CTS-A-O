# Signals-only 12 h, round 2 — variant U2 (8 Oct)

Desk: `docs/sims/sig12h-2026-10-08/desks2/U2.json`. Normal stops 1.5 / 2 / 3× target (engine Normal off, signals
Normal on); Trailing trail 0.25 / 0.4 / 0.6 of target with stop 2× (tight); hold 24 h. 20 symbols, 24 h pre-historic,
12 h run (2026-10-07 12:00 → 2026-10-08 00:00 UTC), balance $20.00, `CTS_CORE_VARIANTS=1`, `CTS_CORE_WORKERS=3`.

Files: `session.md` (full report), `writeup.md` (summary), `html/index.html` (diagrams; `html/data.json` the numbers).
Raw dump (`raw.json`) not committed.

## Headline

**Nothing traded.** The as-run book has 0 orders, 0 positions, 0 open at the end, net $0.00 (0.00 %). Every one of the
43,041 signal entry candidates was skipped by `sig:confirm`. Round 1 blocked every signal; round 2 blocks every
signal too: the change to keep engine candidates in the confirmation pool did not reach the run. The as-run result
cannot be ranked, so the performance tables below are empty by construction.

| check | result |
|---|---|
| engine orders (as-run book) | **0** |
| signal orders (as-run book) | **0** |
| signal entries blocked by `sig:confirm` | **43,041 of 43,041** (100 %) |
| checks | **44 / 49 ok** — FAILED: `execution: signals executed orders`; `execution: range mc / sh / gn / lg executed orders` |
| wall time | run 1,431 s (23 min 51 s); about 33 min from launch to exit |
| Artifact | **not published** (checks failed) |

The four range failures are the four excluded ranges (`wf.excludeRanges` = mc, mn, mp, sh, gn, lg) listed as on in
the coverage check but with no orders; the signals failure is the zero-order run itself.

## Why every signal was blocked

- Signal confirmation enters a signal only while an engine candidate (taken or not) is open on its symbol in its
  direction (`docs/positive-coordinations.md`). The run's confirmation pool came out empty: the report shows
  *0 of 0 configs evaluated* and *0 engine configs seated* (`evalStats`), so no engine candidate existed to confirm
  against. The excluded ranges are the likely reason no candidate was built; I did not change code to confirm this.
- Confirmation off, on the same tapes, does trade: **2,439 orders, PF 0.24, net −6,849.70 %** (variant "Signal
  confirmation off"; the same numbers as "Coordination off"). Signals taken without confirmation lose on this run.
- Signal acceptance and confirmation both off: 3,575 orders, PF 0.36, net −7,208.37 %.

## Hour by hour (as run)

| hour (UTC) | orders | PF | net | cumulative net | open at hour end |
|---|---:|---:|---:|---:|---:|
| 12:00 | 0 | – | $0.00 | $0.00 | 0 |
| 13:00 | 0 | – | $0.00 | $0.00 | 0 |
| 14:00 | 0 | – | $0.00 | $0.00 | 0 |
| 15:00 | 0 | – | $0.00 | $0.00 | 0 |
| 16:00 | 0 | – | $0.00 | $0.00 | 0 |
| 17:00 | 0 | – | $0.00 | $0.00 | 0 |
| 18:00 | 0 | – | $0.00 | $0.00 | 0 |
| 19:00 | 0 | – | $0.00 | $0.00 | 0 |
| 20:00 | 0 | – | $0.00 | $0.00 | 0 |
| 21:00 | 0 | – | $0.00 | $0.00 | 0 |
| 22:00 | 0 | – | $0.00 | $0.00 | 0 |
| 23:00 | 0 | – | $0.00 | $0.00 | 0 |

Signals orders closed 0 · PF closed – · open at end 0 · PF including open – · net closed $0.00 · net including open
$0.00. Split trailing (tr > 0) vs fixed (tr 0), by trail ratio, by stop ratio, per symbol: no executed orders to split.

## Variants that traded (on the run's tapes; baseline reproduces the session run)

Baseline: 0 orders. Of 108 rows, these traded; all others were "no effect" with 0 orders.

| variant | orders | PF | net |
|---|---:|---:|---:|
| Signal confirmation off | 2,439 | 0.24 | −6,849.70 % |
| Coordination off | 2,439 | 0.24 | −6,849.70 % |
| Signal acceptance and confirmation off | 3,575 | 0.36 | −7,208.37 % |
| Normal on | 2,396 | 0.30 | −4,813.43 % |
| Block on | 2,319 | 0.30 | −15,852.73 % |
| DCA on | 586 | 0.46 | −752.37 % |
| Axis on | 145 | 5.44 | +159.46 % |

The engine rows turn an engine switch on that the desk keeps off; they are not signal results. Signal-side rows with
no effect (0 orders): Signals off, at most 1 / 3 / 10 per bar, active signals 100 / 200, ranking drawdown / lowdd,
signals last 5 / 10 / 15 / 25, cooldown signals, signal acceptance off, Trailing off. **No trail-ratio or
per-symbol variant exists in the report**, so the trail-range and per-source / per-symbol coordination tests were not
run as separate rows.

## Hypothetical signal results (not executed; upper-bound style)

The report's seated-config tables score the signal configs' closes on the run's tapes, for entries that the
confirmation rule blocked. These are what each source would have done unconfirmed in this window, PF unit basis
(one unit per order, after 0.20 % cost). They are not the book and are not an edge claim.

Per source (indication kind), best five by net:

| source | configs | closes | PF unit | net % |
|---|---:|---:|---:|---:|
| s2-stoch-swing | — | — | 1.53 | +442.77 |
| obv | 60 | 604 | 1.46 | +347.31 |
| act-burst | 59 | 371 | 1.79 | +321.80 |
| ema-cross | 50 | 140 | 3.71 | +214.80 |
| mfi | 30 | 73 | 8.58 | +127.79 |

Worst five by net:

| source | configs | closes | PF unit | net % |
|---|---:|---:|---:|---:|
| heikin-ashi | 59 | 644 | 0.38 | −1,170.81 |
| impulse | 60 | 404 | 0.22 | −1,069.44 |
| r-session-trend | 60 | — | 0.33 | −1,085.98 |
| cmf | 57 | 409 | 0.25 | −1,025.92 |
| cci | 60 | 541 | 0.41 | −1,015.22 |

Best range cells by net (signal configs, ≥ 10 closes, all sources and symbols together), trail ratio and stop ratio:

| target | stop | trail | configs | closes | PF unit | net % |
|---|---|---|---:|---:|---:|---:|
| 6.000 % | 3.00× | off | 75 | 121 | 0.85 | −90.20 |
| 8.000 % | 2.00× | 0.25× | 116 | 550 | 0.81 | −199.50 |
| 8.000 % | 2.00× | 0.40× | 109 | 309 | 0.65 | −356.73 |
| 8.000 % | 2.00× | 0.60× | 90 | 173 | 0.62 | −360.80 |

All four best cells are net negative. The tight trail 0.25× at stop 2× has the most closes of them (550) and PF 0.81.

## Hindsight best config per source × symbol (upper bound)

**Not produced.** The report gives per-source and per-cell results, not per source × symbol, and the raw dump holds no
per-symbol signal closes (`trades` is empty). A per-symbol hindsight table needs a change to the dump, which this
round did not make.

## Checks

`checks: 44/49 ok — FAILED: execution: range mc executed orders; execution: range sh executed orders; execution:
range gn executed orders; execution: range lg executed orders; execution: signals executed orders`

Report not published as an Artifact, because the checks failed. `src/core/report-page.test.ts` was not run for the
same reason.

## What this round means

- The operator's expectation (confirmation blocks far fewer signals than round 1) is not met: round 2 blocks all of them.
- Confirmation is what stops signal losses in this window: off, the same signals lose 6,850 % (PF 0.24); on, nothing trades.
- The fix belongs in the engine-candidate pool that confirmation reads. It must count the excluded ranges' candidates
  (or the desk must keep one engine range that builds candidates without opening orders). That is a code change and is
  not made here.
