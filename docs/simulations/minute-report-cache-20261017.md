# Minute report cache verification — 17 October 2026

No engine, trading rerun, renderer or frozen-session guard was invoked. No PF, allocation, strategy or qualification was changed. Source-seal guards were not bypassed or weakened; the new reporter has a new source hash.

## Exact scope

- All immutable order fields and all 22 symbols at every one of 1,440 minutes match legacy lookups using Object.is.
- Start, middle and end actual open-book minute slices match old/new IEEE754 hashes for all three passes (18 slices total).
- Full NEW primary curve, minute-derived hourly fields and account metrics match the actual original report at six decimals.
- Full NEW secondary uncapped six risk metrics match actual recorded total.uncapped. Capped secondary metrics reference primary headline under zero caps; they were not separately recorded.
- Secondary 289-point curve projections match the original PRIMARY recorded curve at six decimals under zero-cap allocation identity. No original secondary curve exists.
- Primary full results were reused only after exact input, helper and extracted-body SHA equality.
- Timing below is NEW only. Slice timings exclude cache preparation and include callback counters. No full old/new or end-to-end speedup is established.

## Verification totals

| Window | Orders checked | Symbol-minute prices | Exact slices | Primary new (s) | Capped secondary new (s) | Uncapped secondary new (s) | Peak child RSS (MiB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| selection22 | 331,856 | 31,680 | 9/9 | 18.815 | 17.225 | 13.292 | 1640.9 |
| final22 | 136,512 | 31,680 | 9/9 | 8.743 | 3.134 | 3.538 | 1139.1 |

## Representative minute microprofile (SLICE)

| Window | Pass | Minute | Open orders | Old ms | Cached ms | Old/new direct prices | Old/new units | Old/new keys |
|---|---|---|---:|---:|---:|---:|---:|---:|
| selection22 | primary | start | 17,057 | 64.907 | 6.838 | 17,057/20 | 34,114/0 | 68,228/0 |
| selection22 | primary | middle | 29,498 | 242.667 | 28.773 | 29,498/22 | 58,996/0 | 117,992/0 |
| selection22 | primary | end | 77,773 | 316.120 | 35.272 | 77,773/22 | 155,546/0 | 311,092/0 |
| selection22 | capped | start | 17,057 | 68.803 | 5.177 | 17,057/20 | 17,057/0 | 34,114/0 |
| selection22 | capped | middle | 29,498 | 98.958 | 19.812 | 29,498/22 | 29,498/0 | 58,996/0 |
| selection22 | capped | end | 77,773 | 160.698 | 21.808 | 77,773/22 | 77,773/0 | 155,546/0 |
| selection22 | uncapped | start | 17,057 | 35.974 | 4.887 | 17,057/20 | 17,057/0 | 34,114/0 |
| selection22 | uncapped | middle | 29,498 | 62.930 | 19.785 | 29,498/22 | 29,498/0 | 58,996/0 |
| selection22 | uncapped | end | 77,773 | 181.862 | 51.522 | 77,773/22 | 77,773/0 | 155,546/0 |
| final22 | primary | start | 3,362 | 11.306 | 2.689 | 3,362/8 | 6,724/0 | 13,448/0 |
| final22 | primary | middle | 3,528 | 11.085 | 5.098 | 3,528/22 | 7,056/0 | 14,112/0 |
| final22 | primary | end | 9,302 | 63.479 | 5.769 | 9,302/22 | 18,604/0 | 37,208/0 |
| final22 | capped | start | 3,362 | 13.774 | 8.210 | 3,362/8 | 3,362/0 | 6,724/0 |
| final22 | capped | middle | 3,528 | 39.970 | 3.086 | 3,528/22 | 3,528/0 | 7,056/0 |
| final22 | capped | end | 9,302 | 14.838 | 7.449 | 9,302/22 | 9,302/0 | 18,604/0 |
| final22 | uncapped | start | 3,362 | 7.681 | 44.950 | 3,362/8 | 3,362/0 | 6,724/0 |
| final22 | uncapped | middle | 3,528 | 9.351 | 2.190 | 3,528/22 | 3,528/0 | 7,056/0 |
| final22 | uncapped | end | 9,302 | 15.513 | 5.251 | 9,302/22 | 9,302/0 | 18,604/0 |

## Source and portability

Public producer baseline: `c62701343668b5b87f2bfd5644eb46ff0f44b4f5`; expected core-session SHA256 `c594126151a399a23c30f42e5435c52252dac762307b32b117f8af2ca16f2014`. This local checkout lacked that Git object and used explicitly labeled local fallback `0297eef541f4ee360e040b55d66786760bab6792` with the identical producer SHA. Both windows source-proof and five imported dependencies match their recorded producer hashes.

On a fresh checkout, fetch the public producer ref if shallow history omits it; alternatively pass `--baseline-file /absolute/core-session.mjs` or `--baseline-ref <reachable-ref>`. The producer SHA must match. Pass `--artifacts /absolute/study-artifacts-root` and `--out /absolute/evidence-directory` as needed. `--reuse-primary` requires prior matching full primary evidence; normal invocation runs it.

## Preserved attempts

`../perf-minute-cache-attempt1-240s/failure.json`: old full-selection profiling exceeded its 240s watchdog. `../perf-minute-cache-attempt2-stopped/stopped-by-steering.json`: authorized 600s retry was stopped by root steering after 41.47s. Neither produced an old full-loop parity result. They are not cache failures.

Full input/header/selected-sidecar manifests, source hashes, IEEE hashes, callback counts, CPU/wall/RSS and risk metrics are in [`minute-report-cache-proof-20261017.json`](minute-report-cache-proof-20261017.json) and the preserved per-window JSON files. Tape/validation chunks remained unopened.
