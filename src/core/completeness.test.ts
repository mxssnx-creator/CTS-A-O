// Settings and presets completeness: every leaf of DEFAULT_SETTINGS is range-checked (or listed as unchecked with a
// reason), shown on the Settings page (or listed as not shown with a reason), and every preset merged onto the
// defaults passes the range checks and keeps the positive coordinations (docs/positive-coordinations.md).
//
// A new setting fails here until it is put in one of the tables below: the bound table pins checkSettings' bounds
// exactly (the boundary itself is accepted, a hair outside it is refused), so a bound that moves fails here too.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SETTINGS,
  GATE_PRESETS,
  STRATEGY_PRESETS,
  type CoreSettings,
  type SettingsPatch,
} from "./config.ts";
import { checkMerged, checkSettings } from "./settings-check.ts";
import { DESK_PRESETS } from "./presets.desk.ts";
import { LIVE_COORD_PRESETS } from "./presets.live.ts";
import { RESEARCH_PRESETS as RESEARCH_RAW } from "./presets.research.ts";
import { ALL_RESEARCH_PRESETS, PRESET_EXCLUDED, presetSettings, type Preset } from "./presets.ts";
import { mergeSignals, SIGNAL_SOURCES, type SignalSettings } from "./signal-config.ts";
import { coordSettings, defaultWalkForward, type WalkForwardOptions } from "./sim/walkforward.ts";
import { positiveCoordWarnings, SIGNAL_EVAL_MIN_PF } from "./positive.ts";
import { MICRO_RANGE } from "./minimal-coord.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** Every leaf of a settings object by its dotted path (arrays are leaves). */
function leaves(o: unknown, p = "", out = new Map<string, unknown>()): Map<string, unknown> {
  if (isObj(o)) for (const [k, v] of Object.entries(o)) leaves(v, p ? `${p}.${k}` : k, out);
  else out.set(p, o);
  return out;
}
const LEAVES = leaves(DEFAULT_SETTINGS);

/** A copy of the defaults with the given leaves replaced. */
function withLeaves(set: ReadonlyArray<readonly [string, unknown]>): CoreSettings {
  const s = structuredClone(DEFAULT_SETTINGS) as unknown as Obj;
  for (const [path, v] of set) {
    const ks = path.split(".");
    let o = s;
    for (const k of ks.slice(0, -1)) o = o[k] as Obj;
    o[ks.at(-1)!] = v;
  }
  return s as unknown as CoreSettings;
}
const rejects = (s: CoreSettings) => {
  try {
    checkSettings(s);
    return false;
  } catch {
    return true;
  }
};

// ── the bound table ──────────────────────────────────────────────────────────────────────────────────────────────
// Read from settings-check.ts. `ok` values must be accepted, `bad` values refused, each on an otherwise default
// settings object (with `with` applied first where a cross-field rule would otherwise refuse the boundary itself).
type Case = { ok: unknown[]; bad: unknown[]; with?: ReadonlyArray<readonly [string, unknown]> };
const out = (b: number, dir: -1 | 1) => b + dir * Math.max(1e-9, Math.abs(b) * 1e-9);
/** a number in [lo, hi]: both ends accepted, a hair outside refused (whole numbers: one outside, and a half inside) */
const num = (
  lo: number,
  hi: number,
  o: { int?: boolean; also?: unknown[]; bad?: unknown[] } = {},
): Case => ({
  ok: [lo, hi, ...(o.also ?? [])],
  bad: [
    o.int ? lo - 1 : out(lo, -1),
    o.int ? hi + 1 : out(hi, 1),
    ...(o.int ? [lo + 0.5] : []),
    "1",
    Number.NaN,
    ...(o.bad ?? []),
  ],
});
/** a list of numbers each in [lo, hi] */
const list = (
  lo: number,
  hi: number,
  o: { empty?: boolean; int?: boolean; max?: number } = {},
): Case => ({
  ok: [[lo], [hi], [lo, hi], ...(o.empty ? [[]] : [])],
  bad: [
    [o.int ? lo - 1 : out(lo, -1)],
    [o.int ? hi + 1 : out(hi, 1)],
    ...(o.empty ? [] : [[]]),
    ...(o.int ? [[lo + 0.5]] : []),
    ...(o.max ? [Array.from({ length: o.max + 1 }, () => lo)] : []),
  ],
});
/** a [min, max] pair inside [lo, hi] */
const span = (lo: number, hi: number): Case => ({
  ok: [
    [lo, lo],
    [hi, hi],
    [lo, hi],
  ],
  bad: [[out(lo, -1), lo], [hi, out(hi, 1)], [hi, lo], [lo]],
});
const oneOf = (ok: unknown[], bad: unknown[] = ["bogus"]): Case => ({ ok, bad });
const rangeKeys = (r: string): Record<string, Case> => ({
  [`grid.${r}.tp`]: list(0.002, 0.2, { max: 64 }),
  [`grid.${r}.slOfTp`]: list(0.2, 5, { max: 64 }),
  [`grid.${r}.trailOfTp`]: list(0, 1, { max: 64 }),
  [`grid.${r}.trailSlOfTp`]: num(1, 5),
  [`grid.${r}.minSl`]: num(0, 0.2),
  [`grid.${r}.minTrail`]: num(0, 0.1),
});

const CASES: Record<string, Case> = {
  tfMin: oneOf([1, 5, 15, 30, 60], [0, 2, 240]),
  tfs: oneOf([[1], [1, 5, 15, 30]], [[5], [1, 2], [1, 60]]),
  "tfDays.1": num(1, 45),
  "tfDays.5": num(1, 45),
  "tfDays.15": num(1, 45),
  "tfDays.30": num(1, 45),
  historyDays: num(2, 45),
  symbols: num(1, 120, { int: true }),
  symbolRank: oneOf(["volatility1h", "volume", "market", "gainers", "losers"]),
  cycleMs: num(100, 600_000),
  tickMs: num(50, 10_000),
  cost: num(0, 0.02),
  "fees.taker": num(0, 0.01),
  "fees.maker": num(0, 0.01),
  "fees.slippage": num(0, 0.02),
  "adjust.window": num(5, 100, { int: true }),
  "adjust.triggerPf": { ...num(0.5, 2), with: [["adjust.recoverPf", 3]] },
  "adjust.recoverPf": { ...num(0.5, 3), with: [["adjust.triggerPf", 0.5]] },
  "adjust.slStep": num(0.0001, 0.02),
  "adjust.slMax": num(0.001, 0.2),
  "adjust.trailStep": num(0.0001, 0.02),
  "adjust.trailMax": num(0.001, 0.2),
  "adjust.pauseH": num(0, 168),
  "gates.minPf": num(0.5, 5),
  "gates.maxDdtH": num(1, 500),
  "gates.minDdtH": num(0, 72),
  "gates.maxDdr": num(0, 20),
  "gates.rangeMinPf.micro": num(1.02, 3),
  "gates.rangeMinPf.minimal": num(1.02, 3),
  "gates.rangeMinPf.short": num(1.02, 3),
  "gates.rangeMinPf.general": num(1.02, 3),
  "gates.rangeMinPf.long": num(1.02, 3),
  "gates.minTrades": num(1, 500),
  "gates.quorum": num(0, 1),
  "gates.baseSetsMinPf": num(0.5, 1.5),
  "gates.lastNFloor": num(0, 100, { int: true }),
  refineTop: num(1, 100, { int: true }),
  mainTop: num(0, 100_000, { int: true }),
  evalTop: num(1, 400, { int: true }),
  armTop: num(1, 40, { int: true }),
  paperNotional: num(1, 1_000_000),
  paperBalance: num(1, 100_000_000),
  "protectFloor.minSl": num(0, 0.1),
  "protectFloor.minTrail": num(0, 0.1),
  "sizing.mode": oneOf(["equityPct", "fixed", "minQty"]),
  "sizing.pct": num(0.001, 0.25),
  "tactics.cooldownBars": num(0, 96),
  focus: oneOf(
    [[], ["follow|rsi-mom-14-20@x4"]],
    [["Follow|X"], ["follow"], Array.from({ length: 201 }, () => "a|b")],
  ),
  pinned: oneOf(
    [[], ["follow|bb-walk@x4"]],
    [["bad pair"], Array.from({ length: 81 }, () => "a|b")],
  ),
  disabledKinds: oneOf([[], ["momentum"]], [["Momentum"], ["rsi2"], [1]]),
  "block.mode": oneOf(["shared", "additive", "overall"]),
  "block.ratio": num(0, 2),
  "block.maxLevel": { ...num(1, 12), with: [["block.minActiveLevel", 1]] },
  "block.minActiveLevel": { ...num(1, 12), with: [["block.maxLevel", 12]] },
  "block.maxMult": num(1, 8),
  "block.pause": num(0, 12),
  "block.steps": num(0, 12),
  "block.increase": num(0.05, 1),
  "block.ranges.levels": span(1, 12),
  "block.ranges.volRatio": span(0.05, 2),
  "block.ranges.steps": span(0, 12),
  "block.ranges.increase": span(0.05, 1),
  "block.ranges.pause": span(0, 12),
  "dca.levels": num(1, 4, { int: true }),
  "dca.step": num(0.001, 0.1),
  "dca.stopGap": num(0, 5),
  "dca.slOfTp": num(0.25, 5),
  "axis.levels": num(1, 8, { int: true }),
  "axis.spacing": num(0.1, 5),
  "axis.ratio": num(0.1, 5),
  "axis.minDisp": { ...num(0, 10), with: [["axis.maxDisp", 20]] },
  "axis.maxDisp": { ...num(0.1, 20), with: [["axis.minDisp", 0]] },
  "axis.center": num(5, 400),
  "axis.centerMin": num(0, 1440),
  "axis.ranges": oneOf(
    [["atr"], ["atr", "linear", "geo", "fib", "volume"]],
    [[], ["bogus"], "atr"],
  ),
  "axis.levelsSet": list(1, 8, { int: true, max: 16 }),
  "axis.mode": oneOf(["revert", "desk"]),
  "axis.slAtr": num(0.2, 2),
  "axis.tpRatio": num(0.2, 3),
  "axis.trailPct": num(0.4, 2.4),
  "axis.expiry": num(0, 500, { int: true }),
  "grid.tp": list(0.002, 0.2, { empty: true, max: 64 }),
  "grid.slOfTp": list(0.2, 5, { max: 64 }),
  "grid.trailOfTp": list(0, 1, { max: 64 }),
  "grid.holdH": list(0.25, 72, { max: 64 }),
  "grid.minTrail": num(0, 0.1),
  "grid.minSl": num(0, 0.2),
  "grid.trailStep": num(0.1, 1),
  ...rangeKeys("minimal"),
  ...rangeKeys("short"),
  ...rangeKeys("general"),
  ...rangeKeys("long"),
  // Micro runs on its own grid by default (8 Oct policy): its targets start at 0.1 % of price, below the other bands
  "grid.micro.tp": list(0.001, 0.2, { max: 16 }),
  "grid.micro.slOfTp": list(0.5, 5, { max: 24 }),
  "grid.micro.trailOfTp": list(0, 1, { max: 8 }),
  "grid.micro.trailSlOfTp": num(1, 5),
  "grid.micro.minSl": num(0, 0.2),
  "grid.micro.minTrail": num(0, 0.1),
  "grid.micro.minSlNet": num(0, 0.05),
  "grid.micro.trailStep": num(0.1, 1),
  "grid.minimalPlus.lastN": num(50, 500, { int: true }),
  "grid.minimalPlus.minPf": num(1.05, 5),
  "grid.minimalPlus.cells": oneOf(
    [[], [{ tp: 0.002, sl: 0.001, trail: 0 }], [{ tp: 0.2, sl: 0.2, trail: 0.1 }]],
    [
      [{ tp: 0.0019, sl: 0.01, trail: 0 }],
      [{ tp: 0.01, sl: 0.21, trail: 0 }],
      [{ tp: 0.01, sl: 0.01, trail: 0.11 }],
      Array.from({ length: 81 }, () => ({ tp: 0.01, sl: 0.01, trail: 0 })),
    ],
  ),
  "grid.rangeGate.lastN": num(50, 1000, { int: true }),
  "grid.rangeGate.minPf": num(1.05, 5),
  "live.connId": oneOf(["bingx-x01", "bingx-vst-01", "bingx-vst-02"], ["bingx-x02", "bogus"]),
  "live.notionalUsd": num(1, 500),
  "live.maxPositions": num(0, 10_000, { int: true }),
  "live.mode": oneOf(["overall", "entries"]),
  "live.ratio": num(0.1, 500),
  // 0 = no per-position cap
  "live.maxNotionalUsd": num(1, 5000, { also: [0] }),
  "live.rebalancePct": num(0, 1),
  "live.marginMode": oneOf(["cross", "isolated"]),
  "live.positionMode": oneOf(["hedge", "oneway"]),
  "live.leverage": oneOf(["max", 1, 150], ["bogus", 0.5, 151]),
  "live.liveLastN": num(0, 200),
  "live.liveGroupLastN": num(0, 2000),
  // 0 = no cap; else 10 … 2000 in steps of 10
  "signals.count": num(10, 2000, { int: true, also: [0, 100], bad: [15] }),
  "signals.sourcesMode": oneOf(["deny", "allow"]),
  "signals.lanes": oneOf([[15], [1, 5, 15, 30]], [[], [2], [60]]),
  "signals.normal.tp": list(0.002, 0.2, { max: 64 }),
  "signals.normal.slOfTp": list(0.2, 5, { max: 64 }),
  "signals.trailing.tp": list(0.002, 0.2, { max: 64 }),
  "signals.trailing.trailOfTp": list(0.05, 1, { max: 64 }),
  "signals.trailing.slOfTp": num(0.2, 5),
  "signals.holdH": num(0.5, 96),
  "signals.exits": oneOf(["pct", "atr", "both"]),
  "signals.atr.sl": list(0.2, 2, { max: 64 }),
  "signals.atr.tpRatio": list(0.2, 3, { max: 64 }),
  "signals.atr.trail": list(0.4, 2.4, { empty: true, max: 16 }),
  "signals.atr.holdBars": num(0, 384, { int: true }),
  "signals.guard.lastN": num(2, 50, { int: true }),
  "signals.cluster.windowMin": num(5, 720),
  "signals.cluster.minLosses": num(1, 1000, { int: true }),
  "signals.cluster.lossShare": num(0.3, 1),
  "signals.minTrades": num(1, 100, { int: true }),
  "signals.rank": oneOf(["drawdown", "lowdd", "net"]),
  "signals.minBlockShare": num(0, 1),
  "signals.validateH": num(2, 72),
  "signals.minSl": num(0, 0.1),
  "signals.minTrail": num(0, 0.1),
  "signals.sourceGate.days": num(1, 14),
  "signals.sourceGate.minShare": num(0, 1),
  "signals.sourceGate.minTrades": num(1, 100),
  "signals.perSymbol": num(0, 1000, { int: true }),
  "signals.maxOpen": num(0, 100_000, { int: true }),
  "signals.maxPositions": num(0, 10_000, { int: true }),
  "signals.filter.trendH": num(0, 48),
  "signals.filter.volFloor": num(0, 0.02),
  "signals.accept.minPf": num(1, 5),
  "signals.accept.hours": num(6, 336, { int: true }),
  "signals.accept.minTrades": num(1, 200, { int: true }),
  "signals.sideAccept.minPf": num(1, 5),
  "signals.sideAccept.hours": num(6, 336, { int: true }),
  "signals.sideAccept.minTrades": num(1, 1000, { int: true }),
};

/**
 * Leaves checkSettings does not range-check, each with the reason it is safe (or the gap it is). A boolean here is
 * accepted whatever its type; the engine reads it as noted.
 */
const UNCHECKED: Record<string, string> = {
  "axis.exits":
    'not checked: the engine reads anything but "fixed" as managed exits (sim/axis.ts), so no value is unsafe',
  "grid.minimalPlus.tp":
    "not checked: Minimal plus trades only its selected `cells` (checked), the template grid is informational",
  "grid.minimalPlus.slOfTp":
    "not checked: as grid.minimalPlus.tp — the selected cells carry the traded stops",
  "grid.minimalPlus.trailOfTp":
    "not checked: as grid.minimalPlus.tp — the selected cells carry the traded trails",
  "grid.minimalPlus.trailSlOfTp": "not checked: as grid.minimalPlus.tp",
  "grid.minimalPlus.minSl": "not checked: as grid.minimalPlus.tp",
  "grid.minimalPlus.minTrail": "not checked: as grid.minimalPlus.tp",
};

describe("settings completeness: every leaf of DEFAULT_SETTINGS is range-checked or listed", () => {
  it("checkSettings accepts the defaults (and checkMerged accepts them as a patch)", () => {
    assert.doesNotThrow(() => checkSettings(DEFAULT_SETTINGS));
    assert.doesNotThrow(() => checkMerged(DEFAULT_SETTINGS, DEFAULT_SETTINGS));
  });

  it("every leaf is in the bound table, is a boolean (type-checked below) or is listed as unchecked — nothing stale", () => {
    const unlisted = [...LEAVES].filter(
      ([k, v]) => !(k in CASES) && !(k in UNCHECKED) && typeof v !== "boolean",
    );
    assert.deepEqual(
      unlisted.map(([k]) => k),
      [],
      "new settings: add each to CASES (its checkSettings bound) or to UNCHECKED with a reason",
    );
    const stale = [...Object.keys(CASES), ...Object.keys(UNCHECKED)].filter((k) => !LEAVES.has(k));
    assert.deepEqual(stale, [], "table entries that are no longer leaves of DEFAULT_SETTINGS");
    for (const k of Object.keys(CASES))
      assert.ok(!(k in UNCHECKED), `${k} is both bounded and listed unchecked`);
  });

  it("every leaf: the default is accepted on its own (a patch carrying only that leaf)", () => {
    for (const [k, v] of LEAVES) {
      const patch: Obj = {};
      const ks = k.split(".");
      let o = patch;
      for (const x of ks.slice(0, -1)) o = (o[x] = {}) as Obj;
      o[ks.at(-1)!] = v;
      assert.doesNotThrow(
        () => checkSettings(patch as Partial<CoreSettings>),
        `${k} = ${JSON.stringify(v)}`,
      );
    }
  });

  for (const [k, c] of Object.entries(CASES))
    it(`${k}: the bounds hold exactly (accepted ${c.ok.length}, refused ${c.bad.length})`, () => {
      for (const v of c.ok)
        assert.doesNotThrow(
          () => checkSettings(withLeaves([...(c.with ?? []), [k, v]])),
          `${k} = ${JSON.stringify(v)} should be accepted`,
        );
      for (const v of c.bad)
        assert.ok(
          rejects(withLeaves([...(c.with ?? []), [k, v]])),
          `${k} = ${JSON.stringify(v)} should be refused`,
        );
    });

  it("every boolean leaf refuses a non-boolean (except the ones listed unchecked)", () => {
    const loose: string[] = [];
    for (const [k, v] of LEAVES) {
      if (typeof v !== "boolean" || k in UNCHECKED) continue;
      for (const bad of ["yes", 1])
        if (!rejects(withLeaves([[k, bad]]))) loose.push(`${k} = ${JSON.stringify(bad)}`);
    }
    assert.deepEqual(loose, []);
  });

  it("the unchecked list is exactly what checkSettings lets through", () => {
    // a listed leaf that checkSettings DOES check belongs in CASES (or the boolean sweep), not in the gap list
    const probe: Record<string, unknown> = {
      boolean: "yes",
      number: -1e9,
      string: "bogus",
      object: [{ bogus: 1 }],
    };
    for (const k of Object.keys(UNCHECKED)) {
      const v = LEAVES.get(k);
      const bad = Array.isArray(v) ? [-1e9] : probe[typeof v];
      assert.equal(
        rejects(withLeaves([[k, bad]])),
        false,
        `${k} is checked now: move it out of UNCHECKED`,
      );
    }
  });
});

// ── the Settings page ────────────────────────────────────────────────────────────────────────────────────────────
/** the route files of the settings pages, the preset settings dialog, and every settings component they import */
function uiSources(): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
    );
  const all = walk(join(ROOT, "src"));
  const queue = all.filter(
    (f) =>
      (f.includes(`${join("src", "routes")}`) && /settings[^/]*\.tsx$/.test(f)) ||
      /preset-settings[^/]*\.tsx$/.test(f),
  );
  while (queue.length) {
    const f = queue.shift()!;
    if (files.has(f)) continue;
    const src = readFileSync(f, "utf8");
    files.set(f, src);
    for (const m of src.matchAll(/from\s+"([^"]+)"/g)) {
      const spec = m[1];
      const base = spec.startsWith("@/")
        ? join(ROOT, "src", spec.slice(2))
        : spec.startsWith(".")
          ? resolve(dirname(f), spec)
          : null;
      if (!base || !/settings/i.test(base.split("/").at(-1)!)) continue;
      for (const cand of [base, `${base}.tsx`, `${base}.ts`])
        if (all.includes(cand)) queue.push(cand);
    }
  }
  return files;
}

/** Leaves deliberately not on the Settings page or the preset dialog, each with the reason. */
const NOT_SHOWN: Record<string, string> = {
  tfMin: "fixed at the 1m base (normalizeLanes forces 1); the lanes are chosen with `tfs`",
  historyDays: "derived: the longest lane history of tfDays (normalizeLanes)",
  "block.signalsOwn":
    "measured default (a signal's Block level from its own closes, PR #65); not an operator lever",
  "grid.baseTargets":
    "positive coordination pinned in code (positive-defaults.test.ts); a patch or the warnings switch it",
  "live.liveGroupLastN":
    "off by default after the replay on x01's record (docs/live-group-validation.md); patch only",
  "signals.sourcesMode":
    "deny / allow reading of the source list (6 Oct); patch only so far — GAP: not on the page (reported)",
  "signals.baseGate":
    "signals judged on their own exits (Base gate off, measured 3 Oct); patch only",
};
/** signal sources are listed from the SIGNAL_SOURCES catalog on the page, not by name */
const SOURCE_PREFIX = "signals.sources.";

describe("settings completeness: every leaf is on the Settings page or listed as not shown", () => {
  const ui = uiSources();
  const text = [...ui.values()].join("\n");

  it("finds the settings route, the page component and the preset dialog", () => {
    const names = [...ui.keys()].map((f) => f.slice(ROOT.length + 1));
    assert.ok(
      names.some((f) => f.startsWith("src/routes/") && f.endsWith("settings.tsx")),
      names.join(", "),
    );
    assert.ok(names.includes("src/components/v2/pages/settings.tsx"), names.join(", "));
    assert.ok(names.includes("src/components/v2/preset-settings.tsx"), names.join(", "));
  });

  it("every leaf is referenced by its last path segment or its full path", () => {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const missing: string[] = [];
    for (const k of LEAVES.keys()) {
      if (k in NOT_SHOWN || k.startsWith(SOURCE_PREFIX)) continue;
      const seg = k.split(".").at(-1)!;
      // tfDays.<tf>: the keys are numbers, the group name is what the page reads
      const word = /^\d+$/.test(seg) ? k.split(".").at(-2)! : seg;
      if (!new RegExp(`(?<![\\w-])${esc(word)}(?![\\w-])`).test(text) && !text.includes(k))
        missing.push(k);
    }
    assert.deepEqual(missing, [], "add each to the Settings page or to NOT_SHOWN with a reason");
  });

  it("signal sources: the page lists the catalog, and every source in the defaults is in it", () => {
    assert.match(text, /SIGNAL_SOURCES\.map/);
    const names = new Set(SIGNAL_SOURCES.map((s) => s.name));
    const off = [...LEAVES.keys()]
      .filter((k) => k.startsWith(SOURCE_PREFIX))
      .map((k) => k.slice(SOURCE_PREFIX.length));
    assert.deepEqual(
      off.filter((n) => !names.has(n)),
      [],
      "a default source switch the page cannot show",
    );
  });

  it("the not-shown list is not stale: each entry is a leaf and really absent from the page", () => {
    for (const k of Object.keys(NOT_SHOWN)) {
      assert.ok(LEAVES.has(k), `${k} is not a leaf any more`);
      const seg = k.split(".").at(-1)!;
      assert.ok(
        !new RegExp(`(?<![\\w-])${seg}(?![\\w-])`).test(text),
        `${k} is on the page now: drop it from NOT_SHOWN`,
      );
    }
  });
});

// ── presets ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** A preset applied as the runtime applies it (applyPreset + mergeSettings): groups merged one level deep, signals
 *  through mergeSignals, gates / tactics from the defaults, focus replaced. */
function applied(patch: SettingsPatch): CoreSettings {
  const p = presetSettings(patch) as Obj;
  const s: Obj = { ...structuredClone(DEFAULT_SETTINGS) };
  for (const [k, v] of Object.entries(p)) {
    if (k === "signals")
      s.signals = mergeSignals(DEFAULT_SETTINGS.signals, v as Partial<SignalSettings>);
    else if (isObj(v) && isObj(s[k])) s[k] = { ...(s[k] as Obj), ...v };
    else s[k] = structuredClone(v);
  }
  return s as unknown as CoreSettings;
}
const wfOf = (p: { wf?: Record<string, unknown> }): Partial<WalkForwardOptions> => {
  const wf = { ...defaultWalkForward(DEFAULT_SETTINGS), ...(p.wf ?? {}) } as WalkForwardOptions;
  if (p.wf?.coord) wf.coord = coordSettings(p.wf.coord as never);
  return wf;
};

type Json = {
  id: string;
  kept?: boolean;
  experiment?: boolean;
  settings: SettingsPatch;
  wf?: Record<string, unknown>;
};
const DESK_JSON = JSON.parse(readFileSync(join(ROOT, "docs/desk-presets.json"), "utf8")) as Json[];

/** every preset the product offers or carries, by a stable label */
const PRESETS: Array<{
  id: string;
  settings: SettingsPatch;
  wf?: Record<string, unknown>;
  offered: boolean;
}> = [
  ...ALL_RESEARCH_PRESETS.map((p) => ({ id: p.id, settings: p.settings, wf: p.wf, offered: true })),
  ...RESEARCH_RAW.map((p) => ({
    id: `raw:${p.id}`,
    settings: p.settings,
    wf: p.wf,
    offered: false,
  })),
  // every desk candidate, offered or not (the offered ones are DESK_PRESETS above): each still has to be valid
  ...DESK_JSON.map((p) => ({
    id: `desk-json:${p.id}`,
    settings: p.settings,
    wf: p.wf,
    offered: false,
  })),
  ...Object.entries(STRATEGY_PRESETS).map(([k, v]) => ({
    id: `strategy:${k}`,
    settings: { toggles: v.toggles },
    offered: true,
  })),
  ...Object.entries(GATE_PRESETS).map(([k, v]) => ({
    id: `gates:${k}`,
    settings: { gates: v },
    offered: true,
  })),
];

const DOC = readFileSync(join(ROOT, "docs/positive-coordinations.md"), "utf8");
/**
 * A preset that leaves a positive coordination off with the doc's say-so: preset id → the warning fragment it is
 * allowed and the doc section (a heading of docs/positive-coordinations.md) that records the comparison that beat it.
 * Empty: no preset has such a record.
 */
const DOCUMENTED: Record<string, Array<{ warning: string; section: string }>> = {};
/**
 * Presets that turn a positive coordination off WITHOUT a record in the doc (pinned as found, 6 Oct). This list may
 * only shrink: a preset added to it, or a new warning on one of them, fails the test. The test marked todo below
 * stays red until each is either documented (DOCUMENTED, with the doc section) or changed — reported to the operator.
 */
const BLOCK_ACTIVE = "Block Active is on";
const PLAIN_OFF = "Normal / Trailing is off";
const UNDOCUMENTED: Record<string, string[]> = {
  "mx-mom-none-std-ln12-block-active+dca-active": [BLOCK_ACTIVE],
  "mx-mom-none-strong-ln12-block-active": [BLOCK_ACTIVE],
  "mx-mom-none-std-ln12-normal-off+block": [PLAIN_OFF],
  "mx-mom-none-std-ln12-trailing+block-active": [PLAIN_OFF, BLOCK_ACTIVE],
  "mx-mom-none-std-ln12-trailing+dca": [PLAIN_OFF],
  "strategy:normal": [PLAIN_OFF],
  "strategy:trailing": [PLAIN_OFF],
  "strategy:block-active": [BLOCK_ACTIVE],
  "strategy:normal-off+block": [PLAIN_OFF],
  "strategy:dca": [PLAIN_OFF],
  "strategy:dca-active": [PLAIN_OFF],
  "strategy:trailing+block-active": [PLAIN_OFF, BLOCK_ACTIVE],
  "strategy:normal+dca-active": [PLAIN_OFF],
  "strategy:trailing+dca": [PLAIN_OFF],
  "strategy:normal-trailing+block-active": [BLOCK_ACTIVE],
  "strategy:axis": [PLAIN_OFF],
  "strategy:normal+axis": [PLAIN_OFF],
  "strategy:trailing+axis": [PLAIN_OFF],
  "strategy:block-active+dca-active": [BLOCK_ACTIVE],
};

/**
 * The positive coordinations a preset turns off or weakens against the code defaults. The warnings the defaults
 * already raise (signal direction acceptance and Axis are x01 desk settings, code default off — the doc's table rows
 * for x01) are subtracted: a preset is judged on what IT changes.
 */
const BASELINE = new Set(positiveCoordWarnings(DEFAULT_SETTINGS, wfOf({})));
function offBy(p: (typeof PRESETS)[number]): string[] {
  const s = applied(p.settings);
  const found = positiveCoordWarnings(s, wfOf(p)).filter((w) => !BASELINE.has(w));
  // beyond the desk warnings: the coordinations whose setting a preset could weaken without a warning
  const sig = p.settings.signals as Partial<SignalSettings> | undefined;
  if (sig?.sideAccept?.enabled === false)
    found.push("signal direction acceptance switched off by the preset");
  if ((sig?.sideAccept?.minPf ?? SIGNAL_EVAL_MIN_PF) < SIGNAL_EVAL_MIN_PF)
    found.push("signal direction acceptance below PF 1.3");
  if (s.signals.filter.volFloor < 0.003)
    found.push("signal volatility floor below 0.3 % (signals.filter.volFloor)");
  const micro = (p.settings.grid as { micro?: false | { minSlNet?: number } } | undefined)?.micro;
  if (micro && (micro.minSlNet ?? 0) < (MICRO_RANGE.minSlNet ?? 0))
    found.push("Micro stop floor below 0.2 % net (grid.micro.minSlNet)");
  return found;
}

describe("presets: valid and keeping the positive coordinations", () => {
  it("every preset family is covered (research, desk, desk JSON, live, strategy, gates)", () => {
    assert.ok(RESEARCH_RAW.length > 0 && DESK_PRESETS.length > 0 && LIVE_COORD_PRESETS.length > 0);
    assert.equal(
      ALL_RESEARCH_PRESETS.length,
      RESEARCH_RAW.length + DESK_PRESETS.length + LIVE_COORD_PRESETS.length,
    );
    assert.ok(Object.keys(STRATEGY_PRESETS).length > 0 && Object.keys(GATE_PRESETS).length > 0);
  });

  it("the desk presets and docs/desk-presets.json agree: every kept candidate is offered, every offered one measured", () => {
    // the JSON is the measurement record; presets.desk.ts offers the kept candidates and, by decision (ade9631), the
    // earlier kept ones with their earlier measured periods — so offered ⊇ kept, and nothing is offered unmeasured
    const offered = new Set(DESK_PRESETS.map((p) => p.id));
    for (const p of DESK_JSON.filter((x) => x.kept))
      assert.ok(offered.has(`desk-${p.id}`), `kept ${p.id} not offered`);
    const measured = new Set(DESK_JSON.map((p) => `desk-${p.id}`));
    for (const id of offered)
      assert.ok(measured.has(id), `${id} has no candidate in docs/desk-presets.json`);
    for (const p of DESK_JSON.filter((x) => x.experiment))
      assert.ok(!offered.has(`desk-${p.id}`), `experiment ${p.id} offered`);
  });

  it("no preset carries what a preset must never change (the Live stage, sizing, cost …)", () => {
    for (const p of [...ALL_RESEARCH_PRESETS, ...RESEARCH_RAW] as Preset[])
      for (const k of PRESET_EXCLUDED) assert.ok(!(k in p.settings), `${p.id} carries ${k}`);
  });

  for (const p of PRESETS)
    it(`${p.id}: the patch and the preset merged onto the defaults pass checkSettings`, () => {
      assert.doesNotThrow(() => checkSettings(p.settings as Partial<CoreSettings>), "the patch");
      const s = applied(p.settings);
      assert.doesNotThrow(() => checkSettings(s), "merged");
      assert.doesNotThrow(
        () => checkMerged(DEFAULT_SETTINGS, p.settings as Partial<CoreSettings>),
        "cross-field",
      );
    });

  it("documented exceptions cite a section the doc has", () => {
    const heads = new Set([...DOC.matchAll(/^#+\s+(.+)$/gm)].map((m) => m[1].trim()));
    for (const [id, xs] of Object.entries(DOCUMENTED))
      for (const x of xs)
        assert.ok(heads.has(x.section), `${id}: no section "${x.section}" in the doc`);
  });

  it("no offered preset turns a positive coordination off beyond the documented exceptions and the pinned list", () => {
    const got: Record<string, string[]> = {};
    for (const p of PRESETS) {
      if (!p.offered) continue;
      const ok = DOCUMENTED[p.id] ?? [];
      const off = offBy(p).filter((w) => !ok.some((x) => w.includes(x.warning)));
      if (off.length) got[p.id] = off;
    }
    // each found warning must be one the pinned list names for that preset, and the pinned list must be exact
    const asPinned = Object.fromEntries(
      Object.entries(got).map(([id, ws]) => [
        id,
        ws.map((w) => (UNDOCUMENTED[id] ?? []).find((x) => w.includes(x)) ?? w),
      ]),
    );
    assert.deepEqual(asPinned, UNDOCUMENTED);
  });

  it(
    "every preset that turns a positive coordination off is documented in docs/positive-coordinations.md",
    {
      todo: "19 offered presets (5 research, 14 strategy) leave Normal / Trailing off or Block Active on without a record — reported",
    },
    () => {
      assert.deepEqual(Object.keys(UNDOCUMENTED), []);
    },
  );

  it("the checks catch a preset that switches a coordination off (the helper is not vacuous)", () => {
    const bad = [
      {
        id: "t1",
        settings: { toggles: { ...DEFAULT_SETTINGS.toggles, blockActive: true } },
        offered: true,
      },
      {
        id: "t2",
        settings: { signals: { accept: { ...DEFAULT_SETTINGS.signals.accept, minPf: 1.05 } } },
        offered: true,
      },
      { id: "t3", settings: {}, wf: { coord: { enabled: true, confirm: false } }, offered: true },
      {
        id: "t4",
        settings: { gates: { ...DEFAULT_SETTINGS.gates, warmup: false } },
        offered: true,
      },
      {
        id: "t5",
        settings: { grid: { ...DEFAULT_SETTINGS.grid, baseTargets: false } },
        offered: true,
      },
      {
        id: "t6",
        settings: { signals: { filter: { trendH: 0, volFloor: 0.001 } } },
        offered: true,
      },
      {
        id: "t7",
        settings: {
          signals: { sideAccept: { ...DEFAULT_SETTINGS.signals.sideAccept, enabled: false } },
        },
        offered: true,
      },
      { id: "t8", settings: {}, wf: { seatPer: "pair" }, offered: true },
    ] as Array<(typeof PRESETS)[number]>;
    for (const p of bad) assert.ok(offBy(p).length > 0, p.id);
    assert.deepEqual(offBy({ id: "ok", settings: {}, offered: true }), []);
  });
});
