// Signals processing: sources, combos, the 15 Normal + 15 Trailing configs, the active ranking, the last-8 guard,
// settings and the engine running with signals on.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  acceptKey,
  activeSignals,
  DEFAULT_SIGNALS,
  guardKey,
  mergeSignals,
  signalCombos,
  signalProtects,
  signalSettings,
  SignalGuard,
  sigActiveKey,
  SIGNAL_COUNT_CHOICES,
} from "./signals.ts";
import {
  INDICATIONS,
  isSignalInd,
  laneOf,
  SIGNAL_SOURCES,
  signalId,
  signalSourceOf,
} from "./indications/registry.ts";
import { allCombos, symStat } from "./pipeline/pipeline.ts";
import { checkSettings } from "./settings-check.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import {
  capsOf,
  defaultWalkForward,
  activeSignalsAt,
  hedgeSignalsAt,
  signalIndex,
  coordBlock,
  coordSettings,
  DEFAULT_COORD,
  execDecision,
  feedBooks,
  makeTape,
  signalSetAt,
  splitSignalTapes,
  sourceUnstable,
  type ConfigTape,
} from "./sim/walkforward.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";

const on = signalSettings({ enabled: true });
const why = (d: object) => ("why" in d ? d.why : "");

/** sources on by default (research sources are available but off until validated as better) */
const ENABLED = SIGNAL_SOURCES.filter((x) => DEFAULT_SIGNALS.sources[x.name] !== false).length;

describe("signals: sources and combos", () => {
  it("every source has a short and a medium signal indication", () => {
    assert.ok(SIGNAL_SOURCES.length >= 12);
    const ids = new Set(INDICATIONS.map((x) => x.id));
    for (const s of SIGNAL_SOURCES) {
      assert.ok(ids.has(signalId(s.name, "short")), s.name);
      assert.ok(ids.has(signalId(s.name, "medium")), s.name);
    }
    const id = `${signalId("ema-cross", "short")}@m15`;
    assert.ok(isSignalInd(id));
    assert.equal(signalSourceOf(id), "ema-cross");
    assert.equal(laneOf(id).tf, 15);
    assert.ok(!isSignalInd("ema-9-21@m15"));
  });

  it("engine combos never include signals; signal combos only when enabled", () => {
    assert.ok(!allCombos(undefined, undefined, [1, 5, 15, 30]).some((c) => isSignalInd(c.ind)));
    assert.equal(signalCombos({ ...DEFAULT_SIGNALS, enabled: false }, [1, 5, 15, 30]).length, 0);
    assert.equal(DEFAULT_SIGNALS.enabled, true, "on by default");
    const c = signalCombos(on, [1, 5, 15, 30]);
    // sources × 2 ranges × default lanes 15 / 30 (short ranges included)
    assert.equal(c.length, ENABLED * 2 * DEFAULT_SIGNALS.lanes.length);
    assert.ok(c.every((x) => x.bot === "follow" && isSignalInd(x.ind)));
    // a source off, a range off, a lane the engine does not run
    const off = signalSettings({
      enabled: true,
      sources: { "ema-cross": false },
      ranges: { short: true, medium: false },
      lanes: [5, 60],
    });
    assert.equal(signalCombos(off, [1, 5, 15, 30]).length, ENABLED - 1);
  });

  it("15 Normal + 15 Trailing configs, medium to high targets, trailing stops wider", () => {
    const p = signalProtects({ ...on, exits: "pct" });
    const normal = p.filter((x) => x.trail === 0);
    const trailing = p.filter((x) => x.trail > 0);
    assert.equal(normal.length, 15);
    assert.equal(trailing.length, 15);
    assert.equal(new Set(p.map((x) => `${x.tp}|${x.sl}|${x.trail}`)).size, 30, "all distinct");
    for (const x of p) assert.ok(x.tp >= 0.015 && x.hold > 0);
    for (const x of trailing) assert.ok(x.sl >= 2 * x.tp - 1e-9, "trailing stops at 2 × target");
  });

  it("exit models: percent (default), ATR (Stable-02: 9 cells × no trail / trail 0.8 %) or both", () => {
    assert.equal(on.exits, "pct");
    const pct = signalProtects({ ...on, exits: "pct" });
    const atr = signalProtects({ ...on, exits: "atr" });
    const both = signalProtects({ ...on, exits: "both" });
    assert.equal(pct.length, 30);
    assert.equal(atr.length, 18);
    assert.equal(both.length, 48, "1.6 × the percent-only tapes");
    assert.ok(pct.every((x) => !x.atr) && atr.every((x) => x.atr));
    assert.equal(atr.filter((x) => x.trail > 0).length, 9);
    // Stable-02 max hold: 3 × 15m bars
    assert.ok(atr.every((x) => x.hold === 3));
    assert.equal(
      signalProtects({ ...on, atr: { ...on.atr, holdBars: 0 } }).at(-1)!.hold,
      on.holdH * 4,
    );
  });
});

describe("signals: active ranking and guard", () => {
  it("the best N by per-symbol net (then PF), with a minimum of trades", () => {
    type Run = Parameters<typeof activeSignals>[0][number];
    const runs: Run[] = [
      {
        bot: "follow",
        ind: "sig-ema-cross-s@m15",
        bySym: { A: { n: 5, net: 3, pf: 2 }, B: { n: 2, net: 9, pf: 9 } },
      },
      {
        bot: "follow",
        ind: "sig-sar-m@m5",
        bySym: JSON.stringify({ A: { n: 4, net: 5, pf: 1.5 } }),
      },
      { bot: "follow", ind: "ema-9-21@m15", bySym: { A: { n: 50, net: 99, pf: 9 } } },
    ];
    const net = { ...on, rank: "net" as const };
    const a = activeSignals(runs, { ...net, count: 10, minTrades: 3 });
    // a record without per-side stats is one unit that activates both directions (keys carry the side)
    assert.deepEqual(
      [...a],
      [
        "follow|sig-sar-m@m5|A|1",
        "follow|sig-sar-m@m5|A|-1",
        "follow|sig-ema-cross-s@m15|A|1",
        "follow|sig-ema-cross-s@m15|A|-1",
      ],
    );
    assert.equal(activeSignals(runs, { ...net, count: 1, minTrades: 3 }).size, 2);
  });

  it("drawdown ranking: net ÷ max drawdown, only signals positive in enough 4-hour blocks", () => {
    type Run = Parameters<typeof activeSignals>[0][number];
    const runs: Run[] = [
      // big net, deep drawdown: recovery 10 / 5 = 2
      {
        bot: "follow",
        ind: "sig-a-s@m5",
        bySym: { A: { n: 9, net: 10, pf: 2, dd: 5, okShare: 0.7 } },
      },
      // smaller net, shallow drawdown: 6 / 1 = 6 → ranked first
      {
        bot: "follow",
        ind: "sig-b-s@m5",
        bySym: { A: { n: 9, net: 6, pf: 1.8, dd: 1, okShare: 0.8 } },
      },
      // too few positive 4-hour blocks: excluded
      {
        bot: "follow",
        ind: "sig-c-s@m5",
        bySym: { A: { n: 9, net: 20, pf: 3, dd: 0.1, okShare: 0.3 } },
      },
      // losing: excluded
      {
        bot: "follow",
        ind: "sig-d-s@m5",
        bySym: { A: { n: 9, net: -1, pf: 0.8, dd: 2, okShare: 0.9 } },
      },
    ];
    assert.equal(on.rank, "lowdd", "low drawdown is the default");
    assert.deepEqual(
      [...activeSignals(runs, { ...on, rank: "drawdown", count: 10 })],
      ["follow|sig-b-s@m5|A|1", "follow|sig-b-s@m5|A|-1", "follow|sig-a-s@m5|A|1", "follow|sig-a-s@m5|A|-1"],
    );
    // low drawdown: net ÷ drawdown² (6 vs 0.4) and net ≥ drawdown
    assert.deepEqual(
      [...activeSignals(runs, { ...on, rank: "lowdd", count: 10 })],
      ["follow|sig-b-s@m5|A|1", "follow|sig-b-s@m5|A|-1", "follow|sig-a-s@m5|A|1", "follow|sig-a-s@m5|A|-1"],
    );
    const deep: Run = {
      bot: "follow",
      ind: "sig-e-s@m5",
      bySym: { A: { n: 9, net: 3, pf: 1.2, dd: 4, okShare: 0.9 } },
    };
    assert.ok(![...activeSignals([deep], { ...on, rank: "lowdd" })].length, "never recovered");
    assert.equal([...activeSignals([deep], { ...on, rank: "drawdown" })].length, 2, "one unit, both directions");
  });

  it("automatic validation: a signal that lost over the latest 24 h does not start", () => {
    type Run = Parameters<typeof activeSignals>[0][number];
    const st = (recentNet: number, recentN = 3) => ({
      n: 9,
      net: 6,
      pf: 2,
      dd: 1,
      okShare: 0.8,
      recentN,
      recentNet,
    });
    const runs: Run[] = [
      { bot: "follow", ind: "sig-a-s@m5", bySym: { A: st(1), B: st(-1), C: st(0, 0) } },
    ];
    assert.equal(on.validate, true);
    assert.deepEqual([...activeSignals(runs, { ...on, count: 10 })], ["follow|sig-a-s@m5|A|1", "follow|sig-a-s@m5|A|-1"]);
    assert.equal(activeSignals(runs, { ...on, count: 10, validate: false }).size, 6);
  });

  it("per-symbol Base stats: max drawdown and positive 4-hour block share", () => {
    const H = 3_600_000;
    const t = (h: number, r: number) =>
      ({
        cfg: "c",
        sym: "A",
        side: 1,
        entryT: h * H - 1,
        exitT: h * H,
        entry: 1,
        exit: 1,
        r,
        reason: "tp",
        bars: 1,
        mfe: 0,
        mae: 0,
      }) as never;
    // blocks [0,4): +0.02 −0.01 → +; [4,8): −0.03 → −; [8,12): +0.01 → +
    const s = symStat([t(1, 0.02), t(2, -0.01), t(5, -0.03), t(9, 0.01)]);
    assert.ok(Math.abs(s.dd! - 4) < 1e-9, `dd ${s.dd}`); // peak +2 % → trough −2 %
    assert.ok(Math.abs(s.okShare! - 2 / 3) < 1e-9);
  });

  it("each config × symbol × direction is disabled while its last 8 average below zero, re-enabled after", () => {
    const g = new SignalGuard();
    const cfg = "follow|sig-ema-cross-s@m15|tp2-sl2";
    const k = guardKey(cfg, "A", 1, "normal");
    for (let i = 0; i < 7; i++) g.add(k, -0.01);
    assert.equal(g.disabled(k, 8), false, "fewer than 8 results are not judged");
    g.add(k, -0.01);
    assert.equal(g.disabled(k, 8), true);
    assert.deepEqual(g.disabledKeys(8), [k]);
    for (let i = 0; i < 8; i++) g.add(k, 0.02);
    assert.equal(g.disabled(k, 8), false);
    // independent per symbol, direction, type and config
    assert.notEqual(k, guardKey(cfg, "A", -1, "normal"));
    assert.notEqual(k, guardKey(cfg, "B", 1, "normal"));
    assert.notEqual(k, guardKey(cfg, "A", 1, "trailing"));
    assert.notEqual(k, guardKey("follow|sig-ema-cross-s@m15|tp3-sl2", "A", 1, "normal"));
  });

  it("the Real gate refuses inactive signals and guarded sets", () => {
    const o = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      signalActive: new Set(["follow|sig-ema-cross-s@m15|A|1"]),
      signalGuardN: 8,
    };
    const tp = {
      id: "x",
      bot: "follow",
      ind: "sig-ema-cross-s@m15",
      kind: "normal",
      n: 0,
      exitT: new Float64Array(0),
      entryT: new Float64Array(0),
      r: new Float64Array(0),
      gp: new Float64Array(1),
      gl: new Float64Array(1),
      rs: new Float64Array(1),
      protect: { tp: 0.02, sl: 0.02, trail: 0, hold: 96 },
    } as unknown as ConfigTape;
    assert.equal(why(execDecision(tp, 0, o, { sym: "B", side: 1 })), "signalInactive");
    // active per direction: the long of A is active, its short is not
    assert.equal(why(execDecision(tp, 0, o, { sym: "A", side: -1 })), "signalInactive");
    // a held signal pair that no longer passes Base opens nothing new (its open positions are managed elsewhere)
    const gone = { ...o, signalBasePassed: new Set(["follow|sig-other@m15"]) };
    assert.equal(why(execDecision(tp, 0, gone, { sym: "A", side: 1 })), "signalBase");
    const kept = { ...o, signalBasePassed: new Set(["follow|sig-ema-cross-s@m15"]) };
    assert.notEqual(why(execDecision(tp, 0, kept, { sym: "B", side: 1 })), "signalBase");
    const g = new SignalGuard();
    for (let i = 0; i < 8; i++) g.add(guardKey(tp.id, "A", 1, "normal"), -1);
    assert.equal(why(execDecision(tp, 0, o, { sym: "A", side: 1, guard: g })), "signalGuard");
    // the other direction of the same config is not affected
    assert.equal(g.disabled(guardKey(tp.id, "A", -1, "normal"), 8), false);
  });
});

describe("signals trade their own base", () => {
  const mk = (ind: string, kind = "normal") =>
    ({
      id: `follow|${ind}|tp2|sl2|tr0|h96`,
      bot: "follow",
      ind,
      kind,
      n: 0,
      exitT: new Float64Array(0),
      entryT: new Float64Array(0),
      r: new Float64Array(0),
      gp: new Float64Array(1),
      gl: new Float64Array(1),
      rs: new Float64Array(1),
      protect: { tp: 0.02, sl: 0.02, trail: 0, hold: 96 },
    }) as unknown as ConfigTape;
  // x01: Normal off, Block and Block Active on at minimum level 5 — no record yet, so Block raises nothing
  const o0 = defaultWalkForward(DEFAULT_SETTINGS);
  const x01 = (ownBase: boolean) => ({
    ...o0,
    lastN: 0,
    validLastN: 0,
    signalValidLastN: 0,
    symGate: undefined,
    signalOwnBase: ownBase,
    toggles: { ...o0.toggles, normal: false, trailing: true, block: true, blockActive: true, axis: true },
    block: { ...o0.block, minActiveLevel: 5 },
  });
  const ctx = { sym: "A", side: 1 };

  it("a signal's Normal / Trailing trade at their unit under Normal off and Block Active; engine entries do not", () => {
    for (const kind of ["normal", "trailing"]) {
      const d = execDecision(mk("sig-ema-cross-s@m15", kind), 0, x01(true), ctx);
      assert.equal(d.ok, true, kind);
      assert.equal(d.ok && d.vol, 1);
    }
    assert.notEqual(execDecision(mk("rsi-mom-14-20@m15"), 0, x01(true), ctx).ok, true);
    // off: signals follow the engine toggles (skipped below the Block Active level)
    assert.equal(why(execDecision(mk("sig-ema-cross-s@m15"), 0, x01(false), ctx)), "blockActive");
    // Block off and Normal off: the signal base still trades, the engine base does not
    const noBlock = (b: boolean) => ({ ...x01(b), toggles: { ...x01(b).toggles, block: false } });
    assert.equal(execDecision(mk("sig-ema-cross-s@m15"), 0, noBlock(true), ctx).ok, true);
    assert.equal(why(execDecision(mk("rsi-mom-14-20@m15"), 0, noBlock(true), ctx)), "toggle");
  });

  it("is on by default and can be switched off", () => {
    assert.equal(signalSettings({}).ownBase, true);
    assert.equal(signalSettings({ ownBase: false }).ownBase, false);
  });
});

describe("signal guard window", () => {
  it("judges every check up to the longest window (lastN 50)", () => {
    const g = new SignalGuard();
    let missed = 0;
    for (let i = 0; i < 200; i++) {
      g.add("k", -0.01);
      if (i >= 49 && !g.disabled("k", 50)) missed++;
    }
    assert.equal(missed, 0);
  });
});

describe("signals: guards through the feed (as the simulation runs them)", () => {
  const base = () => ({
    ...defaultWalkForward(DEFAULT_SETTINGS),
    signalActive: new Set(["follow|sig-ema-cross-s@m15|A|1"]),
  });
  const tp = {
    id: "follow|sig-ema-cross-s@m15|tp2|sl2|tr0|h96",
    bot: "follow",
    ind: "sig-ema-cross-s@m15",
    kind: "normal",
    n: 0,
    exitT: new Float64Array(0),
    entryT: new Float64Array(0),
    r: new Float64Array(0),
    gp: new Float64Array(1),
    gl: new Float64Array(1),
    rs: new Float64Array(1),
    protect: { tp: 0.02, sl: 0.02, trail: 0, hold: 96 },
  } as unknown as ConfigTape;
  const entry = (i: number, r: number, cfg = tp.id) => ({
    exitT: i * 60_000,
    sym: "A",
    side: 1,
    kind: "trend",
    r,
    ind: tp.ind,
    type: "normal",
    cfg,
  });

  it("the last-8 guard sees the closes fed for this config (regression: keys did not match)", () => {
    const g = new SignalGuard();
    for (let i = 0; i < 8; i++) feedBooks(entry(i, -0.01), null, g);
    // (last-N and Block off: the decision after the guards needs no tape columns)
    const b0 = base();
    const o = {
      ...b0,
      signalGuardN: 8,
      lastN: 0,
      toggles: { ...b0.toggles, block: false, normal: true },
    };
    assert.equal(
      why(execDecision(tp, 9 * 60_000, o, { sym: "A", side: 1, guard: g })),
      "signalGuard",
    );
    // another config of the same signal is judged on its own results
    const other = { ...tp, id: tp.id.replace("tp2", "tp3") } as ConfigTape;
    assert.notEqual(
      why(execDecision(other, 9 * 60_000, o, { sym: "A", side: 1, guard: g })),
      "signalGuard",
    );
  });

  it("loss cluster: pauses while many signals just lost together, resumes when they age out", () => {
    const g = new SignalGuard();
    const c = { enabled: true, windowMin: 60, minLosses: 8, lossShare: 0.6 };
    // 10 closes within the hour, 9 losing, across other configs
    for (let i = 0; i < 10; i++) feedBooks(entry(i, i === 0 ? 0.01 : -0.01, `cfg${i}`), null, g);
    assert.equal(g.clustered(11 * 60_000, c), true);
    const o = { ...base(), signalCluster: c };
    assert.equal(
      why(execDecision(tp, 11 * 60_000, o, { sym: "A", side: 1, guard: g })),
      "signalCluster",
    );
    // an hour later the losses aged out of the window
    assert.equal(g.clustered(75 * 60_000, c), false);
    // causal: closes after t never count
    assert.equal(g.clustered(5 * 60_000, c), false);
    // too few losses, or a positive sum, or a low loss share: no pause
    assert.equal(g.clustered(11 * 60_000, { ...c, minLosses: 20 }), false);
    assert.equal(g.clustered(11 * 60_000, { ...c, enabled: false }), false);
    const g2 = new SignalGuard();
    for (let i = 0; i < 10; i++) feedBooks(entry(i, i < 8 ? -0.01 : 0.2, `c${i}`), null, g2);
    assert.equal(g2.clustered(11 * 60_000, c), false, "net positive window");
  });
});

describe("signals: settings", () => {
  it("active count: 0 = no cap, else 10–2000 in steps of 10, default 100 (per-side units: the measured 50 × 2)", () => {
    assert.equal(DEFAULT_SIGNALS.count, 100);
    assert.equal(SIGNAL_COUNT_CHOICES[0], 0, "no cap is a choice");
    assert.equal(SIGNAL_COUNT_CHOICES[1], 10);
    assert.equal(SIGNAL_COUNT_CHOICES.at(-1), 2000);
    assert.equal(signalSettings({ count: 3 }).count, 10);
    assert.equal(signalSettings({ count: 0 }).count, 0, "no cap is kept");
    assert.equal(signalSettings({ count: -5 }).count, 0);
    assert.equal(signalSettings({ count: 99999 }).count, 2000);
    assert.doesNotThrow(() => checkSettings({ signals: { ...on, count: 120 } }));
    assert.doesNotThrow(() => checkSettings({ signals: { ...on, count: 0 } }));
    assert.doesNotThrow(() => checkSettings({ signals: { ...on, count: 600 } }));
    assert.throws(() => checkSettings({ signals: { ...on, count: 125 } }));
    assert.throws(() => checkSettings({ signals: { ...on, count: 3000 } }));
    assert.throws(() => checkSettings({ signals: { ...on, lanes: [60] } }));
    assert.throws(() =>
      checkSettings({ signals: { ...on, ranges: { short: false, medium: false } } }),
    );
  });

  it("patches merge nested groups and keep the rest", () => {
    const m = mergeSignals(on, {
      guard: { enabled: true, lastN: 12 },
      sources: { sar: false },
    } as never);
    assert.equal(m.enabled, true);
    assert.equal(m.guard.lastN, 12);
    assert.equal(m.sources.sar, false);
    assert.deepEqual(m.normal, DEFAULT_SIGNALS.normal);
    assert.deepEqual(DEFAULT_SETTINGS.signals, DEFAULT_SIGNALS);
  });
});

describe("unlimited orders", () => {
  it("orders per symbol default to unlimited; open and per-side stay unlimited; old caps are dropped once", () => {
    const w = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(w.maxPerSymbol, 0);
    assert.equal(w.maxPerSide, 0);
    assert.equal(w.maxOpen, 0);
    assert.equal(w.maxPositions, 0, "positions (symbol × direction): no cap either (process freely)");
    assert.deepEqual(capsOf(w, false), {
      perSymbol: Infinity,
      maxOpen: Infinity,
      perSide: Infinity,
    });
    assert.equal(capsOf(w, true).perSymbol, Infinity);
    assert.equal(capsOf({ ...w, maxPerSymbol: 4 }, false).perSymbol, 4);
    const db = new CoreDb(":memory:");
    db.kvSet("wf", { maxPerSymbol: 3, maxPerSide: 16, maxOpen: 60, preH: 10 });
    db.kvSet("settings", { signals: { enabled: true, perSymbol: 6, maxOpen: 60 } });
    const rt = new CoreRuntime(db, undefined, { market: "synthetic" });
    assert.equal(rt.wf.maxPerSymbol, 0);
    assert.equal(rt.wf.maxOpen, 0);
    assert.equal(rt.wf.preH, 10, "other saved options kept");
    assert.equal(
      rt.settings.signals.perSymbol,
      DEFAULT_SIGNALS.perSymbol,
      "signal orders per symbol: the validated default",
    );
    assert.equal(rt.settings.signals.enabled, true);
    // a cap chosen after the migration is kept
    db.kvSet("wf", { maxPerSymbol: 5 });
    assert.equal(new CoreRuntime(db, undefined, { market: "synthetic" }).wf.maxPerSymbol, 5);
  });
});

describe("signals: engine", { timeout: 400_000 }, () => {
  it("scores signals in Base, trades only the active ones on their own configs, audit clean", async () => {
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        symbols: 3,
        historyDays: 18,
        tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
        mainTop: 10,
        refineTop: 4,
        evalTop: 6,
        cycleMs: 60_000,
        grid: { short: false },
        signals: signalSettings({ enabled: true, count: 10, minTrades: 1 }),
      },
      { market: "synthetic" },
    );
    rt.start();
    const t0 = Date.now();
    while (!(rt.status.computes >= 1 && rt.status.state === "running" && rt.audit !== null)) {
      if (Date.now() - t0 > 300_000) throw new Error("timeout");
      await new Promise((r) => setTimeout(r, 20));
    }
    rt.stop();
    const st = rt.status.signals!;
    assert.ok(st.enabled);
    assert.equal(st.combos, ENABLED * 2 * DEFAULT_SIGNALS.lanes.length);
    assert.ok(st.active > 0 && st.active <= 10, `active ${st.active}`);
    const sigTapes = rt.tapes.filter((t) => isSignalInd(t.ind));
    // every config of every active signal runs (not selected into seats): all of them in the paper selection
    const sel = new Set(rt.paper.selected);
    const activePairs = new Set(
      [...rt.wf.signalActive!].map((k) => k.split("|").slice(0, 2).join("|")),
    );
    for (const t of sigTapes)
      if (activePairs.has(`${t.bot}|${t.ind}`)) assert.ok(sel.has(t.id), t.id);
    // 15 Normal + 15 Trailing + 18 ATR per signal pair; configs the stop / trailing floors make identical on a
    // fast lane run once
    const full = st.pairs * signalProtects(signalSettings({ enabled: true })).length;
    assert.ok(
      sigTapes.length <= full && sigTapes.length >= full * 0.9,
      `${sigTapes.length} of ${full}`,
    );
    // stop and trailing floors (0.5 % by default) hold on every lane, engine and signal configs, % and ATR exits;
    // a range cell (minimal / short / general / long …) keeps its own minimum (at least the position cost)
    for (const t of rt.tapes) {
      if (t.protect.tag) {
        assert.ok(
          t.protect.sl >= 0.002 - 1e-9 &&
            (t.protect.trail === 0 || t.protect.trail >= 0.001 - 1e-9),
          t.id,
        );
        continue;
      }
      assert.ok(t.protect.sl >= 0.005 - 1e-9, `${t.id} sl ${t.protect.sl}`);
      assert.ok(
        t.protect.trail === 0 || t.protect.trail >= 0.005 - 1e-9,
        `${t.id} trail ${t.protect.trail}`,
      );
      if (t.protect.atr) assert.ok((t.protect.atr.minSl ?? 0) >= 0.005 - 1e-9, `${t.id} atr floor`);
    }
    // no engine protect grid on signals, no DCA / Axis
    assert.ok(sigTapes.every((t) => t.kind === "normal" || t.kind === "trailing"));
    // every simulated signal trade belongs to a signal active on that symbol at its entry (ranked per step on
    // results closed before it); paper / live take the set ranked at the end of the run
    const steps = rt.sim!.signalSteps!;
    assert.ok(steps.length > 0);
    assert.deepEqual([...rt.wf.signalActive!], rt.sim!.signalActiveEnd);
    for (const x of rt.sim!.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? "")))
      assert.ok(
        signalSetAt(steps, x.entryT)!.has(sigActiveKey(x.cfg.split("|")[0], x.cfg.split("|")[1], x.sym, x.side)),
        x.cfg,
      );
    const a = rt.runAudit();
    const bad = a.checks.filter((c) => !c.ok);
    assert.deepEqual(
      bad.map((c) => c.name),
      [],
    );
  });
});

describe("signals: causal per-step activation", () => {
  const H = 3_600_000;
  const [a, b] = signalCombos(on, [1, 5, 15]);
  const P = { tp: 0.02, sl: 0.02, trail: 0, hold: 32 };
  const mk = (ind: string, rs: Array<[number, number]>): ConfigTape =>
    makeTape(
      `follow|${ind}|p`,
      "follow",
      ind,
      P,
      "normal",
      ["S"],
      rs.map(([h, r]) => ({
        cfg: `follow|${ind}|p`,
        sym: "S",
        side: 1 as const,
        entryT: (h - 1) * H,
        exitT: h * H,
        entry: 1,
        exit: 1,
        r,
        reason: r > 0 ? ("tp" as const) : ("sl" as const),
        bars: 4,
        mfe: 0,
        mae: 0,
      })),
      [],
      [],
    );
  // a wins before hour 48 and loses after; b the other way round
  const ta = mk(a.ind, [
    ...Array.from({ length: 12 }, (_, i) => [4 + i * 3, 0.01] as [number, number]),
    ...Array.from({ length: 12 }, (_, i) => [52 + i * 3, -0.01] as [number, number]),
  ]);
  const tb = mk(b.ind, [
    ...Array.from({ length: 12 }, (_, i) => [4 + i * 3, -0.01] as [number, number]),
    ...Array.from({ length: 12 }, (_, i) => [52 + i * 3, 0.01] as [number, number]),
  ]);
  const sig = { ...on, validate: false, count: 10 };

  it("ranks only on results closed before t (no look-ahead)", () => {
    const early = activeSignalsAt([ta, tb], 48 * H, sig, 48);
    // keys carry the direction (every fixture close is a long)
    assert.ok(early.has(`follow|${a.ind}|S|1`));
    assert.ok(!early.has(`follow|${a.ind}|S|-1`), "no short closes: the short is not active");
    assert.ok(!early.has(`follow|${b.ind}|S|1`), "b has only losses before 48 h");
    const late = activeSignalsAt([ta, tb], 100 * H, sig, 48);
    assert.ok(late.has(`follow|${b.ind}|S|1`));
    assert.ok(!late.has(`follow|${a.ind}|S|1`), "a only lost in the last 48 h");
    // results after t never count
    assert.deepEqual([...activeSignalsAt([ta, tb], 2 * H, sig, 48)], []);
  });

  it("step sets are looked up by entry time; ranked runs keep every signal tape", () => {
    const steps = [
      { t: 10 * H, keys: ["x"] },
      { t: 20 * H, keys: ["y"] },
    ];
    assert.equal(signalSetAt(steps, 5 * H), undefined);
    assert.deepEqual([...signalSetAt(steps, 10 * H)!], ["x"]);
    assert.deepEqual([...signalSetAt(steps, 19 * H)!], ["x"]);
    assert.deepEqual([...signalSetAt(steps, 25 * H)!], ["y"]);
    // one set per step, shared: the audit asks once per executed signal trade (a fresh set each time was 0.5 s a run)
    assert.equal(signalSetAt(steps, 10 * H), signalSetAt(steps, 19 * H));
    assert.notEqual(signalSetAt(steps, 19 * H), signalSetAt(steps, 20 * H));
    const only = new Set([`follow|${a.ind}|S|1`]);
    assert.equal(splitSignalTapes([ta, tb], { signalActive: only }).signal.length, 1);
    assert.equal(
      splitSignalTapes([ta, tb], { signalActive: only, signalRank: sig }).signal.length,
      2,
    );
  });
});

describe("coordination tactics", () => {
  const H = 3_600_000;
  const eng = { cfg: "magnet|rsi@m5|p1", sym: "A", side: 1 };
  const sig = { cfg: "follow|sig-ema-cross-s@m5|p1", sym: "A", side: 1, entryT: 10 * H + 60_000 };
  const on = (p: object) => coordSettings({ ...DEFAULT_COORD, ...p });

  it("defaults: on, signal confirmation only (the validated set)", () => {
    assert.deepEqual(DEFAULT_COORD, {
      enabled: true,
      hourLock: 0,
      cooldown: "off",
      conflict: false,
      confirm: true,
    });
    assert.equal(coordSettings({ cooldown: "x" as never }).cooldown, "off");
    assert.equal(coordSettings({ hourLock: -3 }).hourLock, 0);
  });

  it("signal confirmation: a signal needs an engine position on its symbol and direction", () => {
    const none = new Map<number, number>();
    assert.equal(coordBlock(on({}), sig, none, []), "confirm");
    assert.equal(coordBlock(on({}), sig, none, [{ ...eng, side: -1 }]), "confirm");
    assert.equal(
      coordBlock(on({}), sig, none, [{ ...sig }]),
      "confirm",
      "another signal is no confirmation",
    );
    // without a pool the neutral index is empty: the executed engine order is no confirmation (8 Oct)
    assert.equal(coordBlock(on({}), sig, none, [eng]), "confirm");
    const pool = { confirms: (sym: string, side: number) => sym === sig.sym && side === sig.side };
    assert.equal(coordBlock(on({}), sig, none, [], pool), null, "the pool's candidate confirms");
    // engine entries are never held back by it; everything off → allowed
    assert.equal(coordBlock(on({}), { ...eng, entryT: sig.entryT }, none, []), null);
    assert.equal(coordBlock(on({ enabled: false }), sig, none, []), null);
  });

  it("hour lock, losing-hour cooldown and opposite entries", () => {
    const e = { ...eng, entryT: 10 * H + 60_000 };
    const hn = new Map([
      [10, 4],
      [9, -1],
    ]);
    const c0 = { confirm: false };
    assert.equal(coordBlock(on({ ...c0, hourLock: 3 }), e, hn, []), "hourLock");
    assert.equal(coordBlock(on({ ...c0, hourLock: 5 }), e, hn, []), null);
    assert.equal(coordBlock(on({ ...c0, cooldown: "all" }), e, hn, []), "cooldown");
    assert.equal(coordBlock(on({ ...c0, cooldown: "signals" }), e, hn, []), null);
    assert.equal(coordBlock(on({ ...c0, cooldown: "signals" }), sig, hn, [eng]), "cooldown");
    assert.equal(
      coordBlock(on({ ...c0, conflict: true }), e, hn, [{ ...eng, side: -1 }]),
      "conflict",
    );
    assert.equal(coordBlock(on({ ...c0, conflict: true }), e, hn, [eng]), null);
  });
});

describe("source stability gate", () => {
  it("judges a source on its executed orders of the latest days (causal, needs enough history)", () => {
    const H = 3_600_000;
    const t = 100 * H;
    const g = { days: 2, minShare: 0.5, minTrades: 5 };
    const xs = (rs: Array<[number, number]>) => rs.map(([h, r]) => ({ exitT: h * H, r }));
    assert.equal(sourceUnstable(undefined, t, g), false);
    assert.equal(
      sourceUnstable(
        xs([
          [99, -1],
          [98, -1],
        ]),
        t,
        g,
      ),
      false,
      "too few to judge",
    );
    assert.equal(
      sourceUnstable(
        xs([
          [60, 1],
          [70, 1],
          [80, 1],
          [90, 1],
          [95, 1],
        ]),
        t,
        g,
      ),
      false,
    );
    assert.equal(
      sourceUnstable(
        xs([
          [60, 1],
          [70, -1],
          [80, -1],
          [90, -1],
          [95, -1],
        ]),
        t,
        g,
      ),
      true,
      "losing",
    );
    // positive in sum but only on 1 of 2 days: 50 % passes, a 60 % rule fails it
    const mixed = xs([
      [55, -0.2],
      [60, -0.2],
      [70, 3],
      [80, 0.1],
      [90, 0.1],
    ]);
    assert.equal(sourceUnstable(mixed, t, g), false);
    assert.equal(
      sourceUnstable(
        xs([
          [55, 3],
          [60, 0.1],
          [80, -0.2],
          [90, -0.2],
          [95, -0.1],
        ]),
        t,
        { ...g, minShare: 0.6 },
      ),
      true,
    );
    // results after t or before the window never count
    assert.equal(
      sourceUnstable(
        xs([
          [10, -5],
          [20, -5],
          [30, -5],
          [40, -5],
          [50, -5],
          [101, -5],
        ]),
        t,
        g,
      ),
      false,
    );
    assert.equal(signalSettings({}).sourceGate.enabled, false, "off by default (costs net)");
    assert.equal(
      signalSettings({ sourceGate: { enabled: true } as never }).sourceGate.enabled,
      true,
    );
    assert.equal(signalSettings({ sourceGate: { days: 99 } as never }).sourceGate.days, 14);
  });
});

describe("negative-hour hedge", () => {
  it("picks the signals that were positive in the hours the book lost (complete hours before t only)", () => {
    const H = 3_600_000;
    const [a, b] = signalCombos(signalSettings({ enabled: true }), [1, 5, 15]);
    const P = { tp: 0.02, sl: 0.02, trail: 0, hold: 32 };
    const mk = (ind: string, rs: Array<[number, number]>) =>
      makeTape(
        `follow|${ind}|p`,
        "follow",
        ind,
        P,
        "normal",
        ["S"],
        rs.map(([h, r]) => ({
          cfg: `follow|${ind}|p`,
          sym: "S",
          side: 1 as const,
          entryT: h * H,
          exitT: h * H + 60_000,
          entry: 1,
          exit: 1,
          r,
          reason: r > 0 ? ("tp" as const) : ("sl" as const),
          bars: 4,
          mfe: 0,
          mae: 0,
        })),
        [],
        [],
      );
    // the book lost in hours 10–15; a won in those hours, b lost in them (and won elsewhere)
    const neg = new Set([10, 11, 12, 13, 14, 15]);
    const ta = mk(
      a.ind,
      [10, 11, 12, 13, 14, 15].map((h) => [h, 0.01] as [number, number]),
    );
    const tb = mk(b.ind, [
      ...[10, 11, 12, 13, 14, 15].map((h) => [h, -0.01] as [number, number]),
      ...[20, 21, 22].map((h) => [h, 0.03] as [number, number]),
    ]);
    const idx = signalIndex([ta, tb]);
    const loose = { minN: 5, minPf: 1.3 };
    const got = hedgeSignalsAt(idx, 30 * H, neg, 48, loose);
    assert.deepEqual([...got], [`follow|${a.ind}|S|1`]);
    // hours not yet complete at t never count
    assert.equal(hedgeSignalsAt(idx, 12 * H, neg, 48, loose).size, 0);
    assert.equal(hedgeSignalsAt(idx, 30 * H, new Set(), 48, loose).size, 0);
    // the default selection is the strict one (6 results < 10): nothing
    assert.equal(hedgeSignalsAt(idx, 30 * H, neg, 48).size, 0);
    assert.deepEqual(
      [coordSettings({ hedge: true }).hedgeMinPf, coordSettings({ hedge: true }).hedgeMinN],
      [2, 10],
    );
    assert.equal(
      coordSettings({ hedgeMinPf: null as never }).hedgeMinPf,
      2,
      "null is the default, not 0",
    );
  });
});

describe("signals: PF acceptance", () => {
  const A = { enabled: true, minPf: 1.18, hours: 48, minTrades: 4 };
  const H = 3_600_000;
  it("a group's stats asked again at one time are the same answer; a new close is seen at once (memo vs scan)", () => {
    // reference: the scan over every close fed so far, in (t − hours, t], entries counted once
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (const key of ["side|1", "grp"]) {
      const g = new SignalGuard();
      const fed: Array<{ t: number; r: number; first: boolean }> = [];
      const seen = new Set<string>();
      const scan = (t: number, hours: number) => {
        let n = 0;
        let gp = 0;
        let gl = 0;
        for (let i = fed.length - 1; i >= 0; i--) {
          const x = fed[i];
          if (x.t > t) continue;
          if (x.t <= t - hours * H) break;
          if (x.first) n++;
          if (x.r > 0) gp += x.r;
          else gl -= x.r;
        }
        return { n, pf: gl < 1e-12 ? (gp > 0 ? Infinity : 0) : gp / gl };
      };
      let t = 0;
      for (let step = 0; step < 600; step++) {
        t += Math.floor(rnd() * 3) * 15 * 60_000;
        // a few closes at this time (exit order), some of an entry already counted
        for (let k = Math.floor(rnd() * 3); k > 0; k--) {
          const r = (rnd() - 0.45) * 0.04;
          const onset = `e${Math.floor(rnd() * 40)}`;
          g.addAccept(key, r, t, onset);
          fed.push({ t, r, first: !seen.has(onset) });
          seen.add(onset);
        }
        // the candidates of this bar ask at the same time, twice the window as well, and now and then an earlier time
        for (let q = 0; q < 4; q++) {
          const at = rnd() < 0.2 ? Math.max(0, t - Math.floor(rnd() * 8) * 15 * 60_000) : t;
          for (const hours of [24, 48]) assert.deepEqual(g.acceptStats(key, at, hours), scan(at, hours), `step ${step}`);
        }
      }
    }
  });

  it("a group is judged on its window when it has the closes, and is valid while it does not, causally", () => {
    const g = new SignalGuard();
    const key = acceptKey("sig-ema-cross-s@m15", "A-USDT", 1, "normal");
    assert.equal(key, "ema-cross|A-USDT|1|normal");
    // no history in the window or in twice the window: nothing to judge — valid (operator, 6 Oct)
    assert.equal(g.accepts(key, 100 * H, A), true, "no history: valid until there is a sample");
    // PF 2.0 (0.02 won 2× vs 0.01 lost) on 4 closes
    for (const [t, r] of [
      [1, 0.01],
      [2, 0.01],
      [3, -0.01],
      [4, 0.01],
    ] as const)
      g.addAccept(key, r, t * H);
    assert.equal(g.acceptStats(key, 5 * H, 48).n, 4);
    assert.equal(g.accepts(key, 5 * H, A), true);
    assert.equal(g.accepts(key, 5 * H, { ...A, minPf: 3.5 }), false, "PF 3 < 3.5");
    // 4 closes in 48 h and still 4 in 96 h, under a 5-close minimum: no sample to judge — valid
    assert.equal(g.accepts(key, 5 * H, { ...A, minTrades: 5 }), true, "too few closes in twice the window: valid");
    // causal: a close after t is not seen at t
    g.addAccept(key, -0.5, 6 * H);
    assert.equal(g.accepts(key, 5 * H, A), true);
    assert.equal(g.accepts(key, 7 * H, A), false, "the new loss drops the PF below 1.18");
    // the window: everything older than `hours` ages out
    assert.equal(g.acceptStats(key, 100 * H, 48).n, 0);
    // other direction / type / symbol are other groups
    // the other direction has no closes at all: a group of its own, valid until it has a sample
    assert.equal(
      g.accepts(acceptKey("sig-ema-cross-s@m15", "A-USDT", -1, "normal"), 5 * H, A),
      true,
    );
    assert.equal(g.acceptStats(acceptKey("sig-ema-cross-s@m15", "A-USDT", -1, "normal"), 5 * H, 48).n, 0, "and it is its own group");
    assert.equal(
      g.accepts(acceptKey("sig-ema-cross-m@m30", "A-USDT", 1, "normal"), 5 * H, A),
      true,
      "lanes and ranges of a source pool",
    );
  });

  it("is on at PF 1.3 over 48 h by default and validated", () => {
    assert.deepEqual(DEFAULT_SIGNALS.accept, {
      enabled: true,
      minPf: 1.3,
      hours: 48,
      minTrades: 6,
    });
    assert.equal(signalSettings({ accept: { minPf: 0.5 } as never }).accept.minPf, 1);
    assert.equal(signalSettings({ accept: { enabled: false } as never }).accept.enabled, false);
    assert.throws(() =>
      checkSettings({
        signals: { ...DEFAULT_SIGNALS, accept: { ...DEFAULT_SIGNALS.accept, minPf: 9 } },
      }),
    );
    assert.throws(() =>
      checkSettings({
        signals: { ...DEFAULT_SIGNALS, accept: { ...DEFAULT_SIGNALS.accept, hours: 2 } },
      }),
    );
  });
});

describe("signals: sources switched off after the per-source check", () => {
  it("the strongly negative sources are off by default (older ones and the research ones), the validated ones on", () => {
    for (const n of [
      "aroon",
      "ichi-cloud",
      "bb-walk",
      "r-bos",
      "r-vortex",
      "r-fvg",
      "r-vwap-reclaim",
      "r-elder",
    ])
      assert.equal(signalSettings({}).sources[n], false, n);
    for (const n of [
      "keltner",
      "donchian",
      "s2-block-scale",
      "r-vol-regime",
      "r-linreg",
      "r-fractal",
    ])
      assert.notEqual(signalSettings({}).sources[n], false, n);
    // a user's explicit choice still wins
    assert.equal(signalSettings({ sources: { aroon: true } }).sources.aroon, true);
  });
});

describe("hour-window validation: too few closes → twice the hours → still too few = valid", () => {
  it("acceptOnWindow: enough closes judge the window; too few widen it; too few there count as valid", async () => {
    const { acceptOnWindow } = await import("./signals.ts");
    const o = { minPf: 1.3, hours: 24, minTrades: 20 };
    // a full window decides on its own
    assert.equal(acceptOnWindow(() => ({ n: 25, pf: 1.5 }), o), true);
    assert.equal(acceptOnWindow(() => ({ n: 25, pf: 0.9 }), o), false);
    // a short window widens to 48 h; a losing 48 h with enough closes is refused, a winning one accepted
    const at = (n24: number, n48: number, pf48: number) => (h: number) =>
      h <= 24 ? { n: n24, pf: 0.5 } : { n: n48, pf: pf48 };
    assert.equal(acceptOnWindow(at(5, 30, 0.8), o), false, "48 h has a sample and it loses");
    assert.equal(acceptOnWindow(at(5, 30, 1.6), o), true, "48 h has a sample and it wins");
    // still too few in 48 h: no sample to judge — valid, whatever the few closes did
    assert.equal(acceptOnWindow(at(5, 12, 0.2), o), true);
    assert.equal(acceptOnWindow(at(0, 0, 0), o), true);
    // the wider window is exactly twice the hours
    const seen: number[] = [];
    acceptOnWindow((h) => (seen.push(h), { n: 0, pf: 0 }), o);
    assert.deepEqual(seen, [24, 48]);
  });

  it("signals and engine directions follow the same rule (a sparse signal group is no longer refused)", async () => {
    const { SignalGuard, EngineSideIndex } = await import("./signals.ts");
    const H = 3_600_000;
    const t0 = 1000 * H;
    const a = { enabled: true, minPf: 1.3, hours: 48, minTrades: 6 };
    const g = new SignalGuard();
    // three losing closes in the last 48 h, nothing before: too few in 48 h and in 96 h → valid
    for (const k of [1, 2, 3]) g.addAccept("grp", -0.01, t0 - k * H);
    assert.equal(g.accepts("grp", t0, a), true, "a sparse group is valid until it has a sample");
    // six more losing closes 60–70 h back: 96 h now holds 9 ≥ 6 losers → refused
    for (const k of [60, 62, 64, 66, 68, 70]) g.addAccept("grp", -0.01, t0 - k * H);
    assert.equal(g.accepts("grp", t0, a), false, "the wider window has a sample, and it loses");
    // engine directions: the same rule through EngineSideIndex
    const idx = new EngineSideIndex();
    const exitT = new Float64Array([t0 - 50 * H, t0 - 40 * H, t0 - 30 * H]);
    const tape = { ind: "trend-ema", kind: "normal", protect: { tag: "sh" }, n: 3, side: new Int8Array([1, 1, 1]), exitT, r: new Float64Array([-0.01, -0.01, -0.01]) };
    for (const _ of idx.fill([tape as never]));
    const key = "base|sh|1";
    // 3 h window: nothing; 6 h: nothing → valid
    assert.equal(idx.accepts(key, t0, { minPf: 1.05, hours: 3, minTrades: 2 }), true);
    // 24 h window: nothing; 48 h: 2 losers ≥ 2 → refused
    assert.equal(idx.accepts(key, t0, { minPf: 1.05, hours: 24, minTrades: 2 }), false);
  });
});

describe("signal seats in the session report", () => {
  it("a signal tape is seated only on the symbols its unit is active on (keyed pair × symbol × side)", async () => {
    const { signalSeatSymbols } = await import("./signals.ts");
    const tp = { bot: "follow", ind: "sig-swing-m@m15", syms: ["AAA-USDT", "BBB-USDT", "CCC-USDT"] };
    const active = new Set([
      sigActiveKey("follow", "sig-swing-m@m15", "BBB-USDT", 1),
      sigActiveKey("follow", "sig-kama-m@m15", "AAA-USDT", 1),
    ]);
    assert.deepEqual([...signalSeatSymbols(tp, active, 1)], [1]);
    // the long unit of BBB seats no short side (a side-less key seated nothing at all)
    assert.equal(signalSeatSymbols(tp, active, -1).size, 0);
    // a unit on none of the tape's symbols seats nothing (keyed by the pair alone it seated all three)
    assert.equal(signalSeatSymbols(tp, new Set([sigActiveKey("follow", "sig-swing-m@m15", "ZZZ-USDT", 1)]), 1).size, 0);
  });
});

describe("signal side groups: the twice-the-hours fallback is read whole past 2000 entries", () => {
  const H = 3_600_000;
  const rule = { enabled: true, minPf: 1.3, hours: 200, minTrades: 20 };
  // A side group, judged with hours 200 (the 200 h window holds one close, so the rule falls back to 400 h):
  // `losses` losing closes 399–360 h before t0 (inside the 400 h record, older than 336 h before the newest close),
  // `wins` winning closes 340–210 h before t0 (inside 336 h), and one winning close 10 h before t0.
  // The whole 400 h record: 20 wins of +0.02 against the losses of −0.01 → PF far below 1.3, refused.
  function sideGroup(losses: number, wins: number) {
    const g = new SignalGuard();
    const t0 = 1000 * H;
    for (let i = 0; i < losses; i++)
      g.addAccept("side|1", -0.01, t0 - 399 * H + Math.floor((i * 39 * H) / losses), `loss${i}`);
    for (let k = 0; k < wins; k++)
      g.addAccept("side|1", 0.02, t0 - 340 * H + Math.floor((k * 130 * H) / wins), `win${k}`);
    g.addAccept("side|1", 0.02, t0 - 10 * H, "latest");
    return { g, t0 };
  }

  it("a side group with no truncation (2000 entries) is refused on its 400 h record", () => {
    const { g, t0 } = sideGroup(1979, 20);
    assert.equal(g.acceptStats("side|1", t0, 400).n, 2000);
    assert.equal(g.accepts("side|1", t0, rule), false, "PF ~0.02 over 400 h: refused");
  });

  it("a side group past 2000 entries is judged on its whole 2x fallback window (400 h), not on the wins alone", () => {
    const { g, t0 } = sideGroup(1990, 20);
    // 2011 entries, past the 2000 cap the record trims at: the same answer as the untruncated control (refused)
    assert.equal(g.accepts("side|1", t0, rule), false, "the 400 h record loses (PF ~0.02); truncated to 336 h it shows only wins");
    // every one of the 2011 closes lies inside the 400 h the fallback reads
    assert.equal(g.acceptStats("side|1", t0, 400).n, 2011, "the 400 h record keeps every close");
  });
});
