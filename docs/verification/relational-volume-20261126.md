# Frozen relational-volume calculation — 26 November 2026

Each simulation candidate previously normalized the same relational-volume settings again, allocating and
validating a new policy for every entry. A walk-forward now normalizes a copy once for its immutable run.
Neutral or disabled policies return factor 1 without building a per-entry context; weighted policies use
the same normalized key matching, duplicate suppression, multiplication order and cap. Later runs read
new settings; held quantities, unit returns, costs, gates and live/paper evaluation are unchanged.

For 200,000 synthetic factor evaluations, the neutral policy returned the same SHA-256
`d21fc09e8835ebd41dd9b9114d0bf9068e994db388c6b3b9768887218e612ac0` and took 963 ms versus 93 ms;
the weighted policy returned the same SHA-256
`505d83ac0f5578df3bb7a82f67c2435832d460bc1a4bf03a454d9729a327e182` and took 1,581 ms versus 159 ms.
These are single local microbenchmarks under concurrent load, not full-session speed guarantees.
`scripts/perf/relational-volume-bench.mjs` reproduces both. Complete four-hour walk-forward results with
weighted volume were identical: 7,008 trades and SHA-256
`3a20e47edc1995ac6abf8123de1537c36a46e0e3ba37a20982d33ec4977bf83c`; the owned-stage weighted fixture
also matched, with 1,120 trades and SHA-256
`ce64d5bc116166a58a9c574947415c7a6ba478042e03828fefca07c8a007dc78`.

A separate focused 12-symbol replay at `92b9f07`, with 24 hours of evaluated prehistory and 24 hours
of trading, completed in 680.07 seconds with 77/77 report checks and peak child RSS 3,619,916 KiB.
It used three focused ordinary pairs plus automatic Micro and one Signal source, not the full catalog.
At the end 697 of 2,985,432 independent modeled contexts qualified at Validation (0.02335%, finite
passing-window mean PF 2.0728); no context qualified at Real and no funded orders opened, so funded
execution PF was unavailable. This result precedes the volume optimization and is not a profitability
claim. The new full-catalog and focused replays are needed to measure the latest code.
