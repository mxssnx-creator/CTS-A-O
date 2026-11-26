# Modeled predecessor capacity isolation — 26 November 2026

The opt-in processed-stage replay records cold or failed predecessors as modeled
orders so that each exact configuration, symbol and direction can collect its own
settled evidence. They are not Active or funded orders. Previously the replay
put those predecessor positions in the same open-order counts, conflict scan and
entry crowd as Active positions. An unrelated warmup order could therefore block
a fully qualified position, and an Active order could prevent a predecessor from
being sampled.

The replay now keeps independent predecessor and Active open counts and crowds,
and checks conflicts against the same class. Predecessors continue to observe
their own modeled caps and conflicts; Active positions still obey their normal
caps, duplicate and pair-event checks. Both classes still use the same strictly
prior per-set Last-N progression and recorded net returns. This does not seed
stage windows from raw candidates, alter PF floors, or implement historical
processed-stage prehistory.

Synthetic tests reproduce both directions of the collision with a one-order
capacity, including an opposite-side conflict, and verify that Active duplicate
and capacity rules remain enforced. Existing processed lineage, Block, Signal,
coordination and admission tests also pass. A separate four-hour synthetic
fixture with no such collision produced byte-identical modeled results before
and after this change; it is not a market profitability test.
