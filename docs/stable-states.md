# Stable states — reference points to compare against and return to

Each entry is a merged commit on `main` that was measured and fully tested. Later work compares against it; returning
to one is `git checkout <commit>` (or a branch from it). Keep the newest first. A git tag of the same name is the
convenience copy where the remote accepts tags; the commit hash below is the authoritative reference.

## stable-20261117-block-auto — `d9bac347` (main, 17 Nov 2026)

Merges PR #287 (config-wide position windows, speed) and PR #290 (Axis per config; Block relations under the
automatic evaluation per block count).

**What it contains**

| area | state |
|---|---|
| Position windows | each config judged on its own last N closes across symbols and sides (`gates.positionWindows.scope: "config"`); Micro on its own symbol × side lane **and** its config (`"both"`); live promotion always per exact symbol × side (`docs/config-wide-windows.md`) |
| Axis | every Axis config (mode × range × ladder depth) is its own pair event (`wf.pairEventAxisOwn`) and its own live-feedback record |
| Block relations | all 8 on: `config` (config-wide), `lane` (the config's symbol × side), pooled `overall`, `symbol`, `direction`, `indication`, `type`, `range` |
| Block auto | `block.auto` {n 30, min 15, pf 1.1, scope rule}; **x01 (mainnet) asks pf 1.3** (operator, 18 Nov; one-time migration `migrateX01BlockAutoPf`): every relation at every level (block count) raises while the PF of its own newest 30 results is ≥ 1.1; under 15 results its manual switch holds; results are recorded at the level each relation stood at when the position entered, raised or only observed (`sim/block.ts` `BlockAutoEval`) |
| One order per pair event | on (pair × symbol × side × type × minute); Axis and Historic Exit configs are their own event |
| Session sizing | free margin enforced in the sizing replay |
| Tests | full core suite 5,105 / 5,108 pass (3 skipped), 0 fail; the core runner takes two files at a time on hosts with ≥ 12 GiB and 2 CPUs (730 → 560 s) |

**Measured** (recorded BingX feed, 6 symbols, 12 h pre-history / 12 h run, end 2026-11-16 14:00 UTC; 473 orders, unit PF
1.32 in every arm; sized PF / net / max drawdown):

| arm | sized PF | net | max drawdown |
|---|---:|---:|---:|
| **this state (Auto default)** | **1.46** | **+1,844 %** | **1,581** |
| every relation, manual | 1.43 | +1,797 % | 1,664 |
| earlier pooled default | 1.43 | +1,794 % | 1,664 |
| own lane only | 1.31 | +214 % | 292 |
| own config-wide only | 1.21 | +189 % | 373 |

Before the config-wide windows (same window): per symbol × side windows PF 0.56 on 322 orders, $10 → $7.95; config-wide
PF 1.33 on 466 orders, $10 → $13.40 (General 40 @ 2.79, Long 96 @ 1.82).

Longer multi-window checks of this state: see "Multi-window check" below and `docs/positive-coordinations.md`.

**Reproduce**

```bash
MALLOC_ARENA_MAX=2 MALLOC_MMAP_THRESHOLD_=1048576 CTS_CORE_WORKERS=0 CTS_CORE_VARIANTS=1 \
  node --experimental-strip-types --no-warnings --expose-gc scripts/core-session.mjs \
  --feed <recorded-feed.json> --end-at 2026-11-16T14:00:00Z --symbols 6 --pre 12 --run 12 --balance 10 \
  --sizing equityPct --pct 0.02 --leverage 10 --tactics all --signals off \
  --toggles '{"normal":true,"trailing":true,"exit":true,"block":true,"blockActive":false,"dca":true,"dcaActive":false,"axis":true}' \
  --settings '{"relate":{"enabled":true},"focus":[...]}' --wf '{}'
```

Causal variants on the same tapes: `CTS_CORE_VARIANTS_EXTRA='[{"id":"x","patch":{...}}]'` (each prints orders, PF,
per range / type and the `block auto:` per-count verdicts).
