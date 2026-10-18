# Additive endpoint mark evidence

The engine and the existing minute account model use different DCA marks. Engine
returns sum each ladder leg's percentage return. The minute account model uses
the stored arithmetic average entry, with the parent's final volume. Costs are
deducted on each unit in both formulas; different return denominators cause the
difference. One-leg orders agree apart from floating-point rounding.

`scripts/amend-endpoint-report.mjs` adds both marks to a completed report without
running strategies or replaying account allocation. It does not edit raw input,
frozen study provenance, existing endpoint fields, settled orders, allocation
notionals, hourly results, account totals or curves.

```sh
node --max-old-space-size=4096 scripts/amend-endpoint-report.mjs \
  --raw /absolute/path/to/evidence/raw.json \
  --report /absolute/path/to/evidence/html/data.json \
  --out /absolute/path/to/new-amendment-directory
```

The output directory must not already exist. It contains a revised `data.json`,
its complete allocation sidecars, and `receipt.json`. Keep original evidence
available at the input paths recorded in the receipt. No original file is
replaced, and a prior amendment cannot be overwritten. The standard
`core-session --render` command can render the revised data if an HTML view is
needed; this is separate from creating the audited arithmetic supplement.

## Endpoint fields

All existing fields retain their original values, including `unitR`,
`sizedReturn` and `sizedPnl`, which describe the engine endpoint mark. Added
fields make their basis explicit:

| Added fields | Meaning |
|---|---|
| `engineMarkBasis`, `engineMarkSizedReturn`, `engineMarkUnitReturn`, `engineMarkSizedPnl` | Explicit aliases of the engine return basis and its allocated cash mark |
| `bookMarkBasis`, `bookMtmR`, `bookSizedPnl` | The existing minute account model's aggregate-parent mark |
| `markT`, `markBarOpenT`, `markPrice` | Endpoint time and the last bar already closed at that time |
| `engineMinusBookMarkUsd` | Signed engine cash mark minus account cash mark |

The account calculation preserves the existing operation order:

```text
((side * (markPrice - arithmeticEntry)) / arithmeticEntry - cost)
  * unitNotional * finalVolume
```

The sum of `bookSizedPnl` must reconcile to the original report's open MTM and
ending equity minus balance. Original JSON totals are rounded to six decimals;
the receipt records a $0.000002 comparison tolerance. Unknown prices or funding
are rejected, not converted to zero. Confirmed zero funding remains zero.
Endpoint marks remain excluded from settled-order PF.

## Evidence receipt

The receipt binds the original raw/report header bytes, every referenced chunk,
amendment source files, revised report header and chunks. It also fingerprints
every original settled allocation row, raw settled trade, allocation notional,
hourly row, curve point and study object. `reportRevision` describes an additive
report amendment; it does not substitute a new source hash for the frozen run.
Frozen-source checks are not relaxed.

## Model limit

Raw records do not preserve each DCA leg's fill time and price history. The
existing minute model applies final aggregate entry and volume from the parent
entry time, including minutes before later ladder fills. The supplement
reproduces that declared model; it does **not** certify a causal leg-by-leg
equity, funding, margin or drawdown path. Inferring a harmonic entry from final
legs and applying it to earlier minutes would introduce future information.
An accurate leg-time path requires additional engine evidence and a separate
model evaluation.

Regression fixtures cover both directions, one-leg parity, exact arithmetic,
zero/unknown funding, already-closed prices, immutable original fields and
fingerprints, both storage formats, corruption and overwrite rejection.

## Completed corrected20 control readback

The previously completed 20-symbol control was amended and independently read
back. All original fields were unchanged: 126,380 settled allocation rows,
22,808 endpoint rows, allocation notionals, hourly rows, curves and study
provenance. No strategy or account model was rerun.

Of 420 DCA endpoint rows, 146 had different engine/account marks and 274
single-leg rows matched. All 7,232 Normal and 15,156 trailing rows matched.
Thus **22,662 total endpoint rows matched**, including the single-leg DCA rows.

Engine endpoint cash was −$18.38877698447657. The existing account model's mark
was −$18.390983089577958, a difference of +$0.002206105101386413 from engine to
account. The latter reconciled to the original rounded account MTM and ending
equity minus balance, both −$18.390983. Settled results and PF were unchanged.

See the [independent readback proof](endpoint-mark-old20-proof-20261017.json)
and [complete amendment receipt](endpoint-mark-old20-receipt-20261017.json) for
ordered fingerprints, original/revised physical evidence hashes and the exact
amendment source hashes. Full revised evidence is retained under
`runs/endpoint-amendment-old20-20261017-v2/` in the isolated worktree. Original
inputs remain under `runs/exact-signal-study-ci-v3/corrected20/evidence/` in the
main workspace and were not modified.
