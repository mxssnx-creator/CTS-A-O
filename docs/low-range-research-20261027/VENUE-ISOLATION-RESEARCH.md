# Venue isolation research — 27 October 2026

The current integration uses a netted symbol/side and cannot assume that two
conditional orders are atomic. Its one-parent admission fence reduces new
collisions; it does not make existing shared positions independently
closeable or guarantee uninterrupted protection during cancellation.

BingX's own descriptions identify two potential venue-level alternatives:

- [Separate Isolated](https://bingx.com/en/support/articles/11676733405711),
  announced in January 2025, creates separately managed positions with
  separately allocated margin. BingX states that it is unavailable in
  multi-asset and one-way modes, and requires single-asset hedge mode.
- [Separate Cross](https://bingx.com/en/support/articles/17550887825935),
  announced in September 2026, also describes independently managed positions
  by order. Unlike separate isolated, positions sharing a margin asset share
  collateral and liquidation may affect all of those positions. BingX says the
  mode is unavailable in multi-asset and one-way modes and imposes copy-trading
  restrictions.

Those articles describe platform behavior, not a verified guarantee for this
adapter. Before either can be used, establish from the current API contract and
venue test environment how an entry receipt maps to the exact position ID,
how partial fills and restarts preserve that mapping, how position-specific TP,
SL and trailing orders are submitted and canceled, and what occurs when two
exits trigger or cancellation races a fill. Confirm account eligibility,
margin and liquidation behavior, error handling, and migration of existing
positions. The [API documentation](https://bingx-api.github.io/docs/) and
[endpoint/rate-limit announcement](https://bingx.com/en/support/articles/31103871611289)
list relevant endpoints, but their existence alone does not prove those
semantics. The rate-limit announcement also lists cancel/replace; do not infer
rollback or an atomic bracket guarantee from the endpoint name.

No account mode was changed, no venue orders were submitted, and these modes
are not enabled by this research. Live releases remain blocked on verified
execution semantics and unresolved regression failures, not on an assumption
that the new modes automatically solve them.
