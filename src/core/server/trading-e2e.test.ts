// The actual synthetic engine fills its paper book, but cold-start history does not waive strict live proof.
// A separate, explicitly declared synthetic accepted/funded history tests the real runtime's promotion and live
// control mechanics on a simulated hedge-mode venue (one stop per position side, as BingX). Checked over
// several steps: the venue converges on the control targets, every own position carries its own stop on its own
// side and at a protective price, long and short of one symbol are separate positions, nothing rests on a flat side,
// a step without changes sends nothing, a lane that leaves closes its share, and the live ledger's round trips
// reconcile with the venue's fills.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { liveKv, liveReadiness, resetLiveBackoff, stepLive } from "./live.server.ts";
import { liveTag, type ControlTarget } from "./live.ts";
import { liveTrades } from "../statistics.ts";
import { unitReturn, unitStatsOf } from "../metrics/stats.ts";
import { SIGNAL_SOURCES, signalSettings } from "../signal-config.ts";
import { H, SimExchange, rng, syntheticExecutionRun, trackRuntimes } from "../test-support.ts";
import { executionRecordKey } from "../live-record.ts";
import { DEFAULT_PROTECT } from "../config.ts";
import { makeTape, walkForward } from "../sim/walkforward.ts";
import { configId } from "../pipeline/pipeline.ts";

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
    const runtimes = trackRuntimes();
    let rt: CoreRuntime;
    let engineRt: CoreRuntime;
    type Identity = { cfg: string; sym: string; side: 1 | -1 };
    let computedPaper: CoreRuntime["paper"]["positions"] = [];
    let hedgePair: { sym: string; long: Identity; short: Identity };
    const ex = new SimExchange(rng(7), {
      prefix: "SYN",
      symbols: 3,
      oneStopPerSide: true,
    }).withEquity(1_000);
    // the runtime's prices: the last close of each synthetic symbol (the venue fills at the same prices)
    let prices: Array<{ sym: string; last: number; quoteVol: number; changePct: number }> = [];
    const tickers = async () => prices;

    before(async () => {
      engineRt = runtimes.track(new CoreRuntime(new CoreDb(":memory:"), small, {
        market: "synthetic",
        feed: { tickers },
      }));
      // every validated config trades (the audit and selection are covered elsewhere): plenty of paper lanes
      engineRt.updateSettings({}, { validLastN: 0, lastN: 0 });
      engineRt.start();
      await until(() => engineRt.status.computes >= 1 && engineRt.status.state === "running");
      const cs = engineRt.candles;
      prices = [...cs].map(([sym, xs]) => ({
        sym,
        last: xs.lastC()!,
        quoteVol: 1e6,
        changePct: 0,
      }));
      for (const p of prices) ex.px.set(p.sym, p.last);
      // the paper book fills on the runtime's tick
      await until(() => engineRt.paper.positions.length > 0, 120_000).catch(() => undefined);
      engineRt.stop();
      engineRt.settings.live = {
        ...engineRt.settings.live,
        enabled: true,
        mode: "overall",
        notionalUsd: 10,
        ratio: 1,
        maxPositions: 0,
        maxNotionalUsd: 0,
        rebalancePct: 0.25,
      };
      computedPaper = engineRt.paper.positions;

      // Independent execution-mechanics fixture. These accepted returns and paper holdings are declared
      // synthetic inputs, not selected from or substituted into the actual engine's results above. Both hedge
      // directions are declared before any live step; each must satisfy the real exact-identity proof method.
      rt = runtimes.track(new CoreRuntime(new CoreDb(":memory:"), small, {
        market: "synthetic", feed: { tickers }, priceStream: null,
      }));
      rt.stop();
      rt.settings.live = { ...engineRt.settings.live };
      const a = configId("follow", "rsi-mom-14-25@m15", DEFAULT_PROTECT);
      const b = configId("follow", "sig-ema-cross-s@m15", DEFAULT_PROTECT);
      const declared: Identity[] = [
        { cfg: a, sym: "SYN1-USDT", side: 1 },
        { cfg: a, sym: "SYN2-USDT", side: 1 },
        { cfg: b, sym: "SYN2-USDT", side: -1 },
        { cfg: b, sym: "SYN0-USDT", side: 1 },
        { cfg: b, sym: "SYN0-USDT", side: -1 },
      ];
      hedgePair = { sym: "SYN0-USDT", long: declared[3], short: declared[4] };
      const now = Date.now();
      const n = Math.max(50, 2 * rt.livePromotionGate(declared[0]).minN!);
      const model = syntheticExecutionRun(declared, [-.008, .012], n, now);
      const u = { bars: [], caches: [], startT: now - 24 * H, endT: now, splitT: now - 12 * H, nowT: now, baseTf: 15 } as never;
      rt.sim = Object.assign(walkForward(u, [], { ...rt.wf, simH: 24 }), model);
      rt.tapes = [
        makeTape(a, "follow", "rsi-mom-14-25@m15", DEFAULT_PROTECT, "normal", prices.map((p) => p.sym), model.trades.filter((t) => t.cfg === a), [], []),
        makeTape(b, "follow", "sig-ema-cross-s@m15", DEFAULT_PROTECT, "normal", prices.map((p) => p.sym), model.trades.filter((t) => t.cfg === b), [], []),
      ];
      rt.paper.selected = [a, b];
      rt.paper.startedAt = model.startT;
      rt.paper.positions = declared.slice(0, 3).map((p) => {
        const px = prices.find((x) => x.sym === p.sym)!.last;
        return { ...p, entryT: now, entryI: 0, entry: px, stop: px * (1 - p.side * DEFAULT_PROTECT.sl),
          target: px * (1 + p.side * DEFAULT_PROTECT.tp), peak: px, trailOn: false, mtm: 0, vol: 1, level: 0, heldAt: now };
      });
      // Separately declared funded OWNED PAPER closes provide the execution axis. Nothing here claims venue
      // performance; the real runtime reads persisted allocation evidence and computes both windows itself.
      for (const p of declared) {
        for (let i = 0; i < n; i++) {
          const entryT = now - (n - i) * 2000, exitT = entryT + 1000, unitR = i % 2 ? .012 : -.008;
          rt.db.run("INSERT INTO paper_book_trades (cfg,sym,side,entry_t,exit_t,r,vol,reason,held_at,at,unit_r,owned_notional_usd) VALUES (?,?,?,?,?,?,1,'time',?,?,?,10)",
            p.cfg, p.sym, p.side, entryT, exitT, unitR, entryT, now, unitR);
        }
        assert.equal(rt.livePromotionGate(p).ok, true, `exact two-axis proof for ${executionRecordKey(p.cfg, p.sym, p.side)}`);
      }
      assert.equal(liveReadiness(rt.sim, rt.settings.live, rt.settings.gates.minPf).ok, true);
      resetLiveBackoff();
    });
    after(() => runtimes.disposeAll());

    const step = () => stepLive(rt, [], rt.generation, ex);

    it("the actual engine produced its unchanged paper book", () => {
      assert.ok(computedPaper.length > 0, "paper positions after the first compute");
      assert.equal(engineRt.paper.positions, computedPaper);
      const sides = new Set(computedPaper.map((p) => p.side));
      assert.ok(sides.size >= 1);
    });

    it("the actual engine cold start lacks strict history and opens no live exposure", async () => {
      const sim = engineRt.sim;
      const gates = computedPaper.map((p) => engineRt.livePromotionGate(p));
      assert.ok(gates.every((g) => !g.ok), "a fresh engine book has no complete exact two-axis proof");
      assert.ok(gates.every((g) => g.execution?.n === 0), "no owned history is invented for paper positions");
      await stepLive(engineRt, [], engineRt.generation, ex);
      assert.equal(ex.sent, 0);
      assert.equal(ex.positions.size, 0);
      assert.equal(ctl(engineRt)?.targets.some((t) => t.qty > 0), false);
      assert.equal(engineRt.sim, sim, "live admission does not replace the actual model results");
      assert.equal(engineRt.paper.positions, computedPaper, "live admission does not rewrite the paper book");
      resetLiveBackoff();
    });

    it("readiness: a losing accepted model opens nothing and cannot pass strict lane admission", async () => {
      const sim = rt.sim!;
      // Readiness independently judges the orders, so corrupting only a cached PF no longer creates a losing
      // run. Explicit synthetic losses retain the actual config/timing/weight identities and a known unit basis.
      const losses = sim.trades.map((t) => {
        const unitR = -Math.max(0.001, Math.abs(unitReturn(t)));
        return { ...t, unitR, r: unitR * (t.mult ?? 1) };
      });
      assert.ok(losses.length > 0, "the readiness fixture has closed return evidence");
      rt.sim = { ...sim, trades: losses, openAtEnd: [], stats: unitStatsOf(losses), stable: false };
      assert.ok(rt.sim.stats.pf < rt.settings.gates.minPf);
      try {
        await step();
        const c = ctl(rt)!;
        assert.equal(liveReadiness(rt.sim!, rt.settings.live, rt.settings.gates.minPf).ok, false);
        assert.equal(c.targets.some((t) => t.qty > 0), false, "strict rejected lanes do not create exchange targets");
        assert.equal(ex.sent, 0, "no order sent while not ready");
        assert.ok(rt.status.livePromotion?.lanes.some((p) => p.state === "model-failed"), "the actual losing exact model is visible in rejection evidence");
      } finally { rt.sim = sim; }
      assert.equal(liveReadiness(rt.sim!, rt.settings.live, rt.settings.gates.minPf).ok, true, "restored declared mechanics history passes real readiness");
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
      assert.ok(rt.livePromotionGate(hedgePair.long).ok && rt.livePromotionGate(hedgePair.short).ok,
        "both explicitly declared synthetic directions independently pass the real gate");
      const sym = hedgePair.sym;
      const px = prices.find((p) => p.sym === sym)!.last;
      const keep = rt.paper.positions;
      const base = keep.find((p) => p.sym === sym) ?? keep[0];
      // Independently qualified configs on the same symbol: no winning direction qualifies its losing sibling.
      rt.paper.positions = [
        ...keep,
        {
          ...base,
          sym,
          side: 1,
          cfg: hedgePair.long.cfg,
          entry: px,
          stop: px * 0.97,
        },
        {
          ...base,
          sym,
          side: -1,
          cfg: hedgePair.short.cfg,
          entry: px,
          stop: px * 1.03,
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
      // the fake venue reports no fee, so the ledger is read gross (modelCost 0): this test reconciles prices and
      // quantities. The model fee for unmeasured fills (0.2 % round trip by default) is judged in statistics.test.ts
      const trades = liveTrades(rows, liveTag(rt.settings.live.connId).length, 0);
      const ledger = trades.reduce((a, x) => a + x.r * x.notional, 0);
      // fees are not simulated; prices are the same on both sides of the books
      assert.ok(
        Math.abs(ledger - venue) <= Math.max(0.01, Math.abs(venue) * 0.02),
        `ledger ${ledger} vs venue ${venue}`,
      );
    });
  },
);
