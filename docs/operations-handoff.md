# CTS-A-O operations handoff

Updated 2026-10-14. Repository: `mxssnx-creator/CTS-A-O`.

## Accounting invariant

Execution PF is gross positive cash P&L divided by absolute gross negative cash P&L for the same settled owned closes after applicable fees and funding. Percentage-return PF is a different diagnostic when quantities vary. For example, +1.36% on $100 and -1% on $680 produces return PF 1.36 and cash PF 0.20. Never substitute one for the other or pool simulated trades into execution results.

Match connection, ownership, time bounds, partial quantities, close completeness and costs before comparing PF, net or history. Unknown results stay unknown. A minimum selection PF is a historical gate, not a guarantee of future profit.

## Work preservation

The operator requires a persistent workspace, backups and regular validated GitHub checkpoints across chats (see `AGENTS.project.md`). A GitHub backup branch preserves the pre-audit source: `backup/pre-execution-audit-20261014`, commit `061eedd5accb5f013e9d7f2910fc7222d8794fe8`. The source backup does not contain a production database or private runtime settings.

## Access and deployment

This session can read and write the GitHub repository. The checkout started at `061eedd5accb5f013e9d7f2910fc7222d8794fe8` on main. The current audit branch is `fix/execution-accounting-20261014`.

Live access is currently unverified: no configured Tailscale client/session or SSH credentials are present. Previously recorded endpoints `152.53.114.112` and `100.105.148.7` are unreachable from this environment. No GitHub deployment workflow is present. Do not claim that fixes have been deployed, that the live host has been renamed, or that live PF exceeds 1 without new evidence.

The exact external resource called `imperative-greeting-fox` is not present in source, the connected Sites list, or the connected Vercel project-name lookup. Do not rename a guessed resource.

## Audit and verification

In progress: cash PF versus normalized PF, actual closed-fill costs and lifecycle attribution, balance-based sizing and UI accounting. Verification results and merged commit will be updated before release.
