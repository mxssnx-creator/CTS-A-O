#!/usr/bin/env node
// Complete simulated trading matrix: every settings variant × every execution preset (Normal / Trailing on-off,
// Block and / or DCA, with and without Active) × every period, each a full causal walk-forward long run.
//   node scripts/core-matrix.mjs --periods cur=c1h.json,prev=c1h-prev.json,prev2=c1h-prev2.json --out docs/matrix [--jobs 4]
import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const out = arg("out", "docs/matrix");
const jobs = Number(arg("jobs", 4));
const periods = Object.fromEntries(
  arg("periods")
    .split(",")
    .map((x) => x.split("=")),
);
mkdirSync(out, { recursive: true });

export const FOCUS = {
  mom: [
    "follow|rsi-mom-10-25",
    "follow|rsi-mom-14-15",
    "follow|rsi-mom-14-20",
    "follow|rsi-mom-14-25",
    "follow|rsi-mom-21-15",
    "follow|rsi-mom-21-20",
    "follow|rsi-mom-21-25",
  ],
  robust: [
    "follow|rsi-mom-14-15",
    "follow|rsi-mom-21-20",
    "follow|rsi-mom-21-25",
    "follow|bb-walk@x4",
    "follow|break-vol-2@x4",
    "follow|break-vol@x4",
    "follow|break-atr-2@x4",
    "follow|act-burst-2.5@x4",
    "revert|act-chop@x4",
    "revert|cci-14-200@x4",
    "revert|cci-40-200@x4",
    "revert|z-50-2.5@x4",
  ],
};
const GRID = {
  tp: [0.03, 0.05, 0.08],
  slOfTp: [1, 2],
  trailOfTp: [0, 0.5],
  minTrail: 0.006,
  minSl: 0.01,
  holdH: [16, 24],
};
const BD = {
  std: {
    block: { ratio: 0.2, maxLevel: 6, minActiveLevel: 1, maxMult: 2.5 },
    dca: { levels: 2, step: 0.02 },
  },
  strong: {
    block: { ratio: 0.5, maxLevel: 6, minActiveLevel: 2, maxMult: 3 },
    dca: { levels: 3, step: 0.035 },
  },
};
const PRESETS =
  "all-on,normal,normal-trailing,trailing,block,block-active,normal-off+block,trailing+block-active,normal-trailing+block-active,dca,dca-active,normal+dca-active,trailing+dca,block-active+dca-active";

const variants = [];
for (const f of Object.keys(FOCUS))
  for (const t of ["none", "vol"])
    for (const bd of Object.keys(BD))
      for (const ln of [0, 12]) variants.push({ id: `${f}-${t}-${bd}-ln${ln}`, f, t, bd, ln });

const tasks = [];
for (const v of variants)
  for (const [p, cache] of Object.entries(periods)) {
    const file = `${out}/${v.id}.${p}`;
    if (existsSync(`${file}.json`) && !argv.includes("--force")) continue;
    const settings = {
      focus: FOCUS[v.f],
      grid: GRID,
      tactics: v.t === "vol" ? { volRegime: true } : {},
      ...BD[v.bd],
    };
    const patch = { mode: "fixed", maxPerSymbol: 0, portfolio: 16, lastN: v.ln };
    tasks.push({
      file,
      args: [
        "--max-old-space-size=4000",
        "--experimental-strip-types",
        "scripts/core-longrun.mjs",
        "--cache",
        cache,
        "--srctf",
        "60",
        "--tf",
        "60",
        "--presets",
        PRESETS,
        "--patch",
        JSON.stringify(patch),
        "--settings",
        JSON.stringify(settings),
        "--out",
        file,
      ],
    });
  }
console.error(
  `${variants.length} settings variants × ${Object.keys(periods).length} periods → ${tasks.length} runs to do, ${jobs} in parallel`,
);
let i = 0,
  done = 0;
const t0 = Date.now();
await Promise.all(
  Array.from({ length: jobs }, async () => {
    while (i < tasks.length) {
      const t = tasks[i++];
      await new Promise((res) => {
        const p = spawn("node", t.args, { stdio: ["ignore", "ignore", "pipe"] });
        let err = "";
        p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
        p.on("close", (code) => {
          done++;
          console.error(
            `${done}/${tasks.length} ${t.file} ${code === 0 ? "ok" : "FAILED " + err}` +
              ` · ${Math.round((Date.now() - t0) / 60000)} min`,
          );
          res();
        });
      });
    }
  }),
);
