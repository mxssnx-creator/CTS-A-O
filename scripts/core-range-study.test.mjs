import { it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { studyFeed, studyCaseCommand, studySourceFiles, verifyStudySource } from "./core-range-study.mjs";
import { rangeStudyProtocol, rangeStudyIdentityUniverse, studyJson, studySha256 } from "./lib/range-study.mjs";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
it("prepares only complete cached candles and rejects conflicts rather than preferring a source", () => {
  const candles = Array.from({ length: 3 }, (_, i) => ({ t: i * 60_000, o: 10, h: 11, l: 9, c: 10 + i / 10, v: 1 }));
  const p = { symbols: ["TEST-USDT"] }, fold = { indicatorStartT: 0, evaluationFromT: 60_000, tradeStartT: 120_000, endT: 180_000 };
  const out = studyFeed([{ "TEST-USDT": candles }], p, fold);
  assert.equal(out.quality["TEST-USDT"].bars, 3); assert.equal(out.feed.tickers[0].last, 10.1);
  assert.throws(() => studyFeed([{ "TEST-USDT": candles.slice(1) }], p, fold), /Incomplete/);
  assert.throws(() => studyFeed([{ "TEST-USDT": candles }, { "TEST-USDT": [{ ...candles[1], v: 2 }] }], p, fold), /Conflicting/);
});
it("builds exact frozen-case commands without silently enabling sources or changing gates", () => {
  const p = rangeStudyProtocol("2026-10-15T08:02:47.279Z"), fold = p.folds[0], profile = p.profiles[1];
  const dir = path.resolve("runs/fixture/development-1-P1"), args = studyCaseCommand(p, fold, profile, dir, "engine");
  const value = (flag) => args[args.indexOf(flag) + 1];
  assert.equal(value("--feed"), path.resolve("runs/fixture/development-1/feed.json"));
  assert.equal(value("--pre"), "72"); assert.equal(value("--run"), "6"); assert.equal(value("--signals"), "off");
  const settings = JSON.parse(value("--settings"));
  assert.equal(settings.focus.length, 32); assert.ok(settings.focus.every((x) => /@m15c?$/.test(x)));
  assert.equal(settings.grid.baseTrailCells, true); assert.deepEqual(settings.gates, p.gates);
  assert.deepEqual(settings, rangeStudyIdentityUniverse(p, profile).settings);
  assert.ok(args.includes("--dump-only") && args.includes("--signal-progress") && args.includes("--tape-trades"));
});
it("applies every serialized full profile to a stopped real runtime with the sealed settings/WF identity", () => {
  const p = rangeStudyProtocol("2026-10-15T08:02:47.279Z");
  for (const profile of p.profiles) {
    const universe = rangeStudyIdentityUniverse(p, profile), args = studyCaseCommand(p, p.folds[0], profile, path.resolve("runs/fixture", `development-1-${profile.id}`), "engine");
    const value = (flag) => JSON.parse(args[args.indexOf(flag) + 1]);
    const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 4, signals: { enabled: false } }, { replay: true, priceStream: null });
    rt.stop();
    try {
      rt.updateSettings(value("--settings"));
      rt.updateSettings({}, { preH: p.preH, simH: p.runH, ...value("--wf") });
      assert.deepEqual(rt.settings.tfs, [1, 15, 30]);
      assert.equal(studyJson(rt.settings), studyJson(universe.settings));
      assert.equal(studyJson(rt.wf), studyJson(universe.wf));
      assert.equal(studySha256(studyJson({ settings: rt.settings, wf: rt.wf })), universe.settingsVersion);
      assert.equal(rt.status.state, "stopped");
      assert.equal(rt.status.computes, 0);
    } finally { rt.dispose(); }
  }
});
it("seals the exact production/import inventory while excluding test-only file edits", () => {
  const files = studySourceFiles();
  assert.ok(files.some((x) => x.path === "src/core/sim/walkforward.ts"));
  assert.ok(files.some((x) => x.path === "scripts/lib/core-test-offline-guard.cjs"));
  assert.equal(files.some((x) => x.path.endsWith(".test.ts") || x.path.endsWith(".test.mjs")), false);
  const seal = { status: "frozen", checkpoint: "0".repeat(40), protocolSha256: "p", files, sourceSha256: studySha256(studyJson(files)) };
  verifyStudySource(seal, "p");
  assert.throws(() => verifyStudySource({ ...seal, protocolSha256: "changed" }, "p"), /protocol seal/);
  assert.throws(() => verifyStudySource({ ...seal, files: [], sourceSha256: "bad" }, "p"), /inventory/);
});
