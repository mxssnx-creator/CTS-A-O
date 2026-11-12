import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../config.ts";
import { coreLiveDiffData, liveDiffInput } from "../api-data.ts";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_LIVE = "0";
process.env.CTS_CORE_PRIMARY_CONN = DEFAULT_SETTINGS.live.connId;
const G = globalThis as unknown as { __ctsCoreRuntime?: CoreRuntime };

test("live-vs-system read: input bounds, an empty record is explicit, never a zero or a fabricated PF", async () => {
  assert.throws(() => liveDiffInput({ hours: 0 }), /hours/);
  assert.throws(() => liveDiffInput({ hours: 721 }), /hours/);
  assert.deepEqual(liveDiffInput({}).hours, 48);
  const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic", priceStream: null });
  rt.stop();
  const previous = G.__ctsCoreRuntime;
  G.__ctsCoreRuntime = rt;
  try {
    const r = (await coreLiveDiffData(liveDiffInput({ hours: 24 }))) as Record<string, any>;
    assert.equal(r.hours, 24);
    assert.equal(typeof r.tag, "string");
    assert.equal(r.relation.counts.matched, 0);
    assert.equal(r.relation.counts.own, 0);
    assert.deepEqual(r.history, []);
    assert.deepEqual(r.hints, []);
    assert.equal(r.check.judged, false, "an empty window is not judged");
    assert.equal(r.cost, rt.settings.cost);
  } finally {
    G.__ctsCoreRuntime = previous;
    rt.dispose();
  }
});
