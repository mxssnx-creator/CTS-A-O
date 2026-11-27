# Entry-key lifetime — 26 November 2026

The completed focused 12-symbol, 24-hour replay at `2160424` produced no funded trades. Its modeled
processed-stage skips included 1,749,972 insufficient-validation, 1,086 failed-validation, and 499
insufficient-Real candidate events; these are repeated events, not unique sets. The run's peak child
RSS was 7,003,952 KiB and it took 1,110.11 seconds. Its historical configuration PF cannot be used as
funded execution PF. It covers three focused ordinary indication pairs plus automatic Micro and one
Signal source, not the full strategy catalog.

The replay previously retained keys for every already processed entry throughout the run. Entries are
consumed in timestamp order, so an exact duplicate or exact-time crowd key is needed only until that
entry time changes. A pair-event key remains needed until the UTC minute changes, including across a
batch boundary falling within that minute. Open position counts, actual orders, processing histories,
qualification gates, loss samples and result reporting are not cleared by this change.

In a synthetic four-hour comparison with 80 independent configs and 160,000 admitted, losing
post-Base modeled closes, retained heap above the fixture after the fourth hour fell from 75.90 MiB to
2.46 MiB. Timings were 6,421 ms and 6,038 ms in this single local run. Both paths produced the same
complete-result SHA-256 `1051af7f26f05bb6aba7648e8e6b80becbb6d31360678f68c441843ed9ef541a`,
160,000 post-Base closes, no funded trades, and identical skip counts. The benchmark is reproducible
with `scripts/perf/entry-key-lifetime.mjs`; it does not predict full-session peak RSS or market PF.
An integration test covers an exact duplicate and a same-minute pair event across a :30 batch boundary.

Session dumps now retain the modeled owned-stage Validation and Real coverage aggregates at the end of a
run without copying their full per-set checkpoint into the report. HTML and Markdown identify the hourly
raw-tape checks as a different historical cohort whenever modeled owned stages are enabled. Archived runs
without the aggregate say it is unavailable. These end-of-run aggregates are not hourly owned-stage
snapshots, and neither cohort is a funded execution result.
