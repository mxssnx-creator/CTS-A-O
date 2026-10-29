import assert from "node:assert/strict";
import { test } from "node:test";
import { profitFactor as scoredPf } from "./stats.ts";
import { profitFactor as familyPf } from "../bot-stats.ts";
import { pooledPf } from "../pipeline/pipeline.ts";
import { gateMinimalPlus } from "../minimal-coord.ts";
import { SignalAcceptIndex, EngineSideIndex, SignalGuard, acceptKey, engineSideKey } from "../signals.ts";
import { exchangeAcceptIndex } from "../live-record.ts";

const H = 3_600_000;

// Two-hour fixtures: changing return units must never turn equal gains/losses into a no-loss winner.
for (const scale of [1, 1e-9, 1e-13, 1e-20]) {
  test(`PF neutral remains one across engine, Signal, owned-close and pooled paths at scale ${scale}`, () => {
    const ind = "sig-rsi-s@m1", cfg = `follow|${ind}|tp1|sl1|tr0|h2`;
    const tape = { id: cfg, ind, kind: "normal", protect: { tag: "mn" as const }, n: 2, syms: ["A"],
      symI: new Uint16Array([0, 0]), side: new Int8Array([1, 1]),
      entryT: new Float64Array([0, 1]), exitT: new Float64Array([2, 3]), r: new Float64Array([scale, -scale]) };
    const key = acceptKey(ind, "A", 1, "normal", cfg);
    const signals = new SignalAcceptIndex([tape]);
    const lazy = new SignalAcceptIndex([tape], true);
    const engine = new EngineSideIndex();
    for (const _ of engine.fill([{ ...tape, ind: "ema-9-21@m1" }]));
    const guard = new SignalGuard();
    guard.addAccept(key, scale, 2); guard.addAccept(key, -scale, 3);
    const exchange = exchangeAcceptIndex([scale, -scale].map((r, i) => ({ cfg, sym: "A", side: 1,
      entryT: i, exitT: i + 2, r })));
    const measured = {
      engine: scoredPf(scale, scale), family: familyPf([scale, -scale]),
      pooled: pooledPf([{ gp: scale, gl: scale, pf: 1, net: 0 }]).pf,
      signal: signals.stats(key, H, 1).pf, lazySignal: lazy.stats(key, H, 1).pf,
      engineDirection: engine.stats(engineSideKey("normal", "mn", 1), 2 * H, 2).pf,
      acceptedSignal: guard.acceptStats(key, H, 1).pf, ownedCloses: exchange.stats(key, H, 1).pf,
    };
    for (const [path, pf] of Object.entries(measured)) assert.equal(pf, 1, `${path} must preserve break-even`);
  });

  test(`Minimal plus cannot qualify neutral or losing tiny returns at scale ${scale}`, () => {
    const make = (ratio: number) => ({ id: `follow|ema-9-21@m1|mp|${ratio}`, n: 50,
      gp: Float64Array.from({ length: 51 }, (_, i) => i * scale * ratio),
      gl: Float64Array.from({ length: 51 }, (_, i) => i * scale) });
    const losing = make(.8), neutral = make(1), passing = make(1.5);
    assert.deepEqual(gateMinimalPlus([losing, neutral, passing], { enabled: true, lastN: 50, minPf: 1.35 }).map(x => x.id), [passing.id]);
  });
}
