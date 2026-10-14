This conversation belongs to the CTS-A-O project. In the original Grok environment, project files are mounted at `/workspace/artifacts`; check there for user-provided sources when available. Use the actual repository checkout in other environments.

## Standing operator instructions (2026-10-14)

- Work in a persistent project workspace. Preserve work across chats by committing and pushing validated checkpoints to `mxssnx-creator/CTS-A-O` regularly. Do not rely on a transient checkout as the only copy.
- Make a remote backup branch before a release or deployment. Before changing a running instance, also back up its settings, durable state and database using the database's supported consistent-snapshot mechanism. Never commit credentials or private account records.
- Keep a current handoff in `docs/operations-handoff.md`, including the exact tested commit, tests, deployment state and unresolved blockers. Read it when continuing in another chat.
- **Always use return-based PF for primary calculations, gates and information** (operator clarification, 2026-10-14). For actual execution use the actual owned net returns after costs. Cash-weighted PF is only a separately labeled reconciliation diagnostic; never substitute it for return-based PF or compare the two as though they measure the same thing.
- Treat execution accounting as release-critical: PF comparisons must use the same return basis, ownership, settled closes, costs, granularity and time window. A return PF of 1.36 and cash PF of 0.20 can both be mathematically correct with unequal order sizes; presenting them as the same metric is unacceptable. Clearly distinguish execution, paper and simulated evidence.
- Compare execution return PF on the same settled close slices, including partial reductions. A whole-position episode is a different sample and must be labeled separately. Disclose the existing no-loss score convention instead of presenting its sentinel as an exact finite measured ratio.
- An accepted order is not a fill. Explicit zero/partial quantities, pending status, late settlement and restart recovery must retain the real owned quantity and durable order identity. Never infer full ownership from an empty status poll or erase an earlier partial fill from a stale cumulative reply.
- Balance, equity, net P&L, volume sizing and position history must use the selected connection's actual account and own fills. Unknown, stale or invalid account data must never become a simulated balance for live sizing.
- Seek positive execution PF above 1 after costs throughout the post-Base progression. Report measured losses honestly; do not clamp PF upward, hide losing fills, or claim a configuration is profitable without forward or held-out evidence.
- Use classic industrial names such as `cts-ao-operations`, not generated whimsical names. The requested external rename of `imperative-greeting-fox` is pending until its exact deployment identity is located.

The operator explicitly authorizes fixes, tests, backups, regular GitHub push/merge and a verified live reload. Preserve own-position protection and reconcile actual execution before claiming the release works.
