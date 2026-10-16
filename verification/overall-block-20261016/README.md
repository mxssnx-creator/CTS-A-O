# Overall Block verification sources — 16 October 2026

Tested application source: `08cd452e16b37acac9799450066088ebceaa1314`.
The earlier `c7241dde2f610296a7809733f306d6c1a436b1da` snapshot is retained as this commit's parent. All original 17 program/fixture files stay unchanged; this supplement adds the exact final standalone report QA harness and archive orchestration wrapper (19 source files plus this README and source manifest).

All seven offline checks and final report/desktop/mobile QA passed when this supplement was made. The collector had actually started; this source backup does not claim completed archive saving, live execution or financial qualification.

- Report, validator and collector use explicit pinned CLI inputs. The final report orchestration was inline Python; its actual argv/pins/results remain in the source-free run receipt.
- Absolute paths reflect the verification workspace. Review destinations before reuse.
- Historical fixture sources intentionally include failed/intermediate cases, including the superseded invalid range-field fixture.
- Final report QA uses the repository's existing offline transport guard; do not drop that guard when reproducing it.
- Current operational requirements and final evidence identities are recorded in the release branch's AGENTS.project.md and operations handoff.
- The source manifest records original paths, exact bytes and SHA-256 for all preserved programs.

No credentials, account records, private SQLite state or browser screenshots are included. This separate backup tree/ref does not alter the tested release HEAD, working source or default Git index. Source bodies stay in Git and outside the public evidence archive.
