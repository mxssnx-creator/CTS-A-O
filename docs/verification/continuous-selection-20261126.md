# Continuous configuration selection — 26 November 2026

A full-catalog 12-symbol baseline on commit `00ee949` did not complete: after 165 minutes it reached four of
24 simulated hours, repeatedly selecting and evaluating configuration histories. Peak child RSS was 5,635,020 KiB;
no memory-guard abort was reported. The incomplete run cannot supply hourly results or execution PF.

For the ordinary independent-config seat policy, a close-time index already identifies which exact tapes have a
newly settled close. The minute selector now keeps the passing candidates for the current hour and recomputes only
those changed tapes, including previously failing ones that may newly qualify. It rebuilds the same score ordering,
seat limits and range/lane allocation with original tape order for ties. Hourly validation still scans its full
published cohort. Other seat modes, optional ladder/base comparison, duplicate tape identities, and a foreign,
reordered or incomplete event index use the prior full selector. No gate, close, loss, configuration or candidate is
removed to obtain the speedup.

The selector's ordered picks and eligible counts match a fresh full scan at each causal clock across config, context,
auto and combined scopes, 0/3/9 portfolio limits and two ranking policies. Complete two-hour walk-forward results
also match the full-scan fallback with and without owned-stage progression, and with unlimited and capped seats.
Separate four-hour comparisons include Signals, duplicate IDs, foreign/reordered event indexes, pair mode and the
ladder fallback; each source pair returned an identical complete-result SHA-256. These are correctness fixtures,
not evidence of profitable trading.

On one synthetic 20,000-tape, 50-decision fixture with 400 initially qualifying configurations and 960 dirty tape
updates, the complete scan took 929 ms and the incremental path 71 ms, with identical result SHA-256
`97f652280e88f3c58d1e87407945d7d900f7315a50dc0b8376647073fcc2ec00`. Peak RSS was 344,152 versus 273,196 KiB;
retained-heap change after the measured period was +14,133,960 versus −27,920 bytes. This is one synthetic sample,
not a full-session resource guarantee. `scripts/perf/continuous-selection-bench.mjs` reproduces it;
`continuous-walk-forward-bench.mjs` compares the separate complete-result fixtures.

The event index's weak membership set became a weak tape-to-ordinal map so stable ties do not need an additional
full-catalog index. On a separate 800,000-empty-tape fixture its retained heap delta was 33,584,912 bytes before
and 33,585,408 bytes afterward. The market replay remains necessary to establish whether the complete workload now
finishes and to measure post-Base and funded execution results.
