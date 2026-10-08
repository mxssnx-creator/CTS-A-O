# Signals-only 12 h, round 2, variant U1 (8 Oct)

Simulation only: no exchange keys, no live orders. Desk: `docs/sims/sig12h-2026-10-08/desks2/U1.json`
(Normal stops 1.5 / 2 / 3× target, Trailing trail 0.4 / 0.6 / 0.8 of target with stop 3×, hold 24 h; engine
types off, engine ranges excluded). Window 2026-10-07 12:00 → 2026-10-08 00:00 UTC, 20 symbols, 24 h pre-history,
balance $20.00, 0.20 % round-trip cost.

Command: `scripts/core-session.mjs --symbols 20 --pre 24 --run 12 --focus all --desk …/U1.json --balance 20
--max-wait-min 240 --end-at 2026-10-08T00:00:00Z` with `CTS_CORE_COMPARE=0 CTS_CORE_VARIANTS=1 CTS_CORE_WORKERS=3`
and `MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576`.

## Headline

**The signals-only condition held, but the book traded nothing.** The run executed 0 orders. Every one of the
38,775 signal entry candidates was skipped at `sig:confirm`, the same count as round 1 (T1). The run therefore has
no closed or open orders, so PF, net, hourly and per-symbol book tables are all zero.

| check | result |
|---|---|
| run exit | exit 1 (the session script exits 1 when a check fails); the report was written in full |
| checks line | **`checks: 44/49 ok`** — FAILED: `execution: range mc / sh / gn / lg executed orders`, `execution: signals executed orders` |
| engine orders executed by the run | **0** (the book's `trades` and `openEnd` are empty in `raw.json`) |
| signal entries blocked by `sig:confirm` | **38,775 of 38,775 candidates** (round 1: 38,775; round 2 has not reduced it) |
| signal orders executed | **0** |
| Artifact | **not published** (checks failed; the brief says do not publish) |
| wall time | 1,861 s run (≈ 31 min), started 01:23 UTC, finished 01:54 UTC |

### What the failing checks mean

- **`execution: range mc / sh / gn / lg executed orders` (4 checks):** a check artefact, not an engine order.
  `cov.ranges` (`scripts/core-session.mjs:224`) reads the grid switches, which U1 keeps on, while U1 excludes those
  ranges in `wf.excludeRanges` (`mc, mn, mp, sh, gn, lg`). The check therefore expects orders from ranges that are
  excluded by design. The engine ranges did not execute, as intended.
- **`execution: signals executed orders` (1 check):** real. No signal order executed, because confirmation skipped
  every candidate. This is the failure to act on. Round 2's stated fix (keep engine candidates for confirmation)
  did not produce a single confirmed entry in this window.

## What the run shows (simulated, not executed)

The per-signal configurations were simulated over the window, not traded through the book. Their results are below.
Units: net is the sum of per-config net % of one unit (PF unit basis), and PF is per config.

### Variants that traded (`variants.rows`, 7 of 120; the baseline and the other 113 rows did not trade)

| variant row | orders | wins | PF unit | net % | open at end | open net % |
|---|---:|---:|---:|---:|---:|---:|
| Signal confirmation off | 1,925 | 889 | 0.27 | −6,142.5 | 2,940 | −6,887.7 |
| Signal acceptance and confirmation off | 2,826 | 1,471 | 0.39 | −6,298.1 | 4,023 | −9,315.1 |
| Coordination off (all) | 1,925 | 889 | 0.27 | −6,142.5 | 2,940 | −6,887.7 |
| Normal on (engine type, variant only) | 2,145 | 855 | 0.34 | −4,248.6 | 2,862 | −6,105.9 |
| Block on (engine type, variant only) | 2,117 | 849 | 0.32 | −15,303.1 | 2,827 | −15,181.6 |
| DCA on (engine type, variant only) | 483 | 307 | 0.56 | −560.0 | 1,043 | −1,920.4 |
| Axis on (engine type, variant only) | 119 | 77 | 6.22 | +178.3 | 500 | −504.0 |

The four engine-type rows re-run the walk-forward with an engine type switched on. They are variants, not U1's book.
Only the signal-confirmation rows show what happens when the gate is removed: the signals then trade, and they lose
(PF 0.27, net −6,142 %). This window does not show whether confirmation would keep the better signals, because it
keeps none of them.

### Signal configurations, by type and by trail / stop (simulated on the window)

| split | closes | net % |
|---|---:|---:|
| Normal (fixed stop) | 9,237 | −14,063.7 |
| Trailing | 7,238 | −6,380.9 |

Best-cells table (≥ 10 closes, 30 rows):

| split | closes | net % |
|---|---:|---:|
| fixed stop (no trail) | 9,237 | −14,063.7 |
| trail 0.40× | 3,287 | −2,022.0 |
| trail 0.60× | 2,220 | −1,867.3 |
| trail 0.80× | 1,731 | −2,491.7 |
| stop 3.00× | 9,541 | −10,376.5 |
| stop 2.00× | 3,105 | −4,900.0 |
| stop 1.50× | 3,829 | −5,168.0 |

Trailing is less negative than fixed, and the 0.40× trail carries the least loss per close. Every split is still
negative in total.

### Per signal source (simulated, 62 sources, 120 indication rows; sorted by net)

Hindsight upper bound: the best-config PF is the best of that source's configs on this window, chosen after the
fact. It is not a tradable result.

Top sources by net %:

| source | rows | closes | net % | best config PF (hindsight) |
|---|---:|---:|---:|---:|
| s2-stoch-swing | 2 | 487 | +597.1 | 3.91 |
| obv | 2 | 422 | +374.0 | 3.68 |
| act-burst | 2 | 301 | +370.8 | 2.34 |
| atr-break | 2 | 325 | +278.7 | 1.72 |
| ema-cross-fast | 2 | 301 | +267.7 | 5.92 |
| ema-cross | 2 | 113 | +238.9 | 8.41 |
| r-vol-regime | 2 | 70 | +206.2 | 9.31 |

Bottom sources by net %:

| source | rows | closes | net % | best config PF (hindsight) |
|---|---:|---:|---:|---:|
| thrust | 2 | 386 | −1,117.2 | 0.44 |
| swing | 2 | 385 | −1,015.2 | 0.33 |
| impulse | 2 | 279 | −1,000.0 | 0.36 |
| s2-atr-break | 2 | 256 | −922.2 | 0.32 |
| cmf | 2 | 270 | −883.8 | 0.29 |
| heikin-ashi | 2 | 464 | −875.1 | 0.55 |

The per-source table in the run log has 62 sources; the full list is in `session.md` (the run log's
"Indications per range" section). Sources with a `–` best PF had no config that closed.

### Per symbol

Not available. The run produced no per-symbol signal results: the report does not break signal configurations
down by symbol, and the book is empty. A per-symbol table needs a report change, which this round does not make.

### Hour by hour

Not available for the book (0 orders in every hour; `session.md`, "Hour by hour" = all zeros). The report has no
hour-by-hour table for the signal configurations.

### PF including open, trailing vs fixed, open at end

- Book: PF closed and PF including open are both undefined (no orders). Open at end: 0 positions.
- Signal configurations: open-at-end net is in the variant rows above (the confirmation-off row: −6,887.7 % including
  open, against −6,142.5 % closed).

## What to fix next (not changed in this round)

1. **Confirmation admits nothing.** Round 2 kept engine candidates for confirmation, but `wf.excludeRanges` excludes
   all six engine ranges, so the engine's candidate pool that confirmation reads is empty for U1. The 38,775 blocks
   equal round 1's count. Either confirmation counts the candidates of the excluded ranges, or confirmation is
   changed; the operator's choice is needed (`docs/positive-coordinations.md` requires a causal comparison before a
   coordination is changed).
2. **Check coverage.** `cov.ranges` should respect `wf.excludeRanges`, so the four engine-range checks do not report
   a failure for a range the desk excludes by design.
3. **Per-symbol and per-hour signal tables.** The report has neither; they are needed to judge the signal sources.

The confirmation-off variant is the one measured trade result in this run, and it loses (PF 0.27 closed). No code
or default was changed in this round.

## Files

- `session.md` — the session report (checks, book, variants, signal tables).
- `writeup.md` — the write-up.
- `html/index.html`, `html/data.json` — the HTML report (not published as an Artifact, because the checks failed).
- Raw data (`raw.json`, `log.txt`) stays in `runs/U1/` and is not committed.
