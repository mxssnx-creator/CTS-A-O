# Live coordination "all configs independent" (saved 2026-10-02)

The settings the CTS-A-O live desks ran with on 2026-10-02 from about 22:50 UTC, saved for later use. Two parts:

1. **Engine settings.** These are the preset `live-all-independent` (`src/core/presets.live.ts`), offered first in Presets. Apply it from the Presets page or with `rt.applyPreset("live-all-independent")`.
2. **Live part.** A preset never carries the Live stage, so this part lives in this document and in the desk files under `docs/live-coordination/`.

## 1. Engine settings (preset `live-all-independent`)

| Setting | Value |
|---|---|
| Stage gates | Base validation **min PF 1.05** (DDT / DDR gates at their defaults) |
| Indications | **all** (`disabledKinds: []`) |
| Strategy types | normal, trailing, block, block Active, DCA, DCA Active, axis — **all on** |
| Ranges | micro, minimal, short, general, long — **all on** |
| Symbols | **25**, with **XRP-USDT, SOL-USDT, BCH-USDT forced** (`forceSymbols`); the 1 h volatility ranking fills the rest |
| Caps | none: walk-forward `maxPositions` / `maxOpen` / `maxPerSymbol` / `maxPerSide` = 0, signals `maxPositions` / `maxOpen` / `perSymbol` = 0 |
| Coordination between configs | off (`coord.enabled: false`): every config set trades on its own validation |
| Signals | default sources, validated on their own **last 10 closes** (`signalValidLastN: 10`) plus the acceptance gate |

## 2. Live part

| Setting | x01 (real money) | twin (VST x02, demo) |
|---|---|---|
| Control orders | Overall (one position per symbol × direction; `live.laneOrders: false`, the code default since 7 Oct: one stop at the outer stop range and one take-profit beyond the outer target per position, the partials by the system) | Overall |
| Order volume | exchange minimum quantity (`sizing.mode: minQty`, `notionalUsd 1`), max leverage | same |
| `live.maxPositions` | 0 (no limit) | 0 |
| `live.maxNotionalUsd` | 200 | 200 |
| Free-margin floor | 5 USDT (`live.minFreeMargin`) | — |
| Loss limit | 2 USDT own net (`--max-loss 2`: flatten own positions and stop) | — |
| Opening gate | none (`openPaused: false`; coordinator off) | — |
| Readiness | **waived by the operator**: `CTS_CORE_MAINNET_WAIVE_READY=1` on the desk process. The last-N floors stay: 25 at entry, 50 for a seat, 10 for signals | not required |
| Connection binding | `CTS_CORE_PRIMARY_CONN = --conn` (set by the desk script) | same |
| Tag | `CTSV2X_` | `CTSV2T_` |
| Heap | `--max-old-space-size=4096` | same |
| Memory | the memory guard (`CTS_CORE_MEM_SOFT_MB` 2500 / `CTS_CORE_MEM_HARD_MB` 1200) falls back to micro off, then also minimal off, under pressure | same |

**Which files hold what** (`docs/live-coordination/`):
- **Base settings:**
  - `x01.settings.json`: its `openPaused` is superseded by the patch.
  - `twin.settings.json`
- **Patches**, applied at start and whenever they change:
  - `x01.patch.json`
  - `twin.patch.json`: the twin ran with micro off for memory on 2026-10-02.
- **`launch.sh`:** start, or gracefully restart, a desk (`launch.sh twin | x01 | restart <desk>`).
- **`rounds.sh`:** 10-minute monitoring rounds (exchange check per desk, summary line).
- **`cts-a-run.sh`:** the CTS-A x01 session loop (`CTS_A_IO_MS=1500` keeps the shared key under the endpoint limits).

## Run it again

1. Apply the preset on the desk, or start the desk with the saved files.

   ```
   # from a checkout of main, keys in BINGX_API_KEY / BINGX_API_SECRET
   cp docs/live-coordination/x01.settings.json runs/x01/x01.json
   cp docs/live-coordination/x01.patch.json runs/x01/patch.json
   cp docs/live-coordination/twin.settings.json runs/x02/twin.json
   cp docs/live-coordination/twin.patch.json runs/x02/patch.json
   sh docs/live-coordination/launch.sh twin
   sh docs/live-coordination/launch.sh x01
   nohup sh docs/live-coordination/rounds.sh &
   ```

2. Keep x01 and the twin on the same engine settings, so live and twin compare like for like.
3. The readiness waiver applies to x01 only, and only through the environment variable in `launch.sh`.
