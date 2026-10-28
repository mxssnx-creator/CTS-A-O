import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { configId } from "../pipeline/pipeline.ts";
import { signalSettings, sigActiveKey } from "../signals.ts";
import { defaultWalkForward, makeTape, walkForward } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

test("pending Signal entries keep their own cap when a Signal-sourced Exit is held", () => {
  const H = 3_600_000, t = Math.floor(Date.now() / H) * H, sym = "AAA-USDT", ind = "sig-ema-cross-s@m1";
  const protect = { tp: .01, sl: .01, trail: 0, hold: 4 };
  const cfg = configId("follow", ind, protect);
  const exit = configId("exit", ind, { ...protect, exitType: "historic", exitSet: "static-sl", exitSide: 1 });
  const otherSignal = configId("revert", ind, protect);
  const db = new CoreDb(":memory:");
  const rt = new CoreRuntime(db, { live: { liveLastN: 0 } }, { market: "synthetic", replay: true, priceStream: null });
  rt.stop();
  try {
    const base = defaultWalkForward(DEFAULT_SETTINGS);
    rt.wf = { ...base, lastN: 0, validLastN: 0, signalValidLastN: 0, signalGuardN: 0,
      signalPerSymbol: 1, signalMaxPositions: 1, rangeGate: undefined, symGate: "off",
      gates: { ...base.gates, minTrades: 12, maxDdr: 0, maxDdtH: 1000 },
      toggles: { ...base.toggles, block: false, normal: true },
      signalRank: signalSettings({ enabled: true, validate: false, count: 0 }),
      signalActive: new Set([sigActiveKey("follow", ind, sym, 1, "normal", cfg)]),
      coord: { enabled: false, confirm: false, conflict: false, hourLock: 0, cooldown: "off" } };
    const rows: Trade[] = Array.from({ length: 30 }, (_, i) => ({ cfg, sym, side: 1,
      entryT: t - (40 - i) * H, exitT: t - (40 - i) * H + 60_000, entry: 100, exit: 102,
      r: .02, mult: 1, reason: "tp", bars: 1, mfe: 0, mae: 0, kind: "normal" }));
    rt.tapes = [makeTape(cfg, "follow", ind, protect, "normal", [sym], rows, [], [{ sym, side: 1 }])];
    const u = { bars: [], caches: [], startT: t - 200 * H, endT: t, splitT: t - 200 * H, nowT: t, baseTf: 1 } as never;
    rt.sim = walkForward(u, [], { ...rt.wf, simH: 24 });
    rt.paper.selected = [cfg];
    const held: OpenPosition = { cfg: exit, sym, side: 1, entryI: 0, entryT: t - H, entry: 100,
      stop: 99, target: 101, peak: 100, trailOn: false, mtm: 0 };
    rt.paper.positions = [{ ...held, vol: 1, level: 0 }];
    rt.status.lastBarT = t - 60_000;
    const inner = rt as unknown as { candles: Map<string, { lastT(): number }>;
      livePromotionGate(): { ok: boolean }; coordOf(): null };
    inner.candles = new Map([[sym, { lastT: () => t - 60_000 }]]);
    inner.livePromotionGate = () => ({ ok: true });
    inner.coordOf = () => null;
    assert.deepEqual(rt.pendingEntries().map((x) => x.cfg), [cfg], JSON.stringify(rt.status.paperSkips));
    rt.paper.positions = [{ ...held, cfg: otherSignal, vol: 1, level: 0 }];
    assert.equal(rt.pendingEntries().length, 0, "an ordinary Signal still consumes ordinary Signal capacity");
  } finally { rt.dispose(); db.db.close(); }
});
