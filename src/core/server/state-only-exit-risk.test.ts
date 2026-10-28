import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { flushLiveKv, resetLiveBackoff, stepLive } from "./live.server.ts";
import { ownCoidKind } from "./live.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { mock.timers.reset(); resetLiveBackoff(); });

for (const side of [1, -1] as const) test(`state-only restart cannot prove old aggregate stop safety, side ${side}`, async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const dir = mkdtempSync(join(tmpdir(), "cts-state-only-")), statePath = join(dir, "state.json"), dbs: CoreDb[] = [];
  t.after(() => { for (const db of dbs) try { db.db.close(); } catch { /* already closed */ }
    rmSync(dir, { recursive: true, force: true }); });
  const make = () => {
    const db = new CoreDb(":memory:", { statePath }); dbs.push(db); // no snapshot or journal configured
    const { rt } = fakeRt(db);
    Object.assign(rt.settings.live, { laneOrders: true, positionMode: "hedge", foreignSides: "independent",
      notionalUsd: 10, rebalancePct: 0, maxPositions: 0, maxNotionalUsd: 0, maxChase: 0 });
    return rt;
  };
  let rt = make();
  const ex = new SimExchange(), sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  const paper = { ...lane(`follow|sig-ema-cross-s@m15|state-only-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
  rt.paper.positions = [paper];
  const step = () => { mock.timers.tick(20_000); return stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex); };
  await step(); await step();
  const original = ex.positions.get(key)!;
  ex.foreignFill(key, 10); await step(); await step();
  const aggregate = ex.orders.find((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S");
  assert.ok(aggregate && aggregate.qty && Math.abs(aggregate.qty - original) < 1e-9);
  const partial = +(original / 2).toFixed(6);
  ex.positions.set(key, +(10 + original - partial).toFixed(6));
  flushLiveKv(rt.db); assert.equal(rt.db.flushState(), true); rt.db.db.close();
  rt = make(); rt.paper.positions = [paper];
  assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders")!.n, 0,
    "state.json alone contains neither execution journal nor submission-order proof");
  assert.equal(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_submission_sequence")!.n, 0);
  const markets = ex.log.filter((x) => x.type === "MARKET").length;
  await step();
  assert.equal(ex.log.filter((x) => x.type === "MARKET").length, markets, "unknown ownership does not authorize a market action");
  assert.ok(ex.orders.some((o) => o.id === aggregate.id), "the old, unproven stop cannot be safely canceled by inference");
  ex.triggerOrder(aggregate.id);
  assert.ok((ex.positions.get(key) ?? 0) < 10, "a still-live oversized order can consume foreign quantity before reconciliation");
});
