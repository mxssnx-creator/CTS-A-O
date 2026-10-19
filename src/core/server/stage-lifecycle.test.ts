import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const runtimes: CoreRuntime[] = [];
afterEach(() => { for (const rt of runtimes.splice(0)) rt.dispose(); });
type Inner = {
  startStage(stage: "Tapes" | "Signals", label: string): void;
  setStage(stage: string, done: number, total: number, label?: string, restart?: boolean): void;
  beginJob(backfill: boolean): void;
  endJob(label: string): void;
};
function fixture() {
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 }, { market: "synthetic" }); runtimes.push(rt);
  rt.status.state = "computing";
  const inner = rt as unknown as Inner;
  inner.beginJob(false);
  return { rt, inner };
}

test("each repeated Tapes subphase starts at zero while its updates and overall job progress remain monotonic", () => {
  const { rt, inner } = fixture();
  const paper = rt.paper, positions = rt.paper.positions, selected = rt.paper.selected;
  const records: Array<{ label: string; restart: boolean; progress: number; overall: number }> = [];
  const original = inner.setStage.bind(rt);
  inner.setStage = (stage, done, total, label = "", restart = false) => {
    original(stage, done, total, label, restart);
    records.push({ label, restart, progress: rt.status.progress, overall: rt.status.overall! });
  };
  for (const label of ["signal historic configs", "slimming previous tapes", "strategy tapes", "carried tapes"]) {
    inner.startStage("Tapes", label);
    assert.equal(rt.status.progress, 0, `${label} cannot inherit the previous subphase's 100%`);
    assert.equal(records.at(-1)!.restart, true);
    inner.setStage("Tapes", 0.4, 1, label);
    inner.setStage("Tapes", 0.2, 1, label);
    assert.equal(rt.status.progress, 0.4, "ordinary worker/generator updates cannot move the local bar backwards");
    assert.equal(records.at(-1)!.restart, false);
    inner.setStage("Tapes", 1, 1, label);
  }
  for (let i = 1; i < records.length; i++) assert.ok(records[i].overall >= records[i - 1].overall);
  assert.ok(rt.status.overall! < 1, "finishing Tapes never marks the entire job complete");
  assert.equal(rt.status.computes, 0); assert.equal(rt.status.paperSteps, 0); assert.equal(rt.audit, null);
  assert.equal(rt.paper, paper); assert.equal(rt.paper.positions, positions); assert.equal(rt.paper.selected, selected);
});

test("source/coordinator and worker/fallback invocations reset only their local stage bars", () => {
  const { rt, inner } = fixture();
  inner.startStage("Tapes", "strategy worker"); inner.setStage("Tapes", 0.75, 1);
  const workerOverall = rt.status.overall;
  inner.startStage("Tapes", "strategy fallback");
  assert.equal(rt.status.progress, 0); assert.equal(rt.status.overall, workerOverall);
  inner.setStage("Tapes", 1, 1);
  inner.startStage("Signals", "source signal tapes"); inner.setStage("Signals", 1, 1);
  const sourceOverall = rt.status.overall;
  inner.startStage("Signals", "signal coordination tapes");
  assert.equal(rt.status.progress, 0); assert.equal(rt.status.overall, sourceOverall);
  inner.setStage("Signals", 1, 4);
  assert.equal(rt.status.progress, 0.25); assert.equal(rt.status.overall, sourceOverall);
  inner.endJob("finished");
  assert.equal(rt.status.stage, "Realtime"); assert.equal(rt.status.overall, 1);
  inner.beginJob(false); inner.startStage("Tapes", "next job");
  assert.equal(rt.status.progress, 0); assert.ok(rt.status.overall! < sourceOverall!);
});
