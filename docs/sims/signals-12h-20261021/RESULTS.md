# Signals 12h replay — attempt 05

**Status: incomplete coverage; not a complete evaluation.** Frozen 12-symbol BingX swap data, 20 Oct 2026 12:00 through 21 Oct 00:00 UTC. It includes 24h of evaluated prehistory and 12h of indicator-only warm-up. The full 336h Signal and 168h Exit history gates were retained.

## Processing and result

- Compute: 87,852 ms (101s total session) on two workers. The one-worker compute took 106,512 ms, making this run 17.5% faster at the compute stage.
- Main-process peak RSS: 2279 MB, up 472 MB from the one-worker run. The container cgroup peak observed after this run was 7.58 GB / 8.59 GB (88.3%); it includes reclaimable file cache. No OOM events were recorded.
- Coverage: 570/665 expected Base evaluations; 95 missing. Of 380 configured Signal pairs, 285 reached Base. The other 95 are the 30m lane: 48 hours of feed provides 96 half-hour bars per symbol, below the 120-bar minimum in makeUniverse.
- Signals’ own Signals range evaluated 285 source/range/lane pairs; 3 passed the Base representative gate. It built 145,110 Signal configs; 0 became active, 0 orders opened. All 285 pairs lacked enough historic entries for qualification.
- Strategies Exit used its separate Base path: 285 pairs evaluated, 20 passed and 265 rejected. Its historic fit had 20 pairs below the entry minimum; it built 0 Exit configs.
- Simulated orders: 0 closed and 0 open at end. PF is unavailable because no order closed; the post-compute paper selection was empty.
- Full tape evidence: 418,271 records / 325,911 trade rows; the one- and two-worker tape checksums match exactly.
- Signal history needs 336h of evaluated prehistory; this run had 24h, short by 312h. Exit’s 168h lookback was short by 144h. A complete run for this exact 12h window needs a continuous 15-day 1m feed for these symbols, including the 12h indicator warm-up.
- The refreshed report passed 61/62 consistency checks. Its sole failure is coverage (665 expected, 570 evaluated), explained by the 95 unavailable 30m Signal pairs.

## Timing by phase

| Phase | ms |
|---|---:|
| Signal coordination tapes | 25,569 |
| Simulation | 23,780 |
| Base (workers) | 11,534 |
| Signal history | 10,487 |
| Signal tapes | 5,197 |
| Audit | 446 |
| Paper | 429 |
| Exit history | 154 |
| Persist | 9 |
| Pipeline | 2 |
| Signal status | 1 |
| Persist sim | 1 |
| Adjust | 1 |
| Auto preset | 0 |
| Prehistoric | 0 |

The loop reported p50 20.3 ms, p99 54.1 ms, and max 1020 ms (22 slices over 40 ms; one-worker: 10). The two-worker compute was faster but consumed more memory and had worse tail loop latency; keep the production worker policy unchanged until repeated runs with a full-history feed confirm the trade-off. Persistence took 9 ms and simulation persistence 1 ms.

The raw simulation was frozen under source SHA d8140d72eca7b2d727e8325753ae34af05b0d570cb6b47f8bf4cbbcdfe98e9bc. After the run, only scripts/core-session.mjs changed for report coverage accounting; the core economic calculation source was unchanged. Refreshed report source SHA: a302cc8080fb6fea0830354eab4473efec3cd89161b42fdaa8a404227bad1845.
