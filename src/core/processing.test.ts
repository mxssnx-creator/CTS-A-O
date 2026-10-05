// Complete processing regressions: every indication works on every lane, every combo is processed through the
// stages (Base → Main → Real) and evaluated, no strategy type is blocked or isolated by another, and the toggles
// do exactly what they say — for every one of the 128 toggle combinations:
//   Normal off    the plain base (Normal and Trailing entries) executes only Block-raised
//   Trailing off  no trailing anywhere
//   Block / Block Active / DCA / DCA Active / Axis  each processes on its own, whatever Normal / Trailing are
// The toggles never stop the processing: every tape is still built and evaluated (Base PF, Block feed).
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";
import { auditState } from "./audit.ts";
import { walkForward, kindExecutable, type WalkForwardOptions } from "./sim/walkforward.ts";
import { allCombos } from "./pipeline/pipeline.ts";
import { INDICATIONS, indicationState, laneOf, isSignalInd } from "./indications/registry.ts";
import { SeriesCache } from "./indications/cache.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import type { StrategyToggles } from "./domain/types.ts";

// the same synthetic market on every run: it otherwise ends at the current minute, and whether that minute's market
// seats any DCA / Axis config decided how many toggle combinations trade (a run at the wrong minute failed)
process.env.CTS_CORE_SYNTHETIC_END = String(Date.UTC(2026, 8, 30, 12));

const until = async (cond: () => boolean, ms = 400_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
};

/**
 * A rich test series: the synthetic random walk plus market events every few hundred bars — a capitulation (a long
 * one-way run into a wide, heavy-volume bar), a squeeze rally and isolated volume spikes with long wicks — so every
 * indication has its trigger (volume z-scores, extreme RSI levels, sweeps) somewhere.
 */
function richCandles(sym: string, tf: number, n: number, end: number, seed: number) {
  const cs = syntheticCandles(sym, tf, n, end, seed).map((c) => ({ ...c, v: 100 + ((c.t / 60_000) % 37) }));
  for (let at = 150; at + 60 < cs.length; at += 290) {
    const dir = Math.floor(at / 290) % 2 ? 1 : -1;
    // a one-way run of 30 bars, 0.6 % per bar, rising volume
    for (let j = 0; j < 30; j++) {
      const i = at + j;
      const o = cs[i - 1].c;
      const c = o * (1 + dir * 0.006);
      cs[i] = { ...cs[i], o, c, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, v: 300 + j * 40 };
    }
    // the climax bar: wide range, long wick against the run, 8× volume, then a reversal
    const i = at + 30;
    const o = cs[i - 1].c;
    const c = o * (1 - dir * 0.004);
    const ext = o * (1 + dir * 0.02);
    cs[i] = { ...cs[i], o, c, h: Math.max(o, c, ext), l: Math.min(o, c, ext), v: 2400 };
    for (let j = 1; j <= 20; j++) {
      const k = i + j;
      const o2 = cs[k - 1].c;
      const c2 = o2 * (1 - dir * 0.003);
      cs[k] = { ...cs[k], o: o2, c: c2, h: Math.max(o2, c2) * 1.001, l: Math.min(o2, c2) * 0.999, v: 400 };
    }
    // re-anchor the rest of the walk to the new price
    const shift = cs[i + 20].c / cs[i + 21].o;
    for (let k = i + 21; k < cs.length; k++) cs[k] = { ...cs[k], o: cs[k].o * shift, h: cs[k].h * shift, l: cs[k].l * shift, c: cs[k].c * shift };
    // a forced-flow bar after quiet trading: a body of ~6 ATR on 10× volume, closing mid-range (a long wick)
    const f = at + 140;
    if (f + 1 < cs.length) {
      const o2 = cs[f - 1].c;
      const c2 = o2 * (1 + dir * 0.03);
      const far = o2 * (1 + dir * 0.06);
      cs[f] = { ...cs[f], o: o2, c: c2, h: Math.max(o2, far), l: Math.min(o2, far), v: 4000 };
      const sh = c2 / cs[f + 1].o;
      for (let k = f + 1; k < cs.length; k++) cs[k] = { ...cs[k], o: cs[k].o * sh, h: cs[k].h * sh, l: cs[k].l * sh, c: cs[k].c * sh };
    }
  }
  return cs;
}

describe("every indication works", () => {
  const END = Date.UTC(2026, 9, 1);
  const series = [
    ...["AAA-USDT", "BBB-USDT", "CCC-USDT"].map((s, i) => barsFromCandles(s, 5, richCandles(s, 5, 4000, END, 7 + i))),
    ...["FFF-USDT", "GGG-USDT"].map((s) => barsFromCandles(s, 5, syntheticCandles(s, 5, 3000, END))),
    barsFromCandles("DDD-USDT", 1, richCandles("DDD-USDT", 1, 6000, END, 3)),
    barsFromCandles("EEE-USDT", 15, richCandles("EEE-USDT", 15, 3000, END, 5)),
  ];
  const engine = INDICATIONS.filter((x) => !x.id.startsWith("sig-"));

  it("returns a state per bar for every indication, without throwing, and fires on the test series", () => {
    const silent: string[] = [];
    const bad: string[] = [];
    for (const x of engine) {
      let fired = 0;
      for (const b of series) {
        const st = indicationState(x.id, new SeriesCache(b));
        if (!st) continue;
        if (st.length !== b.n) bad.push(`${x.id}: ${st.length} states for ${b.n} bars`);
        for (let i = 0; i < st.length; i++) if (st[i] !== 0 && st[i] !== 1 && st[i] !== -1) bad.push(`${x.id}: state ${st[i]}`);
        for (let i = 1; i < st.length; i++) if (st[i] !== 0 && st[i] !== st[i - 1]) fired++;
      }
      if (!fired) silent.push(x.id);
    }
    assert.deepEqual(bad.slice(0, 10), []);
    // every indication fires on 3 × 3000 bars of regime-switching data (a silent one would never be evaluated)
    assert.deepEqual(silent, [], `silent: ${silent.join(", ")}`);
  });

  it("regression: a double-smoothed indication (TSI) is not NaN for good; ema seeds after a NaN prefix", async () => {
    const { ema } = await import("./math/indicators.ts");
    const x = Float64Array.from({ length: 50 }, (_, i) => (i < 5 ? NaN : i));
    const e = ema(x, 3);
    assert.ok(Number.isNaN(e[6]) && Math.abs(e[7] - 6) < 1e-12, "seed = SMA of the first 3 finite values");
    assert.ok(Number.isFinite(e[49]));
    // no NaN prefix: unchanged
    const y = Float64Array.from({ length: 10 }, (_, i) => i + 1);
    assert.equal(ema(y, 3)[2], 2);
    for (const id of ["r-tsi", "r-tsi-m"]) {
      const st = indicationState(id, new SeriesCache(series[0]))!;
      let on = 0;
      for (let i = 1; i < st.length; i++) if (st[i] !== 0 && st[i] !== st[i - 1]) on++;
      assert.ok(on > 0, `${id} fires`);
    }
  });

  it("every indication on every lane (1 / 5 / 15 / 30 min, plain and combined) is a Base combo", () => {
    const tfs = [1, 5, 15, 30];
    const combos = allCombos([], [], tfs);
    const keys = new Set(combos.map((c) => `${c.bot}|${c.ind}`));
    assert.equal(keys.size, combos.length, "no duplicate combos");
    const lanesOf = new Map<string, Set<string>>();
    for (const c of combos) {
      if (c.ind === "none" || laneOf(c.ind).base === "none") continue;
      const l = laneOf(c.ind);
      const k = l.base;
      const s = lanesOf.get(k) ?? lanesOf.set(k, new Set()).get(k)!;
      s.add(`${l.tf}${l.combined ? "c" : ""}`);
    }
    const missing: string[] = [];
    for (const x of engine) {
      if (x.id.startsWith("s2-")) continue; // Stable-02 ports run as signal sources only
      const got = lanesOf.get(x.id);
      if (!got) missing.push(`${x.id}: no lane`);
      else for (const tf of tfs) if (!got.has(String(tf)) && !got.has(`${tf}c`)) missing.push(`${x.id}@m${tf}`);
    }
    assert.deepEqual(missing, []);
    // a disabled kind drops only its own indications
    const kinds = [...new Set(engine.map((x) => x.kind))];
    const off = kinds[0];
    const rest = allCombos([], [off], tfs);
    assert.ok(rest.length < combos.length && rest.length > 0);
    assert.ok(rest.every((c) => c.ind === "none" || INDICATIONS.find((x) => x.id === laneOf(c.ind).base)?.kind !== off));
  });
});

describe("processing through the stages, every strategy type, every toggle combination", { timeout: 900_000 }, () => {
  let rt: CoreRuntime;
  before(async () => {
    rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        symbols: 4,
        historyDays: 18,
        tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
        cycleMs: 60_000,
        focus: [],
        pinned: [],
        mainTop: 24,
        toggles: { normal: true, trailing: true, block: true, blockActive: false, dca: true, dcaActive: false, axis: true },
      } as never,
      { market: "synthetic" },
    );
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running" && rt.audit !== null);
    rt.stop();
  });

  it("Base evaluates every combo of every lane; Main keeps lanes; tapes carry every strategy type and range", async () => {
    const s1 = new Set(rt.pipeline!.s1.map((r) => `${r.bot}|${r.ind}`));
    const want = allCombos(rt.settings.focus, rt.settings.disabledKinds, rt.settings.tfs);
    const notRun = want.filter((c) => !s1.has(`${c.bot}|${c.ind}`)).map((c) => `${c.bot}|${c.ind}`);
    assert.deepEqual(notRun.slice(0, 10), [], `${notRun.length} combos never processed in Base`);
    // every Base run carries finite numbers (an evaluated combo, not a placeholder)
    const broken = rt.pipeline!.s1.filter((r) => !Number.isFinite((r as { pf?: number }).pf ?? 0));
    assert.equal(broken.length, 0);
    // tapes: every lane, every type; every Main pair with tapes has its plain, trailing, DCA, DCA Active and Axis
    const lanes = new Set(rt.tapes.map((t) => laneOf(t.ind).tf ?? rt.settings.tfMin));
    for (const tf of rt.settings.tfs) assert.ok(lanes.has(tf), `lane ${tf}m has tapes`);
    const kindsByPair = new Map<string, Set<string>>();
    for (const t of rt.tapes) {
      if (isSignalInd(t.ind)) continue;
      const k = `${t.bot}|${t.ind}`;
      (kindsByPair.get(k) ?? kindsByPair.set(k, new Set()).get(k)!).add(t.kind);
    }
    // every Main pair carries its plain base, its trailing variants, DCA, DCA Active and Axis: no type is lost to a
    // gate at build time (the range gate prunes only the small ranges — General / Long are the plain base)
    // (Short / General / Long trade 15m lanes and slower and Minimal needs its own Base cell: a faster-lane pair that
    // passed at the default protect only carries its DCA / Axis sets; Micro indications only Micro cells)
    const lacking: string[] = [];
    for (const [pair, ks] of kindsByPair) {
      const ind = pair.split("|")[1];
      if (ind.startsWith("mc-")) continue;
      const fast = (laneOf(ind).tf ?? rt.settings.tfMin) < 15;
      const need = fast ? ["dca", "dca-active", "axis"] : ["normal", "trailing", "dca", "dca-active", "axis"];
      for (const k of need) if (!ks.has(k)) lacking.push(`${pair}: ${k}`);
    }
    assert.deepEqual(lacking.slice(0, 10), [], `${lacking.length} missing types`);
    const { GATED_RANGES } = await import("./minimal-coord.ts");
    assert.deepEqual([...GATED_RANGES].sort(), ["mc", "mn", "mp", "sh"]);
    const gl = rt.tapes.filter((t) => t.protect.tag === "gn" || t.protect.tag === "lg");
    assert.ok(gl.some((t) => t.n < 50), "General / Long tapes with fewer than 50 closes are kept");
    const tags = new Set<string>(rt.tapes.map((t) => t.protect.tag ?? "wide"));
    for (const tag of ["mn", "sh", "gn", "lg"]) assert.ok(tags.has(tag), `range ${tag} has tapes`);
    // the stage chain is consistent and every published number replays
    const bad = rt.audit!.checks.filter((c) => !c.ok);
    assert.deepEqual(bad, [], JSON.stringify(bad));
  });

  it("all 128 toggle combinations: audit clean, the rules hold, DCA / Axis independent of Normal / Trailing", (t) => {
    const names = ["normal", "trailing", "block", "blockActive", "dca", "dcaActive", "axis"] as const;
    const base = rt.wf;
    const keyOf = (x: { cfg: string; sym: string; entryT: number; side: number }) => `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`;
    const run = (tg: StrategyToggles) => {
      // separate family seats: Normal / Trailing, DCA and Axis each take their own seats (independent books)
      const o: WalkForwardOptions = { ...base, toggles: tg, guardPct: 0, familySeats: true, familyNeedsBase: false };
      const sim = walkForward(rt.lastUniverse!, rt.tapes, o);
      const audit = auditState({ sim, tapes: rt.tapes, cost: rt.settings.cost });
      return { sim, audit };
    };
    const byId = new Map(rt.tapes.map((t) => [t.id, t]));
    const kindOf = (x: { cfg: string; kind?: string }) => x.kind ?? byId.get(x.cfg)!.kind;
    const indep = new Map<string, string>();
    let combos = 0;
    let withTrades = 0;
    for (let m = 0; m < 128; m++) {
      const tg = Object.fromEntries(names.map((n, i) => [n, !!(m & (1 << i))])) as unknown as StrategyToggles;
      const { sim, audit } = run(tg);
      combos++;
      const failed = audit.checks.filter((c) => !c.ok);
      assert.deepEqual(failed, [], `${JSON.stringify(tg)}: ${JSON.stringify(failed)}`);
      if (sim.trades.length) withTrades++;
      for (const x of sim.trades) {
        const k = kindOf(x) as never;
        // a signal's own base (signalOwnBase) trades whatever the engine's Normal / Block switches say: its Normal
        // always, its Trailing with the Trailing switch
        if (sim.opts.signalOwnBase && (k === "normal" || k === "trailing") && isSignalInd(byId.get(x.cfg)!.ind)) {
          if (k === "trailing") assert.ok(tg.trailing, `${JSON.stringify(tg)}: a signal trailing with Trailing off`);
          continue;
        }
        assert.ok(kindExecutable(k, tg), `${JSON.stringify(tg)}: a ${k} trade executed`);
        if (k === "trailing") assert.ok(tg.trailing, "Trailing off: no trailing");
        if ((k === "normal" || k === "trailing") && !tg.normal)
          assert.ok((x.level ?? 0) > 0 && tg.block, `${JSON.stringify(tg)}: an unraised ${k} with Normal off`);
        if (k === "dca") assert.ok(tg.dca && !tg.dcaActive);
        if (k === "dca-active") assert.ok(tg.dca && tg.dcaActive);
        if (k === "axis") assert.ok(tg.axis);
      }
      // independence: with Block off, the DCA / Axis book is the same whatever Normal and Trailing are
      if (!tg.block && !tg.blockActive) {
        const own = sim.trades
          .filter((x) => ["dca", "dca-active", "axis"].includes(kindOf(x)))
          .map(keyOf)
          .sort()
          .join(",");
        const k = `${tg.dca}|${tg.dcaActive}|${tg.axis}`;
        const prev = indep.get(k);
        if (prev === undefined) indep.set(k, own);
        else assert.equal(own, prev, `DCA / Axis book changed with Normal ${tg.normal} / Trailing ${tg.trailing} (${k})`);
      }
    }
    assert.equal(combos, 128);
    assert.ok(withTrades > 64, `${withTrades} combinations trade`);
    // every additional type trades with Normal and Trailing off as it does with them on: turning them off never removes
    // a DCA / Axis trade. (Whether the synthetic market of the minute seats any DCA / Axis config at all depends on the
    // minute — it ends at the current time —, so their presence is required only when the run with Normal and Trailing
    // on has them: asserting it unconditionally failed about one run in two.)
    const extra = run({ normal: false, trailing: false, block: false, blockActive: false, dca: true, dcaActive: false, axis: true });
    const withNT = run({ normal: true, trailing: true, block: false, blockActive: false, dca: true, dcaActive: false, axis: true });
    // (a signal's own base trades whatever the engine's Normal / Trailing switches say: not counted here)
    const ks = new Set(
      extra.sim.trades
        .filter((x) => !(extra.sim.opts.signalOwnBase && isSignalInd(byId.get(x.cfg)!.ind)))
        .map((x) => kindOf(x)),
    );
    const own = (s: typeof extra.sim) =>
      s.trades.filter((x) => ["dca", "axis"].includes(kindOf(x))).map(keyOf).sort().join(",");
    assert.equal(own(extra.sim), own(withNT.sim), "DCA / Axis trades the same with Normal + Trailing off");
    if (own(withNT.sim) !== "")
      assert.ok(ks.has("dca") || ks.has("axis"), `DCA / Axis trade with Normal + Trailing off: ${[...ks].join(",")}`);
    else t.diagnostic("no DCA / Axis config cleared its gates on this minute's synthetic market");
    assert.ok(!ks.has("normal") && !ks.has("trailing"));
    // one seat per pair (the default, related): DCA / Axis trade a pair only when they outscore the base there, so
    // turning Normal and Trailing off can only add DCA / Axis trades, never remove one
    const related = (normal: boolean) =>
      walkForward(rt.lastUniverse!, rt.tapes, {
        ...base,
        guardPct: 0,
        familySeats: false,
        toggles: { normal, trailing: normal, block: false, blockActive: false, dca: true, dcaActive: false, axis: true },
      }).trades.filter((x) => ["dca", "axis"].includes(kindOf(x))).map(keyOf);
    const withBase = new Set(related(true));
    const without = new Set(related(false));
    assert.ok([...withBase].every((k) => without.has(k)), "removing the base never removes a DCA / Axis trade");
    assert.ok(without.size >= withBase.size);
    // Normal off with Block on: Block-raised Normal / Trailing still trade, nothing unraised
    const raised = run({ normal: false, trailing: true, block: true, blockActive: false, dca: false, dcaActive: false, axis: false });
    // (the run above uses family seats; the Block book needs candidates, which Normal off still feeds)
    assert.ok(raised.sim.trades.length > 0, "Block-raised entries execute with Normal off");
    // …except a range Block never raises (block.excludeRanges): it trades its unit on its own record by design
    // (range-min-pf.test: "a range Block never raises trades its unit"), now that every range has its own Base cells
    const neverRaised = (x: { cfg: string }) => {
      const tag = byId.get(x.cfg)?.protect.tag;
      return !!tag && !!base.block.excludeRanges?.includes(tag);
    };
    const unraised = raised.sim.trades.filter((x) => !((x.level ?? 0) > 0) && !neverRaised(x));
    assert.deepEqual(
      unraised.map((x) => `${x.cfg} ${kindOf(x)} tag=${byId.get(x.cfg)?.protect.tag ?? ""}`),
      [],
      "Normal off: only Block-raised plain trades (and ranges Block never raises)",
    );
  });

  it("trailing exits only on trailing configs, plain configs never trail; every trade pays the cost once", () => {
    const sim = rt.sim!;
    const byId = new Map(rt.tapes.map((t) => [t.id, t]));
    for (const x of sim.trades) {
      const tp = byId.get(x.cfg);
      assert.ok(tp, `trade ${x.cfg} has its tape`);
      if (x.reason === "trail") assert.ok(tp!.protect.trail > 0 || tp!.kind === "axis", `${x.cfg} trailed without a trail`);
      if (tp!.kind === "trailing") assert.ok(tp!.protect.trail > 0 || !!tp!.protect.atr, `${x.cfg} is trailing without a distance`);
      if (tp!.kind === "normal") assert.equal(tp!.protect.trail, 0, `${x.cfg} plain with a trail`);
      assert.ok(Number.isFinite(x.r) && x.exitT >= x.entryT);
    }
  });
});
