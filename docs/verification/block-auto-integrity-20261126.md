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
