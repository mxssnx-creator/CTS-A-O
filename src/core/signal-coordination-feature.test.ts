import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SIGNALS, SIGNAL_SOURCES } from "./signal-config.ts";
import { signalCombos, activeSignals } from "./signals.ts";
import { SeriesCache } from "./indications/cache.ts";
import { indicationState, laneInd, signalSourceOf } from "./indications/registry.ts";
import { configId, laneProtect } from "./pipeline/pipeline.ts";
import { heldCoordinationProtects } from "./signal-hist.ts";
import { liveGroupOf } from "./live-validation.ts";
import { liveTrades, typeOf, TYPE_ORDER } from "./statistics.ts";
import { entryCoidKind } from "./server/live.ts";
import { exchangeAcceptIndex } from "./live-record.ts";
import { sideAcceptKey } from "./signals.ts";
import {
  isSignalCoordinationInd,
  parseSignalCoordinationId,
  signalCoordinationId,
  signalCoordinationVoteCounts,
  signalCoordinationStateFromVotes,
  signalCoordinationHistory,
  signalCoordinationRanges,
  SIGNAL_COORDINATION_RATIOS,
} from "./signal-coordination.ts";

const config = (ratio: (typeof SIGNAL_COORDINATION_RATIOS)[number] = 0.6, inputMask: 1 | 2 | 3 = 3) =>
  signalCoordinationId(["macd-cross", "ema-cross", "rsi-reversal"], ratio, 3, inputMask);

test("coordinator identities round-trip the sorted source pool and input range through lanes", () => {
  const id = config(0.65, 3);
  const lane = laneInd(id, 15);
  assert.deepEqual(parseSignalCoordinationId(lane), {
    ratio: 0.65,
    minSources: 3,
    inputMask: 3,
    sourceNames: ["ema-cross", "macd-cross", "rsi-reversal"],
  });
  assert.equal(isSignalCoordinationInd(lane), true);
  assert.equal(isSignalCoordinationInd("sig-ema-cross-s@m15"), false);
  assert.equal(signalSourceOf(lane), "coordination-r65-i3");
  assert.deepEqual(SIGNAL_COORDINATION_RATIOS, [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1]);
  for (const ratio of SIGNAL_COORDINATION_RATIOS) {
    const encoded = signalCoordinationId(["ema-cross", "macd-cross", "rsi-reversal"], ratio, 3, 3);
    assert.equal(parseSignalCoordinationId(encoded)?.ratio, ratio, `${ratio} round-trips`);
  }
});

test("source variants contribute at most one vote, conflicts abstain, and quiet sources do not dilute domination", () => {
  const sourceStates = [
    [Int8Array.from([1, -1, 0, 0]), Int8Array.from([-1, -1, 0, 0])], // conflict, then one bearish vote
    [Int8Array.from([1, 1, 0, 1]), Int8Array.from([1, 1, 0, 1])], // still one vote
    [Int8Array.from([-1, -1, 0, 1])],
    [Int8Array.from([1, 0, 0, 1])],
  ];
  const counts = signalCoordinationVoteCounts(sourceStates, 4);
  assert.deepEqual([...counts.positive], [2, 1, 0, 3]);
  assert.deepEqual([...counts.negative], [1, 2, 0, 0]);
  assert.deepEqual([...signalCoordinationStateFromVotes(counts, 0.6, 3)], [1, -1, 0, 1]);
  assert.deepEqual([...signalCoordinationStateFromVotes(counts, 0.65, 3)], [1, -1, 0, 1]);
  assert.deepEqual([...signalCoordinationStateFromVotes(counts, 0.7, 3)], [0, 0, 0, 1]);
  assert.deepEqual([...signalCoordinationStateFromVotes(counts, 0.8, 3)], [0, 0, 0, 1]);
  assert.deepEqual([...signalCoordinationStateFromVotes(counts, 0.6, 4)], [0, 0, 0, 0]);
});

test("every 5-point threshold is inclusive, and 100% requires unanimous active votes", () => {
  const positive = Uint8Array.from([60, 65, 70, 75, 80, 85, 90, 95, 100]);
  const negative = Uint8Array.from(positive, (n) => 100 - n);
  for (let thresholdIndex = 0; thresholdIndex < SIGNAL_COORDINATION_RATIOS.length; thresholdIndex++) {
    const ratio = SIGNAL_COORDINATION_RATIOS[thresholdIndex];
    const state = signalCoordinationStateFromVotes({ positive, negative }, ratio, 3);
    assert.ok(state.slice(thresholdIndex).every((x) => x === 1), `${ratio} accepts its exact boundary`);
    assert.ok(state.slice(0, thresholdIndex).every((x) => x === 0), `${ratio} rejects lower shares`);
  }
  assert.equal(signalCoordinationStateFromVotes({ positive, negative }, 1, 3).at(-1), 1);
});

test("signal combos add independent ratio × input-range pairs and honor source selections", () => {
  const twoSources = {
    ...DEFAULT_SIGNALS,
    sourcesMode: "allow" as const,
    sources: { "ema-cross": true, "macd-cross": true },
    coordination: { ...DEFAULT_SIGNALS.coordination, minSources: 2 },
  };
  const allInputs = signalCombos(twoSources, [15]);
  const coordinated = allInputs.filter((x) => isSignalCoordinationInd(x.ind));
  assert.equal(allInputs.length, 4 + 27);
  assert.equal(coordinated.length, 27, "short-only, medium-only and combined each run all nine ratios");
  assert.equal(new Set(coordinated.map((x) => x.ind)).size, 27);
  assert.equal(
    coordinated.filter((x) => parseSignalCoordinationId(x.ind)?.inputMask === 3).length,
    9,
  );

  const shortOnly = signalCombos(
    {
      ...twoSources,
      ranges: { short: true, medium: false },
    },
    [15],
  ).filter((x) => isSignalCoordinationInd(x.ind));
  assert.equal(shortOnly.length, 9);
  assert.ok(shortOnly.every((x) => parseSignalCoordinationId(x.ind)?.inputMask === 1));

  const tooFew = signalCombos(
    { ...twoSources, coordination: { ...twoSources.coordination, minSources: 3 } },
    [15],
  );
  assert.equal(tooFew.filter((x) => isSignalCoordinationInd(x.ind)).length, 0);
  const off = signalCombos(
    { ...twoSources, coordination: { ...twoSources.coordination, enabled: false } },
    [15],
  );
  assert.equal(off.filter((x) => isSignalCoordinationInd(x.ind)).length, 0);
  assert.equal(
    SIGNAL_SOURCES.some((x) => x.name === "ema-cross"),
    true,
  );
});

test("historic protections receive independent Short / Normal / Long config identities", () => {
  const pair = `follow|${config()}`;
  const history = { [pair]: [{ tp: 0.02, sl: 0.03, trail: 0.01, hold: 24 }] };
  const protections = ["sh", "gn", "lg"].map((tag) => ({
    tp: 0.02,
    sl: 0.03,
    trail: 0,
    hold: 24,
    tag: tag as "sh" | "gn" | "lg",
  }));
  const tagged = signalCoordinationHistory(history, new Set([pair]), protections);
  assert.deepEqual(
    tagged[pair].map((p) => p.tag),
    ["sh", "gn", "lg"],
  );
  assert.equal(new Set(tagged[pair].map((p) => configId("follow", pair.split("|")[1], p))).size, 3);
  assert.deepEqual(
    history[pair],
    [{ tp: 0.02, sl: 0.03, trail: 0.01, hold: 24 }],
    "the source history remains untouched",
  );
});

test("already qualified historic range configs are not cloned into failing sibling ranges", () => {
  const pair = `follow|${config()}`;
  const history = {
    [pair]: [
      { tp: 0.02, sl: 0.03, trail: 0.01, hold: 24, tag: "sh" as const },
      { tp: 0.02, sl: 0.03, trail: 0.01, hold: 24, tag: "gn" as const },
    ],
  };
  const protections = ["sh", "gn", "lg"].map((tag) => ({
    tp: 0.02,
    sl: 0.03,
    trail: 0,
    hold: 24,
    tag: tag as "sh" | "gn" | "lg",
  }));
  const tagged = signalCoordinationHistory(history, new Set([pair]), protections);
  assert.deepEqual(tagged[pair].map((p) => p.tag), ["sh", "gn"]);
  assert.equal(new Set(tagged[pair].map((p) => configId("follow", pair.split("|")[1], p))).size, 2);
});

test("a range toggle cannot discard a held coordinator position's exit family", () => {
  const configured = { short: false, normal: true, long: false };
  assert.deepEqual(signalCoordinationRanges(configured, ["sh"]), {
    short: true,
    normal: true,
    long: false,
  });
  assert.deepEqual(signalCoordinationRanges(configured), configured);
});

test("a held coordinator config keeps its exact lane distances and range tag after grid changes", () => {
  const ind = laneInd(config(0.7, 1), 30);
  const pair = `follow|${ind}`;
  const protect = { tp: 0.02, sl: 0.03, trail: 0, hold: 24, tag: "sh" as const };
  const cfg = configId("follow", ind, laneProtect(protect, ind));
  const recovered = heldCoordinationProtects([cfg], new Set([pair]), []);
  assert.equal(recovered[pair]?.length, 1);
  assert.equal(recovered[pair][0].tag, "sh");
  assert.equal(configId("follow", ind, laneProtect(recovered[pair][0], ind)), cfg);
  assert.deepEqual(heldCoordinationProtects([cfg], new Set([pair]), [protect]), {});
});

test("active-unit caps rank classic signals and coordinator ratios independently", () => {
  const stats = {
    n: 8,
    net: 8,
    pf: 2,
    sides: { "1": { n: 8, net: 8, pf: 2, dd: 1, okShare: 1, recentN: 1, recentNet: 1 } },
  };
  const classic = Array.from({ length: 12 }, (_, i) => ({
    bot: "follow",
    ind: `sig-source-${i}-s`,
    kind: "normal",
    bySym: { AAA: stats },
  }));
  const coordinated = [0.6, 0.65].map((r) => ({
    bot: "follow",
    ind: signalCoordinationId(["ema-cross", "macd-cross", "rsi-reversal"], r as 0.6 | 0.65, 3, 1),
    kind: "normal",
    bySym: { AAA: stats },
  }));
  const active = activeSignals([...classic, ...coordinated], {
    ...DEFAULT_SIGNALS,
    rank: "net",
    count: 10,
    coordination: { ...DEFAULT_SIGNALS.coordination, count: 10 },
  });
  const activeClassic = [...active].filter(
    (key) => !isSignalCoordinationInd(key.split("|")[1] ?? ""),
  );
  const activeCoord = [...active].filter((key) => isSignalCoordinationInd(key.split("|")[1] ?? ""));
  assert.equal(activeClassic.length, 10);
  assert.equal(activeCoord.length, 2);
});

test("registry calculates and memoizes a coordinator indication on actual cached bars", () => {
  const n = 360;
  const c = Float64Array.from({ length: n }, (_, i) => 100 + i * 0.01 + Math.sin(i / 6) * 1.5);
  const cache = new SeriesCache({
    sym: "TEST-USDT",
    tfMin: 15,
    n,
    t: Float64Array.from({ length: n }, (_, i) => i * 900_000),
    o: Float64Array.from(c),
    h: Float64Array.from(c, (x) => x * 1.005),
    l: Float64Array.from(c, (x) => x * 0.995),
    c,
    v: Float64Array.from({ length: n }, (_, i) => 1 + (i % 13)),
  });
  const id = laneInd(config(), 15);
  const first = indicationState(id, cache)!;
  const second = indicationState(id, cache)!;
  assert.equal(first.length, n);
  assert.equal(second, first, "the source vote and threshold output are cached");
  assert.ok([...first].every((x) => x === -1 || x === 0 || x === 1));
  assert.ok(
    [...first].some((x) => x !== 0),
    "the registry produces directional consensus on real cached bars",
  );
});

test("strategy type and live PF groups preserve coordinator range identity", () => {
  const id = laneInd(config(0.7, 3), 15);
  const trade = (tag?: "sh" | "gn" | "lg") => ({
    cfg: configId("follow", id, {
      tp: 0.03,
      sl: 0.04,
      trail: 0,
      hold: 64,
      ...(tag ? { tag } : {}),
    }),
    kind: "normal",
  });
  assert.equal(typeOf(trade("sh") as never), "Signals Coordination");
  assert.equal(liveGroupOf(trade("sh").cfg), "Signals Coordination · Short");
  assert.equal(liveGroupOf(trade("gn").cfg), "Signals Coordination · General");
  assert.equal(liveGroupOf(trade("lg").cfg), "Signals Coordination · Long");
  assert.equal(liveGroupOf(trade().cfg), "Signals Coordination");
  assert.equal(entryCoidKind(trade("sh").cfg), "H");
  assert.equal(entryCoidKind(trade("gn").cfg), "G");
  assert.equal(entryCoidKind(trade("lg").cfg), "L");
  assert.ok(TYPE_ORDER.includes("Signals Coordination"));
});

test("live exchange side acceptance keeps coordinator results separate from classic source signals", () => {
  const id = laneInd(config(0.7, 1), 15);
  const cfg = configId("follow", id, { tp: 0.02, sl: 0.03, trail: 0, hold: 24, tag: "sh" });
  const accept = exchangeAcceptIndex([
    { cfg, sym: "TEST-USDT", side: 1, entryT: 0, exitT: 3_600_000, r: 0.02 },
  ]);
  assert.equal(accept.stats(sideAcceptKey(1), 2 * 3_600_000, 24).n, 0);
  assert.equal(accept.stats(sideAcceptKey(1, true), 2 * 3_600_000, 24).n, 1);
});

test("live ledger closes retain the exact coordinator config and exit range", () => {
  const id = laneInd(config(0.75, 3), 15);
  const cfg = configId("follow", id, { tp: 0.03, sl: 0.04, trail: 0, hold: 64, tag: "sh" });
  const at = Date.UTC(2026, 9, 16);
  const trades = liveTrades(
    [
      {
        coid: "CTSBV2_Hopen",
        cfg,
        sym: "TEST-USDT",
        side: 1,
        kind: "O",
        qty: 1,
        px: 100,
        fillPx: 100,
        fee: 0,
        status: "ok",
        at,
      },
      {
        coid: "CTSBV2_Cclose",
        sym: "TEST-USDT",
        side: 1,
        kind: "X",
        qty: 1,
        px: 102,
        fillPx: 102,
        fee: 0,
        status: "ok",
        at: at + 60_000,
      },
    ],
    "CTSBV2_".length,
  );
  assert.equal(trades.length, 1);
  assert.equal(trades[0].cfg, cfg);
  assert.equal(typeOf(trades[0]), "Signals Coordination");
  assert.equal(liveGroupOf(trades[0].cfg), "Signals Coordination · Short");
});
