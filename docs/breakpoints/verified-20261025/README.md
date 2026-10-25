# Verified troubleshooting baseline — 25 October 2026

This named checkpoint preserves the verified software/reporting version, its exact test receipts and reproducible financial evidence. It does not certify stable profits or an active X02 instance. Use the commit identifiers in baseline.json, not a moving main branch, for comparisons. Never replace the preserved failed original Signal report with the corrected report.

| Reference cohort | Post-Base validation PF | Validated | Later settled execution PF | Positions opened/closed/held | Orders opened/settled/held |
|---|---:|---|---:|---|---|
| Ordinary EMA, run start | 5.619923 | 11.4089% (5,091/44,623 evaluated configs) | 1.336606 | 15/4/11 | 7,076/4,882/2,194 |
| Signals, endpoint | 4.608184 | 0.3773% (11,436/3,030,936 exact contexts) | 0.065995 | 4/2/2 | 863/280/583 |

Return PF neutral is 1; modeled round-trip cost is 0.15% once. Both execution windows are 17 October 2026 09:00–21:00 UTC. Historical validation and subsequent funded settled execution are separate samples. Ordinary drawdown22.5921% and later Signal executionPF0.065995 remain unresolved financial limits. No clamp, gate reduction or losing-history deletion is authorized by this breakpoint.

## Troubleshooting contract

1. Reproduce the exact source, frozen settings, symbol list, minute feed and evaluation window. Use the saved source seals and preserve the first failing attempt.
2. Compare identical config × symbol × direction × entry × exit and funded allocation samples. Keep missing/unknown units or fee provenance unavailable; known zero allocations stay excluded. Apply external sizing normalization and costs exactly once.
3. Separate Base pair acceptance, exact post-Base config/context validation, Last-N readiness, selected entries, actual funded closes and endpoint holdings. Show numerator/denominator and timestamp beside PF; do not substitute one stage's PF for another.
4. Preserve independent Signal/ordinary routing, Exit Base proof, held-config exit ownership, partial-fill state and atomic publication. A reporting false negative requires a minimal reproducer and unchanged underlying evidence; a losing execution cohort is not automatically a software error.
5. Compare complete hourly counts and orders, including failures and no-loss/empty states. Re-run relevant regression and accounting audits before promoting changes.

## Resume scope

PR205 adds the mandatory PF/percentage reporting rule to AGENTS.project.md for subsequent project chats. Saved original simulation archives are listed in docs/release-20261025/archives.json. The new 50-symbol data-only branch885b8af retains600 verified daily archives and864000 minute bars with zero errors. Its archive link is recorded in baseline.json. No50-symbol trade simulation, new profitable-config selection or X02 activation has occurred. The earlier broad ordinary workflow40226266532 remains separate pending work. Fractional Exit tactics, per-leg minute equity and held-out financial stability remain unfinished.

Before any live reload, back up consistent DB/settings/state and reconcile owned positions and incompatible cached qualifications. Continue user-requested50-symbol ordinary, Signals and configured-strategy testing from the preserved work branch; do not label its data-preparation tests as completed trading tests.
