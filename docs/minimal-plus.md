# Minimal plus

Additional range. Off unless `grid.minimalPlus.enabled` is turned on. Stored cells are the only ones built.

Targets are 2× to 5× the position cost (0.20% round trip), in steps of 0.25. Stops are 0.5× to 3× the target, in steps of 0.25. A trailing cell uses a stop of at least 2.5× the target. Indications exercised in the offline test were Trend, Break, and RSI.

It does not run until the switch is on and at least one cell is stored. Each stored config is kept only when its previous closes are at least `lastN` (minimum 50) and both that window and the whole tape clear `minPf` (minimum 1.20, default 1.35). Entry orders use tracking kind `M` (`CTSBV2_M…` on x02).

Test on 2026-09-30, 16 symbols, 8 days, 15-minute bars: no cell cleared a full-sample profit factor of 1.35. The best full sample was about 0.73. The range stays off. Block knobs that improved that losing book are not applied to the live book.
