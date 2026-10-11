// Runtime coordination tests on the synthetic feed (no network), part 2: a research preset and its backtests, the stress
// storm, the open-position and entries paths, and the cycle guard (runtime.test.ts has part 1).
import { afterEach, describe, it } from "node:test";
import { allCombos } from "../pipeline/pipeline.ts";
import assert from "node:assert/strict";
import { RESEARCH_PRESETS } from "../presets.ts";
import { isSignalInd, laneOf } from "../indications/registry.ts";
import { signalCombos, signalSettings } from "../signals.ts";
import { mk, stopStarted, until } from "./runtime-harness.ts";
import { baseFocus } from "./runtime.server.ts";
import { microIndRule, rangeMinTfOf } from "../minimal-coord.ts";

afterEach(stopStarted);

describe("runtime coordination", { timeout: 1_200_000 }, () => {
  it("applies a research preset (tactics, focus, fixed mode) without touching Live, then saves a preset", async () => {
    const rt = mk();
    rt.updateSettings({ live: { ...rt.settings.live, enabled: true } });
    await assert.rejects(async () => rt.savePreset("too early"), /no simulated run/);
    const p = rt.applyPreset(RESEARCH_PRESETS[0].id);
    // a research preset's timeframe is normalised: the engine always runs every lane from 1m
    assert.equal(rt.settings.tfMin, 1);
    assert.deepEqual(rt.settings.tfs, [1, 5, 15, 30]);
    assert.deepEqual(rt.settings.toggles, p.settings.toggles);
    assert.equal(rt.wf.lastN, p.wf.lastN);
    assert.equal(rt.settings.focus.length, p.settings.focus!.length);
    assert.equal(rt.wf.mode, "fixed");
    assert.equal(rt.settings.live.enabled, true, "Live is never changed by a preset");
    rt.updateSettings({ symbols: 3 });
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running", 240_000);
    rt.stop();
    // Base evaluates exactly the focus set plus the pinned pairs in every lane (4 timeframes + 3 combined); only
    // pairs passing the Base gate (PF ≥ min) continue to tapes (+ the signal sources, processed alongside)
    const sigCombos = signalCombos(signalSettings(rt.settings.signals), rt.settings.tfs).length;
    // (the runtime's own Base set: the Base focus, and no Micro combo below Micro's lane floor, grid.micro.minTf)
    const microFloor = microIndRule(rt.settings.grid) ? (rangeMinTfOf(rt.settings.grid).mc ?? 0) : 0;
    assert.equal(
      rt.status.baseEvaluated,
      allCombos(baseFocus(rt.settings), rt.settings.disabledKinds, rt.settings.tfs, microFloor).length + sigCombos,
    );
    // every tape is a pair of the preset's focus, a pinned pair, or one of Micro's own lane pairs (baseFocus adds them)
    const ownFocus = baseFocus(rt.settings);
    assert.ok(
      rt.tapes.every((t) => {
        if (isSignalInd(t.ind)) return true;
        const base = `${t.bot}|${laneOf(t.ind).base}`;
        const pair = `${t.bot}|${t.ind}`;
        const pin = rt.settings.pinned ?? [];
        return p.settings.focus!.includes(base) || pin.includes(base) || pin.includes(pair) || ownFocus.includes(pair);
      }),
    );
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
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const toggles = ["normal", "trailing", "block", "blockActive", "dca", "dcaActive"] as const;
    for (let i = 0; i < 60; i++) {
      const x = rnd();
      if (x < 0.15)
        rt.applyPreset(RESEARCH_PRESETS[Math.floor(rnd() * RESEARCH_PRESETS.length)].id);
      else if (x < 0.35)
        rt.updateSettings({
          toggles: { ...rt.settings.toggles, [toggles[Math.floor(rnd() * 6)]]: rnd() < 0.5 },
        });
      else if (x < 0.5)
        rt.updateSettings({
          tactics: {
            ...rt.settings.tactics,
            volRegime: rnd() < 0.5,
            session: rnd() < 0.3,
            cooldown: rnd() < 0.3,
          },
        });
      else if (x < 0.6)
        rt.updateSettings(
          {
            focus:
              rnd() < 0.5
                ? []
                : ["follow|rsi-mom-14-25", "follow|bb-walk@x4", "revert|cci-40-200@x4"],
          },
          { mode: (["fixed", "durable", "hourly"] as const)[Math.floor(rnd() * 3)] },
        );
      else if (x < 0.7)
        rt.updateSettings(
          {},
          { lastN: rnd() < 0.5 ? 0 : 12, maxPerSymbol: 1 + Math.floor(rnd() * 3) },
        );
      else if (x < 0.78) rt.stop();
      else if (x < 0.9) rt.start();
      else if (x < 0.95) rt.kick();
      else rt.requestResync();
      await new Promise((r) => setTimeout(r, rnd() * 60));
    }
    // final, known settings
    rt.updateSettings(
      {
        tfMin: 15,
        focus: [],
        tactics: { ...rt.settings.tactics, volRegime: true, session: false, cooldown: false },
        toggles: {
          normal: true,
          trailing: true,
          block: true,
          blockActive: true,
          dca: true,
          dcaActive: false,
          axis: true,
        },
      },
      { mode: "durable", lastN: 12 },
    );
    rt.start();
    const at = rt.status.settingsAt;
    await until(
      () =>
        rt.status.appliedSettingsAt >= at && rt.status.state === "running" && !rt.status.pending,
      280_000,
    );
    rt.stop();
    assert.equal(rt.status.error ?? null, null);
    assert.ok(rt.sim && rt.tapes.length > 0);
    assert.equal(rt.sim!.opts.toggles.dcaActive, false);
    assert.equal(rt.wf.mode, "durable");
    // every paper position passes the execution rules of the current settings
    // (Overall: every source its own Block, each within maxMult, the stack within 8×)
    const b = rt.settings.block;
    const cap = b.mode === "overall" ? 8 : b.maxMult;
    const { kindOfId } = await import("../pipeline/pipeline.ts");
    for (const p of rt.paper.positions) {
      // the Block multiple is what the stack caps. A DCA / Axis position's `vol` also carries its ladder weight
      // (a 3-leg ladder at a 3× Block multiple holds 9 units), so the cap is asserted on `mult` there.
      const ladder = kindOfId(p.cfg).startsWith("dca") || kindOfId(p.cfg) === "axis";
      const mult = (p as { mult?: number }).mult ?? p.vol ?? 1;
      assert.ok(mult >= 1 - 1e-9 && mult <= cap + 1e-9, `${p.cfg} mult ${mult}`);
      if (!ladder) assert.ok((p.vol ?? 1) >= 1 && (p.vol ?? 1) <= cap + 1e-9, `${p.cfg} vol ${p.vol}`);
      for (const v of Object.values(p.legs ?? {})) assert.ok((v ?? 0) <= b.maxMult - 1 + 1e-9, `leg ${v}`);
    }
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
    assert.equal(b.tfMin, 1);
    assert.ok(b.to - b.from === 2 * 24 * 3_600_000 || b.to - b.from < 2 * 24 * 3_600_000);
    assert.ok(b.successHours >= 0 && b.successHours <= 1);
    assert.equal(b.pass, b.n > 0 && b.pf >= b.minPf && b.ddtH <= b.maxDdtH);
    // the diagrams and the info line are cached per preset (durable key), aligned on one time axis
    const s = rt.presetSeries(p.id)!;
    assert.ok(s, "diagrams cached");
    assert.equal(s.days, 2);
    assert.ok(s.t.length > 10 && s.t.length <= 401);
    for (const k of ["balance", "equity", "ddPct", "positions", "orders"] as const) assert.equal(s[k].length, s.t.length, k);
    for (const k of Object.keys(s.kinds) as Array<keyof typeof s.kinds>) assert.equal(s.kinds[k].length, s.t.length, k);
    assert.equal(b.posPerHour, s.info.posPerHour);
    assert.ok(s.info.posPerHour >= 0 && s.info.ddtH >= 0);
    assert.ok(s.info.positions <= b.n);
    assert.throws(() => rt.startPresetBacktest("nope", 2), /unknown preset/);
    // "backtest all": queued one after another, only presets without diagrams over the range
    const queued = rt.queuePresetBacktests(2, true);
    assert.ok(queued >= 1);
    assert.ok(!rt.backtestQueue.some((q) => q.id === p.id), "a preset with diagrams over the range is skipped");
    assert.equal(rt.backtestJob?.state, "running");
    rt.backtestQueue.length = 0;
    await until(() => rt.backtestJob?.state !== "running", 240_000);
    // editing a saved preset or deleting it drops its diagrams; the 30-day maximum is enforced
    rt.startPresetBacktest(p.id, 99);
    assert.equal(rt.backtestJob?.days, 30);
    await until(() => rt.backtestJob?.state !== "running", 600_000);
  });

  it("a set holding an open position stays processed until it closes, even when no longer selected", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    const tp = rt.tapes.find((t) => t.open.length > 0);
    assert.ok(tp, "a tape with an open position");
    const op = tp!.open[0];
    rt.paper.positions = [{ ...op, vol: 1.4, level: 2 }];
    // nothing is selected any more and every cap is at its minimum
    rt.wf = {
      ...rt.wf,
      portfolio: 1,
      maxOpen: 1,
      maxPerSymbol: 1,
      maxPerSide: 1,
      maxPositions: 1,
      bots: ["nonexistent" as never],
      // no active signal either
      signalActive: new Set<string>(),
    };
    (rt as unknown as { stepPaper(): void }).stepPaper();
    const kept = rt.paper.positions.find(
      (p) => p.cfg === op.cfg && p.sym === op.sym && p.entryT === op.entryT,
    );
    assert.ok(kept, "the held position is still processed");
    assert.equal(kept!.vol, 1.4, "it keeps its volume");
    // regression: the deselected set's OTHER tape positions were never taken and must not appear (they
    // bypassed every cap and grew the paper book to hundreds of positions)
    const sel = new Set(rt.paper.selected);
    for (const p of rt.paper.positions)
      assert.ok(
        sel.has(p.cfg) || (p.cfg === op.cfg && p.sym === op.sym && p.entryT === op.entryT),
        `${p.cfg}@${p.sym} was never held and its set is not selected`,
      );
    const fresh = rt.paper.positions.filter((p) => !(p.cfg === op.cfg && p.sym === op.sym));
    assert.ok(fresh.length <= 1, `caps hold for new entries (${fresh.length})`);
  });

  it("a stop the live tick crosses while the paper step runs in slices stays crossed in the new book", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    const tp = rt.tapes.find((t) => t.open.length > 0);
    assert.ok(tp, "a tape with an open position");
    const op = tp!.open[0];
    const self = rt as unknown as { stepPaperGen(): Generator<number, void> };
    const book = () => [{ ...op, vol: 1, level: 0 }];
    rt.db.kvSet("stopHits", {});
    // the first step writes every row; the steps after it only what changed (fewer slices): the dry run that counts
    // the slices is a step after the first
    rt.paper.positions = book();
    for (const _ of self.stepPaperGen());
    // a dry run counts the slices
    rt.paper.positions = book();
    let n = 0;
    for (const _ of self.stepPaperGen()) n++;
    assert.ok(n > 0);
    // again: the tick crosses the held position's stop at the last slice (after the new book was built)
    rt.paper.positions = book();
    const old = rt.paper.positions[0] as { stopHit?: number };
    let i = 0;
    for (const _ of self.stepPaperGen()) if (++i === n) old.stopHit = 12345;
    const kept = rt.paper.positions.find(
      (p) => p.cfg === op.cfg && p.sym === op.sym && p.entryT === op.entryT,
    ) as { stopHit?: number } | undefined;
    assert.ok(kept, "the held position is still in the book");
    assert.equal(kept!.stopHit, 12345, "its tick-time stop crossing is carried over");
  });

  it("entries mode: the live validation holds back the pending entries of a config that fails it", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    const R = rt as unknown as {
      liveEntryGate: ((tp: { id: string }) => boolean) | null;
      pendingEntries(): Array<{ cfg: string }>;
    };
    R.liveEntryGate = null;
    const open = R.pendingEntries();
    R.liveEntryGate = () => false;
    assert.equal(R.pendingEntries().length, 0, "every config failing live validation: no entry");
    if (open.length) {
      const held = open[0].cfg;
      R.liveEntryGate = (tp) => tp.id !== held;
      assert.ok(R.pendingEntries().every((e) => e.cfg !== held));
    }
  });

  it("a held position closing on its tape is recorded although a later gate drops it from the re-simulation", async () => {
    const rt = mk();
    rt.start();
    await until(() => rt.status.computes >= 1 && rt.status.state === "running");
    rt.stop();
    const sim = rt.sim!;
    // a closed tape trade inside the simulated window, held as a paper position before this step
    const tp = rt.tapes.find((t) => t.n > 0 && t.exitT[t.n - 1] >= sim.startT && t.entryT[t.n - 1] >= sim.startT);
    assert.ok(tp, "a tape with a close in the window");
    const i = tp!.n - 1;
    const op = {
      cfg: tp!.id,
      sym: tp!.syms[tp!.symI[i]],
      side: tp!.side[i] as 1 | -1,
      entryT: tp!.entryT[i],
      entryI: 0,
      entry: tp!.entry[i],
      stop: 0,
      target: 0,
      peak: 0,
      trailOn: false,
      mtm: 0,
    };
    rt.paper.positions = [{ ...op, vol: 2, level: 0, heldAt: op.entryT + 7 * 60_000 }];
    // the re-simulation no longer takes it (as after a gate was added)
    (sim as { trades: unknown[] }).trades = sim.trades.filter(
      (x) => !(x.cfg === op.cfg && x.sym === op.sym && x.entryT === op.entryT),
    );
    (rt as unknown as { stepPaper(): void }).stepPaper();
    const row = rt.db.get<{ r: number; exit_t: number }>(
      "SELECT r, exit_t FROM paper_trades WHERE cfg = ? AND sym = ? AND entry_t = ?",
      op.cfg,
      op.sym,
      op.entryT,
    );
    assert.ok(row, "its close is recorded");
    assert.equal(row!.exit_t, tp!.exitT[i]);
    assert.ok(Math.abs(row!.r - tp!.r[i] * 2) < 1e-12, "at the volume it was held with");
    // the book's own record: the position it held, its close, and when the book first held it (entry delay 7 min)
    const own = rt.db.get<{ r: number; exit_t: number; held_at: number; reason: string }>(
      "SELECT r, exit_t, held_at, reason FROM paper_book_trades WHERE cfg = ? AND sym = ? AND side = ? AND entry_t = ?",
      op.cfg,
      op.sym,
      op.side,
      op.entryT,
    );
    assert.ok(own, "the book records the position it held");
    assert.equal(own!.exit_t, tp!.exitT[i]);
    assert.ok(Math.abs(own!.r - tp!.r[i] * 2) < 1e-12);
    assert.equal(own!.held_at - op.entryT, 7 * 60_000);
  });

  it("never runs two cycles at once, however often a recompute is requested", async () => {
    const rt = mk();
    let running = 0;
    let maxRunning = 0;
    const orig = rt.cycle.bind(rt);
    rt.cycle = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      try {
        await orig();
      } finally {
        running--;
      }
    };
    rt.start();
    await until(() => rt.status.state === "computing");
    for (let i = 0; i < 20; i++) {
      rt.kick();
      await new Promise((r) => setTimeout(r, 30));
    }
    await until(() => rt.status.computes >= 2 && rt.status.state === "running", 240_000);
    rt.stop();
    // an overlapping call returns immediately at the busy guard; real work never overlaps
    assert.ok(rt.status.computes >= 2);
    assert.ok(maxRunning <= 2, `overlap ${maxRunning}`);
  });
});

