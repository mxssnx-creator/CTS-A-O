#!/usr/bin/env node
// The two-window Base readout of one eval (scripts/eval-gate.mjs with --settings '{"gates":{"baseWindows":{"report":[…]}}}'):
// per range × report rule, the pairs kept, the orders, the events and the PF over D1 / D1a / D1b and per window, beside
// the run as it was (scripts/lib/eval-base-rules.mjs). Reads runs/eval/gate/<label>.json; writes nothing. Run it between
// evals, with nice and a 2 GB heap (the eval JSONs are large):
//
//   nice -n 10 node --max-old-space-size=2048 scripts/eval-base-rules.mjs <label> [--dir runs/eval/gate] [--json]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { baseRuleReadout } from "./lib/eval-base-rules.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
// the label: the first argument that is neither a flag nor the --dir value
const dirAt = argv.indexOf("--dir");
const label = argv.find((x, i) => !x.startsWith("--") && !(dirAt >= 0 && i === dirAt + 1));
if (!label) {
  console.error("usage: eval-base-rules.mjs <label> [--dir runs/eval/gate] [--json]");
  process.exit(2);
}
const file = join(opt("dir", "runs/eval/gate"), `${label}.json`);
const out = JSON.parse(readFileSync(file, "utf8"));
if (!out.summary?.baseRules?.length) {
  console.error(
    `${file}: no report rules (run the eval with --settings '{"gates":{"baseWindows":{"report":[…]}}}')`,
  );
  process.exit(2);
}
const res = baseRuleReadout(out);
if (argv.includes("--json")) {
  console.log(JSON.stringify(res));
  process.exit(0);
}
const f = (x) => (x == null ? "–" : x.toFixed(2));
console.log(
  `${label}: two-window Base readout (orders at one unit; D1a = entries before ${out.summary.span.split})`,
);
res.rules.forEach((r, k) => console.log(`  rule ${k + 1}: ${JSON.stringify(r)}`));
for (const x of res.rows)
  console.log(
    `${x.range.padEnd(12)} ${x.variant.padEnd(7)} pairs ${String(x.pairsKept).padStart(5)} · orders ${String(x.orders).padStart(6)} · ` +
      `events ${String(x.events).padStart(5)} · PF D1 ${f(x.pf.d1)} D1a ${f(x.pf.d1a)} D1b ${f(x.pf.d1b)} · windows ` +
      x.windows.map((w) => `${f(w.pf)} (${w.n})`).join(" "),
  );
