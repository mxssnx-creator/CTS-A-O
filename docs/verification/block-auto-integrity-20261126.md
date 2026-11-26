# Block Auto independence and return integrity — 26 November 2026

Starting from Stable-04 `8c0823eb68ca64a0d9090ffa79faf395b1a8ce20`, the shipped Block Auto defaults used a
minimum of 15 closes and pooled verdicts by relation. Fresh defaults now require 30 closes and judge each
relation key and count independently. The manual relation switch continues to apply while an otherwise valid
sample is insufficient; explicitly configured windows and pooled scope remain available. Existing saved or
custom settings are not rewritten, so an existing profile with different values must be reviewed separately.

An unknown result or an overflow in gross sums or their ratio no longer becomes a positive no-loss score.
Those cases return unavailable PF and cannot authorize the automatic raise, including below the sample minimum.
Empty, flat, unknown, overflow, measured and no-loss records retain distinct states. True no-loss remains a
separately identified convention, not a finite measured ratio. Candidate counts keep only their newest N
returns in bounded circular windows, preserving their chronological order and independent decisions.

The tests exercise independent config/count decisions, exact 30-sample readiness, loss and no-loss outcomes,
unknown/overflow fail-closed behavior and recovery after the unknown result leaves the window. The historical
scope and explicitly configured manual fallback have separate regressions. These checks are mechanical evidence,
not proof of profitable trading. No exchange orders or live engine changes are part of this verification.

One synthetic allocation comparison with 20,000 independent keys and 100 results per key retained
24,761,080 bytes with the former batch-trimmed arrays and 10,134,168 bytes with bounded windows. The
20,000 final decisions had identical SHA-256 digests. It is a targeted heap measurement, not a full-engine
performance or profitability result.

The prior 12-symbol 24h-prehistory plus 24h-trading replay did not finish. New post-Base validation counts,
return PF and settled execution PF remain unavailable until a complete replay is inspected.

Further review found that the production `BlockBook` discarded accepted closes with an unknown return before
they reached the Auto window; those closes now occupy their chronological sample and prevent a raise. With
automatic window selection enabled, the parent Auto book also now learns accepted closes when recovery holding
is disabled. Candidate windows share their identical close/time histories while retaining independent pause
state; unstamped candidate decisions are captured before the new close is appended. Each candidate's unused
duplicate per-count Auto book is omitted. A 16-scenario finite-return trace matched the prior implementation.
In one synthetic 2,500-config, 40-close comparison, retained heap fell from 31,787,808 to 11,122,208 bytes;
the sampled decision checksum was identical. Automatic window scoring now avoids copying every tail and rejects
an overflowing PF ratio instead of treating it as a true no-loss result.
The follow-up passed 213 focused Block, Axis, processed-admission, tactics and memory tests, TypeScript, and the
development/core-worker build.

An offline 12-symbol replay using `aa1ee32c2cb56ffb1f84bd89ae819ea1f4252980` and feed SHA-256
`e99c7a7b808752717a6443cd09a498238c0836ff6eca7366ac04aaba3d74fadc` ran 24h evaluated prehistory and
24h trading with a separate seven-day cadence warmup. It completed Base and Signal history, but the host
memory guard stopped it at 24% of strategy tapes after 550 seconds when host availability fell to 1,147 MiB
against a 1,200 MiB reserve. Peak child RSS was 2,007,324 KiB. The incomplete fallback was refused; no
hourly, post-Base validation or funded-execution results were produced. This run predates the further fixes.

The first isolated GitHub replay (`45816167296`, source `4d8380e9fc267f2245ed3c339bb12cbc4c81345a`)
does not upload the raw dump's sibling `session-*` directories. Its raw dump therefore cannot be treated as
complete independent trade evidence, even if the run itself succeeds. The workflow now includes those
sidecars and supersedes an older run of this frozen protocol when its source changes. The report has its own
separate sidecars and is preserved independently.

Further review found the automatic count selector ignored both its `windowIndependent` switch and the configured
`windowMinSamples`: all relations used a shared winner and the minimum was hard-coded to 30. Fresh defaults now
enable automatic, independently selected windows. Each source key and candidate count has its own bounded
last-N observations, and a selection needs the configured minimum (at least 30) for every candidate. Config and
lane counts use their own selected window too. Candidate source eligibility and the actual per-count Auto level are
stamped at entry; old shared stamps without independent attribution cannot be reused as proof. Unknown outcomes
remain in their own windows and prevent automatic selection; an all-flat 0/0 sample also has unavailable PF.
Excluded Block types and ranges do not
create hypothetical source evidence. Existing explicit settings can still select the shared or fixed policy.

The legacy shared selector matched its prior 16-scenario trace checksum
`1ba1671e365be662b104973fa4b918f9f214d26cb88b07a89d9abfea69a3dbb6`. A separate synthetic run of 8,000
accepted entries across 100 configs retained 2,690,328 bytes before sharing the independent parent's history and
2,173,712 bytes afterwards, with identical sampled decision checksums. This is a scoped heap measurement, not
a whole-engine speed claim. A subsequent Block, position-window, history and processed-stage suite passed 226 tests; the
independent source and settings regressions also cover minimums, causality, unknowns and retained history.
The two GitHub runs started before this independent-window repair and cannot validate its new behavior.

The first GitHub run stopped after 2,680.86 seconds at the 7,500 MiB RSS guard while preparing Real;
its peak child RSS was 7,734,024 KiB. No hourly, post-Base, or settled PF results were produced. Its
launcher set `CTS_CORE_HISTORY_CACHE_MB`, but the history store only read `CTS_HISTORY_CACHE_MB`, so the
intended 32 MiB cache was not applied. The store now accepts both names with the original name taking
precedence, and the replay launcher uses the original name explicitly. The next replay logs heap, external
buffers and RSS while keeping the existing reserve and process guard. A completed run is still needed to
measure the effect on the complete engine. Its compute wait is 165 minutes within the driver's 190-minute
guard, with the same requested market window and no lighter fallback accepted.

Stored-history validation now retains two weak identities per immutable tape instead of six, while still
reading the checksummed arena after eviction and invalidating when the symbol mapping changes. In a synthetic
50,000-tape comparison, validation metadata heap growth was 24,176,344 bytes before and 10,261,392 bytes after,
with identical validity checksums. Eviction, corrupted records and stored-vs-ordinary replay parity passed
focused tests. This is not a full-replay peak-memory measurement.

The failed replay had already retained at least 817,692 strategy tapes and 84,850,303 closes before Real.
Its close-time index built a sorted permutation and then allocated full second copies of both event columns.
The index now applies that same permutation in place and yields during long rearrangements. A synthetic
one-million-event comparison used 27,857,121 bytes of peak array buffers before and 16,000,000 bytes after;
the recorded dirty-tape ordering checksum matched. Randomized tests cover equal timestamps, strict boundaries
and backward clocks. The isolated replay must still measure actual peak RSS and elapsed time.
