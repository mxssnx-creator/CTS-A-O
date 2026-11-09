# Processed parent partial accounting — 9 November 2026

The isolated ProcessedSetBook counted every partial slice as a Last-N trade. Nine positive slices of one still-open parent could qualify a nine-parent window. Summing positive and negative slices separately also changed parent PF when the same economic parent was split differently.

A partial now updates its own persistent contribution accumulator and slice count only. Final settlement appends one complete parent return to each admitted predecessor stage. Unknown or overflowing contributions remain unknown through restart and final settlement. Entry-time stage decisions remain frozen; same-time closes still cannot qualify an entry at that timestamp. Callers must supply each slice as its cost-adjusted contribution on the same original parent notional, not an unweighted slice percentage. Costs are not charged again here.

Snapshots are version 3. The older research version 2 cannot safely supply completed-parent provenance and is rejected rather than silently relabeled. This object is not yet wired into production paper or venue admission; no account database migration or order execution is implied. The existing conflict regression and draft #219 remain unresolved and visible.

Both new regressions fail before repair; all 18 processed-book tests pass afterward. Local full core: 4,815 passing checks, two declared slow-check skips and the one pre-existing expected-failing Main→Real TODO (4,818 total). TypeScript passes. Hosted checks are recorded separately on the release. No settings or qualification floors changed. Current-policy market post-Base and venue PF remain unavailable.

Unchanged OLD 8–9 October cohort: Base 143/1398 (10.2289%); post-Base 405/1276 (31.7398%), finite historical mean PF 17.399524089 plus six no-loss contexts; later funded-model PF 0.273050873. Positions 52/49/3 and orders 3116/3108/8 opened/closed/held. These are different historical and future cohorts, not evidence that a high validation PF persisted to execution.
