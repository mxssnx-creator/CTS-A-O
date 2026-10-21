# Inverse — 114 identities, 20 symbols, 20 October 2026

[Detailed offline HTML report](inverse-20-symbol-20261020.html)

All types: raw source PF below 1 is normal; configured PF gates above 1 apply from Base evaluation onward. Validated snapshots contain only sets passing validation/Last-N. Accepted future executions retain every losing close. No gates were weakened.

| Study | Base passed/evaluated | Validated end/built | Settled closes | Return PF | Long/Short | +/0/− hours |
|---|---:|---:|---:|---|---:|---|
| inverse-20-6h-lowmem-final | 74/570 | 8/26384 | 6 | 1.745 | 0/6 | 1/4/1 |
| inverse-20-24h-lowmem-final | 314/570 | 543/99520 | 12544 | 1.034 | 5561/6983 | 13/0/11 |
| inverse-20-long-base336-lowmem-final | 33/570 | 851/14136 | 127 | 20.147 | 2/125 | 4/1/1 |

Retrospective virtual-order evidence from previously examined public history, not funded-account fills or a fresh holdout. Independent config evaluation preserves its configured population; explicit symbol gates remain separate. Source, settings, WF, Last-N counts, endpoint marks, ranges, per-source/per-symbol/per-direction results and runtime/memory are embedded in HTML and compressed evidence. No actual live account or deployment changed. Consistently profitable hourly Long/Short operation is not established.

```json
{
  "memory-final-targeted-fixed": {
    "tests": 5,
    "pass": 5,
    "fail": 0,
    "cancelled": 0,
    "skipped": 0,
    "duration_ms": 2288.761584,
    "completed": true,
    "logSha256": "8736cfb82f49d844f9ac9c298a09d9b0f9bcd6918635ee02bdd7455967e0d336"
  },
  "core-file-coverage": {
    "completed": true,
    "files": 212,
    "expectedFiles": 212,
    "prefixFiles": 123,
    "rerunFiles": 89,
    "classification": "Ordered serial prefix interrupted by execution-environment recovery; suffix rerun in completed chunks. Not one uninterrupted green invocation."
  },
  "core-completed-parts": {
    "completed": true,
    "tests": 823,
    "pass": 821,
    "fail": 0,
    "cancelled": 0,
    "skipped": 2,
    "historicalFailures": 4,
    "resolution": "Two fixtures no longer require an undefined key that JSON persistence correctly omits. Latency thresholds and production code unchanged; original long-run failure retained."
  },
  "core-opt-in-stress": {
    "completed": true,
    "tests": 2,
    "pass": 2,
    "fail": 0,
    "cancelled": 0,
    "rawCounts": {
      "code": 0,
      "tests": 2,
      "pass": 2,
      "fail": 0,
      "cancelled": 0,
      "skipped": 0,
      "duration_ms": 497888.036475
    },
    "scope": "Two selected opt-in cases; other regular runtime cases are separately verified"
  },
  "independent-return-reconciliation": {
    "passed": true,
    "studies": 3
  },
  "typecheck": {
    "passed": true,
    "logSha256": "ae791f9f57ffbb3c0a592b6a34e25250c1f7f6f13fde4d05f77a0d4e7681f89a"
  },
  "lint": {
    "passed": true,
    "logSha256": "cad95a64532e2d7eb06cbed04815c4594db443487c01cad580c0f3179004fa2d"
  },
  "script-lint": {
    "passed": true,
    "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "build": {
    "passed": true,
    "logSha256": "6d7823cc1383a0b9b7c02a1ec00b2c29a4c4327a9a343fb9247628d6ec2954f3"
  },
  "ui": {
    "passed": true,
    "logSha256": "745732a8a15d7a9d98e7149d650e06f6ca8dac9cf2a0a1848fd6d3e32ec5c844",
    "surfaces": [
      {
        "name": "dev",
        "vp": "desktop",
        "errors": [],
        "includeButtonWorks": true,
        "overflow": false
      },
      {
        "name": "dev",
        "vp": "phone",
        "errors": [],
        "includeButtonWorks": true,
        "overflow": false
      },
      {
        "name": "built",
        "vp": "desktop",
        "errors": [],
        "includeButtonWorks": true,
        "overflow": false
      },
      {
        "name": "built",
        "vp": "phone",
        "errors": [],
        "includeButtonWorks": true,
        "overflow": false
      }
    ]
  },
  "report-ui": {
    "passed": true,
    "surfaces": [
      {
        "name": "desktop",
        "studies": 3,
        "svg": 33,
        "noOverflow": true,
        "sourceSearch": true,
        "download": true,
        "orderPagination": true,
        "orderSearch": true,
        "orderDownload": true,
        "errors": []
      },
      {
        "name": "phone",
        "studies": 3,
        "svg": 33,
        "noOverflow": true,
        "sourceSearch": true,
        "download": true,
        "orderPagination": true,
        "orderSearch": true,
        "orderDownload": true,
        "errors": []
      }
    ]
  }
}
```
