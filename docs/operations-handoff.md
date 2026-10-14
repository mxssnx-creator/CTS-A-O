# CTS-A-O operations handoff

Updated 2026-10-14. Repository: `mxssnx-creator/CTS-A-O`.

## Accounting invariant

The operator clarified on 2026-10-14: **always use return-based PF for primary calculations, gates and information**. Return PF is the sum of positive net returns divided by the absolute sum of negative net returns on the same settled owned sample, after applicable costs. Actual execution returns must come from actual fills and matched notionals where available, with estimates disclosed. Keep simulated and paper evidence separate.

Cash PF is only a separately labeled reconciliation diagnostic when quantities vary. For example, +1.36% on $100 and -1% on $680 produces return PF 1.36 and cash PF 0.20. Both ratios are mathematically correct for their own basis. Never substitute cash PF for return PF or describe their difference alone as a calculation error.

Match connection, ownership, time bounds, partial quantities, close completeness and costs before comparing PF, net or history. Unknown results stay unknown. A minimum selection PF is a historical gate, not a guarantee of future profit.

## Work preservation

The operator requires a persistent workspace, backups and regular validated GitHub checkpoints across chats (see `AGENTS.project.md`). A GitHub backup branch preserves the pre-audit source: `backup/pre-execution-audit-20261014`, commit `061eedd5accb5f013e9d7f2910fc7222d8794fe8`. The source backup does not contain a production database or private runtime settings.

## Access and deployment

This session can read and write the GitHub repository. The checkout started at `061eedd5accb5f013e9d7f2910fc7222d8794fe8` on main. Audit branch: `fix/execution-accounting-20261014`; PR #134. Checkpoints `1e2087e` (standing instructions) and `32d7705` (accounting and sizing) were pushed during the work. The latest operator clarification about return PF supersedes the cash-primary UI in the intermediate checkpoint.

Live access is currently unverified: no configured Tailscale client/session or SSH credentials are present. Previously recorded endpoints `152.53.114.112` and `100.105.148.7` are unreachable from this environment. No GitHub deployment workflow is present. Do not claim that fixes have been deployed, that the live host has been renamed, or that live PF exceeds 1 without new evidence.

The exact external resource called `imperative-greeting-fox` is not present in source, the connected Sites list, or the connected Vercel project-name lookup. Do not rename a guessed resource.

## Audit and verification

Implemented corrections:

- Return PF stays primary in the UI and exchange report aggregation; cash PF is an independent diagnostic. Paper-forward heatmaps and attributed lane-return diagnostics never claim account cash performance or execution proof.
- Actual order fees and matched quantities survive the journal alongside the order ledger. Missing exit fees use the configured cost model, oversized exits charge only the owned fee share, and close attribution excludes previous position lifecycles. Ledger PF still includes disclosed estimates when fills or fees are missing.
- Report history rejects incomplete pages, preserves repeated lane closes and separates closed-position return PF from realized money on still-open positions. Account-wide funding is not attributed to an ownership tag.
- Pooled PF keeps the exact gross sums of break-even sets, so their losses do not disappear from the denominator.
- Volume sizing, account caps and previews use the same verified account equity. Unknown/nonfinite/stale account values do not become the paper balance. Increased venue-minimum retries must pass the same position, exposure, risk, worst-case and margin checks; equity-only clients follow those checks too.
- Balance and equity have separate labels. Live statistics default to owned execution records; the history uses the same window as the PF totals. Without a verified baseline, live charts show ledger net change from zero, never a fictitious $1,000 account balance. Historical account curves remain reconstructions, not a deposit/funding reconciliation.
- The supervisor matches real Node desk invocations and refuses to relaunch on a failed process check.

Validation so far: build, TypeScript and full lint pass (24 existing warnings); 261 script tests pass with 8 environment/browser skips; 60 platform/UI-helper tests pass; 21 API-contract tests pass; 70 targeted accounting/sizing/lane regressions pass. The full core suite is still running. Its one observed lane-cap failure also reproduces on untouched `061eedd`; the corrected assertion checks the five nearest levels within the venue tick and passes all 15 lane-order cases. The final full-core outcome will be recorded below.

The built output served `/v2`, `/v2/trading`, `/v2/statistics`, `/v2/settings` and its local module asset successfully in an HTTP smoke check. This does not execute or visually validate the browser UI. Chromium is unavailable and browser downloads failed, so browser QA is incomplete. No exchange credentials were present, no live orders were placed and no live PF-above-1 claim is justified.
