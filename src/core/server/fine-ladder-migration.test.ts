import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreDb } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { FINE_LADDER_BACKUP, FINE_LADDER_FLAG, migrateFineLadders } from "./fine-ladder-migration.server.ts";
import { FINE_SL_TP_RATIOS, FINE_TRAIL_RATIOS, SL_TP_RATIOS } from "../protection-policy.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { DEFAULT_LOW_RANGE_GRID } from "../indications/low-range.ts";

const FORMER_SL = [...SL_TP_RATIOS];
const FORMER_TRAIL = [0, 0.25, 0.5, 0.75];

test("code defaults: Micro and Low-Range carry stops 0.2–1.6 step 0.1 and trailing 0.1–0.6 step 0.1; other ranges keep theirs", () => {
  const fine = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
  assert.deepEqual([...FINE_SL_TP_RATIOS], fine);
  assert.deepEqual([...FINE_TRAIL_RATIOS], [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
  const g = DEFAULT_SETTINGS.grid;
  assert.ok(g.micro && g.minimal && g.short && g.general && g.long);
  assert.deepEqual([...g.micro.slOfTp], fine);
  assert.deepEqual([...g.micro.trailOfTp], [...FINE_TRAIL_RATIOS]);
  assert.deepEqual([...DEFAULT_LOW_RANGE_GRID.slRatios], fine);
  assert.deepEqual([...DEFAULT_LOW_RANGE_GRID.trailRatios], [...FINE_TRAIL_RATIOS]);
  for (const r of [g.minimal, g.short, g.general, g.long]) {
    assert.deepEqual([...r.slOfTp], FORMER_SL);
    assert.deepEqual([...r.trailOfTp], FORMER_TRAIL);
  }
  // the opt-in stays opt-in: this change moves ladders, it does not activate the Low-Range protection grid
  assert.equal(DEFAULT_LOW_RANGE_GRID.enabled, false);
});

test("a stored former-default ladder moves once; an edited ladder, the other ranges and held protection stay", () => {
  const db = new CoreDb(":memory:");
  const old = { grid: {
    micro: { tp: [0.002], slOfTp: [...FORMER_SL], trailOfTp: [...FORMER_TRAIL], trailSlOfTp: 0.25 },
    short: { tp: [0.018], slOfTp: [...FORMER_SL], trailOfTp: [...FORMER_TRAIL] },
    lowRange: { enabled: true, slRatios: [...FORMER_SL], trailRatios: [0, 0.5] },
  } };
  db.kvSet("settings", structuredClone(old));
  const edited = { id: "edited", settings: { grid: { micro: { tp: [0.002], slOfTp: [1, 1.5], trailOfTp: [...FORMER_TRAIL] } } },
    metrics: { pf: 1.4, pfBasis: "net-returns", gp: 14, gl: 10, source: "study" } };
  const untouched = { id: "untouched", settings: { grid: { micro: { tp: [0.002], slOfTp: [1, 1.5], trailOfTp: [0, 0.5] } } },
    metrics: { pf: 1.2, pfBasis: "net-returns", gp: 12, gl: 10, source: "study" } };
  db.kvSet("presets", structuredClone([edited, untouched]));
  try {
    migrateFineLadders(db);
    const s = db.kvGet<typeof old>("settings")!;
    assert.deepEqual(s.grid.micro.slOfTp, [...FINE_SL_TP_RATIOS]);
    assert.deepEqual(s.grid.micro.trailOfTp, [...FINE_TRAIL_RATIOS]);
    assert.equal(s.grid.micro.trailSlOfTp, 0.2);
    assert.deepEqual(s.grid.short, old.grid.short, "Short keeps its ladder");
    assert.deepEqual(s.grid.lowRange.slRatios, [...FINE_SL_TP_RATIOS]);
    assert.deepEqual(s.grid.lowRange.trailRatios, [0, 0.5], "an edited Low-Range trailing list stays");
    const ps = db.kvGet<Array<typeof edited>>("presets")!;
    assert.deepEqual(ps[0].settings.grid.micro.slOfTp, [1, 1.5], "an edited stop ladder stays");
    assert.deepEqual(ps[0].settings.grid.micro.trailOfTp, [...FINE_TRAIL_RATIOS]);
    assert.equal(ps[0].metrics.pf, null, "a preset whose ladder moved loses its recorded PF");
    assert.equal(ps[0].metrics.pfBasis, "unavailable");
    assert.deepEqual(ps[1], untouched, "a preset without a former-default ladder is untouched");
    assert.deepEqual(db.kvGet<{ settings: unknown; presets: unknown }>(FINE_LADDER_BACKUP), { settings: old, presets: [edited, untouched] });
    assert.equal(db.kvGet(FINE_LADDER_FLAG), true);
    // once only: a ladder the operator sets back to the former values afterwards is a choice, not a leftover
    const again = db.kvGet<typeof old>("settings")!;
    again.grid.micro.slOfTp = [...FORMER_SL];
    db.kvSet("settings", again);
    migrateFineLadders(db);
    assert.deepEqual(db.kvGet<typeof old>("settings")!.grid.micro.slOfTp, FORMER_SL);
  } finally { db.db.close(); }
});

test("the migration is atomic and leaves nothing behind for a database with no stored settings", () => {
  const empty = new CoreDb(":memory:");
  try {
    migrateFineLadders(empty);
    assert.equal(empty.kvGet(FINE_LADDER_FLAG), true);
    assert.equal(empty.kvGet(FINE_LADDER_BACKUP), undefined);
  } finally { empty.db.close(); }
  const db = new CoreDb(":memory:");
  const old = { grid: { micro: { tp: [0.002], slOfTp: [...FORMER_SL], trailOfTp: [...FORMER_TRAIL] } } };
  db.kvSet("settings", structuredClone(old));
  const set = db.kvSet.bind(db);
  db.kvSet = (key, value) => {
    if (key === FINE_LADDER_FLAG) throw new Error("injected write failure");
    return set(key, value);
  };
  try {
    assert.throws(() => migrateFineLadders(db), /injected write failure/);
    assert.deepEqual(db.kvGet("settings"), old);
    assert.equal(db.kvGet(FINE_LADDER_BACKUP), undefined);
    assert.equal(db.kvGet(FINE_LADDER_FLAG), undefined);
  } finally { db.kvSet = set; db.db.close(); }
});

test("a runtime opened on a pre-change database trades the new ladders and keeps a held position's own stop", () => {
  const db = new CoreDb(":memory:");
  db.kvSet("wfCapsV", 38);
  db.kvSet("minimumProtectionPolicy20261108", true);
  db.kvSet("settings", { grid: { micro: { tp: [0.002], slOfTp: [...FORMER_SL], trailOfTp: [...FORMER_TRAIL] },
    lowRange: { ...DEFAULT_LOW_RANGE_GRID, enabled: true, slRatios: [...FORMER_SL], trailRatios: [...FORMER_TRAIL] } } });
  db.kvSet("paperBook", { positions: [{ cfg: "old-own-lane", sym: "A-USDT", side: 1, entry: 100, stop: 94, target: 104, entryT: 1, vol: 1 }] });
  const rt = new CoreRuntime(db, undefined, { market: "synthetic", priceStream: null });
  try {
    assert.ok(rt.settings.grid.micro);
    assert.deepEqual([...rt.settings.grid.micro.slOfTp], [...FINE_SL_TP_RATIOS]);
    assert.deepEqual([...rt.settings.grid.micro.trailOfTp], [...FINE_TRAIL_RATIOS]);
    assert.deepEqual(rt.settings.grid.lowRange?.slRatios, [...FINE_SL_TP_RATIOS]);
    assert.deepEqual(rt.settings.grid.lowRange?.trailRatios, [...FINE_TRAIL_RATIOS]);
    assert.equal(rt.paper.positions[0].stop, 94, "owned protection is never rewritten");
  } finally { rt.dispose(); db.db.close(); }
});
