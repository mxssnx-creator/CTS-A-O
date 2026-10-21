// scripts/eval-gate.mjs: its windows, their run lengths, the span's split and the warm-up check (--plan runs nothing).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evalWindows, feedStartT, feedStartTFile, rankValidH, resolveSpan, warmupNeedH, warmupOf } from "./lib/eval-windows.mjs";

const H = 3_600_000;
const here = dirname(fileURLToPath(import.meta.url));
const iso = (t) => new Date(t).toISOString();

test("a span that is not a multiple of 48 h: the last window's session runs over that window only", () => {
  const span = resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-09-29T11:00:00Z" });
  const ws = evalWindows(span, 48);
  assert.deepEqual(ws.map((w) => w.runH), [48, 48, 22]);
  for (const w of ws) assert.equal(w.to - w.from, w.runH * H);
  // consecutive, no overlap, covering the span
  assert.equal(ws[0].from, span.from);
  assert.equal(ws.at(-1).to, span.to);
  for (let k = 1; k < ws.length; k++) assert.equal(ws[k].from, ws[k - 1].to);
});

test("the split defaults to D1's only on D1; another span is cut inside it, both halves non-empty", () => {
  assert.equal(iso(resolveSpan({}).split), "2026-10-04T11:00:00.000Z");
  const s = resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-09-29T11:00:00Z" });
  assert.ok(s.split > s.from && s.split < s.to, iso(s.split));
  assert.equal(s.split % H, 0);
  // only --to moved: not D1 any more, the split follows the span
  const t = resolveSpan({ to: "2026-10-03T11:00:00Z" });
  assert.ok(t.split > t.from && t.split < t.to, iso(t.split));
  // an explicit split outside the span is refused, not reported as a D1b PF of 0
  assert.throws(() => resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-09-29T11:00:00Z", split: "2026-10-04T11:00:00Z" }), /outside the span/);
  assert.throws(() => resolveSpan({ from: "2026-09-24T13:30:00Z", to: "2026-09-29T11:00:00Z" }), /on the hour/);
});

test("the warm-up: the engine's 100 h, and with historic signal configs the 96 h lookback when that is longer", () => {
  assert.equal(warmupNeedH({ signals: false, hist: false }), 100);
  assert.equal(warmupNeedH({ engineH: 178, signals: false, hist: false }), 178, "a stated engine need is kept");
  assert.equal(warmupNeedH({ signals: true, hist: true, lookbackH: 96 }), 100, "96 h fits inside the engine's 100 h");
  assert.equal(warmupNeedH({ signals: true, hist: true, lookbackH: 200 }), 200, "a longer lookback is the need");
  assert.equal(warmupNeedH({ signals: true, hist: true, lookbackH: 0 }), 100, "0 = the full history: no extra need");
  assert.equal(warmupNeedH({ signals: true, hist: false, lookbackH: 96 }), 100, "historic configs off: no lookback need");
});

test("a lane's volatility rank is valid after 336 of its own bars: 5.6 h on 1m, 28 h on 5m, 84 h on 15m, 168 h on 30m", () => {
  assert.deepEqual([1, 5, 15, 30].map(rankValidH), [5.6, 28, 84, 168]);
  const feedStart = Date.parse("2026-09-23T13:00:00Z");
  const ws = evalWindows(resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-10-04T13:00:00Z" }), 48);
  const w = warmupOf(ws, feedStart, 100, [1, 5, 15, 30]);
  assert.deepEqual(w.map((x) => x.haveH), [24, 72, 120, 168, 216]);
  assert.deepEqual(w.map((x) => x.short), [true, true, false, false, false]);
  // the holdout windows lack the 30 m rank (valid from 168 h), and 15 m before 84 h
  assert.deepEqual(w[0].limitedLanes, [5, 15, 30].filter((tf) => 24 < rankValidH(tf)));
  assert.deepEqual(w[0].limitedLanes, [5, 15, 30]);
  assert.deepEqual(w[2].limitedLanes, [30]);
  assert.deepEqual(w[3].limitedLanes, []);
});

test("the feed's start is read from the series' first bars", () => {
  const t0 = Date.parse("2026-09-23T13:00:00Z");
  const feed = JSON.stringify({
    tickers: [{ sym: "AAA-USDT" }],
    candles: {
      "AAA-USDT|1": [{ t: t0 - 5 * 60_000, o: 1 }, { t: t0, o: 1 }],
      "BBB-USDT|1": [{ t: t0, o: 1 }],
      "CCC-USDT|15": [{ t: t0, o: 1 }],
      "NEW-USDT|1": [{ t: t0 + 50 * H, o: 1 }],
    },
  });
  assert.equal(feedStartT(feed), t0);
  assert.equal(feedStartT("{}"), null);
});

test("eval-gate --plan: per-window run lengths, a split inside the span, and the windows short of warm-up", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-gate-"));
  const feed = join(dir, "feed.json");
  writeFileSync(feed, JSON.stringify({ tickers: [], candles: { "AAA-USDT|30": [{ t: Date.parse("2026-09-23T13:00:00Z"), o: 1 }] } }));
  const run = (...extra) =>
    spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", join(here, "eval-gate.mjs"), "--label", "t", "--feed", feed, ...extra], {
      encoding: "utf8",
      cwd: dir,
    });
  const r = run("--from", "2026-09-24T13:00:00Z", "--to", "2026-09-29T11:00:00Z", "--plan");
  assert.equal(r.status, 0, r.stderr);
  const p = JSON.parse(r.stdout);
  assert.deepEqual(p.windows.map((w) => w.runH), [48, 48, 22]);
  assert.ok(p.span.split > p.span.from && p.span.split < p.span.to);
  assert.equal(p.feedStart, "2026-09-23T13:00:00.000Z");
  // the engine's 100 h: the holdout's first two windows (24 h, 72 h of history) are short, the third (120 h) is not
  assert.deepEqual(p.windows.map((w) => w.short), [true, true, false], JSON.stringify(p.windows));
  assert.equal(p.warmupNeedH, 100);
  // each window names the lanes whose volatility rank is not valid yet at its start
  assert.deepEqual(p.windows[0].limitedLanes, [5, 15, 30]);
  assert.deepEqual(p.windows[2].limitedLanes, [30]);
  // a stated engine warm-up is the need
  const stated = run("--from", "2026-09-24T13:00:00Z", "--to", "2026-09-29T11:00:00Z", "--plan", "--warmup-h", "24");
  assert.equal(JSON.parse(stated.stdout).warmupNeedH, 24);
  // without --plan the run is refused before any session starts (nothing short of warm-up is measured silently)
  const refused = run("--from", "2026-09-24T13:00:00Z", "--to", "2026-09-29T11:00:00Z");
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /inside the warm-up/);
});

test("the feed's start read in chunks equals the whole-file reading, a chunk boundary at every offset of a key", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-gate-"));
  const t0 = Date.parse("2026-09-23T13:00:00Z");
  const candles = {};
  for (let i = 0; i < 9; i++)
    for (const tf of [1, 5, 15, 30]) candles[`S${i}LONGNAME-USDT|${tf}`] = [{ t: t0 + i * H + tf * 60_000, o: 1, h: 1, l: 1, c: 1, v: 1 }, { t: t0 + i * H + 2 * tf * 60_000, o: 1 }];
  const text = JSON.stringify({ tickers: [{ sym: "S0LONGNAME-USDT" }], candles });
  const file = join(dir, "feed.json");
  writeFileSync(file, text);
  const want = feedStartT(Buffer.from(text).toString("latin1"));
  assert.ok(want != null);
  for (let chunk = 1; chunk <= 260; chunk++) assert.equal(feedStartTFile(file, chunk), want, `chunk ${chunk}`);
  writeFileSync(file, "{}");
  assert.equal(feedStartTFile(file, 7), null);
});

test("eval-gate keeps every window's result in window order when the windows finish out of order", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-gate-"));
  const feed = join(dir, "feed.json");
  writeFileSync(feed, JSON.stringify({ tickers: [], candles: { "AAA-USDT|1": [{ t: Date.parse("2026-09-20T00:00:00Z"), o: 1 }] } }));
  // a stand-in session: three trades inside its own window, written as the dump; an earlier window finishes later
  const session = join(dir, "session.mjs");
  writeFileSync(
    session,
    `import { writeFileSync } from "node:fs";
const a = (k) => process.argv[process.argv.indexOf("--" + k) + 1];
const to = Date.parse(a("end-at"));
const from = to - Number(a("run")) * 3600000;
const delay = Math.max(0, (Date.parse("2026-10-10T00:00:00Z") - to) / 3600000) * 12;
setTimeout(() => {
  const trades = [1, 2, 3].map((i) => ({ cfg: "follow|ema-21-55@m15|tp1|sl2|tr0|h64|gn", sym: "AAA-USDT", side: 1, entryT: from + i * 3600000, entry: 1, exitT: from + i * 3600000 + 60000, exit: 1, r: i === 2 ? -0.01 : 0.02, mult: 1, reason: "tp" }));
  writeFileSync(a("dump"), JSON.stringify({ trades, openEnd: [], basePairs: [{ pair: "follow|ema-21-55@m15", passed: true, tags: ["gn"], pf: 1.5, n: 20 }], engine: { mem: { computeLevel: 0 }, baseByRange: [], baseWhy: [] }, funnel: { counts: null } }));
}, delay);
`,
  );
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", join(here, "eval-gate.mjs"), "--label", "order", "--feed", feed, "--jobs", "3", "--expect-mb", "1", "--from", "2026-09-29T11:00:00Z", "--to", "2026-10-09T11:00:00Z"],
    {
      encoding: "utf8",
      cwd: dir,
      // These children only write the tiny fixed dump above. The real host's fluctuating free memory must not
      // kill the delayed ordering fixture; mem-admission.test.mjs separately verifies the production kill guard.
      env: { ...process.env, CTS_EVAL_SESSION: session, CTS_EVAL_RESERVE_MB: "0", CTS_EVAL_KILL_BELOW_MB: "0" },
      timeout: 30_000,
    },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
  // the windows finished last-first (the stand-in sleeps longer for an earlier window)
  const done = [...r.stdout.matchAll(/window (\d+)\/5 done/g)].map((m) => Number(m[1]));
  assert.notDeepEqual(done, [1, 2, 3, 4, 5], `finish order ${done}`);
  const out = JSON.parse(readFileSync(join(dir, "runs/eval/gate/order.json"), "utf8"));
  assert.deepEqual(out.windows.map((w) => w.from), [...out.windows.map((w) => w.from)].sort());
  assert.equal(out.trades.length, 15);
  const ts = out.trades.map((t) => t.entryT);
  assert.deepEqual(ts, [...ts].sort((x, y) => x - y), "trades in window order");
  assert.deepEqual(out.summary.tradesPerWindow, [3, 3, 3, 3, 3]);
  assert.equal(out.trades.filter((t) => t.r < 0).length, 5, "every window retains its losing return");
  assert.ok(out.windows.every((w) => w.trades === 3 && Math.abs(w.pf - 4) < 1e-12));
  assert.ok(Math.abs(out.summary.pf.d1 - 4) < 1e-12, "the ordered result retains the actual 4:1 return PF");
  assert.equal(out.summary.vmHwmMbPerWindow.length, 5);
  assert.ok(out.summary.vmHwmMbPerWindow.every((x) => x === null || x > 0));
});

// a stand-in session that records the arguments it was given (beside its dump: the dump itself is read and removed) and
// writes one General trade with a funnel (Base, the seat validation, the run's pool and validated-at-start closes)
const ARGS_SESSION = `import { writeFileSync } from "node:fs";
const a = (k) => process.argv[process.argv.indexOf("--" + k) + 1];
writeFileSync(a("dump") + ".args", JSON.stringify({ execArgv: process.execArgv, argv: process.argv.slice(2) }));
const to = Date.parse(a("end-at"));
const from = to - Number(a("run")) * 3600000;
const trades = [{ cfg: "follow|ema-21-55@m15|tp1|sl2|tr0|h64|gn", sym: "AAA-USDT", side: 1, entryT: from + 3600000, entry: 1, exitT: from + 7200000, exit: 1, r: 0.02, mult: 1, reason: "tp" }];
// Block on: orders stored at their volume (r × mult) beside the multiple — two raised, one at one unit
if (JSON.parse(a("toggles")).block)
  for (const [i, r, mult] of [[2, 0.04, 2], [3, -0.01, 1], [4, -0.06, 3]])
    trades.push({ cfg: "follow|ema-21-55@m15|tp1|sl2|tr0|h64|gn", sym: "AAA-USDT", side: 1, entryT: from + i * 3600000, entry: 1, exitT: from + (i + 1) * 3600000, exit: 1, r, mult, reason: r > 0 ? "tp" : "sl" });
writeFileSync(a("dump"), JSON.stringify({
  trades, openEnd: [], basePairs: [{ pair: "follow|ema-21-55@m15", passed: true, tags: ["gn"], pf: 1.5, n: 20 }],
  engine: { mem: { computeLevel: 0 }, baseByRange: [{ tag: "gn", range: "General", enabled: true, evaluated: 4, passed: 1, minPf: 1, pfPassedMean: 1.5, passedGp: 3, passedGl: 2 }], baseWhy: [] },
  funnel: { counts: null },
  tapeAgg: {
    evalAfterBase: { "General|normal": { configs: 6, passed: 2, minPf: 1.12, pfPassedSum: 4, okGp: 9, okGl: 3 } },
    rangeByType: { "General|normal": { n: 10, gp: 4, gl: 5 } },
    rangeByTypeEval: { "General|normal": { n: 4, gp: 5, gl: 4 } },
  },
}));
`;
/** eval-gate over 10-07 11:00 to 10-09 11:00 with the recording stand-in session, in a directory of its own */
function gateRun(label, ...extra) {
  const dir = mkdtempSync(join(tmpdir(), "eval-gate-"));
  const feed = join(dir, "feed.json");
  writeFileSync(feed, JSON.stringify({ tickers: [], candles: { "AAA-USDT|1": [{ t: Date.parse("2026-09-20T00:00:00Z"), o: 1 }] } }));
  const session = join(dir, "session.mjs");
  writeFileSync(session, ARGS_SESSION);
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", join(here, "eval-gate.mjs"), "--label", label, "--feed", feed, "--jobs", "1", "--expect-mb", "1", "--from", "2026-10-07T11:00:00Z", "--to", "2026-10-09T11:00:00Z", ...extra],
    { encoding: "utf8", cwd: dir, env: { ...process.env, CTS_EVAL_SESSION: session, CTS_EVAL_RESERVE_MB: "0" } },
  );
  const argsOf = (k) => JSON.parse(readFileSync(join(dir, `runs/eval/gate/dumps/${label}_w${k}.json.args`), "utf8"));
  const out = () => JSON.parse(readFileSync(join(dir, `runs/eval/gate/${label}.json`), "utf8"));
  return { r, feed, argsOf, out };
}
const OFF = { dca: false, dcaActive: false, block: false, blockActive: false, axis: false };

test("eval-gate without --toggles / --window-h gives the session today's arguments byte for byte; --toggles merges over the eval's", () => {
  const plain = gateRun("plain");
  assert.equal(plain.r.status, 0, plain.r.stderr + plain.r.stdout);
  const a = plain.argsOf(0);
  assert.deepEqual(a.execArgv, ["--max-old-space-size=3072", "--heap-growing-percent=50", "--experimental-strip-types", "--no-warnings"]);
  assert.deepEqual(a.argv, [
    "--feed", plain.feed, "--end-at", "2026-10-09T11:00:00.000Z", "--run", "48", "--pre", "24", "--symbols", "60", "--signals", "off", "--wf", "{}",
    "--toggles", '{"dca":false,"dcaActive":false,"block":false,"blockActive":false,"axis":false}',
    "--settings", "{}", "--dump", "runs/eval/gate/dumps/plain_w0.json", "--dump-only", "--quiet",
  ]);
  assert.deepEqual(plain.out().summary.toggles, OFF);
  // a patch: merged over the eval's toggles (their key order kept), every other argument unchanged, recorded in the summary
  const axis = gateRun("axis", "--toggles", '{"axis":true}');
  assert.equal(axis.r.status, 0, axis.r.stderr + axis.r.stdout);
  const b = axis.argsOf(0);
  const at = b.argv.indexOf("--toggles");
  assert.equal(b.argv[at + 1], '{"dca":false,"dcaActive":false,"block":false,"blockActive":false,"axis":true}');
  const rest = (argv, label, feed) => argv.toSpliced(at + 1, 1).map((x) => x.replace(`${label}_w0`, "L_w0").replace(feed, "FEED"));
  assert.deepEqual(rest(b.argv, "axis", axis.feed), rest(a.argv, "plain", plain.feed));
  assert.deepEqual(axis.out().summary.toggles, { ...OFF, axis: true });
  // a key no strategy type has, or a value that is not true / false, is refused before any session starts
  const typo = gateRun("typo", "--toggles", '{"axes":true}');
  assert.equal(typo.r.status, 2);
  assert.match(typo.r.stderr, /no strategy type axes/);
  assert.equal(gateRun("num", "--toggles", '{"axis":1}').r.status, 2);
  const bad = gateRun("json", "--toggles", "{axis:true}");
  assert.equal(bad.r.status, 2, "malformed JSON: refused, not a crash");
  assert.match(bad.r.stderr, /--toggles: an object/);
});

test("eval-gate --window-h: N-hour windows, each its own session over its own hours", () => {
  const w = gateRun("w24", "--window-h", "24");
  assert.equal(w.r.status, 0, w.r.stderr + w.r.stdout);
  const out = w.out();
  assert.equal(out.summary.windowH, 24);
  assert.deepEqual(
    out.windows.map((x) => [x.from, x.to, x.runH]),
    [
      ["2026-10-07T11:00:00.000Z", "2026-10-08T11:00:00.000Z", 24],
      ["2026-10-08T11:00:00.000Z", "2026-10-09T11:00:00.000Z", 24],
    ],
  );
  for (const [k, end] of [[0, "2026-10-08T11:00:00.000Z"], [1, "2026-10-09T11:00:00.000Z"]]) {
    const { argv } = w.argsOf(k);
    assert.equal(argv[argv.indexOf("--end-at") + 1], end);
    assert.equal(argv[argv.indexOf("--run") + 1], "24");
  }
  assert.equal("windowH" in gateRun("w48").out().summary, false, "only with --window-h");
  assert.equal(gateRun("w48x", "--window-h", "48").out().summary.windowH, 48);
  assert.equal(gateRun("w0", "--window-h", "0").r.status, 2);
  assert.equal(gateRun("wf", "--window-h", "1.5").r.status, 2);
});

test("eval-gate's funnel line prints the forward PF over the run (after Base, validated at the start) beside the in-sample one", () => {
  const g = gateRun("fwd");
  assert.equal(g.r.status, 0, g.r.stderr + g.r.stdout);
  const f = g.out().summary.funnel.find((x) => x.range === "General");
  assert.equal(f.afterBasePf, 0.8);
  assert.equal(f.validatedPf, 1.25);
  assert.match(
    g.r.stdout,
    /General · Base PF 1\.50 \(1 of 4 pairs validated\) → validation PF 3\.00 \(2 of 6 sets validated\) · over the run: after Base PF 0\.80 \(10\), validated PF 1\.25 \(4\) → orders PF – \(1\)/,
  );
});

test("eval-gate with Block on: per range the volume-weighted PF and the unit PF of the raised and unraised orders", () => {
  const g = gateRun("blk", "--toggles", '{"block":true}');
  assert.equal(g.r.status, 0, g.r.stderr + g.r.stdout);
  const out = g.out();
  // stored r: +0.02, +0.04 (×2), −0.01, −0.06 (×3); at one unit +0.02, +0.02, −0.01, −0.02
  assert.deepEqual(out.summary.blockPf, [
    { range: "General", orders: 4, volPf: +(0.06 / 0.07).toFixed(4), unitPf: +(0.04 / 0.03).toFixed(4), raised: { n: 2, pf: 1 }, unraised: { n: 2, pf: 2 } },
  ]);
  assert.deepEqual(Object.keys(out.windows[0].blockByRange), ["General"]);
  assert.equal(out.windows[0].blockByRange.General.raised.n, 2);
  // Block off: neither field
  const plain = gateRun("noblk").out();
  assert.equal("blockPf" in plain.summary, false);
  assert.equal("blockByRange" in plain.windows[0], false);
});
