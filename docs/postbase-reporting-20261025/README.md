# Mandatory post-Base reporting

The operator requires PF and validated percentage in chat responses and information updates, carried into future CTS-A-O chats through AGENTS.project.md. PF is return-based, neutral at 1. Always include passed/evaluated counts and timestamp/window. Historical validation, funded settled execution, Base acceptance and Last-N readiness have different cohorts; never substitute them.

Current 12-symbol/12h evidence:

| Scope | Historical validation PF | Validated | Subsequent funded settled PF | Positions opened/closed/held | Orders opened/settled/held |
|---|---:|---|---:|---|---|
| Ordinary EMA, run start | 5.619923 | 11.409% (5,091/44,623 evaluated configs) | 1.336606 | 15/4/11 | 7,076/4,882/2,194 |
| Signals, endpoint | 4.608184 | 0.3773% (11,436/3,030,936 exact contexts) | 0.065995 | 4/2/2 | 863/280/583 |

Ordinary total Base-qualified config inventory is 45,063, including 440 disabled-type configs. Its inventory-denominator pass share is 11.2975%; the evaluated-only share above excludes those disabled types. Both use the same 5,091 passing configs. Signal exact-context denominator includes empty/insufficient config × symbol × direction contexts. Any-context configs passing: 7,868/126,289 (6.2301%), a separate statistic; Last-4 readiness is not validation.

Windows are recorded in the original source-frozen evidence under docs/release-20261025. Ordinary start: 2026-10-17 09:00 UTC; Signal endpoint: 2026-10-17 21:00 UTC. Market calculations remain per minute. Broad ordinary workflow 40226266532 is unfinished; its PF and percentage are unavailable. No X02 connection, live orders, gates, costs or economics changed.

core-session Markdown now pairs per-range historical PF with counts/percentages and labels settled execution PF separately. Empty denominators explicitly remain unavailable; Signal active units are not mislabeled as validated contexts. Recovery summaries show audited endpoint and hourly validation PF/percentage, including numerator/denominator, alongside settled PF. All raw JSON and source-frozen economic receipts remain unchanged. This is a report-only change.
