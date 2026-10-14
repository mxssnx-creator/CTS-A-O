This conversation belongs to the CTS-A-O project. In the original Grok environment, project files are mounted at `/workspace/artifacts`; check there for user-provided sources when available. Use the actual repository checkout in other environments.

## Standing operator instructions (2026-10-14)

- Work in a persistent project workspace. Preserve work across chats by committing and pushing validated checkpoints to `mxssnx-creator/CTS-A-O` regularly. Do not rely on a transient checkout as the only copy.
- Make a remote backup branch before a release or deployment. Before changing a running instance, also back up its settings, durable state and database using the database's supported consistent-snapshot mechanism. Never commit credentials or private account records.
- Keep a current handoff in `docs/operations-handoff.md`, including the exact tested commit, tests, deployment state and unresolved blockers. Read it when continuing in another chat.
- Treat execution accounting as release-critical: a reported execution PF of 1.36 while cash PF is 0.20 is unacceptable. Execution PF must use the same owned, settled closes, quantities, costs and time window as actual cash P&L. Keep normalized returns and simulated outcomes clearly labeled separately.
- Balance, equity, net P&L, volume sizing and position history must use the selected connection's actual account and own fills. Unknown, stale or invalid account data must never become a simulated balance for live sizing.
- Seek positive execution PF above 1 after costs throughout the post-Base progression. Report measured losses honestly; do not clamp PF upward, hide losing fills, or claim a configuration is profitable without forward or held-out evidence.
- Use classic industrial names such as `cts-ao-operations`, not generated whimsical names. The requested external rename of `imperative-greeting-fox` is pending until its exact deployment identity is located.

The operator explicitly authorizes fixes, tests, backups, regular GitHub push/merge and a verified live reload. Preserve own-position protection and reconcile actual execution before claiming the release works.
