import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import {
  MICRO_CONFIG_IDS,
  INVERSE_MICRO_CONFIG_IDS,
  microAnchorTf,
} from "./indications/micro-family.ts";
import { INVERSE_CONFIG_IDS } from "./indications/inverse-config.ts";
import { configId } from "./pipeline/pipeline.ts";
import {
  defaultWalkForward,
  dupKey,
  openDupKey,
  orderCfgKey,
  makeTape,
  walkForward,
} from "./sim/walkforward.ts";
import { diffPositions } from "./server/paper-rows.ts";
import { laneKeyOf } from "./live-record.ts";
import type { Trade } from "./domain/types.ts";
const H = 3600000,
  M = 60000,
  now = Date.UTC(2026, 9, 1);
const sources = [
  ...MICRO_CONFIG_IDS,
  ...INVERSE_MICRO_CONFIG_IDS,
  ...INVERSE_CONFIG_IDS,
  "mc-irsi2-10",
  "mc-turn-irsi2-10",
];
const ids = sources.map((id) => `follow|${id}@m${microAnchorTf(id) ?? 1}|tp2|sl1|tr0|h60|mc`);
it("all Micro and Inverse identities survive identical closed/open order and paper/native lane keys", () => {
  const closed = {
    sym: "A",
    side: 1 as const,
    entryT: now - H,
    exitT: now - H + M,
    r: 0.0185,
    kind: "normal" as const,
  };
  const open = { sym: "A", side: 1 as const, entryT: now - H, entry: 100, stop: 99, target: 102 };
  for (const id of ids) assert.equal(orderCfgKey(id), id);
  assert.equal(new Set(ids.map((id) => dupKey({ ...closed, cfg: id }))).size, ids.length);
  assert.equal(new Set(ids.map((id) => openDupKey({ ...open, cfg: id }))).size, ids.length);
  const positions = ids.flatMap((cfg) => [1, -1].map((side) => ({ ...open, cfg, side })));
  assert.equal(diffPositions(null, positions).next.size, 2 * ids.length);
  assert.equal(
    new Set(positions.map((p) => laneKeyOf({ ...p, id: `${p.cfg}|${p.sym}|${p.entryT}` }))).size,
    2 * ids.length,
  );
  assert.equal(
    dupKey({ ...closed, cfg: ids[0] }),
    dupKey({ ...closed, cfg: ids[0] }),
    "a retry of the same config is still the same event",
  );
});
it("a real walk-forward admits identical simultaneous onsets independently across all Micro/Inverse sources", () => {
  const p = { tp: 0.02, sl: 0.01, trail: 0, hold: 60, tag: "mc" as const };
  const tapes = sources.map((raw) => {
    const ind = `${raw}@m${microAnchorTf(raw) ?? 1}`,
      id = configId("follow", ind, p, "normal");
    const trade = (entryT: number, r: number): Trade => ({
      cfg: id,
      sym: "A",
      side: 1,
      entryT,
      exitT: entryT + M,
      entry: 100,
      exit: 100 * (1 + r + 0.0015),
      r,
      kind: "normal",
      reason: r > 0 ? "tp" : "sl",
      bars: 1,
      mfe: 0,
      mae: 0,
    });
    const hist = Array.from({ length: 40 }, (_, i) =>
      trade(now - (13 - i / 4) * H, i % 10 === 0 ? -0.005 : 0.0185),
    );
    return makeTape(
      id,
      "follow",
      ind,
      p,
      "normal",
      ["A"],
      [...hist, trade(now - 90 * M, 0.0185)],
      [],
      [],
    );
  });
  const o = {
    ...defaultWalkForward(DEFAULT_SETTINGS),
    simH: 2,
    preH: 12,
    longH: 24,
    lastN: 15,
    validLastN: 15,
    rangeGate: undefined,
    seatPer: "config" as const,
    portfolio: 0,
    robustFrac: 0,
    coord: {
      enabled: false,
      hourLock: 0,
      cooldown: "off" as const,
      conflict: false,
      confirm: false,
    },
    toggles: {
      ...DEFAULT_SETTINGS.toggles,
      normal: true,
      trailing: true,
      block: false,
      blockActive: false,
      dca: false,
      dcaActive: false,
      axis: false,
    },
    maxOpen: 0,
    maxPerSymbol: 0,
    maxPerSide: 0,
    maxPositions: 0,
  };
  const u = {
    bars: [],
    caches: [],
    startT: now - 24 * H,
    endT: now,
    splitT: 0,
    nowT: now,
    baseTf: 1,
  } as never;
  const together = walkForward(u, tapes, o);
  assert.equal(together.trades.length, sources.length, JSON.stringify(together.skips));
  assert.equal(together.skips.duplicate ?? 0, 0);
  assert.equal(new Set(together.trades.map((t) => t.cfg)).size, sources.length);
  for (const tp of [tapes[0], tapes[100], tapes[400], tapes.at(-1)!])
    assert.deepEqual(
      together.trades.filter((t) => t.cfg === tp.id),
      walkForward(u, [tp], o).trades,
    );
});
