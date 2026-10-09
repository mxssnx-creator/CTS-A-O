// Signal order caps, as their settings say (Settings → Signals): "Max orders" = all open signal orders and partials
// (signalMaxOpen, one pool across both directions); "per symbol" = all signal orders and partials on a symbol
// (signalPerSymbol, both directions). The per-direction cap of the signals is their POSITION cap (signalMaxPositions:
// symbol × direction, long and short counted apart, docs/positive-coordinations.md, 6 Oct). A side never takes the
// total order cap of its own.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultWalkForward, makeTape, walkForward, type WalkForwardOptions } from "./walkforward.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import type { Trade } from "../domain/types.ts";
import { sigActiveKey } from "../signals.ts";

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 1);
const NOW = T0 + 400 * H;
const IN_RUN = NOW - 2 * H + 10 * 60_000;
const P = { tp: 0.01, sl: 0.01, trail: 0, hold: 32 };
const IND = "sig-ema-cross-s@m15";
const CFG = `follow|${IND}|tp1|sl1|tr0|h32`;
const LONG = 1;
const SHORT = -1;

/** one signal entry on `sym` × `side`, all entering in the same step */
const entry = (sym: string, side: 1 | -1): Trade =>
  ({
    cfg: CFG,
    sym,
    side,
    entryT: IN_RUN,
    exitT: IN_RUN + 30 * 60_000,
    entry: 100,
    exit: 101,
    r: 0.01,
    reason: "tp",
    bars: 2,
    mfe: 0,
    mae: 0,
    kind: "normal",
  }) as Trade;

const SYMS = ["AAA-USDT", "BBB-USDT", "CCC-USDT", "DDD-USDT"];
const tape = (trades: Trade[]) => makeTape(CFG, "follow", IND, P, "normal", SYMS, trades, [], []);

// every symbol × direction of the tape is an active signal unit (signal tapes outside signalActive are not read)
const active = new Set(SYMS.flatMap((sym) => [LONG, SHORT].map((side) => sigActiveKey("follow", IND, sym, side))));
const base: WalkForwardOptions = {
  ...defaultWalkForward(DEFAULT_SETTINGS),
  toggles: { normal: true, trailing: true, block: false, blockActive: false, dca: false, dcaActive: false, axis: false },
  symGate: undefined,
  coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
  simH: 6,
  lastN: 0,
  validLastN: 0,
  robustFrac: 0,
  signalActive: active,
  signalValidLastN: 0,
  signalGuardN: 0,
  signalCluster: undefined,
  signalAccept: undefined,
  signalSideAccept: undefined,
};
const u = { bars: [], caches: [], startT: T0, endT: NOW, splitT: T0, nowT: NOW, baseTf: 60 } as never;

describe("signal order caps: one pool per cap, positions per direction", () => {
  it("signalMaxOpen 2: two longs and two shorts entering together open two orders in total", () => {
    const t = tape([entry("AAA-USDT", LONG), entry("BBB-USDT", LONG), entry("CCC-USDT", SHORT), entry("DDD-USDT", SHORT)]);
    const r = walkForward(u, [t], { ...base, signalMaxOpen: 2 });
    assert.equal(r.trades.length, 2, JSON.stringify(r.skips));
    assert.equal(r.skips["sig:maxOpen"], 2, JSON.stringify(r.skips));
    assert.equal(r.skips["sig:perSide"] ?? 0, 0, "the side check never stands in for the total");
  });

  it("signalMaxPositions 1: one long position and one short position open together (the per-direction cap)", () => {
    const t = tape([entry("AAA-USDT", LONG), entry("BBB-USDT", LONG), entry("CCC-USDT", SHORT), entry("DDD-USDT", SHORT)]);
    const r = walkForward(u, [t], { ...base, signalMaxPositions: 1 });
    assert.equal(r.trades.length, 2, JSON.stringify(r.skips));
    assert.deepEqual(r.trades.map((x) => x.side).sort(), [SHORT, LONG], "one of each direction");
    assert.equal(r.skips["sig:maxPositions"], 2, JSON.stringify(r.skips));
  });

  it("signalPerSymbol 1: one order per symbol across both directions", () => {
    const t = tape([entry("AAA-USDT", LONG), entry("AAA-USDT", SHORT), entry("BBB-USDT", LONG)]);
    const r = walkForward(u, [t], { ...base, signalPerSymbol: 1 });
    assert.deepEqual(r.trades.map((x) => x.sym).sort(), ["AAA-USDT", "BBB-USDT"], JSON.stringify(r.skips));
    assert.equal(r.skips["sig:perSymbol"], 1, JSON.stringify(r.skips));
  });
});
