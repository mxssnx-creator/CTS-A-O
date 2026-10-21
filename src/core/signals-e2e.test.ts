// Signals end to end on a synthetic runtime in sources mode "allow" (only the listed sources run): the run builds
// tapes for exactly those sources on both directions, every signal trade belongs to a unit active at its entry,
// the funnel counts the candidates of inactive units by side, signal skips and paper skips are named sig:<why>, and
// the audit is clean. (signals.test covers the default deny mode on the full source list.)
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { configEval, signalConfigEval, signalSetAt } from "./sim/walkforward.ts";
import { sigActiveKey } from "./signals.ts";
import { isSignalInd, laneOf } from "./indications/registry.ts";
import { coordSettings } from "./sim/walkforward.ts";
import { H } from "./test-support.ts";
import { closePool } from "./server/pool.server.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / H) * H);

const ALLOW = ["ema-slope", "atr-break", "bollinger"];
// sig-<source>-s / -m (short / medium range; the lane parser may already have taken the -m)
const srcOf = (ind: string) => laneOf(ind).base.replace(/^sig-/, "").replace(/-(s|m)$/, "");

describe("signals end to end: sources mode allow", { timeout: 600_000 }, () => {
  let rt: CoreRuntime;
  after(async () => {
    rt?.dispose();
    await rt?.backtestsSettled();
    await closePool();
  });
  before(async () => {
    rt = new CoreRuntime(
      new CoreDb(":memory:"),
      {
        symbols: 3,
        historyDays: 18,
        tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 },
        // Signal lifecycle fixture: keep unrelated engine grids bounded, without reducing Signal cells/history.
        focus: ["follow|ema-9-21@m15"],
        mainTop: 10,
        refineTop: 4,
        evalTop: 6,
        cycleMs: 60_000,
        pinned: [],
        disabledKinds: ["micro", "inverse"],
        exitStrategy: { includeMicro: false },
        grid: { tp: [0.02], slOfTp: [1], trailOfTp: [0, 0.5], holdH: [4],
          micro: false, minimal: false, minimalPlus: false, short: false, general: false, long: false },
        signals: signalSettings({
          enabled: true,
          count: 0,
          minTrades: 1,
          rank: "net",
          minBlockShare: 0,
          validate: false,
          filter: { trendH: 0, volFloor: 0 },
          accept: { ...DEFAULT_SIGNALS.accept, enabled: false },
          sideAccept: { ...DEFAULT_SIGNALS.sideAccept, enabled: false },
          coordination: { ...DEFAULT_SIGNALS.coordination, enabled: false },
          sourcesMode: "allow",
          sources: Object.fromEntries(ALLOW.map((s) => [s, true])),
        }),
      } as never,
      { market: "synthetic" },
    );
    // A source's synthetic price path need not qualify. Controlled passing histories and both-side execution
    // are covered by signal-pf15.test; this runtime fixture retains its own Base PF and sample gates.
    rt.updateSettings({}, {
      lastN: 0,
      validLastN: 0,
      signalValidLastN: 0,
      symGate: "off",
      coord: coordSettings({ enabled: false }),
    });
    rt.start();
    const t0 = Date.now();
    while (!(rt.status.computes >= 1 && rt.status.state === "running" && rt.audit !== null)) {
      if (Date.now() - t0 > 400_000) throw new Error("timeout");
      await new Promise((r) => setTimeout(r, 25));
    }
    rt.stop();
  });

  it("only the allowed sources run, each on every lane and range, with tapes on both directions", () => {
    const st = rt.status.signals!;
    assert.equal(st.combos, ALLOW.length * 2 * DEFAULT_SIGNALS.lanes.length);
    const sig = rt.tapes.filter((t) => isSignalInd(t.ind));
    assert.ok(sig.length > 0, "signal tapes built");
    const sources = new Set(sig.map((t) => srcOf(t.ind)));
    assert.deepEqual([...sources].sort(), [...ALLOW].sort(), `sources with tapes: ${[...sources]}`);
    for (const s of ALLOW) {
      const sides = new Set(
        sig.filter((t) => srcOf(t.ind) === s).flatMap((t) => Array.from(t.side)),
      );
      assert.ok(
        sides.has(1) && sides.has(-1),
        `${s}: tape positions on both directions (${[...sides]})`,
      );
    }
  });

  it("every signal trade belongs to a unit active at its entry; the funnel counts the rest by side", () => {
    const sim = rt.sim!;
    const steps = sim.signalSteps!;
    const trades = sim.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? ""));
    const failures: Record<string, number> = {};
    for (const tp of rt.tapes.filter(t => isSignalInd(t.ind))) {
      const ev = configEval(tp, sim.startT, rt.wf);
      for (const c of ev.contexts ?? []) if (!c.evaluation.ok) failures[c.evaluation.fail] = (failures[c.evaluation.fail] ?? 0) + 1;
    }
    assert.ok(sim.signalFunnel!.candidates > 0, "the runtime calculates real source candidates");
    if (!trades.length) {
      assert.ok(Object.values(failures).some(n => n > 0), "empty execution retains explicit own Base failure evidence");
      assert.ok(sim.signalFunnel!.inactive > 0, "unqualified source candidates stay inactive");
    }
    for (const step of steps) for (const key of step.keys) {
      const tp = rt.tapes.find(t => key.endsWith(`|cfg=${encodeURIComponent(t.id)}`));
      assert.ok(tp, "activation preserves its exact config identity");
      // Check the tape's own contexts; no active key may come from a pooled or failed sibling.
      const ownKeys = [...new Set(tp.syms)].flatMap(sym => [1, -1].filter(side => signalConfigEval(tp, step.t, rt.wf, sym, side).ok).map(side => sigActiveKey(tp.bot, tp.ind, sym, side, tp.kind, tp.id)));
      assert.ok(ownKeys.includes(key));
    }
    const tradeSources = new Set(trades.map((x) => srcOf(x.cfg.split("|")[1] ?? "")));
    assert.ok([...tradeSources].every((source) => ALLOW.includes(source)), `executed sources: ${[...tradeSources]}`);
    for (const x of trades) {
      const [bot, ind] = x.cfg.split("|");
      assert.ok(signalSetAt(steps, x.entryT)!.has(sigActiveKey(bot, ind, x.sym, x.side, x.kind, x.cfg)), x.cfg);
    }
    const f = sim.signalFunnel!;
    assert.ok(f, "funnel reported");
    assert.ok(f.candidates >= trades.length + f.inactive, `candidates ${f.candidates}`);
    assert.equal(f.inactiveBySide["1"] + f.inactiveBySide["-1"], f.inactive);
  });

  it("signal skips and paper skips carry the sig: prefix; the audit is clean", () => {
    const sim = rt.sim!;
    const sigSkipKeys = Object.keys(sim.skips ?? {}).filter((k) => /^sig:/.test(k));
    const engineNamedSignal = Object.keys(sim.skips ?? {}).filter(
      (k) => /signal/i.test(k) && !k.startsWith("sig:"),
    );
    assert.deepEqual(engineNamedSignal, [], "signal reasons not under sig:");
    void sigSkipKeys;
    for (const k of Object.keys(rt.status.paperSkips ?? {}))
      assert.match(k, /^(pending:)?(sig:)?[\w:-]+$/, `paper skip key ${k}`);
    const bad = rt.audit!.checks.filter((c) => !c.ok);
    assert.deepEqual(
      bad.map((c) => c.name),
      [],
    );
  });
});
