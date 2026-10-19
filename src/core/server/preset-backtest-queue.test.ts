// Scheduler/catalog tests only. Dispatch is observed without running an engine or inventing performance results.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_RESEARCH_PRESETS, type Preset } from "../presets.ts";
import type { PresetSeries } from "../statistics.ts";
import { CoreRuntime } from "./runtime.server.ts";

type Job = NonNullable<CoreRuntime["backtestJob"]>;
type Request = { id: string; days: number };
type QueueInner = { nextQueuedBacktest(): void };
const saved = { id: "saved-queue-fixture", label: "Saved queue fixture", info: "", kind: "saved",
  at: 0, settings: {}, wf: {}, metrics: {} } as Preset;
const catalog = [...ALL_RESEARCH_PRESETS, saved];
const snapshot = (id: string, state: Job["state"]): Job => ({
  id, label: id, days: 2, state, stage: "scheduler fixture", progress: 0, startedAt: 0,
});

function fixture(options: { job?: Job; cachedDays?: Map<string, number>; pending?: Request[] } = {}) {
  // No constructor means no timers, workers, market access or runtime compute. The real queue, catalog lookup
  // and next-job methods run; only the final start dispatch and cached diagram-day metadata are test doubles.
  const rt = Object.create(CoreRuntime.prototype) as CoreRuntime;
  rt.backtestJob = options.job ?? null;
  rt.backtestQueue = [...(options.pending ?? [])];
  rt.savedPresets = () => [saved];
  rt.presetSeries = (id) => {
    const days = options.cachedDays?.get(id);
    return days === undefined ? null : { days } as PresetSeries;
  };
  const requests: Request[] = [];
  rt.startPresetBacktest = (id, days) => {
    requests.push({ id, days });
    rt.backtestJob = { ...snapshot(id, "running"), days };
  };
  const pendingAndStarted = () => [...requests, ...rt.backtestQueue];
  const next = () => (rt as unknown as QueueInner).nextQueuedBacktest();
  return { rt, requests, pendingAndStarted, next };
}

describe("preset backtest queue catalog and dispatch", () => {
  for (const state of ["done", "error"] as const)
    it(`${state}: a prior job remains eligible when its cached window is shorter than requested`, () => {
      const id = ALL_RESEARCH_PRESETS[0].id;
      const { rt, pendingAndStarted } = fixture({ job: snapshot(id, state), cachedDays: new Map([[id, 2]]) });
      assert.equal(rt.queuePresetBacktests(3, true), catalog.length);
      assert.deepEqual(pendingAndStarted(), catalog.map((p) => ({ id: p.id, days: 3 })),
        "a completed/failed prior job cannot hide its insufficient historical coverage");
    });

  it("explicitly rerunning all includes the last completed preset even when its diagrams already cover the window", () => {
    const id = ALL_RESEARCH_PRESETS[0].id;
    const { rt, pendingAndStarted } = fixture({ job: snapshot(id, "done"), cachedDays: new Map([[id, 2]]) });
    assert.equal(rt.queuePresetBacktests(2, false), catalog.length);
    assert.deepEqual(pendingAndStarted(), catalog.map((p) => ({ id: p.id, days: 2 })));
  });

  it("dispatches the complete live, desk, research and saved catalog in order, one job at a time", () => {
    const { rt, requests, next } = fixture();
    assert.equal(rt.queuePresetBacktests(2), catalog.length);
    assert.deepEqual(requests, [{ id: catalog[0].id, days: 2 }]);
    assert.deepEqual(rt.backtestQueue, catalog.slice(1).map((p) => ({ id: p.id, days: 2 })));
    while (rt.backtestQueue.length) {
      assert.ok(requests.length < catalog.length);
      rt.backtestJob!.state = "done";
      next();
    }
    assert.deepEqual(requests, catalog.map((p) => ({ id: p.id, days: 2 })),
      "the real scheduler dispatches every catalog identity; no performance result is fabricated");
  });

  it("onlyMissing excludes sufficient diagram windows and preserves the order of all remaining identities", () => {
    const days = new Map([[catalog[0].id, 3], [catalog[1].id, 2], [saved.id, 4]]);
    const { rt, pendingAndStarted } = fixture({ cachedDays: days });
    const expected = catalog.filter((p) => (days.get(p.id) ?? 0) < 3).map((p) => ({ id: p.id, days: 3 }));
    assert.equal(rt.queuePresetBacktests(3, true), expected.length);
    assert.deepEqual(pendingAndStarted(), expected);
  });

  it("excludes the running identity and an already queued identity without dispatching concurrently", () => {
    const running = catalog[0].id, queued = { id: catalog[1].id, days: 2 };
    const { rt, requests } = fixture({ job: snapshot(running, "running"), pending: [queued] });
    assert.equal(rt.queuePresetBacktests(2), catalog.length - 2);
    assert.deepEqual(requests, []);
    assert.deepEqual(rt.backtestQueue, [queued, ...catalog.slice(2).map((p) => ({ id: p.id, days: 2 }))]);
  });

  it("clamps requested queue days and skips a removed queued identity before the next valid dispatch", () => {
    for (const [requested, expected] of [[0, 1], [99, 30]]) {
      const { rt, pendingAndStarted } = fixture({ pending: [{ id: "removed-queue-fixture", days: 2 }] });
      assert.equal(rt.queuePresetBacktests(requested), catalog.length);
      assert.deepEqual(pendingAndStarted(), catalog.map((p) => ({ id: p.id, days: expected })));
    }
  });
});
