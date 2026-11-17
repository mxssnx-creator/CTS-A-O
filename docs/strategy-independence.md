# Strategy independence — every lane processes on its own (16 November 2026)

Operator rule: an **Active** mode relies on its own lanes and sets; it never vetoes the rest of the system. Every
strategy type (Normal, Trailing, Block, DCA / DCA Active, Axis, Historic Exit, Signals) and every relation (Relate) is
evaluated and executed on its own record.

## What was wrong

A real-feed replay (6 symbols, 12 h pre-history, 12 h run, Block Active and DCA Active on) seated 12,092 configs at Real and
opened **0 orders**: every entry that passed its own symbol × side window was rejected as `blockActive`.

- **Block Active** skipped every un-raised entry of every type, also with Normal on — Normal, Trailing, DCA and Axis
  entries alike — because Block has no tapes of its own and its Active rule was applied to the whole book.
- **Relate Active** skipped the base entry of any type once a relation was ready below its active step.
- The optional direction gate (`sideGateN`) pooled the closes of all non-exit types into one record per side.

## Active sub-types: off by default

Block Active, DCA Active and Relate Active (`activeStep`) are **off by default** (code defaults and the live desk preset;
operator, 16 Nov). An Active mode skips its own lane's first steps and executes only the ongoing ones — Block from its
minimum level, DCA Active on its own `dca-active` tapes, Relate from its active step — and it relies on its own lane's
records and progress only. Named study presets that switch one on (`Block Active`, `Block Active + DCA Active`) stay
opt-in.

## The rules now

| gate | what it can veto | scope |
|---|---|---|
| Block Active | a Normal / Trailing entry Block did not raise, **only when Normal is off** | Block's own raises (`blockActive` in `execDecisionFor`) |
| Normal off | an un-raised Normal / Trailing entry | plain kinds only (`normalOff`) |
| DCA Active | which DCA tape executes (`dca` vs `dca-active`) | DCA tapes only (`kindExecutable`) |
| Axis | its own tapes, own toggle | Axis tapes only |
| Relate Active | nothing: below the active step the relation adds no raise; its part is recorded as shadow on the accepted entry and its step keeps progressing | the relation's raise (`RelateBook.decide`, `allowed` is false only for an unknown base volume) |
| direction gate (`sideGateN`, off by default) | an entry on a side whose last N candidates **of the same type** sum ≤ 0 | strategy type × side (Historic Exit: its own config) |
| engine direction acceptance | type family × range × side | already per type |
| one order per pair event (`wf.onePerPairEvent`, default on) | a second config of the same indicator pair × symbol × side × type entering in the same minute (best ranked executes; the rest stay evaluated and recorded) | pair × symbol × side × type × minute |
| config windows (Base / Main / Real / Entry) | the entry's own config × symbol × side | own closes only |
| Signals guard / cluster / acceptance | signal entries | signals only |

Block levels and Relate stacking still read the shared books they are configured to read (Block sources, relation
sources): those decide a **raise**, never whether another lane trades.

Code: `src/core/sim/walkforward.ts` (`execDecisionFor`, `CandidateDirectionBook`), `src/core/sim/relate-volume.ts`
(`RelateBook.decide`), `src/core/positive.ts` (warning only with Normal off).
Tests: `sim/active-independence.test.ts`, `sim/block.test.ts`, `sim/walkforward.test.ts`, `sim/range-min-pf.test.ts`,
`sim/relate-volume.test.ts`, `sim/relate-max-sl.test.ts`, `server/relate-realtime.test.ts`.
