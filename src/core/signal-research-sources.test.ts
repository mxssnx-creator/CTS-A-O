import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_SIGNALS, SIGNAL_SOURCES, signalId, signalSettings } from "./signal-config.ts";
import { INDICATION_BY_ID, signalSourceOf } from "./indications/registry.ts";
import { signalCombos, signalProtects } from "./signals.ts";
import { SeriesCache } from "./indications/cache.ts";
import { makeUniverse, parseConfigId } from "./pipeline/pipeline.ts";
import { barsFromCandles, syntheticCandles } from "./market/bars.ts";
import { buildTapes, packTapes, unpackTapes, type ConfigTape } from "./sim/walkforward.ts";
import { closePool, runOnWorkers } from "./server/pool.server.ts";

const NAMES = ["r-laguerre", "r-chand", "r-klinger", "r-rvi"];
const at = Date.UTC(2026, 9, 1);

describe("four frozen research Signal catalog candidates", () => {
  it("keeps all original identities and includes all 103 sources in the expanded evaluation catalog", () => {
    assert.equal(SIGNAL_SOURCES.length, 103, "96 original, four frozen candidates and three later independent sources");
    for (const name of ["r-apz-reclaim", "r-frama-pullback", "r-st-pullback"])
      assert.notEqual(DEFAULT_SIGNALS.sources[name], false, `${name} included for independent evaluation`);
    assert.equal(
      SIGNAL_SOURCES.filter((s) => DEFAULT_SIGNALS.sources[s.name] !== false).length,
      103,
    );
    const enabled = signalCombos(signalSettings({}), [1, 5, 15, 30]);
    for (const name of NAMES) assert.ok(enabled.some(c => signalSourceOf(c.ind) === name));
    const disabled = signalCombos(signalSettings({ sources: Object.fromEntries(NAMES.map(n => [n, false])) }), [1,5,15,30]);
    assert.ok(disabled.every(c => !NAMES.includes(signalSourceOf(c.ind))), "explicit off selections survive expansion");
    const protocol = JSON.parse(
      readFileSync(
        new URL("../../docs/signal-research-protocol-20261015.json", import.meta.url),
        "utf8",
      ),
    );
    assert.deepEqual(
      protocol.candidates.map((c: { name: string }) => c.name),
      NAMES,
    );
    const b = barsFromCandles("R-USDT", 15, syntheticCandles("research-alias", 15, 1000, at, 4));
    for (const name of NAMES) {
      assert.notEqual(DEFAULT_SIGNALS.sources[name], false);
      const source = SIGNAL_SOURCES.find((s) => s.name === name)!;
      for (const range of ["short", "medium"] as const) {
        const base = INDICATION_BY_ID.get(source[range])!;
        const alias = INDICATION_BY_ID.get(signalId(name, range))!;
        assert.equal(alias.fn, base.fn, `${name}/${range}: no new formula behind the alias`);
        assert.deepEqual(
          alias.params,
          protocol.candidates.find((c: { name: string }) => c.name === name)[range],
        );
        assert.deepEqual([...alias.fn(new SeriesCache(b))], [...base.fn(new SeriesCache(b))]);
      }
    }
  });

  it("explicit enablement yields separate source/range/lane and Normal/Trailing/Trailing-only identities", () => {
    const settings = signalSettings({
      enabled: true,
      sourcesMode: "allow",
      sources: Object.fromEntries(NAMES.map((n) => [n, true])),
      lanes: [5, 15],
      coordination: { ...DEFAULT_SIGNALS.coordination, enabled: false },
    });
    const combos = signalCombos(settings, [5, 15]);
    assert.equal(combos.length, 16);
    assert.equal(new Set(combos.map((c) => c.ind)).size, 16);
    const protects = signalProtects(settings);
    for (const type of ["normal", "trailing", "trailing-only"]) {
      const p = protects.find((p) =>
        type === "normal"
          ? p.trail === 0
          : type === "trailing-only"
            ? p.trailOnly
            : p.trail > 0 && !p.trailOnly,
      )!;
      assert.ok(p);
    }
    assert.ok(combos.every((c) => NAMES.includes(signalSourceOf(c.ind))));
  });

  it("real workers and serialized tapes preserve exact source/range/type identities and return samples", async () => {
    const bars = [
      barsFromCandles("R-USDT", 15, syntheticCandles("research-worker", 15, 1800, at, 4)),
    ];
    const pairs = NAMES.flatMap((name) =>
      ["short", "medium"].map(
        (range) => `follow|${signalId(name, range as "short" | "medium")}@m15`,
      ),
    );
    const all = signalProtects(signalSettings({}));
    const protects = [
      all.find((p) => !p.trail)!,
      all.find((p) => p.trail > 0 && !p.trailOnly)!,
      all.find((p) => p.trailOnly)!,
    ];
    const local = buildTapes(makeUniverse(bars), protects, 0.002, undefined, new Set(pairs), null);
    assert.equal(local.length, 24);
    assert.equal(new Set(local.map((t) => t.id)).size, 24);
    assert.ok(
      local.some((t) => t.n > 0),
      "fixture must exercise actual settled samples",
    );
    try {
      const remote = (
        await runOnWorkers<{ tapes: ConfigTape[] }>(
          pairs.map((pair) => ({
            type: "tapes",
            bars,
            pairs: [pair],
            protects,
            cost: 0.002,
            dcaOpt: null,
            tactics: null,
          })),
          2,
        )
      ).flatMap((r) => r.tapes);
      for (const actual of [remote, unpackTapes(packTapes(remote))]) {
        assert.deepEqual(
          actual.map((t) => t.id),
          local.map((t) => t.id),
        );
        actual.forEach((t, i) => {
          assert.deepEqual(t.protect, local[i].protect);
          assert.deepEqual([...t.r], [...local[i].r]);
          assert.deepEqual([...t.entryT], [...local[i].entryT]);
          assert.deepEqual([...t.exitT], [...local[i].exitT]);
          assert.equal(parseConfigId(t.id)?.ind, t.ind);
        });
      }
    } finally {
      await closePool();
    }
  });
});
