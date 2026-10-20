#!/usr/bin/env node
// Compare a reconstructed earlier source and the current source with identical recovered market inputs.
// The original report did not include a source manifest: do not claim its exact source is authenticated.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import {
  sessionStudySourceFiles,
  studyCanonical,
  studyExactJson,
  studySha256,
} from "./lib/session-study.mjs";
const cwd = resolve("."),
  out = resolve("runs/micro-legacy-comparison");
const mode = process.argv[2],
  arm = process.argv[3];
if (!["prepare", "run"].includes(mode) || !["reference", "current"].includes(arm))
  throw Error("prepare|run reference|current");
const root = arm === "reference" ? resolve("runs/legacy-reference-15c31e5") : cwd,
  dir = resolve(out, arm);
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const manifest = () => sessionStudySourceFiles(root);
if (mode === "prepare") {
  if (existsSync(`${dir}/protocol.json`)) throw Error("Never overwrite a frozen comparison");
  const original = JSON.parse(readFileSync(`${out}/original-provenance.json`)),
    basis = JSON.parse(readFileSync(`${out}/basis.json`));
  const feed = resolve(
    "/workspace/scratch/74aec7d6017a/CTS-A-O/runs/break-micro-9x6-retro-20261015/feed-9.json",
  );
  const { CoreRuntime } = await import(
    pathToFileURL(resolve(root, "src/core/server/runtime.server.ts"))
  );
  const { CoreDb } = await import(pathToFileURL(resolve(root, "src/core/server/db.server.ts")));
  const seed = structuredClone(basis.settings),
    evaluationFromT = original.settings.evaluationFromT;
  Object.assign(seed, {
    symbols: 9,
    forceSymbols: original.symbols,
    symbolRank: "market",
    cost: 0.0015,
    fees: { taker: 0.0005, maker: 0.0002, slippage: 0.00025 },
  });
  seed.signals.enabled = false;
  seed.live.enabled = false;
  // Retain the exact 97 saved pairs: new optional Exit discovery must not silently widen this comparison.
  Object.assign(seed.exitStrategy, {
    includeMicro: false,
    includeTactics: false,
    includeRelations: false,
  });
  const make = (s, w) => {
    const rt = new CoreRuntime(
      new CoreDb(":memory:"),
      { symbols: 9, signals: { enabled: false } },
      {
        market: "bingx",
        replay: true,
        priceStream: null,
        evaluationFromT,
        feed: { history: async () => [], klines: async () => [], tickers: async () => [] },
      },
    );
    rt.updateSettings(s);
    rt.updateSettings({}, w);
    return rt;
  };
  const wf = { ...basis.wf, recordValidation: true };
  const a = make(seed, wf),
    b = make(studyCanonical(a.settings), studyCanonical(a.wf)),
    c = make(studyCanonical(b.settings), studyCanonical(b.wf));
  const settings = studyCanonical(b.settings),
    actualWf = studyCanonical(b.wf);
  if (
    studyExactJson(settings) !== studyExactJson(c.settings) ||
    studyExactJson(actualWf) !== studyExactJson(c.wf)
  )
    throw Error("Unstable settings normalization");
  for (const rt of [a, b, c]) rt.dispose();
  const files = manifest();
  mkdirSync(dir, { recursive: true });
  const p = {
    arm,
    root,
    feed: { path: feed, sha256: studySha256(readFileSync(feed)) },
    source: { sha256: studySha256(studyExactJson(files)), files },
    window: original.window,
    evaluationFromT,
    settings,
    wf: actualWf,
    book: JSON.parse(
      readFileSync(
        "/workspace/scratch/74aec7d6017a/CTS-A-O/runs/postbase-default-focus-24h-pre-6h-run-20261019-raw.json",
      ),
    ).settings.book,
    policy:
      "Reconstructed legacy checkpoint versus current; recovered identical 9-symbol native prices/window and exact original focus/range settings. Both modeled costs capped at 0.15%; original 0.20% result is a separate reference. Current own-context correctness fixes remain enabled; no qualification weakened.",
  };
  writeFileSync(`${dir}/protocol.json`, JSON.stringify(p, null, 2) + "\n");
  writeFileSync(`${dir}/desk.json`, JSON.stringify({ settings, wf: actualWf }, null, 2) + "\n");
  console.log(
    JSON.stringify({
      arm,
      source: p.source.sha256,
      cost: settings.cost,
      focus: settings.focus.length,
      feed: p.feed.sha256,
    }),
  );
} else {
  const p = JSON.parse(readFileSync(`${dir}/protocol.json`));
  if (existsSync(`${dir}/raw.json`)) throw Error("Measured result exists");
  if (
    studySha256(studyExactJson(manifest())) !== p.source.sha256 ||
    studySha256(readFileSync(p.feed.path)) !== p.feed.sha256
  )
    throw Error("Frozen input changed");
  const args = [
    "--expose-gc",
    "--max-old-space-size=4096",
    "--experimental-strip-types",
    "--no-warnings",
    resolve(root, "scripts/core-session.mjs"),
    "--feed",
    p.feed.path,
    "--desk",
    `${dir}/desk.json`,
    "--symbols",
    "9",
    "--pre",
    "24",
    "--run",
    "6",
    "--end-at",
    new Date(p.window.endT).toISOString(),
    "--evaluation-from",
    new Date(p.evaluationFromT).toISOString(),
    "--selection-hours",
    "24",
    "--signals",
    "off",
    "--balance",
    "1000",
    "--sizing",
    "equityPct",
    "--pct",
    "0.02",
    "--leverage",
    "10",
    "--dump",
    `${dir}/raw.json`,
    "--out",
    `${dir}/session`,
    "--quiet",
    "true",
  ];
  writeFileSync(
    `${dir}/command.json`,
    JSON.stringify({ command: process.execPath, args }, null, 2),
  );
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CTS_CORE_WORKERS: "1", CTS_CORE_VARIANTS: "0", CTS_CORE_COMPARE: "0" },
  });
  const code = await new Promise((done) => {
    child.on("error", () => done(1));
    child.on("exit", (x) => done(x ?? 1));
  });
  if (studySha256(studyExactJson(manifest())) !== p.source.sha256)
    throw Error("Source changed during scoring");
  process.exitCode = code;
}
