import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { defaultWalkForward } from "../sim/walkforward.ts";
import { CoreDb } from "./db.server.ts";
import { NativeProcessedStageAdapter, type NativeProcessedSnapshot } from "./processed-stage-adapter.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_AUTOSTART = "0";

const policy = { validationN: 2, realN: 2 };
const tp = { id: "follow|ema-9-21@m1|durable", kind: "normal", ind: "ema-9-21@m1" };

type RuntimeHooks = {
  nativeProcessedStages(): NativeProcessedStageAdapter | null;
  persistNativeProcessedStages(): boolean;
};

function runtime(db: CoreDb): CoreRuntime {
  const rt = new CoreRuntime(
    db,
    { gates: { positionWindows: null, minTrades: 1 }, live: { liveLastN: 0 } },
    { market: "synthetic", priceStream: null },
  );
  rt.stop();
  rt.wf = {
    ...defaultWalkForward({
      ...DEFAULT_SETTINGS,
      gates: { ...DEFAULT_SETTINGS.gates, positionWindows: null },
    }),
    rangeGate: undefined,
    processedStages: policy,
  };
  return rt;
}

test("processed-stage parent is atomically restart-readable before admission continues", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-processed-stage-durable-"));
  const statePath = join(dir, "state.json");
  const firstDb = new CoreDb(":memory:", { statePath });
  const rt = runtime(firstDb);
  try {
    const hooks = rt as unknown as RuntimeHooks;
    const adapter = hooks.nativeProcessedStages();
    assert.ok(adapter);
    const opened = adapter.enter(tp, "OWN-USDT", 1, 10, 1.05);
    assert.equal(hooks.persistNativeProcessedStages(), true);

    const recoveredDb = new CoreDb(":memory:", { statePath });
    try {
      const snapshot = recoveredDb.kvGet<NativeProcessedSnapshot>("processedNativePaperV1");
      assert.ok(snapshot, "a new process sees the checkpoint without waiting for a SQLite snapshot");
      const recovered = new NativeProcessedStageAdapter(policy, rt.settings.cost, snapshot);
      assert.equal(recovered.stageFor(opened.entryId), "postBase");
    } finally {
      recoveredDb.db.close();
    }
  } finally {
    rt.dispose();
    firstDb.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unwritable processed-stage checkpoint fails closed before it can protect a funded action", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-processed-stage-unwritable-"));
  const blocker = join(dir, "state.json");
  mkdirSync(blocker);
  const db = new CoreDb(":memory:", { statePath: blocker });
  const rt = runtime(db);
  try {
    const hooks = rt as unknown as RuntimeHooks;
    assert.equal(hooks.nativeProcessedStages(), null);
    assert.match(db.lastStateError, /directory|EISDIR|rename/i);
    assert.equal(hooks.nativeProcessedStages(), null, "the failed policy stays fenced in this process");
  } finally {
    rt.dispose();
    db.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("processed stages do not relabel an intentional memory-only runtime as persistent", () => {
  const db = new CoreDb(":memory:");
  const rt = runtime(db);
  try {
    const hooks = rt as unknown as RuntimeHooks;
    assert.equal(hooks.nativeProcessedStages(), null);
    assert.equal(hooks.nativeProcessedStages(), null, "the volatile policy stays fenced in this process");
  } finally {
    rt.dispose();
    db.db.close();
  }
});
