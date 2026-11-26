# Summary-only modeled parent memory — 26 November 2026

The full-catalog replay builds many independent owned-stage histories. In a
summary-only modeled replay, every closed parent previously repeated its full
configuration, symbol and side inside its parent ID, even though those values
are already part of the containing set identity. The same onset can only be
admitted once within that exact set identity.

Summary-only modeled parents now use the onset timestamp as their internal ID;
the full set identity still includes the configuration, indication, symbol,
side, policy and economic revision. Duplicate checks and settlements remain
scoped by that identity. Replays configured for full detail keep their original
parent IDs, and native paper and venue ownership are unchanged. Summary-only
reports still omit the modeled checkpoint and are not evidence of paper or
exchange ownership.

In one deterministic synthetic fixture of 30,000 sets and 180,000 closes,
retained JavaScript heap after collection decreased from 66.8 to 53.0 MiB;
peak process RSS was 352.3 versus 304.5 MiB. Runtime was 3,865 versus 2,951 ms.
The aggregate stage report was byte-identical (SHA-256
`389fe8fadcd4108a0e43f647a8e1e8e039c411ae91c1baaa7d35774178b9a0e2`).
An additional four-hour synthetic replay returned identical trades, skips,
stage coverage and complete summary-result hash. These are isolated fixtures,
not a completed full-catalog market replay or a guarantee of a memory limit.
