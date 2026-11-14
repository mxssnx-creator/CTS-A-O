# Current strategy fixture corrections — 14 November 2026

Base: main `c699c0108359dcaac5fd729694f6b1082e24a585`.

The independent Signal-base switch was also being masked by the ordinary engine Normal master in both candidate and entry dispatch. Restore the explicit `signalOwnBase` behavior already documented and tested: its own Signal-range Normal switch can disable it, the Trailing master still excludes every trailing kind, and Block qualification remains independent. New cases cover Normal, Trailing and Trailing-only, with and without Block. Other source families retain their ordinary Normal controls.

The old Axis integration fixture created 90 static and hybrid cells while explicitly disabling Trailing. The current dispatcher correctly withheld 30 hybrid cells. Enable Trailing in the 90-cell identity/volume fixture and separately assert that disabling it retains exactly all 60 static identities; every retained config still has identical outcomes alone and beside its siblings. No production toggle or gate is changed.

Every registered Tactic-DCA cell is now exercised through the public registry with its declared decline/recovery pattern and mirror. A shared random walk did not reach all newly added deep decline levels; the production catalog and signal math are unchanged. Every cell still must produce both directions, without an exception list or removing losing observations.

The finite book-reachability fixture now keeps Trailing-only explicitly in its calculated/executed inventory and verifies each no-target execution against its exact no-TP tape. Its stochastic admitted cohort need not qualify both directions for this one new type. The existing deterministic long/short no-target price path, causal trailing, fees and independent qualification checks run alongside it. The original two-sided assertions remain for the established ordinary families.

Other stale fixtures now use each exact decline cell's public-registry regime, require malformed live tags to fail, compare paper freshness to the frozen market clock, apply the configured Micro floor, and keep Block exclusion separate from the Normal switch. Bookkeeping windows are explicit; per-step PF is isolated from the separately tested prehistory gate. No production PF threshold, cost, sample count or qualification gate is lowered.

Verification: 127 affected pipeline/processing/range/Signal/venue-book/stage tests pass under the offline runner, plus 12 identity/registry checks, 18 book/no-target checks, 3 complete DCA-cell checks and 28 strategy/processed-stage/ownership/control checks. TypeScript and the packaged development build pass. The initial full inventory exposed 14 failures among 4,946 cases (4,929 passes and 3 TODOs); those failures were investigated rather than removed from discovery. A fresh complete core inventory is running and its final result is recorded separately, alongside required hosted CI. This change does not certify full live/PF acceptance.

No connection, exchange order, account setting or deployment was changed. Post-Base PF and validated passed/evaluated counts for a new market cohort are unavailable. The paper stage adapter remains distinct from the still-unfinished #219 venue-own-stage and partial/restart ledger work.
