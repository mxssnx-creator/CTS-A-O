// The eval scores every order at one unit (scripts/lib/eval-orders.mjs unitR): an order the engine sized by its Block
// multiple (r × mult) counts its unit return, closed and marked-open alike.
import { test } from "node:test";
import assert from "node:assert/strict";
import { unitR, windowOrders } from "./lib/eval-orders.mjs";
import { pfOf, variantScores } from "./lib/eval-variants.mjs";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Script } from "node:vm";

test("a Block-raised order scores at its unit return; an unsized one as stored", () => {
  assert.equal(unitR({ r: 0.03, mult: 3 }), 0.01);
  assert.equal(unitR({ r: -0.02, mult: 1 }), -0.02);
  assert.equal(unitR({ r: 0.015 }), 0.015, "no multiple stored: the return is the unit return");
  for (const mult of [0, -1, NaN, Infinity, null, "2"]) assert.ok(Number.isNaN(unitR({ r: 0.015, mult })), `bad multiple ${mult} is unknown`);
  assert.ok(Number.isNaN(unitR({ r: 0.015, mult: 2, unitR: null })), "explicit unknown unit evidence cannot fall back to a raw or divided return");
  assert.equal(unitR({ r: 0.06, mult: 2, unitR: 0.01 }), 0.01, "verified unit evidence is never divided twice");
});

test("a marked-open order keeps its multiple through windowOrders, so it scores at one unit too", () => {
  const w = { from: 1000, to: 2000 };
  const raw = {
    trades: [{ cfg: "c", sym: "S", side: 1, entryT: 1100, entry: 1, exitT: 1500, exit: 1, r: 0.06, reason: "tp", mult: 2 }],
    openEnd: [{ cfg: "c", sym: "S", side: 1, entryT: 1200, entry: 1, mtmR: -0.04, mult: 4 }],
  };
  const { all } = windowOrders(raw, w);
  assert.deepEqual(all.map(unitR), [0.03, -0.01]);
});

test("open marks retain explicit unknown unit evidence and unknown mark values instead of dropping their samples", () => {
  const { all } = windowOrders({ openEnd: [
    { cfg: "c", sym: "S", side: 1, entryT: 1100, entry: 1, mtmR: -0.04, mult: 4, unitR: null },
    { cfg: "c", sym: "S", side: 1, entryT: 1200, entry: 1, mtmR: null, unitR: null },
    { cfg: "c", sym: "S", side: 1, entryT: 1300, entry: 1, mtmR: -0.04, mult: 4, unitR: -0.02 },
  ] }, { from: 1000, to: 2000 });
  assert.equal(all.length, 3);
  assert.equal(all[0].unitR, null);
  assert.equal(all[1].unitR, null);
  assert.ok(Number.isNaN(unitR(all[0])));
  assert.ok(Number.isNaN(unitR(all[1])));
  assert.equal(unitR(all[2]), -0.02);
});

test("unknown normalized returns stay unscored after JSON null conversion and retain every variant sample", () => {
  const cfg = "follow|x@m15|tp1|sl2|tr0|h64|gn";
  const trades = [{ cfg, r: unitR({ r: 0.04, mult: 2 }) }, { cfg, r: unitR({ r: -0.06, mult: 0 }) }];
  const windows = JSON.parse(JSON.stringify([{ name: "W", trades }]));
  assert.equal(windows[0].trades[1].r, null);
  const [v] = variantScores(windows);
  assert.equal(v.n, 2);
  assert.equal(v.unknownReturns, 1);
  assert.equal(v.status, "unscored");
  assert.equal(v.pass, false);
  assert.ok(Number.isNaN(v.minPf));
  assert.equal(v.perWindow[0].n, 2);
  assert.equal(v.perWindow[0].pf, null);
  assert.equal(v.perWindow[0].unknownReturns, 1);
  assert.equal(v.perWindow[0].status, "unscored");
});

test("each evaluator PF helper rejects unknown numeric evidence before it can become a no-loss score", () => {
  const sources = [
    { file: "./eval-gate.mjs", pattern: /function pf\(rs\) \{[\s\S]*?\n\}/, name: "pf" },
    { file: "./eval-families.mjs", pattern: /const pfOf = \(rs\) => \{[\s\S]*?\n\};/, name: "pfOf" },
  ];
  const guards = [pfOf, ...sources.map(({ file, pattern, name }) => {
    const code = readFileSync(new URL(file, import.meta.url), "utf8").match(pattern)?.[0];
    assert.ok(code);
    return new Script(`${code}; ${name}`).runInNewContext();
  })];
  for (const pf of guards) {
    assert.equal(pf([0.04, -0.02]), 2);
    for (const unknown of [NaN, null, undefined, Infinity, "0"]) assert.ok(Number.isNaN(pf([0.04, unknown])), `unknown ${unknown} cannot qualify`);
  }
});

test("eval-gate keeps invalid closed/open dump samples and marks whole primary periods and families unavailable", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-eval-unknown-"));
  try {
    const feed = join(dir, "feed.json"), session = join(dir, "session.mjs");
    writeFileSync(feed, JSON.stringify({ tickers: [], candles: { "S-USDT|1": [{ t: Date.parse("2026-09-20T00:00:00Z"), o: 1 }] } }));
    writeFileSync(session, `import {writeFileSync} from "node:fs";
const a=k=>process.argv[process.argv.indexOf("--"+k)+1],to=Date.parse(a("end-at")),from=to-Number(a("run"))*3600000;
const cfg="follow|ema-21-55@m15|tp1|sl2|tr0|h64|gn",pair="follow|ema-21-55@m15";
const common={cfg,sym:"S-USDT",side:1,entry:1,exit:1};
const trades=[{...common,entryT:from+3600000,exitT:from+7200000,r:.04,mult:2,reason:"tp"},{...common,entryT:from+10800000,exitT:from+14400000,r:-.06,mult:0,reason:"sl"}];
const openEnd=[{...common,entryT:from+18000000,mtmR:-.04,mult:4,unitR:null}];
writeFileSync(a("dump"),JSON.stringify({trades,openEnd,basePairs:[{pair,passed:true,tags:["gn"],pf:2,n:20}],engine:{mem:{computeLevel:0},baseByRange:[],baseWhy:[]}}));`);
    const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", fileURLToPath(new URL("./eval-gate.mjs", import.meta.url)),
      "--label", "unknown", "--feed", feed, "--jobs", "1", "--expect-mb", "1", "--from", "2026-10-01T00:00:00Z", "--to", "2026-10-02T00:00:00Z"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, CTS_EVAL_SESSION: session, CTS_EVAL_RESERVE_MB: "0" }, timeout: 30000 });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const out = JSON.parse(readFileSync(join(dir, "runs/eval/gate/unknown.json"), "utf8"));
    assert.equal(out.trades.length, 3);
    assert.equal(out.trades[0].r, 0.02);
    assert.equal(out.trades[0].rWeighted, 0.04);
    assert.equal(out.trades[1].unitR, null);
    assert.equal(out.trades[2].unitR, null);
    assert.equal(out.windows[0].trades, 3);
    assert.equal(out.windows[0].unknownReturns, 2);
    assert.equal(out.windows[0].pf, null);
    assert.equal(out.windows[0].pairs[0].win, 3);
    assert.equal(out.windows[0].pairs[0].winPf, null);
    assert.equal(out.summary.pf.d1, null);
    assert.equal(out.summary.basis, "unavailable");
    assert.equal(out.summary.unknownReturns.d1, 2);
    assert.equal(out.summary.variants[0].n, 3);
    assert.equal(out.summary.variants[0].status, "unscored");
    assert.equal(out.summary.families[0].trades, 3);
    assert.equal(out.summary.families[0].pf02, null);
    assert.equal(out.summary.families[0].verdict, "not judged");
    assert.equal(out.summary.families[0].unknownReturns, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("eval-families never sends an unknown unit group or period into numeric bot-stat qualification", () => {
  const source = readFileSync(new URL("./eval-families.mjs", import.meta.url), "utf8");
  const begin = source.indexOf("  // Unknown unit evidence invalidates"), end = source.indexOf("  const tmp = file", begin);
  assert.ok(begin > 0 && end > begin);
  const cfg = "follow|x@m15|tp1|sl2|tr0|h64|gn";
  const rows = [100, 300].map((entryT) => ({ id: `id${entryT}`, cfg, sym: "S", side: 1, entryT, exit_t: entryT + 1, entry: 1, exit: 1, r: unitR({ r: -0.03, unitR: null }), unitR: null, rWeighted: -0.03, reason: "sl" }));
  let calls = 0;
  const out = new Script(`${source.slice(begin, end)}; JSON.parse(JSON.stringify(out));`).runInNewContext({
    rows, f: { label: "eng follow gn", kind: "eng" }, D1A: { from: 0, to: 200 }, D1B: { from: 200, to: 400 }, D1: { from: 0, to: 400 },
    botStatsFromRows: () => { calls++; throw new Error("unknown group must not be numerically judged"); },
    pfOf, SCHEMA: 6, feedSha: "fixture", WIN_H: 48, PRE: 24, SYMBOLS: 1, perWindow: [], t0: Date.now(),
  });
  assert.equal(calls, 0);
  assert.equal(out.trades, 2);
  assert.equal(out.unknownReturns, 2);
  assert.equal(out.pfBasis, "unavailable");
  assert.equal(out.verdict, "unscored: unit return unavailable");
  assert.equal(out.stats, null);
  assert.equal(out.halves.d1a.trades, 1);
  assert.equal(out.halves.d1a.stats, null);
  assert.equal(out.halves.d1b.stats, null);
  assert.equal(out.cells[0].n, 2);
  assert.equal(out.cells[0].pf, null);
  assert.equal(out.rows.length, 2);
  assert.equal(out.rows[0][out.rowsCols.indexOf("rWeighted")], -0.03);
  assert.equal(out.rows[0][out.rowsCols.indexOf("unitR")], null);
});
