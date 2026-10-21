#!/usr/bin/env node
// Exact original 616-source market; independent identities and coherent completed publication corrected.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { CoreRuntime } from "../src/core/server/runtime.server.ts";
import { CoreDb } from "../src/core/server/db.server.ts";
import { allCombos, makeUniverse } from "../src/core/pipeline/pipeline.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { exitStrategyPairs, EXIT_BOT } from "../src/core/exit-strategy.ts";
import {
  sessionStudySourceFiles,
  studyCanonical,
  studyExactJson,
  studySha256,
} from "./lib/session-study.mjs";
const root = resolve("."),
  out = resolve(process.argv[2] ?? "runs/micro-identity-reference-v9");
assert.ok(!existsSync(`${out}/protocol.json`), "Never overwrite a measured protocol");
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const prior = JSON.parse(readFileSync("docs/micro-2026-10-20/protocol.json")),
  bytes = gunzipSync(readFileSync("docs/micro-2026-10-20/reproduction-feed.json.gz"));
assert.equal(studySha256(bytes), prior.feed.sha256);
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/feed.json`, bytes);
const seed = structuredClone(prior.actualSettings);
// Current discovery has 56 additional Micro IDs. Keep the original explicitly focused sources without adding them.
seed.exitStrategy.includeMicro = false;
const make = (s, w) => {
  const rt = new CoreRuntime(
    new CoreDb(":memory:"),
    { symbols: 20, signals: { enabled: false } },
    {
      market: "bingx",
      replay: true,
      priceStream: null,
      evaluationFromT: prior.window.evaluationFromT,
      replayPreloadAll: true,
      feed: { history: async () => [], klines: async () => [], tickers: async () => [] },
    },
  );
  rt.updateSettings(s);
  rt.updateSettings({}, w);
  // The production settings sanitizer enforces longH >= 24. This frozen replay,
  // like the original harness, explicitly restricts the scored window to 12h.
  rt.wf = { ...rt.wf, longH: prior.actualWf.longH };
  return rt;
};
const a = make(seed, prior.actualWf),
  b = make(studyCanonical(a.settings), studyCanonical(a.wf)),
  c = make(studyCanonical(b.settings), studyCanonical(b.wf));
const settings = studyCanonical(b.settings),
  wf = studyCanonical(b.wf);
assert.equal(studyExactJson(c.settings), studyExactJson(settings));
assert.equal(studyExactJson(c.wf), studyExactJson(wf));
const expectedSettings = structuredClone(prior.actualSettings);
expectedSettings.exitStrategy.includeMicro = false;
assert.equal(
  studyExactJson(settings),
  studyExactJson(expectedSettings),
  "Only documented discovery switch may differ",
);
assert.equal(studyExactJson(wf), studyExactJson(prior.actualWf), "Same WF and gates");
for (const rt of [a, b, c]) rt.dispose();
const source = JSON.parse(bytes),
  u = makeUniverse(
    prior.symbols.flatMap((sym) =>
      [1, 5, 15].map((tf) => ({
        ...barsFromCandles(sym, tf, resample(source.candles[`${sym}|1`], 1, tf)),
        lanes: [1, 5, 15],
      })),
    ),
  );
const combos = allCombos(settings.focus, settings.disabledKinds, settings.tfs),
  exits = exitStrategyPairs(combos, u, settings.exitStrategy, settings.disabledKinds);
assert.equal(combos.length, 616);
assert.deepEqual(exits, [...new Set(combos.map((c) => `${EXIT_BOT}|${c.ind}`))].sort());
const files = sessionStudySourceFiles(root),
  protocol = {
    ...prior,
    id: "micro-original-616-source-window-independent-order-identity",
    feed: { ...prior.feed, path: `${out}/feed.json` },
    source: {
      checkpoint: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      files,
      sha256: studySha256(studyExactJson(files)),
    },
    actualSettings: settings,
    actualWf: wf,
    harnessSha256: studySha256(readFileSync("scripts/micro-study.mjs")),
    comparison: {
      baselineProtocolSha256: studySha256(readFileSync("docs/micro-2026-10-20/protocol.json")),
      baselineSourceSha256: prior.source.sha256,
      baselineCloses: 49259,
      baselinePf: 0.21892290918539123,
      ordinarySources: combos.length,
      exitSources: exits.length,
      settingsDifference:
        "exitStrategy.includeMicro=false only prevents adding the newly registered 56 Micro IDs. Explicit original 616 sources and corresponding Exit set verified identical.",
      behaviorChange:
        "Preserve independent Micro/Inverse config identities and publish only coherent completed runtime cohorts; no gate, fee, formula, source scope or window retuned.",
    },
  };
writeFileSync(`${out}/protocol.json`, JSON.stringify(protocol, null, 2) + "\n");
writeFileSync(`${out}/desk.json`, JSON.stringify({ settings, wf }, null, 2) + "\n");
console.log(
  JSON.stringify({
    out,
    sourceSha256: protocol.source.sha256,
    ordinary: combos.length,
    exit: exits.length,
    feedSha256: protocol.feed.sha256,
  }),
);
