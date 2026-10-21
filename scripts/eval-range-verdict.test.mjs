// scripts/eval-range-verdict.mjs end to end: synthetic eval-gate outputs in <tmp>/runs/eval/gate, the CLI spawned on
// them (--beside-eval: an eval may run on the host; a 1 GB heap, so it does not restart itself). The rows, the
// verdicts, the outcome ("works" only from valid runs: a forward pair with a memory-fallback window gives none), the
// refusals (another split, another feed, a missing label, an unknown kind).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("./eval-range-verdict.mjs", import.meta.url));
const H = 3_600_000;
const T0 = Date.parse("2026-09-29T11:00:00Z");
const F0 = Date.parse("2026-10-09T11:00:00Z");
const iso = (t) => new Date(t).toISOString();
const FEED = { feed: 1000, feedStart: "2026-09-19T00:00:00.000Z" };
const GN = (x) => `follow|${x}@m15|tp1|sl2|tr0|h64|gn`;
const MC = (x) => `follow|mc-${x}@m15|tp0.5|sl0.5|tr0|h192|mc`;
const LG = (x) => `follow|${x}@m30|tp4|sl4|tr0|h192|lg`;

/**
 * `n` events from `fromT` (one every 15 min, symbol AAA), half winning at pf × 0.001 and half losing 0.001: PF pf. Each
 * event is one order per config in `cfgs` (two configs: two orders on the same bar, one event).
 */
function events(cfgs, fromT, n, pf, sym = "AAA-USDT") {
  const xs = [];
  for (let i = 0; i < n; i++) {
    const entryT = fromT + (i + 1) * (H / 4);
    const r = i % 2 === 0 ? pf * 0.001 : -0.001;
    for (const cfg of cfgs) xs.push({ cfg, sym, side: 1, entryT, entry: 1, exitT: entryT + H / 2, exit: 1, r, reason: r > 0 ? "tp" : "sl" });
  }
  return xs;
}

/** an eval-gate output: `wins` 48 h windows from `t0`, split `split`; rows: { cfgs, pf per window, n per window } */
function output(label, { t0 = T0, wins = 5, split = T0 + 120 * H, rows = [], memLevel = [], feed = FEED, extra = [] } = {}) {
  const windows = Array.from({ length: wins }, (_, k) => ({
    from: iso(t0 + k * 48 * H),
    to: iso(t0 + (k + 1) * 48 * H),
    runH: 48,
    warmup: { haveH: 200, needH: 100, short: false, limitedLanes: [] },
    memLevel: memLevel[k] ?? 0,
  }));
  const trades = [];
  for (const r of rows) for (let k = 0; k < wins; k++) trades.push(...events(r.cfgs, t0 + k * 48 * H, r.n ?? 16, r.pf[k]));
  trades.push(...extra);
  return {
    summary: {
      label,
      span: { from: iso(t0), to: iso(t0 + wins * 48 * H), split: iso(split) },
      ...feed,
      memFallbackWindows: windows.filter((w) => w.memLevel > 0).length,
      warmupShortWindows: [],
      variants: [],
      toggles: { dca: false, dcaActive: false, block: false, blockActive: false, axis: false },
      settings: {},
      wf: {},
    },
    windows,
    trades,
  };
}

// General: b0 1.0 / 0.9; the lever 1.07 / 1.00, higher in 4 of 5 windows (window 3 equal), on two configs per event,
// and one order open at window 5's end (in PF, not in pfClosed). Micro: +0.02 only (not chosen). Long: 60 events per
// window at PF 1.3 against b0's 1.0 (kept, and the target's D1 part is reached).
const B0 = [
  { cfgs: [GN("a")], pf: [1, 1, 1, 0.9, 0.9] },
  { cfgs: [MC("a")], pf: [1, 1, 1, 1, 1] },
  { cfgs: [LG("a")], n: 60, pf: [1, 1, 1, 1, 1] },
];
const LEVER = [
  { cfgs: [GN("a"), GN("b")], pf: [1.1, 1.11, 1, 1, 1] },
  { cfgs: [MC("a")], pf: [1.02, 1.02, 1.02, 1.02, 1.02] },
  { cfgs: [LG("a")], n: 60, pf: [1.3, 1.3, 1.3, 1.3, 1.3] },
];
const OPEN = { cfg: GN("c"), sym: "AAA-USDT", side: 1, entryT: T0 + 192 * H + H, entry: 1, exitT: T0 + 240 * H, exit: null, r: -0.0002, reason: "open-end" };
// F: one 48 h window, 120 Long orders at PF 1.3 (b0 1.0)
const fwd = (label, pf, memLevel = []) =>
  output(label, { t0: F0, wins: 1, split: F0 + 24 * H, rows: [{ cfgs: [LG("a")], n: 120, pf: [pf] }], memLevel });

const DIR = mkdtempSync(join(tmpdir(), "eval-range-verdict-"));
mkdirSync(join(DIR, "runs/eval/gate"), { recursive: true });
const put = (o) => writeFileSync(join(DIR, "runs/eval/gate", `${o.summary.label}.json`), JSON.stringify(o));
put(output("b0", { rows: B0 }));
put(output("lever", { rows: LEVER, extra: [OPEN] }));
put(output("bad", { rows: LEVER, memLevel: [0, 1, 0, 0, 0] }));
put(output("other", { rows: LEVER, split: T0 + 96 * H }));
put(output("otherfeed", { rows: LEVER, feed: { feed: 2000, feedStart: FEED.feedStart } }));
put(fwd("fb0", 1));
put(fwd("fl", 1.3));
put(fwd("flbad", 1.3, [1]));

const cli = (...args) =>
  spawnSync(process.execPath, ["--max-old-space-size=1024", "--experimental-strip-types", "--no-warnings", CLI, "--beside-eval", ...args], {
    encoding: "utf8",
    cwd: DIR,
  });
const json = (...args) => {
  const r = cli(...args, "--json");
  assert.equal(r.status, 0, r.stderr + r.stdout);
  return JSON.parse(r.stdout);
};
const rowOf = (out, name) => out.rows.find((x) => x.name === name);

test("--json: the rows in order, events against orders, PF with the open order against pfClosed, each verdict", () => {
  const out = json("--base", "b0", "--variant", "lever");
  assert.deepEqual(out.rows.map((x) => x.name), ["Micro", "General", "Long"]);
  const g = rowOf(out, "General");
  assert.equal(g.verdict, "keep");
  assert.equal(g.rule.judge.windows.wins, 4);
  assert.equal(g.rule.judge.windows.counted, 5);
  // two configs per event: twice the orders, the same events (the open order shares a bar too)
  assert.deepEqual([g.base.d1.orders, g.base.d1.events], [80, 80]);
  assert.deepEqual([g.variant.d1.orders, g.variant.d1.events], [161, 80]);
  assert.ok(Math.abs(g.variant.d1a.pf - 1.07) < 1e-9, String(g.variant.d1a.pf));
  assert.ok(g.variant.d1b.pf < g.variant.d1b.pfClosed, "the open loser is in PF only");
  assert.ok(Math.abs(g.variant.d1b.pfClosed - 1) < 1e-9);
  assert.equal(rowOf(out, "Micro").verdict, "not chosen");
  const lg = rowOf(out, "Long");
  assert.equal(lg.verdict, "keep");
  assert.equal(lg.target.d1, true, "PF 1.3 on both halves, 300 events");
  assert.equal(lg.outcome, "improved, not working", "without F the target is not reached");
  assert.deepEqual([out.base.feed, out.base.feedStart], [FEED.feed, FEED.feedStart]);
});

test("the forward pair: a valid one makes Long work; one with a memory-fallback window gives no outcome", () => {
  const ok = json("--base", "b0", "--variant", "lever", "--forward-base", "fb0", "--forward", "fl");
  const lg = rowOf(ok, "Long");
  assert.equal(lg.forwardRule.ok, true);
  assert.equal(lg.target.ok, true);
  assert.equal(lg.outcome, "works");
  const bad = json("--base", "b0", "--variant", "lever", "--forward-base", "fb0", "--forward", "flbad");
  const lb = rowOf(bad, "Long");
  assert.equal(lb.verdict, "keep", "D1's verdict stands");
  assert.equal(lb.forwardRule.ok, false);
  assert.deepEqual(lb.forwardRule.problems, ["flbad: 1 memory-fallback window(s)"]);
  assert.equal(lb.target.ok, false, "no \"works\" from an invalid forward run");
  assert.equal(lb.target.d1, true);
  assert.equal(lb.outcome, "");
  assert.deepEqual(bad.forward.problems, ["1 memory-fallback window(s)"]);
});

test("text: a section per row with its rule lines and the window flags; an invalid run: rerun and the no-verdict line", () => {
  const r = cli("--base", "b0", "--variant", "lever");
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /^## General → keep · improved, not working$/m);
  assert.match(r.stdout, /^## Micro → not chosen$/m);
  assert.match(r.stdout, /^1 valid: D1a 48 events/m);
  assert.match(r.stdout, /^2 choose: D1a PF 1\.07 ≥ 1\.05/m);
  assert.match(r.stdout, /^3 judge: D1b PF /m);
  assert.match(r.stdout, /^\| run \| w1 PF \(events\) \| w2 PF \(events\) \| w3 PF \(events\) \| w4 PF \(events\) \| w5 PF \(events\) \|$/m);
  assert.doesNotMatch(r.stdout, /no verdict:/);
  const bad = cli("--base", "b0", "--variant", "bad");
  assert.equal(bad.status, 0, bad.stderr + bad.stdout);
  for (const name of ["Micro", "General", "Long"]) assert.match(bad.stdout, new RegExp(`^## ${name} → rerun$`, "m"));
  assert.match(bad.stdout, /\(16\) lvl 1 unscored \|/, "Micro in the fallback window");
  assert.match(bad.stdout, /^no verdict: bad: 1 memory-fallback window\(s\)/m);
  const j = json("--base", "b0", "--variant", "bad");
  assert.ok(j.rows.every((x) => x.verdict === "rerun" && x.outcome === ""));
});

test("refused (exit 2): another split, another feed, a missing label, an unknown kind, no variant", () => {
  const other = cli("--base", "b0", "--variant", "other");
  assert.equal(other.status, 2);
  assert.match(other.stderr, /not on the same span, split and windows/);
  const feed = cli("--base", "b0", "--variant", "otherfeed");
  assert.equal(feed.status, 2);
  assert.match(feed.stderr, /different feeds/);
  const missing = cli("--base", "b0", "--variant", "nope");
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /no such output/);
  assert.equal(cli("--base", "b0", "--variant", "lever", "--kind", "bogus").status, 2);
  assert.equal(cli("--base", "b0").status, 2);
});
