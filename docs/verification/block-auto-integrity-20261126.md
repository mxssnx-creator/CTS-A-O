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
