# x02 (BingX VST demo) — notes for the later coordination of settings, limits, minimums and success

Desk: `docs/live-coordination/start-x02-vst.sh [symbols] [heap-mb]`, conn `bingx-vst-02` (demo money), tag `CTSV2X_`, folder `runs/x02`,
settings `docs/live-coordination/x02.settings.json` + patch `x02.patch.json`. Started 21 Oct 00:09Z with ALL indications (`disabledKinds: []`)
and ALL strategy types: Normal, Trailing, Block (Block Active OFF — a positive coordination: with it on only Block-raised entries open),
DCA, DCA Active, Axis, Signals; ranges Micro, Minimal, Short, General, Long, Wide (targets 3–8 %, stop and trail <= 3 %).
Host shared with the live x01 desk: heap 3072 MB, 12 symbols, `CTS_CORE_WORKERS=1`, the launcher refuses below 6 GB available.

## Settings / limits to coordinate with x01 (fill in while monitoring)
- Position sizing (x01: positionSize min, ratio 1; budgets off for the 0.11 USDT wallet). x02: sizing minQty, leverage max.
- Minimums: venue minimum order amount per symbol; the min amount moves with price (retries at +0.03 % steps seen on x01).
- Success criteria per type and range: PF >= range minimum (Micro 1.05, Minimal 1.1, Short 1.15, General 1.2, Long 1.18), orders per hour, system vs exchange diff.

## Findings log
- 21 Oct 00:09Z: first start had Block Active on (copied from the old twin settings) -> corrected before any result.

## 21 Oct 01:00Z — "too few positions open" (demo only, operator-approved)
Finding: 4 of 12 symbols had paper positions; `exec:symPf` (466 skips), inactive Signals (951) and `live.maxChase` (DOOD short) held the rest back. DOOD long: "size rounds to zero".
Patch: `wf.symGate: "off"`, `live.maxChase: 5` (x02 only; x01 patches untouched).
