import { it } from "node:test";
import assert from "node:assert/strict";
import { captureSignalProgress, signalConfigDetails, signalProgressInventory } from "./signal-progress.mjs";
import { signalSettings } from "../../src/core/signal-config.ts";
import { signalProtects, sigActiveKey } from "../../src/core/signals.ts";
import { configId, makeUniverse } from "../../src/core/pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { signalCoordinationId } from "../../src/core/signal-coordination.ts";
import { signalCoordinationProtects } from "../../src/core/server/runtime.server.ts";
import { buildTapes } from "../../src/core/sim/walkforward.ts";
import { barsFromCandles, syntheticCandles } from "../../src/core/market/bars.ts";
const H = 3_600_000;
it("captures every configured cell separately from actual tapes, active units and executed closes", () => {
  const sig = signalSettings({ sourcesMode: "allow", sources: { "ema-cross": true }, ranges: { short: true, medium: false }, lanes: [15], hist: { enabled: false } });
  const ind = "sig-ema-cross-s@m15";
  const protect = signalProtects(sig).find((x) => x.trailOnly);
  const id = configId("follow", ind, protect);
  const tape = { id, ind, bot: "follow", kind: "trailing-only", protect, n: 3, r: [0.01, 0.02, -0.01],
    entryT: [H / 2, H + 1, H + 3], exitT: [H, H + 2, H + 4], side: [1, 1, -1], syms: ["TEST-USDT"], symI: [0, 0, 0] };
  const key = sigActiveKey("follow", ind, "TEST-USDT", 1, "trailing-only", id);
  const sim = { signalSteps: [{ t: H, keys: [key] }], signalActiveEnd: [key], trades: [
    { cfg: id, side: 1, r: 0.06, mult: 3 },
  ] };
  const rt = { settings: { signals: sig, tfs: [15] }, tapes: [tape], wf: {}, buildStats: [] };
  const p = captureSignalProgress(rt, sim, H, 2 * H);
  assert.equal(p.combos.length, 1);
  assert.equal(p.configs.length, 60, "the actual 3% cap merges aliases; raw requests remain separate");
  assert.equal(p.requestedConfigs.length, 86);
  assert.equal(p.configs.filter((x) => x.built).length, 1);
  const row = p.configs.find((x) => x.id === id);
  assert.equal(row.sides[1].pre.n, 1);
  assert.equal(row.sides[1].runCandidates.n, 1);
  assert.equal(row.sides[-1].runCandidates.n, 1);
  assert.equal(row.sides[1].unitActiveCandidates.n, 1);
  assert.equal(row.sides[-1].unitActiveCandidates.n, 0);
  assert.equal(row.sides[1].executed.gp, 0.02);
  assert.equal(p.configs.find((x) => x.kind === "normal").sides[1].executed.n, 0);
  assert.ok(p.configs.filter((x) => !x.built).every((x) => x.historyCalculated === false && x.sides[1].pre.n === 0));
});
it("accounts for every raw requested cell while deduplicating identical effective hard-floor protections", () => {
  const sig = signalSettings({ sourcesMode: "allow", sources: { "ema-cross": true }, ranges: { short: true, medium: false }, lanes: [1], hist: { enabled: false } });
  const rt = { settings: { signals: sig, tfs: [1] }, tapes: [], wf: {}, buildStats: [], fastArgs: { sig: { floors: { minSl: sig.minSl, minTrail: sig.minTrail } }, adjust: {} } };
  const p = captureSignalProgress(rt, { trades: [] }, H, 2 * H);
  assert.equal(p.requestedConfigs.length, 86);
  assert.equal(p.configs.length, 85, "effective capped identities match the one-minute builder");
  const requested = p.requestedConfigs.filter((x) => x.kind === "trailing-only"), effective = p.configs.filter((x) => x.kind === "trailing-only");
  assert.equal(requested.length, 9); assert.equal(effective.length, 9);
  assert.equal(effective.reduce((n, x) => n + x.requestedAliases.length, 0), 9);
  assert.ok(effective.every((x) => x.requestedAliases.length === 1));
  assert.ok(effective.every((x) => x.protect.trail >= sig.minTrail));
  assert.ok(effective.every((x) => x.origin === "configured"));
});

it("excludes endpoint marks from the settled modeled-execution sample", () => {
  const sig = signalSettings({ sourcesMode: "allow", sources: { "ema-cross": true }, ranges: { short: true, medium: false }, lanes: [15] });
  const rt = { settings: { signals: sig, tfs: [15] }, tapes: [], wf: {}, buildStats: [] };
  const id = [...signalProgressInventory(rt).configured.keys()][0];
  const p = captureSignalProgress(rt, { trades: [
    { cfg: id, side: 1, r: .01, unitR: .01, markedOpen: true },
    { cfg: id, side: 1, r: -.02, unitR: -.02 },
  ] }, H, 2 * H);
  const actual = p.configs.find(x => x.id === id).sides[1].executed;
  assert.equal(actual.n, 1); assert.equal(actual.gp, 0); assert.equal(actual.gl, .02);
});

it("preserves coordination input masks independently of strategy and protection ranges", () => {
  const sources = ["ema-cross", "bb-walk", "aroon"];
  for (const [mask, expected] of [[1, "short"], [2, "medium"], [3, "short+medium"]]) {
    const ind = signalCoordinationId(sources, .6, 3, mask) + "@m15";
    const protect = { tp: .01, sl: .02, trail: .003, hold: 4, tag: "gn" };
    const info = signalConfigDetails(configId("follow", ind, protect), protect, "trailing");
    assert.equal(info.range, expected); assert.equal(info.strategyRange, "Signals");
    assert.equal(info.protectionRange, "gn");
    assert.equal(signalConfigDetails(configId("follow", ind, protect), protect, "exit").strategyRange, "Exit");
  }
});

it("matches the actual builder's full capped source and coordination catalog on 1m and 15m lanes", () => {
  const sources = { "ema-cross": true, "bb-walk": true, "aroon": true };
  for (const tf of [1, 15]) {
    const sig = signalSettings({ sourcesMode: "allow", sources, ranges: { short: true, medium: false }, lanes: [tf], hist: { enabled: false } });
    const settings = { ...DEFAULT_SETTINGS, signals: sig, tfs: [tf] };
    const inventory = signalProgressInventory({ settings, wf: {} });
    const u = makeUniverse([barsFromCandles("TEST-USDT", tf, syntheticCandles("TEST-USDT", tf, 1600, 200 * H))]);
    for (const combo of [inventory.combos[0], inventory.combos.find(c => c.ind.includes("sig-coord-"))]) {
      const protects = combo.ind.includes("sig-coord-") ? signalCoordinationProtects(settings.grid, settings.cost, sig.coordination.ranges) : signalProtects(sig);
      const tapes = buildTapes(u, protects, settings.cost, undefined, new Set([`${combo.bot}|${combo.ind}`]), null, null,
        { minSl: sig.minSl, minTrail: sig.minTrail, signalReferenceGrid: true, signalTrailMax: sig.trailMax });
      const actual = new Map(tapes.map(t => [t.id, t.protect]));
      const reported = new Map([...inventory.configured.values()].filter(x => x.ind === combo.ind).map(x => [x.id, x.protect]));
      assert.deepEqual(reported, actual, `exact identities/protections on ${combo.ind}`);
      assert.ok(actual.size > 0);
    }
  }
});
it("captures all 288 hourly candidate cells and partitions right-closed hours without changing selection", () => {
  const sig = signalSettings({ sourcesMode: "allow", sources: { "ema-cross": true }, ranges: { short: true, medium: true }, lanes: [1, 5, 15, 30], hist: { enabled: false } });
  const ind = "sig-ema-cross-s@m15";
  const protect = signalProtects(sig).find((x) => x.trailOnly);
  const id = configId("follow", ind, protect);
  const tape = { id, ind, bot: "follow", kind: "trailing-only", protect, n: 7, r: [.01, .02, -.01, NaN, .04, .05, .06],
    entryT: [H / 2, H, H, H, H, 7 * H, H / 2], exitT: [H, 2 * H, 2 * H + 1, 3 * H, 7 * H, 7 * H, 2 * H],
    side: [1, 1, -1, -1, 1, 1, 1], syms: ["TEST-USDT"], symI: [0, 0, 0, 0, 0, 0, 0] };
  const rt = { settings: { signals: sig, tfs: [1, 5, 15, 30] }, tapes: [tape], wf: {}, buildStats: [] };
  const p = captureSignalProgress(rt, { trades: [] }, H, 7 * H);
  assert.equal(p.hourlyCandidates.length, 288);
  assert.equal(new Set(p.hourlyCandidates.map((x) => [x.hour, x.kind, x.range, x.lane, x.combined, x.side].join("|"))).size, 288);
  const cell = (hour, side) => p.hourlyCandidates.find((x) => x.hour === hour && x.kind === "trailing-only" && x.range === "short" && x.lane === 15 && x.side === side);
  assert.equal(cell(0, 1).n, 1); assert.equal(cell(0, 1).gp, .02);
  assert.equal(cell(1, -1).n, 2); assert.equal(cell(1, -1).unknownReturns, 1); assert.equal(cell(1, -1).pf, null);
  assert.equal(cell(5, 1).n, 1); assert.equal(cell(5, 1).gp, .04);
  assert.equal(cell(4, 1).n, 0); assert.equal(cell(4, 1).pf, null);
  assert.equal(p.hourlyCandidates.reduce((n, x) => n + x.n, 0), 4);
  const all = p.configs.flatMap((x) => Object.values(x.sides).map((s) => s.runCandidates));
  for (const key of ["n", "w", "unknownReturns"])
    assert.equal(p.hourlyCandidates.reduce((n, x) => n + x[key], 0), all.reduce((n, x) => n + x[key], 0));
});
