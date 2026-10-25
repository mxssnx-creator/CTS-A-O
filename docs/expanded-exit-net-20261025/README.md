# Corrected net-breakeven Expanded Exit study

Source commit: `65f58ca03e8e9dc69ef6d196842773109371bad0`. Economic source SHA-256: `39c138751c6e36ce08993078d2bded69597ce713abee6e369ecabb596ed9c0f8`.

[All five completed runs](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/40196687465) passed the native, scalar history, exact execution and per-entry admission audits. The model preserves exact zero at net breakeven in both directions; material losses and gains remain unchanged.

Expanded cost-aware Exit PF was **0.039335 / 0.226697** in the original/later windows. Two chronological validation slices produced PF 0 in the original window, no Exit executions in the later window, and three winning closes in the earlier window. This fails the goal of consistently profitable Expanded execution. No parameter default is promoted.

PF **1 is neutral**. Positive loss-free samples have an infinite ratio, not a measured finite score of 4. Empty or flat samples are not positive evidence. [Detailed results](RESULTS.md) preserve orders, positions, every executed type, empty Exit tactics, chronological windows and hourly outcomes. Signals and independent Exit are reported separately; aggregate profitability cannot qualify a losing sibling.
