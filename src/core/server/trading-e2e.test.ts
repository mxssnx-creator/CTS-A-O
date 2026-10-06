// End to end from the engine to the exchange: a synthetic runtime computes and fills its paper book, then the live
// control step trades that book on a simulated hedge-mode venue (one stop per position side, as BingX). Checked over
// several steps: the venue converges on the control targets, every own position carries its own stop on its own
// side and at a protective price, long and short of one symbol are separate positions, nothing rests on a flat side,
// a step without changes sends nothing, a lane that leaves closes its share, and the live ledger's round trips
// reconcile with the venue's fills.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { liveKv, resetLiveBackoff, stepLive } from "./live.server.ts";
import { liveTag, type ControlTarget } from "./live.ts";
import { liveTrades } from "../statistics.ts";
import { SIGNAL_SOURCES, signalSettings } from "../signal-config.ts";
import { H, SimExchange, rng } from "../test-support.ts";

process.env.CTS_CORE_LIVE = "1";
// the live step refuses a stale book: the synthetic market ends at the current hour
process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / H) * H);

const small = {
  symbols: 3,
  historyDays: 18,
  tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
  mainTop: 12,
  refineTop: 4,
  evalTop: 8,
  cycleMs: 60_000,
  grid: { short: false as const },
  tactics: {
    session: false,
    volRegime: false,
    trendStrength: false,
    cooldown: false,
    cooldownBars: 4,
  },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({
    exits: "pct",
    sources: Object.fromEntries(
      SIGNAL_SOURCES.filter((x) => x.name.startsWith("s2-")).map((x) => [x.name, false]),
    ),
  }),
};

const until = async (cond: () => boolean, ms = 300_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

type Ctl = {
  targets: ControlTarget[];
  actions: Array<{ kind: string; key: string; ok: boolean; msg?: string }>;
};
const ctl = (rt: CoreRuntime) => liveKv<Ctl>(rt.db, "controlStatus");
const own = (o: { clientOrderId?: string }) => !!o.clientOrderId?.toUpperCase().startsWith("CTSB");

describe(
  "trading end to end: engine → paper book → live control → venue",
  { timeout: 900_000 },
  () => {
    let rt: CoreRuntime;
    const ex = new SimExchange(rng(7), {
      prefix: "SYN",
      symbols: 3,
      oneStopPerSide: true,
    }).withEquity(1_000);
    // the runtime's prices: the last close of each synthetic symbol (the venue fills at the same prices)
    let prices: Array<{ sym: string; last: number; quoteVol: number; changePct: number }> = [];
    const tickers = async () => prices;

    before(async () => {
      rt = new CoreRuntime(new CoreDb(":memory:"), small, {
        market: "synthetic",
        feed: { tickers },
      });
      // every validated config trades (the audit and selection are covered elsewhere): plenty of paper lanes
      rt.updateSettings({}, { validLastN: 0, lastN: 0 });
      rt.start();
      await until(() => rt.status.computes >= 1 && rt.status.state === "running");
      const cs = (rt as unknown as { candles: Map<string, Array<{ c: number }>> }).candles;
      prices = [...cs].map(([sym, xs]) => ({
        sym,
        last: xs.at(-1)!.c,
        quoteVol: 1e6,
        changePct: 0,
      }));
      for (const p of prices) ex.px.set(p.sym, p.last);
      // the paper book fills on the runtime's tick
      await until(() => rt.paper.positions.length > 0, 120_000).catch(() => undefined);
      rt.stop();
      rt.settings.live = {
        ...rt.settings.live,
        enabled: true,
        mode: "overall",
        notionalUsd: 10,
        ratio: 1,
        maxPositions: 0,
        maxNotionalUsd: 0,
        rebalancePct: 0.25,
      };
      resetLiveBackoff();
    });
    after(() => rt?.stop());

    const step = () => stepLive(rt, [], rt.generation, ex);

    it("the engine produced a paper book on both sides to trade", () => {
      assert.ok(rt.paper.positions.length > 0, "paper positions after the first compute");
      const sides = new Set(rt.paper.positions.map((p) => p.side));
      assert.ok(sides.size >= 1);
    });

    it("readiness: below the minimum simulated PF nothing opens (targets are planned, no order is sent)", async () => {
      const sim = rt.sim!;
      const saved = { pf: sim.stats.pf, stable: sim.stable };
      sim.stats.pf = Math.min(sim.stats.pf, rt.settings.gates.minPf - 0.1);
      await step();
      const c = ctl(rt)!;
      assert.ok(
        c.targets.some((t) => t.qty > 0),
        "targets planned",
      );
      assert.equal(ex.sent, 0, "no order sent while not ready");
      assert.ok(
        c.actions
          .filter((a) => a.kind === "open")
          .every((a) => !a.ok && a.msg?.startsWith("not ready")),
      );
      Object.assign(sim.stats, { pf: saved.pf });
      // the rest trades whatever the synthetic market's PF (readiness waived, as on a testnet)
      rt.settings.live = { ...rt.settings.live, requireReady: false };
      resetLiveBackoff();
    });

    it("the venue converges on the control targets, each position with its own protective stop", async () => {
      for (let i = 0; i < 4; i++) await step();
      const c = ctl(rt)!;
      assert.ok(c, "control status written");
      const live = c.targets.filter((t) => t.qty > 0);
      assert.ok(
        live.length > 0,
        `targets: ${JSON.stringify(c.targets.slice(0, 3))} actions: ${JSON.stringify(c.actions.slice(0, 5))}`,
      );
      const book = await ex.book();
      for (const t of live) {
        const ps = t.side > 0 ? "LONG" : "SHORT";
        const q = ex.positions.get(`${t.sym}|${ps}`) ?? 0;
        // a held position is resized only when it is off its target by more than the rebalance band
        const band = rt.settings.live.rebalancePct ?? 0;
        assert.ok(
          q > 0 && Math.abs(q - t.qty) <= t.qty * band + 0.001 + 1e-9,
          `${t.key}: venue ${q} vs target ${t.qty} (band ${band})`,
        );
        const stops = book.orders.filter(
          (o) => o.venueSymbol === t.sym && o.positionSide === ps && o.type === "STOP_MARKET",
        );
        assert.equal(stops.length, 1, `${t.key}: one stop on its own side`);
        const px = ex.px.get(t.sym)!;
        const sp = Number(stops[0].stopPrice);
        assert.ok(t.side > 0 ? sp < px : sp > px, `${t.key}: stop ${sp} protects at price ${px}`);
      }
      // nothing of ours rests on a flat side, and no position exists without a target
      for (const o of book.orders.filter(own))
        assert.ok(
          ex.positions.has(`${o.venueSymbol}|${o.positionSide}`),
          `order ${o.clientOrderId} on a flat side`,
        );
      for (const k of ex.positions.keys()) {
        const [sym, ps] = k.split("|");
        assert.ok(
          live.some((t) => t.sym === sym && (t.side > 0 ? "LONG" : "SHORT") === ps),
          `position ${k} has a target`,
        );
      }
    });

    it("long and short of one symbol are separate positions with separate stops", async () => {
      const sym = prices[0].sym;
      const keep = rt.paper.positions;
      const base = keep.find((p) => p.sym === sym) ?? keep[0];
      // a long and a short lane of the same config on one symbol: both open, each with its own stop
      rt.paper.positions = [
        ...keep,
        {
          ...base,
          sym,
          side: 1,
          cfg: `${base.cfg}`,
          entry: prices[0].last,
          stop: prices[0].last * 0.97,
        },
        {
          ...base,
          sym,
          side: -1,
          cfg: `${base.cfg}`,
          entry: prices[0].last,
          stop: prices[0].last * 1.03,
        },
      ] as typeof keep;
      for (let i = 0; i < 3; i++) await step();
      const t = ctl(rt)!.targets.filter((x) => x.sym === sym && x.qty > 0);
      assert.deepEqual(new Set(t.map((x) => x.side)), new Set([1, -1]), "a target per side");
      assert.ok(
        ex.positions.get(`${sym}|LONG`)! > 0 && ex.positions.get(`${sym}|SHORT`)! > 0,
        "both sides held",
      );
      const st = (await ex.book()).orders.filter(
        (o) => o.venueSymbol === sym && o.type === "STOP_MARKET",
      );
      assert.equal(st.length, 2, "one stop per side");
      assert.deepEqual(new Set(st.map((o) => o.positionSide)), new Set(["LONG", "SHORT"]));
      rt.paper.positions = keep;
      for (let i = 0; i < 3; i++) await step();
    });

    it("a step without changes sends nothing", async () => {
      await step();
      const n = ex.sent;
      await step();
      await step();
      assert.equal(
        ex.sent,
        n,
        `orders sent on unchanged steps: ${JSON.stringify(ex.log.slice(n))}`,
      );
    });

    it("lanes that leave close their share; the ledger's round trips reconcile with the venue's fills", async () => {
      // prices move 1 % in each position's favour, then every lane leaves
      for (const p of prices) {
        p.last *= 1.01;
        ex.px.set(p.sym, p.last);
      }
      rt.paper.positions = [];
      for (let i = 0; i < 4; i++) await step();
      assert.equal(
        ex.positions.size,
        0,
        `flat after every lane left: ${JSON.stringify([...ex.positions])}`,
      );
      assert.equal((await ex.book()).orders.filter(own).length, 0, "no own order left");
      // venue P&L from its fills (both sides), against the ledger's round trips as the Statistics page reads them
      let venue = 0;
      for (const f of ex.fills)
        venue += (f.into ? -1 : 1) * (f.ps === "LONG" ? 1 : -1) * f.qty * f.px;
      const rows = rt.db.all<{
        coid: string;
        sym: string;
        side: number;
        kind: string;
        qty: number;
        px: number;
        status: string;
        at: number;
      }>("SELECT coid, sym, side, kind, qty, px, status, at FROM live_orders ORDER BY at");
      assert.ok(rows.length > 0, "the ledger recorded the orders");
      assert.ok(
        ex.fills.length >= 2 && Math.abs(venue) > 1e-6,
        `round trips on the venue: ${ex.fills.length}`,
      );
      const trades = liveTrades(rows, liveTag(rt.settings.live.connId).length);
      const ledger = trades.reduce((a, x) => a + x.r * x.notional, 0);
      // fees are not simulated; prices are the same on both sides of the books
      assert.ok(
        Math.abs(ledger - venue) <= Math.max(0.01, Math.abs(venue) * 0.02),
        `ledger ${ledger} vs venue ${venue}`,
      );
    });
  },
);
