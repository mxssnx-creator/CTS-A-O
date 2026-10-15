import { it } from "node:test";
import assert from "node:assert/strict";
import { rangeStudyProtocol, assertStudyProtocol, rangeStudyIdentityUniverse, studyJson, deepStudyMerge } from "./range-study.mjs";

const frozenAt = "2026-10-15T08:02:47.279Z";
it("requires the exact existing regular/combined focus and three actually distinct profiles", () => {
  const p = rangeStudyProtocol(frozenAt);
  assert.equal(p.baseIds.length, 16);
  assert.equal(p.focus.length, 32);
  assert.ok(p.focus.every((x) => /@m15c?$/.test(x)));
  assert.deepEqual(p.commonSettings.tfs, [15, 30]);
  assert.equal(p.commonSettings.disabledKinds.includes("tactic"), false);
  assert.equal(new Set(p.profiles.map((x) => studyJson({ settings: x.settings, wf: x.wf }))).size, 3);
  assertStudyProtocol(p);
  const changed = structuredClone(p); changed.commonSettings.focus = [];
  assert.throws(() => assertStudyProtocol(changed), /differs/);
});
it("keeps full effective identity universes and PF/sample/cost gates identical across profiles", () => {
  const p = rangeStudyProtocol(frozenAt);
  const universes = p.profiles.map((x) => rangeStudyIdentityUniverse(p, x));
  assert.ok(universes[0].configurations.length > 50_000);
  const ids = universes[0].configurations.map((x) => x.id);
  for (const u of universes) {
    assert.deepEqual(u.configurations.map((x) => x.id), ids);
    assert.deepEqual(u.settings.gates, p.gates);
    assert.equal(u.settings.cost, p.cost);
    for (const key of ["micro", "minimal", "short"]) {
      assert.deepEqual(u.settings.grid[key].tp, p.fullGridDefaults[key].tp);
      assert.deepEqual(u.settings.grid[key].slOfTp, p.fullGridDefaults[key].slOfTp);
      assert.deepEqual(u.settings.grid[key].trailOfTp, p.fullGridDefaults[key].trailOfTp);
    }
    assert.ok(u.configurations.every((x) => /@m15c?\|/.test(x.id)));
  }
  assert.equal(new Set(universes.map((x) => x.settingsVersion)).size, 3);
});
it("keeps historical indicator initialization outside the evaluated entry window", () => {
  const p = rangeStudyProtocol(frozenAt);
  for (const f of p.folds) {
    assert.equal(f.evaluationFromT - f.indicatorStartT, 205 * 3_600_000);
    assert.equal(f.tradeStartT - f.evaluationFromT, 72 * 3_600_000);
    assert.equal(f.endT - f.tradeStartT, 6 * 3_600_000);
  }
  const base = { a: { ladder: [1, 2], gate: 12 }, flag: false };
  const merged = deepStudyMerge(base, { a: { ladder: [3] }, flag: true });
  assert.deepEqual(merged, { a: { ladder: [3], gate: 12 }, flag: true });
  assert.deepEqual(base.a.ladder, [1, 2]);
});
