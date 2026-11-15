# Old PR #238 — neutral PF and cancellation-safe windows

## Compared revisions

- Old draft: PR #238, base `d677b05d3ac4dc3571e58641cc8e4324b8d17acb`, head
  `51c6464a1e5639c7795b704066adfba44712bb54`.
- Current integration base: `67ae55b501aef10377046832efbc4f0477661dd5` (`main` after PR #268).
- The current target is 105 commits ahead of the old common base. No old branch or conflicted file was
  accepted wholesale.

## Claim-by-claim disposition

| Old draft content | Current-target disposition |
|---|---|
| Neutral return PF is exactly 1 for equal gross gain/loss, including tiny finite returns | Already integrated and superseded by `7969959` and `src/core/metrics/profit-factor.mjs`; not duplicated. |
| Shared PF primitive across reports, gates and UI | Already integrated by later mainline work; the obsolete draft `profit-factor.ts` was not restored. |
| Recover a recent tiny Last-N window hidden by cancellation in large cumulative prefixes | Missing on current `main`; ported onto current types and ownership rules through `returnWindow`. |
| Preserve raw unit returns needed for an exact recovery | Added to live records, side records and relevant model/config tapes. Unknown raw returns remain unknown. |
| Signal hourly direction groups recover their exact selected buckets | Added bounded per-hour gross buckets and a rescan only when finite prefix cancellation is detected. |
| Legacy/malformed/overflowed prefix evidence | It is never repaired from raw rows. Nonfinite, decreasing or unavailable aggregate evidence fails closed. |
| Historical parity helper tied to external 2026-10-29 raw/audit JSON | Not published as an unexecutable repository check; its required artifacts are absent. Current scalar-reference and systemwide tests cover the production gate. |
| Persistent processed adapter / funded venue proof | Not evidence supplied by #238. Current processed-stage work is tracked separately under old draft #219. |

The integration preserves the current target's newer processed-stage provenance, ownership, fee, stage and
configuration logic. It changes neither default thresholds nor acceptance sample counts.

## Recovery boundary

The recovery path is deliberately narrow. It runs only when both endpoints and their difference are finite,
the cumulative columns remain nondecreasing, and floating-point scale shows that subtraction can obscure the
selected window. It then reconstructs that exact `[a,b)` window from its original unit returns. Missing or
nonfinite raw returns produce an unknown result. Corrupt/overflowed cumulative evidence remains unknown even if
apparently usable raw rows exist.

Pre-upgrade records without raw unit returns therefore do not gain invented evidence. Their cancellation-prone
window fails closed and must be re-evaluated from original settled returns or explicitly retired. Ordinary current
records already retain their immutable return columns; this source correction does not rewrite historical rows,
losses, settings, thresholds or cached market outcomes.

## Verification

The first complete Core run exposed two existing fail-closed regressions: malformed/overflowed prefixes were being
rescanned. That failed run is retained as evidence: 4,961 tests, 4,956 pass, 2 fail, 3 explicit skips. The recovery
boundary was tightened; the two failing suites plus the new systemwide cases then passed 38/38.

The final publication requires and records:

- complete offline Core inventory: 4,961 tests / 4,958 pass / 0 fail / 3 explicit skips;
- TypeScript typecheck;
- development application and core-worker build;
- exact-head required GitHub checks before merge.

These tests are deterministic source/fixture checks. They are not market observations, venue fills or proof of a
positive PF.

## Operational limits

No x01 or x02 request was made. No order, position, account, deployment, running service, PF gate or stored loss was
changed. No current writer lease or own-exposure snapshot was needed because this change does not start a funded
session. The historical A-O figures and failures remain historical and unchanged. Fresh twelve-symbol forward and
Sim/Venue acceptance, sufficient independent samples and positive execution PF remain open; profitability is not
guaranteed.
