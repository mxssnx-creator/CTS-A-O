# Minute-cap execution repair — 29 October 2026

An explicit15minute maximum on a30minute indication was converted into zero source bars and discarded by
`pipeline.ts` Base evaluation and `walkforward.ts` tape construction.15minute and20minute caps could also
share the same floored hold/config proof. This could remove qualified short-duration sets before execution.
This is a demonstrated correctness defect, not proof that it explains all previously observed PF losses.

The shared `capped-execution.ts` adapter now projects completed indication signals sparsely onto the config's
own minute prices. Entry is the next minute open. Source ATR and Axis center calculations remain on their
original indication clock and become available only after that source bar closes. Base, Normal, Trailing,
Trailing-only, DCA, DCA Active, and Axis fixed/managed/desk use the same capped execution prices. Distinct
minute caps have distinct `hm` config/cell identities; old IDs retain their original economics. Missing own,
stale, gapped or invalid minute prices cannot become borrowed proof. Subbar cells without minute evidence
remain unavailable. Uncapped/native research keeps its existing clock.

The first regressions exposed two more defects. Realtime trailing still used the indication clock after
minute execution; held positions now retain explicit execution-clock provenance through private continuation
and restart. Axis Desk's winning-position extension could override an explicit maximum and last2×hold; that
maximum is now hard, while uncapped legacy desk behavior remains. Retained positions keep their exact old
IDs and protections and cannot take new seats. Statistics show a known minute ceiling instead of zero bars.
Migration backs up and retires affected cached proofs/counts without changing operator settings, held books,
recorded closes or venue/account results. Migration rollback and repeat-run safety are tested.

## Bounded evidence

The frozen feed covers6Oct2026 12:00 through9Oct12:00UTC: **72hours total**, including24h indication
warmup,20symbols,1/5/15/30m source clocks,15minute cap,0.15% round-trip cost. It exercises640tapes,
1,280independent symbol/type/clock/side contexts,25,637closed modeled orders,65held orders and50unfilled
intents. All240ordinary Base/execution count/net comparisons agree; no tested kernel exceeds the cap.
The fixed-input closed-order checksum is
`48fc55fa059d1c03e339233a3a0103a557bf6502c8be80fb1d8c414eb3fa22ee`.

With a256MiB Node heap ceiling, calculation took0.639s; sampled heap67.1MiB and maxRSS192.6MiB, including
the detailed CSV export. These are local observations, not production resource guarantees. New study guards
reject more than72total hours or20symbols before loading data. The separate legacy full local suite was
interrupted at its18day lifecycle fixture; do not describe that invocation as passing.

- `execution-audit.html`: raw PF heatmap and all1,280independent contexts, with symbol/type/clock filters.
- `execution-audit.json`: complete aggregate/context results, input hash, performance and per-symbol batches.
- `orders.csv.gz`: every closed order, held mark and pending intent, with exact config, side, clock and exit reason.

This is an **unfiltered execution-kernel audit**. It does not run the complete Base→Main→Real stage adapter,
additional/Overall volume strategies, account caps or exchange mirroring. Its raw PF cannot qualify a set or
substitute for the application's validated-only PF. Pending intents and open marks never count as closed
Last-N observations. No production venue/account or deployment was identified or modified.

## Separate unchanged stage-performance cohort

20symbols, Low-Range step3 Micro, Normal/Trailing,1/5/15m indications, minute execution;
8Oct12:00–9Oct12:00UTC with24h prehistory and the historicalPF1.1 policy:
Base10/4,800passed(0.20833%), historical passingPF1.2052314969; subsequent MainPF0.6173282875.
Positions opened/closed/held307/305/2; orders1,585/1,583/2. Main exits501TP,414SL,97trail,571time.
Real0/1,585passed(0%); no Active orders; Active PF and venue/funded results unavailable.
The current range-floor release supersedes that old policy, but this audit does not retest its stage profitability.
Stable high executed PF remains unproved. The persistent stage adapter and larger independent30m catalogue
remain unmerged work; do not enable or merge their checkpoint as if this release completed them.

## Reproduction

```bash
node --max-old-space-size=256 --experimental-strip-types --no-warnings scripts/perf/capped-execution-audit.ts 72 20 docs/minute-cap-execution-20261029
python3 scripts/render-capped-execution-audit.py docs/minute-cap-execution-20261029
```
