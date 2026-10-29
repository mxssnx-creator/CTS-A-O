# Realtime deadline and recovery-count follow-up

The capped kernels alone did not ensure prompt realtime expiry. A held Normal position with a flat price had
no protection-bar wakeup and could wait for a later compute. Three regressions reproduced this: pure flat
quotes, missing-quote recovery, and the actual CoreRuntime tick/persistence path. All failed before repair.

An explicitly capped held position now captures `holdEndT` from its actual entry and effective execution
duration. The private worker and sliced ticker cache the next deadline as well as the next protection bar.
They request its close when due, retaining the observed time/price and `time` reason through paper rebuild
and persisted exact-order hit keys. The existing live control excludes a hit lane. This is a model/control
instruction, **not a venue-fill acknowledgement or a new settled Last-N observation**.

A missing/invalid quote cannot supply a paper close price. A later valid quote uses its later observation time,
never an invented boundary fill. A previously observed TP/SL cannot be overwritten by the deadline. Long and
Short retain exact independent identities. Legacy positions without a captured deadline do not inherit the
current grid's hold; retained known-cap IDs keep their original deadline if the current grid increases it.

PR234's first hosted head `b9c499397d8f62875a975ce48577693223576dae` passed quality, the separate Signal
workflow, three core shards and slow-runtime but failed one configured-count assertion in core shard1.
The new generic held recovery path added one recovery-only cell to the requested Base grid: actual10 vs9.
The count assertion was correct. Recovery-only cells now skip BaseConfigCounter and grid candidate stats;
their exit-only tapes remain present. The existing worker/serialized-tape/cell regression passes, using
288×15minute bars (72h) instead of its former18.75day fixture. No PF threshold was weakened.

After the realtime changes,141focused checks passed in8.462s. A fresh20symbol72h capped audit took0.556s,
sampled heap75.3MiB and maxRSS218.8MiB under256MiB heap cap. All65held orders retained the correct
deadline; the full1,280context results and closed-order checksum remained unchanged. The raw audit includes
neither new stage qualification nor actual venue execution. After the counter fix,169combined focused regressions passed in10.106s; typecheck and full development/core-worker build pass. Complete updated hosted verification is required.

Separate qualified-stage financial evidence is unchanged:8–9Oct2026,20symbolLow-Range step3Micro,
Normal/Trailing,1/5/15m,24h prehistory,oldPF1.1 policy. Base10/4800(0.20833%),historicalPF1.2052314969;
MainPF0.6173282875;positions307/305/2,orders1585/1583/2opened/closed/held;Real0/1585;Active/venuePF
unavailable. These fixes do not demonstrate stable high forwardPF or complete the persistent stage adapter.
