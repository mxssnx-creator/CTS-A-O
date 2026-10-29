// Read-only comparison of the production Last-N PF gate with the independently reconciled diagnostic.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { iterateSessionTapeTrades } from "./lib/session-dump.mjs";
import { lastNOk } from "../src/core/sim/walkforward.ts";

const [rawPath, auditPath] = process.argv.slice(2);
if (!rawPath || !auditPath) throw new Error("Usage: check-lastn-gate-parity RAW_JSON AUDIT_JSON");
const audit = JSON.parse(readFileSync(auditPath, "utf8"));
const byConfig = new Map();
for (const c of audit.contexts) {
  const xs = byConfig.get(c.cfg) ?? []; xs.push(c); byConfig.set(c.cfg, xs);
}
const from = audit.study.evaluationFrom, start = audit.study.window.startT;
let checked = 0, configs = 0;
for await (const source of iterateSessionTapeTrades(rawPath)) {
  const contexts = byConfig.get(source.id); if (!contexts) continue;
  configs++;
  const grouped = new Map(contexts.map(c => [JSON.stringify([c.sym, c.side]), []]));
  for (const [sym, side, , t, r] of source.trades) {
    if (t < Math.max(from, source.fromT ?? from) || t >= start) continue;
    const rows = grouped.get(JSON.stringify([sym, side]));
    assert.ok(rows); rows.push([t, r]);
  }
  for (const c of contexts) {
    const rows = grouped.get(JSON.stringify([c.sym, c.side]));
    const exitT = Float64Array.from(rows, x => x[0]), r = Float64Array.from(rows, x => x[1]);
    const gp = new Float64Array(rows.length + 1), gl = new Float64Array(rows.length + 1);
    for (let i = 0; i < rows.length; i++) {
      gp[i + 1] = gp[i] + Math.max(r[i], 0); gl[i + 1] = gl[i] + Math.max(-r[i], 0);
    }
    for (const n of audit.windows) {
      const actual = lastNOk({ exitT, r, gp, gl }, start - 1, n, c.floor);
      assert.equal(actual, c.windows[n].state === "qualified", `${source.id} ${c.sym} ${c.side} Last-${n}`);
      checked++;
    }
  }
}
assert.equal(configs, byConfig.size);
assert.equal(checked, audit.contexts.length * audit.windows.length);
console.log(JSON.stringify({ configs, contextWindows: checked, mismatches: 0 }));
