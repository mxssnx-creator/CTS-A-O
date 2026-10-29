import assert from "node:assert/strict";
import { test } from "node:test";
import { presetActionData, presetActionInput, saveCoreSettingsData, saveCoreSettingsInput } from "../api-data.ts";
import { checkMerged, checkSettings } from "../settings-check.ts";
import { DEFAULT_STAGE_CHAIN, mergeStageSettings } from "../sim/stage-settings.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

const globals = globalThis as typeof globalThis & { __ctsCoreRuntime?: CoreRuntime };
async function fixture(run: (rt: CoreRuntime, db: CoreDb) => Promise<void>) {
  const db = new CoreDb(":memory:"), rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  rt.stop(); const previous = globals.__ctsCoreRuntime; globals.__ctsCoreRuntime = rt;
  try { await run(rt, db); }
  finally { if (previous) globals.__ctsCoreRuntime = previous; else delete globals.__ctsCoreRuntime; rt.dispose(); db.db.close(); }
}

test("Settings API saves independent long/short/minimal windows and the actual runtime WF policy", async () => {
  await fixture(async (rt, db) => {
    const mainBefore = structuredClone(rt.settings.stages.main);
    await saveCoreSettingsData(saveCoreSettingsInput({ settings: { stages: { base: { primaryN: 40, secondaryN: 20,
      maxShortRatio: .5, minimal: { enabled: true, n: 3, polarity: "negative" } }, realN: 1,
      negativeMain: { windows: [1, 2, 5, 10], combination: "all" } } } }));
    assert.deepEqual(rt.settings.stages.main, mainBefore, "a Base edit cannot replace Main's policy");
    assert.equal(rt.settings.stages.base.primaryN, 40); assert.equal(rt.settings.stages.base.secondaryN, 20);
    assert.deepEqual(rt.settings.stages.base.minimal, { enabled: true, n: 3, polarity: "negative" });
    assert.equal(rt.settings.stages.realN, 1);
    assert.deepEqual(rt.wf.stages, rt.settings.stages);
    assert.deepEqual(db.kvGet<{ stages: unknown }>("settings")!.stages, rt.settings.stages);
    assert.equal(DEFAULT_STAGE_CHAIN.base.minimal!.n, 1, "editing a runtime cannot mutate factory policy");
  });
});

test("cross-field ratio failures are atomic through direct runtime and Settings API updates", async () => {
  await fixture(async (rt) => {
    const before = structuredClone(rt.settings), wf = structuredClone(rt.wf.stages);
    for (const stage of ["base", "main"] as const) {
      const patch = { stages: { [stage]: { primaryN: 20 } } };
      assert.doesNotThrow(() => checkSettings(patch));
      assert.throws(() => checkMerged(rt.settings, patch), /cannot exceed/);
      assert.throws(() => rt.updateSettings(patch), /cannot exceed/);
      await assert.rejects(() => saveCoreSettingsData(saveCoreSettingsInput({ settings: patch })), /cannot exceed/);
      assert.deepEqual(rt.settings, before); assert.deepEqual(rt.wf.stages, wf);
    }
    for (const stages of [{ base: { maxShortRatio: .51 } }, { main: { secondaryWindows: [5, 5] } },
      { base: { minimal: { n: 4 } } }, { realN: 0 }, { negativeMain: { windows: [3] } }, null]) {
      assert.throws(() => saveCoreSettingsInput({ settings: { stages: stages as never } }));
      assert.deepEqual(rt.settings, before);
    }
  });
});

test("preset stage edits retain the other stage, retire stale PF and reset omitted stage policy on a later apply", async () => {
  await fixture(async (rt, db) => {
    const template = rt.findPreset("live-all-independent")!; assert.ok(template);
    const stages = mergeStageSettings(DEFAULT_STAGE_CHAIN, { base: { secondaryN: 25 }, main: { primaryN: 40, secondaryN: 20 } });
    const own = { ...structuredClone(template), id: "stage-settings-fixture", kind: "saved" as const,
      settings: { stages }, metrics: { ...template.metrics, pf: 1.8, pfBasis: "unit-net-returns" as const,
        unknownReturns: 0, noLoss: false, source: "Declared synthetic historical fixture" } };
    const plain = { ...structuredClone(template), id: "plain-stage-settings-fixture", kind: "saved" as const, settings: {} };
    db.kvSet("presets", [own, plain]);
    const edited = (await presetActionData(presetActionInput({ action: "update", id: own.id,
      settings: { stages: { base: { minimal: { enabled: true, n: 2, polarity: "negative" } } } }, wf: {} })) as unknown as { preset: typeof own }).preset;
    assert.deepEqual(edited.settings.stages.main, stages.main);
    assert.equal(edited.settings.stages.base.secondaryN, 25);
    assert.equal(edited.settings.stages.base.minimal!.n, 2);
    assert.equal(edited.metrics.pf, null); assert.equal(edited.metrics.pfBasis, "unavailable");
    const stored = db.kvGet("presets");
    await assert.rejects(() => presetActionData(presetActionInput({ action: "update", id: own.id,
      settings: { stages: { main: { secondaryN: 25 } } }, wf: {} })), /cannot exceed/);
    assert.deepEqual(db.kvGet("presets"), stored, "a rejected edit cannot replace the saved valid set");
    await presetActionData(presetActionInput({ action: "apply", id: own.id }));
    assert.deepEqual(rt.settings.stages, edited.settings.stages);
    await presetActionData(presetActionInput({ action: "apply", id: plain.id }));
    assert.deepEqual(rt.settings.stages, DEFAULT_STAGE_CHAIN, "an unrelated preset cannot inherit the previous negative minimal gate");
  });
});
