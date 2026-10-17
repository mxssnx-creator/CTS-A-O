# Hosted replay launch 39076740047 — incomplete

[GitHub run 39076740047](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/39076740047),
attempt 1, used commit `0d66c763772ec5305e8a164a9e8fe54155b92096` and
Node v24.19.0. The study source-manifest SHA-256 was
`20a6f8109c15c547c5ee1acb235aa2959134f59ff84466f36a684711b9fef0fe`.
The first replay was blocked at resource admission, before strategy scoring.
This is a failed launch record, not a completed 20-symbol simulation.

| Step | Recorded result |
|---|---|
| Frozen dependency install | Passed; 423 packages added, zero reported vulnerabilities |
| TypeScript | Passed |
| Development build | Passed; client/server and core worker packaged |
| Serial offline script regressions | 55 passed, zero failed/cancelled/skipped |
| Public fixture decode | Exact 39,528,851-byte source feed hash verified |
| Protocol preparation | All four baseline/reclaim8 × 20/22 cases prepared before scoring |
| First baseline20 launch | Blocked at preflight; launcher exit 1, `complete:false` |
| Market scoring and comparisons | Not started; no trade result or exclusion list |

Host availability was 14,543.035MiB against the unchanged 4,096MiB admission
minimum. The leaf and `system.slice` cgroups were readable and unlimited.
The scanner treated `/sys/fs/cgroup` as unknown: its limit/current counters
were unavailable in this root layout, although `inactive_file` was readable.
The resulting `availableMiB:null` caused a fail-closed admission decision.
This failure does not establish insufficient host RAM or a failed strategy.
Do not lower the reserve or manufacture a PF from it. The scanner correction
requires verification and newly sealed protocols before a retry.

`run-result.json` and `run-baseline20.log` preserve the exact admission
observation. `orchestration.json` preserves all four protocol/settings/feed
hashes, preparation order, zero new market acquisition requests and unchanged
source identity. `orchestrator.log` records successful decode/preparation and
the first launch's exit 1. Remaining logs preserve the passed code checks.
`metadata.json` indexes each original evidence file with its byte count,
SHA-256 and original local artifact path. The nine original files total
36,028 bytes; the full feeds and large protocols are not duplicated here.

Decoded source feed SHA-256:
`02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e`.
Baseline20 prepared protocol SHA-256:
`94735486e8b0694807cbdbdb2f4993b9ebfeab1955fae9859a4ca14e98e1aafa`.
All endpoint marks, hourly PF, funded order counts and pruning outcomes remain
unavailable because scoring never began. No live deployment, reload or venue
order was performed. The tracked evidence contains no signed download URLs,
credentials or private account ledgers.
