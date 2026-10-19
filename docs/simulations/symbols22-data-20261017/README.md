# Frozen 22-symbol public candle acquisition

The source archive is complete and validated; no strategy calculation or scoring was performed. It covers 397 hours from 2026-10-01 08:00 through 2026-10-17 21:00 UTC, with 23,820 completed 1m candles and 397 aligned 1h candles per symbol. All 22 symbols have no gaps, duplicates, malformed prices, negative volume or future candles. The physical archive is separate from each replay's performance window.

The original frozen acquisition failed because BingX returned 109425 for `TON-USDT`. Its protocol, failure, and request log are preserved in `prior-attempt/`. An unsigned public contracts GET confirmed that `TON-USDT` is absent. `ETC-USDT` was declared as the predetermined fallback before acquiring or scoring its candles, then verified active with a launch timestamp before the archive starts. It occupies the original position 18; no other universe member or order changed. The source protocol embeds the exact verified contract metadata and records the metadata response hash.

The intended primary plan uses a fixed first-20-symbol development replay on 15 October 21:00–16 October 21:00 UTC, then a separate 22-symbol validation replay on 16 October 21:00–17 October 21:00 UTC. Each has 24 hours of immediately preceding evaluated prehistory, with older candles only for 205 hours of indicator warmup. Actual replay formulas, settings, costs, rules and exact boundaries must be frozen separately before their score. The acquisition archive contains extra older history to reuse the original downloaded pages; its 397-hour length does not expand a PF sample.

| Source | Symbols | 1m candles | 1h candles | Bytes | SHA-256 |
|---|---:|---:|---:|---:|---|
| `feed.json` |22|524,040|8,734|39,528,851|`02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e`|
| `feed-20.json` |20|476,400|7,940|36,061,725|`29ae398ddf0df617dcfaa2933e42d0180f2c3d804d6bb2fa43af1d80351ac1e1`|

Raw candles are retained under `runs/symbols22-397h-corrected-20261017/` and excluded from Git. The tracked market manifest records every one of 374 public page hashes. It contains 289 validated copied pages from the 17 completed symbols in the failed attempt and 85 newly downloaded pages. The 88 new OHLCV requests include three preserved BingX 100410 rate-limit failures, each resolved within the frozen three-attempt retry policy. Contracts metadata was acquired separately. Requests contain no credentials, authentication headers, signature, account API, runtime or order API.

Reproduce from the original failed public cache:

```sh
node scripts/core-22-symbol-data.mjs runs/symbols22-397h-corrected-20261017 --reuse-dir /workspace/scratch/7b916fb11a8d/cts-ao/runs/symbols22-24h-20261017
```

The output directory is sealed to the matching frozen acquisition protocol; changing the source universe or archive window requires a preserved new protocol. The exact prior cache path is evidence from this workspace, not a required production path. The script can acquire the same archive without `--reuse-dir` into a new directory.

Validation: six data tests pass, covering unsigned public route restrictions, rejected HTTP replies, availability-only universe correction, launch provenance, complete reverse-ordered public pages, gaps/duplicates/invalid values, and aligned 60-minute aggregation. ESLint on both data files passes with zero errors and warnings. A separate verifier recomputed every feed/page/source/protocol hash, exact timestamps, complete symbol lists, finite OHLCV bounds and fixed first-20 membership. No replay result, PF, order count or live execution is established by this data acquisition.

Protocol SHA-256: `07a9fbb84612c2789e51f7dc24a62fcc5fa51da869d9b6daa79d4f4e85e178a1`. Market-manifest SHA-256: `05e03f8d119e43e460fede8b4174e631d466b4ac3042cbf6499daca09d7f6fdf`.
