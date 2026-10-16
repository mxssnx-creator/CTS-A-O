# Overall Block verification sources — 16 October 2026

Tested application source: `08cd452e16b37acac9799450066088ebceaa1314`. This backup preserves the helper programs and exact historical preset-invalidation fixtures. The final regular suite was running when this snapshot was made; report generation remained pending.

- The report, validator and collector use explicit CLI inputs and record source hashes.
- Run-specific absolute paths reflect the workspace used for these checks. Review destinations before reuse.
- The baseline directory intentionally preserves failed and intermediate fixtures, including the superseded invalid range-field fixture.
- Source history and current operational requirements are recorded in `AGENTS.project.md`, `docs/work-tasks.md` and `docs/operations-handoff.md`; their progress backup is `backup/cp10-operations-progress-20261016`.
- The source-manifest records original paths, bytes and SHA-256 for every preserved program.

No credentials, account records, private SQLite state or browser screenshots are included. This backup was created through a separate Git tree/ref while the release branch HEAD and working source remained unchanged.
