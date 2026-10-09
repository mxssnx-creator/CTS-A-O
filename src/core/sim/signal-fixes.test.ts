// Signal-processing fixes (6 Oct, docs/positive-coordinations.md): source allow-list, per-config recent validation,
// one signal entry counted once (acceptance, direction acceptance, loss cluster), direction acceptance on the run's
// fed candidates, confirmation on engine candidates (taken or not), the signal funnel and `sig:` skip names.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  coordBlock,
  defaultWalkForward,
  EngineOpenCount,
  feedBooks,
  makeTape,
  walkForward,
  type BlockFeedEntry,
  type WalkForwardOptions,
} from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { DEFAULT_SIGNALS, signalSettings } from "../signal-config.ts";
import {
  acceptKey,
  activeSignals,
  signalCombos,
  SignalAcceptIndex,
  SignalGuard,
  sideAcceptKey,
  sigActiveKey,
} from "../signals.ts";
import { checkSettings } from "../settings-check.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;

describe("signals.sourcesMode", () => {
  it("deny (default): a missing source runs; allow: only the sources set true run", () => {
    assert.equal(DEFAULT_SIGNALS.sourcesMode, "deny");
    const listed = { "ema-cross": true, sar: true };
    const deny = signalCombos(signalSettings({ sources: listed }), [15]);
    const allow = signalCombos(signalSettings({ sources: listed, sourcesMode: "allow" }), [15]);
    // deny: every default-on source (the listed ones among them), 2 ranges each
    assert.ok(deny.length > 4);
    assert.ok(deny.some((c) => c.ind.startsWith("sig-ema-cross-s")));
    // allow: exactly the two listed sources × 2 ranges on the 15m lane
    assert.equal(allow.length, 4);
    assert.ok(allow.every((c) => /^sig-(ema-cross|sar)-[sm]/.test(c.ind)), JSON.stringify(allow));
    // a source set false stays off in either mode
    assert.equal(
      signalCombos(signalSettings({ sources: { ...listed, sar: false }, sourcesMode: "allow" }), [15]).length,
      2,
    );
  });

  it("sanitised and checked", () => {
    assert.equal(signalSettings({ sourcesMode: "x" as never }).sourcesMode, "deny");
    assert.equal(signalSettings({ sourcesMode: "allow" }).sourcesMode, "allow");
    assert.doesNotThrow(() => checkSettings({ signals: { sourcesMode: "allow" } as never }));
    assert.doesNotThrow(() => checkSettings({ signals: { sourcesMode: "deny" } as never }));
    assert.throws(() => checkSettings({ signals: { sourcesMode: "all" } as never }));
  });
});

describe("signals: recent validation", () => {
  const run = (recentN: number, recentNet = 1) => [
    {
      bot: "follow",
      ind: "sig-ema-cross-s@m15",
      bySym: { A: { n: 10, net: 5, pf: 2, dd: 1, okShare: 1, recentN, recentNet } },
    },
  ];
  it("a unit without a close (or positive) in the recent window is not activated while validate is on", () => {
    const sig = { ...signalSettings({}), minTrades: 3, minBlockShare: 0 };
    assert.equal(activeSignals(run(0), sig).size, 0);
    assert.equal(activeSignals(run(0.5, -1), sig).size, 0);
    // a fraction of a close per config (the step ranking averages over the configs) is activity: kept
    assert.equal(activeSignals(run(0.5), sig).size, 2, "pooled record: both directions");
    assert.equal(activeSignals(run(0), { ...sig, validate: false }).size, 2);
  });
});

/** one signal close (a feed entry) of config `cfg` */
const close = (cfg: string, r: number, entryT: number, exitT: number, side = 1): BlockFeedEntry => ({
  sym: "A",
  side,
  kind: "zz",
  r,
  ind: "sig-ema-cross-s@m15",
  type: "normal",
  cfg,
  exitT,
  entryT,
});

describe("one signal entry counts once", () => {
  it("loss cluster: one entry closing in 10 configs is one loss; 10 entries are a cluster", () => {
    const c = { enabled: true, windowMin: 60, minLosses: 8, lossShare: 0.6 };
    const one = new SignalGuard();
    for (let k = 0; k < 10; k++) feedBooks(close(`c${k}`, -0.01, 0, 60_000 + k * 60_000), null, one);
    assert.equal(one.clustered(20 * 60_000, c), false);
    const many = new SignalGuard();
    for (let k = 0; k < 10; k++) feedBooks(close(`c${k}`, -0.01, k * 1000, 60_000 + k * 60_000), null, many);
    assert.equal(many.clustered(20 * 60_000, c), true);
    // without an entry time (an older feed) every close counts, as before
    const old = new SignalGuard();
    for (let k = 0; k < 10; k++) feedBooks({ ...close(`c${k}`, -0.01, 0, 60_000 + k * 60_000), entryT: undefined }, null, old);
    assert.equal(old.clustered(20 * 60_000, c), true);
  });

  it("fed acceptance: the count is entries, the PF every close", () => {
    const g = new SignalGuard();
    // entry 1: 20 configs, 15 won 1 %, 5 lost 1 %; entry 2: 20 configs, all won
    for (let k = 0; k < 20; k++) feedBooks(close(`c${k}`, k < 15 ? 0.01 : -0.01, 0, H + k), null, g);
    for (let k = 0; k < 20; k++) feedBooks(close(`c${k}`, 0.01, 2 * H, 3 * H + k), null, g);
    const s = g.acceptStats(acceptKey("sig-ema-cross-s@m15", "A", 1, "normal"), 4 * H, 48);
    assert.equal(s.n, 2);
    assert.ok(Math.abs(s.pf - 7) < 1e-9, String(s.pf));
    const side = g.acceptStats(sideAcceptKey(1), 4 * H, 48);
    assert.equal(side.n, 2);
    assert.ok(Math.abs(side.pf - 7) < 1e-9, String(side.pf));
  });

  it("tape record: the k configs of one entry count once, every close stays in the PF", () => {
    const cfgs = 20;
    const n = 3; // three entries per config
    const tapes = Array.from({ length: cfgs }, (_, k) => ({
      ind: "sig-ema-cross-s@m15",
      kind: "normal",
      n,
      syms: ["A"],
      symI: [0, 0, 0],
      side: [1, 1, 1],
      entryT: [0, H, 2 * H],
      exitT: [10 * 60_000 + k, H + 10 * 60_000 + k, 2 * H + 10 * 60_000 + k],
      r: [0.01, k < 10 ? 0.01 : -0.01, 0.01],
    }));
    const x = new SignalAcceptIndex(tapes);
    const s = x.stats(acceptKey("sig-ema-cross-s@m15", "A", 1, "normal"), 3 * H, 48);
    assert.equal(s.n, 3);
    assert.ok(Math.abs(s.pf - 5) < 1e-9, String(s.pf));
    // the direction groups are not in the tape record (they pool the run's fed candidates)
    assert.equal(x.stats(sideAcceptKey(1), 3 * H, 48).n, 0);
    // a tape without entry times counts every close
    const bare = new SignalAcceptIndex(tapes.map(({ entryT: _e, ...t }) => t));
    assert.equal(bare.stats(acceptKey("sig-ema-cross-s@m15", "A", 1, "normal"), 3 * H, 48).n, 60);
  });
});

describe("signal confirmation judges engine candidates", () => {
  const eng = { cfg: "follow|rsi-14@m15|tp1", sym: "A", side: 1 };
  const sig = { cfg: "follow|sig-ema-cross-s@m15|tp1", sym: "A", side: 1, entryT: 5 * H };
  const on = { enabled: true, hourLock: 0, cooldown: "off" as const, conflict: false, confirm: true };
  it("the pool decides; without one the neutral index is empty and the executed book is not read (8 Oct)", () => {
    const pool = new EngineOpenCount();
    assert.equal(coordBlock(on, sig, new Map(), [eng]), "confirm", "no pool: an executed engine order confirms nothing");
    assert.equal(coordBlock(on, sig, new Map(), [], pool), "confirm");
    pool.add("A", 1, 1);
    assert.equal(coordBlock(on, sig, new Map(), [], pool), null);
    assert.equal(coordBlock(on, { ...sig, side: -1 }, new Map(), [], pool), "confirm", "the other direction");
    pool.add("A", 1, -1);
    assert.equal(coordBlock(on, sig, new Map(), [eng], pool), "confirm", "closed: the pool, not the executed list");
  });

  // the run: an engine order on BBB opens first and takes the one engine slot (maxOpen 1), so the engine candidate on
  // AAA is processed but not taken; a signal on AAA enters while it is still open
  const SYM = "AAA-USDT";
  const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
  const IN_RUN = NOW - 2 * H + 10 * 60_000;
  const mk = (cfg: string, sym: string, r: number, entryT: number, side: 1 | -1 = 1): Trade =>
    ({
      cfg,
      sym,
      side,
      entryT,
      exitT: entryT + 30 * 60_000,
      entry: 100,
      exit: 100 * (1 + r),
      r,
      reason: r > 0 ? "tp" : "sl",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind: "normal",
    }) as Trade;
  const engTape = (ind: string, sym: string, entry: number) => {
    const id = `follow|${ind}|tp1|sl1|tr0|h32`;
    const xs = Array.from({ length: 100 }, (_, i) => mk(id, sym, 0.01, NOW - 120 * H + i * H));
    xs.push(mk(id, sym, 0.01, entry));
    return makeTape(id, "follow", ind, P, "normal", [sym], xs, [], []);
  };
  const sigTape = (entry: number) => {
    const ind = "sig-ema-cross-s@m15";
    const id = `follow|${ind}|tp1|sl1|tr0|h32`;
    return makeTape(id, "follow", ind, P, "normal", [SYM], [mk(id, SYM, 0.01, entry)], [], []);
  };
  const base: WalkForwardOptions = {
    ...defaultWalkForward(DEFAULT_SETTINGS),
    toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
    symGate: undefined,
    coord: { ...on },
    simH: 6,
    lastN: 0,
    validLastN: 0,
    robustFrac: 0,
    signalValidLastN: 0,
    signalGuardN: 0,
    signalCluster: undefined,
    signalAccept: undefined,
    signalSideAccept: undefined,
    signalActive: new Set([sigActiveKey("follow", "sig-ema-cross-s@m15", SYM, 1)]),
    maxOpen: 1,
  };
  const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

  it("a signal is confirmed by an engine candidate the engine did not take", () => {
    const first = engTape("rsi-14-30-70@m15", "BBB-USDT", IN_RUN - 10 * 60_000);
    const held = engTape("macd-cross@m15", SYM, IN_RUN - 5 * 60_000);
    const s = sigTape(IN_RUN);
    const r = walkForward(u, [first, held, s], base);
    const engCfgs = r.trades.filter((x) => !x.cfg.includes("sig-")).map((x) => x.sym);
    assert.ok(engCfgs.includes("BBB-USDT"), `engine BBB executed: ${JSON.stringify(r.skips)}`);
    assert.ok(!engCfgs.includes(SYM), "the AAA engine candidate is held back by maxOpen");
    assert.equal((r.skips.maxOpen ?? 0) >= 1, true);
    assert.deepEqual(
      r.trades.filter((x) => x.cfg === s.id).map((x) => x.sym),
      [SYM],
      `confirmed by the processed AAA candidate: ${JSON.stringify(r.skips)}`,
    );
    // no engine candidate on AAA at all: refused, under the signal's own skip name
    const r2 = walkForward(u, [first, s], base);
    assert.equal(r2.trades.filter((x) => x.cfg === s.id).length, 0);
    assert.equal(r2.skips["sig:confirm"], 1);
    assert.equal(r2.skips.confirm ?? 0, 0, "never under the engine's name");
  });

  it("an engine candidate that closed before the signal's entry does not confirm", () => {
    const early = engTape("macd-cross@m15", SYM, IN_RUN - 60 * 60_000);
    const s = sigTape(IN_RUN);
    const r = walkForward(u, [early, s], { ...base, maxOpen: 0 });
    assert.equal(r.trades.filter((x) => x.cfg === s.id).length, 0);
    assert.equal(r.skips["sig:confirm"], 1);
  });
});

describe("the signal funnel", () => {
  const SYM = "AAA-USDT";
  const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
  const IN_RUN = NOW - 2 * H + 10 * 60_000;
  const tr = (cfg: string, entryT: number, side: 1 | -1): Trade =>
    ({
      cfg,
      sym: SYM,
      side,
      entryT,
      exitT: entryT + 30 * 60_000,
      entry: 100,
      exit: 101,
      r: 0.01,
      reason: "tp",
      bars: 2,
      mfe: 0,
      mae: 0,
      kind: "normal",
    }) as Trade;
  it("candidates of an inactive unit are counted in signalFunnel, never as skips", () => {
    const ind = "sig-ema-cross-s@m15";
    const id = `follow|${ind}|tp1|sl1|tr0|h32`;
    const tp = makeTape(id, "follow", ind, P, "normal", [SYM], [tr(id, IN_RUN, 1), tr(id, IN_RUN + H, -1)], [], []);
    const o: WalkForwardOptions = {
      ...defaultWalkForward(DEFAULT_SETTINGS),
      toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
      symGate: undefined,
      coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
      simH: 6,
      lastN: 0,
      validLastN: 0,
      signalValidLastN: 0,
      signalGuardN: 0,
      signalCluster: undefined,
      signalAccept: undefined,
      signalSideAccept: undefined,
      // only the long unit is active
      signalActive: new Set([sigActiveKey("follow", ind, SYM, 1)]),
    };
    const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;
    const r = walkForward(u, [tp], o);
    assert.equal(r.trades.length, 1);
    assert.deepEqual(r.signalFunnel, { candidates: 2, inactive: 1, inactiveBySide: { "1": 0, "-1": 1 } });
    assert.equal(r.skips.signalInactive ?? 0, 0);
    assert.equal(r.skips["sig:signalInactive"] ?? 0, 0);
  });
});
