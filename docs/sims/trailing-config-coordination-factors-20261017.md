# Coordination-factor report correction — 2026-10-17

This file replaces the earlier draft report. Its prior Stable-02 factor sweep referred to an independent `s2VolumeFactor`, but “Stable-02” is a branch name, not a coordination volume control. The setting, its UI control, and its simulated application were removed. Do not use the earlier 1.0× / 1.4× / 1.6× comparison as configuration or profitability evidence.

Existing S2 relation sizing remains controlled by `s2Increase` and its existing 1.8× relation ceiling. The negative-hour Signal hedge retains its own independent volume factor, neutral by default. Engine protect ranges and Signal short/medium ranges use their own neutral-by-default 0.2–5× factors.

For corrected balance-based sizing and cap results, see [Balance sizing and cap replay](trailing-balance-sizing-cap-replay-20261017.md). The two cached windows are retrospective, use the same eight-symbol feed, and do not demonstrate positive results in every hour or durable live performance.
