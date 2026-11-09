# Native processed replay — 9 November 2026

Published code: `27c7ad6fb52f611a3a2773270a61abe1b3721157`.
Tree: `07095875861314e24e20398fa44c7768f5764a25`, identical to locally tested
`4d69a1d2481b60e05d8b0c66fd1043c6d7d0595d`, based on merged Main
`1534e2c3f64b84a3db558e7551db58dbce6cd12d`.

## Completed scope

The native `walkForwardGen` entry/settlement loop now has an explicit opt-in
`processedStages: { validationN, realN, negativeFilter? }` path. It connects the
existing independently tested `ProcessedSetBook` to actual replay admissions,
rather than evaluating a manually assembled book after the simulation.

| Record | Admission evidence | Subsequent observations |
|---|---|---|
| `postBase` | Existing Base/config and processing controls, including conflict/cap checks | Own admitted complete parent closes |
| `validated` | Full own `postBase` validation window | Closes of parents admitted to this new set |
| `active` | Full own `validated` Real window | Final modeled execution output and accepted-order feedback |

Both windows range from 1–200. Effective PF is at least the matching range/type
floor and the configured entry floor, above one. Optional recent-loss vetoes read
their own completed parent observations. No raw-candidate history seeds a processed
window. Failed or insufficient later windows continue collecting in their
predecessor; a later failure never removes an earlier admitted loss.

Each identity includes exact config, indication/lane, symbol, direction, type,
window policy, effective PF floor and modeled-cost revision. Endpoint marks remain
held. Costs are already contained in the net source return and are not deducted
again; external execution multipliers are removed exactly once for primary PF.
Nonfinite return evidence remains unknown. Same-time closes cannot qualify an
entry at that timestamp. Warm-up parents do not enter final executed-trade lists,
accepted Real feedback, execution-hour accounting, or final execution PF.

The result contains a separately labeled `processedStages` model report, exact
stage totals, rolling readiness/qualification counts, and a serializable ledger
checkpoint. Coverage denominators are the supplied non-held-only config × visible
symbol × both-direction candidate contexts, including empty siblings. They are
not an exhaustive universe of configurations never built. Summary PF includes
all settled admitted parents, while rolling gate verdicts use strictly prior
closes; neither replaces the original historical validation reports.

## Reproductions and verification

The original controlled eight-symbol, 12h prehistory + 12h replay conflict case
still reproduces the legacy raw-history defect. The new native mode excludes all
14 conflict-rejected winning siblings, records all 14 admitted losing parents in
their exact post-Base set, and admits none to `validated` or `active`. Raw Last-12
can still pass; it can no longer override the processed verdict in this mode.

An independent scalar oracle verifies native progression, losses and recovery.
Additional regressions cover symbol/direction isolation, same-time causality,
negative vetoes, unknown returns, volume/cost normalization, held endpoint marks,
JSON checkpoint restoration, and exact full-result worker parity. The controlled
readiness fixture has 1/16 full and currently qualified contexts (6.25%), including
15 empty contexts. These are constructed correctness fixtures, not market returns.

Local final verification: **90 passed, 0 failed, 1 explicit TODO** across 11 bounded
core files; elapsed 4.73s for the suite, not execution-loop latency. Typecheck and
production/core-worker build pass. Scoped lint has zero errors and two pre-existing
unused-variable warnings in `walkforward.ts`. Database migration correctly skips
without a configured database. No UI surface was changed or visually certified.

The repeatable bounded hosted check is
`.github/workflows/processed-replay-verification.yml`. It runs on this release's
branch pushes or manual dispatch. Hosted run
[42621109498](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/42621109498)
passed the bounded regressions, typecheck and full production build on the exact
published code commit. The subsequent release commit changes documentation only.
Broader inherited research workflows include histories beyond the operator's
72-hour limit and must not be presented as verification of this release.

## Remaining work and deployment boundary

This is **opt-in native modeled replay integration**, not completion of the
persistent owned-paper/venue adapter. Ordinary defaults and saved production
settings are unchanged. The option is not registered as a production Settings
knob. New native paper/pending admissions with this option explicitly fail with
`processedUnavailable`; both full and incremental runtime tests verify that held
positions, quantities and stops remain intact. Existing owned closes still run.

Ledger snapshots do not restore venue ownership, replay scheduling or account
funding across runtime restarts. Stage-specific resimulation with changed
protection economics, independently coordinated parallel runtime policies,
opposite-direction negative-Main simulation, durable paper/venue reconciliation
and production activation remain unfinished. Existing pre-execution processing
controls also govern warm-up parents; this is not a new independent account-cap
model for each stage. Keep draft #219/#244 distinct from this bounded release.

**Current-policy market post-Base PF, market validated percentage and venue PF
remain unavailable.** No new market or exchange run was performed, no profitable
preset was promoted, and no x01/x02 account was started or reloaded. The old
8–9 October cohort remains unchanged: Base 143/1,398 (10.2289%), historical
post-Base 405/1,276 (31.7398%), finite historical mean PF 17.399524089 plus six
no-loss contexts; later funded-model PF 0.273050873. Positions 52/49/3 and orders
3,116/3,108/8 opened/closed/held. Those old measurements do not establish current
economics or forward profitability.
