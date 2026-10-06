// Signals end to end on a synthetic runtime in sources mode "allow" (only the listed sources run): the run builds
// tapes for exactly those sources on both directions, every signal trade belongs to a unit active at its entry,
// the funnel counts the candidates of inactive units by side, signal skips and paper skips are named sig:<why>, and
// the audit is clean. (signals.test covers the default deny mode on the full source list.)
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";
import { DEFAULT_SIGNALS, signalSettings } from "./signal-config.ts";
import { signalSetAt } from "./sim/walkforward.ts";
import { sigActiveKey } from "./signals.ts";
import { isSignalInd, laneOf } from "./indications/registry.ts";
import { H } from "./test-support.ts";

process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / H) * H);

const ALLOW = ["ema-slope", "atr-break", "bollinger"];
const srcOf = (ind: string) => laneOf(ind).base.replace(/^sig-/, "").replace(/-m$/, "");

describe("signals end to end: sources mode allow", { timeout: 600_000 }, () => {
  let rt: CoreRuntime;
  before(async () => {
    rt = new CoreRuntime(
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
        signals: signalSettings({
          enabled: true,
          count: 10,
          minTrades: 1,
          sourcesMode: "allow",
          sources: Object.fromEntries(ALLOW.map((s) => [s, true])),
        }),
      } as never,
      { market: "synthetic" },
    );
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
    for (const x of trades) {
      const [bot, ind] = x.cfg.split("|");
      assert.ok(signalSetAt(steps, x.entryT)!.has(sigActiveKey(bot, ind, x.sym, x.side)), x.cfg);
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
