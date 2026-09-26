// Runtime coordination tests on the synthetic feed (no network): races between cycles, settings, stop,
// resync and the watchdog; plus a responsiveness bound on the event loop during a full compute.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { RESEARCH_PRESETS } from "../presets.ts";

const small = { symbols: 4, historyDays: 18, mainTop: 12, refineTop: 4, evalTop: 8, cycleMs: 60_000 };
const mk = () => new CoreRuntime(new CoreDb(":memory:"), small, { market: "synthetic" });
const until = async (cond: () => boolean, ms = 120_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("runtime coordination", { timeout: 300_000 }, () => {
  it("computes on the synthetic feed and publishes every stage", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    assert.equal(rt.status.source, "synthetic");
    assert.ok(rt.pipeline && rt.sim && rt.tapes.length > 0);
    assert.ok(Number(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM results")?.n) > 300);
    assert.ok(rt.db.kvGet("presetSims"));
    for (const k of ["Pipeline", "Persist", "Tapes", "Simulation", "Compare", "Paper"]) assert.ok(rt.status.phases[k], k);
    // no table is left half-written: shadow tables are gone after the swap
    assert.equal(rt.db.all("SELECT name FROM sqlite_master WHERE name LIKE '%_next'").length, 0);
    rt.stop();
  });

  it("stop during a compute stays stopped and never reschedules", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    const cycles = rt.status.cycles;
    const computes = rt.status.computes;
    rt.stop();
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(rt.status.state, "stopped");
    assert.equal(rt.status.cycles, cycles, "abandoned cycle must not count");
    assert.equal(rt.status.computes, computes, "abandoned compute must not publish");
    // start again resumes
    rt.start();
    await until(() => rt.status.state === "running" && rt.status.cycles > cycles);
    rt.stop();
  });

  it("a settings change during a compute is applied by a follow-up compute, not mid-way", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    rt.updateSettings({ toggles: { ...rt.settings.toggles, dcaActive: false, blockActive: false } });
    await until(() => rt.status.computes >= 2, 180_000);
    assert.equal(rt.sim?.opts.toggles.dcaActive, false);
    assert.equal(rt.sim?.opts.toggles.blockActive, false);
    rt.stop();
  });

  it("resync while busy is applied at the next cycle and rebuilds the universe", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1);
    rt.updateSettings({ symbols: 3 });
    await until(() => rt.status.computes >= 2 && rt.candles.size === 3, 180_000);
    assert.equal(Number(rt.db.get<{ n: number }>("SELECT COUNT(DISTINCT sym) AS n FROM candles")?.n), 3);
    rt.stop();
  });

  it("the watchdog starts a new generation; the abandoned cycle never publishes", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    rt.status.heartbeat = 0; // simulate a stuck loop
    rt.ensureAlive();
    await until(() => rt.status.computes >= 1, 180_000);
    const ev = rt.db.all<{ msg: string }>("SELECT msg FROM events WHERE msg LIKE 'watchdog%'");
    assert.equal(ev.length, 1);
    // exactly one compute run row per finished generation compute
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(Number(rt.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM runs")?.n), rt.status.computes);
    rt.stop();
  });

  it("keeps the event loop responsive during a compute", async () => {
    const rt = mk();
    let worst = 0;
    let last = performance.now();
    const iv = setInterval(() => {
      const now = performance.now();
      worst = Math.max(worst, now - last - 10);
      last = now;
    }, 10);
    rt.start();
    await until(() => rt.status.computes >= 1);
    clearInterval(iv);
    rt.stop();
    assert.ok(worst < 250, `worst stall ${worst.toFixed(0)} ms`);
    for (const [k, v] of Object.entries(rt.status.phases)) assert.ok(v.maxSliceMs < 250, `${k} slice ${v.maxSliceMs.toFixed(0)} ms`);
  });

  it("applies a research preset (tactics, focus, fixed mode) without touching Live, then saves a preset", async () => {
    const rt = mk();
    rt.updateSettings({ live: { ...rt.settings.live, enabled: true } });
    await assert.rejects(async () => rt.savePreset("too early"), /no simulated run/);
    const p = rt.applyPreset(RESEARCH_PRESETS[0].id);
    assert.equal(rt.settings.tfMin, 60);
    assert.deepEqual(rt.settings.toggles, p.settings.toggles);
    assert.equal(rt.wf.lastN, p.wf.lastN);
    assert.equal(rt.settings.focus.length, p.settings.focus!.length);
    assert.equal(rt.wf.mode, "fixed");
    assert.equal(rt.settings.live.enabled, true, "Live is never changed by a preset");
    rt.updateSettings({ symbols: 3 });
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running", 240_000);
    rt.stop();
    assert.ok(rt.tapes.length > 0 && rt.tapes.every((t) => p.settings.focus!.includes(`${t.bot}|${t.ind}`)));
    const saved = rt.savePreset("mine", "test");
    assert.equal(saved.kind, "saved");
    assert.deepEqual(saved.settings.focus, p.settings.focus);
    assert.equal("live" in saved.settings, false);
    assert.ok(rt.savedPresets().some((x) => x.id === saved.id));
    rt.deletePreset(saved.id);
    assert.ok(!rt.savedPresets().some((x) => x.id === saved.id));
  });

  it("stress: a storm of mixed operations always ends in a clean compute with the last settings", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.state === "computing");
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const toggles = ["normal", "trailing", "block", "blockActive", "dca", "dcaActive"] as const;
    for (let i = 0; i < 60; i++) {
      const x = rnd();
      if (x < 0.15) rt.applyPreset(RESEARCH_PRESETS[Math.floor(rnd() * RESEARCH_PRESETS.length)].id);
      else if (x < 0.35) rt.updateSettings({ toggles: { ...rt.settings.toggles, [toggles[Math.floor(rnd() * 6)]]: rnd() < 0.5 } });
      else if (x < 0.5) rt.updateSettings({ tactics: { ...rt.settings.tactics, volRegime: rnd() < 0.5, session: rnd() < 0.3, cooldown: rnd() < 0.3 } });
      else if (x < 0.6) rt.updateSettings({ focus: rnd() < 0.5 ? [] : ["follow|rsi-mom-14-25", "follow|bb-walk@x4", "revert|cci-40-200@x4"] }, { mode: (["fixed", "durable", "hourly"] as const)[Math.floor(rnd() * 3)] });
      else if (x < 0.7) rt.updateSettings({}, { lastN: rnd() < 0.5 ? 0 : 12, maxPerSymbol: 1 + Math.floor(rnd() * 3) });
      else if (x < 0.78) rt.stop();
      else if (x < 0.9) rt.start();
      else if (x < 0.95) rt.kick();
      else rt.requestResync();
      await new Promise((r) => setTimeout(r, rnd() * 60));
    }
    // final, known settings
    rt.updateSettings({ tfMin: 15, focus: [], tactics: { ...rt.settings.tactics, volRegime: true, session: false, cooldown: false }, toggles: { normal: true, trailing: true, block: true, blockActive: true, dca: true, dcaActive: false, axis: true } }, { mode: "durable", lastN: 12 });
    rt.start();
    const at = rt.status.settingsAt;
    await until(() => rt.status.appliedSettingsAt >= at && rt.status.state === "running" && !rt.status.pending, 280_000);
    rt.stop();
    assert.equal(rt.status.error ?? null, null);
    assert.ok(rt.sim && rt.tapes.length > 0);
    assert.equal(rt.sim!.opts.toggles.dcaActive, false);
    assert.equal(rt.wf.mode, "durable");
    // every paper position passes the execution rules of the current settings
    for (const p of rt.paper.positions) assert.ok((p.vol ?? 1) >= 1 && (p.vol ?? 1) <= rt.settings.block.maxMult);
    assert.ok(rt.status.phases.Pipeline && rt.status.phases.Tapes && rt.status.phases.Simulation);
  });

  it("backtests a preset over the last days in the background and keeps the result", async () => {
    const rt = mk();
    const p = RESEARCH_PRESETS[0];
    rt.startPresetBacktest(p.id, 2);
    assert.throws(() => rt.startPresetBacktest(p.id, 3), /a backtest is running/);
    await until(() => rt.backtestJob?.state !== "running", 240_000);
    assert.equal(rt.backtestJob?.state, "done", rt.backtestJob?.error);
    const list = rt.presetBacktests()[p.id];
    assert.equal(list.length, 1);
    const b = list[0];
    assert.equal(b.days, 2);
    assert.equal(b.tfMin, 60);
    assert.ok(b.to - b.from === 2 * 24 * 3_600_000 || b.to - b.from < 2 * 24 * 3_600_000);
    assert.ok(b.successHours >= 0 && b.successHours <= 1);
    assert.equal(b.pass, b.n > 0 && b.pf >= b.minPf && b.ddtH <= b.maxDdtH);
    assert.throws(() => rt.startPresetBacktest("nope", 2), /unknown preset/);
  });
});
