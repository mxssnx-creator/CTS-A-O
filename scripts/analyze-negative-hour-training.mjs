import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { readFundedSession } from "./lib/session-funded-cohort.mjs";
const dir = process.argv[2];
assert.ok(dir, "Pass a saved funded session directory");
const { raw, trades, funding } = await readFundedSession(dir + "/raw.json");
const H = 3600000;
const hours = new Map();
const nrm = (x) =>
  typeof x.unitR === "number" && Number.isFinite(x.unitR)
    ? x.unitR
    : x.unitR === undefined && typeof x.mult === "number" && Number.isFinite(x.mult) && x.mult > 0
      ? x.r / x.mult
      : NaN;
const add = (z, r) => {
  z.n++;
  z.gp += Math.max(0, r);
  z.gl += Math.max(0, -r);
};
const empty = () => ({ n: 0, gp: 0, gl: 0 });
for (const x of trades) {
  const r = nrm(x);
  assert.ok(Number.isFinite(r));
  const h = Math.floor((x.exitT - 1) / H) * H,
    z = hours.get(h) ?? empty();
  add(z, r);
  hours.set(h, z);
}
const neg = new Set([...hours].filter(([, z]) => z.gp < z.gl).map(([h]) => h));
const groups = new Map(),
  configs = new Map();
for (const x of trades) {
  const h = Math.floor((x.exitT - 1) / H) * H;
  if (!neg.has(h)) continue;
  const parts = x.cfg.split("|");
  const tag = ["mc", "mn", "mp", "sh", "gn", "lg"].find((a) => parts.includes(a)) ?? "wide";
  const keys = [
    JSON.stringify([h, parts[0], parts[1], x.kind ?? "normal", tag, x.side]),
    JSON.stringify([h, x.cfg, x.side]),
  ];
  for (const [m, k] of [
    [groups, keys[0]],
    [configs, keys[1]],
  ]) {
    let z = m.get(k);
    if (!z)
      m.set(k, (z = { ...empty(), key: JSON.parse(k), symbols: new Set(), onsets: new Set() }));
    add(z, nrm(x));
    z.symbols.add(x.sym);
    z.onsets.add(x.sym + "|" + x.side + "|" + x.entryT);
  }
}
const finish = (m) =>
  [...m.values()]
    .map((x) => ({
      ...x,
      pf: x.gl > 0 ? x.gp / x.gl : x.gp > 0 ? null : 0,
      noLoss: x.gp > 0 && x.gl === 0,
      net: x.gp - x.gl,
      symbols: [...x.symbols],
      onsets: x.onsets.size,
    }))
    .sort((a, b) => b.net - a.net);
const result = {
  classification:
    "Retrospective training scan on previously published v4 funded simulated closes; source differs from current main, not live ownership or holdout proof",
  window: raw.window,
  funding,
  hours: [...hours].map(([h, x]) => ({ t: h, ...x, pf: x.gl > 0 ? x.gp / x.gl : null })),
  negativeHours: [...neg],
  groups: finish(groups),
  configs: finish(configs),
};
writeFileSync(
  process.argv[3] ?? "runs/funded-negative-hours-v4.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify(
    {
      funding,
      negativeHours: [...neg],
      winningGroups: result.groups.filter((x) => x.net > 0).length,
      winningConfigs: result.configs.filter((x) => x.net > 0).length,
      top: result.groups.filter((x) => x.net > 0).slice(0, 14),
    },
    null,
    2,
  ),
);
