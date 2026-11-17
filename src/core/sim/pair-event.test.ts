// One order per pair event: variants of one indicator pair entering the same symbol × side × type in one minute execute
// once (the best ranked); the others stay evaluated and recorded, never funded.
import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward, makeTape, pairEventKey, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import type { StratKind, Trade } from "../domain/types.ts";

const H = 3_600_000, M = 60_000, END = Date.UTC(2026, 9, 16, 12), START = END - 6 * H;
const tape = (ind: string, k: number, kind: StratKind = "normal", minuteShift = 0) => {
  const id = `follow|${ind}|tp${k}|sl1|tr0|h32${kind === "dca" ? "|dca" : ""}`;
  // 12 winning closes before the run, then one entry every 20 minutes (all variants on the same minutes)
  const rows: Trade[] = [
    ...Array.from({ length: 12 }, (_, i) => START - (12 - i) * 20 * M - H),
    ...Array.from({ length: 12 }, (_, i) => START + 20 * M + i * 20 * M + minuteShift * M),
  ].map((entryT) => ({ cfg: id, sym: "A", side: 1, entryT, exitT: entryT + 10 * M, entry: 100, exit: 101,
    r: 0.01 + k * 1e-4, mult: 1, reason: "tp", bars: 1, mfe: 0.02, mae: 0.01, kind }));
  return makeTape(id, "follow", ind, { tp: 0.01, sl: 0.01, trail: 0, hold: 32 }, kind, ["A"], rows, [], []);
};
const options = (over: Partial<WalkForwardOptions> = {}): WalkForwardOptions => {
  const d = { ...defaultWalkForward(DEFAULT_SETTINGS), wideEnabled: true };
  return { ...d, mode: "fixed", seatSet: "validated", preH: 12, longH: 12, simH: 6, stepH: 1, robustFrac: 0, preGate: false,
    normalBaseMinPf: 0, symGate: "off", sideGateN: 0, lastN: 0, validLastN: 12,
    gates: { ...d.gates, minTrades: 9, minPf: 1.05, lastNFloor: 9,
      positionWindows: { base: 12, main: 12, real: 12, entry: 12, maxDrawdownPositions: 12 } },
    toggles: { normal: true, trailing: false, block: false, blockActive: false, dca: true, dcaActive: false, axis: false },
    coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false }, ...over };
};
const u = { bars: [], caches: [], startT: START - 12 * H, endT: END, splitT: START, nowT: END, baseTf: 1 } as never;
const minutes = (trades: Trade[]) => new Set(trades.map((t) => `${t.sym}|${t.side}|${t.kind}|${Math.floor(t.entryT / M)}`));

it("defaults on; the key is pair × symbol × side × type × minute", () => {
  assert.equal(defaultWalkForward(DEFAULT_SETTINGS).onePerPairEvent, true);
  const a = pairEventKey("follow|rsi-14@m5|tp1|sl1", "A", 1, "normal", START + 30_000);
  assert.equal(a, pairEventKey("follow|rsi-14@m5|tp9|sl2|mc", "A", 1, "normal", START + 59_000), "variants share it");
  assert.notEqual(a, pairEventKey("follow|rsi-14@m5|tp1|sl1", "A", -1, "normal", START), "side");
  assert.notEqual(a, pairEventKey("follow|rsi-14@m5|tp1|sl1", "A", 1, "dca", START), "type");
  assert.notEqual(a, pairEventKey("follow|ema-9@m5|tp1|sl1", "A", 1, "normal", START), "pair");
  assert.notEqual(a, pairEventKey("follow|rsi-14@m5|tp1|sl1", "A", 1, "normal", START + M), "minute");
});

it("50 variants of one pair entering together execute once per event; off, all of them", () => {
  const tapes = Array.from({ length: 50 }, (_, k) => tape("rsi-mom-14-20@m1", k + 1));
  const on = walkForward(u, tapes, options());
  assert.ok(on.trades.length > 0);
  assert.equal(on.trades.length, minutes(on.trades).size, "one funded order per pair event");
  const off = walkForward(u, tapes, options({ onePerPairEvent: false }));
  assert.equal(off.trades.length, 50 * minutes(off.trades).size, "without the rule every variant enters");
  assert.deepEqual(minutes(on.trades), minutes(off.trades), "the same events trade");
  // the skipped variants are still candidates in the feed (evaluated, recorded on their own lanes)
  assert.ok(on.feed.length >= off.trades.length, "every variant's candidate is recorded");
});

it("another type, another pair and a later minute are separate events", () => {
  const tapes = [tape("rsi-mom-14-20@m1", 1), tape("rsi-mom-14-20@m1", 2), tape("rsi-mom-14-20@m1", 3, "dca"),
    tape("ema-9-21@m1", 4), tape("rsi-mom-14-20@m1", 5, "normal", 1)];
  const sim = walkForward(u, tapes, options());
  const per = (pred: (t: Trade) => boolean) => sim.trades.filter(pred).length;
  const n = minutes(sim.trades.filter((t) => t.cfg.includes("rsi") && t.kind === "normal" && !t.cfg.includes("tp5"))).size;
  assert.ok(n > 0);
  assert.equal(per((t) => t.cfg.includes("rsi") && t.kind === "normal" && !t.cfg.includes("tp5")), n, "tp1/tp2 share events");
  assert.ok(per((t) => t.kind === "dca") > 0, "the DCA variant is its own lane");
  assert.ok(per((t) => t.cfg.includes("ema-9-21")) > 0, "another pair is its own event");
  assert.ok(per((t) => t.cfg.includes("tp5")) > 0, "a minute later is another event");
});

it("paper applies the same rule: a second variant of the pair in the same minute is held back, another minute is not", async () => {
  const { CoreRuntime } = await import("../server/runtime.server.ts");
  const { CoreDb } = await import("../server/db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 } as never, { market: "synthetic" });
  try {
    rt.stop();
    rt.wf = { ...rt.wf, onePerPairEvent: true, guardPct: 0, coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false } };
    const held = (op: object, open: object[]) =>
      (rt as unknown as { entryHeldBack: (...a: unknown[]) => string | null }).entryHeldBack(op, new Map(), open, new Map(), null, []);
    const t = START + 20 * M;
    const first = { cfg: "follow|rsi-14@m5|tp1|sl1", sym: "A", side: 1, entryT: t, kind: "normal" };
    assert.equal(held({ ...first, cfg: "follow|rsi-14@m5|tp2|sl1" }, [first]), "pairEvent");
    assert.notEqual(held({ ...first, cfg: "follow|rsi-14@m5|tp2|sl1", entryT: t + M }, [first]), "pairEvent");
    assert.notEqual(held({ ...first, cfg: "follow|rsi-14@m5|tp2|sl1|dca", kind: "dca" }, [first]), "pairEvent");
    assert.notEqual(held({ ...first, side: -1 }, [first]), "pairEvent");
    rt.wf = { ...rt.wf, onePerPairEvent: false };
    assert.notEqual(held({ ...first, cfg: "follow|rsi-14@m5|tp2|sl1" }, [first]), "pairEvent");
  } finally {
    rt.dispose();
  }
});
