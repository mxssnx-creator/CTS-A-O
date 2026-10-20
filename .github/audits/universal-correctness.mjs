#!/usr/bin/env node
// Read-only complete registry coverage on native cached prices. This is correctness evidence, not a profitable portfolio.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { INDICATIONS, indicationState, laneOf } from "../../src/core/indications/registry.ts";
import { INDICATION_KINDS } from "../../src/core/domain/types.ts";
import {
  allCombos,
  laneInds,
  makeUniverse,
  laneProtect,
  configId,
  parseConfigId,
  protectKind,
  rangeAppliesTo,
} from "../../src/core/pipeline/pipeline.ts";
import { barsFromCandles, resample } from "../../src/core/market/bars.ts";
import { DEFAULT_SETTINGS } from "../../src/core/config.ts";
import { baseRangeRules } from "../../src/core/server/runtime.server.ts";
import {
  protectGrid,
  makeTape,
  configEval,
  defaultWalkForward,
} from "../../src/core/sim/walkforward.ts";
import { tapeReturnIndex } from "../../src/core/audit.ts";
import { entrySignal } from "../../src/core/bots/bots.ts";
import {
  sessionStudySourceFiles,
  studyExactJson,
  studySha256,
} from "../../scripts/lib/session-study.mjs";

const mode = process.argv[2] ?? "catalog",
  out = process.argv[3] ?? "runs/micro-ci-universal";
mkdirSync(out, { recursive: true });
const tfs = [1, 5, 15, 30],
  specs = [...INDICATIONS],
  combos = allCombos([], [], tfs);
assert.equal(
  new Set(specs.map((s) => s.id)).size,
  specs.length,
  "Duplicate indication registration",
);
assert.equal(
  new Set(combos.map((c) => `${c.bot}|${c.ind}`)).size,
  combos.length,
  "Duplicate bot/lane combination",
);
const files = sessionStudySourceFiles(),
  sourceSha256 = studySha256(studyExactJson(files));
const frozenPlan = JSON.parse(readFileSync("docs/universal-correctness-2026-10-21/plan.json"));
assert.equal(
  sourceSha256,
  frozenPlan.sourceSha256,
  "Universal audit source differs from the preregistered revision",
);
assert.equal(specs.length, frozenPlan.scope.registeredSpecs);
assert.equal(combos.length, frozenPlan.scope.engineBotLaneCombos);
const scope = {
  sourceSha256,
  registeredSpecs: specs.length,
  byKind: Object.fromEntries(
    INDICATION_KINDS.map((k) => [k, specs.filter((s) => s.kind === k).length]),
  ),
  engineCombos: combos.length,
  timeframes: tfs,
};

if (mode === "catalog") {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const originalDefaultCells = protectGrid(15, settings.grid, settings.cost).length;
  const coverageOverrides = [];
  if (!settings.grid.tp.length) {
    settings.grid.tp = [0.02];
    coverageOverrides.push("Wide: explicit 2% target, retaining existing stop/trail/hold arrays");
  }
  if (settings.grid.minimalPlus) {
    settings.grid.minimalPlus.enabled = true;
    if (!settings.grid.minimalPlus.cells?.length) {
      settings.grid.minimalPlus.cells = [
        { tp: 0.004, sl: 0.006, trail: 0 },
        { tp: 0.004, sl: 0.006, trail: 0.002 },
      ];
      coverageOverrides.push(
        "Minimal Plus: two explicit identity-test cells; production dynamic fitting is tested separately",
      );
    }
  }
  const rules = baseRangeRules(settings),
    grid = protectGrid(15, settings.grid, settings.cost),
    tags = [...new Set(grid.map((p) => p.tag ?? "wide"))];
  const byTf = {},
    violations = [];
  for (const tf of tfs) {
    const keys = new Map(),
      counts = {};
    for (const p of grid) {
      const q = laneProtect(p, `rsi-14@m${tf}`),
        id = configId("follow", `rsi-14@m${tf}`, q, protectKind(q)),
        parsed = parseConfigId(id);
      assert.ok(parsed, id);
      for (const k of ["tp", "sl", "trail"])
        assert.ok(Math.abs(parsed.protect[k] - q[k]) <= 5.01e-7, `Lossy ${k}: ${id}`);
      assert.equal(parsed.protect.hold, q.hold);
      const previous = keys.get(id);
      if (previous && studyExactJson(previous) !== studyExactJson(q))
        violations.push({
          name: "different protection collapsed into one config ID",
          tf,
          id,
          previous,
          q,
        });
      keys.set(id, q);
      const tag = q.tag ?? "wide";
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
    byTf[tf] = {
      rawConfiguredCells: grid.length,
      uniqueActualProtectIdentities: keys.size,
      cellsByRange: counts,
    };
  }
  const eligible = {},
    noEligibleRange = [];
  for (const c of combos) {
    const own = tags.filter((tag) =>
      rangeAppliesTo(c.ind, tag === "wide" ? "" : tag, rules.applies),
    );
    for (const tag of own) eligible[tag] = (eligible[tag] ?? 0) + 1;
    if (!own.length) noEligibleRange.push(`${c.bot}|${c.ind}`);
  }
  const result = {
    scope,
    classification:
      "Complete static registry and configured protect identity audit; this does not execute every Cartesian market cell",
    configuredRanges: tags,
    originalDefaultCells,
    coverageOverrides,
    byTf,
    eligibleEnginePairsByRange: eligible,
    noEligibleRange: { count: noEligibleRange.length, examples: noEligibleRange.slice(0, 30) },
    violations,
    notes: [
      "Minimal Plus is explicitly enabled for this catalog check; all original distance/gate values are retained.",
      "The actual target/stop/trail/hold identities are checked exhaustively per lane. Bot/indication prefixes are independently unique, so the full Cartesian identity mapping need not be allocated in memory.",
      "A lane slower than an explicitly requested maximum hold cannot execute that cell; the engine reports this refusal instead of exceeding the configured time.",
      "Signal sources and Stable-02 ports use their dedicated Signal engine. Legacy equivalent engine aliases share the documented execution key policy; independent source qualification is still separate.",
    ],
  };
  writeFileSync(`${out}/catalog.json`, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  assert.equal(violations.length, 0);
} else if (mode === "identity") {
  const kinds = ["normal", "trailing", "trailing-only", "exit", "dca", "dca-active", "axis"],
    tags = ["", "mc", "mn", "mp", "sh", "gn", "lg"];
  let checked = 0,
    hourlyDecisions = 0,
    losingOwnHourlyDecisions = 0;
  const byKind = {},
    H = 3600000,
    now = Date.UTC(2026, 9, 1, 12);
  const opts = { ...defaultWalkForward(DEFAULT_SETTINGS), preH: 12, validLastN: 15, lastN: 15 };
  for (const spec of specs) {
    const lanes = new Set(
      combos.filter((c) => c.bot === "follow" && laneOf(c.ind).base === spec.id).map((c) => c.ind),
    );
    if (!lanes.size) for (const ind of laneInds(spec.id, tfs)) lanes.add(ind);
    for (const ind of lanes)
      for (const kind of kinds)
        for (const tag of tags) {
          const p = {
            tp: 0.01,
            sl: 0.02,
            trail: kind.startsWith("trailing") ? 0.005 : 0,
            hold: 60,
            ...(tag ? { tag } : {}),
            ...(kind === "trailing-only" ? { trailOnly: true } : {}),
          };
          const id = configId("follow", ind, p, kind);
          const close = (side) => ({
            cfg: id,
            sym: "A",
            side,
            entryT: now - H,
            exitT: now - H + 60000,
            entry: 100,
            exit: 100 * (1 + side * 0.0115),
            r: 0.01,
            kind,
            reason: "tp",
            bars: 1,
            mfe: 0,
            mae: 0,
          });
          for (const side of [1, -1]) {
            const t = close(side),
              tp = makeTape(id, "follow", ind, p, kind, ["A"], [t], [], []);
            assert.ok(tapeReturnIndex(tp, { ...t, r: 0.03, mult: 3 }) >= 0);
            for (const patch of [
              { cfg: `${id}|sibling` },
              { sym: "OTHER" },
              { side: -side },
              { entryT: t.entryT + 1 },
              { exitT: t.exitT + 1 },
              { r: 0.0085, mult: 1 },
              { mult: undefined },
            ])
              assert.equal(
                tapeReturnIndex(tp, { ...t, ...patch }),
                -1,
                `${id}: ${JSON.stringify(patch)}`,
              );
            checked++;
          }
        }
    // Own settled Last-N must remain causal at hourly transitions; future losses cannot rewrite a past gate.
    const ind = [...lanes][0],
      p = { tp: 0.02, sl: 0.01, trail: 0, hold: 60 },
      id = configId("follow", ind, p);
    const history = Array.from({ length: 180 }, (_, i) => ({
      cfg: id,
      sym: "A",
      side: 1,
      entryT: now - 15 * H + i * 5 * 60000,
      exitT: now - 15 * H + i * 5 * 60000 + 60000,
      r: i % 5 ? 0.02 : -0.01,
      kind: "normal",
      entry: 100,
      exit: 101,
      reason: "time",
      bars: 1,
      mfe: 0,
      mae: 0,
    }));
    const future = [
      ...history,
      ...Array.from({ length: 50 }, (_, i) => ({
        ...history[0],
        entryT: now + i * 60000,
        exitT: now + (i + 1) * 60000,
        r: -1,
      })),
    ];
    const own = makeTape(id, "follow", ind, p, "normal", ["A"], history, [], []),
      poisoned = makeTape(id, "follow", ind, p, "normal", ["A"], future, [], []);
    const losing = makeTape(
      id,
      "follow",
      ind,
      p,
      "normal",
      ["A"],
      history.map((t) => ({ ...t, r: -0.02 })),
      [],
      [],
    );
    for (const t of [now - 3 * H, now - 2 * H, now - H]) {
      const a = configEval(own, t, opts),
        b = configEval(poisoned, t, opts);
      assert.deepEqual(a, b, `${id}: future changed own hourly gate`);
      assert.ok(a.ok, `${id}: controlled stable own record unexpectedly failed ${a.fail}`);
      assert.equal(
        configEval(losing, t, opts).ok,
        false,
        `${id}: losing own history borrowed a passing result`,
      );
      assert.deepEqual(
        configEval(own, t, opts),
        a,
        `${id}: another tape with the same ID contaminated the gate cache`,
      );
      hourlyDecisions++;
      losingOwnHourlyDecisions++;
    }
    byKind[spec.kind] = (byKind[spec.kind] ?? 0) + 1;
  }
  const result = {
    scope,
    classification:
      "Synthetic identity contract for all registered source/lane/type/range combinations; three causal hourly own-history gate checks per source. Hypothetical combinations do not override real range eligibility or prove market profits.",
    strategyKinds: kinds,
    ranges: tags.map((x) => x || "wide"),
    checkedIdentityCells: checked,
    ownHourlyDecisions: hourlyDecisions,
    losingOwnHourlyDecisions,
    completedSpecsByKind: byKind,
    violations: 0,
  };
  writeFileSync(`${out}/identity.json`, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
} else if (mode === "causal") {
  const bytes = readFileSync("docs/micro-optimization-2026-10-20/reproduction-feed.json.gz");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "a7beade8b9f2da1f5c2d5fda9b8ef32a4ce5bcc045ad10c67cd5678333c4224e",
  );
  const feed = JSON.parse(gunzipSync(bytes)),
    symbols = feed.tickers.map((x) => x.sym).sort();
  assert.equal(symbols.length, 20);
  const endT = Math.min(...symbols.map((sym) => feed.candles[`${sym}|1`].at(-1).t + 60000));
  const cuts = Array.from({ length: 6 }, (_, i) => endT - (6 - i) * 3600000);
  const native = symbols.flatMap((sym) =>
    tfs.map((tf) => ({ sym, tf, candles: resample(feed.candles[`${sym}|1`], 1, tf) })),
  );
  const make = (cut) =>
    makeUniverse(
      native.map(({ sym, tf, candles }) => ({
        ...barsFromCandles(
          sym,
          tf,
          candles.filter((c) => c.t + tf * 60000 <= cut),
        ),
        lanes: tfs,
      })),
    );
  const engineLanes = new Map();
  const botsByLane = new Map();
  for (const c of combos) {
    const bs = botsByLane.get(c.ind) ?? new Set();
    bs.add(c.bot);
    botsByLane.set(c.ind, bs);
  }
  for (const c of combos)
    if (c.bot === "follow")
      (
        engineLanes.get(laneOf(c.ind).base) ??
        engineLanes.set(laneOf(c.ind).base, new Set()).get(laneOf(c.ind).base)
      ).add(c.ind);
  const violations = [],
    groups = [],
    completedSpecs = new Set();
  const only = process.argv[4];
  for (const kind of INDICATION_KINDS.filter((k) => !only || k === only)) {
    const own = specs.filter((s) => s.kind === kind),
      universes = [make(endT), ...cuts.map(make)];
    let entryComparisons = 0,
      entryCases = 0;
    let comparisons = 0,
      comparedBars = 0,
      laneSymbolCases = 0,
      longStates = 0,
      shortStates = 0;
    const errorsBefore = violations.length;
    for (const spec of own) {
      const lanes = engineLanes.get(spec.id) ?? new Set(laneInds(spec.id, tfs));
      assert.ok(lanes.size, `Unprocessed registry ID ${spec.id}`);
      for (const ind of lanes)
        for (const sym of symbols) {
          const tf = laneOf(ind).tf;
          const caches = universes.map((u) =>
            u.caches.find((k) => k.b.sym === sym && k.b.tfMin === tf),
          );
          assert.ok(caches.every(Boolean), `Missing native context ${sym}/${ind}`);
          try {
            const full = indicationState(ind, caches[0]);
            assert.ok(full && full.length === caches[0].b.n, `Invalid state shape ${sym}/${ind}`);
            for (const state of full) {
              assert.ok(
                state === -1 || state === 0 || state === 1,
                `Invalid state value ${sym}/${ind}`,
              );
              if (state === 1) longStates++;
              if (state === -1) shortStates++;
            }
            for (let j = 1; j < caches.length; j++) {
              const prefix = indicationState(ind, caches[j]);
              assert.ok(
                prefix && prefix.length === caches[j].b.n,
                `Invalid prefix shape ${sym}/${ind}`,
              );
              let first = -1;
              for (let i = 0; i < prefix.length; i++)
                if (prefix[i] !== full[i]) {
                  first = i;
                  break;
                }
              if (first >= 0)
                violations.push({
                  kind,
                  id: spec.id,
                  ind,
                  sym,
                  cut: cuts[j - 1],
                  firstChangedT: caches[j].b.t[first],
                  full: full[first],
                  prefix: prefix[first],
                });
              comparisons++;
              comparedBars += prefix.length;
            }
            for (const bot of botsByLane.get(ind) ?? ["follow"]) {
              const entries = entrySignal(bot, ind, caches[0], DEFAULT_SETTINGS.tactics);
              assert.ok(
                entries && entries.length === caches[0].b.n,
                `Invalid entry shape ${bot}/${sym}/${ind}`,
              );
              for (let j = 1; j < caches.length; j++) {
                const prefix = entrySignal(bot, ind, caches[j], DEFAULT_SETTINGS.tactics);
                assert.ok(
                  prefix && prefix.length === caches[j].b.n,
                  `Invalid entry prefix ${bot}/${sym}/${ind}`,
                );
                let first = -1;
                for (let i = 0; i < prefix.length; i++)
                  if (prefix[i] !== entries[i]) {
                    first = i;
                    break;
                  }
                if (first >= 0)
                  violations.push({
                    kind,
                    id: spec.id,
                    ind,
                    bot,
                    sym,
                    cut: cuts[j - 1],
                    firstChangedT: caches[j].b.t[first],
                    fullEntry: entries[first],
                    prefixEntry: prefix[first],
                  });
                entryComparisons++;
              }
              for (const k of caches) k.forgetSuffix(`${bot}:${ind}`);
              entryCases++;
            }
            laneSymbolCases++;
          } catch (e) {
            violations.push({ kind, id: spec.id, ind, sym, error: String(e) });
          }
        }
      completedSpecs.add(spec.id);
    }
    groups.push({
      kind,
      specs: own.length,
      laneSymbolCases,
      comparisons,
      comparedBars,
      entryComparisons,
      entryCases,
      longStates,
      shortStates,
      violations: violations.length - errorsBefore,
    });
    writeFileSync(
      `${out}/causal.json`,
      JSON.stringify(
        {
          scope,
          classification:
            "Native-price state shape/domain and six hourly prefix comparisons for every eligible registry/lane/symbol; not portfolio or profitability evidence",
          symbols,
          endT,
          cuts,
          completedSpecs: completedSpecs.size,
          groups,
          violationCount: violations.length,
          violations: violations.slice(0, 200),
          complete: false,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(groups.at(-1)));
    for (const u of universes) for (const k of u.caches) k.clear();
    globalThis.gc?.();
  }
  const expected = specs.filter((s) => !only || s.kind === only).length;
  assert.equal(completedSpecs.size, expected);
  const result = JSON.parse(readFileSync(`${out}/causal.json`));
  result.complete = true;
  writeFileSync(`${out}/causal.json`, JSON.stringify(result, null, 2) + "\n");
  assert.equal(
    violations.length,
    0,
    "Historical indication states changed after adding future bars or failed calculation",
  );
} else throw Error(`Unknown audit mode ${mode}`);
