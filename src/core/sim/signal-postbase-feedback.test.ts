import { it } from "node:test";
import assert from "node:assert/strict";
import { SignalGuard, guardKey, sideAcceptKey } from "../signals.ts";
import { sigActiveKey } from "../signals.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { defaultWalkForward, feedBooks, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";

const H = 3_600_000;
const cluster = { enabled: true, windowMin: 60, minLosses: 3, lossShare: .6 };
const close = (i: number, r: number, accepted?: boolean) => ({
  cfg: `follow|sig-rsi-s@m5|tp${i}|sl1|tr0|h12`, ind: "sig-rsi-s@m5", sym: "AAA-USDT",
  side: 1, kind: "rsi", type: "normal", entryT: i * 1000, exitT: H + i * 1000, r,
  ...(accepted === undefined ? {} : { accepted }),
});

it("rejected and legacy unproven Signal closes cannot qualify or veto shared post-Base direction and cluster gates", () => {
  const guard = new SignalGuard();
  for (let i = 0; i < 10; i++) feedBooks(close(i, -.02, false), null, guard);
  for (let i = 10; i < 20; i++) feedBooks(close(i, .2), null, guard);
  assert.equal(guard.acceptStats(sideAcceptKey(1), 2 * H, 24).n, 0);
  assert.equal(guard.clustered(H + 60_000, cluster, 1), false);
  const rejected = close(0, -.02, false);
  assert.equal(guard.disabled(guardKey(rejected.cfg, rejected.sym, 1, "normal"), 1), true,
    "its own candidate loss remains available to the independent config guard");
  for (let i = 20; i < 24; i++) feedBooks(close(i, i === 23 ? -.01 : .02, true), null, guard);
  const stats = guard.acceptStats(sideAcceptKey(1), 2 * H, 24);
  assert.equal(stats.n, 4);
  assert.equal(stats.pf, 6);
  assert.equal(guard.accepts(sideAcceptKey(1), 2 * H, { enabled: true, hours: 24, minTrades: 4, minPf: 1.3 }), true);
});

it("settled accepted losses still block and a rejected sibling cannot consume the accepted onset", () => {
  const guard = new SignalGuard();
  for (let i = 0; i < 4; i++) {
    feedBooks(close(i, .1, false), null, guard);
    feedBooks({ ...close(i, -.02, true), cfg: `accepted-${i}`, exitT: H + 10_000 + i }, null, guard);
  }
  assert.equal(guard.acceptStats(sideAcceptKey(1), 2 * H, 24).n, 4);
  assert.equal(guard.accepts(sideAcceptKey(1), 2 * H, { enabled: true, hours: 24, minTrades: 4, minPf: 1.3 }), false);
  assert.equal(guard.clustered(H + 60_000, cluster, 1), true);
  assert.equal(guard.clustered(H + 60_000, cluster, -1), false);
  feedBooks({ ...close(99, .5, true), open: true }, null, guard);
  assert.equal(guard.acceptStats(sideAcceptKey(1), 2 * H, 24).n, 4, "endpoint marks are not settled evidence");
});

it("walk-forward preserves qualified admissions against cap-rejected sibling losses and replays the exact accepted cohort", () => {
  const now = Date.UTC(2026, 9, 25, 12), start = now - 6 * H, minute = 60_000;
  const ind = "sig-ema-cross-s@m15";
  const tapes = ["AAA-USDT", "BBB-USDT"].map((sym, k) => {
    const cfg = `follow|${ind}|tp${k + 1}|sl5|tr0|h32`;
    const row = (entryT: number, r: number): Trade => ({ cfg, sym, side: 1, entryT,
      exitT: entryT + (30 + k) * minute, entry: 100, exit: 100 * (1 + r + DEFAULT_SETTINGS.cost),
      r, mult: 1, reason: "time", bars: 2, mfe: 0, mae: 0, kind: "normal" });
    const history = Array.from({ length: 100 }, (_, i) => row(now - 120 * H + i * H, .01));
    const forward = Array.from({ length: 6 }, (_, i) => row(start + 10 * minute + i * H, k ? -.04 : .01));
    return makeTape(cfg, "follow", ind, { tp: (k + 1) / 100, sl: .05, trail: 0, hold: 32 },
      "normal", [sym], [...history, ...forward], [], []);
  });
  const base = defaultWalkForward(DEFAULT_SETTINGS);
  const options: WalkForwardOptions = { ...base, mode: "fixed", longH: 150, simH: 6,
    seatPer: "config", lastN: 0, validLastN: 0, signalValidLastN: 0, signalGuardN: 0,
    signalAccept: undefined, signalSourceGate: undefined, signalCluster: undefined,
    signalSideAccept: { enabled: true, hours: 24, minTrades: 1, minPf: 1.3 },
    signalActive: new Set(tapes.map(tp => sigActiveKey(tp.bot, tp.ind, tp.syms[0], 1, tp.kind, tp.id))),
    signalMaxOpen: 1, signalPerSymbol: 0, signalMaxPositions: 0,
    maxOpen: 0, maxPerSymbol: 0, maxPerSide: 0, maxPositions: 0,
    symGate: "off", coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
    toggles: { ...base.toggles, normal: true, trailing: false, block: false, blockActive: false,
      dca: false, dcaActive: false, axis: false },
  };
  const universe = { bars: [], caches: [], startT: now - 200 * H, endT: now,
    splitT: now - 200 * H, nowT: now, baseTf: 60 } as never;
  const run = walkForward(universe, tapes, options);
  const control = walkForward(universe, tapes, { ...options, signalSideAccept: undefined });
  assert.equal(run.trades.length, 6, JSON.stringify(run.skips));
  assert.deepEqual(run.trades, control.trades, "rejected sibling history cannot veto an otherwise validated entry");
  assert.ok(run.trades.every(t => t.sym === "AAA-USDT" && t.r === .01));
  const feed = run.feed.filter(e => !e.open);
  assert.equal(feed.filter(e => e.accepted === true).length, 6);
  assert.equal(feed.filter(e => e.accepted !== true).length, 6, "rejected candidates remain diagnostic evidence");
  const acceptedIds = new Set(run.trades.map(t => `${t.cfg}|${t.sym}|${t.side}|${t.entryT}`));
  for (const e of feed) assert.equal(e.accepted === true, acceptedIds.has(`${e.cfg}|${e.sym}|${e.side}|${e.entryT}`));
  const guard = new SignalGuard(), restored = new SignalGuard();
  for (const e of feed) feedBooks(e, null, guard);
  const persisted = JSON.parse(JSON.stringify(feed));
  for (const part of [persisted.slice(0, 3), persisted.slice(3, 8), persisted.slice(8)])
    for (const e of part) feedBooks(e, null, restored);
  assert.deepEqual(guard.acceptStats(sideAcceptKey(1), now, 24), { n: 6, pf: Infinity });
  assert.deepEqual(restored.acceptStats(sideAcceptKey(1), now, 24), guard.acceptStats(sideAcceptKey(1), now, 24));
  assert.equal(restored.clustered(now, cluster, 1), false);
});
