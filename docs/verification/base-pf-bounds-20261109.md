# Base statistic PF-policy bounds — 9 November 2026

Two reporting defects were reproduced independently of market performance. Merging worker chunks retained
the first chunk's `minPf` / `minPfMax`, so two Micro cells with configured step floors 1.08 and 1.40 could be
reported as 1.08–1.08. Reversing the chunk order could instead lose the lower bound. The job summary also
reported a fixed 1.1 diagnostic floor before any row was observed, even when the actual row floor was 1.05.

Merging now preserves both ends of the actual per-cell policy range. Summary `floorPf` / `floorPfMax` derive
from the observed row floors and remain null for pending, empty or invalid evidence. Restored summaries derive
their bounds from the retained rows instead of trusting the old hard-coded aggregate. These diagnostic floors
are distinct from the configured per-step admission thresholds. The trading gates, returns, passed/evaluated
counts, fees and defaults are unchanged.

Both new regressions failed before the fix. Thirty checks pass across the complete Base counter, background
job and step-PF suites, including comparison with a direct unsplit counter in both chunk orders, empty samples,
restoration, cancellation, all strategy types and actual worker chunk parity. No market return was simulated for
the new metadata examples. Typecheck, scoped lint and production/core-worker build are recorded with the release.

Command:

```sh
node scripts/test-core.mjs src/core/server/base-config-job.test.ts src/core/base-config-counts.test.ts src/core/step-pf.test.ts
```

No new current-policy post-Base or venue PF exists. The unchanged OLD 8–9 October cohort has post-Base
405/1,276 (31.7398%), finite historical mean PF 17.399524089 plus six no-loss contexts; later funded-model PF
0.273050873. Positions 52/49/3 and orders 3,116/3,108/8 opened/closed/held. The persistent Main→Real adapter
remains unresolved. This metadata repair cannot establish profitable execution or future high PF.
