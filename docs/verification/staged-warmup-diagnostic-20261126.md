# Exploratory staged warmup diagnostic

The focused offline workflow `stable04-staged-prehistory.yml` tests whether actual
post-Base stage-owned histories can accumulate through an earlier 24 hours before
the target 24-hour window. It uses the same public candle fixture and twelve-symbol
focused cohort as the frozen 24-hour diagnostic, with Base evaluated from
2026-10-13 21:00 UTC to 2026-10-14 21:00 UTC. The engine then runs one continuous
48-hour modeled session, with the last 24 hours as the target window.

This is a diagnostic, not a replacement for correct staged prehistory in the
ordinary session. The first 24 hours are simulated trading, so positions, stage
histories, qualification and account state can carry into the target window. The
account is not reset at its boundary. The fixed symbol cohort was selected as of
the target start and is therefore retrospective for the first 24 hours. The test
does not send exchange orders or demonstrate live performance.

The protocol records the full boundaries, target window, limitations, source
seal, settings, feed hash and memory results. The launcher rejects a mismatch
between its chosen mode and frozen protocol before starting the engine. The
standard 24-hour mode remains unchanged. Neither insufficient samples nor memory
fallback may be treated as a profitable or complete result.
