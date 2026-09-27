// Signals processing: sources, combos, the 15 Normal + 15 Trailing configs, the active ranking, the last-8 guard,
// settings and the engine running with signals on.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeSignals,
  DEFAULT_SIGNALS,
  guardKey,
  mergeSignals,
  signalCombos,
  signalProtects,
  signalSettings,
  SignalGuard,
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
  execDecision,
  feedBooks,
  type ConfigTape,
} from "./sim/walkforward.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { CoreDb } from "./server/db.server.ts";

const on = signalSettings({ enabled: true });
const why = (d: object) => ("why" in d ? d.why : "");

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
    // sources × 2 ranges × default lanes 1 / 5 / 15 (short ranges included)
    assert.equal(c.length, SIGNAL_SOURCES.length * 2 * 3);
    assert.ok(c.every((x) => x.bot === "follow" && isSignalInd(x.ind)));
    // a source off, a range off, a lane the engine does not run
    const off = signalSettings({
      enabled: true,
      sources: { "ema-cross": false },
      ranges: { short: true, medium: false },
      lanes: [5, 60],
    });
    assert.equal(signalCombos(off, [1, 5, 15, 30]).length, SIGNAL_SOURCES.length - 1);
  });

  it("15 Normal + 15 Trailing configs, medium to high targets, trailing stops wider", () => {
    const p = signalProtects(on);
    const normal = p.filter((x) => x.trail === 0);
    const trailing = p.filter((x) => x.trail > 0);
    assert.equal(normal.length, 15);
    assert.equal(trailing.length, 15);
    assert.equal(new Set(p.map((x) => `${x.tp}|${x.sl}|${x.trail}`)).size, 30, "all distinct");
    for (const x of p) assert.ok(x.tp >= 0.015 && x.hold > 0);
    for (const x of trailing) assert.ok(x.sl >= 2 * x.tp - 1e-9, "trailing stops at 2 × target");
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
    assert.deepEqual([...a], ["follow|sig-sar-m@m5|A", "follow|sig-ema-cross-s@m15|A"]);
    assert.equal(activeSignals(runs, { ...net, count: 1, minTrades: 3 }).size, 1);
  });

  it("drawdown ranking (default): net ÷ max drawdown, only signals positive in enough 4-hour blocks", () => {
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
    assert.equal(on.rank, "drawdown");
    assert.deepEqual(
      [...activeSignals(runs, { ...on, count: 10 })],
      ["follow|sig-b-s@m5|A", "follow|sig-a-s@m5|A"],
    );
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
      signalActive: new Set(["follow|sig-ema-cross-s@m15|A"]),
      signalGuardN: 8,
    };
    const tp = {
      id: "x",
      bot: "follow",
      ind: "sig-ema-cross-s@m15",
      kind: "normal",
    } as unknown as ConfigTape;
    assert.equal(why(execDecision(tp, 0, o, { sym: "B", side: 1 })), "signalInactive");
    const g = new SignalGuard();
    for (let i = 0; i < 8; i++) g.add(guardKey(tp.id, "A", 1, "normal"), -1);
    assert.equal(why(execDecision(tp, 0, o, { sym: "A", side: 1, guard: g })), "signalGuard");
    // the other direction of the same config is not affected
    assert.equal(g.disabled(guardKey(tp.id, "A", -1, "normal"), 8), false);
  });
});

describe("signals: guards through the feed (as the simulation runs them)", () => {
  const base = () => ({
    ...defaultWalkForward(DEFAULT_SETTINGS),
    signalActive: new Set(["follow|sig-ema-cross-s@m15|A"]),
  });
  const tp = {
    id: "follow|sig-ema-cross-s@m15|tp2|sl2|tr0|h96",
    bot: "follow",
    ind: "sig-ema-cross-s@m15",
    kind: "normal",
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
    const o = { ...b0, signalGuardN: 8, lastN: 0, toggles: { ...b0.toggles, block: false } };
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
  it("active count 10–500 in steps of 10, default 50", () => {
    assert.equal(DEFAULT_SIGNALS.count, 50);
    assert.equal(SIGNAL_COUNT_CHOICES[0], 10);
    assert.equal(SIGNAL_COUNT_CHOICES.at(-1), 500);
    assert.equal(signalSettings({ count: 3 }).count, 10);
    assert.equal(signalSettings({ count: 9999 }).count, 500);
    assert.doesNotThrow(() => checkSettings({ signals: { ...on, count: 120 } }));
    assert.throws(() => checkSettings({ signals: { ...on, count: 125 } }));
    assert.throws(() => checkSettings({ signals: { ...on, count: 600 } }));
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
  it("order caps default to no limit; saved old caps are dropped once, later choices kept", () => {
    const w = defaultWalkForward(DEFAULT_SETTINGS);
    assert.equal(w.maxPerSymbol, 0);
    assert.equal(w.maxPerSide, 0);
    assert.equal(w.maxOpen, 0);
    assert.equal(w.maxPositions, 12, "positions (symbol × direction) stay capped");
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
    assert.equal(rt.settings.signals.perSymbol, 0);
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
    assert.equal(st.combos, SIGNAL_SOURCES.length * 2 * 3);
    assert.ok(st.active > 0 && st.active <= 10, `active ${st.active}`);
    const sigTapes = rt.tapes.filter((t) => isSignalInd(t.ind));
    // every config of every active signal runs (not selected into seats): all of them in the paper selection
    const sel = new Set(rt.paper.selected);
    const activePairs = new Set(
      [...rt.wf.signalActive!].map((k) => k.split("|").slice(0, 2).join("|")),
    );
    for (const t of sigTapes)
      if (activePairs.has(`${t.bot}|${t.ind}`)) assert.ok(sel.has(t.id), t.id);
    assert.equal(sigTapes.length, st.pairs * 30, "15 Normal + 15 Trailing per signal pair");
    // no engine protect grid on signals, no DCA / Axis
    assert.ok(sigTapes.every((t) => t.kind === "normal" || t.kind === "trailing"));
    // every simulated signal trade belongs to an active signal on that symbol
    const active = rt.wf.signalActive!;
    for (const x of rt.sim!.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? "")))
      assert.ok(active.has(`${x.cfg.split("|")[0]}|${x.cfg.split("|")[1]}|${x.sym}`), x.cfg);
    const a = rt.runAudit();
    const bad = a.checks.filter((c) => !c.ok);
    assert.deepEqual(
      bad.map((c) => c.name),
      [],
    );
  });
});
