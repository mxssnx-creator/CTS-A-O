// The two-window Base readout of an eval (scripts/lib/eval-base-rules.mjs): a trade is kept under report rule k only when
// its pair passed rule k in the trade's own window, for the trade's range, at the trade's target (Wide and a range judged
// at the default cell: every target); the signals are left out; the "as run" row is the eval's own orders.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { baseRuleReadout, ruleKeeps, tagOf, tpOf } from "./eval-base-rules.mjs";

const T0 = Date.parse("2026-09-29T11:00:00Z");
const T1 = Date.parse("2026-10-01T11:00:00Z");
const T2 = Date.parse("2026-10-03T11:00:00Z");
const H = 3_600_000;
const iso = (t) => new Date(t).toISOString();
const trade = (cfg, sym, entryT, r) => ({
  cfg,
  sym,
  side: 1,
  entryT,
  exitT: entryT + H,
  r,
  reason: "tp",
});
const out = {
  summary: {
    baseRules: [{ split: 2 }, { recentH: 24 }],
    span: { from: iso(T0), to: iso(T2), split: iso(T1) },
  },
  windows: [
    {
      from: iso(T0),
      to: iso(T1),
      pairs: [
        {
          pair: "follow|ema@m15",
          tags: ["", "mn"],
          rules: [{ "": null, mn: [0.008] }, { mn: [0.008, 0.01] }],
        },
        { pair: "revert|rsi@m5", tags: ["mc"], rules: [{}, { mc: [0.005] }] },
      ],
    },
    {
      from: iso(T1),
      to: iso(T2),
      pairs: [{ pair: "follow|ema@m15", tags: ["mn"], rules: [{}, { mn: [0.01] }] }],
    },
  ],
  trades: [
    trade("follow|ema@m15|tp2.6|sl3.9|tr0|h32", "A", T0 + H, 0.01),
    trade("follow|ema@m15|tp0.8|sl1.2|tr0|h64|mn", "A", T0 + 2 * H, -0.005),
    trade("follow|ema@m15|tp1|sl1.5|tr0|h64|mn", "B", T0 + 3 * H, 0.006),
    trade("revert|rsi@m5|tp0.5|sl0.5|tr0|h192|mc", "A", T0 + 4 * H, 0.002),
    trade("follow|sig-ema-cross-s@m15|tp1|sl3|tr0|h64", "A", T0 + 5 * H, 0.01),
    // two configs of one entry: one event
    trade("follow|ema@m15|tp1|sl1.5|tr0|h64|mn", "A", T1 + H, -0.004),
    trade("follow|ema@m15|tp0.8|sl1.2|tr0|h64|mn", "A", T1 + H, -0.003),
  ],
};
const row = (res, range, variant) =>
  res.rows.find((x) => x.range === range && x.variant === variant);

test("a config id gives its range tag and its target as a fraction", () => {
  assert.equal(tagOf("follow|ema@m15|tp1.3|sl3.9|tr0|h96|sh"), "sh");
  assert.equal(tagOf("follow|ema@m15|tp1.3|sl3.9|tr0|h96|sh|dca"), "sh");
  assert.equal(tagOf("follow|ema@m15|tp2.6|sl3.9|tr0|h32"), "");
  assert.equal(tpOf("follow|ema@m15|tp1.3|sl3.9|tr0|h96|sh"), 0.013);
  assert.equal(tpOf("follow|mc-rsi2-5@m5|tp0.62|sl0.62|tr0|h192|mc"), 0.0062);
  assert.ok(ruleKeeps({ mn: [0.0080000001] }, "mn", 0.008));
  assert.ok(ruleKeeps({ "": null }, "", null));
  assert.ok(!ruleKeeps({ mn: [0.01] }, "mn", 0.008));
  assert.ok(!ruleKeeps({ mn: [0.008] }, "sh", 0.008));
  assert.ok(!ruleKeeps(undefined, "mn", 0.008));
});

test("per range × rule: the pairs, orders, events and PF the rule keeps, by window, beside the run as it was", () => {
  const res = baseRuleReadout(out);
  assert.deepEqual(res.rules, out.summary.baseRules);
  assert.deepEqual(
    [...new Set(res.rows.map((x) => x.range))],
    ["Wide", "Micro", "Minimal"],
    "the signal trade is left out",
  );
  // Minimal as run: both windows' pairs, 4 orders, 3 events
  const mnRun = row(res, "Minimal", "as run");
  assert.deepEqual([mnRun.pairsKept, mnRun.orders, mnRun.events], [2, 4, 3]);
  assert.equal(mnRun.pf.d1, 0.006 / 0.012);
  assert.deepEqual(
    mnRun.windows.map((w) => w.n),
    [2, 2],
  );
  // rule 1 (halves): window 1 keeps the 0.8 % target only, window 2 nothing
  const mn1 = row(res, "Minimal", "rule 1");
  assert.deepEqual(
    [mn1.pairsKept, mn1.orders, mn1.events, mn1.pf.d1, mn1.pf.d1a, mn1.pf.d1b],
    [1, 1, 1, 0, 0, null],
  );
  assert.deepEqual(mn1.windows, [
    { n: 1, pf: 0 },
    { n: 0, pf: null },
  ]);
  // rule 2: window 1 both targets, window 2 the 1 % target only
  const mn2 = row(res, "Minimal", "rule 2");
  assert.deepEqual([mn2.pairsKept, mn2.orders, mn2.events], [2, 3, 3]);
  assert.equal(mn2.pf.d1a, 0.006 / 0.005);
  assert.equal(mn2.pf.d1b, 0);
  // Wide: every target while the default cell passes; a rule without the "" key keeps nothing
  assert.deepEqual([row(res, "Wide", "rule 1").orders, row(res, "Wide", "rule 1").pf.d1], [1, 9]);
  assert.deepEqual(
    [
      row(res, "Wide", "rule 2").pairsKept,
      row(res, "Wide", "rule 2").orders,
      row(res, "Wide", "rule 2").pf.d1,
    ],
    [0, 0, null],
  );
  // Micro: rule 1 drops the pair, rule 2 keeps its 0.5 % target
  assert.equal(row(res, "Micro", "rule 1").orders, 0);
  assert.deepEqual(
    [row(res, "Micro", "rule 2").pairsKept, row(res, "Micro", "rule 2").orders],
    [1, 1],
  );
});

test("eval-gate carries a dump's basePairs[].rules into windows[].pairs and the report rules into summary.baseRules (unset: neither)", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-base-rules-"));
  const feed = join(dir, "feed.json");
  writeFileSync(
    feed,
    JSON.stringify({
      tickers: [],
      candles: { "AAA-USDT|1": [{ t: Date.parse("2026-09-20T00:00:00Z"), o: 1 }] },
    }),
  );
  // a stand-in session: two General trades in its window (targets 1 % and 2 %); the pair passes rule 1 at 1 % only
  const session = join(dir, "session.mjs");
  writeFileSync(
    session,
    `import { writeFileSync } from "node:fs";
const a = (k) => process.argv[process.argv.indexOf("--" + k) + 1];
const to = Date.parse(a("end-at"));
const from = to - Number(a("run")) * 3600000;
const report = JSON.parse(a("settings")).gates?.baseWindows?.report;
const trades = [1, 2].map((i) => ({ cfg: "follow|ema-21-55@m15|tp" + i + "|sl2|tr0|h64|gn", sym: "AAA-USDT", side: 1, entryT: from + i * 3600000, entry: 1, exitT: from + i * 3600000 + 60000, exit: 1, r: i === 2 ? -0.01 : 0.02, reason: "tp" }));
const pair = { pair: "follow|ema-21-55@m15", passed: true, tags: ["gn"], pf: 1.5, n: 20, ...(report ? { rules: [{ gn: [0.01] }] } : {}) };
writeFileSync(a("dump"), JSON.stringify({ trades, openEnd: [], basePairs: [pair], engine: { mem: { computeLevel: 0 }, baseByRange: [], baseWhy: [] }, funnel: { counts: null } }));
`,
  );
  const evalGate = fileURLToPath(new URL("../eval-gate.mjs", import.meta.url));
  const run = (label, settings) =>
    spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--no-warnings",
        evalGate,
        "--label",
        label,
        "--feed",
        feed,
        "--jobs",
        "1",
        "--expect-mb",
        "1",
        "--settings",
        settings,
      ],
      {
        encoding: "utf8",
        cwd: dir,
        env: { ...process.env, CTS_EVAL_SESSION: session, CTS_EVAL_RESERVE_MB: "0" },
      },
    );
  const rules = [{ split: 2 }];
  const r = run("rules", JSON.stringify({ gates: { baseWindows: { report: rules } } }));
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const out = JSON.parse(readFileSync(join(dir, "runs/eval/gate/rules.json"), "utf8"));
  assert.deepEqual(out.summary.baseRules, rules);
  assert.ok(
    out.windows.every((w) =>
      w.pairs.every((p) => JSON.stringify(p.rules) === JSON.stringify([{ gn: [0.01] }])),
    ),
  );
  const res = baseRuleReadout(out);
  const gn = (v) => res.rows.find((x) => x.range === "General" && x.variant === v);
  assert.deepEqual([gn("as run").orders, gn("rule 1").orders, gn("rule 1").pairsKept], [10, 5, 5]);
  assert.equal(gn("rule 1").pf.d1, 9, "the losing 2 % target is the one the rule drops");
  const plain = run("plain", "{}");
  assert.equal(plain.status, 0, plain.stderr + plain.stdout);
  const o2 = JSON.parse(readFileSync(join(dir, "runs/eval/gate/plain.json"), "utf8"));
  assert.ok(!("baseRules" in o2.summary));
  assert.ok(o2.windows.every((w) => w.pairs.every((p) => !("rules" in p))));
});
