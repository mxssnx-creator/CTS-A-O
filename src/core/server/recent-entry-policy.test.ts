import assert from "node:assert/strict";
import { it } from "node:test";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

it("native entry coordination matches the Last-N-only modeled path", () => {
  process.env.CTS_CORE_STATE = "off";
  const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic", priceStream: null });
  rt.stop();
  try {
    rt.wf.gates = { ...rt.wf.gates, lastNOnly: true };
    rt.wf.guardPct = 1;
    rt.wf.coord = { ...rt.wf.coord!, enabled: true, hourLock: 1, cooldown: "all", conflict: false, confirm: false };
    const op = { cfg: "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h1", sym: "A-USDT", side: 1, entryT: Date.UTC(2026, 9, 28) };
    const hour = Math.floor(op.entryT / 3_600_000), values = new Map([[hour, -2], [hour - 1, -3]]);
    const heldBack = (rt as unknown as { entryHeldBack: (entry: typeof op, net: Map<number, number>, open: [], src: Map<string, []>) => string | null }).entryHeldBack.bind(rt);
    assert.equal(heldBack(op, values, [], new Map()), null);
    rt.wf.gates = { ...rt.wf.gates, lastNOnly: false };
    assert.equal(heldBack(op, values, [], new Map()), "hourGuard");
  } finally { rt.shutdown("test"); }
});
