// Lanes of a source-restricted desk (live.source): a lane the source leaves out must never join the exchange target of
// a symbol-side the desk holds through a lane it does send. A held position keeps its own lanes; before the fix it also
// kept the lanes of the other source, so an engine lane on a held signal position added its volume to that position.
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CoreDb } from "./db.server.ts";
import { resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";
import { rng, SimExchange as SimVenue, fakeRt, type FakeRt } from "../test-support.ts";

class SimExchange extends SimVenue {
  oneStopPerSide = true;
}

process.env.CTS_CORE_LIVE = "1";

const step = (rt: FakeRt, ex: ExchangeClient) => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
const lane = (cfg: string, sym: string, side: 1 | -1, vol = 1, px = 17) => ({
  cfg,
  sym,
  side,
  entry: px,
  stop: px * (1 - side * 0.03),
  vol,
  entryT: 1,
});
const sigCfg = "follow|sig-ema-cross-s@m15|tp1|sl1|tr0.5|h32";
const engCfg = "follow|rsi-mom-14-20@m15|tp1|sl1|tr0.5|h32";

describe("live.source: a held symbol-side takes only the lanes the desk sends", () => {
  beforeEach(() => resetLiveBackoff());
  afterEach(() => mock.timers.reset());
  /** the clock moves past the held-unknown window of a fresh open (the position read may lag for 15 s) */
  const later = (ms = 20_000) => mock.timers.enable({ apis: ["Date"], now: Date.now() + ms });

  it("source signals: an engine lane on a symbol-side holding a signal position is not sent", async () => {
    const ex = new SimExchange(rng(41));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, source: "signals" };
    rt.paper.positions = [lane(sigCfg, "S1-USDT", 1)];
    await step(rt, ex);
    const signalOnly = ex.positions.get("S1-USDT|LONG");
    assert.ok(signalOnly && signalOnly > 0, "the signal lane opens its position");
    // the engine lane arrives on the same symbol-side while the signal position is held
    rt.paper.positions = [lane(sigCfg, "S1-USDT", 1), lane(engCfg, "S1-USDT", 1)];
    later();
    const st = await step(rt, ex);
    const target = st.control?.targets.find((t) => t.key === "S1-USDT|1");
    assert.equal(target?.lanes, 1, "the target carries the signal lane only");
    assert.equal(target?.vol, 1, "the engine lane adds no volume to the signal position");
    assert.equal(ex.positions.get("S1-USDT|LONG"), signalOnly, "the held signal position does not grow");
    assert.equal(st.control?.notSent, 1, "the engine lane is held back from the exchange");
  });

  it("source engine: a signal lane on a symbol-side holding an engine position is not sent", async () => {
    const ex = new SimExchange(rng(42));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, source: "engine" };
    rt.paper.positions = [lane(engCfg, "S2-USDT", 1)];
    await step(rt, ex);
    const engineOnly = ex.positions.get("S2-USDT|LONG");
    assert.ok(engineOnly && engineOnly > 0, "the engine lane opens its position");
    rt.paper.positions = [lane(engCfg, "S2-USDT", 1), lane(sigCfg, "S2-USDT", 1)];
    later();
    const st = await step(rt, ex);
    const target = st.control?.targets.find((t) => t.key === "S2-USDT|1");
    assert.equal(target?.lanes, 1, "the target carries the engine lane only");
    assert.equal(target?.vol, 1, "the signal lane adds no volume to the engine position");
    assert.equal(ex.positions.get("S2-USDT|LONG"), engineOnly, "the held engine position does not grow");
  });

  it("source all (default): both lanes of a held symbol-side are sent, unchanged", async () => {
    const ex = new SimExchange(rng(43));
    const { rt } = fakeRt(new CoreDb(":memory:"));
    rt.settings.live = { ...rt.settings.live, source: "all" };
    rt.paper.positions = [lane(sigCfg, "S3-USDT", 1)];
    await step(rt, ex);
    const first = ex.positions.get("S3-USDT|LONG");
    assert.ok(first && first > 0, "the signal lane opens its position");
    rt.paper.positions = [lane(sigCfg, "S3-USDT", 1), lane(engCfg, "S3-USDT", 1)];
    later();
    const st = await step(rt, ex);
    const target = st.control?.targets.find((t) => t.key === "S3-USDT|1");
    assert.equal(target?.lanes, 2, "both lanes are in the target");
    assert.equal(target?.vol, 2, "both lanes add their volume");
    assert.equal(st.control?.notSent ?? 0, 0, "nothing is held back");
  });
});
