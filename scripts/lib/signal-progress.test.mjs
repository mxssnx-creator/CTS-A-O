import { it } from "node:test";
import assert from "node:assert/strict";
import { captureSignalProgress } from "./signal-progress.mjs";
import { signalSettings } from "../../src/core/signal-config.ts";
import { signalProtects, sigActiveKey } from "../../src/core/signals.ts";
import { configId } from "../../src/core/pipeline/pipeline.ts";
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
  assert.equal(p.configs.length, 86);
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
  assert.equal(p.configs.length, 86);
  const requested = p.requestedConfigs.filter((x) => x.kind === "trailing-only"), effective = p.configs.filter((x) => x.kind === "trailing-only");
  assert.equal(requested.length, 9); assert.equal(effective.length, 9);
  assert.equal(effective.reduce((n, x) => n + x.requestedAliases.length, 0), 9);
  assert.ok(effective.every((x) => x.requestedAliases.length === 1));
  assert.ok(effective.every((x) => x.protect.trail >= sig.minTrail));
  assert.ok(effective.every((x) => x.origin === "configured"));
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
