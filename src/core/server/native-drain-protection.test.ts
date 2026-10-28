import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_SETTINGS } from "../config.ts";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { authorizeSyntheticLanes, SimExchange, syntheticExecutionRun } from "../test-support.ts";
import type { LiveGate } from "../live-validation.ts";
import { CoreDb } from "./db.server.ts";
import type { LaneOrder } from "./lane-orders.ts";
import { makeCoid, ownCoidKind } from "./live.ts";
import { flushLiveKv, liveKv, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";

type Side = 1 | -1;
type Position = { cfg: string; sym: string; side: Side; entry: number; stop: number; vol: number; entryT: number; target: number };
const near = (x: number, y: number) => Math.abs(x - y) < 0.00025;
const parent = (i: number, side: Side): Position => ({
  cfg: `combo|ema-9-21@m15|parent-${i}`, sym: "S1-USDT", side, entry: 10, vol: 1, entryT: 1000 + i,
  stop: 10 * (1 - side * (i === 1 ? 0.02 : 0.04)), target: 10 * (1 + side * (i === 1 ? 0.05 : 0.06)),
});

function fixture(db = new CoreDb(":memory:")) {
  const prices = [{ sym: "S1-USDT", last: 10 }];
  let positions: Position[] = [];
  const rt = {
    generation: 1,
    db,
    // These tests exercise simulated venue ownership without a durable state file.
    testOnlyAllowMemoryLive: true,
    settings: {
      ...DEFAULT_SETTINGS,
      sizing: { mode: "minQty" as const, pct: 0.02 },
      live: { ...DEFAULT_SETTINGS.live, enabled: true, mode: "overall" as const, positionMode: "hedge" as const,
        notionalUsd: 10, ratio: 1, maxNotionalUsd: 0, maxPositions: 0, rebalancePct: 0, top: 0,
        minFreeMargin: 0, maxPositionX: 0, maxExposureX: 0, maxRiskPct: 0, maxBackstopLossPct: 0,
        maxChase: 0, signalWeight: 1, laneOrders: true },
    },
    sim: syntheticExecutionRun([]),
    livePromotionGate: undefined as ((lane: Pick<Position, "cfg" | "sym" | "side">, at?: number) => LiveGate) | undefined,
    status: { lastBarT: Math.floor(Date.now() / 3_600_000) * 3_600_000 },
    paper: {
      get positions(): Position[] { return positions; },
      set positions(next: Position[]) {
        positions = new Proxy(next, { set(target, property, value) {
          const changed = Reflect.set(target, property, value);
          if (property !== "length") authorizeSyntheticLanes(rt, target);
          return changed;
        } });
        authorizeSyntheticLanes(rt, positions);
      },
    },
    tickersAt: 0,
    freshTickers: async () => { rt.tickersAt = Date.now(); return prices; },
  };
  const ex = new SimExchange(undefined, { oneStopPerSide: true });
  const step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
  return { rt, ex, step };
}

/** Recreate a durable legacy snapshot; current admission correctly fences two new parents on one netted side. */
async function seedLegacy(rt: ReturnType<typeof fixture>["rt"], ex: SimExchange, positions: Position[]) {
  // Bind the simulated account before seeding legacy records, without priming the live-KV cache.
  rt.db.kvSet("liveOwnershipAccount", { version: 1, fingerprint: createHash("sha256")
    .update(rt.settings.live.connId).update("\0").update(ex.fingerprint()).digest("hex") });
  rt.paper.positions = positions;
  const laneMap: Record<string, LaneOrder> = {};
  const open: Record<string, { cfg: string; sym: string; side: Side; t: number; px: number }> = {};
  const at = Date.now() - 120_000, conn = rt.settings.live.connId;
  const first = positions[0], ps = first.side === 1 ? "LONG" : "SHORT";
  const save = (coid: string, kind: string, qty: number, px: number, msg = "") =>
    rt.db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,'ok',?,?)",
      coid, `control|${first.sym}|${first.side}`, first.sym, first.side, kind, qty, px, msg, at);
  ex.positions.set(`${first.sym}|${ps}`, positions.length * 0.2);
  for (const p of positions) {
    const id = `${p.cfg}|${p.sym}|${p.side}|${p.entryT}`, key = `${p.sym}|${p.side}`, qty = 0.2;
    const lo: LaneOrder = { id, key, sym: p.sym, side: p.side, qty, at, exitQty: 0, exitNotional: 0, weights: { [id]: 1 } };
    for (const [which, kind, type, price] of [["s", "V", "STOP_MARKET", p.stop], ["t", "Y", "TAKE_PROFIT_MARKET", p.target]] as const) {
      const coid = makeCoid(conn, kind, at);
      const reply = await ex.order({ symbol: p.sym, positionSide: ps, side: p.side === 1 ? "SELL" : "BUY",
        type, quantity: qty, stopPrice: price, clientOrderID: coid }) as { order: { orderId: string } };
      lo[which] = { coid, oid: reply.order.orderId, px: price, qty };
      save(coid, kind, qty, price, id);
    }
    laneMap[id] = lo; open[id] = { cfg: p.cfg, sym: p.sym, side: p.side, t: at, px: p.entry };
  }
  const qty = positions.length * 0.2, coid = makeCoid(conn, "S", at);
  const stop = first.side === 1 ? Math.min(...positions.map((p) => p.stop)) * .99 : Math.max(...positions.map((p) => p.stop)) * 1.01;
  await ex.order({ symbol: first.sym, positionSide: ps, side: first.side === 1 ? "SELL" : "BUY", type: "STOP_MARKET",
    quantity: qty, stopPrice: stop, clientOrderID: coid });
  save(makeCoid(conn, "E", at), "O", qty, first.entry);
  save(coid, "S", qty, stop);
  rt.db.kvSet("liveLaneOpen", open); rt.db.kvSet("laneOrders", laneMap); rt.db.kvSet("liveBoundedSince", at - 1);
  ex.log.length = 0;
}

describe("native parent protection during mode drain", () => {
  beforeEach(() => {
    resetLiveBackoff();
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
  });
  afterEach(() => mock.timers.reset());

  for (const side of [1, -1] as const) {
    for (const firstType of ["STOP_MARKET", "TAKE_PROFIT_MARKET"] as const) {
      it(`documents the unlinked legacy pair consuming the sibling before a poll, side ${side}, first ${firstType}`, async () => {
        const { rt, ex, step } = fixture();
        const first = parent(1, side), second = parent(2, side);
        const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
        await seedLegacy(rt, ex, [first, second]);
        await step();
        const ownLegs = ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) &&
          (near(o.stopPrice!, first.stop) || near(o.stopPrice!, first.target)));
        const siblingLegs = ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) &&
          (near(o.stopPrice!, second.stop) || near(o.stopPrice!, second.target)));
        assert.equal(ownLegs.length, 2);
        assert.equal(siblingLegs.length, 2);
        const a = ownLegs.find((o) => o.type === firstType)!;
        const b = ownLegs.find((o) => o.type !== firstType)!;
        assert.ok(near(ex.positions.get(key) ?? 0, 0.4));
        // Model a reversal and both independent venue triggers before the desk can poll or cancel either leg.
        ex.triggerOrder(a.id);
        assert.ok(near(ex.positions.get(key) ?? 0, 0.2));
        ex.triggerOrder(b.id);
        assert.equal(ex.positions.has(key), false, "the second same-parent fill consumes the other parent's 0.2");
        assert.ok(near(ex.done.get(a.id)?.qty ?? 0, 0.2));
        assert.ok(near(ex.done.get(b.id)?.qty ?? 0, 0.2));
        assert.ok(siblingLegs.every((o) => ex.orders.some((current) => current.id === o.id)),
          "the other parent's own exits did not fill and remain resting in the model");
        const submitted = ex.log.length;
        mock.timers.tick(20_000);
        const status = await step();
        assert.equal(ex.log.slice(submitted).some((o) => o.type === "MARKET"), false,
          "reconciliation does not guess a new market action after the double fill");
        assert.ok(status.skipped.some((entry) => /native parent|orphan exit/.test(entry.why)),
          "the unresolved shared parent is reported");
        rt.db.db.close();
      });
    }

    it(`repairs a departed parent's exact stop after the sibling has a verified own fill, side ${side}`, async () => {
      const { rt, ex, step } = fixture();
      const first = parent(1, side), second = parent(2, side);
      const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const native = () => ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)));
      const firstStop = native().find((o) => o.type === "STOP_MARKET" && near(o.stopPrice!, first.stop));
      const firstTarget = native().find((o) => o.type === "TAKE_PROFIT_MARKET" && near(o.stopPrice!, first.target));
      const secondStop = native().find((o) => o.type === "STOP_MARKET" && near(o.stopPrice!, second.stop));
      assert.ok(firstStop && firstTarget && secondStop);
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [first];
      ex.triggerOrder(secondStop.id);
      for (let i = 0; i < 4; i++) { mock.timers.tick(20_000); await step(); }
      assert.ok(near(ex.positions.get(key) ?? 0, 0.2), "the sibling's own fill leaves only the first parent");
      assert.ok(await ex.cancel("S1-USDT", firstStop.id));
      rt.paper.positions = [];
      for (let i = 0; i < 4; i++) { mock.timers.tick(20_000); await step(); }
      const repaired = native().find((o) => o.type === "STOP_MARKET" && near(o.stopPrice!, firstStop.stopPrice!));
      assert.ok(repaired, "the proven remaining parent regains its original stop");
      assert.ok(near(repaired.qty ?? 0, 0.2));
      assert.ok(native().some((o) => o.id === firstTarget.id), "the remaining parent's original target stays in place");
      assert.ok(near(ex.positions.get(key) ?? 0, 0.2));
      rt.db.db.close();
    });

    it(`repairs both cancelled native exits of the same departed parent, side ${side}`, async () => {
      const { rt, ex, step } = fixture();
      const first = parent(1, side), second = parent(2, side);
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const own = ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) &&
        (near(o.stopPrice!, first.stop) || near(o.stopPrice!, first.target)));
      assert.equal(own.length, 2);
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [second];
      mock.timers.tick(20_000);
      await step();
      for (const order of own) assert.ok(await ex.cancel("S1-USDT", order.id));
      for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
      for (const order of own) {
        const repaired = ex.orders.find((o) => o.type === order.type && near(o.stopPrice!, order.stopPrice!));
        assert.ok(repaired, `${order.type} was not restored`);
        assert.ok(near(repaired.qty ?? 0, order.qty ?? 0));
      }
    });

    for (const type of ["STOP_MARKET", "TAKE_PROFIT_MARKET"] as const) for (const reopen of [false, true]) {
      it(`repairs a departed parent's cancelled ${type} using its saved quantity and level, side ${side}, durable restart ${reopen}`, async () => {
        const dir = mkdtempSync(join(tmpdir(), "cts-native-protection-"));
        const path = join(dir, "core.sqlite");
        const first = parent(1, side), second = parent(2, side);
        const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
        const initial = fixture(new CoreDb(path));
        let { rt, step } = initial;
        const { ex } = initial;
        try {
          await seedLegacy(rt, ex, [first, second]);
          await step();
          const native = () => ex.orders.filter((o) => ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)));
          const firstOrder = native().find((o) => o.type === type && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
          const siblingOfFirst = native().find((o) => o.type !== type && near(o.stopPrice!, type === "STOP_MARKET" ? first.target : first.stop));
          const sibling = native().filter((o) => near(o.stopPrice!, second.stop) || near(o.stopPrice!, second.target));
          assert.ok(firstOrder && siblingOfFirst);
          assert.equal(sibling.length, 2);
          const marketCount = ex.log.filter((p) => p.type === "MARKET").length;
          rt.settings.live = { ...rt.settings.live, laneOrders: false };
          rt.paper.positions = [second];
          mock.timers.tick(20_000);
          await step();
          assert.ok(await ex.cancel("S1-USDT", firstOrder.id));
          if (reopen) {
            flushLiveKv(rt.db);
            rt.db.db.close();
            const recovered = fixture(new CoreDb(path));
            recovered.rt.settings.live = { ...recovered.rt.settings.live, laneOrders: false };
            recovered.rt.paper.positions = [second];
            rt = recovered.rt;
            step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
          }
          for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
          assert.ok(near(ex.positions.get(key) ?? 0, 0.4), "the held parents are not reduced or reallocated");
          assert.equal(ex.log.filter((p) => p.type === "MARKET").length, marketCount, "no speculative market close or reopen");
          const repaired = native().find((o) => o.type === type && near(o.stopPrice!, firstOrder.stopPrice!));
          assert.ok(repaired, `own ${type} not restored: ${JSON.stringify(native())}`);
          assert.ok(near(repaired.qty ?? 0, firstOrder.qty ?? 0), "only the original confirmed parent quantity is protected");
          assert.ok(native().some((o) => o.id === siblingOfFirst.id), "the departing parent's other exit is retained");
          assert.ok(sibling.every((o) => native().some((current) => current.id === o.id)), "the sibling exits are retained");
          flushLiveKv(rt.db);
          rt.db.db.close();
        } finally { rmSync(dir, { recursive: true, force: true }); }
      });
    }

    for (const type of ["STOP_MARKET", "TAKE_PROFIT_MARKET"] as const) {
    it(`does not invent a ${type} level for an active Paper parent whose saved venue level is missing, side ${side}`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "cts-native-lost-level-"));
      const path = join(dir, "core.sqlite");
      const { rt, ex, step } = fixture(new CoreDb(path));
      const first = parent(1, side), second = parent(2, side);
      try {
        await seedLegacy(rt, ex, [first, second]);
        await step();
        const original = ex.orders.find((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
        assert.ok(original);
        assert.ok(await ex.cancel("S1-USDT", original.id));
        flushLiveKv(rt.db);
        rt.db.db.close();
        const db = new CoreDb(path);
        const map = db.kvGet<Record<string, LaneOrder>>("laneOrders") ?? {};
        const saved = Object.values(map).find((p) => p.id.includes(first.cfg));
        assert.ok(saved);
        if (type === "STOP_MARKET") { delete saved.s; delete saved.drainStopPx; }
        else { delete saved.t; delete saved.drainTargetPx; }
        db.kvSet("laneOrders", map);
        const resumed = fixture(db);
        resumed.rt.settings.live = { ...resumed.rt.settings.live, laneOrders: false };
        resumed.rt.paper.positions = [{ ...first, stop: first.stop + side * 0.05, target: first.target + side * 0.12 }, second];
        for (let i = 0; i < 3; i++) {
          mock.timers.tick(20_000);
          await stepLive(resumed.rt as unknown as CoreRuntime, [], resumed.rt.generation, ex);
        }
        const movedLevel = type === "STOP_MARKET" ? first.stop + side * 0.05 : first.target + side * 0.12;
        assert.equal(ex.orders.some((o) => o.type === type && near(o.stopPrice!, movedLevel)), false,
          "changed Paper must not manufacture the unknown original venue level");
        assert.equal(ex.orders.some((o) => o.type === type && near(o.stopPrice!, original.stopPrice!)), false,
          "missing durable venue-level evidence cannot be silently guessed");
        flushLiveKv(db);
        db.db.close();
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });

    it(`repairs the original ${type} level even if its still-active Paper parent has changed, side ${side}`, async () => {
      const { rt, ex, step } = fixture();
      const first = parent(1, side), second = parent(2, side);
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const original = ex.orders.find((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
      assert.ok(original);
      const moved = { ...first, stop: first.stop + side * 0.05, target: first.target + side * 0.12 };
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [moved, second];
      mock.timers.tick(20_000);
      await step();
      assert.ok(ex.orders.some((o) => o.id === original.id), "the mode switch retains the original venue order");
      assert.ok(await ex.cancel("S1-USDT", original.id));
      for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
      const repaired = ex.orders.find((o) => o.type === type && near(o.stopPrice!, original.stopPrice!));
      assert.ok(repaired, `the original level was not restored: ${JSON.stringify(ex.orders)}`);
      assert.ok(near(repaired.qty ?? 0, original.qty ?? 0));
    });

    it(`persists a refused ${type} replacement's level across restart and retries, side ${side}`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "cts-native-retry-"));
      const path = join(dir, "core.sqlite");
      const first = parent(1, side), second = parent(2, side);
      const initial = fixture(new CoreDb(path));
      let { rt, step } = initial;
      const { ex } = initial;
      try {
        await seedLegacy(rt, ex, [first, second]);
        await step();
        const original = ex.orders.find((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
        assert.ok(original);
        rt.settings.live = { ...rt.settings.live, laneOrders: false };
        rt.paper.positions = [second];
        mock.timers.tick(20_000);
        await step();
        assert.ok(await ex.cancel("S1-USDT", original.id));
        const send = ex.order.bind(ex);
        let refuse = true, rejected = 0;
        ex.order = async (p) => {
          if (refuse && p.type === type && near(Number(p.stopPrice), original.stopPrice!)) {
            rejected++;
            throw new ExchangeRejected("simulated replacement refusal", 1);
          }
          return send(p);
        };
        mock.timers.tick(20_000);
        await step();
        assert.ok(rejected > 0, "the replacement was actually refused");
        assert.equal(ex.orders.some((o) => o.type === type && near(o.stopPrice!, original.stopPrice!)), false);
        flushLiveKv(rt.db);
        rt.db.db.close();
        const resumed = fixture(new CoreDb(path));
        resumed.rt.settings.live = { ...resumed.rt.settings.live, laneOrders: false };
        resumed.rt.paper.positions = [second];
        rt = resumed.rt;
        step = () => stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
        refuse = false;
        for (let i = 0; i < 3; i++) { mock.timers.tick(70_000); await step(); }
        const repaired = ex.orders.find((o) => o.type === type && near(o.stopPrice!, original.stopPrice!));
        assert.ok(repaired, "the verified original level survives the failed replacement and database restart");
        assert.ok(near(repaired.qty ?? 0, original.qty ?? 0), "the original confirmed quantity is retained");
        flushLiveKv(rt.db);
        rt.db.db.close();
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });

    it(`does not replace a missing ${type} whose cancellation fill is unknown, side ${side}`, async () => {
      const { rt, ex, step } = fixture();
      const first = parent(1, side), second = parent(2, side);
      const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const original = ex.orders.find((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
      assert.ok(original);
      await ex.cancel("S1-USDT", original.id);
      const originalStatus = ex.orderStatus.bind(ex);
      let inspected = 0;
      ex.orderStatus = async (sym, id) => id === original.id
        ? (inspected++, { order: { orderId: id, status: "CANCELLED" } }) : originalStatus(sym, id);
      const marketCount = ex.log.filter((p) => p.type === "MARKET").length;
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [second];
      for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
      assert.ok(inspected > 0, "the unknown cancellation receipt is actually inspected");
      assert.ok(near(ex.positions.get(key) ?? 0, 0.4));
      assert.equal(ex.log.filter((p) => p.type === "MARKET").length, marketCount);
      assert.equal(ex.orders.filter((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, original.stopPrice!)).length, 0,
        "no duplicate exit is invented when the cancelled order's execution is unknown");
      const saved = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}).find((p) => p.id.includes(first.cfg));
      assert.equal((type === "STOP_MARKET" ? saved?.s : saved?.t)?.oid, original.id, "the unresolved original identity remains durable");
      assert.ok(ex.orders.some((o) => ownCoidKind(o.clientOrderId, rt.settings.live.connId) === "S"), "shared backstop remains");
    });

    for (const mismatch of ["orderId", "missingOrderId", "symbol", "clientOrderId", "side", "positionSide", "type", "quantityAlias"] as const) {
      it(`does not replace a ${type} when cancellation evidence has a mismatched ${mismatch}, side ${side}`, async () => {
        const { rt, ex, step } = fixture();
        const first = parent(1, side), second = parent(2, side);
        const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
        await seedLegacy(rt, ex, [first, second]);
        await step();
        const original = ex.orders.find((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
        assert.ok(original);
        await ex.cancel("S1-USDT", original.id);
        const originalStatus = ex.orderStatus.bind(ex);
        let inspected = 0;
        const client: ExchangeClient = ex;
        client.orderStatus = async (sym, id) => id === original.id
          ? (inspected++, { order: { orderId: mismatch === "orderId" ? "unrelated-venue-order" : mismatch === "missingOrderId" ? undefined : id,
            symbol: mismatch === "symbol" ? "S2-USDT" : sym,
            clientOrderId: mismatch === "clientOrderId" ? "unrelated-client-order" : original.clientOrderId,
            side: mismatch === "side" ? (side === 1 ? "BUY" : "SELL") : (side === 1 ? "SELL" : "BUY"),
            positionSide: mismatch === "positionSide" ? (side === 1 ? "SHORT" : "LONG") : (side === 1 ? "LONG" : "SHORT"),
            type: mismatch === "type" ? (type === "STOP_MARKET" ? "TAKE_PROFIT_MARKET" : "STOP_MARKET") : type,
            status: "CANCELLED", executedQty: 0, ...(mismatch === "quantityAlias" ? { cumExecQty: 0.2 } : {}) } })
          : originalStatus(sym, id);
        rt.settings.live = { ...rt.settings.live, laneOrders: false };
        rt.paper.positions = [second];
        for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
        assert.ok(inspected > 0, "the mismatched cancellation receipt is actually inspected");
        assert.ok(near(ex.positions.get(key) ?? 0, 0.4));
        assert.equal(ex.orders.some((o) => o.type === type && near(o.stopPrice!, original.stopPrice!)), false,
          "mismatched venue evidence cannot authorize a replacement");
        const saved = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}).find((p) => p.id.includes(first.cfg));
        assert.equal((type === "STOP_MARKET" ? saved?.s : saved?.t)?.oid, original.id);
      });
    }

    it(`does not replace the original quantity after a measured partial ${type} fill, side ${side}`, async () => {
      const { rt, ex, step } = fixture();
      const first = parent(1, side), second = parent(2, side);
      const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const original = ex.orders.find((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
      assert.ok(original);
      await ex.cancel("S1-USDT", original.id);
      ex.positions.set(key, 0.3); // venue has confirmed that 0.1 of this parent executed
      const originalStatus = ex.orderStatus.bind(ex);
      let inspected = 0;
      const client: ExchangeClient = ex;
      client.orderStatus = async (sym, id) => id === original.id
        ? (inspected++, { order: { orderId: id, status: "CANCELLED", executedQty: 0.1, avgPrice: Number(original.stopPrice) } })
        : originalStatus(sym, id);
      const marketCount = ex.log.filter((p) => p.type === "MARKET").length;
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [second];
      for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
      assert.ok(inspected > 0, "the measured partial cancellation receipt is actually inspected");
      assert.ok(near(ex.positions.get(key) ?? 0, 0.3), "the executed quantity is not repurchased or reduced again");
      assert.equal(ex.log.filter((p) => p.type === "MARKET").length, marketCount);
      const saved = Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}).find((p) => p.id.includes(first.cfg));
      assert.ok(saved && near(saved.qty, 0.1), `only the measured remainder stays assigned: ${JSON.stringify(saved)}`);
      const firstOrders = ex.orders.filter((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, original.stopPrice!));
      assert.ok(firstOrders.every((o) => (o.qty ?? Infinity) <= 0.1 + 1e-9), "no order protects a speculative full quantity");
    });

    it(`does not forget a measured partial ${type} fill on contradictory zero cancellation, side ${side}`, async () => {
      const { rt, ex, step } = fixture();
      const first = parent(1, side), second = parent(2, side);
      const key = `S1-USDT|${side === 1 ? "LONG" : "SHORT"}`;
      await seedLegacy(rt, ex, [first, second]);
      await step();
      const original = ex.orders.find((o) => o.type === type && ["V", "Y"].includes(ownCoidKind(o.clientOrderId, rt.settings.live.connId)) && near(o.stopPrice!, type === "STOP_MARKET" ? first.stop : first.target));
      assert.ok(original);
      ex.positions.set(key, 0.3);
      const originalStatus = ex.orderStatus.bind(ex);
      let contradictory = false, inspected = 0;
      const client: ExchangeClient = ex;
      client.orderStatus = async (sym, id) => id === original.id
        ? (inspected++, { order: { orderId: id, status: contradictory ? "CANCELLED" : "PARTIALLY_FILLED", executedQty: contradictory ? 0 : 0.1, avgPrice: Number(original.stopPrice) } })
        : originalStatus(sym, id);
      rt.settings.live = { ...rt.settings.live, laneOrders: false };
      rt.paper.positions = [second];
      mock.timers.tick(20_000);
      await step();
      const getSaved = () => Object.values(liveKv<Record<string, LaneOrder>>(rt.db, "laneOrders") ?? {}).find((p) => p.id.includes(first.cfg));
      const firstSaved = getSaved();
      assert.ok(firstSaved && near(firstSaved.qty, 0.1), "the measured partial fill reduces only this parent");
      assert.equal((type === "STOP_MARKET" ? firstSaved.s : firstSaved.t)?.filledQty, 0.1,
        "an unconfirmed cancellation keeps the measured execution and original identity");
      contradictory = true;
      const beforeContradiction = inspected;
      for (let i = 0; i < 3; i++) { mock.timers.tick(20_000); await step(); }
      assert.ok(inspected > beforeContradiction, "the contradictory cancellation receipt is actually inspected");
      const saved = getSaved();
      assert.ok(saved && near(saved.qty, 0.1));
      assert.equal((type === "STOP_MARKET" ? saved.s : saved.t)?.filledQty, 0.1,
        "an older or inconsistent zero cannot erase a confirmed partial fill");
      assert.equal(ex.orders.some((o) => o.type === type && near(o.stopPrice!, original.stopPrice!)), false,
        "no speculative replacement follows the conflicting cancellation");
      assert.ok(near(ex.positions.get(key) ?? 0, 0.3));
    });
    }
  }
});
